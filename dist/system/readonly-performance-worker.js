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
const worker_threads_1 = require("worker_threads");
const childProcess = __importStar(require("child_process"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const conversation_history_page_1 = require("./conversation-history-page");
const task_run_record_1 = require("../modules/collaboration/task-run-record");
const readonly_document_parser_1 = require("./readonly-document-parser");
const project_source_worker_1 = require("../modules/projects/project-source-worker");
const sourceJobs = new Map();
const jsonCache = new Map();
const JSON_CACHE_BYTES = 16 * 1024 * 1024;
function git(root, args) {
    return childProcess.execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8', windowsHide: true, timeout: 15_000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
}
worker_threads_1.parentPort?.on('message', async (input) => {
    if (input.type === 'cancel-project-source') {
        const job = sourceJobs.get(input.operationId);
        if (job)
            job.cancelled = true;
        return;
    }
    try {
        if (input.type === 'project-source') {
            const job = { cancelled: false };
            sourceJobs.set(input.id, job);
            try {
                worker_threads_1.parentPort?.postMessage({ id: input.id, result: await (0, project_source_worker_1.executeProjectSourceOperation)(input, () => job.cancelled) });
            }
            finally {
                sourceJobs.delete(input.id);
            }
            return;
        }
        if (input.type === 'pdf-document' || input.type === 'vision-file') {
            worker_threads_1.parentPort?.postMessage({ id: input.id, result: await (0, readonly_document_parser_1.prepareReadonlyDocument)(input) });
            return;
        }
        if (input.type === 'file-fingerprint') {
            const descriptor = fs.openSync(input.file, 'r');
            try {
                const before = fs.fstatSync(descriptor);
                if (!before.isFile())
                    throw new Error('fingerprint_source_invalid');
                const version = (stat) => `${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
                const hash = crypto.createHash('sha256'), chunk = Buffer.allocUnsafe(256 * 1024);
                let count;
                while ((count = fs.readSync(descriptor, chunk, 0, chunk.length, null)) > 0)
                    hash.update(chunk.subarray(0, count));
                if (version(before) !== version(fs.fstatSync(descriptor)) || version(before) !== version(fs.statSync(input.file)))
                    throw new Error('fingerprint_source_changed');
                worker_threads_1.parentPort?.postMessage({ id: input.id, result: { checksum: hash.digest('hex'), size: before.size, sourceVersion: version(before) } });
            }
            finally {
                fs.closeSync(descriptor);
            }
            return;
        }
        if (input.type === 'task-run-summary') {
            if (!fs.existsSync(input.file)) {
                worker_threads_1.parentPort?.postMessage({ id: input.id, result: { sourceVersion: 'absent', runs: [] } });
                return;
            }
            const before = fs.statSync(input.file);
            const version = `${before.dev}:${before.ino}:${before.mtimeMs}:${before.ctimeMs}:${before.size}`;
            let cached = jsonCache.get(input.file);
            if (!cached || cached.version !== version || Date.now() - cached.at > 5000) {
                const parsed = JSON.parse(fs.readFileSync(input.file, 'utf8'));
                const rows = Array.isArray(parsed) ? parsed : parsed?.runs;
                const summaries = (Array.isArray(rows) ? rows : []).flatMap(raw => {
                    const row = (0, task_run_record_1.normalizeRecord)(raw);
                    if (!row)
                        return [];
                    const { execution_evidence, history, lease, ...summary } = row;
                    return [{ ...summary, evidence_count: execution_evidence.length }];
                }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
                const bytes = Buffer.byteLength(JSON.stringify(summaries));
                cached = { version, at: Date.now(), bytes, data: summaries };
                jsonCache.delete(input.file);
                while (jsonCache.size && (jsonCache.size >= 8 || [...jsonCache.values()].reduce((sum, item) => sum + item.bytes, 0) + bytes > JSON_CACHE_BYTES))
                    jsonCache.delete(jsonCache.keys().next().value);
                if (bytes <= JSON_CACHE_BYTES)
                    jsonCache.set(input.file, cached);
            }
            const after = fs.statSync(input.file);
            if (`${after.dev}:${after.ino}:${after.mtimeMs}:${after.ctimeMs}:${after.size}` !== version)
                throw new Error('task_run_source_changed');
            const selected = input.taskIds ? new Set(input.taskIds) : null;
            const runs = cached.data.flatMap(row => {
                if (selected && !selected.has(row.task_id))
                    return [];
                if (!selected)
                    return [{ run_id: row.run_id, task_id: row.task_id, status: row.status, updated_at: row.updated_at }];
                return [row];
            });
            worker_threads_1.parentPort?.postMessage({ id: input.id, result: { sourceVersion: version, runs } });
            return;
        }
        if (input.type === 'conversation-json-page') {
            const before = fs.statSync(input.file);
            if (!before.isFile() || before.size > 64 * 1024 * 1024)
                throw new Error('history_file_size_exceeded');
            const version = `${before.dev}:${before.ino}:${before.mtimeMs}:${before.ctimeMs}:${before.size}`;
            let cached = jsonCache.get(input.file);
            if (!cached || cached.version !== version || Date.now() - cached.at > 5000) {
                cached = { version, at: Date.now(), bytes: before.size, data: JSON.parse(fs.readFileSync(input.file, 'utf8')) };
                jsonCache.delete(input.file);
                while (jsonCache.size && (jsonCache.size >= 8 || [...jsonCache.values()].reduce((sum, item) => sum + item.bytes, 0) + before.size > JSON_CACHE_BYTES)) {
                    jsonCache.delete(jsonCache.keys().next().value);
                }
                if (before.size <= JSON_CACHE_BYTES)
                    jsonCache.set(input.file, cached);
            }
            const after = fs.statSync(input.file);
            if (`${after.dev}:${after.ino}:${after.mtimeMs}:${after.ctimeMs}:${after.size}` !== version)
                throw new Error('history_source_changed');
            worker_threads_1.parentPort?.postMessage({ id: input.id, result: { sourceVersion: version, page: (0, conversation_history_page_1.projectGlobalHistoryPage)(cached.data, input.query) } });
            return;
        }
        if (input.type !== 'git-evidence')
            throw new Error('readonly_worker_operation_invalid');
        let root, repositoryRoot;
        try {
            root = fs.realpathSync(path.resolve(input.root));
            repositoryRoot = git(root, ['rev-parse', '--show-toplevel']);
        }
        catch {
            worker_threads_1.parentPort?.postMessage({ id: input.id, result: null });
            return;
        }
        const headCommit = git(root, ['rev-parse', 'HEAD']);
        const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
        const diff = `${git(root, ['diff', '--no-ext-diff', '--binary', 'HEAD'])}\n${git(root, ['diff', '--cached', '--no-ext-diff', '--binary'])}`;
        if (headCommit !== git(root, ['rev-parse', 'HEAD']) || status !== git(root, ['status', '--porcelain=v1', '--untracked-files=all'])) {
            throw new Error('workspace_changed_during_evidence_collection');
        }
        const verifiedDiff = `${git(root, ['diff', '--no-ext-diff', '--binary', 'HEAD'])}\n${git(root, ['diff', '--cached', '--no-ext-diff', '--binary'])}`;
        if (verifiedDiff !== diff || fs.realpathSync(path.resolve(input.root)) !== root)
            throw new Error('workspace_changed_during_evidence_collection');
        const result = { repositoryRoot, headCommit, changedFiles: status.split(/\r?\n/).map(line => line.slice(3).trim()).filter(Boolean).slice(0, 500),
            diffChecksum: crypto.createHash('sha256').update(JSON.stringify(diff)).digest('hex'), capturedAt: new Date().toISOString() };
        worker_threads_1.parentPort?.postMessage({ id: input.id, result });
    }
    catch (error) {
        worker_threads_1.parentPort?.postMessage({ id: input.id, error: input.type === 'project-source' ? (String(error?.message || '').match(/^SOURCE_[A-Z_]+$/)?.[0] || 'SOURCE_READ_FAILED') : String(error?.message || 'readonly_worker_failed').slice(0, 500) });
    }
});
//# sourceMappingURL=readonly-performance-worker.js.map