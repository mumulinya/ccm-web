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
exports.buildInternalApiHeaders = buildInternalApiHeaders;
exports.verifyInternalApiRequest = verifyInternalApiRequest;
exports.internalApiSecretFile = internalApiSecretFile;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const SECRET_FILE = path.join(utils_1.CCM_DIR, "auth", "internal-api-secret");
const SIGNATURE_TTL_MS = 30_000;
const NONCE_RETENTION_MS = 120_000;
const MAX_NONCES = 10_000;
const usedNonces = new Map();
const ROUTE_ALLOWLIST = {
    "global-agent": [
        /^\/api\/(?:global-agent|groups|projects|tasks|requirements|knowledge|rag|tools|permissions|music|cron|skills|mcp|pets|templates|git)(?:\/|\?|$)/,
        /^\/api\/send-stream(?:\?|$)/,
    ],
    "feishu-acp": [
        /^\/api\/feishu\/control-bot\/message(?:\?|$)/,
        /^\/api\/internal\/feishu-reaction\/(?:start|finish)(?:\?|$)/,
        /^\/api\/projects\/session-runtime-event(?:\?|$)/,
        /^\/api\/sessions\/feishu-targets(?:\?|$)/,
        /^\/api\/send-stream(?:\?|$)/,
    ],
    "project-feishu-queue": [/^\/api\/send-stream(?:\?|$)/],
    "ccm-cli": [
        /^\/api\/internal\/(?:lifecycle\/(?:identity|ready|drain)|update\/status)(?:\?|$)/,
        /^\/api\/projects\/(?:runtime\/(?:shutdown|action)|agent-connection)(?:\?|$)/,
    ],
    "server-recovery": [
        /^\/api\/(?:tasks|projects|global-agent|feishu)(?:\/|\?|$)/,
        /^\/api\/send-stream(?:\?|$)/,
    ],
    "desktop-pet": [
        /^\/api\/pets\/(?:runtime\/(?:bootstrap|stream|deliveries\/[^/?]+\/ack)|config|agents|navigate|action-strategy|status)(?:\/|\?|$)/,
    ],
};
function ensureSecret() {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    if (!fs.existsSync(SECRET_FILE)) {
        fs.writeFileSync(SECRET_FILE, `${crypto.randomBytes(48).toString("base64url")}\n`, { encoding: "utf-8", mode: 0o600, flag: "wx" });
    }
    try {
        fs.chmodSync(SECRET_FILE, 0o600);
    }
    catch { }
    const secret = fs.readFileSync(SECRET_FILE, "utf-8").trim();
    if (secret.length < 32)
        throw new Error("CCM internal API secret is invalid");
    return secret;
}
function canonicalPath(value) {
    const raw = String(value || "/");
    try {
        const parsed = new URL(raw, "http://ccm.local");
        return `${parsed.pathname}${parsed.search}`;
    }
    catch {
        return raw.startsWith("/") ? raw : `/${raw}`;
    }
}
function payload(caller, method, pathname, timestamp, nonce) {
    return ["ccm-internal-api-v1", caller, method.toUpperCase(), canonicalPath(pathname), timestamp, nonce].join("\n");
}
function sign(caller, method, pathname, timestamp, nonce) {
    return crypto.createHmac("sha256", ensureSecret()).update(payload(caller, method, pathname, timestamp, nonce)).digest("base64url");
}
function pruneNonces(current = Date.now()) {
    for (const [key, expiresAt] of usedNonces)
        if (expiresAt <= current)
            usedNonces.delete(key);
    while (usedNonces.size >= MAX_NONCES)
        usedNonces.delete(usedNonces.keys().next().value);
}
function buildInternalApiHeaders(caller, method, pathname) {
    const timestamp = String(Date.now());
    const nonce = crypto.randomBytes(18).toString("base64url");
    return {
        "X-CCM-Internal-Caller": caller,
        "X-CCM-Internal-Timestamp": timestamp,
        "X-CCM-Internal-Nonce": nonce,
        "X-CCM-Internal-Signature": sign(caller, method, pathname, timestamp, nonce),
    };
}
function verifyInternalApiRequest(req, pathnameWithQuery) {
    const caller = String(req.headers["x-ccm-internal-caller"] || "");
    const timestamp = String(req.headers["x-ccm-internal-timestamp"] || "");
    const nonce = String(req.headers["x-ccm-internal-nonce"] || "");
    const signature = String(req.headers["x-ccm-internal-signature"] || "");
    if (!caller || !ROUTE_ALLOWLIST[caller] || !timestamp || !nonce || !signature)
        return null;
    const requestTime = Number(timestamp);
    if (!Number.isFinite(requestTime) || Math.abs(Date.now() - requestTime) > SIGNATURE_TTL_MS)
        return null;
    if (!ROUTE_ALLOWLIST[caller].some(pattern => pattern.test(canonicalPath(pathnameWithQuery))))
        return null;
    pruneNonces();
    const nonceKey = `${caller}:${nonce}`;
    if (usedNonces.has(nonceKey))
        return null;
    const expected = sign(caller, String(req.method || "GET"), pathnameWithQuery, timestamp, nonce);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right))
        return null;
    usedNonces.set(nonceKey, Date.now() + NONCE_RETENTION_MS);
    return { caller, kind: "internal" };
}
function internalApiSecretFile() {
    ensureSecret();
    return SECRET_FILE;
}
//# sourceMappingURL=internal-api-auth.js.map