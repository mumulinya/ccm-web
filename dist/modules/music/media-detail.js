"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailIdentity = detailIdentity;
exports.readMusicDetailResilient = readMusicDetailResilient;
exports.readMusicDetail = readMusicDetail;
const search_results_1 = require("./search-results");
const music_catalog_1 = require("./music-catalog");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const netease_mv_1 = require("./netease-mv");
const platform_http_1 = require("./platform-http");
function detailIdentity(body) {
    if (!body || Object.keys(body).some(k => !['source', 'downloadToken', 'trackId', 'mediaKind'].includes(k)))
        throw new Error('不接受自定义地址、媒体 ID 或路径');
    if (!!body.trackId === !!body.downloadToken)
        throw new Error('请选择曲库条目或签名搜索结果');
    if (body.mediaKind && !['audio', 'video'].includes(body.mediaKind))
        throw new Error('无效媒体类型');
    if (body.trackId) {
        if (body.source)
            throw new Error('曲库来源由服务端解析');
        const track = (0, music_catalog_1.findMusicCatalogTrackById)(String(body.trackId));
        if (!track)
            throw new Error('曲库条目不存在');
        return { source: track.media?.source || 'local', sourceId: track.media?.sourceId || track.trackId, title: track.title, artist: track.artist, track };
    }
    const token = (0, search_results_1.verifyDownloadToken)(body.downloadToken, body.source);
    if (!['douyin', 'bilibili', 'netease'].includes(token.source) || !(token.source === 'bilibili' ? /^BV[a-zA-Z0-9]{10}$/ : /^\d{1,24}$/).test(token.sourceId))
        throw new Error('无效媒体身份');
    return { ...token, track: null };
}
const text = (v, max = 500) => typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : '';
const numeric = (v) => v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null;
function picture(v) { try {
    const u = new URL(String(v));
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : '';
}
catch {
    return '';
} }
const cache = new Map();
/** 返回最近一次成功详情，避免瞬态上游空响应让详情抽屉整体失效。 */
async function readMusicDetailResilient(body) {
    try {
        return await readMusicDetail(body);
    }
    catch (error) {
        const category = String(error?.category || '').toLowerCase();
        const message = String(error?.message || '').toLowerCase();
        const transient = ['network_error', 'unavailable', 'timeout', '数据获取失败', 'failed to parse', 'invalid json', 'upstream'].some(token => category.includes(token) || message.includes(token));
        if (!transient)
            throw error;
        try {
            const identity = detailIdentity(body);
            const key = `${identity.source}:${identity.sourceId}:${body.mediaKind || 'audio'}`;
            const stale = cache.get(key)?.value;
            if (stale)
                return { ...stale, stale: true, staleMessage: '网络暂时不可用，显示最近一次详情' };
        }
        catch {
            // 身份校验错误继续由原始错误处理。
        }
        throw error;
    }
}
/** 显式字段投影：不透传上游原始对象、签名媒体地址或凭据。 */
async function readMusicDetail(body) {
    const identity = detailIdentity(body), { source, sourceId } = identity;
    const key = `${source}:${sourceId}:${body.mediaKind || 'audio'}`;
    if (source !== 'local' && cache.has(key) && Date.now() - cache.get(key).at < 300000)
        return cache.get(key).value;
    const result = { source, sourceId, title: identity.title, publisher: '', artist: '', album: '', description: '', cover: '', durationSeconds: null, publishedAt: null, musicTitle: '', musicArtist: '', videoAvailable: source === 'douyin' || source === 'bilibili', mvId: null, version: '版本未确认', statistics: {}, originalUrl: '', contentType: source === 'netease' ? '歌曲' : source === 'local' ? '本地音频' : '视频音频' };
    if (source === 'douyin') {
        const raw = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoDetail)(sourceId);
        const row = (0, douyin_mcp_bridge_1.normalizeDouyinRows)(raw?.video || raw).find(r => r.awemeId === sourceId);
        if (!row)
            throw new Error('未找到当前视频详情');
        const v = raw.video || raw.aweme_detail || raw.data?.aweme_detail || raw;
        Object.assign(result, { title: text(v.title || v.desc || row.title, 3000), publisher: row.author, cover: picture(row.pic), description: text(v.desc || v.title, 5000), durationSeconds: numeric(v.video_duration ?? v.video?.duration) != null ? Number(v.video_duration ?? v.video.duration) / 1000 : numeric(v.duration), publishedAt: numeric(v.create_time), musicTitle: row.musicTitle || '', musicArtist: row.musicAuthor || '', originalUrl: `https://www.douyin.com/video/${sourceId}`, statistics: { likes: numeric(v.liked_count ?? v.statistics?.digg_count), comments: numeric(v.comment_count ?? v.statistics?.comment_count), shares: numeric(v.share_count ?? v.statistics?.share_count) } });
    }
    else if (source === 'bilibili') {
        const raw = await (0, platform_http_1.musicPlatformJson)({ url: `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(sourceId)}`, headers: { Referer: 'https://www.bilibili.com/', 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 10000, maxBytes: 2 * 1024 * 1024, retries: 1 });
        const v = raw.data;
        if (raw.code !== 0 || v?.bvid !== sourceId)
            throw new Error('B站视频不可访问');
        Object.assign(result, { title: text(v.title, 3000), publisher: text(v.owner?.name), cover: picture(v.pic), description: text(v.desc, 5000), durationSeconds: numeric(v.pages?.[0]?.duration ?? v.duration), publishedAt: numeric(v.pubdate), category: text(v.tname), partCount: numeric(v.videos), originalUrl: `https://www.bilibili.com/video/${sourceId}`, statistics: { views: numeric(v.stat?.view), likes: numeric(v.stat?.like), comments: numeric(v.stat?.reply) } });
    }
    else if (source === 'netease') {
        const raw = await (0, netease_mv_1.neteaseJson)(`https://music.163.com/api/song/detail?ids=${encodeURIComponent(JSON.stringify([sourceId]))}`);
        const s = raw.songs?.find((v) => String(v.id) === sourceId);
        if (!s)
            throw new Error('网易云歌曲不可访问');
        const album = s.album || s.al || {}, artist = (s.artists || s.ar || []).map((a) => text(a.name)).filter(Boolean).join(' / ');
        const mv = Number(s.mvid ?? s.mv ?? 0);
        (0, netease_mv_1.rememberNeteaseMv)(sourceId, mv);
        Object.assign(result, { title: text(s.name), artist, album: text(album.name), cover: picture(album.picUrl), durationSeconds: Number(s.duration ?? s.dt ?? 0) / 1000, publishedAt: album.publishTime ? Number(album.publishTime) / 1000 : null, description: text((s.alias || s.alia || []).join(' / '), 3000), videoAvailable: mv > 0, mvId: mv > 0 ? String(mv) : null, originalUrl: `https://music.163.com/#/song?id=${sourceId}` });
        if (body.mediaKind === 'video') {
            if (!mv)
                throw Object.assign(new Error('此歌曲暂无关联 MV'), { category: 'unsupported_stream' });
            const rawMv = await (0, netease_mv_1.neteaseJson)(`https://music.163.com/api/mv/detail?id=${mv}&type=mp4`), v = rawMv.data;
            if (!v || String(v.id) !== String(mv))
                throw new Error('关联 MV 暂不可访问');
            Object.assign(result, { songTitle: result.title, title: text(v.name), artist: text(v.artistName) || artist, cover: picture(v.cover), durationSeconds: Number(v.duration || 0) / 1000, description: text(v.desc || v.briefDesc, 5000), contentType: '关联 MV', originalUrl: `https://music.163.com/#/mv?id=${mv}`, statistics: { views: numeric(v.playCount), likes: numeric(v.likeCount), comments: numeric(v.commentCount) } });
        }
    }
    else {
        const t = identity.track;
        Object.assign(result, { title: t.title, artist: t.artist, album: t.album, cover: picture(t.pic), durationSeconds: numeric(t.durationSec), description: '此文件没有可靠的平台关联，不按同名歌曲推断来源。', videoAvailable: false });
    }
    if (source !== 'local') {
        if (cache.size >= 200)
            cache.delete(cache.keys().next().value);
        cache.set(key, { at: Date.now(), value: result });
    }
    return result;
}
//# sourceMappingURL=media-detail.js.map