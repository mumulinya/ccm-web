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
exports.listDouyinMediaJobs = listDouyinMediaJobs;
exports.getDouyinTranscription = getDouyinTranscription;
exports.resolveDouyinJobArtifact = resolveDouyinJobArtifact;
exports.createDouyinMediaJob = createDouyinMediaJob;
exports.controlDouyinMediaJob = controlDouyinMediaJob;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const douyin_contract_1 = require("./douyin-contract");
const douyin_media_coordinator_1 = require("./douyin-media-coordinator");
const filename = path.join(utils_1.CCM_DIR, 'douyin-media-jobs.json');
const records = new Map();
const active = new Map();
let loaded = false;
function load() {
    if (loaded)
        return;
    if (fs.existsSync(filename)) {
        const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
        if (!Array.isArray(saved))
            throw new Error('抖音任务存储损坏，未覆盖记录');
        for (const job of saved) {
            if (!/^dy_[\da-f-]{36}$/.test(job?.id) || !douyin_contract_1.DOUYIN_MEDIA_TOOLS.has(job.tool))
                continue;
            if (['queued', 'running'].includes(job.status)) {
                job.status = 'failed';
                job.phase = '服务重启，任务已中断';
                job.error = '请手动重试；不会自动再次调用付费服务';
            }
            records.set(job.id, job);
        }
    }
    loaded = true;
}
function persist() {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const temp = `${filename}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify([...records.values()]), { mode: 0o600 });
    fs.renameSync(temp, filename);
}
function update(job) { job.updatedAt = new Date().toISOString(); persist(); }
async function run(job) {
    const controller = new AbortController();
    active.set(job.id, controller);
    job.status = 'running';
    job.phase = '抖音 MCP 正在处理（进度未知）';
    update(job);
    try {
        const args = { ...job.args };
        let result;
        if (job.tool === 'download_video') {
            const asset = await (0, douyin_media_coordinator_1.ensureDouyinVideoAsset)(String(job.args.aweme_id || ''), { signal: controller.signal });
            result = { success: true, file_path: asset.filePath, video: { aweme_id: asset.sourceId, duration_seconds: asset.durationSeconds } };
        }
        else if (job.tool === 'transcribe_video') {
            const audio = await (0, douyin_media_coordinator_1.ensureDouyinAudioAsset)(String(job.args.aweme_id || ''), { signal: controller.signal });
            result = await (0, douyin_mcp_bridge_1.callDouyinMcpTool)('transcribe_audio', { audio_path: audio.audioPath, aweme_id: String(job.args.aweme_id || '') }, { signal: controller.signal, timeoutMs: 1_800_000, outputSubdir: `jobs/${job.id}` });
        }
        else {
            if (['download_aweme_images', 'ocr_aweme_images'].includes(job.tool))
                args.save_dir = `jobs/${job.id}`;
            result = await (0, douyin_mcp_bridge_1.callDouyinMcpTool)(job.tool, args, { signal: controller.signal, timeoutMs: 1_800_000, outputSubdir: `jobs/${job.id}` });
        }
        if (controller.signal.aborted)
            return;
        job.result = result;
        job.status = 'done';
        job.phase = '处理完成';
        job.error = undefined;
    }
    catch (error) {
        if (!controller.signal.aborted) {
            job.status = 'failed';
            job.phase = '处理失败';
            job.error = String(error.message || '抖音处理失败').slice(0, 600);
        }
    }
    finally {
        active.delete(job.id);
        update(job);
        pump();
    }
}
function pump() {
    if (active.size)
        return; // Media jobs are serialized to limit platform/ASR load.
    const next = [...records.values()].find(j => j.status === 'queued');
    if (next)
        void run(next);
}
function artifacts(job) {
    const files = new Set();
    function collect(value, depth = 0) {
        if (depth > 10 || files.size > 100)
            return;
        if (typeof value === 'string' && (0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(value) && fs.existsSync(value) && fs.statSync(value).isFile())
            files.add(value);
        else if (value && typeof value === 'object')
            Object.values(value).forEach(v => collect(v, depth + 1));
    }
    collect(job.result);
    return [...files].filter(file => path.resolve(file).startsWith(path.resolve(utils_1.CCM_DIR, 'media', 'douyin', 'jobs', job.id) + path.sep));
}
function publicJob(job) {
    function scrub(value) {
        if (typeof value === 'string')
            return /^[A-Za-z]:[\\/]|^\//.test(value) ? path.basename(value) : value;
        if (Array.isArray(value))
            return value.map(scrub);
        if (value && typeof value === 'object')
            return Object.fromEntries(Object.entries(value).filter(([k]) => !/cookie|token|download_url|image_urls/i.test(k)).map(([k, v]) => [k, scrub(v)]));
        return value;
    }
    return { ...job, result: scrub(job.result), artifacts: artifacts(job).map((file, index) => ({ name: path.basename(file), url: `/api/music/platforms/douyin/jobs/${job.id}/files/${index}` })) };
}
function listDouyinMediaJobs() { load(); return [...records.values()].reverse().map(publicJob); }
/**
 * Return the latest transcription job for a video without exposing the media
 * job store to the music player.  The lyric endpoint uses this projection to
 * turn a completed ASR result into timed lyric lines and to show progress for
 * an already running request.
 */
function getDouyinTranscription(awemeId) {
    load();
    const id = String(awemeId || '').trim();
    if (!/^\d{10,24}$/.test(id))
        return null;
    const matches = [...records.values()]
        .filter(job => job.tool === 'transcribe_video' && String(job.args?.aweme_id || '') === id)
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    // A failed retry must not hide an earlier successful transcript. Prefer an
    // active attempt while it is running, otherwise reuse the newest completed
    // result and only report failure when no usable result exists.
    const job = matches.find(item => ['waiting_confirmation', 'queued', 'running'].includes(item.status))
        || matches.find(item => item.status === 'done')
        || matches[0];
    if (!job)
        return null;
    return {
        id: job.id,
        status: job.status,
        phase: job.phase,
        error: job.error || '',
        result: job.status === 'done' ? job.result || null : null,
    };
}
function resolveDouyinJobArtifact(id, index) {
    load();
    const job = records.get(id);
    const file = job && artifacts(job)[index];
    if (!file || !(0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(file))
        throw new Error('文件不存在');
    return file;
}
function createDouyinMediaJob(tool, input, confirmed = true) {
    load();
    if (!douyin_contract_1.DOUYIN_MEDIA_TOOLS.has(tool))
        throw new Error('不是媒体任务');
    if ('save_dir' in input || 'subdir' in input)
        throw new Error('任务保存目录由 CCM 管理');
    const args = (0, douyin_contract_1.validateDouyinArgs)(tool, input);
    const signature = JSON.stringify([tool, Object.entries(args).sort()]);
    const existing = [...records.values()].find(job => ['waiting_confirmation', 'queued', 'running', 'done'].includes(job.status) && JSON.stringify([job.tool, Object.entries(job.args).sort()]) === signature);
    if (existing)
        return publicJob(existing);
    if (records.size >= 500)
        throw new Error('媒体任务已达上限，请先清理已完成任务');
    if ([...records.values()].filter(j => ['waiting_confirmation', 'queued', 'running'].includes(j.status)).length >= 20)
        throw new Error('等待中的抖音任务过多，请稍后再试');
    const timestamp = new Date().toISOString();
    const job = { id: `dy_${crypto.randomUUID()}`, tool, args, status: confirmed ? 'queued' : 'waiting_confirmation', phase: confirmed ? '等待处理' : '等待用户确认（下载/转写可能产生费用）', attempt: 1, createdAt: timestamp, updatedAt: timestamp };
    records.set(job.id, job);
    persist();
    setImmediate(pump);
    return publicJob(job);
}
function controlDouyinMediaJob(id, action) {
    load();
    const job = records.get(id);
    if (!job)
        throw new Error('抖音任务不存在');
    if (action === 'confirm' && job.status === 'waiting_confirmation') {
        job.status = 'queued';
        job.phase = '已确认，等待处理';
        update(job);
        setImmediate(pump);
    }
    else if (action === 'cancel' && ['waiting_confirmation', 'queued', 'running'].includes(job.status)) {
        job.status = 'cancelled';
        job.phase = '已取消';
        active.get(id)?.abort();
        update(job);
    }
    else if (action === 'retry') {
        if (!['failed', 'cancelled'].includes(job.status) || active.has(id))
            throw new Error('任务尚未停止，不能重试');
        job.status = 'queued';
        job.phase = '等待重试';
        job.attempt++;
        job.error = undefined;
        update(job);
        setImmediate(pump);
    }
    else if (action === 'remove') {
        if (['queued', 'running'].includes(job.status) || active.has(id))
            throw new Error('请先取消任务');
        // Delete only this backend-issued UUID directory, never the media root.
        const dir = path.join(utils_1.CCM_DIR, 'media', 'douyin', 'jobs', job.id);
        if (!(0, douyin_mcp_bridge_1.isDouyinManagedMediaPath)(dir))
            throw new Error('缓存目录不安全');
        if (fs.existsSync(dir))
            fs.rmSync(dir, { recursive: true });
        records.delete(id);
        persist();
    }
    return publicJob(job);
}
//# sourceMappingURL=douyin-media-jobs.js.map