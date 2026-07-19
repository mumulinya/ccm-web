// Behavior-freeze split from collaboration-runtime-runtime-tools.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 8/9).
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
  appendTaskGroupReport,
  buildContinuationUserDecision,
  buildUserContinuationStatus,
  compactRuntimeToolAudit,
  configuredProjectWorkDir,
  getTaskById,
  hasStrongTaskAcceptanceEvidence,
  isAgentExecutionBlockedPendingTask,
  isTaskPaused,
  runningTaskIds,
  runtimeToolSnapshotFromAudit,
  syncTaskBacklogStatus,
  updateGroupTaskInlineStatus,
} from "./collaboration-runtime-task-queue";

import {
  buildDeliverySummary,
  isAdvisoryNeed,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  taskRequiresAgentQa,
  writeSse,
} from "./collaboration-runtime-daily-dev";

import {
  enqueueTask,
  finalizeTaskKernel,
  getQueueStatus,
  isTaskQueuedInMemory,
} from "./collaboration-runtime-coordinator-review";

import {
  CollabCtx,
  getProjectExtraConfig,
} from "./collaboration-runtime-plan-tools";

function mergeRuntimeToolManagerAudit(audit: any, toolAudit: any) {
  if (!audit || !toolAudit) return audit;
  const rows = Array.isArray(toolAudit.mcp) ? toolAudit.mcp : [];
  for (const row of rows) {
    if (row.state !== "missing_tool") continue;
    const serverName = `ccm__${String(row.server || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "tool"}`;
    const existing = (audit.mcp_statuses || []).find((item: any) => item.name === row.server);
    if (existing) {
      existing.state = "missing_tool";
      existing.availableTools = row.availableTools || existing.availableTools || [];
      existing.missingTools = row.missingTools || [];
      existing.error = `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`;
    } else {
      audit.mcp_statuses = audit.mcp_statuses || [];
      audit.mcp_statuses.push({
        name: row.server,
        serverName,
        state: "missing_tool",
        grants: [row.raw],
        tools: row.tool ? [row.tool] : [],
        availableTools: row.availableTools || [],
        missingTools: row.missingTools || [],
        error: `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`,
      });
    }
    audit.warnings = audit.warnings || [];
    audit.warnings.push(`MCP ${row.server} 缺少授权工具：${(row.missingTools || []).join(", ")}`);
  }
  for (const row of rows.filter((item: any) => ["failed", "disconnected", "missing_server"].includes(String(item.state || "")))) {
    const existing = (audit.mcp_statuses || []).find((item: any) => item.name === row.server);
    if (existing && existing.state === "synced") {
      existing.state = "config_error";
      existing.error = row.serverStatus?.error || `MCP server 当前状态：${row.state}`;
    }
  }
  return audit;
}

function getRuntimeAuthorizationReadiness(allowedTools: any, options: any = {}) {
  if (options.authorizationReadiness?.schema === "ccm-tool-authorization-readiness-v1") return options.authorizationReadiness;
  if (options.toolAudit) return buildAuthorizationReadiness(options.toolAudit, normalizeToolAuthorization(allowedTools));
  return buildToolAuthorizationPayload(allowedTools).authorization_readiness;
}

function summarizeRuntimeAuthorizationReadiness(readiness: any) {
  if (!readiness || readiness.dispatchReady !== false) return "";
  const missing = readiness.missing || {};
  const parts: string[] = [];
  if (missing.missing_mcp_servers) parts.push(`MCP server ${missing.missing_mcp_servers}`);
  if (missing.missing_mcp_tools) parts.push(`MCP tool ${missing.missing_mcp_tools}`);
  if (missing.missing_skills) parts.push(`Skill ${missing.missing_skills}`);
  if (readiness.invalid_mcp_grants) parts.push(`无效 MCP 授权 ${readiness.invalid_mcp_grants}`);
  return parts.length ? parts.join("、") : "存在不可用授权项";
}

export function runtimeToolDispatchBlockedMessage(projectName: string, runtimeToolContext: any = {}) {
  const gate = runtimeToolContext.dispatchGate || runtimeToolContext.audit?.dispatch_gate || {};
  return `${projectName} MCP/Skill 授权未就绪，已阻止派发子 Agent：${gate.reason || "存在不可用授权项"}`;
}

export function runtimeToolDispatchBlockedReceipt(projectName: string, runtimeToolContext: any = {}) {
  return require("./collaboration-acceptance").runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext);
}

export function assertRuntimeToolDispatchReady(projectName: string, runtimeToolContext: any = {}) {
  if (runtimeToolContext.dispatchBlocked || runtimeToolContext.dispatchGate?.dispatchReady === false) {
    throw new Error(runtimeToolDispatchBlockedMessage(projectName, runtimeToolContext));
  }
}

