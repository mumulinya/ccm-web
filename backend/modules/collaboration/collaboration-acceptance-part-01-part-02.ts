// Behavior-freeze split from collaboration-acceptance-part-01.ts (part 2/2).
// Behavior-freeze split from collaboration-acceptance.ts (part 1/2).
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
  buildApiMicrocompactReceiptVisibleSummary,
  buildGlobalMemoryHealthGateVisibleSummary,
  buildGlobalMemoryReceiptVisibleSummary,
  buildMemoryGateVisibleSummary,
  buildPostCompactDispatchMarkerVisibleSummary,
  buildPostCompactReinjectionGateVisibleSummary,
  buildReadPlanRevalidationGateVisibleSummary,
  buildRuntimeKernelSnapshot,
  buildTaskExecutionResult,
  buildTeamShutdownGate,
  buildTestAgentReviewRecheckFollowUp,
  changeLooksHighRiskForIndependentReview,
  collectIndependentReviewEvidence,
  collectProjectPolicyViolations,
  collectRuntimeToolingFromSources,
  collectTaskActualFileChanges,
  collectTaskApiMicrocompactEditPlans,
  collectTaskAssignmentEvidence,
  collectTaskCoordinationPlans,
  collectTaskGlobalMemoryHealthGates,
  collectTaskGlobalMemoryReceiptGates,
  collectTaskMemoryDispatchFreshnessGates,
  collectTaskPostCompactDispatchMarkers,
  collectTaskPostCompactReinjectionGates,
  collectTaskReadPlanRevalidationGates,
  collectTaskReworkEvidence,
  collectTaskTypedMemoryConsumptionRows,
  collectTaskTypedMemoryPressureRecallUsageRows,
  evaluateChildAgentHandoffQuality,
  evaluateReceiptApiMicrocompactEditPlan,
  evaluateReceiptGlobalMemoryHealthGate,
  evaluateReceiptGlobalMemoryUsageGate,
  evaluateReceiptMemoryDispatchGate,
  evaluateReceiptPostCompactReinjectionGate,
  findLatestTestAgentReviewReceipt,
  getProjectAgentCapabilityProfile,
  getReceiptIndependentReviewSubject,
  getReceiptTestAgentHandoff,
  getRequiredVerificationCoverage,
  getTaskAgentMemoryContextSnapshotSources,
  getTaskById,
  getVerificationEvidenceGate,
  hasDailyDevContinuationGaps,
  hasStrongTaskAcceptanceEvidence,
  inferIndependentReviewSubject,
  isAdvisoryNeed,
  isCoordinatorTestAgentName,
  isReviewLikeAgentName,
  normalizeMemoryGateAgent,
  normalizeStringArray,
  parseFormattedReceiptsFromText,
  runtimeToolDispatchBlockedMessage,
  summarizeTaskAgentMemoryContextSnapshot,
  taskChangeNeedsIndependentReview,
  taskRequiresAgentQa,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  testAgentStatusToReceiptStatus,
  uniqueStrings,
} from "./collaboration";

import {
  buildAcceptanceGate,
  buildIndependentReviewGate,
  scoreChildAgentReceipt,
  selectLatestDurableReceipts,
} from "./collaboration-acceptance-part-01-part-01";

