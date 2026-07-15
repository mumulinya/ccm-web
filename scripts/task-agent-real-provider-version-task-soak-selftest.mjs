import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-real-provider-task-soak-"));
const ccmDir = path.join(tempRoot, ".cc-connect");
const projectDir = path.join(tempRoot, "phase261-project");
const fixtureDir = path.join(tempRoot, "provider-fixture");
const providerScript = path.join(fixtureDir, "cursor-provider.mjs");
const providerCommand = path.join(fixtureDir, "cursor-agent.cmd");
const providerStateFile = path.join(fixtureDir, "state.json");
const artifactFile = path.join(projectDir, "src", "provider-evolution.js");
const runnerFile = path.join(root, "ccm-package", "dist", "agents", "runner.js");

fs.mkdirSync(path.dirname(artifactFile), { recursive: true });
fs.mkdirSync(fixtureDir, { recursive: true });
execFileSync("git", ["init", "--quiet"], { cwd: projectDir, windowsHide: true });
execFileSync("git", ["config", "user.email", "phase261@ccm.local"], { cwd: projectDir, windowsHide: true });
execFileSync("git", ["config", "user.name", "CCM Phase 261"], { cwd: projectDir, windowsHide: true });
fs.writeFileSync(artifactFile, "export const phase261History = [];\n", "utf-8");
execFileSync("git", ["add", "src/provider-evolution.js"], { cwd: projectDir, windowsHide: true });
execFileSync("git", ["commit", "--quiet", "-m", "phase261 baseline"], { cwd: projectDir, windowsHide: true });

fs.writeFileSync(providerScript, String.raw`import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const stateFile = process.env.CCM_PHASE261_PROVIDER_STATE;
const artifactFile = process.env.CCM_PHASE261_ARTIFACT;
const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));

if (args.includes("--version")) {
  process.stdout.write("cursor-agent " + state.version + "\n");
  process.exit(0);
}

const prompt = args.join(" ");
const marker = name => prompt.match(new RegExp(name + "=([^\\s]+)"))?.[1] || "";
const turn = marker("TURN");
const memorySentinel = marker("MEMORY_SENTINEL");
const groupSessionId = marker("GROUP_SESSION");
const resumeIndex = args.indexOf("--resume");
const requestedResumeSession = resumeIndex >= 0 ? String(args[resumeIndex + 1] || "") : "";
const entry = {
  turn,
  providerVersion: state.version,
  mode: state.mode,
  sessionId: state.sessionId,
  requestedResumeSession,
  groupSessionId,
  memorySentinel,
  memoryObserved: !!memorySentinel && prompt.includes("MEMORY_SENTINEL=" + memorySentinel),
  promptChecksum: crypto.createHash("sha256").update(prompt).digest("hex"),
};
state.history = [...(Array.isArray(state.history) ? state.history : []), entry];
fs.mkdirSync(path.dirname(artifactFile), { recursive: true });
fs.writeFileSync(artifactFile, "export const phase261History = " + JSON.stringify(state.history, null, 2) + ";\n", "utf-8");
fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");

const result = "completed " + turn + " with memory " + memorySentinel;
const event = state.mode === "drift"
  ? { type: "result", subtype: "success", result, conversation_id: state.sessionId }
  : { type: "result", subtype: "success", result, session_id: state.sessionId };
process.stdout.write(JSON.stringify(event) + "\n");
`, "utf-8");

process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
process.env.CCM_CONTINUATION_SOAK_EPOCH = "svc_phase261_host";
process.env.CCM_CURSOR_AGENT_COMMAND = providerCommand;
process.env.CCM_PHASE261_PROVIDER_STATE = providerStateFile;
process.env.CCM_PHASE261_ARTIFACT = artifactFile;

const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const finalDispatchGate = require(path.join(root, "ccm-package", "dist", "agents", "final-dispatch-payload-gate.js"));
const finalDispatchReactiveCompact = require(path.join(root, "ccm-package", "dist", "agents", "final-dispatch-reactive-compact.js"));
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const compactHeadStore = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `group-phase261-${nonce}`;
const groupSessionId = `gcs_phase261_${nonce.replace(/[^a-z0-9]/gi, "")}`;
const taskId = `task-phase261-${nonce}`;
const project = "phase261-project";
const memorySentinel = `PHASE261_GROUP_MEMORY_${nonce.replace(/[^a-z0-9]/gi, "")}`;
const memoryChecksum = crypto.createHash("sha256").update(memorySentinel).digest("hex");
const summaryFile = path.join(ccmDir, "group-session-memory", groupId, groupSessionId, "summary.md");
const transcriptFile = path.join(ccmDir, "group-chat-sessions", groupId, groupSessionId, "messages.json");
let executableEpoch = 0;
let configuredVersion = "";
let currentCompactHead = null;
let checks = 0;

