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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE376_STAGE_${stage}=`));
  if (!line) throw new Error(`Phase 376 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-entry-delta-"));
  try {
    const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE376_HOME: home };
    const prepare = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
    const prepared = parseStage(prepare.stdout, "prepare");
    const restart = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(restart.status, 0, restart.stderr || restart.stdout);
    const restarted = parseStage(restart.stdout, "restart");
    const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
    const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf8");
    assert.ok((collaborationSource.match(/workerMemoryPacket = renderMemoryContextForWorker\(/g) || []).length >= 2, "cross-agent initial and retry prompts must both use entry transport projection");
    assert.ok((collaborationSource.match(/task_agent_session_id: (?:activeTaskSession|directTaskSession)\?\.id \|\| ""/g) || []).length >= 3, "mention, retry, and direct dispatch must pass exact tas_* identity into entry sync");
    assert.ok(routesSource.includes('task_agent_session_id: autoAssignTaskSession?.id || ""'), "auto-assignment must pass exact tas_* identity into entry sync");
    const checks = Number(prepared.checks || 0) + Number(restarted.checks || 0) + 3;
    console.log(JSON.stringify({ pass: true, checks, productionPathChecks: 3, prepare: prepared, restart: restarted }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE376_HOME;
if (!home) throw new Error("PHASE376_HOME is required");
const distRoot = process.env.PHASE376_DIST
  ? path.resolve(process.env.PHASE376_DIST)
  : path.join(root, "ccm-package", "dist");
const require = createRequire(import.meta.url);
const sessions = require(path.join(distRoot, "tasks", "agent-sessions.js"));
const worker = require(path.join(distRoot, "agents", "worker-handoff.js"));
const intake = require(path.join(distRoot, "modules", "collaboration", "collaboration-task-intake.js"));
const continuation = require(path.join(distRoot, "agents", "native-continuation.js"));
const runtime = require(path.join(distRoot, "agents", "runtime.js"));
const channels = require(path.join(distRoot, "agents", "provider-memory-channel.js"));
const center = require(path.join(distRoot, "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase376-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const throws = (fn, matcher, message) => { checks += 1; assert.throws(fn, matcher, message); };

function memoryContext(state, revision = 1, groupSessionId = state.groupSessionId, removeBeta = false) {
  const alpha = `PHASE376_ALPHA_R${revision}_` + (revision === 1 ? "a" : "x").repeat(1800);
  const beta = "PHASE376_BETA_STABLE_" + "b".repeat(1800);
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: state.project,
    rendered_text: ["[PHASE376 FULL MEMORY]", `group=${state.groupId}`, `session=${groupSessionId}`, alpha, removeBeta ? "" : beta].filter(Boolean).join("\n"),
    memory_policy: { use: "session" },
    session_binding: {
      binding_id: `gmb_phase376_${groupSessionId}`,
      task_id: state.taskId,
      task_agent_session_id: state.taskAgentSessionId,
    },
    compaction: { compactEpoch: "phase376-epoch" },
    typed_memory_recall: {
      schema: "ccm-group-typed-memory-recall-v1",
      version: 1,
      recalled: [
        { relPath: "memory/alpha.md", checksum: `alpha-${revision}`, type: "project", snippet: alpha },
        ...(removeBeta ? [] : [{ relPath: "memory/beta.md", checksum: "beta-1", type: "project", snippet: beta }]),
      ],
      surfaced: removeBeta ? ["memory/alpha.md"] : ["memory/alpha.md", "memory/beta.md"],
    },
  };
}

function buildTurn(state, revision, turn, groupSessionId = state.groupSessionId, removeBeta = false) {
  const memory = memoryContext(state, revision, groupSessionId, removeBeta);
  const handoff = intake.buildChildAgentWorkerHandoff(state.project, `phase376 turn ${turn}`, {
    group: { id: state.groupId, active_session_id: groupSessionId },
    task_id: state.taskId,
    task_agent_session_id: state.taskAgentSessionId,
    agent_type: "codex",
    memory,
  });
  const prompt = worker.renderSelfContainedWorkerHandoff(handoff);
  const plan = handoff.worker_context_packet.memory.task_agent_memory_entry_sync;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    nativeSessionId: state.nativeSessionId,
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: handoff.worker_context_packet,
    workerHandoff: handoff,
    memoryContext: memory,
    renderedPrompt: prompt,
    renderedMemoryContext: memory.rendered_text,
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
  });
  return { memory, handoff, prompt, plan, bound };
}

function nativeEvidence(state, runnerRequestId) {
  const normalized = runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: state.nativeSessionId }));
  return continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: state.nativeSessionId,
    returnedNativeSessionId: state.nativeSessionId,
    providerOutputContractEvidence: normalized.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
}

