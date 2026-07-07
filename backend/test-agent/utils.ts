import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../core/utils";

export function nowIso() {
  return new Date().toISOString();
}

export function asArray(value: any): any[] {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function compactText(value: any, max = 4000) {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

export function safeSegment(value: string, fallback = "item") {
  const text = String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return text.slice(0, 80) || fallback;
}

export function makeRunId(prefix = "test-agent") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function defaultArtifactDir(runId: string) {
  return ensureDir(path.join(CCM_DIR, "test-agent-artifacts", safeSegment(runId)));
}

export function resolveWorkDir(workDir: string) {
  return path.resolve(String(workDir || process.cwd()));
}

export function stringifyEnv(env: Record<string, string | number | boolean | undefined> | undefined) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

export function appendLimited(current: string, chunk: any, maxChars: number) {
  if (!chunk) return current;
  const addition = Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
  if (current.length >= maxChars) return current;
  return compactText(current + addition, maxChars);
}

export function isUnsafeVerificationCommand(command: string) {
  const text = String(command || "").trim();
  if (!text) return "empty command";
  const lower = text.toLowerCase();
  if (/^\s*git\s+(add|commit|push|checkout|reset|clean|merge|rebase|branch\s+-d|branch\s+-D)\b/i.test(text)) return "git write operation is not allowed";
  if (/\b(npm\s+install|npm\s+i|pnpm\s+install|pnpm\s+add|yarn\s+add|bun\s+add)\b/i.test(lower)) return "dependency installation is not allowed";
  if (/\b(rm\s+-rf|del\s+\/[sq]|rmdir\s+\/[sq]|Remove-Item\b.*\b-Recurse\b)/i.test(text)) return "destructive filesystem command is not allowed";
  return "";
}

export function resolveUrl(baseUrl: string, maybeUrl: string) {
  const raw = String(maybeUrl || "").trim();
  if (!raw) return String(baseUrl || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!baseUrl) return raw;
  return new URL(raw, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function hasRequiredCheck(requiredChecks: string[], pattern: RegExp) {
  return requiredChecks.some(item => pattern.test(String(item || "")));
}
