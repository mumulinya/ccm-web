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
exports.acceptanceModeForTask = acceptanceModeForTask;
const crypto = __importStar(require("crypto"));
const test_agent_settings_1 = require("../system/test-agent-settings");
const SNAPSHOT_WORKFLOWS = new Set(["daily_dev", "project_main_agent", "requirement_epic"]);
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
function explicitMode(task) {
    const mode = String(task?.acceptance_mode || task?.acceptanceMode || task?.acceptance_policy_snapshot?.mode || "").trim();
    if (mode === "test_agent" || mode === "main_agent_self_verification")
        return mode;
    if (task?.test_agent_enabled === false || task?.testAgentEnabled === false)
        return "main_agent_self_verification";
    if (task?.test_agent_enabled === true || task?.testAgentEnabled === true)
        return "test_agent";
    return null;
}
function taskNeedsAcceptancePolicy(task) {
    const workflow = String(task?.workflow_type || task?.workflowType || "").trim().toLowerCase();
    const assignType = String(task?.assign_type || task?.assignType || "").trim().toLowerCase();
    return SNAPSHOT_WORKFLOWS.has(workflow)
        || ["group", "project"].includes(assignType)
        || task?.requires_code_changes === true
        || task?.requiresCodeChanges === true
        || task?.requires_verification === true
        || task?.requiresVerification === true
        || task?.requires_independent_review === true
        || task?.requiresIndependentReview === true;
}
function buildTaskAcceptancePolicySnapshot(task, options = {}) {
    if (!taskNeedsAcceptancePolicy(task))
        return null;
    const settings = (0, test_agent_settings_1.loadTestAgentSettings)();
    const mode = explicitMode(task) || (settings.enabled ? "test_agent" : "main_agent_self_verification");
    const scope = String(task?.orchestration_scope || task?.orchestrationScope || "") === "project_session"
        || !!(task?.project_session_id || task?.projectSessionId)
        ? "project"
        : "group";
    const scopeId = scope === "project"
        ? String(task?.target_project || task?.targetProject || "").trim()
        : String(task?.group_id || task?.groupId || "").trim();
    const exactSessionId = scope === "project"
        ? String(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId || "").trim()
        : String(task?.group_session_id || task?.groupSessionId || task?.exact_session_id || task?.exactSessionId || "").trim();
    const capturedAt = options.capturedAt || new Date().toISOString();
    const core = {
        schema: "ccm-task-acceptance-policy-snapshot-v1",
        version: 1,
        task_id: String(task?.id || "").trim(),
        scope,
        scope_id: scopeId,
        exact_session_id: exactSessionId,
        mode,
        test_agent_enabled: mode === "test_agent",
        max_review_rounds: mode === "test_agent" ? 3 : 1,
        settings_revision: checksum({ enabled: settings.enabled, updated_at: settings.updated_at || "default" }),
        captured_at: capturedAt,
    };
    return { ...core, checksum: checksum(core) };
}
function validateTaskAcceptancePolicySnapshot(task, snapshot = task?.acceptance_policy_snapshot) {
    if (!snapshot || snapshot.schema !== "ccm-task-acceptance-policy-snapshot-v1" || snapshot.version !== 1) {
        return { valid: false, reason: "acceptance_policy_snapshot_missing", snapshot: null };
    }
    const { checksum: supplied, ...core } = snapshot;
    if (!supplied || checksum(core) !== supplied)
        return { valid: false, reason: "acceptance_policy_snapshot_checksum_mismatch", snapshot: null };
    if (String(snapshot.task_id || "") !== String(task?.id || ""))
        return { valid: false, reason: "acceptance_policy_task_mismatch", snapshot: null };
    const rebuiltIdentity = buildTaskAcceptancePolicySnapshot({
        ...task,
        acceptance_mode: snapshot.mode,
        test_agent_enabled: snapshot.test_agent_enabled,
    }, { capturedAt: snapshot.captured_at });
    if (!rebuiltIdentity || rebuiltIdentity.scope !== snapshot.scope || rebuiltIdentity.scope_id !== snapshot.scope_id || rebuiltIdentity.exact_session_id !== snapshot.exact_session_id) {
        return { valid: false, reason: "acceptance_policy_scope_mismatch", snapshot: null };
    }
    return { valid: true, reason: "ok", snapshot: snapshot };
}
function resolveTaskAcceptancePolicy(task, options = {}) {
    const validated = validateTaskAcceptancePolicySnapshot(task);
    if (validated.valid)
        return { ...validated, legacyCaptured: false };
    if (options.allowLegacyCapture !== true)
        return { ...validated, legacyCaptured: false };
    const legacyMode = explicitMode(task);
    if (!legacyMode && (task?.main_agent_self_verification || task?.test_agent_review)) {
        return { valid: false, reason: "legacy_acceptance_mode_ambiguous", snapshot: null, legacyCaptured: false };
    }
    const snapshot = buildTaskAcceptancePolicySnapshot({
        ...task,
        ...(legacyMode ? { acceptance_mode: legacyMode, test_agent_enabled: legacyMode === "test_agent" } : {}),
    });
    return snapshot
        ? { valid: true, reason: legacyMode ? "legacy_policy_captured" : "policy_captured", snapshot, legacyCaptured: true }
        : { valid: false, reason: "acceptance_policy_not_required", snapshot: null, legacyCaptured: false };
}
function acceptanceModeForTask(task) {
    return resolveTaskAcceptancePolicy(task).snapshot?.mode || explicitMode(task);
}
//# sourceMappingURL=task-acceptance-policy.js.map