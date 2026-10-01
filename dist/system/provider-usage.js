"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProviderUsage = normalizeProviderUsage;
exports.providerUsageSelfTest = providerUsageSelfTest;
const finite = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
function normalizeProviderUsage(value = {}, _provider = "openai") {
    const raw = value && typeof value === "object" ? value : {};
    const provider = String(_provider || "openai").toLowerCase();
    const cacheReadInputTokens = finite(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens
        ?? raw.inputTokensDetails?.cachedTokens ?? raw.input_tokens_details?.cached_tokens
        ?? raw.promptTokensDetails?.cachedTokens ?? raw.prompt_tokens_details?.cached_tokens
        ?? raw.cachedContentTokenCount ?? raw.cached_content_token_count
        ?? raw.cachedTokens ?? raw.cached_tokens ?? raw.total_cached_tokens);
    const cacheCreationInputTokens = finite(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens
        ?? raw.inputTokensDetails?.cacheCreationTokens ?? raw.input_tokens_details?.cache_creation_tokens
        ?? raw.inputTokensDetails?.cacheWriteTokens ?? raw.input_tokens_details?.cache_write_tokens
        ?? raw.promptTokensDetails?.cacheWriteTokens ?? raw.prompt_tokens_details?.cache_write_tokens
        ?? raw.prompt_tokens_details?.cache_creation_tokens ?? raw.prompt_tokens_details?.cache_write_tokens
        ?? raw.cache_creation?.ephemeral_5m_input_tokens ?? raw.cache_creation?.ephemeral_1h_input_tokens);
    const inputTokens = finite(raw.inputTokens ?? raw.input_tokens ?? raw.promptTokens ?? raw.prompt_tokens
        ?? raw.promptTokenCount ?? raw.prompt_token_count);
    const explicitDirect = raw.directInputTokens ?? raw.direct_input_tokens;
    const hasExplicitDirect = explicitDirect != null;
    const includesCache = raw.inputTokensIncludesCache === true || raw.input_tokens_includes_cache === true
        || (!provider.includes("anthropic") && !hasExplicitDirect && (cacheReadInputTokens > 0 || cacheCreationInputTokens > 0));
    const directInputTokens = hasExplicitDirect
        ? finite(explicitDirect)
        : includesCache
            ? Math.max(0, inputTokens - cacheReadInputTokens - cacheCreationInputTokens)
            : inputTokens;
    const outputTokens = finite(raw.outputTokens ?? raw.output_tokens ?? raw.completionTokens ?? raw.completion_tokens
        ?? raw.candidatesTokenCount ?? raw.candidates_token_count);
    const providerTotalTokens = finite(raw.providerTotalTokens ?? raw.provider_total_tokens ?? raw.totalTokens ?? raw.total_tokens)
        || directInputTokens + cacheReadInputTokens + cacheCreationInputTokens + outputTokens;
    const explicitReported = typeof raw.reported === "boolean"
        ? raw.reported
        : typeof raw.providerUsageReported === "boolean" ? raw.providerUsageReported : undefined;
    const knownUsageField = [
        "inputTokens", "input_tokens", "promptTokens", "prompt_tokens", "outputTokens", "output_tokens",
        "completionTokens", "completion_tokens", "promptTokenCount", "prompt_token_count",
        "candidatesTokenCount", "candidates_token_count", "cachedContentTokenCount", "cached_content_token_count",
        "totalTokens", "total_tokens", "cacheReadInputTokens", "cache_read_input_tokens",
        "cacheCreationInputTokens", "cache_creation_input_tokens", "usageMetadata",
    ].some((field) => Object.prototype.hasOwnProperty.call(raw, field));
    const reported = explicitReported !== undefined ? explicitReported : knownUsageField
        || inputTokens > 0 || directInputTokens > 0 || cacheReadInputTokens > 0 || cacheCreationInputTokens > 0
        || outputTokens > 0 || providerTotalTokens > 0 || finite(raw.costUsd ?? raw.totalCostUsd) > 0;
    const totalContextTokens = directInputTokens + cacheReadInputTokens + cacheCreationInputTokens;
    return { reported, directInputTokens, cacheReadInputTokens, cacheCreationInputTokens,
        totalContextTokens, providerTotalTokens, outputTokens, inputTokensIncludesCache: includesCache };
}
function providerUsageSelfTest() {
    const explicit = normalizeProviderUsage({ reported: true, directInputTokens: 10, cacheReadInputTokens: 90 });
    const included = normalizeProviderUsage({ inputTokens: 100, inputTokensIncludesCache: true, cacheReadInputTokens: 90 });
    const openAiDetails = normalizeProviderUsage({ prompt_tokens: 10_000, prompt_tokens_details: { cached_tokens: 9_728 } }, "chat_completions");
    const explicitZero = normalizeProviderUsage({ promptTokenCount: 0, cachedContentTokenCount: 0, candidatesTokenCount: 0 }, "gemini");
    const unreported = normalizeProviderUsage({ reported: false });
    return {
        pass: explicit.directInputTokens === 10 && explicit.totalContextTokens === 100 && explicit.providerTotalTokens === 100
            && included.directInputTokens === 10 && included.providerTotalTokens === 100
            && openAiDetails.cacheReadInputTokens === 9_728 && openAiDetails.directInputTokens === 272
            && explicitZero.reported === true
            && unreported.reported === false,
        explicit, included, openAiDetails, explicitZero, unreported,
    };
}
//# sourceMappingURL=provider-usage.js.map