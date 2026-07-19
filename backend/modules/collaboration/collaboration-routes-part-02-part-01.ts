// Behavior-freeze split from collaboration-routes-part-02.ts (part 1/2).

// Behavior-freeze split from collaboration-routes.ts (part 2/4).
// Extracted functional module. The original entry remains a compatibility facade.

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

import { decomposeRequirementToTaskPlan, ingestRequirementSources, requirementToIntakeDraft } from "../requirements/source-ingestion";
import { runRequirementEpicSelfTest } from "../requirements/requirement-epic-self-tests";
import { startGlobalMissionSupervisor } from "../../agents/global/mission-supervisor";

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
  CollabCtx,
  TASK_WATCHDOG_STALE_MS,
  appendLegacyCodeReviewGroupReport,
  appendLegacyTaskExecutionGroupReport,
  appendMainAgentDecisionTrace,
  applyMainAgentDecisionPetState,
  applyRuntimeMonitorControl,
  archiveTask,
  assertRuntimeToolDispatchReady,
  buildAcceptedPlanModeDraft,
  buildAgentQaProtocolInstructions,
  buildAgentToolContext,
  buildChildAgentDevelopmentContract,
  buildChildAgentTaskText,
  buildChildAgentWorkerHandoff,
  buildCoordinatorSharedFilesContext,
  buildDailyDevAgentDiagnostics,
  buildDailyDevWorkflowRehearsal,
  buildDeliverySummary,
  buildExecutionDashboard,
  buildGroupPlanModePreflight,
  buildGroupProjectAnalysisContext,
  buildInlineTaskRuntime,
  buildProjectVerificationHints,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskEntityChain,
  buildTaskGapContinuationDraft,
  buildWorkerContinuationHandoff,
  buildWorkflowMeta,
  claimTaskWorkItemForAgent,
  classifyGroupProjectTaskIntentWithAgent,
  classifyTaskContinuation,
  cleanupRuntimeDebt,
  compactFormText,
  continueTaskWithMessage,
  createDailyDevSmokeTask,
  createRequirementEpicWithChildren,
  createTask,
  enqueueTask,
  extractActionableMentions,
  getCoordinatorActionMentions,
  getDailyDevSmokeStatus,
  getGroupMainAgentActionRegistry,
  getInitialWorkflowMeta,
  getProjectExtraConfig,
  getQueueStatus,
  getTaskById,
  getTaskExecutionFromReceipt,
  getTaskPlanMode,
  getTaskWatchdogStatus,
  getTaskWorkItems,
  handleAgentQaRequests,
  looksLikeTaskContinuation,
  normalizePlanAssignments,
  persistTaskWorkItems,
  prepareAgentRuntimeTools,
  processCrossAgents,
  purgeArchivedTask,
  reconcileTaskDeliveryEvidence,
  removeTaskFromQueues,
  restoreArchivedTask,
  resumeAgentQaFromStoredContinuation,
  resumeTaskQueues,
  retryAgentQaItem,
  retryRuntimeFailedTasks,
  retryTask,
  runAgentCliProbe,
  runAgentCliProbeBatch,
  runAgentRecoveryMonitorOnce,
  runCoordinatorReviewLoop,
  runGroupMainAgentActionRegistrySelfTest,
  runGroupMainAgentToolLoopSelfTest,
  runRuntimeFallbackProbe,
  runTaskWatchdog,
  runningTaskIds,
  runtimeToolDispatchBlockedReceipt,
  runtimeToolSnapshotFromAudit,
  shouldCreatePersistentGroupTask,
  shouldUseProjectAnalysisMode,
  splitUserAcceptanceText,
  switchTaskExecutor,
  taskAgentInvocationMemoryOptions,
  taskAgentSessionLifecycleRunnerOptions,
  taskQueues,
  uniqueStrings,
  updateGroupTaskInlineStatus,
  updateRequirementEpicFromPlan,
  updateTask,
  validateDailyDevGroupReady,
  validateTaskManualStatusUpdate,
  writeSse,
} from "./collaboration";

