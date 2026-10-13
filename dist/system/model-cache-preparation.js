"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelCacheAdapterPatch = modelCacheAdapterPatch;
exports.prepareModelCacheSafely = prepareModelCacheSafely;
exports.completeModelCacheSafely = completeModelCacheSafely;
const provider_context_cache_adapters_1 = require("./provider-context-cache-adapters");
const performance_monitor_1 = require("./performance-monitor");
/** Keep legacy implicit request bytes intact while preparing its audit plan. */
function modelCacheAdapterPatch(config, plan, capability, messages, options) {
    const patch = (0, provider_context_cache_adapters_1.buildProviderContextCacheAdapterRequestPatch)(config, plan, capability, messages);
    if (!options?._modelCachePreserveWire)
        return patch;
    const execution = { ...patch.strategy.execution, keyMode: 'none', breakpointMode: 'none', editingMode: 'none' };
    return { ...patch, body: {}, headers: {}, breakpointMessageIndexes: [], breakpointChecksums: [],
        promptCacheKeyPresent: false, promptCacheKeyChecksum: '', cacheKeyOmissionReason: 'legacy_wire_preserved',
        breakpointOmissionReason: 'legacy_wire_preserved',
        strategy: { ...patch.strategy, transport: 'stable_prefix', execution } };
}
async function prepareModelCacheSafely(options, prepare, fallback) {
    try {
        const value = await (0, performance_monitor_1.measureAsyncPerformance)('model.context_preparation', prepare);
        options.cachePreparationStatus = value?.plan === null ? 'skipped' : options?._modelCachePreserveWire ? 'prepared_legacy_wire' : 'prepared';
        return value;
    }
    catch (error) {
        // Context capacity and identity failures are business gates, not telemetry.
        if (/IDENTITY|CREDENTIAL|TOKEN_GATE|CONTEXT.*(?:EXCEED|BLOCK|BUDGET)/.test(String(error?.code || '')))
            throw error;
        options.cachePreparationStatus = 'degraded';
        return fallback;
    }
}
/** A diagnostic persistence failure must not replace a successful model reply. */
function completeModelCacheSafely(complete) {
    try {
        return complete();
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=model-cache-preparation.js.map