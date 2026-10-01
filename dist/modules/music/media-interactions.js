"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicInteractionIdentity = musicInteractionIdentity;
exports.ensureNeteaseRequest = ensureNeteaseRequest;
exports.readMediaComments = readMediaComments;
exports.handleMusicInteractions = handleMusicInteractions;
const utils_1 = require("../../core/utils");
const search_results_1 = require("./search-results");
const music_catalog_1 = require("./music-catalog");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const netease_mv_1 = require("./netease-mv");
const platform_http_1 = require("./platform-http");
const media_detail_api_1 = require("./media-detail-api");
function musicInteractionIdentity(body) {
    if (!!body.trackId === !!body.downloadToken)
        throw new Error('请选择曲库条目或签名搜索结果');
    if (Object.keys(body).some(k => !['trackId', 'source', 'downloadToken', 'mediaKind', 'cursor'].includes(k)))
        throw new Error('不接受自定义媒体地址或路径');
    if (body.mediaKind && !['audio', 'video'].includes(body.mediaKind))
        throw new Error('无效媒体类型');
    if (body.trackId) {
        if (body.source)
            throw new Error('曲库来源由服务端解析');
        const track = (0, music_catalog_1.findMusicCatalogTrackById)(body.trackId);
        if (!track)
            throw new Error('曲库条目不存在');
        return { source: track.media?.source, sourceId: track.media?.sourceId };
    }
    return (0, search_results_1.verifyDownloadToken)(body.downloadToken, body.source);
}
async function ensureNeteaseRequest(body) {
    if (body.videoJobId)
        return;
    const identity = musicInteractionIdentity(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'videoJobId')));
    if (identity.source === 'netease' && body.mediaKind !== 'audio')
        await (0, netease_mv_1.resolveNeteaseMv)(identity.sourceId);
}
const cache = new Map();
async function readMediaComments(body) {
    const { source, sourceId } = musicInteractionIdentity(body);
    if (!['netease', 'bilibili', 'douyin'].includes(source) || !sourceId)
        return { comments: [], hasMore: false, message: '此本地文件没有可靠的平台关联' };
    if (!(source === 'bilibili' ? /^BV[\da-zA-Z]{10}$/ : /^\d{1,24}$/).test(sourceId))
        throw new Error('无效平台媒体 ID');
    const cursor = String(body.cursor || '0');
    if (!/^\d{1,10}$/.test(cursor))
        throw new Error('无效分页游标');
    const mvId = source === 'netease' && body.mediaKind === 'video' ? await (0, netease_mv_1.resolveNeteaseMv)(sourceId) : null;
    if (source === 'netease' && body.mediaKind === 'video' && !mvId)
        return { comments: [], hasMore: false, message: '暂无关联 MV' };
    const key = `${source}:${mvId ? 'mv:' + mvId : sourceId}:${cursor}`;
    if (cache.has(key) && Date.now() - cache.get(key).time < 300000)
        return cache.get(key).result;
    let rows = [], hasMore = false, nextCursor = Number(cursor) + 20;
    if (source === 'netease') {
        const resource = mvId ? `R_MV_5_${mvId}` : `R_SO_4_${sourceId}`;
        const data = await (0, netease_mv_1.neteaseJson)(`https://music.163.com/api/v1/resource/comments/${resource}?limit=20&offset=${cursor}`);
        if (data.code !== 200)
            throw new Error('网易云评论暂不可用');
        rows = [...(Number(cursor) === 0 ? data.hotComments || [] : []), ...(data.comments || [])];
        hasMore = !!data.more;
    }
    else if (source === 'bilibili') {
        const get = (url) => (0, platform_http_1.musicPlatformJson)({ url, headers: { Referer: 'https://www.bilibili.com/', 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 10000, maxBytes: 2 * 1024 * 1024, retries: 1 });
        const view = await get(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(sourceId)}`);
        if (!view.data?.aid)
            throw new Error('B站视频暂不可访问');
        const data = await get(`https://api.bilibili.com/x/v2/reply?type=1&oid=${view.data.aid}&pn=${Math.floor(Number(cursor) / 20) + 1}&ps=20&sort=2`);
        if (data.code !== 0)
            throw new Error('B站评论暂不可用');
        rows = data.data?.replies || [];
        hasMore = Number(data.data?.page?.count || 0) > nextCursor;
    }
    else {
        const data = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoComments)(sourceId, Number(cursor), 20);
        rows = data.comments || data.data?.comments || [];
        hasMore = !!(data.metadata?.has_more ?? data.has_more ?? data.hasMore ?? data.data?.has_more);
        nextCursor = Number(data.metadata?.cursor ?? data.cursor ?? data.data?.cursor ?? nextCursor);
    }
    const comments = [...new Map(rows.map((r) => {
            const id = String(r.commentId ?? r.comment_id ?? r.rpid ?? r.cid ?? r.id ?? '');
            return [id, { id, source, author: String(r.nickname || r.user?.nickname || r.member?.uname || r.author?.nickname || r.author || '用户'), text: String(r.content?.message ?? r.content ?? r.text ?? '').slice(0, 3000) }];
        })).values()].filter((r) => r.id && r.text);
    const result = { comments, hasMore, nextCursor: hasMore ? String(nextCursor) : null, source, mediaId: mvId || sourceId };
    if (cache.size >= 200)
        cache.delete(cache.keys().next().value);
    cache.set(key, { time: Date.now(), result });
    return result;
}
function handleMusicInteractions(pathname, req, res) {
    if ((0, media_detail_api_1.handleMusicDetailApi)(pathname, req, res))
        return true;
    if (!['/api/music/media/comments', '/api/music/media/association'].includes(pathname))
        return false;
    if (req.method !== 'POST') {
        (0, utils_1.sendJson)(res, { success: false, error: '请使用 POST' }, 405);
        return true;
    }
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); if (Buffer.byteLength(raw) > 16384)
        req.destroy(); });
    req.on('end', async () => {
        try {
            const body = JSON.parse(raw || '{}');
            if (pathname.endsWith('/comments'))
                (0, utils_1.sendJson)(res, { success: true, ...await readMediaComments(body) });
            else {
                const { source, sourceId } = musicInteractionIdentity(body);
                const mvId = source === 'netease' ? await (0, netease_mv_1.resolveNeteaseMv)(sourceId) : null;
                (0, utils_1.sendJson)(res, { success: true, source, sourceId, video: mvId ? { source, mediaType: 'mv', mediaId: mvId, timeline: 'independent' } : null });
            }
        }
        catch (e) {
            const detail = (0, platform_http_1.publicMusicPlatformError)(e);
            (0, utils_1.sendJson)(res, { success: false, error: detail.error || '媒体信息暂不可用', errorKind: detail.status }, 400);
        }
    });
    return true;
}
//# sourceMappingURL=media-interactions.js.map