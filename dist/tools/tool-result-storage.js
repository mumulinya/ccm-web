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
exports.PERSISTED_TOOL_RESULT_SCHEMA = exports.TOOL_RESULT_CLEARED_MESSAGE = exports.PERSISTED_OUTPUT_CLOSING_TAG = exports.PERSISTED_OUTPUT_TAG = exports.PREVIEW_SIZE_BYTES = exports.MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = exports.DEFAULT_MAX_RESULT_SIZE_CHARS = void 0;
exports.markToolResultSeenUnreplaced = markToolResultSeenUnreplaced;
exports.frozenToolResultPreview = frozenToolResultPreview;
exports.wasToolResultSentUnreplaced = wasToolResultSentUnreplaced;
exports.isPersistedToolResult = isPersistedToolResult;
exports.shouldSkipToolResultPersist = shouldSkipToolResultPersist;
exports.modelVisiblePersistedToolResult = modelVisiblePersistedToolResult;
exports.modelVisibleToolResultValue = modelVisibleToolResultValue;
exports.persistToolResultIfNeeded = persistToolResultIfNeeded;
exports.persistPayloadObservation = persistPayloadObservation;
exports.enforceToolResultBudget = enforceToolResultBudget;
exports.persistNativeToolResultRows = persistNativeToolResultRows;
exports.runToolResultStorageSelfTest = runToolResultStorageSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const context_source_tool_result_projection_1 = require("../system/context-source-tool-result-projection");
exports.DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000;
exports.MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200_000;
exports.PREVIEW_SIZE_BYTES = 2_000;
exports.PERSISTED_OUTPUT_TAG = "<persisted-output>";
exports.PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
exports.TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]";
exports.PERSISTED_TOOL_RESULT_SCHEMA = "ccm-persisted-tool-result-v1";
const SKIP_PERSIST_TOOLS = /(?:^|_)(?:read_files?|read_file|analyze_change_impact|find_related_tests|inspect_dependency_graph|inspect_public_contracts|compare_project_contracts|read_git_blame|discover_verification_commands|run_inspection_command)$/i;
const IMAGE_HINT = /data:(?:image|application\/pdf)\/[a-z0-9.+-]+;base64,/i;
function safePart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}
function serialize(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value ?? "");
    }
}
function resultsDir(context) {
    return path.join(utils_1.CCM_DIR, "tool-results", safePart(context.scope), safePart(context.scopeId), safePart(context.sessionId));
}
function replacementFile(context) {
    return path.join(resultsDir(context), "replacements.json");
}
function resultFile(context, toolCallId) {
    return path.join(resultsDir(context), `${safePart(toolCallId)}.json`);
}
function readReplacementStore(context) {
    const fallback = { schema: "ccm-tool-result-replacement-state-v1", replacements: {}, seenUnreplaced: [] };
    try {
        const parsed = JSON.parse(fs.readFileSync(replacementFile(context), "utf8"));
        if (parsed?.schema !== fallback.schema)
            return fallback;
        return {
            schema: fallback.schema,
            replacements: parsed.replacements && typeof parsed.replacements === "object" ? parsed.replacements : {},
            seenUnreplaced: Array.isArray(parsed.seenUnreplaced) ? parsed.seenUnreplaced.map(String) : [],
        };
    }
    catch {
        return fallback;
    }
}
function writeReplacementStore(context, store) {
    fs.mkdirSync(resultsDir(context), { recursive: true });
    const file = replacementFile(context);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(temp, file);
}
function freezeReplacement(context, toolCallId, preview) {
    const store = readReplacementStore(context);
    if (store.replacements[toolCallId] === preview)
        return preview;
    if (store.replacements[toolCallId])
        return store.replacements[toolCallId];
    store.replacements[toolCallId] = preview;
    store.seenUnreplaced = store.seenUnreplaced.filter(id => id !== toolCallId);
    writeReplacementStore(context, store);
    return preview;
}
function markToolResultSeenUnreplaced(context, toolCallId) {
    const id = String(toolCallId || "").trim();
    if (!id)
        return;
    const store = readReplacementStore(context);
    if (store.replacements[id] || store.seenUnreplaced.includes(id))
        return;
    store.seenUnreplaced = [...store.seenUnreplaced, id].slice(-2_000);
    writeReplacementStore(context, store);
}
function frozenToolResultPreview(context, toolCallId) {
    return readReplacementStore(context).replacements[String(toolCallId || "")] || "";
}
function wasToolResultSentUnreplaced(context, toolCallId) {
    return readReplacementStore(context).seenUnreplaced.includes(String(toolCallId || ""));
}
function isPersistedToolResult(value) {
    return !!value && typeof value === "object" && value.schema === exports.PERSISTED_TOOL_RESULT_SCHEMA && value.contentStored === true;
}
function shouldSkipToolResultPersist(toolName, value) {
    if (SKIP_PERSIST_TOOLS.test(String(toolName || "")))
        return true;
    if (isPersistedToolResult(value) || isPersistedToolResult(value?.observation))
        return true;
    if ((0, context_source_tool_result_projection_1.isWorkspaceToolResultReference)(value) || (0, context_source_tool_result_projection_1.isWorkspaceToolResultReference)(value?.observation))
        return true;
    if (value?.contentStored === false && /ccm-context-source-tool-result-reference/.test(String(value?.schema || "")))
        return true;
    const text = serialize(value);
    return IMAGE_HINT.test(text);
}
function previewFrom(text) {
    const buffer = Buffer.from(text, "utf8");
    if (buffer.length <= exports.PREVIEW_SIZE_BYTES)
        return text;
    let cut = exports.PREVIEW_SIZE_BYTES;
    while (cut > 0 && (buffer[cut] & 0xc0) === 0x80)
        cut -= 1;
    let slice = buffer.slice(0, cut).toString("utf8");
    const newline = slice.lastIndexOf("\n");
    if (newline > exports.PREVIEW_SIZE_BYTES / 2)
        slice = slice.slice(0, newline);
    return slice;
}
function modelVisiblePersistedToolResult(value) {
    if (typeof value === "string")
        return value;
    if (value?.preview)
        return value.preview;
    return serialize(value);
}
function modelVisibleToolResultValue(value) {
    if (isPersistedToolResult(value))
        return modelVisiblePersistedToolResult(value);
    if (isPersistedToolResult(value?.observation))
        return modelVisiblePersistedToolResult(value.observation);
    return value;
}
function buildPreviewMessage(input) {
    const head = previewFrom(input.body);
    return [
        head,
        "",
        exports.PERSISTED_OUTPUT_TAG,
        `path=${input.filePath}`,
        `tool_call_id=${input.toolCallId}`,
        `tool=${input.toolName}`,
        `bytes=${input.bytes}`,
        `original_chars=${input.originalChars}`,
        `checksum=${input.checksum}`,
        `locator=${input.locator}`,
        exports.PERSISTED_OUTPUT_CLOSING_TAG,
    ].join("\n");
}
function persistToolResultIfNeeded(input) {
    const payload = input.payload;
    const context = input.context;
    if (!context?.scope || !context?.sessionId)
        return payload;
    if (shouldSkipToolResultPersist(input.toolName, payload))
        return payload;
    const toolCallId = String(input.toolCallId || "").trim();
    if (!toolCallId)
        return payload;
    const frozen = frozenToolResultPreview(context, toolCallId);
    if (frozen) {
        const existing = isPersistedToolResult(payload) ? payload : null;
        return {
            schema: exports.PERSISTED_TOOL_RESULT_SCHEMA,
            version: 1,
            toolCallId,
            toolName: String(existing?.toolName || input.toolName || "tool"),
            preview: frozen,
            originalChars: Number(existing?.originalChars || serialize(payload).length),
            bytes: Number(existing?.bytes || Buffer.byteLength(serialize(payload))),
            checksum: String(existing?.checksum || ""),
            locator: String(existing?.locator || `tool-results:${context.scope}:${context.scopeId}:${context.sessionId}:${toolCallId}`),
            path: String(existing?.path || resultFile(context, toolCallId)),
            contentStored: true,
        };
    }
    if (wasToolResultSentUnreplaced(context, toolCallId))
        return payload;
    const body = serialize(payload);
    const threshold = Math.max(1, Number(input.thresholdChars || exports.DEFAULT_MAX_RESULT_SIZE_CHARS));
    if (body.length <= threshold)
        return payload;
    const filePath = resultFile(context, toolCallId);
    const checksum = crypto.createHash("sha256").update(body).digest("hex");
    const locator = `tool-results:${context.scope}:${context.scopeId}:${context.sessionId}:${toolCallId}`;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
        fs.writeFileSync(filePath, body, { encoding: "utf8", flag: "wx" });
    }
    catch (error) {
        if (error?.code !== "EEXIST")
            return payload;
    }
    const preview = freezeReplacement(context, toolCallId, buildPreviewMessage({
        toolCallId,
        toolName: String(input.toolName || "tool"),
        originalChars: body.length,
        bytes: Buffer.byteLength(body),
        checksum,
        locator,
        filePath,
        body,
    }));
    return {
        schema: exports.PERSISTED_TOOL_RESULT_SCHEMA,
        version: 1,
        toolCallId,
        toolName: String(input.toolName || "tool"),
        preview,
        originalChars: body.length,
        bytes: Buffer.byteLength(body),
        checksum,
        locator,
        path: filePath,
        contentStored: true,
    };
}
function persistPayloadObservation(input) {
    const payload = input.payload;
    if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "observation")) {
        const observation = persistToolResultIfNeeded({
            ...input,
            payload: payload.observation,
        });
        return observation === payload.observation ? payload : { ...payload, observation };
    }
    return persistToolResultIfNeeded(input);
}
function resultChars(value) {
    if (isPersistedToolResult(value))
        return String(value.preview || "").length;
    return serialize(value).length;
}
function enforceToolResultBudget(rows, context, maxChars = exports.MAX_TOOL_RESULTS_PER_MESSAGE_CHARS) {
    const next = (Array.isArray(rows) ? rows : []).map(row => ({ ...row }));
    let changed = false;
    const total = () => next.reduce((sum, row) => sum + resultChars(row.output), 0);
    if (total() <= maxChars)
        return { rows: next, changed };
    const ranked = [...next.keys()].sort((left, right) => resultChars(next[right].output) - resultChars(next[left].output));
    for (const index of ranked) {
        if (total() <= maxChars)
            break;
        const row = next[index];
        const toolCallId = String(row.callId || row.toolCallId || "");
        const persisted = persistToolResultIfNeeded({
            toolName: String(row.name || "tool"),
            toolCallId,
            payload: row.output,
            context,
            thresholdChars: 1,
        });
        if (persisted !== row.output) {
            next[index] = { ...row, output: persisted };
            changed = true;
        }
    }
    return { rows: next, changed };
}
function persistNativeToolResultRows(rows, context) {
    if (!context?.scope || !context?.sessionId)
        return { rows: Array.isArray(rows) ? rows.slice() : [], changed: false };
    let changed = false;
    const next = (Array.isArray(rows) ? rows : []).map(row => {
        const persisted = persistToolResultIfNeeded({
            toolName: String(row.name || "tool"),
            toolCallId: String(row.callId || row.toolCallId || ""),
            payload: row.output,
            context,
        });
        if (persisted === row.output)
            return { ...row };
        changed = true;
        return { ...row, output: persisted };
    });
    const budgeted = enforceToolResultBudget(next, context);
    return { rows: budgeted.rows, changed: changed || budgeted.changed };
}
function runToolResultStorageSelfTest() {
    const context = { scope: "group", scopeId: "selftest-group", sessionId: `gcs_persist_${Date.now()}_${process.pid}` };
    try {
        const bulky = { lines: Array.from({ length: 4_000 }, (_, index) => `row-${index}-${"x".repeat(20)}`) };
        const first = persistToolResultIfNeeded({
            toolName: "grep_text",
            toolCallId: "call_persist_1",
            payload: bulky,
            context,
        });
        const second = persistToolResultIfNeeded({
            toolName: "grep_text",
            toolCallId: "call_persist_1",
            payload: bulky,
            context,
        });
        const tiny = persistToolResultIfNeeded({
            toolName: "list_directory",
            toolCallId: "call_small",
            payload: { ok: true },
            context,
        });
        const skippedRead = persistToolResultIfNeeded({
            toolName: "read_file",
            toolCallId: "call_read",
            payload: { content: "y".repeat(exports.DEFAULT_MAX_RESULT_SIZE_CHARS + 10) },
            context,
        });
        markToolResultSeenUnreplaced(context, "call_small");
        const frozenAfterFull = persistToolResultIfNeeded({
            toolName: "grep_text",
            toolCallId: "call_small",
            payload: { lines: Array.from({ length: 8_000 }, (_, index) => `later-${index}`) },
            context,
        });
        const checks = {
            persistedSchema: isPersistedToolResult(first) === true,
            previewStable: isPersistedToolResult(first) && isPersistedToolResult(second) && first.preview === second.preview,
            fileExists: isPersistedToolResult(first) && fs.existsSync(first.path),
            previewHasTag: isPersistedToolResult(first) && first.preview.includes(exports.PERSISTED_OUTPUT_TAG),
            smallUnchanged: tiny?.ok === true,
            readFileSkipped: typeof skippedRead?.content === "string",
            alreadySentFullNotReplaced: Array.isArray(frozenAfterFull?.lines) === true
                && frozenAfterFull.lines.length === 8_000
                && isPersistedToolResult(frozenAfterFull) === false,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.rmSync(resultsDir(context), { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=tool-result-storage.js.map