// Behavior-freeze split from collaboration-routes-part-02.ts (part 2/2).

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

export function handleCollaborationApiIntakeRoutesPartB(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (pathname === "/api/tasks/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const task = createTask(payload);
        let queueResult = null;
        if (payload.auto_execute || payload.autoExecute) {
          queueResult = enqueueTask(task.id, ctx);
        }
        sendJson(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      let operationKey = "";
      try {
        const payload = body ? JSON.parse(body) : {};
        operationKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
        const traceId = ensureTraceId(payload.trace_id || payload.traceId, "daily-dev");
        const groupId = payload.group_id || payload.groupId;
        if (!groupId) return sendJson(res, { error: "请选择目标开发群聊" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, { error: "开发群聊不存在" }, 404);
        const groupReadiness = validateDailyDevGroupReady(group);
        const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
        if (!goal) return sendJson(res, { error: "请输入业务目标" }, 400);
        const quality = evaluateDailyDevIntakeQuality(payload, goal);
        const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
        if (!quality.pass && !forceQualityGate) {
          return sendJson(res, {
            success: false,
            needs_confirmation: true,
            error: quality.message,
            quality,
          }, 422);
        }
        const operation = operationKey ? acquireIdempotency({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
        if (operation && !operation.acquired) {
          const existingTask = operation.record?.result?.task_id ? loadTasks().find((item: any) => item.id === operation.record.result.task_id) : null;
          sendJson(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
          return;
        }
        const title = compactFormText(payload.title, goal.slice(0, 60));
        const backlogFile = persistDailyDevBacklogFile(groups, group, payload, title, goal);
        const sourceDocuments = [
          payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
          backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
        ].filter(Boolean).join("\n\n");
        const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };

        const task = createTask({
          title,
          description: buildDailyDevTaskDescription(taskPayload),
          target_project: groupReadiness.coordinator.project,
          group_id: groupId,
          assign_type: "group",
          priority: payload.priority || "normal",
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          workflow_type: "daily_dev",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
          requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
          business_goal: goal,
          acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
          source_documents: sourceDocuments,
          workflow_meta: {
            ...(payload.workflow_meta || payload.workflowMeta || {}),
            intake_quality: quality,
            intake: backlogFile ? {
              backlog_file: backlogFile.name,
              persisted_at: new Date().toISOString(),
              source: "create-daily-dev",
            } : null,
          },
          trace_id: traceId,
          idempotency_key: operationKey || null,
        });
        if (backlogFile) {
          markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
            task_id: task.id,
            result: "业务开发任务已创建并关联此需求池条目",
          });
        }
        let queueResult = null;
        if (task.auto_execute) {
          queueResult = enqueueTask(task.id, ctx);
          if (backlogFile && queueResult?.blocked) {
            markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
              task_id: task.id,
              result: queueResult.message || "任务已创建，等待执行通道恢复",
            });
          }
        }
        if (operationKey) completeIdempotency("create-daily-dev", operationKey, { task_id: task.id, queued: !!queueResult?.queued });
        sendJson(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        if (operationKey) {
          try { failIdempotency("create-daily-dev", operationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
    const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
    const items = listDailyDevBacklogs(groupId);
    const counts = items.reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {});
    sendJson(res, { success: true, items, counts });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        const status = String(payload.status || "").trim();
        if (!groupId || !name || !status) return sendJson(res, { error: "缺少 group_id、name 或 status" }, 400);
        if (!["draft", "needs_user", "ready", "planned", "dispatched", "queued", "in_progress", "running", "reviewing", "blocked", "done", "failed"].includes(status)) {
          return sendJson(res, { error: "不支持的需求池状态" }, 400);
        }
        const file = markDailyDevBacklogStatus(groupId, name, status, {
          result: payload.reason || `用户手动设置为 ${status}`,
        });
        if (!file) return sendJson(res, { error: "需求池文件不存在" }, 404);
        const items = listDailyDevBacklogs(groupId);
        sendJson(res, { success: true, file, items });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = importSharedDocsToDailyDevBacklog({
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          force: !!payload.force,
          priority: payload.priority || "normal",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        if (!groupId || !name) return sendJson(res, { error: "缺少 group_id 或 name" }, 400);
        const result = dispatchDailyDevBacklog(groupId, name, ctx, {
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          force: !!payload.force,
        });
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = dispatchReadyDailyDevBacklogs(ctx, {
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/version" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = updateRequirementEpicFromPlan(payload);
        if (result.needs_confirmation) return sendJson(res, result, 409);
        const supervisor = result.epic ? startGlobalMissionSupervisor({
          mission_id: result.epic.id,
          trace_id: result.epic.trace_id,
          session_id: result.epic.group_session_id || result.epic.group_id || "web",
          source: payload.source || "requirement-epic-version",
          business_goal: result.epic.business_goal,
          acceptance: result.epic.acceptance_criteria,
          max_attempts: payload.max_attempts || payload.maxAttempts || 3,
          restart: true,
        }) : null;
        const queueResults = (result.children || [])
          .filter((child: any) => child.status === "pending" && (!child.mission_dependencies || child.mission_dependencies.length === 0))
          .map((child: any) => ({ task_id: child.id, ...enqueueTask(child.id, ctx) }));
        sendJson(res, { ...result, queue_results: queueResults, supervisor });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.id || payload.task_id || payload.taskId || "").trim();
        const operation = String(payload.operation || "approve").trim().toLowerCase();
        const tasks = loadTasks();
        const epic = tasks.find((task: any) => task.id === taskId && task.workflow_type === "requirement_epic");
        if (!epic) return sendJson(res, { success: false, error: "需求 Epic 不存在" }, 404);
        const plan = epic.decomposition_plan || epic.requirement_decomposition || {};
        const children = tasks.filter((task: any) => task.parent_task_id === epic.id);
        if (operation === "approve") {
          if (epic.status === "done" && epic.epic_review?.status === "approved") {
            return sendJson(res, { success: true, duplicate: true, task: epic, evidence_matrix: epic.epic_review?.evidence_matrix || [] });
          }
          const summary = epic.mission_summary || {};
          if (summary.all_passed !== true || children.length === 0) {
            return sendJson(res, { success: false, error: "仍有子任务未通过交付验收，不能批准 Epic" }, 409);
          }
          const statusByTaskId = new Map((summary.children || []).map((row: any) => [String(row.task_id || ""), row]));
          const childByKey = new Map(children.map((child: any) => [String(child.requirement_item_key || ""), child]));
          const evidenceMatrix = (plan.items || []).map((item: any) => {
            const child = childByKey.get(String(item.item_key || "")) as any;
            const status = child ? statusByTaskId.get(String(child.id)) as any : null;
            return {
              item_key: item.item_key,
              title: item.title,
              task_id: child?.id || "",
              acceptance_criteria: item.acceptance_criteria || [],
              source_evidence: item.source_evidence || [],
              gate_passed: status?.gate_passed === true,
              verification_count: Number(status?.verification_count || 0),
              actual_file_change_count: Number(status?.actual_file_change_count || 0),
            };
          });
          const approvedAt = new Date().toISOString();
          const epicDeliverySummary = {
            ...(epic.delivery_summary || {}),
            headline: "需求 Epic 已通过整批变更审阅并完成交付",
            requirement_epic: true,
            acceptance_gate_passed: true,
            evidence_matrix: evidenceMatrix,
            global_acceptance_criteria: plan.global_acceptance_criteria || [],
            requirement_content_hash: epic.requirement_content_hash || plan.content_hash || "",
            plan_version: epic.requirement_version || plan.version || 1,
            child_task_count: children.length,
            approved_at: approvedAt,
          };
          const deliveryReport = buildTaskDeliveryReport(
            { ...epic, status: "done", status_detail: "用户已审阅整批变更并批准需求 Epic 交付" },
            epicDeliverySummary,
            "done",
            "全部子任务、集成验收证据与原始需求验收矩阵已归档"
          );
          const updated = updateTask(epic.id, {
            status: "done",
            status_detail: "用户已审阅整批变更并批准需求 Epic 交付",
            completed_at: approvedAt,
            epic_review: {
              status: "approved",
              approved_at: approvedAt,
              reviewer: payload.reviewer || "user",
              comment: payload.comment || payload.feedback || "",
              evidence_matrix: evidenceMatrix,
            },
            delivery_summary: {
              ...epicDeliverySummary,
              delivery_report: deliveryReport,
            },
            collaboration_state: { ...(epic.collaboration_state || {}), phase: "completed", needs_user: false, completed_at: approvedAt },
          }) || epic;
          appendTaskTimelineEvent(epic.id, {
            type: "requirement_epic_approved",
            title: "用户已批准 Epic 整批交付",
            detail: `${children.length} 个子任务和原始验收标准证据矩阵已归档`,
            status: "ok",
            phase: "completed",
            data: { evidence_matrix: evidenceMatrix },
          });
          return sendJson(res, { success: true, task: updated, evidence_matrix: evidenceMatrix });
        }
        if (operation === "rework") {
          const itemKey = String(payload.item_key || payload.itemKey || "").trim();
          const feedback = compactFormText(payload.feedback || payload.reason || payload.message, "");
          if (!itemKey || !feedback) return sendJson(res, { success: false, error: "退回返工需要 item_key 和反馈说明" }, 400);
          const child = children.find((task: any) => String(task.requirement_item_key || "") === itemKey || String(task.id) === itemKey);
          if (!child) return sendJson(res, { success: false, error: "没有找到要返工的 Epic 子任务" }, 404);
          const reworkKey = `${epic.id}:review-rework:${child.id}:${crypto.createHash("sha256").update(feedback).digest("hex").slice(0, 12)}`;
          if (epic.epic_review?.status === "rework_requested" && epic.epic_review?.idempotency_key === reworkKey) {
            return sendJson(res, { success: true, duplicate: true, task: epic, child });
          }
          const continuation = continueTaskWithMessage(child.id, `需求 Epic 整批审阅退回返工：${feedback}`, ctx, {
            source: "requirement_epic_targeted_rework",
            auto_execute: true,
            idempotency_key: reworkKey,
            status_detail: "用户在 Epic 整批审阅中退回该子任务返工",
          });
          const affectedDescendantIds = new Set<string>();
          let expanded = true;
          while (expanded) {
            expanded = false;
            for (const candidate of children) {
              if (candidate.id === child.id || affectedDescendantIds.has(candidate.id)) continue;
              const dependencies = Array.isArray(candidate.mission_dependencies) ? candidate.mission_dependencies.map(String) : [];
              if (dependencies.includes(child.id) || dependencies.some((dependencyId: string) => affectedDescendantIds.has(dependencyId))) {
                affectedDescendantIds.add(candidate.id);
                expanded = true;
              }
            }
          }
          const reopenedDescendants = children
            .filter((candidate: any) => affectedDescendantIds.has(candidate.id))
            .map((candidate: any) => updateTask(candidate.id, {
              status: "pending",
              status_detail: `上游子任务 ${child.title} 已退回返工，等待上游重新验收后重跑`,
              completed_at: null,
              acceptance: null,
              delivery_summary: null,
              receipt: null,
              global_mission_gate_passed: false,
              dependency_blocked: true,
              delivery_history: [
                ...(Array.isArray(candidate.delivery_history) ? candidate.delivery_history : []),
                {
                  archived_at: new Date().toISOString(),
                  reason: `上游 ${child.requirement_item_key || child.id} 定向返工`,
                  status: candidate.status,
                  delivery_summary: candidate.delivery_summary || null,
                  receipt: candidate.receipt || null,
                },
              ].slice(-20),
            })).filter(Boolean);
          const updatedEpic = updateTask(epic.id, {
            status: "in_progress",
            status_detail: `子任务 ${child.title} 已退回返工，后继依赖将继续等待`,
            epic_review: {
              status: "rework_requested",
              item_key: itemKey,
              child_task_id: child.id,
              feedback,
              idempotency_key: reworkKey,
              requested_at: new Date().toISOString(),
            },
            collaboration_state: { ...(epic.collaboration_state || {}), phase: "reworking", needs_user: false },
          }) || epic;
          appendTaskTimelineEvent(epic.id, {
            type: "requirement_epic_targeted_rework",
            title: `已退回子任务：${child.title}`,
            detail: feedback,
            status: "active",
            phase: "reworking",
            data: { item_key: itemKey, child_task_id: child.id, reopened_descendant_ids: [...affectedDescendantIds] },
          });
          const supervisor = startGlobalMissionSupervisor({
            mission_id: epic.id,
            trace_id: epic.trace_id,
            session_id: epic.group_session_id || epic.group_id || "web",
            source: "requirement-epic-targeted-rework",
            business_goal: epic.business_goal,
            acceptance: epic.acceptance_criteria,
            max_attempts: 3,
            restart: true,
          });
          return sendJson(res, { success: true, task: updatedEpic, child, continuation, reopened_descendants: reopenedDescendants, supervisor });
        }
        return sendJson(res, { success: false, error: "不支持的 Epic 审阅操作" }, 400);
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  return false;
}
