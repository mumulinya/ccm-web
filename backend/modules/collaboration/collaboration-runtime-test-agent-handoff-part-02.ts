// Behavior-freeze split from collaboration-runtime-test-agent-handoff.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 5/9).
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
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  writeSse,
} from "./collaboration-runtime-daily-dev";

import {
  buildTestAgentHandoffId,
  coordinatorReworkRouteRequiresStop,
  getTestAgentHandoffReviewSubject,
  isCoordinatorTestAgentName,
} from "./collaboration-runtime-cross-agent-runtime";

import {
  getProjectExtraConfig,
  normalizeProjectConfigList,
} from "./collaboration-runtime-plan-tools";

import {
  resolveTestAgentDecisionVerdict,
  summarizeTestAgentBrowserResult,
  summarizeTestAgentCommandResult,
  summarizeTestAgentHttpResult,
  testAgentEvidenceTypeLabel,
  testAgentStatusLabel,
  testAgentSummaryRows,
} from "./collaboration-runtime-test-agent-handoff-part-01";

export function collectTestAgentBrowserNetworkLines(report: TestAgentReport, verdict: any = null) {
  const rows = testAgentSummaryRows(report, verdict, "browserNetworkSummary");
  if (!rows.length) return [];
  const totals = rows.reduce((acc: any, item: any) => {
    acc.requests += Number(item?.requestCount || 0);
    acc.responses += Number(item?.responseCount || 0);
    acc.failedRequests += Number(item?.failedRequestCount || 0);
    acc.failedResponses += Number(item?.failedResponseCount || 0);
    acc.errors += Number(item?.errorCount || 0);
    return acc;
  }, { requests: 0, responses: 0, failedRequests: 0, failedResponses: 0, errors: 0 });
  const failures = totals.failedRequests + totals.failedResponses + totals.errors;
  const headline = `浏览器网络：记录 ${totals.requests} 个请求、${totals.responses} 个响应${failures ? `，发现 ${failures} 个网络问题` : "，未发现网络错误"}`;
  const failedChecks = rows
    .filter((item: any) => Number(item?.failedRequestCount || 0) || Number(item?.failedResponseCount || 0) || Number(item?.errorCount || 0))
    .map((item: any) => `${item?.project || "项目"}：${item?.name || "浏览器检查"} 网络需关注（失败请求 ${Number(item?.failedRequestCount || 0)}、失败响应 ${Number(item?.failedResponseCount || 0)}、错误 ${Number(item?.errorCount || 0)}）`)
    .slice(0, 3);
  return uniqueStrings([headline, ...failedChecks]).slice(0, 4);
}

export function collectTestAgentBrowserFlowLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentBrowserFlows(report, verdict)?.evidenceLines || [];
}

export function collectTestAgentBrowserMultiSessionLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentMultiSessionBrowser(report, verdict)?.evidenceLines || [];
}

export function collectTestAgentBrowserAuthenticationLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentBrowserAuthentication(report, verdict)?.evidenceLines || [];
}

export function collectTestAgentBrowserActionEffectLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentBrowserActionEffects(report, verdict)?.evidenceLines || [];
}

export function collectTestAgentBrowserRecoveryLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentBrowserRecovery(report, verdict)?.evidenceLines || [];
}

export function collectTestAgentAdversarialEvidenceLines(report: TestAgentReport, verdict: any = null) {
  return summarizeTestAgentAdversarialEvidence(report, verdict)?.evidenceLines || [];
}

function testAgentBrowserStepType(step: any) {
  const name = String(step?.name || "");
  const index = name.indexOf(":");
  return (index >= 0 ? name.slice(index + 1) : name).trim().toLowerCase();
}

const TEST_AGENT_TABLE_ASSERTION_TYPES = new Set(["tablerowincludes", "tablecelltextincludes", "tablecelltextequals"]);

function isTestAgentTableAssertionStep(step: any) {
  return String(step?.kind || "") === "assertion" && TEST_AGENT_TABLE_ASSERTION_TYPES.has(testAgentBrowserStepType(step));
}

function testAgentTableAssertionLabel(step: any) {
  const type = testAgentBrowserStepType(step);
  if (type === "tablerowincludes") return "表格行内容";
  if (type === "tablecelltextequals") return "表格单元格精确内容";
  if (type === "tablecelltextincludes") return "表格单元格包含内容";
  return "表格内容";
}

