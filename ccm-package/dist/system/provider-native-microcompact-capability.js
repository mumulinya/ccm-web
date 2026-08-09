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
exports.recordProviderNativeMicrocompactCapability = recordProviderNativeMicrocompactCapability;
exports.readProviderNativeMicrocompactCapability = readProviderNativeMicrocompactCapability;
exports.providerNativeMicrocompactAllowed = providerNativeMicrocompactAllowed;
exports.isProviderNativeMicrocompactFieldRejection = isProviderNativeMicrocompactFieldRejection;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const ROOT = process.env.CCM_PROVIDER_NATIVE_MICROCOMPACT_CAPABILITY_DIR
    ? path.resolve(process.env.CCM_PROVIDER_NATIVE_MICROCOMPACT_CAPABILITY_DIR)
    : path.join(os.homedir(), ".cc-connect", "provider-native-microcompact-capability");
const FILE = path.join(ROOT, "capabilities.json");
const NORMAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEGRADED_TTL_MS = 15 * 60 * 1000;
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function checksum(value) {
    const copy = { ...(value || {}) };
    delete copy.checksum;
    return hash(copy);
}
function officialAnthropic(config) {
    try {
        const hostname = new URL(String(config?.apiUrl || "")).hostname.toLowerCase();
        return hostname === "api.anthropic.com" || hostname.endsWith(".anthropic.com");
    }
    catch {
        return false;
    }
}
function emptyRegistry() {
    const value = { schema: "ccm-provider-native-microcompact-capability-registry-v1", version: 1, entries: {}, updatedAt: "", checksum: "" };
    value.checksum = checksum(value);
    return value;
}
function readRegistry() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
        return parsed?.schema === "ccm-provider-native-microcompact-capability-registry-v1" && parsed?.checksum === checksum(parsed) ? parsed : emptyRegistry();
    }
    catch {
        return emptyRegistry();
    }
}
function writeRegistry(registry) {
    fs.mkdirSync(ROOT, { recursive: true });
    const next = { ...registry, updatedAt: new Date().toISOString(), checksum: "" };
    next.checksum = checksum(next);
    (0, atomic_json_file_1.writeJsonAtomic)(FILE, next);
    try {
        fs.chmodSync(FILE, 0o600);
    }
    catch { }
    return next;
}
function recordProviderNativeMicrocompactCapability(config, input) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const checkedAt = new Date().toISOString();
    const ttl = input.status === "degraded" ? DEGRADED_TTL_MS : NORMAL_TTL_MS;
    const core = {
        schema: "ccm-provider-native-microcompact-capability-evidence-v1",
        version: 1,
        identityChecksum: identity.identityChecksum,
        status: input.status,
        source: String(input.source || "native_request_adapter").slice(0, 80),
        reason: String(input.reason || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500),
        providerRequestId: String(input.providerRequestId || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 160),
        checkedAt,
        expiresAt: new Date(Date.parse(checkedAt) + ttl).toISOString(),
        contentStored: false,
    };
    const evidence = { ...core, checksum: checksum(core) };
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const registry = readRegistry();
        registry.entries = { ...(registry.entries || {}), [identity.identityChecksum]: evidence };
        writeRegistry(registry);
        return evidence;
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function readProviderNativeMicrocompactCapability(config) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    if (officialAnthropic(config))
        return {
            schema: "ccm-provider-native-microcompact-capability-state-v1",
            version: 1,
            identity,
            status: "confirmed",
            source: "official_endpoint",
            evidence: null,
            contentStored: false,
        };
    const stored = readRegistry().entries?.[identity.identityChecksum];
    const valid = stored?.schema === "ccm-provider-native-microcompact-capability-evidence-v1"
        && stored?.checksum === checksum(stored)
        && Date.parse(String(stored?.expiresAt || "")) > Date.now();
    return {
        schema: "ccm-provider-native-microcompact-capability-state-v1",
        version: 1,
        identity,
        status: valid ? stored.status : "unproven",
        source: valid ? stored.source : "none",
        evidence: valid ? stored : null,
        expired: !!stored && !valid,
        contentStored: false,
    };
}
function providerNativeMicrocompactAllowed(config) {
    if (config?.providerCacheProbeInProgress === true || config?.provider_native_microcompact_probe_in_progress === true)
        return true;
    return readProviderNativeMicrocompactCapability(config).status === "confirmed";
}
function isProviderNativeMicrocompactFieldRejection(error) {
    const reason = String(error?.message || error || "");
    return /HTTP\s+(400|404|422).*?(context[_ -]?management|cache[_ -]?edits?)|(?:unknown|unsupported|unrecognized|invalid).*?context_management/i.test(reason);
}
//# sourceMappingURL=provider-native-microcompact-capability.js.map