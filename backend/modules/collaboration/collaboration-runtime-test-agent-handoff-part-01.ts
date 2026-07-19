// Behavior-freeze split from collaboration-runtime-test-agent-handoff.ts (part 1/2).
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
  summarizeTestAgentBrowserFailedStep,
} from "./collaboration-runtime-test-agent-handoff-part-02";

export function getTestAgentHandoffPayload(handoff: any = null, legacyWorkOrder: any = null) {
  const direct = handoff?.handoff || handoff;
  if (direct?.schema === "ccm-test-agent-handoff-v1" && (Array.isArray(direct.projects) || direct.project)) return direct;
  const workOrder = direct?.work_order || direct?.workOrder || legacyWorkOrder;
  if (!workOrder || typeof workOrder !== "object") return null;
  const metadata = {
    ...(workOrder.metadata || {}),
    handoffSource: workOrder.metadata?.handoffSource || "group-main-agent-legacy-work-order",
    reviewSubject: getTestAgentHandoffReviewSubject(direct) || workOrder.metadata?.reviewSubject || workOrder.projects?.[0]?.name || "",
    verifier: direct?.target || direct?.verifier || workOrder.metadata?.verifier || "test-agent",
  };
  return {
    schema: "ccm-test-agent-handoff-v1",
    id: workOrder.id || buildTestAgentHandoffId(workOrder.taskId || workOrder.task_id, metadata.reviewSubject),
    taskId: workOrder.taskId || workOrder.task_id || "",
    groupId: workOrder.groupId || workOrder.group_id || "",
    issuedBy: workOrder.issuedBy || workOrder.issued_by || "group-main-agent",
    originalUserGoal: workOrder.originalUserGoal || workOrder.original_user_goal || "",
    acceptanceCriteria: workOrder.acceptanceCriteria || workOrder.acceptance_criteria || [],
    requiredChecks: workOrder.requiredChecks || workOrder.required_checks || [],
    projects: Array.isArray(workOrder.projects) ? workOrder.projects : [],
    options: workOrder.options || {},
    metadata,
    completedByProjectAgents: metadata.completedByProjectAgents || metadata.completed_by_project_agents || [],
    target: direct?.target || metadata.verifier,
    review_subject: metadata.reviewSubject,
    warnings: direct?.warnings || workOrder.metadata?.handoffWarnings || [],
    display_policy: direct?.display_policy || direct?.displayPolicy || {
      user_text_first: false,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

export function getTestAgentHandoffWarnings(handoff: any = null) {
  return uniqueStrings([
    ...(Array.isArray(handoff?.warnings) ? handoff.warnings : []),
    ...(Array.isArray(handoff?.metadata?.handoffWarnings) ? handoff.metadata.handoffWarnings : []),
  ]).slice(0, 12);
}

export function getTestAgentHandoffProjectWorkDir(handoff: any = null) {
  const project = Array.isArray(handoff?.projects) ? handoff.projects[0] : handoff?.project;
  return String(project?.workDir || project?.work_dir || "").trim();
}

export function validateTestAgentHandoffRegisteredWorkDirs(handoff: any, group: any, configs: any[]) {
  const projects = Array.isArray(handoff?.projects) ? handoff.projects : handoff?.project ? [handoff.project] : [];
  const registeredRoots = uniqueStrings((group?.members || [])
    .map((member: any) => resolveMemberRuntime(String(member?.project || ""), group, configs)?.workDir)
    .filter(Boolean))
    .map(root => {
      const resolved = path.resolve(root);
      try { return fs.realpathSync(resolved); } catch { return resolved; }
    });
  const invalid: string[] = [];
  for (const project of projects) {
    const raw = String(project?.workDir || project?.work_dir || "").trim();
    if (!raw) {
      invalid.push(`${project?.name || "project"}: missing workDir`);
      continue;
    }
    const resolved = path.resolve(raw);
    let real = resolved;
    try { real = fs.realpathSync(resolved); } catch {}
    const withinRegisteredRoot = registeredRoots.some(root => {
      const relative = path.relative(root, real);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
    if (!withinRegisteredRoot) invalid.push(`${project?.name || "project"}: workDir is outside registered group projects`);
  }
  return {
    valid: projects.length > 0 && invalid.length === 0,
    allowedWorkDirs: registeredRoots,
    invalid,
  };
}

function isRecord(value: any) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseJsonConfigValue(value: any) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text || !/^[\[{]/.test(text)) return value;
  try { return JSON.parse(text); } catch { return value; }
}

function configRecord(value: any) {
  const parsed = parseJsonConfigValue(value);
  return isRecord(parsed) ? parsed : {};
}

function configObjectArray(...values: any[]) {
  const rows: any[] = [];
  for (const value of values) {
    const parsed = parseJsonConfigValue(value);
    if (Array.isArray(parsed)) rows.push(...parsed.filter(isRecord));
    else if (isRecord(parsed)) rows.push(parsed);
  }
  return rows;
}

function firstConfigString(sources: any[], keys: string[]) {
  for (const source of sources) {
    if (!isRecord(source)) continue;
    for (const key of keys) {
      const value = source[key];
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function firstConfigNumber(sources: any[], keys: string[]) {
  const value = firstConfigString(sources, keys);
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export function hasConfiguredTestAgentMultiSessionBrowserCheck(...lists: any[][]) {
  return require("./collaboration-test-agent-runtime").hasConfiguredTestAgentMultiSessionBrowserCheck(...lists);
}

function getNestedTestAgentReviewConfig(config: any = {}) {
  return configRecord(
    config.test_agent
    || config.testAgent
    || config.test_agent_review
    || config.testAgentReview
    || config.test_agent_verification
    || config.testAgentVerification
    || {}
  );
}

export function collectConfiguredTestAgentReviewConfig(projectName: string) {
  const baseConfig = getProjectExtraConfig(projectName);
  const nestedConfig = getNestedTestAgentReviewConfig(baseConfig);
  const sources = [nestedConfig, baseConfig];
  const project: any = {};
  const runCommand = firstConfigString(sources, ["runCommand", "run_command", "testAgentRunCommand", "test_agent_run_command"]);
  const devServerCommand = firstConfigString(sources, ["devServerCommand", "dev_server_command", "startCommand", "start_command", "testAgentDevServerCommand", "test_agent_dev_server_command"]);
  const targetUrl = firstConfigString(sources, ["targetUrl", "target_url", "baseUrl", "base_url", "appUrl", "app_url", "testAgentTargetUrl", "test_agent_target_url"]);
  const startupUrl = firstConfigString(sources, ["startupUrl", "startup_url", "startUrl", "start_url", "testAgentStartupUrl", "test_agent_startup_url"]);
  const startupTimeoutMs = firstConfigNumber(sources, ["startupTimeoutMs", "startup_timeout_ms", "testAgentStartupTimeoutMs", "test_agent_startup_timeout_ms"]);
  if (runCommand) project.runCommand = runCommand;
  if (devServerCommand) project.devServerCommand = devServerCommand;
  if (targetUrl) project.targetUrl = targetUrl;
  if (startupUrl) project.startupUrl = startupUrl;
  if (startupTimeoutMs) project.startupTimeoutMs = startupTimeoutMs;
  const env = configRecord(nestedConfig.env || nestedConfig.environment || baseConfig.test_agent_env || baseConfig.testAgentEnv);
  if (Object.keys(env).length) project.env = env;
  const httpChecks = configObjectArray(nestedConfig.httpChecks, nestedConfig.http_checks, nestedConfig.apiChecks, nestedConfig.api_checks, baseConfig.test_agent_http_checks, baseConfig.testAgentHttpChecks);
  const adversarialHttpChecks = configObjectArray(nestedConfig.adversarialHttpChecks, nestedConfig.adversarial_http_checks, nestedConfig.adversarialApiChecks, nestedConfig.adversarial_api_checks, baseConfig.test_agent_adversarial_http_checks, baseConfig.testAgentAdversarialHttpChecks);
  const browserChecks = configObjectArray(nestedConfig.browserChecks, nestedConfig.browser_checks, baseConfig.test_agent_browser_checks, baseConfig.testAgentBrowserChecks);
  const adversarialBrowserChecks = configObjectArray(nestedConfig.adversarialBrowserChecks, nestedConfig.adversarial_browser_checks, baseConfig.test_agent_adversarial_browser_checks, baseConfig.testAgentAdversarialBrowserChecks);
  const adversarialBrowserProbeTemplates = configObjectArray(nestedConfig.adversarialBrowserProbeTemplates, nestedConfig.adversarial_browser_probe_templates, baseConfig.test_agent_browser_probe_templates, baseConfig.testAgentBrowserProbeTemplates);
  const hasMultiSessionBrowserCheck = hasConfiguredTestAgentMultiSessionBrowserCheck(browserChecks, adversarialBrowserChecks);
  if (httpChecks.length) project.httpChecks = httpChecks;
  if (adversarialHttpChecks.length) project.adversarialHttpChecks = adversarialHttpChecks;
  if (browserChecks.length) project.browserChecks = browserChecks;
  if (adversarialBrowserChecks.length) project.adversarialBrowserChecks = adversarialBrowserChecks;
  if (adversarialBrowserProbeTemplates.length) project.adversarialBrowserProbeTemplates = adversarialBrowserProbeTemplates;
  const requiredChecks = uniqueStrings(
    normalizeProjectConfigList(nestedConfig.requiredChecks || nestedConfig.required_checks || baseConfig.test_agent_required_checks || baseConfig.testAgentRequiredChecks),
    targetUrl || startupUrl || httpChecks.length || adversarialHttpChecks.length ? ["http"] : [],
    targetUrl || browserChecks.length || adversarialBrowserChecks.length || adversarialBrowserProbeTemplates.length ? ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"] : [],
    targetUrl || browserChecks.length || adversarialBrowserChecks.length || adversarialBrowserProbeTemplates.length ? ["browser_trace", "browser_har"] : [],
    hasMultiSessionBrowserCheck ? ["browser_multi_session"] : [],
    adversarialHttpChecks.length || adversarialBrowserChecks.length || adversarialBrowserProbeTemplates.length ? ["adversarial"] : [],
  ).slice(0, 16);
  const options = configRecord(nestedConfig.options || baseConfig.test_agent_options || baseConfig.testAgentOptions);
  const hasExecutableSurface = !!(project.targetUrl || project.startupUrl || httpChecks.length || adversarialHttpChecks.length || browserChecks.length || adversarialBrowserChecks.length || adversarialBrowserProbeTemplates.length);
  return { project, requiredChecks, options, hasExecutableSurface };
}

export function buildCoordinatorTestAgentHandoff(item: any, input: {
  group: any;
  sourceTask?: any;
  taskId?: string;
  previousLedger?: any;
  reworkRoute?: any;
  userMessage?: string;
  coordinatorOutput?: string;
}) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorTestAgentHandoff(item, input);
}

export function testAgentStatusToReceiptStatus(status: any) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "passed") return "done";
  if (value === "failed") return "failed";
  if (value === "partial") return "partial";
  if (value === "blocked") return "blocked";
  return "blocked";
}

function testAgentStatusToReviewVerdict(status: any) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "passed") return "passed";
  if (value === "failed") return "failed";
  if (value === "partial") return "partial";
  if (value === "blocked") return "blocked";
  return "unknown";
}

export function readTestAgentVerdictArtifact(report: TestAgentReport): TestAgentVerdict | null {
  const artifactFiles = (report.metadata?.artifactFiles || {}) as Record<string, string>;
  const candidates = uniqueStrings([
    artifactFiles.verdictJsonPath,
    report.artifactDir ? path.join(report.artifactDir, "verdict.json") : "",
  ]);
  for (const file of candidates) {
    try {
      if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed?.schema === "ccm-test-agent-verdict-v1") return parsed as TestAgentVerdict;
    } catch {}
  }
  return null;
}

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTestAgentReportForVerdict(report: TestAgentReport): TestAgentReport {
  return {
    ...report,
    commandResults: safeArray(report.commandResults),
    devServerResults: safeArray(report.devServerResults),
    httpResults: safeArray(report.httpResults),
    browserResults: safeArray(report.browserResults),
    browserToolCalls: safeArray(report.browserToolCalls),
    browserNetworkSummary: safeArray(report.browserNetworkSummary),
    browserInteractionSummary: safeArray(report.browserInteractionSummary),
    failureSummary: safeArray((report as any).failureSummary),
    requiredCheckCoverage: safeArray(report.requiredCheckCoverage),
    acceptanceCoverage: safeArray(report.acceptanceCoverage),
    evidence: safeArray(report.evidence),
    risks: safeArray(report.risks),
    blockedReasons: safeArray(report.blockedReasons),
    issues: safeArray(report.issues),
    metadata: report.metadata && typeof report.metadata === "object" ? report.metadata : {},
  } as TestAgentReport;
}

function buildTestAgentVerdictFromReport(report: TestAgentReport): TestAgentVerdict | null {
  try {
    return buildTestAgentVerdict(normalizeTestAgentReportForVerdict(report));
  } catch {
    return null;
  }
}

function buildLegacyTestAgentDecisionVerdict(report: TestAgentReport): TestAgentVerdict {
  const status = String(report?.status || "blocked") as TestAgentVerdict["status"];
  const recommendation = String(report?.recommendation || "need_human") as TestAgentVerdict["recommendation"];
  const requiredCoverage = safeArray((report as any).requiredCheckCoverage);
  const acceptanceCoverage = safeArray((report as any).acceptanceCoverage);
  return {
    schema: "ccm-test-agent-verdict-v1",
    agent: "test-agent",
    reportId: String((report as any)?.id || ""),
    workOrderId: String((report as any)?.workOrderId || ""),
    taskId: String((report as any)?.taskId || ""),
    groupId: String((report as any)?.groupId || ""),
    status,
    recommendation,
    canAccept: status === "passed" && recommendation === "accept",
    needsRework: recommendation === "rework" || status === "failed",
    needsHuman: recommendation === "need_human" || status === "blocked" || status === "partial",
    summary: String((report as any)?.summary || ""),
    failedRequiredChecks: requiredCoverage.filter((item: any) => item?.status === "not_verified"),
    unknownRequiredChecks: requiredCoverage.filter((item: any) => item?.status === "unknown"),
    failedAcceptanceCriteria: acceptanceCoverage.filter((item: any) => item?.status === "not_verified"),
    unknownAcceptanceCriteria: acceptanceCoverage.filter((item: any) => item?.status === "unknown"),
    requiredCheckSummary: (report as any).requiredCheckSummary || null,
    acceptanceSummary: (report as any).acceptanceSummary || null,
    blockedReasons: safeArray((report as any).blockedReasons),
    risks: safeArray((report as any).risks),
    nextActions: [],
    evidenceSummary: {
      commands: {},
      devServers: {},
      httpChecks: {},
      browserChecks: {},
      browserToolCalls: {},
      artifacts: 0,
    },
    browserNetworkSummary: safeArray((report as any).browserNetworkSummary),
    browserInteractionSummary: safeArray((report as any).browserInteractionSummary),
    browserFlowSummary: (report as any).browserFlowSummary,
    browserMultiSessionSummary: (report as any).browserMultiSessionSummary,
    browserStabilitySummary: (report as any).browserStabilitySummary,
    browserRecoverySummary: (report as any).browserRecoverySummary,
    browserActionEffectSummary: (report as any).browserActionEffectSummary,
    adversarialEvidenceSummary: (report as any).adversarialEvidenceSummary,
    browserProviderSummary: (report as any).browserProviderSummary,
    browserProviderGaps: safeArray((report as any).browserProviderGaps),
    failureSummary: safeArray((report as any).failureSummary),
    keyEvidence: safeArray((report as any).evidence).slice(0, 12),
    artifacts: {
      artifactDir: String((report as any)?.artifactDir || ""),
    },
    metadata: {},
  } as TestAgentVerdict;
}

function testAgentCoverageIdentity(item: any) {
  const evidence = Array.isArray(item?.evidence) ? item.evidence.join("|") : "";
  return [
    item?.check || item?.criterion || "",
    item?.status || "",
    item?.missingReason || "",
    evidence,
  ].join("|") || JSON.stringify(item || {});
}

function uniqueTestAgentCoverageItems(...lists: any[]) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const list of lists) {
    for (const item of safeArray(list)) {
      const key = testAgentCoverageIdentity(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function collectReportCoverageByStatus(report: TestAgentReport, key: "requiredCheckCoverage" | "acceptanceCoverage", status: "not_verified" | "unknown") {
  return safeArray((report as any)?.[key]).filter((item: any) => item?.status === status);
}

function buildTestAgentCoverageStatusSummary(items: any[], kind: "required" | "acceptance") {
  const rows = safeArray(items).filter(item => item && typeof item === "object");
  if (!rows.length) return null;
  const verified = rows.filter(item => item?.status === "verified");
  const notVerified = rows.filter(item => item?.status === "not_verified");
  const unknown = rows.filter(item => item?.status === "unknown");
  const summary: any = {
    total: rows.length,
    statusCounts: {
      verified: verified.length,
      not_verified: notVerified.length,
      unknown: unknown.length,
    },
    verified,
    notVerified,
    unknown,
  };
  if (kind === "acceptance") {
    summary.matchStrengthCounts = {};
    summary.evidenceSourceCounts = {};
    for (const item of rows) {
      const matchStrength = String(item?.matchStrength || item?.match_strength || "").trim();
      const evidenceSource = String(item?.evidenceSource || item?.evidence_source || "").trim();
      if (matchStrength) summary.matchStrengthCounts[matchStrength] = Number(summary.matchStrengthCounts[matchStrength] || 0) + 1;
      if (evidenceSource) summary.evidenceSourceCounts[evidenceSource] = Number(summary.evidenceSourceCounts[evidenceSource] || 0) + 1;
    }
  }
  return summary;
}

function strengthenTestAgentVerdictWithReportCoverage(report: TestAgentReport, verdict: TestAgentVerdict | null): TestAgentVerdict | null {
  if (!verdict) return null;
  const failedRequiredChecks = uniqueTestAgentCoverageItems(
    verdict.failedRequiredChecks,
    collectReportCoverageByStatus(report, "requiredCheckCoverage", "not_verified")
  );
  const unknownRequiredChecks = uniqueTestAgentCoverageItems(
    verdict.unknownRequiredChecks,
    collectReportCoverageByStatus(report, "requiredCheckCoverage", "unknown")
  );
  const failedAcceptanceCriteria = uniqueTestAgentCoverageItems(
    verdict.failedAcceptanceCriteria,
    collectReportCoverageByStatus(report, "acceptanceCoverage", "not_verified")
  );
  const unknownAcceptanceCriteria = uniqueTestAgentCoverageItems(
    verdict.unknownAcceptanceCriteria,
    collectReportCoverageByStatus(report, "acceptanceCoverage", "unknown")
  );
  const hasFailedCoverage = failedRequiredChecks.length > 0 || failedAcceptanceCriteria.length > 0;
  const hasUnknownCoverage = unknownRequiredChecks.length > 0 || unknownAcceptanceCriteria.length > 0;
  const browserFlows = summarizeTestAgentBrowserFlows(report, verdict);
  const hasFailedBrowserFlows = !!browserFlows?.failedCount || !!browserFlows?.failedStepCount;
  const hasIncompleteBrowserFlows = !!browserFlows?.blockedCount || !!browserFlows?.skippedCount;
  const multiSessionBrowser = summarizeTestAgentMultiSessionBrowser(report, verdict);
  const hasFailedMultiSessionBrowser = !!multiSessionBrowser?.failedCount
    || !!multiSessionBrowser?.failedStepCount
    || !!multiSessionBrowser?.failedComparisonCount;
  const hasIncompleteMultiSessionBrowser = !!multiSessionBrowser?.blockedCount || !!multiSessionBrowser?.skippedCount;
  const browserAuthentication = summarizeTestAgentBrowserAuthentication(report, verdict);
  const hasFailedBrowserAuthentication = !!browserAuthentication?.failedChecks;
  const hasIncompleteBrowserAuthentication = !!browserAuthentication?.blockedChecks || !!browserAuthentication?.pendingChecks;
  const browserActionEffects = summarizeTestAgentBrowserActionEffects(report, verdict);
  const hasFailedBrowserActionEffects = !!browserActionEffects?.unchanged;
  const hasIncompleteBrowserActionEffects = !!browserActionEffects?.unavailable;
  const browserRecovery = summarizeTestAgentBrowserRecovery(report, verdict);
  const hasIncompleteBrowserRecovery = !!browserRecovery?.failed || !!browserRecovery?.notRetried;
  const adversarialEvidence = summarizeTestAgentAdversarialEvidence(report, verdict);
  const hasFailedAdversarialEvidence = adversarialEvidence?.status === "failed";
  const hasIncompleteAdversarialEvidence = adversarialEvidence?.status === "missing"
    || adversarialEvidence?.status === "unlinked";
  const hasBlockedAdversarialEvidence = adversarialEvidence?.status === "blocked";
  const requiredCheckSummary = (verdict as any).requiredCheckSummary
    || buildTestAgentCoverageStatusSummary(safeArray((report as any).requiredCheckCoverage), "required");
  const acceptanceSummary = (verdict as any).acceptanceSummary
    || buildTestAgentCoverageStatusSummary(safeArray((report as any).acceptanceCoverage), "acceptance");
  const needsEnrichment = (!verdict.browserFlowSummary && !!browserFlows?.raw)
    || (!(verdict as any).browserMultiSessionSummary && !!multiSessionBrowser?.raw)
    || (!(verdict as any).browserAuthenticationSummary && !!browserAuthentication?.raw)
    || (!(verdict as any).browserActionEffectSummary && !!browserActionEffects?.raw)
    || (!(verdict as any).browserRecoverySummary && !!browserRecovery?.raw)
    || (!(verdict as any).adversarialEvidenceSummary && !!adversarialEvidence?.raw)
    || !requiredCheckSummary
    || !acceptanceSummary;
  const {
    summarizeTestAgentBrowserProviderGaps,
    deriveIndependentReviewDecision,
  } = require("./test-agent-independent-review-decision");
  const providerGaps = summarizeTestAgentBrowserProviderGaps(report, verdict);
  const {
    countTestAgentFlakyStabilityGroups,
  } = require("./test-agent-environment-prep");
  const flakyStabilityGroups = countTestAgentFlakyStabilityGroups(report, verdict);
  const hasFlakyStability = flakyStabilityGroups > 0;
  if (!hasFailedCoverage
    && !hasUnknownCoverage
    && !hasFailedBrowserFlows
    && !hasIncompleteBrowserFlows
    && !hasFailedMultiSessionBrowser
    && !hasIncompleteMultiSessionBrowser
    && !hasFailedBrowserAuthentication
    && !hasIncompleteBrowserAuthentication
    && !hasFailedBrowserActionEffects
    && !hasIncompleteBrowserActionEffects
    && !hasIncompleteBrowserRecovery
    && !hasFailedAdversarialEvidence
    && !hasIncompleteAdversarialEvidence
    && !hasBlockedAdversarialEvidence
    && !providerGaps.hasGaps
    && !hasFlakyStability
    && !needsEnrichment) return verdict;
  const forceRework = hasFailedCoverage
    || hasFailedBrowserFlows
    || hasFailedMultiSessionBrowser
    || hasFailedBrowserAuthentication
    || hasFailedBrowserActionEffects
    || hasFailedAdversarialEvidence
    || verdict.needsRework === true;
  const forceRecheck = !forceRework && (
    hasIncompleteBrowserActionEffects
    || hasIncompleteBrowserRecovery
    || hasIncompleteAdversarialEvidence
    || providerGaps.hasGaps
    || hasFlakyStability
    || (verdict as any).needsRecheck === true
  );
  const forceEnvironment = !forceRework && !forceRecheck && (
    hasBlockedAdversarialEvidence
    || hasIncompleteBrowserAuthentication
  );
  const forceHuman = !forceRework && !forceRecheck && !forceEnvironment && (
    hasUnknownCoverage
    || hasIncompleteBrowserFlows
    || hasIncompleteMultiSessionBrowser
    || verdict.needsHuman === true
  );
  const decision = deriveIndependentReviewDecision({
    report,
    verdict,
    forceReworkSignals: forceRework,
    forceRecheckSignals: forceRecheck,
    forceEnvironmentSignals: forceEnvironment,
    forceHumanSignals: forceHuman,
  });
  const retainedNextActions = safeArray(verdict.nextActions)
    .filter(item => !/Accept the delivery/i.test(String(item || "")));
  return {
    ...verdict,
    status: decision.needsRework ? "failed" : decision.canAccept ? verdict.status : "partial",
    recommendation: decision.needsRework ? "rework" : decision.canAccept ? verdict.recommendation : "need_human",
    canAccept: decision.canAccept,
    needsRework: decision.needsRework,
    needsHuman: decision.needsHuman || decision.needsRecheck || decision.needsEnvironment,
    needsRecheck: decision.needsRecheck,
    needsEnvironment: decision.needsEnvironment,
    reviewRoute: decision.reviewRoute,
    failedRequiredChecks,
    unknownRequiredChecks,
    failedAcceptanceCriteria,
    unknownAcceptanceCriteria,
    blockedReasons: uniqueStrings(
      verdict.blockedReasons,
      hasUnknownCoverage ? ["TestAgent 有验收或必检项待确认，需要补齐证据后再验收。"] : [],
      hasIncompleteBrowserFlows ? ["TestAgent 有真实浏览器验收流程受阻或未执行，需要补齐执行条件后再验收。"] : [],
      hasIncompleteMultiSessionBrowser ? ["TestAgent 有多人协作浏览器场景受阻或未执行，需要补齐会话、登录或运行条件后再验收。"] : [],
      hasIncompleteBrowserAuthentication ? ["TestAgent 的登录态浏览器验收受阻，需要补齐测试账号或登录条件后再验收。"] : [],
      hasIncompleteBrowserActionEffects ? ["TestAgent 暂时无法确认部分操作是否真正生效，需要补齐可观察结果后重新复验。"] : [],
      hasIncompleteBrowserRecovery ? ["TestAgent 的浏览器会话恢复验证尚未闭环，需要重新建立会话后复验。"] : [],
      hasIncompleteAdversarialEvidence ? ["TestAgent 缺少与当前目标关联的边界或异常验证，需要补充复核工作单后重跑。"] : [],
      hasBlockedAdversarialEvidence ? ["TestAgent 的边界或异常验证受环境、登录或运行条件阻塞。"] : [],
      hasFlakyStability ? [`TestAgent 发现 ${flakyStabilityGroups} 组浏览器稳定性结果不稳定（flaky），必须重新复验后才能验收。`] : [],
      providerGaps.hasGaps ? ["TestAgent 浏览器 Provider 能力不足，应改走 Playwright 后重新复验。"] : [],
      providerGaps.lines.map((line: string) => `Provider缺口：${line}`)
    ),
    risks: uniqueStrings(
      verdict.risks,
      hasFailedCoverage ? ["TestAgent 仍有未通过或未覆盖项，主 Agent 不能直接验收。"] : [],
      hasUnknownCoverage ? ["TestAgent 仍有待确认覆盖项，主 Agent 不能直接验收。"] : [],
      hasFailedBrowserFlows ? ["TestAgent 的真实浏览器验收流程仍有失败项，主 Agent 不能直接验收。"] : [],
      hasIncompleteBrowserFlows ? ["TestAgent 的真实浏览器验收流程尚未全部执行完成，主 Agent 不能直接验收。"] : [],
      hasFailedMultiSessionBrowser ? ["TestAgent 的多人协作浏览器验收仍有失败角色或跨会话结果不一致，主 Agent 不能直接验收。"] : [],
      hasIncompleteMultiSessionBrowser ? ["TestAgent 的多人协作浏览器验收尚未全部执行完成，主 Agent 不能直接验收。"] : [],
      hasFailedBrowserAuthentication ? ["TestAgent 的登录态浏览器验收仍有失败项，主 Agent 不能直接验收。"] : [],
      hasIncompleteBrowserAuthentication ? ["TestAgent 的登录态浏览器验收尚未全部确认，主 Agent 不能直接验收。"] : [],
      hasFailedBrowserActionEffects ? ["TestAgent 发现页面操作没有产生可见效果，主 Agent 不能直接验收。"] : [],
      hasIncompleteBrowserActionEffects ? ["TestAgent 暂时无法观察部分操作结果，当前通过证据只能视为未闭环。"] : [],
      hasIncompleteBrowserRecovery ? ["TestAgent 的浏览器会话恢复或安全重试尚未闭环，不能据此宣布完成。"] : [],
      hasFailedAdversarialEvidence ? ["TestAgent 的边界或异常检查未通过，主 Agent 不能直接验收。"] : [],
      providerGaps.hasGaps ? ["TestAgent 存在浏览器 Provider 能力缺口，不能把 MCP/Computer Use 假绿当成验收通过。"] : [],
      hasFlakyStability ? ["TestAgent 浏览器稳定性出现 flaky，主 Agent 不能直接验收。"] : [],
      hasIncompleteAdversarialEvidence ? ["TestAgent 尚未提供与当前目标关联的边界或异常证据，主 Agent 不能直接验收。"] : [],
      hasBlockedAdversarialEvidence ? ["TestAgent 的边界或异常验证受执行条件阻塞，主 Agent 不能直接验收。"] : []
    ),
    nextActions: uniqueStrings(
      retainedNextActions,
      hasFlakyStability
        ? [
            `Re-run the ${flakyStabilityGroups} flaky browser stability group(s) until results are stable.`,
            "Do not accept the delivery while browser stability remains flaky.",
          ]
        : [],
      providerGaps.hasGaps
        ? [
            "Switch browser provider to Playwright for URL/DOM/upload-capable checks.",
            "Re-run TestAgent after rewriting the handoff away from unsupported MCP/Computer Use actions.",
          ]
        : [],
      hasFailedCoverage
        ? [
            "Route the task back to the implementation agent with failed evidence.",
            "Run TestAgent again after rework.",
          ]
        : [],
      hasUnknownCoverage
        ? [
            "Resolve incomplete verification coverage before accepting the delivery.",
            "Treat passed evidence as partial only; do not accept until missing coverage is verified or explicitly waived.",
          ]
        : [],
      hasFailedBrowserFlows
        ? [
            "Route failed browser acceptance flows back to the implementation agent.",
            "Run TestAgent again after browser flow rework.",
          ]
        : [],
      hasIncompleteBrowserFlows
        ? ["Complete blocked or skipped browser acceptance flows before accepting the delivery."]
        : [],
      hasFailedMultiSessionBrowser
        ? [
            "Route failed multi-session browser scenarios back to the implementation agent.",
            "Run TestAgent again after multi-session browser rework.",
          ]
        : [],
      hasIncompleteMultiSessionBrowser
        ? ["Complete blocked or skipped multi-session browser scenarios before accepting the delivery."]
        : [],
      hasFailedBrowserAuthentication
        ? [
            "Route failed authenticated browser checks back to the implementation agent.",
            "Run TestAgent again after authenticated browser rework.",
          ]
        : [],
      hasIncompleteBrowserAuthentication
        ? ["Complete blocked authenticated browser checks before accepting the delivery."]
        : [],
      hasFailedBrowserActionEffects
        ? [
            "Route browser actions without visible effects back to the implementation agent.",
            "Run TestAgent again after action-effect rework.",
          ]
        : [],
      hasIncompleteBrowserActionEffects
        ? ["Rerun TestAgent with observable browser action effects before accepting the delivery."]
        : [],
      hasIncompleteBrowserRecovery
        ? ["Re-establish browser sessions and rerun TestAgent without repeating unsafe side effects."]
        : [],
      hasFailedAdversarialEvidence
        ? [
            "Route failed adversarial checks back to the implementation agent.",
            "Run TestAgent again after adversarial rework.",
          ]
        : [],
      hasIncompleteAdversarialEvidence
        ? ["Add goal-linked adversarial checks to the TestAgent work order and rerun TestAgent."]
        : [],
      hasBlockedAdversarialEvidence
        ? ["Complete blocked adversarial checks after restoring environment or login conditions."]
        : []
    ),
    requiredCheckSummary,
    acceptanceSummary,
    browserFlowSummary: (verdict as any).browserFlowSummary || browserFlows?.raw,
    browserMultiSessionSummary: (verdict as any).browserMultiSessionSummary || multiSessionBrowser?.raw,
    browserAuthenticationSummary: (verdict as any).browserAuthenticationSummary
      || compactTestAgentBrowserAuthenticationSummary(browserAuthentication),
    browserActionEffectSummary: browserActionEffects?.raw || (verdict as any).browserActionEffectSummary,
    browserRecoverySummary: browserRecovery?.raw || (verdict as any).browserRecoverySummary,
    adversarialEvidenceSummary: adversarialEvidence?.raw || (verdict as any).adversarialEvidenceSummary,
  } as TestAgentVerdict;
}

export function resolveTestAgentDecisionVerdict(report: TestAgentReport, artifactVerdict: TestAgentVerdict | null = readTestAgentVerdictArtifact(report)) {
  const reportVerdict = buildTestAgentVerdictFromReport(report);
  const verdict = artifactVerdict && reportVerdict
    ? {
        ...reportVerdict,
        ...artifactVerdict,
        requiredCheckSummary: artifactVerdict.requiredCheckSummary || reportVerdict.requiredCheckSummary,
        acceptanceSummary: artifactVerdict.acceptanceSummary || reportVerdict.acceptanceSummary,
        browserFlowSummary: artifactVerdict.browserFlowSummary || reportVerdict.browserFlowSummary,
        browserMultiSessionSummary: artifactVerdict.browserMultiSessionSummary || reportVerdict.browserMultiSessionSummary,
        browserAuthenticationSummary: (artifactVerdict as any).browserAuthenticationSummary
          || (reportVerdict as any).browserAuthenticationSummary,
        browserActionEffectSummary: artifactVerdict.browserActionEffectSummary || reportVerdict.browserActionEffectSummary,
        browserRecoverySummary: artifactVerdict.browserRecoverySummary || reportVerdict.browserRecoverySummary,
        adversarialEvidenceSummary: artifactVerdict.adversarialEvidenceSummary || reportVerdict.adversarialEvidenceSummary,
        browserProviderSummary: artifactVerdict.browserProviderSummary || reportVerdict.browserProviderSummary,
        browserProviderGaps: artifactVerdict.browserProviderGaps || reportVerdict.browserProviderGaps,
        failureSummary: artifactVerdict.failureSummary || reportVerdict.failureSummary,
      }
    : artifactVerdict || reportVerdict || buildLegacyTestAgentDecisionVerdict(report);
  return strengthenTestAgentVerdictWithReportCoverage(report, verdict);
}

export function testAgentDecisionReceiptStatus(report: TestAgentReport, verdict: TestAgentVerdict | null) {
  return require("./collaboration-acceptance").testAgentDecisionReceiptStatus(report, verdict);
}

export function testAgentDecisionReviewVerdict(report: TestAgentReport, verdict: TestAgentVerdict | null) {
  if (verdict?.canAccept === true) return "passed";
  if (verdict?.needsRework === true) return "failed";
  if ((verdict as any)?.needsRecheck === true) return "needs_recheck";
  if ((verdict as any)?.needsEnvironment === true) return "needs_environment";
  if (verdict?.needsHuman === true) return "blocked";
  return testAgentStatusToReviewVerdict(verdict?.status || report.status);
}

export function testAgentDecisionLabel(report: TestAgentReport, verdict: TestAgentVerdict | null) {
  if (verdict?.canAccept === true) return "可以接受";
  if (verdict?.needsRework === true) return "需要返工";
  if ((verdict as any)?.needsRecheck === true) return "需要重新复验";
  if ((verdict as any)?.needsEnvironment === true) return "需要补齐环境条件";
  if (verdict?.needsHuman === true) return "需要人工确认";
  return testAgentRecommendationLabel(verdict?.recommendation || report.recommendation);
}

function summarizeTestAgentCoverageGap(item: any, kind: "required" | "acceptance", state: "failed" | "unknown") {
  if (kind === "required") {
    const check = testAgentEvidenceTypeLabel(item?.check);
    const reason = item?.missingReason ? `：${compactMemoryText(item.missingReason, 140)}` : "";
    return `必检项 ${check}${state === "failed" ? "未覆盖" : "待确认"}${reason}`;
  }
  const criterion = compactMemoryText(item?.criterion || "未命名验收条件", 180);
  return `验收条件${state === "failed" ? "未通过" : "待确认"}：${criterion}`;
}

export function collectTestAgentVerdictGapLines(verdict: TestAgentVerdict | null) {
  if (!verdict) return [];
  return uniqueStrings([
    ...(Array.isArray(verdict.failedRequiredChecks) ? verdict.failedRequiredChecks.map(item => summarizeTestAgentCoverageGap(item, "required", "failed")) : []),
    ...(Array.isArray(verdict.unknownRequiredChecks) ? verdict.unknownRequiredChecks.map(item => summarizeTestAgentCoverageGap(item, "required", "unknown")) : []),
    ...(Array.isArray(verdict.failedAcceptanceCriteria) ? verdict.failedAcceptanceCriteria.map(item => summarizeTestAgentCoverageGap(item, "acceptance", "failed")) : []),
    ...(Array.isArray(verdict.unknownAcceptanceCriteria) ? verdict.unknownAcceptanceCriteria.map(item => summarizeTestAgentCoverageGap(item, "acceptance", "unknown")) : []),
  ]).slice(0, 12);
}

function friendlyTestAgentNextAction(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/Accept the delivery/i.test(text)) return "如果复核范围与用户目标一致，主 Agent 可以接受本次交付。";
  if (/Keep the TestAgent report/i.test(text)) return "保留 TestAgent 报告和证据清单到任务技术详情。";
  if (/Route failed authenticated browser checks/i.test(text)) return "把未通过的登录态浏览器检查交回原实现成员返工。";
  if (/authenticated browser rework/i.test(text)) return "登录流程或会话恢复修复后，我会自动重新运行 TestAgent 复核。";
  if (/Complete blocked authenticated browser checks/i.test(text)) return "先补齐测试账号或登录条件，再重新执行登录态浏览器验收。";
  if (/Route browser actions without visible effects/i.test(text)) return "把没有产生可见效果的页面操作交回原实现成员修复。";
  if (/action-effect rework/i.test(text)) return "交互结果修复后，我会自动重新运行 TestAgent 复核。";
  if (/observable browser action effects/i.test(text)) return "补齐可观察的页面结果后重新运行 TestAgent 复验，不要直接判定实现返工。";
  if (/Re-establish browser sessions/i.test(text)) return "重新建立浏览器会话并安全复验，避免重复点击或提交造成副作用。";
  if (/Route failed adversarial checks/i.test(text)) return "把未通过的边界或异常检查交回原实现成员修复。";
  if (/adversarial rework/i.test(text)) return "边界问题修复后，我会自动重新运行 TestAgent 复核。";
  if (/Add goal-linked adversarial checks/i.test(text)) return "补充与当前目标关联的边界或异常检查到 TestAgent 工作单，并重新运行复核。";
  if (/Complete blocked adversarial checks/i.test(text)) return "先补齐环境、登录或运行条件，再重新执行边界与异常验证。";
  if (/Route the task back/i.test(text)) return "把失败检查项带回给原实现成员返工。";
  if (/Use failed command|HTTP|browser|acceptance evidence/i.test(text)) return "返工前先查看失败的命令、接口、浏览器或验收证据。";
  if (/Run TestAgent again/i.test(text)) return "返工完成后，我会自动重新运行 TestAgent 复核。";
  if (/Route failed browser acceptance flows/i.test(text)) return "把未通过的真实浏览器验收流程交回原实现成员返工。";
  if (/browser flow rework/i.test(text)) return "浏览器流程修复后，我会自动重新运行 TestAgent 复核。";
  if (/Complete blocked or skipped browser acceptance flows/i.test(text)) return "先补齐受阻或未执行的真实浏览器验收流程。";
  if (/Resolve incomplete verification coverage/i.test(text)) return "补齐未覆盖的验证证据。";
  if (/Treat passed evidence as partial/i.test(text)) return "当前通过证据只能视为部分通过，不能直接验收。";
  if (/Resolve blocked TestAgent execution/i.test(text)) return "先解决 TestAgent 执行阻塞，再进入最终验收。";
  if (/Check workDir|commands|dev server|browser provider|handoff/i.test(text)) return "检查项目目录、验证命令、服务启动、浏览器能力和交接信息。";
  return sanitizeMainAgentUserText(text, "按 TestAgent 复核结论处理下一步。", 220);
}

export function collectTestAgentVerdictNextActions(verdict: TestAgentVerdict | null) {
  return uniqueStrings((Array.isArray(verdict?.nextActions) ? verdict.nextActions : []).map(friendlyTestAgentNextAction)).slice(0, 8);
}

function testAgentFailureTypeLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    issue: "工作单问题",
    server: "服务启动",
    command: "命令验证",
    http: "接口检查",
    browser: "浏览器检查",
    required_check: "必检项",
    acceptance: "验收条件",
  };
  return labels[value] || "复核问题";
}

function scrubTestAgentEvidencePathText(value: any) {
  return String(value || "")
    .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
    .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
    .replace(/\b(?:report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}

function sanitizeTestAgentFailureText(value: any, fallback = "复核发现待补齐的问题。", max = 220) {
  return sanitizeMainAgentUserText(compactMemoryText(scrubTestAgentEvidencePathText(value || fallback), max), fallback, max);
}

function collectTestAgentFailureSummaryItems(report: TestAgentReport, verdict: TestAgentVerdict | null = null) {
  return uniqueByKey(
    [
      ...(Array.isArray((report as any)?.failureSummary) ? (report as any).failureSummary : []),
      ...(Array.isArray((verdict as any)?.failureSummary) ? (verdict as any).failureSummary : []),
    ].filter(Boolean),
    (item: any) => [
      item?.type || "",
      item?.project || "",
      item?.title || "",
      item?.reason || "",
      item?.nextAction || "",
    ].join("|")
  ).slice(0, 8);
}

function summarizeTestAgentFailureItem(item: any) {
  const type = testAgentFailureTypeLabel(item?.type);
  const project = sanitizeTestAgentFailureText(item?.project, "", 70);
  const title = sanitizeTestAgentFailureText(item?.title || item?.reason, "复核发现问题", 100);
  const reason = sanitizeTestAgentFailureText(item?.reason || item?.status, "需要补齐或修复后再验收。", 160);
  const prefix = project ? `${project}：${type}` : type;
  return `${prefix}「${title}」未通过：${reason}`;
}

function summarizeTestAgentDiagnosticItem(item: any) {
  const diagnostics = Array.isArray(item?.diagnostics) ? item.diagnostics : [];
  const nextAction = item?.nextAction ? [item.nextAction] : [];
  const [first] = [...diagnostics, ...nextAction]
    .map((value: any) => sanitizeTestAgentFailureText(value, "", 180))
    .filter(Boolean);
  if (!first) return "";
  const title = sanitizeTestAgentFailureText(item?.title || item?.type, "该问题", 70);
  return `${title}：${first}`;
}

export function collectTestAgentFailureSummaryLines(report: TestAgentReport, verdict: TestAgentVerdict | null = null) {
  return collectTestAgentFailureSummaryItems(report, verdict)
    .map(summarizeTestAgentFailureItem)
    .filter(Boolean)
    .slice(0, 5);
}

export function collectTestAgentFailureDiagnosticLines(report: TestAgentReport, verdict: TestAgentVerdict | null = null) {
  return uniqueStrings(
    collectTestAgentFailureSummaryItems(report, verdict)
      .map(summarizeTestAgentDiagnosticItem)
      .filter(Boolean)
  ).slice(0, 4);
}

export function compactTestAgentVerdict(verdict: TestAgentVerdict | null) {
  if (!verdict) return null;
  return {
    schema: verdict.schema,
    reportId: verdict.reportId,
    workOrderId: verdict.workOrderId,
    status: verdict.status,
    recommendation: verdict.recommendation,
    canAccept: verdict.canAccept,
    needsRework: verdict.needsRework,
    needsHuman: verdict.needsHuman,
    needsRecheck: (verdict as any).needsRecheck === true,
    needsEnvironment: (verdict as any).needsEnvironment === true,
    reviewRoute: (verdict as any).reviewRoute || "",
    summary: verdict.summary,
    failedRequiredChecks: verdict.failedRequiredChecks,
    unknownRequiredChecks: verdict.unknownRequiredChecks,
    failedAcceptanceCriteria: verdict.failedAcceptanceCriteria,
    unknownAcceptanceCriteria: verdict.unknownAcceptanceCriteria,
    requiredCheckSummary: verdict.requiredCheckSummary,
    acceptanceSummary: verdict.acceptanceSummary,
    blockedReasons: verdict.blockedReasons,
    risks: verdict.risks,
    nextActions: collectTestAgentVerdictNextActions(verdict),
    evidenceSummary: verdict.evidenceSummary,
    browserNetworkSummary: verdict.browserNetworkSummary,
    browserInteractionSummary: verdict.browserInteractionSummary,
    browserFlowSummary: verdict.browserFlowSummary,
    browserMultiSessionSummary: verdict.browserMultiSessionSummary,
    browserAuthenticationSummary: (verdict as any).browserAuthenticationSummary,
    browserActionEffectSummary: verdict.browserActionEffectSummary,
    browserRecoverySummary: verdict.browserRecoverySummary,
    adversarialEvidenceSummary: verdict.adversarialEvidenceSummary,
    browserProviderSummary: verdict.browserProviderSummary,
    browserProviderGaps: verdict.browserProviderGaps,
    failureSummary: (verdict as any).failureSummary,
    artifacts: verdict.artifacts,
  };
}

export function testAgentStatusLabel(status: any) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "passed") return "通过";
  if (value === "failed") return "未通过";
  if (value === "partial") return "部分通过";
  if (value === "blocked") return "已阻塞";
  if (value === "verified") return "已覆盖";
  if (value === "not_verified") return "未覆盖";
  if (value === "skipped") return "已跳过";
  if (value === "timed_out") return "超时";
  if (value === "started") return "已启动";
  if (value === "already_running") return "已在运行";
  return value ? "待确认" : "未知";
}

export function testAgentRecommendationLabel(recommendation: any) {
  const value = String(recommendation || "").trim().toLowerCase();
  if (value === "accept") return "可以接受";
  if (value === "rework") return "需要返工";
  if (value === "need_human") return "需要人工确认";
  return value ? "待确认" : "未给出";
}

export function testAgentEvidenceTypeLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    commands: "命令验证",
    command: "命令验证",
    build: "构建检查",
    unit_tests: "单元测试",
    http: "接口检查",
    api: "接口检查",
    browser_e2e: "浏览器流程",
    browser_auth: "登录态浏览器验收",
    browser_authentication: "登录态浏览器验收",
    authenticated_browser: "登录态浏览器验收",
    login_session: "登录态浏览器验收",
    browser_multi_session: "多人协作浏览器验收",
    screenshots: "截图证据",
    screenshot: "截图证据",
    console_errors: "控制台错误检查",
    browser_snapshots: "页面快照",
    browser_snapshot: "页面快照",
    browser_console_logs: "浏览器控制台日志",
    browser_network_logs: "浏览器网络日志",
    browser_trace: "浏览器追踪",
    browser_har: "网络记录",
    browser_download: "文件下载验证",
    file_download: "文件下载验证",
    download: "文件下载验证",
    downloaded_file: "文件下载验证",
    browser_upload: "文件上传验证",
    file_upload: "文件上传验证",
    upload: "文件上传验证",
    upload_file: "文件上传验证",
    verdict_json: "复核结论",
    report_json: "结构化报告",
    report_markdown: "报告文档",
    artifact_manifest: "证据清单",
    adversarial: "边界场景检查",
    independent_review: "独立复核",
  };
  return labels[value] || String(type || "检查项");
}

