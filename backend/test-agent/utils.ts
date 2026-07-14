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

function configuredAllowedWorkDirs() {
  const raw = String(process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return raw.split(path.delimiter).map(item => item.trim()).filter(Boolean);
  }
}

function realPathOrResolved(value: string) {
  const resolved = path.resolve(value);
  try { return fs.realpathSync(resolved); } catch { return resolved; }
}

export function validateTestAgentWorkDir(workDir: string) {
  const resolved = path.resolve(String(workDir || ""));
  const allowedRoots = configuredAllowedWorkDirs().map(realPathOrResolved);
  if (!resolved || !fs.existsSync(resolved)) {
    return allowedRoots.length
      ? { valid: false, resolved, error: "workDir does not exist" }
      : { valid: true, resolved, error: "" };
  }
  let stat: fs.Stats;
  try { stat = fs.statSync(resolved); } catch { return { valid: false, resolved, error: "workDir cannot be read" }; }
  if (!stat.isDirectory()) return { valid: false, resolved, error: "workDir is not a directory" };
  const real = realPathOrResolved(resolved);
  if (allowedRoots.length && !allowedRoots.some(root => {
    const relative = path.relative(root, real);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  })) {
    return { valid: false, resolved: real, error: "workDir is outside the registered project roots" };
  }
  return { valid: true, resolved: real, error: "" };
}

export function validateTestAgentUrl(value: string, baseUrl = "") {
  const raw = String(value || "").trim();
  if (!raw) return { valid: true, url: "", error: "" };
  let url: URL;
  try { url = new URL(raw, baseUrl || undefined); } catch { return { valid: false, url: raw, error: "URL is invalid" }; }
  if (!/^https?:$/.test(url.protocol)) return { valid: false, url: url.toString(), error: "only http/https URLs are allowed" };
  if (url.username || url.password) return { valid: false, url: url.toString(), error: "inline URL credentials are not allowed" };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["169.254.169.254", "100.100.100.200", "metadata.google.internal", "metadata.azure.internal", "fd00:ec2::254"].includes(host)) {
    return { valid: false, url: url.toString(), error: "cloud metadata endpoints are not allowed" };
  }
  return { valid: true, url: url.toString(), error: "" };
}

export function isLikelyProductionTestAgentUrl(value: string) {
  const safety = validateTestAgentUrl(value);
  if (!safety.valid || !safety.url) return false;
  const url = new URL(safety.url);
  const host = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host)) return false;
  if (/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (/(?:^|[.-])(?:dev|test|testing|stage|staging|preview|sandbox|qa|uat|local)(?:[.-]|$)/i.test(host)) return false;
  return true;
}

export function stringifyEnv(env: Record<string, string | number | boolean | undefined> | undefined) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

const VERIFICATION_EXECUTABLES = new Set([
  "node", "npm", "pnpm", "yarn", "bun", "npx",
  "python", "python3", "py", "pytest",
  "cargo", "go", "dotnet", "mvn", "mvnw", "gradle", "gradlew",
  "make", "cmake", "git",
]);

const SAFE_PARENT_ENV_KEYS = new Set([
  "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "TMPDIR",
  "HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "LOCALAPPDATA", "APPDATA",
  "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMDATA", "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE", "OS", "SHELL", "LANG", "LC_ALL", "TERM", "CI",
  "USER", "USERNAME", "NODE_ENV",
]);

export function splitVerificationCommand(command: string) {
  const input = String(command || "").trim();
  const tokens: string[] = [];
  let token = "";
  let quote = "";
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (char === "\\" && quote === '"' && ["\\", '"'].includes(input[index + 1])) {
        token += input[index + 1];
        index += 1;
        continue;
      }
      if (char === quote) quote = "";
      else token += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += char;
  }
  if (quote) return { tokens: [], error: "unterminated quote" };
  if (token) tokens.push(token);
  return { tokens, error: "" };
}

function normalizedExecutable(value: string) {
  return path.basename(String(value || "")).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
}

export function verificationCommandInvocation(command: string) {
  const unsafe = isUnsafeVerificationCommand(command);
  if (unsafe) return { executable: "", args: [] as string[], requiresShell: false, error: unsafe };
  const parsed = splitVerificationCommand(command);
  if (parsed.error || !parsed.tokens.length) return { executable: "", args: [] as string[], requiresShell: false, error: parsed.error || "empty command" };
  const executable = parsed.tokens[0];
  const requiresShell = process.platform === "win32"
    && ["npm", "pnpm", "yarn", "bun", "npx", "mvnw", "gradlew"].includes(normalizedExecutable(executable));
  return { executable, args: parsed.tokens.slice(1), requiresShell, error: "" };
}

export function buildTestAgentSubprocessEnv(projectEnv: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (SAFE_PARENT_ENV_KEYS.has(key.toUpperCase()) && value !== undefined) env[key] = value;
  }
  for (const [key, value] of Object.entries(projectEnv || {})) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && value !== undefined) env[key] = String(value);
  }
  return env;
}

export function redactTestAgentSensitiveText(value: any, secrets: string[] = []) {
  let text = String(value ?? "");
  for (const secret of [...new Set(secrets.map(String).filter(item => item.length >= 4))].sort((a, b) => b.length - a.length)) {
    text = text.split(secret).join("[REDACTED]");
  }
  return text
    .replace(/(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|passwd|authorization|cookie)\b\s*[=:]\s*["']?)([^\s,"';]+)/gi, "$1[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]");
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
  if (/[\r\n;&|<>`]/.test(text) || /\$\(/.test(text) || (process.platform === "win32" && /[%!^]/.test(text))) return "shell operators and command substitution are not allowed";
  const parsed = splitVerificationCommand(text);
  if (parsed.error || !parsed.tokens.length) return parsed.error || "empty command";
  const executable = normalizedExecutable(parsed.tokens[0]);
  if (!VERIFICATION_EXECUTABLES.has(executable)) return `verification executable is not allowed: ${executable || "unknown"}`;
  if (/^\s*git\s+(add|commit|push|checkout|reset|clean|merge|rebase|branch\s+-d|branch\s+-D)\b/i.test(text)) return "git write operation is not allowed";
  if (/\b(npm\s+install|npm\s+i|pnpm\s+install|pnpm\s+add|yarn\s+add|bun\s+add)\b/i.test(lower)) return "dependency installation is not allowed";
  if (/\b(rm\s+-rf|del\s+\/[sq]|rmdir\s+\/[sq]|Remove-Item\b.*\b-Recurse\b)/i.test(text)) return "destructive filesystem command is not allowed";
  if (executable === "git" && !/^(?:status|diff|show|rev-parse|log|ls-files)$/i.test(parsed.tokens[1] || "")) return "only read-only git commands are allowed";
  if (executable === "npx" && !parsed.tokens.includes("--no-install")) return "npx requires --no-install during verification";
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
