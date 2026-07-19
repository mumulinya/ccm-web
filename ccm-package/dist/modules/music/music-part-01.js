"use strict";
// Behavior-freeze split from music.ts (part 1/2).
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
exports.runMusicRemoteCommandQueueSelfTest = exports.runMusicAgentIntentSelfTest = void 0;
exports.handleMusicApiPartA = handleMusicApiPartA;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const bilibili_1 = require("./bilibili");
const netease_1 = require("./netease");
const library_1 = require("./library");
const state_1 = require("./state");
const agent_1 = require("./agent");
const search_results_1 = require("./search-results");
const download_jobs_1 = require("./download-jobs");
const library_state_1 = require("./library-state");
const select_track_1 = require("./select-track");
var agent_2 = require("./agent");
Object.defineProperty(exports, "runMusicAgentIntentSelfTest", { enumerable: true, get: function () { return agent_2.runMusicAgentIntentSelfTest; } });
var state_2 = require("./state");
Object.defineProperty(exports, "runMusicRemoteCommandQueueSelfTest", { enumerable: true, get: function () { return state_2.runMusicRemoteCommandQueueSelfTest; } });
function startMusicConvertJob(message, keyword = "") {
    const target = (0, search_results_1.extractMusicConvertTarget)(message, keyword);
    if (!target) {
        return {
            ok: false,
            reply: "请提供 B 站 BV 号/链接，或网易云歌曲 ID，我帮你转码下载。",
        };
    }
    try {
        const token = (0, search_results_1.issueDownloadToken)(target.source, target.sourceId, target.title, target.artist);
        const job = download_jobs_1.musicDownloadJobs.create(target.source, token);
        return {
            ok: true,
            job,
            reply: `已创建${target.source === "bilibili" ? "B站" : "网易云"}下载转码任务：${job.title}（${job.id}）。可在下载中心查看进度。`,
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
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.setQueue(body.tracks) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新播放队列失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
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
                const job = download_jobs_1.musicDownloadJobs.create(source, String(body.downloadToken || ""));
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
                });
                (0, utils_1.sendJson)(res, result, result.success === false && result.rejected ? 200 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, rejected: true, index: -1, source: "reject", reason: e?.message || "选曲失败" }, 400);
            }
        });
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
                const { message, mode: chatMode, history } = JSON.parse(body);
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
                const systemPrompt = `你是一个音乐助手 Agent。用户会告诉你想听什么音乐，你需要帮助他们搜索和推荐。

你有三个工具可用：
1. search_bilibili(keyword) - 搜索B站视频
2. search_local(keyword) - 搜索本地音乐库
3. search_netease(keyword) - 搜索网易云音乐

当前模式: ${chatMode === "local" ? "本地模式（搜索本地曲库）" : chatMode === "netease" ? "网易云模式（搜索网易云音乐）" : "B站模式（搜索B站并转码）"}

## 推荐输出格式（严格遵守）
当你向用户推荐歌曲时，先用自然语言简要介绍，然后 **必须** 将曲目放在独立的 \`\`\`tracks 代码块中。格式如下：

### B站模式：
\`\`\`tracks
[
  {"bvid":"BV1xxxxx","title":"视频标题","author":"UP主","duration":"4:32"}
]
\`\`\`

### 网易云模式：
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
4. 回复使用中文，简洁友好。`;
                const messages = (0, agent_1.normalizeMusicAgentMessages)(history || [], message, 10);
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                });
                const agentAction = await (0, agent_1.classifyMusicAgentAction)(cfg, message, chatMode, history || []);
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
                            toolContext = `\n\n[工具结果] 网易云搜索 "${intent.keyword}" 找到 ${neteaseResults.length} 个结果：\n${neteaseResults.slice(0, 8).map((r, i) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n")}`;
                            messages[messages.length - 1].content += toolContext;
                            (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode);
                        }).catch(() => {
                            messages[messages.length - 1].content += "\n\n[工具结果] 网易云搜索失败";
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
//# sourceMappingURL=music-part-01.js.map