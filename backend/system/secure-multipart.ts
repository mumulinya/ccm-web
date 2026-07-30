import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import Busboy from "busboy";
import { UPLOAD_DIR } from "../core/utils";

export const MAX_MULTIPART_REQUEST_BYTES = 64 * 1024 * 1024;
export const MAX_MULTIPART_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MULTIPART_TOTAL_FILE_BYTES = 60 * 1024 * 1024;
export const MAX_MULTIPART_FIELD_BYTES = 1024 * 1024;
export const MAX_MULTIPART_FILES = 10;

const BLOCKED_EXTENSIONS = new Set([".bat", ".cmd", ".com", ".dll", ".exe", ".msi", ".ps1", ".scr", ".sh"]);
const STAGING_DIR = path.join(UPLOAD_DIR, ".staging");

function safeOriginalName(value: string) {
  const name = path.basename(String(value || "附件").replace(/\0/g, "")).trim() || "附件";
  if (name.length > 240) throw new Error("附件名称过长");
  const segments = name.toLowerCase().split(".").filter(Boolean);
  if (segments.slice(0, -1).some(segment => BLOCKED_EXTENSIONS.has(`.${segment}`))) {
    throw new Error(`${name} 使用了不允许的双扩展名`);
  }
  if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) throw new Error(`${name} 属于不允许上传的可执行文件类型`);
  return name;
}

