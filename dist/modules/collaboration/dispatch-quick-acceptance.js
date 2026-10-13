"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchQuickAcceptance = dispatchQuickAcceptance;
const main_agent_self_verification_1 = require("./main-agent-self-verification");
/** Frozen quick-check policy consumes only this attempt's platform receipt. */
function dispatchQuickAcceptance(task) {
    const enabled = task?.workflow_policy_snapshot?.verification === "quick_check"
        && task?.dispatch_profile_snapshot?.profile === "light";
    const receipt = task?.quick_check_receipt;
    const validation = enabled ? (0, main_agent_self_verification_1.validateQuickTaskVerificationReceipt)(task, receipt) : { valid: false };
    return { enabled, passed: validation.valid === true,
        commands: validation.valid ? receipt.verification_results.map((row) => row.command).filter(Boolean) : [] };
}
//# sourceMappingURL=dispatch-quick-acceptance.js.map