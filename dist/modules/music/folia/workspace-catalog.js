"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVideoCatalogTrack = isVideoCatalogTrack;
exports.localTrackWorkspace = localTrackWorkspace;
exports.requireMusicFilename = requireMusicFilename;
exports.queryWorkspaceCatalog = queryWorkspaceCatalog;
exports.musicLibraryProjection = musicLibraryProjection;
const music_catalog_1 = require("../music-catalog");
const media_provenance_1 = require("../media-provenance");
// 工作区以持久来源身份隔离目录；不根据歌名判断歌曲属于音乐还是视频。
function isVideoCatalogTrack(track) {
    return [track?.media?.source, track?.source].some(source => ['bilibili', 'douyin'].includes(source));
}
function localTrackWorkspace(filename) {
    const track = (0, music_catalog_1.findMusicCatalogTrackByFilename)(filename);
    const media = track?.media || (0, media_provenance_1.resolveTrackMedia)({ filename, file_checksum: '' });
    return isVideoCatalogTrack({ ...track, media }) ? 'video' : 'music';
}
function requireMusicFilename(filename) {
    if (localTrackWorkspace(filename) === 'video')
        throw Object.assign(new Error('这是视频来源的缓存音频，请在「看视频 → 本地视频」打开'), { statusCode: 409 });
}
function queryWorkspaceCatalog(workspace, query = '', limit = 2000) {
    const tracks = [];
    let cursor = 0;
    do {
        const page = (0, music_catalog_1.queryMusicCatalog)({ query, cursor, limit: 500 });
        tracks.push(...page.tracks.filter(track => isVideoCatalogTrack(track) === (workspace === 'video')));
        if (page.nextCursor == null || tracks.length >= limit)
            break;
        cursor = page.nextCursor;
    } while (true);
    return tracks.slice(0, limit);
}
// 保存原有权威记录，只隔离对音乐播放器的投影，避免升级后删除旧收藏与历史。
function musicLibraryProjection(state) {
    const music = (track) => track && (track.provider !== 'local' || localTrackWorkspace(track.filename || track.sourceId) === 'music');
    return { ...state, favorites: state.favorites.filter(music), queue: state.queue.filter(music), playlists: state.playlists.map((p) => ({ ...p, tracks: p.tracks.filter(music) })), history: state.history.filter((event) => music(event.track)), current: music(state.current) ? state.current : null };
}
//# sourceMappingURL=workspace-catalog.js.map