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
import {
  buildNativeSessionContinuationEvidence,
  verifyNativeSessionContinuationEvidence,
} from "./agents/native-continuation";
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
} from "./agents/execution-kernel";
import { buildProjectExecutionBrief } from "./projects/memory";
import {
  appendDirectAgentDispatchTranscript,
  completeDirectAgentDispatch,
  createDirectAgentDispatchRequest,
  markDirectAgentDispatchStarted,
} from "./agents/direct-dispatch-spool";

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

// 导入子模块控制器
import { handleProjectsApi, startControlBotConnection } from "./modules/projects/projects";
import { handleSessionsApi } from "./modules/projects/sessions";
import { handleConversationSearchApi } from "./modules/search/conversation-search";
import { handleGitApi } from "./modules/tools/git";
import { handleMarketplaceApi } from "./modules/tools/marketplace";
import { handleTemplatesApi } from "./modules/templates/templates";
import { handleCronApi, startCronScheduler, stopCronScheduler, syncCronTaskStatus } from "./modules/scheduling/cron";
import { handleToolsAndMetricsApi } from "./modules/tools/tools";
import { handlePetsApi } from "./modules/pets/pets";
import { GlobalPetActivityCoordinator } from "./modules/pets/pet-activity-coordinator";
import { recoverPetGenerationJobs, setPetGenerationLifecycleNotifier } from "./modules/pets/pet-generation";
import { handleMusicApi } from "./modules/music/music";
import { handleCollaborationApi, resumeTaskQueues, startAgentRecoveryMonitor, startTaskWatchdog, stopAgentRecoveryMonitor, stopTaskWatchdog } from "./modules/collaboration/collaboration";
import { reconcileGroupSessionLifecycleAgentCancellations } from "./modules/collaboration/storage";
import { notifyFeishuTaskStatus } from "./modules/collaboration/feishu-channel";
import { startGroupSessionRetentionMaintenanceScheduler, stopGroupSessionRetentionMaintenanceScheduler } from "./modules/collaboration/group-session-maintenance";
import { recoverChildTypedMemoryDispatchWal } from "./modules/collaboration/memory";
import { listTaskAgentInvocationEdges, reconcileTaskAgentInvocationRecovery } from "./tasks/task-agent-invocation-lineage";
import { reconcileTaskAgentContinuationSoak } from "./tasks/task-agent-continuation-soak";
import { startReliabilityDrillScheduler, stopReliabilityDrillScheduler } from "./system/reliability-drills";
import { resumeSoakTest, shutdownSoakMonitor } from "./system/soak-test";
import { initializeProcessLifecycle, installProcessLifecycleFaultHandlers, markProcessShutdown, touchProcessLifecycle } from "./system/process-lifecycle";
import { bootstrapGlobalAgentMemoryForServer, handleGlobalAgentApi, resumeGlobalAgentLoopsForServer, startGlobalMissionSupervisionForServer, stopGlobalMissionSupervisionForServer } from "./modules/global/global-agent";
import { handleRagApi } from "./modules/knowledge/rag";
import { handleSlashCommandsApi } from "./modules/tools/slash-commands";
import { migrateConfigDirectory, migrateTomlCredentials } from "./core/credential-store";
import { handleUsabilityApi, startUsabilityArchiveScheduler, stopUsabilityArchiveScheduler } from "./modules/system/usability";
import { handleSystemSettingsApi } from "./modules/system/settings";
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

import { getSessions } from "./modules/projects/sessions";

// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set<any>();
const petWorkspaceClients = new Set<any>();
const stateCache = new Map<string, any>();
const agentActivity = new Map<string, any>();
const petWorkspaceTargets = new Map<string, any>();
const globalPetActivityCoordinator = new GlobalPetActivityCoordinator();

const MUSIC_PET_AGENT_NAME = "music-agent";
const GLOBAL_PET_AGENT_NAME = "global-agent";
const MUSIC_PET_AGENT_DEFAULT_LABEL = "乖乖";
const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
const AGENT_RUNNER_REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const AGENT_RUNNER_RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
let musicPetState = {
  state: "idle",
  detail: "等待音乐指令",
  track: null,
  timestamp: Date.now(),
};

function getMusicPetAgentLabel() {
  try {
    if (!fs.existsSync(PETS_FILE)) return MUSIC_PET_AGENT_DEFAULT_LABEL;
    const data = JSON.parse(fs.readFileSync(PETS_FILE, "utf-8"));
    const config = data?.configs?.[MUSIC_PET_AGENT_NAME] || {};
    const label = String(config.label || config.petLabel || config.displayName || "").trim();
    return label ? label.slice(0, 24) : MUSIC_PET_AGENT_DEFAULT_LABEL;
  } catch {
    return MUSIC_PET_AGENT_DEFAULT_LABEL;
  }
}

// === 辅助广播及状态跟踪函数 ===
function writeSse(res: any, data: any) {
  if (!res || res.writableEnded || res.destroyed) return;
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
}

loadProjectChatRuns();

function bindProjectRunAgentSession(projectRun: any, projectName: string, agentType: string) {
  const parentRun = projectRun?.parent_run_id ? projectChatRuns.get(projectRun.parent_run_id) : null;
  const taskSessionScopeId = String(parentRun?.task_session_scope_id || parentRun?.parent_run_id || projectRun?.parent_run_id || projectRun?.id || "");
  const session = openTaskAgentSession({
    scopeId: taskSessionScopeId,
    taskId: taskSessionScopeId,
    groupId: "project-chat",
    project: projectName,
    agentType,
  });
  projectRun.task_session_scope_id = taskSessionScopeId;
  projectRun.task_agent_session_id = session.id;
  projectRun.native_session_id = session.nativeSessionId || "";
  projectRun.resume_mode = session.resumeMode || "";
  saveProjectChatRuns();
  return { session, options: getTaskAgentSessionOptions(session) };
}

function broadcastPetSpeech(agent: string, payload: any = {}) {
  const text = payload.text == null ? "" : String(payload.text);
  if (!agent || (!text.trim() && !payload.final)) return;
  const source = payload.source || "project";
  const isMusic = agent === MUSIC_PET_AGENT_NAME;
  const isGlobal = agent === GLOBAL_PET_AGENT_NAME;
  const resolved = !isMusic && !isGlobal ? globalPetActivityCoordinator.resolve() : null;
  const actorDisplayName = isMusic ? getMusicPetAgentLabel() : isGlobal ? getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent") : (resolved?.displayName || agent);
  const visibleText = isMusic || isGlobal || !text.trim() || text.trim().startsWith(`${actorDisplayName}：`)
    ? text
    : `${actorDisplayName}：${text}`;
  const event = {
    type: "speech",
    agent: isMusic ? MUSIC_PET_AGENT_NAME : GLOBAL_PET_AGENT_NAME,
    actor: isMusic || isGlobal ? agent : (resolved?.actor || agent),
    actorKind: isMusic ? "music" : isGlobal ? "global" : (resolved?.actorKind || "project"),
    displayName: actorDisplayName,
    role: payload.role || "assistant",
    text: visibleText,
    mode: payload.mode || "replace",
    final: !!payload.final,
    source,
    timestamp: new Date().toISOString(),
  };
  for (const client of petStatusClients) writeSse(client, event);
}

function broadcastPetConfigChanged() {
  const event = {
    type: "config",
    timestamp: new Date().toISOString(),
  };
  for (const client of petStatusClients) writeSse(client, event);
}

function sanitizePetNavigationTarget(target: any = {}) {
  const tab = String(target.tab || "").trim();
  if (tab === "music") return { tab: "music" };
  if (tab === "global-agent") return { tab: "global-agent" };
  if (tab === "groups") {
    return {
      tab: "groups",
      groupId: target.groupId ? String(target.groupId) : "",
      keyword: target.keyword ? String(target.keyword) : "",
    };
  }
  if (tab === "projects") {
    return {
      tab: "projects",
      project: target.project ? String(target.project) : "",
      sessionId: target.sessionId ? String(target.sessionId) : "",
      keyword: target.keyword ? String(target.keyword) : "",
    };
  }
  return { tab: "projects", project: target.project ? String(target.project) : "" };
}

function setAgentWorkspaceTarget(name: string, target: any = null) {
  if (!name || !target) return;
  petWorkspaceTargets.set(name, {
    ...sanitizePetNavigationTarget(target),
    updatedAt: Date.now(),
  });
}

function getPetNavigationTarget(agent: string) {
  const name = String(agent || "").trim();
  if (name === MUSIC_PET_AGENT_NAME) return { tab: "music" };
  if (name === GLOBAL_PET_AGENT_NAME) return { tab: "global-agent" };

  const existing = petWorkspaceTargets.get(name);
  if (existing?.tab) {
    const { updatedAt, ...target } = existing;
    return target;
  }

  const project = getConfigs().find(c => c.name === name);
  if (project) return { tab: "projects", project: name };
  return { tab: "projects" };
}

function buildPetNavigationUrl(target: any) {
  const params = new URLSearchParams();
  params.set("tab", target?.tab || "projects");
  if (target?.project) params.set("project", String(target.project));
  if (target?.sessionId) params.set("sessionId", String(target.sessionId));
  if (target?.groupId) params.set("groupId", String(target.groupId));
  if (target?.keyword) params.set("keyword", String(target.keyword));
  return `http://localhost:${PORT}/?${params.toString()}`;
}

function broadcastPetNavigation(agent: string, target: any) {
  const event = {
    type: "navigate",
    agent,
    target,
    url: buildPetNavigationUrl(target),
    timestamp: new Date().toISOString(),
  };
  for (const client of petStatusClients) writeSse(client, event);
  return event;
}

const PROJECT_IDLE_ACTION_STRATEGY = [
  { state: "idle", seconds: 20, detail: "空闲，等待指令" },
  { state: "idle", seconds: 20, detail: "待机小动作随机播放" },
  { state: "yawning", seconds: 8, detail: "长时间无任务时轻微放松" },
  { state: "idle", seconds: 12, detail: "回到安静待机" },
];

const PROJECT_IDLE_ACTION_CYCLE_MS = PROJECT_IDLE_ACTION_STRATEGY.reduce((sum, item) => sum + item.seconds * 1000, 0);
const PROJECT_ACTIVE_ACTION_STRATEGY = [
  { state: "working", seconds: 90, detail: "Agent 调用中", trigger: "用户向项目 Agent 提问、群聊协作、定时任务执行" },
  { state: "planning", seconds: 15, detail: "正在规划下一步", trigger: "全局 Agent 形成决策、拆任务或选择工具" },
  { state: "building", seconds: 90, detail: "正在实现/执行", trigger: "全局 Agent 或子 Agent 开始执行开发任务" },
  { state: "debugging", seconds: 60, detail: "正在排查失败", trigger: "工具失败、测试失败、执行器恢复或返工" },
  { state: "reviewing", seconds: 45, detail: "正在验收/复盘", trigger: "工具完成、代码审查、最终验收" },
  { state: "waiting", seconds: 300, detail: "等待用户确认", trigger: "需要用户确认、澄清或继续授权" },
  { state: "happy", seconds: 12, detail: "任务完成", trigger: "项目 Agent 成功完成回复或协作任务" },
  { state: "error", seconds: 45, detail: "错误", trigger: "项目 Agent 调用失败或任务执行报错" },
  { state: "attention", seconds: 12, detail: "正在展示回复", trigger: "项目 Agent 输出消息气泡时" },
];

