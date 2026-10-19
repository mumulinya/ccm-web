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
exports.copyDirectoryJob = copyDirectoryJob;
exports.commitDirectoryJob = commitDirectoryJob;
exports.failDirectoryJob = failDirectoryJob;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const runtime_directory_config_1 = require("./runtime-directory-config");
const runtime_directory_job_1 = require("./runtime-directory-job");
const runtime_directory_transfer_1 = require("./runtime-directory-transfer");
const runtime_directory_rebase_1 = require("./runtime-directory-rebase");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function requireJob(id) { const job = (0, runtime_directory_job_1.readJob)(); if (!job || job.id !== id)
    throw new Error('迁移身份不匹配'); return job; }
async function copyDirectoryJob(id) {
    let job = requireJob(id);
    if (!['sealed', 'stopping'].includes(job.status))
        throw new Error('服务尚未封闭新执行，不能复制');
    (0, runtime_directory_job_1.saveJob)({ ...job, workerPid: process.pid, status: 'stopping' });
    const deadline = Date.now() + 30_000;
    const lock = job.lockFile || path.join(job.source, 'run/ccm-server-instance.lock');
    while ((0, runtime_directory_job_1.alive)(Number(job.parentPid)) || fs.existsSync(lock)) {
        if (Date.now() > deadline)
            throw new Error('源服务未退出或实例锁未释放，未复制任何数据');
        await sleep(200);
    }
    const targetOwner = (0, runtime_directory_config_1.readJson)(path.join(job.target, 'run/ccm-server-instance.lock'));
    if (targetOwner && (targetOwner.hostname !== require('os').hostname() || (0, runtime_directory_job_1.alive)(Number(targetOwner.pid))))
        throw new Error('目标数据目录有其他服务正在使用');
    job = requireJob(id);
    if (job.restoreBackup) {
        (0, runtime_directory_transfer_1.validateDirectory)(job.target, job.source, { packageRoot: path.dirname(path.dirname(job.entry)), allowExisting: true });
        (0, runtime_directory_job_1.reserveDirectory)(job.target, job);
        (0, runtime_directory_job_1.saveJob)({ ...job, workerPid: process.pid, status: 'restarting', backup: job.source });
        return;
    }
    const validation = (0, runtime_directory_transfer_1.validateDirectory)(job.target, job.source, { packageRoot: path.dirname(path.dirname(job.entry)) });
    const staging = path.join(path.dirname(validation.target), `.ccm-migration-${id}`);
    if (fs.existsSync(staging))
        throw new Error('迁移临时目录已存在，保留现场以供检查');
    fs.mkdirSync(staging, { mode: 0o700 });
    (0, runtime_directory_job_1.saveJob)({ ...job, workerPid: process.pid, status: 'copying', staging });
    try {
        const copied = await (0, runtime_directory_transfer_1.copyAndVerify)(job.source, staging, (copiedFiles, copiedBytes) => (0, runtime_directory_job_1.saveJob)({ ...requireJob(id), copiedFiles, copiedBytes }));
        const rebased = (0, runtime_directory_rebase_1.rebaseDirectoryReferences)(staging, job.source, job.target);
        const database = path.join(staging, 'ccm.db');
        if (fs.existsSync(database)) {
            const Database = require('better-sqlite3');
            const db = new Database(database);
            try {
                if (db.pragma('quick_check', { simple: true }) !== 'ok')
                    throw new Error('迁移数据库完整性检查失败');
                db.pragma('wal_checkpoint(TRUNCATE)');
            }
            finally {
                db.close();
            }
        }
        // Never replace a nonempty directory, including one changed since validation.
        if (fs.existsSync(job.target)) {
            if (fs.readdirSync(job.target).length)
                throw new Error('目标目录在迁移期间发生变化，未覆盖');
            fs.rmdirSync(job.target);
        }
        fs.renameSync(staging, job.target);
        (0, runtime_directory_job_1.reserveDirectory)(job.target, job);
        (0, runtime_directory_job_1.saveJob)({ ...requireJob(id), status: 'restarting', backup: job.source, rebased, copiedFiles: copied.copiedFiles, copiedBytes: copied.copiedBytes });
    }
    catch (error) {
        // This exact UUID directory was exclusively created above; do not delete user targets.
        if (fs.existsSync(staging) && path.basename(staging) === `.ccm-migration-${id}`)
            fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }
}
function signedHeaders(home, method, route) {
    const timestamp = String(Date.now()), nonce = crypto.randomBytes(18).toString('base64url');
    const secretFile = path.join(home, 'auth/internal-api-secret');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    if (!fs.existsSync(secretFile)) {
        try {
            fs.writeFileSync(secretFile, crypto.randomBytes(48).toString('base64url') + '\n', { flag: 'wx', mode: 0o600 });
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
        }
    }
    const secret = fs.readFileSync(secretFile, 'utf8').trim();
    const signature = crypto.createHmac('sha256', secret).update(['ccm-internal-api-v1', 'ccm-cli', method, route, timestamp, nonce].join('\n')).digest('base64url');
    return { 'X-CCM-Internal-Caller': 'ccm-cli', 'X-CCM-Internal-Timestamp': timestamp, 'X-CCM-Internal-Nonce': nonce, 'X-CCM-Internal-Signature': signature };
}
async function ready(job, directory, pid) {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
        if (pid && !(0, runtime_directory_job_1.alive)(pid))
            throw new Error('新服务启动失败，已保留原目录');
        try {
            const owner = (0, runtime_directory_config_1.readJson)(path.join(directory, 'run/ccm-server-instance.lock'));
            if (!owner || owner.pid !== (pid || owner.pid) || !(0, runtime_directory_transfer_1.samePath)(owner.data_directory, directory) || owner.package_version !== job.version)
                throw new Error('新服务身份不符');
            const host = ['0.0.0.0', '::'].includes(job.host) ? '127.0.0.1' : job.host;
            const route = '/api/internal/lifecycle/ready';
            const response = await fetch(`http://${host.includes(':') ? `[${host}]` : host}:${job.port}${route}`, { headers: signedHeaders(directory, 'GET', route), signal: AbortSignal.timeout(2000) });
            const body = await response.json();
            if (response.ok && body.ready && body.identity_verified && body.identity.instance_id === owner.instance_id && body.identity.token === owner.token)
                return;
        }
        catch { }
        await sleep(500);
    }
    throw new Error('新服务健康检查超时，未切换启动配置');
}
async function commitDirectoryJob(id) {
    const job = requireJob(id);
    if (job.status !== 'restarting')
        throw new Error('新服务尚未准备好');
    await ready(job, job.target);
    const receipt = { schema: 'ccm-runtime-directory-receipt-v1', id, source: job.source, target: job.target, copiedFiles: job.copiedFiles, copiedBytes: job.copiedBytes, completedAt: new Date().toISOString() };
    (0, runtime_directory_config_1.atomicJson)(path.join(path.dirname((0, runtime_directory_config_1.runtimeConfigFile)()), `data-directory-backup-${receipt.completedAt.replace(/[:.]/g, '-')}-${id}.json`), receipt);
    (0, runtime_directory_job_1.saveJob)({ ...job, readyVerifiedAt: receipt.completedAt });
    (0, runtime_directory_job_1.retireDirectory)(job.source, job);
    (0, runtime_directory_config_1.writeDirectoryConfig)(job.target);
    // After the atomic pointer commit, never roll back to a second writable
    // source because a receipt/cleanup write failed. Startup can finish this tail.
    try {
        (0, runtime_directory_job_1.saveJob)({ ...job, ownerToken: '', status: 'completed', backup: job.source, completedAt: receipt.completedAt });
        const preparation = path.join(job.target, 'updates/data-directory-preparation.json');
        if ((0, runtime_directory_config_1.readJson)(preparation)?.owner === `directory:${id}`)
            fs.unlinkSync(preparation);
        (0, runtime_directory_job_1.releaseJob)(id);
    }
    catch (error) {
        console.error(`目录已提交，收尾将在下次启动恢复：${error.message}`);
    }
}
function failDirectoryJob(id, message) {
    const job = requireJob(id);
    const reservation = path.join(job.source, 'run/data-directory-reservation.json');
    if ((0, runtime_directory_config_1.readJson)(reservation)?.id === id && (0, runtime_directory_config_1.readJson)(reservation)?.retiredTo)
        fs.unlinkSync(reservation);
    (0, runtime_directory_job_1.saveJob)({ ...job, ownerToken: '', status: 'failed', error: message, completedAt: new Date().toISOString() });
    (0, runtime_directory_job_1.releaseJob)(id);
}
function spawnService(job, directory) {
    const logFile = path.join(directory, 'logs/data-directory-restart.log');
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const log = fs.openSync(logFile, 'a');
    try {
        const env = { ...process.env, CCM_RUNTIME_CONFIG_FILE: (0, runtime_directory_config_1.runtimeConfigFile)(), CCM_TASK_STORE_DIR: directory,
            CCM_SERVER_LOCK_FILE: path.join(directory, 'run/ccm-server-instance.lock'), CCM_DIRECTORY_MIGRATION_ID: job.id,
            CCM_HOST: job.host, CCM_PUBLIC_ORIGIN: job.publicOrigin || '', CCM_RUNTIME_VERSION: job.version };
        const child = (0, child_process_1.spawn)(job.node, [job.entry, String(job.port), job.host], { cwd: path.dirname(path.dirname(job.entry)), detached: true, stdio: ['ignore', log, log], windowsHide: true, env });
        child.on('error', () => { });
        child.unref();
        return child;
    }
    finally {
        fs.closeSync(log);
    }
}
async function restartJob(id) {
    let child = null;
    try {
        await copyDirectoryJob(id);
        const job = requireJob(id);
        child = spawnService(job, job.target);
        await ready(job, job.target, child.pid);
        await commitDirectoryJob(id);
    }
    catch (error) {
        // Only this direct child can be terminated; never kill a PID read from disk.
        if (child?.pid && (0, runtime_directory_job_1.alive)(child.pid)) {
            child.kill();
            const deadline = Date.now() + 20_000;
            while ((0, runtime_directory_job_1.alive)(child.pid) && Date.now() < deadline)
                await sleep(200);
        }
        failDirectoryJob(id, String(error?.message || error));
        const job = requireJob(id);
        if (!(0, runtime_directory_job_1.alive)(job.parentPid) && (!child?.pid || !(0, runtime_directory_job_1.alive)(child.pid)) && !fs.existsSync(job.lockFile || path.join(job.source, 'run/ccm-server-instance.lock'))) {
            const restored = spawnService(job, job.source);
            await ready(job, job.source, restored.pid);
        }
        throw error;
    }
}
if (require.main === module) {
    const [command, id] = process.argv.slice(2);
    const run = command === 'copy' ? copyDirectoryJob(id) : command === 'commit' ? commitDirectoryJob(id) : command === 'restart' ? restartJob(id) : command === 'fail' ? Promise.resolve(failDirectoryJob(id, process.argv[4] || '迁移失败')) : Promise.reject(new Error('迁移操作无效'));
    run.catch(error => { console.error(error.message); process.exitCode = 1; });
}
//# sourceMappingURL=runtime-directory-worker.js.map