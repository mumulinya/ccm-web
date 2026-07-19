// Behavior-freeze split from collaboration-runtime-status-helpers.ts (part 1/2).
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
  parseIndependentReviewLine,
  taskRequiresCodeChanges,
} from "./collaboration-runtime-status-helpers-part-02";

function stripCodeFence(value: string) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function parseInternalToolCalls(text: string) {
  const calls: any[] = [];
  const rawText = String(text || "");
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const body = stripCodeFence(match[1]);
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) calls.push(...parsed);
      else calls.push(parsed);
    } catch {}
  }
  return calls
    .filter((call: any) => call && typeof call === "object")
    .map((call: any) => ({
      name: String(call.name || call.tool || call.type || "").trim(),
      arguments: call.arguments || call.args || call.input || {},
      raw: call,
    }));
}

function normalizeAgentQaRequest(raw: any, group: any, sourceProject = "") {
  if (!raw || typeof raw !== "object") return null;
  const targetName = String(raw.target || raw.to || raw.to_agent || raw.agent || raw.project || raw.targetName || "auto").trim();
  const question = String(raw.question || raw.message || raw.prompt || raw.request || "").trim();
  const type = String(raw.type || raw.kind || "ask_agent").trim() || "ask_agent";
  const kind = /implementation|write|implement|开发|实现|修改/i.test(String(raw.kind || raw.request_kind || raw.requestKind || type))
    ? "implementation"
    : /risk|user|风险|确认/i.test(String(raw.kind || raw.request_kind || raw.requestKind || type))
      ? "risk"
      : /review|评审|复核/i.test(String(raw.kind || raw.request_kind || raw.requestKind || type))
        ? "review"
        : "information";
  if (!question || question.length < 4) return null;
  const members = new Set((group.members || []).map((m: any) => String(m.project || "").trim()).filter(Boolean));
  if (targetName.toLowerCase() !== "auto" && (!members.has(targetName) || targetName === sourceProject)) return null;
  return {
    type: /review/i.test(type) ? "request_review" : "ask_agent",
    kind,
    targetName,
    question: compactMemoryText(question, 1600),
    reason: compactMemoryText(String(raw.reason || raw.context || raw.evidence || "").trim(), 500),
    evidence: uniqueStrings(raw.evidence || raw.references || raw.sources || []).slice(0, 20),
    required_capabilities: uniqueStrings(raw.required_capabilities || raw.requiredCapabilities || raw.capabilities || []).slice(0, 20),
    deadline_ms: Number(raw.deadline_ms || raw.deadlineMs || 0) || undefined,
    parent_question_id: String(raw.parent_question_id || raw.parentQuestionId || "").trim(),
    depth: Math.max(0, Number(raw.depth || 0)),
    hop_path: Array.isArray(raw.hop_path || raw.hopPath) ? (raw.hop_path || raw.hopPath) : [],
    blocking: raw.blocking !== false,
    acceptance_criteria: uniqueStrings(raw.acceptance_criteria || raw.acceptanceCriteria || []).slice(0, 30),
    requested_write_paths: uniqueStrings(raw.requested_write_paths || raw.requestedWritePaths || []).slice(0, 40),
    coordination_request_id: String(raw.coordination_request_id || raw.coordinationRequestId || raw.id || "").trim(),
  };
}

export function extractAgentQaRequests(text: string, group: any, sourceProject = "") {
  const rawText = String(text || "");
  const requests: any[] = [];
  const seen = new Set<string>();
  const push = (item: any) => {
    const normalized = normalizeAgentQaRequest(item, group, sourceProject);
    if (!normalized) return;
    const key = `${normalized.type}\n${normalized.targetName}\n${normalizeMentionTask(normalized.question)}`;
    if (seen.has(key)) return;
    seen.add(key);
    requests.push(normalized);
  };

  for (const call of parseInternalToolCalls(rawText)) {
    const name = call.name.toLowerCase();
    if (!["ask_agent", "request_review"].includes(name)) continue;
    push({ ...(call.arguments || {}), type: name });
  }

  const markerRegex = /CCM_(?:AGENT|COORDINATION)_REQUESTS\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:CCM_AGENT_RECEIPT|CCM_(?:AGENT|COORDINATION)_REQUESTS|$))/gi;
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = markerRegex.exec(rawText)) !== null) {
    const candidate = stripCodeFence(markerMatch[1]);
    const arrayMatch = candidate.match(/\[[\s\S]*\]/);
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const jsonText = arrayMatch?.[0] || objectMatch?.[0] || "";
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) parsed.forEach(push);
      else push(parsed);
    } catch {}
  }

  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*CCM_(?:ASK_AGENT|REQUEST_REVIEW)\s+@([^\s:：]+)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    push({
      type: /REQUEST_REVIEW/i.test(line) ? "request_review" : "ask_agent",
      target: match[1],
      question: match[2],
      blocking: true,
    });
  }
  return requests;
}

export function extractAgentQaReplies(text: string, qaId = "") {
  const replies: any[] = [];
  for (const call of parseInternalToolCalls(text)) {
    if (call.name.toLowerCase() !== "reply_agent") continue;
    const args = call.arguments || {};
    const answer = [args.answer, args.evidence ? `证据：${args.evidence}` : ""].filter(Boolean).join("\n").trim();
    if (!answer) continue;
    const questionId = String(args.question_id || args.qa_id || args.id || "").trim();
    if (questionId && qaId && questionId !== qaId) continue;
    replies.push({ answer, evidence: uniqueStrings(args.evidence || args.sources || args.references || []).slice(0, 30), questionId });
  }
  return replies;
}

