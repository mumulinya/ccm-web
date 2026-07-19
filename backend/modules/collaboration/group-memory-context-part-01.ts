// Behavior-freeze split from group-memory-context.ts (part 1/5).
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
import { isCanonicalGroupSessionMemory, modelVisibleGroupRuntimeState } from "./group-runtime-memory-admission";

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
  renderConversationSummary } from "./group-memory-compaction";

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
  upsertGroupTypedMemoryDocument } from "./group-memory-index";

import {
  buildWorkerTypedMemoryDeliveryLease,
  buildWorkerTypedMemoryDispatchTicket,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  validateWorkerTypedMemoryDeliveryLease,
  validateWorkerTypedMemoryDispatchTicket } from "../../agents/runtime-kernel";

import {
  appendGroupMessage,
  getActiveGroupChatSessionId,
  getGroupChatSessionMessagesFile,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  registerGroupMessageAppendHook,
  saveGroupMessages } from "./storage";

import {
  buildGroupMemorySnipBoundaryMarker,
  buildGroupMemoryResumeProjection,
  commitGroupMemoryCompactBoundary,
  deleteGroupMemoryBoundaryArtifacts,
  getGroupMemoryBoundaryJournalFile,
  getGroupMemoryResumeProofFile,
  quarantineInvalidGroupMemoryBoundaryJournal,
  recordGroupMemoryResumeProjectionProof,
  retireGroupMemoryBoundaryJournal } from "./group-memory-boundary-journal";

import {
  runGroupSessionMemoryExtractionTransaction } from "./group-session-memory-extraction";

import {
  GLOBAL_AGENT_MEMORY_FILE,
  acquireGlobalAgentMemorySelfTestLock,
  recallGlobalAgentMemory,
  scanGlobalAgentMemorySelfTestContamination } from "../../agents/global/memory";

import { loadExecution } from "../../agents/execution-kernel";

import { DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA, pruneDirectAgentDispatchSpool, validateDirectAgentDispatchPair } from "../../agents/direct-dispatch-spool";

import {
  commitTaskAgentSessionCapacityRevalidation,
  recordTaskAgentMemoryContextDelivery,
  verifyMemoryContextDeliveryReceiptChecksum } from "../../tasks/agent-sessions";

import {
  createTypedMemoryDispatchWal,
  getTypedMemoryDispatchWalScopeDir,
  listTypedMemoryDispatchWal,
  pruneTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  transitionTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal } from "./typed-memory-dispatch-wal";

import {
  backfillGroupPostTurnSummaries,
  buildGroupPostTurnSummaryDeliveryCapsule,
  extractGroupPostTurnSummaryDeliveryCapsule,
  getGroupPostTurnSummaryLedgerFile,
  readGroupPostTurnSummaries,
  recordGroupPostTurnSummary,
  validateGroupPostTurnSummaryDeliveryCapsule } from "./group-post-turn-summary";

import { deleteTaskAgentInvocationLineageArtifacts } from "../../tasks/task-agent-invocation-lineage";

import { deleteTaskAgentContinuationSoakArtifacts } from "../../tasks/task-agent-continuation-soak";

import {
  commitGroupCompactHead,
  deleteGroupCompactHead,
  readGroupCompactHead,
  reconcileGroupCompactHeadFromMemory } from "./group-compact-head";

import {
  buildProviderNativeCompactExecutionReceiptSummary,
  getProviderNativeCompactExecutionReceiptLedgerFile } from "./provider-native-compact-execution-receipt";

import {
  consumeProviderNativeCompactSessionCapacity,
  deleteProviderNativeCompactSessionCapacity,
  getProviderNativeCompactSessionGenerationFence,
  reconcileProviderNativeCompactSessionCapacityReset,
  resetProviderNativeCompactSessionCapacity } from "./provider-native-compact-session-capacity";

import {
  deleteGroupMemoryAutoCompactCircuitBreaker,
  readGroupMemoryAutoCompactCircuitBreaker,
  recordGroupMemoryAutoCompactCircuitBreakerOutcome } from "./group-memory-auto-compact-circuit-breaker";

import { deleteGroupReactiveCompactRetryOwnership } from "./group-reactive-compact-retry-ownership";

import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification } from "./group-prompt-cache-break-detection";

import { deleteWorkerContextCompactSessionArtifactsForCoordinator } from "./group-orchestrator";

import { buildChildTypedMemoryDeliveryCapsule, buildChildTypedMemoryRecallLedgerScope, verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext } from "./group-agent-memory-packet";
import { buildGroupApiMicrocompactNativeApplyProofSummary, buildGroupCompactFileReferenceReadPlan, buildGroupCompactFileReferenceReadPlanRevalidationGate, buildGroupCompactFileReferences, buildGroupMemoryDispatchFreshnessGate, buildGroupMemorySourceManifest, buildGroupPostCompactCandidateUsageSummary, getGroupApiMicrocompactNativeApplyProofLedgerFile, getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile, getGroupPostCompactCandidateUsageLedgerFile, latestGroupCompactFileReferenceReadPlanRows, recordGroupCompactFileReferenceSurfacing, recordGroupMemoryReloadAudit, recordGroupPostCompactFirstDispatchMarker, summarizeGroupCompactFileReferenceAccess, summarizeGroupCompactFileReferenceReadPlanAccess, summarizeGroupCompactFileReferenceReadPlanFreshness } from "./group-compact-file-references";
import { buildChildGlobalAgentMemoryContext, distillGroupGlobalMemoryArbitrationToTypedMemory, getGroupGlobalMemoryArbitrationLedgerFile, recordGroupGlobalMemoryArbitrationLedger } from "./group-global-memory-arbitration";
import { GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS, GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION, POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH, POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH, POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH, POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH, POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH, PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH, PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH, buildBackgroundCompactionState, buildCompressedGroupMessageDigest, buildGroupCompactBoundaryHistorySummary, buildGroupMemoryResumeEffectiveTokenBaseline, clearUntrustedGroupCompactionState, compactMemoryText, compactPreserveLines, createEmptyAgentMemory, formatAgentMemoryReceipt, getCompactBoundaryIndex, getGroupMessagesFileHint, groupMemoryAutoCompactPending, groupMemoryAutoCompactRunning, groupMemoryAutoCompactTimers, hasToolGrantSet, hashSessionMemoryText, importGroupProjectMemoriesForMembers, isGroupModelCompactionEnabled, isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery, isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery, isProviderRankingProvenanceCompactRepairReceiptRecallQuery, latestGroupMessageTimestamp, loadGroupMemoryCompactionConfig, normalizeAgentMemoryProject, normalizeGlobalGroupMemoryMembers, resolveGroupProjectMemoryRoot, scoreGlobalGroupMemoryCandidate, uniqueProviderRankingCompactRepairRecallStrings, validateGroupMemoryResumeEffectiveTokenBaseline } from "./group-memory-shared";
import { groupMemoryAutoCompactHookRegistered, markGroupMemoryAutoCompactHookRegistered } from "./group-memory-auto-compact-hook-state";

import { getGroupMemoryFile, getGroupPostCompactDispatchLedgerFile, getGroupReplayRepairLedgerFile, getGroupReplayRepairWorkItemsFile, getGroupSessionMemoryMarkdownFile, loadGroupMemory, persistGroupMemoryResumeEffectiveTokenBaseline, readGroupReplayRepairDispatchCandidatesSummary, readGroupReplayRepairLedgerSummary, readGroupReplayRepairWorkItemsSummary, saveGroupMemory } from "./group-memory-storage";
import { getGroupSessionMemorySnapshotFile, readGroupSessionMemorySnapshotSummary, refreshGroupConversationMemorySnapshot } from "./group-session-memory-snapshot";
import { getGroupToolContinuityMarkdownFile, getGroupToolContinuitySnapshotFile, readGroupToolContinuitySnapshotSummary } from "./group-tool-continuity";
import {
  buildGroupCompactionLifecycleCommitProof,
  ensureGroupSessionLifecycleHead,
  validateGroupSessionLifecycleRuntimeFence,
  withGroupSessionLifecycleCommitFence,
} from "./group-session-lifecycle-head";
import {
  assertGroupCompactionNotCancelled,
  finishGroupCompactionActivity,
  pulseGroupCompactionActivity,
  startGroupCompactionActivity,
  withGroupCompactionActivityCommitFence,
} from "./group-compaction-activity";