export function prepareAgentRuntimeTools(
  groupId: string,
  projectName: string,
  workDir: string,
  agentType: string,
  allowedTools: any,
  streamRes: any = null,
  options: any = {}
) {
  const authorizationReadiness = getRuntimeAuthorizationReadiness(allowedTools, options);
  const sourceTask = options.task || getTaskById(options.taskId || "");
  const group = groupId ? loadGroups().find((item: any) => String(item?.id || "") === String(groupId)) || null : null;
  const coordinatorProject = group ? String(getCoordinatorMember(group)?.project || group?.orchestrator?.coordinatorProject || "") : "";
  const internalAgentRole = options.internalAgentRole
    || (projectName && coordinatorProject && projectName === coordinatorProject ? "group-main-agent" : "project-child-agent");
  const internalProjects = group
    ? (group.members || []).filter((member: any) => member?.project && member.project !== coordinatorProject).map((member: any) => {
      const project = String(member.project);
      const extra = getProjectExtraConfig(project);
      return {
        name: project,
        workDir: configuredProjectWorkDir(project),
        verificationCommands: Array.isArray(extra?.verification_commands) ? extra.verification_commands : [],
        targetUrl: String(extra?.target_url || extra?.targetUrl || ""),
      };
    }).filter((project: any) => project.workDir)
    : [];
  const taskBoundInternalMcpServers = !options.disableTaskBoundInternalMcp && sourceTask?.id && workDir
    ? buildTaskBoundInternalMcpServers({
      taskId: String(sourceTask.id),
      groupId: String(groupId || sourceTask.group_id || ""),
      groupSessionId: String(options.groupSessionId || sourceTask.group_session_id || sourceTask.groupSessionId || ""),
      project: projectName,
      role: internalAgentRole,
      agentType,
      taskAgentSessionId: String(options.taskAgentSessionId || ""),
      nativeSessionId: String(options.nativeSessionId || ""),
      workDir,
      baseWorkDir: configuredProjectWorkDir(projectName) || workDir,
      projects: internalProjects,
      memoryReceiptChallenge: options.memoryReceiptChallenge || null,
      memoryReceiptFile: options.memoryReceiptFile || "",
    })
    : {};
  const audit = syncRuntimeTools(workDir, agentType, allowedTools, {
    authorizationReadiness,
    internalMcpServers: { ...taskBoundInternalMcpServers, ...(options.internalMcpServers || {}) },
  });
  audit.authorization_readiness = authorizationReadiness;
  mergeRuntimeToolManagerAudit(audit, options.toolAudit);
  audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
  const dispatchBlocked = audit.dispatch_gate.dispatchReady === false;
  const authorizationBlocked = authorizationReadiness?.dispatchReady === false;
  const level = audit.mode === "failed" || audit.missing.mcp.length || audit.missing.skill.length || dispatchBlocked ? "warning" : "info";
  const missingNames = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
  const missingSuffix = missingNames.length ? `；未找到或未启用：${missingNames.join("、")}` : "";
  const authorizationSuffix = authorizationBlocked ? `；授权需处理缺失项：${summarizeRuntimeAuthorizationReadiness(authorizationReadiness)}` : "";
  const warningSuffix = audit.warnings?.length ? `；${audit.warnings.join("；")}` : "";
  const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
  const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item: any) => item.state === "synced").length : audit.synced.mcp.length;
  const proxyMcpCount = mcpStatuses.filter((item: any) => item.state === "proxy_only").length;
  const summary = audit.mode === "native-and-proxy"
    ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${missingSuffix}${authorizationSuffix}${warningSuffix}`
    : audit.mode === "ccm-proxy-only"
      ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式${authorizationSuffix}`
      : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`;
  const traceId = options.traceId || sourceTask?.trace_id || "";
  if (traceId) {
    recordAgentRuntimeLifecycle({
      scope: "worker",
      traceId,
      taskId: sourceTask?.id || options.taskId || "",
      groupId,
      agent: projectName,
      action: "runtime_tool_sync",
      phase: "prepare",
      risk: "read",
      target: projectName,
      status: audit.mode === "failed" ? "error" : (dispatchBlocked ? "blocked" : "ok"),
      message: summary,
      data: { runtime_tool_sync: compactRuntimeToolAudit(audit), snapshot: runtimeToolSnapshotFromAudit(audit, allowedTools) },
    });
  }
  recordRuntimeToolSyncAudit(audit, projectName, groupId);
  if (groupId) safeAddGroupLog(groupId, level, "runtime-tool-sync", summary, audit);
  const workEvent = {
    id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
    time: new Date().toISOString(),
    agent: projectName,
    kind: audit.mode === "failed" || dispatchBlocked ? "error" : "tool",
    text: summary,
    runtimeToolSync: audit,
  };
  if (streamRes) {
    writeSse(streamRes, { type: "agent_work_event", agent: projectName, event: workEvent });
    if (audit.mode === "failed" || dispatchBlocked) writeSse(streamRes, { type: "status", text: `工具同步提示：${summary}` });
  }
  return { audit, workEvent, prompt: buildRuntimeToolSyncPrompt(audit), dispatchGate: audit.dispatch_gate, dispatchBlocked };
}

function normalizeVerificationCommands(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map(item => item.trim()).filter(Boolean);
}

function readPackageJsonScripts(workDir: string) {
  try {
    const file = path.join(workDir, "package.json");
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
  } catch {
    return {};
  }
}

export function getConfiguredProjectVerificationCommands(projectName: string) {
  const projectConfig = getProjectExtraConfig(projectName);
  return normalizeVerificationCommands(
    projectConfig.verification_commands
      || projectConfig.verificationCommands
      || projectConfig.test_commands
      || projectConfig.testCommands
      || projectConfig.check_commands
      || projectConfig.checkCommands
  );
}

function inferProjectVerificationCommands(workDir = "") {
  const dir = String(workDir || "").trim();
  if (!dir || !fs.existsSync(dir)) return [];
  const hints: string[] = [];
  const scripts = readPackageJsonScripts(dir);
  const scriptNames = Object.keys(scripts);
  const addNpmScript = (name: string) => {
    if (scriptNames.includes(name)) hints.push(`npm run ${name}`);
  };
  addNpmScript("check");
  addNpmScript("typecheck");
  addNpmScript("lint");
  addNpmScript("test");
  addNpmScript("build");
  if (fs.existsSync(path.join(dir, "pom.xml"))) hints.push("mvn test");
  if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts"))) hints.push("gradle test");
  if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml"))) hints.push("pytest");
  if (fs.existsSync(path.join(dir, "go.mod"))) hints.push("go test ./...");
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) hints.push("cargo test");
  return uniqueStrings(hints).slice(0, 6);
}

export function getAgentRuntimeConsistencyStatus() {
  const runtimes = getPublicAgentRuntimes();
  const runtimeKeys = new Set<string>();
  for (const runtime of runtimes) {
    runtimeKeys.add(String(runtime.id || "").toLowerCase());
    for (const alias of runtime.aliases || []) runtimeKeys.add(String(alias || "").toLowerCase());
  }
  const agents = (AGENTS || []).map((agent: any) => ({
    type: String(agent.type || "").trim(),
    name: String(agent.name || agent.type || "").trim(),
  })).filter((agent: any) => agent.type);
  const missing = agents.filter((agent: any) => !runtimeKeys.has(agent.type.toLowerCase()));
  return {
    pass: missing.length === 0 && agents.length > 0,
    agents,
    runtimes: runtimes.map((runtime: any) => ({ id: runtime.id, aliases: runtime.aliases, commandLabel: runtime.commandLabel })),
    missing,
  };
}

export function getProjectVerificationHintDetail(projectName: string, workDir = "") {
  const configured = getConfiguredProjectVerificationCommands(projectName);
  if (configured.length > 0) {
    return { source: "configured", commands: configured.slice(0, 6) };
  }
  const inferred = inferProjectVerificationCommands(workDir);
  return {
    source: inferred.length > 0 ? "inferred" : "missing",
    commands: inferred,
  };
}

export function buildProjectVerificationHints(projectName: string, workDir = "") {
  return getProjectVerificationHintDetail(projectName, workDir).commands;
}

export function compactFormText(value: any, fallback = "未填写") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  return text || fallback;
}

export function buildTaskContinuationBlock(message: string) {
  return [
    "",
    "---",
    "",
    `用户补充说明（${new Date().toISOString()}）：`,
    compactFormText(message),
    "",
    "继续执行要求：",
    "- 主 Agent 必须结合原始任务和本次补充说明继续推进。",
    "- 如果此前有阻塞、缺口或返工项，优先用补充说明消解后再派发子 Agent。",
    "- 不要丢弃已有任务上下文、回执和验收标准；最终报告需要覆盖完整任务。"
  ].join("\n");
}

export function createTask(task: any) {
  return require("./collaboration-task-service").createTask(task);
}

export function createRequirementEpicWithChildren(payload: any) {
  return require("./collaboration-task-service").createRequirementEpicWithChildren(payload);
}

export function updateRequirementEpicFromPlan(payload: any) {
  return require("./collaboration-task-service").updateRequirementEpicFromPlan(payload);
}

export function classifyTaskContinuation(message: string) {
  return require("./collaboration-task-service").classifyTaskContinuation(message);
}

export function looksLikeTaskContinuation(message: string) {
  return require("./collaboration-task-service").looksLikeTaskContinuation(message);
}

function getGlobalMissionDeps() {
  return { listExecutions, taskRequiresCodeChanges, taskRequiresVerification };
}

export function getGlobalMissionChildDeliveryEvidence(task: any) {
  return getGlobalMissionChildDeliveryEvidenceBase(task, getGlobalMissionDeps());
}

export function globalMissionChildGatePassed(task: any) {
  return globalMissionChildGatePassedBase(task, getGlobalMissionDeps());
}

export function refreshGlobalMissionParentInTaskList(tasks: any[], parentId: string) {
  return refreshGlobalMissionParentInTaskListBase(tasks, parentId, getGlobalMissionDeps());
}

const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");

function normalizeGlobalDispatchHistoryMessages(messages: any[] = []) {
  return messages
    .filter((item: any) => item && ["user", "assistant"].includes(String(item.role || "")) && String(item.content || "").trim())
    .map((item: any) => ({
      role: String(item.role),
      content: String(item.content || "").slice(0, 8000),
      timestamp: item.timestamp || new Date().toISOString(),
    }))
    .slice(-80);
}

function loadGlobalDispatchHistoryStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) return { sessions: [], ...JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8")) };
  } catch {}
  try {
    if (fs.existsSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`)) return { sessions: [], ...JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8")) };
  } catch {}
  return { current_session_id: "", sessions: [] };
}

