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
exports.providerCacheWindow = providerCacheWindow;
exports.cacheUsageKnown = cacheUsageKnown;
exports.preserveProviderCacheHistory = preserveProviderCacheHistory;
exports.priorProviderCacheCompletion = priorProviderCacheCompletion;
exports.rememberProviderCacheCompletion = rememberProviderCacheCompletion;
exports.commitProviderCacheCompletion = commitProviderCacheCompletion;
/** Shared logical-window selection. Retain every billed physical attempt. */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const runtime_paths_1 = require("../core/runtime-paths");
const atomic_json_file_1 = require("../core/atomic-json-file");
const completionFile = (input, plan) => path.join(runtime_paths_1.CCM_DIR, 'provider-context-cache', 'completed-attempts', (0, crypto_1.createHash)('sha256').update(JSON.stringify([plan.scope, plan.scopeId, plan.sessionId, input.requestAttemptId || plan.requestId])).digest('hex') + '.json');
function providerCacheWindow(rows, size = Number.MAX_SAFE_INTEGER) {
    const physical = new Map();
    const ids = new WeakMap();
    const time = (row) => String(row.completedAt || row.at || row.startedAt || '');
    for (const [index, row] of rows.entries()) {
        if (row.status && !['completed', 'succeeded', 'failed', 'cancelled'].includes(row.status))
            continue;
        const id = String(row.requestAttemptId || row.physicalRequestId || row.requestKey || row.requestId || `anonymous:${index}`);
        ids.set(row, id);
        const prior = physical.get(id);
        if (!prior || time(row) >= time(prior))
            physical.set(id, row);
    }
    const ordered = [...physical.values()].sort((a, b) => time(a).localeCompare(time(b)) || Number(a.attempt || 0) - Number(b.attempt || 0));
    const logical = new Map();
    const key = (row) => String(row.logicalCallId || ids.get(row));
    for (const row of ordered) {
        const prior = logical.get(key(row));
        // Completion arrival order can differ from retry order. An older attempt
        // settling late must never become the logical call's final outcome.
        if (!prior || Number(row.attempt || 1) >= Number(prior.attempt || 1))
            logical.set(key(row), row);
    }
    const latest = [...logical.values()].sort((a, b) => time(a).localeCompare(time(b))).slice(-size);
    const selected = new Set(latest.map(key));
    return { logical: latest, physical: ordered.filter(row => selected.has(key(row))) };
}
function cacheUsageKnown(row) {
    const explicit = row.cache_usage_reported ?? row.cacheUsageReported;
    return explicit != null ? explicit === true : Number(row.cacheReadInputTokens ?? row.cacheReadTokens) > 0;
}
/** Preparation owns the current plan; completion owns accumulated evidence. */
function preserveProviderCacheHistory(previous) {
    return {
        cacheWarmState: previous?.cacheWarmState,
        providerRoutingMissStreak: previous?.providerRoutingMissStreak,
        tokenCalibration: previous?.tokenCalibration,
        ...(previous?.rollingMetrics ? { rollingMetrics: previous.rollingMetrics } : {}),
        ...(previous?.completedPhysicalRequests ? { completedPhysicalRequests: previous.completedPhysicalRequests } : {}),
    };
}
function priorProviderCacheCompletion(state, input, plan) {
    const id = String(input.requestAttemptId || plan.requestId);
    const recent = state?.completedPhysicalRequests?.find((row) => row.id === id);
    if (recent?.receipt)
        return recent;
    try {
        const persisted = JSON.parse(fs.readFileSync(completionFile(input, plan), 'utf8'));
        // A prepared journal is not evidence that session totals were committed.
        if (persisted.schema === 'ccm-cache-completed-attempt-v1' && persisted.id === id
            && (persisted.committed !== false || recent))
            return persisted;
    }
    catch { }
    return null;
}
function rememberProviderCacheCompletion(state, completion, input, plan) {
    const id = String(input.requestAttemptId || plan.requestId);
    // Keep historical idempotency durable without expanding the hot session
    // state by fifty copies of its request plans and trend windows.
    const file = completionFile(input, plan);
    // Before dropping an old committed session id, seal any journal whose final
    // marker was interrupted after the state write. That state is our evidence.
    if (state?.completedPhysicalRequests?.length >= 50) {
        commitProviderCacheCompletion({ requestAttemptId: state.completedPhysicalRequests[0].id }, plan);
    }
    let receiptFallback = {};
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        (0, atomic_json_file_1.writeJsonAtomic)(file, { schema: 'ccm-cache-completed-attempt-v1', id, committed: false, receipt: completion, contentStored: false });
    }
    catch {
        // Diagnostic disk failures must not discard a successful model response.
        receiptFallback = { receipt: completion };
    }
    return [...(state?.completedPhysicalRequests || []).filter((row) => row.id !== id), {
            id, ...receiptFallback,
        }].slice(-50);
}
function commitProviderCacheCompletion(input, plan) {
    try {
        const file = completionFile(input, plan);
        const prepared = JSON.parse(fs.readFileSync(file, 'utf8'));
        (0, atomic_json_file_1.writeJsonAtomic)(file, { ...prepared, committed: true });
    }
    catch { }
}
//# sourceMappingURL=provider-cache-window.js.map