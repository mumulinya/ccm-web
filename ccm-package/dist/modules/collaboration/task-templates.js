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
exports.renderTaskTemplate = renderTaskTemplate;
exports.getTaskTemplate = getTaskTemplate;
exports.handleTaskTemplateApi = handleTaskTemplateApi;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const access_policy_1 = require("../system/access-policy");
const STORE_FILE = path.join(utils_1.CCM_DIR, "task-templates-v1.json");
const ALLOWED_PRIORITIES = new Set(["low", "normal", "high"]);
function emptyStore() {
    return { schema: "ccm-task-template-store-v1", revision: 0, templates: [], updatedAt: "" };
}
function safeText(value, limit) {
    return String(value || "").replace(/\u0000/g, "").trim().slice(0, limit);
}
function normalizeVariables(value) {
    const rows = Array.isArray(value) ? value : [];
    const seen = new Set();
    const result = [];
    for (const row of rows.slice(0, 40)) {
        const key = safeText(row?.key, 60).replace(/[^a-zA-Z0-9_.-]/g, "_");
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.push({
            key,
            label: safeText(row?.label || key, 80),
            required: row?.required === true,
            ...(row?.defaultValue != null || row?.default_value != null
                ? { defaultValue: safeText(row?.defaultValue ?? row?.default_value, 2000) }
                : {}),
        });
    }
    return result;
}
function normalizeTemplate(value) {
    const id = safeText(value?.id, 120);
    const name = safeText(value?.name, 120);
    const title = safeText(value?.title, 300);
    const instructions = safeText(value?.instructions, 20000);
    if (!id || !name || !title || !instructions)
        return null;
    const targetType = ["project", "group"].includes(String(value?.targetType || value?.target_type))
        ? String(value?.targetType || value?.target_type)
        : undefined;
    const targetId = safeText(value?.targetId || value?.target_id, 200) || undefined;
    const createdAt = String(value?.createdAt || value?.created_at || new Date().toISOString());
    return {
        schema: "ccm-task-template-v1",
        id,
        name,
        title,
        instructions,
        ...(targetType && targetId ? { targetType, targetId } : {}),
        priority: ALLOWED_PRIORITIES.has(String(value?.priority)) ? value.priority : "normal",
        variables: normalizeVariables(value?.variables),
        createdBy: safeText(value?.createdBy || value?.created_by || "legacy-system", 120),
        revision: Math.max(1, Math.floor(Number(value?.revision || 1))),
        createdAt,
        updatedAt: String(value?.updatedAt || value?.updated_at || createdAt),
    };
}
function loadStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, emptyStore());
    return {
        schema: "ccm-task-template-store-v1",
        revision: Math.max(0, Math.floor(Number(raw?.revision || 0))),
        templates: (Array.isArray(raw?.templates) ? raw.templates : []).map(normalizeTemplate).filter(Boolean),
        updatedAt: String(raw?.updatedAt || raw?.updated_at || ""),
    };
}
function saveStore(store) {
    const next = {
        schema: "ccm-task-template-store-v1",
        revision: Math.max(0, Number(store.revision || 0)) + 1,
        templates: store.templates,
        updatedAt: new Date().toISOString(),
    };
    (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, next);
    return next;
}
function principal(req) {
    const auth = req?.ccmAuth || {};
    return {
        userId: String(auth.userId || auth.user_id || "system"),
        role: String(auth.role || "admin"),
        admin: auth.role === "admin" || auth.kind !== "browser",
    };
}
function canUseTemplate(req, template) {
    const auth = principal(req);
    if (!auth.admin && template.createdBy !== auth.userId)
        return false;
    if (!template.targetType || !template.targetId || auth.admin)
        return true;
    return (0, access_policy_1.hasResourceAccess)(auth.userId, auth.role, template.targetType, template.targetId, "use");
}
function assertTargetAccess(req, targetType, targetId) {
    const auth = principal(req);
    if (!targetType || !targetId || auth.admin)
        return;
    if (!(0, access_policy_1.hasResourceAccess)(auth.userId, auth.role, targetType, targetId, "use")) {
        const error = new Error("当前账户没有模板目标资源的使用权限");
        error.status = 403;
        error.code = "RESOURCE_ACCESS_DENIED";
        throw error;
    }
}
function parsePayload(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 512 * 1024)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求JSON无效"));
            }
        });
        req.on("error", reject);
    });
}
function validateDraft(payload) {
    const name = safeText(payload?.name, 120);
    const title = safeText(payload?.title, 300);
    const instructions = safeText(payload?.instructions, 20000);
    if (!name)
        throw new Error("请输入模板名称");
    if (!title)
        throw new Error("请输入任务标题");
    if (!instructions)
        throw new Error("请输入任务要求");
    const targetType = ["project", "group"].includes(String(payload?.targetType || payload?.target_type))
        ? String(payload?.targetType || payload?.target_type)
        : undefined;
    const targetId = safeText(payload?.targetId || payload?.target_id, 200) || undefined;
    if ((targetType && !targetId) || (!targetType && targetId))
        throw new Error("模板目标类型和目标资源必须同时填写");
    return {
        name,
        title,
        instructions,
        ...(targetType && targetId ? { targetType, targetId } : {}),
        priority: ALLOWED_PRIORITIES.has(String(payload?.priority)) ? payload.priority : "normal",
        variables: normalizeVariables(payload?.variables),
    };
}
function renderTaskTemplate(template, values = {}) {
    const resolved = {};
    const missing = [];
    for (const variable of template.variables) {
        const value = safeText(values?.[variable.key] ?? variable.defaultValue ?? "", 2000);
        resolved[variable.key] = value;
        if (variable.required && !value)
            missing.push(variable.key);
    }
    const replace = (text) => text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => resolved[key] ?? "");
    return { title: replace(template.title), instructions: replace(template.instructions), values: resolved, missing, valid: missing.length === 0 };
}
function getTaskTemplate(id) {
    return loadStore().templates.find(item => item.id === id) || null;
}
function handleTaskTemplateApi(pathname, req, res) {
    if (pathname === "/api/task-templates" && req.method === "GET") {
        const store = loadStore();
        (0, utils_1.sendJson)(res, { success: true, revision: store.revision, templates: store.templates.filter(template => canUseTemplate(req, template)) });
        return true;
    }
    if (pathname === "/api/task-templates/render" && req.method === "POST") {
        void parsePayload(req).then(payload => {
            const template = getTaskTemplate(String(payload.id || payload.templateId || ""));
            if (!template || !canUseTemplate(req, template))
                return (0, utils_1.sendJson)(res, { success: false, error: "任务模板不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, rendered: renderTaskTemplate(template, payload.values || {}) });
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/task-templates" && req.method === "POST") {
        void parsePayload(req).then(payload => {
            const draft = validateDraft(payload);
            assertTargetAccess(req, draft.targetType, draft.targetId);
            const auth = principal(req);
            const template = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
                const store = loadStore();
                const now = new Date().toISOString();
                const created = { schema: "ccm-task-template-v1", id: `tt_${crypto.randomUUID()}`, ...draft, createdBy: auth.userId, revision: 1, createdAt: now, updatedAt: now };
                store.templates.push(created);
                saveStore(store);
                return created;
            });
            (0, utils_1.sendJson)(res, { success: true, template }, 201);
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 400));
        return true;
    }
    const match = pathname.match(/^\/api\/task-templates\/([^/]+)$/);
    if (match && ["PUT", "DELETE"].includes(req.method)) {
        void parsePayload(req).then(payload => {
            const id = decodeURIComponent(match[1]);
            const auth = principal(req);
            const result = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
                const store = loadStore();
                const index = store.templates.findIndex(item => item.id === id);
                if (index < 0 || !canUseTemplate(req, store.templates[index])) {
                    const error = new Error("任务模板不存在");
                    error.status = 404;
                    throw error;
                }
                const current = store.templates[index];
                if (Number(payload.revision) !== current.revision) {
                    const error = new Error("模板已经发生变化，请刷新后重试");
                    error.status = 409;
                    error.code = "TASK_TEMPLATE_REVISION_CONFLICT";
                    throw error;
                }
                if (req.method === "DELETE") {
                    store.templates.splice(index, 1);
                    saveStore(store);
                    return { deleted: true, id };
                }
                const draft = validateDraft(payload);
                assertTargetAccess(req, draft.targetType, draft.targetId);
                const updated = { ...current, ...draft, createdBy: current.createdBy || auth.userId, revision: current.revision + 1, updatedAt: new Date().toISOString() };
                store.templates[index] = updated;
                saveStore(store);
                return { template: updated };
            });
            (0, utils_1.sendJson)(res, { success: true, ...result });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=task-templates.js.map