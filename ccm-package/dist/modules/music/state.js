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
exports.STOP_MUSIC_KEYWORD = exports.MUSIC_REMOTE_COMMANDS_FILE = exports.MUSIC_REMOTE_COMMAND_FILE = void 0;
exports.saveMusicRemoteCommand = saveMusicRemoteCommand;
exports.enqueueMusicRemoteCommand = enqueueMusicRemoteCommand;
exports.peekMusicRemoteCommand = peekMusicRemoteCommand;
exports.claimMusicRemoteCommand = claimMusicRemoteCommand;
exports.takeMusicRemoteCommand = takeMusicRemoteCommand;
exports.heartbeatMusicRemoteCommand = heartbeatMusicRemoteCommand;
exports.completeMusicRemoteCommand = completeMusicRemoteCommand;
exports.ackMusicRemoteCommand = ackMusicRemoteCommand;
exports.loadMusicRemoteCommand = loadMusicRemoteCommand;
exports.listMusicRemoteCommands = listMusicRemoteCommands;
exports.runMusicRemoteCommandQueueSelfTest = runMusicRemoteCommandQueueSelfTest;
exports.loadMusicAgentConfig = loadMusicAgentConfig;
exports.publicMusicAgentConfig = publicMusicAgentConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const runtime_events_1 = require("../../system/runtime-events");
const music_persistence_1 = require("./music-persistence");
exports.MUSIC_REMOTE_COMMAND_FILE = path.join(utils_1.CCM_DIR, "music-remote-command.json");
exports.MUSIC_REMOTE_COMMANDS_FILE = path.join(utils_1.CCM_DIR, "music-remote-commands.json");
function nowIso() {
    return new Date().toISOString();
}
function playbackCommandTitle(command) {
    const selected = command.decision?.selectedCandidate;
    const title = String(selected?.title || command.keyword || "音乐").trim();
    const artist = String(selected?.artist || "").trim();
    return artist ? `${title} - ${artist}` : title;
}
function emitPlaybackCommandEvent(command) {
    const status = String(command.status || "");
    (0, runtime_events_1.publishRuntimeEvent)("music", `music.playback.${status}`, {
        commandId: command.id,
        generation: command.generation,
        status,
        source: command.origin?.source || command.source || "music",
        sessionId: command.origin?.sessionId || "",
        messageId: command.origin?.messageId || "",
        title: playbackCommandTitle(command),
        reason: command.last_error || "",
    });
    if (!["completed", "failed", "superseded", "cancelled", "needs_user_gesture"].includes(status))
        return;
    const source = String(command.origin?.source || command.source || "").toLowerCase();
    const sessionId = String(command.origin?.sessionId || "").trim();
    if (!source.includes("feishu") || !sessionId)
        return;
    const label = playbackCommandTitle(command);
    const terminal = new Set(["completed", "failed", "superseded", "cancelled"]);
    const title = status === "completed"
        ? "音乐已开始播放"
        : status === "needs_user_gesture"
            ? "需要点击播放"
            : status === "superseded"
                ? "点歌请求已更新"
                : status === "cancelled"
                    ? "点歌请求已取消"
                    : "音乐播放失败";
    const markdown = status === "completed"
        ? `正在播放：${label}`
        : status === "needs_user_gesture"
            ? `已准备好：${label}\n\n浏览器阻止了自动播放，请在 CCM 音乐页面点击播放。`
            : status === "superseded"
                ? `原点歌「${label}」已被更新的播放请求替代。`
                : status === "cancelled"
                    ? `已取消播放「${label}」。`
                    : `播放「${label}」失败：${command.last_error || "播放器未返回可验证结果"}`;
    void (0, feishu_channel_1.notifyFeishuTaskStage)({
        stage: terminal.has(status) ? (status === "completed" ? "completion" : status) : "waiting_user",
        title,
        markdown,
        sessionId,
        cardKey: `music-playback:${command.id}`,
        dedupeKey: `music-playback:${command.id}:${status}`,
    }).catch(() => { });
}
function readQueue() {
    return (0, music_persistence_1.listPersistedMusicCommands)();
}
function writeQueue(commands) {
    (0, music_persistence_1.replacePersistedMusicCommandsForTest)(commands);
}
/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
function saveMusicRemoteCommand(command) {
    return enqueueMusicRemoteCommand(command);
}
exports.STOP_MUSIC_KEYWORD = "__stop__";
function enqueueMusicRemoteCommand(command) {
    const before = readQueue();
    const payload = (0, music_persistence_1.enqueuePersistedMusicCommand)(command);
    const after = readQueue();
    for (const previous of before) {
        const updated = after.find(item => item.id === previous.id);
        if (updated && updated.status !== previous.status)
            emitPlaybackCommandEvent(updated);
    }
    emitPlaybackCommandEvent(payload);
    return payload;
}
function peekMusicRemoteCommand() {
    return (0, music_persistence_1.peekPersistedMusicCommand)();
}
function claimMusicRemoteCommand(commandId = "", generation) {
    const next = (0, music_persistence_1.claimPersistedMusicCommand)({ id: commandId || undefined, generation });
    if (next)
        emitPlaybackCommandEvent(next);
    return next;
}
/**
 * Web client_effect path: remove a pending command so the App poller will not also play it.
 * Returns null if missing or already claimed by the poller (do not steal / double-play).
 */
