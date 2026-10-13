"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strongWorkchainVerificationEvidence = strongWorkchainVerificationEvidence;
/** A bare completion flag does not prove that verification actually ran. */
function strongWorkchainVerificationEvidence(evidence) {
    return evidence.verification.length > 0 && evidence.verificationFailed.length === 0
        || evidence.independentReview.length > 0
        || evidence.acceptance.some((row) => !['最终验收已通过', '最终验收未通过，缺口已整理'].includes(row));
}
//# sourceMappingURL=workchain-verification-evidence.js.map