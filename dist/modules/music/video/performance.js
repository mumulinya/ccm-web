"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoTiming = videoTiming;
exports.videoPerformance = videoPerformance;
const samples = [];
function videoTiming(stage, provider, start, hit = false) {
    if (!/^[a-z_]{1,40}$/.test(stage) || !['bilibili', 'douyin', 'local', 'netease', 'video'].includes(provider))
        return;
    samples.push({ stage, provider, ms: Math.max(0, Date.now() - start), hit, at: Date.now() });
    if (samples.length > 1024)
        samples.splice(0, samples.length - 1024);
}
function videoPerformance() {
    const groups = new Map();
    for (const sample of samples) {
        const key = `${sample.provider}:${sample.stage}:${sample.hit ? 'warm' : 'cold'}`;
        const rows = groups.get(key) || [];
        rows.push(sample.ms);
        groups.set(key, rows);
    }
    return [...groups].map(([key, rows]) => { rows.sort((a, b) => a - b); return { key, count: rows.length, p50: rows[Math.floor((rows.length - 1) * .5)], p95: rows[Math.ceil(rows.length * .95) - 1] }; });
}
//# sourceMappingURL=performance.js.map