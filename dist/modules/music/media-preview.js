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
exports.stopMusicPreview = stopMusicPreview;
exports.previewStatus = previewStatus;
exports.createMusicPreview = createMusicPreview;
exports.handlePreviewRead = handlePreviewRead;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const media_detail_1 = require("./media-detail");
const stream_playback_sessions_1 = require("./stream-playback-sessions");
const netease_mv_1 = require("./netease-mv");
const video_playback_jobs_1 = require("./video-playback-jobs");
const hls_publication_1 = require("./hls-publication");
const media_errors_1 = require("./media-errors");
const root = path.resolve(utils_1.CCM_DIR, 'media', 'previews');
const rows = new Map();
function directory(id) {
    if (!/^mp_[a-f0-9-]{36}$/.test(id))
        throw new Error('无效预览');
    const target = path.resolve(root, id);
    for (let p = target; p !== path.dirname(p); p = path.dirname(p))
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink())
            throw new Error('预览目录不可使用符号链接或联接');
    return target;
}
function clean(id) { fs.rmSync(directory(id), { recursive: true, force: true }); }
function stopMusicPreview(id) { const row = rows.get(id); if (!row)
    return; rows.delete(id); row.cancelled = true; row.controller.abort(); if (!row.running)
    clean(id); }
function sweep() {
    for (const [id, row] of rows)
        if (Date.now() > row.expiresAt)
            stopMusicPreview(id);
    // 重启遗留预览只按受管 UUID 目录及过期时间清理，不触碰正式视频缓存。
    if (fs.existsSync(root) && !fs.lstatSync(root).isSymbolicLink())
        for (const id of fs.readdirSync(root)) {
            if (!/^mp_[a-f0-9-]{36}$/.test(id) || rows.has(id))
                continue;
            try {
                const dir = directory(id);
                if (Date.now() - fs.statSync(dir).mtimeMs > 600000)
                    clean(id);
            }
            catch { }
        }
}
const expiry = setInterval(() => { try {
    sweep();
}
catch { } }, 60000);
expiry.unref();
function previewStatus(id) { const row = rows.get(id); if (!row || row.cancelled || Date.now() > row.expiresAt)
    throw new Error('预览已关闭或过期，请重新预览'); return { id, status: row.status, mediaKind: row.kind, limitSeconds: 30, bufferedDuration: row.buffered || 0, error: row.error || '', errorKind: row.errorKind, manifestUrl: fs.existsSync(path.join(directory(id), 'manifest.m3u8')) ? `/api/music/media/previews/${id}/manifest.m3u8` : null }; }
