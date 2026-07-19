// Behavior-freeze split from collaboration-receipt-self-tests.ts (part 1/2).
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
  AGENT_PROBE_SUCCESS_FRESH_MS,
  COORDINATOR_REVIEW_MAX_ROUNDS,
  TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS,
  TASK_WATCHDOG_GAP_REWORK_MAX,
  buildAcceptanceGate,
  buildAcceptedPlanModeDraft,
  buildAgentExecutionFixActions,
  buildAgentRecoveryProbeGroups,
  buildChildAgentWorkerHandoff,
  buildContinuationUserDecision,
  buildCoordinatorReworkContinuationFallback,
  buildCoordinatorReworkFollowUp,
  buildCoordinatorReworkRoutingDecision,
  buildCoordinatorReworkTask,
  buildCoordinatorTestAgentHandoff,
  buildDeliverySummary,
  buildDispatchLaunchSummary,
  buildEvidenceGateFollowUps,
  buildFailedIndependentReviewReworkFollowUps,
  buildGlobalDirectDispatchCompletionMessage,
  buildGlobalDirectDispatchContinuationMessage,
  buildGlobalDirectDispatchRollbackMessage,
  buildGlobalMissionTargetHandoff,
  buildIndependentReviewGate,
  buildIndependentReviewGateFollowUps,
  buildNativeTestAgentPlanBlockedReceipt,
  buildNativeTestAgentReceipt,
  buildNativeTestAgentReviewSummary,
  buildNativeTestAgentRuntimeToolContext,
  buildPlanModeClarificationQuestions,
  buildProjectCodeReadOnlySnapshot,
  buildQueuedGroupTaskMessage,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskCardView,
  buildTaskGapContinuationDraft,
  buildTaskPreflightReasoning,
  buildTaskSourceDocumentsContext,
  buildUserAcceptanceReview,
  buildUserCompletionReadinessSummary,
  buildUserCoordinationAcknowledgement,
  buildWorkerContinuationHandoff,
  canAutoContinueTaskGaps,
  canCompleteDailyDevFromDeliverySummary,
  classifyGroupProjectTaskIntent,
  classifyPlanModeRisk,
  classifyTaskContinuation,
  collectTaskTypedMemoryPressureRecallUsageRows,
  collectTestAgentBrowserEvidenceSummaryLines,
  deriveTaskLifecycle,
  doesProbeTargetMatchRequired,
  enforceAgentProbeExecutionReadiness,
  enforceTaskAgentProbeReadiness,
  evaluateReceiptReadPlanRevalidationGate,
  filterCoordinatorLlmFollowUpsAgainstHardRoutes,
  formatNativeTestAgentOutput,
  formatNativeTestAgentPlanBlockedOutput,
  getAgentDependencyStateFromOutputs,
  getAgentProbeHealth,
  getAgentProbeOutputFailure,
  getAgentProbeTargetStatusKey,
  getCoordinatorActionMentions,
  getCoordinatorVisibleMessageSelfTest,
  getGlobalDirectDispatchContinuationKey,
  getTaskGapFingerprint,
  getTaskGapItems,
  getTaskWatchdogStatus,
  hasConfiguredTestAgentMultiSessionBrowserCheck,
  hasDailyDevContinuationGaps,
  hasFreshSuccessfulAgentProbe,
  isAdvisoryNeed,
  isAutomaticGapContinuationSource,
  looksLikeTaskContinuation,
  mergeCoordinatorDocumentContexts,
  normalizeGlobalMissionTargetRequirements,
  normalizeGroupAgentGatewayTaskIntent,
  reconcileTaskCollaborationState,
  scheduleTestAgentRecheckAfterFollowUps,
  scoreChildAgentReceipt,
  selectCoordinatorIndependentVerifier,
  selectLatestDurableReceipts,
  shouldCreatePersistentGroupTask,
  shouldNotifyGlobalDirectDispatchCompletion,
  shouldNotifyGlobalDirectDispatchContinuation,
  shouldNotifyGlobalDirectDispatchRollback,
  shouldUseProjectAnalysisMode,
  summarizeAgentProbeTargets,
  summarizeNativeTestAgentExecutionPlan,
  summarizeTaskAgentMemoryContextSnapshot,
  taskMatchesAgentProbeTarget,
  taskNeedsGroupWideAgentProbe,
  taskRequiresAgentQa,
} from "./collaboration";

