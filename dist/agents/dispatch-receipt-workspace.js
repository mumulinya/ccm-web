"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDispatchReceiptWorkspaceEvidence = filterDispatchReceiptWorkspaceEvidence;
function filePath(value) {
    return String(value?.path || value?.file || value || "").replace(/\\/g, "/").toLowerCase();
}
/** A model receipt cannot adopt unrelated dirty files in a shared workspace. */
function filterDispatchReceiptWorkspaceEvidence(task, candidates, actualDelta, authorizedRecovery) {
    if (!(task?.dispatch_profile_snapshot || task?.task_spec?.dispatch_profile_snapshot) || authorizedRecovery)
        return candidates;
    const observed = new Set(actualDelta.map(filePath));
    return candidates.filter(item => observed.has(filePath(item)));
}
//# sourceMappingURL=dispatch-receipt-workspace.js.map