function takeMusicRemoteCommand(id) {
    return claimMusicRemoteCommand(String(id || "").trim());
}
function heartbeatMusicRemoteCommand(input) {
    const previous = readQueue().find(item => item.id === input.id);
    const result = (0, music_persistence_1.heartbeatPersistedMusicCommand)(input);
    if (result.success && result.command?.status !== previous?.status)
        emitPlaybackCommandEvent(result.command);
    return result;
}
function completeMusicRemoteCommand(input) {
    const result = (0, music_persistence_1.completePersistedMusicCommand)(input);
    if (result.success && result.command)
        emitPlaybackCommandEvent(result.command);
    return result;
}
function ackMusicRemoteCommand(input) {
    const id = String(input?.id || "").trim();
    if (!id)
        return { success: false, error: "缺少指令 ID" };
    const current = readQueue().find(item => item.id === id);
    if (!current)
        return { success: false, error: "指令不存在" };
    if (input.status === "success")
        return { ...completeMusicRemoteCommand({ id, generation: current.generation, status: "completed" }), removed: false };
    if ((current.attempts || 0) < 3 && !["superseded", "cancelled"].includes(current.status)) {
        return {
            ...(0, music_persistence_1.requeuePersistedMusicCommand)({ id, generation: current.generation, error: input.error || "播放失败" }),
            removed: false,
        };
    }
    return { ...completeMusicRemoteCommand({ id, generation: current.generation, status: "failed", error: input.error || "播放失败" }), removed: false };
}
/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
function loadMusicRemoteCommand() {
    const commands = readQueue();
    return commands.find(item => ["pending", "ready", "claimed", "playing", "needs_user_gesture"].includes(item.status)) || null;
}
function listMusicRemoteCommands() {
    return readQueue();
}
function runMusicRemoteCommandQueueSelfTest() {
    const original = readQueue();
    writeQueue([]);
    try {
        const a = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-a", request_text: "我心情不好，给我播放一首歌", source: "self-test" });
        const peeked = peekMusicRemoteCommand();
        const peekDidNotClaim = peeked?.id === a.id && listMusicRemoteCommands().find(item => item.id === a.id)?.status === "pending";
        const claimed = claimMusicRemoteCommand();
        const b = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-b", source: "self-test" });
        const stillQueued = listMusicRemoteCommands().some(item => item.id === b.id && item.status === "pending");
        const aSuperseded = listMusicRemoteCommands().some(item => item.id === a.id && item.status === "superseded");
        const claimedB = claimMusicRemoteCommand(b.id);
        const heartbeatB = heartbeatMusicRemoteCommand({ id: b.id, generation: claimedB?.generation, status: "playing" });
        const completedB = completeMusicRemoteCommand({ id: b.id, generation: claimedB?.generation, status: "completed", result: { title: "self-test-b" } });
        const bCompleted = listMusicRemoteCommands().some(item => item.id === b.id && item.status === "completed");
        const c = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-c", source: "self-test" });
        const claimedC = claimMusicRemoteCommand();
        const failAck = ackMusicRemoteCommand({ id: c.id, status: "failed", error: "boom" });
        const cRetryable = listMusicRemoteCommands().some(item => item.id === c.id && item.status === "pending");
        return {
            success: claimed?.id === a.id
                && claimed?.request_text === "我心情不好，给我播放一首歌"
                && peekDidNotClaim
                && stillQueued
                && aSuperseded
                && claimedB?.id === b.id
                && heartbeatB.success === true
                && completedB.success === true
                && bCompleted
                && claimedC?.id === c.id
                && failAck.success === true
                && cRetryable,
            checks: {
                peekDoesNotClaim: peekDidNotClaim,
                claimFirst: claimed?.id === a.id,
                requestTextPreserved: claimed?.request_text === "我心情不好，给我播放一首歌",
                latestSupersedesClaimed: aSuperseded,
                secondStillPending: stillQueued,
                latestCanClaimImmediately: claimedB?.id === b.id,
                heartbeatRenewsLease: heartbeatB.success === true,
                terminalReceiptPersisted: bCompleted,
                failRequeues: cRetryable,
            },
        };
    }
    finally {
        writeQueue(original);
    }
}
function loadMusicAgentConfig() {
    const llm = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const music = (0, db_1.loadMusicConfig)();
    let boundaryGeneration = 0;
    try {
        const memory = JSON.parse(fs.readFileSync(path.join(utils_1.CCM_DIR, "music-agent-memory.json"), "utf8"));
        boundaryGeneration = Math.max(0, Number(memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0));
    }
    catch { }
    return {
        ...llm,
        contextEngineScope: "music",
        contextEngineScopeId: "music-agent",
        contextEngineSessionId: "music-agent",
        contextEngineBoundaryGeneration: boundaryGeneration,
        contextEngineSource: "music_agent",
        proxy: music.proxy || "",
        weatherLocation: String(music.weatherLocation || ""),
        defaultMode: String(music.defaultMode || music.mode || "cloud"),
        quality: ["standard", "high", "very_high", "source"].includes(String(music.quality)) ? String(music.quality) : "high",
        fadeSeconds: Math.max(0, Math.min(8, Number(music.fadeSeconds) || 0)),
        volumeNormalization: music.volumeNormalization === true,
        rememberProgress: music.rememberProgress !== false,
        sleepTimerMinutes: Math.max(0, Math.min(180, Number(music.sleepTimerMinutes) || 0)),
        aiRecommendationEnabled: music.aiRecommendationEnabled !== false,
        aiEmotionEnabled: music.aiEmotionEnabled !== false,
        aiAutoSelectEnabled: music.aiAutoSelectEnabled !== false,
    };
}
function publicMusicAgentConfig() {
    const config = loadMusicAgentConfig();
    return {
        ...(0, group_orchestrator_1.publicOrchestratorConfig)(config),
        source: "orchestrator",
        sourceLabel: "系统设置 / 统一大模型配置",
        weatherLocation: config.weatherLocation || "",
        defaultMode: config.defaultMode || "cloud",
        quality: config.quality,
        fadeSeconds: config.fadeSeconds,
        volumeNormalization: config.volumeNormalization,
        rememberProgress: config.rememberProgress,
        sleepTimerMinutes: config.sleepTimerMinutes,
        aiRecommendationEnabled: config.aiRecommendationEnabled,
        aiEmotionEnabled: config.aiEmotionEnabled,
        aiAutoSelectEnabled: config.aiAutoSelectEnabled,
    };
}
//# sourceMappingURL=state.js.map