function getProjectPetActionStrategy() {
  return {
    idleCycleSeconds: Math.round(PROJECT_IDLE_ACTION_CYCLE_MS / 1000),
    idle: PROJECT_IDLE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
    active: PROJECT_ACTIVE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
  };
}

function getActivityDurationMs(state: string) {
  const normalized = normalizePetState(state);
  const durations: Record<string, number> = {
    idle: 10000,
    thinking: 10000,
    planning: 15000,
    working: 90000,
    building: 90000,
    debugging: 60000,
    reviewing: 45000,
    waiting: 300000,
    happy: 10000,
    attention: 10000,
    notification: 10000,
    error: 45000,
    carrying: 10000,
    sweeping: 10000,
    juggling: 10000,
    yawning: 10000,
    dozing: 10000,
    collapsing: 10000,
    sleeping: 10000,
    waking: 10000,
  };
  return durations[normalized] || 60000;
}

function getAgentRunActivityDuration(timeoutMs?: number) {
  return Math.max((timeoutMs || 300000) + 30000, getActivityDurationMs("working"));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getProjectAmbientPetState(name: string, now = Date.now()) {
  const offset = hashString(name) % PROJECT_IDLE_ACTION_CYCLE_MS;
  let cursor = (now + offset) % PROJECT_IDLE_ACTION_CYCLE_MS;
  for (const item of PROJECT_IDLE_ACTION_STRATEGY) {
    const span = item.seconds * 1000;
    if (cursor < span) return item;
    cursor -= span;
  }
  return PROJECT_IDLE_ACTION_STRATEGY[0];
}

function broadcastAgentActivityState(name: string, state: string, detail = "", timestamp = Date.now()) {
  const event = {
    type: "state",
    agent: name,
    displayName: name,
    state,
    lastActivity: new Date(timestamp).toISOString(),
    detail,
  };
  if (name === MUSIC_PET_AGENT_NAME) {
    for (const client of petStatusClients) writeSse(client, event);
    return;
  }
  const resolved = globalPetActivityCoordinator.resolve(timestamp);
  const coordinated = resolved ? {
    ...event,
    agent: GLOBAL_PET_AGENT_NAME,
    actor: resolved.actor,
    actorKind: resolved.actorKind,
    runtime: resolved.runtime,
    displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
    state: resolved.state,
    detail: resolved.detail,
    lastActivity: new Date(resolved.timestamp).toISOString(),
    source: resolved.source,
  } : {
    ...event,
    agent: GLOBAL_PET_AGENT_NAME,
    actor: GLOBAL_PET_AGENT_NAME,
    actorKind: "global",
    displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
    state: "idle",
    detail: "等待全局指令",
  };
  for (const client of petStatusClients) writeSse(client, coordinated);
}

function shouldKeepGlobalPetPrimaryActivity(now = Date.now()) {
  const activity = agentActivity.get(GLOBAL_PET_AGENT_NAME);
  if (!activity) return false;
  const active = activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000;
  if (!active) return false;
  return new Set([
    "thinking",
    "planning",
    "building",
    "debugging",
    "reviewing",
    "waiting",
  ]).has(normalizePetState(activity.state));
}

function setAgentActivity(name: string, state: string, detail = "", workspaceTarget: any = null, durationMs?: number, metadata: any = null) {
  if (workspaceTarget) setAgentWorkspaceTarget(name, workspaceTarget);
  const timestamp = Date.now();
  const normalizedState = normalizePetState(state);
  agentActivity.set(name, {
    state: normalizedState,
    timestamp,
    detail,
    expiresAt: timestamp + (durationMs || getActivityDurationMs(normalizedState)),
  });
  if (name !== MUSIC_PET_AGENT_NAME) {
    const coordinated = globalPetActivityCoordinator.update({
      actor: name,
      displayName: metadata?.displayName || (name === GLOBAL_PET_AGENT_NAME ? getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent") : name),
      actorKind: metadata?.actorKind,
      runtime: metadata?.runtime,
      state: normalizedState,
      detail,
      workspaceTarget,
      source: metadata?.source || (workspaceTarget?.tab === "groups" ? "group" : workspaceTarget?.tab === "projects" ? "project" : "global"),
      timestamp,
      durationMs: durationMs || getActivityDurationMs(normalizedState),
    });
    if (coordinated) {
      agentActivity.set(GLOBAL_PET_AGENT_NAME, {
        state: coordinated.state,
        timestamp: coordinated.timestamp,
        detail: coordinated.detail,
        expiresAt: coordinated.expiresAt,
      });
      if (coordinated.workspaceTarget) setAgentWorkspaceTarget(GLOBAL_PET_AGENT_NAME, coordinated.workspaceTarget);
    } else {
      agentActivity.delete(GLOBAL_PET_AGENT_NAME);
    }
  }
  stateCache.delete(name);
  broadcastAgentActivityState(name, normalizedState, detail, timestamp);
}

function getSystemPetActivity(name: string, fallbackDetail = "") {
  const now = Date.now();
  const activity = agentActivity.get(name);
  if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
    return {
      state: normalizePetState(activity.state),
      lastActivity: new Date(activity.timestamp).toISOString(),
      detail: activity.detail || fallbackDetail,
    };
  }
  return {
    state: "idle",
    lastActivity: new Date().toISOString(),
    detail: fallbackDetail,
  };
}

function normalizePetState(state: string) {
  const value = String(state || "idle");
  const allowed = new Set([
    "idle", "working", "thinking", "error", "happy", "attention",
    "notification", "carrying", "sweeping", "juggling", "yawning",
    "dozing", "collapsing", "sleeping", "waking", "planning",
    "building", "debugging", "reviewing", "waiting", "drag",
  ]);
  return allowed.has(value) ? value : "idle";
}

function setMusicPetState(state: string, detail = "", track: any = null) {
  setAgentWorkspaceTarget(MUSIC_PET_AGENT_NAME, { tab: "music" });
  const displayName = getMusicPetAgentLabel();
  musicPetState = {
    state: normalizePetState(state),
    detail: detail || "等待音乐指令",
    track: track || null,
    timestamp: Date.now(),
  };
  const event = {
    type: "state",
    agent: MUSIC_PET_AGENT_NAME,
    displayName,
    state: musicPetState.state,
    lastActivity: new Date(musicPetState.timestamp).toISOString(),
    detail: musicPetState.detail,
    track: musicPetState.track,
  };
  for (const client of petStatusClients) writeSse(client, event);
}

function getMusicPetAgent() {
  const displayName = getMusicPetAgentLabel();
  return {
    name: MUSIC_PET_AGENT_NAME,
    displayName,
    petLabel: displayName,
    virtual: true,
    type: "music",
    agent: "music",
    running: true,
    state: musicPetState.state,
    lastActivity: new Date(musicPetState.timestamp).toISOString(),
    stateDetail: musicPetState.detail,
    track: musicPetState.track,
  };
}

function getPetConfigLabel(agentName: string, fallback: string) {
  try {
    if (!fs.existsSync(PETS_FILE)) return fallback;
    const data = JSON.parse(fs.readFileSync(PETS_FILE, "utf-8"));
    const label = String(data?.configs?.[agentName]?.label || "").trim();
    return label || fallback;
  } catch {
    return fallback;
  }
}

function getGlobalPetAgent() {
  const displayName = getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent");
  const coordinated = globalPetActivityCoordinator.resolve();
  const current = coordinated ? {
    state: coordinated.state,
    lastActivity: new Date(coordinated.timestamp).toISOString(),
    detail: coordinated.detail,
  } : getSystemPetActivity(GLOBAL_PET_AGENT_NAME, "等待全局指令");
  return {
    name: GLOBAL_PET_AGENT_NAME,
    displayName,
    petLabel: displayName,
    virtual: true,
    type: "global",
    agent: "global",
    running: true,
    state: current.state,
    lastActivity: current.lastActivity,
    stateDetail: current.detail,
    actor: coordinated?.actor || GLOBAL_PET_AGENT_NAME,
    actorKind: coordinated?.actorKind || "global",
    runtime: coordinated?.runtime || "",
  };
}

setPetGenerationLifecycleNotifier(job => {
  const terminal = new Set(["completed", "failed", "cancelled"]);
  const state = job.status === "completed"
    ? "happy"
    : job.status === "failed"
      ? "error"
      : job.status === "validating" || job.status === "installing"
        ? "reviewing"
        : job.status === "cancelled"
          ? "idle"
          : "building";
  setAgentActivity(
    GLOBAL_PET_AGENT_NAME,
    state,
    job.stageLabel,
    { tab: "pets" },
    terminal.has(job.status) ? (job.status === "cancelled" ? 1000 : 12000) : 30 * 60 * 1000,
    { actorKind: "global", source: "pet-generation", displayName: "宠物生成" },
  );
});

function getPetAgents() {
  return [getGlobalPetAgent(), getMusicPetAgent()];
}

function getAgentState(name: string) {
  const now = Date.now();
  const activity = agentActivity.get(name);
  if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
    return {
      state: normalizePetState(activity.state),
      lastActivity: new Date(activity.timestamp).toISOString(),
      detail: activity.detail,
      processRunning: true,
      cachedAt: now
    };
  }

  const cached = stateCache.get(name);
  if (cached && now - cached.cachedAt < 2000) return cached;

  const pidFile = path.join(PID_DIR, `${name}.pid`);
  let state = "sleeping";
  let lastActivity = null;
  let detail = "";
  let processRunning = false;

  try {
    if (!fs.existsSync(pidFile)) {
      const result = { state: "idle", lastActivity: new Date(now).toISOString(), detail: "待命中", processRunning: false, cachedAt: now };
      stateCache.set(name, result);
      return result;
    }

    const pid = fs.readFileSync(pidFile, "utf-8").trim();
    try {
      process.kill(parseInt(pid), 0);
      processRunning = true;
      const ambient = getProjectAmbientPetState(name, now);
      state = ambient.state;
      detail = ambient.detail;
      lastActivity = new Date(now).toISOString();
    } catch {
      try { fs.unlinkSync(pidFile); } catch {}
      state = "idle";
      detail = "待命中";
    }
  } catch {
    state = "idle";
    detail = "状态未知";
  }

  const result = {
    state: normalizePetState(state),
    lastActivity,
    detail,
    processRunning,
    cachedAt: now
  };
  stateCache.set(name, result);
  return result;
}

// === Agent 并行/同步调用底座 ===
function normalizeToolSelection(tools: any = {}) {
  const source = tools && typeof tools === "object" ? tools : {};
  return {
    mcp: Array.isArray(source.mcp) ? source.mcp.map((x: any) => String(x).trim()).filter(Boolean) : [],
    skill: Array.isArray(source.skill) ? source.skill.map((x: any) => String(x).trim()).filter(Boolean) : [],
  };
}

function getProjectToolSelection(projectName: string) {
  const configs = loadProjectConfigs();
  return normalizeToolSelection(configs?.[projectName]?.tools || {});
}

function hasToolSelection(tools: any = {}) {
  const normalized = normalizeToolSelection(tools);
  return normalized.mcp.length > 0 || normalized.skill.length > 0;
}

function findRuntimeToolSnapshotPath(mcpConfigPath = "") {
  const configPath = String(mcpConfigPath || "").trim();
  if (!configPath) return "";
  const configDir = path.dirname(configPath);
  const candidates = [
    path.join(configDir, "runtime-tool-snapshot.json"),
    path.join(path.dirname(configDir), "runtime-tool-snapshot.json"),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || "";
}

function readJsonFileSafe(file = "") {
  try {
    return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, "")) : null;
  } catch {
    return null;
  }
}

