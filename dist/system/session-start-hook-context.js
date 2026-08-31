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
exports.storeSessionStartHookContext = storeSessionStartHookContext;
exports.takeSessionStartHookContext = takeSessionStartHookContext;
exports.clearSessionStartHookContext = clearSessionStartHookContext;
exports.readSessionStartHookContextReceipt = readSessionStartHookContextReceipt;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const transientContexts = new Map();
const RECEIPT_DIR = path.join(utils_1.CCM_DIR, "session-compaction", "session-start-hook-context");
function key(scope, exactSessionId) {
    return `${scope}:${String(exactSessionId || "").trim()}`;
}
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function receiptFile(scope, exactSessionId) {
    return path.join(RECEIPT_DIR, `${digest([scope, exactSessionId])}.json`);
}
function persistProjection(projection) {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
    (0, atomic_json_file_1.writeJsonAtomic)(receiptFile(projection.scope, projection.exactSessionId), {
        ...projection,
        recordedAt: new Date().toISOString(),
    });
}
function redact(value) {
    return String(value || "")
        .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
        .replace(/(?:sk|ghp|glpat|xox[baprs])[-_][A-Za-z0-9_-]{12,}/g, "[REDACTED]")
        .replace(/data:(?:image|application\/pdf)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]{32,}/gi, "[binary-media]")
        .replace(/(?:[A-Za-z]:\\|\/)(?:[^\s<>:"|?*]+[\\/])*[^\s<>:"|?*]*/g, "[absolute-path]");
}
function safeLines(value) {
    const sourceLike = /^\s*(?:import|export|const|let|var|function|class|interface|type|enum|def|public|private|protected|package)\b|^\s*@@|^\s*[+-](?!\s*[MADRCU?]{1,2}\s)/;
    return redact(value)
        .split(/\r?\n/)
        .filter(line => !sourceLike.test(line) && !/[{};]\s*$/.test(line.trim()))
        .slice(0, 80)
        .join("\n")
        .trim();
}
function configuredHookRows(results) {
    return (Array.isArray(results) ? results : []).flatMap(result => Array.isArray(result?.results) ? result.results : [])
        .filter(row => row?.status === "success" && String(row?.outputSummary || "").trim());
}
function storeSessionStartHookContext(input) {
    if (!["global", "group", "project"].includes(String(input.scope)))
        return null;
    const selected = [];
    let remaining = 4_000;
    for (const row of configuredHookRows(input.hookResults)) {
        const text = safeLines(String(row.outputSummary || "")).slice(0, Math.min(2_000, remaining));
        if (!text)
            continue;
        selected.push({ id: String(row.hookId || row.id || "hook"), text });
        remaining -= text.length;
        if (remaining <= 0)
            break;
    }
    if (!selected.length)
        return null;
    const text = selected.map(row => `[${row.id}]\n${row.text}`).join("\n\n").slice(0, 4_000);
    const projection = {
        schema: "ccm-session-start-hook-context-v1",
        scope: input.scope,
        exactSessionId: input.exactSessionId,
        compactionRunId: input.compactionRunId,
        hookIds: selected.map(row => row.id),
        contextChecksum: digest(text),
        totalCharacters: text.length,
        appliedToFirstRequest: false,
        contentStored: false,
    };
    const mapKey = key(input.scope, input.exactSessionId);
    const previous = transientContexts.get(mapKey);
    if (previous)
        clearTimeout(previous.expiry);
    const expiry = setTimeout(() => transientContexts.delete(mapKey), 10 * 60_000);
    expiry.unref?.();
    transientContexts.set(mapKey, { projection, generation: Math.max(0, Number(input.generation || 0)), text, expiry });
    persistProjection(projection);
    return projection;
}
function takeSessionStartHookContext(scope, exactSessionId, generation) {
    const mapKey = key(scope, exactSessionId);
    const current = transientContexts.get(mapKey);
    if (!current)
        return null;
    transientContexts.delete(mapKey);
    clearTimeout(current.expiry);
    if (current.generation !== Math.max(0, Number(generation || 0)))
        return null;
    const projection = { ...current.projection, appliedToFirstRequest: true };
    persistProjection(projection);
    return {
        projection,
        text: current.text,
    };
}
function clearSessionStartHookContext(scope, exactSessionId) {
    const mapKey = key(scope, exactSessionId);
    const current = transientContexts.get(mapKey);
    if (current)
        clearTimeout(current.expiry);
    return transientContexts.delete(mapKey);
}
function readSessionStartHookContextReceipt(scope, exactSessionId) {
    const file = receiptFile(scope, exactSessionId);
    if (!fs.existsSync(file))
        return null;
    const value = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
    if (value?.schema !== "ccm-session-start-hook-context-v1"
        || value?.scope !== scope
        || value?.exactSessionId !== exactSessionId
        || value?.contentStored !== false)
        return null;
    return {
        schema: value.schema,
        scope: value.scope,
        exactSessionId: value.exactSessionId,
        compactionRunId: String(value.compactionRunId || ""),
        hookIds: Array.isArray(value.hookIds) ? value.hookIds.map(String).filter(Boolean) : [],
        contextChecksum: String(value.contextChecksum || ""),
        totalCharacters: Math.max(0, Number(value.totalCharacters || 0)),
        appliedToFirstRequest: value.appliedToFirstRequest === true,
        recordedAt: String(value.recordedAt || ""),
        contentStored: false,
    };
}
//# sourceMappingURL=session-start-hook-context.js.map