const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = canonical(value[key]);
      return result;
    }, {})
    : value;
const canonicalChecksum = value => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

function configureProvider(version, mode, sessionId) {
  const previous = fs.existsSync(providerStateFile)
    ? JSON.parse(fs.readFileSync(providerStateFile, "utf-8"))
    : { history: [] };
  fs.writeFileSync(providerStateFile, JSON.stringify({
    version,
    mode,
    sessionId,
    history: Array.isArray(previous.history) ? previous.history : [],
  }, null, 2), "utf-8");
  if (version !== configuredVersion) {
    executableEpoch += 1;
    configuredVersion = version;
    fs.writeFileSync(providerCommand, [
      "@echo off",
      `REM phase261 provider version ${version}`,
      `REM executable epoch ${"x".repeat(executableEpoch * 9)}`,
      `node "%~dp0cursor-provider.mjs" %*`,
      "",
    ].join("\r\n"), "utf-8");
  }
}

function buildMemoryContext(taskAgentSessionId, compactTransactionReceipt = null) {
  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });
  fs.writeFileSync(summaryFile, `# Session Memory\n\n${memorySentinel}\n`, "utf-8");
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    memory_policy: { use: "session", ignored: false },
    session_binding: {
      binding_id: `gmb_phase261_${nonce}`,
      task_id: taskId,
      task_agent_session_id: taskAgentSessionId,
    },
    compact_head: currentCompactHead,
    compaction: {
      ...(compactTransactionReceipt ? { compactTransactionReceipt } : {}),
      sessionMemory: {
        schema: "ccm-group-session-memory-context-v1",
        hasSummary: true,
        summaryFile,
        snapshotFile: path.join(path.dirname(summaryFile), "snapshot.json"),
        markdownChecksum: memoryChecksum,
      },
    },
    group_state: {
      goal: memorySentinel,
      typedMemory: { ledger: { compactEpoch: compactTransactionReceipt?.compact_epoch || "precompact" } },
    },
  };
}

function writeRunnerRequest(request) {
  const requestsDir = path.join(ccmDir, "agent-runner", "requests");
  fs.mkdirSync(requestsDir, { recursive: true });
  const file = path.join(requestsDir, `${request.id}.json`);
  fs.writeFileSync(file, JSON.stringify(request, null, 2), "utf-8");
  return file;
}

