import * as path from "path";

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
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

function inferAttachmentType(name: string) {
  return MIME_TYPES_BY_EXTENSION[path.extname(String(name || "")).toLowerCase()] || "application/octet-stream";
}

function safeAttachmentUrl(value: any) {
  const raw = String(value || "").trim();
  if (!raw || /^(?:data|blob|file):/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/api/")) return raw.slice(0, 2048);
  return "";
}

export function serializeGlobalRequestAttachments(files: any[] = []) {
  return (Array.isArray(files) ? files : []).flatMap((file: any) => {
    const storedFilename = path.basename(String(file?.savedPath || "").trim());
    if (!storedFilename) return [];
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

export function sanitizeGlobalHistoryAttachments(value: any, role: string) {
  if (!Array.isArray(value)) return [];
  const normalizedRole = String(role || "").toLowerCase();
  return value.flatMap((file: any) => {
    if (!file || typeof file !== "object") return [];
    const explicitOwner = String(file.attachment_owner || file.attachmentOwner || "").toLowerCase();
    const owner = normalizedRole === "user" ? "user" : explicitOwner;
    if (normalizedRole === "assistant" && owner !== "assistant") return [];
    if (!owner || !["user", "assistant"].includes(owner)) return [];

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

export const __globalAgentAttachmentTestHooks = {
  inferAttachmentType,
  safeAttachmentUrl,
};
