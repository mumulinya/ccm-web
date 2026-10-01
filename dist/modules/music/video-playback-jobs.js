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
exports.listMusicVideoJobs = listMusicVideoJobs;
exports.getMusicVideoJob = getMusicVideoJob;
exports.findCachedMusicVideo = findCachedMusicVideo;
exports.registerStreamVideoCache = registerStreamVideoCache;
exports.prepareExistingVideoJob = prepareExistingVideoJob;
exports.createMusicVideoJob = createMusicVideoJob;
exports.controlMusicVideoJob = controlMusicVideoJob;
exports.resolveMusicVideoFile = resolveMusicVideoFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const managed_process_tree_1 = require("../../system/managed-process-tree");
const search_results_1 = require("./search-results");
const music_catalog_1 = require("./music-catalog");
const video_audio_projection_1 = require("./video-audio-projection");
const douyin_1 = require("./douyin");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const bilibili_1 = require("./bilibili");
const netease_mv_1 = require("./netease-mv");
const root = path.join(utils_1.CCM_DIR, 'media', 'video-playback');
const store = path.join(utils_1.CCM_DIR, 'music-video-jobs.json');
const jobs = new Map();
const active = new Map();
let loaded = false;
function directory(id) {
    if (!/^mv_[a-f\d-]{36}$/.test(id))
        throw new Error('无效视频任务 ID');
    const target = path.resolve(root, id);
    if (!target.startsWith(path.resolve(root) + path.sep))
        throw new Error('不安全的视频缓存路径');
    for (let p = target; p !== path.dirname(p); p = path.dirname(p)) {
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink())
            throw new Error('视频缓存目录不可使用联接或符号链接');
    }
    return target;
}
function output(job) { return path.join(directory(job.id), 'video.mp4'); }
function ready(job) {
    const file = output(job);
    return fs.existsSync(file) && !fs.lstatSync(file).isSymbolicLink() && fs.statSync(file).isFile() && fs.statSync(file).size > 32;
}
function persist() {
    fs.mkdirSync(path.dirname(store), { recursive: true });
    fs.writeFileSync(`${store}.${process.pid}.tmp`, JSON.stringify([...jobs.values()]), { mode: 0o600 });
    fs.renameSync(`${store}.${process.pid}.tmp`, store);
}
function load() {
    if (loaded)
        return;
    if (fs.existsSync(store)) {
        const rows = JSON.parse(fs.readFileSync(store, 'utf8'));
        if (!Array.isArray(rows))
            throw new Error('视频任务记录损坏');
        for (const job of rows) {
            if (!/^mv_[a-f\d-]{36}$/.test(job?.id) || !['douyin', 'bilibili', 'netease'].includes(job.source))
                continue;
            if (['running', 'queued'].includes(job.status)) {
                job.status = 'failed';
                job.error = '服务已重启，请重试';
                job.phase = '任务中断';
            }
            jobs.set(job.id, job);
        }
    }
    loaded = true;
}
function update(job) { job.updatedAt = new Date().toISOString(); persist(); }
function publicJob(job) { return { ...job, streamUrl: job.status === 'done' && ready(job) ? `/api/music/video-jobs/${job.id}/stream` : null }; }
function sanitize(error) {
    return String(error?.code === 'ENOENT' ? '未找到 FFmpeg，请安装后重试' : error?.message || '视频准备失败')
        .replace(/https?:\/\/\S+/g, '[媒体地址]').replace(/[A-Za-z]:[\\/][^\r\n"'<>]*/g, '[受管路径]').replace(/((?:cookie|token|sessionid)\s*[:=]\s*)[^\s;]+/gi, '$1[redacted]').slice(0, 350);
}
function errorKind(error) {
    return error.category || error.douyinState || (/WinError 123|文件名|路径/.test(error.message) ? 'path_error' : /ENOSPC|EACCES|磁盘/.test(error.message) ? 'disk_error' : error.code === 'ENOENT' ? 'dependency_missing' : 'media_error');
}
function biliUrl(raw) {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !['bilivideo.com', 'bilivideo.cn', 'akamaized.net'].some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)))
        throw new Error('B站未返回受支持的视频地址');
    return url.href;
}
async function prepare(job) {
    const controller = new AbortController();
    active.set(job.id, controller);
    job.status = 'running';
    job.phase = '正在获取原视频';
    job.progress = null;
    update(job);
    let staged = '';
    let partial = '';
    try {
        partial = path.join(directory(job.id), 'partial.mp4');
        fs.mkdirSync(directory(job.id), { recursive: true });
        if (ready(job)) {
            job.phase = '正在关联音乐库';
            update(job);
            job.durationSeconds = (await (0, music_catalog_1.probeMusicFile)(output(job))).durationSeconds;
            if (job.source !== 'netease')
                job.linkedTrack = await (0, video_audio_projection_1.linkVideoAudio)(job, output(job), controller.signal);
            if (!controller.signal.aborted) {
                job.status = 'done';
                job.progress = 100;
                job.phase = '视频与音乐库已就绪';
                job.error = undefined;
            }
            return;
        }
        let args, duration = 0;
        if (job.source === 'douyin') {
            const video = await (0, douyin_1.downloadDouyinVideoForPlayback)(job.sourceId, { signal: controller.signal });
            if (!video?.filePath)
                throw new Error('抖音 MCP 不可用，请到设置检查');
            staged = video.filePath;
            duration = video.durationSeconds;
            args = ['-i', staged, '-map', '0:v:0', '-map', '0:a?'];
        }
        else if (job.source === 'netease') {
            const video = await (0, netease_mv_1.getNeteaseMvInput)(job.sourceId);
            duration = video.duration;
            args = ['-rw_timeout', '30000000', '-headers', 'Referer: https://music.163.com/\r\n', '-i', video.input, '-map', '0:v:0', '-map', '0:a?'];
        }
        else {
            const video = await (0, bilibili_1.getBiliPlaybackStreams)(job.sourceId);
            if (!video.videoUrl || !video.audioUrl)
                throw new Error('该 B站视频暂不支持画面播放');
            duration = video.durationSeconds;
            const headers = `User-Agent: ${bilibili_1.BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`;
            args = ['-rw_timeout', '30000000', '-headers', headers, '-i', biliUrl(video.videoUrl), '-rw_timeout', '30000000', '-headers', headers, '-i', biliUrl(video.audioUrl), '-map', '0:v:0', '-map', '1:a:0'];
        }
        if (controller.signal.aborted)
            return;
        job.phase = '正在缓存画面与声音（首次需要等待）';
        update(job);
        // H.264/AAC MP4 works in the existing browser surface, including vertical videos.
        const child = (0, child_process_1.spawn)('ffmpeg', ['-nostdin', '-y', ...args, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', partial], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        let stderr = '', lastUpdate = 0;
        child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-2500); });
        child.stdout.on('data', chunk => {
            if (controller.signal.aborted)
                return;
            const time = chunk.toString().match(/out_time_us=(\d+)/)?.[1];
            if (time && duration > 0)
                job.progress = Math.min(99, Math.round(Number(time) / 1e6 / duration * 100));
            if (Date.now() - lastUpdate > 1000) {
                lastUpdate = Date.now();
                update(job);
            }
        });
        let timedOut = false;
        const stop = () => { void (0, managed_process_tree_1.terminateManagedProcessTree)(child); };
        const timer = setTimeout(() => { timedOut = true; stop(); }, 30 * 60_000);
        controller.signal.addEventListener('abort', stop, { once: true });
        let code;
        try {
            code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
        }
        finally {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', stop);
        }
        if (controller.signal.aborted)
            return;
        if (timedOut)
            throw new Error('视频缓存超时，请稍后重试');
        if (code !== 0 || !fs.existsSync(partial) || fs.statSync(partial).size < 32)
            throw Object.assign(new Error(stderr || '视频转码失败'), { category: /No space left|Permission denied/i.test(stderr) ? 'disk_error' : 'transcode_error', stage: 'video_transcode' });
        fs.renameSync(partial, output(job));
        job.durationSeconds = (await (0, music_catalog_1.probeMusicFile)(output(job))).durationSeconds;
        job.phase = '正在建立音频与曲库关联';
        update(job);
        if (job.source !== 'netease')
            job.linkedTrack = await (0, video_audio_projection_1.linkVideoAudio)(job, output(job), controller.signal);
        if (controller.signal.aborted)
            return;
        job.status = 'done';
        job.phase = '视频已缓存，可播放画面与声音';
        job.progress = 100;
        job.error = undefined;
    }
    catch (error) {
        if (!controller.signal.aborted) {
            job.failedStage = error.stage || job.phase;
            job.errorKind = errorKind(error);
            job.systemCode = error.systemCode;
            job.status = 'failed';
            job.phase = '视频准备失败';
            job.error = sanitize(error);
            console.warn('[MusicVideo]', JSON.stringify({ taskId: job.id, stage: job.failedStage, errorKind: job.errorKind, systemCode: job.systemCode }));
        }
    }
    finally {
        if (staged && (0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(staged)) {
            try {
                fs.unlinkSync(staged);
            }
            catch { }
        }
        try {
            if (fs.existsSync(partial))
                fs.unlinkSync(partial);
        }
        catch { }
        active.delete(job.id);
        update(job);
        pump();
    }
}
function pump() { if (!active.size) {
    const next = [...jobs.values()].find(j => j.status === 'queued');
    if (next)
        void prepare(next);
} }
function listMusicVideoJobs() { load(); return [...jobs.values()].reverse().map(publicJob); }
function getMusicVideoJob(id) { load(); const job = jobs.get(id); if (!job)
    throw new Error('视频任务不存在'); return publicJob(job); }
