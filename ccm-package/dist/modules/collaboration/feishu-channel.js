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
exports.resolveFeishuDestination = resolveFeishuDestination;
exports.bindFeishuTaskContext = bindFeishuTaskContext;
exports.bindFeishuIdentifiersFromValue = bindFeishuIdentifiersFromValue;
exports.hasFeishuTaskBinding = hasFeishuTaskBinding;
exports.notifyFeishuTaskStage = notifyFeishuTaskStage;
exports.tickFeishuNotificationOutbox = tickFeishuNotificationOutbox;
exports.recordFeishuReportDelivery = recordFeishuReportDelivery;
exports.getFeishuChannelDeliverySnapshot = getFeishuChannelDeliverySnapshot;
exports.recordFeishuInbound = recordFeishuInbound;
exports.notifyFeishuTaskStatus = notifyFeishuTaskStatus;
exports.feishuRuntimeEventPresentation = feishuRuntimeEventPresentation;
exports.getFeishuChannelHealth = getFeishuChannelHealth;
exports.runFeishuChannelSelfTest = runFeishuChannelSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const feishu_1 = require("./feishu");
const STATE_FILE = path.join(utils_1.CCM_DIR, "feishu-channel-state.json");
const SESSION_DIR = path.join(utils_1.CCM_DIR, "sessions");
const CONTROL_BOT_PID_FILE = path.join(utils_1.CCM_DIR, "pids", "ccm-control-bot.pid");
const CONTROL_BOT_LOG_FILE = path.join(utils_1.CCM_DIR, "logs", "ccm-control-bot.log");
const DELIVERY_LOCK_DIR = path.join(utils_1.CCM_DIR, "feishu-channel-locks");
const DELIVERY_LOCK_STALE_MS = 2 * 60_000;
const MAX_BINDINGS = 500;
const MAX_DELIVERIES = 1600;
function emptyState() {
    return {
        schema: "ccm-feishu-channel-state-v1",
        bindings: [],
        deliveries: [],
        report_deliveries: [],
        inbound: { count: 0, last_at: "", last_message_id: "", last_session_id: "" },
        outbound: { sent: 0, failed: 0, last_success_at: "", last_failure_at: "", last_error: "" },
        updated_at: "",
    };
}
function loadState() {
    try {
        const value = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
        return {
            ...emptyState(),
            ...value,
            bindings: Array.isArray(value.bindings) ? value.bindings : [],
            deliveries: Array.isArray(value.deliveries) ? value.deliveries : [],
            report_deliveries: Array.isArray(value.report_deliveries) ? value.report_deliveries : [],
        };
    }
    catch {
        return emptyState();
    }
}
function saveState(state) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    const next = {
        ...state,
        bindings: (state.bindings || []).slice(-MAX_BINDINGS),
        deliveries: (state.deliveries || []).slice(-MAX_DELIVERIES),
        report_deliveries: (state.report_deliveries || []).slice(-240),
        updated_at: new Date().toISOString(),
    };
    const temp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(temp, STATE_FILE);
    return next;
}
function safeText(value, max = 1400) {
    const text = String(value || "")
        .replace(/CCM_AGENT_RECEIPT[\s\S]*?(?=\n\S|$)/gi, "[内部回执已收起]")
        .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
        .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
        .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
        .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
        .trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function parsePlatformSessionKey(value) {
    const text = String(value || "").trim();
    const match = text.match(/^feishu:([^:]+):([^:]+)$/i);
    if (!match)
        return null;
    const chatId = match[1];
    const openId = match[2];
    return { chat_id: chatId, open_id: openId, receive_id: chatId || openId, receive_id_type: chatId ? "chat_id" : "open_id", platform_session_key: text };
}
function directDestination(payload = {}) {
    const message = payload?.event?.message || payload?.message || {};
    const sender = payload?.event?.sender?.sender_id || payload?.sender || {};
    const chatId = String(message.chat_id || payload.chat_id || payload.chatId || "").trim();
    const openId = String(sender.open_id || payload.open_id || payload.openId || "").trim();
    if (!chatId && !openId)
        return null;
    return { chat_id: chatId, open_id: openId, receive_id: chatId || openId, receive_id_type: chatId ? "chat_id" : "open_id", platform_session_key: chatId && openId ? `feishu:${chatId}:${openId}` : "" };
}
function sessionFiles() {
    try {
        return fs.readdirSync(SESSION_DIR)
            .filter(name => /^ccm-control-bot_.+\.json$/i.test(name))
            .map(name => ({ file: path.join(SESSION_DIR, name), mtime: fs.statSync(path.join(SESSION_DIR, name)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, 20);
    }
    catch {
        return [];
    }
}
function resolveFeishuDestination(payload = {}, sessionId = "") {
    const direct = directDestination(payload);
    if (direct)
        return direct;
    const requested = String(sessionId || payload.sessionId || payload.session_id || "").trim();
    const parsedRequested = parsePlatformSessionKey(requested);
    if (parsedRequested)
        return parsedRequested;
    if (!requested)
        return null;
    for (const entry of sessionFiles()) {
        try {
            const store = JSON.parse(fs.readFileSync(entry.file, "utf-8"));
            const sessions = store.sessions || {};
            const matchedLocalIds = Object.values(sessions)
                .filter((row) => row?.agent_session_id === requested || (row?.past_agent_session_ids || []).includes(requested) || row?.id === requested)
                .map((row) => String(row.id || ""));
            for (const [platformKey, localId] of Object.entries(store.active_session || {})) {
                if (matchedLocalIds.includes(String(localId))) {
                    const destination = parsePlatformSessionKey(platformKey);
                    if (destination)
                        return destination;
                }
            }
            for (const [platformKey, localIds] of Object.entries(store.user_sessions || {})) {
                if ((Array.isArray(localIds) ? localIds : []).some(value => matchedLocalIds.includes(String(value)))) {
                    const destination = parsePlatformSessionKey(platformKey);
                    if (destination)
                        return destination;
                }
            }
        }
        catch { }
    }
    return null;
}
function uniqueStrings(values) {
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 100);
}
function bindFeishuTaskContext(input) {
    const destination = input.destination || resolveFeishuDestination({}, input.sessionId || "");
    if (!destination?.receive_id)
        return null;
    const state = loadState();
    const now = new Date().toISOString();
    const existing = state.bindings.find((row) => row.platform_session_key === destination.platform_session_key || (row.chat_id === destination.chat_id && row.open_id === destination.open_id));
    const binding = {
        id: existing?.id || `fsb_${crypto.randomBytes(8).toString("hex")}`,
        session_ids: uniqueStrings([...(existing?.session_ids || []), input.sessionId]),
        run_ids: uniqueStrings([...(existing?.run_ids || []), ...(input.runIds || [])]),
        mission_ids: uniqueStrings([...(existing?.mission_ids || []), ...(input.missionIds || [])]),
        task_ids: uniqueStrings([...(existing?.task_ids || []), ...(input.taskIds || [])]),
        chat_id: destination.chat_id,
        open_id: destination.open_id,
        receive_id: destination.receive_id,
        receive_id_type: destination.receive_id_type,
        platform_session_key: destination.platform_session_key,
        source: input.source || existing?.source || "feishu-control-bot",
        created_at: existing?.created_at || now,
        updated_at: now,
    };
    state.bindings = [...state.bindings.filter((row) => row.id !== binding.id), binding];
    saveState(state);
    return binding;
}
function identifiersFromValue(value, depth = 0, result = { runIds: [], missionIds: [], taskIds: [] }) {
    if (!value || depth > 5)
        return result;
    if (Array.isArray(value)) {
        for (const item of value.slice(0, 100))
            identifiersFromValue(item, depth + 1, result);
        return result;
    }
    if (typeof value !== "object")
        return result;
    for (const [key, item] of Object.entries(value)) {
        if (/^(?:global_?)?run_?id$/i.test(key))
            result.runIds.push(item);
        else if (/mission_?id$/i.test(key))
            result.missionIds.push(item);
        else if (/task_?id$/i.test(key) || key === "id" && /task/i.test(String(value.schema || "")))
            result.taskIds.push(item);
        if (typeof item === "object")
            identifiersFromValue(item, depth + 1, result);
    }
    return result;
}
function bindFeishuIdentifiersFromValue(sessionId, value, destination) {
    const ids = identifiersFromValue(value);
    return bindFeishuTaskContext({ sessionId, destination, runIds: ids.runIds, missionIds: ids.missionIds, taskIds: ids.taskIds });
}
function findBinding(input) {
    const state = loadState();
    const runId = String(input.runId || input.run_id || "");
    const missionId = String(input.missionId || input.mission_id || "");
    const taskId = String(input.taskId || input.task_id || "");
    const sessionId = String(input.sessionId || input.session_id || "");
    return [...state.bindings].reverse().find((row) => (runId && row.run_ids?.includes(runId)) ||
        (missionId && row.mission_ids?.includes(missionId)) ||
        (taskId && row.task_ids?.includes(taskId)) ||
        (sessionId && row.session_ids?.includes(sessionId))) || null;
}
function hasFeishuTaskBinding(input) {
    return !!findBinding(input || {});
}
function retryAt(attempts) {
    return new Date(Date.now() + Math.min(30, Math.max(1, 2 ** Math.max(0, attempts - 1))) * 60_000).toISOString();
}
function acquireDeliveryLease(deliveryId) {
    fs.mkdirSync(DELIVERY_LOCK_DIR, { recursive: true });
    const safeId = String(deliveryId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const lockFile = path.join(DELIVERY_LOCK_DIR, `${safeId}.lock`);
    const create = () => {
        const fd = fs.openSync(lockFile, "wx");
        try {
            fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, acquired_at: new Date().toISOString() }));
        }
        finally {
            fs.closeSync(fd);
        }
        return () => { try {
            fs.unlinkSync(lockFile);
        }
        catch { } };
    };
    try {
        return create();
    }
    catch (error) {
        if (error?.code !== "EEXIST")
            throw error;
        try {
            if (Date.now() - fs.statSync(lockFile).mtimeMs <= DELIVERY_LOCK_STALE_MS)
                return null;
            fs.unlinkSync(lockFile);
            return create();
        }
        catch (retryError) {
            if (retryError?.code === "EEXIST" || retryError?.code === "ENOENT")
                return null;
            throw retryError;
        }
    }
}
async function attemptDelivery(deliveryId) {
    const releaseLease = acquireDeliveryLease(deliveryId);
    if (!releaseLease)
        return loadState().deliveries.find((row) => row.id === deliveryId) || null;
    try {
        let state = loadState();
        const delivery = state.deliveries.find((row) => row.id === deliveryId);
        if (!delivery || delivery.status === "sent")
            return delivery || null;
        const binding = state.bindings.find((row) => row.id === delivery.binding_id);
        if (!binding?.receive_id) {
            delivery.status = "failed";
            delivery.error = "飞书原会话绑定不存在";
            delivery.attempts = Number(delivery.attempts || 0) + 1;
            delivery.next_attempt_at = retryAt(delivery.attempts);
            saveState(state);
            return delivery;
        }
        const result = await (0, feishu_1.sendFeishuMessageToTarget)({ receiveId: binding.receive_id, receiveIdType: binding.receive_id_type, title: delivery.title, markdown: delivery.markdown });
        state = loadState();
        const current = state.deliveries.find((row) => row.id === deliveryId);
        if (!current)
            return null;
        current.attempts = Number(current.attempts || 0) + 1;
        current.last_attempt_at = new Date().toISOString();
        current.status = result.success ? "sent" : "failed";
        current.sent_at = result.success ? current.last_attempt_at : "";
        current.message_id = result.message_id || "";
        current.error = result.success ? "" : safeText(result.error || "发送失败", 300);
        current.next_attempt_at = result.success || current.attempts >= 5 ? "" : retryAt(current.attempts);
        state.outbound = {
            ...(state.outbound || {}),
            sent: Number(state.outbound?.sent || 0) + (result.success ? 1 : 0),
            failed: Number(state.outbound?.failed || 0) + (result.success ? 0 : 1),
            last_success_at: result.success ? current.last_attempt_at : state.outbound?.last_success_at || "",
            last_failure_at: result.success ? state.outbound?.last_failure_at || "" : current.last_attempt_at,
            last_error: result.success ? "" : current.error,
        };
        saveState(state);
        return current;
    }
    finally {
        releaseLease();
    }
}
async function notifyFeishuTaskStage(input) {
    const binding = findBinding(input);
    if (!binding)
        return { success: false, queued: false, reason: "no_binding" };
    const state = loadState();
    const dedupeKey = String(input.dedupeKey || `${input.stage}:${input.runId || input.missionId || input.taskId || input.sessionId}:${safeText(input.markdown, 180)}`);
    const existing = state.deliveries.find((row) => row.dedupe_key === dedupeKey);
    if (existing)
        return { success: existing.status === "sent", queued: existing.status !== "sent", duplicate: true, delivery: existing };
    const now = new Date().toISOString();
    const delivery = {
        id: `fsd_${crypto.randomBytes(8).toString("hex")}`,
        binding_id: binding.id,
        dedupe_key: dedupeKey,
        stage: safeText(input.stage, 60),
        title: safeText(input.title, 80),
        markdown: safeText(input.markdown, 10000),
        run_id: input.runId || "",
        mission_id: input.missionId || "",
        task_id: input.taskId || "",
        status: "pending",
        attempts: 0,
        created_at: now,
        last_attempt_at: "",
        next_attempt_at: now,
        sent_at: "",
        message_id: "",
        error: "",
    };
    state.deliveries.push(delivery);
    saveState(state);
    const attempted = await attemptDelivery(delivery.id);
    return { success: attempted?.status === "sent", queued: attempted?.status !== "sent" && Number(attempted?.attempts || 0) < 5, delivery: attempted };
}
async function tickFeishuNotificationOutbox(now = new Date()) {
    const state = loadState();
    const due = state.deliveries.filter((row) => row.status !== "sent" && Number(row.attempts || 0) < 5 && Date.parse(row.next_attempt_at || row.created_at || "") <= now.getTime()).slice(0, 10);
    const results = [];
    for (const row of due)
        results.push(await attemptDelivery(row.id));
    return { due: due.length, sent: results.filter((row) => row?.status === "sent").length, failed: results.filter((row) => row?.status === "failed").length };
}
function recordFeishuReportDelivery(input) {
    const state = loadState();
    const row = {
        id: `fsr_${crypto.randomBytes(8).toString("hex")}`,
        kind: input.kind,
        report_id: safeText(input.reportId, 120),
        attempted_at: input.attemptedAt || new Date().toISOString(),
        success: input.success === true,
        message_id: safeText(input.messageId || "", 160),
        error: input.success ? "" : safeText(input.error || "发送失败", 300),
        target_type: safeText(input.targetType || "webhook", 40),
    };
    state.report_deliveries.push(row);
    saveState(state);
    return row;
}
function getFeishuChannelDeliverySnapshot(limit = 50) {
    const state = loadState();
    const bounded = Math.max(1, Math.min(200, Number(limit) || 50));
    return {
        deliveries: state.deliveries.slice(-bounded).reverse().map((row) => ({
            id: row.id,
            stage: row.stage,
            title: row.title,
            status: row.status,
            attempts: Number(row.attempts || 0),
            created_at: row.created_at,
            last_attempt_at: row.last_attempt_at,
            next_attempt_at: row.next_attempt_at,
            sent_at: row.sent_at,
            message_id: row.message_id || "",
            error: row.error || "",
            run_id: row.run_id || "",
            mission_id: row.mission_id || "",
            task_id: row.task_id || "",
        })),
        reports: state.report_deliveries.slice(-bounded).reverse(),
    };
}
function recordFeishuInbound(input) {
    const destination = resolveFeishuDestination(input.payload || {}, input.sessionId || "");
    const state = loadState();
    state.inbound = {
        count: Number(state.inbound?.count || 0) + 1,
        last_at: new Date().toISOString(),
        last_message_id: safeText(input.messageId || "", 120),
        last_session_id: safeText(input.sessionId || "", 160),
    };
    saveState(state);
    if (destination)
        bindFeishuTaskContext({ sessionId: input.sessionId, destination, source: "feishu-control-bot" });
    return destination;
}
function taskStatusPresentation(status) {
    const value = String(status || "").toLowerCase();
    if (value === "in_progress")
        return { stage: "execution", title: "任务开始执行", label: "已开始协调项目执行成员" };
    if (["waiting", "blocked"].includes(value))
        return { stage: "review", title: "任务需要继续处理", label: "验收发现缺口，正在等待补充或返工" };
    if (value === "done")
        return { stage: "completion", title: "任务已经完成", label: "任务已通过验收并完成交付" };
    if (value === "failed")
        return { stage: "failure", title: "任务执行遇到问题", label: "任务未完成，已记录失败原因" };
    if (value === "cancelled")
        return { stage: "cancelled", title: "任务已取消", label: "任务已停止执行" };
    if (value === "cancelling")
        return { stage: "cancelled", title: "正在停止任务", label: "取消请求已发送，正在停止执行" };
    return null;
}
async function notifyFeishuTaskStatus(task, status, result = "") {
    const presentation = taskStatusPresentation(status);
    if (!presentation || !task?.id)
        return { success: false, queued: false, reason: "unsupported_status" };
    const detail = safeText(result || task.status_detail || task.delivery_summary?.headline || presentation.label, 1000);
    return notifyFeishuTaskStage({
        stage: presentation.stage,
        title: presentation.title,
        markdown: `**${safeText(task.title || "未命名任务", 180)}**\n\n${presentation.label}${detail ? `\n\n${detail}` : ""}`,
        taskId: String(task.id),
        missionId: String(task.parent_task_id || task.root_task_id || ""),
        dedupeKey: `task-status:${task.id}:${status}:${safeText(detail, 120)}`,
    });
}
function feishuRuntimeEventPresentation(event) {
    const type = String(event?.type || "");
    const tool = String(event?.tool || event?.name || "");
    if (type === "plan_mode_ready") {
        const plan = event.plan_mode || event.planMode || {};
        return {
            stage: "plan",
            title: safeText(plan.title || "执行计划已经整理", 80),
            markdown: safeText(plan.next_step || plan.risk?.summary || event.message || "我已整理执行步骤，接下来会按计划派发、跟踪和验收。"),
        };
    }
    if (type === "dispatch_launch_summary") {
        const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {};
        return {
            stage: "dispatch",
            title: safeText(summary.title || "任务已经派发", 80),
            markdown: safeText(summary.headline || summary.detail || event.message || "任务已经进入协作执行链，我会继续跟踪结果。"),
        };
    }
    if (type === "tool_started" && /create|dispatch|orchestrat/i.test(tool))
        return { stage: "dispatch", title: "正在安排任务", markdown: "我正在确认执行范围并把工作交给合适的协作群或项目执行成员。" };
    if (type === "tool_completed" && /create|dispatch|orchestrat/i.test(tool))
        return { stage: "dispatch", title: "任务已经派发", markdown: "任务已进入执行链，我会继续跟踪项目结果和验收情况。" };
    if (type === "test_agent_execution_plan_ready")
        return { stage: "test", title: "独立测试已经安排", markdown: safeText(event.detail || event.test_agent_execution_plan_summary || "TestAgent 已准备独立验证范围和步骤。") };
    if (type === "test_agent_review_ready")
        return { stage: "test", title: "TestAgent 完成验证", markdown: safeText(event.detail || event.test_agent_review_summary?.headline || "独立验证结果已经返回，主 Agent 正在进行最终验收。") };
    return null;
}
function processAlive(pid) {
    if (!pid)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function controlBotSocketSnapshot() {
    let pid = 0;
    try {
        pid = Number(fs.readFileSync(CONTROL_BOT_PID_FILE, "utf-8").trim());
    }
    catch { }
    let log = "";
    try {
        const stat = fs.statSync(CONTROL_BOT_LOG_FILE);
        const start = Math.max(0, stat.size - 300_000);
        const fd = fs.openSync(CONTROL_BOT_LOG_FILE, "r");
        const buffer = Buffer.alloc(stat.size - start);
        fs.readSync(fd, buffer, 0, buffer.length, start);
        fs.closeSync(fd);
        log = buffer.toString("utf-8");
    }
    catch { }
    const connected = [...log.matchAll(/^(.*)\[(?:Info|INFO)\].*connected to wss:\/\/msg-frontier\.feishu\.cn.*$/gmi)].at(-1)?.[1]?.trim() || "";
    const disconnected = [...log.matchAll(/^(.*)\[(?:Info|INFO)\].*disconnected to wss:\/\/msg-frontier\.feishu\.cn.*$/gmi)].at(-1)?.[1]?.trim() || "";
    const socketConnected = !!connected && (!disconnected || connected > disconnected);
    return { pid, process_alive: processAlive(pid), socket_connected: socketConnected, last_connected_at: connected, last_disconnected_at: disconnected };
}
function getFeishuChannelHealth() {
    const config = (0, db_1.loadFeishuConfig)();
    const reports = (0, db_1.loadAutoDevNotifyConfig)();
    const state = loadState();
    const socket = controlBotSocketSnapshot();
    const ready = config.control_bot_enabled === true && !!(config.control_bot_app_id || config.app_id) && !!(config.control_bot_app_secret || config.app_secret);
    return {
        schema: "ccm-feishu-channel-health-v1",
        healthy: ready && socket.process_alive && socket.socket_connected,
        checked_at: new Date().toISOString(),
        control_bot_ready: ready,
        webhook_ready: !!config.webhook_url,
        ...socket,
        inbound: state.inbound,
        outbound: state.outbound,
        outbox: {
            pending: state.deliveries.filter((row) => row.status !== "sent" && Number(row.attempts || 0) < 5).length,
            exhausted: state.deliveries.filter((row) => row.status !== "sent" && Number(row.attempts || 0) >= 5).length,
            sent: state.deliveries.filter((row) => row.status === "sent").length,
        },
        reports: { daily_enabled: reports.daily_enabled === true, weekly_enabled: reports.weekly_enabled === true },
        report_deliveries: {
            sent: state.report_deliveries.filter((row) => row.success === true).length,
            failed: state.report_deliveries.filter((row) => row.success !== true).length,
            last: state.report_deliveries.at(-1) || null,
        },
    };
}
function runFeishuChannelSelfTest() {
    const parsed = parsePlatformSessionKey("feishu:oc_chat:ou_user");
    const direct = resolveFeishuDestination({ event: { message: { chat_id: "oc_direct" }, sender: { sender_id: { open_id: "ou_direct" } } } });
    const status = taskStatusPresentation("in_progress");
    const testEvent = feishuRuntimeEventPresentation({ type: "test_agent_review_ready", detail: "复验通过" });
    const planEvent = feishuRuntimeEventPresentation({ type: "plan_mode_ready", plan_mode: { title: "登录修复计划", next_step: "先派发实现，再运行独立复核。" } });
    const leaseId = `selftest_${process.pid}_${Date.now()}`;
    const firstLease = acquireDeliveryLease(leaseId);
    const competingLease = acquireDeliveryLease(leaseId);
    firstLease?.();
    const reacquiredLease = acquireDeliveryLease(leaseId);
    reacquiredLease?.();
    const checks = {
        platform_session_parsed: parsed?.chat_id === "oc_chat" && parsed.open_id === "ou_user",
        direct_event_targeted: direct?.receive_id === "oc_direct" && direct.receive_id_type === "chat_id",
        progress_status_supported: status?.stage === "execution",
        test_agent_event_supported: testEvent?.stage === "test" && /复验通过/.test(testEvent.markdown),
        plan_event_supported: planEvent?.stage === "plan" && /先派发实现/.test(planEvent.markdown),
        cross_process_delivery_lease: !!firstLease && competingLease === null && !!reacquiredLease,
        secrets_redacted: safeText("api_key=secret-value").includes("[已隐藏]"),
    };
    return { schema: "ccm-feishu-channel-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=feishu-channel.js.map