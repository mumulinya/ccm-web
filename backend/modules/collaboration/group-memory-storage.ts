// Behavior-freeze module extracted mechanically from the former facade.

import * as fs from "fs";

import * as path from "path";

import * as crypto from "crypto";

import { loadProjectConfigs, loadTasks } from "../../core/db";

import { CCM_DIR, getWorkDirForProject } from "../../core/utils";

import { buildContextBudget, estimateTextTokens } from "../../system/context-budget";

import { buildToolAuthorizationPayload, normalizeToolAuthorization } from "../../tools/tool-authorization";

import { toolManager } from "../../tools/tool-manager";

import { getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../../agents/runtime";

import {
  buildBoundedRecentGroupContext,
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupApiMicrocompactNativeApplyPlan,
  buildGroupTimeBasedThinkingProjection,
  buildGroupTimeBasedToolResultProjection,
  buildGroupCompactStrategyDecision,
  buildGroupCompactEpoch,
  buildGroupPostCompactCleanupAudit,
  buildGroupPostCompactSessionStateResetReceipt,
  buildGroupPostCompactRecoveryAudit,
  buildGroupPostCompactTaskStatusProjection,
  buildGroupPostCompactDynamicContextDeltaProjection,
  verifyGroupPostCompactMessageOrderReceipt,
  verifyGroupCompactLineage,
  verifyGroupCompactionModelUsageReceipt,
  verifyGroupPostCompactSessionStateResetReceipt,
  buildGroupPreservedSegment,
  buildGroupMicroCompactPlan,
  buildGroupPtlRecoveryPlan,
  buildPostCompactReinjectionPlan,
  calculateGroupCompactWarningState,
  calculateGroupMessagesToKeepIndex,
  buildRelevantHistoricalGroupContext,
  compactGroupConversationMemory,
  estimateGroupMessageTokens,
  estimateGroupTextTokens,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_MEMORY_COMPACTION_VERSION,
  renderConversationSummary,
} from "./group-memory-compaction";

import {
  buildGroupTypedMemoryLoadPlan,
  buildGroupTypedMemoryIndex,
  buildGroupTypedMemoryRecall,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  buildPostCompactCompletionMemoryPreservationClosureUsageSummary,
  deriveGroupTypedMemoryTargetPaths,
  distillGroupMessagesToTypedMemory,
  distillGroupMessagesToTypedMemoryUntilCaughtUp,
  evaluateGroupTypedMemoryDistillationQuality,
  getAlreadySurfacedGroupTypedMemory,
  getGroupTypedMemoryRecallScopeStats,
  getGroupTypedMemoryDir,
  importGlobalClaudeMemoryToGroupTypedMemory,
  importProjectMemoryFilesToGroupTypedMemory,
  recordGroupTypedMemoryRecall,
  recordGroupTypedMemoryManifestSelectorOutcome,
  selectGroupTypedMemoryManifest,
  readGroupTypedMemoryRecallLedger,
  recordGroupTypedMemoryPressureRecallUsageLedger,
  readGroupTypedMemoryDistillationLedger,
  renderGroupTypedMemoryLoadPlan,
  renderGroupTypedMemoryRecall,
  runGroupTypedMemoryIndexSelfTest,
  shouldIgnoreGroupMemoryRequest,
  syncGroupTypedMemoryFromGroupMemory,
  upsertGroupTypedMemoryDocument,
} from "./group-memory-index";

import {
  buildWorkerTypedMemoryDeliveryLease,
  buildWorkerTypedMemoryDispatchTicket,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  validateWorkerTypedMemoryDeliveryLease,
  validateWorkerTypedMemoryDispatchTicket,
} from "../../agents/runtime-kernel";

import {
  appendGroupMessage,
  getActiveGroupChatSessionId,
  getGroupChatSessionMessagesFile,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  registerGroupMessageAppendHook,
  saveGroupMessages,
} from "./storage";

import {
  buildGroupMemorySnipBoundaryMarker,
  buildGroupMemoryResumeProjection,
  commitGroupMemoryCompactBoundary,
  deleteGroupMemoryBoundaryArtifacts,
  getGroupMemoryBoundaryJournalFile,
  getGroupMemoryResumeProofFile,
  quarantineInvalidGroupMemoryBoundaryJournal,
  recordGroupMemoryResumeProjectionProof,
  retireGroupMemoryBoundaryJournal,
} from "./group-memory-boundary-journal";

import {
  runGroupSessionMemoryExtractionTransaction,
} from "./group-session-memory-extraction";

import {
  GLOBAL_AGENT_MEMORY_FILE,
  acquireGlobalAgentMemorySelfTestLock,
  recallGlobalAgentMemory,
  scanGlobalAgentMemorySelfTestContamination,
} from "../../agents/global/memory";

import { loadExecution } from "../../agents/execution-kernel";

import { DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA, pruneDirectAgentDispatchSpool, validateDirectAgentDispatchPair } from "../../agents/direct-dispatch-spool";

import {
  commitTaskAgentSessionCapacityRevalidation,
  recordTaskAgentMemoryContextDelivery,
  verifyMemoryContextDeliveryReceiptChecksum,
} from "../../tasks/agent-sessions";

import {
  createTypedMemoryDispatchWal,
  getTypedMemoryDispatchWalScopeDir,
  listTypedMemoryDispatchWal,
  pruneTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  transitionTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal,
} from "./typed-memory-dispatch-wal";

import {
  backfillGroupPostTurnSummaries,
  buildGroupPostTurnSummaryDeliveryCapsule,
  extractGroupPostTurnSummaryDeliveryCapsule,
  getGroupPostTurnSummaryLedgerFile,
  readGroupPostTurnSummaries,
  recordGroupPostTurnSummary,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "./group-post-turn-summary";

import { deleteTaskAgentInvocationLineageArtifacts } from "../../tasks/task-agent-invocation-lineage";

import { deleteTaskAgentContinuationSoakArtifacts } from "../../tasks/task-agent-continuation-soak";

import {
  commitGroupCompactHead,
  deleteGroupCompactHead,
  readGroupCompactHead,
  reconcileGroupCompactHeadFromMemory,
} from "./group-compact-head";

import {
  buildProviderNativeCompactExecutionReceiptSummary,
  getProviderNativeCompactExecutionReceiptLedgerFile,
} from "./provider-native-compact-execution-receipt";

import {
  consumeProviderNativeCompactSessionCapacity,
  deleteProviderNativeCompactSessionCapacity,
  getProviderNativeCompactSessionGenerationFence,
  reconcileProviderNativeCompactSessionCapacityReset,
  resetProviderNativeCompactSessionCapacity,
} from "./provider-native-compact-session-capacity";

import {
  deleteGroupMemoryAutoCompactCircuitBreaker,
  readGroupMemoryAutoCompactCircuitBreaker,
  recordGroupMemoryAutoCompactCircuitBreakerOutcome,
} from "./group-memory-auto-compact-circuit-breaker";

import { deleteGroupReactiveCompactRetryOwnership } from "./group-reactive-compact-retry-ownership";
import { deleteGroupCompactionActivity } from "./group-compaction-activity";
import { deleteFinalDispatchContextCollapse } from "../../agents/final-dispatch-context-collapse";

import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification,
} from "./group-prompt-cache-break-detection";

import { deleteWorkerContextCompactSessionArtifactsForCoordinator } from "./group-orchestrator";

import { getGroupApiMicrocompactNativeApplyProofLedgerFile, getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile, getGroupCompactFileReferenceLedgerFile, getGroupPostCompactCandidateUsageLedgerFile } from "./group-compact-file-references";
import { GROUP_MEMORY_DIR, GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR, GROUP_MEMORY_RELOAD_DIR, GROUP_MEMORY_REPLAY_REPAIR_DIR, GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, GROUP_SESSION_MEMORY_DIR, GROUP_SESSION_MEMORY_SNAPSHOT_VERSION, GROUP_SESSION_SCOPED_MEMORY_DIR, GROUP_TOOL_CONTINUITY_DIR, GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION, buildGroupMemoryResumeEffectiveTokenBaseline, cleanGroupMemoryScopePart, compactMemoryText, compressGroupMemory, getGroupMessagesFileHint, removeSessionDirectoryWithin, validateGroupMemoryResumeEffectiveTokenBaseline } from "./group-memory-shared";
import { buildGroupSessionMemorySnapshot, commitGroupSessionMemorySnapshot, evaluateGroupSessionMemoryUpdateCadence, getGroupSessionMemorySnapshotFile, persistGroupSessionMemoryCadenceObservation, readGroupSessionMemorySnapshotSummary } from "./group-session-memory-snapshot";
import { getGroupToolContinuityMarkdownFile, getGroupToolContinuitySnapshotFile, persistGroupToolContinuitySnapshot } from "./group-tool-continuity";

export function getGroupSessionSidecarFile(root: string, groupId: string, sessionId = "") {
  const cleanSessionId = String(sessionId || getActiveGroupChatSessionId(groupId)).trim();
  if (!cleanSessionId || cleanSessionId === "default") {
    return path.join(root, `${cleanGroupMemoryScopePart(groupId)}.json`);
  }
  return path.join(root, cleanGroupMemoryScopePart(groupId), `${cleanGroupMemoryScopePart(cleanSessionId)}.json`);
}


export function getGroupMemoryFile(groupId: string, sessionId = "") {
  const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
  if (resolvedSessionId === "default") return path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  return path.join(GROUP_SESSION_SCOPED_MEMORY_DIR, cleanGroupMemoryScopePart(groupId), `${cleanGroupMemoryScopePart(resolvedSessionId)}.json`);
}


export function getGroupMemoryReloadLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_MEMORY_RELOAD_DIR, groupId, sessionId);
}


export function getGroupPostCompactDispatchLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR, groupId, sessionId);
}


export function getGroupReplayRepairLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_MEMORY_REPLAY_REPAIR_DIR, groupId, sessionId);
}


export function getGroupReplayRepairWorkItemsFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, groupId, sessionId);
}


export function getGroupSessionMemoryDir(groupId: string) {
  return path.join(GROUP_SESSION_MEMORY_DIR, String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
}


export function getGroupSessionMemoryMarkdownFile(groupId: string) {
  return path.join(getGroupSessionMemoryDir(groupId), "summary.md");
}


export function readGroupReplayRepairLedgerSummary(groupId: string, sessionId = "") {
  const file = getGroupReplayRepairLedgerFile(groupId, sessionId);
  try {
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (ledger?.schema !== "ccm-compact-boundary-replay-repair-ledger-v1") return null;
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const latest = entries[entries.length - 1] || {};
    const latestRequiredActionCount = Number(latest.required_action_count || 0);
    const openActionCount = latest.status === "ok" ? 0 : latestRequiredActionCount;
    return {
      schema: "ccm-compact-boundary-replay-repair-ledger-summary-v1",
      file,
      updatedAt: ledger.updatedAt || latest.last_seen_at || latest.at || "",
      attemptCount: entries.length,
      openActionCount,
      reworkRequiredCount: openActionCount > 0 ? 1 : 0,
      historicalReworkRequiredCount: entries.filter((entry: any) => Number(entry.required_action_count || 0) > 0).length,
      latestStatus: latest.status || "",
      latestScore: latest.score ?? null,
      latestRenderedHash: latest.rendered_hash || "",
      latestAttemptId: latest.attempt_id || "",
      recentAttempts: entries.slice(-4).reverse().map((entry: any) => ({
        attempt_id: entry.attempt_id || "",
        status: entry.status || "",
        score: entry.score ?? null,
        target_project: entry.target_project || "",
        required_action_count: Number(entry.required_action_count || 0),
        gap_count: Number(entry.gap_count || 0),
        rendered_hash: entry.rendered_hash || "",
        seen_count: Number(entry.seen_count || 1),
        last_seen_at: entry.last_seen_at || entry.at || "",
      })),
    };
  } catch {
    return null;
  }
}


export function readGroupReplayRepairWorkItemsSummary(groupId: string, sessionId = "") {
  const file = getGroupReplayRepairWorkItemsFile(groupId, sessionId);
  try {
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1") return null;
    const items = Array.isArray(ledger.items) ? ledger.items : [];
    const statusOf = (item: any) => {
      const status = String(item?.status || "").toLowerCase();
      if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
      if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
      if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
      if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
      return "pending";
    };
    const open = items.filter((item: any) => ["pending", "in_progress", "blocked"].includes(statusOf(item)));
    const priorityRank = (priority: any) => priority === "critical" ? 0 : priority === "high" ? 1 : priority === "medium" ? 2 : 3;
    const sortedOpen = [...open].sort((a: any, b: any) => priorityRank(a.priority) - priorityRank(b.priority));
    return {
      schema: "ccm-compact-boundary-replay-repair-work-items-summary-v1",
      file,
      updatedAt: ledger.updatedAt || "",
      latestReplay: ledger.latestReplay || null,
      total: items.length,
      openItemCount: open.length,
      pendingCount: items.filter((item: any) => statusOf(item) === "pending").length,
      inProgressCount: items.filter((item: any) => statusOf(item) === "in_progress").length,
      blockedCount: items.filter((item: any) => statusOf(item) === "blocked").length,
      completedCount: items.filter((item: any) => statusOf(item) === "completed").length,
      cancelledCount: items.filter((item: any) => statusOf(item) === "cancelled").length,
      openItems: sortedOpen.slice(0, 8).map((item: any) => ({
        id: item.id || item.work_item_id || "",
        status: statusOf(item),
        owner: item.owner || "",
        priority: item.priority || "",
        component: item.component || "",
        subject: item.subject || "",
        target: item.target || "",
        repair_target: item.repair_target || "",
        target_project: item.target_project || "",
        source: item.source || "",
        proof_entry_id: item.proof_entry_id || "",
        plan_checksum: item.plan_checksum || "",
        request_patch_checksum: item.request_patch_checksum || "",
        request_telemetry_status: item.request_telemetry_status || "",
        request_telemetry_session_status: item.request_telemetry_session_status || "",
        request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
        runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
        instruction: compactMemoryText(item.instruction || item.description || "", 260),
        expected: compactMemoryText(item.expected || "", 160),
        dispatch_target: item.dispatch_target || item.dispatchTarget || "",
        replay_attempt_id: item.replay_attempt_id || "",
        replay_rendered_hash: item.replay_rendered_hash || "",
      })),
      items: [...sortedOpen, ...items.filter((item: any) => !open.includes(item)).slice(-8)].slice(0, 12).map((item: any) => ({
        id: item.id || item.work_item_id || "",
        status: statusOf(item),
        owner: item.owner || "",
        priority: item.priority || "",
        component: item.component || "",
        subject: item.subject || "",
        target: item.target || "",
        repair_target: item.repair_target || "",
        target_project: item.target_project || "",
        source: item.source || "",
        proof_entry_id: item.proof_entry_id || "",
        plan_checksum: item.plan_checksum || "",
        request_patch_checksum: item.request_patch_checksum || "",
        request_telemetry_status: item.request_telemetry_status || "",
        request_telemetry_session_status: item.request_telemetry_session_status || "",
        request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
        runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
        instruction: compactMemoryText(item.instruction || item.description || "", 260),
        expected: compactMemoryText(item.expected || "", 160),
        dispatch_target: item.dispatch_target || item.dispatchTarget || "",
        replay_attempt_id: item.replay_attempt_id || "",
        replay_rendered_hash: item.replay_rendered_hash || "",
      })),
    };
  } catch {
    return null;
  }
}


export function replayRepairWorkItemStatusForMemory(item: any) {
  const status = String(item?.status || "").toLowerCase();
  if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
  if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
  if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
  return "pending";
}


export function replayRepairCandidatePriorityRank(item: any) {
  const dispatchTarget = String(item.dispatch_target || item.dispatchTarget || "").trim();
  const status = replayRepairWorkItemStatusForMemory(item);
  if (dispatchTarget) return 0;
  if (status === "in_progress" && String(item.owner || "") === "group-main-agent") return 1;
  if (["critical", "high"].includes(String(item.priority || "").toLowerCase())) return 2;
  return 9;
}


export function readGroupReplayRepairDispatchCandidatesSummary(groupId: string, limit = 12, sessionId = "") {
  const file = getGroupReplayRepairWorkItemsFile(groupId, sessionId);
  try {
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1") return null;
    const items = Array.isArray(ledger.items) ? ledger.items : [];
    const openItems = items.filter((item: any) => ["pending", "in_progress", "blocked"].includes(replayRepairWorkItemStatusForMemory(item)));
    const candidates = openItems
      .filter((item: any) => {
        const status = replayRepairWorkItemStatusForMemory(item);
        const priority = String(item.priority || "").toLowerCase();
        return !!String(item.dispatch_target || item.dispatchTarget || "").trim()
          || (status === "in_progress" && String(item.owner || "") === "group-main-agent")
          || (status === "pending" && ["critical", "high"].includes(priority));
      })
      .sort((a: any, b: any) => {
        const dispatchRank = replayRepairCandidatePriorityRank(a) - replayRepairCandidatePriorityRank(b);
        if (dispatchRank) return dispatchRank;
        const priorityRank = (p: any) => p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : 3;
        const priority = priorityRank(a.priority) - priorityRank(b.priority);
        if (priority) return priority;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      })
      .slice(0, limit)
      .map((item: any, index: number) => {
        const dispatchTarget = compactMemoryText(item.dispatch_target || item.dispatchTarget || "", 120);
        const targetProject = compactMemoryText(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
        const workItemId = String(item.work_item_id || item.id || `repair-${index}`);
        return {
          candidate_id: `replay-repair-dispatch:${crypto.createHash("sha256").update(JSON.stringify([groupId, workItemId, targetProject, item.replay_rendered_hash || ""])).digest("hex").slice(0, 14)}`,
          work_item_id: workItemId,
          groupId,
          status: replayRepairWorkItemStatusForMemory(item),
          owner: item.owner || "",
          priority: item.priority || "medium",
          component: item.component || "replay_renderer",
          subject: item.subject || item.title || "修复 Replay Gate 缺口",
          targetProject,
          dispatch_target: dispatchTarget,
          repair_target: item.repair_target || "",
          source: item.source || "",
          proof_entry_id: item.proof_entry_id || "",
          plan_checksum: item.plan_checksum || "",
          request_patch_checksum: item.request_patch_checksum || "",
          worker_context_packet_id: item.worker_context_packet_id || item.packet_id || "",
          worker_context_packet_binding_id: item.worker_context_packet_binding_id || item.binding_id || "",
          worker_context_packet_memory_policy_reason: item.worker_context_packet_memory_policy_reason || "",
          binding_id: item.binding_id || item.worker_context_packet_binding_id || "",
          assignment_id: item.assignment_id || "",
          dispatch_key: item.dispatch_key || "",
          pressure_memory_provenance_gap_codes: item.pressure_memory_provenance_gap_codes || [],
          pressure_memory_provenance_repair_work_item_ids: item.pressure_memory_provenance_repair_work_item_ids || [],
          pressure_memory_provenance_rel_paths: item.pressure_memory_provenance_rel_paths || [],
          request_telemetry_status: item.request_telemetry_status || "",
          request_telemetry_session_status: item.request_telemetry_session_status || "",
          request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
          runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
          instruction: compactMemoryText(item.instruction || item.description || "", 360),
          expected: compactMemoryText(item.expected || "", 200),
          prompt_patch: compactMemoryText(item.prompt_patch || "", 900),
          raw_recovery: item.raw_recovery || {},
          replay_attempt_id: item.replay_attempt_id || "",
          replay_rendered_hash: item.replay_rendered_hash || "",
          boundary_checksum: item.boundary_checksum || "",
          recommendedAction: dispatchTarget
            ? "main_agent_review_and_dispatch_to_child_agent"
            : replayRepairWorkItemStatusForMemory(item) === "in_progress"
            ? "main_agent_prepare_dispatch_brief"
            : "main_agent_claim_or_triage_before_next_child_dispatch",
          shouldCreateRealTask: false,
        };
      });
    const claimedCount = openItems.filter((item: any) => replayRepairWorkItemStatusForMemory(item) === "in_progress" && String(item.owner || "") === "group-main-agent").length;
    const dispatchMarkedCount = openItems.filter((item: any) => String(item.dispatch_target || item.dispatchTarget || "").trim()).length;
    const criticalCount = openItems.filter((item: any) => ["critical", "high"].includes(String(item.priority || "").toLowerCase())).length;
    return {
      schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
      groupId,
      file,
      updatedAt: ledger.updatedAt || "",
      candidateCount: candidates.length,
      openItemCount: openItems.length,
      claimedCount,
      dispatchMarkedCount,
      criticalCount,
      readyCount: candidates.filter((candidate: any) => candidate.dispatch_target || candidate.status === "in_progress").length,
      shouldCreateRealTask: false,
      candidates,
    };
  } catch {
    return null;
  }
}


export function getGroupMemoryBackupFile(groupId: string, sessionId = "") {
  return `${getGroupMemoryFile(groupId, sessionId)}.bak`;
}


export function createEmptyGroupMemory(groupId: string, sessionId = "") {
  const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
  return {
    groupId,
    groupSessionId: resolvedSessionId,
    goal: "",
    summary: "",
    currentPhase: "idle",
    decisions: [],
    completed: [],
    blocked: [],
    workerLedger: [],
    agentMemories: {},
    conversationSummary: null,
    factAnchors: [],
    persistentRequirements: [],
    messageDigest: "",
    sessionMemory: null,
    toolContinuity: null,
    compactBoundary: null,
    compaction: { version: GROUP_MEMORY_COMPACTION_VERSION, enabled: true, health: "empty", compactedMessageCount: 0 },
    messageCompression: { enabled: true, recentLimit: 12, olderLimit: 30, totalMessages: 0, compressedMessages: 0, lastCompressedAt: "" },
    longTermLogDistillation: null,
    openQuestions: [],
    nextActions: [],
    updated_at: new Date().toISOString(),
  };
}


export function loadGroupMemory(groupId: string, sessionId = "") {
  const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
  const file = getGroupMemoryFile(groupId, resolvedSessionId);
  if (!fs.existsSync(file)) return createEmptyGroupMemory(groupId, resolvedSessionId);
  try {
    return { ...createEmptyGroupMemory(groupId, resolvedSessionId), ...JSON.parse(fs.readFileSync(file, "utf-8")), groupSessionId: resolvedSessionId };
  } catch {
    const backup = getGroupMemoryBackupFile(groupId, resolvedSessionId);
    try {
      const recovered = { ...createEmptyGroupMemory(groupId, resolvedSessionId), ...JSON.parse(fs.readFileSync(backup, "utf-8")), groupSessionId: resolvedSessionId };
      const temp = `${file}.${process.pid}.recover.tmp`;
      fs.writeFileSync(temp, JSON.stringify(recovered, null, 2), "utf-8");
      fs.renameSync(temp, file);
      return recovered;
    } catch {}
    return createEmptyGroupMemory(groupId, resolvedSessionId);
  }
}


export function saveGroupMemory(groupId: string, memory: any, sessionId = "", options: any = {}) {
  const resolvedSessionId = String(sessionId || memory?.groupSessionId || getActiveGroupChatSessionId(groupId));
  const snapshotScopeId = resolvedSessionId === "default" ? groupId : `${groupId}--${resolvedSessionId}`;
  const file = getGroupMemoryFile(groupId, resolvedSessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let next = compressGroupMemory({
    ...createEmptyGroupMemory(groupId, resolvedSessionId),
    ...(memory || {}),
    groupId,
    groupSessionId: resolvedSessionId,
    updated_at: new Date().toISOString(),
  });
  try {
    const cadenceDecision = options.sessionMemoryCadenceDecision || options.session_memory_cadence_decision || null;
    let sessionMemory: any = null;
    if (cadenceDecision?.shouldExtract === true
      && !options.sessionMemoryModelMarkdown
      && !options.session_memory_model_markdown) {
      sessionMemory = persistGroupSessionMemoryCadenceObservation(snapshotScopeId, {
        ...cadenceDecision,
        shouldExtract: false,
        status: "model_extraction_due",
        modelExtractionRequired: true,
        modelExtractionQueuedAt: new Date().toISOString(),
      });
    } else if (cadenceDecision && cadenceDecision.shouldExtract !== true) {
      sessionMemory = persistGroupSessionMemoryCadenceObservation(snapshotScopeId, cadenceDecision);
    } else {
      const transaction: any = runGroupSessionMemoryExtractionTransaction(
        snapshotScopeId,
        (extraction: any) => {
          const prepared = buildGroupSessionMemorySnapshot(snapshotScopeId, next, {
            reason: cadenceDecision ? "automatic_session_memory_extraction" : "save_group_memory_manual",
            cadenceDecision,
            extractionTransaction: {
              schema: "ccm-group-session-memory-extraction-transaction-v1",
              status: "prepared",
              leaseId: extraction.lease?.leaseId || "",
              fencingToken: Number(extraction.lease?.fencingToken || 0),
              recovered: extraction.recovered === true,
              startedAt: extraction.state?.startedAt || "",
            },
          });
          return {
            schema: "ccm-group-session-memory-extraction-staged-commit-v1",
            commit: () => commitGroupSessionMemorySnapshot(prepared),
          };
        },
        {
          failBeforeCommit: options.failSessionMemoryExtractionBeforeCommit === true || options.fail_session_memory_extraction_before_commit === true,
          at: options.sessionMemoryExtractionAt || options.session_memory_extraction_at,
          ttlMs: options.sessionMemoryExtractionTtlMs || options.session_memory_extraction_ttl_ms,
        }
      );
      if (transaction.committed) {
        sessionMemory = transaction.value;
      } else if (transaction.status === "lease_busy") {
        const existing = readGroupSessionMemorySnapshotSummary(snapshotScopeId) || {};
        sessionMemory = {
          ...existing,
          extractionTransaction: {
            schema: "ccm-group-session-memory-extraction-transaction-v1",
            status: "in_progress",
            leaseId: transaction.acquired?.status?.lease?.leaseId || "",
            fencingToken: Number(transaction.acquired?.status?.lease?.fencingToken || 0),
          },
        };
      } else if (transaction.status === "failed") {
        const existing = readGroupSessionMemorySnapshotSummary(snapshotScopeId) || {};
        const failedCadence = cadenceDecision || existing.updateCadence || null;
        sessionMemory = failedCadence
          ? persistGroupSessionMemoryCadenceObservation(snapshotScopeId, {
            ...failedCadence,
            shouldExtract: false,
            status: "extraction_failed",
            lastExtractionError: transaction.error || transaction.status,
          })
          : existing;
        sessionMemory = {
          ...sessionMemory,
          extractionTransaction: {
            schema: "ccm-group-session-memory-extraction-transaction-v1",
            status: "failed",
            error: transaction.error || transaction.status,
            leaseId: transaction.lease?.leaseId || "",
            fencingToken: Number(transaction.lease?.fencingToken || 0),
          },
        };
      } else {
        const existing = readGroupSessionMemorySnapshotSummary(snapshotScopeId) || {};
        sessionMemory = {
          ...existing,
          extractionTransaction: {
            schema: "ccm-group-session-memory-extraction-transaction-v1",
            status: "blocked",
            error: transaction.error || transaction.status,
          },
        };
      }
    }
    next = {
      ...next,
      sessionMemory,
    };
  } catch (error: any) {
    next = {
      ...next,
      sessionMemory: {
        schema: "ccm-group-session-memory-snapshot-v1",
        version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
        groupId,
        snapshotFile: getGroupSessionMemorySnapshotFile(snapshotScopeId),
        summaryFile: getGroupSessionMemoryMarkdownFile(snapshotScopeId),
        generatedAt: new Date().toISOString(),
        error: error?.message || String(error),
      },
    };
  }
  try {
    next = {
      ...next,
      toolContinuity: persistGroupToolContinuitySnapshot(snapshotScopeId, next, { reason: "save_group_memory" }),
    };
  } catch (error: any) {
    next = {
      ...next,
      toolContinuity: {
        schema: "ccm-group-tool-continuity-snapshot-v1",
        version: GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
        groupId,
        snapshotFile: getGroupToolContinuitySnapshotFile(snapshotScopeId),
        summaryFile: getGroupToolContinuityMarkdownFile(snapshotScopeId),
        generatedAt: new Date().toISOString(),
        shouldReuseAsContext: true,
        shouldBypassAuthorization: false,
        error: error?.message || String(error),
      },
    };
  }
  const backup = getGroupMemoryBackupFile(groupId, resolvedSessionId);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try {
      JSON.parse(fs.readFileSync(file, "utf-8"));
      fs.copyFileSync(file, backup);
    } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(temp, file);
  try {
    commitGroupMemoryCompactBoundary({
      groupId,
      sessionId: resolvedSessionId,
      memory: next,
      boundary: next.compactBoundary,
      messages: getGroupMessages(groupId, resolvedSessionId).filter((message: any) => !String(message?.content || "").startsWith("📤")),
      transcriptPath: getGroupMessagesFileHint(groupId, resolvedSessionId),
    });
  } catch {}
  return next;
}


export function deleteGroupSessionMemoryArtifacts(groupId: string, sessionId: string) {
  const cleanSessionId = String(sessionId || "").trim();
  if (!cleanSessionId) throw new Error("缺少群聊会话 ID");
  const scopeId = cleanSessionId === "default" ? groupId : `${groupId}--${cleanSessionId}`;
  const files = [
    getGroupMemoryFile(groupId, cleanSessionId),
    `${getGroupMemoryFile(groupId, cleanSessionId)}.bak`,
    getGroupCompactFileReferenceLedgerFile(scopeId),
    `${getGroupCompactFileReferenceLedgerFile(scopeId)}.bak`,
    getGroupMemoryReloadLedgerFile(groupId, cleanSessionId),
    `${getGroupMemoryReloadLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupPostCompactDispatchLedgerFile(groupId, cleanSessionId),
    `${getGroupPostCompactDispatchLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupPostCompactCandidateUsageLedgerFile(groupId, cleanSessionId),
    `${getGroupPostCompactCandidateUsageLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, cleanSessionId),
    `${getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, cleanSessionId),
    `${getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, cleanSessionId)}.bak`,
    getProviderNativeCompactExecutionReceiptLedgerFile(groupId, cleanSessionId),
    `${getProviderNativeCompactExecutionReceiptLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupReplayRepairLedgerFile(groupId, cleanSessionId),
    `${getGroupReplayRepairLedgerFile(groupId, cleanSessionId)}.bak`,
    getGroupReplayRepairWorkItemsFile(groupId, cleanSessionId),
    `${getGroupReplayRepairWorkItemsFile(groupId, cleanSessionId)}.bak`,
  ];
  let deletedFiles = 0;
  for (const file of files) {
    try { if (fs.existsSync(file)) { fs.unlinkSync(file); deletedFiles += 1; } } catch {}
  }
  const directories = [
    { root: GROUP_SESSION_MEMORY_DIR, target: path.join(GROUP_SESSION_MEMORY_DIR, scopeId) },
    { root: GROUP_TOOL_CONTINUITY_DIR, target: path.join(GROUP_TOOL_CONTINUITY_DIR, scopeId) },
    { root: path.dirname(getGroupTypedMemoryDir(scopeId)), target: getGroupTypedMemoryDir(scopeId) },
  ];
  for (const item of directories) {
    try { deletedFiles += removeSessionDirectoryWithin(item.root, item.target); } catch {}
  }
  let typedMemoryDispatchWalDeleted = 0;
  if (cleanSessionId.startsWith("gcs_")) {
    try {
      typedMemoryDispatchWalDeleted = removeSessionDirectoryWithin(
        TYPED_MEMORY_DISPATCH_WAL_DIR,
        getTypedMemoryDispatchWalScopeDir(groupId, cleanSessionId)
      );
      deletedFiles += typedMemoryDispatchWalDeleted;
    } catch {}
  }
  const boundaryArtifacts = deleteGroupMemoryBoundaryArtifacts(groupId, cleanSessionId);
  deletedFiles += Number(boundaryArtifacts.deletedFiles || 0);
  const invocationLineageArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteTaskAgentInvocationLineageArtifacts(groupId, cleanSessionId)
    : { deleted: 0, recoveryDeleted: 0 };
  const recoveryDeleted = "recoveryDeleted" in invocationLineageArtifacts
    ? invocationLineageArtifacts.recoveryDeleted
    : 0;
  deletedFiles += Number(invocationLineageArtifacts.deleted || 0) + Number(recoveryDeleted || 0);
  const continuationSoakArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteTaskAgentContinuationSoakArtifacts(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(continuationSoakArtifacts.deleted || 0);
  const compactHeadArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteGroupCompactHead(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(compactHeadArtifacts.deleted || 0);
  const providerNativeCompactSessionCapacityArtifacts = deleteProviderNativeCompactSessionCapacity(groupId, cleanSessionId);
  deletedFiles += Number(providerNativeCompactSessionCapacityArtifacts.deleted || 0);
  const autoCompactCircuitBreakerArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteGroupMemoryAutoCompactCircuitBreaker(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(autoCompactCircuitBreakerArtifacts.deleted || 0);
  const compactionActivityArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteGroupCompactionActivity(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(compactionActivityArtifacts.deleted || 0);
  const reactiveCompactRetryOwnershipArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteGroupReactiveCompactRetryOwnership(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(reactiveCompactRetryOwnershipArtifacts.deleted || 0);
  const finalDispatchContextCollapseArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteFinalDispatchContextCollapse(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(finalDispatchContextCollapseArtifacts.deleted || 0);
  const promptCacheBreakDetectionArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteGroupPromptCacheBreakDetection(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(promptCacheBreakDetectionArtifacts.deleted || 0);
  const workerContextCompactSessionArtifacts = cleanSessionId.startsWith("gcs_")
    ? deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId, cleanSessionId)
    : { deleted: 0 };
  deletedFiles += Number(workerContextCompactSessionArtifacts.deleted || 0);
  const conflictResolutionMaintenanceSchedulerArtifacts = cleanSessionId.startsWith("gcs_")
    ? (() => {
      try {
        const { deleteConflictResolutionMemoryMaintenanceSchedulerSessionState } = require("../scheduling/cron");
        return deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId, cleanSessionId);
      } catch (error: any) {
        return { removed: false, error: String(error?.message || error) };
      }
    })()
    : { removed: false };
  return {
    schema: "ccm-group-session-memory-artifact-delete-v1",
    groupId,
    sessionId: cleanSessionId,
    scopeId,
    deletedFiles,
    boundaryArtifacts,
    typedMemoryDispatchWalArtifacts: { deletedFiles: typedMemoryDispatchWalDeleted },
    invocationLineageArtifacts,
    continuationSoakArtifacts,
    compactHeadArtifacts,
    providerNativeCompactSessionCapacityArtifacts,
    autoCompactCircuitBreakerArtifacts,
    compactionActivityArtifacts,
    reactiveCompactRetryOwnershipArtifacts,
    promptCacheBreakDetectionArtifacts,
    workerContextCompactSessionArtifacts,
    conflictResolutionMaintenanceSchedulerArtifacts,
    deletedAt: new Date().toISOString(),
  };
}


export function persistGroupMemoryResumeEffectiveTokenBaseline(
  groupId: string,
  groupSessionId: string,
  allMessages: any[],
  memory: any,
  projection: any,
  options: any = {}
) {
  const baseline = buildGroupMemoryResumeEffectiveTokenBaseline(projection, memory, allMessages, options);
  if (!baseline || !validateGroupMemoryResumeEffectiveTokenBaseline(baseline)) return { memory, baseline: null, cadenceDecision: null };
  const sessionMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
  const previousSessionMemory = readGroupSessionMemorySnapshotSummary(sessionMemoryScopeId) || memory?.sessionMemory || {};
  const previousCadence = previousSessionMemory?.updateCadence || previousSessionMemory?.update_cadence || {};
  const previousTokensAtLastExtraction = Math.max(0, Number(previousCadence.tokensAtLastExtraction || 0));
  const cadenceRebased = previousTokensAtLastExtraction > baseline.effectiveContextTokens;
  const cadenceDecision = {
    ...evaluateGroupSessionMemoryUpdateCadence(
      projection.projectedMessages || [],
      {
        ...previousSessionMemory,
        updateCadence: {
          ...previousCadence,
          tokensAtLastExtraction: cadenceRebased ? baseline.effectiveContextTokens : previousTokensAtLastExtraction,
        },
      },
      { ...options, currentContextTokens: baseline.effectiveContextTokens }
    ),
    tokenBasis: "verified_resume_effective_context",
    resumeBaselineId: baseline.baselineId,
    resumeBaselineChecksum: baseline.baselineChecksum,
    rawTranscriptTokens: baseline.rawTranscriptTokens,
    effectiveContextTokens: baseline.effectiveContextTokens,
    cadenceRebased,
    previousTokensAtLastExtraction,
  };
  const saved = saveGroupMemory(groupId, {
    ...memory,
    compaction: {
      ...(memory?.compaction || {}),
      resumeEffectiveTokenBaseline: baseline,
      contextPressureWarning: baseline.pressureWarning,
      compactWarning: baseline.pressureWarning,
      lastPressureSampleAt: baseline.observedAt,
    },
    messageCompression: {
      ...(memory?.messageCompression || {}),
      resumeEffectiveTokenBaseline: baseline,
      contextPressureWarning: baseline.pressureWarning,
    },
  }, groupSessionId, { sessionMemoryCadenceDecision: cadenceDecision });
  return { memory: saved, baseline, cadenceDecision };
}


export function hashGroupMemoryFileWindow(file: string, stat: fs.Stats, maxBytes = 256_000) {
  const hash = crypto.createHash("sha256");
  if (stat.size <= maxBytes) {
    const content = fs.readFileSync(file);
    hash.update(content);
    return {
      checksum: hash.digest("hex").slice(0, 24),
      checksumMode: "full",
      lineCount: content.toString("utf-8").split(/\n/).length,
    };
  }
  const headBytes = Math.max(1, Math.floor(maxBytes / 2));
  const tailBytes = Math.max(1, maxBytes - headBytes);
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(headBytes);
    const tail = Buffer.alloc(tailBytes);
    const headRead = fs.readSync(fd, head, 0, headBytes, 0);
    const tailRead = fs.readSync(fd, tail, 0, tailBytes, Math.max(0, stat.size - tailBytes));
    hash.update(`head_tail:${stat.size}:${stat.mtimeMs}:`);
    hash.update(head.subarray(0, headRead));
    hash.update(tail.subarray(0, tailRead));
    return { checksum: hash.digest("hex").slice(0, 24), checksumMode: "head_tail", lineCount: 0 };
  } finally {
    try { fs.closeSync(fd); } catch {}
  }
}
