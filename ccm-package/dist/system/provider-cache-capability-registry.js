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
exports.normalizeInferenceBackendKind = normalizeInferenceBackendKind;
exports.providerCacheCapabilityIdentity = providerCacheCapabilityIdentity;
exports.createProviderCacheCapabilityEvidence = createProviderCacheCapabilityEvidence;
exports.recordProviderCacheCapabilityEvidence = recordProviderCacheCapabilityEvidence;
exports.readProviderCacheCapabilityState = readProviderCacheCapabilityState;
exports.revokeProviderCacheCapabilityEvidence = revokeProviderCacheCapabilityEvidence;
exports.pruneProviderCacheCapabilityRegistry = pruneProviderCacheCapabilityRegistry;
exports.runProviderCacheCapabilityRegistrySelfTest = runProviderCacheCapabilityRegistrySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const REGISTRY_ROOT = process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR
    ? path.resolve(process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR)
    : path.join(os.homedir(), ".cc-connect", "provider-cache-capability");
const REGISTRY_FILE = path.join(REGISTRY_ROOT, "capabilities.json");
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
function clean(value, max = 240) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function normalizedEndpoint(value) {
    try {
        const url = new URL(String(value || ""));
        return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${url.pathname.replace(/\/+$/, "") || "/"}`;
    }
    catch {
        return "invalid-endpoint";
    }
}
function officialEndpointCapability(config) {
    try {
        const host = new URL(String(config?.apiUrl || "")).hostname.toLowerCase();
        if (/(?:^|\.)openai\.com$/.test(host))
            return "openai";
        if (/(?:^|\.)anthropic\.com$/.test(host))
            return "anthropic";
        if (/(?:^|\.)googleapis\.com$/.test(host) && /generativelanguage/.test(host))
            return "gemini";
    }
    catch { }
    return "";
}
function protocolOf(config) {
    const value = String(config?.format || "auto").trim().toLowerCase();
    return ["openai-compatible", "anthropic-compatible", "gemini-compatible"].includes(value) ? value : "auto";
}
function cacheFamilyOf(config) {
    const declared = String(config?.providerNativeCacheFamily || "auto").trim().toLowerCase();
    if (["openai", "anthropic", "gemini", "compatible"].includes(declared))
        return declared;
    return {
        "openai-compatible": "openai",
        "anthropic-compatible": "anthropic",
        "gemini-compatible": "gemini",
    }[protocolOf(config)] || "compatible";
}
function normalizeInferenceBackendKind(value) {
    const normalized = String(value || "remote_api").trim().toLowerCase();
    return ["vllm", "sglang"].includes(normalized) ? normalized : "remote_api";
}
function providerCacheCapabilityIdentity(config) {
    const interfaceProtocol = protocolOf(config);
    const cacheFamily = cacheFamilyOf(config);
    const inferenceBackendKind = normalizeInferenceBackendKind(config?.inferenceBackendKind || config?.inference_backend_kind);
    const interfaceFingerprint = hash({ endpoint: normalizedEndpoint(config?.apiUrl), interfaceProtocol }).slice(0, 40);
    const identity = {
        interfaceFingerprint,
        interfaceProtocol,
        cacheFamily,
        model: clean(config?.model, 180),
        inferenceBackendKind,
    };
    return { ...identity, identityChecksum: hash(identity) };
}
function emptyRegistry() {
    const value = {
        schema: "ccm-provider-cache-capability-registry-v1",
        version: 1,
        entries: {},
        latestAttempts: {},
        updatedAt: new Date(0).toISOString(),
        checksum: "",
    };
    value.checksum = checksum(value);
    return value;
}
function validEvidence(value) {
    return value?.schema === "ccm-provider-cache-capability-evidence-v1"
        && Number(value?.version) === 1
        && /^[a-f0-9]{64}$/.test(String(value?.identityChecksum || ""))
        && value?.contentStored === false
        && value?.checksum === checksum(value);
}
function readRegistry() {
    try {
        const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
        if (parsed?.schema !== "ccm-provider-cache-capability-registry-v1" || parsed?.checksum !== checksum(parsed))
            return emptyRegistry();
        parsed.entries = Object.fromEntries(Object.entries(parsed.entries || {}).filter(([, value]) => validEvidence(value)));
        parsed.latestAttempts = Object.fromEntries(Object.entries(parsed.latestAttempts || {}).filter(([, value]) => validEvidence(value)));
        return parsed;
    }
    catch {
        return emptyRegistry();
    }
}
function writeRegistry(registry) {
    fs.mkdirSync(REGISTRY_ROOT, { recursive: true });
    const next = { ...registry, updatedAt: new Date().toISOString(), checksum: "" };
    next.checksum = checksum(next);
    (0, atomic_json_file_1.writeJsonAtomic)(REGISTRY_FILE, next);
    try {
        fs.chmodSync(REGISTRY_FILE, 0o600);
    }
    catch { }
    return next;
}
function createProviderCacheCapabilityEvidence(config, input) {
    const identity = providerCacheCapabilityIdentity(config);
    const checkedAt = input.checkedAt || new Date().toISOString();
    const ttl = input.status === "degraded" ? DEGRADED_TTL_MS : NORMAL_TTL_MS;
    const evidence = {
        schema: "ccm-provider-cache-capability-evidence-v1",
        version: 1,
        id: clean(input.id || `pcce_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`, 100),
        ...identity,
        status: input.status,
        source: input.source || "probe",
        providerCallCount: Math.max(0, Number(input.providerCallCount || 0)),
        cacheReadInputTokens: Math.max(0, Number(input.cacheReadInputTokens || 0)),
        cacheCreationInputTokens: Math.max(0, Number(input.cacheCreationInputTokens || 0)),
        backendMetricsVerified: input.backendMetricsVerified === true,
        checkedAt,
        expiresAt: input.expiresAt || new Date(Date.parse(checkedAt) + ttl).toISOString(),
        reason: clean(input.reason, 500),
        contentStored: false,
        checksum: "",
    };
    evidence.checksum = checksum(evidence);
    return evidence;
}
function recordProviderCacheCapabilityEvidence(config, input) {
    const evidence = createProviderCacheCapabilityEvidence(config, input);
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const registry = readRegistry();
        const key = evidence.identityChecksum;
        const previous = registry.entries[key];
        registry.latestAttempts[key] = evidence;
        const previousStillValid = validEvidence(previous) && Date.parse(previous.expiresAt) > Date.now();
        const preserveConfirmed = evidence.status === "degraded" && previousStillValid && previous.status === "confirmed";
        if (!preserveConfirmed)
            registry.entries[key] = evidence;
        writeRegistry(registry);
        return { evidence: preserveConfirmed ? previous : evidence, latestAttempt: evidence, preservedConfirmed: preserveConfirmed };
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function readProviderCacheCapabilityState(config) {
    const identity = providerCacheCapabilityIdentity(config);
    const registry = readRegistry();
    const active = registry.entries[identity.identityChecksum];
    const latestAttempt = registry.latestAttempts[identity.identityChecksum];
    const now = Date.now();
    let evidence = validEvidence(active) && Date.parse(active.expiresAt) > now ? active : null;
    const latest = validEvidence(latestAttempt) && Date.parse(latestAttempt.expiresAt) > now ? latestAttempt : null;
    if (!evidence && officialEndpointCapability(config)) {
        evidence = createProviderCacheCapabilityEvidence(config, {
            id: `pcce_official_${identity.identityChecksum.slice(0, 24)}`,
            status: "confirmed",
            source: "official_endpoint",
            providerCallCount: 0,
            reason: "official_endpoint_documented_capability",
        });
    }
    return {
        schema: "ccm-provider-cache-capability-state-v1",
        version: 1,
        identity,
        status: evidence?.status || "unproven",
        evidence,
        latestAttempt: latest,
        expired: !!active && !evidence,
        contentStored: false,
    };
}
function revokeProviderCacheCapabilityEvidence(config) {
    const identity = providerCacheCapabilityIdentity(config);
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const registry = readRegistry();
        const removed = !!registry.entries[identity.identityChecksum] || !!registry.latestAttempts[identity.identityChecksum];
        delete registry.entries[identity.identityChecksum];
        delete registry.latestAttempts[identity.identityChecksum];
        writeRegistry(registry);
        return { success: true, removed, identityChecksum: identity.identityChecksum };
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function pruneProviderCacheCapabilityRegistry(options = {}) {
    const now = Number(options.now || Date.now());
    const retentionMs = Math.max(1, Number(options.expiredRetentionDays || 30)) * 24 * 60 * 60_000;
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const registry = readRegistry();
        let removedEntries = 0;
        let removedAttempts = 0;
        for (const [key, evidence] of Object.entries(registry.entries || {})) {
            if (Date.parse(String(evidence.expiresAt || "")) + retentionMs >= now)
                continue;
            delete registry.entries[key];
            removedEntries += 1;
        }
        for (const [key, evidence] of Object.entries(registry.latestAttempts || {})) {
            if (Date.parse(String(evidence.expiresAt || "")) + retentionMs >= now)
                continue;
            delete registry.latestAttempts[key];
            removedAttempts += 1;
        }
        if (removedEntries || removedAttempts)
            writeRegistry(registry);
        return { removedEntries, removedAttempts, remainingEntries: Object.keys(registry.entries).length, remainingAttempts: Object.keys(registry.latestAttempts).length };
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function runProviderCacheCapabilityRegistrySelfTest() {
    const config = { apiUrl: "https://gateway.example/v1?secret=hidden", format: "openai-compatible", model: "test", inferenceBackendKind: "remote_api" };
    revokeProviderCacheCapabilityEvidence(config);
    const confirmed = recordProviderCacheCapabilityEvidence(config, { status: "confirmed", providerCallCount: 2, cacheReadInputTokens: 120, reason: "usage_receipt" });
    const degraded = recordProviderCacheCapabilityEvidence(config, { status: "degraded", providerCallCount: 1, reason: "HTTP 503" });
    const state = readProviderCacheCapabilityState(config);
    const revoked = revokeProviderCacheCapabilityEvidence(config);
    const checks = {
        confirmedRecorded: confirmed.evidence.status === "confirmed",
        transientFailurePreservesConfirmed: degraded.preservedConfirmed === true && state.evidence?.status === "confirmed" && state.latestAttempt?.status === "degraded",
        secretsNotStored: !JSON.stringify(state).includes("hidden") && !JSON.stringify(state).includes("gateway.example"),
        revokeWorks: revoked.removed === true && readProviderCacheCapabilityState(config).evidence === null,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-capability-registry.js.map