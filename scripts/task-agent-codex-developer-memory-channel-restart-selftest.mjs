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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE356_STAGE_${stage}=`));
  if (!line) throw new Error(`phase356 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-codex-developer-memory-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE356_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const prepare = parseStage(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const restart = parseStage(second.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE356_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE356_HOME;
if (!tempRoot) throw new Error("PHASE356_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const envelopes = require(path.join(root, "ccm-package", "dist", "agents", "trusted-memory-prompt-envelope.js"));
const channels = require(path.join(root, "ccm-package", "dist", "agents", "provider-memory-channel.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase356-state.json");
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
    agentType: "codex",
  });
  const context = {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: `${state.project}-${suffix}`,
    rendered_text: `[GROUP_SESSION_MEMORY phase356]\ngroup=${state.groupId}\nsession=${groupSessionId}\nrule=Codex receives this only through developer instructions`,
    memory_policy: { use: "session", ignored: false },
    session_binding: { binding_id: `gmb_phase356_${suffix}`, task_id: taskId, task_agent_session_id: opened.id },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
  const envelope = envelopes.renderTrustedMemoryPromptEnvelope(context.rendered_text, context);
  const prompt = `phase356 work order ${suffix}\n${envelope}\nexecute now`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(opened.id, {
    taskId,
    groupId: state.groupId,
    project: `${state.project}-${suffix}`,
    agentType: "codex",
    turn: 1,
    executionId: taskId,
    workerContextPacket: { packet_id: `wcp_phase356_${suffix}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: context.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
  });
  return { opened, context, envelope, prompt, bound, taskId, suffix };
}

function launch(item, runnerRequestId, options = {}) {
  const proof = item.bound.snapshot.context.memory_prompt_injection_proof;
  const provider = options.provider || "codex";
  const runtimeVersionSnapshot = {
    semanticVersion: options.runtimeVersion || "0.115.0",
    executableIdentityChecksum: `runtime-${provider}-phase356`,
    status: "ok",
  };
  const prepared = channels.prepareProviderMemoryChannel(provider, item.prompt, {
    required: true,
    envelopeChecksum: proof.trusted_envelope_checksum,
    sourceChecksum: proof.trusted_envelope_source_checksum,
    runtimeVersionSnapshot,
  });
  const developerFile = path.join(tempRoot, `${item.suffix}-${provider}-developer.txt`);
  if (prepared.developerPrompt) fs.writeFileSync(developerFile, prepared.developerPrompt, "utf8");
  if (options.tamperFile) fs.writeFileSync(developerFile, "tampered developer memory", "utf8");
  const command = runtime.buildAgentCommand(provider, `${item.suffix}-prompt.txt`, {
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    persistSession: options.persistSession === true,
    resumeSession: options.resumeSession === true,
    sessionId: options.sessionId || "",
  });
  const evidence = channels.bindProviderMemoryChannelLaunch(prepared, {
    command,
    developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    runnerRequestId,
    runtimeVersionSnapshot,
  });
  return { prepared, developerFile, command, evidence };
}

function deliver(item, runnerRequestId, evidence) {
  return sessions.recordTaskAgentMemoryContextDelivery(item.opened.id, {
    snapshotId: item.bound.snapshot.snapshot_id,
    renderedPrompt: item.prompt,
    snapshotRenderedPrompt: item.prompt,
    executionId: item.taskId,
    runtime: "codex",
    attempt: 1,
    runnerRequestId,
    dispatched: true,
    executionSucceeded: true,
    output: `phase356 ${item.suffix} completed`,
    runnerStarted: true,
    providerMemoryChannelEvidence: evidence,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase356-${nonce}`,
    groupSessionBase: `gcs_phase356_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskBase: `task-phase356-${nonce}`,
    project: "phase356-project",
  };

  const ready = createBound(state, "ready");
  const readyLaunch = launch(ready, "ar_phase356_ready");
  equal(channels.getProviderMemoryChannelCapability("codex", { runtimeVersionSnapshot: { semanticVersion: "0.115.0" } }).nativeDeveloperInstructionsSupported, true, "verified Codex capability must expose developer instructions");
  equal(readyLaunch.prepared.channel, "native_developer_instructions_config", "Codex must select the native developer channel");
  equal(readyLaunch.prepared.authorityRole, "developer", "Codex memory must have developer authority");
  equal(readyLaunch.prepared.developerPrompt, ready.envelope, "developer file payload must be the exact trusted envelope");
  equal(readyLaunch.prepared.userPrompt.includes("CCM_TRUSTED_MEMORY_BEGIN"), false, "Codex user prompt must not duplicate trusted memory");
  ok(readyLaunch.command.includes("codex-prompt-runner.js"), "Codex launch must use the stdin/config helper");
  ok(readyLaunch.command.includes(readyLaunch.developerFile), "Codex command must bind the developer instructions file");
  equal(readyLaunch.command.includes(ready.envelope), false, "raw memory must not be placed on the shell command line");
  const verified = channels.verifyProviderMemoryChannelEvidence(readyLaunch.evidence, {
    provider: "codex",
    originalPrompt: ready.prompt,
    envelopeChecksum: ready.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    sourceChecksum: ready.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    runnerRequestId: "ar_phase356_ready",
    required: true,
  });
  equal(verified.valid, true, "Codex native developer evidence must verify");
  equal(verified.nativeDeveloperInstructions, true, "verification must expose developer authority");
  const readyDelivery = deliver(ready, "ar_phase356_ready", readyLaunch.evidence);
  equal(readyDelivery.receipt.delivered, true, "Codex developer memory delivery must commit");
  equal(readyDelivery.receipt.providerMemoryNativeDeveloperInstructions, true, "receipt must attest native developer delivery");
  equal(readyDelivery.syncCommit.status, "committed", "developer-channel memory must become the baseline");

  const resumed = launch(ready, "ar_phase356_resume", { persistSession: true, resumeSession: true, sessionId: "0190f5d0-1234-7000-8000-000000000356" });
  ok(resumed.command.includes("codex-prompt-runner.js"), "Codex resume must keep the developer helper");
  ok(resumed.command.includes(resumed.developerFile), "Codex resume must bind the updated developer memory file");

  const fakeBin = path.join(tempRoot, "fake-codex-bin");
  const fakeEntry = path.join(fakeBin, "node_modules", "@openai", "codex", "bin", "codex.js");
  const fakeCapture = path.join(tempRoot, "fake-codex-capture.json");
  const fakePrompt = path.join(tempRoot, "fake-codex-prompt.txt");
  fs.mkdirSync(path.dirname(fakeEntry), { recursive: true });
  fs.writeFileSync(path.join(fakeBin, "codex.cmd"), "@exit /b 0\r\n", "utf8");
  fs.writeFileSync(fakeEntry, 'const fs=require("fs");fs.writeFileSync(process.env.PHASE356_CODEX_CAPTURE,JSON.stringify({args:process.argv.slice(2),stdin:fs.readFileSync(0,"utf8")}));\n', "utf8");
  fs.writeFileSync(fakePrompt, "phase356 stdin task", "utf8");
  const helperResult = spawnSync(process.execPath, [
    path.join(root, "ccm-package", "dist", "agents", "codex-prompt-runner.js"),
    fakePrompt,
    readyLaunch.developerFile,
    Buffer.from(JSON.stringify(["exec", "--ephemeral", "-"]), "utf8").toString("base64"),
  ], {
    cwd: root,
    env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`, PHASE356_CODEX_CAPTURE: fakeCapture },
    encoding: "utf8",
  });
  equal(helperResult.status, 0, "Codex helper must launch a resolved npm CLI entry without cmd-shell expansion");
  const helperCapture = JSON.parse(fs.readFileSync(fakeCapture, "utf8"));
  equal(helperCapture.stdin, "phase356 stdin task", "Codex helper must pipe only the user task through stdin");
  const configIndex = helperCapture.args.indexOf("--config");
  ok(configIndex >= 0, "Codex helper must add a one-run config override");
  ok(String(helperCapture.args[configIndex + 1] || "").startsWith("developer_instructions="), "Codex helper must target the documented developer_instructions key");
  equal(JSON.parse(helperCapture.args[configIndex + 1].slice("developer_instructions=".length)), ready.envelope, "Codex helper must pass the exact trusted envelope as developer instructions");

  const legacyLaunch = launch(ready, "ar_phase356_legacy", { runtimeVersion: "0.114.0" });
  equal(legacyLaunch.prepared.channel, "trusted_user_prompt_envelope", "unverified older Codex must use the explicit user fallback");
  equal(legacyLaunch.prepared.authorityRole, "user", "version fallback must not overstate developer authority");
  equal(legacyLaunch.prepared.userPrompt, ready.prompt, "version fallback must preserve the exact trusted prompt");
  equal(legacyLaunch.prepared.developerPrompt, "", "version fallback must not claim a developer payload");
  equal(channels.verifyProviderMemoryChannelEvidence(legacyLaunch.evidence, {
    provider: "codex",
    originalPrompt: ready.prompt,
    envelopeChecksum: ready.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_checksum,
    sourceChecksum: ready.bound.snapshot.context.memory_prompt_injection_proof.trusted_envelope_source_checksum,
    runnerRequestId: "ar_phase356_legacy",
    required: true,
  }).valid, true, "version-bound user fallback evidence must verify deterministically");

  const tampered = createBound(state, "tampered");
  const tamperedLaunch = launch(tampered, "ar_phase356_tampered", { tamperFile: true });
  equal(tamperedLaunch.evidence.status, "blocked", "tampered developer file must block launch evidence");
  ok(tamperedLaunch.evidence.issues.includes("provider_memory_channel_developer_instructions_file_mismatch"), "tamper reason must be retained");
  const tamperedDelivery = deliver(tampered, "ar_phase356_tampered", tamperedLaunch.evidence);
  equal(tamperedDelivery.receipt.delivered, false, "tampered developer memory must fail closed");
  equal(tamperedDelivery.receipt.status, "provider_memory_channel_unverified", "tampered delivery must have an explicit failure status");
  equal(tamperedDelivery.syncCommit.status, "rejected", "tampered developer memory must not become the baseline");

  const cross = createBound(state, "cross");
  const crossLaunch = launch(cross, "ar_phase356_cross", { provider: "cursor" });
  const crossDelivery = deliver(cross, "ar_phase356_cross", crossLaunch.evidence);
  equal(crossDelivery.receipt.delivered, false, "Cursor user fallback evidence must not satisfy Codex developer delivery");
  ok(crossDelivery.receipt.providerMemoryChannelIssues.includes("provider_memory_channel_provider_mismatch"), "cross-provider rejection must retain provider mismatch");

  state.snapshotIds = [ready, tampered, cross].map(item => item.bound.snapshot.snapshot_id);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE356_STAGE_prepare=${JSON.stringify({ checks, channel: readyDelivery.receipt.providerMemoryChannel, role: readyDelivery.receipt.providerMemoryAuthorityRole })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.providerMemoryChannelRequiredCount, 3, "inventory must retain all Codex channel requirements");
  equal(inventory.summary.providerMemoryNativeDeveloperCount, 1, "inventory must count native developer delivery");
  equal(inventory.summary.providerMemoryUserFallbackCount, 0, "Codex must no longer count as user fallback");
  equal(inventory.summary.providerMemoryChannelUnverifiedCount, 2, "inventory must count tampered and cross-provider evidence");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.providerMemoryNativeDeveloperCount, 1, "Memory Center must expose native developer delivery");
  equal(report.overall.providerMemoryChannelUnverifiedCount, 2, "Memory Center must expose rejected developer channels");
  const restored = sessions.listTaskAgentMemoryContextSnapshots({ groupId: state.groupId });
  equal(restored.length, 3, "Codex developer evidence snapshots must survive restart");
  ok(restored.some(item => item.delivery_receipt?.providerMemoryNativeDeveloperInstructions === true), "restored receipt must retain developer authority evidence");

  const runtimeSource = fs.readFileSync(path.join(root, "backend", "agents", "runtime.ts"), "utf8");
  const helperSource = fs.readFileSync(path.join(root, "backend", "agents", "codex-prompt-runner.ts"), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, "backend", "agents", "runner.ts"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  ok(runtimeSource.includes("developerInstructionsFile"), "runtime command contract must carry the developer file");
  ok(helperSource.includes("developer_instructions="), "Codex helper must inject the documented developer_instructions key");
  ok(helperSource.includes("input: prompt"), "Codex helper must preserve the user task on stdin");
  ok(runnerSource.includes("memoryDeveloperInstructionsFile"), "external runner must materialize developer memory separately");
  ok(serverSource.includes("memoryDeveloperInstructionsFile"), "direct runner must materialize developer memory separately");
  console.log(`PHASE356_STAGE_restart=${JSON.stringify({ checks, developer: report.overall.providerMemoryNativeDeveloperCount, unverified: report.overall.providerMemoryChannelUnverifiedCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase356 mode: ${mode}`);
