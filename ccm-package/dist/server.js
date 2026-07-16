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
const provider_tool_access_evidence_1 = require("./agents/provider-tool-access-evidence");
const native_continuation_1 = require("./agents/native-continuation");
const provider_memory_channel_1 = require("./agents/provider-memory-channel");
const memory_context_consumption_receipt_1 = require("./integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("./integrations/memory-context-consumption-recovery");
const model_capability_cache_1 = require("./modules/collaboration/model-capability-cache");
const agent_sessions_1 = require("./tasks/agent-sessions");
const runtime_tool_sync_1 = require("./tools/runtime-tool-sync");
const tool_authorization_1 = require("./tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("./tools/runtime-tool-real-cli-matrix");
const execution_kernel_1 = require("./agents/execution-kernel");
const memory_1 = require("./projects/memory");
const direct_dispatch_spool_1 = require("./agents/direct-dispatch-spool");
const conversation_turn_control_1 = require("./agents/conversation-turn-control");
// 导入底座与持久层
const utils_1 = require("./core/utils");
const db_1 = require("./core/db");
const server_instance_lock_1 = require("./core/server-instance-lock");
const task_store_1 = require("./core/task-store");
// 导入子模块控制器
const projects_1 = require("./modules/projects/projects");
const project_chat_intent_1 = require("./modules/projects/project-chat-intent");
const sessions_1 = require("./modules/projects/sessions");
const conversation_search_1 = require("./modules/search/conversation-search");
const git_1 = require("./modules/tools/git");
const marketplace_1 = require("./modules/tools/marketplace");
const templates_1 = require("./modules/templates/templates");
const cron_1 = require("./modules/scheduling/cron");
const tools_1 = require("./modules/tools/tools");
const terminal_1 = require("./modules/tools/terminal");
const pets_1 = require("./modules/pets/pets");
const pet_activity_coordinator_1 = require("./modules/pets/pet-activity-coordinator");
const pet_generation_1 = require("./modules/pets/pet-generation");
const music_1 = require("./modules/music/music");
const collaboration_1 = require("./modules/collaboration/collaboration");
const storage_1 = require("./modules/collaboration/storage");
const group_session_lifecycle_head_1 = require("./modules/collaboration/group-session-lifecycle-head");
const feishu_channel_1 = require("./modules/collaboration/feishu-channel");
const group_session_maintenance_1 = require("./modules/collaboration/group-session-maintenance");
const memory_2 = require("./modules/collaboration/memory");
const group_memory_index_1 = require("./modules/collaboration/group-memory-index");
const task_agent_invocation_lineage_1 = require("./tasks/task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("./tasks/task-agent-continuation-soak");
const reliability_drills_1 = require("./system/reliability-drills");
const soak_test_1 = require("./system/soak-test");
const process_lifecycle_1 = require("./system/process-lifecycle");
const global_agent_1 = require("./modules/global/global-agent");
const rag_1 = require("./modules/knowledge/rag");
const slash_commands_1 = require("./modules/tools/slash-commands");
const credential_store_1 = require("./core/credential-store");
const usability_1 = require("./modules/system/usability");
const settings_1 = require("./modules/system/settings");
const role_skills_1 = require("./skills/role-skills");
const chat_runs_1 = require("./projects/chat-runs");
const cleanup_center_1 = require("./system/cleanup-center");
const sessions_2 = require("./modules/projects/sessions");
// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set();
const petWorkspaceClients = new Set();
const stateCache = new Map();
const agentActivity = new Map();
const petWorkspaceTargets = new Map();
const globalPetActivityCoordinator = new pet_activity_coordinator_1.GlobalPetActivityCoordinator();
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
    for (const client of petStatusClients)
        writeSse(client, event);
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
    if (name === MUSIC_PET_AGENT_NAME) {
        for (const client of petStatusClients)
            writeSse(client, event);
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
    for (const client of petStatusClients)
        writeSse(client, coordinated);
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
function setAgentActivity(name, state, detail = "", workspaceTarget = null, durationMs, metadata = null) {
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
            if (coordinated.workspaceTarget)
                setAgentWorkspaceTarget(GLOBAL_PET_AGENT_NAME, coordinated.workspaceTarget);
        }
        else {
            agentActivity.delete(GLOBAL_PET_AGENT_NAME);
        }
    }
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
(0, pet_generation_1.setPetGenerationLifecycleNotifier)(job => {
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
    setAgentActivity(GLOBAL_PET_AGENT_NAME, state, job.stageLabel, { tab: "pets" }, terminal.has(job.status) ? (job.status === "cancelled" ? 1000 : 12000) : 30 * 60 * 1000, { actorKind: "global", source: "pet-generation", displayName: "宠物生成" });
});
function getPetAgents() {
    return [getGlobalPetAgent(), getMusicPetAgent()];
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
function nativeContinuationDoneFields(evidence) {
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
function createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
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
        agentType: (0, runtime_1.normalizeAgentRuntimeId)(agentType || "claudecode"),
        timeoutMs,
        allowedTools,
        mcpConfigPath,
        agentSession: agentSession || null,
        taskId: String(executionInfo?.taskId || ""),
        executionId: String(executionInfo?.executionId || executionInfo?.taskId || ""),
        taskAgentSessionId: String(executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || ""),
        groupId,
        groupSessionId,
        trustedMemoryProviderChannelRequired: executionInfo?.trustedMemoryProviderChannelRequired === true,
        trustedMemoryProviderAcknowledgementRequired: executionInfo?.trustedMemoryProviderAcknowledgementRequired === true,
        memoryContextConsumptionReceiptRequired: executionInfo?.memoryContextConsumptionReceiptRequired === true,
        memoryContextConsumptionChallenge: executionInfo?.memoryContextConsumptionChallenge || null,
        trustedMemoryEnvelopeChecksum: String(executionInfo?.trustedMemoryEnvelopeChecksum || ""),
        trustedMemoryEnvelopeSourceChecksum: String(executionInfo?.trustedMemoryEnvelopeSourceChecksum || ""),
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
        cliAllowedTools: Array.from(new Set([
            ...buildAgentCliAllowedTools(projectName, message),
            ...(executionInfo?.memoryContextConsumptionReceiptRequired === true
                ? ["mcp__ccm__knowledge_context__acknowledge_memory_context"]
                : []),
        ])),
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
function recordNativeCapacityRefreshOutcome(agentType, model, capabilityRecord, binding = {}) {
    const provider = (0, runtime_1.normalizeAgentRuntimeId)(agentType);
    const refreshed = capabilityRecord?.recorded === true;
    const supportsNativeMetadata = ["codex", "cursor"].includes(provider);
    return (0, model_capability_cache_1.recordModelCapabilityRefreshOutcome)({
        provider,
        model: capabilityRecord?.entry?.model || model || "",
        outcome: refreshed ? "refreshed" : supportsNativeMetadata ? "metadata_absent" : "unsupported",
        receiptEvidenceChecksum: capabilityRecord?.entry?.checksum || "",
        refreshRequest: capabilityRecord?.refreshRequest || null,
        reason: refreshed ? "verified_native_capability_receipt_recorded" : supportsNativeMetadata ? "native_execution_completed_without_model_capacity_metadata" : "runtime_has_no_supported_native_capacity_metadata_adapter",
        ...binding,
    });
}
async function callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
    const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
    if (executionInfo?.executionId)
        (0, execution_kernel_1.registerExternalRunnerRequest)(executionInfo.executionId, request.id);
    executionInfo?.onRunnerRequestCreated?.(request.id);
    const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
    if (!result?.success) {
        const label = result?.command || (0, runtime_1.getAgentCommandLabel)(agentType);
        const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
        let persistedRequest = null;
        try {
            persistedRequest = JSON.parse(fs.readFileSync(request.requestFile, "utf-8"));
        }
        catch { }
        throw Object.assign(new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`), {
            runnerRequestId: request.id,
            runnerStarted: !!persistedRequest?.started_at && result?.runtimeToolDispatchBlocked !== true,
            memoryContextConsumptionRecovery: result?.memoryContextConsumptionRecovery || result?.memory_context_consumption_recovery || null,
        });
    }
    const persistedContinuationEvidence = result.nativeContinuationEvidence || null;
    const persistedContinuationValidation = persistedContinuationEvidence
        ? (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(persistedContinuationEvidence, {
            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
            runnerRequestId: request.id,
            requestedNativeSessionId: agentSession?.sessionId || "",
            expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
        })
        : { valid: false, issues: ["evidence_missing"] };
    const nativeContinuationEvidence = persistedContinuationValidation.valid
        ? persistedContinuationEvidence
        : (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
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
        ? (0, model_capability_cache_1.recordVerifiedNativeModelCapabilityReceipt)(result.nativeModelCapabilityReceipt, {
            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
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
        providerToolAccessEvidence: result.providerToolAccessEvidence || result.provider_tool_access_evidence || null,
        providerMemoryChannelEvidence: result.providerMemoryChannelEvidence || result.provider_memory_channel_evidence || null,
        memoryContextConsumptionReceipt: result.memoryContextConsumptionReceipt || result.memory_context_consumption_receipt || null,
        memoryContextConsumptionRecovery: result.memoryContextConsumptionRecovery || result.memory_context_consumption_recovery || null,
    };
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
    const background = workspaceTarget?.background === true || workspaceTarget?.silent === true;
    if (!background)
        setAgentActivity(projectName, workspaceTarget?.taskId || workspaceTarget?.executionId || workspaceTarget?.tab === "groups" ? "building" : "working", `${(0, runtime_1.getAgentRuntime)(agentType).label} 正在${workspaceTarget?.taskId || workspaceTarget?.executionId ? "执行任务" : "处理消息"}`, workspaceTarget || { tab: "projects", project: projectName }, getAgentRunActivityDuration(timeoutMs), { runtime: agentType, actorKind: "third-party", displayName: `${projectName} · ${(0, runtime_1.getAgentRuntime)(agentType).label}` });
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const memorySystemPromptFile = `${tmpMsg}.memory-system.txt`;
    const memoryDeveloperInstructionsFile = `${tmpMsg}.memory-developer.txt`;
    const memoryReceiptRecoveryPromptFile = `${tmpMsg}.memory-receipt-recovery.txt`;
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
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
        ? (0, direct_dispatch_spool_1.createDirectAgentDispatchRequest)({
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
            trustedMemoryProviderChannelRequired: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
            trustedMemoryProviderAcknowledgementRequired: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
            memoryContextConsumptionReceiptRequired: workspaceTarget?.memoryContextConsumptionReceiptRequired === true,
            memoryContextConsumptionChallenge: workspaceTarget?.memoryContextConsumptionChallenge || null,
            trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
            trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
        })
        : null;
    let durableDirectDispatchStarted = false;
    let durableDirectDispatchCompleted = false;
    let providerMemoryChannelEvidence = null;
    let memoryContextConsumptionReceipt = null;
    let memoryContextConsumptionRecovery = null;
    let memoryReceiptRecoveryProviderOutput = "";
    if (durableDirectDispatch) {
        if (executionId)
            (0, execution_kernel_1.registerExternalRunnerRequest)(executionId, durableDirectDispatch.id);
        workspaceTarget?.onRunnerRequestCreated?.(durableDirectDispatch.id);
    }
    try {
        const runtimeVersionSnapshot = (0, runtime_1.captureAgentRuntimeVersionSnapshot)(agentType);
        const providerMemoryChannel = (0, provider_memory_channel_1.prepareProviderMemoryChannel)(agentType, message, {
            required: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
            envelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
            sourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
            runtimeVersionSnapshot,
        });
        if (!providerMemoryChannel.ready)
            throw new Error(`Provider memory channel blocked: ${providerMemoryChannel.issues.join(",")}`);
        fs.writeFileSync(tmpMsg, providerMemoryChannel.userPrompt, "utf-8");
        if (providerMemoryChannel.systemPrompt)
            fs.writeFileSync(memorySystemPromptFile, providerMemoryChannel.systemPrompt, "utf-8");
        if (providerMemoryChannel.developerPrompt)
            fs.writeFileSync(memoryDeveloperInstructionsFile, providerMemoryChannel.developerPrompt, "utf-8");
        const cmd = (0, runtime_1.buildAgentCommand)(agentType, tmpMsg, {
            mcpConfigPath: workspaceTarget?.mcpConfigPath,
            appendSystemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
            developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
            ...(workspaceTarget?.agentSession || {}),
        });
        providerMemoryChannelEvidence = (0, provider_memory_channel_1.bindProviderMemoryChannelLaunch)(providerMemoryChannel, {
            command: cmd,
            systemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
            developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
            runnerRequestId: durableDirectDispatch?.id || "",
            runtimeVersionSnapshot,
        });
        if (workspaceTarget?.trustedMemoryProviderChannelRequired === true && providerMemoryChannelEvidence.status !== "ready") {
            throw new Error(`Provider memory channel launch unverified: ${providerMemoryChannelEvidence.issues.join(",")}`);
        }
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
            onStarted: ({ pid, startedAt }) => {
                durableDirectDispatchStarted = true;
                if (durableDirectDispatch)
                    (0, direct_dispatch_spool_1.markDirectAgentDispatchStarted)(durableDirectDispatch.id, { runnerPid: pid, startedAt });
            },
            onStdout: (text) => {
                if (durableDirectDispatch)
                    (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "stdout", { text });
            },
            onStderr: (text) => {
                if (durableDirectDispatch)
                    (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "stderr", { text });
            },
        });
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        try {
            fs.unlinkSync(memorySystemPromptFile);
        }
        catch { }
        try {
            fs.unlinkSync(memoryDeveloperInstructionsFile);
        }
        catch { }
        const normalized = (0, runtime_1.normalizeAgentCommandOutput)(agentType, managed.stdout, { runtimeVersionSnapshot });
        const nativeContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
            runnerRequestId: durableDirectDispatch?.id || "",
            requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
            returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
            providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
            providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
            expectedProviderContractId: workspaceTarget?.agentSession?.expectedProviderContractId || workspaceTarget?.agentSession?.providerContractId || "",
            nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
            runnerSuccess: true,
        });
        providerMemoryChannelEvidence = (0, provider_memory_channel_1.acknowledgeProviderMemoryChannelLaunch)(providerMemoryChannelEvidence, {
            executionSucceeded: true,
            runnerStarted: durableDirectDispatch ? durableDirectDispatchStarted : true,
            exitCode: managed.exitCode,
            providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
            nativeContinuationEvidence,
            required: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
        });
        if (workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true) {
            const acknowledgement = (0, provider_memory_channel_1.verifyProviderMemoryChannelEvidence)(providerMemoryChannelEvidence, {
                provider: agentType,
                originalPrompt: message,
                envelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
                sourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
                runnerRequestId: durableDirectDispatch?.id || "",
                required: true,
                requireAcknowledgement: true,
                providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
                nativeContinuationEvidence,
                executionSucceeded: true,
            });
            if (!acknowledgement.valid)
                throw new Error(`Provider memory acknowledgement blocked: ${acknowledgement.issues.join(",")}`);
        }
        if (workspaceTarget?.memoryContextConsumptionReceiptRequired === true) {
            let memoryReceipt = (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(workspaceTarget?.memoryContextConsumptionChallenge, {
                groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
                groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
                taskId,
                executionId,
                project: projectName,
                taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            });
            if (!memoryReceipt.valid) {
                const recovery = await (0, memory_context_consumption_recovery_1.recoverMemoryContextConsumptionReceipt)({
                    challenge: workspaceTarget?.memoryContextConsumptionChallenge,
                    provider: agentType,
                    runnerRequestId: durableDirectDispatch?.id || `direct-${taskId}`,
                    groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
                    groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
                    taskId,
                    executionId,
                    project: projectName,
                    taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
                    nativeContinuationEvidence,
                    providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
                    trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
                    trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
                    providerWorkCompleted: true,
                }, async (recoveryRequest) => {
                    fs.writeFileSync(memoryReceiptRecoveryPromptFile, recoveryRequest.prompt, "utf-8");
                    if (durableDirectDispatch)
                        (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "memory_receipt_recovery_started", { recoveryId: recoveryRequest.recoveryId, nativeSessionId: recoveryRequest.nativeSessionId });
                    const recoveryCommand = (0, runtime_1.buildAgentCommand)(agentType, memoryReceiptRecoveryPromptFile, {
                        cliAllowedTools: Array.from(new Set([
                            ...buildAgentCliAllowedTools(projectName, message),
                            "mcp__ccm__knowledge_context__acknowledge_memory_context",
                        ])),
                        mcpConfigPath: workspaceTarget?.mcpConfigPath,
                        persistSession: true,
                        resumeSession: true,
                        sessionId: recoveryRequest.nativeSessionId,
                    });
                    const recoveryRun = await (0, execution_kernel_1.runManagedCommand)({
                        taskId: `${taskId}:memory-receipt-recovery`,
                        command: recoveryCommand,
                        cwd: safeCwd,
                        timeoutMs: Math.min(60_000, Math.max(15_000, timeoutMs || 300_000)),
                        maxOutputBytes: 512 * 1024,
                        env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), workspaceTarget?.envAllowlist || []),
                        project: projectName,
                        agentType,
                        source: "memory-receipt-recovery",
                        commandLabel: (0, runtime_1.getAgentCommandLabel)(agentType),
                        title: "Memory receipt recovery",
                    });
                    memoryReceiptRecoveryProviderOutput = String(recoveryRun.stdout || "");
                    const recoveryOutput = (0, runtime_1.normalizeAgentCommandOutput)(agentType, memoryReceiptRecoveryProviderOutput, { runtimeVersionSnapshot });
                    return {
                        success: true,
                        exitCode: recoveryRun.exitCode,
                        output: recoveryOutput.output,
                        nativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
                        returnedNativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
                        providerOutputContractEvidence: recoveryOutput.providerOutputContractEvidence || null,
                        providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
                    };
                });
                memoryContextConsumptionRecovery = recovery.record;
                if (durableDirectDispatch)
                    (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, recovery.recovered ? "memory_receipt_recovery_completed" : "memory_receipt_recovery_blocked", { recoveryId: recovery.record?.recovery_id || "", status: recovery.record?.status || "blocked" });
                if (!recovery.recovered) {
                    const error = new Error(`Memory context consumption receipt recovery blocked: ${(recovery.record?.issues || memoryReceipt.issues).join(",")}`);
                    error.code = "CCM_MEMORY_CONTEXT_CONSUMPTION_RECEIPT_RECOVERY_BLOCKED";
                    error.memoryContextConsumptionRecovery = recovery.record;
                    throw error;
                }
                memoryReceipt = (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(workspaceTarget?.memoryContextConsumptionChallenge, {
                    groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
                    groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
                    taskId,
                    executionId,
                    project: projectName,
                    taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
                });
            }
            memoryContextConsumptionReceipt = memoryReceipt.receipt;
        }
        const providerToolAccessEvidence = (0, provider_tool_access_evidence_1.extractProviderToolAccessEvidence)(agentType, [String(managed.stdout || ""), memoryReceiptRecoveryProviderOutput].filter(Boolean).join("\n"), {
            runnerRequestId: durableDirectDispatch?.id || "",
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
            taskId,
            executionId,
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        });
        const nativeModelCapabilityReceipt = (0, runtime_1.extractNativeModelCapabilityReceipt)(agentType, managed.stdout, {
            runner: "direct-cli",
            runnerRequestId: durableDirectDispatch?.id || "",
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            taskId,
            executionId,
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
        });
        const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
            ? (0, model_capability_cache_1.recordVerifiedNativeModelCapabilityReceipt)(nativeModelCapabilityReceipt, {
                provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
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
        const bounded = (0, execution_kernel_1.persistBoundedOutput)(taskId, normalized.output, Number(workspaceTarget?.maxContextOutputBytes || 256 * 1024));
        if (durableDirectDispatch)
            (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
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
        if (durableDirectDispatch)
            (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "tool_loop_completed", { nativeSessionId: toolLoop.nativeSessionId || normalized.sessionId || "" });
        let output = toolLoop.output;
        if (!workspaceTarget?.skipIndependentVerification && !background && !/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
            if (durableDirectDispatch)
                (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "verification_started", { projectName });
            output += await runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType);
            if (durableDirectDispatch)
                (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableDirectDispatch.id, "verification_completed", { projectName });
        }
        const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
        const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
            ? toolLoop.nativeSessionId || normalized.sessionId || workspaceTarget?.agentSession?.sessionId || ""
            : "";
        if (durableDirectDispatch) {
            (0, direct_dispatch_spool_1.completeDirectAgentDispatch)(durableDirectDispatch.id, {
                success: true,
                output,
                nativeSessionId: durableNativeSessionId,
                nativeContinuationEvidence,
                nativeModelCapabilityReceipt,
                nativeModelCapabilityRecord,
                providerToolAccessEvidence,
                providerMemoryChannelEvidence,
                memoryContextConsumptionReceipt,
                memoryContextConsumptionRecovery,
                usage: normalized.usage || null,
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
            providerToolAccessEvidence,
            providerMemoryChannelEvidence,
            memoryContextConsumptionReceipt,
            memoryContextConsumptionRecovery,
            isError: false,
            runnerStarted: durableDirectDispatch ? durableDirectDispatchStarted : true,
            fileChanges,
            usage: normalized.usage || null,
        });
        (0, db_1.recordMetric)(projectName, {
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
        try {
            fs.unlinkSync(memoryReceiptRecoveryPromptFile);
        }
        catch { }
        return output;
    }
    catch (e) {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        try {
            fs.unlinkSync(memorySystemPromptFile);
        }
        catch { }
        try {
            fs.unlinkSync(memoryDeveloperInstructionsFile);
        }
        catch { }
        try {
            fs.unlinkSync(memoryReceiptRecoveryPromptFile);
        }
        catch { }
        const failedDirectContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
            runnerRequestId: durableDirectDispatch?.id || "",
            requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
            nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
            runnerSuccess: false,
        });
        if (durableDirectDispatch && durableDirectDispatchStarted && !durableDirectDispatchCompleted) {
            (0, direct_dispatch_spool_1.completeDirectAgentDispatch)(durableDirectDispatch.id, {
                success: false,
                error: String(e?.message || e),
                output: String(e?.stdout || e?.stderr || e?.message || ""),
                exitCode: e?.exitCode,
                signal: e?.signal,
                nativeContinuationEvidence: failedDirectContinuationEvidence,
                providerMemoryChannelEvidence,
                memoryContextConsumptionRecovery: e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery,
            });
            durableDirectDispatchCompleted = true;
        }
        if (isSpawnPermissionError(e) && (e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery)?.suppress_task_replay !== true) {
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
                    trustedMemoryProviderChannelRequired: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
                    trustedMemoryProviderAcknowledgementRequired: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
                    memoryContextConsumptionReceiptRequired: workspaceTarget?.memoryContextConsumptionReceiptRequired === true,
                    memoryContextConsumptionChallenge: workspaceTarget?.memoryContextConsumptionChallenge || null,
                    trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
                    trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
                    onRunnerRequestCreated: workspaceTarget?.onRunnerRequestCreated,
                });
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                workspaceTarget?.onDone?.({
                    runnerRequestId: runner.runnerRequestId || "",
                    nativeSessionId: runner.nativeSessionId || "",
                    ...nativeContinuationDoneFields(runner.nativeContinuationEvidence),
                    nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null,
                    nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null,
                    modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null,
                    providerMemoryChannelEvidence: runner.providerMemoryChannelEvidence || null,
                    memoryContextConsumptionReceipt: runner.memoryContextConsumptionReceipt || null,
                    memoryContextConsumptionRecovery: runner.memoryContextConsumptionRecovery || null,
                    isError: false,
                    runnerStarted: true,
                    fileChanges,
                    usage: runner.usage || null,
                });
                (0, db_1.recordMetric)(projectName, {
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
            }
            catch (runnerError) {
                const failedContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
                    provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
                    runnerRequestId: runnerError?.runnerRequestId || "",
                    requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
                    nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
                    runnerSuccess: false,
                });
                workspaceTarget?.onDone?.({ runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), memoryContextConsumptionRecovery: runnerError?.memoryContextConsumptionRecovery || null, isError: true, error: runnerError?.message || String(runnerError) });
                const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
                (0, db_1.recordMetric)(projectName, {
                    ...metricContext,
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0,
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
        workspaceTarget?.onDone?.({ runnerRequestId: durableDirectDispatch?.id || "", runnerStarted: durableDirectDispatchStarted, nativeSessionId: failedDirectContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedDirectContinuationEvidence), memoryContextConsumptionRecovery: e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery, isError: true, error: e?.message || String(e) });
        (0, db_1.recordMetric)(projectName, {
            ...metricContext,
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0,
            error: e?.message || String(e),
        });
        if (!background) {
            broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
            setAgentActivity(projectName, "error", "错误");
        }
        return output;
    }
}
function callAgentForGroupStream(projectName, message, workDir, agentType, options = {}) {
    const groupId = options.groupId;
    setAgentActivity(projectName, options.petState || "building", options.detail || `${(0, runtime_1.getAgentRuntime)(agentType).label} 正在执行协作任务`, groupId ? { tab: "groups", groupId } : { tab: "groups" }, getAgentRunActivityDuration(options.timeoutMs), { runtime: agentType, actorKind: options.actorKind || "third-party", displayName: options.petDisplayName || `${projectName} · ${(0, runtime_1.getAgentRuntime)(agentType).label}`, source: "group" });
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
        ? (0, direct_dispatch_spool_1.createDirectAgentDispatchRequest)({
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
        if (executionId)
            (0, execution_kernel_1.registerExternalRunnerRequest)(executionId, durableGroupDispatch.id);
        options.onRunnerRequestCreated?.(durableGroupDispatch.id);
    }
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
            child.once("spawn", () => {
                durableGroupDispatchStarted = true;
                if (durableGroupDispatch)
                    (0, direct_dispatch_spool_1.markDirectAgentDispatchStarted)(durableGroupDispatch.id, { runnerPid: child.pid, startedAt: new Date().toISOString() });
            });
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
            if (durableGroupDispatch && !durableGroupDispatchCompleted) {
                (0, direct_dispatch_spool_1.completeDirectAgentDispatch)(durableGroupDispatch.id, { success: false, error: String(spawnError?.message || spawnError) });
                durableGroupDispatchCompleted = true;
            }
            if (!isSpawnPermissionError(spawnError)) {
                const text = `❌ 错误: ${spawnError.message || spawnError}`;
                (0, db_1.recordMetric)(projectName, { ...metricContext, success: false, durationMs: Date.now() - startedAt, fileChangeCount: 0, error: spawnError?.message || String(spawnError) });
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
                onToolEvent: (event) => pushWorkEvent(event.type === "tool_result" ? "tool_result" : "status", event.text, { tool: event.tool || "", round: event.round, ok: event.ok }),
            })
                .then((runner) => {
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                (0, db_1.recordMetric)(projectName, {
                    ...metricContext,
                    success: true,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0,
                    usage: runner.usage || null,
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
                        options.onDone({ text: runner.output, fileChanges, isError: false, runnerStarted: true, runnerRequestId: runner.runnerRequestId, nativeSessionId: runner.nativeSessionId || "", ...nativeContinuationDoneFields(runner.nativeContinuationEvidence), nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null, nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null, modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null, providerToolAccessEvidence: runner.providerToolAccessEvidence || null, providerMemoryChannelEvidence: runner.providerMemoryChannelEvidence || null, memoryContextConsumptionReceipt: runner.memoryContextConsumptionReceipt || null, memoryContextConsumptionRecovery: runner.memoryContextConsumptionRecovery || null, usage: runner.usage || null, workEvents });
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
                    ...metricContext,
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0,
                    error: runnerError?.message || String(runnerError),
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("error", text, { final: true });
                        const failedContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
                            provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
                            runnerRequestId: runnerError?.runnerRequestId || "",
                            requestedNativeSessionId: options.agentSession?.sessionId || "",
                            nativeResumeRequested: options.agentSession?.resumeSession === true,
                            runnerSuccess: false,
                        });
                        options.onDone({ text, fileChanges: null, isError: true, runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), workEvents });
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
            const normalized = isError
                ? { output: finalText, sessionId: "", rawSessionId: "", providerOutputContractEvidence: null }
                : (0, runtime_1.normalizeAgentCommandOutput)(agentType, finalText, { runtimeVersionSnapshot: (0, runtime_1.captureAgentRuntimeVersionSnapshot)(agentType) });
            const nativeContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
                provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
                runnerRequestId: durableGroupDispatch?.id || "",
                requestedNativeSessionId: options.agentSession?.sessionId || "",
                returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
                providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
                providerRuntimeVersionSnapshot: normalized.providerOutputContractEvidence?.runtimeVersionSnapshot || null,
                expectedProviderContractId: options.agentSession?.expectedProviderContractId || options.agentSession?.providerContractId || "",
                nativeResumeRequested: options.agentSession?.resumeSession === true,
                runnerSuccess: !isError,
            });
            const providerToolAccessEvidence = (0, provider_tool_access_evidence_1.extractProviderToolAccessEvidence)(agentType, output, {
                runnerRequestId: durableGroupDispatch?.id || "",
                groupId: options.groupId || options.group_id || "",
                groupSessionId: options.groupSessionId || options.group_session_id || "",
                taskId,
                executionId,
                taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
                nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            });
            // This direct CLI path does not inject the trusted provider-memory channel.
            const providerMemoryChannelEvidence = null;
            const memoryContextConsumptionReceipt = null;
            const memoryContextConsumptionRecovery = null;
            const nativeModelCapabilityReceipt = isError ? null : (0, runtime_1.extractNativeModelCapabilityReceipt)(agentType, output, {
                runner: "direct-cli",
                runnerRequestId: durableGroupDispatch?.id || "",
                groupId: options.groupId || options.group_id || "",
                taskId,
                executionId,
                taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
                nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            });
            const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
                ? (0, model_capability_cache_1.recordVerifiedNativeModelCapabilityReceipt)(nativeModelCapabilityReceipt, {
                    provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
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
            finalText = (0, execution_kernel_1.persistBoundedOutput)(taskId, finalText, Number(options.maxContextOutputBytes || 256 * 1024)).content;
            if (!isError) {
                if (durableGroupDispatch)
                    (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
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
                    onEvent: (event) => pushWorkEvent(event.type === "tool_result" ? "tool_result" : "status", event.text, { tool: event.tool || "", round: event.round, ok: event.ok }),
                });
                finalText = toolLoop.output;
                normalized.sessionId = toolLoop.nativeSessionId || normalized.sessionId;
                if (durableGroupDispatch)
                    (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "tool_loop_completed", { nativeSessionId: normalized.sessionId || "" });
                if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
                    if (durableGroupDispatch)
                        (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "verification_started", { projectName });
                    finalText += await runIndependentProjectVerification(projectName, workDir, options.timeoutMs || 300000, taskId, executionId, agentType);
                    if (durableGroupDispatch)
                        (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "verification_completed", { projectName });
                }
            }
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
                ? normalized.sessionId || options.agentSession?.sessionId || ""
                : "";
            if (durableGroupDispatch && durableGroupDispatchStarted && !durableGroupDispatchCompleted) {
                (0, direct_dispatch_spool_1.completeDirectAgentDispatch)(durableGroupDispatch.id, {
                    success: !isError,
                    output: finalText,
                    error: isError ? finalText : "",
                    nativeSessionId: durableNativeSessionId,
                    nativeContinuationEvidence,
                    nativeModelCapabilityReceipt,
                    nativeModelCapabilityRecord,
                    providerToolAccessEvidence,
                    usage: normalized.usage || null,
                });
                durableGroupDispatchCompleted = true;
            }
            (0, db_1.recordMetric)(projectName, {
                ...metricContext,
                success: !isError,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0,
                usage: normalized.usage || null,
                error: isError ? finalText : "",
            });
            try {
                if (typeof options.onDone === "function") {
                    pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
                    options.onDone({ text: finalText, fileChanges, isError, runnerRequestId: durableGroupDispatch?.id || "", runnerStarted: durableGroupDispatch ? durableGroupDispatchStarted : true, nativeSessionId: durableNativeSessionId, ...nativeContinuationDoneFields(nativeContinuationEvidence), nativeModelCapabilityReceipt, nativeModelCapabilityRecord, modelCapabilityRefreshOutcome, providerToolAccessEvidence, providerMemoryChannelEvidence, memoryContextConsumptionReceipt, memoryContextConsumptionRecovery, usage: normalized.usage || null, workEvents });
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
            if (durableGroupDispatch)
                (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "stdout", { text });
            const jsonSessionStream = ["codex", "cursor"].includes((0, runtime_1.normalizeAgentRuntimeId)(agentType)) && !!options.agentSession?.persistSession;
            if (!jsonSessionStream) {
                pushWorkEvent("output", text);
                writeSse(streamRes, { type: "chunk", agent: projectName, text });
                broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
            }
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            if (durableGroupDispatch)
                (0, direct_dispatch_spool_1.appendDirectAgentDispatchTranscript)(durableGroupDispatch.id, "stderr", { text });
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
    const messageMode = String(options.messageMode || options.message_mode || "task");
    const showTaskExperience = messageMode === "task";
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const projectRun = (0, chat_runs_1.createProjectChatRun)(projectName, options.userMessage || message, workDir, String(options.parentRunId || options.parent_run_id || ""));
    projectRun.message_mode = messageMode;
    projectRun.workflow_decision = options.workflowDecision || options.workflow_decision || null;
    (0, chat_runs_1.saveProjectChatRuns)();
    const { session: taskAgentSession, options: taskAgentSessionOptions } = bindProjectRunAgentSession(projectRun, projectName, agentType);
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const executionBrief = showTaskExperience
        ? (0, memory_1.buildProjectExecutionBrief)(projectName, options.userMessage || message, {
            workDir,
            query: options.userMessage || message,
            verificationHints: getProjectVerificationCommandsForRunner(projectName),
        })
        : (0, memory_1.buildProjectConversationBrief)(projectName, options.userMessage || message, {
            analysis: messageMode === "project_analysis",
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
        if (showTaskExperience)
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
    send({ type: "presentation", message_mode: messageMode, show_task_card: showTaskExperience, workflow_decision: projectRun.workflow_decision });
    if (showTaskExperience)
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
    if (showTaskExperience)
        for (const event of workEvents)
            send({ type: "work_event", event });
    // 发送状态事件
    pushProjectWorkEvent("status", "Agent 正在思考...");
    send({ type: "status", text: "Agent 正在思考..." });
    broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
    setAgentActivity(projectName, "working", showTaskExperience ? "正在处理任务" : "正在回复", null, getAgentRunActivityDuration(300000));
    const child = (0, child_process_1.spawn)(cmd, [], {
        shell: true,
        cwd: safeCwd,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), options.envAllowlist || []),
    });
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
            const runtimeVersionSnapshot = (0, runtime_1.captureAgentRuntimeVersionSnapshot)(agentType);
            const normalized = (0, runtime_1.normalizeAgentCommandOutput)(agentType, fullOutput.trim(), { runtimeVersionSnapshot });
            const nativeContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
                provider: (0, runtime_1.normalizeAgentRuntimeId)(agentType),
                requestedNativeSessionId: taskAgentSessionOptions.sessionId || "",
                returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
                providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
                providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
                expectedProviderContractId: taskAgentSessionOptions.expectedProviderContractId || taskAgentSessionOptions.providerContractId || "",
                nativeResumeRequested: taskAgentSessionOptions.resumeSession === true,
                runnerSuccess: code === 0,
            });
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
            let updatedSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, {
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
        onTaskStatusChange: async (task, status, result = "") => {
            (0, cron_1.syncCronTaskStatus)(task, status, result);
            try {
                await (0, feishu_channel_1.notifyFeishuTaskStatus)(task, status, result);
            }
            catch (error) {
                console.warn("[飞书进度通知]", error?.message || error);
            }
        },
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
    if (pathname === "/api/conversation-turns/self-test" && req.method === "GET") {
        const result = (0, conversation_turn_control_1.runConversationTurnControlSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, ...result }, result.pass ? 200 : 500);
        return;
    }
    if (pathname === "/api/conversation-turns/stop" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const scope = String(payload.scope || "").trim();
                if (scope !== "group")
                    return (0, utils_1.sendJson)(res, { success: false, error: "该入口请使用对应 Agent 的停止接口" }, 400);
                const cancellation = (0, execution_kernel_1.requestGroupSessionAgentCancellation)({
                    groupId: payload.group_id || payload.groupId,
                    groupSessionId: payload.group_session_id || payload.groupSessionId,
                    taskIds: [payload.task_id || payload.taskId].filter(Boolean),
                    reason: payload.reason || "用户停止群聊主 Agent 当前工作",
                    actor: payload.actor || "conversation-turn-control",
                });
                (0, utils_1.sendJson)(res, { success: true, cancellation });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if ((0, conversation_turn_control_1.handleConversationTurnControlApi)(pathname, req, res, parsed))
        return;
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
                const result = (0, cleanup_center_1.previewCleanupAction)(String(payload.action || ""), {
                    retention_days: payload.retention_days,
                });
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
                const result = (0, cleanup_center_1.runCleanupAction)(String(payload.action || ""), {
                    preview_token: payload.preview_token,
                    selected_ids: payload.selected_ids,
                });
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
        const handleStreamSend = async (project, message, files = [], parentRunId = "") => {
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
            let chatIntent;
            try {
                chatIntent = await (0, project_chat_intent_1.classifyProjectChatIntentWithModel)(message, files, { forceTask: !!parentRunId, project });
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, {
                    success: false,
                    error: `统一大模型无法形成可靠工作流决策，本轮未启动项目 Agent：${error?.message || error}`,
                }, 503);
            }
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
                messageMode: chatIntent.mode,
                workflowDecision: chatIntent.workflowDecision,
            });
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    void handleStreamSend(fields.project, fields.message, files, String(fields.parent_run_id || fields.parentRunId || ""));
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
                void handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""));
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
    if ((0, conversation_search_1.handleConversationSearchApi)(pathname, req, res, parsed))
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
    if ((0, settings_1.handleSystemSettingsApi)(pathname, req, res))
        return;
    const { handleMemoryCenterApi } = require("./modules/knowledge/memory-control-center");
    if (handleMemoryCenterApi(pathname, req, res, parsed))
        return;
    // 404 fallback
    (0, utils_1.sendJson)(res, { error: "Not Found" }, 404);
}
// === 启动服务器 ===
function bootstrapServerRuntime(startupCollabCtx, port) {
    const recoveredConversationTurns = conversation_turn_control_1.conversationTurnControl.recoverInterrupted();
    if (recoveredConversationTurns.recovered > 0) {
        console.log(`[会话消息队列] 已恢复 ${recoveredConversationTurns.recovered} 条服务重启前发送中的消息`);
    }
    const petGenerationRecovery = (0, pet_generation_1.recoverPetGenerationJobs)();
    if (petGenerationRecovery.recovered > 0)
        console.log(`[宠物生成] 标记 ${petGenerationRecovery.recovered} 个中断任务等待重试`);
    (0, utils_1.refreshEnvPath)();
    const roleSkills = (0, role_skills_1.ensureRoleSkillsInstalled)({ force: true });
    console.log(`[角色 Skill] 已就绪 ${roleSkills.available.length} 个${roleSkills.installed.length ? `，更新 ${roleSkills.installed.length} 个` : ""}`);
    const credentialMigration = (0, credential_store_1.migrateConfigDirectory)(utils_1.CONFIGS_DIR);
    const controlBotMigration = (0, credential_store_1.migrateTomlCredentials)(path.join(utils_1.CCM_DIR, "control-bot", "config.toml"));
    const protectedFeishuConfig = (0, db_1.loadFeishuConfig)();
    if (Object.keys(protectedFeishuConfig || {}).length)
        (0, db_1.saveFeishuConfig)(protectedFeishuConfig);
    const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
    if (migratedCredentials > 0)
        console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
    tool_manager_1.toolManager.loadTools().catch((e) => console.error("[ToolManager]", e.message));
    const typedMemoryArtifactRecovery = (0, group_memory_index_1.recoverGroupTypedMemoryArtifactTransactionsFleet)();
    if (typedMemoryArtifactRecovery.checked > 0) {
        console.log(`[记忆多工件事务] 检查 ${typedMemoryArtifactRecovery.checked} 个会话：恢复 ${typedMemoryArtifactRecovery.recovered}，清理 ${typedMemoryArtifactRecovery.cleaned}，当前 ${typedMemoryArtifactRecovery.current}，失败 ${typedMemoryArtifactRecovery.failed}`);
    }
    const lifecycleJournalBootstrap = (0, group_session_lifecycle_head_1.bootstrapGroupSessionLifecycleJournals)();
    if (lifecycleJournalBootstrap.checked > 0) {
        console.log(`[会话生命周期日志] 检查 ${lifecycleJournalBootstrap.checked} 个头：锚定 ${lifecycleJournalBootstrap.adopted}，有效 ${lifecycleJournalBootstrap.current}，失败 ${lifecycleJournalBootstrap.failed}`);
    }
    const lifecycleAgentReconciliation = (0, storage_1.reconcileGroupSessionLifecycleAgentCancellations)();
    if (lifecycleAgentReconciliation.checked > 0) {
        console.log(`[会话生命周期撤销] 检查 ${lifecycleAgentReconciliation.checked} 个会话作用域：有效 ${lifecycleAgentReconciliation.active}，撤销 ${lifecycleAgentReconciliation.revoked}，停止任务 ${lifecycleAgentReconciliation.taskCount}`);
    }
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
    (0, group_session_maintenance_1.startGroupSessionRetentionMaintenanceScheduler)();
    const typedMemoryDispatchRecovery = (0, memory_2.recoverChildTypedMemoryDispatchWal)();
    if (typedMemoryDispatchRecovery.total > 0) {
        console.log(`[记忆派发 WAL] 检查 ${typedMemoryDispatchRecovery.total} 条：恢复提交 ${typedMemoryDispatchRecovery.recovered}，不确定 ${typedMemoryDispatchRecovery.uncertain}，过期 ${typedMemoryDispatchRecovery.expired}`);
    }
    const invocationRecovery = (0, task_agent_invocation_lineage_1.reconcileTaskAgentInvocationRecovery)();
    if (invocationRecovery.checked > 0) {
        console.log(`[子 Agent 调用谱系] 检查 ${invocationRecovery.checked} 条：恢复 ${invocationRecovery.recovered}，不确定 ${invocationRecovery.uncertain}，活跃 ${invocationRecovery.active}，待定 ${invocationRecovery.pending}，重连 ${invocationRecovery.relinked}，隔离 ${invocationRecovery.quarantined}`);
    }
    const continuationSoakRecovery = (0, task_agent_continuation_soak_1.reconcileTaskAgentContinuationSoak)({
        invocationEdges: (0, task_agent_invocation_lineage_1.listTaskAgentInvocationEdges)({}).edges,
        taskAgentSessions: (0, agent_sessions_1.listTaskAgentSessions)(),
    });
    if (continuationSoakRecovery.checked > 0) {
        console.log(`[续接 Soak] 检查 ${continuationSoakRecovery.checked} 条：补录 ${continuationSoakRecovery.recorded}，幂等 ${continuationSoakRecovery.idempotent}，失败 ${continuationSoakRecovery.failed}`);
    }
    const memoryReceiptReconciliation = (0, memory_context_consumption_receipt_1.reconcileMemoryContextConsumptionReceipts)({ prune: true });
    if (memoryReceiptReconciliation.summary.receiptFileCount > 0 || memoryReceiptReconciliation.summary.referencedMissingCount > 0) {
        const summary = memoryReceiptReconciliation.summary;
        console.log(`[模型记忆加载回执] 对账 ${summary.receiptFileCount} 个文件：有效引用 ${summary.referencedValidCount}，缺失 ${summary.referencedMissingCount}，无效 ${summary.referencedInvalidCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，跳过 ${summary.skippedCount}`);
    }
    const memoryReceiptRecoveryInventory = (0, memory_context_consumption_recovery_1.reconcileMemoryContextConsumptionRecoveries)({ prune: true, reconcileInterrupted: true });
    if (memoryReceiptRecoveryInventory.summary.count > 0) {
        const summary = memoryReceiptRecoveryInventory.summary;
        console.log(`[模型记忆加载补救] 恢复 ${summary.recoveredCount}，阻断 ${summary.blockedCount}，运行 ${summary.runningCount}，中断 ${summary.interruptedCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，无效 ${summary.invalidCount}，禁止整任务重放 ${summary.replaySuppressedCount}`);
    }
    const soakResume = (0, soak_test_1.resumeSoakTest)();
    if (soakResume.resumed)
        console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
    const resumeResult = (0, collaboration_1.resumeTaskQueues)(startupCollabCtx);
    if (resumeResult.total > 0) {
        console.log(`[任务队列] 启动恢复检查 ${resumeResult.total} 个未完成任务：`
            + `已自动接上 ${resumeResult.auto_resumed || resumeResult.resumed || 0} 个，`
            + `等待确认 ${resumeResult.manual_pending || 0} 个，`
            + `跳过 ${resumeResult.skipped || 0} 个`);
    }
}
function startServer(port) {
    PORT = port;
    const instanceLock = (0, server_instance_lock_1.acquireCcmServerInstanceLock)(port);
    const startupCollabCtx = createCollabCtx();
    const server = http.createServer(handleRequest);
    server.on("error", () => (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock));
    server.on("close", () => {
        (0, terminal_1.stopAllTerminalRuns)();
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, global_agent_1.stopFeishuConversationTurnRecoveryForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, group_session_maintenance_1.stopGroupSessionRetentionMaintenanceScheduler)();
        (0, model_capability_cache_1.stopModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.stopRuntimeToolRealCliMatrixScheduler)();
        (0, soak_test_1.shutdownSoakMonitor)();
        (0, task_store_1.closeSqliteTaskStore)();
        (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock);
    });
    server.listen(port, () => {
        // Port ownership and the data-directory lock are the fail-closed singleton
        // gates. No mutable startup work may run before both have succeeded.
        bootstrapServerRuntime(startupCollabCtx, port);
        (0, model_capability_cache_1.startModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrixScheduler)();
        console.log(`\n╔══════════════════════════════════════╗`);
        console.log(`║     ccm Web 控制台                    ║`);
        console.log(`╚══════════════════════════════════════╝\n`);
        console.log(`  地址: http://localhost:${port}`);
        console.log(`  按 Ctrl+C 停止\n`);
        void (0, global_agent_1.resumeGlobalAgentLoopsForServer)(startupCollabCtx, port)
            .then(result => {
            if (result.total > 0)
                console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`);
        })
            .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`))
            .finally(() => (0, global_agent_1.startFeishuConversationTurnRecoveryForServer)(`http://127.0.0.1:${port}`, startupCollabCtx));
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
    process.once("exit", () => (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock));
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