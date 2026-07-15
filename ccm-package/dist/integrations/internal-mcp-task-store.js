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
exports.internalMcpTaskPayload = void 0;
exports.internalMcpTaskJournalFile = internalMcpTaskJournalFile;
exports.getBoundInternalMcpTask = getBoundInternalMcpTask;
exports.readInternalMcpTaskJournal = readInternalMcpTaskJournal;
exports.appendInternalMcpTaskJournal = appendInternalMcpTaskJournal;
exports.publicInternalMcpTaskContext = publicInternalMcpTaskContext;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const logs_1 = require("../modules/collaboration/logs");
const ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "task-runtime");
function safeSegment(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}
function internalMcpTaskJournalFile(taskId) {
    return path.join(ROOT, `${safeSegment(taskId)}.jsonl`);
}
function cleanText(value, max = 1200) {
    return String(value || "")
        .replace(/(api[_-]?key|access[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
        .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
        .trim()
        .slice(0, max);
}
function cleanList(value, max = 50, itemMax = 500) {
    return [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(item => cleanText(item, itemMax)).filter(Boolean))].slice(0, max);
}
function getBoundInternalMcpTask(context) {
    const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === context.taskId);
    if (!task)
        throw new Error("绑定任务不存在或已被清理");
    if (context.groupId && String(task.group_id || "") && String(task.group_id) !== context.groupId)
        throw new Error("任务不属于当前群聊绑定");
    return task;
}
function readInternalMcpTaskJournal(taskId, limit = 120) {
    const file = internalMcpTaskJournalFile(taskId);
    if (!fs.existsSync(file))
        return [];
    return fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).flatMap(line => {
        try {
            return [JSON.parse(line)];
        }
        catch {
            return [];
        }
    }).slice(-Math.max(1, Math.min(500, Number(limit || 120))));
}
function appendInternalMcpTaskJournal(context, kind, payload, timeline) {
    getBoundInternalMcpTask(context);
    const entry = {
        schema: "ccm-internal-mcp-task-event-v1",
        id: `imcp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        at: new Date().toISOString(),
        task_id: context.taskId,
        group_id: context.groupId,
        project: context.project,
        role: context.role,
        actor: context.taskAgentSessionId || context.project,
        kind,
        payload,
    };
    fs.mkdirSync(ROOT, { recursive: true });
    fs.appendFileSync(internalMcpTaskJournalFile(context.taskId), `${JSON.stringify(entry)}\n`, "utf-8");
    (0, logs_1.appendTaskTimelineEvent)(context.taskId, {
        id: `timeline:${entry.id}`,
        type: timeline.type,
        title: timeline.title,
        detail: cleanText(timeline.detail, 800),
        status: timeline.status || "info",
        phase: timeline.phase || "execution",
        agent: context.project,
        data: { internal_mcp_event_id: entry.id, kind, role: context.role, project: context.project },
    });
    (0, logs_1.addTaskLog)(context.taskId, timeline.status === "failed" ? "error" : timeline.status === "warning" ? "warning" : "info", `${timeline.title}：${cleanText(timeline.detail, 300)}`);
    return entry;
}
function publicInternalMcpTaskContext(context) {
    const task = getBoundInternalMcpTask(context);
    const journal = readInternalMcpTaskJournal(context.taskId);
    const latestTodo = [...journal].reverse().find(item => item.kind === "todo" && item.project === context.project)?.payload || null;
    const progress = journal.filter(item => item.kind === "progress").slice(-20);
    const decisions = journal.filter(item => item.kind === "decision" && item.payload.status !== "resolved").slice(-20);
    return {
        schema: "ccm-internal-mcp-task-context-view-v1",
        task: {
            id: task.id,
            title: cleanText(task.title || task.name || "任务", 240),
            goal: cleanText(task.business_goal || task.description || task.goal || "", 1800),
            status: String(task.status || "pending"),
            phase: String(task.current_phase || task.lifecycle?.phase || ""),
            acceptance_criteria: cleanList(task.acceptance_criteria || task.acceptanceCriteria, 40, 800),
            constraints: cleanList(task.constraints, 40, 800),
            target_project: String(task.target_project || ""),
            parent_task_id: String(task.parent_task_id || ""),
            work_items: Array.isArray(task.work_items) ? task.work_items.slice(0, 40).map((item) => ({
                id: String(item.id || ""),
                title: cleanText(item.title || item.label || "工作项", 240),
                status: String(item.status || ""),
                agent: String(item.agent || item.project || ""),
            })) : [],
        },
        binding: { project: context.project, role: context.role, group_id: context.groupId, work_dir: context.workDir },
        todo: latestTodo,
        recent_progress: progress,
        pending_user_decisions: decisions,
    };
}
exports.internalMcpTaskPayload = {
    cleanText,
    cleanList,
};
//# sourceMappingURL=internal-mcp-task-store.js.map