function createMusicPreview(body) {
    const identity = (0, media_detail_1.detailIdentity)(body);
    sweep();
    if (rows.size >= 4)
        throw new Error('预览数量已达上限，请关闭其他预览后重试');
    const kind = body.mediaKind || (identity.source === 'netease' || identity.source === 'local' ? 'audio' : 'video');
    const id = `mp_${(0, crypto_1.randomUUID)()}`, row = { id, kind, status: 'preparing', controller: new AbortController(), running: true, cancelled: false, expiresAt: Date.now() + 300000 };
    rows.set(id, row);
    void prepare(row, identity, body);
    return previewStatus(id);
}
async function prepare(row, identity, body) {
    let timer, timeout;
    try {
        timeout = setTimeout(() => row.controller.abort(), 90000);
        timeout.unref();
        const knownId = identity.source === 'netease' && row.kind === 'video' ? ((0, netease_mv_1.cachedNeteaseMv)(identity.sourceId) ? (0, netease_mv_1.neteaseVideoIdentity)(identity.sourceId) : null) : identity.sourceId;
        const cached = knownId && (0, video_playback_jobs_1.findCachedMusicVideo)(identity.source, knownId);
        const detail = cached ? { videoAvailable: true } : await (0, media_detail_1.readMusicDetail)(body);
        if (row.controller.signal.aborted)
            throw new Error('预览已取消');
        if (row.kind === 'video' && !detail.videoAvailable)
            throw Object.assign(new Error('此歌曲暂无关联视频 / MV'), { category: 'unsupported_stream' });
        const input = await (0, stream_playback_sessions_1.resolveStreamMediaInput)({ ...identity, sourceId: identity.source === 'netease' && row.kind === 'video' ? (0, netease_mv_1.neteaseVideoIdentity)(identity.sourceId) : identity.sourceId, mediaKind: row.kind, trackId: identity.track?.trackId, filename: identity.track?.filename }, row.controller.signal);
        if (row.controller.signal.aborted)
            throw new Error('预览已取消');
        const dir = directory(row.id);
        fs.mkdirSync(dir, { recursive: true });
        const publication = (0, hls_publication_1.createHlsPublication)(dir), args = (0, hls_publication_1.hlsEncodingArgs)(row.kind, input, publication);
        args.splice(args.indexOf('-hls_time') - 2, 0, '-t', '30');
        const vf = args.indexOf('-vf');
        if (vf >= 0)
            args[vf + 1] = 'scale=min(960\\,iw):-2';
        const child = (0, child_process_1.spawn)('ffmpeg', args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', b => { stderr = (stderr + b.toString()).slice(-2000); });
        const abort = () => child.kill();
        row.controller.signal.addEventListener('abort', abort, { once: true });
        let publicationError;
        timer = setInterval(() => { try {
            const p = publication.publish();
            row.buffered = p.duration;
            if (p.duration > 0)
                row.status = 'ready';
        }
        catch (e) {
            publicationError = e;
            child.kill();
        } }, 500);
        const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
        row.controller.signal.removeEventListener('abort', abort);
        clearInterval(timer);
        if (row.controller.signal.aborted)
            throw new Error('预览已取消或超时');
        if (publicationError)
            throw Object.assign(publicationError, { category: 'disk_error' });
        if (code !== 0)
            throw Object.assign(new Error(stderr || '预览转码失败'), { category: 'transcode_error' });
        const p = publication.publish(true);
        if (!p.duration)
            throw new Error('预览内容为空');
        row.buffered = p.duration;
        row.status = 'completed';
        // 预览到此结束：不调用正式任务、音轨提取、曲库索引或播放队列。
    }
    catch (e) {
        row.status = 'failed';
        row.error = (0, media_errors_1.publicMediaError)(e);
        row.errorKind = e?.category || 'preview_failed';
    }
    finally {
        clearInterval(timer);
        clearTimeout(timeout);
        row.running = false;
        if (row.cancelled)
            try {
                clean(row.id);
            }
            catch { /* 安全检查失败时不删除路径 */ }
    }
}
function handlePreviewRead(pathname, req, res) {
    const m = /^\/api\/music\/media\/previews\/(mp_[a-f0-9-]{36})(?:\/(manifest\.m3u8|segments\/([^/]+)))?$/.exec(pathname);
    if (!m)
        return false;
    try {
        const id = m[1];
        if (req.method === 'DELETE' && !m[2]) {
            stopMusicPreview(id);
            (0, utils_1.sendJson)(res, { success: true });
            return true;
        }
        if (req.method !== 'GET')
            throw new Error('不支持的预览操作');
        const status = previewStatus(id);
        if (!m[2]) {
            (0, utils_1.sendJson)(res, { success: true, preview: status });
            return true;
        }
        if (m[2] === 'manifest.m3u8') {
            const base = `/api/music/media/previews/${id}/segments/`;
            const media = (n) => { if (!(0, hls_publication_1.isHlsMediaName)(n))
                throw new Error('无效预览分片'); return base + n; };
            const text = fs.readFileSync(path.join(directory(id), 'manifest.m3u8'), 'utf8').replace(/URI="([^"]+)"/g, (_m, n) => `URI="${media(n)}"`).replace(/^[^#\r\n][^\r\n]*$/gm, media);
            res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' });
            res.end(text);
        }
        else {
            if (!(0, hls_publication_1.isHlsMediaName)(m[3]))
                throw new Error('无效预览分片');
            const file = path.join(directory(id), m[3]), stat = fs.lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink())
                throw new Error('无效预览文件');
            res.writeHead(200, { 'Content-Type': m[3].endsWith('init.mp4') ? 'video/mp4' : 'video/iso.segment', 'Content-Length': stat.size, 'Cache-Control': 'private, max-age=60' });
            const stream = fs.createReadStream(file);
            res.on('close', () => stream.destroy());
            stream.on('error', () => res.destroy());
            stream.pipe(res);
        }
    }
    catch {
        (0, utils_1.sendJson)(res, { success: false, error: '预览尚未就绪、已过期或不可读取' }, 404);
    }
    return true;
}
//# sourceMappingURL=media-preview.js.map