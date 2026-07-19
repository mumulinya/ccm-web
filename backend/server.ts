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
  readMemoryContextConsumptionReceipt,
  reconcileMemoryContextConsumptionReceipts,
} from "./integrations/memory-context-consumption-receipt";
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
import { buildProjectConversationBrief, buildProjectExecutionBrief } from "./projects/memory";
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

// 导入子模块控制器
import { handleProjectsApi, startControlBotConnection } from "./modules/projects/projects";
import { classifyProjectChatIntentWithModel } from "./modules/projects/project-chat-intent";
import { handleSessionsApi } from "./modules/projects/sessions";
import { handleConversationSearchApi } from "./modules/search/conversation-search";
import { handleGitApi } from "./modules/tools/git";
import { handleMarketplaceApi } from "./modules/tools/marketplace";
import { handleTemplatesApi } from "./modules/templates/templates";
import { handleCronApi, startCronScheduler, stopCronScheduler, syncCronTaskStatus } from "./modules/scheduling/cron";
import { handleToolsAndMetricsApi } from "./modules/tools/tools";
import { stopAllTerminalRuns } from "./modules/tools/terminal";
import { handlePetsApi } from "./modules/pets/pets";
import { GlobalPetActivityCoordinator } from "./modules/pets/pet-activity-coordinator";
import { recoverPetGenerationJobs, setPetGenerationLifecycleNotifier } from "./modules/pets/pet-generation";
import { handleMusicApi } from "./modules/music/music";
import { handleCollaborationApi, resumeTaskQueues, startAgentRecoveryMonitor, startTaskWatchdog, stopAgentRecoveryMonitor, stopTaskWatchdog } from "./modules/collaboration/collaboration";
import { reconcileGroupSessionLifecycleAgentCancellations } from "./modules/collaboration/storage";
import { bootstrapGroupSessionLifecycleJournals } from "./modules/collaboration/group-session-lifecycle-head";
import { notifyFeishuTaskStatus } from "./modules/collaboration/feishu-channel";
import { startGroupSessionRetentionMaintenanceScheduler, stopGroupSessionRetentionMaintenanceScheduler } from "./modules/collaboration/group-session-maintenance";
import { recoverChildTypedMemoryDispatchWal } from "./modules/collaboration/memory";
import { recoverGroupTypedMemoryArtifactTransactionsFleet } from "./modules/collaboration/group-memory-index";
import { listTaskAgentInvocationEdges, reconcileTaskAgentInvocationRecovery } from "./tasks/task-agent-invocation-lineage";
import { reconcileTaskAgentContinuationSoak } from "./tasks/task-agent-continuation-soak";
import { startReliabilityDrillScheduler, stopReliabilityDrillScheduler } from "./system/reliability-drills";
import { resumeSoakTest, shutdownSoakMonitor } from "./system/soak-test";
import { initializeProcessLifecycle, installProcessLifecycleFaultHandlers, markProcessShutdown, touchProcessLifecycle } from "./system/process-lifecycle";
import { initializeBuiltInSessionCompactionHooks } from "./system/session-compaction-hooks";
import { bootstrapGlobalAgentMemoryForServer, handleGlobalAgentApi, resumeGlobalAgentLoopsForServer, startFeishuConversationTurnRecoveryForServer, startGlobalMissionSupervisionForServer, stopFeishuConversationTurnRecoveryForServer, stopGlobalMissionSupervisionForServer } from "./modules/global/global-agent";
import { handleRagApi } from "./modules/knowledge/rag";
import { handleSlashCommandsApi } from "./modules/tools/slash-commands";
import { migrateConfigDirectory, migrateTomlCredentials } from "./core/credential-store";
import { handleUsabilityApi, startUsabilityArchiveScheduler, stopUsabilityArchiveScheduler } from "./modules/system/usability";
import { handleSystemSettingsApi } from "./modules/system/settings";
import { ensureRoleSkillsInstalled } from "./skills/role-skills";
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

