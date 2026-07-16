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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE358_STAGE_${stage}=`));
  if (!line) throw new Error(`phase358 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-model-memory-receipt-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE358_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const prepare = parseStage(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const restart = parseStage(second.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE358_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE358_HOME;
if (!tempRoot) throw new Error("PHASE358_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const receipts = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const internalRuntime = require(path.join(root, "ccm-package", "dist", "integrations", "internal-mcp-runtime.js"));
const envelopes = require(path.join(root, "ccm-package", "dist", "agents", "trusted-memory-prompt-envelope.js"));
const handoff = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));
const channels = require(path.join(root, "ccm-package", "dist", "agents", "provider-memory-channel.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase358-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function createBound(state, suffix) {
  const taskId = `${state.taskBase}-${suffix}`;
  const groupSessionId = `${state.groupSessionBase}_${suffix}`;
  const opened = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: "claudecode",
  });
  const challenge = receipts.createMemoryContextConsumptionChallenge({
    groupId: state.groupId,
    groupSessionId,
    taskId,
    executionId: taskId,
    project: `${state.project}-${suffix}`,
    taskAgentSessionId: opened.id,
    attempt: 1,
  });
  const baseContext = {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: `${state.project}-${suffix}`,
    rendered_text: `[GROUP_SESSION_MEMORY phase358]\ngroup=${state.groupId}\nsession=${groupSessionId}\nrule=model must acknowledge this trusted context through MCP`,
    memory_policy: { use: "session", ignored: false },
    session_binding: { binding_id: `gmb_phase358_${suffix}`, task_id: taskId, task_agent_session_id: opened.id },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
  const context = receipts.attachMemoryContextConsumptionChallenge(baseContext, challenge);
  const rendered = handoff.renderMemoryContextForWorker(context);
  const envelope = envelopes.renderTrustedMemoryPromptEnvelope(rendered, context);
  const prompt = `phase358 work order ${suffix}\n${envelope}\nexecute now`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(opened.id, {
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: "claudecode",
    turn: 1,
    executionId: taskId,
    workerContextPacket: { packet_id: `wcp_phase358_${suffix}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: baseContext.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
    requireProviderMemoryChannelAcknowledgement: true,
    requireMemoryContextConsumptionReceipt: true,
    memoryContextConsumptionChallenge: challenge,
  });
  return { opened, challenge, context, baseContext, rendered, envelope, prompt, bound, taskId, groupSessionId, suffix, project: `${state.project}-${suffix}` };
}

function callReceiptMcp(item, override = {}) {
  const mcpEntry = path.join(root, "ccm-package", "dist", "integrations", "knowledge-context-mcp.js");
  const serverConfig = internalRuntime.buildInternalMcpServerConfig(mcpEntry, {
    taskId: override.taskId || item.taskId,
    groupId: override.groupId || item.context.group_id,
    groupSessionId: override.groupSessionId || item.groupSessionId,
    project: override.project || item.project,
    role: "project-child-agent",
    agentType: "claudecode",
    taskAgentSessionId: override.taskAgentSessionId || item.opened.id,
    nativeSessionId: "",
    workDir: root,
    baseWorkDir: root,
    projects: [],
    memoryReceiptChallenge: item.challenge,
    memoryReceiptFile: receipts.memoryContextConsumptionReceiptFile(item.challenge.challenge_id),
  });
  const messages = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "phase358-model", version: "1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "acknowledge_memory_context", arguments: { challenge_id: override.challengeId || item.challenge.challenge_id } } },
  ];
  const result = spawnSync(process.execPath, [path.join(root, "ccm-package", "dist", "integrations", "knowledge-context-mcp.js")], {
    cwd: root,
    env: {
      ...process.env,
      HOME: path.join(tempRoot, "isolated-provider-home"),
      USERPROFILE: path.join(tempRoot, "isolated-provider-home"),
      ...serverConfig.env,
    },
    input: `${messages.map(message => JSON.stringify(message)).join("\n")}\n`,
    encoding: "utf8",
  });
  const responses = String(result.stdout || "").split(/\r?\n/).filter(line => line.trim().startsWith("{")).map(line => JSON.parse(line));
  return { result, serverConfig, responses, list: responses.find(row => row.id === 2), call: responses.find(row => row.id === 3) };
}

function providerEvidence(item, runnerRequestId) {
  const proof = item.bound.snapshot.context.memory_prompt_injection_proof;
  const runtimeVersionSnapshot = { semanticVersion: "2.1.0", versionText: "2.1.0", executableIdentityChecksum: "runtime-claude-phase358", status: "ok" };
  const prepared = channels.prepareProviderMemoryChannel("claudecode", item.prompt, {
    required: true,
    envelopeChecksum: proof.trusted_envelope_checksum,
    sourceChecksum: proof.trusted_envelope_source_checksum,
    runtimeVersionSnapshot,
  });
  const systemFile = path.join(tempRoot, `${item.suffix}-system.txt`);
  fs.writeFileSync(systemFile, prepared.systemPrompt, "utf8");
  const command = runtime.buildAgentCommand("claudecode", `${item.suffix}-prompt.txt`, { appendSystemPromptFile: systemFile, persistSession: true, sessionId: "11111111-1111-4111-8111-111111111358" });
  const launch = channels.bindProviderMemoryChannelLaunch(prepared, { command, systemPromptFile: systemFile, runnerRequestId, runtimeVersionSnapshot });
  return channels.acknowledgeProviderMemoryChannelLaunch(launch, { executionSucceeded: true, runnerStarted: true, exitCode: 0, required: true });
}

function deliver(item, runnerRequestId, providerMemoryChannelEvidence, memoryContextConsumptionReceipt) {
  return sessions.recordTaskAgentMemoryContextDelivery(item.opened.id, {
    snapshotId: item.bound.snapshot.snapshot_id,
    renderedPrompt: item.prompt,
    snapshotRenderedPrompt: item.prompt,
    executionId: item.taskId,
    runtime: "claudecode",
    attempt: 1,
    runnerRequestId,
    dispatched: true,
    executionSucceeded: true,
    output: `phase358 ${item.suffix} completed`,
    runnerStarted: true,
    providerMemoryChannelEvidence,
    memoryContextConsumptionReceipt,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase358-${nonce}`,
    groupSessionBase: `gcs_phase358_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskBase: `task-phase358-${nonce}`,
    project: "phase358-project",
  };

  const loaded = createBound(state, "loaded");
  equal(receipts.verifyMemoryContextConsumptionChallenge(loaded.challenge, { taskAgentSessionId: loaded.opened.id }).valid, true, "signed challenge must verify");
  ok(loaded.rendered.includes("acknowledge_memory_context"), "trusted memory projection must instruct the model-side MCP call");
  ok(loaded.rendered.includes(loaded.challenge.challenge_id), "trusted memory projection must carry the exact challenge id");
  ok(loaded.envelope.includes(loaded.challenge.challenge_id), "challenge must be inside the checksummed trusted envelope");
  const mcp = callReceiptMcp(loaded);
  equal(mcp.result.status, 0, "real internal MCP subprocess must complete");
  ok(path.isAbsolute(mcp.serverConfig.env.CCM_INTERNAL_MCP_SECRET_FILE), "internal MCP config must carry the absolute central secret path");
  equal(mcp.serverConfig.env.CCM_INTERNAL_MCP_SECRET_FILE.includes("isolated-provider-home"), false, "Provider-isolated HOME must not redirect the signing secret");
  ok(mcp.list?.result?.tools?.some(tool => tool.name === "acknowledge_memory_context"), "challenge-bound MCP tool must be listed for the project child Agent");
  equal(mcp.call?.result?.isError === true, false, "model-side receipt tool call must succeed");
  const loadedReceipt = receipts.readMemoryContextConsumptionReceipt(loaded.challenge, {
    groupId: state.groupId,
    groupSessionId: loaded.groupSessionId,
    taskId: loaded.taskId,
    executionId: loaded.taskId,
    project: loaded.project,
    taskAgentSessionId: loaded.opened.id,
  });
  equal(loadedReceipt.valid, true, "HMAC model-side receipt must verify against the exact session");
  equal(loadedReceipt.receipt.source, "provider_model_mcp_call", "receipt source must distinguish a real MCP model call from final text");
  const loadedProvider = providerEvidence(loaded, "ar_phase358_loaded");
  const loadedDelivery = deliver(loaded, "ar_phase358_loaded", loadedProvider, loadedReceipt.receipt);
  equal(loadedDelivery.receipt.delivered, true, "model-acknowledged memory delivery must commit");
  equal(loadedDelivery.receipt.memoryContextConsumptionReceiptValid, true, "delivery receipt must attest model-side loading");
  equal(loadedDelivery.syncCommit.status, "committed", "loaded memory must become the continuation baseline");

  const missing = createBound(state, "missing");
  const missingProvider = providerEvidence(missing, "ar_phase358_missing");
  const missingDelivery = deliver(missing, "ar_phase358_missing", missingProvider, null);
  equal(missingDelivery.receipt.delivered, false, "final text without an MCP receipt must fail closed");
  equal(missingDelivery.receipt.status, "memory_context_consumption_unverified", "missing model receipt must have an explicit status");
  equal(missingDelivery.syncCommit.status, "rejected", "missing model receipt must not become the baseline");

  const wrongSession = receipts.readMemoryContextConsumptionReceipt(loaded.challenge, { taskAgentSessionId: missing.opened.id });
  equal(wrongSession.valid, false, "sibling task-Agent session must not reuse a receipt");
  ok(wrongSession.issues.includes("task_agent_session_id_mismatch") || wrongSession.issues.includes("receipt_task_agent_session_id_mismatch"), "cross-session rejection must retain the mismatch");

  const forged = createBound(state, "forged");
  const forgedMcp = callReceiptMcp(forged, { challengeId: loaded.challenge.challenge_id });
  equal(forgedMcp.call?.result?.isError, true, "wrong challenge id must be rejected by the real MCP server");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(forged.challenge.challenge_id)), false, "rejected MCP call must not create a receipt");

  const spoolRequest = spool.createDirectAgentDispatchRequest({
    projectName: loaded.project,
    workDir: root,
    agentType: "claudecode",
    taskId: loaded.taskId,
    executionId: loaded.taskId,
    taskAgentSessionId: loaded.opened.id,
    groupId: state.groupId,
    message: loaded.prompt,
    trustedMemoryProviderChannelRequired: true,
    trustedMemoryProviderAcknowledgementRequired: true,
    memoryContextConsumptionReceiptRequired: true,
    memoryContextConsumptionChallenge: loaded.challenge,
    trustedMemoryEnvelopeChecksum: loaded.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    trustedMemoryEnvelopeSourceChecksum: loaded.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
  });
  spool.markDirectAgentDispatchStarted(spoolRequest.id, { runnerPid: process.pid });
  const spoolProvider = providerEvidence(loaded, spoolRequest.id);
  const spoolCompleted = spool.completeDirectAgentDispatch(spoolRequest.id, {
    success: true,
    output: "phase358 spool complete",
    providerMemoryChannelEvidence: spoolProvider,
    memoryContextConsumptionReceipt: loadedReceipt.receipt,
    exitCode: 0,
  });
  equal(spool.validateDirectAgentDispatchPair(spoolCompleted.request, spoolCompleted.result).valid, true, "durable spool must bind the model-side receipt");

  state.snapshotIds = [loaded, missing].map(item => item.bound.snapshot.snapshot_id);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE358_STAGE_prepare=${JSON.stringify({ checks, source: loadedReceipt.receipt.source, loaded: loadedDelivery.receipt.memoryContextConsumptionReceiptStatus })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memoryContextConsumptionReceiptRequiredCount, 2, "inventory must retain receipt requirements");
  equal(inventory.summary.memoryContextConsumptionReceiptValidCount, 1, "inventory must count valid model-side receipt");
  equal(inventory.summary.memoryContextConsumptionReceiptMissingCount, 1, "inventory must count the missing model-side receipt");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memoryContextConsumptionReceiptRequiredCount, 2, "Memory Center must expose receipt requirements");
  equal(report.overall.memoryContextConsumptionReceiptValidCount, 1, "Memory Center must expose valid model-side loading");
  equal(report.overall.memoryContextConsumptionReceiptMissingCount, 1, "Memory Center must expose missing model-side loading");
  const restored = sessions.listTaskAgentMemoryContextSnapshots({ groupId: state.groupId });
  equal(restored.length, 3, "model-side receipt and rejected-challenge snapshots must survive restart");
  ok(restored.some(item => item.delivery_receipt?.memoryContextConsumptionReceipt?.source === "provider_model_mcp_call"), "restored receipt must retain its model-MCP source");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, "backend", "agents", "runner.ts"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  ok((collaborationSource.match(/requireMemoryContextConsumptionReceipt:/g) || []).length >= 3, "group, retry, and direct snapshot bindings must enforce model receipt");
  ok(collaborationSource.includes('"loaded_unreported"'), "semantic consumption must distinguish model-loaded from merely delivered memory");
  ok(collaborationSource.includes('"model_mcp_load_receipt"'), "typed-memory evidence tier must retain the model-side load receipt without claiming semantic use");
  ok(routesSource.includes("requireMemoryContextConsumptionReceipt:"), "auto-assign snapshot binding must enforce model receipt");
  ok(runnerSource.includes("recoverMemoryContextConsumptionReceipt") && runnerSource.includes("CCM_MEMORY_CONTEXT_CONSUMPTION_RECEIPT_RECOVERY_BLOCKED"), "external runner must attempt bounded same-session recovery and then fail closed");
  ok(serverSource.includes("recoverMemoryContextConsumptionReceipt") && serverSource.includes("Memory context consumption receipt recovery blocked"), "direct runner must attempt bounded same-session recovery and then fail closed");
  console.log(`PHASE358_STAGE_restart=${JSON.stringify({ checks, valid: report.overall.memoryContextConsumptionReceiptValidCount, missing: report.overall.memoryContextConsumptionReceiptMissingCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase358 mode: ${mode}`);
