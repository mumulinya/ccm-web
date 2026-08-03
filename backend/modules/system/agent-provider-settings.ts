import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createHash, randomUUID } from "crypto";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "child_process";
import { createRequire } from "module";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import { loadCcSwitchClaudeProvider } from "./cc-switch-provider";
import {
  getDevelopmentAgentAuthEvidence,
  publicDevelopmentAgentAuthEvidence,
  recordDevelopmentAgentAuthEvidence,
  revokeDevelopmentAgentAuthEvidence,
} from "./development-agent-auth-evidence";

export type DevelopmentAgentProvider = "codex" | "cursor" | "gemini" | "opencode" | "claudecode";

type CliAgentProviderSettings = { enabled: boolean; authMode: "cli_login"; model: string };

type StoredAgentProviderSettings = {
  version: 4;
  codex: CliAgentProviderSettings;
  cursor: CliAgentProviderSettings;
  gemini: CliAgentProviderSettings;
  opencode: CliAgentProviderSettings;
  claudecode: {
    enabled: boolean;
    authMode: "api";
    apiUrl: string;
    apiKey: string;
    credentialType: "api_key" | "auth_token";
    model: string;
    syncExternal: boolean;
  };
  updatedAt: string;
};

const SETTINGS_FILE = path.join(os.homedir(), ".cc-connect", "agent-provider-settings.json");
const STATUS_CACHE = new Map<string, { expiresAt: number; value: any }>();
// 状态探测涉及 spawnSync 外部 CLI（最长 8s），过期后由后台异步刷新兜底，
// TTL 只决定刷新节奏，不再决定请求路径上的阻塞探测频率。
const STATUS_CACHE_TTL_MS = 60_000;
const INSTALL_OUTPUT_LIMIT = 12_000;
type InstallState = {
  status: "idle" | "running" | "succeeded" | "failed";
  operation?: "install" | "update";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  pid?: number;
};
const INSTALL_STATES = new Map<DevelopmentAgentProvider, InstallState>();
const INSTALL_STATE_FILE = path.join(os.homedir(), ".cc-connect", "agent-install-jobs.json");
let installStatesLoaded = false;

