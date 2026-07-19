import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = "CCM_PHASE392=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    memory: require(dist("modules", "collaboration", "memory.js")),
    lifecycle: require(dist("modules", "collaboration", "group-session-lifecycle-head.js")),
    sessions: require(dist("tasks", "agent-sessions.js")),
    center: require(dist("modules", "knowledge", "memory-control-center-api.js")),
    gate: require(dist("agents", "final-dispatch-payload-gate.js")),
    reactive: require(dist("agents", "final-dispatch-reactive-compact.js")),
  };
}

function writeResult(value) {
  process.stdout.write(`${marker}${JSON.stringify(value)}\n`);
}

function runStage(stage, home, fixtureFile) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), stage, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 180_000,
  });
  if (child.status !== 0) {
    process.stderr.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    process.exit(child.status || 1);
  }
  const line = String(child.stdout || "").split(/\r?\n/).find(row => row.startsWith(marker));
  if (!line) throw new Error(`${stage} missing result`);
  return JSON.parse(line.slice(marker.length));
}

function contextFor(label) {
  return [
    ...Array.from({ length: 440 }, (_, index) => `${label}-${index}: ${"model-visible exact-session context ".repeat(14)}`),
    `${label}-LATEST: 必须保留当前群聊会话目标和约束。`,
  ].join("\n");
}

function buildGateAtEstimate(gate, input, targetTokens) {
  let low = 1;
  let high = targetTokens * 8;
  let best = null;
  while (low <= high) {
    const chars = Math.floor((low + high) / 2);
    const prompt = "x".repeat(chars);
    const candidate = gate.buildFinalWorkerDispatchPayloadGate({ ...input, renderedPrompt: prompt });
    best = { prompt, gate: candidate };
    if (candidate.estimated_total_input_tokens < targetTokens) low = chars + 1;
    else if (candidate.estimated_total_input_tokens > targetTokens) high = chars - 1;
    else return best;
  }
  return best;
}

function createBoundSnapshot(input) {
  const { memory, sessions } = modules();
  const taskSession = sessions.openTaskAgentSession({
    scopeId: input.taskId,
    taskId: input.taskId,
    groupId: input.groupId,
    project: input.project,
    agentType: input.provider,
  });
  let memoryContext = memory.buildAgentMemoryContextBundle(input.groupId, input.project, input.taskId, {
    groupSessionId: input.groupSessionId,
    taskId: input.taskId,
    taskAgentSessionId: taskSession.id,
    nativeSessionId: `${input.provider}-native-${input.groupSessionId}`,
    agentType: input.provider,
  });
  const entrySync = sessions.prepareTaskAgentMemoryEntrySyncContext(taskSession.id, memoryContext);
  if (entrySync.prepared === true) memoryContext = entrySync.memoryContext;
  const packet = {
    packet_id: `wcp_${input.groupSessionId}`,
    group_session_id: input.groupSessionId,
    task_id: input.taskId,
    task_agent_session_id: taskSession.id,
    model_context_capacity: input.capacity,
    memory: memoryContext,
  };
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId: input.taskId,
    groupId: input.groupId,
    project: input.project,
    agentType: input.provider,
    nativeSessionId: `${input.provider}-native-${input.groupSessionId}`,
    turn: 1,
    executionId: `exec-${input.groupSessionId}`,
    traceId: `trace-${input.groupSessionId}`,
    workerContextPacket: packet,
    memoryContext,
    renderedPrompt: input.originalPrompt,
  });
  return { taskSession, memoryContext, packet, bound };
}

