"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rehydrateReadonlyToolDetail = rehydrateReadonlyToolDetail;
exports.handleUserVisibleAgentEventsApi = handleUserVisibleAgentEventsApi;
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const tool_display_projection_1 = require("./tool-display-projection");
const workspace_readonly_tools_1 = require("../tools/workspace-readonly-tools");
const storage_1 = require("../modules/collaboration/storage");
const utils_1 = require("../core/utils");
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const unified_agent_turn_state_1 = require("./unified-agent-turn-state");
const db_1 = require("../core/db");
const access_policy_1 = require("../modules/system/access-policy");
const db_2 = require("../core/db");
const command_live_progress_1 = require("./command-live-progress");
function identity(query) {
    return {
        scope: query?.scope,
        scopeId: query?.scope_id || query?.scopeId,
        exactSessionId: query?.exact_session_id || query?.exactSessionId || query?.session_id || query?.sessionId,
    };
}
function matches(event, filter) {
    return event.scope === filter.scope
        && event.scopeId === filter.scopeId
        && event.exactSessionId === filter.exactSessionId;
}
function writeEvent(res, event) {
    if (event.sequence > 0)
        res.write(`id: ${event.sequence}\n`);
    res.write(`event: agent_execution\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}
async function rehydrateReadonlyToolDetail(event, options = {}) {
    if (!event.toolName || !(0, tool_display_projection_1.isWorkspaceReadonlyToolName)(event.toolName))
        throw Object.assign(new Error("该工具不支持安全详情重取"), { statusCode: 409 });
    if (!event.toolCallId || !event.detail?.safeArguments)
        throw Object.assign(new Error("历史工具事件缺少可验证的调用定位"), { statusCode: 409 });
    const allowedProjects = event.scope === "project" ? [event.scopeId]
        : event.scope === "group"
            ? ((0, storage_1.loadGroups)().find((group) => String(group?.id || "") === event.scopeId)?.members || [])
                .map((member) => String(member?.project || "").trim()).filter(Boolean)
            : (() => {
                const requestedProject = String(event.detail?.safeArguments?.project_id || event.detail?.safeArguments?.projectId || "").trim();
                return requestedProject && (0, db_1.getConfigs)().some((project) => String(project?.name || "") === requestedProject)
                    ? [requestedProject]
                    : [];
            })();
    const capabilityToken = (0, workspace_readonly_tools_1.sealScopedToolCapability)({
        scope: event.scope,
        scopeId: event.scopeId,
        exactSessionId: event.exactSessionId,
        generation: event.generation,
        allowedProjects,
    });
    let executionArguments = event.detail.safeArguments;
    const continuationFiles = Array.isArray(options?.continuation?.files) ? options.continuation.files : [];
    const continueBatchRead = options?.continue === true && /(?:^|__)read_files$/i.test(String(event.toolName || ""));
    if (continueBatchRead) {
        const originalPaths = new Set((Array.isArray(event.detail.safeArguments?.paths) ? event.detail.safeArguments.paths : [])
            .map((item) => String(typeof item === "string" ? item : item?.path || "").replace(/\\/g, "/").trim())
            .filter(Boolean));
        const paths = continuationFiles.slice(0, 20).map((item) => ({
            path: String(item?.path || "").replace(/\\/g, "/").trim(),
            offset: Math.max(1, Number(item?.nextOffset || item?.next_offset || 1)),
            expectedChecksum: String(item?.checksum || ""),
        })).filter((item) => item.path && originalPaths.has(item.path));
        if (!paths.length)
            throw Object.assign(new Error("没有可继续读取的文件"), { statusCode: 409 });
        executionArguments = {
            ...event.detail.safeArguments,
            // Continue in bounded chunks. An explicit offset without a limit means
            // "read to EOF" in the V3 contract and can exceed the per-file budget.
            paths: paths.map((item) => ({ path: item.path, offset: item.offset, limit: 100, expected_checksum: item.expectedChecksum })),
        };
        const result = await (0, workspace_readonly_tools_1.executeWorkspaceReadonlyTool)(event.toolName, executionArguments, capabilityToken, 3);
        const rawFiles = Array.isArray(result?.modelPayload?.files) ? result.modelPayload.files : [];
        const changed = paths.find((item) => item.expectedChecksum
            && rawFiles.find((file) => String(file?.path || "") === item.path)?.checksum !== item.expectedChecksum);
        if (changed)
            throw Object.assign(new Error(`文件内容已变化，请重新读取当前详情：${changed.path}`), { statusCode: 409 });
        const current = (0, tool_display_projection_1.buildToolDisplayDetail)({
            toolName: event.toolName,
            arguments: event.detail.safeArguments,
            result,
            transientBody: true,
            freshness: "current",
        });
        const pendingCount = Number(current.result.continuation?.pendingCount || 0);
        current.result.summary = `已继续读取 ${paths.length} 个文件${pendingCount ? `，仍有 ${pendingCount} 个文件未读完` : "，剩余内容已读完"}`;
        return current;
    }
    const result = await (0, workspace_readonly_tools_1.executeWorkspaceReadonlyTool)(event.toolName, executionArguments, capabilityToken, event.detail?.toolContractVersion === 3 ? 3 : 2);
    const current = (0, tool_display_projection_1.buildToolDisplayDetail)({
        toolName: event.toolName,
        arguments: event.detail.safeArguments,
        result,
        transientBody: true,
        freshness: "current",
    });
    const previousRevision = String(event.detail?.toolDisplay?.result?.authoritativeRevision || "");
    const currentRevision = String(current.result.authoritativeRevision || "");
    if (previousRevision && currentRevision && previousRevision !== currentRevision)
        current.result.freshness = "drifted";
    return current;
}
function rehydrateFailureFreshness(error) {
    const message = String(error?.message || error || "");
    if (/permission|权限|授权|forbidden|unauthorized/i.test(message))
        return "permission_revoked";
    if (/not.?found|不存在|已删除|ENOENT/i.test(message))
        return "deleted";
    if (/已变化|checksum|版本漂移/i.test(message))
        return "drifted";
    return "";
}
function handleUserVisibleAgentEventsApi(pathname, req, res, parsed) {
    const detailMatch = pathname.match(/^\/api\/agent-execution\/events\/([^/]+)\/detail$/);
    if (detailMatch && req.method === "POST") {
        res.setHeader("Cache-Control", "private, no-store");
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (body.length > 128_000)
                req.destroy();
        });
        req.on("end", async () => {
            try {
                const filter = identity(parsed?.query);
                const event = (0, user_visible_agent_events_1.getUserVisibleAgentEvent)(filter, decodeURIComponent(detailMatch[1]));
                if (!event)
                    return (0, utils_1.sendJson)(res, { success: false, error: "工具事件不存在或不属于当前精确会话" }, 404);
                const options = body ? JSON.parse(body) : {};
                if (options?.includeLiveTail === true) {
                    const principal = req.ccmAuth;
                    const task = event.taskId ? (0, db_2.loadTasks)().find((item) => String(item?.id || "") === String(event.taskId)) : null;
                    const canManage = principal?.role === "admin"
                        || (task && (0, access_policy_1.hasTaskResourceAccess)(task, principal, "manage"))
                        || (event.scope !== "global" && (0, access_policy_1.hasResourceAccess)(String(principal?.userId || ""), principal?.role, event.scope, event.scopeId, "manage"));
                    if (!canManage)
                        return (0, utils_1.sendJson)(res, { success: false, error: "只有资源管理者可以查看脱敏最近输出" }, 403);
                    const findRunId = (value, depth = 0) => {
                        if (!value || depth > 5)
                            return "";
                        if (typeof value !== "object")
                            return "";
                        if (value.command_run_id || value.commandRunId)
                            return String(value.command_run_id || value.commandRunId);
                        for (const child of Object.values(value)) {
                            const found = findRunId(child, depth + 1);
                            if (found)
                                return found;
                        }
                        return "";
                    };
                    const commandRunId = findRunId(event.detail?.safeResult) || findRunId(event.detail?.toolDisplay?.result);
                    const liveTail = commandRunId ? (0, command_live_progress_1.getCommandLiveTail)(commandRunId) : null;
                    return (0, utils_1.sendJson)(res, { success: true, schema: "ccm-tool-detail-response-v1", toolDisplay: event.detail?.toolDisplay || null, liveTail, contentStored: false });
                }
                const toolDisplay = await rehydrateReadonlyToolDetail(event, options);
                (0, utils_1.sendJson)(res, { success: true, schema: "ccm-tool-detail-response-v1", toolDisplay, contentStored: false });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, {
                    success: false,
                    error: String(error?.message || error),
                    ...(rehydrateFailureFreshness(error) ? { freshness: rehydrateFailureFreshness(error) } : {}),
                    contentStored: false,
                }, Number(error?.statusCode || 400));
            }
        });
        return true;
    }
    if (pathname === "/api/agent-execution/events" && req.method === "GET") {
        try {
            const enabled = (0, group_orchestrator_config_1.loadOrchestratorConfig)().ccStyleExecutionDisplayEnabled !== false;
            const page = enabled ? (0, user_visible_agent_events_1.listUserVisibleAgentEvents)({ ...identity(parsed?.query), ...parsed?.query }) : null;
            (0, utils_1.sendJson)(res, enabled
                ? { success: true, enabled, ...page, turnStates: (0, unified_agent_turn_state_1.projectUnifiedAgentTurnStates)(page?.events || []) }
                : { success: true, enabled, schema: "ccm-user-visible-agent-event-list-v1", events: [], nextCursor: 0, hasMore: false, contentStored: false });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    if (pathname !== "/api/agent-execution/events/stream" || req.method !== "GET")
        return false;
    try {
        if ((0, group_orchestrator_config_1.loadOrchestratorConfig)().ccStyleExecutionDisplayEnabled === false) {
            res.writeHead(204, { "Cache-Control": "no-store" });
            res.end();
            return true;
        }
        const filter = identity(parsed?.query);
        const cursor = Math.max(0, Number(req.headers["last-event-id"] || parsed?.query?.cursor || parsed?.query?.after || 0));
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        });
        res.write("retry: 3000\n\n");
        const queued = [];
        const written = new Set();
        let replayReady = false;
        const unsubscribe = (0, user_visible_agent_events_1.subscribeUserVisibleAgentEvents)(event => {
            if (!matches(event, filter))
                return;
            if (!replayReady) {
                queued.push(event);
                return;
            }
            // Persisted events are immutable. Live-only tool progress deliberately
            // reuses a stable event id so the client can update one row in place.
            if (event.sequence > 0 && written.has(event.eventId))
                return;
            if (event.sequence > 0)
                written.add(event.eventId);
            try {
                writeEvent(res, event);
            }
            catch {
                unsubscribe();
            }
        });
        let replayCursor = cursor;
        let hasMore = true;
        while (hasMore) {
            const page = (0, user_visible_agent_events_1.listUserVisibleAgentEvents)({ ...filter, cursor: replayCursor, limit: 500 });
            for (const event of page.events) {
                written.add(event.eventId);
                writeEvent(res, event);
            }
            hasMore = page.hasMore && page.nextCursor > replayCursor;
            replayCursor = page.nextCursor;
        }
        replayReady = true;
        for (const event of queued) {
            if (event.sequence > 0 && written.has(event.eventId))
                continue;
            if (event.sequence > 0)
                written.add(event.eventId);
            writeEvent(res, event);
        }
        const heartbeat = setInterval(() => {
            try {
                res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString(), contentStored: false })}\n\n`);
            }
            catch {
                clearInterval(heartbeat);
                unsubscribe();
            }
        }, 15_000);
        heartbeat.unref?.();
        req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
    }
    catch (error) {
        if (!res.headersSent)
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        else
            res.end();
    }
    return true;
}
//# sourceMappingURL=user-visible-agent-events-api.js.map