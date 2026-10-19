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
exports.readPetRuntimeIdentity = readPetRuntimeIdentity;
exports.isPetRunning = isPetRunning;
exports.resolvePetElectron = resolvePetElectron;
exports.petRequestUserId = petRequestUserId;
exports.authorizePetRuntimeRequest = authorizePetRuntimeRequest;
exports.launchPet = launchPet;
exports.stopPet = stopPet;
exports.savedPetBinding = savedPetBinding;
exports.stopPetForShutdown = stopPetForShutdown;
exports.stopOwnedPetForDesktop = stopOwnedPetForDesktop;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const local_auth_1 = require("../system/local-auth");
const file = path.join(path.dirname(utils_1.PET_PID_FILE_GLOBAL), 'pet-runtime.json');
const bindingFile = path.join(utils_1.CCM_DIR, 'pet-launch-context.json');
const petDir = path.resolve(__dirname, '../../..', 'pet');
let owned = null;
let flight = null;
const alive = (pid) => { try {
    if (!Number.isSafeInteger(pid) || pid <= 0)
        return false;
    process.kill(pid, 0);
    return true;
}
catch {
    return false;
} };
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function readPetRuntimeIdentity() {
    const record = owned?.record || (0, atomic_json_file_1.readJsonWithBackup)(file, {});
    if (!record.pid) {
        try {
            record.pid = Number(fs.readFileSync(utils_1.PET_PID_FILE_GLOBAL, 'utf8').trim());
        }
        catch { }
    }
    // A PID alone is never proof of ownership or readiness.
    const running = !!owned && alive(owned.child.pid) && owned.child.exitCode === null && !owned.child.signalCode;
    return { schema: 'ccm-pet-runtime-v3', pid: Number(record.pid || 0), port: Number(record.port || 0),
        clientId: String(record.clientId || ''), startedAt: String(record.startedAt || ''),
        status: running ? record.status : alive(Number(record.pid)) ? 'unverified' : 'stopped',
        windows: running ? Number(record.windows || 0) : 0, error: String(record.error || ''), owned: running };
}
function isPetRunning() { return readPetRuntimeIdentity().owned; }
function resolvePetElectron() {
    const debugPort = Number(process.env.CCM_PET_TEST_DEBUG_PORT);
    const testArgs = process.env.CCM_DESKTOP_TEST_MODE === '1' && Number.isInteger(debugPort) && debugPort > 1024 && debugPort < 65536
        ? [`--remote-debugging-port=${debugPort}`, '--remote-debugging-address=127.0.0.1'] : [];
    if (process.env.CCM_PET_ELECTRON_EXE) {
        const executable = path.resolve(process.env.CCM_PET_ELECTRON_EXE);
        if (!fs.existsSync(executable))
            throw new Error('随包宠物 Electron 不存在，请修复 CCM 安装');
        return { executable, args: [...(process.env.CCM_PET_ELECTRON_APP ? [process.env.CCM_PET_ELECTRON_APP] : []), '--ccm-pet', ...testArgs] };
    }
    const roots = [path.join(petDir, 'node_modules/electron'), path.resolve(petDir, '../node_modules/electron')];
    for (const root of roots) {
        const relative = process.platform === 'win32' ? 'dist/electron.exe' : process.platform === 'darwin' ? 'dist/Electron.app/Contents/MacOS/Electron' : 'dist/electron';
        if (fs.existsSync(path.join(root, relative)))
            return { executable: path.join(root, relative), args: [petDir, ...testArgs] };
    }
    throw new Error('未找到本地 Electron 运行时；请使用 CCM 桌面安装包，或为 CLI 安装宠物 Electron 依赖');
}
function petRequestUserId(req) {
    return req.ccmAuth?.caller === 'desktop-pet' ? owned?.binding.userId || '' : String(req.ccmAuth?.userId || '');
}
function authorizePetRuntimeRequest(req) {
    if (!owned || req.headers['x-ccm-pet-token'] !== owned.token)
        return false;
    const binding = owned.binding;
    return !binding.userId || (0, local_auth_1.isLocalSessionActive)(binding.sessionId, binding.userId);
}
function launchPet(port, binding = {}) {
    if (flight)
        return flight; // Concurrent requests replay the same launch result.
    if (isPetRunning())
        return Promise.resolve(binding.userId && binding.userId !== owned.binding.userId
            ? { success: false, error: '桌面宠物属于另一登录会话，请关闭后重新启动' }
            : { success: true, reused: true, ...readPetRuntimeIdentity() });
    flight = start(port, binding).finally(() => { flight = null; });
    return flight;
}
async function start(port, binding) {
    if (readPetRuntimeIdentity().status === 'unverified')
        return { success: false, error: '检测到归属未核验的宠物进程，请关闭旧宠物后重试；不会按 PID 接管或结束它' };
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        return { success: false, error: '宠物端口无效' };
    let runtime;
    try {
        if (!fs.existsSync(path.join(petDir, 'main.js')))
            throw new Error('宠物应用未安装');
        runtime = resolvePetElectron();
        if (binding.userId && !(0, local_auth_1.isLocalSessionActive)(binding.sessionId, binding.userId))
            throw new Error('登录会话已失效，请重新登录后启动宠物');
    }
    catch (error) {
        return { success: false, error: error.message };
    }
    const token = crypto.randomBytes(32).toString('hex');
    const pipe = process.platform === 'win32' ? `\\\\.\\pipe\\ccm-pet-${process.pid}-${token.slice(0, 16)}` : path.join(utils_1.CCM_DIR, `pet-${token.slice(0, 16)}.sock`);
    const server = net.createServer();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.mkdirSync(path.join(utils_1.CCM_DIR, 'logs'), { recursive: true });
    try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(pipe, resolve); });
        const env = { ...process.env, CCM_TASK_STORE_DIR: utils_1.CCM_DIR, CCM_PORT: String(port), CCM_PET_LAUNCH_TOKEN: token,
            CCM_PET_CONTROL_PIPE: pipe, CCM_PET_ASSETS_DIR: path.resolve(petDir, '../public/pets') };
        delete env.ELECTRON_RUN_AS_NODE;
        // The pet has no CLI dependencies. Keep its search path independent of
        // registry-discovered developer runtimes and shell launchers.
        if (process.platform === 'win32') {
            for (const key of Object.keys(env))
                if (key.toLowerCase() === 'path')
                    delete env[key];
            env.PATH = [path.dirname(runtime.executable), path.join(env.SystemRoot || 'C:\\Windows', 'System32'), env.SystemRoot || 'C:\\Windows'].join(path.delimiter);
        }
        const log = fs.openSync(path.join(utils_1.CCM_DIR, 'logs/pet.log'), 'a');
        let child;
        try {
            child = (0, child_process_1.spawn)(runtime.executable, runtime.args, { cwd: petDir, windowsHide: true, stdio: ['ignore', log, log], env });
        }
        finally {
            fs.closeSync(log);
        }
        const record = { schema: 'ccm-pet-runtime-v3', pid: child.pid || 0, ownerPid: process.pid, port,
            executable: runtime.executable, searchPath: env.PATH, status: 'starting', windows: 0, surfaces: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), clientId: '', error: '' };
        const current = { child, token, server, record, binding, socket: undefined };
        owned = current;
        const sessionGuard = setInterval(() => {
            if (binding.userId && !(0, local_auth_1.isLocalSessionActive)(binding.sessionId, binding.userId))
                void stopPet();
        }, 1000);
        sessionGuard.unref();
        (0, atomic_json_file_1.writeJsonAtomic)(file, record);
        if (binding.userId)
            (0, atomic_json_file_1.writeJsonAtomic)(bindingFile, binding);
        const result = await new Promise(resolve => {
            let finished = false;
            const finish = (value) => { if (finished)
                return; finished = true; clearTimeout(timer); resolve(value); };
            const persist = () => { record.updatedAt = new Date().toISOString(); (0, atomic_json_file_1.writeJsonAtomic)(file, record); };
            const timer = setTimeout(() => { record.error = '宠物未在 30 秒内完成配置、SSE 与窗口握手'; persist(); finish({ success: false, error: record.error }); void stopPet(); }, 30_000);
            server.on('connection', socket => {
                let buffer = '';
                socket.setTimeout(5000, () => { if (!current.socket)
                    socket.destroy(); });
                socket.on('error', () => { });
                socket.on('data', chunk => {
                    buffer += chunk.toString();
                    if (buffer.length > 32 * 1024)
                        return socket.destroy();
                    let end;
                    while ((end = buffer.indexOf('\n')) >= 0) {
                        const line = buffer.slice(0, end);
                        buffer = buffer.slice(end + 1);
                        let message;
                        try {
                            message = JSON.parse(line);
                        }
                        catch {
                            socket.destroy();
                            return;
                        }
                        if (message.token !== token || message.pid !== child.pid) {
                            socket.destroy();
                            return;
                        }
                        if (current.socket && current.socket !== socket) {
                            socket.destroy();
                            return;
                        }
                        current.socket = socket;
                        socket.setTimeout(0);
                        if (message.type === 'ready') {
                            record.status = 'ready';
                            record.windows = Number(message.windows || 0);
                            record.surfaces = message.surfaces;
                            record.clientId = String(message.clientId || '');
                            persist();
                            fs.writeFileSync(utils_1.PET_PID_FILE_GLOBAL, String(child.pid));
                            finish({ success: true, ...readPetRuntimeIdentity() });
                        }
                        else if (message.type === 'error') {
                            record.error = String(message.error || '宠物初始化失败');
                            persist();
                            finish({ success: false, error: record.error });
                        }
                    }
                });
                socket.on('close', () => { if (current.socket === socket && owned === current) {
                    record.status = 'disconnected';
                    persist();
                } });
            });
            child.once('error', error => { clearInterval(sessionGuard); record.error = error.message; record.status = 'failed'; persist(); finish({ success: false, error: error.message }); server.close(); if (owned === current)
                owned = null; });
            child.once('exit', (code, signal) => {
                clearInterval(sessionGuard);
                current.socket?.destroy();
                server.close();
                record.status = code === 0 ? 'stopped' : 'failed';
                if (!record.error && code !== 0)
                    record.error = `宠物进程退出：${signal || code}`;
                persist();
                try {
                    fs.unlinkSync(utils_1.PET_PID_FILE_GLOBAL);
                }
                catch { }
                if (owned === current)
                    owned = null;
                finish({ success: false, error: record.error || '宠物在初始化完成前退出' });
            });
        });
        return result;
    }
    catch (error) {
        server.close();
        return { success: false, error: error.message };
    }
}
async function stopPet() {
    const current = owned;
    if (!current)
        return { success: readPetRuntimeIdentity().status !== 'unverified', status: readPetRuntimeIdentity().status, error: readPetRuntimeIdentity().status === 'unverified' ? '宠物归属未核验，未结束该进程' : undefined };
    current.record.status = 'stopping';
    (0, atomic_json_file_1.writeJsonAtomic)(file, current.record);
    if (current.socket)
        current.socket.write(`${JSON.stringify({ type: 'stop', token: current.token })}\n`);
    else
        current.child.kill(); // Only the direct child created in this backend lifetime.
    const deadline = Date.now() + 8000;
    while (owned === current && Date.now() < deadline)
        await delay(100);
    return owned === current ? { success: false, error: '宠物尚未退出，请重试，更新安装已暂缓' } : { success: true, status: 'stopped' };
}
function savedPetBinding() {
    const binding = (0, atomic_json_file_1.readJsonWithBackup)(bindingFile, null);
    return binding?.userId && (0, local_auth_1.isLocalSessionActive)(binding.sessionId, binding.userId) ? binding : null;
}
async function stopPetForShutdown() {
    const result = await stopPet();
    if (!result.success)
        console.warn(`[pet] ${result.error}`);
}
async function stopOwnedPetForDesktop() {
    if (!owned)
        return { success: true, external: readPetRuntimeIdentity().status === 'unverified' };
    return stopPet();
}
//# sourceMappingURL=pet-runtime.js.map