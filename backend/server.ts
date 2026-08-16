#!/usr/bin/env node
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import * as crypto from "crypto";
import { execSync, spawn } from "child_process";
import { toolManager } from "./tools/tool-manager";
import { runToolCallLoop } from "./tools/tool-call-loop";
import {
    buildAgentCommand,
    captureAgentRuntimeVersionSnapshot,
  detectAgentCommandFailure,
  extractNativeModelCapabilityReceipt,
  getAgentRuntime,
  getAgentCommandLabel,
  normalizeAgentCommandOutput,
  normalizeAgentRuntimeId,
  resolveAvailableAgentRuntime,
} from "./agents/runtime";
import { extractProviderToolAccessEvidence } from "./agents/provider-tool-access-evidence";
import {
  buildNativeSessionContinuationEvidence,
  verifyNativeSessionContinuationEvidence,
} from "./agents/native-continuation";
import {
  acknowledgeProviderMemoryChannelLaunch,
  bindProviderMemoryChannelLaunch,
  prepareProviderMemoryChannel,
  verifyProviderMemoryChannelEvidence,
} from "./agents/provider-memory-channel";
import {
  createMemoryContextConsumptionChallenge,
  memoryContextConsumptionReceiptFile,
  readMemoryContextConsumptionReceipt,
  reconcileMemoryContextConsumptionReceipts,
} from "./integrations/memory-context-consumption-receipt";
import { buildProjectSessionBoundMemoryMcpServer } from "./integrations/agent-internal-mcp";
import { buildThirdPartyMemoryBootstrap, createThirdPartyMemorySnapshot } from "./integrations/third-party-memory-snapshot";
import {
  reconcileMemoryContextConsumptionRecoveries,
  recoverMemoryContextConsumptionReceipt,
} from "./integrations/memory-context-consumption-recovery";
import { recordModelCapabilityRefreshOutcome, recordVerifiedNativeModelCapabilityReceipt, startModelCapabilityRefreshScheduler, stopModelCapabilityRefreshScheduler } from "./modules/collaboration/model-capability-cache";
import {
  getTaskAgentSessionOptions,
  listTaskAgentSessions,
  openTaskAgentSession,
  recordTaskAgentSessionTurn,
} from "./tasks/agent-sessions";
import { buildRuntimeToolDispatchGate, buildRuntimeToolSyncPrompt, getRuntimeExecutionEnv, recordRuntimeToolSyncAudit, syncRuntimeTools } from "./tools/runtime-tool-sync";
import { buildToolAuthorizationPayload } from "./tools/tool-authorization";
import { startRuntimeToolRealCliMatrixScheduler, stopRuntimeToolRealCliMatrixScheduler } from "./tools/runtime-tool-real-cli-matrix";
import {
  isSafeVerificationCommand,
  persistBoundedOutput,
  registerExternalRunnerRequest,
  rollbackExecutionCheckpoint,
  runManagedCommand,
  sanitizeExecutionEnv,
  terminateManagedChildProcess,
  trackManagedChildProcess,
  listActiveAgentRuns,
  cancelActiveAgentRun,
  requestGroupSessionAgentCancellation,
} from "./agents/execution-kernel";
import { buildProjectConversationBrief, buildProjectExecutionBrief, buildProjectMemoryPacket, updateProjectMemoryFromReceipt } from "./projects/memory";
import { validateTaskMutationGuard } from "./system/task-conversation-links";
import {
  appendDirectAgentDispatchTranscript,
  completeDirectAgentDispatch,
  createDirectAgentDispatchRequest,
  markDirectAgentDispatchStarted,
} from "./agents/direct-dispatch-spool";
import {
  conversationTurnControl,
  handleConversationTurnControlApi,
  reconcileTaskDispatchTurns,
  runConversationTurnControlSelfTest,
  startWebConversationTurnRecoveryForServer,
  stopWebConversationTurnRecoveryForServer,
} from "./agents/conversation-turn-control";
import {
  buildRecoverableTaskSummary,
  decideConversationMessageRoute,
  findRecoverableConversationTasks,
} from "./agents/conversation-message-routing";
import { parseSecureMultipartRequest } from "./system/secure-multipart";
import { appendUserVisibleAgentEvent, buildUserVisibleAgentResult } from "./system/user-visible-agent-events";
import { isDevelopmentTaskWorkflowDecision } from "./agents/workflow-decision";

// 导入底座与持久层
import {
  refreshEnvPath,
  sendJson,
  CCM_DIR,
  PID_DIR,
  LOG_DIR,
  UPLOAD_DIR,
  CONFIGS_DIR,
  PUBLIC_DIR,
  PETS_FILE,
  looksBinaryString,
  isTextFileName,
  isImageFileName,
  isOoxmlFileName,
  getSharedFilePath,
  truncateInlineContent,
  decodeXmlEntities,
  xmlToPlainText,
  getZipEntries,
  readZipEntry,
  extractOoxmlText,
  describeFileFromPath,
  createSharedFileRecord,
  normalizeSharedFileRecord,
  normalizeSharedFileList,
  buildFilesContext,
  buildUploadedFilesContext,
  summarizeUploadedFiles,
  getMultipartBoundary,
  collectRequestBuffer,
  parseMultipart,
  getWorkDirForProject,
  parseGitStatus,
  readWorkingFileText,
  readHeadFileText,
  createUnifiedDiff,
  buildFileDiff,
  createFileChangeSnapshot,
  getFileChanges,
  calculateTokensAndCost
} from "./core/utils";

import {
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  loadFeishuConfig,
  saveFeishuConfig,
  recordMetric
} from "./core/db";
import { acquireCcmServerInstanceLock, inspectCcmServerInstanceLock, releaseCcmServerInstanceLock } from "./core/server-instance-lock";
import { closeSqliteTaskStore } from "./core/task-store";
import { registerContextEngineRecoveryHook } from "./system/context-engine-recovery";
import {
  canonicalWorkspaceMutationLane,
  scheduleUnifiedTaskOperation,
} from "./system/unified-task-scheduler";

// 导入子模块控制器
import { handleProjectsApi, reconcileProjectFeishuConnections, startControlBotConnection, startFeishuChannelSupervisorForServer, stopControlBotConnection, stopFeishuChannelSupervisorForServer } from "./modules/projects/projects";
import { cleanupStaleProjectCloneArtifacts } from "./modules/projects/project-git";
import { cleanupStaleGitMutationLeases } from "./modules/tools/git-workspace-runtime";
import {
  answerAsProjectMainAgent,
  cancelProjectMainTask,
  interruptProjectMainTask,
  confirmProjectMainTask,
  createProjectMainTask,
  executeProjectMainTask,
  getProjectMainTask,
  planProjectMainTask,
  projectMainTaskPublic,
  reconcileInterruptedProjectMainTasks,
  reviseProjectMainTask,
  resumeInterruptedProjectMainTask,
  runProjectMainAgentFirstTurn,
} from "./modules/projects/project-main-agent";
import {
  applyProjectSessionProvisionalTitle,
  appendProjectSessionTaskMessage,
  handleSessionsApi,
  scheduleProjectSessionAutoTitle,
  getSessionDetail,
  getSessions,
  syncSessions,
  upsertProjectSessionTaskMessage,
} from "./modules/projects/sessions";
import { handleConversationSearchApi } from "./modules/search/conversation-search";
import { buildConversationClarificationSummary, formatPrePlanClarificationText } from "./agents/pre-plan-clarification";
import { startConversationSearchIndexScheduler, stopConversationSearchIndexScheduler } from "./modules/search/conversation-search-index";
import { handleGitApi } from "./modules/tools/git";
import { handleMarketplaceApi, recoverMarketplaceProductionState } from "./modules/tools/marketplace";
import { handleCronApi, startCronScheduler, stopCronScheduler, syncCronTaskStatus } from "./modules/scheduling/cron";
import { handleTaskTemplateApi } from "./modules/collaboration/task-templates";
import { handleTaskPreflightApi } from "./modules/collaboration/task-intake-preflight";
import { handleToolsAndMetricsApi } from "./modules/tools/tools";
import { handleSharedFilesV2Api } from "./modules/tools/shared-files-api";
import { buildSharedFilesContextV2, migrateLegacySharedFilesV2 } from "./modules/tools/shared-files-v2";
import { stopAllTerminalRuns } from "./modules/tools/terminal";
import { projectDisplayName, stopManagedProjectRuntimesForShutdown } from "./modules/projects/project-runtime";
import { handlePetsApi, maybeAutoStartPet, readPetConfig } from "./modules/pets/pets";
import { GlobalPetActivityCoordinator } from "./modules/pets/pet-activity-coordinator";
import { handleMusicApi } from "./modules/music/music";
import {
  archiveTask,
  continueTaskWithMessage,
  enqueueTask,
  handleCollaborationApi,
  removeTaskFromQueues,
  resumeTaskQueues,
  retryTask,
  startAgentRecoveryMonitor,
  startTaskWatchdog,
  stopAgentRecoveryMonitor,
  stopTaskWatchdog,
} from "./modules/collaboration/collaboration";
import { handleTaskPermissionRoutes } from "./modules/collaboration/task-permission-routes";
import { updateTask as updateCanonicalTask } from "./modules/collaboration/collaboration-task-service";
import { startTaskPermissionNotificationScheduler, stopTaskPermissionNotificationScheduler } from "./modules/collaboration/task-permission-broker";
import { reconcileGroupSessionLifecycleAgentCancellations } from "./modules/collaboration/storage";
import { bootstrapGroupSessionLifecycleJournals } from "./modules/collaboration/group-session-lifecycle-head";
import { bindFeishuTaskContext, notifyFeishuTaskStage, notifyFeishuTaskStatus, recordFeishuInbound, setFeishuChannelAlertHandler } from "./modules/collaboration/feishu-channel";
import { buildFeishuInboundEnvelopeV2, buildFeishuOriginReceiptV2 } from "./modules/collaboration/feishu-conversation-v2";
import { startGroupSessionRetentionMaintenanceScheduler, stopGroupSessionRetentionMaintenanceScheduler } from "./modules/collaboration/group-session-maintenance";
import { recoverChildTypedMemoryDispatchWal } from "./modules/collaboration/memory";
import { recoverGroupTypedMemoryArtifactTransactionsFleet } from "./modules/collaboration/group-memory-index";
import { listTaskAgentInvocationEdges, reconcileTaskAgentInvocationRecovery } from "./tasks/task-agent-invocation-lineage";
import { reconcileTaskAgentContinuationSoak } from "./tasks/task-agent-continuation-soak";
import { startReliabilityDrillScheduler, stopReliabilityDrillScheduler } from "./system/reliability-drills";
import { resumeSoakTest, shutdownSoakMonitor } from "./system/soak-test";
import { getProcessBootId, initializeProcessLifecycle, installProcessLifecycleFaultHandlers, markProcessShutdown, touchProcessLifecycle } from "./system/process-lifecycle";
import { handleRuntimeEventsApi } from "./system/runtime-events";
import { handleAgentCommunicationApi } from "./system/agent-communication-api";
import { handleCodeIntelligenceApi } from "./system/code-intelligence-api";
import { handleUserVisibleAgentEventsApi } from "./system/user-visible-agent-events-api";
import { handleAutomationSessionBindingsApi } from "./system/automation-session-bindings-api";
import { performAgentCommunicationAction, startAgentCommunicationWatchdog, stopAgentCommunicationWatchdog } from "./system/agent-communication-v2";
import { requestTaskCancellation } from "./agents/execution-kernel";
import {
  claimPetDelivery,
  failPetDelivery,
  listPendingPetDeliveries,
  projectPetNotification,
  subscribeUserNotifications,
  handleUserNotificationsApi,
  createUserNotification,
  createPetSpeechNotification,
  sanitizePetNotificationText,
} from "./system/user-notifications";
import { initializeBuiltInSessionCompactionHooks } from "./system/session-compaction-hooks";
import { estimateTextTokens } from "./system/context-budget";
import { bootstrapGlobalAgentMemoryForServer, handleGlobalAgentApi, resumeGlobalAgentLoopsForServer, startFeishuConversationTurnRecoveryForServer, startGlobalMissionSupervisionForServer, startGlobalWebTurnRecoveryForServer, stopFeishuConversationTurnRecoveryForServer, stopGlobalMissionSupervisionForServer, stopGlobalWebTurnRecoveryForServer } from "./modules/global/global-agent";
import { handleRagApi } from "./modules/knowledge/rag";
import { scheduleLocalKnowledgeModelStartupPreparation } from "./modules/knowledge/knowledge-model-startup";
import { ingestRequirementSources } from "./modules/requirements/source-ingestion";
import { searchAgentKnowledge } from "./modules/knowledge/knowledge-access";
import { loadOrchestratorConfig } from "./modules/collaboration/group-orchestrator-config";
import { resolveGroupModelContextCapacity } from "./modules/collaboration/group-compaction-strategy";
import { resolveMainAgentContextPolicy } from "./tools/main-agent-context-policy";
import {
  buildContextSourceCatalog,
  calculateContextSourceBudget,
  listContextSourceCatalogEntries,
  readContextSourceContinuity,
  recordContextSourceCatalog,
  recordSharedFileProjection,
  restoreContextSources,
} from "./system/main-agent-context-source-continuity";
import { resolveMainAgentContinuityIdentity } from "./system/main-agent-post-compact-continuity";
import { handleSlashCommandsApi } from "./modules/tools/slash-commands";
import { handleSlashCommandConversationApi, runConversationAside } from "./modules/tools/slash-command-conversations";
import { migrateConfigDirectory, migrateTomlCredentials } from "./core/credential-store";
import { handleFeishuReactionFeedbackApi } from "./integrations/feishu-reaction-feedback";
import {
  materializeFeishuInboundAttachments,
  publicFeishuInboundAttachments,
  resolveFeishuInboundAttachments,
} from "./integrations/feishu-inbound-attachments";
import { handleUsabilityApi, startUsabilityArchiveScheduler, stopUsabilityArchiveScheduler } from "./modules/system/usability";
import { handleNavigationConfigApi } from "./modules/system/navigation-config";
import { handleSystemSettingsApi } from "./modules/system/settings";
import { refreshAgentProviderStatusesAsync } from "./modules/system/agent-provider-settings";
import { handleLocalAuthApi } from "./modules/system/local-auth";
import { authorizeResourceQuery, handleAccessPolicyApi } from "./modules/system/access-policy";
import { applySecurityHeaders, authorizeApiRequest, requestIsReadOnly, validateRequestHost } from "./modules/system/api-access-control";
import { buildSelectedSkillUsageDirective, ensureRoleSkillsInstalled, selectRoleSkills } from "./skills/role-skills";
import {
  PROJECT_CHAT_RUNS_FILE,
  archiveProjectChatRun,
  createProjectChatRun,
  loadProjectChatRuns,
  projectChatRuns,
  publicProjectChatRun,
  purgeProjectChatRun,
  saveProjectChatRuns,
} from "./projects/chat-runs";
import {
  cancelCleanupTransaction,
  getCleanupSummary,
  getCleanupTransaction,
  previewCleanupAction,
  recoverCleanupTransactions,
  resumeCleanupTransaction,
  runCleanupAction,
} from "./system/cleanup-center";
import { startStorageIndexScan, startStorageIndexScheduler, stopStorageIndexScheduler } from "./system/storage-index";


import {
  acquireProjectSessionAgentDispatch,
  bindProjectSessionAgentExecution,
  getProjectSessionAgentBinding,
  isProjectSessionAgentDispatchActive,
  releaseProjectSessionAgentDispatch,
} from "./modules/projects/project-session-agent-binding";
import {
  drainProjectFeishuTurns,
  enqueueProjectFeishuTurn,
  startProjectFeishuTurnRecoveryForServer,
  stopProjectFeishuTurnRecoveryForServer,
} from "./modules/projects/project-feishu-turn-queue";
import {
  buildProjectSessionModelContextProjection,
  buildProjectSessionPostCompactContext,
  compactProjectSessionWithModel,
  appendProjectSessionExecutionEvent,
  recordProjectSessionProviderUsage,
} from "./modules/projects/project-session-compaction";
import { createPetActivityRuntime } from "./server-pet-activity";
import { createPetAgentMilestoneProjector } from "./system/pet-agent-milestones";
import { resolveDownloadedPetAsset } from "./modules/pets/pet-asset-pack";
import { createAgentRunnerRuntime } from "./server-agent-runner";
import { sendFile } from "./server-static";
import { bootstrapServerRuntime as runServerBootstrap } from "./server-bootstrap";

