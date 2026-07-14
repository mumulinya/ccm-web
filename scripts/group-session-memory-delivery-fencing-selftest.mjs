import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extraction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-extraction.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const collaboration = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "collaboration.js"));

const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase228-delivery-${suffix}`;
const groupSessionId = `gcs_${Date.now().toString(36)}_delivery`;
const scopeId = `${groupId}--${groupSessionId}`;
const taskId = `phase228-task-${suffix}`;
const project = "phase228-project";
let taskAgentSession = null;
const concurrencyTaskIds = [];

function runConcurrencyWorker(workerFile, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerFile, ...args], { cwd: root, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`concurrency worker exited ${code}: ${stderr || stdout}`));
      try {
        resolve(JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || "{}"));
      } catch (error) {
        reject(new Error(`invalid concurrency worker output: ${stdout}\n${stderr}\n${error}`));
      }
    });
  });
}

try {
  let expiredCommitCount = 0;
  const expired = extraction.runGroupSessionMemoryExtractionTransaction(scopeId, () => ({
    schema: "ccm-group-session-memory-extraction-staged-commit-v1",
    commit: () => { expiredCommitCount += 1; return "must-not-commit"; },
  }), {
    at: "2026-07-13T05:00:00.000Z",
    ttlMs: 5000,
    commitAt: "2026-07-13T05:00:06.000Z",
  });

  let successfulCommitCount = 0;
  const committed = extraction.runGroupSessionMemoryExtractionTransaction(scopeId, () => ({
    schema: "ccm-group-session-memory-extraction-staged-commit-v1",
    commit: () => { successfulCommitCount += 1; return "committed"; },
  }), {
    at: "2026-07-13T05:00:07.000Z",
    ttlMs: 5000,
    commitAt: "2026-07-13T05:00:09.000Z",
  });

  const renewalHolder = extraction.acquireGroupSessionMemoryExtractionLease(scopeId, {
    at: "2026-07-13T05:01:00.000Z",
    ttlMs: 5000,
  });
  const renewed = extraction.renewGroupSessionMemoryExtractionLease(renewalHolder.handle, {
    at: "2026-07-13T05:01:04.000Z",
    ttlMs: 5000,
  });
  const renewedInspection = extraction.inspectGroupSessionMemoryExtractionLease(scopeId, {
    at: "2026-07-13T05:01:08.000Z",
  });
  extraction.releaseGroupSessionMemoryExtractionLease(renewalHolder.handle, "phase228_renewal_checked");

  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, groupSessionId),
    goal: "验证每个项目子 Agent 只消费所属群聊会话记忆。",
    persistentRequirements: ["PHASE228_SESSION_MEMORY_DELIVERY_SENTINEL"],
  }, groupSessionId);

  taskAgentSession = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId,
    project,
    agentType: "codex",
  });
  const bundle = memory.buildAgentMemoryContextBundle(groupId, project, "实现 Phase 228 送达验证", {
    groupSessionId,
    taskId,
    taskAgentSessionId: taskAgentSession.id,
    nativeSessionId: "native-phase228",
    agentType: "codex",
  });
  const renderedMemory = memory.renderGroupMemoryContextBundle(bundle);
  const renderedPrompt = `PHASE228_PROMPT_HEADER\n\n${renderedMemory}\n\nPHASE228_TASK_BODY`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskAgentSession.id, {
    taskId,
    groupId,
    project,
    agentType: "codex",
    nativeSessionId: "native-phase228",
    executionId: `exec-${suffix}`,
    traceId: `trace-${suffix}`,
    workerContextPacket: { packet_id: `packet-${suffix}`, memory: bundle },
    memoryContext: bundle,
    renderedPrompt,
  });
  const beforeDelivery = sessions.buildTaskAgentMemoryContextSnapshotInventory({ taskId });
  const beforeRow = beforeDelivery.rows.find(row => row.snapshotId === bound.snapshot.snapshot_id);

  const delivery = sessions.recordTaskAgentMemoryContextDelivery(taskAgentSession.id, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt,
    snapshotRenderedPrompt: renderedPrompt,
    executionId: `exec-${suffix}`,
    traceId: `trace-${suffix}`,
    runtime: "codex",
    attempt: 1,
    nativeSessionId: "native-phase228",
    dispatched: true,
    executionSucceeded: true,
    output: "CCM_AGENT_RECEIPT phase228",
  });
  if (!delivery) {
    throw new Error(JSON.stringify({ reason: "delivery_receipt_not_recorded", beforeRow, snapshot: bound.snapshot, session: bound.session }, null, 2));
  }
  const afterDelivery = sessions.buildTaskAgentMemoryContextSnapshotInventory({ taskId });
  const afterRow = afterDelivery.rows.find(row => row.snapshotId === bound.snapshot.snapshot_id);
  const snapshotSources = sessions.listTaskAgentMemoryContextSnapshots({ taskId });
  const source = snapshotSources.find(row => row.snapshot_id === bound.snapshot.snapshot_id);
  const binding = bound.snapshot.context.group_session_memory_binding;
  const baseReceipt = {
    agent: project,
    status: "done",
    task_agent_session_id: taskAgentSession.id,
    memory_context_snapshot_id: bound.snapshot.snapshot_id,
    memory_context_snapshot_checksum: bound.snapshot.checksum,
    memoryUsed: [`使用 ${binding.scopeId} 的 Session Memory`],
    memoryIgnored: [],
  };
  const validReceipt = {
    ...baseReceipt,
    memoryContextUsage: {
      bindingId: binding.memoryBindingId,
      groupSessionId,
      sessionMemoryChecksum: binding.sessionMemoryChecksum,
      usageState: "used",
      reason: "已将所属群聊会话摘要和近期原文用于本轮实现。",
    },
    memoryFactCitations: binding.sessionMemorySectionEvidence.slice(0, 1).map(item => ({
      evidenceId: item.evidenceId,
      section: item.section,
      sectionChecksum: item.sectionChecksum,
      sourceTranscriptChecksum: item.sourceTranscriptChecksum,
      usage: "用该章节确认本轮所属会话的实现约束。",
    })),
  };
  const validConsumption = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: project },
    validReceipt,
    { taskAgentMemoryContextSnapshots: [source] },
  );
  const systemOnlyConsumption = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: project },
    baseReceipt,
    { taskAgentMemoryContextSnapshots: [source] },
  );
  const wrongSessionConsumption = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: project },
    {
      ...validReceipt,
      memoryContextUsage: { ...validReceipt.memoryContextUsage, groupSessionId: "gcs_wrong_session" },
    },
    { taskAgentMemoryContextSnapshots: [source] },
  );

  const concurrencySuffix = `${suffix}-${Date.now().toString(36)}`;
  const concurrencyWorker = path.join(root, "scripts", "task-agent-session-store-concurrency-worker.mjs");
  const workerCount = 12;
  const startAt = Date.now() + 1500;
  const workerResults = await Promise.all(Array.from({ length: workerCount }, (_, index) =>
    runConcurrencyWorker(concurrencyWorker, [concurrencySuffix, String(index), String(startAt)])));
  concurrencyTaskIds.push(...workerResults.map(result => result.taskId));
  const concurrentSessions = workerResults.map(result => ({
    result,
    sessions: sessions.listTaskAgentSessions({ taskId: result.taskId }),
    snapshots: sessions.listTaskAgentMemoryContextSnapshots({ taskId: result.taskId }),
  }));

  const checks = {
    expiredLeaseCannotRunStagedCommit: expired.committed === false && expiredCommitCount === 0 && String(expired.error || "").includes("lease_lost_before_commit"),
    renewedLeaseAllowsStagedCommit: committed.committed === true && committed.value === "committed" && successfulCommitCount === 1,
    explicitLeaseRenewalExtendsOwnership: renewalHolder.acquired === true && renewed.renewed === true && renewed.lease.renewalCount === 1 && renewedInspection.active === true,
    snapshotCarriesExactGroupSessionBinding: binding.groupId === groupId && binding.groupSessionId === groupSessionId && binding.scopeId === scopeId && !!binding.sessionMemoryChecksum,
    inventoryDistinguishesUndeliveredSnapshot: beforeRow?.status === "warn" && beforeRow?.deliveryStatus === "missing" && beforeDelivery.summary.deliveryMissingCount === 1,
    runnerDeliveryReceiptIsStronglyBound: delivery.receipt.delivered === true && delivery.receipt.promptBindingMode === "exact" && delivery.receipt.groupSessionMemoryBinding.scopeId === scopeId,
    memoryCenterInventorySeesDelivery: afterRow?.status === "ok" && afterRow?.memoryContextDelivered === true && afterDelivery.summary.deliveredCount === 1 && afterDelivery.summary.deliveryMissingCount === 0,
    agentDeclarationAndSystemDeliveryBothPass: validConsumption.pass === true && validConsumption.system_delivery_passed === true && validConsumption.agent_declaration_passed === true,
    systemInjectedIdsAloneCannotProveConsumption: systemOnlyConsumption.pass === false && systemOnlyConsumption.system_delivery_passed === true && systemOnlyConsumption.agent_declaration_passed === false,
    wrongGroupSessionDeclarationFailsClosed: wrongSessionConsumption.pass === false,
    deliveryReceiptPersistsWithValidChecksum: fs.existsSync(delivery.receipt.receiptFile) && sessions.readTaskAgentMemoryContextDeliveryReceipt(delivery.receipt.receiptFile)?.checksumValid === true,
    concurrentProcessesPreserveEverySessionAndSnapshot: concurrentSessions.length === workerCount && concurrentSessions.every(item =>
      item.sessions.some(session => session.id === item.result.sessionId)
      && item.snapshots.some(snapshot => snapshot.snapshot_id === item.result.snapshotId)),
    noLegacyDefaultScopeCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, expired, committed, renewed, renewedInspection, binding, beforeRow, delivery: delivery.receipt, afterRow, validConsumption, systemOnlyConsumption, wrongSessionConsumption, concurrentSessions }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, delivery: delivery.receipt, inventory: afterDelivery.summary, concurrentWorkerCount: workerCount }, null, 2)}\n`);
} finally {
  try { sessions.purgeTaskAgentSessions(taskId); } catch {}
  for (const concurrentTaskId of concurrencyTaskIds) {
    try { sessions.purgeTaskAgentSessions(concurrentTaskId); } catch {}
  }
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId); } catch {}
}
