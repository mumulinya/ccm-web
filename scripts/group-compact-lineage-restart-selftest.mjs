import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    boundary: require(dist("modules", "collaboration", "group-memory-boundary-journal.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
  };
}

function messages(count, prefix, roleMode = "alternating", offset = 0) {
  return Array.from({ length: count }, (_, localIndex) => {
    const index = localIndex + offset;
    const role = roleMode === "assistant" ? "assistant" : index % 2 === 0 ? "user" : "assistant";
    return {
      id: `${prefix}-${index}`,
      role,
      target: role === "user" ? "coordinator" : undefined,
      agent: role === "assistant" ? "phase328-worker" : undefined,
      content: `${prefix} turn ${index} ${"lineage context ".repeat(100)}`,
    };
  });
}

const compactConfig = {
  memoryCompactionUseModel: false,
  minKeepMessages: 3,
  minKeepTokens: 200,
  maxKeepTokens: 1_000,
};

async function compactOnce(compact, groupId, groupSessionId, sourceMessages, memory, options = {}) {
  return compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages: sourceMessages,
    memory,
    config: compactConfig,
    transcriptPath: `${groupId}--${groupSessionId}.json`,
    force: options.force !== false,
  });
}

function verifyRendered(memoryModule, data, lineage) {
  return memoryModule.renderGroupMemoryContextBundle({
    group_id: data.groupId,
    group_session_id: data.groupSessionId,
    target_project: "phase328-worker",
    task_query: "verify compact lineage",
    session_binding: { binding_id: "phase328-binding" },
    memory_policy: { ignored: false },
    compaction: {
      summaryChecksum: data.memory.compaction.summaryChecksum,
      boundary: { ...data.memory.compactBoundary, compactLineage: lineage },
      compactLineage: lineage,
    },
    group_state: { goal: "phase328", currentPhase: "lineage", typedMemory: {} },
  });
}

async function buildSecondGeneration(rootDir) {
  const { compact, boundary } = modules();
  const groupId = "phase328-lineage-group";
  const groupSessionId = "gcs_phase328_lineage";
  const firstMessages = messages(40, "phase328-first");
  const first = await compactOnce(compact, groupId, groupSessionId, firstMessages, { goal: "phase328 lineage" });
  assert.equal(first.compacted, true);
  boundary.commitGroupMemoryCompactBoundary({
    groupId, sessionId: groupSessionId, messages: firstMessages, memory: first.memory, transcriptPath: "phase328.json", rootDir,
  });

  const appended = messages(10, "phase328-second", "alternating", 40);
  const secondMessages = [...firstMessages, ...appended];
  const second = await compactOnce(compact, groupId, groupSessionId, secondMessages, first.memory);
  assert.equal(second.compacted, true);
  boundary.commitGroupMemoryCompactBoundary({
    groupId, sessionId: groupSessionId, messages: secondMessages, memory: second.memory, transcriptPath: "phase328.json", rootDir,
  });
  return { groupId, groupSessionId, firstMessages, secondMessages, first, second, memory: second.memory, rootDir };
}

