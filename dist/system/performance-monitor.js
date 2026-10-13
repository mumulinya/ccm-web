"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRoute = performanceRoute;
exports.recordPerformance = recordPerformance;
exports.measurePerformance = measurePerformance;
exports.measureAsyncPerformance = measureAsyncPerformance;
exports.markPerformanceReady = markPerformanceReady;
exports.startPerformanceMonitor = startPerformanceMonitor;
exports.stopPerformanceMonitor = stopPerformanceMonitor;
exports.trackHttpPerformance = trackHttpPerformance;
exports.performanceSnapshot = performanceSnapshot;
const perf_hooks_1 = require("perf_hooks");
const buckets = new Map();
const MAX_BUCKETS = 200;
const MAX_SAMPLES = 256;
const jobs = new Map();
const loop = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 20 });
let timer = null;
let activeRequests = 0;
let lastCpu = process.cpuUsage();
let lastAt = perf_hooks_1.performance.now();
let lastLoop = perf_hooks_1.performance.eventLoopUtilization();
let system = null;
const readiness = {};
const origin = perf_hooks_1.performance.now();
// Only known routes are retained. Arbitrary segments, identities and query
// strings are never keys in the bounded telemetry store.
function performanceRoute(method, raw) {
    const pathname = String(raw || '').split('?')[0];
    const safe = pathname === '/' ? '/' : pathname.startsWith('/assets/') ? '/assets/:file'
        : pathname.startsWith('/api/') ? pathname.split('/').slice(0, 4).map((part, i) => {
            if (i < 2)
                return part;
            return /^(auth|session|sessions|tasks|projects|groups|metrics|events|status|health|runtime|agent-runs|agent-heartbeats|orchestrator|diagnostics|usability|workbench|items|navigation|config|tools|global-agent|history|messages|memory|knowledge|rag|music|pets|list|budget|budgets)$/.test(part) ? part : ':resource';
        }).join('/') : '/static';
    return `${String(method || 'GET').slice(0, 12)} ${safe}`;
}
function recordPerformance(name, ms, bytes = 0) {
    if (!buckets.has(name) && buckets.size >= MAX_BUCKETS)
        name = 'other';
    const row = buckets.get(name) || { count: 0, totalMs: 0, maxMs: 0, bytes: 0, samples: [], slow: 0 };
    row.count++;
    row.totalMs += ms;
    row.maxMs = Math.max(row.maxMs, ms);
    row.bytes += bytes;
    if (ms >= 500)
        row.slow++;
    row.samples.push(ms);
    if (row.samples.length > MAX_SAMPLES)
        row.samples.shift();
    buckets.set(name, row);
}
function measurePerformance(name, operation) {
    const start = perf_hooks_1.performance.now();
    try {
        return operation();
    }
    finally {
        recordPerformance(name, perf_hooks_1.performance.now() - start);
    }
}
async function measureAsyncPerformance(name, operation) {
    const start = perf_hooks_1.performance.now();
    jobs.set(name, (jobs.get(name) || 0) + 1);
    try {
        return await operation();
    }
    finally {
        const remaining = (jobs.get(name) || 1) - 1;
        if (remaining)
            jobs.set(name, remaining);
        else
            jobs.delete(name);
        recordPerformance(name, perf_hooks_1.performance.now() - start);
    }
}
function markPerformanceReady(kind) { readiness[kind] = perf_hooks_1.performance.now() - origin; }
function sample() {
    const now = perf_hooks_1.performance.now(), cpu = process.cpuUsage(lastCpu), utilization = perf_hooks_1.performance.eventLoopUtilization(lastLoop);
    system = { sampledAt: new Date().toISOString(), cpuOneCorePercent: (cpu.user + cpu.system) / Math.max(1, (now - lastAt) * 1000) * 100,
        ...process.memoryUsage(), resources: process.getActiveResourcesInfo().reduce((counts, kind) => ({ ...counts, [kind]: (counts[kind] || 0) + 1 }), {}),
        eventLoop: { utilization: utilization.utilization, p95Ms: loop.percentile(95) / 1e6, p99Ms: loop.percentile(99) / 1e6, maxMs: loop.max / 1e6 } };
    lastCpu = process.cpuUsage();
    lastAt = now;
    lastLoop = perf_hooks_1.performance.eventLoopUtilization();
    loop.reset();
}
function startPerformanceMonitor() {
    if (timer)
        return;
    loop.enable();
    sample();
    timer = setInterval(sample, 10_000);
    timer.unref();
}
function stopPerformanceMonitor() { if (timer)
    clearInterval(timer); timer = null; loop.disable(); }
function trackHttpPerformance(req, res) {
    const start = perf_hooks_1.performance.now(), key = performanceRoute(req.method, req.url);
    let bytes = 0;
    const count = (chunk, encoding) => {
        if (typeof chunk === 'string')
            return Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : undefined);
        return chunk?.byteLength || 0;
    };
    const write = res.write, end = res.end;
    res.write = function (chunk, ...args) {
        const result = write.call(this, chunk, ...args);
        bytes += count(chunk, args[0]);
        return result;
    };
    res.end = function (chunk, ...args) {
        const result = end.call(this, chunk, ...args);
        bytes += count(chunk, args[0]);
        return result;
    };
    activeRequests++;
    let ended = false;
    const finish = () => {
        if (ended)
            return;
        ended = true;
        activeRequests--;
        recordPerformance(key, perf_hooks_1.performance.now() - start, bytes);
    };
    res.once('finish', finish);
    res.once('close', finish);
}
function performanceSnapshot() {
    return { schema: 'ccm-performance-v1', sampledSystem: system, activeRequests, readyMs: { ...readiness }, slowRequestMs: 500,
        activeJobs: Object.fromEntries(jobs),
        readonlyWorker: require('./readonly-performance-service').readonlyWorkerSnapshot(),
        sqliteCheckpoint: require('../core/task-store-checkpoint').taskCheckpointSnapshot(),
        sse: require('./bounded-sse').boundedSseSnapshot(),
        conversationJournal: require('../agents/conversation-event-journal').conversationEventJournalSnapshot(),
        routes: [...buckets].map(([name, row]) => {
            const sorted = [...row.samples].sort((a, b) => a - b);
            const percentile = (p) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] || 0;
            return { name, count: row.count, meanMs: row.totalMs / row.count, maxMs: row.maxMs, bytes: row.bytes,
                p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), sampleCount: sorted.length, slow: row.slow };
        }) };
}
//# sourceMappingURL=performance-monitor.js.map