export function summarizeTestAgentBrowserFailedStep(step: any) {
  if (isTestAgentTableAssertionStep(step)) {
    return `断言 ${testAgentTableAssertionLabel(step)} 未通过，定位细节已放入技术详情。`;
  }
  return `${step?.kind === "action" ? "操作" : "断言"} ${compactMemoryText(step?.name || "未命名步骤", 80)} ${testAgentStatusLabel(step?.status)}${step?.error ? `：${compactMemoryText(step.error, 120)}` : ""}`;
}

function testAgentBrowserSummaryAssertionTypeCount(rows: any[], type: string) {
  const lower = type.toLowerCase();
  return rows.reduce((sum, item: any) => {
    const types = item?.assertionTypes || item?.assertion_types || {};
    return sum + Object.entries(types).reduce((inner, [key, value]) => (
      String(key || "").toLowerCase() === lower ? inner + Number(value || 0) : inner
    ), 0);
  }, 0);
}

export function collectTestAgentBrowserTableLines(report: TestAgentReport, verdict: any = null) {
  const summaryRows = testAgentSummaryRows(report, verdict, "browserInteractionSummary");
  const summaryCount = [...TEST_AGENT_TABLE_ASSERTION_TYPES].reduce((sum, type) => sum + testAgentBrowserSummaryAssertionTypeCount(summaryRows, type), 0);
  const resultSteps = (Array.isArray(report.browserResults) ? report.browserResults : [])
    .flatMap((item: any) => Array.isArray(item?.steps) ? item.steps : [])
    .filter(isTestAgentTableAssertionStep);
  const summaryFailures = summaryRows
    .flatMap((item: any) => Array.isArray(item?.failedSteps) ? item.failedSteps : [])
    .filter(isTestAgentTableAssertionStep);
  const total = resultSteps.length || summaryCount;
  const failed = resultSteps.filter((step: any) => String(step?.status || "").toLowerCase() === "failed");
  const failedSteps = failed.length ? failed : summaryFailures;
  if (!total && !failedSteps.length) return [];
  const failedCount = failedSteps.length;
  const headline = `表格验证：已核对 ${Math.max(total, failedCount)} 项表格行/单元格断言${failedCount ? `，其中 ${failedCount} 项未通过` : "，未发现失败断言"}`;
  const failures = failedSteps
    .map((step: any) => `表格断言未通过：${testAgentTableAssertionLabel(step)}未匹配，定位细节已放入技术详情。`)
    .slice(0, 3);
  return uniqueStrings([headline, ...failures]).slice(0, 4);
}

function testAgentUploadFileNames(detail: any) {
  const text = String(detail || "");
  const match = /(?:^|;\s*)file=([^;]+)/i.exec(text);
  if (!match?.[1]) return [];
  return match[1]
    .split(/\s*,\s*/)
    .map(item => path.basename(item.trim()))
    .filter(Boolean);
}

export function collectTestAgentBrowserUploadLines(report: TestAgentReport, verdict: any = null) {
  const summarySteps = testAgentSummaryRows(report, verdict, "browserInteractionSummary")
    .flatMap((item: any) => Array.isArray(item?.actionSteps) ? item.actionSteps : []);
  const resultSteps = (Array.isArray(report.browserResults) ? report.browserResults : [])
    .flatMap((item: any) => Array.isArray(item?.steps) ? item.steps : [])
    .filter((step: any) => step?.kind === "action");
  const steps = [...summarySteps, ...resultSteps]
    .filter((step: any) => testAgentBrowserStepType(step) === "uploadfile");
  if (!steps.length) return [];
  const failed = steps.filter((step: any) => String(step?.status || "").toLowerCase() === "failed");
  const fileNames = uniqueStrings(steps.flatMap((step: any) => testAgentUploadFileNames(step?.detail))).slice(0, 6);
  const count = fileNames.length || steps.length;
  const headline = `文件上传：${failed.length ? `${failed.length} 次上传未通过` : `已验证 ${count} 个上传${fileNames.length ? "文件" : "操作"}`}${fileNames.length ? `（${fileNames.join("、")}）` : ""}`;
  const failures = failed
    .map((step: any) => `上传步骤未通过：${compactMemoryText(step?.error || step?.detail || "TestAgent 未能完成文件上传验证。", 140)}`)
    .slice(0, 2);
  return uniqueStrings([headline, ...failures]).slice(0, 3);
}

function testAgentDownloadArtifactName(artifact: any) {
  const title = String(artifact?.title || "").trim();
  const match = /^Download:\s*(.+)$/i.exec(title);
  if (match?.[1]) return path.basename(match[1].trim());
  return path.basename(String(artifact?.path || "").trim());
}

