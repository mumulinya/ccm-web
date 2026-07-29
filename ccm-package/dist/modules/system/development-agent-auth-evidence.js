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
exports.accountFingerprint = accountFingerprint;
exports.recordDevelopmentAgentAuthEvidence = recordDevelopmentAgentAuthEvidence;
exports.getDevelopmentAgentAuthEvidence = getDevelopmentAgentAuthEvidence;
exports.revokeDevelopmentAgentAuthEvidence = revokeDevelopmentAgentAuthEvidence;
exports.publicDevelopmentAgentAuthEvidence = publicDevelopmentAgentAuthEvidence;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const FILE = process.env.CCM_AGENT_AUTH_EVIDENCE_FILE || path.join(os.homedir(), ".cc-connect", "agent-auth-evidence-v2.json");
const TTL_MS = 24 * 60 * 60 * 1000;
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function readAll() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
        return parsed?.schema === "ccm-development-agent-auth-evidence-store-v2" && parsed.evidence && typeof parsed.evidence === "object"
            ? parsed.evidence : {};
    }
    catch {
        return {};
    }
}
function writeAll(evidence) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ schema: "ccm-development-agent-auth-evidence-store-v2", version: 2, updatedAt: new Date().toISOString(), evidence }, null, 2), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temp, FILE);
    try {
        fs.chmodSync(FILE, 0o600);
    }
    catch { }
}
function accountFingerprint(account) {
    const normalized = String(account || "").trim().toLowerCase();
    return normalized ? digest(normalized) : "";
}
function recordDevelopmentAgentAuthEvidence(input) {
    const verifiedAt = new Date();
    const core = {
        schema: "ccm-development-agent-auth-evidence-v2",
        version: 2,
        provider: String(input.provider || "").trim().toLowerCase(),
        status: input.status,
        source: input.source,
        accountFingerprint: accountFingerprint(input.account),
        model: String(input.model || "").trim(),
        cliVersion: String(input.cliVersion || "").trim(),
        verifiedAt: verifiedAt.toISOString(),
        expiresAt: new Date(verifiedAt.getTime() + Math.max(60_000, Number(input.ttlMs || TTL_MS))).toISOString(),
        detail: String(input.detail || "").slice(0, 240),
    };
    const evidence = { ...core, checksum: digest(core) };
    const all = readAll();
    all[evidence.provider] = evidence;
    writeAll(all);
    return evidence;
}
function getDevelopmentAgentAuthEvidence(provider, input = {}) {
    const evidence = readAll()[String(provider || "").trim().toLowerCase()] || null;
    if (!evidence)
        return null;
    const expired = Date.parse(evidence.expiresAt) <= Date.now();
    const accountMismatch = !!evidence.accountFingerprint && !!input.account && evidence.accountFingerprint !== accountFingerprint(input.account);
    const versionMismatch = !!evidence.cliVersion && !!input.cliVersion && evidence.cliVersion !== String(input.cliVersion);
    const modelMismatch = !!evidence.model && !!input.model && evidence.model !== String(input.model);
    if (expired || accountMismatch || versionMismatch || modelMismatch)
        return { ...evidence, status: "expired", valid: false };
    return { ...evidence, valid: evidence.status === "verified" };
}
function revokeDevelopmentAgentAuthEvidence(provider, detail = "认证状态已变更") {
    const key = String(provider || "").trim().toLowerCase();
    const all = readAll();
    if (!all[key])
        return null;
    const next = recordDevelopmentAgentAuthEvidence({ provider: key, status: "revoked", source: all[key].source, detail, ttlMs: 60_000 });
    return next;
}
function publicDevelopmentAgentAuthEvidence(evidence) {
    if (!evidence)
        return null;
    const { accountFingerprint: _accountFingerprint, ...safe } = evidence;
    return safe;
}
//# sourceMappingURL=development-agent-auth-evidence.js.map