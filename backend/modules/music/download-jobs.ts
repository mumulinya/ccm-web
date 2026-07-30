import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { BILI_UA, getBiliAudioUrl } from "./bilibili";
import { MUSIC_DIR } from "./library";
import { MusicSource, verifyDownloadToken } from "./search-results";
import {
  deletePersistedDownloadJob,
  findMusicMediaAsset,
  listPersistedDownloadJobs,
  upsertMusicMediaAsset,
  upsertPersistedDownloadJob,
} from "./music-persistence";
import { ensureMusicCatalogTrackReady, probeMusicFile } from "./music-catalog";
import { terminateManagedProcessTree } from "../../system/managed-process-tree";

export type MusicDownloadStatus = "queued" | "resolving" | "running" | "done" | "failed" | "cancelled";

export type MusicDownloadJob = {
  id: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  artist: string;
  quality: "standard" | "high" | "very_high" | "source";
  requestedQuality?: "standard" | "high" | "very_high" | "source";
  actualQuality?: "standard" | "high" | "very_high" | "source";
  status: MusicDownloadStatus;
  progress: number | null;
  phase: string;
  filename?: string;
  error?: string;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  commandId?: string;
  consumerKind?: "manual" | "playback";
  reused?: boolean;
  upgraded?: boolean;
  checkpoint?: string;
  catalogGeneration?: number;
  trackId?: string;
};

const MAX_JOBS = 200;
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.CCM_MUSIC_DOWNLOAD_CONCURRENCY) || 2));
const JOB_TIMEOUT_MS = Math.max(60_000, Number(process.env.CCM_MUSIC_DOWNLOAD_TIMEOUT_MS) || 15 * 60_000);

function now() { return new Date().toISOString(); }
function safeName(value: string) { return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").slice(0, 120) || "music"; }

function looksLikeAudio(file: string) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 1024) return false;
  const fd = fs.openSync(file, "r");
  const header = Buffer.alloc(12);
  const read = fs.readSync(fd, header, 0, header.length, 0);
  fs.closeSync(fd);
  if (read < 4) return false;
  const ascii = header.toString("ascii");
  return ascii.startsWith("ID3") || ascii.startsWith("RIFF") || ascii.startsWith("OggS")
    || ascii.startsWith("fLaC") || header[0] === 0xff || ascii.slice(4, 8) === "ftyp";
}

const QUALITY_RANK: Record<string, number> = { standard: 1, high: 2, very_high: 3, source: 4 };
function qualityFromBitrate(bitrate: number): MusicDownloadJob["quality"] {
  if (bitrate >= 300_000) return "very_high";
  if (bitrate >= 180_000) return "high";
  return "standard";
}

async function checksumFile(file: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("data", chunk => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(hash.digest("hex")));
  });
}

class MusicDownloadJobStore {
  private jobs = new Map<string, MusicDownloadJob>();
  private children = new Map<string, ChildProcessWithoutNullStreams>();
  private activeRuns = new Set<string>();
  private pumping = false;

  constructor() {
    try {
      const rows = listPersistedDownloadJobs();
      for (const row of Array.isArray(rows) ? rows : []) {
        if (!row?.id) continue;
        row.quality = ["standard", "high", "very_high", "source"].includes(row.quality) ? row.quality : "high";
        if (["resolving", "running"].includes(row.status)) {
          row.status = "queued";
          row.phase = "等待恢复";
          row.error = undefined;
        }
        this.jobs.set(row.id, row);
      }
    } catch (error: any) {
      console.warn("[MusicDownloads] failed to load persisted jobs:", error?.message);
    }
    setImmediate(() => this.pump());
  }

  list() {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string) { return this.jobs.get(id) || null; }