export function testAgentVisibleReviewSummary(report: any = {}, verdict: any = null) {
  if (verdict?.canAccept === true) return "独立复核通过，我可以继续做最终验收。";
  if (verdict?.needsRework === true) return "独立复核要求返工，需要把缺口交回原实现成员。";
  if (verdict?.needsRecheck === true) return "独立复核还没有闭环，我会先补齐证据并重新复验。";
  if (verdict?.needsEnvironment === true) return "独立复核受环境或登录条件阻塞，我会先补齐条件。";
  if (verdict?.needsHuman === true) return "独立复核需要人工确认，我会先暂停最终验收。";
  const status = String(report?.status || "").trim().toLowerCase();
  const recommendation = String(report?.recommendation || "").trim().toLowerCase();
  if (status === "passed" && recommendation === "accept") return "独立复核通过，我可以继续做最终验收。";
  if (status === "passed") return "独立复核通过，我会继续核对整体交付。";
  if (status === "failed") return "独立复核发现未通过项，需要安排原实现成员返工。";
  if (status === "partial") return "独立复核只通过了一部分，还需要补齐剩余证据。";
  if (status === "blocked") return "独立复核被阻塞，需要先处理环境、命令或交接信息问题。";
  return "独立复核已返回结果，我会继续判断下一步。";
}

