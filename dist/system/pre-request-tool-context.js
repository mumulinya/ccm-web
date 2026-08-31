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
exports.collectProviderToolResults = collectProviderToolResults;
exports.loadPreRequestToolContextState = loadPreRequestToolContextState;
exports.stagePreRequestToolContext = stagePreRequestToolContext;
exports.bindPreRequestToolContext = bindPreRequestToolContext;
exports.commitPreRequestToolContext = commitPreRequestToolContext;
exports.abortPreRequestToolContext = abortPreRequestToolContext;
exports.deletePreRequestToolContextState = deletePreRequestToolContextState;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const context_budget_1 = require("./context-budget");
const ccm_context_accounting_v2_1 = require("./ccm-context-accounting-v2");
const post_turn_tool_context_compaction_1 = require("./post-turn-tool-context-compaction");
const native_query_messages_1 = require("../agents/native-query-messages");
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function safePart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100) || "unknown";
}
function stateFile(scope, scopeId, exactSessionId) {
    return path.join(utils_1.CCM_DIR, "context-projections", "tool-evidence-v2", safePart(scope), `${safePart(scopeId)}-${digest(scopeId).slice(0, 12)}`, `${safePart(exactSessionId)}-${digest(exactSessionId).slice(0, 12)}.json`);
}
function stringify(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value || "");
    }
}
function collectProviderToolResults(messages) {
    const results = [];
    for (const [messageIndex, message] of (Array.isArray(messages) ? messages : []).entries()) {
        if (String(message?.role || "") === "tool") {
            const toolCallId = String(message?.tool_call_id || message?.toolCallId || "").trim();
            if (toolCallId)
                results.push({
                    toolCallId,
                    toolName: String(message?.name || "tool"),
                    content: stringify(message?.content),
                    failed: message?.is_error === true || message?.error === true,
                    order: messageIndex * 1_000,
                });
        }
        if (!Array.isArray(message?.content))
            continue;
        for (const [partIndex, part] of message.content.entries()) {
            if (part?.type === "tool_result") {
                const toolCallId = String(part?.tool_use_id || "").trim();
                if (toolCallId)
                    results.push({
                        toolCallId,
                        toolName: String(part?.name || "tool"),
                        content: stringify(part?.content),
                        failed: part?.is_error === true,
                        order: messageIndex * 1_000 + partIndex,
                    });
            }
            else if (part?.functionResponse) {
                const toolCallId = String(part.functionResponse.id || "").trim();
                if (toolCallId)
                    results.push({
                        toolCallId,
                        toolName: String(part.functionResponse.name || "tool"),
                        content: stringify(part.functionResponse.response),
                        failed: part.functionResponse.response?.ok === false || Boolean(part.functionResponse.response?.error),
                        order: messageIndex * 1_000 + partIndex,
                    });
            }
        }
    }
    const byIdentity = new Map();
    for (const row of results)
        byIdentity.set(`${row.toolCallId}:${digest(row.content)}`, row);
    return [...byIdentity.values()].sort((a, b) => a.order - b.order);
}
function loadPreRequestToolContextState(scope, scopeId, exactSessionId) {
    try {
        const parsed = JSON.parse(fs.readFileSync(stateFile(scope, scopeId, exactSessionId), "utf8"));
        return parsed?.schema === "ccm-pre-request-tool-context-state-v2" ? parsed : null;
    }
    catch {
        return null;
    }
}
function initialState(scope, scopeId, exactSessionId) {
    const legacy = (0, post_turn_tool_context_compaction_1.loadPostTurnToolContextState)(scope, scopeId, exactSessionId);
    return {
        schema: "ccm-pre-request-tool-context-state-v2",
        scope,
        scopeId,
        exactSessionId,
        results: (legacy?.evidence || []).map(row => ({
            toolCallId: row.toolCallId,
            resultChecksum: row.resultChecksum,
            turnId: row.turnId,
            generation: row.generation,
            attempt: row.attempt,
            state: row.resultState === "stale" ? "stale" : "compacted",
            observedAt: legacy?.updatedAt || new Date().toISOString(),
        })),
        pendingRequests: [],
        updatedAt: new Date().toISOString(),
        contentStored: false,
    };
}
function persistState(state) {
    const next = { ...state, results: state.results.slice(-4_000), pendingRequests: state.pendingRequests.slice(-50), updatedAt: new Date().toISOString() };
    (0, atomic_json_file_1.writeJsonAtomic)(stateFile(state.scope, state.scopeId, state.exactSessionId), next);
    return next;
}
function resultKey(row) {
    return `${row.generation}:${row.attempt}:${row.toolCallId}:${row.resultChecksum}`;
}
function evidenceOutput(row, checksum) {
    let parsed = null;
    try {
        parsed = JSON.parse(row.content);
    }
    catch { }
    const candidatePath = String(parsed?.path || parsed?.relativePath || parsed?.relative_path || "").replace(/\\/g, "/");
    const safePath = candidatePath && !path.isAbsolute(candidatePath) && !/^[a-zA-Z]:\//.test(candidatePath) && !candidatePath.startsWith("../")
        ? candidatePath.slice(0, 1_200)
        : "";
    return JSON.stringify({
        schema: "ccm-consumed-tool-evidence-v1",
        toolCallId: row.toolCallId,
        toolName: row.toolName,
        ...(safePath ? { evidenceRefs: [{ path: safePath, checksum: String(parsed?.checksum || checksum) }] } : { evidenceRefs: [] }),
        resultChecksum: checksum,
        resultState: "complete",
        unresolvedCodes: safePath ? [] : ["source_location_unavailable"],
        rehydratable: true,
        contentStored: false,
    });
}
function stagePreRequestToolContext(input) {
    const generation = Math.max(0, Math.floor(Number(input.generation || 0)));
    const attempt = Math.max(1, Math.floor(Number(input.attempt || 1)));
    const existing = loadPreRequestToolContextState(input.scope, input.scopeId, input.exactSessionId)
        || initialState(input.scope, input.scopeId, input.exactSessionId);
    // Merge any legacy V1 evidence that was written before V2 was introduced.
    // This is lazy and read-compatible; it never rewrites the execution ledger.
    const legacy = (0, post_turn_tool_context_compaction_1.loadPostTurnToolContextState)(input.scope, input.scopeId, input.exactSessionId);
    const knownLegacy = new Set(existing.results.map(row => resultKey(row)));
    for (const row of legacy?.evidence || []) {
        const migrated = {
            toolCallId: row.toolCallId,
            resultChecksum: row.resultChecksum,
            turnId: row.turnId,
            generation: row.generation,
            attempt: row.attempt,
            state: row.resultState === "stale" ? "stale" : "compacted",
            observedAt: legacy?.updatedAt || new Date().toISOString(),
        };
        if (!knownLegacy.has(resultKey(migrated)))
            existing.results.push(migrated);
    }
    // A process restart or failed request cannot leave results permanently pending.
    existing.results = existing.results.map(row => row.state === "pending_provider" ? { ...row, state: "unconsumed" } : row);
    existing.pendingRequests = [];
    const views = collectProviderToolResults(input.messages);
    const rowsByKey = new Map(existing.results.map(row => [resultKey(row), row]));
    const now = new Date().toISOString();
    for (const view of views) {
        const resultChecksum = digest(view.content);
        const key = resultKey({ toolCallId: view.toolCallId, resultChecksum, generation, attempt });
        if (!rowsByKey.has(key))
            rowsByKey.set(key, {
                toolCallId: view.toolCallId,
                resultChecksum,
                turnId: view.toolCallId,
                generation,
                attempt,
                state: "unconsumed",
                observedAt: now,
            });
    }
    existing.results = [...rowsByKey.values()];
    const capacity = (0, ccm_context_accounting_v2_1.normalizeCcmContextCapacity)(input.config || {});
    // The runtime line is derived only from the effective Provider input window.
    // Legacy fixed thresholds remain readable in configuration migrations but
    // must not reactivate post-turn/fixed-size compaction behavior.
    const thresholdTokens = capacity.autoCompactThresholdTokens;
    const tokensBefore = Math.max(0, Math.floor(Number(input.tokensBefore || 0)));
    const pressure = input.forcePromptTooLong === true || tokensBefore >= thresholdTokens;
    const currentIds = new Set((input.currentToolCallIds || []).map(String));
    const protectedToolCallIds = new Set();
    const consumedToolCallIds = new Set();
    const candidates = [];
    for (const view of views) {
        const checksum = digest(view.content);
        const stateRow = rowsByKey.get(resultKey({ toolCallId: view.toolCallId, resultChecksum: checksum, generation, attempt }));
        if (stateRow.state === "consumed")
            consumedToolCallIds.add(view.toolCallId);
        if (stateRow.state === "compacted" || stateRow.state === "stale") {
            const replacement = evidenceOutput(view, checksum);
            candidates.push({ view, stateRow, replacement, freed: Math.max(0, (0, context_budget_1.estimateTextTokens)(view.content) - (0, context_budget_1.estimateTextTokens)(replacement)) });
            continue;
        }
        if (stateRow.state !== "consumed" || view.failed || currentIds.has(view.toolCallId)) {
            protectedToolCallIds.add(view.toolCallId);
            continue;
        }
        const replacement = evidenceOutput(view, checksum);
        candidates.push({ view, stateRow, replacement, freed: Math.max(0, (0, context_budget_1.estimateTextTokens)(view.content) - (0, context_budget_1.estimateTextTokens)(replacement)) });
    }
    let estimatedTokens = tokensBefore;
    const compacted = [];
    for (const candidate of candidates.filter(item => item.stateRow.state === "compacted" || item.stateRow.state === "stale")) {
        compacted.push(candidate);
        estimatedTokens = Math.max(0, estimatedTokens - candidate.freed);
    }
    if (pressure) {
        for (const candidate of candidates.filter(item => item.stateRow.state === "consumed").sort((a, b) => a.view.order - b.view.order)) {
            if (!input.forcePromptTooLong && estimatedTokens < thresholdTokens)
                break;
            compacted.push(candidate);
            estimatedTokens = Math.max(0, estimatedTokens - candidate.freed);
            candidate.stateRow.state = "compacted";
        }
    }
    const messages = (0, native_query_messages_1.applyCompactedToolResultsToMessages)(input.messages, compacted.map(candidate => ({
        callId: candidate.view.toolCallId,
        name: candidate.view.toolName,
        ok: true,
        output: candidate.replacement,
    })));
    const requestId = `preq_${digest([input.scope, input.scopeId, input.exactSessionId, input.providerPayloadChecksum, generation, attempt]).slice(0, 32)}`;
    const pendingToolCallIds = views.filter(view => {
        const row = rowsByKey.get(resultKey({ toolCallId: view.toolCallId, resultChecksum: digest(view.content), generation, attempt }));
        return row?.state === "unconsumed" && !view.failed;
    }).map(view => view.toolCallId);
    const evaluation = {
        schema: "ccm-pre-request-tool-context-evaluation-v2",
        phase: "before_provider_request",
        requestId,
        trigger: compacted.length && pressure
            ? input.forcePromptTooLong ? "provider_prompt_too_long" : "context_pressure"
            : compacted.length ? "legacy_evidence_projection" : "below_threshold",
        effectiveInputWindowTokens: capacity.effectiveInputWindowTokens,
        autoCompactBufferTokens: 13_000,
        thresholdTokens,
        tokensBefore,
        tokensAfter: estimatedTokens,
        consumedToolCallIds: [...consumedToolCallIds],
        protectedToolCallIds: [...protectedToolCallIds],
        compactedToolCallIds: compacted.map(candidate => candidate.view.toolCallId),
        rawExecutionLedgerPreserved: true,
        contentStored: false,
    };
    existing.lastEvaluation = evaluation;
    persistState(existing);
    return { messages, evaluation, pendingToolCallIds, changed: compacted.length > 0 };
}
function bindPreRequestToolContext(input) {
    const state = loadPreRequestToolContextState(input.scope, input.scopeId, input.exactSessionId);
    if (!state)
        return null;
    const ids = new Set((input.toolCallIds || []).map(String));
    state.results = state.results.map(row => row.state === "unconsumed" && ids.has(row.toolCallId)
        ? { ...row, state: "pending_provider", consumedByRequestId: input.requestId }
        : row);
    state.pendingRequests = state.pendingRequests.filter(row => row.requestId !== input.requestId);
    state.pendingRequests.push({
        requestId: input.requestId,
        providerPayloadChecksum: input.providerPayloadChecksum,
        toolCallIds: [...ids],
        createdAt: new Date().toISOString(),
    });
    if (state.lastEvaluation?.requestId === input.requestId && Number.isFinite(Number(input.tokensAfter))) {
        state.lastEvaluation = { ...state.lastEvaluation, tokensAfter: Math.max(0, Math.floor(Number(input.tokensAfter))) };
    }
    return persistState(state);
}
function commitPreRequestToolContext(scope, scopeId, exactSessionId, requestId) {
    const state = loadPreRequestToolContextState(scope, scopeId, exactSessionId);
    if (!state)
        return null;
    const pending = state.pendingRequests.find(row => row.requestId === requestId);
    if (!pending)
        return state;
    const ids = new Set(pending.toolCallIds);
    const consumedAt = new Date().toISOString();
    state.results = state.results.map(row => row.state === "pending_provider" && row.consumedByRequestId === requestId && ids.has(row.toolCallId)
        ? { ...row, state: "consumed", consumedAt }
        : row);
    state.pendingRequests = state.pendingRequests.filter(row => row.requestId !== requestId);
    return persistState(state);
}
function abortPreRequestToolContext(scope, scopeId, exactSessionId, requestId) {
    const state = loadPreRequestToolContextState(scope, scopeId, exactSessionId);
    if (!state)
        return null;
    state.results = state.results.map(row => row.state === "pending_provider" && row.consumedByRequestId === requestId
        ? { ...row, state: "unconsumed", consumedByRequestId: undefined }
        : row);
    state.pendingRequests = state.pendingRequests.filter(row => row.requestId !== requestId);
    return persistState(state);
}
function deletePreRequestToolContextState(scope, scopeId, exactSessionId) {
    const file = stateFile(scope, scopeId, exactSessionId);
    try {
        fs.rmSync(file, { force: true });
    }
    catch { }
    return { deleted: !fs.existsSync(file), contentStored: false };
}
//# sourceMappingURL=pre-request-tool-context.js.map