function runtimeToolSnapshotFromAudit(audit: any = {}, allowedTools: any = {}) {
  const dispatchGate = audit.dispatch_gate || audit.dispatchGate || null;
  const authorizationReadiness = audit.authorization_readiness || audit.authorizationReadiness || null;
  return {
    snapshotId: String(audit.snapshotId || audit.snapshot_id || ""),
    snapshotPath: String(audit.snapshotPath || audit.snapshot_path || ""),
    mcpConfigPath: String(audit.mcpConfigPath || audit.mcp_config_path || ""),
    runtime: normalizeAgentRuntimeId(audit.runtime || ""),
    allowedTools: allowedTools || audit.requested || { mcp: [], skill: [] },
    requested: audit.requested || allowedTools || { mcp: [], skill: [] },
    permissionRules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
    permission_rules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
    authorizationReadiness,
    authorization_readiness: authorizationReadiness,
    dispatchGate,
    dispatch_gate: dispatchGate,
    catalogRevision: String(audit.catalogRevision || ""),
  };
}

function normalizeAgentRunnerRuntimeToolSnapshot(snapshot: any = {}, allowedTools: any = null, mcpConfigPath = "") {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const dispatchGate = source.dispatchGate || source.dispatch_gate || null;
  const authorizationReadiness = source.authorizationReadiness || source.authorization_readiness || null;
  return {
    ...source,
    snapshotId: String(source.snapshotId || source.snapshot_id || ""),
    snapshotPath: String(source.snapshotPath || source.snapshot_path || ""),
    mcpConfigPath: String(source.mcpConfigPath || source.mcp_config_path || mcpConfigPath || ""),
    runtime: normalizeAgentRuntimeId(source.runtime || ""),
    allowedTools: allowedTools || source.allowedTools || source.allowed_tools || source.requested || { mcp: [], skill: [] },
    requested: source.requested || allowedTools || source.allowedTools || source.allowed_tools || { mcp: [], skill: [] },
    permissionRules: source.permissionRules || source.permission_rules || [],
    permission_rules: source.permission_rules || source.permissionRules || [],
    authorizationReadiness,
    authorization_readiness: authorizationReadiness,
    dispatchGate,
    dispatch_gate: dispatchGate,
    catalogRevision: String(source.catalogRevision || source.catalog_revision || ""),
  };
}

function buildAgentRunnerRuntimeToolPayload(allowedTools: any = null, mcpConfigPath = "", executionInfo: any = null) {
  const providedSnapshot = executionInfo?.runtimeToolSnapshot || executionInfo?.runtime_tool_snapshot || null;
  const snapshotPath = providedSnapshot ? "" : findRuntimeToolSnapshotPath(mcpConfigPath);
  const loadedSnapshot = providedSnapshot || readJsonFileSafe(snapshotPath) || null;
  const runtimeToolSnapshot = loadedSnapshot
    ? normalizeAgentRunnerRuntimeToolSnapshot({
      ...loadedSnapshot,
      snapshotPath: loadedSnapshot.snapshotPath || loadedSnapshot.snapshot_path || snapshotPath,
      mcpConfigPath: loadedSnapshot.mcpConfigPath || loadedSnapshot.mcp_config_path || mcpConfigPath,
    }, allowedTools, mcpConfigPath)
    : normalizeAgentRunnerRuntimeToolSnapshot({
      snapshotPath,
      mcpConfigPath,
      allowedTools: allowedTools || { mcp: [], skill: [] },
    }, allowedTools, mcpConfigPath);
  const runtimeToolDispatchGate = executionInfo?.runtimeToolDispatchGate
    || executionInfo?.runtime_tool_dispatch_gate
    || runtimeToolSnapshot.dispatchGate
    || runtimeToolSnapshot.dispatch_gate
    || null;
  return {
    runtimeToolSnapshot,
    runtimeToolDispatchGate,
    runtimeToolSnapshotPath: runtimeToolSnapshot.snapshotPath || "",
    runtimeToolSnapshotRequired: !!(mcpConfigPath || runtimeToolSnapshot.snapshotPath || hasToolSelection(allowedTools)),
  };
}

function normalizeVerificationCommands(value: any) {
  const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
  const seen = new Set<string>();
  const commands: string[] = [];
  for (const item of raw) {
    const command = String(item || "").trim();
    if (!command || seen.has(command)) continue;
    seen.add(command);
    commands.push(command);
  }
  return commands.slice(0, 8);
}

function getProjectVerificationCommandsForRunner(projectName: string) {
  const configs = loadProjectConfigs();
  const projectConfig = configs?.[projectName] || {};
  return normalizeVerificationCommands(
    projectConfig.verification_commands
      || projectConfig.verificationCommands
      || projectConfig.test_commands
      || projectConfig.testCommands
      || projectConfig.check_commands
      || projectConfig.checkCommands
  );
}

async function runIndependentProjectVerification(projectName: string, workDir: string, timeoutMs: number, taskId: string, executionId: string, agentType: string) {
  const commands = getProjectVerificationCommandsForRunner(projectName).filter(isSafeVerificationCommand);
  if (!commands.length || !workDir) return "";
  const verification: string[] = [];
  const failed: string[] = [];
  const results: any[] = [];
  const perCommandTimeout = Math.max(30_000, Math.min(timeoutMs || 300_000, 180_000));
  for (const command of commands) {
    try {
      const managed = await runManagedCommand({
        taskId,
        executionId,
        command,
        cwd: workDir,
        timeoutMs: perCommandTimeout,
        maxOutputBytes: 5 * 1024 * 1024,
        env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), []),
      });
      verification.push(`${command} passed by external runner (exit 0)`);
      results.push({ command, status: "passed", exitCode: 0, output: String(managed.stdout || "").slice(-4000) });
    } catch (error: any) {
      const exitCode = error?.exitCode ?? error?.status ?? null;
      failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
      results.push({ command, status: "failed", exitCode, output: String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000) });
    }
  }
  return "\n\nCCM_RUNNER_VERIFICATION\n```json\n" + JSON.stringify({
    ccm_runner_verification: true,
    status: failed.length ? "failed" : "passed",
    verification,
    failed,
    results,
  }, null, 2) + "\n```";
}

function extractVerificationCommandsFromMessage(message: string) {
  const text = String(message || "");
  const commands: string[] = [];
  const add = (value: string) => {
    for (const part of value.split(/[；;，,]/)) {
      const command = part.trim();
      if (/^(npm run [\w:-]+|mvn \w+|gradle \w+|pytest|go test\b.*|cargo test\b.*)$/i.test(command)) commands.push(command);
    }
  };
  for (const match of text.matchAll(/推荐优先执行的项目验证：([^\n]+)/g)) add(match[1] || "");
  for (const match of text.matchAll(/验证命令：([^\n]+)/g)) add(match[1] || "");
  return normalizeVerificationCommands(commands);
}

function buildAgentCliAllowedTools(projectName: string, message = "") {
  const commands = normalizeVerificationCommands([
    ...getProjectVerificationCommandsForRunner(projectName),
    ...extractVerificationCommandsFromMessage(message),
  ]);
  const rules: string[] = [];
  for (const command of commands) {
    rules.push(`Bash(${command})`);
    if (process.platform === "win32") rules.push(`PowerShell(${command})`);
  }
  return Array.from(new Set(rules));
}

function buildProjectToolContext(projectName: string, workDir = "", agentType = "claudecode") {
  const toolAuth = buildToolAuthorizationPayload(getProjectToolSelection(projectName));
  const allowedTools = toolAuth.tools;
  const audit = syncRuntimeTools(workDir, agentType, allowedTools, { authorizationReadiness: toolAuth.authorization_readiness });
  audit.authorization_readiness = toolAuth.authorization_readiness;
  audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
  recordRuntimeToolSyncAudit(audit, projectName);
  const prompt = toolManager.buildToolPrompt(allowedTools) + buildRuntimeToolSyncPrompt(audit);
  const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
  const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item: any) => item.state === "synced").length : audit.synced.mcp.length;
  const proxyMcpCount = mcpStatuses.filter((item: any) => item.state === "proxy_only").length;
  const authorizationSuffix = toolAuth.authorization_readiness?.dispatchReady === false ? "；授权需处理缺失项" : "";
  const workEvent = {
    id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time: new Date().toISOString(),
    agent: projectName,
    kind: audit.mode === "failed" ? "error" : "tool",
    text: audit.mode === "native-and-proxy"
      ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${authorizationSuffix}${audit.warnings?.length ? `；${audit.warnings.join("；")}` : ""}`
      : audit.mode === "ccm-proxy-only"
        ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
        : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`,
    runtimeToolSync: audit,
  };
  if (audit.dispatch_gate.dispatchReady === false) {
    workEvent.kind = "error";
    workEvent.text = `${projectName} 工具授权派发已阻断：${audit.dispatch_gate.reason}`;
  }
  return { prompt, allowedTools, audit, workEvent, dispatchGate: audit.dispatch_gate, runtimeToolSnapshot: runtimeToolSnapshotFromAudit(audit, allowedTools) };
}

function sendRuntimeToolDispatchBlocked(res: any, toolContext: any) {
  const gate = toolContext?.dispatchGate || toolContext?.audit?.dispatch_gate || {};
  return sendJson(res, {
    success: false,
    error: gate.reason || "MCP/Skill 授权未就绪，已阻止派发子 Agent",
    runtime_tool_dispatch_gate: gate,
    runtime_tool_sync: toolContext?.audit || null,
  }, 409);
}

