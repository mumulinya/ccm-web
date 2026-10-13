"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRunReadSourceVersion = taskRunReadSourceVersion;
exports.readCachedTaskRunIndex = readCachedTaskRunIndex;
exports.cacheTaskRunReadIndex = cacheTaskRunReadIndex;
exports.clearTaskRunReadIndexCache = clearTaskRunReadIndexCache;
const fs_1 = require("fs");
const entries = new Map();
const MAX_BYTES = 8 * 1024 * 1024;
const TTL_MS = 5000;
// This contains only list index fields. Authorization and lifecycle decisions
// remain the caller's responsibility; no permission result is stored here.
async function taskRunReadSourceVersion(file) {
    try {
        const stat = await fs_1.promises.stat(file);
        return `${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    }
    catch (error) {
        if (error?.code === 'ENOENT')
            return 'absent';
        throw error;
    }
}
async function readCachedTaskRunIndex(file) {
    const entry = entries.get(file);
    if (!entry)
        return null;
    if (Date.now() - entry.at >= TTL_MS || entry.version !== await taskRunReadSourceVersion(file)) {
        entries.delete(file);
        return null;
    }
    return entry.value;
}
function cacheTaskRunReadIndex(file, result) {
    const runs = result.runs.map((row) => Object.freeze({
        run_id: row.run_id, task_id: row.task_id, status: row.status, updated_at: row.updated_at,
    }));
    const bytes = runs.reduce((size, row) => size + 128 +
        Buffer.byteLength(`${row.run_id}${row.task_id}${row.status}${row.updated_at}`), 0);
    if (bytes > MAX_BYTES)
        return Object.freeze({ sourceVersion: result.sourceVersion, runs: Object.freeze(runs) });
    entries.delete(file);
    while (entries.size && (entries.size >= 8 || [...entries.values()].reduce((n, entry) => n + entry.bytes, 0) + bytes > MAX_BYTES)) {
        entries.delete(entries.keys().next().value);
    }
    const value = Object.freeze({ sourceVersion: result.sourceVersion, runs: Object.freeze(runs) });
    entries.set(file, { version: result.sourceVersion, at: Date.now(), bytes, value });
    return value;
}
function clearTaskRunReadIndexCache() { entries.clear(); }
//# sourceMappingURL=task-run-read-index-cache.js.map