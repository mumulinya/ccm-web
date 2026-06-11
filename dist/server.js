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
const child_process_1 = require("child_process");
const tool_manager_1 = require("./tool-manager");
// 导入底座与持久层
const utils_1 = require("./utils");
const db_1 = require("./db");
// 导入子模块控制器
const projects_1 = require("./modules/projects");
const sessions_1 = require("./modules/sessions");
const git_1 = require("./modules/git");
const marketplace_1 = require("./modules/marketplace");
const templates_1 = require("./modules/templates");
const cron_1 = require("./modules/cron");
const tools_1 = require("./modules/tools");
const pets_1 = require("./modules/pets");
const music_1 = require("./modules/music");
const collaboration_1 = require("./modules/collaboration");
const sessions_2 = require("./modules/sessions");
// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set();
const petWorkspaceClients = new Set();
const stateCache = new Map();
const agentActivity = new Map();
const petWorkspaceTargets = new Map();
const MUSIC_PET_AGENT_NAME = "music-agent";
const MUSIC_PET_AGENT_DEFAULT_LABEL = "乖乖";
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
function broadcastPetSpeech(agent, payload = {}) {
    const text = payload.text == null ? "" : String(payload.text);
    if (!agent || (!text.trim() && !payload.final))
        return;
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
function getActivityDurationMs(state) {
    const normalized = normalizePetState(state);
    const durations = {
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
function normalizePetState(state) {
    const value = String(state || "idle");
    const allowed = new Set([
        "idle", "working", "thinking", "error", "happy", "attention",
        "notification", "carrying", "sweeping", "juggling", "yawning",
        "dozing", "collapsing", "sleeping", "waking",
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
function getPetAgents() {
    const configs = (0, db_1.getConfigs)();
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
    return [getMusicPetAgent(), ...projectAgents];
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
function buildAgentCommand(agentType, msgFile) {
    switch (agentType) {
        case "cursor": return `type "${msgFile}" | agent -p`;
        case "gemini": return `type "${msgFile}" | gemini -p`;
        case "codex": return `type "${msgFile}" | codex -q`;
        default: return `type "${msgFile}" | claude -p`;
    }
}
async function appendToolResults(output) {
    const calls = tool_manager_1.toolManager.parseToolCalls(output);
    if (calls.length === 0)
        return output;
    const results = [];
    for (const call of calls) {
        try {
            const res = await tool_manager_1.toolManager.executeToolCall(call.name, call.arguments);
            results.push(`[工具结果: ${call.name}]\n${res}`);
        }
        catch (err) {
            results.push(`[工具错误: ${call.name}] ${err.message}`);
        }
    }
    return output + "\n\n" + results.join("\n\n");
}
function callAgent(projectName, message, workDir, agentType, timeoutMs, workspaceTarget = null) {
    setAgentActivity(projectName, "working", "Agent 调用中", workspaceTarget || { tab: "projects", project: projectName }, getAgentRunActivityDuration(timeoutMs));
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = buildAgentCommand(agentType, tmpMsg);
    try {
        const result = (0, child_process_1.execSync)(cmd, {
            encoding: "utf-8",
            timeout: timeoutMs || 300000,
            cwd: safeCwd,
            shell: true,
            maxBuffer: 10 * 1024 * 1024,
        });
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        const output = result.trim();
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
    const cmd = buildAgentCommand(agentType, tmpMsg);
    const streamRes = options.res;
    writeSse(streamRes, { type: "status", text: `🧠 ${projectName} 正在思考...`, agent: projectName });
    broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 正在思考...`, source: "group" });
    return new Promise((resolve) => {
        const child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
        child.stdin.end();
        let output = "";
        let settled = false;
        const timeoutId = setTimeout(() => { finish("⏰ 响应超时", true).catch(() => { }); }, options.timeoutMs || 300000);
        const finish = async (text, isError = false) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeoutId);
            try {
                child.kill();
            }
            catch { }
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            let finalText = text || output.trim();
            if (!isError)
                finalText = await appendToolResults(finalText);
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            (0, db_1.recordMetric)(projectName, {
                success: !isError,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            try {
                if (typeof options.onDone === "function") {
                    options.onDone({ text: finalText, fileChanges, isError });
                }
            }
            catch { }
            writeSse(streamRes, { type: "agent_done", agent: projectName, text: finalText, fileChanges, messageId: options.messageId });
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
            writeSse(streamRes, { type: "chunk", agent: projectName, text });
            broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            if (text.trim() && !output.trim()) {
                writeSse(streamRes, { type: "status", text: `🧠 ${projectName} 运行中...`, agent: projectName });
                broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 运行中...`, source: "group" });
            }
        });
        child.on("close", () => { finish(output.trim()).catch((err) => finish(`❌ 错误: ${err.message}`, true)); });
        child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => { }); });
    });
}
// 流式调用 Agent（SSE）
function callAgentStream(projectName, message, workDir, agentType, res) {
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = buildAgentCommand(agentType, tmpMsg);
    // 设置 SSE
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
    });
    // 发送状态事件
    res.write(`data: ${JSON.stringify({ type: "status", text: "Agent 正在思考..." })}\n\n`);
    broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
    setAgentActivity(projectName, "working", "正在处理消息", null, getAgentRunActivityDuration(300000));
    const child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
    // 关闭 stdin（已通过临时文件传入）
    child.stdin.end();
    let buffer = "";
    let charCount = 0;
    let fullOutput = "";
    let finished = false;
    let timeoutTimer = null;
    child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        fullOutput += text;
        buffer += text;
        charCount += text.length;
        // 每收到数据就发送
        if (charCount > 10) {
            res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
            broadcastPetSpeech(projectName, { role: "assistant", text: buffer, mode: "append", source: "project" });
            buffer = "";
            charCount = 0;
        }
    });
    child.stderr.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (text.trim()) {
            res.write(`data: ${JSON.stringify({ type: "status", text: "Agent 处理中..." })}\n\n`);
            broadcastPetSpeech(projectName, { role: "status", text: "Agent 处理中...", source: "project" });
        }
    });
    child.on("close", () => {
        if (finished)
            return;
        finished = true;
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        (async () => {
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            if (buffer) {
                res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
                broadcastPetSpeech(projectName, { role: "assistant", text: buffer, mode: "append", source: "project" });
            }
            const outputWithTools = await appendToolResults(fullOutput.trim());
            const toolAppend = outputWithTools.slice(fullOutput.trim().length);
            if (toolAppend) {
                res.write(`data: ${JSON.stringify({ type: "chunk", text: toolAppend })}\n\n`);
                broadcastPetSpeech(projectName, { role: "assistant", text: toolAppend, mode: "append", source: "project" });
            }
            broadcastPetSpeech(projectName, { role: "assistant", text: "", mode: "append", final: true, source: "project" });
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            (0, db_1.recordMetric)(projectName, {
                success: true,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            setAgentActivity(projectName, "happy", "任务完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            res.write(`data: ${JSON.stringify({ type: "done", fileChanges })}\n\n`);
            res.end();
        })().catch((err) => {
            res.write(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`);
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
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        res.write(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`);
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
        try {
            child.kill();
        }
        catch { }
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        res.write(`data: ${JSON.stringify({ type: "error", text: "Agent 响应超时" })}\n\n`);
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
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleStreamSend = (project, message, files = []) => {
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
            const agentType = info[0]?.agent || "claudecode";
            callAgentStream(project, finalMessage, workDir, agentType, res);
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    handleStreamSend(fields.project, fields.message, files);
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
                const { project, message } = JSON.parse(body);
                handleStreamSend(project, message);
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
            const agentType = info[0]?.agent || "claudecode";
            const safeCwd = workDir.replace(/\\/g, "/");
            try {
                const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}.txt`);
                fs.writeFileSync(tmpMsg, fullMessage, "utf-8");
                const cmd = buildAgentCommand(agentType, tmpMsg);
                const result = (0, child_process_1.execSync)(cmd, {
                    encoding: "utf-8",
                    timeout: 120000,
                    cwd: safeCwd,
                    shell: true,
                    maxBuffer: 10 * 1024 * 1024,
                });
                try {
                    fs.unlinkSync(tmpMsg);
                }
                catch { }
                (0, utils_1.sendJson)(res, { success: true, output: result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.stdout || e.stderr || "发送失败" }, 500);
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
    // 404 fallback
    (0, utils_1.sendJson)(res, { error: "Not Found" }, 404);
}
// === 启动服务器 ===
function startServer(port) {
    PORT = port;
    (0, utils_1.refreshEnvPath)();
    tool_manager_1.toolManager.loadTools().catch((e) => console.error("[ToolManager]", e.message));
    (0, cron_1.startCronScheduler)(createCollabCtx());
    const server = http.createServer(handleRequest);
    server.on("close", () => (0, cron_1.stopCronScheduler)());
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
//# sourceMappingURL=server.js.map