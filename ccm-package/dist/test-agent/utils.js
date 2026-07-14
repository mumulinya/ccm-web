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
exports.nowIso = nowIso;
exports.asArray = asArray;
exports.compactText = compactText;
exports.safeSegment = safeSegment;
exports.makeRunId = makeRunId;
exports.ensureDir = ensureDir;
exports.defaultArtifactDir = defaultArtifactDir;
exports.resolveWorkDir = resolveWorkDir;
exports.validateTestAgentWorkDir = validateTestAgentWorkDir;
exports.validateTestAgentUrl = validateTestAgentUrl;
exports.isLikelyProductionTestAgentUrl = isLikelyProductionTestAgentUrl;
exports.stringifyEnv = stringifyEnv;
exports.splitVerificationCommand = splitVerificationCommand;
exports.verificationCommandInvocation = verificationCommandInvocation;
exports.buildTestAgentSubprocessEnv = buildTestAgentSubprocessEnv;
exports.redactTestAgentSensitiveText = redactTestAgentSensitiveText;
exports.appendLimited = appendLimited;
exports.isUnsafeVerificationCommand = isUnsafeVerificationCommand;
exports.resolveUrl = resolveUrl;
exports.hasRequiredCheck = hasRequiredCheck;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
function nowIso() {
    return new Date().toISOString();
}
function asArray(value) {
    if (Array.isArray(value))
        return value.filter(item => item !== undefined && item !== null);
    if (value === undefined || value === null || value === "")
        return [];
    return [value];
}
function compactText(value, max = 4000) {
    const text = String(value ?? "");
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}
function safeSegment(value, fallback = "item") {
    const text = String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return text.slice(0, 80) || fallback;
}
function makeRunId(prefix = "test-agent") {
    return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}