function ensureAgentRunnerDirs() {
  for (const dir of [AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function isSpawnPermissionError(error: any) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.stderr || ""}`;
  return /\bEPERM\b|spawnSync .* EPERM|spawn .* EPERM/i.test(text);
}

function nativeContinuationDoneFields(evidence: any) {
  return {
    requestedNativeSessionId: String(evidence?.requestedNativeSessionId || ""),
    returnedNativeSessionId: String(evidence?.returnedNativeSessionId || ""),
    effectiveNativeSessionId: String(evidence?.effectiveNativeSessionId || ""),
    nativeSessionEvidenceSource: String(evidence?.evidenceSource || "missing"),
    nativeResumeRequested: evidence?.nativeResumeRequested === true,
    nativeContinuationAcknowledged: evidence?.nativeContinuationAcknowledged === true,
    nativeSessionReusable: evidence?.nativeSessionReusable === true,
    providerOutputContractStatus: String(evidence?.providerOutputContractStatus || ""),
    providerOutputFormatFingerprint: String(evidence?.providerOutputFormatFingerprint || ""),
    providerRuntimeVersion: String(evidence?.providerRuntimeVersion || ""),
    providerRuntimeVersionStatus: String(evidence?.providerRuntimeVersionStatus || ""),
    providerContractId: String(evidence?.providerContractId || ""),
    expectedProviderContractId: String(evidence?.expectedProviderContractId || ""),
    providerContractTransition: evidence?.providerContractTransition === true,
    providerContractContinuityVerified: evidence?.providerContractContinuityVerified === true,
    nativeContinuationEvidence: evidence || null,
  };
}

function createAgentRunnerRequest(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
  ensureAgentRunnerDirs();
  const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const groupId = String(executionInfo?.groupId || executionInfo?.group_id || executionInfo?.toolScope?.groupId || executionInfo?.tool_scope?.group_id || "");
  const groupSessionId = String(executionInfo?.groupSessionId || executionInfo?.group_session_id || "");
  const sessionLifecycleFence = executionInfo?.sessionLifecycleFence || executionInfo?.session_lifecycle_fence || null;
  const runtimeToolPayload = buildAgentRunnerRuntimeToolPayload(allowedTools, mcpConfigPath, executionInfo);
  const request = {
    id,
    projectName,
    workDir,
    agentType: normalizeAgentRuntimeId(agentType || "claudecode"),
    timeoutMs,
    allowedTools,
    mcpConfigPath,
    agentSession: agentSession || null,
    taskId: String(executionInfo?.taskId || ""),
    executionId: String(executionInfo?.executionId || executionInfo?.taskId || ""),
    taskAgentSessionId: String(executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || ""),
    groupId,
    groupSessionId,
    sessionLifecycleFence,
    toolScope: {
      schema: "ccm-agent-runner-tool-scope-v1",
      scope: groupId ? "group-project" : "project",
      groupId,
      projectName,
    },
    runtimeToolSnapshot: runtimeToolPayload.runtimeToolSnapshot,
    runtimeToolDispatchGate: runtimeToolPayload.runtimeToolDispatchGate,
    runtimeToolSnapshotPath: runtimeToolPayload.runtimeToolSnapshotPath,
    runtimeToolSnapshotRequired: runtimeToolPayload.runtimeToolSnapshotRequired,
    skipVerification: executionInfo?.skipVerification === true,
    cliAllowedTools: buildAgentCliAllowedTools(projectName, message),
    message,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  const tmpFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.tmp`);
  const requestFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(request, null, 2), "utf-8");
  fs.renameSync(tmpFile, requestFile);
  return { id, requestFile, resultFile: path.join(AGENT_RUNNER_RESULTS_DIR, `${id}.json`) };
}