export function stripAgentQaProtocolBlocks(text: string) {
  return String(text || "")
    .replace(/<tool_call>\s*[\s\S]*?\s*<\/tool_call>/gi, (block) => {
      const calls = parseInternalToolCalls(block);
      return calls.some(call => ["ask_agent", "request_review", "reply_agent"].includes(call.name.toLowerCase())) ? "" : block;
    })
    .replace(/\n?CCM_AGENT_REQUESTS\s*[:：]?\s*[\s\S]*?(?=\n\s*(?:CCM_AGENT_RECEIPT|$))/gi, "")
    .replace(/\n?CCM_COORDINATION_REQUESTS\s*[:：]?\s*[\s\S]*?(?=\n\s*(?:CCM_AGENT_RECEIPT|$))/gi, "")
    .replace(/^\s*CCM_(?:ASK_AGENT|REQUEST_REVIEW)\s+@[^\n]+\n?/gim, "")
    .trim();
}
function extractStructuredAssignments(result: any, group: any, sourceProject = "") {
  const memberNames = new Set((group.members || [])
    .map((m: any) => String(m.project || "").trim())
    .filter(Boolean));
  const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
  const seen = new Set<string>();
  const mentions: any[] = [];

  for (const item of assignments) {
    const preDispatchGate = item?.worker_context_pre_dispatch_gate || item?.workerContextPreDispatchGate || item?.dispatch_gate || item?.dispatchGate || {};
    const dispatchReady = item?.dispatchReady ?? item?.dispatch_ready ?? preDispatchGate.dispatchReady ?? preDispatchGate.dispatch_ready;
    if (dispatchReady === false) continue;
    const targetName = String(item?.project || item?.targetName || "").trim();
    const message = String(item?.task || item?.message || "").trim();
    if (!memberNames.has(targetName) || targetName === sourceProject) continue;
    if (!isActionableMentionText(message)) continue;
    const key = `${targetName}\n${normalizeMentionTask(message)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({
      mention: `@${targetName}`,
      targetName,
      message,
      reason: String(item?.reason || "").trim(),
      dependsOn: String(item?.dependsOn || "").trim(),
      rework: !!item?.rework,
      attempt: Number(item?.attempt || 1),
      continuationOf: String(item?.continuationOf || item?.continuation_of || "").trim(),
      continuationStrategy: String(item?.continuationStrategy || item?.continuation_strategy || "").trim(),
      assignmentId: item?.assignmentId || item?.assignment_id || "",
      assignment_id: item?.assignment_id || item?.assignmentId || "",
      dispatchKey: item?.dispatchKey || item?.dispatch_key || "",
      dispatch_key: item?.dispatch_key || item?.dispatchKey || "",
      taskFingerprint: item?.taskFingerprint || item?.task_fingerprint || "",
      task_fingerprint: item?.task_fingerprint || item?.taskFingerprint || "",
      replay_repair_dispatch_brief: item?.replay_repair_dispatch_brief || item?.replayRepairDispatchBrief || null,
      replayRepairDispatchBrief: item?.replayRepairDispatchBrief || item?.replay_repair_dispatch_brief || null,
      worker_context_packet: item?.worker_context_packet || item?.workerContextPacket || null,
      agentType: item?.agentType || item?.agent_type || "",
      agent_type: item?.agent_type || item?.agentType || "",
      original_agent_type: item?.original_agent_type || item?.originalAgentType || "",
      provider_switch_decision_receipt: item?.provider_switch_decision_receipt
        || item?.providerSwitchDecisionReceipt
        || item?.worker_context_packet?.provider_switch_decision_receipt
        || null,
      providerSwitchDecisionReceipt: item?.providerSwitchDecisionReceipt
        || item?.provider_switch_decision_receipt
        || item?.workerContextPacket?.providerSwitchDecisionReceipt
        || null,
      structured: true,
    });
  }

  return mentions;
}

export function getCoordinatorActionMentions(result: any, group: any, sourceProject = "") {
  const structured = extractStructuredAssignments(result, group, sourceProject);
  if (structured.length > 0) return structured;
  const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
  if (assignments.some((item: any) => {
    const gate = item?.worker_context_pre_dispatch_gate || item?.workerContextPreDispatchGate || item?.dispatch_gate || item?.dispatchGate || {};
    const dispatchReady = item?.dispatchReady ?? item?.dispatch_ready ?? gate.dispatchReady ?? gate.dispatch_ready;
    return dispatchReady === false;
  })) return [];
  return extractActionableMentions(result?.content || "", group, sourceProject);
}

function normalizeReplayRepairDispatchBriefRef(item: any = {}, fallback: any = {}) {
  return require("./collaboration-memory-gates").normalizeReplayRepairDispatchBriefRef.apply(null, arguments as any);
}

function collectReplayRepairDispatchBriefRefs(value: any, fallback: any = {}, out: any[] = [], seen = new Set<string>()) {
  return require("./collaboration-memory-gates").collectReplayRepairDispatchBriefRefs.apply(null, arguments as any);
}

function replayRepairDispatchBriefRefsForMention(mention: any, context: any = {}) {
  return require("./collaboration-memory-gates").replayRepairDispatchBriefRefsForMention.apply(null, arguments as any);
}

export function summarizeReplayRepairTimelineBindingsForEvent(mention: any, context: any = {}) {
  const packet = context.workerContextPacket || mention?.worker_context_packet || mention?.workerContextPacket || context.workerHandoff?.worker_context_packet || null;
  const workerHandoff = context.workerHandoff || null;
  const snapshot = context.memoryContextSnapshot || context.taskAgentMemoryContextSnapshot || null;
  const session = context.taskAgentSession || null;
  const groupSessionId = String(context.groupSessionId || context.group_session_id || "").trim();
  return replayRepairDispatchBriefRefsForMention(mention, context).map((brief: any) => ({
    brief_id: brief.brief_id,
    work_item_id: brief.work_item_id,
    source: brief.source,
    groupSessionId: groupSessionId.startsWith("gcs_") ? groupSessionId : "",
    group_session_id: groupSessionId.startsWith("gcs_") ? groupSessionId : "",
    project: context.targetName || mention?.targetName || mention?.project || brief.target_project || "",
    assignment_id: mention?.assignmentId || mention?.assignment_id || context.assignmentId || context.assignment_id || "",
    dispatch_key: mention?.dispatchKey || mention?.dispatch_key || context.dispatchKey || context.dispatch_key || "",
    worker_context_packet_id: packet?.packet_id || packet?.packetId || context.workerContextPacketId || context.worker_context_packet_id || "",
    worker_handoff_id: workerHandoff?.handoff_id || workerHandoff?.handoffId || context.workerHandoffId || context.worker_handoff_id || "",
    memory_context_snapshot_id: snapshot?.snapshot_id || snapshot?.snapshotId || context.memoryContextSnapshotId || context.memory_context_snapshot_id || "",
    task_agent_session_id: session?.id || context.taskAgentSessionId || context.task_agent_session_id || "",
    native_session_id: context.nativeSessionId || context.native_session_id || session?.nativeSessionId || "",
    execution_id: context.executionId || context.execution_id || brief.execution_id || "",
    runner_request_id: brief.runner_request_id,
    proof_entry_id: brief.proof_entry_id,
    request_patch_checksum: brief.request_patch_checksum,
    provider_reproof_status: brief.provider_reproof_status,
    provider_reproof_reason: brief.provider_reproof_reason,
    reproof_candidate_id: brief.reproof_candidate_id,
    timeline_binding_id: brief.timeline_binding_id,
    original_work_item_id: brief.original_work_item_id,
    request_telemetry_session_status: brief.request_telemetry_session_status,
    request_telemetry_dispatch_status: brief.request_telemetry_dispatch_status,
    should_create_real_task: false,
  }));
}

export function recordReplayRepairTimelineBindingsForMention(groupId: string, mention: any, context: any = {}) {
  if (!groupId) return [];
  const task = context.taskId ? loadTasks().find((item: any) => item.id === context.taskId) : null;
  const candidateGroupSessionId = String(context.groupSessionId || context.group_session_id || task?.group_session_id || task?.groupSessionId || "").trim();
  const groupSessionId = candidateGroupSessionId.startsWith("gcs_") ? candidateGroupSessionId : "";
  const scopedContext = { ...context, groupSessionId, group_session_id: groupSessionId };
  const refs = summarizeReplayRepairTimelineBindingsForEvent(mention, scopedContext);
  const event = scopedContext.timelineEvent || scopedContext.timeline_event || null;
  return refs.map((ref: any) => recordReplayRepairDispatchBriefTimelineBinding(groupId, {
    ...ref,
    brief: ref,
    groupSessionId,
    group_session_id: groupSessionId,
    task_id: context.taskId || mention?.taskId || mention?.task_id || "",
    project: ref.project,
    assignment_id: ref.assignment_id,
    dispatch_key: ref.dispatch_key,
    worker_context_packet_id: ref.worker_context_packet_id,
    worker_handoff_id: ref.worker_handoff_id,
    memory_context_snapshot_id: ref.memory_context_snapshot_id,
    memory_context_snapshot_checksum: context.memoryContextSnapshotChecksum || context.memory_context_snapshot_checksum || "",
    task_agent_session_id: ref.task_agent_session_id,
    native_session_id: ref.native_session_id,
    execution_id: ref.execution_id,
    receipt: context.receipt || null,
    receipt_status: context.receipt?.status || context.receipt_status || "",
    timeline_event: event,
    timeline_event_type: context.timelineEventType || context.timeline_event_type || event?.type || "",
  })).filter(Boolean);
}

export function getAgentDependencyStateFromOutputs(agent: string, outputs: string[] = []) {
  const text = outputs.filter(Boolean).join("\n\n");
  const notifications = parseTaskNotificationsFromText(text)
    .filter((item: any) => !item.task_id || item.task_id === agent);
  const latestNotification = notifications.at(-1);
  const problemNotification = latestNotification && (() => {
    const item = latestNotification;
    const status = String(item.status || "").trim();
    const receiptStatus = String(item.receipt_status || "").trim();
    return status !== "completed" || (!!receiptStatus && receiptStatus !== "done") ? item : null;
  })();
  if (problemNotification) {
    return {
      ok: false,
      status: problemNotification.status || "blocked",
      reason: `${agent} 前置结果还未完成：执行状态 ${problemNotification.status || "unknown"} / 结果说明 ${problemNotification.receipt_status || "missing"}；${problemNotification.summary || ""}`,
    };
  }
  if (notifications.length > 0) {
    return { ok: true, status: "done", reason: `${agent} 前置输出已完成` };
  }
  const receipts = parseFormattedReceiptsFromText(text).filter((item: any) => item.agent === agent);
  const latestReceipt = receipts.at(-1);
  const problemReceipt = latestReceipt?.status !== "done" ? latestReceipt : null;
  if (problemReceipt) {
    return {
      ok: false,
      status: problemReceipt.status || "blocked",
      reason: `${agent} 前置结果说明尚未完成：${problemReceipt.status || "unknown"}；${problemReceipt.summary || ""}`,
    };
  }
  if (receipts.some((item: any) => item.status === "done")) {
    return { ok: true, status: "done", reason: `${agent} 前置结果说明已完成` };
  }
  return {
    ok: false,
    status: "missing_receipt",
    reason: `${agent} 前置输出缺少可验收的结构化结果说明`,
  };
}

export type TaskExecutionStatus = "done" | "waiting" | "failed";

function normalizeTaskResultText(value: any, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export function buildTaskExecutionResult(status: TaskExecutionStatus, result: string, details: any = {}) {
  return {
    status,
    result: normalizeTaskResultText(result, 1200),
    report: normalizeTaskResultText(details.report || result, 12000),
    detail: details.detail || "",
    receipt: details.receipt || null,
    review: details.review || null,
    fileChanges: details.fileChanges || null,
    deliverySummary: details.deliverySummary || null,
    assignments: Array.isArray(details.assignments) ? details.assignments : [],
    coordinationPlan: details.coordinationPlan || null,
    dispatchPolicy: details.dispatchPolicy || null,
    executionOrder: details.executionOrder || "",
    coordinatorRuntime: details.coordinatorRuntime || details.runtime || "",
    coordinatorAgent: details.coordinatorAgent || "",
    runtimeToolSync: details.runtimeToolSync || details.runtime_tool_sync || null,
    runtimeTooling: details.runtimeTooling || details.runtime_tooling || null,
    invokedSkills: Array.isArray(details.invokedSkills || details.invoked_skills) ? (details.invokedSkills || details.invoked_skills) : [],
  };
}

export function getReadyDailyDevMembers(group: any, configs = getConfigs()) {
  const normalizedGroup = group ? normalizeGroupOrchestrator(group) : null;
  const coordinator = normalizedGroup ? getCoordinatorMember(normalizedGroup) : null;
  const routableMembers = normalizedGroup ? getRoutableMembers(normalizedGroup) : [];
  const readyMembers = routableMembers
    .map((member: any) => {
      const runtime = resolveMemberRuntime(member.project, normalizedGroup, configs);
      const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
      return {
        project: member.project,
        configured: !!runtime,
        workDir: runtime?.workDir || "",
        workDirExists: !!workDirState?.exists,
        workDirWritable: !!workDirState?.writable,
      };
    })
    .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable);

  return { normalizedGroup, coordinator, routableMembers, readyMembers };
}

export function validateDailyDevGroupReady(group: any) {
  const readiness = getReadyDailyDevMembers(group);
  if (!readiness.normalizedGroup) throw new Error("开发群聊不存在");
  if (!readiness.coordinator?.project) throw new Error("开发群聊缺少主 Agent 协调者");
  if (readiness.routableMembers.length === 0) {
    throw new Error("开发群聊至少需要 1 个可派发的项目子 Agent，不能只有主 Agent");
  }
  if (readiness.readyMembers.length === 0) {
    const details = readiness.routableMembers
      .map((member: any) => {
        const ready = readiness.readyMembers.find((item: any) => item.project === member.project);
        return ready
          ? `${member.project}: ok`
          : `${member.project}: 项目配置缺失或工作目录不可读写`;
      })
      .join("；");
    throw new Error(`开发群聊没有可执行的项目子 Agent：${details || "请检查项目配置和工作目录"}`);
  }
  return readiness;
}

export function splitEvidenceList(value: any) {
  return require("./collaboration-coordination-ux").splitEvidenceList.apply(null, arguments as any);
}

export function uniqueStrings(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of splitEvidenceList(list)) {
      if (seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export function taskRequiresVerification(task: any) {
  if (task?.requires_verification === false || task?.requiresVerification === false) return false;
  return task?.workflow_type === "daily_dev";
}

function isSuggestedOnlyVerification(value: any) {
  return require("./collaboration-coordination-ux").isSuggestedOnlyVerification.apply(null, arguments as any);
}

function isFailedVerification(value: any) {
  return require("./collaboration-coordination-ux").isFailedVerification.apply(null, arguments as any);
}

export function isAdvisoryNeed(value: any, task: any = null) {
  const text = String(value || "").trim();
  const controlledSmokeCleanup = task?.workflow_meta?.smoke_test === true
    && /(?:smoke|路径门禁|目标文件).{0,100}(?:映射|清理|忽略|合规交付|系统捕获)/i.test(text);
  return controlledSmokeCleanup
    || /^(?:主\s*Agent|协调(?:者|\s*Agent)|coordinator)\s*需要用户补充(?:信息)?[。.!！]?$/i.test(text)
    || /^(?:建议|可选|如需|推荐|后续可|optional\b|recommend(?:ed)?\b)/i.test(text)
    || /可由.{0,40}(?:主 Agent|用户|coordinator)?.{0,20}(?:决定|选择)(?:是否)?/i.test(text)
    || /(?:等待|请|需要).{0,24}(?:主\s*Agent|@?coordinator|协调\s*Agent).{0,32}(?:逐项)?(?:验收|复盘|审核).{0,32}(?:修改|交付|验证|证据|结果)/i.test(text)
    || /(?:等待|请|需要).{0,24}(?:主\s*Agent|@?coordinator|协调\s*Agent).{0,64}(?:TestAgent|测试\s*Agent|独立复核|独立验证|最终抽查|最终验收|抽查验收|抽查并总结|抽查后总结|完成总结)/i.test(text)
    || /(?:等待|请|需要).{0,24}(?:TestAgent|测试\s*Agent).{0,24}(?:独立复核|独立验证|复核|验证)/i.test(text)
    || /^(?:主\s*Agent|@?coordinator|协调\s*Agent).{0,16}(?:(?:安排|调用|重新运行|重跑)\s*)?(?:TestAgent|测试\s*Agent).{0,48}(?:独立复核|独立验证|复核|复验|验证|确认)(?:[，,；;].*)?[。.!！]?$/i.test(text)
    || /^(?:主\s*Agent|@?coordinator|协调\s*Agent).{0,32}(?:安排\s*TestAgent|独立复核|独立验证|最终抽查|最终验收|抽查验收|复盘|完成总结)(?:并总结|后总结)?[。.!！]?$/i.test(text)
    || /^(?:TestAgent|测试\s*Agent).{0,24}(?:独立复核|独立验证|复核|验证)[。.!！]?$/i.test(text)
    || /人工(?:确认|检查|核验)/i.test(text);
}

export function receiptHasOpenNeeds(receipt: any, task: any = null) {
  const blockers = splitEvidenceList(receipt?.blockers || []);
  const needs = splitEvidenceList(receipt?.needs || []).filter((item: string) => {
    const text = String(item || "").trim();
    return !isAdvisoryNeed(text, task);
  });
  return blockers.length > 0 || needs.length > 0;
}
export function getVerificationEvidenceGate(receipts: any[] = []) {
  const executed: string[] = [];
  const suggested: string[] = [];
  const failed: string[] = [];
  const values = uniqueStrings(...(receipts || []).map((receipt: any) => receipt?.verification || []));
  for (const item of values) {
    if (isFailedVerification(item)) {
      failed.push(item);
      continue;
    }
    if (isSuggestedOnlyVerification(item)) {
      suggested.push(item);
      continue;
    }
    executed.push(item);
  }
  return {
    pass: executed.length > 0 && failed.length === 0,
    executed,
    suggested,
    failed,
  };
}

function normalizeVerificationMatchText(value: any) {
  return String(value || "")
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isManualVerificationEvidence(value: any) {
  const text = String(value || "").trim();
  if (!text || isSuggestedOnlyVerification(text) || isFailedVerification(text)) return false;
  return /人工核验|手动核验|人工检查|手动检查|manual\s+(check|verification|verified)|checked\s+manually/i.test(text);
}

function verificationTextMatchesCommand(text: string, command: string) {
  const normalizedText = normalizeVerificationMatchText(text);
  const normalizedCommand = normalizeVerificationMatchText(command);
  return !!normalizedCommand && normalizedText.includes(normalizedCommand);
}

export function getRequiredVerificationCoverage(receipts: any[] = []) {
  const required: any[] = [];
  const covered: any[] = [];
  const missing: any[] = [];

  for (const receipt of receipts || []) {
    const agent = String(receipt?.agent || "").trim();
    if (!agent) continue;
    const commands = getConfiguredProjectVerificationCommands(agent);
    if (!commands.length) continue;
    const verification = splitEvidenceList(receipt?.verification || []);
    const executed = verification.filter(item => !isSuggestedOnlyVerification(item) && !isFailedVerification(item));
    const externalRunner = executed.filter(item => /passed by external runner\s*\(exit 0\)/i.test(item));
    const manual = executed.some(isManualVerificationEvidence);
    const matched = commands.filter(command => externalRunner.some(item => verificationTextMatchesCommand(item, command)));
    const item = {
      agent,
      required: commands.slice(0, 6),
      executed,
      external_runner: externalRunner,
      matched,
      manual,
    };
    required.push(item);
    if (matched.length > 0) covered.push(item);
    else missing.push(item);
  }

  return {
    pass: missing.length === 0,
    required,
    covered,
    missing,
  };
}

export function parseFormattedReceiptsFromText(text: string) {
  const raw = String(text || "");
  const sections = raw.split(/\n(?=【[^】]+】)/g).filter(Boolean);
  const receipts: any[] = [];
  for (const section of sections) {
    const agent = (section.match(/^【([^】]+)】/) || [])[1]?.trim();
    if (!agent) continue;
    const getLine = (label: string) => (section.match(new RegExp(`-\\s*${label}：\\s*([^\\n]+)`)) || [])[1]?.trim() || "";
    const status = getLine("状态");
    if (!status) continue;
    const markerIndex = [...section.matchAll(/^CCM_AGENT_RECEIPT[ \t]*\r?$/gm)].at(-1)?.index ?? -1;
    const receiptArea = markerIndex >= 0 ? section.slice(markerIndex) : "";
    const rawReceipt = parseCoordinatorReceiptJsonObject(receiptArea);
    receipts.push({
      ...(rawReceipt || {}),
      agent,
      status,
      summary: getLine("摘要"),
      actions: splitEvidenceList(getLine("动作")),
      filesChanged: splitEvidenceList(getLine("文件")),
      verification: splitEvidenceList(getLine("验证")),
      independentReview: parseIndependentReviewLine(getLine("独立复核")),
      memoryUsed: splitEvidenceList(getLine("使用记忆")),
      memoryIgnored: splitEvidenceList(getLine("未用记忆")),
      blockers: splitEvidenceList(getLine("阻塞")),
      needs: splitEvidenceList(getLine("需要补充")),
    });
  }
  const latestByAgent = new Map<string, any>();
  for (const receipt of receipts) latestByAgent.set(String(receipt.agent || "").trim(), receipt);
  return [...latestByAgent.values()];
}

function parseCoordinatorReceiptJsonObject(value: string) {
  const source = String(value || "");
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(source.slice(start, index + 1));
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function summarizeFileChange(file: any, agent = "") {
  if (!file?.path) return null;
  const diff = file.diff || {};
  const project = String(file.project || file.projectName || file.target_project || agent || "");
  return {
    path: String(file.path),
    agent,
    project,
    status: file.statusText || file.statusKind || "",
    status_kind: file.statusKind || "",
    additions: Number(diff.additions || file.additions || 0),
    deletions: Number(diff.deletions || file.deletions || 0),
  };
}

export function extractActualFileChanges(fileChanges: any, agent = "") {
  if (!fileChanges?.files || !Array.isArray(fileChanges.files)) return [];
  return fileChanges.files
    .map((file: any) => summarizeFileChange(file, agent))
    .filter(Boolean);
}

export function collectTaskActualFileChanges(task: any, execution: any) {
  const changes: any[] = [];
  changes.push(...extractActualFileChanges(task?.file_changes, task?.target_project || ""));
  changes.push(...extractActualFileChanges(execution?.fileChanges, task?.target_project || ""));

  if (task?.id) {
    for (const record of listExecutions({ taskId: task.id })) {
      changes.push(...extractActualFileChanges(record.fileChanges, record.project || record.agent || ""));
    }
  }

  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id, groupSessionIdForTask(task))) {
      if (message?.task_id !== task.id) continue;
      changes.push(...extractActualFileChanges(message.fileChanges, message.agent || ""));
    }
  }

  const seen = new Set<string>();
  return changes.filter((change: any) => {
    const key = `${change.agent || ""}|${change.path}|${change.status_kind || change.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectTaskCoordinationPlans(task: any, execution: any) {
  const plans: any[] = [];
  const addPlan = (plan: any, source = "", message: any = null) => {
    if (!plan || typeof plan !== "object") return;
    plans.push({
      ...plan,
      source,
      message_id: message?.id || "",
      agent: message?.agent || "",
      timestamp: message?.timestamp || "",
      assignments: Array.isArray(message?.assignments) ? message.assignments.length : undefined,
    });
  };
  addPlan(execution?.coordinationPlan, "execution");
  addPlan(task?.coordination_plan || task?.coordinationPlan, "task");
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id, groupSessionIdForTask(task))) {
      if (message?.task_id !== task.id) continue;
      addPlan(message.coordinationPlan || message.coordination_plan, "group-message", message);
    }
  }
  const seen = new Set<string>();
  return plans.filter((plan: any) => {
    const key = `${plan.source}|${plan.message_id}|${JSON.stringify(plan.phases || [])}|${JSON.stringify(plan.targets || [])}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectTaskAssignmentEvidence(task: any, execution: any) {
  const items: any[] = [];
  const addAssignments = (assignments: any[], source = "", message: any = null) => {
    for (const assignment of assignments || []) {
      if (!assignment || typeof assignment !== "object") continue;
      const project = String(assignment.project || assignment.targetName || "").trim();
      const taskText = String(assignment.task || assignment.message || "").trim();
      if (!project && !taskText) continue;
      items.push({
        project,
        task: compactMemoryText(taskText, 700),
        reason: compactMemoryText(assignment.reason || "", 260),
        dependsOn: String(assignment.dependsOn || "").trim(),
        status: String(assignment.status || "").trim(),
        statusText: String(assignment.statusText || "").trim(),
        rework: !!assignment.rework,
        attempt: Number(assignment.attempt || 0) || undefined,
        continuationOf: String(assignment.continuationOf || assignment.continuation_of || "").trim(),
        continuationStrategy: String(assignment.continuationStrategy || assignment.continuation_strategy || "").trim(),
        worker_context_packet: assignment.worker_context_packet || assignment.workerContextPacket || null,
        worker_handoff: assignment.worker_handoff || assignment.workerHandoff || null,
        source,
        message_id: message?.id || "",
        timestamp: message?.timestamp || "",
      });
    }
  };

  addAssignments(Array.isArray(execution?.assignments) ? execution.assignments : [], "execution", execution);
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id, groupSessionIdForTask(task))) {
      if (message?.task_id !== task.id) continue;
      addAssignments(Array.isArray(message?.assignments) ? message.assignments : [], "group-message", message);
    }
  }

  const seen = new Set<string>();
  return items.filter((item: any) => {
    const key = [
      item.project,
      item.task,
      item.dependsOn,
      item.rework ? "rework" : "",
      item.attempt || "",
      item.continuationStrategy,
      item.message_id,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectTaskReworkEvidence(task: any, execution: any) {
  const items: any[] = [];
  const addItem = (item: any, source = "", message: any = null) => {
    if (!item || typeof item !== "object") return;
    const project = String(item.project || item.targetName || "").trim();
    const taskText = String(item.task || item.message || item.content || "").trim();
    const reason = String(item.reason || "").trim();
    if (!project && !taskText && !reason) return;
    items.push({
      project,
      task: compactMemoryText(taskText, 700),
      reason: compactMemoryText(reason, 300),
      attempt: Number(item.attempt || 0) || undefined,
      source,
      message_id: message?.id || "",
      timestamp: message?.timestamp || "",
    });
  };

  const addFromMessage = (message: any, source = "group-message") => {
    const assignments = Array.isArray(message?.assignments) ? message.assignments : [];
    for (const assignment of assignments) {
      if (assignment?.rework || /返工|rework/i.test(String(assignment?.task || ""))) {
        addItem(assignment, source, message);
      }
    }
    const content = String(message?.content || "");
    if (/主 Agent 返工工作单|第 \d+ 轮验收后返工|系统验收门禁/.test(content)) {
      addItem({
        project: message?.agent || "coordinator",
        task: content,
        reason: "主 Agent 复盘后生成返工证据",
      }, source, message);
    }
  };

  addFromMessage(execution, "execution");
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id, groupSessionIdForTask(task))) {
      if (message?.task_id !== task.id) continue;
      addFromMessage(message, "group-message");
    }
  }
  const seen = new Set<string>();
  return items.filter((item: any) => {
    const key = `${item.project}|${item.message_id}|${item.task}|${item.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferTaskImpactScope(task: any, assignments: any[] = [], mentions: any[] = []) {
  const text = [task?.title, task?.description, task?.business_goal, task?.acceptance_criteria, ...(assignments || []).map((item: any) => `${item.project || ""} ${item.task || ""}`)].filter(Boolean).join("\n");
  const projectNames = uniqueStrings(
    assignments.map((item: any) => item.project || item.agent),
    mentions.map((item: any) => item.targetName || String(item.mention || "").replace(/^@/, "")),
    [task?.target_project].filter(Boolean)
  ).filter(Boolean);
  const areas: string[] = [];
  if (/前端|页面|组件|vue|react|css|样式|表单|路由|frontend|web|ui/i.test(text)) areas.push("前端页面/组件");
  if (/后端|接口|api|服务|controller|service|route|数据库|sql|schema|backend/i.test(text)) areas.push("后端接口/服务");
  if (/测试|验证|test|spec|e2e|lint|build/i.test(text)) areas.push("测试/构建验证");
  if (/文档|README|markdown|prd|说明/i.test(text)) areas.push("文档/说明");
  const fileHints = uniqueStrings((text.match(/[\w@./-]+\.(?:vue|tsx?|jsx?|css|scss|json|md|yml|yaml|py|go|rs|java|kt|sql)/gi) || []).slice(0, 20));
  return {
    projects: projectNames,
    areas: areas.length ? areas : ["待主 Agent 按项目结构确认"],
    file_hints: fileHints,
    requires_code_changes: taskRequiresCodeChanges(task),
    requires_verification: taskRequiresVerification(task),
  };
}

export function buildTaskSandboxRehearsal(task: any, group: any, coordinatorResult: any = {}, assignments: any[] = [], mentions: any[] = [], dispatchPolicy: any = null) {
  const impact = inferTaskImpactScope(task, assignments, mentions);
  const targetProjects = impact.projects.length ? impact.projects : (group?.members || []).map((m: any) => m.project).filter(Boolean).slice(0, 6);
  const verificationPlan = targetProjects.map((project: string) => {
    const config = getConfigs().find((item: any) => item.name === project);
    const info = config ? getConfigInfo(config.path) : [];
    const workDir = info?.[0]?.workDir || "";
    return {
      project,
      commands: workDir ? buildProjectVerificationHints(project, workDir).slice(0, 5) : [],
    };
  });
  const riskItems = uniqueStrings([
    dispatchPolicy?.risk,
    ...(Array.isArray(coordinatorResult?.missingInfo) ? coordinatorResult.missingInfo : []),
    taskRequiresCodeChanges(task) ? "完成时必须捕获真实文件变更" : "允许无代码变更，但必须说明原因",
    taskRequiresVerification(task) ? "完成时必须提供已执行验证证据" : "验证可按任务性质降级",
  ].filter(Boolean));
  return {
    id: `sandbox_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    generated_at: new Date().toISOString(),
    status: dispatchPolicy?.requiresConfirmation ? "needs_user" : "ready",
    title: task?.title || "任务前沙盘演练",
    business_goal: task?.business_goal || task?.title || "",
    dispatch_action: dispatchPolicy?.action || "delegate",
    dispatch_reason: dispatchPolicy?.reason || "我已生成可执行计划",
    impact_scope: impact,
    agent_plan: (assignments || []).map((item: any, index: number) => ({
      order: index + 1,
      project: item.project || item.agent || item.target_project || "未命名 Agent",
      task: item.task || item.summary || item.description || "等待主 Agent 补全工作单",
      reason: item.reason || "",
      depends_on: item.dependsOn || item.depends_on || [],
    })),
    verification_plan: verificationPlan,
    risks: riskItems,
    gate_requirements: [
      "主 Agent 计划与派发证据",
      "子 Agent 结构化结果说明",
      taskRequiresCodeChanges(task) ? "真实文件变更" : "代码变更可选",
      taskRequiresVerification(task) ? "已执行验证记录" : "验证记录可选",
      "主 Agent 最终验收",
    ],
  };
}

export function buildTeamShutdownGate(finalStatus: string, sessionContinuity: any[] = [], workItems: any[] = [], workItemSummary: any = {}) {
  const openSessions = sessionContinuity.filter((item: any) => String(item.status || "") === "open");
  const unresolvedWorkItems = workItems.filter((item: any) => String(item.status || "") !== "completed");
  const requiresShutdown = finalStatus === "done";
  return {
    required: requiresShutdown,
    pass: !requiresShutdown || (openSessions.length === 0 && unresolvedWorkItems.length === 0),
    status: !requiresShutdown ? "not_required" : openSessions.length === 0 && unresolvedWorkItems.length === 0 ? "passed" : "blocked",
    open_session_count: openSessions.length,
    open_sessions: openSessions.map((item: any) => ({
      id: item.id,
      project: item.project,
      executor: item.executor,
      resume_mode: item.resume_mode,
      turn_count: item.turn_count,
    })),
    closed_session_count: sessionContinuity.filter((item: any) => String(item.status || "") === "closed").length,
    work_item_total: Number(workItemSummary.total || workItems.length || 0),
    unresolved_work_item_count: unresolvedWorkItems.length,
    unresolved_work_items: unresolvedWorkItems.map((item: any) => ({
      id: item.id,
      target: item.target,
      status: item.status,
      subject: item.subject,
    })).slice(0, 12),
    checked_at: new Date().toISOString(),
  };
}

export function changeLooksHighRiskForIndependentReview(change: any) {
  const pathText = String(change?.path || change?.file || change?.name || "").replace(/\\/g, "/").toLowerCase();
  const projectText = String(change?.project || change?.agent || change?.target_project || "").toLowerCase();
  const combined = `${projectText}/${pathText}`;
  return /(^|\/)(backend|server|api|routes|controllers|services|migrations|schema|db|database|auth|security|permission|infra|deploy|scripts|mcp)(\/|$)/i.test(combined)
    || /(^|\/)(package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig[^/]*\.json|vite\.config\.[jt]s|webpack\.config\.[jt]s|rollup\.config\.[jt]s|dockerfile|docker-compose\.ya?ml)$/i.test(pathText)
    || /\.(sql|prisma|graphql|proto)$/i.test(pathText);
}

export function explainIndependentReviewTriggerDecision(task: any, actualFileChanges: any[] = []) {
  const changes = Array.isArray(actualFileChanges) ? actualFileChanges : [];
  const highRiskFiles = changes.filter(changeLooksHighRiskForIndependentReview);
  const goalText = [task?.title, task?.business_goal, task?.description, task?.acceptance_criteria, task?.source_documents]
    .filter(Boolean)
    .join("\n");
  const goalNeedsReview = changes.length > 0 && /后端|接口|API|数据库|权限|登录|认证|支付|安全|迁移|配置|部署|基础设施|跨项目/i.test(goalText);
  const triggerReasons: string[] = [];
  const skipReasons: string[] = [];

  if (task?.requires_independent_review === false || task?.requiresIndependentReview === false) {
    skipReasons.push("任务显式关闭独立复核（requires_independent_review=false）");
  } else if (task?.requires_independent_review === true || task?.requiresIndependentReview === true) {
    triggerReasons.push("任务显式要求独立复核");
  }

  if (!taskRequiresCodeChanges(task)) {
    skipReasons.push("任务不要求代码变更，不强制独立复核");
  } else {
    if (changes.length >= 3) triggerReasons.push(`涉及 ${changes.length} 个文件（≥3）`);
    if (highRiskFiles.length) triggerReasons.push(`包含 ${highRiskFiles.length} 个后端/API/配置等高风险文件`);
    if (goalNeedsReview) triggerReasons.push("目标描述命中后端/API/权限/支付等复杂变更关键词");
    if (!triggerReasons.length && !(task?.requires_independent_review === true || task?.requiresIndependentReview === true)) {
      if (!changes.length) skipReasons.push("尚无真实文件变更证据，未达到自动触发条件");
      else if (changes.length < 3 && !highRiskFiles.length && !goalNeedsReview) {
        skipReasons.push(`仅 ${changes.length} 个低风险文件变更，且目标未命中复杂变更关键词`);
      }
    }
  }

  if (task?.skipIndependentVerification === true || task?.skip_independent_verification === true) {
    skipReasons.push("执行上下文标记 skipIndependentVerification，已跳过独立复核");
  }

  const explicitOff = task?.requires_independent_review === false || task?.requiresIndependentReview === false
    || task?.skipIndependentVerification === true || task?.skip_independent_verification === true;
  const required = !explicitOff && (
    task?.requires_independent_review === true
    || task?.requiresIndependentReview === true
    || (taskRequiresCodeChanges(task) && (
      changes.length >= 3
      || highRiskFiles.length > 0
      || goalNeedsReview
    ))
  );

  const decisionDetail = required
    ? `已触发独立复核：${triggerReasons.join("；") || "复杂代码变更需要另一个 Agent 复核"}`
    : `未触发独立复核：${skipReasons.join("；") || "本次变更不强制独立复核"}`;

  return {
    required,
    triggerReasons,
    skipReasons,
    highRiskFiles,
    fileChangeCount: changes.length,
    decisionDetail,
  };
}

export function taskChangeNeedsIndependentReview(task: any, actualFileChanges: any[] = []) {
  return explainIndependentReviewTriggerDecision(task, actualFileChanges).required;
}

export function formatIndependentReviewGateUserDetail(gate: any = {}) {
  if (!gate || typeof gate !== "object") return "未触发独立复核";
  if (gate.required === true) {
    const status = String(gate.status || "missing");
    const reason = String(gate.reason || gate.decision_detail || gate.decisionDetail || "需要独立复核").trim();
    return `${status}；${reason}；证据 ${Number(gate.evidence_count || gate.evidenceCount || 0)} 条`;
  }
  return String(gate.decision_detail || gate.decisionDetail || gate.reason || "未触发：本次变更不强制独立复核").trim();
}