function signatureMatches(file: string, name: string) {
  const bytes = fs.readFileSync(file).subarray(0, 32);
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if ([".docx", ".xlsx", ".pptx"].includes(ext)) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (ext === ".png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if ([".jpg", ".jpeg"].includes(ext)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === ".gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (ext === ".webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (ext === ".bmp") return bytes.subarray(0, 2).toString("ascii") === "BM";
  if (ext === ".mp3" || ext === ".aac") return bytes.subarray(0, 3).toString("ascii") === "ID3" || bytes[0] === 0xff;
  if (ext === ".wav") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WAVE";
  if (ext === ".ogg") return bytes.subarray(0, 4).toString("ascii") === "OggS";
  if (ext === ".flac") return bytes.subarray(0, 4).toString("ascii") === "fLaC";
  if (ext === ".m4a") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  return true;
}

function mimeMatchesName(name: string, mimeType: string) {
  const mime = String(mimeType || "").toLowerCase();
  if (!mime || mime === "application/octet-stream") return true;
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return mime === "application/pdf";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(ext)) {
    const expected = ext === ".jpg" ? "image/jpeg" : ext === ".jpeg" ? "image/jpeg" : `image/${ext.slice(1)}`;
    return mime === expected;
  }
  if (ext === ".docx") return ["application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mime);
  if (ext === ".xlsx") return ["application/zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(mime);
  if (ext === ".pptx") return ["application/zip", "application/vnd.openxmlformats-officedocument.presentationml.presentation"].includes(mime);
  if ([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"].includes(ext)) {
    return mime.startsWith("audio/") || (ext === ".m4a" && mime === "video/mp4");
  }
  return mime.startsWith("text/") || ["application/json", "application/xml", "text/xml"].includes(mime);
}

function removeFiles(paths: string[]) {
  for (const file of paths) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}

export async function parseSecureMultipartRequest(req: any, options: {
  timeoutMs?: number;
  maxFiles?: number;
  maxRequestBytes?: number;
  maxFileBytes?: number;
  maxTotalFileBytes?: number;
  allowedExtensions?: string[];
} = {}) {
  const maxFiles = Math.max(1, Math.min(MAX_MULTIPART_FILES, Number(options.maxFiles || MAX_MULTIPART_FILES)));
  const maxRequestBytes = Math.max(1024, Number(options.maxRequestBytes || MAX_MULTIPART_REQUEST_BYTES));
  const maxFileBytes = Math.max(1024, Number(options.maxFileBytes || MAX_MULTIPART_FILE_BYTES));
  const maxTotalFileBytes = Math.max(1024, Number(options.maxTotalFileBytes || MAX_MULTIPART_TOTAL_FILE_BYTES));
  const allowedExtensions = options.allowedExtensions?.length
    ? new Set(options.allowedExtensions.map(item => String(item).toLowerCase()))
    : null;
  const declared = Number(req.headers?.["content-length"] || 0);
  if (declared > maxRequestBytes) throw new Error(`附件请求超过 ${Math.ceil(maxRequestBytes / 1024 / 1024)} MB`);
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const staged: string[] = [];
  const committed: string[] = [];
  const fields: Record<string, string> = {};
  const pending: Promise<void>[] = [];
  let requestBytes = 0;
  let totalFileBytes = 0;
  let terminalError: Error | null = null;
  let parser: any;
  try {
    parser = Busboy({
      headers: req.headers,
      limits: { files: maxFiles, fileSize: maxFileBytes, fields: 64, fieldSize: MAX_MULTIPART_FIELD_BYTES, parts: maxFiles + 64 },
    });
  } catch {
    throw new Error("无效的附件请求");
  }

  const files: any[] = [];
  const timeoutMs = Math.max(5_000, Number(options.timeoutMs || 120_000));
  return await new Promise<{ fields: Record<string, string>; files: any[] }>((resolve, reject) => {
    const timer = setTimeout(() => {
      terminalError = new Error("附件上传超时");
      req.destroy(terminalError);
    }, timeoutMs);
    const fail = (error: any) => {
      clearTimeout(timer);
      removeFiles([...staged, ...committed]);
      reject(error instanceof Error ? error : new Error(String(error || "附件上传失败")));
    };

    req.on("data", (chunk: Buffer) => {
      requestBytes += Buffer.byteLength(chunk);
      if (requestBytes > maxRequestBytes && !terminalError) {
        terminalError = new Error(`附件请求超过 ${Math.ceil(maxRequestBytes / 1024 / 1024)} MB`);
        req.unpipe(parser);
        parser.destroy(terminalError);
      }
    });
    req.on("aborted", () => fail(terminalError || new Error("附件上传已中断")));
    req.on("error", fail);
    parser.on("error", fail);
    parser.on("filesLimit", () => { terminalError = new Error(`每次最多上传 ${maxFiles} 个附件`); });
    parser.on("fieldsLimit", () => { terminalError = new Error("附件表单字段过多"); });
    parser.on("partsLimit", () => { terminalError = new Error("附件请求包含过多内容段"); });
    parser.on("field", (name: string, value: string, info: any) => {
      if (info?.valueTruncated) terminalError = new Error(`${name} 字段超过 1 MB`);
      fields[name] = value;
    });
    parser.on("file", (field: string, stream: any, info: any) => {
      let originalName: string;
      try { originalName = safeOriginalName(info?.filename || "附件"); } catch (error: any) {
        terminalError = error;
        stream.resume();
        return;
      }
      const ext = path.extname(originalName).toLowerCase();
      if (allowedExtensions && !allowedExtensions.has(ext)) {
        terminalError = new Error(`${originalName} 的文件类型不受支持`);
        stream.resume();
        return;
      }
      if (!mimeMatchesName(originalName, String(info?.mimeType || ""))) {
        terminalError = new Error(`${originalName} 的MIME类型与扩展名不一致`);
        stream.resume();
        return;
      }
      const nonce = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      const stagingPath = path.join(STAGING_DIR, `${nonce}${ext}`);
      const finalPath = path.join(UPLOAD_DIR, `${nonce}${ext}`);
      staged.push(stagingPath);
      let size = 0;
      const writer = fs.createWriteStream(stagingPath, { flags: "wx", mode: 0o600 });
      const completion = new Promise<void>((done, failWrite) => {
        stream.on("data", (chunk: Buffer) => { size += chunk.length; totalFileBytes += chunk.length; });
        stream.on("limit", () => { terminalError = new Error(`${originalName} 超过 ${Math.ceil(maxFileBytes / 1024 / 1024)} MB`); });
        stream.on("error", failWrite);
        writer.on("error", failWrite);
        writer.on("finish", () => {
          if (size <= 0) return failWrite(new Error(`${originalName} 是空文件`));
          if (totalFileBytes > maxTotalFileBytes) return failWrite(new Error(`本次上传附件总大小不能超过 ${Math.ceil(maxTotalFileBytes / 1024 / 1024)} MB`));
          if (!signatureMatches(stagingPath, originalName)) return failWrite(new Error(`${originalName} 的扩展名与文件内容不一致`));
          fs.renameSync(stagingPath, finalPath);
          committed.push(finalPath);
          files.push({ field, filename: originalName, savedPath: finalPath, size, contentType: String(info?.mimeType || "") });
          done();
        });
      });
      pending.push(completion);
      stream.pipe(writer);
    });
    parser.on("close", async () => {
      try {
        await Promise.all(pending);
        clearTimeout(timer);
        if (terminalError) throw terminalError;
        resolve({ fields, files });
      } catch (error) {
        fail(error);
      }
    });
    req.pipe(parser);
  });
}

export function cleanupSecureMultipartFiles(files: any[]) {
  removeFiles((files || []).map(file => String(file?.savedPath || file?.path || "")).filter(Boolean));
}
