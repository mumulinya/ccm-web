"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectConversationStreams = exports.ProjectConversationStreams = void 0;
exports.projectConversationStreamKey = projectConversationStreamKey;
function projectConversationStreamKey(project, session, turn, attempt) {
    return project && session && turn && attempt ? JSON.stringify([project, session, turn, attempt]) : "";
}
// Execution remains owned by the dispatch lease. Observers only replay/receive
// bytes; disconnecting one must never abort or settle the running model call.
class ProjectConversationStreams {
    waitMs;
    maxBytes;
    streams = new Map();
    constructor(waitMs = 30_000, maxBytes = 8 * 1024 * 1024) {
        this.waitMs = waitMs;
        this.maxBytes = maxBytes;
    }
    row(key) {
        let row = this.streams.get(key);
        if (!row) {
            row = { frames: [], bytes: 0, replayable: true, started: false, ended: false, listeners: new Set() };
            this.streams.set(key, row);
        }
        return row;
    }
    observe(key, res, waitForOwner = false) {
        if (!key || (!waitForOwner && !this.streams.has(key)))
            return false;
        const row = this.row(key);
        if (!row.replayable)
            return false;
        const start = () => {
            if (!res.headersSent)
                res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
            for (const frame of row.frames)
                res.write(frame);
        };
        if (row.started)
            start();
        if (row.ended) {
            res.end();
            return true;
        }
        row.listeners.add(res);
        const timer = setTimeout(() => {
            if (row.started || res.destroyed || res.writableEnded)
                return;
            row.listeners.delete(res);
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ code: "PROJECT_STREAM_NOT_READY", error: "后台执行尚未连接，请刷新会话查看当前状态" }));
            if (!row.listeners.size && this.streams.get(key) === row)
                this.streams.delete(key);
        }, this.waitMs);
        timer.unref?.();
        res.once("close", () => { clearTimeout(timer); row.listeners.delete(res); });
        return true;
    }
    capture(key, res) {
        if (!key)
            return;
        const row = this.row(key);
        if (row.started)
            throw new Error("PROJECT_STREAM_ALREADY_OWNED");
        row.started = true;
        const forward = (chunk, encoding) => {
            if (chunk == null)
                return;
            const frame = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk), (typeof encoding === "string" ? encoding : "utf8"));
            row.bytes += frame.length;
            if (row.bytes <= this.maxBytes)
                row.frames.push(frame);
            else {
                row.replayable = false;
                row.frames = [];
            }
            for (const observer of row.listeners) {
                if (observer.destroyed || observer.writableEnded) {
                    row.listeners.delete(observer);
                    continue;
                }
                if (!observer.headersSent)
                    observer.writeHead(res.statusCode, { "Content-Type": String(res.getHeader("Content-Type") || "text/event-stream"), "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
                if (observer.writableLength > this.maxBytes) {
                    observer.destroy();
                    row.listeners.delete(observer);
                    continue;
                }
                observer.write(frame);
            }
        };
        const write = res.write.bind(res);
        const end = res.end.bind(res);
        res.write = ((chunk, encoding, callback) => { forward(chunk, encoding); return write(chunk, encoding, callback); });
        res.end = ((chunk, encoding, callback) => { if (typeof chunk !== "function")
            forward(chunk, encoding); return end(chunk, encoding, callback); });
        const close = () => {
            if (row.ended)
                return;
            row.ended = true;
            for (const observer of row.listeners)
                observer.end();
            row.listeners.clear();
            const timer = setTimeout(() => { if (this.streams.get(key) === row)
                this.streams.delete(key); }, this.waitMs);
            timer.unref?.();
        };
        res.once("finish", close);
        res.once("close", close);
    }
}
exports.ProjectConversationStreams = ProjectConversationStreams;
exports.projectConversationStreams = new ProjectConversationStreams();
//# sourceMappingURL=project-conversation-stream.js.map