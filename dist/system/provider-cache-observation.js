"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerCacheObservation = providerCacheObservation;
function nonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
}
function providerCacheObservation(plan, usageReported, cacheReadTokens, evidence = {}) {
    const contextPlan = plan && typeof plan === "object" ? plan : {};
    const localHistoryState = contextPlan.previousPlanChecksum ? "existing" : "first_request";
    const coldStart = localHistoryState === "first_request";
    const providerReadTokens = nonNegativeNumber(cacheReadTokens);
    const providerCacheObservation = providerReadTokens > 0 ? "hit"
        : usageReported ? "miss" : "unreported";
    // Keep the local candidate and the Provider's reported read separate.  A
    // missing wire comparison is not evidence that the whole local candidate
    // was matched; in particular, never substitute candidateTokens for a
    // missing (or zero) matchedTokens value.
    const candidateTokens = nonNegativeNumber(evidence.candidateTokens ?? contextPlan.cacheablePrefixTokens);
    const matchedTokens = nonNegativeNumber(evidence.matchedTokens);
    const candidateSource = String(evidence.candidateSource || contextPlan.providerCacheCandidateSource
        || (coldStart ? "current_request_only" : "previous_request_prefix"));
    // A local session can be cold while the Provider namespace is already warm
    // from another CCM session. The wire diagnostics mark that case only after
    // matching the route, protocol, model and public prefix; do not downgrade a
    // large Provider read merely because this session has no local predecessor.
    const hasComparableProviderEvidence = evidence.hasComparableProviderEvidence === true
        || contextPlan.hasComparableProviderEvidence === true;
    const currentRequestOnly = candidateSource === "current_request_only" && !hasComparableProviderEvidence;
    let providerCacheReuseClass = "unreported";
    let providerCachePartialReason = "";
    if (!usageReported)
        providerCacheReuseClass = "unreported";
    else if (providerReadTokens <= 0)
        providerCacheReuseClass = "miss";
    else if (candidateTokens <= 0) {
        providerCacheReuseClass = "partial_reuse";
        providerCachePartialReason = matchedTokens > 0
            ? "provider_usage_present_without_local_prefix_candidate"
            : "provider_usage_present_without_local_prefix_evidence";
    }
    else {
        const ratio = providerReadTokens / candidateTokens;
        // A first local request can still be a cross-session Provider hit when the
        // exact public route evidence is present. Without that evidence, retain a
        // conservative classification for the same usage value.
        if (ratio >= 0.8 && !currentRequestOnly)
            providerCacheReuseClass = "full_reuse";
        else if (ratio <= 0.1) {
            providerCacheReuseClass = "baseline_only";
            providerCachePartialReason = hasComparableProviderEvidence && candidateSource === "current_request_only"
                ? "provider_cross_session_prefix_not_reused_despite_matching_ccm_public_identity"
                : "provider_reused_only_a_small_prefix_fragment";
        }
        else {
            providerCacheReuseClass = "partial_reuse";
            providerCachePartialReason = currentRequestOnly
                ? "current_request_only_does_not_prove_full_reuse"
                : "provider_reused_less_than_local_prefix_candidate";
        }
    }
    const cacheMissReason = providerCacheObservation === "hit" ? ""
        : providerCacheObservation === "unreported" ? "provider_usage_not_reported"
            : contextPlan.toolSchemaChanged ? "tool_schema_changed"
                : coldStart ? "cold_start"
                    : contextPlan.compactionBoundaryChanged ? "compaction_boundary_changed"
                        : contextPlan.transcriptProjectionChanged ? "transcript_projection_changed"
                            : contextPlan.stablePrefixChanged ? "stable_prefix_changed"
                                : contextPlan.prefixExtensionEligible !== true ? "prefix_below_provider_threshold"
                                    : contextPlan.adapterKind === "stable_prefix" ? "native_fields_unproven"
                                        : "provider_prefix_reuse_unproven";
    return {
        localHistoryState,
        providerCacheObservation,
        cacheMissReason,
        providerCacheReuseClass,
        providerCacheCandidateTokens: candidateTokens,
        providerCacheMatchedTokens: providerReadTokens,
        providerCachePartialReason,
        providerCacheColdStart: coldStart,
        providerCacheComparableEvidence: hasComparableProviderEvidence,
        providerCacheCandidateSource: candidateSource,
    };
}
//# sourceMappingURL=provider-cache-observation.js.map