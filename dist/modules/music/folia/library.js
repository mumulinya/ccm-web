"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOLIA_PROVIDERS = void 0;
exports.trackKey = trackKey;
exports.cleanTrack = cleanTrack;
exports.readFoliaLibrary = readFoliaLibrary;
exports.updateFoliaLibrary = updateFoliaLibrary;
const observability_database_1 = require("../../../system/observability-database");
const music_persistence_1 = require("../music-persistence");
const video_state_1 = require("./video-state");
const song_metadata_1 = require("./song-metadata");
const native_local_state_1 = require("./native-local-state");
const workspace_catalog_1 = require("./workspace-catalog");
const video_library_1 = require("./video-library");
const device_catalog_1 = require("./device-catalog");
// Folia 音乐库：来源身份、服务端 CAS 与一次性旧库迁移。
exports.FOLIA_PROVIDERS = ['local', 'netease', 'qq', 'kugou', 'navidrome', 'bodian', 'device-local'];
function trackKey(track) { return JSON.stringify([track.provider, track.instanceId, track.sourceId]); }
function cleanTrack(input, legacyImport = false) {
    if (!input || !exports.FOLIA_PROVIDERS.includes(input.provider) || !String(input.sourceId || '') || String(input.sourceId).length > 512)
        throw new Error('无效歌曲身份');
    const track = { provider: input.provider, instanceId: String(input.instanceId || 'default').slice(0, 160), sourceId: String(input.sourceId), title: String(input.title || '').slice(0, 300), artist: String(input.artist || '').slice(0, 300) };
    if (input.provider === 'local') {
        if (!input.filename || /[\\/]/.test(input.filename) || input.filename === '..' || input.sourceId !== input.filename)
            throw new Error('无效本地文件名或身份');
        if (!legacyImport)
            (0, workspace_catalog_1.requireMusicFilename)(input.filename);
        track.filename = input.filename;
    }
    if (input.provider === 'device-local' && (!/^[a-f0-9-]{36}$/.test(track.sourceId) || !/^[a-f0-9-]{36}$/.test(track.instanceId)))
        throw new Error('无效设备歌曲引用');
    // 仅保留展示与来源身份，不把临时 URL、cookie 或运行时对象写入权威库。
    if (input.song)
        track.song = (0, song_metadata_1.cleanFoliaSong)(input.song, track);
    return track;
}
function tracks(input) {
    if (!Array.isArray(input) || input.length > 2000)
        throw new Error('歌曲列表超出限制');
    const result = input.map(track => cleanTrack(track));
    return [...new Map(result.map(track => [trackKey(track), track])).values()];
}
function database() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    db.exec('CREATE TABLE IF NOT EXISTS music_folia_library_v1 (owner TEXT PRIMARY KEY, revision INTEGER NOT NULL, state_json TEXT NOT NULL)');
    return db;
}
function readFoliaLibrary(owner = 'workspace') {
    const db = database();
    return (0, observability_database_1.withImmediateObservabilityTransaction)(() => {
        const existing = db.prepare('SELECT state_json FROM music_folia_library_v1 WHERE owner=?').get(owner);
        if (existing) {
            const state = JSON.parse(existing.state_json);
            state.video = (0, video_library_1.normalizeVideoLibrary)(state.video);
            return state;
        }
        const old = (0, music_persistence_1.readPersistedLibraryState)() || {};
        const local = (filename) => cleanTrack({ provider: 'local', sourceId: filename, filename }, true);
        const state = { schema: 'ccm-folia-library-v1', revision: 1, migrationVersion: 1, video: (0, video_library_1.normalizeVideoLibrary)(), favorites: (old.favorites || []).map(local), playlists: (old.playlists || []).map((p) => ({ id: p.id, name: p.name, tracks: (p.tracks || []).map(local) })), queue: (old.queue || []).map(local), history: (old.history || []).map((event) => ({ ...event, track: local(event.filename) })), current: old.currentFilename ? local(old.currentFilename) : null, progress: {}, playMode: old.playMode || 'list' };
        db.prepare('INSERT INTO music_folia_library_v1 VALUES (?, ?, ?)').run(owner, 1, JSON.stringify(state));
        return state;
    });
}
function updateFoliaLibrary(owner, input) {
    readFoliaLibrary(owner);
    const db = database();
    return (0, observability_database_1.withImmediateObservabilityTransaction)(() => {
        const row = db.prepare('SELECT state_json, revision FROM music_folia_library_v1 WHERE owner=?').get(owner);
        const state = JSON.parse(row.state_json);
        if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== row.revision)
            throw Object.assign(new Error('音乐库已由其他窗口更新，请刷新后重试'), { statusCode: 409, state });
        const change = input.state || {};
        if (input.deviceMutation !== undefined)
            state.deviceCatalog = (0, device_catalog_1.applyDeviceCatalogMutation)(state.deviceCatalog, input.deviceMutation);
        if (input.localSong) {
            const local = (0, native_local_state_1.cleanFoliaLocalState)(input.localSong);
            state.nativeLocal = { ...state.nativeLocal, [local.filename]: local.data };
        }
        if (change.video !== undefined)
            state.video = { ...(0, video_library_1.normalizeVideoLibrary)(state.video), ...(0, video_state_1.cleanVideoState)(change.video) };
        if (input.videoMutation !== undefined) {
            try {
                state.video = (0, video_library_1.applyVideoMutation)(state.video, input.videoMutation);
            }
            catch (error) {
                if (error.statusCode === 409)
                    error.state = state;
                throw error;
            }
        }
        for (const key of ['favorites', 'queue'])
            if (change[key] !== undefined)
                state[key] = tracks(change[key]);
        if (change.playlists !== undefined) {
            if (!Array.isArray(change.playlists) || change.playlists.length > 100)
                throw new Error('歌单数量超出限制');
            state.playlists = change.playlists.map((p) => { if (!p.id || !String(p.name || '').trim())
                throw new Error('歌单缺少身份或名称'); return { id: String(p.id).slice(0, 160), name: String(p.name).slice(0, 100), tracks: tracks(p.tracks) }; });
        }
        if (change.current !== undefined)
            state.current = change.current ? cleanTrack(change.current) : null;
        if (change.playMode !== undefined) {
            if (!['list', 'random', 'single'].includes(change.playMode))
                throw new Error('无效播放模式');
            state.playMode = change.playMode;
        }
        if (input.played)
            state.history = [...state.history, { id: String(input.eventId || ''), playedAt: new Date().toISOString(), track: cleanTrack(input.played) }].filter((item, index, list) => !item.id || list.findIndex(other => other.id === item.id) === index).slice(-2000);
        if (input.progress) {
            const position = Number(input.progress.position);
            if (!Number.isFinite(position) || position < 0)
                throw new Error('无效播放进度');
            state.progress[trackKey(cleanTrack(input.progress.track))] = position;
            state.progress = Object.fromEntries(Object.entries(state.progress).slice(-2000));
        }
        state.revision++;
        state.updatedAt = new Date().toISOString();
        db.prepare('UPDATE music_folia_library_v1 SET revision=?, state_json=? WHERE owner=?').run(state.revision, JSON.stringify(state), owner);
        return state;
    });
}
//# sourceMappingURL=library.js.map