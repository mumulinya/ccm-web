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
exports.testAgentHardeningChecksum = testAgentHardeningChecksum;
exports.resolveTestAgentHardeningConfig = resolveTestAgentHardeningConfig;
exports.inferTestAgentRiskTier = inferTestAgentRiskTier;
exports.buildTestAgentHardeningPolicy = buildTestAgentHardeningPolicy;
exports.validateTestAgentHardeningPolicy = validateTestAgentHardeningPolicy;
exports.testAgentTierAtLeast = testAgentTierAtLeast;
exports.plannerFallbackAllowed = plannerFallbackAllowed;
exports.isOperationalPlanningFailure = isOperationalPlanningFailure;
exports.runTestAgentHardeningPolicySelfTest = runTestAgentHardeningPolicySelfTest;
const crypto = __importStar(require("crypto"));
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const TIER_RANK = {
    lightweight: 0,
    standard: 1,
    interactive: 2,
    critical: 3,
};
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function testAgentHardeningChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}
function enumValue(value, allowed, fallback) {
    const normalized = String(value || "").trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : fallback;
}
function taskOverride(task) {
    return task?.testAgentHardeningOverride
        || task?.test_agent_hardening_override
        || task?.contextPolicy?.testAgentHardening
        || task?.context_policy?.test_agent_hardening
        || {};
}
/** Project/group task overrides may only strengthen the global policy. */
function resolveTestAgentHardeningConfig(globalConfig, task = null) {
    const override = taskOverride(task);
    const globalSurfaceAuditMode = globalConfig?.testAgentSurfaceAuditMode || "strict";
    const plannerRank = { always: 0, risk_based: 1, never: 2 };
    const isolationRank = { sandbox_preferred: 0, strict_allowlist: 1, sandbox_required: 2 };
    const spotRank = { off: 0, policy: 1, required: 2 };
    const stronger = (base, next, ranks) => {
        const current = String(base || "");
        const candidate = String(next || "");
        return candidate in ranks && (ranks[candidate] ?? -1) >= (ranks[current] ?? -1) ? candidate : current;
    };
    return {
        ...globalConfig,
        testAgentPlannerFallbackMode: stronger(globalConfig?.testAgentPlannerFallbackMode || "risk_based", override?.testAgentPlannerFallbackMode || override?.test_agent_planner_fallback_mode, plannerRank),
        testAgentIsolationMode: stronger(globalConfig?.testAgentIsolationMode || "sandbox_preferred", override?.testAgentIsolationMode || override?.test_agent_isolation_mode, isolationRank),
        testAgentPostReviewSpotCheckMode: stronger(globalConfig?.testAgentPostReviewSpotCheckMode || "policy", override?.testAgentPostReviewSpotCheckMode || override?.test_agent_post_review_spot_check_mode, spotRank),
        testAgentSurfaceAuditMode: globalSurfaceAuditMode === "strict" || (override?.testAgentSurfaceAuditMode || override?.test_agent_surface_audit_mode) === "strict" ? "strict" : "warn",
        testAgentReadonlyCapabilityInjection: globalConfig?.testAgentReadonlyCapabilityInjection !== false || override?.testAgentReadonlyCapabilityInjection === true || override?.test_agent_readonly_capability_injection === true,
        testAgentRuntimeFingerprintEnabled: globalConfig?.testAgentRuntimeFingerprintEnabled !== false || override?.testAgentRuntimeFingerprintEnabled === true || override?.test_agent_runtime_fingerprint_enabled === true,
    };
}
function inferTestAgentRiskTier(input) {
    const direct = String(input?.riskTier
        || input?.tier
        || input?.reviewPolicy?.tier
        || input?.review_policy?.tier
        || input?.verificationProfile?.tier
        || input?.verification_profile?.tier
        || input?.workflow_meta?.project_main_plan?.verificationProfile?.tier
        || "").trim().toLowerCase();
    if (["lightweight", "standard", "interactive", "critical"].includes(direct))
        return direct;
    const risk = String(input?.riskLevel || input?.risk_level || input?.workflowDecision?.riskLevel || input?.workflow_decision?.riskLevel || "").toLowerCase();
    if (risk === "high" || input?.requires_confirmation === true || input?.requiresConfirmation === true)
        return "critical";
    if (input?.browserEnabled === true || input?.requiresBrowser === true || input?.changeClass === "interactive")
        return "interactive";
    if (input?.requires_code_changes === true || input?.requiresCodeChanges === true || input?.changeClass === "code")
        return "standard";
    return "lightweight";
}
function buildTestAgentHardeningPolicy(input = {}) {
    const config = resolveTestAgentHardeningConfig(input.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)(), input.task);
    const riskTier = input.riskTier || inferTestAgentRiskTier({ ...(input.task || {}), reviewPolicy: input.reviewPolicy });
    const plannerFallbackMode = enumValue(config.testAgentPlannerFallbackMode, ["risk_based", "always", "never"], "risk_based");
    const isolationMode = enumValue(config.testAgentIsolationMode, ["sandbox_preferred", "sandbox_required", "strict_allowlist"], "sandbox_preferred");
    const configuredSurfaceAuditMode = enumValue(config.testAgentSurfaceAuditMode, ["strict", "warn"], "strict");
    const surfaceAuditMode = TIER_RANK[riskTier] >= TIER_RANK.interactive
        ? "strict"
        : configuredSurfaceAuditMode;
    const postReviewSpotCheckMode = enumValue(config.testAgentPostReviewSpotCheckMode, ["policy", "required", "off"], "policy");
    const readonlyCapabilityInjection = config.testAgentReadonlyCapabilityInjection !== false;
    const runtimeFingerprintEnabled = config.testAgentRuntimeFingerprintEnabled !== false || TIER_RANK[riskTier] >= TIER_RANK.interactive;
    const requiresSurfaceAudit = surfaceAuditMode === "strict" || TIER_RANK[riskTier] >= TIER_RANK.standard;
    const requiresRuntimeFingerprint = runtimeFingerprintEnabled || TIER_RANK[riskTier] >= TIER_RANK.interactive;
    const requiresSpotCheck = postReviewSpotCheckMode === "required"
        || (postReviewSpotCheckMode === "policy" && TIER_RANK[riskTier] >= TIER_RANK.standard)
        || (riskTier === "critical");
    const core = {
        schema: "ccm-test-agent-hardening-policy-v1",
        version: 1,
        riskTier,
        plannerFallbackMode,
        isolationMode,
        readonlyCapabilityInjection,
        surfaceAuditMode,
        runtimeFingerprintEnabled,
        postReviewSpotCheckMode,
        requiresSurfaceAudit,
        requiresRuntimeFingerprint,
        requiresSpotCheck,
    };
    return { ...core, checksum: testAgentHardeningChecksum(core) };
}
function validateTestAgentHardeningPolicy(value) {
    if (!value || value.schema !== "ccm-test-agent-hardening-policy-v1" || value.version !== 1) {
        return { valid: false, reason: "hardening_policy_missing", policy: null };
    }
    const { checksum, ...core } = value;
    if (!checksum || testAgentHardeningChecksum(core) !== checksum) {
        return { valid: false, reason: "hardening_policy_checksum_mismatch", policy: null };
    }
    return { valid: true, reason: "ok", policy: value };
}
function testAgentTierAtLeast(value, minimum) {
    return TIER_RANK[value] >= TIER_RANK[minimum];
}
function plannerFallbackAllowed(input) {
    const { policy } = input;
    if (!input.hasDeterministicChecks || policy.riskTier === "critical" || policy.plannerFallbackMode === "never")
        return false;
    if (policy.plannerFallbackMode === "always")
        return true;
    if (policy.riskTier === "interactive")
        return input.hasPredeclaredInteractiveChecks === true && input.isolationReady === true;
    return policy.riskTier === "lightweight" || policy.riskTier === "standard";
}
function isOperationalPlanningFailure(error) {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || error || "").toLowerCase();
    if (/permission|unauthori[sz]ed|forbidden|unsafe|scope|schema.*security|handoff.*invalid/.test(`${code} ${message}`))
        return false;
    return /timeout|timed out|abort|provider|connection|network|fetch|invalid json|empty response|unavailable|429|5\d\d/.test(`${code} ${message}`);
}
function runTestAgentHardeningPolicySelfTest() {
    const standard = buildTestAgentHardeningPolicy({
        config: {},
        riskTier: "standard",
    });
    const critical = buildTestAgentHardeningPolicy({
        config: {},
        riskTier: "critical",
    });
    return {
        pass: validateTestAgentHardeningPolicy(standard).valid
            && plannerFallbackAllowed({ policy: standard, hasDeterministicChecks: true })
            && !plannerFallbackAllowed({ policy: critical, hasDeterministicChecks: true })
            && standard.surfaceAuditMode === "strict"
            && critical.surfaceAuditMode === "strict"
            && critical.requiresSpotCheck
            && critical.requiresRuntimeFingerprint,
        standard,
        critical,
    };
}
//# sourceMappingURL=hardening-policy.js.map