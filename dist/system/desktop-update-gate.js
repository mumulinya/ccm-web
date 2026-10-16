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
exports.trackDesktopMutation = trackDesktopMutation;
exports.desktopPreparation = desktopPreparation;
exports.desktopExecutionAllowed = desktopExecutionAllowed;
exports.assertDesktopExecutionAllowed = assertDesktopExecutionAllowed;
exports.waitForDesktopExecution = waitForDesktopExecution;
exports.desktopBusySnapshot = desktopBusySnapshot;
exports.isDesktopOwner = isDesktopOwner;
exports.deferDuringDesktopUpdate = deferDuringDesktopUpdate;
exports.isLifecycleCaller = isLifecycleCaller;
exports.desktopMutationBlocked = desktopMutationBlocked;
exports.handleDesktopLifecycleApi = handleDesktopLifecycleApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../core/utils");
const task_store_1 = require("../core/task-store");
const atomic_json_file_1 = require("../core/atomic-json-file");
const file = path.join(utils_1.CCM_DIR, 'updates', 'desktop-preparation.json');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const mutations = new Set();
function trackDesktopMutation(req, res, pathname) {
    if (!pathname.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
        || /^\/api\/(?:internal|auth|notifications)(?:\/|$)/.test(pathname))
        return;
    mutations.add(req);
    const finish = () => { mutations.delete(req); };
    res.once('finish', finish);
    res.once('close', finish);
}
function desktopPreparation() {
    let value;
    try {
        value = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
    // Validate against the current data-directory owner, including when this
    // check runs in an Agent/Worker process. Restarts invalidate the old lease.
    let owner;
    try {
        owner = JSON.parse(fs.readFileSync(process.env.CCM_SERVER_LOCK_FILE || path.join(utils_1.CCM_DIR, 'run', 'ccm-server-instance.lock'), 'utf8'));
    }
    catch {
        return null;
    }
    return value?.pid === owner?.pid && value.expiresAt > Date.now() ? value : null;
}
function desktopExecutionAllowed(taskId = '') {
    const value = desktopPreparation();
    return !value || value.phase === 'waiting' && !!taskId && value.taskIds.includes(taskId);
}
function assertDesktopExecutionAllowed(taskId = '') {
    if (!desktopExecutionAllowed(taskId))
        throw Object.assign(new Error('桌面更新准备中，新的执行暂缓；取消更新后可重试'), { code: 'CCM_DESKTOP_UPDATE_PENDING', retryable: true });
}
async function waitForDesktopExecution(taskId = '') {
    while (!desktopExecutionAllowed(taskId))
        await new Promise(resolve => setTimeout(resolve, 1000));
}
function desktopBusySnapshot() {
    const persisted = (0, task_store_1.withSqliteTaskStore)(db => ({
        runs: db.prepare("SELECT run_id,task_id,status FROM agent_runs WHERE status IN ('leased','starting','running','recovering') OR (status IN ('waiting_input','waiting_confirmation') AND lease_expires_at > ?)").all(new Date().toISOString()),
        tasks: db.prepare("SELECT id,status FROM tasks WHERE archived=0 AND status IN ('running','executing','planning','dispatching','reviewing','testing','verifying','merging','in_progress')").all(),
    }));
    const processes = require('../agents/execution-kernel').listActiveAgentRuns();
    const terminals = require('../modules/tools/terminal').desktopTerminalActivity();
    const leaseDirectory = path.join(utils_1.CCM_DIR, 'git-operation-leases');
    const git = fs.existsSync(leaseDirectory) ? fs.readdirSync(leaseDirectory).filter(name => {
        if (!name.endsWith('.json'))
            return false;
        try {
            const value = JSON.parse(fs.readFileSync(path.join(leaseDirectory, name), 'utf8'));
            if (Date.parse(value.expires_at || '') <= Date.now())
                return false;
            if (value.hostname !== require('os').hostname())
                return true;
            process.kill(Number(value.owner_pid), 0);
            return true;
        }
        catch {
            return false;
        }
    }).length : 0;
    const media = require('../modules/music/douyin-media-jobs').desktopMediaJobActivity()
        + require('../modules/music/video-playback-jobs').desktopMediaJobActivity();
    const busy = persisted.runs.length + persisted.tasks.length + processes.length + terminals + mutations.size + media + git;
    return { busy: busy > 0, counts: { agent_runs: persisted.runs.length, tasks: persisted.tasks.length, processes: processes.length, terminals, mutations: mutations.size, media, git },
        taskIds: [...new Set([...persisted.tasks.map(row => row.id), ...persisted.runs.map(row => row.task_id), ...processes.map((row) => row.taskId)].filter(Boolean))] };
}
function isDesktopOwner(req) {
    const expected = String(process.env.CCM_DESKTOP_OWNER_TOKEN || '');
    const actual = String(req.headers['x-ccm-desktop-owner'] || '');
    return req.ccmAuth?.caller === 'ccm-desktop' && expected.length >= 32 && actual.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
function deferDuringDesktopUpdate(callback) {
    if (desktopExecutionAllowed())
        return false;
    const timer = setTimeout(callback, 1000);
    timer.unref?.();
    return true;
}
function isLifecycleCaller(req, drain = false) {
    return req.ccmAuth?.kind === 'internal' && (req.ccmAuth.caller === 'ccm-cli'
        || req.ccmAuth.caller === 'ccm-desktop' && (!drain || isDesktopOwner(req)));
}
function desktopMutationBlocked(req, pathname) {
    const pending = desktopPreparation();
    if (!pending || ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || pathname.startsWith('/api/internal/'))
        return false;
    // Existing Agents must still be able to report receipts and complete their
    // current Task. Their next execution is fenced by the persisted Task gate.
    if (pending.phase === 'waiting' && req.ccmAuth?.kind === 'internal')
        return false;
    return !/^\/api\/(?:auth|notifications)(?:\/|$)/.test(pathname);
}
function handleDesktopLifecycleApi(pathname, req, res) {
    if (!pathname.startsWith('/api/internal/desktop/'))
        return false;
    if (req.ccmAuth?.kind !== 'internal' || req.ccmAuth.caller !== 'ccm-desktop') {
        (0, utils_1.sendJson)(res, { success: false, error: '仅桌面管理器可调用' }, 403);
        return true;
    }
    try {
        const operation = pathname.slice('/api/internal/desktop/'.length);
        if (operation === 'status' && req.method === 'GET') {
            const { taskIds, ...snapshot } = desktopBusySnapshot();
            (0, utils_1.sendJson)(res, { success: true, ...snapshot, preparing: !!desktopPreparation() });
            return true;
        }
        if (req.method !== 'POST' || !['prepare', 'cancel', 'seal'].includes(operation) || !isDesktopOwner(req)) {
            (0, utils_1.sendJson)(res, { success: false, error: '不能管理未由此桌面端启动的服务' }, 403);
            return true;
        }
        const current = desktopPreparation();
        const owner = digest(String(req.headers['x-ccm-desktop-owner']));
        if (current && current.owner !== owner)
            throw new Error('另一个更新准备操作持有租约');
        if (operation === 'cancel') {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
            (0, utils_1.sendJson)(res, { success: true });
            return true;
        }
        const snapshot = desktopBusySnapshot();
        if (operation === 'seal' && (!current || snapshot.busy)) {
            (0, utils_1.sendJson)(res, { success: false, error: '仍有执行或准备租约已失效，请稍后重试', busy: snapshot.busy }, 409);
            return true;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        (0, atomic_json_file_1.writeJsonAtomic)(file, { pid: process.pid, owner, expiresAt: Date.now() + 30_000,
            taskIds: current?.taskIds || snapshot.taskIds, phase: operation === 'seal' ? 'sealed' : current?.phase || 'waiting' });
        const { taskIds, ...publicSnapshot } = snapshot;
        (0, utils_1.sendJson)(res, { success: true, ...publicSnapshot, preparing: true });
    }
    catch (error) {
        (0, utils_1.sendJson)(res, { success: false, error: error.message }, 503);
    }
    return true;
}
//# sourceMappingURL=desktop-update-gate.js.map