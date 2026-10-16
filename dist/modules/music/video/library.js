"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoCollections = void 0;
exports.requireVideoSession = requireVideoSession;
exports.readBiliLibrary = readBiliLibrary;
exports.readDouyinLibrary = readDouyinLibrary;
const list_cache_1 = require("./list-cache");
const bilibili_account_1 = require("./bilibili-account");
const douyin_library_1 = require("./douyin-library");
const accounts_store_1 = require("./accounts-store");
const search_results_1 = require("../search-results");
// 个人列表只读；没有平台成功响应时报告能力/风控，不能返回伪造的成功空列表。
exports.videoCollections = { bilibili: [{ id: 'recommend', name: '推荐' }, { id: 'favorites', name: '我的收藏夹' }, { id: 'watchlater', name: '稍后再看' }, { id: 'following', name: '关注动态' }], douyin: [{ id: 'recommend', name: '推荐' }, { id: 'posts', name: '我的作品' }, { id: 'likes', name: '喜欢' }, { id: 'favorites', name: '收藏' }, { id: 'following', name: '关注作品' }] };
function requireVideoSession(owner, provider) { const state = (0, accounts_store_1.videoAccount)(owner, provider); if (state.status !== 'authenticated' || !state.cookieRef || !state.profile?.id)
    throw Object.assign(new Error('请先登录并核验' + (provider === 'bilibili' ? 'B站' : '抖音') + '账号'), { statusCode: 401, state: 'login_required' }); return state; }
const biliItem = (row) => ({ bvid: row.bvid, title: row.title, author: row.upper?.name || row.owner?.name || row.author || '', pic: row.cover || row.pic || '', duration: row.duration, sourceId: row.bvid });
async function readBiliLibrary(owner, kind, cursor, folder, force = false, signal) {
    const state = requireVideoSession(owner, 'bilibili'), page = Number(cursor || 1);
    if (kind !== 'following' && (!Number.isSafeInteger(page) || page < 1 || page > 10000))
        throw new Error('分页游标无效');
    if (kind === 'favorites' && !folder) {
        const data = await biliShared(owner, 'folders', next => (0, bilibili_account_1.biliRead)(owner, '/x/v3/fav/folder/created/list-all', { up_mid: state.profile.id }, undefined, next), force);
        if (!Array.isArray(data?.list))
            throw new Error('B站收藏夹响应格式不可用');
        return { collections: data.list.map(row => ({ id: String(row.id), name: row.title, count: row.media_count })), items: [], nextCursor: null };
    }
    if (kind === 'favorites') {
        if (!/^\d{1,24}$/.test(folder || ''))
            throw new Error('无效收藏夹');
        const owned = await biliShared(owner, 'folders', next => (0, bilibili_account_1.biliRead)(owner, '/x/v3/fav/folder/created/list-all', { up_mid: state.profile.id }, undefined, next), force);
        if (!owned.list?.some(row => String(row.id) === folder))
            throw Object.assign(new Error('收藏夹不属于当前账号'), { statusCode: 403 });
        const data = await (0, bilibili_account_1.biliRead)(owner, '/x/v3/fav/resource/list', { media_id: folder, pn: page, ps: 20, platform: 'web' }, undefined, signal);
        if (!Array.isArray(data?.medias) && Number(data?.info?.media_count) !== 0)
            throw new Error('B站收藏内容响应格式不可用');
        return { items: (0, search_results_1.signSearchResults)('bilibili', '', (data.medias || []).map(biliItem), 20), nextCursor: data.has_more ? String(page + 1) : null };
    }
    if (kind === 'watchlater') {
        const data = await biliShared(owner, 'watchlater', next => (0, bilibili_account_1.biliRead)(owner, '/x/v2/history/toview', {}, undefined, next), force, signal);
        if (!Array.isArray(data?.list))
            throw new Error('B站稍后再看响应格式不可用');
        const rows = data.list.slice((page - 1) * 20, page * 20);
        return { items: (0, search_results_1.signSearchResults)('bilibili', '', rows.map(biliItem), 20), nextCursor: data.list.length > page * 20 ? String(page + 1) : null };
    }
    if (kind === 'following') {
        if (cursor && !/^[\w-]{1,160}$/.test(cursor))
            throw new Error('无效动态游标');
        const data = await (0, bilibili_account_1.biliRead)(owner, '/x/polymer/web-dynamic/v1/feed/all', { type: 'video', ...(cursor ? { offset: cursor } : {}) }, undefined, signal);
        if (!Array.isArray(data?.items))
            throw new Error('B站关注动态响应格式不可用');
        const rows = data.items.map(row => { const item = row.modules?.module_dynamic?.major?.archive; return item ? { ...item, author: row.modules?.module_author?.name } : null; }).filter(Boolean);
        return { items: (0, search_results_1.signSearchResults)('bilibili', '', rows.map(biliItem), 20), nextCursor: data.has_more && data.offset ? String(data.offset) : null };
    }
    throw new Error('不支持的B站列表');
}
async function readDouyinLibrary(owner, kind, cursor, signal, refresh = false) {
    requireVideoSession(owner, 'douyin');
    return (0, douyin_library_1.readDouyinPersonalLibrary)(owner, kind, cursor, signal, refresh);
}
function biliShared(owner, kind, read, force = false, signal) { return (0, list_cache_1.cachedVideoList)(owner, 'bilibili', ['shared', kind], read, { freshOnly: true, force, signal }); }
//# sourceMappingURL=library.js.map