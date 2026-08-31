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
exports.sanitizeTraceValue = sanitizeTraceValue;
exports.sanitizeTraceEvent = sanitizeTraceEvent;
exports.sanitizeLegacyTrace = sanitizeLegacyTrace;
const crypto = __importStar(require("crypto"));
const credential_store_1 = require("../core/credential-store");
const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key|prompt)(?:$|_)/i;
const BINARY_KEY = /(?:^|_)(?:base64|bytes|image[_-]?data|file[_-]?data|document[_-]?data|audio[_-]?data)(?:$|_)/i;
const DATA_URL = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[a-z0-9+/=]{32,}/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const MAX_DEPTH = 8;
const MAX_ARRAY = 60;
const MAX_KEYS = 80;
const MAX_STRING = 4000;
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function safeString(value, max = MAX_STRING) {
    return (0, credential_store_1.redactSensitiveText)(String(value ?? ""))
        .replace(DATA_URL, "[binary-media]")
        .replace(BEARER, "Bearer [redacted]")
        .slice(0, max);
}
function sanitizeTraceValue(value, depth = 0, seen = new WeakSet()) {
    if (depth > MAX_DEPTH)
        return "[depth-limited]";
    if (typeof value === "string")
        return safeString(value);
    if (value == null || typeof value !== "object")
        return value;
    if (seen.has(value))
        return "[circular]";
    seen.add(value);
    if (Buffer.isBuffer(value) || value instanceof Uint8Array)
        return `[binary:${value.byteLength}]`;
    if (Array.isArray(value)) {
        const rows = value.slice(0, MAX_ARRAY).map(item => sanitizeTraceValue(item, depth + 1, seen));
        if (value.length > MAX_ARRAY)
            rows.push(`[${value.length - MAX_ARRAY} more items]`);
        return rows;
    }
    const output = {};
    const entries = Object.entries(value).slice(0, MAX_KEYS);
    for (const [key, nested] of entries) {
        if (SECRET_KEY.test(key))
            output[key] = "[redacted]";
        else if (BINARY_KEY.test(key))
            output[key] = "[binary-content]";
        else
            output[key] = sanitizeTraceValue(nested, depth + 1, seen);
    }
    if (Object.keys(value).length > MAX_KEYS)
        output._truncated_keys = Object.keys(value).length - MAX_KEYS;
    return output;
}
function sanitizeTraceEvent(input) {
    const data = sanitizeTraceValue(input?.data && typeof input.data === "object" ? input.data : {});
    const event = {
        id: safeString(input?.id || input?.event_id || "", 240),
        at: safeString(input?.at || new Date().toISOString(), 80),
        type: safeString(input?.type || "event", 160),
        status: safeString(input?.status || "info", 60),
        task_id: safeString(input?.task_id || input?.taskId || "", 240),
        group_id: safeString(input?.group_id || input?.groupId || "", 240),
        agent: safeString(input?.agent || "", 160),
        runtime: safeString(input?.runtime || "", 160),
        message: safeString(input?.message || input?.detail || "", 2400),
        data,
    };
    return { event, dataChecksum: checksum(data) };
}
function sanitizeLegacyTrace(trace) {
    if (!trace || typeof trace !== "object")
        return null;
    return {
        version: 2,
        schema: "ccm-reliability-trace-v2-legacy-projection",
        trace_id: safeString(trace.trace_id || "", 240),
        task_id: safeString(trace.task_id || "", 240),
        group_id: safeString(trace.group_id || "", 240),
        created_at: safeString(trace.created_at || "", 80),
        updated_at: safeString(trace.updated_at || "", 80),
        legacy: true,
        events: (Array.isArray(trace.events) ? trace.events : []).slice(-1200).map((item) => sanitizeTraceEvent(item).event),
    };
}
//# sourceMappingURL=trace-sanitizer.js.map