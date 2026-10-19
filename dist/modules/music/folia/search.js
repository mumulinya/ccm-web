"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchFoliaPlaybackCandidates = searchFoliaPlaybackCandidates;
const workspace_catalog_1 = require("./workspace-catalog");
const bilibili_1 = require("../bilibili");
const douyin_1 = require("../douyin");
const search_results_1 = require("../search-results");
const platform_http_1 = require("../platform-http");
const proxy_1 = require("./proxy");
const context_1 = require("./context");
const accounts_1 = require("./accounts");
// 模型给出媒体类型与来源后，按来源适配公开候选，不运行本地意图规则。
const all = ['local', 'netease', 'qq', 'kugou', 'navidrome', 'bilibili', 'douyin'];
async function searchFoliaPlaybackCandidates(intent, options = {}) {
    const query = intent.strategy === 'random' ? '热门 华语 音乐 推荐' : intent.searchQuery;
    const owner = (0, context_1.currentFoliaOwner)();
    const requested = intent.sourceMode === 'auto' ? intent.mediaMode === 'video' ? ['bilibili', 'douyin'] : ['local', 'netease', 'qq', 'kugou', 'navidrome'] : [intent.sourceMode];
    const statuses = Object.fromEntries(all.map(source => [source, { status: 'not_requested', resultCount: 0 }]));
    const candidates = [];
    async function search(source) {
        if (source === 'local')
            return (0, workspace_catalog_1.queryWorkspaceCatalog)(intent.mediaMode === 'video' ? 'video' : 'music', intent.strategy === 'random' ? '' : query, 20).map((track) => intent.mediaMode === 'video' ? { source: track.media.source, sourceId: track.media.sourceId, title: track.title, artist: track.artist } : { source, sourceId: track.filename, filename: track.filename, title: track.title, artist: track.artist });
        if (source === 'bilibili' || source === 'douyin')
            return (0, search_results_1.signSearchResults)(source, query, await (source === 'bilibili' ? (0, bilibili_1.biliSearch)(query) : (0, douyin_1.douyinSearch)(query)), 12).map((row) => ({ source, sourceId: String(row.bvid || row.awemeId), title: row.title, artist: row.author || row.artist || '', duration: row.duration, downloadToken: row.downloadToken }));
        if (source === 'netease') {
            const data = await (0, proxy_1.requestFoliaProvider)(owner, source, '/search', { keywords: query, limit: 20, type: 1 }, options);
            if (data.code !== 200)
                throw new Error(data.msg || '网易云搜索失败');
            return (data.result?.songs || []).map((song) => ({ source, sourceId: String(song.id), title: song.name, artist: (song.artists || song.ar || []).map((a) => a.name).join(' / '), song: { id: song.id, name: song.name, artists: song.artists || song.ar, album: song.album || song.al, durationMs: song.duration || song.dt } }));
        }
        if (source === 'qq') {
            const data = await (0, proxy_1.requestFoliaProvider)(owner, source, '/search', { keyword: query.slice(0, 60), type: 'song', page: 1, limit: 20 }, options);
            if (data.code !== 200 || !Array.isArray(data.items))
                throw new Error('QQ 搜索暂时不可用');
            return data.items.map((song) => ({ source, sourceId: String(song.mid), title: song.name, artist: (song.singer || []).map((a) => a.name).join(' / '), song: { id: song.mid, name: song.name, artists: song.singer, album: song.album, durationMs: Number(song.interval || 0) * 1000 } }));
        }
        if (source === 'kugou') {
            const data = await (0, proxy_1.requestFoliaProvider)(owner, source, '/search', { keywords: query, keyword: query, type: 'song', page: 1, pagesize: 20 }, options);
            if (data.error_code || data.status === 0)
                throw new Error(data.error || '酷狗搜索失败');
            return (data.data?.lists || data.data?.info || data.data?.list || []).map((song) => ({ source, sourceId: String(song.FileHash || song.hash), title: song.SongName || song.songname || song.FileName, artist: song.SingerName || song.singername || '', song: { id: song.FileHash || song.hash, name: song.SongName || song.songname || song.FileName, artists: [{ id: 0, name: song.SingerName || song.singername || '' }], album: { id: song.AlbumID || 0, name: song.AlbumName || '' }, sourceRef: { kind: 'online', providerId: 'kugou', mediaId: song.FileHash || song.hash, providerData: { albumId: song.AlbumID || 0, hash: song.FileHash || song.hash } } } }));
        }
        const config = (0, accounts_1.account)(owner, 'navidrome');
        const data = await (0, proxy_1.readFoliaNavidrome)(owner, 'search3', new URLSearchParams({ query, songCount: '20', artistCount: '0', albumCount: '0', v: '1.16.1', c: 'CCM', f: 'json' }));
        const response = data['subsonic-response'];
        if (response?.status !== 'ok')
            throw new Error(response?.error?.message || 'Navidrome 搜索失败');
        return (response.searchResult3?.song || []).map((song) => ({ source, instanceId: config.instanceId, sourceId: String(song.id), title: song.title, artist: song.artist || '' }));
    }
    const results = await Promise.allSettled(requested.map(search));
    results.forEach((result, index) => { const source = requested[index]; if (result.status === 'fulfilled') {
        const rows = result.value.filter(row => row.sourceId && row.sourceId !== 'undefined');
        candidates.push(...rows);
        statuses[source] = { status: 'success', resultCount: rows.length };
    }
    else
        statuses[source] = { ...(0, platform_http_1.publicMusicPlatformError)(result.reason), resultCount: 0 }; });
    return { candidates: [...new Map(candidates.map(row => [JSON.stringify([row.source, row.instanceId || 'default', row.sourceId]), row])).values()], sourceStatuses: statuses };
}
//# sourceMappingURL=search.js.map