function persistInstallStates() {
  fs.mkdirSync(path.dirname(INSTALL_STATE_FILE), { recursive: true });
  const temp = `${INSTALL_STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ schema: "ccm-agent-install-jobs-v1", updatedAt: new Date().toISOString(), jobs: Object.fromEntries(INSTALL_STATES) }, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, INSTALL_STATE_FILE);
}

function ensureInstallStatesLoaded() {
  if (installStatesLoaded) return;
  installStatesLoaded = true;
  try {
    const parsed = JSON.parse(fs.readFileSync(INSTALL_STATE_FILE, "utf-8"));
    for (const [provider, state] of Object.entries(parsed?.jobs || {})) {
      if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider)) continue;
      const job = state as InstallState;
      if (job.status === "running" && job.pid) {
        try { process.kill(job.pid, 0); } catch {
          job.status = "failed";
          job.completedAt = new Date().toISOString();
          job.error = "CCM重启后未发现原安装进程，已标记为中断";
          job.pid = undefined;
        }
      }
      INSTALL_STATES.set(provider as DevelopmentAgentProvider, job);
    }
  } catch {}
}

function setInstallState(provider: DevelopmentAgentProvider, state: InstallState) {
  INSTALL_STATES.set(provider, state);
  persistInstallStates();
}
const LOGIN_OUTPUT_LIMIT = 24_000;
const LOGIN_SESSION_TTL_MS = 10 * 60 * 1000;
const GEMINI_LOGIN_PREPARATION_TIMEOUT_MS = 45_000;

type LoginSessionStatus = "starting" | "awaiting_browser" | "awaiting_code" | "exchanging" | "succeeded" | "failed";
type AgentProviderLoginSession = {
  id: string;
  provider: DevelopmentAgentProvider;
  status: LoginSessionStatus;
  startedAt: string;
  expiresAt: string;
  authUrl: string;
  userCode: string;
  requiresCode: boolean;
  detail: string;
  error: string;
  command: string;
  output: string;
  credentialFingerprintAtStart: string;
  providerReportedSuccess: boolean;
  codeSubmitted: boolean;
  progressTail: string;
  credentialBackupPath?: string;
  credentialSuccessSnapshotPath?: string;
  pid?: number;
  child?: ChildProcessWithoutNullStreams;
  pty?: {
    pid: number;
    write(data: string): void;
    kill(signal?: string): void;
    onData(listener: (data: string) => void): { dispose(): void };
    onExit(listener: (event: { exitCode: number; signal?: number }) => void): { dispose(): void };
  };
};

const LOGIN_SESSIONS = new Map<string, AgentProviderLoginSession>();
const LOGIN_PREPARATION_TIMERS = new Map<string, NodeJS.Timeout>();
const runtimeRequire = createRequire(__filename);
let cachedLoginPtyModule: any | null | undefined;
const AGENT_TEST_TIMEOUT_MS = 90_000;
const AGENT_TEST_OUTPUT_LIMIT = 128 * 1024;
const AGENT_TESTS_IN_FLIGHT = new Map<string, Promise<any>>();

function defaults(): StoredAgentProviderSettings {
  return {
    version: 4,
    codex: { enabled: true, authMode: "cli_login", model: "" },
    cursor: { enabled: true, authMode: "cli_login", model: "" },
    gemini: { enabled: true, authMode: "cli_login", model: "" },
    opencode: { enabled: true, authMode: "cli_login", model: "" },
    claudecode: {
      enabled: false,
      authMode: "api",
      apiUrl: "https://api.anthropic.com",
      apiKey: "",
      credentialType: "api_key",
      model: "",
      syncExternal: true,
    },
    updatedAt: "",
  };
}

function writeSettings(settings: StoredAgentProviderSettings) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const temp = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(settings, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, SETTINGS_FILE);
  try { fs.chmodSync(SETTINGS_FILE, 0o600); } catch {}
}

function normalizeAntigravityModelId(value: unknown) {
  const model = String(value || "").trim();
  if (model === "gemini-3.5-flash") return "gemini-3.5-flash-high";
  if (["gemini-3.1-pro", "gemini-3.1-pro-preview"].includes(model)) return "gemini-3.1-pro-high";
  return model;
}

function normalizeStored(raw: any): StoredAgentProviderSettings {
  const base = defaults();
  const claudeRaw = raw?.claudecode && typeof raw.claudecode === "object" ? raw.claudecode : {};
  return {
    version: 4,
    codex: { enabled: raw?.codex?.enabled !== false, authMode: "cli_login", model: String(raw?.codex?.model || "").trim() },
    cursor: { enabled: raw?.cursor?.enabled !== false, authMode: "cli_login", model: String(raw?.cursor?.model || "").trim() },
    gemini: { enabled: raw?.gemini?.enabled !== false, authMode: "cli_login", model: normalizeAntigravityModelId(raw?.gemini?.model) },
    opencode: { enabled: raw?.opencode?.enabled !== false, authMode: "cli_login", model: String(raw?.opencode?.model || "").trim() },
    claudecode: {
      enabled: claudeRaw.enabled === true,
      authMode: "api",
      apiUrl: String(claudeRaw.apiUrl || base.claudecode.apiUrl).trim(),
      apiKey: String(claudeRaw.apiKey || "").trim(),
      credentialType: claudeRaw.credentialType === "auth_token" ? "auth_token" : "api_key",
      model: String(claudeRaw.model || "").trim(),
      syncExternal: claudeRaw.syncExternal !== false,
    },
    updatedAt: String(raw?.updatedAt || ""),
  };
}

export function loadStoredAgentProviderSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return defaults();
    const parsed = normalizeStored(JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")));
    if (parsed.claudecode.apiKey && !isCredentialReference(parsed.claudecode.apiKey)) {
      parsed.claudecode.apiKey = protectCredential("development-agent-claudecode", "apiKey", parsed.claudecode.apiKey);
      writeSettings(parsed);
    }
    return parsed;
  } catch {
    return defaults();
  }
}

export function loadAgentProviderSettings() {
  const stored = loadStoredAgentProviderSettings();
  return {
    ...stored,
    claudecode: {
      ...stored.claudecode,
      apiKey: stored.claudecode.apiKey ? resolveCredential(stored.claudecode.apiKey) : "",
    },
  };
}

export function resolveEffectiveClaudeProviderSettings(settings = loadAgentProviderSettings()) {
  const explicitReady = settings.claudecode.enabled
    && !!settings.claudecode.apiUrl
    && !!settings.claudecode.model
    && !!settings.claudecode.apiKey;
  if (explicitReady) return { ...settings.claudecode, source: "ccm" as const, providerName: "CCM 手动配置", externalManaged: false };
  const external = settings.claudecode.syncExternal !== false ? loadCcSwitchClaudeProvider() : null;
  if (external) {
    return {
      ...settings.claudecode,
      enabled: true,
      apiUrl: external.apiUrl,
      apiKey: external.apiKey,
      credentialType: external.credentialType,
      model: external.model,
      source: external.source,
      providerName: external.providerName,
      externalManaged: true,
    };
  }
  return { ...settings.claudecode, source: "ccm" as const, providerName: "CCM 手动配置", externalManaged: false };
}

export function saveAgentProviderSettings(updates: any) {
  const current = loadAgentProviderSettings();
  const next: any = {
    ...current,
    codex: { ...current.codex },
    cursor: { ...current.cursor },
    gemini: { ...current.gemini },
    opencode: { ...current.opencode },
    claudecode: { ...current.claudecode },
  };
  if (updates?.codex?.enabled !== undefined) next.codex.enabled = updates.codex.enabled === true;
  if (updates?.codex?.model !== undefined) next.codex.model = String(updates.codex.model || "").trim();
  if (updates?.cursor?.enabled !== undefined) next.cursor.enabled = updates.cursor.enabled === true;
  if (updates?.cursor?.model !== undefined) next.cursor.model = String(updates.cursor.model || "").trim();
  if (updates?.gemini?.enabled !== undefined) next.gemini.enabled = updates.gemini.enabled === true;
  if (updates?.gemini?.model !== undefined) next.gemini.model = normalizeAntigravityModelId(updates.gemini.model);
  if (updates?.opencode?.enabled !== undefined) next.opencode.enabled = updates.opencode.enabled === true;
  if (updates?.opencode?.model !== undefined) next.opencode.model = String(updates.opencode.model || "").trim();
  const claude = updates?.claudecode;
  if (claude && typeof claude === "object") {
    if (claude.enabled !== undefined) next.claudecode.enabled = claude.enabled === true;
    if (claude.apiUrl !== undefined) {
      const apiUrl = String(claude.apiUrl || "").trim().replace(/\/+$/, "");
      if (apiUrl) {
        let parsed: URL;
        try { parsed = new URL(apiUrl); } catch { throw new Error("Claude Code API 地址格式无效"); }
        const loopback = parsed.hostname === "localhost" || parsed.hostname === "::1" || /^127\./.test(parsed.hostname);
        if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
          throw new Error("Claude Code远程API必须使用HTTPS；HTTP仅允许本机回环地址");
        }
      }
      next.claudecode.apiUrl = apiUrl;
    }
    if (claude.model !== undefined) next.claudecode.model = String(claude.model || "").trim();
    if (claude.credentialType !== undefined) {
      const type = String(claude.credentialType || "api_key");
      if (!['api_key', 'auth_token'].includes(type)) throw new Error("不支持的 Claude Code 凭据类型");
      next.claudecode.credentialType = type;
    }
    if (claude.syncExternal !== undefined) next.claudecode.syncExternal = claude.syncExternal !== false;
    if (claude.clearApiKey === true) next.claudecode.apiKey = "";
    else if (String(claude.apiKey || "").trim()) next.claudecode.apiKey = String(claude.apiKey).trim();
  }
  const externalClaude = next.claudecode.syncExternal !== false ? loadCcSwitchClaudeProvider() : null;
  if (next.claudecode.enabled && (!next.claudecode.apiUrl || !next.claudecode.model || !next.claudecode.apiKey) && !externalClaude) {
    throw new Error("启用 Claude Code 前必须填写 API 地址、模型名称和 API Key");
  }
  next.updatedAt = new Date().toISOString();
  const stored: StoredAgentProviderSettings = {
    version: 4,
    codex: { enabled: next.codex.enabled, authMode: "cli_login", model: next.codex.model },
    cursor: { enabled: next.cursor.enabled, authMode: "cli_login", model: next.cursor.model },
    gemini: { enabled: next.gemini.enabled, authMode: "cli_login", model: next.gemini.model },
    opencode: { enabled: next.opencode.enabled, authMode: "cli_login", model: next.opencode.model },
    claudecode: {
      enabled: next.claudecode.enabled,
      authMode: "api",
      apiUrl: next.claudecode.apiUrl,
      apiKey: next.claudecode.apiKey ? protectCredential("development-agent-claudecode", "apiKey", next.claudecode.apiKey) : "",
      credentialType: next.claudecode.credentialType,
      model: next.claudecode.model,
      syncExternal: next.claudecode.syncExternal !== false,
    },
    updatedAt: next.updatedAt,
  };
  writeSettings(stored);
  // CLI OAuth login belongs to the native Agent and is independent from the
  // model selected in CCM. Saving a model must not turn a valid login into a
  // logged-out state. Claude API configuration is the only credential-bearing
  // configuration managed by this form.
  if (updates?.claudecode) revokeDevelopmentAgentAuthEvidence("claudecode", "Agent配置已修改，需要重新验证");
  markAgentProviderStatusesStale();
  invalidateAgentModelCatalog();
  return loadAgentProviderSettings();
}

export function publicAgentProviderSettings(settings = loadAgentProviderSettings()) {
  const effectiveClaude = resolveEffectiveClaudeProviderSettings(settings);
  const { apiKey, ...claude } = effectiveClaude;
  return {
    version: settings.version,
    codex: settings.codex,
    cursor: settings.cursor,
    gemini: settings.gemini,
    opencode: settings.opencode,
    claudecode: {
      ...claude,
      manualEnabled: settings.claudecode.enabled,
      hasKey: !!apiKey,
      credentialProtected: !!apiKey && !effectiveClaude.externalManaged,
    },
    updatedAt: settings.updatedAt,
  };
}

function commandExists(command: string) {
  if (/[\\/]/.test(command)) {
    try { return fs.statSync(command).isFile(); } catch { return false; }
  }
  try {
    const probe = process.platform === "win32"
      ? spawnSync("where.exe", [command], { windowsHide: true, stdio: "ignore" })
      : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
    return probe.status === 0;
  } catch { return false; }
}

function resolveWindowsCommandPath(command: string) {
  if (process.platform !== "win32") return command;
  if (/[\\/]/.test(command)) return command;
  try {
    const probe = spawnSync("where.exe", [command], {
      windowsHide: true,
      encoding: "utf-8",
      timeout: 5_000,
    });
    if (probe.status !== 0) return command;
    const candidates = String(probe.stdout || "")
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
    return candidates.find(candidate => /\.(?:exe|com|cmd|bat)$/i.test(candidate))
      || candidates[0]
      || command;
  } catch {
    return command;
  }
}

export function resolveCursorAgentCommand() {
  if (commandExists("cursor-agent")) return resolveWindowsCommandPath("cursor-agent");
  if (commandExists("agent")) return resolveWindowsCommandPath("agent");
  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"));
    for (const name of ["cursor-agent.cmd", "agent.cmd"]) {
      const candidate = path.join(localAppData, "cursor-agent", name);
      if (commandExists(candidate)) return candidate;
    }
  }
  return "cursor-agent";
}

export function resolveAntigravityCliCommand() {
  const explicit = String(process.env.CCM_ANTIGRAVITY_CLI_COMMAND || "").trim();
  if (explicit) return explicit;
  if (commandExists("agy")) return resolveWindowsCommandPath("agy");
  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"));
    const candidate = path.join(localAppData, "agy", "bin", "agy.exe");
    if (commandExists(candidate)) return candidate;
  }
  return "agy";
}

function commandVersion(command: string) {
  if (!commandExists(command)) return "";
  try {
    const result = spawnSync(command, ["--version"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 8_000,
    });
    return String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0].slice(0, 120);
  } catch { return ""; }
}

function readJsonFile(file: string): any {
  try {
    if (!fs.statSync(file).isFile()) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

function jwtPublicClaims(token: unknown) {
  try {
    const encoded = String(token || "").split(".")[1] || "";
    if (!encoded) return {} as Record<string, unknown>;
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch { return {} as Record<string, unknown>; }
}

function safeIdentity(value: unknown) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 160);
}

function identityFromJwt(token: unknown) {
  const claims = jwtPublicClaims(token);
  return safeIdentity(claims.email || claims.preferred_username || claims.name || "");
}

function codexAccountIdentity() {
  const parsed = readJsonFile(path.join(os.homedir(), ".codex", "auth.json"));
  return identityFromJwt(parsed?.tokens?.id_token || parsed?.id_token);
}

function geminiAccountIdentity() {
  const accounts = readJsonFile(path.join(os.homedir(), ".gemini", "google_accounts.json"));
  const active = safeIdentity(accounts?.active || accounts?.current || accounts?.email);
  if (active) return active;
  const oauth = readJsonFile(path.join(os.homedir(), ".gemini", "oauth_creds.json"));
  const oauthIdentity = identityFromJwt(oauth?.id_token);
  if (oauthIdentity) return oauthIdentity;
  const serviceAccount = readJsonFile(path.join(String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "")));
  return safeIdentity(serviceAccount?.client_email);
}

function cursorAccountIdentity() {
  const parsed = readJsonFile(path.join(os.homedir(), ".cursor", "cli-config.json"));
  return safeIdentity(parsed?.authInfo?.email || parsed?.authInfo?.displayName || parsed?.authInfo?.userId);
}

function openCodeAccountIdentity() {
  const candidates = [
    path.join(os.homedir(), ".local", "share", "opencode", "auth.json"),
    path.join(String(process.env.APPDATA || ""), "opencode", "auth.json"),
    path.join(String(process.env.LOCALAPPDATA || ""), "opencode", "auth.json"),
  ];
  const parsed = candidates.map(readJsonFile).find(Boolean);
  if (!parsed) return "";
  const identities: string[] = [];
  for (const [provider, credential] of Object.entries(parsed)) {
    if (!credential || typeof credential !== "object") continue;
    const value: any = credential;
    const jwtIdentity = identityFromJwt(value.id_token || value.idToken || value.access_token || value.access);
    const accountId = safeIdentity(value.email || value.account || value.accountId || value.user);
    const identity = jwtIdentity || accountId;
    identities.push(identity ? `${provider}: ${identity}` : provider);
  }
  return safeIdentity(identities.join(" · "));
}

export function getAgentProviderAccountIdentity(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase();
  if (provider === "codex") return codexAccountIdentity();
  if (provider === "cursor") return cursorAccountIdentity();
  if (provider === "gemini") return geminiAccountIdentity();
  if (provider === "opencode") return openCodeAccountIdentity();
  return "";
}

function codexCredentialPresent() {
  const file = path.join(os.homedir(), ".codex", "auth.json");
  try {
    if (!fs.statSync(file).isFile()) return false;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return !!parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
  } catch { return false; }
}

function jsonCredentialPresent(files: string[]) {
  for (const file of files) {
    try {
      if (!fs.statSync(file).isFile()) continue;
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) return true;
    } catch {}
  }
  return false;
}

function antigravityCredentialPresent() {
  const evidence = getDevelopmentAgentAuthEvidence("gemini");
  if (evidence?.valid) return true;
  const roots = [
    path.join(os.homedir(), ".gemini", "antigravity"),
    path.join(os.homedir(), ".gemini", "antigravity-cli"),
  ];
  return roots.some(root => {
    try {
      return fs.statSync(root).isDirectory() && fs.readdirSync(root).length > 0;
    } catch { return false; }
  });
}

function geminiCredentialPresent() { return antigravityCredentialPresent(); }

function credentialFileFingerprint(file: string) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return "";
    const content = fs.readFileSync(file);
    const parsed = JSON.parse(content.toString("utf-8"));
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) return "";
    return createHash("sha256")
      .update(path.resolve(file))
      .update("\0")
      .update(String(stat.size))
      .update("\0")
      .update(String(stat.mtimeMs))
      .update("\0")
      .update(content)
      .digest("hex");
  } catch {
    return "";
  }
}

function providerCredentialFingerprint(provider: DevelopmentAgentProvider) {
  const files = provider === "codex"
    ? [path.join(os.homedir(), ".codex", "auth.json")]
    : provider === "gemini"
      ? [
          path.join(os.homedir(), ".gemini", "antigravity", "antigravity_state.pbtxt"),
          path.join(os.homedir(), ".gemini", "antigravity", "installation_id"),
          path.join(os.homedir(), ".gemini", "antigravity-cli", "settings.json"),
        ]
      : provider === "opencode"
        ? [
            path.join(os.homedir(), ".local", "share", "opencode", "auth.json"),
            path.join(os.homedir(), ".config", "opencode", "auth.json"),
          ]
        : [];
  const fileEvidence = files.map(credentialFileFingerprint).filter(Boolean).sort();
  const environmentEvidence = provider === "gemini"
    ? [process.env.CCM_ANTIGRAVITY_CLI_COMMAND ? "antigravity_cli_command" : ""].filter(Boolean)
    : [];
  return createHash("sha256")
    .update(JSON.stringify({ provider, fileEvidence, environmentEvidence }))
    .digest("hex");
}

function geminiCredentialSources() {
  const sources: string[] = [];
  if (fs.existsSync(path.join(os.homedir(), ".gemini", "antigravity"))) sources.push("antigravity_secure_state");
  if (fs.existsSync(path.join(os.homedir(), ".gemini", "antigravity-cli"))) sources.push("antigravity_cli_settings");
  return sources;
}

function openCodeCredentialPresent() {
  return jsonCredentialPresent([
    path.join(os.homedir(), ".local", "share", "opencode", "auth.json"),
    path.join(String(process.env.APPDATA || ""), "opencode", "auth.json"),
    path.join(String(process.env.LOCALAPPDATA || ""), "opencode", "auth.json"),
  ]);
}

export function parseCursorAuthStatus(rawOutput: string, exitCode: number | null) {
  const output = String(rawOutput || "").replace(/\u001b\[[0-9;]*m/g, "").trim();
  const loggedOut = /\b(?:not logged in|logged out|not authenticated|unauthenticated|authentication required|login required|please (?:run )?(?:the )?login)\b/i.test(output);
  const loggedIn = exitCode === 0
    && !loggedOut
    && /(?:^|\n)\s*(?:[✓✔]\s*)?(?:login successful!?|logged in(?:\s+as\s+[^\r\n]+|\s*\([^\r\n]*\)|\s*$)|authenticated(?:\s+as\s+[^\r\n]+|\s*$))/im.test(output);
  const account = loggedIn ? output.match(/Logged in as\s+([^\r\n]+)/i)?.[1]?.trim() || "" : "";
  return {
    loggedIn,
    account,
    detail: output.slice(0, 180) || (exitCode === 0
      ? "Cursor Agent 未返回可验证的登录状态"
      : "Cursor Agent 登录状态检查失败"),
  };
}

function cursorStatus(command: string) {
  if (!commandExists(command)) return { loggedIn: false, account: "", detail: "未安装 Cursor Agent CLI" };
  const storedAccount = getAgentProviderAccountIdentity("cursor");
  if (storedAccount) {
    return { loggedIn: true, account: storedAccount, detail: "已读取 Cursor Agent 当前登录账号" };
  }
  try {
    const result = spawnSync(command, ["status"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 8_000,
    });
    return parseCursorAuthStatus(String(result.stdout || result.stderr || ""), result.status);
  } catch (error: any) {
    return { loggedIn: false, account: "", detail: String(error?.message || "登录状态检查失败").slice(0, 180) };
  }
}

function installState(provider: DevelopmentAgentProvider): InstallState {
  ensureInstallStatesLoaded();
  return INSTALL_STATES.get(provider) || { status: "idle" };
}

type AgentProviderProbeResults = {
  cursorCommand: string;
  cursorInstalled: boolean;
  cursor: { loggedIn: boolean; account: string; detail: string };
  codexInstalled: boolean;
  geminiInstalled: boolean;
  openCodeInstalled: boolean;
  claudeInstalled: boolean;
  versions: { codex: string; cursor: string; gemini: string; opencode: string; claude: string };
};

// 与 spawnSync 默认 maxBuffer 对齐的输出上限，防止挂死的探测进程无界累积内存
const PROBE_CAPTURE_LIMIT = 1024 * 1024;

function runCommandCaptureAsync(
  command: string,
  args: string[],
  options: { timeoutMs?: number; shell?: boolean } = {},
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        shell: options.shell === true,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      resolve({ status: null, stdout: "", stderr: "" });
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (status: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // 结算即断流：shell:true 超时后孙进程可能仍持有管道写端，不断流会持续触发 data 回调
      try { child.stdout?.destroy(); } catch {}
      try { child.stderr?.destroy(); } catch {}
      resolve({ status, stdout, stderr });
    };
    const timer = setTimeout(() => {
      try {
        if (process.platform === "win32" && child.pid) {
          // shell:true 下直接子进程是 cmd.exe 包装层，必须杀树才能终结真实 CLI；
          // 用异步 spawn 而非 spawnSync，避免在探测路径上重新引入事件循环阻塞
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).once("error", () => {});
        } else {
          child.kill("SIGKILL");
        }
      } catch {}
      finish(null);
    }, Math.max(1_000, Number(options.timeoutMs || 8_000)));
    child.stdout?.on("data", chunk => { if (stdout.length < PROBE_CAPTURE_LIMIT) stdout = `${stdout}${String(chunk)}`.slice(0, PROBE_CAPTURE_LIMIT); });
    child.stderr?.on("data", chunk => { if (stderr.length < PROBE_CAPTURE_LIMIT) stderr = `${stderr}${String(chunk)}`.slice(0, PROBE_CAPTURE_LIMIT); });
    child.once("error", () => finish(null));
    child.once("close", code => finish(typeof code === "number" ? code : null));
  });
}

async function commandExistsAsync(command: string) {
  // 与同步版保持一致：绝对/相对路径直接 stat（where.exe 无法匹配含路径分隔符的参数）
  if (/[\\/]/.test(command)) {
    try { return (await fs.promises.stat(command)).isFile(); } catch { return false; }
  }
  const probe = process.platform === "win32"
    ? await runCommandCaptureAsync("where.exe", [command])
    : await runCommandCaptureAsync("sh", ["-lc", `command -v ${command}`]);
  return probe.status === 0;
}

async function commandVersionAsync(command: string, installed?: boolean) {
  const exists = installed ?? await commandExistsAsync(command);
  if (!exists) return "";
  const result = await runCommandCaptureAsync(command, ["--version"], { shell: process.platform === "win32" });
  return String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0].slice(0, 120);
}

async function resolveCursorAgentCommandAsync() {
  if (await commandExistsAsync("cursor-agent")) return resolveWindowsCommandPath("cursor-agent");
  if (await commandExistsAsync("agent")) return resolveWindowsCommandPath("agent");
  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"));
    for (const name of ["cursor-agent.cmd", "agent.cmd"]) {
      const candidate = path.join(localAppData, "cursor-agent", name);
      if (await commandExistsAsync(candidate)) return candidate;
    }
  }
  return "cursor-agent";
}

async function cursorStatusAsync(command: string, installed?: boolean) {
  const exists = installed ?? await commandExistsAsync(command);
  if (!exists) return { loggedIn: false, account: "", detail: "未安装 Cursor Agent CLI" };
  const storedAccount = getAgentProviderAccountIdentity("cursor");
  if (storedAccount) {
    return { loggedIn: true, account: storedAccount, detail: "已读取 Cursor Agent 当前登录账号" };
  }
  const result = await runCommandCaptureAsync(command, ["status"], { shell: process.platform === "win32" });
  return parseCursorAuthStatus(String(result.stdout || result.stderr || ""), result.status);
}

function collectAgentProviderProbes(): AgentProviderProbeResults {
  const cursorCommand = resolveCursorAgentCommand();
  const antigravityCommand = resolveAntigravityCliCommand();
  return {
    cursorCommand,
    cursorInstalled: commandExists(cursorCommand),
    cursor: cursorStatus(cursorCommand),
    codexInstalled: commandExists("codex"),
    geminiInstalled: commandExists(antigravityCommand),
    openCodeInstalled: commandExists("opencode"),
    claudeInstalled: commandExists("claude"),
    versions: {
      codex: commandVersion("codex"),
      cursor: commandVersion(cursorCommand),
      gemini: commandVersion(antigravityCommand),
      opencode: commandVersion("opencode"),
      claude: commandVersion("claude"),
    },
  };
}

async function collectAgentProviderProbesAsync(): Promise<AgentProviderProbeResults> {
  const cursorCommand = await resolveCursorAgentCommandAsync();
  const antigravityCommand = resolveAntigravityCliCommand();
  // 阶段一：轻量存在性探测（where.exe / stat）并行执行
  const [cursorInstalled, codexInstalled, geminiInstalled, openCodeInstalled, claudeInstalled] = await Promise.all([
    commandExistsAsync(cursorCommand),
    commandExistsAsync("codex"),
    commandExistsAsync(antigravityCommand),
    commandExistsAsync("opencode"),
    commandExistsAsync("claude"),
  ]);
  // 阶段二：只对已安装的 CLI 做重探测（--version / status），复用阶段一结果避免重复 where.exe
  const [cursor, codexVersion, cursorVersion, geminiVersion, openCodeVersion, claudeVersion] = await Promise.all([
    cursorStatusAsync(cursorCommand, cursorInstalled),
    commandVersionAsync("codex", codexInstalled),
    commandVersionAsync(cursorCommand, cursorInstalled),
    commandVersionAsync(antigravityCommand, geminiInstalled),
    commandVersionAsync("opencode", openCodeInstalled),
    commandVersionAsync("claude", claudeInstalled),
  ]);
  return {
    cursorCommand,
    cursorInstalled,
    cursor,
    codexInstalled,
    geminiInstalled,
    openCodeInstalled,
    claudeInstalled,
    versions: { codex: codexVersion, cursor: cursorVersion, gemini: geminiVersion, opencode: openCodeVersion, claude: claudeVersion },
  };
}

function assembleAgentProviderStatuses(probes: AgentProviderProbeResults) {
  const config = loadAgentProviderSettings();
  const codexAuth = codexCredentialPresent();
  const geminiAuth = geminiCredentialPresent();
  const openCodeAuth = openCodeCredentialPresent();
  const effectiveClaude = resolveEffectiveClaudeProviderSettings(config);
  const claudeReady = effectiveClaude.enabled && !!effectiveClaude.apiUrl && !!effectiveClaude.model && !!effectiveClaude.apiKey;
  const authState = (provider: DevelopmentAgentProvider, detected: boolean, account: string, version: string, model = "") => {
    let evidence = getDevelopmentAgentAuthEvidence(provider, { account, cliVersion: version, model });
    if (detected && !evidence?.valid && provider !== "gemini") {
      evidence = recordDevelopmentAgentAuthEvidence({
        provider,
        status: "verified",
        source: "credential_file",
        account,
        cliVersion: version,
        model,
        detail: "已读取本机持久化登录凭据",
      }) as any;
      (evidence as any).valid = true;
    }
    return {
      authState: evidence?.valid ? "logged_in" : detected ? "credential_detected" : "logged_out",
      authEvidence: publicDevelopmentAgentAuthEvidence(evidence),
    };
  };
  const codexIdentity = codexAuth ? getAgentProviderAccountIdentity("codex") : "";
  const geminiIdentity = geminiAuth ? getAgentProviderAccountIdentity("gemini") : "";
  const openCodeIdentity = openCodeAuth ? getAgentProviderAccountIdentity("opencode") : "";
  const codexState = authState("codex", codexAuth, codexIdentity, probes.versions.codex, config.codex.model);
  const geminiState = authState("gemini", geminiAuth, geminiIdentity, probes.versions.gemini, config.gemini.model);
  const openCodeState = authState("opencode", openCodeAuth, openCodeIdentity, probes.versions.opencode, config.opencode.model);
  const currentCursorEvidence = getDevelopmentAgentAuthEvidence("cursor", {
    account: probes.cursor.account,
    cliVersion: probes.versions.cursor,
    model: config.cursor.model,
  });
  const cursorEvidence = probes.cursor.loggedIn
    ? currentCursorEvidence?.valid
      ? currentCursorEvidence
      : recordDevelopmentAgentAuthEvidence({ provider: "cursor", status: "verified", source: "native_status", account: probes.cursor.account, cliVersion: probes.versions.cursor, model: config.cursor.model, detail: "Cursor CLI返回有效登录状态" })
    : getDevelopmentAgentAuthEvidence("cursor");
  const claudeEvidence = getDevelopmentAgentAuthEvidence("claudecode", { cliVersion: probes.versions.claude, model: effectiveClaude.model });
  return {
    codex: {
      provider: "codex",
      command: "codex",
      installed: probes.codexInstalled,
      version: probes.versions.codex,
      ...codexState,
      account: codexIdentity,
      detail: codexState.authState === "logged_in" ? "Codex认证已验证" : codexAuth ? "已发现Codex凭据，运行测试后才能用于任务" : "尚未发现本机Codex凭据",
      install: installState("codex"),
    },
    cursor: {
      provider: "cursor",
      command: probes.cursorCommand,
      installed: probes.cursorInstalled,
      version: probes.versions.cursor,
      authState: probes.cursor.loggedIn ? "logged_in" : "logged_out",
      authEvidence: publicDevelopmentAgentAuthEvidence(cursorEvidence),
      account: probes.cursor.account,
      detail: probes.cursor.detail,
      install: installState("cursor"),
    },
    gemini: {
      provider: "gemini",
      command: resolveAntigravityCliCommand(),
      installed: probes.geminiInstalled,
      version: probes.versions.gemini,
      ...geminiState,
      account: geminiIdentity,
      detail: geminiState.authState === "logged_in" ? "Antigravity认证已验证" : geminiAuth ? "已发现Antigravity本机状态，运行测试后才能用于任务" : "请启动Antigravity CLI完成登录",
      install: installState("gemini"),
    },
    opencode: {
      provider: "opencode",
      command: "opencode",
      installed: probes.openCodeInstalled,
      version: probes.versions.opencode,
      ...openCodeState,
      account: openCodeIdentity,
      detail: openCodeState.authState === "logged_in" ? "OpenCode认证已验证" : openCodeAuth ? "已发现OpenCode Provider凭据，运行测试后才能用于任务" : "请使用OpenCode连接至少一个Provider",
      install: installState("opencode"),
    },
    claudecode: {
      provider: "claudecode",
      command: "claude",
      installed: probes.claudeInstalled,
      version: probes.versions.claude,
      authState: claudeEvidence?.valid ? "configured" : claudeReady ? "credential_detected" : "not_configured",
      authEvidence: publicDevelopmentAgentAuthEvidence(claudeEvidence),
      credentialSource: effectiveClaude.source,
      providerName: effectiveClaude.providerName,
      externalManaged: effectiveClaude.externalManaged,
      detail: claudeReady
        ? (effectiveClaude.externalManaged ? `已同步 ${effectiveClaude.providerName}` : "第三方 Anthropic 兼容 API 已配置")
        : "请填写 API 地址、模型和密钥",
      install: installState("claudecode"),
    },
    checkedAt: new Date().toISOString(),
  };
}

function storeAgentProviderStatuses(value: any) {
  STATUS_CACHE.set("all", { expiresAt: Date.now() + STATUS_CACHE_TTL_MS, value });
  return value;
}

// 占位结果：探测字段按"未安装"处理，凭据/配置类字段仍是实时读取的真实值。
// 不写入 STATUS_CACHE，避免占位数据顶掉真实探测结果。
function pendingAgentProviderStatuses() {
  return assembleAgentProviderStatuses({
    cursorCommand: "cursor-agent",
    cursorInstalled: false,
    cursor: { loggedIn: false, account: "", detail: "正在探测 Agent 状态，请稍后刷新" },
    codexInstalled: false,
    geminiInstalled: false,
    openCodeInstalled: false,
    claudeInstalled: false,
    versions: { codex: "", cursor: "", gemini: "", opencode: "", claude: "" },
  });
}

let statusRefreshPromise: Promise<any> | null = null;
let statusRefreshDirty = false;

export function refreshAgentProviderStatusesAsync(): Promise<any> {
  if (!statusRefreshPromise) {
    statusRefreshDirty = false;
    statusRefreshPromise = collectAgentProviderProbesAsync()
      .then(probes => storeAgentProviderStatuses(assembleAgentProviderStatuses(probes)))
      .finally(() => {
        statusRefreshPromise = null;
        // 刷新期间发生过状态变更事件：本轮探测快照早于事件，重新标脏并补刷一轮
        if (statusRefreshDirty) markAgentProviderStatusesStale();
      });
  }
  return statusRefreshPromise;
}

function markAgentProviderStatusesStale() {
  const cached = STATUS_CACHE.get("all");
  if (cached) STATUS_CACHE.set("all", { ...cached, expiresAt: 0 });
  if (statusRefreshPromise) {
    // 在途探测启动于本次失效事件之前，join 拿到的是旧世界的快照；
    // 记账并在其 finally 中补刷，保证事件之后总有一轮新探测落盘
    statusRefreshDirty = true;
    return;
  }
  void refreshAgentProviderStatusesAsync().catch(() => {});
}

export function getAgentProviderStatuses(force = false) {
  const cached = STATUS_CACHE.get("all");
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) {
    // 命中过期缓存（或 force）：立即返回上次结果并在后台异步刷新。
    // 同步探测会 spawnSync 多个外部 CLI（单个最长 8s），在单进程服务里
    // 会冻结全部请求，因此不允许出现在请求路径上。
    void refreshAgentProviderStatusesAsync().catch(() => {});
    return cached.value;
  }
  if (statusRefreshPromise) {
    // 启动预热尚未完成的窗口：返回占位结果，绝不回退同步探测风暴
    return pendingAgentProviderStatuses();
  }
  // 无缓存且无在途刷新：仅可能出现在非服务器上下文（脚本/CLI 直接调用），保留同步兜底
  return storeAgentProviderStatuses(assembleAgentProviderStatuses(collectAgentProviderProbes()));
}

export function buildAgentProviderLoginSpec(provider: DevelopmentAgentProvider, options: { providerId?: string; methodId?: string } = {}) {
  if (provider === "codex") {
    return { command: "codex", args: ["login", "--device-auth"], env: {}, requiresCode: false };
  }
  if (provider === "cursor") {
    const command = resolveCursorAgentCommand();
    return { command, args: ["login"], env: { NO_OPEN_BROWSER: "1" }, requiresCode: false };
  }
  if (provider === "gemini") {
    return { command: resolveAntigravityCliCommand(), args: [], env: {}, requiresCode: false };
  }
  if (provider === "opencode") {
    const providerId = String(options.providerId || "").trim();
    const methodId = String(options.methodId || "").trim();
    if (providerId && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(providerId)) throw new Error("OpenCode Provider ID格式无效");
    if (methodId && (methodId.length > 120 || /[\r\n\u0000]/.test(methodId))) throw new Error("OpenCode认证方式格式无效");
    return {
      command: "opencode",
      args: ["auth", "login", ...(providerId ? ["--provider", providerId] : []), ...(methodId ? ["--method", methodId] : [])],
      env: {},
      requiresCode: false,
    };
  }
  throw new Error("Claude Code 使用 API 配置，不需要 CLI 登录");
}

function shellCommandText(spec: { command: string; args: string[] }) {
  const quote = (value: string) => /^[a-zA-Z0-9_./:@=-]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'"'"'`)}'`;
  return [spec.command, ...spec.args].map(quote).join(" ");
}

