import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE360_STAGE_${stage}=`));
  if (!line) throw new Error(`phase360 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-receipt-recovery-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE360_HOME: tempRoot };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE360_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE360_HOME;
if (!tempRoot) throw new Error("PHASE360_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const receipts = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const recovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const native = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const envelopes = require(path.join(root, "ccm-package", "dist", "agents", "trusted-memory-prompt-envelope.js"));
const handoff = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));
const channels = require(path.join(root, "ccm-package", "dist", "agents", "provider-memory-channel.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase360-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function createFixture(suffix, overrides = {}) {
  const groupId = overrides.groupId || "phase360-group-a";
  const groupSessionId = overrides.groupSessionId || "gcs_phase360_a";
  const taskId = `phase360-task-${suffix}`;
  const project = `phase360-project-${suffix}`;
  const opened = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "claudecode" });
  const challenge = receipts.createMemoryContextConsumptionChallenge({
    groupId,
    groupSessionId,
    taskId,
    executionId: taskId,
    project,
    taskAgentSessionId: opened.id,
    attempt: 1,
  });
  const baseContext = {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    rendered_text: `[GROUP_SESSION_MEMORY phase360]\ngroup=${groupId}\nsession=${groupSessionId}\nrule=receipt-only recovery must use this prior trusted turn`,
    memory_policy: { use: "session", ignored: false },
    session_binding: { binding_id: `gmb_phase360_${suffix}`, task_id: taskId, task_agent_session_id: opened.id },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
  const context = receipts.attachMemoryContextConsumptionChallenge(baseContext, challenge);
  const rendered = handoff.renderMemoryContextForWorker(context);
  const envelope = envelopes.renderTrustedMemoryPromptEnvelope(rendered, context);
  const prompt = `phase360 work order ${suffix}\n${envelope}\nexecute once`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(opened.id, {
    taskId,
    groupId,
    project,
    agentType: "claudecode",
    turn: 1,
    executionId: taskId,
    workerContextPacket: { packet_id: `wcp_phase360_${suffix}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: baseContext.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
    requireProviderMemoryChannelAcknowledgement: true,
    requireMemoryContextConsumptionReceipt: true,
    memoryContextConsumptionChallenge: challenge,
  });
  const runnerRequestId = `adr_phase360_${suffix.padEnd(12, "0").slice(0, 12)}`;
  const nativeSessionId = `11111111-1111-4111-8111-${suffix.padStart(12, "0").slice(-12)}`;
  const runtimeVersionSnapshot = { semanticVersion: "2.1.0", versionText: "2.1.0", executableIdentityChecksum: `runtime-phase360-${suffix}`, status: "ok" };
  const parentEvidence = native.buildNativeSessionContinuationEvidence({
    provider: "claudecode",
    runnerRequestId,
    requestedNativeSessionId: nativeSessionId,
    returnedNativeSessionId: "",
    providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
    nativeResumeRequested: false,
    runnerSuccess: true,
  });
  const prepared = channels.prepareProviderMemoryChannel("claudecode", prompt, {
    required: true,
    envelopeChecksum: bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    sourceChecksum: bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    runtimeVersionSnapshot,
  });
  const systemFile = path.join(tempRoot, `${suffix}-system.txt`);
  fs.writeFileSync(systemFile, prepared.systemPrompt, "utf8");
  const command = runtime.buildAgentCommand("claudecode", `${suffix}-prompt.txt`, { appendSystemPromptFile: systemFile, persistSession: true, sessionId: nativeSessionId });
  const launch = channels.bindProviderMemoryChannelLaunch(prepared, { command, systemPromptFile: systemFile, runnerRequestId, runtimeVersionSnapshot });
  const providerEvidence = channels.acknowledgeProviderMemoryChannelLaunch(launch, { executionSucceeded: true, runnerStarted: true, exitCode: 0, required: true });
  return { suffix, groupId, groupSessionId, taskId, project, opened, challenge, context, prompt, bound, runnerRequestId, nativeSessionId, runtimeVersionSnapshot, parentEvidence, providerEvidence };
}

function recordModelReceipt(item) {
  return receipts.recordMemoryContextConsumptionReceipt({
    taskId: item.taskId,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    project: item.project,
    role: "project-child-agent",
    agentType: "claudecode",
    taskAgentSessionId: item.opened.id,
    nativeSessionId: item.nativeSessionId,
    memoryReceiptChallenge: item.challenge,
    memoryReceiptFile: receipts.memoryContextConsumptionReceiptFile(item.challenge.challenge_id),
  }, { challenge_id: item.challenge.challenge_id });
}

async function recoverFixture(item, behavior = "success") {
  let calls = 0;
  let observedPrompt = "";
  const result = await recovery.recoverMemoryContextConsumptionReceipt({
    challenge: item.challenge,
    provider: "claudecode",
    runnerRequestId: item.runnerRequestId,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    taskId: item.taskId,
    executionId: item.taskId,
    project: item.project,
    taskAgentSessionId: item.opened.id,
    nativeContinuationEvidence: item.parentEvidence,
    providerRuntimeVersionSnapshot: item.runtimeVersionSnapshot,
    trustedMemoryEnvelopeChecksum: item.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    trustedMemoryEnvelopeSourceChecksum: item.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    providerWorkCompleted: true,
  }, async request => {
    calls += 1;
    observedPrompt = request.prompt;
    if (behavior === "throw") throw new Error("simulated recovery process failure");
    if (behavior === "success") recordModelReceipt(item);
    return { success: true, exitCode: 0, output: behavior === "success" ? "CCM_MEMORY_ACK_RECOVERED" : "CCM_MEMORY_ACK_CONTEXT_UNAVAILABLE", providerRuntimeVersionSnapshot: item.runtimeVersionSnapshot };
  });
  return { ...result, calls, observedPrompt };
}

if (mode === "prepare") {
  const successful = createFixture("success");
  equal(successful.parentEvidence.nativeSessionReusable, true, "parent native session must be reusable");
  const recovered = await recoverFixture(successful, "success");
  equal(recovered.calls, 1, "receipt recovery must execute exactly once");
  equal(recovered.recovered, true, "same-session receipt recovery should succeed");
  equal(recovered.record.status, "recovered", "recovery record should commit recovered state");
  equal(recovered.record.max_attempts, 1, "recovery policy must remain bounded to one attempt");
  equal(recovered.record.task_reexecution_allowed, false, "recovery must forbid task reexecution");
  equal(recovered.record.suppress_task_replay, false, "successful narrow recovery should allow normal completion");
  equal(recovered.observedPrompt.includes(successful.challenge.challenge_id), false, "recovery prompt must not repeat challenge id");
  ok(recovered.observedPrompt.includes("Do not repeat, redo, or modify the task"), "recovery prompt must forbid duplicate work");
  ok(recovered.observedPrompt.includes("immediately preceding native session turn"), "recovery must require prior-session context access");
  equal(recovery.verifyMemoryContextConsumptionRecovery(recovered.record, { challengeId: successful.challenge.challenge_id, runnerRequestId: successful.runnerRequestId }).valid, true, "signed recovery proof should verify");

  const delivery = sessions.recordTaskAgentMemoryContextDelivery(successful.opened.id, {
    snapshotId: successful.bound.snapshot.snapshot_id,
    renderedPrompt: successful.prompt,
    snapshotRenderedPrompt: successful.prompt,
    executionId: successful.taskId,
    runtime: "claudecode",
    attempt: 1,
    nativeSessionId: successful.nativeSessionId,
    runnerRequestId: successful.runnerRequestId,
    dispatched: true,
    executionSucceeded: true,
    output: "provider completed useful work before narrow acknowledgement recovery",
    nativeContinuationEvidence: successful.parentEvidence,
    providerMemoryChannelEvidence: successful.providerEvidence,
    memoryContextConsumptionReceipt: recovered.receipt,
    memoryContextConsumptionRecovery: recovered.record,
    runnerStarted: true,
  });
  equal(delivery.receipt.delivered, true, "delivery should commit after verified recovery");
  equal(delivery.receipt.memoryContextConsumptionRecoveryValid, true, "delivery should reverify recovery proof");
  equal(delivery.receipt.memoryContextConsumptionRecoveryStatus, "recovered", "delivery should persist recovered status");

  let duplicateCalls = 0;
  const notNeeded = await recovery.recoverMemoryContextConsumptionReceipt({
    challenge: successful.challenge,
    provider: "claudecode",
    runnerRequestId: successful.runnerRequestId,
    groupId: successful.groupId,
    groupSessionId: successful.groupSessionId,
    taskId: successful.taskId,
    executionId: successful.taskId,
    project: successful.project,
    taskAgentSessionId: successful.opened.id,
    nativeContinuationEvidence: successful.parentEvidence,
  }, async () => { duplicateCalls += 1; return {}; });
  equal(duplicateCalls, 0, "existing valid receipt must not launch recovery again");
  equal(notNeeded.record.status, "recovered", "idempotent recovery should preserve the original recovered audit state");

  const unavailable = createFixture("unavailable");
  unavailable.parentEvidence = null;
  const unavailableResult = await recoverFixture(unavailable, "success");
  equal(unavailableResult.calls, 0, "missing trusted native session must block before launch");
  equal(unavailableResult.recovered, false, "missing native session must fail closed");
  equal(unavailableResult.record.suppress_task_replay, true, "blocked recovery must suppress full task replay");
  ok(unavailableResult.record.issues.includes("trusted_native_session_unavailable"), "blocked proof should explain missing native session");

  const noReceipt = createFixture("no-receipt");
  const noReceiptResult = await recoverFixture(noReceipt, "no-receipt");
  equal(noReceiptResult.calls, 1, "model omission recovery must remain one-shot");
  equal(noReceiptResult.recovered, false, "second omission must remain blocked");
  equal(noReceiptResult.record.status, "blocked", "second omission should persist blocked state");
  equal(noReceiptResult.record.suppress_task_replay, true, "second omission must not trigger whole task replay");

  const tampered = createFixture("tampered");
  recordModelReceipt(tampered);
  const tamperedFile = receipts.memoryContextConsumptionReceiptFile(tampered.challenge.challenge_id);
  const tamperedPayload = JSON.parse(fs.readFileSync(tamperedFile, "utf8"));
  tamperedPayload.project = "forged-project";
  fs.writeFileSync(tamperedFile, `${JSON.stringify(tamperedPayload, null, 2)}\n`, "utf8");
  const tamperedResult = await recoverFixture(tampered, "success");
  equal(tamperedResult.calls, 0, "tampered receipt must not be overwritten by recovery");
  ok(tamperedResult.record.issues.includes("receipt_failure_not_recoverable"), "tamper should be classified non-recoverable");

  const sibling = createFixture("sibling", { groupId: "phase360-group-b", groupSessionId: "gcs_phase360_b" });
  const siblingResult = await recoverFixture(sibling, "no-receipt");
  equal(siblingResult.record.group_id, "phase360-group-b", "recovery proof must bind sibling group exactly");
  const groupAInventory = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: "phase360-group-a" });
  ok(groupAInventory.rows.every(row => row.groupId === "phase360-group-a"), "group recovery inventory must not expose sibling rows");
  equal(groupAInventory.rows.some(row => row.groupId === "phase360-group-b"), false, "sibling recovery must remain isolated");

  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase360-group-a" });
  ok(report.overall.modelMemoryReceiptRecoveryCount >= 3, "Memory Center should expose scoped recovery attempts");
  ok(report.overall.modelMemoryReceiptRecoveryBlockedCount >= 2, "Memory Center should expose blocked recoveries");
  ok(report.overall.modelMemoryReceiptReplaySuppressedCount >= 2, "Memory Center should expose replay suppression");

  const runnerSource = fs.readFileSync(path.join(root, "backend", "agents", "runner.ts"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  ok(runnerSource.includes("recoverMemoryContextConsumptionReceipt"), "external runner must invoke narrow recovery");
  ok(serverSource.includes("memory-receipt-recovery") && serverSource.includes("resumeSession: true"), "direct runner must resume the same native session");
  ok(collaborationSource.includes("suppress_task_replay") && collaborationSource.includes("禁止自动整任务重放"), "group dispatcher must suppress unsafe full replay");

  fs.writeFileSync(stateFile, `${JSON.stringify({ successful: { groupId: successful.groupId, challengeId: successful.challenge.challenge_id, recoveryId: recovered.record.recovery_id, sessionId: successful.opened.id } }, null, 2)}\n`, "utf8");
  console.log(`PHASE360_STAGE_prepare=${JSON.stringify({ checks, recovered: recovered.record.recovery_id })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = recovery.buildMemoryContextConsumptionRecoveryInventory();
  ok(inventory.summary.count >= 5, "restart should recover persisted recovery ledger");
  ok(inventory.summary.blockedCount >= 3, "restart should preserve blocked outcomes");
  ok(inventory.summary.replaySuppressedCount >= 3, "restart should preserve replay suppression decisions");
  const successfulRow = inventory.rows.find(row => row.challengeId === state.successful.challengeId);
  ok(successfulRow, "restart inventory should contain successful challenge");
  equal(successfulRow.valid, true, "persisted successful recovery proof should verify after restart");
  equal(successfulRow.status, "recovered", "restart should preserve the original recovery outcome");
  const deliveryInventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.successful.groupId });
  equal(deliveryInventory.summary.memoryContextConsumptionRecoveredCount, 1, "snapshot inventory should recover delivery-bound recovery proof");
  equal(deliveryInventory.summary.memoryContextConsumptionRecoveryInvalidCount, 0, "delivery-bound recovery proof should remain valid");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.successful.groupId });
  ok(report.modelMemoryReceiptRecovery.rows.every(row => row.groupId === state.successful.groupId), "restart Memory Center report must preserve group isolation");
  console.log(`PHASE360_STAGE_restart=${JSON.stringify({ checks, summary: inventory.summary })}`);
  process.exit(0);
}

throw new Error(`unknown phase360 mode: ${mode}`);