function deliver(state, turn, options = {}) {
  const runnerRequestId = options.runnerRequestId || `adr_phase376_${options.turnNumber}`;
  const proof = turn.bound.snapshot.context.memory_prompt_injection_proof;
  let providerMemoryChannelEvidence = null;
  if (proof.trusted_envelope_present === true) {
    const prepared = channels.prepareProviderMemoryChannel("codex", turn.prompt, {
      required: true,
      envelopeChecksum: proof.trusted_envelope_checksum,
      sourceChecksum: proof.trusted_envelope_source_checksum,
    });
    const developerFile = path.join(home, `phase376-${options.turnNumber}-developer.txt`);
    if (prepared.developerPrompt) fs.writeFileSync(developerFile, prepared.developerPrompt, "utf8");
    const command = runtime.buildAgentCommand("codex", `phase376-${options.turnNumber}-prompt.txt`, {
      developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
    });
    providerMemoryChannelEvidence = channels.bindProviderMemoryChannelLaunch(prepared, {
      command,
      developerInstructionsFile: prepared.developerPrompt ? developerFile : "",
      runnerRequestId,
      runtimeVersionSnapshot: { semanticVersion: "phase376", executableIdentityChecksum: "phase376-runtime-identity" },
    });
  }
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: turn.bound.snapshot.snapshot_id,
    renderedPrompt: turn.prompt,
    snapshotRenderedPrompt: turn.prompt,
    executionId: `${state.taskId}-turn-${options.turnNumber}`,
    runtime: "codex",
    attempt: options.turnNumber,
    nativeSessionId: state.nativeSessionId,
    runnerRequestId,
    nativeContinuationEvidence: options.nativeContinuationEvidence || null,
    providerMemoryChannelEvidence,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: `phase376 delivered turn ${options.turnNumber}`,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `phase376-group-${nonce}`,
    groupSessionId: `gcs_phase376_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase376_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `phase376-task-${nonce}`,
    project: "phase376-project",
    nativeSessionId: `thread-phase376-${nonce}`,
  };
  const opened = sessions.openTaskAgentSession({ scopeId: state.taskId, taskId: state.taskId, groupId: state.groupId, project: state.project, agentType: "codex" });
  state.taskAgentSessionId = opened.id;
  const first = buildTurn(state, 1, 1);
  equal(first.plan.transport_mode, "full", "a new tas_* must receive a complete memory baseline");
  equal(first.plan.previous_baseline_trusted, false, "first memory baseline must not claim prior trust");
  ok(first.prompt.includes("PHASE376_ALPHA_R1_") && first.prompt.includes("PHASE376_BETA_STABLE_"), "full baseline prompt must contain both memory entries");
  equal(first.bound.snapshot.context.memory_snapshot_sync.action, "initialize", "full first baseline should initialize snapshot sync");
  equal(first.bound.snapshot.context.memory_entry_sync.plan_checksum, first.plan.plan_checksum, "snapshot must bind the exact entry-sync plan");
  equal(first.bound.snapshot.context.memory_prompt_injection_proof.prompt_bound, true, "full baseline must remain prompt-bound");
  const committed = deliver(state, first, { turnNumber: 1 });
  equal(committed.syncCommit.status, "committed", "full baseline delivery should commit");
  const advanced = sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, { nativeSessionId: state.nativeSessionId, success: true });
  equal(advanced.nativeSessionId, state.nativeSessionId, "first turn should capture exact native session identity");
  state.firstSnapshotId = first.bound.snapshot.snapshot_id;
  state.firstManifestChecksum = first.plan.current_manifest.manifest_checksum;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE376_STAGE_prepare=${JSON.stringify({ checks, fullChars: first.memory.rendered_text.length })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.nativeSessionId, state.nativeSessionId, "native continuation identity must survive restart");
  const delta = buildTurn(state, 2, 2);
  equal(delta.plan.transport_mode, "delta", "one changed memory entry should use delta transport");
  equal(delta.plan.previous_snapshot_id, state.firstSnapshotId, "delta must bind the committed previous snapshot");
  equal(delta.plan.previous_manifest_checksum, state.firstManifestChecksum, "delta must bind the previous manifest head");
  equal(delta.plan.changed_entry_count, 1, "only the changed typed-memory entry should be transferred");
  ok(delta.plan.changed_entry_keys.includes("typed/memory/alpha.md"), "delta must identify the changed relPath");
  ok(delta.prompt.includes("PHASE376_ALPHA_R2_"), "delta prompt must contain the changed memory body");
  equal(delta.prompt.includes("PHASE376_BETA_STABLE_"), false, "delta prompt must omit unchanged memory bodies");
  equal(delta.prompt.includes("[PHASE376 FULL MEMORY]"), false, "delta prompt must not re-inject the full rendered projection");
  equal(delta.bound.snapshot.context.memory_snapshot_sync.action, "prompt_update", "delta should remain an explicit prompt update");
  equal(delta.bound.snapshot.context.memory_prompt_injection_proof.prompt_bound, true, "delta projection must be bound to the final prompt");
  const deltaDelivery = deliver(state, delta, { turnNumber: 2 });
  equal(deltaDelivery.syncCommit.status, "committed", "delta delivery should commit the new manifest baseline");
  sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, { nativeSessionId: state.nativeSessionId, success: true });

  const unchanged = buildTurn(state, 2, 3);
  equal(unchanged.plan.transport_mode, "continuation", "unchanged memory should reuse the committed native-session baseline");
  equal(unchanged.plan.changed_entry_count, 0, "continuation transport should contain no changed entries");
  equal(unchanged.prompt.includes("PHASE376_ALPHA_R2_"), false, "continuation prompt must not repeat changed memory after it was committed");
  equal(unchanged.prompt.includes("PHASE376_BETA_STABLE_"), false, "continuation prompt must not repeat unchanged memory");
  equal(unchanged.bound.snapshot.context.memory_snapshot_sync.action, "none", "continuation transport should align with snapshot no-op");
  equal(unchanged.bound.snapshot.context.memory_prompt_injection_proof.status, "continuation_baseline", "proof should disclose native continuation reuse");
  const runnerRequestId = "adr_phase376_resume";
  const continuationDelivery = deliver(state, unchanged, { turnNumber: 3, runnerRequestId, nativeContinuationEvidence: nativeEvidence(state, runnerRequestId) });
  equal(continuationDelivery.syncCommit.status, "committed", "proven native continuation should commit without repeated memory text");
  sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, { nativeSessionId: state.nativeSessionId, success: true });

  const removed = buildTurn(state, 2, 4, state.groupSessionId, true);
  equal(removed.plan.transport_mode, "delta", "a removed memory entry should use delta transport");
  equal(removed.plan.changed_entry_count, 0, "removal-only delta should not invent changed content");
  equal(removed.plan.removed_entry_count, 1, "removal-only delta should carry one tombstone");
  ok(removed.plan.removed_entry_keys.includes("typed/memory/beta.md"), "removed relPath must be explicit in the delta tombstone set");
  equal(removed.prompt.includes("PHASE376_BETA_STABLE_"), false, "removed memory body must not be replayed");
  equal(deliver(state, removed, { turnNumber: 4 }).syncCommit.status, "committed", "removal delta should commit the new manifest head");

  const tampered = worker.buildSelfContainedWorkerHandoff({
    group: { id: state.groupId, active_session_id: state.groupSessionId },
    project: state.project,
    task: "tampered delta",
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
    agentType: "codex",
    memory: memoryContext(state, 3),
  });
  tampered.worker_context_packet.memory.task_agent_memory_entry_sync.transport_text += "\nTAMPERED";
  throws(() => sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn: 5,
    workerContextPacket: tampered.worker_context_packet,
    workerHandoff: tampered,
    memoryContext: memoryContext(state, 3),
    renderedPrompt: worker.renderSelfContainedWorkerHandoff(tampered),
    requireMemoryPromptInjectionProof: true,
    requireTrustedMemoryPromptEnvelope: true,
  }), /entry sync plan invalid|entry sync changed/, "tampered delta text must fail before snapshot persistence");
  throws(() => worker.buildSelfContainedWorkerHandoff({
    group: { id: state.groupId, active_session_id: state.siblingGroupSessionId },
    project: state.project,
    task: "cross session",
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
    agentType: "codex",
    memory: memoryContext(state, 3, state.siblingGroupSessionId),
  }), /another group session/, "one tas_* must never reuse a manifest from another gcs_*");
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memoryEntrySyncFullCount, 1, "inventory should count one full baseline");
  equal(inventory.summary.memoryEntrySyncDeltaCount, 2, "inventory should count changed and removal delta transfers");
  equal(inventory.summary.memoryEntrySyncContinuationCount, 1, "inventory should count one zero-repeat continuation");
  equal(inventory.summary.memoryEntrySyncInvalidCount, 0, "valid manifests should remain clean after restart");
  equal(inventory.summary.memoryEntryRemovedCount, 1, "inventory should count committed entry tombstones");
  equal(inventory.rows.length, 4, "failed tamper and cross-session attempts must not persist snapshots");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(memoryCenter.overall.memoryEntrySyncDeltaCount, 2, "Memory Center should expose per-entry delta transfers");
  equal(memoryCenter.overall.memoryEntrySyncContinuationCount, 1, "Memory Center should expose zero-repeat continuation reuse");
  equal(memoryCenter.overall.memoryEntryRemovedCount, 1, "Memory Center should expose entry tombstones");
  console.log(`PHASE376_STAGE_restart=${JSON.stringify({ checks, deltaChars: delta.plan.transport_text.length, fullChars: delta.memory.rendered_text.length })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 376 mode:${mode}`);
