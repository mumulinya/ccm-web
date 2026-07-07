#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url = __importStar(require("url"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const tool_manager_1 = require("./tools/tool-manager");
const tool_call_loop_1 = require("./tools/tool-call-loop");
const runtime_1 = require("./agents/runtime");
const agent_sessions_1 = require("./tasks/agent-sessions");
const runtime_tool_sync_1 = require("./tools/runtime-tool-sync");
const tool_authorization_1 = require("./tools/tool-authorization");
const execution_kernel_1 = require("./agents/execution-kernel");
const memory_1 = require("./projects/memory");
// 导入底座与持久层
const utils_1 = require("./core/utils");
const db_1 = require("./core/db");
// 导入子模块控制器
const projects_1 = require("./modules/projects/projects");
const sessions_1 = require("./modules/projects/sessions");
const git_1 = require("./modules/tools/git");
const marketplace_1 = require("./modules/tools/marketplace");
const templates_1 = require("./modules/templates/templates");
const cron_1 = require("./modules/scheduling/cron");
const tools_1 = require("./modules/tools/tools");
const pets_1 = require("./modules/pets/pets");
const music_1 = require("./modules/music/music");
const collaboration_1 = require("./modules/collaboration/collaboration");
const reliability_drills_1 = require("./system/reliability-drills");
const soak_test_1 = require("./system/soak-test");
const process_lifecycle_1 = require("./system/process-lifecycle");
const global_agent_1 = require("./modules/global/global-agent");
const rag_1 = require("./modules/knowledge/rag");
const slash_commands_1 = require("./modules/tools/slash-commands");
const credential_store_1 = require("./core/credential-store");
const usability_1 = require("./modules/system/usability");
const chat_runs_1 = require("./projects/chat-runs");
const cleanup_center_1 = require("./system/cleanup-center");
const sessions_2 = require("./modules/projects/sessions");
// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set();
const petWorkspaceClients = new Set();
const stateCache = new Map();
const agentActivity = new Map();
const petWorkspaceTargets = new Map();
const MUSIC_PET_AGENT_NAME = "music-agent";
const GLOBAL_PET_AGENT_NAME = "global-agent";
const MUSIC_PET_AGENT_DEFAULT_LABEL = "乖乖";
const AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
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
        if (!fs.existsSync(utils_1.PETS_FILE))
            return MUSIC_PET_AGENT_DEFAULT_LABEL;
        const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
        const config = data?.configs?.[MUSIC_PET_AGENT_NAME] || {};
        const label = String(config.label || config.petLabel || config.displayName || "").trim();
        return label ? label.slice(0, 24) : MUSIC_PET_AGENT_DEFAULT_LABEL;
    }
    catch {
        return MUSIC_PET_AGENT_DEFAULT_LABEL;
    }
}
// === 辅助广播及状态跟踪函数 ===
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    catch { }
}
(0, chat_runs_1.loadProjectChatRuns)();
function bindProjectRunAgentSession(projectRun, projectName, agentType) {
    const parentRun = projectRun?.parent_run_id ? chat_runs_1.projectChatRuns.get(projectRun.parent_run_id) : null;
    const taskSessionScopeId = String(parentRun?.task_session_scope_id || parentRun?.parent_run_id || projectRun?.parent_run_id || projectRun?.id || "");
    const session = (0, agent_sessions_1.openTaskAgentSession)({
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
    (0, chat_runs_1.saveProjectChatRuns)();
    return { session, options: (0, agent_sessions_1.getTaskAgentSessionOptions)(session) };
}
function broadcastPetSpeech(agent, payload = {}) {
    const text = payload.text == null ? "" : String(payload.text);
    if (!agent || (!text.trim() && !payload.final))
        return;
    const source = payload.source || "project";
    const event = {
        type: "speech",
        agent,
        role: payload.role || "assistant",
        text,
        mode: payload.mode || "replace",
        final: !!payload.final,
        source,
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
    if (agent !== GLOBAL_PET_AGENT_NAME && agent !== MUSIC_PET_AGENT_NAME && ["project", "group", "task"].includes(String(source))) {
        if (shouldKeepGlobalPetPrimaryActivity())
            return;
        const mirrorText = text.trim() ? `${agent}：${text}` : "";
        const mirror = {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            text: mirrorText,
            source: `workspace-${source}`,
        };
        for (const client of petStatusClients)
            writeSse(client, mirror);
    }
}
function broadcastPetConfigChanged() {
    const event = {
        type: "config",
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
}
function sanitizePetNavigationTarget(target = {}) {
    const tab = String(target.tab || "").trim();
    if (tab === "music")
        return { tab: "music" };
    if (tab === "global-agent")
        return { tab: "global-agent" };
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
function setAgentWorkspaceTarget(name, target = null) {
    if (!name || !target)
        return;
    petWorkspaceTargets.set(name, {
        ...sanitizePetNavigationTarget(target),
        updatedAt: Date.now(),
    });
}
function getPetNavigationTarget(agent) {
    const name = String(agent || "").trim();
    if (name === MUSIC_PET_AGENT_NAME)
        return { tab: "music" };
    if (name === GLOBAL_PET_AGENT_NAME)
        return { tab: "global-agent" };
    const existing = petWorkspaceTargets.get(name);
    if (existing?.tab) {
        const { updatedAt, ...target } = existing;
        return target;
    }
    const project = (0, db_1.getConfigs)().find(c => c.name === name);
    if (project)
        return { tab: "projects", project: name };
    return { tab: "projects" };
}
function buildPetNavigationUrl(target) {
    const params = new URLSearchParams();
    params.set("tab", target?.tab || "projects");
    if (target?.project)
        params.set("project", String(target.project));
    if (target?.sessionId)
        params.set("sessionId", String(target.sessionId));
    if (target?.groupId)
        params.set("groupId", String(target.groupId));
    if (target?.keyword)
        params.set("keyword", String(target.keyword));
    return `http://localhost:${PORT}/?${params.toString()}`;
}
function broadcastPetNavigation(agent, target) {
    const event = {
        type: "navigate",
        agent,
        target,
        url: buildPetNavigationUrl(target),
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
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
function getActivityDurationMs(state) {
    const normalized = normalizePetState(state);
    const durations = {
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
function getAgentRunActivityDuration(timeoutMs) {
    return Math.max((timeoutMs || 300000) + 30000, getActivityDurationMs("working"));
}
function hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
function getProjectAmbientPetState(name, now = Date.now()) {
    const offset = hashString(name) % PROJECT_IDLE_ACTION_CYCLE_MS;
    let cursor = (now + offset) % PROJECT_IDLE_ACTION_CYCLE_MS;
    for (const item of PROJECT_IDLE_ACTION_STRATEGY) {
        const span = item.seconds * 1000;
        if (cursor < span)
            return item;
        cursor -= span;
    }
    return PROJECT_IDLE_ACTION_STRATEGY[0];
}
function broadcastAgentActivityState(name, state, detail = "", timestamp = Date.now()) {
    const event = {
        type: "state",
        agent: name,
        displayName: name,
        state,
        lastActivity: new Date(timestamp).toISOString(),
        detail,
    };
    for (const client of petStatusClients)
        writeSse(client, event);
    if (name !== GLOBAL_PET_AGENT_NAME && name !== MUSIC_PET_AGENT_NAME) {
        if (shouldKeepGlobalPetPrimaryActivity())
            return;
        const mirror = {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
            detail: detail ? `${name}：${detail}` : `${name} 状态更新`,
        };
        for (const client of petStatusClients)
            writeSse(client, mirror);
    }
}
function shouldKeepGlobalPetPrimaryActivity(now = Date.now()) {
    const activity = agentActivity.get(GLOBAL_PET_AGENT_NAME);
    if (!activity)
        return false;
    const active = activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000;
    if (!active)
        return false;
    return new Set([
        "thinking",
        "planning",
        "building",
        "debugging",
        "reviewing",
        "waiting",
    ]).has(normalizePetState(activity.state));
}
function setAgentActivity(name, state, detail = "", workspaceTarget = null, durationMs) {
    if (workspaceTarget)
        setAgentWorkspaceTarget(name, workspaceTarget);
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
function getSystemPetActivity(name, fallbackDetail = "") {
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
function normalizePetState(state) {
    const value = String(state || "idle");
    const allowed = new Set([
        "idle", "working", "thinking", "error", "happy", "attention",
        "notification", "carrying", "sweeping", "juggling", "yawning",
        "dozing", "collapsing", "sleeping", "waking", "planning",
        "building", "debugging", "reviewing", "waiting", "drag",
    ]);
    return allowed.has(value) ? value : "idle";
}
function setMusicPetState(state, detail = "", track = null) {
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
    for (const client of petStatusClients)
        writeSse(client, event);
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
function getPetConfigLabel(agentName, fallback) {
    try {
        if (!fs.existsSync(utils_1.PETS_FILE))
            return fallback;
        const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
        const label = String(data?.configs?.[agentName]?.label || "").trim();
        return label || fallback;
    }
    catch {
        return fallback;
    }
}
function getGlobalPetAgent() {
    const displayName = getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent");
    const current = getSystemPetActivity(GLOBAL_PET_AGENT_NAME, "等待全局指令");
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
    };
}
function getPetAgents() {
    const configs = (0, db_1.getConfigs)();
    const projectNames = new Set(configs.map(c => c.name));
    const customAgents = [];
    try {
        if (fs.existsSync(utils_1.PETS_FILE)) {
            const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
            const petConfigs = data.configs || {};
            for (const name of Object.keys(petConfigs)) {
                if (name !== MUSIC_PET_AGENT_NAME && name !== GLOBAL_PET_AGENT_NAME && !projectNames.has(name)) {
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
    }
    catch (e) {
        console.error("[pet] 读取自定义宠物配置失败", e);
    }
    return [getGlobalPetAgent(), getMusicPetAgent(), ...customAgents];
}
function getAgentState(name) {
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
    if (cached && now - cached.cachedAt < 2000)
        return cached;
    const pidFile = path.join(utils_1.PID_DIR, `${name}.pid`);
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
        }
        catch {
            try {
                fs.unlinkSync(pidFile);
            }
            catch { }
            state = "idle";
            detail = "待命中";
        }
    }
    catch {
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
function normalizeToolSelection(tools = {}) {
    const source = tools && typeof tools === "object" ? tools : {};
    return {
        mcp: Array.isArray(source.mcp) ? source.mcp.map((x) => String(x).trim()).filter(Boolean) : [],
        skill: Array.isArray(source.skill) ? source.skill.map((x) => String(x).trim()).filter(Boolean) : [],
    };
}
function getProjectToolSelection(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
}
function hasToolSelection(tools = {}) {
    const normalized = normalizeToolSelection(tools);
    return normalized.mcp.length > 0 || normalized.skill.length > 0;
}
function findRuntimeToolSnapshotPath(mcpConfigPath = "") {
    const configPath = String(mcpConfigPath || "").trim();
    if (!configPath)
        return "";
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
    }
    catch {
        return null;
    }
}
function runtimeToolSnapshotFromAudit(audit = {}, allowedTools = {}) {
    const dispatchGate = audit.dispatch_gate || audit.dispatchGate || null;
    const authorizationReadiness = audit.authorization_readiness || audit.authorizationReadiness || null;
    return {
        snapshotId: String(audit.snapshotId || audit.snapshot_id || ""),
        snapshotPath: String(audit.snapshotPath || audit.snapshot_path || ""),
        mcpConfigPath: String(audit.mcpConfigPath || audit.mcp_config_path || ""),
        runtime: (0, runtime_1.normalizeAgentRuntimeId)(audit.runtime || ""),
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
function normalizeAgentRunnerRuntimeToolSnapshot(snapshot = {}, allowedTools = null, mcpConfigPath = "") {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const dispatchGate = source.dispatchGate || source.dispatch_gate || null;
    const authorizationReadiness = source.authorizationReadiness || source.authorization_readiness || null;
    return {
        ...source,
        snapshotId: String(source.snapshotId || source.snapshot_id || ""),
        snapshotPath: String(source.snapshotPath || source.snapshot_path || ""),
        mcpConfigPath: String(source.mcpConfigPath || source.mcp_config_path || mcpConfigPath || ""),
        runtime: (0, runtime_1.normalizeAgentRuntimeId)(source.runtime || ""),
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
function buildAgentRunnerRuntimeToolPayload(allowedTools = null, mcpConfigPath = "", executionInfo = null) {
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
function normalizeVerificationCommands(value) {
    const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
    const seen = new Set();
    const commands = [];
    for (const item of raw) {
        const command = String(item || "").trim();
        if (!command || seen.has(command))
            continue;
        seen.add(command);
        commands.push(command);
    }
    return commands.slice(0, 8);
}
function getProjectVerificationCommandsForRunner(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    const projectConfig = configs?.[projectName] || {};
    return normalizeVerificationCommands(projectConfig.verification_commands
        || projectConfig.verificationCommands
        || projectConfig.test_commands
        || projectConfig.testCommands
        || projectConfig.check_commands
        || projectConfig.checkCommands);
}
async function runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType) {
    const commands = getProjectVerificationCommandsForRunner(projectName).filter(execution_kernel_1.isSafeVerificationCommand);
    if (!commands.length || !workDir)
        return "";
    const verification = [];
    const failed = [];
    const results = [];
    const perCommandTimeout = Math.max(30_000, Math.min(timeoutMs || 300_000, 180_000));
    for (const command of commands) {
        try {
            const managed = await (0, execution_kernel_1.runManagedCommand)({
                taskId,
                executionId,
                command,
                cwd: workDir,
                timeoutMs: perCommandTimeout,
                maxOutputBytes: 5 * 1024 * 1024,
                env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), []),
            });
            verification.push(`${command} passed by external runner (exit 0)`);
            results.push({ command, status: "passed", exitCode: 0, output: String(managed.stdout || "").slice(-4000) });
        }
        catch (error) {
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
function extractVerificationCommandsFromMessage(message) {
    const text = String(message || "");
    const commands = [];
    const add = (value) => {
        for (const part of value.split(/[；;，,]/)) {
            const command = part.trim();
            if (/^(npm run [\w:-]+|mvn \w+|gradle \w+|pytest|go test\b.*|cargo test\b.*)$/i.test(command))
                commands.push(command);
        }
    };
    for (const match of text.matchAll(/推荐优先执行的项目验证：([^\n]+)/g))
        add(match[1] || "");
    for (const match of text.matchAll(/验证命令：([^\n]+)/g))
        add(match[1] || "");
    return normalizeVerificationCommands(commands);
}
function buildAgentCliAllowedTools(projectName, message = "") {
    const commands = normalizeVerificationCommands([
        ...getProjectVerificationCommandsForRunner(projectName),
        ...extractVerificationCommandsFromMessage(message),
    ]);
    const rules = [];
    for (const command of commands) {
        rules.push(`Bash(${command})`);
        if (process.platform === "win32")
            rules.push(`PowerShell(${command})`);
    }
    return Array.from(new Set(rules));
}
function buildProjectToolContext(projectName, workDir = "", agentType = "claudecode") {
    const toolAuth = (0, tool_authorization_1.buildToolAuthorizationPayload)(getProjectToolSelection(projectName));
    const allowedTools = toolAuth.tools;
    const audit = (0, runtime_tool_sync_1.syncRuntimeTools)(workDir, agentType, allowedTools, { authorizationReadiness: toolAuth.authorization_readiness });
    audit.authorization_readiness = toolAuth.authorization_readiness;
    audit.dispatch_gate = (0, runtime_tool_sync_1.buildRuntimeToolDispatchGate)(audit);
    (0, runtime_tool_sync_1.recordRuntimeToolSyncAudit)(audit, projectName);
    const prompt = tool_manager_1.toolManager.buildToolPrompt(allowedTools) + (0, runtime_tool_sync_1.buildRuntimeToolSyncPrompt)(audit);
    const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
    const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item) => item.state === "synced").length : audit.synced.mcp.length;
    const proxyMcpCount = mcpStatuses.filter((item) => item.state === "proxy_only").length;
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
function sendRuntimeToolDispatchBlocked(res, toolContext) {
    const gate = toolContext?.dispatchGate || toolContext?.audit?.dispatch_gate || {};
    return (0, utils_1.sendJson)(res, {
        success: false,
        error: gate.reason || "MCP/Skill 授权未就绪，已阻止派发子 Agent",
        runtime_tool_dispatch_gate: gate,
        runtime_tool_sync: toolContext?.audit || null,
    }, 409);
}
function ensureAgentRunnerDirs() {
    for (const dir of [AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, utils_1.UPLOAD_DIR]) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
}
function isSpawnPermissionError(error) {
    const text = `${error?.code || ""} ${error?.message || ""} ${error?.stderr || ""}`;
    return /\bEPERM\b|spawnSync .* EPERM|spawn .* EPERM/i.test(text);
}
function createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
    ensureAgentRunnerDirs();
    const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const groupId = String(executionInfo?.groupId || executionInfo?.group_id || executionInfo?.toolScope?.groupId || executionInfo?.tool_scope?.group_id || "");
    const runtimeToolPayload = buildAgentRunnerRuntimeToolPayload(allowedTools, mcpConfigPath, executionInfo);
    const request = {
        id,
        projectName,
        workDir,
        agentType: (0, runtime_1.normalizeAgentRuntimeId)(agentType || "claudecode"),
        timeoutMs,
        allowedTools,
        mcpConfigPath,
        agentSession: agentSession || null,
        taskId: String(executionInfo?.taskId || ""),
        executionId: String(executionInfo?.executionId || executionInfo?.taskId || ""),
        groupId,
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
async function waitForAgentRunnerResult(resultFile, timeoutMs) {
    const started = Date.now();
    const pollMs = 1000;
    while (Date.now() - started < Math.max(1000, timeoutMs || 300000)) {
        if (fs.existsSync(resultFile)) {
            try {
                return JSON.parse(fs.readFileSync(resultFile, "utf-8").replace(/^\uFEFF/, ""));
            }
            catch { }
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    throw new Error("外部 Agent Runner 等待超时；请运行 npm run agent-runner:ps 或 npm run agent-runner 启用外部执行通道");
}
async function callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
    const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
    if (executionInfo?.executionId)
        (0, execution_kernel_1.registerExternalRunnerRequest)(executionInfo.executionId, request.id);
    const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
    if (!result?.success) {
        const label = result?.command || (0, runtime_1.getAgentCommandLabel)(agentType);
        const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
        throw new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`);
    }
    return { output: String(result.output || "").trim(), fileChanges: result.fileChanges || null, runnerRequestId: request.id, nativeSessionId: result.nativeSessionId || "" };
}
async function runManagedAgentContinuation(input) {
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_tool_continue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR))
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(tmpMsg, input.prompt, "utf-8");
    const sessionId = String(input.nativeSessionId || input.agentSession?.sessionId || "");
    const sessionOptions = {
        ...(input.agentSession || {}),
        persistSession: true,
        resumeSession: !!sessionId,
        sessionId,
    };
    try {
        const managed = await (0, execution_kernel_1.runManagedCommand)({
            taskId: `${input.taskId}-tool-${input.round}`,
            executionId: input.executionId || "",
            command: (0, runtime_1.buildAgentCommand)(input.agentType, tmpMsg, {
                mcpConfigPath: input.mcpConfigPath,
                ...sessionOptions,
            }),
            cwd: (input.workDir || process.cwd()).replace(/\\/g, "/"),
            timeoutMs: input.timeoutMs || 300000,
            maxOutputBytes: Number(input.maxOutputBytes || 2 * 1024 * 1024),
            env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(input.agentType), input.envAllowlist || []),
            project: input.projectName,
            agentType: input.agentType,
            source: "tool-continuation",
            commandLabel: (0, runtime_1.getAgentCommandLabel)(input.agentType),
            title: `工具结果续跑第 ${input.round} 轮`,
        });
        const normalized = (0, runtime_1.normalizeAgentCommandOutput)(input.agentType, String(managed.stdout || "").trim());
        const failure = (0, runtime_1.detectAgentCommandFailure)(input.agentType, String(managed.stdout || "").trim(), 0, "");
        if (failure.failed)
            throw new Error(failure.message || "Agent 工具续跑失败");
        return {
            output: (0, execution_kernel_1.persistBoundedOutput)(`${input.taskId}-tool-${input.round}`, normalized.output, Number(input.maxContextOutputBytes || 256 * 1024)).content,
            nativeSessionId: normalized.sessionId || sessionId,
        };
    }
    finally {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
    }
}
async function continueAgentToolCalls(input) {
    return (0, tool_call_loop_1.runToolCallLoop)({
        initialOutput: input.output,
        initialSessionId: input.nativeSessionId || input.agentSession?.sessionId || "",
        scope: input.allowedTools || undefined,
        runtime: (0, runtime_1.normalizeAgentRuntimeId)(input.agentType),
        project: input.projectName,
        groupId: input.groupId || "",
        taskId: input.taskId,
        executionId: input.executionId || "",
        source: input.groupId ? "group-agent" : "project-agent",
        maxRounds: 4,
        parseToolCalls: text => tool_manager_1.toolManager.parseToolCalls(text),
        executeToolCall: (name, args, scope) => tool_manager_1.toolManager.executeToolCall(name, args, scope),
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
async function callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
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
            const next = await callAgentViaExternalRunnerRaw(projectName, prompt, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, continuationSession, {
                ...executionInfo,
                taskId: `${executionInfo?.taskId || initial.runnerRequestId}-tool-${state.round}`,
                groupId: executionInfo?.groupId || executionInfo?.group_id || "",
                skipVerification: true,
            });
            return { output: next.output, nativeSessionId: next.nativeSessionId || state.nativeSessionId };
        },
    });
    return { ...initial, output: loop.output, nativeSessionId: loop.nativeSessionId || initial.nativeSessionId };
}
async function callAgent(projectName, message, workDir, agentType, timeoutMs, workspaceTarget = null) {
    setAgentActivity(projectName, "working", "Agent 调用中", workspaceTarget || { tab: "projects", project: projectName }, getAgentRunActivityDuration(timeoutMs));
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = (0, runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: workspaceTarget?.mcpConfigPath, ...(workspaceTarget?.agentSession || {}) });
    const taskId = String(workspaceTarget?.taskId || workspaceTarget?.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(workspaceTarget?.executionId || workspaceTarget?.taskId || "");
    try {
        const managed = await (0, execution_kernel_1.runManagedCommand)({
            taskId,
            executionId,
            command: cmd,
            cwd: safeCwd,
            timeoutMs: timeoutMs || 300000,
            maxOutputBytes: Number(workspaceTarget?.maxOutputBytes || 2 * 1024 * 1024),
            env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), workspaceTarget?.envAllowlist || []),
            project: projectName,
            agentType,
            source: workspaceTarget?.probe ? "agent-probe" : "project-agent",
            commandLabel: (0, runtime_1.getAgentCommandLabel)(agentType),
            title: String(workspaceTarget?.title || message || "").slice(0, 120),
        });
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        const normalized = (0, runtime_1.normalizeAgentCommandOutput)(agentType, managed.stdout);
        const bounded = (0, execution_kernel_1.persistBoundedOutput)(taskId, normalized.output, Number(workspaceTarget?.maxContextOutputBytes || 256 * 1024));
        const toolLoop = await continueAgentToolCalls({
            output: bounded.content,
            nativeSessionId: normalized.sessionId || workspaceTarget?.agentSession?.sessionId || "",
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
        let output = toolLoop.output;
        if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
            output += await runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType);
        }
        const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
        (0, db_1.recordMetric)(projectName, {
            success: true,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "assistant", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "happy", "任务完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        return output;
    }
    catch (e) {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        if (isSpawnPermissionError(e)) {
            try {
                const runner = await callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, workspaceTarget?.allowedTools, workspaceTarget?.mcpConfigPath, workspaceTarget?.agentSession, {
                    taskId,
                    executionId,
                    groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
                    runtimeToolSnapshot: workspaceTarget?.runtimeToolSnapshot || workspaceTarget?.runtime_tool_snapshot || null,
                    runtimeToolDispatchGate: workspaceTarget?.runtimeToolDispatchGate || workspaceTarget?.runtime_tool_dispatch_gate || workspaceTarget?.dispatchGate || null,
                });
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                (0, db_1.recordMetric)(projectName, {
                    success: true,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "project" });
                setAgentActivity(projectName, "happy", "外部 Runner 任务完成");
                setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
                return runner.output;
            }
            catch (runnerError) {
                const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
                });
                broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
                setAgentActivity(projectName, "error", "外部 Runner 错误");
                return output;
            }
        }
        const output = e.killed || e.signal === "SIGTERM"
            ? `[${projectName}] Agent 响应超时，请稍后重试`
            : `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
        (0, db_1.recordMetric)(projectName, {
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "error", "错误");
        return output;
    }
}
function callAgentForGroupStream(projectName, message, workDir, agentType, options = {}) {
    const groupId = options.groupId;
    setAgentActivity(projectName, "working", options.detail || "群聊协作中", groupId ? { tab: "groups", groupId } : { tab: "groups" }, getAgentRunActivityDuration(options.timeoutMs));
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = (0, runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...(options.agentSession || {}) });
    const taskId = String(options.taskId || options.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(options.executionId || options.taskId || "");
    const streamRes = options.res;
    const workEvents = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushWorkEvent = (kind, text, extra = {}) => {
        const event = {
            id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            agent: projectName,
            kind,
            text: String(text || "").slice(0, 2400),
            ...extra,
        };
        workEvents.push(event);
        if (workEvents.length > 80)
            workEvents.splice(0, workEvents.length - 80);
        writeSse(streamRes, { type: "agent_work_event", agent: projectName, event });
        return event;
    };
    const thinkingText = `🧠 ${projectName} 正在思考...`;
    pushWorkEvent("status", thinkingText);
    writeSse(streamRes, { type: "status", text: thinkingText, agent: projectName });
    broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 正在思考...`, source: "group" });
    return new Promise((resolve) => {
        let child = null;
        let stopTracking = () => { };
        try {
            child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), options.envAllowlist || []) });
            stopTracking = (0, execution_kernel_1.trackManagedChildProcess)(taskId, executionId, child, {
                project: projectName,
                agentType,
                source: options.probe ? "agent-probe" : "group-agent",
                cwd: safeCwd,
                timeoutMs: options.timeoutMs || 300000,
                commandLabel: (0, runtime_1.getAgentCommandLabel)(agentType),
                title: String(options.title || message || "").slice(0, 120),
            });
        }
        catch (spawnError) {
            if (!isSpawnPermissionError(spawnError)) {
                const text = `❌ 错误: ${spawnError.message || spawnError}`;
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
                groupId: options.groupId || options.group_id || "",
                runtimeToolSnapshot: options.runtimeToolSnapshot || options.runtime_tool_snapshot || null,
                runtimeToolDispatchGate: options.runtimeToolDispatchGate || options.runtime_tool_dispatch_gate || options.dispatchGate || null,
                onToolEvent: (event) => pushWorkEvent(event.type === "tool_result" ? "tool_result" : "status", event.text, { tool: event.tool || "", round: event.round, ok: event.ok }),
            })
                .then((runner) => {
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                (0, db_1.recordMetric)(projectName, {
                    success: true,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
                        options.onDone({ text: runner.output, fileChanges, isError: false, runnerRequestId: runner.runnerRequestId, nativeSessionId: runner.nativeSessionId || "", workEvents });
                    }
                }
                catch { }
                writeSse(streamRes, { type: "agent_done", agent: projectName, text: runner.output, fileChanges, messageId: options.messageId, workEvents });
                broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "group" });
                setAgentActivity(projectName, "happy", "外部 Runner 回复完成");
                setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
                resolve(runner.output);
            })
                .catch((runnerError) => {
                const text = `❌ Agent Runner 错误: ${runnerError.message || runnerError}`;
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("error", text, { final: true });
                        options.onDone({ text, fileChanges: null, isError: true, workEvents });
                    }
                }
                catch { }
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
            try {
                if (child?.exitCode === null && child?.signalCode === null)
                    (0, execution_kernel_1.terminateManagedChildProcess)(child);
            }
            catch { }
            finish("⏰ 响应超时", true).catch(() => { });
        }, options.timeoutMs || 300000);
        const finish = async (text, isError = false) => {
            if (settled)
                return;
            settled = true;
            stopTracking();
            clearTimeout(timeoutId);
            try {
                if (child)
                    (0, execution_kernel_1.terminateManagedChildProcess)(child);
            }
            catch { }
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            let finalText = text || output.trim();
            const normalized = isError ? { output: finalText, sessionId: "" } : (0, runtime_1.normalizeAgentCommandOutput)(agentType, finalText);
            finalText = normalized.output;
            finalText = (0, execution_kernel_1.persistBoundedOutput)(taskId, finalText, Number(options.maxContextOutputBytes || 256 * 1024)).content;
            if (!isError) {
                const toolLoop = await continueAgentToolCalls({
                    output: finalText,
                    nativeSessionId: normalized.sessionId || options.agentSession?.sessionId || "",
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
                    onEvent: (event) => pushWorkEvent(event.type === "tool_result" ? "tool_result" : "status", event.text, { tool: event.tool || "", round: event.round, ok: event.ok }),
                });
                finalText = toolLoop.output;
                normalized.sessionId = toolLoop.nativeSessionId || normalized.sessionId;
                if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
                    finalText += await runIndependentProjectVerification(projectName, workDir, options.timeoutMs || 300000, taskId, executionId, agentType);
                }
            }
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            (0, db_1.recordMetric)(projectName, {
                success: !isError,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            try {
                if (typeof options.onDone === "function") {
                    pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
                    options.onDone({ text: finalText, fileChanges, isError, nativeSessionId: normalized.sessionId || options.agentSession?.sessionId || "", workEvents });
                }
            }
            catch { }
            writeSse(streamRes, { type: "agent_done", agent: projectName, text: finalText, fileChanges, messageId: options.messageId, workEvents });
            broadcastPetSpeech(projectName, { role: isError ? "error" : "assistant", text: finalText, final: true, source: "group" });
            setAgentActivity(projectName, isError ? "error" : "happy", isError ? "错误" : "群聊回复完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            resolve(finalText);
        };
        child.stdout.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            if (!text)
                return;
            output += text;
            const jsonSessionStream = ["codex", "cursor"].includes((0, runtime_1.normalizeAgentRuntimeId)(agentType)) && !!options.agentSession?.persistSession;
            if (!jsonSessionStream) {
                pushWorkEvent("output", text);
                writeSse(streamRes, { type: "chunk", agent: projectName, text });
                broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
            }
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
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
        child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => { }); });
    });
}
// 流式调用 Agent（SSE）
function callAgentStream(projectName, message, workDir, agentType, res, options = {}) {
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const projectRun = (0, chat_runs_1.createProjectChatRun)(projectName, options.userMessage || message, workDir, String(options.parentRunId || options.parent_run_id || ""));
    const { session: taskAgentSession, options: taskAgentSessionOptions } = bindProjectRunAgentSession(projectRun, projectName, agentType);
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const executionBrief = (0, memory_1.buildProjectExecutionBrief)(projectName, options.userMessage || message, {
        workDir,
        query: options.userMessage || message,
        verificationHints: getProjectVerificationCommandsForRunner(projectName),
    });
    fs.writeFileSync(tmpMsg, executionBrief, "utf-8");
    const cmd = (0, runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...taskAgentSessionOptions });
    const send = (data) => writeSse(res, data);
    const workEvents = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushProjectWorkEvent = (kind, text, extra = {}) => {
        const event = {
            id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            agent: projectName,
            kind,
            text: String(text || "").slice(0, 2400),
            ...extra,
        };
        workEvents.push(event);
        if (workEvents.length > 80)
            workEvents.splice(0, workEvents.length - 80);
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
    if (typeof res.flushHeaders === "function")
        res.flushHeaders();
    send({ type: "task_runtime", run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
    for (const event of workEvents)
        send({ type: "work_event", event });
    // 发送状态事件
    pushProjectWorkEvent("status", "Agent 正在思考...");
    send({ type: "status", text: "Agent 正在思考..." });
    broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
    setAgentActivity(projectName, "working", "正在处理消息", null, getAgentRunActivityDuration(300000));
    const child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
    const stopProjectChatTracking = (0, execution_kernel_1.trackManagedChildProcess)(projectRun.id, projectRun.id, child, {
        project: projectName,
        agentType,
        source: "project-chat",
        cwd: safeCwd,
        timeoutMs: 300000,
        commandLabel: (0, runtime_1.getAgentCommandLabel)(agentType),
        title: String(options.userMessage || message || "").slice(0, 120),
    });
    projectRun.child = child;
    projectRun.updated_at = new Date().toISOString();
    (0, chat_runs_1.saveProjectChatRuns)();
    // 关闭 stdin（已通过临时文件传入）
    child.stdin.end();
    let fullOutput = "";
    let stderrOutput = "";
    let finished = false;
    let timeoutTimer = null;
    let lastStderrStatusAt = 0;
    const jsonSessionStream = ["codex", "cursor"].includes((0, runtime_1.normalizeAgentRuntimeId)(agentType)) && !!taskAgentSessionOptions.persistSession;
    const heartbeatTimer = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) {
            try {
                res.write(": keep-alive\n\n");
            }
            catch { }
        }
    }, 15000);
    child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (!text)
            return;
        fullOutput += text;
        if (jsonSessionStream)
            return;
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
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        clearInterval(heartbeatTimer);
        (async () => {
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            const normalized = (0, runtime_1.normalizeAgentCommandOutput)(agentType, fullOutput.trim());
            const nativeFailure = (0, runtime_1.detectAgentCommandFailure)(agentType, fullOutput.trim(), code, stderrOutput);
            let displayOutput = normalized.output || fullOutput.trim();
            if (nativeFailure.failed) {
                const failedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: false, error: nativeFailure.message }) || taskAgentSession;
                projectRun.native_session_id = failedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
                projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
                if (jsonSessionStream && displayOutput) {
                    pushProjectWorkEvent("output", displayOutput);
                    send({ type: "chunk", text: displayOutput });
                }
                const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                projectRun.status = "failed";
                projectRun.fileChanges = fileChanges;
                projectRun.workEvents = workEvents;
                projectRun.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                setAgentActivity(projectName, "error", "执行失败");
                pushProjectWorkEvent("error", nativeFailure.message || "Agent 执行失败", { final: true, fileChanges });
                send({ type: "error", text: nativeFailure.message || "Agent 执行失败", fileChanges, workEvents, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
            let updatedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: true }) || taskAgentSession;
            projectRun.native_session_id = updatedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
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
                onEvent: (event) => pushProjectWorkEvent(event.type === "tool_result" ? "tool_result" : "status", event.text, { tool: event.tool || "", round: event.round, ok: event.ok }),
            });
            const outputWithTools = toolLoop.output;
            if (toolLoop.nativeSessionId && toolLoop.nativeSessionId !== updatedSession.nativeSessionId) {
                updatedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { nativeSessionId: toolLoop.nativeSessionId, success: true }) || updatedSession;
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
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            projectRun.status = "done";
            projectRun.fileChanges = fileChanges;
            projectRun.workEvents = workEvents;
            projectRun.updated_at = new Date().toISOString();
            (0, chat_runs_1.saveProjectChatRuns)();
            (0, db_1.recordMetric)(projectName, {
                success: true,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            setAgentActivity(projectName, "happy", "任务完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            pushProjectWorkEvent("done", "执行完成", { final: true, fileChanges });
            send({ type: "done", fileChanges, workEvents, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
            const failedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
            projectRun.status = "failed";
            projectRun.workEvents = workEvents;
            projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
            projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
            projectRun.updated_at = new Date().toISOString();
            (0, chat_runs_1.saveProjectChatRuns)();
            send({ type: "error", text: err.message, workEvents, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
            try {
                res.end();
            }
            catch { }
        });
    });
    child.on("error", (err) => {
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        clearInterval(heartbeatTimer);
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        pushProjectWorkEvent("error", err.message, { final: true });
        const failedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
        projectRun.status = "failed";
        projectRun.workEvents = workEvents;
        projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        projectRun.updated_at = new Date().toISOString();
        (0, chat_runs_1.saveProjectChatRuns)();
        send({ type: "error", text: err.message, workEvents, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
        (0, db_1.recordMetric)(projectName, {
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "error", text: err.message, final: true, source: "project" });
        setAgentActivity(projectName, "error", "错误");
        res.end();
    });
    // 超时处理
    timeoutTimer = setTimeout(() => {
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        clearInterval(heartbeatTimer);
        try {
            child.kill();
        }
        catch { }
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        const failedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: "Agent 响应超时" }) || taskAgentSession;
        projectRun.status = "failed";
        projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        projectRun.updated_at = new Date().toISOString();
        (0, chat_runs_1.saveProjectChatRuns)();
        send({ type: "error", text: "Agent 响应超时", run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: {
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
function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
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
    const headers = { "Content-Type": contentType };
    if (ext === ".html")
        headers["Content-Type"] = "text/html; charset=utf-8";
    if (ext === ".js" || ext === ".css")
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
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
        createFileChangeSnapshot: utils_1.createFileChangeSnapshot,
        getFileChanges: utils_1.getFileChanges,
        recordMetric: db_1.recordMetric,
        toolManager: tool_manager_1.toolManager,
        buildUploadedFilesContext: utils_1.buildUploadedFilesContext,
        summarizeUploadedFiles: utils_1.summarizeUploadedFiles,
        buildFilesContext: utils_1.buildFilesContext,
        collectRequestBuffer: utils_1.collectRequestBuffer,
        getMultipartBoundary: utils_1.getMultipartBoundary,
        parseMultipart: utils_1.parseMultipart,
        getSharedFilePath: utils_1.getSharedFilePath,
        createSharedFileRecord: utils_1.createSharedFileRecord,
        normalizeSharedFileList: utils_1.normalizeSharedFileList,
        onTaskStatusChange: cron_1.syncCronTaskStatus,
    };
}
// === 主生命周期请求拦截与模块化分流 ===
function handleRequest(req, res) {
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
        (0, utils_1.sendJson)(res, {
            success: true,
            runs: (0, execution_kernel_1.listActiveAgentRuns)({
                taskId: parsed.query.task_id || parsed.query.taskId,
                project: parsed.query.project,
            }),
            generated_at: new Date().toISOString(),
        });
        return;
    }
    if (pathname === "/api/agent-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, execution_kernel_1.cancelActiveAgentRun)(payload);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
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
        if (isWorkspaceClient)
            petWorkspaceClients.add(res);
        const snapshot = getPetAgents();
        writeSse(res, { type: "snapshot", agents: snapshot });
        const prevStates = {};
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
                            track: s.track || null
                        });
                    }
                }
            }
            catch { }
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
        return sendFile(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    if (pathname.startsWith("/assets/") || pathname.startsWith("/public/") ||
        pathname.startsWith("/css/") || pathname.startsWith("/js/") ||
        pathname === "/favicon.svg" || pathname === "/icons.svg" || pathname === "/favicon.ico") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname.startsWith("/public/") ? pathname.replace("/public/", "") : pathname);
        if (fs.existsSync(filePath)) {
            return sendFile(res, filePath);
        }
    }
    // SPA fallback
    if (!pathname.startsWith("/api/") && req.method === "GET") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return sendFile(res, filePath);
        }
        return sendFile(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    // 提供飞书扫码二维码等临时文件访问的动态路由
    if (pathname.startsWith("/api/uploads/") && req.method === "GET") {
        const filename = pathname.split("/").pop();
        if (filename) {
            const filePath = path.join(utils_1.UPLOAD_DIR, filename);
            console.log("[文件访问] 请求文件:", filename, "路径:", filePath, "存在:", fs.existsSync(filePath));
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filename).toLowerCase();
                const types = { ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };
                res.writeHead(200, {
                    "Content-Type": types[ext] || "application/octet-stream",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                });
                fs.createReadStream(filePath).pipe(res);
                return;
            }
        }
        (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
        return;
    }
    // 3. 构建依赖注入上下文 (Contexts)
    const projectsCtx = {
        PORT,
        getSessions: sessions_2.getSessions,
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
        let runForCleanup = null;
        let continuationRunForCleanup = null;
        try {
            (0, child_process_1.execSync)("git init", { cwd: dir, stdio: "ignore" });
            fs.writeFileSync(path.join(dir, "tracked.txt"), "before\n", "utf-8");
            (0, child_process_1.execSync)("git add tracked.txt", { cwd: dir, stdio: "ignore" });
            (0, child_process_1.execSync)("git -c user.name=ccm -c user.email=ccm@example.local commit -m init", { cwd: dir, stdio: "ignore" });
            const run = (0, chat_runs_1.createProjectChatRun)("self-test-project", "修改 tracked.txt", dir);
            runForCleanup = run;
            const firstSession = bindProjectRunAgentSession(run, "self-test-project", "claudecode").session;
            const afterFirstTurn = (0, agent_sessions_1.recordTaskAgentSessionTurn)(firstSession.id, { nativeSessionId: firstSession.nativeSessionId, success: true }) || firstSession;
            const continuationRun = (0, chat_runs_1.createProjectChatRun)("self-test-project", "继续修改 tracked.txt", dir, run.id);
            continuationRunForCleanup = continuationRun;
            const continuationSession = bindProjectRunAgentSession(continuationRun, "self-test-project", "claudecode").session;
            if (!run.checkpoint_id)
                return (0, utils_1.sendJson)(res, { success: false, error: run.checkpoint?.error || "未创建检查点", run: (0, chat_runs_1.publicProjectChatRun)(run), checkpoint: run.checkpoint }, 500);
            fs.writeFileSync(path.join(dir, "tracked.txt"), "after\n", "utf-8");
            const beforeRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, "project run self-test", { allowShared: true });
            const afterRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const normalizedAfter = afterRollback.replace(/\r\n/g, "\n");
            let persistedBeforeCleanup = false;
            try {
                const persisted = JSON.parse(fs.readFileSync(chat_runs_1.PROJECT_CHAT_RUNS_FILE, "utf-8"));
                persistedBeforeCleanup = (persisted.runs || []).some((item) => item.id === run.id && item.checkpoint_id === run.checkpoint_id);
            }
            catch { }
            const continuationReusesSession = continuationRun.task_session_scope_id === run.id
                && continuationRun.task_agent_session_id === run.task_agent_session_id
                && continuationSession.id === firstSession.id
                && Number(continuationSession.turnCount || 0) >= Number(afterFirstTurn.turnCount || 0);
            (0, utils_1.sendJson)(res, { success: rollback.success && beforeRollback === "after\n" && normalizedAfter === "before\n" && persistedBeforeCleanup && continuationReusesSession, run: (0, chat_runs_1.publicProjectChatRun)(run), continuationRun: (0, chat_runs_1.publicProjectChatRun)(continuationRun), rollback, checks: { hasRunId: !!run.id, hasTrace: !!run.trace_id, hasCheckpoint: !!run.checkpoint_id, rollbackRestored: normalizedAfter === "before\n", persistedRunRecord: persistedBeforeCleanup, continuationReusesTaskAgentSession: continuationReusesSession }, contents: { beforeRollback, afterRollback } });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500);
        }
        finally {
            if (continuationRunForCleanup?.checkpoint_id) {
                try {
                    (0, execution_kernel_1.rollbackExecutionCheckpoint)(continuationRunForCleanup.checkpoint_id, "project run continuation self-test cleanup", { allowShared: true });
                }
                catch { }
            }
            if (runForCleanup?.id) {
                chat_runs_1.projectChatRuns.delete(runForCleanup.id);
            }
            if (continuationRunForCleanup?.id)
                chat_runs_1.projectChatRuns.delete(continuationRunForCleanup.id);
            if (runForCleanup?.id || continuationRunForCleanup?.id)
                (0, chat_runs_1.saveProjectChatRuns)();
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        return;
    }
    if (pathname === "/api/project-runs/get" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.run_id || "").trim();
        const run = id ? chat_runs_1.projectChatRuns.get(id) : null;
        if (!run)
            return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        return (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run), fileChanges: run.fileChanges || null, workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [] });
    }
    if (pathname === "/api/project-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = chat_runs_1.projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (run.child) {
                    try {
                        (0, execution_kernel_1.terminateManagedChildProcess)(run.child);
                    }
                    catch {
                        try {
                            run.child.kill();
                        }
                        catch { }
                    }
                }
                run.status = "cancelled";
                run.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
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
                const run = chat_runs_1.projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (!run.checkpoint_id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "该项目执行没有可用检查点" }, 409);
                const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, payload.reason || "用户从项目聊天安全撤销", { allowShared: true });
                run.status = "reverted";
                run.rollback = rollback;
                run.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run), rollback });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
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
                const run = (0, chat_runs_1.archiveProjectChatRun)(id, String(payload.reason || "用户删除项目执行记录").slice(0, 500));
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, run: (0, chat_runs_1.publicProjectChatRun)(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
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
                const result = (0, chat_runs_1.purgeProjectChatRun)(id);
                if (!result)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, run_id: id, cleanup: result.cleanup });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/summary" && req.method === "GET") {
        return (0, utils_1.sendJson)(res, (0, cleanup_center_1.getCleanupSummary)());
    }
    if (pathname === "/api/cleanup/preview" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, cleanup_center_1.previewCleanupAction)(String(payload.action || ""));
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                if (payload.confirm !== true)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少确认参数 confirm=true" }, 400);
                const result = (0, cleanup_center_1.runCleanupAction)(String(payload.action || ""));
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleStreamSend = (project, message, files = [], parentRunId = "") => {
            const finalMessage = files && files.length > 0
                ? `${message || ""}${(0, utils_1.buildUploadedFilesContext)(files, "本次消息附件")}`
                : (message || "");
            if (!project || !finalMessage.trim())
                return (0, utils_1.sendJson)(res, { error: "参数不足" }, 400);
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            if (toolContext.dispatchGate?.dispatchReady === false)
                return sendRuntimeToolDispatchBlocked(res, toolContext);
            if (resolvedRuntime.switched) {
                toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
                toolContext.workEvent.runtimeFallback = resolvedRuntime;
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
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    handleStreamSend(fields.project, fields.message, files, String(fields.parent_run_id || fields.parentRunId || ""));
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message, parent_run_id, parentRunId } = JSON.parse(body);
                handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 发送消息给 Agent（非流式）===
    if (pathname === "/api/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleSend = async (project, message, files) => {
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            if (!workDir)
                return (0, utils_1.sendJson)(res, { error: "无法获取项目目录" }, 400);
            let fullMessage = message || "";
            if (files && files.length > 0) {
                const filesContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                fullMessage = fullMessage ? `${fullMessage}${filesContext}` : `请处理以下附件：${filesContext}`;
            }
            if (!fullMessage)
                return (0, utils_1.sendJson)(res, { error: "消息不能为空" }, 400);
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            if (toolContext.dispatchGate?.dispatchReady === false)
                return sendRuntimeToolDispatchBlocked(res, toolContext);
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
                (0, utils_1.sendJson)(res, { success: true, output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.stdout || e.stderr || e.message || "发送失败" }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    await handleSend(fields.project, fields.message, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 4. API 子模块分流拦截
    if ((0, projects_1.handleProjectsApi)(pathname, req, res, parsed, projectsCtx))
        return;
    if ((0, sessions_1.handleSessionsApi)(pathname, req, res, parsed))
        return;
    if ((0, git_1.handleGitApi)(pathname, req, res, parsed))
        return;
    if ((0, marketplace_1.handleMarketplaceApi)(pathname, req, res, parsed))
        return;
    if ((0, templates_1.handleTemplatesApi)(pathname, req, res, parsed))
        return;
    if ((0, cron_1.handleCronApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, tools_1.handleToolsAndMetricsApi)(pathname, req, res, parsed))
        return;
    if ((0, pets_1.handlePetsApi)(pathname, req, res, parsed, petsCtx))
        return;
    if ((0, music_1.handleMusicApi)(pathname, req, res, parsed, musicCtx))
        return;
    if ((0, collaboration_1.handleCollaborationApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, global_agent_1.handleGlobalAgentApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, rag_1.handleRagApi)(pathname, req, res, parsed))
        return;
    if ((0, slash_commands_1.handleSlashCommandsApi)(pathname, req, res, parsed))
        return;
    if ((0, usability_1.handleUsabilityApi)(pathname, req, res))
        return;
    const { handleMemoryCenterApi } = require("./modules/knowledge/memory-control-center");
    if (handleMemoryCenterApi(pathname, req, res, parsed))
        return;
    // 404 fallback
    (0, utils_1.sendJson)(res, { error: "Not Found" }, 404);
}
// === 启动服务器 ===
function bootstrapServerRuntime(startupCollabCtx, port) {
    (0, utils_1.refreshEnvPath)();
    const credentialMigration = (0, credential_store_1.migrateConfigDirectory)(utils_1.CONFIGS_DIR);
    const controlBotMigration = (0, credential_store_1.migrateTomlCredentials)(path.join(utils_1.CCM_DIR, "control-bot", "config.toml"));
    const protectedFeishuConfig = (0, db_1.loadFeishuConfig)();
    if (Object.keys(protectedFeishuConfig || {}).length)
        (0, db_1.saveFeishuConfig)(protectedFeishuConfig);
    const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
    if (migratedCredentials > 0)
        console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
    tool_manager_1.toolManager.loadTools().catch((e) => console.error("[ToolManager]", e.message));
    (0, cron_1.startCronScheduler)(startupCollabCtx);
    (0, collaboration_1.startTaskWatchdog)(startupCollabCtx);
    const autoAgentRecoveryMonitor = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_AGENT_RECOVERY_MONITOR || ""));
    if (autoAgentRecoveryMonitor) {
        (0, collaboration_1.startAgentRecoveryMonitor)(startupCollabCtx);
    }
    else {
        console.log("[执行通道恢复监控] 默认关闭；执行通道探针仅在用户点击“复检执行通道”或手动运行恢复监控时触发");
    }
    const globalMemoryBootstrap = (0, global_agent_1.bootstrapGlobalAgentMemoryForServer)();
    if (globalMemoryBootstrap.total > 0)
        console.log(`[全局记忆] 启动迁移/同步 ${globalMemoryBootstrap.migrated}/${globalMemoryBootstrap.total} 个历史会话`);
    const missionSupervisor = (0, global_agent_1.startGlobalMissionSupervisionForServer)(startupCollabCtx);
    if (missionSupervisor.resumed > 0)
        console.log(`[全局任务监工] 启动恢复 ${missionSupervisor.resumed} 个异步监督任务`);
    (0, reliability_drills_1.startReliabilityDrillScheduler)();
    (0, usability_1.startUsabilityArchiveScheduler)();
    const soakResume = (0, soak_test_1.resumeSoakTest)();
    if (soakResume.resumed)
        console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
    const resumeResult = (0, collaboration_1.resumeTaskQueues)(startupCollabCtx);
    if (resumeResult.total > 0) {
        console.log(resumeResult.manual_recovery
            ? `[任务队列] 启动发现 ${resumeResult.total} 个可恢复自动任务，已进入手动恢复模式`
            : `[任务队列] 启动恢复 ${resumeResult.resumed}/${resumeResult.total} 个自动执行任务`);
    }
}
function startServer(port) {
    PORT = port;
    const startupCollabCtx = createCollabCtx();
    const server = http.createServer(handleRequest);
    server.on("close", () => {
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, soak_test_1.shutdownSoakMonitor)();
    });
    server.listen(port, () => {
        // Port ownership is the fail-closed singleton gate. No schedulers, queue
        // recovery, soak resume, or mutable startup work may run before it succeeds.
        bootstrapServerRuntime(startupCollabCtx, port);
        console.log(`\n╔══════════════════════════════════════╗`);
        console.log(`║     ccm Web 控制台                    ║`);
        console.log(`╚══════════════════════════════════════╝\n`);
        console.log(`  地址: http://localhost:${port}`);
        console.log(`  按 Ctrl+C 停止\n`);
        void (0, global_agent_1.resumeGlobalAgentLoopsForServer)(startupCollabCtx, port)
            .then(result => { if (result.total > 0)
            console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`); })
            .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`));
        try {
            const feishuConfig = (0, db_1.loadFeishuConfig)();
            const hasControlBotCredentials = !!((feishuConfig.control_bot_app_id || feishuConfig.app_id) && (feishuConfig.control_bot_app_secret || feishuConfig.app_secret));
            if (feishuConfig.control_bot_enabled === true && hasControlBotCredentials) {
                const result = (0, projects_1.startControlBotConnection)(port);
                console.log(`[飞书控制机器人] ${result.message || "长连接已启动"}${result.pid ? ` (PID: ${result.pid})` : ""}`);
            }
        }
        catch (error) {
            console.warn(`[飞书控制机器人] 自动启动失败：${error?.message || error}`);
        }
    });
    return server;
}
let PORT = 3080;
if (require.main === module) {
    PORT = parseInt(process.argv[2]) || 3080;
    (0, process_lifecycle_1.installProcessLifecycleFaultHandlers)();
    const server = startServer(PORT);
    let lifecycleHeartbeat = null;
    server.prependOnceListener("listening", () => {
        (0, process_lifecycle_1.initializeProcessLifecycle)();
        lifecycleHeartbeat = setInterval(() => (0, process_lifecycle_1.touchProcessLifecycle)(), 30_000);
        lifecycleHeartbeat.unref?.();
    });
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        if (lifecycleHeartbeat)
            clearInterval(lifecycleHeartbeat);
        (0, process_lifecycle_1.markProcessShutdown)({ category: "system_shutdown", reason: `收到 ${signal}，执行受控退出`, signal, exit_code: 0 });
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5_000).unref?.();
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("exit", code => (0, process_lifecycle_1.markProcessShutdown)({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}
module.exports = { startServer };
//# sourceMappingURL=server.js.map