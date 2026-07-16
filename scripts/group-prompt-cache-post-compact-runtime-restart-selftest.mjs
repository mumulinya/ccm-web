import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase333-prompt-cache-runtime-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const require = createRequire(import.meta.url);
const tracker = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-prompt-cache-break-detection.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase333-${process.pid}-${Date.now().toString(36)}`;
const runtimeSessionId = `gcs_phase333_runtime_${process.pid}`;
const siblingSessionId = `gcs_phase333_sibling_${process.pid}`;
const sentinel = "PHASE333_PROMPT_BODY_MUST_NOT_ENTER_CACHE_LEDGER";

function transcript(sessionId) {
  return Array.from({ length: 130 }, (_, index) => ({
    id: `${sessionId}-message-${index}`,
    group_session_id: sessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0 ? sentinel : `Phase 333 context ${index} ${"cache context ".repeat(70)}`,
  }));
}

try {
  const siblingBaseline = tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: siblingSessionId,
    source: "group_main_planning",
    provider: "anthropic",
    model: "phase333-model",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 20, cacheReadInputTokens: 9_000 },
    at: "2026-07-15T14:00:00.000Z",
  });

  const messages = transcript(runtimeSessionId);
  storage.saveGroupMessages(groupId, messages, runtimeSessionId);
  const compacted = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: runtimeSessionId,
    force: true,
    rebuild: true,
    reason: "phase333-runtime-notification",
    config: { memoryCompactionUseModel: false, minKeepMessages: 5, minKeepTokens: 1 },
  });
  const stored = memory.loadGroupMemory(groupId, runtimeSessionId);
  const notification = stored.compaction?.promptCacheCompactionNotification || {};
  const notificationVerification = tracker.verifyGroupPromptCacheCompactionNotification(notification, {
    groupId,
    groupSessionId: runtimeSessionId,
    boundaryId: stored.compactBoundary?.id,
    resetReceiptChecksum: stored.compaction?.postCompactSessionStateReset?.receipt_checksum,
  });
  const pending = tracker.readGroupPromptCacheBreakDetection(groupId, runtimeSessionId);

  const configDir = path.join(tempRoot, ".cc-connect");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "group-orchestrator-config.json"), JSON.stringify({
    enabled: true,
    format: "anthropic-compatible",
    apiUrl: "http://phase333.invalid/v1",
    apiKey: "phase333-test-key",
    model: "phase333-model",
    fallbackToRules: false,
  }), "utf8");
  const llmClient = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js"));
  llmClient.callAnthropicCompatibleJson = async (_config, options) => {
    options.onUsage?.({
      inputTokens: 2_620,
      outputTokens: 120,
      totalTokens: 2_740,
      reported: true,
      directInputTokens: 100,
      cacheCreationInputTokens: 20,
      cacheReadInputTokens: 2_500,
    });
    return {
      intent: "information",
      summary: "Phase 333 runtime cache baseline consumption",
      domains: ["memory"],
      deliverables: [],
      constraints: [],
      missingInfo: [],
      shouldDelegate: false,
      executionOrder: "parallel",
      dispatchPolicy: { action: "respond", requiresConfirmation: false, reason: "runtime selftest" },
      targets: [],
      friendlyResponse: "Phase 333 runtime cache baseline consumed.",
    };
  };
  let chatCalls = 0;
  llmClient.callAnthropicCompatibleChat = async (_config, options) => {
    chatCalls += 1;
    const cacheReadInputTokens = chatCalls === 1 ? 3_000 : 2_000;
    options.onUsage?.({
      inputTokens: cacheReadInputTokens + 120,
      outputTokens: 120,
      totalTokens: cacheReadInputTokens + 240,
      reported: true,
      directInputTokens: 100,
      cacheCreationInputTokens: 20,
      cacheReadInputTokens,
    });
    if (chatCalls === 1) return "Phase 333 summary consumed the post-compaction marker.";
    return JSON.stringify({
      status: "complete",
      verdict: "pass",
      decision: { can_complete: true, reason: "runtime review selftest" },
      summary: "Phase 333 review cache usage recorded.",
      checks: [],
      worker_reviews: [],
      gaps: [],
      conflicts: [],
      followUps: [],
      userQuestion: "",
      confidence: 1,
    });
  };
  const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
  const group = {
    id: groupId,
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "api", agent: "codex" },
    ],
  };
  const summaryResult = await orchestrator.runLlmCoordinatorSummary(group, "Phase 333 summary", ["worker complete"], { groupSessionId: runtimeSessionId });
  const afterSummary = tracker.readGroupPromptCacheBreakDetection(groupId, runtimeSessionId);
  const postCompactEvent = afterSummary.last_event || {};
  const orchestratorResult = await orchestrator.runGroupOrchestrator({
    group,
    groupSessionId: runtimeSessionId,
    source: "phase333-runtime",
    message: "读取当前状态。",
    context: "Phase 333 bounded context",
  });
  const reviewResult = await orchestrator.runLlmCoordinatorReview(
    group,
    "Phase 333 review",
    "Coordinator plan",
    ["worker complete"],
    { allowFollowUps: false, groupSessionId: runtimeSessionId },
  );
  const afterRuntime = tracker.readGroupPromptCacheBreakDetection(groupId, runtimeSessionId);
  const stable = tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: runtimeSessionId,
    source: "group_main_planning",
    provider: "anthropic",
    model: "phase333-model",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 10, cacheReadInputTokens: 1_800 },
    at: "2026-07-15T14:01:00.000Z",
  });
  const siblingBreak = tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: siblingSessionId,
    source: "group_main_planning",
    provider: "anthropic",
    model: "phase333-model",
    usage: { directInputTokens: 100, cacheCreationInputTokens: 10, cacheReadInputTokens: 4_000 },
    at: "2026-07-15T14:01:00.000Z",
  });
  const restarted = tracker.readGroupPromptCacheBreakDetection(groupId, runtimeSessionId);
  const projection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: runtimeSessionId,
    messages,
    memory: stored,
  });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${runtimeSessionId}`);
  const centerTracker = detail.postCompactUsage?.promptCacheBreakDetection || {};
  const centerNotification = detail.postCompactUsage?.promptCacheCompactionNotification || {};
  const serialized = fs.readFileSync(restarted.file, "utf8");
  const checks = {
    compactionCreatedRuntimeNotification: compacted.success === true && compacted.compacted === true
      && notificationVerification.valid === true,
    notificationBoundToResetAndBoundary: notification.boundary_id === stored.compactBoundary?.id
      && notification.post_compact_session_state_reset_checksum === stored.compaction?.postCompactSessionStateReset?.receipt_checksum,
    trackerPendingBeforeNextApiSuccess: pending.status === "post_compaction_pending"
      && pending.previous_cache_read_tokens === null
      && pending.pending_post_compaction?.boundary_id === stored.compactBoundary?.id,
    nextGroupMainSuccessConsumesMarker: summaryResult?.content?.includes("post-compaction marker") === true
      && postCompactEvent.classification === "post_compaction_baseline_reset"
      && postCompactEvent.is_post_compaction === true
      && postCompactEvent.cache_break === false
      && postCompactEvent.source === "group_main_summary",
    planningAndReviewShareExactSessionBaseline: orchestratorResult.runtime === "llm-api"
      && reviewResult?.status === "complete"
      && (afterRuntime.recent_events || []).some(event => event.source === "group_main_planning" && event.classification === "cache_stable")
      && (afterRuntime.recent_events || []).some(event => event.source === "group_main_review" && event.classification === "cache_stable"),
    nextSmallDropIsStable: stable.event?.classification === "cache_stable"
      && stable.event?.cache_break === false
      && stable.event?.token_drop === 200,
    siblingLargeDropDetectsBreak: siblingBaseline.recorded === true
      && siblingBreak.event?.classification === "cache_break"
      && siblingBreak.event?.cache_break === true
      && siblingBreak.event?.token_drop === 5_000,
    exactSessionsRemainIndependent: restarted.cache_break_count === 0
      && tracker.readGroupPromptCacheBreakDetection(groupId, siblingSessionId).cache_break_count === 1,
    restartPreservesConsumedBaseline: restarted.pending_post_compaction === null
      && restarted.previous_cache_read_tokens === 1_800
      && restarted.call_count === 4,
    boundaryJournalBindsNotification: projection.verified === true
      && projection.boundary?.promptCacheCompactionNotificationChecksum === notification.receipt_checksum,
    memoryCenterShowsRuntimeState: centerTracker.checksum_valid === true
      && centerTracker.call_count === 4
      && centerNotification.status === "verified",
    cacheLedgerIsBodyFree: !serialized.includes(sentinel),
  };

  const primary = restarted.file;
  fs.writeFileSync(primary, "{tampered-primary", "utf8");
  fs.writeFileSync(`${primary}.bak`, "{tampered-backup", "utf8");
  const failClosed = tracker.readGroupPromptCacheBreakDetection(groupId, runtimeSessionId);
  const rejectedAfterTamper = tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: runtimeSessionId,
    provider: "anthropic",
    usage: { cacheReadInputTokens: 100 },
  });
  checks.corruptLedgerFailsClosed = failClosed.status === "fail_closed"
    && failClosed.checksum_valid === false
    && rejectedAfterTamper.recorded === false
    && rejectedAfterTamper.reason === "prompt_cache_ledger_fail_closed";
  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, runtimeSessionId);
  checks.sessionDeletionRemovesPromptCacheArtifacts = Number(deletion.promptCacheBreakDetectionArtifacts?.deleted || 0) >= 2
    && !fs.existsSync(primary)
    && !fs.existsSync(`${primary}.bak`);

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, notificationVerification, pending, postCompactEvent, stable: stable.event, siblingBreak: siblingBreak.event, restarted, projection, failClosed, deletion }, null, 2));
  process.stdout.write(`PHASE333_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