async function verifyState(data, restartMode = false) {
  const { compact, boundary, memory } = modules();
  const firstLineage = data.first.memory.compaction.compactLineage;
  const secondLineage = data.second.memory.compaction.compactLineage;
  const checks = {
    firstLineageValid: compact.verifyGroupCompactLineage(firstLineage, {
      groupId: data.groupId, groupSessionId: data.groupSessionId, boundaryId: data.first.boundary.id, previousBoundaryId: "",
    }).valid,
    firstCompactUsesUnknownPreviousTurnCount: firstLineage.turns_since_previous_compact === -1
      && firstLineage.checkpoint_basis === "first_compact"
      && firstLineage.previous_compact_turn_id === "",
    firstCompactMetadataMatchesCc: data.first.boundary.compactMetadata.trigger === "manual"
      && data.first.boundary.compactMetadata.preTokens === data.first.boundary.preCompactTokenCount
      && data.first.boundary.compactMetadata.messagesSummarized === data.first.boundary.summarizedMessageCount,
    compactMetadataCarriesPreservedSegment: data.first.boundary.compactMetadata.preservedSegment.headUuid === data.first.boundary.preservedSegment.headMessageId
      && data.first.boundary.compactMetadata.preservedSegment.anchorUuid === data.first.boundary.preservedSegment.anchorMessageId
      && data.first.boundary.compactMetadata.preservedSegment.tailUuid === data.first.boundary.preservedSegment.tailMessageId,
    secondLineageValid: compact.verifyGroupCompactLineage(secondLineage, {
      groupId: data.groupId, groupSessionId: data.groupSessionId, boundaryId: data.second.boundary.id, previousBoundaryId: data.first.boundary.id,
    }).valid,
    secondReferencesPreviousBoundary: secondLineage.previous_boundary_id === data.first.boundary.id
      && secondLineage.previous_compact_epoch === firstLineage.compact_epoch
      && secondLineage.previous_compact_turn_id === firstLineage.compact_turn_id,
    secondCountsNewTurns: secondLineage.checkpoint_basis === "message_count_checkpoint"
      && secondLineage.new_message_count_since_previous_compact === 10
      && secondLineage.turns_since_previous_compact === 5,
    secondIsNotSameChainRecompact: secondLineage.is_recompaction_in_chain === false,
    lineageStoredEverywhere: data.second.memory.compactBoundary.compactLineage.lineage_checksum === secondLineage.lineage_checksum
      && data.second.memory.compactBoundary.compactMetadata.compactLineage.lineage_checksum === secondLineage.lineage_checksum
      && data.second.memory.compactBoundary.post_compact_restore.compactLineage.lineage_checksum === secondLineage.lineage_checksum
      && data.second.memory.messageCompression.compactLineage.lineage_checksum === secondLineage.lineage_checksum,
    siblingSessionRejected: compact.verifyGroupCompactLineage(secondLineage, {
      groupId: data.groupId, groupSessionId: "gcs_phase328_sibling",
    }).valid === false,
  };

  const projection = boundary.buildGroupMemoryResumeProjection({
    groupId: data.groupId,
    sessionId: data.groupSessionId,
    messages: data.secondMessages,
    memory: data.second.memory,
    rootDir: data.rootDir,
  });
  checks.boundaryJournalAcceptsLineage = projection.verified === true
    && projection.boundary.compactLineageChecksum === secondLineage.lineage_checksum;

  const tamperedMemory = JSON.parse(JSON.stringify(data.second.memory));
  tamperedMemory.compactBoundary.compactLineage.turns_since_previous_compact = 999;
  tamperedMemory.compactBoundary.compactMetadata.compactLineage.turns_since_previous_compact = 999;
  tamperedMemory.compactBoundary.post_compact_restore.compactLineage.turns_since_previous_compact = 999;
  const tamperedProjection = boundary.buildGroupMemoryResumeProjection({
    groupId: data.groupId,
    sessionId: data.groupSessionId,
    messages: data.secondMessages,
    memory: tamperedMemory,
    rootDir: data.rootDir,
  });
  checks.lineageTamperFailsClosed = tamperedProjection.status === "fail_closed_rebuild_required"
    && String(tamperedProjection.reason).includes("compact_lineage");

  const rendered = verifyRendered(memory, data, secondLineage);
  checks.childContextShowsVerifiedLineage = rendered.includes("Compact lineage：status=verified")
    && rendered.includes(`turnsSincePrevious=${secondLineage.turns_since_previous_compact}`);
  const tamperedLineage = { ...secondLineage, turns_since_previous_compact: 999 };
  const tamperedRendered = verifyRendered(memory, data, tamperedLineage);
  checks.childContextRejectsTamperedLineage = tamperedRendered.includes("Compact lineage：status=fail_closed")
    && tamperedRendered.includes("compact_lineage_checksum_invalid");

  const sameChainMessages = [...data.secondMessages, ...messages(8, "phase328-recompact", "assistant", 50)];
  const sameChain = await compactOnce(compact, data.groupId, data.groupSessionId, sameChainMessages, data.second.memory);
  const sameChainLineage = sameChain.memory.compaction.compactLineage;
  checks.sameChainRecompactDetected = sameChain.compacted === true
    && sameChainLineage.previous_boundary_id === data.second.boundary.id
    && sameChainLineage.new_message_count_since_previous_compact === 8
    && sameChainLineage.turns_since_previous_compact === 0
    && sameChainLineage.is_recompaction_in_chain === true;

  const legacyLineage = compact.buildGroupCompactLineage({
    groupId: data.groupId,
    groupSessionId: data.groupSessionId,
    boundary: { id: "compact-phase328-legacy-next", type: "auto", summarizedMessageCount: 4, preCompactTokenCount: 100 },
    previousBoundary: { id: "compact-phase328-legacy" },
    checkpointKnown: false,
    trigger: "auto",
  });
  checks.legacyCheckpointRemainsUnknown = legacyLineage.checkpoint_basis === "legacy_unknown"
    && legacyLineage.turns_since_previous_compact === -1
    && legacyLineage.is_recompaction_in_chain === false
    && compact.verifyGroupCompactLineage(legacyLineage).valid === true;

  const reactiveMessages = messages(130, "phase328-reactive");
  const reactive = await compactOnce(compact, "phase328-reactive-group", "gcs_phase328_reactive", reactiveMessages, { goal: "reactive" }, { force: false });
  checks.reactiveCompactUsesAutoTrigger = reactive.compacted === true
    && reactive.boundary.compactMetadata.trigger === "auto"
    && reactive.memory.compaction.compactLineage.trigger === "auto";

  checks.restartModePreservesSecondGeneration = !restartMode
    || secondLineage.lineage_checksum === data.second.memory.compactBoundary.compactLineage.lineage_checksum;
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  return checks;
}

if (process.argv[2] === "--verify") {
  const data = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const checks = await verifyState(data, true);
  process.stdout.write(`PHASE328_CHILD_RESULT=${JSON.stringify({ count: Object.keys(checks).length })}\n`);
} else {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase328-"));
  try {
    const data = await buildSecondGeneration(tempRoot);
    const checks = await verifyState(data, false);
    const fixtureFile = path.join(tempRoot, "restart-fixture.json");
    fs.writeFileSync(fixtureFile, JSON.stringify(data), "utf8");
    const child = spawnSync(process.execPath, [file, "--verify", fixtureFile], { cwd: root, encoding: "utf8" });
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
    const match = child.stdout.match(/PHASE328_CHILD_RESULT=(\{.*\})/);
    assert.ok(match, child.stdout);
    assert.equal(JSON.parse(match[1]).count, Object.keys(checks).length);
    console.log(`Phase 328 compact lineage restart self-test: ${Object.keys(checks).length + 1}/${Object.keys(checks).length + 1}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
