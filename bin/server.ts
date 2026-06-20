#!/usr/bin/env node
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import { execSync, spawn } from "child_process";
import { toolManager } from "./tool-manager";
import {
  buildAgentCommand,
  getAgentCommandLabel,
  normalizeAgentRuntimeId,
} from "./agent-runtime";
import { buildRuntimeToolSyncPrompt, recordRuntimeToolSyncAudit, syncRuntimeTools } from "./runtime-tool-sync";

// 导入底座与持久层
import {
  refreshEnvPath,
  sendJson,
  CCM_DIR,
  PID_DIR,
  LOG_DIR,
  UPLOAD_DIR,
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
  getFileChanges
} from "./utils";

import {
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  loadFeishuConfig,
  saveFeishuConfig,
  recordMetric
} from "./db";

// 导入子模块控制器
import { handleProjectsApi } from "./modules/projects";
import { handleSessionsApi } from "./modules/sessions";
import { handleGitApi } from "./modules/git";
import { handleMarketplaceApi } from "./modules/marketplace";
import { handleTemplatesApi } from "./modules/templates";
import { handleCronApi, startCronScheduler, stopCronScheduler, syncCronTaskStatus } from "./modules/cron";
import { handleToolsAndMetricsApi } from "./modules/tools";
import { handlePetsApi } from "./modules/pets";
import { handleMusicApi } from "./modules/music";
import { handleCollaborationApi, resumeTaskQueues, startAgentRecoveryMonitor, startTaskWatchdog, stopAgentRecoveryMonitor, stopTaskWatchdog } from "./modules/collaboration";
import { handleGlobalAgentApi } from "./modules/global-agent";
import { handleRagApi } from "./modules/rag";

import { getSessions } from "./modules/sessions";

// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set<any>();
const petWorkspaceClients = new Set<any>();
const stateCache = new Map<string, any>();
const agentActivity = new Map<string, any>();
const petWorkspaceTargets = new Map<string, any>();

const MUSIC_PET_AGENT_NAME = "music-agent";
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

