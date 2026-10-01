"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnifiedMusicSearch = handleUnifiedMusicSearch;
const utils_1 = require("../../core/utils");
const music_catalog_1 = require("./music-catalog");
const netease_1 = require("./netease");
const bilibili_1 = require("./bilibili");
const douyin_1 = require("./douyin");
const platform_http_1 = require("./platform-http");
const search_results_1 = require("./search-results");
const SOURCES = ['local', 'netease', 'bilibili', 'douyin'];
/** Only invoke selected providers. Omitted source preserves the legacy all-source API. */
async function handleUnifiedMusicSearch(res, params) {
    const source = params.source === undefined ? 'all' : params.source;
    if (typeof source !== 'string' || !['all', ...SOURCES].includes(source)) {
        (0, utils_1.sendJson)(res, { success: false, error: '无效的音乐搜索来源' }, 400);
        return;
    }
    const query = String(params.q || '').trim();
    const selected = source === 'all' ? SOURCES : [source];
    const response = { success: true, query, source, searched_sources: query ? selected : [], local: [], netease: [], bilibili: [], douyin: [], errors: {}, source_statuses: {}, total_results: 0 };
    if (!query) {
        (0, utils_1.sendJson)(res, response);
        return;
    }
    const providers = {
        local: () => (0, music_catalog_1.queryMusicCatalog)({ query, limit: 20 }).tracks,
        netease: () => (0, netease_1.neteaseSearch)(query),
        bilibili: () => (0, bilibili_1.biliSearch)(query),
        douyin: () => (0, douyin_1.douyinSearch)(query),
    };
    const results = await Promise.allSettled(selected.map(name => Promise.resolve().then(providers[name])));
    results.forEach((result, index) => {
        const name = selected[index];
        if (result.status === 'rejected') {
            const detail = (0, platform_http_1.publicMusicPlatformError)(result.reason);
            response.source_statuses[name] = { ...detail, result_count: 0 };
            response.errors[name] = detail.error;
            return;
        }
        const rows = Array.isArray(result.value) ? result.value : [];
        const status = { status: 'success', result_count: rows.length };
        if (name === 'douyin') {
            status.channel = rows[0]?.searchChannel || 'mcp';
            status.authenticated = (0, douyin_1.douyinPlatformStatus)().mcp?.authenticated === true;
        }
        response.source_statuses[name] = status;
        response[name] = name === 'local'
            ? rows.map(track => ({ type: 'local', track }))
            : (0, search_results_1.signSearchResults)(name, query, rows).map(item => ({ ...item, type: name }));
        response.total_results += response[name].length;
    });
    response.success = Object.values(response.source_statuses).some((s) => s.status === 'success');
    response.retryable = Object.values(response.source_statuses).some((s) => s.retryable);
    if (!response.success)
        response.error = source === 'all' ? '所有音乐来源暂时不可用，请稍后重试' : response.errors[source];
    (0, utils_1.sendJson)(res, response, response.success ? 200 : 503);
}
//# sourceMappingURL=unified-search.js.map