function launchAntigravityInteractive(command: string) {
  if (process.env.CCM_ANTIGRAVITY_DISABLE_INTERACTIVE_LAUNCH === "1") return false;
  if (process.platform !== "win32") return false;
  const escaped = command.replace(/'/g, "''");
  const script = `$Host.UI.RawUI.WindowTitle='CCM - Antigravity CLI 登录'; & '${escaped}'`;
  const child = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-Command", script], {
    detached: true,
    windowsHide: false,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  return true;
}

function appendInstallOutput(provider: DevelopmentAgentProvider, chunk: any) {
  const current = installState(provider);
  const combined = `${current.output || ""}${String(chunk || "")}`;
  // Keep high-frequency process output in memory. The running marker is already
  // persisted, and the final state persists the bounded output once the child exits.
  INSTALL_STATES.set(provider, { ...current, output: combined.slice(-INSTALL_OUTPUT_LIMIT) });
}

export function buildAgentProviderInstallSpec(provider: DevelopmentAgentProvider, installed: boolean) {
  if (provider === "codex") {
    return process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm install --global @openai/codex@latest"] }
      : { command: "npm", args: ["install", "--global", "@openai/codex@latest"] };
  }
  if (provider === "claudecode") {
    return process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm install --global @anthropic-ai/claude-code@latest"] }
      : { command: "npm", args: ["install", "--global", "@anthropic-ai/claude-code@latest"] };
  }
  if (provider === "gemini") {
    if (installed) return { command: resolveAntigravityCliCommand(), args: ["update"] };
    return process.platform === "win32"
      ? {
          command: "powershell.exe",
          args: [
            "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
            "$ProgressPreference='SilentlyContinue'; Invoke-RestMethod -Uri 'https://antigravity.google/cli/install.ps1' | Invoke-Expression",
          ],
        }
      : { command: "sh", args: ["-lc", "curl -fsSL https://antigravity.google/cli/install.sh | bash"] };
  }
  if (provider === "opencode") {
    return process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm install --global opencode-ai@latest"] }
      : { command: "npm", args: ["install", "--global", "opencode-ai@latest"] };
  }
  if (installed) {
    const command = resolveCursorAgentCommand();
    return {
      command,
      args: ["update"],
      shell: process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command),
    };
  }
  if (process.platform === "win32") {
    return {
      command: "powershell.exe",
      args: [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "$ProgressPreference='SilentlyContinue'; Invoke-RestMethod -Uri 'https://cursor.com/install?win32=true' | Invoke-Expression",
      ],
    };
  }
  return { command: "sh", args: ["-lc", "curl https://cursor.com/install -fsS | bash"] };
}

