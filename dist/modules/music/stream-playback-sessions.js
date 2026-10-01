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
exports.resolveStreamMediaInput = resolveStreamMediaInput;
exports.createStreamSession = createStreamSession;
exports.getStreamSession = getStreamSession;
exports.cancelStreamSession = cancelStreamSession;
exports.retryStreamSession = retryStreamSession;
exports.streamManifest = streamManifest;
exports.streamSegment = streamSegment;
exports.streamSummary = streamSummary;
exports.pruneStreamCache = pruneStreamCache;
exports.handleMusicStreamApi = handleMusicStreamApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const child_process_2 = require("child_process");
const utils_1 = require("../../core/utils");
const search_results_1 = require("./search-results");
const music_catalog_1 = require("./music-catalog");
const library_1 = require("./library");
const bilibili_1 = require("./bilibili");
const douyin_1 = require("./douyin");
const video_playback_jobs_1 = require("./video-playback-jobs");
const video_audio_projection_1 = require("./video-audio-projection");
const music_persistence_1 = require("./music-persistence");
const netease_mv_1 = require("./netease-mv");
const media_interactions_1 = require("./media-interactions");
const media_errors_1 = require("./media-errors");
const hls_publication_1 = require("./hls-publication");
const ROOT = path.join(utils_1.CCM_DIR, "media", "stream-sessions");
const STORE = path.join(utils_1.CCM_DIR, "music-stream-sessions.json");
const sessions = new Map();
const processes = new Map();
const activeRuns = new Set();
const retryTimers = new Map();
let loaded = false;
function load() {
    if (loaded)
        return;
    loaded = true;
    try {
        const rows = JSON.parse(fs.readFileSync(STORE, "utf8"));
        if (Array.isArray(rows))
            for (const row of rows) {
                if (!/^ms_[a-f0-9-]{36}$/.test(row?.sessionId))
                    continue;
                if (["resolving", "buffering", "streaming", "reconnecting"].includes(row.status)) {
                    row.status = "failed";
                    row.error = "服务重启，流式会话已中断";
                    row.errorKind = "network_error";
                }
                sessions.set(row.sessionId, row);
            }
    }
    catch { /* first run */ }
}
function persist() {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    const tmp = `${STORE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...sessions.values()]), { mode: 0o600 });
    fs.renameSync(tmp, STORE);
}
function now() { return new Date().toISOString(); }
function safeDir(id) {
    if (!/^ms_[a-f0-9-]{36}$/.test(id))
        throw new Error("无效流式会话 ID");
    const dir = path.resolve(ROOT, id);
    if (!dir.startsWith(path.resolve(ROOT) + path.sep))
        throw new Error("不安全的流式缓存路径");
    for (let p = dir; p !== path.dirname(p); p = path.dirname(p))
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink())
            throw new Error("流式缓存目录不可使用联接或符号链接");
    fs.mkdirSync(ROOT, { recursive: true });
    return dir;
}
function update(s, patch = {}) { Object.assign(s, patch, { updatedAt: now() }); persist(); }
function publicSession(s) {
    s.lastAccessedAt = now();
    const { segmentDirectory: _segmentDirectory, partialVideoPath: _partialVideoPath, partialAudioPath: _partialAudioPath, ...safe } = s;
    delete safe._controller;
    return { ...safe,
        manifestUrl: fs.existsSync(path.join(s.segmentDirectory, "manifest.m3u8")) ? `/api/music/stream-sessions/${s.sessionId}/manifest.m3u8` : null,
        streamUrl: s.mediaKind === "video" ? `/api/music/stream-sessions/${s.sessionId}/manifest.m3u8` : null };
}
function sourceFrom(body) {
    const keys = Object.keys(body || {});
    if (keys.some(k => !["source", "downloadToken", "trackId", "videoJobId", "mediaKind"].includes(k)))
        throw new Error("流式会话不接受自定义路径或媒体地址");
    const forms = [!!body?.downloadToken, !!body?.trackId, !!body?.videoJobId].filter(Boolean).length;
    if (forms !== 1)
        throw new Error("请提供 downloadToken、trackId 或 videoJobId 其中一项");
    if (body.downloadToken) {
        const p = (0, search_results_1.verifyDownloadToken)(body.downloadToken, body.source);
        return { source: p.source, sourceId: p.source === "netease" && body.mediaKind === "video" ? (0, netease_mv_1.neteaseVideoIdentity)(String(p.sourceId)) : String(p.sourceId), title: p.title, artist: p.artist, mediaKind: body.mediaKind || (p.source === "netease" ? "audio" : "video") };
    }
    if (body.videoJobId) {
        const j = (0, video_playback_jobs_1.getMusicVideoJob)(String(body.videoJobId));
        if (!j)
            throw new Error("视频任务不存在");
        return { source: j.source, sourceId: j.sourceId, title: j.title, artist: j.artist, mediaKind: body.mediaKind || "video", videoJobId: j.id, durationSeconds: Number(j.durationSeconds || 0) };
    }
    const track = (0, music_catalog_1.findMusicCatalogTrackById)(String(body.trackId));
    if (!track)
        throw new Error("曲库条目不存在");
    const media = track.media || {};
    return { source: media.source || track.source || "local", sourceId: media.source === "netease" && body.mediaKind === "video" ? (0, netease_mv_1.neteaseVideoIdentity)(media.sourceId) : media.sourceId || track.sourceId || track.trackId, title: track.title, artist: track.artist, mediaKind: body.mediaKind || (media.source !== "netease" && media.videoAvailable ? "video" : "audio"), trackId: track.trackId, filename: track.filename, videoJobId: media.videoJobId };
}
async function resolveStreamMediaInput(s, signal) {
    const cached = (0, video_playback_jobs_1.findCachedMusicVideo)(s.source, s.sourceId);
    if (cached)
        return { input: (0, video_playback_jobs_1.resolveMusicVideoFile)(cached.id), local: true, duration: cached.durationSeconds };
    if (s.videoJobId) {
        try {
            return { input: (0, video_playback_jobs_1.resolveMusicVideoFile)(s.videoJobId), local: true, duration: s.durationSeconds };
        }
        catch { /* continue */ }
    }
    if (s.trackId && s.filename && s.source === "local")
        return { input: (0, music_catalog_1.resolveSafeMusicFile)(s.filename).filePath, local: true, duration: s.durationSeconds };
    if (s.source === "netease" && s.mediaKind === "video")
        return (0, netease_mv_1.getNeteaseMvInput)(s.sourceId);
    if (s.source === "netease")
        return { input: `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(s.sourceId)}.mp3`, headers: {}, duration: s.durationSeconds };
    if (s.source === "bilibili") {
        const streams = await (0, bilibili_1.getBiliPlaybackStreams)(s.sourceId);
        if (!streams.videoUrl || !streams.audioUrl)
            throw Object.assign(new Error("该 B站视频暂不支持流式播放"), { category: "unsupported_stream" });
        for (const raw of [streams.videoUrl, streams.audioUrl]) {
            const u = new URL(raw);
            if (!['http:', 'https:'].includes(u.protocol) || !['bilivideo.com', 'bilivideo.cn', 'akamaized.net'].some(d => u.hostname === d || u.hostname.endsWith('.' + d)))
                throw Object.assign(new Error("B站返回了不受支持的媒体地址"), { category: "unsupported_stream" });
        }
        return { video: streams.videoUrl, audio: streams.audioUrl, headers: { "User-Agent": bilibili_1.BILI_UA, Referer: "https://www.bilibili.com/" }, duration: streams.durationSeconds };
    }
    const d = await (0, douyin_1.resolveDouyinMediaInput)(s.sourceId, { signal });
    return { input: d.url, headers: d.headers, duration: d.durationSeconds };
}
async function finalize(s, input, signal) {
    const manifest = path.join(s.segmentDirectory, "manifest.m3u8");
    if (s.mediaKind === "video") {
        const videoDir = path.join(utils_1.CCM_DIR, "media", "video-playback", `stream_${s.sessionId}`);
        fs.mkdirSync(videoDir, { recursive: true });
        const video = path.join(videoDir, "video.mp4");
        await execFileAsync("ffmpeg", ["-nostdin", "-y", "-i", manifest, "-c", "copy", "-movflags", "+faststart", video], { windowsHide: true, timeout: 30 * 60_000, signal });
        s.linkedTrack = s.source === "netease" ? (s.trackId ? (0, music_catalog_1.findMusicCatalogTrackById)(s.trackId) : null) : await (0, video_audio_projection_1.linkVideoAudio)({ source: s.source, sourceId: s.sourceId, title: s.title || s.sourceId, artist: s.artist, id: `mv_${s.sessionId.slice(3)}` }, video, signal);
        s.durationSeconds = s.durationSeconds || Number(s.linkedTrack?.durationSec || 0);
        (0, video_playback_jobs_1.registerStreamVideoCache)(s);
    }
    else {
        fs.mkdirSync(library_1.MUSIC_DIR, { recursive: true });
        const name = `${String(s.artist || "未知").replace(/[<>:"/\\|?*\x00-\x1f]/g, " ").slice(0, 30).trim() || "未知"} - ${String(s.title || s.sourceId).replace(/[<>:"/\\|?*\x00-\x1f]/g, " ").slice(0, 80).trim() || s.sourceId} [${s.source}-${s.sourceId}] ${crypto.randomUUID().slice(0, 8)}.mp3`;
        const target = path.join(library_1.MUSIC_DIR, name), partial = `${target}.${s.sessionId}.part`;
        await execFileAsync("ffmpeg", ["-nostdin", "-y", "-i", manifest, "-vn", "-b:a", "192k", "-f", "mp3", partial], { windowsHide: true, timeout: 30 * 60_000, signal });
        fs.renameSync(partial, target);
        (0, music_persistence_1.upsertMusicMediaAsset)({ source: s.source, sourceId: s.sourceId, filename: name, displayName: s.title, actualQuality: "high", requestedQuality: "high", fileSize: fs.statSync(target).size });
        s.linkedTrack = await (0, music_catalog_1.ensureMusicCatalogTrackReady)(name, "stream_playback");
    }
}
const execFileAsync = (0, util_1.promisify)(child_process_2.execFile);
async function run(s) {
    if (activeRuns.has(s.sessionId) || s.status === 'cancelled' || s.status === 'completed')
        return;
    activeRuns.add(s.sessionId);
    const controller = new AbortController();
    s._controller = controller;
    let publishError;
    let progressTimer;
    try {
        update(s, { status: "resolving", failedStage: undefined, error: undefined, errorKind: undefined });
        const input = await resolveStreamMediaInput(s, controller.signal);
        s.durationSeconds = Number(input.duration || s.durationSeconds || 0);
        if (controller.signal.aborted) {
            update(s, { status: 'cancelled' });
            return;
        }
        s.segmentDirectory = safeDir(s.sessionId);
        fs.mkdirSync(s.segmentDirectory, { recursive: true });
        const publication = (0, hls_publication_1.createHlsPublication)(s.segmentDirectory);
        update(s, { status: "buffering", bufferedDuration: publication.resumeAt });
        const child = (0, child_process_1.spawn)("ffmpeg", (0, hls_publication_1.hlsEncodingArgs)(s.mediaKind, input, publication), { windowsHide: true, cwd: s.segmentDirectory, stdio: ["ignore", "pipe", "pipe"] });
        processes.set(s.sessionId, child);
        let stderr = "";
        child.stderr?.on("data", d => { stderr = (stderr + d.toString()).slice(-2000); });
        const publish = (complete = false) => {
            const result = publication.publish(complete);
            update(s, { bufferedDuration: result.duration, downloadedBytes: result.bytes,
                status: result.duration >= 3 ? 'streaming' : 'buffering' });
        };
        child.stdout?.resume();
        progressTimer = setInterval(() => { if (!controller.signal.aborted)
            try {
                publish();
            }
            catch (e) {
                publishError = e;
                child.kill();
            } }, 500);
        controller.signal.addEventListener("abort", () => { try {
            child.kill();
        }
        catch { } }, { once: true });
        const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
        processes.delete(s.sessionId);
        clearInterval(progressTimer);
        if (controller.signal.aborted) {
            update(s, { status: "cancelled" });
            return;
        }
        if (publishError)
            throw Object.assign(publishError, { category: 'disk_error' });
        publish(code === 0);
        if (code !== 0)
            throw Object.assign(new Error(stderr || "流式转码失败"), { category: /No space|Permission denied/i.test(stderr) ? "disk_error" : (s.source === "local" ? "transcode_error" : "network_error") });
        await finalize(s, input, controller.signal);
        if (controller.signal.aborted) {
            update(s, { status: 'cancelled' });
            return;
        }
        update(s, { status: "completed" });
        if (streamSummary().bytes > 10 * 1024 * 1024 * 1024)
            pruneStreamCache();
    }
    catch (e) {
        if (controller.signal.aborted)
            update(s, { status: "cancelled" });
        else if ((e?.category === "network_error" || e?.category === "source_expired") && s.retryCount < 4) {
            s.retryCount += 1;
            update(s, { status: "reconnecting", errorKind: e.category, error: "网络中断，正在自动重连" });
            retryTimers.set(s.sessionId, setTimeout(() => { retryTimers.delete(s.sessionId); if (s.status === "reconnecting")
                void run(s); }, [1000, 2000, 4000, 8000][s.retryCount - 1] || 8000));
        }
        else
            update(s, { status: "failed", error: (0, media_errors_1.publicMediaError)(e), errorKind: e?.category || (/ffmpeg/i.test(String(e?.message)) ? "transcode_error" : "network_error"), failedStage: "stream" });
    }
    finally {
        clearInterval(progressTimer);
        processes.delete(s.sessionId);
        activeRuns.delete(s.sessionId);
    }
}
function createStreamSession(body) {
    load();
    const info = sourceFrom(body);
    if (info.mediaKind === 'video') {
        let cached = (0, video_playback_jobs_1.findCachedMusicVideo)(info.source, info.sourceId);
        // Older streaming releases wrote MP4 without a durable video-job record.
        // Explicit playback repairs that association; status queries remain read-only.
        if (!cached)
            for (const row of sessions.values()) {
                if (row.source !== info.source || row.sourceId !== info.sourceId || row.mediaKind !== 'video' || row.status !== 'completed')
                    continue;
                cached = (0, video_playback_jobs_1.registerStreamVideoCache)(row);
                if (cached)
                    break;
            }
        if (cached)
            return { sessionId: null, source: cached.source, sourceId: cached.sourceId, mediaKind: 'video',
                protocol: 'mp4', cacheHit: true, status: 'completed', videoJobId: cached.id, streamUrl: cached.streamUrl,
                manifestUrl: null, title: cached.title, artist: cached.artist, durationSeconds: cached.durationSeconds,
                bufferedDuration: cached.durationSeconds || 0, linkedTrack: cached.linkedTrack || (info.trackId ? (0, music_catalog_1.findMusicCatalogTrackById)(info.trackId) : null) };
    }
    const existing = [...sessions.values()].find(s => s.source === info.source && s.sourceId === info.sourceId && s.mediaKind === info.mediaKind && (["resolving", "buffering", "streaming", "reconnecting"].includes(s.status) || s.status === 'completed' && fs.existsSync(path.join(safeDir(s.sessionId), 'manifest.m3u8'))));
    if (existing)
        return publicSession(existing);
    const id = `ms_${crypto.randomUUID()}`;
    const dir = safeDir(id);
    const t = now();
    const s = { sessionId: id, ...info, protocol: "hls", status: "resolving", bufferedDuration: 0, downloadedBytes: 0, durationSeconds: info.durationSeconds || 0, segmentDirectory: dir, partialVideoPath: path.join(dir, "partial.mp4"), partialAudioPath: path.join(dir, "partial.mp3"), retryCount: 0, createdAt: t, updatedAt: t, lastAccessedAt: t };
    sessions.set(id, s);
    persist();
    setImmediate(() => void run(s));
    return publicSession(s);
}
function getStreamSession(id) { load(); const s = sessions.get(id); if (!s)
    throw new Error("流式会话不存在"); s.lastAccessedAt = now(); persist(); return publicSession(s); }
function cancelStreamSession(id) { const s = sessions.get(id); if (!s)
    throw new Error("流式会话不存在"); if (s.status === 'completed')
    return publicSession(s); clearTimeout(retryTimers.get(id)); retryTimers.delete(id); s._controller?.abort(); update(s, { status: "cancelled" }); return publicSession(s); }
function retryStreamSession(id) { const s = sessions.get(id); if (!s)
    throw new Error("流式会话不存在"); if (activeRuns.has(id) || !['failed', 'cancelled'].includes(s.status))
    return publicSession(s); clearTimeout(retryTimers.get(id)); retryTimers.delete(id); s.segmentDirectory = safeDir(id); s.retryCount = 0; update(s, { status: 'resolving' }); setImmediate(() => void run(s)); return publicSession(s); }
function streamManifest(id) { const s = sessions.get(id); if (!s)
    throw new Error("流式会话不存在"); s.lastAccessedAt = now(); const file = path.join(safeDir(id), "manifest.m3u8"); if (!fs.existsSync(file))
    throw new Error("播放列表尚未准备好"); let text = fs.readFileSync(file, "utf8"); const base = `/api/music/stream-sessions/${id}/segments/`; text = text.replace(/URI="([^"]+)"/g, (_m, n) => { if (!(0, hls_publication_1.isHlsMediaName)(n))
    throw new Error('无效分片'); return `URI="${base}${n}"`; }).replace(/^[^#\r\n][^\r\n]*$/gm, n => { if (!(0, hls_publication_1.isHlsMediaName)(n))
    throw new Error('无效分片'); return `${base}${n}`; }); return text; }
function streamSegment(id, name) { const s = sessions.get(id); if (!s || !(0, hls_publication_1.isHlsMediaName)(name))
    throw new Error("分片不存在"); const file = path.join(safeDir(id), name); if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink())
    throw new Error("分片尚未准备好"); s.lastAccessedAt = now(); return file; }
function streamSummary() { load(); let bytes = 0; for (const s of sessions.values())
    if (fs.existsSync(s.segmentDirectory))
        for (const f of fs.readdirSync(s.segmentDirectory)) {
            try {
                bytes += fs.statSync(path.join(s.segmentDirectory, f)).size;
            }
            catch { }
        } return { success: true, bytes, maxBytes: 10 * 1024 * 1024 * 1024, sessions: [...sessions.values()].map(publicSession) }; }
function pruneStreamCache() { load(); const max = 10 * 1024 * 1024 * 1024; const summary = streamSummary(); const active = new Set([...sessions.values()].filter(s => ["resolving", "buffering", "streaming", "reconnecting"].includes(s.status)).map(s => s.sessionId)); const recent = new Set([...sessions.values()].sort((a, b) => Date.parse(b.lastAccessedAt) - Date.parse(a.lastAccessedAt)).slice(0, 20).map(s => s.sessionId)); const candidates = [...sessions.values()].filter(s => !active.has(s.sessionId) && !recent.has(s.sessionId) && ["completed", "failed", "cancelled"].includes(s.status)).sort((a, b) => Date.parse(a.lastAccessedAt) - Date.parse(b.lastAccessedAt)); let removed = 0, bytes = summary.bytes; for (const s of candidates) {
    if (bytes <= max)
        break;
    try {
        const before = fs.existsSync(s.segmentDirectory) ? fs.readdirSync(s.segmentDirectory).reduce((n, f) => n + (fs.statSync(path.join(s.segmentDirectory, f)).size || 0), 0) : 0;
        fs.rmSync(s.segmentDirectory, { recursive: true, force: true });
        sessions.delete(s.sessionId);
        bytes -= before;
        removed++;
    }
    catch { }
} persist(); return { ...streamSummary(), removed }; }
function handleMusicStreamApi(pathname, req, res) {
    if (!pathname.startsWith("/api/music/stream-sessions") && !pathname.startsWith("/api/music/cache/stream-summary") && pathname !== "/api/music/cache/prune")
        return false;
    const fail = (e, code = 400) => (0, utils_1.sendJson)(res, { success: false, error: e?.message || "流式播放请求失败", errorKind: e?.category || undefined }, code);
    if (pathname === "/api/music/stream-sessions" && req.method === "POST") {
        let raw = "";
        req.on("data", c => { raw += c.toString(); if (Buffer.byteLength(raw) > 16384)
            req.destroy(); });
        req.on("end", async () => { try {
            const body = JSON.parse(raw || "{}");
            if (body.mediaKind === "video")
                await (0, media_interactions_1.ensureNeteaseRequest)(body);
            (0, utils_1.sendJson)(res, { success: true, session: createStreamSession(body) }, 202);
        }
        catch (e) {
            fail(e);
        } });
        return true;
    }
    if (pathname === "/api/music/cache/stream-summary" && req.method === "GET") {
        (0, utils_1.sendJson)(res, streamSummary());
        return true;
    }
    if (pathname === "/api/music/cache/prune" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, pruneStreamCache());
        }
        catch (e) {
            fail(e);
        }
        return true;
    }
    const m = /^\/api\/music\/stream-sessions\/(ms_[a-f0-9-]{36})(?:\/(manifest\.m3u8|cancel|retry|segments\/([^/]+)))?$/.exec(pathname);
    if (!m) {
        fail(new Error("流式接口不存在"), 404);
        return true;
    }
    try {
        const id = m[1], action = m[2];
        if (!action && req.method === "GET")
            (0, utils_1.sendJson)(res, { success: true, session: getStreamSession(id) });
        else if (action === "manifest.m3u8" && req.method === "GET") {
            const text = streamManifest(id);
            res.writeHead(200, { "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8", "Cache-Control": "no-store" });
            res.end(text);
        }
        else if (action?.startsWith("segments/") && ["GET", "HEAD"].includes(req.method)) {
            const file = streamSegment(id, m[3]);
            res.writeHead(200, { "Content-Type": m[3].endsWith('init.mp4') ? "video/mp4" : "video/iso.segment", "Cache-Control": "private, max-age=3600, immutable", "Content-Length": fs.statSync(file).size });
            if (req.method === "HEAD")
                res.end();
            else {
                const stream = fs.createReadStream(file);
                res.on('close', () => stream.destroy());
                stream.on('error', () => res.destroy());
                stream.pipe(res);
            }
        }
        else if (action === "cancel" && req.method === "POST")
            (0, utils_1.sendJson)(res, { success: true, session: cancelStreamSession(id) });
        else if (action === "retry" && req.method === "POST")
            (0, utils_1.sendJson)(res, { success: true, session: retryStreamSession(id) });
        else
            (0, utils_1.sendJson)(res, { success: false, error: "流式接口不存在" }, 404);
    }
    catch (e) {
        fail(e, 404);
    }
    return true;
}
//# sourceMappingURL=stream-playback-sessions.js.map