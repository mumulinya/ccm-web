// Behavior-freeze split from collaboration-coordination-ux.ts (part 1/2).
/** Coordination protocol UX, runtime kernel display, and dispatch helpers. Behavior-preserving extraction from the collaboration facade. */
import {
  buildChildAgentWorkerHandoff,
  getProjectAgentCapabilityProfile,
  normalizeStringArray,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration";
import {
  groupSessionIdForTask,
  normalizeContinuationKind,
  sanitizeUserAgentProgressText,
  timelineStatusForUser,
} from "./collaboration-task-card";
import {
  buildApiMicrocompactReceiptVisibleSummary,
  buildGlobalMemoryHealthGateVisibleSummary,
  buildGlobalMemoryReceiptVisibleSummary,
  buildMemoryGateVisibleSummary,
  buildPostCompactDispatchMarkerVisibleSummary,
  buildPostCompactReinjectionGateVisibleSummary,
  buildReadPlanRevalidationGateVisibleSummary,
  collectTaskApiMicrocompactEditPlans,
  collectTaskGlobalMemoryHealthGates,
  collectTaskGlobalMemoryReceiptGates,
  collectTaskMemoryDispatchFreshnessGates,
  collectTaskPostCompactDispatchMarkers,
  collectTaskPostCompactReinjectionGates,
  collectTaskReadPlanRevalidationGates,
} from "./collaboration-memory-gates";

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import * as os from "os";
import {
  sendJson,
  calculateTokensAndCost,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  UPLOAD_DIR,
  SHARED_DIR,
  CCM_DIR,
} from "../../core/utils";
import { ingestRequirementSources, requirementToIntakeDraft } from "../requirements/source-ingestion";
import {
  loadCronJobs,
  saveCronJobs,
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  AGENTS
} from "../../core/db";
import { buildSelectedSkillUsageDirective, selectRoleSkills } from "../../skills/role-skills";
import {
  buildCodedCoordinatorSummary,
  buildCoordinatorCollaborationInstructions,
  buildMemberCollaborationInstructions,
  decomposeRequirementWithCodedCoordinator,
  getCoordinatorMember,
  getRoutableMembers,
  loadOrchestratorConfig,
  normalizeGroupOrchestrator,
  publicOrchestratorConfig,
  resolveMemberRuntime,
  runCodedGroupOrchestrator,
  runCoordinatorProtocolSelfTest,
  runGroupOrchestrator,
  runLlmCoordinatorReview,
  runLlmCoordinatorSummary,
  sanitizeCoordinatorUserText,
  saveOrchestratorConfig,
  selectGroupTargets,
  recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
  recordWorkerContextProviderSwitchSessionBindingForCoordinator,
  recordReplayRepairDispatchBriefTimelineBinding,
} from "./group-orchestrator";
import { buildMainAgentDisplayStream, sanitizeMainAgentUserText } from "./display";
import {
  buildProjectCodeReadOnlySnapshot as buildProjectCodeReadOnlySnapshotBase,
  buildGroupProjectAnalysisContext as buildGroupProjectAnalysisContextBase,
} from "./project-analysis";
import {
  appendWorkerLedger,
  buildAgentMemoryContextBundle,
  buildAgentMemoryContextBundleWithManifestSelection,
  buildAgentMemoryPacket,
  buildGroupContextPacket,
  buildGroupMemoryContext,
  admitChildTypedMemoryDelivery,
  commitChildTypedMemoryDelivery,
  createChildTypedMemoryDispatchWal,
  compactMemoryText,
  compactPreserveLines,
  createEmptyGroupMemory,
  deleteGroupSessionMemoryArtifacts,
  findLatestWorkerLedger,
  getGroupMemoryFile,
  getGroupSessionMemoryScopeId,
  loadGroupMemory,
  markChildTypedMemoryDispatchCommitted,
  markChildTypedMemoryDispatchStarted,
  markChildTypedMemoryRunnerReturned,
  recordGroupApiMicrocompactNativeApplyProofLedger,
  recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger,
  recordGroupPostCompactCandidateUsageLedger,
  renderGroupPostCompactInvokedSkillAttachments,
  renderGroupPostCompactPlanAttachment,
  renderGroupPostCompactDynamicContextDelta,
  saveGroupMemory,
  uniqueByKey,
  updateGroupMemory,
} from "./memory";
import {
  configureGroupSessionMemoryModelExecutor,
} from "./group-session-memory-model-extraction";
import {
  configureGroupTypedMemoryManifestSelector,
  recordGroupTypedMemoryManifestSelectorConsumptionOutcomes,
  recordGroupTypedMemoryConsumptionLedger,
  recordGroupTypedMemoryStaleCandidates,
  readGroupTypedMemoryPressureRecallUsageLedger,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";
import {
  sendFeishuReportMessage,
} from "./feishu";
import { hasFeishuTaskBinding } from "./feishu-channel";
import { handleFeishuRoutes } from "./feishu-routes";
import { handleAgentQaRoutes } from "./agent-qa-routes";
import { GROUP_COORDINATION_MCP_SERVER_NAME } from "../../integrations/group-coordination-mcp";
import { buildTaskBoundInternalMcpServers } from "../../integrations/agent-internal-mcp";
import {
  attachMemoryContextConsumptionChallenge,
  createMemoryContextConsumptionChallenge,
  memoryContextConsumptionReceiptFile,
} from "../../integrations/memory-context-consumption-receipt";
import {
  claimSubmittedGroupCoordinationRequests,
  listGroupCoordinationRequests,
  submitGroupCoordinationRequest,
  updateGroupCoordinationRequest,
} from "./group-coordination-store";
import { handleGroupLiveRoutes } from "./group-live-routes";
import {
  AGENT_QA_TIMEOUT_MS,
  appendAgentQaTrace,
  buildAgentQaMessage,
  buildAgentQaUserPreview,
  configureAgentQaService,
  emitAgentQaEvent,
  getAgentQaItemsForGroup,
  loadAgentQaItems,
  markExpiredAgentQaItems,
  setAgentQaArbitration,
  setAgentQaManualTakeover,
  upsertAgentQaItem,
  writeAcceptedAgentQaToProjectMemory,
} from "./agent-qa-service";
import {
  buildTaskDeliveryReport,
  buildTaskGroupReportMessage,
  buildUserDeliveryReport,
} from "./task-delivery-report";
import { buildTestAgentVerdict } from "../../test-agent/verdict";
import type { TestAgentReport, TestAgentVerdict } from "../../test-agent/types";
import {
  matchProviderToolAccessEvidence,
  verifyProviderToolAccessEvidence,
} from "../../agents/provider-tool-access-evidence";
import {
  compactTestAgentBrowserAuthenticationSummary,
  summarizeTestAgentAdversarialEvidence,
  summarizeTestAgentBrowserActionEffects,
  summarizeTestAgentBrowserAuthentication,
  summarizeTestAgentBrowserFlows,
  summarizeTestAgentBrowserRecovery,
  summarizeTestAgentMultiSessionBrowser,
} from "../../agents/test-agent-review-bridge";
import {
  buildPostReviewSpotCheckGate,
  buildPostReviewSpotCheckSummary,
  runMainAgentPostReviewSpotCheck,
  runPostReviewSpotCheckContractSelfTest,
} from "../../agents/post-review-spot-check";
import {
  checkTaskCompletion,
  checkTaskFailure,
  extractAgentReceipt,
  extractRunnerVerificationEvidence,
  getReceiptAssignmentStatus,
} from "./agent-receipts";
import {
  extractTaskNotificationTag,
  formatCollectedAgentOutput,
  getCollectedOutputAgent,
  getCollectedOutputReceiptStatus,
  parseTaskNotificationsFromText,
  runTaskNotificationDisplaySelfTest,
} from "./agent-notifications";
import {
  getGlobalMissionChildDeliveryEvidence as getGlobalMissionChildDeliveryEvidenceBase,
  globalMissionChildGatePassed as globalMissionChildGatePassedBase,
  refreshGlobalMissionParentInTaskList as refreshGlobalMissionParentInTaskListBase,
} from "./global-mission";
import {
  addGroupLog,
  addTaskLog,
  appendTaskTimelineEvent,
  clearTaskLogs,
  getTaskLogs,
  getTaskTimeline,
  safeAddGroupLog,
} from "./logs";
import { handleBasicGroupRoutes } from "./group-routes";
import { handleOrchestratorRoutes } from "./orchestrator-routes";
import { handleTaskGovernanceRoutes } from "./task-governance-routes";
import {
  buildStartupTaskRecoveryPlan,
  runStartupTaskRecoveryDecisionSelfTest,
} from "./startup-task-recovery";
import {
  cancelTestAgentRunsForTask,
  purgeTestAgentRunnerRecordsForTask,
  reconcileTestAgentRunnerRecords,
  runTestAgentCliJob,
  runTestAgentRunnerSelfTest,
} from "./test-agent-runner";
import { purgeTestAgentArtifactsForTask } from "../../test-agent/artifact-retention";
import {
  buildCompleteTaskReplay,
  buildTaskReplayIndex,
  resolveTaskReplayArtifact,
  runTaskReplayContractSelfTest,
} from "./task-replay";
import {
  appendGroupMessage,
  findGroupChatSessionContainingMessage,
  getGroupMessages,
  loadGroups,
  resolveWritableGroupChatSession,
  saveGroupMessages,
  saveGroups,
} from "./storage";
import {
  buildDailyDevTaskDescription,
  claimReadyDailyDevBacklog,
  configureDailyDevBacklogRuntime,
  dispatchDailyDevBacklog,
  dispatchReadyDailyDevBacklogs,
  ensureDailyDevAutopilotCronJobs,
  evaluateDailyDevIntakeQuality,
  importSharedDocsToDailyDevBacklog,
  isDailyDevBacklogFile,
  listDailyDevBacklogs,
  markDailyDevBacklogStatus,
  persistDailyDevBacklogFile,
  readDailyDevBacklogStatus,
  runDailyDevAutopilotOnce,
} from "./daily-dev-backlog";
import { getAgentCommandLabel, getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../../agents/runtime";
import { buildRuntimeToolDispatchGate, buildRuntimeToolSyncPrompt, detectInvokedSkillsFromText, recordRuntimeToolSyncAudit, syncRuntimeTools } from "../../tools/runtime-tool-sync";
import { buildAuthorizationReadiness, buildToolAuthorizationPayload, normalizeToolAuthorization } from "../../tools/tool-authorization";
import {
  buildChildAgentWorktreeNotice,
  normalizeChildAgentIsolationMode,
  prepareChildAgentWorkDir,
} from "../../agents/worktree";
import {
  attachExecutionWorkspace,
  cancelActiveAgentRun,
  classifyExecutionFailure,
  cleanupExecutionWorktree,
  clearTaskCancellation,
  createExecutionCheckpoint,
  ensureExecution,
  evaluateGreenContract,
  inspectBranchFreshness,
  isTaskCancellationRequested,
  listExecutions,
  loadExecution,
  mergeExecutionWorktree,
  purgeTaskExecutionArtifacts,
  requestTaskCancellation,
  rollbackExecutionCheckpoint,
  runExecutionKernelSelfTest,
  transitionExecution,
} from "../../agents/execution-kernel";
import {
  attachTaskAgentFinalDispatchPayloadGate,
  commitTaskAgentSessionCapacityRevalidation,
  bindTaskAgentMemoryContextSnapshot,
  closeTaskAgentSessions,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
  inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
  listTaskAgentMemoryContextSnapshots,
  listTaskAgentSessions,
  openTaskAgentSession,
  prepareTaskAgentSessionCapacityRevalidation,
  purgeTaskAgentSessions,
  recordTaskAgentMemoryContextDelivery,
  recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome,
  recordTaskAgentSessionTurn,
  reopenTaskAgentSessions,
} from "../../tasks/agent-sessions";
import {
  bindTaskAgentInvocationContext,
  bindTaskAgentInvocationMemoryDelivery,
  bindTaskAgentInvocationRunnerRequest,
  completeTaskAgentInvocationEdge,
  dispatchTaskAgentInvocationEdge,
  prepareTaskAgentInvocationEdge,
} from "../../tasks/task-agent-invocation-lineage";
import {
  buildCollaborationConflictPlan,
  buildRuntimeRecoveryCandidates,
  buildRuntimeRecoveryPrompt,
  isRuntimeCommandAvailable,
  runCollaborationResilienceSelfTest,
  shouldSwitchRuntime,
} from "./collaboration-resilience";
import {
  acquireIdempotency,
  acquireTaskLease,
  appendTraceEvent,
  completeIdempotency,
  createTraceId,
  ensureTraceId,
  failIdempotency,
  getTrace,
  listTraces,
  releaseTaskLease,
  renewTaskLease,
  runReliabilityLedgerSelfTest,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";
import { getReliabilityDrillStatus, runScheduledProductionReliabilityDrill } from "../../system/reliability-drills";
import { getSoakReport, getSoakTestStatus, inspectReliabilityDebt, reconcileStabilityDebt, runSoakTestSelfTest, sampleSoakTestNow, startSoakTest, stopSoakTest } from "../../system/soak-test";
import { getProcessLifecycleSnapshot, registerRestartIntent, runProcessLifecycleSelfTest } from "../../system/process-lifecycle";
import { purgeTaskReplayJournalForTask } from "../../system/task-replay-journal";
import {
  buildTaskReasoningState,
  captureReasoningFacts,
  createAgentReasoningState,
  explainReasoningDecision,
  normalizeAgentReasoningState,
  recordReasoningDeviation,
  recordReasoningRecoveryCheck,
  setReasoningAssertion,
  updateReasoningPlan,
} from "../../agents/reasoning-loop";
import { buildProjectExecutionBrief, buildProjectMemoryPacket } from "../../projects/memory";
import { recordGlobalDirectDispatchMemory, recordGlobalDirectDispatchRollbackMemory } from "../../agents/global/memory";
import { createDispatchRecord, normalizeDispatchBatch } from "./dispatch-records";
import {
  buildCollaborationQuestionContract,
  evaluateAdvisoryPermissionBoundary,
  evaluateCollaborationAnswer,
  evaluateCollaborationQuestionAdmission,
  runAgentCollaborationProtocolSelfTest,
  selectCollaborationTarget,
} from "../../agents/collaboration-protocol";
import {
  buildAckPreflightReview,
  buildContractTransferPlan,
  evaluateContractInjectionGate,
  extractContractSyncHints,
  getTaskAckRewriteRows,
  getTaskContractInjectionRows,
} from "./protocol-gates";
import {
  buildContractInjectionEvent,
  buildTraceReplaySuite,
  recordAgentRuntimeLifecycle,
  replayAgentTrace,
  runAgentRuntimeKernelSelfTest,
} from "../../agents/runtime-kernel";
import {
  buildSelfContainedWorkerHandoff,
  renderMemoryContextForWorker,
  renderSelfContainedWorkerHandoff,
  runWorkerHandoffSelfTest,
  summarizeWorkerHandoffForUser,
} from "../../agents/worker-handoff";
import {
  buildFinalWorkerDispatchPayloadGate,
  verifyFinalWorkerDispatchPayloadGate,
} from "../../agents/final-dispatch-payload-gate";
import {
  isProviderPromptTooLongFailure,
  recoverFinalWorkerDispatchPayload,
} from "../../agents/final-dispatch-reactive-compact";
import {
  buildMainAgentWorkItems,
  buildMainAgentWorkItemClaimSummary,
  buildMainAgentWorkItemSummary,
  buildMainAgentWorkItemUnlockSummary,
  claimMainAgentWorkItem,
  normalizeMainAgentWorkItemStatus,
  requeueStaleMainAgentWorkItems,
  runMainAgentWorkItemSelfTest,
  updateMainAgentWorkItem,
} from "../../agents/work-items";

import {
  isFailedVerification,
  isSuggestedOnlyVerification,
  splitEvidenceList,
} from "./collaboration-coordination-ux-part-02";

export function receiptEvidenceStrings(...values: any[]) {
  const items: string[] = [];
  const add = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (!value) return;
    if (typeof value === "object") {
      add(value.path || value.file || value.name || value.command || value.summary || value.detail || value.value || value.result || value.label || "");
      return;
    }
    items.push(...splitEvidenceList(value));
  };
  values.forEach(add);
  return uniqueStrings(items);
}

export function isConcreteReceiptFileEvidence(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(?:无|暂无|未提供|未填写|none|n\/a|na|-)$/.test(text)) return false;
  if (/(?:未|没有|无)(?:实际)?(?:修改|变更|改动|落地)|no\s+(?:file\s+)?changes?|not\s+(?:modified|changed|implemented)/i.test(text)) return false;
  if (/(?:建议|应该|可以|待|交给|由).{0,30}(?:修改|实现|处理)/i.test(text)) return false;
  return /[\\/]|\.([a-z0-9]{1,12})(?:$|[#?:\s),，）])/i.test(text);
}

export function isConcreteReceiptActionEvidence(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/(?:建议|应该|可以|可由|交给|交由|转交|移交|待).{0,30}(?:主\s*Agent|coordinator|用户|后续|你|parent|main agent)/i.test(text)) return false;
  if (/(?:未|没有|无)(?:实际)?(?:修改|实现|执行|落地|运行|验证)|只(?:提供|整理|输出|完成)(?:了)?(?:方案|建议|分析|思路|说明)|仅(?:提供|整理|输出|分析|建议)|no\s+changes?\s+made|not\s+implemented|only\s+(?:provided|suggested|analy[sz]ed)|handoff/i.test(text)) return false;
  return /(?:已|完成|修改|新增|删除|调整|实现|修复|同步|运行|验证|updated?|changed?|implemented?|fixed?|ran|verified)/i.test(text);
}

export function evaluateChildAgentHandoffQuality(task: any, receipt: any = {}) {
  const status = String(receipt.status || receipt.receipt_status || "").toLowerCase();
  const requiresCode = taskRequiresCodeChanges(task);
  const requiresVerification = taskRequiresVerification(task);
  const requiresExecutionEvidence = requiresCode || requiresVerification;
  const files = receiptEvidenceStrings(receipt.filesChanged, receipt.files_changed, receipt.files);
  const actions = receiptEvidenceStrings(receipt.actions);
  const verification = receiptEvidenceStrings(receipt.verification, receipt.tests);
  const needs = receiptEvidenceStrings(receipt.needs, receipt.blockers);
  const text = receiptEvidenceStrings(
    receipt.summary,
    actions,
    files,
    verification,
    needs,
  ).join("\n");
  const handoffPattern = /(?:建议|应该|可以|可由|交给|交由|转交|移交|待).{0,36}(?:主\s*Agent|coordinator|用户|后续|你|父\s*Agent|parent|main agent)|(?:主\s*Agent|coordinator|父\s*Agent|parent|main agent).{0,36}(?:需要|应当|可以|继续|补充|修改|执行|处理|实现|确认)|\b(?:recommend(?:ed|ation)?|should|handoff|handing\s+back)\b/i;
  const noExecutionPattern = /(?:未|没有|无)(?:实际)?(?:修改|变更|改动|实现|执行|落地|跑验证|运行验证|验证)|只(?:提供|整理|输出|完成)(?:了)?(?:方案|建议|分析|思路|说明)|仅(?:提供|整理|输出|分析|建议)|no\s+changes?\s+made|not\s+(?:implemented|modified|changed|executed|verified)|only\s+(?:provided|suggested|analy[sz]ed)/i;
  const hasHandoffHint = handoffPattern.test(text);
  const hasNoExecutionHint = noExecutionPattern.test(text);
  const hasConcreteFiles = files.some(isConcreteReceiptFileEvidence);
  const hasConcreteActions = actions.some(isConcreteReceiptActionEvidence);
  const hasExecutedVerification = verification.some((item: string) => !isSuggestedOnlyVerification(item) && !isFailedVerification(item));
  const missingRequiredFiles = requiresCode && !hasConcreteFiles;
  const missingRequiredVerification = requiresVerification && !hasExecutedVerification;
  const onlyHandoffOrAdvice = status === "done"
    && requiresExecutionEvidence
    && (
      hasNoExecutionHint
      || (hasHandoffHint && (missingRequiredFiles || missingRequiredVerification || !hasConcreteActions))
    );
  const hints = [
    hasNoExecutionHint ? "结果说明提到未实际修改、未执行或只是方案" : "",
    hasHandoffHint ? "结果说明把后续处理交回主 Agent、用户或后续步骤" : "",
    missingRequiredFiles ? "缺少真实文件修改证据" : "",
    missingRequiredVerification ? "缺少已执行验证证据" : "",
  ].filter(Boolean);
  return {
    schema: "ccm-child-agent-handoff-quality-v1",
    pass: !onlyHandoffOrAdvice,
    status: !requiresExecutionEvidence
      ? "not_required"
      : status !== "done"
        ? "not_final"
        : onlyHandoffOrAdvice
          ? "handoff_or_advice_only"
          : "execution_evidence_ready",
    status_label: !requiresExecutionEvidence
      ? "无需执行证据"
      : status !== "done"
        ? "尚未最终提交"
        : onlyHandoffOrAdvice
          ? "只是建议或交接"
          : "执行证据可采信",
    reason: !requiresExecutionEvidence
      ? "该任务不强制代码修改或验证证据。"
      : status !== "done"
        ? "只在子 Agent 声称已完成时判断是否只是建议或交接。"
        : onlyHandoffOrAdvice
          ? "子 Agent 的结果更像建议或交接，缺少可验收的真实修改/验证证据。"
          : "子 Agent 提供了可用于验收的执行证据。",
    evidence: {
      has_handoff_hint: hasHandoffHint,
      has_no_execution_hint: hasNoExecutionHint,
      has_concrete_files: hasConcreteFiles,
      has_concrete_actions: hasConcreteActions,
      has_executed_verification: hasExecutedVerification,
      missing_required_files: missingRequiredFiles,
      missing_required_verification: missingRequiredVerification,
      hints: hints.slice(0, 6),
    },
  };
}

export function scoreChildAgentReceipt(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-acceptance").scoreChildAgentReceipt(task, receipt, context);
}

export function buildCoordinationEventStream(task: any, summary: any = {}, executions: any[] = [], ackReview: any = null, contractTransfer: any = null, receiptRows: any[] = [], targetedRework: any[] = []) {
  const timeline = Array.isArray(summary.timeline) ? summary.timeline : [];
  const events: any[] = [];
  const add = (type: string, label: string, status = "info", detail = "", data: any = null) => {
    events.push({ id: `${type}_${events.length + 1}`, type, label, status, detail: compactMemoryText(detail, 220), data });
  };
  if (Array.isArray(summary.assignment_evidence) && summary.assignment_evidence.length) add("work_order_sent", "工作单已派发", "ok", `已派发 ${summary.assignment_evidence.length} 条`);
  const memoryGateSummary = buildMemoryGateVisibleSummary(summary);
  const globalMemorySummary = buildGlobalMemoryReceiptVisibleSummary(summary);
  if (memoryGateSummary.required) {
    add(
      "memory_gate_receipt",
      "记忆派发校验",
      memoryGateSummary.pass ? "ok" : "warn",
      memoryGateSummary.summary,
      { missing_gate_ids: memoryGateSummary.missing_gate_ids, rows: memoryGateSummary.rows }
    );
  }
  if (globalMemorySummary.required) {
    add(
      "global_memory_receipt",
      "全局记忆使用校验",
      globalMemorySummary.pass ? "ok" : "warn",
      globalMemorySummary.summary,
      {
        missing_global_memory_ids: globalMemorySummary.missing_global_memory_ids,
        unsafe_used_global_memory_ids: globalMemorySummary.unsafe_used_global_memory_ids,
        rows: globalMemorySummary.rows,
      }
    );
  }
  const globalMemoryHealthSummary = buildGlobalMemoryHealthGateVisibleSummary(summary);
  if (globalMemoryHealthSummary.required) {
    add(
      "global_memory_health_gate_receipt",
      "全局记忆健康门禁校验",
      globalMemoryHealthSummary.pass ? "ok" : "warn",
      globalMemoryHealthSummary.summary,
      {
        missing_gate_ids: globalMemoryHealthSummary.missing_gate_ids,
        blocked_global_memory_used_gate_ids: globalMemoryHealthSummary.blocked_global_memory_used_gate_ids,
        rows: globalMemoryHealthSummary.rows,
      }
    );
  }
  const readPlanRevalidationGateSummary = buildReadPlanRevalidationGateVisibleSummary(summary);
  if (readPlanRevalidationGateSummary.required) {
    add(
      "read_plan_revalidation_gate_receipt",
      "读取计划重读校验",
      readPlanRevalidationGateSummary.pass ? "ok" : "warn",
      readPlanRevalidationGateSummary.summary,
      {
        missing_gate_ids: readPlanRevalidationGateSummary.missing_gate_ids,
        missing_read_plan_ids: readPlanRevalidationGateSummary.missing_read_plan_ids,
        session_mismatch_gate_ids: readPlanRevalidationGateSummary.session_mismatch_gate_ids,
        rows: readPlanRevalidationGateSummary.rows,
      }
    );
  }
  const reinjectionGateSummary = buildPostCompactReinjectionGateVisibleSummary(summary);
  if (reinjectionGateSummary.required) {
    add(
      "post_compact_reinjection_gate_receipt",
      "压缩重注入校验",
      reinjectionGateSummary.pass ? "ok" : "warn",
      reinjectionGateSummary.summary,
      {
        missing_gate_ids: reinjectionGateSummary.missing_gate_ids,
        missing_candidate_reference_gate_ids: reinjectionGateSummary.missing_candidate_reference_gate_ids,
        missing_candidate_usage_gate_ids: reinjectionGateSummary.missing_candidate_usage_gate_ids,
        missing_candidate_usage_candidate_ids: reinjectionGateSummary.missing_candidate_usage_candidate_ids,
        candidate_usage_counts: reinjectionGateSummary.candidate_usage_counts,
        rows: reinjectionGateSummary.rows,
      }
    );
  }
  const apiMicrocompactSummary = buildApiMicrocompactReceiptVisibleSummary(summary);
  if (apiMicrocompactSummary.required) {
    add(
      "api_microcompact_receipt",
      "API microcompact 校验",
      apiMicrocompactSummary.pass ? "ok" : "warn",
      apiMicrocompactSummary.summary,
      {
        plan_checksums: apiMicrocompactSummary.plan_checksums,
        missing_plan_checksums: apiMicrocompactSummary.missing_plan_checksums,
        unsafe_native_applied_plan_checksums: apiMicrocompactSummary.unsafe_native_applied_plan_checksums,
        rows: apiMicrocompactSummary.rows,
      }
    );
  }
  const postCompactDispatchMarkerSummary = buildPostCompactDispatchMarkerVisibleSummary(summary);
  if (postCompactDispatchMarkerSummary.required) {
    add(
      "post_compact_dispatch_marker",
      "压缩后派发标记",
      "info",
      postCompactDispatchMarkerSummary.summary,
      { marker_ids: postCompactDispatchMarkerSummary.marker_ids, rows: postCompactDispatchMarkerSummary.rows }
    );
  }
  const ackStatusLabel = (status: any) => ({
    approved: "已确认",
    weak: "需补充",
    conflict: "需仲裁",
    waiting: "等待中",
    missing: "未收到",
  }[String(status || "")] || String(status || "待确认"));
  for (const row of Array.isArray(ackReview?.rows) ? ackReview.rows : []) add("ack_received", `${row.agent || "子 Agent"} 接单确认${ackStatusLabel(row.status)}`, row.status === "approved" ? "ok" : "warn", row.reason, row);
  for (const item of executions || []) add("heartbeat_received", `${item.project || "Agent"} ${item.state || "pending"}`, ["failed", "cancelled"].includes(String(item.state || "")) ? "warn" : "info", item.id || "", { execution_id: item.id, state: item.state });
  if (contractTransfer?.required) add("contract_changed", "检测到结构化契约变化", contractTransfer.status === "ready" ? "ok" : "warn", contractTransfer.next_action, contractTransfer);
  for (const row of receiptRows || []) add("receipt_scored", `${row.agent || "Agent"} 结果说明评分 ${row.quality?.score || 0}`, row.quality?.grade === "good" ? "ok" : "warn", (row.quality?.missing || []).join("、"), row);
  for (const item of targetedRework || []) add("targeted_rework_created", item.title || "精准返工建议", "warn", item.reason || "", item);
  for (const item of timeline.filter((entry: any) => /agent_qa|rework|dispatch|acceptance/i.test(String(entry.type || ""))).slice(-6)) {
    add(String(item.type || "timeline"), item.title || "协作事件", timelineStatusForUser(item) === "failed" ? "warn" : "info", item.detail || "", { timeline_id: item.id || "" });
  }
  return events.slice(-18);
}

export function compactRuntimeToolAudit(audit: any = {}) {
  return {
    runtime: audit.runtime || "",
    mode: audit.mode || "",
    isolation: audit.isolation || "",
    snapshotId: audit.snapshotId || "",
    snapshotPath: audit.snapshotPath || "",
    mcpConfigPath: audit.mcpConfigPath || "",
    skillRoot: audit.skillRoot || "",
    requested: audit.requested || { mcp: [], skill: [] },
    synced: audit.synced || { mcp: [], skill: [] },
    missing: audit.missing || { mcp: [], skill: [] },
    mcp_statuses: Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses.slice(0, 30) : [],
    skill_statuses: Array.isArray(audit.skill_statuses) ? audit.skill_statuses.slice(0, 30) : [],
    permission_rules: Array.isArray(audit.permission_rules) ? audit.permission_rules.slice(0, 50) : [],
    invoked_skills: Array.isArray(audit.invoked_skills) ? audit.invoked_skills.slice(0, 30) : [],
    authorization_readiness: audit.authorization_readiness || null,
    dispatch_gate: audit.dispatch_gate || null,
    catalogRevision: audit.catalogRevision || "",
    warnings: Array.isArray(audit.warnings) ? audit.warnings.slice(0, 12) : [],
    errors: Array.isArray(audit.errors) ? audit.errors.slice(0, 12) : [],
    reusedSnapshot: !!audit.reusedSnapshot,
    timestamp: audit.timestamp || "",
  };
}

export function runtimeToolSnapshotFromAudit(audit: any = {}, allowedTools: any = {}) {
  return {
    snapshotId: audit.snapshotId || "",
    snapshotPath: audit.snapshotPath || "",
    mcpConfigPath: audit.mcpConfigPath || "",
    allowedTools: allowedTools || audit.requested || { mcp: [], skill: [] },
    permissionRules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
    authorizationReadiness: audit.authorization_readiness || null,
    dispatchGate: audit.dispatch_gate || null,
    catalogRevision: audit.catalogRevision || "",
  };
}

export function attachInvokedSkillsToReceipt(receipt: any, text: string, allowedTools: any = {}, audit: any = null) {
  const sourceText = [
    text,
    ...(Array.isArray(receipt?.memoryUsed) ? receipt.memoryUsed : []),
    ...(Array.isArray(receipt?.memory_used) ? receipt.memory_used : []),
  ].join("\n");
  const invoked = detectInvokedSkillsFromText(sourceText, allowedTools);
  if (audit && invoked.length) audit.invoked_skills = uniqueByKey([...(audit.invoked_skills || []), ...invoked], (item: any) => item.name, 30);
  if (!receipt || !invoked.length) return { receipt, invoked };
  return {
    receipt: {
      ...receipt,
      invokedSkills: uniqueByKey([...(Array.isArray(receipt.invokedSkills) ? receipt.invokedSkills : []), ...invoked], (item: any) => item.name, 30),
      runtimeToolSnapshot: runtimeToolSnapshotFromAudit(audit || {}, allowedTools),
    },
    invoked,
  };
}

export function collectRuntimeToolingFromSources(task: any = {}, execution: any = {}, lifecycle: any[] = [], receipts: any[] = []) {
  const audits: any[] = [];
  const addAudit = (audit: any) => {
    if (!audit || typeof audit !== "object") return;
    audits.push(compactRuntimeToolAudit(audit));
  };
  for (const event of lifecycle || []) addAudit(event?.data?.runtime_tool_sync || event?.data?.runtimeToolSync || (event.action === "runtime_tool_sync" ? event.data : null));
  for (const record of task?.id ? listExecutions({ taskId: task.id }) : []) {
    for (const item of Array.isArray(record.events) ? record.events : []) addAudit(item?.data?.runtime_tool_sync || item?.data?.runtimeToolSync);
  }
  addAudit(execution?.runtimeToolSync || execution?.runtime_tool_sync);
  for (const message of task?.group_id && task?.id ? getGroupMessages(task.group_id, groupSessionIdForTask(task)).filter((item: any) => item?.task_id === task.id) : []) {
    for (const event of Array.isArray(message.workEvents) ? message.workEvents : []) addAudit(event.runtimeToolSync || event.runtime_tool_sync);
  }

  const latestBySnapshot = new Map<string, any>();
  for (const audit of audits) {
    const fallbackKey = crypto.createHash("sha256").update(JSON.stringify(audit || {})).digest("hex").slice(0, 12);
    const key = `${audit.runtime}|${audit.snapshotId || audit.mcpConfigPath || audit.timestamp || fallbackKey}`;
    latestBySnapshot.set(key, audit);
  }
  const uniqueAudits = Array.from(latestBySnapshot.values()).sort((a: any, b: any) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  const invokedSkills = uniqueByKey([
    ...uniqueAudits.flatMap((audit: any) => audit.invoked_skills || []),
    ...receipts.flatMap((receipt: any) => Array.isArray(receipt.invokedSkills) ? receipt.invokedSkills : []),
  ], (item: any) => item.name || JSON.stringify(item), 50);
  const missingMcp = uniqueStrings(...uniqueAudits.map((audit: any) => audit.missing?.mcp || []));
  const missingSkill = uniqueStrings(...uniqueAudits.map((audit: any) => audit.missing?.skill || []));
  const errors = uniqueStrings(...uniqueAudits.map((audit: any) => audit.errors || []));
  const warnings = uniqueStrings(...uniqueAudits.map((audit: any) => audit.warnings || []));
  const dispatchGateBlockers = uniqueAudits
    .filter((audit: any) => audit.dispatch_gate?.dispatchReady === false)
    .flatMap((audit: any) => audit.dispatch_gate?.blockers || []);
  const blocked = errors.length > 0
    || missingMcp.length > 0
    || missingSkill.length > 0
    || dispatchGateBlockers.length > 0
    || uniqueAudits.some((audit: any) => audit.mode === "failed");
  return {
    status: blocked ? "needs_attention" : uniqueAudits.length ? "ready" : "not_recorded",
    audits: uniqueAudits.slice(-12),
    audit_count: uniqueAudits.length,
    latest: uniqueAudits.at(-1) || null,
    snapshots: uniqueStrings(uniqueAudits.map((audit: any) => audit.snapshotId).filter(Boolean)).slice(0, 20),
    reused_snapshot_count: uniqueAudits.filter((audit: any) => audit.reusedSnapshot).length,
    mcp_statuses: uniqueAudits.flatMap((audit: any) => audit.mcp_statuses || []).slice(-40),
    skill_statuses: uniqueAudits.flatMap((audit: any) => audit.skill_statuses || []).slice(-40),
    permission_rules: uniqueAudits.flatMap((audit: any) => audit.permission_rules || []).slice(-80),
    invoked_skills: invokedSkills,
    dispatch_gate_blockers: dispatchGateBlockers.slice(-20),
    missing: { mcp: missingMcp, skill: missingSkill },
    errors,
    warnings,
  };
}

export function buildRuntimeKernelSnapshot(task: any = {}, summary: any = {}) {
  const trace = task?.trace_id ? getTrace(task.trace_id) : null;
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const lifecycle = events
    .filter((event: any) => event.type === "agent_runtime.lifecycle")
    .map((event: any) => ({ ...(event.data || {}), at: event.at, task_id: event.task_id || "", group_id: event.group_id || "", trace_event_id: event.id }))
    .filter((event: any) => !task?.id || !event.task_id || event.task_id === task.id);
  const contractInjections = events
    .filter((event: any) => event.type === "agent_runtime.contract_injection")
    .map((event: any) => ({ ...(event.data || {}), at: event.at, task_id: event.task_id || "", group_id: event.group_id || "", trace_event_id: event.id }))
    .filter((event: any) => !task?.id || !event.task_id || event.task_id === task.id);
  const latestLifecycle = lifecycle.slice(-8);
  const ackOnlyEvents = lifecycle.filter((event: any) => event.action === "ack_preflight_dispatch" || event.data?.ack_only === true);
  const dispatches = lifecycle.filter((event: any) => event.action === "dispatch_worker");
  const contextPressures = lifecycle
    .map((event: any) => Number(event.context_budget?.pressure || 0))
    .filter((value: number) => Number.isFinite(value) && value > 0);
  const packetIds = uniqueStrings(
    dispatches.map((event: any) => event.data?.worker_context_packet?.packet_id),
    (Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []).map((item: any) => item.worker_context_packet?.packet_id),
  );
  const runtimeTooling = summary.runtime_tooling?.audit_count
    ? summary.runtime_tooling
    : collectRuntimeToolingFromSources(task, {}, lifecycle, Array.isArray(summary.receipts) ? summary.receipts : []);
  const postCompactDispatchMarkers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    : collectTaskPostCompactDispatchMarkers(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  return {
    trace_id: task?.trace_id || "",
    lifecycle_count: lifecycle.length,
    latest_lifecycle: latestLifecycle,
    blocked_count: lifecycle.filter((event: any) => ["blocked", "error"].includes(String(event.status || ""))).length,
    ack_only: {
      active: ackOnlyEvents.length > 0 && summary.ack_gate_passed !== true,
      count: ackOnlyEvents.length,
      latest: ackOnlyEvents.at(-1) || null,
    },
    dispatch_worker_count: dispatches.length,
    worker_context_packet_ids: packetIds.slice(0, 12),
    contract_injections: contractInjections.slice(-12),
    injection_ids: uniqueStrings(
      contractInjections.map((item: any) => item.injection_id),
      Array.isArray(summary.contract_injection_gate?.rows) ? summary.contract_injection_gate.rows.map((row: any) => row.injection_id) : [],
    ).slice(0, 20),
    context_budget: {
      max_pressure: contextPressures.length ? Math.max(...contextPressures) : 0,
      compact_recommended: lifecycle.some((event: any) => event.context_budget?.compact_recommended),
    },
    task_agent_memory_context_snapshot: {
      required: Number(summary.task_agent_memory_context_snapshot_count || 0) > 0,
      pass: Number(summary.task_agent_memory_context_snapshot_count || 0) === 0 || summary.task_agent_memory_snapshot_receipt_passed === true,
      status: Number(summary.task_agent_memory_context_snapshot_count || 0) === 0
        ? "not_required"
        : summary.task_agent_memory_snapshot_receipt_passed === true ? "passed" : "session_snapshot_mismatch",
      snapshot_count: Number(summary.task_agent_memory_context_snapshot_count || 0),
      snapshot_ids: uniqueStrings((summary.task_agent_memory_context_snapshots || []).map((item: any) => item.snapshot_id)).slice(0, 20),
      session_ids: uniqueStrings((summary.task_agent_memory_context_snapshots || []).map((item: any) => item.task_agent_session_id)).slice(0, 20),
      worker_context_packet_ids: uniqueStrings((summary.task_agent_memory_context_snapshots || []).map((item: any) => item.worker_context_packet_id)).slice(0, 20),
    },
    memory_gate: buildMemoryGateVisibleSummary(summary),
    global_memory_receipt_gate: buildGlobalMemoryReceiptVisibleSummary(summary),
    global_memory_health_gate: buildGlobalMemoryHealthGateVisibleSummary(summary),
    read_plan_revalidation_gate: buildReadPlanRevalidationGateVisibleSummary(summary),
    post_compact_reinjection_gate: buildPostCompactReinjectionGateVisibleSummary(summary),
    api_microcompact_receipt: buildApiMicrocompactReceiptVisibleSummary(summary),
    post_compact_dispatch_marker: buildPostCompactDispatchMarkerVisibleSummary({
      ...summary,
      post_compact_dispatch_markers: postCompactDispatchMarkers,
      post_compact_dispatch_marker_count: postCompactDispatchMarkers.length || Number(summary.post_compact_dispatch_marker_count || 0),
    }),
    runtime_tooling: runtimeTooling,
  };
}

export function buildTargetedReworkSuggestions(task: any, summary: any = {}, acceptanceReview: any = null, receiptQualityRows: any[] = []) {
  const missing = new Set<string>(Array.isArray(acceptanceReview?.missing) ? acceptanceReview.missing : []);
  const globalMemorySummary = buildGlobalMemoryReceiptVisibleSummary(summary);
  const globalMemoryHealthSummary = buildGlobalMemoryHealthGateVisibleSummary(summary);
  const apiMicrocompactSummary = buildApiMicrocompactReceiptVisibleSummary(summary);
  const suggestions: any[] = [];
  const add = (id: string, title: string, target = "", reason = "", action = "gap_continue") => {
    if (suggestions.some(item => item.id === id && item.target === target)) return;
    suggestions.push({ id, title, target, reason: compactMemoryText(reason, 220), action, kind: "targeted_rework", tone: action === "replan" ? "outline" : "warning", label: title });
  };
  const hasMissingAny = (...labels: string[]) => labels.some(label => missing.has(label));
  if (hasMissingAny("真实文件 Diff", "真实文件改动")) add("missing_diff", "只派实现返工", task?.target_project || "", "任务要求代码变更，但系统没有捕获真实文件改动。");
  if (missing.has("已执行验证")) add("missing_verification", "只派验证返工", task?.target_project || "", "任务要求验证，但结果说明里没有可采信的已执行验证。");
  if (hasMissingAny("子 Agent 回执", "子 Agent 结果说明")) add("missing_receipt", "要求子 Agent 补结果说明", task?.target_project || "", "缺少可验收的结构化结果说明。");
  if (missing.has("目标覆盖")) add("missing_goal_review", "主 Agent 重新复盘目标覆盖", "coordinator", "缺少最终复盘或仍有未解决阻塞。", "replan");
  if (hasMissingAny("子 Agent 记忆快照匹配", "记忆快照匹配")) add("task_agent_memory_snapshot_receipt", "补充本轮记忆快照回执", task?.target_project || "", "结果说明没有匹配本轮 task Agent session 的记忆上下文快照。", "gap_continue");
  if (hasMissingAny("记忆 gate 回执", "记忆使用声明")) add("memory_gate_receipt", "补充记忆使用声明", task?.target_project || "", "结果说明没有说明本轮群聊记忆使用情况。", "gap_continue");
  if (hasMissingAny("全局记忆回执", "全局记忆使用声明")) add("global_memory_receipt", "补充全局记忆使用声明", task?.target_project || "", "结果说明没有按 global_memory_id 声明全局记忆使用、忽略或当前源核验。", "gap_continue");
  if (hasMissingAny("全局记忆健康门禁回执", "全局记忆健康门禁声明", "全局记忆使用说明")) add("global_memory_health_gate_receipt", "补充全局记忆使用说明", task?.target_project || "", "结果说明没有说明全局记忆风险和处理情况。", "gap_continue");
  if (hasMissingAny("读取计划重读回执", "读取计划重读声明")) add("read_plan_revalidation_gate_receipt", "补充读取计划重读声明", task?.target_project || "", "结果说明没有在绑定子 Agent 会话中声明 stale read plan 已重读当前源。", "gap_continue");
  if (hasMissingAny("压缩重注入回执", "压缩重注入声明", "压缩后上下文恢复声明")) add("post_compact_reinjection_gate_receipt", "补充压缩后上下文恢复声明", task?.target_project || "", "结果说明没有说明压缩后上下文如何恢复和使用。", "gap_continue");
  if (hasMissingAny("API microcompact 回执", "API microcompact 使用声明", "上下文压缩计划使用说明")) add("api_microcompact_receipt", "补充上下文压缩计划使用说明", task?.target_project || "", "结果说明没有说明上下文压缩计划的使用状态。", "gap_continue");
  if (hasMissingAny("回执质量", "结果说明质量", "结果说明完整")) add("weak_receipt", "要求补充高质量结果说明", task?.target_project || "", "结果说明质量未通过，需要补接单说明、动作、文件、验证、契约或记忆声明。", "gap_continue");
  for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : []) {
    add("failed_verification", "只修失败验证点", task?.target_project || "", String(value), "gap_continue");
  }
  for (const row of receiptQualityRows.filter((item: any) => item.quality?.grade !== "good")) {
    if (row.quality?.handoff_quality?.pass === false) {
      add(
        "handoff_only_receipt",
        "要求补齐真实执行证据",
        row.agent || row.project || "",
        row.quality.handoff_quality.reason || "子 Agent 的结果更像建议或交接，需要补齐真实修改、执行动作和验证证据。",
        "gap_continue"
      );
    }
    if (row.quality?.memory_gate?.required && row.quality?.memory_gate?.pass !== true) {
      add(
        "memory_gate_receipt",
        "补充记忆使用声明",
        row.agent || row.project || "",
        `结果说明需要引用记忆 gate：${(row.quality.memory_gate.missing_gate_ids || row.quality.memory_gate.gate_ids || []).join("、") || "本轮派发 gate"}`,
        "gap_continue"
      );
    }
    if (row.quality?.global_memory_gate?.required && row.quality?.global_memory_gate?.pass !== true) {
      const gate = row.quality.global_memory_gate;
      const reason = (gate.unsafe_used_global_memory_ids || []).length
        ? `background-only 或降权全局记忆不能直接使用，需声明 ignored/background 或 current source verified：${gate.unsafe_used_global_memory_ids.join("、")}`
        : (gate.missing_current_verification_ids || []).length
          ? `风险全局记忆使用前必须声明 current source verified：${gate.missing_current_verification_ids.join("、")}`
          : (gate.missing_semantic_acknowledgement_ids || []).length
            ? `语义仲裁全局记忆必须声明 semantic_risk 已识别：${gate.missing_semantic_acknowledgement_ids.join("、")}`
            : (gate.missing_cross_group_acknowledgement_ids || []).length
              ? `跨群聊全局记忆必须声明 cross_group_suppression/advisory/background：${gate.missing_cross_group_acknowledgement_ids.join("、")}`
              : `结果说明需要按 global_memory_id 声明使用状态：${(gate.missing_global_memory_ids || gate.global_memory_ids || []).join("、") || "本轮全局记忆"}`;
      add(
        "global_memory_receipt",
        "补充全局记忆使用声明",
        row.agent || row.project || "",
        reason,
        "gap_continue"
      );
    }
    if (row.quality?.global_memory_health_gate?.required && row.quality?.global_memory_health_gate?.pass !== true) {
      const gate = row.quality.global_memory_health_gate;
      const reason = (gate.blocked_global_memory_used_gate_ids || []).length
        ? `Global Agent memory health gate 已阻断，但结果说明仍声明使用全局记忆：${gate.blocked_global_memory_used_gate_ids.join("、")}`
        : (gate.missing_ignore_gate_ids || []).length
          ? `健康门禁失败时必须在 memoryIgnored 引用 gate 并说明不使用全局记忆：${gate.missing_ignore_gate_ids.join("、")}`
          : (gate.missing_warning_ack_gate_ids || []).length
            ? `健康门禁 warn 时必须声明残留警告或当前源核验：${gate.missing_warning_ack_gate_ids.join("、")}`
            : `结果说明需要引用 Global Agent memory health gate：${(gate.missing_gate_ids || gate.gate_ids || []).join("、") || "本轮健康门禁"}`;
      add(
        "global_memory_health_gate_receipt",
        "补充全局记忆健康门禁声明",
        row.agent || row.project || "",
        reason,
        "gap_continue"
      );
    }
    if (row.quality?.read_plan_revalidation_gate?.required && row.quality?.read_plan_revalidation_gate?.pass !== true) {
      const gate = row.quality.read_plan_revalidation_gate;
      const reason = gate.session_matched === false
        ? `结果说明必须来自绑定子 Agent 会话：${(gate.session_mismatch_gate_ids || gate.gate_ids || []).join("、") || "本轮读取计划重读 gate"}`
        : (gate.missing_read_plan_ids || []).length
          ? `结果说明需要声明 stale read_plan_id 已重读当前源：${gate.missing_read_plan_ids.join("、")}`
          : `结果说明需要引用读取计划重读 gate 并声明 current source verified：${(gate.missing_gate_ids || gate.gate_ids || []).join("、") || "本轮读取计划重读 gate"}`;
      add(
        "read_plan_revalidation_gate_receipt",
        "补充读取计划重读声明",
        row.agent || row.project || "",
        reason,
        "gap_continue"
      );
    }
    if (row.quality?.post_compact_reinjection_gate?.required && row.quality?.post_compact_reinjection_gate?.pass !== true) {
      const gate = row.quality.post_compact_reinjection_gate;
      const missingUsageIds = gate.missing_candidate_usage_gate_ids || [];
      const missingUsageCandidateIds = gate.missing_candidate_usage_candidate_ids || [];
      const missingCandidateIds = gate.missing_candidate_reference_gate_ids || [];
      const missingGateIds = gate.missing_gate_ids || [];
      const fallbackGateIds = missingGateIds.length ? missingGateIds : (gate.gate_ids || []);
      const reason = missingUsageIds.length
        ? `结果说明需要逐条声明压缩后重注入候选的使用状态 used/ignored/verified：${(missingUsageCandidateIds.length ? missingUsageCandidateIds : missingUsageIds).join("、")}`
        : missingCandidateIds.length
          ? `结果说明需要声明压缩后重注入候选 candidate_id / 候选值 / 全部候选：${missingCandidateIds.join("、")}`
          : `结果说明需要引用压缩后重注入 gate：${fallbackGateIds.join("、") || "本轮重注入 gate"}`;
      add(
        "post_compact_reinjection_gate_receipt",
        "补充压缩记忆使用声明",
        row.agent || row.project || "",
        reason,
        "gap_continue"
      );
    }
    if (row.quality?.api_microcompact?.required && row.quality?.api_microcompact?.pass !== true) {
      const gate = row.quality.api_microcompact;
      const reason = (gate.unsafe_native_applied_plan_checksums || []).length
        ? `该执行器不支持 native API context-management 时不能声明原生应用：${gate.unsafe_native_applied_plan_checksums.join("、")}`
        : `结果说明需要声明 API microcompact edit plan 使用状态 native_applied/advisory/ignored：${(gate.missing_plan_checksums || gate.plan_checksums || []).join("、") || "本轮计划"}`;
      add(
        "api_microcompact_receipt",
        "补充 API microcompact 使用声明",
        row.agent || row.project || "",
        reason,
        "gap_continue"
      );
    }
    add("weak_receipt", "要求补充高质量结果说明", row.agent || row.project || "", `结果说明评分 ${row.quality?.score || 0}：${(row.quality?.missing || []).join("、")}`, "gap_continue");
  }
  for (const row of Array.isArray(globalMemorySummary?.rows) ? globalMemorySummary.rows : []) {
    if (["not_required", "passed"].includes(String(row.status || ""))) continue;
    add(
      "global_memory_receipt",
      "补充全局记忆使用声明",
      row.agent || task?.target_project || "",
      row.reason || "结果说明缺少全局记忆使用声明。",
      "gap_continue"
    );
  }
  for (const row of Array.isArray(globalMemoryHealthSummary?.rows) ? globalMemoryHealthSummary.rows : []) {
    if (["not_required", "passed"].includes(String(row.status || ""))) continue;
    add(
      "global_memory_health_gate_receipt",
      "补充全局记忆健康门禁声明",
      row.agent || task?.target_project || "",
      row.reason || "结果说明缺少 Global Agent memory health gate 使用/忽略声明。",
      "gap_continue"
    );
  }
  for (const row of Array.isArray(apiMicrocompactSummary?.rows) ? apiMicrocompactSummary.rows : []) {
    if (["not_required", "passed"].includes(String(row.status || ""))) continue;
    add(
      "api_microcompact_receipt",
      "补充 API microcompact 使用声明",
      row.agent || task?.target_project || "",
      row.reason || "结果说明缺少 API microcompact edit plan 使用状态声明。",
      "gap_continue"
    );
  }
  return suggestions.slice(0, 8);
}

export function buildChildAgentPlanReviewSummary(ackReview: any = {}, orders: any[] = []) {
  const rows = Array.isArray(ackReview.rows) ? ackReview.rows : [];
  const orderAgents = orders.map((order: any) => String(order.project || order.agent || order.target || "").trim()).filter(Boolean);
  const reviewRows = rows.length
    ? rows
    : orderAgents.map((agent: string) => ({ agent, status: "waiting", reason: "等待接单 ACK", planned_scope: [], verification_plan: [], unclear: [] }));
  if (!reviewRows.length) return null;
  const normalizedRows = reviewRows.slice(0, 12).map((row: any) => {
    const rawStatus = String(row.status || "").toLowerCase();
    const approved = rawStatus === "approved";
    const waiting = rawStatus === "waiting";
    const needsRevision = ["missing", "weak", "needs_rewrite"].includes(rawStatus);
    const status = approved ? "approved" : waiting ? "waiting" : needsRevision ? "needs_revision" : (rawStatus || "waiting");
    return {
      agent: sanitizeUserAgentProgressText(row.agent || row.project || "执行成员", "执行成员", 80),
      status,
      status_label: status === "approved" ? "计划清晰" : status === "waiting" ? "等待计划" : "需调整",
      understood_goal: compactMemoryText(row.understood_goal || row.understoodGoal || "", 180),
      planned_scope: (Array.isArray(row.planned_scope) ? row.planned_scope : Array.isArray(row.plannedScope) ? row.plannedScope : [])
        .map((item: any) => compactMemoryText(item, 140)).filter(Boolean).slice(0, 5),
      forbidden_scope: (Array.isArray(row.forbidden_scope) ? row.forbidden_scope : Array.isArray(row.forbiddenScope) ? row.forbiddenScope : [])
        .map((item: any) => compactMemoryText(item, 140)).filter(Boolean).slice(0, 4),
      verification_plan: (Array.isArray(row.verification_plan) ? row.verification_plan : Array.isArray(row.verificationPlan) ? row.verificationPlan : [])
        .map((item: any) => compactMemoryText(item, 140)).filter(Boolean).slice(0, 5),
      unclear: (Array.isArray(row.unclear) ? row.unclear : [])
        .map((item: any) => compactMemoryText(item, 140)).filter(Boolean).slice(0, 4),
      reason: sanitizeUserAgentProgressText(row.reason || (status === "approved" ? "目标、范围和验证安排清晰" : status === "waiting" ? "等待执行成员提交接单计划" : "执行计划需要补齐目标、范围或验证安排"), "执行计划已整理。", 180),
    };
  });
  const needsRevisionCount = normalizedRows.filter((row: any) => row.status === "needs_revision").length;
  const waitingCount = normalizedRows.filter((row: any) => row.status === "waiting").length;
  const approvedCount = normalizedRows.filter((row: any) => row.status === "approved").length;
  const status = needsRevisionCount ? "needs_revision" : waitingCount ? "waiting" : "approved";
  return {
    schema: "ccm-child-agent-plan-review-v1",
    title: "执行成员计划",
    status,
    status_label: status === "approved" ? "已通过" : status === "waiting" ? "等待提交" : "需调整",
    headline: status === "approved"
      ? "我已检查执行成员的接单计划，目标、范围和验证安排清晰。"
      : status === "waiting"
        ? "正在等待执行成员提交接单计划；收到后我会先检查再让其继续执行。"
        : `${needsRevisionCount} 个执行成员的执行计划还不够清楚，我会先要求补齐目标、范围或验证安排。`,
    approved_count: approvedCount,
    waiting_count: waitingCount,
    needs_revision_count: needsRevisionCount,
    rows: normalizedRows,
    next_action: status === "approved"
      ? "继续跟踪执行结果、文件改动和验证证据。"
      : status === "waiting"
        ? "等待执行成员提交接单计划。"
        : "先要求对应执行成员重写接单计划，再继续执行或验收。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

export function buildUserAgentCoordinationProtocol(task: any, summary: any = {}, executions: any[] = [], workOrderPreview: any = null, acceptanceReview: any = null) {
  const orders = Array.isArray(workOrderPreview?.orders) ? workOrderPreview.orders : [];
  const receiptCandidates = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const seenReceiptAgents = new Set<string>();
  const receipts = receiptCandidates.filter((receipt: any) => {
    const agent = String(receipt?.agent || receipt?.project || "").trim().toLowerCase();
    if (!agent) return true;
    if (seenReceiptAgents.has(agent)) return false;
    seenReceiptAgents.add(agent);
    return true;
  });
  const memoryDispatchGates = Array.isArray(summary.memory_dispatch_gates || summary.memoryDispatchGates)
    ? (summary.memory_dispatch_gates || summary.memoryDispatchGates)
    : collectTaskMemoryDispatchFreshnessGates(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const globalMemoryReceiptGates = Array.isArray(summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
    ? (summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
    : collectTaskGlobalMemoryReceiptGates(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const globalMemoryHealthGates = Array.isArray(summary.global_memory_health_gates || summary.globalMemoryHealthGates)
    ? (summary.global_memory_health_gates || summary.globalMemoryHealthGates)
    : collectTaskGlobalMemoryHealthGates(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const readPlanRevalidationGates = Array.isArray(summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
    ? (summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
    : collectTaskReadPlanRevalidationGates(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const postCompactReinjectionGates = Array.isArray(summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
    ? (summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
    : collectTaskPostCompactReinjectionGates(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const apiMicrocompactEditPlans = Array.isArray(summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
    ? (summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
    : collectTaskApiMicrocompactEditPlans(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const postCompactDispatchMarkers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    : collectTaskPostCompactDispatchMarkers(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
  const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const receiptRows = receipts.map((receipt: any) => ({
    agent: receipt.agent || receipt.project || "",
    status: receipt.status || receipt.receipt_status || "",
    summary: compactMemoryText(receipt.summary || "", 160),
    quality: scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: summary.assignment_evidence || [] }),
  })).slice(0, 10);
  const memoryGateSummary = buildMemoryGateVisibleSummary({
    ...summary,
    memory_dispatch_gates: memoryDispatchGates,
    memory_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.memory_gate?.required)
      .map((row: any) => ({ ...row, memory_gate: row.quality.memory_gate })),
  });
  const readPlanRevalidationGateSummary = buildReadPlanRevalidationGateVisibleSummary({
    ...summary,
    read_plan_revalidation_gates: readPlanRevalidationGates,
    read_plan_revalidation_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.read_plan_revalidation_gate?.required)
      .map((row: any) => ({ ...row, read_plan_revalidation_gate: row.quality.read_plan_revalidation_gate })),
  });
  const globalMemoryReceiptSummary = buildGlobalMemoryReceiptVisibleSummary({
    ...summary,
    global_memory_receipt_gates: globalMemoryReceiptGates,
    global_memory_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_gate?.required)
      .map((row: any) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
  });
  const globalMemoryHealthGateSummary = buildGlobalMemoryHealthGateVisibleSummary({
    ...summary,
    global_memory_health_gates: globalMemoryHealthGates,
    global_memory_health_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_health_gate?.required)
      .map((row: any) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
  });
  const reinjectionGateSummary = buildPostCompactReinjectionGateVisibleSummary({
    ...summary,
    post_compact_reinjection_gates: postCompactReinjectionGates,
    post_compact_reinjection_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.post_compact_reinjection_gate?.required)
      .map((row: any) => ({ ...row, post_compact_reinjection_gate: row.quality.post_compact_reinjection_gate })),
  });
  const apiMicrocompactSummary = buildApiMicrocompactReceiptVisibleSummary({
    ...summary,
    api_microcompact_edit_plans: apiMicrocompactEditPlans,
    api_microcompact_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.api_microcompact?.required)
      .map((row: any) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
  });
  const postCompactDispatchMarkerSummary = buildPostCompactDispatchMarkerVisibleSummary({
    ...summary,
    post_compact_dispatch_markers: postCompactDispatchMarkers,
    post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
  });
  const handoff = orders.map((order: any) => {
    const matchName = (value: any) => String(value || "").toLowerCase() === String(order.project || "").toLowerCase();
    const receipt = receipts.find((item: any) => matchName(item.agent || item.project));
    const notification = notifications.find((item: any) => matchName(item.task_id || item.agent || item.project));
    const execution = executions.find((item: any) => matchName(item.project));
      const accepted = !!(receipt || notification || execution);
      return {
        agent: order.project,
        role: order.role,
        objective: order.objective,
        status: accepted ? "accepted" : workOrderPreview?.requires_confirmation ? "waiting_confirmation" : "waiting_ack",
        detail: accepted ? "已看到执行、结果说明或通知证据" : "等待执行成员接单确认",
      };
  }).slice(0, 10);
  const heartbeat = uniqueStrings([
    ...executions.map((item: any) => `${item.project || "Agent"}：${item.state || "pending"}`),
    ...notifications.map((item: any) => `${item.task_id || item.agent || "Agent"}：${item.status || "unknown"}${item.summary ? ` · ${item.summary}` : ""}`),
  ]).slice(0, 10).map((item: string, index: number) => ({ id: `heartbeat_${index + 1}`, text: compactMemoryText(item, 180) }));
  const contractSync = extractContractSyncHints(task, summary);
  const computedAckReview = buildAckPreflightReview(task, receipts, orders);
  const providedAckReview = summary.ack_review || summary.ackReview || null;
  const mergedAckRows = Array.isArray(providedAckReview?.rows)
    ? providedAckReview.rows.map((row: any) => {
        const agent = String(row?.agent || row?.project || "").toLowerCase();
        const computedRow: any = computedAckReview.rows?.find((item: any) => String(item?.agent || item?.project || "").toLowerCase() === agent) || {};
        return {
          ...computedRow,
          ...row,
          planned_scope: Array.isArray(row?.planned_scope) || Array.isArray(row?.plannedScope)
            ? (row.planned_scope || row.plannedScope)
            : computedRow.planned_scope,
          forbidden_scope: Array.isArray(row?.forbidden_scope) || Array.isArray(row?.forbiddenScope)
            ? (row.forbidden_scope || row.forbiddenScope)
            : computedRow.forbidden_scope,
          verification_plan: Array.isArray(row?.verification_plan) || Array.isArray(row?.verificationPlan)
            ? (row.verification_plan || row.verificationPlan)
            : computedRow.verification_plan,
          unclear: Array.isArray(row?.unclear) ? row.unclear : computedRow.unclear,
        };
      })
    : [];
  const ackReview = Array.isArray(providedAckReview?.rows) && providedAckReview.rows.length
    ? {
        ...computedAckReview,
        ...providedAckReview,
        rows: mergedAckRows,
        rejected: Array.isArray(providedAckReview.rejected)
          ? providedAckReview.rejected
          : mergedAckRows.filter((row: any) => ["missing", "needs_rewrite", "weak"].includes(String(row?.status || ""))),
      }
    : computedAckReview;
  const childPlanReview = buildChildAgentPlanReviewSummary(ackReview, orders);
  const contractTransfer = buildContractTransferPlan(contractSync, orders);
  const contractInjectionGate = evaluateContractInjectionGate(contractTransfer.rows || [], Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], receipts);
  const targetedRework = buildTargetedReworkSuggestions(task, summary, acceptanceReview, receiptRows);
  if (ackReview.rejected?.length) {
    for (const row of ackReview.rejected.slice(0, 4)) {
      targetedRework.push({ id: "ack_rewrite", title: "要求重写接单 ACK", target: row.agent || "", reason: row.reason || "ACK 不完整", action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "要求重写 ACK" });
    }
  }
  if (contractTransfer.status === "needs_contract_changes" || contractTransfer.status === "needs_target") {
    targetedRework.push({ id: "contract_sync", title: "同步结构化契约", target: "", reason: contractTransfer.next_action, action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "同步契约" });
  }
  if (contractInjectionGate.required && !contractInjectionGate.pass) {
    for (const row of contractInjectionGate.missing.slice(0, 4)) {
      targetedRework.push({
        id: "contract_inject",
        title: "注入契约给依赖 Agent",
        target: row.target,
        reason: `${row.endpoint || row.type || "contract"}：${row.summary || "结构化契约变化需要同步"}`,
        action: "gap_continue",
        kind: "targeted_rework",
        tone: "warning",
        label: "注入契约",
      });
    }
    for (const row of contractInjectionGate.unconsumed.slice(0, 4)) {
      targetedRework.push({
        id: "contract_consume",
        title: "补充契约消费结果说明",
        target: row.target,
        reason: `${row.endpoint || row.type || "contract"}：结果说明必须引用 injection_id=${row.injection_id}`,
        action: "gap_continue",
        kind: "targeted_rework",
        tone: "warning",
        label: "补消费说明",
      });
    }
  }
  const coordinationEvents = buildCoordinationEventStream(task, {
    ...summary,
    global_memory_receipt_gates: globalMemoryReceiptGates,
    global_memory_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_gate?.required)
      .map((row: any) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
    global_memory_health_gates: globalMemoryHealthGates,
    global_memory_health_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_health_gate?.required)
      .map((row: any) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
    read_plan_revalidation_gates: readPlanRevalidationGates,
    read_plan_revalidation_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.read_plan_revalidation_gate?.required)
      .map((row: any) => ({ ...row, read_plan_revalidation_gate: row.quality.read_plan_revalidation_gate })),
    api_microcompact_edit_plans: apiMicrocompactEditPlans,
    api_microcompact_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.api_microcompact?.required)
      .map((row: any) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
  }, executions, ackReview, contractTransfer, receiptRows, targetedRework);
  const weakReceipts = receiptRows.filter((row: any) => row.quality.grade !== "good");
  const healthScoreParts = [
    handoff.length ? Math.round((handoff.filter((item: any) => item.status === "accepted").length / handoff.length) * 100) : 100,
    receiptRows.length ? Math.round(receiptRows.reduce((sum: number, row: any) => sum + row.quality.score, 0) / receiptRows.length) : (orders.length ? 40 : 100),
    contractSync.status === "needs_sync" ? 50 : 100,
    memoryGateSummary.required && !memoryGateSummary.pass ? 50 : 100,
    globalMemoryReceiptSummary.required && !globalMemoryReceiptSummary.pass ? 50 : 100,
    globalMemoryHealthGateSummary.required && !globalMemoryHealthGateSummary.pass ? 50 : 100,
    readPlanRevalidationGateSummary.required && !readPlanRevalidationGateSummary.pass ? 50 : 100,
    reinjectionGateSummary.required && !reinjectionGateSummary.pass ? 50 : 100,
    apiMicrocompactSummary.required && !apiMicrocompactSummary.pass ? 50 : 100,
    targetedRework.length ? 60 : 100,
  ];
  const health = Math.round(healthScoreParts.reduce((sum, value) => sum + value, 0) / healthScoreParts.length);
  const runtimeKernel = summary.runtime_kernel || buildRuntimeKernelSnapshot(task, {
    ...summary,
    global_memory_receipt_gates: globalMemoryReceiptGates,
    global_memory_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_gate?.required)
      .map((row: any) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
    global_memory_health_gates: globalMemoryHealthGates,
    global_memory_health_gate_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.global_memory_health_gate?.required)
      .map((row: any) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
    api_microcompact_edit_plans: apiMicrocompactEditPlans,
    api_microcompact_receipt_rows: receiptRows
      .filter((row: any) => row.quality?.api_microcompact?.required)
      .map((row: any) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
  });
  return {
    version: 1,
    source: "main-child-agent-coordination-6.0",
    title: "主 Agent ↔ 子 Agent 协作",
    health,
    status: health >= 85 ? "healthy" : health >= 60 ? "needs_attention" : "blocked",
    ack_review: ackReview,
    child_plan_review: childPlanReview,
    handoff,
    heartbeat,
    contract_sync: contractSync,
    contract_transfer: contractTransfer,
    contract_injection_gate: contractInjectionGate,
    memory_gate_summary: memoryGateSummary,
    global_memory_receipt_summary: globalMemoryReceiptSummary,
    global_memory_health_gate_summary: globalMemoryHealthGateSummary,
    read_plan_revalidation_gate_summary: readPlanRevalidationGateSummary,
    post_compact_reinjection_gate_summary: reinjectionGateSummary,
    api_microcompact_receipt_summary: apiMicrocompactSummary,
    post_compact_dispatch_marker_summary: postCompactDispatchMarkerSummary,
    runtime_kernel: runtimeKernel,
    coordination_events: coordinationEvents,
    receipt_quality: receiptRows,
    weak_receipts: weakReceipts,
    targeted_rework: targetedRework,
    next_action: targetedRework.length
      ? "按缺口精准返工，不整轮重跑"
      : weakReceipts.length
        ? "要求子 Agent 补充更完整结果说明"
        : contractSync.status === "needs_sync"
          ? "同步跨 Agent 接口/字段契约"
          : "继续跟踪执行和验收",
  };
}
