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
exports.observeProviderCacheUsage = observeProviderCacheUsage;
exports.readProviderCacheCapabilityState = readProviderCacheCapabilityState;
exports.revokeProviderCacheCapabilityEvidence = revokeProviderCacheCapabilityEvidence;
exports.pruneProviderCacheCapabilityRegistry = pruneProviderCacheCapabilityRegistry;
exports.runProviderCacheCapabilityRegistrySelfTest = runProviderCacheCapabilityRegistrySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const credential_store_1 = require("../core/credential-store");
const REGISTRY_ROOT = process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR
    ? path.resolve(process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR)
    : path.join(os.homedir(), ".ccm", "provider-cache-capability");
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
    if ((0, provider_cache_protocol_1.hasConfiguredProviderProxy)(config))
        return "";
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
    return (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol;
}
function cacheFamilyOf(config) {
    return {
        chat_completions: "openai-wire",
        responses: "responses-wire",
        anthropic_messages: "messages-wire",
        gemini_generate_content: "generate-content-wire",
    }[protocolOf(config)] || "compatible";
}
function normalizeInferenceBackendKind(value) {
    const normalized = String(value || "remote_api").trim().toLowerCase();
    return ["vllm", "sglang"].includes(normalized) ? normalized : "remote_api";
}
function providerCacheCapabilityIdentity(config) {
    const transportResolution = (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config);
    const interfaceProtocol = transportResolution.protocol;
    const cacheFamily = cacheFamilyOf(config);
    const inferenceBackendKind = normalizeInferenceBackendKind(config?.inferenceBackendKind || config?.inference_backend_kind);
    const interfaceFingerprint = hash({ endpoint: normalizedEndpoint(transportResolution.normalizedEndpoint), interfaceProtocol }).slice(0, 40);
    const legacyIdentity = {
        interfaceFingerprint,
        interfaceProtocol,
        cacheFamily,
        model: clean(config?.model, 180),
        inferenceBackendKind,
    };
    const proxyIdentity = clean(config?.proxyUrl || config?.proxy_url || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy, 1000);
    // Config files persist credentials as ccm-secret references while runtime
    // callers may pass the already materialized secret. Resolve only for the
    // in-memory checksum so both paths address the same capability evidence;
    // the plaintext is never written to receipts or diagnostics.
    let credentialIdentity = clean(config?.apiKey || config?.api_key, 4000);
    try {
        credentialIdentity = clean((0, credential_store_1.resolveCredential)(credentialIdentity), 4000);
    }
    catch { /* missing secret stays unproven */ }
    const rawHeaders = config?.headers || config?.customHeaders || config?.custom_headers || {};
    const headerNames = Object.keys(rawHeaders).sort();
    const headerIdentity = headerNames.map(name => [name.toLowerCase(), hash(String(rawHeaders[name] ?? ""))]);
    const transportIdentityChecksum = hash({
        ...legacyIdentity,
        transportParametersChecksum: transportResolution.transportParametersChecksum,
        proxyChecksum: proxyIdentity ? hash(proxyIdentity) : "",
        credentialChecksum: credentialIdentity ? hash(credentialIdentity) : "",
        headerIdentity,
    });
    const transportParametersChecksum = hash({
        proxyChecksum: proxyIdentity ? hash(proxyIdentity) : "",
        credentialChecksum: credentialIdentity ? hash(credentialIdentity) : "",
        headerIdentity,
    });
    return {
        ...legacyIdentity,
        transportIdentityChecksum,
        transportParametersChecksum,
        identityChecksum: transportIdentityChecksum,
    };
}
function emptyRegistry() {
    const value = {
        schema: "ccm-provider-cache-capability-registry-v2",
        version: 2,
        entries: {},
        latestAttempts: {},
        updatedAt: new Date(0).toISOString(),
        checksum: "",
    };
    value.checksum = checksum(value);
    return value;
}
function validEvidence(value) {
    return value?.schema === "ccm-provider-cache-capability-evidence-v2"
        && Number(value?.version) === 2
        && /^[a-f0-9]{64}$/.test(String(value?.identityChecksum || ""))
        && value?.contentStored === false
        && value?.checksum === checksum(value);
}
function readRegistry() {
    try {
        const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
        if (parsed?.schema !== "ccm-provider-cache-capability-registry-v2" || parsed?.version !== 2 || parsed?.checksum !== checksum(parsed))
            return emptyRegistry();
        const registry = emptyRegistry();
        registry.entries = Object.fromEntries(Object.entries(parsed.entries || {}).filter(([, value]) => validEvidence(value)));
        registry.latestAttempts = Object.fromEntries(Object.entries(parsed.latestAttempts || {}).filter(([, value]) => validEvidence(value)));
        registry.updatedAt = String(parsed.updatedAt || registry.updatedAt);
        registry.checksum = checksum(registry);
        return registry;
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
    const cacheReadInputTokens = Math.max(0, Number(input.cacheReadInputTokens || 0));
    const evidence = {
        schema: "ccm-provider-cache-capability-evidence-v2",
        version: 2,
        id: clean(input.id || `pcce_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`, 100),
        ...identity,
        status: input.status,
        source: input.source || "probe",
        providerCallCount: Math.max(0, Number(input.providerCallCount || 0)),
        cacheReadInputTokens,
        cacheCreationInputTokens: Math.max(0, Number(input.cacheCreationInputTokens || 0)),
        backendMetricsVerified: input.backendMetricsVerified === true,
        checkedAt,
        expiresAt: input.expiresAt || new Date(Date.parse(checkedAt) + ttl).toISOString(),
        reason: clean(input.reason, 500),
        transportIdentityChecksum: identity.transportIdentityChecksum,
        implicitCacheStatus: input.implicitCacheStatus || (cacheReadInputTokens > 0 ? "confirmed" : "unproven"),
        explicitFieldStatus: input.explicitFieldStatus || input.status,
        cacheStatus: input.cacheStatus
            || (cacheReadInputTokens > 0 || input.implicitCacheStatus === "confirmed" || input.explicitCacheKeyStatus === "confirmed"
                ? "confirmed"
                : input.status === "unsupported" && input.responsesContinuationStatus === "unsupported" ? "unproven" : input.status),
        promptCacheKeyStatus: input.promptCacheKeyStatus || input.explicitCacheKeyStatus || (input.explicitFieldStatus === "confirmed" ? "confirmed" : undefined),
        lastCacheReadTokens: Math.max(0, Number(input.lastCacheReadTokens ?? cacheReadInputTokens)),
        hitCount: Math.max(0, Number(input.hitCount || (cacheReadInputTokens > 0 ? 1 : 0))),
        missCount: Math.max(0, Number(input.missCount || 0)),
        exactReplayStatus: input.exactReplayStatus || "unproven",
        prefixExtensionStatus: input.prefixExtensionStatus || "unproven",
        ...(clean(input.stablePrefixChecksum, 64) ? { stablePrefixChecksum: clean(input.stablePrefixChecksum, 64) } : {}),
        ...(clean(input.promptCacheKeyChecksum, 64) ? { promptCacheKeyChecksum: clean(input.promptCacheKeyChecksum, 64) } : {}),
        foregroundHitCount: Math.max(0, Number(input.foregroundHitCount || 0)),
        foregroundMissCount: Math.max(0, Number(input.foregroundMissCount || 0)),
        foregroundCacheReadTokens: Math.max(0, Number(input.foregroundCacheReadTokens || 0)),
        foregroundProviderInputTokens: Math.max(0, Number(input.foregroundProviderInputTokens || 0)),
        auxiliaryHitCount: Math.max(0, Number(input.auxiliaryHitCount || 0)),
        auxiliaryMissCount: Math.max(0, Number(input.auxiliaryMissCount || 0)),
        prefixExtensionSuccessStreak: Math.max(0, Number(input.prefixExtensionSuccessStreak || 0)),
        prefixExtensionMissStreak: Math.max(0, Number(input.prefixExtensionMissStreak ?? input.prefixEligibleMissStreak ?? 0)),
        ...(input.lastProbeResult ? { lastProbeResult: input.lastProbeResult } : {}),
        ...(input.lastProbeAt ? { lastProbeAt: clean(input.lastProbeAt, 64) } : {}),
        prefixEligibleMissStreak: Math.max(0, Number(input.prefixEligibleMissStreak || 0)),
        explicitBreakpointsVerified: input.explicitBreakpointsVerified === true,
        ...(input.explicitCacheKeyStatus ? { explicitCacheKeyStatus: input.explicitCacheKeyStatus } : {}),
        ...(input.promptCacheOptionsStatus ? { promptCacheOptionsStatus: input.promptCacheOptionsStatus } : {}),
        ...(input.explicitBreakpointsStatus ? { explicitBreakpointsStatus: input.explicitBreakpointsStatus } : {}),
        ...(input.responsesContinuationStatus ? { responsesContinuationStatus: input.responsesContinuationStatus } : {}),
        ...(input.responsesWebSocketStatus ? { responsesWebSocketStatus: input.responsesWebSocketStatus } : {}),
        ...(input.responsesWebSocketResponseCreateStatus ? { responsesWebSocketResponseCreateStatus: input.responsesWebSocketResponseCreateStatus } : {}),
        ...(input.responsesWebSocketContinuationStatus ? { responsesWebSocketContinuationStatus: input.responsesWebSocketContinuationStatus } : {}),
        ...(input.responsesWebSocketToolLoopStatus ? { responsesWebSocketToolLoopStatus: input.responsesWebSocketToolLoopStatus } : {}),
        ...(input.responsesWebSocketLastFailureReason ? { responsesWebSocketLastFailureReason: clean(input.responsesWebSocketLastFailureReason, 300) } : {}),
        ...(input.responsesToolLoopContinuationStatus ? { responsesToolLoopContinuationStatus: input.responsesToolLoopContinuationStatus } : {}),
        ...(input.lastContinuationFailureReason ? { lastContinuationFailureReason: clean(input.lastContinuationFailureReason, 500) } : {}),
        ...(input.blockCacheControlStatus ? { blockCacheControlStatus: input.blockCacheControlStatus } : {}),
        ...(input.nativeCacheEditingStatus ? { nativeCacheEditingStatus: input.nativeCacheEditingStatus } : {}),
        ...(input.cacheUsageReportingStatus ? { cacheUsageReportingStatus: input.cacheUsageReportingStatus } : {}),
        providerRoutingMissStreak: Math.max(0, Number(input.providerRoutingMissStreak || 0)),
        recentForegroundSamples: Array.isArray(input.recentForegroundSamples) ? input.recentForegroundSamples.slice(-50) : [],
        ...(input.lastMissReason ? { lastMissReason: input.lastMissReason } : {}),
        contentStored: false,
        checksum: "",
    };
    evidence.checksum = checksum(evidence);
    return evidence;
}
function recordProviderCacheCapabilityEvidence(config, input) {
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const registry = readRegistry();
        const identity = providerCacheCapabilityIdentity(config);
        const key = identity.identityChecksum;
        const previous = registry.entries[key];
        const evidence = createProviderCacheCapabilityEvidence(config, {
            ...(previous || {}),
            ...input,
            // Capability rejection is field-scoped.  Do not turn a failed
            // breakpoint/options probe into a blanket "all cache fields unsupported"
            // record and thereby discard a still-usable routing key or implicit
            // prefix capability.
            explicitFieldStatus: input.explicitFieldStatus ?? previous?.explicitFieldStatus,
            cacheStatus: input.cacheStatus ?? previous?.cacheStatus,
            promptCacheKeyStatus: input.promptCacheKeyStatus
                ?? (input.explicitCacheKeyStatus === "confirmed" ? "confirmed" : undefined)
                ?? (previous?.promptCacheKeyStatus === "confirmed" ? previous.promptCacheKeyStatus : undefined)
                ?? previous?.explicitCacheKeyStatus,
            explicitCacheKeyStatus: input.explicitCacheKeyStatus ?? previous?.explicitCacheKeyStatus,
            promptCacheOptionsStatus: input.promptCacheOptionsStatus ?? previous?.promptCacheOptionsStatus,
            explicitBreakpointsStatus: input.explicitBreakpointsStatus ?? previous?.explicitBreakpointsStatus,
            responsesContinuationStatus: input.responsesContinuationStatus ?? previous?.responsesContinuationStatus,
            responsesToolLoopContinuationStatus: input.responsesToolLoopContinuationStatus ?? previous?.responsesToolLoopContinuationStatus,
            responsesWebSocketStatus: input.responsesWebSocketStatus ?? previous?.responsesWebSocketStatus,
            responsesWebSocketResponseCreateStatus: input.responsesWebSocketResponseCreateStatus ?? previous?.responsesWebSocketResponseCreateStatus,
            responsesWebSocketContinuationStatus: input.responsesWebSocketContinuationStatus ?? previous?.responsesWebSocketContinuationStatus,
            responsesWebSocketToolLoopStatus: input.responsesWebSocketToolLoopStatus ?? previous?.responsesWebSocketToolLoopStatus,
            responsesWebSocketLastFailureReason: input.responsesWebSocketLastFailureReason !== undefined
                ? clean(input.responsesWebSocketLastFailureReason, 300)
                : previous?.responsesWebSocketLastFailureReason,
            lastContinuationFailureReason: input.lastContinuationFailureReason !== undefined
                ? input.lastContinuationFailureReason
                : input.responsesContinuationStatus === "confirmed"
                    ? undefined
                    : previous?.lastContinuationFailureReason,
            blockCacheControlStatus: input.blockCacheControlStatus ?? previous?.blockCacheControlStatus,
            nativeCacheEditingStatus: input.nativeCacheEditingStatus ?? previous?.nativeCacheEditingStatus,
            foregroundHitCount: input.foregroundHitCount ?? previous?.foregroundHitCount ?? 0,
            foregroundMissCount: input.foregroundMissCount ?? previous?.foregroundMissCount ?? 0,
            foregroundCacheReadTokens: input.foregroundCacheReadTokens ?? previous?.foregroundCacheReadTokens ?? 0,
            foregroundProviderInputTokens: input.foregroundProviderInputTokens ?? previous?.foregroundProviderInputTokens ?? 0,
            auxiliaryHitCount: input.auxiliaryHitCount ?? previous?.auxiliaryHitCount ?? 0,
            auxiliaryMissCount: input.auxiliaryMissCount ?? previous?.auxiliaryMissCount ?? 0,
            prefixExtensionSuccessStreak: input.prefixExtensionSuccessStreak ?? previous?.prefixExtensionSuccessStreak ?? 0,
            prefixExtensionMissStreak: input.prefixExtensionMissStreak ?? previous?.prefixExtensionMissStreak ?? previous?.prefixEligibleMissStreak ?? 0,
            lastProbeResult: input.lastProbeResult ?? previous?.lastProbeResult,
            lastProbeAt: input.lastProbeAt ?? previous?.lastProbeAt,
            recentForegroundSamples: input.recentForegroundSamples ?? previous?.recentForegroundSamples ?? [],
            exactReplayStatus: input.exactReplayStatus ?? previous?.exactReplayStatus ?? "unproven",
            prefixExtensionStatus: input.prefixExtensionStatus ?? previous?.prefixExtensionStatus ?? "unproven",
            explicitBreakpointsVerified: input.explicitBreakpointsVerified ?? previous?.explicitBreakpointsVerified ?? false,
            cacheUsageReportingStatus: input.cacheUsageReportingStatus ?? previous?.cacheUsageReportingStatus,
            providerRoutingMissStreak: input.providerRoutingMissStreak ?? previous?.providerRoutingMissStreak ?? 0,
        });
        registry.latestAttempts[key] = evidence;
        const previousStillValid = validEvidence(previous) && Date.parse(previous.expiresAt) > Date.now();
        const fieldWasRejected = [
            input.explicitCacheKeyStatus,
            input.promptCacheOptionsStatus,
            input.explicitBreakpointsStatus,
            input.blockCacheControlStatus,
            input.nativeCacheEditingStatus,
        ].some(value => value === "unsupported");
        const preserveConfirmed = evidence.status === "degraded"
            && previousStillValid
            && previous.status === "confirmed"
            && !fieldWasRejected;
        // Continuation failures are independent from Prompt Cache. Keep the
        // merged continuation=unsupported state active so subsequent requests do
        // not retry `previous_response_id`, while retaining the confirmed cache
        // status and the degraded latest-attempt receipt for diagnostics.
        const continuationOnlyUpdate = (input.responsesContinuationStatus !== undefined
            || input.responsesToolLoopContinuationStatus !== undefined
            || input.lastContinuationFailureReason !== undefined);
        const activeEvidence = continuationOnlyUpdate
            && previousStillValid
            && previous?.status === "confirmed"
            && !fieldWasRejected
            ? {
                ...evidence,
                status: previous.status,
                checksum: checksum({ ...evidence, status: previous.status, checksum: undefined }),
            }
            : evidence;
        if (!preserveConfirmed || continuationOnlyUpdate)
            registry.entries[key] = activeEvidence;
        writeRegistry(registry);
        return { evidence: activeEvidence, latestAttempt: evidence, preservedConfirmed: preserveConfirmed && !continuationOnlyUpdate };
    }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}
