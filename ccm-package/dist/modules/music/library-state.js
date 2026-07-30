"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicLibraryState = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const library_1 = require("./library");
const music_persistence_1 = require("./music-persistence");
const FILE = path.join(utils_1.CCM_DIR, "music-library-state.json");
const MAX_ITEMS = 1000;
const MAX_HISTORY_EVENTS = 2000;
function now() { return new Date().toISOString(); }
function cleanName(value, max = 80) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max); }
function validTrack(filename) {
    const name = String(filename || "");
    return !!name && name === path.basename(name) && fs.existsSync(path.join(library_1.MUSIC_DIR, name));
}
function uniqueTracks(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(validTrack))).slice(0, MAX_ITEMS);
}
function normalizePlayMode(value) {
    return value === "random" || value === "single" ? value : "list";
}
function normalizeQueueSources(value, queue) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const result = {};
    for (const filename of queue) {
        const item = input[filename];
        result[filename] = {
            label: cleanName(typeof item === "string" ? item : item?.label, 40) || "本地曲库",
            addedAt: String(item?.addedAt || now()),
        };
    }
    return result;
}
function normalizeHistory(value) {
    return (Array.isArray(value) ? value : [])
        .map((item) => ({
        id: cleanName(item?.id, 100) || `history_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        filename: String(item?.filename || ""),
        playedAt: String(item?.playedAt || now()),
        source: cleanName(item?.source, 40) || "播放器",
    }))
        .filter((item) => validTrack(item.filename))
        .slice(-MAX_HISTORY_EVENTS);
}
function emptyState() {
    return {
        version: 3,
        favorites: [],
        playlists: [],
        queue: [],
        queueSources: {},
        currentFilename: "",
        playMode: "list",
        history: [],
        updatedAt: now(),
    };
}
class LibraryStateStore {
    get() {
        const state = (0, music_persistence_1.readPersistedLibraryState)();
        state.favorites = uniqueTracks(state.favorites);
        state.queue = uniqueTracks(state.queue);
        state.queueSources = normalizeQueueSources(state.queueSources, state.queue);
        state.playlists = (state.playlists || []).slice(0, 100).map((list) => ({ ...list, tracks: uniqueTracks(list.tracks) }));
        state.currentFilename = validTrack(state.currentFilename) ? state.currentFilename : "";
        state.playMode = normalizePlayMode(state.playMode);
        state.history = normalizeHistory(state.history);
        return JSON.parse(JSON.stringify(state));
    }
    toggleFavorite(filename, favorite, expectedRevision) {
        if (!validTrack(filename))
            throw new Error("歌曲不存在");
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            const set = new Set(state.favorites || []);
            const shouldFavorite = favorite === undefined ? !set.has(filename) : !!favorite;
            if (shouldFavorite)
                set.add(filename);
            else
                set.delete(filename);
            state.favorites = Array.from(set).slice(0, MAX_ITEMS);
            return state;
        }, expectedRevision);
    }
    createPlaylist(name, expectedRevision) {
        const clean = cleanName(name);
        if (!clean)
            throw new Error("歌单名称不能为空");
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
            if (state.playlists.some((item) => item.name.toLowerCase() === clean.toLowerCase()))
                throw new Error("已有同名歌单");
            const timestamp = now();
            state.playlists.push({ id: `playlist_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, name: clean, tracks: [], createdAt: timestamp, updatedAt: timestamp });
            return state;
        }, expectedRevision);
    }
    updatePlaylist(id, input) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
            const item = state.playlists.find((list) => list.id === id);
            if (!item)
                throw new Error("歌单不存在");
            if (input.name !== undefined) {
                const clean = cleanName(input.name);
                if (!clean)
                    throw new Error("歌单名称不能为空");
                if (state.playlists.some((list) => list.id !== id && list.name.toLowerCase() === clean.toLowerCase()))
                    throw new Error("已有同名歌单");
                item.name = clean;
            }
            if (input.tracks !== undefined)
                item.tracks = uniqueTracks(input.tracks);
            item.updatedAt = now();
            return state;
        }, input.expectedRevision);
    }
    deletePlaylist(id, expectedRevision) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
            const before = state.playlists.length;
            state.playlists = state.playlists.filter((item) => item.id !== id);
            if (before === state.playlists.length)
                throw new Error("歌单不存在");
            return state;
        }, expectedRevision);
    }
    setQueue(tracks, input = {}) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.queue = uniqueTracks(tracks);
            state.queueSources = normalizeQueueSources({
                ...(state.queueSources || {}),
                ...(input.queueSources || {}),
            }, state.queue);
            if (input.currentFilename !== undefined) {
                state.currentFilename = validTrack(input.currentFilename) ? String(input.currentFilename) : "";
            }
            if (input.playMode !== undefined)
                state.playMode = normalizePlayMode(input.playMode);
            return state;
        }, input.expectedRevision);
    }
    recordHistory(filename, source, expectedRevision) {
        if (!validTrack(filename))
            throw new Error("歌曲不存在");
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.history = Array.isArray(state.history) ? state.history : [];
            state.history.push({
                id: `history_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
                filename,
                playedAt: now(),
                source: cleanName(source, 40) || "播放器",
            });
            state.history = state.history.slice(-MAX_HISTORY_EVENTS);
            return state;
        }, expectedRevision);
    }
    clearHistory(expectedRevision) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.history = [];
            return state;
        }, expectedRevision);
    }
    removeTrack(filename, expectedRevision) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.favorites = (state.favorites || []).filter((item) => item !== filename);
            state.queue = (state.queue || []).filter((item) => item !== filename);
            state.queueSources = state.queueSources || {};
            delete state.queueSources[filename];
            state.history = (state.history || []).filter((item) => item.filename !== filename);
            if (state.currentFilename === filename)
                state.currentFilename = "";
            for (const list of state.playlists || [])
                list.tracks = (list.tracks || []).filter((item) => item !== filename);
            return state;
        }, expectedRevision);
    }
    replaceTrackReferences(keepFilename, removeFilenames, expectedRevision) {
        const removed = new Set(removeFilenames.filter(Boolean));
        const replace = (items) => Array.from(new Set((items || []).map(item => (removed.has(item) ? keepFilename : item)).filter(Boolean)));
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => {
            state.favorites = replace(state.favorites || []);
            state.queue = replace(state.queue || []);
            state.queueSources = state.queueSources || {};
            for (const filename of removed) {
                if (state.queueSources[filename] && !state.queueSources[keepFilename]) {
                    state.queueSources[keepFilename] = state.queueSources[filename];
                }
                delete state.queueSources[filename];
            }
            state.history = (state.history || []).map((item) => (removed.has(item.filename) ? { ...item, filename: keepFilename } : item));
            if (removed.has(state.currentFilename))
                state.currentFilename = keepFilename;
            for (const list of state.playlists || [])
                list.tracks = replace(list.tracks || []);
            return state;
        }, expectedRevision);
    }
    restoreSnapshot(snapshot, expectedRevision) {
        return (0, music_persistence_1.mutatePersistedLibraryState)(state => ({
            ...state,
            favorites: Array.isArray(snapshot?.favorites) ? snapshot.favorites : state.favorites,
            playlists: Array.isArray(snapshot?.playlists) ? snapshot.playlists : state.playlists,
            queue: Array.isArray(snapshot?.queue) ? snapshot.queue : state.queue,
            queueSources: snapshot?.queueSources && typeof snapshot.queueSources === "object" ? snapshot.queueSources : state.queueSources,
            currentFilename: typeof snapshot?.currentFilename === "string" ? snapshot.currentFilename : state.currentFilename,
            playMode: typeof snapshot?.playMode === "string" ? snapshot.playMode : state.playMode,
            history: Array.isArray(snapshot?.history) ? snapshot.history : state.history,
        }), expectedRevision);
    }
}
exports.musicLibraryState = new LibraryStateStore();
//# sourceMappingURL=library-state.js.map