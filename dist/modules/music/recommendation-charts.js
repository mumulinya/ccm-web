"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanRecommendationCandidate = cleanRecommendationCandidate;
exports.parseChartRows = parseChartRows;
exports.readRecommendationChart = readRecommendationChart;
const proxy_1 = require("./folia/proxy");
const context_1 = require("./folia/context");
const recommendation_store_1 = require("./recommendation-store");
const song_metadata_1 = require("./folia/song-metadata");
const platform_http_1 = require("./platform-http");
const cache = new Map(), pending = new Map();
const text = (value) => String(value || '').trim().slice(0, 300);
function cleanRecommendationCandidate(row) {
    if (!row || !['local', 'netease', 'qq', 'kugou', 'navidrome'].includes(row.source) || !row.sourceId || !row.title)
        return null;
    const item = { source: row.source, sourceId: text(row.sourceId), instanceId: text(row.instanceId) || 'default', title: text(row.title), artist: text(row.artist), ...(row.source === 'local' ? { filename: text(row.filename || row.sourceId) } : {}) };
    if (item.source === 'local' && (/[\\/]/.test(item.filename) || item.filename === '..'))
        return null;
    if (row.song)
        item.song = (0, song_metadata_1.cleanFoliaSong)(row.song, { provider: item.source, ...item });
    if (row.popularity)
        item.popularity = { provider: row.source, chartId: text(row.popularity.chartId), chartName: text(row.popularity.chartName), rank: row.popularity.rank, fetchedAt: row.popularity.fetchedAt, ...(row.popularity.updatedAt ? { updatedAt: row.popularity.updatedAt } : {}) };
    return item;
}
function parseChartRows(provider, chart, data, fetchedAt = new Date().toISOString()) {
    const root = data?.response || data;
    const rows = provider === 'netease' ? root.playlist?.tracks : provider === 'qq' ? root.req_1?.data?.songInfoList : root.data?.songlist || root.data?.songs || root.data?.song || root.data?.info;
    if (!Array.isArray(rows))
        throw Error('平台榜单歌曲格式不可用');
    return rows.slice(0, 60).map((row, index) => {
        const song = provider === 'qq' ? (row.songInfo || row) : row;
        const sourceId = provider === 'netease' ? song.id : provider === 'qq' ? song.mid : song.hash || song.FileHash || song.audio_info?.hash_128 || song.audio_info?.hash || song.deprecated?.hash;
        const title = song.name || song.songname || song.song_name || song.SongName || song.audio_name;
        const artists = song.ar || song.artists || song.singer || song.authors || [];
        const artist = Array.isArray(artists) ? artists.map((a) => a.name || a.author_name).filter(Boolean).join(' / ') : text(artists);
        return cleanRecommendationCandidate({ source: provider, sourceId, title, artist: artist || song.author_name || song.singername || song.SingerName,
            song: { id: sourceId, name: title, artists: Array.isArray(artists) ? artists : [], album: song.al || song.album || { id: song.album_id || song.albumId }, durationMs: song.dt || Number(song.interval || song.duration || 0) * 1000, sourceRef: { providerData: provider === 'kugou' ? { hash: sourceId, albumId: song.album_id || song.albumId || song.AlbumID } : undefined } },
            popularity: { chartId: chart.id, chartName: chart.name, rank: Number(song.business?.sort) || index + 1, fetchedAt, ...(chart.updatedAt ? { updatedAt: chart.updatedAt } : {}) } });
    }).filter(Boolean);
}
async function loadChart(provider) {
    const owner = (0, context_1.currentFoliaOwner)(), call = (endpoint, params = {}) => (0, proxy_1.requestFoliaProvider)(owner, provider, endpoint, params, { timeoutMs: 6000 });
    let charts, chart, data;
    if (provider === 'netease') {
        const result = await call('/toplist');
        charts = result.list;
        if (!Array.isArray(charts))
            throw Error('网易云榜单目录不可用');
        chart = charts.find(row => String(row.name).includes('热歌')) || charts.find(row => String(row.name).includes('飙升'));
        if (!chart?.id)
            throw Error('网易云未返回可识别的热歌榜');
        data = await call('/playlist/detail', { id: chart.id });
        return parseChartRows(provider, { id: chart.id, name: chart.name, updatedAt: chart.updateTime ? new Date(chart.updateTime).toISOString() : undefined }, data);
    }
    if (provider === 'qq') {
        const result = await call('/getTopLists');
        charts = (result.response || result)?.data?.topList;
        if (!Array.isArray(charts))
            throw Error('QQ 榜单目录不可用');
        chart = charts.find(row => String(row.topTitle || row.title).includes('热歌')) || charts.find(row => String(row.topTitle || row.title).includes('流行'));
        if (!chart?.id && !chart?.topId)
            throw Error('QQ 未返回可识别的热门榜');
        data = await call('/getRanks', { topId: chart.id || chart.topId, limit: 60, page: 0 });
        const detail = (data.response || data)?.req_1;
        // 固定 SDK 会把日榜日期转为周次。仅用平台实际返回的 period 重试同一只读接口。
        const period = detail?.data?.data?.period;
        if (detail?.code === 2000 && typeof period === 'string' && /^\d{4}(?:-\d{2}-\d{2}|_\d{1,2})$/.test(period)) {
            data = await (0, platform_http_1.musicPlatformJson)({ url: 'https://u.y.qq.com/cgi-bin/musicu.fcg', allowedHosts: ['u.y.qq.com'], method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comm: { ct: 24, cv: 4747474, format: 'json', uin: 0 }, req_1: { module: 'musicToplist.ToplistInfoServer', method: 'GetDetail', param: { topId: Number(chart.id || chart.topId), offset: 0, num: 60, period } } }) });
        }
        const actual = (data.response || data)?.req_1;
        if (actual?.code !== 0)
            throw Error('QQ 热榜明细读取失败');
        const update = actual.data?.data?.updateTime;
        return parseChartRows(provider, { id: chart.id || chart.topId, name: chart.topTitle || chart.title, ...(typeof update === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(update) ? { updatedAt: update } : {}) }, data);
    }
    if (provider === 'kugou') {
        const result = await call('/rank/list');
        charts = result.data?.info || result.data?.list;
        if (!Array.isArray(charts))
            throw Error('酷狗榜单目录不可用');
        chart = charts.find(row => String(row.rankname || row.name).includes('热歌')) || charts.find(row => String(row.rankname || row.name).includes('飙升'));
        if (!chart?.rankid && !chart?.id)
            throw Error('酷狗未返回可识别的热门榜');
        data = await call('/rank/audio', { rankid: chart.rankid || chart.id, rank_cid: chart.rank_cid || 0, pagesize: 60, page: 1 });
        return parseChartRows(provider, { id: chart.rankid || chart.id, name: chart.rankname || chart.name }, data);
    }
    return [];
}
async function readRecommendationChart(provider) {
    if (!['netease', 'qq', 'kugou'].includes(provider))
        return [];
    const fence = (0, recommendation_store_1.recommendationAccountFence)(provider), key = JSON.stringify([(0, context_1.currentFoliaOwner)(), provider, fence]), hit = cache.get(key);
    if (hit && Date.now() - hit.at < 15 * 60000)
        return structuredClone(hit.items);
    let job = pending.get(key);
    if (!job) {
        job = loadChart(provider).then(items => { if (!items.length)
            throw Error('平台热榜暂无可用歌曲'); if ((0, recommendation_store_1.recommendationAccountFence)(provider) !== fence)
            throw Error('榜单读取期间音源账号已变化'); cache.set(key, { at: Date.now(), items }); while (cache.size > 100)
            cache.delete(cache.keys().next().value); return items; }).finally(() => pending.delete(key));
        pending.set(key, job);
    }
    return structuredClone(await job);
}
//# sourceMappingURL=recommendation-charts.js.map