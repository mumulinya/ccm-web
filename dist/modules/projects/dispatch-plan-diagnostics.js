"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchPlanBlockDiagnostics = dispatchPlanBlockDiagnostics;
/** Invalid contracts are diagnostics, never Task acceptance authorities. A
 * failed compiler result must still be persistable as a blocked task. */
function dispatchPlanBlockDiagnostics(contract, validation) {
    return { contractId: contract?.contractId || "", planRevision: contract?.planRevision || 0,
        planChecksum: contract?.planChecksum || "", dispatchReady: false,
        blockers: [...new Set([...(contract?.blockers || []), ...(validation?.issues || [])])].slice(0, 30),
        contentStored: false };
}
//# sourceMappingURL=dispatch-plan-diagnostics.js.map