"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScopeNavigationValidationReport = buildScopeNavigationValidationReport;
const fs = __importStar(require("fs"));
const cache_validation_budget_1 = require("./cache-validation-budget");
const provider_request_diagnostics_1 = require("./provider-request-diagnostics");
const model_cache_metrics_1 = require("./model-cache-metrics");
const provider_cache_window_1 = require("./provider-cache-window");
/** 只读重算：预算、正式回执、持久化任务证据是验收依据。 */
function buildScopeNavigationValidationReport(id) {
    const run = (0, cache_validation_budget_1.readCacheValidationRun)(id);
    if (!run)
        throw new Error('CCM_CACHE_VALIDATION_NOT_FOUND');
    const observationFinishedAt = run.status === 'running' ? undefined : run.metadata.observationFinishedAt;
    const all = (0, provider_request_diagnostics_1.readProviderRequestDiagnostics)(undefined, { limit: 200, from: run.createdAt, to: run.status === 'running' ? undefined : observationFinishedAt || run.metadata.finishedAt }).recentRequests;
    const requests = all.filter(row => row.validationRunId === id).sort((a, b) => a.validationOrdinal - b.validationOrdinal);
    const ids = new Set(requests.map(row => row.requestId));
    const missingReceipts = run.requests.filter(row => !ids.has(row.requestId)).map(row => row.requestId);
    const windows = run.windows || [{ openedAt: run.createdAt, closedAt: run.metadata.finishedAt }];
    const inWindow = (row) => windows.some(window => row.startedAt >= window.openedAt && (!window.closedAt || row.startedAt < window.closedAt));
    const unbudgeted = all.filter(row => inWindow(row) && row.validationRunId !== id);
    const restoredBackground = all.filter(row => !inWindow(row) && row.validationRunId !== id);
    let evidence = [];
    let pending = [];
    try {
        const store = JSON.parse(fs.readFileSync(run.metadata.generationStoreFile, 'utf8'));
        evidence = (store.generationEvidence || []).filter((row) => row.validationId === id);
        pending = (store.jobs || []).filter((row) => row.validationId === id);
    }
    catch { }
    const scopes = Object.fromEntries(['project', 'group'].map(scope => {
        const rows = requests.filter(row => row.attribution.scope === scope && row.attribution.scopeId === run.metadata[`${scope}Id`]);
        const first = rows.find(row => row.status === 'completed');
        const warm = rows.filter(row => first && row.validationOrdinal > first.validationOrdinal);
        const finals = (0, provider_cache_window_1.providerCacheWindow)(warm).logical;
        const repairOrdinal = scope === 'project' ? Number(run.metadata.sourceBoundaryRepair?.afterOrdinal || 0) : 0;
        const declaredInputChanges = repairOrdinal ? warm.filter(row => row.validationOrdinal === repairOrdinal + 1) : [];
        const changes = warm.filter(row => row.configurationChanged !== true && row.validationOrdinal !== (repairOrdinal ? repairOrdinal + 1 : -1) &&
            (!['unchanged', 'append_only'].includes(row.wireReuseEvidence?.comparison) || row.cacheIdentityPreserved === false));
        const metrics = (0, model_cache_metrics_1.summarizeModelCacheRows)(warm);
        const repairRows = repairOrdinal ? rows.filter(row => row.validationOrdinal > repairOrdinal) : [];
        const repairCold = repairRows.find(row => row.status === 'completed');
        const repairWarm = repairRows.filter(row => repairCold && row.validationOrdinal > repairCold.validationOrdinal);
        const comparable = finals.filter(row => row.status === 'completed' && (0, provider_cache_window_1.cacheUsageKnown)(row) && row.cacheIdentityPreserved === true
            && ['unchanged', 'append_only'].includes(row.wireReuseEvidence?.comparison)
            && Number.isFinite(row.wireReuseEvidence?.inputBreakdown?.appendedBytes) && row.wireReuseEvidence.inputBreakdown.appendedBytes <= 2000);
        return [scope, { whole: (0, model_cache_metrics_1.summarizeModelCacheRows)(rows), warm: metrics, comparableSamples: comparable.length, nonessentialPrefixChanges: changes.length,
                declaredInputChanges: declaredInputChanges.map(row => ({ requestId: row.requestId, reason: run.metadata.sourceBoundaryRepair.reason, contentStored: false })),
                ...(repairOrdinal ? { repairPhase: { afterOrdinal: repairOrdinal, reason: run.metadata.sourceBoundaryRepair.reason,
                        whole: (0, model_cache_metrics_1.summarizeModelCacheRows)(repairRows), warm: (0, model_cache_metrics_1.summarizeModelCacheRows)(repairWarm),
                        stableWarmSamples: (0, provider_cache_window_1.providerCacheWindow)(repairWarm).logical.filter(row => row.wireReuseEvidence?.comparison === 'unchanged' && row.cacheIdentityPreserved === true).length,
                        originalSamplesRetained: true, affectsOverallAcceptance: true } } : {}),
                providerAccepted: metrics.cache_reported_calls >= 3 && metrics.cache_unreported_calls === 0 && Number(metrics.request_hit_rate) >= .9
                    && Number(metrics.token_reuse_rate) >= .8 && comparable.length >= 3 }];
    }));
    const reconciled = missingReceipts.length === 0 && requests.length === run.used && run.used <= run.limit && unbudgeted.length === 0
        && requests.every(row => ['completed', 'failed', 'cancelled'].includes(row.status))
        && requests.every(row => run.requests.some(permit => permit.requestId === row.requestId && permit.status === row.status));
    const automaticReuse = ['project', 'group'].every(kind => evidence.some(row => row.kind === kind && row.outcome === 'local_reuse' && row.requestIds.length === 0));
    const linkedRequests = new Set(evidence.flatMap(row => row.requestIds));
    const codeAccepted = reconciled && automaticReuse && pending.length === 0 && run.metadata.restartVerified === true && run.status === 'completed'
        && requests.every(row => linkedRequests.has(row.requestId)) && Object.values(scopes).every((scope) => scope.nonessentialPrefixChanges === 0 && scope.whole.logical_calls >= 4)
        && evidence.filter(row => row.outcome === 'model').length >= 8;
    return { validationRunId: id, trace_id: run.trace_id, status: run.status, limit: run.limit, used: run.used, windows, requests, permits: run.requests, rejections: run.rejections,
        logicalCalls: (0, model_cache_metrics_1.summarizeModelCacheRows)(requests).logical_calls, physicalAttempts: requests.length,
        auxiliaryAttempts: requests.filter(row => row.attribution.requestClass === 'auxiliary').length,
        derivedAuxiliaryRequests: requests.filter(row => row.attribution.purpose !== 'scope_navigation_generation'),
        missingReceipts, unbudgetedRequestIds: unbudgeted.map(row => row.requestId), reconciled, automaticReuse, pendingTaskIds: pending.map(row => row.key), evidence, scopes,
        restoredBackground: { observationFinishedAt: observationFinishedAt || null, requests: restoredBackground, attempts: restoredBackground.length },
        whole: (0, model_cache_metrics_1.summarizeModelCacheRows)(requests), codeAccepted, accepted: codeAccepted && Object.values(scopes).every((scope) => scope.providerAccepted), contentStored: false };
}
//# sourceMappingURL=scope-navigation-validation-report.js.map