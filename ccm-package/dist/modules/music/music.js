"use strict";
// music.ts — merged from 3 part files (behavior-freeze merge).
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
exports.runMusicWeatherSelfTest = exports.runMusicRemoteCommandQueueSelfTest = exports.runMusicAgentIntentSelfTest = exports.handleMusicMemoryApi = void 0;
exports.handleMusicApi = handleMusicApi;
exports.handleMusicApiPartA = handleMusicApiPartA;
exports.handleMusicApiPartB = handleMusicApiPartB;
const memory_1 = require("./memory");
Object.defineProperty(exports, "handleMusicMemoryApi", { enumerable: true, get: function () { return memory_1.handleMusicMemoryApi; } });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const bilibili_1 = require("./bilibili");
const netease_1 = require("./netease");
const library_1 = require("./library");
const state_1 = require("./state");
const agent_1 = require("./agent");
const cover_1 = require("./cover");
const llm_client_1 = require("./llm-client");
const search_results_1 = require("./search-results");
const download_jobs_1 = require("./download-jobs");
const library_state_1 = require("./library-state");
const duplicates_1 = require("./duplicates");
const select_track_1 = require("./select-track");
const weather_1 = require("./weather");
var agent_2 = require("./agent");
Object.defineProperty(exports, "runMusicAgentIntentSelfTest", { enumerable: true, get: function () { return agent_2.runMusicAgentIntentSelfTest; } });
var state_2 = require("./state");
Object.defineProperty(exports, "runMusicRemoteCommandQueueSelfTest", { enumerable: true, get: function () { return state_2.runMusicRemoteCommandQueueSelfTest; } });
function handleMusicApi(pathname, req, res, parsed, ctx) {
    if ((0, memory_1.handleMusicMemoryApi)(pathname, req, res))
        return true;
    if (handleMusicApiPartA(pathname, req, res, parsed, ctx))
        return true;
    return handleMusicApiPartB(pathname, req, res, parsed, ctx);
}
function startMusicConvertJob(message, keyword = "") {
    const target = (0, search_results_1.extractMusicConvertTarget)(message, keyword);
    if (!target) {
        return {
            ok: false,
            reply: "请提供 B 站 BV 号/链接，或网易歌曲 ID，我帮你转码下载。",
        };
    }
    try {
        const token = (0, search_results_1.issueDownloadToken)(target.source, target.sourceId, target.title, target.artist);
        const job = download_jobs_1.musicDownloadJobs.create(target.source, token);
        return {
            ok: true,
            job,
            reply: `已创建${target.source === "bilibili" ? "B站" : "网易"}下载转码任务：${job.title}（${job.id}）。可在下载中心查看进度。`,
        };
    }
    catch (error) {
        return {
            ok: false,
            reply: `创建转码任务失败：${error?.message || "未知错误"}`,
        };
    }
}
function readMusicJsonBody(req, maxBytes = 64 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error("请求内容过大"));
                req.destroy();
                return;
            }
            chunks.push(Buffer.from(chunk));
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}"));
            }
            catch {
                reject(new Error("请求内容不是有效 JSON"));
            }
        });
        req.on("error", reject);
    });
}
const MUSIC_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const MUSIC_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"]);
function isSafeMusicFilename(filename) {
    const value = String(filename || "");
    return !!value && value === path.basename(value) && !value.includes("\0");
}
function isSupportedAudioBuffer(buffer, ext) {
    if (buffer.length < 12 || !MUSIC_EXTENSIONS.has(ext))
        return false;
    const ascii = buffer.subarray(0, 12).toString("ascii");
    if (ext === ".mp3" || ext === ".aac")
        return ascii.startsWith("ID3") || buffer[0] === 0xff;
    if (ext === ".wav")
        return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE";
    if (ext === ".ogg")
        return ascii.startsWith("OggS");
    if (ext === ".flac")
        return ascii.startsWith("fLaC");
    if (ext === ".m4a")
        return ascii.slice(4, 8) === "ftyp";
    return false;
}
function handleMusicApiPartA(pathname, req, res, parsed, ctx) {
    if (!pathname.startsWith("/api/music"))
        return false;
    if (pathname === "/api/music/download-jobs" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, jobs: download_jobs_1.musicDownloadJobs.list() });
        return true;
    }
    if (pathname === "/api/music/download-jobs" && req.method === "DELETE") {
        (0, utils_1.sendJson)(res, { success: true, jobs: download_jobs_1.musicDownloadJobs.clearFinished() });
        return true;
    }
    if (pathname === "/api/music/library-state" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.get() });
        return true;
    }
    if (pathname === "/api/music/library-state/favorite" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.toggleFavorite(body.filename, body.favorite) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新收藏失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/library-state/queue" && req.method === "PUT") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, {
                    success: true,
                    state: library_state_1.musicLibraryState.setQueue(body.tracks, {
                        currentFilename: body.currentFilename,
                        playMode: body.playMode,
                        queueSources: body.queueSources,
                    }),
                });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新播放队列失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/library-state/history" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.recordHistory(body.filename, body.source) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "记录播放历史失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/library-state/history" && req.method === "DELETE") {
        (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.clearHistory() });
        return true;
    }
    if (pathname === "/api/music/library-state/playlists" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.createPlaylist(body.name) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建歌单失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    const playlistMatch = pathname.match(/^\/api\/music\/library-state\/playlists\/([^/]+)$/);
    if (playlistMatch && ["PUT", "DELETE"].includes(req.method)) {
        const id = decodeURIComponent(playlistMatch[1]);
        if (req.method === "DELETE") {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.deletePlaylist(id) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "删除歌单失败" }, 400);
            }
        }
        else {
            readMusicJsonBody(req).then(body => {
                try {
                    (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.updatePlaylist(id, body) });
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新歌单失败" }, 400);
                }
            }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        }
        return true;
    }
    const downloadJobMatch = pathname.match(/^\/api\/music\/download-jobs\/([^/]+)(?:\/(cancel|retry))?$/);
    if (downloadJobMatch && req.method === "GET" && !downloadJobMatch[2]) {
        const job = download_jobs_1.musicDownloadJobs.get(decodeURIComponent(downloadJobMatch[1]));
        (0, utils_1.sendJson)(res, job ? { success: true, job } : { success: false, error: "下载任务不存在" }, job ? 200 : 404);
        return true;
    }
    if (downloadJobMatch && req.method === "DELETE" && !downloadJobMatch[2]) {
        try {
            (0, utils_1.sendJson)(res, { success: true, jobs: download_jobs_1.musicDownloadJobs.removeFinished(decodeURIComponent(downloadJobMatch[1])) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "清理下载任务失败" }, 400);
        }
        return true;
    }
    if (downloadJobMatch && req.method === "POST" && downloadJobMatch[2]) {
        try {
            const id = decodeURIComponent(downloadJobMatch[1]);
            const job = downloadJobMatch[2] === "cancel" ? download_jobs_1.musicDownloadJobs.cancel(id) : download_jobs_1.musicDownloadJobs.retry(id);
            (0, utils_1.sendJson)(res, { success: true, job });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新下载任务失败" }, 400);
        }
        return true;
    }
    if ((pathname === "/api/music/download-jobs" || pathname === "/api/music/download" || pathname === "/api/music/convert" || pathname === "/api/music/convert-netease") && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                const source = pathname === "/api/music/convert-netease" || body.source === "netease" || body.songId ? "netease" : "bilibili";
                const job = download_jobs_1.musicDownloadJobs.create(source, String(body.downloadToken || ""), body.quality || (0, db_1.loadMusicConfig)()?.quality);
                (0, utils_1.sendJson)(res, { success: true, job, jobId: job.id }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建下载任务失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/remote-command" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const type = String(payload.type || "play").trim() || "play";
                const keyword = String(payload.keyword || payload.query || "").trim();
                if (type !== "stop" && !keyword)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少音乐关键词" }, 400);
                const command = (0, state_1.enqueueMusicRemoteCommand)({
                    type,
                    keyword: type === "stop" ? (keyword || "__stop__") : keyword,
                    mode: String(payload.mode || "").trim(),
                    source: payload.source || "global-agent",
                    request_text: String(payload.request_text || payload.requestText || keyword).trim(),
                });
                (0, utils_1.sendJson)(res, { success: true, command });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "创建音乐播放指令失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/remote-command" && req.method === "GET") {
        const claimed = (0, state_1.claimMusicRemoteCommand)();
        (0, utils_1.sendJson)(res, {
            success: true,
            command: claimed,
            stale_hint: claimed?.status === "stale" ? "播放指令超时未完成，请确认 CCM Web 已打开" : "",
        });
        return true;
    }
    if (pathname === "/api/music/remote-command/take" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const command = (0, state_1.takeMusicRemoteCommand)(String(payload.id || ""));
                (0, utils_1.sendJson)(res, { success: !!command, command });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "领取音乐指令失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/remote-command/ack" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, state_1.ackMusicRemoteCommand)({
                    id: String(payload.id || ""),
                    status: payload.status === "failed" ? "failed" : "success",
                    error: payload.error,
                });
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "确认音乐指令失败" }, 400);
            }
        });
        return true;
    }
    // Legacy consume: treat as failed ack so the command can be retried instead of dropped.
    if (pathname === "/api/music/remote-command/consume" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || (0, state_1.loadMusicRemoteCommand)()?.id || "").trim();
                if (id)
                    (0, state_1.ackMusicRemoteCommand)({ id, status: "failed", error: "legacy_consume_without_play_result" });
                (0, utils_1.sendJson)(res, { success: true, legacy: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "消费音乐指令失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/pet-state" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, agent: ctx.getMusicPetAgent() });
        return true;
    }
    if (pathname === "/api/music/pet-state" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                ctx.setMusicPetState(data.state || "idle", data.detail || "", data.track || null);
                (0, utils_1.sendJson)(res, { success: true, agent: ctx.getMusicPetAgent() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/pet-speech" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                ctx.broadcastPetSpeech(ctx.MUSIC_PET_AGENT_NAME, {
                    role: data.role || "assistant",
                    text: data.text || "",
                    mode: data.mode || "replace",
                    final: !!data.final,
                    source: data.source || "music",
                });
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/list" && req.method === "GET") {
        try {
            const files = fs.readdirSync(library_1.MUSIC_DIR)
                .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
                .map((f, i) => (0, library_1.buildLocalTrackMeta)(f, i))
                .sort((a, b) => a.title.localeCompare(b.title));
            (0, utils_1.sendJson)(res, { success: true, tracks: files });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: true, tracks: [] });
        }
        return true;
    }
    if (pathname === "/api/music/search-unified" && req.method === "GET") {
        const query = String(parsed.query.q || "").trim();
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, query, local: [], netease: [], bilibili: [], errors: {} });
            return true;
        }
        Promise.allSettled([
            Promise.resolve((0, library_1.searchLocalMusic)(query).slice(0, 20)),
            (0, netease_1.neteaseSearch)(query),
            (0, bilibili_1.biliSearch)(query),
        ]).then(([local, netease, bilibili]) => {
            const errors = {};
            if (local.status === "rejected")
                errors.local = local.reason?.message || "本地搜索失败";
            if (netease.status === "rejected")
                errors.netease = netease.reason?.message || "网易搜索失败";
            if (bilibili.status === "rejected")
                errors.bilibili = bilibili.reason?.message || "B站搜索失败";
            (0, utils_1.sendJson)(res, {
                success: true,
                query,
                local: local.status === "fulfilled" ? local.value.map(track => ({ type: "local", track })) : [],
                netease: netease.status === "fulfilled" ? (0, search_results_1.signSearchResults)("netease", query, netease.value).map(item => ({ ...item, type: "netease" })) : [],
                bilibili: bilibili.status === "fulfilled" ? (0, search_results_1.signSearchResults)("bilibili", query, bilibili.value).map(item => ({ ...item, type: "bilibili" })) : [],
                errors,
            });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "统一音乐搜索失败" }, 500));
        return true;
    }
    if (pathname === "/api/music/duplicates" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, groups: (0, duplicates_1.scanMusicDuplicates)() });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "扫描重复歌曲失败" }, 500);
        }
        return true;
    }
    if (pathname === "/api/music/duplicates/merge" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                const result = (0, duplicates_1.mergeMusicDuplicateGroup)(body.keepFilename, body.removeFilenames);
                (0, utils_1.sendJson)(res, { success: true, ...result, state: library_state_1.musicLibraryState.get() });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "合并重复歌曲失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/stream" && req.method === "GET") {
        const filename = parsed.query.file;
        if (!isSafeMusicFilename(filename))
            return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
        const filePath = path.join(library_1.MUSIC_DIR, filename);
        if (!fs.existsSync(filePath))
            return (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
            ".m4a": "audio/mp4", ".flac": "audio/flac", ".aac": "audio/aac"
        };
        const range = req.headers.range;
        if (range) {
            const match = String(range).match(/^bytes=(\d*)-(\d*)$/);
            let start = 0;
            let end = stat.size - 1;
            if (!match || (!match[1] && !match[2])) {
                res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
                res.end();
                return true;
            }
            if (!match[1]) {
                const suffixLength = Number(match[2]);
                if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
                    res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
                    res.end();
                    return true;
                }
                start = Math.max(0, stat.size - suffixLength);
            }
            else {
                start = Number(match[1]);
                end = match[2] ? Number(match[2]) : stat.size - 1;
            }
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= stat.size) {
                res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
                res.end();
                return true;
            }
            end = Math.min(end, stat.size - 1);
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": end - start + 1,
                "Content-Type": mimeTypes[ext] || "audio/mpeg",
                "Access-Control-Allow-Origin": "*",
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        }
        else {
            res.writeHead(200, {
                "Content-Length": stat.size,
                "Content-Type": mimeTypes[ext] || "audio/mpeg",
                "Access-Control-Allow-Origin": "*",
            });
            fs.createReadStream(filePath).pipe(res);
        }
        return true;
    }
    if (pathname === "/api/music/search-netease" && req.method === "GET") {
        const query = parsed.query.q || "";
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, results: [] });
            return true;
        }
        (0, netease_1.neteaseSearch)(query).then(results => {
            (0, utils_1.sendJson)(res, { success: true, results: (0, search_results_1.signSearchResults)("netease", String(query), results) });
        }).catch((e) => {
            (0, utils_1.sendJson)(res, { success: false, error: e.message });
        });
        return true;
    }
    if (pathname === "/api/music/search" && req.method === "GET") {
        const query = parsed.query.q || "";
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, results: [] });
            return true;
        }
        (0, bilibili_1.biliSearch)(query).then(results => {
            (0, utils_1.sendJson)(res, { success: true, results: (0, search_results_1.signSearchResults)("bilibili", String(query), results) });
        }).catch((e) => {
            (0, utils_1.sendJson)(res, { success: false, error: e.message });
        });
        return true;
    }
    if (pathname === "/api/music/select-track" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await (0, select_track_1.selectMusicTrack)({
                    keyword: payload.keyword || payload.query || "",
                    candidates: payload.candidates || payload.results || [],
                    selectionMode: payload.selectionMode || payload.selection_mode || "exact",
                    randomize: payload.randomize === true,
                    originalRequest: payload.originalRequest || payload.request_text || "",
                });
                (0, utils_1.sendJson)(res, result, result.success === false && result.rejected ? 200 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, rejected: true, index: -1, source: "reject", reason: e?.message || "选曲失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/resolve-play-request" && req.method === "POST") {
        readMusicJsonBody(req).then(async (payload) => {
            const requestText = String(payload.requestText || payload.request_text || payload.keyword || "").trim();
            const keyword = String(payload.keyword || "").trim();
            if (!requestText && !keyword)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少音乐播放请求" }, 400);
            const plan = await (0, agent_1.resolveMusicPlaybackRequest)((0, state_1.loadMusicAgentConfig)(), requestText, keyword);
            (0, utils_1.sendJson)(res, { success: true, plan });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "播放意图识别失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            config: (0, state_1.publicMusicAgentConfig)()
        });
        return true;
    }
    if (pathname === "/api/music/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const cfg = (0, db_1.loadMusicConfig)();
                if (updates.proxy !== undefined)
                    cfg.proxy = updates.proxy;
                if (updates.weatherLocation !== undefined) {
                    const weatherLocation = String(updates.weatherLocation || "").trim();
                    if (weatherLocation.length > 80)
                        throw new Error("天气城市不能超过 80 个字符");
                    cfg.weatherLocation = weatherLocation;
                }
                if (updates.quality !== undefined) {
                    if (!["standard", "high", "very_high", "source"].includes(String(updates.quality)))
                        throw new Error("无效的音质设置");
                    cfg.quality = String(updates.quality);
                }
                if (updates.fadeSeconds !== undefined) {
                    const fadeSeconds = Number(updates.fadeSeconds);
                    if (!Number.isFinite(fadeSeconds) || fadeSeconds < 0 || fadeSeconds > 8)
                        throw new Error("淡入淡出时长必须在 0 到 8 秒之间");
                    cfg.fadeSeconds = fadeSeconds;
                }
                if (updates.sleepTimerMinutes !== undefined) {
                    const minutes = Number(updates.sleepTimerMinutes);
                    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 180)
                        throw new Error("睡眠定时必须在 0 到 180 分钟之间");
                    cfg.sleepTimerMinutes = minutes;
                }
                for (const key of ["volumeNormalization", "rememberProgress", "aiRecommendationEnabled", "aiEmotionEnabled", "aiAutoSelectEnabled"]) {
                    if (updates[key] !== undefined)
                        cfg[key] = updates[key] === true;
                }
                (0, db_1.saveMusicConfig)(cfg);
                (0, utils_1.sendJson)(res, { success: true, config: (0, state_1.publicMusicAgentConfig)() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/agent" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { message, mode: chatMode } = JSON.parse(body);
                const cfg = (0, state_1.loadMusicAgentConfig)();
                if (!cfg.enabled) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先在系统设置启用统一大模型配置" });
                }
                if (!cfg.apiKey) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写 API Key" });
                }
                if (!cfg.model) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写模型名称" });
                }
                const memoryContext = await (0, memory_1.prepareMusicAgentTurn)(message, chatMode);
                const systemPrompt = `你是一个音乐助手 Agent。用户会告诉你想听什么音乐，你需要帮助他们搜索和推荐。

你有三个工具可用：
1. search_bilibili(keyword) - 搜索B站视频
2. search_local(keyword) - 搜索本地音乐库
3. search_netease(keyword) - 搜索网易音乐

当前模式: ${chatMode === "local" ? "本地模式（搜索本地曲库）" : chatMode === "netease" ? "网易模式（搜索网易音乐）" : "B站模式（搜索B站并转码）"}

## 推荐输出格式（严格遵守）
当你向用户推荐歌曲时，先用自然语言简要介绍，然后 **必须** 将曲目放在独立的 \`\`\`tracks 代码块中。格式如下：

### B站模式：
\`\`\`tracks
[
  {"bvid":"BV1xxxxx","title":"视频标题","author":"UP主","duration":"4:32"}
]
\`\`\`

### 网易模式：
\`\`\`tracks
[
  {"songId":12345,"title":"歌曲名","artist":"歌手名","duration":"4:32"}
]
\`\`\`

### 本地模式：
\`\`\`tracks
[
  {"filename":"文件名.mp3","title":"歌曲名称","artist":"歌手"}
]
\`\`\`

关键规则：
1. 代码块标记必须用 \`\`\`tracks 开头，\`\`\` 结尾，各占独立一行。
2. 数据必须是合法 JSON 数组，必须从工具返回的结果中提取字段（不要编造或修改 uri、bvid、filename、songId 等核心标识）。
3. 如果用户只是闲聊、提问，不需要输出 tracks 代码块。
4. 回复使用中文，简洁友好。

## 当前单例音乐记忆
${memoryContext.continuityText}`;
                const messages = (0, agent_1.normalizeMusicAgentMessages)(memoryContext.messages || [], "", Math.max(20, memoryContext.messages?.length || 0));
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                });
                const agentAction = await (0, agent_1.classifyMusicAgentAction)(cfg, message, chatMode, (memoryContext.messages || []).slice(0, -1));
                (0, agent_1.writeSse)(res, {
                    type: "music_action",
                    action: agentAction,
                    intent: agentAction.type,
                    keyword: agentAction.keyword,
                });
                const intent = {
                    type: agentAction.type === "play_music" ? "play" : agentAction.type === "search_music" ? "search" : agentAction.type === "convert_music" ? "convert" : "help",
                    keyword: agentAction.keyword,
                };
                let toolContext = "";
                if (intent.type === "search" || intent.type === "play") {
                    if (chatMode === "local") {
                        const localResults = (0, library_1.searchLocalMusic)(intent.keyword);
                        (0, agent_1.writeSse)(res, { type: "music_results", mode: "local", results: localResults.slice(0, 8).map(track => ({ type: "local", track })) });
                        toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
                        messages[messages.length - 1].content += toolContext;
                        await (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                    }
                    else if (chatMode === "netease") {
                        (0, netease_1.neteaseSearch)(intent.keyword).then((rawResults) => {
                            const neteaseResults = (0, search_results_1.signSearchResults)("netease", intent.keyword, rawResults);
                            (0, agent_1.writeSse)(res, { type: "music_results", mode: "netease", results: neteaseResults });
                            toolContext = `\n\n[工具结果] 网易搜索 "${intent.keyword}" 找到 ${neteaseResults.length} 个结果：\n${neteaseResults.slice(0, 8).map((r, i) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n")}`;
                            messages[messages.length - 1].content += toolContext;
                            (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                        }).catch(() => {
                            messages[messages.length - 1].content += "\n\n[工具结果] 网易搜索失败";
                            (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                        });
                        return;
                    }
                    else {
                        (0, bilibili_1.biliSearch)(intent.keyword).then((rawResults) => {
                            const biliResults = (0, search_results_1.signSearchResults)("bilibili", intent.keyword, rawResults);
                            (0, agent_1.writeSse)(res, { type: "music_results", mode: "bilibili", results: biliResults });
                            toolContext = `\n\n[工具结果] B站搜索 "${intent.keyword}" 找到 ${biliResults.length} 个结果：\n${biliResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n")}`;
                            messages[messages.length - 1].content += toolContext;
                            (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                        }).catch(() => {
                            messages[messages.length - 1].content += "\n\n[工具结果] B站搜索失败";
                            (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                        });
                        return;
                    }
                }
                else if (intent.type === "convert") {
                    const convert = startMusicConvertJob(message, intent.keyword);
                    (0, agent_1.writeSse)(res, {
                        type: "music_convert",
                        success: convert.ok,
                        reply: convert.reply,
                        job: convert.job || null,
                    });
                    messages[messages.length - 1].content += `\n\n[工具结果] ${convert.reply}`;
                    await (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                }
                else {
                    await (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === AI 歌曲金句接口 ===
    return false;
}
// ===== merged from music-part-02.ts =====
var weather_2 = require("./weather");
Object.defineProperty(exports, "runMusicWeatherSelfTest", { enumerable: true, get: function () { return weather_2.runMusicWeatherSelfTest; } });
function handleMusicApiPartB(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/music/song-quote" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (cfg.enabled && cfg.apiKey && cfg.model) {
                    try {
                        const quote = await (0, llm_client_1.generateSongQuote)(cfg, String(title), String(artist || "未知"));
                        if (quote)
                            return (0, utils_1.sendJson)(res, { success: true, quote });
                    }
                    catch (error) {
                        console.warn("[MusicQuote] model fallback:", error?.message);
                    }
                }
                // Fallback
                const GENERAL_QUOTES = [
                    "音符流淌的瞬间，世界突然变得温柔了起来。",
                    "愿这首歌的旋律，能轻轻抚平你心底所有的褶皱。",
                    "有些话说不出，但音乐已帮你唱完了所有的思绪。",
                    "在旋律的缝隙里，藏着对生活最真挚的热爱与期待。",
                    "音乐是心灵的避难所，今晚就在这旋律中安心放空吧。",
                    "每一个跃动的音符，都是时间写给你的无声情书。",
                    "任凭窗外风雨飘摇，耳机里永远有属于你的晴空。",
                    "生活虽有颠簸，但音乐总会在合适的角落给你拥抱。",
                    "沉浸在旋律里，让那些疲惫在温柔的歌声中渐渐消散。",
                    "每一首歌都是一个漂流瓶，恰好在这个瞬间被你拾起。"
                ];
                (0, utils_1.sendJson)(res, { success: true, quote: GENERAL_QUOTES[Math.floor(Math.random() * GENERAL_QUOTES.length)] });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    // === 歌曲封面同源代理（支持二次元哈希缓存） ===
    if (pathname === "/api/music/cover" && req.method === "GET") {
        return (0, cover_1.handleMusicCoverApi)(res, parsed);
    }
    // === 动漫图：外网随机优先，本地 anime_covers 兜底 ===
    // GET /api/music/anime-cover | ?t=防缓存 | ?local=1 | ?n=1 | ?seed=xxx
    if (pathname === "/api/music/anime-cover" && req.method === "GET") {
        return (0, cover_1.handleAnimeCoverApi)(res, parsed);
    }
    // 浏览器 GPS 优先；无坐标时才使用服务器出口 IP 的近似位置。
    if (pathname === "/api/music/weather" && req.method === "GET") {
        const lat = parsed.query.lat;
        const lon = parsed.query.lon;
        (async () => {
            try {
                const forwardedIp = req.headers?.["x-forwarded-for"];
                const clientIp = Array.isArray(forwardedIp)
                    ? forwardedIp[0]
                    : forwardedIp || req.socket?.remoteAddress || "";
                const configuredLocation = String((0, db_1.loadMusicConfig)()?.weatherLocation || "");
                const result = await (0, weather_1.resolveCurrentWeather)(lat, lon, clientIp, configuredLocation);
                (0, utils_1.sendJson)(res, { success: true, ...result });
            }
            catch (error) {
                const status = String(error?.message || "").includes("定位参数") ? 400 : 502;
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "天气获取失败" }, status);
            }
        })();
        return true;
    }
    if (pathname === "/api/music/song-emotion" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const emotionLabels = ["惬意", "治愈", "温柔", "怀念", "放空", "舒缓", "思念", "平静", "动感", "感动"];
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (!cfg.enabled || !cfg.apiKey || !cfg.model)
                    return (0, utils_1.sendJson)(res, { success: false, error: "统一大模型尚未配置，无法识别歌曲情绪" }, 503);
                const matched = await (0, llm_client_1.classifySongEmotion)(cfg, String(title), String(artist || "未知"), emotionLabels);
                if (!matched)
                    return (0, utils_1.sendJson)(res, { success: false, error: "统一大模型没有返回有效歌曲情绪" }, 503);
                (0, utils_1.sendJson)(res, { success: true, emotion: matched });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/music/chat" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { message, mode: chatMode } = JSON.parse(body);
                const cfg = (0, state_1.loadMusicAgentConfig)();
                const memoryContext = await (0, memory_1.prepareMusicAgentTurn)(message, chatMode);
                let action;
                action = await (0, agent_1.classifyMusicAgentAction)(cfg, message, chatMode, (memoryContext.messages || []).slice(0, -1));
                if (action.error) {
                    (0, utils_1.sendJson)(res, { success: false, error: `音乐意图识别失败：${action.error}`, action }, 503);
                    return;
                }
                const intentType = action.type === "play_music" ? "play"
                    : action.type === "search_music" ? "search"
                        : action.type === "convert_music" ? "convert"
                            : "none";
                const keyword = String(action.keyword || "").trim();
                const result = { intent: intentType, keyword, action };
                if (intentType === "search") {
                    if (chatMode === "local") {
                        const localResults = (0, library_1.searchLocalMusic)(keyword);
                        result.localResults = localResults;
                        result.reply = localResults.length > 0
                            ? `在本地找到 ${localResults.length} 首匹配的音乐：`
                            : `本地没有找到"${keyword}"相关音乐，试试切换到 B站模式？`;
                        (0, utils_1.sendJson)(res, { success: true, ...result });
                    }
                    else if (chatMode === "netease") {
                        (0, netease_1.neteaseSearch)(keyword).then((rawResults) => {
                            const neteaseResults = (0, search_results_1.signSearchResults)("netease", keyword, rawResults);
                            result.neteaseResults = neteaseResults;
                            result.reply = neteaseResults.length > 0
                                ? `在网易找到 ${neteaseResults.length} 个相关结果：`
                                : `网易没有找到"${keyword}"相关的结果，换个关键词试试？`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch((e) => {
                            result.reply = `搜索出错: ${e.message}`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                    else {
                        (0, bilibili_1.biliSearch)(keyword).then((rawResults) => {
                            const biliResults = (0, search_results_1.signSearchResults)("bilibili", keyword, rawResults);
                            result.biliResults = biliResults;
                            result.reply = biliResults.length > 0
                                ? `在B站找到 ${biliResults.length} 个相关结果：`
                                : `没有找到"${keyword}"相关的结果，换个关键词试试？`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch((e) => {
                            result.reply = `搜索出错: ${e.message}`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                }
                else if (intentType === "convert") {
                    const convert = startMusicConvertJob(String(message || ""), keyword);
                    result.reply = convert.reply;
                    if (convert.ok)
                        result.downloadJob = convert.job;
                    (0, utils_1.sendJson)(res, { success: true, ...result });
                }
                else if (intentType === "play") {
                    if (chatMode === "local") {
                        const localResults = (0, library_1.searchLocalMusic)(keyword);
                        result.localResults = localResults;
                        result.autoPlay = localResults.length > 0;
                        result.reply = localResults.length > 0
                            ? `找到并播放：${localResults[0].title}`
                            : `本地没有找到"${keyword}"`;
                        (0, utils_1.sendJson)(res, { success: true, ...result });
                    }
                    else if (chatMode === "netease") {
                        (0, netease_1.neteaseSearch)(keyword).then((rawResults) => {
                            const neteaseResults = (0, search_results_1.signSearchResults)("netease", keyword, rawResults, 5);
                            result.neteaseResults = neteaseResults.slice(0, 5);
                            result.reply = neteaseResults.length > 0
                                ? `找到以下结果，点击下载播放：`
                                : `没有找到相关结果`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch(() => {
                            result.reply = "搜索出错";
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                    else {
                        (0, bilibili_1.biliSearch)(keyword).then((rawResults) => {
                            const biliResults = (0, search_results_1.signSearchResults)("bilibili", keyword, rawResults, 3);
                            result.biliResults = biliResults.slice(0, 3);
                            result.reply = biliResults.length > 0
                                ? `找到以下结果，点击转码播放：`
                                : `没有找到相关结果`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch(() => {
                            result.reply = "搜索出错";
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                }
                else {
                    result.reply = (0, agent_1.getMusicHelpText)(chatMode);
                    (0, utils_1.sendJson)(res, { success: true, ...result });
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/danmaku" && req.method === "GET") {
        const bvid = parsed.query.bvid;
        const title = parsed.query.title;
        const artist = parsed.query.artist;
        if (!bvid && !title)
            return (0, utils_1.sendJson)(res, { error: "缺少 bvid 或 title" }, 400);
        (async () => {
            if (bvid) {
                let oldHttpProxy = process.env.HTTP_PROXY;
                let oldHttpsProxy = process.env.HTTPS_PROXY;
                const cfg = (0, db_1.loadMusicConfig)();
                if (cfg.proxy) {
                    process.env.HTTP_PROXY = cfg.proxy;
                    process.env.HTTPS_PROXY = cfg.proxy;
                }
                try {
                    await (0, bilibili_1.ensureBuvid3)();
                    await (0, bilibili_1.ensureWbiKey)();
                    const params = { bvid: bvid };
                    const signedQs = (0, bilibili_1.signBiliParams)(params);
                    const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                    const viewRes = await fetch(viewUrl, {
                        headers: {
                            "User-Agent": bilibili_1.BILI_UA,
                            "Referer": "https://www.bilibili.com/",
                            "Cookie": (0, bilibili_1.getBiliCookieHeader)(),
                            "Accept": "application/json, text/plain, */*",
                            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                            "Origin": "https://www.bilibili.com",
                            "Sec-Fetch-Dest": "empty",
                            "Sec-Fetch-Mode": "cors",
                            "Sec-Fetch-Site": "same-site"
                        }
                    });
                    const viewData = await viewRes.json();
                    const cid = viewData?.data?.cid;
                    const aid = viewData?.data?.aid;
                    const duration = viewData?.data?.duration || 300;
                    if (!cid) {
                        if (cfg.proxy) {
                            if (oldHttpProxy)
                                process.env.HTTP_PROXY = oldHttpProxy;
                            else
                                delete process.env.HTTP_PROXY;
                            if (oldHttpsProxy)
                                process.env.HTTPS_PROXY = oldHttpsProxy;
                            else
                                delete process.env.HTTPS_PROXY;
                        }
                        return (0, utils_1.sendJson)(res, { success: true, danmaku: [] });
                    }
                    const dmRes = await fetch(`https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`, {
                        headers: {
                            "User-Agent": bilibili_1.BILI_UA,
                            "Referer": "https://www.bilibili.com/",
                            "Cookie": (0, bilibili_1.getBiliCookieHeader)()
                        }
                    });
                    const xml = await dmRes.text();
                    let replies = [];
                    if (aid) {
                        try {
                            const replyUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`;
                            const replyRes = await fetch(replyUrl, {
                                headers: {
                                    "User-Agent": bilibili_1.BILI_UA,
                                    "Referer": "https://www.bilibili.com/",
                                    "Cookie": (0, bilibili_1.getBiliCookieHeader)(),
                                    "Accept": "application/json, text/plain, */*",
                                }
                            });
                            const replyData = await replyRes.json();
                            if (replyData && replyData.code === 0 && replyData.data?.replies) {
                                replies = replyData.data.replies;
                            }
                        }
                        catch (replyErr) {
                            console.error("[Danmaku] Failed to fetch Bilibili replies:", replyErr);
                        }
                    }
                    if (cfg.proxy) {
                        if (oldHttpProxy)
                            process.env.HTTP_PROXY = oldHttpProxy;
                        else
                            delete process.env.HTTP_PROXY;
                        if (oldHttpsProxy)
                            process.env.HTTPS_PROXY = oldHttpsProxy;
                        else
                            delete process.env.HTTPS_PROXY;
                    }
                    const items = [];
                    const regex = /<d p="([^"]*)"[^>]*>([^<]*)<\/d>/g;
                    let match;
                    while ((match = regex.exec(xml)) !== null) {
                        const attrs = match[1].split(",");
                        const time = parseFloat(attrs[0]);
                        const type = parseInt(attrs[1]) || 1;
                        const color = parseInt(attrs[3]) || 16777215;
                        const hexColor = "#" + color.toString(16).padStart(6, "0");
                        items.push({ time, content: match[2], type, color: hexColor });
                    }
                    if (replies && replies.length > 0) {
                        const maxReplies = Math.min(replies.length, 25);
                        const interval = Math.max(6, Math.floor(duration / (maxReplies + 1)));
                        for (let i = 0; i < maxReplies; i++) {
                            const r = replies[i];
                            const username = r.member?.uname || "路人";
                            const message = (r.content?.message || "").replace(/\s+/g, " ").trim();
                            if (!message)
                                continue;
                            const shortMsg = message.length > 60 ? message.substring(0, 60) + "..." : message;
                            const content = `💬 [热评] ${username}: ${shortMsg}`;
                            const time = 3 + i * interval + Math.random() * 2;
                            const color = "#ff9f43";
                            items.push({
                                time,
                                content,
                                type: 1,
                                color
                            });
                        }
                    }
                    (0, utils_1.sendJson)(res, { success: true, danmaku: items });
                }
                catch (e) {
                    if (cfg.proxy) {
                        if (oldHttpProxy)
                            process.env.HTTP_PROXY = oldHttpProxy;
                        else
                            delete process.env.HTTP_PROXY;
                        if (oldHttpsProxy)
                            process.env.HTTPS_PROXY = oldHttpsProxy;
                        else
                            delete process.env.HTTPS_PROXY;
                    }
                    (0, utils_1.sendJson)(res, { success: false, error: e.message });
                }
            }
            else {
                try {
                    const query = `${artist || ""} ${title}`.trim();
                    console.log("[NeteaseComments] searching for:", query);
                    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=5`;
                    const searchRes = await fetch(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        }
                    });
                    const searchData = await searchRes.json();
                    const songs = searchData?.result?.songs || [];
                    if (songs.length === 0) {
                        return (0, utils_1.sendJson)(res, { success: true, danmaku: [] });
                    }
                    const songId = songs[0].id;
                    // 并发请求多页，获取更多评论（共 5 页，每页最多 40 条，累计最多 200 条评论 + 热评）
                    const limit = 40;
                    const offsets = [0, 40, 80, 120, 160];
                    const promises = offsets.map(offset => {
                        const commentsUrl = `https://music.163.com/api/v1/resource/comments/R_SO_4_${songId}?limit=${limit}&offset=${offset}`;
                        return fetch(commentsUrl, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                "Referer": "https://music.163.com/",
                            }
                        }).then(r => r.json()).catch(() => ({}));
                    });
                    const results = await Promise.all(promises);
                    let allHotComments = [];
                    let allStandardComments = [];
                    for (const data of results) {
                        const d = data;
                        if (d?.hotComments) {
                            allHotComments = allHotComments.concat(d.hotComments);
                        }
                        if (d?.comments) {
                            allStandardComments = allStandardComments.concat(d.comments);
                        }
                    }
                    // 对热评和最新评论去重
                    const uniqueHotMap = new Map();
                    for (const c of allHotComments) {
                        if (c?.commentId)
                            uniqueHotMap.set(c.commentId, c);
                    }
                    const hotComments = Array.from(uniqueHotMap.values());
                    const uniqueStandardMap = new Map();
                    for (const c of allStandardComments) {
                        if (c?.commentId && !uniqueHotMap.has(c.commentId)) {
                            uniqueStandardMap.set(c.commentId, c);
                        }
                    }
                    const standardComments = Array.from(uniqueStandardMap.values());
                    const allComments = [...hotComments, ...standardComments];
                    const items = [];
                    const duration = 240;
                    // 上限调高到 200 条，弹幕更加饱满热闹
                    const maxComments = Math.min(allComments.length, 200);
                    for (let i = 0; i < maxComments; i++) {
                        const c = allComments[i];
                        const username = c.user?.nickname || "网易用户";
                        const message = (c.content || "").replace(/\s+/g, " ").trim();
                        if (!message)
                            continue;
                        const shortMsg = message.length > 80 ? message.substring(0, 80) + "..." : message;
                        const isHot = i < hotComments.length;
                        const content = isHot ? `💬 [网易热评] ${username}: ${shortMsg}` : `💬 [评论] ${username}: ${shortMsg}`;
                        // 采用更加随机且紧凑的散布方式，使弹幕不会死板地等距出现，而是产生密集的弹幕云效果
                        const time = 3 + Math.random() * (duration - 13);
                        const color = isHot ? "#ff4d4f" : "#a6a6a6";
                        items.push({
                            time,
                            content,
                            type: 1,
                            color
                        });
                    }
                    console.log("[NeteaseComments] loaded", items.length, "comments for songId:", songId);
                    (0, utils_1.sendJson)(res, { success: true, danmaku: items });
                }
                catch (e) {
                    console.error("[NeteaseComments] error:", e.message);
                    (0, utils_1.sendJson)(res, { success: false, error: e.message });
                }
            }
        })();
        return true;
    }
    if (pathname === "/api/music/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (!ct.includes("multipart/form-data"))
            return (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        const declaredLength = Number(req.headers["content-length"] || 0);
        if (declaredLength > MUSIC_UPLOAD_MAX_BYTES)
            return (0, utils_1.sendJson)(res, { error: "上传文件不能超过 100 MB" }, 413);
        const chunks = [];
        let received = 0;
        let rejected = false;
        req.on("data", (chunk) => {
            if (rejected)
                return;
            received += chunk.length;
            if (received > MUSIC_UPLOAD_MAX_BYTES) {
                rejected = true;
                (0, utils_1.sendJson)(res, { error: "上传文件不能超过 100 MB" }, 413);
                return;
            }
            chunks.push(Buffer.from(chunk));
        });
        req.on("end", () => {
            if (rejected)
                return;
            try {
                const buffer = Buffer.concat(chunks);
                const boundaryMatch = ct.match(/boundary=(.+)/);
                if (!boundaryMatch)
                    return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                const boundary = boundaryMatch[1];
                const boundaryBuf = Buffer.from(`--${boundary}`);
                const parts = [];
                let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length + 2;
                while (true) {
                    const end = buffer.indexOf(boundaryBuf, start);
                    if (end === -1)
                        break;
                    parts.push(buffer.slice(start, end - 2));
                    start = end + boundaryBuf.length + 2;
                }
                const uploaded = [];
                for (const part of parts) {
                    const headerEnd = part.indexOf("\r\n\r\n");
                    if (headerEnd === -1)
                        continue;
                    const headerStr = part.slice(0, headerEnd).toString("utf-8");
                    const body = part.slice(headerEnd + 4);
                    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
                    if (filenameMatch && filenameMatch[1]) {
                        const filename = path.basename(filenameMatch[1]).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
                        const ext = path.extname(filename).toLowerCase();
                        if (isSafeMusicFilename(filename) && isSupportedAudioBuffer(body, ext)) {
                            const filePath = path.join(library_1.MUSIC_DIR, filename);
                            fs.writeFileSync(filePath, body);
                            uploaded.push(filename);
                        }
                    }
                }
                if (!uploaded.length)
                    return (0, utils_1.sendJson)(res, { success: false, error: "没有检测到有效音频文件，请检查格式和文件内容" }, 400);
                (0, utils_1.sendJson)(res, { success: true, uploaded });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { filename } = JSON.parse(body);
                if (!isSafeMusicFilename(filename))
                    return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
                const filePath = path.join(library_1.MUSIC_DIR, filename);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
                fs.unlinkSync(filePath);
                library_state_1.musicLibraryState.removeTrack(filename);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/lyric" && req.method === "GET") {
        const filename = parsed.query.filename;
        const bvid = parsed.query.bvid;
        function parseLrc(lrc) {
            const lines = lrc.split("\n");
            const result = [];
            for (const line of lines) {
                const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
                const text = line.replace(timeRegex, "").trim();
                if (!text)
                    continue;
                let match;
                while ((match = timeRegex.exec(line)) !== null) {
                    const min = parseInt(match[1]);
                    const sec = parseFloat(match[2]);
                    const time = min * 60 + sec;
                    result.push({ time, text });
                }
            }
            return result.sort((a, b) => a.time - b.time);
        }
        function parseYrc(yrc) {
            const result = [];
            for (const line of String(yrc || "").split("\n")) {
                const header = line.match(/^\[(\d+),(\d+)\]/);
                if (!header)
                    continue;
                const words = [];
                const wordRegex = /\((\d+),(\d+),\d+\)([^()]*)/g;
                let match;
                while ((match = wordRegex.exec(line)) !== null) {
                    const text = String(match[3] || "");
                    if (!text)
                        continue;
                    words.push({ start: Number(match[1]) / 1000, duration: Number(match[2]) / 1000, text });
                }
                const text = words.map(word => word.text).join("").trim();
                if (text)
                    result.push({ time: Number(header[1]) / 1000, text, words });
            }
            return result.sort((a, b) => a.time - b.time);
        }
        function attachTranslations(lines, translations) {
            if (!translations.length)
                return lines;
            return lines.map(line => {
                const translated = translations.find(item => Math.abs(Number(item.time) - Number(line.time)) <= 0.12);
                return translated?.text ? { ...line, translation: translated.text } : line;
            });
        }
        function cleanLyricText(raw) {
            return String(raw || "")
                .replace(/<[^>]*>/g, " ")
                .replace(/https?:\/\/\S+/g, " ")
                .replace(/BV[\w]+/gi, " ")
                .replace(/【[^】]*】/g, " ")
                .replace(/\[[^\]]*\]/g, " ")
                .replace(/（[^）]*）/g, " ")
                .replace(/\([^)]+\)/g, " ")
                .replace(/[《》「」『』]/g, " ")
                .replace(/[|｜_/]/g, " ")
                .replace(/(hi[-\s]?res|无损|高音质|极致修复|动态歌词|歌词纯享版|歌词版|纯享|完整版|现场版|live|cover|翻唱|mv|official|lyrics|lyric|audio|video|1080p|1080|4k|2k|hd)/gi, " ")
                .replace(/\s+/g, " ")
                .trim();
        }
        function pushQuery(target, value) {
            const query = cleanLyricText(value);
            if (query && query.length >= 2 && query.length <= 80)
                target.add(query);
        }
        function buildLyricQueries() {
            const queries = new Set();
            const title = String(parsed.query.title || "");
            const parsedFile = filename ? (0, library_1.parseMusicFilename)(String(filename)) : null;
            const rawTexts = [title, parsedFile?.title || "", String(filename || "")].filter(Boolean);
            for (const raw of rawTexts) {
                const quoted = String(raw).match(/[《「『](.{1,80}?)[》」』]/);
                if (quoted?.[1]) {
                    const song = quoted[1].trim();
                    const before = String(raw).slice(0, quoted.index).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
                    const after = String(raw).slice((quoted.index || 0) + quoted[0].length).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
                    const artistAfter = after.replace(/^[-–—_:：\s]+/, "").split(/[-–—_:：|｜\s]/).filter(Boolean)[0] || "";
                    const artistBefore = before.split(/[-–—_:：|｜\s]/).filter(Boolean).pop() || "";
                    if (artistAfter)
                        pushQuery(queries, `${artistAfter} ${song}`);
                    if (artistBefore)
                        pushQuery(queries, `${artistBefore} ${song}`);
                    pushQuery(queries, song);
                }
                const dashParts = cleanLyricText(String(raw)).split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
                if (dashParts.length >= 2) {
                    pushQuery(queries, `${dashParts[0]} ${dashParts.slice(1).join(" ")}`);
                    pushQuery(queries, `${dashParts[dashParts.length - 1]} ${dashParts.slice(0, -1).join(" ")}`);
                }
                pushQuery(queries, String(raw));
            }
            if (parsedFile?.artist && parsedFile.artist !== "未知艺术家") {
                pushQuery(queries, `${parsedFile.artist} ${parsedFile.title}`);
            }
            return Array.from(queries).slice(0, 6);
        }
        async function fetchNeteaseLyrics() {
            const queries = buildLyricQueries();
            for (const query of queries) {
                try {
                    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=10`;
                    const searchRes = await fetch(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        }
                    });
                    const searchData = await searchRes.json();
                    const songs = searchData?.result?.songs || [];
                    for (let i = 0; i < Math.min(songs.length, 10); i++) {
                        const songId = songs[i]?.id;
                        if (!songId)
                            continue;
                        try {
                            const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=1&yv=1`;
                            const lyricRes = await fetch(lyricUrl, {
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                    "Referer": "https://music.163.com/",
                                }
                            });
                            const lyricData = await lyricRes.json();
                            const rawLyric = lyricData?.lrc?.lyric;
                            if (rawLyric && /\[\d+:\d+(?:\.\d+)?\]/.test(rawLyric)) {
                                const normalLyrics = parseLrc(rawLyric);
                                const wordLyrics = parseYrc(lyricData?.yrc?.lyric || "");
                                const translations = parseLrc(lyricData?.tlyric?.lyric || "");
                                const lyrics = attachTranslations(wordLyrics.length ? wordLyrics : normalLyrics, translations);
                                if (lyrics.length > 0) {
                                    console.log(`[Lyric] matched Netease lyric by query "${query}" (ID: ${songId}), ${lyrics.length} lines`);
                                    return lyrics;
                                }
                            }
                        }
                        catch (singleErr) {
                            console.error(`[Lyric] Failed to fetch Netease lyric for song ID ${songId}:`, singleErr.message);
                        }
                    }
                }
                catch (neteaseErr) {
                    console.error(`[Lyric] Failed to search Netease lyrics by "${query}":`, neteaseErr.message);
                }
            }
            return null;
        }
        async function fetchBiliCcLyrics(targetBvid) {
            let oldHttpProxy = process.env.HTTP_PROXY;
            let oldHttpsProxy = process.env.HTTPS_PROXY;
            const cfg = (0, db_1.loadMusicConfig)();
            const restoreProxy = () => {
                if (!cfg.proxy)
                    return;
                if (oldHttpProxy)
                    process.env.HTTP_PROXY = oldHttpProxy;
                else
                    delete process.env.HTTP_PROXY;
                if (oldHttpsProxy)
                    process.env.HTTPS_PROXY = oldHttpsProxy;
                else
                    delete process.env.HTTPS_PROXY;
            };
            if (cfg.proxy) {
                process.env.HTTP_PROXY = cfg.proxy;
                process.env.HTTPS_PROXY = cfg.proxy;
            }
            try {
                await (0, bilibili_1.ensureBuvid3)();
                await (0, bilibili_1.ensureWbiKey)();
                const params = { bvid: targetBvid };
                const signedQs = (0, bilibili_1.signBiliParams)(params);
                const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                const viewRes = await fetch(viewUrl, {
                    headers: {
                        "User-Agent": bilibili_1.BILI_UA,
                        "Referer": "https://www.bilibili.com/",
                        "Cookie": (0, bilibili_1.getBiliCookieHeader)(),
                        "Accept": "application/json, text/plain, */*"
                    }
                });
                const viewData = await viewRes.json();
                const subtitles = viewData?.data?.subtitle?.list || [];
                for (const subtitle of subtitles) {
                    const subUrl = subtitle?.subtitle_url;
                    if (!subUrl)
                        continue;
                    const fullSubUrl = subUrl.startsWith("//") ? `https:${subUrl}` : subUrl;
                    const subRes = await fetch(fullSubUrl, {
                        headers: {
                            "User-Agent": bilibili_1.BILI_UA,
                            "Referer": `https://www.bilibili.com/video/${targetBvid}`,
                        }
                    });
                    const subData = await subRes.json();
                    if (subData && Array.isArray(subData.body)) {
                        const lyrics = subData.body
                            .map((item) => ({
                            time: parseFloat(item.from),
                            text: String(item.content || "").trim()
                        }))
                            .filter((item) => Number.isFinite(item.time) && item.text)
                            .sort((a, b) => a.time - b.time);
                        if (lyrics.length > 0)
                            return lyrics;
                    }
                }
            }
            catch (biliErr) {
                console.error("[Lyric] Failed to fetch Bilibili subtitles:", biliErr.message);
            }
            finally {
                restoreProxy();
            }
            return null;
        }
        (async () => {
            if (filename) {
                try {
                    const safeFilename = String(filename);
                    if (safeFilename.includes("..") || /[\\/]/.test(safeFilename)) {
                        throw new Error("无效文件名");
                    }
                    const lrcName = safeFilename.replace(/\.[^.]+$/, ".lrc");
                    const lrcPath = path.join(library_1.MUSIC_DIR, lrcName);
                    if (fs.existsSync(lrcPath)) {
                        const lrcContent = fs.readFileSync(lrcPath, "utf-8");
                        const lyrics = parseLrc(lrcContent);
                        return (0, utils_1.sendJson)(res, { success: true, source: "local-lrc", lyrics });
                    }
                }
                catch (lrcErr) {
                    console.error("[Lyric] Failed to read local LRC:", lrcErr.message);
                }
            }
            if (bvid) {
                const biliLyrics = await fetchBiliCcLyrics(String(bvid));
                if (biliLyrics && biliLyrics.length > 0) {
                    return (0, utils_1.sendJson)(res, { success: true, source: "bili-cc", lyrics: biliLyrics });
                }
            }
            const neteaseLyrics = await fetchNeteaseLyrics();
            if (neteaseLyrics && neteaseLyrics.length > 0) {
                return (0, utils_1.sendJson)(res, { success: true, source: "netease", lyrics: neteaseLyrics });
            }
            return (0, utils_1.sendJson)(res, { success: true, source: "none", lyrics: [{ time: 0, text: "未检测到歌词字幕，听着旋律，静心聆听吧..." }] });
        })();
        return true;
    }
    return false;
}
//# sourceMappingURL=music.js.map