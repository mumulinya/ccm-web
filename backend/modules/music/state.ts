import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { loadMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";
import { notifyFeishuTaskStage } from "../collaboration/feishu-channel";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { douyinPlatformStatus } from "./douyin";
import {
  claimPersistedMusicCommand,
  completePersistedMusicCommand,
  enqueuePersistedMusicCommand,
  heartbeatPersistedMusicCommand,
  listPersistedMusicCommands,
  peekPersistedMusicCommand,
  requeuePersistedMusicCommand,
  replacePersistedMusicCommandsForTest,
} from "./music-persistence";

export const MUSIC_REMOTE_COMMAND_FILE = path.join(CCM_DIR, "music-remote-command.json");
export const MUSIC_REMOTE_COMMANDS_FILE = path.join(CCM_DIR, "music-remote-commands.json");
/** The browser renews a short lease while preparing/downloading/playing. */
export type MusicPlaybackCommandStatusV2 = "pending" | "resolving" | "ready" | "claimed" | "playing" | "needs_user_gesture" | "completed" | "failed" | "superseded" | "cancelled";

export type MusicRemoteCommand = {
  schema?: "ccm-music-playback-command-v2" | "ccm-music-playback-command-v3";
  version?: 2 | 3;
  id: string;
  type: string;
  keyword: string;
  request_text?: string;
  mode?: string;
  source?: string;
  created_at: string;
  status: MusicPlaybackCommandStatusV2;
  generation?: number;
  decision?: any;
  origin?: any;
  claimed_at?: string;
  lease_expires_at?: string;
  attempts?: number;
  last_error?: string;
  terminal_at?: string;
  result?: any;
  lease_id?: string;
  fencing_token?: number;
  consumed?: boolean;
  consumed_at?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function playbackCommandTitle(command: MusicRemoteCommand) {
  const selected = command.decision?.selectedCandidate;
  const title = String(selected?.title || command.keyword || "音乐").trim();
  const artist = String(selected?.artist || "").trim();
  return artist ? `${title} - ${artist}` : title;
}

function emitPlaybackCommandEvent(command: MusicRemoteCommand) {
  const status = String(command.status || "");
  publishRuntimeEvent("music", `music.playback.${status}`, {
    commandId: command.id,
    generation: command.generation,
    status,
    source: command.origin?.source || command.source || "music",
    sessionId: command.origin?.sessionId || "",
    messageId: command.origin?.messageId || "",
    title: playbackCommandTitle(command),
    reason: command.last_error || "",
  });
  if (!["completed", "failed", "superseded", "cancelled", "needs_user_gesture"].includes(status)) return;
  const source = String(command.origin?.source || command.source || "").toLowerCase();
  const sessionId = String(command.origin?.sessionId || "").trim();
  if (!source.includes("feishu") || !sessionId) return;
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
  void notifyFeishuTaskStage({
    stage: terminal.has(status) ? (status === "completed" ? "completion" : status) : "waiting_user",
    title,
    markdown,
    sessionId,
    cardKey: `music-playback:${command.id}`,
    dedupeKey: `music-playback:${command.id}:${status}`,
  }).catch(() => {});
}

function readQueue(): MusicRemoteCommand[] {
  return listPersistedMusicCommands() as MusicRemoteCommand[];
}

function writeQueue(commands: MusicRemoteCommand[]) {
  replacePersistedMusicCommandsForTest(commands);
}

/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
export function saveMusicRemoteCommand(command: any) {
  return enqueueMusicRemoteCommand(command);
}

export const STOP_MUSIC_KEYWORD = "__stop__";

export function enqueueMusicRemoteCommand(command: any) {
  const before = readQueue();
  const payload = enqueuePersistedMusicCommand(command) as MusicRemoteCommand;
  const after = readQueue();
  for (const previous of before) {
    const updated = after.find(item => item.id === previous.id);
    if (updated && updated.status !== previous.status) emitPlaybackCommandEvent(updated);
  }
  emitPlaybackCommandEvent(payload);
  return payload;
}

export function peekMusicRemoteCommand() {
  return peekPersistedMusicCommand() as MusicRemoteCommand | null;
}

export function claimMusicRemoteCommand(commandId = "", generation?: number) {
  const next = claimPersistedMusicCommand({ id: commandId || undefined, generation }) as MusicRemoteCommand | null;
  if (next) emitPlaybackCommandEvent(next);
  return next;
}

/**
 * Web client_effect path: remove a pending command so the App poller will not also play it.
 * Returns null if missing or already claimed by the poller (do not steal / double-play).
 */
export function takeMusicRemoteCommand(id: string) {
  return claimMusicRemoteCommand(String(id || "").trim());
}

export function heartbeatMusicRemoteCommand(input: { id: string; generation?: number; lease_id?: string; fencing_token?: number; status?: "claimed" | "playing" | "needs_user_gesture" }) {
  const previous = readQueue().find(item => item.id === input.id);
  const result = heartbeatPersistedMusicCommand(input);
  if (result.success && result.command?.status !== previous?.status) emitPlaybackCommandEvent(result.command as MusicRemoteCommand);
  return result;
}

export function completeMusicRemoteCommand(input: { id: string; generation?: number; lease_id?: string; fencing_token?: number; status: "completed" | "failed" | "superseded" | "cancelled" | "needs_user_gesture"; error?: string; result?: any }) {
  const result = completePersistedMusicCommand(input);
  if (result.success && result.command) emitPlaybackCommandEvent(result.command as MusicRemoteCommand);
  return result;
}

export function ackMusicRemoteCommand(input: { id: string; status: "success" | "failed"; error?: string }) {
  const id = String(input?.id || "").trim();
  if (!id) return { success: false, error: "缺少指令 ID" };
  const current = readQueue().find(item => item.id === id);
  if (!current) return { success: false, error: "指令不存在" };
  if (input.status === "success") return { ...completeMusicRemoteCommand({ id, generation: current.generation, status: "completed" }), removed: false };
  if ((current.attempts || 0) < 3 && !["superseded", "cancelled"].includes(current.status)) {
    return {
      ...requeuePersistedMusicCommand({ id, generation: current.generation, error: input.error || "播放失败" }),
      removed: false,
    };
  }
  return { ...completeMusicRemoteCommand({ id, generation: current.generation, status: "failed", error: input.error || "播放失败" }), removed: false };
}

/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
export function loadMusicRemoteCommand() {
  const commands = readQueue();
  return commands.find(item => ["pending", "ready", "claimed", "playing", "needs_user_gesture"].includes(item.status)) || null;
}

export function listMusicRemoteCommands() {
  return readQueue();
}

export function runMusicRemoteCommandQueueSelfTest() {
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
  } finally {
    writeQueue(original);
  }
}

export function loadMusicAgentConfig() {
  const llm = loadOrchestratorConfig();
  const music = loadMusicConfig();
  let boundaryGeneration = 0;
  try {
    const memory = JSON.parse(fs.readFileSync(path.join(CCM_DIR, "music-agent-memory.json"), "utf8"));
    boundaryGeneration = Math.max(0, Number(memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0));
  } catch {}
  return {
    ...llm,
    contextEngineScope: "music",
    contextEngineScopeId: "music-agent",
    contextEngineSessionId: "music-agent",
    contextEngineBoundaryGeneration: boundaryGeneration,
    contextEngineSource: "music_agent",
    proxy: music.proxy || "",
    weatherLocation: String((music as any).weatherLocation || ""),
    defaultMode: String((music as any).defaultMode || (music as any).mode || "cloud"),
    quality: ["standard", "high", "very_high", "source"].includes(String((music as any).quality)) ? String((music as any).quality) : "high",
    fadeSeconds: Math.max(0, Math.min(8, Number((music as any).fadeSeconds) || 0)),
    volumeNormalization: (music as any).volumeNormalization === true,
    rememberProgress: (music as any).rememberProgress !== false,
    sleepTimerMinutes: Math.max(0, Math.min(180, Number((music as any).sleepTimerMinutes) || 0)),
    aiRecommendationEnabled: (music as any).aiRecommendationEnabled !== false,
    aiEmotionEnabled: (music as any).aiEmotionEnabled !== false,
    aiAutoSelectEnabled: (music as any).aiAutoSelectEnabled !== false,
  };
}

export function publicMusicAgentConfig() {
  const config = loadMusicAgentConfig();
  return {
    ...publicOrchestratorConfig(config),
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
    douyin: douyinPlatformStatus(),
  };
}
