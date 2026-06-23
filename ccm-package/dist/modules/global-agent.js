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
exports.handleGlobalAgentApi = handleGlobalAgentApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const rag_1 = require("./rag");
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const group_orchestrator_1 = require("./group-orchestrator");
const db_1 = require("../db");
const collaboration_1 = require("./collaboration");
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(utils_1.CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
function normalizeGlobalAgentMessages(messages = []) {
    return messages
        .filter((item) => item && ["user", "assistant"].includes(String(item.role || "")) && String(item.content || "").trim())
        .map((item) => ({
        role: String(item.role),
        content: String(item.content || "").slice(0, 8000),
        timestamp: item.timestamp || new Date().toISOString(),
    }))
        .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}
function loadGlobalAgentHistoryStore() {
    try {
        if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
            const data = JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8"));
            return { sessions: [], ...data };
        }
    }
    catch { }
    return { current_session_id: "", sessions: [] };
}
function saveGlobalAgentHistoryStore(store) {
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    store.sessions = sessions
        .map((session) => ({
        ...session,
        messages: normalizeGlobalAgentMessages(session.messages || []),
        updatedAt: session.updatedAt || new Date().toISOString(),
    }))
        .filter((session) => session.id && session.messages.length > 0)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, GLOBAL_AGENT_SESSION_LIMIT);
    fs.writeFileSync(GLOBAL_AGENT_HISTORY_FILE, JSON.stringify(store, null, 2), "utf-8");
}
function syncGlobalAgentWebHistory(payload) {
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    const store = loadGlobalAgentHistoryStore();
    const byId = new Map();
    for (const session of store.sessions || [])
        byId.set(String(session.id), session);
    for (const session of sessions) {
        const id = String(session.id || "").trim();
        if (!id)
            continue;
        byId.set(id, {
            id,
            name: session.name || "全局 Agent 会话",
            source: "web",
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: normalizeGlobalAgentMessages(session.messages || []),
        });
    }
    store.sessions = Array.from(byId.values());
    if (payload.currentSessionId)
        store.current_session_id = String(payload.currentSessionId);
    saveGlobalAgentHistoryStore(store);
    return store;
}
function getBaseGlobalAgentMessages(store) {
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    const current = sessions.find((item) => item.id === store.current_session_id && item.source !== "feishu")
        || sessions.find((item) => item.source === "web")
        || sessions[0];
    return normalizeGlobalAgentMessages(current?.messages || []);
}
function getGlobalAgentConversationMessages(sessionId) {
    const store = loadGlobalAgentHistoryStore();
    const existing = (store.sessions || []).find((item) => item.id === sessionId);
    if (existing)
        return normalizeGlobalAgentMessages(existing.messages || []);
    return getBaseGlobalAgentMessages(store);
}
function appendGlobalAgentConversationMessage(sessionId, role, content, source = "feishu") {
    const store = loadGlobalAgentHistoryStore();
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    let session = sessions.find((item) => item.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            name: source === "feishu" ? "飞书全局 Agent" : "全局 Agent 会话",
            source,
            createdAt: new Date().toISOString(),
            messages: getBaseGlobalAgentMessages(store),
        };
        sessions.unshift(session);
    }
    session.messages = normalizeGlobalAgentMessages([...(session.messages || []), { role, content, timestamp: new Date().toISOString() }]);
    session.updatedAt = new Date().toISOString();
    store.sessions = sessions;
    saveGlobalAgentHistoryStore(store);
}
function buildFeishuConversationId(payload) {
    const raw = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || payload?.message?.session_id || payload?.data?.session_id || "default";
    return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
}
function loadGlobalAgentBridgeStore() {
    try {
        if (fs.existsSync(GLOBAL_AGENT_BRIDGE_FILE))
            return JSON.parse(fs.readFileSync(GLOBAL_AGENT_BRIDGE_FILE, "utf-8"));
    }
    catch { }
    return { requests: [] };
}
function saveGlobalAgentBridgeStore(store) {
    const cutoff = Date.now() - 30 * 60 * 1000;
    store.requests = (Array.isArray(store.requests) ? store.requests : [])
        .filter((item) => item.status === "pending" || Date.parse(item.updated_at || item.created_at || 0) > cutoff)
        .slice(-100);
    fs.writeFileSync(GLOBAL_AGENT_BRIDGE_FILE, JSON.stringify(store, null, 2), "utf-8");
}
function createGlobalAgentBridgeRequest(text, sessionId) {
    const store = loadGlobalAgentBridgeStore();
    const request = {
        id: "gab_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex"),
        status: "pending",
        text,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    store.requests = [...(store.requests || []), request];
    saveGlobalAgentBridgeStore(store);
    return request;
}
async function waitForGlobalAgentBridgeResult(id, timeoutMs = 10 * 60 * 1000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const store = loadGlobalAgentBridgeStore();
        const request = (store.requests || []).find((item) => item.id === id);
        if (request && request.status !== "pending")
            return request;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { id, status: "timeout", reply: "Web 全局 Agent 控制台暂未响应，请确认 CCM 页面处于打开状态后重试。" };
}
const processedFeishuMessageIds = new Set();
const GLOBAL_MANAGEMENT_ACTIONS = {
    manage_cron: { label: "定时任务管理", operations: ["list", "create", "update", "enable", "disable", "run", "delete"], destructive: ["delete"] },
    manage_group: { label: "群聊与成员管理", operations: ["list", "create", "rename", "add_member", "remove_member", "delete"], destructive: ["delete"] },
    manage_project: { label: "项目与 Agent 管理", operations: ["list", "create", "update", "start", "stop", "delete"], destructive: ["delete"] },
    manage_task: { label: "开发任务管理", operations: ["list", "pause", "resume", "continue", "retry", "queue", "delete"], destructive: ["delete"] },
    manage_tool: { label: "MCP 与 Skill 管理", operations: ["list", "create", "delete", "reload", "status"], destructive: ["delete"] },
    system_status: { label: "系统状态检查", operations: ["inspect"], destructive: [] },
};
const GLOBAL_MANAGEMENT_REQUIRED_PARAMS = {
    manage_cron: {
        create: ["name", "schedule", "prompt"],
        update: ["id"],
        enable: ["id"],
        disable: ["id"],
        run: ["id"],
        delete: ["id"],
    },
    manage_group: {
        create: ["name"],
        rename: ["id", "name"],
        add_member: ["id", "project"],
        remove_member: ["id", "project"],
        delete: ["id"],
    },
    manage_project: {
        create: ["name", "work_dir"],
        update: ["project"],
        start: ["project"],
        stop: ["project"],
        delete: ["project"],
    },
    manage_task: {
        pause: ["id"],
        resume: ["id"],
        continue: ["id"],
        retry: ["id"],
        queue: ["id"],
        delete: ["id"],
    },
    manage_tool: {
        create: ["name"],
        delete: ["name"],
    },
};
function annotateGlobalAction(action) {
    if (!action || !action.type)
        return action;
    const spec = GLOBAL_MANAGEMENT_ACTIONS[action.type];
    if (!spec)
        return action;
    const operation = String(action.params?.operation || (action.type === "system_status" ? "inspect" : "")).trim().toLowerCase();
    if (!spec.operations.includes(operation))
        throw new Error(spec.label + " 不支持操作: " + (operation || "未填写"));
    const requiresConfirmation = spec.destructive.includes(operation);
    const params = { ...(action.params || {}), operation };
    const required = GLOBAL_MANAGEMENT_REQUIRED_PARAMS[action.type]?.[operation] || [];
    const missingParams = required.filter((key) => {
        const value = params[key];
        return value === undefined || value === null || String(value).trim() === "";
    });
    return {
        ...action,
        params,
        management: true,
        capability: spec.label,
        risk: requiresConfirmation ? "high" : "normal",
        requires_confirmation: requiresConfirmation,
        validated: missingParams.length === 0,
        missing_params: missingParams,
        needs_user_input: missingParams.length > 0,
    };
}
function redactAuditValue(value, key = "") {
    if (/token|secret|password|api.?key/i.test(key))
        return "[REDACTED]";
    if (Array.isArray(value))
        return value.map(item => redactAuditValue(item));
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactAuditValue(entryValue, entryKey)]));
    }
    return value;
}
function appendGlobalActionAudit(payload) {
    const record = {
        id: "ga-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        action: redactAuditValue(payload.action || {}),
        status: payload.status || "unknown",
        result: redactAuditValue(payload.result || {}),
        session_id: payload.session_id || null,
        source: payload.source || null,
        sender_id: redactAuditValue(payload.sender_id || null, "sender_id"),
        message_id: payload.message_id || null,
    };
    fs.appendFileSync(path.join(utils_1.CCM_DIR, "global-agent-audit.jsonl"), JSON.stringify(record) + String.fromCharCode(10), "utf-8");
    return record;
}
function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function stripActionWords(value) {
    return normalizeText(value)
        .replace(/^(请|帮我|麻烦|给我|我要|我想|想要|可以)?/g, "")
        .replace(/(一下|下|吧|呢|谢谢)$/g, "")
        .trim();
}
function findProjectName(message, projects) {
    const text = message.toLowerCase();
    return projects.find(project => text.includes(String(project).toLowerCase())) || "";
}
function findGroup(message, groups) {
    const text = message.toLowerCase();
    return groups.find(group => {
        const id = String(group?.id || "").toLowerCase();
        const name = String(group?.name || "").toLowerCase();
        return (id && text.includes(id)) || (name && text.includes(name));
    }) || null;
}
function findAllProjectNames(message, projects) {
    const text = message.toLowerCase();
    return projects.filter(project => text.includes(String(project).toLowerCase()));
}
function findAllGroups(message, groups) {
    const text = message.toLowerCase();
    return groups.filter(group => {
        const id = String(group?.id || "").toLowerCase();
        const name = String(group?.name || "").toLowerCase();
        return (id && text.includes(id)) || (name && text.includes(name));
    });
}
function buildLocalDevelopmentTargets(message, projects, groups) {
    const matchedGroups = findAllGroups(message, groups);
    const matchedProjects = findAllProjectNames(message, projects);
    const targets = [
        ...matchedGroups.map((group) => ({
            type: "group",
            group_id: group.id,
            reason: "用户明确提到开发群聊「" + (group.name || group.id) + "」",
            task: message,
        })),
        ...matchedProjects.map((project) => ({
            type: "project",
            project,
            reason: "用户明确提到项目「" + project + "」",
            task: message,
        })),
    ];
    if (targets.length > 0)
        return targets;
    if (groups[0]) {
        return [{
                type: "group",
                group_id: groups[0].id,
                reason: "用户未指定执行目标，交由默认开发群聊主 Agent分析项目范围",
                task: message,
            }];
    }
    return projects[0]
        ? [{ type: "project", project: projects[0], reason: "用户未指定执行目标，交由默认项目 Agent分析", task: message }]
        : [];
}
function chineseNumberToInt(value) {
    const text = String(value || "").trim();
    if (!text)
        return NaN;
    if (/^\d+$/.test(text))
        return Number(text);
    const map = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (text === "十")
        return 10;
    const tenIdx = text.indexOf("十");
    if (tenIdx >= 0) {
        const left = text.slice(0, tenIdx);
        const right = text.slice(tenIdx + 1);
        return (left ? map[left] || 0 : 1) * 10 + (right ? map[right] || 0 : 0);
    }
    return map[text] ?? NaN;
}
function normalizeCronHour(raw, text) {
    let hour = chineseNumberToInt(raw);
    if (Number.isNaN(hour))
        return NaN;
    if (/下午|晚上|傍晚/.test(text) && hour < 12)
        hour += 12;
    if (/中午/.test(text) && hour < 11)
        hour += 12;
    return Math.max(0, Math.min(23, hour));
}
function guessCronSchedule(message) {
    const text = normalizeText(message);
    const everyHour = /每(个)?小时|每小时/.test(text);
    if (everyHour)
        return "0 * * * *";
    const minuteMatch = text.match(/每(?:隔)?(\d{1,2})\s*分钟/);
    if (minuteMatch)
        return `*/${Math.max(1, Math.min(59, Number(minuteMatch[1])))} * * * *`;
    const dayHourMatch = text.match(/(?:每天|每日)(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/)
        || text.match(/(?:早上|上午|中午|下午|晚上|傍晚)\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
    if (dayHourMatch) {
        const hour = normalizeCronHour(dayHourMatch[1], text);
        if (!Number.isNaN(hour))
            return `0 ${hour} * * *`;
    }
    const weekMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
    const weekMatch = text.match(/每(?:周|星期)([一二三四五六日天])(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
    if (weekMatch) {
        const hour = normalizeCronHour(weekMatch[2], text);
        if (!Number.isNaN(hour))
            return `0 ${hour} * * ${weekMap[weekMatch[1]]}`;
    }
    const cronMatch = text.match(/(?:cron|表达式)\s*[:：]?\s*([0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+)/i);
    if (cronMatch)
        return cronMatch[1].trim();
    return "";
}
function inferLocalGlobalAction(message, projects, groups, resources = {}) {
    const text = normalizeText(message);
    if (!text)
        return null;
    const lower = text.toLowerCase();
    const matchedProject = findProjectName(text, projects);
    const matchedGroup = findGroup(text, groups);
    const cronJobs = Array.isArray(resources.cronJobs) ? resources.cronJobs : [];
    const tasks = Array.isArray(resources.tasks) ? resources.tasks : [];
    const mcpTools = Array.isArray(resources.mcpTools) ? resources.mcpTools : [];
    const skills = Array.isArray(resources.skills) ? resources.skills : [];
    const matchedCron = cronJobs.find((item) => text.includes(String(item.id || "")) || text.includes(String(item.name || "")));
    const matchedTask = tasks.find((item) => text.includes(String(item.id || "")) || (item.title && text.includes(String(item.title))));
    const matchedMcp = mcpTools.find((item) => item.name && text.includes(String(item.name)));
    const matchedSkill = skills.find((item) => item.name && text.includes(String(item.name)));
    if (/(系统状态|运行状态|健康状态|检查系统|系统概况|当前状态)/.test(text) && !/(定时任务|计划任务|定时执行|每天|每日|每周|每小时|创建|新建|添加)/.test(text)) {
        return {
            reply: "我会检查项目、群聊、任务队列、定时调度和工具运行状态。",
            action: { type: "system_status", params: { operation: "inspect" } }
        };
    }
    if (/定时任务|计划任务|定时执行|cron|每(天|周|星期|小时|隔)/i.test(text) && /(查看|列出|创建|新建|添加|启用|开启|暂停|禁用|立即运行|执行一次|删除|修改|更新|定时|每)/.test(text)) {
        const operation = /(创建|新建|添加)/.test(text) ? "create"
            : /删除/.test(text) ? "delete"
                : /(暂停|禁用|关闭)/.test(text) ? "disable"
                    : /(启用|开启|恢复)/.test(text) ? "enable"
                        : /(立即运行|执行一次|马上执行)/.test(text) ? "run"
                            : /(修改|更新)/.test(text) ? "update"
                                : "list";
        const schedule = guessCronSchedule(text);
        const targetType = matchedGroup || !matchedProject ? "group" : "project";
        const group = matchedGroup || groups[0] || null;
        const project = matchedProject || projects[0] || "";
        const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
        return {
            reply: "我会执行定时任务管理操作：" + operation + "。",
            action: {
                type: "manage_cron",
                params: {
                    operation,
                    id: matchedCron?.id || "",
                    name: operation === "create" ? (prompt.slice(0, 28) || "全局助手定时任务") : (matchedCron?.name || ""),
                    schedule: schedule || undefined,
                    prompt: operation === "create" ? prompt : undefined,
                    target_type: operation === "create" ? targetType : undefined,
                    group_id: operation === "create" && targetType === "group" ? group?.id : undefined,
                    project: operation === "create" && targetType === "project" ? project : undefined,
                }
            }
        };
    }
    if (/任务/.test(text) && /(查看任务|任务列表|暂停|继续|恢复|重试|重新执行|删除任务|取消任务|加入队列)/.test(text)) {
        const operation = /(删除|取消)/.test(text) ? "delete"
            : /暂停/.test(text) ? "pause"
                : /重试|重新执行/.test(text) ? "retry"
                    : /加入队列/.test(text) ? "queue"
                        : /继续/.test(text) ? "continue"
                            : /恢复/.test(text) ? "resume"
                                : "list";
        return {
            reply: "我会执行开发任务管理操作：" + operation + "。",
            action: { type: "manage_task", params: { operation, id: matchedTask?.id || "", message: text } }
        };
    }
    if (/(群聊|项目组)/.test(text) && /(创建|新建|重命名|改名|添加成员|移除成员|删除群聊|删除项目组|查看群聊|群聊列表)/.test(text)) {
        const operation = /(删除群聊|删除项目组)/.test(text) ? "delete"
            : /添加成员/.test(text) ? "add_member"
                : /移除成员/.test(text) ? "remove_member"
                    : /(重命名|改名)/.test(text) ? "rename"
                        : /(创建|新建)/.test(text) ? "create"
                            : "list";
        return {
            reply: "我会执行群聊管理操作：" + operation + "。",
            action: {
                type: "manage_group",
                params: { operation, id: matchedGroup?.id || "", name: matchedGroup?.name || stripActionWords(text).slice(0, 40), project: matchedProject || "" }
            }
        };
    }
    if (/(MCP|mcp|Skill|skill|技能)/.test(text) && /(查看|列表|状态|重载|重新加载|删除|移除|创建|添加)/.test(text)) {
        const kind = /(Skill|skill|技能)/.test(text) ? "skill" : "mcp";
        const operation = /(删除|移除)/.test(text) ? "delete"
            : /(重载|重新加载)/.test(text) ? "reload"
                : /(创建|添加)/.test(text) ? "create"
                    : /状态/.test(text) ? "status"
                        : "list";
        return {
            reply: "我会执行 " + kind.toUpperCase() + " 管理操作：" + operation + "。",
            action: {
                type: "manage_tool",
                params: { operation, kind, name: kind === "mcp" ? matchedMcp?.name || "" : matchedSkill?.name || "" }
            }
        };
    }
    if (/(项目|Agent|agent)/.test(text) && /(项目列表|查看项目|列出项目|创建项目|新建项目|启动|运行|拉起|开启|停止|关闭|停掉|结束|删除项目|移除项目|修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text)) {
        const operation = /(创建项目|新建项目)/.test(text) ? "create"
            : /(删除项目|移除项目)/.test(text) ? "delete"
                : /(启动|运行|拉起|开启)/.test(text) ? "start"
                    : /(停止|关闭|停掉|结束)/.test(text) ? "stop"
                        : /(修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text) ? "update"
                            : "list";
        const agentMatch = text.match(/(claudecode|claude|codex|cursor|gemini|qoder)/i);
        const nameMatch = text.match(/(?:创建项目|新建项目|创建一个项目|新建一个项目)\s*[「"']?([^，。,\.\s"'」]+)/);
        const workDirMatch = text.match(/(?:目录|路径|work_dir|工作目录)\s*[:：]?\s*([A-Za-z]:\\[^，。\n]+|\/[^，。\s]+)/i);
        const project = matchedProject || (operation === "create" ? (nameMatch?.[1] || "") : "");
        return {
            reply: "我会执行项目管理操作：" + operation + "。",
            action: {
                type: "manage_project",
                params: {
                    operation,
                    project,
                    name: operation === "create" ? project : matchedProject,
                    work_dir: workDirMatch?.[1] || undefined,
                    agent: agentMatch?.[1] || undefined,
                }
            }
        };
    }
    if (/(打开|开启|启动|唤醒|显示).*(宠物|桌宠)|(?:宠物|桌宠).*(打开|开启|启动|唤醒|显示)/.test(text)) {
        return {
            reply: "我识别到你要打开桌面宠物，正在调起宠物 Agent。",
            action: { type: "toggle_pet", params: { action: "open" } }
        };
    }
    if (/(关闭|隐藏|退出).*(宠物|桌宠)|(?:宠物|桌宠).*(关闭|隐藏|退出)/.test(text)) {
        return {
            reply: "我识别到你要关闭桌面宠物，正在执行。",
            action: { type: "toggle_pet", params: { action: "close" } }
        };
    }
    const pageMap = [
        [/音乐|播放器|听歌/, "music", "音乐播放"],
        [/宠物|桌宠/, "pets", "宠物空间"],
        [/项目管理|项目列表/, "projects", "项目管理"],
        [/群聊|项目组|协作/, "groups", "群聊协作"],
        [/任务派发|任务列表|开发任务/, "tasks", "任务派发"],
        [/定时任务|计划任务|cron/i, "cron", "定时任务"],
        [/终端|控制台/, "terminal", "内置终端"],
        [/模板|提示词/, "templates", "对话模板"],
        [/搜索|查对话/, "search", "对话搜索"],
        [/设置|配置/, "settings", "系统设置"],
    ];
    if (/(打开|进入|跳转|去|查看).*(页面|面板|模块|列表|空间|设置|控制台)?/.test(text)) {
        const page = pageMap.find(([pattern]) => pattern.test(text));
        if (page) {
            return {
                reply: `我会为你打开「${page[2]}」页面。`,
                action: { type: "navigate", params: { tab: page[1] } }
            };
        }
    }
    if (matchedProject && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
        return {
            reply: `我会启动项目「${matchedProject}」。`,
            action: { type: "manage_project", params: { operation: "start", project: matchedProject } }
        };
    }
    if (matchedProject && /(?:停止|关闭|停掉|结束)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:停止|关闭|停掉|结束)/.test(text)) {
        return {
            reply: `我会停止项目「${matchedProject}」。`,
            action: { type: "manage_project", params: { operation: "stop", project: matchedProject } }
        };
    }
    if (/(播放|放一首|来一首|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
        const keyword = stripActionWords(text)
            .replace(/^(播放|放一首|来一首|听|我想听|我要听|搜首歌|搜索)/, "")
            .replace(/(音乐|歌曲|歌)$/g, "")
            .trim();
        if (keyword) {
            return {
                reply: `我会交给音乐 Agent 搜索并播放「${keyword}」。`,
                action: { type: "play_music", params: { keyword } }
            };
        }
    }
    if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
        const schedule = guessCronSchedule(text);
        const targetType = matchedGroup || !matchedProject ? "group" : "project";
        const group = matchedGroup || groups[0] || null;
        const project = matchedProject || projects[0] || "";
        const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
        return {
            reply: schedule
                ? `我会创建一个定时任务，周期是 \`${schedule}\`。`
                : "我可以创建定时任务，但还需要明确周期；我先把识别到的任务内容整理好。",
            action: {
                type: "create_cron_task",
                params: {
                    name: prompt.slice(0, 28) || "全局助手定时任务",
                    schedule,
                    prompt,
                    target_type: targetType,
                    group_id: targetType === "group" ? group?.id : undefined,
                    project: targetType === "project" ? project : undefined,
                }
            }
        };
    }
    const isDevelopmentRequest = /(业务需求|需求文档|开发|实现|新增|修改|修复|重构|优化|完成|对接|上线|功能)/.test(text)
        && !/(只是解释|只分析|不要执行|不用修改|不要创建任务)/.test(text);
    if (isDevelopmentRequest) {
        const targets = buildLocalDevelopmentTargets(text, projects, groups);
        if (targets.length > 0) {
            return {
                reply: "我会把这条业务需求交给全局总控流程，建立跨项目计划并向 " + targets.length + " 个执行目标派发持久任务。",
                action: {
                    type: "orchestrate_development",
                    params: {
                        title: text.slice(0, 60),
                        business_goal: text,
                        scope: "由全局 Agent结合项目和群聊成员关系识别影响范围",
                        documents: text,
                        acceptance: "所有群聊主 Agent和项目 Agent子任务必须通过代码变更与验证门禁，全局 Agent再汇总报告完成",
                        execution_order: "parallel",
                        targets,
                    }
                }
            };
        }
    }
    if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
        const group = matchedGroup || groups[0] || null;
        if (group) {
            return {
                reply: `我会把这条指令下发到群聊「${group.name || group.id}」的主 Agent。`,
                action: {
                    type: "send_group_cmd",
                    params: { groupId: group.id, message: text, target_project: "coordinator" }
                }
            };
        }
    }
    if (matchedProject && /(修改|修复|改一下|处理|实现|新增|删除|优化|项目\s*agent|项目agent)/.test(text)) {
        return {
            reply: `我会把这条修改指令发送给项目 Agent「${matchedProject}」。`,
            action: { type: "send_project_cmd", params: { project: matchedProject, message: text } }
        };
    }
    if (/创建|新建|派发/.test(text) && /任务|需求|开发/.test(text)) {
        const group = matchedGroup || groups[0] || null;
        return {
            reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
            action: {
                type: "create_task",
                params: {
                    title: text.slice(0, 36),
                    business_goal: text,
                    scope: text,
                    group_id: group?.id,
                    acceptance: "子 Agent 提供回执；主 Agent 输出最终报告"
                }
            }
        };
    }
    return null;
}
function decryptFeishuEvent(encrypted, encryptKey) {
    const key = crypto.createHash("sha256").update(encryptKey).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.alloc(16));
    decipher.setAutoPadding(true);
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
}
function normalizeFeishuEventPayload(payload, config) {
    if (!payload?.encrypt)
        return payload;
    const encryptKey = String(config.control_bot_encrypt_key || "").trim();
    if (!encryptKey)
        throw new Error("收到加密事件，但尚未配置 Encrypt Key");
    return decryptFeishuEvent(String(payload.encrypt), encryptKey);
}
function verifyFeishuEventToken(payload, config) {
    const expected = String(config.control_bot_verification_token || "").trim();
    if (!expected)
        throw new Error("控制机器人尚未配置 Verification Token");
    const actual = String(payload?.token || payload?.header?.token || "").trim();
    if (!actual || actual !== expected)
        throw new Error("飞书事件 Verification Token 校验失败");
}
function extractFeishuMessageText(payload) {
    const message = payload?.event?.message || {};
    if (message.message_type !== "text")
        return "";
    let content = {};
    try {
        content = JSON.parse(String(message.content || "{}"));
    }
    catch { }
    return String(content.text || "")
        .replace(/@_user_\d+/g, "")
        .replace(/<at[^>]*>.*?<\/at>/gi, "")
        .trim();
}
function extractCcConnectHookText(payload) {
    const candidates = [
        payload?.message?.text,
        payload?.message?.content,
        payload?.message,
        payload?.text,
        payload?.content,
        payload?.prompt,
        payload?.data?.message?.text,
        payload?.data?.message?.content,
        payload?.data?.text,
        payload?.data?.content,
        payload?.event?.message?.text,
        payload?.event?.message?.content,
    ];
    for (const item of candidates) {
        if (typeof item === "string" && item.trim()) {
            let text = item.trim();
            if (/^\{/.test(text)) {
                try {
                    const parsed = JSON.parse(text);
                    text = String(parsed.text || parsed.content || text).trim();
                }
                catch { }
            }
            return text
                .replace(/@_user_\d+/g, "")
                .replace(/<at[^>]*>.*?<\/at>/gi, "")
                .trim();
        }
    }
    return "";
}
function getRequestBaseUrl(req) {
    const port = Number(req.socket?.localPort || 3080);
    return `http://127.0.0.1:${port}`;
}
async function callLocalApi(baseUrl, pathname, options = {}) {
    const response = await fetch(baseUrl + pathname, options);
    const data = await response.json();
    if (!response.ok || data?.success === false || data?.error) {
        throw new Error(data?.error || `接口执行失败 (${response.status})`);
    }
    return data;
}
function postLocalApi(baseUrl, pathname, body) {
    return callLocalApi(baseUrl, pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
    });
}
function formatMissionStatus() {
    const missions = (0, collaboration_1.refreshGlobalDevelopmentMissions)();
    if (!missions.length)
        return "当前还没有全局开发任务。";
    const rows = missions.slice(-8).reverse().map((mission) => {
        const summary = mission.mission_summary || {};
        const total = Number(summary.total || mission.child_task_ids?.length || 0);
        const completed = Number(summary.completed || 0);
        const failed = Number(summary.failed || 0);
        const blocked = Number(summary.blocked || 0);
        const details = [`${completed}/${total} 已完成`];
        if (failed > 0)
            details.push(`${failed} 失败`);
        if (blocked > 0)
            details.push(`${blocked} 阻塞`);
        return `- ${mission.title || mission.id}：${mission.status || "unknown"}（${details.join("，")}）\n  ID: ${mission.id}`;
    });
    return `最近的全局开发任务：\n${rows.join("\n")}`;
}
function formatSystemStatus() {
    const projects = (0, db_1.getConfigs)();
    const groups = (0, collaboration_1.loadGroups)();
    const tasks = (0, db_1.loadTasks)();
    const cronJobs = (0, db_1.loadCronJobs)();
    const activeTasks = tasks.filter((item) => ["pending", "queued", "in_progress", "running"].includes(String(item.status))).length;
    return [
        "CCM 当前状态：",
        `- 项目：${projects.length} 个`,
        `- 协作群聊：${groups.length} 个`,
        `- 开发任务：${tasks.length} 个，活跃 ${activeTasks} 个`,
        `- 定时任务：${cronJobs.length} 个，启用 ${cronJobs.filter((item) => item.enabled !== false).length} 个`,
    ].join("\n");
}
async function queueMusicPlayback(baseUrl, keyword) {
    if (!keyword)
        return "缺少要播放的歌曲或歌手关键词。";
    const result = await postLocalApi(baseUrl, "/api/music/remote-command", { keyword, source: "feishu-global-agent" });
    return `已把「${keyword}」发送给音乐播放器。请保持 CCM 音乐播放器页面打开，它会在后台自动检索并播放。${result.command?.id ? `\n- 指令 ID：${result.command.id}` : ""}`;
}
function fillCronParams(params, originalText, groups = [], projects = []) {
    const schedule = params.schedule || params.cron || guessCronSchedule(originalText);
    const namedFromText = (originalText.match(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/)?.[1] || "").trim();
    const explicitName = namedFromText || String(params.name || params.title || "").trim();
    const cleanedPrompt = originalText
        .replace(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/g, "")
        .replace(/创建|新建|添加|一个|定时任务|计划任务/g, "")
        .replace(/^[：:，,\s]+/, "")
        .trim();
    const paramPrompt = String(params.prompt || params.message || params.command || "").trim();
    const prompt = (paramPrompt && !/名字|名称|标题/.test(paramPrompt) ? paramPrompt : "") || cleanedPrompt || originalText;
    const name = explicitName || prompt.slice(0, 28) || "全局助手定时任务";
    const targetType = params.target_type || params.targetType || (params.group_id || params.groupId ? "group" : (params.project ? "project" : (groups[0] ? "group" : "project")));
    const groupId = params.group_id || params.groupId || (targetType === "group" ? groups[0]?.id : undefined);
    const project = params.project || params.projectName || (targetType === "project" ? projects[0] : undefined);
    return { ...params, operation: params.operation || "create", name, schedule, prompt, target_type: targetType, group_id: groupId, project, workflow_type: params.workflow_type || params.workflowType || "general", enabled: params.enabled !== false };
}
async function executeFeishuManagementAction(baseUrl, action, originalText = "") {
    let params = { ...(action.params || {}) };
    const groups = (0, collaboration_1.loadGroups)();
    const projects = (0, db_1.getConfigs)().map(c => c.name);
    const operation = params.operation || (action.type === "system_status" ? "inspect" : "");
    if (action.type === "manage_cron" && operation === "create") {
        params = fillCronParams(params, originalText, groups, projects);
        action = { ...action, params, needs_user_input: false, validated: true, missing_params: [] };
    }
    if (action.requires_confirmation || ["delete", "remove_member"].includes(operation)) {
        return "这是一条高风险操作，控制机器人不会直接执行。请到 CCM 全局助手界面确认后操作。";
    }
    if (action.needs_user_input || action.validated === false) {
        return `还缺少参数：${(action.missing_params || []).join("、") || "必要参数"}。请补充后重新发送。`;
    }
    let result;
    if (action.type === "system_status")
        return formatSystemStatus();
    if (action.type === "manage_cron") {
        if (operation === "list")
            result = await callLocalApi(baseUrl, "/api/cron");
        else if (operation === "create")
            result = await postLocalApi(baseUrl, "/api/cron/create", fillCronParams(params, originalText, groups, projects));
        else if (operation === "update")
            result = await postLocalApi(baseUrl, "/api/cron/update", params);
        else if (operation === "enable" || operation === "disable")
            result = await postLocalApi(baseUrl, "/api/cron/update", { id: params.id, enabled: operation === "enable" });
        else if (operation === "run")
            result = await postLocalApi(baseUrl, "/api/cron/run", { id: params.id });
    }
    else if (action.type === "manage_task") {
        const id = params.id || params.task_id;
        if (operation === "list")
            result = await callLocalApi(baseUrl, "/api/tasks");
        else if (operation === "pause")
            result = await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "paused", status_detail: "由飞书全局 Agent 暂停" });
        else if (operation === "resume") {
            await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "pending", status_detail: "由飞书全局 Agent 恢复" });
            result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
        }
        else if (operation === "continue")
            result = await postLocalApi(baseUrl, "/api/tasks/continue", { id, message: params.message || "由飞书全局 Agent 继续推进", auto_execute: true });
        else if (operation === "retry")
            result = await postLocalApi(baseUrl, "/api/tasks/retry", { id, reason: params.message || "由飞书全局 Agent 发起重试", auto_execute: true });
        else if (operation === "queue")
            result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
    }
    else if (action.type === "manage_project") {
        const project = params.project || params.name;
        if (operation === "list")
            result = await callLocalApi(baseUrl, "/api/projects");
        else if (operation === "create")
            result = await postLocalApi(baseUrl, "/api/projects/create", params);
        else if (operation === "update")
            result = await postLocalApi(baseUrl, "/api/projects/update", { ...params, name: project });
        else if (operation === "start")
            result = await postLocalApi(baseUrl, "/api/start", { project, agent: params.agent });
        else if (operation === "stop")
            result = await postLocalApi(baseUrl, "/api/stop", { project });
    }
    else if (action.type === "manage_group") {
        if (operation === "list")
            result = await callLocalApi(baseUrl, "/api/groups");
        else if (operation === "create")
            result = await postLocalApi(baseUrl, "/api/groups/create", { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) });
        else if (operation === "rename")
            result = await postLocalApi(baseUrl, "/api/groups/rename", { id: params.id || params.group_id, name: params.name });
        else if (operation === "add_member")
            result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, add: params.members || [{ project: params.project }] });
    }
    else if (action.type === "manage_tool") {
        const kind = params.kind === "skill" ? "skill" : "mcp";
        if (operation === "status")
            result = await callLocalApi(baseUrl, "/api/tools/status");
        else if (operation === "reload")
            result = await postLocalApi(baseUrl, "/api/tools/reload", {});
        else if (operation === "list")
            result = await callLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp");
        else if (operation === "create") {
            const payload = { ...params };
            delete payload.operation;
            delete payload.kind;
            result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp", payload);
        }
    }
    if (!result)
        throw new Error(`暂不支持从飞书执行 ${action.type}/${operation}`);
    if (action.type === "manage_cron" && operation === "create") {
        const cronParams = fillCronParams(params, originalText, (0, collaboration_1.loadGroups)(), (0, db_1.getConfigs)().map(c => c.name));
        return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${result.job?.schedule || cronParams.schedule}\n- 提示词：${result.job?.prompt || cronParams.prompt}`;
    }
    const count = result.jobs?.length ?? result.tasks?.length ?? result.projects?.length ?? result.groups?.length;
    return count === undefined ? `操作已完成：${action.type}/${operation}` : `查询完成：${count} 条记录。`;
}
async function executeFeishuAction(baseUrl, action, originalText = "") {
    if (!action?.type)
        return "";
    if (GLOBAL_MANAGEMENT_ACTIONS[action.type])
        return executeFeishuManagementAction(baseUrl, action, originalText);
    const params = action.params || {};
    if (action.type === "play_music") {
        return queueMusicPlayback(baseUrl, params.keyword || params.query || params.song || originalText);
    }
    if (action.type === "toggle_pet") {
        const operation = params.action || params.operation || "open";
        const result = await postLocalApi(baseUrl, operation === "close" ? "/api/pets/close" : "/api/pets/launch", {});
        return result.success === false ? `桌面宠物控制失败：${result.error || "未知错误"}` : `桌面宠物已${operation === "close" ? "关闭" : "打开"}。`;
    }
    if (action.type === "navigate") {
        return `页面跳转「${params.tab || params.page || ""}」只能在 Web 控制台内执行；飞书端已记录该意图，请在 CCM 页面切换查看。`;
    }
    if (action.type === "create_cron_task") {
        const groups = (0, collaboration_1.loadGroups)();
        const projects = (0, db_1.getConfigs)().map(c => c.name);
        const cronParams = fillCronParams(params, originalText, groups, projects);
        const result = await postLocalApi(baseUrl, "/api/cron/create", cronParams);
        return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${cronParams.schedule}\n- 提示词：${cronParams.prompt}`;
    }
    if (action.type === "orchestrate_development") {
        const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", {
            ...params,
            title: params.title || "飞书下发的全局开发任务",
            business_goal: params.business_goal || params.goal || params.title,
            source_documents: params.documents || params.source_documents || "",
            auto_execute: true,
            source: "feishu-control-bot",
        });
        return `全局开发任务已建立并开始派发。\n- 标题：${result.mission?.title || params.title}\n- 任务 ID：${result.mission?.id}\n- 执行目标：${result.children?.length || 0} 个`;
    }
    if (action.type === "create_task") {
        const result = await postLocalApi(baseUrl, "/api/tasks/create-daily-dev", {
            title: params.title || "飞书下发的开发任务",
            group_id: params.group_id || params.groupId,
            business_goal: params.business_goal || params.businessGoal || params.title,
            scope: params.scope || "",
            documents: params.documents || "",
            acceptance: params.acceptance || "子 Agent 提供回执；主 Agent 输出最终报告",
            persist_documents: true,
            auto_execute: true,
        });
        return `协作任务已派发并进入自动执行队列。\n- 任务 ID：${result.task?.id || result.id || "已创建"}`;
    }
    if (action.type === "send_group_cmd") {
        const result = await postLocalApi(baseUrl, "/api/groups/send", {
            group_id: params.group_id || params.groupId,
            target_project: params.target_project || params.targetProject || "coordinator",
            message: params.message || params.prompt || params.command,
        });
        return `群聊主 Agent 已收到指令。${result.reply ? `\n\n主 Agent 回执：\n${String(result.reply).slice(0, 1200)}` : ""}`;
    }
    if (action.type === "send_project_cmd") {
        const result = await postLocalApi(baseUrl, "/api/send", { project: params.project || params.projectName, message: params.message || params.prompt || params.command });
        return `项目 Agent 已执行指令。\n${String(result.output || "已完成").slice(0, 1500)}`;
    }
    if (action.type === "create_cron_task") {
        const result = await postLocalApi(baseUrl, "/api/cron/create", params);
        return `定时任务已创建：${result.job?.name || params.name || "未命名任务"}（${params.schedule}）`;
    }
    return `已识别动作 ${action.type}，但它不适合从飞书远程执行。`;
}
async function processFeishuGlobalAgentMessage(baseUrl, text, payload, options = {}) {
    const sendReport = options.sendReport !== false;
    const conversationId = buildFeishuConversationId(payload);
    const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
    appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
    const auditBase = {
        source: "feishu-control-bot",
        sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
        message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
    };
    try {
        if (/^(帮助|help|\/help)$/i.test(text)) {
            const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个群聊/项目 Agent 下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
            if (sendReport)
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 使用帮助", markdown });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            return markdown;
        }
        if (/^(任务状态|查看任务状态|全局任务|最近任务|\/status)$/i.test(text)) {
            const markdown = formatMissionStatus();
            appendGlobalActionAudit({ ...auditBase, action: { type: "mission_status", params: { message: text } }, status: "success", result: { summary: markdown } });
            if (sendReport)
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局任务状态", markdown });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            return markdown;
        }
        const chat = await postLocalApi(baseUrl, "/api/global-agent/chat", { message: text, history: historyBeforeUser.map((item) => ({ role: item.role, content: item.content })) });
        const action = chat.action ? annotateGlobalAction(chat.action) : null;
        if (!action?.type) {
            const markdown = chat.reply || "已收到。";
            appendGlobalActionAudit({ ...auditBase, action: { type: "conversation", params: { message: text } }, status: "success", result: { summary: markdown } });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            if (sendReport)
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 回复", markdown });
            return markdown;
        }
        const result = await executeFeishuAction(baseUrl, action, text);
        const markdown = `${chat.reply || "已收到指令。"}\n\n${result}`;
        appendGlobalActionAudit({ ...auditBase, action: action || { type: "unrecognized", params: { message: text } }, status: "success", result: { summary: result } });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport)
            await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 执行回执", markdown });
        return markdown;
    }
    catch (error) {
        const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
        appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport)
            await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 执行失败", markdown });
        return markdown;
    }
}
function handleGlobalAgentApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/global-agent/history" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const store = syncGlobalAgentWebHistory(payload);
                (0, utils_1.sendJson)(res, { success: true, sessions: store.sessions?.length || 0, current_session_id: store.current_session_id || "" });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "全局 Agent 历史同步失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/history" && req.method === "GET") {
        const store = loadGlobalAgentHistoryStore();
        (0, utils_1.sendJson)(res, { success: true, ...store });
        return true;
    }
    if (pathname === "/api/global-agent/bridge/pending" && req.method === "GET") {
        const store = loadGlobalAgentBridgeStore();
        const pending = (store.requests || []).filter((item) => item.status === "pending").sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0] || null;
        (0, utils_1.sendJson)(res, { success: true, request: pending });
        return true;
    }
    if (pathname === "/api/global-agent/bridge/result" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const store = loadGlobalAgentBridgeStore();
                const request = (store.requests || []).find((item) => item.id === payload.id);
                if (!request)
                    return (0, utils_1.sendJson)(res, { success: false, error: "桥接请求不存在" }, 404);
                request.status = payload.success === false ? "failed" : "done";
                request.reply = String(payload.reply || payload.error || "已完成");
                request.error = payload.error || "";
                request.updated_at = new Date().toISOString();
                saveGlobalAgentBridgeStore(store);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "桥接结果保存失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/control-bot/message" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const isAcp = req.headers["x-ccm-acp"] === "1";
                const config = (0, db_1.loadFeishuConfig)();
                if (!isAcp) {
                    const expected = String(config.control_bot_hook_token || "").trim();
                    const actual = String(parsed.query.token || req.headers["x-ccm-token"] || "").trim();
                    if (!expected || actual !== expected) {
                        (0, utils_1.sendJson)(res, { success: false, error: "控制机器人 Hook Token 校验失败" }, 401);
                        return;
                    }
                }
                const payload = body ? JSON.parse(body) : {};
                const text = extractCcConnectHookText(payload);
                if (!text) {
                    (0, utils_1.sendJson)(res, { success: false, error: "未从控制机器人载荷中识别到文本消息" }, 400);
                    return;
                }
                if (isAcp) {
                    const conversationId = buildFeishuConversationId(payload);
                    const request = createGlobalAgentBridgeRequest(text, conversationId);
                    const result = await waitForGlobalAgentBridgeResult(request.id);
                    (0, utils_1.sendJson)(res, { success: result.status !== "failed", message: "控制机器人消息已桥接到 Web 全局 Agent", reply: result.reply || result.error || "已处理" });
                    return;
                }
                const reply = await processFeishuGlobalAgentMessage(getRequestBaseUrl(req), text, payload, { sendReport: true });
                (0, utils_1.sendJson)(res, { success: true, message: "控制机器人消息已处理", reply });
            }
            catch (error) {
                if (!res.headersSent)
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || "控制机器人消息处理失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/bot/test" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        const publicBaseUrl = String(config.control_bot_public_base_url || "").trim().replace(/\/$/, "");
        const verificationToken = String(config.control_bot_verification_token || "").trim();
        if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
            (0, utils_1.sendJson)(res, { success: false, error: "请先填写可公网访问的 HTTPS 地址" }, 400);
            return true;
        }
        if (!verificationToken) {
            (0, utils_1.sendJson)(res, { success: false, error: "请先填写 Verification Token" }, 400);
            return true;
        }
        const callbackUrl = publicBaseUrl + "/api/feishu/bot/event";
        const challenge = "ccm-" + Date.now().toString(36);
        void fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "url_verification", challenge, token: verificationToken }),
            signal: AbortSignal.timeout(10000),
        }).then(async (response) => {
            const data = await response.json();
            if (!response.ok || data?.challenge !== challenge)
                throw new Error(data?.error || `回调响应异常 (${response.status})`);
            (0, utils_1.sendJson)(res, { success: true, message: "控制机器人事件回调可用", callback_url: callbackUrl });
        }).catch((error) => {
            (0, utils_1.sendJson)(res, { success: false, error: `无法访问事件回调：${error?.message || String(error)}` }, 400);
        });
        return true;
    }
    if (pathname === "/api/feishu/bot/event" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const config = (0, db_1.loadFeishuConfig)();
                const rawPayload = body ? JSON.parse(body) : {};
                const payload = normalizeFeishuEventPayload(rawPayload, config);
                verifyFeishuEventToken(payload, config);
                if (payload.type === "url_verification" || payload.challenge) {
                    (0, utils_1.sendJson)(res, { challenge: payload.challenge });
                    return;
                }
                (0, utils_1.sendJson)(res, { code: 0 });
                if (config.control_bot_enabled !== true)
                    return;
                if (payload?.header?.event_type !== "im.message.receive_v1")
                    return;
                if (payload?.event?.sender?.sender_type === "app")
                    return;
                const messageId = String(payload?.event?.message?.message_id || "").trim();
                if (messageId && processedFeishuMessageIds.has(messageId))
                    return;
                if (messageId) {
                    processedFeishuMessageIds.add(messageId);
                    if (processedFeishuMessageIds.size > 1000) {
                        const oldest = processedFeishuMessageIds.values().next().value;
                        if (oldest)
                            processedFeishuMessageIds.delete(oldest);
                    }
                }
                const text = extractFeishuMessageText(payload);
                if (!text) {
                    void (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent", markdown: "目前控制机器人只处理文字消息，请把需求或指令以文字发送。" });
                    return;
                }
                void processFeishuGlobalAgentMessage(getRequestBaseUrl(req), text, payload);
            }
            catch (error) {
                if (!res.headersSent)
                    (0, utils_1.sendJson)(res, { code: 1, error: error?.message || "飞书事件处理失败" }, 401);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/capabilities" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            capabilities: Object.entries(GLOBAL_MANAGEMENT_ACTIONS).map(([type, spec]) => ({
                type,
                label: spec.label,
                operations: spec.operations,
                destructive: spec.destructive,
                required_params: GLOBAL_MANAGEMENT_REQUIRED_PARAMS[type] || {},
            })),
        });
        return true;
    }
    if (pathname === "/api/global-agent/audit" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, { success: true, audit: appendGlobalActionAudit(payload) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error.message || "审计记录失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/orchestrate" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, collaboration_1.createGlobalDevelopmentMission)({
                    ...payload,
                    source: payload.source || "global-agent-chat",
                }, ctx);
                (0, utils_1.sendJson)(res, result);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message || "全局任务创建失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/missions" && req.method === "GET") {
        const id = String(parsed.query.id || "").trim();
        if (id) {
            const result = (0, collaboration_1.getGlobalDevelopmentMission)(id);
            if (!result)
                return (0, utils_1.sendJson)(res, { error: "全局任务不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, ...result });
            return true;
        }
        const missions = (0, collaboration_1.refreshGlobalDevelopmentMissions)();
        (0, utils_1.sendJson)(res, { success: true, missions });
        return true;
    }
    if (pathname === "/api/global-agent/chat" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleChat = async (message, history, files) => {
            try {
                let finalMessage = message || "";
                if (files && files.length > 0) {
                    const filesContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                    finalMessage = finalMessage ? `${finalMessage}\n\n${filesContext}` : `请处理以下附件：\n\n${filesContext}`;
                }
                if (!finalMessage)
                    return (0, utils_1.sendJson)(res, { error: "消息不能为空" }, 400);
                // 检索本地知识库相关参考资料
                const ragContext = (0, rag_1.queryKnowledgeBase)(message || "");
                // 1. 获取当前系统资源和大模型配置
                const projectItems = (0, db_1.getConfigs)().map(c => c.name);
                const groupItems = (0, collaboration_1.loadGroups)();
                const projects = projectItems.join(", ");
                const groups = groupItems.map(g => {
                    const members = (g.members || []).map((member) => member.project).filter(Boolean).join("|");
                    return String(g.name || g.id) + " (ID: " + g.id + "; members: " + (members || "none") + ")";
                }).join(", ");
                const systemResources = {
                    cronJobs: (0, db_1.loadCronJobs)(),
                    tasks: (0, db_1.loadTasks)(),
                    mcpTools: (0, db_1.loadMcpTools)(),
                    skills: (0, db_1.loadSkills)(),
                };
                const localIntent = inferLocalGlobalAction(finalMessage, projectItems, groupItems, systemResources);
                if (localIntent)
                    localIntent.action = annotateGlobalAction(localIntent.action);
                if (localIntent?.action?.management) {
                    return (0, utils_1.sendJson)(res, {
                        success: true,
                        reply: localIntent.reply,
                        action: localIntent.action,
                        files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
                    });
                }
                const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (!config.apiKey || !config.apiUrl || !config.model) {
                    if (localIntent) {
                        return (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: `${localIntent.reply}

提示：当前还没有配置统一大模型，所以我先用本地规则执行这个明确指令。复杂编排建议到「系统设置」启用统一大模型配置。`,
                            action: localIntent.action,
                            files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
                        });
                    }
                    return (0, utils_1.sendJson)(res, {
                        success: true,
                        reply: "您好！我是全局控制助手。为了让我能够控制整个系统，请先前往 [系统设置] 填写并启用 **统一大模型配置**（填写 API Key、Base URL 及模型名称）。简单指令如“打开宠物”“播放 晚安”“打开定时任务页面”我也可以先用本地规则处理。"
                    });
                }
                // 2. 构建系统提示词
                let systemPrompt = `你是一个名为“全局助手 (Global Assistant)”的系统控制 Agent。你能够帮用户管理和操作整个 cc-connect 系统的各项功能。
当前系统的运行环境与资源如下：
- 可操作的项目（projects）列表: [${projects || "暂无项目"}]
- 现有的群聊协作组（groups）列表: [${groups || "暂无群聊"}]
- 定时任务: [${systemResources.cronJobs.map((item) => (item.name || item.id) + "(" + item.id + ")").join(", ") || "暂无"}]
- 开发任务: [${systemResources.tasks.slice(-30).map((item) => (item.title || item.id) + "(" + item.id + "," + item.status + ")").join(", ") || "暂无"}]
- MCP: [${systemResources.mcpTools.map((item) => item.name).join(", ") || "暂无"}]
- Skills: [${systemResources.skills.map((item) => item.name).join(", ") || "暂无"}]`;
                if (ragContext) {
                    systemPrompt += `\n\n【本地知识库参考上下文】\n${ragContext}\n\n重要规则：用户的问题可能与上述知识库内容相关。若存在相关信息，请务必优先基于上述知识库内容并结合这些资料来回答用户。`;
                }
                systemPrompt += `\n\n你的任务是：
1. 理解用户的指令，用自然、友好且专业的中文进行回答。
2. 如果用户的指令涉及系统动作，你需要在回答的最后，输出一个特定的 \`\`\`action 代码块（JSON 格式）。

支持的系统动作有：

a. 播放音乐（play_music）：
当用户说“我要听xxx”、“播放xxx”、“搜首歌xxx”时使用。
\`\`\`action
{
  "type": "play_music",
  "params": {
    "keyword": "歌曲或歌手名称"
  }
}
\`\`\`

b. 宠物控制（toggle_pet）：
当用户要“打开宠物”、“关闭宠物”、“唤醒桌宠”等时候使用。
\`\`\`action
{
  "type": "toggle_pet",
  "params": {
    "action": "open" 或 "close"
  }
}
\`\`\`

c. 页面跳转（navigate）：
当用户想去某个页面或查看某个配置时。可用的页面 id 仅限于：
- "projects" (项目管理)
- "groups" (群聊协作)
- "tools" (工具配置)
- "pets" (宠物空间)
- "changes" (代码变更)
- "tasks" (任务派发)
- "cron" (定时任务)
- "terminal" (内置终端)
- "templates" (对话模板)
- "dashboard" (协作仪表盘)
- "metrics" (性能监控)
- "search" (对话搜索)
- "music" (音乐播放)
- "settings" (系统设置)
\`\`\`action
{
  "type": "navigate",
  "params": {
    "tab": "页面ID"
  }
}
\`\`\`

d0. 全局跨项目开发编排（orchestrate_development）：
当用户提交业务需求、需求文档，要求实现、开发、修改、修复或完成一个功能时，优先使用此动作。你必须结合项目列表、群聊成员关系和附件内容，选择一个或多个真实执行目标。群聊目标由群聊主 Agent继续拆分给项目 Agent；独立项目目标直接交给该项目 Agent。不要同时选择一个群聊和该群聊内项目来做同一份工作，除非用户明确要求。
\`\`\`action
{
  "type": "orchestrate_development",
  "params": {
    "title": "全局任务标题",
    "business_goal": "完整业务目标",
    "scope": "跨项目影响范围",
    "documents": "用户文档中的关键接口、字段、规则和约束",
    "acceptance": "全局验收标准",
    "execution_order": "parallel 或 sequential",
    "targets": [
      {
        "type": "group",
        "group_id": "真实群聊 ID",
        "task": "该群聊主 Agent负责的具体工作",
        "reason": "选择此群聊的原因"
      },
      {
        "type": "project",
        "project": "真实项目名称",
        "task": "该项目 Agent负责的具体工作",
        "reason": "选择此项目的原因"
      }
    ]
  }
}
\`\`\`

d. 创建/派发单群聊开发任务（create_task）：
当用户说“创建开发任务”、“派发任务”、“新建任务”时使用。你应从上下文提取关键字段，如果没有指定 group_id，可默认为 "gmps7ha15"。
\`\`\`action
{
  "type": "create_task",
  "params": {
    "title": "任务标题",
    "business_goal": "业务目标",
    "scope": "开发范围/涉及的修改内容",
    "acceptance": "验收标准",
    "group_id": "目标群聊 ID，必须从群聊列表中选择匹配的 ID"
  }
}
\`\`\`

e. 给指定项目发送指令（send_project_cmd）：
当用户说“帮我修改xxx项目”、“对xxx项目发送指令”、“让项目agent改一下xxx”时使用。
project 参数必须来自项目列表。
\`\`\`action
{
  "type": "send_project_cmd",
  "params": {
    "project": "项目名称（例如 smart-live-Cloud 或 smart-live-app）",
    "message": "用户要对该项目发送的具体修改指令"
  }
}
\`\`\`

f. 给项目组/群聊下单指令（send_group_cmd）：
当用户说“给某个项目组/群聊发指令说修改xxx bug”、“在群里下单xxx”等时使用。
groupId 参数必须来自现有群聊的 ID。
\`\`\`action
{
  "type": "send_group_cmd",
  "params": {
    "groupId": "群聊 ID (例如 gmps7ha15)",
    "message": "下单的具体指令或消息"
  }
}
\`\`\`

g. 创建定时任务（create_cron_task）：
当用户说“创建一个定时任务”、“新建定时任务”、“定时执行xxx”时使用。你应从上下文提取关键字段，并将时间周期翻译成标准的 5 位 Cron 表达式。
target_type 可以是 "group"（群聊）或 "project"（项目）。如果是群聊，必须从现有群聊列表中选择匹配的 group_id。如果是项目，必须从项目列表中选择匹配的 project 字段。
\`\`\`action
{
  "type": "create_cron_task",
  "params": {
    "name": "定时任务名称（如 每日代码检查提醒）",
    "schedule": "5位Cron表达式（如每天早上八点为 '0 8 * * *'）",
    "prompt": "定时任务执行时发送的提示词或消息内容",
    "target_type": "group" 或 "project",
    "group_id": "群聊 ID (当 target_type 为 group 时必填)",
    "project": "项目名称 (当 target_type 为 project 时必填)"
  }
}
\`\`\`

h. 创建项目（manage_project/create）：
当用户要“新建项目”、“添加项目”等且指定了名称和工作目录绝对路径时使用。属于 CCM 系统管理动作，必须走 manage_project 以获得参数校验、审计和回执。
\`\`\`action
{
  "type": "manage_project",
  "params": {
    "operation": "create",
    "name": "项目名称",
    "work_dir": "项目工作区绝对路径 (必须使用正斜杠/，不能使用反斜杠)",
    "agent": "claudecode"
  }
}
\`\`\`
i. 创建对话模板（create_template）：
当用户要“创建模板”、“新建对话模板”、“保存一个对话模板”等时使用。
\`\`\`action
{
  "type": "create_template",
  "params": {
    "name": "模板名称（如 Bug 修复模版）",
    "category": "分类名称 (只能在 'development', 'maintenance', 'review', 'collaboration', 'planning', 'custom' 中选择，默认 custom)",
    "content": "对话模板的具体内容/提示词"
  }
}
\`\`\`

j. 项目生命周期控制（manage_project/start/stop）：
当用户说“启动 xxx 项目”、“运行 xxx 项目”、“停止 xxx 项目”、“关闭 xxx 服务”等时使用。project 必须来自项目列表，必须走 manage_project 以获得参数校验、审计和回执。
\`\`\`action
{
  "type": "manage_project",
  "params": {
    "operation": "start 或 stop",
    "project": "项目名称",
    "agent": "可选 Agent 类型，默认 claudecode"
  }
}
\`\`\`
k. 代码变更智能审查（git_review）：
当用户要审查指定项目的 Git 代码变动，或者问“帮我看看xxx项目改了什么”时使用。project 必须来自项目列表。
\`\`\`action
{
  "type": "git_review",
  "params": {
    "project": "项目名称"
  }
}
\`\`\`

l. 代码提交（git_commit）：
当用户要将代码更改提交到 Git 仓库，或者说“自动提交xxx项目的代码”时使用。project 必须来自项目列表。
\`\`\`action
{
  "type": "git_commit",
  "params": {
    "project": "项目名称",
    "message": "提交注释（可选，若用户指定了则填入，未指定可为空让系统生成）",
    "files": ["指定提交的文件路径列表，若为空则提交所有修改（可选）"]
  }
}
\`\`\`

m. CCM 系统管理动作：
用户要求管理 CCM 自身时，必须使用下面的结构化动作；operation 必须使用列出的英文值，ID 和名称必须来自上面的真实资源清单。

- manage_cron：operation=list/create/update/enable/disable/run/delete；参数可包含 id、name、schedule、prompt、target_type、group_id、project。
- manage_group：operation=list/create/rename/add_member/remove_member/delete；参数可包含 id、name、project、members。
- manage_project：operation=list/create/update/start/stop/delete；参数可包含 project、name、work_dir、agent。
- manage_task：operation=list/pause/resume/continue/retry/queue/delete；参数可包含 id、message。
- manage_tool：operation=list/create/delete/reload/status；参数可包含 kind（mcp 或 skill）、name、command、args、env、description、content。
- system_status：operation=inspect。

示例：
\`\`\`action
{
  "type": "manage_cron",
  "params": {
    "operation": "disable",
    "id": "真实定时任务 ID"
  }
}
\`\`\`

删除项目、群聊、任务、定时任务、MCP 或 Skill 属于高风险动作。你仍然生成动作，但系统会在执行前要求用户确认。不要在参数中伪造 confirmed。

【关键规则】
1. 代码块标记必须用 \`\`\`action 开头，\`\`\` 结尾，各占独立一行。
2. 内部数据必须是合法的 JSON，不要胡乱捏造不存在的项目名称或群聊 ID。
3. 如果用户只是闲聊、提问、不涉及上述动作，千万不要输出 \`\`\`action 代码块。
4. 回复一律使用中文，语气专业而积极。`;
                // 4. 构建大模型消息历史
                const messages = [{ role: "system", content: systemPrompt }];
                for (const h of (history || []).slice(-10)) {
                    // 清洗掉历史中可能包含 of action 代码块，避免干扰大模型本次判断
                    const contentClean = (h.content || "").replace(/\`\`\`action[\s\S]*?\`\`\`/g, "").trim();
                    messages.push({ role: h.role === "user" ? "user" : "assistant", content: contentClean });
                }
                // 包装 user message 强化动作识别率
                const userPrompt = `【用户指令】\n${finalMessage}\n\n请针对上述用户指令进行意图识别。如果是业务需求、需求文档或开发修改要求，必须优先生成 orchestrate_development 动作并选择真实群聊/项目目标；如果包含其他明确的控制意图（包括 CCM 系统管理、播放音乐、控制宠物、页面跳转、创建任务、项目指令、群聊下单、定时任务、创建项目或创建模版），请务必在你的回复末尾附带 \`\`\`action 代码块（JSON格式），不能只返回欢迎词，必须立刻生成动作指令！`;
                messages.push({ role: "user", content: userPrompt });
                // 5. 调用大模型。明确控制意图在模型异常时回落到本地规则，避免基础控制能力被远端 API 状态拖垮。
                let parsedReply = "";
                try {
                    parsedReply = await callLlm(config, messages);
                }
                catch (llmErr) {
                    if (localIntent) {
                        return (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: `${localIntent.reply}

提示：统一大模型暂时调用失败（${llmErr.message || "未知错误"}），我已先按本地规则执行这个明确指令。`,
                            action: localIntent.action,
                            files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
                        });
                    }
                    throw llmErr;
                }
                // 6. 解析 action
                const actionMatch = parsedReply.match(/\`\`\`action([\s\S]*?)\`\`\`/);
                let action = null;
                let reply = parsedReply.replace(/\`\`\`action[\s\S]*?\`\`\`/g, "").trim();
                if (actionMatch) {
                    try {
                        action = JSON.parse(actionMatch[1].trim());
                    }
                    catch (e) {
                        console.error("解析全局助手 Action 失败:", e.message);
                    }
                }
                if (!action && localIntent) {
                    action = localIntent.action;
                    reply = reply ? `${reply}

${localIntent.reply}` : localIntent.reply;
                }
                try {
                    action = annotateGlobalAction(action);
                }
                catch (actionErr) {
                    if (localIntent) {
                        action = localIntent.action;
                        reply = reply ? `${reply}

${localIntent.reply}` : localIntent.reply;
                    }
                    else {
                        return (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: "我识别到了系统管理请求，但动作结构不合法：" + (actionErr.message || "未知错误") + "。请补充或改写操作目标后再执行。",
                            action: null,
                            files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
                        });
                    }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    reply,
                    action,
                    files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
                });
            }
            catch (err) {
                (0, utils_1.sendJson)(res, { error: err.message || "请求处理失败" }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效的 multipart 请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    let history = [];
                    try {
                        history = JSON.parse(fields.history || "[]");
                    }
                    catch (e) { }
                    handleChat(fields.message, history, files);
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
                const { message, history } = JSON.parse(body || "{}");
                await handleChat(message, history, []);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 7. 新增智能代码审查接口
    if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { project } = JSON.parse(body || "{}");
                if (!project)
                    return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                if (!workDir)
                    return (0, utils_1.sendJson)(res, { error: "项目工作区目录未配置" }, 400);
                // 执行 Git 命令获取变更状态和 diff
                let status = "";
                let diff = "";
                try {
                    status = (0, child_process_1.execFileSync)("git", ["status", "--porcelain"], { encoding: "utf-8", cwd: workDir });
                    diff = (0, child_process_1.execFileSync)("git", ["diff"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
                    // 如果工作区干净，尝试对比暂存区
                    if (!diff.trim()) {
                        diff = (0, child_process_1.execFileSync)("git", ["diff", "--staged"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
                    }
                }
                catch (gitErr) {
                    return (0, utils_1.sendJson)(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
                }
                if (!status.trim()) {
                    return (0, utils_1.sendJson)(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
                }
                // 限制 diff payload 的最大长度以防超限
                const maxDiffLength = 12000;
                let diffPayload = diff;
                if (diffPayload.length > maxDiffLength) {
                    diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
                }
                // 调用大模型进行代码审查
                const orchestratorConfig = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
                    return (0, utils_1.sendJson)(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
                }
                const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
请对以下项目「${project}」的本地 Git 代码变更进行智能审查。

【Git 状态详情】
${status}

【Git Diff 内容】
\`\`\`diff
${diffPayload}
\`\`\`

请用中文产出结构化、专业的审查报告，格式如下：
1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。

请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;
                const messages = [
                    { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
                    { role: "user", content: reviewPrompt }
                ];
                const reviewResult = await callLlm(orchestratorConfig, messages);
                (0, utils_1.sendJson)(res, { success: true, review: reviewResult });
            }
            catch (err) {
                (0, utils_1.sendJson)(res, { error: err.message || "代码审查执行出错" }, 500);
            }
        });
        return true;
    }
    return false;
}
async function callLlm(config, messages) {
    const isAnthropic = config.format === "anthropic-compatible" || (config.model && config.model.toLowerCase().includes("claude"));
    const endpoint = isAnthropic
        ? (config.apiUrl.endsWith("/v1/messages") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/v1/messages`)
        : (config.apiUrl.endsWith("/chat/completions") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/chat/completions`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 60000));
    try {
        const headers = {
            "Content-Type": "application/json",
        };
        let bodyObj = {};
        if (isAnthropic) {
            headers["x-api-key"] = config.apiKey;
            headers["anthropic-version"] = "2023-06-01";
            const system = messages.find(m => m.role === "system")?.content || "";
            const userMsgs = messages
                .filter(m => m.role !== "system")
                .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
            bodyObj = {
                model: config.model,
                max_tokens: 2000,
                temperature: 0.3,
                system,
                messages: userMsgs
            };
        }
        else {
            headers["Authorization"] = `Bearer ${config.apiKey}`;
            bodyObj = {
                model: config.model,
                temperature: 0.3,
                messages: messages
            };
        }
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyObj),
            signal: controller.signal
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`统一大模型 API 调用失败: HTTP ${response.status} - ${text.slice(0, 200)}`);
        }
        const data = JSON.parse(text);
        if (isAnthropic) {
            return (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("").trim();
        }
        else {
            return data?.choices?.[0]?.message?.content || "";
        }
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=global-agent.js.map