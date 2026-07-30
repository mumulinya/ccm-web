"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSharedFilesV2Api = handleSharedFilesV2Api;
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const secure_multipart_1 = require("../../system/secure-multipart");
const storage_1 = require("../collaboration/storage");
const shared_files_v2_1 = require("./shared-files-v2");
function exactScope(scopeInput, scopeIdInput) {
    const scope = String(scopeInput || "global");
    if (!["global", "group", "project"].includes(scope))
        throw new Error("共享文件作用域无效");
    const scopeId = scope === "global" ? "global" : String(scopeIdInput || "").trim();
    if (scope === "project" && !(0, db_1.loadProjectConfigs)()[scopeId])
        throw new Error("项目不存在或已归档");
    if (scope === "group" && !(0, storage_1.loadGroups)().some((group) => String(group.id) === scopeId))
        throw new Error("群聊不存在");
    return { scope, scopeId };
}
function readJsonBody(req, maxBytes = 1100 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
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
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            }
            catch {
                reject(new Error("请求JSON无效"));
            }
        });
        req.on("error", reject);
    });
}
function handleSharedFilesV2Api(pathname, req, res, parsed) {
    if (pathname === "/api/shared-files/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, shared_files_v2_1.sharedFileV2Status)() });
        return true;
    }
    if (pathname === "/api/shared-files" && req.method === "GET") {
        try {
            const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
            (0, utils_1.sendJson)(res, { success: true, scope, scope_id: scopeId, files: (0, shared_files_v2_1.listSharedFilesV2)(scope, scopeId) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取共享文件失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/shared-files/read" && req.method === "GET") {
        try {
            const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
            const file = (0, shared_files_v2_1.readSharedFileV2)(scope, scopeId, parsed.query.file_id);
            if (!file)
                return (0, utils_1.sendJson)(res, { success: false, error: "共享文件不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, file });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取共享文件失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/shared-files/chunk" && req.method === "GET") {
        try {
            const { scope, scopeId } = exactScope(parsed.query.scope, parsed.query.scope_id);
            const chunk = (0, shared_files_v2_1.readSharedFileChunkV2)(scope, scopeId, parsed.query.file_id, parsed.query.chunk_id);
            if (!chunk)
                return (0, utils_1.sendJson)(res, { success: false, error: "共享文件分片不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, chunk });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取共享文件分片失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/shared-files/text" && req.method === "POST") {
        void readJsonBody(req).then(body => {
            const { scope, scopeId } = exactScope(body.scope, body.scope_id);
            const file = (0, shared_files_v2_1.upsertSharedTextV2)(scope, scopeId, body.name, body.content);
            (0, utils_1.sendJson)(res, { success: true, file, files: (0, shared_files_v2_1.listSharedFilesV2)(scope, scopeId) });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "保存共享文本失败" }, 400));
        return true;
    }
    if (pathname === "/api/shared-files/upload" && req.method === "POST") {
        if (!String(req.headers["content-type"] || "").includes("multipart/form-data")) {
            (0, utils_1.sendJson)(res, { success: false, error: "需要 multipart/form-data" }, 400);
            return true;
        }
        void (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(result => {
            try {
                const { scope, scopeId } = exactScope(result.fields.scope, result.fields.scope_id);
                const files = result.files.map(file => (0, shared_files_v2_1.adoptSharedUploadV2)(scope, scopeId, file));
                (0, secure_multipart_1.cleanupSecureMultipartFiles)(result.files);
                (0, utils_1.sendJson)(res, { success: true, files, inventory: (0, shared_files_v2_1.listSharedFilesV2)(scope, scopeId) });
            }
            catch (error) {
                (0, secure_multipart_1.cleanupSecureMultipartFiles)(result.files);
                throw error;
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "上传共享文件失败" }, 400));
        return true;
    }
    if (pathname === "/api/shared-files/delete" && req.method === "POST") {
        void readJsonBody(req, 64 * 1024).then(body => {
            const { scope, scopeId } = exactScope(body.scope, body.scope_id);
            const deleted = (0, shared_files_v2_1.deleteSharedFileV2)(scope, scopeId, body.file_id);
            if (!deleted)
                return (0, utils_1.sendJson)(res, { success: false, error: "共享文件不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, files: (0, shared_files_v2_1.listSharedFilesV2)(scope, scopeId) });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "删除共享文件失败" }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=shared-files-api.js.map