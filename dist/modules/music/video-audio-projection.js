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
exports.linkVideoAudio = linkVideoAudio;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const library_1 = require("./library");
const music_persistence_1 = require("./music-persistence");
const music_catalog_1 = require("./music-catalog");
const execute = (0, util_1.promisify)(child_process_1.execFile);
async function linkVideoAudio(job, video, signal) {
    const asset = (0, music_persistence_1.findMusicMediaAsset)(job.source, job.sourceId);
    if (asset?.filename && path.basename(asset.filename) === asset.filename && fs.existsSync(path.join(library_1.MUSIC_DIR, asset.filename))) {
        const track = (0, music_catalog_1.findMusicCatalogTrackByFilename)(asset.filename);
        if (track?.state === 'ready' && (!asset.file_checksum || track.checksum === asset.file_checksum))
            return track;
        if (!track) {
            const restored = await (0, music_catalog_1.ensureMusicCatalogTrackReady)(asset.filename, 'video_existing_audio');
            if (!asset.file_checksum || restored.checksum === asset.file_checksum)
                return restored;
        }
    }
    fs.mkdirSync(library_1.MUSIC_DIR, { recursive: true });
    const safeTitle = String(job.title || job.sourceId).replace(/[\x00-\x1f<>:"/\\|?*]/g, ' ').slice(0, 55).trim().replace(/[. ]+$/g, '') || '视频音频';
    const artist = String(job.artist || (job.source === 'douyin' ? '抖音作者' : 'B站作者')).replace(/[\x00-\x1f<>:"/\\|?*]/g, ' ').slice(0, 30);
    const name = `${artist} - ${safeTitle} [${job.source}-${job.sourceId}] ${crypto.randomUUID().slice(0, 8)}.mp3`;
    const target = path.join(library_1.MUSIC_DIR, name), partial = `${target}.${job.id}.ccm-part`;
    try {
        const probe = await execute('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], { windowsHide: true, timeout: 15000, signal, maxBuffer: 1024 * 1024 });
        const metadata = JSON.parse(probe.stdout);
        const hasAudio = metadata.streams?.some((s) => s.codec_type === 'audio');
        const input = hasAudio ? ['-i', video, '-map', '0:a:0'] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(Math.max(.1, Number(metadata.format?.duration) || 1))];
        await execute('ffmpeg', ['-nostdin', '-y', ...input, '-vn', '-b:a', '192k', '-f', 'mp3', partial], { windowsHide: true, timeout: 30 * 60_000, signal, maxBuffer: 1024 * 1024 });
        if (signal.aborted)
            throw new Error('任务已取消');
        const info = await (0, music_catalog_1.probeMusicFile)(partial);
        const hash = crypto.createHash('sha256');
        for await (const chunk of fs.createReadStream(partial))
            hash.update(chunk);
        if (signal.aborted)
            throw new Error('任务已取消');
        const checksum = hash.digest('hex');
        const identical = (0, music_catalog_1.findMusicCatalogTrackById)(`local_${checksum.slice(0, 24)}`);
        if (identical?.checksum === checksum && identical.state === 'ready' && fs.existsSync(path.join(library_1.MUSIC_DIR, identical.filename))) {
            (0, music_persistence_1.upsertMusicMediaAsset)({ source: job.source, sourceId: job.sourceId, filename: identical.filename, displayName: job.title, actualQuality: 'high', requestedQuality: 'high', fileChecksum: checksum, fileSize: fs.statSync(partial).size });
            return (0, music_catalog_1.findMusicCatalogTrackById)(identical.trackId);
        }
        fs.renameSync(partial, target);
        (0, music_persistence_1.upsertMusicMediaAsset)({ source: job.source, sourceId: job.sourceId, filename: name, displayName: job.title, actualQuality: 'high', requestedQuality: 'high', bitrate: info.bitrate, durationSeconds: info.durationSeconds, format: info.format, sampleRate: info.sampleRate, channels: info.channels, fileChecksum: checksum, fileSize: fs.statSync(target).size });
        return await (0, music_catalog_1.ensureMusicCatalogTrackReady)(name, 'video_audio_projection');
    }
    finally {
        try {
            fs.unlinkSync(partial);
        }
        catch { }
    }
}
//# sourceMappingURL=video-audio-projection.js.map