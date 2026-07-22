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
exports.SESSION_MEMORY_EXTRACTION_WAIT_MS = exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS = exports.SESSION_MEMORY_INITIAL_TOKENS = exports.SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES = exports.SESSION_COMPACTION_STATE_SCHEMA = void 0;
exports.sessionCompactionChecksum = sessionCompactionChecksum;
exports.buildModelVisiblePayloadSnapshot = buildModelVisiblePayloadSnapshot;
exports.modelVisibleFixedTokens = modelVisibleFixedTokens;
exports.modelVisiblePayloadAccounting = modelVisiblePayloadAccounting;
exports.evaluateSessionMemoryCadence = evaluateSessionMemoryCadence;
exports.validateSessionMemoryState = validateSessionMemoryState;
exports.waitForSessionMemoryExtraction = waitForSessionMemoryExtraction;
exports.scheduleSessionMemoryExtraction = scheduleSessionMemoryExtraction;
exports.inspectSessionMemoryExtraction = inspectSessionMemoryExtraction;
exports.waitForScheduledSessionMemoryExtraction = waitForScheduledSessionMemoryExtraction;
exports.buildSessionMemoryState = buildSessionMemoryState;
exports.normalizeSessionProviderUsage = normalizeSessionProviderUsage;
exports.providerObservedContextTokens = providerObservedContextTokens;
exports.measureSessionContextTokens = measureSessionContextTokens;
exports.buildSessionPostCompactGate = buildSessionPostCompactGate;
exports.buildSessionCompactionBoundaryMarker = buildSessionCompactionBoundaryMarker;
exports.normalizeSessionCompactionState = normalizeSessionCompactionState;
exports.sessionCompactionCircuitOpen = sessionCompactionCircuitOpen;
exports.recordSessionCompactionFailure = recordSessionCompactionFailure;
exports.resetSessionCompactionFailures = resetSessionCompactionFailures;
exports.registerSessionCompactionHook = registerSessionCompactionHook;
exports.runSessionCompactionHooks = runSessionCompactionHooks;
const context_budget_1 = require("./context-budget");
const crypto = __importStar(require("crypto"));
exports.SESSION_COMPACTION_STATE_SCHEMA = "ccm-session-compaction-state-v2";
exports.SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES = 3;
exports.SESSION_MEMORY_INITIAL_TOKENS = 10_000;
exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS = 5_000;
exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
exports.SESSION_MEMORY_EXTRACTION_WAIT_MS = 15_000;
const MODEL_VISIBLE_FIXED_TOKEN_KEYS = [
    "system",
    "tools",
    "rules",
    "skills",
    "mcpTools",
    "subagentDefinitions",
    "recoveryContext",
    "hookResults",
];
const lifecycleHooks = {
    pre_compact: new Set(),
    session_start: new Set(),
    post_compact: new Set(),
};
const sessionMemoryExtractions = new Map();
function finiteToken(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function messageId(message) {
    return String(message?.id || message?.uuid || message?.messageId || "");
}
function messageContent(message) {
    const content = message?.content ?? message?.message?.content ?? "";
    return typeof content === "string" ? content : JSON.stringify(content);
}
function sessionMemoryChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function checksum(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function sessionCompactionChecksum(value) {
    return checksum(value);
}
function valueTokens(value) {
    if (value == null || value === "")
        return 0;
    if (Array.isArray(value) && value.length === 0)
        return 0;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
        return 0;
    return (0, context_budget_1.estimateTextTokens)(typeof value === "string" ? value : JSON.stringify(value));
}
function contextComponentKey(key) {
    const value = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (/skill/.test(value))
        return "skills";
    if (/mcp|dynamictool/.test(value))
        return "mcpTools";
    if (/subagent|agentdefinition|agentcatalog|projectdirectory|groupmember|members/.test(value))
        return "subagentDefinitions";
    if (/rule|policy|instruction|constraint|permission|authorization|boundary/.test(value))
        return "rules";
    return "";
}
function structuredContextHints(value) {
    const result = {};
    if (!value || typeof value !== "object" || Array.isArray(value))
        return result;
    for (const [key, entry] of Object.entries(value)) {
        const component = contextComponentKey(key);
        if (!component)
            continue;
        result[component] = (result[component] || 0) + valueTokens({ [key]: entry });
    }
    return result;
}
function toolContextHints(value) {
    const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    let mcpTools = 0;
    let subagentDefinitions = 0;
    for (const item of items) {
        const identity = JSON.stringify({ name: item?.name || item?.function?.name || item?.id || "", type: item?.type || "", source: item?.source || "" });
        const tokens = valueTokens(item);
        if (/mcp__|\bmcp\b|dynamic[_-]?tool/i.test(identity))
            mcpTools += tokens;
        else if (/subagent|task[_-]?agent|worker[_-]?agent/i.test(identity))
            subagentDefinitions += tokens;
    }
    return { mcpTools, subagentDefinitions };
}
function partitionTokens(totalInput, requestedInput) {
    const total = Math.max(0, Math.floor(totalInput));
    const requested = Object.fromEntries(Object.entries(requestedInput).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value || 0)))]));
    const requestedTotal = Object.values(requested).reduce((sum, value) => sum + value, 0);
    if (!requestedTotal)
        return { allocated: requested, remaining: total };
    if (requestedTotal <= total)
        return { allocated: requested, remaining: total - requestedTotal };
    const allocated = {};
    let used = 0;
    const entries = Object.entries(requested);
    entries.forEach(([key, value], index) => {
        const next = index === entries.length - 1 ? total - used : Math.floor((value / requestedTotal) * total);
        allocated[key] = Math.max(0, next);
        used += allocated[key];
    });
    return { allocated, remaining: 0 };
}
function buildModelVisiblePayloadSnapshot(input) {
    const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages : [];
    const hookResults = Array.isArray(input.hookResults) ? input.hookResults : [];
    const fixedContext = { system: input.system ?? null, tools: input.tools ?? null, recoveryContext: input.recoveryContext ?? null, hookResults };
    const rawSystemTokens = valueTokens(input.system);
    const rawToolTokens = valueTokens(input.tools);
    const structuredHints = structuredContextHints(input.system);
    const toolHints = toolContextHints(input.tools);
    const explicit = input.contextComponents || {};
    const toolMcpTokens = explicit.mcpTools === undefined ? toolHints.mcpTools : valueTokens(explicit.mcpTools);
    const toolSubagentTokens = toolHints.subagentDefinitions;
    const toolPartition = partitionTokens(rawToolTokens, { mcpTools: toolMcpTokens, subagentDefinitions: toolSubagentTokens });
    const rawRecentMessageTokens = recentMessages.reduce((sum, message) => sum + valueTokens(messageContent(message)), 0);
    const recentPartition = partitionTokens(rawRecentMessageTokens, {
        mcpResults: explicit.mcpResults === undefined ? 0 : valueTokens(explicit.mcpResults),
    });
    const systemPartition = partitionTokens(rawSystemTokens, {
        rules: explicit.rules === undefined ? structuredHints.rules || 0 : valueTokens(explicit.rules),
        skills: explicit.skills === undefined ? structuredHints.skills || 0 : valueTokens(explicit.skills),
        mcpTools: rawToolTokens > 0 ? 0 : explicit.mcpTools === undefined ? structuredHints.mcpTools || 0 : valueTokens(explicit.mcpTools),
        subagentDefinitions: explicit.subagentDefinitions === undefined ? structuredHints.subagentDefinitions || 0 : valueTokens(explicit.subagentDefinitions),
    });
    const tokenBreakdown = {
        system: systemPartition.remaining,
        tools: toolPartition.remaining,
        rules: Number(systemPartition.allocated.rules || 0),
        skills: Number(systemPartition.allocated.skills || 0),
        mcpTools: Number(systemPartition.allocated.mcpTools || 0) + Number(toolPartition.allocated.mcpTools || 0),
        mcpResults: Number(recentPartition.allocated.mcpResults || 0),
        subagentDefinitions: Number(systemPartition.allocated.subagentDefinitions || 0) + Number(toolPartition.allocated.subagentDefinitions || 0),
        summary: valueTokens(input.activeSummary),
        recentMessages: recentPartition.remaining,
        currentRequest: valueTokens(input.currentRequest),
        recoveryContext: valueTokens(input.recoveryContext),
        hookResults: valueTokens(hookResults),
    };
    const payload = {
        system: input.system ?? null,
        tools: input.tools ?? null,
        activeSummary: input.activeSummary ?? null,
        recentMessages,
        currentRequest: input.currentRequest ?? null,
        recoveryContext: input.recoveryContext ?? null,
        hookResults,
    };
    return {
        schema: "ccm-model-visible-payload-snapshot-v1",
        scope: input.scope,
        sessionId: input.sessionId,
        ...payload,
        tokenBreakdown,
        totalTokens: Object.values(tokenBreakdown).reduce((sum, value) => sum + value, 0),
        payloadChecksum: checksum(payload),
        fixedContextChecksum: checksum(fixedContext),
        pendingRequestChecksum: input.currentRequest == null ? "" : checksum(input.currentRequest),
    };
}
function modelVisibleFixedTokens(snapshot) {
    const breakdown = snapshot?.tokenBreakdown || {};
    return MODEL_VISIBLE_FIXED_TOKEN_KEYS.reduce((sum, key) => sum + Math.max(0, Math.floor(Number(breakdown[key] || 0))), 0);
}
function modelVisiblePayloadAccounting(snapshot) {
    if (!snapshot)
        return null;
    return {
        schema: "ccm-model-visible-payload-accounting-v1",
        scope: snapshot.scope,
        sessionId: snapshot.sessionId,
        tokenBreakdown: { ...snapshot.tokenBreakdown },
        totalTokens: snapshot.totalTokens,
        payloadChecksum: snapshot.payloadChecksum,
        fixedContextChecksum: snapshot.fixedContextChecksum,
        pendingRequestChecksum: snapshot.pendingRequestChecksum,
        contentStored: false,
    };
}
function messageToolCallCount(message) {
    const content = message?.content ?? message?.message?.content;
    const blocks = Array.isArray(content) ? content : [];
    const blockCount = blocks.filter((block) => ["tool_use", "tool_result", "tool_call", "function_call"].includes(String(block?.type || ""))).length;
    const explicit = Array.isArray(message?.tool_calls) ? message.tool_calls.length : message?.tool_call || message?.toolUse ? 1 : 0;
    return blockCount + explicit;
}
function evaluateSessionMemoryCadence(messagesInput, stateInput = {}) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const state = stateInput && typeof stateInput === "object" ? stateInput : {};
    const totalTokens = messages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0);
    const lastMessageId = String(state.lastExtractedMessageId || state.last_extracted_message_id || "");
    const cursorIndex = lastMessageId ? messages.findIndex(message => messageId(message) === lastMessageId) : -1;
    const hasPriorSummary = !!(state.summary || state.activeSummary || state.markdown);
    const cursorValid = !hasPriorSummary || (!!lastMessageId && cursorIndex >= 0);
    const priorTokens = Math.max(0, Math.floor(Number(state.tokensAtLastExtraction ?? state.tokens_at_last_extraction ?? 0)));
    const growthTokens = Math.max(0, totalTokens - priorTokens);
    const messagesSinceCursor = cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
    const toolCallsSinceLastExtraction = messagesSinceCursor.reduce((sum, message) => sum + messageToolCallCount(message), 0);
    const shouldExtract = !hasPriorSummary
        ? totalTokens >= exports.SESSION_MEMORY_INITIAL_TOKENS
        : cursorValid && (growthTokens >= exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS || toolCallsSinceLastExtraction >= exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES);
    return {
        schema: "ccm-session-memory-cadence-v2",
        shouldExtract,
        reason: !cursorValid ? "cursor_mismatch"
            : !hasPriorSummary && totalTokens < exports.SESSION_MEMORY_INITIAL_TOKENS ? "waiting_initial_10k"
                : hasPriorSummary && growthTokens < exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS && toolCallsSinceLastExtraction < exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES ? "waiting_5k_or_3_tool_calls"
                    : hasPriorSummary ? "update_due" : "initial_due",
        totalTokens,
        priorTokens,
        growthTokens,
        toolCallsSinceLastExtraction,
        cursorIndex,
        cursorValid,
        sourceLastMessageId: messageId(messages.at(-1)),
        sourceMessageIds: messages.map(messageId),
    };
}
function validateSessionMemoryState(stateInput, input) {
    const state = stateInput && typeof stateInput === "object" ? stateInput : {};
    const summary = state.summary ?? state.activeSummary ?? null;
    const checksum = String(state.summaryChecksum || state.summary_checksum || "");
    const issues = [
        String(state.scope || "") !== input.scope ? "scope_mismatch" : "",
        String(state.sessionId || state.session_id || "") !== input.sessionId ? "session_mismatch" : "",
        !summary ? "summary_missing" : "",
        summary && checksum !== sessionMemoryChecksum(summary) ? "checksum_mismatch" : "",
        input.expectedLastMessageId && String(state.lastExtractedMessageId || state.last_extracted_message_id || "") !== input.expectedLastMessageId ? "cursor_mismatch" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues, summary, checksum };
}
async function waitForSessionMemoryExtraction(promise, timeoutMs = exports.SESSION_MEMORY_EXTRACTION_WAIT_MS) {
    let timeout;
    try {
        return await Promise.race([
            promise.then(value => ({ status: "ready", value })),
            new Promise(resolve => {
                timeout = setTimeout(() => resolve({ status: "timeout", value: null }), Math.max(1, timeoutMs));
            }),
        ]);
    }
    catch (error) {
        return { status: "failed", value: null, error };
    }
    finally {
        if (timeout)
            clearTimeout(timeout);
    }
}
function extractionKey(scope, sessionId) {
    return `${scope}:${sessionId}`;
}
function scheduleSessionMemoryExtraction(input) {
    const key = extractionKey(input.scope, input.sessionId);
    const existing = sessionMemoryExtractions.get(key);
    if (existing)
        return { scheduled: false, reason: "already_in_flight", startedAt: existing.startedAt, identity: existing.identity };
    const startedAt = new Date().toISOString();
    const promise = Promise.resolve()
        .then(input.extract)
        .then(value => input.commit(value, input.identity))
        .finally(() => {
        if (sessionMemoryExtractions.get(key)?.promise === promise)
            sessionMemoryExtractions.delete(key);
    });
    sessionMemoryExtractions.set(key, { identity: input.identity, promise, startedAt });
    promise.catch(() => undefined);
    return { scheduled: true, reason: "scheduled", startedAt, identity: input.identity };
}
function inspectSessionMemoryExtraction(scope, sessionId) {
    const row = sessionMemoryExtractions.get(extractionKey(scope, sessionId));
    return row ? { inFlight: true, startedAt: row.startedAt, identity: row.identity } : { inFlight: false };
}
async function waitForScheduledSessionMemoryExtraction(scope, sessionId, timeoutMs = exports.SESSION_MEMORY_EXTRACTION_WAIT_MS) {
    const row = sessionMemoryExtractions.get(extractionKey(scope, sessionId));
    if (!row)
        return { status: "missing", value: null };
    return waitForSessionMemoryExtraction(row.promise, timeoutMs);
}
function buildSessionMemoryState(input) {
    return {
        schema: "ccm-session-memory-state-v2",
        scope: input.scope,
        sessionId: input.sessionId,
        summary: input.summary,
        summaryChecksum: sessionMemoryChecksum(input.summary),
        lastExtractedMessageId: String(input.cadence?.sourceLastMessageId || ""),
        sourceMessageIds: Array.isArray(input.cadence?.sourceMessageIds) ? input.cadence.sourceMessageIds : [],
        tokensAtLastExtraction: Number(input.cadence?.totalTokens || 0),
        toolCallsAtLastExtraction: Number(input.cadence?.toolCallsSinceLastExtraction || 0),
        provider: String(input.provider || ""),
        model: String(input.model || ""),
        extractionSource: "model",
        updatedAt: new Date().toISOString(),
    };
}
function normalizeSessionProviderUsage(value) {
    if (!value || typeof value !== "object")
        return null;
    const usage = value.usage && typeof value.usage === "object" ? value.usage : value;
    const normalized = {
        scope: String(value.scope || usage.scope || ""),
        sessionId: String(value.sessionId || value.session_id || usage.sessionId || usage.session_id || ""),
        provider: String(value.provider || usage.provider || ""),
        model: String(value.model || usage.model || ""),
        generation: Math.max(0, Math.floor(Number(value.generation ?? usage.generation ?? 0))),
        anchorMessageId: String(value.anchorMessageId || value.anchor_message_id || ""),
        boundaryGeneration: Math.max(0, Math.floor(Number(value.boundaryGeneration ?? value.boundary_generation ?? 0))),
        inputTokens: finiteToken(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens),
        outputTokens: finiteToken(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens),
        directInputTokens: finiteToken(usage.directInputTokens ?? usage.direct_input_tokens),
        cacheCreationInputTokens: finiteToken(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens),
        cacheReadInputTokens: finiteToken(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens),
        recordedAt: String(value.recordedAt || value.recorded_at || new Date().toISOString()),
        estimatedContextTokens: finiteToken(value.estimatedContextTokens ?? value.estimated_context_tokens),
        providerObservedContextTokens: finiteToken(value.providerObservedContextTokens ?? value.provider_observed_context_tokens),
        payloadChecksum: String(value.payloadChecksum || value.payload_checksum || ""),
        fixedContextChecksum: String(value.fixedContextChecksum || value.fixed_context_checksum || ""),
        estimatedFixedTokens: finiteToken(value.estimatedFixedTokens ?? value.estimated_fixed_tokens),
        estimatedPayloadTokens: finiteToken(value.estimatedPayloadTokens ?? value.estimated_payload_tokens ?? value.estimatedContextTokens ?? value.estimated_context_tokens),
    };
    const providerObservedTokens = normalized.providerObservedContextTokens || (normalized.inputTokens || normalized.directInputTokens)
        + normalized.cacheCreationInputTokens
        + normalized.cacheReadInputTokens
        + normalized.outputTokens;
    return providerObservedTokens > 0 ? normalized : null;
}
function providerObservedContextTokens(value) {
    const usage = normalizeSessionProviderUsage(value);
    if (!usage)
        return 0;
    return usage.providerObservedContextTokens || (usage.inputTokens || usage.directInputTokens)
        + usage.cacheCreationInputTokens
        + usage.cacheReadInputTokens
        + usage.outputTokens;
}
function measureSessionContextTokens(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const usage = normalizeSessionProviderUsage(input.latestProviderUsage);
    const expectedProvider = String(input.provider || "");
    const expectedScope = String(input.scope || "");
    const expectedSessionId = String(input.sessionId || "");
    const expectedModel = String(input.model || "");
    const expectedGeneration = Math.max(0, Math.floor(Number(input.generation || 0)));
    const expectedBoundaryGeneration = Math.max(0, Math.floor(Number(input.boundaryGeneration || 0)));
    const payload = input.modelVisiblePayload?.schema === "ccm-model-visible-payload-snapshot-v1" ? input.modelVisiblePayload : null;
    const fixedIdentityValid = !payload || !!usage?.fixedContextChecksum && usage.fixedContextChecksum === payload.fixedContextChecksum;
    const identityValid = !!usage
        && (!expectedScope || usage.scope === expectedScope)
        && (!expectedSessionId || usage.sessionId === expectedSessionId)
        && (!expectedProvider || usage.provider === expectedProvider)
        && (!expectedModel || usage.model === expectedModel)
        && (!expectedGeneration || usage.generation === expectedGeneration)
        && usage.boundaryGeneration === expectedBoundaryGeneration
        && fixedIdentityValid;
    const anchorIndex = identityValid && usage?.anchorMessageId
        ? messages.findIndex(message => messageId(message) === usage.anchorMessageId)
        : -1;
    const snapshotBaselineValid = identityValid
        && Number(usage?.providerObservedContextTokens || 0) > 0
        && Number(usage?.estimatedContextTokens || 0) > 0;
    const baselineValid = identityValid && (anchorIndex >= 0 || snapshotBaselineValid);
    const estimatedSummaryTokens = payload ? payload.tokenBreakdown.summary : input.activeSummary == null ? 0 : (0, context_budget_1.estimateTextTokens)(JSON.stringify(input.activeSummary));
    const estimatedFixedTokens = payload
        ? modelVisibleFixedTokens(payload)
        : input.fixedContext == null ? 0 : (0, context_budget_1.estimateTextTokens)(typeof input.fixedContext === "string" ? input.fixedContext : JSON.stringify(input.fixedContext));
    const estimatedMessageTokens = payload ? payload.tokenBreakdown.recentMessages : messages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0);
    const currentEstimatedPayloadTokens = payload?.totalTokens ?? estimatedSummaryTokens + estimatedFixedTokens + estimatedMessageTokens;
    const estimatedTokensAfterUsage = baselineValid
        ? payload && Number(usage?.estimatedPayloadTokens || 0) > 0
            ? Math.max(0, currentEstimatedPayloadTokens - Number(usage?.estimatedPayloadTokens || 0))
            : anchorIndex >= 0
                ? messages.slice(anchorIndex + 1).reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0)
                : Math.max(0, currentEstimatedPayloadTokens - Number(usage?.estimatedContextTokens || 0))
        : 0;
    const observedTokens = baselineValid ? providerObservedContextTokens(usage) : 0;
    return {
        schema: "ccm-session-context-token-measurement-v2",
        method: baselineValid ? "latest_provider_usage_plus_new_message_estimate" : "model_visible_payload_estimate",
        activeTokens: baselineValid
            ? observedTokens + estimatedTokensAfterUsage
            : currentEstimatedPayloadTokens,
        providerObservedTokens: observedTokens,
        estimatedTokensAfterUsage,
        estimatedSummaryTokens,
        estimatedFixedTokens,
        estimatedMessageTokens,
        baselineValid,
        baselineIssues: baselineValid ? [] : [
            !usage ? "usage_missing" : "",
            usage && !identityValid ? "usage_identity_stale" : "",
            usage && identityValid && anchorIndex < 0 && !snapshotBaselineValid ? "usage_anchor_or_snapshot_missing" : "",
        ].filter(Boolean),
        anchorMessageId: usage?.anchorMessageId || "",
        provider: usage?.provider || expectedProvider,
        model: usage?.model || expectedModel,
        generation: usage?.generation || expectedGeneration,
        boundaryGeneration: expectedBoundaryGeneration,
        modelVisiblePayload: payload,
        payloadChecksum: payload?.payloadChecksum || "",
        fixedContextChecksum: payload?.fixedContextChecksum || "",
        pendingRequestChecksum: payload?.pendingRequestChecksum || "",
    };
}
function buildSessionPostCompactGate(input) {
    const afterTokens = Math.max(0, Math.floor(Number(input.modelVisiblePayload?.totalTokens ?? input.afterTokens ?? 0)));
    const threshold = Math.max(1, Math.floor(Number(input.threshold || 0)));
    const ready = afterTokens < threshold;
    return {
        schema: "ccm-session-post-compact-gate-v2",
        status: ready ? "ready" : "recompact_required",
        providerCallAllowed: ready,
        afterTokens,
        threshold,
        remainingTokens: Math.max(0, threshold - afterTokens),
        payloadChecksum: input.modelVisiblePayload?.payloadChecksum || "",
        fixedContextChecksum: input.modelVisiblePayload?.fixedContextChecksum || "",
        tokenBreakdown: input.modelVisiblePayload?.tokenBreakdown || null,
    };
}
function buildSessionCompactionBoundaryMarker(input) {
    const core = {
        schema: "ccm-session-compact-boundary-v2",
        type: "compact_boundary",
        scope: input.scope,
        sessionId: input.sessionId,
        generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
        previousSummaryChecksum: String(input.previousSummaryChecksum || ""),
        preservedMessageIds: Array.isArray(input.preservedMessageIds) ? input.preservedMessageIds.map(String) : [],
    };
    return { ...core, checksum: checksum(core) };
}
function normalizeSessionCompactionState(value, input) {
    const source = value && typeof value === "object" ? value : {};
    return {
        schema: exports.SESSION_COMPACTION_STATE_SCHEMA,
        scope: input.scope,
        sessionId: input.sessionId,
        activeSummary: source.activeSummary ?? source.active_summary ?? source.summary ?? null,
        activeSummaryChecksum: String(source.activeSummaryChecksum || source.active_summary_checksum || source.summaryChecksum || ""),
        previousSummaryChecksum: String(source.previousSummaryChecksum || source.previous_summary_checksum || ""),
        lastCompactedIndex: Math.floor(Number(source.lastCompactedIndex ?? source.last_compacted_index ?? -1)),
        lastCompactedMessageId: String(source.lastCompactedMessageId || source.last_compacted_message_id || ""),
        preservedRecentMessageIds: Array.isArray(source.preservedRecentMessageIds || source.preserved_recent_message_ids)
            ? [...(source.preservedRecentMessageIds || source.preserved_recent_message_ids)].map(String)
            : [],
        preservedRecentTokens: Math.max(0, Math.floor(Number(source.preservedRecentTokens ?? source.preserved_recent_token_count ?? 0))),
        preservedRecentTextMessageCount: Math.max(0, Math.floor(Number(source.preservedRecentTextMessageCount ?? source.preserved_recent_text_message_count ?? 0))),
        latestProviderUsage: normalizeSessionProviderUsage(source.latestProviderUsage || source.latest_provider_usage),
        tokenMeasurement: source.tokenMeasurement || source.token_measurement || null,
        sessionMemoryState: source.sessionMemoryState || source.session_memory_state || null,
        postCompactGate: source.postCompactGate || source.post_compact_gate || null,
        consecutiveFailures: Math.max(0, Math.floor(Number(source.consecutiveFailures ?? source.consecutive_failures ?? 0))),
        lastFailureAt: String(source.lastFailureAt || source.last_failure_at || ""),
        lastError: String(source.lastError || source.last_error || ""),
        lastCompactedAt: String(source.lastCompactedAt || source.last_compacted_at || source.compacted_at || ""),
        boundaryGeneration: Math.max(0, Math.floor(Number(source.boundaryGeneration ?? source.boundary_generation ?? 0))),
        modelVisiblePayloadChecksum: String(source.modelVisiblePayloadChecksum || source.model_visible_payload_checksum || ""),
        fixedContextChecksum: String(source.fixedContextChecksum || source.fixed_context_checksum || ""),
        pendingRequestChecksum: String(source.pendingRequestChecksum || source.pending_request_checksum || ""),
        sessionMemoryExtraction: source.sessionMemoryExtraction || source.session_memory_extraction || null,
        boundaryMarker: source.boundaryMarker || source.boundary_marker || null,
        preservedSegmentChecksum: String(source.preservedSegmentChecksum || source.preserved_segment_checksum || ""),
        recoveryContextTokens: Math.max(0, Math.floor(Number(source.recoveryContextTokens ?? source.recovery_context_tokens ?? 0))),
        hookResultTokens: Math.max(0, Math.floor(Number(source.hookResultTokens ?? source.hook_result_tokens ?? 0))),
        ptlRecoveryAttempts: Math.max(0, Math.floor(Number(source.ptlRecoveryAttempts ?? source.ptl_recovery_attempts ?? 0))),
    };
}
function sessionCompactionCircuitOpen(state) {
    return Number(state?.consecutiveFailures ?? state?.consecutive_failures ?? 0) >= exports.SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES;
}
function recordSessionCompactionFailure(state, error) {
    const normalized = { ...(state || {}) };
    normalized.consecutiveFailures = Math.min(exports.SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES, Math.max(0, Number(normalized.consecutiveFailures || 0)) + 1);
    normalized.lastFailureAt = new Date().toISOString();
    normalized.lastError = String(error?.message || error || "session_compaction_failed").slice(0, 800);
    return normalized;
}
function resetSessionCompactionFailures(state) {
    return { ...(state || {}), consecutiveFailures: 0, lastFailureAt: "", lastError: "" };
}
function registerSessionCompactionHook(phase, hook) {
    lifecycleHooks[phase].add(hook);
    return () => lifecycleHooks[phase].delete(hook);
}
async function runSessionCompactionHooks(phase, input) {
    const results = [];
    for (const hook of lifecycleHooks[phase])
        results.push(await hook({ ...input, phase }));
    return results.filter(result => result !== undefined && result !== null);
}
//# sourceMappingURL=session-compaction-core.js.map