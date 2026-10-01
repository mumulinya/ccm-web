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
exports.resolveTrackMedia = resolveTrackMedia;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const observability_database_1 = require("../../system/observability-database");
const netease_mv_1 = require("./netease-mv");
let cachedJobs = [], expires = 0;
function videoJobs() {
    if (Date.now() < expires)
        return cachedJobs;
    try {
        const value = JSON.parse(fs.readFileSync(path.join(utils_1.CCM_DIR, 'music-video-jobs.json'), 'utf8'));
        cachedJobs = Array.isArray(value) ? value : [];
    }
    catch {
        cachedJobs = [];
    }
    expires = Date.now() + 1000;
    return cachedJobs;
}
function resolveTrackMedia(row) {
    const candidates = (0, observability_database_1.getObservabilityDatabase)().prepare(`SELECT source,source_id,display_name FROM music_media_assets_v2
    WHERE (file_checksum<>'' AND file_checksum=?) OR (filename=? AND (file_checksum='' OR file_checksum=?))`).all(row.file_checksum || '', row.filename, row.file_checksum || '');
    const identities = new Map(candidates.map(a => [`${a.source}:${a.source_id}`, a]));
    let identity = identities.size === 1 ? [...identities.values()][0] : null;
    if (!identities.size) {
        const dy = String(row.filename).match(/ \[douyin-(\d{10,24})\]\.mp3$/);
        const bili = String(row.filename).match(/ \[(BV[\da-zA-Z]{10})\]\.mp3$/);
        const ids = String(row.filename).match(/\[(?:douyin-\d{10,24}|BV[\da-zA-Z]{10})\]/g) || [];
        if ((dy || bili) && new Set(ids).size === 1)
            identity = { source: dy ? 'douyin' : 'bilibili', source_id: (dy || bili)[1] };
    }
    const source = identity?.source || 'local', sourceId = identity?.source_id || null;
    const mvId = source === 'netease' ? (0, netease_mv_1.cachedNeteaseMv)(sourceId) : null;
    const videoAvailable = source === 'douyin' ? /^\d{10,24}$/.test(sourceId) : source === 'netease' ? !!mvId : source === 'bilibili' && /^BV[\da-zA-Z]{10}$/.test(sourceId);
    const job = videoAvailable && videoJobs().find(j => j.source === source && j.sourceId === (mvId ? `mv:${mvId}` : sourceId) && j.status === 'done' && /^mv_[\da-f-]{36}$/.test(j.id) && fs.existsSync(path.join(utils_1.CCM_DIR, 'media/video-playback', j.id, 'video.mp4')));
    return { source, sourceId, video: mvId ? { source, mediaType: 'mv', mediaId: mvId, timeline: 'independent' } : null, displayName: identity?.display_name || null, videoAvailable: !!videoAvailable, cacheState: job ? 'ready' : videoAvailable ? 'not_cached' : 'audio_only', videoJobId: job?.id || null };
}
//# sourceMappingURL=media-provenance.js.map