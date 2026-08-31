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
exports.CCM_STABLE_PROMPT_VERSION = void 0;
exports.observeAutomaticProviderCacheRouting = observeAutomaticProviderCacheRouting;
exports.buildAutomaticProviderCacheKey = buildAutomaticProviderCacheKey;
exports.automaticProviderCacheTtl = automaticProviderCacheTtl;
exports.buildAutomaticCacheOptimizationProjection = buildAutomaticCacheOptimizationProjection;
exports.automaticProviderCacheEnabled = automaticProviderCacheEnabled;
exports.runAutomaticProviderCacheOptimizationSelfTest = runAutomaticProviderCacheOptimizationSelfTest;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const runtime_paths_1 = require("../core/runtime-paths");
const agent_cache_affinity_1 = require("./agent-cache-affinity");
exports.CCM_STABLE_PROMPT_VERSION = "ccm-main-agent-stable-core-v1";
function hash(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, length);
}
function cacheScopeProfile(plan) {
    const explicit = String(plan?.cacheAffinity?.cacheKeyProfile || "").trim();
    if (explicit)
        return explicit;
    const requestClass = String(plan?.requestClass || "foreground_main");
    const source = String(plan?.source || "").toLowerCase();
    if (requestClass === "probe" || /probe|capability/.test(source))
        return "probe";
    if (requestClass === "auxiliary" || /summary|title|memory|compact|review|suggest|secondary|semantic|synthesis|distill|extract/.test(source))
        return "auxiliary";
    return "main_agent";
}
// Routing shards are deliberately conservative and process-local.  A shard
// is introduced only after sustained high traffic and repeated eligible
// misses; normal traffic keeps one shared route so cross-session reuse is not
// fragmented.  The state is bounded and never contains prompt content.
const cacheRouteObservations = new Map();
const CACHE_ROUTE_WINDOW_MS = 60_000;
const CACHE_ROUTE_HIGH_TRAFFIC = 15;
function cacheRouteIdentity(config, plan, matrix) {
    const scope = String(plan?.scope || "other");
    const scopeId = scope === "global" ? "global" : String(plan?.scopeId || "");
    return {
        transportIdentityChecksum: matrix.transportIdentityChecksum,
        model: String(config?.model || ""),
        workspaceIdentityChecksum: workspaceIdentityChecksum(),
        userIdentityChecksum: hash(String(config?.userId || config?.user_id || config?.credentialProfileId || config?.credential_profile_id || "local-user")),
        scope,
        scopeId,
        scopeProfile: cacheScopeProfile(plan),
        stablePromptVersion: String(plan?.cacheAffinity?.stablePromptVersion || exports.CCM_STABLE_PROMPT_VERSION),
    };
}
function cacheRouteObservationKey(identity) {
    return hash(identity, 64);
}
function currentRouteShardCount(identity) {
    const observation = cacheRouteObservations.get(cacheRouteObservationKey(identity));
    return observation?.shardCount || 1;
}
/** Record real Provider cache usage for conservative high-traffic routing. */
function observeAutomaticProviderCacheRouting(config, plan, matrix, input) {
    const identity = cacheRouteIdentity(config, plan, matrix);
    const key = cacheRouteObservationKey(identity);
    const now = Date.now();
    const previous = cacheRouteObservations.get(key) || { timestamps: [], missStreak: 0, shardCount: 1 };
    const timestamps = previous.timestamps.filter(value => now - value <= CACHE_ROUTE_WINDOW_MS);
    timestamps.push(now);
    const hit = typeof input === "boolean" ? input : input.hit === true;
    const excludedReason = new Set([
        "cold_start", "ttl_expired", "stable_prefix_changed", "schema_changed",
        "tool_schema_changed", "compaction_boundary_changed", "ccm_projection_changed",
        "transcript_projection_changed", "provider_usage_unreported", "provider_usage_not_reported",
        "prefix_below_provider_threshold", "native_fields_unproven",
    ]).has(String(typeof input === "boolean" ? "" : input.missReason || ""));
    const eligible = typeof input === "boolean"
        ? false
        : input.eligible === true && !excludedReason;
    if (!eligible) {
        cacheRouteObservations.set(key, { timestamps: timestamps.slice(-120), missStreak: 0, shardCount: 1 });
        return { shardCount: 1, missStreak: 0, trafficPerMinute: timestamps.length, eligible: false };
    }
    const missStreak = hit ? 0 : previous.missStreak + 1;
    let shardCount = previous.shardCount;
    if (shardCount === 1 && timestamps.length >= CACHE_ROUTE_HIGH_TRAFFIC && missStreak >= 3)
        shardCount = 2;
    else if (shardCount === 2 && timestamps.length >= CACHE_ROUTE_HIGH_TRAFFIC * 2 && missStreak >= 6)
        shardCount = 4;
    cacheRouteObservations.set(key, { timestamps: timestamps.slice(-120), missStreak, shardCount, lastEligibleAt: now });
    if (cacheRouteObservations.size > 512) {
        const oldest = [...cacheRouteObservations.entries()].sort((left, right) => (left[1].timestamps.at(-1) || 0) - (right[1].timestamps.at(-1) || 0))[0]?.[0];
        if (oldest)
            cacheRouteObservations.delete(oldest);
    }
    return { shardCount, missStreak, trafficPerMinute: timestamps.length, eligible: true };
}
function workspaceIdentityChecksum() {
    return hash({
        product: "ccm",
        host: os.hostname().toLowerCase(),
        workspaceRoot: runtime_paths_1.DEFAULT_CCM_DIR,
    });
}
function buildAutomaticProviderCacheKey(config, plan, matrix) {
    const routeIdentity = cacheRouteIdentity(config, plan, matrix);
    const shardCount = currentRouteShardCount(routeIdentity);
    const sessionShard = shardCount > 1 ? hash({ sessionId: String(plan?.sessionId || plan?.exactSessionId || ""), shardCount }, 4) : "0";
    const digest = hash({
        ...routeIdentity,
        deterministicShard: `${shardCount}:${sessionShard}`,
    }, 48);
    return `ccm-${digest}`;
}
function automaticProviderCacheTtl(matrix) {
    // Prefer the longest explicitly confirmed retention, while keeping the
    // provider's default as the safe fallback.  The 24h value is retained for
    // existing Chat Completions gateways even though the public lifecycle
    // projection exposes it as provider-managed/unknown.
    if (matrix.supportedTtls.includes("1h"))
        return "1h";
    if (matrix.supportedTtls.includes("30m"))
        return "30m";
    if (matrix.supportedTtls.includes("24h"))
        return "24h";
    return "provider_default";
}
function aggregateCapabilityStatus(matrix) {
    const values = Object.values(matrix.capabilities);
    if (values.some(value => value === "confirmed"))
        return "confirmed";
    if (values.some(value => value === "degraded"))
        return "degraded";
    if (values.some(value => value === "unsupported"))
        return "unsupported";
    return "unproven";
}
function buildAutomaticCacheOptimizationProjection(input) {
    const matrix = input.matrix || {
        schema: "ccm-provider-cache-capability-matrix-v1",
        transportIdentityChecksum: "",
        protocol: "custom",
        capabilities: {
            implicitPrefix: "unproven",
            explicitCacheKey: "unproven",
            explicitBreakpoints: "unproven",
            blockCacheControl: "unproven",
            nativeCacheEditing: "unproven",
            cacheUsageReporting: "unproven",
        },
        supportedTtls: ["provider_default"],
        evidenceUpdatedAt: "",
        contentStored: false,
    };
    const execution = input.execution || {};
    const effectiveStrategy = execution.breakpointMode && execution.breakpointMode !== "none"
        ? "explicit_breakpoints"
        : execution.keyMode && execution.keyMode !== "none"
            ? "explicit_cache_key"
            : execution.prefixMode === "implicit"
                ? "implicit_prefix"
                : "stable_prefix_only";
    return {
        schema: "ccm-automatic-cache-optimization-v1",
        enabled: true,
        effectiveStrategy,
        cacheKeyScope: "workspace_scope_profile",
        stableCoreChecksum: String(input.stableCoreChecksum || ""),
        stableCoreTokens: Math.max(0, Number(input.stableCoreTokens || 0)),
        capabilityStatus: aggregateCapabilityStatus(matrix),
        ...(input.fallbackReason ? { fallbackReason: String(input.fallbackReason) } : {}),
        prefixChangeReasons: Array.isArray(input.prefixChangeReasons) ? input.prefixChangeReasons.map(String).slice(0, 12) : [],
        ...(input.cacheAffinity ? { agentCacheAffinity: {
                agentRole: input.cacheAffinity.agentRole,
                stage: input.cacheAffinity.stage,
                runtimeOwnership: input.cacheAffinity.runtimeOwnership,
                stablePromptVersion: input.cacheAffinity.stablePromptVersion,
                cacheKeyProfile: input.cacheAffinity.cacheKeyProfile,
            } } : {}),
        contentStored: false,
    };
}
function automaticProviderCacheEnabled() {
    return process.env.CCM_DISABLE_PROVIDER_CACHE !== "1";
}
function runAutomaticProviderCacheOptimizationSelfTest() {
    const matrix = {
        schema: "ccm-provider-cache-capability-matrix-v1",
        transportIdentityChecksum: hash("transport"),
        protocol: "responses",
        capabilities: {
            implicitPrefix: "confirmed",
            explicitCacheKey: "confirmed",
            explicitBreakpoints: "confirmed",
            blockCacheControl: "unproven",
            nativeCacheEditing: "unproven",
            cacheUsageReporting: "confirmed",
        },
        supportedTtls: ["provider_default", "30m"],
        evidenceUpdatedAt: "",
        contentStored: false,
    };
    const config = { model: "selftest", userId: "user-a" };
    const key = (plan) => buildAutomaticProviderCacheKey(config, plan, matrix);
    const projectA = key({ scope: "project", scopeId: "project-a", sessionId: "s1", generation: 1, boundaryGeneration: 0 });
    const projectAOtherSession = key({ scope: "project", scopeId: "project-a", sessionId: "s2", generation: 7, boundaryGeneration: 3 });
    const groupA = key({ scope: "group", scopeId: "group-a", sessionId: "g1" });
    const globalA = key({ scope: "global", scopeId: "global", sessionId: "x" });
    const testPlanFirst = (0, agent_cache_affinity_1.testAgentCacheAffinity)({
        scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "test-session-1", taskId: "task-1", stage: "test_plan",
    });
    const testPlanSecond = (0, agent_cache_affinity_1.testAgentCacheAffinity)({
        scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "test-session-2", taskId: "task-2", stage: "test_plan",
    });
    const testFollowup = (0, agent_cache_affinity_1.testAgentCacheAffinity)({
        scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "test-session-2", taskId: "task-2", stage: "test_followup",
    });
    const testPlanKey = key({ scope: "project", scopeId: "project-a", sessionId: "test-session-1", cacheAffinity: testPlanFirst });
    const testPlanOtherSessionKey = key({ scope: "project", scopeId: "project-a", sessionId: "test-session-2", cacheAffinity: testPlanSecond });
    const testFollowupKey = key({ scope: "project", scopeId: "project-a", sessionId: "test-session-2", cacheAffinity: testFollowup });
    const routingPlan = { scope: "project", scopeId: "busy-project", sessionId: "session-a" };
    const routingConfig = { ...config, model: "routing-selftest" };
    const routingMatrix = matrix;
    const routingKeyBefore = buildAutomaticProviderCacheKey(routingConfig, routingPlan, routingMatrix);
    for (let index = 0; index < 18; index += 1)
        observeAutomaticProviderCacheRouting(routingConfig, routingPlan, routingMatrix, {
            hit: false,
            eligible: true,
            stablePrefixChecksum: "stable",
            promptCacheKeyChecksum: "key",
        });
    const routingKeyAfter = buildAutomaticProviderCacheKey(routingConfig, routingPlan, routingMatrix);
    const routingKeyAfterRepeat = buildAutomaticProviderCacheKey(routingConfig, routingPlan, routingMatrix);
    const checks = {
        projectSessionsShareRoute: projectA === projectAOtherSession,
        projectsStayIsolated: projectA !== key({ scope: "project", scopeId: "project-b", sessionId: "s1" }),
        groupsStayIsolated: groupA !== key({ scope: "group", scopeId: "group-b", sessionId: "g1" }),
        globalSessionsShareRoute: globalA === key({ scope: "global", scopeId: "global", sessionId: "y", generation: 9 }),
        scopesStayIsolated: new Set([projectA, groupA, globalA]).size === 3,
        testAgentProjectSessionsSharePlanRoute: testPlanKey === testPlanOtherSessionKey,
        testAgentStagesStayIsolated: testPlanKey !== testFollowupKey,
        keyLengthSafe: [projectA, groupA, globalA].every(value => value.length <= 64),
        highTrafficRoutingShardIsStable: routingKeyAfter !== routingKeyBefore && routingKeyAfter === routingKeyAfterRepeat,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=automatic-provider-cache-optimization.js.map