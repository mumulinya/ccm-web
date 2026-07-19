import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { CCM_DIR, refreshEnvPath } from "../../core/utils";

export const MUSIC_DIR = path.join(CCM_DIR, "music");
const DURATION_CACHE_FILE = path.join(MUSIC_DIR, ".duration-cache.json");

if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

type DurationCacheEntry = { stamp: string; durationSec: number };
let durationCache: Record<string, DurationCacheEntry> | null = null;

function loadDurationCache() {
  if (durationCache) return durationCache;
  try {
    if (fs.existsSync(DURATION_CACHE_FILE)) {
      durationCache = JSON.parse(fs.readFileSync(DURATION_CACHE_FILE, "utf8") || "{}") || {};
    } else {
      durationCache = {};
    }
  } catch {
    durationCache = {};
  }
  return durationCache;
}

function saveDurationCache() {
  if (!durationCache) return;
  try { fs.writeFileSync(DURATION_CACHE_FILE, JSON.stringify(durationCache)); } catch {}
}

export function formatDurationSec(sec: number) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "";
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function probeDurationSec(filePath: string) {
  try {
    refreshEnvPath();
    const out = execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ], { encoding: "utf8", windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 });
    const sec = parseFloat(String(out || "").trim());
    if (Number.isFinite(sec) && sec > 0) return sec;
  } catch {}

  try {
    refreshEnvPath();
    execFileSync("ffmpeg", ["-i", filePath], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 2 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: any) {
    const stderr = Buffer.isBuffer(error?.stderr) ? error.stderr.toString("utf8") : String(error?.stderr || "");
    const msg = `${stderr}\n${error?.message || ""}`;
    const match = msg.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
  }
  return 0;
}

/** 读取本地音频时长（带文件戳缓存） */
export function resolveTrackDuration(filename: string, filePath: string, stat: fs.Stats) {
  const cache = loadDurationCache();
  const stamp = `${filename}|${stat.mtimeMs}|${stat.size}`;
  const hit = cache[filename];
  if (hit && hit.stamp === stamp && Number(hit.durationSec) > 0) {
    return {
      durationSec: Number(hit.durationSec),
      duration: formatDurationSec(Number(hit.durationSec)),
    };
  }

  const durationSec = probeDurationSec(filePath);
  cache[filename] = { stamp, durationSec };
  saveDurationCache();
  return {
    durationSec,
    duration: formatDurationSec(durationSec),
  };
}

export function buildLocalTrackMeta(filename: string, id = 0) {
  const filePath = path.join(MUSIC_DIR, filename);
  const stat = fs.statSync(filePath);
  const { artist, title, bvid } = parseMusicFilename(filename);
  const { duration, durationSec } = resolveTrackDuration(filename, filePath, stat);
  return {
    id,
    filename,
    title,
    artist,
    bvid,
    pic: `/api/music/cover?file=${encodeURIComponent(filename)}`,
    size: stat.size,
    modified: stat.mtime.toISOString(),
    duration,
    durationSec,
  };
}

export function parseMusicFilename(filename: string) {
  const name = filename.replace(/\.[^.]+$/, "");
  const bvidMatch = name.match(/(BV[\w]+)/i);
  const bvid = bvidMatch ? bvidMatch[1] : undefined;
  const cleaned = name.replace(/\[BV[\w]+\]/gi, "").replace(/BV[\w]+/gi, "").trim();
  const parts = cleaned.split(" - ");
  let artist = "未知艺术家", title = cleaned;
  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }
  if (!title) title = name;
  return { artist, title, bvid };
}

export function getMp3Cover(filePath: string): { mimeType: string, data: Buffer } | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const tagSizeHeader = Buffer.alloc(10);
    fs.readSync(fd, tagSizeHeader, 0, 10, 0);

    if (tagSizeHeader.toString("ascii", 0, 3) !== "ID3") {
      fs.closeSync(fd);
      return null;
    }

    const version = tagSizeHeader[3];
    const tagSize = (tagSizeHeader[6] << 21) | (tagSizeHeader[7] << 14) | (tagSizeHeader[8] << 7) | tagSizeHeader[9];
    const tagBuffer = Buffer.alloc(tagSize);
    fs.readSync(fd, tagBuffer, 0, tagSize, 10);
    fs.closeSync(fd);

    let offset = 0;
    while (offset < tagSize - 10) {
      let frameId = "";
      if (version === 2) {
        frameId = tagBuffer.toString("ascii", offset, offset + 3);
      } else {
        frameId = tagBuffer.toString("ascii", offset, offset + 4);
      }

      if (!frameId || frameId[0] === "\0" || /[^A-Z0-9]/.test(frameId)) {
        break;
      }

      let frameSize = 0;
      let headerSize = 0;
      if (version === 2) {
        frameSize = (tagBuffer[offset + 3] << 16) | (tagBuffer[offset + 4] << 8) | tagBuffer[offset + 5];
        headerSize = 6;
      } else if (version === 3) {
        frameSize = tagBuffer.readUInt32BE(offset + 4);
        headerSize = 10;
      } else if (version === 4) {
        const b0 = tagBuffer[offset + 4];
        const b1 = tagBuffer[offset + 5];
        const b2 = tagBuffer[offset + 6];
        const b3 = tagBuffer[offset + 7];
        frameSize = (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
        headerSize = 10;
      }

      if (frameSize <= 0 || offset + headerSize + frameSize > tagSize) {
        break;
      }

      const isAPIC = frameId === "APIC" || frameId === "PIC";
      if (isAPIC) {
        const frameContent = tagBuffer.subarray(offset + headerSize, offset + headerSize + frameSize);
        let mimeType = "";
        let pictureDataOffset = 0;

        if (frameId === "APIC") {
          const encoding = frameContent[0];
          let mimeEnd = 1;
          while (mimeEnd < frameContent.length && frameContent[mimeEnd] !== 0) {
            mimeEnd++;
          }
          mimeType = frameContent.toString("ascii", 1, mimeEnd);

          let descStart = mimeEnd + 2;
          let descEnd = descStart;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        } else {
          const encoding = frameContent[0];
          const imageFormat = frameContent.toString("ascii", 1, 4);
          mimeType = imageFormat === "PNG" ? "image/png" : "image/jpeg";

          let descStart = 5;
          let descEnd = descStart;
          if (encoding === 1) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        }

        const pictureData = frameContent.subarray(pictureDataOffset);
        return { mimeType, data: pictureData };
      }

      offset += headerSize + frameSize;
    }
  } catch (e) {
    console.error("[GetMp3Cover] error:", e);
  }
  return null;
}

export function searchLocalMusic(keyword: string) {
  const q = keyword.toLowerCase();
  return fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
    .filter(f => f.toLowerCase().includes(q))
    .map((f, i) => buildLocalTrackMeta(f, i));
}
