"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadedVideoLibrary = downloadedVideoLibrary;
const video_playback_jobs_1 = require("../video-playback-jobs");
const workspace_catalog_1 = require("../folia/workspace-catalog");
const presentation_1 = require("./presentation");
// 本地集合以已完成且有真实视频文件的下载索引为准；音频来源关联只用于补充显示资料。
function downloadedVideoLibrary(owner) {
    const ready = (0, video_playback_jobs_1.listMusicVideoJobs)().filter(job => ['bilibili', 'douyin'].includes(job.source) && job.status === 'done' && !!job.streamUrl);
    if (!ready.length)
        return [];
    const metadata = new Map((0, workspace_catalog_1.queryWorkspaceCatalog)('video').map(row => [`${row.media?.source || row.source}:${row.media?.sourceId || row.sourceId}`, row]));
    const items = new Map();
    for (const job of ready) {
        const key = `${job.source}:${job.sourceId}`;
        if (items.has(key))
            continue;
        const extra = metadata.get(key) || {};
        items.set(key, { ...(0, presentation_1.presentVideo)(owner, job.source, { ...extra, sourceId: job.sourceId, videoJobId: job.id,
                title: job.title, author: job.artist || extra.artist, duration: job.durationSeconds, requiresAuth: job.requiresAuth }), cacheKind: 'downloaded-video' });
    }
    return [...items.values()];
}
//# sourceMappingURL=local-library.js.map