export function buildChildAgentTypeSummary(memory: any = {}) {
  const typeMap = new Map<string, any>();
  const normalize = (value: any) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "unknown";
    if (/(claude|claudecode|claude-code|cc\b)/i.test(raw)) return "claudecode";
    if (/cursor/i.test(raw)) return "cursor";
    if (/codex/i.test(raw)) return "codex";
    return raw.replace(/[^a-z0-9._:-]+/g, "-").slice(0, 80) || "unknown";
  };
  const add = (project: any, agentType: any, source = "memory") => {
    const targetProject = String(project || "").trim();
    if (!targetProject) return;
    const type = normalize(agentType || targetProject);
    const row = typeMap.get(type) || { agentType: type, targetCount: 0, targets: [] };
    if (!row.targets.some((item: any) => item.targetProject === targetProject)) {
      row.targetCount++;
      row.targets.push({ targetProject, source, rawAgentType: String(agentType || "").trim() });
    }
    typeMap.set(type, row);
  };
  for (const [project, agentMemory] of Object.entries(memory?.agentMemories || {})) {
    add(project, (agentMemory as any)?.agentType || (agentMemory as any)?.agent_type || (agentMemory as any)?.agent || "", "agent_memory");
  }
  for (const entry of Array.isArray(memory?.workerLedger) ? memory.workerLedger.slice(-30) : []) {
    add(entry.project || entry.target_project || entry.agent, entry.agentType || entry.agent_type || entry.runner || "", "worker_ledger");
  }
  const rows = Array.from(typeMap.values()).sort((a: any, b: any) => String(a.agentType).localeCompare(String(b.agentType)));
  if (!rows.length) return null;
  return {
    schema: "ccm-child-agent-type-summary-v1",
    agentTypeCount: rows.length,
    targetCount: rows.reduce((sum: number, row: any) => sum + Number(row.targetCount || 0), 0),
    rows };
}

export function verifyGroupSessionMemoryFactSupersessionGraphForContext(graph: any) {
  if (!graph?.checksum || graph.schema !== "ccm-group-session-memory-fact-supersession-graph-v1") return false;
  const payload = { ...graph };
  delete payload.checksum;
  if (hashSessionMemoryText(JSON.stringify(payload), 64) !== String(graph.checksum || "")) return false;
  const facts = Array.isArray(graph.facts) ? graph.facts : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const factById = new Map(facts.map((fact: any) => [String(fact.factId || ""), fact]));
  return edges.every((edge: any) => {
    const oldFact: any = factById.get(String(edge.oldFactId || ""));
    return !!oldFact
      && oldFact.status === "superseded"
      && String(oldFact.factChecksum || "") === String(edge.oldFactChecksum || "")
      && String(oldFact.supersessionEdgeId || "") === String(edge.edgeId || "")
      && !!String(edge.sourceMessageId || "").trim()
      && !!String(edge.replacementText || "").trim()
      && hashSessionMemoryText(edge.replacementText, 32) === String(edge.newFactChecksum || "")
      && hashSessionMemoryText(edge.sourceMessageText, 32) === String(edge.sourceMessageChecksum || "");
  });
}

export function buildChildAgentSessionBinding(groupId: string, targetProject: string, task = "", options: any = {}) {
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const taskId = String(options.taskId || options.task_id || options.task?.id || "").trim();
  const traceId = String(options.traceId || options.trace_id || options.task?.trace_id || options.task?.traceId || "").trim();
  const taskAgentSessionId = String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionRecordId || options.session_record_id || "").trim();
  const nativeSessionId = String(options.nativeSessionId || options.native_session_id || "").trim();
  const agentType = String(options.agentType || options.agent_type || "").trim();
  const executionId = String(options.executionId || options.execution_id || "").trim();
  const parentRunId = String(options.parentRunId || options.parent_run_id || options.globalRunId || options.global_run_id || "").trim();
  const turn = Number(options.taskAgentSessionTurn || options.task_agent_session_turn || options.sessionTurn || options.session_turn || 0);
  const bindingId = `csm:${crypto.createHash("sha256").update(JSON.stringify([
    groupId,
    groupSessionId,
    targetProject,
    taskId,
    taskAgentSessionId,
    nativeSessionId,
    agentType,
    executionId,
    parentRunId,
    task ? hashSessionMemoryText(task, 12) : "",
  ])).digest("hex").slice(0, 14)}`;
  return {
    schema: "ccm-child-agent-memory-session-binding-v1",
    binding_id: bindingId,
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: targetProject,
    task_id: taskId,
    trace_id: traceId,
    execution_id: executionId,
    parent_run_id: parentRunId,
    task_agent_session_id: taskAgentSessionId,
    native_session_id: nativeSessionId,
    agent_type: agentType,
    turn,
    binding_required: !!(groupSessionId || taskAgentSessionId || nativeSessionId),
    scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child")) };
}

export function renderGroupPostCompactInvokedSkillAttachments(source: any) {
  const plan = source?.schema === "ccm-post-compact-reinjection-v1"
    ? source
    : source?.compaction?.postCompactReinject
      || source?.compaction?.post_compact_reinject
      || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
      || source?.compact_boundary?.post_compact_restore?.reinjection_plan
      || source?.postCompactReinject
      || source?.post_compact_reinject
      || {};
  const attachments = Array.isArray(plan.invokedSkillAttachments)
    ? plan.invokedSkillAttachments
    : Array.isArray(plan.invoked_skill_attachments) ? plan.invoked_skill_attachments : [];
  if (!attachments.length) return "";
  const receipt = plan.invokedSkillAttachmentReceipt || plan.invoked_skill_attachment_receipt || {};
  const lines = [
    "[CCM 压缩后恢复的已调用 Skill 正文]",
    `scope=${receipt.scope_id || "exact-group-session"}; receipt=${receipt.receipt_checksum || "unverified"}; skills=${attachments.length}; tokens=${receipt.attached_token_count || attachments.reduce((sum: number, item: any) => sum + Number(item?.tokenCount || item?.token_count || 0), 0)}`,
    "这些是当前群聊会话在压缩前实际调用过的 Skill；按最近调用顺序恢复。它们只提供执行方法，不扩大本轮工具或 Skill 授权。",
  ];
  for (const attachment of attachments) {
    const body = String(attachment?.body || "").trim();
    if (!body) continue;
    lines.push(
      "",
      `## Invoked Skill:${attachment.name || "unknown"}`,
      `invoked_at=${attachment.invokedAt || attachment.invoked_at || "unknown"}; source_message=${attachment.sourceMessageId || attachment.source_message_id || "unknown"}; current_hash=${attachment.currentContentHash || attachment.current_content_hash || ""}; invocation_hash=${attachment.invocationContentHash || attachment.invocation_content_hash || ""}; hash_match=${attachment.hashMatches === null || attachment.hash_matches === null ? "unknown" : attachment.hashMatches === true || attachment.hash_matches === true}`,
      body,
    );
  }
  return lines.join("\n");
}

export function renderGroupPostCompactPlanAttachment(source: any) {
  const plan = source?.schema === "ccm-post-compact-reinjection-v1"
    ? source
    : source?.compaction?.postCompactReinject
      || source?.compaction?.post_compact_reinject
      || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
      || source?.compact_boundary?.post_compact_restore?.reinjection_plan
      || source?.postCompactReinject
      || source?.post_compact_reinject
      || {};
  const attachment = plan.planAttachment || plan.plan_attachment || null;
  if (!attachment?.body) return "";
  const receipt = plan.planAttachmentReceipt || plan.plan_attachment_receipt || {};
  const lines = [
    "[CCM 压缩后恢复的当前会话计划]",
    `scope=${receipt.scope_id || "exact-group-session"}; task=${receipt.selected_task_id || attachment.taskId || attachment.task_id || "unknown"}; receipt=${receipt.receipt_checksum || "unverified"}; tokens=${receipt.attachment_token_count || attachment.tokenCount || attachment.token_count || 0}`,
    receipt.plan_mode_active === true || attachment.planModeActive === true || attachment.plan_mode_active === true
      ? "计划模式仍处于等待确认状态：只能继续只读探索或修订计划；用户确认前不得派发执行、修改文件或运行写入/破坏性动作。"
      : receipt.confirmation_status === "confirmed" || attachment.confirmationStatus === "confirmed"
        ? "计划已经确认：将其作为当前执行与验收依据，不要误判为仍在等待确认。"
        : "这是当前精确群聊会话的计划引用；执行前仍需核对实时任务状态和当前授权。",
    String(attachment.body || "").trim(),
  ];
  return lines.join("\n");
}

export function renderGroupPostCompactDynamicContextDelta(source: any) {
  const plan = source?.schema === "ccm-post-compact-reinjection-v1"
    ? source
    : source?.compaction?.postCompactReinject
      || source?.compaction?.post_compact_reinject
      || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
      || source?.compact_boundary?.post_compact_restore?.reinjection_plan
      || source?.postCompactReinject
      || source?.post_compact_reinject
      || {};
  const attachment = plan.dynamicContextDeltaAttachment || plan.dynamic_context_delta_attachment || null;
  if (!attachment?.body) return "";
  const receipt = plan.dynamicContextDeltaReceipt || plan.dynamic_context_delta_receipt || {};
  return [
    "[CCM 压缩后动态运行上下文差异]",
    `scope=${receipt.scope_id || "exact-group-session"}; mode=${receipt.scan_mode || attachment.scanMode || "full"}; receipt=${receipt.receipt_checksum || "unverified"}; tokens=${receipt.attachment_token_count || attachment.tokenCount || 0}`,
    "工具、Agent 和 MCP instructions 只按当前授权与连接状态恢复；removed 项不得继续调用，附件本身不扩大权限。",
    String(attachment.body || "").trim(),
  ].join("\n");
}

