"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualProviderCacheFields = actualProviderCacheFields;
const crypto_1 = require("crypto");
/** Only protocol-owned cache fields are inspected; tool arguments and text are opaque. */
function actualProviderCacheFields(body) {
    const fields = ['prompt_cache_key', 'prompt_cache_options', 'prompt_cache_retention', 'cachedContent', 'context_management']
        .filter(name => Object.prototype.hasOwnProperty.call(body, name));
    let breakpoints = 0;
    let blockControls = 0;
    const visit = (block) => {
        if (!block || typeof block !== 'object')
            return;
        if (block.prompt_cache_breakpoint)
            breakpoints++;
        if (block.cache_control)
            blockControls++;
        if (Array.isArray(block.content))
            block.content.forEach(visit);
    };
    for (const name of ['input', 'messages', 'system', 'tools']) {
        if (Array.isArray(body[name]))
            body[name].forEach(visit);
    }
    if (breakpoints)
        fields.push('prompt_cache_breakpoint');
    if (blockControls)
        fields.push('cache_control');
    const present = typeof body.prompt_cache_key === 'string' && body.prompt_cache_key.length > 0;
    return {
        requestFields: fields, requestPatchApplied: fields.length > 0,
        explicitBreakpointCount: breakpoints + blockControls, promptCacheKeyPresent: present,
        promptCacheKeyChecksum: present ? (0, crypto_1.createHash)('sha256').update(body.prompt_cache_key).digest('hex').slice(0, 32) : '',
        // Hash arbitrary option values instead of storing potentially sensitive data.
        optionsChecksum: fields.includes('prompt_cache_options')
            ? (0, crypto_1.createHash)('sha256').update(JSON.stringify(body.prompt_cache_options)).digest('hex') : '',
        retention: ['24h', 'in-memory'].includes(body.prompt_cache_retention) ? body.prompt_cache_retention : 'provider_default',
        evidenceSource: 'actual_request_body', contentStored: false,
    };
}
//# sourceMappingURL=provider-request-cache-fields.js.map