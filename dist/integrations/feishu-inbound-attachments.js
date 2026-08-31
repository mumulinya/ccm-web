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
exports.extractCcConnectInboundAttachmentPaths = extractCcConnectInboundAttachmentPaths;
exports.extractFeishuEventResourceHints = extractFeishuEventResourceHints;
exports.resolveFeishuInboundAttachments = resolveFeishuInboundAttachments;
exports.materializeFeishuInboundAttachments = materializeFeishuInboundAttachments;
exports.publicFeishuInboundAttachments = publicFeishuInboundAttachments;
exports.runFeishuInboundAttachmentSelfTest = runFeishuInboundAttachmentSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const task_attachments_1 = require("../system/task-attachments");
const feishu_1 = require("../modules/collaboration/feishu");
const REGISTRY_FILE = path.join(utils_1.CCM_DIR, "feishu-inbound-attachments-v1.json");
const BLOCKED_EXTENSIONS = new Set([".bat", ".cmd", ".com", ".dll", ".exe", ".msi", ".ps1", ".scr", ".sh"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);
const RECENT_LOCAL_FILE_MS = 10 * 60_000;
function registry() {
    try {
        const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
        return { schema: "ccm-feishu-inbound-attachment-registry-v1", attachments: Array.isArray(parsed?.attachments) ? parsed.attachments : [] };
    }
    catch {
        return { schema: "ccm-feishu-inbound-attachment-registry-v1", attachments: [] };
    }
}
function writeRegistry(value) {
    fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
    const temp = `${REGISTRY_FILE}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2));
    fs.renameSync(temp, REGISTRY_FILE);
}
function checksumBuffer(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function safeName(value, fallback = "feishu-attachment") {
    const base = path.basename(String(value || fallback)).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
    return (base || fallback).slice(0, 180);
}
function mimeFromName(name, supplied = "") {
    const clean = String(supplied || "").split(";")[0].trim().toLowerCase();
    if (clean && clean !== "application/octet-stream")
        return clean;
    const byExt = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
        ".webp": "image/webp", ".bmp": "image/bmp", ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt": "text/plain", ".md": "text/markdown", ".json": "application/json", ".csv": "text/csv",
        ".yaml": "application/yaml", ".yml": "application/yaml", ".html": "text/html",
    };
    return byExt[path.extname(name).toLowerCase()] || "application/octet-stream";
}
function nameFromContentDisposition(value) {
    const text = String(value || "");
    const encoded = text.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
    if (encoded) {
        try {
            return safeName(decodeURIComponent(encoded.replace(/^"|"$/g, "")));
        }
        catch { }
    }
    const plain = text.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
    return safeName(plain?.[1] || plain?.[2] || "", "");
}
function imageSignatureMatches(buffer, name) {
    const ext = path.extname(name).toLowerCase();
    if (ext === ".png")
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ([".jpg", ".jpeg"].includes(ext))
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (ext === ".gif")
        return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
    if (ext === ".webp")
        return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (ext === ".bmp")
        return buffer.subarray(0, 2).toString("ascii") === "BM";
    return true;
}
function validateBuffer(buffer, name, currentBytes = 0, currentCount = 0) {
    if (currentCount >= task_attachments_1.MAX_TASK_ATTACHMENT_COUNT)
        throw new Error(`每条飞书消息最多接收 ${task_attachments_1.MAX_TASK_ATTACHMENT_COUNT} 个附件`);
    if (!buffer.length)
        throw new Error(`${name} 是空文件`);
    if (buffer.length > task_attachments_1.MAX_TASK_ATTACHMENT_FILE_BYTES)
        throw new Error(`${name} 超过 25 MB`);
    if (currentBytes + buffer.length > task_attachments_1.MAX_TASK_ATTACHMENT_TOTAL_BYTES)
        throw new Error("本次飞书附件总大小超过 60 MB");
    const ext = path.extname(name).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext))
        throw new Error(`${name} 属于不允许接收的可执行文件类型`);
    if (IMAGE_EXTENSIONS.has(ext) && !imageSignatureMatches(buffer, name))
        throw new Error(`${name} 的图片格式与文件内容不一致`);
}
function attachmentId(messageId, kind, name, checksum) {
    return `feishu_att_${crypto.createHash("sha256").update(`${messageId}\u0000${kind}\u0000${name}\u0000${checksum}`).digest("hex").slice(0, 24)}`;
}
function controlledPath(storageKey) {
    const target = path.resolve(utils_1.UPLOAD_DIR, path.basename(String(storageKey || "")));
    const root = `${path.resolve(utils_1.UPLOAD_DIR)}${path.sep}`;
    if (!target.startsWith(root))
        throw new Error("飞书附件存储引用无效");
    return target;
}
function persistBuffer(input) {
    const name = safeName(input.name, input.kind === "image" ? "feishu-image.png" : "feishu-file");
    const checksum = checksumBuffer(input.buffer);
    const id = attachmentId(input.messageId, input.kind, name, checksum);
    const store = registry();
    const existing = store.attachments.find(item => item.id === id);
    if (existing) {
        const file = controlledPath(existing.storageKey);
        if (fs.existsSync(file) && checksumBuffer(fs.readFileSync(file)) === existing.checksum)
            return existing;
    }
    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    const storageKey = `${id}-${name}`;
    const target = controlledPath(storageKey);
    if (fs.existsSync(target)) {
        if (!fs.statSync(target).isFile() || checksumBuffer(fs.readFileSync(target)) !== checksum) {
            throw new Error(`${name} 的既有受控副本校验失败`);
        }
    }
    else {
        fs.writeFileSync(target, input.buffer, { flag: "wx" });
    }
    const receipt = {
        schema: "ccm-feishu-inbound-attachment-v1",
        id,
        messageId: String(input.messageId || "").slice(0, 240),
        kind: input.kind,
        name,
        mimeType: mimeFromName(name, input.mimeType),
        size: input.buffer.length,
        checksum,
        storageKey,
        source: input.source,
        contentStored: false,
    };
    store.attachments = [receipt, ...store.attachments.filter(item => item.id !== id)].slice(0, 10_000);
    writeRegistry(store);
    return receipt;
}
function isUnder(child, parent) {
    const relative = path.relative(parent, child);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
function readTrustedCcConnectFile(ref, expectedWorkDir) {
    const declaredRoot = path.resolve(expectedWorkDir, ".cc-connect", "attachments");
    const declared = path.resolve(String(ref.path || ""));
    if (!isUnder(declared, declaredRoot))
        throw new Error("cc-connect 附件路径不属于当前机器人工作目录");
    if (!fs.existsSync(declaredRoot) || !fs.existsSync(declared))
        throw new Error("cc-connect 临时附件已经不存在");
    const rootReal = fs.realpathSync.native(declaredRoot);
    const fileReal = fs.realpathSync.native(declared);
    if (!isUnder(fileReal, rootReal))
        throw new Error("cc-connect 附件解析后越过机器人工作目录");
    const relativeParts = path.relative(declaredRoot, declared).split(path.sep).filter(Boolean);
    let cursor = declaredRoot;
    for (const part of relativeParts) {
        cursor = path.join(cursor, part);
        if (fs.lstatSync(cursor).isSymbolicLink())
            throw new Error("cc-connect 附件路径包含符号链接或 Junction");
    }
    const stat = fs.statSync(fileReal);
    if (!stat.isFile())
        throw new Error("cc-connect 附件不是普通文件");
    if (Math.max(stat.mtimeMs, stat.birthtimeMs, stat.ctimeMs) < Date.now() - RECENT_LOCAL_FILE_MS)
        throw new Error("cc-connect 附件引用已经过期");
    const name = safeName(path.basename(fileReal));
    const buffer = fs.readFileSync(fileReal);
    return { fileReal, name, buffer };
}
function splitAbsolutePaths(value) {
    return String(value || "").split(/,\s+(?=(?:[A-Za-z]:[\\/]|\\\\|\/))/).map(item => item.trim()).filter(Boolean);
}
function extractCcConnectInboundAttachmentPaths(value) {
    let text = String(value || "").trim();
    const refs = [];
    const markers = [
        { marker: "Files saved locally, please read them", kind: "file" },
        { marker: "Image files saved locally", kind: "image" },
    ];
    let found = true;
    while (found) {
        found = false;
        const candidate = markers.map(spec => {
            const needle = `(${spec.marker}:`;
            return { spec, needle, start: text.lastIndexOf(needle) };
        }).filter(item => item.start >= 0).sort((a, b) => b.start - a.start)[0];
        if (!candidate)
            continue;
        const close = text.lastIndexOf(")");
        if (close < candidate.start || text.slice(close + 1).trim())
            continue;
        for (const file of splitAbsolutePaths(text.slice(candidate.start + candidate.needle.length, close).trim())) {
            refs.push({ kind: candidate.spec.kind, path: file });
        }
        text = text.slice(0, candidate.start).trim();
        found = true;
    }
    if (refs.length && /^(?:Please analyze the attached file\(s\)\.|User sent image\(s\)\.)$/i.test(text))
        text = "";
    return {
        text: text || (refs.length ? "请读取并处理我刚发送的附件。" : ""),
        refs: refs.filter((item, index, rows) => rows.findIndex(other => other.kind === item.kind && path.normalize(other.path) === path.normalize(item.path)) === index),
    };
}
function extractFeishuEventResourceHints(payload) {
    const message = payload?.event?.message || payload?.message || {};
    const kind = String(message.message_type || message.msg_type || "").toLowerCase() === "image" ? "image" : "file";
    let content = message.content || message.body?.content || {};
    if (typeof content === "string")
        try {
            content = JSON.parse(content);
        }
        catch {
            content = {};
        }
    const key = String(content?.file_key || content?.image_key || "").trim();
    if (!key)
        return [];
    return [{ kind: content?.image_key && !content?.file_key ? "image" : kind, key, name: String(content?.file_name || content?.name || "") }];
}
async function resolveFeishuInboundAttachments(input) {
    const messageId = String(input.messageId || "").trim();
    const warnings = [];
    const failures = [];
    const attachments = [];
    let totalBytes = 0;
    const add = (receipt) => {
        if (attachments.some(item => item.checksum === receipt.checksum))
            return false;
        validateBuffer(fs.readFileSync(controlledPath(receipt.storageKey)), receipt.name, totalBytes, attachments.length);
        attachments.push(receipt);
        totalBytes += receipt.size;
        return true;
    };
    let remoteResources = Array.isArray(input.resourceHints) ? input.resourceHints : [];
    if (/^om_[a-z0-9_-]{8,200}$/i.test(messageId) && !remoteResources.length) {
        try {
            remoteResources = await (0, feishu_1.getFeishuMessageResources)(messageId);
        }
        catch (error) {
            warnings.push(`无法重新读取飞书附件元数据：${String(error?.message || error).slice(0, 180)}`);
        }
    }
    for (const resource of remoteResources.slice(0, task_attachments_1.MAX_TASK_ATTACHMENT_COUNT)) {
        try {
            const downloaded = await (0, feishu_1.downloadFeishuMessageResource)({ messageId, fileKey: resource.key, type: resource.kind, maxBytes: task_attachments_1.MAX_TASK_ATTACHMENT_FILE_BYTES });
            const dispositionName = nameFromContentDisposition(downloaded.content_disposition);
            const name = safeName(dispositionName || resource.name, resource.kind === "image" ? `feishu-image-${resource.key.slice(-8)}.png` : `feishu-file-${resource.key.slice(-8)}`);
            if (attachments.some(item => item.checksum === checksumBuffer(downloaded.buffer)))
                continue;
            validateBuffer(downloaded.buffer, name, totalBytes, attachments.length);
            add(persistBuffer({ messageId, kind: resource.kind, name, mimeType: downloaded.content_type, buffer: downloaded.buffer, source: input.source }));
        }
        catch (error) {
            failures.push({ name: safeName(resource.name || resource.key), reason: String(error?.message || error).slice(0, 240) });
        }
    }
    for (const ref of Array.isArray(input.localRefs) ? input.localRefs : []) {
        let trusted = null;
        try {
            if (!input.expectedWorkDir)
                throw new Error("缺少当前机器人工作目录，不能接管本地附件");
            trusted = readTrustedCcConnectFile(ref, input.expectedWorkDir);
            if (ref.kind === "image" && !IMAGE_EXTENSIONS.has(path.extname(trusted.name).toLowerCase())) {
                throw new Error(`${trusted.name} 缺少受支持的图片扩展名`);
            }
            if (attachments.some(item => item.checksum === checksumBuffer(trusted.buffer))) {
                try {
                    fs.unlinkSync(trusted.fileReal);
                }
                catch { }
                continue;
            }
            validateBuffer(trusted.buffer, trusted.name, totalBytes, attachments.length);
            const added = add(persistBuffer({ messageId, kind: ref.kind, name: trusted.name, buffer: trusted.buffer, source: "cc_connect_acp" }));
            // A remote resource with the same checksum has already been retained.
            if (!added && !attachments.some(item => item.checksum === checksumBuffer(trusted.buffer)))
                throw new Error("附件去重校验失败");
            try {
                fs.unlinkSync(trusted.fileReal);
            }
            catch { }
        }
        catch (error) {
            failures.push({ name: trusted?.name || safeName(ref.path), reason: String(error?.message || error).slice(0, 240) });
        }
    }
    if (failures.length)
        warnings.push(`${failures.length} 个附件无法接管或读取`);
    return { attachments, warnings: [...new Set(warnings)], failures };
}
function materializeFeishuInboundAttachments(value) {
    const rows = Array.isArray(value) ? value : [];
    return rows.map((item) => {
        if (item?.schema !== "ccm-feishu-inbound-attachment-v1")
            throw new Error("飞书附件回执格式无效");
        const target = controlledPath(item.storageKey);
        if (!fs.existsSync(target) || !fs.statSync(target).isFile())
            throw new Error(`${safeName(item.name)} 的受控副本已经不可用`);
        const checksum = checksumBuffer(fs.readFileSync(target));
        if (checksum !== item.checksum)
            throw new Error(`${safeName(item.name)} 的受控副本校验失败`);
        return {
            filename: safeName(item.name),
            name: safeName(item.name),
            savedPath: target,
            size: Number(item.size || fs.statSync(target).size),
            type: String(item.mimeType || "application/octet-stream"),
            mimeType: String(item.mimeType || "application/octet-stream"),
            feishuAttachmentId: String(item.id || ""),
        };
    });
}
function publicFeishuInboundAttachments(value) {
    return (Array.isArray(value) ? value : []).map((item) => ({
        id: String(item?.id || ""),
        name: safeName(item?.name),
        kind: item?.kind === "image" ? "image" : "file",
        mimeType: String(item?.mimeType || "application/octet-stream"),
        size: Number(item?.size || 0),
        checksum: String(item?.checksum || ""),
        status: String(item?.status || "received"),
        contentStored: false,
    }));
}
function runFeishuInboundAttachmentSelfTest() {
    const sample = extractCcConnectInboundAttachmentPaths("请总结附件\n(Files saved locally, please read them: C:\\work\\.cc-connect\\attachments\\a.pdf, C:\\work\\.cc-connect\\attachments\\b.docx)\n(Image files saved locally: C:\\work\\.cc-connect\\attachments\\c.png)");
    return {
        ok: sample.text === "请总结附件" && sample.refs.length === 3 && sample.refs[0].kind === "image" && sample.refs.filter(item => item.kind === "file").length === 2,
        text: sample.text,
        refs: sample.refs.map(item => ({ kind: item.kind, name: path.basename(item.path) })),
    };
}
//# sourceMappingURL=feishu-inbound-attachments.js.map