function testAgentDownloadExpectation(detail: any) {
  const text = String(detail || "");
  const fileName = /(?:^|;\s*)(?:filename|fileName)=([^;]+)/i.exec(text)?.[1]?.trim();
  const fileNameIncludes = /(?:^|;\s*)filenameIncludes=([^;]+)/i.exec(text)?.[1]?.trim();
  if (fileName) return path.basename(fileName);
  if (fileNameIncludes) return `包含 ${fileNameIncludes}`;
  return "";
}

export function collectTestAgentBrowserDownloadLines(report: TestAgentReport) {
  const browserResults = Array.isArray(report.browserResults) ? report.browserResults : [];
  const artifacts = browserResults
    .flatMap((item: any) => Array.isArray(item?.browserArtifacts) ? item.browserArtifacts : [])
    .filter((artifact: any) => String(artifact?.type || "").toLowerCase() === "download");
  const assertionSteps = browserResults
    .flatMap((item: any) => Array.isArray(item?.steps) ? item.steps : [])
    .filter((step: any) => step?.kind === "assertion" && testAgentBrowserStepType(step) === "downloadedfile");
  if (!artifacts.length && !assertionSteps.length) return [];
  const failed = assertionSteps.filter((step: any) => String(step?.status || "").toLowerCase() === "failed");
  const artifactNames = uniqueStrings(artifacts.map(testAgentDownloadArtifactName).filter(Boolean)).slice(0, 6);
  const expectationNames = uniqueStrings(assertionSteps.map((step: any) => testAgentDownloadExpectation(step?.detail)).filter(Boolean)).slice(0, 6);
  const names = artifactNames.length ? artifactNames : expectationNames;
  const passedAssertions = assertionSteps.filter((step: any) => String(step?.status || "").toLowerCase() === "passed");
  const count = names.length || artifacts.length || passedAssertions.length || assertionSteps.length;
  const headline = `文件下载：${failed.length ? `${failed.length} 项下载验证未通过` : `已验证 ${count} 个下载${names.length ? "文件" : "结果"}`}${names.length ? `（${names.join("、")}）` : ""}`;
  const failures = failed
    .map((step: any) => `下载验证未通过：${compactMemoryText(step?.error || step?.detail || "TestAgent 未能确认下载文件。", 140)}`)
    .slice(0, 2);
  return uniqueStrings([headline, ...failures]).slice(0, 3);
}

export function collectTestAgentBrowserEvidenceSummaryLines(report: TestAgentReport, verdict: any = null) {
  return require("./collaboration-test-agent-runtime").collectTestAgentBrowserEvidenceSummaryLines(report, verdict);
}

export function collectTestAgentVerificationLines(report: TestAgentReport, verdict: TestAgentVerdict | null = resolveTestAgentDecisionVerdict(report)) {
  return uniqueStrings([
    ...(Array.isArray(report.commandResults) ? report.commandResults.map(summarizeTestAgentCommandResult) : []),
    ...(Array.isArray(report.httpResults) ? report.httpResults.map(summarizeTestAgentHttpResult) : []),
    ...(Array.isArray(report.browserResults) ? report.browserResults.map(summarizeTestAgentBrowserResult) : []),
    ...collectTestAgentBrowserEvidenceSummaryLines(report, verdict),
    ...(Array.isArray(report.requiredCheckCoverage)
      ? report.requiredCheckCoverage.map((item: any) => `必检项 ${testAgentEvidenceTypeLabel(item.check)}：${testAgentStatusLabel(item.status)}${item.missingReason ? `（${item.missingReason}）` : ""}`)
      : []),
  ]).slice(0, 20);
}

export function collectTestAgentEvidenceLines(report: TestAgentReport) {
  return uniqueStrings((Array.isArray(report.evidence) ? report.evidence : []).map((item: any) => [
    item.project || "",
    item.type || "",
    item.title || "",
    item.status || "",
    item.path || item.detail || "",
  ].filter(Boolean).join(" | "))).slice(0, 20);
}

export function getTestAgentReviewedFiles(workOrder: any, report: TestAgentReport) {
  const projects = Array.isArray(workOrder?.projects) ? workOrder.projects : [];
  return uniqueStrings([
    ...projects.flatMap((project: any) => Array.isArray(project?.changedFiles) ? project.changedFiles : (Array.isArray(project?.changed_files) ? project.changed_files : [])),
    ...((Array.isArray(report.metadata?.previousLedger?.filesChanged) ? report.metadata.previousLedger.filesChanged : [])),
  ]).slice(0, 40);
}

