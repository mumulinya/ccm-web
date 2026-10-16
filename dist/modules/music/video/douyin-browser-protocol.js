"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOUYIN_LIST_PATHS = void 0;
exports.douyinBrowserApiUrl = douyinBrowserApiUrl;
exports.douyinListRequest = douyinListRequest;
exports.parseDouyinList = parseDouyinList;
// 官网会按区域把已签名的个人请求发送到 www-hj；只接受实际观察到的官方主机。
const DOUYIN_BROWSER_API_HOSTS = new Set(['www.douyin.com', 'www-hj.douyin.com']);
function douyinBrowserApiUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port && DOUYIN_BROWSER_API_HOSTS.has(url.hostname) ? url : null;
    }
    catch {
        return null;
    }
}
exports.DOUYIN_LIST_PATHS = {
    posts: ['/aweme/v1/web/aweme/post/'],
    likes: ['/aweme/v1/web/aweme/favorite/', '/aweme/v1/web/aweme/like/'],
    favorites: ['/aweme/v1/web/aweme/listcollection/', '/aweme/v1/web/aweme/collection/'],
    following: ['/aweme/v1/web/follow/feed/', '/aweme/v1/web/aweme/follow/'],
};
function douyinListRequest(kind, address, selfId, postData) {
    const url = douyinBrowserApiUrl(address), paths = exports.DOUYIN_LIST_PATHS[kind];
    if (!url || !paths?.includes(url.pathname))
        return null;
    let body = {};
    if (postData && postData.length <= 65536) {
        try {
            body = postData.trim().startsWith('{') ? JSON.parse(postData) : Object.fromEntries(new URLSearchParams(postData));
        }
        catch {
            return null;
        }
    }
    // 排除后台预取其他作者作品的响应。
    const target = url.searchParams.get('sec_user_id') || body.sec_user_id;
    if (target && selfId?.startsWith('MS4wLjABAAAA') && target !== selfId)
        return null;
    const cursor = String(url.searchParams.get('max_cursor') ?? url.searchParams.get('cursor') ?? body.max_cursor ?? body.cursor ?? '0');
    return /^\d{1,24}$/.test(cursor) ? { cursor } : null;
}
function parseDouyinList(data, cursor, kind) {
    if (data?.status_code !== 0)
        throw Object.assign(new Error('抖音未成功返回此列表，请在官方窗口检查登录或验证状态'), { state: 'risk_controlled', statusCode: 422 });
    // 空数组与明确的 null+has_more=0 都是官网的成功空列表；缺少列表字段不能当空列表。
    const empty = Object.prototype.hasOwnProperty.call(data, 'aweme_list') && data.aweme_list === null && [0, false].includes(data.has_more);
    const feed = kind === 'following' && Array.isArray(data.data);
    if (!Array.isArray(data.aweme_list) && !empty && !feed)
        throw Object.assign(new Error('抖音列表响应格式暂不支持'), { state: 'capability_unavailable', statusCode: 422 });
    const next = String(data.max_cursor ?? data.cursor ?? ''), more = data.has_more === true || data.has_more === 1;
    if (more && (!/^\d{1,24}$/.test(next) || next === cursor))
        throw Object.assign(new Error('抖音未返回有效的下一页游标，请刷新此列表'), { state: 'pagination_unavailable', statusCode: 422 });
    return { rows: feed ? data.data.map(row => row?.aweme).filter(row => row?.aweme_id) : data.aweme_list || [], nextCursor: more ? next : null };
}
//# sourceMappingURL=douyin-browser-protocol.js.map