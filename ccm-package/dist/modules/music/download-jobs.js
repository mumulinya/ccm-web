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
exports.musicDownloadJobs = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const bilibili_1 = require("./bilibili");
const library_1 = require("./library");
const search_results_1 = require("./search-results");
const STORE_FILE = path.join(utils_1.CCM_DIR, "music-download-jobs.json");
const MAX_JOBS = 200;
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.CCM_MUSIC_DOWNLOAD_CONCURRENCY) || 2));
const JOB_TIMEOUT_MS = Math.max(60_000, Number(process.env.CCM_MUSIC_DOWNLOAD_TIMEOUT_MS) || 15 * 60_000);
function now() { return new Date().toISOString(); }
function safeName(value) { return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").slice(0, 120) || "music"; }
function atomicWrite(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function looksLikeAudio(file) {
    if (!fs.existsSync(file) || fs.statSync(file).size < 1024)
        return false;
    const fd = fs.openSync(file, "r");
    const header = Buffer.alloc(12);
    const read = fs.readSync(fd, header, 0, header.length, 0);
    fs.closeSync(fd);
    if (read < 4)
        return false;
    const ascii = header.toString("ascii");
    return ascii.startsWith("ID3") || ascii.startsWith("RIFF") || ascii.startsWith("OggS")
        || ascii.startsWith("fLaC") || header[0] === 0xff || ascii.slice(4, 8) === "ftyp";
}
class MusicDownloadJobStore {
    jobs = new Map();
    children = new Map();
    activeRuns = new Set();
    pumping = false;
    constructor() {
        try {
            const rows = fs.existsSync(STORE_FILE) ? JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) : [];
            for (const row of Array.isArray(rows) ? rows : []) {
                if (!row?.id)
                    continue;
                if (["resolving", "running"].includes(row.status)) {
                    row.status = "queued";
                    row.phase = "等待恢复";
                    row.error = undefined;
                }
                this.jobs.set(row.id, row);
            }
        }
        catch (error) {
            console.warn("[MusicDownloads] failed to load persisted jobs:", error?.message);
        }
        setImmediate(() => this.pump());
    }
    list() {
        return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    get(id) { return this.jobs.get(id) || null; }
    create(source, token) {
        const payload = (0, search_results_1.verifyDownloadToken)(token, source);
        const existing = this.list().find(job => job.source === source && job.sourceId === payload.sourceId && ["queued", "resolving", "running"].includes(job.status));
        if (existing)
            return existing;
        const timestamp = now();
        const job = {
            id: `music_dl_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
            source,
            sourceId: payload.sourceId,
            title: payload.title,
            artist: payload.artist,
            status: "queued",
            progress: 0,
            phase: "等待下载",
            attempt: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        this.jobs.set(job.id, job);
        this.persist();
        this.pump();
        return job;
    }
    cancel(id) {
        const job = this.require(id);
        if (["done", "failed", "cancelled"].includes(job.status))
            return job;
        job.status = "cancelled";
        job.phase = "已取消";
        job.finishedAt = now();
        job.updatedAt = job.finishedAt;
        this.children.get(id)?.kill("SIGTERM");
        this.removePartial(job);
        this.persist();
        return job;
    }
    retry(id) {
        const job = this.require(id);
        if (!["failed", "cancelled"].includes(job.status))
            throw new Error("只有失败或已取消的任务可以重试");
        job.status = "queued";
        job.progress = 0;
        job.phase = "等待重试";
        job.error = undefined;
        job.finishedAt = undefined;
        job.attempt += 1;
        job.updatedAt = now();
        this.persist();
        this.pump();
        return job;
    }
    clearFinished() {
        for (const [id, job] of this.jobs) {
            if (!this.activeRuns.has(id) && ["done", "failed", "cancelled"].includes(job.status))
                this.jobs.delete(id);
        }
        this.persist();
        return this.list();
    }
    removeFinished(id) {
        const job = this.require(id);
        if (this.activeRuns.has(id) || !["done", "failed", "cancelled"].includes(job.status))
            throw new Error("任务仍在运行，暂时不能清理");
        this.jobs.delete(id);
        this.persist();
        return this.list();
    }
    require(id) {
        const job = this.jobs.get(id);
        if (!job)
            throw new Error("下载任务不存在");
        return job;
    }
    persist() {
        const rows = this.list().slice(0, MAX_JOBS);
        atomicWrite(STORE_FILE, rows);
    }
    outputFile(job) {
        const suffix = job.source === "bilibili" ? ` [${job.sourceId}]` : ` [netease-${job.sourceId}]`;
        return path.join(library_1.MUSIC_DIR, `${safeName(`${job.artist} - ${job.title}${suffix}`)}.mp3`);
    }
    removePartial(job) {
        const partial = `${this.outputFile(job)}.part`;
        try {
            if (fs.existsSync(partial))
                fs.unlinkSync(partial);
        }
        catch { }
    }
    async pump() {
        if (this.pumping)
            return;
        this.pumping = true;
        try {
            while (this.activeRuns.size < CONCURRENCY) {
                const next = this.list().reverse().find(job => job.status === "queued");
                if (!next)
                    break;
                void this.run(next);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        finally {
            this.pumping = false;
        }
    }
    async run(job) {
        this.activeRuns.add(job.id);
        const output = this.outputFile(job);
        const partial = `${output}.part`;
        if (fs.existsSync(output) && looksLikeAudio(output)) {
            this.complete(job, output);
            this.activeRuns.delete(job.id);
            return;
        }
        this.removePartial(job);
        job.status = "resolving";
        job.phase = "正在解析音频地址";
        job.startedAt = now();
        job.updatedAt = job.startedAt;
        this.persist();
        try {
            const audioUrl = job.source === "bilibili"
                ? await (0, bilibili_1.getBiliAudioUrl)(job.sourceId)
                : `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(job.sourceId)}.mp3`;
            if (this.jobs.get(job.id)?.status !== "resolving")
                return;
            const headers = job.source === "bilibili"
                ? `User-Agent: ${bilibili_1.BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`
                : "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nReferer: https://music.163.com/\r\n";
            job.status = "running";
            job.phase = "正在下载并转码";
            job.progress = null;
            job.updatedAt = now();
            this.persist();
            const child = (0, child_process_1.spawn)("ffmpeg", ["-headers", headers, "-i", audioUrl, "-vn", "-y", "-q:a", "0", "-f", "mp3", "-progress", "pipe:1", "-nostats", partial], {
                stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
            });
            this.children.set(job.id, child);
            let stderr = "";
            let stdout = "";
            let durationSeconds = 0;
            let lastPersist = 0;
            child.stdout.on("data", (chunk) => {
                stdout = `${stdout}${chunk.toString()}`.slice(-1000);
                const matches = Array.from(stdout.matchAll(/out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/g));
                const match = matches[matches.length - 1];
                if (match) {
                    const processed = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
                    job.phase = `已处理 ${match[1]}:${match[2]}:${Math.floor(Number(match[3])).toString().padStart(2, "0")}`;
                    if (durationSeconds > 0)
                        job.progress = Math.max(1, Math.min(99, Math.round(processed / durationSeconds * 100)));
                }
                job.updatedAt = now();
                if (Date.now() - lastPersist > 1000) {
                    lastPersist = Date.now();
                    this.persist();
                }
            });
            child.stderr.on("data", (chunk) => {
                stderr = `${stderr}${chunk.toString()}`.slice(-4000);
                const duration = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
                if (duration)
                    durationSeconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
            });
            const exitCode = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("下载超时，请稍后重试")); }, JOB_TIMEOUT_MS);
                child.once("error", error => { clearTimeout(timer); reject(error); });
                child.once("close", code => { clearTimeout(timer); resolve(code); });
            });
            if (this.jobs.get(job.id)?.status !== "running") {
                this.removePartial(job);
                return;
            }
            if (exitCode !== 0 || !looksLikeAudio(partial)) {
                throw new Error(job.source === "netease" ? "歌曲可能需要 VIP、已下架或无法获取音频" : (stderr.trim().slice(-300) || "下载转码失败"));
            }
            fs.renameSync(partial, output);
            this.complete(job, output);
        }
        catch (error) {
            if (this.jobs.has(job.id) && this.jobs.get(job.id)?.status !== "cancelled") {
                job.status = "failed";
                job.phase = "下载失败";
                job.error = error?.code === "ENOENT" ? "未找到 ffmpeg，请先安装并加入环境变量" : (error?.message || "下载失败");
                job.finishedAt = now();
                job.updatedAt = job.finishedAt;
                this.removePartial(job);
                this.persist();
            }
        }
        finally {
            this.children.delete(job.id);
            this.activeRuns.delete(job.id);
            this.persist();
            this.pump();
        }
    }
    complete(job, output) {
        job.status = "done";
        job.progress = 100;
        job.phase = "下载完成";
        job.filename = path.basename(output);
        job.error = undefined;
        job.finishedAt = now();
        job.updatedAt = job.finishedAt;
        this.persist();
    }
}
exports.musicDownloadJobs = new MusicDownloadJobStore();
//# sourceMappingURL=download-jobs.js.map