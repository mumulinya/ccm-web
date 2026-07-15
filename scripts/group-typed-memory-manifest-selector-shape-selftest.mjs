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
const groupId = `phase287-selector-shape-${nonce}`;
const sessionA = `gcs_phase287_a_${nonce}`;
const sessionB = `gcs_phase287_b_${nonce}`;
const emptySession = `gcs_phase287_empty_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const emptyScope = `${groupId}--${emptySession}`;
const project = "phase287-project";
const secretBody = "PHASE287_BODY_MUST_NOT_ENTER_SHAPE_TELEMETRY";

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
    source: "selftest:phase287-selector-shape",
    body: `# ${slug}\n\n${secretBody}\n${description}`,
  });
}

async function createCommittedSelection(slug) {
  const taskId = `phase287-task-consumed-${nonce}`;
  const taskAgentSessionId = `tas_phase287_consumed_${nonce}`;
  const query = "PHASE287 consumption-linked selector run";
  const bundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, query, {
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
    group: { id: groupId, name: "Phase 287", members: [{ project }] },
    project,
    task: query,
    taskId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = `phase287 prompt capsule=${bundle.typed_memory_delivery_capsule.capsule_checksum}`;
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
    checksum: `receipt_phase287_${nonce}`,
    taskAgentSessionId,
    memoryContextSnapshotId: `tmcs_phase287_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot_checksum_phase287_${nonce}`,
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
  return { taskId, taskAgentSessionId, committed: delivery.manifest_selector_outcome, relPath: `${slug}.md` };
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, emptySession), emptySession);
  writeDoc(scopeA, "phase287-fresh", "Fresh selector candidate");
  writeDoc(scopeA, "phase287-stale", "Stale selector candidate");
  writeDoc(scopeA, "phase287-unused", "Unselected candidate");
  writeDoc(scopeB, "phase287-session-b", "Session B isolated candidate");

  const stalePath = path.join(typed.getGroupTypedMemoryDir(scopeA), "phase287-stale.md");
  const staleAt = new Date(Date.now() - 3 * 86_400_000);
  fs.utimesSync(stalePath, staleAt, staleAt);

  const selected = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE287 select fresh and stale", {
    executor: async () => ({ selected_memories: ["phase287-fresh.md", "phase287-stale.md"] }),
  });
  equal(selected.status, "selected", "selector must select two candidate memories");
  equal(selected.selectorRan, true, "successful selector call must count as a run");
  equal(selected.shapeTelemetryExpected, true, "recorded selector run must require shape telemetry");
  equal(selected.recallShapeTelemetry.selectedCount, 2, "shape must count selected memories");
  equal(selected.recallShapeTelemetry.candidateCount, 3, "shape must preserve the denominator");
  equal(selected.recallShapeTelemetry.selectedFreshCount, 1, "shape must classify fresh selected memory");
  equal(selected.recallShapeTelemetry.selectedStaleCount, 1, "shape must classify stale selected memory");
  equal(selected.recallShapeTelemetry.bodyFree, true, "shape must explicitly declare body-free telemetry");
  equal(typed.verifyGroupTypedMemoryManifestSelectorShape(selected.recallShapeTelemetry, scopeA, selected).valid, true, "selected shape must be checksummed and decision-bound");
  const selectedShapeText = fs.readFileSync(selected.recallShapeTelemetryFile, "utf-8");
  equal(selectedShapeText.includes(secretBody), false, "shape artifact must never include memory bodies");
  equal(selectedShapeText.includes("PHASE287 select fresh and stale"), false, "shape artifact must store a query checksum, not query text");

  const empty = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE287 empty selection", {
    executor: async () => ({ selected_memories: [] }),
  });
  equal(empty.status, "empty", "an invoked selector may intentionally return no memory");
  equal(empty.recallShapeTelemetry.selectedAgeDays.average, -1, "empty selection must use the -1 selected-age sentinel");
  equal(empty.recallShapeTelemetry.emptySelectionAgeSentinel, true, "empty selection must be distinguishable from never-run");

  const failed = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE287 failed selector", {
    executor: async () => { throw new Error("phase287_executor_failure"); },
  });
  equal(failed.status, "failed", "executor failure must remain visible");
  equal(failed.selectorRan, true, "executor failure after invocation still counts as a run");
  equal(failed.recallShapeTelemetry.selectedAgeDays.average, -1, "failed run with no selection must retain the -1 age sentinel");

  let ignoredCalls = 0;
  const ignored = await typed.selectGroupTypedMemoryManifest(scopeA, "ignore memory for PHASE287", {
    ignoreMemory: true,
    executor: async () => { ignoredCalls += 1; return { selected_memories: ["phase287-fresh.md"] }; },
  });
  equal(ignoredCalls, 0, "ignore-memory must not invoke the selector");
  equal(ignored.selectorRan, false, "ignore-memory must not fabricate a selector run");
  equal(ignored.shapeTelemetryExpected, false, "ignore-memory must not create a shape denominator");

  typed.configureGroupTypedMemoryManifestSelector(null);
  const unavailable = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE287 unavailable selector");
  equal(unavailable.status, "unavailable", "missing executor must be reported separately");
  equal(unavailable.selectorRan, false, "missing executor must not count as a run");

  const controller = new AbortController();
  controller.abort();
  const aborted = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE287 aborted before call", {
    signal: controller.signal,
    executor: async () => ({ selected_memories: ["phase287-fresh.md"] }),
  });
  equal(aborted.status, "aborted", "pre-call abort must remain visible");
  equal(aborted.selectorRan, false, "pre-call abort must not count as a run");

  const noCandidates = await typed.selectGroupTypedMemoryManifest(emptyScope, "PHASE287 no candidates", {
    executor: async () => ({ selected_memories: [] }),
  });
  equal(noCandidates.status, "no_candidates", "empty manifest must bypass the selector");
  equal(noCandidates.selectorRan, false, "empty manifest must not fabricate a selector run");

  let summary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA, { includeShapeRows: true });
  equal(summary.shapeSelectorRunCount, 3, "only selected, empty, and invoked-failure decisions belong in the denominator");
  equal(summary.shapeEmptySelectionCount, 2, "empty and failed invoked runs must preserve empty outcomes");
  equal(summary.shapeCandidateTotal, 9, "each real selector run must contribute its candidates to the denominator");
  equal(summary.shapeSelectedTotal, 2, "shape summary must aggregate actual selections");
  equal(summary.shapeSelectionRate, Number((2 / 9).toFixed(6)), "selection rate must use candidate-level denominator");
  equal(summary.shapeSummary.emptySelectionAgeSentinelCount, 2, "all empty real runs must retain the -1 sentinel");
  equal(summary.shapeMissingExpectedCount, 0, "every expected real run must have a shape artifact");

  const sessionBSelection = await typed.selectGroupTypedMemoryManifest(scopeB, "PHASE287 session B", {
    executor: async () => ({ selected_memories: ["phase287-session-b.md"] }),
  });
  equal(typed.verifyGroupTypedMemoryManifestSelectorShape(selected.recallShapeTelemetry, scopeB, sessionBSelection).valid, false, "shape verification must reject cross-session reuse");
  equal(typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeB).shapeSelectorRunCount, 1, "session B must have its own selector denominator");
  equal(typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA).shapeSelectorRunCount, 3, "session B must not change session A telemetry");

  const selectedShapeFile = selected.recallShapeTelemetryFile;
  const pristineShapeText = fs.readFileSync(selectedShapeFile, "utf-8");
  fs.unlinkSync(selectedShapeFile);
  summary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  equal(summary.shapeMissingExpectedCount, 1, "missing expected shape must become an integrity gap");
  equal(summary.shapeValid, false, "missing expected shape must invalidate shape closure");
  fs.writeFileSync(selectedShapeFile, pristineShapeText, "utf-8");

  const tamperedShape = JSON.parse(pristineShapeText);
  tamperedShape.bodyFree = false;
  fs.writeFileSync(selectedShapeFile, JSON.stringify(tamperedShape, null, 2), "utf-8");
  summary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  ok(summary.shapeInvalidCount >= 1, "tampered shape must fail checksum and body-free verification");
  fs.writeFileSync(selectedShapeFile, pristineShapeText, "utf-8");

  const consumed = await createCommittedSelection("phase287-fresh");
  const consumption = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, {
    taskId: consumed.taskId,
    targetProject: project,
    rows: [{
      task_agent_session_id: consumed.taskAgentSessionId,
      target_project: project,
      rel_path: consumed.relPath,
      usage_state: "used",
      claimed_usage_state: "used",
      memory_context_snapshot_id: consumed.committed.memoryContextSnapshotId,
      memory_context_snapshot_checksum: consumed.committed.memoryContextSnapshotChecksum,
      delivery_receipt_checksum: consumed.committed.deliveryReceiptChecksum,
      receipt_evidence_checksum: `receipt-evidence-${consumed.taskAgentSessionId}`,
      evidence_tier: "bound_structured_receipt",
      evidence_confidence: 0.75,
      direct_reference: true,
      reason: "used in phase287",
    }],
    receipts: [{
      taskAgentSessionId: consumed.taskAgentSessionId,
      typedMemoryUsage: [{ relPath: consumed.relPath, usageState: "used", reason: "used in phase287" }],
    }],
    generatedAt: new Date().toISOString(),
  });
  equal(consumption.recordedCount, 1, "bound receipt must record one consumption outcome");

  summary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  equal(summary.shapeSelectorRunCount, 4, "committed child-agent selector run must join the same session denominator");
  equal(summary.shapeConsumptionLinkedRunCount, 1, "shape must link to the exact selector consumption receipt");
  equal(summary.shapeConsumedDeliveredDocumentCount, 1, "shape utility must count delivered documents");
  equal(summary.shapeConsumptionReceiptCoverageRate, 1, "fully declared receipt must have complete coverage");
  equal(summary.shapeConsumedUtilityRate, 1, "used receipt must produce full observed utility");

  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.find(row => row.groupSessionId === sessionA) || {};
  equal(centerRow.manifestSelectorShapeSelectorRunCount, 4, "Memory Center must expose the exact-session selector denominator");
  equal(centerRow.manifestSelectorShapeConsumptionLinkedRunCount, 1, "Memory Center must expose receipt-linked selector runs");
  equal(centerRow.manifestSelectorShapeConsumptionReceiptCoverageRate, 1, "Memory Center must expose receipt coverage");
  equal(centerRow.manifestSelectorShapeConsumedUtilityRate, 1, "Memory Center must expose consumed utility");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 287 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
