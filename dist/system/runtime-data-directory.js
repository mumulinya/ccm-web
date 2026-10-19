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
exports.configureDataDirectoryLifecycle = configureDataDirectoryLifecycle;
exports.validateRuntimeDataDirectory = validateRuntimeDataDirectory;
exports.runtimeDataDirectoryState = runtimeDataDirectoryState;
exports.migrateRuntimeDataDirectory = migrateRuntimeDataDirectory;
exports.cancelRuntimeDataDirectoryMigration = cancelRuntimeDataDirectoryMigration;
exports.recoverInterruptedDirectoryMigration = recoverInterruptedDirectoryMigration;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const runtime_paths_1 = require("../core/runtime-paths");
const runtime_directory_config_1 = require("../core/runtime-directory-config");
const runtime_directory_job_1 = require("../core/runtime-directory-job");
const runtime_directory_transfer_1 = require("../core/runtime-directory-transfer");
const desktop_update_gate_1 = require("./desktop-update-gate");
let drain = null;
let timer = null;
function configureDataDirectoryLifecycle(callback) { drain = callback; }
function validateRuntimeDataDirectory(target) { return (0, runtime_directory_transfer_1.validateDirectory)(target, runtime_paths_1.CCM_DIR); }
function state() {
    const config = (0, runtime_directory_config_1.readDirectoryConfig)();
    return { current: runtime_paths_1.CCM_DIR, configured: config?.dataDirectory || runtime_paths_1.CCM_DIR, configFile: (0, runtime_directory_config_1.runtimeConfigFile)(), serviceManagedBy: process.env.CCM_DESKTOP_RUNTIME ? 'desktop' : 'server',
        migration: (0, runtime_directory_job_1.readJob)() || { status: 'idle' }, environmentOverride: !process.env.CCM_DESKTOP_RUNTIME && !!process.env.CCM_TASK_STORE_DIR };
}
function runtimeDataDirectoryState() {
    const value = state();
    const { ownerToken, node, entry, ...migration } = value.migration;
    return { ...value, migration };
}
function migrateRuntimeDataDirectory(target, options = {}) {
    if (!drain)
        throw new Error('此嵌入式服务没有受控重启能力，请使用正式服务启动入口');
    const previous = (0, runtime_directory_job_1.readJob)();
    if (previous && runtime_directory_job_1.ACTIVE_PHASES.includes(previous.status)) {
        if (path.resolve(target) === previous.target && previous.source === runtime_paths_1.CCM_DIR)
            return runtimeDataDirectoryState();
        throw new Error('已有数据目录迁移正在进行');
    }
    if ((0, desktop_update_gate_1.desktopPreparation)())
        throw new Error('安装包更新或其他维护操作正在进行');
    let validation;
    if (options.restoreBackup) {
        if (!previous || !['completed', 'failed'].includes(previous.status) || previous.backup !== path.resolve(target))
            throw new Error('只能恢复上次迁移留下的旧目录备份');
        validation = (0, runtime_directory_transfer_1.validateDirectory)(target, runtime_paths_1.CCM_DIR, { allowExisting: true });
    }
    else
        validation = (0, runtime_directory_transfer_1.validateDirectory)(target, runtime_paths_1.CCM_DIR);
    const owner = (0, runtime_directory_config_1.readJson)(process.env.CCM_SERVER_LOCK_FILE || path.join(runtime_paths_1.CCM_DIR, 'run/ccm-server-instance.lock'));
    if (owner?.pid !== process.pid)
        throw new Error('无法证明服务实例归属');
    const id = crypto.randomUUID();
    (0, runtime_directory_job_1.lockJob)(id);
    try {
        (0, runtime_directory_job_1.saveJob)({ schema: 'ccm-runtime-directory-migration-v1', id, status: 'waiting', source: runtime_paths_1.CCM_DIR, target: validation.target,
            configFile: (0, runtime_directory_config_1.runtimeConfigFile)(), parentPid: process.pid, instanceId: owner.instance_id, version: owner.package_version,
            port: owner.port, host: owner.listen_host, publicOrigin: owner.public_origin, entry: owner.entry_path, node: process.execPath,
            lockFile: process.env.CCM_SERVER_LOCK_FILE || path.join(runtime_paths_1.CCM_DIR, 'run/ccm-server-instance.lock'),
            ownerToken: process.env.CCM_DESKTOP_OWNER_TOKEN || '', restoreBackup: !!options.restoreBackup,
            startedAt: new Date().toISOString(), estimatedBytes: validation.estimatedBytes, copiedFiles: 0, copiedBytes: 0 });
        (0, runtime_directory_job_1.reserveDirectory)(runtime_paths_1.CCM_DIR, { id });
        (0, desktop_update_gate_1.prepareDataDirectory)(id);
        timer = setTimeout(() => void advanceMigration(id), 1000);
        timer.unref();
    }
    catch (error) {
        if ((0, runtime_directory_job_1.readJob)()?.id === id)
            failMigration(id, error);
        else
            (0, runtime_directory_job_1.releaseJob)(id);
        throw error;
    }
    return runtimeDataDirectoryState();
}
async function advanceMigration(id) {
    try {
        const job = (0, runtime_directory_job_1.readJob)();
        if (job?.id !== id || job.status !== 'waiting')
            return;
        if (Date.now() - Date.parse(job.startedAt) > 30 * 60_000)
            throw new Error('等待任务空闲超时，可重试迁移');
        const snapshot = (0, desktop_update_gate_1.prepareDataDirectory)(id);
        if (snapshot.busy) {
            timer = setTimeout(() => void advanceMigration(id), 2000);
            timer.unref();
            return;
        }
        (0, desktop_update_gate_1.prepareDataDirectory)(id, true);
        (0, runtime_directory_job_1.saveJob)({ ...job, status: 'sealed' });
        const pet = await require('../modules/pets/pet-runtime').stopOwnedPetForDesktop();
        if (!pet.success || pet.external)
            throw new Error(pet.error || '请先关闭归属未核验的外部宠物');
        if (process.env.CCM_DESKTOP_RUNTIME) {
            if (!process.connected)
                throw new Error('桌面管理通道不可用，未切换数据目录');
            process.send?.({ type: 'ccm-data-directory-ready', id });
        }
        else {
            const child = (0, child_process_1.spawn)(process.execPath, [path.join(__dirname, '../core/runtime-directory-worker.js'), 'restart', id], {
                detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, CCM_RUNTIME_CONFIG_FILE: (0, runtime_directory_config_1.runtimeConfigFile)() },
            });
            child.once('error', error => failMigration(id, error));
            await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
            child.unref();
            drain?.();
        }
    }
    catch (error) {
        failMigration(id, error);
    }
}
function failMigration(id, error) {
    const job = (0, runtime_directory_job_1.readJob)();
    if (job?.id !== id)
        return;
    (0, runtime_directory_job_1.saveJob)({ ...job, status: 'failed', error: String(error?.message || error), completedAt: new Date().toISOString() });
    (0, desktop_update_gate_1.clearDataDirectoryPreparation)();
    (0, runtime_directory_job_1.releaseJob)(id);
}
function cancelRuntimeDataDirectoryMigration() {
    const job = (0, runtime_directory_job_1.readJob)();
    if (!job || !runtime_directory_job_1.ACTIVE_PHASES.includes(job.status))
        return runtimeDataDirectoryState();
    if (job.status !== 'waiting')
        throw new Error('服务正在停止或复制，不能中途取消；失败会自动恢复旧目录');
    if (timer)
        clearTimeout(timer);
    (0, runtime_directory_job_1.saveJob)({ ...job, status: 'cancelled', completedAt: new Date().toISOString() });
    (0, desktop_update_gate_1.clearDataDirectoryPreparation)();
    (0, runtime_directory_job_1.releaseJob)(job.id);
    return runtimeDataDirectoryState();
}
function recoverInterruptedDirectoryMigration() {
    const job = (0, runtime_directory_job_1.readJob)();
    if (job && job.id === process.env.CCM_DIRECTORY_MIGRATION_ID && job.status === 'restarting')
        return;
    if (job && runtime_directory_job_1.ACTIVE_PHASES.includes(job.status) && !(0, runtime_directory_job_1.alive)(Number(job.parentPid)) && !(0, runtime_directory_job_1.alive)(Number(job.workerPid)))
        failMigration(job.id, new Error('上次迁移被中断，保留旧目录；请检查后重试'));
}
//# sourceMappingURL=runtime-data-directory.js.map