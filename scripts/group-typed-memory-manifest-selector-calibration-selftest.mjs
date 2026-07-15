import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase286-selector-calibration-${nonce}`;
const sessionA = `gcs_phase286_a_${nonce}`;
const sessionB = `gcs_phase286_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "phase286-project";
const query = "PHASE286 exact calibration query";
const secretBody = "PHASE286_BODY_MUST_NOT_ENTER_CALIBRATION";

let checks = 0;
function equal(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }
function ok(value, message) { checks += 1; assert.ok(value, message); }

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (child.name !== groupId && !child.name.startsWith(`${groupId}.`) && !child.name.startsWith(`${groupId}--`)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function writeDoc(scopeId, slug, description) {
  typed.upsertGroupTypedMemoryDocument(scopeId, {
    type: "project",
    slug,
    name: slug,
    description,
    source: "selftest:phase286-selector-calibration",
    body: `# ${slug}\n\n${secretBody}\n${description}`,
  });
}

async function createCommitted(slug, suffix, taskQuery = query) {
  const taskId = `phase286-task-${suffix}-${nonce}`;
  const taskAgentSessionId = `tas_phase286_${suffix}_${nonce}`;
  const bundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, taskQuery, {
    groupSessionId: sessionA,
    taskId,
    taskAgentSessionId,
    taskAgentSessionTurn: 1,
    agentType: "codex",
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
    maxTypedMemoryDeliveryDocuments: 1,
    manifestSelectorExecutor: async () => ({ selected_memories: [`${slug}.md`] }),
  });
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 286", members: [{ project }] },
    project,
    task: taskQuery,
    taskId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = `phase286 prompt capsule=${bundle.typed_memory_delivery_capsule.capsule_checksum}`;
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
    skipGroupSessionPresenceCheck: true,
  });
  assert.equal(admission.admitted, true);
  const deliveryReceipt = {
    schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
    status: "delivered",
    delivered: true,
    checksum: `receipt_${suffix}_${nonce}`,
    taskAgentSessionId,
    memoryContextSnapshotId: `tmcs_${suffix}_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot_checksum_${suffix}_${nonce}`,
    workerContextPacketId: packet.packet_id,
  };
  const delivery = memory.commitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    dispatchEvidence: {
      deliveryReceipt,
      dispatched: true,
      executionReturned: true,
      renderedPrompt,
      dispatchTicket: admission.ticket,
      dispatchStartedAt: admission.ticket.admitted_at,
    },
  });
  assert.equal(delivery.committed, true);
  return {
    taskId,
    taskAgentSessionId,
    committed: delivery.manifest_selector_outcome,
    relPath: `${slug}.md`,
    selectorQuery: String(bundle.group_state?.typedMemory?.recallQuery || taskQuery),
  };
}