export function buildGroupMemoryContext(memory: any) {
  const modelRuntime = modelVisibleGroupRuntimeState(memory);
  const groupSessionMemoryScopeId = memory?.groupSessionId && memory.groupSessionId !== "default"
    ? `${memory.groupId || ""}--${memory.groupSessionId}`
    : memory?.groupId || "";
  const sessionMemory = readGroupSessionMemorySnapshotSummary(groupSessionMemoryScopeId);
  const canonicalSessionMemory = isCanonicalGroupSessionMemory(sessionMemory);
  if (!memory || (!memory.goal && !memory.summary && !memory.messageDigest && !memory.conversationSummary && !canonicalSessionMemory && !memory.toolContinuity?.schema && !memory.compaction?.postCompactReinject?.invokedSkillAttachments?.length && !memory.compaction?.postCompactReinject?.planAttachment && !memory.compaction?.postCompactReinject?.dynamicContextDeltaAttachment && !modelRuntime.decisions.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !Object.keys(memory.agentMemories || {}).length && !memory.openQuestions?.length && !modelRuntime.nextActions.length)) {
    return "";
  }
  const lines = [
    "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
    `- 原始/当前目标：${memory.goal || "未记录"}`,
    `- 当前阶段：${memory.currentPhase || "idle"}`,
  ];
  if (memory.summary) lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 900)}`);
  if (memory.messageDigest) lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 900)}`);
  const invokedSkillAttachmentText = renderGroupPostCompactInvokedSkillAttachments(memory);
  if (invokedSkillAttachmentText) lines.push(invokedSkillAttachmentText);
  const planAttachmentText = renderGroupPostCompactPlanAttachment(memory);
  if (planAttachmentText) lines.push(planAttachmentText);
  const dynamicContextDeltaText = renderGroupPostCompactDynamicContextDelta(memory);
  if (dynamicContextDeltaText) lines.push(dynamicContextDeltaText);
  if (canonicalSessionMemory) {
    lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；该文件是压缩后主/子 Agent 可重注入的会话级短记忆。`);
    const cadence = sessionMemory.updateCadence || sessionMemory.update_cadence || {};
    if (cadence.schema) {
      lines.push(`- Session Memory 更新节奏：${cadence.status || "unknown"}；cursor=${cadence.lastExtractionCursorStatus || "legacy"}；advance=${cadence.cursorAdvanceStatus || "legacy"}；delta=${cadence.tokensSinceLastExtraction || 0} tokens；toolCalls=${cadence.toolCallsSinceLastExtraction || 0}；scan=${cadence.toolCallScanMessageCount || 0} messages。`);
      if (cadence.cursorAdvanceStatus === "held_tool_use_boundary") lines.push(`- 本轮 Session Memory 已更新，但抽取游标保持在 ${cadence.cursorAfter || cadence.cursorBefore || "session-start"}，原因：最后一个 assistant turn 仍含工具调用；后续项目子 Agent 必须保留完整 tool_use/tool_result 边界。`);
    }
  }
  const sessionMemorySelection = memory.compaction?.sessionMemoryCompactSelection
    || memory.compactBoundary?.sessionMemoryCompactSelection
    || memory.messageCompression?.sessionMemoryCompactSelection;
  if (sessionMemorySelection?.schema === "ccm-group-session-memory-compact-selection-v1") {
    const closure = sessionMemorySelection.api_invariant_closure || {};
    lines.push(`- Session Memory 压缩选择：${sessionMemorySelection.status || "unknown"}；cursor=${sessionMemorySelection.cursor_status || "unknown"}；保留 ${sessionMemorySelection.preserved_message_count || 0} 条 / 约 ${sessionMemorySelection.preserved_token_estimate || 0} tokens；API invariant closure=${closure.pass === true ? `pass(+${closure.expanded_message_count || 0})` : closure.schema ? "fail" : "unknown"}；compaction API called=${sessionMemorySelection.compaction_api_called === true}${sessionMemorySelection.fallback_reason ? `；fallback=${sessionMemorySelection.fallback_reason}` : ""}。`);
    if (sessionMemorySelection.template_empty_checked === true) {
      lines.push(`- Session Memory 模板空状态：scope=${sessionMemorySelection.template_scope_id || "unknown"}；source=${sessionMemorySelection.template_source || "unknown"}；sections=${sessionMemorySelection.template_section_count || 0}；templateOnly=${sessionMemorySelection.template_only === true}；checksum=${sessionMemorySelection.template_checksum || "unknown"}。只有包含模板之外的实际内容时才允许 compact 复用。`);
    }
  }
  const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotSummary(memory.groupId || "");
  if (toolContinuity?.schema && (hasToolGrantSet(toolContinuity.allowedTools) || hasToolGrantSet(toolContinuity.requested) || (toolContinuity.invokedSkills || []).length || toolContinuity.markdownExists)) {
    lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；allowed MCP ${(toolContinuity.allowedTools?.mcp || []).length}/Skill ${(toolContinuity.allowedTools?.skill || []).length}；invokedSkill ${(toolContinuity.invokedSkills || []).length}；只恢复工具上下文，不扩大授权，真实派发仍以当前 runtime tool gate 为准。`);
  }
  if (memory.compactBoundary) {
    const boundary = memory.compactBoundary;
    const budget = boundary.context_budget || {};
    lines.push(`- 群聊压缩边界：${boundary.summarizedFromMessageId || ""} -> ${boundary.summarizedThroughMessageId || ""}；保留 ${boundary.preservedMessageIds?.length || 0} 条锚点；压缩前 ${boundary.preCompactTokenCount || 0} tokens，压缩后 ${boundary.postCompactTokenCount || 0} tokens，压力 ${budget.pressure ?? 0}%。`);
    if (boundary.preservedSegment?.schema) {
      lines.push(`- 保留窗口：preservedSegment 保留 ${boundary.preservedSegment.preservedMessageCount || 0} 条 / 约 ${boundary.preservedSegment.preservedTokenEstimate || 0} tokens / ${boundary.preservedSegment.preservedTextBlockMessageCount || 0} 条文本消息；首条 ${boundary.preservedSegment.firstPreservedMessageId || "unknown"}。`);
    }
  }
  if (memory.messageCompression?.compressedMessages) lines.push(`- 压缩状态：共 ${memory.messageCompression.totalMessages || 0} 条消息，旧消息压缩 ${memory.messageCompression.compressedMessages || 0} 条，近期原文 ${memory.messageCompression.recentLimit || 0} 条。`);
  const resumeBaseline = memory.compaction?.resumeEffectiveTokenBaseline || memory.messageCompression?.resumeEffectiveTokenBaseline;
  if (resumeBaseline?.schema && validateGroupMemoryResumeEffectiveTokenBaseline(resumeBaseline)) {
    lines.push(`- 恢复后有效上下文：raw ${resumeBaseline.rawTranscriptTokens || 0} tokens；省略旧正文 ${resumeBaseline.omittedRawTokens || 0}；重放 snip 删除 ${resumeBaseline.snipRemovedMessageCount || 0} 条 / 约 ${resumeBaseline.snipRemovedTokenEstimate || 0} tokens；摘要 ${resumeBaseline.summaryTokens || 0} + 投影 ${resumeBaseline.projectedMessageTokens || 0} = effective ${resumeBaseline.effectiveContextTokens || 0}；排除旧 provider usage ${resumeBaseline.staleProviderUsageTokensExcluded || 0}。`);
  }
  const pressureWarning = memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning;
  if (pressureWarning?.schema) {
    lines.push(`- 上下文压力：${pressureWarning.level || "unknown"}；使用约 ${pressureWarning.tokenUsage || 0} tokens，距 auto-compact ${pressureWarning.percentLeft ?? "unknown"}%；建议 ${pressureWarning.recommendation || "continue"}${pressureWarning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
  }
  const addList = (title: string, items: any[], mapper: (item: any) => string) => {
    if (!items?.length) return;
    lines.push(`- ${title}：`);
    for (const item of items.slice(-6)) lines.push(`  - ${mapper(item)}`);
  };
  addList("关键决策", modelRuntime.decisions, (item: any) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
  addList("已完成", memory.completed || [], (item: any) => `${item.project || "unknown"}：${item.summary || ""}`);
  addList("阻塞/未完成", memory.blocked || [], (item: any) => `${item.project || "unknown"}：${item.reason || ""}`);
  const postCompactTaskStatuses = memory.compaction?.postCompactReinject?.taskStatuses
    || memory.compactBoundary?.post_compact_restore?.reinjectionPlan?.taskStatuses
    || [];
  addList("压缩后子任务状态", postCompactTaskStatuses, (item: any) => item.value || `${item.task_id || item.taskId || "unknown"} [${item.status || "unknown"}] ${item.description || item.delta_summary || ""}`);
  addList("Worker scratchpad", memory.workerLedger || [], (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
  addList("开放问题", memory.openQuestions || [], (item: any) => String(item.question || item));
  addList("下一步", modelRuntime.nextActions, (item: any) => String(item.action || item));
  return lines.join("\n");
}

export function prepareGroupMemoryResumeProjection(
  groupId: string,
  groupSessionId: string,
  allMessages: any[],
  storedMemory: any,
  options: any = {}
) {
  const projectionOptions = {
    groupId,
    sessionId: groupSessionId,
    messages: allMessages,
    memory: storedMemory };
  const compactionConfig = loadGroupMemoryCompactionConfig(options.config || options.compactionConfig || options.compaction_config || {});
  const modelSummaryRequired = String(compactionConfig.memoryCompactionMode || "").toLowerCase() === "model-required";
  const storedSummarySource = String(storedMemory?.compaction?.summarySource || storedMemory?.compactBoundary?.summarySource || "");
  const requiresModelSummaryMigration = modelSummaryRequired
    && !!storedMemory?.compactBoundary?.id
    && storedSummarySource !== "model";
  const before: any = buildGroupMemoryResumeProjection(projectionOptions);
  const recoveryRequired = before.status === "fail_closed_rebuild_required" || requiresModelSummaryMigration;
  let recoveryRotation: any = null;
  let memoryBase = storedMemory;
  if (recoveryRequired) {
    if (before.reason === "boundary_journal_invalid") {
      recoveryRotation = quarantineInvalidGroupMemoryBoundaryJournal(groupId, groupSessionId);
    } else if (before.reason === "memory_boundary_missing") {
      recoveryRotation = retireGroupMemoryBoundaryJournal(groupId, groupSessionId);
    }
    const recoveryReason = requiresModelSummaryMigration ? "model_summary_migration_required" : before.reason;
    memoryBase = clearUntrustedGroupCompactionState(storedMemory, recoveryReason);
    if (requiresModelSummaryMigration && groupSessionId.startsWith("gcs_")) {
      scheduleGroupMemoryAutoCompaction(groupId, {
        sessionId: groupSessionId,
        force: true,
        rebuild: true,
        reason: "model_summary_migration",
      });
    }
  }
  const beforeBaseline = buildGroupMemoryResumeEffectiveTokenBaseline(before, memoryBase, allMessages, options);
  const canReuseVerifiedProjection = !recoveryRequired
    && beforeBaseline
    && validateGroupMemoryResumeEffectiveTokenBaseline(beforeBaseline)
    && beforeBaseline.pressureWarning?.flags?.isAboveAutoCompactThreshold !== true;
  let memory: any;
  let projection: any;
  let resumeBaseline: any = null;
  let sessionMemoryCadenceDecision: any = null;
  let skippedFullSnapshotRefresh = false;
  if (canReuseVerifiedProjection) {
    const persisted = persistGroupMemoryResumeEffectiveTokenBaseline(
      groupId,
      groupSessionId,
      allMessages,
      memoryBase,
      before,
      options
    );
    memory = persisted.memory;
    projection = before;
    resumeBaseline = persisted.baseline;
    sessionMemoryCadenceDecision = persisted.cadenceDecision;
    skippedFullSnapshotRefresh = true;
  } else {
    memory = refreshGroupConversationMemorySnapshot(groupId, allMessages, memoryBase, {
      ...options,
      config: compactionConfig,
      modelSummaryRequired,
      groupSessionId });
    projection = buildGroupMemoryResumeProjection({
      groupId,
      sessionId: groupSessionId,
      messages: allMessages,
      memory });
    if (projection.status === "verified") {
      const persisted = persistGroupMemoryResumeEffectiveTokenBaseline(
        groupId,
        groupSessionId,
        allMessages,
        memory,
        projection,
        options
      );
      memory = persisted.memory;
      resumeBaseline = persisted.baseline;
      sessionMemoryCadenceDecision = persisted.cadenceDecision;
    }
  }
  if (!memory?.compactBoundary && projection.status === "fail_closed_rebuild_required") {
    recoveryRotation = retireGroupMemoryBoundaryJournal(groupId, groupSessionId);
    projection = buildGroupMemoryResumeProjection({
      groupId,
      sessionId: groupSessionId,
      messages: allMessages,
      memory });
  }
  let compactHeadRecovery: any = null;
  if (projection.status === "verified" && memory?.compactBoundary?.id) {
    try {
      compactHeadRecovery = reconcileGroupCompactHeadFromMemory({ groupId, groupSessionId, memory });
    } catch (error: any) {
      compactHeadRecovery = {
        schema: "ccm-group-compact-head-restart-recovery-v1",
        version: 1,
        groupId,
        groupSessionId,
        boundaryId: String(memory?.compactBoundary?.id || ""),
        status: "failed",
        recovered: false,
        issues: [compactMemoryText(error?.message || error, 300)] };
    }
  }
  const compactHeadIsCurrent = ["current", "recovered"].includes(String(compactHeadRecovery?.status || ""));
  const recoveredCompactHead = compactHeadIsCurrent
    ? compactHeadRecovery?.head || (groupSessionId.startsWith("gcs_") ? readGroupCompactHead(groupId, groupSessionId) : null)
    : null;
  const providerNativeCompactSessionCapacityReconciliation = recoveredCompactHead
    ? reconcileProviderNativeCompactSessionCapacityReset({
      groupId,
      groupSessionId,
      compactHead: recoveredCompactHead,
      reason: compactHeadRecovery?.status === "recovered"
        ? "restart_reconcile_recovered_compact_head"
        : "resume_reconcile_current_compact_head" })
    : compactHeadRecovery && !compactHeadIsCurrent
      ? {
        schema: "ccm-provider-native-compact-session-capacity-reconciliation-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        status: "fail_closed",
        recovered: false,
        idempotent: false,
        issues: Array.isArray(compactHeadRecovery.issues) ? compactHeadRecovery.issues.slice(0, 8) : ["compact_head_not_current"] }
      : null;
  const proof = recordGroupMemoryResumeProjectionProof(projection, {
    recovered: recoveryRequired,
    recoveryReason: recoveryRequired ? before.reason : "",
    priorStatus: before.status,
    priorReason: before.reason,
    resumeBaseline,
    compactHeadRecovery,
    providerNativeCompactSessionCapacityReconciliation });
  return {
    schema: "ccm-group-memory-resume-preparation-v1",
    groupId,
    groupSessionId,
    memory,
    projection,
    proof,
    resumeBaseline,
    sessionMemoryCadenceDecision,
    skippedFullSnapshotRefresh,
    compactHeadRecovery,
    providerNativeCompactSessionCapacityReconciliation,
    recovered: recoveryRequired,
    recoveryReason: recoveryRequired ? before.reason : "",
    recoveryRotation };
}

export function normalizePostCompactReinjectionRows(plan: any = {}) {
  const normalize = (kind: string, rows: any[]) => (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const value = compactMemoryText(row?.value || row, 260);
      const sourceMessageId = String(row?.sourceMessageId || row?.source_message_id || "");
      const candidateId = String(row?.candidate_id || row?.candidateId || "")
        || `pcrc_${crypto.createHash("sha256").update(JSON.stringify([kind, value, sourceMessageId])).digest("hex").slice(0, 12)}`;
      return {
        candidate_id: candidateId,
        kind,
        value,
        sourceMessageId,
        actor: String(row?.actor || ""),
        taskId: String(row?.taskId || row?.task_id || "") };
    })
    .filter((row: any) => row.value);
  return [
    ...normalize("file", plan.files),
    ...normalize("skill", plan.skills),
    ...normalize("verification", plan.verification),
    ...normalize("blocker", plan.blockers),
    ...normalize("task_status", plan.taskStatuses || plan.task_statuses),
  ];
}

export function buildGroupMemoryPostCompactReinjectionGate(input: any = {}) {
  const plan = input.postCompactReinject || input.post_compact_reinject || input.reinjectionPlan || input.reinjection_plan || {};
  const candidates = normalizePostCompactReinjectionRows(plan);
  if (!candidates.length && plan.hasCandidates !== true) return null;
  const recoveryAudit = input.postCompactRecoveryAudit || input.post_compact_recovery_audit || {};
  const summaryChecksum = String(
    input.summaryChecksum
      || input.summary_checksum
      || recoveryAudit.summaryChecksum
      || recoveryAudit.summary_checksum
      || ""
  );
  const generatedAt = input.generatedAt || input.generated_at || new Date().toISOString();
  const targetProject = String(input.targetProject || input.target_project || "");
  const groupId = String(input.groupId || input.group_id || "");
  const gateId = `pcrg_${crypto.createHash("sha256").update(JSON.stringify([
    groupId,
    targetProject,
    summaryChecksum,
    candidates.map((item: any) => [item.kind, item.value, item.sourceMessageId]),
  ])).digest("hex").slice(0, 18)}`;
  const status = recoveryAudit.status === "failed"
    ? "recovery_audit_failed"
    : recoveryAudit.status === "degraded"
      ? "degraded_reinject"
      : "required";
  return {
    schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
    version: GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION,
    reinjection_gate_id: gateId,
    group_id: groupId,
    target_project: targetProject,
    scope: String(input.scope || (targetProject ? `child:${targetProject}` : "child")),
    generated_at: generatedAt,
    status,
    action: status === "recovery_audit_failed"
      ? "verify_raw_transcript_before_using_reinjection_candidates"
      : "review_reinjection_candidates_before_execution",
    candidate_count: candidates.length,
    candidates: candidates.slice(0, 24),
    post_compact_recovery_audit: {
      status: recoveryAudit.status || "",
      pass: recoveryAudit.pass === true,
      action: recoveryAudit.action || "",
      boundary_id: recoveryAudit.boundaryId || recoveryAudit.boundary_id || "",
      summary_checksum: summaryChecksum,
      transcript_path: recoveryAudit.transcriptPath || recoveryAudit.transcript_path || "" },
    receipt_contract: {
      memory_used_should_reference_gate: true,
      memory_ignored_should_reference_gate: true,
      required_receipt_fields: ["memoryUsed", "memoryIgnored", "postCompactCandidateUsage"],
      required_reference: gateId,
      required_candidate_reference: "all_candidate_ids_or_structured_candidate_usage_rows",
      required_candidate_usage_state: "each_candidate_must_be_used_ignored_or_verified",
      candidate_ids: candidates.map((item: any) => item.candidate_id).slice(0, 24),
      note: "子 Agent 回执必须在 memoryUsed 或 memoryIgnored 中引用该 reinjection gate，并在 postCompactCandidateUsage 中逐条声明每个候选 used / ignored / verified。" } };
}

export function normalizeDynamicContextToolScope(value: any = {}) {
  const unique = (items: any, prefix = "") => Array.from(new Set((Array.isArray(items) ? items : [])
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .map(item => prefix && item.toLowerCase().startsWith(prefix) ? item.slice(prefix.length) : item)));
  return {
    mcp: unique(value.mcp),
    skill: unique(value.skill, "skill:") };
}

export function buildGroupPostCompactDynamicContextCatalog(groupId: string, memory: any = {}, options: any = {}) {
  const group = options.group || loadGroups().find((item: any) => String(item?.id || "") === String(groupId || "")) || null;
  const grants = options.allowedTools
    || options.allowed_tools
    || group?.tools
    || memory?.toolContinuity?.allowedTools
    || memory?.toolContinuity?.allowed_tools
    || { mcp: [], skill: [] };
  const scope = normalizeDynamicContextToolScope(grants);
  const toolCatalog = toolManager.getPostCompactDynamicToolCatalog(scope);
  const runtimeMap = new Map(getPublicAgentRuntimes().map(runtime => [runtime.id, runtime]));
  const projectConfigs = loadProjectConfigs();
  const configuredProjects = new Set((Array.isArray(projectConfigs) ? projectConfigs : []).map((config: any) => String(config?.name || "")).filter(Boolean));
  const members = Array.isArray(group?.members) ? group.members : [];
  const agents = members
    .filter((member: any) => member?.role !== "coordinator" && String(member?.project || "") !== "coordinator")
    .filter((member: any) => configuredProjects.has(String(member?.project || "")) || options.includeUnconfiguredAgents === true)
    .map((member: any) => {
      const project = String(member?.project || "").trim();
      const agentType = normalizeAgentRuntimeId(member?.agent || "claudecode");
      const runtime = runtimeMap.get(agentType);
      const role = String(member?.role || "project agent").trim();
      return {
        name: project,
        project,
        agentType,
        line: `${project} (${agentType}${runtime?.label ? ` / ${runtime.label}` : ""}): ${role}; dispatch is limited to this configured group member` };
    })
    .filter((item: any) => !!item.name)
    .sort((left: any, right: any) => left.name.localeCompare(right.name));
  return {
    schema: "ccm-group-post-compact-dynamic-context-catalog-v1",
    groupId: String(groupId || ""),
    tools: toolCatalog.tools,
    skills: toolCatalog.skills,
    mcpInstructions: toolCatalog.mcpInstructions,
    agents };
}

export function scheduleGroupMemoryAutoCompaction(groupId: string, options: any = {}) {
  const id = String(groupId || "").trim();
  if (!id) return { scheduled: false, reason: "missing_group_id" };
  const sessionId = String(options.sessionId || options.session_id || getActiveGroupChatSessionId(id));
  if (!sessionId.startsWith("gcs_")) return { scheduled: false, reason: "legacy_default_session_rejected", groupId: id, sessionId };
  const circuitBreaker = readGroupMemoryAutoCompactCircuitBreaker(id, sessionId);
  if (circuitBreaker.blocked === true && options.force !== true) {
    return { scheduled: false, reason: "auto_compact_circuit_breaker_open", groupId: id, sessionId, circuitBreaker };
  }
  const scopeKey = `${id}::${sessionId}`;
  if (groupMemoryAutoCompactTimers.has(scopeKey)) {
    clearTimeout(groupMemoryAutoCompactTimers.get(scopeKey)!);
  }
  const delayMs = Math.max(0, Number(options.delayMs ?? GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS));
  const timer = setTimeout(() => {
    groupMemoryAutoCompactTimers.delete(scopeKey);
    void runGroupMemoryAutoCompactionNow(id, { ...options, sessionId });
  }, delayMs);
  groupMemoryAutoCompactTimers.set(scopeKey, timer);
  return { scheduled: true, groupId: id, sessionId, delayMs };
}

export async function runGroupMemoryAutoCompactionNow(groupId: string, options: any = {}) {
  const id = String(groupId || "").trim();
  if (!id) return { success: false, compacted: false, reason: "missing_group_id" };
  const sessionId = String(options.sessionId || options.session_id || getActiveGroupChatSessionId(id));
  if (!sessionId.startsWith("gcs_")) return { success: false, compacted: false, reason: "legacy_default_session_rejected", groupId: id, sessionId };
  const initialCircuitBreaker = readGroupMemoryAutoCompactCircuitBreaker(id, sessionId);
  if (initialCircuitBreaker.blocked === true && options.force !== true) {
    return { success: true, compacted: false, skipped: true, reason: "auto_compact_circuit_breaker_open", groupId: id, sessionId, circuitBreaker: initialCircuitBreaker };
  }
  const typedMemoryScopeId = `${id}--${sessionId}`;
  const scopeKey = `${id}::${sessionId}`;
  if (groupMemoryAutoCompactTimers.has(scopeKey)) {
    clearTimeout(groupMemoryAutoCompactTimers.get(scopeKey)!);
    groupMemoryAutoCompactTimers.delete(scopeKey);
  }
  if (groupMemoryAutoCompactRunning.has(scopeKey)) {
    groupMemoryAutoCompactPending.add(scopeKey);
    return { success: true, compacted: false, scheduled: true, reason: "already_running" };
  }

  const lifecycleHead = ensureGroupSessionLifecycleHead(id, sessionId, { reason: "group_memory_compaction_started" }).head;
  const compactionLifecycleFence = {
    required: true,
    groupId: id,
    groupSessionId: sessionId,
    lifecycleGeneration: Number(lifecycleHead?.generation || 0),
    lifecycleStatus: String(lifecycleHead?.status || ""),
    lifecycleHeadId: String(lifecycleHead?.lifecycle_head_id || ""),
    lifecycleHeadChecksum: String(lifecycleHead?.head_checksum || ""),
  };
  const initialLifecycleValidation = validateGroupSessionLifecycleRuntimeFence(compactionLifecycleFence);
  if (!initialLifecycleValidation.valid) {
    return {
      success: false,
      compacted: false,
      reason: "session_lifecycle_stale",
      error: `group compaction session lifecycle fence is stale: ${initialLifecycleValidation.issues.join(",")}`,
      lifecycleValidation: initialLifecycleValidation,
    };
  }

  const startedAt = new Date().toISOString();
  const autoCompactAttemptId = `acba_${crypto.createHash("sha256").update(`${id}\0${sessionId}\0${startedAt}\0${options.messageId || ""}\0${options.reason || ""}`).digest("hex").slice(0, 24)}`;
  const activityLeaseMs = Math.max(1_000, Number(options.config?.compactionActivityLeaseMs || options.config?.compaction_activity_lease_ms || 90_000));
  const activityAdmission = startGroupCompactionActivity({
    lifecycleFence: compactionLifecycleFence,
    operationId: autoCompactAttemptId,
    reason: options.reason || "message_append",
    stage: "starting",
    leaseMs: activityLeaseMs,
  });
  if (!activityAdmission.started) {
    return {
      success: activityAdmission.busy === true,
      compacted: false,
      scheduled: activityAdmission.busy === true,
      reason: activityAdmission.reason,
      compactionActivity: activityAdmission,
      lifecycleValidation: activityAdmission.lifecycleValidation || initialLifecycleValidation,
    };
  }

  groupMemoryAutoCompactRunning.add(scopeKey);
  const compactionAbortController = new AbortController();
  const cancellationPollMs = Math.max(25, Math.min(Number(
    options.config?.compactionCancellationPollMs
      || options.config?.compaction_cancellation_poll_ms
      || 500
  ), 5_000));
  let compactionWasCancelled = false;
  const cancellationPoll = setInterval(() => {
    try {
      assertGroupCompactionNotCancelled({ groupId: id, groupSessionId: sessionId, operationId: autoCompactAttemptId });
    } catch (error: any) {
      if (error?.code === "GROUP_COMPACTION_CANCELLED" && !compactionAbortController.signal.aborted) {
        compactionAbortController.abort(error);
      }
    }
  }, cancellationPollMs);
  cancellationPoll.unref?.();
  try {
    const messages = getGroupMessages(id, sessionId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
    const memory = loadGroupMemory(id, sessionId);
    const loadedConfig = loadGroupMemoryCompactionConfig(options.config || {});
    const config = {
      ...loadedConfig,
      compactionLifecycleFence,
      compactionActivityOperationId: autoCompactAttemptId,
      compactionAbortSignal: compactionAbortController.signal,
      onCompactionActivity: ({ stage }: any = {}) => pulseGroupCompactionActivity({
        lifecycleFence: compactionLifecycleFence,
        operationId: autoCompactAttemptId,
        stage: stage || "running",
        leaseMs: activityLeaseMs,
      }),
      postCompactDynamicContextCatalog: buildGroupPostCompactDynamicContextCatalog(id, memory, {
        allowedTools: loadedConfig?.postCompactDynamicContextAllowedTools }) };
    const modelCompactionEnabled = isGroupModelCompactionEnabled(config);
    const previousSummarySource = String(memory?.compaction?.summarySource || "");
    const rebuild = options.rebuild === true || (modelCompactionEnabled && previousSummarySource === "deterministic-sync");
    const force = options.force === true;
    const compactRunner = typeof options.compactGroupConversationMemory === "function"
      ? options.compactGroupConversationMemory
      : compactGroupConversationMemory;
    const result: any = await compactRunner({
      groupId: id,
      groupSessionId: sessionId,
      messages,
      memory,
      config,
      transcriptPath: getGroupChatSessionMessagesFile(id, sessionId),
      activeTasks: loadTasks(),
      force,
      rebuild });
    if (typeof options.beforeCompactionCommit === "function") {
      await options.beforeCompactionCommit({
        groupId: id,
        groupSessionId: sessionId,
        operationId: autoCompactAttemptId,
        compacted: result.compacted === true,
        boundaryId: result.boundary?.id || "",
      });
    }
    const committed = withGroupSessionLifecycleCommitFence(compactionLifecycleFence, ({ validation: commitLifecycleValidation }) => {
    return withGroupCompactionActivityCommitFence({
      groupId: id,
      groupSessionId: sessionId,
      operationId: autoCompactAttemptId,
      status: result.compacted ? "completed" : "skipped",
      reason: result.compacted ? "compact_commit_completed" : "compact_not_required",
      boundaryId: result.boundary?.id || "",
      compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
    }, () => {
    const lifecycleCommitProof = result.compacted === true && result.boundary?.id && result.compactTransactionReceipt?.receipt_checksum
      ? buildGroupCompactionLifecycleCommitProof({
        fence: compactionLifecycleFence,
        validation: commitLifecycleValidation,
        boundaryId: result.boundary.id,
        compactTransactionReceiptChecksum: result.compactTransactionReceipt.receipt_checksum,
        committedAt: new Date().toISOString(),
      })
      : null;
    if (lifecycleCommitProof) {
      result.boundary.compactionLifecycleCommitProof = lifecycleCommitProof;
      result.boundary.compactMetadata = { ...(result.boundary.compactMetadata || {}), compactionLifecycleCommitProof: lifecycleCommitProof };
      result.boundary.post_compact_restore = { ...(result.boundary.post_compact_restore || {}), compactionLifecycleCommitProof: lifecycleCommitProof };
    }
    const rawNextMemory = result.memory || memory;
    const nextMemory = lifecycleCommitProof
      ? { ...rawNextMemory, compactBoundary: result.boundary, compaction: { ...(rawNextMemory.compaction || {}), compactionLifecycleCommitProof: lifecycleCommitProof } }
      : rawNextMemory;
    const providerCapacityResetReason = force
      ? `explicit_group_compact:${options.reason || "manual"}`
      : `automatic_group_compact:${options.reason || "message_append"}`;
    const providerNativeCompactSessionCapacityResetIntent = result.compacted === true && !!result.boundary?.id
      ? {
        schema: "ccm-provider-native-compact-session-capacity-reset-intent-v1",
        version: 1,
        group_id: id,
        group_session_id: sessionId,
        boundary_id: String(result.boundary.id || ""),
        compact_transaction_receipt_checksum: String(result.compactTransactionReceipt?.receipt_checksum || ""),
        reason: providerCapacityResetReason,
        requested_at: String(result.boundary.createdAt || new Date().toISOString()) }
      : null;
    const background = buildBackgroundCompactionState({
      status: result.compacted ? "compacted" : "skipped",
      reason: options.reason || "message_append",
      messageId: options.messageId || "",
      compacted: result.compacted,
      modelCompactionEnabled,
      rebuild,
      force,
      boundaryId: result.boundary?.id || "",
      summarizedThroughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
      keepIndex: result.keepIndex || 0,
      messageCount: messages.length,
      typedMemoryScopeId,
      startedAt,
      completedAt: new Date().toISOString() });
    const logDistillation = distillGroupMessagesToTypedMemory(typedMemoryScopeId, messages, nextMemory, {
      reason: `auto_compaction:${background.reason || "message_append"}`,
      throughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
      maxMessages: options.distillMaxMessages || options.distill_max_messages });
    const memoryBeforePostCompactState = {
      ...nextMemory,
      longTermLogDistillation: logDistillation,
      compaction: {
        ...(nextMemory?.compaction || {}),
        background,
        logDistillation,
        providerNativeCompactSessionCapacityResetIntent } };
    const compactHead = sessionId.startsWith("gcs_") && result.compacted && result.compactTransactionReceipt
      ? commitGroupCompactHead({ groupId: id, groupSessionId: sessionId, compactTransactionReceipt: result.compactTransactionReceipt })
      : null;
    let providerNativeCompactSessionCapacityReset: any = null;
    if (result.compacted === true && !!result.boundary?.id && compactHead?.head) {
      try {
        providerNativeCompactSessionCapacityReset = resetProviderNativeCompactSessionCapacity({
          groupId: id,
          groupSessionId: sessionId,
          compactHead: compactHead.head,
          boundaryId: result.boundary.id,
          compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
          reason: providerCapacityResetReason,
          resetAt: result.boundary.createdAt || new Date().toISOString() });
      } catch (error: any) {
        providerNativeCompactSessionCapacityReset = {
          schema: "ccm-provider-native-compact-session-capacity-reset-v1",
          reset: false,
          idempotent: false,
          status: "pending_reconciliation",
          group_id: id,
          group_session_id: sessionId,
          boundary_id: String(result.boundary.id || ""),
          compact_head_id: String(compactHead.head?.head_id || ""),
          compact_head_generation: Number(compactHead.head?.generation || 0),
          reason: compactMemoryText(error?.message || error, 300) };
      }
    }
    const circuitBreaker = result.compacted === true && !!result.boundary?.id && !!compactHead?.head
      ? recordGroupMemoryAutoCompactCircuitBreakerOutcome({
        groupId: id,
        groupSessionId: sessionId,
        attemptId: autoCompactAttemptId,
        outcome: "success",
        reason: options.force === true ? "manual_compact_succeeded" : "auto_compact_succeeded",
        at: background.completedAt })
      : readGroupMemoryAutoCompactCircuitBreaker(id, sessionId);
    const postCompactSessionStateReset = result.compacted === true && !!result.boundary?.id
      ? buildGroupPostCompactSessionStateResetReceipt({
        groupId: id,
        groupSessionId: sessionId,
        boundary: result.boundary,
        summaryChecksum: result.memory?.compaction?.summaryChecksum || "",
        compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
        sessionMemoryCompactSelection: result.sessionMemoryCompactSelection,
        previousReceipt: memory?.compaction?.postCompactSessionStateReset || null,
        contextPressureWarning: result.contextPressureWarning,
        circuitBreakerBefore: initialCircuitBreaker,
        circuitBreakerAfter: circuitBreaker,
        providerNativeCompactSessionCapacityReset,
        completedAt: background.completedAt })
      : null;
    const promptCacheCompactionNotification = postCompactSessionStateReset
      ? notifyGroupPromptCacheCompaction({
        groupId: id,
        groupSessionId: sessionId,
        boundaryId: result.boundary.id,
        resetReceiptChecksum: postCompactSessionStateReset.receipt_checksum,
        generation: postCompactSessionStateReset.cache_read_baseline?.generation,
        notifiedAt: background.completedAt })
      : null;
    const boundaryWithPostCompactState = postCompactSessionStateReset
      ? {
        ...(result.boundary || {}),
        postCompactSessionStateReset,
        promptCacheCompactionNotification,
        compactMetadata: {
          ...(result.boundary?.compactMetadata || {}),
          postCompactSessionStateReset,
          promptCacheCompactionNotification },
        post_compact_restore: {
          ...(result.boundary?.post_compact_restore || {}),
          postCompactSessionStateReset,
          promptCacheCompactionNotification } }
      : result.boundary || memoryBeforePostCompactState.compactBoundary || null;
    const memoryWithPostCompactState = {
      ...memoryBeforePostCompactState,
      compactBoundary: boundaryWithPostCompactState,
      compaction: {
        ...(memoryBeforePostCompactState?.compaction || {}),
        providerNativeCompactSessionCapacityReset,
        autoCompactCircuitBreaker: {
          schema: circuitBreaker.schema,
          state: circuitBreaker.state,
          consecutiveFailures: Number(circuitBreaker.consecutive_failures || 0),
          maxConsecutiveFailures: Number(circuitBreaker.max_consecutive_failures || 3),
          lastSuccessAt: circuitBreaker.last_success_at || "",
          ledgerChecksum: circuitBreaker.ledger_checksum || "" },
        postCompactSessionStateReset,
        promptCacheCompactionNotification },
      messageCompression: {
        ...(memoryBeforePostCompactState?.messageCompression || {}),
        postCompactSessionStateReset,
        promptCacheCompactionNotification } };
    const saved = saveGroupMemory(id, memoryWithPostCompactState, sessionId);
    return { success: true, compacted: !!result.compacted, boundary: boundaryWithPostCompactState, keepIndex: result.keepIndex, background, memory: saved, compactHead, typedMemoryScopeId, logDistillation, providerNativeCompactSessionCapacityReset, postCompactSessionStateReset, promptCacheCompactionNotification, circuitBreaker, lifecycleValidation: commitLifecycleValidation, lifecycleCommitProof };
    });
    });
    return { ...committed.value, compactionActivity: committed.compactionActivity };
  } catch (error: any) {
    if (error?.code === "GROUP_COMPACTION_CANCELLED" || compactionAbortController.signal.aborted) {
      compactionWasCancelled = true;
      const cancellation: any = error?.code === "GROUP_COMPACTION_CANCELLED"
        ? error
        : (compactionAbortController.signal as any).reason || error;
      const compactionActivity = finishGroupCompactionActivity({
        groupId: id,
        groupSessionId: sessionId,
        operationId: autoCompactAttemptId,
        status: "cancelled",
        reason: "exact_session_compaction_cancelled",
      });
      return {
        success: false,
        compacted: false,
        cancelled: true,
        reason: "compaction_cancelled",
        cancelRequestId: String(cancellation?.cancelRequestId || ""),
        cancelRequestedAt: String(cancellation?.cancelRequestedAt || ""),
        compactionActivity,
      };
    }
    if (error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE") {
      const compactionActivity = finishGroupCompactionActivity({
        groupId: id,
        groupSessionId: sessionId,
        operationId: autoCompactAttemptId,
        status: "session_lifecycle_stale",
        reason: error?.message || "session lifecycle changed during compact",
      });
      return {
        success: false,
        compacted: false,
        reason: "session_lifecycle_stale",
        error: compactMemoryText(error?.message || error, 500),
        lifecycleValidation: error?.lifecycleValidation || null,
        lifecycleStage: String(error?.compactionLifecycleStage || "commit"),
        compactionActivity,
      };
    }
    const memory = loadGroupMemory(id, sessionId);
    const background = buildBackgroundCompactionState({
      status: "failed",
      reason: options.reason || "message_append",
      messageId: options.messageId || "",
      typedMemoryScopeId,
      error: error?.message || String(error),
      startedAt,
      completedAt: new Date().toISOString() });
    const circuitBreaker = options.force === true
      ? readGroupMemoryAutoCompactCircuitBreaker(id, sessionId)
      : recordGroupMemoryAutoCompactCircuitBreakerOutcome({
        groupId: id,
        groupSessionId: sessionId,
        attemptId: autoCompactAttemptId,
        outcome: "failure",
        reason: "auto_compact_failed",
        errorClass: error?.name || error?.code || "Error",
        error: error?.message || String(error),
        at: background.completedAt });
    saveGroupMemory(id, {
      ...memory,
      compaction: {
        ...(memory?.compaction || {}),
        background,
        autoCompactCircuitBreaker: {
          schema: circuitBreaker.schema,
          state: circuitBreaker.state,
          consecutiveFailures: Number(circuitBreaker.consecutive_failures || 0),
          maxConsecutiveFailures: Number(circuitBreaker.max_consecutive_failures || 3),
          openedAt: circuitBreaker.opened_at || "",
          ledgerChecksum: circuitBreaker.ledger_checksum || "" },
        health: "degraded",
        lastFailure: background.error,
        lastFailureAt: background.completedAt } }, sessionId);
    const compactionActivity = finishGroupCompactionActivity({
      groupId: id,
      groupSessionId: sessionId,
      operationId: autoCompactAttemptId,
      status: "failed",
      reason: background.error,
    });
    return { success: false, compacted: false, error: background.error, background, circuitBreaker, compactionActivity };
  } finally {
    clearInterval(cancellationPoll);
    groupMemoryAutoCompactRunning.delete(scopeKey);
    if (compactionWasCancelled) groupMemoryAutoCompactPending.delete(scopeKey);
    else if (groupMemoryAutoCompactPending.has(scopeKey)) {
      groupMemoryAutoCompactPending.delete(scopeKey);
      scheduleGroupMemoryAutoCompaction(id, { reason: "pending_after_run", delayMs: GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS, sessionId });
    }
  }
}

export function ensureGroupMemoryAutoCompactionHook() {
  if (groupMemoryAutoCompactHookRegistered) return { registered: true, already: true };
  registerGroupMessageAppendHook((groupId, message) => {
    const sessionId = String(message?.group_session_id || message?.groupSessionId || "");
    if (!sessionId.startsWith("gcs_")) return;
    recordGroupPostTurnSummary(groupId, sessionId, message);
    scheduleGroupMemoryAutoCompaction(groupId, {
      reason: "message_append",
      messageId: String(message?.id || ""),
      sessionId });
  });
  markGroupMemoryAutoCompactHookRegistered();
  return { registered: true, already: false };
}

export function pressureMemoryProvenanceDisciplineStatus(value: any) {
  return String(value || "").trim().toLowerCase();
}

export function pressureMemoryProvenanceDisciplineUnderRepair(value: any = {}) {
  const provenance = pressureMemoryProvenanceDisciplineStatus(value.provenance_status || value.provenanceStatus);
  return provenance === "disputed_under_repair"
    || provenance === "stale_evidence_under_repair"
    || !!String(value.repair_work_item_id || value.repairWorkItemId || value.work_item_id || value.workItemId || "").trim()
    || value.repair_open === true
    || value.repairOpen === true;
}

export function buildPressureMemoryProvenanceReceiptDiscipline(input: any = {}, options: any = {}) {
  const recall = input.recall || input.typedMemoryRecall || input.typed_memory_recall || input || {};
  const recalled = [
    ...(Array.isArray(recall.recalled) ? recall.recalled : []),
    ...(Array.isArray(recall.docs) ? recall.docs : []),
    ...(Array.isArray(recall.entries) ? recall.entries : []),
    ...(Array.isArray(recall.diagnostics) ? recall.diagnostics : []),
  ];
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const doc of recalled) {
    const matches = [
      ...(Array.isArray(doc.workerContextPressureUsage?.matched) ? doc.workerContextPressureUsage.matched : []),
      ...(Array.isArray(doc.worker_context_pressure_usage?.matched) ? doc.worker_context_pressure_usage.matched : []),
      ...(Array.isArray(doc.pressure_usage_matches || doc.pressureUsageMatches) ? (doc.pressure_usage_matches || doc.pressureUsageMatches) : []),
    ];
    const candidates = matches.length ? matches : [doc];
    for (const match of candidates) {
      const provenanceStatus = pressureMemoryProvenanceDisciplineStatus(match.provenance_status || match.provenanceStatus || doc.provenance_status || doc.provenanceStatus);
      const repairWorkItemId = String(match.repair_work_item_id || match.repairWorkItemId || doc.repair_work_item_id || doc.repairWorkItemId || "").trim();
      const repairStatus = pressureMemoryProvenanceDisciplineStatus(match.repair_status || match.repairStatus || doc.repair_status || doc.repairStatus || "pending");
      const repairGapType = String(match.repair_gap_type || match.repairGapType || doc.repair_gap_type || doc.repairGapType || "pressure_repair_provenance").trim();
      const requiresReceipt = doc.requires_memory_provenance_usage === true
        || doc.requiresMemoryProvenanceUsage === true
        || pressureMemoryProvenanceDisciplineUnderRepair(match)
        || pressureMemoryProvenanceDisciplineUnderRepair(doc);
      if (!requiresReceipt && !provenanceStatus && !repairWorkItemId) continue;
      const relPath = String(match.rel_path || match.relPath || doc.relPath || doc.rel_path || "").trim();
      const name = String(match.name || doc.name || relPath || "pressure MEMORY.md").trim();
      const key = `${relPath.toLowerCase()}|${name.toLowerCase()}|${repairWorkItemId.toLowerCase()}|${provenanceStatus}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        relPath,
        rel_path: relPath,
        name,
        targetProject: String(match.target_project || match.targetProject || doc.targetProject || doc.target_project || options.targetProject || options.target_project || "").trim(),
        pressureStatus: String(doc.pressure_status || doc.pressureStatus || recall.pressure_status || recall.pressureStatus || options.pressureStatus || options.pressure_status || "").trim(),
        provenanceStatus: provenanceStatus || "under_repair",
        provenance_status: provenanceStatus || "under_repair",
        repairWorkItemId,
        repair_work_item_id: repairWorkItemId,
        repairStatus,
        repair_status: repairStatus,
        repairGapType,
        repair_gap_type: repairGapType,
        currentSourceVerifiedRequired: ["disputed_under_repair", "stale_evidence_under_repair", "under_repair"].includes(provenanceStatus || "under_repair") || !!repairWorkItemId });
    }
  }
  const limitedRows = rows.slice(0, Math.max(1, Number(options.maxRows || options.max_rows || 8)));
  const exampleRows = limitedRows.slice(0, 4).map((row: any) => ({
    relPath: row.relPath || row.name || "unknown",
    usageState: "used",
    provenanceStatus: row.provenanceStatus || "under_repair",
    repairWorkItemId: row.repairWorkItemId || "unknown",
    repairStatus: row.repairStatus || "pending",
    repairGapType: row.repairGapType || "pressure_repair_provenance",
    currentSourceVerified: true }));
  return {
    schema: "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1",
    version: 1,
    active: limitedRows.length > 0,
    source: "typed_memory_pressure_repair_provenance",
    targetProject: String(options.targetProject || options.target_project || "").trim(),
    generatedAt: String(options.generatedAt || options.generated_at || new Date().toISOString()),
    docCount: limitedRows.length,
    requiredFields: ["relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"],
    currentSourceVerifiedRule: "used/verified disputed_under_repair or stale_evidence_under_repair pressure memory requires currentSourceVerified=true",
    rows: limitedRows,
    exampleRows };
}

