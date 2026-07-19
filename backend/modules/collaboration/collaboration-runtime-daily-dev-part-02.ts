// Behavior-freeze split from collaboration-runtime-daily-dev.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 3/9).
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
  getTaskById,
  runtimeToolSnapshotFromAudit,
  updateGroupMessageAssignmentStatus,
} from "./collaboration-runtime-task-queue";

import {
  buildDeliverySummary,
  buildIndependentReviewGate,
  changeLooksHighRiskForIndependentReview,
  collectTaskActualFileChanges,
  collectTaskAssignmentEvidence,
  getGroupTaskExecutionStatus,
  getReadyDailyDevMembers,
  getVerificationEvidenceGate,
  independentReviewVerdictState,
  isAdvisoryNeed,
  parseFormattedReceiptsFromText,
  receiptHasOpenNeeds,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  getTestAgentHandoffReviewSubject,
  isCoordinatorTestAgentName,
} from "./collaboration-runtime-cross-agent-runtime";

import {
  runCoordinatorReworkProtocolSelfTest,
} from "./collaboration-runtime-test-agent-handoff";

import {
  enqueueTask,
  getQueueStatus,
} from "./collaboration-runtime-coordinator-review";

import {
  CollabCtx,
  buildAgentExecutionFixActions,
  buildAgentToolContext,
  buildTaskSourceDocumentsContext,
  getAgentExecutionReadiness,
  getAgentProbeExecutionReadiness,
  getAgentProbeOutputFailure,
  getTaskAgentExecutionReadiness,
  writeAgentProbeStatus,
} from "./collaboration-runtime-plan-tools";

