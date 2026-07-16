import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase334-cache-deletion-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const require = createRequire(import.meta.url);
const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
const trackerPath = dist("modules", "collaboration", "group-prompt-cache-break-detection.js");
let tracker = require(trackerPath);
const compaction = require(dist("modules", "collaboration", "group-memory-compaction.js"));
const client = require(dist("modules", "collaboration", "group-orchestrator-llm-client.js"));
const receipts = require(dist("modules", "collaboration", "provider-native-compact-execution-receipt.js"));
const memory = require(dist("modules", "collaboration", "memory.js"));
const center = require(dist("modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase334-${nonce}`;
const sessionA = `gcs_phase334_a_${nonce}`;
const sessionB = `gcs_phase334_b_${nonce}`;
const sessionWeak = `gcs_phase334_weak_${nonce}`;
const sentinel = `PHASE334_REQUEST_BODY_MUST_NOT_PERSIST_${nonce}`;

const editPlan = compaction.buildGroupApiMicroCompactEditPlan([
  { id: "thinking", role: "assistant", content: [{ type: "thinking", thinking: "old private reasoning" }] },
  { id: "tool", role: "assistant", content: [{ type: "tool_use", id: "read-334", name: "Read", input: { file_path: "src/cache.ts" } }] },
  { id: "result", role: "user", content: [{ type: "tool_result", tool_use_id: "read-334", content: "old source body" }] },
], { groupId, targetProject: "api", activeTokens: 220000, force: true, now: "2026-07-15T15:00:00.000Z" });

function nativePlan(groupSessionId, suffix) {
  return compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId,
    targetProject: "api",
    agentType: "anthropic-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    betaHeaders: ["context-management-2025-06-27"],
    taskAgentSessionId: `tas_${suffix}_${nonce}`,
    nativeSessionId: `native_${suffix}_${nonce}`,
    executionId: `exec_${suffix}_${nonce}`,
    runnerRequestId: `adr_${suffix}_${nonce}`,
    memoryContextSnapshotId: `mcs_${suffix}_${nonce}`,
    memoryContextSnapshotChecksum: `mcs_checksum_${suffix}_${nonce}`,
    now: "2026-07-15T15:01:00.000Z",
  });
}

function telemetry(plan, suffix) {
  return {
    groupId,
    groupSessionId: plan.groupSessionId,
    targetProject: "api",
    taskId: `task_${suffix}_${nonce}`,
    taskAgentSessionId: plan.taskAgentSessionId,
    nativeSessionId: plan.nativeSessionId,
    executionId: plan.executionId,
    runnerRequestId: plan.runnerRequestId,
    memoryContextSnapshotId: plan.memoryContextSnapshotId,
    memoryContextSnapshotChecksum: plan.memoryContextSnapshotChecksum,
  };
}

function recordUsage(groupSessionId, source) {
  return usage => tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId,
    source,
    provider: "anthropic",
    model: "claude-phase334",
    usage,
  });
}

