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
exports.readonlyWorkerSnapshot = readonlyWorkerSnapshot;
exports.stopReadonlyPerformanceWorker = stopReadonlyPerformanceWorker;
exports.readProjectSourcesOffThread = readProjectSourcesOffThread;
exports.collectGitEvidenceOffThread = collectGitEvidenceOffThread;
exports.readConversationJsonPageOffThread = readConversationJsonPageOffThread;
exports.fingerprintFileOffThread = fingerprintFileOffThread;
exports.parsePdfOffThread = parsePdfOffThread;
exports.prepareVisionFileOffThread = prepareVisionFileOffThread;
exports.readTaskRunSummaryOffThread = readTaskRunSummaryOffThread;
const worker_threads_1 = require("worker_threads");
const path = __importStar(require("path"));
const performance_monitor_1 = require("./performance-monitor");
const task_run_read_index_cache_1 = require("./task-run-read-index-cache");
let worker = null;
let sequence = 0;
let idle = null;
const pending = new Map();
const summaryReads = new Map();
function reset(error) {
    const previous = worker;
    worker = null;
    if (idle)
        clearTimeout(idle);
    idle = null;
    for (const item of pending.values()) {
        clearTimeout(item.timer);
        item.cleanup?.();
        item.reject(error || new Error('readonly_worker_stopped'));
    }
    pending.clear();
    void previous?.terminate();
}
function readonlyWorkerSnapshot() { return { workers: worker ? 1 : 0, pending: pending.size, capacity: 32 }; }
function stopReadonlyPerformanceWorker() { (0, task_run_read_index_cache_1.clearTaskRunReadIndexCache)(); reset(); }
function readProjectSourcesOffThread(project, root, operation, args = {}, signal) {
    return executeReadonlyOperation('source.' + operation, { type: 'project-source', project, root, operation, args }, signal);
}
function collectGitEvidenceOffThread(root) {
    return executeReadonlyOperation('workspace.git_evidence', { type: 'git-evidence', root });
}
function readConversationJsonPageOffThread(file, query) {
    return executeReadonlyOperation('file.conversation_history_page', { type: 'conversation-json-page', file, query });
}
function fingerprintFileOffThread(file) {
    return executeReadonlyOperation('file.fingerprint', { type: 'file-fingerprint', file });
}
function parsePdfOffThread(source) {
    return executeReadonlyOperation('file.pdf_parse', typeof source === 'string' ? { type: 'pdf-document', file: source } : { type: 'pdf-document', bytes: source });
}
function prepareVisionFileOffThread(file) {
    return executeReadonlyOperation('file.vision_preparation', { type: 'vision-file', file });
}
function readTaskRunSummaryOffThread(file, taskIds) {
    const key = JSON.stringify([file, taskIds || null]);
    const existing = summaryReads.get(key);
    if (existing)
        return existing;
    const operation = (async () => {
        if (!taskIds) {
            const cached = await (0, task_run_read_index_cache_1.readCachedTaskRunIndex)(file);
            if (cached)
                return cached;
        }
        const result = await executeReadonlyOperation('file.task_run_summary', { type: 'task-run-summary', file, taskIds });
        return !taskIds ? (0, task_run_read_index_cache_1.cacheTaskRunReadIndex)(file, result) : result;
    })();
    summaryReads.set(key, operation);
    void operation.finally(() => { if (summaryReads.get(key) === operation)
        summaryReads.delete(key); }).catch(() => { });
    return operation;
}
function executeReadonlyOperation(name, input, signal) {
    return (0, performance_monitor_1.measureAsyncPerformance)(name, () => new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('SOURCE_READ_ABORTED'));
            return;
        }
        if (pending.size >= 32) {
            reject(new Error('readonly_worker_queue_full'));
            return;
        }
        if (idle)
            clearTimeout(idle);
        idle = null;
        if (!worker) {
            const instance = new worker_threads_1.Worker(path.join(__dirname, 'readonly-performance-worker.js'));
            worker = instance;
            instance.on('message', message => {
                if (worker !== instance)
                    return;
                const item = pending.get(message.id);
                if (!item)
                    return;
                pending.delete(message.id);
                clearTimeout(item.timer);
                item.cleanup?.();
                if (message.error)
                    item.reject(new Error(message.error));
                else
                    item.resolve(message.result);
                if (!pending.size) {
                    instance.unref();
                    idle = setTimeout(() => { if (worker === instance && !pending.size)
                        reset(); }, 30_000);
                    idle.unref();
                }
            });
            instance.on('error', error => { if (worker === instance)
                reset(error instanceof Error ? error : new Error('readonly_worker_failed')); });
            instance.on('exit', code => { if (worker === instance)
                reset(new Error(`readonly_worker_exit:${code}`)); });
        }
        const id = ++sequence;
        const timer = setTimeout(() => reset(new Error('readonly_worker_timeout')), 120_000);
        const abort = () => {
            const item = pending.get(id);
            if (!item)
                return;
            pending.delete(id);
            clearTimeout(item.timer);
            item.cleanup?.();
            worker?.postMessage({ type: 'cancel-project-source', operationId: id });
            reject(new Error('SOURCE_READ_ABORTED'));
            if (!pending.size) {
                worker?.unref();
                if (!idle) {
                    idle = setTimeout(() => { if (!pending.size)
                        reset(); }, 30000);
                    idle.unref();
                }
            }
        };
        const cleanup = () => signal?.removeEventListener('abort', abort);
        pending.set(id, { resolve, reject, timer, cleanup });
        signal?.addEventListener('abort', abort, { once: true });
        worker.ref();
        worker.postMessage({ ...input, id });
    }));
}
//# sourceMappingURL=readonly-performance-service.js.map