async function waitForAgentRunnerResult(resultFile: string, timeoutMs: number) {
  const started = Date.now();
  const pollMs = 1000;
  while (Date.now() - started < Math.max(1000, timeoutMs || 300000)) {
    if (fs.existsSync(resultFile)) {
      try {
        return JSON.parse(fs.readFileSync(resultFile, "utf-8").replace(/^\uFEFF/, ""));
      } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  throw new Error("外部 Agent Runner 等待超时；请运行 npm run agent-runner:ps 或 npm run agent-runner 启用外部执行通道");
}

function recordNativeCapacityRefreshOutcome(agentType: string, model: string, capabilityRecord: any, binding: any = {}) {
  const provider = normalizeAgentRuntimeId(agentType);
  const refreshed = capabilityRecord?.recorded === true;
  const supportsNativeMetadata = ["codex", "cursor"].includes(provider);
  return recordModelCapabilityRefreshOutcome({
    provider,
    model: capabilityRecord?.entry?.model || model || "",
    outcome: refreshed ? "refreshed" : supportsNativeMetadata ? "metadata_absent" : "unsupported",
    receiptEvidenceChecksum: capabilityRecord?.entry?.checksum || "",
    refreshRequest: capabilityRecord?.refreshRequest || null,
    reason: refreshed ? "verified_native_capability_receipt_recorded" : supportsNativeMetadata ? "native_execution_completed_without_model_capacity_metadata" : "runtime_has_no_supported_native_capacity_metadata_adapter",
    ...binding,
  });
}

async function callAgentViaExternalRunnerRaw(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
  const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
  if (executionInfo?.executionId) registerExternalRunnerRequest(executionInfo.executionId, request.id);
  executionInfo?.onRunnerRequestCreated?.(request.id);
  const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
  if (!result?.success) {
    const label = result?.command || getAgentCommandLabel(agentType);
    const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
    let persistedRequest: any = null;
    try { persistedRequest = JSON.parse(fs.readFileSync(request.requestFile, "utf-8")); } catch {}
    throw Object.assign(new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`), {
      runnerRequestId: request.id,
      runnerStarted: !!persistedRequest?.started_at && result?.runtimeToolDispatchBlocked !== true,
    });
  }
  const persistedContinuationEvidence = result.nativeContinuationEvidence || null;
  const persistedContinuationValidation = persistedContinuationEvidence
    ? verifyNativeSessionContinuationEvidence(persistedContinuationEvidence, {
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: request.id,
        requestedNativeSessionId: agentSession?.sessionId || "",
        expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
      })
    : { valid: false, issues: ["evidence_missing"] };
  const nativeContinuationEvidence = persistedContinuationValidation.valid
    ? persistedContinuationEvidence
    : buildNativeSessionContinuationEvidence({
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: request.id,
        requestedNativeSessionId: agentSession?.sessionId || "",
        returnedNativeSessionId: result.returnedNativeSessionId
          || (result.nativeSessionEvidenceSource === "provider_output" ? result.nativeSessionId : ""),
        providerOutputContractEvidence: result.providerOutputContractEvidence || null,
        providerRuntimeVersionSnapshot: result.providerRuntimeVersionSnapshot || null,
        expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
        nativeResumeRequested: agentSession?.resumeSession === true,
        runnerSuccess: true,
      });
  const nativeModelCapabilityRecord = result.nativeModelCapabilityReceipt
    ? recordVerifiedNativeModelCapabilityReceipt(result.nativeModelCapabilityReceipt, {
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: request.id,
        groupId: executionInfo?.groupId || executionInfo?.group_id || "",
        taskId: executionInfo?.taskId || "",
        executionId: executionInfo?.executionId || executionInfo?.taskId || "",
        taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
      })
    : null;
  const modelCapabilityRefreshOutcome = recordNativeCapacityRefreshOutcome(agentType, executionInfo?.model || executionInfo?.modelId || "", nativeModelCapabilityRecord, {
    runnerRequestId: request.id,
    taskId: executionInfo?.taskId || "",
    executionId: executionInfo?.executionId || executionInfo?.taskId || "",
    taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
    nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
  });
  return {
    output: String(result.output || "").trim(),
    fileChanges: result.fileChanges || null,
    usage: result.usage || null,
    runnerRequestId: request.id,
    nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
    ...nativeContinuationDoneFields(nativeContinuationEvidence),
    nativeModelCapabilityReceipt: result.nativeModelCapabilityReceipt || null,
    nativeModelCapabilityRecord,
    modelCapabilityRefreshOutcome,
  };
}

async function runManagedAgentContinuation(input: {
  projectName: string;
  prompt: string;
  workDir: string;
  agentType: string;
  timeoutMs: number;
  mcpConfigPath?: string;
  agentSession?: any;
  nativeSessionId?: string;
  taskId: string;
  executionId?: string;
  round: number;
  envAllowlist?: string[];
  maxOutputBytes?: number;
  maxContextOutputBytes?: number;
}) {
  const tmpMsg = path.join(UPLOAD_DIR, `_tool_continue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`);
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(tmpMsg, input.prompt, "utf-8");
  const sessionId = String(input.nativeSessionId || input.agentSession?.sessionId || "");
  const sessionOptions = {
    ...(input.agentSession || {}),
    persistSession: true,
    resumeSession: !!sessionId,
    sessionId,
  };
  try {
    const managed = await runManagedCommand({
      taskId: `${input.taskId}-tool-${input.round}`,
      executionId: input.executionId || "",
      command: buildAgentCommand(input.agentType, tmpMsg, {
        mcpConfigPath: input.mcpConfigPath,
        ...sessionOptions,
      }),
      cwd: (input.workDir || process.cwd()).replace(/\\/g, "/"),
      timeoutMs: input.timeoutMs || 300000,
      maxOutputBytes: Number(input.maxOutputBytes || 2 * 1024 * 1024),
      env: sanitizeExecutionEnv(getRuntimeExecutionEnv(input.agentType), input.envAllowlist || []),
      project: input.projectName,
      agentType: input.agentType,
      source: "tool-continuation",
      commandLabel: getAgentCommandLabel(input.agentType),
      title: `工具结果续跑第 ${input.round} 轮`,
    });
    const normalized = normalizeAgentCommandOutput(input.agentType, String(managed.stdout || "").trim());
    const failure = detectAgentCommandFailure(input.agentType, String(managed.stdout || "").trim(), 0, "");
    if (failure.failed) throw new Error(failure.message || "Agent 工具续跑失败");
    return {
      output: persistBoundedOutput(
        `${input.taskId}-tool-${input.round}`,
        normalized.output,
        Number(input.maxContextOutputBytes || 256 * 1024),
      ).content,
      nativeSessionId: normalized.sessionId || sessionId,
    };
  } finally {
    try { fs.unlinkSync(tmpMsg); } catch {}
  }
}

async function continueAgentToolCalls(input: {
  output: string;
  nativeSessionId?: string;
  projectName: string;
  workDir: string;
  agentType: string;
  timeoutMs: number;
  allowedTools?: any;
  mcpConfigPath?: string;
  agentSession?: any;
  groupId?: string;
  taskId: string;
  executionId?: string;
  envAllowlist?: string[];
  maxOutputBytes?: number;
  maxContextOutputBytes?: number;
  onEvent?: (event: any) => void;
  continueAgent?: (prompt: string, state: any) => Promise<{ output: string; nativeSessionId?: string }>;
}) {
  return runToolCallLoop({
    initialOutput: input.output,
    initialSessionId: input.nativeSessionId || input.agentSession?.sessionId || "",
    scope: input.allowedTools || undefined,
    runtime: normalizeAgentRuntimeId(input.agentType),
    project: input.projectName,
    groupId: input.groupId || "",
    taskId: input.taskId,
    executionId: input.executionId || "",
    source: input.groupId ? "group-agent" : "project-agent",
    maxRounds: 4,
    parseToolCalls: text => toolManager.parseToolCalls(text),
    executeToolCall: (name, args, scope) => toolManager.executeToolCall(name, args, scope),
    onEvent: input.onEvent,
    continueAgent: input.continueAgent || ((prompt, state) => runManagedAgentContinuation({
      projectName: input.projectName,
      prompt,
      workDir: input.workDir,
      agentType: input.agentType,
      timeoutMs: input.timeoutMs,
      mcpConfigPath: input.mcpConfigPath,
      agentSession: input.agentSession,
      nativeSessionId: state.nativeSessionId,
      taskId: input.taskId,
      executionId: input.executionId,
      round: state.round,
      envAllowlist: input.envAllowlist,
      maxOutputBytes: input.maxOutputBytes,
      maxContextOutputBytes: input.maxContextOutputBytes,
    })),
  });
}

async function callAgentViaExternalRunner(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
  const initial = await callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
  const loop = await continueAgentToolCalls({
    output: initial.output,
    nativeSessionId: initial.nativeSessionId,
    projectName,
    workDir,
    agentType,
    timeoutMs,
    allowedTools,
    mcpConfigPath,
    agentSession,
    taskId: String(executionInfo?.taskId || initial.runnerRequestId),
    executionId: String(executionInfo?.executionId || ""),
    groupId: String(executionInfo?.groupId || executionInfo?.group_id || ""),
    onEvent: executionInfo?.onToolEvent,
    continueAgent: async (prompt, state) => {
      const continuationSession = {
        ...(agentSession || {}),
        persistSession: true,
        resumeSession: !!state.nativeSessionId,
        sessionId: state.nativeSessionId || "",
      };
      const next = await callAgentViaExternalRunnerRaw(
        projectName,
        prompt,
        workDir,
        agentType,
        timeoutMs,
        allowedTools,
        mcpConfigPath,
        continuationSession,
        {
          ...executionInfo,
          taskId: `${executionInfo?.taskId || initial.runnerRequestId}-tool-${state.round}`,
          groupId: executionInfo?.groupId || executionInfo?.group_id || "",
          skipVerification: true,
        },
      );
      return { output: next.output, nativeSessionId: next.nativeSessionId || state.nativeSessionId };
    },
  });
  return { ...initial, output: loop.output, nativeSessionId: loop.nativeSessionId || initial.nativeSessionId };
}

async function callAgent(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget: any = null) {
  const background = workspaceTarget?.background === true || workspaceTarget?.silent === true;
  if (!background) setAgentActivity(
    projectName,
    workspaceTarget?.taskId || workspaceTarget?.executionId || workspaceTarget?.tab === "groups" ? "building" : "working",
    `${getAgentRuntime(agentType).label} 正在${workspaceTarget?.taskId || workspaceTarget?.executionId ? "执行任务" : "处理消息"}`,
    workspaceTarget || { tab: "projects", project: projectName },
    getAgentRunActivityDuration(timeoutMs),
    { runtime: agentType, actorKind: "third-party", displayName: `${projectName} · ${getAgentRuntime(agentType).label}` },
  );
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(tmpMsg, message, "utf-8");

  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: workspaceTarget?.mcpConfigPath, ...(workspaceTarget?.agentSession || {}) });
  const taskId = String(workspaceTarget?.taskId || workspaceTarget?.executionId || `standalone-${projectName}-${Date.now()}`);
  const executionId = String(workspaceTarget?.executionId || workspaceTarget?.taskId || "");
  const metricGroupId = String(workspaceTarget?.groupId || workspaceTarget?.group_id || "");
  const metricContext = {
    scopeType: metricGroupId ? "group" : "project",
    scopeId: metricGroupId || projectName,
    groupId: metricGroupId,
    role: String(workspaceTarget?.role || workspaceTarget?.agentRole || (metricGroupId ? "member_agent" : "project_agent")),
    source: String(workspaceTarget?.metricSource || workspaceTarget?.source || (metricGroupId ? "group-agent" : "project-agent")),
    runtime: agentType,
    traceId: workspaceTarget?.traceId || workspaceTarget?.trace_id || "",
    taskId,
    executionId,
  };
  const durableDirectDispatch = workspaceTarget?.durableDispatch === true
    ? createDirectAgentDispatchRequest({
        projectName,
        message,
        workDir,
        agentType,
        timeoutMs,
        taskId,
        executionId,
        taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
        groupId: metricGroupId,
        requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
        nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
      })
    : null;
  let durableDirectDispatchStarted = false;
  let durableDirectDispatchCompleted = false;
  if (durableDirectDispatch) {
    if (executionId) registerExternalRunnerRequest(executionId, durableDirectDispatch.id);
    workspaceTarget?.onRunnerRequestCreated?.(durableDirectDispatch.id);
  }

  try {
    const managed = await runManagedCommand({
      taskId,
      executionId,
      command: cmd,
      cwd: safeCwd,
      timeoutMs: timeoutMs || 300000,
      maxOutputBytes: Number(workspaceTarget?.maxOutputBytes || 2 * 1024 * 1024),
      env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), workspaceTarget?.envAllowlist || []),
      project: projectName,
      agentType,
      source: workspaceTarget?.probe ? "agent-probe" : "project-agent",
      commandLabel: getAgentCommandLabel(agentType),
      title: String(workspaceTarget?.title || message || "").slice(0, 120),
      onStarted: ({ pid, startedAt }) => {
        durableDirectDispatchStarted = true;
        if (durableDirectDispatch) markDirectAgentDispatchStarted(durableDirectDispatch.id, { runnerPid: pid, startedAt });
      },
      onStdout: (text) => {
        if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "stdout", { text });
      },
      onStderr: (text) => {
        if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "stderr", { text });
      },
    });
    try { fs.unlinkSync(tmpMsg); } catch {}
    const runtimeVersionSnapshot = captureAgentRuntimeVersionSnapshot(agentType);
    const normalized = normalizeAgentCommandOutput(agentType, managed.stdout, { runtimeVersionSnapshot });
    const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
      provider: normalizeAgentRuntimeId(agentType),
      runnerRequestId: durableDirectDispatch?.id || "",
      requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
      returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
      providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
      providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
      expectedProviderContractId: workspaceTarget?.agentSession?.expectedProviderContractId || workspaceTarget?.agentSession?.providerContractId || "",
      nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
      runnerSuccess: true,
    });
    const nativeModelCapabilityReceipt = extractNativeModelCapabilityReceipt(agentType, managed.stdout, {
      runner: "direct-cli",
      runnerRequestId: durableDirectDispatch?.id || "",
      groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
      taskId,
      executionId,
      taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
      nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
    });
    const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
      ? recordVerifiedNativeModelCapabilityReceipt(nativeModelCapabilityReceipt, {
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: durableDirectDispatch?.id || "",
          groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
          taskId,
          executionId,
          model: workspaceTarget?.model || workspaceTarget?.modelId || "",
          taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
          nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        })
      : null;
    const modelCapabilityRefreshOutcome = recordNativeCapacityRefreshOutcome(agentType, workspaceTarget?.model || workspaceTarget?.modelId || "", nativeModelCapabilityRecord, {
      taskId,
      executionId,
      taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
      nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
    });
    const bounded = persistBoundedOutput(taskId, normalized.output, Number(workspaceTarget?.maxContextOutputBytes || 256 * 1024));
    if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
    const toolLoop = await continueAgentToolCalls({
      output: bounded.content,
      nativeSessionId: nativeContinuationEvidence.nativeSessionReusable
        ? normalized.sessionId || workspaceTarget?.agentSession?.sessionId || ""
        : "",
      projectName,
      workDir,
      agentType,
      timeoutMs: timeoutMs || 300000,
      allowedTools: workspaceTarget?.allowedTools,
      mcpConfigPath: workspaceTarget?.mcpConfigPath,
      agentSession: workspaceTarget?.agentSession,
      taskId,
      executionId,
      envAllowlist: workspaceTarget?.envAllowlist || [],
      maxOutputBytes: workspaceTarget?.maxOutputBytes,
      maxContextOutputBytes: workspaceTarget?.maxContextOutputBytes,
    });
    if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "tool_loop_completed", { nativeSessionId: toolLoop.nativeSessionId || normalized.sessionId || "" });
    let output = toolLoop.output;
    if (!workspaceTarget?.skipIndependentVerification && !background && !/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
      if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "verification_started", { projectName });
      output += await runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType);
      if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "verification_completed", { projectName });
    }
    const fileChanges = getFileChanges(projectName, changeSnapshot);
    const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
      ? toolLoop.nativeSessionId || normalized.sessionId || workspaceTarget?.agentSession?.sessionId || ""
      : "";
    if (durableDirectDispatch) {
      completeDirectAgentDispatch(durableDirectDispatch.id, {
        success: true,
        output,
        nativeSessionId: durableNativeSessionId,
        nativeContinuationEvidence,
        nativeModelCapabilityReceipt,
        nativeModelCapabilityRecord,
        exitCode: managed.exitCode,
        signal: managed.signal,
      });
      durableDirectDispatchCompleted = true;
    }
    workspaceTarget?.onDone?.({
      runnerRequestId: durableDirectDispatch?.id || "",
      nativeSessionId: durableNativeSessionId,
      ...nativeContinuationDoneFields(nativeContinuationEvidence),
      nativeModelCapabilityReceipt,
      nativeModelCapabilityRecord,
      modelCapabilityRefreshOutcome,
      isError: false,
      runnerStarted: durableDirectDispatch ? durableDirectDispatchStarted : true,
      fileChanges,
    });
    recordMetric(projectName, {
      ...metricContext,
      success: true,
      durationMs: Date.now() - startedAt,
      fileChangeCount: fileChanges?.count || 0,
      usage: normalized.usage || null,
    });
    if (!background) {
      broadcastPetSpeech(projectName, { role: "assistant", text: output, final: true, source: "project" });
      setAgentActivity(projectName, "happy", "任务完成");
      setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
    }
    return output;
  } catch (e: any) {
    try { fs.unlinkSync(tmpMsg); } catch {}
    const failedDirectContinuationEvidence = buildNativeSessionContinuationEvidence({
      provider: normalizeAgentRuntimeId(agentType),
      runnerRequestId: durableDirectDispatch?.id || "",
      requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
      nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
      runnerSuccess: false,
    });
    if (durableDirectDispatch && durableDirectDispatchStarted && !durableDirectDispatchCompleted) {
      completeDirectAgentDispatch(durableDirectDispatch.id, {
        success: false,
        error: String(e?.message || e),
        output: String(e?.stdout || e?.stderr || e?.message || ""),
        exitCode: e?.exitCode,
        signal: e?.signal,
        nativeContinuationEvidence: failedDirectContinuationEvidence,
      });
      durableDirectDispatchCompleted = true;
    }
    if (isSpawnPermissionError(e)) {
      try {
        const runner = await callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, workspaceTarget?.allowedTools, workspaceTarget?.mcpConfigPath, workspaceTarget?.agentSession, {
          taskId,
          executionId,
          taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
          groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
          groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
          sessionLifecycleFence: workspaceTarget?.sessionLifecycleFence || workspaceTarget?.session_lifecycle_fence || null,
          model: workspaceTarget?.model || workspaceTarget?.modelId || "",
          runtimeToolSnapshot: workspaceTarget?.runtimeToolSnapshot || workspaceTarget?.runtime_tool_snapshot || null,
          runtimeToolDispatchGate: workspaceTarget?.runtimeToolDispatchGate || workspaceTarget?.runtime_tool_dispatch_gate || workspaceTarget?.dispatchGate || null,
          onRunnerRequestCreated: workspaceTarget?.onRunnerRequestCreated,
        });
        const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
        workspaceTarget?.onDone?.({
          runnerRequestId: runner.runnerRequestId || "",
          nativeSessionId: runner.nativeSessionId || "",
          ...nativeContinuationDoneFields(runner.nativeContinuationEvidence),
          nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null,
          nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null,
          modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null,
          isError: false,
          runnerStarted: true,
          fileChanges,
        });
        recordMetric(projectName, {
          ...metricContext,
          success: true,
          durationMs: Date.now() - startedAt,
          fileChangeCount: fileChanges?.count || 0,
          usage: runner.usage || null,
        });
        if (!background) {
          broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "project" });
          setAgentActivity(projectName, "happy", "外部 Runner 任务完成");
          setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        }
        return runner.output;
      } catch (runnerError: any) {
        const failedContinuationEvidence = buildNativeSessionContinuationEvidence({
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: runnerError?.runnerRequestId || "",
          requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
          nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
          runnerSuccess: false,
        });
        workspaceTarget?.onDone?.({ runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), isError: true, error: runnerError?.message || String(runnerError) });
        const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
        recordMetric(projectName, {
          ...metricContext,
          success: false,
          durationMs: Date.now() - startedAt,
          fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
          error: runnerError?.message || String(runnerError),
        });
        if (!background) {
          broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
          setAgentActivity(projectName, "error", "外部 Runner 错误");
        }
        return output;
      }
    }
    const output = e.killed || e.signal === "SIGTERM"
      ? `[${projectName}] Agent 响应超时，请稍后重试`
      : `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
    workspaceTarget?.onDone?.({ runnerRequestId: durableDirectDispatch?.id || "", runnerStarted: durableDirectDispatchStarted, nativeSessionId: failedDirectContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedDirectContinuationEvidence), isError: true, error: e?.message || String(e) });
    recordMetric(projectName, {
      ...metricContext,
      success: false,
      durationMs: Date.now() - startedAt,
      fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
      error: e?.message || String(e),
    });
    if (!background) {
      broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
      setAgentActivity(projectName, "error", "错误");
    }
    return output;
  }
}

function callAgentForGroupStream(projectName: string, message: string, workDir: string, agentType: string, options: any = {}) {
  const groupId = options.groupId;
  setAgentActivity(
    projectName,
    options.petState || "building",
    options.detail || `${getAgentRuntime(agentType).label} 正在执行协作任务`,
    groupId ? { tab: "groups", groupId } : { tab: "groups" },
    getAgentRunActivityDuration(options.timeoutMs),
    { runtime: agentType, actorKind: options.actorKind || "third-party", displayName: options.petDisplayName || `${projectName} · ${getAgentRuntime(agentType).label}`, source: "group" },
  );
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(tmpMsg, message, "utf-8");
  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...(options.agentSession || {}) });
  const taskId = String(options.taskId || options.executionId || `standalone-${projectName}-${Date.now()}`);
  const executionId = String(options.executionId || options.taskId || "");
  const metricContext = {
    scopeType: groupId ? "group" : "project",
    scopeId: groupId || projectName,
    groupId: String(groupId || ""),
    role: String(options.role || options.agentRole || "member_agent"),
    source: String(options.metricSource || options.source || "group-agent"),
    runtime: agentType,
    traceId: options.traceId || options.trace_id || "",
    taskId,
    executionId,
  };
  const durableGroupDispatch = options.durableDispatch === true
    ? createDirectAgentDispatchRequest({
        projectName,
        message,
        workDir,
        agentType,
        timeoutMs: options.timeoutMs || 300_000,
        taskId,
        executionId,
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        groupId: String(groupId || ""),
        requestedNativeSessionId: options.agentSession?.sessionId || "",
        nativeResumeRequested: options.agentSession?.resumeSession === true,
      })
    : null;
  let durableGroupDispatchStarted = false;
  let durableGroupDispatchCompleted = false;
  if (durableGroupDispatch) {
    if (executionId) registerExternalRunnerRequest(executionId, durableGroupDispatch.id);
    options.onRunnerRequestCreated?.(durableGroupDispatch.id);
  }
  const streamRes = options.res;
  const workEvents: any[] = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
  const pushWorkEvent = (kind: string, text: string, extra: any = {}) => {
    const event = {
      id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      agent: projectName,
      kind,
      text: String(text || "").slice(0, 2400),
      ...extra,
    };
    workEvents.push(event);
    if (workEvents.length > 80) workEvents.splice(0, workEvents.length - 80);
    writeSse(streamRes, { type: "agent_work_event", agent: projectName, event });
    return event;
  };
  const thinkingText = `🧠 ${projectName} 正在思考...`;
  pushWorkEvent("status", thinkingText);
  writeSse(streamRes, { type: "status", text: thinkingText, agent: projectName });
  broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 正在思考...`, source: "group" });

  return new Promise<string>((resolve) => {
    let child: any = null;
    let stopTracking = () => {};
    try {
      child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), options.envAllowlist || []) });
      child.once("spawn", () => {
        durableGroupDispatchStarted = true;
        if (durableGroupDispatch) markDirectAgentDispatchStarted(durableGroupDispatch.id, { runnerPid: child.pid, startedAt: new Date().toISOString() });
      });
      stopTracking = trackManagedChildProcess(taskId, executionId, child, {
        project: projectName,
        agentType,
        source: options.probe ? "agent-probe" : "group-agent",
        cwd: safeCwd,
        timeoutMs: options.timeoutMs || 300000,
        commandLabel: getAgentCommandLabel(agentType),
        title: String(options.title || message || "").slice(0, 120),
      });
    } catch (spawnError: any) {
      if (durableGroupDispatch && !durableGroupDispatchCompleted) {
        completeDirectAgentDispatch(durableGroupDispatch.id, { success: false, error: String(spawnError?.message || spawnError) });
        durableGroupDispatchCompleted = true;
      }
      if (!isSpawnPermissionError(spawnError)) {
        const text = `❌ 错误: ${spawnError.message || spawnError}`;
        recordMetric(projectName, { ...metricContext, success: false, durationMs: Date.now() - startedAt, fileChangeCount: 0, error: spawnError?.message || String(spawnError) });
        writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
        resolve(text);
        return;
      }
      const runnerText = `🧩 ${projectName} 交给外部 Agent Runner 执行...`;
      pushWorkEvent("status", runnerText);
      writeSse(streamRes, { type: "status", text: runnerText, agent: projectName });
      callAgentViaExternalRunner(projectName, message, workDir, agentType, options.timeoutMs || 300000, options.allowedTools, options.mcpConfigPath, options.agentSession, {
        taskId,
        executionId,
        model: options.model || options.modelId || "",
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        groupId: options.groupId || options.group_id || "",
        groupSessionId: options.groupSessionId || options.group_session_id || "",
        sessionLifecycleFence: options.sessionLifecycleFence || options.session_lifecycle_fence || null,
        runtimeToolSnapshot: options.runtimeToolSnapshot || options.runtime_tool_snapshot || null,
        runtimeToolDispatchGate: options.runtimeToolDispatchGate || options.runtime_tool_dispatch_gate || options.dispatchGate || null,
        onRunnerRequestCreated: options.onRunnerRequestCreated,
        onToolEvent: (event: any) => pushWorkEvent(
          event.type === "tool_result" ? "tool_result" : "status",
          event.text,
          { tool: event.tool || "", round: event.round, ok: event.ok },
        ),
      })
        .then((runner) => {
          const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
          recordMetric(projectName, {
            ...metricContext,
            success: true,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0,
            usage: runner.usage || null,
          });
          try {
            if (typeof options.onDone === "function") {
              pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
              options.onDone({ text: runner.output, fileChanges, isError: false, runnerStarted: true, runnerRequestId: runner.runnerRequestId, nativeSessionId: runner.nativeSessionId || "", ...nativeContinuationDoneFields(runner.nativeContinuationEvidence), nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null, nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null, modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null, workEvents });
            }
          } catch {}
          writeSse(streamRes, { type: "agent_done", agent: projectName, text: runner.output, fileChanges, messageId: options.messageId, workEvents });
          broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "group" });
          setAgentActivity(projectName, "happy", "外部 Runner 回复完成");
          setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
          resolve(runner.output);
        })
        .catch((runnerError: any) => {
          const text = `❌ Agent Runner 错误: ${runnerError.message || runnerError}`;
          recordMetric(projectName, {
            ...metricContext,
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
            error: runnerError?.message || String(runnerError),
          });
          try {
            if (typeof options.onDone === "function") {
              pushWorkEvent("error", text, { final: true });
              const failedContinuationEvidence = buildNativeSessionContinuationEvidence({
                provider: normalizeAgentRuntimeId(agentType),
                runnerRequestId: runnerError?.runnerRequestId || "",
                requestedNativeSessionId: options.agentSession?.sessionId || "",
                nativeResumeRequested: options.agentSession?.resumeSession === true,
                runnerSuccess: false,
              });
              options.onDone({ text, fileChanges: null, isError: true, runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), workEvents });
            }
          } catch {}
          writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
          broadcastPetSpeech(projectName, { role: "error", text, final: true, source: "group" });
          setAgentActivity(projectName, "error", "外部 Runner 错误");
          resolve(text);
        });
      return;
    }
    child.stdin.end();

    let output = "";
    let stderrOutput = "";
    let settled = false;
    const timeoutId = setTimeout(() => {
      try { if (child?.exitCode === null && child?.signalCode === null) terminateManagedChildProcess(child); } catch {}
      finish("⏰ 响应超时", true).catch(() => {});
    }, options.timeoutMs || 300000);

    const finish = async (text: string, isError = false) => {
      if (settled) return;
      settled = true;
      stopTracking();
      clearTimeout(timeoutId);
      try { if (child) terminateManagedChildProcess(child); } catch {}
      try { fs.unlinkSync(tmpMsg); } catch {}
      let finalText = text || output.trim();
      const normalized = isError
        ? { output: finalText, sessionId: "", rawSessionId: "", providerOutputContractEvidence: null }
        : normalizeAgentCommandOutput(agentType, finalText, { runtimeVersionSnapshot: captureAgentRuntimeVersionSnapshot(agentType) });
      const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: durableGroupDispatch?.id || "",
        requestedNativeSessionId: options.agentSession?.sessionId || "",
        returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
        providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
        providerRuntimeVersionSnapshot: normalized.providerOutputContractEvidence?.runtimeVersionSnapshot || null,
        expectedProviderContractId: options.agentSession?.expectedProviderContractId || options.agentSession?.providerContractId || "",
        nativeResumeRequested: options.agentSession?.resumeSession === true,
        runnerSuccess: !isError,
      });
      const nativeModelCapabilityReceipt = isError ? null : extractNativeModelCapabilityReceipt(agentType, output, {
        runner: "direct-cli",
        runnerRequestId: durableGroupDispatch?.id || "",
        groupId: options.groupId || options.group_id || "",
        taskId,
        executionId,
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
      });
      const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
        ? recordVerifiedNativeModelCapabilityReceipt(nativeModelCapabilityReceipt, {
            provider: normalizeAgentRuntimeId(agentType),
            runnerRequestId: durableGroupDispatch?.id || "",
            groupId: options.groupId || options.group_id || "",
            taskId,
            executionId,
            taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
          })
        : null;
      const modelCapabilityRefreshOutcome = isError ? null : recordNativeCapacityRefreshOutcome(agentType, options.model || options.modelId || "", nativeModelCapabilityRecord, {
        taskId,
        executionId,
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
      });
      finalText = normalized.output;
      finalText = persistBoundedOutput(taskId, finalText, Number(options.maxContextOutputBytes || 256 * 1024)).content;
      if (!isError) {
        if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
        const toolLoop = await continueAgentToolCalls({
          output: finalText,
          nativeSessionId: nativeContinuationEvidence.nativeSessionReusable
            ? normalized.sessionId || options.agentSession?.sessionId || ""
            : "",
          projectName,
          workDir,
          agentType,
          timeoutMs: options.timeoutMs || 300000,
          allowedTools: options.allowedTools,
          mcpConfigPath: options.mcpConfigPath,
          agentSession: options.agentSession,
          groupId: options.groupId || options.group_id || "",
          taskId,
          executionId,
          envAllowlist: options.envAllowlist || [],
          maxOutputBytes: options.maxOutputBytes,
          maxContextOutputBytes: options.maxContextOutputBytes,
          onEvent: (event: any) => pushWorkEvent(
            event.type === "tool_result" ? "tool_result" : "status",
            event.text,
            { tool: event.tool || "", round: event.round, ok: event.ok },
          ),
        });
        finalText = toolLoop.output;
        normalized.sessionId = toolLoop.nativeSessionId || normalized.sessionId;
        if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "tool_loop_completed", { nativeSessionId: normalized.sessionId || "" });
        if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
          if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "verification_started", { projectName });
          finalText += await runIndependentProjectVerification(projectName, workDir, options.timeoutMs || 300000, taskId, executionId, agentType);
          if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "verification_completed", { projectName });
        }
      }
      const fileChanges = getFileChanges(projectName, changeSnapshot);
      const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
        ? normalized.sessionId || options.agentSession?.sessionId || ""
        : "";
      if (durableGroupDispatch && durableGroupDispatchStarted && !durableGroupDispatchCompleted) {
        completeDirectAgentDispatch(durableGroupDispatch.id, {
          success: !isError,
          output: finalText,
          error: isError ? finalText : "",
          nativeSessionId: durableNativeSessionId,
          nativeContinuationEvidence,
          nativeModelCapabilityReceipt,
          nativeModelCapabilityRecord,
        });
        durableGroupDispatchCompleted = true;
      }
      recordMetric(projectName, {
        ...metricContext,
        success: !isError,
        durationMs: Date.now() - startedAt,
        fileChangeCount: fileChanges?.count || 0,
        usage: (normalized as any).usage || null,
        error: isError ? finalText : "",
      });
      try {
        if (typeof options.onDone === "function") {
          pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
          options.onDone({ text: finalText, fileChanges, isError, runnerRequestId: durableGroupDispatch?.id || "", runnerStarted: durableGroupDispatch ? durableGroupDispatchStarted : true, nativeSessionId: durableNativeSessionId, ...nativeContinuationDoneFields(nativeContinuationEvidence), nativeModelCapabilityReceipt, nativeModelCapabilityRecord, modelCapabilityRefreshOutcome, workEvents });
        }
      } catch {}
      writeSse(streamRes, { type: "agent_done", agent: projectName, text: finalText, fileChanges, messageId: options.messageId, workEvents });
      broadcastPetSpeech(projectName, { role: isError ? "error" : "assistant", text: finalText, final: true, source: "group" });
      setAgentActivity(projectName, isError ? "error" : "happy", isError ? "错误" : "群聊回复完成");
      setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
      resolve(finalText);
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      if (!text) return;
      output += text;
      if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "stdout", { text });
      const jsonSessionStream = ["codex", "cursor"].includes(normalizeAgentRuntimeId(agentType)) && !!options.agentSession?.persistSession;
      if (!jsonSessionStream) {
        pushWorkEvent("output", text);
        writeSse(streamRes, { type: "chunk", agent: projectName, text });
        broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "stderr", { text });
      stderrOutput = (stderrOutput + text).slice(-12000);
      if (text.trim() && !output.trim()) {
        const runningText = `🧠 ${projectName} 运行中...`;
        pushWorkEvent("status", runningText);
        writeSse(streamRes, { type: "status", text: runningText, agent: projectName });
        broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 运行中...`, source: "group" });
      }
    });

    child.on("close", (code) => {
      const failed = typeof code === "number" && code !== 0;
      const text = failed ? (output.trim() || stderrOutput.trim() || `Agent 进程退出，exitCode=${code}`) : output.trim();
      finish(text, failed).catch((err) => finish(`❌ 错误: ${err.message}`, true));
    });
    child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => {}); });
  });
}

