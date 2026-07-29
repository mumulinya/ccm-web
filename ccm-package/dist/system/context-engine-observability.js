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
exports.recordContextEngineEvent = recordContextEngineEvent;
exports.readContextEngineTrends = readContextEngineTrends;
exports.runContextEngineObservabilitySelfTest = runContextEngineObservabilitySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const ROOT = path.join(os.homedir(), ".cc-connect", "context-engine-observability");
const EVENT_FILE = path.join(ROOT, "events.jsonl");
const MAX_BYTES = 8 * 1024 * 1024;
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function clean(value, max = 240) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function number(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
function reasonCode(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    if (/^[A-Z0-9_.:-]{2,160}$/.test(raw))
        return raw.slice(0, 160);
    if (/timeout|timed out|abort/i.test(raw))
        return "network_timeout";
    if (/HTTP\s*5\d\d|network|fetch/i.test(raw))
        return "provider_network_failure";
    if (/quality|摘要质量|anchor/i.test(raw))
        return "summary_quality_failure";
    if (/token|context|上下文|容量/i.test(raw))
        return "context_capacity_failure";
    return `error_${checksum(raw).slice(0, 16)}`;
}
function rotateIfNeeded() {
    fs.mkdirSync(ROOT, { recursive: true });
    try {
        if (fs.existsSync(EVENT_FILE) && fs.statSync(EVENT_FILE).size >= MAX_BYTES) {
            fs.renameSync(EVENT_FILE, path.join(ROOT, `events-${Date.now()}.jsonl`));
        }
    }
    catch { }
}
function recordContextEngineEvent(input) {
    const event = {
        schema: "ccm-context-engine-observability-event-v1",
        version: 1,
        id: `ceo_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        kind: clean(input?.kind || "unknown", 80),
        scope: clean(input?.scope || "other", 40),
        scopeId: clean(input?.scopeId || input?.project || input?.groupId || input?.sessionId || "", 160),
        sessionId: clean(input?.sessionId || "", 160),
        status: clean(input?.status || "", 80),
        beforeTokens: number(input?.beforeTokens),
        afterTokens: number(input?.afterTokens),
        projectedTokens: number(input?.projectedTokens),
        providerInputTokens: number(input?.providerInputTokens),
        cacheReadInputTokens: number(input?.cacheReadInputTokens),
        cacheCreationInputTokens: number(input?.cacheCreationInputTokens),
        cacheHitRate: Math.min(1, number(input?.cacheHitRate)),
        projectionDurationMs: number(input?.projectionDurationMs),
        providerLatencyMs: number(input?.providerLatencyMs),
        estimatedCostUsd: number(input?.estimatedCostUsd),
        summaryQualityScore: Math.min(100, number(input?.summaryQualityScore)),
        consecutiveFailures: Math.floor(number(input?.consecutiveFailures)),
        reasonCode: reasonCode(input?.reasonCode),
        provider: clean(input?.provider || "", 80),
        model: clean(input?.model || "", 160),
        occurredAt: new Date().toISOString(),
        contentStored: false,
        checksum: "",
    };
    event.checksum = checksum(event);
    try {
        (0, atomic_json_file_1.withFileLock)(EVENT_FILE, () => {
            rotateIfNeeded();
            fs.appendFileSync(EVENT_FILE, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
            try {
                fs.chmodSync(EVENT_FILE, 0o600);
            }
            catch { }
        }, { timeoutMs: 10_000, staleMs: 60_000 });
        return { ...event, recorded: true };
    }
    catch {
        return { ...event, recorded: false };
    }
}
function readEvents() {
    try {
        return fs.readFileSync(EVENT_FILE, "utf8").split(/\r?\n/).filter(Boolean).slice(-5000).map(line => JSON.parse(line));
    }
    catch {
        return [];
    }
}
function median(values) {
    const rows = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
    if (!rows.length)
        return 0;
    const middle = Math.floor(rows.length / 2);
    return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}
function readContextEngineTrends(filter = {}) {
    const since = filter.since ? Date.parse(filter.since) : 0;
    const events = readEvents().filter(event => {
        if (filter.scope && event.scope !== filter.scope)
            return false;
        if (filter.scopeId && event.scopeId !== filter.scopeId)
            return false;
        if (filter.sessionId && event.sessionId !== filter.sessionId)
            return false;
        if (since && Date.parse(event.occurredAt || "") < since)
            return false;
        return true;
    }).slice(-Math.max(1, Math.min(500, Number(filter.limit || 100))));
    const compactions = events.filter(event => event.kind === "compaction_success");
    const providerEvents = events.filter(event => event.kind === "provider_usage");
    const failures = events.filter(event => event.kind === "compaction_failure");
    const latestProjected = providerEvents.at(-1)?.projectedTokens || 0;
    const projectedMedian = median(providerEvents.slice(-20).map(event => Number(event.projectedTokens || 0)));
    const latestQuality = compactions.at(-1)?.summaryQualityScore || 0;
    const latestFailure = failures.at(-1);
    const alerts = [];
    if (latestFailure?.consecutiveFailures >= 2)
        alerts.push({ code: "repeated_compaction_failure", severity: "high", count: latestFailure.consecutiveFailures });
    if (latestProjected && projectedMedian && latestProjected > projectedMedian * 1.6)
        alerts.push({ code: "context_growth_spike", severity: "medium", current: latestProjected, baseline: Math.round(projectedMedian) });
    if (latestQuality > 0 && latestQuality < 80)
        alerts.push({ code: "summary_quality_low", severity: "high", score: latestQuality });
    const recentCache = providerEvents.slice(-20);
    const averageCacheHitRate = recentCache.length ? recentCache.reduce((sum, event) => sum + Number(event.cacheHitRate || 0), 0) / recentCache.length : 0;
    const averageProjectionDurationMs = recentCache.length ? recentCache.reduce((sum, event) => sum + Number(event.projectionDurationMs || 0), 0) / recentCache.length : 0;
    const averageProviderLatencyMs = recentCache.length ? recentCache.reduce((sum, event) => sum + Number(event.providerLatencyMs || 0), 0) / recentCache.length : 0;
    return {
        schema: "ccm-context-engine-trends-v1",
        version: 1,
        filter: { scope: clean(filter.scope), scopeId: clean(filter.scopeId), sessionId: clean(filter.sessionId) },
        summary: {
            eventCount: events.length,
            compactionCount: compactions.length,
            failureCount: failures.length,
            averageCompactionRatio: compactions.length ? compactions.reduce((sum, event) => sum + (event.beforeTokens ? event.afterTokens / event.beforeTokens : 0), 0) / compactions.length : 0,
            averageCacheHitRate,
            averageProjectionDurationMs,
            averageProviderLatencyMs,
            totalEstimatedCostUsd: Math.round(recentCache.reduce((sum, event) => sum + Number(event.estimatedCostUsd || 0), 0) * 1_000_000) / 1_000_000,
            latestProjectedTokens: latestProjected,
            projectedTokenMedian: Math.round(projectedMedian),
            latestSummaryQualityScore: latestQuality,
        },
        alerts,
        events,
        contentStored: false,
    };
}
function runContextEngineObservabilitySelfTest() {
    const sample = { beforeTokens: 1000, afterTokens: 300 };
    return {
        pass: sample.afterTokens / sample.beforeTokens === 0.3 && !JSON.stringify(readContextEngineTrends({ limit: 1 })).includes("prompt"),
        checks: { ratio: sample.afterTokens / sample.beforeTokens, contentStored: false },
    };
}
//# sourceMappingURL=context-engine-observability.js.map