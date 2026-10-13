"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCacheValidationReport = buildCacheValidationReport;
const cache_validation_budget_1 = require("./cache-validation-budget");
const provider_request_diagnostics_1 = require("./provider-request-diagnostics");
const model_cache_metrics_1 = require("./model-cache-metrics");
const provider_cache_window_1 = require("./provider-cache-window");
const scope_navigation_validation_report_1 = require("./scope-navigation-validation-report");
function buildCacheValidationReport(id) {
    const run = (0, cache_validation_budget_1.readCacheValidationRun)(id);
    if (!run)
        throw new Error('CCM_CACHE_VALIDATION_NOT_FOUND');
    if (run.metadata.kind === 'scope_navigation_generation')
        return (0, scope_navigation_validation_report_1.buildScopeNavigationValidationReport)(id);
    const all = (0, provider_request_diagnostics_1.readProviderRequestDiagnostics)(undefined, { limit: 200, from: run.createdAt, to: run.metadata.finishedAt }).recentRequests;
    const requests = all.filter(row => row.validationRunId === id).sort((a, b) => Number(a.validationOrdinal) - Number(b.validationOrdinal));
    const terminal = requests.filter(row => ['completed', 'failed', 'cancelled'].includes(row.status));
    const firstSuccess = terminal.find(row => row.status === 'completed');
    const warm = terminal.filter(row => firstSuccess && Number(row.validationOrdinal) > Number(firstSuccess.validationOrdinal));
    const smallFinals = (0, provider_cache_window_1.providerCacheWindow)(warm).logical.filter(row => ['append_only', 'unchanged'].includes(row.wireReuseEvidence?.comparison)
        && Number.isFinite(row.wireReuseEvidence?.inputBreakdown?.appendedBytes) && row.wireReuseEvidence.inputBreakdown.appendedBytes <= 2000);
    const smallIds = new Set(smallFinals.map(row => row.logicalCallId || row.requestId));
    const small = warm.filter(row => smallIds.has(row.logicalCallId || row.requestId));
    const changes = requests.filter(row => row.validationOrdinal > 1 && row.configurationChanged !== true
        && (!['append_only', 'unchanged'].includes(row.wireReuseEvidence?.comparison) || row.cacheIdentityPreserved === false));
    const auditIds = new Set(requests.map(row => row.requestId));
    const missingReceipts = run.requests.filter(row => !auditIds.has(row.requestId)).map(row => row.requestId);
    const windows = run.windows || [{ openedAt: run.createdAt, closedAt: run.metadata.finishedAt }];
    const inWindow = (row) => windows.some(window => Date.parse(row.startedAt) >= Date.parse(window.openedAt)
        && (!window.closedAt || Date.parse(row.startedAt) < Date.parse(window.closedAt)));
    const unbudgeted = all.filter(row => inWindow(row) && row.validationRunId !== id);
    const outsideWindows = all.filter(row => !inWindow(row) && row.validationRunId !== id);
    const wholeMetrics = (0, model_cache_metrics_1.summarizeModelCacheRows)(terminal), warmMetrics = (0, model_cache_metrics_1.summarizeModelCacheRows)(warm), smallMetrics = (0, model_cache_metrics_1.summarizeModelCacheRows)(small);
    const reconciled = missingReceipts.length === 0 && requests.length === run.used && run.used <= run.limit && unbudgeted.length === 0 && requests.every(row => row.status !== 'started');
    const codeAccepted = reconciled && changes.length === 0 && run.metadata.messageCompleted >= 4 && run.metadata.deferredFlowVerified === true
        && run.metadata.restartVerified === true && run.status === 'completed';
    const accepted = codeAccepted && warmMetrics.cache_reported_calls >= 3 && Number(warmMetrics.request_hit_rate) >= .9
        && smallMetrics.cache_reported_calls >= 3 && Number(smallMetrics.token_reuse_rate) >= .8;
    return { validationRunId: id, trace_id: run.trace_id, sessionId: run.sessionId, status: run.status, limit: run.limit, used: run.used,
        leaseUntil: run.leaseUntil, windows, metadata: run.metadata, requests, permits: run.requests, rejections: run.rejections,
        missingReceipts, unbudgetedRequestIds: unbudgeted.map(row => row.requestId), reconciled,
        nonessentialPrefixChanges: changes.length, codeAccepted, whole: wholeMetrics, warm: warmMetrics, smallAppend: smallMetrics,
        logicalCalls: wholeMetrics.logical_calls, physicalAttempts: terminal.length, auxiliaryAttempts: terminal.filter(row => row.attribution?.requestClass === 'auxiliary').length,
        outsideValidationWindows: { attempts: outsideWindows.length, auxiliaryAttempts: outsideWindows.filter(row => row.attribution?.requestClass === 'auxiliary').length,
            requests: outsideWindows.map(row => ({ requestId: row.requestId, startedAt: row.startedAt, status: row.status, httpStatus: row.httpStatus, purpose: row.attribution?.purpose, contentStored: false })) },
        accepted, contentStored: false };
}
//# sourceMappingURL=cache-validation-report.js.map