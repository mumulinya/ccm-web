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
  const gates = require(dist("agents", "final-dispatch-payload-gate.js"));
  const reactive = require(dist("agents", "final-dispatch-reactive-compact.js"));
  const sessions = require(dist("tasks", "agent-sessions.js"));
  const fixtureFile = path.join(os.homedir(), ".cc-connect", "phase316-reactive-compact-fixture.json");

  if (process.argv.includes("--verify-restart")) {
    const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
    const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ sessionId: fixture.sessionId });
    const row = inventory.rows?.[0] || {};
    const checks = {
      exactSessionSnapshotSurvivesRestart: row.groupId === fixture.groupId
        && row.groupSessionId === fixture.groupSessionId
        && row.sessionId === fixture.sessionId,
      recoveredReceiptSurvivesRestart: row.finalDispatchReactiveCompactStatus === "blocked"
        && row.finalDispatchReactiveCompactValid === true,
      recoveredGateSurvivesRestart: row.finalDispatchStatus === "recompact_required"
        && row.finalDispatchPayloadGateValid === true,
      snapshotChecksumSurvivesRestart: row.checksumMatches === true,
      inventoryCountsRecoveredAttempt: inventory.summary?.finalDispatchReactiveCompactBlockedCount === 1
        && inventory.summary?.finalDispatchReactiveCompactInvalidCount === 0,
    };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, row }, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase316-final-dispatch-reactive-compact-restart-selftest-v1", checks }, null, 2)}\n`);
    process.exit(0);
  }

  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase316-reactive-${nonce}`;
  const groupSessionId = `gcs_phase316_${nonce}`;
  const taskId = `task-phase316-${nonce}`;
  const capacity = {
    provider: "codex",
    model: "phase316-small-window",
    contextWindow: 32_000,
    reservedOutputTokens: 8_000,
    effectiveContextWindow: 24_000,
    autoCompactBufferTokens: 3_000,
    autoCompactThreshold: 21_000,
    source: "phase316_selftest",
    evidenceChecksum: "phase316-capacity",
  };
  const session = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: "api", agentType: "codex" });
  const packet = {
    packet_id: `wcp_phase316_${nonce}`,
    group_session_id: groupSessionId,
    task_id: taskId,
    model_context_capacity: capacity,
    memory: { marker: "PHASE316_MEMORY_SENTINEL" },
  };
  const recentContext = Array.from({ length: 5000 }, (_, index) => `older-message-${index}: historical implementation discussion ${"detail ".repeat(8)}`).join("\n")
    + "\n必须保留：当前群聊决定使用精确 gcs 会话。\nLATEST_CONTEXT_SENTINEL";
  const renderPrompt = context => [
    "FIXED_CONTRACT_SENTINEL: do not revert existing work.",
    "[群聊近期上下文]",
    context,
    "CURRENT_TASK_SENTINEL: implement and verify the requested code change.",
  ].join("\n");
  const originalPrompt = renderPrompt(recentContext);
  const identity = {
    workerHandoff: { worker_context_packet: packet },
    provider: "codex",
    model: capacity.model,
    groupId,
    groupSessionId,
    taskId,
    taskAgentSessionId: session.id,
  };
  const originalGate = gates.buildFinalWorkerDispatchPayloadGate({ ...identity, renderedPrompt: originalPrompt });
  const recovered = reactive.recoverFinalWorkerDispatchPayload({
    ...identity,
    renderedPrompt: originalPrompt,
    recentContext,
    renderPrompt,
    finalDispatchPayloadGate: originalGate,
  });
  const receiptVerification = reactive.verifyFinalDispatchReactiveCompactReceipt(recovered.receipt, {
    groupId,
    groupSessionId,
    taskId,
    taskAgentSessionId: session.id,
    workerContextPacketId: packet.packet_id,
  });
  const tamperedReceipt = { ...recovered.receipt, recovered_prompt_tokens: recovered.receipt.recovered_prompt_tokens + 1 };
  const fixedOverflow = reactive.recoverFinalWorkerDispatchPayload({
    ...identity,
    renderedPrompt: `${"FIXED_OVERFLOW ".repeat(30_000)}\n${recentContext}`,
    recentContext,
    renderPrompt: context => `${"FIXED_OVERFLOW ".repeat(30_000)}\n${context}\nCURRENT_TASK_SENTINEL`,
  });
  const providerMeasuredContext = Array.from({ length: 420 }, (_, index) => `provider-measured-${index} ${"detail ".repeat(8)}`).join("\n") + "\nLATEST_PROVIDER_MEASURED_CONTEXT";
  const providerMeasuredPrompt = renderPrompt(providerMeasuredContext);
  const providerMeasuredGate = gates.buildFinalWorkerDispatchPayloadGate({ ...identity, renderedPrompt: providerMeasuredPrompt });
  const providerMeasuredRecovery = reactive.recoverFinalWorkerDispatchPayload({
    ...identity,
    renderedPrompt: providerMeasuredPrompt,
    recentContext: providerMeasuredContext,
    renderPrompt,
    finalDispatchPayloadGate: providerMeasuredGate,
    forceReactiveCompact: true,
  });
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(session.id, {
    taskId,
    groupId,
    project: "api",
    agentType: "codex",
    workerContextPacket: packet,
    memoryContext: packet.memory,
    renderedPrompt: originalPrompt,
  });
  const attached = sessions.attachTaskAgentFinalDispatchPayloadGate(session.id, {
    snapshotId: bound.snapshot.snapshot_id,
    finalDispatchPayloadGate: recovered.gate,
    finalDispatchReactiveCompact: recovered.receipt,
    renderedPrompt: recovered.prompt,
  });
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ sessionId: session.id });
  const row = inventory.rows?.[0] || {};
  const productionSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-cross-agents-part-02-part-02.ts"), "utf8");
  const recoveryIndex = productionSource.indexOf("recoverFinalWorkerDispatchPayload({");
  const providerIndex = productionSource.indexOf("const attemptOutput = await ctx.callAgentForGroupStream", recoveryIndex);
  const checks = {
    recentContextOverflowDetected: originalGate.status === "recompact_required",
    recentContextAutomaticallyRecovered: recovered.recovered === false
      && recovered.gate.status === "recompact_required"
      && recovered.gate.provider_call_allowed === false,
    recoveryUsesModelThresholdBudget: recovered.receipt.recent_context_budget_tokens === 0
      && recovered.receipt.action === "rotate_native_generation_and_reinject_canonical_parent_context",
    currentTaskAndContractPreserved: recovered.prompt.includes("CURRENT_TASK_SENTINEL")
      && recovered.prompt.includes("FIXED_CONTRACT_SENTINEL")
      && recovered.prompt.includes("LATEST_CONTEXT_SENTINEL"),
    contextActuallyProjected: recovered.prompt === originalPrompt
      && recovered.receipt.recent_context_projected_tokens === 0
      && recovered.receipt.omitted_context_lines === 0,
    receiptIsExactAndBodyFree: receiptVerification.valid === true
      && recovered.receipt.attempt === 1
      && !JSON.stringify(recovered.receipt).includes("LATEST_CONTEXT_SENTINEL")
      && !JSON.stringify(recovered.receipt).includes("older-message-"),
    tamperedReceiptRejected: reactive.verifyFinalDispatchReactiveCompactReceipt(tamperedReceipt).valid === false,
    fixedPromptOverflowFailsClosed: fixedOverflow.recovered === false
      && fixedOverflow.receipt.status === "blocked"
      && fixedOverflow.gate.provider_call_allowed === false,
    providerPromptTooLongIsRecognized: reactive.isProviderPromptTooLongFailure("HTTP 413 prompt_too_long: maximum context length exceeded") === true
      && reactive.isProviderPromptTooLongFailure("ordinary provider timeout") === false,
    providerMeasuredOverflowRetriesOnce: providerMeasuredGate.status === "ready"
      && providerMeasuredRecovery.recovered === false
      && providerMeasuredRecovery.receipt.trigger === "provider_prompt_too_long"
      && providerMeasuredRecovery.receipt.attempt === 1
      && providerMeasuredRecovery.receipt.recovery_stages.includes("native_generation_rotation_required"),
    snapshotBindsRecoveredPrompt: attached.updated === true
      && row.checksumMatches === true
      && row.finalDispatchReactiveCompactValid === true
      && row.finalDispatchReactiveCompactStatus === "blocked"
      && row.finalDispatchPromptBound === true,
    productionRecoversBeforeProvider: productionSource.includes("const finalDispatchRecoveryRequested = false")
      && productionSource.includes("canonical_parent_continuity_exceeds_threshold")
      && productionSource.includes("local summary or")
      && providerIndex > 0,
    productionSchedulesSingleProviderRetry: productionSource.includes("providerPromptTooLongReactiveRetryAttempted")
      && productionSource.includes("isProviderPromptTooLongFailure(targetSessionError || attemptOutput)")
      && productionSource.includes("runtimeCandidates.splice(attemptIndex + 1, 0, normalizeAgentRuntimeId(activeRuntime))")
      && productionSource.includes("nativeSessionInvalid: isProviderPromptTooLongFailure"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, originalGate, receipt: recovered.receipt, fixed: fixedOverflow.receipt, row }, null, 2));
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, taskId, sessionId: session.id }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase316-final-dispatch-reactive-compact-selftest-v1", checks, tokens: { original: originalGate.estimated_total_input_tokens, recovered: recovered.gate.estimated_total_input_tokens, threshold: recovered.gate.auto_compact_threshold } }, null, 2)}\n`);
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase316-reactive-compact-"));
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
