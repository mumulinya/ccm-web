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
const FILE = path.join(utils_1.CCM_DIR, "music-library-state.json");
const MAX_ITEMS = 1000;
function now() { return new Date().toISOString(); }
function cleanName(value, max = 80) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max); }
function validTrack(filename) {
    const name = String(filename || "");
    return !!name && name === path.basename(name) && fs.existsSync(path.join(library_1.MUSIC_DIR, name));
}
function uniqueTracks(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(validTrack))).slice(0, MAX_ITEMS);
}
function emptyState() { return { version: 1, favorites: [], playlists: [], queue: [], updatedAt: now() }; }
class LibraryStateStore {
    state = emptyState();
    constructor() { this.load(); }
    get() {
        this.state.favorites = uniqueTracks(this.state.favorites);
        this.state.queue = uniqueTracks(this.state.queue);
        this.state.playlists = this.state.playlists.slice(0, 100).map(list => ({ ...list, tracks: uniqueTracks(list.tracks) }));
        return JSON.parse(JSON.stringify(this.state));
    }
    toggleFavorite(filename, favorite) {
        if (!validTrack(filename))
            throw new Error("歌曲不存在");
        const set = new Set(this.state.favorites);
        const shouldFavorite = favorite === undefined ? !set.has(filename) : !!favorite;
        if (shouldFavorite)
            set.add(filename);
        else
            set.delete(filename);
        this.state.favorites = Array.from(set).slice(0, MAX_ITEMS);
        this.save();
        return this.get();
    }
    createPlaylist(name) {
        const clean = cleanName(name);
        if (!clean)
            throw new Error("歌单名称不能为空");
        if (this.state.playlists.some(item => item.name.toLowerCase() === clean.toLowerCase()))
            throw new Error("已有同名歌单");
        const timestamp = now();
        this.state.playlists.push({ id: `playlist_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, name: clean, tracks: [], createdAt: timestamp, updatedAt: timestamp });
        this.save();
        return this.get();
    }
    updatePlaylist(id, input) {
        const item = this.state.playlists.find(list => list.id === id);
        if (!item)
            throw new Error("歌单不存在");
        if (input.name !== undefined) {
            const clean = cleanName(input.name);
            if (!clean)
                throw new Error("歌单名称不能为空");
            if (this.state.playlists.some(list => list.id !== id && list.name.toLowerCase() === clean.toLowerCase()))
                throw new Error("已有同名歌单");
            item.name = clean;
        }
        if (input.tracks !== undefined)
            item.tracks = uniqueTracks(input.tracks);
        item.updatedAt = now();
        this.save();
        return this.get();
    }
    deletePlaylist(id) {
        const before = this.state.playlists.length;
        this.state.playlists = this.state.playlists.filter(item => item.id !== id);
        if (before === this.state.playlists.length)
            throw new Error("歌单不存在");
        this.save();
        return this.get();
    }
    setQueue(tracks) {
        this.state.queue = uniqueTracks(tracks);
        this.save();
        return this.get();
    }
    removeTrack(filename) {
        this.state.favorites = this.state.favorites.filter(item => item !== filename);
        this.state.queue = this.state.queue.filter(item => item !== filename);
        for (const list of this.state.playlists)
            list.tracks = list.tracks.filter(item => item !== filename);
        this.save();
    }
    load() {
        try {
            if (!fs.existsSync(FILE))
                return;
            const value = JSON.parse(fs.readFileSync(FILE, "utf-8"));
            this.state = { ...emptyState(), ...value, version: 1 };
        }
        catch (error) {
            console.warn("[MusicLibraryState] failed to load:", error?.message);
        }
    }
    save() {
        this.state.updatedAt = now();
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(this.state, null, 2), "utf-8");
        fs.renameSync(temp, FILE);
    }
}
exports.musicLibraryState = new LibraryStateStore();
//# sourceMappingURL=library-state.js.map