export function handleCollaborationApiIntakeRoutesPartA(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
    const handleIntakePreview = async (payload: any, files: any[] = []) => {
      try {
        const userRequirement = compactFormText(payload.requirement || payload.goal || payload.message, "");
        const groups = loadGroups();
        const configs = getConfigs();
        const availableTargets = [
          ...groups.map((group: any) => ({
            type: "group",
            id: group.id,
            name: group.name || group.id,
            capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
          })),
          ...configs.map((config: any) => ({ type: "project", id: config.name, name: config.name })),
        ];
        const sourceIngestion = await ingestRequirementSources({
          files,
          userText: userRequirement,
          extractRequirement: true,
          decomposeRequirement: true,
          availableTargets,
        });
        const extractedRequirement = sourceIngestion.requirement;
        const requirement = compactFormText(extractedRequirement?.business_goal || userRequirement, "");
        if (!requirement && sourceIngestion.sources.length === 0) return sendJson(res, { error: "请先说说你想完成什么，或者上传需求资料" }, 400);
        const group = groups.find((item: any) => item.id === (payload.group_id || payload.groupId)) || null;
        const requestedProject = compactFormText(payload.target_project || payload.targetProject, "");
        const coordinator = group?.members?.find((member: any) => member.role === "coordinator")?.project || group?.members?.[0]?.project || "";
        const targetProject = requestedProject || coordinator || configs[0]?.name || "";
        if (!targetProject && !group) return sendJson(res, { error: "还没有可执行项目，请先添加项目或开发群聊" }, 409);
        const lower = `${requirement}\n${sourceIngestion.source_documents}`.toLowerCase();
        const areas = [
          /(页面|前端|ui|组件|样式)/i.test(lower) ? "前端页面与交互" : "",
          /(接口|后端|服务|数据库|api)/i.test(lower) ? "后端接口与数据" : "",
          /(测试|修复|bug|报错)/i.test(lower) ? "测试与回归验证" : "",
        ].filter(Boolean);
        if (!areas.length) areas.push(group ? "群聊内相关项目" : "目标项目");
        const acceptanceFallback = compactFormText(payload.acceptance_criteria || payload.acceptanceCriteria, "") || [
          "目标功能按描述完成，并覆盖主要正常流程",
          "相关项目通过现有构建或测试命令",
          "交付报告列出实际修改文件、验证结果和剩余风险",
        ].join("；");
        const fallbackRisks = [
          group ? "多个项目之间的接口或数据契约需要保持一致" : "实现范围可能需要根据现有代码进一步收敛",
          "涉及既有行为时需要回归验证，避免影响当前功能",
        ];
        const extractedAcceptance = extractedRequirement?.acceptance_criteria || [];
        const acceptance = extractedAcceptance.length ? extractedAcceptance.join("；") : acceptanceFallback;
        const title = compactFormText(payload.title, "") || extractedRequirement?.title || requirement.replace(/\s+/g, " ").slice(0, 48) || "处理提交的需求资料";
        const intakeDraft = {
          ...requirementToIntakeDraft(extractedRequirement, {
            requirement,
            scope: areas,
            acceptance: acceptance.split("；").filter(Boolean),
            risks: fallbackRisks,
          }),
          project: targetProject,
          group_id: group?.id || "",
          group_name: group?.name || "",
          source_summary: sourceIngestion.user_summary,
          source_ingestion: sourceIngestion.technical,
          decomposition_plan: sourceIngestion.decomposition,
          requirement_content_hash: sourceIngestion.content_hash,
        };
        const sourceDocuments = [
          userRequirement ? `用户输入：\n${userRequirement}` : "",
          sourceIngestion.source_documents,
          extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
        ].filter(Boolean).join("\n\n");
        const task = createTask({
          title,
          description: requirement,
          business_goal: requirement,
          acceptance_criteria: acceptance,
          source_documents: sourceDocuments,
          source_attachments: sourceIngestion.attachments,
          requirement_extraction: extractedRequirement,
          requirement_decomposition: sourceIngestion.decomposition,
          decomposition_plan: sourceIngestion.decomposition,
          requirement_content_hash: sourceIngestion.content_hash,
          source_ingestion: sourceIngestion.technical,
          target_project: targetProject,
          group_id: group?.id || null,
          assign_type: group ? "group" : "project",
          workflow_type: "requirement_epic",
          requires_code_changes: payload.requires_code_changes !== false,
          requires_verification: true,
          auto_execute: false,
          intake_state: "awaiting_confirmation",
          intake_draft: intakeDraft,
          workflow_meta: {
            intake: {
              source: "usability-intake",
              channel: payload.channel || "web",
              client_message_id: payload.client_message_id || payload.clientMessageId || "",
              source_ingestion: sourceIngestion.technical,
            },
            requirement_epic: {
              version_of_epic_id: payload.epic_id || payload.epicId || "",
              content_hash: sourceIngestion.content_hash,
            },
          },
          trace_id: payload.trace_id || payload.traceId,
          idempotency_key: payload.idempotency_key || payload.idempotencyKey || `requirement-epic-preview:${payload.client_message_id || payload.clientMessageId || sourceIngestion.content_hash}`,
        });
        const updated = updateTask(task.id, { status: "pending", auto_execute: false, intake_state: "awaiting_confirmation", intake_draft: intakeDraft, status_detail: "执行计划已准备好，等待你确认" }) || task;
        appendTraceEvent(updated.trace_id, { type: "intake.previewed", status: "ok", task_id: updated.id, group_id: updated.group_id || "", agent: targetProject, message: "已生成执行前确认卡，尚未开始执行", data: intakeDraft });
        appendTaskTimelineEvent(updated.id, {
          type: "requirement_sources_ingested",
          title: "需求资料已读取",
          detail: sourceIngestion.user_summary || "已根据用户文字整理需求",
          status: sourceIngestion.warnings.length ? "warning" : "completed",
          data: sourceIngestion.technical,
        });
        sendJson(res, { success: true, task: updated, confirmation: intakeDraft, source_ingestion: sourceIngestion.technical, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        return handleIntakePreview(fields || {}, files || []);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { handleIntakePreview(body ? JSON.parse(body) : {}); }
      catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/usability/intake/confirm" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const acceptFeedback = compactFormText(payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (current.intake_state === "confirmed") return sendJson(res, { success: true, duplicate: true, task: current, trace_id: current.trace_id });
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效" }, 409);
        const confirmedAt = new Date().toISOString();
        if (current.workflow_type === "requirement_epic" && (current.decomposition_plan || current.requirement_decomposition)) {
          const versionOfEpicId = String(current.workflow_meta?.requirement_epic?.version_of_epic_id || "").trim();
          if (versionOfEpicId) {
            const versionResult = updateRequirementEpicFromPlan({
              epic_id: versionOfEpicId,
              decomposition_plan: current.decomposition_plan || current.requirement_decomposition,
              requirement_extraction: current.requirement_extraction,
              requirement_content_hash: current.requirement_content_hash,
              source_documents: current.source_documents,
              source_attachments: current.source_attachments,
              source_ingestion: current.source_ingestion,
              confirmed: true,
              auto_execute: true,
              owner_agent: current.target_project || "global-agent",
            });
            const supervisor = startGlobalMissionSupervisor({
              mission_id: versionResult.epic.id,
              trace_id: versionResult.epic.trace_id,
              session_id: versionResult.epic.group_session_id || versionResult.epic.group_id || "web",
              source: current.workflow_meta?.intake?.source || "requirement-epic-version",
              business_goal: versionResult.epic.business_goal,
              acceptance: versionResult.epic.acceptance_criteria,
              max_attempts: 3,
              restart: true,
            });
            updateTask(current.id, {
              status: "cancelled",
              intake_state: "superseded",
              status_detail: `该确认卡已应用到需求 Epic ${versionOfEpicId} 的新版本`,
              superseded_by_task_id: versionOfEpicId,
            });
            const queueResults = (versionResult.children || [])
              .filter((child: any) => child.status === "pending" && (!child.mission_dependencies || child.mission_dependencies.length === 0))
              .map((child: any) => ({ task_id: child.id, ...enqueueTask(child.id, ctx) }));
            return sendJson(res, {
              success: true,
              task: versionResult.epic,
              epic: versionResult.epic,
              children: versionResult.children,
              retired_children: versionResult.retired_children,
              diff: versionResult.diff,
              queue_results: queueResults,
              supervisor,
              trace_id: versionResult.epic.trace_id,
              same_task_trace: true,
            });
          }
          const epicResult = createRequirementEpicWithChildren({
            draft_task_id: current.id,
            decomposition_plan: current.decomposition_plan || current.requirement_decomposition,
            requirement_extraction: current.requirement_extraction,
            requirement_content_hash: current.requirement_content_hash,
            source_documents: current.source_documents,
            source_attachments: current.source_attachments,
            source_ingestion: current.source_ingestion,
            group_id: current.group_id,
            group_session_id: current.group_session_id,
            target_project: current.target_project,
            priority: current.priority,
            source: current.workflow_meta?.intake?.source || "usability-intake",
            channel: current.workflow_meta?.intake?.channel || "web",
            conversation_id: current.group_session_id || current.group_id || "global",
            client_message_id: current.workflow_meta?.intake?.client_message_id || current.id,
            trace_id: current.trace_id,
            idempotency_key: current.idempotency_key,
            owner_agent: current.target_project || "global-agent",
            confirmed: true,
            clarifications_resolved: !(current.decomposition_plan || current.requirement_decomposition)?.clarification_questions?.length || !!acceptFeedback,
            auto_execute: true,
            requires_independent_review: true,
          });
          if (!epicResult.success) {
            return sendJson(res, {
              ...epicResult,
              error: epicResult.needs_clarification
                ? "仍有阻断问题，请先在“调整计划”中补充答案后再确认"
                : "请先确认完整的 Epic 任务图",
              trace_id: current.trace_id,
            }, 409);
          }
          const supervisor = startGlobalMissionSupervisor({
            mission_id: epicResult.epic.id,
            global_run_id: current.workflow_meta?.global_run_id || "",
            trace_id: epicResult.epic.trace_id,
            session_id: current.group_session_id || current.group_id || "web",
            source: current.workflow_meta?.intake?.source || "usability-intake",
            business_goal: epicResult.epic.business_goal,
            acceptance: epicResult.epic.acceptance_criteria,
            max_attempts: 3,
          });
          const queueResults = epicResult.children.map((child: any) => {
            if (Array.isArray(child.mission_dependencies) && child.mission_dependencies.length > 0) {
              return { task_id: child.id, queued: false, message: "等待前置子任务通过验收" };
            }
            const result = enqueueTask(child.id, ctx);
            return { task_id: child.id, ...result };
          });
          const updatedEpic = updateTask(epicResult.epic.id, {
            intake_state: "confirmed",
            confirmed_at: confirmedAt,
            status: "in_progress",
            status_detail: `已确认任务图，${queueResults.filter((item: any) => item.queued).length}/${epicResult.children.length} 个子任务已进入队列`,
            plan_accept_feedback: acceptFeedback,
            workflow_meta: {
              ...(epicResult.epic.workflow_meta || {}),
              plan_mode: {
                ...(current.intake_draft || {}),
                requires_confirmation: false,
                accepted_at: confirmedAt,
                accepted_feedback: acceptFeedback,
              },
              requirement_epic: {
                ...((epicResult.epic.workflow_meta || {}).requirement_epic || {}),
                confirmed_at: confirmedAt,
                accepted_feedback: acceptFeedback,
              },
            },
          }) || epicResult.epic;
          updateGroupTaskInlineStatus(updatedEpic, updatedEpic.status, updatedEpic.status_detail);
          return sendJson(res, {
            success: true,
            task: updatedEpic,
            epic: updatedEpic,
            children: epicResult.children,
            queue_results: queueResults,
            supervisor,
            decomposition_plan: epicResult.decomposition_plan,
            trace_id: updatedEpic.trace_id,
            same_task_trace: true,
          });
        }
        const basePlan = getTaskPlanMode(current) || current.intake_draft || {};
        const acceptedPlan = buildAcceptedPlanModeDraft(basePlan, acceptFeedback, confirmedAt);
        const meta = current.workflow_meta || {};
        const acceptanceText = current.acceptance_criteria || current.acceptanceCriteria || "";
        const nextAcceptance = acceptFeedback
          ? uniqueStrings([...splitUserAcceptanceText(acceptanceText), `执行时纳入用户补充要求：${acceptFeedback}`]).join("\n")
          : acceptanceText;
        const nextSourceDocuments = acceptFeedback
          ? [
              current.source_documents || current.sourceDocuments || "",
              `用户确认执行前计划时补充要求（${confirmedAt}）：${acceptFeedback}`,
            ].filter(Boolean).join("\n\n")
          : (current.source_documents || current.sourceDocuments || "");
        const task = updateTask(taskId, {
          intake_state: "confirmed",
          confirmed_at: confirmedAt,
          auto_execute: true,
          status: "pending",
          status_detail: acceptFeedback ? "你已确认执行计划，并补充了执行要求，正在进入执行队列" : "你已确认执行计划，正在进入执行队列",
          intake_draft: acceptedPlan,
          plan_accept_feedback: acceptFeedback,
          last_plan_accept_feedback: acceptFeedback,
          last_plan_accept_feedback_at: acceptFeedback ? confirmedAt : "",
          ...(acceptFeedback ? { acceptance_criteria: nextAcceptance, source_documents: nextSourceDocuments } : {}),
          workflow_meta: {
            ...meta,
            plan_mode: acceptedPlan,
            intake: {
              ...(meta.intake || {}),
              plan_mode: acceptedPlan,
              accepted_feedback: acceptFeedback,
              accepted_at: confirmedAt,
            },
            project_mission: {
              ...(meta.project_mission || {}),
              control_state: "confirmed",
            },
          },
        }) || current;
        appendTraceEvent(task.trace_id, {
          type: "intake.confirmed",
          status: "ok",
          task_id: task.id,
          group_id: task.group_id || "",
          agent: task.target_project || "",
          message: acceptFeedback ? "用户确认执行，并补充执行要求" : "用户确认执行，复用原 Task/Trace 开始工作",
          data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback, accept_feedback: acceptFeedback || undefined },
        });
        appendTaskTimelineEvent(task.id, {
          type: "plan_mode_confirmed",
          title: "用户已确认执行前计划",
          detail: acceptFeedback ? `带着补充要求进入执行队列：${compactMemoryText(acceptFeedback, 180)}` : "复用同一任务和 Trace 进入执行队列",
          status: "ok",
          phase: "queued",
          agent: task.target_project || "",
          data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback },
        });
        if (acceptFeedback) addTaskLog(task.id, "info", `确认执行前计划时补充要求：${acceptFeedback}`);
        const queueResult = enqueueTask(task.id, ctx);
        const updated = updateTask(task.id, {
          status_detail: queueResult.message || "已进入执行队列",
          workflow_meta: {
            ...(task.workflow_meta || {}),
            project_mission: {
              ...((task.workflow_meta || {}).project_mission || {}),
              control_state: "queued",
            },
          },
        }) || task;
        updateGroupTaskInlineStatus(updated, updated.status, updated.status_detail || "已进入执行队列");
        sendJson(res, { success: true, task: updated, queued: !!queueResult.queued, queue_result: queueResult, trace_id: task.trace_id, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/usability/intake/revise" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const feedback = compactFormText(payload.feedback || payload.message || payload.reason || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效，不能调整计划" }, 409);
        if (!feedback) return sendJson(res, { error: "请填写希望主 Agent 调整的地方" }, 400);
        const basePlan = getTaskPlanMode(current) || current.intake_draft || {};
        let revisedDecomposition = current.decomposition_plan || current.requirement_decomposition || null;
        let revisedRequirement = current.requirement_extraction || null;
        if (current.workflow_type === "requirement_epic" && revisedDecomposition) {
          const groups = loadGroups();
          const configs = getConfigs();
          const availableTargets = [
            ...groups.map((group: any) => ({
              type: "group",
              id: group.id,
              name: group.name || group.id,
              capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
            })),
            ...configs.map((config: any) => ({ type: "project", id: config.name, name: config.name })),
          ];
          revisedRequirement = {
            ...(revisedRequirement || {}),
            schema: revisedRequirement?.schema || "ccm-business-requirement-v1",
            business_goal: `${revisedRequirement?.business_goal || current.business_goal || current.description || current.title}\n用户修订意见：${feedback}`,
            scope: revisedRequirement?.scope || revisedDecomposition.items.flatMap((item: any) => item.scope || []),
            acceptance_criteria: revisedRequirement?.acceptance_criteria || revisedDecomposition.global_acceptance_criteria || [],
            dependencies: revisedRequirement?.dependencies || [],
            risks: revisedRequirement?.risks || revisedDecomposition.items.flatMap((item: any) => item.risks || []),
            clarification_questions: [],
            source_evidence: revisedRequirement?.source_evidence || revisedDecomposition.source_evidence || [],
            extraction_method: revisedRequirement?.extraction_method || "model",
          };
          revisedDecomposition = await decomposeRequirementToTaskPlan({
            requirement: revisedRequirement,
            availableTargets,
          });
        }
        const revisedPlan = buildRevisedPlanModeDraft({
          ...basePlan,
          ...(revisedDecomposition ? {
            decomposition_plan: revisedDecomposition,
            requirement_epic: {
              ...(basePlan.requirement_epic || {}),
              schema: revisedDecomposition.schema,
              content_hash: revisedDecomposition.content_hash,
              epic_title: revisedDecomposition.epic_title,
              global_acceptance_criteria: revisedDecomposition.global_acceptance_criteria,
              clarification_questions: revisedDecomposition.clarification_questions,
              items: revisedDecomposition.items,
              version: revisedDecomposition.version,
            },
          } : {}),
        }, feedback);
        const meta = current.workflow_meta || {};
        const task = updateTask(taskId, {
          intake_state: "awaiting_confirmation",
          intake_draft: revisedPlan,
          requirement_extraction: revisedRequirement,
          requirement_decomposition: revisedDecomposition,
          decomposition_plan: revisedDecomposition,
          requirement_content_hash: revisedDecomposition?.content_hash || current.requirement_content_hash,
          auto_execute: false,
          status: "pending",
          status_detail: "执行前计划已按你的反馈调整，等待你重新确认",
          plan_revision_count: revisedPlan.revision_count,
          last_plan_revision_feedback: revisedPlan.last_revision_feedback,
          last_plan_revision_at: revisedPlan.revised_at,
          workflow_meta: {
            ...meta,
            plan_mode: revisedPlan,
            intake: { ...(meta.intake || {}), plan_mode: revisedPlan },
            project_mission: {
              ...(meta.project_mission || {}),
              control_state: "plan_revision_requested",
            },
          },
        }) || current;
        appendTraceEvent(task.trace_id, {
          type: "intake.revision_requested",
          status: "ok",
          task_id: task.id,
          group_id: task.group_id || "",
          agent: task.target_project || "",
          message: "用户退回执行前计划并要求调整",
          data: { feedback: revisedPlan.last_revision_feedback, revision_count: revisedPlan.revision_count, same_task_trace: true },
        });
        appendTaskTimelineEvent(task.id, {
          type: "plan_mode_revision_requested",
          title: "用户要求调整执行前计划",
          detail: revisedPlan.last_revision_feedback,
          status: "warn",
          phase: "planning",
          agent: task.target_project || "",
          data: { revision_count: revisedPlan.revision_count, same_task_trace: true },
        });
        addTaskLog(task.id, "info", `执行前计划退回调整：${revisedPlan.last_revision_feedback}`);
        updateGroupTaskInlineStatus(task, "pending", task.status_detail || "执行前计划已调整，等待重新确认");
        sendJson(res, { success: true, task, plan_mode: revisedPlan, trace_id: task.trace_id, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  return false;
}
