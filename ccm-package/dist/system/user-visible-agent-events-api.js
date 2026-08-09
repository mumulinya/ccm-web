"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserVisibleAgentEventsApi = handleUserVisibleAgentEventsApi;
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const utils_1 = require("../core/utils");
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
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
function handleUserVisibleAgentEventsApi(pathname, req, res, parsed) {
    if (pathname === "/api/agent-execution/events" && req.method === "GET") {
        try {
            const enabled = (0, group_orchestrator_config_1.loadOrchestratorConfig)().ccStyleExecutionDisplayEnabled !== false;
            (0, utils_1.sendJson)(res, enabled
                ? { success: true, enabled, ...(0, user_visible_agent_events_1.listUserVisibleAgentEvents)({ ...identity(parsed?.query), ...parsed?.query }) }
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
            if (written.has(event.eventId))
                return;
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
            if (written.has(event.eventId))
                continue;
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