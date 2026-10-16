"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeVerificationModelCalls = summarizeVerificationModelCalls;
exports.createVerificationTiming = createVerificationTiming;
const perf_hooks_1 = require("perf_hooks");
const numericFields = {
    inputTokens: ["inputTokens", "input_tokens"], outputTokens: ["outputTokens", "output_tokens"],
    directInputTokens: ["directInputTokens", "direct_input_tokens"], cacheCreationInputTokens: ["cacheCreationInputTokens", "cache_creation_input_tokens"],
    cacheReadInputTokens: ["cacheReadInputTokens", "cache_read_input_tokens"], providerTotalTokens: ["providerTotalTokens", "provider_total_tokens", "totalTokens", "total_tokens"],
    totalCostUsd: ["totalCostUsd", "total_cost_usd", "costUsd", "cost_usd"],
};
function summarizeBuckets(rows) {
    const called = rows.filter(row => row.model_call_status === "called");
    const unknown = rows.some(row => row.model_call_status === "unknown");
    const total = {};
    let reported = 0, partial = false, costsReported = 0;
    for (const row of called) {
        if (row.usage?.reported === false)
            continue;
        if (row.usage?.usage_status === "partial")
            partial = true;
        const present = new Set();
        for (const [field, aliases] of Object.entries(numericFields)) {
            const key = aliases.find(key => typeof row.usage?.[key] === "number" && Number.isFinite(row.usage[key]) && row.usage[key] >= 0);
            if (key) {
                total[field] = (total[field] ?? 0) + row.usage[key];
                present.add(field);
            }
        }
        if (present.size || row.usage?.reported === true)
            reported++;
        if (present.has("totalCostUsd"))
            costsReported++;
        if (present.size && !(present.has("inputTokens") && present.has("outputTokens")))
            partial = true;
    }
    const model_call_status = called.length ? "called" : unknown ? "unknown" : "not_called";
    const usage_status = !called.length ? "unknown" : !reported ? "unreported" : partial || reported < called.length || unknown ? "partial" : "reported";
    return { model_call_status, usage_status, requestCount: called.length, unknownRequestCount: rows.filter(row => row.model_call_status === "unknown").length,
        cost_status: !called.length ? "unknown" : !costsReported ? "unreported" : costsReported < called.length || unknown ? "partial" : "reported",
        ...total, reported: reported > 0, source: model_call_status === "not_called" ? "local_no_model" : reported ? "provider_reported" : "provider_unreported",
        ...(total.providerTotalTokens !== undefined ? { totalTokens: total.providerTotalTokens } : total.inputTokens !== undefined && total.outputTokens !== undefined ? { totalTokens: total.inputTokens + total.outputTokens } : {}),
    };
}
function summarizeVerificationModelCalls(observations) {
    const seen = new Set();
    const rows = observations.filter(row => { if (!row.requestId)
        return true; if (seen.has(row.requestId))
        return false; seen.add(row.requestId); return true; });
    return { ...summarizeBuckets(rows), stages: ["planning", "supplemental_planning"].map(stage => ({ stage, ...summarizeBuckets(rows.filter(row => row.stage === stage)) })) };
}
/** Phase durations are wall-clock intervals, including parallel children once. */
function createVerificationTiming() {
    const started = perf_hooks_1.performance.now(), stage_durations = {};
    const start = (stage) => {
        const begin = perf_hooks_1.performance.now();
        let finished = false;
        return () => { if (!finished) {
            finished = true;
            stage_durations[stage] = (stage_durations[stage] || 0) + perf_hooks_1.performance.now() - begin;
        } };
    };
    return {
        start,
        async measure(stage, operation) {
            const finish = start(stage);
            try {
                return await operation();
            }
            finally {
                finish();
            }
        },
        snapshot() { return { totalMs: perf_hooks_1.performance.now() - started, verificationMs: ["commands", "service_ready", "http", "browser", "supplemental_verification"].reduce((sum, key) => sum + (stage_durations[key] || 0), 0), stage_durations: { ...stage_durations } }; },
    };
}
//# sourceMappingURL=verification-telemetry.js.map