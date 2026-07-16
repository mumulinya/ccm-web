import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE322_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function readUse(id, filePath, groupSessionId, timestamp) {
  return {
    id: `message-${id}`,
    group_session_id: groupSessionId,
    role: "assistant",
    agent: "group-main",
    timestamp,
    content: [{ type: "tool_use", id, name: "Read", input: { file_path: filePath } }],
  };
}

function readResult(id, text, groupSessionId, timestamp) {
  return {
    id: `result-${id}`,
    group_session_id: groupSessionId,
    role: "user",
    target: "group-main",
    timestamp,
    content: [{ type: "tool_result", tool_use_id: id, content: text }],
  };
}

function fixtureMessages(groupSessionId, compact) {
  const start = Date.parse("2026-07-15T02:00:00.000Z");
  const old = [
    readUse("old-shared", "src/shared.ts", groupSessionId, new Date(start).toISOString()),
    readResult("old-shared", "old shared file content", groupSessionId, new Date(start + 60_000).toISOString()),
    readUse("old-stubbed", "src/stubbed.ts", groupSessionId, new Date(start + 120_000).toISOString()),
    readResult("old-stubbed", "old stubbed file content", groupSessionId, new Date(start + 180_000).toISOString()),
    readUse("old-unique", "src/unique.ts", groupSessionId, new Date(start + 240_000).toISOString()),
    readResult("old-unique", "old unique file content", groupSessionId, new Date(start + 300_000).toISOString()),
  ];
  for (let index = 0; index < 30; index += 1) {
    old.push({
      id: `phase322-filler-${index}`,
      group_session_id: groupSessionId,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "group-main" : undefined,
      agent: index % 2 === 0 ? undefined : "group-main",
      timestamp: new Date(start + (index + 6) * 60_000).toISOString(),
      content: `PHASE322_FILLER_${index} preserved-tail file dedup context ${"context ".repeat(100)}`,
    });
  }
  const preserved = [
    readUse("preserved-shared", "src/shared.ts", groupSessionId, new Date(start + 40 * 60_000).toISOString()),
    readResult("preserved-shared", "full current shared file content is visible", groupSessionId, new Date(start + 41 * 60_000).toISOString()),
    readUse("preserved-stubbed", "src/stubbed.ts", groupSessionId, new Date(start + 42 * 60_000).toISOString()),
    readResult("preserved-stubbed", `${compact.GROUP_FILE_UNCHANGED_STUB_PREFIX} Earlier content is outside the preserved tail.`, groupSessionId, new Date(start + 43 * 60_000).toISOString()),
  ];
  return { messages: [...old, ...preserved], old, preserved };
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase322-file-dedup-${nonce}`;
  const groupSessionId = `gcs_phase322_${nonce}`;
  const siblingSessionId = `gcs_phase322_sibling_${nonce}`;
  const fixture = fixtureMessages(groupSessionId, compact);
  const siblingFixture = fixtureMessages(siblingSessionId, compact);
  const originalJson = JSON.stringify(fixture.messages);
  const micro = compact.buildGroupMicroCompactPlan(fixture.old);
  const noDedupPlan = compact.buildPostCompactReinjectionPlan(fixture.old, micro, { fileBudget: 5 });
  const dedupPlan = compact.buildPostCompactReinjectionPlan(fixture.old, micro, {
    groupId,
    groupSessionId,
    preservedMessages: fixture.preserved,
    fileBudget: 5,
  });
  const directReceipt = dedupPlan.preservedFileDedup;
  const directVerification = compact.verifyGroupPostCompactFileRestoreDedupReceipt(directReceipt, {
    groupId,
    groupSessionId,
    projectionChecksum: directReceipt.projection_checksum,
  });
  const tampered = { ...directReceipt, deduped_file_candidate_count: directReceipt.deduped_file_candidate_count + 1 };
  const crossSession = compact.verifyGroupPostCompactFileRestoreDedupReceipt(directReceipt, {
    groupId,
    groupSessionId: siblingSessionId,
  });

  storage.saveGroupMessages(groupId, fixture.messages, groupSessionId);
  storage.saveGroupMessages(groupId, siblingFixture.messages, siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase322 preserved-tail file dedup", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase322 sibling isolation", decisions: [] }, siblingSessionId);
  const result = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: groupSessionId,
    force: true,
    reason: "phase322_preserved_file_dedup",
    config: {
      enabled: true,
      memoryCompactionUseModel: false,
      modelContextWindow: 200000,
      modelAutoCompactTokenLimit: 167000,
      minKeepMessages: 4,
      minKeepTokens: 500,
      maxKeepTokens: 1800,
    },
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const persistedPlan = persisted.compaction?.postCompactReinject || {};
  const persistedReceipt = persistedPlan.preservedFileDedup || null;
  const persistedFileValues = (persistedPlan.files || []).map(row => row.value);
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Continue PHASE322 using current file context", {
    groupSessionId,
    taskId: "phase322-child-dispatch",
    taskAgentSessionId: "tas_phase322_child_dispatch",
    nativeSessionId: "native_phase322_child_dispatch",
    disableTypedMemorySelector: true,
  });
  const childFileCandidates = (childBundle.post_compact_reinjection_gate?.candidates || []).filter(row => row.kind === "file");
  const childFileValues = childFileCandidates.map(row => row.value);
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.postCompactFileRestoreDedup || {};
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const noDedupTokens = compact.estimateGroupTextTokens(JSON.stringify(noDedupPlan.files));
  const dedupTokens = compact.estimateGroupTextTokens(JSON.stringify(dedupPlan.files));

  const checks = {
    duplicateVisibleReadRemoved: noDedupPlan.files.some(row => row.value === "src/shared.ts")
      && !dedupPlan.files.some(row => row.value === "src/shared.ts")
      && directReceipt.deduped_file_candidate_count === 1,
    unchangedStubRemainsEligible: dedupPlan.files.some(row => row.value === "src/stubbed.ts")
      && directReceipt.unchanged_stub_exemption_count === 1,
    uniqueOldReadRemainsEligible: dedupPlan.files.some(row => row.value === "src/unique.ts"),
    preservedReadCountsExact: directReceipt.preserved_read_tool_use_count === 2
      && directReceipt.preserved_full_read_path_count === 1
      && directReceipt.restored_file_candidate_count === 2,
    receiptValidAndBodyFree: directVerification.valid === true
      && directReceipt.raw_transcript_preserved === true
      && !JSON.stringify(directReceipt).includes("src/shared.ts")
      && !JSON.stringify(directReceipt).includes("full current shared file content"),
    tamperedReceiptRejected: compact.verifyGroupPostCompactFileRestoreDedupReceipt(tampered).valid === false,
    crossSessionReceiptRejected: crossSession.valid === false,
    projectionActuallySavesContext: dedupTokens < noDedupTokens,
    productionCompactionCompleted: result?.success === true && result?.compacted === true,
    persistedReceiptValid: persistedReceipt
      && compact.verifyGroupPostCompactFileRestoreDedupReceipt(persistedReceipt, { groupId, groupSessionId }).valid === true,
    productionPlanDedupesSharedRead: !persistedFileValues.includes("src/shared.ts"),
    productionPlanKeepsStubAndUnique: persistedFileValues.includes("src/stubbed.ts") && persistedFileValues.includes("src/unique.ts"),
    childAgentGateUsesDedupedFiles: !childFileValues.includes("src/shared.ts")
      && childFileValues.includes("src/stubbed.ts")
      && childFileValues.includes("src/unique.ts"),
    childRenderedContextUsesDedupedFiles: !String(childBundle.rendered_text || "").includes("；file=src/shared.ts")
      && String(childBundle.rendered_text || "").includes("；file=src/stubbed.ts"),
    rawTranscriptUntouched: JSON.stringify(storage.getGroupMessages(groupId, groupSessionId)) === originalJson,
    siblingSessionUnaffected: !siblingMemory.compaction?.postCompactReinject?.preservedFileDedup,
    memoryCenterShowsProjection: centerProjection.status === "applied"
      && centerProjection.receiptValid === true
      && centerProjection.groupSessionId === groupSessionId
      && centerProjection.receipt?.deduped_file_candidate_count >= 1,
    memoryCenterPanelPresent: uiSource.includes("Post-compact File Restore Dedup")
      && uiSource.includes("postCompactFileRestoreDedupCards"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId, originalJson, persistedReceipt }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const receipt = persisted.compaction?.postCompactReinject?.preservedFileDedup || null;
  const fileValues = (persisted.compaction?.postCompactReinject?.files || []).map(row => row.value);
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const projection = detail.postCompactUsage?.postCompactFileRestoreDedup || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const childBundle = memory.buildAgentMemoryContextBundle(fixture.groupId, "api", "Resume PHASE322 after restart", {
    groupSessionId: fixture.groupSessionId,
    taskId: "phase322-restart-child",
    taskAgentSessionId: "tas_phase322_restart_child",
    nativeSessionId: "native_phase322_restart_child",
    disableTypedMemorySelector: true,
  });
  const childFileValues = (childBundle.post_compact_reinjection_gate?.candidates || []).filter(row => row.kind === "file").map(row => row.value);
  const checks = {
    receiptSurvivesRestart: receipt
      && compact.verifyGroupPostCompactFileRestoreDedupReceipt(receipt, {
        groupId: fixture.groupId,
        groupSessionId: fixture.groupSessionId,
      }).valid === true,
    checksumsSurviveRestart: receipt?.projection_checksum === fixture.persistedReceipt?.projection_checksum
      && receipt?.receipt_checksum === fixture.persistedReceipt?.receipt_checksum,
    dedupedFilesSurviveRestart: !fileValues.includes("src/shared.ts") && fileValues.includes("src/stubbed.ts"),
    childContextSurvivesRestart: !childFileValues.includes("src/shared.ts") && childFileValues.includes("src/stubbed.ts"),
    memoryCenterSurvivesRestart: projection.status === "applied" && projection.receiptValid === true,
    rawStillUntouchedAfterRestart: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalJson,
    siblingStillIndependent: !sibling.compaction?.postCompactReinject?.preservedFileDedup,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 240000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-create") {
  await childCreate(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase322-file-dedup-"));
  const fixtureFile = path.join(tempHome, "phase322-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase322-post-compact-file-restore-dedup-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
