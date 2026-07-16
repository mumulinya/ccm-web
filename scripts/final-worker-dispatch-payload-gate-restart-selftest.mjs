import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.includes("--child")) {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  const gateModule = require(dist("agents", "final-dispatch-payload-gate.js"));
  const lineage = require(dist("tasks", "task-agent-invocation-lineage.js"));
  const agentSessions = require(dist("tasks", "agent-sessions.js"));
  const fixtureFile = path.join(os.homedir(), ".cc-connect", "phase315-final-dispatch-fixture.json");

  if (process.argv.includes("--verify-restart")) {
    const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
    const readyEdge = lineage.findTaskAgentInvocationEdge(fixture.readyEdgeId);
    const blockedEdge = lineage.findTaskAgentInvocationEdge(fixture.blockedEdgeId);
    let blockedError = null;
    try {
      lineage.dispatchTaskAgentInvocationEdge(blockedEdge, { transport: "codex" });
    } catch (error) {
      blockedError = error;
    }
    const checks = {
      readyGateSurvivesRestart: readyEdge?.final_dispatch_payload_gate?.status === "ready"
        && readyEdge.final_dispatch_payload_gate_valid === true,
      readyEdgeStillVerifies: lineage.verifyTaskAgentInvocationEdge(readyEdge).valid === true,
      blockedGateSurvivesRestart: blockedEdge?.final_dispatch_payload_gate?.status === "recompact_required"
        && blockedEdge.final_dispatch_payload_gate?.provider_call_allowed === false,
      blockedDispatchStillFailsClosed: blockedError?.code === "TASK_AGENT_FINAL_DISPATCH_PAYLOAD_BLOCKED",
      exactSessionIdentitySurvivesRestart: readyEdge?.group_id === fixture.groupId
        && readyEdge?.group_session_id === fixture.groupSessionId
        && blockedEdge?.group_session_id === fixture.groupSessionId,
    };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase315-final-worker-dispatch-payload-gate-restart-selftest-v1", checks }, null, 2)}\n`);
    process.exit(0);
  }

  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase315-final-dispatch-${nonce}`;
  const groupSessionId = `gcs_phase315_${nonce}`;
  const capacity = {
    schema: "ccm-model-context-capacity-v1",
    provider: "codex",
    model: "phase315-small-window",
    contextWindow: 32_000,
    reservedOutputTokens: 8_000,
    effectiveContextWindow: 24_000,
    autoCompactBufferTokens: 3_000,
    autoCompactThreshold: 21_000,
    source: "phase315_selftest",
    evidenceChecksum: "phase315-capacity",
  };
  const packet = {
    packet_id: `wcp_phase315_${nonce}`,
    group: { id: groupId },
    group_session_id: groupSessionId,
    task_id: `task-phase315-${nonce}`,
    model_context_capacity: capacity,
    context_usage: { total_tokens: 1200, capacity_provenance: capacity },
  };
  const identity = {
    groupId,
    groupSessionId,
    taskId: packet.task_id,
    workerContextPacket: packet,
    provider: "codex",
    model: capacity.model,
  };
  const readyPrompt = `PHASE315_READY ${"small final worker prompt ".repeat(80)}`;
  const blockedPrompt = `PHASE315_BLOCKED ${"large final worker prompt ".repeat(18_000)}`;
  const readyGate = gateModule.buildFinalWorkerDispatchPayloadGate({
    ...identity,
    taskAgentSessionId: `tas_phase315_ready_${nonce}`,
    renderedPrompt: readyPrompt,
  });
  const blockedGate = gateModule.buildFinalWorkerDispatchPayloadGate({
    ...identity,
    taskAgentSessionId: `tas_phase315_blocked_${nonce}`,
    renderedPrompt: blockedPrompt,
  });
  const tamperedGate = { ...readyGate, estimated_total_input_tokens: readyGate.estimated_total_input_tokens + 1 };
  const readyPrepared = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId: packet.task_id,
    targetProject: "api",
    taskAgentSessionId: readyGate.task_agent_session_id,
  });
  const readyBound = lineage.bindTaskAgentInvocationContext(readyPrepared, {
    workerContextPacketId: packet.packet_id,
    memoryContextSnapshotId: `snapshot-ready-${nonce}`,
    renderedPrompt: readyPrompt,
    finalDispatchPayloadGate: readyGate,
  });
  const blockedPrepared = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId: packet.task_id,
    targetProject: "api",
    taskAgentSessionId: blockedGate.task_agent_session_id,
  });
  const blockedBound = lineage.bindTaskAgentInvocationContext(blockedPrepared, {
    workerContextPacketId: packet.packet_id,
    memoryContextSnapshotId: `snapshot-blocked-${nonce}`,
    renderedPrompt: blockedPrompt,
    finalDispatchPayloadGate: blockedGate,
  });
  let blockedError = null;
  try {
    lineage.dispatchTaskAgentInvocationEdge(blockedBound, { transport: "codex" });
  } catch (error) {
    blockedError = error;
  }
  const productionSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const memoryCenterSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const snapshotSession = agentSessions.openTaskAgentSession({
    scopeId: packet.task_id,
    taskId: packet.task_id,
    groupId,
    project: "api",
    agentType: "codex",
  });
  const snapshotPacket = { ...packet, memory: { marker: "phase315-snapshot-memory" } };
  const snapshotGate = gateModule.buildFinalWorkerDispatchPayloadGate({
    ...identity,
    workerContextPacket: snapshotPacket,
    taskAgentSessionId: snapshotSession.id,
    renderedPrompt: readyPrompt,
  });
  const snapshotBinding = agentSessions.bindTaskAgentMemoryContextSnapshot(snapshotSession.id, {
    taskId: packet.task_id,
    groupId,
    project: "api",
    agentType: "codex",
    workerContextPacket: snapshotPacket,
    memoryContext: snapshotPacket.memory,
    renderedPrompt: readyPrompt,
  });
  const finalSnapshotBinding = agentSessions.attachTaskAgentFinalDispatchPayloadGate(snapshotSession.id, {
    snapshotId: snapshotBinding.snapshot.snapshot_id,
    finalDispatchPayloadGate: snapshotGate,
    renderedPrompt: readyPrompt,
  });
  const snapshotInventory = agentSessions.buildTaskAgentMemoryContextSnapshotInventory({ sessionId: snapshotSession.id });
  const gateCallIndex = productionSource.indexOf("finalDispatchPayloadGate = buildFinalWorkerDispatchPayloadGate");
  const providerCallIndex = productionSource.indexOf("const attemptOutput = await ctx.callAgentForGroupStream", gateCallIndex);
  const checks = {
    readyPromptIsAllowed: readyGate.status === "ready"
      && readyGate.provider_call_allowed === true
      && readyGate.estimated_total_input_tokens < readyGate.auto_compact_threshold,
    largeFinalPromptRequiresRecompact: blockedGate.status === "recompact_required"
      && blockedGate.provider_call_allowed === false
      && blockedGate.estimated_total_input_tokens >= blockedGate.auto_compact_threshold,
    exactPromptAndIdentityVerify: gateModule.verifyFinalWorkerDispatchPayloadGate(readyGate, {
      renderedPrompt: readyPrompt,
      groupId,
      groupSessionId,
      taskId: packet.task_id,
      taskAgentSessionId: readyGate.task_agent_session_id,
      workerContextPacketId: packet.packet_id,
    }).valid === true,
    tamperedGateRejected: gateModule.verifyFinalWorkerDispatchPayloadGate(tamperedGate).valid === false,
    lineageBindsReadyGate: readyBound.final_dispatch_payload_gate_required === true
      && readyBound.final_dispatch_payload_gate_valid === true
      && readyBound.final_dispatch_payload_gate_checksum === readyGate.gate_checksum,
    lineageBindsBlockedGate: blockedBound.final_dispatch_payload_gate_status === "recompact_required"
      && blockedBound.final_dispatch_payload_gate_valid === true,
    lineageBlocksBeforeRunner: blockedError?.code === "TASK_AGENT_FINAL_DISPATCH_PAYLOAD_BLOCKED",
    productionGateRunsBeforeProviderCall: gateCallIndex > 0
      && providerCallIndex > gateCallIndex
      && productionSource.slice(gateCallIndex, providerCallIndex).includes("provider_call_allowed !== true"),
    productionPacketCarriesGate: productionSource.slice(gateCallIndex, providerCallIndex).includes("final_dispatch_payload_gate: finalDispatchPayloadGate")
      && productionSource.slice(gateCallIndex, providerCallIndex).includes("finalDispatchPayloadGate,"),
    productionSnapshotCarriesGate: productionSource.slice(gateCallIndex, providerCallIndex).includes("attachTaskAgentFinalDispatchPayloadGate")
      && finalSnapshotBinding.updated === true
      && snapshotInventory.summary?.finalDispatchGateReadyCount === 1
      && snapshotInventory.summary?.finalDispatchGateMissingCount === 0
      && snapshotInventory.rows?.[0]?.finalDispatchPayloadGateValid === true
      && snapshotInventory.rows?.[0]?.finalDispatchPromptBound === true,
    memoryCenterExposesFinalPromptGate: memoryCenterSource.includes("finalDispatchPromptTokens")
      && memoryCenterSource.includes("finalDispatchAutoCompactThreshold")
      && memoryCenterSource.includes("finalDispatchLineageProofValid")
      && memoryCenterSource.includes("finalDispatchGateBlockedCount"),
    gateContainsNoPromptBody: !JSON.stringify(readyGate).includes("PHASE315_READY")
      && !JSON.stringify(blockedGate).includes("PHASE315_BLOCKED"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, readyGate, blockedGate }, null, 2));
  agentSessions.purgeTaskAgentSessions(packet.task_id);
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, readyEdgeId: readyBound.invocation_edge_id, blockedEdgeId: blockedBound.invocation_edge_id }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase315-final-worker-dispatch-payload-gate-selftest-v1", checks, tokens: { ready: readyGate.estimated_total_input_tokens, blocked: blockedGate.estimated_total_input_tokens, threshold: blockedGate.auto_compact_threshold } }, null, 2)}\n`);
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase315-final-dispatch-"));
try {
  for (const mode of [["--child"], ["--child", "--verify-restart"]]) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...mode], {
      cwd: root,
      env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
      encoding: "utf8",
      timeout: 120_000,
    });
    if (child.status !== 0) {
      process.stderr.write(child.stdout || "");
      process.stderr.write(child.stderr || "");
      process.exit(child.status || 1);
    }
    process.stdout.write(child.stdout);
  }
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
