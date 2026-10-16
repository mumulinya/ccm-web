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
exports.douyinVideoAssetId = douyinVideoAssetId;
exports.getDouyinVideoAsset = getDouyinVideoAsset;
exports.ensureDouyinVideoAsset = ensureDouyinVideoAsset;
exports.ensureDouyinAudioAsset = ensureDouyinAudioAsset;
exports.cancelDouyinVideoAsset = cancelDouyinVideoAsset;
exports.douyinVideoFile = douyinVideoFile;
exports.getDouyinVideoAssetById = getDouyinVideoAssetById;
exports.douyinVideoFileByAssetId = douyinVideoFileByAssetId;
exports.listDouyinVideoAssets = listDouyinVideoAssets;
const douyin_asset_store_1 = require("./video/douyin-asset-store");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const utils_1 = require("../../core/utils");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const douyin_1 = require("./douyin");
const accounts_store_1 = require("./video/accounts-store");
const douyin_browser_media_1 = require("./video/douyin-browser-media");
const materialize_video_1 = require("./video/materialize-video");
const douyin_asset_store_2 = require("./video/douyin-asset-store");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const ASSET_ROOT = path.resolve(utils_1.CCM_DIR, 'media', 'douyin', 'assets');
function assetRoot() { return (0, douyin_asset_store_1.douyinOwnerDirectory)() ? path.join(ASSET_ROOT, (0, douyin_asset_store_1.douyinOwnerDirectory)()) : ASSET_ROOT; }
const active = new Map();
const controllers = new Map();
function now() { return new Date().toISOString(); }
function mediaKey(sourceId, kind) { return (0, douyin_asset_store_1.douyinOwnerDirectory)() ? `douyin:${(0, douyin_asset_store_1.douyinOwnerDirectory)()}:${String(sourceId)}:${kind}` : `douyin:${String(sourceId)}:${kind}`; }
function key(sourceId) { return mediaKey(sourceId, 'video'); }
function idFor(sourceId) { return `dy_asset_${crypto.createHash('sha256').update(key(sourceId)).digest('hex').slice(0, 24)}`; }
function douyinVideoAssetId(sourceId) { return idFor(assertId(sourceId)); }
function operationId(sourceId) { return `dy_op_${crypto.createHash('sha256').update(`${key(sourceId)}:download`).digest('hex').slice(0, 24)}`; }
function cleanError(error) {
    return String(error?.message || error || '抖音视频下载失败')
        .replace(/https?:\/\/\S+/g, '[媒体地址]')
        .replace(/[A-Za-z]:[\\/][^\r\n"'<>]*/g, '[受管路径]')
        .slice(0, 600);
}
function assertId(sourceId) {
    const id = String(sourceId || '').trim();
    if (!/^\d{10,24}$/.test(id))
        throw new Error('抖音视频 ID 无效');
    return id;
}
function assetFile(sourceId) {
    const target = path.resolve(assetRoot(), `${assertId(sourceId)}.mp4`);
    if (!target.startsWith(`${assetRoot()}${path.sep}`))
        throw new Error('抖音视频路径不安全');
    return target;
}
function tempFile(sourceId, opId) {
    const dir = path.resolve(assetRoot(), 'staging', opId);
    if (!dir.startsWith(`${assetRoot()}${path.sep}`))
        throw new Error('抖音临时路径不安全');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${assertId(sourceId)}.part.mp4`);
}
function publicAsset(row, operationIdValue = '') {
    if (!row)
        return null;
    let metadata = {};
    try {
        metadata = row.metadata_json ? JSON.parse(row.metadata_json) : (row.metadata || {});
    }
    catch {
        metadata = {};
    }
    return {
        assetId: String(row.asset_id || row.assetId), source: 'douyin', sourceId: String(row.source_id || row.sourceId),
        kind: ['video', 'audio', 'transcript'].includes(String(row.kind)) ? String(row.kind) : 'video',
        status: ['queued', 'resolving', 'downloading', 'validating', 'ready', 'failed', 'cancelled', 'interrupted'].includes(String(row.status))
            ? String(row.status) : 'failed',
        filePath: String(row.file_path || row.filePath || ''), fileChecksum: String(row.file_checksum || row.fileChecksum || ''),
        fileSize: Number(row.file_size || row.fileSize || 0), durationSeconds: Number(row.duration_seconds || row.durationSeconds || 0),
        format: String(row.format || ''), resolver: String(row.resolver || ''), title: metadata.title || row.title || '',
        error: String(row.error || ''), operationId: operationIdValue || row.operation_id || undefined,
    };
}
function asVideoAsset(value) {
    return value?.kind === 'video' ? value : null;
}
function checksum(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(file);
        stream.on('data', chunk => hash.update(chunk));
        stream.once('error', reject);
        stream.once('end', () => resolve(hash.digest('hex')));
    });
}
async function probe(file) {
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
    const value = JSON.parse(stdout);
    const video = Array.isArray(value.streams) ? value.streams.find((item) => item.codec_type === 'video') : null;
    if (!video || !fs.existsSync(file) || fs.statSync(file).size < 1024)
        throw new Error('抖音下载结果不是有效视频文件');
    return { duration: Number(value.format?.duration || video.duration || 0), format: String(value.format?.format_name || 'mp4').split(',')[0] || 'mp4' };
}
async function probeAudio(file) {
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
    const value = JSON.parse(stdout);
    const audio = Array.isArray(value.streams) ? value.streams.find((item) => item.codec_type === 'audio') : null;
    if (!audio || !fs.existsSync(file) || fs.statSync(file).size < 256)
        throw new Error('抖音下载结果没有有效音频轨道');
    return { duration: Number(value.format?.duration || audio.duration || 0), format: String(value.format?.format_name || 'mp3').split(',')[0] || 'mp3' };
}
function remove(file) { try {
    if (file && fs.existsSync(file))
        fs.rmSync(file, { force: true, recursive: false });
}
catch { } }
function removeDir(dir) { try {
    if (dir && fs.existsSync(dir))
        fs.rmSync(dir, { force: true, recursive: true });
}
catch { } }
async function materialize(sourceId, opId, signal) {
    const id = assertId(sourceId);
    const target = assetFile(id);
    const temp = tempFile(id, opId);
    const stagingDir = path.dirname(temp);
    const assetId = idFor(id);
    let resolver = 'mcp';
    let stagedInput = '';
    let alternatives = [];
    let remoteHeaders = {};
    try {
        const previous = (0, douyin_asset_store_2.findActiveDouyinOperation)(id, 'video');
        if (previous?.temp_path && fs.existsSync(previous.temp_path) && fs.statSync(previous.temp_path).size > 1024) {
            try {
                const meta = await probe(previous.temp_path);
                const fileChecksum = await checksum(previous.temp_path);
                fs.mkdirSync(path.dirname(target), { recursive: true });
                remove(target);
                fs.renameSync(previous.temp_path, target);
                const row = (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'video', status: 'ready', filePath: target, fileChecksum, fileSize: fs.statSync(target).size, durationSeconds: meta.duration, format: meta.format, resolver: previous.resolver || 'recovered', metadata: {} });
                (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status: 'ready', resolver: previous.resolver || 'recovered', checkpoint: 'ready', tempPath: '', assetId });
                return asVideoAsset(publicAsset(row, opId));
            }
            catch {
                remove(previous.temp_path);
            }
        }
        (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status: 'resolving', resolver, checkpoint: 'resolving', tempPath: temp, assetId });
        (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'video', status: 'resolving', filePath: target, resolver, metadata: {} });
        if (signal?.aborted)
            throw new Error('抖音视频下载已取消');
        try {
            if ((0, accounts_store_1.videoAccount)((0, accounts_store_1.videoOwner)(), 'douyin').status === 'authenticated') {
                const result = await (0, douyin_browser_media_1.resolveDouyinBrowserMedia)(id, signal);
                resolver = 'official-browser';
                stagedInput = result.url;
                alternatives = result.urls.slice(1);
                remoteHeaders = result.headers;
            }
            else {
                const result = await (0, douyin_mcp_bridge_1.douyinMcpDownloadVideo)(id, `coordinator/${opId}`, { signal });
                stagedInput = String(result?.file_path || result?.filePath || '');
                if (!(0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(stagedInput) || !fs.existsSync(stagedInput))
                    throw new Error('MCP 未返回有效视频文件');
            }
        }
        catch (mcpError) {
            if (signal?.aborted)
                throw mcpError;
            // 已登录的新视频链路直接报告官网结果，不再落到旧解析器反复请求登录。
            if ((0, accounts_store_1.videoAccount)((0, accounts_store_1.videoOwner)(), 'douyin').status === 'authenticated')
                throw mcpError;
            if (["login_required", "risk_controlled"].includes(String(mcpError?.douyinState || "")))
                throw mcpError;
            resolver = 'yt-dlp';
            const resolved = await (0, douyin_1.resolveDouyinMediaInput)(id, { signal });
            if (!resolved?.url)
                throw mcpError;
            stagedInput = resolved.url;
            remoteHeaders = resolved.headers || {};
        }
        if (signal?.aborted)
            throw new Error('抖音视频下载已取消');
        (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status: 'downloading', resolver, checkpoint: 'downloading', tempPath: temp, assetId });
        for (let attempt = 0;; attempt++) {
            try {
                await (0, materialize_video_1.materializeBrowserVideo)(stagedInput, temp, remoteHeaders, signal);
                break;
            }
            catch (error) {
                if (signal?.aborted || attempt >= 1 || !alternatives.length)
                    throw error;
                remove(temp);
                stagedInput = alternatives.shift();
            }
        }
        (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status: 'validating', resolver, checkpoint: 'validating', tempPath: temp, assetId });
        const meta = await probe(temp);
        const fileChecksum = await checksum(temp);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        remove(target);
        fs.renameSync(temp, target);
        const row = (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'video', status: 'ready', filePath: target, fileChecksum, fileSize: fs.statSync(target).size, durationSeconds: meta.duration, format: meta.format, resolver, metadata: {} });
        (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status: 'ready', resolver, checkpoint: 'ready', tempPath: '', assetId });
        return asVideoAsset(publicAsset(row, opId));
    }
    catch (error) {
        (0, douyin_browser_media_1.clearDouyinMediaHints)((0, accounts_store_1.videoOwner)(), id);
        remove(temp);
        const cancelled = Boolean(signal?.aborted);
        const status = cancelled ? 'cancelled' : 'failed';
        (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'video', status, filePath: target, resolver, error: cleanError(error), metadata: {} });
        (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'video', status, resolver, checkpoint: status, tempPath: '', assetId, error: cleanError(error) });
        throw error;
    }
    finally {
        if (stagedInput && !/^https?:\/\//i.test(stagedInput) && (0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(stagedInput))
            remove(stagedInput);
        removeDir(stagingDir);
    }
}
function getDouyinVideoAsset(sourceId) {
    const id = assertId(sourceId);
    const row = (0, douyin_asset_store_2.getDouyinAsset)(id, 'video');
    if (!row || row.status !== 'ready' || !row.file_path || !fs.existsSync(row.file_path))
        return null;
    if (!validVideoAssetFile(id, row.file_path))
        return null;
    return asVideoAsset(publicAsset(row));
}
// 索引资产使用独立的 assets/<owner> 目录；不能误用 MCP 临时下载目录的校验器。
function validVideoAssetFile(sourceId, file) {
    try {
        if (path.resolve(file) !== assetFile(sourceId))
            return false;
        for (let current = path.resolve(file); current !== path.dirname(current); current = path.dirname(current))
            if (fs.lstatSync(current).isSymbolicLink())
                return false;
        const stat = fs.statSync(file);
        return stat.isFile() && stat.size >= 1024;
    }
    catch {
        return false;
    }
}
async function ensureDouyinVideoAsset(sourceId, options = {}) {
    const id = assertId(sourceId);
    const cached = getDouyinVideoAsset(id);
    if (cached)
        return cached;
    const running = active.get(key(id));
    if (running)
        return running;
    const previous = (0, douyin_asset_store_2.findActiveDouyinOperation)(id, 'video');
    const opId = String(previous?.operation_id || operationId(id));
    const controller = options.signal ? null : new AbortController();
    const signal = options.signal || controller?.signal;
    const promise = materialize(id, opId, signal).finally(() => { active.delete(key(id)); controllers.delete(key(id)); });
    active.set(key(id), promise);
    if (controller)
        controllers.set(key(id), controller);
    return promise;
}
async function ensureDouyinAudioAsset(sourceId, options = {}) {
    const id = assertId(sourceId);
    const cached = (0, douyin_asset_store_2.getDouyinAsset)(id, 'audio');
    if (cached?.status === 'ready' && cached.file_path && fs.existsSync(cached.file_path))
        return { ...publicAsset({ ...cached, kind: 'audio' }), audioPath: cached.file_path };
    const activeKey = mediaKey(id, 'audio');
    const running = active.get(activeKey);
    if (running)
        return running;
    const video = await ensureDouyinVideoAsset(id, options);
    const opId = `dy_op_${crypto.createHash('sha256').update(`${activeKey}:extract`).digest('hex').slice(0, 24)}`;
    const assetId = `dy_audio_${crypto.createHash('sha256').update(activeKey).digest('hex').slice(0, 24)}`;
    const target = path.resolve(assetRoot(), `${id}.mp3`);
    const temp = path.resolve(assetRoot(), 'staging', opId, `${id}.part.mp3`);
    fs.mkdirSync(path.dirname(temp), { recursive: true });
    const controller = options.signal ? null : new AbortController();
    const signal = options.signal || controller?.signal;
    const promise = (async () => {
        try {
            (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'audio', status: 'downloading', resolver: 'local-video', checkpoint: 'extracting', tempPath: temp, assetId });
            await execFileAsync('ffmpeg', ['-nostdin', '-y', '-i', video.filePath, '-map', '0:a:0', '-vn', '-b:a', '192k', '-f', 'mp3', temp], { windowsHide: true, timeout: 30 * 60_000, maxBuffer: 2 * 1024 * 1024, signal });
            const meta = await probeAudio(temp);
            const fileChecksum = await checksum(temp);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            remove(target);
            fs.renameSync(temp, target);
            const row = (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'audio', status: 'ready', filePath: target, fileChecksum, fileSize: fs.statSync(target).size, durationSeconds: meta.duration, format: meta.format, resolver: 'local-video', metadata: {} });
            (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'audio', status: 'ready', resolver: 'local-video', checkpoint: 'ready', tempPath: '', assetId });
            return { ...publicAsset({ ...row, kind: 'audio' }), audioPath: target };
        }
        catch (error) {
            remove(temp);
            (0, douyin_asset_store_2.upsertDouyinAsset)({ assetId, sourceId: id, kind: 'audio', status: 'failed', filePath: target, resolver: 'local-video', error: cleanError(error), metadata: {} });
            (0, douyin_asset_store_2.upsertDouyinOperation)({ operationId: opId, sourceId: id, kind: 'audio', status: 'failed', resolver: 'local-video', checkpoint: 'failed', tempPath: '', assetId, error: cleanError(error) });
            throw error;
        }
        finally {
            remove(temp);
            removeDir(path.dirname(temp));
        }
    })().finally(() => { active.delete(activeKey); if (controller)
        controllers.delete(activeKey); });
    active.set(activeKey, promise);
    if (controller)
        controllers.set(activeKey, controller);
    return promise;
}
function cancelDouyinVideoAsset(sourceId) {
    const id = assertId(sourceId);
    controllers.get(key(id))?.abort();
    const row = (0, douyin_asset_store_2.getDouyinAsset)(id, 'video');
    if (!row)
        return null;
    if (!['ready', 'failed', 'cancelled'].includes(String(row.status))) {
        const metadata = (() => { try {
            return JSON.parse(row.metadata_json || '{}');
        }
        catch {
            return {};
        } })();
        const updated = (0, douyin_asset_store_2.upsertDouyinAsset)({
            assetId: row.asset_id, sourceId: id, kind: 'video', status: 'cancelled',
            filePath: row.file_path || '', fileChecksum: row.file_checksum || '', fileSize: row.file_size || 0,
            durationSeconds: row.duration_seconds || 0, format: row.format || '', resolver: row.resolver || '', metadata,
            error: '抖音视频操作已取消',
        });
        const operation = (0, douyin_asset_store_2.findActiveDouyinOperation)(id, 'video');
        if (operation)
            (0, douyin_asset_store_2.upsertDouyinOperation)({
                operationId: operation.operation_id, sourceId: id, kind: 'video', status: 'cancelled',
                resolver: operation.resolver || '', checkpoint: 'cancelled', tempPath: '', assetId: row.asset_id, error: '抖音视频操作已取消',
            });
        return asVideoAsset(publicAsset(updated));
    }
    return asVideoAsset(publicAsset(row));
}
function douyinVideoFile(sourceId) {
    const asset = getDouyinVideoAsset(sourceId);
    if (!asset)
        throw new Error('抖音本地视频尚未就绪');
    return asset.filePath;
}
function getDouyinVideoAssetById(assetId) {
    const row = (0, douyin_asset_store_2.getDouyinAssetById)(assetId);
    if (!row || row.kind !== 'video')
        return null;
    return asVideoAsset(publicAsset(row));
}
function douyinVideoFileByAssetId(assetId) {
    const asset = getDouyinVideoAssetById(assetId);
    if (!asset || asset.status !== 'ready' || !validVideoAssetFile(asset.sourceId, asset.filePath))
        throw new Error('抖音本地视频尚未就绪');
    return asset.filePath;
}
function listDouyinVideoAssets(limit = 200) {
    return (0, douyin_asset_store_2.listDouyinAssets)(limit).filter(row => row.kind === 'video').map(row => asVideoAsset(publicAsset(row))).filter(Boolean);
}
//# sourceMappingURL=douyin-media-coordinator.js.map