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
exports.buildMemoryCenterOverview = buildMemoryCenterOverview;
exports.handleMemoryCenterApi = handleMemoryCenterApi;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../../core/utils");
const memory_control_center_types_1 = require("./memory-control-center-types");
const memory_control_center_api_1 = require("./memory-control-center-api");
const memory_control_center_controls_1 = require("./memory-control-center-controls");
const group_session_memory_model_extraction_1 = require("../collaboration/group-session-memory-model-extraction");
function projectSummaries() {
    const longTerm = (0, memory_control_center_api_1.listJsonFiles)(memory_control_center_types_1.PROJECT_MEMORY_DIR).flatMap(file => {
        const memory = (0, memory_control_center_api_1.readMemoryFile)(file);
        if (!memory)
            return [];
        const id = String(memory.project || path.basename(file, ".json"));
        return [{ ...(0, memory_control_center_api_1.memorySummary)("project", id, memory, "长期记忆"), projectId: id, memoryKind: "long_term" }];
    });
    const sessions = [];
    const root = path.join(utils_1.CCM_DIR, "web-sessions");
    try {
        for (const projectEntry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!projectEntry.isDirectory())
                continue;
            for (const file of (0, memory_control_center_api_1.listJsonFiles)(path.join(root, projectEntry.name))) {
                const memory = (0, memory_control_center_api_1.readMemoryFile)(file);
                if (!memory)
                    continue;
                const sessionId = String(memory.id || memory.session_id || path.basename(file, ".json"));
                sessions.push({
                    ...(0, memory_control_center_api_1.memorySummary)("project_session", `${projectEntry.name}::${sessionId}`, memory, String(memory.name || memory.title || sessionId)),
                    projectId: projectEntry.name,
                    projectSessionId: sessionId,
                    sessionLabel: String(memory.name || memory.title || sessionId),
                    memoryKind: "session",
                });
            }
        }
    }
    catch { }
    return [...longTerm, ...sessions];
}
function globalSummaries() {
    const memory = (0, memory_control_center_api_1.readMemoryFile)(memory_control_center_types_1.GLOBAL_MEMORY_FILE);
    if (!memory)
        return [];
    const history = (0, memory_control_center_api_1.readMemoryFile)(path.join(utils_1.CCM_DIR, "global-agent-history.json"));
    const liveSessions = Array.isArray(history?.sessions) ? history.sessions : [];
    const liveById = new Map(liveSessions.map((session) => [String(session.id || ""), session]));
    const storedSessions = Array.isArray(memory.sessions) ? memory.sessions : [];
    const visibleSessions = liveById.size
        ? storedSessions.filter((session) => liveById.has(String(session.sessionId || "")))
        : storedSessions;
    const sessions = visibleSessions.map((session) => {
        const sessionId = String(session.sessionId || "");
        const live = liveById.get(sessionId);
        return {
            ...(0, memory_control_center_api_1.memorySummary)("global_session", `session:${sessionId}`, session, live?.name || session.title || sessionId),
            memoryKind: "session",
            currentSession: String(history?.current_session_id || "") === sessionId,
            channel: String(live?.source || "web"),
        };
    });
    return [{ ...(0, memory_control_center_api_1.memorySummary)("global", "global", memory, "全局长期记忆"), memoryKind: "long_term" }, ...sessions];
}
function taskAgentSummaries() {
    const store = (0, memory_control_center_api_1.readMemoryFile)(path.join(utils_1.CCM_DIR, "task-agent-sessions.json"));
    return (store?.sessions || []).map((session) => {
        const sessionId = String(session.id || "");
        const projectId = String(session.project || "").trim() || "unassigned";
        const runtime = String(session.agentType || "").trim() || "agent";
        const summary = (0, memory_control_center_api_1.memorySummary)("task_agent", sessionId, { ...session, compaction: session.compaction || { latestProviderUsage: session.providerContextUsageBaseline, consecutiveFailures: session.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0 } }, `${projectId} / ${sessionId}`);
        return {
            ...summary,
            projectId,
            projectLabel: projectId === "unassigned" ? "未关联项目" : projectId,
            taskAgentSessionId: sessionId,
            taskId: String(session.taskId || ""),
            groupId: String(session.groupId || ""),
            agentType: runtime,
            status: String(session.status || ""),
            turnCount: Number(session.turnCount || 0),
            lastUsedAt: String(session.lastUsedAt || session.updatedAt || session.createdAt || ""),
            sessionLabel: `${runtime} · ${sessionId}`,
        };
    }).sort((left, right) => String(right.lastUsedAt || "").localeCompare(String(left.lastUsedAt || "")));
}
function buildMemoryCenterOverview() {
    const groups = (0, memory_control_center_api_1.listMemoryCenterGroupSessionScopes)();
    const projects = projectSummaries();
    const globals = globalSummaries();
    const tasks = taskAgentSummaries();
    const scopes = [...globals, ...groups, ...projects, ...tasks];
    const alerts = scopes.flatMap(summary => {
        const detail = (0, memory_control_center_api_1.getMemoryCenterScope)(summary.scope, summary.id);
        return (0, memory_control_center_api_1.healthAlerts)(summary.scope, summary.id, detail.rawMemory).map(alert => ({
            ...alert,
            scope: summary.scope,
            scopeId: summary.id,
            label: summary.label,
        }));
    });
    return {
        generatedAt: (0, memory_control_center_types_1.now)(),
        groups,
        projects,
        globals,
        tasks,
        alerts,
        totals: {
            scopes: scopes.length,
            groupSessions: groups.length,
            projects: projects.length,
            taskAgents: tasks.length,
            alerts: alerts.length,
            beforeTokens: scopes.reduce((sum, item) => sum + Number(item.beforeTokens || 0), 0),
            afterTokens: scopes.reduce((sum, item) => sum + Number(item.afterTokens || 0), 0),
        },
    };
}
function readBody(req, callback, onError) {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
        try {
            callback(JSON.parse(body || "{}"));
        }
        catch (error) {
            onError(error);
        }
    });
}
function customizationScopeId(value) {
    return String(value || "").trim().replace("::gcs_", "--gcs_");
}
function handleMemoryCenterApi(pathname, req, res, parsed) {
    if (!pathname.startsWith("/api/memory-center/"))
        return false;
    const query = parsed?.query || {};
    if (pathname === "/api/memory-center/overview" && req.method === "GET") {
        (0, utils_1.sendJson)(res, buildMemoryCenterOverview());
        return true;
    }
    if (pathname === "/api/memory-center/scope" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, memory_control_center_api_1.getMemoryCenterScope)(query.scope, String(query.id || "")));
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 404);
        }
        return true;
    }
    if (pathname === "/api/memory-center/audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, audit: (0, memory_control_center_api_1.listMemoryAudit)(Number(query.limit || 200), { scope: query.scope, scopeId: query.id }) });
        return true;
    }
    if (pathname === "/api/memory-center/evidence" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, evidence: (0, memory_control_center_api_1.findMemoryEvidence)({
                scope: query.scope,
                groupId: query.group_id || query.groupId,
                messageId: query.message_id || query.messageId,
                taskId: query.task_id || query.taskId,
                sessionId: query.session_id || query.sessionId,
                missionId: query.mission_id || query.missionId,
            }) });
        return true;
    }
    if (pathname === "/api/memory-center/control" && req.method === "POST") {
        readBody(req, data => {
            try {
                const result = (0, memory_control_center_controls_1.updateMemoryControl)({
                    scope: data.scope,
                    scopeId: data.scopeId || data.scope_id,
                    itemType: data.itemType || data.item_type,
                    itemId: data.itemId || data.item_id,
                    action: data.action,
                    text: data.text,
                    reason: data.reason,
                    actor: data.actor || "memory-center",
                });
                (0, utils_1.sendJson)(res, { success: true, ...result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }, error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    if (pathname === "/api/memory-center/session-memory-custom-prompt" && req.method === "GET") {
        try {
            const scopeId = customizationScopeId(query.scopeId || query.scope_id);
            (0, utils_1.sendJson)(res, { success: true, profile: (0, group_session_memory_model_extraction_1.readGroupSessionMemoryCustomPromptProfile)(scopeId) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    if (pathname === "/api/memory-center/session-memory-custom-prompt" && req.method === "POST") {
        readBody(req, data => {
            try {
                const scopeId = customizationScopeId(data.scopeId || data.scope_id);
                const profile = (0, group_session_memory_model_extraction_1.saveGroupSessionMemoryCustomPrompt)(scopeId, data.content, { reset: data.reset === true });
                (0, utils_1.sendJson)(res, { success: true, profile });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }, error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    if (pathname === "/api/memory-center/session-memory-custom-template" && req.method === "GET") {
        try {
            const scopeId = customizationScopeId(query.scopeId || query.scope_id);
            (0, utils_1.sendJson)(res, { success: true, profile: (0, group_session_memory_model_extraction_1.readGroupSessionMemoryCustomTemplateProfile)(scopeId) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    if (pathname === "/api/memory-center/session-memory-custom-template" && req.method === "POST") {
        readBody(req, data => {
            try {
                const scopeId = customizationScopeId(data.scopeId || data.scope_id);
                const profile = (0, group_session_memory_model_extraction_1.saveGroupSessionMemoryCustomTemplate)(scopeId, data.content, { reset: data.reset === true });
                (0, utils_1.sendJson)(res, { success: true, profile });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }, error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    (0, utils_1.sendJson)(res, { success: false, error: "Memory Center endpoint not found" }, 404);
    return true;
}
//# sourceMappingURL=memory-control-center-handler.js.map