export function buildDeliverySummary(task: any, execution: any, finalStatus: string) {
  const latestTask = task?.id ? loadTasks().find((item: any) => item.id === task.id) : null;
  task = latestTask ? { ...task, ...latestTask } : task;
  const executionText = execution?.report || execution?.result || "";
  const kernelExecutions = task?.id ? listExecutions({ taskId: task.id }) : [];
  const receiptCandidates = [
    ...kernelExecutions.map((record: any) => record.receipt).filter(Boolean),
    ...(execution?.reviewReceipt ? [execution.reviewReceipt] : []),
    ...(execution?.review_receipt ? [execution.review_receipt] : []),
    ...(execution?.independentReviewReceipt ? [execution.independentReviewReceipt] : []),
    ...(execution?.independent_review_receipt ? [execution.independent_review_receipt] : []),
    ...(execution?.receipt ? [execution.receipt] : []),
    ...parseFormattedReceiptsFromText(executionText),
  ].filter(Boolean);
  // Execution entities contain the newest durable receipt for each Worker.
  // Historical blocked/missing receipts must not override a later done receipt,
  // while a same-session rework receipt may reuse its already-approved ACK.
  const receipts = selectLatestDurableReceipts(receiptCandidates);
  const actualFileChanges = collectTaskActualFileChanges(task, execution);
  const coordinationPlans = collectTaskCoordinationPlans(task, execution);
  const latestCoordinationPlan = coordinationPlans[coordinationPlans.length - 1] || null;
  const assignmentEvidence = collectTaskAssignmentEvidence(task, execution);
  const dependencyEvidence = assignmentEvidence.filter((item: any) => item.dependsOn);
  const continuationEvidence = assignmentEvidence.filter((item: any) => item.rework || item.continuationStrategy);
  const reworkEvidence = collectTaskReworkEvidence(task, execution);
  const workerNotifications = parseTaskNotificationsFromText(executionText);
  const agents = uniqueStrings(
    receipts.map((receipt: any) => receipt.agent),
    workerNotifications.map((item: any) => item.task_id),
    assignmentEvidence.map((item: any) => item.project)
  );
  const actualFilePaths = uniqueStrings(actualFileChanges.map((file: any) => file.path));
  const filesChanged = uniqueStrings(...receipts.map((receipt: any) => receipt.filesChanged), actualFilePaths);
  const verification = uniqueStrings(...receipts.map((receipt: any) => receipt.verification));
  const verificationGate = getVerificationEvidenceGate(receipts);
  const requiredVerificationCoverage = getRequiredVerificationCoverage(receipts);
  const externalRunnerVerification = uniqueStrings(
    ...receipts.map((receipt: any) => (receipt.verification || []).filter(
      (item: any) => /passed by external runner\s*\(exit 0\)/i.test(String(item))
    ))
  );
  const projectAgentProfiles = agents
    .map((agent: string) => getProjectAgentCapabilityProfile(agent))
    .filter((profile: any) => profile.configured);
  const policyEvidenceExclusions = uniqueStrings(
    Array.isArray(task?.policy_evidence_exclusions) ? task.policy_evidence_exclusions : [],
    task?.workflow_meta?.smoke_test && task?.workflow_meta?.smoke_file ? [task.workflow_meta.smoke_file] : []
  );
  const projectPolicyViolations = collectProjectPolicyViolations(actualFileChanges, policyEvidenceExclusions);
  const blockers = uniqueStrings(...receipts.map((receipt: any) => receipt.blockers));
  if (projectPolicyViolations.length) blockers.push(...projectPolicyViolations.map((item: any) => item.message));
  const needs = uniqueStrings(...receipts.map((receipt: any) => receipt.needs));
  const executionDetail = String(execution?.detail || "").trim();
  const executionDetailConfirmsCompletion = /(?:主\s*Agent|协调(?:者|Agent)|任务|最终)?\s*(?:复盘|验收|检查)?\s*(?:判定|确认)?\s*(?:已)?完成|(?:复盘|验收).{0,12}(?:通过|完成)/i.test(executionDetail);
  if (finalStatus !== "done" && executionDetail && !executionDetailConfirmsCompletion && !needs.length && !blockers.length) {
    needs.push(executionDetail);
  }
  const actions = uniqueStrings(...receipts.map((receipt: any) => receipt.actions));
  const advisoryNeeds = needs.filter((item: any) => isAdvisoryNeed(item, task));
  const blockingNeeds = needs.filter((item: any) => !advisoryNeeds.includes(item));
  const receiptStatuses = receipts.map((receipt: any) => ({
    agent: receipt.agent,
    status: receipt.status,
    summary: receipt.summary || "",
    taskAgentSessionId: receipt.taskAgentSessionId || receipt.task_agent_session_id || "",
    task_agent_session_id: receipt.task_agent_session_id || receipt.taskAgentSessionId || "",
    nativeSessionId: receipt.nativeSessionId || receipt.native_session_id || "",
    native_session_id: receipt.native_session_id || receipt.nativeSessionId || "",
    memoryContextSnapshotId: receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "",
    memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
    memoryContextSnapshotChecksum: receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "",
    memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "",
    workerContextPacketId: receipt.workerContextPacketId || receipt.worker_context_packet_id || "",
    worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
    agentType: receipt.agentType || receipt.agent_type || "",
    agent_type: receipt.agent_type || receipt.agentType || "",
    executionId: receipt.executionId || receipt.execution_id || "",
    execution_id: receipt.execution_id || receipt.executionId || "",
    memoryUsed: Array.isArray(receipt.memoryUsed) ? receipt.memoryUsed.slice(0, 12) : [],
    memoryIgnored: Array.isArray(receipt.memoryIgnored) ? receipt.memoryIgnored.slice(0, 12) : [],
    typedMemoryUsage: Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
      ? (receipt.typedMemoryUsage || receipt.typed_memory_usage).slice(0, 40)
      : [],
    globalMemoryUsage: Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
      ? (receipt.globalMemoryUsage || receipt.global_memory_usage).slice(0, 20)
      : [],
    apiMicrocompactUsage: Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage)
      ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage).slice(0, 20)
      : [],
    apiMicrocompactNativeApplyRequestTelemetry: Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
      ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry).slice(0, 20)
      : [],
    postCompactCandidateUsage: Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage).slice(0, 20) : [],
  }));
  const receiptEvidence = receipts.map((receipt: any) => ({
    agent: receipt.agent || "",
    status: receipt.status || "",
    summary: String(receipt.summary || "").slice(0, 800),
    taskAgentSessionId: receipt.taskAgentSessionId || receipt.task_agent_session_id || "",
    task_agent_session_id: receipt.task_agent_session_id || receipt.taskAgentSessionId || "",
    nativeSessionId: receipt.nativeSessionId || receipt.native_session_id || "",
    native_session_id: receipt.native_session_id || receipt.nativeSessionId || "",
    memoryContextSnapshotId: receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "",
    memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
    memoryContextSnapshotChecksum: receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "",
    memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "",
    workerContextPacketId: receipt.workerContextPacketId || receipt.worker_context_packet_id || "",
    worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
    agentType: receipt.agentType || receipt.agent_type || "",
    agent_type: receipt.agent_type || receipt.agentType || "",
    executionId: receipt.executionId || receipt.execution_id || "",
    execution_id: receipt.execution_id || receipt.executionId || "",
    traceId: receipt.traceId || receipt.trace_id || "",
    trace_id: receipt.trace_id || receipt.traceId || "",
    actions: Array.isArray(receipt.actions) ? receipt.actions.slice(0, 20) : [],
    filesChanged: Array.isArray(receipt.filesChanged) ? receipt.filesChanged.slice(0, 50) : [],
    verification: Array.isArray(receipt.verification) ? receipt.verification.slice(0, 30) : [],
    ack: receipt.ack || null,
    contractChanges: Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes).slice(0, 12) : [],
    independentReview: Array.isArray(receipt.independentReview || receipt.independent_review || receipt.codeReview || receipt.code_review)
      ? (receipt.independentReview || receipt.independent_review || receipt.codeReview || receipt.code_review).slice(0, 8)
      : [],
    reviewer: receipt.reviewer || "",
    role: receipt.role || "",
    consumedInjectionIds: normalizeStringArray(receipt.consumedInjectionIds || receipt.consumed_injection_ids || receipt.contractInjectionConsumed || receipt.contract_injection_consumed).slice(0, 20),
    contractConsumption: Array.isArray(receipt.contractConsumption || receipt.contract_consumption) ? (receipt.contractConsumption || receipt.contract_consumption).slice(0, 20) : [],
    invokedSkills: Array.isArray(receipt.invokedSkills || receipt.invoked_skills) ? (receipt.invokedSkills || receipt.invoked_skills).slice(0, 20) : [],
    runtimeToolSnapshot: receipt.runtimeToolSnapshot || receipt.runtime_tool_snapshot || null,
    memoryUsed: Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used).slice(0, 20) : [],
    memoryIgnored: Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored).slice(0, 20) : [],
    typedMemoryUsage: Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
      ? (receipt.typedMemoryUsage || receipt.typed_memory_usage).slice(0, 80)
      : [],
    memoryContextUsage: receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || receipt.memoryContextUsage || receipt.memory_context_usage || null,
    agentMemoryContextUsage: receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || receipt.memoryContextUsage || receipt.memory_context_usage || null,
    memoryFactCitations: Array.isArray(receipt.memoryFactCitations || receipt.memory_fact_citations)
      ? (receipt.memoryFactCitations || receipt.memory_fact_citations).slice(0, 20)
      : [],
    globalMemoryUsage: Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
      ? (receipt.globalMemoryUsage || receipt.global_memory_usage).slice(0, 40)
      : [],
    apiMicrocompactUsage: Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage)
      ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage).slice(0, 40)
      : [],
    apiMicrocompactNativeApplyRequestTelemetry: Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
      ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry).slice(0, 40)
      : [],
    postCompactCandidateUsage: Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage).slice(0, 40) : [],
    postReviewSpotCheck: receipt.postReviewSpotCheck || receipt.post_review_spot_check || null,
    post_review_spot_check: receipt.post_review_spot_check || receipt.postReviewSpotCheck || null,
    postReviewSpotCheckSummary: receipt.postReviewSpotCheckSummary || receipt.post_review_spot_check_summary || null,
    post_review_spot_check_summary: receipt.post_review_spot_check_summary || receipt.postReviewSpotCheckSummary || null,
    testAgentReport: receipt.testAgentReport || receipt.test_agent_report || null,
    test_agent_report: receipt.test_agent_report || receipt.testAgentReport || null,
    blockers: Array.isArray(receipt.blockers) ? receipt.blockers.slice(0, 20) : [],
    needs: Array.isArray(receipt.needs) ? receipt.needs.slice(0, 20) : [],
  }));
  const implementationReceiptEvidence = receiptEvidence.filter((receipt: any) =>
    !isCoordinatorTestAgentName(receipt.agent)
    && String(receipt.role || "").toLowerCase() !== "independent_verifier"
  );
  const memoryUsageEvidence = receiptEvidence
    .filter((receipt: any) => receipt.memoryUsed?.length || receipt.memoryIgnored?.length)
    .map((receipt: any) => ({
      agent: receipt.agent,
      used: receipt.memoryUsed || [],
      ignored: receipt.memoryIgnored || [],
    }));
  const taskSessions = task?.id ? listTaskAgentSessions({ taskId: task.id }) : [];
  const taskAgentMemoryContextSnapshots = task?.id ? listTaskAgentMemoryContextSnapshots({ taskId: task.id }) : [];
  const taskAgentMemoryContextSnapshotRows = taskAgentMemoryContextSnapshots.map(summarizeTaskAgentMemoryContextSnapshot);
  const providerToolAccessEvidence = task?.group_id && task?.id
    ? getGroupMessages(task.group_id, task.group_session_id || task.groupSessionId || "default")
      .filter((message: any) => message?.task_id === task.id)
      .map((message: any) => message.providerToolAccessEvidence || message.provider_tool_access_evidence)
      .filter(Boolean)
    : [];
  const memoryGateCollectionContext = {
    assignmentEvidence,
    execution,
    assignments: execution?.assignments || [],
    taskAgentMemoryContextSnapshots,
    task_agent_memory_context_snapshots: taskAgentMemoryContextSnapshots,
    providerToolAccessEvidence,
    provider_tool_access_evidence: providerToolAccessEvidence,
  };
  const belongsToImplementationAgent = (item: any) => !isCoordinatorTestAgentName(item?.target_project || item?.targetProject || item?.project || "");
  const memoryDispatchGates = collectTaskMemoryDispatchFreshnessGates(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const globalMemoryReceiptGates = collectTaskGlobalMemoryReceiptGates(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const globalMemoryHealthGates = collectTaskGlobalMemoryHealthGates(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const readPlanRevalidationGates = collectTaskReadPlanRevalidationGates(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const postCompactReinjectionGates = collectTaskPostCompactReinjectionGates(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const apiMicrocompactEditPlans = collectTaskApiMicrocompactEditPlans(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
  const postCompactDispatchMarkers = collectTaskPostCompactDispatchMarkers(task, memoryGateCollectionContext);
  const receiptQuality = implementationReceiptEvidence.map((receipt: any) => ({
    agent: receipt.agent || "",
    status: receipt.status || "",
    ...(() => {
      const quality = scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, taskAgentMemoryContextSnapshots, assignmentEvidence, execution });
      return {
        score: quality.score,
        grade: quality.grade,
        pass: quality.pass,
        missing: quality.missing,
        checks: quality.checks,
        task_agent_memory_snapshot: quality.task_agent_memory_snapshot,
        memory_gate: quality.memory_gate,
        global_memory_gate: quality.global_memory_gate,
        global_memory_health_gate: quality.global_memory_health_gate,
        read_plan_revalidation_gate: quality.read_plan_revalidation_gate,
        post_compact_reinjection_gate: quality.post_compact_reinjection_gate,
        api_microcompact: quality.api_microcompact,
      };
    })(),
  }));
  const doneReceiptQuality = receiptQuality.filter((item: any) => item.status === "done");
  const receiptQualityGatePassed = !taskRequiresCodeChanges(task) && !taskRequiresVerification(task)
    ? true
    : doneReceiptQuality.length > 0 && doneReceiptQuality.every((item: any) => item.grade === "good");
  const taskAgentMemorySnapshotReceiptRows = receiptQuality.filter((item: any) => item.task_agent_memory_snapshot?.required);
  const taskAgentMemorySnapshotReceiptPassed = taskAgentMemoryContextSnapshots.length === 0 || (taskAgentMemorySnapshotReceiptRows.length > 0 && taskAgentMemorySnapshotReceiptRows.every((item: any) => item.task_agent_memory_snapshot?.pass === true));
  const memoryGateReceiptRows = receiptQuality.filter((item: any) => item.memory_gate?.required);
  const memoryGateReceiptPassed = memoryDispatchGates.length === 0 || (memoryGateReceiptRows.length > 0 && memoryGateReceiptRows.every((item: any) => item.memory_gate?.pass === true));
  const globalMemoryReceiptRows = receiptQuality.filter((item: any) => item.global_memory_gate?.required);
  const globalMemoryReceiptPassed = globalMemoryReceiptGates.length === 0 || (globalMemoryReceiptRows.length > 0 && globalMemoryReceiptRows.every((item: any) => item.global_memory_gate?.pass === true));
  const globalMemoryHealthGateReceiptRows = receiptQuality.filter((item: any) => item.global_memory_health_gate?.required);
  const globalMemoryHealthGateReceiptPassed = globalMemoryHealthGates.length === 0 || (globalMemoryHealthGateReceiptRows.length > 0 && globalMemoryHealthGateReceiptRows.every((item: any) => item.global_memory_health_gate?.pass === true));
  const readPlanRevalidationGateReceiptRows = receiptQuality.filter((item: any) => item.read_plan_revalidation_gate?.required);
  const requiredReadPlanRevalidationGates = readPlanRevalidationGates.filter((gate: any) =>
    gate.status === "required"
    || Number(gate.required_count || 0) > 0
    || (gate.required_read_plan_ids || []).length > 0
  );
  const readPlanRevalidationGateReceiptPassed = requiredReadPlanRevalidationGates.length === 0
    || (readPlanRevalidationGateReceiptRows.length > 0 && readPlanRevalidationGateReceiptRows.every((item: any) => item.read_plan_revalidation_gate?.pass === true));
  const postCompactReinjectionGateReceiptRows = receiptQuality.filter((item: any) => item.post_compact_reinjection_gate?.required);
  const postCompactReinjectionGateReceiptPassed = postCompactReinjectionGates.length === 0 || (postCompactReinjectionGateReceiptRows.length > 0 && postCompactReinjectionGateReceiptRows.every((item: any) => item.post_compact_reinjection_gate?.pass === true));
  const apiMicrocompactReceiptRows = receiptQuality.filter((item: any) => item.api_microcompact?.required);
  const requiredApiMicrocompactEditPlans = apiMicrocompactEditPlans.filter((plan: any) => Number(plan.edit_count || 0) > 0 || plan.recommended === true);
  const apiMicrocompactReceiptPassed = requiredApiMicrocompactEditPlans.length === 0
    || (apiMicrocompactReceiptRows.length > 0 && apiMicrocompactReceiptRows.every((item: any) => item.api_microcompact?.pass === true));
  const memoryGateSummary = buildMemoryGateVisibleSummary({
    memory_dispatch_gates: memoryDispatchGates,
    memory_dispatch_gate_count: memoryDispatchGates.length,
    memory_gate_receipt_passed: memoryGateReceiptPassed,
    memory_gate_receipt_rows: memoryGateReceiptRows,
  });
  const globalMemoryReceiptSummary = buildGlobalMemoryReceiptVisibleSummary({
    global_memory_receipt_gates: globalMemoryReceiptGates,
    global_memory_receipt_gate_count: globalMemoryReceiptGates.length,
    global_memory_receipt_passed: globalMemoryReceiptPassed,
    global_memory_receipt_rows: globalMemoryReceiptRows,
  });
  const globalMemoryHealthGateSummary = buildGlobalMemoryHealthGateVisibleSummary({
    global_memory_health_gates: globalMemoryHealthGates,
    global_memory_health_gate_count: globalMemoryHealthGates.length,
    global_memory_health_gate_receipt_passed: globalMemoryHealthGateReceiptPassed,
    global_memory_health_gate_receipt_rows: globalMemoryHealthGateReceiptRows,
  });
  const readPlanRevalidationGateSummary = buildReadPlanRevalidationGateVisibleSummary({
    read_plan_revalidation_gates: readPlanRevalidationGates,
    read_plan_revalidation_gate_count: readPlanRevalidationGates.length,
    read_plan_revalidation_gate_receipt_passed: readPlanRevalidationGateReceiptPassed,
    read_plan_revalidation_gate_receipt_rows: readPlanRevalidationGateReceiptRows,
  });
  const postCompactReinjectionGateSummary = buildPostCompactReinjectionGateVisibleSummary({
    post_compact_reinjection_gates: postCompactReinjectionGates,
    post_compact_reinjection_gate_count: postCompactReinjectionGates.length,
    post_compact_reinjection_gate_receipt_passed: postCompactReinjectionGateReceiptPassed,
    post_compact_reinjection_gate_receipt_rows: postCompactReinjectionGateReceiptRows,
  });
  const apiMicrocompactReceiptSummary = buildApiMicrocompactReceiptVisibleSummary({
    api_microcompact_edit_plans: apiMicrocompactEditPlans,
    api_microcompact_edit_plan_count: apiMicrocompactEditPlans.length,
    api_microcompact_receipt_passed: apiMicrocompactReceiptPassed,
    api_microcompact_receipt_rows: apiMicrocompactReceiptRows,
  });
  const apiMicrocompactNativeApplyRequestTelemetryLedger = recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(task?.group_id || task?.groupId || "", {
    groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    receipts: receiptEvidence,
    generatedAt: new Date().toISOString(),
  });
  const apiMicrocompactNativeApplyProofLedger = recordGroupApiMicrocompactNativeApplyProofLedger(task?.group_id || task?.groupId || "", {
    groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    finalStatus,
    receiptRows: apiMicrocompactReceiptRows,
    generatedAt: new Date().toISOString(),
  });
  const postCompactCandidateUsageLedger = recordGroupPostCompactCandidateUsageLedger(task?.group_id || task?.groupId || "", {
    groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    receiptRows: postCompactReinjectionGateReceiptRows,
    generatedAt: new Date().toISOString(),
  });
  const typedMemoryConsumptionRows = collectTaskTypedMemoryConsumptionRows(task, receiptEvidence, memoryGateCollectionContext);
  const typedMemoryConsumptionLedger = recordGroupTypedMemoryConsumptionLedger(getGroupSessionMemoryScopeId(
    task?.group_id || task?.groupId || "",
    task?.group_session_id || task?.groupSessionId || "default"
  ), {
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    rows: typedMemoryConsumptionRows,
    generatedAt: new Date().toISOString(),
  });
  const typedMemorySelectorConsumption = recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(getGroupSessionMemoryScopeId(
    task?.group_id || task?.groupId || "",
    task?.group_session_id || task?.groupSessionId || ""
  ), {
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    rows: typedMemoryConsumptionRows,
    receipts: receiptEvidence,
    generatedAt: new Date().toISOString(),
  });
  const typedMemoryStaleCandidateLedger = recordGroupTypedMemoryStaleCandidates(getGroupSessionMemoryScopeId(
    task?.group_id || task?.groupId || "",
    task?.group_session_id || task?.groupSessionId || "default"
  ), {
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    rows: typedMemoryConsumptionRows,
    generatedAt: new Date().toISOString(),
  });
  const typedMemoryPressureRecallUsageRows = collectTaskTypedMemoryPressureRecallUsageRows(task, receiptEvidence, memoryGateCollectionContext);
  const typedMemoryPressureRecallUsageLedger = recordGroupTypedMemoryPressureRecallUsageLedger(getGroupSessionMemoryScopeId(
    task?.group_id || task?.groupId || "",
    task?.group_session_id || task?.groupSessionId || "default"
  ), {
    targetProject: task?.target_project || task?.targetProject || "",
    taskId: task?.id || "",
    executionId: execution?.id || execution?.execution_id || "",
    rows: typedMemoryPressureRecallUsageRows,
    generatedAt: new Date().toISOString(),
  });
  const postCompactDispatchMarkerSummary = buildPostCompactDispatchMarkerVisibleSummary({
    post_compact_dispatch_markers: postCompactDispatchMarkers,
    post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
  });
  const ackReviewForGate = buildAckPreflightReview(task, implementationReceiptEvidence, assignmentEvidence
    .filter((item: any) => !isCoordinatorTestAgentName(item.project))
    .map((item: any) => ({ project: item.project, objective: item.task })));
  const ackGatePassed = !(taskRequiresCodeChanges(task) || taskRequiresVerification(task))
    || (ackReviewForGate.status === "approved" && !ackReviewForGate.rejected?.length);
  const contractSyncForGate = extractContractSyncHints(task, {
    receipts: receiptEvidence,
    assignment_evidence: assignmentEvidence,
  });
  const contractTransferForGate = buildContractTransferPlan(
    contractSyncForGate,
    assignmentEvidence.map((item: any) => ({ project: item.project, objective: item.task }))
  );
  const contractInjectionGate = evaluateContractInjectionGate(contractTransferForGate.rows || [], assignmentEvidence, receiptEvidence);
  const review = execution?.review || null;
  const reviewStatus = review?.status || "";
  const taskAgentQa = getAgentQaItemsForGroup(String(task?.group_id || task?.groupId || ""), 120)
    .filter((item: any) => !task?.id || !item.task_id || item.task_id === task.id)
    .map((item: any) => ({
      id: item.id,
      from_agent: item.from_agent,
      to_agent: item.to_agent,
      type: item.type,
      status: item.status,
      question: item.question,
      answer: item.answer,
      blocking: item.blocking !== false,
      execution_id: item.execution_id || "",
      deadline_at: item.deadline_at || item.timeout_at || "",
      evidence: item.evidence || [],
      answer_evidence: item.answer_evidence || [],
      routing: item.routing || null,
      admission: item.admission || null,
      acceptance: item.acceptance || null,
      permission_contract: item.permission_contract || null,
      permission_boundary: item.permission_boundary || null,
      arbitration: item.arbitration || null,
      timeout_at: item.timeout_at || "",
      injected_at: item.injected_at || "",
      resumed_at: item.resumed_at || "",
      retry_count: Number(item.retry_count || 0),
      manual_takeover: !!item.manual_takeover,
    }));
  const openAgentQa = taskAgentQa.filter((item: any) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || "")));
  const resolvedAgentQa = taskAgentQa.filter((item: any) => ["answered", "injected", "resumed"].includes(String(item.status || "")));
  const acceptedAgentQa = taskAgentQa.filter((item: any) => item.acceptance?.accepted === true);
  const resumedAgentQa = taskAgentQa.filter((item: any) => item.status === "resumed" || item.resumed_at);
  const agentQaRequired = taskRequiresAgentQa(task);
  const independentReviewGate = buildIndependentReviewGate(task, actualFileChanges, receiptEvidence, taskAgentQa);
  const postReviewSpotCheckGate = buildPostReviewSpotCheckGate({
    required: independentReviewGate.required && independentReviewGate.pass,
    receipts: receiptEvidence,
  });
  const independentVerificationSourcePassed = independentReviewGate.pass === true
    && postReviewSpotCheckGate.pass === true;
  const headline = finalStatus === "done"
    ? "已完成最终验收"
    : finalStatus === "failed"
      ? "任务执行失败"
      : "任务仍需继续推进";
  const sessionContinuity = taskSessions.map((session: any) => ({
    id: session.id,
    project: session.project,
    executor: session.agentType,
    native_session_id: session.nativeSessionId || "",
    resume_mode: session.resumeMode,
    status: session.status,
    turn_count: Number(session.turnCount || 0),
    last_turn_succeeded: session.lastTurnSucceeded,
    degraded: session.resumeMode === "scratchpad" && getTaskAgentSessionContinuity(session).degraded,
    reason: session.lastError || session.closeReason || "",
    memory_context_snapshot_id: session.memoryContextSnapshotId || "",
    memory_context_snapshot_checksum: session.memoryContextSnapshotChecksum || "",
    memory_context_packet_id: session.memoryContextPacketId || "",
  }));
  const workItemTask = {
    ...task,
    status: finalStatus === "done" ? "done" : task?.status,
    delivery_summary: {
      ...(task?.delivery_summary || {}),
      assignment_evidence: assignmentEvidence,
      receipts: receiptEvidence,
      receipt_statuses: receiptStatuses,
    },
  };
  const deliveryWorkItems = buildMainAgentWorkItems(workItemTask, { executions: kernelExecutions });
  const deliveryWorkItemSummary = buildMainAgentWorkItemSummary(deliveryWorkItems);
  const teamShutdown = buildTeamShutdownGate(finalStatus, sessionContinuity, deliveryWorkItems, deliveryWorkItemSummary);
  const lifecycleState = task?.status === "cancelled" ? "cancelled"
    : finalStatus === "done" ? "completed"
      : finalStatus === "failed" ? "failed"
        : openAgentQa.length ? "waiting_dependency"
          : reworkEvidence.length ? "rework"
            : task?.status === "pending" || task?.status === "queued" ? "queued"
              : review ? "reviewing" : "executing";

  const summary: any = {
    headline,
    status: finalStatus,
    detail: execution?.detail || "",
    workflow_type: task?.workflow_type || "general",
    business_goal: task?.business_goal || task?.title || "",
    coordination_plans: coordinationPlans,
    latest_coordination_plan: latestCoordinationPlan,
    coordination_plan_count: coordinationPlans.length,
    assignment_evidence: assignmentEvidence,
    assignment_count: assignmentEvidence.length,
    dependency_evidence: dependencyEvidence,
    dependency_count: dependencyEvidence.length,
    continuation_evidence: continuationEvidence,
    continuation_count: continuationEvidence.length,
    rework_evidence: reworkEvidence,
    rework_count: reworkEvidence.length,
    has_rework_evidence: reworkEvidence.length > 0,
    requires_code_changes: taskRequiresCodeChanges(task),
    requires_verification: taskRequiresVerification(task),
    agents,
    project_agent_profiles: projectAgentProfiles,
    policy_evidence_exclusions: policyEvidenceExclusions,
    project_policy_violations: projectPolicyViolations,
    project_policy_gate_passed: projectPolicyViolations.length === 0,
    worker_notifications: workerNotifications,
    worker_notification_count: workerNotifications.length,
    worker_notification_statuses: workerNotifications.map((item: any) => ({
      task_id: item.task_id,
      status: item.status,
      receipt_status: item.receipt_status,
      summary: item.summary,
    })),
    agent_qa: taskAgentQa,
    agent_qa_count: taskAgentQa.length,
    agent_qa_open_count: openAgentQa.length,
    agent_qa_resolved_count: resolvedAgentQa.length,
    agent_qa_has_open_items: openAgentQa.length > 0,
    agent_qa_required: agentQaRequired,
    agent_qa_accepted_count: acceptedAgentQa.length,
    agent_qa_resumed_count: resumedAgentQa.length,
    agent_qa_gate_passed: !agentQaRequired || (acceptedAgentQa.length > 0 && resumedAgentQa.length > 0),
    sandbox_rehearsal: task?.workflow_meta?.sandbox_rehearsal || task?.sandbox_rehearsal || execution?.sandbox_rehearsal || null,
    timeline: getTaskTimeline(task, execution),
    receipt_statuses: receiptStatuses,
    receipts: receiptEvidence,
    receipt_quality: receiptQuality,
    receipt_quality_gate_passed: receiptQualityGatePassed,
    weak_receipt_quality: receiptQuality.filter((item: any) => item.grade !== "good"),
    ack_review: ackReviewForGate,
    ack_gate_passed: ackGatePassed,
    contract_sync: contractSyncForGate,
    contract_transfer: contractTransferForGate,
    contract_injection_required: contractTransferForGate.required === true,
    contract_injection_status: contractInjectionGate.status,
    contract_injection_rows: contractInjectionGate.rows,
    contract_injection_gate: contractInjectionGate,
    contract_injection_gate_passed: contractInjectionGate.pass,
    memory_usage: memoryUsageEvidence,
    memory_usage_count: memoryUsageEvidence.length,
    memory_usage_declared: memoryUsageEvidence.some((item: any) => item.used?.length),
    task_agent_memory_context_snapshots: taskAgentMemoryContextSnapshotRows,
    task_agent_memory_context_snapshot_count: taskAgentMemoryContextSnapshotRows.length,
    task_agent_memory_snapshot_receipt_passed: taskAgentMemorySnapshotReceiptPassed,
    task_agent_memory_snapshot_receipt_rows: taskAgentMemorySnapshotReceiptRows,
    memory_dispatch_gates: memoryDispatchGates,
    memory_dispatch_gate_count: memoryDispatchGates.length,
    memory_gate_receipt_passed: memoryGateReceiptPassed,
    memory_gate_receipt_rows: memoryGateReceiptRows,
    memory_gate_summary: memoryGateSummary,
    global_memory_receipt_gates: globalMemoryReceiptGates,
    global_memory_receipt_gate_count: globalMemoryReceiptGates.length,
    global_memory_receipt_passed: globalMemoryReceiptPassed,
    global_memory_receipt_rows: globalMemoryReceiptRows,
    global_memory_receipt_summary: globalMemoryReceiptSummary,
    global_memory_health_gates: globalMemoryHealthGates,
    global_memory_health_gate_count: globalMemoryHealthGates.length,
    global_memory_health_gate_receipt_passed: globalMemoryHealthGateReceiptPassed,
    global_memory_health_gate_receipt_rows: globalMemoryHealthGateReceiptRows,
    global_memory_health_gate_summary: globalMemoryHealthGateSummary,
    read_plan_revalidation_gates: readPlanRevalidationGates,
    read_plan_revalidation_gate_count: readPlanRevalidationGates.length,
    read_plan_revalidation_gate_receipt_passed: readPlanRevalidationGateReceiptPassed,
    read_plan_revalidation_gate_receipt_rows: readPlanRevalidationGateReceiptRows,
    read_plan_revalidation_gate_summary: readPlanRevalidationGateSummary,
    post_compact_reinjection_gates: postCompactReinjectionGates,
    post_compact_reinjection_gate_count: postCompactReinjectionGates.length,
    post_compact_reinjection_gate_receipt_passed: postCompactReinjectionGateReceiptPassed,
    post_compact_reinjection_gate_receipt_rows: postCompactReinjectionGateReceiptRows,
    post_compact_reinjection_gate_summary: postCompactReinjectionGateSummary,
    api_microcompact_edit_plans: apiMicrocompactEditPlans,
    api_microcompact_edit_plan_count: apiMicrocompactEditPlans.length,
    api_microcompact_receipt_passed: apiMicrocompactReceiptPassed,
    api_microcompact_receipt_rows: apiMicrocompactReceiptRows,
    api_microcompact_receipt_summary: apiMicrocompactReceiptSummary,
    api_microcompact_native_apply_request_telemetry_ledger: apiMicrocompactNativeApplyRequestTelemetryLedger,
    api_microcompact_native_apply_request_telemetry_ledger_file: apiMicrocompactNativeApplyRequestTelemetryLedger?.file || "",
    api_microcompact_native_apply_proof_ledger: apiMicrocompactNativeApplyProofLedger,
    api_microcompact_native_apply_proof_ledger_file: apiMicrocompactNativeApplyProofLedger?.file || "",
    post_compact_candidate_usage_ledger: postCompactCandidateUsageLedger,
    post_compact_candidate_usage_ledger_file: postCompactCandidateUsageLedger?.file || "",
    typed_memory_pressure_recall_usage_rows: typedMemoryPressureRecallUsageRows,
    typed_memory_pressure_recall_usage_count: typedMemoryPressureRecallUsageRows.length,
    typed_memory_pressure_recall_usage_ledger: typedMemoryPressureRecallUsageLedger,
    typed_memory_pressure_recall_usage_ledger_file: typedMemoryPressureRecallUsageLedger?.file || "",
    typed_memory_consumption_rows: typedMemoryConsumptionRows,
    typed_memory_consumption_count: typedMemoryConsumptionRows.length,
    typed_memory_consumption_ledger: typedMemoryConsumptionLedger,
    typed_memory_consumption_ledger_file: typedMemoryConsumptionLedger?.file || "",
    typed_memory_selector_consumption: typedMemorySelectorConsumption,
    typed_memory_selector_consumption_recorded_count: Number(typedMemorySelectorConsumption?.recordedCount || 0),
    typed_memory_selector_consumption_idempotent_count: Number(typedMemorySelectorConsumption?.idempotentCount || 0),
    typed_memory_selector_consumption_skipped_count: Number(typedMemorySelectorConsumption?.skippedCount || 0),
    typed_memory_stale_candidate_ledger: typedMemoryStaleCandidateLedger,
    typed_memory_stale_candidate_ledger_file: typedMemoryStaleCandidateLedger?.file || "",
    post_compact_dispatch_markers: postCompactDispatchMarkers,
    post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
    post_compact_dispatch_marker_summary: postCompactDispatchMarkerSummary,
    actions,
    files_changed: filesChanged,
    actual_file_changes: actualFileChanges,
    actual_file_change_count: actualFileChanges.length,
    has_actual_file_changes: actualFileChanges.length > 0,
    verification,
    verification_executed: verificationGate.executed,
    verification_suggested: verificationGate.suggested,
    verification_failed: verificationGate.failed,
    verification_required: requiredVerificationCoverage.required,
    verification_required_missing: requiredVerificationCoverage.missing,
    verification_required_covered: requiredVerificationCoverage.covered,
    external_runner_verification: externalRunnerVerification,
    external_runner_verification_count: externalRunnerVerification.length,
    verification_sources: [
      ...(externalRunnerVerification.length ? ["external_runner"] : []),
      ...(independentVerificationSourcePassed ? ["test_agent_and_main_agent_spot_check"] : []),
      ...(verificationGate.executed.length > externalRunnerVerification.length ? ["agent_receipt"] : []),
    ],
    verification_source_gate_passed: !taskRequiresVerification(task)
      || externalRunnerVerification.length > 0
      || independentVerificationSourcePassed,
    has_executed_verification: verificationGate.executed.length > 0,
    verification_required_gate_passed: requiredVerificationCoverage.pass,
    verification_gate_passed: verificationGate.pass && requiredVerificationCoverage.pass,
    independent_review_required: independentReviewGate.required,
    independent_review_gate: independentReviewGate,
    independent_review_gate_passed: independentReviewGate.pass,
    independent_review_evidence: independentReviewGate.evidence,
    post_review_spot_check_required: postReviewSpotCheckGate.required,
    post_review_spot_check_gate: postReviewSpotCheckGate,
    post_review_spot_check_gate_passed: postReviewSpotCheckGate.pass,
    post_review_spot_check: postReviewSpotCheckGate.latest,
    post_review_spot_check_summary: postReviewSpotCheckGate.summary,
    blockers,
    needs,
    blocking_needs: blockingNeeds,
    advisory_needs: advisoryNeeds,
    review_status: reviewStatus,
    has_final_review: !!review,
    lifecycle: {
      state: lifecycleState,
      terminal: ["completed", "cancelled"].includes(lifecycleState),
      final_acceptance_required: true,
      session_close_rule: "only_after_final_acceptance_or_explicit_cancel",
    },
    session_continuity: sessionContinuity,
    session_count: sessionContinuity.length,
    native_session_count: sessionContinuity.filter((item: any) => item.resume_mode === "native" && item.native_session_id).length,
    degraded_session_count: sessionContinuity.filter((item: any) => item.degraded).length,
    work_items: deliveryWorkItems,
    work_item_summary: deliveryWorkItemSummary,
    team_shutdown: teamShutdown,
    team_shutdown_gate_passed: teamShutdown.pass,
    runtime_tooling: collectRuntimeToolingFromSources(task, execution, [], receiptEvidence),
    generated_at: new Date().toISOString(),
  };
  summary.runtime_kernel = buildRuntimeKernelSnapshot(task, summary);
  summary.acceptance_gate = buildAcceptanceGate(task, execution, summary, finalStatus);
  summary.acceptance_gate_passed = summary.acceptance_gate.pass;
  summary.reasoning_loop = buildTaskReasoningState(task, summary);
  summary.plan_version = summary.reasoning_loop.plan_version;
  summary.reasoning_deviation_count = summary.reasoning_loop.deviations.length;
  summary.reasoning_open_assertions = summary.reasoning_loop.assertions.filter((item: any) => item.status !== "passed").length;
  summary.timeline_count = Array.isArray(summary.timeline) ? summary.timeline.length : 0;
  summary.delivery_report = buildTaskDeliveryReport(
    task,
    summary,
    finalStatus as any,
    execution?.report || execution?.result || execution?.detail || ""
  );
  summary.user_report = summary.delivery_report.markdown || buildUserDeliveryReport(
    task,
    summary,
    finalStatus as any,
    execution?.report || execution?.result || execution?.detail || ""
  );
  return summary;
}
