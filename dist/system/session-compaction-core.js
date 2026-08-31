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
exports.normalizeLoadedContextItems = normalizeLoadedContextItems;
exports.alignLoadedContextItemsToTokenBreakdown = alignLoadedContextItemsToTokenBreakdown;
exports.buildModelVisiblePayloadSnapshot = buildModelVisiblePayloadSnapshot;
exports.modelVisibleFixedTokens = modelVisibleFixedTokens;
exports.isModelVisiblePayloadSnapshot = isModelVisiblePayloadSnapshot;
exports.modelVisiblePayloadAccounting = modelVisiblePayloadAccounting;
exports.lastAssistantTurnHasToolCalls = lastAssistantTurnHasToolCalls;
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
exports.runSessionContextCcMessageBucketSelfTest = runSessionContextCcMessageBucketSelfTest;
const context_budget_1 = require("./context-budget");
const model_token_preflight_1 = require("./model-token-preflight");
const crypto = __importStar(require("crypto"));
const context_engine_observability_1 = require("./context-engine-observability");
const session_context_tool_buckets_1 = require("./session-context-tool-buckets");
const internal_skill_catalog_1 = require("../skills/internal-skill-catalog");
const ccm_context_accounting_v2_1 = require("./ccm-context-accounting-v2");
const global_agent_context_envelope_1 = require("./global-agent-context-envelope");
const main_agent_context_envelope_1 = require("./main-agent-context-envelope");
exports.SESSION_COMPACTION_STATE_SCHEMA = "ccm-session-compaction-state-v2";
exports.SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES = 3;
exports.SESSION_MEMORY_INITIAL_TOKENS = 10_000;
exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS = 5_000;
exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
exports.SESSION_MEMORY_EXTRACTION_WAIT_MS = 15_000;
const MODEL_VISIBLE_FIXED_TOKEN_KEYS = [
    "system",
    "tools",
    "systemTools",
    "rules",
    "skills",
    "mcpTools",
    "subagentDefinitions",
    "memoryAndLoadedContext",
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
function normalizedContextItemName(value) {
    return String(value || "").trim().slice(0, 240);
}
function normalizeContextAliases(value, name) {
    return Array.from(new Set([name, ...(Array.isArray(value) ? value : [])]
        .map(normalizedContextItemName)
        .filter(Boolean))).slice(0, 12);
}
function contextItemOrigin(kind, row, name) {
    if (kind === "system_tool")
        return "system";
    if (kind === "skill") {
        if (row?.origin === "extension")
            return "extension";
        return row?.origin === "system" || row?.systemManaged === true || (0, internal_skill_catalog_1.isCcmInternalSkillName)(name)
            ? "system"
            : "extension";
    }
    if (row?.origin === "extension")
        return "extension";
    const system = row?.origin === "system" || !(0, session_context_tool_buckets_1.isUserMcpToolDefinition)({
        name,
        canonicalName: name,
        server: row?.server,
        source: Array.isArray(row?.aliases) ? row.aliases.join(" ") : row?.source,
    });
    return system ? "system" : "extension";
}
function contextItemImplementation(kind, origin, row, name) {
    const explicit = String(row?.implementation || row?.implementationType || row?.implementation_type || "");
    if (["native", "internal_mcp", "extension_mcp", "skill", "unknown"].includes(explicit))
        return explicit;
    if (kind === "skill")
        return "skill";
    if (origin === "extension")
        return "extension_mcp";
    if (kind === "mcp")
        return "internal_mcp";
    return (0, session_context_tool_buckets_1.isInternalMcpToolDefinition)({
        name,
        canonicalName: name,
        server: row?.server,
        source: Array.isArray(row?.aliases) ? row.aliases.join(" ") : row?.source,
    }) ? "internal_mcp" : "native";
}
function contextItemRank(level) {
    return { available: 0, catalog: 1, schema: 2, body: 3, result: 4 }[level] ?? 0;
}
function dedupeLoadedContextItems(rows) {
    const merged = new Map();
    for (const row of rows) {
        const key = `${row.kind}:${row.origin}:${row.name.toLowerCase()}`;
        const previous = merged.get(key);
        if (!previous) {
            merged.set(key, row);
            continue;
        }
        const preferred = contextItemRank(row.loadLevel) >= contextItemRank(previous.loadLevel) ? row : previous;
        merged.set(key, {
            ...preferred,
            aliases: Array.from(new Set([...previous.aliases, ...row.aliases])).slice(0, 12),
            tokens: Math.max(previous.tokens, row.tokens),
            checksum: preferred.checksum || previous.checksum || row.checksum,
        });
    }
    return [...merged.values()].slice(0, 200);
}
function normalizeLoadedContextItems(value) {
    const normalizeLoaded = (rows, kind) => (Array.isArray(rows) ? rows : [])
        .map((row) => {
        const name = normalizedContextItemName(row?.name);
        if (!name)
            return null;
        const requestedLevel = String(row?.loadLevel || row?.level || "");
        const loadLevel = requestedLevel === "result" ? "result"
            : kind === "skill" ? (requestedLevel === "body" ? "body" : requestedLevel === "available" ? "available" : "catalog")
                : requestedLevel === "schema" ? "schema" : requestedLevel === "available" ? "available" : "catalog";
        const origin = contextItemOrigin(kind, row, name);
        const normalizedKind = kind === "mcp" && origin === "system" ? "system_tool" : kind;
        return {
            kind: normalizedKind,
            origin,
            authorizationMode: origin === "system" ? "automatic" : "scope_authorized",
            implementation: contextItemImplementation(kind, origin, row, name),
            name,
            aliases: normalizeContextAliases(row?.aliases, name),
            loadLevel,
            tokenBucket: loadLevel === "result" ? "conversation"
                : normalizedKind === "system_tool" ? "systemTools"
                    : normalizedKind === "mcp" ? "mcpAndDynamicTools" : "skills",
            checksum: normalizedContextItemName(row?.checksum || row?.contentHash || row?.content_hash),
            loadSource: (["canonical_request", "same_run", "post_compact_restored", "always_load", "catalog"].includes(String(row?.loadSource || row?.load_source))
                ? String(row?.loadSource || row?.load_source)
                : undefined),
            tokens: Math.max(0, Math.floor(Number(row?.tokens || row?.tokenCount || row?.token_count || 0))),
            dropReason: normalizedContextItemName(row?.dropReason || row?.drop_reason),
            contentStored: false,
        };
    })
        .filter(Boolean)
        .slice(0, 200);
    const invocations = (Array.isArray(value?.invocations) ? value.invocations : [])
        .map((row) => {
        const requestedKind = String(row?.kind || "");
        const kind = requestedKind === "skill" ? "skill" : requestedKind === "system_tool" ? "system_tool" : requestedKind === "mcp" ? "mcp" : "";
        const name = normalizedContextItemName(row?.name || row?.itemName);
        if (!kind || !name)
            return null;
        const origin = contextItemOrigin(kind, row, name);
        const normalizedKind = kind === "mcp" && origin === "system" ? "system_tool" : kind;
        return {
            kind: normalizedKind,
            origin,
            authorizationMode: origin === "system" ? "automatic" : "scope_authorized",
            name,
            aliases: normalizeContextAliases(row?.aliases, name),
            ok: row?.ok === true,
            resultChecksum: normalizedContextItemName(row?.resultChecksum || row?.result_checksum || row?.checksum),
            contentStored: false,
        };
    })
        .filter(Boolean)
        .slice(0, 200);
    const legacyMcp = normalizeLoaded(value?.mcp, "mcp");
    const explicitSystemTools = normalizeLoaded(value?.systemTools || value?.system_tools, "system_tool");
    return {
        schema: "ccm-loaded-context-items-v2",
        systemTools: dedupeLoadedContextItems([...explicitSystemTools, ...legacyMcp.filter(item => item.origin === "system")]),
        skills: dedupeLoadedContextItems(normalizeLoaded(value?.skills, "skill")),
        mcp: dedupeLoadedContextItems(legacyMcp.filter(item => item.origin === "extension")),
        invocations,
    };
}
function canonicalToolEvidence(value, tokenEstimator) {
    const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    const systemTools = [];
    const mcp = [];
    for (const item of items) {
        if (!item || typeof item !== "object")
            continue;
        const name = normalizedContextItemName(item?.name || item?.function?.name || item?.id);
        if (!name)
            continue;
        const identity = JSON.stringify({ name, type: item?.type || "", source: item?.source || "" });
        if (/subagent|task[_-]?agent|worker[_-]?agent/i.test(identity))
            continue;
        const row = {
            name,
            aliases: [name],
            loadLevel: "schema",
            checksum: checksum({
                name,
                description: item?.description || item?.function?.description || "",
                inputSchema: item?.inputSchema || item?.parameters || item?.function?.parameters || null,
            }),
            loadSource: "canonical_request",
            tokens: tokenEstimator(item),
        };
        if ((0, session_context_tool_buckets_1.isUserMcpToolDefinition)(item))
            mcp.push({ ...row, origin: "extension", implementation: "extension_mcp" });
        else
            systemTools.push({ ...row, origin: "system", implementation: (0, session_context_tool_buckets_1.isInternalMcpToolDefinition)(item) ? "internal_mcp" : "native" });
    }
    return { systemTools, mcp };
}
function mergeCanonicalLoadedContextItems(explicit, tools) {
    const canonical = normalizeLoadedContextItems({ schema: "ccm-loaded-context-items-v2", systemTools: tools.systemTools, mcp: tools.mcp });
    return {
        schema: "ccm-loaded-context-items-v2",
        systemTools: dedupeLoadedContextItems([...explicit.systemTools, ...canonical.systemTools]),
        skills: explicit.skills,
        mcp: dedupeLoadedContextItems([...explicit.mcp, ...canonical.mcp]),
        invocations: explicit.invocations,
    };
}
function alignEvidenceTokens(rows, bucketTokens) {
    const target = Math.max(0, Math.floor(Number(bucketTokens || 0)));
    const eligible = rows.filter(row => row.loadLevel !== "available" && row.loadLevel !== "result");
    if (!eligible.length || target <= 0)
        return rows.map(row => ({ ...row, tokens: 0 }));
    const rawTotal = eligible.reduce((sum, row) => sum + Math.max(0, Number(row.tokens || 0)), 0);
    const weights = eligible.map(row => ({ row, weight: rawTotal > 0 ? Math.max(0, Number(row.tokens || 0)) : 1 }));
    const weightTotal = weights.reduce((sum, item) => sum + item.weight, 0) || weights.length;
    let used = 0;
    const allocated = new Map();
    weights.forEach((item, index) => {
        const tokens = index === weights.length - 1 ? target - used : Math.floor((item.weight / weightTotal) * target);
        allocated.set(item.row, Math.max(0, tokens));
        used += Math.max(0, tokens);
    });
    return rows.map(row => ({ ...row, tokens: allocated.get(row) ?? 0 }));
}
function alignLoadedContextItemsToTokenBreakdown(value, breakdown) {
    const normalized = normalizeLoadedContextItems(value);
    return {
        ...normalized,
        systemTools: alignEvidenceTokens(normalized.systemTools, breakdown?.systemTools ?? breakdown?.system_tools ?? 0),
        skills: alignEvidenceTokens(normalized.skills, breakdown?.skills ?? 0),
        mcp: alignEvidenceTokens(normalized.mcp, breakdown?.mcpAndDynamicTools ?? breakdown?.mcpTools ?? breakdown?.mcp ?? 0),
    };
}
function contextComponentKey(key) {
    const value = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (/skill/.test(value))
        return "skills";
    if (/mcp|dynamictool/.test(value))
        return "mcpTools";
    if (/subagent|agentdefinition|agentcatalog|projectdirectory|groupmember|members/.test(value))
        return "subagentDefinitions";
    if (/memory|rag|retriev|sharedfile|loadedcontext|sourceevidence|projectcontext|taskcontext|knowledge/.test(value))
        return "memoryAndLoadedContext";
    if (/rule|policy|instruction|constraint|permission|authorization|boundary/.test(value))
        return "rules";
    return "";
}
function structuredContextHints(value) {
    const result = {};
    const visit = (current) => {
        if (!current || typeof current !== "object")
            return;
        if (Array.isArray(current)) {
            for (const item of current)
                visit(item);
            return;
        }
        for (const [key, entry] of Object.entries(current)) {
            const component = contextComponentKey(key);
            if (component)
                result[component] = (result[component] || 0) + valueTokens({ [key]: entry });
            else
                visit(entry);
        }
    };
    visit(value);
    return result;
}
function userMcpHintTokens(value) {
    if (value == null || value === "")
        return 0;
    const selected = (0, session_context_tool_buckets_1.selectUserMcpToolDefinitions)(value);
    if (selected.length)
        return valueTokens(selected);
    if (Array.isArray(value) || (value && typeof value === "object"))
        return 0;
    return 0;
}
function toolContextHints(value) {
    const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    let mcpTools = 0;
    let subagentDefinitions = 0;
    for (const item of items) {
        const identity = JSON.stringify({ name: item?.name || item?.function?.name || item?.id || "", type: item?.type || "", source: item?.source || "" });
        const tokens = valueTokens(item);
        if (/subagent|task[_-]?agent|worker[_-]?agent/i.test(identity))
            subagentDefinitions += tokens;
        else if ((0, session_context_tool_buckets_1.isUserMcpToolDefinition)(item))
            mcpTools += tokens;
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
    const suppliedRecentMessages = Array.isArray(input.recentMessages) ? input.recentMessages : [];
    const lastRecentMessage = suppliedRecentMessages.at(-1);
    const lastRecentBlocks = Array.isArray(lastRecentMessage?.content) ? lastRecentMessage.content : [];
    const inferredCurrentRequestIndex = input.currentRequest === undefined
        && String(lastRecentMessage?.role || lastRecentMessage?.message?.role || "") === "user"
        && !lastRecentBlocks.some((block) => ["tool_result", "function_result", "web_search_tool_result"].includes(String(block?.type || "")))
        ? suppliedRecentMessages.length - 1
        : -1;
    const currentRequest = input.currentRequest === undefined && inferredCurrentRequestIndex >= 0
        ? suppliedRecentMessages[inferredCurrentRequestIndex]
        : input.currentRequest;
    const recentMessages = inferredCurrentRequestIndex >= 0
        ? suppliedRecentMessages.filter((_, index) => index !== inferredCurrentRequestIndex)
        : suppliedRecentMessages;
    const hookResults = Array.isArray(input.hookResults) ? input.hookResults : [];
    const fixedContext = { system: input.system ?? null, tools: input.tools ?? null, recoveryContext: input.recoveryContext ?? null, hookResults };
    const modelConfig = input.modelConfig || { provider: input.provider, model: input.model, format: input.protocol };
    const modelValueTokens = (value) => {
        if (value == null || value === "" || (Array.isArray(value) && value.length === 0))
            return 0;
        try {
            return (0, model_token_preflight_1.estimateModelTextTokens)(value, { ...modelConfig, applyAbsoluteDriftGuard: false }).safetyAdjustedTokens;
        }
        catch {
            return valueTokens(value);
        }
    };
    const rawSystemTokens = modelValueTokens(input.system);
    const rawToolTokens = modelValueTokens(input.tools);
    const structuredHints = structuredContextHints(input.system);
    const toolHints = toolContextHints(input.tools);
    const explicit = input.contextComponents || {};
    let loadedContextItems = mergeCanonicalLoadedContextItems(normalizeLoadedContextItems(explicit.loadedContextItems), canonicalToolEvidence(input.tools, modelValueTokens));
    const scopeInstructionResultTokens = [...loadedContextItems.systemTools, ...loadedContextItems.mcp]
        .filter(item => item.loadLevel === "result" && (item.name === "read_scope_instruction" || item.aliases.includes("read_scope_instruction")))
        .reduce((sum, item) => sum + Math.max(0, Number(item.tokens || 0)), 0);
    const toolMcpTokens = toolHints.mcpTools;
    const toolSubagentTokens = toolHints.subagentDefinitions;
    const toolPartition = partitionTokens(rawToolTokens, { mcpTools: toolMcpTokens, subagentDefinitions: toolSubagentTokens });
    const rawRecentMessageTokens = recentMessages.reduce((sum, message) => sum + modelValueTokens(messageContent(message)), 0);
    const scopeInstructionMessagePayloads = recentMessages
        .map(messageContent)
        .filter(content => {
        try {
            return JSON.stringify(content).includes("ccm-scope-instruction-read-result-v1");
        }
        catch {
            return false;
        }
    });
    const inferredScopeInstructionMessageTokens = scopeInstructionMessagePayloads.length
        ? modelValueTokens(scopeInstructionMessagePayloads)
        : scopeInstructionResultTokens;
    const recentPartition = partitionTokens(rawRecentMessageTokens, {
        rules: explicit.messageRules === undefined ? 0 : modelValueTokens(explicit.messageRules),
        skills: explicit.messageSkills === undefined ? 0 : modelValueTokens(explicit.messageSkills),
        systemTools: explicit.messageSystemTools === undefined ? 0 : modelValueTokens(explicit.messageSystemTools),
        mcpTools: explicit.messageMcpTools === undefined ? 0 : userMcpHintTokens(explicit.messageMcpTools),
        subagentDefinitions: explicit.messageSubagentDefinitions === undefined ? 0 : modelValueTokens(explicit.messageSubagentDefinitions),
        memoryAndLoadedContext: explicit.messageMemoryAndLoadedContext === undefined ? inferredScopeInstructionMessageTokens : modelValueTokens(explicit.messageMemoryAndLoadedContext),
    });
    const systemPartition = partitionTokens(rawSystemTokens, {
        rules: explicit.rules === undefined ? structuredHints.rules || 0 : modelValueTokens(explicit.rules),
        skills: explicit.skills === undefined ? structuredHints.skills || 0 : modelValueTokens(explicit.skills),
        systemTools: explicit.systemTools === undefined ? structuredHints.systemTools || 0 : modelValueTokens(explicit.systemTools),
        mcpTools: rawToolTokens > 0 ? 0 : explicit.mcpTools === undefined ? structuredHints.mcpTools || 0 : userMcpHintTokens(explicit.mcpTools),
        subagentDefinitions: explicit.subagentDefinitions === undefined ? structuredHints.subagentDefinitions || 0 : modelValueTokens(explicit.subagentDefinitions),
        memoryAndLoadedContext: explicit.memoryAndLoadedContext === undefined ? structuredHints.memoryAndLoadedContext || 0 : modelValueTokens(explicit.memoryAndLoadedContext),
    });
    const tokenBreakdown = {
        system: systemPartition.remaining,
        // Built-in/provider tool definitions are distinct from MCP/dynamic
        // definitions. Keeping both categories avoids reporting the whole tool
        // catalog as System prompt while preserving an exact primary total.
        tools: 0,
        systemTools: toolPartition.remaining,
        rules: Number(systemPartition.allocated.rules || 0) + Number(recentPartition.allocated.rules || 0),
        skills: Number(systemPartition.allocated.skills || 0) + Number(recentPartition.allocated.skills || 0),
        mcpTools: Number(systemPartition.allocated.mcpTools || 0) + Number(toolPartition.allocated.mcpTools || 0) + Number(recentPartition.allocated.mcpTools || 0),
        // Tool results are part of the model-visible conversation timeline. Keep
        // the legacy field at zero so the same tokens cannot be counted a second
        // time as a separate MCP result bucket.
        mcpResults: 0,
        subagentDefinitions: Number(systemPartition.allocated.subagentDefinitions || 0) + Number(toolPartition.allocated.subagentDefinitions || 0) + Number(recentPartition.allocated.subagentDefinitions || 0),
        memoryAndLoadedContext: Number(systemPartition.allocated.memoryAndLoadedContext || 0) + Number(recentPartition.allocated.memoryAndLoadedContext || 0),
        summary: modelValueTokens(input.activeSummary),
        recentMessages: recentPartition.remaining + Number(recentPartition.allocated.mcpResults || 0),
        currentRequest: modelValueTokens(currentRequest),
        recoveryContext: modelValueTokens(input.recoveryContext),
        hookResults: modelValueTokens(hookResults),
    };
    loadedContextItems = alignLoadedContextItemsToTokenBreakdown(loadedContextItems, tokenBreakdown);
    const primaryTokenBreakdown = (0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)({
        ...tokenBreakdown,
    });
    const technicalTokenBreakdown = (0, ccm_context_accounting_v2_1.normalizeCcmTechnicalTokenBreakdown)(tokenBreakdown);
    const payload = {
        system: input.system ?? null,
        tools: input.tools ?? null,
        activeSummary: input.activeSummary ?? null,
        recentMessages,
        currentRequest: currentRequest ?? null,
        recoveryContext: input.recoveryContext ?? null,
        hookResults,
    };
    const messages = [
        ...(Array.isArray(input.system) ? input.system : input.system == null ? [] : [{ role: "system", content: input.system }]),
        ...(input.activeSummary == null ? [] : [{ role: "system", content: input.activeSummary, ccm_summary: true }]),
        ...recentMessages,
        ...(currentRequest == null ? [] : [currentRequest]),
    ];
    const totalTokens = Object.values(tokenBreakdown).reduce((sum, value) => sum + value, 0);
    const globalContextEnvelope = input.scope === "global"
        ? (0, global_agent_context_envelope_1.alignGlobalAgentContextEnvelopeTokens)(input.globalContextEnvelope, totalTokens)
        : undefined;
    const mainAgentContextEnvelope = (0, main_agent_context_envelope_1.alignMainAgentContextEnvelopeTokens)(input.mainAgentContextEnvelope, totalTokens);
    return {
        schema: "ccm-model-visible-payload-snapshot-v2",
        scope: input.scope,
        sessionId: input.sessionId,
        exactSessionId: input.exactSessionId || input.sessionId,
        provider: String(input.provider || modelConfig.provider || ""),
        model: String(input.model || modelConfig.model || ""),
        protocol: String(input.protocol || modelConfig.protocol || modelConfig.format || ""),
        ...payload,
        messages,
        tokenBreakdown,
        accountingSchema: "ccm-context-accounting-v2",
        primaryTokenBreakdown,
        technicalTokenBreakdown,
        primaryTokenTotal: (0, ccm_context_accounting_v2_1.sumCcmPrimaryTokenBreakdown)(primaryTokenBreakdown),
        totalTokens,
        predictedNextRequestTokens: totalTokens,
        unresolvedToolPairCount: unresolvedToolPairCount(messages),
        payloadChecksum: checksum(payload),
        fixedContextChecksum: checksum(fixedContext),
        pendingRequestChecksum: currentRequest == null ? "" : checksum(currentRequest),
        loadedContextItems,
        loadedContextItemsChecksum: checksum(loadedContextItems),
        ...(globalContextEnvelope ? { globalContextEnvelope } : {}),
        ...(mainAgentContextEnvelope ? { mainAgentContextEnvelope } : {}),
        ...(input.mainAgentCapabilityDirectory ? { mainAgentCapabilityDirectory: input.mainAgentCapabilityDirectory } : {}),
    };
}
function modelVisibleFixedTokens(snapshot) {
    const breakdown = snapshot?.tokenBreakdown || {};
    return MODEL_VISIBLE_FIXED_TOKEN_KEYS.reduce((sum, key) => sum + Math.max(0, Math.floor(Number(breakdown[key] || 0))), 0);
}
function isModelVisiblePayloadSnapshot(value) {
    return value?.schema === "ccm-model-visible-payload-snapshot-v2";
}
function modelVisiblePayloadAccounting(snapshot) {
    if (!snapshot)
        return null;
    return {
        schema: "ccm-model-visible-payload-accounting-v2",
        scope: snapshot.scope,
        sessionId: snapshot.sessionId,
        exactSessionId: snapshot.exactSessionId || snapshot.sessionId,
        provider: snapshot.provider || "",
        model: snapshot.model || "",
        protocol: snapshot.protocol || "",
        messages: Array.isArray(snapshot.messages) ? snapshot.messages.map((item) => ({ role: item?.role, type: item?.type, id: item?.id })) : [],
        tokenBreakdown: { ...snapshot.tokenBreakdown },
        accountingSchema: "ccm-context-accounting-v2",
        primaryTokenBreakdown: (0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(snapshot.primaryTokenBreakdown || snapshot.tokenBreakdown),
        technicalTokenBreakdown: (0, ccm_context_accounting_v2_1.normalizeCcmTechnicalTokenBreakdown)(snapshot.technicalTokenBreakdown || snapshot.tokenBreakdown),
        primaryTokenTotal: Number(snapshot.primaryTokenTotal || (0, ccm_context_accounting_v2_1.sumCcmPrimaryTokenBreakdown)((0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(snapshot.primaryTokenBreakdown || snapshot.tokenBreakdown))),
        totalTokens: snapshot.totalTokens,
        predictedNextRequestTokens: snapshot.predictedNextRequestTokens || snapshot.totalTokens,
        unresolvedToolPairCount: Number(snapshot.unresolvedToolPairCount || 0),
        payloadChecksum: snapshot.payloadChecksum,
        fixedContextChecksum: snapshot.fixedContextChecksum,
        pendingRequestChecksum: snapshot.pendingRequestChecksum,
        loadedContextItems: normalizeLoadedContextItems(snapshot.loadedContextItems),
        loadedContextItemsChecksum: snapshot.loadedContextItemsChecksum || checksum(normalizeLoadedContextItems(snapshot.loadedContextItems)),
        ...(snapshot.globalContextEnvelope ? { globalContextEnvelope: (0, global_agent_context_envelope_1.alignGlobalAgentContextEnvelopeTokens)(snapshot.globalContextEnvelope, snapshot.totalTokens) } : {}),
        ...(snapshot.mainAgentContextEnvelope ? { mainAgentContextEnvelope: (0, main_agent_context_envelope_1.alignMainAgentContextEnvelopeTokens)(snapshot.mainAgentContextEnvelope, snapshot.totalTokens) } : {}),
        ...(snapshot.mainAgentCapabilityDirectory ? { mainAgentCapabilityDirectory: snapshot.mainAgentCapabilityDirectory } : {}),
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
function lastAssistantTurnHasToolCalls(messagesInput) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const lastAssistant = [...messages].reverse().find(message => String(message?.role || message?.type || "").toLowerCase() === "assistant");
    return !!lastAssistant && messageToolCallCount(lastAssistant) > 0;
}
function unresolvedToolPairCount(messages) {
    const uses = new Set();
    const results = new Set();
    for (const message of Array.isArray(messages) ? messages : []) {
        const blocks = Array.isArray(message?.content) ? message.content : [];
        for (const block of blocks) {
            const type = String(block?.type || "");
            const id = String(block?.id || block?.tool_use_id || block?.toolUseId || "");
            if (!id)
                continue;
            if (["tool_use", "tool_call", "function_call", "server_tool_use"].includes(type))
                uses.add(id);
            if (["tool_result", "function_result", "web_search_tool_result"].includes(type))
                results.add(id);
        }
        if (["tool_use", "tool_call", "function_call"].includes(String(message?.type || "")))
            uses.add(String(message?.toolCallId || message?.tool_call_id || message?.id || ""));
        if (["tool_result", "function_result"].includes(String(message?.type || "")))
            results.add(String(message?.toolCallId || message?.tool_call_id || message?.tool_use_id || message?.id || ""));
    }
    return [...uses].filter(id => id && !results.has(id)).length;
}
function evaluateSessionMemoryCadence(messagesInput, stateInput = {}, options = {}) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const state = stateInput && typeof stateInput === "object" ? stateInput : {};
    const tokenBasis = options?.tokenBasis?.schema === "ccm-session-memory-token-basis-v1" ? options.tokenBasis : null;
    const requireCanonicalTokenBasis = options?.requireCanonicalTokenBasis === true;
    const totalTokens = tokenBasis
        ? Math.max(0, Math.floor(Number(tokenBasis.tokens || 0)))
        : requireCanonicalTokenBasis ? 0 : messages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0);
    const lastMessageId = String(state.lastExtractedMessageId || state.last_extracted_message_id || "");
    const cursorIndex = lastMessageId ? messages.findIndex(message => messageId(message) === lastMessageId) : -1;
    const hasPriorSummary = !!(state.summary || state.activeSummary || state.markdown);
    const cursorValid = !hasPriorSummary || (!!lastMessageId && cursorIndex >= 0);
    const priorTokens = Math.max(0, Math.floor(Number(state.tokensAtLastExtraction ?? state.tokens_at_last_extraction ?? 0)));
    const growthTokens = Math.max(0, totalTokens - priorTokens);
    const messagesSinceCursor = cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
    const toolCallsSinceLastExtraction = messagesSinceCursor.reduce((sum, message) => sum + messageToolCallCount(message), 0);
    const naturalBreak = state.naturalBreak === true || state.natural_break === true || !lastAssistantTurnHasToolCalls(messages);
    const growthReady = growthTokens >= exports.SESSION_MEMORY_UPDATE_GROWTH_TOKENS;
    const turnReady = toolCallsSinceLastExtraction >= exports.SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES || naturalBreak;
    const canonicalReady = !requireCanonicalTokenBasis || !!tokenBasis;
    const shouldExtract = canonicalReady && (!hasPriorSummary
        ? totalTokens >= exports.SESSION_MEMORY_INITIAL_TOKENS
        : cursorValid && growthReady && turnReady);
    return {
        schema: "ccm-session-memory-cadence-v2",
        shouldExtract,
        reason: !canonicalReady ? "canonical_payload_unavailable"
            : !cursorValid ? "cursor_mismatch"
                : !hasPriorSummary && totalTokens < exports.SESSION_MEMORY_INITIAL_TOKENS ? "waiting_initial_10k"
                    : hasPriorSummary && !growthReady ? "waiting_5k_growth"
                        : hasPriorSummary && !turnReady ? "waiting_3_tool_calls_or_natural_break"
                            : hasPriorSummary ? "update_due" : "initial_due",
        totalTokens,
        priorTokens,
        growthTokens,
        toolCallsSinceLastExtraction,
        naturalBreak,
        growthReady,
        turnReady,
        cursorIndex,
        cursorValid,
        sourceLastMessageId: messageId(messages.at(-1)),
        sourceMessageIds: messages.map(messageId),
        tokenBasis,
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
        protocol: String(value.protocol || value.format || usage.protocol || usage.format || ""),
        endpoint: String(value.endpoint || value.apiUrl || value.api_url || usage.endpoint || ""),
        providerIdentityChecksum: String(value.providerIdentityChecksum || value.provider_identity_checksum || usage.providerIdentityChecksum || usage.provider_identity_checksum || ""),
        generation: Math.max(0, Math.floor(Number(value.generation ?? usage.generation ?? 0))),
        anchorMessageId: String(value.anchorMessageId || value.anchor_message_id || ""),
        boundaryGeneration: Math.max(0, Math.floor(Number(value.boundaryGeneration ?? value.boundary_generation ?? 0))),
        inputTokens: finiteToken(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens),
        outputTokens: finiteToken(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens),
        directInputTokens: finiteToken(usage.directInputTokens ?? usage.direct_input_tokens),
        cacheCreationInputTokens: finiteToken(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens),
        cacheReadInputTokens: finiteToken(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens),
        inputTokensIncludesCache: usage.inputTokensIncludesCache === true || usage.input_tokens_includes_cache === true,
        recordedAt: String(value.recordedAt || value.recorded_at || new Date().toISOString()),
        estimatedContextTokens: finiteToken(value.estimatedContextTokens ?? value.estimated_context_tokens),
        providerObservedContextTokens: finiteToken(value.providerObservedContextTokens ?? value.provider_observed_context_tokens),
        payloadChecksum: String(value.payloadChecksum || value.payload_checksum || ""),
        fixedContextChecksum: String(value.fixedContextChecksum || value.fixed_context_checksum || ""),
        estimatedFixedTokens: finiteToken(value.estimatedFixedTokens ?? value.estimated_fixed_tokens),
        estimatedPayloadTokens: finiteToken(value.estimatedPayloadTokens ?? value.estimated_payload_tokens ?? value.estimatedContextTokens ?? value.estimated_context_tokens),
    };
    // Input usage is the context-window measurement. Output tokens are tracked
    // separately for cost/output reporting and must never inflate active input
    // context. Providers that expose split cache fields default to an input
    // value excluding those fields; adapters may explicitly mark aggregate
    // input_tokens as already including cache to avoid double counting.
    const baseInputTokens = normalized.inputTokens || normalized.directInputTokens;
    const cacheTokens = normalized.inputTokensIncludesCache ? 0 : normalized.cacheCreationInputTokens + normalized.cacheReadInputTokens;
    const providerObservedTokens = normalized.providerObservedContextTokens || baseInputTokens + cacheTokens;
    normalized.providerObservedContextTokens = providerObservedTokens;
    if (!normalized.providerIdentityChecksum && (normalized.provider || normalized.model || normalized.protocol || normalized.endpoint)) {
        normalized.providerIdentityChecksum = (0, ccm_context_accounting_v2_1.buildCcmProviderIdentityChecksum)(normalized);
    }
    return providerObservedTokens > 0 ? normalized : null;
}
function providerObservedContextTokens(value) {
    const usage = normalizeSessionProviderUsage(value);
    if (!usage)
        return 0;
    const baseInputTokens = usage.inputTokens || usage.directInputTokens;
    const cacheTokens = usage.inputTokensIncludesCache ? 0 : usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
    return usage.providerObservedContextTokens || baseInputTokens + cacheTokens;
}
function measureSessionContextTokens(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const usage = normalizeSessionProviderUsage(input.latestProviderUsage);
    const expectedProvider = String(input.provider || "");
    const expectedScope = String(input.scope || "");
    const expectedSessionId = String(input.sessionId || "");
    const expectedModel = String(input.model || "");
    const expectedProtocol = String(input.protocol || "");
    const expectedEndpoint = String(input.endpoint || "");
    const expectedGeneration = Math.max(0, Math.floor(Number(input.generation || 0)));
    const expectedBoundaryGeneration = Math.max(0, Math.floor(Number(input.boundaryGeneration || 0)));
    const payload = isModelVisiblePayloadSnapshot(input.modelVisiblePayload) ? input.modelVisiblePayload : null;
    const fixedIdentityValid = !payload || !!usage?.fixedContextChecksum && usage.fixedContextChecksum === payload.fixedContextChecksum;
    const identityValid = !!usage
        && (!expectedScope || usage.scope === expectedScope)
        && (!expectedSessionId || usage.sessionId === expectedSessionId)
        && (!expectedProvider || usage.provider === expectedProvider)
        && (!expectedModel || usage.model === expectedModel)
        && (!expectedProtocol || usage.protocol === expectedProtocol)
        && (!expectedEndpoint || usage.endpoint === expectedEndpoint)
        && (!expectedGeneration || usage.generation === expectedGeneration)
        && usage.boundaryGeneration === expectedBoundaryGeneration
        && fixedIdentityValid;
    const anchorIndex = identityValid && usage?.anchorMessageId
        ? messages.findIndex(message => messageId(message) === usage.anchorMessageId)
        : -1;
    const snapshotBaselineValid = identityValid
        && providerObservedContextTokens(usage) > 0
        && (Number(usage?.estimatedContextTokens || 0) > 0 || (!!payload && usage?.payloadChecksum === payload.payloadChecksum));
    const baselineValid = identityValid && (anchorIndex >= 0 || snapshotBaselineValid);
    const payloadExact = baselineValid && !!payload && !!usage?.payloadChecksum && usage.payloadChecksum === payload.payloadChecksum;
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
        schema: "ccm-context-measurement-v2",
        accountingSchema: "ccm-context-accounting-v2",
        source: baselineValid ? "provider_reported" : payload ? "model_visible_estimate" : "unavailable",
        method: payloadExact ? "exact_payload_usage" : baselineValid ? "latest_provider_usage_plus_new_message_estimate" : "model_visible_payload_estimate",
        activeTokens: baselineValid
            ? observedTokens + estimatedTokensAfterUsage
            : currentEstimatedPayloadTokens,
        providerObservedTokens: observedTokens,
        currentInputTokens: observedTokens,
        outputTokens: Number(usage?.outputTokens || 0),
        precision: payloadExact ? "exact" : baselineValid ? "estimated" : payload ? "estimated" : "unavailable",
        measurementBasis: payloadExact ? "exact_payload_usage" : baselineValid ? "provider_usage_anchor_plus_delta" : payload ? "local_payload_prediction" : "unavailable",
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
        estimatedNewInputTokens: estimatedTokensAfterUsage,
        lastProviderObservedTokens: observedTokens,
        predictedNextRequestTokens: currentEstimatedPayloadTokens,
        providerIdentityChecksum: usage?.providerIdentityChecksum || (0, ccm_context_accounting_v2_1.buildCcmProviderIdentityChecksum)({ provider: usage?.provider || expectedProvider, model: usage?.model || expectedModel, protocol: usage?.protocol || expectedProtocol, endpoint: usage?.endpoint || expectedEndpoint }),
        totalModelVisibleTokens: baselineValid
            ? observedTokens + estimatedTokensAfterUsage
            : currentEstimatedPayloadTokens,
        updatedAt: new Date().toISOString(),
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
        dynamicContextRestoreManifest: input.dynamicContextRestoreManifest || null,
        dynamicContextRestoreChecksum: String(input.dynamicContextRestoreManifest?.checksum || ""),
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
        dynamicContextRestoreManifest: source.dynamicContextRestoreManifest || source.dynamic_context_restore_manifest || source.boundaryMarker?.dynamicContextRestoreManifest || source.boundary_marker?.dynamicContextRestoreManifest || null,
        dynamicContextRestoreReceipt: source.dynamicContextRestoreReceipt || source.dynamic_context_restore_receipt || null,
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
    (0, context_engine_observability_1.recordContextEngineEvent)({
        kind: "compaction_failure",
        scope: normalized.scope || "other",
        scopeId: normalized.scopeId || normalized.project || normalized.groupId || normalized.sessionId || "",
        sessionId: normalized.sessionId || "",
        status: "failed",
        consecutiveFailures: normalized.consecutiveFailures,
        reasonCode: error?.code || normalized.lastError,
    });
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
    for (const hook of lifecycleHooks[phase]) {
        const startedAt = Date.now();
        try {
            results.push(await hook({ ...input, phase }));
        }
        catch (error) {
            results.push({
                schema: "ccm-session-compaction-hook-result-v1",
                phase,
                scope: String(input?.scope || ""),
                sessionId: String(input?.sessionId || ""),
                status: "warning",
                reason: String(error?.message || error || "hook_failed").slice(0, 240),
                durationMs: Date.now() - startedAt,
                contentStored: false,
            });
        }
    }
    if (phase === "post_compact") {
        const result = input?.result || {};
        const quality = result.summaryQuality || result.summary_quality || result.modelMetadata?.summaryQuality || null;
        (0, context_engine_observability_1.recordContextEngineEvent)({
            kind: "compaction_success",
            scope: input?.scope || "other",
            scopeId: input?.scopeId || input?.project || input?.groupId || input?.sessionId || "",
            sessionId: input?.sessionId || "",
            status: "completed",
            beforeTokens: result.before_tokens ?? result.beforeTokens,
            afterTokens: result.after_tokens ?? result.afterTokens,
            summaryQualityScore: quality?.score,
        });
    }
    return results.filter(result => result !== undefined && result !== null);
}
function runSessionContextCcMessageBucketSelfTest() {
    const identity = (0, session_context_tool_buckets_1.runSessionContextToolBucketSelfTest)();
    const readFilesBody = `${"README.md\n".repeat(40)}${"x".repeat(24_000)}`;
    const inspectBody = `${"inspect_system\n".repeat(20)}${"y".repeat(18_000)}`;
    const workspace = { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read a workspace file" };
    const userMcp = { name: "search_records", canonicalName: "mcp__ccm__docs__search_records", server: "docs", description: "search approved records", inputSchema: { type: "object", properties: { query: { type: "string" } } } };
    const project = buildModelVisiblePayloadSnapshot({
        scope: "project",
        sessionId: "cc-connect-test:s1",
        tools: [workspace, userMcp],
        recentMessages: [
            { role: "user", content: "read the project readme" },
            { role: "tool", name: "read_files", content: readFilesBody },
        ],
        contextComponents: {
            mcpTools: [workspace, userMcp],
            mcpResults: readFilesBody,
        },
    });
    const global = buildModelVisiblePayloadSnapshot({
        scope: "global",
        sessionId: "session:global-inspect",
        tools: [{ name: "inspect_system", description: "inspect CCM" }, { name: "read_file", description: "read a file" }],
        recentMessages: [
            { role: "user", content: "inspect the system" },
            { role: "tool", name: "inspect_system", content: inspectBody },
        ],
        contextComponents: {
            mcpTools: [
                { name: "inspect_system" },
                { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly" },
                userMcp,
            ],
        },
    });
    const checks = {
        ...identity.checks,
        identityPass: identity.pass === true,
        projectResultsStayInConversation: project.tokenBreakdown.recentMessages > project.tokenBreakdown.mcpTools
            && project.tokenBreakdown.recentMessages > 1_000
            && Number(project.tokenBreakdown.mcpResults || 0) === 0,
        projectMcpIsUserSchemaOnly: project.tokenBreakdown.mcpTools > 0
            && project.tokenBreakdown.systemTools > 0
            && project.tokenBreakdown.mcpTools < 400
            && project.tokenBreakdown.mcpTools < project.tokenBreakdown.recentMessages,
        projectIgnoresMcpResultsHint: Number(project.tokenBreakdown.mcpResults || 0) === 0,
        globalObservationsStayInConversation: global.tokenBreakdown.recentMessages > 1_000
            && Number(global.tokenBreakdown.mcpResults || 0) === 0,
        globalManagementToolsStayInDefinitions: global.tokenBreakdown.systemTools > 0
            && global.tokenBreakdown.mcpTools === 0,
    };
    return { pass: Object.values(checks).every(Boolean), checks, project: project.tokenBreakdown, global: global.tokenBreakdown };
}
//# sourceMappingURL=session-compaction-core.js.map