/** Identity lookup is shared by search, library playback and HLS completion. No download. */
function findCachedMusicVideo(source, sourceId) {
    load();
    const job = [...jobs.values()].find(j => j.source === source && j.sourceId === sourceId && j.status === 'done' && ready(j));
    return job ? publicJob(job) : null;
}
/** Adopt a completed stream output into the existing durable video index, without transcoding. */
function registerStreamVideoCache(session) {
    load();
    if (!/^ms_[a-f\d-]{36}$/.test(session.sessionId) || !['douyin', 'bilibili', 'netease'].includes(session.source))
        throw new Error('无效流式视频来源');
    const existing = findCachedMusicVideo(session.source, session.sourceId);
    if (existing)
        return existing;
    const id = `mv_${session.sessionId.slice(3)}`;
    const targetDir = directory(id);
    const stagingDir = path.join(root, `stream_${session.sessionId}`);
    for (const p of [stagingDir, path.join(stagingDir, 'video.mp4')]) {
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink())
            throw new Error('视频缓存不可使用符号链接');
    }
    const job = { id, source: session.source, sourceId: session.sourceId,
        title: session.title || session.sourceId, artist: session.artist, linkedTrack: session.linkedTrack,
        durationSeconds: session.durationSeconds, status: 'done', phase: '本地视频已缓存', progress: 100,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const staged = path.join(stagingDir, 'video.mp4'), target = output(job);
    // Also recover a rename committed before a server interruption during index persistence.
    if (!ready(job)) {
        if (!fs.existsSync(staged) || !fs.statSync(staged).isFile() || fs.statSync(staged).size <= 32)
            return null;
        fs.mkdirSync(targetDir, { recursive: true });
        fs.renameSync(staged, target);
    }
    jobs.set(id, job);
    persist();
    return publicJob(job);
}
function prepareExistingVideoJob(id) {
    load();
    const job = jobs.get(id);
    if (!job)
        throw new Error('视频任务不存在');
    if (['failed', 'cancelled'].includes(job.status))
        return controlMusicVideoJob(id, 'retry');
    if (job.status === 'done' && (!ready(job) || job.source !== 'netease' && (!job.linkedTrack?.trackId || !(0, music_catalog_1.findMusicCatalogTrackById)(job.linkedTrack.trackId)))) {
        job.status = 'queued';
        job.phase = '正在准备缓存与曲库关联';
        update(job);
        setImmediate(pump);
    }
    return publicJob(job);
}
function createMusicVideoJob(source, token, trackId) {
    load();
    let localTrack = null;
    if (trackId) {
        if (source || token)
            throw new Error('曲库条目与搜索凭证不能同时指定');
        localTrack = (0, music_catalog_1.findMusicCatalogTrackById)(trackId);
        if (!localTrack || localTrack.state !== 'ready' || !localTrack.media?.videoAvailable)
            throw new Error('该曲目没有可靠的原视频关联');
        source = localTrack.media.source;
    }
    if (!['douyin', 'bilibili', 'netease'].includes(source))
        throw new Error('该平台暂不支持视频播放');
    const payload = localTrack ? { sourceId: localTrack.media.sourceId, title: localTrack.title, artist: localTrack.artist } : (0, search_results_1.verifyDownloadToken)(token, source);
    if (source === 'netease')
        payload.sourceId = (0, netease_mv_1.neteaseVideoIdentity)(payload.sourceId);
    if (!(source === 'douyin' ? /^\d{10,24}$/ : source === 'netease' ? /^mv:\d{1,20}$/ : /^BV[\da-zA-Z]{10}$/).test(payload.sourceId))
        throw new Error('视频 ID 无效');
    const old = [...jobs.values()].find(j => j.source === source && j.sourceId === payload.sourceId && (['queued', 'running'].includes(j.status) || j.status === 'done' && ready(j)));
    if (old) {
        if (old.source !== 'netease' && old.status === 'done' && (!old.linkedTrack?.filename || !(0, music_catalog_1.findMusicCatalogTrackById)(old.linkedTrack.trackId))) {
            old.status = 'queued';
            old.phase = '正在补建曲库关联';
            update(old);
            setImmediate(pump);
        }
        return publicJob(old);
    }
    const failed = [...jobs.values()].find(j => j.source === source && j.sourceId === payload.sourceId && ['failed', 'cancelled'].includes(j.status));
    if (failed)
        return prepareExistingVideoJob(failed.id);
    if (jobs.size >= 200 || [...jobs.values()].filter(j => ['queued', 'running'].includes(j.status)).length >= 10)
        throw new Error('视频任务过多，请先清理缓存或稍后再试');
    const timestamp = new Date().toISOString();
    const job = { id: `mv_${crypto.randomUUID()}`, source, sourceId: payload.sourceId, linkedTrack: localTrack, title: payload.title, artist: payload.artist, status: 'queued', phase: '等待缓存视频', progress: null, createdAt: timestamp, updatedAt: timestamp };
    jobs.set(job.id, job);
    persist();
    setImmediate(pump);
    return publicJob(job);
}
function controlMusicVideoJob(id, action) {
    load();
    const job = jobs.get(id);
    if (!job)
        throw new Error('视频任务不存在');
    if (action === 'cancel' && ['queued', 'running'].includes(job.status)) {
        job.status = 'cancelled';
        job.phase = '已取消';
        active.get(id)?.abort();
        update(job);
    }
    if (action === 'retry') {
        if (!['failed', 'cancelled'].includes(job.status) || active.has(id))
            throw new Error('请等待任务停止后重试');
        job.status = 'queued';
        job.phase = '等待重试';
        job.error = undefined;
        job.progress = null;
        update(job);
        setImmediate(pump);
    }
    if (action === 'remove') {
        if (['queued', 'running'].includes(job.status) || active.has(id))
            throw new Error('请先取消并等待任务停止');
        const dir = directory(id);
        if (fs.existsSync(dir))
            fs.rmSync(dir, { recursive: true });
        jobs.delete(id);
        persist();
    }
    return publicJob(job);
}
function resolveMusicVideoFile(id) {
    load();
    const job = jobs.get(id);
    if (!job || job.status !== 'done' || !ready(job))
        throw new Error('视频缓存未就绪或已删除');
    return output(job);
}
//# sourceMappingURL=video-playback-jobs.js.map