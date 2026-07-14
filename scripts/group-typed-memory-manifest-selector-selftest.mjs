import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase283-manifest-selector-${nonce}`;
const sessionA = `gcs_phase283_a_${nonce}`;
const sessionB = `gcs_phase283_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const fixtureDir = path.join(root, "scratch", groupId);
const sourceFile = path.join(fixtureDir, "current-source.txt");
const sourceRelativePath = path.relative(root, sourceFile).replace(/\\/g, "/");
const secretBodyMarker = "PHASE283_BODY_MUST_NOT_ENTER_MANIFEST";

function cleanup(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { fs.rmSync(target, { force: true }); } catch {}
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeDoc(scopeId, slug, description, body, source = "phase283-selftest", type = "project") {
  typed.upsertGroupTypedMemoryDocument(scopeId, {
    type,
    slug,
    name: slug,
    description,
    source,
    body: `# ${slug}\n\n${body}`,
  });
  return typed.scanGroupTypedMemoryDocuments(scopeId).find(row => row.relPath === `${slug}.md`);
}

try {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(sourceFile, "phase283 current source\n", "utf-8");
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  storage.saveGroupMessages(groupId, [{
    id: "phase283-a-message",
    role: "user",
    content: "Implement the API retry guard",
    group_session_id: sessionA,
  }], sessionA);
  storage.saveGroupMessages(groupId, [{
    id: "phase283-b-message",
    role: "user",
    content: "PHASE283_SESSION_B_PRIVATE",
    group_session_id: sessionB,
  }], sessionB);

  for (let index = 0; index < 205; index += 1) {
    writeDoc(scopeA, `phase283-bulk-${String(index).padStart(3, "0")}`, `bulk topic ${index}`, `BULK_${index}`);
  }
  const apiDoc = writeDoc(scopeA, "phase283-api-warning", "API retry warning and known issue", `${secretBodyMarker}\nNever retry a failed payment API call without verification.`, "phase283-selftest", "feedback");
  const userDoc = writeDoc(scopeA, "phase283-user-style", "User prefers concise engineering summaries", "PHASE283_USER_STYLE", "phase283-selftest", "user");
  const referenceDoc = writeDoc(scopeA, "phase283-reference", "Deployment reference documentation", "PHASE283_REFERENCE", "phase283-selftest", "reference");
  const staleDoc = writeDoc(scopeA, "phase283-stale", "Old frontend behavior", "PHASE283_STALE_BODY");
  writeDoc(scopeA, "phase283-unbound-model-topic", "Unbound model topic", "PHASE283_UNBOUND_MODEL", "auto:model-extraction-evidence-admission", "user");
  writeDoc(scopeB, "phase283-session-b-private", "Session B only", "PHASE283_SESSION_B_PRIVATE");

  const observedChecksum = sha256(sourceFile);
  const staleRecord = typed.recordGroupTypedMemoryStaleCandidates(scopeA, {
    rows: [{
      target_project: "phase283-project",
      task_id: "phase283-stale-task",
      execution_id: "phase283-stale-execution",
      task_agent_session_id: "phase283-stale-agent-session",
      memory_context_snapshot_id: "phase283-stale-snapshot",
      memory_context_snapshot_checksum: "phase283-stale-snapshot-checksum",
      delivery_receipt_checksum: "phase283-delivery-checksum",
      rel_path: staleDoc.relPath,
      document_checksum: staleDoc.checksum,
      usage_state: "verified",
      current_source_proof_valid: true,
      current_source_relative_path: sourceRelativePath,
      current_source_claimed_checksum: observedChecksum,
      current_source_observed_checksum: observedChecksum,
      current_source_proof_id: "phase283-current-source-proof",
      evidence_valid: true,
      receipt_evidence_checksum: "phase283-receipt-evidence",
      conflict_detected: true,
      conflict_kind: "behavior_changed",
      recommended_memory_action: "remove",
      conflict_reason: "Current source supersedes this memory",
    }],
  });
  assert.equal(staleRecord.recorded_count, 1);

  const manifest = typed.buildGroupTypedMemoryManifest(scopeA, "API retry guard", {});
  assert.equal(manifest.candidateCount, typed.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES, "manifest must be capped at 200 newest headers");
  assert.ok(manifest.candidates.some(row => row.filename === apiDoc.relPath), "new relevant header must enter capped manifest");
  assert.ok(!manifest.candidates.some(row => row.filename === staleDoc.relPath), "pending stale conflict must be filtered before model selection");
  assert.ok(!manifest.candidates.some(row => row.filename === "phase283-unbound-model-topic.md"), "unbound model Topic must be filtered before model selection");
  assert.ok(!manifest.manifest.includes(secretBodyMarker), "manifest must never contain memory body text");

  let capturedRequest = null;
  const selected = await typed.selectGroupTypedMemoryManifest(scopeA, "API retry guard", {
    recentTools: ["mcp__payments__retry"],
    executor: async request => {
      capturedRequest = request;
      return {
        selected_memories: [apiDoc.relPath],
        project: "phase283-selector",
        agentType: "codex",
        model: "phase283-test-model",
      };
    },
  });
  const selectedRecall = typed.buildGroupTypedMemoryRecall(scopeA, "API retry guard", {
    typedMemoryManifestSelection: selected,
    max: 5,
  });
  assert.equal(selected.status, "selected");
  assert.equal(typed.verifyGroupTypedMemoryManifestSelection(selected, scopeA).valid, true);
  assert.ok(fs.existsSync(selected.decisionFile), "selection decision must be persisted per group session");
  assert.ok(capturedRequest.userPrompt.includes("Recently used tools: mcp__payments__retry"));
  assert.ok(!capturedRequest.userPrompt.includes(secretBodyMarker));

  const alreadySurfaced = await typed.selectGroupTypedMemoryManifest(scopeA, "API retry guard", {
    alreadySurfaced: [apiDoc.relPath],
    recordDecision: false,
    executor: async request => {
      assert.ok(!request.manifest.includes(apiDoc.relPath), "alreadySurfaced must be removed before selector invocation");
      return { selected_memories: [apiDoc.relPath] };
    },
  });
  assert.equal(alreadySurfaced.status, "empty");
  assert.deepEqual(alreadySurfaced.unknownFilenames, [apiDoc.relPath]);

  const bounded = await typed.selectGroupTypedMemoryManifest(scopeA, "memory selection", {
    recordDecision: false,
    executor: async () => ({
      selected_memories: [
        "../escape.md",
        "unknown.md",
        apiDoc.relPath,
        userDoc.relPath,
        referenceDoc.relPath,
        "phase283-bulk-204.md",
        "phase283-bulk-203.md",
        "phase283-bulk-202.md",
      ],
    }),
  });
  assert.equal(bounded.selectedRelPaths.length, 5, "selector output must be capped at five valid manifest filenames");
  assert.equal(bounded.invalidFilenameCount, 1, "path traversal filename must be rejected");
  assert.deepEqual(bounded.unknownFilenames, ["unknown.md"]);

  const empty = await typed.selectGroupTypedMemoryManifest(scopeA, "nothing clearly useful", {
    recordDecision: false,
    executor: async () => ({ selected_memories: [] }),
  });
  const emptyRecall = typed.buildGroupTypedMemoryRecall(scopeA, "nothing clearly useful", {
    typedMemoryManifestSelection: empty,
    max: 5,
  });
  const failed = await typed.selectGroupTypedMemoryManifest(scopeA, "selector failure", {
    recordDecision: false,
    executor: async () => { throw new Error("phase283-selector-failure"); },
  });
  const failedRecall = typed.buildGroupTypedMemoryRecall(scopeA, "selector failure", {
    typedMemoryManifestSelection: failed,
    max: 5,
  });
  const unavailable = await typed.selectGroupTypedMemoryManifest(scopeA, "selector unavailable", { recordDecision: false });
  const unavailableRecall = typed.buildGroupTypedMemoryRecall(scopeA, "selector unavailable", {
    typedMemoryManifestSelection: unavailable,
    max: 5,
  });

  const tampered = { ...selected, selectedRelPaths: [userDoc.relPath] };
  const tamperedRecall = typed.buildGroupTypedMemoryRecall(scopeA, "API retry guard", {
    typedMemoryManifestSelection: tampered,
    max: 5,
  });
  const wrongQueryRecall = typed.buildGroupTypedMemoryRecall(scopeA, "different query", {
    typedMemoryManifestSelection: selected,
    max: 5,
  });

  const isolatedSelection = await typed.selectGroupTypedMemoryManifest(scopeB, "PHASE283_SESSION_B_PRIVATE", {
    recordDecision: false,
    executor: async request => ({ selected_memories: [request.manifest.includes("phase283-session-b-private.md") ? "phase283-session-b-private.md" : apiDoc.relPath] }),
  });
  assert.deepEqual(isolatedSelection.selectedRelPaths, ["phase283-session-b-private.md"]);

  let bundleSelectorCalls = 0;
  const bundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, "phase283-project", "API retry guard", {
    groupSessionId: sessionA,
    taskId: "phase283-bundle-task",
    taskAgentSessionId: "phase283-child-session",
    taskAgentSessionTurn: 1,
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
    maxRenderedChars: 20_000,
    manifestSelectorExecutor: async request => {
      bundleSelectorCalls += 1;
      assert.ok(request.manifest.includes(apiDoc.relPath));
      assert.ok(!request.manifest.includes("phase283-session-b-private.md"));
      return { selected_memories: [apiDoc.relPath], project: "phase283-selector", agentType: "codex" };
    },
  });
  const bundleRecall = bundle.typedMemoryRecall || bundle.typed_memory_recall;
  let ignoreSelectorCalls = 0;
  const ignoredBundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, "phase283-project", "ignore memory for this task", {
    groupSessionId: sessionA,
    taskId: "phase283-ignore-task",
    taskAgentSessionId: "phase283-ignore-child",
    ignoreMemory: true,
    manifestSelectorExecutor: async () => { ignoreSelectorCalls += 1; return { selected_memories: [apiDoc.relPath] }; },
  });
  const pristineDecision = fs.readFileSync(selected.decisionFile, "utf-8");
  const tamperedDecision = JSON.parse(pristineDecision);
  tamperedDecision.status = "empty";
  fs.writeFileSync(selected.decisionFile, JSON.stringify(tamperedDecision, null, 2), "utf-8");
  const invalidDecisionSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  fs.writeFileSync(selected.decisionFile, pristineDecision, "utf-8");
  const selectorSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.[0] || {};

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  const liveRoutesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-live-routes.ts"), "utf-8");
  const checks = {
    manifestUsesHeadersOnlyAndCapsAt200: manifest.candidateCount === 200
      && !manifest.manifest.includes(secretBodyMarker),
    preModelFiltersAreApplied: manifest.filterCounts.pending_stale_conflict === 1
      && manifest.filterCounts.model_topic_archive_invalid_or_unbound === 1,
    selectorGetsRecentToolsWithoutBodies: capturedRequest.userPrompt.includes("mcp__payments__retry")
      && !capturedRequest.userPrompt.includes(secretBodyMarker),
    validSelectionIsChecksummedAndDurable: selected.status === "selected"
      && typed.verifyGroupTypedMemoryManifestSelection(selected, scopeA).valid === true
      && fs.existsSync(selected.decisionFile),
    selectedRecallContainsOnlyChosenMemory: selectedRecall.recalled.length === 1
      && selectedRecall.recalled[0].relPath === apiDoc.relPath
      && selectedRecall.manifestSelectionScoring.selected_recalled_count === 1,
    alreadySurfacedFilteredBeforeModel: alreadySurfaced.status === "empty"
      && alreadySurfaced.filterCounts.already_surfaced >= 1,
    outputValidationAndFiveFileCap: bounded.selectedRelPaths.length === 5
      && bounded.invalidFilenameCount === 1
      && bounded.unknownFilenames.length === 1,
    emptySelectionProducesEmptyRecall: empty.status === "empty" && emptyRecall.recalled.length === 0,
    selectorFailureProducesEmptyRecall: failed.status === "failed" && failedRecall.recalled.length === 0,
    selectorUnavailableProducesEmptyRecall: unavailable.status === "unavailable" && unavailableRecall.recalled.length === 0,
    tamperedSelectionFailsClosed: tamperedRecall.recalled.length === 0
      && tamperedRecall.manifestSelectionScoring.valid === false
      && tamperedRecall.manifestSelectionScoring.invalid_selection_gated_count > 0,
    selectionIsBoundToExactQuery: wrongQueryRecall.recalled.length === 0
      && wrongQueryRecall.manifestSelectionScoring.query_valid === false,
    exactGroupSessionIsolation: isolatedSelection.selectedRelPaths[0] === "phase283-session-b-private.md",
    asyncChildBundleUsesSelector: bundleSelectorCalls === 1
      && bundleRecall.recalled.length === 1
      && bundleRecall.recalled[0].relPath === apiDoc.relPath
      && bundleRecall.manifestSelectionScoring.applied === true,
    decisionTamperIsVisible: invalidDecisionSummary.valid === false
      && invalidDecisionSummary.invalidDecisionCount >= 1
      && selectorSummary.valid === true,
    memoryCenterShowsSelectorTelemetry: centerRow.manifestSelectorValid === true
      && centerRow.manifestSelectorDecisionCount >= 2
      && centerRow.manifestSelectorSelectedDocumentCount >= 2
      && centerReport.overall.manifestSelectorDecisionCount >= 2,
    ignoreMemorySkipsSelector: ignoreSelectorCalls === 0
      && ignoredBundle.group_state.typedMemory.recall.ignored === true,
    productionDispatchUsesAsyncSelectorBundle: (collaborationSource.match(/await buildAgentMemoryContextBundleWithManifestSelection\(/g) || []).length === 4
      && (liveRoutesSource.match(/await deps\.buildAgentMemoryContextBundleWithManifestSelection\(/g) || []).length === 3
      && collaborationSource.includes("configureGroupTypedMemoryManifestSelector(async"),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    manifest: { candidateCount: manifest.candidateCount, filterCounts: manifest.filterCounts },
    selected,
    alreadySurfaced,
    bounded,
    empty,
    failed,
    unavailable,
    selectedRecall: selectedRecall.recalled.map(row => row.relPath),
    bundleRecall: bundleRecall.recalled.map(row => row.relPath),
    selectorSummary,
    centerRow: {
      manifestSelectorValid: centerRow.manifestSelectorValid,
      manifestSelectorDecisionCount: centerRow.manifestSelectorDecisionCount,
      manifestSelectorSelectedDocumentCount: centerRow.manifestSelectorSelectedDocumentCount,
    },
  }, null, 2));
  console.log(JSON.stringify({ pass: true, checks, checkCount: Object.keys(checks).length }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanup(sessionA);
  cleanup(sessionB);
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}
