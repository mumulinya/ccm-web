import * as fs from "fs";
import * as path from "path";
import { buildLocalTrackMeta, MUSIC_DIR } from "./library";
import { musicLibraryState } from "./library-state";

const AUDIO_EXTENSION = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
const QUALITY_WEIGHT: Record<string, number> = {
  ".flac": 600,
  ".wav": 550,
  ".m4a": 450,
  ".aac": 400,
  ".ogg": 350,
  ".mp3": 300,
};

function normalizeIdentity(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\[(（【](?:hi[- ]?res|lossless|无损|高音质|标准音质|live|现场|伴奏|纯享|official|mv|歌词版|完整版|remaster(?:ed)?|\d{3,4}kbps)[\])）】]/gi, " ")
    .replace(/(?:[-_ ]copy|副本|\(\d+\)|（\d+）)$/gi, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function qualityScore(filename: string, size: number) {
  const extension = path.extname(filename).toLowerCase();
  return (QUALITY_WEIGHT[extension] || 0) * 1_000_000_000 + Math.max(0, size || 0);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

export function scanMusicDuplicates() {
  const files = fs.readdirSync(MUSIC_DIR).filter(filename => AUDIO_EXTENSION.test(filename));
  const groups = new Map<string, any[]>();
  for (const [index, filename] of files.entries()) {
    try {
      const track = buildLocalTrackMeta(filename, index);
      const titleKey = normalizeIdentity(track.title);
      const artistKey = normalizeIdentity(track.artist === "未知艺术家" ? "" : track.artist);
      if (!titleKey) continue;
      const key = `${titleKey}::${artistKey}`;
      const extension = path.extname(filename).toLowerCase();
      const item = {
        ...track,
        extension: extension.slice(1).toUpperCase(),
        source: "本地曲库",
        relativePath: `music/${filename}`,
        sizeLabel: formatBytes(track.size),
        qualityScore: qualityScore(filename, track.size),
      };
      groups.set(key, [...(groups.get(key) || []), item]);
    } catch {}
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([id, items]) => {
      const sorted = [...items].sort((a, b) => b.qualityScore - a.qualityScore || b.modified.localeCompare(a.modified));
      return {
        id,
        title: sorted[0].title,
        artist: sorted[0].artist,
        recommendedFilename: sorted[0].filename,
        items: sorted.map(({ qualityScore: _qualityScore, ...item }) => item),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function mergeMusicDuplicateGroup(keepFilename: string, removeFilenames: string[]) {
  const keep = String(keepFilename || "");
  const remove = Array.from(new Set((Array.isArray(removeFilenames) ? removeFilenames : []).map(String)))
    .filter(filename => filename && filename !== keep);
  const group = scanMusicDuplicates().find(item => (
    item.items.some((track: any) => track.filename === keep)
    && remove.every(filename => item.items.some((track: any) => track.filename === filename))
  ));
  if (!group) throw new Error("重复项已经变化，请重新扫描后再合并");
  if (!remove.length) throw new Error("没有需要合并的重复文件");

  const deleted: string[] = [];
  for (const filename of remove) {
    const filePath = path.join(MUSIC_DIR, filename);
    if (filename !== path.basename(filename) || !fs.existsSync(filePath)) {
      throw new Error(`文件不存在或路径无效：${filename}`);
    }
  }
  for (const filename of remove) {
    fs.unlinkSync(path.join(MUSIC_DIR, filename));
    musicLibraryState.removeTrack(filename);
    deleted.push(filename);
  }
  return { kept: keep, deleted, groups: scanMusicDuplicates() };
}
