import * as crypto from "crypto";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";

export type TestAgentHardeningRiskTier = "lightweight" | "standard" | "interactive" | "critical";
export type TestAgentPlannerFallbackMode = "risk_based" | "always" | "never";
export type TestAgentIsolationMode = "sandbox_preferred" | "sandbox_required" | "strict_allowlist";
export type TestAgentSurfaceAuditMode = "strict" | "warn";
export type TestAgentPostReviewSpotCheckMode = "policy" | "required" | "off";

export type TestAgentHardeningPolicyV1 = {
  schema: "ccm-test-agent-hardening-policy-v1";
  version: 1;
  riskTier: TestAgentHardeningRiskTier;
  plannerFallbackMode: TestAgentPlannerFallbackMode;
  isolationMode: TestAgentIsolationMode;
  readonlyCapabilityInjection: boolean;
  surfaceAuditMode: TestAgentSurfaceAuditMode;
  runtimeFingerprintEnabled: boolean;
  postReviewSpotCheckMode: TestAgentPostReviewSpotCheckMode;
  requiresSurfaceAudit: boolean;
  requiresRuntimeFingerprint: boolean;
  requiresSpotCheck: boolean;
  checksum: string;
};

const TIER_RANK: Record<TestAgentHardeningRiskTier, number> = {
  lightweight: 0,
  standard: 1,
  interactive: 2,
  critical: 3,
};

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

export function testAgentHardeningChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}

