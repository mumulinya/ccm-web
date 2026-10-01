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
exports.providerCacheTrend = providerCacheTrend;
exports.recordProviderCacheScopeMetric = recordProviderCacheScopeMetric;
exports.recordExternalAgentCacheStageMetric = recordExternalAgentCacheStageMetric;
exports.readProviderCacheScopeMetrics = readProviderCacheScopeMetrics;
exports.readProviderCacheScopeMetricsBatch = readProviderCacheScopeMetricsBatch;
exports.readProviderCacheSessionDiagnostics = readProviderCacheSessionDiagnostics;
const crypto = __importStar(require("crypto"));
const provider_request_diagnostics_1 = require("./provider-request-diagnostics");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const cache_adaptive_tuning_1 = require("./cache-adaptive-tuning");
const FILE = path.join(utils_1.CCM_DIR, "provider-context-cache", "scope-metrics-v1.json");
// Keep the old location readable for one-way compatibility. New writes always
// go to CCM_DIR so isolated/test instances cannot silently split their ledger.
const LEGACY_FILE = path.join(require("os").homedir(), ".ccm", "provider-context-cache", "scope-metrics-v1.json");
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function empty() {
    return { schema: "ccm-provider-cache-scope-metrics-v1", scopes: {}, sessions: {}, stages: {}, stageScopes: {}, updatedAt: new Date(0).toISOString(), contentStored: false };
}
function read() {
    try {
        // An explicit isolated store must never import another instance's state.
        // Legacy fallback is only safe for the normal default runtime home.
        const canReadLegacy = !process.env.CCM_TASK_STORE_DIR && LEGACY_FILE !== FILE;
        const source = fs.existsSync(FILE) ? FILE : (canReadLegacy && fs.existsSync(LEGACY_FILE) ? LEGACY_FILE : FILE);
        const parsed = JSON.parse(fs.readFileSync(source, "utf8"));
        return parsed?.schema === "ccm-provider-cache-scope-metrics-v1" && parsed?.contentStored === false
            ? {
                ...parsed,
                stages: parsed.stages && typeof parsed.stages === "object" ? parsed.stages : {},
                stageScopes: parsed.stageScopes && typeof parsed.stageScopes === "object" ? parsed.stageScopes : {},
            }
            : empty();
    }
    catch {
        return empty();
    }
}
function keys(binding) {
    const scope = String(binding?.scope || "other");
    const scopeId = scope === "global" ? "global" : String(binding?.scopeId || "");
    const sessionId = String(binding?.sessionId || "");
    return {
        scope: hash({ scope, scopeId }),
        session: hash({ scope, scopeId, sessionId }),
        stage: binding?.cacheAffinity?.cacheKeyProfile
            ? hash({ scope, scopeId, cacheKeyProfile: String(binding.cacheAffinity.cacheKeyProfile) })
            : "",
    };
}
const finite = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const reportedUsage = (receipt) => {
    const explicit = receipt?.providerUsageReported ?? receipt?.usageReported;
    if (explicit != null)
        return explicit === true;
    return finite(receipt?.directInputTokens ?? receipt?.direct_input_tokens ?? receipt?.providerInputTokens)
        + finite(receipt?.cacheReadInputTokens ?? receipt?.cache_read_input_tokens)
        + finite(receipt?.cacheCreationInputTokens ?? receipt?.cache_creation_input_tokens) > 0;
};
function providerCacheTrend(rows, size, options = {}) {
    const eligible = rows.filter(row => {
        const kind = String(row?.requestClass || "unattributed");
        return options.includeAll === true || kind === String(options.requestClass || "foreground_main");
    });
    const physicalSamples = eligible.slice(-size);
    const logical = new Map();
    physicalSamples.forEach((row, index) => {
        const id = String(row?.logicalCallId || row?.requestKey || "");
        if (!id) {
            logical.set(`anonymous:${index}`, row);
            return;
        }
        const prior = logical.get(id);
        if (!prior || String(row?.at || "") >= String(prior?.at || ""))
            logical.set(id, row);
    });
    const samples = [...logical.values()].slice(-size);
    const reported = samples.filter(row => row.usageReported === true
        || (row.usageReported == null && Number(row.providerInputTokens || 0) > 0));
    const physicalReported = physicalSamples.filter(row => row.usageReported === true
        || (row.usageReported == null && Number(row.providerInputTokens || 0) > 0));
    const hits = reported.filter(row => row.hit === true).length;
    const fullReuse = reported.filter(row => row.providerCacheReuseClass === 'full_reuse').length;
    const partialReuse = reported.filter(row => row.providerCacheReuseClass === 'partial_reuse').length;
    const baselineOnly = reported.filter(row => row.providerCacheReuseClass === 'baseline_only').length;
    const misses = reported.filter(row => row.providerCacheReuseClass === 'miss' || (!row.providerCacheReuseClass && row.hit !== true)).length;
    // Token and cost totals are physical-attempt accounting. Only rates/counts
    // use the deduplicated logical result above.
    const cacheReadTokens = physicalReported.reduce((sum, row) => sum + Number(row.cacheReadTokens || 0), 0);
    const directInputTokens = physicalReported.reduce((sum, row) => sum + (row.directInputTokens != null
        ? finite(row.directInputTokens)
        : Math.max(0, finite(row.providerInputTokens) - finite(row.cacheReadTokens) - finite(row.cacheCreationInputTokens))), 0);
    const cacheCreationInputTokens = physicalReported.reduce((sum, row) => sum + Number(row.cacheCreationInputTokens || 0), 0);
    const providerInputTokens = physicalReported.reduce((sum, row) => sum + Number(row.providerInputTokens || 0), 0);
    const measured = physicalReported.filter(row => row.segmentMetricsVersion === 2);
    const sum = (field) => measured.reduce((total, row) => total + finite(row[field]), 0);
    const cacheablePrefixTokens = sum('cacheablePrefixTokens');
    const uncachedSuffixTokens = sum('uncachedSuffixTokens');
    const duplicateToolResultTokens = sum('duplicateToolResultTokens');
    const stableToolSchemaTokens = sum('stableToolSchemaTokens');
    const rollingHistoryTokens = sum('rollingHistoryTokens');
    const rollingToolResultTokens = sum('rollingToolResultTokens');
    const activeToolResultTokens = sum('activeToolResultTokens');
    const incrementalPayloadTokens = sum('incrementalPayloadTokens');
    const projectedToolResultTokens = sum('projectedToolResultTokens');
    const savedToolResultTokens = sum('savedToolResultTokens');
    const projectionFallbackCount = sum('projectionFallbackCount');
    const publicStablePrefixTokens = sum('publicStablePrefixTokens');
    const agentStablePrefixTokens = sum('agentStablePrefixTokens');
    const measuredInput = sum('providerInputTokens');
    const totalContextTokens = directInputTokens + cacheCreationInputTokens + cacheReadTokens;
    return {
        samples: physicalSamples.length,
        logicalCalls: samples.length,
        reportedSamples: physicalReported.length,
        logicalReportedCalls: reported.length,
        unreportedSamples: physicalSamples.length - physicalReported.length,
        physicalAttemptCount: physicalSamples.length,
        failedAttemptCount: physicalSamples.filter(row => ["failed", "cancelled"].includes(String(row.status || ""))).length,
        hits,
        misses,
        fullReuseRequests: fullReuse,
        partialReuseRequests: partialReuse,
        baselineOnlyRequests: baselineOnly,
        fullReuseRequestRate: reported.length ? fullReuse / reported.length : null,
        partialReuseRequestRate: reported.length ? partialReuse / reported.length : null,
        baselineOnlyRequestRate: reported.length ? baselineOnly / reported.length : null,
        requestHitRate: reported.length ? hits / reported.length : null,
        cacheReadTokens,
        directInputTokens,
        cacheCreationInputTokens,
        providerInputTokens,
        totalContextTokens,
        diagnosticSamples: measured.length,
        cacheablePrefixTokens,
        uncachedSuffixTokens,
        duplicateToolResultTokens,
        stableToolSchemaTokens,
        rollingHistoryTokens,
        rollingToolResultTokens,
        activeToolResultTokens,
        incrementalPayloadTokens,
        projectedToolResultTokens,
        savedToolResultTokens,
        projectionFallbackCount,
        publicStablePrefixTokens,
        agentStablePrefixTokens,
        tokenReuseRate: totalContextTokens > 0 ? Math.min(1, cacheReadTokens / totalContextTokens) : null,
        cacheableUtilizationRate: cacheablePrefixTokens > 0 ? sum('cacheReadTokens') / cacheablePrefixTokens : null,
        dynamicSuffixRate: measuredInput > 0 ? uncachedSuffixTokens / measuredInput : null,
        duplicateToolResultRate: measuredInput > 0 ? duplicateToolResultTokens / measuredInput : null,
    };
}
const trend = providerCacheTrend;
function recordProviderCacheScopeMetric(binding, receipt) {
    const requestClass = String(receipt?.requestClass || receipt?.requestAttribution?.requestClass || "unattributed");
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const state = read();
        const identity = keys(binding);
        // A context-plan id is stable across retries. Deduplicate on the physical
        // Provider attempt id when available, while retaining the logical call id
        // for rate aggregation.
        const physicalRequestId = receipt?.requestAttemptId || receipt?.physicalRequestId || receipt?.requestId;
        const requestKey = physicalRequestId ? hash(String(physicalRequestId)) : '';
        if (requestKey && (state.sessions[identity.session] || []).some((row) => row.requestKey === requestKey)) {
            return readProviderCacheScopeMetrics(binding, state);
        }
        const sample = {
            requestKey,
            requestId: String(physicalRequestId || ""),
            status: String(receipt?.status || "completed"),
            segmentMetricsVersion: receipt?.cacheablePrefixTokens != null && receipt?.uncachedSuffixTokens != null ? 2 : 0,
            at: String(receipt?.completedAt || new Date().toISOString()),
            hit: Number(receipt?.cacheReadInputTokens || 0) > 0,
            cacheReadTokens: Math.max(0, Number(receipt?.cacheReadInputTokens || 0)),
            providerCacheReuseClass: String(receipt?.providerCacheReuseClass || ""),
            providerCacheCandidateTokens: Math.max(0, Number(receipt?.providerCacheCandidateTokens || receipt?.cacheablePrefixTokens || 0)),
            providerCacheMatchedTokens: Math.max(0, Number(receipt?.providerCacheMatchedTokens || receipt?.cacheReadInputTokens || 0)),
            providerCachePartialReason: String(receipt?.providerCachePartialReason || ""),
            providerCacheComparableEvidence: receipt?.providerCacheComparableEvidence === true,
            wireLayoutVersion: String(receipt?.wireLayoutVersion || ""),
            toolSchemaChecksum: String(receipt?.toolSchemaChecksum || ""),
            toolSchemaVersion: String(receipt?.toolSchemaVersion || ""),
            toolSchemaPrefixEligible: receipt?.toolSchemaPrefixEligible === true,
            requestClass,
            purpose: String(receipt?.purpose || receipt?.requestAttribution?.purpose || ""),
            logicalCallId: String(receipt?.logicalCallId || receipt?.logical_call_id || ""),
            attempt: Math.max(1, Number(receipt?.attempt || receipt?.retryAttempt || 1)),
            directInputTokens: Math.max(0, Number(receipt?.directInputTokens ?? receipt?.direct_input_tokens ?? receipt?.providerInputTokens ?? 0)),
            cacheCreationInputTokens: Math.max(0, Number(receipt?.cacheCreationInputTokens || 0)),
            providerInputTokens: Math.max(0, Number(receipt?.directInputTokens ?? receipt?.direct_input_tokens ?? receipt?.providerInputTokens ?? 0))
                + Math.max(0, Number(receipt?.cacheCreationInputTokens || 0))
                + Math.max(0, Number(receipt?.cacheReadInputTokens || 0)),
            cacheablePrefixTokens: Math.max(0, Number(receipt?.cacheablePrefixTokens || 0)),
            uncachedSuffixTokens: Math.max(0, Number(receipt?.uncachedSuffixTokens || receipt?.dynamicSuffixTokens || 0)),
            duplicateToolResultTokens: Math.max(0, Number(receipt?.duplicateToolResultTokens || 0)),
            stableToolSchemaTokens: Math.max(0, Number(receipt?.stableToolSchemaTokens || 0)),
            rollingHistoryTokens: Math.max(0, Number(receipt?.rollingHistoryTokens || 0)),
            rollingToolResultTokens: Math.max(0, Number(receipt?.rollingToolResultTokens || 0)),
            activeToolResultTokens: Math.max(0, Number(receipt?.activeToolResultTokens || 0)),
            incrementalPayloadTokens: Math.max(0, Number(receipt?.incrementalPayloadTokens || receipt?.uncachedSuffixTokens || 0)),
            rollingBreakpointApplied: receipt?.rollingBreakpointApplied === true,
            rollingBreakpointIndex: Number.isFinite(Number(receipt?.rollingBreakpointIndex)) ? Number(receipt.rollingBreakpointIndex) : -1,
            rollingBreakpointReason: reasonCode(receipt?.rollingBreakpointReason),
            projectedToolResultTokens: Math.max(0, Number(receipt?.projectedToolResultTokens || 0)),
            savedToolResultTokens: Math.max(0, Number(receipt?.savedToolResultTokens || receipt?.clearedToolResultTokens || 0)),
            projectionFallbackCount: Math.max(0, Number(receipt?.projectionFallbackCount || 0)),
            publicStablePrefixTokens: Math.max(0, Number(receipt?.publicStablePrefixTokens || 0)),
            agentStablePrefixTokens: Math.max(0, Number(receipt?.agentStablePrefixTokens || 0)),
            publicStablePrefixChecksum: String(receipt?.publicStablePrefixChecksum || ""),
            publicPrefixVersion: String(receipt?.publicPrefixVersion || ""),
            publicInstructionChecksum: String(receipt?.publicInstructionChecksum || ""),
            publicInstructionTokens: Math.max(0, Number(receipt?.publicInstructionTokens || 0)),
            publicInstructionBlockCount: Math.max(0, Number(receipt?.publicInstructionBlockCount || 0)),
            publicPrefixContiguous: receipt?.publicPrefixContiguous === true,
            publicToolProfileChecksum: String(receipt?.publicToolProfileChecksum || receipt?.adapterEvidence?.publicToolProfileChecksum || ""),
            publicToolSchemaChecksum: String(receipt?.publicToolSchemaChecksum || receipt?.adapterEvidence?.publicToolSchemaChecksum || ""),
            publicToolSchemaVersion: String(receipt?.publicToolSchemaVersion || receipt?.adapterEvidence?.publicToolSchemaVersion || ""),
            publicProfileVersion: String(receipt?.publicProfileVersion || receipt?.adapterEvidence?.publicProfileVersion || ""),
            crossSessionComparable: receipt?.providerCacheComparableEvidence === true
                || receipt?.adapterEvidence?.crossSessionComparable === true,
            publicPrefixReuseEligible: receipt?.publicPrefixReuseEligible === true,
            compactionWarningLevel: ["normal", "warning", "recommended"].includes(String(receipt?.compactionWarningLevel)) ? String(receipt.compactionWarningLevel) : "normal",
            usageReported: reportedUsage(receipt),
            stablePrefixChangeReasons: (receipt?.stablePrefixChangeReasons || []).filter((value) => /^[a-z_]{1,64}$/.test(String(value))).slice(0, 12),
            missReason: reasonCode(receipt?.cacheMissReason),
            localHistoryState: receipt?.localHistoryState,
            providerCacheObservation: receipt?.providerCacheObservation,
            warmStartKind: String(receipt?.warmStartKind || ""),
            concurrentWarmupDetected: receipt?.concurrentWarmupDetected === true,
            warmState: String(receipt?.cacheWarmState || "cold"),
            agentRole: String(receipt?.cacheAffinity?.agentRole || ""),
            stage: String(receipt?.cacheAffinity?.stage || ""),
            runtimeOwnership: String(receipt?.cacheAffinity?.runtimeOwnership || "ccm_provider"),
            cacheKeyProfile: String(receipt?.cacheAffinity?.cacheKeyProfile || ""),
        };
        state.scopes[identity.scope] = [...(state.scopes[identity.scope] || []), sample].slice(-50);
        state.sessions[identity.session] = [...(state.sessions[identity.session] || []), sample].slice(-50);
        if (identity.stage) {
            state.stages[identity.stage] = [...(state.stages[identity.stage] || []), sample].slice(-50);
            state.stageScopes[identity.scope] = [...new Set([...(state.stageScopes[identity.scope] || []), identity.stage])].slice(-40);
        }
        state.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        (0, atomic_json_file_1.writeJsonAtomic)(FILE, state);
        return readProviderCacheScopeMetrics(binding, state);
    }, { timeoutMs: 10_000, retryMs: 20, staleMs: 60_000 });
}
function recordExternalAgentCacheStageMetric(affinity, metrics, completedAt = new Date().toISOString()) {
    if (!affinity?.cacheKeyProfile || affinity?.runtimeOwnership !== "external_agent_runtime")
        return null;
    return recordProviderCacheScopeMetric({
        scope: affinity.scope,
        scopeId: affinity.scopeId,
        sessionId: affinity.exactSessionId || "external-runtime",
        cacheAffinity: affinity,
    }, {
        requestClass: "auxiliary",
        completedAt,
        providerInputTokens: Math.max(0, Number(metrics?.directInputTokens || 0)),
        cacheCreationInputTokens: Math.max(0, Number(metrics?.cacheCreationInputTokens || 0)),
        cacheReadInputTokens: Math.max(0, Number(metrics?.cacheReadInputTokens || 0)),
        cacheMissReason: String(metrics?.lastMissReason || ""),
        cacheWarmState: Number(metrics?.cacheReadInputTokens || 0) > 0 ? "warm" : "cold",
        cacheAffinity: affinity,
    });
}
function readProviderCacheScopeMetrics(binding, supplied) {
    const state = supplied || read();
    const identity = keys(binding);
    const scopeRows = Array.isArray(state.scopes?.[identity.scope]) ? state.scopes[identity.scope] : [];
    const sessionRows = Array.isArray(state.sessions?.[identity.session]) ? state.sessions[identity.session] : [];
    const stageRows = identity.stage && Array.isArray(state.stages?.[identity.stage]) ? state.stages[identity.stage] : [];
    const scopedStageRows = binding?.sessionId
        ? [...new Set(sessionRows.map((row) => row.cacheKeyProfile))].map(profile => sessionRows.filter((row) => row.cacheKeyProfile === profile))
        : (state.stageScopes?.[identity.scope] || []).map((stageKey) => state.stages?.[stageKey]);
    const stageMetrics = scopedStageRows.map((rows) => {
        const samples = Array.isArray(rows) ? rows : [];
        const latest = samples[samples.length - 1] || {};
        return {
            agentRole: String(latest.agentRole || ""),
            stage: String(latest.stage || ""),
            runtimeOwnership: String(latest.runtimeOwnership || "ccm_provider"),
            cacheKeyProfile: String(latest.cacheKeyProfile || ""),
            recent20: trend(samples, 20, { includeAll: true }),
            recent50: trend(samples, 50, { includeAll: true }),
            lastMissReason: reasonCode([...samples].reverse().find((row) => row?.hit !== true)?.missReason),
            contentStored: false,
        };
    }).filter((item) => item.agentRole && item.stage);
    return {
        schema: "ccm-provider-cache-scope-metrics-projection-v1",
        scope: { recent20: trend(scopeRows, 20), recent50: trend(scopeRows, 50) },
        session: { recent20: trend(sessionRows, 20), recent50: trend(sessionRows, 50) },
        stage: { recent20: trend(stageRows, 20), recent50: trend(stageRows, 50) },
        auxiliary: { recent20: trend(sessionRows, 20, { requestClass: "auxiliary" }), recent50: trend(sessionRows, 50, { requestClass: "auxiliary" }) },
        probe: { recent20: trend(sessionRows, 20, { requestClass: "probe" }), recent50: trend(sessionRows, 50, { requestClass: "probe" }) },
        unattributed: { recent20: trend(sessionRows, 20, { requestClass: "unattributed" }), recent50: trend(sessionRows, 50, { requestClass: "unattributed" }) },
        stages: stageMetrics,
        updatedAt: String(state.updatedAt || ""),
        contentStored: false,
    };
}
function readProviderCacheScopeMetricsBatch(bindings = []) {
    const state = read();
    return bindings.map(binding => readProviderCacheScopeMetrics(binding, state));
}
/**
 * Safe, content-free single-session cache diagnostics.  The persisted scope
 * metric ledger intentionally keeps only bounded samples, so this projection
 * reports the recent window and never exposes prompt/tool bodies.
 */
