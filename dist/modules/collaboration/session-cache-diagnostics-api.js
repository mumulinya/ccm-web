"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSessionCacheDiagnosticsApi = handleSessionCacheDiagnosticsApi;
const utils_1 = require("../../core/utils");
const provider_cache_scope_metrics_1 = require("../../system/provider-cache-scope-metrics");
const access_policy_1 = require("../system/access-policy");
const provider_request_diagnostics_1 = require("../../system/provider-request-diagnostics");
const cache_validation_budget_1 = require("../../system/cache-validation-budget");
const model_cache_diagnostics_query_1 = require("../../system/model-cache-diagnostics-query");
function handleSessionCacheDiagnosticsApi(pathname, req, res, parsed) {
    let filters;
    if (pathname === '/api/agent-sessions/cache-diagnostics' || /^\/api\/agent-sessions\/[^/]+\/cache-diagnostics$/.test(pathname)) {
        try {
            filters = (0, model_cache_diagnostics_query_1.modelCacheDiagnosticFilters)(parsed.query);
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            return true;
        }
    }
    if (pathname === '/api/agent-sessions/cache-diagnostics') {
        res.setHeader('Cache-Control', 'private, no-store');
        if (req.method !== 'GET')
            (0, utils_1.sendJson)(res, { success: false, error: '仅支持读取' }, 405);
        else if (!req.ccmAuth || !['admin'].includes(req.ccmAuth.role) && req.ccmAuth.kind !== 'internal')
            (0, utils_1.sendJson)(res, { success: false, error: '无权读取整体请求诊断' }, 403);
        else
            (0, utils_1.sendJson)(res, { success: true, diagnostics: (0, provider_request_diagnostics_1.readProviderRequestDiagnostics)(undefined, filters), contentStored: false });
        return true;
    }
    const match = /^\/api\/agent-sessions\/([^/]+)\/cache-diagnostics$/.exec(pathname);
    if (!match)
        return false;
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'GET') {
        (0, utils_1.sendJson)(res, { success: false, error: '仅支持读取' }, 405);
        return true;
    }
    let sessionId = '';
    try {
        sessionId = decodeURIComponent(match[1]);
    }
    catch { }
    const scope = String(parsed.query?.scope || '');
    const scopeId = scope === 'global' ? 'global' : String(parsed.query?.scope_id || parsed.query?.scopeId || '');
    if (!sessionId || sessionId.length > 240 || /[\x00-\x1f/\\]/.test(sessionId)
        || !['global', 'project', 'group'].includes(scope) || !scopeId || scopeId.length > 240) {
        (0, utils_1.sendJson)(res, { success: false, error: '缺少有效的缓存会话范围' }, 400);
        return true;
    }
    const principal = req.ccmAuth;
    const allowed = principal && (principal.kind === 'internal' || principal.role === 'admin'
        || ((0, access_policy_1.hasFeatureAccess)(principal.userId, principal.role, scope === 'global' ? 'workbench' : 'resource_workspace')
            && (scope === 'global' || (0, access_policy_1.hasResourceAccess)(principal.userId, principal.role, scope, scopeId, 'use'))));
    if (!allowed) {
        (0, utils_1.sendJson)(res, { success: false, error: '无权读取该会话缓存诊断' }, 403);
        return true;
    }
    (0, utils_1.sendJson)(res, { success: true, diagnostics: { ...(0, provider_cache_scope_metrics_1.readProviderCacheSessionDiagnostics)({ scope, scopeId, sessionId }, null, undefined, filters),
            ...(0, provider_request_diagnostics_1.readProviderRequestDiagnostics)({ scope, scopeId, exactSessionId: sessionId }, filters),
            cacheValidation: (() => { const run = (0, cache_validation_budget_1.cacheValidationForSession)(sessionId); return run ? { id: run.id, trace_id: run.trace_id, status: run.status, limit: run.limit, used: run.used, rejections: run.rejections.length } : null; })(),
            canReadOverallRequests: principal.kind === 'internal' || principal.role === 'admin' }, contentStored: false });
    return true;
}
//# sourceMappingURL=session-cache-diagnostics-api.js.map