import {
  canCompleteDailyDevFromDeliverySummary,
  compactFormText,
  createTask,
  getConfiguredProjectVerificationCommands,
  prepareAgentRuntimeTools,
  runtimeToolDispatchBlockedMessage,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

import {
  selectDailyDevSmokeTarget,
} from "./collaboration-runtime-daily-dev-part-01";

export async function runAgentCliProbe(payload: any, ctx: CollabCtx) {
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const runtime = resolveMemberRuntime(selectedProject, target.group, getConfigs());
  if (!runtime?.workDir) throw new Error("未找到探针目标 Agent 的工作目录");
  const requestedAgentType = String(payload.agent_type || payload.agentType || "").trim().toLowerCase();
  const requestedRuntime = requestedAgentType
    ? getPublicAgentRuntimes().find((item: any) => item.id === requestedAgentType || item.aliases?.includes(requestedAgentType))
    : null;
  if (requestedAgentType && !requestedRuntime) throw new Error(`不支持的 Agent Runtime：${requestedAgentType}`);
  const agentType = requestedRuntime?.id || normalizeAgentRuntimeId(runtime.agentType || "claudecode");
  const probeTarget = {
    group_id: target.group.id,
    group_name: target.group.name || target.group.id,
    project: selectedProject,
    agent_type: agentType,
    work_dir: runtime.workDir,
  };
  const readiness = getAgentProbeExecutionReadiness(probeTarget);
  if (!readiness.ready) {
    const fixActions = readiness.fix_actions || buildAgentExecutionFixActions({ error: readiness.message, probe: readiness.probe, agentType });
    const result = {
      success: false,
      blocked: true,
      message: readiness.message,
      error: readiness.message,
      fix_actions: fixActions,
      target: probeTarget,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  }
  const started = Date.now();
  const capabilityWrite = payload.capability_write !== false && payload.capabilityWrite !== false;
  const writeToken = `CCM_WRITE_OK_${crypto.randomBytes(6).toString("hex")}`;
  const writeFileName = `.ccm-permission-probe-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.tmp`;
  const writeFilePath = path.join(runtime.workDir, writeFileName);
  const verifyWriteCapability = () => {
    if (!capabilityWrite) return { requested: false, pass: true, file: "", reason: "只读连通性探针" };
    try {
      const content = fs.existsSync(writeFilePath) ? fs.readFileSync(writeFilePath, "utf-8").trim() : "";
      return { requested: true, pass: content === writeToken, file: writeFileName, reason: content === writeToken ? "项目内写入握手通过" : "Agent 未能在项目目录写入握手文件" };
    } catch (error: any) {
      return { requested: true, pass: false, file: writeFileName, reason: `读取握手文件失败：${error?.message || error}` };
    }
  };
  const cleanupWriteProbe = () => { try { if (fs.existsSync(writeFilePath)) fs.unlinkSync(writeFilePath); } catch {} };
  const prompt = capabilityWrite ? [
    "MANDATORY CCM EXECUTION PROBE.",
    "This is an execution task, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
    `Current working directory: ${runtime.workDir}`,
    `Create a file named ${writeFileName} in the current working directory.`,
    "The file content must be exactly this single line:",
    writeToken,
    "Do not modify any other file. Do not delete the probe file.",
    "After the file has been written successfully, print exactly this single line and nothing else:",
    "CCM_AGENT_PROBE_OK",
  ].join("\n") : [
    "MANDATORY CCM EXECUTION PROBE.",
    "This is a CLI health probe, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
    "Do not modify files and do not run write commands.",
    "Print exactly this single line and nothing else:",
    "CCM_AGENT_PROBE_OK",
  ].join("\n");
  try {
    const toolContext = buildAgentToolContext(ctx, target.group, selectedProject);
    const runtimeToolContext = prepareAgentRuntimeTools(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
      toolAudit: toolContext.toolAudit,
      authorizationReadiness: toolContext.authorizationReadiness,
    });
    if (runtimeToolContext.dispatchBlocked) {
      cleanupWriteProbe();
      const message = runtimeToolDispatchBlockedMessage(selectedProject, runtimeToolContext);
      const result = {
        success: false,
        blocked: true,
        message,
        error: message,
        fix_actions: buildAgentExecutionFixActions({ error: message, agentType }),
        execution_path: readiness.mode,
        expected_marker: "CCM_AGENT_PROBE_OK",
        target: probeTarget,
        duration_ms: Date.now() - started,
        output: "",
        readiness,
        runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
      };
      writeAgentProbeStatus(result);
      return result;
    }
    const timeoutMs = Math.max(15000, Math.min(300000, Number(payload.timeout_ms || payload.timeoutMs || 120000)));
    if (payload.native_session || payload.nativeSession) {
      const probeTaskId = `native-probe-${agentType}-${Date.now()}`;
      let nativeSessionId = agentType === "claudecode" ? crypto.randomUUID() : "";
      let firstErrored = false;
      const firstMarker = "CCM_NATIVE_SESSION_ROUND_1_OK";
      const firstOutput = await ctx.callAgentForGroupStream(selectedProject, `${prompt}\n本轮改为只回复一行：${firstMarker}`, runtime.workDir, agentType, {
        groupId: target.group.id,
        timeoutMs,
        allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
        runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
        runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
        taskId: probeTaskId,
        agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: false },
        onDone: (opts: any) => {
          firstErrored = opts.isError === true;
          nativeSessionId = String(opts.nativeSessionId || nativeSessionId || "");
        },
      });
      const writeCapability = verifyWriteCapability();
      cleanupWriteProbe();
      const firstOk = !firstErrored && firstOutput.includes(firstMarker) && !!nativeSessionId && writeCapability.pass;
      let secondErrored = false;
      const secondMarker = "CCM_NATIVE_SESSION_ROUND_2_OK";
      const secondOutput = firstOk
        ? await ctx.callAgentForGroupStream(selectedProject, `继续同一个健康探针会话。不要修改文件，只回复一行：${secondMarker}`, runtime.workDir, agentType, {
          groupId: target.group.id,
          timeoutMs,
          allowedTools: toolContext.allowedTools,
          mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
          runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
          runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
          taskId: probeTaskId,
          agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: true },
          onDone: (opts: any) => { secondErrored = opts.isError === true; },
        })
        : "";
      const ok = firstOk && !secondErrored && secondOutput.includes(secondMarker);
      const outputFailure = getAgentProbeOutputFailure(firstOutput || secondOutput);
      const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(firstOutput || secondOutput || ""));
      const nativeFailureMessage = !writeCapability.pass && explicitPermissionDrift
        ? `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`
        : (!writeCapability.pass && outputFailure.error !== "empty_output"
          ? outputFailure.message
          : (!writeCapability.pass ? `Agent 未完成项目写入握手：${writeCapability.reason}` : "Agent 原生会话两轮续跑探针失败"));
      const result = {
        success: ok,
        blocked: false,
        message: ok ? "Agent 原生会话两轮续跑与项目写入握手通过" : nativeFailureMessage,
        error: ok ? "" : (!writeCapability.pass && !explicitPermissionDrift ? outputFailure.error : (!writeCapability.pass ? writeCapability.reason : compactMemoryText(firstOutput || secondOutput || "未捕获探针输出", 500))),
        fix_actions: ok ? [] : buildAgentExecutionFixActions({ error: firstOutput || secondOutput, agentType }),
        execution_path: readiness.mode,
        expected_marker: secondMarker,
        target: probeTarget,
        duration_ms: Date.now() - started,
        native_session: { captured: !!nativeSessionId, session_id: nativeSessionId, first_round: firstOk, second_round: !secondErrored && secondOutput.includes(secondMarker) },
        capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
        output: compactMemoryText(secondOutput || firstOutput, 1000),
        readiness,
      };
      writeAgentProbeStatus(result);
      return result;
    }
    const callProbeAgent = (probePrompt: string) => ctx.callAgent(selectedProject, probePrompt, runtime.workDir, agentType, Number(payload.timeout_ms || payload.timeoutMs || 120000), {
      tab: "groups",
      groupId: target.group.id,
      project: selectedProject,
      probe: true,
      allowedTools: toolContext.allowedTools,
      mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
      runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
      runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
    });
    let probeAttempts = 1;
    let output = await callProbeAgent(prompt);
    let writeCapability = verifyWriteCapability();
    if ((!/CCM_AGENT_PROBE_OK/i.test(output) || !writeCapability.pass) && payload.disable_probe_retry !== true && payload.disableProbeRetry !== true) {
      probeAttempts++;
      output = await callProbeAgent([
        prompt,
        "The previous probe attempt did not complete both required checks.",
        "Retry the file write now and only print the success marker after the exact file content exists.",
      ].join("\n"));
      writeCapability = verifyWriteCapability();
    }
    cleanupWriteProbe();
    const ok = /CCM_AGENT_PROBE_OK/i.test(output) && writeCapability.pass;
    const outputFailure = getAgentProbeOutputFailure(output);
    const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(output || ""));
    const failure = ok ? null : (!writeCapability.pass && explicitPermissionDrift)
      ? { message: `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`, error: writeCapability.reason }
      : (!writeCapability.pass && outputFailure.error === "empty_output")
        ? { message: `Agent 未完成项目写入握手：${writeCapability.reason}`, error: writeCapability.reason }
        : outputFailure;
    const fixActions = ok ? [] : buildAgentExecutionFixActions({
      error: failure?.error || failure?.message || output,
      agentType,
      probe: { target: { agent_type: agentType }, output, message: failure?.message, error: failure?.error },
    });
    const result = {
      success: ok,
      blocked: false,
      message: ok ? "Agent CLI 探针通过" : failure?.message,
      error: ok ? "" : failure?.error,
      fix_actions: fixActions,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      target: probeTarget,
      duration_ms: Date.now() - started,
      probe_attempts: probeAttempts,
      output: String(output || "").slice(0, 2000),
      capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  } catch (e: any) {
    cleanupWriteProbe();
    const fixActions = buildAgentExecutionFixActions({
      error: e.message || String(e),
      agentType,
      probe: { target: { agent_type: agentType }, message: e.message || String(e), error: e.message || String(e) },
    });
    const result = {
      success: false,
      blocked: false,
      message: e.message || "Agent CLI 探针失败",
      error: e.message || String(e),
      fix_actions: fixActions,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      target: probeTarget,
      duration_ms: Date.now() - started,
      output: "",
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  }
}

