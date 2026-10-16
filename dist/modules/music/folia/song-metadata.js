"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanFoliaSong = cleanFoliaSong;
// 只保存恢复播放所需的公开身份元数据，排除 URL、平台 token 和任意运行对象。
function cleanFoliaSong(song, track) {
    const text = (value) => String(value || '').slice(0, 300);
    const providerData = Object.fromEntries(['songMid', 'songId', 'albumMid', 'mediaMid', 'hash', 'mixSongId', 'albumAudioId', 'catalogLookupId', 'albumId', 'fileId'].flatMap(key => {
        const value = song.sourceRef?.providerData?.[key];
        return typeof value === 'string' || typeof value === 'number' ? [[key, text(value)]] : [];
    }));
    return {
        id: text(song.id || track.sourceId), name: text(song.name || track.title),
        artists: (Array.isArray(song.artists) ? song.artists : []).slice(0, 30).map((artist) => ({ id: text(artist.id), name: text(artist.name) })),
        album: { id: text(song.album?.id), name: text(song.album?.name) }, durationMs: Math.max(0, Number(song.durationMs) || 0),
        sourceRef: track.provider === 'navidrome' ? { kind: 'navidrome', mediaId: track.sourceId } : { kind: 'online', providerId: track.provider === 'local' ? 'ccm' : track.provider, mediaId: track.sourceId, providerData },
    };
}
//# sourceMappingURL=song-metadata.js.map