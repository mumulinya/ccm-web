// Behavior-freeze split from collaboration-runtime-status-helpers.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 2/9).
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
  extractActionableMentions,
  groupSessionIdForTask,
  isActionableMentionText,
  normalizeMentionTask,
  normalizePlanAssignments,
} from "./collaboration-runtime-task-queue";

import {
  getTaskAgentQaGate,
  taskRequiresAgentQa,
} from "./collaboration-runtime-daily-dev";

import {
  isCoordinatorTestAgentName,
} from "./collaboration-runtime-cross-agent-runtime";

import {
  getWorkDirState,
} from "./collaboration-runtime-plan-tools";

import {
  buildProjectVerificationHints,
  getConfiguredProjectVerificationCommands,
} from "./collaboration-runtime-runtime-tools";

import {
  TaskExecutionStatus,
  buildTaskExecutionResult,
  collectTaskActualFileChanges,
  getRequiredVerificationCoverage,
  getVerificationEvidenceGate,
  parseFormattedReceiptsFromText,
  receiptHasOpenNeeds,
  splitEvidenceList,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers-part-01";

export function independentReviewVerdictState(value: any) {
  const text = String(value || "").trim();
  if (!text) return "unknown";
  const normalized = text.toLowerCase();
  const riskText = normalized
    .replace(/未发现.{0,20}(?:阻塞|问题|风险|缺陷)/g, "")
    .replace(/无.{0,12}(?:阻塞|问题|风险|缺陷)/g, "")
    .replace(/\bno\s+(?:blocking\s+)?(?:blockers?|issues?|risks?|critical\s+issues?)\b/g, "")
    .replace(/\bwithout\s+(?:blocking\s+)?(?:blockers?|issues?|risks?)\b/g, "");
  if (/needs?[_\s-]*recheck|recheck|需复验|重新复验|重新验证|复核.{0,18}(?:未闭环|没有闭环)|证据.{0,18}(?:未闭环|没有闭环)/.test(normalized)) return "needs_recheck";
  if (/needs?[_\s-]*environment|补齐环境|补充环境|环境.{0,18}(?:阻塞|不足|缺失)|登录条件.{0,18}(?:阻塞|不足|缺失)|运行条件.{0,18}(?:阻塞|不足|缺失)/.test(normalized)) return "needs_environment";
  if (/needs?[_\s-]*(?:human|user)|需要人工确认|等待用户确认|等你确认|待确认/.test(normalized)) return "needs_user";
  if (/fail|failed|reject|rejected|block|blocked|问题|风险未解决|不通过|未通过|拒绝|阻塞/.test(riskText)) return "failed";
  if (/pass|passed|approve|approved|lgtm|ok|success|通过|批准|已复核|无阻塞|无高风险/.test(normalized)) return "passed";
  return "unknown";
}

function normalizeIndependentReviewEntry(raw: any, fallback: any = {}) {
  const item = typeof raw === "string" ? { summary: raw } : raw;
  if (!item || typeof item !== "object") return null;
  const verdict = String(item.verdict || item.status || item.result || fallback.verdict || "").trim();
  const summary = String(item.summary || item.note || item.comment || item.message || fallback.summary || "").trim();
  const evidence = uniqueStrings(item.evidence, item.checks, item.findings, item.filesReviewed, item.files_reviewed, fallback.evidence).slice(0, 12);
  const reviewer = String(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || fallback.reviewer || "").trim();
  const requester = String(item.requester || item.from_agent || fallback.requester || "").trim();
  const reviewSubject = String(item.reviewSubject || item.review_subject || item.subject || fallback.reviewSubject || fallback.review_subject || "").trim();
  if (!reviewer && !verdict && !summary && evidence.length === 0) return null;
  const state = independentReviewVerdictState([verdict, summary, ...evidence].join("\n"));
  return {
    reviewer,
    requester,
    reviewSubject,
    verdict: verdict || state,
    status: state,
    summary: compactMemoryText(summary || evidence.join("；") || "独立复核已记录", 700),
    evidence,
    source: fallback.source || "receipt",
    qa_id: fallback.qa_id || "",
  };
}

export function parseIndependentReviewLine(value: any) {
  const text = String(value || "").trim();
  if (!text || ["无", "暂无", "未提供", "未填写"].includes(text)) return [];
  return splitEvidenceList(text).map((item: string) => {
    const parts = item.split(/\s+-\s+/).map(part => part.trim()).filter(Boolean);
    const subjectPart = parts.find(part => /^(?:复核对象|reviewSubject|review_subject|subject)\s*[:=：]\s*/i.test(part)) || "";
    const reviewSubject = subjectPart.replace(/^(?:复核对象|reviewSubject|review_subject|subject)\s*[:=：]\s*/i, "").trim();
    const summaryParts = parts.slice(2).filter(part => part !== subjectPart);
    return normalizeIndependentReviewEntry({
      reviewer: parts[0] || "",
      verdict: parts[1] || "",
      reviewSubject,
      summary: summaryParts.join(" - ") || item,
    });
  }).filter(Boolean);
}

export function collectIndependentReviewEvidence(receipts: any[] = [], agentQa: any[] = []) {
  const evidence: any[] = [];
  for (const receipt of receipts || []) {
    const reviewItems = [
      ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview : []),
      ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review : []),
      ...(Array.isArray(receipt?.codeReview) ? receipt.codeReview : []),
      ...(Array.isArray(receipt?.code_review) ? receipt.code_review : []),
    ];
    for (const review of reviewItems) {
      const normalized = normalizeIndependentReviewEntry(review, {
        source: "receipt_independent_review",
        reviewer: review?.reviewer || receipt?.reviewer || receipt?.agent || "",
        requester: receipt?.agent || "",
        reviewSubject: review?.reviewSubject || review?.review_subject || receipt?.reviewSubject || receipt?.review_subject || "",
      });
      if (normalized) evidence.push(normalized);
    }
    if (reviewItems.length === 0 && /review|verifier|verification|qa|tester|审查|复核|验证/i.test(String(receipt?.role || ""))) {
      const normalized = normalizeIndependentReviewEntry({
        reviewer: receipt?.reviewer || receipt?.agent,
        verdict: receipt?.status === "done" ? "passed" : receipt?.status,
        summary: receipt?.summary,
        evidence: uniqueStrings(receipt?.actions, receipt?.verification, receipt?.filesChanged),
      }, { source: "reviewer_receipt", requester: receipt?.target || "" });
      if (normalized) evidence.push(normalized);
    }
  }
  for (const qa of agentQa || []) {
    if (String(qa?.type || "") !== "request_review") continue;
    const accepted = qa?.acceptance?.accepted === true;
    const resumed = qa?.status === "resumed" || !!qa?.resumed_at || qa?.status === "injected" || qa?.status === "answered";
    const normalized = normalizeIndependentReviewEntry({
      reviewer: qa?.to_agent,
      verdict: accepted && resumed ? "passed" : qa?.status || "pending",
      summary: qa?.answer || qa?.acceptance?.reason || qa?.question,
      evidence: qa?.answer_evidence || qa?.evidence || [],
    }, {
      source: "agent_qa_request_review",
      requester: qa?.from_agent,
      qa_id: qa?.id || "",
    });
    if (normalized) evidence.push(normalized);
  }
  const latestReviewKeys = new Set<string>();
  const exactKeys = new Set<string>();
  const latestEvidence: any[] = [];
  for (const item of [...evidence].reverse()) {
    const reviewer = String(item?.reviewer || "").trim().toLowerCase();
    const subject = String(item?.reviewSubject || "").trim().toLowerCase();
    const reviewKey = reviewer && subject ? `${reviewer}|${subject}` : "";
    if (reviewKey) {
      if (latestReviewKeys.has(reviewKey)) continue;
      latestReviewKeys.add(reviewKey);
    } else {
      const exactKey = `${item.source}|${item.reviewer}|${item.requester}|${item.verdict}|${item.summary}`;
      if (exactKeys.has(exactKey)) continue;
      exactKeys.add(exactKey);
    }
    latestEvidence.push(item);
  }
  return latestEvidence.reverse().slice(0, 20);
}

