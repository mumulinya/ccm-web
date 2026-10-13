"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_ELIGIBILITY_CATALOG_VERSION = void 0;
exports.modelCacheEligibility = modelCacheEligibility;
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
exports.CACHE_ELIGIBILITY_CATALOG_VERSION = 'official-2026-10-10-v1';
/** Model names select documented length requirements, never write/routing authorization. */
function modelCacheEligibility(config, candidateTokens) {
    const model = String(config?.model || '').toLowerCase();
    const protocol = (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol;
    let host = '';
    try {
        host = new URL(config.apiUrl || '').hostname.toLowerCase();
    }
    catch { }
    let minimum = null;
    let source = 'unknown';
    if (host === 'api.openai.com' && ['responses', 'chat_completions'].includes(protocol)) {
        // Earlier models have request-dependent minimums; a universal 1024 floor
        // would claim eligibility for request shapes not covered by the docs.
        if (/^gpt-(?:5\.[6789](?:-|$)|6(?:\.[01])?(?:-|$))/.test(model))
            minimum = 1024;
        if (minimum != null)
            source = 'official_catalog';
    }
    else if (host === 'api.anthropic.com' && protocol === 'anthropic_messages') {
        const rows = [
            [/^claude-(?:fable-5(?:-1)?|mythos-5(?:-1)?|opus-5(?:-5)?|sonnet-5-5|haiku-5-5)(?:-|$)/, 512],
            [/^claude-(?:opus-4-[56]|haiku-4-5)(?:-|$)/, 4096],
            [/^claude-(?:opus-4-7|mythos-preview|haiku-3-5)(?:-|$)/, 2048],
            [/^claude-(?:sonnet-4(?:-[56])?|sonnet-5|opus-4(?:-[18])?)(?:-|$)/, 1024],
        ];
        minimum = rows.find(([pattern]) => pattern.test(model))?.[1] ?? null;
        if (minimum != null)
            source = 'official_catalog';
    }
    else if (host === 'generativelanguage.googleapis.com' && protocol === 'gemini_generate_content') {
        if (/^gemini-2\.5-(?:flash|pro)$/.test(model))
            minimum = 2048;
        if (/^gemini-(?:3\.[5678]-flash|3\.1-pro-preview)$/.test(model))
            minimum = 4096;
        if (minimum != null)
            source = 'official_catalog';
    }
    if (minimum == null) {
        const evidence = (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config)?.evidence;
        if (evidence?.minimumCacheableTokensVerified === true && Number.isFinite(evidence.minimumCacheableTokens) && evidence.minimumCacheableTokens > 0) {
            minimum = evidence.minimumCacheableTokens;
            source = 'provider_evidence';
        }
    }
    const candidate = Math.max(0, Number(candidateTokens) || 0);
    return { status: minimum == null ? 'unknown' : candidate >= minimum ? 'eligible' : 'ineligible',
        reason: minimum == null ? 'provider_conditions_unknown' : candidate >= minimum ? 'documented_prefix_candidate' : 'prefix_below_provider_threshold',
        minimumTokens: minimum, candidateTokens: candidate, precision: 'estimated', source, catalogVersion: exports.CACHE_ELIGIBILITY_CATALOG_VERSION };
}
//# sourceMappingURL=model-cache-eligibility.js.map