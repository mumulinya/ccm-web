#!/usr/bin/env node
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";
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
import {
  appendDirectAgentDispatchTranscript,
  completeDirectAgentDispatch,
  createDirectAgentDispatchRequest,
  markDirectAgentDispatchStarted,
} from "./agents/direct-dispatch-spool";
import {
  conversationTurnControl,
  handleConversationTurnControlApi,
  runConversationTurnControlSelfTest,
} from "./agents/conversation-turn-control";
import { parseSecureMultipartRequest } from "./system/secure-multipart";

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
import { acquireCcmServerInstanceLock, releaseCcmServerInstanceLock } from "./core/server-instance-lock";
import { closeSqliteTaskStore } from "./core/task-store";
import { registerContextEngineRecoveryHook } from "./system/context-engine-recovery";
import {
  canonicalWorkspaceMutationLane,
  scheduleUnifiedTaskOperation,
} from "./system/unified-task-scheduler";

// 导入子模块控制器
import { handleProjectsApi, reconcileProjectFeishuConnections, startControlBotConnection, startFeishuChannelSupervisorForServer, stopControlBotConnection, stopFeishuChannelSupervisorForServer } from "./modules/projects/projects";
import { classifyProjectChatIntentWithModel } from "./modules/projects/project-chat-intent";
import {
  answerAsProjectMainAgent,
  cancelProjectMainTask,
  confirmProjectMainTask,
  createProjectMainTask,
  executeProjectMainTask,
  getProjectMainTask,
  planProjectMainTask,
  projectMainTaskPublic,
  reconcileInterruptedProjectMainTasks,
  reviseProjectMainTask,
} from "./modules/projects/project-main-agent";
import {
  appendProjectSessionTaskMessage,
  handleSessionsApi,
  scheduleProjectSessionAutoTitle,
  getSessionDetail,
  getSessions,
  syncSessions,
  upsertProjectSessionTaskMessage,
} from "./modules/projects/sessions";
import { handleConversationSearchApi } from "./modules/search/conversation-search";
import { handleGitApi } from "./modules/tools/git";
import { handleMarketplaceApi } from "./modules/tools/marketplace";
import { handleTemplatesApi } from "./modules/templates/templates";
import { handleCronApi, startCronScheduler, stopCronScheduler, syncCronTaskStatus } from "./modules/scheduling/cron";
import { handleToolsAndMetricsApi } from "./modules/tools/tools";
import { stopAllTerminalRuns } from "./modules/tools/terminal";
import { projectDisplayName, stopManagedProjectRuntimesForShutdown } from "./modules/projects/project-runtime";
import { handlePetsApi } from "./modules/pets/pets";
import { GlobalPetActivityCoordinator } from "./modules/pets/pet-activity-coordinator";
import { handleMusicApi } from "./modules/music/music";
import { handleCollaborationApi, resumeTaskQueues, startAgentRecoveryMonitor, startTaskWatchdog, stopAgentRecoveryMonitor, stopTaskWatchdog } from "./modules/collaboration/collaboration";
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
import { initializeProcessLifecycle, installProcessLifecycleFaultHandlers, markProcessShutdown, touchProcessLifecycle } from "./system/process-lifecycle";
import { handleRuntimeEventsApi } from "./system/runtime-events";
import { initializeBuiltInSessionCompactionHooks } from "./system/session-compaction-hooks";
import { estimateTextTokens } from "./system/context-budget";
import { bootstrapGlobalAgentMemoryForServer, handleGlobalAgentApi, resumeGlobalAgentLoopsForServer, startFeishuConversationTurnRecoveryForServer, startGlobalMissionSupervisionForServer, startGlobalWebTurnRecoveryForServer, stopFeishuConversationTurnRecoveryForServer, stopGlobalMissionSupervisionForServer, stopGlobalWebTurnRecoveryForServer } from "./modules/global/global-agent";
import { handleRagApi } from "./modules/knowledge/rag";
import { scheduleLocalKnowledgeModelStartupPreparation } from "./modules/knowledge/knowledge-model-startup";
import { ingestRequirementSources } from "./modules/requirements/source-ingestion";
import { searchAgentKnowledge } from "./modules/knowledge/knowledge-access";
import { handleSlashCommandsApi } from "./modules/tools/slash-commands";
import { migrateConfigDirectory, migrateTomlCredentials } from "./core/credential-store";
import { handleFeishuReactionFeedbackApi } from "./integrations/feishu-reaction-feedback";
import { handleUsabilityApi, startUsabilityArchiveScheduler, stopUsabilityArchiveScheduler } from "./modules/system/usability";
import { handleSystemSettingsApi } from "./modules/system/settings";
import { refreshAgentProviderStatusesAsync } from "./modules/system/agent-provider-settings";
import { handleLocalAuthApi } from "./modules/system/local-auth";
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
  getCleanupSummary,
  previewCleanupAction,
  runCleanupAction,
} from "./system/cleanup-center";


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
import { createAgentRunnerRuntime } from "./server-agent-runner";
import { sendFile } from "./server-static";
import { bootstrapServerRuntime as runServerBootstrap } from "./server-bootstrap";

