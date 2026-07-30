import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { MUSIC_DIR } from "./library";
import { mutatePersistedLibraryState, readPersistedLibraryState } from "./music-persistence";

export type MusicPlaylist = { id: string; name: string; tracks: string[]; createdAt: string; updatedAt: string };
export type MusicPlayMode = "list" | "random" | "single";
export type MusicQueueSource = { label: string; addedAt: string };
export type MusicPlaybackHistoryEvent = {
  id: string;
  filename: string;
  playedAt: string;
  source: string;
};
export type MusicLibraryState = {
  version: 3;
  favorites: string[];
  playlists: MusicPlaylist[];
  queue: string[];
  queueSources: Record<string, MusicQueueSource>;
  currentFilename: string;
  playMode: MusicPlayMode;
  history: MusicPlaybackHistoryEvent[];
  updatedAt: string;
};

const FILE = path.join(CCM_DIR, "music-library-state.json");
const MAX_ITEMS = 1000;
const MAX_HISTORY_EVENTS = 2000;

function now() { return new Date().toISOString(); }
function cleanName(value: any, max = 80) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max); }
function validTrack(filename: any) {
  const name = String(filename || "");
  return !!name && name === path.basename(name) && fs.existsSync(path.join(MUSIC_DIR, name));
}
function uniqueTracks(values: any) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(validTrack))).slice(0, MAX_ITEMS);
}

function normalizePlayMode(value: any): MusicPlayMode {
  return value === "random" || value === "single" ? value : "list";
}

function normalizeQueueSources(value: any, queue: string[]) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result: Record<string, MusicQueueSource> = {};
  for (const filename of queue) {
    const item = input[filename];
    result[filename] = {
      label: cleanName(typeof item === "string" ? item : item?.label, 40) || "本地曲库",
      addedAt: String(item?.addedAt || now()),
    };
  }
  return result;
}