export function buildNativeTestAgentReceipt(targetName: string, report: TestAgentReport, handoff: any = null, workOrder: any = null, invocationResult: any = null) {
  return require("./collaboration-acceptance").buildNativeTestAgentReceipt(targetName, report, handoff, workOrder, invocationResult);
}

export function buildNativeTestAgentReviewSummary(targetName: string, report: TestAgentReport, receipt: any) {
  return require("./collaboration-test-agent-runtime").buildNativeTestAgentReviewSummary(targetName, report, receipt);
}

export function formatNativeTestAgentOutput(targetName: string, report: TestAgentReport, receipt: any, handoff: any = null) {
  return require("./collaboration-test-agent-runtime").formatNativeTestAgentOutput(targetName, report, receipt, handoff);
}

export function summarizeNativeTestAgentExecutionPlan(plan: any) {
  return require("./collaboration-test-agent-runtime").summarizeNativeTestAgentExecutionPlan(plan);
}

export function buildNativeTestAgentPlanBlockedReceipt(targetName: string, plan: any, dispatch: any = null, handoff: any = null) {
  return require("./collaboration-acceptance").buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch, handoff);
}

export function formatNativeTestAgentPlanBlockedOutput(targetName: string, plan: any, receipt: any, handoff: any = null) {
  return require("./collaboration-test-agent-runtime").formatNativeTestAgentPlanBlockedOutput(targetName, plan, receipt, handoff);
}

export function buildNativeTestAgentRuntimeToolContext(targetName: string, workDir: string) {
  return require("./collaboration-test-agent-runtime").buildNativeTestAgentRuntimeToolContext(targetName, workDir);
}

export function buildCoordinatorReworkContinuationFallback(input: {
  reworkRoute?: any;
  mention?: any;
  sourceTask?: any;
  targetName: string;
  stopResult?: any;
}) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorReworkContinuationFallback(input);
}

export function stopWrongDirectionWorkerForCoordinatorRoute(input: {
  taskId?: string;
  groupId: string;
  targetName: string;
  sourceProject: string;
  route: any;
  mention?: any;
  streamRes?: any;
}) {
  if (!input.taskId || !coordinatorReworkRouteRequiresStop(input.route)) return null;
  const reason = compactMemoryText(
    input.route?.reason || input.mention?.reason || input.mention?.message || input.mention?.task || "主 Agent 发现子 Agent 可能沿旧方向执行，先停止旧方向。",
    360
  );
  let result: any = null;
  try {
    result = cancelActiveAgentRun({
      task_id: input.taskId,
      project: input.targetName,
      execution_id: `${input.taskId}--${input.targetName}`,
      reason,
      actor: "coordinator-rework-route",
      cancel_task: false,
    });
  } catch (error: any) {
    result = { success: false, matched: 0, killed: 0, error: String(error?.message || error || "停止旧方向失败") };
  }
  const userText = result.success === false
    ? `${input.targetName} 旧方向停止检查失败，主 Agent 会在新工作单里明确禁止继续旧方向。`
    : result.matched > 0
      ? `${input.targetName} 的旧方向执行已发送停止请求，准备按新要求继续。`
      : `${input.targetName} 当前没有仍在运行的旧方向进程，准备按新要求继续。`;
  addTaskLog(input.taskId, result.success === false ? "warning" : "info", userText);
  appendTaskTimelineEvent(input.taskId, {
    type: "coordinator_wrong_direction_stop",
    title: `${input.targetName} 旧方向停止检查`,
    detail: userText,
    status: result.success === false ? "warn" : "ok",
    phase: "rework",
    agent: input.targetName,
    data: {
      route: input.route,
      stop_result: result,
      source_project: input.sourceProject,
      cancel_task: false,
    },
  });
  updateGroupMemory(input.groupId, {
    currentPhase: "rework",
    decision: `${input.targetName} 返工前已检查旧方向停止状态`,
    reason,
    nextAction: `按修正后的工作单继续派发 ${input.targetName}`,
  });
  writeSse(input.streamRes, { type: "status", text: userText, agent: input.targetName });
  return result;
}

export function buildCoordinatorReworkFollowUp(
  item: any,
  input: {
    group: any;
    memorySnapshot: any;
    userMessage: string;
    coordinatorOutput: string;
    round: number;
    maxRounds: number;
    taskId?: string;
    sourceTask?: any;
  }
) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorReworkFollowUp(item, input);
}

