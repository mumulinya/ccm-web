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
exports.claimMusicRemoteCommand = claimMusicRemoteCommand;
exports.takeMusicRemoteCommand = takeMusicRemoteCommand;
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
exports.MUSIC_REMOTE_COMMAND_FILE = path.join(utils_1.CCM_DIR, "music-remote-command.json");
exports.MUSIC_REMOTE_COMMANDS_FILE = path.join(utils_1.CCM_DIR, "music-remote-commands.json");
/** Claimed commands not acked within this window return to pending for a single retry owner. */
const CLAIM_LEASE_MS = 60_000;
const MAX_QUEUE = 50;
function nowIso() {
    return new Date().toISOString();
}
function ensureDir() {
    fs.mkdirSync(path.dirname(exports.MUSIC_REMOTE_COMMANDS_FILE), { recursive: true });
}
function readQueue() {
    try {
        if (fs.existsSync(exports.MUSIC_REMOTE_COMMANDS_FILE)) {
            const data = JSON.parse(fs.readFileSync(exports.MUSIC_REMOTE_COMMANDS_FILE, "utf-8"));
            if (Array.isArray(data?.commands))
                return data.commands;
            if (Array.isArray(data))
                return data;
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
function writeQueue(commands) {
    ensureDir();
    const trimmed = commands.slice(-MAX_QUEUE);
    fs.writeFileSync(exports.MUSIC_REMOTE_COMMANDS_FILE, JSON.stringify({ version: 1, updated_at: nowIso(), commands: trimmed }, null, 2), "utf-8");
    // Keep a pointer file for older diagnostics that still read the single-command path.
    const head = trimmed.find(item => item.status === "pending" || item.status === "claimed") || trimmed[trimmed.length - 1] || null;
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
        if (item.status !== "pending" && item.status !== "claimed")
            continue;
        const created = Date.parse(item.created_at || "") || 0;
        if (item.status === "claimed") {
            const claimed = Date.parse(item.claimed_at || "") || created;
            if (claimed && now - claimed > CLAIM_LEASE_MS) {
                // Lease expired: requeue for another single owner instead of re-delivering the same claim.
                if ((item.attempts || 0) >= 3) {
                    item.status = "stale";
                    item.last_error = item.last_error || "播放指令超时未完成，请确认 CCM Web 已打开";
                }
                else {
                    item.status = "pending";
                    item.claimed_at = undefined;
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
        id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        type,
        keyword: String(command?.keyword || "").trim() || (type === "stop" ? exports.STOP_MUSIC_KEYWORD : ""),
        mode: String(command?.mode || "").trim() || undefined,
        source: String(command?.source || "global-agent"),
        created_at: nowIso(),
        status: "pending",
        attempts: 0,
    };
    if (!payload.keyword)
        throw new Error("缺少音乐关键词");
    // Stop should cancel not-yet-played songs so they do not restart after stopping.
    if (type === "stop") {
        commands = commands.filter(item => !(item.status === "pending" && item.type === "play"));
    }
    else if (type === "play") {
        // 新点歌替换尚未播放的旧点歌，避免队列积压播错歌
        commands = commands.filter(item => !(item.status === "pending" && item.type === "play"));
    }
    commands.push(payload);
    writeQueue(commands);
    return payload;
}
function claimMusicRemoteCommand() {
    const commands = markStale(readQueue());
    // Do not re-deliver an in-flight claim; the owning poller must ack (or wait for lease expiry).
    if (commands.some(item => item.status === "claimed"))
        return null;
    const next = commands.find(item => item.status === "pending");
    if (!next)
        return null;
    next.status = "claimed";
    next.claimed_at = nowIso();
    next.attempts = Number(next.attempts || 0) + 1;
    writeQueue(commands);
    return next;
}
/**
 * Web client_effect path: remove a pending command so the App poller will not also play it.
 * Returns null if missing or already claimed by the poller (do not steal / double-play).
 */
function takeMusicRemoteCommand(id) {
    const commandId = String(id || "").trim();
    if (!commandId)
        return null;
    const commands = markStale(readQueue());
    const index = commands.findIndex(item => item.id === commandId);
    if (index < 0)
        return null;
    const item = commands[index];
    if (item.status !== "pending")
        return null;
    commands.splice(index, 1);
    writeQueue(commands);
    return item;
}
function ackMusicRemoteCommand(input) {
    const id = String(input?.id || "").trim();
    if (!id)
        return { success: false, error: "缺少指令 ID" };
    const commands = markStale(readQueue());
    const index = commands.findIndex(item => item.id === id);
    if (index < 0)
        return { success: false, error: "指令不存在" };
    const item = commands[index];
    if (input.status === "success") {
        commands.splice(index, 1);
        writeQueue(commands);
        return { success: true, removed: true, command: item };
    }
    item.status = (item.attempts || 0) >= 3 ? "failed" : "pending";
    item.last_error = String(input.error || "播放失败");
    item.claimed_at = undefined;
    writeQueue(commands);
    return { success: true, removed: false, command: item };
}
/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
function loadMusicRemoteCommand() {
    const commands = markStale(readQueue());
    return commands.find(item => item.status === "pending" || item.status === "claimed") || null;
}
function listMusicRemoteCommands() {
    return markStale(readQueue());
}
function runMusicRemoteCommandQueueSelfTest() {
    // Use real queue then remove self-test rows so local CCM state stays clean.
    for (const item of listMusicRemoteCommands().filter(row => String(row.source || "").includes("self-test"))) {
        ackMusicRemoteCommand({ id: item.id, status: "success" });
    }
    const a = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-a", source: "self-test" });
    const b = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-b", source: "self-test" });
    const claimed = claimMusicRemoteCommand();
    const stillQueued = listMusicRemoteCommands().some(item => item.id === b.id && item.status === "pending");
    const noRedeliver = claimMusicRemoteCommand() == null;
    const takeWhileClaimed = takeMusicRemoteCommand(a.id) == null;
    const ackOk = ackMusicRemoteCommand({ id: a.id, status: "success" });
    const aGone = !listMusicRemoteCommands().some(item => item.id === a.id);
    const takePending = takeMusicRemoteCommand(b.id);
    const bTakenGone = takePending?.id === b.id && !listMusicRemoteCommands().some(item => item.id === b.id);
    const c = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-c", source: "self-test" });
    const claimedC = claimMusicRemoteCommand();
    const failAck = ackMusicRemoteCommand({ id: c.id, status: "failed", error: "boom" });
    const cRetryable = listMusicRemoteCommands().some(item => item.id === c.id && item.status === "pending");
    ackMusicRemoteCommand({ id: c.id, status: "success" });
    for (const item of listMusicRemoteCommands().filter(row => String(row.source || "").includes("self-test"))) {
        ackMusicRemoteCommand({ id: item.id, status: "success" });
    }
    return {
        success: claimed?.id === a.id
            && noRedeliver
            && takeWhileClaimed
            && stillQueued
            && ackOk.success === true
            && aGone
            && bTakenGone
            && claimedC?.id === c.id
            && failAck.success === true
            && cRetryable,
        checks: {
            claimFirst: claimed?.id === a.id,
            claimNotRedelivered: noRedeliver,
            takeDoesNotStealClaimed: takeWhileClaimed,
            secondStillPending: stillQueued,
            ackRemoves: aGone,
            takePendingOnly: bTakenGone,
            failRequeues: cRetryable,
        },
    };
}
function loadMusicAgentConfig() {
    const llm = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const music = (0, db_1.loadMusicConfig)();
    return {
        ...llm,
        proxy: music.proxy || "",
        defaultMode: String(music.defaultMode || music.mode || "cloud"),
    };
}
function publicMusicAgentConfig() {
    const config = loadMusicAgentConfig();
    return {
        ...(0, group_orchestrator_1.publicOrchestratorConfig)(config),
        source: "orchestrator",
        sourceLabel: "系统设置 / 统一大模型配置",
        defaultMode: config.defaultMode || "cloud",
    };
}
//# sourceMappingURL=state.js.map