  create(source: MusicSource, token: string, requestedQuality: any = "high", options: {
    commandId?: string;
    consumerKind?: "manual" | "playback";
  } = {}) {
    const payload = verifyDownloadToken(token, source);
    const quality = (["standard", "high", "very_high", "source"].includes(String(requestedQuality))
      ? String(requestedQuality)
      : "high") as MusicDownloadJob["quality"];
    const existing = this.list().find(job => job.source === source && job.sourceId === payload.sourceId && ["queued", "resolving", "running"].includes(job.status));
    if (existing) return existing;
    const timestamp = now();
    const job: MusicDownloadJob = {
      id: `music_dl_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
      source,
      sourceId: payload.sourceId,
      title: payload.title,
      artist: payload.artist,
      quality,
      requestedQuality: quality,
      status: "queued",
      progress: 0,
      phase: "等待下载",
      attempt: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      commandId: String(options.commandId || ""),
      consumerKind: options.consumerKind === "playback" ? "playback" : "manual",
      checkpoint: "queued",
    };
    this.jobs.set(job.id, job);
    this.persist();
    this.pump();
    return job;
  }

  cancel(id: string) {
    const job = this.require(id);
    if (["done", "failed", "cancelled"].includes(job.status)) return job;
    job.status = "cancelled";
    job.phase = "已取消";
    job.finishedAt = now();
    job.updatedAt = job.finishedAt;
    const child = this.children.get(id);
    if (child) void terminateManagedProcessTree(child);
    this.removePartial(job);
    this.persist();
    return job;
  }

  cancelPlaybackConsumer(commandId: string) {
    const cancelled: MusicDownloadJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.commandId !== commandId || job.consumerKind !== "playback") continue;
      if (!["queued", "resolving", "running"].includes(job.status)) continue;
      cancelled.push(this.cancel(job.id));
    }
    return cancelled;
  }

  retry(id: string) {
    const job = this.require(id);
    if (!["failed", "cancelled"].includes(job.status)) throw new Error("只有失败或已取消的任务可以重试");
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
      if (!this.activeRuns.has(id) && ["done", "failed", "cancelled"].includes(job.status)) {
        this.jobs.delete(id);
        deletePersistedDownloadJob(id);
      }
    }
    this.persist();
    return this.list();
  }

  removeFinished(id: string) {
    const job = this.require(id);
    if (this.activeRuns.has(id) || !["done", "failed", "cancelled"].includes(job.status)) throw new Error("任务仍在运行，暂时不能清理");
    this.jobs.delete(id);
    deletePersistedDownloadJob(id);
    return this.list();
  }

  private require(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("下载任务不存在");
    return job;
  }

  private persist() {
    for (const job of this.list().slice(0, MAX_JOBS)) upsertPersistedDownloadJob(job);
  }

  private outputFile(job: MusicDownloadJob) {
    const suffix = job.source === "bilibili" ? ` [${job.sourceId}]` : ` [netease-${job.sourceId}]`;
    return path.join(MUSIC_DIR, `${safeName(`${job.artist} - ${job.title}${suffix}`)}.mp3`);
  }

  private removePartial(job: MusicDownloadJob) {
    const partial = `${this.outputFile(job)}.${job.id}.ccm-part`;
    try { if (fs.existsSync(partial)) fs.unlinkSync(partial); } catch {}
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.activeRuns.size < CONCURRENCY) {
        const next = this.list().reverse().find(job => job.status === "queued");
        if (!next) break;
        void this.run(next);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally {
      this.pumping = false;
    }
  }

  private async run(job: MusicDownloadJob) {
    this.activeRuns.add(job.id);
    const output = this.outputFile(job);
    const partial = `${output}.${job.id}.ccm-part`;
    const existingAsset = findMusicMediaAsset(job.source, job.sourceId);
    const requestedRank = QUALITY_RANK[job.requestedQuality || job.quality] || QUALITY_RANK.high;
    this.removePartial(job);
    job.status = "resolving";
    job.phase = "正在解析音频地址";
    job.checkpoint = "resolving";
    job.startedAt = now();
    job.updatedAt = job.startedAt;
    this.persist();
    try {
      if (existingAsset?.filename) {
        const existingPath = path.join(MUSIC_DIR, path.basename(existingAsset.filename));
        if (fs.existsSync(existingPath) && looksLikeAudio(existingPath)) {
          const existingQuality = String(existingAsset.actual_quality || qualityFromBitrate(Number(existingAsset.bitrate || 0)));
          if ((QUALITY_RANK[existingQuality] || 0) >= requestedRank) {
            job.reused = true;
            job.actualQuality = existingQuality as MusicDownloadJob["quality"];
            job.phase = "正在同步本地曲库";
            job.checkpoint = "indexing";
            job.updatedAt = now();
            this.persist();
            const catalogTrack = await ensureMusicCatalogTrackReady(path.basename(existingPath), "download_reused");
            this.complete(job, existingPath, catalogTrack);
            return;
          }
        }
      }
      const audioUrl = job.source === "bilibili"
        ? await getBiliAudioUrl(job.sourceId)
        : `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(job.sourceId)}.mp3`;
      if (this.jobs.get(job.id)?.status !== "resolving") return;
      const headers = job.source === "bilibili"
        ? `User-Agent: ${BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`
        : "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nReferer: https://music.163.com/\r\n";
      job.status = "running";
      job.phase = "正在下载并转码";
      job.checkpoint = "downloading";
      job.progress = null;
      job.updatedAt = now();
      this.persist();
      const qualityArgs = job.quality === "standard"
        ? ["-b:a", "128k"]
        : job.quality === "high"
          ? ["-b:a", "192k"]
          : job.quality === "very_high"
            ? ["-b:a", "320k"]
            : ["-q:a", "0"];
      const child = spawn("ffmpeg", ["-headers", headers, "-i", audioUrl, "-vn", "-y", ...qualityArgs, "-f", "mp3", "-progress", "pipe:1", "-nostats", partial], {
        stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
      });
      this.children.set(job.id, child);
      let stderr = "";
      let stdout = "";
      let durationSeconds = 0;
      let lastPersist = 0;
      child.stdout.on("data", (chunk: Buffer) => {
        stdout = `${stdout}${chunk.toString()}`.slice(-1000);
        const matches = Array.from(stdout.matchAll(/out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/g));
        const match = matches[matches.length - 1];
        if (match) {
          const processed = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
          job.phase = `已处理 ${match[1]}:${match[2]}:${Math.floor(Number(match[3])).toString().padStart(2, "0")}`;
          if (durationSeconds > 0) job.progress = Math.max(1, Math.min(99, Math.round(processed / durationSeconds * 100)));
        }
        job.updatedAt = now();
        if (Date.now() - lastPersist > 1000) { lastPersist = Date.now(); this.persist(); }
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-4000);
        const duration = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (duration) durationSeconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
      });
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const timer = setTimeout(() => {
          void terminateManagedProcessTree(child);
          reject(new Error("下载超时，请稍后重试"));
        }, JOB_TIMEOUT_MS);
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("close", code => { clearTimeout(timer); resolve(code); });
      });
      if (this.jobs.get(job.id)?.status !== "running") { this.removePartial(job); return; }
      if (exitCode !== 0 || !looksLikeAudio(partial)) {
        throw new Error(job.source === "netease" ? "歌曲可能需要 VIP、已下架或无法获取音频" : (stderr.trim().slice(-300) || "下载转码失败"));
      }
      job.checkpoint = "verifying";
      const metadata = await probeMusicFile(partial);
      const actualQuality = qualityFromBitrate(metadata.bitrate);
      if ((QUALITY_RANK[actualQuality] || 0) < Math.min(requestedRank, QUALITY_RANK.very_high)) {
        throw new Error(`下载文件实际音质不足：请求${job.requestedQuality || job.quality}，实际${actualQuality}`);
      }
      const fileChecksum = await checksumFile(partial);
      const backup = `${output}.${job.id}.ccm-backup`;
      const hadOutput = fs.existsSync(output);
      try {
        if (hadOutput) fs.renameSync(output, backup);
        fs.renameSync(partial, output);
        if (hadOutput && fs.existsSync(backup)) fs.unlinkSync(backup);
      } catch (error) {
        if (!fs.existsSync(output) && fs.existsSync(backup)) fs.renameSync(backup, output);
        throw error;
      }
      job.actualQuality = actualQuality;
      job.upgraded = !!existingAsset;
      upsertMusicMediaAsset({
        source: job.source,
        sourceId: job.sourceId,
        filename: path.basename(output),
        displayName: `${job.artist} - ${job.title}`,
        requestedQuality: job.requestedQuality || job.quality,
        actualQuality,
        bitrate: metadata.bitrate,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        durationSeconds: metadata.durationSeconds,
        format: metadata.format,
        fileSize: fs.statSync(output).size,
        fileChecksum,
      });
      job.phase = "正在同步本地曲库";
      job.checkpoint = "indexing";
      job.updatedAt = now();
      this.persist();
      const catalogTrack = await ensureMusicCatalogTrackReady(path.basename(output), "download_completed");
      this.complete(job, output, catalogTrack);
    } catch (error: any) {
      if (this.jobs.has(job.id) && this.jobs.get(job.id)?.status !== "cancelled") {
        job.status = "failed";
        job.phase = "下载失败";
        job.checkpoint = "failed";
        job.error = error?.code === "ENOENT" ? "未找到 ffmpeg，请先安装并加入环境变量" : (error?.message || "下载失败");
        job.finishedAt = now();
        job.updatedAt = job.finishedAt;
        this.removePartial(job);
        this.persist();
      }
    } finally {
      this.children.delete(job.id);
      this.activeRuns.delete(job.id);
      this.persist();
      this.pump();
    }
  }

  private complete(job: MusicDownloadJob, output: string, catalogTrack?: any) {
    job.status = "done";
    job.progress = 100;
    job.phase = "下载完成";
    job.checkpoint = "completed";
    job.filename = path.basename(output);
    job.catalogGeneration = Number(catalogTrack?.indexGeneration || 0) || undefined;
    job.trackId = String(catalogTrack?.trackId || catalogTrack?.id || "") || undefined;
    job.error = undefined;
    job.finishedAt = now();
    job.updatedAt = job.finishedAt;
    this.persist();
  }
}

export const musicDownloadJobs = new MusicDownloadJobStore();
