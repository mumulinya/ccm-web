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
exports.runGlobalAgentHistorySyncSelfTest = runGlobalAgentHistorySyncSelfTest;
exports.runGlobalAgentIntentSelfTest = runGlobalAgentIntentSelfTest;
exports.resumeGlobalAgentLoopsForServer = resumeGlobalAgentLoopsForServer;
exports.startGlobalMissionSupervisionForServer = startGlobalMissionSupervisionForServer;
exports.bootstrapGlobalAgentMemoryForServer = bootstrapGlobalAgentMemoryForServer;
exports.stopGlobalMissionSupervisionForServer = stopGlobalMissionSupervisionForServer;
exports.handleGlobalAgentApi = handleGlobalAgentApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const rag_1 = require("../knowledge/rag");
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const db_1 = require("../../core/db");
const collaboration_1 = require("../collaboration/collaboration");
const display_1 = require("../collaboration/display");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const memory_1 = require("../../projects/memory");
const worker_handoff_1 = require("../../agents/worker-handoff");
const memory_2 = require("../collaboration/memory");
const loop_1 = require("../../agents/global/loop");
const mission_supervisor_1 = require("../../agents/global/mission-supervisor");
const memory_3 = require("../../agents/global/memory");
const quality_center_1 = require("../../agents/quality-center");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const runtime_1 = require("../../agents/global/runtime");
const control_center_1 = require("../../agents/global/control-center");
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(utils_1.CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
const GLOBAL_PET_AGENT_NAME = "global-agent";
function compactPetText(value, max = 260) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function globalVisibleText(value, fallback = "全局主 Agent 正在处理当前请求。", max = 260) {
    return (0, display_1.sanitizeMainAgentUserText)(value, fallback, max);
}
function getGlobalPetToolState(toolName) {
    const name = String(toolName || "").toLowerCase();
    if (!name)
        return "working";
    if (/(inspect|list|query|search|recall|memory|read|status|diagnostic|probe)/.test(name))
        return "carrying";
    if (/(review|verify|check|quality|git_review|diff|receipt|acceptance)/.test(name))
        return "reviewing";
    if (/(recover|retry|repair|rollback|fix|debug|failure|watchdog)/.test(name))
        return "debugging";
    if (/(orchestrate|create|send|dispatch|run|execute|task|mission|project|group|agent|cmd|write|manage|commit|merge|build)/.test(name))
        return "building";
    return "working";
}
function getGlobalToolDisplayName(toolName) {
    const labels = {
        inspect_system: "读取系统状态",
        list_projects: "读取项目列表",
        inspect_project: "读取项目上下文",
        list_groups: "读取群聊列表",
        list_tasks: "读取任务列表",
        list_cron: "读取定时任务",
        query_knowledge: "查询知识库",
        query_global_memory: "查询全局记忆",
        query_group_memory: "查询群聊记忆",
        manage_global_memory: "管理全局记忆",
        inspect_mission: "查询全局任务",
        inspect_supervision: "查询监工状态",
        orchestrate_development: "创建跨项目开发任务",
        manage_supervision: "管理异步监工",
        create_task: "创建开发任务",
        send_project_cmd: "发送项目 Agent 指令",
        send_group_cmd: "发送群聊主 Agent 指令",
        manage_cron: "管理定时任务",
        manage_group: "管理群聊",
        manage_project: "管理项目",
        manage_task: "管理任务",
        manage_tool: "管理工具",
        git_review: "审查代码变更",
        git_commit: "提交代码",
        create_template: "创建模板",
        play_music: "播放音乐",
        toggle_pet: "控制桌面宠物",
        navigate: "切换页面",
    };
    const key = String(toolName || "").trim();
    return labels[key] || key || "工具操作";
}
function buildGlobalAgentEventUi(event = {}) {
    const type = String(event.type || "");
    const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
    const toolLabel = getGlobalToolDisplayName(toolName);
    const text = (value, max = 220, fallback = "状态已更新。") => globalVisibleText(value, fallback, max);
    const dispatchSummary = event.dispatch_launch_summary || event.dispatchLaunchSummary || null;
    const clarificationSummary = event.clarification_summary || event.clarificationSummary || null;
    const confirmationSummary = event.confirmation_summary || event.confirmationSummary || null;
    const dispatchSummaryText = () => {
        const rows = Array.isArray(dispatchSummary?.rows) ? dispatchSummary.rows : [];
        const targets = rows
            .map((row) => [row.role || "执行 Agent", row.agent].filter(Boolean).join(" · "))
            .filter(Boolean)
            .slice(0, 4)
            .join("、");
        const parts = [
            dispatchSummary?.headline || (targets ? `全局主 Agent 已把这次需求交给：${targets}。` : ""),
            dispatchSummary?.next_action ? `下一步：${dispatchSummary.next_action}` : "",
        ].filter(Boolean).join(" ");
        return text(parts, 280, "已完成派发，正在等待下游 Agent 更新结果。");
    };
    const withCheckpoint = (ui) => ({
        ...ui,
        checkpoint: {
            schema: "ccm-main-agent-live-checkpoint-v1",
            id: event.id || `${type || "event"}:${event.run_id || event.trace_id || Date.now()}`,
            label: ui.title,
            detail: ui.text,
            status: ui.tone === "ok" ? "done" : ui.tone === "error" ? "failed" : ui.tone === "waiting" ? "warning" : "active",
            phase: ui.phase || "",
            at: event.at || new Date().toISOString(),
            run_id: event.run_id || "",
            source: "global-agent-stream",
        },
    });
    if (event.progress_checkpoint?.label || event.progressCheckpoint?.label) {
        const checkpoint = event.progress_checkpoint || event.progressCheckpoint;
        return withCheckpoint({
            phase: checkpoint.phase || "planning",
            tone: checkpoint.status === "done" ? "ok" : checkpoint.status === "failed" ? "error" : checkpoint.status === "warning" ? "waiting" : "running",
            title: checkpoint.label,
            text: text(checkpoint.detail || ""),
        });
    }
    if (type === "started")
        return withCheckpoint({ phase: "understanding", tone: "running", title: "理解需求", text: "正在理解你的消息，判断是普通对话还是需要执行操作。" });
    if (type === "plan_mode_ready") {
        const planMode = event.plan_mode || event.planMode || {};
        return withCheckpoint({
            phase: "planning",
            tone: "running",
            title: planMode.title || "执行前计划已整理",
            text: text(planMode.next_step || planMode.risk?.summary || event.message || "主 Agent 已整理计划，会继续执行并在完成后总结。", 280, "主 Agent 已整理计划，会继续执行并在完成后总结。"),
        });
    }
    if (type === "decision") {
        const state = String(event.step?.state || "");
        const message = text(event.step?.message || event.step?.decision?.intent?.reason || "");
        if (toolName)
            return withCheckpoint({ phase: "planning", tone: "running", title: "形成行动计划", text: message || `准备执行：${toolLabel}` });
        if (state === "answer" || state === "complete")
            return withCheckpoint({ phase: "answering", tone: "running", title: "组织回复", text: message || "已经形成回答，正在整理给你。" });
        if (state === "needs_confirmation")
            return withCheckpoint({ phase: "waiting", tone: "waiting", title: "需要确认", text: message || "需要你确认目标或授权范围。" });
        return withCheckpoint({ phase: "planning", tone: "running", title: "规划下一步", text: message || "正在规划下一步。" });
    }
    if (type === "tool_started")
        return withCheckpoint({ phase: "executing", tone: "running", title: "执行工具", text: `正在${toolLabel}。` });
    if (type === "dispatch_launch_summary")
        return withCheckpoint({ phase: "dispatching", tone: "ok", title: dispatchSummary?.title || "已派发的工作", text: dispatchSummaryText() });
    if (type === "tool_completed")
        return withCheckpoint({ phase: "reviewing", tone: "ok", title: "工具完成", text: `${toolLabel}已完成，正在检查结果。` });
    if (type === "tool_failed" || type === "tool_validation_failed")
        return withCheckpoint({ phase: "debugging", tone: "error", title: "执行遇到问题", text: text(event.reply || event.step?.message, 220, `${toolLabel}执行遇到问题，主 Agent 正在重新判断下一步。`) });
    if (type === "clarification_required")
        return withCheckpoint({ phase: "waiting", tone: "waiting", title: clarificationSummary?.title || "需要补充信息", text: text(clarificationSummary?.question || clarificationSummary?.headline || event.reply || "需要你补充目标、范围或验收标准。") });
    if (type === "confirmation_required")
        return withCheckpoint({ phase: "waiting", tone: "waiting", title: confirmationSummary?.title || "等待授权确认", text: text(confirmationSummary?.headline || confirmationSummary?.question || event.reply || "这个操作需要你确认后才会继续。") });
    if (type === "paused")
        return withCheckpoint({ phase: "paused", tone: "waiting", title: "已暂停", text: text(event.reply || "全局 Agent 已暂停。") });
    if (type === "supervising")
        return withCheckpoint({ phase: "supervising", tone: "running", title: "监工中", text: text(event.reply || "已经创建长期任务，正在监督群聊/项目 Agent 交付。") });
    if (type === "completed")
        return withCheckpoint({ phase: "completed", tone: "ok", title: "完成", text: text(event.reply || "本轮处理完成。") });
    if (type === "failed")
        return withCheckpoint({ phase: "failed", tone: "error", title: "失败", text: text(event.reply, 220, "任务没有完成，主 Agent 已整理未完成原因和下一步。") });
    if (type === "cancelled")
        return withCheckpoint({ phase: "cancelled", tone: "waiting", title: "已取消", text: text(event.reply || "本轮处理已取消。") });
    return null;
}
function relayGlobalPetEvent(ctx, event = {}, options = {}) {
    const type = String(event.type || "");
    const run = options.finalRun || event.run || {};
    const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
    const speech = (role, text, final = false) => ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role, text: compactPetText(text), final, source: "global" });
    if (type === "started") {
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在理解你的需求...", { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", "我正在理解你的需求...", false);
        return;
    }
    if (type === "decision") {
        const message = event.step?.message || event.step?.tool?.name || "正在规划下一步";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, toolName ? "planning" : "thinking", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_started") {
        const message = toolName ? `正在执行：${getGlobalToolDisplayName(toolName)}` : "正在执行工具操作...";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, getGlobalPetToolState(toolName), message, { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_completed") {
        const message = toolName ? `完成工具：${getGlobalToolDisplayName(toolName)}` : "工具执行完成";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "reviewing", message, { tab: "global-agent" }, 45 * 1000);
        speech("assistant", message, false);
        return;
    }
    if (type === "dispatch_launch_summary") {
        const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {};
        const message = globalVisibleText(summary.headline || summary.next_action, "已完成派发，正在等待下游 Agent 更新结果。", 180);
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_failed" || type === "tool_validation_failed") {
        const message = globalVisibleText(event.reply || event.step?.message, "工具执行遇到问题，主 Agent 正在重新判断下一步。", 180);
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "debugging", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("error", message, true);
        return;
    }
    if (type === "clarification_required" || type === "confirmation_required" || type === "paused") {
        const summary = event.clarification_summary || event.clarificationSummary || event.confirmation_summary || event.confirmationSummary || null;
        const message = summary?.question || summary?.headline || event.reply || "全局 Agent 需要你确认后继续";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "waiting", compactPetText(message), { tab: "global-agent" }, 5 * 60 * 1000);
        speech("status", message, true);
        return;
    }
    if (type === "supervising") {
        const message = event.reply || "全局 Agent 正在监督协作任务";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "completed" || options.finalRun) {
        const finalReply = options.finalRun?.final_reply || run.final_reply || event.reply || "全局 Agent 已完成本轮处理";
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "happy", compactPetText(finalReply, 120), { tab: "global-agent" }, 90 * 1000);
        speech("assistant", finalReply, true);
        return;
    }
    if (type === "failed" || type === "cancelled" || options.error) {
        const message = globalVisibleText(options.finalRun?.final_reply || run.final_reply || event.reply, type === "cancelled" ? "任务已取消，当前状态已整理。" : "任务没有完成，主 Agent 已整理未完成原因和下一步。", 180);
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "error", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("error", message, true);
    }
}
function writeGlobalJsonAtomic(file, value) {
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
const GLOBAL_AGENT_HISTORY_METADATA_KEYS = [
    "type",
    "source",
    "files",
    "agenticRun",
    "agentic_run",
    "globalMission",
    "global_mission",
    "globalMissionChildren",
    "global_mission_children",
    "globalMissionSupervisor",
    "global_mission_supervisor",
    "progressCheckpoints",
    "progress_checkpoints",
    "final_delivery_report",
    "finalDeliveryReport",
    "delivery_report",
    "deliveryReport",
    "display_stream",
    "displayStream",
    "workchain",
    "technical",
    "trace_id",
    "mission_id",
    "run_id",
    "finalNotified",
];
function truncateGlobalHistoryValue(value, maxChars = 80_000) {
    if (value === undefined)
        return undefined;
    if (typeof value === "string")
        return value.length > maxChars ? value.slice(0, maxChars) : value;
    if (typeof value === "number" || typeof value === "boolean" || value === null)
        return value;
    try {
        const json = JSON.stringify(value);
        if (json.length <= maxChars)
            return value;
        return { truncated: true, preview: json.slice(0, maxChars), original_chars: json.length };
    }
    catch {
        return null;
    }
}
function pickGlobalAgentHistoryMetadata(message) {
    const metadata = {};
    for (const key of GLOBAL_AGENT_HISTORY_METADATA_KEYS) {
        if (message?.[key] !== undefined) {
            const value = truncateGlobalHistoryValue(message[key]);
            if (value !== undefined)
                metadata[key] = value;
        }
    }
    return metadata;
}
function normalizeGlobalAgentMessage(item) {
    if (!item || !["user", "assistant"].includes(String(item.role || "")) || !String(item.content || "").trim())
        return null;
    return {
        ...pickGlobalAgentHistoryMetadata(item),
        role: String(item.role),
        content: String(item.content || "").slice(0, 8000),
        timestamp: item.timestamp || new Date().toISOString(),
    };
}
function normalizeGlobalAgentMessages(messages = []) {
    return messages
        .map((item) => normalizeGlobalAgentMessage(item))
        .filter(Boolean)
        .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}
function globalAgentHistoryMessageKey(message) {
    return [
        String(message?.role || ""),
        String(message?.timestamp || ""),
        String(message?.content || ""),
    ].join("\u0001");
}
function mergeGlobalAgentMessages(existing = [], incoming = []) {
    const seen = new Set();
    const byKey = new Map();
    const candidates = [...(existing || []), ...(incoming || [])]
        .map((item) => normalizeGlobalAgentMessage(item))
        .filter(Boolean);
    for (const message of candidates) {
        const key = globalAgentHistoryMessageKey(message);
        const previous = byKey.get(key);
        byKey.set(key, previous ? { ...previous, ...pickGlobalAgentHistoryMetadata(message), role: previous.role, content: previous.content, timestamp: previous.timestamp } : message);
    }
    const merged = [];
    for (const message of byKey.values()) {
        const key = globalAgentHistoryMessageKey(message);
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(message);
    }
    return merged
        .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
        .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}
function runGlobalAgentHistorySyncSelfTest() {
    const timestamp = "2026-07-07T10:00:00.000Z";
    const completedRun = {
        id: "run-history-sync",
        status: "completed",
        final_reply: "登录修复已完成。",
        final_delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            headline: "登录修复已完成。",
            status: "done",
            files: ["src/Login.vue"],
            verification: ["npm test"],
        },
        display_stream: {
            schema: "ccm-streamlined-display-v2",
            delivery_report: {
                schema: "ccm-main-agent-delivery-report-v1",
                headline: "登录修复已完成。",
            },
        },
    };
    const normalized = normalizeGlobalAgentMessages([{
            role: "assistant",
            content: "登录修复已完成。",
            timestamp,
            type: "global_agent_result",
            agenticRun: completedRun,
            progress_checkpoints: { items: [{ label: "任务交付完成", status: "done" }] },
        }])[0];
    const merged = mergeGlobalAgentMessages([{ role: "assistant", content: "登录修复已完成。", timestamp }], [normalized])[0];
    const checks = {
        preservesType: normalized?.type === "global_agent_result",
        preservesRun: normalized?.agenticRun?.id === "run-history-sync",
        preservesDeliveryReport: normalized?.agenticRun?.final_delivery_report?.headline === "登录修复已完成。",
        mergesRicherMetadata: merged?.agenticRun?.final_delivery_report?.files?.includes("src/Login.vue"),
        preservesProgressCheckpoints: merged?.progress_checkpoints?.items?.[0]?.label === "任务交付完成",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
function loadGlobalAgentHistoryStore() {
    try {
        if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
            const data = JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8"));
            return { sessions: [], ...data };
        }
    }
    catch { }
    try {
        const recovered = JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8"));
        return { sessions: [], ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
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
    writeGlobalJsonAtomic(GLOBAL_AGENT_HISTORY_FILE, store);
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
        try {
            (0, memory_3.ingestGlobalAgentConversation)({ sessionId: id, source: "web", messages: session.messages || [] });
        }
        catch (error) {
            console.warn(`[全局记忆] Web 会话写入失败 (${id})：${error?.message || error}`);
        }
        const existing = byId.get(id);
        byId.set(id, {
            id,
            name: session.name || existing?.name || "全局 Agent 会话",
            source: "web",
            createdAt: existing?.createdAt || session.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: mergeGlobalAgentMessages(existing?.messages || [], session.messages || []),
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
    const message = { role, content, timestamp: new Date().toISOString(), source };
    try {
        (0, memory_3.ingestGlobalAgentConversation)({ sessionId, source, messages: [message] });
    }
    catch (error) {
        console.warn(`[全局记忆] 会话消息写入失败 (${sessionId})：${error?.message || error}`);
    }
    session.messages = normalizeGlobalAgentMessages([...(session.messages || []), message]);
    session.updatedAt = new Date().toISOString();
    store.sessions = sessions;
    saveGlobalAgentHistoryStore(store);
}
function buildFeishuConversationId(payload) {
    const raw = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || payload?.message?.session_id || payload?.data?.session_id || "default";
    return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
}
function getFeishuMessageId(payload) {
    return String(payload?.event?.message?.message_id
        || payload?.message_id
        || payload?.messageId
        || payload?.message?.id
        || payload?.header?.event_id
        || payload?.event_id
        || "").trim();
}
async function waitForIdempotencyResult(scope, key, timeoutMs = 10 * 60 * 1000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const record = (0, reliability_ledger_1.getIdempotencyRecord)(scope, key);
        if (record?.status === "completed" || record?.status === "failed")
            return record;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return (0, reliability_ledger_1.getIdempotencyRecord)(scope, key);
}
function loadGlobalAgentBridgeStore() {
    try {
        if (fs.existsSync(GLOBAL_AGENT_BRIDGE_FILE))
            return JSON.parse(fs.readFileSync(GLOBAL_AGENT_BRIDGE_FILE, "utf-8"));
    }
    catch { }
    try {
        return JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_BRIDGE_FILE}.bak`, "utf-8"));
    }
    catch { }
    return { requests: [] };
}
function saveGlobalAgentBridgeStore(store) {
    const cutoff = Date.now() - 30 * 60 * 1000;
    store.requests = (Array.isArray(store.requests) ? store.requests : [])
        .filter((item) => item.status === "pending" || Date.parse(item.updated_at || item.created_at || 0) > cutoff)
        .slice(-100);
    writeGlobalJsonAtomic(GLOBAL_AGENT_BRIDGE_FILE, store);
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
const GLOBAL_AGENT_BOUNDARY = {
    layer: "global_agent",
    responsibility: "system intent routing, management actions, development mission fan-out",
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
    if (action.type === "manage_task" && !params.id && params.task_id)
        params.id = params.task_id;
    if (action.type === "manage_group" && !params.id && params.group_id)
        params.id = params.group_id;
    if (action.type === "manage_project" && !params.project && params.name)
        params.project = params.name;
    const required = GLOBAL_MANAGEMENT_REQUIRED_PARAMS[action.type]?.[operation] || [];
    const missingParams = required.filter((key) => {
        const value = params[key];
        return value === undefined || value === null || String(value).trim() === "";
    });
    return {
        ...action,
        params,
        management: true,
        agentBoundary: GLOBAL_AGENT_BOUNDARY,
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
const RANDOM_MUSIC_KEYWORD = "__random__";
function parseMusicKeyword(message) {
    const text = stripActionWords(message);
    const keyword = text
        .replace(/^(?:随机|随便|任意)?\s*(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索(?:一下)?(?:歌曲|歌)?)/, "")
        .replace(/^(?:一首|首|点|点儿|点歌)\s*/, "")
        .replace(/(?:的)?(音乐|歌曲|歌)$/g, "")
        .trim();
    if (!keyword || /^(随机|随便|任意|音乐|歌曲|歌|播放|播放音乐|听歌)$/.test(keyword))
        return "";
    return keyword;
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
function resolveImplicitCurrentProject(message, projects) {
    const text = normalizeText(message).toLowerCase();
    const hasImplicitProject = /(?:这个|当前|本|该)\s*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统)\s*(?:这个|当前|本|该)/.test(text);
    if (!hasImplicitProject)
        return "";
    const ccmProject = projects.find(project => /cc[-_]?connect|ccm/i.test(String(project)));
    if (ccmProject)
        return ccmProject;
    return projects.length === 1 ? projects[0] : "";
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
    const implicitProject = matchedProjects.length ? "" : resolveImplicitCurrentProject(message, projects);
    const requestsWholeWorkspace = /(?:所有|全部|全量|整个|全局|全项目|跨项目).*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统).*(?:全部|全量|整体|全局)/.test(message);
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
        ...(implicitProject ? [{
                type: "project",
                project: implicitProject,
                reason: "用户使用“当前/这个项目”指代，已解析到项目「" + implicitProject + "」",
                task: message,
            }] : []),
    ];
    if (targets.length > 0)
        return targets;
    if (requestsWholeWorkspace && projects.length > 0) {
        return projects.map((project) => ({
            type: "project",
            project,
            reason: "用户明确要求覆盖整个项目工作区",
            task: message,
        }));
    }
    return [];
}
/**
 * 仅用于大模型不可用时的保底判断。正常聊天路径由大模型决定是否产生 action，
 * 这里不能因为出现“知识库 / 实现 / 优化”等主题词就自动创建项目任务。
 */
function hasExplicitDevelopmentExecutionIntent(message) {
    const text = normalizeText(message);
    if (!text)
        return false;
    if (/(?:只是|仅仅|只想|先)(?:问问|了解|咨询|讨论|解释|分析)|不要(?:执行|修改|创建|派发)|不用(?:执行|修改|创建|派发)/.test(text))
        return false;
    const hasDevelopmentAction = /(实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
    if (!hasDevelopmentAction)
        return false;
    const isExplanatoryQuestion = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能不能|可不可以|是否|有哪些|有什么)/.test(text);
    const explicitDirective = /^(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text)
        || /(?:请(?!问)|帮我|麻烦|给我|需要你|我要你|直接|立即|马上|开始).*(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
    return explicitDirective && !isExplanatoryQuestion;
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
    const explicitWriteAuthorization = hasExplicitGlobalWriteAuthorization(text);
    const explicitReadRequest = /^(?:请)?(?:查看|列出|检查|打开|进入|跳转|搜索|查询)|(?:系统|任务|项目|群聊|定时任务).*(?:当前状态|运行状态|列表)/.test(text);
    const consultationOnly = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|建议|觉得|能否|能不能|可不可以|是否|会不会|有哪些|有什么)/.test(text);
    if (/(?:不要|不用|先别|暂时别).*(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text))
        return null;
    if (consultationOnly && !explicitWriteAuthorization && !explicitReadRequest)
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
        if (["create", "update"].includes(operation) && !matchedGroup && !matchedProject)
            return null;
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
    if (/(项目|Agent|agent)/.test(text) && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(项目列表|查看项目|列出项目|创建项目|新建项目|启动|运行|拉起|开启|停止|关闭|停掉|结束|删除项目|移除项目|修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text)) {
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
    if (matchedProject && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
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
    if (/(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
        const keyword = parseMusicKeyword(text);
        if (keyword) {
            return {
                reply: `我会交给音乐 Agent 搜索并播放「${keyword}」。`,
                action: { type: "play_music", params: { keyword } }
            };
        }
        return {
            reply: "我会交给音乐 Agent 随机播放一首本地音乐。",
            action: { type: "play_music", params: { keyword: RANDOM_MUSIC_KEYWORD, random: true } }
        };
    }
    if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
        if (!matchedGroup && !matchedProject)
            return null;
        const schedule = guessCronSchedule(text);
        const targetType = matchedGroup ? "group" : "project";
        const group = matchedGroup || null;
        const project = matchedProject || "";
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
    const isDevelopmentRequest = hasExplicitDevelopmentExecutionIntent(text);
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
                        acceptance: "所有群聊主 Agent和项目 Agent子任务必须通过代码变更与验证检查，全局 Agent再汇总报告完成",
                        execution_order: "parallel",
                        targets,
                    }
                }
            };
        }
    }
    if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
        const group = matchedGroup || null;
        if (group) {
            return {
                reply: `我会把这条指令下发到群聊「${group.name || group.id}」的主 Agent。`,
                action: {
                    type: "send_group_cmd",
                    params: { group_id: group.id, message: text, target_project: "coordinator" }
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
        const group = matchedGroup || null;
        if (!group)
            return null;
        return {
            reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
            action: {
                type: "create_task",
                params: {
                    title: text.slice(0, 36),
                    business_goal: text,
                    scope: text,
                    group_id: group?.id,
                    acceptance: "子 Agent 提供结果说明；主 Agent 输出最终报告"
                }
            }
        };
    }
    return null;
}
function createActionBlockSafeStreamer(emit) {
    const actionMarker = "```action";
    const fenceMarker = "```";
    let buffer = "";
    let insideAction = false;
    const drain = (final = false) => {
        while (buffer) {
            if (insideAction) {
                const closeIndex = buffer.indexOf(fenceMarker);
                if (closeIndex >= 0) {
                    buffer = buffer.slice(closeIndex + fenceMarker.length);
                    insideAction = false;
                    continue;
                }
                if (final)
                    buffer = "";
                else
                    buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
                return;
            }
            const actionIndex = buffer.indexOf(actionMarker);
            if (actionIndex >= 0) {
                if (actionIndex > 0)
                    emit(buffer.slice(0, actionIndex));
                buffer = buffer.slice(actionIndex + actionMarker.length);
                insideAction = true;
                continue;
            }
            if (final) {
                emit(buffer);
                buffer = "";
                return;
            }
            const safeLength = Math.max(0, buffer.length - (actionMarker.length - 1));
            if (safeLength > 0) {
                emit(buffer.slice(0, safeLength));
                buffer = buffer.slice(safeLength);
            }
            return;
        }
    };
    return {
        push(text) {
            buffer += String(text || "");
            drain(false);
        },
        finish() {
            drain(true);
        },
    };
}
function runGlobalAgentIntentSelfTest() {
    const projects = ["frontend-app", "backend-api", "cc-connect-test"];
    const groups = [{ id: "dev-group", name: "开发群", members: projects.map(project => ({ project })) }];
    const cases = [
        { message: "知识库是怎么实现的？", expected: null, authorized: false },
        { message: "知识库有哪些可以优化的地方？", expected: null, authorized: false },
        { message: "请介绍一下当前知识库的工作原理", expected: null, authorized: false },
        { message: "我想了解知识库压缩是怎么做的", expected: null, authorized: false },
        { message: "如果要给 frontend-app 加支付，你建议怎么拆分？", expected: null, authorized: false },
        { message: "你觉得 backend-api 还有哪些可以优化？", expected: null, authorized: false },
        { message: "不要执行，只分析怎么修复 backend-api 的问题", expected: null, authorized: false },
        { message: "Cursor 能不能支持这个项目？", expected: null, authorized: false },
        { message: "关于项目记忆，给我讲讲实现原理", expected: null, authorized: false },
        { message: "测试任务会不会重复创建？", expected: null, authorized: false },
        { message: "帮我优化一下", expected: null, authorized: true },
        { message: "给项目加一个支付功能", expected: null, authorized: true },
        { message: "创建每天检查一次的定时任务", expected: null, authorized: true },
        { message: "请优化整个项目的知识库检索，并完成测试", expected: "orchestrate_development", expectedTargetCount: projects.length, authorized: true },
        { message: "请修改当前项目的 README 并运行测试", expected: "orchestrate_development", expectedTargetCount: 1, authorized: true },
        { message: "修复 backend-api 的知识库检索错误", expected: "orchestrate_development", authorized: true },
        { message: "请给 frontend-app 新增登录页面并运行测试", expected: "orchestrate_development", authorized: true },
        { message: "直接运行 backend-api 的测试", expected: "orchestrate_development", authorized: true },
        { message: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", expected: "send_project_cmd", authorized: true },
        { message: "给开发群派发任务，修复登录问题", expected: "send_group_cmd", authorized: true },
        { message: "创建一个每天早上八点检查 backend-api 的定时任务", expected: "manage_cron", authorized: true },
        { message: "启动 backend-api 项目", expected: "manage_project", authorized: true },
        { message: "打开系统设置页面", expected: "navigate" },
        { message: "播放周杰伦的晴天", expected: "play_music", authorized: true },
        { message: "播放音乐", expected: "play_music", authorized: true },
        { message: "随便放一首歌", expected: "play_music", authorized: false },
    ];
    const results = cases.map(item => {
        const result = inferLocalGlobalAction(item.message, projects, groups, {});
        const actual = result?.action?.type || null;
        const targetCount = Array.isArray(result?.action?.params?.targets) ? result.action.params.targets.length : 0;
        const targetCountPassed = item.expectedTargetCount === undefined || targetCount === item.expectedTargetCount;
        const actualAuthorized = hasExplicitGlobalWriteAuthorization(item.message);
        const authorizationPassed = item.authorized === undefined || actualAuthorized === item.authorized;
        return { ...item, actual, targetCount, actualAuthorized, passed: actual === item.expected && targetCountPassed && authorizationPassed };
    });
    const visibleChunks = [];
    const safeStreamer = createActionBlockSafeStreamer(text => visibleChunks.push(text));
    for (const chunk of ["这是自然回答。\n`", "``act", "ion\n{\"type\":\"navigate\"}\n`", "``"])
        safeStreamer.push(chunk);
    safeStreamer.finish();
    const visibleReply = visibleChunks.join("");
    const actionBlockHidden = visibleReply === "这是自然回答。\n";
    const modelUnavailableDelegation = localActionToAgenticDecision({ reply: "准备派发", action: { type: "send_group_cmd", params: { group_id: "dev-group", message: "修复登录" } } }, { steps: [], user_message: "给开发群派发修复登录", explicit_write_authorization: true });
    const fallbackDelegationCannotWrite = modelUnavailableDelegation?.state === "answer" && !modelUnavailableDelegation.tool;
    const localGroupDispatch = inferLocalGlobalAction("给开发群派发任务，修复登录问题", projects, groups, {});
    const localGroupDispatchUsesSchema = localGroupDispatch?.action?.params?.group_id === "dev-group" && !("groupId" in (localGroupDispatch?.action?.params || {}));
    const modelUnavailableCronCreate = localActionToAgenticDecision({ reply: "准备创建定时任务", action: { type: "manage_cron", params: { operation: "create", name: "检查 backend-api", schedule: "0 8 * * *", prompt: "检查 backend-api" } } }, { steps: [], user_message: "创建一个每天早上八点检查 backend-api 的定时任务", explicit_write_authorization: true });
    const fallbackCronCannotWrite = modelUnavailableCronCreate?.state === "answer" && !modelUnavailableCronCreate.tool;
    const modelUnavailableAmbiguousWrite = localActionToAgenticDecision({ reply: "准备派发", action: { type: "create_task", params: { title: "优化", business_goal: "帮我优化一下" } } }, { steps: [], user_message: "帮我优化一下", explicit_write_authorization: true });
    const ambiguousFallbackCannotWrite = modelUnavailableAmbiguousWrite?.state === "answer" && !modelUnavailableAmbiguousWrite.tool;
    const modelUnavailableObservationSummary = localActionToAgenticDecision({ reply: "查询完成", action: { type: "system_status", params: {} } }, { steps: [{ tool: { name: "inspect_system" }, observation: { success: true, summary: "CCM_AGENT_RECEIPT done", trace_id: "trace-should-hide" } }], user_message: "查看系统状态", explicit_write_authorization: false });
    const fallbackObservationFriendly = modelUnavailableObservationSummary?.state === "complete"
        && !/[{}"]|trace_id|CCM_AGENT_RECEIPT/i.test(modelUnavailableObservationSummary.message || "")
        && /查询完成|技术详情|完成信息/.test(modelUnavailableObservationSummary.message || "");
    const staleLocalHistory = Array.from({ length: GLOBAL_AGENT_HISTORY_LIMIT }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `旧前端历史 ${index}`,
        timestamp: `2026-07-07T07:${String(index).padStart(2, "0")}:00.000Z`,
    }));
    const mergedGlobalHistory = mergeGlobalAgentMessages([
        ...staleLocalHistory,
        { role: "assistant", content: "你派发到群聊主 Agent 的任务已经通过验收。", timestamp: "2026-07-07T09:00:00.000Z" },
    ], staleLocalHistory);
    const globalHistoryMergePreservesBackendCompletion = mergedGlobalHistory.length === GLOBAL_AGENT_HISTORY_LIMIT
        && mergedGlobalHistory.some(item => item.content.includes("通过验收"));
    const directGroupDispatch = buildGlobalDirectDispatchHandoff({
        kind: "group",
        group: groups[0],
        targetProject: "coordinator",
        message: "修复登录问题并完成测试",
        originalText: "给开发群派发任务，修复登录问题并完成测试",
        traceId: "trace-direct-group",
    });
    const directGroupMessage = renderGlobalDirectGroupWorkOrder({
        group: groups[0],
        targetProject: "coordinator",
        message: "修复登录问题并完成测试",
        originalText: "给开发群派发任务，修复登录问题并完成测试",
        handoff: directGroupDispatch.handoff,
    });
    const directProjectDispatch = buildGlobalDirectDispatchHandoff({
        kind: "project",
        project: "backend-api",
        message: "运行测试并总结失败项",
        originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
        traceId: "trace-direct-project",
    });
    const directProjectMessage = renderGlobalDirectProjectWorkOrder({
        project: "backend-api",
        message: "运行测试并总结失败项",
        originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
        handoff: directProjectDispatch.handoff,
    });
    const dispatchLaunchUi = buildGlobalAgentEventUi({
        type: "dispatch_launch_summary",
        run_id: "global-run-ui-test",
        dispatch_launch_summary: {
            schema: "ccm-main-agent-dispatch-launch-summary-v1",
            title: "已派发的工作",
            headline: "全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。",
            rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "修复登录问题", status_label: "已进入任务链路" }],
            next_action: "后续进度以群聊任务卡为准。",
        },
    });
    const protocolDispatchLaunchUi = buildGlobalAgentEventUi({
        type: "dispatch_launch_summary",
        dispatch_launch_summary: {
            schema: "ccm-main-agent-dispatch-launch-summary-v1",
            title: "已派发的工作",
            headline: "CCM_AGENT_RECEIPT trace_id raw payload",
            rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "CCM_AGENT_RECEIPT", status_label: "已派发" }],
            next_action: "trace_id",
        },
    });
    const statusSummary = formatMissionStatus({
        missions: [{
                id: "mission-status-demo",
                title: "修复登录状态恢复",
                status: "in_progress",
                child_task_ids: ["status-child-web", "status-child-api"],
                updated_at: "2020-01-01T00:00:00.000Z",
                mission_summary: { total: 2, completed: 1, failed: 0, blocked: 0 },
                workflow_timeline: [{ title: "主 Agent 检查中", detail: "web 已完成，api 正在验证" }],
            }],
        tasks: [
            { id: "status-child-web", status: "done", target_project: "web", status_detail: "已提交结构化结果说明" },
            { id: "status-child-api", status: "in_progress", target_project: "api", status_detail: "正在运行验证", updated_at: "2020-01-01T00:00:00.000Z" },
            {
                id: "status-direct",
                title: "直派修复首页",
                status: "in_progress",
                target_project: "frontend-app",
                updated_at: "2020-01-01T00:00:00.000Z",
                plan_revision_required: true,
                collaboration_state: {
                    last_continuation: {
                        kind: "revise_goal",
                        at: "2026-07-07T09:01:00.000Z",
                        reason: "先保留旧首页入口，只新增兼容开关。",
                        replan_required: true,
                        interrupt_current_run: true,
                    },
                    goal_revision_interruption: {
                        requested: true,
                        requested_at: "2026-07-07T09:01:00.000Z",
                        reason: "先保留旧首页入口，只新增兼容开关。",
                    },
                },
                workflow_meta: { global_direct_dispatch: { schema: "ccm-global-direct-dispatch-v1", user_goal: "修复首页", session_id: "s1" } },
                workflow_timeline: [{ title: "群聊主 Agent 已接管", detail: "等待子 Agent 返回结果" }],
                delivery_summary: {
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        status: "active",
                        headline: "首页兼容开关正在按新要求接续。",
                        next_action: "等待重核计划后继续验收。",
                        pickup_summary: {
                            schema: "ccm-main-agent-pickup-summary-v1",
                            title: "回来继续看这里",
                            current_state: "目标调整已收到；原始执行记录在技术详情里。",
                            review_items: ["接续：正在重核计划", "验证：等待子 Agent 返回", "隐藏：CCM_AGENT_RECEIPT trace_id=secret"],
                            resume_action: "等待重核计划后继续验收。",
                        },
                    },
                },
            },
        ],
    });
    const statusChecks = {
        globalStatusFollowupRecognized: isGlobalProgressStatusRequest("现在进展怎么样？") && isGlobalProgressStatusRequest("How's it going?"),
        globalStatusFollowupAvoidsManagementMutation: !isGlobalProgressStatusRequest("把任务状态设置为 done"),
        globalStatusSummaryFriendly: statusSummary.includes("最近全局任务进展") && statusSummary.includes("子目标") && statusSummary.includes("web 已完成") && statusSummary.includes("api 处理中"),
        globalStatusShowsChildAgentWaitingState: statusSummary.includes("子 Agent 等待情况") && statusSummary.includes("已完成：web") && statusSummary.includes("处理中：api"),
        globalStatusIncludesDirectDispatch: statusSummary.includes("最近全局直派任务") && statusSummary.includes("修复首页"),
        globalStatusShowsDirectDispatchContinuation: statusSummary.includes("接续状态") && statusSummary.includes("保留旧首页入口") && statusSummary.includes("重核计划"),
        globalStatusShowsPickupSummary: statusSummary.includes("回来继续看这里")
            && statusSummary.includes("回看要点")
            && statusSummary.includes("等待重核计划后继续验收"),
        globalStatusShowsProgressRefreshSummary: statusSummary.includes("进度刷新提醒")
            && statusSummary.includes("接续要点")
            && statusSummary.includes("没有新的可展示进展")
            && statusSummary.includes("刷新状态"),
        globalStatusHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|raw payload|WorkerContextPacket/i.test(statusSummary),
    };
    const directDispatchChecks = {
        groupVisibleWorkOrderFriendly: directGroupMessage.includes("全局主 Agent 指令工作单") && directGroupMessage.includes("请按这个链路接管") && directGroupMessage.includes("最终总结"),
        groupVisibleWorkOrderNoProtocolLeak: !GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(directGroupMessage),
        groupDirectDispatchSaysAcceptedNotDone: renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" }).includes("不代表需求已经完成"),
        groupDirectDispatchUsesFriendlyReplyLabel: (() => {
            const legacyReplyLabel = "主 Agent " + "回执";
            const summary = renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" });
            return summary.includes("主 Agent 说明") && !summary.includes(legacyReplyLabel);
        })(),
        projectInternalWorkOrderSelfContained: directProjectMessage.includes("全局主 Agent 指令工作单") && directProjectMessage.includes("你看不到用户和主 Agent 的完整历史对话") && directProjectMessage.includes("CCM_AGENT_RECEIPT"),
        directDispatchHandoffSummary: directGroupDispatch.summary.label === "工作单已补齐" && directProjectDispatch.summary.project === "backend-api",
        verificationOnlyCanAvoidCodeChanges: directProjectDispatch.handoff.verification.required.includes("说明产出和人工核验依据"),
        dispatchLaunchUiFriendly: dispatchLaunchUi?.title === "已派发的工作" && dispatchLaunchUi?.text.includes("dev-group") && dispatchLaunchUi?.checkpoint?.label === "已派发的工作",
        dispatchLaunchUiHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|raw payload/i.test(JSON.stringify(protocolDispatchLaunchUi || {})),
    };
    return {
        passed: results.every(item => item.passed)
            && actionBlockHidden
            && fallbackDelegationCannotWrite
            && localGroupDispatchUsesSchema
            && fallbackCronCannotWrite
            && ambiguousFallbackCannotWrite
            && fallbackObservationFriendly
            && globalHistoryMergePreservesBackendCompletion
            && Object.values(statusChecks).every(Boolean)
            && Object.values(directDispatchChecks).every(Boolean),
        results,
        actionBlockHidden,
        fallbackDelegationCannotWrite,
        localGroupDispatchUsesSchema,
        fallbackCronCannotWrite,
        ambiguousFallbackCannotWrite,
        fallbackObservationFriendly,
        globalHistoryMergePreservesBackendCompletion,
        statusChecks,
        directDispatchChecks,
        visibleReply,
    };
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
function parseSseApiEvents(text) {
    const events = [];
    for (const block of String(text || "").split(/\r?\n\r?\n/)) {
        const data = block
            .split(/\r?\n/)
            .filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trimStart())
            .join("\n")
            .trim();
        if (!data || data === "[DONE]")
            continue;
        try {
            events.push(JSON.parse(data));
        }
        catch {
            events.push({ type: "message", text: data });
        }
    }
    return events;
}
async function postLocalSseOrJsonApi(baseUrl, pathname, body) {
    const response = await fetch(baseUrl + pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
        body: JSON.stringify(body || {}),
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let data = null;
    if (contentType.includes("application/json") || /^\s*[{[]/.test(text)) {
        try {
            data = text ? JSON.parse(text) : {};
        }
        catch {
            data = null;
        }
    }
    if (!data) {
        const events = parseSseApiEvents(text);
        const errorEvent = events.find(event => event?.type === "error");
        const taskEvent = events.find(event => event?.type === "task_created" || event?.type === "task_updated");
        const agentEvent = events.find(event => event?.type === "agent_done");
        const doneEvent = [...events].reverse().find(event => event?.type === "done");
        data = {
            success: !errorEvent,
            events,
            error: errorEvent?.text || errorEvent?.error || "",
            reply: taskEvent?.text || agentEvent?.text || "",
            task: taskEvent?.task || null,
            queue: taskEvent?.queue || null,
            messageId: taskEvent?.messageId || agentEvent?.messageId || doneEvent?.messageId || "",
            taskId: taskEvent?.task?.id || doneEvent?.taskId || "",
        };
    }
    if (!response.ok || data?.success === false || data?.error) {
        throw new Error(data?.error || `接口执行失败 (${response.status})`);
    }
    return data;
}
const GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_ids|native_session|task_agent_session|Runtime Kernel|Trace Replay|scratchpad|回执要求/i;
function sanitizeGlobalDirectAgentOutput(value, fallback = "Agent 已返回执行结果，详细排障信息已放入技术详情。", max = 700) {
    let text = String(value || "").replace(/\r/g, "").trim();
    if (!text)
        return fallback;
    if (GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            return "Agent 执行时遇到需要排查的问题，详细原因已放入技术详情。";
        if (/done|完成|receipt|回执/i.test(text))
            return "Agent 已提交结构化完成信息，主 Agent 会继续汇总验收。";
        return fallback;
    }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function resolveGlobalDispatchProject(project) {
    const config = (0, db_1.getConfigs)().find((item) => item.name === project);
    const info = config ? ((0, db_1.getConfigInfo)(config.path)?.[0] || {}) : {};
    return {
        project,
        config,
        workDir: info.workDir || "",
        agentType: info.agent || "claudecode",
        platform: info.platform || "",
    };
}
function inferGlobalDirectDispatchRequiresCodeChanges(message) {
    const text = normalizeText(message);
    const explicitCodeChange = /(修改|修复|实现|新增|删除|重构|改代码|开发|接入|对接|bug|页面|接口|字段|schema|配置)/i.test(text);
    const readOnlyOnly = /(只读|仅分析|只分析|不要修改|不修改|不改代码|无需代码|无需修改|运行测试|执行测试|跑测试|检查|审查|review)/i.test(text);
    if (readOnlyOnly && !explicitCodeChange)
        return false;
    return true;
}
function buildGlobalDirectDispatchHandoff(input) {
    const targetProject = input.project || input.targetProject || "coordinator";
    const runtime = resolveGlobalDispatchProject(targetProject);
    const groupLabel = input.group ? `${input.group.name || input.group.id || "未命名群聊"}` : "";
    const userGoal = String(input.originalText || input.message || "").trim();
    const kindLabel = input.kind === "group" ? "群聊主 Agent" : "项目 Agent";
    const handoff = (0, worker_handoff_1.buildSelfContainedWorkerHandoff)({
        group: input.group || null,
        project: targetProject,
        task: input.message,
        userGoal,
        source: "全局主 Agent 直接派发",
        reason: input.kind === "group"
            ? `全局主 Agent 判断该需求需要交给群聊「${groupLabel || input.group?.id || "目标群聊"}」的主 Agent 接管`
            : `全局主 Agent 判断该需求适合由项目「${targetProject}」直接执行`,
        workDir: runtime.workDir,
        agentType: runtime.agentType,
        traceId: input.traceId,
        analysis: {
            summary: userGoal,
            documentFindings: [
                input.kind === "group" ? `目标群聊：${groupLabel || input.group?.id || "未指定"}` : `目标项目：${targetProject}`,
                `接收方：${kindLabel}`,
            ],
            constraints: [
                "用户可见回复保持自然友好，技术排障信息默认放入技术详情。",
                "完成后必须说明完成内容、验证结果、风险和下一步。",
            ],
        },
        verificationHints: input.kind === "group"
            ? ["群聊任务卡持续展示计划、执行、验收和最终总结。"]
            : ["运行与本次指令匹配的最小必要验证；未运行必须说明原因。"],
        acceptance: [
            "用户能看懂主 Agent 当前计划、执行进度和最终结论。",
            "涉及代码时必须说明实际文件变更和验证结果。",
            "如被阻塞，明确还需要用户或其他 Agent 补充什么。",
        ],
        requiresCodeChanges: inferGlobalDirectDispatchRequiresCodeChanges(input.message),
    });
    return { handoff, summary: (0, worker_handoff_1.summarizeWorkerHandoffForUser)(handoff), runtime };
}
function renderGlobalDirectGroupWorkOrder(input) {
    const summary = (0, worker_handoff_1.summarizeWorkerHandoffForUser)(input.handoff);
    const members = (input.group?.members || []).map((item) => item.project).filter(Boolean).slice(0, 8);
    return [
        "【全局主 Agent 指令工作单】",
        `目标群聊：${input.group?.name || input.group?.id || "未命名群聊"}`,
        `接收方：${input.targetProject || "群聊主 Agent"}`,
        members.length ? `可协作成员：${members.join("、")}` : "",
        `工作单状态：${summary.label}，目标、范围、验收和总结要求已整理好。`,
        "",
        "用户目标：",
        compactPetText(input.originalText || input.message, 900),
        "",
        "请按这个链路接管：",
        "1. 先理解目标和影响范围，必要时只读检查项目上下文。",
        "2. 形成用户能看懂的计划；如果风险高，先等用户确认。",
        "3. 需要写代码时再派发给合适的子 Agent，并持续跟踪执行和回执。",
        "4. 主 Agent 负责验收；验收不通过就返工，不能把未完成写成完成。",
        "5. 完成后给用户一份最终总结：完成了什么、改了哪里、怎么验证、还有什么风险。",
        "",
        "展示要求：普通回复只写用户能看懂的话；内部排障字段和详细记录放进技术详情。",
    ].filter(Boolean).join("\n");
}
function renderGlobalDirectProjectWorkOrder(input) {
    return [
        "【全局主 Agent 指令工作单】",
        `目标项目：${input.project}`,
        "",
        "面向用户的回复要求：",
        "- 用自然中文说明你理解的目标、实际动作、验证结果和风险。",
        "- 技术协议、执行细节和排障字段放在结构化回执或技术详情里，普通总结不要堆内部字段。",
        "- 如果不能完成，明确说明卡在哪里、需要谁补什么。",
        "",
        (0, worker_handoff_1.renderSelfContainedWorkerHandoff)(input.handoff),
    ].join("\n");
}
function renderGlobalDirectGroupDispatchAcceptedSummary(input) {
    return [
        "群聊主 Agent 已收到全局工作单，并按任务链路接管。",
        `- 群聊：${input.group?.name || input.groupId || "目标群聊"}`,
        input.taskId ? `- 任务 ID：${input.taskId}` : "",
        `- 状态：${input.queueText || "已保存到群聊任务链路"}`,
        "- 说明：这只是已派发并进入任务链路，不代表需求已经完成；最终结果以任务卡验收和最终总结为准。",
        "- 进度展示：计划、执行、验收和最终总结会显示在群聊任务卡中。",
        input.reply ? `\n主 Agent 说明：\n${sanitizeGlobalDirectAgentOutput(input.reply, "主 Agent 已接管，后续进度在任务卡中更新。", 900)}` : "",
    ].filter(Boolean).join("\n");
}
function isGlobalProgressStatusRequest(message) {
    const text = normalizeText(message);
    if (!text)
        return false;
    if (/^(?:\/status|status|progress|任务状态|查看任务状态|全局任务|最近任务)$/i.test(text))
        return true;
    if (/(设置|修改|标记|改成|更新|创建|新建|删除|移除)/.test(text) && /(任务状态|状态)/.test(text))
        return false;
    return /(进展|进度|做到哪|处理到哪|现在怎么样|怎么样了|完成了吗|有结果了吗|还在(?:执行|处理|跑)|任务状态|最近任务|全局任务|how'?s it going|how is it going|what'?s the status)/i.test(text);
}
function globalStatusLabel(status) {
    const value = String(status || "").toLowerCase();
    if (["done", "completed", "success"].includes(value))
        return "已完成";
    if (["failed", "error"].includes(value))
        return "未完成";
    if (["cancelled", "canceled"].includes(value))
        return "已取消";
    if (["blocked", "needs_user", "waiting_confirmation", "waiting_clarification"].includes(value))
        return "需要处理";
    if (["pending", "queued", "planned"].includes(value))
        return "排队中";
    if (["in_progress", "running", "reviewing", "reworking"].includes(value))
        return "处理中";
    return value || "状态未记录";
}
function latestReadableTimeline(task) {
    const timeline = Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : [];
    const latest = [...timeline].reverse().find((item) => item?.title || item?.detail || item?.message);
    return sanitizeGlobalDirectAgentOutput(latest?.detail || latest?.message || latest?.title || task?.status_detail || "", "最近进展已更新，详细记录在任务卡技术详情里。", 220);
}
const GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS = 15 * 60 * 1000;
function globalStatusTimeMs(...values) {
    const times = values
        .map(value => Date.parse(String(value || "")))
        .filter(value => Number.isFinite(value) && value > 0);
    return times.length ? Math.max(...times) : 0;
}
function globalStatusAgeLabel(ageMs) {
    if (!Number.isFinite(ageMs) || ageMs <= 0)
        return "";
    const minutes = Math.max(1, Math.round(ageMs / 60_000));
    if (minutes < 60)
        return `${minutes} 分钟`;
    const hours = Math.max(1, Math.round(minutes / 60));
    if (hours < 24)
        return `${hours} 小时`;
    return `${Math.max(1, Math.round(hours / 24))} 天`;
}
function getGlobalStatusPickupSummary(source) {
    const report = source?.delivery_summary?.delivery_report
        || source?.deliverySummary?.deliveryReport
        || source?.final_delivery_report
        || source?.finalDeliveryReport
        || source?.delivery_report
        || source?.deliveryReport
        || source?.display_stream?.delivery_report
        || source?.displayStream?.deliveryReport
        || null;
    const pickup = source?.pickup_summary
        || source?.pickupSummary
        || source?.delivery_summary?.pickup_summary
        || source?.deliverySummary?.pickupSummary
        || report?.pickup_summary
        || report?.pickupSummary
        || null;
    if (!pickup && !report)
        return null;
    const title = sanitizeGlobalDirectAgentOutput(pickup?.title || "回来继续看这里", "回来继续看这里", 80);
    const headline = sanitizeGlobalDirectAgentOutput(pickup?.current_state || pickup?.currentState || pickup?.headline || report?.headline || source?.status_detail || "", "全局主 Agent 已整理当前任务状态。", 220);
    const reviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
        ? (pickup.review_items || pickup.reviewItems)
            .map((item) => sanitizeGlobalDirectAgentOutput(item, "", 120))
            .filter(Boolean)
            .slice(0, 4)
        : [];
    const resumeAction = sanitizeGlobalDirectAgentOutput(pickup?.resume_action || pickup?.resumeAction || (Array.isArray(report?.next_action) ? report.next_action[0] : report?.next_action) || "", "", 180);
    return { title, headline, reviewItems, resumeAction };
}
function getGlobalStatusProgressRefreshSummary(source, childTasks = [], nowMs = Date.now()) {
    const statusValue = String(source?.status || "").toLowerCase();
    if (["done", "completed", "success", "cancelled", "canceled"].includes(statusValue))
        return null;
    const staleMs = Math.max(60_000, Number(source?.progress_refresh_stale_ms || source?.progressRefreshStaleMs || GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS));
    const rows = (Array.isArray(childTasks) && childTasks.length ? childTasks : [source]).filter(Boolean);
    const ageRows = rows.map((task) => {
        const lastMs = globalStatusTimeMs(task?.updated_at, task?.updatedAt, task?.started_at, task?.startedAt, task?.created_at, task?.createdAt, source?.updated_at, source?.updatedAt);
        const ageMs = lastMs ? Math.max(0, nowMs - lastMs) : 0;
        return { task, ageMs };
    });
    const stalled = ageRows.filter(({ task, ageMs }) => {
        const value = String(task?.status || "").toLowerCase();
        return ["in_progress", "running", "reviewing", "reworking"].includes(value) && ageMs >= staleMs;
    });
    const staleQueued = ageRows.filter(({ task, ageMs }) => {
        const value = String(task?.status || "").toLowerCase();
        return ["pending", "queued", "planned"].includes(value) && ageMs >= staleMs;
    });
    const sourceAgeMs = Math.max(...ageRows.map(row => row.ageMs), 0);
    const sourceLong = sourceAgeMs >= staleMs;
    const supervisorWaiting = Array.isArray(source?.workflow_timeline)
        ? source.workflow_timeline.some((item) => /stalled|timeout|超时|长时间|等待|卡住|恢复/i.test(`${item?.type || ""} ${item?.title || ""} ${item?.detail || ""} ${item?.message || ""}`))
        : false;
    if (!stalled.length && !staleQueued.length && !sourceLong && !supervisorWaiting)
        return null;
    const first = stalled[0]?.task || staleQueued[0]?.task || rows[0] || source;
    const target = targetNameForTask(first);
    const ageLabel = globalStatusAgeLabel(stalled[0]?.ageMs || staleQueued[0]?.ageMs || sourceAgeMs);
    const headline = stalled.length
        ? `${stalled.length} 个下游 Agent 已经 ${ageLabel || "一段时间"} 没有新的可展示进展，全局主 Agent 会先刷新状态，再决定继续等待、重派或请你确认。`
        : staleQueued.length
            ? `${staleQueued.length} 个下游任务排队较久，全局主 Agent 会检查执行通道并接上下一步。`
            : `这项全局任务已经 ${ageLabel || "一段时间"} 没有新的可展示进展，全局主 Agent 会主动刷新状态。`;
    const reviewItems = [
        target ? `关注对象：${target}` : "",
        first?.status_detail ? `当前说明：${sanitizeGlobalDirectAgentOutput(first.status_detail, "进展已整理。", 120)}` : "",
        source?.workflow_timeline?.length ? `最近节点：${sanitizeGlobalDirectAgentOutput(source.workflow_timeline[source.workflow_timeline.length - 1]?.title || source.workflow_timeline[source.workflow_timeline.length - 1]?.detail || "", "", 120)}` : "",
    ].filter(Boolean).slice(0, 4);
    const nextAction = stalled.length
        ? "先刷新下游任务卡；如果仍没有新结果，就重新派发或定向补充。"
        : staleQueued.length
            ? "检查执行通道和队列状态，能恢复就继续推进；不能恢复会提示你处理。"
            : "刷新全局任务状态，并继续等待下游 Agent 的可验收结果。";
    return {
        title: "进度刷新提醒",
        headline: sanitizeGlobalDirectAgentOutput(headline, "全局主 Agent 已整理进度刷新状态。", 240),
        reviewItems: reviewItems.map(item => sanitizeGlobalDirectAgentOutput(item, "", 140)).filter(Boolean),
        nextAction,
    };
}
function getGlobalStatusDirectDispatchMeta(task) {
    const meta = task?.workflow_meta?.global_direct_dispatch
        || task?.workflowMeta?.global_direct_dispatch
        || task?.global_direct_dispatch
        || null;
    if (!meta || typeof meta !== "object")
        return null;
    return String(meta.schema || "") === "ccm-global-direct-dispatch-v1" ? meta : null;
}
function targetNameForTask(task) {
    return sanitizeGlobalDirectAgentOutput(task?.mission_target?.name || task?.mission_target?.project || task?.target_project || task?.group_id || task?.project || "执行目标", "执行目标", 80);
}
function summarizeDirectDispatchContinuationForStatus(task) {
    const state = task?.collaboration_state || {};
    const last = state.last_continuation || task?.last_continuation || null;
    const interruption = state.goal_revision_interruption || {};
    const kind = String(last?.kind || last?.rework_kind || "").toLowerCase();
    const replanRequired = kind === "revise_goal"
        || last?.replan_required === true
        || task?.plan_revision_required === true
        || interruption.requested === true;
    if (!last?.at && !interruption.requested_at && !replanRequired)
        return "";
    const reason = sanitizeGlobalDirectAgentOutput(last?.reason || interruption.reason || task?.status_detail || "用户补充了新的要求", "用户补充了新的要求", 140);
    const route = interruption.requested && !interruption.resolved_at
        ? "正在停止旧执行轮，再按新目标重核计划"
        : replanRequired
            ? "正在按最新要求重核计划和验收标准"
            : "补充要求已接到同一任务里继续处理";
    return `接续状态：${reason ? `${reason}；` : ""}${route}`;
}
function summarizeMissionChildren(mission, tasks) {
    const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
    const byId = new Map(tasks.map((task) => [String(task?.id || ""), task]));
    return ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean)
        .slice(0, 4)
        .map((task) => `${targetNameForTask(task)} ${globalStatusLabel(task.status)}${task.status_detail ? `：${sanitizeGlobalDirectAgentOutput(task.status_detail, "进展已整理。", 90)}` : ""}`);
}
function summarizeGlobalChildAgentWaiting(mission, tasks) {
    const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
    const byId = new Map(tasks.map((task) => [String(task?.id || ""), task]));
    const rows = ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean)
        .slice(0, 8)
        .map((task) => {
        const value = String(task.status || "").toLowerCase();
        const agent = targetNameForTask(task);
        if (["done", "completed", "success", "ok"].includes(value))
            return { agent, status: "completed" };
        if (["failed", "error", "blocked", "needs_user", "waiting_confirmation", "waiting_clarification"].includes(value))
            return { agent, status: "attention" };
        if (["pending", "queued", "planned"].includes(value))
            return { agent, status: "waiting" };
        return { agent, status: "running" };
    });
    if (!rows.length)
        return "";
    const namesFor = (status) => rows.filter(row => row.status === status).map(row => row.agent).slice(0, 5);
    const completed = namesFor("completed");
    const running = namesFor("running");
    const waiting = namesFor("waiting");
    const attention = namesFor("attention");
    return [
        completed.length ? `已完成：${completed.join("、")}` : "",
        running.length ? `处理中：${running.join("、")}` : "",
        waiting.length ? `等待中：${waiting.join("、")}` : "",
        attention.length ? `待处理：${attention.join("、")}` : "",
    ].filter(Boolean).join("；");
}
function formatMissionStatus(input = {}) {
    const tasks = Array.isArray(input.tasks) ? input.tasks : (0, db_1.loadTasks)();
    const missions = Array.isArray(input.missions) ? input.missions : (0, collaboration_1.refreshGlobalDevelopmentMissions)();
    const directDispatchTasks = tasks
        .filter((task) => getGlobalStatusDirectDispatchMeta(task))
        .sort((a, b) => String(b.updated_at || b.completed_at || b.created_at || "").localeCompare(String(a.updated_at || a.completed_at || a.created_at || "")))
        .slice(0, 4);
    if (!missions.length && !directDispatchTasks.length)
        return "当前还没有全局开发任务或全局直派任务。";
    const missionRows = missions.slice(-6).reverse().map((mission) => {
        const summary = mission.mission_summary || {};
        const total = Number(summary.total || mission.child_task_ids?.length || 0);
        const completed = Number(summary.completed || summary.passed || 0);
        const failed = Number(summary.failed || 0);
        const blocked = Number(summary.blocked || 0);
        const details = [`${completed}/${total || "?"} 已完成`];
        if (failed > 0)
            details.push(`${failed} 失败`);
        if (blocked > 0)
            details.push(`${blocked} 阻塞`);
        const title = sanitizeGlobalDirectAgentOutput(mission.title || mission.business_goal || mission.id, "全局开发任务", 120);
        const current = latestReadableTimeline(mission);
        const children = summarizeMissionChildren(mission, tasks);
        const childWaiting = summarizeGlobalChildAgentWaiting(mission, tasks);
        const pickup = getGlobalStatusPickupSummary(mission);
        const childIds = new Set((Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : []).map((id) => String(id)));
        const progressRefresh = getGlobalStatusProgressRefreshSummary(mission, tasks.filter((task) => childIds.has(String(task?.id || ""))));
        const next = failed || blocked
            ? "下一步：需要主 Agent 处理失败/阻塞项，不能直接宣称完成。"
            : completed >= total && total > 0
                ? `下一步：${pickup?.resumeAction || "等待或查看最终交付总结。"}`
                : `下一步：${progressRefresh?.nextAction || "继续等待子 Agent 更新结果，主 Agent 会汇总验收。"}`;
        return [
            `- ${title}：${globalStatusLabel(mission.status)}（${details.join("，")}）`,
            current ? `  当前进展：${current}` : "",
            pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
            pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
            progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
            progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
            children.length ? `  子目标：${children.join("；")}` : "",
            childWaiting ? `  子 Agent 等待情况：${childWaiting}` : "",
            `  ${next}`,
        ].filter(Boolean).join("\n");
    });
    const directRows = directDispatchTasks.map((task) => {
        const meta = getGlobalStatusDirectDispatchMeta(task) || {};
        const title = sanitizeGlobalDirectAgentOutput(meta.user_goal || task.business_goal || task.title || "全局直派任务", "全局直派任务", 120);
        const target = targetNameForTask(task);
        const current = latestReadableTimeline(task);
        const acceptance = task.delivery_summary?.acceptance_gate_passed === true ? "已通过验收" : "等待任务卡验收";
        const continuation = summarizeDirectDispatchContinuationForStatus(task);
        const pickup = getGlobalStatusPickupSummary(task);
        const progressRefresh = getGlobalStatusProgressRefreshSummary(task);
        return [
            `- ${title}：${globalStatusLabel(task.status)}（${target}，${acceptance}）`,
            continuation ? `  ${continuation}` : "",
            current ? `  当前进展：${current}` : "",
            pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
            pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
            progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
            progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
            `  下一步：${pickup?.resumeAction || progressRefresh?.nextAction || "以群聊任务卡的计划、执行、验收和最终总结为准。"}`,
        ].filter(Boolean).join("\n");
    });
    return [
        missionRows.length ? `最近全局任务进展：\n${missionRows.join("\n")}` : "",
        directRows.length ? `最近全局直派任务：\n${directRows.join("\n")}` : "",
        "我不会猜测还没返回的子 Agent 结果；未完成的部分会继续等下游 Agent 更新，技术记录默认在任务卡技术详情里。",
    ].filter(Boolean).join("\n\n");
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
    const normalizedKeyword = parseMusicKeyword(keyword) || (/(播放|放一首|放|来一首|来点|听|听歌|音乐|歌曲|歌)/.test(keyword) ? RANDOM_MUSIC_KEYWORD : normalizeText(keyword));
    if (!normalizedKeyword)
        return "缺少要播放的歌曲或歌手关键词。";
    const result = await postLocalApi(baseUrl, "/api/music/remote-command", { keyword: normalizedKeyword, source: "feishu-global-agent" });
    const label = normalizedKeyword === RANDOM_MUSIC_KEYWORD ? "随机播放音乐" : `「${normalizedKeyword}」`;
    return `已把${label}发送给音乐播放器。请保持 CCM 音乐播放器页面打开，它会在后台自动检索并播放。${result.command?.id ? `\n- 指令 ID：${result.command.id}` : ""}`;
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
    if ((action.requires_confirmation || ["delete", "remove_member"].includes(operation)) && action.confirmed !== true) {
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
        else if (operation === "delete")
            result = await postLocalApi(baseUrl, "/api/cron/delete", { id: params.id });
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
            result = await postLocalApi(baseUrl, "/api/tasks/continue", { id, message: params.message || "由飞书全局 Agent 继续推进", auto_execute: true, idempotency_key: params.idempotency_key });
        else if (operation === "retry")
            result = await postLocalApi(baseUrl, "/api/tasks/retry", { id, reason: params.message || "由飞书全局 Agent 发起重试", auto_execute: true, idempotency_key: params.idempotency_key });
        else if (operation === "queue")
            result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
        else if (operation === "delete")
            result = await postLocalApi(baseUrl, "/api/tasks/delete", { id });
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
        else if (operation === "delete")
            result = await postLocalApi(baseUrl, "/api/projects/delete", { name: project });
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
        else if (operation === "remove_member")
            result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, remove: params.projects || [params.project] });
        else if (operation === "delete")
            result = await postLocalApi(baseUrl, "/api/groups/delete", { id: params.id || params.group_id });
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
        else if (operation === "delete")
            result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills/delete" : "/api/mcp/delete", { name: params.name });
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
async function executeFeishuAction(baseUrl, action, originalText = "", traceId = "", options = {}) {
    if (!action?.type)
        return "";
    if (GLOBAL_MANAGEMENT_ACTIONS[action.type])
        return executeFeishuManagementAction(baseUrl, { ...action, params: { ...(action.params || {}), idempotency_key: traceId || action.params?.idempotency_key } }, originalText);
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
            trace_id: traceId,
            idempotency_key: traceId ? `feishu:${traceId}` : undefined,
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
            acceptance: params.acceptance || "子 Agent 提供结果说明；主 Agent 输出最终报告",
            persist_documents: true,
            auto_execute: true,
            trace_id: traceId,
            idempotency_key: traceId ? `feishu:${traceId}` : undefined,
        });
        return `协作任务已派发并进入自动执行队列。\n- 任务 ID：${result.task?.id || result.id || "已创建"}`;
    }
    if (action.type === "send_group_cmd") {
        const groupId = params.group_id || params.groupId;
        const targetProject = params.target_project || params.targetProject || "coordinator";
        const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
        const group = (0, collaboration_1.loadGroups)().find((item) => item.id === groupId) || null;
        const dispatch = buildGlobalDirectDispatchHandoff({
            kind: "group",
            group,
            targetProject,
            message: rawMessage,
            originalText,
            traceId,
        });
        const workOrderMessage = renderGlobalDirectGroupWorkOrder({
            group,
            targetProject,
            message: rawMessage,
            originalText,
            handoff: dispatch.handoff,
        });
        const result = await postLocalSseOrJsonApi(baseUrl, "/api/groups/send", {
            group_id: groupId,
            target_project: targetProject,
            message: workOrderMessage,
            message_mode: "project_task",
            force_task: true,
            auto_execute: true,
            requires_code_changes: inferGlobalDirectDispatchRequiresCodeChanges(rawMessage),
            global_handoff: dispatch.summary,
            global_direct_dispatch: {
                schema: "ccm-global-direct-dispatch-v1",
                source: "global-agent-direct-dispatch",
                global_run_id: options.globalRunId || "",
                session_id: options.sessionId || "",
                trace_id: traceId,
                handoff: dispatch.summary,
                original_text: originalText || rawMessage,
                user_goal: rawMessage,
            },
            trace_id: traceId,
            client_message_id: traceId ? `feishu-${traceId}` : undefined,
        });
        const taskId = result.task?.id || result.taskId || "";
        const queueText = result.queue?.queued
            ? `已进入执行队列（位置 ${result.queue.position || 1}）`
            : (result.queue?.message || "已保存到群聊任务链路");
        return renderGlobalDirectGroupDispatchAcceptedSummary({
            group,
            groupId,
            taskId,
            queueText,
            reply: result.reply,
        });
    }
    if (action.type === "send_project_cmd") {
        const project = params.project || params.projectName;
        const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
        const dispatch = buildGlobalDirectDispatchHandoff({
            kind: "project",
            project,
            message: rawMessage,
            originalText,
            traceId,
        });
        const agentMessage = renderGlobalDirectProjectWorkOrder({
            project,
            message: rawMessage,
            originalText,
            handoff: dispatch.handoff,
        });
        const result = await postLocalApi(baseUrl, "/api/send", {
            project,
            message: agentMessage,
            global_handoff: dispatch.summary,
            trace_id: traceId,
            source: "global-agent-direct-dispatch",
        });
        return [
            "项目 Agent 已按全局工作单执行。",
            `- 项目：${project}`,
            "- 工作单：已补齐目标、范围、验收和完成后总结要求。",
            `- 执行结果：${sanitizeGlobalDirectAgentOutput(result.output || "已完成", "项目 Agent 已提交执行结果，详细输出在项目技术详情中。", 900)}`,
        ].join("\n");
    }
    if (action.type === "create_cron_task") {
        const result = await postLocalApi(baseUrl, "/api/cron/create", params);
        return `定时任务已创建：${result.job?.name || params.name || "未命名任务"}（${params.schedule}）`;
    }
    return `已识别动作 ${action.type}，但它不适合从飞书远程执行。`;
}
function hasExplicitGlobalWriteAuthorization(message) {
    const text = normalizeText(message);
    if (!text)
        return false;
    if (/(?:不要|不用|先别|暂时别|仅|只)(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text))
        return false;
    if (hasExplicitDevelopmentExecutionIntent(text))
        return true;
    const explicitVerb = /(创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/;
    const explicitAuthorization = /(?:我)?明确授权(?:你|系统|全局Agent|全局agent)?/.test(text) && explicitVerb.test(text);
    const directive = explicitVerb.test(text) && (/^(请|帮我|麻烦|给我|直接|立即|马上|开始|创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/.test(text) || /(?:我要你|需要你|由你|替我)/.test(text));
    const explicitDispatch = /^(?:请)?给.+(?:群|项目|Agent|agent).*(?:派发|下发|修复|实现|修改|处理|执行)/.test(text);
    const explicitGenericTarget = /^给(?:某个|这个|该)?(?:项目|群聊|Agent|agent).*(?:加|新增|实现|修改|修复|处理|执行)/.test(text);
    const explanatory = /(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能否|能不能|可不可以|是否|有哪些|有什么)[^。！？]*[?？]?$/i.test(text);
    return (explicitAuthorization || directive || explicitDispatch || explicitGenericTarget) && !explanatory;
}
function safeProjectRows() {
    return (0, db_1.getConfigs)().map((config) => {
        const info = (0, db_1.getConfigInfo)(config.path)?.[0] || {};
        return {
            name: config.name,
            work_dir: info.workDir || "",
            agent: info.agent || "claudecode",
            platform: info.platform || "",
        };
    });
}
function compactTask(task) {
    return {
        id: task.id,
        title: task.title,
        status: task.status,
        status_detail: task.status_detail,
        group_id: task.group_id,
        target_project: task.target_project,
        updated_at: task.updated_at || task.completed_at || task.created_at,
        trace_id: task.trace_id,
    };
}
function summarizeGlobalToolObservationForUser(observation, fallback = "操作已完成。") {
    if (!observation)
        return fallback;
    if (observation.success === false || observation.error) {
        return sanitizeGlobalDirectAgentOutput(observation.error || observation.summary || observation.message, "操作未完成；错误详情已放入技术详情。", 700);
    }
    const explicit = sanitizeGlobalDirectAgentOutput(observation.summary || observation.message || observation.reply || "", "", 700);
    if (explicit)
        return explicit;
    const count = observation.jobs?.length
        ?? observation.tasks?.length
        ?? observation.projects?.length
        ?? observation.groups?.length
        ?? observation.missions?.length
        ?? observation.children?.length;
    if (count !== undefined)
        return `操作已完成，返回 ${count} 条结果；详细记录已放入技术详情。`;
    if (observation.accepted === true && observation.completed === false)
        return "任务已受理并进入持续跟进；这不代表最终完成，完成后会再给出交付总结。";
    if (observation.client_effect)
        return "操作已完成，界面会同步执行对应动作。";
    return "操作已完成；详细记录已放入技术详情。";
}
function buildAgenticContext(query = "", sessionId = "") {
    const tasks = (0, db_1.loadTasks)();
    const groups = (0, collaboration_1.loadGroups)();
    return {
        projects: safeProjectRows(),
        groups: groups.map((group) => ({ id: group.id, name: group.name, members: (group.members || []).map((member) => ({ project: member.project, agent: member.agent })) })),
        task_summary: {
            total: tasks.length,
            active: tasks.filter((task) => ["pending", "queued", "in_progress", "running"].includes(String(task.status))).length,
            recent: tasks.slice(-12).map(compactTask),
        },
        cron_jobs: (0, db_1.loadCronJobs)().map((job) => ({ id: job.id, name: job.name, schedule: job.schedule, enabled: job.enabled !== false, target_type: job.target_type, group_id: job.group_id, project: job.project })),
        tools: {
            mcp: (0, db_1.loadMcpTools)().map((tool) => tool.name),
            skills: (0, db_1.loadSkills)().map((skill) => skill.name),
        },
        global_memory: query ? (0, memory_3.buildGlobalAgentMemoryPacket)(query, { sessionId, limit: 7 }) : "",
        group_memory_context: (0, memory_2.buildGlobalGroupMemoryContext)(query, { sessionId, groups, maxGroups: 6, maxTypedMemory: 3 }),
    };
}
function localActionToAgenticDecision(localIntent, run) {
    if (run.steps.length > 0) {
        const last = run.steps[run.steps.length - 1];
        const observationText = summarizeGlobalToolObservationForUser(last.observation, localIntent?.reply || "操作已完成。");
        return {
            state: "complete",
            message: last.error ? `操作未完成：${last.error}` : `${localIntent?.reply || "操作已完成。"}\n\n${observationText}`,
            tool: null,
            completion: { evidence: last.error ? [] : [`工具 ${last.tool?.name || "unknown"} 已返回执行结果`], risks: last.error ? [last.error] : [] },
        };
    }
    if (!localIntent?.action?.type) {
        return { state: "answer", message: "当前统一大模型不可用。我不会依据关键词擅自操作项目；请先检查统一大模型配置后再试。", tool: null };
    }
    const action = localIntent.action;
    const toolName = action.type === "system_status" ? "inspect_system" : action.type;
    if (!loop_1.GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === toolName)) {
        return { state: "answer", message: `${localIntent.reply}\n\n当前动作还没有接入 Agentic Loop 后端工具，未执行。`, tool: null };
    }
    const spec = loop_1.GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === toolName);
    const fallbackRisk = typeof spec.risk === "function" ? spec.risk(action.params || {}) : spec.risk;
    const deterministicUiTools = new Set(["play_music", "toggle_pet", "navigate"]);
    if (fallbackRisk !== "read" && !deterministicUiTools.has(toolName)) {
        return {
            state: "answer",
            message: "当前统一大模型不可用。规则兜底只允许只读查询和界面动作，不会依据关键词执行任何数据写入、任务派发或项目修改。请恢复统一大模型配置后再执行该操作。",
            tool: null,
            intent: { category: "ambiguous", goal: run.user_message, action_required: false, confidence: 0.2, authorization_basis: "none", reason: "模型不可用，禁止关键词规则代替语义决策执行写操作" },
        };
    }
    return { state: "execute", message: localIntent.reply, tool: { name: toolName, arguments: action.params || {} } };
}
function createMissionSupervisorRuntime(ctx) {
    return {
        inspectMission: (missionId) => (0, collaboration_1.getGlobalDevelopmentMission)(missionId),
        advanceMission: (missionId, options) => (0, collaboration_1.superviseGlobalDevelopmentMissionCycle)(missionId, ctx, options),
        controlMission: (missionId, operation, payload) => (0, collaboration_1.controlGlobalDevelopmentMission)(missionId, operation, ctx, payload),
        onCompleted: async (record, report) => {
            const formatted = (0, mission_supervisor_1.formatGlobalMissionFinalReport)(report);
            (0, memory_3.recordGlobalMissionMemory)({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "completed", report });
            if (record.global_run_id)
                (0, loop_1.completeGlobalAgentSupervision)(record.global_run_id, { ...report, formatted }, "completed");
            if (/feishu/i.test(record.source)) {
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 最终交付报告", markdown: formatted });
            }
        },
        onProgress: async (record, event) => {
            if (event?.type === "waiting_user")
                (0, memory_3.recordGlobalMissionMemory)({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "waiting_user", report: { summary: `全局任务等待人工处理`, remaining_items: (event.items || []).map((item) => item.reason || item.task_id) } });
            if (record.global_run_id && event?.type === "waiting_user")
                (0, loop_1.updateGlobalAgentSupervisionState)(record.global_run_id, "waiting_user");
            if (event?.type !== "waiting_user" || !/feishu/i.test(record.source))
                return;
            const lines = (event.items || []).map((item) => `- ${item.task_id || "任务"}: ${item.reason || "需要人工处理"}`);
            await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 等待人工处理", markdown: `全局任务 ${record.mission_id} 自动恢复已达到安全上限：\n${lines.join("\n")}` });
        },
        onTerminal: async (record, outcome, report) => {
            (0, memory_3.recordGlobalMissionMemory)({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: outcome, report });
            if (record.global_run_id)
                (0, loop_1.completeGlobalAgentSupervision)(record.global_run_id, report, outcome);
            if (/feishu/i.test(record.source)) {
                await (0, collaboration_1.sendFeishuReportMessage)({ title: outcome === "cancelled" ? "全局任务已取消" : "全局任务监督失败", markdown: report?.summary || "全局任务未完成" });
            }
        },
    };
}
async function executeAgenticTool(baseUrl, ctx, name, args, run) {
    const signature = crypto.createHash("sha256").update(`${name}:${JSON.stringify(args || {})}`).digest("hex").slice(0, 24);
    const operationKey = `${run.id}:${signature}`;
    const operation = (0, reliability_ledger_1.acquireIdempotency)({
        scope: "global-agent-tool",
        key: operationKey,
        traceId: run.trace_id,
        leaseMs: 12 * 60 * 1000,
        metadata: { run_id: run.id, tool: name },
    });
    if (!operation.acquired) {
        const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-tool", operationKey, 12 * 60 * 1000) : operation.record;
        if (settled?.status === "completed")
            return { ...(settled.result?.observation || settled.result || {}), replayed: true };
        if (settled?.status === "failed")
            throw new Error(settled.error || `工具 ${name} 的历史执行失败`);
        throw new Error(`工具 ${name} 仍在另一个执行实例中运行`);
    }
    try {
        let observation;
        if (name === "inspect_system") {
            observation = { success: true, ...buildAgenticContext(), missions: (0, collaboration_1.refreshGlobalDevelopmentMissions)().slice(-8) };
        }
        else if (name === "list_projects") {
            observation = { success: true, projects: safeProjectRows() };
        }
        else if (name === "inspect_project") {
            const project = String(args.project || "");
            const config = (0, db_1.getConfigs)().find((item) => item.name === project);
            if (!config)
                throw new Error(`项目不存在：${project}`);
            const info = (0, db_1.getConfigInfo)(config.path)?.[0] || {};
            observation = {
                success: true,
                project,
                config: { work_dir: info.workDir || "", agent: info.agent || "claudecode", platform: info.platform || "" },
                memory: (0, memory_1.buildProjectMemoryPacket)(project, { workDir: info.workDir, query: run.user_message }),
            };
        }
        else if (name === "list_groups") {
            observation = { success: true, groups: buildAgenticContext().groups };
        }
        else if (name === "list_tasks") {
            const tasks = (0, db_1.loadTasks)().filter((task) => !args.id || task.id === args.id).filter((task) => !args.status || task.status === args.status);
            observation = { success: true, tasks: tasks.slice(-50).map(compactTask) };
        }
        else if (name === "list_cron") {
            observation = { success: true, jobs: buildAgenticContext().cron_jobs };
        }
        else if (name === "query_knowledge") {
            observation = { success: true, query: args.query, content: (0, rag_1.queryKnowledgeBase)(String(args.query || "")) || "未检索到相关知识" };
        }
        else if (name === "query_global_memory") {
            observation = { success: true, query: args.query, ...(0, memory_3.recallGlobalAgentMemory)(String(args.query || ""), { sessionId: run.session_id, limit: Number(args.limit || 8) }) };
        }
        else if (name === "query_group_memory") {
            observation = {
                success: true,
                query: args.query,
                group_memory_context: (0, memory_2.buildGlobalGroupMemoryContext)(String(args.query || run.user_message || ""), {
                    sessionId: run.session_id,
                    maxGroups: Number(args.max_groups || args.maxGroups || args.limit || 8),
                    maxTypedMemory: Number(args.max_typed_memory || args.maxTypedMemory || 4),
                }),
            };
        }
        else if (name === "manage_global_memory") {
            const operation = String(args.operation || "").toLowerCase();
            if (operation !== "status" && !String(args.reason || "").trim())
                throw new Error("全局记忆变更操作必须说明原因");
            if (operation === "compact") {
                observation = { success: true, operation, sessions: (0, memory_3.loadGlobalAgentMemory)().sessions.map((session) => (0, memory_3.compactGlobalAgentSession)(session.sessionId, { force: true, reason: args.reason })) };
            }
            else if (operation === "rebuild") {
                observation = { success: true, operation, memory: (0, memory_3.rebuildGlobalAgentMemory)(args.reason, "global-agent") };
            }
            else if (["enable", "disable"].includes(operation)) {
                observation = { success: true, operation, policy: (0, memory_3.setGlobalAgentMemoryPolicy)({ disabled: operation === "disable", reason: args.reason, actor: "global-agent" }) };
            }
            else if (operation === "status") {
                observation = { success: true, operation, policy: (0, memory_3.getGlobalAgentMemoryPolicy)(), memory: (0, memory_3.loadGlobalAgentMemory)() };
            }
            else
                throw new Error(`不支持的全局记忆操作：${operation}`);
        }
        else if (name === "inspect_mission") {
            const mission = (0, collaboration_1.getGlobalDevelopmentMission)(String(args.id || ""));
            if (!mission)
                throw new Error("全局开发任务不存在");
            observation = { success: true, ...mission, supervisor: (0, mission_supervisor_1.getGlobalMissionSupervisor)(String(args.id || "")) };
        }
        else if (name === "inspect_supervision") {
            const supervisor = (0, mission_supervisor_1.getGlobalMissionSupervisor)(String(args.id || ""));
            if (!supervisor)
                throw new Error("全局任务监工不存在");
            observation = { success: true, supervisor, mission: (0, collaboration_1.getGlobalDevelopmentMission)(supervisor.mission_id) };
        }
        else if (name === "orchestrate_development") {
            const missionResult = (0, collaboration_1.createGlobalDevelopmentMission)({
                ...args,
                source: run.source || "global-agent",
                trace_id: run.trace_id,
                idempotency_key: args.idempotency_key || `${run.id}:mission`,
            }, ctx);
            const supervisor = (0, mission_supervisor_1.startGlobalMissionSupervisor)({
                mission_id: missionResult.mission.id,
                global_run_id: run.id,
                trace_id: run.trace_id,
                session_id: run.session_id,
                source: run.source,
                business_goal: missionResult.mission.business_goal || args.business_goal,
                acceptance: missionResult.mission.acceptance_criteria || args.acceptance,
                max_attempts: args.max_attempts || 3,
            });
            (0, loop_1.attachGlobalAgentRunSupervision)(run, { mission_id: missionResult.mission.id, supervisor_id: supervisor.id, state: supervisor.status });
            observation = {
                success: true,
                accepted: true,
                completed: false,
                message: "全局任务已派发并进入持久监督；当前不是完成状态。",
                mission_id: missionResult.mission.id,
                supervisor_id: supervisor.id,
                supervisor_status: supervisor.status,
                children: missionResult.children.map((item) => ({ task_id: item.task?.id, target: item.target?.name, queued: item.queue_result?.queued, status: item.task?.status })),
                rejected: missionResult.rejected,
            };
        }
        else if (name === "manage_supervision") {
            const supervisor = await (0, mission_supervisor_1.controlGlobalMissionSupervisor)(String(args.id || ""), String(args.operation || ""), createMissionSupervisorRuntime(ctx), args);
            if (supervisor.global_run_id) {
                if (supervisor.status === "cancelled")
                    (0, loop_1.completeGlobalAgentSupervision)(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled");
                else
                    (0, loop_1.updateGlobalAgentSupervisionState)(supervisor.global_run_id, supervisor.status);
            }
            observation = { success: true, supervisor, mission: (0, collaboration_1.getGlobalDevelopmentMission)(supervisor.mission_id) };
        }
        else if (name === "navigate") {
            observation = { success: true, message: `Web 客户端可切换到 ${args.tab}`, client_effect: { type: "navigate", params: { tab: args.tab } } };
        }
        else if (name === "git_review") {
            observation = await postLocalApi(baseUrl, "/api/global-agent/git-review", { project: args.project });
        }
        else if (name === "git_commit") {
            observation = await postLocalApi(baseUrl, "/api/git/commit", { project: args.project, message: args.message || "chore: 由全局 Agent 提交变更", files: args.files || [] });
        }
        else if (name === "create_template") {
            observation = await postLocalApi(baseUrl, "/api/templates", { name: args.name, category: args.category || "custom", prompt: args.content || args.prompt || "" });
        }
        else {
            let action = { type: name, params: { ...(args || {}) } };
            if (GLOBAL_MANAGEMENT_ACTIONS[name]) {
                action = annotateGlobalAction(action);
                if (action.validated === false)
                    throw new Error(`缺少参数：${(action.missing_params || []).join("、")}`);
                action.confirmed = true;
            }
            const summary = await executeFeishuAction(baseUrl, action, run.user_message, run.trace_id, { globalRunId: run.id, sessionId: run.session_id, source: run.source });
            observation = { success: true, summary };
        }
        (0, reliability_ledger_1.completeIdempotency)("global-agent-tool", operationKey, { observation });
        return observation;
    }
    catch (error) {
        (0, reliability_ledger_1.failIdempotency)("global-agent-tool", operationKey, error);
        throw error;
    }
}
function createAgenticRuntime(baseUrl, ctx, input = {}) {
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    return {
        callModel: async (messages) => {
            if (!config.apiKey || !config.apiUrl || !config.model)
                throw new Error("统一大模型尚未配置");
            return callLlm(config, messages);
        },
        getContext: (run) => buildAgenticContext(run.user_message, run.session_id),
        executeTool: (name, args, run) => executeAgenticTool(baseUrl, ctx, name, args, run),
        fallbackDecision: (run) => localActionToAgenticDecision(input.localIntent || null, run),
        onEvent: input.onEvent ? (event) => input.onEvent(event) : undefined,
    };
}
async function runAgenticGlobalRequest(baseUrl, ctx, input) {
    const projects = (0, db_1.getConfigs)().map((item) => item.name);
    const groups = (0, collaboration_1.loadGroups)();
    const localIntent = inferLocalGlobalAction(input.message, projects, groups, { cronJobs: (0, db_1.loadCronJobs)(), tasks: (0, db_1.loadTasks)(), mcpTools: (0, db_1.loadMcpTools)(), skills: (0, db_1.loadSkills)() });
    const runtime = createAgenticRuntime(baseUrl, ctx, { localIntent, onEvent: input.onEvent });
    const sessionId = input.sessionId || "default";
    if (!/feishu/i.test(input.source || "")) {
        try {
            (0, memory_3.ingestGlobalAgentConversation)({ sessionId, source: input.source || "web", messages: [...(input.history || []), { role: "user", content: input.message, timestamp: new Date().toISOString(), trace_id: input.traceId }] });
        }
        catch (error) {
            console.warn(`[全局记忆] Agentic 请求写入失败：${error?.message || error}`);
        }
    }
    const startsNewTopic = /^(?:新问题|换个问题|另外(?:一个)?问题|忽略刚才|取消刚才|重新开始)/.test(String(input.message || "").trim());
    const waitingClarification = startsNewTopic ? null : (0, loop_1.findClarifyingGlobalAgentRun)(sessionId);
    const run = waitingClarification
        ? await (0, loop_1.continueGlobalAgentRunWithClarification)(waitingClarification.id, input.message, runtime, {
            explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
        })
        : await (0, loop_1.startGlobalAgentRun)({
            message: input.message,
            history: input.history || [],
            sessionId,
            source: input.source || "web",
            traceId: input.traceId,
            explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
            maxSteps: 10,
            timeoutMs: 12 * 60 * 1000,
        }, runtime);
    if (!/feishu/i.test(input.source || "")) {
        try {
            (0, memory_3.ingestGlobalAgentConversation)({ sessionId, source: input.source || "web", messages: [{ role: "assistant", content: run.final_reply || "", timestamp: new Date().toISOString(), trace_id: run.trace_id, mission_id: run.mission_id }] });
        }
        catch (error) {
            console.warn(`[全局记忆] Agentic 结果写入失败：${error?.message || error}`);
        }
    }
    return run;
}
async function resumeGlobalAgentLoopsForServer(ctx, port) {
    const result = await (0, loop_1.recoverInterruptedGlobalAgentRuns)(createAgenticRuntime(`http://127.0.0.1:${port}`, ctx));
    for (const run of result.results || []) {
        if (!["completed", "failed", "cancelled"].includes(run.status))
            continue;
        (0, reliability_ledger_1.settleIdempotencyByTrace)(run.trace_id, run.status === "completed" ? "completed" : "failed", { run_id: run.id, status: run.status, recovered: true }, ["global-agent-request", "feishu-control-message", "feishu-event"]);
    }
    return result;
}
function startGlobalMissionSupervisionForServer(ctx) {
    return (0, mission_supervisor_1.startGlobalMissionSupervisorScheduler)(createMissionSupervisorRuntime(ctx));
}
function bootstrapGlobalAgentMemoryForServer() {
    const store = loadGlobalAgentHistoryStore();
    const results = [];
    for (const session of store.sessions || []) {
        try {
            results.push((0, memory_3.ingestGlobalAgentConversation)({ sessionId: session.id, source: session.source || "history-migration", messages: session.messages || [] }));
        }
        catch (error) {
            results.push({ sessionId: session.id, error: error?.message || String(error) });
        }
    }
    return { total: (store.sessions || []).length, migrated: results.filter(item => !item.error).length, results };
}
function stopGlobalMissionSupervisionForServer() {
    (0, mission_supervisor_1.stopGlobalMissionSupervisorScheduler)();
}
function publicGlobalAgentRun(run, includeObservations = false) {
    if (!run)
        return null;
    const steps = includeObservations ? run.steps : run.steps.map((step) => {
        if (step.observation === undefined)
            return step;
        let serialized = "";
        try {
            serialized = JSON.stringify(step.observation);
        }
        catch {
            serialized = String(step.observation);
        }
        return serialized.length <= 4_000 ? step : { ...step, observation: { truncated: true, preview: serialized.slice(0, 4_000), original_chars: serialized.length } };
    });
    return {
        id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        source: run.source,
        status: run.status,
        phase: run.phase,
        explicit_write_authorization: run.explicit_write_authorization,
        created_at: run.created_at,
        updated_at: run.updated_at,
        completed_at: run.completed_at,
        deadline_at: run.deadline_at,
        max_steps: run.max_steps,
        steps,
        pending_tool: run.pending_tool,
        final_reply: run.final_reply,
        error: run.error,
        resume_count: run.resume_count,
        model_calls: run.model_calls,
        tool_calls: run.tool_calls,
        client_effects: run.client_effects,
        mission_id: run.mission_id,
        supervisor_id: run.supervisor_id,
        supervision_state: run.supervision_state,
        final_delivery_report: run.final_delivery_report,
        final_report: run.final_report,
        display_stream: run.display_stream,
        displayStream: run.display_stream,
        workchain: run.workchain,
        decision_summary: run.decision_summary,
        clarification_question: run.clarification_question,
        clarification_summary: run.clarification_summary || run.clarificationSummary || null,
        clarificationSummary: run.clarification_summary || run.clarificationSummary || null,
        confirmation_summary: run.confirmation_summary || run.confirmationSummary || null,
        confirmationSummary: run.confirmation_summary || run.confirmationSummary || null,
        plan_mode: run.plan_mode || run.planMode || null,
        planMode: run.plan_mode || run.planMode || null,
        shadow_mode: run.shadow_mode,
        original_user_message: run.original_user_message,
        reasoning_loop: run.reasoning_loop,
        runtime_debug: (0, runtime_1.buildGlobalAgentSessionDebug)(run),
    };
}
function buildPublicGlobalStatusRun(input) {
    const now = new Date().toISOString();
    const displayStream = {
        schema: "ccm-global-status-summary-v1",
        user_visible_text: input.reply,
        technical_details: [],
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: true },
    };
    return {
        id: `global-status-${crypto.randomBytes(5).toString("hex")}`,
        trace_id: (0, reliability_ledger_1.ensureTraceId)(input.traceId, "global-status"),
        session_id: input.sessionId,
        source: input.source,
        status: "completed",
        phase: "complete",
        explicit_write_authorization: false,
        created_at: now,
        updated_at: now,
        completed_at: now,
        deadline_at: now,
        max_steps: 1,
        steps: [{
                index: 1,
                at: now,
                state: "answer",
                message: input.reply,
                plan: [],
                decision: { intent: { category: "question", action_required: false, reason: "用户询问当前任务进展，直接读取已有状态摘要。" } },
            }],
        pending_tool: null,
        final_reply: input.reply,
        error: "",
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        client_effects: [],
        mission_id: "",
        supervisor_id: "",
        supervision_state: "",
        final_delivery_report: null,
        final_report: null,
        display_stream: displayStream,
        displayStream,
        workchain: null,
        decision_summary: { intent: { category: "question", action_required: false, confidence: 0.99, reason: "用户询问当前任务进展。" } },
        clarification_question: "",
        shadow_mode: false,
        original_user_message: input.message,
        reasoning_loop: null,
        runtime_debug: { technical_details: [] },
    };
}
async function processFeishuGlobalAgentMessage(baseUrl, ctx, text, payload, options = {}) {
    const sendReport = options.sendReport !== false;
    const traceId = (0, reliability_ledger_1.ensureTraceId)(options.traceId, "feishu");
    const conversationId = buildFeishuConversationId(payload);
    const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
    appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
    const auditBase = {
        source: "feishu-control-bot",
        sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
        message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
        trace_id: traceId,
    };
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
    try {
        if (/^(帮助|help|\/help)$/i.test(text)) {
            const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个群聊/项目 Agent 下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
            if (sendReport)
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent 使用帮助", markdown });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            return markdown;
        }
        if (isGlobalProgressStatusRequest(text)) {
            const markdown = formatMissionStatus();
            appendGlobalActionAudit({ ...auditBase, action: { type: "mission_status", params: { message: text } }, status: "success", result: { summary: markdown } });
            if (sendReport)
                await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局任务状态", markdown });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            return markdown;
        }
        const confirmationMatch = text.match(/^(确认(?:执行)?|同意|取消)(?:\s+([a-z0-9_-]+))?[。！!\s]*$/i);
        let run;
        if (confirmationMatch) {
            const requestedId = String(confirmationMatch[2] || "").trim();
            const waiting = requestedId ? (0, loop_1.getGlobalAgentRun)(requestedId) : (0, loop_1.findWaitingGlobalAgentRun)(conversationId);
            if (!waiting || waiting.status !== "waiting_confirmation") {
                const markdown = "当前没有等待你确认的全局 Agent 操作。";
                appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
                if (sendReport)
                    await (0, collaboration_1.sendFeishuReportMessage)({ title: "全局 Agent", markdown });
                return markdown;
            }
            run = await (0, loop_1.resumeGlobalAgentRun)(waiting.id, createAgenticRuntime(baseUrl, ctx), {
                approved: !/^取消/i.test(confirmationMatch[1]),
                cancelled: /^取消/i.test(confirmationMatch[1]),
            });
        }
        else {
            run = await runAgenticGlobalRequest(baseUrl, ctx, {
                message: text,
                history: historyBeforeUser.map((item) => ({ role: item.role, content: item.content })),
                sessionId: conversationId,
                source: "feishu-control-bot",
                traceId,
            });
        }
        const confirmationHint = run.status === "waiting_confirmation"
            ? `\n\n待确认操作：${run.pending_tool?.name || "写入操作"}\n运行 ID：${run.id}\n回复“确认 ${run.id}”继续，或回复“取消 ${run.id}”。`
            : "";
        const markdown = `${run.final_reply || "已处理。"}${confirmationHint}`;
        appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport)
            await (0, collaboration_1.sendFeishuReportMessage)({ title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行结果", markdown });
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
                const conversationId = buildFeishuConversationId(payload);
                const messageId = getFeishuMessageId(payload);
                const operationKey = messageId ? `${conversationId}:${messageId}` : "";
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "feishu-control-message", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { conversation_id: conversationId, message_id: messageId } }) : null;
                if (operation && !operation.acquired) {
                    const settled = operation.inProgress ? await waitForIdempotencyResult("feishu-control-message", operationKey) : operation.record;
                    const replay = settled?.result || {};
                    (0, utils_1.sendJson)(res, { success: settled?.status === "completed", duplicate: true, message: "重复控制消息已抑制", reply: replay.reply || replay.error || "消息仍在处理中", trace_id: settled?.trace_id || operation.traceId });
                    return;
                }
                const reply = await processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { sendReport: !isAcp, traceId: operation?.traceId });
                if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("feishu-control-message", operationKey, { reply });
                (0, utils_1.sendJson)(res, { success: true, message: "控制机器人消息已处理", reply, trace_id: operation?.traceId || "" });
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
                const messageId = getFeishuMessageId(payload);
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
                const operationKey = messageId || String(payload?.header?.event_id || "").trim();
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "feishu-event", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { message_id: messageId, event_id: payload?.header?.event_id || "" } }) : null;
                if (operation && !operation.acquired)
                    return;
                void processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { traceId: operation?.traceId })
                    .then(reply => { if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("feishu-event", operationKey, { reply }); })
                    .catch(error => { if (operationKey)
                    (0, reliability_ledger_1.failIdempotency)("feishu-event", operationKey, error); });
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
                const supervisor = (0, mission_supervisor_1.startGlobalMissionSupervisor)({
                    mission_id: result.mission.id,
                    global_run_id: payload.global_run_id || payload.globalRunId || "",
                    trace_id: result.mission.trace_id,
                    session_id: payload.session_id || payload.sessionId || "default",
                    source: payload.source || "global-agent-chat",
                    business_goal: result.mission.business_goal,
                    acceptance: result.mission.acceptance_criteria,
                    max_attempts: payload.max_attempts || payload.maxAttempts || 3,
                });
                (0, utils_1.sendJson)(res, { ...result, supervisor });
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
            (0, utils_1.sendJson)(res, { success: true, ...result, supervisor: (0, mission_supervisor_1.getGlobalMissionSupervisor)(id) });
            return true;
        }
        const missions = (0, collaboration_1.refreshGlobalDevelopmentMissions)();
        (0, utils_1.sendJson)(res, { success: true, missions });
        return true;
    }
    if (pathname === "/api/global-agent/supervisors" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.mission_id || parsed.query.missionId || "").trim();
        if (id) {
            const supervisor = (0, mission_supervisor_1.getGlobalMissionSupervisor)(id);
            if (!supervisor)
                return (0, utils_1.sendJson)(res, { success: false, error: "全局任务监工不存在" }, 404), true;
            (0, utils_1.sendJson)(res, { success: true, supervisor, mission: (0, collaboration_1.getGlobalDevelopmentMission)(supervisor.mission_id) });
            return true;
        }
        (0, utils_1.sendJson)(res, {
            success: true,
            supervisors: (0, mission_supervisor_1.listGlobalMissionSupervisors)({ status: String(parsed.query.status || "") || undefined, limit: Number(parsed.query.limit || 50) }),
            scheduler: (0, mission_supervisor_1.getGlobalMissionSupervisorSchedulerStatus)(),
        });
        return true;
    }
    if (pathname === "/api/global-agent/supervisors/self-test" && req.method === "GET") {
        void (0, mission_supervisor_1.runGlobalMissionSupervisorAsyncSelfTest)()
            .then(asyncResult => {
            const unit = (0, mission_supervisor_1.runGlobalMissionSupervisorSelfTest)();
            const pass = unit.pass && asyncResult.pass;
            (0, utils_1.sendJson)(res, { success: pass, result: { pass, unit, async_e2e: asyncResult } }, pass ? 200 : 500);
        })
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500));
        return true;
    }
    if (pathname === "/api/global-agent/supervisors/control" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.supervisor_id || payload.mission_id || "").trim();
                if (!id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少监工或全局任务 ID" }, 400);
                const operation = String(payload.operation || "check_now");
                const supervisor = operation === "check_now"
                    ? await (0, mission_supervisor_1.checkGlobalMissionSupervisorNow)(id, createMissionSupervisorRuntime(ctx))
                    : await (0, mission_supervisor_1.controlGlobalMissionSupervisor)(id, operation, createMissionSupervisorRuntime(ctx), payload);
                (0, utils_1.sendJson)(res, { success: true, supervisor, mission: (0, collaboration_1.getGlobalDevelopmentMission)(supervisor.mission_id) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/tools" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, tools: (0, runtime_1.buildGlobalAgentToolDefinitions)(loop_1.GLOBAL_AGENT_TOOL_SPECS) });
        return true;
    }
    if (pathname === "/api/global-agent/control-center" && req.method === "GET") {
        const message = String(parsed.query.message || "").trim();
        (0, utils_1.sendJson)(res, { success: true, control: (0, control_center_1.buildGlobalControlCenterSnapshot)(message) });
        return true;
    }
    if (pathname === "/api/global-agent/control-center/intent-preview" && req.method === "GET") {
        const message = String(parsed.query.message || "").trim();
        (0, utils_1.sendJson)(res, { success: true, intent: (0, control_center_1.classifyGlobalControlIntent)(message), dispatch: (0, control_center_1.buildGlobalDispatchStrategy)(message) });
        return true;
    }
    if (pathname === "/api/global-agent/control-center/health" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, health: (0, control_center_1.buildGlobalSystemHealth)() });
        return true;
    }
    if (pathname === "/api/global-agent/group-memory" && req.method === "GET") {
        const query = String(parsed.query.query || parsed.query.q || "").trim();
        (0, utils_1.sendJson)(res, {
            success: true,
            group_memory_context: (0, memory_2.buildGlobalGroupMemoryContext)(query, {
                sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
                maxGroups: Number(parsed.query.max_groups || parsed.query.maxGroups || 8),
                maxTypedMemory: Number(parsed.query.max_typed_memory || parsed.query.maxTypedMemory || 4),
            }),
        });
        return true;
    }
    if (pathname === "/api/global-agent/group-memory/self-test" && req.method === "GET") {
        const result = (0, memory_2.runGlobalGroupMemoryContextSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/control-center/self-test" && req.method === "GET") {
        const result = (0, control_center_1.runGlobalControlCenterSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/runtime/permissions" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, rules: (0, runtime_1.loadGlobalAgentPermissionRules)() });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/permissions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = payload.operation === "delete" || payload.delete === true
                    ? (0, runtime_1.deleteGlobalAgentPermissionRule)(String(payload.id || ""))
                    : (0, runtime_1.saveGlobalAgentPermissionRule)(payload);
                (0, utils_1.sendJson)(res, { success: true, result, rules: (0, runtime_1.loadGlobalAgentPermissionRules)() });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/hooks" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, hooks: (0, runtime_1.loadGlobalAgentHooks)() });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/hooks" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = payload.operation === "delete" || payload.delete === true
                    ? (0, runtime_1.deleteGlobalAgentHook)(String(payload.id || ""))
                    : (0, runtime_1.saveGlobalAgentHook)(payload);
                (0, utils_1.sendJson)(res, { success: true, result, hooks: (0, runtime_1.loadGlobalAgentHooks)() });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/background" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.run_id || "").trim();
        if (!id)
            return (0, utils_1.sendJson)(res, { success: false, error: "缺少运行 ID" }, 400), true;
        const run = (0, loop_1.getGlobalAgentRun)(id);
        (0, utils_1.sendJson)(res, { success: true, run: publicGlobalAgentRun(run), runtime: (0, runtime_1.getGlobalAgentBackgroundOutput)(id) });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/background/control" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || "").trim();
                const operation = String(payload.operation || "").toLowerCase();
                if (!id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少运行 ID" }, 400);
                let run;
                if (operation === "stop" || operation === "cancel")
                    run = (0, loop_1.cancelGlobalAgentRun)(id);
                else if (operation === "pause")
                    run = (0, loop_1.pauseGlobalAgentRun)(id);
                else if (operation === "resume" || operation === "takeover")
                    run = await (0, loop_1.resumeGlobalAgentRun)(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), { approved: payload.approved === true ? true : undefined });
                else
                    throw new Error("operation 必须是 stop、pause、resume 或 takeover");
                (0, utils_1.sendJson)(res, { success: true, run: publicGlobalAgentRun(run), runtime: (0, runtime_1.getGlobalAgentBackgroundOutput)(id) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/session-debug" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.run_id || "").trim();
        if (!id)
            return (0, utils_1.sendJson)(res, { success: false, error: "缺少运行 ID" }, 400), true;
        const run = (0, loop_1.getGlobalAgentRun)(id);
        if (!run)
            return (0, utils_1.sendJson)(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
        (0, utils_1.sendJson)(res, { success: true, debug: (0, runtime_1.buildGlobalAgentSessionDebug)(run) });
        return true;
    }
    if (pathname === "/api/global-agent/runtime/self-test" && req.method === "GET") {
        const result = (0, runtime_1.runGlobalAgentRuntimeSelfTest)(loop_1.GLOBAL_AGENT_TOOL_SPECS);
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/agentic/tools" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, tools: (0, runtime_1.buildGlobalAgentToolDefinitions)(loop_1.GLOBAL_AGENT_TOOL_SPECS) });
        return true;
    }
    if (pathname === "/api/global-agent/agentic/self-test" && req.method === "GET") {
        void (0, loop_1.runGlobalAgentLoopSelfTest)()
            .then(result => (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500));
        return true;
    }
    if (pathname === "/api/global-agent/quality" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, quality: (0, quality_center_1.buildAgentQualitySnapshot)({ tasks: (0, db_1.loadTasks)(), sessions: (0, agent_sessions_1.listTaskAgentSessions)() }) });
        return true;
    }
    if (pathname === "/api/global-agent/quality" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const policy = (0, quality_center_1.setAgentQualityPolicy)({
                    shadowMode: payload.shadowMode ?? payload.shadow_mode,
                    minWriteConfidence: payload.minWriteConfidence ?? payload.min_write_confidence,
                    requireGroundedTarget: payload.requireGroundedTarget ?? payload.require_grounded_target,
                    actor: payload.actor || "local-user",
                    reason: payload.reason,
                });
                (0, utils_1.sendJson)(res, { success: true, policy, quality: (0, quality_center_1.buildAgentQualitySnapshot)({ tasks: (0, db_1.loadTasks)(), sessions: (0, agent_sessions_1.listTaskAgentSessions)() }) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/quality/self-test" && req.method === "GET") {
        const result = (0, quality_center_1.runAgentQualityCenterSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/reasoning/self-test" && req.method === "GET") {
        const result = (0, reasoning_loop_1.runAgentReasoningLoopSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/runtime-kernel/self-test" && req.method === "GET") {
        const result = (0, runtime_kernel_1.runAgentRuntimeKernelSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/global-agent/trace-replay" && req.method === "GET") {
        const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
        (0, utils_1.sendJson)(res, {
            success: true,
            replay: traceId ? (0, runtime_kernel_1.replayAgentTrace)(traceId) : (0, runtime_kernel_1.buildTraceReplaySuite)(Number(parsed.query.limit || 20)),
        });
        return true;
    }
    if (pathname === "/api/global-agent/runs" && req.method === "GET") {
        const id = String(parsed.query.id || "").trim();
        if (id) {
            const run = (0, loop_1.getGlobalAgentRun)(id);
            if (!run)
                return (0, utils_1.sendJson)(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
            (0, utils_1.sendJson)(res, { success: true, run: publicGlobalAgentRun(run, String(parsed.query.detail || "") === "full") });
            return true;
        }
        const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
        const status = String(parsed.query.status || "").trim();
        (0, utils_1.sendJson)(res, { success: true, runs: (0, loop_1.listGlobalAgentRuns)({ sessionId: sessionId || undefined, status: status || undefined, limit: Number(parsed.query.limit || 30) }).map(run => publicGlobalAgentRun(run)) });
        return true;
    }
    if (["/api/global-agent/runs/confirm", "/api/global-agent/runs/resume", "/api/global-agent/runs/pause", "/api/global-agent/runs/cancel"].includes(pathname) && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || "").trim();
                if (!id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少运行 ID" }, 400);
                let run;
                const storedRun = (0, loop_1.getGlobalAgentRun)(id);
                if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
                    const operation = pathname.endsWith("/cancel") ? "cancel" : pathname.endsWith("/pause") ? "pause" : pathname.endsWith("/resume") ? "resume" : "";
                    if (operation) {
                        const supervisor = await (0, mission_supervisor_1.controlGlobalMissionSupervisor)(storedRun.supervisor_id, operation, createMissionSupervisorRuntime(ctx), payload);
                        run = operation === "cancel"
                            ? (0, loop_1.completeGlobalAgentSupervision)(id, { summary: "全局任务已由用户取消。" }, "cancelled")
                            : (0, loop_1.updateGlobalAgentSupervisionState)(id, supervisor.status);
                    }
                }
                if (!run) {
                    if (pathname.endsWith("/pause"))
                        run = (0, loop_1.pauseGlobalAgentRun)(id);
                    else if (pathname.endsWith("/cancel"))
                        run = (0, loop_1.cancelGlobalAgentRun)(id);
                    else
                        run = await (0, loop_1.resumeGlobalAgentRun)(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
                            approved: pathname.endsWith("/confirm") ? payload.approved !== false : undefined,
                            cancelled: pathname.endsWith("/confirm") && payload.approved === false,
                        });
                }
                (0, utils_1.sendJson)(res, { success: true, run: publicGlobalAgentRun(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/global-agent/run" && req.method === "POST") {
        const contentType = String(req.headers["content-type"] || "");
        const handleRun = async (payload, files = []) => {
            const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
            if (isStream) {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                });
                if (typeof res.flushHeaders === "function")
                    res.flushHeaders();
            }
            const emit = (event) => {
                if (!isStream || res.writableEnded)
                    return;
                const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
                res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
            };
            try {
                let message = String(payload.message || "").trim();
                if (files.length) {
                    const fileContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                    message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
                }
                if (!message)
                    throw new Error("消息不能为空");
                let history = [];
                try {
                    history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]"));
                }
                catch { }
                const sessionId = String(payload.session_id || payload.sessionId || "web:default");
                ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在思考...", { tab: "global-agent" }, 12 * 60 * 1000);
                ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role: "user", text: message, final: true, source: "global" });
                const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || "").trim();
                const operationKey = requestId ? `${sessionId}:${requestId}` : "";
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "global-agent-request", key: operationKey, leaseMs: 13 * 60 * 1000, metadata: { session_id: sessionId, source: "web" } }) : null;
                if (operation && !operation.acquired) {
                    const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-request", operationKey, 13 * 60 * 1000) : operation.record;
                    const replayRun = settled?.result?.run_id ? (0, loop_1.getGlobalAgentRun)(settled.result.run_id) : null;
                    const result = settled?.result?.run || (replayRun ? publicGlobalAgentRun(replayRun) : null);
                    if (!result)
                        throw new Error(settled?.error || "重复请求仍在处理中");
                    if (isStream) {
                        emit({ type: "result", run: result, duplicate: true });
                        emit({ type: "done" });
                        res.end();
                    }
                    else
                        (0, utils_1.sendJson)(res, { success: true, run: result, duplicate: true });
                    return;
                }
                if (isGlobalProgressStatusRequest(message)) {
                    const reply = formatMissionStatus();
                    const result = buildPublicGlobalStatusRun({ message, reply, sessionId, source: "web", traceId: operation?.traceId });
                    try {
                        (0, memory_3.ingestGlobalAgentConversation)({
                            sessionId,
                            source: "web",
                            messages: [
                                ...history,
                                { role: "user", content: message, timestamp: new Date().toISOString(), trace_id: operation?.traceId },
                                { role: "assistant", content: reply, timestamp: new Date().toISOString(), trace_id: result.trace_id },
                            ],
                        });
                    }
                    catch (error) {
                        console.warn(`[全局记忆] 状态追问写入失败：${error?.message || error}`);
                    }
                    appendGlobalActionAudit({ source: "web", action: { type: "mission_status", params: { message } }, status: "success", result: { summary: reply, trace_id: result.trace_id } });
                    if (operationKey)
                        (0, reliability_ledger_1.completeIdempotency)("global-agent-request", operationKey, { run: result, status: result.status });
                    if (isStream) {
                        emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
                        emit({ type: "done" });
                        res.end();
                    }
                    else
                        (0, utils_1.sendJson)(res, { success: true, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
                    return;
                }
                let finalPetEventRelayed = false;
                const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
                    message,
                    history,
                    sessionId,
                    source: "web",
                    traceId: operation?.traceId,
                    onEvent: (event) => {
                        emit(event);
                        relayGlobalPetEvent(ctx, event);
                        if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
                            finalPetEventRelayed = true;
                        }
                    },
                });
                if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("global-agent-request", operationKey, { run_id: run.id, status: run.status });
                const result = publicGlobalAgentRun(run);
                if (!finalPetEventRelayed) {
                    relayGlobalPetEvent(ctx, { type: run.status === "failed" ? "failed" : "completed", run }, { finalRun: result });
                }
                if (isStream) {
                    emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
                    emit({ type: "done" });
                    res.end();
                }
                else
                    (0, utils_1.sendJson)(res, { success: true, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
            }
            catch (error) {
                relayGlobalPetEvent(ctx, { type: "failed", error: error?.message || String(error) }, { error: error?.message || String(error) });
                if (isStream) {
                    emit({ type: "error", text: error?.message || String(error) });
                    emit({ type: "done" });
                    res.end();
                }
                else
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then(buffer => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                return handleRun(fields || {}, files || []);
            }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
        }
        else {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    void handleRun(body ? JSON.parse(body) : {}, []);
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
        }
        return true;
    }
    if (pathname === "/api/global-agent/chat" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleAgenticChatProxy = async (payload, files = []) => {
            const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
            if (isStream) {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                });
                if (typeof res.flushHeaders === "function")
                    res.flushHeaders();
            }
            const emit = (event) => {
                if (!isStream || res.writableEnded)
                    return;
                const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
                res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
            };
            try {
                let message = String(payload.message || "").trim();
                if (files.length) {
                    const fileContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                    message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
                }
                if (!message)
                    throw new Error("消息不能为空");
                let history = [];
                try {
                    history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]"));
                }
                catch { }
                const sessionId = String(payload.session_id || payload.sessionId || "legacy:web");
                if (isGlobalProgressStatusRequest(message)) {
                    const reply = formatMissionStatus();
                    const result = buildPublicGlobalStatusRun({ message, reply, sessionId, source: "legacy-chat-proxy" });
                    try {
                        (0, memory_3.ingestGlobalAgentConversation)({
                            sessionId,
                            source: "legacy-chat-proxy",
                            messages: [
                                ...history,
                                { role: "user", content: message, timestamp: new Date().toISOString() },
                                { role: "assistant", content: reply, timestamp: new Date().toISOString(), trace_id: result.trace_id },
                            ],
                        });
                    }
                    catch (error) {
                        console.warn(`[全局记忆] 状态追问写入失败：${error?.message || error}`);
                    }
                    if (isStream) {
                        emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
                        emit({ type: "done" });
                        res.end();
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: true, reply, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })), agentic: true });
                    }
                    return;
                }
                const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
                    message,
                    history,
                    sessionId,
                    source: "legacy-chat-proxy",
                    onEvent: emit,
                });
                const result = publicGlobalAgentRun(run);
                const responseFiles = files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath }));
                if (isStream) {
                    emit({ type: "result", run: result, files: responseFiles });
                    emit({ type: "done" });
                    res.end();
                }
                else {
                    (0, utils_1.sendJson)(res, { success: true, reply: run.final_reply || "", run: result, files: responseFiles, agentic: true });
                }
            }
            catch (error) {
                if (isStream) {
                    emit({ type: "error", text: error?.message || String(error) });
                    emit({ type: "done" });
                    res.end();
                }
                else {
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
                }
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then(buffer => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                return handleAgenticChatProxy(fields || {}, files || []);
            }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
        }
        else {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    void handleAgenticChatProxy(body ? JSON.parse(body) : {}, []);
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
        }
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