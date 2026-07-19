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
exports.handleBasicGroupRoutes = handleBasicGroupRoutes;
// Behavior-freeze split from group-routes.ts (part 3/3).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("./storage");
const logs_1 = require("./logs");
const group_orchestrator_1 = require("./group-orchestrator");
const tool_authorization_1 = require("../../tools/tool-authorization");
const group_memory_compaction_1 = require("./group-memory-compaction");
const model_capability_cache_1 = require("./model-capability-cache");
const group_session_maintenance_1 = require("./group-session-maintenance");
const group_memory_context_1 = require("./group-memory-context");
const group_routes_part_01_1 = require("./group-routes-part-01");
const group_routes_part_02_1 = require("./group-routes-part-02");
function handleBasicGroupRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    if (pathname === "/api/groups" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { groups: (0, storage_1.loadGroups)() });
        return true;
    }
    if (pathname === "/api/groups/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, members } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const id = "g" + Date.now().toString(36);
                const allMembers = Array.isArray(members) ? members : [];
                const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
                    id, name, members: allMembers,
                    created_at: new Date().toISOString(),
                });
                groups.push(group);
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/members" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, add, remove } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (add) {
                    for (const m of add) {
                        if (!group.members.find((x) => x.project === m.project)) {
                            group.members.push(m);
                        }
                    }
                }
                if (remove) {
                    const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                    group.members = group.members.filter((m) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
                }
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)().filter(g => g.id !== id);
                (0, storage_1.saveGroups)(groups);
                try {
                    fs.unlinkSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${id}.json`));
                }
                catch { }
                try {
                    fs.unlinkSync(deps.getGroupMemoryFile(id));
                }
                catch { }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, name } = JSON.parse(body);
                if (!name || !name.trim())
                    return (0, utils_1.sendJson)(res, { error: "群聊名称不能为空" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.name = name.trim();
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = (0, storage_1.loadGroups)();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        const toolAuth = (0, tool_authorization_1.buildToolAuthorizationPayload)(group.tools || {});
        (0, utils_1.sendJson)(res, { tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, tools } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                const previousTools = (0, tool_authorization_1.normalizeToolAuthorization)(group.tools || {});
                group.tools = (0, tool_authorization_1.normalizeToolAuthorization)(tools);
                (0, storage_1.saveGroups)(groups);
                const toolAuth = await (0, tool_authorization_1.buildFreshToolAuthorizationPayload)(group.tools);
                const authorizationChange = (0, tool_authorization_1.recordToolAuthorizationChange)({
                    scope: "group",
                    scopeId: group_id,
                    previous: previousTools,
                    next: group.tools,
                    actor: "api",
                    source: "/api/groups/tools",
                    toolAudit: toolAuth.tool_audit,
                    authorizationReadiness: toolAuth.authorization_readiness,
                });
                (0, utils_1.sendJson)(res, { success: true, tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight, authorization_change: authorizationChange });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = (0, storage_1.loadGroups)();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        const before = JSON.stringify(group.shared_files || []);
        group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
        if (JSON.stringify(group.shared_files) !== before)
            (0, storage_1.saveGroups)(groups);
        (0, utils_1.sendJson)(res, { files: group.shared_files || [] });
        return true;
    }
    if (pathname === "/api/groups/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name, content } = JSON.parse(body);
                if (!name || !content)
                    return (0, utils_1.sendJson)(res, { error: "文件名和内容不能为空" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                const existing = group.shared_files.findIndex((f) => f.name === name);
                if (existing >= 0) {
                    group.shared_files[existing].content = content;
                    group.shared_files[existing].type = "text";
                    group.shared_files[existing].readable = true;
                    group.shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    group.shared_files.push({
                        name,
                        type: "text",
                        readable: true,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                group.shared_files = group.shared_files.filter((f) => f.name !== name);
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/import" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, file_names } = JSON.parse(body);
                if (!file_names || !Array.isArray(file_names))
                    return (0, utils_1.sendJson)(res, { error: "请提供文件名列表" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                let imported = 0;
                for (const name of file_names) {
                    const filePath = ctx.getSharedFilePath(name);
                    if (filePath && fs.existsSync(filePath)) {
                        const record = ctx.createSharedFileRecord(name, "global");
                        if (!record)
                            continue;
                        const existing = group.shared_files.findIndex((f) => f.name === name);
                        if (existing >= 0) {
                            group.shared_files[existing] = {
                                ...group.shared_files[existing],
                                ...record,
                                created_at: group.shared_files[existing].created_at || record.created_at,
                                updated_at: new Date().toISOString()
                            };
                        }
                        else {
                            group.shared_files.push(record);
                        }
                        imported++;
                    }
                }
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, imported, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/memory/capacity" && req.method === "GET") {
        const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
        const capacity = (0, group_memory_compaction_1.resolveGroupModelContextCapacity)(config);
        (0, utils_1.sendJson)(res, {
            success: true,
            schema: "ccm-group-memory-capacity-status-v1",
            capacity,
            capabilityCache: (0, model_capability_cache_1.summarizeModelCapabilityCache)((0, model_capability_cache_1.readModelCapabilityCache)()),
            configuredAutoCompactThreshold: Number(config.modelAutoCompactTokenLimit || 0),
            effectiveAutoCompactThreshold: (0, group_memory_compaction_1.getGroupAutoCompactThreshold)(config),
            preset: String(config.memoryContextPreset || "default"),
            model: String(config.model || ""),
            generatedAt: new Date().toISOString(),
        });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities" && req.method === "GET") {
        const cache = (0, model_capability_cache_1.readModelCapabilityCache)();
        (0, utils_1.sendJson)(res, { success: true, cache: (0, model_capability_cache_1.summarizeModelCapabilityCache)(cache), entries: cache.entries, refreshPlan: (0, model_capability_cache_1.buildModelCapabilityRefreshPlan)(), refreshStatus: (0, model_capability_cache_1.readModelCapabilityRefreshStatus)(), refreshOutcomeLedger: (0, model_capability_cache_1.readModelCapabilityRefreshOutcomeLedger)(), invalidRefreshOutcomes: (0, model_capability_cache_1.readInvalidPendingModelCapabilityRefreshOutcomes)(), downgradeAlerts: (0, model_capability_cache_1.readModelCapabilityDowngradeAlerts)(20), generatedAt: new Date().toISOString() });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities/invalid-outcomes" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, model_capability_cache_1.readInvalidPendingModelCapabilityRefreshOutcomes)(), generatedAt: new Date().toISOString() });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities/invalid-outcomes/acknowledge" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = (0, model_capability_cache_1.acknowledgeInvalidPendingModelCapabilityRefreshOutcome)({ ...payload, acknowledgedBy: "memory-center" });
                if (!result.acknowledged)
                    return (0, utils_1.sendJson)(res, { success: false, error: result.reason || "确认失败", result }, 409);
                (0, utils_1.sendJson)(res, { success: true, result, invalidRefreshOutcomes: (0, model_capability_cache_1.readInvalidPendingModelCapabilityRefreshOutcomes)() });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                if (String(payload.source || "") !== "user_setting") {
                    return (0, utils_1.sendJson)(res, { error: "Memory Center 只能写入 user_setting；provider 与 native receipt 由可信执行链写入" }, 400);
                }
                const result = (0, model_capability_cache_1.recordModelCapabilityEvidence)({ ...payload, source: "user_setting" });
                (0, utils_1.sendJson)(res, { success: true, ...result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities/revoke" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = (0, model_capability_cache_1.revokeModelCapabilityEvidence)({ ...payload, actor: "memory-center" });
                (0, utils_1.sendJson)(res, { success: true, result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/memory/capabilities/maintenance" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const dryRun = payload.dryRun !== false && payload.dry_run !== false;
                if (!dryRun && payload.explicitExecution !== true && payload.explicit_execution !== true) {
                    return (0, utils_1.sendJson)(res, { error: "实际清理需要 explicitExecution=true" }, 400);
                }
                const result = (0, model_capability_cache_1.runModelCapabilityCacheMaintenance)({ ...payload, dryRun });
                (0, utils_1.sendJson)(res, { success: true, result, cache: (0, model_capability_cache_1.summarizeModelCapabilityCache)((0, model_capability_cache_1.readModelCapabilityCache)()) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/sessions/maintenance" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, status: (0, group_session_maintenance_1.readGroupSessionRetentionMaintenanceStatus)() });
        return true;
    }
    if (pathname === "/api/groups/sessions/maintenance" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const dryRun = payload.dryRun !== false && payload.dry_run !== false;
                if (!dryRun && payload.explicitExecution !== true && payload.explicit_execution !== true) {
                    return (0, utils_1.sendJson)(res, { error: "实际清理需要 explicitExecution=true" }, 400);
                }
                const status = (0, group_session_maintenance_1.runGroupSessionRetentionMaintenance)({ ...payload, dryRun, force: true, trigger: "manual-api" });
                (0, utils_1.sendJson)(res, { success: true, status });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/sessions" && req.method === "GET") {
        const groupId = String(parsed.query.id || parsed.query.group_id || "").trim();
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        (0, utils_1.sendJson)(res, { success: true, ...(0, storage_1.listGroupChatSessions)(groupId) });
        return true;
    }
    if (pathname === "/api/groups/sessions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const groupId = String(payload.id || payload.group_id || "").trim();
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
                const action = String(payload.action || "create").trim().toLowerCase();
                const sessionId = String(payload.session_id || payload.sessionId || "");
                let session = null;
                let result = null;
                if (action === "select")
                    session = (0, storage_1.selectGroupChatSession)(groupId, sessionId);
                else if (action === "rename")
                    session = (0, storage_1.renameGroupChatSession)(groupId, sessionId, String(payload.title || ""));
                else if (action === "archive" || action === "restore")
                    session = (0, storage_1.archiveGroupChatSession)(groupId, sessionId, action === "archive");
                else if (action === "delete") {
                    result = (0, storage_1.deleteGroupChatSession)(groupId, sessionId, { force: payload.force === true });
                    result.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, sessionId) || null;
                }
                else if (action === "purge_legacy") {
                    result = (0, storage_1.purgeLegacyDefaultGroupChatSession)(groupId, { force: payload.force === true });
                    if (result.purged)
                        result.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, "default") || null;
                }
                else if (action === "prune") {
                    const retentionConfig = (0, group_orchestrator_1.loadOrchestratorConfig)();
                    result = (0, storage_1.pruneArchivedGroupChatSessions)(groupId, {
                        retentionDays: retentionConfig.groupSessionRetentionDays,
                        maxArchived: retentionConfig.groupSessionMaxArchived,
                        ...payload,
                    });
                    if (result.dryRun === false) {
                        for (const row of result.results || []) {
                            if (row.deleted)
                                row.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, row.id) || null;
                        }
                    }
                }
                else
                    session = (0, storage_1.createGroupChatSession)(groupId, String(payload.title || ""));
                (0, utils_1.sendJson)(res, { success: true, session, result, ...(0, storage_1.listGroupChatSessions)(groupId) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/messages" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const requestedLimit = parseInt(String(parsed.query.limit || "")) || 100;
        const limit = Math.max(1, Math.min(2000, requestedLimit));
        const groupIdText = String(groupId);
        const sessionId = String(parsed.query.session_id || parsed.query.sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupIdText));
        const rawMessages = (0, storage_1.getGroupMessages)(groupIdText, sessionId).slice(-limit);
        const allTasks = (0, db_1.loadTasks)();
        const sessionTasks = allTasks.filter((task) => String(task?.group_id || "") === groupIdText
            && String(task?.group_session_id || task?.groupSessionId || "default") === sessionId);
        const taskIds = new Set(rawMessages.map((message) => String(message?.task_id || message?.task?.id || "")).filter(Boolean));
        const taskMap = new Map(sessionTasks.filter((task) => taskIds.has(String(task.id))).map((task) => [String(task.id), task]));
        const runtimeMap = new Map();
        const runtimeAttachedTaskIds = new Set();
        const getRuntime = (task) => {
            const taskId = String(task?.id || "");
            if (!taskId)
                return null;
            if (!runtimeMap.has(taskId)) {
                runtimeMap.set(taskId, (0, group_routes_part_01_1.compactGroupMessageTaskRuntime)(deps.buildInlineTaskRuntime(task)));
            }
            return runtimeMap.get(taskId);
        };
        const messages = rawMessages.map((message) => {
            const taskId = String(message?.task_id || message?.task?.id || "");
            const task = taskMap.get(taskId);
            const { taskRuntime: _storedTaskRuntime, task_runtime: _storedTaskRuntimeSnake, taskCard: _storedTaskCard, task_card: _storedTaskCardSnake, ...messageWithoutStoredRuntime } = message || {};
            if (!task || runtimeAttachedTaskIds.has(taskId))
                return messageWithoutStoredRuntime;
            runtimeAttachedTaskIds.add(taskId);
            const runtime = getRuntime(task);
            return { ...messageWithoutStoredRuntime, taskRuntime: runtime };
        });
        const memory = deps.loadGroupMemory(groupIdText, sessionId);
        const sessionTaskIds = new Set(sessionTasks.map((task) => String(task.id || "")));
        const agentQa = deps.getAgentQaItemsForGroup(groupIdText, 100).filter((item) => sessionTaskIds.has(String(item?.task_id || item?.taskId || ""))
            || String(item?.group_session_id || item?.groupSessionId || "") === sessionId);
        const mainAgentStatus = (0, group_routes_part_02_1.buildGroupMainAgentStatus)({ groupId: groupIdText, tasks: sessionTasks, agentQa, getRuntime });
        (0, utils_1.sendJson)(res, { messages, memory, agentQa, mainAgentStatus, sessionId, sessions: (0, storage_1.listGroupChatSessions)(groupIdText).sessions });
        return true;
    }
    if (pathname === "/api/groups/memory/compact" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const groupId = String(payload.id || payload.group_id || "").trim();
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
                if (!(0, storage_1.loadGroups)().some((item) => String(item.id || "") === groupId))
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                const sessionId = String(payload.session_id || payload.sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
                const sessionExists = (0, storage_1.listGroupChatSessions)(groupId).sessions.some((item) => String(item.id || "") === sessionId);
                if (!sessionId.startsWith("gcs_") || !sessionExists)
                    return (0, utils_1.sendJson)(res, { error: "当前群聊会话无效" }, 409);
                const customInstructions = String(payload.custom_instructions || payload.customInstructions || "").trim();
                if (customInstructions.length > 4_000)
                    return (0, utils_1.sendJson)(res, { error: "压缩附加要求不能超过 4000 个字符" }, 400);
                const result = await (0, group_memory_context_1.runGroupMemoryAutoCompactionNow)(groupId, {
                    sessionId,
                    force: true,
                    reason: "manual_slash_command",
                    config: { memoryCompactionUseModel: true, memoryCompactionMode: "model-required", customInstructions },
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error || result.reason || "手动压缩失败" }, 409);
                const compression = result.memory?.messageCompression || {};
                (0, utils_1.sendJson)(res, {
                    success: true,
                    compacted: result.compacted === true,
                    summary: result.compacted === true ? "当前群聊会话已手动压缩。" : "当前群聊会话没有可压缩的旧消息。",
                    metrics: {
                        群聊会话: sessionId,
                        压缩旧消息: Number(compression.compressedMessages || 0),
                        保留近期原文: Number(compression.recentMessages || compression.recentLimit || 0),
                    },
                    boundaryId: result.boundary?.id || "",
                    sessionId,
                });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error.message || "手动压缩失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/messages/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const groupId = String(payload.id || payload.group_id || "").trim();
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
                const group = (0, storage_1.loadGroups)().find((item) => item.id === groupId);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                const sessionId = String(payload.session_id || payload.sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
                const before = (0, storage_1.getGroupMessages)(groupId, sessionId).length;
                (0, storage_1.saveGroupMessages)(groupId, [], sessionId);
                if (payload.clear_memory === true || payload.clearMemory === true) {
                    try {
                        fs.unlinkSync(deps.getGroupMemoryFile(groupId, sessionId));
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { success: true, cleared: before, session_id: sessionId, memory_cleared: payload.clear_memory === true || payload.clearMemory === true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/memory" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const sessionId = String(parsed.query.session_id || parsed.query.sessionId || (0, storage_1.getActiveGroupChatSessionId)(String(groupId)));
        const project = parsed.query.project ? String(parsed.query.project) : "";
        const memory = deps.saveGroupMemory(String(groupId), deps.loadGroupMemory(String(groupId), sessionId), sessionId);
        (0, utils_1.sendJson)(res, {
            success: true,
            memory,
            context: deps.buildGroupMemoryContext(memory),
            agentPacket: project ? deps.buildAgentMemoryPacket(String(groupId), project, "", { groupSessionId: sessionId }) : "",
        });
        return true;
    }
    if (pathname === "/api/groups/logs" && req.method === "GET") {
        const groupId = parsed.query.id;
        const limit = parseInt(String(parsed.query.limit || "")) || 100;
        const category = parsed.query.category;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const logs = (0, logs_1.loadGroupLogs)();
        let groupLogs = logs[String(groupId)] || [];
        if (category) {
            groupLogs = groupLogs.filter((l) => l.category === category);
        }
        (0, utils_1.sendJson)(res, { logs: groupLogs.slice(-limit) });
        return true;
    }
    if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id } = JSON.parse(body);
                const cleared = (0, logs_1.clearGroupLogs)(String(group_id || ""));
                (0, utils_1.sendJson)(res, { success: true, cleared });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);
        const logs = (0, logs_1.loadGroupLogs)();
        const initialCount = (logs[String(groupId)] || []).length;
        let lastCount = initialCount;
        const interval = setInterval(() => {
            try {
                const currentLogs = (0, logs_1.loadGroupLogs)();
                const groupLogs = currentLogs[String(groupId)] || [];
                if (groupLogs.length > lastCount) {
                    const newLogs = groupLogs.slice(lastCount);
                    for (const log of newLogs) {
                        res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
                    }
                    lastCount = groupLogs.length;
                }
            }
            catch (e) {
                res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
            }
        }, 1000);
        req.on("close", () => {
            clearInterval(interval);
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=group-routes-part-03.js.map