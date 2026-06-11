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
exports.FEISHU_SCOPES = void 0;
exports.createAndQueueTask = createAndQueueTask;
exports.handleCollaborationApi = handleCollaborationApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../utils");
const db_1 = require("../db");
const group_orchestrator_1 = require("./group-orchestrator");
// === 任务队列系统（支持并行执行）===
const taskQueues = new Map(); // 每个目标（群聊/Agent）独立队列
const runningTasks = new Map(); // 正在运行的任务目标
const runningTaskIds = new Set(); // 正在运行的任务 ID
// 优先级权重
const PRIORITY_WEIGHT = { high: 3, normal: 2, low: 1 };
// === 群聊管理 ===
function loadGroups() {
    if (!fs.existsSync(utils_1.GROUPS_FILE))
        return [];
    try {
        const groups = JSON.parse(fs.readFileSync(utils_1.GROUPS_FILE, "utf-8"));
        if (!Array.isArray(groups))
            return [];
        const before = JSON.stringify(groups);
        const normalized = groups.map(group_orchestrator_1.normalizeGroupOrchestrator);
        if (JSON.stringify(normalized) !== before) {
            saveGroups(normalized);
        }
        return normalized;
    }
    catch {
        return [];
    }
}
function saveGroups(groups) {
    fs.writeFileSync(utils_1.GROUPS_FILE, JSON.stringify(groups, null, 2));
}
function getGroupMessages(groupId) {
    const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    if (!fs.existsSync(file))
        return [];
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return [];
    }
}
function appendGroupMessage(groupId, msg) {
    const messages = getGroupMessages(groupId);
    messages.push(msg);
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}
function saveGroupMessages(groupId, messages) {
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}
function normalizePlanAssignments(assignments) {
    return (assignments || []).map((item) => ({
        ...item,
        status: item.status || "pending",
        statusText: item.statusText || "待处理",
    }));
}
function updateGroupMessageAssignmentStatus(groupId, messageId, project, status, statusText = "") {
    if (!messageId || !project)
        return;
    const messages = getGroupMessages(groupId);
    let changed = false;
    for (const msg of messages) {
        if (msg.id !== messageId || !Array.isArray(msg.assignments))
            continue;
        msg.assignments = msg.assignments.map((item) => {
            if (item.project !== project)
                return item;
            changed = true;
            return {
                ...item,
                status,
                statusText: statusText || status,
                updated_at: new Date().toISOString(),
            };
        });
    }
    if (changed)
        saveGroupMessages(groupId, messages);
}
function safeAddGroupLog(groupId, level, category, message, details = null) {
    try {
        const logs = fs.existsSync(utils_1.GROUP_LOGS_FILE_SHARED)
            ? JSON.parse(fs.readFileSync(utils_1.GROUP_LOGS_FILE_SHARED, "utf-8"))
            : {};
        if (!logs[groupId])
            logs[groupId] = [];
        logs[groupId].push({
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            details
        });
        if (logs[groupId].length > 500)
            logs[groupId] = logs[groupId].slice(-500);
        fs.writeFileSync(utils_1.GROUP_LOGS_FILE_SHARED, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
// === 群聊日志管理 ===
function loadGroupLogs() {
    try {
        if (fs.existsSync(utils_1.GROUP_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(utils_1.GROUP_LOGS_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载群聊日志失败:", e.message);
    }
    return {};
}
function saveGroupLogs(logs) {
    try {
        fs.writeFileSync(utils_1.GROUP_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
function addGroupLog(groupId, level, category, message, details = null) {
    const logs = loadGroupLogs();
    if (!logs[groupId])
        logs[groupId] = [];
    logs[groupId].push({
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        details
    });
    if (logs[groupId].length > 500) {
        logs[groupId] = logs[groupId].slice(-500);
    }
    saveGroupLogs(logs);
}
// === 任务日志系统 ===
const TASK_LOGS_FILE = path.join(utils_1.CCM_DIR, "task-logs.json");
function loadTaskLogs() {
    try {
        if (fs.existsSync(TASK_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(TASK_LOGS_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载任务日志失败:", e.message);
    }
    return {};
}
function saveTaskLogs(logs) {
    try {
        fs.writeFileSync(TASK_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存任务日志失败:", e.message);
    }
}
function addTaskLog(taskId, level, message) {
    const logs = loadTaskLogs();
    if (!logs[taskId])
        logs[taskId] = [];
    logs[taskId].push({
        timestamp: new Date().toISOString(),
        level,
        message
    });
    if (logs[taskId].length > 100) {
        logs[taskId] = logs[taskId].slice(-100);
    }
    saveTaskLogs(logs);
    console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}
function getTaskLogs(taskId, limit = 50) {
    const logs = loadTaskLogs();
    const taskLogs = logs[taskId] || [];
    return taskLogs.slice(-limit);
}
function clearTaskLogs(taskId) {
    const logs = loadTaskLogs();
    delete logs[taskId];
    saveTaskLogs(logs);
}
// === 飞书消息与认证模块 ===
exports.FEISHU_SCOPES = [
    "im:message", // 发送消息
    "im:message.group_at_msg", // 群聊 @ 消息
    "im:chat", // 获取群聊信息
    "im:chat:readonly", // 读取群聊信息
    "contact:user.id:readonly", // 读取用户 ID
];
async function getFeishuTenantToken(appId, appSecret) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        });
        const data = await response.json();
        return data.tenant_access_token || null;
    }
    catch (e) {
        console.error("获取飞书 tenant_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserToken(appId, appSecret, code) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: appId,
                client_secret: appSecret,
                code: code,
                redirect_uri: "http://localhost:3080/api/feishu/callback"
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        console.error("获取 user_access_token 失败:", data.msg);
        return null;
    }
    catch (e) {
        console.error("获取 user_access_token 失败:", e.message);
        return null;
    }
}
async function refreshFeishuUserToken(appId, appSecret, refreshToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: appId,
                client_secret: appSecret,
                refresh_token: refreshToken
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("刷新 user_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserInfo(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("获取用户信息失败:", e.message);
        return null;
    }
}
async function getFeishuChatList(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data.items || [];
        }
        return [];
    }
    catch (e) {
        console.error("获取群聊列表失败:", e.message);
        return [];
    }
}
async function getValidFeishuToken() {
    const config = (0, db_1.loadFeishuConfig)();
    if (!config.app_id || !config.app_secret)
        return null;
    if (config.user_access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date()) {
            return config.user_access_token;
        }
        if (config.user_refresh_token) {
            const refreshed = await refreshFeishuUserToken(config.app_id, config.app_secret, config.user_refresh_token);
            if (refreshed) {
                config.user_access_token = refreshed.access_token;
                config.user_refresh_token = refreshed.refresh_token;
                config.token_expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
                (0, db_1.saveFeishuConfig)(config);
                return refreshed.access_token;
            }
        }
    }
    return await getFeishuTenantToken(config.app_id, config.app_secret);
}
async function sendFeishuMessageToUser(userId, content, msgType = "interactive") {
    const config = (0, db_1.loadFeishuConfig)();
    if (!userId || userId === "test") {
        if (config.authorized_user?.open_id) {
            userId = config.authorized_user.open_id;
        }
        else {
            console.log("[飞书通知] 未配置用户 ID，请先完成授权");
            return false;
        }
    }
    const token = await getValidFeishuToken();
    if (!token) {
        console.log("[飞书通知] 无法获取 Token，请检查 App ID 和 Secret");
        return false;
    }
    try {
        const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                receive_id: userId,
                msg_type: msgType,
                content: typeof content === "string" ? content : JSON.stringify(content)
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            console.log("[飞书通知] 消息发送成功");
            return true;
        }
        else {
            console.error("[飞书通知] 消息发送失败:", result.msg);
            return false;
        }
    }
    catch (e) {
        console.error("[飞书通知] 发送失败:", e.message);
        return false;
    }
}
async function sendTaskCompletionNotification(task, result) {
    const config = (0, db_1.loadFeishuConfig)();
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    const resultSummary = result.substring(0, 200) + (result.length > 200 ? "..." : "");
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "✅ 任务完成通知" },
            template: "green"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**优先级**：${task.priority === 'high' ? '🔴 高' : task.priority === 'normal' ? '🟡 中' : '⚪ 低'}\n**完成时间**：${new Date().toLocaleString("zh-CN")}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**执行结果**：\n${resultSummary}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
async function sendTaskFailureNotification(task, errorMsg) {
    const config = (0, db_1.loadFeishuConfig)();
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "❌ 任务执行失败" },
            template: "red"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**失败时间**：${new Date().toLocaleString("zh-CN")}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**错误信息**：\n${errorMsg.substring(0, 300)}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
// === 协作与辅助规则 ===
function getTaskTargetKey(task) {
    if (task.assign_type === "group" && task.group_id) {
        return `group:${task.group_id}`;
    }
    return `project:${task.target_project}`;
}
function isActionableMentionText(text) {
    const value = String(text || "").trim();
    if (value.length < 4)
        return false;
    if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value))
        return false;
    return true;
}
function normalizeMentionTask(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}
function stripMessageListPrefix(line) {
    return String(line || "").trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
}
function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractActionableMentions(text, group, sourceProject = "") {
    const memberNames = (group.members || [])
        .map((m) => String(m.project || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    const members = new Set(memberNames);
    const results = [];
    const seen = new Set();
    for (const line of String(text || "").split(/\r?\n/)) {
        const normalized = stripMessageListPrefix(line);
        let targetName = "";
        let message = "";
        for (const name of memberNames) {
            const token = `@${name}`;
            if (!normalized.startsWith(token))
                continue;
            const rest = normalized.slice(token.length);
            if (rest && !/^[\s：:，,、\-—]/.test(rest))
                continue;
            targetName = name;
            message = rest.replace(/^[\s：:，,、\-—]+/, "").trim();
            break;
        }
        if (!targetName) {
            const match = normalized.match(/^@([^\s：:，,、\-—]+)(?:\s+|[：:，,、\-—]+)([\s\S]+)$/);
            if (!match)
                continue;
            targetName = match[1];
            message = match[2].trim();
        }
        if (!members.has(targetName) || targetName === sourceProject)
            continue;
        if (!isActionableMentionText(message))
            continue;
        const key = `${targetName}\n${normalizeMentionTask(message)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        results.push({ mention: `@${targetName}`, targetName, message });
    }
    return results;
}
function extractStructuredAssignments(result, group, sourceProject = "") {
    const memberNames = new Set((group.members || [])
        .map((m) => String(m.project || "").trim())
        .filter(Boolean));
    const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
    const seen = new Set();
    const mentions = [];
    for (const item of assignments) {
        const targetName = String(item?.project || item?.targetName || "").trim();
        const message = String(item?.task || item?.message || "").trim();
        if (!memberNames.has(targetName) || targetName === sourceProject)
            continue;
        if (!isActionableMentionText(message))
            continue;
        const key = `${targetName}\n${normalizeMentionTask(message)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        mentions.push({
            mention: `@${targetName}`,
            targetName,
            message,
            reason: String(item?.reason || "").trim(),
            dependsOn: String(item?.dependsOn || "").trim(),
            structured: true,
        });
    }
    return mentions;
}
function getCoordinatorActionMentions(result, group, sourceProject = "") {
    const structured = extractStructuredAssignments(result, group, sourceProject);
    if (structured.length > 0)
        return structured;
    return extractActionableMentions(result?.content || "", group, sourceProject);
}
function formatCollectedAgentOutput(agent, text) {
    return `【${agent}】\n${String(text || "").trim()}`;
}
function checkTaskCompletion(response) {
    if (!response)
        return false;
    const completionMarkers = [
        "✅ 任务完成", "✅ 已完成", "✅ 完成", "任务已完成",
        "已完成任务", "已经完成", "done", "completed", "finished"
    ];
    const lowerResponse = response.toLowerCase();
    return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}
function checkTaskFailure(response) {
    if (!response)
        return false;
    return /\bAgent 错误:|响应超时|^❌\s*错误|转发给 @.+ 失败/i.test(response);
}
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    catch { }
}
// === 跨 Agent 并行与递归协作（核心）===
async function processCrossAgents(groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes = null, depth = 0, seenMentions = new Set(), executionOrder = "parallel") {
    const collectedOutputs = [];
    if (depth > 3) {
        console.log("[跨Agent协作] 达到最大递归深度，停止继续转发");
        return collectedOutputs;
    }
    const mentionLabels = atMentions.map(m => typeof m === "string" ? m : m.mention).filter(Boolean);
    console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${mentionLabels.join(", ")}`);
    const uniqueMentions = atMentions.filter((m, idx, arr) => {
        const key = typeof m === "string" ? m : `${m.targetName}:${m.message}`;
        return arr.findIndex(item => (typeof item === "string" ? item : `${item.targetName}:${item.message}`) === key) === idx;
    });
    const getMentionTargetName = (mention) => {
        const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
        return typeof mention === "string"
            ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr)
            : mention.targetName;
    };
    const executeMentionJob = async (mention) => {
        const outputs = [];
        const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
        const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;
        const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
        const targetMember = group.members.find((m) => m.project === targetName && m.project !== sourceProject);
        if (!targetMember)
            return outputs;
        const atRegex = new RegExp(`@${escapeRegExp(targetName)}\\s+([^@]+?)(?=\\s*@|$)`, "is");
        const atMatch = output.match(atRegex);
        let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;
        if (!atMessage || atMessage.length < 5) {
            const lines = output.split("\n");
            const relevantLines = [];
            let found = false;
            for (const line of lines) {
                if (line.includes(`@${targetName}`)) {
                    found = true;
                    relevantLines.push(line.replace(`@${targetName}`, "").trim());
                }
                else if (found && line.trim() && !line.startsWith("@")) {
                    relevantLines.push(line.trim());
                }
                else if (found && line.includes("@")) {
                    break;
                }
            }
            atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
        }
        const taskKey = `${sourceProject}->${targetName}:${normalizeMentionTask(atMessage)}`;
        if (seenMentions.has(taskKey)) {
            addGroupLog(groupId, "info", "collaboration", `跳过重复协作: ${sourceProject} -> ${targetName}`, { task: atMessage.substring(0, 160) });
            return outputs;
        }
        seenMentions.add(taskKey);
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "fwd",
            role: "assistant", agent: sourceProject,
            content: `📤 → @${targetName}\n${atMessage}`,
            timestamp: new Date().toISOString(),
        });
        writeSse(streamRes, { type: "status", text: `📨 ${sourceProject} 已 @${targetName}，等待 ${targetName} 回复...`, agent: targetName });
        ctx.setAgentActivity(targetName, "working", `被 ${sourceProject} @ 协作`, { tab: "groups", groupId }, 330000);
        ctx.broadcastPetSpeech(targetName, { role: "status", text: `${sourceProject} @ 我协作，正在处理...`, source: "group" });
        const tContext = (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(groupId).slice(-15));
        if (targetName === coordinatorProject) {
            const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
            const result = await (0, group_orchestrator_1.runGroupOrchestrator)({
                group,
                message: atMessage,
                context: tContext,
                source: sourceProject,
            });
            outputs.push(formatCollectedAgentOutput(coordinatorProject, result.content));
            appendGroupMessage(groupId, {
                id: responseMessageId,
                role: "assistant",
                agent: coordinatorProject,
                content: result.content,
                timestamp: new Date().toISOString(),
                assignments: result.assignments || [],
                executionOrder: result.executionOrder || "parallel",
                runtime: result.runtime || "",
            });
            writeSse(streamRes, {
                type: "agent_done",
                agent: coordinatorProject,
                text: result.content,
                messageId: responseMessageId,
                assignments: result.assignments || [],
                executionOrder: result.executionOrder || "parallel",
                runtime: result.runtime || "",
            });
            const nestedMentions = extractActionableMentions(result.content, group, coordinatorProject);
            if (nestedMentions.length > 0) {
                const nestedOutputs = await processCrossAgents(groupId, group, coordinatorProject, result.content, nestedMentions, configs, ctx, streamRes, depth + 1, seenMentions);
                outputs.push(...nestedOutputs);
            }
            return outputs;
        }
        let tWorkDir = process.cwd();
        let tAgentType = "claudecode";
        const targetConfig = configs.find(c => c.name === targetName);
        if (!targetConfig)
            return outputs;
        const tInfo = (0, db_1.getConfigInfo)(targetConfig.path);
        tWorkDir = tInfo[0]?.workDir;
        tAgentType = tInfo[0]?.agent || "claudecode";
        const memberList = group.members.map((m) => m.project).filter((p) => p !== targetName).join(", ");
        const collaborationInstructions = targetName === coordinatorProject
            ? (0, group_orchestrator_1.buildCoordinatorCollaborationInstructions)((0, group_orchestrator_1.getRoutableMembers)(group).map((m) => m.project).join(", "))
            : (0, group_orchestrator_1.buildMemberCollaborationInstructions)(targetName, memberList);
        const tPrompt = `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}

以下是群聊最近的消息记录：
${tContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${atMessage}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;
        try {
            const responseMessageId = "m" + Date.now().toString(36) + "cross" + crypto.randomBytes(2).toString("hex");
            let targetFileChanges = null;
            const tOutput = await ctx.callAgentForGroupStream(targetName, tPrompt, tWorkDir, tAgentType, {
                res: streamRes,
                groupId,
                timeoutMs: 300000,
                messageId: responseMessageId,
                onDone: (opts) => { targetFileChanges = opts.fileChanges; }
            });
            outputs.push(formatCollectedAgentOutput(targetName, tOutput));
            appendGroupMessage(groupId, {
                id: responseMessageId,
                role: "assistant", agent: targetName,
                content: tOutput,
                timestamp: new Date().toISOString(),
                fileChanges: targetFileChanges,
            });
            const nestedMentions = extractActionableMentions(tOutput, group, targetName);
            if (nestedMentions.length > 0) {
                const newMentions = nestedMentions.filter(m => m.targetName !== targetName);
                if (newMentions.length > 0) {
                    const nestedOutputs = await processCrossAgents(groupId, group, targetName, tOutput, newMentions, configs, ctx, streamRes, depth + 1, seenMentions);
                    outputs.push(...nestedOutputs);
                }
            }
        }
        catch (error) {
            console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
            outputs.push(formatCollectedAgentOutput(targetName, `❌ 转发失败: ${error.message}`));
            appendGroupMessage(groupId, {
                id: "m" + Date.now().toString(36) + "err",
                role: "assistant", agent: "system",
                content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
                timestamp: new Date().toISOString(),
            });
        }
        return outputs;
    };
    const hasExplicitDependencies = uniqueMentions.some((mention) => typeof mention !== "string" && String(mention.dependsOn || "").trim());
    if (hasExplicitDependencies) {
        const pending = [...uniqueMentions];
        const completed = new Set();
        let guard = 0;
        while (pending.length > 0 && guard < 20) {
            guard++;
            const readyIndex = pending.findIndex((mention) => {
                if (typeof mention === "string")
                    return true;
                const dependsOn = String(mention.dependsOn || "").trim();
                return !dependsOn || completed.has(dependsOn) || !uniqueMentions.some((item) => getMentionTargetName(item) === dependsOn);
            });
            const index = readyIndex >= 0 ? readyIndex : 0;
            const [mention] = pending.splice(index, 1);
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            completed.add(getMentionTargetName(mention));
        }
    }
    else if (executionOrder === "sequential" || executionOrder === "backend_first") {
        // 串行执行：后端优先或按顺序
        const backendMentions = [];
        const frontendMentions = [];
        const otherMentions = [];
        for (const mention of uniqueMentions) {
            const targetName = getMentionTargetName(mention);
            const targetMember = group.members.find((m) => m.project === targetName);
            const kind = targetMember ? (/cloud|api|server|backend|service|后端/i.test(targetName) ? "backend" : /app|web|front|frontend|前端/i.test(targetName) ? "frontend" : "other") : "other";
            if (kind === "backend")
                backendMentions.push(mention);
            else if (kind === "frontend")
                frontendMentions.push(mention);
            else
                otherMentions.push(mention);
        }
        // 先执行后端
        for (const mention of backendMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
        }
        // 再执行前端
        for (const mention of frontendMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
        }
        // 最后其他
        for (const mention of otherMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
        }
    }
    else {
        // 默认并行执行
        const settledOutputs = await Promise.all(uniqueMentions.map(mention => executeMentionJob(mention)));
        for (const outputs of settledOutputs)
            collectedOutputs.push(...outputs);
    }
    return collectedOutputs;
}
async function appendCoordinatorMessage(groupId, agent, content, streamRes = null, suffix = "review") {
    const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
    appendGroupMessage(groupId, {
        id: messageId,
        role: "assistant",
        agent,
        content,
        timestamp: new Date().toISOString(),
    });
    writeSse(streamRes, { type: "agent_done", agent, text: content, messageId });
    return messageId;
}
async function runCoordinatorReviewLoop(input) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(input.group);
    const seenMentions = new Set();
    const allOutputs = [...(input.crossOutputs || [])];
    if (allOutputs.length === 0)
        return null;
    let review = await (0, group_orchestrator_1.runLlmCoordinatorReview)(input.group, input.userMessage, input.coordinatorOutput, allOutputs, { allowFollowUps: true, round: 1 });
    if (!review) {
        const fallback = await (0, group_orchestrator_1.runLlmCoordinatorSummary)(input.group, input.userMessage, allOutputs)
            || (0, group_orchestrator_1.buildCodedCoordinatorSummary)(input.group, allOutputs);
        if (fallback)
            await appendCoordinatorMessage(input.groupId, fallback.agent, fallback.content, input.streamRes, "sum");
        return fallback;
    }
    await appendCoordinatorMessage(input.groupId, coordinator.project, review.content, input.streamRes, "review");
    const followUps = Array.isArray(review.followUps) ? review.followUps : [];
    if (followUps.length === 0)
        return review;
    writeSse(input.streamRes, { type: "status", text: "🔎 主 Agent 发现缺口，正在继续追问相关子 Agent...", agent: coordinator.project });
    const followOutputs = await processCrossAgents(input.groupId, input.group, coordinator.project, review.content, followUps, input.configs, input.ctx, input.streamRes, 1, seenMentions, input.executionOrder || "parallel");
    allOutputs.push(...followOutputs);
    const finalReview = await (0, group_orchestrator_1.runLlmCoordinatorReview)(input.group, input.userMessage, input.coordinatorOutput, allOutputs, { allowFollowUps: false, round: 2 });
    const finalSummary = finalReview
        || await (0, group_orchestrator_1.runLlmCoordinatorSummary)(input.group, input.userMessage, allOutputs)
        || (0, group_orchestrator_1.buildCodedCoordinatorSummary)(input.group, allOutputs);
    if (finalSummary) {
        await appendCoordinatorMessage(input.groupId, finalSummary.agent || coordinator.project, finalSummary.content, input.streamRes, "final");
    }
    return finalSummary;
}
// === 执行任务核心 ===
async function executeTask(task, ctx) {
    const configs = (0, db_1.getConfigs)();
    if (task.assign_type === "group" && task.group_id) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === task.group_id);
        if (!group)
            throw new Error("群聊不存在");
        const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
        const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "task",
            role: "user",
            target: coordinatorProject,
            content: message,
            timestamp: new Date().toISOString(),
            task_id: task.id,
        });
        safeAddGroupLog(task.group_id, "info", "task", `任务派发到群聊: ${task.title}`, {
            task_id: task.id,
            priority: task.priority
        });
        const context = (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(task.group_id).slice(-10));
        const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
            group,
            message,
            context,
            source: "task",
        });
        const coordinatorOutput = coordinatorResult.content;
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "coord",
            role: "assistant",
            agent: coordinatorProject,
            content: coordinatorOutput,
            timestamp: new Date().toISOString(),
            task_id: task.id,
        });
        const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
        let crossOutputs = [];
        if (validMentions.length > 0) {
            addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
            crossOutputs = await processCrossAgents(task.group_id, group, coordinatorProject, coordinatorOutput, validMentions, configs, ctx);
            await runCoordinatorReviewLoop({
                groupId: task.group_id,
                group,
                userMessage: message,
                coordinatorOutput,
                crossOutputs,
                configs,
                ctx,
                executionOrder: coordinatorResult.executionOrder || "parallel",
            });
        }
        return [coordinatorOutput, ...crossOutputs].filter(Boolean).join("\n\n---\n\n");
    }
    else {
        const config = configs.find(c => c.name === task.target_project);
        if (!config)
            throw new Error("项目配置不存在");
        const info = (0, db_1.getConfigInfo)(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";
        const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;
        return ctx.callAgent(task.target_project, message, workDir, agentType, 300000);
    }
}
// 队列处理
async function processTargetQueue(targetKey, ctx) {
    if (runningTasks.has(targetKey)) {
        console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
        return;
    }
    const queue = taskQueues.get(targetKey);
    if (!queue || queue.length === 0)
        return;
    runningTasks.set(targetKey, true);
    console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);
    while (queue.length > 0) {
        const taskId = queue.shift();
        if (!taskId)
            continue;
        const tasks = (0, db_1.loadTasks)();
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === "done") {
            addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
            continue;
        }
        addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);
        try {
            runningTaskIds.add(taskId);
            updateTask(taskId, { status: "in_progress" });
            addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
            addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
            const result = await executeTask(task, ctx);
            addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);
            if (checkTaskFailure(result)) {
                throw new Error(result.substring(0, 500));
            }
            const isCompleted = checkTaskCompletion(result);
            if (isCompleted) {
                updateTask(taskId, {
                    status: "done",
                    result: result.substring(0, 500),
                    completed_at: new Date().toISOString()
                });
                addTaskLog(taskId, "success", `✅ 任务完成`);
                await sendTaskCompletionNotification(task, result);
            }
            else {
                updateTask(taskId, {
                    status: "in_progress",
                    result: result.substring(0, 500)
                });
                addTaskLog(taskId, "warning", `任务执行中，未检测到完成标记`);
            }
        }
        catch (error) {
            console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
            updateTask(taskId, {
                status: "pending",
                result: `执行失败: ${error.message}`
            });
            addTaskLog(taskId, "error", `❌ 任务执行失败: ${error.message}`);
            await sendTaskFailureNotification(task, error.message);
        }
        finally {
            runningTaskIds.delete(taskId);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    runningTasks.delete(targetKey);
    console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}