function writeGlobalDispatchHistoryStore(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.sessions = sessions
    .map((session: any) => ({
      ...session,
      messages: normalizeGlobalDispatchHistoryMessages(session.messages || []),
      updatedAt: session.updatedAt || new Date().toISOString(),
    }))
    .filter((session: any) => session.id && session.messages.length > 0)
    .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 30);
  fs.mkdirSync(path.dirname(GLOBAL_AGENT_HISTORY_FILE), { recursive: true });
  const temp = `${GLOBAL_AGENT_HISTORY_FILE}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
    try { fs.copyFileSync(GLOBAL_AGENT_HISTORY_FILE, `${GLOBAL_AGENT_HISTORY_FILE}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf-8");
  fs.renameSync(temp, GLOBAL_AGENT_HISTORY_FILE);
}

export function getGlobalDirectDispatchMeta(task: any) {
  const meta = task?.workflow_meta?.global_direct_dispatch || task?.workflowMeta?.global_direct_dispatch || null;
  if (!meta || typeof meta !== "object") return null;
  if (String(meta.schema || "") !== "ccm-global-direct-dispatch-v1") return null;
  return meta;
}

export function getGlobalDirectDispatchContinuationKey(task: any) {
  return require("./collaboration-global-missions").getGlobalDirectDispatchContinuationKey(task);
}

