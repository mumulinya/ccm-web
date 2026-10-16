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
exports.taskCheckpointSnapshot = taskCheckpointSnapshot;
exports.checkpointTaskStoreAsync = checkpointTaskStoreAsync;
exports.startTaskStoreCheckpoints = startTaskStoreCheckpoints;
exports.stopTaskStoreCheckpoints = stopTaskStoreCheckpoints;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const task_store_1 = require("./task-store");
const performance_monitor_1 = require("../system/performance-monitor");
const observability_database_1 = require("../system/observability-database");
let timer = null, child = null;
let running = null;
let completed = 0, failures = 0;
let lastVersion = '';
function version() {
    return (0, task_store_1.withSqliteTaskStore)(db => `${db.pragma('data_version', { simple: true })}:${db.prepare('SELECT total_changes() n').get().n}:${(0, observability_database_1.getObservabilityDatabase)().prepare('SELECT total_changes() n').get().n}`);
}
function taskCheckpointSnapshot() { return { active: child ? 1 : 0, completed, failures, mode: 'passive' }; }
// Checkpoint copies committed WAL pages; it never changes business records or
// takes a Task/Run lease. PASSIVE lets readers/writers continue and does not
// force a checkpoint through another connection's snapshot.
function checkpointTaskStoreAsync() {
    if (running)
        return running;
    const currentVersion = version();
    if (lastVersion === currentVersion)
        return Promise.resolve();
    running = (0, performance_monitor_1.measureAsyncPerformance)('db.wal_checkpoint', () => new Promise(resolve => {
        const file = (0, task_store_1.withSqliteTaskStore)(db => db.name);
        const instance = (0, child_process_1.spawn)(process.execPath, [path.join(__dirname, 'task-store-checkpoint-process.js'), file], {
            windowsHide: true, stdio: 'ignore', env: { ...process.env },
        });
        child = instance;
        const timeout = setTimeout(() => instance.kill(), 15_000);
        timeout.unref();
        let settled = false;
        const finish = (success) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            if (child === instance)
                child = null;
            if (success) {
                completed++;
                lastVersion = currentVersion;
            }
            else
                failures++;
            resolve();
        };
        instance.once('error', () => finish(false));
        instance.once('exit', code => finish(code === 0));
    })).finally(() => { running = null; });
    return running;
}
function startTaskStoreCheckpoints() {
    if (timer)
        return;
    // Both server connections share the same WAL. CLI/legacy callers retain
    // SQLite's existing automatic policy; unchanged idle stores spawn no helper.
    (0, task_store_1.withSqliteTaskStore)(db => db.pragma('wal_autocheckpoint = 0'));
    (0, observability_database_1.getObservabilityDatabase)().pragma('wal_autocheckpoint = 0');
    lastVersion = '';
    // Keep the first maintenance pass on the normal interval, so spawning the
    // helper does not compete with recovery and the first interactive reads.
    timer = setInterval(() => void checkpointTaskStoreAsync(), 5000);
    timer.unref();
}
function stopTaskStoreCheckpoints() {
    if (timer)
        clearInterval(timer);
    timer = null;
    child?.kill();
    child = null;
    (0, task_store_1.withSqliteTaskStore)(db => db.pragma('wal_autocheckpoint = 1000'));
    (0, observability_database_1.getObservabilityDatabase)().pragma('wal_autocheckpoint = 1000');
}
process.once('exit', () => { if (timer)
    clearInterval(timer); child?.kill(); });
//# sourceMappingURL=task-store-checkpoint.js.map