export function buildIndependentReviewGate(task: any, actualFileChanges: any[] = [], receipts: any[] = [], agentQa: any[] = []) {
  return require("./collaboration-acceptance").buildIndependentReviewGate(task, actualFileChanges, receipts, agentQa);
}

export function buildAcceptanceGate(task: any, execution: any, summary: any, finalStatus: string) {
  return require("./collaboration-acceptance").buildAcceptanceGate(task, execution, summary, finalStatus);
}
export function taskRequiresCodeChanges(task: any) {
  if (task?.requires_code_changes === false || task?.requiresCodeChanges === false) return false;
  return task?.workflow_type === "daily_dev";
}

export function selectLatestDurableReceipts(receiptCandidates: any[] = []) {
  return require("./collaboration-acceptance").selectLatestDurableReceipts(receiptCandidates);
}

export function buildDeliverySummary(task: any, execution: any, finalStatus: string) {
  return require("./collaboration-acceptance").buildDeliverySummary(task, execution, finalStatus);
}

export function getTaskExecutionFromReceipt(response: string, receipt: any, details: any = {}) {
  return require("./collaboration-acceptance").getTaskExecutionFromReceipt(response, receipt, details);
}

export function getGroupTaskExecutionStatus(review: any, coordinatorResult: any, outputText: string, task: any = null) {
  const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
  const action = String(dispatchPolicy.action || "");
  const runtime = String(coordinatorResult?.runtime || "");
  const isDailyDev = task?.workflow_type === "daily_dev";
  const receipts = parseFormattedReceiptsFromText(outputText);
  const childReceipts = receipts.filter((receipt: any) => receipt.agent && receipt.agent !== coordinatorResult?.agent);
  const workerNotifications = parseTaskNotificationsFromText(outputText);
  const verificationGate = getVerificationEvidenceGate(childReceipts);
  const requiredVerificationCoverage = getRequiredVerificationCoverage(childReceipts);
  const actualChangesForTask = isDailyDev ? collectTaskActualFileChanges(task, {}) : [];
  const coordinatorEvidence = {
    assignments: normalizePlanAssignments(Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : []),
    coordinationPlan: coordinatorResult?.coordinationPlan || null,
    dispatchPolicy,
    executionOrder: coordinatorResult?.executionOrder || "parallel",
    coordinatorRuntime: runtime,
    coordinatorAgent: coordinatorResult?.agent || "",
  };
  const childAgents = uniqueStrings(childReceipts.map((receipt: any) => receipt.agent));
  const assignedProjects = new Set(coordinatorEvidence.assignments.map((item: any) => String(item.project || item.targetName || "").trim()).filter(Boolean));
  const notifiedProjects = new Set(workerNotifications.map((item: any) => String(item.task_id || "").trim()).filter(Boolean));
  const coordinationPlan = coordinatorEvidence.coordinationPlan || {};
  const hasCoordinationPlan = !!coordinationPlan && (
    Array.isArray(coordinationPlan.phases) && coordinationPlan.phases.length > 0
    || Array.isArray(coordinationPlan.targets) && coordinationPlan.targets.length > 0
    || String(coordinationPlan.strategy || "").trim()
  );
  const missingAssignedProjects = childAgents.filter((agent: string) => !isCoordinatorTestAgentName(agent) && !assignedProjects.has(agent));
  const missingWorkerNotifications = childAgents.filter((agent: string) => !notifiedProjects.has(agent));
  const buildGroupResult = (status: TaskExecutionStatus, details: any = {}) => buildTaskExecutionResult(status, outputText, {
    ...coordinatorEvidence,
    ...details,
  });

  if (/llm-error|llm-not-configured/.test(runtime) || checkTaskFailure(outputText)) {
    return buildGroupResult("failed", {
      review,
      detail: runtime ? `主 Agent 运行失败：${runtime}` : "协作输出包含失败标记",
    });
  }

  const hasExecutedDailyDevWorkers = isDailyDev && childReceipts.length > 0;
  if ((dispatchPolicy.requiresConfirmation || action === "ask_user" || action === "hold") && !hasExecutedDailyDevWorkers) {
    return buildGroupResult("waiting", {
      review,
      detail: dispatchPolicy.reason || "主 Agent 需要用户确认后继续",
    });
  }

  if (isDailyDev && childReceipts.length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少子 Agent 结果说明，不能判定完成；主 Agent 需要派发至少一个项目 Agent 执行代码工作或明确等待用户调整范围",
    });
  }

  if (isDailyDev && childReceipts.some((receipt: any) => receipt.status !== "done")) {
    const failed = childReceipts
      .filter((receipt: any) => receipt.status === "failed")
      .map((receipt: any) => `${receipt.agent}:${receipt.summary || receipt.blockers?.join("；") || "failed"}`)
      .join("；");
    if (failed) {
      return buildGroupResult("failed", {
        review,
        detail: `业务开发任务子 Agent 执行失败：${failed}`,
      });
    }
    const pending = childReceipts
      .filter((receipt: any) => receipt.status !== "done")
      .map((receipt: any) => `${receipt.agent}:${receipt.status}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务仍有子 Agent 未完成：${pending}`,
    });
  }

  const doneReceiptsWithOpenNeeds = childReceipts.filter((receipt: any) => receipt.status === "done" && receiptHasOpenNeeds(receipt, task));
  if (isDailyDev && doneReceiptsWithOpenNeeds.length > 0) {
    const open = doneReceiptsWithOpenNeeds
      .map((receipt: any) => `${receipt.agent}:${[...(splitEvidenceList(receipt.blockers || [])), ...(splitEvidenceList(receipt.needs || []))].join("；")}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务子 Agent 结果说明仍有未解决阻塞/需要补充：${open}`,
    });
  }

  if (isDailyDev && taskRequiresAgentQa(task)) {
    const qaGate = getTaskAgentQaGate(task);
    if (!qaGate.pass) {
      return buildGroupResult("waiting", {
        review,
        detail: `任务明确要求 Agent 协作问答，但证据不足：问答 ${qaGate.total}，已采纳 ${qaGate.accepted}，已唤醒续跑 ${qaGate.resumed}。主 Agent 必须让相关子 Agent 通过 ask_agent 提问、采纳带证据回答并恢复原任务会话后再验收。`,
        agentQaGate: qaGate,
      });
    }
  }

  if (isDailyDev && !hasCoordinationPlan) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
    });
  }

  if (isDailyDev && coordinatorEvidence.assignments.length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少主 Agent 派发子 Agent 的 assignment evidence，不能判定完成",
    });
  }

  if (isDailyDev && missingAssignedProjects.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少目标子 Agent 的派发证据：${missingAssignedProjects.join("、")}`,
    });
  }

  if (isDailyDev && missingWorkerNotifications.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少目标子 Agent 的 task-notification：${missingWorkerNotifications.join("、")}`,
    });
  }

  if (isDailyDev && !review) {
    return buildGroupResult("waiting", {
      detail: "业务开发任务缺少主 Agent 最终复盘，不能判定完成",
    });
  }

  if (isDailyDev && taskRequiresCodeChanges(task) && actualChangesForTask.length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少系统实际捕获的代码变更，不能判定完成；请让子 Agent 执行代码修改，或在创建任务时关闭代码变更要求",
    });
  }

  if (isDailyDev && taskRequiresVerification(task) && !verificationGate.pass) {
    const failed = verificationGate.failed.length ? `失败验证：${verificationGate.failed.join("；")}` : "";
    const suggested = verificationGate.suggested.length ? `仅建议/未执行验证：${verificationGate.suggested.join("；")}` : "";
    return buildGroupResult("waiting", {
      review,
      detail: ["业务开发任务缺少可验收的已执行验证记录，不能判定完成", failed, suggested].filter(Boolean).join("；"),
    });
  }

  if (isDailyDev && taskRequiresVerification(task) && !requiredVerificationCoverage.pass) {
    const missing = requiredVerificationCoverage.missing
      .map((item: any) => `${item.agent}: ${item.required.join(" / ")}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少项目配置验证命令的执行证据，不能判定完成；缺失：${missing}`,
    });
  }

  if (isDailyDev) {
    const agentQaForTask = task?.group_id
      ? getAgentQaItemsForGroup(String(task.group_id), 120).filter((item: any) => !task?.id || !item.task_id || item.task_id === task.id)
      : [];
    const independentReviewGate = buildIndependentReviewGate(task, actualChangesForTask, childReceipts, agentQaForTask);
    if (independentReviewGate.required && !independentReviewGate.pass) {
      return buildGroupResult("waiting", {
        review,
        detail: `复杂代码变更还缺少独立复核，不能判定完成；原因：${independentReviewGate.reason}`,
        independentReviewGate,
      });
    }
    const postReviewSpotCheckGate = buildPostReviewSpotCheckGate({
      required: independentReviewGate.required && independentReviewGate.pass,
      receipts: childReceipts,
    });
    if (postReviewSpotCheckGate.required && !postReviewSpotCheckGate.pass) {
      return buildGroupResult("waiting", {
        review,
        detail: `TestAgent 已通过，但主 Agent 的完成前抽查尚未通过；原因：${postReviewSpotCheckGate.reason}`,
        independentReviewGate,
        postReviewSpotCheckGate,
      });
    }
  }

  if (review) {
    const status = String(review.status || "");
    if (status === "complete") {
      return buildGroupResult("done", { review, detail: "主 Agent 复盘判定完成" });
    }
    if (status === "needs_user" || status === "needs_followup") {
      return buildGroupResult("waiting", { review, detail: status === "needs_user" ? "主 Agent 需要用户补充" : "主 Agent 仍发现返工项" });
    }
  }

  if (Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "已派发子 Agent，但缺少最终复盘完成证据",
    });
  }

  return buildGroupResult("done", {
    review,
    detail: "我已直接处理且未产生子任务",
  });
}
