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
exports.handleMusicVideoApi = handleMusicVideoApi;
const utils_1 = require("../../core/utils");
const video_playback_jobs_1 = require("./video-playback-jobs");
const video_stream_1 = require("./video-stream");
const media_interactions_1 = require("./media-interactions");
const douyin_media_coordinator_1 = require("./douyin-media-coordinator");
function handleMusicVideoApi(pathname, req, res) {
    if (pathname.startsWith('/api/music/video-assets')) {
        const assetMatch = /^\/api\/music\/video-assets\/([^/]+)(?:\/(file|retry|cancel))?$/.exec(pathname);
        const error = (e, code = 400) => (0, utils_1.sendJson)(res, { success: false, error: e?.message || '视频资产请求失败' }, code);
        if (pathname === '/api/music/video-assets' && req.method === 'POST') {
            let body = '', rejected = false;
            req.on('data', chunk => { body += chunk.toString(); if (Buffer.byteLength(body) > 16_384) {
                rejected = true;
                req.destroy();
            } });
            req.on('end', async () => {
                if (rejected)
                    return;
                try {
                    const data = JSON.parse(body || '{}');
                    if (data.source && data.source !== 'douyin')
                        throw new Error('视频资产接口只接受抖音来源');
                    const job = (0, video_playback_jobs_1.createMusicVideoJob)(data.source || 'douyin', data.downloadToken, data.trackId);
                    if (job.source !== 'douyin')
                        throw new Error('当前任务不是抖音视频');
                    const assetId = (0, douyin_media_coordinator_1.douyinVideoAssetId)(job.sourceId);
                    (0, utils_1.sendJson)(res, { success: true, asset: { assetId, source: 'douyin', sourceId: job.sourceId, status: job.status === 'done' ? 'ready' : 'queued', fileUrl: `/api/music/video-assets/${encodeURIComponent(assetId)}/file` }, job }, 202);
                }
                catch (e) {
                    error(e);
                }
            });
            return true;
        }
        try {
            if (pathname === '/api/music/video-assets' && req.method === 'GET') {
                return (0, utils_1.sendJson)(res, { success: true, assets: (0, douyin_media_coordinator_1.listDouyinVideoAssets)() });
            }
            if (assetMatch && assetMatch[2] === 'file' && ['GET', 'HEAD'].includes(req.method))
                (0, video_stream_1.streamMusicVideo)(req, res, (0, douyin_media_coordinator_1.douyinVideoFileByAssetId)(decodeURIComponent(assetMatch[1])));
            else if (assetMatch && !assetMatch[2] && req.method === 'GET') {
                const asset = (0, douyin_media_coordinator_1.getDouyinVideoAssetById)(decodeURIComponent(assetMatch[1]));
                if (!asset)
                    return (0, utils_1.sendJson)(res, { success: false, error: '视频资产不存在或尚未就绪', code: 'ASSET_NOT_READY' }, 404);
                (0, utils_1.sendJson)(res, { success: true, asset: { ...asset, fileUrl: `/api/music/video-assets/${encodeURIComponent(asset.assetId)}/file` } });
            }
            else if (assetMatch && assetMatch[2] === 'retry' && req.method === 'POST') {
                const asset = (0, douyin_media_coordinator_1.getDouyinVideoAssetById)(decodeURIComponent(assetMatch[1]));
                if (!asset)
                    throw new Error('视频资产不存在');
                void Promise.resolve().then(() => __importStar(require('./douyin-media-coordinator'))).then(({ ensureDouyinVideoAsset }) => ensureDouyinVideoAsset(asset.sourceId).catch(() => { }));
                (0, utils_1.sendJson)(res, { success: true, asset: { ...asset, status: 'queued' } }, 202);
            }
            else if (assetMatch && assetMatch[2] === 'cancel' && req.method === 'POST') {
                const asset = (0, douyin_media_coordinator_1.getDouyinVideoAssetById)(decodeURIComponent(assetMatch[1]));
                if (!asset)
                    throw new Error('视频资产不存在');
                (0, utils_1.sendJson)(res, { success: true, asset: (0, douyin_media_coordinator_1.cancelDouyinVideoAsset)(asset.sourceId) });
            }
            else
                (0, utils_1.sendJson)(res, { success: false, error: '视频资产接口不存在' }, 404);
        }
        catch (e) {
            error(e, assetMatch?.[2] === 'file' ? 404 : 400);
        }
        return true;
    }
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