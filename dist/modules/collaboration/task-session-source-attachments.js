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
exports.taskSourceAttachmentReferences = taskSourceAttachmentReferences;
exports.retainTaskSessionSourceAttachments = retainTaskSessionSourceAttachments;
exports.scheduleTaskSourceAttachmentRetention = scheduleTaskSourceAttachmentRetention;
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const task_session_attachments_1 = require("./task-session-attachments");
const hash = (value) => (0, crypto_1.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
const file = (taskId) => path.join(utils_1.CCM_DIR, "task-session-attachment-sources", `${hash(taskId)}.json`);
const key = (row) => hash([row.id || "", row.checksum || "", row.name || row.filename || "", row.path || row.savedPath || ""]);
const flights = new Map();
/** Persisted task attachments are the authority. A chat-supplied URL or local
 * path never grants access to another uploaded file. */
function taskSourceAttachmentReferences(taskId, sources) {
    const saved = (0, atomic_json_file_1.readJsonWithBackup)(file(taskId), { references: {} });
    return (Array.isArray(sources) ? sources : []).slice(0, 100).map(row => {
        const reference = saved.references?.[key(row)];
        const asset = reference?.attachment_ref && (0, task_session_attachments_1.readTaskSessionAttachment)(taskId, reference.attachment_ref);
        return asset?.metadata || { ...(0, task_session_attachments_1.normalizeTaskSessionAttachments)(taskId, [{ name: row.name || row.filename, size: row.size,
                    content_type: row.content_type || row.contentType || row.type }])[0], stored: false,
            unavailable_reason: reference?.unavailable_reason || (row.url ? "remote_reference_only" : "source_attachment_not_retained") };
    });
}
function retainTaskSessionSourceAttachments(taskId) {
    if (flights.has(taskId))
        return flights.get(taskId);
    const operation = (async () => {
        const task = require("../../core/db").getTaskById(taskId);
        if (task?.task_session_boundary_version !== 1)
            return;
        const sources = (Array.isArray(task.source_attachments) ? task.source_attachments : []).slice(0, 100);
        if (!sources.length)
            return;
        const saved = (0, atomic_json_file_1.readJsonWithBackup)(file(taskId), { references: {} });
        const references = { ...(saved.references || {}) };
        for (const row of sources) {
            const identity = key(row);
            if (references[identity]?.attachment_ref && (0, task_session_attachments_1.readTaskSessionAttachment)(taskId, references[identity].attachment_ref))
                continue;
            if (!row.path && !row.savedPath) {
                references[identity] = { unavailable_reason: "remote_reference_only" };
                continue;
            }
            try {
                references[identity] = await (0, task_session_attachments_1.retainTaskSessionUpload)(taskId, { savedPath: row.savedPath || row.path,
                    filename: row.filename || row.name, contentType: row.contentType || row.content_type || row.type }, row.checksum || "");
            }
            catch (error) {
                references[identity] = { unavailable_reason: error?.code === "ENOENT" ? "source_attachment_missing" : "source_attachment_unverifiable" };
            }
        }
        (0, atomic_json_file_1.writeJsonAtomic)(file(taskId), { schema: "ccm-task-source-attachment-refs-v1", task_id: taskId, references });
    })().finally(() => flights.delete(taskId));
    flights.set(taskId, operation);
    return operation;
}
function scheduleTaskSourceAttachmentRetention(taskId) {
    // Creation stays compatible with synchronous callers. Every Runtime start
    // and explicit archive query also awaits this same preparation boundary.
    void retainTaskSessionSourceAttachments(taskId).then(() => {
        const task = require("../../core/db").getTaskById(taskId);
        if (task)
            require("./task-session-store").materializeTaskSession(task);
    }).catch(() => { });
}
//# sourceMappingURL=task-session-source-attachments.js.map