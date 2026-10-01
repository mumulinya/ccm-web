"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMusicVideoApi = handleMusicVideoApi;
const utils_1 = require("../../core/utils");
const video_playback_jobs_1 = require("./video-playback-jobs");
const video_stream_1 = require("./video-stream");
const media_interactions_1 = require("./media-interactions");
function handleMusicVideoApi(pathname, req, res) {
    if (!pathname.startsWith('/api/music/video-jobs'))
        return false;
    const match = /^\/api\/music\/video-jobs\/(mv_[a-f\d-]{36})(?:\/(stream|cancel|retry))?$/.exec(pathname);
    const error = (e, code = 400) => (0, utils_1.sendJson)(res, { success: false, error: e?.message || '视频请求失败' }, code);
    if (pathname === '/api/music/video-jobs' && req.method === 'POST') {
        let body = '', rejected = false;
        req.on('data', chunk => { body += chunk.toString(); if (Buffer.byteLength(body) > 16_384) {
            rejected = true;
            req.destroy();
        } });
        req.on('end', async () => {
            if (rejected)
                return;
            try {
                const data = JSON.parse(body);
                if (Object.keys(data).some(key => !['source', 'downloadToken', 'trackId', 'videoJobId'].includes(key)))
                    throw new Error('视频准备不接受自定义路径或媒体地址');
                if (data.videoJobId && (data.source || data.downloadToken || data.trackId))
                    throw new Error('缓存任务与来源参数不能同时指定');
                await (0, media_interactions_1.ensureNeteaseRequest)({ ...data, mediaKind: 'video' });
                const job = data.videoJobId ? (0, video_playback_jobs_1.prepareExistingVideoJob)(data.videoJobId) : (0, video_playback_jobs_1.createMusicVideoJob)(data.source, data.downloadToken, data.trackId);
                (0, utils_1.sendJson)(res, { success: true, job }, 202);
            }
            catch (e) {
                error(e);
            }
        });
        req.on('error', () => { });
        return true;
    }
    try {
        if (pathname === '/api/music/video-jobs' && req.method === 'GET')
            (0, utils_1.sendJson)(res, { success: true, jobs: (0, video_playback_jobs_1.listMusicVideoJobs)() });
        else if (match?.[2] === 'stream' && ['GET', 'HEAD'].includes(req.method))
            (0, video_stream_1.streamMusicVideo)(req, res, (0, video_playback_jobs_1.resolveMusicVideoFile)(match[1]));
        else if (match && !match[2] && req.method === 'GET')
            (0, utils_1.sendJson)(res, { success: true, job: (0, video_playback_jobs_1.getMusicVideoJob)(match[1]) });
        else if (match && !match[2] && req.method === 'DELETE')
            (0, utils_1.sendJson)(res, { success: true, job: (0, video_playback_jobs_1.controlMusicVideoJob)(match[1], 'remove') });
        else if (match && ['cancel', 'retry'].includes(match[2]) && req.method === 'POST')
            (0, utils_1.sendJson)(res, { success: true, job: (0, video_playback_jobs_1.controlMusicVideoJob)(match[1], match[2]) });
        else
            (0, utils_1.sendJson)(res, { success: false, error: '视频接口不存在' }, 404);
    }
    catch (e) {
        error(e, match?.[2] === 'stream' ? 404 : 400);
    }
    return true;
}
//# sourceMappingURL=video-playback-api.js.map