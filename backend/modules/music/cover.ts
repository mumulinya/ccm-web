import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PUBLIC_DIR } from "../../core/utils";
import { MUSIC_DIR, getMp3Cover } from "./library";

const MIN_IMAGE_BYTES = 256;
const MAX_REMOTE_BYTES = 2.5 * 1024 * 1024;
const REMOTE_TIMEOUT_MS = 3500;

/** 外网随机二次元图源（实测返回 image/*；失败则本地兜底） */
const RANDOM_ANIME_COVER_URLS = [
  "https://www.dmoe.cc/random.php",
  "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images",
  "https://pic.re/image",
];

function sendBuffer(res: any, buffer: Buffer, contentType: string, cacheControl = "public, max-age=31536000") {
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": buffer.length,
    "Cache-Control": cacheControl,
  });
  res.end(buffer);
}

function looksLikeImage(buffer: Buffer) {
  if (!buffer || buffer.length < MIN_IMAGE_BYTES) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
  if (buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return true;
  if (buffer.toString("ascii", 0, 3) === "GIF") return true;
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return true;
  return false;
}

function contentTypeForPath(filePath: string, buffer?: Buffer) {
  const lower = (filePath || "").toLowerCase();
  if (lower.endsWith(".png") || (buffer && buffer[0] === 0x89)) return "image/png";
  if (lower.endsWith(".gif") || (buffer && buffer.toString("ascii", 0, 3) === "GIF")) return "image/gif";
  if (lower.endsWith(".webp") || (buffer && buffer.toString("ascii", 8, 12) === "WEBP")) return "image/webp";
  return "image/jpeg";
}

function pickLocalAnimeCover(preferredHash = "") {
  const animeCoversDir = path.join(PUBLIC_DIR, "anime_covers");
  if (!fs.existsSync(animeCoversDir)) return null;
  const files = fs.readdirSync(animeCoversDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).sort();
  if (files.length === 0) return null;
  let sum = 0;
  for (let i = 0; i < preferredHash.length; i++) sum += preferredHash.charCodeAt(i);
  const chosenFile = files[(sum || Date.now()) % files.length];
  const animePath = path.join(animeCoversDir, chosenFile);
  if (!fs.existsSync(animePath)) return null;
  const buffer = fs.readFileSync(animePath);
  if (!looksLikeImage(buffer)) return null;
  return { buffer, contentType: contentTypeForPath(animePath, buffer), fileName: chosenFile };
}

function sendLocalAnimeCover(res: any, preferredHash = "", cacheControl = "no-cache", cachePath = "") {
  const anime = pickLocalAnimeCover(preferredHash || String(Date.now()));
  if (anime) {
    if (cachePath) {
      try { fs.writeFileSync(cachePath, anime.buffer); } catch {}
    }
    sendBuffer(res, anime.buffer, anime.contentType, cacheControl);
    return true;
  }

  const defaultPath = path.join(PUBLIC_DIR, "room_window_bg.png");
  if (fs.existsSync(defaultPath)) {
    const buffer = fs.readFileSync(defaultPath);
    if (cachePath) {
      try { fs.writeFileSync(cachePath, buffer); } catch {}
    }
    sendBuffer(res, buffer, "image/png", cachePath ? "public, max-age=60" : "no-cache");
    return true;
  }

  res.writeHead(404);
  res.end("Not Found");
  return true;
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchRemoteAnimeCover(timeoutMs = REMOTE_TIMEOUT_MS) {
  for (const url of shuffle(RANDOM_ANIME_COVER_URLS)) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
        headers: {
          Accept: "image/*,*/*",
          "User-Agent": "ccm-music-cover/1.0",
        },
      });
      if (!resp.ok) continue;
      const mime = String(resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      // alcy 等源偶发 video/mp4，直接跳过，避免白下大文件
      if (mime && !mime.startsWith("image/") && mime !== "application/octet-stream") continue;
      const lenHeader = Number(resp.headers.get("content-length") || 0);
      if (lenHeader > MAX_REMOTE_BYTES) continue;
      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length > MAX_REMOTE_BYTES || !looksLikeImage(buffer)) continue;
      const contentType = mime.startsWith("image/") ? mime : contentTypeForPath("", buffer);
      return { buffer, contentType, source: url };
    } catch {}
  }
  return null;
}

function sendDefaultCover(res: any, cachePath = "", preferredHash = "", cacheControl = "public, max-age=31536000") {
  return sendLocalAnimeCover(res, preferredHash, cacheControl, cachePath);
}

