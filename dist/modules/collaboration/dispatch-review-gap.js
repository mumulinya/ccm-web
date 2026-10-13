"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchReviewGapIdentity = dispatchReviewGapIdentity;
/** The repair prompt can include audit paths and review IDs. The persisted
 * no-progress identity must contain only the observed failing requirement. */
function dispatchReviewGapIdentity(review, fallback) {
    const verdict = review?.verdict || {};
    const report = review?.report || review?.invocation?.report || {};
    const gaps = [
        ...(verdict.failedRequiredChecks || []).map((row) => JSON.stringify({ kind: "check", check: row.check, status: row.status })),
        ...(verdict.failedAcceptanceCriteria || []).map((row) => JSON.stringify({ kind: "criterion", criterion: row.criterion, status: row.status })),
        ...(report.commandResults || []).filter((row) => row.status === "failed").map((row) => JSON.stringify({
            kind: "command", project: row.project, command: row.command, status: row.status, exitCode: row.exitCode,
        })),
    ];
    return gaps.length ? [...new Set(gaps)].sort() : fallback;
}
//# sourceMappingURL=dispatch-review-gap.js.map