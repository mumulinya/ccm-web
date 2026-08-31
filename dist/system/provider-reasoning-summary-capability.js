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
exports.readProviderReasoningSummaryCapability = readProviderReasoningSummaryCapability;
exports.recordProviderReasoningSummaryCapability = recordProviderReasoningSummaryCapability;
exports.providerReasoningSummaryAllowed = providerReasoningSummaryAllowed;
exports.isProviderReasoningSummaryFieldRejection = isProviderReasoningSummaryFieldRejection;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const ROOT = process.env.CCM_PROVIDER_REASONING_SUMMARY_CAPABILITY_DIR
    ? path.resolve(process.env.CCM_PROVIDER_REASONING_SUMMARY_CAPABILITY_DIR)
    : path.join(os.homedir(), ".ccm", "provider-reasoning-summary-capability");
const FILE = path.join(ROOT, "capabilities.json");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function checksum(value) {
    const copy = { ...(value || {}) };
    delete copy.checksum;
    return hash(copy);
}
function emptyRegistry() {
    const value = { schema: "ccm-provider-reasoning-summary-capability-registry-v1", entries: {}, updatedAt: "", checksum: "" };
    value.checksum = checksum(value);
    return value;
}
function readRegistry() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
        return parsed?.schema === "ccm-provider-reasoning-summary-capability-registry-v1" && parsed?.checksum === checksum(parsed)
            ? parsed
            : emptyRegistry();
    }
    catch {
        return emptyRegistry();
    }
}
function writeRegistry(value) {
    fs.mkdirSync(ROOT, { recursive: true });
    const next = { ...value, updatedAt: new Date().toISOString(), checksum: "" };
    next.checksum = checksum(next);
    (0, atomic_json_file_1.writeJsonAtomic)(FILE, next);
    try {
        fs.chmodSync(FILE, 0o600);
    }
    catch { }
    return next;
}
function readProviderReasoningSummaryCapability(config) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const record = readRegistry().entries?.[identity.identityChecksum] || null;
    const valid = record?.schema === "ccm-provider-reasoning-summary-capability-v1"
        && record?.checksum === checksum(record)
        && Date.parse(String(record?.expiresAt || "")) > Date.now();
    return {
        identityChecksum: identity.identityChecksum,
        status: valid ? record.status : "unproven",
        evidence: valid ? record : null,
        contentStored: false,
    };
}
function recordProviderReasoningSummaryCapability(config, status, reason) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const checkedAt = new Date().toISOString();
    const core = {
        schema: "ccm-provider-reasoning-summary-capability-v1",
        identityChecksum: identity.identityChecksum,
        status,
        reason: String(reason?.message || reason || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 300),
        checkedAt,
        expiresAt: new Date(Date.parse(checkedAt) + TTL_MS).toISOString(),
        contentStored: false,
    };
    const record = { ...core, checksum: checksum(core) };
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const registry = readRegistry();
        registry.entries = { ...(registry.entries || {}), [identity.identityChecksum]: record };
        writeRegistry(registry);
        return record;
    });
}
function providerReasoningSummaryAllowed(config) {
    return readProviderReasoningSummaryCapability(config).status !== "unsupported";
}
function isProviderReasoningSummaryFieldRejection(status, detail) {
    if (![400, 404, 422].includes(Number(status || 0)))
        return false;
    const text = String(detail || "");
    return /reasoning(?:\.|[_ -])summary|summary.{0,100}(?:unknown|unsupported|unrecognized|invalid|not allowed)|(?:unknown|unsupported|unrecognized|invalid|not allowed).{0,100}summary/i.test(text);
}
//# sourceMappingURL=provider-reasoning-summary-capability.js.map