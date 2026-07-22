"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishRuntimeEvent = publishRuntimeEvent;
exports.subscribeRuntimeEventListener = subscribeRuntimeEventListener;
exports.handleRuntimeEventsApi = handleRuntimeEventsApi;
exports.runtimeEventBusSnapshot = runtimeEventBusSnapshot;
exports.resetRuntimeEventBusForTest = resetRuntimeEventBusForTest;
const clients = new Set();
const listeners = new Set();
const recentEvents = [];
const MAX_RECENT_EVENTS = 200;
let sequence = 0;
function cleanText(value, max = 240) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function publicData(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const allowed = {};
    for (const key of [
        "id", "taskId", "task_id", "project", "groupId", "group_id", "sessionId", "session_id",
        "originType", "originSessionId", "state", "status", "operation", "runId", "run_id",
        "deliveryId", "delivery_id", "count", "reason", "source",
    ]) {
        if (!Object.prototype.hasOwnProperty.call(source, key))
            continue;
        const item = source[key];
        allowed[key] = typeof item === "number" || typeof item === "boolean" ? item : cleanText(item);
    }
    return allowed;
}
function writeEvent(res, event) {
    const id = "id" in event ? event.id : sequence;
    res.write(`id: ${id}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}
function clientAccepts(client, topic) {
    return client.topics.has("*") || client.topics.has(topic);
}
function publishRuntimeEvent(topic, type, data = {}) {
    const event = {
        id: ++sequence,
        topic,
        type: cleanText(type, 100) || `${topic}.changed`,
        at: new Date().toISOString(),
        data: publicData(data),
    };
    recentEvents.push(event);
    if (recentEvents.length > MAX_RECENT_EVENTS)
        recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
    for (const client of [...clients]) {
        if (!clientAccepts(client, topic))
            continue;
        try {
            writeEvent(client.res, event);
        }
        catch {
            clients.delete(client);
        }
    }
    for (const listener of [...listeners]) {
        if (!clientAccepts(listener, topic))
            continue;
        try {
            listener.handler(event);
        }
        catch { }
    }
    return event;
}
function subscribeRuntimeEventListener(topics, handler) {
    const listener = { topics: new Set(topics === "*" ? ["*"] : topics), handler };
    listeners.add(listener);
    return () => listeners.delete(listener);
}
function parseTopics(value) {
    const topics = new Set(String(value || "*").split(",").map(item => item.trim()).filter(Boolean));
    return topics.size ? topics : new Set(["*"]);
}
function handleRuntimeEventsApi(pathname, req, res, parsed) {
    if (pathname !== "/api/runtime/events" || req.method !== "GET")
        return false;
    const topics = parseTopics(parsed?.query?.topics);
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    const client = { res, topics };
    clients.add(client);
    const lastEventId = Number(req.headers["last-event-id"] || parsed?.query?.last_event_id || 0);
    if (Number.isFinite(lastEventId) && lastEventId > 0) {
        for (const event of recentEvents) {
            if (event.id > lastEventId && clientAccepts(client, event.topic))
                writeEvent(res, event);
        }
    }
    writeEvent(res, { type: "ready", at: new Date().toISOString(), data: { topics: [...topics] } });
    const heartbeat = setInterval(() => {
        try {
            writeEvent(res, { type: "heartbeat", at: new Date().toISOString(), data: {} });
        }
        catch {
            clearInterval(heartbeat);
            clients.delete(client);
        }
    }, 15_000);
    heartbeat.unref?.();
    req.on("close", () => {
        clearInterval(heartbeat);
        clients.delete(client);
    });
    return true;
}
function runtimeEventBusSnapshot() {
    return { clients: clients.size, listeners: listeners.size, sequence, recent: recentEvents.length, maxRecent: MAX_RECENT_EVENTS };
}
function resetRuntimeEventBusForTest() {
    recentEvents.length = 0;
    sequence = 0;
}
//# sourceMappingURL=runtime-events.js.map