function observeProviderCacheUsage(config, input) {
    const identity = providerCacheCapabilityIdentity(config);
    return (0, atomic_json_file_1.withFileLock)(REGISTRY_FILE, () => {
        const registry = readRegistry();
        const previous = registry.entries[identity.identityChecksum];
        const cacheRead = Math.max(0, Number(input.cacheReadInputTokens || 0));
        const cacheCreation = Math.max(0, Number(input.cacheCreationInputTokens || 0));
        const directInput = Math.max(0, Number(input.providerInputTokens || 0));
        const observedInput = directInput + cacheCreation + cacheRead;
        const usageReported = input.usageReported !== undefined
            ? input.usageReported === true
            : Math.max(0, Number(input.providerInputTokens || 0)) > 0;
        const hit = cacheRead > 0;
        const requestClass = ["foreground_main", "auxiliary", "probe"].includes(String(input.requestClass || ""))
            ? input.requestClass
            : "auxiliary";
        const stablePrefixChecksum = clean(input.stablePrefixChecksum, 64);
        const dynamicSuffixChecksum = clean(input.dynamicSuffixChecksum, 64);
        const payloadChecksum = clean(input.payloadChecksum, 64);
        const promptCacheKeyChecksum = clean(input.promptCacheKeyChecksum, 64);
        const conversationIdentityChecksum = clean(input.conversationIdentityChecksum, 64);
        const previousSamples = Array.isArray(previous?.recentForegroundSamples) ? previous.recentForegroundSamples : [];
        const historicalMeaningfulPrefixReuse = previousSamples.some((sample) => {
            const sampleRead = Math.max(0, Number(sample?.cacheReadTokens || 0));
            const sampleInput = Math.max(0, Number(sample?.providerInputTokens || 0));
            return sampleRead > 0 && sampleInput > 0 && sampleRead >= sampleInput * 0.5;
        });
        // Prefix capability is reusable across sessions in the same scoped
        // provider route. The exact conversation identity remains audit-only and
        // is required for replay classification, not for prefix-extension
        // detection.
        const previousComparable = [...previousSamples].reverse().find((sample) => (!!stablePrefixChecksum
            && sample.stablePrefixChecksum === stablePrefixChecksum
            && sample.promptCacheKeyChecksum === promptCacheKeyChecksum));
        const sameConversation = !!(previousComparable && previousComparable.conversationIdentityChecksum === conversationIdentityChecksum);
        const samePayloadReplay = !!(sameConversation && payloadChecksum && previousComparable.payloadChecksum === payloadChecksum);
        const prefixExtensionCandidate = requestClass === "foreground_main"
            && input.prefixExtensionEligible === true
            && !!previousComparable
            && !!payloadChecksum
            && previousComparable.payloadChecksum !== payloadChecksum
            && previousComparable.dynamicSuffixChecksum !== dynamicSuffixChecksum;
        // A small provider read is not proof that an explicit breakpoint was
        // honored. Require the returned cache read to cover a meaningful portion
        // of the locally comparable prefix before promoting foreground evidence.
        // Capability probes have their own explicit-field evidence path and are
        // not gated by this foreground heuristic.
        const prefixCandidateTokens = Math.max(0, Number(input.matchingPrefixTokensEstimate || 0), Number(input.cacheablePrefixTokens || 0));
        const meaningfulPrefixHit = prefixExtensionCandidate
            && prefixCandidateTokens > 0
            && cacheRead >= prefixCandidateTokens * 0.5;
        const explicitConfirmed = input.requestPatchApplied === true && usageReported;
        const explicitFieldStatus = explicitConfirmed ? "confirmed" : previous?.explicitFieldStatus || previous?.status || "unproven";
        const implicitCacheStatus = hit ? "confirmed" : previous?.implicitCacheStatus || "unproven";
        const exactReplayStatus = hit && samePayloadReplay
            ? "confirmed"
            : previous?.exactReplayStatus || "unproven";
        const prefixEligibleMissStreak = prefixExtensionCandidate
            ? (hit ? 0 : Math.max(0, Number(previous?.prefixEligibleMissStreak || 0)) + 1)
            : Math.max(0, Number(previous?.prefixEligibleMissStreak || 0));
        const previousPrefixMissStreak = Math.max(0, Number(previous?.prefixExtensionMissStreak ?? previous?.prefixEligibleMissStreak ?? 0));
        const previousPrefixSuccessStreak = Math.max(0, Number(previous?.prefixExtensionSuccessStreak || 0));
        const prefixExtensionMissStreak = prefixExtensionCandidate && usageReported && !hit
            ? previousPrefixMissStreak + 1
            : prefixExtensionCandidate && hit ? 0 : previousPrefixMissStreak;
        // Only a meaningful prefix hit can establish rolling-prefix capability.
        // A relay's fixed baseline fragment (for example 192 tokens) is still a
        // cache hit, but it must never count toward breakpoint recovery.
        const prefixExtensionSuccessStreak = prefixExtensionCandidate && usageReported && hit && meaningfulPrefixHit
            ? previousPrefixSuccessStreak + 1
            : prefixExtensionCandidate && (!hit || !meaningfulPrefixHit) ? 0 : previousPrefixSuccessStreak;
        const providerRoutingMissStreak = hit || !prefixExtensionCandidate
            ? 0
            : Math.max(0, Number(previous?.providerRoutingMissStreak || 0)) + (usageReported ? 1 : 0);
        let prefixExtensionStatus = previous?.prefixExtensionStatus || "unproven";
        if (prefixExtensionCandidate && hit && meaningfulPrefixHit) {
            // A provider accepted as exact-only needs two consecutive dynamic-prefix
            // hits before production strategy is promoted again. Initial/unproven
            // capability can be confirmed by the first real hit.
            if (prefixExtensionStatus === "exact_only") {
                if (prefixExtensionSuccessStreak >= 2)
                    prefixExtensionStatus = "confirmed";
            }
            else if (prefixExtensionStatus !== "unsupported") {
                prefixExtensionStatus = "confirmed";
            }
        }
        else if (prefixExtensionCandidate && hit && !meaningfulPrefixHit) {
            // A positive usage value alone is not evidence that a changing
            // transcript prefix was reused. Relays commonly report a tiny fixed
            // baseline fragment (for example 192 tokens) while the comparable
            // prefix is thousands of tokens long. Keep the provider's basic cache
            // capability, but do not promote rolling-prefix support from it. A
            // previously confirmed rolling-prefix path must remain confirmed: the
            // small sample does not invalidate an earlier successful observation.
            prefixExtensionStatus = previous?.prefixExtensionStatus === "confirmed" || historicalMeaningfulPrefixReuse
                ? "confirmed"
                : exactReplayStatus === "confirmed" ? "exact_only" : "degraded";
        }
        else if (prefixExtensionCandidate && usageReported && !hit && prefixExtensionMissStreak >= 3) {
            // Keep a confirmed Prompt Cache capability. Only dynamic-prefix reuse is
            // downgraded after three consecutive reported misses.
            prefixExtensionStatus = exactReplayStatus === "confirmed" ? "exact_only" : "degraded";
        }
        const sample = {
            at: new Date().toISOString(),
            hit,
            cacheReadTokens: cacheRead,
            providerInputTokens: observedInput,
            stablePrefixChecksum,
            dynamicSuffixChecksum,
            payloadChecksum,
            promptCacheKeyChecksum,
            conversationIdentityChecksum,
        };
        const recentForegroundSamples = requestClass === "foreground_main"
            ? [...previousSamples, sample].slice(-50)
            : previousSamples.slice(-50);
        const inferredMissReason = hit
            ? "cold_start"
            : prefixExtensionStatus === "exact_only"
                ? "gateway_exact_replay_only"
                : prefixExtensionCandidate
                    ? "provider_prefix_reuse_unproven"
                    : input.missReason || (usageReported ? "cold_start" : "provider_usage_not_reported");
        const evidence = createProviderCacheCapabilityEvidence(config, {
            status: explicitFieldStatus,
            source: "provider_usage",
            providerCallCount: Math.max(0, Number(previous?.providerCallCount || 0)) + 1,
            cacheReadInputTokens: Math.max(cacheRead, Number(previous?.cacheReadInputTokens || 0)),
            cacheCreationInputTokens: Math.max(0, Number(input.cacheCreationInputTokens || 0)),
            implicitCacheStatus,
            explicitFieldStatus,
            cacheStatus: hit ? "confirmed" : previous?.cacheStatus || undefined,
            promptCacheKeyStatus: input.explicitCacheKeyApplied === true && hit
                ? "confirmed"
                : previous?.promptCacheKeyStatus || previous?.explicitCacheKeyStatus,
            exactReplayStatus,
            prefixExtensionStatus,
            stablePrefixChecksum: stablePrefixChecksum || previous?.stablePrefixChecksum,
            promptCacheKeyChecksum: promptCacheKeyChecksum || previous?.promptCacheKeyChecksum,
            lastCacheReadTokens: cacheRead,
            hitCount: Math.max(0, Number(previous?.hitCount || 0)) + (hit ? 1 : 0),
            missCount: Math.max(0, Number(previous?.missCount || 0)) + (!hit && usageReported ? 1 : 0),
            foregroundHitCount: Math.max(0, Number(previous?.foregroundHitCount || 0)) + (requestClass === "foreground_main" && hit ? 1 : 0),
            foregroundMissCount: Math.max(0, Number(previous?.foregroundMissCount || 0)) + (requestClass === "foreground_main" && !hit && usageReported ? 1 : 0),
            foregroundCacheReadTokens: Math.max(0, Number(previous?.foregroundCacheReadTokens || 0)) + (requestClass === "foreground_main" ? cacheRead : 0),
            foregroundProviderInputTokens: Math.max(0, Number(previous?.foregroundProviderInputTokens || 0)) + (requestClass === "foreground_main" ? observedInput : 0),
            auxiliaryHitCount: Math.max(0, Number(previous?.auxiliaryHitCount || 0)) + (requestClass !== "foreground_main" && hit ? 1 : 0),
            auxiliaryMissCount: Math.max(0, Number(previous?.auxiliaryMissCount || 0)) + (requestClass !== "foreground_main" && !hit && usageReported ? 1 : 0),
            prefixEligibleMissStreak,
            prefixExtensionSuccessStreak,
            prefixExtensionMissStreak,
            lastProbeResult: !usageReported ? "unreported" : hit ? "hit" : "miss",
            lastProbeAt: new Date().toISOString(),
            // A successful request carrying the breakpoint field is evidence that
            // the field is accepted, independent of how many tokens the Provider
            // elected to read. A small fixed read (for example 192 tokens) is a
            // usage result, not a capability rejection. Preserve a prior confirmed
            // breakpoint capability until the Provider explicitly rejects the field.
            explicitBreakpointsVerified: previous?.explicitBreakpointsVerified === true
                || historicalMeaningfulPrefixReuse
                || meaningfulPrefixHit && input.explicitBreakpointsApplied === true,
            explicitCacheKeyStatus: previous?.explicitCacheKeyStatus === "unsupported"
                ? "unsupported"
                : input.explicitCacheKeyApplied === true && hit ? "confirmed" : previous?.explicitCacheKeyStatus,
            explicitBreakpointsStatus: previous?.explicitBreakpointsStatus === "unsupported"
                ? "unsupported"
                : previous?.explicitBreakpointsStatus === "confirmed" || historicalMeaningfulPrefixReuse
                    ? "confirmed"
                    : meaningfulPrefixHit && input.explicitBreakpointsApplied === true
                        ? "confirmed"
                        : input.explicitBreakpointsApplied === true && prefixExtensionCandidate && previous?.source === "provider_usage"
                            ? "degraded"
                            : previous?.explicitBreakpointsStatus,
            responsesContinuationStatus: previous?.responsesContinuationStatus,
            responsesToolLoopContinuationStatus: previous?.responsesToolLoopContinuationStatus,
            lastContinuationFailureReason: previous?.lastContinuationFailureReason,
            blockCacheControlStatus: previous?.blockCacheControlStatus === "unsupported"
                ? "unsupported"
                : input.blockCacheControlApplied === true && hit ? "confirmed" : previous?.blockCacheControlStatus,
            nativeCacheEditingStatus: previous?.nativeCacheEditingStatus === "unsupported"
                ? "unsupported"
                : input.nativeCacheEditingApplied === true && hit ? "confirmed" : previous?.nativeCacheEditingStatus,
            cacheUsageReportingStatus: usageReported ? "confirmed" : previous?.cacheUsageReportingStatus || "unproven",
            providerRoutingMissStreak,
            recentForegroundSamples,
            lastMissReason: hit ? undefined : inferredMissReason,
            reason: hit && prefixExtensionCandidate
                ? "foreground_prefix_extension_reported_cached_input_tokens"
                : hit && samePayloadReplay
                    ? "exact_request_replay_reported_cached_input_tokens"
                    : hit
                        ? input.requestPatchApplied === true ? "explicit_cache_fields_produced_cached_usage" : "provider_usage_reported_cached_input_tokens"
                        : usageReported ? "provider_usage_reported_without_cached_input_tokens" : "provider_cache_usage_not_reported",
        });
        registry.entries[identity.identityChecksum] = evidence;
        registry.latestAttempts[identity.identityChecksum] = evidence;
        writeRegistry(registry);
        return evidence;
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
        const protocol = protocolOf(config);
        evidence = createProviderCacheCapabilityEvidence(config, {
            id: `pcce_official_${identity.identityChecksum.slice(0, 24)}`,
            status: "confirmed",
            cacheStatus: "confirmed",
            promptCacheKeyStatus: ["chat_completions", "responses"].includes(protocol) ? "confirmed" : "unproven",
            explicitFieldStatus: ["chat_completions", "responses", "anthropic_messages"].includes(protocol) ? "confirmed" : "unproven",
            implicitCacheStatus: ["chat_completions", "responses", "gemini_generate_content"].includes(protocol) ? "confirmed" : "unproven",
            source: "official_endpoint",
            providerCallCount: 0,
            prefixExtensionStatus: "confirmed",
            explicitBreakpointsVerified: protocolOf(config) === "responses",
            explicitCacheKeyStatus: ["chat_completions", "responses"].includes(protocolOf(config)) ? "confirmed" : "unproven",
            explicitBreakpointsStatus: protocolOf(config) === "responses" ? "confirmed" : "unproven",
            responsesContinuationStatus: protocolOf(config) === "responses" ? "confirmed" : "unproven",
            responsesToolLoopContinuationStatus: protocolOf(config) === "responses" ? "confirmed" : "unproven",
            blockCacheControlStatus: protocolOf(config) === "anthropic_messages" ? "confirmed" : "unproven",
            cacheUsageReportingStatus: "confirmed",
            reason: "official_endpoint_documented_capability",
        });
    }
    const recent = Array.isArray(evidence?.recentForegroundSamples) ? evidence.recentForegroundSamples : [];
    const trend = (size) => {
        const rows = recent.slice(-size);
        const hits = rows.filter((row) => row.hit === true).length;
        const cacheReadTokens = rows.reduce((sum, row) => sum + Math.max(0, Number(row.cacheReadTokens || 0)), 0);
        const providerInputTokens = rows.reduce((sum, row) => sum + Math.max(0, Number(row.providerInputTokens || 0)), 0);
        return {
            samples: rows.length,
            hits,
            misses: rows.length - hits,
            requestHitRate: rows.length ? hits / rows.length : 0,
            cacheReadTokens,
            providerInputTokens,
            tokenReuseRate: providerInputTokens > 0 ? Math.min(1, cacheReadTokens / providerInputTokens) : 0,
        };
    };
    const foregroundHitCount = Math.max(0, Number(evidence?.foregroundHitCount || 0));
    const foregroundMissCount = Math.max(0, Number(evidence?.foregroundMissCount || 0));
    const foregroundProviderInputTokens = Math.max(0, Number(evidence?.foregroundProviderInputTokens || 0));
    const foregroundCacheReadTokens = Math.max(0, Number(evidence?.foregroundCacheReadTokens || 0));
    return {
        schema: "ccm-provider-cache-capability-state-v1",
        version: 1,
        identity,
        status: evidence?.status || evidence?.explicitFieldStatus || "unproven",
        cacheStatus: evidence?.cacheStatus || (evidence?.implicitCacheStatus === "confirmed" || evidence?.explicitCacheKeyStatus === "confirmed" ? "confirmed" : evidence?.status || "unproven"),
        promptCacheKeyStatus: evidence?.promptCacheKeyStatus || evidence?.explicitCacheKeyStatus || "unproven",
        implicitCacheStatus: evidence?.implicitCacheStatus || "unproven",
        explicitFieldStatus: evidence?.explicitFieldStatus || evidence?.status || "unproven",
        exactReplayStatus: evidence?.exactReplayStatus || "unproven",
        prefixExtensionStatus: evidence?.prefixExtensionStatus || "unproven",
        explicitBreakpointsVerified: evidence?.explicitBreakpointsVerified === true,
        promptCacheOptionsStatus: evidence?.promptCacheOptionsStatus || "unproven",
        explicitBreakpointsStatus: evidence?.explicitBreakpointsStatus || "unproven",
        responsesContinuationStatus: evidence?.responsesContinuationStatus || "unproven",
        responsesToolLoopContinuationStatus: evidence?.responsesToolLoopContinuationStatus || "unproven",
        responsesWebSocketStatus: evidence?.responsesWebSocketStatus || "unproven",
        responsesWebSocketResponseCreateStatus: evidence?.responsesWebSocketResponseCreateStatus || "unproven",
        responsesWebSocketContinuationStatus: evidence?.responsesWebSocketContinuationStatus || "unproven",
        responsesWebSocketToolLoopStatus: evidence?.responsesWebSocketToolLoopStatus || "unproven",
        responsesWebSocketLastFailureReason: evidence?.responsesWebSocketLastFailureReason || "",
        lastContinuationFailureReason: evidence?.lastContinuationFailureReason || "",
        prefixExtensionSuccessStreak: Math.max(0, Number(evidence?.prefixExtensionSuccessStreak || 0)),
        prefixExtensionMissStreak: Math.max(0, Number(evidence?.prefixExtensionMissStreak ?? evidence?.prefixEligibleMissStreak ?? 0)),
        lastProbeResult: evidence?.lastProbeResult || null,
        lastProbeAt: evidence?.lastProbeAt || null,
        providerRoutingMissStreak: Math.max(0, Number(evidence?.providerRoutingMissStreak || 0)),
        lastCacheReadTokens: Math.max(0, Number(evidence?.lastCacheReadTokens || 0)),
        hitCount: Math.max(0, Number(evidence?.hitCount || 0)),
        missCount: Math.max(0, Number(evidence?.missCount || 0)),
        hitRate: Math.max(0, Number(evidence?.hitCount || 0)) + Math.max(0, Number(evidence?.missCount || 0)) > 0
            ? Math.max(0, Number(evidence?.hitCount || 0)) / (Math.max(0, Number(evidence?.hitCount || 0)) + Math.max(0, Number(evidence?.missCount || 0)))
            : 0,
        foreground: {
            hitCount: foregroundHitCount,
            missCount: foregroundMissCount,
            requestHitRate: foregroundHitCount + foregroundMissCount > 0 ? foregroundHitCount / (foregroundHitCount + foregroundMissCount) : 0,
            cacheReadTokens: foregroundCacheReadTokens,
            providerInputTokens: foregroundProviderInputTokens,
            tokenReuseRate: foregroundProviderInputTokens > 0 ? Math.min(1, foregroundCacheReadTokens / foregroundProviderInputTokens) : 0,
            recent20: trend(20),
            recent50: trend(50),
        },
        auxiliary: {
            hitCount: Math.max(0, Number(evidence?.auxiliaryHitCount || 0)),
            missCount: Math.max(0, Number(evidence?.auxiliaryMissCount || 0)),
        },
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
    observeProviderCacheUsage(config, {
        cacheReadInputTokens: 120,
        providerInputTokens: 400,
        requestPatchApplied: false,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash("suffix-a"),
        payloadChecksum: hash("payload-a"),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0s1"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 100,
        matchingPrefixTokensEstimate: 100,
    });
    const implicitState = readProviderCacheCapabilityState(config);
    observeProviderCacheUsage(config, {
        cacheReadInputTokens: 160,
        providerInputTokens: 360,
        requestPatchApplied: true,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash("suffix-b"),
        payloadChecksum: hash("payload-b"),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0s1"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 100,
        matchingPrefixTokensEstimate: 100,
    });
    observeProviderCacheUsage(config, {
        cacheReadInputTokens: 80,
        providerInputTokens: 300,
        requestPatchApplied: true,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash("suffix-cross-session"),
        payloadChecksum: hash("payload-cross-session"),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0s2"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 100,
        matchingPrefixTokensEstimate: 100,
    });
    const confirmed = readProviderCacheCapabilityState(config);
    // Verify conservative prefix state transitions: one miss is tolerated,
    // three reported misses downgrade only prefix reuse, and exact-only needs
    // two consecutive dynamic-prefix hits to recover.
    const streakConfig = { ...config, model: "streak-model" };
    revokeProviderCacheCapabilityEvidence(streakConfig);
    const streakInput = (suffix, payload, hit) => observeProviderCacheUsage(streakConfig, {
        cacheReadInputTokens: hit ? 100 : 0,
        providerInputTokens: 300,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash(suffix),
        payloadChecksum: hash(payload),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0streak"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 100,
        matchingPrefixTokensEstimate: 100,
    });
    streakInput("seed", "seed", true);
    streakInput("seed-2", "seed-2", true);
    streakInput("miss-1", "miss-1", false);
    const oneMiss = readProviderCacheCapabilityState(streakConfig);
    streakInput("miss-2", "miss-2", false);
    streakInput("miss-3", "miss-3", false);
    const threeMisses = readProviderCacheCapabilityState(streakConfig);
    recordProviderCacheCapabilityEvidence(streakConfig, { status: "confirmed", prefixExtensionStatus: "exact_only", reason: "selftest_exact_only" });
    streakInput("hit-1", "hit-1", true);
    const oneRecovery = readProviderCacheCapabilityState(streakConfig);
    streakInput("hit-2", "hit-2", true);
    const twoRecovery = readProviderCacheCapabilityState(streakConfig);
    const baselineConfig = { ...config, model: "baseline-only-model" };
    revokeProviderCacheCapabilityEvidence(baselineConfig);
    // A previously confirmed Responses breakpoint must remain confirmed when a
    // later request only reports the Provider's small baseline fragment. Usage
    // size cannot revoke field support; only an explicit field rejection can.
    recordProviderCacheCapabilityEvidence(baselineConfig, {
        status: "confirmed",
        explicitBreakpointsStatus: "confirmed",
        explicitBreakpointsVerified: true,
        reason: "selftest_explicit_breakpoint_confirmed",
    });
    observeProviderCacheUsage(baselineConfig, {
        cacheReadInputTokens: 192,
        providerInputTokens: 8_000,
        requestPatchApplied: true,
        explicitBreakpointsApplied: true,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash("baseline-a"),
        payloadChecksum: hash("baseline-a"),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0baseline"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 4_000,
        matchingPrefixTokensEstimate: 4_000,
    });
    observeProviderCacheUsage(baselineConfig, {
        cacheReadInputTokens: 192,
        providerInputTokens: 8_000,
        requestPatchApplied: true,
        explicitBreakpointsApplied: true,
        usageReported: true,
        requestClass: "foreground_main",
        stablePrefixChecksum: hash("stable-prefix"),
        dynamicSuffixChecksum: hash("baseline-b"),
        payloadChecksum: hash("baseline-b"),
        promptCacheKeyChecksum: hash("cache-key"),
        conversationIdentityChecksum: hash("project\0p\0baseline"),
        prefixExtensionEligible: true,
        cacheablePrefixTokens: 4_000,
        matchingPrefixTokensEstimate: 4_000,
    });
    const baselineOnly = readProviderCacheCapabilityState(baselineConfig);
    const degraded = recordProviderCacheCapabilityEvidence(config, { status: "degraded", providerCallCount: 1, reason: "HTTP 503" });
    const state = readProviderCacheCapabilityState(config);
    const revoked = revokeProviderCacheCapabilityEvidence(config);
    const checks = {
        implicitDoesNotProveExplicit: implicitState.implicitCacheStatus === "confirmed" && implicitState.explicitFieldStatus === "unproven",
        explicitUsageConfirmsField: confirmed.implicitCacheStatus === "confirmed" && confirmed.explicitFieldStatus === "confirmed",
        businessUsageConfirmsPrefixExtension: confirmed.prefixExtensionStatus === "confirmed"
            && confirmed.foreground.hitCount === 3
            && confirmed.foreground.tokenReuseRate > 0,
        cacheStatusIsIndependentFromContinuation: confirmed.cacheStatus === "confirmed"
            && confirmed.promptCacheKeyStatus === "confirmed",
        crossSessionPrefixReuse: confirmed.prefixExtensionStatus === "confirmed"
            && confirmed.evidence?.recentForegroundSamples?.some((sample) => sample.conversationIdentityChecksum === hash("project\0p\0s2")),
        transientFailurePreservesConfirmed: degraded.preservedConfirmed === true
            && state.evidence?.status === "confirmed"
            && state.evidence?.cacheStatus === "confirmed"
            && state.latestAttempt?.status === "degraded",
        singleMissDoesNotDowngrade: oneMiss.prefixExtensionStatus === "confirmed"
            && oneMiss.prefixExtensionMissStreak === 1,
        threeMissesDowngradePrefixOnly: threeMisses.prefixExtensionStatus === "degraded"
            && threeMisses.cacheStatus === "confirmed",
        exactOnlyNeedsTwoHitsToRecover: oneRecovery.prefixExtensionStatus === "exact_only"
            && twoRecovery.prefixExtensionStatus === "confirmed",
        baselineFragmentDoesNotConfirmPrefixExtension: baselineOnly.prefixExtensionStatus === "degraded"
            && baselineOnly.lastCacheReadTokens === 192
            && baselineOnly.cacheStatus === "confirmed",
        baselineFragmentPreservesConfirmedBreakpoints: baselineOnly.explicitBreakpointsStatus === "confirmed"
            && baselineOnly.explicitBreakpointsVerified === true,
        secretsNotStored: !JSON.stringify(state).includes("hidden") && !JSON.stringify(state).includes("gateway.example"),
        revokeWorks: revoked.removed === true && readProviderCacheCapabilityState(config).evidence === null,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-capability-registry.js.map