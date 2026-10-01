"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyExecutionFailure = classifyExecutionFailure;
exports.failureSignature = failureSignature;
exports.shouldEscalateRepeatedFailure = shouldEscalateRepeatedFailure;
exports.buildDeltaRepair = buildDeltaRepair;
const node_crypto_1 = __importDefault(require("node:crypto"));
function classifyExecutionFailure(input) {
    const text = `${input.errorKind || ""} ${input.message || ""}`.toLowerCase();
    if (input.verification || /verification|test|assert|验收|测试/.test(text))
        return "VERIFICATION_FAILURE";
    if (/auth|login|permission|unauthoriz|登录|权限/.test(text))
        return "AUTH_FAILURE";
    if (/disk|memory|timeout|resource|dependency|磁盘|资源|依赖/.test(text))
        return "RESOURCE_FAILURE";
    if (/plan|scope|work item|范围|计划/.test(text))
        return "PLAN_FAILURE";
    return "EXECUTION_FAILURE";
}
function failureSignature(input) {
    return node_crypto_1.default.createHash("sha256").update(JSON.stringify({ type: input.type, criterionIds: [...(input.criterionIds || [])].sort(), repoStateFingerprint: input.repoStateFingerprint || "", normalizedFailure: String(input.normalizedFailure || "").trim().toLowerCase().replace(/\s+/g, " ") })).digest("hex");
}
function shouldEscalateRepeatedFailure(signatures, threshold = 3) {
    const counts = new Map();
    for (const signature of signatures)
        counts.set(signature, (counts.get(signature) || 0) + 1);
    return [...counts.values()].some(count => count >= Math.max(2, threshold));
}
function buildDeltaRepair(input) {
    return { schema: "ccm-rework-work-order-v3", taskId: input.taskId, workItemId: input.workItemId, executionSessionId: input.executionSessionId, attempt: input.attempt + 1, failedCriterionIds: input.failedCriterionIds, evidenceIds: input.evidenceIds, failureSummary: input.failureSummary, allowedPaths: input.allowedPaths, contentStored: false };
}
//# sourceMappingURL=execution-failure.js.map