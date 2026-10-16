"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeScopeNavigationValidation = observeScopeNavigationValidation;
const cache_validation_budget_1 = require("./cache-validation-budget");
/** Advance the cutoff before every read, including the final read; never request a model. */
async function observeScopeNavigationValidation(id, options) {
    const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const deadline = Date.now() + (options.timeoutMs ?? 180_000);
    let serviceHealthy = false, backgroundResumed = false, value;
    const pending = (report) => report.restoredBackground.requests.some((row) => !['completed', 'failed', 'cancelled'].includes(row.status));
    await sleep(options.pauseMs ?? 30_000);
    while (true) {
        (0, cache_validation_budget_1.updateCacheValidationMetadata)(id, { observationFinishedAt: new Date().toISOString() });
        value = options.report(id);
        if (pending(value) && Date.now() < deadline) {
            await sleep(Math.min(options.intervalMs ?? 15_000, Math.max(0, deadline - Date.now())));
            continue;
        }
        serviceHealthy = await options.healthy().catch(() => false);
        backgroundResumed = !(0, cache_validation_budget_1.cacheValidationBackgroundDeferred)();
        (0, cache_validation_budget_1.updateCacheValidationMetadata)(id, { observationFinishedAt: new Date().toISOString(), serviceHealthy, backgroundResumed });
        value = options.report(id);
        // A scheduler can start the next task while health is being checked.
        if (!pending(value) || Date.now() >= deadline)
            break;
        await sleep(Math.min(options.intervalMs ?? 15_000, Math.max(0, deadline - Date.now())));
    }
    const run = (0, cache_validation_budget_1.readCacheValidationRun)(id);
    if (run.metadata.baselinePolicy === 'stable-v1')
        (0, cache_validation_budget_1.updateCacheValidationMetadata)(id, { runtimeCloseout: { finishedAt: new Date().toISOString(),
                completed: serviceHealthy && backgroundResumed && value.pendingTaskIds.length === 0
                    && value.restoredBackground.requests.every((row) => ['completed', 'failed', 'cancelled'].includes(row.status)), contentStored: false } });
    return options.report(id);
}
//# sourceMappingURL=scope-navigation-validation-observation.js.map