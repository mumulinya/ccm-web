"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerUsageReportingCoverage = providerUsageReportingCoverage;
/** Preserve field presence before numeric normalization fills absent buckets. */
function providerUsageReportingCoverage(value) {
    const raw = value && typeof value === "object" ? value : {};
    if (raw.usageReportingCoverage && ["reported", "partial", "unreported"].includes(raw.usage_status))
        return { usage_status: raw.usage_status, usageReportingCoverage: raw.usageReportingCoverage };
    const has = (keys) => keys.some(key => typeof raw[key] === "number" && Number.isFinite(raw[key]) && raw[key] >= 0);
    const input = has(["inputTokens", "directInputTokens", "input_tokens", "promptTokens", "prompt_tokens", "promptTokenCount", "prompt_token_count"]);
    const output = has(["outputTokens", "output_tokens", "completionTokens", "completion_tokens", "candidatesTokenCount"]);
    const total = has(["totalTokens", "total_tokens", "providerTotalTokens", "provider_total_tokens"]);
    const cacheCreation = has(["cacheCreationInputTokens", "cache_creation_input_tokens"]);
    return { usage_status: raw.reported === false || (!input && !output && !total && raw.reported !== true) ? "unreported" : input && output ? "reported" : "partial",
        usageReportingCoverage: { input, output, total, cacheCreation } };
}
//# sourceMappingURL=provider-usage-coverage.js.map