const originalFetch = globalThis.fetch;
let responseMode = "applied";
let capturedBody = null;
try {
  tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionA,
    source: "baseline",
    provider: "anthropic",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 500, cacheReadInputTokens: 90_000 },
    at: "2026-07-15T15:02:00.000Z",
  });
  tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionB,
    source: "sibling_baseline",
    provider: "anthropic",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 500, cacheReadInputTokens: 80_000 },
    at: "2026-07-15T15:02:00.000Z",
  });
  tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionWeak,
    source: "weak_baseline",
    provider: "anthropic",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 500, cacheReadInputTokens: 70_000 },
    at: "2026-07-15T15:02:00.000Z",
  });

  globalThis.fetch = async (_url, init = {}) => {
    capturedBody = JSON.parse(String(init.body || "{}"));
    const applied = responseMode === "applied";
    return {
      ok: true,
      status: 200,
      headers: { get: name => String(name || "").toLowerCase().includes("request-id") ? `req_${responseMode}_${nonce}` : "" },
      async text() {
        return JSON.stringify({
          content: [{ type: "text", text: applied ? "phase334 applied" : "phase334 accepted only" }],
          ...(applied ? { context_management: { applied_edits: [
            { type: "clear_thinking_20251015", cleared_thinking_turns: 2, cleared_input_tokens: 12_000 },
            { type: "clear_tool_uses_20250919", cleared_tool_uses: 5, cleared_input_tokens: 36_000 },
          ] } } : {}),
          usage: {
            input_tokens: 100,
            cache_creation_input_tokens: 500,
            cache_read_input_tokens: applied ? 20_000 : 30_000,
            output_tokens: 100,
          },
        });
      },
    };
  };

  const planA = nativePlan(sessionA, "applied");
  const output = await client.callAnthropicCompatibleChat({
    apiUrl: "https://api.anthropic.com/v1",
    apiKey: "phase334-test-key",
    model: "claude-phase334",
  }, {
    messages: [{ role: "user", content: sentinel }],
    apiMicrocompactNativeApplyPlan: planA,
    apiMicrocompactNativeApplyTelemetry: telemetry(planA, "applied"),
    onUsage: recordUsage(sessionA, "native_adapter_response"),
  });

  const afterApplied = tracker.readGroupPromptCacheBreakDetection(groupId, sessionA);
  const appliedEvent = afterApplied.last_event || {};
  const executionLedger = receipts.readProviderNativeCompactExecutionReceiptLedger(groupId, sessionA);
  const strongReceipt = executionLedger.entries.at(-1);
  const notification = afterApplied.recent_cache_deletion_notifications?.at(-1) || {};
  const packetMemory = memory.createEmptyGroupMemory(groupId, sessionA);
  memory.saveGroupMemory(groupId, packetMemory, sessionA);
  const packet = memory.buildAgentMemoryPacket(groupId, "api", "inspect cache deletion", { groupSessionId: sessionA });

  const duplicateNotification = tracker.notifyGroupPromptCacheDeletion({ executionReceipt: strongReceipt });
  const afterDuplicate = tracker.readGroupPromptCacheBreakDetection(groupId, sessionA);
  const nextDrop = tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionA,
    source: "next_api_response",
    provider: "anthropic",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 100, cacheReadInputTokens: 10_000 },
    at: "2026-07-15T15:03:00.000Z",
  });

  delete require.cache[require.resolve(trackerPath)];
  tracker = require(trackerPath);
  const restarted = tracker.readGroupPromptCacheBreakDetection(groupId, sessionA);
  const sibling = tracker.readGroupPromptCacheBreakDetection(groupId, sessionB);

  responseMode = "accepted_only";
  const weakPlan = nativePlan(sessionWeak, "weak");
  const weakOutput = await client.callAnthropicCompatibleChat({
    apiUrl: "https://api.anthropic.com/v1",
    apiKey: "phase334-test-key",
    model: "claude-phase334",
  }, {
    messages: [{ role: "user", content: `${sentinel}_WEAK` }],
    apiMicrocompactNativeApplyPlan: weakPlan,
    apiMicrocompactNativeApplyTelemetry: telemetry(weakPlan, "weak"),
    onUsage: recordUsage(sessionWeak, "weak_adapter_response"),
  });
  const weakTracker = tracker.readGroupPromptCacheBreakDetection(groupId, sessionWeak);
  const weakReceipt = receipts.readProviderNativeCompactExecutionReceiptLedger(groupId, sessionWeak).entries.at(-1);

  const tamperedReceipt = { ...strongReceipt, cleared_input_tokens: strongReceipt.cleared_input_tokens + 1 };
  let tamperedRejected = false;
  let crossSessionRejected = false;
  try { tracker.notifyGroupPromptCacheDeletion({ executionReceipt: tamperedReceipt }); } catch { tamperedRejected = true; }
  try { tracker.notifyGroupPromptCacheDeletion({ executionReceipt: strongReceipt, groupSessionId: sessionB }); } catch { crossSessionRejected = true; }

  const detail = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerCache = detail.postCompactUsage?.promptCacheBreakDetection || {};
  const serialized = fs.readFileSync(restarted.file, "utf8");
  const checks = {
    adapterAppliedNativeEditPlan: output === "phase334 applied" && capturedBody?.context_management?.edits?.length === editPlan.editCount,
    strongReceiptCreatedBeforeUsage: strongReceipt?.status === "native_applied" && strongReceipt?.strong_proof === true && strongReceipt?.provider_outcome_verified === true,
    notificationBoundToExactStrongReceipt: tracker.verifyGroupPromptCacheDeletionNotification(notification, {
      groupId,
      groupSessionId: sessionA,
      executionReceiptId: strongReceipt?.receipt_id,
      executionReceiptChecksum: strongReceipt?.receipt_checksum,
    }).valid === true,
    sameResponseConsumesExpectedDeletion: appliedEvent.classification === "expected_microcompact_cache_deletion"
      && appliedEvent.cache_deletion_applied === true
      && appliedEvent.cache_break === false,
    responseBecomesRemainingCacheBaseline: afterApplied.previous_cache_read_tokens === 20_000
      && afterApplied.pending_cache_deletion === null,
    deletionCreditIsOneShot: nextDrop.event?.classification === "cache_break"
      && nextDrop.event?.cache_break === true
      && nextDrop.event?.token_drop === 10_000,
    duplicateReceiptDoesNotRearmCredit: duplicateNotification.receipt_checksum === notification.receipt_checksum
      && afterDuplicate.pending_cache_deletion === null
      && afterDuplicate.cache_deletion_notification_count === 1,
    restartPreservesConsumedState: restarted.cache_deletion_notification_count === 1
      && restarted.cache_deletion_consumed_count === 1
      && restarted.pending_cache_deletion === null
      && restarted.previous_cache_read_tokens === 10_000,
    siblingSessionRemainsUntouched: sibling.call_count === 1
      && sibling.previous_cache_read_tokens === 80_000
      && sibling.cache_deletion_notification_count === 0,
    weakProviderOutcomeGetsNoDeletionCredit: weakOutput === "phase334 accepted only"
      && weakReceipt?.status === "request_accepted"
      && weakReceipt?.strong_proof === false
      && weakTracker.cache_deletion_notification_count === 0
      && weakTracker.last_event?.classification === "cache_break",
    tamperedReceiptFailsClosed: tamperedRejected,
    crossSessionReceiptFailsClosed: crossSessionRejected,
    childAgentPacketShowsConsumedDeletion: packet.includes("microcompactDeletion=consumed")
      && packet.includes(strongReceipt.receipt_id),
    memoryCenterReadsDurableRuntimeState: centerCache.checksum_valid === true
      && centerCache.cache_deletion_consumed_count === 1
      && centerCache.cache_break_count === 1,
    ledgerIsBodyFree: !serialized.includes(sentinel)
      && !serialized.includes("phase334-test-key")
      && !serialized.includes("old private reasoning")
      && !serialized.includes("old source body"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, appliedEvent, notification, afterApplied, nextDrop: nextDrop.event, restarted, sibling, weakTracker, weakReceipt }, null, 2));
  process.stdout.write(`PHASE334_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  globalThis.fetch = originalFetch;
  for (const sessionId of [sessionA, sessionB, sessionWeak]) {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
