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
exports.stringifyEnv = stringifyEnv;
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
function stringifyEnv(env) {
    const out = {};
    for (const [key, value] of Object.entries(env || {})) {
        if (value !== undefined)
            out[key] = String(value);
    }
    return out;
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
    if (/^\s*git\s+(add|commit|push|checkout|reset|clean|merge|rebase|branch\s+-d|branch\s+-D)\b/i.test(text))
        return "git write operation is not allowed";
    if (/\b(npm\s+install|npm\s+i|pnpm\s+install|pnpm\s+add|yarn\s+add|bun\s+add)\b/i.test(lower))
        return "dependency installation is not allowed";
    if (/\b(rm\s+-rf|del\s+\/[sq]|rmdir\s+\/[sq]|Remove-Item\b.*\b-Recurse\b)/i.test(text))
        return "destructive filesystem command is not allowed";
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