import { getSessionDetail, getSessions } from "./modules/projects/sessions";
import {
  acquireProjectSessionAgentDispatch,
  bindProjectSessionAgentExecution,
  releaseProjectSessionAgentDispatch,
} from "./modules/projects/project-session-agent-binding";
import {
  buildProjectSessionPostCompactContext,
  compactProjectSessionWithModel,
  recordProjectSessionProviderUsage,
} from "./modules/projects/project-session-compaction";
import { createPetActivityRuntime } from "./server-pet-activity";
import { createAgentRunnerRuntime } from "./server-agent-runner";
import { sendFile } from "./server-static";
import { bootstrapServerRuntime as runServerBootstrap } from "./server-bootstrap";

// === 运行时内存状态与心跳推送 ===
let PORT = 3080;
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
  setPetGenerationLifecycleNotifier,
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

  // CORS 头支持
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

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

  // === 流式发送消息给 Agent（SSE）===
  if (pathname === "/api/send-stream" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleStreamSend = async (project: string, message: string, files: any[] = [], parentRunId = "", projectSessionId = "") => {
      const finalMessage = files && files.length > 0
        ? `${message || ""}${buildUploadedFilesContext(files, "本次消息附件")}`
        : (message || "");
      if (!project || !finalMessage.trim()) return sendJson(res, { error: "参数不足" }, 400);
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      const exactProjectSessionId = String(projectSessionId || "").trim();
      if (exactProjectSessionId && !getSessionDetail(project, exactProjectSessionId)) {
        return sendJson(res, { error: "项目会话不存在" }, 404);
      }
      if (exactProjectSessionId && parentRunId) {
        const parentRun = projectChatRuns.get(String(parentRunId));
        if (!parentRun) return sendJson(res, { error: "续跑来源不存在" }, 404);
        if (String(parentRun.project || "") !== project || String(parentRun.project_session_id || "") !== exactProjectSessionId) {
          return sendJson(res, { error: "续跑来源不属于当前项目会话" }, 409);
        }
      }
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      const configuredAgentType = info[0]?.agent || "claudecode";
      const resolvedRuntime = resolveAvailableAgentRuntime(configuredAgentType);
      const agentType = resolvedRuntime.selected;
      let chatIntent: any;
      try {
        chatIntent = await classifyProjectChatIntentWithModel(message, files, { forceTask: !!parentRunId, project });
      } catch (error: any) {
        return sendJson(res, {
          success: false,
          error: `统一大模型无法形成可靠工作流决策，本轮未启动项目 Agent：${error?.message || error}`,
        }, 503);
      }
      const toolContext = buildProjectToolContext(project, workDir, agentType);
      if (toolContext.dispatchGate?.dispatchReady === false) return sendRuntimeToolDispatchBlocked(res, toolContext);
      if (resolvedRuntime.switched) {
        toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
        (toolContext.workEvent as any).runtimeFallback = resolvedRuntime;
      }
      if (exactProjectSessionId) {
        try {
          const compaction = await compactProjectSessionWithModel(project, exactProjectSessionId, {
            reason: "auto_model",
            currentRequest: finalMessage,
            fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt },
            tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
            provider: agentType,
          });
          if (compaction?.reason === "circuit_breaker") {
            return sendJson(res, { error: "项目会话记忆压缩已熔断，本轮未启动第三方 Agent", consecutive_failures: compaction.consecutive_failures || 3 }, 503);
          }
        } catch (error: any) {
          return sendJson(res, { error: `项目会话自动压缩失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
        }
      }
      const fullMessage = `${toolContext.prompt}\n\n${finalMessage}`;
      const projectSessionContext = exactProjectSessionId ? buildProjectSessionPostCompactContext(project, exactProjectSessionId, agentType) : "";
      const dispatchLease = exactProjectSessionId ? acquireProjectSessionAgentDispatch(project, exactProjectSessionId) : { acquired: true, scopeId: "" };
      const dispatchScope = dispatchLease.scopeId;
      if (!dispatchLease.acquired) {
        return sendJson(res, { error: "当前项目会话已有 Agent 工作正在执行，请排队或等待本轮完成" }, 409);
      }
      let released = false;
      const releaseDispatch = () => {
        if (released || !dispatchScope) return;
        released = true;
        releaseProjectSessionAgentDispatch(dispatchScope);
      };
      res.once?.("finish", releaseDispatch);
      res.once?.("close", releaseDispatch);
      try { callAgentStream(project, fullMessage, workDir, agentType, res, {
        allowedTools: toolContext.allowedTools,
        mcpConfigPath: toolContext.audit.mcpConfigPath,
        runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
        runtimeToolDispatchGate: toolContext.dispatchGate,
        initialWorkEvents: [toolContext.workEvent],
        userMessage: finalMessage,
        parentRunId,
        projectSessionId: exactProjectSessionId,
        projectSessionContext,
        messageMode: chatIntent.mode,
        workflowDecision: chatIntent.workflowDecision,
      }); } catch (error) {
        releaseDispatch();
        throw error;
      }
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = parseMultipart(buffer, boundary);
          void handleStreamSend(
            (fields as any).project,
            (fields as any).message,
            files,
            String((fields as any).parent_run_id || (fields as any).parentRunId || ""),
            String((fields as any).session_id || (fields as any).sessionId || ""),
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
        const { project, message, parent_run_id, parentRunId, session_id, sessionId } = JSON.parse(body);
        void handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""), String(session_id || sessionId || ""));
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
      const promptWithTools = `${toolContext.prompt}\n\n${fullMessage}`;

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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = parseMultipart(buffer, boundary);
          await handleSend((fields as any).project, (fields as any).message, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      });
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
    reconcileTaskAgentContinuationSoak,
    reconcileTaskAgentInvocationRecovery,
    recoverChildTypedMemoryDispatchWal,
    recoverGroupTypedMemoryArtifactTransactionsFleet,
    recoverPetGenerationJobs,
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

function startServer(port: number) {
  PORT = port;
  const instanceLock = acquireCcmServerInstanceLock(port);
  const startupCollabCtx = createCollabCtx();
  const server = http.createServer(handleRequest);
  server.on("error", () => releaseCcmServerInstanceLock(instanceLock));
  server.on("close", () => {
    stopAllTerminalRuns();
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    stopGlobalMissionSupervisionForServer();
    stopFeishuConversationTurnRecoveryForServer();
    stopReliabilityDrillScheduler();
    stopUsabilityArchiveScheduler();
    stopGroupSessionRetentionMaintenanceScheduler();
    stopModelCapabilityRefreshScheduler();
    stopRuntimeToolRealCliMatrixScheduler();
    shutdownSoakMonitor();
    closeSqliteTaskStore();
    releaseCcmServerInstanceLock(instanceLock);
  });
  server.listen(port, () => {
    // Port ownership and the data-directory lock are the fail-closed singleton
    // gates. No mutable startup work may run before both have succeeded.
    bootstrapServerRuntime(startupCollabCtx, port);
    startModelCapabilityRefreshScheduler();
    startRuntimeToolRealCliMatrixScheduler();
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║     ccm Web 控制台                    ║`);
    console.log(`╚══════════════════════════════════════╝\n`);
    console.log(`  地址: http://localhost:${port}`);
    console.log(`  按 Ctrl+C 停止\n`);
    void resumeGlobalAgentLoopsForServer(startupCollabCtx, port)
      .then(result => {
        if (result.total > 0) console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`);
      })
      .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`))
      .finally(() => startFeishuConversationTurnRecoveryForServer(`http://127.0.0.1:${port}`, startupCollabCtx));
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
  });
  process.once("exit", () => releaseCcmServerInstanceLock(instanceLock));
  return server;
}


if (require.main === module) {
  PORT = parseInt(process.argv[2]) || 3080;
  installProcessLifecycleFaultHandlers();
  const server = startServer(PORT);
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
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref?.();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("exit", code => markProcessShutdown({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}

module.exports = { startServer };