export function shouldNotifyGlobalDirectDispatchContinuation(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus);
}

export function buildGlobalDirectDispatchContinuationMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchContinuationMessage(task);
}

export function shouldNotifyGlobalDirectDispatchCompletion(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus);
}

export function buildGlobalDirectDispatchCompletionMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchCompletionMessage(task);
}

export function shouldNotifyGlobalDirectDispatchRollback(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchRollback(task, previousStatus);
}

export function buildGlobalDirectDispatchRollbackMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchRollbackMessage(task);
}

function recordGlobalDirectDispatchCompletionMemory(task: any, meta: any, content: string) {
  try {
    const item = recordGlobalDirectDispatchMemory({
      dispatchId: task?.id || meta?.global_run_id || "",
      sessionId: meta?.session_id || "",
      source: "global-agent-direct-dispatch",
      traceId: task?.trace_id || meta?.trace_id || "",
      userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
      groupId: task?.group_id || meta?.group_id || "",
      targetProject: task?.target_project || "",
      task,
      report: task?.delivery_summary || {},
      messageId: `global-direct-completion:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
      at: new Date().toISOString(),
    });
    return { ok: true, item, content_preview: compactMemoryText(content, 240) };
  } catch (error: any) {
    appendTraceEvent(task?.trace_id, {
      type: "global_direct_dispatch.memory_writeback_failed",
      status: "warning",
      task_id: task?.id || "",
      group_id: task?.group_id || "",
      agent: "global-agent",
      message: "全局直派完成总结写入全局记忆失败",
      data: { error: error?.message || String(error) },
    });
    return { ok: false, error: error?.message || String(error) };
  }
}

function recordGlobalDirectDispatchRollbackMemoryFromTask(task: any, meta: any, content: string) {
  try {
    const item = recordGlobalDirectDispatchRollbackMemory({
      dispatchId: task?.id || meta?.global_run_id || "",
      sessionId: meta?.session_id || "",
      source: "global-agent-direct-dispatch",
      traceId: task?.trace_id || meta?.trace_id || "",
      userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
      groupId: task?.group_id || meta?.group_id || "",
      task,
      report: task?.delivery_summary || {},
      messageId: `global-direct-rollback:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
      at: new Date().toISOString(),
      reason: task?.rollback_reason || "",
    });
    return { ok: true, item, content_preview: compactMemoryText(content, 240) };
  } catch (error: any) {
    appendTraceEvent(task?.trace_id, {
      type: "global_direct_dispatch.rollback_memory_writeback_failed",
      status: "warning",
      task_id: task?.id || "",
      group_id: task?.group_id || "",
      agent: "global-agent",
      message: "全局直派撤销总结写入全局记忆失败",
      data: { error: error?.message || String(error) },
    });
    return { ok: false, error: error?.message || String(error) };
  }
}

export function appendGlobalDirectDispatchContinuationToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const key = getGlobalDirectDispatchContinuationKey(task);
  const content = buildGlobalDirectDispatchContinuationMessage(task);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      continuation_notified_at: session.updatedAt,
      continuation_notified_key: key,
      continuation_message_preview: compactMemoryText(content, 320),
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_continuation_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_continuation_synced",
    title: "全局 Agent 会话已同步接续状态",
    detail: "群聊任务收到补充要求后，接续状态已回写到全局 Agent 会话",
    status: "active",
    phase: "rework",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", continuation_key: key },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_continuation_synced", status: "active", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function appendGlobalDirectDispatchCompletionToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const content = buildGlobalDirectDispatchCompletionMessage(task);
  const memoryWriteback = recordGlobalDirectDispatchCompletionMemory(task, meta, content);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      completion_notified_at: session.updatedAt,
      completion_message_preview: compactMemoryText(content, 320),
      memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.memory_writeback_at || "",
      memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.memory_writeback_item_id || "",
      memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_completion_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_completion_synced",
    title: "全局 Agent 会话已同步最终总结",
    detail: "群聊任务通过验收后，最终总结已回写到全局 Agent 会话",
    status: "ok",
    phase: "completed",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_completion_synced", status: "ok", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function appendGlobalDirectDispatchRollbackToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchRollback(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const content = buildGlobalDirectDispatchRollbackMessage(task);
  const memoryWriteback = recordGlobalDirectDispatchRollbackMemoryFromTask(task, meta, content);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      rollback_notified_at: session.updatedAt,
      rollback_message_preview: compactMemoryText(content, 320),
      rollback_memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.rollback_memory_writeback_at || "",
      rollback_memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.rollback_memory_writeback_item_id || "",
      rollback_memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_rollback_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_rollback_synced",
    title: "全局 Agent 会话已同步撤销结果",
    detail: "群聊任务安全撤销后，撤销总结已回写到全局 Agent 会话",
    status: "warn",
    phase: "cancelled",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_rollback_synced", status: "warning", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function updateTask(id: string, updates: any) {
  return require("./collaboration-task-service").updateTask(id, updates);
}

export function refreshGlobalDevelopmentMissions() {
  return require("./collaboration-global-missions").refreshGlobalDevelopmentMissions();
}

export function getGlobalDevelopmentMission(id: string) {
  return require("./collaboration-global-missions").getGlobalDevelopmentMission(id);
}

export function getMissionDependencyRefs(task: any) {
  const value = task?.mission_dependencies || task?.mission_target?.depends_on || task?.mission_target?.dependsOn || [];
  return (Array.isArray(value) ? value : [value]).map((item: any) => String(item || "").trim()).filter(Boolean);
}

export function missionChildMatchesRef(task: any, ref: string) {
  const target = task?.mission_target || {};
  return [task?.id, target.name, target.project, target.group_id, task?.target_project, task?.group_id]
    .filter(Boolean)
    .some(value => String(value).toLowerCase() === String(ref).toLowerCase());
}

export function removeTaskFromQueues(taskId: string) {
  return require("./collaboration-task-service").removeTaskFromQueues(taskId);
}

