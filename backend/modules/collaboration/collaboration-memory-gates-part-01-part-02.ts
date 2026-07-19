// Behavior-freeze split from collaboration-memory-gates-part-01.ts (part 2/2).
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

import {
  extractGlobalAgentMemoryRecallFromValue,
  forEachTaskAgentMemoryContextSnapshotSource,
} from "./collaboration-memory-gates-part-01-part-01";

export function collectTaskGlobalMemoryReceiptGates(task: any = {}, context: any = {}) {
  const gates = new Map<string, any>();
  const addRecall = (value: any, source = "", fallbackAgent = "") => {
    const recall = extractGlobalAgentMemoryRecallFromValue(value);
    if (!recall?.schema) return;
    const items = (Array.isArray(recall.items) ? recall.items : [])
      .filter((item: any) => item?.id || item?.globalMemoryId || item?.global_memory_id)
      .slice(0, 20);
    if (!items.length) return;
    const targetProject = String(value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
    const itemRows = items.map((item: any) => {
      const arbitration = item.arbitration || {};
      const semanticRisk = arbitration.semanticRisk || {};
      const cross = item.crossGroupSuppression || arbitration.crossGroupSuppression || {};
      const freshness = cross.freshness || {};
      const semanticRiskScore = Number(arbitration.semanticRiskScore || semanticRisk.score || 0);
      const crossSuppression = cross.suppressed === true
        ? "background_only"
        : cross.advisory === true
          ? "advisory"
          : "";
      const risky = arbitration.demoted === true
        || arbitration.conflict === true
        || semanticRiskScore >= 60
        || cross.suppressed === true
        || cross.advisory === true;
      return {
        global_memory_id: String(item.id || item.globalMemoryId || item.global_memory_id || "").trim(),
        type: item.type || "memory",
        status: arbitration.status || "active_global_context",
        action: arbitration.action || "",
        demoted: arbitration.demoted === true,
        conflict: arbitration.conflict === true,
        semantic_risk_score: semanticRiskScore,
        semantic_risk_level: semanticRisk.level || (semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore > 0 ? "low" : "none"),
        semantic_reasons: Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons.slice(0, 8) : (semanticRisk.reasons || []).slice?.(0, 8) || [],
        cross_group_suppression: crossSuppression,
        cross_group_reason: cross.reason || "",
        cross_group_superseded: freshness.supersededByNewerGlobalMemory === true,
        cross_group_decayed: freshness.decayedToAdvisory === true,
        requires_current_source_verification: risky,
        requires_background_only: cross.suppressed === true || arbitration.demoted === true || arbitration.conflict === true,
      };
    }).filter((item: any) => item.global_memory_id);
    if (!itemRows.length) return;
    const gateId = `gmr:${crypto.createHash("sha256").update([targetProject, source, itemRows.map((item: any) => item.global_memory_id).join("|")].join("\0")).digest("hex").slice(0, 14)}`;
    gates.set(gateId, {
      schema: "ccm-child-agent-global-memory-receipt-gate-v1",
      gate_id: gateId,
      target_project: targetProject,
      source,
      item_count: itemRows.length,
      risky_count: itemRows.filter((item: any) => item.requires_current_source_verification).length,
      required_global_memory_ids: itemRows.map((item: any) => item.global_memory_id),
      items: itemRows,
      raw: recall,
    });
  };
  addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addRecall);
  addRecall(context.execution, "execution", task?.target_project);
  return [...gates.values()];
}

export function extractGlobalMemoryHealthGateFromValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if (value.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.global_memory_health_gate;
  if (value.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.globalMemoryHealthGate;
  if (value.global_agent_memory?.memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.global_agent_memory.memory_health_gate;
  if (value.globalAgentMemory?.memoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.globalAgentMemory.memoryHealthGate;
  if (value.references?.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.references.global_memory_health_gate;
  if (value.references?.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1") return value.references.globalMemoryHealthGate;
  if (value.references?.memory_context) return extractGlobalMemoryHealthGateFromValue(value.references.memory_context);
  if (value.references?.memoryContext) return extractGlobalMemoryHealthGateFromValue(value.references.memoryContext);
  if (value.worker_context_packet) return extractGlobalMemoryHealthGateFromValue(value.worker_context_packet);
  if (value.workerContextPacket) return extractGlobalMemoryHealthGateFromValue(value.workerContextPacket);
  if (value.memory) return extractGlobalMemoryHealthGateFromValue(value.memory);
  if (value.group_memory) return extractGlobalMemoryHealthGateFromValue(value.group_memory);
  return null;
}

export function collectTaskGlobalMemoryHealthGates(task: any = {}, context: any = {}) {
  const gates = new Map<string, any>();
  const addGate = (value: any, source = "", fallbackAgent = "") => {
    const gate = extractGlobalMemoryHealthGateFromValue(value);
    if (!gate?.schema) return;
    const gateId = String(gate.gate_id || gate.gateId || "").trim();
    if (!gateId) return;
    const targetProject = String(gate.target_project || gate.targetProject || value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
    const existing = gates.get(gateId) || {};
    gates.set(gateId, {
      ...existing,
      schema: "ccm-child-agent-global-memory-health-gate-receipt-gate-v1",
      gate_id: gateId,
      target_project: targetProject || existing.target_project || "",
      group_id: gate.group_id || gate.groupId || existing.group_id || "",
      status: gate.status || existing.status || "unknown",
      action: gate.action || existing.action || "",
      pass: gate.pass === true,
      active_contamination_count: Number(gate.active_contamination_count || gate.activeContaminationCount || existing.active_contamination_count || 0),
      residue_contamination_count: Number(gate.residue_contamination_count || gate.residueContaminationCount || existing.residue_contamination_count || 0),
      selftest_bypass: gate.selftest_bypass === true || gate.selftestBypass === true || existing.selftest_bypass === true,
      fail_blocks_global_memory_recall: gate.policy?.fail_blocks_global_memory_recall !== false,
      required_action: gate.status === "fail" || gate.action === "block_global_agent_memory_recall"
        ? "must_ignore_global_agent_memory_and_reference_gate"
        : gate.status === "warn"
          ? "must_ack_residue_warning_before_global_memory_use"
          : "must_ack_health_gate",
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

export function extractTypedMemoryRecallFromValue(value: any, depth = 0): any {
  if (!value || typeof value !== "object" || depth > 6) return null;
  if (value.schema === "ccm-group-typed-memory-recall-v1") return value;
  const candidates = [
    value.group_state?.typedMemory?.recall,
    value.group_state?.typed_memory?.recall,
    value.groupState?.typedMemory?.recall,
    value.groupState?.typed_memory?.recall,
    value.typedMemory?.recall,
    value.typed_memory?.recall,
    value.typedMemoryRecall,
    value.typed_memory_recall,
    value.recall,
  ];
  for (const candidate of candidates) {
    if (candidate?.schema === "ccm-group-typed-memory-recall-v1") return candidate;
  }
  return extractTypedMemoryRecallFromValue(value.memory, depth + 1)
    || extractTypedMemoryRecallFromValue(value.group_memory, depth + 1)
    || extractTypedMemoryRecallFromValue(value.groupMemory, depth + 1)
    || extractTypedMemoryRecallFromValue(value.worker_context_packet, depth + 1)
    || extractTypedMemoryRecallFromValue(value.workerContextPacket, depth + 1)
    || extractTypedMemoryRecallFromValue(value.references?.memory_context, depth + 1)
    || extractTypedMemoryRecallFromValue(value.references?.memoryContext, depth + 1);
}

export function collectTaskTypedMemoryPressureRecallDocs(task: any = {}, context: any = {}) {
  const docs = new Map<string, any>();
  const addRecall = (value: any, source = "", fallbackAgent = "") => {
    const recall = extractTypedMemoryRecallFromValue(value);
    if (!recall?.schema) return;
    const scoring = recall.workerContextPressureScoring || recall.worker_context_pressure_scoring || {};
    const recalled = Array.isArray(recall.recalled) ? recall.recalled : [];
    const targetProject = String(
      value?.target_project
      || value?.targetProject
      || value?.project
      || value?.memory?.target_project
      || value?.memory?.targetProject
      || fallbackAgent
      || task?.target_project
      || ""
    ).trim();
    for (const doc of recalled) {
      const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
      const adjustment = Number(pressure.adjustment || 0);
      if (adjustment <= 0 && scoring.active !== true) continue;
      const relPath = String(doc.relPath || doc.rel_path || "").trim();
      if (!relPath) continue;
      const key = `${targetProject.toLowerCase()}|${relPath.toLowerCase()}`;
      const existing = docs.get(key) || {};
      docs.set(key, {
        ...existing,
        schema: "ccm-task-typed-memory-pressure-recall-doc-v1",
        group_id: task?.group_id || task?.groupId || value?.group_id || value?.groupId || existing.group_id || "",
        target_project: targetProject || existing.target_project || "",
        rel_path: relPath,
        name: doc.name || existing.name || "",
        type: doc.type || existing.type || "",
        source: doc.source || existing.source || "",
        score: Number(doc.score || existing.score || 0),
        pressure_adjustment: Math.max(Number(existing.pressure_adjustment || 0), adjustment),
        pressure_status: pressure.pressure_status || scoring.pressure_status || existing.pressure_status || "",
        kinds: uniqueStrings([...(Array.isArray(existing.kinds) ? existing.kinds : []), ...(Array.isArray(pressure.kinds) ? pressure.kinds : [])]).slice(0, 12),
        source_ref: source || existing.source_ref || "",
        raw: doc,
      });
    }
  };
  addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
  addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
  for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
    addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
    addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
  }
  for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
    addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
    addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
  }
  for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
    addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
  }
  forEachTaskAgentMemoryContextSnapshotSource(context, addRecall);
  addRecall(context.execution, "execution", task?.target_project);
  return [...docs.values()];
}
