"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_EVIDENCE_POLICY_SCHEMA = void 0;
exports.resolveEvidencePolicy = resolveEvidencePolicy;
exports.isPlanReviewPassed = isPlanReviewPassed;
exports.runEvidencePolicySelfTest = runEvidencePolicySelfTest;
exports.CCM_EVIDENCE_POLICY_SCHEMA = "ccm-evidence-policy-v1";
function clean(value) {
    return String(value || "").trim().toLowerCase();
}
function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function rank(level) {
    return level === "strict" ? 2 : level === "lightweight" ? 1 : 0;
}
function resolveEvidencePolicy(input = {}) {
    const projects = unique((Array.isArray(input.targetProjects) ? input.targetProjects : []).map(item => String(item || "").trim()));
    const riskLevel = clean(input.riskLevel);
    const modes = new Set((Array.isArray(input.verificationModes) ? input.verificationModes : []).map(clean));
    const changeClass = clean(input.changeClass);
    const reasons = [];
    let level = input.requiresCodeChanges === true ? "lightweight" : "none";
    if (level === "lightweight")
        reasons.push("single_project_development_default");
    const strictSignals = [
        [projects.length > 1, "multi_project"],
        [riskLevel === "high", "high_risk"],
        [input.hasArchitectureOrPublicContractChange === true, "architecture_or_public_contract"],
        [input.hasPermissionOrSecurityChange === true, "permission_or_security"],
        [input.hasMigration === true, "migration"],
        [input.hasReleaseOrDeployment === true || modes.has("release"), "release_or_deployment"],
        [input.destructive === true, "destructive_operation"],
        [input.scopeExpanded === true, "scope_expansion"],
        [changeClass === "critical", "critical_change_class"],
    ];
    for (const [active, reason] of strictSignals) {
        if (!active)
            continue;
        level = "strict";
        reasons.push(reason);
    }
    const previousLevel = input.previousLevel;
    if (previousLevel && rank(previousLevel) > rank(level)) {
        level = previousLevel;
        reasons.push("previous_policy_preserved");
    }
    if (level === "none")
        reasons.push("no_code_change");
    return {
        schema: exports.CCM_EVIDENCE_POLICY_SCHEMA,
        level,
        source: "server_policy",
        reasons: unique(reasons),
        sourceGroundingRequired: level !== "none",
        perFileEvidenceRequired: level === "strict",
        verificationEvidenceRequired: level !== "none",
        contentStored: false,
    };
}
function isPlanReviewPassed(verdict) {
    return verdict === "passed" || verdict === "passed_with_warnings";
}
function runEvidencePolicySelfTest() {
    const none = resolveEvidencePolicy({ requiresCodeChanges: false });
    const lightweight = resolveEvidencePolicy({ requiresCodeChanges: true, targetProjects: ["web"], riskLevel: "write" });
    const strict = resolveEvidencePolicy({ requiresCodeChanges: true, targetProjects: ["web", "api"], riskLevel: "write" });
    const preserved = resolveEvidencePolicy({ requiresCodeChanges: true, targetProjects: ["web"], previousLevel: "strict" });
    const checks = {
        none: none.level === "none" && none.sourceGroundingRequired === false,
        lightweight: lightweight.level === "lightweight" && lightweight.perFileEvidenceRequired === false,
        strict: strict.level === "strict" && strict.perFileEvidenceRequired === true,
        noDowngrade: preserved.level === "strict",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=evidence-policy.js.map