export function appendGlobalMissionSupervisorTimeline(mission: any, actions: any[] = [], waitingUser: any[] = [], terminal = false) {
  if (!mission?.id) return null;
  const actionTypes = uniqueStrings((actions || []).map((item: any) => item?.type).filter(Boolean));
  const waitingReasons = uniqueStrings((waitingUser || []).map((item: any) => item?.reason).filter(Boolean)).slice(0, 3);
  const reworkCount = actionTypes.filter((type: string) => /rework|recovery|retry|merge_conflict|failure/i.test(type)).length;
  const fingerprint = crypto.createHash("sha1").update(JSON.stringify({
    terminal: !!terminal,
    actionTypes,
    waitingReasons,
    allPassed: mission?.mission_summary?.all_passed === true,
  })).digest("hex").slice(0, 12);
  const recent = Array.isArray(mission.workflow_timeline) ? mission.workflow_timeline.slice(-8) : [];
  if (recent.some((event: any) => /^global_supervisor_/.test(String(event?.type || "")) && event?.data?.fingerprint === fingerprint)) return null;
  const type = terminal
    ? "global_supervisor_completed"
    : waitingUser.length
      ? "global_supervisor_waiting_user"
      : reworkCount
        ? "global_supervisor_rework"
        : "global_supervisor_cycle";
  const title = terminal
    ? "我已确认全部子任务通过"
    : waitingUser.length
      ? "我发现有阻塞需要你处理"
      : reworkCount
        ? "我已安排子任务返工"
        : "我已检查子任务进展";
  const detail = terminal
    ? "所有子任务交付验收已通过，正在整理全局总结。"
    : waitingUser.length
      ? waitingReasons.join("；") || "有子任务需要人工确认后才能继续。"
      : actionTypes.length
        ? `已执行 ${actions.length} 个跟进动作：${actionTypes.slice(0, 4).join("、")}`
        : "子任务仍在推进，暂无需要你处理的事项。";
  return appendTaskTimelineEvent(mission.id, {
    type,
    title,
    detail,
    status: terminal ? "ok" : waitingUser.length ? "warn" : reworkCount ? "active" : "active",
    phase: terminal ? "completed" : waitingUser.length ? "needs_user" : reworkCount ? "rework" : "supervising",
    agent: "global-agent",
    data: {
      fingerprint,
      action_types: actionTypes.slice(0, 8),
      action_count: actions.length,
      waiting_user_count: waitingUser.length,
      waiting_reasons: waitingReasons,
    },
  });
}

export function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-global-missions").superviseGlobalDevelopmentMissionCycle(id, ctx, options);
}

export async function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload: any = {}) {
  return require("./collaboration-global-missions").controlGlobalDevelopmentMission(id, operation, ctx, payload);
}

export function targetProjectForMissionTarget(target: any) {
  return String(target?.type === "group" ? target?.coordinator : (target?.project || target?.name || "")).trim();
}

export function buildGlobalMissionTargetHandoff(input: {
  parent: any;
  target: any;
  group?: any;
  businessGoal: string;
  childGoal: string;
  acceptance: string;
  sourceDocuments?: string;
  traceId: string;
  priority?: string;
}) {
  return require("./collaboration-global-missions").buildGlobalMissionTargetHandoff(input);
}

export function buildGlobalGroupTestAgentOwnership() {
  return require("./collaboration-test-agent-runtime").buildGlobalGroupTestAgentOwnership();
}

export function normalizeGlobalMissionTargetRequirements(payload: any, target: any) {
  return require("./collaboration-global-missions").normalizeGlobalMissionTargetRequirements(payload, target);
}

export function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx) {
  return require("./collaboration-global-missions").createGlobalDevelopmentMission(payload, ctx);
}

export function canCompleteDailyDevFromDeliverySummary(task: any, execution: any, summary: any) {
  return require("./collaboration-task-service").canCompleteDailyDevFromDeliverySummary(task, execution, summary);
}

