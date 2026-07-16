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
exports.safeAddGroupLog = safeAddGroupLog;
exports.loadGroupLogs = loadGroupLogs;
exports.saveGroupLogs = saveGroupLogs;
exports.addGroupLog = addGroupLog;
exports.addTaskLog = addTaskLog;
exports.appendTaskTimelineEvent = appendTaskTimelineEvent;
exports.getTaskTimeline = getTaskTimeline;
exports.getTaskLogs = getTaskLogs;
exports.clearTaskLogs = clearTaskLogs;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const task_store_1 = require("../../core/task-store");
const reliability_ledger_1 = require("../../system/reliability-ledger");
// === 群聊日志管理 ===
function safeAddGroupLog(groupId, level, category, message, details = null) {
    try {
        (0, task_store_1.appendGroupLogRecord)(groupId, {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            details
        }, 500);
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
function loadGroupLogs() {
    try {
        return (0, task_store_1.loadGroupLogsFromSqlite)();
    }
    catch (e) {
        console.error("加载群聊日志失败:", e.message);
    }
    return {};
}
function saveGroupLogs(logs) {
    try {
        (0, task_store_1.replaceGroupLogsInSqlite)(logs);
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
function addGroupLog(groupId, level, category, message, details = null) {
    (0, task_store_1.appendGroupLogRecord)(groupId, {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        details
    }, 500);
}
// === 任务日志系统 ===
function addTaskLog(taskId, level, message) {
    (0, task_store_1.appendTaskLogRecord)(taskId, {
        timestamp: new Date().toISOString(),
        level,
        message
    }, 100);
    console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}
function appendTaskTimelineEvent(taskId, event = {}) {
    if (!taskId)
        return null;
    try {
        const tasks = (0, db_1.loadTasks)();
        const idx = tasks.findIndex((task) => task.id === taskId);
        if (idx < 0)
            return null;
        const now = new Date().toISOString();
        const current = Array.isArray(tasks[idx].workflow_timeline) ? tasks[idx].workflow_timeline : [];
        const nextEvent = {
            id: event.id || `tl_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
            at: event.at || now,
            type: event.type || "event",
            title: String(event.title || event.message || "任务事件"),
            detail: String(event.detail || ""),
            status: event.status || event.level || "info",
            agent: event.agent || "",
            phase: event.phase || "",
            data: event.data || {},
        };
        tasks[idx].workflow_timeline = [...current, nextEvent].slice(-160);
        tasks[idx].updated_at = now;
        tasks[idx].trace_id = (0, reliability_ledger_1.ensureTraceId)(tasks[idx].trace_id, "task");
        (0, db_1.saveTasks)(tasks);
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `timeline:${taskId}:${nextEvent.id}`, type: `timeline.${nextEvent.type}`, status: nextEvent.status, task_id: taskId, group_id: tasks[idx].group_id || "", agent: nextEvent.agent, message: nextEvent.detail || nextEvent.title, data: { phase: nextEvent.phase, ...(nextEvent.data || {}) } });
        return nextEvent;
    }
    catch (e) {
        console.warn("记录任务时间线失败:", e?.message || e);
        return null;
    }
}
function getTaskTimeline(task, execution = {}) {
    const timeline = [
        ...(Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []),
        ...(Array.isArray(execution?.timeline) ? execution.timeline : []),
    ].filter(Boolean);
    const seen = new Set();
    return timeline.filter((item) => {
        const key = item.id || `${item.at}|${item.type}|${item.title}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(-160);
}
function getTaskLogs(taskId, limit = 50) {
    return (0, task_store_1.getTaskLogRecords)(taskId, limit);
}
function clearTaskLogs(taskId) {
    return (0, task_store_1.clearTaskLogRecords)(taskId);
}
//# sourceMappingURL=logs.js.map