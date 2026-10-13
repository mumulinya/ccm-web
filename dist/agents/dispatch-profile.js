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
exports.dispatchProfileChecksum = dispatchProfileChecksum;
exports.captureDispatchIntakeSignals = captureDispatchIntakeSignals;
exports.dispatchProfileGates = dispatchProfileGates;
exports.deriveDispatchProfile = deriveDispatchProfile;
exports.buildDispatchProfileSnapshot = buildDispatchProfileSnapshot;
exports.validateDispatchProfileSnapshot = validateDispatchProfileSnapshot;
exports.resolveDispatchProfileSnapshot = resolveDispatchProfileSnapshot;
exports.canUpgradeDispatchProfile = canUpgradeDispatchProfile;
exports.reworkLimitForDispatchProfile = reworkLimitForDispatchProfile;
exports.normalizeDispatchPath = normalizeDispatchPath;
exports.canonicalDispatchPath = canonicalDispatchPath;
exports.resolveDispatchScope = resolveDispatchScope;
exports.evaluateDispatchPath = evaluateDispatchPath;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const STRICT_WORDS = new Set([
    "security", "permission", "permissions", "auth", "authentication", "authorization",
    "database", "schema", "migration", "migrations", "deploy", "deployment", "release",
    "destructive", "payment", "billing", "public_contract", "cross_project", "critical",
]);
function text(value, fallback = "") {
    return String(value ?? fallback).trim();
}
function strings(value, max = 200) {
    const rows = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return [...new Set(rows.map(item => text(item)).filter(Boolean))].slice(0, max);
}
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function dispatchProfileChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function bool(value) {
    return value === true || value === 1 || value === "true";
}
function lower(value) {
    return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}