// === 运行时内存状态与心跳推送 ===
let PORT = 3080;
let LISTEN_HOST = "127.0.0.1";
let SERVICE_LIFECYCLE_STATE: "starting" | "ready" | "draining" | "stopped" | "failed" = "starting";
let REQUEST_SERVICE_DRAIN: ((reason: string) => void) | null = null;
const CCM_RUNTIME_VERSION = (() => {
  try { return String(require("../package.json")?.version || "dev"); } catch { return "dev"; }
})();
const {
  AGENT_RUNNER_DIR,
  AGENT_RUNNER_REQUESTS_DIR,
  AGENT_RUNNER_RESULTS_DIR,
  MUSIC_PET_AGENT_NAME,
  bindProjectRunAgentSession,
  broadcastPetConfigChanged,
  broadcastPetNavigation,
  broadcastPetSpeech,
  getAgentRunActivityDuration,
  getAgentState,
  getMusicPetAgent,
  getPetAgents,
  getPetNavigationTarget,
  getProjectPetActionStrategy,
  petStatusClients,
  petWorkspaceClients,
  setAgentActivity,
  setMusicPetState,
  writeSse
} = createPetActivityRuntime({
  getPort: () => PORT,
  CCM_DIR,
  GlobalPetActivityCoordinator,
  PETS_FILE,
  PID_DIR,
  bindProjectSessionAgentExecution,
  fs,
  getConfigs,
  getTaskAgentSessionOptions,
  loadProjectChatRuns,
  openTaskAgentSession,
  path,
  projectChatRuns,
  saveProjectChatRuns,
  createPetSpeechNotification,
  sanitizePetNotificationText,
  url
});

const petAgentMilestoneProjector = createPetAgentMilestoneProjector({
  getMode: () => readPetConfig().settings.agentProgressMode,
  fallbackTimeoutMs: 60_000,
  emit: milestone => {
    const role = milestone.petState === "error" ? "error" : milestone.petState === "waiting" ? "ask" : "status";
    broadcastPetSpeech(milestone.projectName || milestone.scopeId || "global-agent", {
      role,
      title: milestone.title,
      text: milestone.summary,
      mode: "replace",
      source: "agent-milestone",
      petState: milestone.petState,
      holdMs: role === "ask" ? 30_000 : role === "error" ? 18_000 : 8_000,
      action: milestone.action,
      petMilestone: true,
      milestone,
    });
  },
  persist: milestone => {
    createUserNotification({
      source_type: "pet_agent_milestone",
      source_channel: milestone.scope,
      scope_type: milestone.scope,
      scope_id: milestone.scopeId,
      exact_session_id: milestone.exactSessionId,
      task_id: milestone.taskId,
      notification_type: milestone.kind === "completed" ? "task_completed"
        : milestone.kind === "failed" ? "task_failed"
          : milestone.kind === "cancelled" ? "task_cancelled" : "needs_user",
      severity: milestone.kind === "completed" ? "success"
        : milestone.kind === "failed" ? "error"
          : milestone.kind === "cancelled" ? "info" : "warning",
      state: milestone.kind === "needs_user" ? "active" : "resolved",
      title: milestone.title,
      summary: milestone.summary,
      action: milestone.action,
      dedupe_key: milestone.dedupeKey,
    });
  },
});

// === Agent 并行/同步调用底座 ===
const {
  buildProjectToolContext,
  callAgent,
  callAgentForGroupStream,
  callAgentStream,
  sendRuntimeToolDispatchBlocked
} = createAgentRunnerRuntime({
  AGENT_RUNNER_DIR,
  AGENT_RUNNER_REQUESTS_DIR,
  AGENT_RUNNER_RESULTS_DIR,
  UPLOAD_DIR,
  acknowledgeProviderMemoryChannelLaunch,
  appendDirectAgentDispatchTranscript,
  bindProjectRunAgentSession,
  bindProviderMemoryChannelLaunch,
  broadcastPetSpeech,
  buildAgentCommand,
  buildNativeSessionContinuationEvidence,
  buildProjectConversationBrief,
  buildProjectExecutionBrief,
  buildRuntimeToolDispatchGate,
  buildRuntimeToolSyncPrompt,
  buildToolAuthorizationPayload,
  captureAgentRuntimeVersionSnapshot,
  completeDirectAgentDispatch,
  createDirectAgentDispatchRequest,
  createFileChangeSnapshot,
  createProjectChatRun,
  detectAgentCommandFailure,
  extractNativeModelCapabilityReceipt,
  extractProviderToolAccessEvidence,
  fs,
  getAgentCommandLabel,
  getAgentRunActivityDuration,
  getAgentRuntime,
  getFileChanges,
  getRuntimeExecutionEnv,
  isSafeVerificationCommand,
  loadProjectConfigs,
  markDirectAgentDispatchStarted,
  normalizeAgentCommandOutput,
  normalizeAgentRuntimeId,
  path,
  persistBoundedOutput,
  prepareProviderMemoryChannel,
  publicProjectChatRun,
  readMemoryContextConsumptionReceipt,
  recordMetric,
  recordProjectSessionProviderUsage,
  recordModelCapabilityRefreshOutcome,
  recordRuntimeToolSyncAudit,
  recordTaskAgentSessionTurn,
  recordVerifiedNativeModelCapabilityReceipt,
  recoverMemoryContextConsumptionReceipt,
  registerExternalRunnerRequest,
  runManagedCommand,
  runToolCallLoop,
  sanitizeExecutionEnv,
  saveProjectChatRuns,
  sendJson,
  setAgentActivity,
  spawn,
  syncRuntimeTools,
  terminateManagedChildProcess,
  toolManager,
  trackManagedChildProcess,
  verifyNativeSessionContinuationEvidence,
  verifyProviderMemoryChannelEvidence,
  writeSse
});

// === HTTP 静态服务逻辑 ===


function createCollabCtx() {
  return {
    PORT,
    callAgent,
    callAgentForGroupStream,
    setAgentActivity,
    broadcastPetSpeech,
    createFileChangeSnapshot,
    getFileChanges,
    recordMetric,
    toolManager,
    buildUploadedFilesContext,
    summarizeUploadedFiles,
    buildFilesContext,
    collectRequestBuffer,
    getMultipartBoundary,
    parseMultipart,
    getSharedFilePath,
    createSharedFileRecord,
    normalizeSharedFileList,
    onTaskStatusChange: async (task: any, status: string, result = "") => {
      syncCronTaskStatus(task, status, result);
      const normalizedStatus = String(status || "").toLowerCase();
      if (["done", "completed", "failed", "blocked", "cancelled", "waiting"].includes(normalizedStatus)) {
        const isSuccess = normalizedStatus === "done" || normalizedStatus === "completed";
        const needsUser = normalizedStatus === "blocked" || normalizedStatus === "waiting";
        const projectId = String(task?.target_project || task?.project_id || task?.project || "");
        const groupId = String(task?.group_id || task?.groupId || "");
        const exactSessionId = String(
          task?.exact_session_id
          || task?.origin_session_id
          || task?.project_session_id
          || task?.group_session_id
          || "",
        );
        const anchorMessageId = String(task?.anchor_message_id || task?.anchorMessageId || task?.message_id || task?.messageId || "");
        const originMessageId = String(task?.origin_message_id || task?.originMessageId || task?.source_message_id || task?.sourceMessageId || "");
        try {
          createUserNotification({
            recipient_user_ids: [
              task?.requester_user_id,
              task?.created_by_user_id,
              task?.origin_user_id,
              task?.user_id,
            ].map(String).filter(Boolean),
            source_type: "task_terminal",
            source_channel: String(task?.source_channel || task?.origin_channel || "workspace"),
            scope_type: projectId ? "project" : groupId ? "group" : "task",
            scope_id: projectId || groupId || String(task?.id || ""),
            exact_session_id: exactSessionId,
            task_id: String(task?.id || ""),
            notification_type: needsUser ? "needs_user" : isSuccess ? "task_completed" : `task_${normalizedStatus}`,
            severity: needsUser ? "warning" : isSuccess ? "success" : normalizedStatus === "cancelled" ? "info" : "error",
            state: needsUser ? "active" : "resolved",
            title: needsUser ? "任务需要你处理" : isSuccess ? "任务已完成" : normalizedStatus === "cancelled" ? "任务已取消" : "任务未能完成",
            summary: result || task?.status_detail || task?.title || `任务状态已更新为 ${normalizedStatus}`,
            action: {
              kind: "task",
              task_id: String(task?.id || ""),
              scope_type: projectId ? "project" : groupId ? "group" : "task",
              scope_id: projectId || groupId || String(task?.id || ""),
              session_id: exactSessionId,
              project_id: projectId,
              group_id: groupId,
              anchor_message_id: anchorMessageId,
              origin_message_id: originMessageId,
              generation: String(task?.generation || task?.session_generation || 0),
            },
            dedupe_key: `task-terminal:${task?.id || "unknown"}:${needsUser ? "needs_user" : isSuccess ? "completed" : normalizedStatus}`,
          });
        } catch (error: any) {
          console.warn("[用户通知]", error?.message || error);
        }
      }
      try { await notifyFeishuTaskStatus(task, status, result); }
      catch (error: any) { console.warn("[飞书进度通知]", error?.message || error); }
    },
  };
}

