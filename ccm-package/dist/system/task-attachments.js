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
exports.MAX_TASK_ATTACHMENT_TOTAL_BYTES = exports.MAX_TASK_ATTACHMENT_FILE_BYTES = exports.MAX_TASK_ATTACHMENT_COUNT = void 0;
exports.removeUploadedFiles = removeUploadedFiles;
exports.validateTaskUploadedFiles = validateTaskUploadedFiles;
exports.renderTaskAttachmentContext = renderTaskAttachmentContext;
exports.buildTaskAttachmentMutation = buildTaskAttachmentMutation;
exports.parseRetainedAttachmentIds = parseRetainedAttachmentIds;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const source_ingestion_1 = require("../modules/requirements/source-ingestion");
exports.MAX_TASK_ATTACHMENT_COUNT = 10;
exports.MAX_TASK_ATTACHMENT_FILE_BYTES = 25 * 1024 * 1024;
exports.MAX_TASK_ATTACHMENT_TOTAL_BYTES = 60 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set([
    ".bat", ".cmd", ".com", ".dll", ".exe", ".msi", ".ps1", ".scr", ".sh",
]);
function uniqueStrings(value) {
    return [...new Set((Array.isArray(value) ? value : value ? [value] : [])
            .map(item => String(item || "").trim())
            .filter(Boolean))];
}
function checksumFile(file) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function normalizedUploadPath(value) {
    const file = path.resolve(String(value || ""));
    const root = `${path.resolve(utils_1.UPLOAD_DIR)}${path.sep}`;
    if (!file.startsWith(root))
        throw new Error("附件路径不在受控上传目录中");
    return file;
}
function looksLikeImage(name) {
    return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(path.extname(name).toLowerCase());
}
function imageSignatureMatches(file, name) {
    const bytes = fs.readFileSync(file).subarray(0, 16);
    const ext = path.extname(name).toLowerCase();
    if (ext === ".png")
        return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ([".jpg", ".jpeg"].includes(ext))
        return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (ext === ".gif")
        return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
    if (ext === ".webp")
        return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (ext === ".bmp")
        return bytes.subarray(0, 2).toString("ascii") === "BM";
    return true;
}
function removeUploadedFiles(files) {
    for (const file of files || []) {
        try {
            const target = normalizedUploadPath(file?.savedPath || file?.path);
            if (fs.existsSync(target))
                fs.unlinkSync(target);
        }
        catch { }
    }
}
function validateTaskUploadedFiles(files, retainedCount = 0, retainedBytes = 0) {
    const rows = Array.isArray(files) ? files : [];
    if (rows.length + Math.max(0, retainedCount) > exports.MAX_TASK_ATTACHMENT_COUNT) {
        throw new Error(`每个任务最多上传 ${exports.MAX_TASK_ATTACHMENT_COUNT} 个附件`);
    }
    let total = Math.max(0, Number(retainedBytes || 0));
    for (const file of rows) {
        const name = path.basename(String(file?.filename || file?.name || "附件"));
        const target = normalizedUploadPath(file?.savedPath || file?.path);
        if (!fs.existsSync(target) || !fs.statSync(target).isFile())
            throw new Error(`${name} 上传不完整`);
        const size = fs.statSync(target).size;
        total += size;
        if (size <= 0)
            throw new Error(`${name} 是空文件`);
        if (size > exports.MAX_TASK_ATTACHMENT_FILE_BYTES)
            throw new Error(`${name} 超过 25 MB`);
        if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase()))
            throw new Error(`${name} 属于不允许上传的可执行文件类型`);
        if (looksLikeImage(name) && !imageSignatureMatches(target, name))
            throw new Error(`${name} 的图片格式与文件内容不一致`);
    }
    if (total > exports.MAX_TASK_ATTACHMENT_TOTAL_BYTES)
        throw new Error("本次上传附件总大小不能超过 60 MB");
}
function contextBlock(source) {
    const metadata = [
        `状态=${source.status || "unknown"}`,
        `解析器=${source.parser || "unknown"}`,
        source.path ? `本地路径=${source.path}` : "",
        source.size ? `大小=${source.size} bytes` : "",
    ].filter(Boolean).join("；");
    const body = source.readable && source.content
        ? String(source.content)
        : `[未读取正文] ${source.error || source.summary || "附件无法解析"}。执行 Agent 必须按本地路径核验，不能根据文件名猜测内容。`;
    return {
        id: String(source.id || ""),
        name: String(source.name || "附件"),
        text: `--- ${source.name || "附件"}（${metadata}） ---\n${body}`,
    };
}
function renderTaskAttachmentContext(contexts) {
    const rows = (Array.isArray(contexts) ? contexts : []).map(item => String(item?.text || "").trim()).filter(Boolean);
    return rows.length ? `[任务附件：以下内容属于当前任务，必须在执行和验收时读取]\n${rows.join("\n\n")}` : "";
}
async function ingestFiles(files, userText) {
    if (!files.length)
        return { attachments: [], contexts: [], warnings: [], technical: null };
    const ingestion = await (0, source_ingestion_1.ingestRequirementSources)({
        files,
        userText,
        extractRequirement: false,
        decomposeRequirement: false,
    });
    const byId = new Map((ingestion.sources || []).map((source) => [String(source.id || ""), source]));
    const attachments = (ingestion.attachments || []).map((attachment) => {
        const source = byId.get(String(attachment.id || ""));
        return {
            ...attachment,
            checksum: source?.path && fs.existsSync(source.path) ? checksumFile(source.path) : "",
            created_at: new Date().toISOString(),
        };
    });
    return {
        attachments,
        contexts: (ingestion.sources || []).map(contextBlock),
        warnings: ingestion.warnings || [],
        technical: ingestion.technical || null,
    };
}
async function buildTaskAttachmentMutation(input) {
    const files = Array.isArray(input.files) ? input.files : [];
    const currentAttachments = Array.isArray(input.currentAttachments) ? input.currentAttachments : [];
    const requestedRetainedIds = uniqueStrings(input.retainedIds);
    const retainedSelectionProvided = input.retainedIds !== undefined && input.retainedIds !== null;
    const retainedIds = new Set(retainedSelectionProvided ? requestedRetainedIds : currentAttachments.map(item => item?.id));
    const retained = currentAttachments.filter(item => retainedIds.has(String(item?.id || "")));
    validateTaskUploadedFiles(files, retained.length, retained.reduce((sum, item) => sum + Math.max(0, Number(item?.size || 0)), 0));
    let retainedContexts = (Array.isArray(input.currentContexts) ? input.currentContexts : [])
        .filter(item => retainedIds.has(String(item?.id || "")));
    const missingContextIds = new Set(retained.map(item => String(item?.id || "")).filter(id => !retainedContexts.some(item => String(item?.id || "") === id)));
    if (missingContextIds.size) {
        const reparsed = await ingestFiles(retained.filter(item => missingContextIds.has(String(item?.id || "")) && item?.path), input.userText || "");
        retainedContexts = [...retainedContexts, ...reparsed.contexts];
    }
    const added = await ingestFiles(files, input.userText || "");
    const attachments = [...retained, ...added.attachments].slice(0, exports.MAX_TASK_ATTACHMENT_COUNT);
    const contexts = [...retainedContexts, ...added.contexts]
        .filter((item, index, rows) => rows.findIndex(other => String(other?.id || "") === String(item?.id || "")) === index)
        .slice(0, exports.MAX_TASK_ATTACHMENT_COUNT);
    const removed = currentAttachments.filter(item => !retainedIds.has(String(item?.id || "")));
    return {
        attachments,
        contexts,
        context: renderTaskAttachmentContext(contexts),
        warnings: added.warnings,
        technical: added.technical,
        removed,
    };
}
function parseRetainedAttachmentIds(value) {
    if (Array.isArray(value))
        return uniqueStrings(value);
    const raw = String(value || "").trim();
    if (!raw)
        return [];
    try {
        return uniqueStrings(JSON.parse(raw));
    }
    catch {
        return uniqueStrings(raw.split(","));
    }
}
//# sourceMappingURL=task-attachments.js.map