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
exports.ACTIVE_PHASES = void 0;
exports.jobFile = jobFile;
exports.readJob = readJob;
exports.saveJob = saveJob;
exports.alive = alive;
exports.lockJob = lockJob;
exports.releaseJob = releaseJob;
exports.reserveDirectory = reserveDirectory;
exports.retireDirectory = retireDirectory;
exports.directoryExecutionBlocked = directoryExecutionBlocked;
exports.holdDirectoryActivation = holdDirectoryActivation;
exports.assertDirectoryReservation = assertDirectoryReservation;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const runtime_directory_config_1 = require("./runtime-directory-config");
exports.ACTIVE_PHASES = ['waiting', 'sealed', 'stopping', 'copying', 'restarting'];
function jobFile() { return (0, runtime_directory_config_1.runtimeConfigFile)() + '.migration.json'; }
function readJob() { return (0, runtime_directory_config_1.readJson)(jobFile()); }
function saveJob(job) { (0, runtime_directory_config_1.atomicJson)(jobFile(), { ...job, updatedAt: new Date().toISOString() }); return readJob(); }
function alive(pid) { try {
    if (!Number.isInteger(pid) || pid < 1)
        return false;
    process.kill(pid, 0);
    return true;
}
catch {
    return false;
} }
function lockJob(id) {
    const file = (0, runtime_directory_config_1.runtimeConfigFile)() + '.migration.lock';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const old = (0, runtime_directory_config_1.readJson)(file);
    if (old && (old.hostname !== os.hostname() || alive(Number(old.pid))))
        throw new Error('另一个迁移操作正在进行');
    if (old)
        fs.unlinkSync(file);
    const fd = fs.openSync(file, 'wx', 0o600);
    try {
        fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, hostname: os.hostname() }));
    }
    finally {
        fs.closeSync(fd);
    }
}
function releaseJob(id) {
    const file = (0, runtime_directory_config_1.runtimeConfigFile)() + '.migration.lock';
    if ((0, runtime_directory_config_1.readJson)(file)?.id === id)
        fs.unlinkSync(file);
}
function reserveDirectory(directory, job) {
    const file = path.join(directory, 'run/data-directory-reservation.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    (0, runtime_directory_config_1.atomicJson)(file, { id: job.id, configFile: (0, runtime_directory_config_1.runtimeConfigFile)(), jobFile: jobFile(), hostname: os.hostname() });
}
function retireDirectory(directory, job) {
    (0, runtime_directory_config_1.atomicJson)(path.join(directory, 'run/data-directory-reservation.json'), {
        id: job.id, retiredTo: job.target, retiredAt: new Date().toISOString(), jobFile: jobFile(), configFile: (0, runtime_directory_config_1.runtimeConfigFile)(), hostname: os.hostname(),
    });
}
function directoryExecutionBlocked(directory) {
    const reservation = (0, runtime_directory_config_1.readJson)(path.join(directory, 'run/data-directory-reservation.json'));
    if (!reservation)
        return false;
    if (reservation.retiredTo)
        return true;
    const job = (0, runtime_directory_config_1.readJson)(reservation.jobFile);
    if (job?.id !== reservation.id)
        return false;
    return ['sealed', 'stopping', 'copying', 'restarting'].includes(job.status)
        || job.status === 'completed' && path.resolve(job.source) === path.resolve(directory);
}
function holdDirectoryActivation(directory, instanceId) {
    const job = readJob();
    if (!job || job.id !== process.env.CCM_DIRECTORY_MIGRATION_ID || job.status !== 'restarting' || path.resolve(directory) !== path.resolve(job.target))
        return;
    (0, runtime_directory_config_1.atomicJson)(path.join(directory, 'updates/data-directory-preparation.json'), {
        pid: process.pid, instanceId, owner: `directory:${job.id}`, expiresAt: Date.now() + 5 * 60_000, phase: 'sealed', taskIds: [],
    });
}
function assertDirectoryReservation(directory) {
    const reservation = (0, runtime_directory_config_1.readJson)(path.join(directory, 'run/data-directory-reservation.json'));
    if (!reservation)
        return;
    if (reservation.retiredTo)
        throw new Error(`该目录已迁移到 ${reservation.retiredTo}，请通过设置恢复旧备份`);
    const job = (0, runtime_directory_config_1.readJson)(reservation.jobFile);
    if (job?.id === reservation.id && job.status === 'restarting' && (0, runtime_directory_config_1.readDirectoryConfig)(reservation.configFile)?.dataDirectory === job.target) {
        // The pointer is committed only after health; finish a crash between pointer and receipt status.
        saveJob({ ...job, status: 'completed', completedAt: job.completedAt || new Date().toISOString() });
        releaseJob(job.id);
        if (path.resolve(directory) === path.resolve(job.source))
            throw new Error(`该目录已迁移到 ${job.target}`);
        return;
    }
    if (job?.id === reservation.id && exports.ACTIVE_PHASES.includes(job.status)) {
        if (process.env.CCM_DIRECTORY_MIGRATION_ID !== job.id) {
            const targetOwner = (0, runtime_directory_config_1.readJson)(path.join(job.target, 'run/ccm-server-instance.lock'));
            if (!alive(Number(job.parentPid)) && !alive(Number(job.workerPid)) && !alive(Number(targetOwner?.pid))) {
                saveJob({ ...job, status: 'failed', error: '迁移进程已中断，保留原目录，可重新发起迁移' });
                releaseJob(job.id);
            }
            else
                throw new Error('数据目录迁移中，禁止启动第二个服务实例');
        }
    }
    if (job?.id === reservation.id && job.status === 'completed' && path.resolve(job.source) === path.resolve(directory))
        throw new Error(`该目录已迁移到 ${job.target}，请从新目录启动；恢复旧备份请使用数据目录设置`);
}
//# sourceMappingURL=runtime-directory-job.js.map