"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDeviceMetadata = cleanDeviceMetadata;
const cover_policy_1 = require("./cover-policy");
// 设备文件的显式在线资料选择；不改音频、不写标签、不接收路径或临时播放凭证。
const text = (value, max = 300) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, max) : '';
function cleanDeviceMetadata(input) {
    if (!input || typeof input.useOnlineMetadata !== 'boolean' || typeof input.useOnlineCover !== 'boolean')
        throw Error('本机资料选择无效');
    const value = { useOnlineMetadata: input.useOnlineMetadata, useOnlineCover: input.useOnlineCover };
    if (input.candidate) {
        const candidate = input.candidate;
        if (!['netease', 'qq', 'kugou'].includes(candidate.source) || !['string', 'number'].includes(typeof candidate.songId))
            throw Error('资料来源无效');
        let cover = '';
        if (candidate.coverUrl) {
            let url = new URL(candidate.coverUrl, 'https://ccm.invalid');
            if (url.origin === 'https://ccm.invalid' && url.pathname === '/api/music/folia/cover')
                url = new URL(url.searchParams.get('url') || '');
            if (url.protocol === 'http:' && url.hostname.endsWith('.music.126.net'))
                url.protocol = 'https:';
            cover = (0, cover_policy_1.foliaCoverTarget)(url.href).href;
        }
        value.candidate = { source: candidate.source, songId: String(candidate.songId).slice(0, 160), title: text(candidate.title), artists: (Array.isArray(candidate.artists) ? candidate.artists : []).slice(0, 30).map((artist) => ({ id: text(String(artist.id || '')), name: text(artist.name) })), album: { id: text(String(candidate.album?.id || '')), name: text(candidate.album?.name) }, coverUrl: cover, matchedAt: Date.now(), matchMode: 'manual' };
    }
    else if (value.useOnlineMetadata || value.useOnlineCover)
        throw Error('请先选择在线资料');
    return value;
}
//# sourceMappingURL=device-metadata.js.map