export function buildCoordinatorReworkTask(
  item: any,
  input: { userMessage: string; coordinatorOutput: string; round: number; maxRounds: number; previousLedger?: any; reworkRoute?: any }
) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorReworkTask(item, input);
}

export function runCoordinatorReworkProtocolSelfTest() {
  return require("./collaboration-coordination-self-tests").runCoordinatorReworkProtocolSelfTest();
}

// Initial independent review, implementation repair, TestAgent recheck,
// optional spot-check repair, and final acceptance each need their own turn.
export const COORDINATOR_REVIEW_MAX_ROUNDS = 5;
/** Per review-subject cap for TestAgent rechecks (including provider-gap → Playwright reruns). */
export const TEST_AGENT_RECHECK_MAX_PER_SUBJECT = 2;

export function getTestAgentRecheckSubjectKey(item: any = {}) {
  return String(item?.reviewSubject || item?.originalTarget || item?.targetName || item?.project || "").trim();
}

export function isTestAgentRecheckFollowUp(item: any = {}) {
  const kind = String(item?.rework_kind || item?.kind || item?.source || "").toLowerCase();
  return item?.testAgentReviewRecheck === true
    || item?.test_agent_review_recheck === true
    || kind === "test_agent_review_recheck"
    || /test_agent_recheck|independent_review_needs_recheck/.test(kind);
}

/**
 * Enforce a per-subject recheck budget. Returns kept follow-ups and blocked subjects.
 * `counts` is mutated so callers can accumulate across coordinator rounds.
 */
export function applyTestAgentRecheckBudget(
  followUps: any[] = [],
  counts: Map<string, number> | Record<string, number> = new Map(),
  maxPerSubject = TEST_AGENT_RECHECK_MAX_PER_SUBJECT,
) {
  const map = counts instanceof Map ? counts : new Map(Object.entries(counts || {}));
  const kept: any[] = [];
  const blocked: Array<{ subject: string; count: number; max: number; reason: string }> = [];
  for (const item of followUps || []) {
    if (!isTestAgentRecheckFollowUp(item)) {
      kept.push(item);
      continue;
    }
    const subject = getTestAgentRecheckSubjectKey(item) || "test-agent";
    const used = Number(map.get(subject) || 0);
    if (used >= maxPerSubject) {
      blocked.push({
        subject,
        count: used,
        max: maxPerSubject,
        reason: `TestAgent 对 ${subject} 的复验已达上限 ${maxPerSubject} 次；请改为人工确认或缩小验收范围，避免无限 provider-gap 复验。`,
      });
      continue;
    }
    map.set(subject, used + 1);
    kept.push({
      ...item,
      testAgentRecheckCount: used + 1,
      test_agent_recheck_count: used + 1,
      testAgentRecheckMax: maxPerSubject,
      test_agent_recheck_max: maxPerSubject,
    });
  }
  return { kept, blocked, counts: map };
}

export function followUpTargetCompleted(outputs: string[] = [], targetName = "") {
  const target = String(targetName || "").trim().toLowerCase();
  if (!target) return false;
  const latest = [...(outputs || [])].reverse().find((output: string) =>
    String(getCollectedOutputAgent(output) || "").trim().toLowerCase() === target
  );
  return !!latest && getCollectedOutputReceiptStatus(latest) === "done";
}

export function scheduleTestAgentRecheckAfterFollowUps(followUps: any[] = [], outputs: string[] = []): any[] {
  return require("./collaboration-test-agent-runtime").scheduleTestAgentRecheckAfterFollowUps(followUps, outputs);
}

export function filterCoordinatorLlmFollowUpsAgainstHardRoutes(
  proposed: any[] = [],
  hardReviewFollowUps: any[] = [],
  hasScheduledTestAgentRecheck = false
) {
  const hardReviewSubjects = new Set(hardReviewFollowUps.flatMap((item: any) => [
    item?.reviewSubject,
    item?.originalTarget,
    isCoordinatorTestAgentName(item?.targetName || item?.project) ? "test-agent" : item?.targetName || item?.project,
  ]).map((value: any) => String(value || "").trim()).filter(Boolean));
  return (proposed || []).filter((item: any) => {
    const candidates = [item?.reviewSubject, item?.originalTarget, item?.targetName, item?.project]
      .map((value: any) => String(value || "").trim())
      .filter(Boolean);
    if (hasScheduledTestAgentRecheck && candidates.some(isCoordinatorTestAgentName)) return false;
    return !candidates.some((value: string) => hardReviewSubjects.has(value));
  });
}
