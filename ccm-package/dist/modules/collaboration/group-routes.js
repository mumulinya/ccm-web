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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("./storage");
const logs_1 = require("./logs");
const group_orchestrator_1 = require("./group-orchestrator");
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
        (0, utils_1.sendJson)(res, { tools: group.tools || { mcp: [], skill: [] } });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, tools } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.tools = tools;
                (0, storage_1.saveGroups)(groups);
                (0, utils_1.sendJson)(res, { success: true, tools: group.tools });
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
    if (pathname === "/api/groups/messages" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const limit = parseInt(String(parsed.query.limit || "")) || 100;
        const rawMessages = (0, storage_1.getGroupMessages)(String(groupId)).slice(-limit);
        const taskIds = new Set(rawMessages.map((message) => String(message?.task_id || message?.task?.id || "")).filter(Boolean));
        const taskMap = new Map((0, db_1.loadTasks)().filter((task) => taskIds.has(String(task.id))).map((task) => [String(task.id), task]));
        const runtimeMap = new Map();
        const messages = rawMessages.map((message) => {
            const taskId = String(message?.task_id || message?.task?.id || "");
            const task = taskMap.get(taskId);
            if (!task)
                return message;
            if (!runtimeMap.has(taskId))
                runtimeMap.set(taskId, deps.buildInlineTaskRuntime(task));
            const runtime = runtimeMap.get(taskId);
            return { ...message, taskRuntime: runtime, task_runtime: runtime };
        });
        const memory = deps.loadGroupMemory(String(groupId));
        (0, utils_1.sendJson)(res, { messages, memory, agentQa: deps.getAgentQaItemsForGroup(String(groupId), 100) });
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
                const before = (0, storage_1.getGroupMessages)(groupId).length;
                (0, storage_1.saveGroupMessages)(groupId, []);
                if (payload.clear_memory === true || payload.clearMemory === true) {
                    try {
                        fs.unlinkSync(deps.getGroupMemoryFile(groupId));
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { success: true, cleared: before, memory_cleared: payload.clear_memory === true || payload.clearMemory === true });
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
        const project = parsed.query.project ? String(parsed.query.project) : "";
        const memory = deps.saveGroupMemory(String(groupId), deps.loadGroupMemory(String(groupId)));
        (0, utils_1.sendJson)(res, {
            success: true,
            memory,
            context: deps.buildGroupMemoryContext(memory),
            agentPacket: project ? deps.buildAgentMemoryPacket(String(groupId), project) : "",
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
                const logs = (0, logs_1.loadGroupLogs)();
                delete logs[group_id];
                (0, logs_1.saveGroupLogs)(logs);
                (0, utils_1.sendJson)(res, { success: true });
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
//# sourceMappingURL=group-routes.js.map