export function reconcileTaskDeliveryEvidence(taskId: string) {
  const task = loadTasks().find((item: any) => item.id === taskId);
  if (!task) return { success: false, status: 404, error: "任务不存在" };
  const execution = {
    status: "waiting",
    detail: task.status_detail || "重新核对持久化交付证据",
    report: task.final_report || task.result || "",
    result: task.result || "",
    receipt: task.receipt || null,
    review: task.review || null,
    fileChanges: task.file_changes || null,
  };
  const summary = buildDeliverySummary(task, execution, "waiting");
  const eligible = canCompleteDailyDevFromDeliverySummary(task, execution, summary);
  if (!eligible) {
    const updated = updateTask(taskId, { delivery_summary: summary, reasoning_loop: summary.reasoning_loop });
    addTaskLog(taskId, "info", `交付证据复核完成：仍有 ${summary.acceptance_gate?.failed_count || 0} 项门禁未通过`);
    return { success: true, completed: false, task: updated, delivery_summary: summary };
  }
  const completedExecution = { ...execution, status: "done", detail: "持久化交付证据复核通过，系统自动完成" };
  const completedSummary = buildDeliverySummary(task, completedExecution, "waiting");
  const closedSessions = closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "持久化交付证据复核通过");
  const finalizedExecution = { ...completedExecution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item: any) => item.id) } };
  const finalizedSummary = buildDeliverySummary(task, finalizedExecution, "done");
  if (!finalizedSummary.acceptance_gate_passed) {
    const updated = updateTask(taskId, { status: "in_progress", status_detail: "最终收尾门禁未通过，任务保持进行中", delivery_summary: finalizedSummary, reasoning_loop: finalizedSummary.reasoning_loop });
    addTaskLog(taskId, "warning", `持久化交付证据复核后仍未完成团队收尾：${finalizedSummary.acceptance_gate?.failed_checks?.map((item: any) => item.label).join("、") || "未知缺口"}`);
    return { success: true, completed: false, task: updated, delivery_summary: finalizedSummary };
  }
  const completedTask = updateTask(taskId, {
    status: "done",
    status_detail: completedExecution.detail,
    delivery_summary: finalizedSummary,
    reasoning_loop: finalizedSummary.reasoning_loop,
    execution_readiness: null,
    daily_dev_execution_readiness: null,
    completed_at: new Date().toISOString(),
  }) || task;
  updateGroupTaskInlineStatus(completedTask, "done", completedExecution.detail);
  finalizeTaskKernel(task, finalizedExecution, finalizedSummary, "succeeded", completedExecution.detail);
  syncTaskBacklogStatus(completedTask, "done", completedExecution.detail);
  appendTaskGroupReport(completedTask, "done", completedExecution.detail);
  addTaskLog(taskId, "success", `✅ ${completedExecution.detail}`);
  return { success: true, completed: true, task: completedTask, delivery_summary: finalizedSummary };
}
export function validateTaskManualStatusUpdate(current: any, updates: any) {
  if (updates?.status !== "done") return null;
  if (current?.workflow_type !== "daily_dev") return null;
  const summary = updates.delivery_summary || current.delivery_summary || null;
  const missing: string[] = [];
  const review = updates.review || current.review || null;
  const receiptStatuses = Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : [];
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || current.receipt?.status === "done"
    || updates.receipt?.status === "done";
  const requiresCodeChanges = taskRequiresCodeChanges(current);
  const requiresVerification = taskRequiresVerification(current);
  const actualChangeCount = Number(summary?.actual_file_change_count || current.file_changes?.count || 0);
  const executedVerificationCount = Number(summary?.verification_executed?.length || 0);
  const coordinationPlanCount = Number(summary?.coordination_plan_count || 0);
  const assignmentCount = Number(summary?.assignment_count || 0);
  const workerNotificationCount = Number(summary?.worker_notification_count || 0);

  if (!summary) missing.push("交付摘要");
  if (coordinationPlanCount <= 0) missing.push("主 Agent 协调计划");
  if (assignmentCount <= 0) missing.push("主 Agent 派发证据");
  if (workerNotificationCount <= 0) missing.push("子 Agent 执行结果");
  if (!hasDoneReceipt) missing.push("子 Agent 完成结果说明");
  if (!summary?.has_final_review && !review) missing.push("主 Agent 最终复盘");
  if (requiresCodeChanges && actualChangeCount <= 0) missing.push("系统实际捕获的代码变更");
  if (requiresVerification && executedVerificationCount <= 0) missing.push("已执行验证记录");
  if (Array.isArray(summary?.blockers) && summary.blockers.length > 0) missing.push("未解决阻塞项");
  const blockingNeeds = Array.isArray(summary?.blocking_needs)
    ? summary.blocking_needs
    : (Array.isArray(summary?.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, current)) : []);
  if (blockingNeeds.length > 0) missing.push("仍需补充事项");
  if (Array.isArray(summary?.verification_failed) && summary.verification_failed.length > 0) missing.push("失败验证记录");
  if (Array.isArray(summary?.verification_suggested) && summary.verification_suggested.length > 0) missing.push("仅建议/未执行验证记录");
  if (requiresVerification && summary?.verification_required_gate_passed === false) missing.push("项目配置验证命令执行证据");
  if (requiresVerification && summary?.verification_source_gate_passed !== true) missing.push("独立外部 Runner 验证来源");
  if (summary?.independent_review_required === true && summary?.independent_review_gate_passed !== true) missing.push("复杂变更独立复核通过");
  if (summary?.post_review_spot_check_required === true && summary?.post_review_spot_check_gate_passed !== true) missing.push("TestAgent 通过后主 Agent 完成前抽查");
  if ((requiresCodeChanges || requiresVerification) && summary?.ack_gate_passed !== true) missing.push("ACK 前置审核通过");
  if ((requiresCodeChanges || requiresVerification) && summary?.receipt_quality_gate_passed !== true) missing.push("高质量子 Agent 结果说明（ACK/动作/文件/验证/契约/记忆声明）");
  if (summary?.contract_injection_gate_passed === false) missing.push("contractChanges 已注入依赖 Agent");
  if (taskRequiresAgentQa(current) && summary?.agent_qa_gate_passed !== true) missing.push("已采纳并完成原会话续跑的 Agent 协作问答");
  if (summary?.work_item_summary?.total && summary.work_item_summary.all_completed !== true) missing.push("执行队列所有工作项完成");
  if (summary?.team_shutdown?.required && summary.team_shutdown.pass !== true) missing.push("团队收尾完成");
  if (summary?.acceptance_gate && summary.acceptance_gate.pass !== true) missing.push("主 Agent 硬验收检查通过");

  if (missing.length === 0) return null;
  return `业务开发任务不能手动标记完成，缺少验收证据：${missing.join("、")}。请通过队列让主 Agent 继续执行，或在任务报告中补齐证据后由系统完成。`;
}

