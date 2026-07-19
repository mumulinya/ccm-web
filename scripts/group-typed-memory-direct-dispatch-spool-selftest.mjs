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
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const wal = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "typed-memory-dispatch-wal.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const prefix = `phase250-direct-spool-${nonce}`;
const trackedFiles = new Set();
const trackedTaskIds = new Set();
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function hash(value, length = 32) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function cleanupRuntimeResidue() {
  for (const file of trackedFiles) {
    try { fs.unlinkSync(file); } catch {}
  }
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

function buildFixture(label = "main") {
  const groupId = `${prefix}-${label}-group`;
  const groupSessionId = `gcs_phase250_${label}_${nonce}`;
  const taskId = `${prefix}-${label}-task`;
  trackedTaskIds.add(taskId);
  const project = "phase250-project";
  const session = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "codex" });
  const taskAgentSessionId = session.id;
  const scope = `child-agent:${project}:${taskAgentSessionId}:precompact`;
  const content = "phase250 durable direct CLI memory ".repeat(140);
  const doc = {
    relPath: "project/direct-spool.md",
    checksum: hash(content),
    type: "project",
    name: "direct spool",
    description: content.slice(0, 100),
    snippet: content,
    score: 10,
  };
  const recall = { schema: "ccm-group-typed-memory-recall-v1", version: 1, recalled: [doc], surfaced: [doc.relPath] };
  const capsule = memory.buildChildTypedMemoryDeliveryCapsule({
    groupId,
    groupSessionId,
    targetProject: project,
    taskId,
    taskAgentSessionId,
    ledgerScope: { scope, compactEpoch: "precompact", taskId, taskAgentSessionId },
    recall,
  }, { modelContextWindow: 200_000 });
  const lease = kernel.buildWorkerTypedMemoryDeliveryLease(capsule, { query: "phase250 direct", attemptSequence: 1 });
  const bundle = {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    session_binding: { task_id: taskId, task_agent_session_id: taskAgentSessionId },
    typed_memory_recall: recall,
    typed_memory_delivery_capsule: capsule,
    typed_memory_delivery_lease: lease,
    group_state: { typedMemory: { recall, deliveryCapsule: capsule, deliveryLease: lease, ledger: { scope, compactEpoch: "precompact", taskId, taskAgentSessionId } } },
  };
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, members: [{ project }] },
    project,
    task: "phase250 direct",
    taskId,
    groupSessionId,
    taskAgentSessionId,
    memory: bundle,
  });
  const prompt = `phase250 direct prompt capsule=${capsule.capsule_checksum}`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskAgentSessionId, {
    taskId,
    groupId,
    project,
    agentType: "codex",
    turn: 1,
    executionId: taskId,
    workerContextPacket: packet,
    memoryContext: bundle,
    renderedPrompt: prompt,
  });
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt: prompt,
    attemptSequence: 1,
    skipGroupSessionPresenceCheck: true,
  });
  return { groupId, groupSessionId, taskId, project, taskAgentSessionId, scope, bundle, packet, prompt, capsule, lease, bound, admission };
}

