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
exports.startStorageIndexScan = startStorageIndexScan;
exports.getStorageIndexStatus = getStorageIndexStatus;
exports.startStorageIndexScheduler = startStorageIndexScheduler;
exports.stopStorageIndexScheduler = stopStorageIndexScheduler;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const observability_database_1 = require("./observability-database");
const categories = {
    executions: path.join(utils_1.CCM_DIR, "execution-kernel", "executions"),
    checkpoints: path.join(utils_1.CCM_DIR, "execution-kernel", "checkpoints"),
    outputs: path.join(utils_1.CCM_DIR, "execution-kernel", "outputs"),
    projectSessions: path.join(utils_1.CCM_DIR, "web-sessions"),
    groupMessages: utils_1.GROUP_MESSAGES_DIR,
    testArtifacts: path.join(utils_1.CCM_DIR, "test-agent-artifacts"),
    testRuns: path.join(utils_1.CCM_DIR, "test-agent-runs"),
    replay: path.join(utils_1.CCM_DIR, "reliability", "task-replay-journal"),
    uploads: utils_1.UPLOAD_DIR,
};
let scheduler = null;
function now() { return new Date().toISOString(); }
function parse(value, fallback) { try {
    return value ? JSON.parse(String(value)) : fallback;
}
catch {
    return fallback;
} }
async function scanRoot(root) {
    const result = { files: 0, bytes: 0, errors: 0, skipped_links: 0 };
    const rootResolved = path.resolve(root);
    const queue = [rootResolved];
    while (queue.length) {
        const entry = queue.shift();
        try {
            const stat = await fs.lstat(entry);
            if (stat.isSymbolicLink()) {
                result.skipped_links += 1;
                continue;
            }
            const real = await fs.realpath(entry);
            const relative = path.relative(rootResolved, real);
            if (relative.startsWith("..") || path.isAbsolute(relative)) {
                result.skipped_links += 1;
                continue;
            }
            if (stat.isFile()) {
                result.files += 1;
                result.bytes += stat.size;
                continue;
            }
            if (!stat.isDirectory())
                continue;
            const children = await fs.readdir(entry);
            for (const child of children)
                queue.push(path.join(entry, child));
        }
        catch (error) {
            if (error?.code !== "ENOENT")
                result.errors += 1;
        }
    }
    return result;
}
async function buildGeneration(generation) {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const summary = {};
    const names = Object.keys(categories);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(3, names.length) }, async () => {
        while (cursor < names.length) {
            const index = cursor++;
            const name = names[index];
            summary[name] = await scanRoot(categories[name]);
            db.prepare("UPDATE storage_index_snapshots_v2 SET progress_json=?,updated_at=? WHERE generation=?")
                .run(JSON.stringify({ completed: Object.keys(summary).length, total: names.length, current: name }), now(), generation);
        }
    });
    try {
        await Promise.all(workers);
        const totalBytes = Object.values(summary).reduce((sum, item) => sum + item.bytes, 0);
        const completed = now();
        (0, observability_database_1.withImmediateObservabilityTransaction)((tx) => {
            tx.prepare("UPDATE storage_index_snapshots_v2 SET active=0 WHERE active=1").run();
            tx.prepare("UPDATE storage_index_snapshots_v2 SET status='completed',active=1,summary_json=?,progress_json=?,completed_at=?,updated_at=? WHERE generation=?")
                .run(JSON.stringify({ ...summary, totalBytes }), JSON.stringify({ completed: names.length, total: names.length }), completed, completed, generation);
        });
    }
    catch (error) {
        db.prepare("UPDATE storage_index_snapshots_v2 SET status='failed',error_summary=?,updated_at=? WHERE generation=?")
            .run(String(error?.message || error).slice(0, 1000), now(), generation);
    }
}
function startStorageIndexScan(options = {}) {
    return (0, observability_database_1.withImmediateObservabilityTransaction)((db) => {
        const building = db.prepare("SELECT generation FROM storage_index_snapshots_v2 WHERE status='building' LIMIT 1").get();
        if (building)
            return { accepted: false, generation: building.generation, reason: "already_building" };
        const active = db.prepare("SELECT completed_at FROM storage_index_snapshots_v2 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get();
        if (!options.force && active?.completed_at && Date.now() - Date.parse(active.completed_at) < 30 * 60_000) {
            return { accepted: false, reason: "fresh" };
        }
        const generation = `storage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const created = now();
        db.prepare("INSERT INTO storage_index_snapshots_v2(generation,status,created_at,updated_at,progress_json,active) VALUES(?,'building',?,?,?,0)")
            .run(generation, created, created, JSON.stringify({ completed: 0, total: Object.keys(categories).length }));
        setImmediate(() => void buildGeneration(generation));
        return { accepted: true, generation };
    });
}
function getStorageIndexStatus() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const active = db.prepare("SELECT * FROM storage_index_snapshots_v2 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get();
    const building = db.prepare("SELECT * FROM storage_index_snapshots_v2 WHERE status='building' ORDER BY created_at DESC LIMIT 1").get();
    const row = building || active;
    return {
        schema: "ccm-storage-index-snapshot-v2",
        status: building ? "index_building" : (active ? "ready" : "index_missing"),
        generation: row?.generation || "",
        active_generation: active?.generation || "",
        scanned_at: active?.completed_at || null,
        stale: !!active?.completed_at && Date.now() - Date.parse(active.completed_at) > 60 * 60_000,
        progress: parse(building?.progress_json, null),
        summary: parse(active?.summary_json, null),
        error: row?.error_summary || "",
    };
}
function startStorageIndexScheduler() {
    startStorageIndexScan();
    if (scheduler)
        clearInterval(scheduler);
    scheduler = setInterval(() => startStorageIndexScan(), 30 * 60_000);
    scheduler.unref?.();
}
function stopStorageIndexScheduler() {
    if (scheduler)
        clearInterval(scheduler);
    scheduler = null;
}
//# sourceMappingURL=storage-index.js.map