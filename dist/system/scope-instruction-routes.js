"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleScopeInstructionRoutes = handleScopeInstructionRoutes;
const db_1 = require("../core/db");
const utils_1 = require("../core/utils");
const access_policy_1 = require("../modules/system/access-policy");
const storage_1 = require("../modules/collaboration/storage");
const scope_instructions_1 = require("./scope-instructions");
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => { try {
            resolve(JSON.parse(body || "{}"));
        }
        catch (error) {
            reject(error);
        } });
        req.on("error", reject);
    });
}
function principal(req) { return req?.ccmAuth || null; }
function allowedIds(req) {
    const actor = principal(req);
    const projects = (0, db_1.getConfigs)().map(item => String(item.name || "")).filter(Boolean);
    const groups = (0, storage_1.loadGroups)().map(item => String(item.id || "")).filter(Boolean);
    if (!actor || actor.kind !== "browser" || actor.role === "admin")
        return { projects, groups };
    return {
        projects: projects.filter(id => (0, access_policy_1.hasResourceAccess)(actor.userId, actor.role, "project", id, "use")),
        groups: groups.filter(id => (0, access_policy_1.hasResourceAccess)(actor.userId, actor.role, "group", id, "use")),
    };
}
function authorizeEntry(req, res, documentId, level) {
    const entry = (0, scope_instructions_1.getScopeInstructionCatalogEntry)(documentId);
    if (!entry) {
        (0, utils_1.sendJson)(res, { success: false, error: "认知文档不存在", code: "SCOPE_INSTRUCTION_NOT_FOUND" }, 404);
        return null;
    }
    const type = entry.kind === "project" ? "project" : "group";
    const id = entry.kind === "project" ? entry.projectId : entry.groupId;
    if (!(0, access_policy_1.authorizeResource)(req, res, type, id, level))
        return null;
    return entry;
}
function errorResponse(res, error) {
    const code = String(error?.code || "SCOPE_INSTRUCTION_REQUEST_FAILED");
    const status = /CONFLICT|CHECKSUM/.test(code) ? 409 : /NOT_FOUND/.test(code) ? 404 : /ACCESS_DENIED/.test(code) ? 403 : 400;
    (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error || "认知文档请求失败"), code }, status);
}
function handleScopeInstructionRoutes(pathname, req, res, parsed) {
    if (!pathname.startsWith("/api/scope-instructions"))
        return false;
    if (pathname === "/api/scope-instructions/catalog" && req.method === "GET") {
        const allowed = allowedIds(req);
        const scope = String(parsed?.query?.scope || "global");
        const scopeId = String(parsed?.query?.scope_id || parsed?.query?.scopeId || (scope === "global" ? "global" : ""));
        if (!(["global", "group", "project"].includes(scope)) || !scopeId)
            return (0, utils_1.sendJson)(res, { success: false, error: "认知文档目录作用域无效" }, 400), true;
        if (scope !== "global" && !(0, access_policy_1.authorizeResource)(req, res, scope, scopeId, "use"))
            return true;
        const scopeGroup = scope === "group" ? (0, storage_1.loadGroups)().find(group => String(group?.id || "") === scopeId) : null;
        const scopeProjects = scopeGroup
            ? (scopeGroup.members || []).map((member) => String(member?.project || "")).filter((id) => allowed.projects.includes(id))
            : scope === "project" ? [scopeId] : allowed.projects;
        const entries = (0, scope_instructions_1.listScopeInstructionCatalog)({
            scope: scope, scopeId,
            allowedProjects: scopeProjects,
            // A normal project page/session only advertises PROJECT.md. A
            // group-specific project instruction is exposed by the group task
            // identity, never merely because the user can access that group.
            allowedGroups: scope === "group" ? [scopeId] : scope === "global" ? allowed.groups : [],
        }).filter(entry => scope !== "group" || entry.groupId === scopeId);
        (0, utils_1.sendJson)(res, { success: true, scope, scopeId, entries });
        return true;
    }
    if (pathname === "/api/scope-instructions/detail" && req.method === "GET") {
        const id = String(parsed?.query?.id || "");
        if (!authorizeEntry(req, res, id, "use"))
            return true;
        try {
            res.setHeader("Cache-Control", "no-store");
            (0, utils_1.sendJson)(res, { success: true, ...(0, scope_instructions_1.readScopeInstructionDetail)(id) });
        }
        catch (error) {
            errorResponse(res, error);
        }
        return true;
    }
    if (pathname === "/api/scope-instructions/check" && req.method === "POST") {
        void parseBody(req).then(body => {
            const scope = String(body.scope || "").trim();
            const scopeId = String(body.scopeId || body.scope_id || "").trim();
            if (!(["project", "group"].includes(scope)) || !scopeId)
                throw new Error("认知文档刷新作用域无效");
            if (!(0, access_policy_1.authorizeResource)(req, res, scope, scopeId, "use"))
                return;
            (0, utils_1.sendJson)(res, { success: true, ...(0, scope_instructions_1.checkScopeInstructionFreshness)({ scope: scope, scopeId }) });
        }).catch(error => errorResponse(res, error));
        return true;
    }
    if (pathname === "/api/scope-instructions/regenerate" && req.method === "POST") {
        void parseBody(req).then(body => {
            if (!authorizeEntry(req, res, String(body.id || body.documentId || ""), "manage"))
                return;
            (0, utils_1.sendJson)(res, { success: true, entry: (0, scope_instructions_1.regenerateScopeInstruction)(String(body.id || body.documentId || ""), Number(body.revision || 0)) });
        }).catch(error => errorResponse(res, error));
        return true;
    }
    if (pathname === "/api/scope-instructions/supplement" && req.method === "POST") {
        void parseBody(req).then(body => {
            const id = String(body.id || body.documentId || "");
            if (!authorizeEntry(req, res, id, "manage"))
                return;
            const entry = (0, scope_instructions_1.supplementScopeInstruction)({ documentId: id, revision: Number(body.revision), content: String(body.content || "") });
            (0, utils_1.sendJson)(res, { success: true, entry });
        }).catch(error => errorResponse(res, error));
        return true;
    }
    if (pathname === "/api/scope-instructions/group-purpose" && req.method === "POST") {
        void parseBody(req).then(body => {
            const groupId = String(body.groupId || body.group_id || "").trim();
            const purpose = String(body.purpose || "").trim();
            if (!groupId)
                throw new Error("群聊不能为空");
            if (!(0, access_policy_1.authorizeResource)(req, res, "group", groupId, "manage"))
                return;
            const groups = (0, storage_1.loadGroups)();
            const group = groups.find(item => String(item.id || "") === groupId);
            if (!group)
                throw Object.assign(new Error("群聊不存在"), { code: "SCOPE_INSTRUCTION_NOT_FOUND" });
            group.purpose = purpose.slice(0, 2_000);
            group.purpose_revision = Math.max(0, Number(group.purpose_revision || 0)) + 1;
            group.purpose_updated_at = new Date().toISOString();
            (0, storage_1.saveGroups)(groups);
            const entries = (0, scope_instructions_1.ensureGroupScopeInstructions)({
                groupId, name: group.name, purpose: group.purpose,
                projectIds: (group.members || []).map((member) => String(member?.project || "")).filter((id) => id && id !== "coordinator"),
            });
            (0, utils_1.sendJson)(res, { success: true, group: { id: group.id, name: group.name, purpose: group.purpose, purpose_revision: group.purpose_revision }, entries });
        }).catch(error => errorResponse(res, error));
        return true;
    }
    (0, utils_1.sendJson)(res, { success: false, error: "Not Found" }, 404);
    return true;
}
//# sourceMappingURL=scope-instruction-routes.js.map