function recordConsumption(chain, usageState, options = {}) {
  const typedMemoryUsage = options.typedMemoryUsage ?? [{ relPath: chain.relPath, usageState, reason: `${usageState} phase286` }];
  const result = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, {
    taskId: chain.taskId,
    targetProject: project,
    rows: [{
      task_agent_session_id: chain.taskAgentSessionId,
      target_project: project,
      rel_path: chain.relPath,
      usage_state: usageState,
      claimed_usage_state: usageState,
      memory_context_snapshot_id: chain.committed.memoryContextSnapshotId,
      memory_context_snapshot_checksum: chain.committed.memoryContextSnapshotChecksum,
      delivery_receipt_checksum: chain.committed.deliveryReceiptChecksum,
      receipt_evidence_checksum: `receipt-evidence-${chain.taskAgentSessionId}`,
      evidence_tier: "bound_structured_receipt",
      evidence_confidence: 0.75,
      direct_reference: usageState !== "mentioned",
      reason: `${usageState} phase286`,
    }],
    receipts: [{ taskAgentSessionId: chain.taskAgentSessionId, typedMemoryUsage }],
    generatedAt: new Date().toISOString(),
  });
  assert.equal(result.recordedCount, 1, JSON.stringify(result));
  return result;
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  for (const [slug, description] of [
    ["phase286-support", "Clearly useful exact-query memory"],
    ["phase286-caution", "Repeatedly ignored but still currently eligible"],
    ["phase286-mixed", "Single ignore is not enough for caution"],
    ["phase286-unreported", "No structured consumption declaration"],
    ["phase286-unexpected", "Receipt also claims an undelivered path"],
    ["phase286-other-query", "Evidence belongs to another exact query"],
  ]) writeDoc(scopeA, slug, description);
  writeDoc(scopeB, "phase286-session-b", "Session B isolated memory");

  const support = await createCommitted("phase286-support", "support");
  const selectorQuery = support.selectorQuery;
  recordConsumption(support, "used");
  recordConsumption(await createCommitted("phase286-caution", "caution1"), "ignored");
  recordConsumption(await createCommitted("phase286-caution", "caution2"), "ignored");
  recordConsumption(await createCommitted("phase286-mixed", "mixed"), "ignored");
  recordConsumption(await createCommitted("phase286-unreported", "unreported"), "mentioned", { typedMemoryUsage: [] });
  const unexpected = await createCommitted("phase286-unexpected", "unexpected");
  recordConsumption(unexpected, "used", {
    typedMemoryUsage: [
      { relPath: unexpected.relPath, usageState: "used", reason: "expected path" },
      { relPath: "phase286-not-delivered.md", usageState: "used", reason: "invalid path" },
    ],
  });
  recordConsumption(await createCommitted("phase286-other-query", "other", "PHASE286 different exact query"), "used");

  const candidateRelPaths = [
    "phase286-support.md",
    "phase286-caution.md",
    "phase286-mixed.md",
    "phase286-unreported.md",
    "phase286-unexpected.md",
    "phase286-other-query.md",
  ];
  const calibration = typed.buildGroupTypedMemoryManifestSelectorCalibration(scopeA, selectorQuery, { candidateRelPaths });
  equal(typed.verifyGroupTypedMemoryManifestSelectorCalibration(calibration, scopeA, calibration.queryChecksum).valid, true, "calibration must be checksummed and bound to exact session/query");
  equal(calibration.advisoryOnly, true, "historical outcomes must remain advisory");
  equal(calibration.autoSuppression, false, "calibration must not automatically suppress a memory");
  equal(calibration.crossSessionReuse, false, "calibration must prohibit cross-session reuse");
  equal(calibration.evidenceCount, 4, `only used/ignored strong outcomes from the exact query may calibrate selection: ${JSON.stringify(calibration)}`);
  const supportHint = calibration.hints.find(row => row.relPath === "phase286-support.md");
  const cautionHint = calibration.hints.find(row => row.relPath === "phase286-caution.md");
  const mixedHint = calibration.hints.find(row => row.relPath === "phase286-mixed.md");
  equal(supportHint?.calibration, "support", "used evidence should produce a support hint");
  equal(cautionHint?.calibration, "caution", "two ignored outcomes should produce a caution hint");
  equal(cautionHint?.ignoredCount, 2, "caution must preserve its strong evidence count");
  equal(mixedHint?.calibration, "mixed", "one ignored outcome must not become an automatic caution");
  equal(calibration.hints.some(row => row.relPath === "phase286-unreported.md"), false, "unreported delivery must not train calibration");
  equal(calibration.hints.some(row => row.relPath === "phase286-unexpected.md"), false, "receipt with an unexpected relPath must not train calibration");
  equal(calibration.hints.some(row => row.relPath === "phase286-other-query.md"), false, "different exact query evidence must not train calibration");

  const otherQueryCalibration = typed.buildGroupTypedMemoryManifestSelectorCalibration(scopeA, "PHASE286 unseen query", { candidateRelPaths });
  equal(otherQueryCalibration.hintCount, 0, "different query must receive no historical hints");
  const sessionBCalibration = typed.buildGroupTypedMemoryManifestSelectorCalibration(scopeB, selectorQuery, { candidateRelPaths });
  equal(sessionBCalibration.hintCount, 0, "different group-chat session must receive no historical hints");

  const manifest = typed.buildGroupTypedMemoryManifest(scopeA, selectorQuery, {});
  ok(manifest.candidates.some(row => row.filename === "phase286-caution.md"), "caution hint must not remove a currently eligible candidate");
  ok(manifest.calibrationText.includes("phase286-support.md: support"), "manifest request must render support evidence separately from memory headers");
  ok(manifest.calibrationText.includes("phase286-caution.md: caution"), "manifest request must render caution evidence separately from memory headers");
  equal(manifest.calibrationText.includes(secretBody), false, "calibration must never expose memory bodies");

  let capturedRequest = null;
  const selection = await typed.selectGroupTypedMemoryManifest(scopeA, selectorQuery, {
    executor: async request => {
      capturedRequest = request;
      return { selected_memories: ["phase286-caution.md"], project: "phase286-selector", agentType: "codex" };
    },
  });
  equal(selection.status, "selected", "advisory caution must not auto-reject a model selection");
  equal(selection.selectedRelPaths[0], "phase286-caution.md", "current selector remains authoritative within the valid manifest");
  equal(typed.verifyGroupTypedMemoryManifestSelection(selection, scopeA).valid, true, "selection must bind the calibration checksum");
  ok(capturedRequest.userPrompt.includes("advisory only; do not auto-select or auto-reject"), "selector prompt must state the anti-bias boundary");
  equal(capturedRequest.userPrompt.includes(secretBody), false, "selector prompt must contain headers and outcome counts only");
  equal(capturedRequest.calibration.checksum, selection.calibrationChecksum, "selector request and decision must share the calibration checksum");

  const tamperedCalibration = { ...selection.calibration, hints: selection.calibration.hints.map((row, index) => index === 0 ? { ...row, calibration: "support" } : row) };
  const tamperedSelection = { ...selection, calibration: tamperedCalibration };
  equal(typed.verifyGroupTypedMemoryManifestSelection(tamperedSelection, scopeA).valid, false, "tampered calibration must invalidate the selector decision");

  const futureCalibration = typed.buildGroupTypedMemoryManifestSelectorCalibration(scopeA, selectorQuery, {
    candidateRelPaths,
    nowMs: Date.now() + 181 * 86_400_000,
    lookbackDays: 180,
  });
  equal(futureCalibration.hintCount, 0, "evidence outside the bounded lookback must expire");

  const selectorSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  ok(selectorSummary.calibrationHintedDecisionCount >= 1, "selector summary must count calibrated decisions");
  ok(selectorSummary.calibrationSupportHintCount >= 1, "selector summary must expose support hints");
  ok(selectorSummary.calibrationCautionHintCount >= 1, "selector summary must expose caution hints");
  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.[0] || {};
  ok(centerRow.manifestSelectorCalibrationHintedDecisionCount >= 1, "Memory Center must expose calibrated decisions");
  ok(centerRow.manifestSelectorCalibrationEvidenceCount >= 1, "Memory Center must expose strong calibration evidence");
  ok(centerRow.manifestSelectorCalibrationCautionHintCount >= 1, "Memory Center must expose caution hints without treating them as suppression");

  let ignoreSelectorCalls = 0;
  const ignored = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, "ignore memory for this task", {
    groupSessionId: sessionA,
    taskId: `phase286-ignore-${nonce}`,
    taskAgentSessionId: `tas_phase286_ignore_${nonce}`,
    ignoreMemory: true,
    manifestSelectorExecutor: async () => { ignoreSelectorCalls += 1; return { selected_memories: ["phase286-support.md"] }; },
  });
  equal(ignoreSelectorCalls, 0, "ignore-memory request must not invoke the calibrated selector");
  equal(ignored.group_state.typedMemory.recall.ignored, true, "ignore-memory request must still receive empty typed memory");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 286 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
