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
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase299-generation-${nonce}`;
const sessionA = `gcs_${nonce}_generation_a`;
const sessionB = `gcs_${nonce}_generation_b`;
const taskAgentSessionId = `tas_${nonce}`;
const nativeSessionId = `native_${nonce}`;

const editPlan = compaction.buildGroupApiMicroCompactEditPlan([
  { id: "phase299-thinking", role: "assistant", content: [{ type: "thinking", thinking: "old generation reasoning" }] },
  { id: "phase299-tool", role: "assistant", content: [{ type: "tool_use", id: "read-299", name: "Read", input: { file_path: "src/generation.ts" } }] },
  { id: "phase299-result", role: "user", content: [{ type: "tool_result", tool_use_id: "read-299", content: "old generation result" }] },
], {
  groupId,
  targetProject: "api",
  activeTokens: 260_000,
  force: true,
  now: "2026-07-15T13:00:00.000Z",
});

function buildNativePlan({ executionId, runnerRequestId, fence = null }) {
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
    providerNativeCompactSessionGenerationFence: fence,
    now: "2026-07-15T13:00:10.000Z",
  });
}

function recordApplied(plan, requestId, sentAt, clearedInputTokens, inputTokens) {
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
      model: "claude-phase299-selftest",
      messages: [{ role: "user", content: "phase299 request body must not persist" }],
      context_management: plan.requestPatch.body.context_management,
    },
    headers: { "anthropic-beta": "context-management-2025-06-27" },
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase299-selftest",
    endpoint: "https://api.anthropic.com/v1/messages?phase299-secret=hidden",
    responseStatus: 200,
    requestId,
    responseBody: {
      usage: { input_tokens: inputTokens, output_tokens: 700 },
      context_management: {
        applied_edits: [{ type: "clear_tool_uses_20250919", cleared_tool_uses: 5, cleared_input_tokens: clearedInputTokens }],
      },
    },
    sentAt,
    ok: true,
  });
}

const messages = Array.from({ length: 80 }, (_, index) => ({
  id: `phase299-message-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  agent: index % 2 ? "main" : undefined,
  content: `${index === 0 ? "PHASE299_COMPACT_SENTINEL " : ""}${`generation compact context ${index + 1} `.repeat(90)}`,
  group_session_id: sessionA,
  timestamp: new Date(Date.UTC(2026, 6, 15, 13, index % 60)).toISOString(),
}));

const stateFile = capacity.getProviderNativeCompactSessionCapacityLedgerFile(groupId, sessionA);
const messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionA);

