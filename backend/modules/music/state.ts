import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";

export const MUSIC_REMOTE_COMMAND_FILE = path.join(CCM_DIR, "music-remote-command.json");
export const MUSIC_REMOTE_COMMANDS_FILE = path.join(CCM_DIR, "music-remote-commands.json");
/** Claimed commands not acked within this window return to pending for a single retry owner. */
const CLAIM_LEASE_MS = 60_000;
const MAX_QUEUE = 50;

type MusicRemoteCommand = {
  id: string;
  type: string;
  keyword: string;
  request_text?: string;
  mode?: string;
  source?: string;
  created_at: string;
  status: "pending" | "claimed" | "failed" | "stale";
  claimed_at?: string;
  attempts?: number;
  last_error?: string;
  consumed?: boolean;
  consumed_at?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDir() {
  fs.mkdirSync(path.dirname(MUSIC_REMOTE_COMMANDS_FILE), { recursive: true });
}

function readQueue(): MusicRemoteCommand[] {
  try {
    if (fs.existsSync(MUSIC_REMOTE_COMMANDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MUSIC_REMOTE_COMMANDS_FILE, "utf-8"));
      if (Array.isArray(data?.commands)) return data.commands;
      if (Array.isArray(data)) return data;
    }
  } catch {}
  // Migrate legacy single-command file into the queue once.
  try {
    if (fs.existsSync(MUSIC_REMOTE_COMMAND_FILE)) {
      const legacy = JSON.parse(fs.readFileSync(MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
      if (legacy?.id && legacy?.keyword && !legacy.consumed) {
        const migrated: MusicRemoteCommand = {
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
  } catch {}
  return [];
}

function writeQueue(commands: MusicRemoteCommand[]) {
  ensureDir();
  const trimmed = commands.slice(-MAX_QUEUE);
  fs.writeFileSync(MUSIC_REMOTE_COMMANDS_FILE, JSON.stringify({ version: 1, updated_at: nowIso(), commands: trimmed }, null, 2), "utf-8");
  // Keep a pointer file for older diagnostics that still read the single-command path.
  const head = trimmed.find(item => item.status === "pending" || item.status === "claimed") || trimmed[trimmed.length - 1] || null;
  if (head) {
    fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(head, null, 2), "utf-8");
  } else if (fs.existsSync(MUSIC_REMOTE_COMMAND_FILE)) {
    // 队列空时清掉旧 pointer，避免误以为仍有 claimed 指令
    try { fs.unlinkSync(MUSIC_REMOTE_COMMAND_FILE); } catch {}
  }
}

function markStale(commands: MusicRemoteCommand[]) {
  const now = Date.now();
  let changed = false;
  for (const item of commands) {
    if (item.status !== "pending" && item.status !== "claimed") continue;
    const created = Date.parse(item.created_at || "") || 0;
    if (item.status === "claimed") {
      const claimed = Date.parse(item.claimed_at || "") || created;
      if (claimed && now - claimed > CLAIM_LEASE_MS) {
        // Lease expired: requeue for another single owner instead of re-delivering the same claim.
        if ((item.attempts || 0) >= 3) {
          item.status = "stale";
          item.last_error = item.last_error || "播放指令超时未完成，请确认 CCM Web 已打开";
        } else {
          item.status = "pending";
          item.claimed_at = undefined;
          item.last_error = item.last_error || "播放指令租约过期，等待重新领取";
        }
        changed = true;
      }
    }
  }
  if (changed) writeQueue(commands);
  return commands;
}

/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
export function saveMusicRemoteCommand(command: any) {
  return enqueueMusicRemoteCommand(command);
}

export const STOP_MUSIC_KEYWORD = "__stop__";

export function enqueueMusicRemoteCommand(command: any) {
  let commands = markStale(readQueue());
  const type = String(command?.type || "play").trim() || "play";
  const payload: MusicRemoteCommand = {
    id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    type,
    keyword: String(command?.keyword || "").trim() || (type === "stop" ? STOP_MUSIC_KEYWORD : ""),
    request_text: String(command?.request_text || command?.requestText || command?.keyword || "").trim() || undefined,
    mode: String(command?.mode || "").trim() || undefined,
    source: String(command?.source || "global-agent"),
    created_at: nowIso(),
    status: "pending",
    attempts: 0,
  };
  if (!payload.keyword) throw new Error("缺少音乐关键词");
  // Stop should cancel not-yet-played songs so they do not restart after stopping.
  if (type === "stop") {
    commands = commands.filter(item => !(item.status === "pending" && item.type === "play"));
  } else if (type === "play") {
    // 新点歌替换尚未播放的旧点歌，避免队列积压播错歌
    commands = commands.filter(item => !(item.status === "pending" && item.type === "play"));
  }
  commands.push(payload);
  writeQueue(commands);
  return payload;
}

export function claimMusicRemoteCommand() {
  const commands = markStale(readQueue());
  // Do not re-deliver an in-flight claim; the owning poller must ack (or wait for lease expiry).
  if (commands.some(item => item.status === "claimed")) return null;
  const next = commands.find(item => item.status === "pending");
  if (!next) return null;
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
export function takeMusicRemoteCommand(id: string) {
  const commandId = String(id || "").trim();
  if (!commandId) return null;
  const commands = markStale(readQueue());
  const index = commands.findIndex(item => item.id === commandId);
  if (index < 0) return null;
  const item = commands[index];
  if (item.status !== "pending") return null;
  commands.splice(index, 1);
  writeQueue(commands);
  return item;
}

export function ackMusicRemoteCommand(input: { id: string; status: "success" | "failed"; error?: string }) {
  const id = String(input?.id || "").trim();
  if (!id) return { success: false, error: "缺少指令 ID" };
  const commands = markStale(readQueue());
  const index = commands.findIndex(item => item.id === id);
  if (index < 0) return { success: false, error: "指令不存在" };
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
export function loadMusicRemoteCommand() {
  const commands = markStale(readQueue());
  return commands.find(item => item.status === "pending" || item.status === "claimed") || null;
}

export function listMusicRemoteCommands() {
  return markStale(readQueue());
}

export function runMusicRemoteCommandQueueSelfTest() {
  const original = readQueue();
  writeQueue([]);
  try {
    const a = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-a", request_text: "我心情不好，给我播放一首歌", source: "self-test" });
    const claimed = claimMusicRemoteCommand();
    const b = enqueueMusicRemoteCommand({ type: "play", keyword: "self-test-b", source: "self-test" });
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
    return {
      success: claimed?.id === a.id
        && claimed?.request_text === "我心情不好，给我播放一首歌"
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
        requestTextPreserved: claimed?.request_text === "我心情不好，给我播放一首歌",
        claimNotRedelivered: noRedeliver,
        takeDoesNotStealClaimed: takeWhileClaimed,
        secondStillPending: stillQueued,
        ackRemoves: aGone,
        takePendingOnly: bTakenGone,
        failRequeues: cRetryable,
      },
    };
  } finally {
    writeQueue(original);
  }
}

export function loadMusicAgentConfig() {
  const llm = loadOrchestratorConfig();
  const music = loadMusicConfig();
  return {
    ...llm,
    proxy: music.proxy || "",
    defaultMode: String((music as any).defaultMode || (music as any).mode || "cloud"),
  };
}

export function publicMusicAgentConfig() {
  const config = loadMusicAgentConfig();
  return {
    ...publicOrchestratorConfig(config),
    source: "orchestrator",
    sourceLabel: "系统设置 / 统一大模型配置",
    defaultMode: config.defaultMode || "cloud",
  };
}