export function buildTaskGapContinuationDraft(task: any) {
  return require("./collaboration-acceptance").buildTaskGapContinuationDraft(task);
}

export function buildTargetedReworkContinuationDraft(task: any, payload: any = {}) {
  const base = buildTaskGapContinuationDraft(task);
  const kind = compactFormText(payload.rework_kind || payload.reworkKind || payload.kind, "targeted_rework");
  const target = compactFormText(payload.target || payload.agent || payload.project, "");
  const reason = compactFormText(payload.reason || payload.detail || payload.message, "");
  const title = compactFormText(payload.title || payload.label, "");
  const workItems = buildMainAgentWorkItems(task, { executions: listExecutions({ taskId: task?.id || "" }) });
  const relatedWorkItems = workItems.filter((item: any) => {
    if (target) return [item.target, item.owner, item.id].some(value => String(value || "").toLowerCase() === target.toLowerCase());
    return ["failed", "blocked", "in_progress"].includes(String(item.status || ""));
  }).slice(0, 6);
  const workItemLines = relatedWorkItems.length ? [
    "",
    "相关执行队列工作项：",
    ...relatedWorkItems.flatMap((item: any) => [
      `- ${item.target || item.owner || item.id}：${item.subject || "未命名工作项"}；状态=${item.status}；attempt=${item.attempt || 1}${item.blockedBy?.length ? `；等待=${item.blockedBy.join("、")}` : ""}`,
      ...(item.evidence?.length ? [`  - 现有证据：${item.evidence.slice(0, 3).join("；")}`] : []),
      ...(item.blockers?.length ? [`  - 阻塞：${item.blockers.slice(0, 3).join("；")}`] : []),
    ]),
  ] : [];
  const kindLabel: any = {
    missing_diff: "缺少真实文件 Diff：只派实现返工",
    missing_verification: "缺少已执行验证：只派验证返工",
    missing_receipt: "缺少子 Agent 结果说明：要求补结构化结果说明",
    missing_goal_review: "目标覆盖不足：主 Agent 重新复盘",
    failed_verification: "验证失败：只修失败点",
    weak_receipt: "结果说明质量不足：要求补接单确认、动作、文件、验证、契约或记忆声明",
    contract_sync: "契约未同步：补结构化 contractChanges",
    contract_inject: "注入契约给依赖 Agent：按 contractChanges 续跑",
    ack_rewrite: "ACK 不合格：先重写接单确认",
  };
  return [
    "【精准返工指令】",
    `返工类型：${kindLabel[kind] || title || kind}`,
    target ? `目标 Agent：${target}` : "",
    reason ? `触发原因：${reason}` : "",
    ...workItemLines,
    "",
    "执行方式：",
    "- 只处理本条精准返工缺口，不要整轮重跑。",
    "- 优先复用原任务、原 Trace、原 native session / scratchpad。",
    "- 如果目标 Agent 明确，优先让同一个 Agent 续跑；如果缺口属于主 Agent 复盘，则主 Agent 先重新规划。",
    "- 完成后必须提交新的 CCM_AGENT_RECEIPT；若涉及接口/字段/schema/类型变化，必须补 contractChanges。",
    "",
    base,
  ].filter(Boolean).join("\n");
}

export function getTaskGapItems(task: any) {
  return require("./collaboration-acceptance").getTaskGapItems(task);
}

export function getTaskGapFingerprint(task: any) {
  return require("./collaboration-acceptance").getTaskGapFingerprint(task);
}

export function isAutomaticGapContinuationSource(source: any) {
  return /(gap_rework|autopilot_gap|watchdog_gap|automatic_gap)/i.test(String(source || ""));
}

export function canAutoContinueTaskGaps(task: any) {
  return require("./collaboration-acceptance").canAutoContinueTaskGaps(task);
}

export function reconcileTaskCollaborationState(task: any, previous: any = {}) {
  return require("./collaboration-task-service").reconcileTaskCollaborationState(task, previous);
}