function enqueueTask(taskId, ctx) {
    const tasks = (0, db_1.loadTasks)();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`[任务队列] 任务 ${taskId} 不存在`);
        return { queued: false, message: "任务不存在" };
    }
    if (task.status === "done") {
        addTaskLog(taskId, "info", "任务已完成，跳过入队");
        return { queued: false, message: "任务已完成，跳过入队" };
    }
    const targetKey = getTaskTargetKey(task);
    if (!taskQueues.has(targetKey)) {
        taskQueues.set(targetKey, []);
    }
    const queue = taskQueues.get(targetKey);
    if (queue.includes(taskId) || runningTaskIds.has(taskId)) {
        addTaskLog(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
        return { queued: false, message: "任务已在队列中或正在执行" };
    }
    const newPriority = PRIORITY_WEIGHT[task.priority] || 2;
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
        const queuedTask = tasks.find(t => t.id === queue[i]);
        if (!queuedTask)
            continue;
        const queuedPriority = PRIORITY_WEIGHT[queuedTask.priority] || 2;
        if (newPriority > queuedPriority) {
            insertIndex = i;
            break;
        }
    }
    queue.splice(insertIndex, 0, taskId);
    console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
    updateTask(taskId, { queued_at: new Date().toISOString() });
    addTaskLog(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);
    processTargetQueue(targetKey, ctx);
    return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1 };
}
function createAndQueueTask(task, ctx) {
    const newTask = createTask({ ...task, auto_execute: true });
    const queueResult = enqueueTask(newTask.id, ctx);
    return { task: newTask, queueResult };
}
function getQueueStatus() {
    let totalQueued = 0;
    const targetStatus = {};
    for (const [targetKey, queue] of taskQueues.entries()) {
        totalQueued += queue.length;
        targetStatus[targetKey] = {
            queued: queue.length,
            running: runningTasks.has(targetKey)
        };
    }
    return {
        total_queued: totalQueued,
        running_targets: runningTasks.size,
        target_status: targetStatus,
        pending_tasks: (0, db_1.loadTasks)().filter(t => t.status === "pending").length,
        in_progress_tasks: (0, db_1.loadTasks)().filter(t => t.status === "in_progress").length,
        running_task_ids: Array.from(runningTaskIds)
    };
}
function createTask(task) {
    const tasks = (0, db_1.loadTasks)();
    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: task.title,
        description: task.description || "",
        target_project: task.target_project,
        group_id: task.group_id || null,
        assign_type: task.assign_type || "project",
        status: "pending",
        priority: task.priority || "normal",
        auto_execute: !!(task.auto_execute || task.autoExecute),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    tasks.push(newTask);
    (0, db_1.saveTasks)(tasks);
    return newTask;
}
function updateTask(id, updates) {
    const tasks = (0, db_1.loadTasks)();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
    if (updates.status === "done")
        tasks[idx].completed_at = new Date().toISOString();
    (0, db_1.saveTasks)(tasks);
    return tasks[idx];
}
function deleteTask(id) {
    const tasks = (0, db_1.loadTasks)().filter(t => t.id !== id);
    (0, db_1.saveTasks)(tasks);
}
function handleCollaborationApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/tasks" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { tasks: (0, db_1.loadTasks)() });
        return true;
    }
    if (pathname === "/api/tasks/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const task = createTask(payload);
                let queueResult = null;
                if (payload.auto_execute || payload.autoExecute) {
                    queueResult = enqueueTask(task.id, ctx);
                }
                (0, utils_1.sendJson)(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const task = updateTask(id, updates);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, task });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                deleteTask(id);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const queueResult = enqueueTask(task_id, ctx);
                (0, utils_1.sendJson)(res, { success: true, message: queueResult.message, queued: queueResult.queued, queue_result: queueResult, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_ids } = JSON.parse(body);
                if (!task_ids || !Array.isArray(task_ids))
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID 列表" }, 400);
                const results = task_ids.map(id => ({ task_id: id, ...enqueueTask(id, ctx) }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, { success: true, message: `${queuedCount}/${task_ids.length} 个任务已加入队列`, results, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, getQueueStatus());
        return true;
    }
    if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
        taskQueues.clear();
        (0, utils_1.sendJson)(res, { success: true, message: "队列已清空" });
        return true;
    }
    if (pathname === "/api/tasks/logs" && req.method === "GET") {
        const taskId = parsed.query.task_id;
        const limit = parseInt(parsed.query.limit) || 50;
        if (!taskId)
            return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
        const logs = getTaskLogs(taskId, limit);
        (0, utils_1.sendJson)(res, { success: true, logs });
        return true;
    }
    if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                clearTaskLogs(task_id);
                (0, utils_1.sendJson)(res, { success: true, message: "日志已清空" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 群聊主 Agent / Orchestrator API ===
    if (pathname === "/api/orchestrator/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)((0, group_orchestrator_1.loadOrchestratorConfig)()) });
        return true;
    }
    if (pathname === "/api/orchestrator/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, group_orchestrator_1.saveOrchestratorConfig)(updates);
                (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)(config) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groups = loadGroups();
                const group = payload.group_id
                    ? groups.find(g => g.id === payload.group_id)
                    : groups[0];
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "请先创建一个群聊并添加项目 Agent" }, 400);
                const message = String(payload.message || "帮我排查登录页面调用接口失败的问题，前后端都看一下").trim();
                const result = await (0, group_orchestrator_1.runGroupOrchestrator)({ group, message, source: "test" });
                (0, utils_1.sendJson)(res, { success: true, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    // === 群聊 API ===
    if (pathname === "/api/groups" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { groups: loadGroups() });
        return true;
    }
    if (pathname === "/api/groups/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, members } = JSON.parse(body);
                const groups = loadGroups();
                const id = "g" + Date.now().toString(36);
                const allMembers = Array.isArray(members) ? members : [];
                const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
                    id, name, members: allMembers,
                    created_at: new Date().toISOString(),
                });
                groups.push(group);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/members" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, add, remove } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (add) {
                    for (const m of add) {
                        if (!group.members.find((x) => x.project === m.project)) {
                            group.members.push(m);
                        }
                    }
                }
                if (remove) {
                    const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                    group.members = group.members.filter((m) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
                }
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                const groups = loadGroups().filter(g => g.id !== id);
                saveGroups(groups);
                try {
                    fs.unlinkSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${id}.json`));
                }
                catch { }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, name } = JSON.parse(body);
                if (!name || !name.trim())
                    return (0, utils_1.sendJson)(res, { error: "群聊名称不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.name = name.trim();
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        (0, utils_1.sendJson)(res, { tools: group.tools || { mcp: [], skill: [] } });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, tools } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.tools = tools;
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, tools: group.tools });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        const before = JSON.stringify(group.shared_files || []);
        group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
        if (JSON.stringify(group.shared_files) !== before)
            saveGroups(groups);
        (0, utils_1.sendJson)(res, { files: group.shared_files || [] });
        return true;
    }
    if (pathname === "/api/groups/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name, content } = JSON.parse(body);
                if (!name || !content)
                    return (0, utils_1.sendJson)(res, { error: "文件名和内容不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                const existing = group.shared_files.findIndex((f) => f.name === name);
                if (existing >= 0) {
                    group.shared_files[existing].content = content;
                    group.shared_files[existing].type = "text";
                    group.shared_files[existing].readable = true;
                    group.shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    group.shared_files.push({
                        name,
                        type: "text",
                        readable: true,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                group.shared_files = group.shared_files.filter((f) => f.name !== name);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/import" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, file_names } = JSON.parse(body);
                if (!file_names || !Array.isArray(file_names))
                    return (0, utils_1.sendJson)(res, { error: "请提供文件名列表" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                let imported = 0;
                for (const name of file_names) {
                    const filePath = ctx.getSharedFilePath(name);
                    if (filePath && fs.existsSync(filePath)) {
                        const record = ctx.createSharedFileRecord(name, "global");
                        if (!record)
                            continue;
                        const existing = group.shared_files.findIndex((f) => f.name === name);
                        if (existing >= 0) {
                            group.shared_files[existing] = {
                                ...group.shared_files[existing],
                                ...record,
                                created_at: group.shared_files[existing].created_at || record.created_at,
                                updated_at: new Date().toISOString()
                            };
                        }
                        else {
                            group.shared_files.push(record);
                        }
                        imported++;
                    }
                }
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, imported, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/messages" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const limit = parseInt(parsed.query.limit) || 100;
        const messages = getGroupMessages(groupId).slice(-limit);
        (0, utils_1.sendJson)(res, { messages });
        return true;
    }
    if (pathname === "/api/groups/logs" && req.method === "GET") {
        const groupId = parsed.query.id;
        const limit = parseInt(parsed.query.limit) || 100;
        const category = parsed.query.category;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const logs = loadGroupLogs();
        let groupLogs = logs[groupId] || [];
        if (category) {
            groupLogs = groupLogs.filter((l) => l.category === category);
        }
        (0, utils_1.sendJson)(res, { logs: groupLogs.slice(-limit) });
        return true;
    }
    if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id } = JSON.parse(body);
                const logs = loadGroupLogs();
                delete logs[group_id];
                saveGroupLogs(logs);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);
        const logs = loadGroupLogs();
        const initialCount = (logs[groupId] || []).length;
        let lastCount = initialCount;
        const interval = setInterval(() => {
            try {
                const currentLogs = loadGroupLogs();
                const groupLogs = currentLogs[groupId] || [];
                if (groupLogs.length > lastCount) {
                    const newLogs = groupLogs.slice(lastCount);
                    for (const log of newLogs) {
                        res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
                    }
                    lastCount = groupLogs.length;
                }
            }
            catch (e) {
                res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
            }
        }, 1000);
        req.on("close", () => {
            clearInterval(interval);
        });
        return true;
    }
    if (pathname === "/api/groups/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleGroupSend = async (payload, uploadedFiles = []) => {
            try {
                const { group_id, target_project, message, client_message_id } = payload;
                const userMessage = String(message || "").trim();
                const uploadedFilesContext = ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
                const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
                const messageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
                const userMessageForHistory = attachmentSummary
                    ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
                    : userMessage;
                if (!messageForAgent)
                    return (0, utils_1.sendJson)(res, { error: "消息或附件不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                const routing = (0, group_orchestrator_1.selectGroupTargets)(group, target_project);
                const isBroadcast = routing.isBroadcast;
                const isOrchestrated = routing.orchestrated;
                const targetMembers = routing.members;
                if (targetMembers.length === 0) {
                    return (0, utils_1.sendJson)(res, { error: "没有找到目标项目" }, 400);
                }
                const userMsg = {
                    id: client_message_id ? String(client_message_id) : "m" + Date.now().toString(36),
                    role: "user",
                    target: routing.targetLabel,
                    content: userMessageForHistory,
                    timestamp: new Date().toISOString(),
                };
                appendGroupMessage(group_id, userMsg);
                for (const member of targetMembers) {
                    ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
                }
                addGroupLog(group_id, "info", "message", `用户发送消息给 ${isOrchestrated ? '主 Agent' : isBroadcast ? '所有人' : target_project}`, {
                    message: userMessageForHistory.substring(0, 200),
                    target: routing.targetLabel,
                    is_broadcast: isBroadcast,
                    orchestrated: isOrchestrated
                });
                const configs = (0, db_1.getConfigs)();
                if (isBroadcast && isOrchestrated) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                    writeSse(res, {
                        type: "status",
                        text: `🧠 主 Agent ${coordinator.project} 正在协调群聊...`,
                        agent: coordinator.project
                    });
                    ctx.setAgentActivity(coordinator.project, "working", "主 Agent 正在协调群聊", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: "主 Agent 正在协调群聊...", source: "group" });
                    const recentMsgs = getGroupMessages(group_id).slice(-20);
                    const context = (0, group_orchestrator_1.buildRecentGroupContext)(recentMsgs);
                    // 优化3：构建共享文件上下文注入 LLM
                    const sharedFilesList = (group.shared_files || []).map((f) => `- ${f.name} (${f.type || 'file'})`).join("\n");
                    const sharedFilesContext = sharedFilesList ? sharedFilesList : undefined;
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: messageForAgent,
                        context,
                        source: "user",
                        sharedFilesContext,
                    });
                    try {
                        const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                        const outputText = coordinatorResult.content;
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinator.project,
                            text: outputText,
                            messageId: responseMessageId,
                            assignments: coordinatorResult.assignments || [],
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                        });
                        appendGroupMessage(group_id, {
                            id: responseMessageId,
                            role: "assistant",
                            agent: coordinator.project,
                            content: outputText,
                            timestamp: new Date().toISOString(),
                            assignments: coordinatorResult.assignments || [],
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                        });
                        addGroupLog(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300),
                            runtime: "coded-orchestrator",
                        });
                        let crossOutputs = [];
                        const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分派子 Agent..." });
                            const execOrder = coordinatorResult.executionOrder || "parallel";
                            crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set(), execOrder);
                            await runCoordinatorReviewLoop({
                                groupId: group_id,
                                group,
                                userMessage: messageForAgent,
                                coordinatorOutput: outputText,
                                crossOutputs,
                                configs,
                                ctx,
                                streamRes: res,
                                executionOrder: execOrder,
                            });
                        }
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                if (isBroadcast) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 并行处理中，${targetMembers.length} 个 Agent 同时工作...` })}\n\n`);
                    for (const member of targetMembers) {
                        ctx.setAgentActivity(member.project, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                        ctx.broadcastPetSpeech(member.project, { role: "status", text: "群聊协作中，正在思考...", source: "group" });
                    }
                    const getAgentPrompt = (member) => {
                        const recentMsgs = getGroupMessages(group_id).slice(-10);
                        const context = recentMsgs.map((m) => {
                            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                            return `${who} ${m.content}`;
                        }).join("\n");
                        const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                        const collaborationInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                        const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                        let toolsContext = "";
                        if (group.tools) {
                            const mcpTools = group.tools.mcp || [];
                            const skillTools = group.tools.skill || [];
                            if (mcpTools.length > 0 || skillTools.length > 0) {
                                toolsContext = "\n\n你当前可以使用的工具：";
                                if (mcpTools.length > 0) {
                                    toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                                }
                                if (skillTools.length > 0) {
                                    toolsContext += "\n- Skills：" + skillTools.join(", ");
                                }
                            }
                        }
                        toolsContext += ctx.toolManager.buildToolPrompt();
                        return `${collaborationInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`;
                    };
                    const agentPromises = targetMembers.map(member => {
                        return new Promise(async (resolve) => {
                            const config = configs.find(c => c.name === member.project);
                            if (!config) {
                                resolve();
                                return;
                            }
                            const info = (0, db_1.getConfigInfo)(config.path);
                            const workDir = info[0]?.workDir;
                            const agentType = info[0]?.agent || "claudecode";
                            const fullPrompt = getAgentPrompt(member);
                            try {
                                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                                let memberFileChanges = null;
                                const text = await ctx.callAgentForGroupStream(member.project, fullPrompt, workDir, agentType, {
                                    res,
                                    groupId: group_id,
                                    timeoutMs: 300000,
                                    messageId: responseMessageId,
                                    onDone: (opts) => { memberFileChanges = opts.fileChanges; }
                                });
                                appendGroupMessage(group_id, {
                                    id: responseMessageId,
                                    role: "assistant", agent: member.project,
                                    content: text,
                                    timestamp: new Date().toISOString(),
                                    fileChanges: memberFileChanges,
                                });
                                const validMentions = extractActionableMentions(text, group, member.project);
                                if (validMentions.length > 0) {
                                    writeSse(res, { type: "status", text: `🧩 ${member.project} 正在分配协作任务...` });
                                    await processCrossAgents(group_id, group, member.project, text, validMentions, configs, ctx, res);
                                }
                            }
                            catch (e) {
                                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
                            }
                            finally {
                                resolve();
                            }
                        });
                    });
                    Promise.all(agentPromises).then(() => {
                        writeSse(res, { type: "done" });
                        try {
                            res.end();
                        }
                        catch { }
                    });
                    return;
                }
                // 单个 Agent 模式
                const target_project_actual = targetMembers[0].project;
                const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
                if (target_project_actual === coordinatorProject) {
                    const sharedFilesList2 = (group.shared_files || []).map((f) => `- ${f.name} (${f.type || 'file'})`).join("\n");
                    const sharedFilesCtx2 = sharedFilesList2 ? sharedFilesList2 : undefined;
                    const context = (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(group_id).slice(-20));
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: messageForAgent,
                        context,
                        source: "direct",
                        sharedFilesContext: sharedFilesCtx2,
                    });
                    const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                    if (useStream) {
                        res.writeHead(200, {
                            "Content-Type": "text/event-stream",
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "Access-Control-Allow-Origin": "*",
                        });
                        writeSse(res, { type: "status", text: "🧠 代码协调器正在分配任务...", agent: coordinatorProject });
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinatorProject,
                            text: coordinatorResult.content,
                            messageId: responseMessageId,
                            assignments: coordinatorResult.assignments || [],
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                        });
                    }
                    appendGroupMessage(group_id, {
                        id: responseMessageId,
                        role: "assistant",
                        agent: coordinatorProject,
                        content: coordinatorResult.content,
                        timestamp: new Date().toISOString(),
                        assignments: coordinatorResult.assignments || [],
                        executionOrder: coordinatorResult.executionOrder || "parallel",
                        runtime: coordinatorResult.runtime || "",
                    });
                    const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                    let crossOutputs = [];
                    let reviewResult = null;
                    if (validMentions.length > 0) {
                        if (useStream)
                            writeSse(res, { type: "status", text: "🧩 代码协调器正在分派子 Agent..." });
                        const execOrder2 = coordinatorResult.executionOrder || "parallel";
                        crossOutputs = await processCrossAgents(group_id, group, coordinatorProject, coordinatorResult.content, validMentions, configs, ctx, useStream ? res : null, 0, new Set(), execOrder2);
                        reviewResult = await runCoordinatorReviewLoop({
                            groupId: group_id,
                            group,
                            userMessage: messageForAgent,
                            coordinatorOutput: coordinatorResult.content,
                            crossOutputs,
                            configs,
                            ctx,
                            streamRes: useStream ? res : null,
                            executionOrder: execOrder2,
                        });
                    }
                    if (useStream) {
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    else {
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: reviewResult?.content ? `${coordinatorResult.content}\n\n---\n\n${reviewResult.content}` : coordinatorResult.content,
                            cross_pending: validMentions.length > 0
                        });
                    }
                    return;
                }
                const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(target_project_actual, group, configs);
                if (!runtime)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const workDir = runtime.workDir;
                const agentType = runtime.agentType;
                const recentMsgs = getGroupMessages(group_id).slice(-10);
                const context = recentMsgs.map((m) => {
                    const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                    return `${who} ${m.content}`;
                }).join("\n");
                const memberList = group.members.map((m) => m.project).filter((p) => p !== target_project_actual).join(", ");
                let atInstructions = "";
                if (target_project_actual === coordinatorProject) {
                    atInstructions = (0, group_orchestrator_1.buildCoordinatorCollaborationInstructions)(memberList);
                }
                else {
                    atInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(target_project_actual, memberList);
                }
                let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                let toolsContext = "";
                if (group.tools) {
                    const mcpTools = group.tools.mcp || [];
                    const skillTools = group.tools.skill || [];
                    if (mcpTools.length > 0 || skillTools.length > 0) {
                        toolsContext = "\n\n你当前可以使用的工具：";
                        if (mcpTools.length > 0) {
                            toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                        }
                        if (skillTools.length > 0) {
                            toolsContext += "\n- Skills：" + skillTools.join(", ");
                        }
                    }
                }
                const PROJECT_CONFIGS_FILE = path.join(utils_1.CCM_DIR, "project-configs.json");
                let projectConfigs = {};
                try {
                    if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
                        projectConfigs = JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
                    }
                }
                catch (e) { }
                const projectConfig = projectConfigs[target_project_actual] || {};
                if (projectConfig.tools) {
                    const projectMcp = projectConfig.tools.mcp || [];
                    const projectSkill = projectConfig.tools.skill || [];
                    if (projectMcp.length > 0 || projectSkill.length > 0) {
                        if (!toolsContext)
                            toolsContext = "\n\n你当前可以使用的工具：";
                        if (projectMcp.length > 0) {
                            toolsContext += "\n- MCP 服务器：" + projectMcp.join(", ");
                        }
                        if (projectSkill.length > 0) {
                            toolsContext += "\n- Skills：" + projectSkill.join(", ");
                        }
                    }
                }
                toolsContext += ctx.toolManager.buildToolPrompt();
                if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
                    sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
                }
                const fullPrompt = `${atInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;
                if (useStream) {
                    const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
                    const startedAt = Date.now();
                    const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
                    ctx.setAgentActivity(target_project_actual, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(target_project_actual, { role: "status", text: "Agent 正在思考...", source: "group" });
                    try {
                        let targetFileChanges = null;
                        const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
                            res,
                            groupId: group_id,
                            timeoutMs: 300000,
                            messageId: responseMessageId,
                            onDone: (opts) => { targetFileChanges = opts.fileChanges; }
                        });
                        appendGroupMessage(group_id, {
                            id: responseMessageId,
                            role: "assistant", agent: target_project_actual,
                            content: outputText.trim(),
                            timestamp: new Date().toISOString(),
                            fileChanges: targetFileChanges,
                        });
                        addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
                            agent: target_project_actual,
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300)
                        });
                        const validMentions = extractActionableMentions(outputText, group, target_project_actual);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分配任务..." });
                            try {
                                await processCrossAgents(group_id, group, target_project_actual, outputText, validMentions, configs, ctx, res);
                            }
                            catch (err) {
                                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
                            }
                        }
                        writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        ctx.recordMetric(target_project_actual, {
                            success: false,
                            durationMs: Date.now() - startedAt,
                            fileChangeCount: 0
                        });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                // 非流式
                const output = ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id });
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "a",
                    role: "assistant", agent: target_project_actual,
                    content: output,
                    timestamp: new Date().toISOString(),
                });
                const validMentions = extractActionableMentions(output, group, target_project_actual);
                if (validMentions.length > 0) {
                    (0, utils_1.sendJson)(res, { success: true, reply: output, cross_pending: true });
                    setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
                    return;
                }
                (0, utils_1.sendJson)(res, { success: true, reply: output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            ctx.collectRequestBuffer(req).then((buffer) => {
                try {
                    const boundary = ctx.getMultipartBoundary(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = ctx.parseMultipart(buffer, boundary);
                    handleGroupSend(fields, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                await handleGroupSend(JSON.parse(body));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/broadcast" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, message } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36),
                    role: "user", target: "all", content: message,
                    timestamp: new Date().toISOString(),
                });
                const replies = [];
                const configs = (0, db_1.getConfigs)();
                for (const member of group.members) {
                    const config = configs.find(c => c.name === member.project);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    const recentMsgs = getGroupMessages(group_id).slice(-10);
                    const context = recentMsgs.map((m) => {
                        const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                        return `${who} ${m.content}`;
                    }).join("\n");
                    const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                    let toolsContext = "";
                    if (group.tools) {
                        const mcpTools = group.tools.mcp || [];
                        const skillTools = group.tools.skill || [];
                        if (mcpTools.length > 0 || skillTools.length > 0) {
                            toolsContext = "\n\n你当前可以使用的工具：";
                            if (mcpTools.length > 0) {
                                toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                            }
                            if (skillTools.length > 0) {
                                toolsContext += "\n- Skills：" + skillTools.join(", ");
                            }
                        }
                    }
                    toolsContext += ctx.toolManager.buildToolPrompt();
                    const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                    const memberInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                    const fullPrompt = `${memberInstructions}${toolsContext}${sharedFilesContext}\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;
                    const output = ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id });
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + member.project,
                        role: "assistant", agent: member.project, content: output,
                        timestamp: new Date().toISOString(),
                    });
                    replies.push({ project: member.project, reply: output });
                }
                (0, utils_1.sendJson)(res, { success: true, replies });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/decompose" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, requirement } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                const configs = (0, db_1.getConfigs)();
                const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                const members = (0, group_orchestrator_1.getRoutableMembers)(group);
                const memberList = members.map((m) => `${m.project}(${m.agent})`).join(", ");
                const tasks = (0, group_orchestrator_1.decomposeRequirementWithCodedCoordinator)(group, requirement);
                const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);
                const createdTasks = tasks.map(t => createTask({
                    title: t.title,
                    description: t.description || "",
                    target_project: t.target_project || coordinator.project,
                    priority: t.priority || "normal"
                }));
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "decompose",
                    role: "assistant",
                    agent: coordinator.project,
                    content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i + 1}. [${t.target_project}] ${t.title}`).join("\n")}`,
                    timestamp: new Date().toISOString(),
                });
                (0, utils_1.sendJson)(res, { success: true, tasks: createdTasks, raw_output: output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { task_id, group_id } = JSON.parse(body);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === task.target_project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                updateTask(task_id, { status: "in_progress" });
                const executePrompt = `你正在执行一个开发任务，请完成它。

任务标题：${task.title}
任务描述：${task.description || "无"}

请直接开始实现，完成后回复 "✅ 任务完成" 并简要说明实现内容。`;
                const taskResult = ctx.callAgent(task.target_project, executePrompt, workDir, agentType, 300000);
                const isCompleted = taskResult.includes("✅") || taskResult.includes("完成") || taskResult.includes("done");
                updateTask(task_id, {
                    status: isCompleted ? "done" : "in_progress",
                    result: taskResult.substring(0, 500)
                });
                if (group_id) {
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "task",
                        role: "assistant",
                        agent: task.target_project,
                        content: `📋 任务执行${isCompleted ? "完成" : "中"}：${task.title}\n${taskResult.substring(0, 300)}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, task, completed: isCompleted, result: taskResult });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const tasks = (0, db_1.loadTasks)().filter(t => t.status === "pending");
                if (tasks.length === 0) {
                    return (0, utils_1.sendJson)(res, { success: true, message: "没有待执行的任务" });
                }
                const results = tasks.map(task => ({
                    task_id: task.id,
                    title: task.title,
                    ...enqueueTask(task.id, ctx)
                }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
                    results,
                    queue_status: getQueueStatus()
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, project, diff, reviewers } = JSON.parse(body);
                if (!diff)
                    return (0, utils_1.sendJson)(res, { error: "请提供代码变更内容" }, 400);
                const configs = (0, db_1.getConfigs)();
                const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;
                const reviewResults = [];
                for (const reviewer of (reviewers || [])) {
                    const config = configs.find(c => c.name === reviewer);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    try {
                        const result = ctx.callAgent(reviewer, reviewPrompt, workDir, agentType, 120000);
                        reviewResults.push({ reviewer, result });
                    }
                    catch (e) {
                        reviewResults.push({ reviewer, error: e.message });
                    }
                }
                if (group_id) {
                    const groups = loadGroups();
                    const group = groups.find(g => g.id === group_id);
                    const coordinator = group ? (0, group_orchestrator_1.getCoordinatorMember)(group) : { project: "coordinator" };
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "review",
                        role: "assistant",
                        agent: coordinator.project,
                        content: `🔍 代码审查完成：${project}\n${reviewResults.map(r => `【${r.reviewer}】${r.result?.substring(0, 200) || r.error}`).join("\n\n")}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, reviews: reviewResults });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/collaboration/stats" && req.method === "GET") {
        const tasks = (0, db_1.loadTasks)();
        const groups = loadGroups();
        const stats = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter((t) => t.status === "pending").length,
            in_progress_tasks: tasks.filter((t) => t.status === "in_progress").length,
            done_tasks: tasks.filter((t) => t.status === "done").length,
            completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t) => t.status === "done").length / tasks.length * 100) : 0,
            groups_count: groups.length,
            recent_activities: []
        };
        for (const group of groups.slice(0, 3)) {
            const messages = getGroupMessages(group.id).slice(-5);
            for (const msg of messages) {
                stats.recent_activities.push({
                    group: group.name,
                    agent: msg.agent || "user",
                    content: msg.content?.substring(0, 100),
                    timestamp: msg.timestamp
                });
            }
        }
        stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        stats.recent_activities = stats.recent_activities.slice(0, 10);
        (0, utils_1.sendJson)(res, stats);
        return true;
    }
    if (pathname === "/api/test/mentions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { text, group_id } = JSON.parse(body);
                let validMentions = [];
                if (group_id) {
                    const groups = loadGroups();
                    const group = groups.find(g => g.id === group_id);
                    if (group) {
                        validMentions = extractActionableMentions(text, group, "");
                    }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    input: text,
                    valid_mentions: validMentions.map(m => m.mention),
                    extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 飞书配置与授权相关路由 ===
    if (pathname === "/api/feishu/config" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        (0, utils_1.sendJson)(res, {
            config: {
                app_id: config.app_id || "",
                app_secret: config.app_secret || "",
                enabled: config.enabled !== false,
                authorized: config.authorized || false,
                authorized_user: config.authorized_user || null,
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, db_1.loadFeishuConfig)();
                if (updates.app_id !== undefined)
                    config.app_id = updates.app_id;
                if (updates.app_secret !== undefined && updates.app_secret !== "")
                    config.app_secret = updates.app_secret;
                if (updates.webhook_url !== undefined)
                    config.webhook_url = updates.webhook_url;
                if (updates.sign_key !== undefined && updates.sign_key !== "******")
                    config.sign_key = updates.sign_key;
                if (updates.enabled !== undefined)
                    config.enabled = updates.enabled;
                if (updates.redirect_uri !== undefined)
                    config.redirect_uri = updates.redirect_uri;
                console.log("[飞书配置] 保存配置:", { app_id: config.app_id, app_secret: config.app_secret ? "***" : "空" });
                (0, db_1.saveFeishuConfig)(config);
                (0, utils_1.sendJson)(res, { success: true, message: "飞书配置已保存" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id) {
            (0, utils_1.sendJson)(res, { error: "请先配置 App ID" }, 400);
            return true;
        }
        const scopes = (config.scopes || exports.FEISHU_SCOPES).join(" ");
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
        (0, utils_1.sendJson)(res, { success: true, auth_url: authUrl });
        return true;
    }
    if (pathname === "/api/feishu/callback" && req.method === "GET") {
        const code = parsed.query.code;
        if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：缺少 code 参数</h1>");
            return true;
        }
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id || !config.app_secret) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
            return true;
        }
        getFeishuUserToken(config.app_id, config.app_secret, code).then(tokenData => {
            if (!tokenData) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：获取 Token 失败</h1>");
                return;
            }
            config.user_access_token = tokenData.access_token;
            config.user_refresh_token = tokenData.refresh_token;
            config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
            config.authorized = true;
            return getFeishuUserInfo(tokenData.access_token).then(userInfo => {
                if (userInfo) {
                    config.authorized_user = {
                        name: userInfo.name,
                        open_id: userInfo.open_id,
                        avatar: userInfo.avatar_url
                    };
                }
                (0, db_1.saveFeishuConfig)(config);
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>飞书授权成功</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1 style="color:#22c55e">✅ 飞书授权成功！</h1>
            <p>用户：${userInfo?.name || '未知'}</p>
            <p>授权已生效，可以关闭此页面。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
            });
        }).catch(err => {
            console.error("[飞书授权] 回调处理失败:", err.message);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：服务器错误</h1>");
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/revoke" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        config.authorized = false;
        config.user_access_token = "";
        config.user_refresh_token = "";
        config.token_expires_at = null;
        config.authorized_user = null;
        (0, db_1.saveFeishuConfig)(config);
        (0, utils_1.sendJson)(res, { success: true, message: "授权已撤销" });
        return true;
    }
    if (pathname === "/api/feishu/chats" && req.method === "GET") {
        getValidFeishuToken().then(async (token) => {
            if (!token) {
                (0, utils_1.sendJson)(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
                return;
            }
            const chats = await getFeishuChatList(token);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { success: true, chats: chats || [] });
            }
        }).catch(err => {
            console.error("[飞书] 获取群聊列表失败:", err.message);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { error: "获取群聊列表失败" }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/test" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id) {
            (0, utils_1.sendJson)(res, { error: "请先配置飞书 App ID" }, 400);
            return true;
        }
        const userId = config.authorized_user?.open_id;
        if (!userId) {
            (0, utils_1.sendJson)(res, { error: "请先扫码授权获取用户 ID" }, 400);
            return true;
        }
        const testCard = {
            config: { wide_screen_mode: true },
            header: {
                title: { tag: "plain_text", content: "🔔 测试通知" },
                template: "blue"
            },
            elements: [
                {
                    tag: "div",
                    text: {
                        tag: "lark_md",
                        content: `**ccm 控制台通知测试**\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n配置验证成功！✅`
                    }
                }
            ]
        };
        sendFeishuMessageToUser(userId, JSON.stringify(testCard), "interactive").then(success => {
            if (success) {
                (0, utils_1.sendJson)(res, { success: true, message: "测试消息已发送！请检查飞书" });
            }
            else {
                (0, utils_1.sendJson)(res, { error: "发送失败，请检查配置" }, 500);
            }
        }).catch(err => {
            console.error("[飞书] 测试通知失败:", err.message);
            (0, utils_1.sendJson)(res, { error: "发送失败: " + err.message }, 500);
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=collaboration.js.map