function normalizeHistory(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((item: any) => ({
      id: cleanName(item?.id, 100) || `history_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
      filename: String(item?.filename || ""),
      playedAt: String(item?.playedAt || now()),
      source: cleanName(item?.source, 40) || "播放器",
    }))
    .filter((item: MusicPlaybackHistoryEvent) => validTrack(item.filename))
    .slice(-MAX_HISTORY_EVENTS);
}

function emptyState(): MusicLibraryState {
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
    const state: any = readPersistedLibraryState();
    state.favorites = uniqueTracks(state.favorites);
    state.queue = uniqueTracks(state.queue);
    state.queueSources = normalizeQueueSources(state.queueSources, state.queue);
    state.playlists = (state.playlists || []).slice(0, 100).map((list: any) => ({ ...list, tracks: uniqueTracks(list.tracks) }));
    state.currentFilename = validTrack(state.currentFilename) ? state.currentFilename : "";
    state.playMode = normalizePlayMode(state.playMode);
    state.history = normalizeHistory(state.history);
    return JSON.parse(JSON.stringify(state));
  }

  toggleFavorite(filename: string, favorite?: boolean, expectedRevision?: number) {
    if (!validTrack(filename)) throw new Error("歌曲不存在");
    return mutatePersistedLibraryState(state => {
      const set = new Set<string>(state.favorites || []);
      const shouldFavorite = favorite === undefined ? !set.has(filename) : !!favorite;
      if (shouldFavorite) set.add(filename); else set.delete(filename);
      state.favorites = Array.from(set).slice(0, MAX_ITEMS);
      return state;
    }, expectedRevision);
  }

  createPlaylist(name: string, expectedRevision?: number) {
    const clean = cleanName(name);
    if (!clean) throw new Error("歌单名称不能为空");
    return mutatePersistedLibraryState(state => {
      state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
      if (state.playlists.some((item: any) => item.name.toLowerCase() === clean.toLowerCase())) throw new Error("已有同名歌单");
      const timestamp = now();
      state.playlists.push({ id: `playlist_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, name: clean, tracks: [], createdAt: timestamp, updatedAt: timestamp });
      return state;
    }, expectedRevision);
  }

  updatePlaylist(id: string, input: { name?: string; tracks?: string[]; expectedRevision?: number }) {
    return mutatePersistedLibraryState(state => {
      state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
      const item = state.playlists.find((list: any) => list.id === id);
      if (!item) throw new Error("歌单不存在");
      if (input.name !== undefined) {
        const clean = cleanName(input.name);
        if (!clean) throw new Error("歌单名称不能为空");
        if (state.playlists.some((list: any) => list.id !== id && list.name.toLowerCase() === clean.toLowerCase())) throw new Error("已有同名歌单");
        item.name = clean;
      }
      if (input.tracks !== undefined) item.tracks = uniqueTracks(input.tracks);
      item.updatedAt = now();
      return state;
    }, input.expectedRevision);
  }

  deletePlaylist(id: string, expectedRevision?: number) {
    return mutatePersistedLibraryState(state => {
      state.playlists = Array.isArray(state.playlists) ? state.playlists : [];
      const before = state.playlists.length;
      state.playlists = state.playlists.filter((item: any) => item.id !== id);
      if (before === state.playlists.length) throw new Error("歌单不存在");
      return state;
    }, expectedRevision);
  }

  setQueue(tracks: string[], input: { currentFilename?: string; playMode?: MusicPlayMode; queueSources?: Record<string, MusicQueueSource | string>; expectedRevision?: number } = {}) {
    return mutatePersistedLibraryState(state => {
      state.queue = uniqueTracks(tracks);
      state.queueSources = normalizeQueueSources({
        ...(state.queueSources || {}),
        ...(input.queueSources || {}),
      }, state.queue);
      if (input.currentFilename !== undefined) {
        state.currentFilename = validTrack(input.currentFilename) ? String(input.currentFilename) : "";
      }
      if (input.playMode !== undefined) state.playMode = normalizePlayMode(input.playMode);
      return state;
    }, input.expectedRevision);
  }

  recordHistory(filename: string, source?: string, expectedRevision?: number) {
    if (!validTrack(filename)) throw new Error("歌曲不存在");
    return mutatePersistedLibraryState(state => {
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

  clearHistory(expectedRevision?: number) {
    return mutatePersistedLibraryState(state => {
      state.history = [];
      return state;
    }, expectedRevision);
  }

  removeTrack(filename: string, expectedRevision?: number) {
    return mutatePersistedLibraryState(state => {
      state.favorites = (state.favorites || []).filter((item: string) => item !== filename);
      state.queue = (state.queue || []).filter((item: string) => item !== filename);
      state.queueSources = state.queueSources || {};
      delete state.queueSources[filename];
      state.history = (state.history || []).filter((item: any) => item.filename !== filename);
      if (state.currentFilename === filename) state.currentFilename = "";
      for (const list of state.playlists || []) list.tracks = (list.tracks || []).filter((item: string) => item !== filename);
      return state;
    }, expectedRevision);
  }

  replaceTrackReferences(keepFilename: string, removeFilenames: string[], expectedRevision?: number) {
    const removed = new Set(removeFilenames.filter(Boolean));
    const replace = (items: string[]) => Array.from(new Set((items || []).map(item => (
      removed.has(item) ? keepFilename : item
    )).filter(Boolean)));
    return mutatePersistedLibraryState(state => {
      state.favorites = replace(state.favorites || []);
      state.queue = replace(state.queue || []);
      state.queueSources = state.queueSources || {};
      for (const filename of removed) {
        if (state.queueSources[filename] && !state.queueSources[keepFilename]) {
          state.queueSources[keepFilename] = state.queueSources[filename];
        }
        delete state.queueSources[filename];
      }
      state.history = (state.history || []).map((item: any) => (
        removed.has(item.filename) ? { ...item, filename: keepFilename } : item
      ));
      if (removed.has(state.currentFilename)) state.currentFilename = keepFilename;
      for (const list of state.playlists || []) list.tracks = replace(list.tracks || []);
      return state;
    }, expectedRevision);
  }

  restoreSnapshot(snapshot: any, expectedRevision?: number) {
    return mutatePersistedLibraryState(state => ({
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

export const musicLibraryState = new LibraryStateStore();