function runRunner() {
  return execFileSync(process.execPath, [runnerFile], {
    cwd: root,
    env: {
      ...process.env,
      USERPROFILE: tempRoot,
      HOME: tempRoot,
      CCM_CURSOR_AGENT_COMMAND: providerCommand,
      CCM_PHASE261_PROVIDER_STATE: providerStateFile,
      CCM_PHASE261_ARTIFACT: artifactFile,
    },
    encoding: "utf-8",
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

let taskSession = sessions.openTaskAgentSession({
  scopeId: taskId,
  taskId,
  groupId,
  project,
  agentType: "cursor",
});

async function runTurn({ label, version, mode, nativeSessionId, serviceEpoch, compactTransactionReceipt = null, expectResume, expectedContractId = "" }) {
  const compactEpoch = compactTransactionReceipt?.compact_epoch || "precompact";
  configureProvider(version, mode, nativeSessionId);
  const options = sessions.getTaskAgentSessionOptions(taskSession);
  equal(options.resumeSession, expectResume, `${label} resume mode must match the durable Task Agent session`);
  if (expectedContractId) equal(options.expectedProviderContractId, expectedContractId, `${label} must carry the expected provider contract`);
  const taskPrompt = [
    "Implement the next provider evolution in src/provider-evolution.js.",
    `TURN=${label}`,
    `MEMORY_SENTINEL=${memorySentinel}`,
    `GROUP_SESSION=${groupSessionId}`,
  ].join(" ");
  const reactiveRecentContext = label === "UPGRADE_B"
    ? Array.from({ length: 12_000 }, (_, index) => `historical-provider-context-${index} ${"detail ".repeat(2)}`).join("\n") + "\nLATEST_REAL_PROVIDER_CONTEXT"
    : "";
  const renderPrompt = context => [taskPrompt, context].filter(Boolean).join("\n\n[RECENT_GROUP_CONTEXT]\n");
  let prompt = renderPrompt(reactiveRecentContext);
  let invocationEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    taskId,
    targetProject: project,
    nativeSessionId: taskSession.nativeSessionId || "",
    attemptSequence: Number(taskSession.turnCount || 0) + 1,
    invocationKind: expectResume ? "resume" : "spawn",
    compactEpoch,
  });
  const edgeId = invocationEdge.invocation_edge_id;
  const memoryContext = buildMemoryContext(taskSession.id, compactTransactionReceipt);
  const workerContextPacket = {
    packet_id: `wcp_phase261_${label}_${nonce}`,
    group: { id: groupId },
    group_session_id: groupSessionId,
    task_id: taskId,
    task_agent_session_id: taskSession.id,
    memory: memoryContext,
    model_context_capacity: {
      schema: "ccm-model-context-capacity-v1",
      provider: "cursor",
      contextWindow: 200_000,
      reservedOutputTokens: 20_000,
      effectiveContextWindow: 180_000,
      autoCompactBufferTokens: 13_000,
      autoCompactThreshold: 167_000,
      source: "real_provider_soak",
    },
    task_agent_invocation_lineage: { invocation_edge_id: edgeId },
  };
  let finalPayloadGate = finalDispatchGate.buildFinalWorkerDispatchPayloadGate({
    renderedPrompt: prompt,
    workerContextPacket,
    provider: "cursor",
    groupId,
    groupSessionId,
    taskId,
    taskAgentSessionId: taskSession.id,
  });
  let finalReactiveCompactReceipt = null;
  if (finalPayloadGate.status === "recompact_required") {
    const recovered = finalDispatchReactiveCompact.recoverFinalWorkerDispatchPayload({
      renderedPrompt: prompt,
      recentContext: reactiveRecentContext,
      renderPrompt,
      workerHandoff: { worker_context_packet: workerContextPacket },
      provider: "cursor",
      groupId,
      groupSessionId,
      taskId,
      taskAgentSessionId: taskSession.id,
      finalDispatchPayloadGate: finalPayloadGate,
    });
    prompt = recovered.prompt;
    finalPayloadGate = recovered.gate;
    finalReactiveCompactReceipt = recovered.receipt;
  }
  workerContextPacket.final_dispatch_payload_gate = finalPayloadGate;
  if (finalReactiveCompactReceipt) workerContextPacket.final_dispatch_reactive_compact = finalReactiveCompactReceipt;
  ok(finalPayloadGate.status === "ready" && finalPayloadGate.provider_call_allowed === true, `${label} final prompt must pass the exact provider-capacity gate before runner creation`);
  if (label === "UPGRADE_B") {
    ok(finalReactiveCompactReceipt?.status === "recovered", `${label} oversized real-provider prompt must recover before runner creation`);
    ok(finalReactiveCompactReceipt?.attempt === 1, `${label} reactive compact must be single-shot`);
    ok(prompt.includes("LATEST_REAL_PROVIDER_CONTEXT") && prompt.includes(`TURN=${label}`), `${label} recovered real prompt must preserve latest context and current task`);
    ok(!JSON.stringify(finalReactiveCompactReceipt).includes("historical-provider-context-"), `${label} reactive receipt must remain body-free`);
  }
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    agentType: "cursor",
    nativeSessionId: taskSession.nativeSessionId || "",
    turn: Number(taskSession.turnCount || 0) + 1,
    executionId: `${taskId}-${label}`,
    traceId: `trace-phase261-${label}`,
    workerContextPacket,
    memoryContext,
    renderedPrompt: prompt,
    invocationLineage: { invocation_edge_id: edgeId },
  });
  ok(bound?.snapshot?.snapshot_id, `${label} must persist a prompt-bound memory snapshot`);
  invocationEdge = lineage.bindTaskAgentInvocationContext(invocationEdge, {
    workerContextPacketId: `wcp_phase261_${label}_${nonce}`,
    memoryContextSnapshotId: bound.snapshot.snapshot_id,
    memoryContextSnapshotChecksum: bound.snapshot.checksum,
    renderedPrompt: prompt,
    compactEpoch,
    groupSessionMemoryBinding: bound.snapshot.context.group_session_memory_binding,
    compactTransactionReceipt,
    finalDispatchPayloadGate: finalPayloadGate,
  });

  const requestId = `ar_phase261_${label.toLowerCase()}_${nonce}`;
  const requestFile = writeRunnerRequest({
    id: requestId,
    projectName: project,
    workDir: projectDir,
    agentType: "cursor",
    timeoutMs: 30_000,
    agentSession: options,
    taskId,
    executionId: `${taskId}-${label}`,
    taskAgentSessionId: taskSession.id,
    groupId,
    message: prompt,
    status: "pending",
    created_at: new Date().toISOString(),
    skipVerification: true,
    envAllowlist: ["CCM_PHASE261_PROVIDER_STATE", "CCM_PHASE261_ARTIFACT"],
  });
  invocationEdge = lineage.dispatchTaskAgentInvocationEdge(invocationEdge, {
    runnerRequestId: requestId,
    transport: "real_runner_fixture",
  });
  ok(invocationEdge.final_dispatch_payload_gate_dispatch_valid === true && invocationEdge.final_dispatch_payload_gate_status === "ready", `${label} lineage must prove the same final-payload gate before the real runner`);
  const runnerOutput = runRunner();
  ok(runnerOutput.includes("handled 1 request(s)"), `${label} must execute through the real external runner`);
  const persistedRequest = JSON.parse(fs.readFileSync(requestFile, "utf-8"));
  equal(persistedRequest.status, "done", `${label} runner request must reach done`);
  ok(persistedRequest.started_at, `${label} runner request must retain an OS execution witness`);
  const resultFile = path.join(ccmDir, "agent-runner", "results", `${requestId}.json`);
  const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
  equal(result.success, true, `${label} runner invocation must succeed`);
  ok(Number(result.fileChanges?.count || 0) >= 1, `${label} must produce a real workspace file change: ${JSON.stringify({ fileChanges: result.fileChanges, providerState: JSON.parse(fs.readFileSync(providerStateFile, "utf-8")) })}`);
  equal(result.nativeContinuationEvidence?.providerRuntimeVersion, version, `${label} continuation evidence must bind the real fixture version`);
  ok(result.nativeContinuationEvidence?.providerRuntimeIdentityChecksum, `${label} must bind the executable identity`);
  const recoveryOutcome = label === "RECOVERY_C" ? "clean_native_spawn_after_contract_drift" : "";
  invocationEdge = lineage.completeTaskAgentInvocationEdge(invocationEdge, {
    success: true,
    nativeSessionId: result.nativeSessionId || taskSession.nativeSessionId || "",
    nativeContinuationEvidence: result.nativeContinuationEvidence,
    provider: "cursor",
    runnerRequestId: requestId,
    output: result.output,
    reason: "execution_completed",
    recoveryOutcome,
  });

  const delivery = sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: prompt,
    snapshotRenderedPrompt: prompt,
    executionId: `${taskId}-${label}`,
    traceId: `trace-phase261-${label}`,
    runtime: "cursor",
    attempt: Number(taskSession.turnCount || 0) + 1,
    nativeSessionId: result.nativeSessionId || taskSession.nativeSessionId || "",
    runnerRequestId: requestId,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: result.output,
    fileChanges: result.fileChanges,
    nativeContinuationEvidence: result.nativeContinuationEvidence,
    invocationEdgeId: edgeId,
    recoveryOutcome,
  });
  equal(delivery?.receipt?.delivered, true, `${label} must prove group-session memory delivery`);
  equal(delivery?.receipt?.taskArtifactProven, true, `${label} must bind memory delivery to a real file artifact`);
  ok(delivery?.receipt?.groupSessionMemoryBindingChecksum, `${label} must retain the group-session memory binding`);
  equal(delivery?.receipt?.compactTransactionReceiptRequired, compactEpoch !== "precompact", `${label} compact receipt requirement must follow the actual epoch`);
  if (compactEpoch !== "precompact") {
    equal(delivery?.receipt?.compactTransactionReceiptValid, true, `${label} must deliver a verified compact transaction receipt`);
    equal(delivery?.receipt?.compactTransactionReceiptChecksum, compactTransactionReceipt.receipt_checksum, `${label} must retain the exact compact transaction receipt`);
  }
  invocationEdge = lineage.bindTaskAgentInvocationMemoryDelivery(invocationEdge, {
    deliveryReceipt: delivery.receipt,
  });
  equal(invocationEdge.reinjection_status, "proven", `${label} must bind reinjection to the exact runner invocation`);
  equal(
    lineage.verifyTaskAgentInvocationReinjectionProof(invocationEdge.reinjection_proof, invocationEdge).valid,
    true,
    `${label} reinjection proof identity and checksum must validate`,
  );

  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, {
    success: true,
    nativeSessionId: result.nativeSessionId || "",
    nativeContinuationEvidence: result.nativeContinuationEvidence,
    nativeContinuationUnverified: result.nativeContinuationEvidence?.nativeResumeRequested === true
      && result.nativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
  });
  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "continuation_evidence_captured",
    status: result.nativeContinuationEvidence.compatibilityStatus,
    eventKey: `phase261-continuation-${label}`,
    serviceEpoch,
    evidence: { invocation_edge_id: edgeId, runner_request_id: requestId, nativeContinuationEvidence: result.nativeContinuationEvidence },
  });
  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "invocation_terminal",
    status: "completed",
    eventKey: `phase261-terminal-${label}`,
    serviceEpoch,
    evidence: { invocation_edge_id: edgeId, runner_request_id: requestId, nativeContinuationEvidence: result.nativeContinuationEvidence },
  });
  execFileSync("git", ["add", "src/provider-evolution.js"], { cwd: projectDir, windowsHide: true });
  execFileSync("git", ["commit", "--quiet", "-m", `phase261 ${label.toLowerCase()}`], { cwd: projectDir, windowsHide: true });
  return { result, delivery, options, taskSession, invocationEdge };
}

