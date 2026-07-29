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
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const runtime_events_1 = require("../../system/runtime-events");
exports.MUSIC_REMOTE_COMMAND_FILE = path.join(utils_1.CCM_DIR, "music-remote-command.json");
exports.MUSIC_REMOTE_COMMANDS_FILE = path.join(utils_1.CCM_DIR, "music-remote-commands.json");
/** The browser renews a short lease while preparing/downloading/playing. */
const CLAIM_LEASE_MS = 15_000;
const MAX_QUEUE = 50;
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
function ensureDir() {
    fs.mkdirSync(path.dirname(exports.MUSIC_REMOTE_COMMANDS_FILE), { recursive: true });
}
function readQueue() {
    try {
        if (fs.existsSync(exports.MUSIC_REMOTE_COMMANDS_FILE)) {
            const data = JSON.parse(fs.readFileSync(exports.MUSIC_REMOTE_COMMANDS_FILE, "utf-8"));
            const rows = Array.isArray(data?.commands) ? data.commands : Array.isArray(data) ? data : [];
            return rows.map((item, index) => normalizeRemoteCommand(item, index)).filter(Boolean);
        }
    }
    catch { }
    // Migrate legacy single-command file into the queue once.
    try {
        if (fs.existsSync(exports.MUSIC_REMOTE_COMMAND_FILE)) {
            const legacy = JSON.parse(fs.readFileSync(exports.MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
            if (legacy?.id && legacy?.keyword && !legacy.consumed) {
                const migrated = {
                    id: String(legacy.id),
                    type: String(legacy.type || "play"),
                    keyword: String(legacy.keyword),
                    request_text: String(legacy.request_text || legacy.requestText || legacy.keyword || ""),
                    mode: String(legacy.mode || ""),
                    source: String(legacy.source || "legacy"),
                    created_at: String(legacy.created_at || nowIso()),
                    status: "pending",
                    attempts: 0,
                };
                writeQueue([migrated]);
                return [migrated];
            }
        }
    }
    catch { }
    return [];
}
function normalizeRemoteCommand(item, index = 0) {
    if (!item?.id || !item?.keyword)
        return null;
    const legacyStatus = String(item.status || (item.consumed ? "completed" : "pending"));
    const status = legacyStatus === "stale"
        ? "failed"
        : (["pending", "resolving", "ready", "claimed", "playing", "needs_user_gesture", "completed", "failed", "superseded", "cancelled"].includes(legacyStatus)
            ? legacyStatus
            : "pending");
    return {
        ...item,
        schema: "ccm-music-playback-command-v2",
        version: 2,
        type: String(item.type || "play"),
        keyword: String(item.keyword || ""),
        request_text: String(item.request_text || item.requestText || item.keyword || ""),
        created_at: String(item.created_at || nowIso()),
        status,
        generation: Math.max(1, Number(item.generation || index + 1)),
        attempts: Math.max(0, Number(item.attempts || 0)),
    };
}
function writeQueue(commands) {
    ensureDir();
    const trimmed = commands.slice(-MAX_QUEUE);
    const temp = `${exports.MUSIC_REMOTE_COMMANDS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ version: 2, updated_at: nowIso(), commands: trimmed }, null, 2), "utf-8");
    fs.renameSync(temp, exports.MUSIC_REMOTE_COMMANDS_FILE);
    // Keep a pointer file for older diagnostics that still read the single-command path.
    const head = trimmed.find(item => ["pending", "resolving", "ready", "claimed", "playing", "needs_user_gesture"].includes(item.status)) || trimmed[trimmed.length - 1] || null;
    if (head) {
        fs.writeFileSync(exports.MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(head, null, 2), "utf-8");
    }
    else if (fs.existsSync(exports.MUSIC_REMOTE_COMMAND_FILE)) {
        // 队列空时清掉旧 pointer，避免误以为仍有 claimed 指令
        try {
            fs.unlinkSync(exports.MUSIC_REMOTE_COMMAND_FILE);
        }
        catch { }
    }
}
function markStale(commands) {
    const now = Date.now();
    let changed = false;
    for (const item of commands) {
        if (!["claimed", "playing"].includes(item.status))
            continue;
        const created = Date.parse(item.created_at || "") || 0;
        if (item.status === "claimed" || item.status === "playing") {
            const leaseExpires = Date.parse(item.lease_expires_at || "") || ((Date.parse(item.claimed_at || "") || created) + CLAIM_LEASE_MS);
            if (leaseExpires && now > leaseExpires) {
                // Lease expired: requeue for another single owner instead of re-delivering the same claim.
                if ((item.attempts || 0) >= 3) {
                    item.status = "failed";
                    item.last_error = item.last_error || "播放指令超时未完成，请确认 CCM Web 已打开";
                    item.terminal_at = nowIso();
                }
                else {
                    item.status = item.decision ? "ready" : "pending";
                    item.claimed_at = undefined;
                    item.lease_expires_at = undefined;
                    item.last_error = item.last_error || "播放指令租约过期，等待重新领取";
                }
                changed = true;
            }
        }
    }
    if (changed)
        writeQueue(commands);
    return commands;
}
/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
function saveMusicRemoteCommand(command) {
    return enqueueMusicRemoteCommand(command);
}
exports.STOP_MUSIC_KEYWORD = "__stop__";
function enqueueMusicRemoteCommand(command) {
    let commands = markStale(readQueue());
    const type = String(command?.type || "play").trim() || "play";
    const payload = {
        schema: "ccm-music-playback-command-v2",
        version: 2,
        id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        type,
        keyword: String(command?.keyword || "").trim() || (type === "stop" ? exports.STOP_MUSIC_KEYWORD : ""),
        request_text: String(command?.request_text || command?.requestText || command?.keyword || "").trim() || undefined,
        mode: String(command?.mode || "").trim() || undefined,
        source: String(command?.source || "global-agent"),
        created_at: nowIso(),
        status: command?.decision ? "ready" : "pending",
        generation: Math.max(1, ...commands.map(item => Number(item.generation || 0))) + 1,
        decision: command?.decision || undefined,
        origin: command?.origin || undefined,
        attempts: 0,
    };
    if (!payload.keyword)
        throw new Error("缺少音乐关键词");
    const active = new Set(["pending", "resolving", "ready", "claimed", "playing", "needs_user_gesture"]);
    // A new command invalidates every older active play generation. Late downloads may finish,
    // but their completion receipt cannot regain playback ownership.
    if (type === "stop") {
        for (const item of commands) {
            if (item.type === "play" && active.has(item.status)) {
                item.status = "cancelled";
                item.terminal_at = nowIso();
                item.last_error = "已由停止指令取消";
                emitPlaybackCommandEvent(item);
            }
        }
    }
    else if (type === "play") {
        for (const item of commands) {
            if (item.type === "play" && active.has(item.status)) {
                item.status = "superseded";
                item.terminal_at = nowIso();
                item.last_error = "已被更新的点歌请求替代";
                emitPlaybackCommandEvent(item);
            }
        }
    }
    commands.push(payload);
    writeQueue(commands);
    emitPlaybackCommandEvent(payload);
    return payload;
}
function peekMusicRemoteCommand() {
    const commands = markStale(readQueue());
    return commands.find(item => item.status === "ready" || item.status === "pending") || null;
}
function claimMusicRemoteCommand(commandId = "") {
    const commands = markStale(readQueue());
    const next = commandId
        ? commands.find(item => item.id === commandId)
        : commands.find(item => item.status === "ready" || item.status === "pending");
    if (!next)
        return null;
    if (next.status !== "ready" && next.status !== "pending")
        return null;
    if (next.decision?.expiresAt && Date.parse(String(next.decision.expiresAt)) <= Date.now()) {
        next.status = "failed";
        next.last_error = "播放决定已过期，请重新点歌";
        next.terminal_at = nowIso();
        writeQueue(commands);
        emitPlaybackCommandEvent(next);
        return null;
    }
    next.status = "claimed";
    next.claimed_at = nowIso();
    next.lease_expires_at = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
    next.attempts = Number(next.attempts || 0) + 1;
    writeQueue(commands);
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
    const commands = markStale(readQueue());
    const item = commands.find(row => row.id === String(input.id || ""));
    if (!item)
        return { success: false, error: "指令不存在" };
    if (Number(input.generation || item.generation) !== Number(item.generation))
        return { success: false, error: "播放generation不匹配" };
    if (!["claimed", "playing", "needs_user_gesture"].includes(item.status))
        return { success: false, error: `当前状态不能续租：${item.status}` };
    const previousStatus = item.status;
    if (input.status)
        item.status = input.status;
    item.lease_expires_at = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
    writeQueue(commands);
    if (item.status !== previousStatus)
        emitPlaybackCommandEvent(item);
    return { success: true, command: item };
}
function completeMusicRemoteCommand(input) {
    const commands = markStale(readQueue());
    const item = commands.find(row => row.id === String(input.id || ""));
    if (!item)
        return { success: false, error: "指令不存在" };
    if (Number(input.generation || item.generation) !== Number(item.generation))
        return { success: false, error: "播放generation不匹配" };
    const terminal = new Set(["completed", "failed", "superseded", "cancelled"]);
    if (terminal.has(item.status)) {
        if (item.status === input.status)
            return { success: true, duplicate: true, command: item };
        return { success: false, error: "播放指令已经进入不可修改的终态" };
    }
    if (["completed", "failed", "needs_user_gesture"].includes(input.status) && !["claimed", "playing", "needs_user_gesture"].includes(item.status)) {
        return { success: false, error: `当前状态不能提交播放结果：${item.status}` };
    }
    item.status = input.status;
    item.result = input.result || undefined;
    item.last_error = String(input.error || "").slice(0, 500) || undefined;
    item.lease_expires_at = undefined;
    if (input.status !== "needs_user_gesture")
        item.terminal_at = nowIso();
    writeQueue(commands);
    emitPlaybackCommandEvent(item);
    return { success: true, command: item };
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
        const commands = readQueue();
        const item = commands.find(row => row.id === id);
        item.status = item.decision ? "ready" : "pending";
        item.last_error = String(input.error || "播放失败");
        item.claimed_at = undefined;
        item.lease_expires_at = undefined;
        writeQueue(commands);
        return { success: true, removed: false, command: item };
    }
    return { ...completeMusicRemoteCommand({ id, generation: current.generation, status: "failed", error: input.error || "播放失败" }), removed: false };
}
/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
function loadMusicRemoteCommand() {
    const commands = markStale(readQueue());
    return commands.find(item => ["pending", "ready", "claimed", "playing", "needs_user_gesture"].includes(item.status)) || null;
}
function listMusicRemoteCommands() {
    return markStale(readQueue());
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