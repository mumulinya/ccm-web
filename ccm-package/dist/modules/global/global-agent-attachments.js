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
exports.__globalAgentAttachmentTestHooks = void 0;
exports.serializeGlobalRequestAttachments = serializeGlobalRequestAttachments;
exports.sanitizeGlobalHistoryAttachments = sanitizeGlobalHistoryAttachments;
const path = __importStar(require("path"));
const MIME_TYPES_BY_EXTENSION = {
    ".bmp": "image/bmp",
    ".csv": "text/csv",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".md": "text/markdown",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webp": "image/webp",
};
function inferAttachmentType(name) {
    return MIME_TYPES_BY_EXTENSION[path.extname(String(name || "")).toLowerCase()] || "application/octet-stream";
}
function safeAttachmentUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || /^(?:data|blob|file):/i.test(raw))
        return "";
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/api/"))
        return raw.slice(0, 2048);
    return "";
}
function serializeGlobalRequestAttachments(files = []) {
    return (Array.isArray(files) ? files : []).flatMap((file) => {
        const storedFilename = path.basename(String(file?.savedPath || "").trim());
        if (!storedFilename)
            return [];
        const name = String(file?.filename || file?.name || storedFilename).trim().slice(0, 512) || storedFilename;
        return [{
                name,
                size: Math.max(0, Number(file?.size || 0)),
                type: String(file?.type || file?.contentType || inferAttachmentType(name)).trim().slice(0, 128),
                upload_url: `/api/uploads/${storedFilename}`,
                attachment_owner: "user",
            }];
    });
}
function sanitizeGlobalHistoryAttachments(value, role) {
    if (!Array.isArray(value))
        return [];
    const normalizedRole = String(role || "").toLowerCase();
    return value.flatMap((file) => {
        if (!file || typeof file !== "object")
            return [];
        const explicitOwner = String(file.attachment_owner || file.attachmentOwner || "").toLowerCase();
        const owner = normalizedRole === "user" ? "user" : explicitOwner;
        if (normalizedRole === "assistant" && owner !== "assistant")
            return [];
        if (!owner || !["user", "assistant"].includes(owner))
            return [];
        const uploadUrl = safeAttachmentUrl(file.upload_url || file.uploadUrl || file.url || file.preview);
        const name = String(file.name || file.filename || "附件").trim().slice(0, 512) || "附件";
        const size = Math.max(0, Number(file.size || 0));
        const type = String(file.type || file.content_type || file.contentType || inferAttachmentType(name)).trim().slice(0, 128);
        return [{
                name,
                size,
                type,
                ...(uploadUrl ? { upload_url: uploadUrl } : {}),
                attachment_owner: owner,
            }];
    });
}
exports.__globalAgentAttachmentTestHooks = {
    inferAttachmentType,
    safeAttachmentUrl,
};
//# sourceMappingURL=global-agent-attachments.js.map