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
exports.reconcileAttachmentReferences = reconcileAttachmentReferences;
exports.listOrphanAttachments = listOrphanAttachments;
exports.purgeOrphanAttachment = purgeOrphanAttachment;
exports.cleanupStaleUploadStaging = cleanupStaleUploadStaging;
exports.readAttachmentReferenceRegistry = readAttachmentReferenceRegistry;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const REGISTRY_FILE = path.join(utils_1.CCM_DIR, "attachment-references-v2.json");
const SECURE_UPLOAD_NAME = /^\d{13}-[0-9a-f]{16}\.[a-z0-9]+$/i;
function safeUploadPath(value) {
    const target = path.resolve(String(value || ""));
    const root = `${path.resolve(utils_1.UPLOAD_DIR)}${path.sep}`;
    return target.startsWith(root) ? target : "";
}
function attachmentPaths(task) {
    return (Array.isArray(task?.source_attachments) ? task.source_attachments : [])
        .map((item) => safeUploadPath(item?.path || item?.savedPath))
        .filter(Boolean);
}
function secureUploadFiles() {
    if (!fs.existsSync(utils_1.UPLOAD_DIR))
        return [];
    return fs.readdirSync(utils_1.UPLOAD_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile() && SECURE_UPLOAD_NAME.test(entry.name))
        .map(entry => path.join(utils_1.UPLOAD_DIR, entry.name));
}
function reconcileAttachmentReferences(tasks = (0, db_1.loadTasks)()) {
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const references = new Map();
        for (const task of tasks) {
            for (const file of attachmentPaths(task)) {
                if (!references.has(file))
                    references.set(file, new Set());
                references.get(file).add(String(task.id || ""));
            }
        }
        const now = new Date().toISOString();
        const items = secureUploadFiles().map(file => {
            const stat = fs.statSync(file);
            const taskIds = [...(references.get(file) || new Set())].filter(Boolean).sort();
            return {
                id: path.basename(file),
                path_checksum: crypto.createHash("sha256").update(file).digest("hex"),
                bytes: stat.size,
                created_at: stat.birthtime.toISOString(),
                updated_at: stat.mtime.toISOString(),
                reference_count: taskIds.length,
                task_ids: taskIds,
            };
        });
        const value = { schema: "ccm-attachment-reference-registry-v2", version: 2, updated_at: now, items };
        (0, atomic_json_file_1.writeJsonAtomic)(REGISTRY_FILE, value);
        return value;
    }, { timeoutMs: 30_000, staleMs: 5 * 60_000 });
}
function listOrphanAttachments(minAgeMs = 24 * 60 * 60_000) {
    const registry = reconcileAttachmentReferences();
    const cutoff = Date.now() - Math.max(60_000, Number(minAgeMs || 0));
    return registry.items.filter((item) => item.reference_count === 0 && Date.parse(item.updated_at) <= cutoff);
}
function purgeOrphanAttachment(id, minAgeMs = 24 * 60 * 60_000) {
    const name = path.basename(String(id || ""));
    const candidate = listOrphanAttachments(minAgeMs).find((item) => item.id === name);
    if (!candidate)
        throw new Error("附件已被引用、尚未达到保留期或已不存在");
    const target = safeUploadPath(path.join(utils_1.UPLOAD_DIR, name));
    if (!target || !SECURE_UPLOAD_NAME.test(name))
        throw new Error("无效的孤立附件身份");
    const bytes = fs.existsSync(target) ? fs.statSync(target).size : 0;
    if (fs.existsSync(target))
        fs.unlinkSync(target);
    reconcileAttachmentReferences();
    return { id: name, bytes, removed: true };
}
function cleanupStaleUploadStaging(minAgeMs = 60 * 60_000) {
    const staging = path.join(utils_1.UPLOAD_DIR, ".staging");
    if (!fs.existsSync(staging))
        return { removed: 0, bytes: 0 };
    let removed = 0;
    let bytes = 0;
    const cutoff = Date.now() - Math.max(60_000, minAgeMs);
    for (const entry of fs.readdirSync(staging, { withFileTypes: true })) {
        if (!entry.isFile())
            continue;
        const file = path.join(staging, entry.name);
        const stat = fs.statSync(file);
        if (stat.mtimeMs > cutoff)
            continue;
        bytes += stat.size;
        fs.unlinkSync(file);
        removed += 1;
    }
    return { removed, bytes };
}
function readAttachmentReferenceRegistry() {
    return (0, atomic_json_file_1.readJsonWithBackup)(REGISTRY_FILE, { schema: "ccm-attachment-reference-registry-v2", version: 2, updated_at: "", items: [] });
}
//# sourceMappingURL=attachment-reference-registry.js.map