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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE357_STAGE_${stage}=`));
  if (!line) throw new Error(`phase357 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-provider-memory-ack-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE357_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const prepare = parseStage(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const restart = parseStage(second.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE357_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE357_HOME;
if (!tempRoot) throw new Error("PHASE357_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const envelopes = require(path.join(root, "ccm-package", "dist", "agents", "trusted-memory-prompt-envelope.js"));
const channels = require(path.join(root, "ccm-package", "dist", "agents", "provider-memory-channel.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const native = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase357-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function createBound(state, provider, suffix) {
  const taskId = `${state.taskBase}-${suffix}`;
  const groupSessionId = `${state.groupSessionBase}_${suffix}`;
  const opened = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: provider,
  });
  const context = {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: `${state.project}-${suffix}`,
    rendered_text: `[GROUP_SESSION_MEMORY phase357]\ngroup=${state.groupId}\nsession=${groupSessionId}\nprovider=${provider}\nrule=commit only after provider acknowledgement`,
    memory_policy: { use: "session", ignored: false },
    session_binding: { binding_id: `gmb_phase357_${suffix}`, task_id: taskId, task_agent_session_id: opened.id },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
  const envelope = envelopes.renderTrustedMemoryPromptEnvelope(context.rendered_text, context);
  const prompt = `phase357 work order ${suffix}\n${envelope}\nexecute now`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(opened.id, {
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: provider,
    turn: 1,
    executionId: taskId,
    workerContextPacket: { packet_id: `wcp_phase357_${suffix}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: context.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
    requireProviderMemoryChannelAcknowledgement: true,
  });
  return { opened, context, envelope, prompt, bound, taskId, groupSessionId, provider, suffix };
}

function launch(item, runnerRequestId, options = {}) {
  const proof = item.bound.snapshot.context.memory_prompt_injection_proof;
  const runtimeVersionSnapshot = {
    semanticVersion: item.provider === "codex" ? "0.115.0" : "2.1.0",
    versionText: item.provider === "codex" ? "codex-cli 0.115.0" : "2.1.0",
    executableIdentityChecksum: options.launchIdentity || `runtime-${item.provider}-phase357`,
    status: "ok",
  };
  const prepared = channels.prepareProviderMemoryChannel(item.provider, item.prompt, {
    required: true,
    envelopeChecksum: proof.trusted_envelope_checksum,
    sourceChecksum: proof.trusted_envelope_source_checksum,
    runtimeVersionSnapshot,
  });
  const systemFile = path.join(tempRoot, `${item.suffix}-system.txt`);
  const developerFile = path.join(tempRoot, `${item.suffix}-developer.txt`);
  if (prepared.systemPrompt) fs.writeFileSync(systemFile, prepared.systemPrompt, "utf8");
  if (prepared.developerPrompt) fs.writeFileSync(developerFile, prepared.developerPrompt, "utf8");
  const command = runtime.buildAgentCommand(item.provider, `${item.suffix}-prompt.txt`, {
    appendSystemPromptFile: prepared.systemPrompt ? systemFile : "",
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    persistSession: true,
    sessionId: options.requestedSessionId || "",
  });
  const evidence = channels.bindProviderMemoryChannelLaunch(prepared, {
    command,
    systemPromptFile: prepared.systemPrompt ? systemFile : "",
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    runnerRequestId,
    runtimeVersionSnapshot,
  });
  return { prepared, command, evidence, runtimeVersionSnapshot, systemFile, developerFile };
}

function acknowledge(item, launched, runnerRequestId, options = {}) {
  const sessionId = options.sessionId || `0190f5d0-1234-7000-8000-${String(item.suffix).padEnd(12, "0").slice(0, 12)}`;
  const contractRuntime = {
    ...launched.runtimeVersionSnapshot,
    executableIdentityChecksum: options.outputIdentity || launched.runtimeVersionSnapshot.executableIdentityChecksum,
  };
  const raw = options.rawOutput !== undefined
    ? options.rawOutput
    : item.provider === "codex"
      ? `${JSON.stringify({ type: "thread.started", thread_id: sessionId })}\n${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "phase357 done" } })}`
      : "phase357 Claude result";
  const outputContract = runtime.extractProviderOutputContractEvidence(item.provider, raw, { runtimeVersionSnapshot: contractRuntime });
  const continuation = native.buildNativeSessionContinuationEvidence({
    provider: item.provider,
    runnerRequestId,
    requestedNativeSessionId: options.requestedSessionId || "",
    returnedNativeSessionId: item.provider === "codex" ? outputContract.trustedSessionId || outputContract.sessionId : "",
    providerOutputContractEvidence: outputContract,
    providerRuntimeVersionSnapshot: contractRuntime,
    nativeResumeRequested: false,
    runnerSuccess: options.executionSucceeded !== false,
  });
  const evidence = channels.acknowledgeProviderMemoryChannelLaunch(launched.evidence, {
    executionSucceeded: options.executionSucceeded !== false,
    runnerStarted: options.runnerStarted !== false,
    exitCode: options.exitCode === undefined ? 0 : options.exitCode,
    providerOutputContractEvidence: outputContract,
    nativeContinuationEvidence: continuation,
    required: true,
  });
  return { evidence, outputContract, continuation, raw, sessionId };
}

function verify(item, runnerRequestId, acknowledged) {
  const proof = item.bound.snapshot.context.memory_prompt_injection_proof;
  return channels.verifyProviderMemoryChannelEvidence(acknowledged.evidence, {
    provider: item.provider,
    originalPrompt: item.prompt,
    envelopeChecksum: proof.trusted_envelope_checksum,
    sourceChecksum: proof.trusted_envelope_source_checksum,
    runnerRequestId,
    required: true,
    requireAcknowledgement: true,
    providerOutputContractEvidence: acknowledged.outputContract,
    nativeContinuationEvidence: acknowledged.continuation,
    executionSucceeded: true,
  });
}

function deliver(item, runnerRequestId, evidence, continuation) {
  return sessions.recordTaskAgentMemoryContextDelivery(item.opened.id, {
    snapshotId: item.bound.snapshot.snapshot_id,
    renderedPrompt: item.prompt,
    snapshotRenderedPrompt: item.prompt,
    executionId: item.taskId,
    runtime: item.provider,
    attempt: 1,
    runnerRequestId,
    dispatched: true,
    executionSucceeded: true,
    output: `phase357 ${item.suffix} completed`,
    runnerStarted: true,
    nativeContinuationEvidence: continuation,
    providerMemoryChannelEvidence: evidence,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase357-${nonce}`,
    groupSessionBase: `gcs_phase357_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskBase: `task-phase357-${nonce}`,
    project: "phase357-project",
  };

  const codex = createBound(state, "codex", "codex");
  const codexLaunch = launch(codex, "ar_phase357_codex");
  equal(codexLaunch.evidence.acknowledgement_status, "pending", "launch evidence must remain pending before Provider output");
  const codexAck = acknowledge(codex, codexLaunch, "ar_phase357_codex");
  equal(codexAck.evidence.acknowledgement_status, "acknowledged", "Codex thread.started must acknowledge the memory channel");
  equal(codexAck.evidence.acknowledgement_policy, "structured_thread_started", "Codex acknowledgement must expose its structured policy");
  equal(codexAck.evidence.provider_output_contract_event, "thread.started", "Codex acknowledgement must bind the start event");
  equal(codexAck.evidence.provider_output_session_id, codexAck.sessionId, "Codex acknowledgement must bind the native thread");
  equal(verify(codex, "ar_phase357_codex", codexAck).valid, true, "Codex acknowledged evidence must verify");
  const codexDelivery = deliver(codex, "ar_phase357_codex", codexAck.evidence, codexAck.continuation);
  equal(codexDelivery.receipt.delivered, true, "Codex acknowledged memory must commit");
  equal(codexDelivery.receipt.providerMemoryChannelAcknowledged, true, "Codex receipt must attest acknowledgement");
  equal(codexDelivery.syncCommit.status, "committed", "Codex acknowledged memory must become the baseline");

  const claude = createBound(state, "claudecode", "claude");
  const claudeLaunch = launch(claude, "ar_phase357_claude", { requestedSessionId: "11111111-1111-4111-8111-111111111357" });
  const claudeAck = acknowledge(claude, claudeLaunch, "ar_phase357_claude", { requestedSessionId: "11111111-1111-4111-8111-111111111357" });
  equal(claudeAck.evidence.acknowledgement_status, "acknowledged", "Claude successful CLI execution must acknowledge file acceptance");
  equal(claudeAck.evidence.acknowledgement_policy, "process_exit_success", "Claude acknowledgement must not overstate a structured role receipt");
  equal(verify(claude, "ar_phase357_claude", claudeAck).valid, true, "Claude exit-success acknowledgement must verify");
  const claudeDelivery = deliver(claude, "ar_phase357_claude", claudeAck.evidence, claudeAck.continuation);
  equal(claudeDelivery.receipt.delivered, true, "Claude acknowledged system memory must commit");

  const missing = createBound(state, "codex", "missing");
  const missingLaunch = launch(missing, "ar_phase357_missing");
  const missingDelivery = deliver(missing, "ar_phase357_missing", missingLaunch.evidence, null);
  equal(missingDelivery.receipt.delivered, false, "launch-only evidence must fail closed");
  equal(missingDelivery.receipt.providerMemoryChannelAcknowledgementStatus, "pending", "missing acknowledgement status must survive the receipt");
  equal(missingDelivery.syncCommit.status, "rejected", "launch-only memory must not become the baseline");

  const drift = createBound(state, "codex", "drift");
  const driftLaunch = launch(drift, "ar_phase357_drift");
  const driftAck = acknowledge(drift, driftLaunch, "ar_phase357_drift", { rawOutput: JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "no thread contract" } }) });
  equal(driftAck.evidence.acknowledgement_status, "unverified", "missing thread.started must not acknowledge Codex memory");
  ok(driftAck.evidence.issues.includes("provider_memory_channel_acknowledgement_output_contract_unrecognized"), "contract drift reason must be retained");
  const driftDelivery = deliver(drift, "ar_phase357_drift", driftAck.evidence, driftAck.continuation);
  equal(driftDelivery.receipt.delivered, false, "output-contract drift must fail closed");

  const runtimeMismatch = createBound(state, "codex", "runtime-mismatch");
  const runtimeMismatchLaunch = launch(runtimeMismatch, "ar_phase357_runtime");
  const runtimeMismatchAck = acknowledge(runtimeMismatch, runtimeMismatchLaunch, "ar_phase357_runtime", { outputIdentity: "different-runtime-identity" });
  equal(runtimeMismatchAck.evidence.acknowledgement_status, "unverified", "runtime identity mismatch must block acknowledgement");
  ok(runtimeMismatchAck.evidence.issues.includes("provider_memory_channel_acknowledgement_runtime_identity_mismatch"), "runtime mismatch reason must be retained");
  const runtimeMismatchDelivery = deliver(runtimeMismatch, "ar_phase357_runtime", runtimeMismatchAck.evidence, runtimeMismatchAck.continuation);
  equal(runtimeMismatchDelivery.receipt.delivered, false, "runtime-mismatched acknowledgement must fail closed");

  const spoolRequest = spool.createDirectAgentDispatchRequest({
    projectName: state.project,
    workDir: root,
    agentType: "codex",
    taskId: `${state.taskBase}-spool`,
    executionId: `${state.taskBase}-spool`,
    taskAgentSessionId: codex.opened.id,
    groupId: state.groupId,
    message: codex.prompt,
    trustedMemoryProviderChannelRequired: true,
    trustedMemoryProviderAcknowledgementRequired: true,
    trustedMemoryEnvelopeChecksum: codex.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    trustedMemoryEnvelopeSourceChecksum: codex.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
  });
  spool.markDirectAgentDispatchStarted(spoolRequest.id, { runnerPid: process.pid });
  const spoolLaunch = launch(codex, spoolRequest.id);
  const spoolAck = acknowledge(codex, spoolLaunch, spoolRequest.id);
  const spoolCompleted = spool.completeDirectAgentDispatch(spoolRequest.id, {
    success: true,
    output: "phase357 direct spool complete",
    nativeContinuationEvidence: spoolAck.continuation,
    providerMemoryChannelEvidence: spoolAck.evidence,
    exitCode: 0,
  });
  equal(spool.validateDirectAgentDispatchPair(spoolCompleted.request, spoolCompleted.result).valid, true, "direct spool must persist acknowledged channel evidence");

  state.snapshotIds = [codex, claude, missing, drift, runtimeMismatch].map(item => item.bound.snapshot.snapshot_id);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE357_STAGE_prepare=${JSON.stringify({ checks, structured: codexAck.evidence.acknowledgement_policy, exit: claudeAck.evidence.acknowledgement_policy })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.providerMemoryAcknowledgementRequiredCount, 5, "inventory must retain all acknowledgement requirements");
  equal(inventory.summary.providerMemoryAcknowledgedCount, 2, "inventory must count both acknowledged deliveries");
  equal(inventory.summary.providerMemoryAcknowledgementUnverifiedCount, 3, "inventory must count missing, drifted, and runtime-mismatched acknowledgements");
  equal(inventory.summary.providerMemoryStructuredAcknowledgedCount, 1, "inventory must count structured Provider acknowledgement separately");
  equal(inventory.summary.providerMemoryExitSuccessAcknowledgedCount, 1, "inventory must count exit-success acknowledgement separately");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.providerMemoryAcknowledgementRequiredCount, 5, "Memory Center must expose acknowledgement requirements");
  equal(report.overall.providerMemoryAcknowledgedCount, 2, "Memory Center must expose acknowledged channels");
  equal(report.overall.providerMemoryAcknowledgementUnverifiedCount, 3, "Memory Center must expose unverified acknowledgements");
  const restored = sessions.listTaskAgentMemoryContextSnapshots({ groupId: state.groupId });
  equal(restored.length, 5, "acknowledgement receipts must survive restart");
  ok(restored.some(item => item.delivery_receipt?.providerMemoryChannelAcknowledgementPolicy === "structured_thread_started"), "restored receipts must retain structured policy");
  ok(restored.some(item => item.delivery_receipt?.providerMemoryChannelAcknowledgementPolicy === "process_exit_success"), "restored receipts must retain exit-success policy");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, "backend", "agents", "runner.ts"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  ok((collaborationSource.match(/requireProviderMemoryChannelAcknowledgement: true/g) || []).length >= 3, "group, retry, and direct snapshot bindings must require acknowledgement");
  ok(routesSource.includes("requireProviderMemoryChannelAcknowledgement: true"), "auto-assign snapshot binding must require acknowledgement");
  ok(runnerSource.includes("acknowledgeProviderMemoryChannelLaunch"), "external runner must finalize acknowledgement after Provider output");
  ok(serverSource.includes("acknowledgeProviderMemoryChannelLaunch"), "direct runner must finalize acknowledgement after Provider output");
  console.log(`PHASE357_STAGE_restart=${JSON.stringify({ checks, acknowledged: report.overall.providerMemoryAcknowledgedCount, unverified: report.overall.providerMemoryAcknowledgementUnverifiedCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase357 mode: ${mode}`);