// 流式调用 Agent（SSE）
function callAgentStream(projectName: string, message: string, workDir: string, agentType: string, res: any, options: any = {}) {
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const projectRun = createProjectChatRun(projectName, options.userMessage || message, workDir, String(options.parentRunId || options.parent_run_id || ""));
  const { session: taskAgentSession, options: taskAgentSessionOptions } = bindProjectRunAgentSession(projectRun, projectName, agentType);
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  const executionBrief = buildProjectExecutionBrief(projectName, options.userMessage || message, {
    workDir,
    query: options.userMessage || message,
    verificationHints: getProjectVerificationCommandsForRunner(projectName),
  });
  fs.writeFileSync(tmpMsg, executionBrief, "utf-8");

  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...taskAgentSessionOptions });

  const send = (data: any) => writeSse(res, data);
  const workEvents: any[] = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
  const pushProjectWorkEvent = (kind: string, text: string, extra: any = {}) => {
    const event = {
      id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      agent: projectName,
      kind,
      text: String(text || "").slice(0, 2400),
      ...extra,
    };
    workEvents.push(event);
    if (workEvents.length > 80) workEvents.splice(0, workEvents.length - 80);
    send({ type: "work_event", event });
    return event;
  };

  // 设置 SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  send({ type: "task_runtime", run: publicProjectChatRun(projectRun), taskExperience: {
    task_id: projectRun.id,
    trace_id: projectRun.trace_id,
    title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
    goal: String(options.userMessage || "").slice(0, 240),
    status: "in_progress",
    phase: "executing",
    session_ids: [taskAgentSession.id],
    parent_run_id: projectRun.parent_run_id || "",
    rollback_available: !!projectRun.checkpoint_id,
  } });
  for (const event of workEvents) send({ type: "work_event", event });

  // 发送状态事件
  pushProjectWorkEvent("status", "Agent 正在思考...");
  send({ type: "status", text: "Agent 正在思考..." });
  broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
  setAgentActivity(projectName, "working", "正在处理消息", null, getAgentRunActivityDuration(300000));

  const child = spawn(cmd, [], {
    shell: true,
    cwd: safeCwd,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), options.envAllowlist || []),
  });
  const stopProjectChatTracking = trackManagedChildProcess(projectRun.id, projectRun.id, child, {
    project: projectName,
    agentType,
    source: "project-chat",
    cwd: safeCwd,
    timeoutMs: 300000,
    commandLabel: getAgentCommandLabel(agentType),
    title: String(options.userMessage || message || "").slice(0, 120),
  });
  projectRun.child = child;
  projectRun.updated_at = new Date().toISOString();
  saveProjectChatRuns();

  // 关闭 stdin（已通过临时文件传入）
  child.stdin.end();

  let fullOutput = "";
  let stderrOutput = "";
  let finished = false;
  let timeoutTimer: any = null;
  let lastStderrStatusAt = 0;
  const jsonSessionStream = ["codex", "cursor"].includes(normalizeAgentRuntimeId(agentType)) && !!taskAgentSessionOptions.persistSession;
  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      try { res.write(": keep-alive\n\n"); } catch {}
    }
  }, 15000);

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString("utf-8");
    if (!text) return;
    fullOutput += text;
    if (jsonSessionStream) return;
    pushProjectWorkEvent("output", text);
    send({ type: "chunk", text });
    broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "project" });
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString("utf-8");
    stderrOutput += text;
    const now = Date.now();
    if (text.trim() && now - lastStderrStatusAt > 1500) {
      lastStderrStatusAt = now;
      pushProjectWorkEvent("status", "Agent 处理中...");
      send({ type: "status", text: "Agent 处理中..." });
      broadcastPetSpeech(projectName, { role: "status", text: "Agent 处理中...", source: "project" });
    }
  });

  child.on("close", (code) => {
    if (finished) return;
    finished = true;
    stopProjectChatTracking();
    if (timeoutTimer) clearTimeout(timeoutTimer);
    clearInterval(heartbeatTimer);
    (async () => {
      try { fs.unlinkSync(tmpMsg); } catch {}
      const runtimeVersionSnapshot = captureAgentRuntimeVersionSnapshot(agentType);
      const normalized = normalizeAgentCommandOutput(agentType, fullOutput.trim(), { runtimeVersionSnapshot });
      const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
        provider: normalizeAgentRuntimeId(agentType),
        requestedNativeSessionId: taskAgentSessionOptions.sessionId || "",
        returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
        providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
        providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
        expectedProviderContractId: taskAgentSessionOptions.expectedProviderContractId || taskAgentSessionOptions.providerContractId || "",
        nativeResumeRequested: taskAgentSessionOptions.resumeSession === true,
        runnerSuccess: code === 0,
      });
      const nativeFailure = detectAgentCommandFailure(agentType, fullOutput.trim(), code, stderrOutput);
      let displayOutput = normalized.output || fullOutput.trim();
      if (nativeFailure.failed) {
        const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: false, error: nativeFailure.message }) || taskAgentSession;
        projectRun.native_session_id = failedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        if (jsonSessionStream && displayOutput) {
          pushProjectWorkEvent("output", displayOutput);
          send({ type: "chunk", text: displayOutput });
        }
        const fileChanges = getFileChanges(projectName, changeSnapshot);
        projectRun.status = "failed";
        projectRun.fileChanges = fileChanges;
        projectRun.workEvents = workEvents;
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        recordMetric(projectName, {
          success: false,
          durationMs: Date.now() - startedAt,
          fileChangeCount: fileChanges?.count || 0
        });
        setAgentActivity(projectName, "error", "执行失败");
        pushProjectWorkEvent("error", nativeFailure.message || "Agent 执行失败", { final: true, fileChanges });
        send({ type: "error", text: nativeFailure.message || "Agent 执行失败", fileChanges, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
          task_id: projectRun.id,
          trace_id: projectRun.trace_id,
          title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
          goal: String(options.userMessage || "").slice(0, 240),
          status: "failed",
          phase: "failed",
          session_ids: [failedSession.id],
          parent_run_id: projectRun.parent_run_id || "",
          rollback_available: !!projectRun.checkpoint_id,
        } });
        res.end();
        return;
      }
      let updatedSession = recordTaskAgentSessionTurn(taskAgentSession.id, {
        nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
        nativeContinuationEvidence,
        success: true,
        nativeContinuationUnverified: taskAgentSessionOptions.resumeSession === true
          && nativeContinuationEvidence.nativeContinuationAcknowledged !== true,
      }) || taskAgentSession;
      projectRun.native_session_id = updatedSession.nativeSessionId || "";
      projectRun.resume_mode = updatedSession.resumeMode || projectRun.resume_mode || "";
      if (jsonSessionStream && displayOutput) {
        pushProjectWorkEvent("output", displayOutput);
        send({ type: "chunk", text: displayOutput });
      }
      const toolLoop = await continueAgentToolCalls({
        output: displayOutput,
        nativeSessionId: updatedSession.nativeSessionId || normalized.sessionId || "",
        projectName,
        workDir,
        agentType,
        timeoutMs: 300000,
        allowedTools: options.allowedTools,
        mcpConfigPath: options.mcpConfigPath,
        agentSession: taskAgentSessionOptions,
        groupId: "",
        taskId: projectRun.id,
        executionId: projectRun.id,
        onEvent: (event: any) => pushProjectWorkEvent(
          event.type === "tool_result" ? "tool_result" : "status",
          event.text,
          { tool: event.tool || "", round: event.round, ok: event.ok },
        ),
      });
      const outputWithTools = toolLoop.output;
      if (toolLoop.nativeSessionId && toolLoop.nativeSessionId !== updatedSession.nativeSessionId) {
        updatedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { nativeSessionId: toolLoop.nativeSessionId, success: true }) || updatedSession;
        projectRun.native_session_id = updatedSession.nativeSessionId || toolLoop.nativeSessionId;
        projectRun.resume_mode = updatedSession.resumeMode || projectRun.resume_mode || "";
      }
      const toolAppend = outputWithTools.slice(displayOutput.length);
      if (toolAppend) {
        pushProjectWorkEvent("output", toolAppend);
          send({ type: "chunk", text: toolAppend });
        broadcastPetSpeech(projectName, { role: "assistant", text: toolAppend, mode: "append", source: "project" });
      }
      broadcastPetSpeech(projectName, { role: "assistant", text: "", mode: "append", final: true, source: "project" });
      const fileChanges = getFileChanges(projectName, changeSnapshot);
      projectRun.status = "done";
      projectRun.fileChanges = fileChanges;
      projectRun.workEvents = workEvents;
      projectRun.updated_at = new Date().toISOString();
      saveProjectChatRuns();
      recordMetric(projectName, {
        success: true,
        durationMs: Date.now() - startedAt,
        fileChangeCount: fileChanges?.count || 0
      });
      setAgentActivity(projectName, "happy", "任务完成");
      setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
      pushProjectWorkEvent("done", "执行完成", { final: true, fileChanges });
      send({ type: "done", fileChanges, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
        task_id: projectRun.id,
        trace_id: projectRun.trace_id,
        title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
        goal: String(options.userMessage || "").slice(0, 240),
        status: "done",
        phase: "completed",
        session_ids: [updatedSession.id],
        parent_run_id: projectRun.parent_run_id || "",
        rollback_available: !!projectRun.checkpoint_id,
      } });
      res.end();
    })().catch((err) => {
      pushProjectWorkEvent("error", err.message, { final: true });
        const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
        projectRun.status = "failed";
        projectRun.workEvents = workEvents;
        projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
          task_id: projectRun.id,
          trace_id: projectRun.trace_id,
          title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
          goal: String(options.userMessage || "").slice(0, 240),
          status: "failed",
          phase: "failed",
          session_ids: [failedSession.id],
          parent_run_id: projectRun.parent_run_id || "",
          rollback_available: !!projectRun.checkpoint_id,
        } });
      try { res.end(); } catch {}
    });
  });

  child.on("error", (err) => {
    if (finished) return;
    finished = true;
    stopProjectChatTracking();
    if (timeoutTimer) clearTimeout(timeoutTimer);
    clearInterval(heartbeatTimer);
    try { fs.unlinkSync(tmpMsg); } catch {}
    pushProjectWorkEvent("error", err.message, { final: true });
    const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
    projectRun.status = "failed";
    projectRun.workEvents = workEvents;
    projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
    projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
    projectRun.updated_at = new Date().toISOString();
    saveProjectChatRuns();
        send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
          task_id: projectRun.id,
          trace_id: projectRun.trace_id,
          title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
          goal: String(options.userMessage || "").slice(0, 240),
          status: "failed",
          phase: "failed",
          session_ids: [failedSession.id],
          parent_run_id: projectRun.parent_run_id || "",
          rollback_available: !!projectRun.checkpoint_id,
        } });
    recordMetric(projectName, {
      success: false,
      durationMs: Date.now() - startedAt,
      fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0
    });
    broadcastPetSpeech(projectName, { role: "error", text: err.message, final: true, source: "project" });
    setAgentActivity(projectName, "error", "错误");
    res.end();
  });

  // 超时处理
  timeoutTimer = setTimeout(() => {
    if (finished) return;
    finished = true;
    stopProjectChatTracking();
    clearInterval(heartbeatTimer);
    try { child.kill(); } catch {}
    try { fs.unlinkSync(tmpMsg); } catch {}
    const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: "Agent 响应超时" }) || taskAgentSession;
    projectRun.status = "failed";
    projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
    projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
    projectRun.updated_at = new Date().toISOString();
    saveProjectChatRuns();
    send({ type: "error", text: "Agent 响应超时", run: publicProjectChatRun(projectRun), taskExperience: {
      task_id: projectRun.id,
      trace_id: projectRun.trace_id,
      title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
      goal: String(options.userMessage || "").slice(0, 240),
      status: "failed",
      phase: "failed",
      session_ids: [failedSession.id],
      parent_run_id: projectRun.parent_run_id || "",
      rollback_available: !!projectRun.checkpoint_id,
    } });
    res.end();
  }, 300000);
}