function formatInstallProcessError(
  provider: DevelopmentAgentProvider,
  operation: "install" | "update",
  spec: { command: string; args: string[] },
  error: any,
) {
  const providerLabel = ({
    codex: "Codex CLI",
    cursor: "Cursor Agent",
    gemini: "Antigravity CLI",
    opencode: "OpenCode",
    claudecode: "Claude Code",
  } as Record<DevelopmentAgentProvider, string>)[provider];
  const actionLabel = operation === "update" ? "更新" : "安装";
  const code = String(error?.code || "");
  const errno = Number(error?.errno);
  if (code === "ENOENT" || errno === -4058) {
    return `${providerLabel}${actionLabel}程序无法启动：系统未找到 ${path.basename(spec.command)}。请刷新 Agent 状态后重试，并确认该命令位于 CCM 服务的 PATH 中。`;
  }
  return `${providerLabel}${actionLabel}程序启动失败：${String(error?.message || "未知错误").slice(0, 360)}`;
}

export function startAgentProviderInstall(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider)) throw new Error("不支持的开发 Agent 安装目标");
  const current = installState(provider);
  if (current.status === "running") throw new Error("该 Agent 正在安装或更新");
  // install spec 只有 cursor 分支消费 installed（决定全新安装还是 update），
  // 用实时的轻量探测代替可能过期的缓存快照
  const installed = provider === "cursor"
    ? commandExists(resolveCursorAgentCommand())
    : provider === "gemini"
      ? commandExists(resolveAntigravityCliCommand())
      : commandExists(provider === "claudecode" ? "claude" : provider);
  const operation: "install" | "update" = installed ? "update" : "install";
  const spec = buildAgentProviderInstallSpec(provider, installed);
  const startedAt = new Date().toISOString();
  const child = spawn(spec.command, spec.args, {
    shell: spec.shell === true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: process.platform !== "win32",
  });
  setInstallState(provider, { status: "running", operation, startedAt, output: "", pid: Number(child.pid || 0) });
  child.stdout?.on("data", chunk => appendInstallOutput(provider, chunk));
  child.stderr?.on("data", chunk => appendInstallOutput(provider, chunk));
  child.once("error", error => {
    setInstallState(provider, {
      ...installState(provider),
      status: "failed",
      completedAt: new Date().toISOString(),
      error: formatInstallProcessError(provider, operation, spec, error),
      pid: undefined,
    });
    markAgentProviderStatusesStale();
  });
  child.once("close", code => {
    const previous = installState(provider);
    if (previous.status === "failed" && previous.error) {
      setInstallState(provider, { ...previous, pid: undefined });
      markAgentProviderStatusesStale();
      return;
    }
    const succeeded = code === 0;
    const actionLabel = operation === "update" ? "更新" : "安装";
    const outputTail = String(previous.output || "").trim().slice(-1_200);
    setInstallState(provider, {
      ...previous,
      status: succeeded ? "succeeded" : "failed",
      completedAt: new Date().toISOString(),
      error: succeeded
        ? ""
        : `${actionLabel}失败，进程退出码 ${code ?? "unknown"}${outputTail ? `\n${outputTail}` : ""}`,
      pid: undefined,
    });
    markAgentProviderStatusesStale();
  });
  markAgentProviderStatusesStale();
  invalidateAgentModelCatalog(provider);
  return { provider, launched: true, install: installState(provider) };
}

export function getAgentProviderInstallJobs() {
  ensureInstallStatesLoaded();
  return Object.fromEntries(["codex", "cursor", "gemini", "opencode", "claudecode"].map(provider => [provider, installState(provider as DevelopmentAgentProvider)]));
}

function parseCursorModels(output: string) {
  const models: Array<{ id: string; label: string }> = [];
  for (const line of String(output || "").replace(/\u001b\[[0-9;]*m/g, "").split(/\r?\n/)) {
    const match = line.trim().match(/^([^\s]+)\s+-\s+(.+)$/);
    if (!match || match[1].toLowerCase() === "available") continue;
    models.push({ id: match[1].trim(), label: match[2].trim() });
  }
  return models.slice(0, 160);
}

function parseLineModels(output: string) {
  const seen = new Set<string>();
  const models: Array<{ id: string; label: string }> = [];
  for (const line of String(output || "").replace(/\u001b\[[0-9;]*m/g, "").split(/\r?\n/)) {
    const id = line.trim().split(/\s+/)[0] || "";
    if (!id || !id.includes("/") || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, label: id });
  }
  return models.slice(0, 240);
}

export function parseAntigravityModels(output: string) {
  const seen = new Set<string>();
  const models: Array<{ id: string; label: string }> = [];
  for (const line of stripTerminalFormatting(String(output || "")).split(/\r?\n/)) {
    const id = line.trim().split(/\s+/)[0] || "";
    if (!id || id.startsWith("[") || !/^[A-Za-z0-9][A-Za-z0-9._:/+@\-]{1,179}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, label: id });
  }
  return models.slice(0, 240);
}

function encodeCliArgs(args: string[]) {
  return Buffer.from(JSON.stringify(args), "utf-8").toString("base64");
}

