import * as fs from "fs";
import * as path from "path";
import { PROJECT_AGENT_TYPES as REGISTERED_PROJECT_AGENT_TYPES } from "../../agents/catalog";

const INVALID_PROJECT_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;
const INVALID_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const PROJECT_AGENT_TYPES = REGISTERED_PROJECT_AGENT_TYPES;
export const PROJECT_PLATFORMS = ["feishu", "lark", "weixin", "telegram", "slack", "discord"] as const;

export function validateProjectName(value: unknown): string {
  const name = String(value ?? "");
  if (!name || name !== name.trim()) throw new Error("项目名称不能为空，且首尾不能有空格");
  if (name.length > 80) throw new Error("项目名称不能超过 80 个字符");
  if (name === "." || name === ".." || name.includes("..")) throw new Error("项目名称不能包含连续句点");
  if (INVALID_PROJECT_CHARS.test(name) || INVALID_WINDOWS_NAMES.test(name) || /[. ]$/.test(name)) {
    throw new Error("项目名称包含不安全字符");
  }
  return name;
}

export function validateSessionId(value: unknown): string {
  const sessionId = String(value ?? "").trim();
  if (!SESSION_ID_PATTERN.test(sessionId) || sessionId === "." || sessionId === ".." || sessionId.includes("..")) {
    throw new Error("会话 ID 格式无效");
  }
  return sessionId;
}

export function validateSharedFileName(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name || name.length > 160 || /[\\/:*?"<>|\u0000-\u001f]/.test(name) || name === "." || name === ".." || name.includes("..")) {
    throw new Error("共享文件名称格式无效");
  }
  return name;
}

export function validateAgentType(value: unknown, fallback = "claudecode"): string {
  const type = String(value || fallback).trim();
  if (!(PROJECT_AGENT_TYPES as readonly string[]).includes(type)) throw new Error("不支持的 Agent 类型");
  return type;
}

export function validateProjectPlatform(value: unknown, fallback = "feishu"): string {
  const platform = String(value || fallback).trim();
  if (!(PROJECT_PLATFORMS as readonly string[]).includes(platform)) throw new Error("不支持的项目通道");
  return platform;
}

export function validateWorkDirectory(value: unknown): string {
  const workDir = String(value ?? "").trim();
  if (!workDir) throw new Error("项目目录不能为空");
  if (!path.isAbsolute(workDir)) throw new Error("项目目录必须是绝对路径");
  const resolved = path.resolve(workDir);
  if (!fs.existsSync(resolved)) throw new Error("项目目录不存在");
  if (!fs.statSync(resolved).isDirectory()) throw new Error("项目目录不是文件夹");
  return resolved;
}

export function resolveContainedPath(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, ...parts);
  const relative = path.relative(resolvedRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("路径超出允许范围");
  return candidate;
}