function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
function defaultArtifactDir(runId) {
    return ensureDir(path.join(utils_1.CCM_DIR, "test-agent-artifacts", safeSegment(runId)));
}
function resolveWorkDir(workDir) {
    return path.resolve(String(workDir || process.cwd()));
}
function configuredAllowedWorkDirs() {
    const raw = String(process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS || "").trim();
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    }
    catch {
        return raw.split(path.delimiter).map(item => item.trim()).filter(Boolean);
    }
}
function realPathOrResolved(value) {
    const resolved = path.resolve(value);
    try {
        return fs.realpathSync(resolved);
    }
    catch {
        return resolved;
    }
}
function validateTestAgentWorkDir(workDir) {
    const resolved = path.resolve(String(workDir || ""));
    const allowedRoots = configuredAllowedWorkDirs().map(realPathOrResolved);
    if (!resolved || !fs.existsSync(resolved)) {
        return allowedRoots.length
            ? { valid: false, resolved, error: "workDir does not exist" }
            : { valid: true, resolved, error: "" };
    }
    let stat;
    try {
        stat = fs.statSync(resolved);
    }
    catch {
        return { valid: false, resolved, error: "workDir cannot be read" };
    }
    if (!stat.isDirectory())
        return { valid: false, resolved, error: "workDir is not a directory" };
    const real = realPathOrResolved(resolved);
    if (allowedRoots.length && !allowedRoots.some(root => {
        const relative = path.relative(root, real);
        return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    })) {
        return { valid: false, resolved: real, error: "workDir is outside the registered project roots" };
    }
    return { valid: true, resolved: real, error: "" };
}
function validateTestAgentUrl(value, baseUrl = "") {
    const raw = String(value || "").trim();
    if (!raw)
        return { valid: true, url: "", error: "" };
    let url;
    try {
        url = new URL(raw, baseUrl || undefined);
    }
    catch {
        return { valid: false, url: raw, error: "URL is invalid" };
    }
    if (!/^https?:$/.test(url.protocol))
        return { valid: false, url: url.toString(), error: "only http/https URLs are allowed" };
    if (url.username || url.password)
        return { valid: false, url: url.toString(), error: "inline URL credentials are not allowed" };
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (["169.254.169.254", "100.100.100.200", "metadata.google.internal", "metadata.azure.internal", "fd00:ec2::254"].includes(host)) {
        return { valid: false, url: url.toString(), error: "cloud metadata endpoints are not allowed" };
    }
    return { valid: true, url: url.toString(), error: "" };
}
function isLikelyProductionTestAgentUrl(value) {
    const safety = validateTestAgentUrl(value);
    if (!safety.valid || !safety.url)
        return false;
    const url = new URL(safety.url);
    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host))
        return false;
    if (/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host))
        return false;
    if (/(?:^|[.-])(?:dev|test|testing|stage|staging|preview|sandbox|qa|uat|local)(?:[.-]|$)/i.test(host))
        return false;
    return true;
}
function stringifyEnv(env) {
    const out = {};
    for (const [key, value] of Object.entries(env || {})) {
        if (value !== undefined)
            out[key] = String(value);
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
function splitVerificationCommand(command) {
    const input = String(command || "").trim();
    const tokens = [];
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
            if (char === quote)
                quote = "";
            else
                token += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (/\s/.test(char)) {
            if (token)
                tokens.push(token);
            token = "";
            continue;
        }
        token += char;
    }
    if (quote)
        return { tokens: [], error: "unterminated quote" };
    if (token)
        tokens.push(token);
    return { tokens, error: "" };
}
function normalizedExecutable(value) {
    return path.basename(String(value || "")).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
}
function verificationCommandInvocation(command) {
    const unsafe = isUnsafeVerificationCommand(command);
    if (unsafe)
        return { executable: "", args: [], requiresShell: false, error: unsafe };
    const parsed = splitVerificationCommand(command);
    if (parsed.error || !parsed.tokens.length)
        return { executable: "", args: [], requiresShell: false, error: parsed.error || "empty command" };
    const executable = parsed.tokens[0];
    const requiresShell = process.platform === "win32"
        && ["npm", "pnpm", "yarn", "bun", "npx", "mvnw", "gradlew"].includes(normalizedExecutable(executable));
    return { executable, args: parsed.tokens.slice(1), requiresShell, error: "" };
}
function buildTestAgentSubprocessEnv(projectEnv = {}) {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (SAFE_PARENT_ENV_KEYS.has(key.toUpperCase()) && value !== undefined)
            env[key] = value;
    }
    for (const [key, value] of Object.entries(projectEnv || {})) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && value !== undefined)
            env[key] = String(value);
    }
    return env;
}
function redactTestAgentSensitiveText(value, secrets = []) {
    let text = String(value ?? "");
    for (const secret of [...new Set(secrets.map(String).filter(item => item.length >= 4))].sort((a, b) => b.length - a.length)) {
        text = text.split(secret).join("[REDACTED]");
    }
    return text
        .replace(/(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|passwd|authorization|cookie)\b\s*[=:]\s*["']?)([^\s,"';]+)/gi, "$1[REDACTED]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]");
}
function appendLimited(current, chunk, maxChars) {
    if (!chunk)
        return current;
    const addition = Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
    if (current.length >= maxChars)
        return current;
    return compactText(current + addition, maxChars);
}
function isUnsafeVerificationCommand(command) {
    const text = String(command || "").trim();
    if (!text)
        return "empty command";
    const lower = text.toLowerCase();
    if (/[\r\n;&|<>`]/.test(text) || /\$\(/.test(text) || (process.platform === "win32" && /[%!^]/.test(text)))
        return "shell operators and command substitution are not allowed";
    const parsed = splitVerificationCommand(text);
    if (parsed.error || !parsed.tokens.length)
        return parsed.error || "empty command";
    const executable = normalizedExecutable(parsed.tokens[0]);
    if (!VERIFICATION_EXECUTABLES.has(executable))
        return `verification executable is not allowed: ${executable || "unknown"}`;
    if (/^\s*git\s+(add|commit|push|checkout|reset|clean|merge|rebase|branch\s+-d|branch\s+-D)\b/i.test(text))
        return "git write operation is not allowed";
    if (/\b(npm\s+install|npm\s+i|pnpm\s+install|pnpm\s+add|yarn\s+add|bun\s+add)\b/i.test(lower))
        return "dependency installation is not allowed";
    if (/\b(rm\s+-rf|del\s+\/[sq]|rmdir\s+\/[sq]|Remove-Item\b.*\b-Recurse\b)/i.test(text))
        return "destructive filesystem command is not allowed";
    if (executable === "git" && !/^(?:status|diff|show|rev-parse|log|ls-files)$/i.test(parsed.tokens[1] || ""))
        return "only read-only git commands are allowed";
    if (executable === "npx" && !parsed.tokens.includes("--no-install"))
        return "npx requires --no-install during verification";
    return "";
}
function resolveUrl(baseUrl, maybeUrl) {
    const raw = String(maybeUrl || "").trim();
    if (!raw)
        return String(baseUrl || "").trim();
    if (/^https?:\/\//i.test(raw))
        return raw;
    if (!baseUrl)
        return raw;
    return new URL(raw, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}
function hasRequiredCheck(requiredChecks, pattern) {
    return requiredChecks.some(item => pattern.test(String(item || "")));
}
//# sourceMappingURL=utils.js.map