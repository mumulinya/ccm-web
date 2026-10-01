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
exports.CCM_CACHE_KEY_PREFIX = exports.CCM_CACHE_ROUTE_VERSION = exports.CCM_STABLE_PROMPT_VERSION = void 0;
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
const provider_cache_transcript_1 = require("./provider-cache-transcript");
exports.CCM_STABLE_PROMPT_VERSION = "ccm-main-agent-stable-core-v2";
// A public-profile wire contract changes the cache identity.  The prompt
// cache route is deliberately branched by conversation: public prefix
// evidence remains comparable, but a provider must not make unrelated full
// transcript branches compete for one cache lane.
exports.CCM_CACHE_ROUTE_VERSION = 11;
exports.CCM_CACHE_KEY_PREFIX = "ccm-v11-";
function hash(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, length);
}
const MAIN_AGENT_ROLES = new Set(["project_main", "group_main", "global_main"]);
function isUnifiedMainAffinity(affinity) {
    const role = String(affinity?.agentRole || "").trim().toLowerCase();
    const stage = String(affinity?.stage || "").trim().toLowerCase();
    const profile = String(affinity?.cacheKeyProfile || "").trim().toLowerCase();
    return MAIN_AGENT_ROLES.has(role)
        && (stage === "main_tool_loop" || (!stage && profile === `${role}:main_tool_loop`));
}
function cacheScopeProfile(plan) {
    const explicit = String(plan?.cacheAffinity?.cacheKeyProfile || "").trim();
    const requestClass = String(plan?.requestClass || "").trim().toLowerCase();
    // The request owner can identify an auxiliary/probe call even when a
    // legacy affinity still describes the parent main loop.
    if (requestClass === "probe")
        return explicit ? `probe:${explicit}` : "probe";
    if (requestClass === "auxiliary")
        return explicit ? `auxiliary:${explicit}` : "auxiliary";
    if (isUnifiedMainAffinity(plan?.cacheAffinity))
        return "main_agent:main_tool_loop";
    if (explicit)
        return explicit;
    const source = String(plan?.source || "").toLowerCase();
    if (/probe|capability/.test(source))
        return "probe";
    if (/summary|title|memory|compact|review|suggest|secondary|semantic|synthesis|distill|extract/.test(source))
        return "auxiliary";
    return "main_agent:main_tool_loop";
}
function cacheStablePromptVersion(plan) {
    if (cacheScopeProfile(plan) === "main_agent:main_tool_loop")
        return exports.CCM_STABLE_PROMPT_VERSION;
    return String(plan?.cacheAffinity?.stablePromptVersion || exports.CCM_STABLE_PROMPT_VERSION);
}
function conversationBranchChecksum(plan) {
    const requestClass = String(plan?.requestClass || "").trim().toLowerCase();
    // Capability probes have no conversation transcript and must remain
    // independent from user-session branches.  Normal foreground and
    // auxiliary calls are isolated by their durable scope/session identity;
    // turn/attempt/generation are intentionally excluded so the branch stays
    // stable across messages, retries, and restarts.
    if (requestClass === "probe")
        return "";
    const scope = String(plan?.scope || "").trim();
    const scopeId = String(plan?.scopeId || "").trim();
    const sessionId = String(plan?.sessionId || "").trim();
    if (!scope || !scopeId || !sessionId)
        return "";
    return hash({ scope, scopeId, sessionId }, 32);
}
function cacheRouteIdentity(config, plan, matrix) {
    // The routing key identifies a provider cache namespace, not the complete
    // conversation. Prefer the explicit workspace-public checksum. The former
    // implementation preferred stablePrefixChecksum, which includes
    // project/role-specific identity rules and therefore split projects before
    // the provider could compare their equal public prefix. Private/session
    // material remains in the request and is never placed in this key.
    const publicPrefixChecksum = String(plan?.publicStablePrefixChecksum || "").trim();
    const stablePrefixChecksum = publicPrefixChecksum || String(plan?.stablePrefixChecksum || "").trim();
    return {
        version: exports.CCM_CACHE_ROUTE_VERSION,
        wireLayoutVersion: String(plan?.wireLayoutVersion || provider_cache_transcript_1.PROVIDER_CACHE_WIRE_LAYOUT_VERSION),
        transportIdentityChecksum: matrix.transportIdentityChecksum,
        model: String(config?.model || ""),
        workspaceIdentityChecksum: workspaceIdentityChecksum(),
        userIdentityChecksum: hash({
            user: String(config?.userId || config?.user_id || "local-user"),
            credentialProfile: String(config?.credentialProfileId || config?.credential_profile_id || ""),
        }),
        // Public fields describe the comparable prefix.  The branch identity is
        // separate from those fields so a provider does not reuse or evict a
        // complete private transcript when another conversation is active.
        scope: "workspace_conversation",
        scopeId: "workspace",
        ...(publicPrefixChecksum
            ? { publicPrefixChecksum }
            : stablePrefixChecksum ? { stablePrefixChecksum } : {}),
        publicInstructionChecksum: String(plan?.publicInstructionChecksum || ""),
        publicInstructionProfileVersion: String(plan?.publicInstructionProfileVersion || ""),
        publicToolProfileChecksum: String(plan?.publicToolProfileChecksum || ""),
        publicToolSchemaChecksum: String(plan?.publicToolSchemaChecksum || ""),
        publicToolSchemaVersion: String(plan?.publicToolSchemaVersion || ""),
        publicProfileVersion: String(plan?.publicProfileVersion || ""),
        conversationBranchChecksum: conversationBranchChecksum(plan),
        scopeProfile: cacheScopeProfile(plan),
        stablePromptVersion: cacheStablePromptVersion(plan),
    };
}
/** Usage is observational; misses must never rotate a shared routing key. */
function observeAutomaticProviderCacheRouting(config, plan, matrix, input) {
    return { shardCount: 1, missStreak: 0, trafficPerMinute: 0, eligible: false };
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
    return `${exports.CCM_CACHE_KEY_PREFIX}${hash(routeIdentity, 48)}`;
}
function automaticProviderCacheTtl(matrix) {
    // Capability is not a retention preference. Normal calls use the provider
    // default even when an older persisted matrix advertises a longer lifetime.
    void matrix;
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
            responsesContinuation: "unproven",
            responsesToolLoopContinuation: "unproven",
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
        cacheKeyScope: "conversation_branch",
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
            responsesContinuation: "confirmed",
            responsesToolLoopContinuation: "confirmed",
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
    const mainAffinity = (role, stablePromptVersion) => ({
        agentRole: role,
        stage: "main_tool_loop",
        cacheKeyProfile: `${role}:main_tool_loop`,
        stablePromptVersion,
    });
    const projectMainKey = key({ scope: "project", scopeId: "project-a", sessionId: "project-main", cacheAffinity: mainAffinity("project_main", "ccm-project-main-stable-core-v2") });
    const groupMainKey = key({ scope: "group", scopeId: "group-a", sessionId: "group-main", cacheAffinity: mainAffinity("group_main", "ccm-group-main-stable-core-v2") });
    const globalMainKey = key({ scope: "global", scopeId: "global", sessionId: "global-main", cacheAffinity: mainAffinity("global_main", "ccm-global-main-stable-core-v2") });
    const auxiliaryKey = key({ scope: "group", scopeId: "group-a", sessionId: "group-review", cacheAffinity: {
            agentRole: "group_main", stage: "coordination_review", cacheKeyProfile: "group_main:coordination_review", stablePromptVersion: "ccm-coordination-review-stable-core-v2",
        } });
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
    const samePublicDifferentPrivateA = key({
        scope: "project", scopeId: "project-a", sessionId: "private-a",
        stablePrefixChecksum: "scope-private-a", publicStablePrefixChecksum: "workspace-public",
    });
    const samePublicDifferentPrivateB = key({
        scope: "project", scopeId: "project-b", sessionId: "private-b",
        stablePrefixChecksum: "scope-private-b", publicStablePrefixChecksum: "workspace-public",
    });
    const differentPublic = key({
        scope: "project", scopeId: "project-c", sessionId: "private-c",
        stablePrefixChecksum: "scope-private-c", publicStablePrefixChecksum: "workspace-public-v2",
    });
    const checks = {
        projectSessionsAreIsolated: projectA !== projectAOtherSession,
        projectsAreIsolated: projectA !== key({ scope: "project", scopeId: "project-b", sessionId: "s1" }),
        groupsAreIsolated: groupA !== key({ scope: "group", scopeId: "group-b", sessionId: "g1" }),
        globalSessionsAreIsolated: globalA !== key({ scope: "global", scopeId: "global", sessionId: "y", generation: 9 }),
        scopesAreIsolated: new Set([projectA, groupA, globalA]).size === 3,
        projectsWithSamePublicPrefixAreIsolated: samePublicDifferentPrivateA !== samePublicDifferentPrivateB,
        projectsWithDifferentPublicPrefixStayIsolated: samePublicDifferentPrivateA !== differentPublic,
        testAgentProjectSessionsAreIsolated: testPlanKey !== testPlanOtherSessionKey,
        testAgentStagesStayIsolated: testPlanKey !== testFollowupKey,
        mainScopesUseSeparateConversationBranches: new Set([projectMainKey, groupMainKey, globalMainKey]).size === 3,
        auxiliaryStageStaysIsolatedFromMain: auxiliaryKey !== projectMainKey,
        auxiliaryRequestOverridesInheritedMainAffinity: projectMainKey !== key({ scope: "project", requestClass: "auxiliary",
            cacheAffinity: mainAffinity("project_main", "ccm-project-main-stable-core-v2") }),
        probeRequestOverridesInheritedMainAffinity: projectMainKey !== key({ scope: "project", requestClass: "probe",
            cacheAffinity: mainAffinity("project_main", "ccm-project-main-stable-core-v2") }),
        routeAndWireVersionsAlign: exports.CCM_CACHE_KEY_PREFIX === `ccm-v${exports.CCM_CACHE_ROUTE_VERSION}-`
            && String(provider_cache_transcript_1.PROVIDER_CACHE_WIRE_LAYOUT_VERSION).endsWith(`-v${exports.CCM_CACHE_ROUTE_VERSION}`),
        keyLengthSafe: [projectA, groupA, globalA].every(value => value.length <= 64),
        highTrafficExactSessionKeyStaysStable: routingKeyAfter === routingKeyBefore && routingKeyAfter === routingKeyAfterRepeat,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=automatic-provider-cache-optimization.js.map