export function taskRequiresAgentQa(task: any) {
  if (task?.requires_agent_qa === false || task?.requiresAgentQa === false) return false;
  if (task?.requires_agent_qa === true || task?.requiresAgentQa === true) return true;
  const text = [task?.title, task?.description, task?.business_goal, task?.acceptance_criteria, task?.source_documents].filter(Boolean).join("\n");
  return /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(text);
}

export function getTaskAgentQaGate(task: any) {
  const items = task?.group_id ? getAgentQaItemsForGroup(String(task.group_id), 200).filter((item: any) => item.task_id === task.id) : [];
  const accepted = items.filter((item: any) => item.acceptance?.accepted === true);
  const resumed = items.filter((item: any) => item.status === "resumed" || item.resumed_at);
  return {
    required: taskRequiresAgentQa(task),
    pass: !taskRequiresAgentQa(task) || (accepted.length > 0 && resumed.length > 0),
    total: items.length,
    accepted: accepted.length,
    resumed: resumed.length,
    qa_ids: items.map((item: any) => item.id).filter(Boolean),
  };
}

export async function runRuntimeFallbackProbe(payload: any, ctx: CollabCtx) {
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const runtime = resolveMemberRuntime(selectedProject, target.group, getConfigs());
  if (!runtime?.workDir) throw new Error("未找到探针目标 Agent 的工作目录");
  const normalizeRequestedRuntime = (value: any, fallback: string) => {
    const requested = String(value || fallback).trim().toLowerCase();
    const descriptor = getPublicAgentRuntimes().find((item: any) => item.id === requested || item.aliases?.includes(requested));
    if (!descriptor) throw new Error(`不支持的 Agent Runtime：${requested}`);
    return descriptor.id;
  };
  const primaryRuntime = normalizeRequestedRuntime(payload.primary_runtime || payload.primaryRuntime, "gemini");
  const fallbackRuntime = normalizeRequestedRuntime(payload.fallback_runtime || payload.fallbackRuntime, "codex");
  const timeoutMs = Math.max(15000, Math.min(120000, Number(payload.timeout_ms || payload.timeoutMs || 30000)));
  const marker = "CCM_RUNTIME_FALLBACK_OK";
  const prompt = `这是 cc-connect 执行器切换探针。不要修改任何文件，不要运行写入命令。只回复一行：${marker}`;
  const toolContext = buildAgentToolContext(ctx, target.group, selectedProject);
  const taskId = `fallback-probe-${Date.now()}`;
  const attempts: any[] = [];
  let previousOutput = "";
  let switched = false;
  for (const [index, agentType] of [primaryRuntime, fallbackRuntime].entries()) {
    const runtimeToolContext = prepareAgentRuntimeTools(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
      toolAudit: toolContext.toolAudit,
      authorizationReadiness: toolContext.authorizationReadiness,
    });
    if (runtimeToolContext.dispatchBlocked) {
      const message = runtimeToolDispatchBlockedMessage(selectedProject, runtimeToolContext);
      attempts.push({ runtime: agentType, success: false, error: true, output: message, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
      return {
        success: false,
        message,
        error: message,
        switched,
        attempts,
        runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
      };
    }
    let errored = false;
    const attemptPrompt = index === 0 ? prompt : buildRuntimeRecoveryPrompt({
      originalPrompt: prompt,
      previousOutput,
      failure: previousOutput,
      fromRuntime: primaryRuntime,
      toRuntime: fallbackRuntime,
      attempt: 2,
    });
    const output = await ctx.callAgentForGroupStream(selectedProject, attemptPrompt, runtime.workDir, agentType, {
      groupId: target.group.id,
      timeoutMs,
      allowedTools: toolContext.allowedTools,
      mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
      taskId,
      onDone: (opts: any) => { errored = opts.isError === true; },
    });
    const ok = !errored && output.includes(marker);
    attempts.push({ runtime: agentType, success: ok, error: errored, output: compactMemoryText(output, 500) });
    if (ok) {
      return {
        success: true,
        message: index === 0 ? "主执行器探针通过，未触发切换" : "主执行器失败后已自动切换并续跑成功",
        switched,
        primary_runtime: primaryRuntime,
        final_runtime: agentType,
        attempts,
      };
    }
    previousOutput = output;
    if (index === 0) {
      const decision = shouldSwitchRuntime(errored ? `Agent 进程退出：${output}` : output);
      if (!decision.switchRuntime) {
        return { success: false, message: "主执行器失败但未被判定为可恢复故障", switched: false, primary_runtime: primaryRuntime, final_runtime: primaryRuntime, attempts, decision };
      }
      switched = true;
      attempts[0].decision = decision;
    }
  }

  return { success: false, message: "执行器切换后仍失败", switched, primary_runtime: primaryRuntime, final_runtime: fallbackRuntime, attempts };
}

export function normalizeStringArray(value: any) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => String(item || "").trim()).filter(Boolean);
}

