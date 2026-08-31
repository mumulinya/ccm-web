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
exports.taskNeedsAcceptancePolicy = taskNeedsAcceptancePolicy;
exports.buildTaskAcceptancePolicySnapshot = buildTaskAcceptancePolicySnapshot;
exports.validateTaskAcceptancePolicySnapshot = validateTaskAcceptancePolicySnapshot;
exports.resolveTaskAcceptancePolicy = resolveTaskAcceptancePolicy;
exports.evaluateTaskAcceptanceEscalation = evaluateTaskAcceptanceEscalation;
exports.buildTaskAcceptanceEscalationReceipt = buildTaskAcceptanceEscalationReceipt;
exports.validateTaskAcceptanceEscalationReceipt = validateTaskAcceptanceEscalationReceipt;
exports.taskAcceptanceUsesIndependentReview = taskAcceptanceUsesIndependentReview;
exports.taskAcceptanceReviewRounds = taskAcceptanceReviewRounds;
exports.acceptanceModeForTask = acceptanceModeForTask;
const crypto = __importStar(require("crypto"));
const test_agent_settings_1 = require("../system/test-agent-settings");
const hardening_policy_1 = require("../../test-agent/hardening-policy");
const SNAPSHOT_WORKFLOWS = new Set(["daily_dev", "project_main_agent", "requirement_epic"]);
const STRICT_VERIFICATION_MODES = new Set(["release", "security", "migration", "destructive", "cross_project"]);
const HIGH_RISK_PATH = /(^|\/)(auth|security|permission|permissions|acl|rbac|migration|migrations|database|schema|deploy|deployment|release|payment|billing)(\/|$)/i;
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function strings(value, max = 30) {
    const rows = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return [...new Set(rows.map(item => String(item || "").trim()).filter(Boolean))].slice(0, max);
}
function taskIdentity(task) {
    const scope = String(task?.orchestration_scope || task?.orchestrationScope || "") === "project_session"
        || !!(task?.project_session_id || task?.projectSessionId)
        ? "project"
        : "group";
    return {
        scope,
        scopeId: scope === "project"
            ? String(task?.target_project || task?.targetProject || "").trim()
            : String(task?.group_id || task?.groupId || "").trim(),
        exactSessionId: scope === "project"
            ? String(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId || "").trim()
            : String(task?.group_session_id || task?.groupSessionId || task?.exact_session_id || task?.exactSessionId || "").trim(),
        generation: Math.max(0, Math.floor(Number(task?.generation || task?.collaboration_generation || task?.workflow_meta?.generation || 0))),
    };
}
function verificationProfile(task) {
    return task?.test_agent_review_policy
        || task?.verificationProfile
        || task?.verification_profile
        || task?.workflow_meta?.project_main_plan?.verificationProfile
        || task?.workflow_meta?.project_main_plan?.verification_profile
        || task?.workflow_meta?.verificationProfile
        || task?.workflow_meta?.verification_profile
        || {};
}
function projectIdsForTask(task) {
    const ids = new Set();
    const add = (value) => strings(value, 50).forEach(item => ids.add(item));
    add(task?.target_project || task?.targetProject);
    add(task?.target_projects || task?.targetProjects || task?.projects);
    for (const row of [
        ...(Array.isArray(task?.work_items) ? task.work_items : []),
        ...(Array.isArray(task?.workItems) ? task.workItems : []),
        ...(Array.isArray(task?.assignments) ? task.assignments : []),
        ...(Array.isArray(task?.workflow_meta?.project_main_plan?.workItems) ? task.workflow_meta.project_main_plan.workItems : []),
    ])
        add(row?.projectId || row?.project_id || row?.project || row?.targetProject || row?.target_project);
    return [...ids];
}
function deriveLevel(task) {
    const profile = verificationProfile(task);
    const tier = String(profile?.tier || "").trim().toLowerCase();
    const changeClass = String(profile?.changeClass || profile?.change_class || "").trim().toLowerCase();
    const workflowDecision = task?.workflow_decision || task?.workflowDecision || task?.workflow_meta?.workflow_decision || {};
    const riskLevel = String(task?.risk_level || task?.riskLevel || workflowDecision?.riskLevel || workflowDecision?.risk_level || "").trim().toLowerCase();
    const verificationModes = new Set(strings(task?.verification_modes || task?.verificationModes || workflowDecision?.verificationModes || workflowDecision?.verification_modes, 20).map(item => item.toLowerCase()));
    const projectIds = projectIdsForTask(task);
    const interactive = tier === "interactive" || changeClass === "interactive" || verificationModes.has("browser") || verificationModes.has("visual");
    const reasons = [];
    if (projectIds.length > 1)
        reasons.push("跨项目任务必须独立验收");
    if (task?.requires_independent_review === true || task?.requiresIndependentReview === true)
        reasons.push("任务明确要求独立验收");
    if (tier === "critical" || changeClass === "critical" || riskLevel === "high")
        reasons.push("验收风险分级为高风险");
    if ([...verificationModes].some(mode => STRICT_VERIFICATION_MODES.has(mode)))
        reasons.push("任务包含严格验证或发布门禁");
    if (task?.affects_public_contract === true || task?.affectsPublicContract === true)
        reasons.push("任务影响公共契约");
    if (task?.destructive === true || task?.requires_destructive_confirmation === true)
        reasons.push("任务包含破坏性变更");
    if (reasons.length)
        return { level: "strict", reasons, interactive };
    const requiresCode = task?.requires_code_changes === true || task?.requiresCodeChanges === true
        || changeClass === "code" || changeClass === "interactive" || ["standard", "interactive"].includes(tier);
    if (requiresCode)
        return { level: "standard", reasons: [interactive ? "普通交互改动，要求浏览器验证" : "普通单项目代码改动"], interactive };
    return { level: "lightweight", reasons: ["低风险文档、文案或非运行时配置改动"], interactive };
}
function routeFor(level, strategyMode) {
    if (strategyMode === "always_independent")
        return "independent_test_agent";
    if (strategyMode === "self_verification_only")
        return "main_agent_self_verification";
    if (level === "strict")
        return "independent_test_agent";
    if (level === "standard")
        return "main_agent_with_escalation";
    return "main_agent_self_verification";
}
function requiredChecks(level, interactive, route) {
    return strings([
        "scope", "changed_files", "acceptance_criteria",
        ...(level === "lightweight" ? [] : ["verification_commands", "source_freshness"]),
        ...(interactive ? ["browser_e2e", "console_errors"] : []),
        ...(level === "strict" || route === "independent_test_agent"
            ? ["independent_review", "runtime_freshness", "surface_audit", "post_review_spot_check"] : []),
    ]);
}
function taskNeedsAcceptancePolicy(task) {
    const workflow = String(task?.workflow_type || task?.workflowType || "").trim().toLowerCase();
    const assignType = String(task?.assign_type || task?.assignType || "").trim().toLowerCase();
    return SNAPSHOT_WORKFLOWS.has(workflow)
        || ["group", "project"].includes(assignType)
        || task?.requires_code_changes === true || task?.requiresCodeChanges === true
        || task?.requires_verification === true || task?.requiresVerification === true
        || task?.requires_independent_review === true || task?.requiresIndependentReview === true;
}
function buildTaskAcceptancePolicySnapshot(task, options = {}) {
    if (!taskNeedsAcceptancePolicy(task))
        return null;
    const settings = (0, test_agent_settings_1.loadTestAgentSettings)();
    const identity = taskIdentity(task);
    const classified = deriveLevel(task);
    const route = routeFor(classified.level, settings.mode);
    const capturedAt = options.capturedAt || new Date().toISOString();
    const hardening = (0, hardening_policy_1.buildTestAgentHardeningPolicy)({ task, reviewPolicy: task?.test_agent_review_policy || verificationProfile(task) || null });
    const mode = route === "independent_test_agent" ? "test_agent" : "main_agent_self_verification";
    const maxReviewRounds = route === "independent_test_agent" ? 3 : route === "main_agent_with_escalation" ? 2 : 1;
    const core = {
        schema: "ccm-task-acceptance-policy-snapshot-v3",
        version: 3,
        taskId: String(task?.id || "").trim(),
        scope: identity.scope,
        scopeId: identity.scopeId,
        exactSessionId: identity.exactSessionId,
        generation: identity.generation,
        level: classified.level,
        route,
        reasons: classified.reasons,
        requiredChecks: requiredChecks(classified.level, classified.interactive, route),
        maxReworkRounds: classified.level === "strict" ? 3 : 1,
        maxReviewRounds,
        escalationAllowed: route === "main_agent_with_escalation",
        strategyMode: settings.mode,
        hardening,
        capturedAt,
        contentStored: false,
        task_id: String(task?.id || "").trim(),
        scope_id: identity.scopeId,
        exact_session_id: identity.exactSessionId,
        mode,
        test_agent_enabled: mode === "test_agent",
        max_review_rounds: maxReviewRounds,
        settings_revision: checksum({ mode: settings.mode, updatedAt: settings.updatedAt || "default", hardening: hardening.checksum }),
        captured_at: capturedAt,
    };
    return { ...core, checksum: checksum(core) };
}
function validateTaskAcceptancePolicySnapshot(task, snapshot = task?.acceptance_policy_snapshot) {
    const currentV2 = snapshot?.schema === "ccm-task-acceptance-policy-snapshot-v2" && snapshot?.version === 2;
    const currentV3 = snapshot?.schema === "ccm-task-acceptance-policy-snapshot-v3" && snapshot?.version === 3;
    if (!snapshot || (!currentV2 && !currentV3))
        return { valid: false, reason: "acceptance_policy_snapshot_missing", snapshot: null };
    const { checksum: supplied, ...core } = snapshot;
    if (!supplied || checksum(core) !== supplied)
        return { valid: false, reason: "acceptance_policy_snapshot_checksum_mismatch", snapshot: null };
    const identity = taskIdentity(task);
    if (String(snapshot.taskId || snapshot.task_id || "") !== String(task?.id || ""))
        return { valid: false, reason: "acceptance_policy_task_mismatch", snapshot: null };
    if (snapshot.scope !== identity.scope || String(snapshot.scopeId || snapshot.scope_id || "") !== identity.scopeId || String(snapshot.exactSessionId || snapshot.exact_session_id || "") !== identity.exactSessionId) {
        return { valid: false, reason: "acceptance_policy_scope_mismatch", snapshot: null };
    }
    if (!(0, hardening_policy_1.validateTestAgentHardeningPolicy)(snapshot.hardening).valid)
        return { valid: false, reason: "acceptance_policy_hardening_invalid", snapshot: null };
    if (currentV3) {
        const validLevel = ["lightweight", "standard", "strict"].includes(snapshot.level);
        const validRoute = ["main_agent_self_verification", "main_agent_with_escalation", "independent_test_agent"].includes(snapshot.route);
        if (!validLevel || !validRoute || !Array.isArray(snapshot.reasons) || !Array.isArray(snapshot.requiredChecks))
            return { valid: false, reason: "acceptance_policy_classification_invalid", snapshot: null };
    }
    return { valid: true, reason: "ok", snapshot: snapshot };
}
function resolveTaskAcceptancePolicy(task) {
    return validateTaskAcceptancePolicySnapshot(task);
}
function changedPath(item) {
    return String(item?.path || item?.file || item || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function moduleForPath(file) {
    const parts = file.split("/").filter(Boolean);
    if (parts.length <= 1)
        return parts[0] || "root";
    const sourceIndex = parts.findIndex(part => ["src", "backend", "frontend", "packages", "apps", "services", "modules"].includes(part.toLowerCase()));
    return sourceIndex >= 0 && parts[sourceIndex + 1] ? `${parts[sourceIndex]}/${parts[sourceIndex + 1]}` : parts[0];
}
function evaluateTaskAcceptanceEscalation(input) {
    if (input.policy.schema !== "ccm-task-acceptance-policy-snapshot-v3" || input.policy.route !== "main_agent_with_escalation") {
        return { escalate: false, implementationFailure: false, reasons: [], changedFileCount: 0, topLevelModuleCount: 0 };
    }
    const paths = strings((input.changedFiles || []).map(changedPath), 500);
    const modules = new Set(paths.map(moduleForPath));
    const reasons = [];
    if (paths.length >= 8)
        reasons.push("实际源码或配置变更达到8个文件");
    if (modules.size >= 3)
        reasons.push("实际变更横跨3个顶层模块");
    if (paths.some(file => HIGH_RISK_PATH.test(file)))
        reasons.push("实际变更触及安全、数据、发布或公共契约目录");
    const checks = Array.isArray(input.selfVerification?.deterministic_gate?.checks) ? input.selfVerification.deterministic_gate.checks : [];
    const deterministicFailures = checks.filter((item) => item?.pass === false && ["source_changes", "verification_configured", "verification_passed"].includes(String(item?.id || "")));
    const implementationFailure = deterministicFailures.length > 0;
    if (input.selfVerification && !input.selfVerification.canAccept && !implementationFailure)
        reasons.push("确定性验证未发现实现失败，但验收证据仍不完整");
    return { escalate: reasons.length > 0, implementationFailure, reasons, changedFileCount: paths.length, topLevelModuleCount: modules.size };
}
function buildTaskAcceptanceEscalationReceipt(input) {
    if (input.policy.schema !== "ccm-task-acceptance-policy-snapshot-v3" || input.policy.route !== "main_agent_with_escalation")
        throw new Error("只有标准验收策略可以升级为独立TestAgent验收");
    const core = {
        schema: "ccm-task-acceptance-escalation-receipt-v1",
        taskId: String(input.task?.id || input.policy.taskId || ""),
        acceptancePolicyChecksum: input.policy.checksum,
        fromRoute: "main_agent_with_escalation",
        toRoute: "independent_test_agent",
        reasons: strings(input.reasons, 12),
        changedFileCount: Math.max(0, Math.floor(Number(input.changedFileCount || 0))),
        topLevelModuleCount: Math.max(0, Math.floor(Number(input.topLevelModuleCount || 0))),
        escalatedAt: input.escalatedAt || new Date().toISOString(),
        contentStored: false,
    };
    if (!core.reasons.length)
        throw new Error("验收升级缺少确定性原因");
    return { ...core, checksum: checksum(core) };
}
function validateTaskAcceptanceEscalationReceipt(task, policy, receipt) {
    if (!receipt || receipt.schema !== "ccm-task-acceptance-escalation-receipt-v1")
        return { valid: false, reason: "acceptance_escalation_missing" };
    const { checksum: supplied, ...core } = receipt;
    if (!supplied || checksum(core) !== supplied)
        return { valid: false, reason: "acceptance_escalation_checksum_mismatch" };
    if (String(receipt.taskId || "") !== String(task?.id || "") || receipt.acceptancePolicyChecksum !== policy.checksum)
        return { valid: false, reason: "acceptance_escalation_identity_mismatch" };
    if (policy.schema !== "ccm-task-acceptance-policy-snapshot-v3" || policy.route !== "main_agent_with_escalation")
        return { valid: false, reason: "acceptance_escalation_not_allowed" };
    return { valid: true, reason: "ok" };
}
function taskAcceptanceUsesIndependentReview(task, policy) {
    return policy.mode === "test_agent" || validateTaskAcceptanceEscalationReceipt(task, policy, task?.acceptance_escalation).valid;
}
function taskAcceptanceReviewRounds(task, policy) {
    if (policy.schema === "ccm-task-acceptance-policy-snapshot-v3" && validateTaskAcceptanceEscalationReceipt(task, policy, task?.acceptance_escalation).valid)
        return 2;
    return Math.max(1, Math.min(3, Number(policy.max_review_rounds || 1)));
}
function acceptanceModeForTask(task) {
    const resolved = resolveTaskAcceptancePolicy(task);
    if (!resolved.snapshot)
        return null;
    return taskAcceptanceUsesIndependentReview(task, resolved.snapshot) ? "test_agent" : "main_agent_self_verification";
}
//# sourceMappingURL=task-acceptance-policy.js.map