try {
  const generation1Fence = capacity.getProviderNativeCompactSessionGenerationFence({ groupId, groupSessionId: sessionA, taskAgentSessionId, nativeSessionId });
  const generation1Plan = buildNativePlan({ executionId: `exec_${nonce}_g1`, runnerRequestId: `runner_${nonce}_g1`, fence: generation1Fence });
  const generation1Receipt = recordApplied(generation1Plan, `req_${nonce}_g1`, "2026-07-15T13:00:20.000Z", 42_000, 218_000);
  const generation1Baseline = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    rawActiveTokens: 260_000,
    consumedAt: "2026-07-15T13:00:30.000Z",
  });

  storage.saveGroupMessages(groupId, messages, sessionA);
  const compactResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionA,
    force: true,
    rebuild: true,
    reason: "phase299_generation_reset_selftest",
    config: { memoryCompactionUseModel: false },
  });
  const afterCompact = capacity.buildProviderNativeCompactSessionCapacitySummary(groupId, sessionA);

  const delayedOldReceipt = recordApplied(generation1Plan, `req_${nonce}_g1_delayed`, "2026-07-15T13:01:20.000Z", 44_000, 216_000);
  const afterDelayed = capacity.buildProviderNativeCompactSessionCapacitySummary(groupId, sessionA);
  const generation2Fence = capacity.getProviderNativeCompactSessionGenerationFence({ groupId, groupSessionId: sessionA, taskAgentSessionId, nativeSessionId });
  const otherSessionFence = capacity.getProviderNativeCompactSessionGenerationFence({ groupId, groupSessionId: sessionB, taskAgentSessionId, nativeSessionId });
  const generation2Plan = buildNativePlan({ executionId: `exec_${nonce}_g2`, runnerRequestId: `runner_${nonce}_g2`, fence: generation2Fence });
  const generation2Receipt = recordApplied(generation2Plan, `req_${nonce}_g2`, "2026-07-15T13:02:20.000Z", 18_000, 92_000);
  const generation2Baseline = capacity.consumeProviderNativeCompactSessionCapacity({
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    rawActiveTokens: 110_000,
    consumedAt: "2026-07-15T13:02:30.000Z",
  });
  const finalSummary = capacity.buildProviderNativeCompactSessionCapacitySummary(groupId, sessionA);
  const centerDetail = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerCapacity = centerDetail.postCompactUsage?.providerNativeCompactSessionCapacity || {};
  const stateText = fs.readFileSync(stateFile, "utf-8");

  const checks = {
    firstPlanStartsAtGenerationOne: generation1Fence.generation === 1
      && generation1Plan.providerSessionCapacityGeneration === 1
      && generation1Receipt.receipt?.capacity_generation === 1,
    firstOutcomeCreatesGenerationOneCredit: generation1Baseline.generation === 1
      && generation1Baseline.provider_cleared_input_tokens === 42_000
      && generation1Baseline.effective_context_tokens === 218_000,
    realPrimaryCompactAdvancesGeneration: compactResult.success === true
      && compactResult.compacted === true
      && !!compactResult.boundary?.id
      && compactResult.providerNativeCompactSessionCapacityReset?.previous_generation === 1
      && compactResult.providerNativeCompactSessionCapacityReset?.generation === 2,
    compactResetClearsDerivedSessionState: afterCompact.generation === 2
      && afterCompact.session_count === 0
      && afterCompact.sticky_beta_session_count === 0
      && afterCompact.reset_count === 1,
    delayedOldOutcomeIsFenced: delayedOldReceipt.receipt?.status === "native_applied"
      && delayedOldReceipt.sessionCapacityOutcome?.recorded === false
      && delayedOldReceipt.sessionCapacityOutcome?.stale === true
      && delayedOldReceipt.sessionCapacityOutcome?.reason === "stale_generation_after_compact_reset",
    staleOutcomeCannotRestoreCreditOrStickyBeta: afterDelayed.generation === 2
      && afterDelayed.session_count === 0
      && afterDelayed.sticky_beta_session_count === 0
      && afterDelayed.rejected_outcome_count === 1,
    nextPlanUsesNewGeneration: generation2Fence.generation === 2
      && generation2Plan.providerSessionCapacityGeneration === 2
      && generation2Plan.providerSessionGenerationFence?.generation === 2
      && generation2Receipt.receipt?.capacity_generation === 2,
    newGenerationOutcomeCanCreateFreshCredit: generation2Receipt.sessionCapacityOutcome?.recorded === true
      && generation2Baseline.generation === 2
      && generation2Baseline.provider_cleared_input_tokens === 18_000
      && generation2Baseline.effective_context_tokens === 92_000,
    resetIsExactGroupSessionOnly: otherSessionFence.generation === 1,
    restartRoundTripPreservesGenerationAndReset: capacity.readProviderNativeCompactSessionCapacityLedger(groupId, sessionA).generation === 2
      && finalSummary.last_reset?.reset_id === compactResult.providerNativeCompactSessionCapacityReset?.reset_id
      && finalSummary.sessions?.[0]?.latest_capacity_baseline?.generation === 2,
    memoryCenterShowsGenerationFenceHealth: centerCapacity.generation === 2
      && centerCapacity.reset_count === 1
      && centerCapacity.rejected_outcome_count === 1
      && centerCapacity.sessions?.[0]?.latest_capacity_baseline?.generation === 2,
    generationLedgerRemainsBodyFree: !stateText.includes("phase299 request body must not persist")
      && !stateText.includes("phase299-secret")
      && !stateText.includes("old generation reasoning"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, generation1Baseline, compactResult: { compacted: compactResult.compacted, boundary: compactResult.boundary, reset: compactResult.providerNativeCompactSessionCapacityReset }, afterCompact, delayed: delayedOldReceipt.sessionCapacityOutcome, generation2Baseline, finalSummary }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, generations: { before: 1, afterCompact: afterCompact.generation, final: finalSummary.generation }, resetId: finalSummary.last_reset?.reset_id }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}
