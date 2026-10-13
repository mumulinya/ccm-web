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
exports.conversationEventJournalSnapshot = conversationEventJournalSnapshot;
exports.readConversationEvents = readConversationEvents;
exports.appendConversationEvent = appendConversationEvent;
exports.streamConversationEvents = streamConversationEvents;
exports.captureConversationSse = captureConversationSse;
const bounded_sse_1 = require("../system/bounded-sse");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const conversation_event_reader_1 = require("./conversation-event-reader");
const ROOT = process.env.CCM_CONVERSATION_EVENT_DIR || path.join(utils_1.CCM_DIR, "conversation-events");
const listeners = new Map();
const nextSequences = new Map();
function conversationEventJournalSnapshot() {
    return { sequenceCacheEntries: nextSequences.size, sequenceCacheLimit: 4096,
        streams: [...listeners.values()].reduce((count, rows) => count + rows.size, 0) };
}
function key(turnId, attemptId) {
    return crypto.createHash("sha256").update(`${turnId}\0${attemptId}`).digest("hex");
}
function filename(turnId, attemptId) {
    return path.join(ROOT, `${key(turnId, attemptId)}.jsonl`);
}
function readConversationEvents(turnId, attemptId, after = 0) {
    const file = filename(turnId, attemptId);
    if (!fs.existsSync(file))
        return [];
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap(line => {
        try {
            const event = JSON.parse(line);
            return event.turn_id === turnId && event.attempt_id === attemptId && Number(event.sequence) > after ? [event] : [];
        }
        catch {
            return [];
        }
    });
}
function appendConversationEvent(turnId, attemptId, payload) {
    if (!turnId || !attemptId)
        throw new Error("会话事件缺少执行身份");
    const identity = key(turnId, attemptId);
    let next = nextSequences.get(identity);
    if (next == null) {
        next = (0, conversation_event_reader_1.readConversationTailSequence)(filename(turnId, attemptId), turnId, attemptId) + 1;
    }
    const event = {
        sequence: next, turn_id: turnId, attempt_id: attemptId,
        at: new Date().toISOString(), payload: { ...payload, conversation_turn_id: turnId, attempt_id: attemptId },
    };
    fs.mkdirSync(ROOT, { recursive: true });
    fs.appendFileSync(filename(turnId, attemptId), `${JSON.stringify(event)}\n`, "utf8");
    nextSequences.delete(identity);
    if (nextSequences.size >= 4096)
        nextSequences.delete(nextSequences.keys().next().value);
    nextSequences.set(identity, next + 1);
    for (const listener of listeners.get(identity) || [])
        listener(event);
    return event;
}
function streamConversationEvents(res, turnId, attemptId, after = 0, terminal = false) {
    const identity = key(turnId, attemptId);
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
    });
    res.flushHeaders?.();
    const writer = (0, bounded_sse_1.createBoundedSseWriter)(res);
    let last = Math.max(0, after);
    let replaying = true, pendingBytes = 0, closed = false;
    const pending = [];
    const deliver = (event) => {
        if (event.sequence <= last)
            return;
        last = event.sequence;
        if (!writer.write(`id: ${event.sequence}\ndata: ${JSON.stringify({ ...event.payload, sequence: event.sequence, emitted_at: event.at })}\n\n`))
            return;
        res.flush?.();
        if (["done", "error", "execution_terminal"].includes(String(event.payload.type || "")))
            close();
    };
    const listener = (event) => {
        if (closed)
            return;
        if (!replaying) {
            deliver(event);
            return;
        }
        pendingBytes += Buffer.byteLength(JSON.stringify(event));
        if (pendingBytes > 256 * 1024) {
            close();
            res.destroy();
            return;
        }
        pending.push(event);
    };
    const subscribers = listeners.get(identity) || new Set();
    subscribers.add(listener);
    listeners.set(identity, subscribers);
    const close = () => {
        if (closed)
            return;
        closed = true;
        pending.length = 0;
        pendingBytes = 0;
        clearInterval(heartbeat);
        subscribers.delete(listener);
        if (!subscribers.size)
            listeners.delete(identity);
        writer.end();
    };
    const heartbeat = setInterval(() => {
        if (res.destroyed || res.writableEnded)
            close();
        else
            writer.write(`: heartbeat ${Date.now()}\n\n`);
    }, 15_000);
    heartbeat.unref?.();
    writer.onClose(close);
    void (async () => {
        try {
            for await (const event of (0, conversation_event_reader_1.iterateConversationEvents)(filename(turnId, attemptId), turnId, attemptId, after)) {
                if (res.destroyed || res.writableEnded)
                    break;
                deliver(event);
            }
            replaying = false;
            for (const event of pending) {
                if (res.destroyed || res.writableEnded)
                    break;
                deliver(event);
            }
            pending.length = 0;
            pendingBytes = 0;
            if (terminal && !res.writableEnded)
                close();
        }
        catch {
            close();
            res.destroy();
        }
    })();
}
function captureConversationSse(res, turnId, attemptId) {
    // Some identity and routing tests bind an attempt to a lightweight object
    // instead of a live HTTP response. There is no stream to capture there.
    if (!res || typeof res.write !== "function")
        return;
    const originalWrite = res.write.bind(res);
    let buffer = "";
    res.write = ((chunk, encoding, callback) => {
        const value = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
        buffer += value;
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        for (const frame of frames) {
            const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
            if (!data)
                continue;
            try {
                appendConversationEvent(turnId, attemptId, JSON.parse(data));
            }
            catch (error) {
                // Event durability is required before delivery. Surface the failure to
                // the executor instead of emitting an unrecorded event.
                throw error;
            }
        }
        return originalWrite(chunk, encoding, callback);
    });
}
//# sourceMappingURL=conversation-event-journal.js.map