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
exports.recordProviderCacheScopeMetric = recordProviderCacheScopeMetric;
exports.recordExternalAgentCacheStageMetric = recordExternalAgentCacheStageMetric;
exports.readProviderCacheScopeMetrics = readProviderCacheScopeMetrics;
exports.readProviderCacheScopeMetricsBatch = readProviderCacheScopeMetricsBatch;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const FILE = path.join(os.homedir(), ".ccm", "provider-context-cache", "scope-metrics-v1.json");
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function empty() {
    return { schema: "ccm-provider-cache-scope-metrics-v1", scopes: {}, sessions: {}, stages: {}, stageScopes: {}, updatedAt: new Date(0).toISOString(), contentStored: false };
}
function read() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
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
function trend(rows, size) {
    const samples = rows.slice(-size);
    const hits = samples.filter(row => row.hit === true).length;
    const cacheReadTokens = samples.reduce((sum, row) => sum + Number(row.cacheReadTokens || 0), 0);
    const providerInputTokens = samples.reduce((sum, row) => sum + Number(row.providerInputTokens || 0), 0);
    return {
        samples: samples.length,
        hits,
        misses: samples.length - hits,
        requestHitRate: samples.length ? hits / samples.length : 0,
        cacheReadTokens,
        providerInputTokens,
        tokenReuseRate: providerInputTokens > 0 ? Math.min(1, cacheReadTokens / providerInputTokens) : 0,
    };
}
function recordProviderCacheScopeMetric(binding, receipt) {
    if (String(receipt?.requestClass || "") !== "foreground_main" && !receipt?.cacheAffinity?.cacheKeyProfile)
        return null;
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const state = read();
        const identity = keys(binding);
        const sample = {
            at: String(receipt?.completedAt || new Date().toISOString()),
            hit: Number(receipt?.cacheReadInputTokens || 0) > 0,
            cacheReadTokens: Math.max(0, Number(receipt?.cacheReadInputTokens || 0)),
            providerInputTokens: Math.max(0, Number(receipt?.providerInputTokens || 0))
                + Math.max(0, Number(receipt?.cacheCreationInputTokens || 0))
                + Math.max(0, Number(receipt?.cacheReadInputTokens || 0)),
            missReason: String(receipt?.cacheMissReason || ""),
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
    const stageMetrics = (state.stageScopes?.[identity.scope] || []).map((stageKey) => state.stages?.[stageKey]).map((rows) => {
        const samples = Array.isArray(rows) ? rows : [];
        const latest = samples[samples.length - 1] || {};
        return {
            agentRole: String(latest.agentRole || ""),
            stage: String(latest.stage || ""),
            runtimeOwnership: String(latest.runtimeOwnership || "ccm_provider"),
            cacheKeyProfile: String(latest.cacheKeyProfile || ""),
            recent20: trend(samples, 20),
            recent50: trend(samples, 50),
            lastMissReason: String([...samples].reverse().find((row) => row?.hit !== true)?.missReason || ""),
            contentStored: false,
        };
    }).filter((item) => item.agentRole && item.stage);
    return {
        schema: "ccm-provider-cache-scope-metrics-projection-v1",
        scope: { recent20: trend(scopeRows, 20), recent50: trend(scopeRows, 50) },
        session: { recent20: trend(sessionRows, 20), recent50: trend(sessionRows, 50) },
        stage: { recent20: trend(stageRows, 20), recent50: trend(stageRows, 50) },
        stages: stageMetrics,
        updatedAt: String(state.updatedAt || ""),
        contentStored: false,
    };
}
function readProviderCacheScopeMetricsBatch(bindings = []) {
    const state = read();
    return bindings.map(binding => readProviderCacheScopeMetrics(binding, state));
}
//# sourceMappingURL=provider-cache-scope-metrics.js.map