/**
 * 随机动漫图：外网优先，本地 anime_covers 兜底
 * GET /api/music/anime-cover
 *   无参 / ?t=xxx     — 每次外网随机（浏览器防缓存可用 t）
 *   ?local=1          — 强制本地
 *   ?n=1..N           — 本地按序号
 *   ?seed=xxx         — 本地按种子稳定选
 */
export function handleAnimeCoverApi(res: any, parsed: any): boolean {
  const query = parsed?.query || {};
  const nRaw = String(query.n || "").trim();
  const seed = String(query.seed || "").trim();
  const forceLocal =
    query.local === "1" ||
    query.local === "true" ||
    /^\d+$/.test(nRaw) ||
    !!seed;

  if (forceLocal) {
    const animeCoversDir = path.join(PUBLIC_DIR, "anime_covers");
    if (!fs.existsSync(animeCoversDir)) {
      sendLocalAnimeCover(res, seed || String(Date.now()), "no-cache");
      return true;
    }
    const files = fs.readdirSync(animeCoversDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).sort();
    if (files.length === 0) {
      sendLocalAnimeCover(res, seed || String(Date.now()), "no-cache");
      return true;
    }

    let index = 0;
    if (nRaw && /^\d+$/.test(nRaw)) {
      index = (Math.max(1, parseInt(nRaw, 10)) - 1) % files.length;
    } else if (seed) {
      let sum = 0;
      for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
      index = sum % files.length;
    } else {
      index = Math.floor(Math.random() * files.length);
    }

    const filePath = path.join(animeCoversDir, files[index]);
    try {
      const buffer = fs.readFileSync(filePath);
      if (!looksLikeImage(buffer)) {
        sendLocalAnimeCover(res, seed || String(index), "no-cache");
        return true;
      }
      sendBuffer(res, buffer, contentTypeForPath(filePath, buffer), seed || nRaw ? "public, max-age=86400" : "no-cache");
    } catch {
      sendLocalAnimeCover(res, seed || String(index), "no-cache");
    }
    return true;
  }

  (async () => {
    const remote = await fetchRemoteAnimeCover(REMOTE_TIMEOUT_MS);
    if (remote) {
      sendBuffer(res, remote.buffer, remote.contentType, "no-cache");
      return;
    }
    sendLocalAnimeCover(res, String(Date.now()), "no-cache");
  })();
  return true;
}

export function handleMusicCoverApi(res: any, parsed: any): boolean {
  const filename = parsed.query.file;
  if (filename && filename.includes("..")) {
    res.writeHead(400);
    res.end("Bad Request");
    return true;
  }

  // 无曲目：外网随机动漫图，失败再本地兜底
  if (!filename) {
    (async () => {
      const remote = await fetchRemoteAnimeCover(REMOTE_TIMEOUT_MS);
      if (remote) {
        sendBuffer(res, remote.buffer, remote.contentType, "no-cache");
        return;
      }
      sendLocalAnimeCover(res, String(Date.now()), "no-cache");
    })();
    return true;
  }

  const filePath = path.join(MUSIC_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return true;
  }

  const coversCacheDir = path.join(MUSIC_DIR, ".covers");
  if (!fs.existsSync(coversCacheDir)) {
    fs.mkdirSync(coversCacheDir, { recursive: true });
  }

  const hash = crypto.createHash("md5").update(filename).digest("hex");
  const cachePath = path.join(coversCacheDir, `${hash}.jpg`);
  const embeddedCachePath = path.join(coversCacheDir, `${hash}.embedded`);

  if (fs.existsSync(cachePath)) {
    try {
      const buffer = fs.readFileSync(cachePath);
      if (looksLikeImage(buffer)) {
        sendBuffer(res, buffer, contentTypeForPath(cachePath, buffer));
        return true;
      }
    } catch {}
  }

  try {
    const embedded = getMp3Cover(filePath);
    if (embedded?.data?.length && looksLikeImage(embedded.data)) {
      const ext = embedded.mimeType.includes("png") ? "png" : "jpg";
      const embeddedPath = `${embeddedCachePath}.${ext}`;
      try { fs.writeFileSync(embeddedPath, embedded.data); } catch {}
      try { fs.writeFileSync(cachePath, embedded.data); } catch {}
      sendBuffer(res, embedded.data, embedded.mimeType);
      return true;
    }
  } catch {}

  // 无内嵌封面：拉外网随机图并缓存到该曲，失败再用本地
  (async () => {
    const remote = await fetchRemoteAnimeCover(REMOTE_TIMEOUT_MS);
    if (remote) {
      try { fs.writeFileSync(cachePath, remote.buffer); } catch {}
      sendBuffer(res, remote.buffer, remote.contentType);
      return;
    }
    sendDefaultCover(res, cachePath, hash);
  })();
  return true;
}
