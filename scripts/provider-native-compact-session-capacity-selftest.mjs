import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const receipts = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-native-compact-execution-receipt.js"));
const capacity = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-native-compact-session-capacity.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase298-capacity-${nonce}`;
const sessionA = `gcs_${nonce}_capacity_a`;
const sessionB = `gcs_${nonce}_capacity_b`;
const taskAgentSessionId = `tas_${nonce}`;
const nativeSessionId = `native_${nonce}`;

const editPlan = compaction.buildGroupApiMicroCompactEditPlan([
  { id: "phase298-thinking", role: "assistant", content: [{ type: "thinking", thinking: "old reasoning" }] },
  { id: "phase298-tool", role: "assistant", content: [{ type: "tool_use", id: "read-298", name: "Read", input: { file_path: "src/capacity.ts" } }] },
  { id: "phase298-result", role: "user", content: [{ type: "tool_result", tool_use_id: "read-298", content: "old result" }] },
], {
  groupId,
  targetProject: "api",
  activeTokens: 3_000_000,
  maxInputTokens: 4_000_000,
  targetInputTokens: 180_000,
  force: true,
  now: "2026-07-15T12:00:00.000Z",
});

function nativePlan(executionId, runnerRequestId) {
  return compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId: sessionA,
    targetProject: "api",
    agentType: "anthropic-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    betaHeaders: ["context-management-2025-06-27"],
    taskAgentSessionId,
    nativeSessionId,
    executionId,
    runnerRequestId,
    memoryContextSnapshotId: `mcs_${executionId}`,
    memoryContextSnapshotChecksum: `checksum_${executionId}`,
    now: `2026-07-15T12:0${executionId.endsWith("1") ? "1" : "2"}:00.000Z`,
  });
}

function recordApplied(plan, requestId, sentAt, inputTokens, clearedInputTokens) {
  return receipts.recordProviderNativeCompactExecutionReceipt({
    apiMicrocompactNativeApplyPlan: plan,
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    executionId: plan.execution_id,
    runnerRequestId: plan.runner_request_id,
    memoryContextSnapshotId: plan.memory_context_snapshot_id,
    memoryContextSnapshotChecksum: plan.memory_context_snapshot_checksum,
    requestBody: {
      model: "claude-phase298-selftest",
      messages: [{ role: "user", content: "body must not persist" }],
      context_management: plan.requestPatch.body.context_management,
    },
    headers: { "anthropic-beta": "context-management-2025-06-27" },
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase298-selftest",
    endpoint: "https://api.anthropic.com/v1/messages?secret=must-not-persist",
    responseStatus: 200,
    requestId,
    responseBody: {
      usage: { input_tokens: inputTokens, output_tokens: 900 },
      context_management: {
        applied_edits: [{ type: "clear_tool_uses_20250919", cleared_tool_uses: 6, cleared_input_tokens: clearedInputTokens }],
      },
    },
    sentAt,
    ok: true,
  });
}

const stateFile = capacity.getProviderNativeCompactSessionCapacityLedgerFile(groupId, sessionA);
const receiptFile = receipts.getProviderNativeCompactExecutionReceiptLedgerFile(groupId, sessionA);

try {
  const plan1 = nativePlan(`exec_${nonce}_1`, `runner_${nonce}_1`);
  const plan2 = nativePlan(`exec_${nonce}_2`, `runner_${nonce}_2`);
  const first = recordApplied(plan1, `req_${nonce}_1`, "2026-07-15T12:01:10.000Z", 280_000, 48_000);
  const second = recordApplied(plan2, `req_${nonce}_2`, "2026-07-15T12:02:10.000Z", 260_000, 48_000);
  const beforeConsume = capacity.buildProviderNativeCompactSessionCapacitySummary(groupId, sessionA);
  const baseline = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    rawActiveTokens: 3_000_000,
    consumedAt: "2026-07-15T12:03:00.000Z",
  });
  const repeated = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    rawActiveTokens: 3_020_000,
    consumedAt: "2026-07-15T12:04:00.000Z",
  });
  const afterRestartRead = capacity.readProviderNativeCompactSessionCapacityLedger(groupId, sessionA);
  const afterConsume = capacity.buildProviderNativeCompactSessionCapacitySummary(groupId, sessionA);
  const wrongGroupSession = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionB,
    taskAgentSessionId,
    nativeSessionId,
    rawActiveTokens: 3_000_000,
  });
  const wrongNativeSession = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId: `${nativeSessionId}_other`,
    rawActiveTokens: 3_000_000,
  });
  capacity.recordProviderNativeCompactSessionOutcome({
    version: 1,
    group_id: groupId,
    group_session_id: sessionB,
    task_agent_session_id: `${taskAgentSessionId}_legacy`,
    native_session_id: `${nativeSessionId}_legacy`,
    receipt_id: `pncer_legacy_${nonce}`,
    receipt_checksum: `legacy_checksum_${nonce}`,
    status: "native_applied",
    strong_proof: true,
    provider_outcome_verified: false,
    cleared_input_tokens: 999_999,
    beta_headers: ["context-management-2025-06-27"],
  });
  const legacyCapacity = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionB,
    taskAgentSessionId: `${taskAgentSessionId}_legacy`,
    nativeSessionId: `${nativeSessionId}_legacy`,
    rawActiveTokens: 3_000_000,
  });
  const feedbackPlan = compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId: sessionA,
    targetProject: "api",
    agentType: "anthropic-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    taskAgentSessionId,
    nativeSessionId,
    executionId: `exec_${nonce}_3`,
    runnerRequestId: `runner_${nonce}_3`,
    memoryContextSnapshotId: `mcs_${nonce}_3`,
    memoryContextSnapshotChecksum: `checksum_${nonce}_3`,
    providerNativeCompactSessionCapacity: repeated,
    now: "2026-07-15T12:05:00.000Z",
  });
  const storedMemory = memory.createEmptyGroupMemory(groupId, sessionA);
  storedMemory.compaction = { ...(storedMemory.compaction || {}), apiMicroCompactEditPlan: editPlan };
  memory.saveGroupMemory(groupId, storedMemory, sessionA);
  const centerDetail = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerCapacity = centerDetail.postCompactUsage?.providerNativeCompactSessionCapacity || {};
  const receiptText = fs.readFileSync(receiptFile, "utf-8");
  const stateText = fs.readFileSync(stateFile, "utf-8");

  const checks = {
    bothProviderOutcomesAreStrong: first.receipt?.status === "native_applied"
      && second.receipt?.status === "native_applied"
      && first.receipt?.provider_response_input_tokens === 280_000
      && second.receipt?.provider_response_input_tokens === 260_000,
    outcomesWaitForPlannerConsumption: beforeConsume.pending_strong_outcome_count === 2,
    latestOutcomeNotCumulativeSum: baseline.provider_cleared_input_tokens === 48_000
      && baseline.provider_cleared_input_tokens !== 96_000
      && baseline.provider_response_input_tokens === 260_000,
    providerPostEditUsageIsEffectiveBaseline: baseline.effective_context_tokens === 260_000
      && baseline.provider_pre_edit_input_tokens_estimate === 308_000
      && baseline.local_effective_context_tokens === 2_952_000,
    repeatedConsumptionIsIdempotent: repeated.source_receipt_id === baseline.source_receipt_id
      && repeated.pending_outcome_count === 0
      && repeated.consumed_outcome_count === 0
      && repeated.provider_cleared_input_tokens === 48_000,
    exactSessionIsolation: wrongGroupSession === null && wrongNativeSession === null,
    legacyAcceptedOnlyCannotCreateCapacityCredit: legacyCapacity.status === "awaiting_strong_provider_outcome"
      && legacyCapacity.provider_cleared_input_tokens === 0
      && legacyCapacity.effective_context_tokens === 3_000_000,
    restartRoundTripIsChecksummed: afterRestartRead.checksum_valid === true
      && afterRestartRead.sessions?.[0]?.latest_capacity_baseline?.baseline_checksum === repeated.baseline_checksum
      && capacity.verifyProviderNativeCompactSessionCapacityBaseline(afterRestartRead.sessions?.[0]?.latest_capacity_baseline) === true,
    stickyBetaLatchSurvivesAndFeedsPlan: feedbackPlan.nativeApplyReady === true
      && feedbackPlan.capability?.contextManagementBetaHeaderEnabled === true
      && feedbackPlan.requestPatch?.beta_headers?.includes("context-management-2025-06-27")
      && feedbackPlan.providerSessionCapacity?.stickyBetaLatched === true,
    capacityFeedbackIsUsedWithoutTranscriptMutation: feedbackPlan.providerSessionCapacity?.capacityFeedbackApplied === true
      && feedbackPlan.providerSessionCapacity?.effectiveActiveTokens === 260_000
      && feedbackPlan.providerSessionCapacity?.providerClearedInputTokens === 48_000
      && editPlan.activeTokens === 3_000_000,
    allPendingOutcomesBecomeConsumed: afterConsume.pending_strong_outcome_count === 0,
    memoryCenterExposesExactSessionCapacity: centerCapacity.group_session_id === sessionA
      && centerCapacity.session_count === 1
      && centerCapacity.sessions?.[0]?.task_agent_session_id === taskAgentSessionId
      && centerCapacity.sessions?.[0]?.latest_capacity_baseline?.provider_cleared_input_tokens === 48_000,
    ledgersRemainBodyFree: !receiptText.includes("body must not persist")
      && !receiptText.includes("secret=must-not-persist")
      && !stateText.includes("body must not persist")
      && !stateText.includes("old reasoning"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, baseline, repeated, feedbackPlan, beforeConsume, afterConsume }, null, 2));

  const deleted = memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
  const deletionCheck = deleted.providerNativeCompactSessionCapacityArtifacts?.deleted >= 1 && !fs.existsSync(stateFile);
  assert.equal(deletionCheck, true, JSON.stringify({ deleted, stateFile }, null, 2));
  checks.sessionDeletionClearsCapacityState = deletionCheck;
  process.stdout.write(`${JSON.stringify({ pass: true, checks, baseline: { sourceReceiptId: baseline.source_receipt_id, cleared: baseline.provider_cleared_input_tokens, effective: baseline.effective_context_tokens, basis: baseline.token_basis } }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
}
