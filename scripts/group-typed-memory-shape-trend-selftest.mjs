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

const DAY = 86_400_000;
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase289-shape-trend-${nonce}`;
const sessionA = `gcs_phase289_a_${nonce}`;
const sessionB = `gcs_phase289_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "phase289-project";
const secretBody = "PHASE289_BODY_MUST_NOT_ENTER_DURABLE_TREND";
const nowMs = Date.now();

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

function writeDoc(scopeId, slug, body = secretBody) {
  return typed.upsertGroupTypedMemoryDocument(scopeId, {
    type: "project",
    slug,
    name: slug,
    description: "Phase 289 durable shape trend fixture",
    source: "selftest:phase289-shape-trend",
    body,
  });
}

async function createCommittedSelection() {
  const taskId = `phase289-task-${nonce}`;
  const taskAgentSessionId = `tas_phase289_${nonce}`;
  const relPath = "phase289-memory.md";
  const query = "PHASE289 durable trend consumption";
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
    manifestSelectorExecutor: async () => ({ selected_memories: [relPath] }),
  });
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 289", members: [{ project }] },
    project,
    task: query,
    taskId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = `phase289 capsule=${bundle.typed_memory_delivery_capsule.capsule_checksum}`;
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
    checksum: `receipt_phase289_${nonce}`,
    taskAgentSessionId,
    memoryContextSnapshotId: `tmcs_phase289_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot_phase289_${nonce}`,
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
  return { taskId, taskAgentSessionId, relPath, committed: delivery.manifest_selector_outcome };
}

function recordConsumption(chain) {
  const input = {
    taskId: chain.taskId,
    targetProject: project,
    rows: [{
      task_agent_session_id: chain.taskAgentSessionId,
      target_project: project,
      rel_path: chain.relPath,
      usage_state: "used",
      claimed_usage_state: "used",
      memory_context_snapshot_id: chain.committed.memoryContextSnapshotId,
      memory_context_snapshot_checksum: chain.committed.memoryContextSnapshotChecksum,
      delivery_receipt_checksum: chain.committed.deliveryReceiptChecksum,
      receipt_evidence_checksum: `phase289-evidence-${nonce}`,
      evidence_tier: "bound_structured_receipt",
      evidence_confidence: 0.9,
      direct_reference: true,
      reason: "used by Phase 289 selftest",
    }],
    receipts: [{
      taskAgentSessionId: chain.taskAgentSessionId,
      typedMemoryUsage: [{ relPath: chain.relPath, usageState: "used", reason: "used by Phase 289 selftest" }],
      memoryUsed: [chain.relPath],
      memoryIgnored: [],
    }],
    generatedAt: new Date(nowMs).toISOString(),
  };
  return { input, result: typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, input) };
}