export function summarizeTestAgentCommandResult(item: any) {
  const status = testAgentStatusLabel(item?.status);
  const exit = item?.exitCode === null || item?.exitCode === undefined ? "" : `（退出码 ${item.exitCode}）`;
  const error = item?.error ? `：${compactMemoryText(item.error, 160)}` : "";
  return `${item?.project || "项目"}：命令 ${item?.command || "未命名命令"} ${status}${exit}${error}`;
}

export function summarizeTestAgentHttpResult(item: any) {
  const status = testAgentStatusLabel(item?.status);
  const code = item?.statusCode === null || item?.statusCode === undefined ? "" : `（HTTP ${item.statusCode}）`;
  const error = item?.error ? `：${compactMemoryText(item.error, 160)}` : "";
  return `${item?.project || "项目"}：接口 ${item?.method || "GET"} ${item?.url || ""} ${status}${code}${error}`;
}

export function summarizeTestAgentBrowserResult(item: any) {
  const status = testAgentStatusLabel(item?.status);
  const error = item?.error ? `：${compactMemoryText(item.error, 160)}` : "";
  return `${item?.project || "项目"}：浏览器检查 ${item?.name || "未命名流程"} ${status}${error}`;
}

export function testAgentSummaryRows(reportValue: any, verdictValue: any, key: string) {
  const fromReport = Array.isArray(reportValue?.[key]) ? reportValue[key] : [];
  if (fromReport.length) return fromReport;
  return Array.isArray(verdictValue?.[key]) ? verdictValue[key] : [];
}

export function collectTestAgentBrowserInteractionLines(report: TestAgentReport, verdict: any = null) {
  const rows = testAgentSummaryRows(report, verdict, "browserInteractionSummary");
  if (!rows.length) return [];
  const totals = rows.reduce((acc: any, item: any) => {
    acc.actions += Number(item?.actionCount || 0);
    acc.assertions += Number(item?.assertionCount || 0);
    acc.failedActions += Number(item?.failedActions || 0);
    acc.failedAssertions += Number(item?.failedAssertions || 0);
    return acc;
  }, { actions: 0, assertions: 0, failedActions: 0, failedAssertions: 0 });
  const failed = totals.failedActions + totals.failedAssertions;
  const headline = `浏览器交互：已执行 ${totals.actions} 个操作、${totals.assertions} 个断言${failed ? `，其中 ${failed} 项未通过` : "，未发现失败步骤"}`;
  const failedSteps = rows
    .flatMap((item: any) => Array.isArray(item?.failedSteps) ? item.failedSteps : [])
    .map(summarizeTestAgentBrowserFailedStep)
    .slice(0, 3);
  return uniqueStrings([headline, ...failedSteps]).slice(0, 4);
}
