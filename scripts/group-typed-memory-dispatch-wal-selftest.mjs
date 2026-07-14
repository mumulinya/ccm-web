import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const wal = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "typed-memory-dispatch-wal.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const maintenance = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-maintenance.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const prefix = `phase249-dispatch-wal-${nonce}`;
const project = "phase249-project";
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function throws(fn, pattern, message) {
  checks += 1;
  assert.throws(fn, pattern, message);
}

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (!child.name.startsWith(prefix)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function hash(value, length = 64) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}

function makeArtifacts(label, admittedAt = new Date().toISOString()) {
  const groupId = `${prefix}-${label}`;
  const groupSessionId = `gcs_${label}_${nonce}`;
  const taskId = `${prefix}-task-${label}`;
  const taskAgentSessionId = `tas_phase249_${label}_${nonce}`;
  const compactEpoch = "precompact";
  const scope = `child-agent:${project}:${taskAgentSessionId}:${compactEpoch}`;
  const content = `phase249 ${label} durable memory `.repeat(120);
  const docs = [{
    relPath: `project/${label}.md`,
    checksum: hash(content, 32),
    type: "project",
    name: label,
    description: content.slice(0, 100),
    snippet: content,
    score: 10,
  }];
  const recall = { schema: "ccm-group-typed-memory-recall-v1", version: 1, recalled: docs, surfaced: docs.map(doc => doc.relPath) };
  const capsule = memory.buildChildTypedMemoryDeliveryCapsule({
    groupId,
    groupSessionId,
    targetProject: project,
    taskId,
    taskAgentSessionId,
    ledgerScope: { scope, compactEpoch, taskId, taskAgentSessionId },
    recall,
  }, { modelContextWindow: 200_000 });
  const lease = kernel.buildWorkerTypedMemoryDeliveryLease(capsule, { query: label, attemptSequence: 1, generatedAt: admittedAt });
  const bundle = {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    session_binding: { task_id: taskId, task_agent_session_id: taskAgentSessionId },
    typed_memory_recall: recall,
    typed_memory_delivery_capsule: capsule,
    typed_memory_delivery_lease: lease,
    group_state: { typedMemory: { recall, deliveryCapsule: capsule, deliveryLease: lease, ledger: { scope, compactEpoch, taskId, taskAgentSessionId } } },
  };
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, members: [{ project }] },
    project,
    task: label,
    taskId,
    groupSessionId,
    taskAgentSessionId,
    memory: bundle,
  });
  const prompt = `phase249 worker prompt capsule=${capsule.capsule_checksum}`;
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt: prompt,
    attemptSequence: 1,
    admittedAt,
    dispatchWindowMs: 30_000,
    skipGroupSessionPresenceCheck: true,
  });
  return { groupId, groupSessionId, taskId, taskAgentSessionId, scope, capsule, lease, bundle, packet, prompt, admission };
}

function createWal(artifact) {
  return memory.createChildTypedMemoryDispatchWal(artifact.admission, {
    memoryBundle: artifact.bundle,
    workerContextPacket: artifact.packet,
    renderedPrompt: artifact.prompt,
    snapshotRenderedPrompt: artifact.prompt,
    executionId: artifact.taskId,
  });
}

function deliveryReceipt(artifact) {
  const payload = {
    schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
    version: 2,
    receiptId: `tamdr_${labelSafe(artifact.taskId)}`,
    delivered: true,
    taskAgentSessionId: artifact.taskAgentSessionId,
    workerContextPacketId: artifact.packet.packet_id,
    executionSucceeded: true,
  };
  return { ...payload, checksum: hash(payload) };
}

function labelSafe(value) {
  return hash(String(value), 20);
}