// === 运行时内存状态与心跳推送 ===
let PORT = 3080;
let LISTEN_HOST = "127.0.0.1";
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
  url
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-CCM-CSRF");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (handleLocalAuthApi(pathname, req, res)) return;
  if (pathname.startsWith("/api/") && !authorizeApiRequest(req, res, String(req.url || pathname))) return;

  if (handleFeishuReactionFeedbackApi(pathname, req, res)) return;

  if (handleRuntimeEventsApi(pathname, req, res, parsed)) return;

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
        });
        sendJson(res, result, result.success === false ? 400 : 200);
      } catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
    });
    return;
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
    const handleStreamSend = async (project: string, message: string, files: any[] = [], parentRunId = "", projectSessionId = "", source = "web", platformContext: any = {}) => {
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
      let sourceIngestion: any = null;
      try {
        sourceIngestion = await ingestRequirementSources({
          files: Array.isArray(files) ? files : [],
          userText: message || "",
          extractRequirement: false,
          decomposeRequirement: false,
        });
      } catch (error: any) {
        console.warn(`[项目资料读取] ${project || "unknown"} 统一解析失败：${error?.message || error}`);
      }
      const sourceContext = String(sourceIngestion?.agent_context || "");
      const fallbackFileContext = !sourceContext && files && files.length > 0
        ? buildUploadedFilesContext(files, "本次消息附件")
        : "";
      const finalMessage = `${message || ""}${sourceContext || fallbackFileContext}`;
      if (!project || !finalMessage.trim()) return sendJson(res, { error: "参数不足" }, 400);
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      const exactProjectSessionId = String(projectSessionId || "").trim();
      if (exactProjectSessionId && !getSessionDetail(project, exactProjectSessionId)) {
        return sendJson(res, { error: "项目会话不存在" }, 404);
      }
      let projectFeishuDestination: any = null;
      let projectFeishuOriginReceipt: any = null;
      const enqueueCurrentProjectFeishuTurn = () => {
        const requestId = String(projectFeishuEnvelope?.message_id || projectFeishuEnvelope?.checksum || platformContext?.platform_message_id || "").trim();
        const queued = enqueueProjectFeishuTurn({
          project,
          projectSessionId: exactProjectSessionId,
          message,
          files,
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
      const parentProjectMainTask = parentRunId ? getProjectMainTask(String(parentRunId)) : null;
      if (exactProjectSessionId && parentRunId) {
        const parentRun = projectChatRuns.get(String(parentRunId));
        if (!parentRun && !parentProjectMainTask) return sendJson(res, { error: "续跑来源不存在" }, 404);
        const parentProject = String(parentRun?.project || parentProjectMainTask?.target_project || "");
        const parentSession = String(parentRun?.project_session_id || parentProjectMainTask?.project_session_id || "");
        if (parentProject !== project || parentSession !== exactProjectSessionId) {
          return sendJson(res, { error: "续跑来源不属于当前项目会话" }, 409);
        }
      }
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      const configuredAgentType = info[0]?.agent || "claudecode";
      const resolvedRuntime = resolveAvailableAgentRuntime(configuredAgentType);
      const agentType = resolvedRuntime.selected;
      if (exactProjectSessionId) syncSessions(project);
      let projectKnowledge: any = { context: "", citations: [], embeddingMode: "hashing", fallback: true };
      try {
        projectKnowledge = await searchAgentKnowledge(finalMessage, { role: "project-agent", project }, { limit: 6, maxContextChars: 18000 });
      } catch (error: any) {
        console.warn(`[项目知识检索] ${project} 已使用无知识上下文继续：${error?.message || error}`);
      }
      if (exactProjectSessionId) {
        const knowledgeToolCallId = `knowledge_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
        appendProjectSessionExecutionEvent(project, exactProjectSessionId, {
          type: "tool_use",
          toolName: "query_knowledge",
          toolCallId: knowledgeToolCallId,
          runId: `project-main:${exactProjectSessionId}`,
          arguments: { query_checksum: projectKnowledge.scopeChecksum || "", limit: 6 },
        });
        appendProjectSessionExecutionEvent(project, exactProjectSessionId, {
          type: "tool_result",
          toolName: "query_knowledge",
          toolCallId: knowledgeToolCallId,
          runId: `project-main:${exactProjectSessionId}`,
          status: projectKnowledge.embeddingError && !projectKnowledge.results?.length ? "error" : "ok",
          observation: {
            context: projectKnowledge.context || "",
            citations: projectKnowledge.citations || [],
            retrieval_mode: projectKnowledge.embeddingMode || "lexical",
            fallback_reason: projectKnowledge.fallbackReason || "",
            index_generation: projectKnowledge.indexGeneration || "",
            stale_served: projectKnowledge.staleServed === true,
            token_budget: projectKnowledge.tokenBudget || null,
          },
          error: projectKnowledge.embeddingError || "",
        });
      }
      let chatIntent: any;
      try {
        chatIntent = await classifyProjectChatIntentWithModel(finalMessage, files, { forceTask: !!parentRunId, project, sessionId: exactProjectSessionId });
      } catch (error: any) {
        return sendJson(res, {
          success: false,
          error: `统一大模型无法形成可靠工作流决策，本轮未启动项目 Agent：${error?.message || error}`,
        }, 503);
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
      if (toolContext.dispatchGate?.dispatchReady === false) return sendRuntimeToolDispatchBlocked(res, toolContext);
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
            fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, projectMemoryPacket, projectKnowledge: projectKnowledge.context },
            tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
            provider: agentType,
          });
          if (projectCompaction?.reason === "circuit_breaker") {
            return sendJson(res, { error: "项目会话记忆压缩已熔断，本轮未启动第三方 Agent", consecutive_failures: projectCompaction.consecutive_failures || 3 }, 503);
          }
        } catch (error: any) {
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
            const hydratedPayloadTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0)
              + estimateTextTokens(toolContext.prompt)
              + estimateTextTokens(projectKnowledge.context)
              + estimateTextTokens(finalMessage);
            if (threshold > 0 && hydratedPayloadTokens >= threshold && projectCompaction?.compacted !== true) {
              projectCompaction = await compactProjectSessionWithModel(project, exactProjectSessionId, {
                force: true,
                reason: "third_party_memory_mcp_required_hydration",
                currentRequest: finalMessage,
                fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, projectMemoryPacket, projectKnowledge: projectKnowledge.context },
                tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
                provider: agentType,
              });
              projectMemoryMcp = prepareProjectMemoryMcp();
              toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
              projectMemoryMcp.ready = (toolContext.audit.internal_mcp || []).some((item: any) => item.name === "ccm__knowledge_context" && item.state === "synced");
              const postTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0) + estimateTextTokens(toolContext.prompt) + estimateTextTokens(projectKnowledge.context) + estimateTextTokens(finalMessage);
              if (threshold > 0 && postTokens >= threshold) throw new Error(`项目记忆 MCP 必读上下文压缩后仍超过阈值：${postTokens}/${threshold}`);
            }
          }
        } catch (error: any) {
          return sendJson(res, { error: `项目会话记忆 MCP 准备失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
        }
      }
      if (toolContext.dispatchGate?.dispatchReady === false) return sendRuntimeToolDispatchBlocked(res, toolContext);
      const fullMessage = [toolContext.prompt, projectKnowledge.context, finalMessage].filter(Boolean).join("\n\n");
      const memoryMcpEnabled = projectMemoryMcp?.ready === true;
      const projectSessionContext = memoryMcpEnabled
        ? buildThirdPartyMemoryBootstrap(projectMemoryMcp.snapshot, projectMemoryMcp.challenge)
        : exactProjectSessionId ? buildProjectSessionPostCompactContext(project, exactProjectSessionId, agentType, { currentRequest: finalMessage }) : "";
      const dispatchLease = exactProjectSessionId ? acquireProjectSessionAgentDispatch(project, exactProjectSessionId) : { acquired: true, scopeId: "" };
      const dispatchScope = dispatchLease.scopeId;
      if (!dispatchLease.acquired) {
        if (source === "feishu") return enqueueCurrentProjectFeishuTurn();
        return sendJson(res, { error: "当前项目会话已有 Agent 工作正在执行，请排队或等待本轮完成" }, 409);
      }
      if (requestIsReadOnly(req) && chatIntent.mode === "task") {
        return sendJson(res, { success: false, error: "当前 Viewer 账户仅允许项目只读问答；这条需求需要执行开发任务，请联系 Operator 或 Admin", code: "VIEWER_EXECUTION_FORBIDDEN" }, 403);
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
      res.once?.("finish", releaseDispatch);
      res.once?.("close", releaseDispatch);
      try {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
        let responseDetached = false;
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

        if (chatIntent.mode !== "task") {
          send({ type: "presentation", message_mode: chatIntent.mode, show_task_card: false, main_agent: "project" });
          send({ type: "status", text: chatIntent.mode === "project_analysis" ? "项目主 Agent 正在分析当前项目..." : "项目主 Agent 正在回复...", agent: "project-main-agent" });
          const projectMainContext = projectKnowledge.context;
          let streamedAnswer = false;
          const answer = await answerAsProjectMainAgent({
            project,
            projectSessionId: exactProjectSessionId,
            userMessage: finalMessage,
            mode: chatIntent.mode,
            context: projectMainContext,
            workflowDecision: chatIntent.workflowDecision,
            onDelta: delta => {
              if (!delta) return;
              streamedAnswer = true;
              send({ type: "chunk", text: delta, agent: "project-main-agent" });
            },
          });
          if (answer && !streamedAnswer) send({ type: "chunk", text: answer, agent: "project-main-agent" });
          scheduleFeishuSessionTitle(answer);
          send({ type: "done", message_mode: chatIntent.mode, main_agent: "project", taskExperience: null });
          clearInterval(heartbeat);
          res.end();
          return;
        }

        const projectRun = createProjectChatRun(project, finalMessage, workDir, parentRunId, exactProjectSessionId);
        projectRun.message_mode = "task";
        projectRun.workflow_decision = chatIntent.workflowDecision;
        const bound = bindProjectRunAgentSession(projectRun, project, agentType);
        let activeTaskAgentSession = bound.session;
        let activeAgentSessionOptions = bound.options;
        const existingTask = parentProjectMainTask;
        const plan = existingTask?.workflow_meta?.project_main_plan || await planProjectMainTask({
          project,
          projectSessionId: exactProjectSessionId,
          userMessage: finalMessage,
          workflowDecision: chatIntent.workflowDecision,
          context: projectKnowledge.context,
        });
        const task = existingTask || createProjectMainTask({
          project,
          projectSessionId: exactProjectSessionId,
          projectMainRunId: projectRun.id,
          userMessage: finalMessage,
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
        const { project, message, files, parent_run_id, parentRunId, session_id, sessionId, source, platform_context, platformContext } = JSON.parse(body);
        void handleStreamSend(project, message, Array.isArray(files) ? files : [], String(parent_run_id || parentRunId || ""), String(session_id || sessionId || ""), String(source || "web"), platform_context || platformContext || {});
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
  if (handleTemplatesApi(pathname, req, res, parsed)) return;
  if (handleCronApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleToolsAndMetricsApi(pathname, req, res, parsed)) return;
  if (handlePetsApi(pathname, req, res, parsed, petsCtx)) return;
  if (handleMusicApi(pathname, req, res, parsed, musicCtx)) return;
  if (handleTaskPermissionRoutes(pathname, req, res, parsed, collabCtx)) return;
  if (handleCollaborationApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleGlobalAgentApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleRagApi(pathname, req, res, parsed)) return;
  if (handleSlashCommandsApi(pathname, req, res, parsed)) return;
  if (handleUsabilityApi(pathname, req, res)) return;
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
  const instanceLock = acquireCcmServerInstanceLock(port, LISTEN_HOST);
  registerContextEngineRecoveryHook();
  const startupCollabCtx = createCollabCtx();
  const server = http.createServer(handleRequest);
  server.on("error", () => releaseCcmServerInstanceLock(instanceLock));
  server.on("close", () => {
    stopFeishuChannelSupervisorForServer();
    stopControlBotConnection();
    stopManagedProjectRuntimesForShutdown();
    stopAllTerminalRuns();
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    stopGlobalMissionSupervisionForServer();
    stopGlobalWebTurnRecoveryForServer();
    stopFeishuConversationTurnRecoveryForServer();
    stopProjectFeishuTurnRecoveryForServer();
    stopReliabilityDrillScheduler();
    stopUsabilityArchiveScheduler();
    stopGroupSessionRetentionMaintenanceScheduler();
    stopModelCapabilityRefreshScheduler();
    stopRuntimeToolRealCliMatrixScheduler();
    stopTaskPermissionNotificationScheduler();
    shutdownSoakMonitor();
    closeSqliteTaskStore();
    releaseCcmServerInstanceLock(instanceLock);
  });
  server.listen(port, LISTEN_HOST, () => {
    // Port ownership and the data-directory lock are the fail-closed singleton
    // gates. No mutable startup work may run before both have succeeded.
    bootstrapServerRuntime(startupCollabCtx, port);
    setFeishuChannelAlertHandler(payload => {
      startupCollabCtx.broadcastPetSpeech?.("global-agent", { role: payload.role, text: payload.text, final: true, source: payload.source });
    });
    startTaskPermissionNotificationScheduler(startupCollabCtx);
    startModelCapabilityRefreshScheduler();
    startRuntimeToolRealCliMatrixScheduler();
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
    const projectChannelResults = reconcileProjectFeishuConnections(port);
    const recycledProjectChannels = projectChannelResults.filter((item: any) => item.recycled).length;
    const failedProjectChannels = projectChannelResults.filter((item: any) => item.success === false);
    if (recycledProjectChannels > 0) console.log(`[项目飞书通道] 已更新并重连 ${recycledProjectChannels} 个旧运行实例`);
    for (const item of failedProjectChannels) console.warn(`[项目飞书通道] ${item.project} 协调失败：${item.error}`);
    startFeishuChannelSupervisorForServer(port);
  });
  process.once("exit", () => releaseCcmServerInstanceLock(instanceLock));
  return server;
}


if (require.main === module) {
  PORT = parseInt(process.argv[2]) || 3080;
  LISTEN_HOST = normalizeListenHost(process.argv[3] || process.env.CCM_HOST || "127.0.0.1");
  installProcessLifecycleFaultHandlers();
  const server = startServer(PORT, LISTEN_HOST);
  let lifecycleHeartbeat: NodeJS.Timeout | null = null;
  server.prependOnceListener("listening", () => {
    initializeProcessLifecycle();
    lifecycleHeartbeat = setInterval(() => touchProcessLifecycle(), 30_000);
    lifecycleHeartbeat.unref?.();
  });
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (lifecycleHeartbeat) clearInterval(lifecycleHeartbeat);
    markProcessShutdown({ category: "system_shutdown", reason: `收到 ${signal}，执行受控退出`, signal, exit_code: 0 });
    stopFeishuChannelSupervisorForServer();
    stopControlBotConnection();
    stopManagedProjectRuntimesForShutdown();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref?.();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("exit", code => markProcessShutdown({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}

module.exports = { startServer };