export function buildAgentProviderTestSpec(providerValue: string, modelValue = "", promptFile = "prompt.txt") {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const model = String(modelValue || "").trim();
  if (model && (model.length > 180 || !/^[A-Za-z0-9][A-Za-z0-9._:/+,@\-=\[\]]*$/.test(model))) {
    throw new Error("模型 ID 包含不支持的字符");
  }
  const modelArgs = model ? ["--model", model] : [];
  const cliHelper = path.join(__dirname, "..", "..", "agents", "cli-prompt-runner.js");
  if (provider === "codex") {
    const helper = path.join(__dirname, "..", "..", "agents", "codex-prompt-runner.js");
    const args = ["exec", ...modelArgs, "--sandbox", "read-only", "--ephemeral", "--skip-git-repo-check", "--json", "-"];
    return { command: process.execPath, args: [helper, promptFile, "", encodeCliArgs(args)], env: {} };
  }
  if (provider === "cursor") {
    const args = ["-p", "--mode", "ask", "--trust", ...modelArgs, "--output-format", "json"];
    return { command: process.execPath, args: [cliHelper, promptFile, resolveCursorAgentCommand(), encodeCliArgs(args)], env: {} };
  }
  if (provider === "gemini") {
    const args = ["--mode", "plan", "--output-format", "json", "--print-timeout", "90s", ...modelArgs, "--print"];
    return { command: process.execPath, args: [cliHelper, promptFile, resolveAntigravityCliCommand(), encodeCliArgs(args)], env: {} };
  }
  if (provider === "opencode") {
    const args = ["run", "--format", "json", "--auto", ...modelArgs];
    return { command: process.execPath, args: [cliHelper, promptFile, "opencode", encodeCliArgs(args)], env: {} };
  }
  if (provider === "claudecode") {
    const args = ["--permission-mode", "plan", "--output-format", "json", ...modelArgs, "-p"];
    return { command: process.execPath, args: [cliHelper, promptFile, "claude", encodeCliArgs(args)], env: getConfiguredDevelopmentAgentEnv("claudecode") };
  }
  throw new Error("不支持的开发 Agent 测试目标");
}

function redactAgentTestError(value: unknown) {
  return safeIdentity(String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|key|token)-[A-Za-z0-9_-]{12,}\b/gi, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]"));
}

export function summarizeAgentProviderTestFailure(stderrValue: unknown, stdoutValue: unknown = "", fallback = "Agent 未返回预期测试响应") {
  const output = stripTerminalFormatting(`${String(stderrValue || "")}\n${String(stdoutValue || "")}`);
  if (/IneligibleTierError|UNSUPPORTED_CLIENT/i.test(output)) {
    return "检测到已停止服务的旧Gemini CLI个人版客户端（UNSUPPORTED_CLIENT）。请安装并使用Antigravity CLI后重试";
  }
  const prioritized = [
    output.match(/reasonMessage:\s*['"]([^'"\r\n]+)['"]/i)?.[1],
    output.match(/(?:Error authenticating|Authentication failed|Unauthorized|Forbidden):\s*([^\r\n]+)/i)?.[1],
    ...output.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line
        && !/^Warning:/i.test(line)
        && !/^\s*at\s+/i.test(line)
        && !/^[{}\[\],]+$/.test(line)
        && !/^Ripgrep is not available/i.test(line)),
  ].filter(Boolean);
  return redactAgentTestError(prioritized[0] || fallback) || fallback;
}

function structuredAgentReplies(provider: DevelopmentAgentProvider, rawOutput: string) {
  const output = stripTerminalFormatting(String(rawOutput || ""));
  const replies: string[] = [];
  for (const line of output.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    let value: any;
    try { value = JSON.parse(line); } catch { continue; }
    const add = (candidate: any) => { if (typeof candidate === "string" && candidate.trim()) replies.push(candidate.trim()); };
    if (provider === "codex" && value?.type === "item.completed" && value?.item?.type === "agent_message") add(value.item.text);
    if (provider === "cursor" && ["result", "assistant"].includes(String(value?.type || ""))) add(value.result || value.text || value.message?.content);
    if (provider === "gemini") add(value.response || (value.type === "result" ? value.result : ""));
    if (provider === "opencode" && !["user", "input"].includes(String(value?.role || value?.type || ""))) add(value.text || value.part?.text || value.message?.content);
    if (provider === "claudecode" && value?.type === "result") add(value.result);
  }
  return replies;
}

export function parseAgentProviderTestOutput(rawOutput: string, selectedModel = "", providerValue = "codex", challenge = "") {
  const provider = String(providerValue || "codex").trim().toLowerCase() as DevelopmentAgentProvider;
  const output = stripTerminalFormatting(String(rawOutput || ""));
  const expected = challenge ? `CCM_AGENT_OK:${challenge}` : "CCM_AGENT_OK";
  const replies = structuredAgentReplies(provider, output);
  const usable = replies.some(reply => reply === expected);
  const model = output.match(/["'](?:model|model_id|modelId)["']\s*:\s*["']([^"']{1,180})["']/i)?.[1] || selectedModel || "";
  return { usable, model: safeIdentity(model), replyObserved: replies.length > 0 };
}

async function runAgentProviderTest(provider: DevelopmentAgentProvider, model: string) {
  // 等待一轮真实探测而非信任过期快照，避免刚登录成功就测试被误拒
  const statuses = await refreshAgentProviderStatusesAsync();
  const status = statuses?.[provider];
  const ready = status?.installed === true && ["logged_in", "configured", "credential_detected"].includes(status.authState);
  if (!ready) throw new Error(provider === "claudecode" ? "请先保存完整的 Claude Code API 配置" : "请先安装并登录该 Agent");
  const runDir = path.join(os.homedir(), ".cc-connect", "run", "agent-provider-tests");
  fs.mkdirSync(runDir, { recursive: true });
  const promptFile = path.join(runDir, `${provider}-${randomUUID()}.txt`);
  const challenge = randomUUID().replace(/-/g, "");
  fs.writeFileSync(promptFile, `Reply with exactly CCM_AGENT_OK:${challenge} and nothing else. Do not use tools, read files, or modify anything.`, { encoding: "utf-8", mode: 0o600 });
  const spec = buildAgentProviderTestSpec(provider, model, promptFile);
  const startedAt = Date.now();
  try {
    const execution = await new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve, reject) => {
      const child = spawn(spec.command, spec.args, {
        cwd: runDir,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...spec.env },
        detached: process.platform !== "win32",
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const append = (current: string, chunk: any) => `${current}${String(chunk || "")}`.slice(-AGENT_TEST_OUTPUT_LIMIT);
      child.stdout?.on("data", chunk => { stdout = append(stdout, chunk); });
      child.stderr?.on("data", chunk => { stderr = append(stderr, chunk); });
      child.once("error", reject);
      const timer = setTimeout(() => {
        timedOut = true;
        if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        else if (child.pid) {
          try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch {} }
          setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch {} }, 1500).unref?.();
        }
      }, AGENT_TEST_TIMEOUT_MS);
      child.once("close", code => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr, timedOut });
      });
    });
    const parsed = parseAgentProviderTestOutput(`${execution.stdout}\n${execution.stderr}`, model, provider, challenge);
    const latencyMs = Date.now() - startedAt;
    const usable = !execution.timedOut && execution.code === 0 && parsed.usable;
    const detail = usable
      ? "Agent 已完成最小只读响应测试"
      : execution.timedOut
        ? "Agent 测试超过 90 秒，已终止"
        : summarizeAgentProviderTestFailure(
            execution.stderr,
            execution.stdout,
            `Agent 退出码 ${execution.code ?? "unknown"}`,
          );
    const result = {
      provider,
      usable,
      latencyMs,
      model: parsed.model,
      account: safeIdentity(status?.account),
      detail,
      checkedAt: new Date().toISOString(),
    };
    // A model probe verifies runtime usability, not whether a native OAuth
    // credential exists. Never erase a valid CLI login because a selected
    // model, network request, or command invocation failed.
    if (usable || provider === "claudecode") {
      recordDevelopmentAgentAuthEvidence({
        provider,
        status: usable ? "verified" : "failed",
        source: provider === "claudecode" ? "api_challenge" : "model_challenge",
        account: status?.account,
        model,
        cliVersion: status?.version,
        detail,
        ttlMs: usable ? undefined : 15 * 60 * 1000,
      });
    }
    markAgentProviderStatusesStale();
    return result;
  } finally {
    try { fs.rmSync(promptFile, { force: true }); } catch {}
  }
}

export function testAgentProvider(providerValue: string, modelValue = "") {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider)) throw new Error("不支持的开发 Agent 测试目标");
  const status = getAgentProviderStatuses()?.[provider];
  const key = [provider, String(modelValue || "").trim(), status?.account || "", status?.version || "", status?.authEvidence?.checksum || ""].join("\u0000");
  const existing = AGENT_TESTS_IN_FLIGHT.get(key);
  if (existing) return existing;
  const promise = runAgentProviderTest(provider, String(modelValue || "").trim())
    .finally(() => AGENT_TESTS_IN_FLIGHT.delete(key));
  AGENT_TESTS_IN_FLIGHT.set(key, promise);
  return promise;
}

function codexAccountModels() {
  const candidates = [
    path.join(os.homedir(), ".codex", "cockpit-local-access-model-catalog.json"),
    path.join(os.homedir(), ".codex", "models_cache.json"),
    path.join(os.homedir(), ".codex", "model_catalog.json"),
  ];
  for (const file of candidates) {
    const parsed = readJsonFile(file);
    const sourceModels = Array.isArray(parsed) ? parsed : parsed?.models;
    if (!Array.isArray(sourceModels) || !sourceModels.length) continue;
    const seen = new Set<string>();
    const models = sourceModels.flatMap((item: any) => {
      const id = safeIdentity(item?.slug || item?.id || item?.model);
      const visibility = String(item?.visibility || "").toLowerCase();
      if (!id || seen.has(id) || visibility === "hidden" || visibility === "hide") return [];
      seen.add(id);
      return [{ id, label: safeIdentity(item?.display_name || item?.displayName || item?.name || id) || id }];
    });
    if (models.length) return models.slice(0, 160);
  }
  return [];
}

const GEMINI_CLI_MODEL_EXPORTS = [
  { name: "DEFAULT_GEMINI_MODEL", label: "Gemini Pro" },
  { name: "DEFAULT_GEMINI_FLASH_MODEL", label: "Gemini Flash" },
  { name: "DEFAULT_GEMINI_FLASH_LITE_MODEL", label: "Gemini Flash Lite" },
] as const;

export function parseGeminiCliDefaultModels(source: string) {
  const models: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();
  const add = (idValue: unknown, label: string) => {
    const id = safeIdentity(idValue);
    if (!id || id === "none" || /embedding/i.test(id) || seen.has(id)) return;
    seen.add(id);
    models.push({ id, label: `${label} (${id})` });
  };
  for (const item of GEMINI_CLI_MODEL_EXPORTS) {
    const match = String(source || "").match(new RegExp(`(?:var|const)\\s+${item.name}\\s*=\\s*["']([^"']+)["']`));
    add(match?.[1], item.label);
  }
  // Follow model constants declared by the installed CLI, including gated
  // preview releases that are not re-exported through its entry module.
  const dynamicPattern = /(?:var|const)\s+((?:PREVIEW|DEFAULT|SECONDARY)_GEMINI[A-Z0-9_]*_MODEL)\s*=\s*["']([^"']+)["']/g;
  for (const match of String(source || "").matchAll(dynamicPattern)) {
    const id = safeIdentity(match[2]);
    const label = id
      .split("-")
      .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
      .join(" ");
    add(id, label || safeIdentity(match[1]));
  }
  return models;
}

let geminiCliModelCache: { key: string; models: Array<{ id: string; label: string }> } | null = null;

function geminiCliPackageRoot() {
  const candidates: string[] = [];
  const configured = String(process.env.CCM_GEMINI_CLI_PACKAGE_ROOT || "").trim();
  if (configured) candidates.push(configured);
  try {
    const npmRoot = spawnSync("npm", ["root", "--global"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 8_000,
    });
    const root = String(npmRoot.stdout || "").trim().split(/\r?\n/)[0];
    if (root) candidates.push(path.join(root, "@google", "gemini-cli"));
  } catch {}
  try {
    const command = resolveWindowsCommandPath("gemini");
    const realCommand = fs.realpathSync(command);
    candidates.push(
      path.join(path.dirname(realCommand), "node_modules", "@google", "gemini-cli"),
      path.resolve(path.dirname(realCommand), "..", "lib", "node_modules", "@google", "gemini-cli"),
    );
    const marker = `${path.sep}@google${path.sep}gemini-cli${path.sep}`;
    const markerIndex = realCommand.indexOf(marker);
    if (markerIndex >= 0) candidates.push(realCommand.slice(0, markerIndex + marker.length - 1));
  } catch {}
  return candidates.find(candidate => {
    const manifest = readJsonFile(path.join(candidate, "package.json"));
    return manifest?.name === "@google/gemini-cli";
  }) || "";
}