export function buildEvidenceGateFollowUps(group: any, outputs: string[]) {
  return require("./collaboration-acceptance").buildEvidenceGateFollowUps(group, outputs);
}

export function isReviewLikeAgentName(value: any) {
  return /test[-_\s]*agent|qa|test|tester|verify|verification|review|reviewer|audit|checker|quality|测试|验证|复核|审查|检查/i.test(String(value || ""));
}

export function inferIndependentReviewSubject(input: { task?: any; actualFileChanges?: any[]; receipts?: any[]; assignmentEvidence?: any[] }) {
  const changes = Array.isArray(input.actualFileChanges) ? input.actualFileChanges : [];
  const highRiskProjects = changes
    .filter(changeLooksHighRiskForIndependentReview)
    .map((item: any) => item.project || item.agent || item.target_project || "")
    .filter(Boolean);
  const changedProjects = changes
    .map((item: any) => item.project || item.agent || item.target_project || "")
    .filter(Boolean);
  const receiptAgents = (input.receipts || [])
    .filter((item: any) => String(item?.status || "") === "done")
    .map((item: any) => item.agent || item.project || "")
    .filter(Boolean);
  const assignedProjects = (input.assignmentEvidence || [])
    .map((item: any) => item.project || item.target || "")
    .filter(Boolean);
  const candidates = uniqueStrings(
    highRiskProjects,
    changedProjects,
    receiptAgents,
    assignedProjects,
    input.task?.target_project || input.task?.targetProject || ""
  ).filter((item: string) => !isReviewLikeAgentName(item));
  return candidates[0] || uniqueStrings(changedProjects, receiptAgents, assignedProjects)[0] || "";
}

