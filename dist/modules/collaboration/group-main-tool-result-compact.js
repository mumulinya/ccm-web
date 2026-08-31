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
exports.compactGroupMainToolResultsForPayload = compactGroupMainToolResultsForPayload;
exports.compactGroupNativeTranscript = compactGroupNativeTranscript;
exports.runGroupMainToolResultCompactSelfTest = runGroupMainToolResultCompactSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const context_budget_1 = require("../../system/context-budget");
const native_query_messages_1 = require("../../agents/native-query-messages");
const tool_result_storage_1 = require("../../tools/tool-result-storage");
function cloneRow(row) {
    if (!row || typeof row !== "object")
        return row;
    const next = { ...row };
    if (row.rawOutput && typeof row.rawOutput === "object")
        next.rawOutput = Array.isArray(row.rawOutput) ? [...row.rawOutput] : { ...row.rawOutput };
    return next;
}
function payloadBody(raw) {
    return raw?.modelPayload && typeof raw.modelPayload === "object" ? raw.modelPayload : raw;
}
function isWorkspaceFileRead(row, raw) {
    const name = String(row?.name || "");
    if (/(?:^|__)read_files?$/i.test(name))
        return true;
    const body = payloadBody(raw) || {};
    const type = String(body?.type || raw?.type || "");
    if (type === "text" || type === "text_batch")
        return true;
    return /workspace-read-(?:files-)?result|workspace-tool-envelope/.test(String(raw?.schema || body?.schema || ""));
}
function catNLines(rows = []) {
    return rows.map((row) => `${String(row?.line ?? "").padStart(6)}\t${row?.text ?? row ?? ""}`).join("\n");
}
function fileReadCatN(raw) {
    const body = payloadBody(raw) || {};
    const files = Array.isArray(body?.files) ? body.files : Array.isArray(body?.lines) ? [body] : [];
    return files.map((file) => {
        const pathLabel = String(file?.path || body?.path || "").trim();
        const content = catNLines(Array.isArray(file?.lines) ? file.lines : []);
        return pathLabel ? `${pathLabel}\n${content}` : content;
    }).filter(Boolean).join("\n\n");
}
function compactOne(row) {
    const next = cloneRow(row);
    const raw = next.rawOutput && typeof next.rawOutput === "object" && !Array.isArray(next.rawOutput) ? next.rawOutput : null;
    let changed = false;
    if (isWorkspaceFileRead(next, raw)) {
        const catN = fileReadCatN(raw);
        if (catN && catN !== String(next.output || "")) {
            next.output = catN;
            changed = true;
        }
        if (changed) {
            next.outputTokens = (0, context_budget_1.estimateTextTokens)(String(next.output || ""));
            next.compacted = true;
        }
        return { row: next, changed };
    }
    if ((0, tool_result_storage_1.isPersistedToolResult)(next.output) || (0, tool_result_storage_1.isPersistedToolResult)(raw)) {
        return { row: next, changed: false };
    }
    if (raw) {
        next.rawOutput = raw;
        next.output = typeof next.output === "string" ? next.output : JSON.stringify(raw);
    }
    if (changed) {
        next.outputTokens = (0, context_budget_1.estimateTextTokens)(String(next.output || ""));
        next.compacted = true;
    }
    return { row: next, changed };
}
function stripBody(row) {
    if ((0, tool_result_storage_1.isPersistedToolResult)(row?.output) || (0, tool_result_storage_1.isPersistedToolResult)(row?.rawOutput))
        return row;
    const next = cloneRow(row);
    const summary = String(next.error || next.reason || next.name || "tool").slice(0, 240);
    next.rawOutput = undefined;
    next.output = JSON.stringify({ name: next.name, ok: next.ok !== false, truncated: true, summary });
    next.outputTokens = (0, context_budget_1.estimateTextTokens)(next.output);
    next.compacted = true;
    return next;
}
function tokenSum(rows) {
    return rows.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens) || (0, context_budget_1.estimateTextTokens)(String(row?.output || ""))), 0);
}
function compactGroupMainToolResultsForPayload(rows = [], budgetTokens = 40_000, persistContext) {
    const budget = Math.max(1_000, Number(budgetTokens) || 40_000);
    const persisted = (0, tool_result_storage_1.persistNativeToolResultRows)(Array.isArray(rows) ? rows : [], persistContext);
    const next = persisted.rows.map(cloneRow);
    const before = tokenSum(next);
    if (before <= budget)
        return { rows: next, changed: persisted.changed, tokens: before };
    let changed = persisted.changed;
    const ranked = [...next.keys()].sort((left, right) => ((Number(next[right]?.outputTokens) || 0) - (Number(next[left]?.outputTokens) || 0)));
    for (const index of ranked) {
        if (tokenSum(next) <= budget)
            break;
        const compacted = compactOne(next[index]);
        next[index] = compacted.row;
        changed = changed || compacted.changed;
    }
    if (persistContext?.sessionId) {
        const extra = (0, tool_result_storage_1.persistNativeToolResultRows)(next, persistContext);
        for (let index = 0; index < next.length; index += 1)
            next[index] = extra.rows[index];
        changed = changed || extra.changed;
    }
    for (const index of ranked) {
        if (tokenSum(next) <= budget)
            break;
        if (isWorkspaceFileRead(next[index], next[index]?.rawOutput))
            continue;
        next[index] = stripBody(next[index]);
        changed = true;
    }
    for (const index of ranked) {
        if (tokenSum(next) <= budget)
            break;
        next[index] = stripBody(next[index]);
        changed = true;
    }
    return { rows: next, changed, tokens: tokenSum(next) };
}
function compactGroupNativeTranscript(messages, rows = [], budgetTokens = 40_000, persistContext) {
    const compacted = compactGroupMainToolResultsForPayload(rows, Math.max(1_000, Math.min(40_000, Number(budgetTokens) || 40_000)), persistContext);
    if (!compacted.changed)
        return { messages, rows: compacted.rows, changed: false, tokens: compacted.tokens };
    return {
        messages: (0, native_query_messages_1.applyCompactedToolResultsToMessages)(messages, compacted.rows),
        rows: compacted.rows,
        changed: true,
        tokens: compacted.tokens,
    };
}
function runGroupMainToolResultCompactSelfTest() {
    const bulky = {
        name: "grep_text",
        ok: true,
        outputTokens: 12_000,
        rawOutput: { lines: Array.from({ length: 80 }, (_, index) => `src/a.ts:${index}:recommend`) },
        output: JSON.stringify({ lines: Array.from({ length: 80 }, (_, index) => `src/a.ts:${index}:recommend`) }),
    };
    const result = compactGroupMainToolResultsForPayload([bulky, { name: "list_directory", ok: true, outputTokens: 20, output: "{}" }], 2_000);
    const fileLines = Array.from({ length: 80 }, (_, index) => ({ line: index + 1, text: `export const v${index} = ${index};` }));
    const fileRead = {
        name: "read_file",
        ok: true,
        outputTokens: 18_000,
        rawOutput: {
            schema: "ccm-workspace-tool-envelope-v3",
            modelPayload: { type: "text", path: "src/service.ts", lines: fileLines },
        },
        output: JSON.stringify({ schema: "ccm-workspace-tool-envelope-v3", modelPayload: { type: "text", path: "src/service.ts", lines: fileLines } }),
    };
    const fileResult = compactGroupMainToolResultsForPayload([fileRead, bulky], 8_000);
    const transcript = compactGroupNativeTranscript([
        { role: "assistant", content: "", tool_calls: [{ id: "call_grep", type: "function", function: { name: "grep_text", arguments: "{}" } }] },
        { role: "tool", tool_call_id: "call_grep", name: "grep_text", content: bulky.output },
        { role: "assistant", content: "", tool_calls: [{ id: "call_ls", type: "function", function: { name: "list_directory", arguments: "{}" } }] },
        { role: "tool", tool_call_id: "call_ls", name: "list_directory", content: "{}" },
    ], [
        { ...bulky, toolCallId: "call_grep" },
        { name: "list_directory", ok: true, outputTokens: 20, output: "{}", toolCallId: "call_ls" },
    ], 2_000);
    const rewritten = String(transcript.messages.find((item) => item?.tool_call_id === "call_grep")?.content || "");
    const persistContext = { scope: "group", scopeId: "selftest-group", sessionId: `gcs_compact_${Date.now()}_${process.pid}` };
    try {
        const huge = {
            name: "grep_text",
            ok: true,
            toolCallId: "call_huge",
            output: { lines: Array.from({ length: 3_000 }, (_, index) => `row-${index}-${"y".repeat(20)}`) },
        };
        const persisted = compactGroupMainToolResultsForPayload([huge], 40_000, persistContext);
        const checks = {
            reducedTokens: result.tokens < 12_000 && result.changed === true,
            keptGrepPreview: String(result.rows[0]?.output || "").includes("truncated"),
            keptSmallRow: result.rows[1]?.name === "list_directory",
            fileReadKeepsContent: /export const v0/.test(String(fileResult.rows[0]?.output || ""))
                && /export const v79/.test(String(fileResult.rows[0]?.output || ""))
                && Array.isArray(fileResult.rows[0]?.rawOutput?.modelPayload?.lines)
                && fileResult.rows[0].rawOutput.modelPayload.lines.length === 80,
            transcriptRewritesToolResult: transcript.changed === true
                && rewritten.length > 0
                && rewritten.length < bulky.output.length
                && rewritten !== bulky.output,
            persistOversizePreview: (0, tool_result_storage_1.isPersistedToolResult)(persisted.rows[0]?.output) === true
                && String(persisted.rows[0]?.output?.preview || "").includes("<persisted-output>")
                && JSON.stringify(huge.output).length > tool_result_storage_1.DEFAULT_MAX_RESULT_SIZE_CHARS,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.rmSync(path.join(utils_1.CCM_DIR, "tool-results", "group", persistContext.scopeId, persistContext.sessionId), { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=group-main-tool-result-compact.js.map