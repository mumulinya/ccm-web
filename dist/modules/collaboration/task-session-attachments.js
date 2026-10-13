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
exports.retainTaskSessionUpload = retainTaskSessionUpload;
exports.readTaskSessionAttachment = readTaskSessionAttachment;
exports.normalizeTaskSessionAttachments = normalizeTaskSessionAttachments;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const credential_store_1 = require("../../core/credential-store");
const directory = (taskId) => path.join(utils_1.CCM_DIR, "task-session-attachments", (0, crypto_1.createHash)("sha256").update(taskId).digest("hex"));
const validRef = (ref) => /^[a-f0-9]{64}$/.test(String(ref || ""));
/** Only a server-created multipart upload may introduce a new task-owned asset. */
async function retainTaskSessionUpload(taskId, upload, expectedChecksum = "") {
    const actual = await fs.promises.realpath(upload.savedPath);
    const allowed = await fs.promises.realpath(utils_1.UPLOAD_DIR);
    const relative = path.relative(allowed, actual);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error("任务附件不属于上传存储");
    const dir = directory(taskId);
    await fs.promises.mkdir(dir, { recursive: true });
    const staged = path.join(dir, `pending-${(0, crypto_1.randomUUID)()}`);
    let ref;
    try {
        await fs.promises.copyFile(actual, staged, fs.constants.COPYFILE_EXCL);
        const hash = (0, crypto_1.createHash)("sha256");
        for await (const chunk of fs.createReadStream(staged))
            hash.update(chunk);
        ref = hash.digest("hex");
        if (expectedChecksum && ref !== expectedChecksum)
            throw new Error("来源附件内容已改变，不能作为原始证据保存");
        await fs.promises.link(staged, path.join(dir, ref)).catch(error => { if (error.code !== "EEXIST")
            throw error; });
    }
    finally {
        await fs.promises.rm(staged, { force: true });
    }
    const asset = path.join(dir, ref);
    const filename = (0, credential_store_1.redactSensitiveText)(String(upload.filename || "attachment")).slice(0, 240);
    const metadata = { attachment_ref: ref, name: filename, filename,
        size: (await fs.promises.stat(asset)).size, content_type: String(upload.contentType || "application/octet-stream").slice(0, 120), stored: true };
    const file = path.join(dir, `${ref}.json`);
    if (!fs.existsSync(file))
        (0, atomic_json_file_1.writeJsonAtomic)(file, metadata);
    return readTaskSessionAttachment(taskId, ref)?.metadata;
}
function readTaskSessionAttachment(taskId, ref) {
    if (!validRef(ref))
        return null;
    const file = path.join(directory(taskId), String(ref));
    const metadata = (0, atomic_json_file_1.readJsonWithBackup)(`${file}.json`, null);
    return metadata?.attachment_ref === ref && fs.existsSync(file) ? { file, metadata } : null;
}
function normalizeTaskSessionAttachments(taskId, rows) {
    return (Array.isArray(rows) ? rows : []).slice(0, 20).map(row => {
        const retained = readTaskSessionAttachment(taskId, row?.attachment_ref);
        if (row?.attachment_ref && !retained)
            throw Object.assign(new Error("任务附件引用不存在或不属于该任务"), { code: "TASK_ATTACHMENT_REFERENCE_INVALID", status: 409 });
        return retained?.metadata || { name: (0, credential_store_1.redactSensitiveText)(String(row?.name || row?.filename || "")).slice(0, 240), filename: (0, credential_store_1.redactSensitiveText)(String(row?.filename || row?.name || "")).slice(0, 240),
            size: Math.max(0, Number(row?.size || 0)), content_type: String(row?.content_type || row?.contentType || "").slice(0, 120), stored: false };
    }).filter(row => row.name);
}
//# sourceMappingURL=task-session-attachments.js.map