function broadcastPetSpeech(agent: string, payload: any = {}) {
  const text = payload.text == null ? "" : String(payload.text);
  if (!agent || (!text.trim() && !payload.final)) return;
  const event = {
    type: "speech",
    agent,
    role: payload.role || "assistant",
    text,
    mode: payload.mode || "replace",
    final: !!payload.final,
    source: payload.source || "project",
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
  { state: "idle", seconds: 10, detail: "空闲，等待指令" },
  { state: "thinking", seconds: 10, detail: "例行观察项目状态" },
  { state: "carrying", seconds: 10, detail: "整理任务资料" },
  { state: "sweeping", seconds: 10, detail: "清扫工作区上下文" },
  { state: "notification", seconds: 10, detail: "有空可以看看待处理任务" },
  { state: "juggling", seconds: 10, detail: "休息一下，保持节奏" },
  { state: "happy", seconds: 10, detail: "保持在线" },
  { state: "idle", seconds: 10, detail: "空闲，等待指令" },
];

const PROJECT_IDLE_ACTION_CYCLE_MS = PROJECT_IDLE_ACTION_STRATEGY.reduce((sum, item) => sum + item.seconds * 1000, 0);
const PROJECT_ACTIVE_ACTION_STRATEGY = [
  { state: "working", seconds: 90, detail: "Agent 调用中", trigger: "用户向项目 Agent 提问、群聊协作、定时任务执行" },
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
    working: 90000,
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
  for (const client of petStatusClients) writeSse(client, event);
}

function setAgentActivity(name: string, state: string, detail = "", workspaceTarget: any = null, durationMs?: number) {
  if (workspaceTarget) setAgentWorkspaceTarget(name, workspaceTarget);
  const timestamp = Date.now();
  const normalizedState = normalizePetState(state);
  agentActivity.set(name, {
    state: normalizedState,
    timestamp,
    detail,
    expiresAt: timestamp + (durationMs || getActivityDurationMs(normalizedState)),
  });
  stateCache.delete(name);
  broadcastAgentActivityState(name, normalizedState, detail, timestamp);
}

function normalizePetState(state: string) {
  const value = String(state || "idle");
  const allowed = new Set([
    "idle", "working", "thinking", "error", "happy", "attention",
    "notification", "carrying", "sweeping", "juggling", "yawning",
    "dozing", "collapsing", "sleeping", "waking",
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

function getPetAgents() {
  const configs = getConfigs();
  const projectNames = new Set(configs.map(c => c.name));
  
  const projectAgents = configs.map(c => {
    const s = getAgentState(c.name);
    return {
      name: c.name,
      displayName: c.name,
      petLabel: c.name,
      virtual: false,
      type: "project",
      agent: "claudecode",
      running: !!s.processRunning,
      state: s.state,
      lastActivity: s.lastActivity || new Date().toISOString(),
      stateDetail: s.detail,
    };
  });

  const customAgents: any[] = [];
  try {
    if (fs.existsSync(PETS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PETS_FILE, "utf-8"));
      const petConfigs = data.configs || {};
      for (const name of Object.keys(petConfigs)) {
        if (name !== "music-agent" && !projectNames.has(name)) {
          const cfg = petConfigs[name];
          customAgents.push({
            name: name,
            displayName: cfg.label || name,
            petLabel: cfg.label || name,
            virtual: true,
            type: "custom",
            agent: "custom",
            running: true,
            state: "idle",
            lastActivity: new Date().toISOString(),
            stateDetail: "自定义挂件",
          });
        }
      }
    }
  } catch (e) {
    console.error("[pet] 读取自定义宠物配置失败", e);
  }

  return [getMusicPetAgent(), ...projectAgents, ...customAgents];
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
  return {
    mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x: any) => String(x).trim()).filter(Boolean) : [],
    skill: Array.isArray(tools.skill) ? tools.skill.map((x: any) => String(x).trim()).filter(Boolean) : [],
  };
}

function getProjectToolSelection(projectName: string) {
  const configs = loadProjectConfigs();
  return normalizeToolSelection(configs?.[projectName]?.tools || {});
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
  const allowedTools = getProjectToolSelection(projectName);
  const audit = syncRuntimeTools(workDir, agentType, allowedTools);
  recordRuntimeToolSyncAudit(audit, projectName);
  const prompt = toolManager.buildToolPrompt(allowedTools) + buildRuntimeToolSyncPrompt(audit);
  const workEvent = {
    id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time: new Date().toISOString(),
    agent: projectName,
    kind: audit.mode === "failed" ? "error" : "tool",
    text: audit.mode === "native-and-proxy"
      ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已同步原生工具：MCP ${audit.synced.mcp.length}，Skill ${audit.synced.skill.length}${audit.warnings?.length ? `；${audit.warnings.join("；")}` : ""}`
      : audit.mode === "ccm-proxy-only"
        ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
        : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`,
    runtimeToolSync: audit,
  };
  return { prompt, allowedTools, audit, workEvent };
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

function createAgentRunnerRequest(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "") {
  ensureAgentRunnerDirs();
  const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const request = {
    id,
    projectName,
    workDir,
    agentType: normalizeAgentRuntimeId(agentType || "claudecode"),
    timeoutMs,
    allowedTools,
    mcpConfigPath,
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

async function callAgentViaExternalRunner(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "") {
  const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath);
  const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
  if (!result?.success) {
    const label = result?.command || getAgentCommandLabel(agentType);
    const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
    throw new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`);
  }
  const output = await appendToolResults(String(result.output || "").trim(), allowedTools);
  return { output, fileChanges: result.fileChanges || null, runnerRequestId: request.id };
}

async function appendToolResults(output: string, allowedTools: any = null) {
  const calls = toolManager.parseToolCalls(output);
  if (calls.length === 0) return output;
  const results = [];
  for (const call of calls) {
    try {
      const res = await toolManager.executeToolCall(call.name, call.arguments, allowedTools || undefined);
      results.push(`[工具结果: ${call.name}]\n${res}`);
    } catch (err: any) {
      results.push(`[工具错误: ${call.name}] ${err.message}`);
    }
  }
  return output + "\n\n" + results.join("\n\n");
}

async function callAgent(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget: any = null) {
  setAgentActivity(projectName, "working", "Agent 调用中", workspaceTarget || { tab: "projects", project: projectName }, getAgentRunActivityDuration(timeoutMs));
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(tmpMsg, message, "utf-8");

  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: workspaceTarget?.mcpConfigPath });

  try {
    const result = execSync(cmd, {
      encoding: "utf-8",
      timeout: timeoutMs || 300000,
      cwd: safeCwd,
      shell: true as any,
      maxBuffer: 10 * 1024 * 1024,
    });
    try { fs.unlinkSync(tmpMsg); } catch {}
    const output = await appendToolResults(result.trim(), workspaceTarget?.allowedTools);
    const fileChanges = getFileChanges(projectName, changeSnapshot);
    recordMetric(projectName, {
      success: true,
      durationMs: Date.now() - startedAt,
      fileChangeCount: fileChanges?.count || 0
    });
    broadcastPetSpeech(projectName, { role: "assistant", text: output, final: true, source: "project" });
    setAgentActivity(projectName, "happy", "任务完成");
    setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
    return output;
  } catch (e: any) {
    try { fs.unlinkSync(tmpMsg); } catch {}
    if (isSpawnPermissionError(e)) {
      try {
        const runner = await callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, workspaceTarget?.allowedTools, workspaceTarget?.mcpConfigPath);
        const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
        recordMetric(projectName, {
          success: true,
          durationMs: Date.now() - startedAt,
          fileChangeCount: fileChanges?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "project" });
        setAgentActivity(projectName, "happy", "外部 Runner 任务完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        return runner.output;
      } catch (runnerError: any) {
        const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
        recordMetric(projectName, {
          success: false,
          durationMs: Date.now() - startedAt,
          fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "error", "外部 Runner 错误");
        return output;
      }
    }
    const output = e.killed || e.signal === "SIGTERM"
      ? `[${projectName}] Agent 响应超时，请稍后重试`
      : `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
    recordMetric(projectName, {
      success: false,
      durationMs: Date.now() - startedAt,
      fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0
    });
    broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
    setAgentActivity(projectName, "error", "错误");
    return output;
  }
}

function callAgentForGroupStream(projectName: string, message: string, workDir: string, agentType: string, options: any = {}) {
  const groupId = options.groupId;
  setAgentActivity(projectName, "working", options.detail || "群聊协作中", groupId ? { tab: "groups", groupId } : { tab: "groups" }, getAgentRunActivityDuration(options.timeoutMs));
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(tmpMsg, message, "utf-8");
  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath });
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
    try {
      child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
    } catch (spawnError: any) {
      if (!isSpawnPermissionError(spawnError)) {
        const text = `❌ 错误: ${spawnError.message || spawnError}`;
        writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
        resolve(text);
        return;
      }
      const runnerText = `🧩 ${projectName} 交给外部 Agent Runner 执行...`;
      pushWorkEvent("status", runnerText);
      writeSse(streamRes, { type: "status", text: runnerText, agent: projectName });
      callAgentViaExternalRunner(projectName, message, workDir, agentType, options.timeoutMs || 300000, options.allowedTools, options.mcpConfigPath)
        .then((runner) => {
          const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
          recordMetric(projectName, {
            success: true,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0
          });
          try {
            if (typeof options.onDone === "function") {
              pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
              options.onDone({ text: runner.output, fileChanges, isError: false, runnerRequestId: runner.runnerRequestId, workEvents });
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
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0
          });
          try {
            if (typeof options.onDone === "function") {
              pushWorkEvent("error", text, { final: true });
              options.onDone({ text, fileChanges: null, isError: true, workEvents });
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
    let settled = false;
    const timeoutId = setTimeout(() => { finish("⏰ 响应超时", true).catch(() => {}); }, options.timeoutMs || 300000);

    const finish = async (text: string, isError = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try { child?.kill(); } catch {}
      try { fs.unlinkSync(tmpMsg); } catch {}
      let finalText = text || output.trim();
      if (!isError) finalText = await appendToolResults(finalText, options.allowedTools);
      const fileChanges = getFileChanges(projectName, changeSnapshot);
      recordMetric(projectName, {
        success: !isError,
        durationMs: Date.now() - startedAt,
        fileChangeCount: fileChanges?.count || 0
      });
      try {
        if (typeof options.onDone === "function") {
          pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
          options.onDone({ text: finalText, fileChanges, isError, workEvents });
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
      pushWorkEvent("output", text);
      writeSse(streamRes, { type: "chunk", agent: projectName, text });
      broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      if (text.trim() && !output.trim()) {
        const runningText = `🧠 ${projectName} 运行中...`;
        pushWorkEvent("status", runningText);
        writeSse(streamRes, { type: "status", text: runningText, agent: projectName });
        broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 运行中...`, source: "group" });
      }
    });

    child.on("close", () => { finish(output.trim()).catch((err) => finish(`❌ 错误: ${err.message}`, true)); });
    child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => {}); });
  });
}

// 流式调用 Agent（SSE）
function callAgentStream(projectName: string, message: string, workDir: string, agentType: string, res: any, options: any = {}) {
  const startedAt = Date.now();
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
  const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  fs.writeFileSync(tmpMsg, message, "utf-8");

  const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath });

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
  for (const event of workEvents) send({ type: "work_event", event });

  // 发送状态事件
  pushProjectWorkEvent("status", "Agent 正在思考...");
  send({ type: "status", text: "Agent 正在思考..." });
  broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
  setAgentActivity(projectName, "working", "正在处理消息", null, getAgentRunActivityDuration(300000));

  const child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });

  // 关闭 stdin（已通过临时文件传入）
  child.stdin.end();

  let fullOutput = "";
  let finished = false;
  let timeoutTimer: any = null;
  let lastStderrStatusAt = 0;
  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      try { res.write(": keep-alive\n\n"); } catch {}
    }
  }, 15000);

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString("utf-8");
    if (!text) return;
    fullOutput += text;
    pushProjectWorkEvent("output", text);
    send({ type: "chunk", text });
    broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "project" });
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString("utf-8");
    const now = Date.now();
    if (text.trim() && now - lastStderrStatusAt > 1500) {
      lastStderrStatusAt = now;
      pushProjectWorkEvent("status", "Agent 处理中...");
      send({ type: "status", text: "Agent 处理中..." });
      broadcastPetSpeech(projectName, { role: "status", text: "Agent 处理中...", source: "project" });
    }
  });

  child.on("close", () => {
    if (finished) return;
    finished = true;
    if (timeoutTimer) clearTimeout(timeoutTimer);
    clearInterval(heartbeatTimer);
    (async () => {
      try { fs.unlinkSync(tmpMsg); } catch {}
      const outputWithTools = await appendToolResults(fullOutput.trim(), options.allowedTools);
      const toolAppend = outputWithTools.slice(fullOutput.trim().length);
      if (toolAppend) {
        pushProjectWorkEvent("output", toolAppend);
          send({ type: "chunk", text: toolAppend });
        broadcastPetSpeech(projectName, { role: "assistant", text: toolAppend, mode: "append", source: "project" });
      }
      broadcastPetSpeech(projectName, { role: "assistant", text: "", mode: "append", final: true, source: "project" });
      const fileChanges = getFileChanges(projectName, changeSnapshot);
      recordMetric(projectName, {
        success: true,
        durationMs: Date.now() - startedAt,
        fileChangeCount: fileChanges?.count || 0
      });
      setAgentActivity(projectName, "happy", "任务完成");
      setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
      pushProjectWorkEvent("done", "执行完成", { final: true, fileChanges });
      send({ type: "done", fileChanges, workEvents });
      res.end();
    })().catch((err) => {
      pushProjectWorkEvent("error", err.message, { final: true });
        send({ type: "error", text: err.message, workEvents });
      try { res.end(); } catch {}
    });
  });

  child.on("error", (err) => {
    if (finished) return;
    finished = true;
    if (timeoutTimer) clearTimeout(timeoutTimer);
    clearInterval(heartbeatTimer);
    try { fs.unlinkSync(tmpMsg); } catch {}
    pushProjectWorkEvent("error", err.message, { final: true });
        send({ type: "error", text: err.message, workEvents });
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
    clearInterval(heartbeatTimer);
    try { child.kill(); } catch {}
    try { fs.unlinkSync(tmpMsg); } catch {}
    send({ type: "error", text: "Agent 响应超时" });
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
    onTaskStatusChange: syncCronTaskStatus,
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

  // === 流式发送消息给 Agent（SSE）===
  if (pathname === "/api/send-stream" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleStreamSend = (project: string, message: string, files: any[] = []) => {
      const finalMessage = files && files.length > 0
        ? `${message || ""}${buildUploadedFilesContext(files, "本次消息附件")}`
        : (message || "");
      if (!project || !finalMessage.trim()) return sendJson(res, { error: "参数不足" }, 400);
      const configs = getConfigs();
      const config = configs.find(c => c.name === project);
      if (!config) return sendJson(res, { error: "项目不存在" }, 400);
      const info = getConfigInfo(config.path);
      const workDir = info[0]?.workDir;
      const agentType = info[0]?.agent || "claudecode";
      const toolContext = buildProjectToolContext(project, workDir, agentType);
      const fullMessage = `${toolContext.prompt}\n\n${finalMessage}`;
      callAgentStream(project, fullMessage, workDir, agentType, res, { allowedTools: toolContext.allowedTools, mcpConfigPath: toolContext.audit.mcpConfigPath, initialWorkEvents: [toolContext.workEvent] });
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = parseMultipart(buffer, boundary);
          handleStreamSend((fields as any).project, (fields as any).message, files);
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
        const { project, message } = JSON.parse(body);
        handleStreamSend(project, message);
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

      const agentType = info[0]?.agent || "claudecode";
      const toolContext = buildProjectToolContext(project, workDir, agentType);
      const promptWithTools = `${toolContext.prompt}\n\n${fullMessage}`;

      try {
        const output = await callAgent(project, promptWithTools, workDir, agentType, 120000, {
          tab: "projects",
          project,
          allowedTools: toolContext.allowedTools,
          mcpConfigPath: toolContext.audit.mcpConfigPath,
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
  if (handleSessionsApi(pathname, req, res, parsed)) return;
  if (handleGitApi(pathname, req, res, parsed)) return;
  if (handleMarketplaceApi(pathname, req, res, parsed)) return;
  if (handleTemplatesApi(pathname, req, res, parsed)) return;
  if (handleCronApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleToolsAndMetricsApi(pathname, req, res, parsed)) return;
  if (handlePetsApi(pathname, req, res, parsed, petsCtx)) return;
  if (handleMusicApi(pathname, req, res, parsed, musicCtx)) return;
  if (handleCollaborationApi(pathname, req, res, parsed, collabCtx)) return;
  if (handleGlobalAgentApi(pathname, req, res, parsed)) return;
  if (handleRagApi(pathname, req, res, parsed)) return;

  // 404 fallback
  sendJson(res, { error: "Not Found" }, 404);
}

// === 启动服务器 ===
function startServer(port: number) {
  PORT = port;
  refreshEnvPath();
  toolManager.loadTools().catch((e: any) => console.error("[ToolManager]", e.message));
  const startupCollabCtx = createCollabCtx();
  startCronScheduler(startupCollabCtx);
  startTaskWatchdog(startupCollabCtx);
  startAgentRecoveryMonitor(startupCollabCtx);
  const resumeResult = resumeTaskQueues(startupCollabCtx);
  if (resumeResult.total > 0) {
    console.log(`[任务队列] 启动恢复 ${resumeResult.resumed}/${resumeResult.total} 个自动执行任务`);
  }
  const server = http.createServer(handleRequest);
  server.on("close", () => {
    stopCronScheduler();
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
  });
  server.listen(port, () => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║     ccm Web 控制台                    ║`);
    console.log(`╚══════════════════════════════════════╝\n`);
    console.log(`  地址: http://localhost:${port}`);
    console.log(`  按 Ctrl+C 停止\n`);
  });
  return server;
}

let PORT = 3080;
if (require.main === module) {
  PORT = parseInt(process.argv[2]) || 3080;
  startServer(PORT);
}

module.exports = { startServer };