// === HTTP 静态服务逻辑 ===
function sendFile(res: any, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
    ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
    ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
    ".map": "application/json",
  };
  const contentType = types[ext] || "application/octet-stream";

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const headers: Record<string, string> = { "Content-Type": contentType };
  if (ext === ".html") headers["Content-Type"] = "text/html; charset=utf-8";
  if (ext === ".js" || ext === ".css") headers["Cache-Control"] = "public, max-age=31536000, immutable";
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

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
    const handleStreamSend = (project: string, message: string, files: any[] = [], parentRunId = "") => {
      const finalMessage = files && files.length > 0
        ? `${message || ""}${buildUploadedFilesContext(files, "本次消息附件")}`
        : (message || "");
      if (!project || !finalMessage.trim()) return sendJson(res, { error: "参数不足" }, 400);
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      const configuredAgentType = info[0]?.agent || "claudecode";
      const resolvedRuntime = resolveAvailableAgentRuntime(configuredAgentType);
      const agentType = resolvedRuntime.selected;
      const toolContext = buildProjectToolContext(project, workDir, agentType);
      if (toolContext.dispatchGate?.dispatchReady === false) return sendRuntimeToolDispatchBlocked(res, toolContext);
      if (resolvedRuntime.switched) {
        toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
        (toolContext.workEvent as any).runtimeFallback = resolvedRuntime;
      }
      const fullMessage = `${toolContext.prompt}\n\n${finalMessage}`;
      callAgentStream(project, fullMessage, workDir, agentType, res, {
        allowedTools: toolContext.allowedTools,
        mcpConfigPath: toolContext.audit.mcpConfigPath,
        runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
        runtimeToolDispatchGate: toolContext.dispatchGate,
        initialWorkEvents: [toolContext.workEvent],
        userMessage: finalMessage,
        parentRunId,
      });
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = parseMultipart(buffer, boundary);
          handleStreamSend((fields as any).project, (fields as any).message, files, String((fields as any).parent_run_id || (fields as any).parentRunId || ""));
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
        const { project, message, parent_run_id, parentRunId } = JSON.parse(body);
        handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""));
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
  const petGenerationRecovery = recoverPetGenerationJobs();
  if (petGenerationRecovery.recovered > 0) console.log(`[宠物生成] 标记 ${petGenerationRecovery.recovered} 个中断任务等待重试`);
  refreshEnvPath();
  const credentialMigration = migrateConfigDirectory(CONFIGS_DIR);
  const controlBotMigration = migrateTomlCredentials(path.join(CCM_DIR, "control-bot", "config.toml"));
  const protectedFeishuConfig = loadFeishuConfig();
  if (Object.keys(protectedFeishuConfig || {}).length) saveFeishuConfig(protectedFeishuConfig);
  const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
  if (migratedCredentials > 0) console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
  toolManager.loadTools().catch((e: any) => console.error("[ToolManager]", e.message));
  const lifecycleAgentReconciliation = reconcileGroupSessionLifecycleAgentCancellations();
  if (lifecycleAgentReconciliation.checked > 0) {
    console.log(`[会话生命周期撤销] 检查 ${lifecycleAgentReconciliation.checked} 个会话作用域：有效 ${lifecycleAgentReconciliation.active}，撤销 ${lifecycleAgentReconciliation.revoked}，停止任务 ${lifecycleAgentReconciliation.taskCount}`);
  }
  startCronScheduler(startupCollabCtx);
  startTaskWatchdog(startupCollabCtx);
  const autoAgentRecoveryMonitor = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_AGENT_RECOVERY_MONITOR || ""));
  if (autoAgentRecoveryMonitor) {
    startAgentRecoveryMonitor(startupCollabCtx);
  } else {
    console.log("[执行通道恢复监控] 默认关闭；执行通道探针仅在用户点击“复检执行通道”或手动运行恢复监控时触发");
  }
  const globalMemoryBootstrap = bootstrapGlobalAgentMemoryForServer();
  if (globalMemoryBootstrap.total > 0) console.log(`[全局记忆] 启动迁移/同步 ${globalMemoryBootstrap.migrated}/${globalMemoryBootstrap.total} 个历史会话`);
  const missionSupervisor = startGlobalMissionSupervisionForServer(startupCollabCtx);
  if (missionSupervisor.resumed > 0) console.log(`[全局任务监工] 启动恢复 ${missionSupervisor.resumed} 个异步监督任务`);
  startReliabilityDrillScheduler();
  startUsabilityArchiveScheduler();
  startGroupSessionRetentionMaintenanceScheduler();
  const typedMemoryDispatchRecovery = recoverChildTypedMemoryDispatchWal();
  if (typedMemoryDispatchRecovery.total > 0) {
    console.log(`[记忆派发 WAL] 检查 ${typedMemoryDispatchRecovery.total} 条：恢复提交 ${typedMemoryDispatchRecovery.recovered}，不确定 ${typedMemoryDispatchRecovery.uncertain}，过期 ${typedMemoryDispatchRecovery.expired}`);
  }
  const invocationRecovery = reconcileTaskAgentInvocationRecovery();
  if (invocationRecovery.checked > 0) {
    console.log(`[子 Agent 调用谱系] 检查 ${invocationRecovery.checked} 条：恢复 ${invocationRecovery.recovered}，不确定 ${invocationRecovery.uncertain}，活跃 ${invocationRecovery.active}，待定 ${invocationRecovery.pending}，重连 ${invocationRecovery.relinked}，隔离 ${invocationRecovery.quarantined}`);
  }
  const continuationSoakRecovery = reconcileTaskAgentContinuationSoak({
    invocationEdges: listTaskAgentInvocationEdges({}).edges,
    taskAgentSessions: listTaskAgentSessions(),
  });
  if (continuationSoakRecovery.checked > 0) {
    console.log(`[续接 Soak] 检查 ${continuationSoakRecovery.checked} 条：补录 ${continuationSoakRecovery.recorded}，幂等 ${continuationSoakRecovery.idempotent}，失败 ${continuationSoakRecovery.failed}`);
  }
  const soakResume = resumeSoakTest();
  if (soakResume.resumed) console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
  const resumeResult = resumeTaskQueues(startupCollabCtx);
  if (resumeResult.total > 0) {
    console.log(
      `[任务队列] 启动恢复检查 ${resumeResult.total} 个未完成任务：`
      + `已自动接上 ${resumeResult.auto_resumed || resumeResult.resumed || 0} 个，`
      + `等待确认 ${resumeResult.manual_pending || 0} 个，`
      + `跳过 ${resumeResult.skipped || 0} 个`,
    );
  }
}