export function buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall(groupId: string, task = "", memory: any = {}, options: any = {}) {
  const disabled = options.disableProviderRankingCompactRepairReceiptRecall === true
    || options.disable_provider_ranking_compact_repair_receipt_recall === true;
  const empty = {
    schema: "ccm-provider-ranking-provenance-compact-repair-receipt-worker-context-recall-v1",
    version: 1,
    active: false,
    disabled,
    reason: disabled ? "disabled" : "no_verified_archive",
    docRelPath: PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
    archivedCount: 0,
    verifiedCount: 0,
    preservedCount: 0,
    receiptCount: 0,
    relPathCount: 0,
    rowIdCount: 0,
    taskMatched: false,
    recalledThisTurn: false,
    repeatableRelPaths: [],
    targetPaths: [],
    queryAppend: "",
    authorizationBoundary: "provider switch execution history is ranking evidence only, not authorization; require a fresh valid provider switch decision receipt for every explicit switch",
    memoryUsageReceiptDocRelPaths: [],
    memoryUsageReceiptDisciplineRelPaths: [],
    memoryUsageReceiptDisciplineRequired: false,
    memoryUsageReceiptDisciplineRecalledThisTurn: false,
    rows: [] };
  if (disabled) return empty;
  let archive: any = {};
  let usageArchive: any = {};
  try {
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    archive = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
    usageArchive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
  } catch {
    archive = {};
    usageArchive = {};
  }
  const rows = Array.isArray(archive.rows) ? archive.rows : [];
  const usageRows = Array.isArray(usageArchive.rows) ? usageArchive.rows : [];
  const archivedCount = Number(archive.archived_count || rows.length || 0) + Number(usageArchive.archived_count || usageRows.length || 0);
  const taskMatched = isProviderRankingProvenanceCompactRepairReceiptRecallQuery([
    task,
    memory.goal,
    memory.currentPhase,
    memory.messageDigest,
    options.providerSwitchDecisionReceipt,
    options.provider_switch_decision_receipt,
  ].map((item: any) => typeof item === "string" ? item : JSON.stringify(item || "")).join("\n"));
  if (archivedCount <= 0) {
    return {
      ...empty,
      reason: taskMatched ? "task_matched_but_no_verified_archive" : "no_verified_archive",
      taskMatched };
  }
  const recentRows = rows.slice(-8);
  const recentUsageRows = usageRows.slice(-8);
  const typedRelPaths = uniqueProviderRankingCompactRepairRecallStrings([
    archive.typed_memory_rel_paths,
    ...recentRows.map((row: any) => row.typed_memory_rel_paths || row.provider_ranking_provenance_rel_paths),
  ], 20);
  const usageDocRelPaths = uniqueProviderRankingCompactRepairRecallStrings([
    usageArchive.doc_rel_paths,
    ...recentUsageRows.map((row: any) => row.doc_rel_paths || row.provider_ranking_provenance_rel_paths),
  ], 20);
  const typedRowIds = uniqueProviderRankingCompactRepairRecallStrings([
    archive.typed_memory_row_ids,
    ...recentRows.map((row: any) => row.typed_memory_row_ids || row.provider_ranking_provenance_row_ids),
  ], 24);
  const receiptIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.provider_switch_decision_receipt_id), 12);
  const receiptChecksums = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.provider_switch_decision_receipt_checksum), 12);
  const rowReasons = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.reason), 8)
    .map((item: string) => compactMemoryText(item, 260));
  const queryAppend = [
    "provider ranking provenance compact repair receipt typed MEMORY.md",
    PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
    PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
    "provider-switch-execution-memory.md",
    "replayRepairDispatchBriefUsage verified provider_ranking_provenance_preserved provider_ranking_provenance_compact",
    "provider ranking memory usage receipt discipline memoryUsed memoryIgnored usageState",
    "provider switch decision receipt checksum typed MEMORY.md rel paths row ids",
    "ranking evidence only, not authorization",
    "fresh valid provider switch decision receipt",
    ...typedRelPaths,
    ...usageDocRelPaths,
    ...typedRowIds,
    ...receiptIds,
    ...receiptChecksums,
    ...rowReasons,
  ].filter(Boolean).join("\n");
  return {
    ...empty,
    active: true,
    reason: taskMatched ? "task_matched_verified_archive" : "verified_archive_available",
    archivedCount,
    verifiedCount: Number(archive.verified_count || 0),
    preservedCount: Number(archive.preserved_count || 0),
    receiptCount: Number(archive.receipt_count || receiptIds.length || 0),
    relPathCount: Number(archive.rel_path_count || typedRelPaths.length || 0),
    rowIdCount: Number(archive.row_id_count || typedRowIds.length || 0),
    taskMatched,
    repeatableRelPaths: [
      PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
      PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
    ],
    targetPaths: uniqueProviderRankingCompactRepairRecallStrings([
      PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
      PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
      ...typedRelPaths,
      ...usageDocRelPaths,
    ], 24),
    queryAppend: compactMemoryText(queryAppend, 4200),
    typedMemoryRelPaths: typedRelPaths,
    memoryUsageReceiptDocRelPaths: usageDocRelPaths,
    memoryUsageReceiptDisciplineRelPaths: [PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH],
    memoryUsageReceiptDisciplineRequired: usageRows.length > 0,
    typedMemoryRowIds: typedRowIds,
    receiptIds,
    receiptChecksums,
    rows: recentRows.map((row: any) => ({
      row_id: row.row_id || "",
      brief_id: row.brief_id || "",
      work_item_id: row.work_item_id || "",
      task_id: row.task_id || "",
      project: row.project || "",
      provider_switch_decision_receipt_id: row.provider_switch_decision_receipt_id || "",
      provider_switch_decision_receipt_checksum: row.provider_switch_decision_receipt_checksum || "",
      typed_memory_rel_paths: Array.isArray(row.typed_memory_rel_paths) ? row.typed_memory_rel_paths.slice(0, 8) : [],
      typed_memory_row_ids: Array.isArray(row.typed_memory_row_ids) ? row.typed_memory_row_ids.slice(0, 8) : [] })) };
}

export function isPostCompactReinjectionRepairReceiptRecallQuery(value: any, rows: any[] = []) {
  const text = String(value || "").toLowerCase();
  if (/post[-_\s]?compact|reinjection|reinject|recovered candidate|repair receipt|recovery evidence|current source|压缩后|重注入|恢复候选|修复回执|当前源/.test(text)) {
    return true;
  }
  return rows.some((row: any) => [
    row.reinjection_gate_id,
    row.post_compact_candidate_id,
    row.post_compact_candidate_value,
    row.post_compact_candidate_source_message_id,
  ].some((token: any) => {
    const normalized = String(token || "").trim().toLowerCase();
    return normalized.length >= 4 && text.includes(normalized);
  }));
}
