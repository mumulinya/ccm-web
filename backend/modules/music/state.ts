import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";

export const MUSIC_REMOTE_COMMAND_FILE = path.join(CCM_DIR, "music-remote-command.json");
export const MUSIC_REMOTE_COMMANDS_FILE = path.join(CCM_DIR, "music-remote-commands.json");
const STALE_MS = 60_000;
const MAX_QUEUE = 50;

type MusicRemoteCommand = {
  id: string;
  type: string;
  keyword: string;
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
  if (head) fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(head, null, 2), "utf-8");
}

function markStale(commands: MusicRemoteCommand[]) {
  const now = Date.now();
  let changed = false;
  for (const item of commands) {
    if (item.status !== "pending" && item.status !== "claimed") continue;
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
  if (changed) writeQueue(commands);
  return commands;
}

/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
export function saveMusicRemoteCommand(command: any) {
  return enqueueMusicRemoteCommand(command);
}

export function enqueueMusicRemoteCommand(command: any) {
  const commands = markStale(readQueue());
  const payload: MusicRemoteCommand = {
    id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    type: String(command?.type || "play"),
    keyword: String(command?.keyword || "").trim(),
    mode: String(command?.mode || "").trim() || undefined,
    source: String(command?.source || "global-agent"),
    created_at: nowIso(),
    status: "pending",
    attempts: 0,
  };
  if (!payload.keyword) throw new Error("缺少音乐关键词");
  commands.push(payload);
  writeQueue(commands);
  return payload;
}

export function claimMusicRemoteCommand() {
  const commands = markStale(readQueue());
  const alreadyClaimed = commands.find(item => item.status === "claimed");
  if (alreadyClaimed) return alreadyClaimed;
  const next = commands.find(item => item.status === "pending");
  if (!next) return null;
  next.status = "claimed";
  next.claimed_at = nowIso();
  next.attempts = Number(next.attempts || 0) + 1;
  writeQueue(commands);
  return next;
}

/** Remove a command from the queue so the App poller will not also play it (Web client_effect path). */
export function takeMusicRemoteCommand(id: string) {
  const commandId = String(id || "").trim();
  if (!commandId) return null;
  const commands = markStale(readQueue());
  const index = commands.findIndex(item => item.id === commandId);
  if (index < 0) return null;
  const [item] = commands.splice(index, 1);
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