try {
  const spawnA = await runTurn({
    label: "SPAWN_A",
    version: "1.0.0",
    mode: "recognized",
    nativeSessionId: `cursor-phase261-a-${nonce}`,
    serviceEpoch: "svc_phase261_before_upgrade",
    expectResume: false,
  });
  equal(spawnA.result.nativeContinuationEvidence.nativeSessionReusable, true, `initial real spawn must create a reusable native session: ${JSON.stringify(spawnA.result.nativeContinuationEvidence)}`);
  const contractA = taskSession.providerContractId;
  ok(contractA.startsWith("pcc_"), "initial real spawn must persist a trusted provider contract");

  const compactMessages = Array.from({ length: 72 }, (_, index) => ({
    id: `phase263-message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    agent: index % 2 === 0 ? "user" : project,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0
      ? `长期要求：每个子 Agent 新会话都必须使用 ${memorySentinel}，并绑定当前 ${groupSessionId}。`
      : `Phase 263 real compact turn ${index}: preserve provider contract and group-session memory. ${"context ".repeat(260)}`,
  }));
  fs.mkdirSync(path.dirname(transcriptFile), { recursive: true });
  fs.writeFileSync(transcriptFile, JSON.stringify(compactMessages, null, 2), "utf-8");
  const compactResult = await compaction.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages: compactMessages,
    memory: {
      goal: memorySentinel,
      persistentRequirements: [{ messageId: compactMessages[0].id, text: compactMessages[0].content }],
    },
    transcriptPath: transcriptFile,
    force: true,
  });
  equal(compactResult.compacted, true, "the real Runner soak must execute an actual group-memory compaction transaction");
  const compactTransactionReceipt = compactResult.compactTransactionReceipt;
  const compactReceiptVerification = compaction.verifyGroupCompactTransactionReceipt(compactTransactionReceipt, {
    groupId,
    groupSessionId,
    boundaryId: compactResult.boundary.id,
    compactEpoch: compactTransactionReceipt.compact_epoch,
  });
  equal(compactReceiptVerification.valid, true, `actual compact transaction receipt must validate: ${compactReceiptVerification.issues.join(",")}`);
  ok(compactTransactionReceipt.receipt_id.startsWith("gctr_"), "actual compact transaction must emit a durable receipt identity");
  ok(compactTransactionReceipt.compact_epoch.startsWith("cmp_"), "post-compact epoch must be derived from the committed boundary");
  const compactHeadCommit = compactHeadStore.commitGroupCompactHead({ groupId, groupSessionId, compactTransactionReceipt });
  currentCompactHead = compactHeadCommit.head;
  equal(compactHeadCommit.committed, true, "actual compact transaction must advance the durable compact head");
  equal(currentCompactHead.generation, 1, "first compact transaction must create generation one");
  const tamperedCompactReceipt = { ...compactTransactionReceipt, group_session_id: `gcs_wrong_${nonce}` };
  const tamperedVerification = compaction.verifyGroupCompactTransactionReceipt(tamperedCompactReceipt, { groupId, groupSessionId });
  equal(tamperedVerification.valid, false, "a compact receipt copied across group sessions must fail verification");
  const tamperedPrompt = `TAMPERED_COMPACT_RECEIPT=${tamperedCompactReceipt.receipt_id}`;
  const tamperedSnapshot = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    agentType: "cursor",
    turn: Number(taskSession.turnCount || 0) + 1,
    executionId: `${taskId}-tampered-compact-receipt`,
    memoryContext: buildMemoryContext(taskSession.id, tamperedCompactReceipt),
    renderedPrompt: tamperedPrompt,
  });
  const tamperedDelivery = sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: tamperedSnapshot.snapshot.snapshot_id,
    renderedPrompt: tamperedPrompt,
    snapshotRenderedPrompt: tamperedPrompt,
    dispatched: true,
  });
  equal(tamperedDelivery.receipt.delivered, false, "Task Agent delivery must fail closed on a cross-session compact receipt");

  const stableA = await runTurn({
    label: "RESUME_A",
    version: "1.0.0",
    mode: "recognized",
    nativeSessionId: `cursor-phase261-a-${nonce}`,
    serviceEpoch: "svc_phase261_before_upgrade",
    compactTransactionReceipt,
    expectResume: true,
    expectedContractId: contractA,
  });
  equal(stableA.result.nativeContinuationEvidence.compatibilityStatus, "acknowledged", "same-version real resume must be acknowledged");

  const upgradeB = await runTurn({
    label: "UPGRADE_B",
    version: "2.0.0",
    mode: "recognized",
    nativeSessionId: `cursor-phase261-a-${nonce}`,
    serviceEpoch: "svc_phase261_after_upgrade",
    compactTransactionReceipt,
    expectResume: true,
    expectedContractId: contractA,
  });
  equal(upgradeB.result.nativeContinuationEvidence.providerContractTransition, true, "real executable upgrade must create a contract transition");
  equal(upgradeB.result.nativeContinuationEvidence.providerContractContinuityVerified, true, "matching native ID must verify the real upgrade");
  const contractB = taskSession.providerContractId;
  ok(contractB !== contractA, "real executable upgrade must promote a new trusted contract");

  const driftC = await runTurn({
    label: "DRIFT_C",
    version: "3.0.0",
    mode: "drift",
    nativeSessionId: `cursor-phase261-a-${nonce}`,
    serviceEpoch: "svc_phase261_after_upgrade",
    compactTransactionReceipt,
    expectResume: true,
    expectedContractId: contractB,
  });
  equal(driftC.result.nativeContinuationEvidence.nativeSessionReusable, false, "drifted real output must fence the old native session");
  equal(taskSession.resumeMode, "scratchpad", "drifted real task must downgrade the Task Agent session to scratchpad");
  equal(taskSession.providerContractId, contractB, "drifted real output must not replace the last trusted contract");
  ok(taskSession.pendingProviderContractId, "drifted current-version contract must remain pending for recovery");
  const pendingContractC = taskSession.pendingProviderContractId;

  taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "cursor" });
  equal(taskSession.resumeMode, "native", "next real turn must retry native capture after scratchpad protection");
  equal(taskSession.nativeSessionId, "", "clean recovery must not resume the fenced native ID");
  const recoveryC = await runTurn({
    label: "RECOVERY_C",
    version: "3.0.0",
    mode: "recognized",
    nativeSessionId: `cursor-phase261-c-${nonce}`,
    serviceEpoch: "svc_phase261_after_upgrade",
    compactTransactionReceipt,
    expectResume: false,
    expectedContractId: pendingContractC,
  });
  equal(recoveryC.result.nativeContinuationEvidence.nativeSessionReusable, true, "clean current-version spawn must restore native continuation");
  equal(taskSession.providerContractId, pendingContractC, "clean current-version spawn must promote the pending contract");
  equal(taskSession.pendingProviderContractId, "", "clean current-version spawn must clear the pending contract");
  equal(taskSession.nativeSessionId, `cursor-phase261-c-${nonce}`, "clean recovery must bind a new native session ID");

  const providerState = JSON.parse(fs.readFileSync(providerStateFile, "utf-8"));
  equal(providerState.history.length, 5, "the real provider must execute all five task turns");
  ok(providerState.history.every(item => item.memoryObserved && item.memorySentinel === memorySentinel), "every real provider turn must observe the group-session memory sentinel");
  equal(providerState.history[1].requestedResumeSession, `cursor-phase261-a-${nonce}`, "same-version turn must receive the prior native session ID");
  equal(providerState.history[4].requestedResumeSession, "", "recovery turn must be a clean spawn without the fenced ID");
  const artifactText = fs.readFileSync(artifactFile, "utf-8");
  ok(artifactText.includes(memorySentinel) && artifactText.includes("RECOVERY_C"), "real workspace artifact must retain memory use through recovery");

  const report = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  equal(report.schema, "ccm-task-agent-continuation-soak-report-v6", "real-task soak report must use the v6 compact-head-fenced artifact schema");
  equal(report.overall.validChainCount, 1, "real-task soak ledger must retain a valid hash chain");
  equal(report.overall.multiTurnChainCount, 1, "real-task soak must prove a multi-turn chain");
  equal(report.overall.providerContractEpochCount, 3, "real task chain must span three executable contract epochs");
  equal(report.overall.providerContractTransitionVerifiedCount, 1, "real task chain must count the verified upgrade");
  equal(report.overall.providerContractTransitionUnverifiedCount, 1, "real task chain must retain the drifted upgrade");
  equal(report.overall.taskArtifactEvidenceCount, 5, "every real task turn must emit artifact evidence");
  equal(report.overall.taskArtifactProvenCount, 5, "every real task turn must prove a file artifact");
  equal(report.overall.memoryBoundTaskArtifactCount, 5, "every real artifact must remain bound to group-session memory");
  equal(report.overall.recoveredTaskArtifactCount, 1, "the clean post-drift spawn must produce a recovery artifact");
  equal(report.overall.crossVersionTaskArtifactChainCount, 1, "the report must prove one cross-version task-producing chain");
  equal(report.overall.postCompactTaskArtifactEvidenceCount, 4, "every turn after the first compact boundary must expose artifact evidence");
  equal(report.overall.postCompactArtifactClosureProvenCount, 4, "every post-compact artifact must close against its exact reinjection proof");
  equal(report.overall.postCompactArtifactClosureUnprovenCount, 0, "the real post-compact chain must have no unproven closures");
  equal(report.overall.postCompactArtifactSnapshotMismatchCount, 0, "post-compact artifact snapshots must match their reinjection proofs");
  equal(report.overall.postCompactArtifactEpochMismatchCount, 0, "post-compact artifact epochs must match their reinjection proofs");
  equal(report.overall.postCompactArtifactDeliveryMismatchCount, 0, "post-compact artifact delivery receipts must match their reinjection proofs");
  equal(report.overall.postCompactArtifactCompactTransactionReceiptMismatchCount, 0, "post-compact artifacts must match the actual compact transaction receipt");
  equal(report.overall.postCompactArtifactCompactHeadFenceMismatchCount, 0, "post-compact artifacts must match the current compact head generation");
  equal(report.overall.postCompactArtifactRecoveryClosureCount, 1, "the later clean recovery artifact must close the unsafe transition");
  equal(report.overall.crossVersionPostCompactArtifactChainCount, 1, "the report must prove one cross-version post-compact artifact chain");
  ok(report.rows[0].postCompactArtifactClosures.every(item => item.proven), "all real post-compact closure identities must be proven");
  ok(report.rows[0].postCompactArtifactClosures.every(item => item.compactTransactionReceiptChecksum === compactTransactionReceipt.receipt_checksum), "all post-compact closures must bind the same actual compaction transaction");
  ok(report.rows[0].postCompactArtifactClosures.every(item => item.compactHeadGeneration === currentCompactHead.generation), "all post-compact closures must bind the current compact head generation");
  ok(report.rows[0].taskArtifactRuntimeVersions.includes("1.0.0") && report.rows[0].taskArtifactRuntimeVersions.includes("3.0.0"), "artifact evidence must retain provider versions across upgrade and recovery");

  const negativeEdgeId = `tie_phase263_wrong_receipt_${nonce}`;
  const negativeDeliveryReceiptChecksum = `tamdr_phase263_wrong_receipt_${nonce}`;
  const negativeProof = {
    ...recoveryC.invocationEdge.reinjection_proof,
    proof_id: `tirp_phase263_wrong_receipt_${nonce}`,
    invocation_edge_id: negativeEdgeId,
    delivery_receipt_checksum: negativeDeliveryReceiptChecksum,
  };
  delete negativeProof.proof_checksum;
  delete negativeProof.checksum_valid;
  negativeProof.proof_checksum = canonicalChecksum(negativeProof);
  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "post_compact_reinjection",
    status: "proven",
    eventKey: "phase263-intentional-compact-receipt-proof",
    evidence: {
      invocation_edge_id: negativeEdgeId,
      reinjectionProof: negativeProof,
    },
    source: "phase263_negative_control",
  });
  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "task_artifact_committed",
    status: "proven",
    eventKey: "phase263-intentional-compact-receipt-mismatch",
    evidence: {
      invocation_edge_id: negativeEdgeId,
      runner_request_id: recoveryC.invocationEdge.runner_request_id,
      compact_epoch: compactTransactionReceipt.compact_epoch,
      memory_context_snapshot_id: recoveryC.invocationEdge.memory_context_snapshot_id,
      nativeContinuationEvidence: recoveryC.result.nativeContinuationEvidence,
      taskArtifactEvidence: {
        taskArtifactProven: true,
        taskOutputChecksum: recoveryC.delivery.receipt.outputChecksum,
        fileChangeCount: recoveryC.delivery.receipt.fileChangeCount,
        fileChangeChecksum: recoveryC.delivery.receipt.fileChangeChecksum,
        fileChangePaths: recoveryC.delivery.receipt.fileChangePaths,
        memoryDeliveryReceiptChecksum: negativeDeliveryReceiptChecksum,
        memoryPromptChecksum: recoveryC.delivery.receipt.actualRenderedPromptChecksum,
        memoryContextChecksum: recoveryC.delivery.receipt.memoryContextChecksum,
        groupSessionMemoryBindingChecksum: recoveryC.delivery.receipt.groupSessionMemoryBindingChecksum,
        compactTransactionReceiptChecksum: "intentional-compact-transaction-receipt-mismatch",
        compactTransactionBoundaryId: compactTransactionReceipt.boundary_id,
        compactTransactionReceiptValid: true,
        compactHeadFenceValid: true,
        compactHeadGeneration: currentCompactHead.generation,
        compactHeadChecksum: currentCompactHead.head_checksum,
      },
    },
    source: "phase263_negative_control",
  });
  const mismatchReport = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  equal(mismatchReport.overall.postCompactArtifactClosureProvenCount, 4, "negative control must not inflate proven closure count");
  equal(mismatchReport.overall.postCompactArtifactClosureUnprovenCount, 1, "negative control must remain an unproven closure");
  equal(mismatchReport.overall.postCompactArtifactEdgeMismatchCount, 0, "receipt-only negative control must keep the invocation edge valid");
  equal(mismatchReport.overall.postCompactArtifactSnapshotMismatchCount, 0, "receipt-only negative control must keep the snapshot valid");
  equal(mismatchReport.overall.postCompactArtifactEpochMismatchCount, 0, "receipt-only negative control must keep the compact epoch valid");
  equal(mismatchReport.overall.postCompactArtifactDeliveryMismatchCount, 0, "receipt-only negative control must keep the delivery receipt valid");
  equal(mismatchReport.overall.postCompactArtifactCompactTransactionReceiptMismatchCount, 1, "negative control must expose the wrong compact transaction receipt");
  equal(mismatchReport.overall.postCompactArtifactCompactHeadFenceMismatchCount, 0, "receipt-only negative control must keep the compact head valid");

  const deleted = soak.deleteTaskAgentContinuationSoakArtifacts(groupId, groupSessionId, taskSession.id);
  equal(deleted.deleted, 1, "group-session deletion must remove the real-task soak ledger");
  equal(soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId }).overall.chainCount, 0, "deleted group session must leave no real-task soak evidence");

  console.log(JSON.stringify({
    pass: true,
    checks,
    turns: providerState.history.length,
    versions: report.rows[0].taskArtifactRuntimeVersions,
    artifact: path.relative(projectDir, artifactFile).replace(/\\/g, "/"),
    report: report.overall,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
