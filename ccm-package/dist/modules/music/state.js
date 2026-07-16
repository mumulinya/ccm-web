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
exports.MUSIC_REMOTE_COMMANDS_FILE = exports.MUSIC_REMOTE_COMMAND_FILE = void 0;
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
const STALE_MS = 60_000;
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
    if (head)
        fs.writeFileSync(exports.MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(head, null, 2), "utf-8");
}
function markStale(commands) {
    const now = Date.now();
    let changed = false;
    for (const item of commands) {
        if (item.status !== "pending" && item.status !== "claimed")
            continue;
        const created = Date.parse(item.created_at || "") || 0;
        if (created && now - created > STALE_MS && item.status === "pending" && !item.claimed_at) {
            // Keep pending until claimed; only mark claimed-but-unacked as stale after timeout.
        }
        if (item.status === "claimed") {
            const claimed = Date.parse(item.claimed_at || "") || created;
            if (claimed && now - claimed > STALE_MS) {
                item.status = "stale";
                item.last_error = item.last_error || "播放指令超时未完成，请确认 CCM Web 已打开";
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
function enqueueMusicRemoteCommand(command) {
    const commands = markStale(readQueue());
    const payload = {
        id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        type: String(command?.type || "play"),
        keyword: String(command?.keyword || "").trim(),
        mode: String(command?.mode || "").trim() || undefined,
        source: String(command?.source || "global-agent"),
        created_at: nowIso(),
        status: "pending",
        attempts: 0,
    };
    if (!payload.keyword)
        throw new Error("缺少音乐关键词");
    commands.push(payload);
    writeQueue(commands);
    return payload;
}
function claimMusicRemoteCommand() {
    const commands = markStale(readQueue());
    const alreadyClaimed = commands.find(item => item.status === "claimed");
    if (alreadyClaimed)
        return alreadyClaimed;
    const next = commands.find(item => item.status === "pending");
    if (!next)
        return null;
    next.status = "claimed";
    next.claimed_at = nowIso();
    next.attempts = Number(next.attempts || 0) + 1;
    writeQueue(commands);
    return next;
}
/** Remove a command from the queue so the App poller will not also play it (Web client_effect path). */
function takeMusicRemoteCommand(id) {
    const commandId = String(id || "").trim();
    if (!commandId)
        return null;
    const commands = markStale(readQueue());
    const index = commands.findIndex(item => item.id === commandId);
    if (index < 0)
        return null;
    const [item] = commands.splice(index, 1);
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
    const sameClaim = claimMusicRemoteCommand();
    const ackOk = ackMusicRemoteCommand({ id: a.id, status: "success" });
    const aGone = !listMusicRemoteCommands().some(item => item.id === a.id);
    const claimedB = claimMusicRemoteCommand();
    const failAck = ackMusicRemoteCommand({ id: b.id, status: "failed", error: "boom" });
    const bRetryable = listMusicRemoteCommands().some(item => item.id === b.id && item.status === "pending");
    ackMusicRemoteCommand({ id: b.id, status: "success" });
    for (const item of listMusicRemoteCommands().filter(row => String(row.source || "").includes("self-test"))) {
        ackMusicRemoteCommand({ id: item.id, status: "success" });
    }
    return {
        success: claimed?.id === a.id
            && sameClaim?.id === a.id
            && stillQueued
            && ackOk.success === true
            && aGone
            && claimedB?.id === b.id
            && failAck.success === true
            && bRetryable,
        checks: {
            claimFirst: claimed?.id === a.id,
            claimIdempotent: sameClaim?.id === a.id,
            secondStillPending: stillQueued,
            ackRemoves: aGone,
            failRequeues: bRetryable,
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