try {
  cleanupRuntimeResidue();

  const base = makeArtifacts("base");
  equal(base.admission.admitted, true, "fixture admission must pass");
  const created = createWal(base);
  equal(created.required, true, "typed memory dispatch must require durable WAL");
  equal(created.record.state, "admitted", "new WAL must start admitted");
  equal(created.record.schema, "ccm-child-typed-memory-dispatch-wal-v1", "WAL schema must be explicit");
  equal(created.record.group_session_id, base.groupSessionId, "WAL must bind gcs session");
  equal(created.record.task_agent_session_id, base.taskAgentSessionId, "WAL must bind tas session");
  equal(created.record.prompt_checksum, base.admission.ticket.prompt_checksum, "WAL must bind exact runner prompt");
  equal(wal.verifyTypedMemoryDispatchWal(created.record).valid, true, "persisted WAL checksum and identities must validate");
  ok(fs.existsSync(created.record.file), "WAL must be persisted before dispatch");
  const replay = createWal(base);
  equal(replay.idempotent, true, "same ticket WAL creation must be idempotent");
  equal(replay.record.revision, created.record.revision, "idempotent create must not advance revision");

  const started = memory.markChildTypedMemoryDispatchStarted(created, { dispatchStartedAt: base.admission.ticket.admitted_at, transport: "codex" });
  equal(started.state, "dispatch_started", "dispatch start must be durable");
  equal(started.revision, created.record.revision + 1, "state transition must advance CAS revision");
  throws(() => wal.transitionTypedMemoryDispatchWal(created.record, "cancelled"), /CAS revision mismatch/, "stale process revision must not overwrite current WAL");
  const returned = memory.markChildTypedMemoryRunnerReturned(started, { runnerSucceeded: true, output: "done" });
  equal(returned.state, "runner_returned", "runner return must be durable before ledger commit");
  const fakeCommit = memory.markChildTypedMemoryDispatchCommitted(returned, { committed: true, lease: { leaseId: base.lease.lease_id }, ledger_file: "phase249-ledger.json" });
  equal(fakeCommit.state, "committed", "successful ledger commit must seal WAL terminal state");
  equal(fakeCommit.recovery_payload, null, "committed WAL must release large recovery payload");

  const recoverable = makeArtifacts("recoverable");
  const recoverableWal = createWal(recoverable);
  let recoverableRecord = memory.markChildTypedMemoryDispatchStarted(recoverableWal, { dispatchStartedAt: recoverable.admission.ticket.admitted_at, transport: "cursor" });
  const receipt = deliveryReceipt(recoverable);
  recoverableRecord = memory.markChildTypedMemoryRunnerReturned(recoverableRecord, { runnerSucceeded: true, output: "recovered", deliveryReceipt: receipt });
  equal(recoverableRecord.state, "runner_returned", "crash fixture must stop after durable runner return");
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${recoverable.groupId}--${recoverable.groupSessionId}`, recoverable.scope).deliveryCount, 0, "crash fixture must not pre-consume surfaced ledger");
  const recovered = memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [recoverableRecord.ticket_id] });
  ok(recovered.rows.some(row => row.ticket_id === recoverableRecord.ticket_id && row.action === "recovered_commit"), "startup recovery must commit strong runner receipt evidence");
  equal(wal.readTypedMemoryDispatchWal(recoverableRecord.file).state, "committed", "recovered WAL must become committed");
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${recoverable.groupId}--${recoverable.groupSessionId}`, recoverable.scope).deliveryCount, 1, "recovery must consume surfaced ledger exactly once");
  memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [recoverableRecord.ticket_id] });
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${recoverable.groupId}--${recoverable.groupSessionId}`, recoverable.scope).deliveryCount, 1, "repeated startup recovery must be idempotent");

  const uncertain = makeArtifacts("uncertain");
  const uncertainWal = createWal(uncertain);
  const uncertainStarted = memory.markChildTypedMemoryDispatchStarted(uncertainWal, { dispatchStartedAt: uncertain.admission.ticket.admitted_at, transport: "claudecode" });
  const uncertainRecovery = memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [uncertainStarted.ticket_id] });
  ok(uncertainRecovery.rows.some(row => row.ticket_id === uncertainStarted.ticket_id && row.action === "marked_uncertain"), "dispatch start without durable return evidence must never guess commit");
  equal(wal.readTypedMemoryDispatchWal(uncertainStarted.file).state, "uncertain_after_crash", "uncertain crash must be terminal and auditable");

  const oldAt = "2026-07-14T00:00:00.000Z";
  const expired = makeArtifacts("expired", oldAt);
  const expiredWal = createWal(expired);
  const expiryRecovery = memory.recoverChildTypedMemoryDispatchWal({ now: "2026-07-14T00:01:00.000Z", ticketIds: [expiredWal.record.ticket_id] });
  ok(expiryRecovery.rows.some(row => row.ticket_id === expiredWal.record.ticket_id && row.action === "expired"), "admitted ticket beyond dispatch window must expire on startup");
  equal(wal.readTypedMemoryDispatchWal(expiredWal.record.file).state, "expired", "expired admission must be terminal");

  const legacyArtifact = makeArtifacts("legacy");
  legacyArtifact.lease = { ...legacyArtifact.lease, group_session_id: "default" };
  throws(() => wal.createTypedMemoryDispatchWal({
    memoryBundle: { ...legacyArtifact.bundle, group_session_id: "default" },
    workerContextPacket: legacyArtifact.packet,
    renderedPrompt: legacyArtifact.prompt,
    dispatchTicket: legacyArtifact.admission.ticket,
    deliveryLease: legacyArtifact.lease,
    deliveryCapsule: legacyArtifact.capsule,
  }), /requires groupId--gcs_/, "legacy default session must never enter the durable dispatch WAL");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  for (const marker of ["typedMemoryDispatchWal", "directTypedMemoryDispatchWal", "autoAssignTypedMemoryDispatchWal"]) {
    const createIndex = collaborationSource.indexOf(`const ${marker} = createChildTypedMemoryDispatchWal`);
    const startIndex = collaborationSource.indexOf("markChildTypedMemoryDispatchStarted", createIndex);
    const callIndex = collaborationSource.indexOf("await ctx.callAgent", startIndex);
    ok(createIndex >= 0 && createIndex < startIndex && startIndex < callIndex, `${marker} must persist dispatch_started before runner call`);
  }
  ok(collaborationSource.includes("onRunnerRequestCreated"), "all real paths must receive external runner request identity");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  ok(serverSource.indexOf("recoverChildTypedMemoryDispatchWal()") < serverSource.indexOf("resumeTaskQueues(startupCollabCtx)"), "WAL recovery must run before task queue resume");
  const maintenanceSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-session-maintenance.ts"), "utf8");
  ok(maintenanceSource.includes("purgeLegacyDefaultGroupSessions()"), "startup maintenance must purge legacy default sessions");
  ok(maintenanceSource.includes("delete_legacy_default_without_migration"), "legacy purge policy must explicitly forbid migration");
  const purgedGroups = [];
  const deletedArtifacts = [];
  const legacyPurge = maintenance.purgeLegacyDefaultGroupSessions({
    groups: [{ id: `${prefix}-legacy-a` }, { id: `${prefix}-legacy-b` }],
    skipJournal: true,
    purgeFn: (groupId, options) => { purgedGroups.push({ groupId, force: options.force }); return { purged: true }; },
    artifactDeleteFn: (groupId, sessionId) => { deletedArtifacts.push({ groupId, sessionId }); return { deletedFiles: 2 }; },
  });
  equal(legacyPurge.purgedCount, 2, "fleet legacy purge must cover every group");
  equal(legacyPurge.migrationPerformed, false, "legacy purge must never migrate old conversation content");
  ok(purgedGroups.every(row => row.force === true), "legacy purge must ignore stale unfinished tasks by explicit force policy");
  ok(deletedArtifacts.every(row => row.sessionId === "default"), "legacy purge must delete default memory sidecars only");

  console.log(JSON.stringify({
    pass: true,
    checks,
    schema: created.record.schema,
    recoveredCommit: true,
    uncertainFailClosed: true,
    expiredAdmissionCleaned: true,
    legacyMigrationPerformed: false,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
