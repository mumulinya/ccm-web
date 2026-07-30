import type { IncomingMessage, ServerResponse } from "http";
import { loadProjectConfigs } from "../../core/db";
import { sendJson } from "../../core/utils";
import { parseSecureMultipartRequest, cleanupSecureMultipartFiles } from "../../system/secure-multipart";
import { loadGroups } from "../collaboration/storage";
import {
  adoptSharedUploadV2,
  deleteSharedFileV2,
  listSharedFilesV2,
  readSharedFileChunkV2,
  readSharedFileV2,
  sharedFileV2Status,
  upsertSharedTextV2,
  type SharedFileScope,
} from "./shared-files-v2";

function exactScope(scopeInput: unknown, scopeIdInput: unknown) {
  const scope = String(scopeInput || "global") as SharedFileScope;
  if (!["global", "group", "project"].includes(scope)) throw new Error("共享文件作用域无效");
  const scopeId = scope === "global" ? "global" : String(scopeIdInput || "").trim();
  if (scope === "project" && !loadProjectConfigs()[scopeId]) throw new Error("项目不存在或已归档");
  if (scope === "group" && !loadGroups().some((group: any) => String(group.id) === scopeId)) throw new Error("群聊不存在");
  return { scope, scopeId };
}

function readJsonBody(req: IncomingMessage, maxBytes = 1100 * 1024) {
  return new Promise<any>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        reject(new Error("共享文件请求体超过限制"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("请求JSON无效")); }
    });
    req.on("error", reject);
  });
}

export function handleSharedFilesV2Api(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any) {
  if (pathname === "/api/shared-files/status" && req.method === "GET") {
    sendJson(res, { success: true, ...sharedFileV2Status() });
    return true;
  }

  if (pathname === "/api/shared-files" && req.method === "GET") {
    try {
      const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
      sendJson(res, { success: true, scope, scope_id: scopeId, files: listSharedFilesV2(scope, scopeId) });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取共享文件失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/shared-files/read" && req.method === "GET") {
    try {
      const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
      const file = readSharedFileV2(scope, scopeId, parsed.query.file_id);
      if (!file) return sendJson(res, { success: false, error: "共享文件不存在" }, 404);
      sendJson(res, { success: true, file });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取共享文件失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/shared-files/chunk" && req.method === "GET") {
    try {
      const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
      const chunk = readSharedFileChunkV2(scope, scopeId, parsed.query.file_id, parsed.query.chunk_id);
      if (!chunk) return sendJson(res, { success: false, error: "共享文件分片不存在" }, 404);
      sendJson(res, { success: true, chunk });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取共享文件分片失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/shared-files/text" && req.method === "POST") {
    void readJsonBody(req).then(body => {
      const { scope, scopeId } = exactScope(body.scope, body.scope_id);
      const file = upsertSharedTextV2(scope, scopeId, body.name, body.content);
      sendJson(res, { success: true, file, files: listSharedFilesV2(scope, scopeId) });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "保存共享文本失败" }, 400));
    return true;
  }

  if (pathname === "/api/shared-files/upload" && req.method === "POST") {
    if (!String(req.headers["content-type"] || "").includes("multipart/form-data")) {
      sendJson(res, { success: false, error: "需要 multipart/form-data" }, 400);
      return true;
    }
    void parseSecureMultipartRequest(req).then(result => {
      try {
        const { scope, scopeId } = exactScope(result.fields.scope, result.fields.scope_id);
        const files = result.files.map(file => adoptSharedUploadV2(scope, scopeId, file));
        cleanupSecureMultipartFiles(result.files);
        sendJson(res, { success: true, files, inventory: listSharedFilesV2(scope, scopeId) });
      } catch (error) {
        cleanupSecureMultipartFiles(result.files);
        throw error;
      }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "上传共享文件失败" }, 400));
    return true;
  }

  if (pathname === "/api/shared-files/delete" && req.method === "POST") {
    void readJsonBody(req, 64 * 1024).then(body => {
      const { scope, scopeId } = exactScope(body.scope, body.scope_id);
      const deleted = deleteSharedFileV2(scope, scopeId, body.file_id);
      if (!deleted) return sendJson(res, { success: false, error: "共享文件不存在" }, 404);
      sendJson(res, { success: true, files: listSharedFilesV2(scope, scopeId) });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "删除共享文件失败" }, 400));
    return true;
  }

  return false;
}
