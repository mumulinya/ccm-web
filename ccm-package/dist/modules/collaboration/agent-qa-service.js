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
exports.AGENT_QA_TIMEOUT_MS = void 0;
exports.configureAgentQaService = configureAgentQaService;
exports.loadAgentQaItems = loadAgentQaItems;
exports.saveAgentQaItems = saveAgentQaItems;
exports.upsertAgentQaItem = upsertAgentQaItem;
exports.markExpiredAgentQaItems = markExpiredAgentQaItems;
exports.getAgentQaItemsForGroup = getAgentQaItemsForGroup;
exports.setAgentQaManualTakeover = setAgentQaManualTakeover;
exports.buildAgentQaMessage = buildAgentQaMessage;
exports.emitAgentQaEvent = emitAgentQaEvent;
exports.setAgentQaArbitration = setAgentQaArbitration;
exports.appendAgentQaTrace = appendAgentQaTrace;
exports.writeAcceptedAgentQaToProjectMemory = writeAcceptedAgentQaToProjectMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const memory_1 = require("../../projects/memory");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const memory_2 = require("./memory");
const logs_1 = require("./logs");
exports.AGENT_QA_TIMEOUT_MS = 5 * 60 * 1000;
const AGENT_QA_FILE = path.join(utils_1.CCM_DIR, "agent-qa.json");
let deps = {};
function configureAgentQaService(next) {
    deps = { ...deps, ...next };
}
function loadAgentQaItems() {
    if (!fs.existsSync(AGENT_QA_FILE))
        return [];
    try {
        const data = JSON.parse(fs.readFileSync(AGENT_QA_FILE, "utf-8"));
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
function saveAgentQaItems(items) {
    fs.writeFileSync(AGENT_QA_FILE, JSON.stringify((items || []).slice(-800), null, 2));
}
function upsertAgentQaItem(item) {
    const items = loadAgentQaItems();
    const idx = items.findIndex((entry) => entry.id === item.id);
    const existing = idx >= 0 ? items[idx] : {};
    const now = new Date().toISOString();
    const next = {
        created_at: existing.created_at || item.created_at || now,
        retry_count: Number(existing.retry_count || item.retry_count || 0),
        manual_takeover: !!(existing.manual_takeover || item.manual_takeover),
        ...existing,
        ...item,
        updated_at: now,
    };
    if (idx >= 0)
        items[idx] = next;
    else
        items.push(next);
    saveAgentQaItems(items);
    return next;
}
function markExpiredAgentQaItems(groupId = "") {
    const nowMs = Date.now();
    const items = loadAgentQaItems();
    let changed = false;
    const expired = [];
    for (const item of items) {
        if (groupId && item.group_id !== groupId)
            continue;
        if (!["waiting", "asking", "queued"].includes(String(item.status || "")))
            continue;
        const timeoutAt = item.timeout_at ? Date.parse(item.timeout_at) : 0;
        if (!timeoutAt || timeoutAt > nowMs)
            continue;
        item.status = "timeout";
        item.timed_out_at = new Date().toISOString();
        item.updated_at = item.timed_out_at;
        item.audit = [...(Array.isArray(item.audit) ? item.audit : []), { at: item.timed_out_at, type: "timeout", detail: "目标 Agent 未在预期时间内回答" }].slice(-30);
        appendAgentQaTrace(item.task_id || "", "agent.qa.timeout", item, "目标 Agent 未在截止时间前回答，等待主 Agent 重试、换人或人工接管", "warn", { deadline_at: item.deadline_at || item.timeout_at || "" });
        if (item.task_id)
            (0, logs_1.appendTaskTimelineEvent)(item.task_id, { type: "agent_qa_timeout", title: `${item.to_agent || "目标 Agent"} 回答超时`, detail: `问题 ${item.id} 已触发超时熔断`, status: "warn", phase: "waiting_dependency", agent: item.from_agent || "", data: { qa_id: item.id, deadline_at: item.deadline_at || item.timeout_at || "" } });
        expired.push(item);
        changed = true;
    }
    if (changed)
        saveAgentQaItems(items);
    return expired;
}
function getAgentQaItemsForGroup(groupId, limit = 80) {
    markExpiredAgentQaItems(groupId || "");
    return loadAgentQaItems()
        .filter((item) => !groupId || item.group_id === groupId)
        .slice(-limit);
}
function setAgentQaManualTakeover(id, reason = "") {
    const current = loadAgentQaItems().find((item) => item.id === id);
    if (!current)
        return null;
    return upsertAgentQaItem({
        ...current,
        status: "manual",
        manual_takeover: true,
        manual_reason: (0, memory_2.compactMemoryText)(reason || "用户接管该 Agent 问答", 500),
        manual_at: new Date().toISOString(),
        audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: new Date().toISOString(), type: "manual_takeover", detail: reason || "用户接管" }].slice(-30),
    });
}
function buildAgentQaMessage(kind, qa, content = "") {
    const qaContent = content || qa.answer || qa.question || "";
    return {
        id: "m" + Date.now().toString(36) + "qa" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: kind === "answer" ? qa.to_agent : qa.from_agent,
        type: "agent_qa",
        content: qaContent,
        timestamp: new Date().toISOString(),
        task_id: qa.task_id || undefined,
        qa: {
            ...qa,
            kind,
            status: kind === "question" ? "waiting" : qa.status || "answered",
        },
    };
}
function emitAgentQaEvent(streamRes, kind, qa, content = "") {
    if (!deps.writeSse)
        return;
    deps.writeSse(streamRes, {
        type: "agent_qa",
        kind,
        qa: {
            ...qa,
            kind,
            content: content || qa.answer || qa.question || "",
        },
    });
}
function setAgentQaArbitration(id, decision, reason = "") {
    const current = loadAgentQaItems().find((item) => item.id === id);
    if (!current)
        return null;
    const at = new Date().toISOString();
    const accepted = decision === "accept";
    const next = upsertAgentQaItem({
        ...current,
        status: accepted ? "answered" : "rejected",
        acceptance: {
            ...(current.acceptance || {}),
            status: accepted ? "accepted" : "rejected",
            accepted,
            reason: (0, memory_2.compactMemoryText)(reason || (accepted ? "主 Agent 人工采纳回答" : "主 Agent 人工拒绝回答"), 800),
            arbitrated_by: "group_coordinator_manual",
            arbitrated_at: at,
        },
        audit: [...(Array.isArray(current.audit) ? current.audit : []), { at, type: accepted ? "manual_accept" : "manual_reject", detail: reason || "主 Agent 人工仲裁" }].slice(-30),
    });
    appendAgentQaTrace(next.task_id || "", accepted ? "agent.qa.accepted" : "agent.qa.rejected", next, next.acceptance.reason, accepted ? "ok" : "warn", { acceptance: next.acceptance });
    if (accepted)
        writeAcceptedAgentQaToProjectMemory(next);
    if (next.task_id)
        (0, logs_1.appendTaskTimelineEvent)(next.task_id, { type: accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `主 Agent ${accepted ? "采纳" : "拒绝"}问答`, detail: next.acceptance.reason, status: accepted ? "ok" : "warn", phase: accepted ? "executing" : "waiting_dependency", agent: next.from_agent || "", data: { qa_id: next.id, acceptance: next.acceptance } });
    return next;
}
function appendAgentQaTrace(taskId, type, qa, message, status = "info", data = {}) {
    if (!taskId)
        return "";
    const task = deps.getTaskById?.(taskId);
    if (!task)
        return "";
    const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id || "", `task_${taskId}`);
    if (traceId !== task.trace_id)
        deps.updateTask?.(taskId, { trace_id: traceId });
    (0, reliability_ledger_1.appendTraceEvent)(traceId, {
        id: `${qa?.id || qa?.question_id || "qa"}:${type}:${Date.now()}`,
        type,
        status,
        task_id: taskId,
        group_id: qa?.group_id || task.group_id || "",
        agent: qa?.from_agent || "",
        message: (0, memory_2.compactMemoryText)(message, 1000),
        data: { qa_id: qa?.id || qa?.question_id || "", from: qa?.from_agent || "", to: qa?.to_agent || "", ...data },
    });
    return traceId;
}
function writeAcceptedAgentQaToProjectMemory(qa) {
    if (!qa?.acceptance?.accepted || Number(qa.acceptance.score || 0) < 60 || !qa.from_agent)
        return null;
    try {
        return (0, memory_1.updateProjectMemoryFromReceipt)({
            project: qa.from_agent,
            workDir: qa.continuation?.source_work_dir || "",
            groupId: qa.group_id || "",
            taskId: qa.task_id || "",
            receipt: {
                status: "done",
                summary: `Agent 协作结论：${(0, memory_2.compactMemoryText)(qa.question, 260)} → ${(0, memory_2.compactMemoryText)(qa.answer, 700)}`,
                filesChanged: [],
                verification: [],
                newDecisions: [{
                        decision: (0, memory_2.compactMemoryText)(qa.answer, 1000),
                        reason: `由 ${qa.to_agent} 回答 ${qa.from_agent}，主 Agent 证据门禁评分 ${qa.acceptance.score}${qa.answer_evidence?.length ? `；证据：${qa.answer_evidence.slice(0, 6).join("、")}` : ""}`,
                        source: "agent_collaboration_8",
                    }],
            },
        });
    }
    catch (error) {
        (0, logs_1.safeAddGroupLog)(qa.group_id || "", "warning", "agent_qa_memory", `Agent 问答写入项目记忆失败：${error?.message || error}`, { qa_id: qa.id });
        return null;
    }
}
//# sourceMappingURL=agent-qa-service.js.map