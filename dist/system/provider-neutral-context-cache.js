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
exports.classifyProviderCacheRequestClass = classifyProviderCacheRequestClass;
exports.verifyProviderNeutralContextCachePlan = verifyProviderNeutralContextCachePlan;
exports.prepareProviderNeutralContextCacheRequest = prepareProviderNeutralContextCacheRequest;
exports.prepareProviderNeutralContextCacheRequestSingleflight = prepareProviderNeutralContextCacheRequestSingleflight;
exports.completeProviderNeutralContextCacheRequest = completeProviderNeutralContextCacheRequest;
exports.readProviderNeutralContextCacheRuntimeStatus = readProviderNeutralContextCacheRuntimeStatus;
exports.clearProviderNeutralContextHotCache = clearProviderNeutralContextHotCache;
exports.invalidateProviderNeutralContextCacheState = invalidateProviderNeutralContextCacheState;
exports.runProviderNeutralContextCacheMaintenance = runProviderNeutralContextCacheMaintenance;
exports.readLatestProviderNeutralContextCacheState = readLatestProviderNeutralContextCacheState;
exports.readContextEngineV2Status = readContextEngineV2Status;
exports.providerNeutralContextCacheCapability = providerNeutralContextCacheCapability;
exports.runProviderNeutralContextCacheSelfTest = runProviderNeutralContextCacheSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const provider_context_cache_adapters_1 = require("./provider-context-cache-adapters");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const model_token_preflight_1 = require("./model-token-preflight");
const context_engine_observability_1 = require("./context-engine-observability");
const provider_cache_diagnostics_1 = require("./provider-cache-diagnostics");
const provider_cache_scope_metrics_1 = require("./provider-cache-scope-metrics");
const automatic_provider_cache_optimization_1 = require("./automatic-provider-cache-optimization");
const agent_cache_affinity_1 = require("./agent-cache-affinity");
const provider_cache_prompt_segments_1 = require("./provider-cache-prompt-segments");
const CACHE_DIR = path.join(os.homedir(), ".ccm", "provider-context-cache");
const LEDGER_FILE = path.join(CACHE_DIR, "receipts.jsonl");
const MAINTENANCE_LEDGER_FILE = path.join(CACHE_DIR, "maintenance.jsonl");
const MAX_LEDGER_BYTES = 8 * 1024 * 1024;
const HOT_CACHE_TTL_MS = Math.max(30_000, Number(process.env.CCM_CONTEXT_HOT_CACHE_TTL_MS || 5 * 60_000));
const HOT_CACHE_MAX_ENTRIES = Math.max(8, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_ENTRIES || 128));
const HOT_CACHE_MAX_BYTES = Math.max(4 * 1024 * 1024, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_BYTES || 32 * 1024 * 1024));
const SESSION_STATE_RETENTION_MS = Math.max(1, Number(process.env.CCM_CONTEXT_CACHE_RETENTION_DAYS || 30)) * 24 * 60 * 60_000;
const RECEIPT_ARCHIVE_RETENTION_MS = Math.max(7, Number(process.env.CCM_CONTEXT_CACHE_ARCHIVE_RETENTION_DAYS || 90)) * 24 * 60 * 60_000;
const hotMaterializations = new Map();
const materializationFlights = new Map();
const hotCacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expired: 0,
    singleflightOwners: 0,
    singleflightJoins: 0,
    sharedStateHits: 0,
};
let lastAutomaticMaintenanceAt = 0;
function checksum(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, length);
}
function contentText(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value || "");
    }
}
function cleanIdentity(value) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
}
function stateFile(binding) {
    const identity = `${binding.scope}\0${binding.scopeId || ""}\0${binding.sessionId}`;
    return path.join(CACHE_DIR, "sessions", `${checksum(identity, 40)}.json`);
}
function bindingKey(binding) {
    // Generation fences execution/recovery events, but it is not a new prompt
    // cache epoch. Keep it out of the materialization key so a normal turn or
    // retry can reuse the same local projection; only a real compaction boundary
    // starts a new epoch.
    return `${binding.scope}\0${binding.scopeId || ""}\0${binding.sessionId}\0${Number(binding.boundaryGeneration || 0)}`;
}
function ttlMilliseconds(value) {
    const ttl = String(value || "provider_default").toLowerCase();
    if (ttl === "30m")
        return 30 * 60_000;
    if (ttl === "1h")
        return 60 * 60_000;
    if (ttl === "24h")
        return 24 * 60 * 60_000;
    return 0;
}
function lifecycleTtlSource(value) {
    const ttl = String(value || "provider_default").toLowerCase();
    if (ttl === "30m" || ttl === "1h")
        return ttl;
    if (ttl === "provider_default")
        return "provider_default";
    return "unknown";
}
function buildCacheLifecycle(input) {
    const rawTtl = String(input.ttl || "provider_default").toLowerCase();
    const ttl = ["automatic", "in_memory", "default", "unknown"].includes(rawTtl) ? "provider_default" : rawTtl;
    const ttlMs = ttlMilliseconds(ttl);
    const previousAt = Date.parse(String(input.previous?.updatedAt || input.previous?.completedAt || ""));
    const expired = ttlMs > 0 && Number.isFinite(previousAt) && Date.now() - previousAt >= ttlMs;
    let cacheState = "cold";
    if (expired)
        cacheState = "expired";
    else if (input.hit)
        cacheState = "warm";
    else if (input.usageReported === false)
        cacheState = "degraded";
    else if (input.previous?.cacheWarmState === "warm")
        cacheState = "warming";
    else if (input.previous?.cacheWarmState === "warming")
        cacheState = "warming";
    const reason = expired ? "ttl_expired" : input.missReason;
    const allowedReasons = new Set([
        "cold_start", "ttl_expired", "stable_prefix_changed", "dynamic_prefix_leak",
        "provider_routing_or_eviction", "provider_usage_unreported",
    ]);
    return {
        cacheState,
        ttlSource: lifecycleTtlSource(ttl),
        stablePrefixTokens: Math.max(0, Number(input.stablePrefixTokens || 0)),
        stablePrefixBlockCount: Math.max(0, Number(input.stablePrefixBlockCount || 0)),
        breakpointCount: Math.max(0, Number(input.breakpointCount || 0)),
        cacheKeyScope: "workspace_scope_profile",
        ...(reason && allowedReasons.has(reason) ? { missReason: reason } : {}),
        contentStored: false,
    };
}
function classifyProviderCacheRequestClass(source, scope) {
    const value = String(source || "").trim().toLowerCase();
    if (/probe|capability/.test(value))
        return "probe";
    if (/summary|title|memory|compact|review|suggest|secondary|semantic|synthesis|distill|extract|planning_evidence/.test(value))
        return "auxiliary";
    return ["global", "group", "project"].includes(String(scope || "").toLowerCase()) ? "foreground_main" : "auxiliary";
}
function normalizeBinding(options) {
    const scope = options.scope || "other";
    const cacheAffinity = options.cacheAffinity || (0, agent_cache_affinity_1.inferAgentCacheAffinity)({
        scope,
        scopeId: options.scopeId,
        sessionId: options.sessionId,
        source: options.source,
        generation: options.generation,
    });
    return {
        scope,
        scopeId: scope === "global" ? "global" : cleanIdentity(options.scopeId || options.sessionId),
        sessionId: cleanIdentity(options.sessionId),
        generation: Math.max(0, Number(options.generation || 0)),
        boundaryGeneration: Math.max(0, Number(options.boundaryGeneration || 0)),
        source: cleanIdentity(options.source || "provider_request"),
        requestClass: options.requestClass || classifyProviderCacheRequestClass(options.source, options.scope),
        cacheAffinity,
    };
}
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
function atomicWriteJson(file, value) {
    (0, atomic_json_file_1.writeJsonAtomic)(file, value);
    try {
        fs.chmodSync(file, 0o600);
    }
    catch { }
}
function appendReceipt(value) {
    (0, atomic_json_file_1.withFileLock)(LEDGER_FILE, () => {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        try {
            if (fs.existsSync(LEDGER_FILE) && fs.statSync(LEDGER_FILE).size >= MAX_LEDGER_BYTES) {
                const archive = path.join(CACHE_DIR, `receipts-${Date.now()}.jsonl`);
                fs.renameSync(LEDGER_FILE, archive);
            }
        }
        catch { }
        fs.appendFileSync(LEDGER_FILE, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
        try {
            fs.chmodSync(LEDGER_FILE, 0o600);
        }
        catch { }
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function appendMaintenanceReceipt(value) {
    (0, atomic_json_file_1.withFileLock)(MAINTENANCE_LEDGER_FILE, () => {
        fs.mkdirSync(path.dirname(MAINTENANCE_LEDGER_FILE), { recursive: true });
        try {
            if (fs.existsSync(MAINTENANCE_LEDGER_FILE) && fs.statSync(MAINTENANCE_LEDGER_FILE).size >= MAX_LEDGER_BYTES) {
                fs.renameSync(MAINTENANCE_LEDGER_FILE, path.join(CACHE_DIR, `maintenance-${Date.now()}.jsonl`));
            }
        }
        catch { }
        fs.appendFileSync(MAINTENANCE_LEDGER_FILE, `${JSON.stringify({
            schema: "ccm-provider-context-cache-maintenance-receipt-v1",
            at: new Date().toISOString(),
            ...value,
            contentStored: false,
        })}\n`, { encoding: "utf8", mode: 0o600 });
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function blockKind(message, index) {
    const role = String(message?.role || "").toLowerCase();
    const type = String(message?.type || "").toLowerCase();
    const explicit = String(message?.contextBlockType || message?.context_block_type || "").trim().toLowerCase();
    if (["system", "rules", "skill", "mcp", "dynamic_context", "long_term_memory", "conversation", "tool_use", "tool_result", "summary", "recovery"].includes(explicit))
        return explicit;
    const content = contentText(message?.content);
    if (role === "system")
        return "system";
    if (/tool[_-]?result|web_search_tool_result/.test(type))
        return "tool_result";
    if (/tool[_-]?(use|call)|function_call/.test(type))
        return "tool_use";
    if (/正式模型摘要|压缩摘要|canonical_summary/i.test(content.slice(0, 400)))
        return "summary";
    if (/恢复上下文|recovery_context|post.?compact/i.test(content.slice(0, 400)))
        return "recovery";
    if (/\bskills?\b|技能/i.test(content.slice(0, 2000)))
        return "skill";
    if (/\bmcp\b|mcp__|工具目录|工具定义/i.test(content.slice(0, 2000)))
        return "mcp";
    if (/长期记忆|long[_ -]?term[_ -]?memory|typed memory/i.test(content.slice(0, 2000)))
        return "long_term_memory";
    return index === 0 && role === "system" ? "system" : "conversation";
}
function logicalBlockId(message, index, kind) {
    const explicit = cleanIdentity(message?.id || message?.uuid || message?.messageId || message?.tool_call_id || message?.toolCallId);
    return explicit ? `${kind}:${explicit}` : `${kind}:position:${index}`;
}
const STABLE_KIND_PRIORITY = {
    system: 100,
    rules: 92,
    skill: 84,
    mcp: 80,
    dynamic_context: 20,
    long_term_memory: 70,
    summary: 62,
    recovery: 35,
    conversation: 10,
    tool_use: 5,
    tool_result: 5,
};
// Only immutable identity/rules belong before the provider cache boundary.
// Skill and MCP catalog/authorization blocks are dynamic by design; keeping
// them in the stable prefix would move the breakpoint whenever a capability
// is loaded or unloaded and would invalidate the cache for the whole suffix.
const PROVIDER_STABLE_PREFIX_KINDS = new Set(["system", "rules"]);
function blockStability(previous, contentChecksum, kind, role) {
    const unchanged = !!previous && previous.contentChecksum === contentChecksum;
    const stableRuns = unchanged ? Math.max(1, Number(previous.stableRuns || 1)) + 1 : 1;
    const changeRuns = previous ? Math.max(0, Number(previous.changeRuns || 0)) + (unchanged ? 0 : 1) : 0;
    const reuseRate = stableRuns / Math.max(1, stableRuns + changeRuns);
    const kindScore = Math.max(0, Number(STABLE_KIND_PRIORITY[kind] || 0)) / 100;
    const stabilityScore = Math.round((kindScore * 0.65 + reuseRate * 0.35) * 1000) / 1000;
    const prefixEligible = role === "system" && PROVIDER_STABLE_PREFIX_KINDS.has(kind) && stabilityScore >= 0.55;
    return { unchanged, stableRuns, changeRuns, reuseRate, stabilityScore, prefixEligible };
}
function adaptiveStablePrefixProjection(messages, previousBlocks, enabled = true) {
    const previous = new Map((previousBlocks || []).map((block) => [String(block.id), block]));
    let leadingSystemCount = 0;
    while (leadingSystemCount < messages.length && String(messages[leadingSystemCount]?.role || "").toLowerCase() === "system")
        leadingSystemCount += 1;
    const prefixRows = messages.slice(0, leadingSystemCount).map((message, originalIndex) => {
        const kind = blockKind(message, originalIndex);
        const contentChecksum = checksum(contentText(message?.content));
        const id = logicalBlockId(message, originalIndex, kind);
        const prior = previous.get(id);
        const stability = blockStability(prior, contentChecksum, kind, "system");
        return { message, originalIndex, kind, id, stability, priority: Number(STABLE_KIND_PRIORITY[kind] || 0) };
    });
    const projectedPrefix = enabled
        ? [...prefixRows].sort((left, right) => {
            if (left.originalIndex === 0 && left.kind === "system")
                return -1;
            if (right.originalIndex === 0 && right.kind === "system")
                return 1;
            if (left.stability.prefixEligible !== right.stability.prefixEligible)
                return left.stability.prefixEligible ? -1 : 1;
            if (left.priority !== right.priority)
                return right.priority - left.priority;
            return left.originalIndex - right.originalIndex;
        })
        : prefixRows;
    const tail = messages.slice(leadingSystemCount).map((message, offset) => ({ message, originalIndex: leadingSystemCount + offset }));
    const rows = [...projectedPrefix, ...tail];
    const projectedOriginalPositions = rows.map(row => row.originalIndex);
    return {
        messages: rows.map(row => row.message),
        originalPositions: projectedOriginalPositions,
        receipt: {
            enabled,
            leadingSystemBlockCount: leadingSystemCount,
            reordered: projectedOriginalPositions.some((position, index) => position !== index),
            projectedOriginalPositions,
            stableCandidates: projectedPrefix.filter(row => row.stability.prefixEligible).map(row => row.id),
            volatileCandidates: projectedPrefix.filter(row => !row.stability.prefixEligible).map(row => row.id),
            policy: "system_anchor_then_reuse_rate_then_kind_priority_preserve_conversation_order",
        },
    };
}
function blockFacets(message, kind, content) {
    const facets = new Set([kind]);
    const sample = content.slice(0, 24_000);
    if (/\b(?:rules?|policy|instruction|constraint|permission|authorization)\b|规则|约束|权限|边界/i.test(sample))
        facets.add("rules");
    if (/\bskills?\b|技能/i.test(sample))
        facets.add("skills");
    if (/\bmcp\b|mcp__|工具目录|工具定义/i.test(sample))
        facets.add("mcp_tools");
    if (/subagent|子\s*agent|成员项目|agent catalog/i.test(sample))
        facets.add("subagent_definitions");
    return [...facets];
}
function immutableBlocks(messages, protectedRecentMessages, tokenConfig, originalPositions = [], previousBlocks = []) {
    const previous = new Map((previousBlocks || []).map((block) => [String(block.id), block]));
    const messageIndexes = messages
        .map((message, index) => ({ message, index }))
        .filter(row => String(row.message?.role || "").toLowerCase() !== "system")
        .map(row => row.index);
    const protectedIndexes = new Set(messageIndexes.slice(-Math.max(1, protectedRecentMessages)));
    return messages.map((message, index) => {
        const originalPosition = Number.isInteger(originalPositions[index]) ? originalPositions[index] : index;
        const kind = blockKind(message, index);
        const content = contentText(message?.content);
        const contentChecksum = checksum(content);
        const id = logicalBlockId(message, originalPosition, kind);
        const role = cleanIdentity(message?.role || "user") || "user";
        const stability = blockStability(previous.get(id), contentChecksum, kind, role);
        return {
            id,
            kind,
            role,
            facets: blockFacets(message, kind, content),
            position: index,
            originalPosition,
            // A block may carry ratio calibration, but the learned absolute drift is
            // a request-level guard and must not be repeated for every message block.
            tokens: (0, model_token_preflight_1.estimateModelTextTokens)(content, { ...tokenConfig, applyAbsoluteDriftGuard: false }).safetyAdjustedTokens,
            contentChecksum,
            immutableAddress: `sha256:${contentChecksum}`,
            protected: kind === "system" || protectedIndexes.has(index),
            protectionStatus: kind === "system" || protectedIndexes.has(index) ? "protected" : "eligible_for_projection",
            ...stability,
            contentStored: false,
        };
    });
}
function materializationInputChecksum(messages, binding, options, tokenConfig) {
    return checksum({
        binding: bindingKey(binding),
        provider: cleanIdentity(options.provider || ""),
        model: cleanIdentity(options.model || ""),
        tokenConfig,
        protectedRecentMessages: Math.max(1, Number(options.protectedRecentMessages || 5)),
        adaptiveStablePrefix: options.adaptiveStablePrefix !== false,
        messages: messages.map((message, index) => ({
            index,
            id: cleanIdentity(message?.id || message?.uuid || message?.messageId || message?.tool_call_id || message?.toolCallId),
            role: cleanIdentity(message?.role || ""),
            type: cleanIdentity(message?.type || ""),
            contextBlockType: cleanIdentity(message?.contextBlockType || message?.context_block_type || ""),
            contentChecksum: checksum(contentText(message?.content)),
        })),
    });
}
function hotCacheBytes() {
    return [...hotMaterializations.values()].reduce((sum, item) => sum + Number(item.approximateBytes || 0), 0);
}
function evictHotMaterializations(now = Date.now()) {
    for (const [key, item] of hotMaterializations) {
        if (now - item.lastAccessAtMs <= HOT_CACHE_TTL_MS)
            continue;
        hotMaterializations.delete(key);
        hotCacheMetrics.expired += 1;
    }
    const ordered = [...hotMaterializations.entries()].sort((a, b) => a[1].lastAccessAtMs - b[1].lastAccessAtMs);
    let bytes = hotCacheBytes();
    while (ordered.length && (hotMaterializations.size > HOT_CACHE_MAX_ENTRIES || bytes > HOT_CACHE_MAX_BYTES)) {
        const [key, item] = ordered.shift();
        if (!hotMaterializations.delete(key))
            continue;
        bytes -= Number(item.approximateBytes || 0);
        hotCacheMetrics.evictions += 1;
    }
}
function clearSupersededHotEpochs(binding) {
    const current = bindingKey(binding);
    const identityPrefix = `${binding.scope}\0${binding.scopeId || ""}\0${binding.sessionId}\0`;
    let cleared = 0;
    for (const [key, item] of hotMaterializations) {
        if (!item.bindingKey.startsWith(identityPrefix) || item.bindingKey === current)
            continue;
        hotMaterializations.delete(key);
        cleared += 1;
    }
    if (cleared)
        hotCacheMetrics.evictions += cleared;
    return cleared;
}
function copyMaterializedMessages(messages) {
    return messages.map(message => message && typeof message === "object" ? { ...message } : message);
}
function materializeContext(messages, binding, options, tokenConfig, previous) {
    const key = materializationInputChecksum(messages, binding, options, tokenConfig);
    evictHotMaterializations();
    const hot = hotMaterializations.get(key);
    if (hot) {
        hot.lastAccessAtMs = Date.now();
        hot.hits += 1;
        hot.source = "memory_hot_cache";
        hotCacheMetrics.hits += 1;
        return { ...hot, messages: copyMaterializedMessages(hot.messages), blocks: hot.blocks.map(block => ({ ...block })) };
    }
    const sharedStateHit = previous?.materializationInputChecksum === key
        && Array.isArray(previous?.blocks)
        && previous?.tokenPreflight
        && previous.tokenPreflight.calibrationScope === "request"
        && Array.isArray(previous?.adaptiveStablePrefix?.projectedOriginalPositions);
    if (sharedStateHit) {
        const positions = previous.adaptiveStablePrefix.projectedOriginalPositions.map((value) => Number(value));
        const projectedMessages = positions.map((position) => messages[position]).filter((message) => message !== undefined);
        if (projectedMessages.length === messages.length) {
            const materialized = {
                key,
                bindingKey: bindingKey(binding),
                messages: projectedMessages,
                blocks: previous.blocks.map((block) => ({ ...block })),
                tokenPreflight: { ...previous.tokenPreflight },
                adaptiveStablePrefix: { ...previous.adaptiveStablePrefix, source: "shared_state" },
                approximateBytes: Math.max(1024, Number(previous.materializationApproximateBytes || 0)),
                createdAtMs: Date.now(),
                lastAccessAtMs: Date.now(),
                hits: 1,
                source: "shared_state",
            };
            hotMaterializations.set(key, materialized);
            hotCacheMetrics.sharedStateHits += 1;
            evictHotMaterializations();
            return { ...materialized, messages: copyMaterializedMessages(materialized.messages), blocks: materialized.blocks.map(block => ({ ...block })) };
        }
    }
    hotCacheMetrics.misses += 1;
    const projection = adaptiveStablePrefixProjection(messages, previous?.blocks || [], options.adaptiveStablePrefix !== false);
    const blocks = immutableBlocks(projection.messages, Math.max(1, Number(options.protectedRecentMessages || 5)), tokenConfig, projection.originalPositions, previous?.blocks || []);
    const tokenPreflight = (0, model_token_preflight_1.estimateModelMessagesTokens)(projection.messages, tokenConfig);
    const approximateBytes = Math.max(1024, projection.messages.reduce((sum, message) => sum + Buffer.byteLength(contentText(message?.content), "utf8") + 256, 0));
    const materialized = {
        key,
        bindingKey: bindingKey(binding),
        messages: projection.messages,
        blocks,
        tokenPreflight,
        adaptiveStablePrefix: projection.receipt,
        approximateBytes,
        createdAtMs: Date.now(),
        lastAccessAtMs: Date.now(),
        hits: 0,
        source: "computed",
    };
    hotMaterializations.set(key, materialized);
    evictHotMaterializations();
    return { ...materialized, messages: copyMaterializedMessages(materialized.messages), blocks: materialized.blocks.map(block => ({ ...block })) };
}
function requestedMode(value) {
    const mode = String(value || "auto").trim().toLowerCase();
    return ["auto", "native", "controlled", "off"].includes(mode) ? mode : "auto";
}
function resolveExecutionMode(options) {
    const requested = options.enabled === false ? "off" : requestedMode(options.mode);
    const nativeReady = options.nativeApplyPlan?.nativeApplyReady === true
        && options.nativeApplyPlan?.mode === "native_api_context_management"
        && !!(options.nativeApplyPlan?.requestPatch || options.nativeApplyPlan?.request_patch)?.body?.context_management;
    if (requested === "off")
        return { requested, mode: "disabled", nativeReady, downgradeReason: "disabled_by_configuration" };
    if ((requested === "auto" || requested === "native") && nativeReady) {
        return { requested, mode: "native_api_context_management", nativeReady, downgradeReason: "" };
    }
    const adapter = String(options.adapterCapability?.adapter || "");
    if (requested !== "controlled" && adapter === "openai_prompt_cache") {
        return { requested, mode: "provider_prompt_cache", nativeReady, downgradeReason: "" };
    }
    if (requested !== "controlled" && adapter === "gemini_implicit_cache") {
        return { requested, mode: "provider_implicit_cache", nativeReady, downgradeReason: "" };
    }
    if (requested !== "controlled" && adapter === "gemini_explicit_cache") {
        return { requested, mode: "provider_explicit_cache", nativeReady, downgradeReason: "" };
    }
    if (requested !== "controlled" && adapter === "stable_prefix") {
        return { requested, mode: "stable_prefix_cache", nativeReady, downgradeReason: "provider_native_cache_unproven_stable_prefix_only" };
    }
    return {
        requested,
        mode: "ccm_controlled_projection",
        nativeReady,
        downgradeReason: requested === "native" ? "provider_native_context_management_unavailable" : "provider_uses_ccm_materialized_context",
    };
}
function buildEdits(previousBlocks, blocks) {
    const previous = new Map(previousBlocks.map(block => [String(block.id), block]));
    const current = new Map(blocks.map(block => [String(block.id), block]));
    const edits = [];
    for (const block of blocks) {
        const prior = previous.get(block.id);
        if (!prior)
            edits.push({ action: "insert", blockId: block.id, address: block.immutableAddress, tokens: block.tokens, protected: block.protected });
        else if (prior.contentChecksum === block.contentChecksum && Number(prior.position) === Number(block.position))
            edits.push({ action: "keep", blockId: block.id, address: block.immutableAddress, tokens: block.tokens, protected: block.protected });
        else if (prior.contentChecksum === block.contentChecksum)
            edits.push({ action: "move", blockId: block.id, fromPosition: Number(prior.position), position: Number(block.position), address: block.immutableAddress, tokens: block.tokens, protected: block.protected });
        else
            edits.push({ action: "replace", blockId: block.id, fromAddress: prior.immutableAddress, address: block.immutableAddress, tokens: block.tokens, protected: block.protected });
    }
    for (const block of previousBlocks) {
        if (!current.has(String(block.id)))
            edits.push({ action: "delete", blockId: block.id, fromAddress: block.immutableAddress, tokens: block.tokens, protected: block.protected === true });
    }
    return edits;
}
function planChecksum(plan) {
    const payload = { ...(plan || {}) };
    delete payload.planChecksum;
    delete payload.contextPlanChecksum;
    delete payload.receiptChecksum;
    return checksum(payload);
}
function verifyProviderNeutralContextCachePlan(plan, expected = {}) {
    const isV2 = plan?.schema === "ccm-context-plan-v2" && Number(plan?.version || 0) === 2;
    const issues = [
        !isV2 ? "schema_invalid" : "",
        expected.scope && plan?.scope !== expected.scope ? "scope_mismatch" : "",
        expected.sessionId && plan?.sessionId !== expected.sessionId ? "session_mismatch" : "",
        expected.scopeId && plan?.scopeId !== expected.scopeId ? "scope_id_mismatch" : "",
        plan?.rawTranscriptPreserved !== true ? "raw_transcript_preservation_missing" : "",
        plan?.contentStored !== false ? "content_storage_boundary_invalid" : "",
        String(plan?.contextPlanChecksum || plan?.planChecksum || "") !== planChecksum(plan) ? "checksum_invalid" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues };
}
function prepareProviderNeutralContextCacheRequestLocked(messagesInput, options, binding, previous, file) {
    const startedAtMs = Date.now();
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const previousSameEpoch = previous?.schema === "ccm-context-plan-state-v2"
        && previous.scope === binding.scope
        && previous.scopeId === binding.scopeId
        && previous.sessionId === binding.sessionId
        // Generation is an audit/recovery identity. It must not cold-start the
        // provider cache on every turn; only a real compaction boundary starts a
        // new cache epoch.
        && Number(previous.boundaryGeneration || 0) === Number(binding.boundaryGeneration || 0);
    const previousSameConversation = previous?.schema === "ccm-context-plan-state-v2"
        && previous.scope === binding.scope
        && previous.scopeId === binding.scopeId
        && previous.sessionId === binding.sessionId;
    if (previous && !previousSameEpoch)
        clearSupersededHotEpochs(binding);
    const tokenConfig = {
        provider: options.provider,
        model: options.model,
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        proxyUrl: options.proxyUrl,
        proxyEndpoint: options.proxyEndpoint,
        httpProxy: options.httpProxy,
        httpsProxy: options.httpsProxy,
        format: options.format,
        providerNativeCacheFamily: options.providerNativeCacheFamily,
        inferenceBackendKind: options.inferenceBackendKind,
    };
    const materialized = materializeContext(messages, binding, options, tokenConfig, previousSameEpoch ? previous : null);
    const projectedMessages = materialized.messages;
    const blocks = materialized.blocks;
    const edits = buildEdits(previousSameEpoch ? previous.blocks || [] : [], blocks);
    const transcriptProjectionChanged = previousSameConversation
        && edits.some((edit) => ["replace", "move", "delete"].includes(String(edit.action || "")));
    const compactionBoundaryChanged = !!previous && !previousSameEpoch;
    const stablePrefixBlocks = (rows) => {
        const result = [];
        for (const block of rows || []) {
            if (block?.role !== "system" || block?.prefixEligible !== true)
                break;
            result.push(block);
        }
        return result;
    };
    const currentStablePrefix = stablePrefixBlocks(blocks);
    const previousStablePrefix = previousSameConversation ? stablePrefixBlocks(previous?.blocks || []) : [];
    const toolSchemaChecksum = cleanIdentity(options.toolSchemaChecksum || "");
    const toolSchemaChanged = !!(previousSameConversation && previous?.toolSchemaChecksum
        && toolSchemaChecksum
        && String(previous.toolSchemaChecksum) !== toolSchemaChecksum);
    const stablePrefixChecksum = checksum({
        blocks: currentStablePrefix.map((block) => ({ id: block.id, kind: block.kind, contentChecksum: block.contentChecksum })),
        toolSchemaChecksum,
    });
    const dynamicSuffixChecksum = checksum(blocks.slice(currentStablePrefix.length).map((block) => ({
        id: block.id,
        kind: block.kind,
        role: block.role,
        contentChecksum: block.contentChecksum,
    })));
    const toolSchemaTokens = Math.max(0, Number(options.toolSchemaTokens || 0));
    const stablePrefixTokens = currentStablePrefix.reduce((sum, block) => sum + Math.max(0, Number(block.tokens || 0)), 0)
        + toolSchemaTokens;
    const stableMessagePrefixChanged = !previousSameConversation
        || currentStablePrefix.length !== previousStablePrefix.length
        || currentStablePrefix.some((block, index) => String(block?.id || "") !== String(previousStablePrefix[index]?.id || "")
            || String(block?.kind || "") !== String(previousStablePrefix[index]?.kind || "")
            || String(block?.contentChecksum || "") !== String(previousStablePrefix[index]?.contentChecksum || ""));
    let stablePrefixChanged = stableMessagePrefixChanged || toolSchemaChanged;
    const execution = resolveExecutionMode(options);
    const nativePatch = execution.mode === "native_api_context_management"
        ? options.nativeApplyPlan?.requestPatch || options.nativeApplyPlan?.request_patch || null
        : null;
    const tokenPreflight = materialized.tokenPreflight;
    const totalTokens = tokenPreflight.safetyAdjustedTokens;
    const contextWindowTokens = Math.max(0, Number(options.contextWindowTokens || 0));
    const maxOutputTokens = Math.max(0, Number(options.maxOutputTokens || 0));
    const reservedTokens = Math.max(0, Number(options.reservedTokens || 0));
    const availableInputTokens = contextWindowTokens > 0 ? Math.max(0, contextWindowTokens - maxOutputTokens - reservedTokens) : 0;
    if (availableInputTokens > 0 && totalTokens > availableInputTokens) {
        const error = new Error(`Context Engine V2 Token 门禁拒绝请求：${totalTokens} > ${availableInputTokens}；必须先完成正式模型压缩`);
        error.code = "CONTEXT_PLAN_TOKEN_GATE_REQUIRES_FORMAL_COMPACTION";
        throw error;
    }
    const cacheIdentity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        proxyUrl: options.proxyUrl,
        proxyEndpoint: options.proxyEndpoint,
        httpProxy: options.httpProxy,
        httpsProxy: options.httpsProxy,
        format: options.format,
        model: options.model,
        providerNativeCacheFamily: options.providerNativeCacheFamily,
        providerNativeCacheFamilyManual: options.providerNativeCacheFamilyManual,
        inferenceBackendKind: options.inferenceBackendKind,
    });
    const prefixChangeReasons = (0, provider_cache_diagnostics_1.stablePrefixChangeReasons)({
        previous,
        previousSameEpoch,
        stableMessagePrefixChanged,
        currentBlocks: currentStablePrefix,
        previousBlocks: previousStablePrefix,
        toolSchemaChanged,
        model: cleanIdentity(options.model || ""),
        endpointFingerprint: cacheIdentity.interfaceFingerprint,
        generation: Number(binding.generation || 0),
        boundaryGeneration: Number(binding.boundaryGeneration || 0),
        protocol: String(options.adapterCapability?.protocol || "custom"),
        ttlPolicy: cleanIdentity(options.providerPromptCacheRetention || "in_memory"),
        reasoningModeChecksum: cleanIdentity(options.adapterCapability?.reasoningModeChecksum || ""),
        breakpointLayoutChecksum: cleanIdentity(options.adapterCapability?.resolvedExecution?.evidenceChecksum || ""),
        transportParametersChecksum: cleanIdentity(cacheIdentity.transportParametersChecksum || options.adapterCapability?.protocolResolution?.transportParametersChecksum || ""),
    });
    stablePrefixChanged = stablePrefixChanged || prefixChangeReasons.some(reason => ![
        "cold_start",
        "generation_changed",
        "compaction_boundary_changed",
    ].includes(reason));
    const automaticCacheOptimization = (0, automatic_provider_cache_optimization_1.buildAutomaticCacheOptimizationProjection)({
        matrix: options.adapterCapability?.capabilityMatrix,
        execution: options.adapterCapability?.resolvedExecution,
        stableCoreChecksum: stablePrefixChecksum,
        stableCoreTokens: stablePrefixTokens,
        prefixChangeReasons,
        fallbackReason: execution.downgradeReason,
        cacheAffinity: binding.cacheAffinity,
    });
    const resolvedTtl = String(options.adapterCapability?.resolvedExecution?.ttl
        || options.adapterCapability?.strategy?.ttl
        || options.providerPromptCacheRetention
        || "provider_default");
    const promptSegments = (0, provider_cache_prompt_segments_1.buildCcmCachePromptSegmentsV1)({
        blocks,
        messages: projectedMessages,
        stablePrefixChecksum,
        dynamicSuffixChecksum,
        cacheEpoch: Number(binding.boundaryGeneration || 0),
        toolSchemaChecksum,
        toolSchemaTokens,
    });
    const cacheLifecycle = buildCacheLifecycle({
        previous,
        ttl: resolvedTtl,
        stablePrefixTokens,
        stablePrefixBlockCount: currentStablePrefix.length,
        breakpointCount: Array.isArray(previous?.breakpointChecksums) ? previous.breakpointChecksums.length : 0,
        stablePrefixChanged,
        missReason: !previous ? "cold_start" : stablePrefixChanged ? "stable_prefix_changed" : undefined,
    });
    const plan = {
        schema: "ccm-context-plan-v2",
        version: 2,
        requestId: `pcc_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
        ...binding,
        canonicalPayloadChecksum: cleanIdentity(options.canonicalPayloadChecksum || ""),
        toolSchemaChecksum,
        toolSchemaTokens,
        toolSchemaChanged,
        transcriptProjectionChanged,
        ccmProjectionChanged: transcriptProjectionChanged,
        compactionBoundaryChanged,
        stablePrefixChanged,
        stablePrefixChangeReasons: prefixChangeReasons,
        stablePrefixChecksum,
        dynamicSuffixChecksum,
        stablePrefixTokens,
        stableCoreChecksum: stablePrefixChecksum,
        stableCoreTokens: stablePrefixTokens,
        automaticCacheOptimization,
        promptSegments,
        cacheLifecycle,
        prefixExtensionEligible: stablePrefixTokens >= 1_024,
        requestClass: binding.requestClass || "auxiliary",
        cacheAffinity: binding.cacheAffinity || null,
        provider: cleanIdentity(options.provider || "unknown"),
        model: cleanIdentity(options.model || ""),
        providerEndpointFingerprint: cacheIdentity.interfaceFingerprint,
        providerCapabilityIdentityChecksum: cacheIdentity.identityChecksum,
        contextIdentityChecksum: checksum({
            providerEndpointFingerprint: cacheIdentity.interfaceFingerprint,
            model: cleanIdentity(options.model || ""),
            scope: binding.scope,
            scopeId: binding.scopeId,
            sessionId: binding.sessionId,
            generation: binding.generation,
            boundaryGeneration: binding.boundaryGeneration,
        }),
        requestedMode: execution.requested,
        executionMode: execution.mode,
        adapterKind: String(options.adapterCapability?.adapter || "stable_prefix"),
        capabilitySource: String(options.adapterCapability?.capabilitySource || "ccm_safe_default"),
        providerNative: ["native_api_context_management", "provider_prompt_cache", "provider_implicit_cache", "provider_explicit_cache"].includes(execution.mode),
        providerManagedKvCache: ["native_api_context_management", "provider_prompt_cache", "provider_implicit_cache", "provider_explicit_cache"].includes(execution.mode),
        ccmControlledProjection: ["ccm_controlled_projection", "stable_prefix_cache"].includes(execution.mode),
        downgradeReason: execution.downgradeReason,
        providerPromptCacheRetention: cleanIdentity(options.providerPromptCacheRetention || "in_memory"),
        providerCacheProtocol: cleanIdentity(options.adapterCapability?.protocol || "custom"),
        transportParametersChecksum: cleanIdentity(cacheIdentity.transportParametersChecksum || options.adapterCapability?.protocolResolution?.transportParametersChecksum || ""),
        breakpointLayoutChecksum: cleanIdentity(options.adapterCapability?.resolvedExecution?.evidenceChecksum || ""),
        reasoningModeChecksum: cleanIdentity(options.adapterCapability?.reasoningModeChecksum || ""),
        costRatesPerMillionTokens: {
            directInput: Math.max(0, Number(options.inputCostPerMillionTokens || 0)),
            cacheRead: Math.max(0, Number(options.cacheReadCostPerMillionTokens || 0)),
            cacheCreation: Math.max(0, Number(options.cacheCreationCostPerMillionTokens || 0)),
        },
        nativeRequestPatchChecksum: nativePatch ? checksum(nativePatch) : "",
        previousPlanChecksum: previousSameEpoch ? String(previous.planChecksum || "") : "",
        epochReset: !!previous && !previousSameEpoch,
        blocks,
        edits,
        blockCount: blocks.length,
        totalTokens,
        keptTokens: edits.filter(edit => edit.action === "keep").reduce((sum, edit) => sum + Number(edit.tokens || 0), 0),
        changedTokens: edits.filter(edit => edit.action !== "keep").reduce((sum, edit) => sum + Number(edit.tokens || 0), 0),
        blockChanges: {
            kept: edits.filter(edit => edit.action === "keep").map(edit => edit.blockId),
            inserted: edits.filter(edit => edit.action === "insert").map(edit => edit.blockId),
            replaced: edits.filter(edit => edit.action === "replace").map(edit => edit.blockId),
            deleted: edits.filter(edit => edit.action === "delete").map(edit => edit.blockId),
            moved: edits.filter(edit => edit.action === "move").map(edit => edit.blockId),
        },
        tokenGate: {
            contextWindowTokens,
            maxOutputTokens,
            reservedTokens,
            availableInputTokens,
            projectedInputTokens: totalTokens,
            rawEstimatedInputTokens: tokenPreflight.rawTokens,
            calibratedInputTokens: tokenPreflight.calibratedTokens,
            estimationStrategy: tokenPreflight.strategy,
            estimationConfidence: tokenPreflight.confidence,
            calibrationSamples: tokenPreflight.calibrationSamples,
            modelFamily: tokenPreflight.providerFamily,
            passed: availableInputTokens <= 0 || totalTokens <= availableInputTokens,
            formalCompactionStatus: cleanIdentity(options.formalCompactionStatus || "not_required_or_completed"),
            characterTruncationAllowed: false,
        },
        stablePrefixBlockCount: currentStablePrefix.length,
        adaptiveStablePrefix: materialized.adaptiveStablePrefix,
        materializationCache: {
            status: materialized.source === "computed" ? "miss" : "hit",
            source: materialized.source,
            keyChecksum: materialized.key,
            ttlMs: HOT_CACHE_TTL_MS,
            approximateBytes: materialized.approximateBytes,
            singleflightJoined: options.materializationSingleflightJoined === true,
            processEntries: hotMaterializations.size,
            processBytes: hotCacheBytes(),
            contentPersisted: false,
        },
        projectionDurationMs: Math.max(0, Date.now() - startedAtMs),
        projectedContentReplacementDetected: projectedMessages.some(message => /Large old tool result replaced|Old tool result content cleared|旧工具结果.*清理/i.test(contentText(message?.content))),
        rawTranscriptPreserved: true,
        semanticContextOwnedByCcm: !["native_api_context_management", "provider_prompt_cache", "provider_implicit_cache", "provider_explicit_cache"].includes(execution.mode),
        contentStored: false,
        status: "prepared",
        createdAt: new Date().toISOString(),
        contextPlanChecksum: "",
        planChecksum: "",
    };
    plan.contextPlanChecksum = planChecksum(plan);
    plan.planChecksum = plan.contextPlanChecksum;
    atomicWriteJson(file, {
        schema: "ccm-context-plan-state-v2",
        version: 2,
        ...binding,
        provider: plan.provider,
        model: plan.model,
        executionMode: plan.executionMode,
        adapterKind: plan.adapterKind,
        capabilitySource: plan.capabilitySource,
        planChecksum: plan.planChecksum,
        contextPlanChecksum: plan.contextPlanChecksum,
        canonicalPayloadChecksum: plan.canonicalPayloadChecksum,
        toolSchemaChecksum: plan.toolSchemaChecksum,
        toolSchemaChanged: plan.toolSchemaChanged,
        transcriptProjectionChanged: plan.transcriptProjectionChanged,
        ccmProjectionChanged: plan.ccmProjectionChanged,
        compactionBoundaryChanged: plan.compactionBoundaryChanged,
        stablePrefixChanged: plan.stablePrefixChanged,
        stablePrefixChangeReasons: plan.stablePrefixChangeReasons,
        stablePrefixChecksum: plan.stablePrefixChecksum,
        dynamicSuffixChecksum: plan.dynamicSuffixChecksum,
        stablePrefixTokens: plan.stablePrefixTokens,
        stableCoreChecksum: plan.stableCoreChecksum,
        stableCoreTokens: plan.stableCoreTokens,
        automaticCacheOptimization: plan.automaticCacheOptimization,
        promptSegments: plan.promptSegments,
        cacheLifecycle: plan.cacheLifecycle,
        cacheAffinity: plan.cacheAffinity || null,
        prefixExtensionEligible: plan.prefixExtensionEligible,
        requestClass: plan.requestClass,
        contextIdentityChecksum: plan.contextIdentityChecksum,
        providerEndpointFingerprint: plan.providerEndpointFingerprint,
        providerCapabilityIdentityChecksum: plan.providerCapabilityIdentityChecksum,
        providerCacheProtocol: plan.providerCacheProtocol,
        providerPromptCacheRetention: plan.providerPromptCacheRetention,
        transportParametersChecksum: plan.transportParametersChecksum,
        breakpointLayoutChecksum: plan.breakpointLayoutChecksum,
        reasoningModeChecksum: plan.reasoningModeChecksum,
        requestId: plan.requestId,
        blocks,
        materializationInputChecksum: materialized.key,
        materializationApproximateBytes: materialized.approximateBytes,
        tokenPreflight: {
            rawTokens: tokenPreflight.rawTokens,
            calibratedTokens: tokenPreflight.calibratedTokens,
            safetyAdjustedTokens: tokenPreflight.safetyAdjustedTokens,
            strategy: tokenPreflight.strategy,
            confidence: tokenPreflight.confidence,
            calibrationSamples: tokenPreflight.calibrationSamples,
            providerFamily: tokenPreflight.providerFamily,
            calibrationScope: tokenPreflight.calibrationScope,
        },
        adaptiveStablePrefix: plan.adaptiveStablePrefix,
        materializationCache: plan.materializationCache,
        projectionDurationMs: plan.projectionDurationMs,
        blockCount: plan.blockCount,
        totalTokens,
        reusedBlockCount: edits.filter(edit => edit.action === "keep").length,
        changedBlockCount: edits.filter(edit => edit.action !== "keep").length,
        stablePrefixBlockCount: plan.stablePrefixBlockCount,
        downgradeReason: plan.downgradeReason,
        blockChanges: plan.blockChanges,
        tokenGate: plan.tokenGate,
        projectedContentReplacementDetected: plan.projectedContentReplacementDetected,
        contentStored: false,
        updatedAt: plan.createdAt,
    });
    appendReceipt({ ...plan, blocks: blocks.map(({ contentChecksum, ...block }) => ({ ...block, contentChecksum })) });
    return { messages: projectedMessages, plan };
}
function prepareProviderNeutralContextCacheRequest(messagesInput, options) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    if (!cleanIdentity(options.sessionId))
        return { messages, plan: null };
    maybeRunProviderNeutralContextCacheMaintenance();
    const binding = normalizeBinding(options);
    const file = stateFile(binding);
    return (0, atomic_json_file_1.withFileLock)(file, () => prepareProviderNeutralContextCacheRequestLocked(messages, options, binding, readJson(file), file), {
        timeoutMs: 30_000,
        retryMs: 20,
        staleMs: 2 * 60_000,
    });
}
async function prepareProviderNeutralContextCacheRequestSingleflight(messagesInput, options) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    if (!cleanIdentity(options.sessionId))
        return { messages, plan: null };
    const binding = normalizeBinding(options);
    const tokenConfig = {
        provider: options.provider,
        model: options.model,
        apiUrl: options.apiUrl,
        format: options.format,
        providerNativeCacheFamily: options.providerNativeCacheFamily,
        inferenceBackendKind: options.inferenceBackendKind,
    };
    const flightKey = materializationInputChecksum(messages, binding, options, tokenConfig);
    const current = materializationFlights.get(flightKey);
    if (current) {
        hotCacheMetrics.singleflightJoins += 1;
        await current;
        return prepareProviderNeutralContextCacheRequest(messages, { ...options, materializationSingleflightJoined: true });
    }
    hotCacheMetrics.singleflightOwners += 1;
    const owner = Promise.resolve().then(() => prepareProviderNeutralContextCacheRequest(messages, options));
    materializationFlights.set(flightKey, owner);
    try {
        return await owner;
    }
    finally {
        if (materializationFlights.get(flightKey) === owner)
            materializationFlights.delete(flightKey);
    }
}
function estimatedInputCostUsd(plan, usage) {
    const rates = plan?.costRatesPerMillionTokens || {};
    const direct = Math.max(0, Number(usage.providerInputTokens || 0));
    const read = Math.max(0, Number(usage.cacheReadInputTokens || 0));
    const creation = Math.max(0, Number(usage.cacheCreationInputTokens || 0));
    const configured = Number(rates.directInput || 0) > 0 || Number(rates.cacheRead || 0) > 0 || Number(rates.cacheCreation || 0) > 0;
    const cost = (direct * Number(rates.directInput || 0) + read * Number(rates.cacheRead || 0) + creation * Number(rates.cacheCreation || 0)) / 1_000_000;
    return { configured, costUsd: configured ? Math.round(cost * 1_000_000) / 1_000_000 : 0 };
}
function nextRollingMetrics(current, completion, plan) {
    const previous = current?.rollingMetrics || {};
    const samples = Math.max(0, Number(previous.samples || 0));
    const nextSamples = samples + 1;
    const average = (previousValue, nextValue) => Math.round((((Number(previousValue || 0) * samples) + Number(nextValue || 0)) / nextSamples) * 1000) / 1000;
    const previousForeground = Array.isArray(previous.recentForegroundSamples) ? previous.recentForegroundSamples : [];
    const recentForegroundSamples = completion.requestClass === "foreground_main"
        ? [...previousForeground, {
                at: completion.completedAt,
                hit: completion.cacheReadInputTokens > 0,
                cacheReadTokens: completion.cacheReadInputTokens,
                providerInputTokens: completion.providerInputTokens + completion.cacheCreationInputTokens + completion.cacheReadInputTokens,
                missReason: completion.cacheMissReason,
                warmState: completion.cacheWarmState,
            }].slice(-50)
        : previousForeground.slice(-50);
    const trend = (size) => {
        const rows = recentForegroundSamples.slice(-size);
        const hits = rows.filter((row) => row.hit === true).length;
        const cacheReadTokens = rows.reduce((sum, row) => sum + Number(row.cacheReadTokens || 0), 0);
        const providerInputTokens = rows.reduce((sum, row) => sum + Number(row.providerInputTokens || 0), 0);
        return {
            samples: rows.length,
            hits,
            misses: rows.length - hits,
            requestHitRate: rows.length ? hits / rows.length : 0,
            cacheReadTokens,
            providerInputTokens,
            tokenReuseRate: providerInputTokens > 0 ? Math.min(1, cacheReadTokens / providerInputTokens) : 0,
        };
    };
    return {
        schema: "ccm-context-cache-rolling-metrics-v1",
        samples: nextSamples,
        averageProjectionDurationMs: average(previous.averageProjectionDurationMs, plan.projectionDurationMs),
        averageProviderLatencyMs: average(previous.averageProviderLatencyMs, completion.providerLatencyMs),
        averageCacheHitRate: average(previous.averageCacheHitRate, completion.cacheHitRate),
        averageReusedBlockRatio: average(previous.averageReusedBlockRatio, completion.reusedBlockCount / Math.max(1, completion.reusedBlockCount + completion.changedBlockCount)),
        totalDirectInputTokens: Math.max(0, Number(previous.totalDirectInputTokens || 0)) + completion.providerInputTokens,
        totalCacheReadInputTokens: Math.max(0, Number(previous.totalCacheReadInputTokens || 0)) + completion.cacheReadInputTokens,
        totalCacheCreationInputTokens: Math.max(0, Number(previous.totalCacheCreationInputTokens || 0)) + completion.cacheCreationInputTokens,
        totalEstimatedCostUsd: Math.round((Math.max(0, Number(previous.totalEstimatedCostUsd || 0)) + completion.estimatedInputCostUsd) * 1_000_000) / 1_000_000,
        recentForegroundSamples,
        recent20: trend(20),
        recent50: trend(50),
        lastUpdatedAt: completion.completedAt,
        contentStored: false,
    };
}
function contextCacheRecommendation(plan, completion, rolling) {
    const samples = Math.max(0, Number(rolling?.samples || 0));
    const reuse = Math.max(0, Number(rolling?.averageReusedBlockRatio || 0));
    const hitRate = Math.max(0, Number(rolling?.averageCacheHitRate || 0));
    if (plan.executionMode === "ccm_controlled_projection" || plan.executionMode === "stable_prefix_cache") {
        return {
            action: "use_ccm_controlled_projection",
            label: "继续使用CCM受控投影",
            reason: plan.downgradeReason || "Provider原生缓存尚未得到真实usage证明",
            confidence: samples >= 3 ? "high" : "medium",
            requiresProbe: false,
        };
    }
    if (plan.adapterKind === "openai_prompt_cache" && samples >= 3 && reuse >= 0.7 && hitRate < 0.35 && plan.providerPromptCacheRetention !== "24h") {
        return {
            action: "prefer_24h_retention",
            label: "建议改用24小时Prompt Cache",
            reason: "上下文复用率较高，但当前原生缓存命中偏低",
            confidence: "medium",
            requiresProbe: false,
        };
    }
    if (hitRate >= 0.45) {
        return {
            action: "keep_provider_default",
            label: "保持当前Provider缓存设置",
            reason: "真实缓存读取Token和命中率已证明当前配置有效",
            confidence: samples >= 5 ? "high" : "medium",
            requiresProbe: false,
        };
    }
    return {
        action: "keep_provider_default",
        label: "保持Provider默认设置并继续观察",
        reason: samples < 3 ? "真实usage样本不足" : "当前收益不足以建议改变保留策略",
        confidence: "low",
        requiresProbe: false,
    };
}
function completeProviderNeutralContextCacheRequest(plan, input = { ok: true }) {
    if (!plan?.requestId || plan?.schema !== "ccm-context-plan-v2")
        return null;
    const usage = input.usage && typeof input.usage === "object" ? input.usage : {};
    const completion = {
        schema: "ccm-context-plan-usage-receipt-v2",
        version: 2,
        requestId: plan.requestId,
        planChecksum: plan.planChecksum,
        contextPlanChecksum: plan.contextPlanChecksum || plan.planChecksum,
        contextIdentityChecksum: plan.contextIdentityChecksum || "",
        scope: plan.scope,
        scopeId: plan.scopeId,
        sessionId: plan.sessionId,
        generation: plan.generation,
        boundaryGeneration: plan.boundaryGeneration,
        provider: plan.provider,
        model: plan.model,
        executionMode: plan.executionMode,
        adapterKind: plan.adapterKind,
        capabilitySource: plan.capabilitySource,
        requestClass: plan.requestClass || "auxiliary",
        cacheAffinity: plan.cacheAffinity || null,
        stablePrefixChecksum: String(plan.stablePrefixChecksum || ""),
        dynamicSuffixChecksum: String(plan.dynamicSuffixChecksum || ""),
        promptCacheKeyChecksum: String(plan._runtimePromptCacheKeyChecksum || ""),
        breakpointChecksums: Array.isArray(plan._runtimeBreakpointChecksums) ? plan._runtimeBreakpointChecksums.slice(0, 4).map(cleanIdentity) : [],
        cacheStrategy: plan._runtimeCacheStrategy || null,
        stablePrefixChangeReasons: Array.isArray(plan.stablePrefixChangeReasons) ? plan.stablePrefixChangeReasons.slice(0, 12).map(cleanIdentity) : [],
        payloadChecksum: String(plan.canonicalPayloadChecksum || ""),
        prefixExtensionEligible: plan.prefixExtensionEligible === true,
        providerNative: plan.providerNative === true,
        providerManagedKvCache: plan.providerManagedKvCache === true,
        ccmControlledProjection: plan.ccmControlledProjection === true,
        rawTranscriptPreserved: true,
        contentStored: false,
        status: input.ok ? "completed" : "failed",
        providerRequestId: cleanIdentity(input.providerRequestId || ""),
        estimatedInputTokens: Number(plan.totalTokens || 0),
        providerInputTokens: Math.max(0, Number(usage.inputTokens || usage.input_tokens || 0)),
        cacheCreationInputTokens: Math.max(0, Number(usage.cacheCreationInputTokens || usage.cache_creation_input_tokens || 0)),
        cacheReadInputTokens: Math.max(0, Number(usage.cacheReadInputTokens || usage.cache_read_input_tokens || 0)),
        cacheDeletedInputTokens: Math.max(0, Number(usage.cacheDeletedInputTokens || usage.cache_deleted_input_tokens || 0)),
        cacheCreation5mInputTokens: Math.max(0, Number(usage.cacheCreation5mInputTokens || usage.ephemeral_5m_input_tokens || 0)),
        cacheCreation1hInputTokens: Math.max(0, Number(usage.cacheCreation1hInputTokens || usage.ephemeral_1h_input_tokens || 0)),
        cacheHitRate: Math.max(0, Number(usage.inputTokens || usage.input_tokens || 0)) + Math.max(0, Number(usage.cacheReadInputTokens || usage.cache_read_input_tokens || 0)) > 0
            ? Math.min(1, Math.max(0, Number(usage.cacheReadInputTokens || usage.cache_read_input_tokens || 0)) / Math.max(1, Math.max(0, Number(usage.inputTokens || usage.input_tokens || 0)) + Math.max(0, Number(usage.cacheReadInputTokens || usage.cache_read_input_tokens || 0))))
            : 0,
        projectionDurationMs: Math.max(0, Number(plan.projectionDurationMs || 0)),
        providerLatencyMs: Math.max(0, Date.now() - Number(plan._runtimeProviderStartedAtMs || Date.now())),
        reusedBlockCount: plan.edits.filter((edit) => edit.action === "keep").length,
        changedBlockCount: plan.edits.filter((edit) => edit.action !== "keep").length,
        adapterEvidence: input.adapterEvidence ? {
            applied: input.adapterEvidence.applied === true,
            adapter: cleanIdentity(input.adapterEvidence.adapter || plan.adapterKind || ""),
            requestPatchApplied: input.adapterEvidence.requestPatchApplied === true,
            requestFields: Array.isArray(input.adapterEvidence.requestFields) ? input.adapterEvidence.requestFields.map(cleanIdentity).filter(Boolean).slice(0, 12) : [],
            explicitBreakpointCount: Math.max(0, Number(input.adapterEvidence.explicitBreakpointCount || 0)),
            breakpointDiagnostic: input.adapterEvidence.breakpointDiagnostic ? {
                schema: "ccm-cache-breakpoint-diagnostic-v2",
                mode: cleanIdentity(input.adapterEvidence.breakpointDiagnostic.mode || "implicit"),
                selectedIndexes: Array.isArray(input.adapterEvidence.breakpointDiagnostic.selectedIndexes)
                    ? input.adapterEvidence.breakpointDiagnostic.selectedIndexes.slice(0, 4).map((value) => Math.max(0, Number(value || 0)))
                    : [],
                selectedRoles: Array.isArray(input.adapterEvidence.breakpointDiagnostic.selectedRoles)
                    ? input.adapterEvidence.breakpointDiagnostic.selectedRoles.slice(0, 4).map(cleanIdentity)
                    : [],
                encodedBreakpoints: Math.max(0, Number(input.adapterEvidence.breakpointDiagnostic.encodedBreakpoints || 0)),
                omittedCandidates: Array.isArray(input.adapterEvidence.breakpointDiagnostic.omittedCandidates)
                    ? input.adapterEvidence.breakpointDiagnostic.omittedCandidates.slice(0, 16).map((row) => ({
                        index: Math.max(0, Number(row?.index || 0)),
                        reason: cleanIdentity(row?.reason || ""),
                    }))
                    : [],
                payloadChecksum: cleanIdentity(input.adapterEvidence.breakpointDiagnostic.payloadChecksum || ""),
                contentStored: false,
            } : null,
            strategy: input.adapterEvidence.strategy && typeof input.adapterEvidence.strategy === "object" ? {
                schema: cleanIdentity(input.adapterEvidence.strategy.schema || ""),
                mode: cleanIdentity(input.adapterEvidence.strategy.mode || ""),
                transport: cleanIdentity(input.adapterEvidence.strategy.transport || ""),
                ttl: cleanIdentity(input.adapterEvidence.strategy.ttl || ""),
                explicitBreakpointsVerified: input.adapterEvidence.strategy.explicitBreakpointsVerified === true,
                execution: input.adapterEvidence.strategy.execution ? {
                    prefixMode: cleanIdentity(input.adapterEvidence.strategy.execution.prefixMode || "stable_only"),
                    keyMode: cleanIdentity(input.adapterEvidence.strategy.execution.keyMode || "none"),
                    breakpointMode: cleanIdentity(input.adapterEvidence.strategy.execution.breakpointMode || "none"),
                    editingMode: cleanIdentity(input.adapterEvidence.strategy.execution.editingMode || "none"),
                    ttl: cleanIdentity(input.adapterEvidence.strategy.execution.ttl || "provider_default"),
                    evidenceChecksum: cleanIdentity(input.adapterEvidence.strategy.execution.evidenceChecksum || ""),
                    contentStored: false,
                } : null,
                capabilityMatrix: input.adapterEvidence.strategy.capabilityMatrix ? {
                    schema: "ccm-provider-cache-capability-matrix-v1",
                    transportIdentityChecksum: cleanIdentity(input.adapterEvidence.strategy.capabilityMatrix.transportIdentityChecksum || ""),
                    protocol: cleanIdentity(input.adapterEvidence.strategy.capabilityMatrix.protocol || "custom"),
                    capabilities: input.adapterEvidence.strategy.capabilityMatrix.capabilities || {},
                    supportedTtls: Array.isArray(input.adapterEvidence.strategy.capabilityMatrix.supportedTtls) ? input.adapterEvidence.strategy.capabilityMatrix.supportedTtls.slice(0, 4).map(cleanIdentity) : [],
                    evidenceUpdatedAt: cleanIdentity(input.adapterEvidence.strategy.capabilityMatrix.evidenceUpdatedAt || ""),
                    contentStored: false,
                } : null,
                contentStored: false,
            } : null,
            cacheReferenceCount: Math.max(0, Number(input.adapterEvidence.cacheReferenceCount || 0)),
            cacheEditCount: Math.max(0, Number(input.adapterEvidence.cacheEditCount || 0)),
            reason: cleanIdentity(input.adapterEvidence.reason || ""),
        } : null,
        error: input.ok ? "" : cleanIdentity(input.error?.message || input.error || "provider_request_failed"),
        completedAt: new Date().toISOString(),
    };
    const reportedCostUsd = Math.max(0, Number(usage.costUsd || usage.cost_usd || usage.reportedCostUsd || usage.reported_cost_usd || 0));
    const estimatedCost = estimatedInputCostUsd(plan, completion);
    completion.reportedCostUsd = reportedCostUsd;
    completion.estimatedInputCostUsd = reportedCostUsd > 0 ? reportedCostUsd : estimatedCost.costUsd;
    completion.costSource = reportedCostUsd > 0 ? "provider_usage" : estimatedCost.configured ? "configured_token_rates" : "unavailable";
    const usageReported = completion.providerInputTokens > 0
        || completion.cacheCreationInputTokens > 0
        || completion.cacheReadInputTokens > 0;
    const previousState = readJson(stateFile({
        scope: plan.scope,
        scopeId: plan.scopeId,
        sessionId: plan.sessionId,
        generation: plan.generation,
        boundaryGeneration: plan.boundaryGeneration,
    }));
    completion.cacheMissReason = completion.cacheReadInputTokens > 0
        ? ""
        : plan.toolSchemaChanged === true
            ? "tool_schema_changed"
            : !plan.previousPlanChecksum
                ? "cold_start"
                : plan.compactionBoundaryChanged === true
                    ? "compaction_boundary_changed"
                    : plan.transcriptProjectionChanged === true
                        ? "transcript_projection_changed"
                        : plan.stablePrefixChanged === true
                            ? "stable_prefix_changed"
                            : !usageReported
                                ? "provider_usage_not_reported"
                                : plan.prefixExtensionEligible !== true
                                    ? "prefix_below_provider_threshold"
                                    : plan.adapterKind === "stable_prefix"
                                        ? "native_fields_unproven"
                                        : !plan.stablePrefixChanged && plan.previousPlanChecksum
                                            ? "provider_prefix_reuse_unproven"
                                            : "cold_start";
    completion.cacheLifecycle = buildCacheLifecycle({
        previous: previousState,
        ttl: plan.cacheLifecycle?.ttlSource || plan.providerPromptCacheRetention || plan.adapterEvidence?.strategy?.ttl || "provider_default",
        stablePrefixTokens: Number(plan.stablePrefixTokens || 0),
        stablePrefixBlockCount: Number(plan.stablePrefixBlockCount || 0),
        breakpointCount: Array.isArray(plan._runtimeBreakpointChecksums) ? plan._runtimeBreakpointChecksums.length : Number(plan.cacheLifecycle?.breakpointCount || 0),
        stablePrefixChanged: plan.stablePrefixChanged === true,
        usageReported,
        hit: completion.cacheReadInputTokens > 0,
        missReason: completion.cacheMissReason === "provider_usage_not_reported" ? "provider_usage_unreported" : completion.cacheMissReason,
    });
    completion.agentCacheStageMetrics = plan.cacheAffinity
        ? (0, agent_cache_affinity_1.agentCacheStageMetricsFromUsage)(plan.cacheAffinity, {
            ...usage,
            directInputTokens: completion.providerInputTokens,
            cacheCreationInputTokens: completion.cacheCreationInputTokens,
            cacheReadInputTokens: completion.cacheReadInputTokens,
            reported: usageReported,
        }, {
            capabilityStatus: completion.cacheReadInputTokens > 0
                ? "confirmed"
                : plan.automaticCacheOptimization?.capabilityStatus || "unproven",
            missReason: completion.cacheMissReason,
        })
        : null;
    completion.prefixExtensionVerified = completion.cacheReadInputTokens > 0
        && completion.prefixExtensionEligible === true
        && plan.stablePrefixChanged !== true
        && !!plan.previousPlanChecksum;
    const warm = (0, provider_cache_diagnostics_1.nextProviderCacheWarmState)({
        hit: completion.cacheReadInputTokens > 0,
        usageReported,
        eligible: completion.prefixExtensionEligible === true,
        stablePrefixChanged: plan.stablePrefixChanged === true,
        previousWarmState: previousState?.cacheWarmState,
        previousRoutingMissStreak: previousState?.providerRoutingMissStreak,
    });
    completion.cacheWarmState = warm.cacheWarmState;
    completion.providerRoutingMissStreak = warm.providerRoutingMissStreak;
    if (!completion.cacheReadInputTokens && completion.cacheMissReason === "provider_prefix_reuse_unproven" && warm.cacheWarmState === "evicted") {
        completion.cacheMissReason = "provider_routing_or_eviction";
        completion.cacheLifecycle = buildCacheLifecycle({
            previous: previousState,
            ttl: plan.cacheLifecycle?.ttlSource || plan.providerPromptCacheRetention || "provider_default",
            stablePrefixTokens: Number(plan.stablePrefixTokens || 0),
            stablePrefixBlockCount: Number(plan.stablePrefixBlockCount || 0),
            breakpointCount: Array.isArray(plan._runtimeBreakpointChecksums) ? plan._runtimeBreakpointChecksums.length : Number(plan.cacheLifecycle?.breakpointCount || 0),
            stablePrefixChanged: false,
            usageReported,
            hit: false,
            missReason: "provider_routing_or_eviction",
        });
    }
    const observedInputTokens = completion.providerInputTokens + completion.cacheCreationInputTokens + completion.cacheReadInputTokens;
    let calibration = null;
    if (input.ok && observedInputTokens > 0) {
        try {
            calibration = (0, model_token_preflight_1.recordModelTokenCalibrationForIdentity)(String(plan.providerCapabilityIdentityChecksum || ""), {
                estimatedTokens: Number(plan.tokenGate?.rawEstimatedInputTokens || plan.totalTokens || 0),
                observedTokens: observedInputTokens,
            });
        }
        catch { }
    }
    completion.tokenCalibration = calibration ? {
        samples: calibration.samples,
        rejectedSamples: calibration.rejectedSamples || 0,
        factor: calibration.factor,
        p95Ratio: calibration.p95Ratio || 1,
        p95PositiveDriftTokens: calibration.p95PositiveDriftTokens || 0,
        estimatorVersion: calibration.estimatorVersion || 1,
        updatedAt: calibration.updatedAt,
        checksum: calibration.checksum,
        contentStored: false,
    } : null;
    const binding = {
        scope: plan.scope,
        scopeId: plan.scopeId,
        sessionId: plan.sessionId,
        generation: plan.generation,
        boundaryGeneration: plan.boundaryGeneration,
        source: plan.source,
        cacheAffinity: plan.cacheAffinity || null,
    };
    const file = stateFile(binding);
    (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readJson(file);
        const rollingMetrics = nextRollingMetrics(current, completion, plan);
        completion.rollingMetrics = rollingMetrics;
        completion.cacheRecommendation = contextCacheRecommendation(plan, completion, rollingMetrics);
        completion.receiptChecksum = checksum(completion);
        if (current) {
            const ownsLatestPlan = current.requestId === plan.requestId;
            atomicWriteJson(file, {
                ...current,
                ...(ownsLatestPlan ? {
                    lastRequestStatus: completion.status,
                    providerInputTokens: completion.providerInputTokens,
                    cacheCreationInputTokens: completion.cacheCreationInputTokens,
                    cacheReadInputTokens: completion.cacheReadInputTokens,
                    cacheDeletedInputTokens: completion.cacheDeletedInputTokens,
                    cacheCreation5mInputTokens: completion.cacheCreation5mInputTokens,
                    cacheCreation1hInputTokens: completion.cacheCreation1hInputTokens,
                    cacheHitRate: completion.cacheHitRate,
                    cacheMissReason: completion.cacheMissReason,
                    cacheWarmState: completion.cacheWarmState,
                    providerRoutingMissStreak: completion.providerRoutingMissStreak,
                    stablePrefixChangeReasons: completion.stablePrefixChangeReasons,
                    breakpointChecksums: completion.breakpointChecksums,
                    cacheStrategy: completion.cacheStrategy,
                    cacheAffinity: completion.cacheAffinity,
                    agentCacheStageMetrics: completion.agentCacheStageMetrics,
                    requestClass: completion.requestClass,
                    stablePrefixChecksum: completion.stablePrefixChecksum,
                    dynamicSuffixChecksum: completion.dynamicSuffixChecksum,
                    promptCacheKeyChecksum: completion.promptCacheKeyChecksum,
                    payloadChecksum: completion.payloadChecksum,
                    prefixExtensionEligible: completion.prefixExtensionEligible,
                    prefixExtensionVerified: completion.prefixExtensionVerified,
                    projectionDurationMs: completion.projectionDurationMs,
                    providerLatencyMs: completion.providerLatencyMs,
                    reportedCostUsd: completion.reportedCostUsd,
                    estimatedInputCostUsd: completion.estimatedInputCostUsd,
                    costSource: completion.costSource,
                    providerRequestId: completion.providerRequestId,
                    receiptChecksum: completion.receiptChecksum,
                    lastError: completion.error,
                    adapterEvidence: completion.adapterEvidence,
                    tokenCalibration: completion.tokenCalibration,
                    cacheLifecycle: completion.cacheLifecycle,
                    promptSegments: plan.promptSegments,
                } : {}),
                rollingMetrics,
                cacheRecommendation: completion.cacheRecommendation,
                updatedAt: completion.completedAt,
            });
        }
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
    if (!completion.receiptChecksum)
        completion.receiptChecksum = checksum(completion);
    (0, context_engine_observability_1.recordContextEngineEvent)({
        kind: "provider_usage",
        scope: plan.scope,
        scopeId: plan.scopeId,
        sessionId: plan.sessionId,
        status: completion.status,
        projectedTokens: plan.totalTokens,
        providerInputTokens: completion.providerInputTokens,
        cacheReadInputTokens: completion.cacheReadInputTokens,
        cacheCreationInputTokens: completion.cacheCreationInputTokens,
        cacheHitRate: completion.cacheHitRate,
        projectionDurationMs: completion.projectionDurationMs,
        providerLatencyMs: completion.providerLatencyMs,
        estimatedCostUsd: completion.estimatedInputCostUsd,
        provider: plan.provider,
        model: plan.model,
        reasonCode: completion.error,
    });
    try {
        (0, provider_cache_scope_metrics_1.recordProviderCacheScopeMetric)(binding, completion);
    }
    catch { }
    appendReceipt(completion);
    return completion;
}
function readProviderNeutralContextCacheRuntimeStatus() {
    evictHotMaterializations();
    return {
        schema: "ccm-context-materialization-runtime-status-v1",
        hotCache: {
            entries: hotMaterializations.size,
            approximateBytes: hotCacheBytes(),
            maxEntries: HOT_CACHE_MAX_ENTRIES,
            maxBytes: HOT_CACHE_MAX_BYTES,
            ttlMs: HOT_CACHE_TTL_MS,
            ...hotCacheMetrics,
            contentPersisted: false,
        },
        singleflight: {
            inFlight: materializationFlights.size,
            owners: hotCacheMetrics.singleflightOwners,
            joins: hotCacheMetrics.singleflightJoins,
            mergesModelAnswers: false,
        },
        multiInstance: {
            stateFileLocks: true,
            staleLeaseRecovery: true,
            sharedMaterializationMetadata: true,
            sharedCapabilityEvidence: true,
            promptContentSharedOnDisk: false,
        },
    };
}
function clearProviderNeutralContextHotCache(binding = {}) {
    let cleared = 0;
    for (const [key, item] of hotMaterializations) {
        const parts = item.bindingKey.split("\0");
        if (binding.scope && parts[0] !== binding.scope)
            continue;
        if (binding.scopeId && parts[1] !== binding.scopeId)
            continue;
        if (binding.sessionId && parts[2] !== binding.sessionId)
            continue;
        hotMaterializations.delete(key);
        cleared += 1;
    }
    return { cleared, remaining: hotMaterializations.size };
}
function invalidateProviderNeutralContextCacheState(binding, reason = "session_deleted") {
    const file = stateFile(binding);
    const result = (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readJson(file);
        let deleted = false;
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                deleted = true;
            }
            if (fs.existsSync(`${file}.bak`))
                fs.unlinkSync(`${file}.bak`);
        }
        catch { }
        return { deleted, planChecksum: String(current?.contextPlanChecksum || current?.planChecksum || ""), blockCount: Number(current?.blockCount || 0), totalTokens: Number(current?.totalTokens || 0) };
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
    const hot = clearProviderNeutralContextHotCache(binding);
    appendMaintenanceReceipt({ action: "invalidate", reason: cleanIdentity(reason), binding: { scope: binding.scope, scopeId: cleanIdentity(binding.scopeId), sessionId: cleanIdentity(binding.sessionId) }, ...result, hotCleared: hot.cleared });
    return { success: true, ...result, hotCleared: hot.cleared };
}
function runProviderNeutralContextCacheMaintenanceLocked(options = {}) {
    const now = Number(options.now || Date.now());
    const stateRetentionMs = Math.max(1, Number(options.stateRetentionDays || SESSION_STATE_RETENTION_MS / 86_400_000)) * 86_400_000;
    const archiveRetentionMs = Math.max(7, Number(options.archiveRetentionDays || RECEIPT_ARCHIVE_RETENTION_MS / 86_400_000)) * 86_400_000;
    const dryRun = options.dryRun === true;
    const sessionsDir = path.join(CACHE_DIR, "sessions");
    const quarantineDir = path.join(CACHE_DIR, "quarantine");
    const stateFiles = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir).filter(name => name.endsWith(".json")) : [];
    let staleStates = 0;
    let corruptStates = 0;
    let deletedStates = 0;
    for (const name of stateFiles) {
        const file = path.join(sessionsDir, name);
        const state = readJson(file);
        let modifiedAt = 0;
        try {
            modifiedAt = fs.statSync(file).mtimeMs;
        }
        catch { }
        const stale = now - Math.max(modifiedAt, Date.parse(String(state?.updatedAt || "")) || 0) > stateRetentionMs;
        const corrupt = !state || state.schema !== "ccm-context-plan-state-v2";
        if (!stale && !corrupt)
            continue;
        if (stale)
            staleStates += 1;
        if (corrupt)
            corruptStates += 1;
        if (dryRun)
            continue;
        try {
            if (corrupt) {
                fs.mkdirSync(quarantineDir, { recursive: true });
                fs.renameSync(file, path.join(quarantineDir, `${Date.now()}-${name}`));
            }
            else {
                fs.unlinkSync(file);
            }
            try {
                if (fs.existsSync(`${file}.bak`))
                    fs.unlinkSync(`${file}.bak`);
            }
            catch { }
            deletedStates += 1;
        }
        catch { }
    }
    const archives = fs.existsSync(CACHE_DIR)
        ? fs.readdirSync(CACHE_DIR).filter(name => /^receipts-\d+\.jsonl$/.test(name))
        : [];
    let expiredArchives = 0;
    for (const name of archives) {
        const file = path.join(CACHE_DIR, name);
        let modifiedAt = now;
        try {
            modifiedAt = fs.statSync(file).mtimeMs;
        }
        catch { }
        if (now - modifiedAt <= archiveRetentionMs)
            continue;
        expiredArchives += 1;
        if (!dryRun)
            try {
                fs.unlinkSync(file);
            }
            catch { }
    }
    evictHotMaterializations(now);
    const capability = dryRun ? { removedEntries: 0, removedAttempts: 0, dryRun: true } : (0, provider_cache_capability_registry_1.pruneProviderCacheCapabilityRegistry)({ now, expiredRetentionDays: 30 });
    const result = {
        dryRun,
        scannedStates: stateFiles.length,
        staleStates,
        corruptStates,
        deletedStates,
        expiredArchives,
        capability,
        hotCache: readProviderNeutralContextCacheRuntimeStatus().hotCache,
    };
    if (!dryRun)
        appendMaintenanceReceipt({ action: "retention_cleanup", ...result });
    lastAutomaticMaintenanceAt = now;
    return result;
}
function runProviderNeutralContextCacheMaintenance(options = {}) {
    const maintenanceLease = path.join(CACHE_DIR, "maintenance-lease");
    return (0, atomic_json_file_1.withFileLock)(maintenanceLease, () => runProviderNeutralContextCacheMaintenanceLocked(options), { timeoutMs: 60_000, retryMs: 50, staleMs: 10 * 60_000 });
}
function maybeRunProviderNeutralContextCacheMaintenance() {
    if (Date.now() - lastAutomaticMaintenanceAt < 6 * 60 * 60_000)
        return;
    try {
        runProviderNeutralContextCacheMaintenance();
    }
    catch { }
}
function readLatestProviderNeutralContextCacheState(binding) {
    return readJson(stateFile(binding));
}
function readContextEngineV2Status(binding, config = {}) {
    const state = readLatestProviderNeutralContextCacheState(binding);
    const blocks = Array.isArray(state?.blocks) ? state.blocks : [];
    return {
        schema: "ccm-context-engine-status-v2",
        version: 2,
        applicable: !!state,
        identity: {
            scope: binding.scope,
            scopeId: cleanIdentity(binding.scopeId || ""),
            sessionId: cleanIdentity(binding.sessionId),
            generation: Math.max(0, Number(state?.generation || binding.generation || 0)),
            boundaryGeneration: Math.max(0, Number(state?.boundaryGeneration || binding.boundaryGeneration || 0)),
            contextIdentityChecksum: String(state?.contextIdentityChecksum || ""),
            providerEndpointFingerprint: String(state?.providerEndpointFingerprint || ""),
        },
        plan: state ? {
            schema: state.schema,
            version: Number(state.version || 1),
            contextPlanChecksum: String(state.contextPlanChecksum || state.planChecksum || ""),
            executionMode: String(state.executionMode || ""),
            adapterKind: String(state.adapterKind || ""),
            capabilitySource: String(state.capabilitySource || ""),
            blockCount: Number(state.blockCount || blocks.length),
            totalTokens: Number(state.totalTokens || 0),
            reusedBlockCount: Number(state.reusedBlockCount || 0),
            changedBlockCount: Number(state.changedBlockCount || 0),
            stablePrefixBlockCount: Number(state.stablePrefixBlockCount || 0),
            stablePrefixTokens: Number(state.stablePrefixTokens || 0),
            stableCoreChecksum: String(state.stableCoreChecksum || state.stablePrefixChecksum || ""),
            stableCoreTokens: Number(state.stableCoreTokens || state.stablePrefixTokens || 0),
            automaticCacheOptimization: state.automaticCacheOptimization || null,
            promptSegments: state.promptSegments || null,
            cacheLifecycle: state.cacheLifecycle || null,
            agentCacheStageMetrics: state.agentCacheStageMetrics || null,
            stablePrefixChecksum: String(state.stablePrefixChecksum || ""),
            dynamicSuffixChecksum: String(state.dynamicSuffixChecksum || ""),
            promptCacheKeyChecksum: String(state.promptCacheKeyChecksum || ""),
            requestClass: String(state.requestClass || "auxiliary"),
            prefixExtensionEligible: state.prefixExtensionEligible === true,
            prefixExtensionVerified: state.prefixExtensionVerified === true,
            cacheMissReason: String(state.cacheMissReason || ""),
            blockChanges: state.blockChanges || null,
            adaptiveStablePrefix: state.adaptiveStablePrefix || null,
            materializationCache: state.materializationCache || null,
            tokenGate: state.tokenGate || null,
            blocks: blocks.map((block) => ({
                id: cleanIdentity(block.id),
                kind: cleanIdentity(block.kind),
                facets: Array.isArray(block.facets) ? block.facets.map((item) => cleanIdentity(item)).filter(Boolean).slice(0, 12) : [],
                tokens: Math.max(0, Number(block.tokens || 0)),
                protected: block.protected === true,
                immutableAddress: cleanIdentity(block.immutableAddress),
                contentStored: false,
            })),
            providerInputTokens: Math.max(0, Number(state.providerInputTokens || 0)),
            cacheCreationInputTokens: Math.max(0, Number(state.cacheCreationInputTokens || 0)),
            cacheReadInputTokens: Math.max(0, Number(state.cacheReadInputTokens || 0)),
            cacheDeletedInputTokens: Math.max(0, Number(state.cacheDeletedInputTokens || 0)),
            cacheHitRate: Math.max(0, Number(state.cacheHitRate || 0)),
            projectionDurationMs: Math.max(0, Number(state.projectionDurationMs || 0)),
            providerLatencyMs: Math.max(0, Number(state.providerLatencyMs || 0)),
            reportedCostUsd: Math.max(0, Number(state.reportedCostUsd || 0)),
            estimatedInputCostUsd: Math.max(0, Number(state.estimatedInputCostUsd || 0)),
            costSource: cleanIdentity(state.costSource || "unavailable"),
            rollingMetrics: state.rollingMetrics || null,
            cacheRecommendation: state.cacheRecommendation || null,
            lastRequestStatus: String(state.lastRequestStatus || ""),
            downgradeReason: String(state.downgradeReason || ""),
            updatedAt: String(state.updatedAt || ""),
            contentStored: false,
        } : null,
        capability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config),
        adapter: (0, provider_context_cache_adapters_1.providerCacheAdapterPublicSummary)(config).active,
        runtime: readProviderNeutralContextCacheRuntimeStatus(),
        rawTranscriptPreserved: true,
        contentStored: false,
    };
}
function providerNeutralContextCacheCapability(config = {}) {
    const adapter = (0, provider_context_cache_adapters_1.providerCacheAdapterPublicSummary)(config);
    return {
        schema: "ccm-provider-neutral-context-cache-capability-v1",
        enabled: true,
        automatic: true,
        automaticOptimization: adapter.automaticOptimization,
        adapterV2: adapter,
        capabilityMatrix: adapter.active.capabilityMatrix,
        resolvedExecution: adapter.active.resolvedExecution,
        rawTranscriptPreserved: true,
        contentStored: false,
    };
}
function runProviderNeutralContextCacheSelfTest() {
    const sessionId = `selftest-${Date.now()}`;
    const messages = [
        { role: "system", content: "rules" },
        { id: "u1", role: "user", content: "hello" },
        { id: "a1", role: "assistant", content: "world" },
    ];
    const first = prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-a", sessionId, mode: "auto", provider: "openai-compatible" });
    const second = prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-a", sessionId, mode: "auto", provider: "openai-compatible" });
    const extended = prepareProviderNeutralContextCacheRequest([...messages, { id: "u2", role: "user", content: "next request" }], { scope: "project", scopeId: "project-a", sessionId, mode: "auto", provider: "openai-compatible" });
    const siblingProject = prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-b", sessionId, mode: "auto", provider: "openai-compatible" });
    const schemaSessionId = `${sessionId}-schema`;
    prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-a", sessionId: schemaSessionId, mode: "auto", provider: "openai-compatible", toolSchemaChecksum: "schema-a" });
    const changedSchema = prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-a", sessionId: schemaSessionId, mode: "auto", provider: "openai-compatible", toolSchemaChecksum: "schema-b" });
    const auxiliary = prepareProviderNeutralContextCacheRequest(messages, { scope: "project", scopeId: "project-a", sessionId: `${sessionId}-aux`, mode: "auto", provider: "openai-compatible", source: "project-session-auto-title" });
    const dynamicSessionId = `${sessionId}-dynamic-system`;
    const dynamicFirst = prepareProviderNeutralContextCacheRequest([
        { role: "system", content: "fixed identity" },
        { role: "system", contextBlockType: "dynamic_context", content: "skill A and current project A" },
        { role: "user", content: "hello" },
    ], { scope: "group", scopeId: "group-a", sessionId: dynamicSessionId, generation: 1, mode: "auto", provider: "openai-compatible" });
    const dynamicSecond = prepareProviderNeutralContextCacheRequest([
        { role: "system", content: "fixed identity" },
        { role: "system", contextBlockType: "dynamic_context", content: "skill B and current project B" },
        { role: "user", content: "hello" },
    ], { scope: "group", scopeId: "group-a", sessionId: dynamicSessionId, generation: 2, boundaryGeneration: 1, mode: "auto", provider: "openai-compatible" });
    const dynamicCatalogSessionId = `${sessionId}-dynamic-catalog`;
    const dynamicCatalogFirst = prepareProviderNeutralContextCacheRequest([
        { role: "system", content: "fixed identity" },
        { role: "system", contextBlockType: "skill", content: "Skill catalog A" },
        { role: "system", contextBlockType: "mcp", content: "MCP catalog A" },
        { role: "user", content: "hello" },
    ], { scope: "project", scopeId: "project-a", sessionId: dynamicCatalogSessionId, mode: "auto", provider: "openai-compatible" });
    const dynamicCatalogSecond = prepareProviderNeutralContextCacheRequest([
        { role: "system", content: "fixed identity" },
        { role: "system", contextBlockType: "skill", content: "Skill catalog B" },
        { role: "system", contextBlockType: "mcp", content: "MCP catalog B" },
        { role: "user", content: "hello" },
    ], { scope: "project", scopeId: "project-a", sessionId: dynamicCatalogSessionId, generation: 2, mode: "auto", provider: "openai-compatible" });
    const generationSessionId = `${sessionId}-generation-stability`;
    const generationFirst = prepareProviderNeutralContextCacheRequest(messages, {
        scope: "project", scopeId: "project-a", sessionId: generationSessionId,
        generation: 1, boundaryGeneration: 0, mode: "auto", provider: "openai-compatible",
    });
    const generationSecond = prepareProviderNeutralContextCacheRequest(messages, {
        scope: "project", scopeId: "project-a", sessionId: generationSessionId,
        generation: 2, boundaryGeneration: 0, mode: "auto", provider: "openai-compatible",
    });
    const boundaryReset = prepareProviderNeutralContextCacheRequest(messages, {
        scope: "project", scopeId: "project-a", sessionId: generationSessionId,
        generation: 3, boundaryGeneration: 1, mode: "auto", provider: "openai-compatible",
    });
    const ttlSessionId = `${sessionId}-ttl-expiry`;
    const ttlOptions = {
        scope: "project", scopeId: "project-a", sessionId: ttlSessionId,
        mode: "auto", provider: "openai-compatible", providerPromptCacheRetention: "30m",
    };
    prepareProviderNeutralContextCacheRequest(messages, ttlOptions);
    const ttlFile = stateFile({ scope: "project", scopeId: "project-a", sessionId: ttlSessionId });
    const ttlState = readJson(ttlFile);
    if (ttlState)
        atomicWriteJson(ttlFile, { ...ttlState, updatedAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    const ttlExpired = prepareProviderNeutralContextCacheRequest(messages, ttlOptions);
    const native = prepareProviderNeutralContextCacheRequest(messages, {
        scope: "group",
        scopeId: "group-a",
        sessionId: `${sessionId}-native`,
        mode: "auto",
        provider: "anthropic",
        nativeApplyPlan: { nativeApplyReady: true, mode: "native_api_context_management", requestPatch: { body: { context_management: { edits: [{ type: "clear_thinking_20251015", keep: "all" }] } } } },
    });
    const receipt = completeProviderNeutralContextCacheRequest(second.plan, { ok: true, usage: { inputTokens: 30 } });
    const checks = {
        genericProviderUsesControlledProjection: first.plan.executionMode === "ccm_controlled_projection" && first.plan.providerNative === false,
        secondRequestReusesAllBlocks: second.plan.edits.every((edit) => edit.action === "keep"),
        dynamicSuffixDoesNotInvalidateStablePrefix: extended.plan.stablePrefixChecksum === second.plan.stablePrefixChecksum
            && extended.plan.dynamicSuffixChecksum !== second.plan.dynamicSuffixChecksum
            && extended.plan.stablePrefixChanged === false
            && extended.plan.stablePrefixChangeReasons.length === 0,
        nativeModeRequiresVerifiedReadyPlan: native.plan.executionMode === "native_api_context_management" && native.plan.providerManagedKvCache === true,
        rawTranscriptNeverStoredInBlocks: first.plan.blocks.every((block) => block.contentStored === false && !("content" in block)),
        exactScopeReceiptValid: verifyProviderNeutralContextCachePlan(second.plan, { scope: "project", scopeId: "project-a", sessionId }).valid,
        sameLocalSessionIsolatedByScopeId: siblingProject.plan.contextIdentityChecksum !== second.plan.contextIdentityChecksum
            && verifyProviderNeutralContextCachePlan(siblingProject.plan, { scope: "project", scopeId: "project-b", sessionId }).valid,
        toolSchemaChangeIsExplicit: changedSchema.plan.toolSchemaChanged === true,
        foregroundAndAuxiliaryAreSeparated: first.plan.requestClass === "foreground_main" && auxiliary.plan.requestClass === "auxiliary",
        dynamicSystemDoesNotBreakStableCore: dynamicFirst.plan.stablePrefixBlockCount === 1
            && dynamicSecond.plan.stablePrefixBlockCount === 1
            && dynamicFirst.plan.stableCoreChecksum === dynamicSecond.plan.stableCoreChecksum
            && dynamicFirst.plan.dynamicSuffixChecksum !== dynamicSecond.plan.dynamicSuffixChecksum
            && dynamicSecond.plan.stablePrefixChanged === false
            && dynamicSecond.plan.epochReset === true,
        dynamicSkillAndMcpStayAfterStableCore: dynamicCatalogFirst.plan.stablePrefixBlockCount === 1
            && dynamicCatalogSecond.plan.stablePrefixBlockCount === 1
            && dynamicCatalogFirst.plan.stableCoreChecksum === dynamicCatalogSecond.plan.stableCoreChecksum
            && dynamicCatalogSecond.plan.stablePrefixChanged === false,
        generationChangeDoesNotColdStart: generationFirst.plan.epochReset === false
            && generationSecond.plan.epochReset === false
            && generationSecond.plan.previousPlanChecksum === generationFirst.plan.planChecksum
            && generationSecond.plan.materializationCache?.status === "hit"
            && generationSecond.plan.cacheLifecycle?.missReason !== "cold_start",
        boundaryGenerationStartsNewEpoch: boundaryReset.plan.epochReset === true
            && boundaryReset.plan.previousPlanChecksum === "",
        ttlExpiryIsReported: ttlExpired.plan.cacheLifecycle?.cacheState === "expired"
            && ttlExpired.plan.cacheLifecycle?.missReason === "ttl_expired"
            && ttlExpired.plan.cacheLifecycle?.ttlSource === "30m",
        providerUsageRecorded: receipt?.providerInputTokens === 30 && receipt?.contentStored === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-neutral-context-cache.js.map