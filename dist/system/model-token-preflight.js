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
exports.estimateModelTextTokens = estimateModelTextTokens;
exports.estimateModelMessagesTokens = estimateModelMessagesTokens;
exports.recordModelTokenCalibration = recordModelTokenCalibration;
exports.recordModelTokenCalibrationForIdentity = recordModelTokenCalibrationForIdentity;
exports.readModelTokenCalibration = readModelTokenCalibration;
exports.runModelTokenPreflightSelfTest = runModelTokenPreflightSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const js_tiktoken_1 = require("js-tiktoken");
const context_budget_1 = require("./context-budget");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const atomic_json_file_1 = require("../core/atomic-json-file");
const ROOT = process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR
    ? path.resolve(process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR)
    : path.join(os.homedir(), ".ccm", "model-token-preflight");
const FILE = path.join(ROOT, "calibration.json");
const encodingCache = new Map();
let registryCache = null;
let registryMtimeMs = -1;
const ESTIMATOR_VERSION = 2;
const MAX_RECENT_SAMPLES = 64;
const CALIBRATION_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const CALIBRATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function checksum(value) {
    const copy = { ...(value || {}) };
    delete copy.checksum;
    return hash(copy);
}
function calibrationIdentityChecksum(providerIdentityChecksum) {
    return hash({ providerIdentityChecksum, estimatorVersion: ESTIMATOR_VERSION });
}
function percentile(values, percentileValue) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1));
    return sorted[index];
}
function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function text(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value || "");
    }
}
function family(config) {
    const format = String(config?.format || "").toLowerCase();
    const provider = String(config?.provider || "").toLowerCase();
    const declared = String(config?.providerNativeCacheFamily || "").toLowerCase();
    if (declared === "openai" || format.includes("openai") || provider.includes("openai"))
        return "openai";
    if (declared === "anthropic" || format.includes("anthropic") || provider.includes("anthropic"))
        return "anthropic";
    if (declared === "gemini" || format.includes("gemini") || provider.includes("gemini"))
        return "gemini";
    return "compatible";
}
function encodingName(config) {
    const model = String(config?.model || "").toLowerCase();
    if (/gpt-5|gpt-4o|gpt-4\.1|\bo[134](?:-|$)/.test(model))
        return "o200k_base";
    return "cl100k_base";
}
function readRegistry() {
    try {
        const mtimeMs = fs.existsSync(FILE) ? fs.statSync(FILE).mtimeMs : 0;
        if (registryCache && registryMtimeMs === mtimeMs)
            return registryCache;
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
        registryCache = ["ccm-model-token-calibration-registry-v1", "ccm-model-token-calibration-registry-v2"].includes(parsed?.schema) && parsed?.checksum === checksum(parsed)
            ? parsed
            : { schema: "ccm-model-token-calibration-registry-v2", version: 2, entries: {}, updatedAt: "", checksum: "" };
        registryMtimeMs = mtimeMs;
        return registryCache;
    }
    catch {
        registryCache = { schema: "ccm-model-token-calibration-registry-v2", version: 2, entries: {}, updatedAt: "", checksum: "" };
        registryMtimeMs = 0;
        return registryCache;
    }
}
function writeRegistry(registry) {
    fs.mkdirSync(ROOT, { recursive: true });
    const cutoff = Date.now() - CALIBRATION_RETENTION_MS;
    const entries = Object.fromEntries(Object.entries(registry?.entries || {}).filter(([, value]) => {
        const updatedAt = Date.parse(String(value?.lastAcceptedAt || value?.updatedAt || ""));
        return !Number.isFinite(updatedAt) || updatedAt >= cutoff;
    }));
    const next = { ...registry, schema: "ccm-model-token-calibration-registry-v2", version: 2, entries, updatedAt: new Date().toISOString(), checksum: "" };
    next.checksum = checksum(next);
    const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, FILE);
    registryCache = next;
    registryMtimeMs = fs.statSync(FILE).mtimeMs;
    try {
        fs.chmodSync(FILE, 0o600);
    }
    catch { }
}
function calibration(config) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const registry = readRegistry();
    const value = registry.entries?.[calibrationIdentityChecksum(identity.identityChecksum)] || registry.entries?.[identity.identityChecksum];
    if (!value || !["ccm-model-token-calibration-v1", "ccm-model-token-calibration-v2"].includes(value.schema) || value.checksum !== checksum(value))
        return null;
    const acceptedAt = Date.parse(String(value.lastAcceptedAt || value.updatedAt || ""));
    if (Number.isFinite(acceptedAt) && acceptedAt < Date.now() - CALIBRATION_STALE_MS)
        return null;
    return value;
}
function rawTextTokens(value, config) {
    const source = text(value);
    if (family(config) === "openai") {
        try {
            const name = encodingName(config);
            const encoding = encodingCache.get(name) || (0, js_tiktoken_1.getEncoding)(name);
            encodingCache.set(name, encoding);
            return { tokens: Math.max(1, encoding.encode(source).length), strategy: `tiktoken:${name}` };
        }
        catch { }
    }
    const multiplier = family(config) === "anthropic" ? 1.06 : family(config) === "gemini" ? 1.03 : 1.08;
    return { tokens: Math.max(1, Math.ceil((0, context_budget_1.estimateTextTokens)(source) * multiplier)), strategy: `${family(config)}_model_family_estimate` };
}
function applyCalibration(rawTokensInput, strategy, config = {}) {
    const rawTokens = Math.max(1, Math.ceil(Number(rawTokensInput) || 0));
    const learned = calibration(config);
    const factor = learned && learned.samples >= 2 ? Math.max(0.55, Math.min(2.5, Number(learned.factor || 1))) : 1;
    const p95Ratio = learned?.schema === "ccm-model-token-calibration-v2" ? Math.max(1, Number(learned.p95Ratio || 1)) : 1;
    const p95PositiveDriftTokens = learned?.schema === "ccm-model-token-calibration-v2" ? Math.max(0, Number(learned.p95PositiveDriftTokens || 0)) : 0;
    // Absolute drift is a request-level guard. Canonical payload accounting
    // measures several components separately, so applying the same absolute
    // guard to every bucket would multiply it by the number of buckets.
    const appliedPositiveDriftTokens = config?.applyAbsoluteDriftGuard === false ? 0 : p95PositiveDriftTokens;
    const calibratedTokens = Math.max(1, rawTokens, Math.ceil(rawTokens * factor), Math.ceil(rawTokens * p95Ratio), Math.ceil(rawTokens + appliedPositiveDriftTokens));
    const safetyMargin = learned && learned.samples >= 5 ? 1.03 : family(config) === "openai" ? 1.02 : 1.08;
    return {
        providerFamily: family(config),
        model: String(config?.model || ""),
        strategy: learned && learned.samples >= 2 ? `${strategy}+provider_usage_calibration` : strategy,
        rawTokens,
        calibrationFactor: factor,
        calibrationSamples: Number(learned?.samples || 0),
        calibrationRejectedSamples: Number(learned?.rejectedSamples || 0),
        calibrationP95Ratio: p95Ratio,
        calibrationP95PositiveDriftTokens: p95PositiveDriftTokens,
        calibratedTokens,
        safetyAdjustedTokens: Math.max(1, Math.ceil(calibratedTokens * safetyMargin)),
        safetyMargin,
        confidence: strategy.startsWith("tiktoken") ? learned && learned.samples >= 2 ? "high" : "medium" : learned && learned.samples >= 5 ? "high" : learned && learned.samples >= 2 ? "medium" : "low",
        contentStored: false,
    };
}
function estimateModelTextTokens(value, config = {}) {
    const raw = rawTextTokens(value, config);
    return {
        schema: "ccm-model-token-preflight-v1",
        version: 1,
        ...applyCalibration(raw.tokens, raw.strategy, config),
    };
}
function estimateModelMessagesTokens(messagesInput, config = {}) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const overhead = family(config) === "openai" ? 4 : 3;
    const rows = messages.map((message) => rawTextTokens(message?.content ?? message, config));
    const rawTokens = rows.reduce((sum, row) => sum + row.tokens, 0) + messages.length * overhead + 3;
    const rawStrategy = [...new Set(rows.map(row => row.strategy))].join("+") || `${family(config)}_empty_messages`;
    // Ratio calibration and, especially, the absolute P95 drift are learned for
    // one complete Provider request. Applying them to every message multiplies
    // the same request-level uncertainty by the number of turns/tool results and
    // can turn a ~10K request into a false ~500K capacity failure.
    const calibrated = applyCalibration(rawTokens, rawStrategy, config);
    return {
        schema: "ccm-model-message-token-preflight-v1",
        version: 1,
        ...calibrated,
        calibrationScope: "request",
        messageCount: messages.length,
        contentStored: false,
    };
}
function recordModelTokenCalibration(config, input) {
    const estimatedTokens = Math.max(0, Number(input.estimatedTokens || 0));
    const observedTokens = Math.max(0, Number(input.observedTokens || 0));
    if (!estimatedTokens || !observedTokens)
        return null;
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    return recordModelTokenCalibrationForIdentity(identity.identityChecksum, input);
}
function recordModelTokenCalibrationForIdentity(identityChecksum, input) {
    const providerIdentityChecksum = String(identityChecksum || "");
    if (!/^[a-f0-9]{64}$/.test(providerIdentityChecksum))
        return null;
    const estimatedTokens = Math.max(0, Number(input.estimatedTokens || 0));
    const observedTokens = Math.max(0, Number(input.observedTokens || 0));
    if (!estimatedTokens || !observedTokens)
        return null;
    const calibrationIdentity = calibrationIdentityChecksum(providerIdentityChecksum);
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const registry = readRegistry();
        const previous = registry.entries?.[calibrationIdentity] || registry.entries?.[providerIdentityChecksum] || null;
        const ratio = Math.max(0.55, Math.min(2.5, observedTokens / estimatedTokens));
        const previousSamples = Array.isArray(previous?.recentSamples) ? previous.recentSamples.slice(-MAX_RECENT_SAMPLES) : [];
        let accepted = true;
        if (previousSamples.length >= 8) {
            const ratios = previousSamples.map(sample => Number(sample.ratio || 0)).filter(value => value > 0);
            const center = median(ratios);
            const mad = median(ratios.map(value => Math.abs(value - center)));
            accepted = Math.abs(ratio - center) <= Math.max(0.08, mad * 3);
        }
        const recordedAt = new Date().toISOString();
        const sample = {
            estimatedTokens: Math.floor(estimatedTokens),
            observedTokens: Math.floor(observedTokens),
            ratio: Math.round(ratio * 10_000) / 10_000,
            positiveDriftTokens: Math.max(0, Math.floor(observedTokens - estimatedTokens)),
            recordedAt,
        };
        const recentSamples = accepted ? [...previousSamples, sample].slice(-MAX_RECENT_SAMPLES) : previousSamples;
        const previousFactor = Number(previous?.factor || 0);
        const factor = accepted ? (previousFactor > 0 ? previousFactor * 0.75 + ratio * 0.25 : ratio) : (previousFactor || 1);
        const samples = Math.min(1000, Math.max(0, Number(previous?.samples || 0)) + (accepted ? 1 : 0));
        const value = {
            schema: "ccm-model-token-calibration-v2",
            version: 2,
            identityChecksum: calibrationIdentity,
            providerIdentityChecksum,
            estimatorVersion: 2,
            samples,
            rejectedSamples: Math.max(0, Number(previous?.rejectedSamples || 0)) + (accepted ? 0 : 1),
            factor: Math.round(factor * 10_000) / 10_000,
            p95Ratio: Math.max(1, Math.round(percentile(recentSamples.map(row => row.ratio), 0.95) * 10_000) / 10_000),
            p95PositiveDriftTokens: Math.max(0, Math.floor(percentile(recentSamples.map(row => row.positiveDriftTokens), 0.95))),
            recentSamples,
            lastEstimatedTokens: Math.floor(estimatedTokens),
            lastObservedTokens: Math.floor(observedTokens),
            lastAcceptedAt: accepted ? recordedAt : String(previous?.lastAcceptedAt || previous?.updatedAt || ""),
            updatedAt: recordedAt,
            contentStored: false,
            checksum: "",
        };
        value.checksum = checksum(value);
        const entries = { ...(registry.entries || {}) };
        delete entries[providerIdentityChecksum];
        entries[calibrationIdentity] = value;
        registry.entries = entries;
        writeRegistry(registry);
        return value;
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function readModelTokenCalibration(config) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const value = calibration(config);
    return { identityChecksum: calibrationIdentityChecksum(identity.identityChecksum), providerIdentityChecksum: identity.identityChecksum, calibration: value, contentStored: false };
}
function runModelTokenPreflightSelfTest() {
    const openai = estimateModelMessagesTokens([{ role: "user", content: "hello world" }], { format: "openai-compatible", model: "gpt-5" });
    const generic = estimateModelMessagesTokens([{ role: "user", content: "你好，世界" }], { format: "anthropic-compatible", model: "claude" });
    const checks = {
        openAiUsesLocalTokenizer: openai.strategy.includes("tiktoken:o200k_base"),
        genericUsesSafeFamilyEstimate: generic.strategy.includes("anthropic_model_family_estimate"),
        safetyMarginApplied: generic.safetyAdjustedTokens >= generic.calibratedTokens,
        noContentStored: openai.contentStored === false && generic.contentStored === false && !JSON.stringify([openai, generic]).includes("hello world"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=model-token-preflight.js.map