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
exports.loadGroups = loadGroups;
exports.saveGroups = saveGroups;
exports.getGroupMessages = getGroupMessages;
exports.appendGroupMessage = appendGroupMessage;
exports.saveGroupMessages = saveGroupMessages;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const group_orchestrator_1 = require("./group-orchestrator");
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
        try {
            const recovered = JSON.parse(fs.readFileSync(`${utils_1.GROUPS_FILE}.bak`, "utf-8"));
            if (Array.isArray(recovered))
                return recovered.map(group_orchestrator_1.normalizeGroupOrchestrator);
        }
        catch { }
        return [];
    }
}
function saveGroups(groups) {
    const content = JSON.stringify(groups, null, 2);
    if (fs.existsSync(utils_1.GROUPS_FILE)) {
        try {
            if (fs.readFileSync(utils_1.GROUPS_FILE, "utf-8") === content)
                return;
        }
        catch { }
    }
    const temp = `${utils_1.GROUPS_FILE}.${process.pid}.${Date.now()}.tmp`;
    if (fs.existsSync(utils_1.GROUPS_FILE)) {
        try {
            fs.copyFileSync(utils_1.GROUPS_FILE, `${utils_1.GROUPS_FILE}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, content, "utf-8");
    fs.renameSync(temp, utils_1.GROUPS_FILE);
}
const groupMessagesCache = new Map();
function getGroupMessages(groupId) {
    const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    if (!fs.existsSync(file)) {
        groupMessagesCache.delete(groupId);
        return [];
    }
    try {
        const stat = fs.statSync(file);
        const cached = groupMessagesCache.get(groupId);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size)
            return cached.messages;
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        const messages = Array.isArray(parsed) ? parsed : [];
        groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
        return messages;
    }
    catch {
        try {
            const backup = `${file}.bak`;
            const parsed = JSON.parse(fs.readFileSync(backup, "utf-8"));
            const messages = Array.isArray(parsed) ? parsed : [];
            const stat = fs.statSync(file);
            groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
            return messages;
        }
        catch {
            groupMessagesCache.delete(groupId);
            return [];
        }
    }
}
function appendGroupMessage(groupId, msg) {
    const messages = getGroupMessages(groupId);
    const messageId = String(msg?.id || "").trim();
    const existing = messageId ? messages.find((item) => String(item?.id || "") === messageId) : null;
    if (existing)
        return existing;
    const taskTraceId = msg?.task_id ? (0, db_1.loadTasks)().find((task) => task.id === msg.task_id)?.trace_id : "";
    const traceId = (0, reliability_ledger_1.ensureTraceId)(msg?.trace_id || msg?.traceId || taskTraceId, "message");
    const next = { ...msg, trace_id: traceId };
    messages.push(next);
    saveGroupMessages(groupId, messages);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `group-message:${groupId}:${messageId || messages.length}`, type: "group.message_persisted", status: "ok", group_id: groupId, task_id: msg?.task_id || "", agent: msg?.agent || msg?.role || "", message: String(msg?.content || "").slice(0, 500), data: { message_id: messageId } });
    return next;
}
function saveGroupMessages(groupId, messages) {
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(messages, null, 2), "utf-8");
    fs.renameSync(temp, file);
    const stat = fs.statSync(file);
    groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
}
//# sourceMappingURL=storage.js.map