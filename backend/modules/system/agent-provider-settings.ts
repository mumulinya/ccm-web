import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn, spawnSync } from "child_process";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";

export type DevelopmentAgentProvider = "codex" | "cursor" | "gemini" | "opencode" | "claudecode";

type CliAgentProviderSettings = { enabled: boolean; authMode: "cli_login"; model: string };

type StoredAgentProviderSettings = {
  version: 3;
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
  };
  updatedAt: string;
};

const SETTINGS_FILE = path.join(os.homedir(), ".cc-connect", "agent-provider-settings.json");
const STATUS_CACHE = new Map<string, { expiresAt: number; value: any }>();
const INSTALL_OUTPUT_LIMIT = 12_000;
type InstallState = {
  status: "idle" | "running" | "succeeded" | "failed";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  pid?: number;
};
const INSTALL_STATES = new Map<DevelopmentAgentProvider, InstallState>();

function defaults(): StoredAgentProviderSettings {
  return {
    version: 3,
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

function normalizeStored(raw: any): StoredAgentProviderSettings {
  const base = defaults();
  const claudeRaw = raw?.claudecode && typeof raw.claudecode === "object" ? raw.claudecode : {};
  return {
    version: 3,
    codex: { enabled: raw?.codex?.enabled !== false, authMode: "cli_login", model: String(raw?.codex?.model || "").trim() },
    cursor: { enabled: raw?.cursor?.enabled !== false, authMode: "cli_login", model: String(raw?.cursor?.model || "").trim() },
    gemini: { enabled: raw?.gemini?.enabled !== false, authMode: "cli_login", model: String(raw?.gemini?.model || "").trim() },
    opencode: { enabled: raw?.opencode?.enabled !== false, authMode: "cli_login", model: String(raw?.opencode?.model || "").trim() },
    claudecode: {
      enabled: claudeRaw.enabled === true,
      authMode: "api",
      apiUrl: String(claudeRaw.apiUrl || base.claudecode.apiUrl).trim(),
      apiKey: String(claudeRaw.apiKey || "").trim(),
      credentialType: claudeRaw.credentialType === "auth_token" ? "auth_token" : "api_key",
      model: String(claudeRaw.model || "").trim(),
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
  if (updates?.gemini?.model !== undefined) next.gemini.model = String(updates.gemini.model || "").trim();
  if (updates?.opencode?.enabled !== undefined) next.opencode.enabled = updates.opencode.enabled === true;
  if (updates?.opencode?.model !== undefined) next.opencode.model = String(updates.opencode.model || "").trim();
  const claude = updates?.claudecode;
  if (claude && typeof claude === "object") {
    if (claude.enabled !== undefined) next.claudecode.enabled = claude.enabled === true;
    if (claude.apiUrl !== undefined) {
      const apiUrl = String(claude.apiUrl || "").trim().replace(/\/+$/, "");
      if (apiUrl && !/^https?:\/\//i.test(apiUrl)) throw new Error("Claude Code API 地址必须以 http:// 或 https:// 开头");
      next.claudecode.apiUrl = apiUrl;
    }
    if (claude.model !== undefined) next.claudecode.model = String(claude.model || "").trim();
    if (claude.credentialType !== undefined) {
      const type = String(claude.credentialType || "api_key");
      if (!['api_key', 'auth_token'].includes(type)) throw new Error("不支持的 Claude Code 凭据类型");
      next.claudecode.credentialType = type;
    }
    if (claude.clearApiKey === true) next.claudecode.apiKey = "";
    else if (String(claude.apiKey || "").trim()) next.claudecode.apiKey = String(claude.apiKey).trim();
  }
  if (next.claudecode.enabled && (!next.claudecode.apiUrl || !next.claudecode.model || !next.claudecode.apiKey)) {
    throw new Error("启用 Claude Code 前必须填写 API 地址、模型名称和 API Key");
  }
  next.updatedAt = new Date().toISOString();
  const stored: StoredAgentProviderSettings = {
    version: 3,
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
    },
    updatedAt: next.updatedAt,
  };
  writeSettings(stored);
  STATUS_CACHE.clear();
  return loadAgentProviderSettings();
}

export function publicAgentProviderSettings(settings = loadAgentProviderSettings()) {
  const { apiKey, ...claude } = settings.claudecode;
  return {
    version: settings.version,
    codex: settings.codex,
    cursor: settings.cursor,
    gemini: settings.gemini,
    opencode: settings.opencode,
    claudecode: {
      ...claude,
      hasKey: !!apiKey,
      credentialProtected: !!apiKey,
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

export function resolveCursorAgentCommand() {
  if (commandExists("cursor-agent")) return "cursor-agent";
  if (commandExists("agent")) return "agent";
  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"));
    for (const name of ["cursor-agent.cmd", "agent.cmd"]) {
      const candidate = path.join(localAppData, "cursor-agent", name);
      if (commandExists(candidate)) return candidate;
    }
  }
  return "cursor-agent";
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

function geminiCredentialPresent() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  return jsonCredentialPresent([
    path.join(os.homedir(), ".gemini", "oauth_creds.json"),
    path.join(os.homedir(), ".config", "gcloud", "application_default_credentials.json"),
  ]);
}

function openCodeCredentialPresent() {
  return jsonCredentialPresent([
    path.join(os.homedir(), ".local", "share", "opencode", "auth.json"),
    path.join(String(process.env.APPDATA || ""), "opencode", "auth.json"),
    path.join(String(process.env.LOCALAPPDATA || ""), "opencode", "auth.json"),
  ]);
}

function cursorStatus(command: string) {
  if (!commandExists(command)) return { loggedIn: false, account: "", detail: "未安装 Cursor Agent CLI" };
  try {
    const result = spawnSync(command, ["status"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 12_000,
    });
    const output = String(result.stdout || result.stderr || "").replace(/\u001b\[[0-9;]*m/g, "").trim();
    const account = output.match(/Logged in as\s+([^\r\n]+)/i)?.[1]?.trim() || "";
    return { loggedIn: result.status === 0 && /logged in/i.test(output), account, detail: output.slice(0, 180) };
  } catch (error: any) {
    return { loggedIn: false, account: "", detail: String(error?.message || "登录状态检查失败").slice(0, 180) };
  }
}

function installState(provider: DevelopmentAgentProvider): InstallState {
  return INSTALL_STATES.get(provider) || { status: "idle" };
}

export function getAgentProviderStatuses(force = false) {
  const cacheKey = "all";
  const cached = STATUS_CACHE.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;
  const config = loadAgentProviderSettings();
  const cursorCommand = resolveCursorAgentCommand();
  const cursor = cursorStatus(cursorCommand);
  const codexInstalled = commandExists("codex");
  const codexAuth = codexCredentialPresent();
  const geminiInstalled = commandExists("gemini");
  const geminiAuth = geminiCredentialPresent();
  const openCodeInstalled = commandExists("opencode");
  const openCodeAuth = openCodeCredentialPresent();
  const claudeInstalled = commandExists("claude");
  const claudeReady = config.claudecode.enabled && !!config.claudecode.apiUrl && !!config.claudecode.model && !!config.claudecode.apiKey;
  const value = {
    codex: {
      provider: "codex",
      command: "codex",
      installed: codexInstalled,
      version: commandVersion("codex"),
      authState: codexAuth ? "logged_in" : "logged_out",
      detail: codexAuth ? "已发现本机 Codex CLI 登录凭据" : "尚未发现本机 Codex CLI 登录凭据",
      install: installState("codex"),
    },
    cursor: {
      provider: "cursor",
      command: cursorCommand,
      installed: commandExists(cursorCommand),
      version: commandVersion(cursorCommand),
      authState: cursor.loggedIn ? "logged_in" : "logged_out",
      account: cursor.account,
      detail: cursor.detail,
      install: installState("cursor"),
    },
    gemini: {
      provider: "gemini",
      command: "gemini",
      installed: geminiInstalled,
      version: commandVersion("gemini"),
      authState: geminiAuth ? "logged_in" : "logged_out",
      detail: geminiAuth ? "已发现 Gemini CLI 的 Google 或 API 凭据" : "请启动 Gemini CLI 完成 Google 登录或配置 API 凭据",
      install: installState("gemini"),
    },
    opencode: {
      provider: "opencode",
      command: "opencode",
      installed: openCodeInstalled,
      version: commandVersion("opencode"),
      authState: openCodeAuth ? "logged_in" : "logged_out",
      detail: openCodeAuth ? "已发现 OpenCode Provider 凭据" : "请使用 OpenCode 连接至少一个模型 Provider",
      install: installState("opencode"),
    },
    claudecode: {
      provider: "claudecode",
      command: "claude",
      installed: claudeInstalled,
      version: commandVersion("claude"),
      authState: claudeReady ? "configured" : "not_configured",
      detail: claudeReady ? "第三方 Anthropic 兼容 API 已配置" : "请填写 API 地址、模型和密钥",
      install: installState("claudecode"),
    },
    checkedAt: new Date().toISOString(),
  };
  STATUS_CACHE.set(cacheKey, { expiresAt: Date.now() + 10_000, value });
  return value;
}

function loginCommand(provider: DevelopmentAgentProvider) {
  if (provider === "codex") return { command: "codex", args: ["login"], title: "CCM - Codex 登录" };
  if (provider === "cursor") {
    const command = resolveCursorAgentCommand();
    return { command, args: ["login"], title: "CCM - Cursor 登录" };
  }
  if (provider === "gemini") return { command: "gemini", args: [], title: "CCM - Gemini CLI 登录" };
  if (provider === "opencode") return { command: "opencode", args: ["auth", "login"], title: "CCM - OpenCode Provider 登录" };
  throw new Error("Claude Code 使用 API 配置，不需要 CLI 登录");
}

function appendInstallOutput(provider: DevelopmentAgentProvider, chunk: any) {
  const current = installState(provider);
  const combined = `${current.output || ""}${String(chunk || "")}`;
  INSTALL_STATES.set(provider, { ...current, output: combined.slice(-INSTALL_OUTPUT_LIMIT) });
}

function installSpec(provider: DevelopmentAgentProvider, installed: boolean) {
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
    return process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm install --global @google/gemini-cli@latest"] }
      : { command: "npm", args: ["install", "--global", "@google/gemini-cli@latest"] };
  }
  if (provider === "opencode") {
    return process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm install --global opencode-ai@latest"] }
      : { command: "npm", args: ["install", "--global", "opencode-ai@latest"] };
  }
  if (installed) {
    const command = resolveCursorAgentCommand();
    return { command, args: ["update"] };
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

export function startAgentProviderInstall(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider)) throw new Error("不支持的开发 Agent 安装目标");
  const current = installState(provider);
  if (current.status === "running") throw new Error("该 Agent 正在安装或更新");
  const statuses = getAgentProviderStatuses(true);
  const spec = installSpec(provider, statuses?.[provider]?.installed === true);
  const startedAt = new Date().toISOString();
  const child = spawn(spec.command, spec.args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  INSTALL_STATES.set(provider, { status: "running", startedAt, output: "", pid: Number(child.pid || 0) });
  child.stdout?.on("data", chunk => appendInstallOutput(provider, chunk));
  child.stderr?.on("data", chunk => appendInstallOutput(provider, chunk));
  child.once("error", error => {
    INSTALL_STATES.set(provider, {
      ...installState(provider),
      status: "failed",
      completedAt: new Date().toISOString(),
      error: String(error?.message || "安装进程启动失败").slice(0, 500),
    });
    STATUS_CACHE.clear();
  });
  child.once("close", code => {
    const previous = installState(provider);
    const succeeded = code === 0;
    INSTALL_STATES.set(provider, {
      ...previous,
      status: succeeded ? "succeeded" : "failed",
      completedAt: new Date().toISOString(),
      error: succeeded ? "" : `安装进程退出码 ${code ?? "unknown"}`,
      pid: undefined,
    });
    STATUS_CACHE.clear();
  });
  STATUS_CACHE.clear();
  return { provider, launched: true, install: installState(provider) };
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

export function getAgentProviderModels(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  const settings = loadAgentProviderSettings();
  if (provider === "codex") {
    return {
      provider,
      selected: settings.codex.model,
      models: [
        { id: "", label: "自动（跟随 Codex CLI）" },
        { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
        { id: "gpt-5.2-codex", label: "GPT-5.2-Codex" },
      ],
      allowsCustom: true,
    };
  }
  if (provider === "cursor") {
    const command = resolveCursorAgentCommand();
    if (!commandExists(command)) return { provider, selected: settings.cursor.model, models: [], allowsCustom: true, error: "Cursor Agent 尚未安装" };
    const result = spawnSync(command, ["models"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 20_000,
      maxBuffer: 1024 * 1024,
    });
    const models = parseCursorModels(String(result.stdout || result.stderr || ""));
    return {
      provider,
      selected: settings.cursor.model,
      models: [{ id: "", label: "自动（由 Cursor 选择）" }, ...models],
      allowsCustom: true,
      error: result.status === 0 ? "" : String(result.stderr || result.stdout || "无法读取模型列表").trim().slice(0, 240),
    };
  }
  if (provider === "claudecode") {
    return {
      provider,
      selected: settings.claudecode.model,
      models: [
        { id: "sonnet", label: "Sonnet（API 别名）" },
        { id: "opus", label: "Opus（API 别名）" },
      ],
      allowsCustom: true,
    };
  }
  if (provider === "gemini") {
    return {
      provider,
      selected: settings.gemini.model,
      models: [
        { id: "", label: "自动（由 Gemini CLI 选择）" },
        { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
        { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
      ],
      allowsCustom: true,
    };
  }
  if (provider === "opencode") {
    if (!commandExists("opencode")) return { provider, selected: settings.opencode.model, models: [], allowsCustom: true, error: "OpenCode 尚未安装" };
    const result = spawnSync("opencode", ["models"], {
      shell: process.platform === "win32",
      windowsHide: true,
      encoding: "utf-8",
      timeout: 25_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return {
      provider,
      selected: settings.opencode.model,
      models: [{ id: "", label: "自动（由 OpenCode 选择）" }, ...parseLineModels(String(result.stdout || result.stderr || ""))],
      allowsCustom: true,
      error: result.status === 0 ? "" : String(result.stderr || result.stdout || "无法读取模型列表").trim().slice(0, 240),
    };
  }
  throw new Error("不支持的开发 Agent");
}

export function startAgentProviderLogin(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!['codex', 'cursor', 'gemini', 'opencode'].includes(provider)) throw new Error("该 Agent 不支持 CLI 登录");
  const spec = loginCommand(provider);
  if (!commandExists(spec.command)) throw new Error(`${spec.command} 未安装或不在 PATH 中`);
  const escapedArgs = spec.args.map(item => `'${item.replace(/'/g, "''")}'`).join(",");
  const script = `$Host.UI.RawUI.WindowTitle='${spec.title}'; $ccmLoginArgs=@(${escapedArgs}); & '${spec.command}' @ccmLoginArgs; Write-Host ''; Write-Host '登录流程已结束，可以关闭此窗口。'`;
  const child = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-Command", script], {
    detached: true,
    windowsHide: false,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  STATUS_CACHE.clear();
  return { provider, launched: true };
}

export function logoutAgentProvider(providerValue: string) {
  const provider = String(providerValue || "").trim().toLowerCase() as DevelopmentAgentProvider;
  if (!['codex', 'cursor', 'gemini', 'opencode'].includes(provider)) throw new Error("该 Agent 不支持 CLI 退出");
  if (provider === "gemini") {
    const oauthFile = path.join(os.homedir(), ".gemini", "oauth_creds.json");
    if (fs.existsSync(oauthFile)) fs.unlinkSync(oauthFile);
    else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error("Gemini 当前使用环境变量凭据，请在系统环境变量中移除后重新检查");
    }
    STATUS_CACHE.clear();
    return { provider, loggedOut: true };
  }
  if (provider === "opencode") {
    if (!commandExists("opencode")) throw new Error("opencode 未安装或不在 PATH 中");
    const script = "$Host.UI.RawUI.WindowTitle='CCM - OpenCode 退出 Provider'; & 'opencode' auth logout; Write-Host ''; Write-Host '退出流程已结束，可以关闭此窗口。'";
    const child = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-Command", script], {
      detached: true,
      windowsHide: false,
      stdio: "ignore",
      env: { ...process.env },
    });
    child.unref();
    STATUS_CACHE.clear();
    return { provider, loggedOut: false, interactive: true };
  }
  const command = provider === "codex" ? "codex" : resolveCursorAgentCommand();
  const result = spawnSync(command, ["logout"], {
    shell: process.platform === "win32",
    windowsHide: true,
    encoding: "utf-8",
    timeout: 15_000,
  });
  STATUS_CACHE.clear();
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
  if (!settings.claudecode.enabled) {
    return {
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_MODEL: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_AUTH_TOKEN: "",
    };
  }
  const credentialType = settings.claudecode.credentialType;
  return {
    ANTHROPIC_BASE_URL: settings.claudecode.apiUrl,
    ANTHROPIC_MODEL: settings.claudecode.model,
    ANTHROPIC_API_KEY: credentialType === "api_key" ? settings.claudecode.apiKey : "",
    ANTHROPIC_AUTH_TOKEN: credentialType === "auth_token" ? settings.claudecode.apiKey : "",
  };
}

export function getConfiguredDevelopmentAgentModel(agentType: string) {
  const rawRuntime = String(agentType || "").trim().toLowerCase();
  const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
  const settings = loadAgentProviderSettings();
  if (runtime === "codex") return settings.codex.model;
  if (["cursor", "agent", "cursor-agent"].includes(runtime)) return settings.cursor.model;
  if (runtime === "claudecode") return settings.claudecode.model;
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
    return settings.claudecode.enabled
      && !!settings.claudecode.apiUrl
      && !!settings.claudecode.model
      && !!settings.claudecode.apiKey;
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