function getReceiptTestAgentVerdict(receipt: any) {
  return receipt?.testAgentReport?.verdict
    || receipt?.test_agent_report?.verdict
    || receipt?.testAgentVerdict
    || receipt?.test_agent_verdict
    || null;
}

export function getReceiptTestAgentHandoff(receipt: any) {
  return receipt?.testAgentHandoff
    || receipt?.test_agent_handoff
    || receipt?.testAgentReport?.testAgentHandoff
    || receipt?.test_agent_report?.test_agent_handoff
    || null;
}

export function getReceiptIndependentReviewSubject(receipt: any, fallback = "") {
  const handoff = getReceiptTestAgentHandoff(receipt);
  const reviews = [
    ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview : []),
    ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review : []),
  ];
  return String(
    getTestAgentHandoffReviewSubject(handoff)
    || reviews[0]?.reviewSubject
    || reviews[0]?.review_subject
    || receipt?.reviewSubject
    || receipt?.review_subject
    || fallback
    || ""
  ).trim();
}

export function findLatestTestAgentReviewReceipt(receipts: any[] = [], route = "") {
  return [...(receipts || [])].reverse().find((receipt: any) => {
    const verdict = getReceiptTestAgentVerdict(receipt);
    const reviewState = independentReviewVerdictState([
      verdict?.reviewRoute,
      verdict?.status,
      verdict?.recommendation,
      receipt?.status,
      ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview.map((item: any) => item?.verdict || item?.status || item?.summary) : []),
      ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review.map((item: any) => item?.verdict || item?.status || item?.summary) : []),
    ].filter(Boolean).join("\n"));
    if (route === "needs_recheck") return verdict?.needsRecheck === true || verdict?.reviewRoute === "test_agent_recheck" || reviewState === "needs_recheck";
    if (route === "needs_environment") return verdict?.needsEnvironment === true || verdict?.reviewRoute === "environment" || reviewState === "needs_environment";
    if (route === "failed") return verdict?.needsRework === true || verdict?.reviewRoute === "implementation_rework" || reviewState === "failed";
    return !!verdict || isCoordinatorTestAgentName(receipt?.reviewer || receipt?.agent);
  }) || null;
}