function createStage(fixtureFile, calibrated = false) {
  const { memory, lifecycle, sessions, gate, reactive } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase392-group-${nonce}`;
  const sessionA = `gcs_phase392_a_${nonce}`;
  const sessionB = `gcs_phase392_b_${nonce}`;
  for (const groupSessionId of [sessionA, sessionB]) {
    const row = memory.createEmptyGroupMemory(groupId, groupSessionId);
    row.persistentRequirements = [{ text: `exact memory for ${groupSessionId}`, source: { sessionId: groupSessionId } }];
    memory.saveGroupMemory(groupId, row, groupSessionId);
    lifecycle.ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "phase392_setup" });
  }

  const baseA = "PHASE392_A_MEMORY_SENTINEL\n";
  const recentA = contextFor("SESSION-A");
  const renderA = value => `${baseA}${value}`;
  const originalPromptA = renderA(recentA);
  const capacityA = {
    provider: "codex",
    model: "phase392-codex-model",
    contextWindow: 64_000,
    reservedOutputTokens: 8_000,
    effectiveContextWindow: 56_000,
    autoCompactBufferTokens: 8_000,
    autoCompactThreshold: 48_000,
    source: "phase392_test_capacity",
    evidenceChecksum: "capacity-a-proof",
  };
  const boundA = createBoundSnapshot({ groupId, groupSessionId: sessionA, taskId: `task-a-${nonce}`, project: "api", provider: "codex", capacity: capacityA, originalPrompt: originalPromptA });
  const originalGateA = gate.buildFinalWorkerDispatchPayloadGate({
    renderedPrompt: originalPromptA,
    workerContextPacket: boundA.packet,
    modelContextCapacity: capacityA,
    provider: "codex",
    model: "phase392-codex-model",
    groupId,
    groupSessionId: sessionA,
    taskId: `task-a-${nonce}`,
    taskAgentSessionId: boundA.taskSession.id,
  });
  const recoveredA = reactive.recoverFinalWorkerDispatchPayload({
    renderedPrompt: originalPromptA,
    recentContext: recentA,
    renderPrompt: renderA,
    finalDispatchPayloadGate: originalGateA,
    workerHandoff: { agent_type: "codex", worker_context_packet: boundA.packet },
    modelContextCapacity: capacityA,
    provider: "codex",
    model: "phase392-codex-model",
    groupId,
    groupSessionId: sessionA,
    taskId: `task-a-${nonce}`,
    taskAgentSessionId: boundA.taskSession.id,
  });
  assert.equal(recoveredA.recovered, false, JSON.stringify(recoveredA.receipt));
  assert.equal(recoveredA.receipt?.status, "blocked", JSON.stringify(recoveredA.receipt));
  assert.equal(recoveredA.gate.provider_call_allowed, false, JSON.stringify(recoveredA.gate));
  const attachedA = sessions.attachTaskAgentFinalDispatchPayloadGate(boundA.taskSession.id, {
    snapshotId: boundA.bound.snapshot.snapshot_id,
    finalDispatchPayloadGate: recoveredA.gate,
    finalDispatchReactiveCompact: recoveredA.receipt,
    renderedPrompt: recoveredA.prompt,
  });
  assert.equal(attachedA.updated, true, JSON.stringify(attachedA));
  if (calibrated) {
    const baselineCandidate = buildGateAtEstimate(gate, {
      workerContextPacket: boundA.packet,
      modelContextCapacity: capacityA,
      provider: "codex",
      model: "phase392-codex-model",
      groupId,
      groupSessionId: sessionA,
      taskId: `task-a-${nonce}`,
      taskAgentSessionId: boundA.taskSession.id,
    }, 7_367);
    assert.equal(baselineCandidate.gate.estimated_total_input_tokens, 7_367, JSON.stringify(baselineCandidate.gate));
    assert.equal(baselineCandidate.gate.provider_call_allowed, true, JSON.stringify(baselineCandidate.gate));
    const baselineAttached = sessions.attachTaskAgentFinalDispatchPayloadGate(boundA.taskSession.id, {
      snapshotId: attachedA.snapshot.snapshot_id,
      finalDispatchPayloadGate: baselineCandidate.gate,
      renderedPrompt: baselineCandidate.prompt,
    });
    assert.equal(baselineAttached.updated, true, JSON.stringify(baselineAttached));
    sessions.recordTaskAgentMemoryContextDelivery(boundA.taskSession.id, {
    snapshotId: baselineAttached.snapshot.snapshot_id,
    renderedPrompt: baselineCandidate.prompt,
    snapshotRenderedPrompt: baselineCandidate.prompt,
    executionId: `exec-${sessionA}`,
    traceId: `trace-${sessionA}`,
    runtime: "codex",
    nativeSessionId: `codex-native-${sessionA}`,
    runnerRequestId: `runner-${sessionA}`,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: "phase393 calibrated delivery complete",
    providerUsage: {
      reported: true,
      inputTokens: 7_800,
      directInputTokens: 2_000,
      cacheReadInputTokens: 5_500,
      cacheCreationInputTokens: 300,
      outputTokens: 500,
      providerTotalTokens: 8_300,
      totalTokens: 8_300,
    },
    model: "phase392-codex-model",
    providerContractId: "phase395-codex-contract-v1",
    providerRuntimeVersion: "phase395-codex-runtime-v1",
  });
  }

  const promptB = "PHASE392_B_MEMORY_SENTINEL\nshort exact-session prompt";
  const capacityB = {
    provider: "cursor",
    model: "phase392-cursor-model",
    contextWindow: 1_000_000,
    reservedOutputTokens: 100_000,
    effectiveContextWindow: 900_000,
    autoCompactBufferTokens: 100_000,
    autoCompactThreshold: 800_000,
    source: "phase392_test_capacity",
    evidenceChecksum: "capacity-b-proof",
  };
  const boundB = createBoundSnapshot({ groupId, groupSessionId: sessionB, taskId: `task-b-${nonce}`, project: "web", provider: "cursor", capacity: capacityB, originalPrompt: promptB });
  const gateB = gate.buildFinalWorkerDispatchPayloadGate({
    renderedPrompt: promptB,
    workerContextPacket: boundB.packet,
    modelContextCapacity: capacityB,
    provider: "cursor",
    model: "phase392-cursor-model",
    groupId,
    groupSessionId: sessionB,
    taskId: `task-b-${nonce}`,
    taskAgentSessionId: boundB.taskSession.id,
  });
  const attachedB = sessions.attachTaskAgentFinalDispatchPayloadGate(boundB.taskSession.id, {
    snapshotId: boundB.bound.snapshot.snapshot_id,
    finalDispatchPayloadGate: gateB,
    renderedPrompt: promptB,
  });
  assert.equal(attachedB.updated, true, JSON.stringify(attachedB));
  if (calibrated) sessions.recordTaskAgentMemoryContextDelivery(boundB.taskSession.id, {
    snapshotId: attachedB.snapshot.snapshot_id,
    renderedPrompt: promptB,
    snapshotRenderedPrompt: promptB,
    executionId: `exec-${sessionB}`,
    traceId: `trace-${sessionB}`,
    runtime: "cursor",
    nativeSessionId: `cursor-native-${sessionB}`,
    runnerRequestId: `runner-${sessionB}`,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: "phase393 unreported sibling delivery complete",
    model: "phase392-cursor-model",
  });

  const fixture = {
    groupId, sessionA, sessionB,
    taskSessionA: boundA.taskSession.id,
    taskSessionB: boundB.taskSession.id,
    recoveredPromptTokensA: recoveredA.gate.estimated_total_input_tokens,
    thresholdA: recoveredA.gate.auto_compact_threshold,
    calibrated,
  };
  fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
  fs.writeFileSync(fixtureFile, JSON.stringify(fixture, null, 2), "utf8");
  writeResult({ pass: true, fixture, collapseApplied: !!recoveredA.receipt?.context_collapse });
}

const stage = process.argv[2] || "orchestrate";
if (stage === "create") createStage(process.argv[3], false);
else if (stage === "create-calibrated") createStage(process.argv[3], true);
else throw new Error("fixture helper requires create or create-calibrated stage");
