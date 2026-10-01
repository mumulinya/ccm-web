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
exports.readConversationEvents = readConversationEvents;
exports.appendConversationEvent = appendConversationEvent;
exports.streamConversationEvents = streamConversationEvents;
exports.captureConversationSse = captureConversationSse;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const ROOT = process.env.CCM_CONVERSATION_EVENT_DIR || path.join(utils_1.CCM_DIR, "conversation-events");
const listeners = new Map();
const nextSequences = new Map();
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
        const rows = readConversationEvents(turnId, attemptId);
        next = rows.length ? rows[rows.length - 1].sequence + 1 : 1;
    }
    const event = {
        sequence: next, turn_id: turnId, attempt_id: attemptId,
        at: new Date().toISOString(), payload: { ...payload, conversation_turn_id: turnId, attempt_id: attemptId },
    };
    fs.mkdirSync(ROOT, { recursive: true });
    fs.appendFileSync(filename(turnId, attemptId), `${JSON.stringify(event)}\n`, "utf8");
    nextSequences.set(identity, next + 1);
    for (const listener of listeners.get(identity) || [])
        listener(event);
    return event;
}
function writeEvent(res, event) {
    if (res.destroyed || res.writableEnded)
        return;
    res.write(`id: ${event.sequence}\ndata: ${JSON.stringify({ ...event.payload, sequence: event.sequence, emitted_at: event.at })}\n\n`);
    // Flush immediately when the runtime or proxy exposes a flush hook. This
    // keeps small model deltas from waiting behind transport buffering while
    // preserving the existing SSE response contract.
    res.flush?.();
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
    let last = Math.max(0, after);
    const listener = (event) => {
        if (event.sequence <= last)
            return;
        last = event.sequence;
        writeEvent(res, event);
        if (["done", "error", "execution_terminal"].includes(String(event.payload.type || "")))
            close();
    };
    const subscribers = listeners.get(identity) || new Set();
    subscribers.add(listener);
    listeners.set(identity, subscribers);
    const close = () => {
        clearInterval(heartbeat);
        subscribers.delete(listener);
        if (!subscribers.size)
            listeners.delete(identity);
        if (!res.writableEnded && !res.destroyed)
            res.end();
    };
    const heartbeat = setInterval(() => {
        if (res.destroyed || res.writableEnded)
            close();
        else
            res.write(`: heartbeat ${Date.now()}\n\n`);
    }, 15_000);
    heartbeat.unref?.();
    res.once("close", close);
    const replay = readConversationEvents(turnId, attemptId, after);
    for (const event of replay)
        listener(event);
    if (terminal && !res.writableEnded)
        close();
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