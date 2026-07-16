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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE355_STAGE_${stage}=`));
  if (!line) throw new Error(`phase355 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-provider-memory-channel-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE355_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const prepare = parseStage(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const restart = parseStage(second.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE355_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE355_HOME;
if (!tempRoot) throw new Error("PHASE355_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const envelopes = require(path.join(root, "ccm-package", "dist", "agents", "trusted-memory-prompt-envelope.js"));
const channels = require(path.join(root, "ccm-package", "dist", "agents", "provider-memory-channel.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase355-state.json");
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
    rendered_text: `[GROUP_SESSION_MEMORY phase355]\ngroup=${state.groupId}\nsession=${groupSessionId}\nprovider=${provider}\nrule=deliver memory through the highest-authority provider channel`,
    memory_policy: { use: "session", ignored: false },
    session_binding: { binding_id: `gmb_phase355_${suffix}`, task_id: taskId, task_agent_session_id: opened.id },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
  const envelope = envelopes.renderTrustedMemoryPromptEnvelope(context.rendered_text, context);
  const prompt = `phase355 work order ${suffix}\n${envelope}\nexecute now`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(opened.id, {
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: provider,
    turn: 1,
    executionId: taskId,
    workerContextPacket: { packet_id: `wcp_phase355_${suffix}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: context.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
  });
  return { opened, context, envelope, prompt, bound, taskId, groupSessionId, provider, suffix };
}

function launchEvidence(item, runnerRequestId, overrideProvider = item.provider) {
  const proof = item.bound.snapshot.context.memory_prompt_injection_proof;
  const prepared = channels.prepareProviderMemoryChannel(overrideProvider, item.prompt, {
    required: true,
    envelopeChecksum: proof.trusted_envelope_checksum,
    sourceChecksum: proof.trusted_envelope_source_checksum,
  });
  const memoryFile = path.join(tempRoot, `${item.suffix}-${overrideProvider}-system.txt`);
  const developerFile = path.join(tempRoot, `${item.suffix}-${overrideProvider}-developer.txt`);
  if (prepared.systemPrompt) fs.writeFileSync(memoryFile, prepared.systemPrompt, "utf8");
  if (prepared.developerPrompt) fs.writeFileSync(developerFile, prepared.developerPrompt, "utf8");
  const command = runtime.buildAgentCommand(overrideProvider, `${item.suffix}-prompt.txt`, {
    appendSystemPromptFile: prepared.systemPrompt ? memoryFile : "",
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
  });
  const evidence = channels.bindProviderMemoryChannelLaunch(prepared, {
    command,
    systemPromptFile: prepared.systemPrompt ? memoryFile : "",
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    runnerRequestId,
    runtimeVersionSnapshot: {
      semanticVersion: "phase355",
      executableIdentityChecksum: `runtime-${overrideProvider}-phase355`,
    },
  });
  return { prepared, command, evidence, memoryFile, developerFile };
}

function deliver(item, runnerRequestId, evidence) {
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
    output: `phase355 ${item.suffix} completed`,
    runnerStarted: true,
    providerMemoryChannelEvidence: evidence,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase355-${nonce}`,
    groupSessionBase: `gcs_phase355_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskBase: `task-phase355-${nonce}`,
    project: "phase355-project",
  };

  const claude = createBound(state, "claudecode", "claude");
  const claudeLaunch = launchEvidence(claude, "ar_phase355_claude");
  equal(claudeLaunch.prepared.channel, "native_system_prompt_file", "Claude Code must select the native system channel");
  equal(claudeLaunch.prepared.authorityRole, "system", "Claude Code memory must have system authority");
  equal(claudeLaunch.prepared.userPrompt.includes("CCM_TRUSTED_MEMORY_BEGIN"), false, "Claude user prompt must not duplicate the trusted envelope");
  equal(claudeLaunch.prepared.systemPrompt, claude.envelope, "Claude system prompt file must contain the exact envelope");
  ok(claudeLaunch.command.includes("--append-system-prompt-file"), "Claude command must use append-system-prompt-file");
  equal(channels.verifyProviderMemoryChannelEvidence(claudeLaunch.evidence, {
    provider: "claudecode",
    originalPrompt: claude.prompt,
    envelopeChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    sourceChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    runnerRequestId: "ar_phase355_claude",
    required: true,
  }).valid, true, "Claude launch evidence must verify");
  const replayForged = channels.bindProviderMemoryChannelLaunch({
    ...claudeLaunch.prepared,
    userPrompt: "forged user prompt with internally valid evidence checksum",
  }, {
    command: claudeLaunch.command,
    systemPromptFile: claudeLaunch.memoryFile,
    runnerRequestId: "ar_phase355_claude",
  });
  equal(channels.verifyProviderMemoryChannelEvidence(replayForged, {
    provider: "claudecode",
    originalPrompt: claude.prompt,
    envelopeChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    sourceChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    runnerRequestId: "ar_phase355_claude",
    required: true,
  }).valid, false, "verification must replay the original prompt split instead of trusting self-consistent forged checksums");
  const claudeDelivery = deliver(claude, "ar_phase355_claude", claudeLaunch.evidence);
  equal(claudeDelivery.receipt.delivered, true, "Claude native-system memory delivery must commit");
  equal(claudeDelivery.receipt.providerMemoryNativeSystemPrompt, true, "Claude receipt must attest native system delivery");
  equal(claudeDelivery.syncCommit.status, "committed", "Claude memory baseline must be committed");

  const fallback = createBound(state, "cursor", "fallback");
  const fallbackLaunch = launchEvidence(fallback, "ar_phase355_fallback");
  equal(fallbackLaunch.prepared.channel, "trusted_user_prompt_envelope", "Provider without a native authority channel must declare user-prompt fallback");
  equal(fallbackLaunch.prepared.authorityRole, "user", "fallback authority must not be overstated");
  equal(fallbackLaunch.prepared.userPrompt, fallback.prompt, "fallback must preserve the exact trusted envelope prompt");
  equal(fallbackLaunch.command.includes("--append-system-prompt-file"), false, "fallback command must not claim unsupported system-prompt flags");
  const fallbackDelivery = deliver(fallback, "ar_phase355_fallback", fallbackLaunch.evidence);
  equal(fallbackDelivery.receipt.delivered, true, "trusted user-envelope fallback must commit");
  equal(fallbackDelivery.receipt.providerMemoryUserPromptFallback, true, "receipt must expose fallback authority");

  const missing = createBound(state, "claudecode", "missing");
  const missingDelivery = deliver(missing, "ar_phase355_missing", null);
  equal(missingDelivery.receipt.delivered, false, "missing provider-channel evidence must fail closed");
  equal(missingDelivery.receipt.status, "provider_memory_channel_unverified", "missing evidence must have an explicit delivery status");
  equal(missingDelivery.syncCommit.status, "rejected", "missing provider-channel evidence must not become the memory baseline");

  const crossProvider = createBound(state, "claudecode", "cross-provider");
  const forgedCodexLaunch = launchEvidence(crossProvider, "ar_phase355_cross", "codex");
  const crossDelivery = deliver(crossProvider, "ar_phase355_cross", forgedCodexLaunch.evidence);
  equal(crossDelivery.receipt.delivered, false, "Codex fallback evidence must not satisfy a Claude dispatch");
  ok(crossDelivery.receipt.providerMemoryChannelIssues.includes("provider_memory_channel_provider_mismatch"), "cross-provider rejection must retain the mismatch issue");

  const spoolRequest = spool.createDirectAgentDispatchRequest({
    projectName: state.project,
    workDir: root,
    agentType: "claudecode",
    taskId: `${state.taskBase}-spool`,
    executionId: `${state.taskBase}-spool`,
    taskAgentSessionId: claude.opened.id,
    groupId: state.groupId,
    message: claude.prompt,
    trustedMemoryProviderChannelRequired: true,
    trustedMemoryEnvelopeChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    trustedMemoryEnvelopeSourceChecksum: claude.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
  });
  spool.markDirectAgentDispatchStarted(spoolRequest.id, { runnerPid: process.pid });
  const spoolLaunch = launchEvidence(claude, spoolRequest.id);
  const spoolCompleted = spool.completeDirectAgentDispatch(spoolRequest.id, {
    success: true,
    output: "phase355 direct spool complete",
    providerMemoryChannelEvidence: spoolLaunch.evidence,
  });
  equal(spool.validateDirectAgentDispatchPair(spoolCompleted.request, spoolCompleted.result).valid, true, "durable direct spool must bind provider-channel evidence");

  state.snapshotIds = [claude, fallback, missing, crossProvider].map(item => item.bound.snapshot.snapshot_id);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE355_STAGE_prepare=${JSON.stringify({ checks, native: claudeDelivery.receipt.providerMemoryChannel, fallback: fallbackDelivery.receipt.providerMemoryChannel })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.providerMemoryChannelRequiredCount, 4, "inventory must retain all required provider-memory channels");
  equal(inventory.summary.providerMemoryNativeSystemCount, 1, "inventory must count Claude native system delivery");
  equal(inventory.summary.providerMemoryUserFallbackCount, 1, "inventory must count explicit user fallback delivery");
  equal(inventory.summary.providerMemoryChannelUnverifiedCount, 2, "inventory must count missing and cross-provider evidence");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.providerMemoryChannelRequiredCount, 4, "Memory Center must expose provider-channel requirements");
  equal(report.overall.providerMemoryNativeSystemCount, 1, "Memory Center must expose native system delivery");
  equal(report.overall.providerMemoryUserFallbackCount, 1, "Memory Center must expose user fallback delivery");
  equal(report.overall.providerMemoryChannelUnverifiedCount, 2, "Memory Center must expose unverified provider channels");
  const restored = sessions.listTaskAgentMemoryContextSnapshots({ groupId: state.groupId });
  equal(restored.length, 4, "provider-channel evidence snapshots must survive restart");
  ok(restored.some(item => item.delivery_receipt?.providerMemoryNativeSystemPrompt === true), "restored receipts must retain system authority evidence");
  ok(restored.some(item => item.delivery_receipt?.providerMemoryUserPromptFallback === true), "restored receipts must retain fallback authority evidence");

  const runtimeSource = fs.readFileSync(path.join(root, "backend", "agents", "runtime.ts"), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, "backend", "agents", "runner.ts"), "utf8");
  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf8");
  ok(runtimeSource.includes("--append-system-prompt-file"), "runtime must expose Claude native system-prompt-file launch");
  ok(runnerSource.includes("bindProviderMemoryChannelLaunch"), "external runner must bind provider-channel launch evidence");
  ok((collaborationSource.match(/trustedMemoryProviderChannelRequired:/g) || []).length >= 2, "group and direct production dispatches must request provider-channel evidence");
  ok(routesSource.includes("trustedMemoryProviderChannelRequired:"), "auto-assign production dispatch must request provider-channel evidence");
  console.log(`PHASE355_STAGE_restart=${JSON.stringify({ checks, system: report.overall.providerMemoryNativeSystemCount, fallback: report.overall.providerMemoryUserFallbackCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase355 mode: ${mode}`);