// === 主生命周期请求拦截与模块化分流 ===
function handleRequest(req: any, res: any) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";

  applySecurityHeaders(res);
  if (!validateRequestHost(req, res)) return;

  // Browser requests stay same-origin. Local Node/Agent clients do not need CORS headers.
  const requestOrigin = String(req.headers.origin || "").trim();
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).host === String(req.headers.host || "")) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin);
        res.setHeader("Vary", "Origin");
      }
    } catch {}
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-CCM-CSRF, X-CCM-Internal-Caller, X-CCM-Internal-Timestamp, X-CCM-Internal-Nonce, X-CCM-Internal-Signature");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (handleLocalAuthApi(pathname, req, res)) return;
  if (pathname.startsWith("/api/") && !authorizeApiRequest(req, res, String(req.url || pathname))) return;
  if (handleAccessPolicyApi(pathname, req, res)) return;
  if (pathname.startsWith("/api/") && !authorizeResourceQuery(req, res, parsed)) return;

  if (pathname === "/api/internal/lifecycle/identity" && req.method === "GET") {
    if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
      sendJson(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
      return;
    }
    const lock = inspectCcmServerInstanceLock();
    sendJson(res, {
      success: lock.identity_verified,
      lifecycle_state: SERVICE_LIFECYCLE_STATE,
      identity: lock.owner,
      identity_verified: lock.identity_verified,
    }, lock.identity_verified ? 200 : 409);
    return;
  }
  if (pathname === "/api/internal/lifecycle/ready" && req.method === "GET") {
    if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
      sendJson(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
      return;
    }
    const lock = inspectCcmServerInstanceLock();
    const ready = SERVICE_LIFECYCLE_STATE === "ready" && lock.identity_verified;
    sendJson(res, {
      success: ready,
      ready,
      lifecycle_state: SERVICE_LIFECYCLE_STATE,
      identity: lock.owner,
      identity_verified: lock.identity_verified,
    }, ready ? 200 : 503);
    return;
  }
  if (pathname === "/api/internal/lifecycle/drain" && req.method === "POST") {
    if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
      sendJson(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
      return;
    }
    if (!REQUEST_SERVICE_DRAIN) {
      sendJson(res, { success: false, code: "DRAIN_UNAVAILABLE", lifecycle_state: SERVICE_LIFECYCLE_STATE }, 503);
      return;
    }
    sendJson(res, { success: true, accepted: true, lifecycle_state: "draining" }, 202);
    setImmediate(() => REQUEST_SERVICE_DRAIN?.("ccm-cli"));
    return;
  }
  if (pathname === "/api/internal/update/status" && req.method === "GET") {
    if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
      sendJson(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
      return;
    }
    const updateFile = path.join(CCM_DIR, "updates", "current.json");
    let transaction = null;
    try { transaction = JSON.parse(fs.readFileSync(updateFile, "utf-8")); } catch {}
    sendJson(res, { success: true, transaction });
    return;
  }

  if (
    SERVICE_LIFECYCLE_STATE === "draining"
    && !["GET", "HEAD", "OPTIONS"].includes(String(req.method || "GET").toUpperCase())
  ) {
    sendJson(res, {
      success: false,
      error: "CCM正在安全停止，暂不接受新的修改操作",
      code: "SERVICE_DRAINING",
      retryable: true,
    }, 503);
    return;
  }

  if (req.method === "GET" && pathname.endsWith("/self-test")) {
    sendJson(res, {
      success: false,
      error: "诊断接口已迁移为显式POST，GET不会再执行任何自测或写入操作",
      code: "DIAGNOSTIC_ENDPOINT_MOVED",
      endpoint: "/api/reliability/diagnostics/run",
    }, 410);
    return;
  }

  if (handleFeishuReactionFeedbackApi(pathname, req, res)) return;

  if (handleRuntimeEventsApi(pathname, req, res, parsed)) return;
  if (handleUserVisibleAgentEventsApi(pathname, req, res, parsed)) return;
  if (handleAgentCommunicationApi(pathname, req, res, parsed, { retryTask, createCollabCtx })) return;
  if (handleCodeIntelligenceApi(pathname, req, res)) return;
  if (handleUserNotificationsApi(pathname, req, res, parsed)) return;

  if (pathname === "/api/agent-runs" && req.method === "GET") {
    sendJson(res, {
      success: true,
      runs: listActiveAgentRuns({
        taskId: parsed.query.task_id || parsed.query.taskId,
        project: parsed.query.project,
      }),
      generated_at: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/api/agent-runs/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = cancelActiveAgentRun(payload);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return;
  }

  if (pathname === "/api/conversation-turns/self-test" && req.method === "GET") {
    const result = runConversationTurnControlSelfTest();
    sendJson(res, { success: result.pass, ...result }, result.pass ? 200 : 500);
    return;
  }

  if (pathname === "/api/conversation-turns/stop" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const scope = String(payload.scope || "").trim();
        if (scope !== "group") return sendJson(res, { success: false, error: "该入口请使用对应 Agent 的停止接口" }, 400);
        const cancellation = requestGroupSessionAgentCancellation({
          groupId: payload.group_id || payload.groupId,
          groupSessionId: payload.group_session_id || payload.groupSessionId,
          taskIds: [payload.task_id || payload.taskId].filter(Boolean),
          reason: payload.reason || "用户停止群聊主 Agent 当前工作",
          actor: payload.actor || "conversation-turn-control",
        });
        sendJson(res, { success: true, cancellation });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return;
  }

  if (handleConversationTurnControlApi(pathname, req, res, parsed)) return;

  if (pathname === "/api/pets/runtime/stream" && req.method === "GET") {
    const isDesktopPet = req.ccmAuth?.kind === "internal" && req.ccmAuth?.caller === "desktop-pet";
    const recipientUserIds = isDesktopPet ? undefined : [String(req.ccmAuth?.userId || "")].filter(Boolean);
    const channel = isDesktopPet ? "desktop_pet" : "web_pet";
    const clientId = String(parsed.query.client_id || `${channel}:${crypto.randomUUID()}`).slice(0, 120);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    petStatusClients.add(res);
    writeSse(res, { type: "snapshot", agents: getPetAgents(), client_id: clientId });
    const sent = new Set<string>();
    const flushNotifications = () => {
      const pending = listPendingPetDeliveries({ channel, recipient_user_ids: recipientUserIds, limit: 30 });
      for (const item of pending) {
        if (sent.has(item.delivery.delivery_id)) continue;
        if (!claimPetDelivery(item.delivery.delivery_id, clientId)) continue;
        try {
          writeSse(res, { type: "notification", notification: projectPetNotification(item.notification, item.delivery) });
          sent.add(item.delivery.delivery_id);
        } catch (error) {
          failPetDelivery(item.delivery.delivery_id, error);
        }
      }
    };
    flushNotifications();
    const unsubscribe = subscribeUserNotifications(notification => {
      if (recipientUserIds?.length && !recipientUserIds.includes(notification.recipient_user_id)) return;
      flushNotifications();
    });
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
        flushNotifications();
      } catch {}
    }, 10_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      petStatusClients.delete(res);
    });
    return;
  }

  // 1. SSE 实时状态数据管道单独拦截
  if (pathname === "/api/status/stream" && req.method === "GET") {
    const clientType = String(parsed.query.client || "").trim();
    const isWorkspaceClient = clientType === "workspace";
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    petStatusClients.add(res);
    if (isWorkspaceClient) petWorkspaceClients.add(res);

    const snapshot = getPetAgents();
    writeSse(res, { type: "snapshot", agents: snapshot });

    const prevStates: Record<string, string> = {};
    snapshot.forEach(s => { prevStates[s.name] = s.state; });
    const interval = setInterval(() => {
      try {
        const currentSnapshot = getPetAgents();
        for (const s of currentSnapshot) {
          if (prevStates[s.name] !== s.state) {
            prevStates[s.name] = s.state;
            writeSse(res, {
              type: "state",
              agent: s.name,
              displayName: s.displayName,
              state: s.state,
              lastActivity: s.lastActivity,
              detail: s.stateDetail,
              track: (s as any).track || null
            });
          }
        }
      } catch {}
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
      petStatusClients.delete(res);
      petWorkspaceClients.delete(res);
    });
    return;
  }

  // 2. 静态页面与 React SPA 托管
  if (pathname === "/" || pathname === "/index.html") {
    return sendFile(res, path.join(PUBLIC_DIR, "index.html"));
  }
  if (pathname.startsWith("/assets/") || pathname.startsWith("/public/") ||
      pathname.startsWith("/css/") || pathname.startsWith("/js/") ||
      pathname.startsWith("/pets/") ||
      pathname === "/favicon.svg" || pathname === "/icons.svg" || pathname === "/favicon.ico") {
    const filePath = path.join(PUBLIC_DIR, pathname.startsWith("/public/") ? pathname.replace("/public/", "") : pathname);
    if (fs.existsSync(filePath)) {
      return sendFile(res, filePath);
    }
  }

  // SPA fallback
  if (!pathname.startsWith("/api/") && req.method === "GET") {
    const filePath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return sendFile(res, filePath);
    }
    return sendFile(res, path.join(PUBLIC_DIR, "index.html"));
  }

  // 提供飞书扫码二维码等临时文件访问的动态路由
  if (pathname.startsWith("/api/uploads/") && req.method === "GET") {
    const filename = pathname.split("/").pop();
    if (filename) {
      const filePath = path.join(UPLOAD_DIR, filename);
      console.log("[文件访问] 请求文件:", filename, "路径:", filePath, "存在:", fs.existsSync(filePath));
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };
        res.writeHead(200, {
          "Content-Type": types[ext] || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    sendJson(res, { error: "文件不存在" }, 404);
    return;
  }

  // 3. 构建依赖注入上下文 (Contexts)
  const projectsCtx = {
    PORT,
    getSessions,
    getAgentState,
  };

  const petsCtx = {
    PORT,
    getPetAgents: getPetAgents,
    getPetNavigationTarget,
    broadcastPetNavigation,
    broadcastPetConfigChanged,
    getProjectPetActionStrategy,
    petWorkspaceClientsSize: petWorkspaceClients.size,
  };

  const musicCtx = {
    getMusicPetAgent,
    setMusicPetState,
    broadcastPetSpeech,
    MUSIC_PET_AGENT_NAME,
  };

  const collabCtx = createCollabCtx();

  if (pathname === "/api/project-runs/self-test" && req.method === "GET") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-project-run-"));
    let runForCleanup: any = null;
    let continuationRunForCleanup: any = null;
    try {
      execSync("git init", { cwd: dir, stdio: "ignore" });
      fs.writeFileSync(path.join(dir, "tracked.txt"), "before\n", "utf-8");
      execSync("git add tracked.txt", { cwd: dir, stdio: "ignore" });
      execSync("git -c user.name=ccm -c user.email=ccm@example.local commit -m init", { cwd: dir, stdio: "ignore" });
      const run = createProjectChatRun("self-test-project", "修改 tracked.txt", dir);
      runForCleanup = run;
      const firstSession = bindProjectRunAgentSession(run, "self-test-project", "claudecode").session;
      const afterFirstTurn = recordTaskAgentSessionTurn(firstSession.id, { nativeSessionId: firstSession.nativeSessionId, success: true }) || firstSession;
      const continuationRun = createProjectChatRun("self-test-project", "继续修改 tracked.txt", dir, run.id);
      continuationRunForCleanup = continuationRun;
      const continuationSession = bindProjectRunAgentSession(continuationRun, "self-test-project", "claudecode").session;
      if (!run.checkpoint_id) return sendJson(res, { success: false, error: run.checkpoint?.error || "未创建检查点", run: publicProjectChatRun(run), checkpoint: run.checkpoint }, 500);
      fs.writeFileSync(path.join(dir, "tracked.txt"), "after\n", "utf-8");
      const beforeRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
      const rollback = rollbackExecutionCheckpoint(run.checkpoint_id, "project run self-test", { allowShared: true });
      const afterRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
      const normalizedAfter = afterRollback.replace(/\r\n/g, "\n");
      let persistedBeforeCleanup = false;
      try {
        const persisted = JSON.parse(fs.readFileSync(PROJECT_CHAT_RUNS_FILE, "utf-8"));
        persistedBeforeCleanup = (persisted.runs || []).some((item: any) => item.id === run.id && item.checkpoint_id === run.checkpoint_id);
      } catch {}
      const continuationReusesSession = continuationRun.task_session_scope_id === run.id
        && continuationRun.task_agent_session_id === run.task_agent_session_id
        && continuationSession.id === firstSession.id
        && Number(continuationSession.turnCount || 0) >= Number(afterFirstTurn.turnCount || 0);
      sendJson(res, { success: rollback.success && beforeRollback === "after\n" && normalizedAfter === "before\n" && persistedBeforeCleanup && continuationReusesSession, run: publicProjectChatRun(run), continuationRun: publicProjectChatRun(continuationRun), rollback, checks: { hasRunId: !!run.id, hasTrace: !!run.trace_id, hasCheckpoint: !!run.checkpoint_id, rollbackRestored: normalizedAfter === "before\n", persistedRunRecord: persistedBeforeCleanup, continuationReusesTaskAgentSession: continuationReusesSession }, contents: { beforeRollback, afterRollback } });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || String(error) }, 500);
    } finally {
      if (continuationRunForCleanup?.checkpoint_id) {
        try { rollbackExecutionCheckpoint(continuationRunForCleanup.checkpoint_id, "project run continuation self-test cleanup", { allowShared: true }); } catch {}
      }
      if (runForCleanup?.id) {
        projectChatRuns.delete(runForCleanup.id);
      }
      if (continuationRunForCleanup?.id) projectChatRuns.delete(continuationRunForCleanup.id);
      if (runForCleanup?.id || continuationRunForCleanup?.id) saveProjectChatRuns();
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    return;
  }

  if (pathname === "/api/project-runs/get" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.run_id || "").trim();
    const run = id ? projectChatRuns.get(id) : null;
    if (!run) return sendJson(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
    return sendJson(res, { success: true, run: publicProjectChatRun(run), fileChanges: run.fileChanges || null, workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [] });
  }

  if (pathname === "/api/project-runs/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
        const run = projectChatRuns.get(id);
        if (!run) return sendJson(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        if (run.child) {
          try { terminateManagedChildProcess(run.child); } catch { try { run.child.kill(); } catch {} }
        }
        run.status = "cancelled";
        run.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        sendJson(res, { success: true, run: publicProjectChatRun(run) });
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/project-runs/rollback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
        const run = projectChatRuns.get(id);
        if (!run) return sendJson(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        if (!run.checkpoint_id) return sendJson(res, { success: false, error: "该项目执行没有可用检查点" }, 409);
        const rollback = rollbackExecutionCheckpoint(run.checkpoint_id, payload.reason || "用户从项目聊天安全撤销", { allowShared: true });
        run.status = "reverted";
        run.rollback = rollback;
        run.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        sendJson(res, { success: true, run: publicProjectChatRun(run), rollback });
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/project-runs/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
        const run = archiveProjectChatRun(id, String(payload.reason || "用户删除项目执行记录").slice(0, 500));
        if (!run) return sendJson(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        sendJson(res, { success: true, archived: true, run: publicProjectChatRun(run) });
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/project-runs/purge" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
        const result = purgeProjectChatRun(id);
        if (!result) return sendJson(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        sendJson(res, { success: true, purged: true, run_id: id, cleanup: result.cleanup });
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/cleanup/summary" && req.method === "GET") {
    return sendJson(res, getCleanupSummary());
  }
  if (pathname.startsWith("/pets/") && req.method === "GET") {
    const downloaded = resolveDownloadedPetAsset(pathname.slice("/pets/".length));
    if (downloaded) return sendFile(res, downloaded);
  }

  if (pathname === "/api/cleanup/transaction" && req.method === "GET") {
    const transaction = getCleanupTransaction(String(parsed.query?.transaction_id || ""), { offset: parsed.query?.offset, limit: parsed.query?.limit });
    return transaction ? sendJson(res, { success: true, transaction }) : sendJson(res, { success: false, error: "清理事务不存在" }, 404);
  }

  if (pathname === "/api/cleanup/preview" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = previewCleanupAction(String(payload.action || ""), {
          retention_days: payload.retention_days,
        });
        sendJson(res, result, result.success === false ? 400 : 200);
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/cleanup/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (payload.confirm !== true) return sendJson(res, { success: false, error: "缺少确认参数 confirm=true" }, 400);
        const result = runCleanupAction(String(payload.action || ""), {
          preview_token: payload.preview_token,
          selected_ids: payload.selected_ids,
          confirmation_phrase: payload.confirmation_phrase,
          requested_by: (req as any).auth?.username || (req as any).ccmAuth?.username || "admin",
        });
        sendJson(res, result, result.success === false ? (result.code === "state_drift" ? 409 : result.code === "cleanup_busy" ? 423 : 400) : 202);
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (["/api/cleanup/cancel", "/api/cleanup/resume"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.transaction_id || "");
        const result = pathname.endsWith("/cancel") ? cancelCleanupTransaction(id) : resumeCleanupTransaction(id);
        sendJson(res, result, result.success ? 200 : 404);
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
  }

  if (pathname === "/api/cleanup/storage-index/run" && req.method === "POST") {
    return sendJson(res, { success: true, ...startStorageIndexScan({ force: true }) }, 202);
  }

  if (pathname === "/api/projects/main-agent/task" && req.method === "GET") {
    const task = getProjectMainTask(String(parsed.query?.task_id || parsed.query?.taskId || ""));
    if (!task) return sendJson(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
    return sendJson(res, { success: true, task: projectMainTaskPublic(task) });
  }

  if (["/api/projects/main-agent/plan-confirm", "/api/projects/main-agent/task-action"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const taskId = String(payload.task_id || payload.taskId || "");
        const project = String(payload.project || "");
        const projectSessionId = String(payload.project_session_id || payload.projectSessionId || payload.session_id || "");
        const action = pathname.endsWith("/plan-confirm") ? "confirm_plan" : String(payload.action || "");
        const guardedProjectTask = getProjectMainTask(taskId);
        if (!guardedProjectTask) return sendJson(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
        const guard = validateTaskMutationGuard(guardedProjectTask, payload, { requireTarget: ["confirm_plan", "resume_interrupted", "revise_plan"].includes(action) });
        if ("error" in guard) return sendJson(res, { success: false, error: guard.error, code: guard.code, ...guard.details }, guard.status);
        const persistProjectTaskProjection = (taskInput: any, content: string, source: string) => {
          const task = projectMainTaskPublic(taskInput);
          upsertProjectSessionTaskMessage(project, projectSessionId, {
            id: task.message_id,
            role: "assistant",
            content,
            timestamp: new Date().toISOString(),
            messageMode: "task",
            type: "project_main_task",
            task_id: taskId,
            run_id: task.project_main_run_id || "",
            taskExperience: { ...task, requires_card: true },
            source,
          });
          return task;
        };
        if (action === "confirm_plan") {
          const confirmedTask = confirmProjectMainTask(taskId, project, projectSessionId);
          const task = persistProjectTaskProjection(confirmedTask, "执行计划已经确认，项目主 Agent 将继续安排开发和验收。", "project-main-agent-plan-confirmed");
          return sendJson(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, resume_required: true, resume_parent_run_id: confirmedTask.id });
        }
        if (action === "cancel") {
          const cancelledTask = cancelProjectMainTask(taskId, project, projectSessionId, String(payload.reason || "用户取消项目主 Agent 任务"));
          const task = persistProjectTaskProjection(cancelledTask, "任务已停止。原计划、修订记录和已经产生的执行证据会继续保留。", "project-main-agent-cancelled");
          return sendJson(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id });
        }
        if (action === "interrupt") {
          const interruptedTask = interruptProjectMainTask(taskId, project, projectSessionId, String(payload.reason || "用户停止当前项目主 Agent 执行"));
          const task = persistProjectTaskProjection(interruptedTask, "当前执行已经停止。任务、计划、源码证据和子 Agent 会话都已保留，可以从这里继续。", "project-main-agent-interrupted");
          return sendJson(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, recovery_required: true });
        }
        if (action === "resume_interrupted") {
          const resumedTask = resumeInterruptedProjectMainTask(taskId, project, projectSessionId);
          const task = persistProjectTaskProjection(resumedTask, "已经恢复原任务和子 Agent 会话，将从上一个安全检查点继续。", "project-main-agent-recovered");
          return sendJson(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, resume_required: true, resume_parent_run_id: resumedTask.id });
        }
        if (action === "revise_plan") {
          const feedback = String(payload.feedback || "").trim();
          const clientMessageId = String(payload.client_message_id || payload.clientMessageId || "").trim();
          if (!feedback) return sendJson(res, { success: false, error: "请填写需要调整的计划要求" }, 400);
          if (!clientMessageId) return sendJson(res, { success: false, error: "缺少计划修订的客户端消息 ID" }, 400);
          const revisionTask = getProjectMainTask(taskId);
          if (!revisionTask) return sendJson(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
          if (String(revisionTask.target_project || "") !== project || String(revisionTask.project_session_id || "") !== projectSessionId) {
            return sendJson(res, { success: false, error: "任务不属于当前项目会话" }, 400);
          }
          upsertProjectSessionTaskMessage(project, projectSessionId, {
            id: clientMessageId,
            role: "user",
            content: feedback,
            timestamp: new Date().toISOString(),
            type: "project_plan_revision",
            task_id: taskId,
            source: "project-plan-revision",
          });
          const result = await reviseProjectMainTask({ taskId, project, projectSessionId, feedback, clientMessageId });
          const task = persistProjectTaskProjection(
            result.task,
            `我已根据你的补充要求更新执行计划，这是第 ${result.revision.revision} 次修订。确认后会继续执行。`,
            "project-main-agent-plan-revision",
          );
          return sendJson(res, {
            success: true,
            task,
            taskExperience: { ...task, requires_card: true },
            revision: result.revision,
            duplicate: result.duplicate,
            message_id: task.message_id,
          });
        }
        return sendJson(res, { success: false, error: "不支持的项目主 Agent 操作" }, 400);
      } catch (error: any) {
        return sendJson(res, { success: false, error: error?.message || String(error) }, /不存在/.test(String(error?.message || "")) ? 404 : 400);
      }
    });
    return;
  }

  // === 流式发送消息给 Agent（SSE）===
  if (pathname === "/api/send-stream" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleStreamSend = async (project: string, message: string, files: any[] = [], parentRunId = "", projectSessionId = "", source = "web", platformContext: any = {}, clientMessageId = "", assistantMessageId = "", clarificationPayload: any = null, ccConnectAttachmentRefs: any[] = [], feishuAttachments: any[] = [], conversationTurnId = "", resolvedRoute = "", resolvedCandidateTaskId = "") => {
      let projectFeishuEnvelope: any = null;
      if (source === "feishu") {
        if (String(platformContext?.target_type || "project_agent") !== "project_agent") {
          return sendJson(res, { error: "飞书项目入口只允许调用项目主 Agent" }, 403);
        }
        try {
          projectFeishuEnvelope = platformContext?.feishu_inbound_envelope || buildFeishuInboundEnvelopeV2({
            payload: { ...platformContext, project, target_type: "project_agent" },
            targetType: "project_agent",
            projectId: project,
            transport: "acp",
            messageId: platformContext?.platform_message_id || platformContext?.message_id,
          });
          if (projectFeishuEnvelope.target_type !== "project_agent" || projectFeishuEnvelope.project_id !== project) {
            throw new Error("飞书入站回执与当前项目不匹配");
          }
        } catch (error: any) {
          return sendJson(res, { error: `项目飞书身份校验失败：${error?.message || error}` }, 403);
        }
      }
      let controlledFeishuAttachments = Array.isArray(feishuAttachments)
        ? feishuAttachments.filter((item: any) => item?.schema === "ccm-feishu-inbound-attachment-v1")
        : [];
      if (controlledFeishuAttachments.length && (req.ccmAuth?.kind !== "internal" || !["feishu-acp", "project-feishu-queue"].includes(String(req.ccmAuth?.caller || "")))) {
        return sendJson(res, { error: "飞书附件回执只允许由受信任的内部通道提交" }, 403);
      }
      if (source === "feishu" && Array.isArray(ccConnectAttachmentRefs) && ccConnectAttachmentRefs.length) {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "feishu-acp") {
          return sendJson(res, { error: "只有飞书 ACP 适配器可以提交本地附件引用" }, 403);
        }
        try {
          const attachmentConfig = getConfigs().find(item => item.name === project);
          const attachmentWorkDir = attachmentConfig ? String(getConfigInfo(attachmentConfig.path)[0]?.workDir || "") : "";
          if (!attachmentWorkDir) throw new Error("无法确认当前项目工作目录");
          const resolved = await resolveFeishuInboundAttachments({
            messageId: String(platformContext?.platform_message_id || platformContext?.message_id || ""),
            localRefs: ccConnectAttachmentRefs,
            expectedWorkDir: attachmentWorkDir,
            source: "cc_connect_acp",
          });
          if (!resolved.attachments.length) throw new Error(resolved.failures[0]?.reason || "飞书附件未能安全接管");
          controlledFeishuAttachments = resolved.attachments;
          platformContext = {
            ...platformContext,
            feishu_attachments: controlledFeishuAttachments,
            feishu_attachment_warnings: resolved.warnings,
            feishu_attachment_failures: resolved.failures,
          };
        } catch (error: any) {
          return sendJson(res, { error: `飞书附件接管失败：${error?.message || error}` }, 400);
        }
      }
      if (source === "feishu" && controlledFeishuAttachments.length) {
        try {
          files = materializeFeishuInboundAttachments(controlledFeishuAttachments);
        } catch (error: any) {
          return sendJson(res, { error: `飞书附件受控副本不可用：${error?.message || error}` }, 400);
        }
      }
      const exactProjectSessionId = String(projectSessionId || "").trim();
      if (source === "feishu" && exactProjectSessionId && /^[123]$/.test(String(message || "").trim())) {
        const pendingRoute = conversationTurnControl.listInternal({
          scope: "project",
          conversation_id: `${project}:${exactProjectSessionId}`,
          statuses: "needs_route",
          limit: 20,
        }).turns.at(-1);
        if (pendingRoute?.routing) {
          const choice = String(message).trim() === "1" ? "continue_original" : String(message).trim() === "2" ? "start_new_task" : "answer_only";
          if (choice !== "continue_original" || pendingRoute.routing.candidateTaskId) {
            const resolved = conversationTurnControl.resolveRoute({
              id: pendingRoute.id,
              revision: pendingRoute.revision,
              choice,
              bindingChecksum: pendingRoute.routing.bindingChecksum,
            });
            message = resolved.message;
            conversationTurnId = resolved.id;
            resolvedRoute = choice;
            resolvedCandidateTaskId = resolved.routing?.candidateTaskId || "";
          }
        }
      }
      let effectiveMessage = String(message || "");
      let resolvedProjectClarification: any = null;
      if (clarificationPayload && exactProjectSessionId) {
        const detail: any = getSessionDetail(project, exactProjectSessionId);
        const clarificationId = String(clarificationPayload.id || clarificationPayload.clarification_id || "").trim();
        const clarificationMessageId = String(clarificationPayload.message_id || clarificationPayload.messageId || "").trim();
        const pending = [...(Array.isArray(detail?.history) ? detail.history : [])].reverse().find((item: any) => {
          const projection = item?.prePlanClarification || item?.pre_plan_clarification;
          return item?.role === "assistant" && projection?.status === "pending"
            && ((!clarificationId || String(projection.id || "") === clarificationId)
              && (!clarificationMessageId || String(item.id || "") === clarificationMessageId));
        });
        const projection = pending?.prePlanClarification || pending?.pre_plan_clarification;
        if (!pending || !projection) return sendJson(res, { error: "当前项目会话中没有等待回答的这个业务澄清" }, 404);
        if (Number(clarificationPayload.revision || 0) !== Number(projection.revision || 0)
          || Number(clarificationPayload.generation || 0) !== Number(projection.generation || 0)) {
          return sendJson(res, { error: "澄清内容已更新，请刷新后重新提交", code: "CLARIFICATION_REVISION_CONFLICT" }, 409);
        }
        const original = String(pending?.clarificationContext?.originalRequest || pending?.clarification_context?.original_request || pending?.requestText || "").trim();
        const checksum = crypto.createHash("sha256").update(original).digest("hex");
        if (projection.originalRequestChecksum && checksum !== projection.originalRequestChecksum) {
          return sendJson(res, { error: "原始请求绑定已变化，请重新开始规划", code: "CLARIFICATION_BINDING_CONFLICT" }, 409);
        }
        effectiveMessage = [
          "[原始业务需求]", original,
          "[用户确认的业务决策]", String(message || "").trim(),
          "[续接要求]", "请基于上述业务决策生成详细计划和执行清单。计划必须 requiresConfirmation=true，在用户确认前不得启动项目子 Agent或修改代码。",
        ].filter(Boolean).join("\n\n");
        resolvedProjectClarification = { pending, projection };
      }
      const asideMatch = source === "feishu" ? String(message || "").trim().match(/^\/btw(?:\s+([\s\S]+))?$/i) : null;
      if (asideMatch) {
        if (!project || !exactProjectSessionId || !getSessionDetail(project, exactProjectSessionId)) {
          return sendJson(res, { error: "当前飞书消息没有精确绑定可读取的项目会话，无法执行临时提问" }, 400);
        }
        const question = String(asideMatch[1] || "").trim();
        if (!question) return sendJson(res, { error: "请在 /btw 后输入临时问题" }, 400);
        try {
          const result = await runConversationAside({ scope: "project", scopeId: project, exactSessionId: exactProjectSessionId, question });
          const reply = `临时提问 · 基于提问时上下文\n\n${result.answer}`;
          await notifyFeishuTaskStage({
            stage: "project_agent_aside",
            title: `${projectDisplayName(project)} · 临时提问`,
            markdown: reply,
            sessionId: exactProjectSessionId,
            forceNewMessage: true,
            dedupeKey: `project-feishu-aside:${projectFeishuEnvelope?.message_id || crypto.randomUUID()}`,
          });
          res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "private, no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
          writeSse(res, { type: "chunk", text: reply, ephemeral: true });
          writeSse(res, { type: "done", ephemeral: true, content_stored: false });
          res.end();
          return;
        } catch (error: any) {
          return sendJson(res, { error: error?.message || "临时提问失败" }, 400);
        }
      }
      let sourceIngestion: any = null;
      try {
        sourceIngestion = await ingestRequirementSources({
          files: Array.isArray(files) ? files : [],
          userText: effectiveMessage,
          extractRequirement: false,
          decomposeRequirement: false,
        });
      } catch (error: any) {
        console.warn(`[项目资料读取] ${project || "unknown"} 统一解析失败：${error?.message || error}`);
      }
      const attachmentSources = Array.isArray(sourceIngestion?.sources) ? sourceIngestion.sources : [];
      const readableAttachmentCount = attachmentSources.filter((item: any) => item?.readable === true || ["parsed", "partial"].includes(String(item?.status || "").toLowerCase())).length;
      const publicProjectFeishuAttachments = publicFeishuInboundAttachments(controlledFeishuAttachments).map((item: any) => {
        const parsed = attachmentSources.find((sourceItem: any) => String(sourceItem?.name || "") === item.name);
        return parsed ? { ...item, status: String(parsed.status || (parsed.readable ? "parsed" : "failed")), readable: parsed.readable === true } : item;
      });
      if (controlledFeishuAttachments.length && readableAttachmentCount === 0
        && /^(?:请读取并处理我刚发送的附件。?|请读取并处理这条飞书附件。?)$/.test(String(message || "").trim())) {
        return sendJson(res, {
          error: "附件已经收到，但没有可读取的内容。请转换为 PDF、图片或文本后重新发送。",
          attachment_failures: Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures : [],
        }, 400);
      }
      const sourceContext = String(sourceIngestion?.agent_context || "");
      const fallbackFileContext = !sourceContext && files && files.length > 0
        ? buildUploadedFilesContext(files, "本次消息附件")
        : "";
      const finalMessage = `${effectiveMessage}${sourceContext || fallbackFileContext}`;
      if (!project || !finalMessage.trim()) return sendJson(res, { error: "参数不足" }, 400);
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      if (exactProjectSessionId && !getSessionDetail(project, exactProjectSessionId)) {
        return sendJson(res, { error: "项目会话不存在" }, 404);
      }
      const safeClientMessageId = /^[A-Za-z0-9:_-]{1,180}$/.test(String(clientMessageId || "").trim())
        ? String(clientMessageId).trim()
        : String(req.headers?.["x-client-message-id"] || "").trim();
      const safeAssistantMessageId = /^[A-Za-z0-9:_-]{1,180}$/.test(String(assistantMessageId || "").trim())
        ? String(assistantMessageId).trim()
        : `project-reply:${Date.now().toString(36)}:${Math.random().toString(16).slice(2, 10)}`;
      let projectFeishuDestination: any = null;
      let projectFeishuOriginReceipt: any = null;
      const enqueueCurrentProjectFeishuTurn = () => {
        const requestId = String(projectFeishuEnvelope?.message_id || projectFeishuEnvelope?.checksum || platformContext?.platform_message_id || "").trim();
        const queued = enqueueProjectFeishuTurn({
          project,
          projectSessionId: exactProjectSessionId,
          message,
          files: controlledFeishuAttachments.length ? controlledFeishuAttachments : files,
          platformContext: {
            ...platformContext,
            target_type: "project_agent",
            feishu_inbound_envelope: projectFeishuEnvelope,
            feishu_origin_receipt: projectFeishuOriginReceipt,
          },
          requestId,
        });
        const reply = `当前项目会话仍在执行上一项工作，这条消息已排在第 ${queued.position} 位。上一项结束后会自动处理，并把结果回复到当前飞书话题。`;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no",
        });
        writeSse(res, { type: "presentation", message_mode: "queued", show_task_card: false, main_agent: "project" });
        writeSse(res, { type: "chunk", text: reply, agent: "project-main-agent" });
        writeSse(res, { type: "done", queued: true, queue_position: queued.position, turn_id: queued.turn.id });
        res.end();
      };
      if (source === "feishu") {
        projectFeishuDestination = recordFeishuInbound({
          payload: platformContext,
          sessionId: exactProjectSessionId,
          messageId: String(platformContext?.platform_message_id || platformContext?.message_id || ""),
        });
        projectFeishuOriginReceipt = platformContext?.feishu_origin_receipt
          || buildFeishuOriginReceiptV2({ envelope: projectFeishuEnvelope, sessionId: exactProjectSessionId });
        bindFeishuTaskContext({
          sessionId: exactProjectSessionId,
          destination: projectFeishuDestination,
          source: "project-main-agent-feishu",
          targetType: "project_agent",
          projectId: project,
          originReceipt: projectFeishuOriginReceipt,
        });
        if (controlledFeishuAttachments.length) {
          const transferFailureCount = Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures.length : 0;
          const unreadable = Math.max(0, controlledFeishuAttachments.length - readableAttachmentCount) + transferFailureCount;
          const reportedAttachmentCount = controlledFeishuAttachments.length + transferFailureCount;
          const unreadableNames = [
            ...attachmentSources.filter((item: any) => item?.readable !== true).map((item: any) => String(item?.name || "附件")),
            ...(Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures.map((item: any) => String(item?.name || "附件")) : []),
          ].filter(Boolean).slice(0, 5);
          void notifyFeishuTaskStage({
            stage: "project_agent_attachment_ingestion",
            title: `${projectDisplayName(project)} · 附件读取`,
            markdown: unreadable
              ? `已收到 ${reportedAttachmentCount} 个附件，已读取 ${readableAttachmentCount} 个；${unreadable} 个无法解析${unreadableNames.length ? `（${unreadableNames.join("、")}）` : ""}，将继续处理可读内容。`
              : `已收到并读取 ${reportedAttachmentCount} 个附件，正在整理任务目标。`,
            sessionId: exactProjectSessionId,
            forceNewMessage: true,
            dedupeKey: `project-feishu-attachments:${projectFeishuEnvelope?.message_id || controlledFeishuAttachments.map((item: any) => item.id).join(":")}`,
          }).catch(() => {});
        }
        try {
          const persistedUserMessageId = safeClientMessageId
            || `feishu-user:${String(platformContext?.platform_message_id || projectFeishuEnvelope?.message_id || crypto.randomUUID()).replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 150)}`;
          upsertProjectSessionTaskMessage(project, exactProjectSessionId, {
            id: persistedUserMessageId,
            role: "user",
            content: String(message || "").trim() || "请读取并处理我刚发送的附件。",
            timestamp: new Date().toISOString(),
            source: "feishu-project-user",
            files: publicProjectFeishuAttachments,
          });
        } catch (error: any) {
          console.warn(`[项目飞书会话] 用户消息附件投影失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
        }
        try {
          applyProjectSessionProvisionalTitle(project, exactProjectSessionId, {
            role: "user",
            content: finalMessage,
            files: controlledFeishuAttachments.length ? publicProjectFeishuAttachments : files,
          });
        } catch (error: any) {
          console.warn(`[项目飞书会话] 临时命名失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
        }
        if (isProjectSessionAgentDispatchActive(project, exactProjectSessionId)) return enqueueCurrentProjectFeishuTurn();
      }
      const scheduleFeishuSessionTitle = (assistantMessage: string) => {
        if (source !== "feishu" || !exactProjectSessionId || !String(assistantMessage || "").trim()) return;
        void scheduleProjectSessionAutoTitle(project, exactProjectSessionId, {
          turn: {
            userMessage: finalMessage,
            assistantMessage,
            attachmentNames: (Array.isArray(files) ? files : [])
              .map((file: any) => String(file?.name || file?.filename || "").trim())
              .filter(Boolean),
          },
        }).catch((error: any) => {
          console.warn(`[项目飞书会话] 自动命名失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
        });
      };
      let parentProjectMainTask = parentRunId ? getProjectMainTask(String(parentRunId)) : null;
      if (exactProjectSessionId && parentRunId) {
        const parentRun = projectChatRuns.get(String(parentRunId));
        if (!parentRun && !parentProjectMainTask) return sendJson(res, { error: "续跑来源不存在" }, 404);
        const parentProject = String(parentRun?.project || parentProjectMainTask?.target_project || "");
        const parentSession = String(parentRun?.project_session_id || parentProjectMainTask?.project_session_id || "");
        if (parentProject !== project || parentSession !== exactProjectSessionId) {
          return sendJson(res, { error: "续跑来源不属于当前项目会话" }, 409);
        }
      }
      const dispatchLease = exactProjectSessionId ? acquireProjectSessionAgentDispatch(project, exactProjectSessionId) : { acquired: true, scopeId: "" };
      const dispatchScope = dispatchLease.scopeId;
      if (!dispatchLease.acquired) {
        if (source === "feishu") return enqueueCurrentProjectFeishuTurn();
        return sendJson(res, { error: "当前项目会话仍在处理上一条消息，请等待原消息完成后再继续", code: "PROJECT_SESSION_TURN_ACTIVE" }, 409);
      }
      let released = false;
      let retainDispatchAfterResponse = false;
      const releaseDispatch = () => {
        if (retainDispatchAfterResponse || released || !dispatchScope) return;
        released = true;
        releaseProjectSessionAgentDispatch(dispatchScope);
        if (source === "feishu" && exactProjectSessionId) {
          setImmediate(() => void drainProjectFeishuTurns(`http://127.0.0.1:${PORT}`, project, exactProjectSessionId));
        }
      };
      const persistConversationReply = (content: string, mode = "conversation", extras: any = {}) => {
        if (!exactProjectSessionId || !String(content || "").trim()) return;
        try {
          upsertProjectSessionTaskMessage(project, exactProjectSessionId, {
            id: safeAssistantMessageId,
            role: "assistant",
            content: String(content || ""),
            requestText: message,
            timestamp: new Date().toISOString(),
            messageMode: mode,
            type: "project_main_reply",
            task_id: "",
            run_id: "",
            interruption: null,
            ...extras,
            source: source === "feishu" ? "feishu-project-main-agent-reply" : "web-project-main-agent-reply",
          });
        } catch (error: any) {
          console.warn(`[项目会话] 权威回复持久化失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
        }
      };
      let projectReplyStreamStarted = false;
      let projectReplyDeltaEmitted = false;
      let projectReplySequence = 0;
      const ensureProjectReplyStream = () => {
        if (projectReplyStreamStarted || res.destroyed || res.writableEnded) return;
        projectReplyStreamStarted = true;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
        writeSse(res, { type: "response_started", agent: "project-main-agent" });
      };
      const emitProjectReplyDelta = (delta: string) => {
        if (!delta || res.destroyed || res.writableEnded) return;
        ensureProjectReplyStream();
        projectReplyDeltaEmitted = true;
        projectReplySequence += 1;
        writeSse(res, { type: "response_delta", text: delta, agent: "project-main-agent", sequence: projectReplySequence });
        (res as any).flush?.();
      };
      let projectFirstTurn: any;
      const projectMainMetricStartedAt = Date.now();
      const recoverableProjectCandidates = findRecoverableConversationTasks({
        scope: "project",
        scopeId: project,
        exactSessionId: exactProjectSessionId,
      });
      const explicitRouteChoice = ["continue_original", "start_new_task", "answer_only"].includes(String(resolvedRoute || ""))
        ? String(resolvedRoute)
        : "";
      const explicitCandidate = explicitRouteChoice === "continue_original"
        ? recoverableProjectCandidates.find((item: any) => String(item.id || "") === String(resolvedCandidateTaskId || ""))
        : null;
      try {
        projectFirstTurn = await runProjectMainAgentFirstTurn({
          project,
          projectSessionId: exactProjectSessionId,
          userMessage: finalMessage,
          turnId: String((sourceIngestion as any)?.client_message_id || safeClientMessageId || ""),
          anchorMessageId: String(safeAssistantMessageId || ""),
          sourceCount: Number(sourceIngestion?.source_count || sourceIngestion?.sources?.length || files?.length || 0),
          originalRequestChecksum: crypto.createHash("sha256").update(String(message || "")).digest("hex"),
          clarificationRound: resolvedProjectClarification ? Math.min(2, Number(resolvedProjectClarification.projection.round || 1) + 1) : 1,
          continuationCandidate: buildRecoverableTaskSummary(explicitCandidate || (recoverableProjectCandidates.length === 1 ? recoverableProjectCandidates[0] : null)),
          forcedConversationRoute: explicitRouteChoice as any,
          onDelta: source === "feishu" ? undefined : emitProjectReplyDelta,
          onModelActivity: (activity: any) => {
            if (!projectReplyStreamStarted || res.destroyed || res.writableEnded) return;
            writeSse(res, { type: "model_activity", activity });
          },
        });
      } catch (error: any) {
        // A route choice only makes sense when there is an actual old task to
        // choose. Without a recoverable candidate, surface the model/provider
        // failure and let the user retry instead of showing a misleading
        // "continue or start new" card.
        if (!explicitRouteChoice && source === "web" && exactProjectSessionId && recoverableProjectCandidates.length > 0) {
          try {
            let routeTurn = conversationTurnId
              ? conversationTurnControl.listInternal({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, limit: 500 }).turns.find(item => item.id === conversationTurnId)
              : null;
            if (!routeTurn) {
              const created = conversationTurnControl.enqueue({
                scope: "project",
                conversation_id: `${project}:${exactProjectSessionId}`,
                mode: "queue",
                message: String(message || ""),
                request_id: `route:${safeClientMessageId || crypto.randomUUID()}`,
                owner_id: req.ccmAuth?.kind === "browser" ? req.ccmAuth.userId : "",
                metadata: { project, session_id: exactProjectSessionId, original_message_id: safeClientMessageId },
              });
              routeTurn = conversationTurnControl.claim({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, id: created.turn.id, revision: created.turn.revision });
            }
            if (routeTurn?.status === "sending") {
              const routed = conversationTurnControl.requireRoute({
                id: routeTurn.id,
                revision: routeTurn.revision,
                routing: {
                  candidateTaskId: String(recoverableProjectCandidates[0]?.id || ""),
                  confidence: 0,
                  reason: "主 Agent 暂时无法可靠判断这条消息是否续接原任务，请选择处理方式",
                },
              });
              ensureProjectReplyStream();
              writeSse(res, { type: "route_required", turn: { id: routed.id, revision: routed.revision, status: routed.status, routing: routed.routing }, message_id: safeAssistantMessageId });
              writeSse(res, { type: "done", route_required: true, message_id: safeAssistantMessageId, message_mode: "conversation", final_text: "" });
              releaseDispatch();
              if (!res.writableEnded && !res.destroyed) res.end();
              return;
            }
          } catch {}
        }
        const failedAt = new Date().toISOString();
        const failedDurationMs = Math.max(0, Date.now() - projectMainMetricStartedAt);
        const rawFailure = String(error?.message || error || "");
        const providerUnavailable = /(?:HTTP\s*50[0234]|service temporarily unavailable|timeout|timed out|ECONNRESET|ECONNREFUSED|模型服务.*不可用|provider.*unavailable|模型返回空响应|empty (?:model )?response)/i.test(rawFailure);
        const safeFailureText = providerUnavailable
          ? "模型服务暂时不可用，自动重试后仍未恢复；本轮没有启动项目 Agent，也没有修改代码。请稍后直接重试。"
          : "项目主 Agent 暂时无法形成可靠的后续方案；本轮没有启动项目 Agent，也没有修改代码。请重试或检查模型配置。";
        appendUserVisibleAgentEvent({
          eventId: `project-turn:${String((sourceIngestion as any)?.client_message_id || safeClientMessageId || Date.now())}:result:failed`,
          scope: "project",
          scopeId: project,
          exactSessionId: exactProjectSessionId,
          eventType: "result",
          error: safeFailureText,
          display: {
            title: "本轮未完成",
            summary: "项目主 Agent 未能形成可靠的后续方案",
            status: "failed",
            durationMs: failedDurationMs,
          },
          result: buildUserVisibleAgentResult({
            status: "failed",
            text: safeFailureText,
            durationMs: failedDurationMs,
            stopReason: String(error?.code || "project_main_first_turn_failed"),
            unfinished: ["本轮未启动项目 Agent"],
          }),
          detail: {
            timing: { totalMs: failedDurationMs },
            retryable: true,
            safeRetry: true,
            sideEffectState: "read_only",
            failedAt,
          },
        });
        recordMetric("project-main-agent", {
          success: false,
          durationMs: failedDurationMs,
          fileChangeCount: 0,
          scopeType: "project", projectId: project, role: "main_agent",
          source: "project-main-turn", runtime: "main-agent-model",
          taskId: String(parentRunId || ""),
          executionId: String((sourceIngestion as any)?.client_message_id || safeClientMessageId || ""),
          usageAnchorId: `project-main:${exactProjectSessionId}:${String((sourceIngestion as any)?.client_message_id || safeClientMessageId || Date.now())}`,
          usage: error?.usage || { source: "unreported", missingReason: "failed_before_provider" },
          error: error?.message || String(error),
        });
        releaseDispatch();
        if (projectReplyStreamStarted && !res.destroyed && !res.writableEnded) {
          writeSse(res, { type: "error", text: safeFailureText, interrupted: projectReplyDeltaEmitted, completed_at: failedAt });
          res.end();
          return;
        }
        return sendJson(res, {
          success: false,
          error: safeFailureText,
          completed_at: failedAt,
        }, 503);
      }
      recordMetric("project-main-agent", {
        success: true,
        durationMs: Number(projectFirstTurn.metric?.durationMs || Date.now() - projectMainMetricStartedAt),
        fileChangeCount: 0,
        scopeType: "project", projectId: project, role: "main_agent",
        source: "project-main-turn", runtime: "main-agent-model",
        taskId: String(parentRunId || ""),
        executionId: String((sourceIngestion as any)?.client_message_id || safeClientMessageId || projectFirstTurn.metric?.usageAnchorId || ""),
        usageAnchorId: projectFirstTurn.metric?.usageAnchorId,
        usage: projectFirstTurn.metric?.usage || projectFirstTurn.turnReceipt?.usage || { source: "unreported", missingReason: "runtime_unreported" },
        timing: {
          totalMs: Number(projectFirstTurn.metric?.durationMs || 0),
          modelMs: Number(projectFirstTurn.metric?.modelMs || 0),
          toolWallMs: Number(projectFirstTurn.metric?.toolWallMs || 0),
          firstVisibleFeedbackMs: Number(projectFirstTurn.metric?.firstVisibleFeedbackMs || 0),
          firstTokenMs: Number(projectFirstTurn.metric?.firstTokenMs || 0),
          maxSilentGapMs: Number(projectFirstTurn.metric?.maxSilentGapMs || 0),
        },
        streaming: {
          firstVisibleFeedbackMs: Number(projectFirstTurn.metric?.firstVisibleFeedbackMs || 0),
          firstTokenMs: Number(projectFirstTurn.metric?.firstTokenMs || 0),
          maxSilentGapMs: Number(projectFirstTurn.metric?.maxSilentGapMs || 0),
          providerRetryCount: Number(projectFirstTurn.metric?.retryCount || 0),
          fallbackStreamCount: Number(projectFirstTurn.metric?.fallbackStreamCount || 0),
          initialReadFileCount: Number(projectFirstTurn.metric?.initialReadFileCount || 0),
          initialReadTokens: Number(projectFirstTurn.metric?.initialReadTokens || 0),
        },
      });
      const chatIntent = {
        mode: projectFirstTurn.responseType === "reply" || projectFirstTurn.responseType === "clarify"
          ? "conversation"
          : isDevelopmentTaskWorkflowDecision(projectFirstTurn.workflowDecision) ? "task" : "project_analysis",
        workflowDecision: projectFirstTurn.workflowDecision,
      };
      const routeDecision = decideConversationMessageRoute({
        workflowDecision: projectFirstTurn.workflowDecision,
        candidates: recoverableProjectCandidates,
      });
      if (explicitRouteChoice === "continue_original") {
        if (!explicitCandidate) {
          releaseDispatch();
          return sendJson(res, { success: false, error: "原任务已不可恢复，请重新选择处理方式", code: "CONVERSATION_ROUTE_CANDIDATE_STALE" }, 409);
        }
        parentRunId = String(explicitCandidate.id || "");
        parentProjectMainTask = getProjectMainTask(parentRunId) || explicitCandidate;
      } else if (explicitRouteChoice === "start_new_task" || explicitRouteChoice === "answer_only") {
        parentRunId = "";
        parentProjectMainTask = null;
      } else if (["resume_task", "revise_task"].includes(routeDecision.decision) && routeDecision.candidate) {
        parentRunId = String(routeDecision.candidate.id || "");
        parentProjectMainTask = getProjectMainTask(parentRunId) || routeDecision.candidate;
      } else if (routeDecision.decision === "needs_user") {
        let routeTurn = conversationTurnId
          ? conversationTurnControl.listInternal({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, limit: 500 }).turns.find(item => item.id === conversationTurnId)
          : null;
        if (!routeTurn) {
          const created = conversationTurnControl.enqueue({
            scope: "project",
            conversation_id: `${project}:${exactProjectSessionId}`,
            mode: "queue",
            message: String(message || ""),
            request_id: `route:${safeClientMessageId || crypto.randomUUID()}`,
            owner_id: req.ccmAuth?.kind === "browser" ? req.ccmAuth.userId : "",
            metadata: { project, session_id: exactProjectSessionId, original_message_id: safeClientMessageId },
          });
          routeTurn = conversationTurnControl.claim({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, id: created.turn.id, revision: created.turn.revision });
        }
        if (!routeTurn || routeTurn.status !== "sending") {
          releaseDispatch();
          return sendJson(res, { success: false, error: "消息处理方式已经变化，请刷新后重试", code: "QUEUE_REVISION_CONFLICT" }, 409);
        }
        const routed = conversationTurnControl.requireRoute({
          id: routeTurn.id,
          revision: routeTurn.revision,
          routing: {
            candidateTaskId: String(routeDecision.candidate?.id || ""),
            confidence: routeDecision.confidence,
            reason: routeDecision.reason,
          },
        });
        if (source === "feishu") {
          await notifyFeishuTaskStage({
            stage: "conversation_route_required",
            title: `${projectDisplayName(project)} · 请选择处理方式`,
            markdown: [
              "这条消息可能与刚才的任务有关。",
              routed.routing?.reason || "请确认如何处理这条消息。",
              routed.routing?.candidateTaskId ? "1. 继续原任务" : "1. 继续原任务（当前不可用）",
              "2. 作为新任务",
              "3. 仅回答问题",
              "请直接回复 1、2 或 3。",
            ].join("\n"),
            sessionId: exactProjectSessionId,
            forceNewMessage: true,
            dedupeKey: `project-route:${routed.id}:${routed.revision}`,
          });
        }
        ensureProjectReplyStream();
        writeSse(res, { type: "route_required", turn: { id: routed.id, revision: routed.revision, status: routed.status, routing: routed.routing }, message_id: safeAssistantMessageId });
        writeSse(res, { type: "done", route_required: true, message_id: safeAssistantMessageId, message_mode: "conversation", final_text: "" });
        releaseDispatch();
        if (!res.writableEnded && !res.destroyed) res.end();
        return;
      }
      if (parentProjectMainTask && explicitRouteChoice !== "answer_only") chatIntent.mode = "task";
      const directProjectReply = ["reply", "clarify"].includes(String(projectFirstTurn.responseType || ""))
        ? String(projectFirstTurn.reply || "").trim()
        : "";
      if (directProjectReply) {
        const clarificationProjection = projectFirstTurn.prePlanClarification;
        const visibleProjectReply = source === "feishu" && clarificationProjection
          ? formatPrePlanClarificationText(clarificationProjection)
          : directProjectReply;
        const clarificationSummary = (projectFirstTurn as any).clarificationSummary
          || (clarificationProjection ? buildConversationClarificationSummary({
            schema: "ccm-project-main-agent-clarification-summary-v1",
            question: visibleProjectReply,
            prePlanClarification: clarificationProjection,
          }) : null);
        persistConversationReply(visibleProjectReply, "conversation", clarificationProjection ? {
          prePlanClarification: { ...clarificationProjection, anchorMessageId: safeAssistantMessageId },
          pre_plan_clarification: { ...clarificationProjection, anchorMessageId: safeAssistantMessageId },
          clarificationSummary,
          clarification_summary: clarificationSummary,
          clarificationContext: { schema: "ccm-project-clarification-context-v1", originalRequest: message, status: "pending" },
          clarification_context: { schema: "ccm-project-clarification-context-v1", original_request: message, status: "pending" },
        } : {});
        if (!res.destroyed && !res.writableEnded) {
          ensureProjectReplyStream();
          writeSse(res, { type: "turn_decision", decision: projectFirstTurn.turnDecision, receipt: projectFirstTurn.turnReceipt });
          for (const item of projectFirstTurn.toolResults || []) writeSse(res, { type: "tool_activity", phase: item.ok === false ? "failed" : "completed", tool: item.name, scope: item.scope || "project", source: item.source || item.toolKind || "", loaded: item.loaded !== false, output_tokens: item.outputTokens || 0, duration_ms: item.durationMs || 0, result_checksum: item.resultChecksum || "", error: item.error || "" });
          writeSse(res, { type: "presentation", message_mode: "conversation", show_task_card: false, main_agent: "project", direct_reply_fast_path: true, prePlanClarification: clarificationProjection, pre_plan_clarification: clarificationProjection, clarificationSummary, clarification_summary: clarificationSummary });
          if (!projectReplyDeltaEmitted && visibleProjectReply) emitProjectReplyDelta(visibleProjectReply);
          if (!res.destroyed && !res.writableEnded) {
            writeSse(res, { type: "response_completed", sequence: projectReplySequence, final: true });
            writeSse(res, { type: "done", message_id: safeAssistantMessageId, message_mode: "conversation", main_agent: "project", taskExperience: null, direct_reply_fast_path: true, final_text: visibleProjectReply, prePlanClarification: clarificationProjection, pre_plan_clarification: clarificationProjection, clarificationSummary, clarification_summary: clarificationSummary });
          }
        }
        scheduleFeishuSessionTitle(visibleProjectReply);
        releaseDispatch();
        if (!res.writableEnded && !res.destroyed) res.end();
        return;
      }
      if (resolvedProjectClarification && projectFirstTurn.plan) {
        projectFirstTurn.plan.requiresConfirmation = true;
        const resolvedAt = new Date().toISOString();
        upsertProjectSessionTaskMessage(project, exactProjectSessionId, {
          ...resolvedProjectClarification.pending,
          prePlanClarification: { ...resolvedProjectClarification.projection, status: "resolved", revision: Number(resolvedProjectClarification.projection.revision || 1) + 1, resolvedAt },
          pre_plan_clarification: { ...resolvedProjectClarification.projection, status: "resolved", revision: Number(resolvedProjectClarification.projection.revision || 1) + 1, resolved_at: resolvedAt },
          clarificationContext: { ...(resolvedProjectClarification.pending.clarificationContext || {}), status: "resolved", resolvedAt },
          clarification_context: { ...(resolvedProjectClarification.pending.clarification_context || {}), status: "resolved", resolved_at: resolvedAt },
        });
      }
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      const configuredAgentType = info[0]?.agent || "claudecode";
      const resolvedRuntime = resolveAvailableAgentRuntime(configuredAgentType);
      const agentType = resolvedRuntime.selected;
      if (exactProjectSessionId) syncSessions(project);
      const projectKnowledge: any = { context: "", citations: [], embeddingMode: "not_loaded", fallback: false };
      const projectConfigSnapshot = loadProjectConfigs()?.[project] || {};
      const globalContextConfig = loadOrchestratorConfig();
      const projectContextPolicy = resolveMainAgentContextPolicy(globalContextConfig, projectConfigSnapshot.context_policy || projectConfigSnapshot.contextPolicy || {}).effective;
      const projectContextWindow = Number(resolveGroupModelContextCapacity(globalContextConfig).effectiveContextWindow || 200_000);
      const projectSourceBudget = calculateContextSourceBudget({ contextWindow: projectContextWindow, catalogPercent: projectContextPolicy.contextSourceCatalogBudgetPercent, hydrationPercent: projectContextPolicy.contextSourceHydrationBudgetPercent });
      migrateLegacySharedFilesV2("project", project, projectConfigSnapshot.shared_files || [], "project-config-v1");
      const projectSharedFiles = buildSharedFilesContextV2("project", project, {
        contextWindow: projectContextWindow,
        hydrationBudgetPercent: projectContextPolicy.contextSourceHydrationBudgetPercent,
        remainingSafeTokens: projectSourceBudget.hydrationTargetTokens,
        explicitText: finalMessage,
        title: "以下是当前项目已授权共享文件。规划、开发和验收必须引用对应文件与分片证据：",
      });
      const projectSourceIdentity = exactProjectSessionId ? { agentKind: "project" as const, scope: "project" as const, scopeId: project, exactSessionId: exactProjectSessionId, generation: 0 } : null;
      const projectSourceCatalog = buildContextSourceCatalog({
        sources: listContextSourceCatalogEntries({ sharedScope: "project", sharedScopeId: project, knowledgeContext: { role: "project-agent", project } }),
        maxTokens: projectSourceBudget.catalogTargetTokens,
        explicitText: finalMessage,
        recentReceipts: projectSourceIdentity ? readContextSourceContinuity(projectSourceIdentity).receipts : [],
      });
      if (projectSourceIdentity) {
        recordContextSourceCatalog(projectSourceIdentity, projectSourceCatalog, projectSourceBudget);
        recordSharedFileProjection(projectSourceIdentity, projectSharedFiles, { ...projectSourceBudget, catalogUsedTokens: projectSourceCatalog.usedTokens, sharedFileTokens: projectSharedFiles.total_tokens, hydrationUsedTokens: projectSharedFiles.total_tokens });
      }
      if (exactProjectSessionId) {
        if (projectSharedFiles.files.length) {
          const sharedToolCallId = `shared_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
          appendProjectSessionExecutionEvent(project, exactProjectSessionId, {
            type: "tool_use",
            toolName: "read_shared_files",
            toolCallId: sharedToolCallId,
            runId: `project-main:${exactProjectSessionId}`,
            arguments: { scope: "project", manifest_checksum: projectSharedFiles.checksum },
          });
          appendProjectSessionExecutionEvent(project, exactProjectSessionId, {
            type: "tool_result",
            toolName: "read_shared_files",
            toolCallId: sharedToolCallId,
            runId: `project-main:${exactProjectSessionId}`,
            status: "ok",
            observation: {
              manifest_checksum: projectSharedFiles.checksum,
              files: projectSharedFiles.files.map((file: any) => ({ id: file.id, name: file.name, checksum: file.checksum, chunks: file.chunks?.length || 0 })),
              selected_chunks: projectSharedFiles.selected_chunks,
              complete: projectSharedFiles.complete,
            },
          });
        }
      }
      const selectedProjectRoleSkills = chatIntent.mode === "task"
        ? selectRoleSkills("project-child-agent", finalMessage, {
            forceWork: true,
            source: "project-chat",
            phase: "execution",
            selectedSkillNames: chatIntent.workflowDecision?.selectedSkills || [],
            modelDecision: chatIntent.workflowDecision || null,
          })
        : [];
      const buildCurrentProjectToolContext = (internalMcpServers: any = {}) => buildProjectToolContext(project, workDir, agentType, {
        internalMcpServers,
        selectedRoleSkills: selectedProjectRoleSkills,
        roleSkillPrompt: buildSelectedSkillUsageDirective(selectedProjectRoleSkills),
      });
      let toolContext = buildCurrentProjectToolContext();
      let projectRestoredSourceContext = "";
      if (toolContext.dispatchGate?.dispatchReady === false) {
        releaseDispatch();
        return sendRuntimeToolDispatchBlocked(res, toolContext);
      }
      if (resolvedRuntime.switched) {
        toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
        (toolContext.workEvent as any).runtimeFallback = resolvedRuntime;
      }
      const projectMemoryPacket = chatIntent.mode === "task"
        ? buildProjectMemoryPacket(project, { workDir, query: finalMessage })
        : "";
      let projectCompaction: any = null;
      if (exactProjectSessionId) {
        try {
          projectCompaction = await compactProjectSessionWithModel(project, exactProjectSessionId, {
            reason: "auto_model",
            currentRequest: finalMessage,
            fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, contextSourceCatalog: projectSourceCatalog.context, projectMemoryPacket, projectKnowledge: projectKnowledge.context, projectSharedFiles: projectSharedFiles.context },
            tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
            provider: agentType,
          });
          if (projectCompaction?.reason === "circuit_breaker") {
            releaseDispatch();
            return sendJson(res, { error: "项目会话记忆压缩已熔断，本轮未启动第三方 Agent", consecutive_failures: projectCompaction.consecutive_failures || 3 }, 503);
          }
        } catch (error: any) {
          releaseDispatch();
          return sendJson(res, { error: `项目会话自动压缩失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
        }
      }
      let projectMemoryMcp: any = null;
      if (exactProjectSessionId && chatIntent.mode === "task") {
        try {
          const prepareProjectMemoryMcp = () => {
            const projection = buildProjectSessionModelContextProjection(project, exactProjectSessionId, { currentRequest: finalMessage, persistMicroCompactReceipt: true });
            if (!projection) throw new Error("项目会话连续性不存在");
            const binding = getProjectSessionAgentBinding(project, exactProjectSessionId);
            const nativeGeneration = Number(binding.generation || binding.generation_count + 1 || 1);
            const snapshot = createThirdPartyMemorySnapshot({
              bindingKind: "project_session",
              role: "project-agent",
              project,
              projectSessionId: exactProjectSessionId,
              taskAgentSessionId: binding.task_agent_session_id || "",
              provider: agentType,
              nativeGeneration,
              boundaryGeneration: projection.boundaryGeneration,
              mode: projection.mode,
              summary: projection.summary,
              summarySource: projection.summarySource,
              messages: projection.visibleMessages,
              archiveMessages: projection.archiveMessages,
              memoryItems: [{ kind: "project_memory", source: project, required: true, content: projectMemoryPacket }],
              modelContextWindow: projectCompaction?.model_context_capacity?.contextWindow || projectCompaction?.resolved_model_capacity?.contextWindow || 0,
              autoCompactThreshold: projectCompaction?.auto_compact_threshold || 0,
              requestText: finalMessage,
            });
            const challenge = createMemoryContextConsumptionChallenge({
              project,
              executionId: `${project}:${exactProjectSessionId}:generation:${nativeGeneration}`,
              taskAgentSessionId: binding.task_agent_session_id || "",
              attempt: nativeGeneration,
            });
            const internalMcpServers = buildProjectSessionBoundMemoryMcpServer({
              project,
              projectSessionId: exactProjectSessionId,
              agentType,
              workDir,
              taskAgentSessionId: binding.task_agent_session_id || "",
              nativeSessionId: binding.native_session_id || "",
              memoryReceiptChallenge: challenge,
              memoryReceiptFile: memoryContextConsumptionReceiptFile(challenge.challenge_id),
              memorySnapshotId: snapshot.id,
              memorySnapshotChecksum: snapshot.checksum,
              boundaryGeneration: snapshot.boundaryGeneration,
              nativeGeneration: snapshot.nativeGeneration,
              requestText: finalMessage,
              memoryReadBudgetTokens: snapshot.autoCompactThreshold,
            });
            return { projection, binding, snapshot, challenge, internalMcpServers };
          };
          projectMemoryMcp = prepareProjectMemoryMcp();
          toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
          const knowledgeMcp = (toolContext.audit.internal_mcp || []).find((item: any) => item.name === "ccm__knowledge_context");
          projectMemoryMcp.ready = knowledgeMcp?.state === "synced";
          if (projectMemoryMcp.ready) {
            const threshold = Number(projectCompaction?.auto_compact_threshold || projectMemoryMcp.snapshot.autoCompactThreshold || 0);
            let providerUsageBiasTokens = Math.max(0,
              Number(projectCompaction?.before_tokens || projectCompaction?.token_measurement?.activeTokens || 0)
              - Number(projectCompaction?.model_visible_payload?.totalTokens || 0));
            const hydratedPayloadTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0)
              + estimateTextTokens(toolContext.prompt)
              + estimateTextTokens(projectKnowledge.context)
              + estimateTextTokens(projectSharedFiles.context)
              + estimateTextTokens(finalMessage)
              + providerUsageBiasTokens;
            if (threshold > 0 && hydratedPayloadTokens >= threshold && projectCompaction?.compacted !== true) {
              projectCompaction = await compactProjectSessionWithModel(project, exactProjectSessionId, {
                force: true,
                reason: "third_party_memory_mcp_required_hydration",
                currentRequest: finalMessage,
                fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, contextSourceCatalog: projectSourceCatalog.context, projectMemoryPacket, projectKnowledge: projectKnowledge.context, projectSharedFiles: projectSharedFiles.context },
                tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
                provider: agentType,
              });
              projectMemoryMcp = prepareProjectMemoryMcp();
              toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
              projectMemoryMcp.ready = (toolContext.audit.internal_mcp || []).some((item: any) => item.name === "ccm__knowledge_context" && item.state === "synced");
              providerUsageBiasTokens = Math.max(0,
                Number(projectCompaction?.before_tokens || projectCompaction?.token_measurement?.activeTokens || 0)
                - Number(projectCompaction?.model_visible_payload?.totalTokens || 0));
              const postTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0) + estimateTextTokens(toolContext.prompt) + estimateTextTokens(projectKnowledge.context) + estimateTextTokens(projectSharedFiles.context) + estimateTextTokens(finalMessage) + providerUsageBiasTokens;
              if (threshold > 0 && postTokens >= threshold) throw new Error(`项目记忆 MCP 必读上下文压缩后仍超过阈值：${postTokens}/${threshold}`);
            }
            const exactThreshold = Number(projectCompaction?.auto_compact_threshold || projectMemoryMcp.snapshot.autoCompactThreshold || 0);
            const fixedTokens = estimateTextTokens(toolContext.prompt)
              + estimateTextTokens(projectKnowledge.context)
              + estimateTextTokens(projectSharedFiles.context)
              + estimateTextTokens(finalMessage)
              + providerUsageBiasTokens;
            const memoryReadBudgetTokens = exactThreshold > 0 ? Math.max(0, exactThreshold - fixedTokens) : 0;
            if (exactThreshold > 0 && Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0) >= memoryReadBudgetTokens) {
              throw new Error(`项目记忆 MCP 累计读取预算不足：required=${projectMemoryMcp.snapshot.requiredHydrationTokens || 0}; budget=${memoryReadBudgetTokens}`);
            }
            projectMemoryMcp.internalMcpServers = buildProjectSessionBoundMemoryMcpServer({
              project,
              projectSessionId: exactProjectSessionId,
              agentType,
              workDir,
              taskAgentSessionId: projectMemoryMcp.binding.task_agent_session_id || "",
              nativeSessionId: projectMemoryMcp.binding.native_session_id || "",
              memoryReceiptChallenge: projectMemoryMcp.challenge,
              memoryReceiptFile: memoryContextConsumptionReceiptFile(projectMemoryMcp.challenge.challenge_id),
              memorySnapshotId: projectMemoryMcp.snapshot.id,
              memorySnapshotChecksum: projectMemoryMcp.snapshot.checksum,
              boundaryGeneration: projectMemoryMcp.snapshot.boundaryGeneration,
              nativeGeneration: projectMemoryMcp.snapshot.nativeGeneration,
              requestText: finalMessage,
              memoryReadBudgetTokens,
            });
            projectMemoryMcp.memoryReadBudgetTokens = memoryReadBudgetTokens;
            projectMemoryMcp.providerUsageBiasTokens = providerUsageBiasTokens;
            toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
            projectMemoryMcp.ready = (toolContext.audit.internal_mcp || []).some((item: any) => item.name === "ccm__knowledge_context" && item.state === "synced");
          }
        } catch (error: any) {
          releaseDispatch();
          return sendJson(res, { error: `项目会话记忆 MCP 准备失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
        }
      }
      if (toolContext.dispatchGate?.dispatchReady === false) {
        releaseDispatch();
        return sendRuntimeToolDispatchBlocked(res, toolContext);
      }
      const resolvedProjectSourceIdentity = projectSourceIdentity ? resolveMainAgentContinuityIdentity(projectSourceIdentity) : null;
      if (resolvedProjectSourceIdentity && resolvedProjectSourceIdentity.generation > 0) {
        projectRestoredSourceContext = restoreContextSources({
          identity: resolvedProjectSourceIdentity,
          knowledgeContext: { role: "project-agent", project },
          explicitText: finalMessage,
          maxPerItemTokens: projectContextPolicy.postCompactSourcePerItemMaxTokens,
          maxTotalTokens: projectContextPolicy.postCompactSourceTotalMaxTokens,
          hydrationTargetTokens: projectSourceBudget.hydrationTargetTokens,
          remainingSafeTokens: projectSourceBudget.remainingSafeTokens,
        }).context;
      }
      const fullMessage = [toolContext.prompt, projectSourceCatalog.context, projectRestoredSourceContext, projectKnowledge.context, projectSharedFiles.context, finalMessage].filter(Boolean).join("\n\n");
      const memoryMcpEnabled = projectMemoryMcp?.ready === true;
      const projectSessionContext = memoryMcpEnabled
        ? buildThirdPartyMemoryBootstrap(projectMemoryMcp.snapshot, projectMemoryMcp.challenge)
        : exactProjectSessionId ? buildProjectSessionPostCompactContext(project, exactProjectSessionId, agentType, { currentRequest: finalMessage }) : "";
      if (requestIsReadOnly(req) && chatIntent.mode === "task") {
        releaseDispatch();
        return sendJson(res, { success: false, error: "当前账户仅允许项目只读问答；这条需求需要项目管理权限", code: "PROJECT_EXECUTION_FORBIDDEN" }, 403);
      }
      res.once?.("finish", releaseDispatch);
      try {
        let responseDetached = !!(res.writableEnded || res.destroyed);
        if (!responseDetached) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no",
          });
          if (typeof res.flushHeaders === "function") res.flushHeaders();
        }
        const send = (data: any) => {
          if (!responseDetached && !res.writableEnded && !res.destroyed) writeSse(res, data);
        };
        let taskHeartbeatFactory: null | (() => any) = null;
        const heartbeat = setInterval(() => {
          if (!res.writableEnded && !res.destroyed) {
            try {
              res.write(": keep-alive\n\n");
              const taskHeartbeat = taskHeartbeatFactory?.();
              if (taskHeartbeat) send(taskHeartbeat);
            } catch (error: any) {
              console.warn(`[project-main] task heartbeat skipped: ${error?.message || error}`);
            }
          }
        }, 15000);
        heartbeat.unref?.();
        send({ type: "turn_decision", decision: projectFirstTurn.turnDecision, receipt: projectFirstTurn.turnReceipt });
        for (const item of projectFirstTurn.toolResults || []) {
          send({ type: "tool_activity", phase: item.ok === false ? "failed" : "completed", tool: item.name, scope: item.scope || "project", source: item.source || item.toolKind || "", loaded: item.loaded !== false, output_tokens: item.outputTokens || 0, duration_ms: item.durationMs || 0, result_checksum: item.resultChecksum || "", error: item.error || "" });
        }

        if (chatIntent.mode !== "task") {
          send({ type: "presentation", message_mode: chatIntent.mode, show_task_card: false, main_agent: "project" });
          send({ type: "status", text: chatIntent.mode === "project_analysis" ? "项目主 Agent 正在分析当前项目..." : "项目主 Agent 正在回复...", agent: "project-main-agent" });
          const projectMainContext = [projectKnowledge.context, projectSharedFiles.context].filter(Boolean).join("\n\n");
          let streamedAnswer = false;
          const answer = await answerAsProjectMainAgent({
            project,
            projectSessionId: exactProjectSessionId,
            userMessage: finalMessage,
            mode: chatIntent.mode === "project_analysis" ? "project_analysis" : "conversation",
            context: projectMainContext,
            workflowDecision: chatIntent.workflowDecision,
            onDelta: delta => {
              if (!delta) return;
              streamedAnswer = true;
              send({ type: "chunk", text: delta, agent: "project-main-agent" });
            },
          });
          if (answer && !streamedAnswer) send({ type: "chunk", text: answer, agent: "project-main-agent" });
          persistConversationReply(answer, chatIntent.mode);
          scheduleFeishuSessionTitle(answer);
          send({ type: "done", message_id: safeAssistantMessageId, message_mode: chatIntent.mode, main_agent: "project", taskExperience: null });
          clearInterval(heartbeat);
          releaseDispatch();
          res.end();
          return;
        }

        const projectRun = createProjectChatRun(project, effectiveMessage, workDir, parentRunId, exactProjectSessionId);
        projectRun.message_mode = "task";
        projectRun.workflow_decision = chatIntent.workflowDecision;
        const bound = bindProjectRunAgentSession(projectRun, project, agentType);
        let activeTaskAgentSession = bound.session;
        let activeAgentSessionOptions = bound.options;
        const existingTask = parentProjectMainTask;
        const plan = existingTask?.workflow_meta?.project_main_plan || projectFirstTurn.plan || await planProjectMainTask({
          project,
          projectSessionId: exactProjectSessionId,
          userMessage: finalMessage,
          workflowDecision: chatIntent.workflowDecision,
          context: [projectKnowledge.context, projectSharedFiles.context].filter(Boolean).join("\n\n"),
        });
        const task = existingTask || createProjectMainTask({
          project,
          projectSessionId: exactProjectSessionId,
          projectMainRunId: projectRun.id,
          userMessage: effectiveMessage,
          plan,
          workflowDecision: chatIntent.workflowDecision,
          sourceAttachments: files,
        });
        projectRun.project_main_task_id = task.id;
        projectRun.status = plan.requiresConfirmation && !existingTask ? "paused" : "queued";
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        const feishuTask = source === "feishu";
        if (feishuTask) {
          bindFeishuTaskContext({
            sessionId: exactProjectSessionId,
            destination: projectFeishuDestination,
            runIds: [projectRun.id],
            taskIds: [task.id],
            source: "project-main-agent-feishu",
            targetType: "project_agent",
            projectId: project,
            originReceipt: projectFeishuOriginReceipt,
          });
        }
        const taskSnapshot = () => projectMainTaskPublic(getProjectMainTask(task.id) || task);
        const taskExperience = () => ({
          ...taskSnapshot(),
          requires_card: true,
          rollback_available: !!projectRun.checkpoint_id,
          session_ids: [activeTaskAgentSession.id],
          parent_run_id: projectRun.parent_run_id || "",
        });
        const taskMessageId = `project-main-task:${task.id}`;
        const persistTaskMessage = (content = "", experience: any = taskExperience()) => upsertProjectSessionTaskMessage(project, exactProjectSessionId, {
          id: taskMessageId,
          role: "assistant",
          content: String(content || experience.final_summary || experience.status_detail || plan.summary || "项目主 Agent 正在推进任务"),
          timestamp: new Date().toISOString(),
          messageMode: "task",
          type: "project_main_task",
          task_id: task.id,
          run_id: projectRun.id,
          taskExperience: experience,
          source: source === "feishu" ? "feishu-project-main-agent" : "web-project-main-agent",
        });
        taskHeartbeatFactory = () => {
          const experience = taskExperience();
          return {
            type: "task_heartbeat",
            message_id: taskMessageId,
            task_id: task.id,
            at: new Date().toISOString(),
            text: experience.runtime_status?.status_detail || experience.phase_label || "项目主 Agent 正在推进任务",
            taskExperience: experience,
          };
        };
        send({ type: "presentation", message_mode: "task", show_task_card: true, workflow_decision: chatIntent.workflowDecision, main_agent: "project" });
        send({ type: "planning", status: "completed", plan, task_id: task.id });
        send({ type: "task_runtime", message_id: taskMessageId, run: publicProjectChatRun(projectRun), taskExperience: taskExperience() });
        persistTaskMessage(plan.summary);

        if (plan.requiresConfirmation && !existingTask) {
          const planText = `我已经整理好执行计划，需要你确认后才会安排开发 Agent。\n\n${plan.summary}\n\n${plan.workItems.map((item: any, index: number) => `${index + 1}. ${item.title}：${item.objective}`).join("\n")}`;
          scheduleFeishuSessionTitle(planText);
          send({ type: "chunk", text: planText, agent: "project-main-agent" });
          send({ type: "done", message_id: taskMessageId, message_mode: "task", run: publicProjectChatRun(projectRun), workEvents: [], taskExperience: taskExperience() });
          clearInterval(heartbeat);
          releaseDispatch();
          res.end();
          return;
        }

        if (feishuTask) {
          retainDispatchAfterResponse = true;
          const acceptedText = `项目主 Agent 已完成任务规划并创建正式任务。\n\n任务：${plan.title}\n任务编号：${task.id}\n工作项：${plan.workItems.length} 个\n\n开发 Agent 与 TestAgent 将在后台按顺序执行，完成或阻塞后会回到当前飞书会话。`;
          scheduleFeishuSessionTitle(acceptedText);
          send({ type: "chunk", text: acceptedText, agent: "project-main-agent" });
          send({ type: "done", message_id: taskMessageId, message_mode: "task", accepted: true, detached: true, task_id: task.id, run: publicProjectChatRun(projectRun), taskExperience: taskExperience() });
          clearInterval(heartbeat);
          responseDetached = true;
          res.end();
        }

        let firstMemoryReceiptRequired = memoryMcpEnabled;
        const workerResults: any[] = [];
        let finalSummaryStreamed = false;
        const execution = await scheduleUnifiedTaskOperation({
          taskId: task.id,
          queueKey: `conversation:project:${project}:${exactProjectSessionId}`,
          workspaceLane: canonicalWorkspaceMutationLane(workDir, `workspace:project:${project}`),
          priority: task.priority || "normal",
          onState: schedulerState => {
            const queued = schedulerState.state === "queued";
            const running = schedulerState.state === "running";
            if (queued || running) {
              projectRun.status = queued ? "queued" : "running";
              projectRun.updated_at = new Date().toISOString();
              saveProjectChatRuns();
            }
            updateCanonicalTask(task.id, {
              scheduler_state: schedulerState,
              queue_target_key: schedulerState.queue_key,
              queue_position: schedulerState.position,
              queue_state: schedulerState.state,
              ...(queued ? { status: "pending", status_detail: `项目任务已进入会话串行队列，当前位置 ${schedulerState.position}` } : {}),
              ...(running ? { status: "in_progress", status_detail: "项目主 Agent 已取得会话队列和源码工作区执行权" } : {}),
            });
            const latestExperience = taskExperience();
            if (queued || running) {
              const text = queued
                ? `项目任务正在排队，当前位置 ${schedulerState.position}`
                : "项目主 Agent 已开始执行当前任务";
              persistTaskMessage(text, latestExperience);
              send({ type: "status", text, agent: "project-main-agent", scheduler_state: schedulerState });
              send({ type: "task_runtime", message_id: taskMessageId, run: publicProjectChatRun(projectRun), taskExperience: latestExperience });
            }
          },
          operation: () => executeProjectMainTask({
          task,
          plan,
          confirmed: !!existingTask || !plan.requiresConfirmation,
          verificationCommands: Array.isArray(loadProjectConfigs()?.[project]?.verification_commands)
            ? loadProjectConfigs()[project].verification_commands
            : [],
          onEvent: (event) => {
            const label: Record<string, string> = {
              planning: "项目主 Agent 已完成任务规划",
              work_item: event.status === "running" ? `开发 Agent 正在执行：${event.work_item?.title || "工作项"}` : `开发 Agent 已提交：${event.work_item?.title || "工作项"}`,
              testing: event.status === "running" ? `TestAgent 正在执行第 ${event.round || 1} 轮验收` : event.status === "passed" ? "TestAgent 验收通过" : "TestAgent 发现验收缺口",
              reworking: event.status === "running" ? "项目主 Agent 已安排原开发 Agent 返工" : "返工结果已提交，准备重新验收",
              accepting: event.status === "running" ? "项目主 Agent 正在完成最终验收" : "项目主 Agent 已完成最终验收",
              blocked: event.summary || "任务存在阻塞",
            };
            const text = label[event.type] || event.summary || "项目主 Agent 正在推进任务";
            const latestExperience = taskExperience();
            persistTaskMessage(text, latestExperience);
            send(event);
            send({ type: "status", text, agent: event.type === "testing" ? "test-agent" : "project-main-agent" });
            const workEvent = { id: `pma_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, time: new Date().toISOString(), kind: event.status === "failed" || event.status === "blocked" ? "error" : event.status === "completed" || event.status === "passed" ? "done" : "status", agent: event.type === "testing" ? "TestAgent" : "项目主 Agent", text, phase: event.type, data: event };
            projectRun.workEvents = [...(projectRun.workEvents || []), workEvent].slice(-80);
            projectRun.updated_at = new Date().toISOString();
            saveProjectChatRuns();
            send({ type: "work_event", event: workEvent });
            send({ type: "task_runtime", message_id: taskMessageId, run: publicProjectChatRun(projectRun), taskExperience: latestExperience });
          },
          onDelta: delta => {
            if (!delta) return;
            finalSummaryStreamed = true;
            send({ type: "chunk", text: delta, agent: "project-main-agent" });
          },
          executeWorker: async (workItem, round, reworkProblems) => {
            let doneState: any = null;
            const workerPrompt = [
              toolContext.prompt,
              projectKnowledge.context,
              projectSessionContext,
              buildProjectExecutionBrief(project, workItem.objective, {
                workDir,
                query: finalMessage,
                verificationHints: Array.isArray(loadProjectConfigs()?.[project]?.verification_commands) ? loadProjectConfigs()[project].verification_commands : [],
                memoryDeliveryMode: memoryMcpEnabled ? "mcp" : "prompt",
                memorySnapshotId: projectMemoryMcp?.snapshot?.id || "",
              }),
              `你是当前项目唯一的开发 Agent。项目主 Agent 分配给你的工作项如下：\n标题：${workItem.title}\n目标：${workItem.objective}\n验收标准：${workItem.acceptanceCriteria.join("；") || plan.acceptanceCriteria.join("；")}\n${reworkProblems.length ? `这是第 ${round} 轮返工，必须逐项解决 TestAgent 的真实失败证据：\n${reworkProblems.join("\n")}` : ""}\n请实际完成工作、运行适用验证，并在结尾准确列出变更文件、执行过的验证和仍存在的阻塞。不得自行宣布主任务最终验收通过。`,
            ].filter(Boolean).join("\n\n");
            if (memoryMcpEnabled) {
              const bootstrapTokens = estimateTextTokens(workerPrompt);
              const maxBootstrapTokens = Math.max(1_000, Number(projectMemoryMcp?.snapshot?.maxBootstrapTokens || 32_000));
              if (bootstrapTokens >= maxBootstrapTokens) {
                throw new Error(`项目子 Agent Bootstrap 超过独立 Token 门禁：${bootstrapTokens}/${maxBootstrapTokens}`);
              }
              projectMemoryMcp.bootstrapTokens = bootstrapTokens;
              projectMemoryMcp.maxBootstrapTokens = maxBootstrapTokens;
            }
            const output = await callAgent(project, workerPrompt, workDir, agentType, 300000, {
              background: true,
              taskId: task.id,
              executionId: `${task.id}:${workItem.id}:attempt:${workItem.attempts}`,
              projectSessionId: exactProjectSessionId,
              role: "project-child-agent",
              source: "project-main-agent",
              title: workItem.title,
              allowedTools: toolContext.allowedTools,
              mcpConfigPath: toolContext.audit.mcpConfigPath,
              runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
              runtimeToolDispatchGate: toolContext.dispatchGate,
              agentSession: activeAgentSessionOptions,
              taskAgentSessionId: activeTaskAgentSession.id,
              memoryContextConsumptionReceiptRequired: firstMemoryReceiptRequired,
              memoryContextConsumptionChallenge: firstMemoryReceiptRequired ? projectMemoryMcp?.challenge || null : null,
              onDone: (state: any) => { doneState = state; },
            });
            firstMemoryReceiptRequired = false;
            activeTaskAgentSession = recordTaskAgentSessionTurn(activeTaskAgentSession.id, {
              nativeSessionId: doneState?.nativeSessionId || "",
              nativeContinuationEvidence: doneState?.nativeContinuationEvidence || null,
              success: doneState?.isError !== true,
              error: doneState?.error || "",
              runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
            }) || activeTaskAgentSession;
            activeAgentSessionOptions = getTaskAgentSessionOptions(activeTaskAgentSession);
            const result = {
              success: doneState?.isError !== true && !/^\[[^\]]+\]\s*Agent (?:Runner )?错误:/i.test(String(output || "")),
              output: String(output || ""),
              fileChanges: doneState?.fileChanges || { count: 0, files: [] },
              nativeSessionId: doneState?.nativeSessionId || "",
              sessionId: activeTaskAgentSession.id,
              usage: doneState?.usage || null,
              error: doneState?.error || "",
            };
            workerResults.push(result);
            return result;
          },
        }),
        });
        if (execution.status === "completed") {
          try {
            const memory = updateProjectMemoryFromReceipt({
              project,
              workDir,
              taskId: task.id,
              agent: project,
              accepted: true,
              sourceKind: "accepted_project_main_agent_delivery",
              contextSourceIdentity: {
                agentKind: "project",
                scope: "project",
                scopeId: project,
                exactSessionId: String(projectRun.project_session_id || projectRun.session_id || projectRun.id),
                generation: Math.max(0, Number(projectRun.project_session_generation || projectRun.generation || 0)),
              },
              actualFiles: execution.fileChanges?.files || [],
              receipt: {
                status: "done",
                summary: execution.summary,
                actions: plan.workItems.map((item: any) => item.title),
                filesChanged: (execution.fileChanges?.files || []).map((item: any) => item.path || item.file || item).filter(Boolean),
                verification: execution.verification,
                blockers: [],
                needs: execution.risks,
              },
            });
            projectRun.memory_admission = memory.lastMemoryAdmission || null;
          } catch (error: any) {
            projectRun.memory_admission = { decision: "rejected", error: String(error?.message || error) };
          }
        }
        projectRun.status = execution.status === "completed" ? "done" : execution.status;
        projectRun.fileChanges = execution.fileChanges;
        projectRun.acceptance_state = execution.task?.acceptance_state || execution.status;
        projectRun.test_agent_review = execution.testAgent || null;
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        if (execution.summary && !finalSummaryStreamed) send({ type: "chunk", text: execution.summary, agent: "project-main-agent" });
        const latestTaskExperience = taskExperience();
        persistTaskMessage(execution.summary, latestTaskExperience);
        if (execution.status === "failed") {
          send({ type: "error", message_id: taskMessageId, text: execution.summary, message_mode: "task", run: publicProjectChatRun(projectRun), fileChanges: execution.fileChanges, taskExperience: latestTaskExperience });
        } else {
          send({
            type: "done",
            message_id: taskMessageId,
            message_mode: "task",
            run: publicProjectChatRun(projectRun),
            fileChanges: execution.fileChanges,
            workEvents: projectRun.workEvents || [],
            taskExperience: latestTaskExperience,
            provider_usage: workerResults.map(result => result.usage).filter(Boolean).slice(-1)[0] || null,
          });
        }
        clearInterval(heartbeat);
        if (feishuTask) {
          await notifyFeishuTaskStage({
            stage: execution.status === "completed" ? "completion" : "failure",
            title: execution.status === "completed" ? `${projectDisplayName(project)} · 项目任务完成` : `${projectDisplayName(project)} · 项目任务未完成`,
            markdown: execution.summary || (execution.status === "completed" ? "项目任务已经通过项目主 Agent 验收。" : "项目任务执行失败或仍有阻塞。"),
            dedupeKey: `project-main:${task.id}:${execution.status}`,
            runId: projectRun.id,
            taskId: task.id,
            sessionId: exactProjectSessionId,
            forceNewMessage: true,
          });
          retainDispatchAfterResponse = false;
          releaseDispatch();
        } else {
          releaseDispatch();
          res.end();
        }
      } catch (error) {
        const messageText = String((error as any)?.message || error || "项目主 Agent 执行失败");
        if (source === "feishu" && retainDispatchAfterResponse) {
          try {
            await notifyFeishuTaskStage({
              stage: "failure",
              title: `${projectDisplayName(project)} · 项目任务异常`,
              markdown: `项目主 Agent 后台执行没有完成：${messageText}`,
              dedupeKey: `project-main-background-failure:${project}:${exactProjectSessionId}:${parentRunId || finalMessage.slice(0, 80)}`,
              sessionId: exactProjectSessionId,
              forceNewMessage: true,
            });
          } catch {}
          retainDispatchAfterResponse = false;
          releaseDispatch();
          return;
        }
        releaseDispatch();
        throw error;
      }
    };

    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(({ files, fields }) => {
        try {
          void handleStreamSend(
            (fields as any).project,
            (fields as any).message,
            files,
            String((fields as any).parent_run_id || (fields as any).parentRunId || ""),
            String((fields as any).session_id || (fields as any).sessionId || ""),
            String((fields as any).source || "web"),
            {},
            String((fields as any).client_message_id || (fields as any).clientMessageId || ""),
            String((fields as any).assistant_message_id || (fields as any).assistantMessageId || ""),
            (fields as any).clarification_payload ? JSON.parse(String((fields as any).clarification_payload)) : null,
            [],
            [],
            String((fields as any).conversation_turn_id || ""),
            String((fields as any).resolved_route || ""),
            String((fields as any).resolved_candidate_task_id || ""),
          );
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, message, files, attachments, cc_connect_attachment_refs, parent_run_id, parentRunId, session_id, sessionId, source, platform_context, platformContext, client_message_id, clientMessageId, assistant_message_id, assistantMessageId, clarification_payload, clarificationPayload, conversation_turn_id, resolved_route, resolved_candidate_task_id } = JSON.parse(body);
        void handleStreamSend(
          project,
          message,
          Array.isArray(files) ? files : [],
          String(parent_run_id || parentRunId || ""),
          String(session_id || sessionId || ""),
          String(source || "web"),
          platform_context || platformContext || {},
          String(client_message_id || clientMessageId || ""),
          String(assistant_message_id || assistantMessageId || ""),
          clarification_payload || clarificationPayload || null,
          Array.isArray(cc_connect_attachment_refs) ? cc_connect_attachment_refs : [],
          Array.isArray(attachments) ? attachments : [],
          String(conversation_turn_id || ""),
          String(resolved_route || ""),
          String(resolved_candidate_task_id || ""),
        );
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return;
  }

  // === 发送消息给 Agent（非流式）===
  if (pathname === "/api/send" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";

    const handleSend = async (project: string, message: string, files: any[] | null) => {
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      if (!workDir) return sendJson(res, { error: "无法获取项目目录" }, 400);

      let fullMessage = message || "";
      if (files && files.length > 0) {
        const filesContext = buildUploadedFilesContext(files, "本次消息附件");
        fullMessage = fullMessage ? `${fullMessage}${filesContext}` : `请处理以下附件：${filesContext}`;
      }
      if (!fullMessage) return sendJson(res, { error: "消息不能为空" }, 400);

      const configuredAgentType = info[0]?.agent || "claudecode";
      const resolvedRuntime = resolveAvailableAgentRuntime(configuredAgentType);
      const agentType = resolvedRuntime.selected;
      const toolContext = buildProjectToolContext(project, workDir, agentType);
      if (toolContext.dispatchGate?.dispatchReady === false) return sendRuntimeToolDispatchBlocked(res, toolContext);
      let projectKnowledge: any = { context: "" };
      try {
        projectKnowledge = await searchAgentKnowledge(fullMessage, { role: "project-agent", project }, { limit: 6, maxContextChars: 18000 });
      } catch (error: any) {
        console.warn(`[项目知识检索] ${project} 已使用无知识上下文继续：${error?.message || error}`);
      }
      const promptWithTools = [toolContext.prompt, projectKnowledge.context, fullMessage].filter(Boolean).join("\n\n");

      try {
        const output = await callAgent(project, promptWithTools, workDir, agentType, 120000, {
          tab: "projects",
          project,
          allowedTools: toolContext.allowedTools,
          mcpConfigPath: toolContext.audit.mcpConfigPath,
          runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
          runtimeToolDispatchGate: toolContext.dispatchGate,
        });
        sendJson(res, { success: true, output });
      } catch (e: any) {
        sendJson(res, { error: e.stdout || e.stderr || e.message || "发送失败" }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(async ({ files, fields }) => {
        try {
          await handleSend((fields as any).project, (fields as any).message, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { project, message } = JSON.parse(body);
        await handleSend(project, message, null);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return;
  }

  // 4. API 子模块分流拦截
  if (handleProjectsApi(pathname, req, res, parsed, projectsCtx)) return;
  if (handleConversationSearchApi(pathname, req, res, parsed)) return;
  if (handleSessionsApi(pathname, req, res, parsed)) return;
  if (handleGitApi(pathname, req, res, parsed)) return;
  if (handleMarketplaceApi(pathname, req, res, parsed)) return;
  if (pathname.startsWith("/api/templates")) {
    sendJson(res, { success: false, error: "对话模板功能已移除，请使用 Skill、斜杠命令或共享文件", code: "TEMPLATE_FEATURE_REMOVED" }, 410);
    return;
  }
  if (handleTaskTemplateApi(pathname, req, res)) return;
  if (handleTaskPreflightApi(pathname, req, res)) return;
  if (handleCronApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleSharedFilesV2Api(pathname, req, res, parsed)) return;
  if (handleToolsAndMetricsApi(pathname, req, res, parsed)) return;
  if (handlePetsApi(pathname, req, res, parsed, petsCtx)) return;
  if (handleMusicApi(pathname, req, res, parsed, musicCtx)) return;
  if (handleTaskPermissionRoutes(pathname, req, res, parsed, collabCtx)) return;
  if (handleAutomationSessionBindingsApi(pathname, req, res, parsed)) return;
  if (handleCollaborationApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleGlobalAgentApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleRagApi(pathname, req, res, parsed)) return;
  if (handleSlashCommandConversationApi(pathname, req, res, parsed)) return;
  if (handleSlashCommandsApi(pathname, req, res, parsed)) return;
  if (handleNavigationConfigApi(pathname, req, res)) return;
  if (handleUsabilityApi(pathname, req, res, parsed, {
    ctx: collabCtx,
    archiveTask,
    continueTaskWithMessage,
    enqueueTask,
    removeTaskFromQueues,
    retryTask,
  })) return;
  if (handleSystemSettingsApi(pathname, req, res)) return;
  const { handleMemoryCenterApi } = require("./modules/knowledge/memory-control-center");
  if (handleMemoryCenterApi(pathname, req, res, parsed)) return;

  // 404 fallback
  sendJson(res, { error: "Not Found" }, 404);
}

// === 启动服务器 ===
function bootstrapServerRuntime(startupCollabCtx: any, port: number) {
  initializeBuiltInSessionCompactionHooks();
  return runServerBootstrap(startupCollabCtx, port, {
    CCM_DIR,
    CONFIGS_DIR,
    bootstrapGlobalAgentMemoryForServer,
    bootstrapGroupSessionLifecycleJournals,
    conversationTurnControl,
    ensureRoleSkillsInstalled,
    listTaskAgentInvocationEdges,
    listTaskAgentSessions,
    loadFeishuConfig,
    migrateConfigDirectory,
    migrateTomlCredentials,
    path,
    reconcileGroupSessionLifecycleAgentCancellations,
    reconcileMemoryContextConsumptionReceipts,
    reconcileMemoryContextConsumptionRecoveries,
    reconcileInterruptedProjectMainTasks,
    reconcileTaskAgentContinuationSoak,
    reconcileTaskAgentInvocationRecovery,
    recoverChildTypedMemoryDispatchWal,
    recoverGroupTypedMemoryArtifactTransactionsFleet,
    refreshEnvPath,
    resumeSoakTest,
    resumeTaskQueues,
    saveFeishuConfig,
    startAgentRecoveryMonitor,
    startCronScheduler,
    startGlobalMissionSupervisionForServer,
    startGroupSessionRetentionMaintenanceScheduler,
    startReliabilityDrillScheduler,
    startTaskWatchdog,
    startUsabilityArchiveScheduler,
    toolManager
  });
}

function normalizeListenHost(value: any) {
  let host = String(value || "127.0.0.1").trim().replace(/^\[|\]$/g, "");
  if (host === "*") host = "0.0.0.0";
  if (!host || host.length > 253 || !/^[a-zA-Z0-9._:-]+$/.test(host)) throw new Error(`监听地址无效：${value}`);
  return host;
}

function formatHostUrl(host: string, port: number) {
  return `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
}

function networkAccessUrls(host: string, port: number) {
  if (!["0.0.0.0", "::"].includes(host)) {
    return ["127.0.0.1", "localhost", "::1"].includes(host) ? [] : [formatHostUrl(host, port)];
  }
  const addresses = new Set<string>();
  for (const rows of Object.values(os.networkInterfaces())) {
    for (const row of rows || []) {
      if (!row.internal && row.family === "IPv4") addresses.add(formatHostUrl(row.address, port));
    }
  }
  return [...addresses];
}

function startServer(port: number, host = process.env.CCM_HOST || "127.0.0.1") {
  PORT = port;
  LISTEN_HOST = normalizeListenHost(host);
  SERVICE_LIFECYCLE_STATE = "starting";
  const instanceLock = acquireCcmServerInstanceLock(port, LISTEN_HOST, {
    publicOrigin: process.env.CCM_PUBLIC_ORIGIN || "",
    launchMode: ["foreground", "background"].includes(String(process.env.CCM_LAUNCH_MODE || ""))
      ? process.env.CCM_LAUNCH_MODE as "foreground" | "background"
      : "unknown",
    packageVersion: CCM_RUNTIME_VERSION,
    bootId: getProcessBootId(),
  });
  cleanupStaleGitMutationLeases();
  cleanupStaleProjectCloneArtifacts();
  registerContextEngineRecoveryHook();
  const startupCollabCtx = createCollabCtx();
  const server = http.createServer(handleRequest);
  let managedShutdownInProgress = false;
  server.on("error", () => {
    SERVICE_LIFECYCLE_STATE = "failed";
    releaseCcmServerInstanceLock(instanceLock);
  });
  server.on("close", () => {
    SERVICE_LIFECYCLE_STATE = "stopped";
    stopFeishuChannelSupervisorForServer();
    stopControlBotConnection();
    if (!managedShutdownInProgress) {
      void stopManagedProjectRuntimesForShutdown();
      void stopAllTerminalRuns();
    }
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    stopGlobalMissionSupervisionForServer();
    stopGlobalWebTurnRecoveryForServer();
    stopFeishuConversationTurnRecoveryForServer();
    stopProjectFeishuTurnRecoveryForServer();
    stopWebConversationTurnRecoveryForServer();
    stopReliabilityDrillScheduler();
    stopStorageIndexScheduler();
    stopConversationSearchIndexScheduler();
    stopUsabilityArchiveScheduler();
    stopGroupSessionRetentionMaintenanceScheduler();
    stopModelCapabilityRefreshScheduler();
    stopRuntimeToolRealCliMatrixScheduler();
    stopTaskPermissionNotificationScheduler();
    stopAgentCommunicationWatchdog();
    petAgentMilestoneProjector.stop();
    shutdownSoakMonitor();
    if (!managedShutdownInProgress) {
      closeSqliteTaskStore();
      releaseCcmServerInstanceLock(instanceLock);
    }
  });
  server.listen(port, LISTEN_HOST, () => {
    // Port ownership and the data-directory lock are the fail-closed singleton
    // gates. No mutable startup work may run before both have succeeded.
    SERVICE_LIFECYCLE_STATE = "ready";
    try {
      const marketplaceRecovery = recoverMarketplaceProductionState();
      if (marketplaceRecovery.quarantined || marketplaceRecovery.recoveredTransactions) {
        console.log(`[工具市场] 隔离旧外部工具 ${marketplaceRecovery.quarantined} 个，恢复待处理事务 ${marketplaceRecovery.recoveredTransactions} 个`);
      }
    } catch (error: any) {
      console.warn(`[工具市场] 启动恢复失败：${error?.message || error}`);
    }
    bootstrapServerRuntime(startupCollabCtx, port);
    setFeishuChannelAlertHandler(payload => {
      startupCollabCtx.broadcastPetSpeech?.("global-agent", { role: payload.role, text: payload.text, final: true, source: payload.source });
    });
    startTaskPermissionNotificationScheduler(startupCollabCtx);
    startAgentCommunicationWatchdog({
      onSafeRetry: outcome => {
        const reason = `Agent Communication ${outcome.toState}，确认无副作用后自动重试`;
        try {
          performAgentCommunicationAction(outcome.messageId, "retry", { reason, actor: "agent-communication-watchdog" });
          requestTaskCancellation(outcome.taskId, reason, "agent-communication-watchdog");
        } catch (error: any) {
          console.warn(`[Agent Communication] 自动重试准备失败：${error?.message || error}`);
          return;
        }
        const deadline = Date.now() + 60_000;
        const retryAfterRunnerStops = () => {
          const result: any = retryTask(outcome.taskId, startupCollabCtx, reason, true);
          if (result?.success) return;
          if (Date.now() < deadline && [409, 429].includes(Number(result?.status || 0))) {
            const timer = setTimeout(retryAfterRunnerStops, 2_000);
            timer.unref?.();
            return;
          }
          try {
            performAgentCommunicationAction(outcome.messageId, "takeover", {
              reason: `自动重试未能在60秒内安全重新入队：${String(result?.error || "unknown").slice(0, 300)}`,
              actor: "agent-communication-watchdog",
            });
          } catch {}
        };
        const timer = setTimeout(retryAfterRunnerStops, 250);
        timer.unref?.();
      },
    });
    const petAutoStart = maybeAutoStartPet(port);
    if (!petAutoStart.success) {
      console.warn(`[桌面宠物] 自动启动失败：${"error" in petAutoStart ? petAutoStart.error || "未知错误" : "未知错误"}`);
    }
    startModelCapabilityRefreshScheduler();
    startRuntimeToolRealCliMatrixScheduler();
    recoverCleanupTransactions();
    startStorageIndexScheduler();
    startConversationSearchIndexScheduler();
    // 预热提供商状态缓存：让首个请求也走缓存路径，避免同步 spawnSync 探测冻结事件循环
    void refreshAgentProviderStatusesAsync().catch(() => {});
    const localEmbeddingStartup = scheduleLocalKnowledgeModelStartupPreparation();
    if (localEmbeddingStartup.scheduled) console.log("[知识库] 本地语义模型将在后台下载或校验，不阻塞 CCM 启动");
    console.log("");
    console.log(`CCM Workspace  v${CCM_RUNTIME_VERSION}`);
    console.log("------------------------------------------------------");
    console.log(`Local URL   http://localhost:${port}`);
    console.log(`Listen      ${LISTEN_HOST}:${port}`);
    for (const accessUrl of networkAccessUrls(LISTEN_HOST, port)) console.log(`Network URL ${accessUrl}`);
    console.log(`Data        ${CCM_DIR}`);
    console.log(`Runtime     ${networkAccessUrls(LISTEN_HOST, port).length ? "remote access enabled; login required" : "local authenticated workspace"}`);
    console.log("Stop        Ctrl+C");
    console.log("");
    void resumeGlobalAgentLoopsForServer(startupCollabCtx, port)
      .then(result => {
        if (result.total > 0) console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`);
      })
      .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`))
      .finally(() => {
        startGlobalWebTurnRecoveryForServer(`http://127.0.0.1:${port}`, startupCollabCtx);
        startFeishuConversationTurnRecoveryForServer(`http://127.0.0.1:${port}`, startupCollabCtx);
      });
    startProjectFeishuTurnRecoveryForServer(`http://127.0.0.1:${port}`);
    reconcileTaskDispatchTurns();
    startWebConversationTurnRecoveryForServer(`http://127.0.0.1:${port}`);
    try {
      const feishuConfig = loadFeishuConfig();
      const hasControlBotCredentials = !!((feishuConfig.control_bot_app_id || feishuConfig.app_id) && (feishuConfig.control_bot_app_secret || feishuConfig.app_secret));
      if (feishuConfig.control_bot_enabled === true && hasControlBotCredentials) {
        const result = startControlBotConnection(port);
        console.log(`[飞书控制机器人] ${result.message || "长连接已启动"}${result.pid ? ` (PID: ${result.pid})` : ""}`);
      }
    } catch (error: any) {
      console.warn(`[飞书控制机器人] 自动启动失败：${error?.message || error}`);
    }
    void reconcileProjectFeishuConnections(port).then(projectChannelResults => {
      const recycledProjectChannels = projectChannelResults.filter((item: any) => item.recycled).length;
      const failedProjectChannels = projectChannelResults.filter((item: any) => item.success === false);
      if (recycledProjectChannels > 0) console.log(`[项目飞书通道] 已更新并重连 ${recycledProjectChannels} 个旧运行实例`);
      for (const item of failedProjectChannels) console.warn(`[项目飞书通道] ${item.project} 协调失败：${item.error}`);
    }).catch(error => console.warn(`[项目飞书通道] 启动协调失败：${error?.message || error}`));
    startFeishuChannelSupervisorForServer(port);
  });
  process.once("exit", () => releaseCcmServerInstanceLock(instanceLock));
  (server as any).beginManagedShutdown = () => { managedShutdownInProgress = true; };
  (server as any).finalizeManagedShutdown = () => {
    SERVICE_LIFECYCLE_STATE = "stopped";
    releaseCcmServerInstanceLock(instanceLock);
  };
  return server;
}


if (require.main === module) {
  PORT = parseInt(process.argv[2]) || 3080;
  LISTEN_HOST = normalizeListenHost(process.argv[3] || process.env.CCM_HOST || "127.0.0.1");
  const server = startServer(PORT, LISTEN_HOST);
  let lifecycleHeartbeat: NodeJS.Timeout | null = null;
  server.prependOnceListener("listening", () => {
    initializeProcessLifecycle();
    lifecycleHeartbeat = setInterval(() => touchProcessLifecycle(), 30_000);
    lifecycleHeartbeat.unref?.();
  });
  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    SERVICE_LIFECYCLE_STATE = "draining";
    (server as any).beginManagedShutdown?.();
    if (lifecycleHeartbeat) clearInterval(lifecycleHeartbeat);
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    stopGlobalMissionSupervisionForServer();
    stopGlobalWebTurnRecoveryForServer();
    stopFeishuConversationTurnRecoveryForServer();
    stopProjectFeishuTurnRecoveryForServer();
    stopWebConversationTurnRecoveryForServer();
    stopReliabilityDrillScheduler();
    stopStorageIndexScheduler();
    stopConversationSearchIndexScheduler();
    stopUsabilityArchiveScheduler();
    stopGroupSessionRetentionMaintenanceScheduler();
    stopModelCapabilityRefreshScheduler();
    stopRuntimeToolRealCliMatrixScheduler();
    stopTaskPermissionNotificationScheduler();
    stopAgentCommunicationWatchdog();
    petAgentMilestoneProjector.stop();
    stopFeishuChannelSupervisorForServer();
    stopControlBotConnection();
    const forceExit = setTimeout(() => process.exit(1), 15_000);
    forceExit.unref?.();
    const closed = new Promise<void>(resolve => server.close(() => resolve()));
    await Promise.all([
      stopManagedProjectRuntimesForShutdown().catch(error => console.warn(`[项目运行] 受控退出停止失败：${error?.message || error}`)),
      stopAllTerminalRuns().catch(error => console.warn(`[终端] 受控退出停止失败：${error?.message || error}`)),
    ]);
    await Promise.race([closed, new Promise<void>(resolve => setTimeout(resolve, 8_000))]);
    markProcessShutdown({
      category: exitCode === 0 ? "system_shutdown" : "unexpected_crash",
      reason: `收到 ${signal}，受控排空完成`,
      signal,
      exit_code: exitCode,
    });
    closeSqliteTaskStore();
    (server as any).finalizeManagedShutdown?.();
    clearTimeout(forceExit);
    process.exit(exitCode);
  };
  REQUEST_SERVICE_DRAIN = reason => { void shutdown(reason || "internal_drain"); };
  installProcessLifecycleFaultHandlers((_reason, type) => { void shutdown(type, 1); });
  server.once("error", (error: any) => {
    SERVICE_LIFECYCLE_STATE = "failed";
    console.error(`[CCM] 服务监听失败：${error?.code || error?.message || error}`);
    process.exitCode = 1;
    setImmediate(() => process.exit(1));
  });
  process.once("SIGINT", () => { void shutdown("SIGINT"); });
  process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.once("exit", code => markProcessShutdown({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}

module.exports = { startServer };