function projectCount(task) {
    const projects = new Set();
    for (const value of [task?.target_project, task?.targetProject, task?.target_projects, task?.targetProjects]) {
        if (Array.isArray(value))
            value.forEach(item => { if (text(item))
                projects.add(text(item)); });
        else if (text(value))
            projects.add(text(value));
    }
    for (const item of [
        ...(Array.isArray(task?.work_items) ? task.work_items : []),
        ...(Array.isArray(task?.workItems) ? task.workItems : []),
        ...(Array.isArray(task?.assignments) ? task.assignments : []),
    ]) {
        const project = text(item?.project || item?.project_id || item?.projectId || item?.target_project);
        if (project)
            projects.add(project);
    }
    return projects.size;
}
function captureDispatchIntakeSignals(input) {
    return {
        risk_level: input.risk_level || input.riskLevel || input.workflow_decision?.riskLevel,
        change_type: input.change_type || input.changeType || input.change_class || input.changeClass,
        verification_modes: input.verification_modes || input.verificationModes,
        verification_profile: input.verification_profile || input.verificationProfile,
        cross_project: input.cross_project ?? input.crossProject,
        target_projects: input.target_projects || input.targetProjects,
        destructive: input.destructive,
        affects_public_contract: input.affects_public_contract ?? input.affectsPublicContract,
        runtime_config: input.runtime_config,
        file_change_policy: input.file_change_policy || input.fileChangePolicy,
        dispatch_scope: resolveDispatchScope(input),
    };
}
function riskSignals(task) {
    const decision = task?.workflow_decision || task?.workflowDecision || task?.workflow_meta?.workflow_decision || {};
    const profile = task?.verification_profile || task?.verificationProfile || task?.test_agent_review_policy || {};
    const modes = strings(task?.verification_modes || task?.verificationModes || decision?.verificationModes || decision?.verification_modes, 30).map(lower);
    const words = [
        lower(task?.risk_level || task?.riskLevel || decision?.riskLevel || decision?.risk_level),
        lower(profile?.tier),
        lower(profile?.changeClass || profile?.change_class),
        ...modes,
    ].filter(Boolean);
    words.push(lower(task?.change_type || task?.changeType));
    const strictWord = [...STRICT_WORDS, "high", "critical"].find(word => words.includes(word)) || (decision.hasPermissionOrSecurityChange ? "security" : decision.hasMigration ? "migration" : decision.hasReleaseOrDeployment ? "release" : "");
    return {
        words,
        strictWord,
        crossProject: projectCount(task) > 1 || bool(task?.cross_project) || bool(task?.crossProject),
        code: bool(task?.requires_code_changes) || bool(task?.requiresCodeChanges) || bool(decision?.requiresCodeChanges) || bool(decision?.requires_code_changes)
            || ["code", "interactive", "feature", "bugfix", "bug_fix"].includes(lower(profile?.changeClass || profile?.change_class)),
        explicitIndependentReview: bool(task?.requires_independent_review) || bool(task?.requiresIndependentReview)
            || bool(decision?.requiresIndependentReview) || bool(decision?.requires_independent_review),
        destructive: bool(task?.destructive) || bool(task?.requires_destructive_confirmation),
        publicContract: bool(task?.affects_public_contract) || bool(task?.affectsPublicContract) || bool(decision?.affectsPublicContract),
        automation: lower(task?.origin || task?.task_origin || task?.request_origin || task?.workflow_type) === "automation"
            || lower(task?.workflow_type || task?.workflowType) === "daily_dev",
        explicitLight: lower(task?.change_class || task?.changeClass || task?.change_type || task?.changeType) === "documentation"
            || lower(task?.change_class || task?.changeClass || task?.change_type || task?.changeType) === "config" && !bool(task?.runtime_config),
    };
}
function dispatchProfileGates(profile) {
    if (profile === "light")
        return {
            requireAck: false,
            requireAcceptanceContract: false,
            requireStructuredReceipt: false,
            requireIsolatedWorktree: false,
            verification: "quick_check",
            requireWorkspaceEvidence: false,
            requireHumanApproval: false,
            allowScopeExpansion: true,
        };
    if (profile === "strict")
        return {
            requireAck: true,
            requireAcceptanceContract: true,
            requireStructuredReceipt: true,
            requireIsolatedWorktree: true,
            verification: "test_agent",
            requireWorkspaceEvidence: true,
            requireHumanApproval: true,
            allowScopeExpansion: true,
        };
    return {
        requireAck: true,
        requireAcceptanceContract: true,
        requireStructuredReceipt: true,
        requireIsolatedWorktree: false,
        verification: "main_agent_self",
        requireWorkspaceEvidence: false,
        requireHumanApproval: false,
        allowScopeExpansion: true,
    };
}
function deriveDispatchProfile(task) {
    const explicit = lower(task?.dispatch_profile || task?.dispatchProfile);
    const signals = riskSignals(task);
    const reasons = [];
    if (signals.strictWord)
        reasons.push(`包含高风险信号: ${signals.strictWord}`);
    if (signals.crossProject)
        reasons.push("跨项目任务需要独立工作区和验收");
    if (signals.explicitIndependentReview)
        reasons.push("任务明确要求独立验收");
    if (signals.destructive)
        reasons.push("任务包含破坏性操作");
    if (signals.publicContract)
        reasons.push("任务影响公共契约");
    if (signals.automation)
        reasons.push("自动化任务需要可恢复和可审计执行");
    if (reasons.length && ["light", "standard"].includes(explicit))
        reasons.push(`已忽略较低的显式档位：${explicit}`);
    if (reasons.length)
        return { profile: "strict", reasons };
    if (["light", "standard", "strict"].includes(explicit))
        return { profile: explicit, reasons: ["任务明确指定派发档位"] };
    if (!signals.code && (signals.explicitLight || task?.requires_code_changes === false || task?.requiresCodeChanges === false) && !bool(task?.runtime_config)) {
        return { profile: "light", reasons: ["明确的非运行时代码低风险改动"] };
    }
    if (!signals.code && !bool(task?.requires_verification) && !bool(task?.requiresVerification)) {
        return { profile: "standard", reasons: ["风险信息不足，使用标准派发"] };
    }
    return { profile: "standard", reasons: ["普通单项目代码任务"] };
}
function buildDispatchProfileSnapshot(task, options = {}) {
    const derived = options.forceProfile ? { profile: options.forceProfile, reasons: ["由上层策略明确指定派发档位"] } : deriveDispatchProfile(task);
    const core = {
        schema: "ccm-dispatch-profile-snapshot-v1",
        version: 1,
        profile: derived.profile,
        reasons: strings(derived.reasons, 20),
        requiredGates: dispatchProfileGates(derived.profile),
        capturedAt: options.capturedAt || new Date().toISOString(),
    };
    return { ...core, checksum: dispatchProfileChecksum(core) };
}
function validateDispatchProfileSnapshot(snapshot) {
    if (!snapshot || snapshot.schema !== "ccm-dispatch-profile-snapshot-v1" || snapshot.version !== 1)
        return { valid: false, reason: "dispatch_profile_snapshot_missing" };
    if (!["light", "standard", "strict"].includes(snapshot.profile))
        return { valid: false, reason: "dispatch_profile_invalid" };
    const { checksum, ...core } = snapshot;
    if (!checksum || dispatchProfileChecksum(core) !== checksum)
        return { valid: false, reason: "dispatch_profile_checksum_mismatch" };
    const expected = dispatchProfileGates(snapshot.profile);
    if (JSON.stringify(stable(snapshot.requiredGates)) !== JSON.stringify(stable(expected)))
        return { valid: false, reason: "dispatch_profile_gates_mismatch" };
    return { valid: true, reason: "ok", snapshot: snapshot };
}
function resolveDispatchProfileSnapshot(task) {
    const frozen = task?.dispatch_profile_snapshot || task?.dispatchProfileSnapshot || task?.task_spec?.dispatch_profile_snapshot;
    if (validateDispatchProfileSnapshot(frozen).valid)
        return frozen;
    if (frozen)
        throw Object.assign(new Error("派发档位快照损坏，禁止重新推导绕过门禁"), { code: "CCM_DISPATCH_SNAPSHOT_INVALID" });
    return buildDispatchProfileSnapshot(task);
}
function canUpgradeDispatchProfile(current, next) {
    const rank = { light: 1, standard: 2, strict: 3 };
    return rank[next] >= rank[current];
}
function reworkLimitForDispatchProfile(profile) {
    return profile === "light" ? 1 : profile === "standard" ? 2 : 3;
}
function normalizeDispatchPath(value) {
    const valuePath = text(value, "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
    if (valuePath.split("/").some(part => /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))
        return "";
    if (!valuePath || valuePath.startsWith("/") || /[<>:\"|?*\x00-\x1f]/.test(valuePath) || valuePath.split("/").some(part => !part || part === ".." || part === "." || /[. ]$/.test(part)))
        return "";
    return valuePath;
}
const safePath = normalizeDispatchPath;
function canonicalDispatchPath(file, workspacePath) {
    const normalized = safePath(file);
    if (!normalized || !workspacePath)
        return normalized;
    try {
        const root = fs.realpathSync(workspacePath);
        const target = path.resolve(root, normalized);
        let existing = target;
        while (!fs.existsSync(existing) && existing !== path.dirname(existing)) {
            // A dangling symlink is unknown evidence, not an ordinary missing file.
            try {
                if (fs.lstatSync(existing).isSymbolicLink())
                    return "";
            }
            catch { }
            existing = path.dirname(existing);
        }
        const realTarget = path.resolve(fs.realpathSync(existing), path.relative(existing, target));
        const relative = path.relative(root, realTarget);
        if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
            return "";
        // Nested repositories/submodules are another workspace ownership lane.
        // A path being below the outer root does not authorize editing that lane.
        let owner = fs.existsSync(realTarget) && fs.statSync(realTarget).isDirectory() ? realTarget : path.dirname(realTarget);
        while (owner !== root && owner !== path.dirname(owner)) {
            if (fs.existsSync(path.join(owner, ".git")))
                return "";
            owner = path.dirname(owner);
        }
        return safePath(relative);
    }
    catch {
        return "";
    }
}
function resolveDispatchScope(task) {
    const scope = task?.dispatch_scope || task?.dispatchScope || {};
    const policy = task?.file_change_policy || {};
    const recommended = strings(scope.recommendedPaths || scope.recommended_paths || task?.recommended_paths || task?.recommendedPaths || task?.editablePaths || task?.editable_paths || policy.editablePaths || policy.initialEditablePaths, 500).map(safePath).filter(Boolean);
    const protectedPaths = strings([...(strings(scope.protectedPaths || scope.protected_paths || task?.protected_paths || task?.protectedPaths)), ...strings(policy.protectedPaths || policy.protected_paths)], 500).map(safePath).filter(Boolean);
    const forbidden = strings([...strings(scope.forbiddenPaths || scope.forbidden_paths), ...strings(task?.forbidden_paths || task?.forbiddenPaths), ...strings(policy.forbiddenPaths || policy.forbidden_paths)], 500).map(safePath).filter(Boolean);
    const approvals = (task?.scope_expansion_requests || []).filter((r) => r.status === "approved" && r.applicationState === "applied" && (!r.attemptId || r.attemptId === (task?.attempt_id || task?.task_run?.attempt_id) || r.attemptId === task?.scope_approval_attempt_id) && Number(r.appliedRevision || 0) <= Number(task?.task_spec?.revision || 1)).flatMap((r) => r.requestedPaths || [r.path]);
    return { recommendedPaths: [...new Set(recommended)], protectedPaths: [...new Set(protectedPaths)], forbiddenPaths: [...new Set(forbidden)], approvedPaths: strings(approvals).map(safePath).filter(Boolean) };
}
function covered(file, roots) {
    const normalized = safePath(file).toLowerCase();
    return roots.some(root => normalized === root.toLowerCase() || normalized.startsWith(`${root.toLowerCase().replace(/\/$/, "")}/`));
}
function evaluateDispatchPath(file, scope, profile, workspacePath) {
    const normalized = canonicalDispatchPath(file, workspacePath);
    if (!normalized)
        return { allowed: false, requiresApproval: false, advisory: false, reason: "invalid_path" };
    if (covered(normalized, scope.forbiddenPaths) || normalized.toLowerCase().split("/").some(part => [".git", "node_modules", ".ssh", ".aws"].includes(part)) || /(^|\/)(\.env(?:\..+)?|\.(?:npmrc|pypirc|netrc)|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|credentials?(?:\..+)?|[^/]+\.(?:pem|key|p12|pfx|keystore|jks))$/i.test(normalized)) {
        return { allowed: false, requiresApproval: false, advisory: false, reason: "forbidden_path" };
    }
    if (covered(normalized, scope.approvedPaths || []))
        return { allowed: true, requiresApproval: false, advisory: false, reason: "approved_scope" };
    if (covered(normalized, scope.protectedPaths))
        return { allowed: false, requiresApproval: true, advisory: false, reason: "protected_path_requires_approval" };
    if (covered(normalized, scope.recommendedPaths) || !scope.recommendedPaths.length)
        return { allowed: true, requiresApproval: false, advisory: false, reason: "within_scope" };
    if (profile === "strict")
        return { allowed: false, requiresApproval: true, advisory: false, reason: "strict_profile_scope_expansion_required" };
    return { allowed: true, requiresApproval: false, advisory: true, reason: "outside_recommended_scope" };
}
//# sourceMappingURL=dispatch-profile.js.map