function contribute(kind, eventKey, daysAgo, metrics, optionsNowMs = nowMs) {
  return typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
    kind,
    eventKey,
    recordedAt: new Date(nowMs - daysAgo * DAY).toISOString(),
    metrics,
  }, { nowMs: optionsNowMs });
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const write = writeDoc(scopeA, "phase289-memory");
  equal(write.writeShapeTelemetry.trendContribution.recorded, true, "typed-memory writes must contribute automatically");
  const selection = await typed.selectGroupTypedMemoryManifest(scopeA, "PHASE289 select durable memory", {
    executor: async () => ({ selected_memories: ["phase289-memory.md"] }),
  });
  equal(selection.recallShapeTelemetry.trendContribution.recorded, true, "selector runs must contribute automatically");

  const chain = await createCommittedSelection();
  const consumption = recordConsumption(chain);
  equal(consumption.result.recordedCount, 1, "bound consumption must create one outcome");
  equal(consumption.result.outcomes[0].trendContribution.recorded, true, "consumption outcomes must contribute automatically");
  const replayedConsumption = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumption.input);
  equal(replayedConsumption.idempotentCount, 1, "replayed consumption must remain idempotent");
  equal(replayedConsumption.outcomes[0].trendContribution.idempotent, true, "replayed consumption must not double-count durable trend");

  let ledger = typed.readGroupTypedMemoryShapeTrendLedger(scopeA);
  equal(ledger.valid, true, "pristine durable trend ledger must verify");
  equal(ledger.buckets.length, 1, "same-day events must share one daily bucket");
  ok(ledger.buckets[0].write.eventCount >= 1, "daily bucket must aggregate write events");
  ok(ledger.buckets[0].selector.runCount >= 2, "daily bucket must aggregate selector runs");
  equal(ledger.buckets[0].consumption.outcomeCount, 1, "daily bucket must aggregate consumption outcomes once");
  equal(ledger.bodyFree, true, "durable trend ledger must declare body-free storage");
  const ledgerText = fs.readFileSync(ledger.file, "utf-8");
  equal(ledgerText.includes(secretBody), false, "durable trend ledger must not store memory bodies");
  equal(ledgerText.includes("PHASE289 select durable memory"), false, "durable trend ledger must not store selector queries");
  equal(ledgerText.includes("used by Phase 289 selftest"), false, "durable trend ledger must not store receipt reasons");

  const duplicateSelector = typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
    kind: "selector",
    eventKey: selection.requestId,
    recordedAt: selection.completedAt,
    metrics: { candidateCount: 1, selectedCount: 1, selectedAgeAverage: 0, freshCount: 1, staleCount: 0 },
  });
  equal(duplicateSelector.idempotent, true, "contribution key hashes must prevent duplicate selector counts");

  const sessionBWrite = writeDoc(scopeB, "phase289-session-b", "SESSION B ONLY");
  equal(sessionBWrite.writeShapeTelemetry.trendContribution.recorded, true, "session B must own an independent trend ledger");
  const ledgerB = typed.readGroupTypedMemoryShapeTrendLedger(scopeB);
  equal(ledgerB.buckets[0].write.eventCount, 1, "session B bucket must contain only session B writes");
  equal(typed.verifyGroupTypedMemoryShapeTrendLedger(ledger, scopeB).valid, false, "durable ledger must reject cross-session verification");

  const oldEventMs = nowMs - 40 * DAY;
  const oldCreated = typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
    kind: "write",
    eventKey: "old-mutable-when-created",
    recordedAt: new Date(oldEventMs).toISOString(),
    metrics: { operation: "update", changed: true, growthBytes: 10, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false },
  }, { nowMs: oldEventMs });
  equal(oldCreated.recorded, true, "historical bucket may be created while it is inside its original mutable window");
  contribute("write", "seal-old-bucket", 0, { operation: "noop", changed: false, growthBytes: 0, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false });
  ledger = typed.readGroupTypedMemoryShapeTrendLedger(scopeA);
  const sealed = ledger.buckets.find((bucket) => bucket.date === new Date(oldEventMs).toISOString().slice(0, 10));
  equal(sealed.sealed, true, "buckets older than the 35-day mutable window must be sealed");
  equal(sealed.contributionKeys.length, 0, "sealed buckets must discard contribution keys");
  const late = contribute("write", "late-sealed-event", 40, { operation: "noop", changed: false, growthBytes: 0, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false });
  equal(late.reason, "trend_bucket_sealed", "sealed buckets must reject late receipts");

  const boundaryAccepted = contribute("write", "retention-day-179", 179, { operation: "noop", changed: false, growthBytes: 0, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false });
  equal(boundaryAccepted.reason, "trend_bucket_sealed", "retained historical dates remain immutable outside 35 days");
  const outsideRetention = contribute("write", "retention-day-180", 180, { operation: "noop", changed: false, growthBytes: 0, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false });
  equal(outsideRetention.reason, "trend_contribution_outside_retention", "the 180-day window must contain exactly 180 calendar buckets including today");

  const ancientMs = nowMs - 200 * DAY;
  const ancient = typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
    kind: "write",
    eventKey: "ancient-created-in-past",
    recordedAt: new Date(ancientMs).toISOString(),
    metrics: { operation: "create", changed: true, growthBytes: 100, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false },
  }, { nowMs: ancientMs });
  equal(ancient.recorded, true, "an ancient bucket may exist in its historical timeline");
  contribute("write", "prune-ancient", 0, { operation: "noop", changed: false, growthBytes: 0, afterBytes: 100, nearBodyLimit: false, bodyTruncated: false });
  ledger = typed.readGroupTypedMemoryShapeTrendLedger(scopeA);
  equal(ledger.buckets.some((bucket) => bucket.date === new Date(ancientMs).toISOString().slice(0, 10)), false, "current writes must prune buckets beyond 180 days");
  ok(ledger.buckets.length <= 180, "ledger must never exceed 180 daily buckets");

  for (let index = 0; index < 3; index += 1) {
    contribute("selector", `baseline-selected-${index}`, 10 + index, { candidateCount: 4, selectedCount: 4, selectedAgeAverage: 1, freshCount: 4, staleCount: 0 });
    contribute("selector", `recent-empty-${index}`, index, { candidateCount: 4, selectedCount: 0, selectedAgeAverage: -1, freshCount: 0, staleCount: 0 });
  }
  let trend = typed.summarizeGroupTypedMemoryShapeTrend(scopeA, { nowMs });
  equal(trend.valid, true, "durable trend summary must verify its ledger");
  equal(trend.status, "drift", "durable baseline and recent buckets must produce bounded drift");
  equal(trend.advisoryOnly, true, "durable drift must remain advisory-only");
  equal(trend.autoTuning, false, "durable drift must never auto-tune selector or memory policy");
  equal(trend.crossSessionReuse, false, "durable trend must remain exact-session only");
  equal(trend.extendsBeyondHotRetention, true, "sealed history must extend observation beyond hot event retention");
  ok(trend.signals.some((signal) => signal.code === "selection_rate_shift"), "durable trend must preserve selection-rate drift signals");
  ok(trend.signals.some((signal) => signal.code === "empty_selection_rise"), "durable trend must preserve empty-selection warnings");
  equal(typed.verifyGroupTypedMemoryShapeTrendSummary(trend, scopeA).valid, true, "durable trend summary must be checksummed");
  const tamperedSummary = { ...trend, status: "stable" };
  equal(typed.verifyGroupTypedMemoryShapeTrendSummary(tamperedSummary, scopeA).valid, false, "tampered trend summary must fail checksum verification");
  equal(typed.verifyGroupTypedMemoryShapeTrendSummary(trend, scopeB).valid, false, "trend summary must reject cross-session reuse");

  const pristinePrimary = fs.readFileSync(ledger.file, "utf-8");
  ok(fs.existsSync(`${ledger.file}.bak`), "atomic updates must preserve a valid backup ledger");
  fs.writeFileSync(ledger.file, "{corrupt-primary", "utf-8");
  const recovered = typed.readGroupTypedMemoryShapeTrendLedger(scopeA);
  equal(recovered.valid, true, "reader must recover from a valid atomic backup");
  equal(recovered.recoveredFromBackup, true, "backup recovery must be explicit");
  const recoveredTrend = typed.summarizeGroupTypedMemoryShapeTrend(scopeA, { nowMs });
  equal(recoveredTrend.recoveredFromBackup, true, "trend summary must expose backup recovery");
  let centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  let centerRow = centerReport.groups?.find((row) => row.groupSessionId === sessionA) || {};
  equal(centerRow.memoryShapeTrendRecoveredFromBackup, true, "Memory Center must surface backup recovery");
  fs.writeFileSync(ledger.file, pristinePrimary, "utf-8");

  const beforeHotRemoval = typed.summarizeGroupTypedMemoryShapeTrend(scopeA, { nowMs });
  fs.rmSync(typed.getGroupTypedMemoryManifestSelectorShapeDir(scopeA), { recursive: true, force: true });
  fs.rmSync(typed.getGroupTypedMemoryWriteShapeDir(scopeA), { recursive: true, force: true });
  const afterHotRemoval = typed.summarizeGroupTypedMemoryShapeTrend(scopeA, { nowMs });
  equal(afterHotRemoval.ledgerChecksum, beforeHotRemoval.ledgerChecksum, "durable trend must survive hot shape-event removal");
  equal(afterHotRemoval.bucketCount, beforeHotRemoval.bucketCount, "daily trend buckets must outlive bounded hot event files");

  centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  centerRow = centerReport.groups?.find((row) => row.groupSessionId === sessionA) || {};
  equal(centerRow.memoryShapeTrendPresent, true, "Memory Center must expose the exact-session durable trend ledger");
  equal(centerRow.memoryShapeTrendValid, true, "Memory Center must verify the durable trend ledger");
  equal(centerRow.memoryShapeTrendStatus, "drift", "Memory Center must expose durable drift status");
  ok(centerRow.memoryShapeTrendBucketCount >= 3, "Memory Center must expose daily bucket counts");
  ok(centerRow.memoryShapeTrendSealedBucketCount >= 1, "Memory Center must expose sealed bucket counts");
  equal(centerRow.memoryShapeTrendExtendsBeyondHotRetention, true, "Memory Center must expose history beyond hot retention");
  equal(centerReport.overall.memoryShapeTrendDriftSessionCount, 1, "fleet summary must count durable drift sessions");
  equal(centerReport.overall.memoryShapeTrendBackupRecoverySessionCount, 0, "restored primary ledger must clear recovery state");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 289 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