try {
  cleanupRuntimeResidue();
  const fixture = buildFixture();
  equal(fixture.admission.admitted, true, "typed memory fixture must be admitted");
  ok(fixture.taskAgentSessionId.startsWith("tas_"), "fixture must use a real task-agent session");
  ok(fixture.bound?.snapshot?.snapshot_id, "direct path must persist a real prompt-bound memory snapshot");

  const dispatchWal = memory.createChildTypedMemoryDispatchWal(fixture.admission, {
    memoryBundle: fixture.bundle,
    workerContextPacket: fixture.packet,
    renderedPrompt: fixture.prompt,
    snapshotRenderedPrompt: fixture.prompt,
    executionId: fixture.taskId,
  });
  let walRecord = memory.markChildTypedMemoryDispatchStarted(dispatchWal, {
    dispatchStartedAt: fixture.admission.ticket.admitted_at,
    transport: "codex",
  });
  equal(walRecord.state, "dispatch_started", "WAL must be durable before direct CLI starts");

  const direct = spool.createDirectAgentDispatchRequest({
    projectName: fixture.project,
    message: fixture.prompt,
    workDir: root,
    agentType: "codex",
    timeoutMs: 300_000,
    taskId: fixture.taskId,
    executionId: fixture.taskId,
    taskAgentSessionId: fixture.taskAgentSessionId,
    groupId: fixture.groupId,
  });
  trackedFiles.add(direct.requestFile);
  trackedFiles.add(direct.resultFile);
  trackedFiles.add(path.join(runtimeRoot, "agent-runner", "transcripts", `${direct.id}.jsonl`));
  equal(direct.request.schema, "ccm-direct-agent-dispatch-request-v1", "direct request schema must be explicit");
  equal(direct.request.status, "prepared", "request must persist before process spawn");
  equal(direct.request.prompt_checksum, fixture.admission.ticket.prompt_checksum, "spool prompt must match consume ticket prompt");
  equal(direct.request.checksum_valid, true, "prepared request checksum must validate");

  const startedRequest = spool.markDirectAgentDispatchStarted(direct.id, { runnerPid: process.pid, startedAt: fixture.admission.ticket.admitted_at });
  equal(startedRequest.status, "running", "OS spawn witness must advance request to running");
  ok(startedRequest.runner_pid > 0, "running request must persist runner PID");
  walRecord = memory.markChildTypedMemoryDispatchStarted({ required: true, record: walRecord }, {
    dispatchStartedAt: fixture.admission.ticket.admitted_at,
    transport: "server_direct_cli",
    runnerRequestId: direct.id,
  });
  equal(walRecord.runner_request_id, direct.id, "memory WAL must bind direct spool request ID");

  const completed = spool.completeDirectAgentDispatch(direct.id, {
    success: true,
    output: "phase250 direct result",
    nativeSessionId: "native-phase250",
    exitCode: 0,
  });
  equal(completed.request.status, "done", "direct request must become terminal before delivery receipt callback");
  equal(completed.result.schema, "ccm-direct-agent-dispatch-result-v1", "direct result schema must be explicit");
  equal(spool.validateDirectAgentDispatchPair(completed.request, completed.result).valid, true, "request/result checksums and identities must validate");
  const tamperedResult = { ...completed.result, output: "tampered" };
  equal(spool.validateDirectAgentDispatchPair(completed.request, tamperedResult).valid, false, "tampered direct result must fail closed");
  ok(spool.validateDirectAgentDispatchPair(completed.request, tamperedResult).issues.includes("result_checksum_invalid"), "tamper diagnostics must identify result checksum");

  equal(typed.getGroupTypedMemoryRecallScopeStats(`${fixture.groupId}--${fixture.groupSessionId}`, fixture.scope).deliveryCount, 0, "runner result must not pre-consume surfaced ledger");
  const recovered = memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [walRecord.ticket_id] });
  ok(recovered.rows.some(row => row.ticket_id === walRecord.ticket_id && row.action === "recovered_commit"), "startup recovery must rebuild receipt from direct request/result pair");
  equal(wal.readTypedMemoryDispatchWal(walRecord.file).state, "committed", "recovered direct WAL must be committed");
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${fixture.groupId}--${fixture.groupSessionId}`, fixture.scope).deliveryCount, 1, "direct recovery must consume surfaced ledger exactly once");
  const sessionRows = sessions.listTaskAgentSessions({ taskId: fixture.taskId });
  const recoveredSession = sessionRows.find(row => row.id === fixture.taskAgentSessionId);
  equal(recoveredSession.memoryContextDeliveryStatus, "delivered", "recovery must persist task-agent delivery receipt");
  const receipt = sessions.readTaskAgentMemoryContextDeliveryReceipt(recoveredSession.memoryContextDeliveryReceiptPath);
  equal(receipt.checksumValid, true, "reconstructed delivery receipt checksum must validate");
  equal(receipt.runnerRequestId, direct.id, "reconstructed receipt must retain direct request ID");
  memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [walRecord.ticket_id] });
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${fixture.groupId}--${fixture.groupSessionId}`, fixture.scope).deliveryCount, 1, "repeated recovery must remain idempotent");

  const notStarted = buildFixture("not-started");
  const notStartedWal = memory.createChildTypedMemoryDispatchWal(notStarted.admission, {
    memoryBundle: notStarted.bundle,
    workerContextPacket: notStarted.packet,
    renderedPrompt: notStarted.prompt,
    snapshotRenderedPrompt: notStarted.prompt,
    executionId: notStarted.taskId,
  });
  let notStartedRecord = memory.markChildTypedMemoryDispatchStarted(notStartedWal, {
    dispatchStartedAt: notStarted.admission.ticket.admitted_at,
    transport: "codex",
  });
  const preparedOnly = spool.createDirectAgentDispatchRequest({
    projectName: notStarted.project,
    message: notStarted.prompt,
    workDir: root,
    agentType: "codex",
    taskId: notStarted.taskId,
    executionId: notStarted.taskId,
    taskAgentSessionId: notStarted.taskAgentSessionId,
    groupId: notStarted.groupId,
  });
  trackedFiles.add(preparedOnly.requestFile);
  trackedFiles.add(preparedOnly.resultFile);
  trackedFiles.add(path.join(runtimeRoot, "agent-runner", "transcripts", `${preparedOnly.id}.jsonl`));
  const preSpawnFailure = spool.completeDirectAgentDispatch(preparedOnly.id, { success: false, error: "cancelled before OS spawn" });
  equal(spool.validateDirectAgentDispatchPair(preSpawnFailure.request, preSpawnFailure.result).valid, false, "prepared-only request must not prove memory delivery");
  ok(spool.validateDirectAgentDispatchPair(preSpawnFailure.request, preSpawnFailure.result).issues.includes("dispatch_start_missing"), "pre-spawn failure must expose missing start witness");
  notStartedRecord = memory.markChildTypedMemoryDispatchStarted({ required: true, record: notStartedRecord }, {
    dispatchStartedAt: notStarted.admission.ticket.admitted_at,
    transport: "server_direct_cli",
    runnerRequestId: preparedOnly.id,
  });
  const notStartedRecovery = memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [notStartedRecord.ticket_id] });
  ok(notStartedRecovery.rows.some(row => row.ticket_id === notStartedRecord.ticket_id && row.action === "marked_uncertain"), "startup recovery must not commit a request that never reached OS spawn");
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${notStarted.groupId}--${notStarted.groupSessionId}`, notStarted.scope).deliveryCount, 0, "pre-spawn failure must consume zero surfaced budget");

  const serverSource = fs.readFileSync(path.join(root, "backend", "server-agent-runner.ts"), "utf8");
  const directCreate = serverSource.indexOf("const durableDirectDispatch =");
  const directRun = serverSource.indexOf("await runManagedCommand", directCreate);
  const directComplete = serverSource.indexOf("completeDirectAgentDispatch(durableDirectDispatch.id", directRun);
  const directDone = serverSource.indexOf("workspaceTarget?.onDone?.", directComplete);
  ok(directCreate >= 0 && directCreate < directRun && directRun < directComplete && directComplete < directDone, "non-stream direct path must persist request, run, persist result, then callback");
  const groupCreate = serverSource.indexOf("const durableGroupDispatch =");
  const groupSpawn = serverSource.indexOf("child = spawn", groupCreate);
  const groupComplete = serverSource.indexOf("completeDirectAgentDispatch(durableGroupDispatch.id", groupSpawn);
  const groupDone = serverSource.indexOf("options.onDone", groupComplete);
  ok(groupCreate >= 0 && groupCreate < groupSpawn && groupSpawn < groupComplete && groupComplete < groupDone, "stream path must persist request and result around the real child process");
  ok(serverSource.includes('child.once("spawn"'), "stream direct spool must use OS spawn event as start witness");
  ok(serverSource.includes('writeSse(streamRes, { type: "chunk"'), "durable spool must preserve live SSE chunks");
  ok(serverSource.includes("callAgentViaExternalRunner"), "external runner fallback must remain available");
  const kernelSource = fs.readFileSync(path.join(root, "backend", "agents", "execution-kernel.ts"), "utf8");
  ok(kernelSource.includes('child.once("spawn", () => input.onStarted?.'), "managed direct CLI must expose actual OS spawn witness");
  const collaborationSource = [
    "collaboration-cross-agents-part-02-part-02.ts",
    "collaboration-task-executor.ts",
  ].map(file => fs.readFileSync(path.join(root, "backend", "modules", "collaboration", file), "utf8")).join("\n");
  equal((collaborationSource.match(/durableDispatch: \w*typedMemoryDispatchAdmission\.required === true/gi) || []).length, 3, "all three typed-memory child paths must enable direct durable spool");
  const globalSource = [
    fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf8"),
    fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8"),
  ].join("\n");
  equal(globalSource.includes("durableDispatch"), false, "Global Agent must remain outside group typed-memory spool");
  const pruned = spool.pruneDirectAgentDispatchSpool({ now: new Date(Date.now() + 2 * 86_400_000).toISOString(), retentionMs: 86_400_000 });
  ok(pruned.deleted_count >= 2, "terminal direct request/result pairs must have bounded retention");
  equal(fs.existsSync(direct.requestFile), false, "retention must delete the terminal direct request");
  equal(fs.existsSync(direct.resultFile), false, "retention must delete the terminal direct result");

  console.log(JSON.stringify({
    pass: true,
    checks,
    requestSchema: completed.request.schema,
    resultSchema: completed.result.schema,
    directRecoveryCommitted: true,
    deliveryCount: 1,
    liveStreamPreserved: true,
    globalBoundaryPreserved: true,
    boundedRetention: true,
  }, null, 2));
} finally {
  for (const taskId of trackedTaskIds) {
    try { sessions.purgeTaskAgentSessions(taskId); } catch {}
  }
  cleanupRuntimeResidue();
}