export function runMemoryDispatchGateReceiptValidationSelfTest() {
  const gate = {
    schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
    dispatch_gate_id: "gmd_receipt_gate_selftest",
    group_id: "group-receipt-gate-selftest",
    target_project: "frontend",
    scope: "child:frontend",
    status: "fresh_reloaded",
    action: "use_reloaded_context",
    source_manifest: { checksum: "receipt-gate-source" },
    reload_audit: { reason: "memory_source_changed" },
  };
  const task = {
    title: "记忆 gate 回执自测",
    workflow_type: "daily_dev",
    target_project: "frontend",
    requires_code_changes: true,
    requires_verification: true,
    workflow_timeline: [{
      type: "worker_handoff_ready",
      agent: "frontend",
      data: {
        worker_context_packet: {
          packet_id: "wcp_receipt_gate_selftest",
          memory: {
            schema: "ccm-group-memory-context-v1",
            dispatch_freshness_gate: gate,
          },
        },
      },
    }],
  };
  const baseReceipt = {
    agent: "frontend",
    status: "done",
    summary: "完成记忆 gate 回执验证改动",
    actions: ["修改前端页面"],
    filesChanged: ["src/App.vue"],
    verification: ["npm test passed by external runner (exit 0)"],
    ack: {
      understoodGoal: "验证记忆 gate 回执",
      plannedScope: ["src/App.vue"],
      forbiddenScope: ["无关模块"],
      verificationPlan: ["npm test"],
      unclear: [],
    },
    contractChanges: [],
    blockers: [],
    needs: [],
  };
  const goodReceipt = {
    ...baseReceipt,
    memoryUsed: ["使用平台群聊记忆，dispatch_gate_id=gmd_receipt_gate_selftest"],
    memoryIgnored: [],
  };
  const missingGateReceipt = {
    ...baseReceipt,
    memoryUsed: ["使用平台群聊记忆，但未引用 gate id"],
    memoryIgnored: [],
  };
  const ignoredGateReceipt = {
    ...baseReceipt,
    memoryUsed: [],
    memoryIgnored: ["未使用平台记忆，dispatch_gate_id=gmd_receipt_gate_selftest；原因：本轮只核验当前文件"],
  };
  const goodQuality = scoreChildAgentReceipt(task, goodReceipt);
  const missingGateQuality = scoreChildAgentReceipt(task, missingGateReceipt);
  const ignoredQuality = scoreChildAgentReceipt(task, ignoredGateReceipt);
  const missingGateSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: missingGateReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const goodSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: goodReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const checks = {
    goodReceiptPassesGate: goodQuality.pass === true
      && goodQuality.memory_gate?.pass === true
      && goodQuality.grade === "good",
    ignoredReceiptCanSatisfyGate: ignoredQuality.pass === true
      && ignoredQuality.memory_gate?.pass === true
      && ignoredQuality.grade === "good",
    missingGateHardFailsQuality: missingGateQuality.pass === false
      && missingGateQuality.grade !== "good"
      && missingGateQuality.memory_gate?.missing_gate_ids?.includes("gmd_receipt_gate_selftest")
      && missingGateQuality.missing.includes("引用记忆派发 gate"),
    deliverySummaryRecordsGate: missingGateSummary.memory_dispatch_gate_count === 1
      && missingGateSummary.memory_gate_receipt_passed === false
      && missingGateSummary.memory_gate_receipt_rows?.[0]?.memory_gate?.missing_gate_ids?.includes("gmd_receipt_gate_selftest"),
    acceptanceGateBlocksMissingGate: missingGateSummary.acceptance_gate_passed === false
      && missingGateSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "memory_gate_receipt"),
    goodDeliverySummaryPassesGate: goodSummary.memory_gate_receipt_passed === true
      && goodSummary.receipt_quality_gate_passed === true,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    good: { score: goodQuality.score, grade: goodQuality.grade, memoryGate: goodQuality.memory_gate },
    missing: { score: missingGateQuality.score, grade: missingGateQuality.grade, memoryGate: missingGateQuality.memory_gate },
  };
}