function geminiCliAccountModels() {
  const packageRoot = geminiCliPackageRoot();
  if (!packageRoot) return [];
  const manifest = readJsonFile(path.join(packageRoot, "package.json"));
  const entryRelative = safeIdentity(manifest?.bin?.gemini || "bundle/gemini.js");
  const entryFile = path.resolve(packageRoot, entryRelative);
  const cacheKey = `${packageRoot}:${safeIdentity(manifest?.version)}:${entryFile}`;
  if (geminiCliModelCache?.key === cacheKey) return geminiCliModelCache.models;
  const sources: string[] = [];
  try {
    const entrySource = fs.readFileSync(entryFile, "utf-8");
    sources.push(entrySource);
    const mainRelative = entrySource.match(/import\(["']\.\/([^"']+\.js)["']\)/)?.[1];
    if (mainRelative) {
      const mainFile = path.resolve(path.dirname(entryFile), mainRelative);
      const mainSource = fs.readFileSync(mainFile, "utf-8");
      sources.push(mainSource);
      const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']\.\/([^"']+\.js)["'];/g;
      for (const match of mainSource.matchAll(importPattern)) {
        if (!GEMINI_CLI_MODEL_EXPORTS.some(item => String(match[1] || "").includes(item.name))) continue;
        const importedFile = path.resolve(path.dirname(mainFile), match[2]);
        sources.push(fs.readFileSync(importedFile, "utf-8"));
      }
    }
  } catch {}
  let models: Array<{ id: string; label: string }> = [];
  for (const source of sources) {
    const parsed = parseGeminiCliDefaultModels(source);
    if (parsed.length > models.length) models = parsed;
    if (models.length === GEMINI_CLI_MODEL_EXPORTS.length) break;
  }
  geminiCliModelCache = { key: cacheKey, models };
  return models;
}