export function buildTestAgentReviewRecheckFollowUp(input: {
  subject: string;
  reason?: string;
  handoff?: any;
  source?: string;
  report?: any;
  verdict?: any;
}): any {
  const subject = String(input.subject || "").trim();
  if (!subject) return null;
  const { applyTestAgentProviderGapPlaywrightReroute } = require("./test-agent-independent-review-decision");
  const {
    buildTestAgentEnvironmentPrepChecklist,
    applyTestAgentEnvironmentPrepToHandoff,
  } = require("./test-agent-environment-prep");
  let handoff = applyTestAgentProviderGapPlaywrightReroute(input.handoff || null, {
    report: input.report,
    verdict: input.verdict,
    reason: input.reason,
    reviewRoute: "test_agent_recheck",
  });
  const environmentPrep = handoff?.metadata?.testAgentEnvironmentPrep
    || buildTestAgentEnvironmentPrepChecklist(input.report, input.verdict);
  if (environmentPrep && /environment|补齐|登录条件|运行条件/i.test(String(input.source || input.reason || ""))) {
    handoff = applyTestAgentEnvironmentPrepToHandoff(handoff, environmentPrep);
  }
  const providerGapReroute = handoff?.metadata?.providerGapReroute === true;
  return {
    mention: handoff ? "@test-agent" : `@${subject}`,
    targetName: handoff ? "test-agent" : subject,
    project: handoff ? "test-agent" : subject,
    summary: "重新运行 TestAgent 复验",
    message: [
      `${subject} 的实现或复核条件已更新，请重新执行 TestAgent 独立复核。`,
      "必须基于最新文件、最新运行环境和最新真实输出重新判断；不要复用上一轮结论。",
      "重点补齐上一轮未闭环的操作效果、会话恢复、边界异常或完成前抽查证据。",
      providerGapReroute
        ? "上一轮存在浏览器 Provider 能力缺口：本轮复验已强制改走 Playwright，禁止继续用 MCP/Computer Use 假绿。"
        : "",
      "如果仍无法验证，请明确返回需复验、补条件或待确认；只有新证据完整通过后才能接受交付。",
    ].filter(Boolean).join("\n"),
    reason: input.reason || "上一轮交付或复核条件已更新，需要 TestAgent 基于最新状态重新验证",
    rework_kind: "test_agent_review_recheck",
    testAgentReviewRecheck: true,
    test_agent_review_recheck: true,
    reviewSubject: subject,
    originalTarget: subject,
    independentReviewGate: handoff ? null : {
      required: true,
      pass: false,
      status: "needs_recheck",
      reason: input.reason || "需要重新运行独立 TestAgent 复核",
    },
    testAgentHandoff: handoff,
    test_agent_handoff: handoff,
    userTaskPreview: providerGapReroute
      ? `重新复验 ${subject}：改走 Playwright 后运行 TestAgent`
      : `重新复验 ${subject}：基于最新状态运行 TestAgent`,
    source: input.source || "test_agent_review_recheck",
  };
}

