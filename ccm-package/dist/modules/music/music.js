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
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const bilibili_1 = require("./bilibili");
const netease_1 = require("./netease");
const douyin_1 = require("./douyin");
const library_1 = require("./library");
const music_catalog_1 = require("./music-catalog");
const secure_multipart_1 = require("../../system/secure-multipart");
const music_persistence_1 = require("./music-persistence");
const platform_http_1 = require("./platform-http");
const state_1 = require("./state");
const agent_1 = require("./agent");
const cover_1 = require("./cover");
const llm_client_1 = require("./llm-client");
const search_results_1 = require("./search-results");
const download_jobs_1 = require("./download-jobs");
const library_state_1 = require("./library-state");
const duplicates_1 = require("./duplicates");
const select_track_1 = require("./select-track");
const playback_decision_1 = require("./playback-decision");
const weather_1 = require("./weather");
var agent_2 = require("./agent");
Object.defineProperty(exports, "runMusicAgentIntentSelfTest", { enumerable: true, get: function () { return agent_2.runMusicAgentIntentSelfTest; } });
var state_2 = require("./state");
Object.defineProperty(exports, "runMusicRemoteCommandQueueSelfTest", { enumerable: true, get: function () { return state_2.runMusicRemoteCommandQueueSelfTest; } });
function publicPlaybackCommand(command) {
    if (!command)
        return null;
    return {
        ...command,
        decision: (0, playback_decision_1.publicMusicPlaybackDecision)(command.decision || null),
        origin: command.origin ? {
            source: String(command.origin.source || command.source || ""),
            scope: String(command.origin.scope || ""),
            sessionId: String(command.origin.sessionId || ""),
            messageId: String(command.origin.messageId || ""),
        } : undefined,
    };
}
function publicMusicCandidate(candidate) {
    if (candidate?.source === "local") {
        return { type: "local", track: { filename: candidate.filename || candidate.sourceId, title: candidate.title, artist: candidate.artist } };
    }
    if (candidate?.source === "netease") {
        return { type: "netease", songId: candidate.sourceId, title: candidate.title, artist: candidate.artist, duration: candidate.duration };
    }
    if (candidate?.source === "douyin") {
        return { type: "douyin", awemeId: candidate.sourceId, title: candidate.title, author: candidate.artist, duration: candidate.duration };
    }
    return { type: "bilibili", bvid: candidate?.sourceId, title: candidate?.title, author: candidate?.artist, duration: candidate?.duration };
}
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
            reply: "请提供 B站 BV号/链接、网易歌曲ID，或抖音公开的视频链接，我帮你转码下载。",
        };
    }
    try {
        const token = (0, search_results_1.issueDownloadToken)(target.source, target.sourceId, target.title, target.artist);
        const job = download_jobs_1.musicDownloadJobs.create(target.source, token);
        return {
            ok: true,
            job,
            reply: `已创建${target.source === "bilibili" ? "B站" : target.source === "douyin" ? "抖音" : "网易"}下载转码任务：${job.title}（${job.id}）。可在下载中心查看进度。`,
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
async function checksumFile(file) {
    return await new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(file);
        stream.on("data", chunk => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}
function availableMusicFilename(originalName, checksum) {
    const safe = path.basename(originalName).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
    const ext = path.extname(safe).toLowerCase();
    const stem = path.basename(safe, ext).slice(0, Math.max(1, 170 - ext.length));
    let candidate = `${stem}${ext}`;
    let counter = 2;
    while (fs.existsSync(path.join(library_1.MUSIC_DIR, candidate))) {
        candidate = `${stem} (${counter++})${ext}`;
    }
    return candidate;
}
function handleMusicApiPartA(pathname, req, res, parsed, ctx) {
    if (!pathname.startsWith("/api/music"))
        return false;
    const libraryErrorStatus = (error) => Number(error?.statusCode || (error?.code === "state_drift" ? 409 : 400));
    if (pathname === "/api/music/platforms/douyin/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, status: (0, douyin_1.douyinPlatformStatus)() });
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/auth/start" && req.method === "POST") {
        (0, douyin_1.startDouyinBrowserLogin)()
            .then(status => (0, utils_1.sendJson)(res, { success: true, status }, 202))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "无法启动抖音登录" }, 503));
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/auth" && req.method === "DELETE") {
        try {
            (0, utils_1.sendJson)(res, { success: true, status: (0, douyin_1.revokeDouyinBrowserLogin)() });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "清除抖音登录失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/runtime/prepare" && req.method === "POST") {
        (0, douyin_1.prepareDouyinMediaRuntime)()
            .then(runtime => (0, utils_1.sendJson)(res, { success: true, runtime, status: (0, douyin_1.douyinPlatformStatus)() }))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "抖音媒体解析器准备失败", status: (0, douyin_1.douyinPlatformStatus)() }, 503));
        return true;
    }
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
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.toggleFavorite(body.filename, body.favorite, body.expected_revision) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新收藏失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
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
                        expectedRevision: body.expected_revision,
                    }),
                });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新播放队列失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/library-state/history" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.recordHistory(body.filename, body.source, body.expected_revision) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "记录播放历史失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    if (pathname === "/api/music/library-state/history" && req.method === "DELETE") {
        const expected = parsed.query?.expected_revision === undefined ? undefined : Number(parsed.query.expected_revision);
        try {
            (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.clearHistory(expected) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "清空播放历史失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
        }
        return true;
    }
    if (pathname === "/api/music/library-state/playlists" && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.createPlaylist(body.name, body.expected_revision) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建歌单失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message }, 400));
        return true;
    }
    const playlistMatch = pathname.match(/^\/api\/music\/library-state\/playlists\/([^/]+)$/);
    if (playlistMatch && ["PUT", "DELETE"].includes(req.method)) {
        const id = decodeURIComponent(playlistMatch[1]);
        if (req.method === "DELETE") {
            const expected = parsed.query?.expected_revision === undefined ? undefined : Number(parsed.query.expected_revision);
            try {
                (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.deletePlaylist(id, expected) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "删除歌单失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
            }
        }
        else {
            readMusicJsonBody(req).then(body => {
                try {
                    (0, utils_1.sendJson)(res, { success: true, state: library_state_1.musicLibraryState.updatePlaylist(id, { ...body, expectedRevision: body.expected_revision }) });
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新歌单失败", code: error?.code, current_revision: error?.currentRevision }, libraryErrorStatus(error));
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
    const downloadCommandCancelMatch = pathname.match(/^\/api\/music\/download-jobs\/by-command\/([^/]+)\/cancel$/);
    if (downloadCommandCancelMatch && req.method === "POST") {
        const jobs = download_jobs_1.musicDownloadJobs.cancelPlaybackConsumer(decodeURIComponent(downloadCommandCancelMatch[1]));
        (0, utils_1.sendJson)(res, { success: true, jobs });
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
                const requestedSource = pathname === "/api/music/convert-netease" || body.songId
                    ? "netease"
                    : String(body.source || (body.awemeId ? "douyin" : body.bvid ? "bilibili" : ""));
                if (!["netease", "bilibili", "douyin"].includes(requestedSource))
                    throw new Error("下载来源无效，请重新选择搜索结果");
                const source = requestedSource;
                const job = download_jobs_1.musicDownloadJobs.create(source, String(body.downloadToken || ""), body.quality || (0, db_1.loadMusicConfig)()?.quality, {
                    commandId: String(body.command_id || body.commandId || ""),
                    consumerKind: body.consumer_kind === "playback" || body.consumerKind === "playback" ? "playback" : "manual",
                });
                (0, utils_1.sendJson)(res, { success: true, job, jobId: job.id }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建下载任务失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/intent/resolve" && req.method === "POST") {
        readMusicJsonBody(req).then(async (payload) => {
            try {
                const message = String(payload.message || payload.requestText || payload.request_text || "").trim();
                const decision = await (0, agent_1.resolveMusicIntentDecisionV2)({
                    config: (0, state_1.loadMusicAgentConfig)(),
                    message,
                    mode: payload.mode,
                    history: payload.history,
                    sessionId: payload.session_id || payload.sessionId || "music-singleton",
                    requestId: payload.request_id || payload.requestId,
                });
                (0, utils_1.sendJson)(res, { success: true, decision });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "音乐意图识别失败", receipt: error?.semanticDecisionReceipt || null }, 503);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/playback/resolve" && req.method === "POST") {
        readMusicJsonBody(req).then(async (payload) => {
            try {
                const intent = payload.intent || await (0, agent_1.resolveMusicIntentDecisionV2)({
                    config: (0, state_1.loadMusicAgentConfig)(),
                    message: String(payload.message || payload.requestText || payload.request_text || "").trim(),
                    mode: payload.mode,
                    history: payload.history,
                    sessionId: payload.session_id || payload.sessionId || "music-singleton",
                    requestId: payload.request_id || payload.requestId,
                });
                const decision = await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({
                    intent,
                    requestId: payload.request_id || payload.requestId,
                    aiRecommendationEnabled: payload.aiRecommendationEnabled !== false,
                    aiAutoSelectEnabled: payload.aiAutoSelectEnabled !== false,
                    modelConfig: (0, state_1.loadMusicAgentConfig)(),
                });
                (0, utils_1.sendJson)(res, { success: decision.status === "resolved", decision, executable: !!decision.selectedCandidate }, decision.status === "rejected" ? 422 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "选歌失败", receipt: error?.semanticDecisionReceipt || null }, 503);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/playback/commands" && req.method === "POST") {
        readMusicJsonBody(req).then(async (payload) => {
            try {
                const intent = payload.intent || await (0, agent_1.resolveMusicIntentDecisionV2)({
                    config: (0, state_1.loadMusicAgentConfig)(),
                    message: String(payload.message || payload.requestText || payload.request_text || payload.keyword || "").trim(),
                    mode: payload.mode,
                    history: payload.history,
                    sessionId: payload.session_id || payload.sessionId || "music-singleton",
                    requestId: payload.request_id || payload.requestId,
                });
                const decision = payload.decision || await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({
                    intent,
                    requestId: payload.request_id || payload.requestId,
                    aiRecommendationEnabled: payload.aiRecommendationEnabled !== false,
                    aiAutoSelectEnabled: payload.aiAutoSelectEnabled !== false,
                    modelConfig: (0, state_1.loadMusicAgentConfig)(),
                });
                if (decision.status !== "resolved" || !decision.selectedCandidate) {
                    return (0, utils_1.sendJson)(res, { success: false, decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision), error: decision.reply || "没有可执行的播放决定" }, 422);
                }
                const command = (0, state_1.enqueueMusicRemoteCommand)({
                    type: "play",
                    keyword: decision.searchQuery,
                    request_text: decision.originalRequest,
                    mode: decision.sourceMode,
                    source: payload.source || "music-agent",
                    decision,
                    origin: payload.origin || { source: payload.source || "music-agent", sessionId: payload.session_id || payload.sessionId || "" },
                });
                (0, utils_1.sendJson)(res, { success: true, command: publicPlaybackCommand(command), decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision) }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建播放命令失败", receipt: error?.semanticDecisionReceipt || null }, 503);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/playback/commands/head" && req.method === "GET") {
        return (0, utils_1.sendJson)(res, { success: true, command: publicPlaybackCommand((0, state_1.peekMusicRemoteCommand)()) });
    }
    const playbackCommandAction = pathname.match(/^\/api\/music\/playback\/commands\/([^/]+)\/(claim|heartbeat|complete|cancel)$/);
    if (playbackCommandAction && req.method === "POST") {
        readMusicJsonBody(req).then(payload => {
            const id = decodeURIComponent(playbackCommandAction[1]);
            const action = playbackCommandAction[2];
            const claimed = action === "claim" ? (0, state_1.claimMusicRemoteCommand)(id, payload.generation) : null;
            const result = action === "claim"
                ? { success: !!claimed, command: claimed }
                : action === "heartbeat"
                    ? (0, state_1.heartbeatMusicRemoteCommand)({
                        id,
                        generation: payload.generation,
                        lease_id: payload.lease_id,
                        fencing_token: payload.fencing_token,
                        status: payload.status,
                    })
                    : action === "cancel"
                        ? (0, state_1.completeMusicRemoteCommand)({
                            id,
                            generation: payload.generation,
                            lease_id: payload.lease_id,
                            fencing_token: payload.fencing_token,
                            status: "cancelled",
                            error: payload.reason,
                        })
                        : (0, state_1.completeMusicRemoteCommand)({
                            id,
                            generation: payload.generation,
                            lease_id: payload.lease_id,
                            fencing_token: payload.fencing_token,
                            status: payload.status === "needs_user_gesture" ? "needs_user_gesture" : payload.success === false ? "failed" : "completed",
                            error: payload.error,
                            result: payload.result,
                        });
            if (action === "claim") {
                return (0, utils_1.sendJson)(res, { success: !!claimed, command: claimed }, claimed ? 200 : 409);
            }
            (0, utils_1.sendJson)(res, { ...result, command: publicPlaybackCommand(result.command) }, result.success === false ? 409 : 200);
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新播放命令失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/remote-command" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const type = String(payload.type || "play").trim() || "play";
                const keyword = String(payload.keyword || payload.query || "").trim();
                if (type !== "stop" && !keyword)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少音乐关键词" }, 400);
                if (type !== "stop") {
                    const requestText = String(payload.request_text || payload.requestText || keyword).trim();
                    const intent = await (0, agent_1.resolveMusicIntentDecisionV2)({
                        config: (0, state_1.loadMusicAgentConfig)(),
                        message: requestText,
                        mode: payload.mode,
                        history: payload.history,
                        sessionId: payload.session_id || payload.sessionId || "music-singleton",
                        requestId: payload.request_id || payload.requestId,
                    });
                    if (intent.action !== "play")
                        return (0, utils_1.sendJson)(res, { success: false, error: "模型没有确认这是播放请求", decision: intent }, 422);
                    const decision = await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({
                        intent,
                        requestId: payload.request_id || payload.requestId,
                        aiRecommendationEnabled: payload.aiRecommendationEnabled !== false,
                        aiAutoSelectEnabled: payload.aiAutoSelectEnabled !== false,
                        modelConfig: (0, state_1.loadMusicAgentConfig)(),
                    });
                    if (decision.status !== "resolved" || !decision.selectedCandidate) {
                        return (0, utils_1.sendJson)(res, { success: false, error: decision.reply || "没有可执行的播放决定", decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision) }, 422);
                    }
                    const command = (0, state_1.enqueueMusicRemoteCommand)({
                        type: "play",
                        keyword: decision.searchQuery,
                        request_text: requestText,
                        mode: decision.sourceMode,
                        source: payload.source || "global-agent",
                        decision,
                        origin: payload.origin || { source: payload.source || "global-agent", sessionId: payload.session_id || payload.sessionId || "" },
                    });
                    return (0, utils_1.sendJson)(res, { success: true, command: publicPlaybackCommand(command), decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision) });
                }
                const command = (0, state_1.enqueueMusicRemoteCommand)({
                    type,
                    keyword: type === "stop" ? (keyword || "__stop__") : keyword,
                    mode: String(payload.mode || "").trim(),
                    source: payload.source || "global-agent",
                    request_text: String(payload.request_text || payload.requestText || keyword).trim(),
                });
                (0, utils_1.sendJson)(res, { success: true, command: publicPlaybackCommand(command) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "创建音乐播放指令失败", receipt: e?.semanticDecisionReceipt || null }, e?.semanticDecisionReceipt ? 503 : 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/remote-command" && req.method === "GET") {
        const claimed = (0, state_1.peekMusicRemoteCommand)();
        (0, utils_1.sendJson)(res, {
            success: true,
            command: publicPlaybackCommand(claimed),
            legacy_peek: true,
            stale_hint: "",
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
            const result = (0, music_catalog_1.queryMusicCatalog)({
                cursor: Number(parsed.query.cursor || 0),
                limit: Number(parsed.query.limit || 500),
                query: String(parsed.query.q || ""),
            });
            (0, utils_1.sendJson)(res, {
                success: true,
                tracks: result.tracks,
                total: result.total,
                cursor: Number(parsed.query.cursor || 0),
                next_cursor: result.nextCursor,
                index_generation: result.generation,
                index_status: result.indexStatus,
            });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, tracks: [], error: e?.message || "读取曲库索引失败" }, 500);
        }
        return true;
    }
    if (pathname === "/api/music/library/index-status" && req.method === "GET") {
        return (0, utils_1.sendJson)(res, { success: true, status: (0, music_catalog_1.ensureMusicCatalogPrepared)() });
    }
    if (pathname === "/api/music/library/rescan" && req.method === "POST") {
        void (0, music_catalog_1.startMusicCatalogRescan)("manual-api").catch(error => console.warn("[MusicCatalog] manual rescan failed:", error?.message));
        return (0, utils_1.sendJson)(res, { success: true, accepted: true, status: (0, music_catalog_1.ensureMusicCatalogPrepared)() }, 202);
    }
    const musicDiagnosticMatch = pathname.match(/^\/api\/music\/library\/files\/([^/]+)\/diagnostics$/);
    if (musicDiagnosticMatch && req.method === "GET") {
        const diagnostics = (0, music_catalog_1.musicCatalogFileDiagnostics)(decodeURIComponent(musicDiagnosticMatch[1]));
        return (0, utils_1.sendJson)(res, diagnostics ? { success: true, diagnostics } : { success: false, error: "曲目不存在" }, diagnostics ? 200 : 404);
    }
    if (pathname === "/api/music/search-unified" && req.method === "GET") {
        const query = String(parsed.query.q || "").trim();
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, query, local: [], netease: [], bilibili: [], douyin: [], errors: {} });
            return true;
        }
        Promise.allSettled([
            Promise.resolve((0, music_catalog_1.queryMusicCatalog)({ query, limit: 20 }).tracks),
            (0, netease_1.neteaseSearch)(query),
            (0, bilibili_1.biliSearch)(query),
            (0, douyin_1.douyinSearch)(query),
        ]).then(([local, netease, bilibili, douyin]) => {
            const errors = {};
            const source_statuses = {};
            for (const [name, result] of Object.entries({ local, netease, bilibili, douyin })) {
                if (result.status === "fulfilled") {
                    source_statuses[name] = { status: "success", result_count: result.value.length };
                }
                else {
                    const detail = (0, platform_http_1.publicMusicPlatformError)(result.reason);
                    source_statuses[name] = { ...detail, result_count: 0 };
                    errors[name] = detail.error;
                }
            }
            const totalResults = Object.values(source_statuses).reduce((sum, item) => sum + Number(item.result_count || 0), 0);
            const everySourceFailed = Object.values(source_statuses).every((item) => item.status !== "success");
            (0, utils_1.sendJson)(res, {
                success: !everySourceFailed,
                query,
                local: local.status === "fulfilled" ? local.value.map(track => ({ type: "local", track })) : [],
                netease: netease.status === "fulfilled" ? (0, search_results_1.signSearchResults)("netease", query, netease.value).map(item => ({ ...item, type: "netease" })) : [],
                bilibili: bilibili.status === "fulfilled" ? (0, search_results_1.signSearchResults)("bilibili", query, bilibili.value).map(item => ({ ...item, type: "bilibili" })) : [],
                douyin: douyin.status === "fulfilled" ? (0, search_results_1.signSearchResults)("douyin", query, douyin.value).map(item => ({ ...item, type: "douyin" })) : [],
                errors,
                source_statuses,
                retryable: everySourceFailed,
                total_results: totalResults,
                error: everySourceFailed ? "所有音乐来源暂时不可用，请稍后重试" : undefined,
            }, everySourceFailed ? 503 : 200);
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
    const duplicateTransactionMatch = pathname.match(/^\/api\/music\/duplicates\/transactions\/([^/]+)\/(retry|rollback)$/);
    if (duplicateTransactionMatch && req.method === "POST") {
        try {
            const transactionId = decodeURIComponent(duplicateTransactionMatch[1]);
            const result = duplicateTransactionMatch[2] === "retry"
                ? (0, duplicates_1.retryMusicDuplicateTransaction)(transactionId)
                : (0, duplicates_1.rollbackMusicDuplicateTransaction)(transactionId);
            (0, utils_1.sendJson)(res, { success: true, transaction: result, state: library_state_1.musicLibraryState.get() });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "重复项事务处理失败" }, 409);
        }
        return true;
    }
    if (pathname === "/api/music/stream" && req.method === "GET") {
        const filename = parsed.query.file;
        if (!isSafeMusicFilename(filename))
            return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
        let safeFile;
        try {
            safeFile = (0, music_catalog_1.resolveSafeMusicFile)(filename);
        }
        catch (error) {
            return (0, utils_1.sendJson)(res, { error: error?.message || "文件不存在" }, /不存在/.test(error?.message || "") ? 404 : 400);
        }
        const filePath = safeFile.filePath;
        const stat = safeFile.stat;
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
    if (pathname === "/api/music/search-douyin" && req.method === "GET") {
        const query = String(parsed.query.q || "").trim();
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, results: [], status: (0, douyin_1.douyinPlatformStatus)() });
            return true;
        }
        (0, douyin_1.douyinSearch)(query).then(results => {
            (0, utils_1.sendJson)(res, { success: true, results: (0, search_results_1.signSearchResults)("douyin", query, results), status: (0, douyin_1.douyinPlatformStatus)() });
        }).catch((error) => {
            const detail = (0, platform_http_1.publicMusicPlatformError)(error);
            (0, utils_1.sendJson)(res, { success: false, results: [], ...detail, status: (0, douyin_1.douyinPlatformStatus)() }, detail.retryable ? 503 : 422);
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
                if (updates.douyin && typeof updates.douyin === "object")
                    (0, douyin_1.updateDouyinSettings)(updates.douyin);
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
                const systemPrompt = `你是 CCM 音乐助手。播放意图、搜索、候选选择和下载已经由服务端结构化链处理；当前请求只需要自然语言回答。

不要输出工具调用、JSON、tracks代码块、歌曲ID或下载协议。不要声称已经播放、下载或搜索服务端尚未确认的内容。回复使用中文，简洁友好。

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
                const turnId = `music_turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
                (0, agent_1.writeSse)(res, { type: "turn", turn_id: turnId });
                if (agentAction.error) {
                    (0, agent_1.writeSse)(res, { type: "error", text: `音乐意图识别失败：${agentAction.error}`, receipt: agentAction.semanticDecisionReceipt || null });
                    (0, agent_1.writeSse)(res, { type: "terminal", turn_id: turnId, status: "failed" });
                    (0, agent_1.writeSse)(res, { type: "done" });
                    res.end();
                    return;
                }
                if (agentAction.type === "play_music" || agentAction.type === "search_music") {
                    const playbackDecision = await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({
                        intent: agentAction.intentDecision,
                        requestId: turnId,
                        aiRecommendationEnabled: (0, db_1.loadMusicConfig)()?.aiRecommendationEnabled !== false,
                        aiAutoSelectEnabled: (0, db_1.loadMusicConfig)()?.aiAutoSelectEnabled !== false,
                        modelConfig: cfg,
                    });
                    (0, agent_1.writeSse)(res, { type: "decision", turn_id: turnId, decision: (0, playback_decision_1.publicMusicPlaybackDecision)(playbackDecision) });
                    const resultRows = playbackDecision.candidates.map(publicMusicCandidate);
                    (0, agent_1.writeSse)(res, { type: "candidate_results", turn_id: turnId, results: resultRows });
                    (0, agent_1.writeSse)(res, { type: "music_results", mode: playbackDecision.sourceMode, results: resultRows });
                    let command = null;
                    if (agentAction.type === "play_music" && playbackDecision.status === "resolved" && playbackDecision.selectedCandidate) {
                        command = (0, state_1.enqueueMusicRemoteCommand)({
                            type: "play",
                            keyword: playbackDecision.searchQuery,
                            request_text: message,
                            mode: playbackDecision.sourceMode,
                            source: "music-agent",
                            decision: playbackDecision,
                            origin: { source: "music-agent", sessionId: "music-singleton", messageId: turnId },
                        });
                        (0, agent_1.writeSse)(res, { type: "playback_status", turn_id: turnId, status: "ready", command: publicPlaybackCommand(command) });
                    }
                    (0, agent_1.writeSse)(res, { type: "text", text: playbackDecision.reply });
                    (0, agent_1.writeSse)(res, {
                        type: "terminal",
                        turn_id: turnId,
                        status: command ? "queued" : playbackDecision.status,
                        decision_checksum: playbackDecision.checksum,
                    });
                    (0, agent_1.writeSse)(res, { type: "done" });
                    res.end();
                    return;
                }
                const intent = {
                    type: agentAction.type === "play_music" ? "play" : agentAction.type === "search_music" ? "search" : agentAction.type === "convert_music" ? "convert" : "help",
                    keyword: agentAction.keyword,
                };
                if (intent.type === "convert") {
                    const convert = startMusicConvertJob(message, intent.keyword);
                    (0, agent_1.writeSse)(res, {
                        type: "music_convert",
                        success: convert.ok,
                        reply: convert.reply,
                        job: convert.job || null,
                    });
                    messages[messages.length - 1].content += `\n\n[工具结果] ${convert.reply}`;
                    await (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode, { allowTools: false });
                }
                else {
                    await (0, agent_1.callClaudeAgent)(cfg, systemPrompt, messages, res, chatMode, { allowTools: false });
                }
            }
            catch (e) {
                if (res.headersSent) {
                    (0, agent_1.writeSse)(res, { type: "error", text: e.message || "音乐助手处理失败" });
                    (0, agent_1.writeSse)(res, { type: "terminal", status: "failed" });
                    (0, agent_1.writeSse)(res, { type: "done" });
                    if (!res.writableEnded)
                        res.end();
                }
                else {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
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
        readMusicJsonBody(req).then(async (payload) => {
            try {
                const message = String(payload.message || "").trim();
                const chatMode = String(payload.mode || "bilibili");
                const intent = await (0, agent_1.resolveMusicIntentDecisionV2)({
                    config: (0, state_1.loadMusicAgentConfig)(),
                    message,
                    mode: chatMode,
                    history: payload.history,
                    sessionId: payload.session_id || payload.sessionId || "music-singleton",
                });
                if (intent.action === "none") {
                    return (0, utils_1.sendJson)(res, { success: true, intent: "none", keyword: "", action: { type: "none", intentDecision: intent }, reply: (0, agent_1.getMusicHelpText)(chatMode) });
                }
                if (intent.action === "convert") {
                    const convert = startMusicConvertJob(message, intent.searchQuery);
                    return (0, utils_1.sendJson)(res, { success: convert.ok, intent: "convert", keyword: intent.searchQuery, action: { type: "convert_music", intentDecision: intent }, reply: convert.reply, downloadJob: convert.job || null }, convert.ok ? 200 : 422);
                }
                const decision = await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({
                    intent,
                    aiRecommendationEnabled: (0, db_1.loadMusicConfig)()?.aiRecommendationEnabled !== false,
                    aiAutoSelectEnabled: (0, db_1.loadMusicConfig)()?.aiAutoSelectEnabled !== false,
                    modelConfig: (0, state_1.loadMusicAgentConfig)(),
                });
                const rows = decision.candidates.map(publicMusicCandidate);
                let command = null;
                if (intent.action === "play" && decision.status === "resolved" && decision.selectedCandidate) {
                    command = (0, state_1.enqueueMusicRemoteCommand)({ type: "play", keyword: decision.searchQuery, request_text: message, mode: decision.sourceMode, source: "music-chat-compat", decision, origin: { source: "music-chat", sessionId: "music-singleton" } });
                }
                (0, utils_1.sendJson)(res, {
                    success: decision.status !== "rejected",
                    intent: intent.action,
                    keyword: intent.searchQuery,
                    action: { type: intent.action === "play" ? "play_music" : "search_music", keyword: intent.searchQuery, intentDecision: intent, playbackDecision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision) },
                    decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision),
                    command: publicPlaybackCommand(command),
                    reply: decision.reply,
                    results: rows,
                }, decision.status === "rejected" ? 422 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "音乐请求处理失败", receipt: e?.semanticDecisionReceipt || null }, e?.semanticDecisionReceipt ? 503 : 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
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
                try {
                    await (0, bilibili_1.ensureBuvid3)();
                    await (0, bilibili_1.ensureWbiKey)();
                    const params = { bvid: bvid };
                    const signedQs = (0, bilibili_1.signBiliParams)(params);
                    const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                    const viewData = await (0, platform_http_1.musicPlatformJson)({
                        url: viewUrl,
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
                        },
                        timeoutMs: 10_000,
                        maxBytes: 2 * 1024 * 1024,
                    });
                    const cid = viewData?.data?.cid;
                    const aid = viewData?.data?.aid;
                    const duration = viewData?.data?.duration || 300;
                    if (!cid) {
                        return (0, utils_1.sendJson)(res, { success: true, danmaku: [] });
                    }
                    const xml = await (0, platform_http_1.musicPlatformText)({
                        url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`,
                        headers: {
                            "User-Agent": bilibili_1.BILI_UA,
                            "Referer": "https://www.bilibili.com/",
                            "Cookie": (0, bilibili_1.getBiliCookieHeader)()
                        },
                        timeoutMs: 10_000,
                        maxBytes: 8 * 1024 * 1024,
                    });
                    let replies = [];
                    if (aid) {
                        try {
                            const replyUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`;
                            const replyData = await (0, platform_http_1.musicPlatformJson)({
                                url: replyUrl,
                                headers: {
                                    "User-Agent": bilibili_1.BILI_UA,
                                    "Referer": "https://www.bilibili.com/",
                                    "Cookie": (0, bilibili_1.getBiliCookieHeader)(),
                                    "Accept": "application/json, text/plain, */*",
                                },
                                timeoutMs: 10_000,
                                maxBytes: 4 * 1024 * 1024,
                            });
                            if (replyData && replyData.code === 0 && replyData.data?.replies) {
                                replies = replyData.data.replies;
                            }
                        }
                        catch (replyErr) {
                            console.error("[Danmaku] Failed to fetch Bilibili replies:", replyErr);
                        }
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
                    (0, utils_1.sendJson)(res, { success: false, error: e.message });
                }
            }
            else {
                try {
                    const query = `${artist || ""} ${title}`.trim();
                    console.log("[NeteaseComments] searching for:", query);
                    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=5`;
                    const searchData = await (0, platform_http_1.musicPlatformJson)({
                        url: searchUrl,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        },
                        timeoutMs: 10_000,
                        maxBytes: 2 * 1024 * 1024,
                    });
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
                        return (0, platform_http_1.musicPlatformJson)({
                            url: commentsUrl,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                "Referer": "https://music.163.com/",
                            },
                            timeoutMs: 10_000,
                            maxBytes: 4 * 1024 * 1024,
                        }).catch(() => ({}));
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
        void (0, secure_multipart_1.parseSecureMultipartRequest)(req, {
            timeoutMs: 120_000,
            maxFiles: 10,
            maxRequestBytes: MUSIC_UPLOAD_MAX_BYTES + 2 * 1024 * 1024,
            maxFileBytes: MUSIC_UPLOAD_MAX_BYTES,
            maxTotalFileBytes: MUSIC_UPLOAD_MAX_BYTES,
            allowedExtensions: Array.from(MUSIC_EXTENSIONS),
        }).then(async (multipart) => {
            const uploaded = [];
            const duplicates = [];
            try {
                for (const file of multipart.files || []) {
                    const checksum = await checksumFile(file.savedPath);
                    const existing = (0, music_persistence_1.findMusicMediaAssetByChecksum)(checksum);
                    if (existing?.filename && fs.existsSync(path.join(library_1.MUSIC_DIR, existing.filename))) {
                        duplicates.push(existing.filename);
                        try {
                            fs.unlinkSync(file.savedPath);
                        }
                        catch { }
                        continue;
                    }
                    const metadata = await (0, music_catalog_1.probeMusicFile)(file.savedPath);
                    const filename = availableMusicFilename(file.filename, checksum);
                    const target = path.join(library_1.MUSIC_DIR, filename);
                    fs.renameSync(file.savedPath, target);
                    (0, music_persistence_1.upsertMusicMediaAsset)({
                        source: "local",
                        sourceId: checksum,
                        filename,
                        displayName: file.filename,
                        requestedQuality: "source",
                        actualQuality: metadata.bitrate ? `${Math.round(metadata.bitrate / 1000)}k` : "source",
                        ...metadata,
                        fileSize: fs.statSync(target).size,
                        fileChecksum: checksum,
                    });
                    uploaded.push(filename);
                }
                if (!uploaded.length && !duplicates.length)
                    throw new Error("没有检测到有效音频文件，请检查格式和文件内容");
                (0, music_catalog_1.scheduleMusicCatalogRescan)("upload");
                (0, utils_1.sendJson)(res, { success: true, uploaded, duplicates, index_status: "indexing" });
            }
            catch (error) {
                (0, secure_multipart_1.cleanupSecureMultipartFiles)(multipart.files || []);
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "上传音乐失败" }, 400);
            }
        }).catch((error) => {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "上传音乐失败" }, /超过/.test(error?.message || "") ? 413 : 400);
        });
        return true;
    }
    if (pathname === "/api/music/delete" && req.method === "POST") {
        readMusicJsonBody(req).then(async (body) => {
            try {
                const { filename } = body;
                if (!isSafeMusicFilename(filename))
                    return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
                if (body.expected_revision !== undefined && Number(body.expected_revision) !== Number(library_state_1.musicLibraryState.get().revision)) {
                    const drift = new Error("音乐库状态已经变化，请刷新后重试");
                    drift.code = "state_drift";
                    drift.statusCode = 409;
                    drift.currentRevision = library_state_1.musicLibraryState.get().revision;
                    throw drift;
                }
                const file = (0, music_catalog_1.resolveSafeMusicFile)(filename);
                fs.unlinkSync(file.filePath);
                const state = library_state_1.musicLibraryState.removeTrack(filename, body.expected_revision);
                const indexReceipt = await (0, music_catalog_1.ensureMusicCatalogTrackRemoved)(filename, "delete");
                (0, utils_1.sendJson)(res, {
                    success: true,
                    state,
                    index_status: indexReceipt.indexStatus,
                    index_generation: indexReceipt.activeGeneration,
                    index_receipt: indexReceipt,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message, code: e?.code, current_revision: e?.currentRevision }, Number(e?.statusCode || (e?.code === "state_drift" ? 409 : 400)));
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { error: error?.message || "读取请求失败" }, 400));
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
                    const searchData = await (0, platform_http_1.musicPlatformJson)({
                        url: searchUrl,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        },
                        timeoutMs: 10_000,
                        maxBytes: 2 * 1024 * 1024,
                    });
                    const songs = searchData?.result?.songs || [];
                    for (let i = 0; i < Math.min(songs.length, 10); i++) {
                        const songId = songs[i]?.id;
                        if (!songId)
                            continue;
                        try {
                            const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=1&yv=1`;
                            const lyricData = await (0, platform_http_1.musicPlatformJson)({
                                url: lyricUrl,
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                    "Referer": "https://music.163.com/",
                                },
                                timeoutMs: 10_000,
                                maxBytes: 4 * 1024 * 1024,
                            });
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
            try {
                await (0, bilibili_1.ensureBuvid3)();
                await (0, bilibili_1.ensureWbiKey)();
                const params = { bvid: targetBvid };
                const signedQs = (0, bilibili_1.signBiliParams)(params);
                const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                const viewData = await (0, platform_http_1.musicPlatformJson)({
                    url: viewUrl,
                    headers: {
                        "User-Agent": bilibili_1.BILI_UA,
                        "Referer": "https://www.bilibili.com/",
                        "Cookie": (0, bilibili_1.getBiliCookieHeader)(),
                        "Accept": "application/json, text/plain, */*"
                    },
                    timeoutMs: 10_000,
                    maxBytes: 2 * 1024 * 1024,
                });
                const subtitles = viewData?.data?.subtitle?.list || [];
                for (const subtitle of subtitles) {
                    const subUrl = subtitle?.subtitle_url;
                    if (!subUrl)
                        continue;
                    const fullSubUrl = subUrl.startsWith("//") ? `https:${subUrl}` : subUrl;
                    const subtitleHost = new URL(fullSubUrl).hostname.toLowerCase();
                    if (!(subtitleHost === "bilibili.com" || subtitleHost.endsWith(".bilibili.com") || subtitleHost.endsWith(".hdslb.com"))) {
                        continue;
                    }
                    const subData = await (0, platform_http_1.musicPlatformJson)({
                        url: fullSubUrl,
                        headers: {
                            "User-Agent": bilibili_1.BILI_UA,
                            "Referer": `https://www.bilibili.com/video/${targetBvid}`,
                        },
                        allowedHosts: [subtitleHost],
                        timeoutMs: 10_000,
                        maxBytes: 8 * 1024 * 1024,
                    });
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