function currentGeminiAccess() {
  const apiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (apiKey) return { apiKey, accessToken: "" };
  const oauth = readJsonFile(path.join(os.homedir(), ".gemini", "oauth_creds.json"));
  return { apiKey: "", accessToken: String(oauth?.access_token || "").trim() };
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch {}
    if (!response.ok) {
      const detail = safeIdentity(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
      throw new Error(detail || `HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGeminiAccountModels() {
  const auth = currentGeminiAccess();
  if (!auth.apiKey && !auth.accessToken) throw new Error("Gemini CLI 没有可用于读取模型目录的凭据");
  const url = auth.apiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(auth.apiKey)}&pageSize=1000`
    : "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
  const payload = await fetchJsonWithTimeout(url, {
    method: "GET",
    headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
  });
  const seen = new Set<string>();
  return (Array.isArray(payload?.models) ? payload.models : []).flatMap((item: any) => {
    const methods = Array.isArray(item?.supportedGenerationMethods) ? item.supportedGenerationMethods : [];
    const id = safeIdentity(item?.name).replace(/^models\//, "");
    if (!id || seen.has(id) || (methods.length && !methods.includes("generateContent"))) return [];
    seen.add(id);
    return [{ id, label: safeIdentity(item?.displayName || id) || id }];
  }).slice(0, 240);
}

async function fetchClaudeProviderModels(settings: ReturnType<typeof loadAgentProviderSettings>) {
  const apiUrl = String(settings.claudecode.apiUrl || "").replace(/\/+$/, "");
  const credential = String(settings.claudecode.apiKey || "");
  if (!apiUrl || !credential) throw new Error("请先配置 Claude Code API 地址和凭据");
  const headers: Record<string, string> = { "anthropic-version": "2023-06-01" };
  if (settings.claudecode.credentialType === "auth_token") headers.Authorization = `Bearer ${credential}`;
  else headers["x-api-key"] = credential;
  const payload = await fetchJsonWithTimeout(`${apiUrl}/v1/models?limit=1000`, { method: "GET", headers });
  const sourceModels = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
  const seen = new Set<string>();
  return sourceModels.flatMap((item: any) => {
    const id = safeIdentity(typeof item === "string" ? item : item?.id || item?.name);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, label: safeIdentity(item?.display_name || item?.displayName || id) || id }];
  }).slice(0, 240);
}

async function computeAgentProviderModels(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const settings = loadAgentProviderSettings();
  if (provider === "codex") {
    const models = codexAccountModels();
    return {
      provider,
      selected: settings.codex.model,
      models: [{ id: "", label: "自动（跟随 Codex CLI）" }, ...models],
      allowsCustom: true,
      source: models.length ? "account_catalog" : "unavailable",
      error: models.length ? "" : "Codex CLI 尚未生成当前账号的模型目录，可先运行一次 Codex 或手动填写模型 ID",
    };
  }
  if (provider === "cursor") {
    const command = resolveCursorAgentCommand();
    if (!commandExists(command)) return { provider, selected: settings.cursor.model, models: [], allowsCustom: true, error: "Cursor Agent 尚未安装" };
    const result = await runCommandCaptureAsync(command, ["models"], { shell: process.platform === "win32", timeoutMs: 20_000 });
    const models = parseCursorModels(String(result.stdout || result.stderr || ""));
    return {
      provider,
      selected: settings.cursor.model,
      models: [{ id: "", label: "自动（由 Cursor 选择）" }, ...models],
      allowsCustom: true,
      source: models.length ? "cli" : "unavailable",
      error: result.status === 0 ? "" : String(result.stderr || result.stdout || "无法读取模型列表").trim().slice(0, 240),
    };
  }
  if (provider === "claudecode") {
    try {
      const effectiveClaude = resolveEffectiveClaudeProviderSettings(settings);
      const models = await fetchClaudeProviderModels({ ...settings, claudecode: effectiveClaude });
      return {
        provider,
        selected: settings.claudecode.model,
        models,
        allowsCustom: true,
        source: models.length ? "provider_api" : "unavailable",
        error: models.length ? "" : "当前 API 没有返回可用模型",
      };
    } catch (error: any) {
      return { provider, selected: settings.claudecode.model, models: [], allowsCustom: true, source: "unavailable", error: safeIdentity(error?.message || "无法读取模型列表") };
    }
  }
  if (provider === "gemini") {
    const command = resolveAntigravityCliCommand();
    if (!commandExists(command)) {
      return { provider, selected: settings.gemini.model, models: [], allowsCustom: true, source: "unavailable", error: "Antigravity CLI尚未安装" };
    }
    const result = await runCommandCaptureAsync(command, ["models"], {
      shell: process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command),
      timeoutMs: 20_000,
    });
    const models = parseAntigravityModels(String(result.stdout || result.stderr || ""));
    return {
      provider,
      selected: settings.gemini.model,
      models: [{ id: "", label: "自动（由 Antigravity CLI 选择）" }, ...models],
      allowsCustom: true,
      source: models.length ? "cli_catalog" : "unavailable",
      detail: models.length ? `已读取当前Antigravity账号可用的 ${models.length} 个模型。` : "",
      error: models.length ? "" : safeIdentity(result.stderr || result.stdout || "Antigravity CLI没有返回可用模型"),
    };
  }
  if (provider === "opencode") {
    if (!commandExists("opencode")) return { provider, selected: settings.opencode.model, models: [], allowsCustom: true, source: "unavailable", error: "OpenCode 尚未安装" };
    const result = await runCommandCaptureAsync("opencode", ["models"], { shell: process.platform === "win32", timeoutMs: 25_000 });
    const models = parseLineModels(String(result.stdout || result.stderr || ""));
    return {
      provider,
      selected: settings.opencode.model,
      models: [{ id: "", label: "自动（由 OpenCode 选择）" }, ...models],
      allowsCustom: true,
      source: models.length ? "cli" : "unavailable",
      error: result.status === 0 ? "" : String(result.stderr || result.stdout || "无法读取模型列表").trim().slice(0, 240),
    };
  }
  throw new Error("不支持的开发 Agent");
}

const MODEL_CATALOG_CACHE = new Map<string, { expiresAt: number; value: any }>();
const MODEL_CATALOG_IN_FLIGHT = new Map<string, Promise<any>>();
let modelCatalogGeneration = 0;

function invalidateAgentModelCatalog(provider?: string) {
  modelCatalogGeneration += 1;
  if (!provider) MODEL_CATALOG_CACHE.clear();
  else for (const key of MODEL_CATALOG_CACHE.keys()) if (key.startsWith(`${provider}\u0000`)) MODEL_CATALOG_CACHE.delete(key);
}

export function getAgentProviderModels(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase();
  const status = getAgentProviderStatuses()?.[provider];
  const key = [provider, status?.account || "", status?.version || "", status?.authEvidence?.checksum || "", modelCatalogGeneration].join("\u0000");
  const cached = MODEL_CATALOG_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve({ ...cached.value, cached: true, generation: modelCatalogGeneration });
  const active = MODEL_CATALOG_IN_FLIGHT.get(key);
  if (active) return active;
  const promise = computeAgentProviderModels(provider)
    .then(value => {
      const result = { ...value, cached: false, generation: modelCatalogGeneration };
      MODEL_CATALOG_CACHE.set(key, { expiresAt: Date.now() + 60_000, value: result });
      return result;
    })
    .finally(() => MODEL_CATALOG_IN_FLIGHT.delete(key));
  MODEL_CATALOG_IN_FLIGHT.set(key, promise);
  return promise;
}

function stripTerminalFormatting(value: string) {
  return String(value || "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

const LOGIN_HOST_SUFFIXES: Record<string, string[]> = {
  codex: ["openai.com"],
  cursor: ["cursor.com", "cursor.sh"],
  gemini: ["google.com", "googleapis.com"],
  opencode: ["openai.com", "opencode.ai"],
};

function isAllowedLoginUrl(provider: DevelopmentAgentProvider, candidate: string) {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    const trustedHost = (LOGIN_HOST_SUFFIXES[provider] || []).some(suffix => host === suffix || host.endsWith(`.${suffix}`));
    if (!trustedHost) return false;
    if (provider === "gemini") {
      return host === "accounts.google.com"
        && url.pathname === "/o/oauth2/v2/auth"
        && url.searchParams.get("response_type") === "code"
        && !!url.searchParams.get("client_id")
        && !!url.searchParams.get("redirect_uri")
        && !!url.searchParams.get("state")
        && !!url.searchParams.get("code_challenge");
    }
    return true;
  } catch {
    return false;
  }
}

export function parseAgentProviderLoginProgress(providerValue: string, rawOutput: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const output = stripTerminalFormatting(rawOutput);
  const wrappedGeminiUrl = provider === "gemini"
    ? output.match(/Please visit the following URL to authorize the application:\s*(https:\/\/[\s\S]+?)(?=\s*(?:Enter the authorization code|$))/i)?.[1]
        ?.replace(/\s+/g, "") || ""
    : "";
  const urls = [wrappedGeminiUrl, ...(output.match(/https:\/\/[^\s<>"']+/gi) || [])].filter(Boolean);
  const authUrl = urls
    .map(value => value.replace(/[),.;]+$/, ""))
    .find(value => isAllowedLoginUrl(provider, value)) || "";
  const explicitCode = output.match(/(?:(?:enter|use)\s+(?:the\s+)?(?:device\s+)?code|(?:device|user)\s+code)(?:\s+is)?\s*:\s*([A-Z0-9][A-Z0-9-]{3,31})/i)?.[1] || "";
  const groupedCode = output.match(/\b[A-Z0-9]{4}(?:-[A-Z0-9]{4})+\b/)?.[0] || "";
  const userCode = String(explicitCode || groupedCode).toUpperCase();
  const awaitingCode = /enter the authorization code|paste the authorization code/i.test(output);
  const succeeded = /login successful|authentication succeeded|logged in as|authentication tokens stored securely/i.test(output);
  const failed = /login (?:failed|error)|failed to authenticate|authentication (?:failed|timed out)|authorization timed out/i.test(output);
  return { authUrl, userCode, awaitingCode, succeeded, failed };
}

function ensureGeminiBrowserAuthSelected() {
  const file = path.join(os.homedir(), ".gemini", "settings.json");
  let parsed: any = {};
  try {
    if (fs.existsSync(file)) parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    throw new Error("Gemini CLI settings.json 无法解析，请修复后重试网页登录");
  }
  parsed = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  parsed.security = parsed.security && typeof parsed.security === "object" && !Array.isArray(parsed.security) ? parsed.security : {};
  parsed.security.auth = parsed.security.auth && typeof parsed.security.auth === "object" && !Array.isArray(parsed.security.auth)
    ? parsed.security.auth
    : {};
  parsed.security.auth.selectedType = "oauth-personal";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(parsed, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, file);
}

function loadLoginPtyModule() {
  if (process.env.CCM_DISABLE_NODE_PTY === "1") return null;
  if (cachedLoginPtyModule !== undefined) return cachedLoginPtyModule;
  try {
    const loaded = runtimeRequire("node-pty");
    cachedLoginPtyModule = typeof loaded?.spawn === "function" ? loaded : null;
  } catch {
    cachedLoginPtyModule = null;
  }
  return cachedLoginPtyModule;
}

function geminiOauthCredentialFile() {
  return path.join(os.homedir(), ".gemini", "oauth_creds.json");
}

function quarantineGeminiCredential(sessionId: string) {
  const credentialFile = geminiOauthCredentialFile();
  if (!fs.existsSync(credentialFile)) return "";
  const stat = fs.lstatSync(credentialFile);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("Gemini OAuth凭据不是受支持的普通文件，已拒绝自动重新登录");
  }
  const backupDir = path.join(os.homedir(), ".cc-connect", "auth-backups");
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backupFile = path.join(backupDir, `gemini-oauth-${sessionId}.json`);
  fs.renameSync(credentialFile, backupFile);
  return backupFile;
}

function settleGeminiCredentialBackup(session: AgentProviderLoginSession, succeeded: boolean) {
  const backupFile = String(session.credentialBackupPath || "");
  if (!backupFile || !fs.existsSync(backupFile)) return;
  const credentialFile = geminiOauthCredentialFile();
  try {
    if (succeeded) {
      fs.unlinkSync(backupFile);
    } else {
      if (fs.existsSync(credentialFile)) {
        const failedFile = `${backupFile}.failed-${Date.now()}`;
        fs.renameSync(credentialFile, failedFile);
      }
      fs.mkdirSync(path.dirname(credentialFile), { recursive: true, mode: 0o700 });
      fs.renameSync(backupFile, credentialFile);
    }
    session.credentialBackupPath = undefined;
  } catch (error: any) {
    session.error = `${session.error || "Gemini登录未完成"}；旧登录凭据恢复失败：${String(error?.message || error).slice(0, 160)}`;
  }
}

function snapshotGeminiSuccessfulCredential(session: AgentProviderLoginSession) {
  if (session.provider !== "gemini") return "";
  const credentialFile = geminiOauthCredentialFile();
  try {
    const stat = fs.lstatSync(credentialFile);
    const parsed = JSON.parse(fs.readFileSync(credentialFile, "utf-8"));
    if (!stat.isFile() || stat.isSymbolicLink() || !parsed || typeof parsed !== "object"
      || !(parsed.access_token || parsed.refresh_token)) return "";
    const backupDir = path.join(os.homedir(), ".cc-connect", "auth-backups");
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const snapshot = path.join(backupDir, `gemini-oauth-success-${session.id}.json`);
    fs.copyFileSync(credentialFile, snapshot);
    try { fs.chmodSync(snapshot, 0o600); } catch {}
    session.credentialSuccessSnapshotPath = snapshot;
    return snapshot;
  } catch { return ""; }
}

function settleGeminiSuccessfulCredential(session: AgentProviderLoginSession) {
  const snapshot = String(session.credentialSuccessSnapshotPath || "");
  if (!snapshot || !fs.existsSync(snapshot)) {
    settleGeminiCredentialBackup(session, true);
    return;
  }
  const credentialFile = geminiOauthCredentialFile();
  try {
    if (!geminiCredentialPresent()) {
      fs.mkdirSync(path.dirname(credentialFile), { recursive: true, mode: 0o700 });
      fs.copyFileSync(snapshot, credentialFile);
      try { fs.chmodSync(credentialFile, 0o600); } catch {}
    }
    if (geminiCredentialPresent()) {
      fs.unlinkSync(snapshot);
      session.credentialSuccessSnapshotPath = undefined;
      settleGeminiCredentialBackup(session, true);
    }
  } catch (error: any) {
    session.error = `${session.error || "Gemini登录已完成"}；持久化凭据失败：${String(error?.message || error).slice(0, 160)}`;
  }
}

function recoverOrphanedGeminiCredentialBackup() {
  const credentialFile = geminiOauthCredentialFile();
  if (fs.existsSync(credentialFile)) return false;
  const backupDir = path.join(os.homedir(), ".cc-connect", "auth-backups");
  if (!fs.existsSync(backupDir)) return false;
  const candidates = fs.readdirSync(backupDir)
    .filter(name => /^gemini-oauth-auth_[a-f0-9]+\.json$/i.test(name))
    .map(name => {
      const file = path.join(backupDir, name);
      try {
        const stat = fs.lstatSync(file);
        return stat.isFile() && !stat.isSymbolicLink() ? { file, mtimeMs: stat.mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { file: string; mtimeMs: number } => !!entry)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (!candidates[0]) return false;
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true, mode: 0o700 });
  fs.renameSync(candidates[0].file, credentialFile);
  return true;
}

function recoverOrphanedGeminiSuccessSnapshot() {
  const credentialFile = geminiOauthCredentialFile();
  if (fs.existsSync(credentialFile)) return false;
  const backupDir = path.join(os.homedir(), ".cc-connect", "auth-backups");
  if (!fs.existsSync(backupDir)) return false;
  const candidates = fs.readdirSync(backupDir)
    .filter(name => /^gemini-oauth-success-auth_[a-f0-9]+\.json$/i.test(name))
    .map(name => {
      const file = path.join(backupDir, name);
      try {
        const stat = fs.lstatSync(file);
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return stat.isFile() && !stat.isSymbolicLink() && (parsed?.access_token || parsed?.refresh_token)
          ? { file, mtimeMs: stat.mtimeMs }
          : null;
      } catch { return null; }
    })
    .filter((entry): entry is { file: string; mtimeMs: number } => !!entry)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (!candidates[0]) return false;
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true, mode: 0o700 });
  fs.copyFileSync(candidates[0].file, credentialFile);
  try { fs.chmodSync(credentialFile, 0o600); } catch {}
  fs.unlinkSync(candidates[0].file);
  return true;
}

// A service crash can happen while a re-login owns the credential backup.
// Restore it before status probing so a restart never turns into a logout.
try {
  recoverOrphanedGeminiSuccessSnapshot();
  recoverOrphanedGeminiCredentialBackup();
} catch {}

function clearLoginPreparationTimer(sessionId: string) {
  const timer = LOGIN_PREPARATION_TIMERS.get(sessionId);
  if (timer) clearTimeout(timer);
  LOGIN_PREPARATION_TIMERS.delete(sessionId);
}

function publicLoginSession(session: AgentProviderLoginSession) {
  return {
    sessionId: session.id,
    provider: session.provider,
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    authUrl: session.authUrl,
    userCode: session.userCode,
    requiresCode: session.requiresCode
      && !!session.authUrl
      && !session.codeSubmitted
      && !["succeeded", "failed"].includes(session.status),
    detail: session.detail,
    error: session.error,
    command: session.command,
  };
}

function providerCredentialPresent(provider: DevelopmentAgentProvider) {
  if (provider === "codex") return codexCredentialPresent();
  if (provider === "gemini") return geminiCredentialPresent();
  if (provider === "opencode") return openCodeCredentialPresent();
  return false;
}

function markLoginVerified(provider: DevelopmentAgentProvider) {
  const command = provider === "cursor"
    ? resolveCursorAgentCommand()
    : provider === "gemini"
      ? resolveAntigravityCliCommand()
      : provider;
  recordDevelopmentAgentAuthEvidence({
    provider,
    status: "verified",
    source: "native_status",
    account: getAgentProviderAccountIdentity(provider),
    cliVersion: commandVersion(command),
    model: getConfiguredDevelopmentAgentModel(provider),
    detail: "Provider原生登录流程已完成",
  });
  invalidateAgentModelCatalog(provider);
  markAgentProviderStatusesStale();
}

function stopLoginChild(session: AgentProviderLoginSession) {
  clearLoginPreparationTimer(session.id);
  try {
    if (session.child && !session.child.killed) session.child.kill();
  } catch {}
  try {
    if (session.pty) session.pty.kill();
  } catch {}
  session.child = undefined;
  session.pty = undefined;
  session.pid = undefined;
}

function completeLoginFromFreshCredential(session: AgentProviderLoginSession) {
  if (["succeeded", "failed"].includes(session.status)) return session.status === "succeeded";
  if (session.requiresCode && !session.codeSubmitted) return false;
  if (!providerCredentialPresent(session.provider)) return false;
  const credentialFingerprint = providerCredentialFingerprint(session.provider);
  if (!credentialFingerprint || credentialFingerprint === session.credentialFingerprintAtStart) return false;
  // Gemini writes oauth_creds.json after the authorization-code exchange, then
  // enters its interactive UI without consistently printing a success line.
  // A submitted code plus a fresh, parseable credential is therefore the
  // authoritative success receipt for Gemini. Other providers still require
  // their explicit success signal.
  if (!session.providerReportedSuccess && !(session.provider === "gemini" && session.codeSubmitted)) return false;
  if (session.provider === "gemini" && !snapshotGeminiSuccessfulCredential(session)) return false;
  session.status = "succeeded";
  session.detail = "网页登录成功";
  session.error = "";
  markLoginVerified(session.provider);
  stopLoginChild(session);
  // Some Gemini CLI versions clean up their credential during interactive
  // process shutdown. Reconcile from the protected success snapshot after the
  // process has had a chance to exit.
  const timer = setTimeout(() => settleGeminiSuccessfulCredential(session), 750);
  timer.unref();
  return true;
}

function appendLoginOutput(session: AgentProviderLoginSession, chunk: any) {
  const nextChunk = String(chunk || "");
  const progressWindow = `${session.progressTail}${nextChunk}`;
  session.progressTail = progressWindow.slice(-512);
  session.output = `${session.output}${nextChunk}`.slice(-LOGIN_OUTPUT_LIMIT);
  const aggregateProgress = parseAgentProviderLoginProgress(session.provider, session.output);
  const incrementalProgress = parseAgentProviderLoginProgress(session.provider, progressWindow);
  if (aggregateProgress.authUrl) {
    clearLoginPreparationTimer(session.id);
    session.authUrl = aggregateProgress.authUrl;
    if (session.status === "starting") session.status = "awaiting_browser";
    session.detail = session.provider === "gemini"
      ? "请在浏览器登录，复制网页验证码并粘贴回CCM"
      : session.userCode ? "请在浏览器输入设备码完成授权" : "请在浏览器完成账号授权";
  }
  if (aggregateProgress.userCode) {
    session.userCode = aggregateProgress.userCode;
    session.detail = "请在浏览器输入设备码完成授权";
  }
  if (incrementalProgress.failed) {
    session.status = "failed";
    session.detail = "网页登录未完成";
    session.error = "第三方 Agent 拒绝或终止了本次认证";
  } else if (incrementalProgress.succeeded) {
    // CLI文字只表示Provider完成了授权交换。还必须证明本轮凭据确实
    // 发生变化，才能向页面报告登录成功；交互式CLI无需自行退出。
    if (session.requiresCode && !session.codeSubmitted) {
      session.status = "awaiting_code";
      session.detail = "请复制Google页面显示的整段验证码并粘贴回CCM";
    } else {
      session.providerReportedSuccess = true;
      session.status = "exchanging";
      session.detail = "网页授权已完成，正在验证本轮登录凭据";
      session.error = "";
      completeLoginFromFreshCredential(session);
    }
  } else if (incrementalProgress.awaitingCode && !session.codeSubmitted) {
    session.status = "awaiting_code";
    session.detail = "网页授权后，请将 Google 授权码粘贴回 CCM";
  }
}

function finalizeLoginProcess(session: AgentProviderLoginSession, code: number | null) {
  clearLoginPreparationTimer(session.id);
  const completedPty = session.pty;
  session.child = undefined;
  session.pty = undefined;
  session.pid = undefined;
  // node-pty can retain its native pipe after the child has already exited.
  try { completedPty?.kill(); } catch {}
  markAgentProviderStatusesStale();
  if (session.status === "succeeded") {
    settleGeminiSuccessfulCredential(session);
    return;
  }
  const authenticated = session.provider === "cursor"
    ? cursorStatus(resolveCursorAgentCommand()).loggedIn
    : providerCredentialPresent(session.provider);
  const credentialChanged = session.provider === "cursor"
    ? authenticated
    : providerCredentialFingerprint(session.provider) !== session.credentialFingerprintAtStart;
  const currentLoginVerified = authenticated
    && credentialChanged
    && (session.providerReportedSuccess || code === 0);
  if (session.status !== "failed" && currentLoginVerified) {
    session.status = "succeeded";
    session.detail = "网页登录成功";
    session.error = "";
    settleGeminiCredentialBackup(session, true);
    markLoginVerified(session.provider);
    return;
  }
  if (session.status !== "failed") {
    session.status = "failed";
    session.detail = "网页登录未完成";
    session.error = authenticated && !credentialChanged
      ? "本轮登录没有生成新的认证凭据，请在浏览器完成授权后重试"
      : `认证进程已结束${code == null ? "" : `（退出码 ${code}）`}`;
  }
  settleGeminiCredentialBackup(session, false);
}

function expireLoginSessions() {
  const now = Date.now();
  for (const [id, session] of LOGIN_SESSIONS) {
    const expiresAt = Date.parse(session.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= now && !["succeeded", "failed"].includes(session.status)) {
      session.status = "failed";
      session.error = "网页登录已超时，请重新发起";
      session.detail = "认证会话已过期";
      stopLoginChild(session);
      settleGeminiCredentialBackup(session, false);
      if (session.credentialSuccessSnapshotPath) {
        try { fs.unlinkSync(session.credentialSuccessSnapshotPath); } catch {}
        session.credentialSuccessSnapshotPath = undefined;
      }
    }
    if (Number.isFinite(expiresAt) && expiresAt + LOGIN_SESSION_TTL_MS <= now) {
      if (session.status === "succeeded") settleGeminiSuccessfulCredential(session);
      LOGIN_SESSIONS.delete(id);
    }
  }
}

export function startAgentProviderLogin(providerValue: string, options: { providerId?: string; methodId?: string } = {}) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!["codex", "cursor", "gemini", "opencode"].includes(provider)) throw new Error("该 Agent 不支持网页登录");
  const spec = buildAgentProviderLoginSpec(provider, options);
  if (!commandExists(spec.command)) throw new Error(`${spec.command} 未安装或不在 PATH 中`);
  if (provider === "gemini") {
    const launched = launchAntigravityInteractive(spec.command);
    markAgentProviderStatusesStale();
    return {
      launched,
      browser: false,
      manual: true,
      command: shellCommandText(spec),
      detail: launched
        ? "已打开Antigravity CLI终端，请按终端提示完成Google账号登录，然后返回CCM点击测试"
        : "请在CCM所在服务器的交互终端运行Antigravity CLI完成登录，然后返回CCM点击测试",
    };
  }
  expireLoginSessions();
  for (const session of LOGIN_SESSIONS.values()) {
    if (session.provider === provider && !["succeeded", "failed"].includes(session.status)) {
      return { launched: true, browser: true, ...publicLoginSession(session) };
    }
  }
  const id = `auth_${randomUUID().replace(/-/g, "")}`;
  const startedAt = new Date();
  const credentialFingerprintAtStart = providerCredentialFingerprint(provider);
  const session: AgentProviderLoginSession = {
    id,
    provider,
    status: "starting",
    startedAt: startedAt.toISOString(),
    expiresAt: new Date(startedAt.getTime() + LOGIN_SESSION_TTL_MS).toISOString(),
    authUrl: "",
    userCode: "",
    requiresCode: spec.requiresCode,
    detail: "正在向第三方 Agent 请求一次性网页登录地址",
    error: "",
    command: shellCommandText(spec),
    output: "",
    credentialFingerprintAtStart,
    providerReportedSuccess: false,
    codeSubmitted: false,
    progressTail: "",
  };
  LOGIN_SESSIONS.set(id, session);
  try {
    const child = spawn(spec.command, spec.args, {
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...spec.env },
    });
    session.child = child;
    session.pid = Number(child.pid || 0);
    child.stdout.on("data", chunk => appendLoginOutput(session, chunk));
    child.stderr.on("data", chunk => appendLoginOutput(session, chunk));
    child.once("error", error => {
      session.status = "failed";
      session.error = String(error?.message || "认证进程启动失败").slice(0, 300);
      session.detail = "无法启动网页登录";
      stopLoginChild(session);
    });
    child.once("close", code => finalizeLoginProcess(session, code));
  } catch (error) {
    LOGIN_SESSIONS.delete(id);
    stopLoginChild(session);
    settleGeminiCredentialBackup(session, false);
    throw error;
  }
  markAgentProviderStatusesStale();
  return { launched: true, browser: true, ...publicLoginSession(session) };
}

