import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { UPLOAD_DIR } from "../core/utils";
import { ingestRequirementSources } from "../modules/requirements/source-ingestion";

export const MAX_TASK_ATTACHMENT_COUNT = 10;
export const MAX_TASK_ATTACHMENT_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TASK_ATTACHMENT_TOTAL_BYTES = 60 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  ".bat", ".cmd", ".com", ".dll", ".exe", ".msi", ".ps1", ".scr", ".sh",
]);

function uniqueStrings(value: any) {
  return [...new Set((Array.isArray(value) ? value : value ? [value] : [])
    .map(item => String(item || "").trim())
    .filter(Boolean))];
}

function checksumFile(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function normalizedUploadPath(value: any) {
  const file = path.resolve(String(value || ""));
  const root = `${path.resolve(UPLOAD_DIR)}${path.sep}`;
  if (!file.startsWith(root)) throw new Error("附件路径不在受控上传目录中");
  return file;
}

function looksLikeImage(name: string) {
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(path.extname(name).toLowerCase());
}

function imageSignatureMatches(file: string, name: string) {
  const bytes = fs.readFileSync(file).subarray(0, 16);
  const ext = path.extname(name).toLowerCase();
  if (ext === ".png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if ([".jpg", ".jpeg"].includes(ext)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === ".gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (ext === ".webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (ext === ".bmp") return bytes.subarray(0, 2).toString("ascii") === "BM";
  return true;
}

export function removeUploadedFiles(files: any[]) {
  for (const file of files || []) {
    try {
      const target = normalizedUploadPath(file?.savedPath || file?.path);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    } catch {}
  }
}

export function validateTaskUploadedFiles(files: any[], retainedCount = 0, retainedBytes = 0) {
  const rows = Array.isArray(files) ? files : [];
  if (rows.length + Math.max(0, retainedCount) > MAX_TASK_ATTACHMENT_COUNT) {
    throw new Error(`每个任务最多上传 ${MAX_TASK_ATTACHMENT_COUNT} 个附件`);
  }
  let total = Math.max(0, Number(retainedBytes || 0));
  for (const file of rows) {
    const name = path.basename(String(file?.filename || file?.name || "附件"));
    const target = normalizedUploadPath(file?.savedPath || file?.path);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error(`${name} 上传不完整`);
    const size = fs.statSync(target).size;
    total += size;
    if (size <= 0) throw new Error(`${name} 是空文件`);
    if (size > MAX_TASK_ATTACHMENT_FILE_BYTES) throw new Error(`${name} 超过 25 MB`);
    if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) throw new Error(`${name} 属于不允许上传的可执行文件类型`);
    if (looksLikeImage(name) && !imageSignatureMatches(target, name)) throw new Error(`${name} 的图片格式与文件内容不一致`);
  }
  if (total > MAX_TASK_ATTACHMENT_TOTAL_BYTES) throw new Error("本次上传附件总大小不能超过 60 MB");
}

function contextBlock(source: any) {
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

export function renderTaskAttachmentContext(contexts: any[]) {
  const rows = (Array.isArray(contexts) ? contexts : []).map(item => String(item?.text || "").trim()).filter(Boolean);
  return rows.length ? `[任务附件：以下内容属于当前任务，必须在执行和验收时读取]\n${rows.join("\n\n")}` : "";
}

async function ingestFiles(files: any[], userText: string) {
  if (!files.length) return { attachments: [], contexts: [], warnings: [], technical: null };
  const ingestion = await ingestRequirementSources({
    files,
    userText,
    extractRequirement: false,
    decomposeRequirement: false,
  });
  const byId = new Map((ingestion.sources || []).map((source: any) => [String(source.id || ""), source]));
  const attachments = (ingestion.attachments || []).map((attachment: any) => {
    const source: any = byId.get(String(attachment.id || ""));
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

export async function buildTaskAttachmentMutation(input: {
  files?: any[];
  currentAttachments?: any[];
  currentContexts?: any[];
  retainedIds?: any;
  userText?: string;
}) {
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
  const attachments = [...retained, ...added.attachments].slice(0, MAX_TASK_ATTACHMENT_COUNT);
  const contexts = [...retainedContexts, ...added.contexts]
    .filter((item, index, rows) => rows.findIndex(other => String(other?.id || "") === String(item?.id || "")) === index)
    .slice(0, MAX_TASK_ATTACHMENT_COUNT);
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

export function parseRetainedAttachmentIds(value: any) {
  if (Array.isArray(value)) return uniqueStrings(value);
  const raw = String(value || "").trim();
  if (!raw) return [];
  try { return uniqueStrings(JSON.parse(raw)); } catch { return uniqueStrings(raw.split(",")); }
}
