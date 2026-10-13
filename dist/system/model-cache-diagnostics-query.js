"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelCacheDiagnosticFilters = modelCacheDiagnosticFilters;
function modelCacheDiagnosticFilters(query = {}) {
    const filters = {};
    if (query.execution_origin) {
        if (!['business', 'test', 'probe', 'unknown'].includes(query.execution_origin))
            throw new Error('无效的请求来源');
        filters.executionOrigin = query.execution_origin;
    }
    if (query.request_class) {
        if (!['foreground_main', 'auxiliary', 'probe', 'unattributed'].includes(query.request_class))
            throw new Error('无效的请求分类');
        filters.requestClass = query.request_class;
    }
    for (const key of ['protocol', 'model']) {
        if (query[key]) {
            if (String(query[key]).length > 240 || /[\x00-\x1f]/.test(query[key]))
                throw new Error('无效的诊断筛选');
            filters[key] = String(query[key]);
        }
    }
    for (const key of ['from', 'to'])
        if (query[key]) {
            if (!Number.isFinite(Date.parse(query[key])))
                throw new Error('无效的时间窗口');
            filters[key] = new Date(query[key]).toISOString();
        }
    if (filters.from && filters.to && filters.from > filters.to)
        throw new Error('无效的时间窗口');
    if (query.limit) {
        if (!/^\d+$/.test(String(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 200)
            throw new Error('无效的请求数量');
        filters.limit = Number(query.limit);
    }
    return filters;
}
//# sourceMappingURL=model-cache-diagnostics-query.js.map