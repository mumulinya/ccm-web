"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskBlockedAcceptanceState = taskBlockedAcceptanceState;
exports.projectBlockedTaskDecision = projectBlockedTaskDecision;
const crypto_1 = require("crypto");
const acceptance_contract_1 = require("../../agents/acceptance-contract");
const blockedStates = new Set([
    "recovery_required", "delivery_recovery_required", "needs_user", "environment_blocked",
    "test_agent_recheck", "source_hydration_blocked", "plan_source_drift", "plan_dispatch_blocked",
    "scope_approval_pending", "dependency_blocked",
    "awaiting_plan_confirmation",
]);
/** A blocked Task keeps its specific non-success gate. Never project accepted,
 * pending or model-provided arbitrary state as a blocked terminal receipt. */
function taskBlockedAcceptanceState(task, updates) {
    const candidate = String(updates?.acceptance_state || updates?.acceptanceState
        || (task?.status === "blocked" ? task?.acceptance_state : "") || "").toLowerCase();
    return blockedStates.has(candidate) ? candidate : "blocked";
}
function projectBlockedTaskDecision(decision, task, updates) {
    if (updates?.status !== "blocked" || decision?.status !== "blocked")
        return decision;
    const acceptance_state = taskBlockedAcceptanceState(task, updates);
    if (decision.acceptance_state === acceptance_state)
        return decision;
    const { checksum, ...base } = decision;
    const projected = { ...base, acceptance_state };
    return { ...projected, checksum: (0, acceptance_contract_1.acceptanceHash)(base) === checksum ? (0, acceptance_contract_1.acceptanceHash)(projected)
            : (0, crypto_1.createHash)("sha256").update(JSON.stringify(projected)).digest("hex") };
}
//# sourceMappingURL=task-blocked-acceptance.js.map