export function getAgentProviderLoginSession(providerValue: string, sessionIdValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const sessionId = String(sessionIdValue || "").trim();
  expireLoginSessions();
  const session = LOGIN_SESSIONS.get(sessionId);
  if (!session || session.provider !== provider) throw new Error("网页登录会话不存在或已过期");
  completeLoginFromFreshCredential(session);
  return publicLoginSession(session);
}

export function submitAgentProviderLoginCode(providerValue: string, sessionIdValue: string, codeValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const sessionId = String(sessionIdValue || "").trim();
  const code = String(codeValue || "").trim();
  const session = LOGIN_SESSIONS.get(sessionId);
  if (!session || session.provider !== provider) throw new Error("网页登录会话不存在或已过期");
  const canWriteCode = !!session.pty || !!session.child?.stdin.writable;
  const acceptingCode = ["awaiting_browser", "awaiting_code"].includes(session.status)
    && !!session.authUrl
    && !session.codeSubmitted;
  if (!acceptingCode || !session.requiresCode || !canWriteCode) {
    throw new Error("当前认证会话不需要回填授权码");
  }
  if (!code || code.length > 2048 || /[\r\n\u0000]/.test(code)) throw new Error("授权码格式无效");
  if (session.pty) session.pty.write(`${code}\r`);
  else session.child!.stdin.write(`${code}\n`);
  session.codeSubmitted = true;
  session.status = "exchanging";
  session.detail = "正在验证网页授权结果";
  return publicLoginSession(session);
}

export function logoutAgentProvider(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!['codex', 'cursor', 'gemini', 'opencode'].includes(provider)) throw new Error("该 Agent 不支持 CLI 退出");
  if (provider === "gemini") {
    const command = resolveAntigravityCliCommand();
    if (!commandExists(command)) throw new Error("Antigravity CLI尚未安装");
    const launched = launchAntigravityInteractive(command);
    revokeDevelopmentAgentAuthEvidence(provider, "等待在Antigravity CLI中切换或退出账号");
    invalidateAgentModelCatalog(provider);
    markAgentProviderStatusesStale();
    return {
      provider,
      loggedOut: false,
      interactive: launched,
      manual: !launched,
      command: shellCommandText({ command, args: [] }),
      detail: "Antigravity账号由官方CLI安全管理，请在打开的终端中退出或切换账号",
    };
  }
  if (provider === "opencode") {
    if (!commandExists("opencode")) throw new Error("opencode 未安装或不在 PATH 中");
    if (process.platform !== "win32") {
      markAgentProviderStatusesStale();
      return {
        provider,
        loggedOut: false,
        interactive: true,
        manual: true,
        command: "opencode auth logout",
      };
    }
    const script = "$Host.UI.RawUI.WindowTitle='CCM - OpenCode 退出 Provider'; & 'opencode' auth logout; Write-Host ''; Write-Host '退出流程已结束，可以关闭此窗口。'";
    const child = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-Command", script], {
      detached: true,
      windowsHide: false,
      stdio: "ignore",
      env: { ...process.env },
    });
    child.unref();
    markAgentProviderStatusesStale();
    return { provider, loggedOut: false, interactive: true };
  }
  const command = provider === "codex" ? "codex" : resolveCursorAgentCommand();
  const result = spawnSync(command, ["logout"], {
    shell: process.platform === "win32",
    windowsHide: true,
    encoding: "utf-8",
    timeout: 15_000,
  });
  markAgentProviderStatusesStale();
  revokeDevelopmentAgentAuthEvidence(provider, "Agent退出登录");
  invalidateAgentModelCatalog(provider);
  if (provider === "codex") {
    const sourceAuth = path.join(os.homedir(), ".codex", "auth.json");
    if (result.status !== 0) {
      try {
        if (fs.existsSync(sourceAuth)) fs.unlinkSync(sourceAuth);
        else throw new Error(String(result.stderr || result.stdout || "退出登录失败").trim().slice(0, 240));
      } catch (error: any) {
        throw new Error(error?.message || "退出登录失败");
      }
    }
    purgeManagedCodexAuthCopies();
  } else if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || "退出登录失败").trim().slice(0, 240));
  }
  return { provider, loggedOut: true };
}

function purgeManagedCodexAuthCopies() {
  const root = path.join(os.homedir(), ".cc-connect", "agent-runtime", "codex");
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const authFile = path.join(root, entry.name, "auth.json");
    try { if (fs.existsSync(authFile)) fs.unlinkSync(authFile); } catch {}
  }
}

export function getConfiguredDevelopmentAgentEnv(agentType: string): Record<string, string> {
  const rawRuntime = String(agentType || "").trim().toLowerCase();
  const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
  const settings = loadAgentProviderSettings();
  if (runtime !== "claudecode") return {};
  const claude = resolveEffectiveClaudeProviderSettings(settings);
  if (!claude.enabled) {
    return {
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_MODEL: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_AUTH_TOKEN: "",
    };
  }
  const credentialType = claude.credentialType;
  return {
    ANTHROPIC_BASE_URL: claude.apiUrl,
    ANTHROPIC_MODEL: claude.model,
    ANTHROPIC_API_KEY: credentialType === "api_key" ? claude.apiKey : "",
    ANTHROPIC_AUTH_TOKEN: credentialType === "auth_token" ? claude.apiKey : "",
  };
}

export function getConfiguredDevelopmentAgentModel(agentType: string) {
  const rawRuntime = String(agentType || "").trim().toLowerCase();
  const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
  const settings = loadAgentProviderSettings();
  if (runtime === "codex") return settings.codex.model;
  if (["cursor", "agent", "cursor-agent"].includes(runtime)) return settings.cursor.model;
  if (runtime === "claudecode") return resolveEffectiveClaudeProviderSettings(settings).model;
  if (runtime === "gemini") return settings.gemini.model;
  if (runtime === "opencode") return settings.opencode.model;
  return "";
}

export function usesCodexCliLogin() {
  const settings = loadAgentProviderSettings();
  return settings.codex.enabled && settings.codex.authMode === "cli_login";
}

export function isDevelopmentAgentEnabled(agentType: string) {
  const rawRuntime = String(agentType || "").trim().toLowerCase();
  const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
  const settings = loadAgentProviderSettings();
  if (runtime === "codex") return settings.codex.enabled;
  if (["cursor", "agent", "cursor-agent"].includes(runtime)) return settings.cursor.enabled;
  if (runtime === "claudecode") {
    const claude = resolveEffectiveClaudeProviderSettings(settings);
    return claude.enabled && !!claude.apiUrl && !!claude.model && !!claude.apiKey;
  }
  if (runtime === "gemini") return settings.gemini.enabled;
  if (runtime === "opencode") return settings.opencode.enabled;
  return true;
}

export function isDevelopmentAgentReady(agentType: string) {
  const rawRuntime = String(agentType || "").trim().toLowerCase();
  const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
  if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(runtime)) return isDevelopmentAgentEnabled(runtime);
  const status = getAgentProviderStatuses()[runtime];
  if (!isDevelopmentAgentEnabled(runtime) || !status?.installed) return false;
  return runtime === "claudecode" ? status.authState === "configured" : status.authState === "logged_in";
}

export function agentProviderSettingsFile() {
  return SETTINGS_FILE;
}
