// Behavior-freeze split from collaboration-memory-gates-part-01.ts (part 1/2).
// Behavior-freeze split from collaboration-memory-gates.ts (part 1/3).
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
import { normalizeStringArray, uniqueStrings } from "./collaboration";

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
  collectReplayRepairDispatchBriefRefs,
} from "./collaboration-memory-gates-part-03";

export function extractMemoryDispatchFreshnessGateFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.dispatch_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1") return value.dispatch_freshness_gate;
  if (value.memory_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1") return value.memory_freshness_gate;
  if (value.references?.memory_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1") return value.references.memory_freshness_gate;
  if (value.worker_context_packet) return extractMemoryDispatchFreshnessGateFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractMemoryDispatchFreshnessGateFromValue(value.workerContextPacket);
  if (value.memory) return extractMemoryDispatchFreshnessGateFromValue(value.memory);
  if (value.group_memory) return extractMemoryDispatchFreshnessGateFromValue(value.group_memory);
  return null;
}

export function normalizeMemoryGateAgent(value: any) {
  return String(value || "").trim().toLowerCase();
}

export function getTaskAgentMemoryContextSnapshotSources(context: any = {}) {
  return [
    ...(Array.isArray(context.taskAgentMemoryContextSnapshots || context.task_agent_memory_context_snapshots)
      ? (context.taskAgentMemoryContextSnapshots || context.task_agent_memory_context_snapshots)
      : []),
    ...(Array.isArray(context.memoryContextSnapshots || context.memory_context_snapshots)
      ? (context.memoryContextSnapshots || context.memory_context_snapshots)
      : []),
  ].filter((item: any) => item && typeof item === "object");
}

export function forEachTaskAgentMemoryContextSnapshotSource(context: any = {}, visit: (value: any, source: string, fallbackAgent: string) => void) {
  for (const snapshot of getTaskAgentMemoryContextSnapshotSources(context)) {
    const session = snapshot.session || {};
    const ref = snapshot.ref || {};
    const snapshotId = String(snapshot.snapshot_id || snapshot.snapshotId || ref.snapshotId || ref.snapshot_id || "").trim();
    const source = `task_agent_memory_snapshot:${snapshotId || session.id || "unknown"}`;
    const fallbackAgent = String(snapshot.project || snapshot.target_project || session.project || "").trim();
    const snapshotContext = snapshot.context || {};
    const workerContextPacket = snapshotContext.worker_context_packet || snapshotContext.workerContextPacket || snapshot.worker_context_packet || snapshot.workerContextPacket || null;
    const workerHandoff = snapshotContext.worker_handoff || snapshotContext.workerHandoff || snapshot.worker_handoff || snapshot.workerHandoff || null;
    const memoryContext = snapshotContext.memory_context || snapshotContext.memoryContext || snapshot.memory_context || snapshot.memoryContext || workerContextPacket?.memory || null;
    visit(snapshot, source, fallbackAgent);
    visit(workerContextPacket, `${source}:worker_context_packet`, fallbackAgent);
    visit(workerHandoff, `${source}:worker_handoff`, fallbackAgent);
    visit(memoryContext, `${source}:memory_context`, fallbackAgent);
  }
}

export function summarizeTaskAgentMemoryContextSnapshot(snapshot: any = {}) {
  const context = snapshot.context || {};
  const session = snapshot.session || {};
  const groupSessionMemoryBinding = context.group_session_memory_binding || context.groupSessionMemoryBinding || null;
  const deliveryReceipt = snapshot.delivery_receipt || snapshot.deliveryReceipt || null;
  const deliveryReceiptChecksumValid = snapshot.delivery_receipt_checksum_valid === true || snapshot.deliveryReceiptChecksumValid === true;
  const replayRepairDispatchBriefs = collectReplayRepairDispatchBriefRefs(context.worker_context_packet || context.workerContextPacket || {}, {
    project: session.project || "",
    executionId: context.execution_id || context.executionId || "",
  });
  return {
    schema: snapshot.schema || "ccm-task-agent-memory-context-snapshot-v1",
    snapshot_id: snapshot.snapshot_id || snapshot.snapshotId || "",
    snapshot_file: snapshot.snapshot_file || snapshot.snapshotFile || "",
    checksum: snapshot.checksum || "",
    generated_at: snapshot.generated_at || snapshot.generatedAt || "",
    task_agent_session_id: session.id || "",
    task_id: session.task_id || session.taskId || "",
    group_id: session.group_id || session.groupId || "",
    project: session.project || "",
    agent_type: session.agent_type || session.agentType || "",
    native_session_id: session.native_session_id || session.nativeSessionId || "",
    turn: Number(session.turn || 0),
    worker_context_packet_id: context.worker_context_packet_id || context.workerContextPacketId || snapshot.ref?.workerContextPacketId || "",
    worker_handoff_id: context.worker_handoff_id || context.workerHandoffId || snapshot.ref?.workerHandoffId || "",
    memory_context_checksum: context.memory_context_checksum || context.memoryContextChecksum || "",
    rendered_prompt_checksum: context.rendered_prompt_checksum || context.renderedPromptChecksum || "",
    group_session_memory_binding: groupSessionMemoryBinding,
    group_session_id: groupSessionMemoryBinding?.groupSessionId || groupSessionMemoryBinding?.group_session_id || "",
    group_session_scope_id: groupSessionMemoryBinding?.scopeId || groupSessionMemoryBinding?.scope_id || "",
    session_memory_checksum: groupSessionMemoryBinding?.sessionMemoryChecksum || groupSessionMemoryBinding?.session_memory_checksum || "",
    memory_binding_id: groupSessionMemoryBinding?.memoryBindingId || groupSessionMemoryBinding?.memory_binding_id || "",
    model_extraction_execution_id: groupSessionMemoryBinding?.modelExtractionExecutionId || groupSessionMemoryBinding?.model_extraction_execution_id || "",
    model_extraction_receipt_checksum: groupSessionMemoryBinding?.modelExtractionReceiptChecksum || groupSessionMemoryBinding?.model_extraction_receipt_checksum || "",
    model_extraction_history_head_checksum: groupSessionMemoryBinding?.modelExtractionHistoryHeadChecksum || groupSessionMemoryBinding?.model_extraction_history_head_checksum || "",
    model_extraction_replay_status: groupSessionMemoryBinding?.modelExtractionReplayStatus || groupSessionMemoryBinding?.model_extraction_replay_status || "",
    model_extraction_replay_execution_id: groupSessionMemoryBinding?.modelExtractionReplayExecutionId || groupSessionMemoryBinding?.model_extraction_replay_execution_id || "",
    model_extraction_evidence_valid: groupSessionMemoryBinding?.modelExtractionEvidenceValid !== false,
    fact_supersession_graph_checksum: groupSessionMemoryBinding?.factSupersessionGraphChecksum || groupSessionMemoryBinding?.fact_supersession_graph_checksum || "",
    fact_supersession_graph_valid: groupSessionMemoryBinding?.factSupersessionGraphValid === true || groupSessionMemoryBinding?.fact_supersession_graph_valid === true,
    session_lifecycle_fence_required: groupSessionMemoryBinding?.sessionLifecycleFenceRequired === true,
    session_lifecycle_fence_valid: groupSessionMemoryBinding?.sessionLifecycleFenceValid === true,
    session_lifecycle_status: groupSessionMemoryBinding?.sessionLifecycleStatus || groupSessionMemoryBinding?.session_lifecycle_status || "",
    session_lifecycle_generation: Number(groupSessionMemoryBinding?.sessionLifecycleGeneration || groupSessionMemoryBinding?.session_lifecycle_generation || 0),
    session_lifecycle_head_id: groupSessionMemoryBinding?.sessionLifecycleHeadId || groupSessionMemoryBinding?.session_lifecycle_head_id || "",
    session_lifecycle_head_checksum: groupSessionMemoryBinding?.sessionLifecycleHeadChecksum || groupSessionMemoryBinding?.session_lifecycle_head_checksum || "",
    active_fact_count: Array.isArray(groupSessionMemoryBinding?.activeFacts || groupSessionMemoryBinding?.active_facts)
      ? (groupSessionMemoryBinding.activeFacts || groupSessionMemoryBinding.active_facts).length
      : 0,
    delivery_receipt: deliveryReceipt,
    delivery_receipt_checksum_valid: deliveryReceiptChecksumValid,
    memory_context_delivered: deliveryReceipt?.delivered === true && deliveryReceipt?.status === "delivered",
    memory_context_consumption_receipt_required: deliveryReceipt?.memoryContextConsumptionReceiptRequired === true,
    memory_context_consumption_receipt_valid: deliveryReceipt?.memoryContextConsumptionReceiptValid === true,
    memory_context_consumption_receipt_status: String(deliveryReceipt?.memoryContextConsumptionReceiptStatus || ""),
    memory_context_consumption_challenge_id: String(deliveryReceipt?.memoryContextConsumptionChallengeId || context.memory_context_consumption_challenge?.challenge_id || ""),
    memory_context_consumption_receipt_signature: String(deliveryReceipt?.memoryContextConsumptionReceiptSignature || ""),
    memory_context_consumption_recovery_present: deliveryReceipt?.memoryContextConsumptionRecoveryPresent === true,
    memory_context_consumption_recovery_valid: deliveryReceipt?.memoryContextConsumptionRecoveryValid === true,
    memory_context_consumption_recovery_status: String(deliveryReceipt?.memoryContextConsumptionRecoveryStatus || "not_needed"),
    memory_context_consumption_recovery_id: String(deliveryReceipt?.memoryContextConsumptionRecoveryId || ""),
    gate_ids: uniqueStrings(context.gate_ids || context.gateIds || snapshot.ref?.gateIds || snapshot.ref?.gate_ids || []).slice(0, 80),
    replay_repair_dispatch_brief_ids: replayRepairDispatchBriefs.map((brief: any) => brief.brief_id).filter(Boolean),
    replay_repair_dispatch_briefs: replayRepairDispatchBriefs.slice(0, 8),
  };
}

export function evaluateReceiptTaskAgentMemoryContextSnapshot(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-acceptance").evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt, context);
}

export function collectTaskMemoryDispatchFreshnessGates(task: any = {}, context: any = {}) {
  const gates = new Map<string, any>();
  const addGate = (value: any, source = "", fallbackAgent = "") => {
    const gate = extractMemoryDispatchFreshnessGateFromValue(value);
    if (!gate?.schema) return;
    const gateId = String(gate.dispatch_gate_id || gate.dispatchGateId || "").trim();
    if (!gateId) return;
    const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
    const existing = gates.get(gateId) || {};
    gates.set(gateId, {
      ...existing,
      gate_id: gateId,
      schema: gate.schema,
      group_id: gate.group_id || gate.groupId || existing.group_id || "",
      target_project: targetProject || existing.target_project || "",
      scope: gate.scope || existing.scope || "",
      status: gate.status || existing.status || "",
      action: gate.action || existing.action || "",
      memory_ignored: gate.memory_ignored === true || gate.memoryIgnored === true || existing.memory_ignored === true,
      source_checksum: gate.source_manifest?.checksum || gate.sourceManifest?.checksum || existing.source_checksum || "",
      reload_reason: gate.reload_audit?.reason || gate.reloadAudit?.reason || existing.reload_reason || "",
      source: source || existing.source || "",
      raw: gate,
    });
  };
  addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
  addGate(context.execution, "execution", task?.target_project);
  return [...gates.values()];
}

export function evaluateReceiptMemoryDispatchGate(task: any, receipt: any = {}, context: any = {}) {
  const allGates = Array.isArray(context.memoryDispatchGates || context.memory_dispatch_gates)
    ? (context.memoryDispatchGates || context.memory_dispatch_gates)
    : collectTaskMemoryDispatchFreshnessGates(task, context);
  const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
  const matching = allGates.filter((gate: any) => {
    const target = normalizeMemoryGateAgent(gate.target_project);
    return !target || !agent || target === agent;
  });
  const requiredGates = matching.length ? matching : [];
  const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
  const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
  const declarationText = [...used, ...ignored].map((item: any) => String(item || "")).join("\n");
  const missing = requiredGates.filter((gate: any) => !declarationText.includes(String(gate.gate_id || "")));
  return {
    schema: "ccm-child-agent-memory-gate-receipt-validation-v1",
    required: requiredGates.length > 0,
    pass: requiredGates.length === 0 || missing.length === 0,
    gate_ids: requiredGates.map((gate: any) => gate.gate_id),
    missing_gate_ids: missing.map((gate: any) => gate.gate_id),
    declared: used.length > 0 || ignored.length > 0,
    used,
    ignored,
  };
}

export function extractReadPlanRevalidationGateFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.compact_file_reference_read_plan_revalidation_gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") return value.compact_file_reference_read_plan_revalidation_gate;
  if (value.compactFileReferenceReadPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") return value.compactFileReferenceReadPlanRevalidationGate;
  if (value.references?.read_plan_revalidation_gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") return value.references.read_plan_revalidation_gate;
  if (value.references?.readPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") return value.references.readPlanRevalidationGate;
  if (value.worker_context_packet) return extractReadPlanRevalidationGateFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractReadPlanRevalidationGateFromValue(value.workerContextPacket);
  if (value.memory) return extractReadPlanRevalidationGateFromValue(value.memory);
  if (value.group_memory) return extractReadPlanRevalidationGateFromValue(value.group_memory);
  return null;
}

export function collectTaskReadPlanRevalidationGates(task: any = {}, context: any = {}) {
  const gates = new Map<string, any>();
  const addGate = (value: any, source = "", fallbackAgent = "") => {
    const gate = extractReadPlanRevalidationGateFromValue(value);
    if (!gate?.schema) return;
    const gateId = String(gate.revalidation_gate_id || gate.revalidationGateId || "").trim();
    if (!gateId) return;
    const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
    const sessionBinding = gate.session_binding || gate.sessionBinding || {};
    const requiredReadPlanIds = uniqueStrings(
      ...(Array.isArray(gate.required_read_plan_ids || gate.requiredReadPlanIds) ? (gate.required_read_plan_ids || gate.requiredReadPlanIds) : []),
      ...(Array.isArray(gate.required_entries || gate.requiredEntries) ? (gate.required_entries || gate.requiredEntries).map((row: any) => row.read_plan_id || row.readPlanId) : []),
      ...(Array.isArray(gate.verification_read_plan_ids || gate.verificationReadPlanIds) ? (gate.verification_read_plan_ids || gate.verificationReadPlanIds) : []),
    ).filter(Boolean).slice(0, 40);
    const existing = gates.get(gateId) || {};
    gates.set(gateId, {
      ...existing,
      gate_id: gateId,
      schema: gate.schema,
      group_id: gate.group_id || gate.groupId || existing.group_id || "",
      target_project: targetProject || existing.target_project || "",
      scope: gate.scope || existing.scope || "",
      status: gate.status || existing.status || "",
      action: gate.action || existing.action || "",
      required_count: Number(gate.required_count || gate.requiredCount || existing.required_count || 0),
      verification_count: Number(gate.verification_count || gate.verificationCount || existing.verification_count || 0),
      required_read_plan_ids: requiredReadPlanIds,
      task_id: gate.task_id || gate.taskId || sessionBinding.task_id || sessionBinding.taskId || existing.task_id || "",
      trace_id: gate.trace_id || gate.traceId || sessionBinding.trace_id || sessionBinding.traceId || existing.trace_id || "",
      task_agent_session_id: gate.task_agent_session_id || gate.taskAgentSessionId || sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || existing.task_agent_session_id || "",
      native_session_id: gate.native_session_id || gate.nativeSessionId || sessionBinding.native_session_id || sessionBinding.nativeSessionId || existing.native_session_id || "",
      agent_type: sessionBinding.agent_type || sessionBinding.agentType || existing.agent_type || "",
      turn: Number(sessionBinding.turn || existing.turn || 0),
      source: source || existing.source || "",
      raw: gate,
    });
  };
  addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
  addGate(context.execution, "execution", task?.target_project);
  return [...gates.values()];
}

export function evaluateReceiptReadPlanRevalidationGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-acceptance").evaluateReceiptReadPlanRevalidationGate(task, receipt, context);
}

export function extractPostCompactReinjectionGateFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1") return value.post_compact_reinjection_gate;
  if (value.postCompactReinjectionGate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1") return value.postCompactReinjectionGate;
  if (value.references?.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1") return value.references.post_compact_reinjection_gate;
  if (value.references?.postCompactReinjectionGate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1") return value.references.postCompactReinjectionGate;
  if (value.worker_context_packet) return extractPostCompactReinjectionGateFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractPostCompactReinjectionGateFromValue(value.workerContextPacket);
  if (value.memory) return extractPostCompactReinjectionGateFromValue(value.memory);
  if (value.group_memory) return extractPostCompactReinjectionGateFromValue(value.group_memory);
  return null;
}

export function collectTaskPostCompactReinjectionGates(task: any = {}, context: any = {}) {
  const gates = new Map<string, any>();
  const addGate = (value: any, source = "", fallbackAgent = "") => {
    const gate = extractPostCompactReinjectionGateFromValue(value);
    if (!gate?.schema) return;
    const gateId = String(gate.reinjection_gate_id || gate.reinjectionGateId || "").trim();
    if (!gateId) return;
    const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
    const existing = gates.get(gateId) || {};
    gates.set(gateId, {
      ...existing,
      gate_id: gateId,
      schema: gate.schema,
      group_id: gate.group_id || gate.groupId || existing.group_id || "",
      target_project: targetProject || existing.target_project || "",
      scope: gate.scope || existing.scope || "",
      status: gate.status || existing.status || "",
      action: gate.action || existing.action || "",
      candidate_count: Number(gate.candidate_count || gate.candidateCount || existing.candidate_count || 0),
      candidates: Array.isArray(gate.candidates)
        ? gate.candidates.map((candidate: any) => ({
          candidate_id: candidate.candidate_id || candidate.candidateId || "",
          kind: candidate.kind || "",
          value: candidate.value || "",
          sourceMessageId: candidate.sourceMessageId || candidate.source_message_id || "",
        })).slice(0, 24)
        : (existing.candidates || []),
      summary_checksum: gate.post_compact_recovery_audit?.summary_checksum
        || gate.postCompactRecoveryAudit?.summaryChecksum
        || existing.summary_checksum
        || "",
      source: source || existing.source || "",
      raw: gate,
    });
  };
  addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
  addGate(context.execution, "execution", task?.target_project);
  return [...gates.values()];
}

export function extractPostCompactDispatchMarkerFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1") return value.post_compact_dispatch_marker;
  if (value.postCompactDispatchMarker?.schema === "ccm-post-compact-first-dispatch-marker-v1") return value.postCompactDispatchMarker;
  if (value.references?.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1") return value.references.post_compact_dispatch_marker;
  if (value.references?.postCompactDispatchMarker?.schema === "ccm-post-compact-first-dispatch-marker-v1") return value.references.postCompactDispatchMarker;
  if (value.worker_context_packet) return extractPostCompactDispatchMarkerFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractPostCompactDispatchMarkerFromValue(value.workerContextPacket);
  if (value.memory) return extractPostCompactDispatchMarkerFromValue(value.memory);
  if (value.group_memory) return extractPostCompactDispatchMarkerFromValue(value.group_memory);
  return null;
}

export function collectTaskPostCompactDispatchMarkers(task: any = {}, context: any = {}) {
  const markers = new Map<string, any>();
  const addMarker = (value: any, source = "", fallbackAgent = "") => {
    const marker = extractPostCompactDispatchMarkerFromValue(value);
    if (!marker?.schema) return;
    const markerId = String(marker.marker_id || marker.markerId || "").trim();
    if (!markerId) return;
    const targetProject = String(marker.target_project || marker.targetProject || fallbackAgent || "").trim();
    const existing = markers.get(markerId) || {};
    markers.set(markerId, {
      ...existing,
      marker_id: markerId,
      schema: marker.schema,
      group_id: marker.group_id || marker.groupId || existing.group_id || "",
      target_project: targetProject || existing.target_project || "",
      scope: marker.scope || existing.scope || "",
      boundary_id: marker.boundary_id || marker.boundaryId || existing.boundary_id || "",
      raw_boundary_id: marker.raw_boundary_id || marker.rawBoundaryId || existing.raw_boundary_id || "",
      summarized_through_message_id: marker.summarized_through_message_id || marker.summarizedThroughMessageId || existing.summarized_through_message_id || "",
      summary_checksum: marker.summary_checksum || marker.summaryChecksum || existing.summary_checksum || "",
      first_dispatch_after_compact: marker.first_dispatch_after_compact === true || marker.firstDispatchAfterCompact === true || existing.first_dispatch_after_compact === true,
      dispatch_sequence: Number(marker.dispatch_sequence || marker.dispatchSequence || existing.dispatch_sequence || 0),
      status: marker.status || existing.status || "",
      action: marker.action || existing.action || "",
      reinjection_gate_id: marker.reinjection_gate_id || marker.reinjectionGateId || existing.reinjection_gate_id || "",
      candidate_count: Number(marker.candidate_count || marker.candidateCount || existing.candidate_count || 0),
      source: source || existing.source || "",
      raw: marker,
    });
  };
  addMarker(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addMarker(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addMarker(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addMarker(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addMarker(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addMarker(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addMarker(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addMarker);
  addMarker(context.execution, "execution", task?.target_project);
  return [...markers.values()];
}

export function normalizePostCompactCandidateUsageState(value: any) {
  const state = String(value || "").toLowerCase().trim();
  if (["used", "ignored", "verified", "mentioned", "unreferenced"].includes(state)) return state;
  if (["checked", "reviewed", "validated", "confirmed"].includes(state)) return "verified";
  if (["skipped", "unused", "not_used", "not-used", "not used"].includes(state)) return "ignored";
  if (["applied", "referenced", "consumed"].includes(state)) return "used";
  return "";
}

export function collectReceiptPostCompactCandidateUsageRows(receipt: any = {}) {
  const rawRows = [
    ...(Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) : []),
    ...(Array.isArray(receipt.postCompactCandidateUsageRows || receipt.post_compact_candidate_usage_rows) ? (receipt.postCompactCandidateUsageRows || receipt.post_compact_candidate_usage_rows) : []),
    ...(Array.isArray(receipt.candidateUsage || receipt.candidate_usage) ? (receipt.candidateUsage || receipt.candidate_usage) : []),
  ];
  return rawRows.map((raw: any) => {
    const row = typeof raw === "string" ? { value: raw } : raw;
    if (!row || typeof row !== "object") return null;
    const usageState = normalizePostCompactCandidateUsageState(row.usageState || row.usage_state || row.status || row.state);
    return {
      gate_id: String(row.gateId || row.gate_id || row.reinjectionGateId || row.reinjection_gate_id || "").trim(),
      candidate_id: String(row.candidateId || row.candidate_id || row.id || "").trim(),
      kind: String(row.kind || row.type || "").trim(),
      value: compactMemoryText(row.value || row.text || row.summary || "", 800),
      usage_state: usageState,
      reason: compactMemoryText(row.reason || row.note || row.evidence || "", 500),
      raw: row,
    };
  }).filter((row: any) => row && (row.gate_id || row.candidate_id || row.value || row.usage_state)).slice(0, 120);
}

export function structuredUsageMatchesCandidate(row: any, gate: any, candidate: any) {
  const gateId = String(gate?.gate_id || gate?.reinjection_gate_id || gate?.reinjectionGateId || "").trim().toLowerCase();
  const rowGateId = String(row?.gate_id || row?.gateId || row?.reinjection_gate_id || row?.reinjectionGateId || "").trim().toLowerCase();
  if (gateId && rowGateId && gateId !== rowGateId) return false;
  const candidateId = String(candidate?.candidate_id || candidate?.candidateId || "").trim().toLowerCase();
  const rowCandidateId = String(row?.candidate_id || row?.candidateId || row?.id || "").trim().toLowerCase();
  if (candidateId && rowCandidateId && candidateId === rowCandidateId) return true;
  const value = String(candidate?.value || "").trim().toLowerCase();
  const rowValue = String(row?.value || row?.text || "").trim().toLowerCase();
  return !!value && !!rowValue && (rowValue.includes(value) || value.includes(rowValue));
}

export function evaluatePostCompactReinjectionCandidateReference(gate: any, declarationText = "", structuredUsageRows: any[] = []) {
  const candidates = Array.isArray(gate?.candidates) ? gate.candidates : [];
  const required = candidates.length > 0;
  const text = String(declarationText || "");
  const gateId = String(gate?.gate_id || gate?.reinjection_gate_id || gate?.reinjectionGateId || "").trim();
  const scopedStructuredRows = (Array.isArray(structuredUsageRows) ? structuredUsageRows : [])
    .filter((row: any) => !row.gate_id || !gateId || String(row.gate_id).trim() === gateId);
  const allWord = String.raw`(?:全部|所有|\ball\b)`;
  const allCandidatesDeclared = new RegExp(`${allWord}.{0,24}(候选|重注入|candidate|candidates|reinjection)|候选.{0,12}${allWord}|candidate.{0,12}${allWord}`, "i").test(text);
  const allCandidatesIgnored = new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(未使用|不使用|忽略|跳过|ignored|skipped|not\\s*used)|未使用.{0,16}${allWord}.{0,16}(候选|candidate)`, "i").test(text);
  const allCandidatesVerified = new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(已?检查|已?核验|已?验证|reviewed|checked|verified)|候选.{0,16}${allWord}.{0,16}(已?检查|已?核验|已?验证)`, "i").test(text);
  const allCandidatesUsed = !allCandidatesIgnored && new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(已?使用|采用|应用|参考|used|applied|consumed)`, "i").test(text);
  const candidateRefs = (candidate: any) => [
    candidate.candidate_id,
    candidate.candidateId,
    candidate.value,
  ].map((item: any) => String(item || "").trim()).filter(Boolean);
  const snippetForRefs = (source: string, refs: string[]) => {
    const snippets: string[] = [];
    for (const ref of refs) {
      const index = source.indexOf(ref);
      if (index < 0) continue;
      snippets.push(source.slice(Math.max(0, index - 80), Math.min(source.length, index + ref.length + 100)));
    }
    return snippets.join("\n");
  };
  const hasIgnored = (value: string) => /(未使用|不使用|无需使用|没有使用|忽略|跳过|不采用|not\s*used|unused|ignored|skipped|do\s*not\s*use)/i.test(value);
  const hasVerified = (value: string) => /(已?检查|已?核验|已?验证|确认过|复核|reviewed|checked|verified|validated)/i.test(value);
  const hasUsed = (value: string) => /(已?使用|采用|应用|参考|依据|消费|用到|used|applied|referenced|consumed)/i.test(value);
  const candidate_usage_rows = candidates.map((candidate: any) => {
    const refs = candidateRefs(candidate);
    const structuredUsage = scopedStructuredRows.find((row: any) => structuredUsageMatchesCandidate(row, gate, candidate));
    const structuredState = normalizePostCompactCandidateUsageState(structuredUsage?.usage_state || structuredUsage?.usageState || structuredUsage?.status);
    const usedText = refs.some(ref => String(declarationText || "").includes(ref)) ? snippetForRefs(String(declarationText || ""), refs) : "";
    const referenced = !!structuredUsage || refs.some(ref => text.includes(ref));
    const localText = usedText || (allCandidatesDeclared ? text : "");
    const ignored = structuredState
      ? structuredState === "ignored"
      : referenced
      ? hasIgnored(localText)
      : allCandidatesDeclared && allCandidatesIgnored;
    const verified = !ignored && (structuredState
      ? structuredState === "verified"
      : referenced ? hasVerified(localText) : allCandidatesDeclared && allCandidatesVerified);
    const used = !ignored && (structuredState
      ? structuredState === "used"
      : referenced ? hasUsed(localText) : allCandidatesDeclared && allCandidatesUsed);
    const usageState = ignored ? "ignored" : verified ? "verified" : used ? "used" : referenced || allCandidatesDeclared ? "mentioned" : "unreferenced";
    return {
      candidate_id: candidate.candidate_id || candidate.candidateId || "",
      kind: candidate.kind || "",
      value: candidate.value || "",
      sourceMessageId: candidate.sourceMessageId || candidate.source_message_id || "",
      referenced: referenced || allCandidatesDeclared,
      direct_reference: refs.some(ref => text.includes(ref)),
      structured_reference: !!structuredUsage,
      classification_source: structuredUsage ? "structured_post_compact_candidate_usage" : allCandidatesDeclared ? "all_candidates_statement" : "memory_text",
      usage_state: usageState,
      used,
      ignored,
      verified,
      reason: structuredUsage?.reason || "",
    };
  });
  const referenced = candidates.filter((candidate: any) => {
    const refs = [
      candidate.candidate_id,
      candidate.candidateId,
      candidate.value,
    ].map((item: any) => String(item || "").trim()).filter(Boolean);
    return refs.some(ref => text.includes(ref)) || scopedStructuredRows.some((row: any) => structuredUsageMatchesCandidate(row, gate, candidate));
  });
  const usageRows = candidate_usage_rows.filter((row: any) => row.referenced);
  const usageDeclared = usageRows.some((row: any) => ["used", "ignored", "verified"].includes(row.usage_state));
  const strictUsageRows = candidate_usage_rows.filter((row: any) => ["used", "ignored", "verified"].includes(row.usage_state));
  const missingUsageRows = candidate_usage_rows.filter((row: any) => !["used", "ignored", "verified"].includes(row.usage_state));
  const usageCounts = {
    used: candidate_usage_rows.filter((row: any) => row.used).length,
    ignored: candidate_usage_rows.filter((row: any) => row.ignored).length,
    verified: candidate_usage_rows.filter((row: any) => row.verified).length,
    mentioned: candidate_usage_rows.filter((row: any) => row.usage_state === "mentioned").length,
    unreferenced: candidate_usage_rows.filter((row: any) => row.usage_state === "unreferenced").length,
  };
  return {
    required,
    pass: !required || allCandidatesDeclared || referenced.length > 0,
    referenced_candidate_ids: uniqueStrings(referenced.map((candidate: any) => candidate.candidate_id || candidate.candidateId || "")).slice(0, 24),
    all_candidates_declared: allCandidatesDeclared,
    candidate_usage_required: required,
    candidate_usage_any_declared: usageDeclared,
    candidate_usage_strict_required: required,
    candidate_usage_strict_passed: !required || strictUsageRows.length === candidates.length,
    candidate_usage_declared_passed: !required || strictUsageRows.length === candidates.length,
    candidate_usage_rows,
    candidate_usage_counts: usageCounts,
    used_candidate_ids: uniqueStrings(candidate_usage_rows.filter((row: any) => row.used).map((row: any) => row.candidate_id)).slice(0, 24),
    ignored_candidate_ids: uniqueStrings(candidate_usage_rows.filter((row: any) => row.ignored).map((row: any) => row.candidate_id)).slice(0, 24),
    verified_candidate_ids: uniqueStrings(candidate_usage_rows.filter((row: any) => row.verified).map((row: any) => row.candidate_id)).slice(0, 24),
    mentioned_only_candidate_ids: uniqueStrings(candidate_usage_rows.filter((row: any) => row.usage_state === "mentioned").map((row: any) => row.candidate_id)).slice(0, 24),
    unreferenced_candidate_ids: uniqueStrings(candidate_usage_rows.filter((row: any) => row.usage_state === "unreferenced").map((row: any) => row.candidate_id)).slice(0, 24),
    missing_candidate_usage_candidate_ids: uniqueStrings(missingUsageRows.map((row: any) => row.candidate_id || row.value)).slice(0, 24),
    structured_candidate_usage_count: scopedStructuredRows.length,
    candidate_count: candidates.length,
  };
}

export function evaluateReceiptPostCompactReinjectionGate(task: any, receipt: any = {}, context: any = {}) {
  const allGates = Array.isArray(context.postCompactReinjectionGates || context.post_compact_reinjection_gates)
    ? (context.postCompactReinjectionGates || context.post_compact_reinjection_gates)
    : collectTaskPostCompactReinjectionGates(task, context);
  const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
  const matching = allGates.filter((gate: any) => {
    const target = normalizeMemoryGateAgent(gate.target_project);
    return !target || !agent || target === agent;
  });
  const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
  const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
  const structuredUsageRows = collectReceiptPostCompactCandidateUsageRows(receipt);
  const structuredUsageText = structuredUsageRows
    .map((row: any) => [row.gate_id, row.candidate_id, row.value, row.usage_state, row.reason].filter(Boolean).join(" "))
    .join("\n");
  const declarationText = [...used, ...ignored, structuredUsageText].map((item: any) => String(item || "")).join("\n");
  const missing = matching.filter((gate: any) => !declarationText.includes(String(gate.gate_id || "")));
  const candidateRows = matching.map((gate: any) => ({
    gate_id: gate.gate_id,
    ...evaluatePostCompactReinjectionCandidateReference(gate, declarationText, structuredUsageRows),
  }));
  const missingCandidateReference = candidateRows.filter((row: any) => row.required && !row.pass);
  const missingCandidateUsage = candidateRows.filter((row: any) => row.required && row.pass && !row.candidate_usage_declared_passed);
  const flattenedCandidateUsageRows = candidateRows.flatMap((row: any) => (row.candidate_usage_rows || []).map((candidate: any) => ({ ...candidate, gate_id: row.gate_id })));
  return {
    schema: "ccm-child-agent-post-compact-reinjection-gate-receipt-validation-v1",
    required: matching.length > 0,
    pass: matching.length === 0 || (missing.length === 0 && missingCandidateReference.length === 0 && missingCandidateUsage.length === 0),
    gate_ids: matching.map((gate: any) => gate.gate_id),
    missing_gate_ids: missing.map((gate: any) => gate.gate_id),
    candidate_count: matching.reduce((sum: number, gate: any) => sum + Number(gate.candidate_count || 0), 0),
    candidate_reference_required: candidateRows.some((row: any) => row.required),
    candidate_reference_passed: candidateRows.every((row: any) => !row.required || row.pass),
    candidate_usage_required: candidateRows.some((row: any) => row.candidate_usage_required),
    candidate_usage_declared_passed: candidateRows.every((row: any) => !row.candidate_usage_required || row.candidate_usage_declared_passed),
    candidate_usage_strict_required: candidateRows.some((row: any) => row.candidate_usage_strict_required),
    candidate_usage_strict_passed: candidateRows.every((row: any) => !row.candidate_usage_strict_required || row.candidate_usage_strict_passed),
    referenced_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.referenced_candidate_ids || [])).slice(0, 24),
    all_candidates_declared: candidateRows.some((row: any) => row.all_candidates_declared),
    missing_candidate_reference_gate_ids: missingCandidateReference.map((row: any) => row.gate_id),
    missing_candidate_usage_gate_ids: missingCandidateUsage.map((row: any) => row.gate_id),
    missing_candidate_usage_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.missing_candidate_usage_candidate_ids || [])).slice(0, 40),
    candidate_usage_rows: flattenedCandidateUsageRows,
    candidate_usage_counts: {
      used: flattenedCandidateUsageRows.filter((row: any) => row.used).length,
      ignored: flattenedCandidateUsageRows.filter((row: any) => row.ignored).length,
      verified: flattenedCandidateUsageRows.filter((row: any) => row.verified).length,
      mentioned: flattenedCandidateUsageRows.filter((row: any) => row.usage_state === "mentioned").length,
      unreferenced: flattenedCandidateUsageRows.filter((row: any) => row.usage_state === "unreferenced").length,
    },
    used_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.used_candidate_ids || [])).slice(0, 24),
    ignored_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.ignored_candidate_ids || [])).slice(0, 24),
    verified_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.verified_candidate_ids || [])).slice(0, 24),
    mentioned_only_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.mentioned_only_candidate_ids || [])).slice(0, 24),
    unreferenced_candidate_ids: uniqueStrings(...candidateRows.map((row: any) => row.unreferenced_candidate_ids || [])).slice(0, 24),
    structured_candidate_usage_rows: structuredUsageRows,
    candidate_rows: candidateRows,
    declared: used.length > 0 || ignored.length > 0,
    used,
    ignored,
  };
}

export function extractApiMicrocompactEditPlanFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.apiMicroCompactEditPlan;
  if (value.api_microcompact_edit_plan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.api_microcompact_edit_plan;
  if (value.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.compaction.apiMicroCompactEditPlan;
  if (value.compaction?.api_microcompact_edit_plan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.compaction.api_microcompact_edit_plan;
  if (value.compaction?.boundary?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.compaction.boundary.apiMicroCompactEditPlan;
  if (value.compaction?.boundary?.post_compact_restore?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.compaction.boundary.post_compact_restore.apiMicroCompactEditPlan;
  if (value.memory?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.memory.apiMicroCompactEditPlan;
  if (value.memory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.memory.compaction.apiMicroCompactEditPlan;
  if (value.group_memory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.group_memory.compaction.apiMicroCompactEditPlan;
  if (value.groupMemory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1") return value.groupMemory.compaction.apiMicroCompactEditPlan;
  if (value.references?.memory_context) return extractApiMicrocompactEditPlanFromValue(value.references.memory_context);
  if (value.references?.memoryContext) return extractApiMicrocompactEditPlanFromValue(value.references.memoryContext);
  if (value.worker_context_packet) return extractApiMicrocompactEditPlanFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractApiMicrocompactEditPlanFromValue(value.workerContextPacket);
  if (value.memory) return extractApiMicrocompactEditPlanFromValue(value.memory);
  if (value.group_memory) return extractApiMicrocompactEditPlanFromValue(value.group_memory);
  if (value.groupMemory) return extractApiMicrocompactEditPlanFromValue(value.groupMemory);
  return null;
}

export function extractApiMicrocompactNativeApplyPlanFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.schema === "ccm-api-microcompact-native-apply-plan-v1") return value;
  if (value.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.apiMicrocompactNativeApplyPlan;
  if (value.apiMicroCompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.apiMicroCompactNativeApplyPlan;
  if (value.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.api_microcompact_native_apply_plan;
  if (value.compaction?.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.compaction.apiMicrocompactNativeApplyPlan;
  if (value.compaction?.apiMicroCompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.compaction.apiMicroCompactNativeApplyPlan;
  if (value.compaction?.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.compaction.api_microcompact_native_apply_plan;
  if (value.references?.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.references.api_microcompact_native_apply_plan;
  if (value.references?.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1") return value.references.apiMicrocompactNativeApplyPlan;
  if (value.worker_context_packet) return extractApiMicrocompactNativeApplyPlanFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractApiMicrocompactNativeApplyPlanFromValue(value.workerContextPacket);
  if (value.memory) return extractApiMicrocompactNativeApplyPlanFromValue(value.memory);
  if (value.group_memory) return extractApiMicrocompactNativeApplyPlanFromValue(value.group_memory);
  if (value.groupMemory) return extractApiMicrocompactNativeApplyPlanFromValue(value.groupMemory);
  return null;
}

export function extractApiMicrocompactSessionBindingFromValue(value: any): any {
  if (!value || typeof value !== "object") return {};
  const direct = value.session_binding || value.sessionBinding || value.memory?.session_binding || value.memory?.sessionBinding || null;
  const nativeApply = value.apiMicrocompactNativeApplyPlan
    || value.apiMicroCompactNativeApplyPlan
    || value.api_microcompact_native_apply_plan
    || value.compaction?.apiMicrocompactNativeApplyPlan
    || value.compaction?.apiMicroCompactNativeApplyPlan
    || value.compaction?.api_microcompact_native_apply_plan
    || null;
  const session = value.session || {};
  const context = value.context || {};
  const ref = value.ref || {};
  const binding = direct || nativeApply?.sessionBinding || nativeApply?.session_binding || {};
  const snapshotId = String(
    value.snapshot_id
    || value.snapshotId
    || ref.snapshot_id
    || ref.snapshotId
    || context.memory_context_snapshot_id
    || context.memoryContextSnapshotId
    || ""
  ).trim();
  const snapshotChecksum = String(
    value.checksum
    || value.snapshot_checksum
    || value.snapshotChecksum
    || context.memory_context_checksum
    || context.memoryContextChecksum
    || ""
  ).trim();
  const taskAgentSessionId = String(
    binding.task_agent_session_id
    || binding.taskAgentSessionId
    || nativeApply?.task_agent_session_id
    || nativeApply?.taskAgentSessionId
    || session.id
    || session.task_agent_session_id
    || session.taskAgentSessionId
    || ""
  ).trim();
  const nativeSessionId = String(
    binding.native_session_id
    || binding.nativeSessionId
    || nativeApply?.native_session_id
    || nativeApply?.nativeSessionId
    || session.native_session_id
    || session.nativeSessionId
    || ""
  ).trim();
  if (!taskAgentSessionId && !nativeSessionId && !snapshotId && !snapshotChecksum) return {};
  return {
    session_binding: binding?.schema ? binding : null,
    binding_id: String(binding.binding_id || binding.bindingId || nativeApply?.sessionBinding?.binding_id || nativeApply?.session_binding?.binding_id || ""),
    task_agent_session_id: taskAgentSessionId,
    native_session_id: nativeSessionId,
    memory_context_snapshot_id: snapshotId,
    memory_context_snapshot_checksum: snapshotChecksum,
  };
}

export function collectTaskApiMicrocompactEditPlans(task: any = {}, context: any = {}) {
  const plans = new Map<string, any>();
  const addPlan = (value: any, source = "", fallbackAgent = "") => {
    const plan = extractApiMicrocompactEditPlanFromValue(value);
    if (!plan?.schema) return;
    const nativeApplyPlan = extractApiMicrocompactNativeApplyPlanFromValue(value);
    const sessionEvidence = extractApiMicrocompactSessionBindingFromValue(value);
    const requestPatch = nativeApplyPlan?.requestPatch || nativeApplyPlan?.request_patch || null;
    const requestPatchReady = !!requestPatch?.body?.context_management
      && Array.isArray(requestPatch?.beta_headers)
      && requestPatch.beta_headers.includes("context-management-2025-06-27");
    const nativeApplyReady = nativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1"
      && nativeApplyPlan.nativeApplyReady === true
      && requestPatchReady;
    const planChecksum = String(plan.planChecksum || plan.plan_checksum || crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 24)).trim();
    const targetProject = String(plan.targetProject || plan.target_project || value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
    const existing = plans.get(planChecksum) || {};
    plans.set(planChecksum, {
      ...existing,
      plan_checksum: planChecksum,
      schema: plan.schema,
      group_id: plan.groupId || plan.group_id || existing.group_id || task?.group_id || task?.groupId || "",
      target_project: targetProject || existing.target_project || "",
      source: source || existing.source || "",
      edit_count: Number(plan.editCount || plan.edit_count || existing.edit_count || 0),
      recommended: plan.recommended === true || existing.recommended === true,
      advisory_only: !nativeApplyReady,
      can_apply_natively: nativeApplyReady,
      native_apply_ready: nativeApplyReady,
      native_apply_plan: nativeApplyPlan || null,
      apply_plan_checksum: String(nativeApplyPlan?.applyPlanChecksum || nativeApplyPlan?.apply_plan_checksum || ""),
      request_patch_checksum: String(nativeApplyPlan?.requestPatchChecksum || nativeApplyPlan?.request_patch_checksum || ""),
      session_binding: sessionEvidence.session_binding || nativeApplyPlan?.sessionBinding || nativeApplyPlan?.session_binding || existing.session_binding || null,
      session_binding_id: sessionEvidence.binding_id || nativeApplyPlan?.sessionBinding?.binding_id || nativeApplyPlan?.session_binding?.binding_id || existing.session_binding_id || "",
      task_agent_session_id: sessionEvidence.task_agent_session_id || nativeApplyPlan?.task_agent_session_id || nativeApplyPlan?.taskAgentSessionId || existing.task_agent_session_id || "",
      native_session_id: sessionEvidence.native_session_id || nativeApplyPlan?.native_session_id || nativeApplyPlan?.nativeSessionId || existing.native_session_id || "",
      memory_context_snapshot_id: sessionEvidence.memory_context_snapshot_id || nativeApplyPlan?.memory_context_snapshot_id || nativeApplyPlan?.memoryContextSnapshotId || existing.memory_context_snapshot_id || "",
      memory_context_snapshot_checksum: sessionEvidence.memory_context_snapshot_checksum || nativeApplyPlan?.memory_context_snapshot_checksum || nativeApplyPlan?.memoryContextSnapshotChecksum || existing.memory_context_snapshot_checksum || "",
      active_tokens: Number(plan.activeTokens || plan.active_tokens || existing.active_tokens || 0),
      trigger_value: Number(plan.trigger?.value || plan.maxInputTokens || plan.max_input_tokens || existing.trigger_value || 0),
      context_management: plan.contextManagement || plan.context_management || null,
      raw: plan,
    });
  };
  addPlan(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addPlan(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addPlan(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addPlan(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addPlan(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addPlan(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addPlan(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addPlan);
  addPlan(context.execution, "execution", task?.target_project);
  return [...plans.values()];
}

export function normalizeApiMicrocompactUsageState(value: any) {
  const state = String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (["native_applied", "native_apply", "applied", "used_native"].includes(state)) return "native_applied";
  if (["advisory", "advisory_only", "context_pressure", "metadata", "used"].includes(state)) return "advisory";
  if (["ignored", "ignore", "not_used", "unused", "skipped", "not_supported", "unsupported"].includes(state)) return state === "not_supported" || state === "unsupported" ? "not_supported" : "ignored";
  return "";
}

export function collectReceiptApiMicrocompactUsageRows(receipt: any = {}) {
  const rawRows = [
    ...(Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage) ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage) : []),
    ...(Array.isArray(receipt.apiMicroCompactUsage || receipt.api_microCompact_usage) ? (receipt.apiMicroCompactUsage || receipt.api_microCompact_usage) : []),
    ...(Array.isArray(receipt.apiMicrocompactEditPlanUsage || receipt.api_microcompact_edit_plan_usage) ? (receipt.apiMicrocompactEditPlanUsage || receipt.api_microcompact_edit_plan_usage) : []),
  ];
  return rawRows.map((raw: any) => {
    const row = typeof raw === "string" ? { reason: raw } : raw;
    if (!row || typeof row !== "object") return null;
    const nativeApplied = row.nativeApplied === true || row.native_applied === true || row.appliedNatively === true || row.applied_natively === true;
    const usageState = nativeApplied ? "native_applied" : normalizeApiMicrocompactUsageState(row.usageState || row.usage_state || row.status || row.state);
    return {
      plan_checksum: String(row.planChecksum || row.plan_checksum || row.checksum || row.apiMicrocompactPlanChecksum || row.api_microcompact_plan_checksum || "").trim(),
      apply_plan_checksum: String(row.applyPlanChecksum || row.apply_plan_checksum || row.nativeApplyPlanChecksum || row.native_apply_plan_checksum || "").trim(),
      request_patch_checksum: String(row.requestPatchChecksum || row.request_patch_checksum || "").trim(),
      task_agent_session_id: String(row.taskAgentSessionId || row.task_agent_session_id || receipt.taskAgentSessionId || receipt.task_agent_session_id || "").trim(),
      native_session_id: String(row.nativeSessionId || row.native_session_id || receipt.nativeSessionId || receipt.native_session_id || "").trim(),
      memory_context_snapshot_id: String(row.memoryContextSnapshotId || row.memory_context_snapshot_id || receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "").trim(),
      memory_context_snapshot_checksum: String(row.memoryContextSnapshotChecksum || row.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "").trim(),
      usage_state: usageState,
      native_applied: nativeApplied || usageState === "native_applied",
      advisory_only: row.advisoryOnly === true || row.advisory_only === true || usageState === "advisory",
      reason: compactMemoryText(row.reason || row.note || row.evidence || "", 500),
      raw: row,
    };
  }).filter((row: any) => row && (row.plan_checksum || row.usage_state || row.reason)).slice(0, 40);
}

export function evaluateReceiptApiMicrocompactEditPlan(task: any, receipt: any = {}, context: any = {}) {
  const allPlans = Array.isArray(context.apiMicrocompactEditPlans || context.api_microcompact_edit_plans)
    ? (context.apiMicrocompactEditPlans || context.api_microcompact_edit_plans)
    : collectTaskApiMicrocompactEditPlans(task, context);
  const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
  const matching = allPlans.filter((plan: any) => {
    const target = normalizeMemoryGateAgent(plan.target_project);
    return (!target || !agent || target === agent) && (Number(plan.edit_count || 0) > 0 || plan.recommended === true);
  });
  const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
  const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
  const structuredRows = collectReceiptApiMicrocompactUsageRows(receipt);
  const structuredText = structuredRows.map((row: any) => [row.plan_checksum, row.usage_state, row.reason].filter(Boolean).join(" ")).join("\n");
  const declarationText = [
    ...used,
    ...ignored,
    structuredText,
    receipt.summary,
    ...(Array.isArray(receipt.verification) ? receipt.verification : []),
  ].map((item: any) => String(item || "")).join("\n");
  const hasApiMicrocompactKeyword = /api[\s_-]?microcompact|microcompact edit plan|context[-\s]?management|clear_thinking_20251015|clear_tool_uses_20250919/i.test(declarationText);
  const hasAdvisorySignal = /(advisory|metadata|context pressure|not supported|unsupported|不支持|仅作提示|压力提示|上下文压力|未原生应用|没有原生应用)/i.test(declarationText);
  const hasIgnoredSignal = /(memoryignored|ignored|not used|unused|skip|不使用|未使用|忽略|跳过)/i.test(ignored.map((item: any) => String(item || "")).join("\n") || declarationText);
  const hasNativeAppliedSignal = /(native applied|applied natively|native apply|原生应用|已原生应用|context management applied)/i.test(declarationText);
  const rows = matching.map((plan: any) => {
    const checksum = String(plan.plan_checksum || "").trim();
    const structured = structuredRows.find((row: any) => row.plan_checksum && row.plan_checksum === checksum)
      || (!checksum ? structuredRows[0] : null);
    const mentioned = (!!checksum && declarationText.includes(checksum)) || (!!structured) || hasApiMicrocompactKeyword;
    const usageState = structured?.usage_state
      || (hasNativeAppliedSignal ? "native_applied" : hasAdvisorySignal ? "advisory" : hasIgnoredSignal ? "ignored" : "");
    const nativeApplied = usageState === "native_applied" || structured?.native_applied === true;
    const nativeApplyPlan = plan.native_apply_plan || null;
    const requestPatch = nativeApplyPlan?.requestPatch || nativeApplyPlan?.request_patch || null;
    const requestPatchReady = !!requestPatch?.body?.context_management
      && Array.isArray(requestPatch?.beta_headers)
      && requestPatch.beta_headers.includes("context-management-2025-06-27");
    const expectedApplyPlanChecksum = String(plan.apply_plan_checksum || "");
    const expectedRequestPatchChecksum = String(plan.request_patch_checksum || "");
    const expectedTaskAgentSessionId = String(plan.task_agent_session_id || "");
    const expectedNativeSessionId = String(plan.native_session_id || "");
    const expectedSnapshotId = String(plan.memory_context_snapshot_id || "");
    const expectedSnapshotChecksum = String(plan.memory_context_snapshot_checksum || "");
    const applyPlanChecksumMatched = !nativeApplied || (!!expectedApplyPlanChecksum && structured?.apply_plan_checksum === expectedApplyPlanChecksum);
    const requestPatchChecksumMatched = !nativeApplied || (!!expectedRequestPatchChecksum && structured?.request_patch_checksum === expectedRequestPatchChecksum);
    const sessionBindingRequired = !!(expectedTaskAgentSessionId || expectedNativeSessionId || expectedSnapshotId || expectedSnapshotChecksum);
    const taskAgentSessionMatched = !expectedTaskAgentSessionId || structured?.task_agent_session_id === expectedTaskAgentSessionId;
    const nativeSessionMatched = !expectedNativeSessionId || structured?.native_session_id === expectedNativeSessionId;
    const snapshotMatched = (!expectedSnapshotId || structured?.memory_context_snapshot_id === expectedSnapshotId)
      && (!expectedSnapshotChecksum || structured?.memory_context_snapshot_checksum === expectedSnapshotChecksum);
    const sessionMatched = !sessionBindingRequired || (taskAgentSessionMatched && nativeSessionMatched && snapshotMatched);
    const nativeContractReady = plan.native_apply_ready === true
      && nativeApplyPlan?.nativeApplyReady === true
      && requestPatchReady;
    const unsafeNativeApplied = nativeApplied && (!nativeContractReady || !applyPlanChecksumMatched || !requestPatchChecksumMatched);
    const declared = mentioned && ["native_applied", "advisory", "ignored", "not_supported"].includes(usageState);
    const pass = declared && !unsafeNativeApplied && sessionMatched;
    return {
      plan_checksum: checksum,
      edit_count: Number(plan.edit_count || 0),
      advisory_only: plan.advisory_only !== false,
      can_apply_natively: plan.can_apply_natively === true,
      native_apply_ready: nativeContractReady,
      apply_plan_checksum: expectedApplyPlanChecksum,
      request_patch_checksum: expectedRequestPatchChecksum,
      receipt_apply_plan_checksum: structured?.apply_plan_checksum || "",
      receipt_request_patch_checksum: structured?.request_patch_checksum || "",
      apply_plan_checksum_matched: applyPlanChecksumMatched,
      request_patch_checksum_matched: requestPatchChecksumMatched,
      session_binding_required: sessionBindingRequired,
      session_matched: sessionMatched,
      session_mismatch: sessionBindingRequired && !sessionMatched,
      expected_task_agent_session_id: expectedTaskAgentSessionId,
      receipt_task_agent_session_id: structured?.task_agent_session_id || "",
      expected_native_session_id: expectedNativeSessionId,
      receipt_native_session_id: structured?.native_session_id || "",
      expected_memory_context_snapshot_id: expectedSnapshotId,
      receipt_memory_context_snapshot_id: structured?.memory_context_snapshot_id || "",
      expected_memory_context_snapshot_checksum: expectedSnapshotChecksum,
      receipt_memory_context_snapshot_checksum: structured?.memory_context_snapshot_checksum || "",
      mentioned,
      usage_state: usageState,
      native_applied: nativeApplied,
      unsafe_native_applied: unsafeNativeApplied,
      pass,
      reason: structured?.reason || "",
    };
  });
  const missing = rows.filter((row: any) => !row.pass);
  return {
    schema: "ccm-child-agent-api-microcompact-receipt-validation-v1",
    required: matching.length > 0,
    pass: matching.length === 0 || missing.length === 0,
    plan_checksums: matching.map((plan: any) => plan.plan_checksum),
    missing_plan_checksums: rows.filter((row: any) => !row.mentioned || !row.usage_state).map((row: any) => row.plan_checksum),
    unsafe_native_applied_plan_checksums: rows.filter((row: any) => row.unsafe_native_applied).map((row: any) => row.plan_checksum),
    session_mismatch_plan_checksums: rows.filter((row: any) => row.session_mismatch).map((row: any) => row.plan_checksum),
    native_applied_count: rows.filter((row: any) => row.native_applied && !row.unsafe_native_applied).length,
    advisory_count: rows.filter((row: any) => row.usage_state === "advisory").length,
    ignored_count: rows.filter((row: any) => row.usage_state === "ignored" || row.usage_state === "not_supported").length,
    rows,
    declared: structuredRows.length > 0 || used.length > 0 || ignored.length > 0,
    structured_usage_rows: structuredRows,
    used,
    ignored,
  };
}

export function extractGlobalAgentMemoryRecallFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.global_agent_memory;
  if (value.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.globalAgentMemory;
  if (value.memory?.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.memory.global_agent_memory;
  if (value.memory?.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.memory.globalAgentMemory;
  if (value.group_memory?.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.group_memory.global_agent_memory;
  if (value.groupMemory?.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1") return value.groupMemory.globalAgentMemory;
  if (value.references?.memory_context) return extractGlobalAgentMemoryRecallFromValue(value.references.memory_context);
  if (value.references?.memoryContext) return extractGlobalAgentMemoryRecallFromValue(value.references.memoryContext);
  if (value.worker_context_packet) return extractGlobalAgentMemoryRecallFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractGlobalAgentMemoryRecallFromValue(value.workerContextPacket);
  if (value.memory) return extractGlobalAgentMemoryRecallFromValue(value.memory);
  if (value.group_memory) return extractGlobalAgentMemoryRecallFromValue(value.group_memory);
  return null;
}
