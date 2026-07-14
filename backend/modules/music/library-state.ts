import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { MUSIC_DIR } from "./library";

export type MusicPlaylist = { id: string; name: string; tracks: string[]; createdAt: string; updatedAt: string };
export type MusicLibraryState = { version: 1; favorites: string[]; playlists: MusicPlaylist[]; queue: string[]; updatedAt: string };

const FILE = path.join(CCM_DIR, "music-library-state.json");
const MAX_ITEMS = 1000;

function now() { return new Date().toISOString(); }
function cleanName(value: any, max = 80) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max); }
function validTrack(filename: any) {
  const name = String(filename || "");
  return !!name && name === path.basename(name) && fs.existsSync(path.join(MUSIC_DIR, name));
}
function uniqueTracks(values: any) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(validTrack))).slice(0, MAX_ITEMS);
}

function emptyState(): MusicLibraryState { return { version: 1, favorites: [], playlists: [], queue: [], updatedAt: now() }; }

class LibraryStateStore {
  private state: MusicLibraryState = emptyState();

  constructor() { this.load(); }

  get() {
    this.state.favorites = uniqueTracks(this.state.favorites);
    this.state.queue = uniqueTracks(this.state.queue);
    this.state.playlists = this.state.playlists.slice(0, 100).map(list => ({ ...list, tracks: uniqueTracks(list.tracks) }));
    return JSON.parse(JSON.stringify(this.state));
  }

  toggleFavorite(filename: string, favorite?: boolean) {
    if (!validTrack(filename)) throw new Error("歌曲不存在");
    const set = new Set(this.state.favorites);
    const shouldFavorite = favorite === undefined ? !set.has(filename) : !!favorite;
    if (shouldFavorite) set.add(filename); else set.delete(filename);
    this.state.favorites = Array.from(set).slice(0, MAX_ITEMS);
    this.save();
    return this.get();
  }

  createPlaylist(name: string) {
    const clean = cleanName(name);
    if (!clean) throw new Error("歌单名称不能为空");
    if (this.state.playlists.some(item => item.name.toLowerCase() === clean.toLowerCase())) throw new Error("已有同名歌单");
    const timestamp = now();
    this.state.playlists.push({ id: `playlist_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, name: clean, tracks: [], createdAt: timestamp, updatedAt: timestamp });
    this.save();
    return this.get();
  }

  updatePlaylist(id: string, input: { name?: string; tracks?: string[] }) {
    const item = this.state.playlists.find(list => list.id === id);
    if (!item) throw new Error("歌单不存在");
    if (input.name !== undefined) {
      const clean = cleanName(input.name);
      if (!clean) throw new Error("歌单名称不能为空");
      item.name = clean;
    }
    if (input.tracks !== undefined) item.tracks = uniqueTracks(input.tracks);
    item.updatedAt = now();
    this.save();
    return this.get();
  }

  deletePlaylist(id: string) {
    const before = this.state.playlists.length;
    this.state.playlists = this.state.playlists.filter(item => item.id !== id);
    if (before === this.state.playlists.length) throw new Error("歌单不存在");
    this.save();
    return this.get();
  }

  setQueue(tracks: string[]) {
    this.state.queue = uniqueTracks(tracks);
    this.save();
    return this.get();
  }

  removeTrack(filename: string) {
    this.state.favorites = this.state.favorites.filter(item => item !== filename);
    this.state.queue = this.state.queue.filter(item => item !== filename);
    for (const list of this.state.playlists) list.tracks = list.tracks.filter(item => item !== filename);
    this.save();
  }

  private load() {
    try {
      if (!fs.existsSync(FILE)) return;
      const value = JSON.parse(fs.readFileSync(FILE, "utf-8"));
      this.state = { ...emptyState(), ...value, version: 1 };
    } catch (error: any) { console.warn("[MusicLibraryState] failed to load:", error?.message); }
  }

  private save() {
    this.state.updatedAt = now();
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.state, null, 2), "utf-8");
    fs.renameSync(temp, FILE);
  }
}

export const musicLibraryState = new LibraryStateStore();
