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
exports.loadStoredAgentProviderSettings = loadStoredAgentProviderSettings;
exports.loadAgentProviderSettings = loadAgentProviderSettings;
exports.resolveEffectiveClaudeProviderSettings = resolveEffectiveClaudeProviderSettings;
exports.saveAgentProviderSettings = saveAgentProviderSettings;
exports.publicAgentProviderSettings = publicAgentProviderSettings;
exports.resolveCursorAgentCommand = resolveCursorAgentCommand;
exports.getAgentProviderAccountIdentity = getAgentProviderAccountIdentity;
exports.parseCursorAuthStatus = parseCursorAuthStatus;
exports.getAgentProviderStatuses = getAgentProviderStatuses;
exports.startAgentProviderInstall = startAgentProviderInstall;
exports.buildAgentProviderTestSpec = buildAgentProviderTestSpec;
exports.parseAgentProviderTestOutput = parseAgentProviderTestOutput;
exports.testAgentProvider = testAgentProvider;
exports.getAgentProviderModels = getAgentProviderModels;
exports.parseAgentProviderLoginProgress = parseAgentProviderLoginProgress;
exports.startAgentProviderLogin = startAgentProviderLogin;
exports.getAgentProviderLoginSession = getAgentProviderLoginSession;
exports.submitAgentProviderLoginCode = submitAgentProviderLoginCode;
exports.logoutAgentProvider = logoutAgentProvider;
exports.getConfiguredDevelopmentAgentEnv = getConfiguredDevelopmentAgentEnv;
exports.getConfiguredDevelopmentAgentModel = getConfiguredDevelopmentAgentModel;
exports.usesCodexCliLogin = usesCodexCliLogin;
exports.isDevelopmentAgentEnabled = isDevelopmentAgentEnabled;
exports.isDevelopmentAgentReady = isDevelopmentAgentReady;
exports.agentProviderSettingsFile = agentProviderSettingsFile;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const credential_store_1 = require("../../core/credential-store");
const cc_switch_provider_1 = require("./cc-switch-provider");
const SETTINGS_FILE = path.join(os.homedir(), ".cc-connect", "agent-provider-settings.json");
const STATUS_CACHE = new Map();
const INSTALL_OUTPUT_LIMIT = 12_000;
const INSTALL_STATES = new Map();
const LOGIN_OUTPUT_LIMIT = 24_000;
const LOGIN_SESSION_TTL_MS = 10 * 60 * 1000;
const LOGIN_SESSIONS = new Map();
const AGENT_TEST_TIMEOUT_MS = 90_000;
const AGENT_TEST_OUTPUT_LIMIT = 128 * 1024;
const AGENT_TEST_PROMPT = "Reply with exactly CCM_AGENT_OK and nothing else. Do not use tools, read files, or modify anything.";
const AGENT_TESTS_IN_FLIGHT = new Map();
function defaults() {
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
function writeSettings(settings) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    const temp = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(settings, null, 2), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temp, SETTINGS_FILE);
    try {
        fs.chmodSync(SETTINGS_FILE, 0o600);
    }
    catch { }
}
function normalizeStored(raw) {
    const base = defaults();
    const claudeRaw = raw?.claudecode && typeof raw.claudecode === "object" ? raw.claudecode : {};
    return {
        version: 4,
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
            syncExternal: claudeRaw.syncExternal !== false,
        },
        updatedAt: String(raw?.updatedAt || ""),
    };
}
function loadStoredAgentProviderSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE))
            return defaults();
        const parsed = normalizeStored(JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")));
        if (parsed.claudecode.apiKey && !(0, credential_store_1.isCredentialReference)(parsed.claudecode.apiKey)) {
            parsed.claudecode.apiKey = (0, credential_store_1.protectCredential)("development-agent-claudecode", "apiKey", parsed.claudecode.apiKey);
            writeSettings(parsed);
        }
        return parsed;
    }
    catch {
        return defaults();
    }
}
function loadAgentProviderSettings() {
    const stored = loadStoredAgentProviderSettings();
    return {
        ...stored,
        claudecode: {
            ...stored.claudecode,
            apiKey: stored.claudecode.apiKey ? (0, credential_store_1.resolveCredential)(stored.claudecode.apiKey) : "",
        },
    };
}
function resolveEffectiveClaudeProviderSettings(settings = loadAgentProviderSettings()) {
    const explicitReady = settings.claudecode.enabled
        && !!settings.claudecode.apiUrl
        && !!settings.claudecode.model
        && !!settings.claudecode.apiKey;
    if (explicitReady)
        return { ...settings.claudecode, source: "ccm", providerName: "CCM 手动配置", externalManaged: false };
    const external = settings.claudecode.syncExternal !== false ? (0, cc_switch_provider_1.loadCcSwitchClaudeProvider)() : null;
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
    return { ...settings.claudecode, source: "ccm", providerName: "CCM 手动配置", externalManaged: false };
}
function saveAgentProviderSettings(updates) {
    const current = loadAgentProviderSettings();
    const next = {
        ...current,
        codex: { ...current.codex },
        cursor: { ...current.cursor },
        gemini: { ...current.gemini },
        opencode: { ...current.opencode },
        claudecode: { ...current.claudecode },
    };
    if (updates?.codex?.enabled !== undefined)
        next.codex.enabled = updates.codex.enabled === true;
    if (updates?.codex?.model !== undefined)
        next.codex.model = String(updates.codex.model || "").trim();
    if (updates?.cursor?.enabled !== undefined)
        next.cursor.enabled = updates.cursor.enabled === true;
    if (updates?.cursor?.model !== undefined)
        next.cursor.model = String(updates.cursor.model || "").trim();
    if (updates?.gemini?.enabled !== undefined)
        next.gemini.enabled = updates.gemini.enabled === true;
    if (updates?.gemini?.model !== undefined)
        next.gemini.model = String(updates.gemini.model || "").trim();
    if (updates?.opencode?.enabled !== undefined)
        next.opencode.enabled = updates.opencode.enabled === true;
    if (updates?.opencode?.model !== undefined)
        next.opencode.model = String(updates.opencode.model || "").trim();
    const claude = updates?.claudecode;
    if (claude && typeof claude === "object") {
        if (claude.enabled !== undefined)
            next.claudecode.enabled = claude.enabled === true;
        if (claude.apiUrl !== undefined) {
            const apiUrl = String(claude.apiUrl || "").trim().replace(/\/+$/, "");
            if (apiUrl && !/^https?:\/\//i.test(apiUrl))
                throw new Error("Claude Code API 地址必须以 http:// 或 https:// 开头");
            next.claudecode.apiUrl = apiUrl;
        }
        if (claude.model !== undefined)
            next.claudecode.model = String(claude.model || "").trim();
        if (claude.credentialType !== undefined) {
            const type = String(claude.credentialType || "api_key");
            if (!['api_key', 'auth_token'].includes(type))
                throw new Error("不支持的 Claude Code 凭据类型");
            next.claudecode.credentialType = type;
        }
        if (claude.syncExternal !== undefined)
            next.claudecode.syncExternal = claude.syncExternal !== false;
        if (claude.clearApiKey === true)
            next.claudecode.apiKey = "";
        else if (String(claude.apiKey || "").trim())
            next.claudecode.apiKey = String(claude.apiKey).trim();
    }
    const externalClaude = next.claudecode.syncExternal !== false ? (0, cc_switch_provider_1.loadCcSwitchClaudeProvider)() : null;
    if (next.claudecode.enabled && (!next.claudecode.apiUrl || !next.claudecode.model || !next.claudecode.apiKey) && !externalClaude) {
        throw new Error("启用 Claude Code 前必须填写 API 地址、模型名称和 API Key");
    }
    next.updatedAt = new Date().toISOString();
    const stored = {
        version: 4,
        codex: { enabled: next.codex.enabled, authMode: "cli_login", model: next.codex.model },
        cursor: { enabled: next.cursor.enabled, authMode: "cli_login", model: next.cursor.model },
        gemini: { enabled: next.gemini.enabled, authMode: "cli_login", model: next.gemini.model },
        opencode: { enabled: next.opencode.enabled, authMode: "cli_login", model: next.opencode.model },
        claudecode: {
            enabled: next.claudecode.enabled,
            authMode: "api",
            apiUrl: next.claudecode.apiUrl,
            apiKey: next.claudecode.apiKey ? (0, credential_store_1.protectCredential)("development-agent-claudecode", "apiKey", next.claudecode.apiKey) : "",
            credentialType: next.claudecode.credentialType,
            model: next.claudecode.model,
            syncExternal: next.claudecode.syncExternal !== false,
        },
        updatedAt: next.updatedAt,
    };
    writeSettings(stored);
    STATUS_CACHE.clear();
    return loadAgentProviderSettings();
}
function publicAgentProviderSettings(settings = loadAgentProviderSettings()) {
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
function commandExists(command) {
    if (/[\\/]/.test(command)) {
        try {
            return fs.statSync(command).isFile();
        }
        catch {
            return false;
        }
    }
    try {
        const probe = process.platform === "win32"
            ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, stdio: "ignore" })
            : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
        return probe.status === 0;
    }
    catch {
        return false;
    }
}
function resolveCursorAgentCommand() {
    if (commandExists("cursor-agent"))
        return "cursor-agent";
    if (commandExists("agent"))
        return "agent";
    if (process.platform === "win32") {
        const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"));
        for (const name of ["cursor-agent.cmd", "agent.cmd"]) {
            const candidate = path.join(localAppData, "cursor-agent", name);
            if (commandExists(candidate))
                return candidate;
        }
    }
    return "cursor-agent";
}
function commandVersion(command) {
    if (!commandExists(command))
        return "";
    try {
        const result = (0, child_process_1.spawnSync)(command, ["--version"], {
            shell: process.platform === "win32",
            windowsHide: true,
            encoding: "utf-8",
            timeout: 8_000,
        });
        return String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0].slice(0, 120);
    }
    catch {
        return "";
    }
}
function readJsonFile(file) {
    try {
        if (!fs.statSync(file).isFile())
            return null;
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}
function jwtPublicClaims(token) {
    try {
        const encoded = String(token || "").split(".")[1] || "";
        if (!encoded)
            return {};
        const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}
function safeIdentity(value) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 160);
}
function identityFromJwt(token) {
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
    if (active)
        return active;
    const oauth = readJsonFile(path.join(os.homedir(), ".gemini", "oauth_creds.json"));
    const oauthIdentity = identityFromJwt(oauth?.id_token);
    if (oauthIdentity)
        return oauthIdentity;
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
    if (!parsed)
        return "";
    const identities = [];
    for (const [provider, credential] of Object.entries(parsed)) {
        if (!credential || typeof credential !== "object")
            continue;
        const value = credential;
        const jwtIdentity = identityFromJwt(value.id_token || value.idToken || value.access_token || value.access);
        const accountId = safeIdentity(value.email || value.account || value.accountId || value.user);
        const identity = jwtIdentity || accountId;
        identities.push(identity ? `${provider}: ${identity}` : provider);
    }
    return safeIdentity(identities.join(" · "));
}
function getAgentProviderAccountIdentity(providerValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    if (provider === "codex")
        return codexAccountIdentity();
    if (provider === "cursor")
        return cursorAccountIdentity();
    if (provider === "gemini")
        return geminiAccountIdentity();
    if (provider === "opencode")
        return openCodeAccountIdentity();
    return "";
}
function codexCredentialPresent() {
    const file = path.join(os.homedir(), ".codex", "auth.json");
    try {
        if (!fs.statSync(file).isFile())
            return false;
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return !!parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
    }
    catch {
        return false;
    }
}
function jsonCredentialPresent(files) {
    for (const file of files) {
        try {
            if (!fs.statSync(file).isFile())
                continue;
            const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
            if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0)
                return true;
        }
        catch { }
    }
    return false;
}
function geminiCredentialPresent() {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)
        return true;
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
function parseCursorAuthStatus(rawOutput, exitCode) {
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
function cursorStatus(command) {
    if (!commandExists(command))
        return { loggedIn: false, account: "", detail: "未安装 Cursor Agent CLI" };
    const storedAccount = getAgentProviderAccountIdentity("cursor");
    if (storedAccount) {
        return { loggedIn: true, account: storedAccount, detail: "已读取 Cursor Agent 当前登录账号" };
    }
    try {
        const result = (0, child_process_1.spawnSync)(command, ["status"], {
            shell: process.platform === "win32",
            windowsHide: true,
            encoding: "utf-8",
            timeout: 8_000,
        });
        return parseCursorAuthStatus(String(result.stdout || result.stderr || ""), result.status);
    }
    catch (error) {
        return { loggedIn: false, account: "", detail: String(error?.message || "登录状态检查失败").slice(0, 180) };
    }
}
function installState(provider) {
    return INSTALL_STATES.get(provider) || { status: "idle" };
}
function getAgentProviderStatuses(force = false) {
    const cacheKey = "all";
    const cached = STATUS_CACHE.get(cacheKey);
    if (!force && cached && cached.expiresAt > Date.now())
        return cached.value;
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
    const effectiveClaude = resolveEffectiveClaudeProviderSettings(config);
    const claudeReady = effectiveClaude.enabled && !!effectiveClaude.apiUrl && !!effectiveClaude.model && !!effectiveClaude.apiKey;
    const value = {
        codex: {
            provider: "codex",
            command: "codex",
            installed: codexInstalled,
            version: commandVersion("codex"),
            authState: codexAuth ? "logged_in" : "logged_out",
            account: codexAuth ? getAgentProviderAccountIdentity("codex") : "",
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
            account: geminiAuth ? getAgentProviderAccountIdentity("gemini") : "",
            detail: geminiAuth ? "已发现 Gemini CLI 的 Google 或 API 凭据" : "请启动 Gemini CLI 完成 Google 登录或配置 API 凭据",
            install: installState("gemini"),
        },
        opencode: {
            provider: "opencode",
            command: "opencode",
            installed: openCodeInstalled,
            version: commandVersion("opencode"),
            authState: openCodeAuth ? "logged_in" : "logged_out",
            account: openCodeAuth ? getAgentProviderAccountIdentity("opencode") : "",
            detail: openCodeAuth ? "已发现 OpenCode Provider 凭据" : "请使用 OpenCode 连接至少一个模型 Provider",
            install: installState("opencode"),
        },
        claudecode: {
            provider: "claudecode",
            command: "claude",
            installed: claudeInstalled,
            version: commandVersion("claude"),
            authState: claudeReady ? "configured" : "not_configured",
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
    STATUS_CACHE.set(cacheKey, { expiresAt: Date.now() + 10_000, value });
    return value;
}
function loginCommand(provider) {
    if (provider === "codex") {
        return { command: "codex", args: ["login", "--device-auth"], env: {}, requiresCode: false };
    }
    if (provider === "cursor") {
        const command = resolveCursorAgentCommand();
        return { command, args: ["login"], env: { NO_OPEN_BROWSER: "1" }, requiresCode: false };
    }
    if (provider === "gemini") {
        return { command: "gemini", args: [], env: { NO_BROWSER: "true" }, requiresCode: true };
    }
    if (provider === "opencode") {
        return {
            command: "opencode",
            args: ["auth", "login", "--provider", "openai", "--method", "ChatGPT Pro/Plus (headless)"],
            env: {},
            requiresCode: false,
        };
    }
    throw new Error("Claude Code 使用 API 配置，不需要 CLI 登录");
}
function shellCommandText(spec) {
    const quote = (value) => /^[a-zA-Z0-9_./:@=-]+$/.test(value)
        ? value
        : `'${value.replace(/'/g, `'"'"'`)}'`;
    return [spec.command, ...spec.args].map(quote).join(" ");
}
function appendInstallOutput(provider, chunk) {
    const current = installState(provider);
    const combined = `${current.output || ""}${String(chunk || "")}`;
    INSTALL_STATES.set(provider, { ...current, output: combined.slice(-INSTALL_OUTPUT_LIMIT) });
}
function installSpec(provider, installed) {
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
function startAgentProviderInstall(providerValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider))
        throw new Error("不支持的开发 Agent 安装目标");
    const current = installState(provider);
    if (current.status === "running")
        throw new Error("该 Agent 正在安装或更新");
    const statuses = getAgentProviderStatuses(true);
    const spec = installSpec(provider, statuses?.[provider]?.installed === true);
    const startedAt = new Date().toISOString();
    const child = (0, child_process_1.spawn)(spec.command, spec.args, {
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
function parseCursorModels(output) {
    const models = [];
    for (const line of String(output || "").replace(/\u001b\[[0-9;]*m/g, "").split(/\r?\n/)) {
        const match = line.trim().match(/^([^\s]+)\s+-\s+(.+)$/);
        if (!match || match[1].toLowerCase() === "available")
            continue;
        models.push({ id: match[1].trim(), label: match[2].trim() });
    }
    return models.slice(0, 160);
}
function parseLineModels(output) {
    const seen = new Set();
    const models = [];
    for (const line of String(output || "").replace(/\u001b\[[0-9;]*m/g, "").split(/\r?\n/)) {
        const id = line.trim().split(/\s+/)[0] || "";
        if (!id || !id.includes("/") || seen.has(id))
            continue;
        seen.add(id);
        models.push({ id, label: id });
    }
    return models.slice(0, 240);
}
function encodeCliArgs(args) {
    return Buffer.from(JSON.stringify(args), "utf-8").toString("base64");
}
function buildAgentProviderTestSpec(providerValue, modelValue = "", promptFile = "prompt.txt") {
    const provider = String(providerValue || "").trim().toLowerCase();
    const model = String(modelValue || "").trim();
    if (model && (model.length > 180 || !/^[A-Za-z0-9][A-Za-z0-9._:/+,@\-=\[\]]*$/.test(model))) {
        throw new Error("模型 ID 包含不支持的字符");
    }
    const modelArgs = model ? ["--model", model] : [];
    const cliHelper = path.join(__dirname, "..", "..", "agents", "cli-prompt-runner.js");
    if (provider === "codex") {
        const helper = path.join(__dirname, "..", "..", "agents", "codex-prompt-runner.js");
        const args = ["exec", ...modelArgs, "--sandbox", "read-only", "--ephemeral", "--skip-git-repo-check", "-"];
        return { command: process.execPath, args: [helper, promptFile, "", encodeCliArgs(args)], env: {} };
    }
    if (provider === "cursor") {
        const args = ["-p", "--mode", "ask", "--trust", ...modelArgs, "--output-format", "json"];
        return { command: process.execPath, args: [cliHelper, promptFile, resolveCursorAgentCommand(), encodeCliArgs(args)], env: {} };
    }
    if (provider === "gemini") {
        const args = ["--approval-mode", "default", "--skip-trust", "--output-format", "json", ...modelArgs, "--prompt"];
        return { command: process.execPath, args: [cliHelper, promptFile, "gemini", encodeCliArgs(args)], env: {} };
    }
    if (provider === "opencode") {
        const args = ["run", "--format", "json", "--auto", ...modelArgs];
        return { command: process.execPath, args: [cliHelper, promptFile, "opencode", encodeCliArgs(args)], env: {} };
    }
    if (provider === "claudecode") {
        const args = ["--permission-mode", "plan", ...modelArgs, "-p"];
        return { command: process.execPath, args: [cliHelper, promptFile, "claude", encodeCliArgs(args)], env: getConfiguredDevelopmentAgentEnv("claudecode") };
    }
    throw new Error("不支持的开发 Agent 测试目标");
}
function redactAgentTestError(value) {
    return safeIdentity(String(value || "")
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|key|token)-[A-Za-z0-9_-]{12,}\b/gi, "[redacted]")
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]"));
}
function parseAgentProviderTestOutput(rawOutput, selectedModel = "") {
    const output = stripTerminalFormatting(String(rawOutput || ""));
    const usable = /\bCCM_AGENT_OK\b/.test(output);
    const model = output.match(/["'](?:model|model_id|modelId)["']\s*:\s*["']([^"']{1,180})["']/i)?.[1] || selectedModel || "";
    return { usable, model: safeIdentity(model) };
}
async function runAgentProviderTest(provider, model) {
    const statuses = getAgentProviderStatuses();
    const status = statuses?.[provider];
    const ready = status?.installed === true && (provider === "claudecode" ? status.authState === "configured" : status.authState === "logged_in");
    if (!ready)
        throw new Error(provider === "claudecode" ? "请先保存完整的 Claude Code API 配置" : "请先安装并登录该 Agent");
    const runDir = path.join(os.homedir(), ".cc-connect", "run", "agent-provider-tests");
    fs.mkdirSync(runDir, { recursive: true });
    const promptFile = path.join(runDir, `${provider}-${(0, crypto_1.randomUUID)()}.txt`);
    fs.writeFileSync(promptFile, AGENT_TEST_PROMPT, { encoding: "utf-8", mode: 0o600 });
    const spec = buildAgentProviderTestSpec(provider, model, promptFile);
    const startedAt = Date.now();
    try {
        const execution = await new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(spec.command, spec.args, {
                cwd: runDir,
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env, ...spec.env },
            });
            let stdout = "";
            let stderr = "";
            let timedOut = false;
            const append = (current, chunk) => `${current}${String(chunk || "")}`.slice(-AGENT_TEST_OUTPUT_LIMIT);
            child.stdout?.on("data", chunk => { stdout = append(stdout, chunk); });
            child.stderr?.on("data", chunk => { stderr = append(stderr, chunk); });
            child.once("error", reject);
            const timer = setTimeout(() => {
                timedOut = true;
                if (process.platform === "win32" && child.pid)
                    (0, child_process_1.spawnSync)("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
                else
                    child.kill("SIGTERM");
            }, AGENT_TEST_TIMEOUT_MS);
            child.once("close", code => {
                clearTimeout(timer);
                resolve({ code, stdout, stderr, timedOut });
            });
        });
        const parsed = parseAgentProviderTestOutput(`${execution.stdout}\n${execution.stderr}`, model);
        const latencyMs = Date.now() - startedAt;
        const usable = !execution.timedOut && execution.code === 0 && parsed.usable;
        const detail = usable
            ? "Agent 已完成最小只读响应测试"
            : execution.timedOut
                ? "Agent 测试超过 90 秒，已终止"
                : redactAgentTestError(execution.stderr || execution.stdout || `Agent 退出码 ${execution.code ?? "unknown"}`) || "Agent 未返回预期测试响应";
        return {
            provider,
            usable,
            latencyMs,
            model: parsed.model,
            account: safeIdentity(status?.account),
            detail,
            checkedAt: new Date().toISOString(),
        };
    }
    finally {
        try {
            fs.rmSync(promptFile, { force: true });
        }
        catch { }
    }
}
function testAgentProvider(providerValue, modelValue = "") {
    const provider = String(providerValue || "").trim().toLowerCase();
    if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(provider))
        throw new Error("不支持的开发 Agent 测试目标");
    const existing = AGENT_TESTS_IN_FLIGHT.get(provider);
    if (existing)
        return existing;
    const promise = runAgentProviderTest(provider, String(modelValue || "").trim())
        .finally(() => AGENT_TESTS_IN_FLIGHT.delete(provider));
    AGENT_TESTS_IN_FLIGHT.set(provider, promise);
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
        if (!Array.isArray(sourceModels) || !sourceModels.length)
            continue;
        const seen = new Set();
        const models = sourceModels.flatMap((item) => {
            const id = safeIdentity(item?.slug || item?.id || item?.model);
            const visibility = String(item?.visibility || "").toLowerCase();
            if (!id || seen.has(id) || visibility === "hidden" || visibility === "hide")
                return [];
            seen.add(id);
            return [{ id, label: safeIdentity(item?.display_name || item?.displayName || item?.name || id) || id }];
        });
        if (models.length)
            return models.slice(0, 160);
    }
    return [];
}
function currentGeminiAccess() {
    const apiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    if (apiKey)
        return { apiKey, accessToken: "" };
    const oauth = readJsonFile(path.join(os.homedir(), ".gemini", "oauth_creds.json"));
    return { apiKey: "", accessToken: String(oauth?.access_token || "").trim() };
}
async function fetchJsonWithTimeout(url, init, timeoutMs = 12_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const text = await response.text();
        let payload = {};
        try {
            payload = text ? JSON.parse(text) : {};
        }
        catch { }
        if (!response.ok) {
            const detail = safeIdentity(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
            throw new Error(detail || `HTTP ${response.status}`);
        }
        return payload;
    }
    finally {
        clearTimeout(timer);
    }
}
async function fetchGeminiAccountModels() {
    const auth = currentGeminiAccess();
    if (!auth.apiKey && !auth.accessToken)
        throw new Error("Gemini CLI 没有可用于读取模型目录的凭据");
    const url = auth.apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(auth.apiKey)}&pageSize=1000`
        : "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
    const payload = await fetchJsonWithTimeout(url, {
        method: "GET",
        headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
    });
    const seen = new Set();
    return (Array.isArray(payload?.models) ? payload.models : []).flatMap((item) => {
        const methods = Array.isArray(item?.supportedGenerationMethods) ? item.supportedGenerationMethods : [];
        const id = safeIdentity(item?.name).replace(/^models\//, "");
        if (!id || seen.has(id) || (methods.length && !methods.includes("generateContent")))
            return [];
        seen.add(id);
        return [{ id, label: safeIdentity(item?.displayName || id) || id }];
    }).slice(0, 240);
}
async function fetchClaudeProviderModels(settings) {
    const apiUrl = String(settings.claudecode.apiUrl || "").replace(/\/+$/, "");
    const credential = String(settings.claudecode.apiKey || "");
    if (!apiUrl || !credential)
        throw new Error("请先配置 Claude Code API 地址和凭据");
    const headers = { "anthropic-version": "2023-06-01" };
    if (settings.claudecode.credentialType === "auth_token")
        headers.Authorization = `Bearer ${credential}`;
    else
        headers["x-api-key"] = credential;
    const payload = await fetchJsonWithTimeout(`${apiUrl}/v1/models?limit=1000`, { method: "GET", headers });
    const sourceModels = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    const seen = new Set();
    return sourceModels.flatMap((item) => {
        const id = safeIdentity(typeof item === "string" ? item : item?.id || item?.name);
        if (!id || seen.has(id))
            return [];
        seen.add(id);
        return [{ id, label: safeIdentity(item?.display_name || item?.displayName || id) || id }];
    }).slice(0, 240);
}
async function getAgentProviderModels(providerValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
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
        if (!commandExists(command))
            return { provider, selected: settings.cursor.model, models: [], allowsCustom: true, error: "Cursor Agent 尚未安装" };
        const result = (0, child_process_1.spawnSync)(command, ["models"], {
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
        }
        catch (error) {
            return { provider, selected: settings.claudecode.model, models: [], allowsCustom: true, source: "unavailable", error: safeIdentity(error?.message || "无法读取模型列表") };
        }
    }
    if (provider === "gemini") {
        try {
            const models = await fetchGeminiAccountModels();
            return {
                provider,
                selected: settings.gemini.model,
                models: [{ id: "", label: "自动（由 Gemini CLI 选择）" }, ...models],
                allowsCustom: true,
                source: models.length ? "provider_api" : "unavailable",
                error: models.length ? "" : "Gemini 当前账号没有返回可用模型",
            };
        }
        catch (error) {
            return {
                provider,
                selected: settings.gemini.model,
                models: [{ id: "", label: "自动（由 Gemini CLI 选择）" }],
                allowsCustom: true,
                source: "unavailable",
                error: safeIdentity(error?.message || "Gemini CLI 不支持非交互模型枚举，可使用自动模式或手动填写模型 ID"),
            };
        }
    }
    if (provider === "opencode") {
        if (!commandExists("opencode"))
            return { provider, selected: settings.opencode.model, models: [], allowsCustom: true, source: "unavailable", error: "OpenCode 尚未安装" };
        const result = (0, child_process_1.spawnSync)("opencode", ["models"], {
            shell: process.platform === "win32",
            windowsHide: true,
            encoding: "utf-8",
            timeout: 25_000,
            maxBuffer: 2 * 1024 * 1024,
        });
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
function stripTerminalFormatting(value) {
    return String(value || "")
        .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
        .replace(/\u001b\[[0-?]*[ -\/]*[@-~]/g, "")
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}
const LOGIN_HOST_SUFFIXES = {
    codex: ["openai.com"],
    cursor: ["cursor.com", "cursor.sh"],
    gemini: ["google.com", "googleapis.com"],
    opencode: ["openai.com", "opencode.ai"],
};
function isAllowedLoginUrl(provider, candidate) {
    try {
        const url = new URL(candidate);
        if (url.protocol !== "https:")
            return false;
        const host = url.hostname.toLowerCase();
        return (LOGIN_HOST_SUFFIXES[provider] || []).some(suffix => host === suffix || host.endsWith(`.${suffix}`));
    }
    catch {
        return false;
    }
}
function parseAgentProviderLoginProgress(providerValue, rawOutput) {
    const provider = String(providerValue || "").trim().toLowerCase();
    const output = stripTerminalFormatting(rawOutput);
    const urls = output.match(/https:\/\/[^\s<>"']+/gi) || [];
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
    let parsed = {};
    try {
        if (fs.existsSync(file))
            parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
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
function publicLoginSession(session) {
    return {
        sessionId: session.id,
        provider: session.provider,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        authUrl: session.authUrl,
        userCode: session.userCode,
        requiresCode: session.requiresCode && session.status === "awaiting_code",
        detail: session.detail,
        error: session.error,
        command: session.command,
    };
}
function providerCredentialPresent(provider) {
    if (provider === "codex")
        return codexCredentialPresent();
    if (provider === "gemini")
        return geminiCredentialPresent();
    if (provider === "opencode")
        return openCodeCredentialPresent();
    return false;
}
function stopLoginChild(session) {
    try {
        if (session.child && !session.child.killed)
            session.child.kill();
    }
    catch { }
    session.child = undefined;
    session.pid = undefined;
}
function appendLoginOutput(session, chunk) {
    session.output = `${session.output}${String(chunk || "")}`.slice(-LOGIN_OUTPUT_LIMIT);
    const progress = parseAgentProviderLoginProgress(session.provider, session.output);
    if (progress.authUrl) {
        session.authUrl = progress.authUrl;
        if (session.status === "starting")
            session.status = "awaiting_browser";
        session.detail = session.userCode ? "请在浏览器输入设备码完成授权" : "请在浏览器完成账号授权";
    }
    if (progress.userCode) {
        session.userCode = progress.userCode;
        session.detail = "请在浏览器输入设备码完成授权";
    }
    if (progress.awaitingCode) {
        session.status = "awaiting_code";
        session.detail = "网页授权后，请将 Google 授权码粘贴回 CCM";
    }
    if (progress.succeeded) {
        session.status = "succeeded";
        session.detail = "网页登录成功";
        session.error = "";
        STATUS_CACHE.clear();
    }
    else if (progress.failed) {
        session.status = "failed";
        session.detail = "网页登录未完成";
        session.error = "第三方 Agent 拒绝或终止了本次认证";
    }
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
        }
        if (Number.isFinite(expiresAt) && expiresAt + LOGIN_SESSION_TTL_MS <= now)
            LOGIN_SESSIONS.delete(id);
    }
}
function startAgentProviderLogin(providerValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    if (!["codex", "cursor", "gemini", "opencode"].includes(provider))
        throw new Error("该 Agent 不支持网页登录");
    const spec = loginCommand(provider);
    if (!commandExists(spec.command))
        throw new Error(`${spec.command} 未安装或不在 PATH 中`);
    expireLoginSessions();
    for (const session of LOGIN_SESSIONS.values()) {
        if (session.provider === provider && !["succeeded", "failed"].includes(session.status)) {
            return { launched: true, browser: true, ...publicLoginSession(session) };
        }
    }
    if (provider === "gemini")
        ensureGeminiBrowserAuthSelected();
    const id = `auth_${(0, crypto_1.randomUUID)().replace(/-/g, "")}`;
    const startedAt = new Date();
    const session = {
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
    };
    LOGIN_SESSIONS.set(id, session);
    const child = (0, child_process_1.spawn)(spec.command, spec.args, {
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
    child.once("close", code => {
        session.child = undefined;
        session.pid = undefined;
        STATUS_CACHE.clear();
        const authenticated = provider === "cursor"
            ? cursorStatus(resolveCursorAgentCommand()).loggedIn
            : providerCredentialPresent(provider);
        if (authenticated || session.status === "succeeded") {
            session.status = "succeeded";
            session.detail = "网页登录成功";
            session.error = "";
            return;
        }
        if (session.status !== "failed") {
            session.status = "failed";
            session.detail = "网页登录未完成";
            session.error = `认证进程已结束${code == null ? "" : `（退出码 ${code}）`}`;
        }
    });
    STATUS_CACHE.clear();
    return { launched: true, browser: true, ...publicLoginSession(session) };
}
function getAgentProviderLoginSession(providerValue, sessionIdValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    const sessionId = String(sessionIdValue || "").trim();
    expireLoginSessions();
    const session = LOGIN_SESSIONS.get(sessionId);
    if (!session || session.provider !== provider)
        throw new Error("网页登录会话不存在或已过期");
    if (!["succeeded", "failed"].includes(session.status) && provider !== "cursor" && providerCredentialPresent(provider)) {
        session.status = "succeeded";
        session.detail = "网页登录成功";
        session.error = "";
        stopLoginChild(session);
        STATUS_CACHE.clear();
    }
    return publicLoginSession(session);
}
function submitAgentProviderLoginCode(providerValue, sessionIdValue, codeValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    const sessionId = String(sessionIdValue || "").trim();
    const code = String(codeValue || "").trim();
    const session = LOGIN_SESSIONS.get(sessionId);
    if (!session || session.provider !== provider)
        throw new Error("网页登录会话不存在或已过期");
    if (session.status !== "awaiting_code" || !session.requiresCode || !session.child?.stdin.writable) {
        throw new Error("当前认证会话不需要回填授权码");
    }
    if (!code || code.length > 2048 || /[\r\n\u0000]/.test(code))
        throw new Error("授权码格式无效");
    session.child.stdin.write(`${code}\n`);
    session.status = "exchanging";
    session.detail = "正在验证网页授权结果";
    return publicLoginSession(session);
}
function logoutAgentProvider(providerValue) {
    const provider = String(providerValue || "").trim().toLowerCase();
    if (!['codex', 'cursor', 'gemini', 'opencode'].includes(provider))
        throw new Error("该 Agent 不支持 CLI 退出");
    if (provider === "gemini") {
        const oauthFile = path.join(os.homedir(), ".gemini", "oauth_creds.json");
        if (fs.existsSync(oauthFile))
            fs.unlinkSync(oauthFile);
        else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error("Gemini 当前使用环境变量凭据，请在系统环境变量中移除后重新检查");
        }
        STATUS_CACHE.clear();
        return { provider, loggedOut: true };
    }
    if (provider === "opencode") {
        if (!commandExists("opencode"))
            throw new Error("opencode 未安装或不在 PATH 中");
        if (process.platform !== "win32") {
            STATUS_CACHE.clear();
            return {
                provider,
                loggedOut: false,
                interactive: true,
                manual: true,
                command: "opencode auth logout",
            };
        }
        const script = "$Host.UI.RawUI.WindowTitle='CCM - OpenCode 退出 Provider'; & 'opencode' auth logout; Write-Host ''; Write-Host '退出流程已结束，可以关闭此窗口。'";
        const child = (0, child_process_1.spawn)("powershell.exe", ["-NoLogo", "-NoExit", "-Command", script], {
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
    const result = (0, child_process_1.spawnSync)(command, ["logout"], {
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
                if (fs.existsSync(sourceAuth))
                    fs.unlinkSync(sourceAuth);
                else
                    throw new Error(String(result.stderr || result.stdout || "退出登录失败").trim().slice(0, 240));
            }
            catch (error) {
                throw new Error(error?.message || "退出登录失败");
            }
        }
        purgeManagedCodexAuthCopies();
    }
    else if (result.status !== 0) {
        throw new Error(String(result.stderr || result.stdout || "退出登录失败").trim().slice(0, 240));
    }
    return { provider, loggedOut: true };
}
function purgeManagedCodexAuthCopies() {
    const root = path.join(os.homedir(), ".cc-connect", "agent-runtime", "codex");
    if (!fs.existsSync(root))
        return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const authFile = path.join(root, entry.name, "auth.json");
        try {
            if (fs.existsSync(authFile))
                fs.unlinkSync(authFile);
        }
        catch { }
    }
}
function getConfiguredDevelopmentAgentEnv(agentType) {
    const rawRuntime = String(agentType || "").trim().toLowerCase();
    const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
    const settings = loadAgentProviderSettings();
    if (runtime !== "claudecode")
        return {};
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
function getConfiguredDevelopmentAgentModel(agentType) {
    const rawRuntime = String(agentType || "").trim().toLowerCase();
    const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
    const settings = loadAgentProviderSettings();
    if (runtime === "codex")
        return settings.codex.model;
    if (["cursor", "agent", "cursor-agent"].includes(runtime))
        return settings.cursor.model;
    if (runtime === "claudecode")
        return resolveEffectiveClaudeProviderSettings(settings).model;
    if (runtime === "gemini")
        return settings.gemini.model;
    if (runtime === "opencode")
        return settings.opencode.model;
    return "";
}
function usesCodexCliLogin() {
    const settings = loadAgentProviderSettings();
    return settings.codex.enabled && settings.codex.authMode === "cli_login";
}
function isDevelopmentAgentEnabled(agentType) {
    const rawRuntime = String(agentType || "").trim().toLowerCase();
    const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
    const settings = loadAgentProviderSettings();
    if (runtime === "codex")
        return settings.codex.enabled;
    if (["cursor", "agent", "cursor-agent"].includes(runtime))
        return settings.cursor.enabled;
    if (runtime === "claudecode") {
        const claude = resolveEffectiveClaudeProviderSettings(settings);
        return claude.enabled && !!claude.apiUrl && !!claude.model && !!claude.apiKey;
    }
    if (runtime === "gemini")
        return settings.gemini.enabled;
    if (runtime === "opencode")
        return settings.opencode.enabled;
    return true;
}
function isDevelopmentAgentReady(agentType) {
    const rawRuntime = String(agentType || "").trim().toLowerCase();
    const runtime = ["claude", "claude-code", "claude_code", "cc"].includes(rawRuntime) ? "claudecode" : rawRuntime;
    if (!["codex", "cursor", "gemini", "opencode", "claudecode"].includes(runtime))
        return isDevelopmentAgentEnabled(runtime);
    const status = getAgentProviderStatuses()[runtime];
    if (!isDevelopmentAgentEnabled(runtime) || !status?.installed)
        return false;
    return runtime === "claudecode" ? status.authState === "configured" : status.authState === "logged_in";
}
function agentProviderSettingsFile() {
    return SETTINGS_FILE;
}
//# sourceMappingURL=agent-provider-settings.js.map