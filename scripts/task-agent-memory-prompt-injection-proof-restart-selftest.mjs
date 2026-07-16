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

function parseStageOutput(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE352_STAGE_${stage}=`));
  if (!line) throw new Error(`phase352 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-prompt-proof-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE352_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstResult = parseStageOutput(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondResult = parseStageOutput(second.stdout, "restart");
    const checks = Number(firstResult.checks || 0) + Number(secondResult.checks || 0);
    console.log(`PHASE352_RESULT=${JSON.stringify({ checks, passed: checks, prepare: firstResult, restart: secondResult })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE352_HOME;
if (!tempRoot) throw new Error("PHASE352_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const gates = require(path.join(root, "ccm-package", "dist", "agents", "final-dispatch-payload-gate.js"));
const continuationModule = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase352-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function memoryContext(state, groupSessionId) {
  const rendered = `[GROUP_SESSION_MEMORY phase352]\ngroup=${state.groupId}\nsession=${groupSessionId}\nrule=preserve exact child-agent memory context`;
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: state.project,
    rendered_text: rendered,
    memory_policy: { use: "session", ignored: true },
    session_binding: {
      binding_id: `gmb_phase352_${groupSessionId}`,
      task_id: state.taskId,
      task_agent_session_id: state.taskAgentSessionId,
    },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
    typed_memory_recall: [{ rel_path: "stable-rule.md", checksum: "memory-stable", body: "stable rule" }],
  };
}

function bind(state, turn, includeProjection, groupSessionId = state.groupSessionId) {
  const context = memoryContext(state, groupSessionId);
  const prompt = includeProjection
    ? `PHASE352 turn=${turn}\n${context.rendered_text}\nexecute task`
    : `PHASE352 turn=${turn}\ncontinue the committed memory baseline`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase352_${turn}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: context.rendered_text,
    requireMemoryPromptInjectionProof: true,
  });
  return { ...bound, prompt, context };
}

function gateFor(state, bound, prompt) {
  return gates.buildFinalWorkerDispatchPayloadGate({
    renderedPrompt: prompt,
    workerHandoff: { worker_context_packet: { packet_id: bound.snapshot.context.worker_context_packet_id } },
    provider: "codex",
    groupId: state.groupId,
    groupSessionId: state.groupSessionId,
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
  });
}

function deliver(state, bound, prompt, turn, options = {}) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: prompt,
    snapshotRenderedPrompt: prompt,
    executionId: `${state.taskId}-turn-${turn}`,
    runtime: "codex",
    dispatched: true,
    executionSucceeded: true,
    output: `PHASE352 delivered turn ${turn}`,
    nativeSessionId: options.nativeSessionId || "",
    runnerRequestId: options.runnerRequestId || "",
    nativeContinuationEvidence: options.nativeContinuationEvidence || null,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase352-${nonce}`,
    groupSessionId: `gcs_phase352_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase352_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `task-phase352-${nonce}`,
    project: "phase352-project",
  };
  const taskSession = sessions.openTaskAgentSession({
    scopeId: state.taskId,
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
  });
  state.taskAgentSessionId = taskSession.id;
  state.nativeSessionId = taskSession.nativeSessionId || `thread-phase352-${nonce}`;

  let missingProjectionError = null;
  try { bind(state, 1, false); } catch (error) { missingProjectionError = error; }
  equal(missingProjectionError?.code, "TASK_AGENT_MEMORY_PROMPT_INJECTION_REQUIRED", "required memory missing from prompt must fail before snapshot persistence");
  equal(sessions.listTaskAgentMemoryContextSnapshots({ sessionId: state.taskAgentSessionId }).length, 0, "blocked injection must not persist a snapshot");

  const first = bind(state, 1, true);
  const proof = first.snapshot.context.memory_prompt_injection_proof;
  equal(proof.status, "injected", "first snapshot must prove exact memory injection");
  equal(proof.enforcement_required, true, "production-style snapshot must enable fail-closed enforcement");
  equal(proof.prompt_bound, true, "rendered memory projection must be a substring of the prompt");
  ok(sessions.verifyTaskAgentMemoryPromptInjectionProof(proof, {
    groupId: state.groupId,
    groupSessionId: state.groupSessionId,
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
    targetProject: state.project,
    memoryContextChecksum: first.snapshot.context.memory_context_checksum,
    syncChecksum: first.snapshot.context.memory_snapshot_sync.sync_checksum,
    renderedPromptChecksum: first.snapshot.context.rendered_prompt_checksum,
  }).valid, "injection proof must be checksum and identity valid");

  const missingFinalPrompt = `PHASE352 final turn=1 without memory`;
  const blockedAttach = sessions.attachTaskAgentFinalDispatchPayloadGate(state.taskAgentSessionId, {
    snapshotId: first.snapshot.snapshot_id,
    finalDispatchPayloadGate: gateFor(state, first, missingFinalPrompt),
    renderedPrompt: missingFinalPrompt,
  });
  equal(blockedAttach.updated, false, "final prompt rewrite must recheck memory injection");
  equal(blockedAttach.reason, "memory_prompt_injection_required", "final prompt omission must have an explicit reason");

  const finalPrompt = `${first.prompt}\nfinal provider payload`;
  const attached = sessions.attachTaskAgentFinalDispatchPayloadGate(state.taskAgentSessionId, {
    snapshotId: first.snapshot.snapshot_id,
    finalDispatchPayloadGate: gateFor(state, first, finalPrompt),
    renderedPrompt: finalPrompt,
  });
  equal(attached.updated, true, "final prompt containing memory must attach successfully");
  equal(attached.snapshot.context.memory_prompt_injection_proof.prompt_bound, true, "refreshed final proof must remain prompt-bound");
  const committed = deliver(state, attached, finalPrompt, 1, { nativeSessionId: state.nativeSessionId });
  equal(committed.syncCommit.status, "committed", "delivery commit must require the injection proof");
  equal(committed.syncCommit.memory_prompt_injection_proof_checksum, attached.snapshot.context.memory_prompt_injection_proof.proof_checksum, "commit must bind the exact injection proof");
  sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, {
    nativeSessionId: state.nativeSessionId,
    success: true,
  });

  state.firstSnapshotId = attached.snapshot.snapshot_id;
  state.firstCommitChecksum = committed.syncCommit.commit_checksum;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE352_STAGE_prepare=${JSON.stringify({ checks, proof: proof.proof_checksum })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.memorySnapshotSyncCommitChecksum, state.firstCommitChecksum, "proof-bound commit must survive restart");

  const continuation = bind(state, 2, false);
  equal(continuation.snapshot.context.memory_snapshot_sync.action, "none", "committed equal memory may use continuation baseline");
  equal(continuation.snapshot.context.memory_prompt_injection_proof.status, "continuation_baseline", "none action may omit redundant full memory projection");
  equal(continuation.snapshot.context.memory_prompt_injection_proof.prompt_bound, false, "continuation baseline must not claim full projection injection");
  equal(continuation.snapshot.context.memory_prompt_injection_proof.memory_injection_required, false, "none action must explicitly mark injection optional");
  const runnerRequestId = `phase352-resume-${Date.now().toString(36)}`;
  const providerOutput = runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: state.nativeSessionId }));
  const nativeContinuationEvidence = continuationModule.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: state.nativeSessionId,
    returnedNativeSessionId: state.nativeSessionId,
    providerOutputContractEvidence: providerOutput.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  const continuationDelivery = deliver(state, continuation, continuation.prompt, 2, {
    nativeSessionId: state.nativeSessionId,
    runnerRequestId,
    nativeContinuationEvidence,
  });
  equal(continuationDelivery.syncCommit.status, "committed", "continuation-reference delivery must remain commit eligible");

  let crossSessionError = null;
  try { bind(state, 3, true, state.siblingGroupSessionId); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "prompt proof must preserve exact gcs isolation");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memoryPromptInjectionProofCount, 2, "inventory must count prompt injection proofs");
  equal(inventory.summary.memoryPromptInjectionEnforcedCount, 2, "inventory must count enforced proofs");
  equal(inventory.summary.memoryPromptInjectionPromptBoundCount, 1, "only full injection should be prompt-bound");
  equal(inventory.summary.memoryPromptInjectionInvalidCount, 0, "valid injection proofs must not be reported invalid");

  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memoryPromptInjectionEnforcedCount, 2, "Memory Center must expose enforced prompt proofs");
  ok(report.rows.some(row => row.memoryPromptInjectionProofStatus === "continuation_baseline" && row.memorySnapshotSyncCommitted), "Memory Center must expose committed continuation baseline rows");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf8");
  ok((collaborationSource.match(/requireMemoryPromptInjectionProof:\s*true/g) || []).length >= 3, "group, fallback, and direct production entrypoints must enforce prompt proof");
  ok(routesSource.includes("requireMemoryPromptInjectionProof: true"), "auto-assign production entrypoint must enforce prompt proof");
  console.log(`PHASE352_STAGE_restart=${JSON.stringify({ checks, enforced: report.overall.memoryPromptInjectionEnforcedCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase352 mode: ${mode}`);