function readProviderCacheSessionDiagnostics(binding, _latestState = null, supplied) {
    const state = supplied || read();
    const rows = state.sessions?.[keys(binding).session] || [];
    const mainRows = rows.filter(row => String(row?.requestClass || "unattributed") === "foreground_main");
    const metrics = readProviderCacheScopeMetrics(binding, state);
    const recent = metrics.session.recent50 || {};
    const totalContextTokens = Math.max(0, Number(recent.totalContextTokens || 0));
    const cacheReadInputTokens = Math.max(0, Number(recent.cacheReadTokens || 0));
    const latest = mainRows.at(-1) || {};
    const latestContext = finite(latest.providerInputTokens) + finite(latest.cacheReadTokens) + finite(latest.cacheCreationInputTokens);
    const warning = latest.compactionWarningLevel || (latestContext > 0 && finite(latest.uncachedSuffixTokens) / latestContext >= 0.7 ? "recommended" : latestContext > 0 && finite(latest.uncachedSuffixTokens) / latestContext >= 0.6 ? "warning" : "normal");
    return {
        schema: "ccm-session-cache-diagnostics-v1",
        ...(0, provider_request_diagnostics_1.readProviderRequestDiagnostics)(binding),
        windowSize: 50,
        diagnosticRequestCount: recent.diagnosticSamples,
        sessionId: String(binding?.sessionId || ""),
        scope: String(binding?.scope || "other"),
        scopeId: String(binding?.scopeId || ""),
        requestCount: Math.max(0, Number(recent.samples || 0)),
        reportedRequestCount: Math.max(0, Number(recent.reportedSamples || 0)),
        hitRequestCount: Math.max(0, Number(recent.hits || 0)),
        requestHitRate: recent.requestHitRate,
        cacheReadInputTokens,
        directInputTokens: Math.max(0, Number(recent.directInputTokens || 0)),
        cacheCreationInputTokens: Math.max(0, Number(recent.cacheCreationInputTokens || 0)),
        providerInputTokens: totalContextTokens,
        tokenReuseRate: recent.tokenReuseRate == null ? null : Math.min(1, Math.max(0, Number(recent.tokenReuseRate || 0))),
        cacheablePrefixTokens: finite(recent.cacheablePrefixTokens),
        uncachedSuffixTokens: finite(recent.uncachedSuffixTokens),
        duplicateToolResultTokens: finite(recent.duplicateToolResultTokens),
        stableToolSchemaTokens: finite(recent.stableToolSchemaTokens),
        rollingHistoryTokens: finite(recent.rollingHistoryTokens),
        rollingToolResultTokens: finite(recent.rollingToolResultTokens),
        activeToolResultTokens: finite(recent.activeToolResultTokens),
        incrementalPayloadTokens: finite(recent.incrementalPayloadTokens),
        rollingBreakpointApplied: mainRows.some(row => row.rollingBreakpointApplied === true),
        rollingBreakpointIndex: Number([...mainRows].reverse().find(row => Number.isFinite(Number(row.rollingBreakpointIndex)))?.rollingBreakpointIndex ?? -1),
        rollingBreakpointReason: reasonCode([...mainRows].reverse().find(row => row.rollingBreakpointReason)?.rollingBreakpointReason),
        providerCacheReadTokens: cacheReadInputTokens,
        providerCacheReadRate: totalContextTokens > 0 ? cacheReadInputTokens / totalContextTokens : null,
        fullReuseRequests: recent.fullReuseRequests || 0,
        partialReuseRequests: recent.partialReuseRequests || 0,
        baselineOnlyRequests: recent.baselineOnlyRequests || 0,
        fullReuseRequestRate: recent.fullReuseRequestRate,
        partialReuseRequestRate: recent.partialReuseRequestRate,
        baselineOnlyRequestRate: recent.baselineOnlyRequestRate,
        latestProviderCacheReuseClass: String(latest.providerCacheReuseClass || "unreported"),
        latestProviderCacheMatchedTokens: finite(latest.providerCacheMatchedTokens || latest.cacheReadTokens),
        latestProviderCacheCandidateTokens: finite(latest.providerCacheCandidateTokens || latest.cacheablePrefixTokens),
        latestProviderCacheComparableEvidence: latest.providerCacheComparableEvidence === true,
        latestWireLayoutVersion: String(latest.wireLayoutVersion || ""),
        projectedToolResultTokens: finite(recent.projectedToolResultTokens),
        savedToolResultTokens: finite(recent.savedToolResultTokens),
        projectionFallbackCount: finite(recent.projectionFallbackCount),
        publicStablePrefixTokens: finite(recent.publicStablePrefixTokens),
        agentStablePrefixTokens: finite(recent.agentStablePrefixTokens),
        publicStablePrefixChecksum: String([...mainRows].reverse().find(row => row.publicStablePrefixChecksum)?.publicStablePrefixChecksum || ""),
        publicPrefixVersion: String([...mainRows].reverse().find(row => row.publicPrefixVersion)?.publicPrefixVersion || ""),
        publicInstructionChecksum: String([...mainRows].reverse().find(row => row.publicInstructionChecksum)?.publicInstructionChecksum || ""),
        publicInstructionTokens: finite([...mainRows].reverse().find(row => row.publicInstructionTokens)?.publicInstructionTokens),
        publicInstructionBlockCount: finite([...mainRows].reverse().find(row => row.publicInstructionBlockCount)?.publicInstructionBlockCount),
        publicPrefixContiguous: [...mainRows].reverse().find(row => row.publicPrefixContiguous !== undefined)?.publicPrefixContiguous === true,
        publicToolProfileChecksum: String([...mainRows].reverse().find(row => row.publicToolProfileChecksum)?.publicToolProfileChecksum || ""),
        publicToolSchemaChecksum: String([...mainRows].reverse().find(row => row.publicToolSchemaChecksum)?.publicToolSchemaChecksum || ""),
        publicToolSchemaVersion: String([...mainRows].reverse().find(row => row.publicToolSchemaVersion)?.publicToolSchemaVersion || ""),
        publicProfileVersion: String([...mainRows].reverse().find(row => row.publicProfileVersion)?.publicProfileVersion || ""),
        latestCrossSessionComparable: latest.crossSessionComparable === true,
        latestWarmStartKind: String(latest.warmStartKind || ""),
        latestConcurrentWarmupDetected: latest.concurrentWarmupDetected === true,
        publicPrefixReuseEligible: mainRows.some(row => row.publicPrefixReuseEligible === true),
        toolSchemaChecksum: String([...mainRows].reverse().find(row => row.toolSchemaChecksum)?.toolSchemaChecksum || ""),
        toolSchemaVersion: String([...mainRows].reverse().find(row => row.toolSchemaVersion)?.toolSchemaVersion || ""),
        compactionWarningLevel: warning,
        ...(latest.localHistoryState ? { localHistoryState: latest.localHistoryState } : {}),
        ...(latest.providerCacheObservation ? { providerCacheObservation: latest.providerCacheObservation } : {}),
        cacheableUtilizationRate: recent.cacheableUtilizationRate,
        dynamicSuffixRate: recent.dynamicSuffixRate,
        duplicateToolResultRate: recent.duplicateToolResultRate,
        adaptiveTuning: (0, cache_adaptive_tuning_1.tuneCacheParameters)(recent),
        lastMissReason: reasonCode([...mainRows].reverse().find(row => row?.usageReported && !row.hit)?.missReason),
        lastStablePrefixChange: reasonCode([...mainRows].reverse().flatMap(row => row.stablePrefixChangeReasons || [])[0]),
        agentStages: metrics.stages,
        updatedAt: String(mainRows.at(-1)?.at || ''),
        contentStored: false,
    };
}
function reasonCode(value) {
    const allowed = new Set(['cold_start', 'first_request_miss', 'ttl_expired', 'stable_prefix_changed', 'tool_schema_changed', 'compaction_boundary_changed',
        'transcript_projection_changed', 'provider_routing_or_eviction', 'provider_usage_not_reported', 'provider_usage_unreported',
        'prefix_below_provider_threshold', 'native_fields_unproven', 'provider_prefix_reuse_unproven', 'dynamic_prefix_leak',
        'protocol_changed', 'ttl_policy_changed', 'reasoning_mode_changed', 'breakpoint_layout_changed', 'transport_parameters_changed',
        'completed_history_boundary', 'no_cacheable_message_boundary', 'current_boundary_excluded',
        'provider_native_rolling_boundary', 'implicit_provider_cache', 'rolling_breakpoint_unsupported',
        'completed_tool_batch', 'incomplete_tool_batch', 'provider_limit']);
    return allowed.has(value) ? String(value) : value ? 'unknown' : '';
}
//# sourceMappingURL=provider-cache-scope-metrics.js.map