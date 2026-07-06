import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";

export const MUSIC_REMOTE_COMMAND_FILE = path.join(CCM_DIR, "music-remote-command.json");

export function saveMusicRemoteCommand(command: any) {
  const payload = {
    id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    created_at: new Date().toISOString(),
    consumed: false,
    ...command,
  };
  fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export function loadMusicRemoteCommand() {
  try {
    if (!fs.existsSync(MUSIC_REMOTE_COMMAND_FILE)) return null;
    return JSON.parse(fs.readFileSync(MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function loadMusicAgentConfig() {
  const llm = loadOrchestratorConfig();
  const music = loadMusicConfig();
  return {
    ...llm,
    proxy: music.proxy || "",
  };
}

export function publicMusicAgentConfig() {
  const config = loadMusicAgentConfig();
  return {
    ...publicOrchestratorConfig(config),
    source: "orchestrator",
    sourceLabel: "系统设置 / 统一大模型配置",
  };
}
