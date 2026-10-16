"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeModelCalls = observeModelCalls;
exports.inModelCallStage = inModelCallStage;
exports.observePhysicalModelRequest = observePhysicalModelRequest;
const async_hooks_1 = require("async_hooks");
const observationContext = new async_hooks_1.AsyncLocalStorage();
/** Observe the existing physical request ledger; no extra requests or durable data. */
async function observeModelCalls(operation) {
    const rows = new Map();
    return observationContext.run({ rows, stage: "planning" }, () => operation(rows));
}
async function inModelCallStage(stage, operation) {
    const context = observationContext.getStore();
    return context ? observationContext.run({ ...context, stage }, operation) : operation();
}
function observePhysicalModelRequest(row) {
    const context = observationContext.getStore();
    if (!context || !row?.requestId)
        return;
    context.rows.set(row.requestId, { requestId: row.requestId, stage: context.stage, model_call_status: "called",
        ...(row.usageReported === true ? { usage: { reported: true, usage_status: row.usage_status,
                ...(row.usageReportingCoverage?.input ? { inputTokens: row.totalInputTokens } : {}),
                ...(row.usageReportingCoverage?.output ? { outputTokens: row.outputTokens } : {}),
                ...(row.usageReportingCoverage?.total ? { providerTotalTokens: row.providerTotalTokens } : {}),
                ...(row.cache_usage_reported ? { cacheReadInputTokens: row.cacheReadInputTokens } : {}),
                ...(row.usageReportingCoverage?.cacheCreation ? { cacheCreationInputTokens: row.cacheCreationInputTokens } : {}),
                ...(typeof row.reportedCostUsd === "number" ? { totalCostUsd: row.reportedCostUsd } : {}) } } : {}) });
}
//# sourceMappingURL=model-call-observation.js.map