function enumValue<T extends string>(value: any, allowed: readonly T[], fallback: T): T {
  const normalized = String(value || "").trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function taskOverride(task: any) {
  return task?.testAgentHardeningOverride
    || task?.test_agent_hardening_override
    || task?.contextPolicy?.testAgentHardening
    || task?.context_policy?.test_agent_hardening
    || {};
}

/** Project/group task overrides may only strengthen the global policy. */
export function resolveTestAgentHardeningConfig(globalConfig: any, task: any = null) {
  const override = taskOverride(task);
  const globalSurfaceAuditMode = globalConfig?.testAgentSurfaceAuditMode || "strict";
  const plannerRank: Record<string, number> = { always: 0, risk_based: 1, never: 2 };
  const isolationRank: Record<string, number> = { sandbox_preferred: 0, strict_allowlist: 1, sandbox_required: 2 };
  const spotRank: Record<string, number> = { off: 0, policy: 1, required: 2 };
  const stronger = (base: any, next: any, ranks: Record<string, number>) => {
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

export function inferTestAgentRiskTier(input: any): TestAgentHardeningRiskTier {
  const direct = String(
    input?.riskTier
      || input?.tier
      || input?.reviewPolicy?.tier
      || input?.review_policy?.tier
      || input?.verificationProfile?.tier
      || input?.verification_profile?.tier
      || input?.workflow_meta?.project_main_plan?.verificationProfile?.tier
      || "",
  ).trim().toLowerCase();
  if (["lightweight", "standard", "interactive", "critical"].includes(direct)) return direct as TestAgentHardeningRiskTier;
  const risk = String(input?.riskLevel || input?.risk_level || input?.workflowDecision?.riskLevel || input?.workflow_decision?.riskLevel || "").toLowerCase();
  if (risk === "high" || input?.requires_confirmation === true || input?.requiresConfirmation === true) return "critical";
  if (input?.browserEnabled === true || input?.requiresBrowser === true || input?.changeClass === "interactive") return "interactive";
  if (input?.requires_code_changes === true || input?.requiresCodeChanges === true || input?.changeClass === "code") return "standard";
  return "lightweight";
}

export function buildTestAgentHardeningPolicy(input: {
  config?: any;
  task?: any;
  reviewPolicy?: any;
  riskTier?: TestAgentHardeningRiskTier;
} = {}): TestAgentHardeningPolicyV1 {
  const config = resolveTestAgentHardeningConfig(input.config || loadOrchestratorConfig(), input.task);
  const riskTier = input.riskTier || inferTestAgentRiskTier({ ...(input.task || {}), reviewPolicy: input.reviewPolicy });
  const plannerFallbackMode = enumValue<TestAgentPlannerFallbackMode>(
    config.testAgentPlannerFallbackMode,
    ["risk_based", "always", "never"],
    "risk_based",
  );
  const isolationMode = enumValue<TestAgentIsolationMode>(
    config.testAgentIsolationMode,
    ["sandbox_preferred", "sandbox_required", "strict_allowlist"],
    "sandbox_preferred",
  );
  const configuredSurfaceAuditMode = enumValue<TestAgentSurfaceAuditMode>(
    config.testAgentSurfaceAuditMode,
    ["strict", "warn"],
    "strict",
  );
  const surfaceAuditMode = TIER_RANK[riskTier] >= TIER_RANK.interactive
    ? "strict"
    : configuredSurfaceAuditMode;
  const postReviewSpotCheckMode = enumValue<TestAgentPostReviewSpotCheckMode>(
    config.testAgentPostReviewSpotCheckMode,
    ["policy", "required", "off"],
    "policy",
  );
  const readonlyCapabilityInjection = config.testAgentReadonlyCapabilityInjection !== false;
  const runtimeFingerprintEnabled = config.testAgentRuntimeFingerprintEnabled !== false || TIER_RANK[riskTier] >= TIER_RANK.interactive;
  const requiresSurfaceAudit = surfaceAuditMode === "strict" || TIER_RANK[riskTier] >= TIER_RANK.standard;
  const requiresRuntimeFingerprint = runtimeFingerprintEnabled || TIER_RANK[riskTier] >= TIER_RANK.interactive;
  const requiresSpotCheck = postReviewSpotCheckMode === "required"
    || (postReviewSpotCheckMode === "policy" && TIER_RANK[riskTier] >= TIER_RANK.standard)
    || (riskTier === "critical");
  const core = {
    schema: "ccm-test-agent-hardening-policy-v1" as const,
    version: 1 as const,
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

export function validateTestAgentHardeningPolicy(value: any) {
  if (!value || value.schema !== "ccm-test-agent-hardening-policy-v1" || value.version !== 1) {
    return { valid: false, reason: "hardening_policy_missing", policy: null as TestAgentHardeningPolicyV1 | null };
  }
  const { checksum, ...core } = value;
  if (!checksum || testAgentHardeningChecksum(core) !== checksum) {
    return { valid: false, reason: "hardening_policy_checksum_mismatch", policy: null };
  }
  return { valid: true, reason: "ok", policy: value as TestAgentHardeningPolicyV1 };
}

export function testAgentTierAtLeast(value: TestAgentHardeningRiskTier, minimum: TestAgentHardeningRiskTier) {
  return TIER_RANK[value] >= TIER_RANK[minimum];
}

export function plannerFallbackAllowed(input: {
  policy: TestAgentHardeningPolicyV1;
  hasDeterministicChecks: boolean;
  hasPredeclaredInteractiveChecks?: boolean;
  isolationReady?: boolean;
}) {
  const { policy } = input;
  if (!input.hasDeterministicChecks || policy.riskTier === "critical" || policy.plannerFallbackMode === "never") return false;
  if (policy.plannerFallbackMode === "always") return true;
  if (policy.riskTier === "interactive") return input.hasPredeclaredInteractiveChecks === true && input.isolationReady === true;
  return policy.riskTier === "lightweight" || policy.riskTier === "standard";
}

export function isOperationalPlanningFailure(error: any) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  if (/permission|unauthori[sz]ed|forbidden|unsafe|scope|schema.*security|handoff.*invalid/.test(`${code} ${message}`)) return false;
  return /timeout|timed out|abort|provider|connection|network|fetch|invalid json|empty response|unavailable|429|5\d\d/.test(`${code} ${message}`);
}

export function runTestAgentHardeningPolicySelfTest() {
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
