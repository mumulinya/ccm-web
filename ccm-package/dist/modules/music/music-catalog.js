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
exports.MUSIC_MEDIA_LIMITS = void 0;
exports.resolveSafeMusicFile = resolveSafeMusicFile;
exports.probeMusicFile = probeMusicFile;
exports.startMusicCatalogRescan = startMusicCatalogRescan;
exports.scheduleMusicCatalogRescan = scheduleMusicCatalogRescan;
exports.ensureMusicCatalogPrepared = ensureMusicCatalogPrepared;
exports.queryMusicCatalog = queryMusicCatalog;
exports.findMusicCatalogTrackByFilename = findMusicCatalogTrackByFilename;
exports.ensureMusicCatalogTrackReady = ensureMusicCatalogTrackReady;
exports.ensureMusicCatalogTrackRemoved = ensureMusicCatalogTrackRemoved;
exports.musicCatalogFileDiagnostics = musicCatalogFileDiagnostics;
exports.assertSafeId3Allocation = assertSafeId3Allocation;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const utils_1 = require("../../core/utils");
const music_persistence_1 = require("./music-persistence");
const observability_database_1 = require("../../system/observability-database");
const library_1 = require("./library");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const AUDIO_EXTENSION = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
const MAX_PROBE_OUTPUT = 512 * 1024;
const PROBE_TIMEOUT_MS = 12_000;
const INDEX_BUILD_STALE_MS = 15 * 60_000;
const MAX_ID3_TAG_BYTES = 16 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
let runningBuild = null;
let scheduledTimer = null;
function now() {
    return new Date().toISOString();
}
function cleanFilename(value) {
    const filename = String(value || "").trim();
    if (!filename || filename !== path.basename(filename) || filename.includes("\0") || !AUDIO_EXTENSION.test(filename)) {
        throw new Error("无效音乐文件名");
    }
    return filename;
}
function parseFilename(filename) {
    const name = filename.replace(/\.[^.]+$/, "");
    const bvidMatch = name.match(/(BV[\w]+)/i);
    const bvid = bvidMatch ? bvidMatch[1] : "";
    const cleaned = name.replace(/\[BV[\w]+\]/gi, "").replace(/BV[\w]+/gi, "").trim();
    const parts = cleaned.split(" - ");
    if (parts.length >= 2)
        return { artist: parts[0].trim() || "未知艺术家", title: parts.slice(1).join(" - ").trim() || cleaned, bvid };
    return { artist: "未知艺术家", title: cleaned || name, bvid };
}
function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0)
        return "";
    const total = Math.round(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function resolveSafeMusicFile(filenameValue, options = {}) {
    const filename = cleanFilename(filenameValue);
    const root = fs.realpathSync(library_1.MUSIC_DIR);
    const filePath = path.join(root, filename);
    if (options.mustExist !== false && !fs.existsSync(filePath))
        throw new Error("音乐文件不存在");
    if (!fs.existsSync(filePath))
        return { filename, filePath, root };
    const lstat = fs.lstatSync(filePath);
    if (!lstat.isFile() || lstat.isSymbolicLink())
        throw new Error("音乐文件必须是曲库内的普通文件");
    const real = fs.realpathSync(filePath);
    if (path.dirname(real) !== root)
        throw new Error("音乐文件超出曲库范围");
    return { filename, filePath: real, root, stat: fs.statSync(real) };
}
async function fileChecksum(file) {
    return await new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(file);
        stream.on("data", chunk => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}
async function probeMusicFile(filePath) {
    (0, utils_1.refreshEnvPath)();
    const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration,format_name,bit_rate:stream=codec_type,sample_rate,channels,bit_rate",
        "-of", "json",
        filePath,
    ], {
        timeout: PROBE_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: MAX_PROBE_OUTPUT,
    });
    const value = JSON.parse(String(stdout || "{}"));
    const audio = (value.streams || []).find((item) => item.codec_type === "audio") || {};
    const durationSeconds = Number(value.format?.duration || 0);
    const bitrate = Number(audio.bit_rate || value.format?.bit_rate || 0);
    return {
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        bitrate: Number.isFinite(bitrate) ? bitrate : 0,
        sampleRate: Number(audio.sample_rate || 0) || 0,
        channels: Number(audio.channels || 0) || 0,
        format: String(value.format?.format_name || path.extname(filePath).slice(1)).split(",")[0],
    };
}
function rowToTrack(row) {
    const metadata = (() => { try {
        return JSON.parse(String(row.metadata_json || "{}"));
    }
    catch {
        return {};
    } })();
    return {
        id: row.track_id,
        trackId: row.track_id,
        filename: row.filename,
        title: row.title,
        artist: row.artist,
        bvid: metadata.bvid || undefined,
        pic: `/api/music/cover?file=${encodeURIComponent(row.filename)}`,
        size: Number(row.file_size || 0),
        modified: row.modified_at,
        duration: formatDuration(Number(row.duration_seconds || 0)),
        durationSec: Number(row.duration_seconds || 0),
        bitrate: Number(row.bitrate || 0),
        sampleRate: Number(row.sample_rate || 0),
        channels: Number(row.channels || 0),
        format: row.format || "",
        checksum: row.file_checksum || "",
        state: row.state || "ready",
        error: row.error || "",
        source: row.source || "local",
        sourceId: row.source_id || row.filename,
    };
}
async function mapLimit(items, concurrency, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(runners);
    return results;
}
function beginGeneration() {
    return (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const building = db.prepare(`
      SELECT * FROM music_catalog_generations_v4 WHERE status='building' ORDER BY generation DESC LIMIT 1
    `).get();
        if (building && Date.now() - Date.parse(building.started_at) < INDEX_BUILD_STALE_MS)
            return { generation: Number(building.generation), owned: false };
        if (building) {
            db.prepare("UPDATE music_catalog_generations_v4 SET status='failed', completed_at=?, error=? WHERE generation=?")
                .run(now(), "索引构建租约过期", building.generation);
        }
        const generation = Number(db.prepare("SELECT COALESCE(MAX(generation),0)+1 AS value FROM music_catalog_generations_v4").get()?.value || 1);
        db.prepare(`
      INSERT INTO music_catalog_generations_v4(generation,status,started_at) VALUES (?,'building',?)
    `).run(generation, now());
        return { generation, owned: true };
    });
}
async function buildGeneration(reason) {
    const lease = beginGeneration();
    if (!lease.owned)
        return (0, music_persistence_1.getMusicCatalogStatus)();
    const generation = lease.generation;
    try {
        const entries = await fs.promises.readdir(library_1.MUSIC_DIR, { withFileTypes: true });
        const filenames = entries.filter(item => item.isFile() && AUDIO_EXTENSION.test(item.name)).map(item => item.name).sort();
        const previousGeneration = (0, music_persistence_1.activeMusicCatalogGeneration)();
        const previousRows = previousGeneration
            ? (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM music_catalog_tracks_v4 WHERE generation=?").all(previousGeneration)
            : [];
        const previousByFile = new Map(previousRows.map(row => [row.filename, row]));
        const rows = await mapLimit(filenames, 2, async (filename) => {
            try {
                const safe = resolveSafeMusicFile(filename);
                const stamp = `${safe.stat.size}:${safe.stat.mtimeMs}`;
                const previous = previousByFile.get(filename);
                const previousMetadata = previous ? JSON.parse(String(previous.metadata_json || "{}")) : {};
                if (previous && previousMetadata.stamp === stamp && previous.file_checksum) {
                    return { ...previous, generation, metadata_json: JSON.stringify({ ...previousMetadata, reused: true, indexReason: reason }) };
                }
                const parsed = parseFilename(filename);
                const [probe, checksum] = await Promise.all([probeMusicFile(safe.filePath), fileChecksum(safe.filePath)]);
                return {
                    generation,
                    track_id: `local_${checksum.slice(0, 24)}`,
                    filename,
                    title: parsed.title,
                    artist: parsed.artist,
                    source: "local",
                    source_id: filename,
                    duration_seconds: probe.durationSeconds,
                    bitrate: probe.bitrate,
                    sample_rate: probe.sampleRate,
                    channels: probe.channels,
                    format: probe.format,
                    file_size: safe.stat.size,
                    modified_at: safe.stat.mtime.toISOString(),
                    file_checksum: checksum,
                    state: "ready",
                    error: "",
                    metadata_json: JSON.stringify({ bvid: parsed.bvid, stamp, indexReason: reason }),
                };
            }
            catch (error) {
                const parsed = parseFilename(filename);
                let stat = null;
                try {
                    stat = fs.statSync(path.join(library_1.MUSIC_DIR, filename));
                }
                catch { }
                return {
                    generation,
                    track_id: `failed_${crypto.createHash("sha256").update(filename).digest("hex").slice(0, 24)}`,
                    filename,
                    title: parsed.title,
                    artist: parsed.artist,
                    source: "local",
                    source_id: filename,
                    duration_seconds: 0,
                    bitrate: 0,
                    sample_rate: 0,
                    channels: 0,
                    format: path.extname(filename).slice(1),
                    file_size: Number(stat?.size || 0),
                    modified_at: stat?.mtime?.toISOString?.() || now(),
                    file_checksum: "",
                    state: "failed",
                    error: String(error?.message || "媒体探测失败").slice(0, 300),
                    metadata_json: JSON.stringify({ indexReason: reason }),
                };
            }
        });
        const digest = crypto.createHash("sha256");
        for (const row of rows)
            digest.update(`${row.filename}:${row.file_checksum}:${row.state}\n`);
        (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
            const insert = db.prepare(`
        INSERT INTO music_catalog_tracks_v4(
          generation,track_id,filename,title,artist,source,source_id,duration_seconds,
          bitrate,sample_rate,channels,format,file_size,modified_at,file_checksum,state,error,metadata_json
        ) VALUES (@generation,@track_id,@filename,@title,@artist,@source,@source_id,@duration_seconds,
          @bitrate,@sample_rate,@channels,@format,@file_size,@modified_at,@file_checksum,@state,@error,@metadata_json)
      `);
            for (const row of rows)
                insert.run(row);
            db.prepare(`
        UPDATE music_catalog_generations_v4
        SET status='ready',track_count=?,failed_count=?,completed_at=?,checksum=?,error=''
        WHERE generation=? AND status='building'
      `).run(rows.length, rows.filter(row => row.state !== "ready").length, now(), digest.digest("hex"), generation);
        });
        (0, music_persistence_1.setActiveMusicCatalogGeneration)(generation);
        pruneCatalogGenerations();
        return (0, music_persistence_1.getMusicCatalogStatus)();
    }
    catch (error) {
        (0, observability_database_1.getObservabilityDatabase)().prepare(`
      UPDATE music_catalog_generations_v4 SET status='failed',completed_at=?,error=? WHERE generation=?
    `).run(now(), String(error?.message || "曲库索引失败").slice(0, 500), generation);
        throw error;
    }
}
function pruneCatalogGenerations() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const keep = db.prepare(`
    SELECT generation FROM music_catalog_generations_v4 ORDER BY generation DESC LIMIT 3
  `).all().map(row => Number(row.generation));
    if (!keep.length)
        return;
    db.prepare(`DELETE FROM music_catalog_generations_v4 WHERE generation NOT IN (${keep.map(() => "?").join(",")})`).run(...keep);
}
function startMusicCatalogRescan(reason = "manual") {
    if (runningBuild)
        return runningBuild;
    runningBuild = buildGeneration(reason).finally(() => { runningBuild = null; });
    return runningBuild;
}
function scheduleMusicCatalogRescan(reason = "change", delayMs = 250) {
    if (scheduledTimer)
        clearTimeout(scheduledTimer);
    scheduledTimer = setTimeout(() => {
        scheduledTimer = null;
        void startMusicCatalogRescan(reason).catch(error => console.warn("[MusicCatalog] rescan failed:", error?.message));
    }, Math.max(0, delayMs));
}
function ensureMusicCatalogPrepared() {
    const status = (0, music_persistence_1.getMusicCatalogStatus)();
    if (!status.activeGeneration && status.indexStatus !== "indexing")
        scheduleMusicCatalogRescan("first-use", 0);
    return (0, music_persistence_1.getMusicCatalogStatus)();
}
function queryMusicCatalog(input = {}) {
    const status = ensureMusicCatalogPrepared();
    const result = (0, music_persistence_1.listMusicCatalogTracks)(input);
    return {
        ...result,
        tracks: result.tracks.map(rowToTrack),
        indexStatus: status.indexStatus,
        activeGeneration: status.activeGeneration,
    };
}
function findMusicCatalogTrackByFilename(filenameValue) {
    const filename = cleanFilename(filenameValue);
    const generation = (0, music_persistence_1.activeMusicCatalogGeneration)();
    if (!generation)
        return null;
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare(`
    SELECT * FROM music_catalog_tracks_v4
    WHERE generation=? AND filename=?
    LIMIT 1
  `).get(generation, filename);
    return row ? { ...rowToTrack(row), indexGeneration: generation } : null;
}
async function ensureMusicCatalogTrackReady(filenameValue, reason = "file_change") {
    const { filename } = resolveSafeMusicFile(filenameValue);
    let lastTrack = null;
    // A build started before the file commit can finish without containing it.
    // A second generation closes that race deterministically.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        await startMusicCatalogRescan(`${reason}_${attempt + 1}`);
        lastTrack = findMusicCatalogTrackByFilename(filename);
        if (lastTrack?.state === "ready")
            return lastTrack;
    }
    if (lastTrack?.state === "failed") {
        throw new Error(`歌曲已下载，但曲库校验失败：${lastTrack.error || filename}`);
    }
    throw new Error(`歌曲已下载，但未能提交到本地曲库索引：${filename}`);
}
async function ensureMusicCatalogTrackRemoved(filenameValue, reason = "file_delete") {
    const filename = cleanFilename(filenameValue);
    for (let attempt = 0; attempt < 2; attempt += 1) {
        await startMusicCatalogRescan(`${reason}_${attempt + 1}`);
        if (!findMusicCatalogTrackByFilename(filename)) {
            const status = (0, music_persistence_1.getMusicCatalogStatus)();
            return {
                filename,
                activeGeneration: status.activeGeneration,
                indexStatus: status.indexStatus,
            };
        }
    }
    throw new Error(`歌曲文件已删除，但未能从本地曲库索引移除：${filename}`);
}
function musicCatalogFileDiagnostics(trackId) {
    const generation = (0, music_persistence_1.activeMusicCatalogGeneration)();
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare(`
    SELECT * FROM music_catalog_tracks_v4 WHERE generation=? AND track_id=?
  `).get(generation, trackId);
    if (!row)
        return null;
    return {
        track: rowToTrack(row),
        generation,
        safePathVerified: row.state === "ready",
        checksumVerified: !!row.file_checksum,
        probeState: row.state,
        probeError: row.error || "",
    };
}
function assertSafeId3Allocation(filePath) {
    const stat = fs.statSync(filePath);
    if (stat.size < 10)
        throw new Error("音频文件过小");
    const fd = fs.openSync(filePath, "r");
    try {
        const header = Buffer.alloc(10);
        fs.readSync(fd, header, 0, 10, 0);
        if (header.toString("ascii", 0, 3) !== "ID3")
            return { tagSize: 0, maxCoverBytes: MAX_COVER_BYTES };
        const tagSize = (header[6] << 21) | (header[7] << 14) | (header[8] << 7) | header[9];
        if (tagSize < 0 || tagSize > MAX_ID3_TAG_BYTES || tagSize + 10 > stat.size)
            throw new Error("ID3标签大小无效");
        return { tagSize, maxCoverBytes: MAX_COVER_BYTES };
    }
    finally {
        fs.closeSync(fd);
    }
}
exports.MUSIC_MEDIA_LIMITS = {
    maxId3TagBytes: MAX_ID3_TAG_BYTES,
    maxCoverBytes: MAX_COVER_BYTES,
};
//# sourceMappingURL=music-catalog.js.map