export function runPressureMemoryProvenanceReceiptUsageSelfTest() {
  const groupId = `pressure-memory-provenance-receipt-${process.pid}-${Date.now().toString(36)}`;
  const targetProject = "phase132-pressure-project";
  const typedDir = path.join(CCM_DIR, "group-memory-md", String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
  try {
    const relPath = "worker-context-usage-pressure-discipline.md";
    const repairWorkItemId = "cgpru-phase132-repair-selftest";
    const task = {
      id: "phase132-pressure-provenance-task",
      group_id: groupId,
      target_project: targetProject,
      worker_context_packet: {
        packet_id: "wcp-phase132-pressure-provenance",
        project: targetProject,
        memory: {
          schema: "ccm-group-memory-context-v1",
          group_id: groupId,
          target_project: targetProject,
          group_state: {
            typedMemory: {
              recall: {
                schema: "ccm-group-typed-memory-recall-v1",
                ignored: false,
                workerContextPressureScoring: {
                  schema: "ccm-group-typed-memory-worker-context-pressure-scoring-v1",
                  active: true,
                  pressure_status: "over_budget",
                },
                recalled: [{
                  relPath,
                  name: "WorkerContextPacket context usage pressure discipline",
                  type: "feedback",
                  source: "selftest:phase132",
                  score: 18,
                  workerContextPressureRecall: {
                    adjustment: 7,
                    pressure_status: "over_budget",
                    kinds: ["context_usage_pressure"],
                  },
                  workerContextPressureUsage: {
                    adjustment: -9,
                    matched: [{
                      rel_path: relPath,
                      recommendation: "deprioritize_pressure_recall",
                      provenance_status: "disputed_under_repair",
                      repair_open: true,
                      repair_work_item_id: repairWorkItemId,
                      repair_status: "pending",
                      repair_gap_type: "recommendation_conflict",
                    }],
                  },
                }],
              },
            },
          },
        },
      },
    };
    const receipt = extractAgentReceipt([
      "CCM_AGENT_RECEIPT",
      "```json",
      JSON.stringify({
        ccm_receipt: true,
        status: "done",
        summary: "使用 disputed pressure memory 前重读当前源并完成修复。",
        actions: ["核验 WorkerContextPacket pressure memory provenance"],
        filesChanged: [],
        verification: ["current source re-read before applying disputed memory"],
        blockers: [],
        needs: [],
        ack: {
          understoodGoal: "验证 pressure memory provenance receipt",
          plannedScope: ["memory provenance"],
          forbiddenScope: [],
          verificationPlan: ["current source re-read"],
          unclear: [],
        },
        contractChanges: [],
        consumedInjectionIds: [],
        memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}; current source verified`],
        memoryIgnored: [],
        memoryProvenanceUsage: [{
          relPath,
          name: "WorkerContextPacket context usage pressure discipline",
          usageState: "used",
          provenanceStatus: "disputed_under_repair",
          repairWorkItemId,
          repairStatus: "pending",
          repairGapType: "recommendation_conflict",
          currentSourceVerified: true,
          reason: "disputed pressure memory was used only after current source verification",
        }],
      }),
      "```",
    ].join("\n"), targetProject);
    const rows = collectTaskTypedMemoryPressureRecallUsageRows(task, [receipt], {});
    const record = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
      targetProject,
      taskId: task.id,
      executionId: "phase132-pressure-provenance-execution",
      rows,
      generatedAt: "2026-07-09T23:59:30.000Z",
    });
    const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
    const entry = (ledger.entries || []).find((item: any) => item.rel_path === relPath) || {};
    const statKey = Object.keys(ledger.stats || {}).find(key => key.includes(relPath.toLowerCase())) || "";
    const stat = statKey ? ledger.stats[statKey] || {} : {};
    const checks = {
      receiptParserKeepsStructuredProvenance: receipt?.memoryProvenanceUsage?.[0]?.repairWorkItemId === repairWorkItemId
        && receipt.memoryProvenanceUsage[0].provenanceStatus === "disputed_under_repair",
      collectionPrefersStructuredProvenance: rows.length === 1
        && rows[0].usage_state === "verified"
        && rows[0].provenance_status === "disputed_under_repair"
        && rows[0].repair_work_item_id === repairWorkItemId
        && rows[0].current_source_verified === true,
      ledgerPersistsProvenance: record?.recorded_count === 1
        && entry.usage_state === "verified"
        && entry.provenance_status === "disputed_under_repair"
        && entry.repair_work_item_id === repairWorkItemId
        && entry.current_source_verified === true,
      statsAggregateProvenance: Array.isArray(stat.provenance_statuses)
        && stat.provenance_statuses.includes("disputed_under_repair")
        && Array.isArray(stat.repair_work_item_ids)
        && stat.repair_work_item_ids.includes(repairWorkItemId)
        && Number(stat.current_source_verified_count || 0) === 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      receipt: {
        memoryProvenanceUsage: receipt?.memoryProvenanceUsage || [],
      },
      rows,
      ledger: {
        entry,
        stat,
      },
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest() {
  const taskId = `task-memory-context-snapshot-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
  const groupId = "group-memory-context-snapshot-receipt-selftest";
  const groupSessionId = `gcs_${Date.now().toString(36)}_snapshot_receipt`;
  try {
    const session = openTaskAgentSession({
      scopeId: taskId,
      taskId,
      groupId,
      project: "frontend",
      agentType: "codex",
    });
    const dispatchGate = {
      schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
      dispatch_gate_id: "gmd_task_agent_snapshot_receipt_selftest",
      group_id: groupId,
      target_project: "frontend",
      scope: "child:frontend",
      status: "fresh_reloaded",
      action: "use_reloaded_context",
      source_manifest: { checksum: "task-agent-snapshot-source" },
      reload_audit: { reason: "session_bound_snapshot_selftest" },
    };
    const memoryContext = {
      schema: "ccm-group-memory-context-v1",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "frontend",
      session_binding: {
        schema: "ccm-child-agent-memory-session-binding-v1",
        binding_id: "csm:snapshot-receipt-selftest",
        task_agent_session_id: session.id,
      },
      memory_policy: { use: "must_consider" },
      compaction: {
        sessionMemory: {
          schema: "ccm-group-session-memory-snapshot-v1",
          snapshotFile: "group-session-memory/snapshot-receipt-selftest/snapshot.json",
          summaryFile: "group-session-memory/snapshot-receipt-selftest/summary.md",
          markdownChecksum: "session-memory-checksum-snapshot-receipt-selftest",
          hasSummary: true,
          sectionEvidence: {
            schema: "ccm-group-session-memory-section-evidence-v1",
            checksum: "section-evidence-bundle-snapshot-receipt-selftest",
            sections: [{
              evidenceId: "gsmse_snapshot_receipt_current_state",
              section: "Current State",
              sectionIndex: 2,
              sectionChecksum: "section-checksum-snapshot-receipt-selftest",
              sourceTranscriptChecksum: "transcript-checksum-snapshot-receipt-selftest",
              sourceFirstMessageId: "msg-first-snapshot-receipt-selftest",
              sourceLastMessageId: "msg-last-snapshot-receipt-selftest",
              sourceMessageIds: ["msg-first-snapshot-receipt-selftest", "msg-last-snapshot-receipt-selftest"],
            }],
          },
        },
      },
      group_state: { goal: "TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SENTINEL" },
      dispatch_freshness_gate: dispatchGate,
    };
    const renderedPrompt = "prompt with session-bound memory snapshot";
    const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
      taskId,
      groupId,
      project: "frontend",
      agentType: "codex",
      nativeSessionId: "codex-native-snapshot-receipt-selftest",
      turn: 1,
      executionId: `${taskId}--frontend`,
      traceId: "trace-task-agent-snapshot-receipt-selftest",
      workerContextPacket: {
        packet_id: "wcp_task_agent_snapshot_receipt_selftest",
        memory: memoryContext,
      },
      memoryContext,
      workerHandoffSummary: {
        handoff_id: "wh_task_agent_snapshot_receipt_selftest",
        packet_id: "wcp_task_agent_snapshot_receipt_selftest",
      },
      renderedPrompt,
    });
    recordTaskAgentMemoryContextDelivery(session.id, {
      snapshotId: bound?.snapshot?.snapshot_id || "",
      renderedPrompt,
      snapshotRenderedPrompt: renderedPrompt,
      executionId: `${taskId}--frontend`,
      traceId: "trace-task-agent-snapshot-receipt-selftest",
      runtime: "codex",
      nativeSessionId: "codex-native-snapshot-receipt-selftest",
      dispatched: true,
      executionSucceeded: true,
      output: "snapshot receipt selftest output",
    });
    const task = {
      id: taskId,
      title: "任务级 Agent 记忆快照回执自测",
      workflow_type: "daily_dev",
      assign_type: "group",
      target_project: "frontend",
      group_id: groupId,
      requires_code_changes: true,
      requires_verification: true,
      trace_id: "trace-task-agent-snapshot-receipt-selftest",
    };
    const baseReceipt = {
      agent: "frontend",
      status: "done",
      summary: "完成任务级记忆快照回执校验改动",
      actions: ["修改前端页面"],
      filesChanged: ["src/App.vue"],
      verification: ["npm test passed by external runner (exit 0)"],
      ack: {
        understoodGoal: "验证任务级记忆快照回执",
        plannedScope: ["src/App.vue"],
        forbiddenScope: ["无关模块"],
        verificationPlan: ["npm test"],
        unclear: [],
      },
      contractChanges: [],
      blockers: [],
      needs: [],
      memoryUsed: ["使用 session-bound memory dispatch_gate_id=gmd_task_agent_snapshot_receipt_selftest"],
      memoryIgnored: [],
      memoryContextUsage: {
        bindingId: "csm:snapshot-receipt-selftest",
        groupSessionId,
        sessionMemoryChecksum: "session-memory-checksum-snapshot-receipt-selftest",
        usageState: "used",
        reason: "使用了当前群聊会话 Session Memory。",
      },
      memoryFactCitations: [{
        evidenceId: "gsmse_snapshot_receipt_current_state",
        section: "Current State",
        sectionChecksum: "section-checksum-snapshot-receipt-selftest",
        sourceTranscriptChecksum: "transcript-checksum-snapshot-receipt-selftest",
        sourceMessageIds: ["msg-last-snapshot-receipt-selftest"],
        usage: "用当前状态章节确定本轮修改范围。",
      }],
    };
    const goodReceipt = {
      ...baseReceipt,
      task_agent_session_id: session.id,
      native_session_id: "codex-native-snapshot-receipt-selftest",
      memory_context_snapshot_id: bound?.snapshot?.snapshot_id || "",
      memory_context_snapshot_checksum: bound?.snapshot?.checksum || "",
      worker_context_packet_id: "wcp_task_agent_snapshot_receipt_selftest",
    };
    const wrongSessionReceipt = {
      ...baseReceipt,
      task_agent_session_id: "tas-wrong-session",
      native_session_id: "codex-native-snapshot-receipt-selftest",
    };
    const wrongCitationReceipt = {
      ...goodReceipt,
      memoryFactCitations: [{
        ...goodReceipt.memoryFactCitations[0],
        sectionChecksum: "forged-section-checksum",
      }],
    };
    const wrongSourceMessageReceipt = {
      ...goodReceipt,
      memoryFactCitations: [{
        ...goodReceipt.memoryFactCitations[0],
        sourceMessageIds: ["msg-from-another-session"],
      }],
    };
    const goodSummary = buildDeliverySummary(task, {
      status: "done",
      receipt: goodReceipt,
      review: { status: "complete", content: "主 Agent 复盘完成" },
      fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const wrongSummary = buildDeliverySummary(task, {
      status: "done",
      receipt: wrongSessionReceipt,
      review: { status: "complete", content: "主 Agent 复盘完成" },
      fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const wrongCitationSummary = buildDeliverySummary(task, {
      status: "done",
      receipt: wrongCitationReceipt,
      review: { status: "complete", content: "主 Agent 复盘完成" },
      fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const wrongSourceMessageSummary = buildDeliverySummary(task, {
      status: "done",
      receipt: wrongSourceMessageReceipt,
      review: { status: "complete", content: "主 Agent 复盘完成" },
      fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const listed = listTaskAgentMemoryContextSnapshots({ taskId });
    const goodSnapshotGate = goodSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
    const wrongSnapshotGate = wrongSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
    const wrongCitationGate = wrongCitationSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
    const wrongSourceMessageGate = wrongSourceMessageSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
    const checks = {
      snapshotPersistedOnSession: listed.length === 1
        && listed[0]?.context?.worker_context_packet_id === "wcp_task_agent_snapshot_receipt_selftest"
        && listed[0]?.context?.gate_ids?.includes("gmd_task_agent_snapshot_receipt_selftest"),
      deliverySummaryCollectsGateFromSessionSnapshot: goodSummary.memory_dispatch_gate_count === 1
        && goodSummary.memory_dispatch_gates?.[0]?.gate_id === "gmd_task_agent_snapshot_receipt_selftest",
      goodReceiptMatchesExactSnapshot: goodSnapshotGate.pass === true
        && goodSnapshotGate.matched_snapshot_ids?.includes(bound?.snapshot?.snapshot_id)
        && goodSummary.task_agent_memory_snapshot_receipt_passed === true
        && goodSnapshotGate.memory_fact_citations_required === true
        && goodSnapshotGate.memory_fact_citations_passed === true,
      goodDeliveryPassesMemoryGate: goodSummary.memory_gate_receipt_passed === true
        && goodSummary.receipt_quality_gate_passed === true,
      wrongSessionFailsSnapshotGate: wrongSnapshotGate.pass === false
        && wrongSnapshotGate.missing_snapshot_ids?.includes(bound?.snapshot?.snapshot_id)
        && wrongSummary.task_agent_memory_snapshot_receipt_passed === false,
      wrongSessionBlocksAcceptance: wrongSummary.acceptance_gate_passed === false
        && wrongSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "task_agent_memory_snapshot_receipt"),
      forgedFactCitationBlocksAcceptance: wrongCitationGate.pass === false
        && wrongCitationGate.memory_fact_citations_required === true
        && wrongCitationGate.memory_fact_citations_passed === false
        && wrongCitationSummary.acceptance_gate_passed === false,
      foreignSourceMessageCitationBlocksAcceptance: wrongSourceMessageGate.pass === false
        && wrongSourceMessageGate.rows?.[0]?.memory_fact_citations?.[0]?.source_message_ids_required === true
        && wrongSourceMessageGate.rows?.[0]?.memory_fact_citations?.[0]?.source_message_ids_match === false
        && wrongSourceMessageSummary.acceptance_gate_passed === false,
      runtimeKernelShowsSnapshotMismatch: wrongSummary.runtime_kernel?.task_agent_memory_context_snapshot?.status === "session_snapshot_mismatch",
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      snapshot: summarizeTaskAgentMemoryContextSnapshot(bound?.snapshot),
      good: goodSnapshotGate,
      wrong: wrongSnapshotGate,
      wrongCitation: wrongCitationGate,
      wrongSourceMessage: wrongSourceMessageGate,
    };
  } finally {
    purgeTaskAgentSessions(taskId);
  }
}

export function runGlobalMemoryUsageReceiptValidationSelfTest() {
  const globalMemoryRecall = {
    schema: "ccm-child-global-agent-memory-recall-v1",
    itemCount: 2,
    items: [{
      id: "gmi_receipt_semantic_selftest",
      type: "decision",
      text: "GLOBAL_MEMORY_RECEIPT_SENTINEL: src/global-receipt.ts 旧规则存在语义风险。",
      arbitration: {
        status: "possible_conflict_with_newer_group_memory",
        action: "do_not_apply_directly_treat_as_background",
        demoted: true,
        conflict: true,
        semanticRiskScore: 92,
        semanticRisk: { score: 92, level: "high", reasons: ["different_named_rule"] },
        semanticReasons: ["different_named_rule"],
      },
    }, {
      id: "gmi_receipt_background_selftest",
      type: "fact",
      text: "GLOBAL_MEMORY_RECEIPT_BACKGROUND_SENTINEL: src/global-receipt.ts 跨群聊旧结论。",
      arbitration: {
        status: "suppressed_by_cross_group_arbitration",
        action: "do_not_apply_directly_treat_as_background_verify_current_group_and_sources",
        demoted: true,
        conflict: false,
        crossGroupSuppressed: true,
      },
      crossGroupSuppression: {
        suppressed: true,
        advisory: false,
        action: "treat_as_background_only_verify_current_group_before_use",
        reason: "global_memory_conflicted_or_demoted_in_other_groups",
      },
    }],
  };
  const task = {
    id: "task-global-memory-receipt-selftest",
    title: "全局记忆使用回执自测",
    workflow_type: "daily_dev",
    assign_type: "group",
    target_project: "frontend",
    requires_code_changes: true,
    requires_verification: true,
    workflow_timeline: [{
      type: "worker_handoff_ready",
      agent: "frontend",
      data: {
        worker_context_packet: {
          packet_id: "wcp_global_memory_receipt_selftest",
          memory: {
            schema: "ccm-group-memory-context-v1",
            target_project: "frontend",
            global_agent_memory: globalMemoryRecall,
          },
        },
      },
    }],
  };
  const baseReceipt = {
    agent: "frontend",
    status: "done",
    summary: "完成全局记忆使用回执校验改动",
    actions: ["修改前端页面"],
    filesChanged: ["src/App.vue"],
    verification: ["npm test passed by external runner (exit 0)"],
    ack: {
      understoodGoal: "验证全局记忆使用回执",
      plannedScope: ["src/App.vue"],
      forbiddenScope: ["无关模块"],
      verificationPlan: ["npm test"],
      unclear: [],
    },
    contractChanges: [],
    blockers: [],
    needs: [],
    memoryUsed: ["使用全局记忆 gmi_receipt_semantic_selftest 前已核验当前源"],
    memoryIgnored: [],
  };
  const goodReceipt = {
    ...baseReceipt,
    globalMemoryUsage: [
      {
        globalMemoryId: "gmi_receipt_semantic_selftest",
        usageState: "verified",
        currentSourceVerified: true,
        semanticRiskAcknowledged: true,
        reason: "已识别 semantic_risk，只在核验当前源后作为背景核对。",
      },
      {
        globalMemoryId: "gmi_receipt_background_selftest",
        usageState: "background",
        currentSourceVerified: true,
        crossGroupSuppression: "background_only",
        reason: "跨群聊 suppression 仅作背景，不直接应用。",
      },
    ],
  };
  const missingGlobalReceipt = {
    ...baseReceipt,
    memoryUsed: ["使用了平台全局记忆，但未列出 global_memory_id"],
    globalMemoryUsage: [],
  };
  const unsafeBackgroundReceipt = {
    ...baseReceipt,
    globalMemoryUsage: [
      {
        globalMemoryId: "gmi_receipt_semantic_selftest",
        usageState: "verified",
        currentSourceVerified: true,
        semanticRiskAcknowledged: true,
        reason: "已核验当前源。",
      },
      {
        globalMemoryId: "gmi_receipt_background_selftest",
        usageState: "used",
        currentSourceVerified: false,
        crossGroupSuppression: "background_only",
        reason: "直接用了旧跨群聊记忆。",
      },
    ],
  };
  const goodQuality = scoreChildAgentReceipt(task, goodReceipt);
  const missingQuality = scoreChildAgentReceipt(task, missingGlobalReceipt);
  const unsafeQuality = scoreChildAgentReceipt(task, unsafeBackgroundReceipt);
  const missingSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: missingGlobalReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const unsafeSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: unsafeBackgroundReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const goodSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: goodReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const checks = {
    goodReceiptPassesGlobalMemoryGate: goodQuality.pass === true
      && goodQuality.global_memory_gate?.pass === true
      && goodQuality.global_memory_gate?.verified_global_memory_ids?.includes("gmi_receipt_semantic_selftest")
      && goodQuality.global_memory_gate?.background_global_memory_ids?.includes("gmi_receipt_background_selftest"),
    missingGlobalMemoryHardFailsQuality: missingQuality.pass === false
      && missingQuality.global_memory_gate?.missing_global_memory_ids?.includes("gmi_receipt_semantic_selftest")
      && missingQuality.global_memory_gate?.missing_global_memory_ids?.includes("gmi_receipt_background_selftest")
      && missingQuality.missing.includes("声明全局记忆使用状态"),
    unsafeBackgroundUseHardFailsQuality: unsafeQuality.pass === false
      && unsafeQuality.global_memory_gate?.unsafe_used_global_memory_ids?.includes("gmi_receipt_background_selftest"),
    deliverySummaryRecordsMissingGlobalMemory: missingSummary.global_memory_receipt_gate_count === 1
      && missingSummary.global_memory_receipt_passed === false
      && missingSummary.global_memory_receipt_summary?.status === "missing_global_memory_reference",
    acceptanceGateBlocksMissingGlobalMemory: missingSummary.acceptance_gate_passed === false
      && missingSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "global_memory_receipt"),
    runtimeKernelShowsGlobalMemoryGap: missingSummary.runtime_kernel?.global_memory_receipt_gate?.status === "missing_global_memory_reference",
    unsafeSummaryShowsUnsafeUse: unsafeSummary.global_memory_receipt_summary?.status === "unsafe_global_memory_use"
      && unsafeSummary.runtime_kernel?.global_memory_receipt_gate?.unsafe_used_global_memory_ids?.includes("gmi_receipt_background_selftest"),
    goodDeliverySummaryPassesGate: goodSummary.global_memory_receipt_passed === true
      && goodSummary.global_memory_receipt_summary?.status === "passed"
      && goodSummary.receipt_quality_gate_passed === true,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    good: { score: goodQuality.score, grade: goodQuality.grade, globalMemoryGate: goodQuality.global_memory_gate },
    missing: { score: missingQuality.score, grade: missingQuality.grade, globalMemoryGate: missingQuality.global_memory_gate },
    unsafe: { score: unsafeQuality.score, grade: unsafeQuality.grade, globalMemoryGate: unsafeQuality.global_memory_gate },
  };
}

export function runGlobalMemoryHealthGateReceiptValidationSelfTest() {
  const failHealthGate = {
    schema: "ccm-child-global-agent-memory-health-gate-v1",
    gate_id: "ggmh_receipt_health_fail_selftest",
    group_id: "group-global-memory-health-receipt-selftest",
    target_project: "frontend",
    status: "fail",
    pass: false,
    action: "block_global_agent_memory_recall",
    active_contamination_count: 1,
    residue_contamination_count: 0,
    policy: {
      fail_blocks_global_memory_recall: true,
      no_contaminated_preview_in_context: true,
    },
  };
  const warnHealthGate = {
    schema: "ccm-child-global-agent-memory-health-gate-v1",
    gate_id: "ggmh_receipt_health_warn_selftest",
    group_id: "group-global-memory-health-receipt-selftest",
    target_project: "frontend",
    status: "warn",
    pass: true,
    action: "use_active_global_memory_with_residue_warning",
    active_contamination_count: 0,
    residue_contamination_count: 2,
  };
  const task = {
    id: "task-global-memory-health-gate-receipt-selftest",
    title: "全局记忆健康门禁回执自测",
    workflow_type: "daily_dev",
    assign_type: "group",
    target_project: "frontend",
    requires_code_changes: true,
    requires_verification: true,
    workflow_timeline: [{
      type: "worker_handoff_ready",
      agent: "frontend",
      data: {
        worker_context_packet: {
          packet_id: "wcp_global_memory_health_receipt_selftest",
          memory: {
            schema: "ccm-group-memory-context-v1",
            target_project: "frontend",
            global_memory_health_gate: failHealthGate,
            global_agent_memory: {
              schema: "ccm-child-global-agent-memory-recall-v1",
              included: false,
              healthBlocked: true,
              reason: "global_agent_memory_health_gate_failed",
              memory_health_gate: failHealthGate,
              items: [],
              itemCount: 0,
            },
          },
        },
      },
    }],
  };
  const baseReceipt = {
    agent: "frontend",
    status: "done",
    summary: "完成全局记忆健康门禁回执校验改动",
    actions: ["修改前端页面"],
    filesChanged: ["src/App.vue"],
    verification: ["npm test passed by external runner (exit 0)"],
    ack: {
      understoodGoal: "验证全局记忆健康门禁回执",
      plannedScope: ["src/App.vue"],
      forbiddenScope: ["无关模块"],
      verificationPlan: ["npm test"],
      unclear: [],
    },
    contractChanges: [],
    blockers: [],
    needs: [],
    memoryUsed: [],
    memoryIgnored: [],
    globalMemoryUsage: [],
  };
  const goodReceipt = {
    ...baseReceipt,
    memoryIgnored: ["Global Agent memory health gate ggmh_receipt_health_fail_selftest 阻断，本轮未使用任何全局记忆。"],
  };
  const missingGateReceipt = {
    ...baseReceipt,
    memoryIgnored: ["未使用平台记忆，但没有引用健康门禁。"],
  };
  const unsafeUseReceipt = {
    ...baseReceipt,
    memoryUsed: ["错误使用了 Global Agent memory，即使 gate=ggmh_receipt_health_fail_selftest 已阻断。"],
    memoryIgnored: ["知道 ggmh_receipt_health_fail_selftest 存在。"],
    globalMemoryUsage: [{
      globalMemoryId: "gmi_blocked_health_selftest",
      usageState: "used",
      currentSourceVerified: false,
      reason: "错误声明用了被阻断的全局记忆。",
    }],
  };
  const warnReceipt = {
    ...baseReceipt,
    memoryUsed: ["Global Agent memory health gate ggmh_receipt_health_warn_selftest active memory clean；residue warning 已确认；current source verified。"],
  };
  const goodQuality = scoreChildAgentReceipt(task, goodReceipt);
  const missingQuality = scoreChildAgentReceipt(task, missingGateReceipt);
  const unsafeQuality = scoreChildAgentReceipt(task, unsafeUseReceipt);
  const warnQuality = scoreChildAgentReceipt(task, warnReceipt, { globalMemoryHealthGates: [{
    schema: "ccm-child-agent-global-memory-health-gate-receipt-gate-v1",
    gate_id: warnHealthGate.gate_id,
    target_project: "frontend",
    status: warnHealthGate.status,
    action: warnHealthGate.action,
    active_contamination_count: 0,
    residue_contamination_count: 2,
    required_action: "must_ack_residue_warning_before_global_memory_use",
    raw: warnHealthGate,
  }] });
  const missingSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: missingGateReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const unsafeSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: unsafeUseReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const goodSummary = buildDeliverySummary(task, {
    status: "done",
    receipt: goodReceipt,
    review: { status: "complete", content: "主 Agent 复盘完成" },
    fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
  }, "waiting");
  const checks = {
    goodReceiptPassesHealthGate: goodQuality.pass === true
      && goodQuality.global_memory_health_gate?.pass === true
      && goodQuality.global_memory_health_gate?.fail_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
    missingHealthGateHardFailsQuality: missingQuality.pass === false
      && missingQuality.global_memory_health_gate?.missing_gate_ids?.includes("ggmh_receipt_health_fail_selftest")
      && missingQuality.global_memory_health_gate?.missing_ignore_gate_ids?.includes("ggmh_receipt_health_fail_selftest")
      && missingQuality.missing.includes("声明全局记忆健康门禁"),
    unsafeBlockedGlobalMemoryUseHardFails: unsafeQuality.pass === false
      && unsafeQuality.global_memory_health_gate?.blocked_global_memory_used_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
    warnGateRequiresAcknowledgement: warnQuality.pass === true
      && warnQuality.global_memory_health_gate?.warn_gate_ids?.includes("ggmh_receipt_health_warn_selftest"),
    deliverySummaryRecordsMissingHealthGate: missingSummary.global_memory_health_gate_count === 1
      && missingSummary.global_memory_health_gate_receipt_passed === false
      && missingSummary.global_memory_health_gate_summary?.status === "missing_blocked_memory_ignored",
    acceptanceGateBlocksMissingHealthGate: missingSummary.acceptance_gate_passed === false
      && missingSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "global_memory_health_gate_receipt"),
    runtimeKernelShowsHealthGateGap: missingSummary.runtime_kernel?.global_memory_health_gate?.status === "missing_blocked_memory_ignored",
    unsafeSummaryShowsBlockedMemoryUse: unsafeSummary.global_memory_health_gate_summary?.status === "blocked_global_memory_used"
      && unsafeSummary.runtime_kernel?.global_memory_health_gate?.blocked_global_memory_used_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
    goodDeliverySummaryPassesHealthGate: goodSummary.global_memory_health_gate_receipt_passed === true
      && goodSummary.global_memory_health_gate_summary?.status === "passed"
      && goodSummary.receipt_quality_gate_passed === true,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    good: { score: goodQuality.score, grade: goodQuality.grade, healthGate: goodQuality.global_memory_health_gate },
    missing: { score: missingQuality.score, grade: missingQuality.grade, healthGate: missingQuality.global_memory_health_gate },
    unsafe: { score: unsafeQuality.score, grade: unsafeQuality.grade, healthGate: unsafeQuality.global_memory_health_gate },
    warn: { score: warnQuality.score, grade: warnQuality.grade, healthGate: warnQuality.global_memory_health_gate },
  };
}