function startServer(port: number) {
  PORT = port;
  const startupCollabCtx = createCollabCtx();
  const server = http.createServer(handleRequest);
  server.on("close", () => {
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    stopGlobalMissionSupervisionForServer();
    stopReliabilityDrillScheduler();
    stopUsabilityArchiveScheduler();
    stopGroupSessionRetentionMaintenanceScheduler();
    stopModelCapabilityRefreshScheduler();
    stopRuntimeToolRealCliMatrixScheduler();
    shutdownSoakMonitor();
  });
  server.listen(port, () => {
    // Port ownership is the fail-closed singleton gate. No schedulers, queue
    // recovery, soak resume, or mutable startup work may run before it succeeds.
    bootstrapServerRuntime(startupCollabCtx, port);
    startModelCapabilityRefreshScheduler();
    startRuntimeToolRealCliMatrixScheduler();
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║     ccm Web 控制台                    ║`);
    console.log(`╚══════════════════════════════════════╝\n`);
    console.log(`  地址: http://localhost:${port}`);
    console.log(`  按 Ctrl+C 停止\n`);
    void resumeGlobalAgentLoopsForServer(startupCollabCtx, port)
      .then(result => { if (result.total > 0) console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`); })
      .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`));
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
  return server;
}

let PORT = 3080;
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