export function buildIndependentReviewGateFollowUps(input: {
  group: any;
  taskId?: string;
  task?: any;
  outputs?: string[];
  existingFollowUps?: any[];
  execution?: any;
}): any[] {
  return require("./collaboration-acceptance").buildIndependentReviewGateFollowUps(input);
}

export function buildFailedIndependentReviewReworkFollowUps(input: {
  group: any;
  taskId?: string;
  task?: any;
  outputs?: string[];
  existingFollowUps?: any[];
  execution?: any;
}) {
  return require("./collaboration-acceptance").buildFailedIndependentReviewReworkFollowUps(input);
}

export function buildPostReviewSpotCheckFollowUps(input: {
  group: any;
  taskId?: string;
  task?: any;
  outputs?: string[];
  existingFollowUps?: any[];
  execution?: any;
}) {
  const task = input.task || getTaskById(input.taskId || "");
  if (!task || task.assign_type !== "group") return [];
  const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
  const receipts = [
    ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
    ...parseFormattedReceiptsFromText(outputText),
  ].filter(Boolean);
  const actualFileChanges = collectTaskActualFileChanges(task, input.execution || {});
  const agentQa = task.group_id ? getAgentQaItemsForGroup(task.group_id).filter((item: any) => !task.id || item.task_id === task.id) : [];
  const independentReviewGate = buildIndependentReviewGate(task, actualFileChanges, receipts, agentQa);
  const spotCheckGate = buildPostReviewSpotCheckGate({
    required: independentReviewGate.required && independentReviewGate.pass,
    receipts,
  });
  if (!spotCheckGate.required || spotCheckGate.pass) return [];
  const existingText = (input.existingFollowUps || [])
    .map((item: any) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
    .join("\n");
  if (/post_review_spot_check|完成前抽查.{0,24}(?:重新复验|补齐|不一致)|TestAgent.{0,24}重新判断/i.test(existingText)) return [];

  const sourceReceipt = receipts.find((receipt: any) =>
    receipt?.post_review_spot_check
    || receipt?.postReviewSpotCheck
    || receipt?.testAgentHandoff
    || receipt?.test_agent_handoff
  ) || null;
  const carriedHandoff = sourceReceipt?.testAgentHandoff || sourceReceipt?.test_agent_handoff || null;
  const assignmentEvidence = collectTaskAssignmentEvidence(task, input.execution || {});
  const subject = String(
    carriedHandoff?.review_subject
    || carriedHandoff?.reviewSubject
    || sourceReceipt?.reviewSubject
    || sourceReceipt?.review_subject
    || sourceReceipt?.independentReview?.[0]?.reviewSubject
    || inferIndependentReviewSubject({ task, actualFileChanges, receipts, assignmentEvidence })
    || task?.target_project
    || ""
  ).trim();
  if (!subject) return [];
  const reason = spotCheckGate.reason || "TestAgent 通过后，主 Agent 的关键验证抽查尚未通过";

  if (carriedHandoff) {
    return [{
      mention: "@test-agent",
      targetName: "test-agent",
      project: "test-agent",
      summary: "完成前抽查需要 TestAgent 重新复验",
      message: [
        `TestAgent 已对 ${subject} 给出通过结论，但主 Agent 的完成前抽查尚未一致。`,
        "请沿用原复核工作单重新执行验证，并根据最新真实输出重新判断；不要复用上一轮 PASS。",
        "如果重新执行失败，请明确返回失败或需要返工；如果仍然通过，请返回新的命令结果块和实际输出，供主 Agent 再次抽查。",
      ].join("\n"),
      reason,
      rework_kind: "post_review_spot_check_reverify",
      postReviewSpotCheckReverify: true,
      postReviewSpotCheckGate: spotCheckGate,
      reviewSubject: subject,
      originalTarget: subject,
      testAgentHandoff: carriedHandoff,
      test_agent_handoff: carriedHandoff,
      userTaskPreview: `重新复验 ${subject}：完成前抽查尚未一致`,
    }];
  }

  return [{
    mention: `@${subject}`,
    targetName: subject,
    project: subject,
    summary: "补齐 TestAgent 通过后的完成前抽查",
    message: [
      `主 Agent 已收到 ${subject} 的独立复核通过结论，但还没有可供主 Agent 重跑的完整命令结果。`,
      "请重新发起独立 TestAgent 复核，确保通过报告包含实际执行的命令、退出状态和输出；主 Agent 会在 PASS 后抽查关键验证。",
    ].join("\n"),
    reason,
    rework_kind: "post_review_spot_check_missing",
    independentReviewGate: {
      ...independentReviewGate,
      required: true,
      pass: false,
      status: "missing",
      reason,
    },
    postReviewSpotCheckGate: spotCheckGate,
    reviewSubject: subject,
    originalTarget: subject,
    userTaskPreview: `补齐完成前抽查：重新复核 ${subject}`,
  }];
}

export function buildCodedCoordinatorReview(
  group: any,
  outputs: string[],
  options: { allowFollowUps?: boolean; round?: number; maxRounds?: number } = {}
) {
  const coordinator = getCoordinatorMember(group);
  const allowFollowUps = options.allowFollowUps !== false;
  const round = Math.max(1, Number(options.round || 1));
  const maxRounds = Math.max(round, Number(options.maxRounds || 3));
  const gateFollowUps = buildEvidenceGateFollowUps(group, outputs);
  const gaps = gateFollowUps.map((item: any) => String(item.reason || item.message || "").trim()).filter(Boolean);
  const followUps = allowFollowUps ? gateFollowUps : [];
  const status = followUps.length > 0
    ? "needs_followup"
    : gaps.length > 0
      ? "needs_user"
      : "complete";
  const lines = ["📋 **规则协调复盘**", ""];
  if (status === "complete") {
    lines.push("已完成规则验收：子 Agent 结果说明和验证证据未发现必须自动返工的缺口。");
  } else {
    lines.push(`第 ${round}/${maxRounds} 轮规则验收发现缺口：${gaps.join("；") || "仍缺少可验收证据"}`);
  }
  if (followUps.length) {
    lines.push("", "我会继续追问：");
    for (const item of followUps) {
      const preview = item.summary ? `${item.summary}：` : "";
      lines.push(`@${item.targetName || item.project} ${preview}${item.message}`);
    }
  } else if (gaps.length) {
    lines.push("", "已达到自动返工上限，需要用户确认是否继续派发或人工介入。");
  }
  return {
    agent: coordinator.project,
    status,
    followUps,
    structured_review: {
      schema: "ccm-coded-coordinator-review-v1",
      status,
      follow_ups: followUps.map((item: any) => ({
        project: item.targetName || item.project || "",
        summary: item.summary || "",
        reason: item.reason || "",
      })),
      gaps,
    },
    gaps,
    conflicts: [],
    content: lines.join("\n").trim(),
    confidence: status === "complete" ? 0.82 : 0.68,
    runtime: "coded-review",
  };
}

export function writeSse(res: any, data: any) {
  if (!res || res.writableEnded || res.destroyed) return;
  try {
    const sequence = Number(res.__ccmSseSequence || 0) + 1;
    res.__ccmSseSequence = sequence;
    const streamId = String(data?.traceId || data?.trace_id || data?.taskId || data?.task_id || "group-stream");
    const eventId = String(data?.event_id || data?.eventId || `${streamId}:${sequence}`);
    res.write(`data: ${JSON.stringify({ ...data, event_id: eventId, eventId, sequence })}\n\n`);
  } catch {}
}

configureAgentQaService({ getTaskById, updateTask, writeSse });

export function emitAssignmentStatus(
  streamRes: any,
  groupId: string,
  planMessageId: string,
  project: string,
  status: string,
  statusText = ""
) {
  if (!planMessageId || !project) return;
  const text = statusText || status;
  const workflow = updateGroupMessageAssignmentStatus(groupId, planMessageId, project, status, text);
  writeSse(streamRes, {
    type: "assignment_status",
    planMessageId,
    project,
    status,
    statusText: text,
    workflow,
  });
}
