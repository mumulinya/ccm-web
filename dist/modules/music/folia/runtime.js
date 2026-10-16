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
exports.foliaRuntimeStatus = foliaRuntimeStatus;
exports.ensureFoliaProvider = ensureFoliaProvider;
exports.stopFoliaProviders = stopFoliaProviders;
const child_process_1 = require("child_process");
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../../core/utils");
const credential_store_1 = require("../../../core/credential-store");
// 按需管理配套音源 API；并发请求复用同一次启动。
const definitions = { netease: ['@neteasecloudmusicapienhanced/api', 'app.js'], qq: ['@yakult-green-tea/qq-music-api', 'dist/src/app.js'], kugou: ['kugoumusicapi', 'app.js'] };
const entries = new Map();
function packageRoot(name, app) { let dir = path.dirname(require.resolve(name)); while (path.dirname(dir) !== dir) {
    const f = path.join(dir, 'package.json');
    if (fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).name === name && fs.existsSync(path.join(dir, app)))
        return dir;
    dir = path.dirname(dir);
} throw new Error(`音源依赖未安装：${name}`); }
function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); }); }
function foliaRuntimeStatus() { return Object.fromEntries(Object.keys(definitions).map(id => { const entry = entries.get(id); return [id, { status: entry?.process && entry.port ? 'running' : entry?.starting ? 'starting' : entry?.error ? 'failed' : 'idle', error: entry?.error || '' }]; })); }
async function ensureFoliaProvider(provider) {
    if (!definitions[provider])
        throw new Error('不支持的音源服务');
    let entry = entries.get(provider);
    if (!entry) {
        entry = { failures: 0 };
        entries.set(provider, entry);
    }
    if (entry.process && entry.port) {
        if (Date.now() - (entry.checkedAt || 0) > 15000 && !entry.checking) {
            const child = entry.process, port = entry.port;
            entry.checking = fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) }).then(response => { if (response.status >= 500)
                throw new Error('音源健康检查失败'); entry.checkedAt = Date.now(); }).catch(() => { if (entry.process === child) {
                entry.process = undefined;
                entry.port = undefined;
                entry.failures++;
                entry.error = '音源健康检查失败';
                child.kill();
            } }).finally(() => { entry.checking = undefined; });
        }
        await entry.checking;
        if (entry.process && entry.port)
            return entry.port;
    }
    if (entry.starting)
        return entry.starting;
    if (entry.failures >= 3)
        throw new Error(entry.error || '音源服务多次启动失败，请重启 CCM 后重试');
    entry.starting = (async () => {
        const [name, app] = definitions[provider], root = packageRoot(name, app), port = await freePort();
        const authDir = path.join(utils_1.CCM_DIR, 'folia-runtime');
        fs.mkdirSync(authDir, { recursive: true });
        const tempDir = path.join(authDir, provider + '-temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const secretFile = path.join(authDir, 'qq-session-secret.ref');
        if (!fs.existsSync(secretFile))
            fs.writeFileSync(secretFile, (0, credential_store_1.protectCredential)('folia-runtime', 'qq-secret', require('crypto').randomBytes(32).toString('hex')), { mode: 0o600 });
        const child = (0, child_process_1.spawn)(process.execPath, ['--require', path.join(__dirname, 'provider-preload.cjs'), provider !== 'kugou' ? path.join(__dirname, 'provider-entry.cjs') : path.join(root, app)], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, CCM_FOLIA_PROVIDER_ROOT: root, CCM_FOLIA_PROVIDER_ID: provider, TEMP: tempDir, TMP: tempDir, TMPDIR: tempDir, AUTO_OPEN_EXPLORER: 'false', HOST: '127.0.0.1', PORT: String(port), ENABLE_GENERAL_UNBLOCK: 'false', QQ_AUTH_STATE_PATH: path.join(authDir, 'qq-device.json'), QQ_AUTH_SESSION_PATH: path.join(authDir, 'qq-sessions.json'), QQ_SESSION_SECRET: (0, credential_store_1.resolveCredential)(fs.readFileSync(secretFile, 'utf8')) } });
        let stderr = '';
        child.stdout?.on('data', () => { });
        child.stderr?.on('data', data => { stderr = (stderr + data).slice(-2000); });
        child.on('error', error => { entry.error = error.message; });
        child.on('exit', () => { if (entry.process === child) {
            entry.process = undefined;
            entry.port = undefined;
            entry.failures++;
            entry.error = '音源服务已停止';
        } });
        entry.process = child;
        try {
            const deadline = Date.now() + 25_000;
            while (Date.now() < deadline && child.exitCode === null && !child.killed) {
                try {
                    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
                    if (response.status >= 500)
                        throw new Error('音源健康检查失败');
                    entry.port = port;
                    entry.checkedAt = Date.now();
                    entry.error = '';
                    return port;
                }
                catch { }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            throw new Error('音源服务未就绪' + (stderr ? '，请检查安装依赖与服务日志' : ''));
        }
        catch (e) {
            fs.writeFileSync(path.join(authDir, provider + '-startup.log'), stderr, { mode: 0o600 });
            child.kill();
            entry.error = e.message;
            throw e;
        }
    })().finally(() => { entry.starting = undefined; });
    return entry.starting;
}
function stopFoliaProviders() { for (const entry of entries.values()) {
    entry.process?.kill();
    entry.process = undefined;
    entry.port = undefined;
} }
process.once('exit', stopFoliaProviders);
const healthTimer = setInterval(() => { for (const [provider, entry] of entries)
    if (entry.process && entry.port)
        void ensureFoliaProvider(provider).catch(() => { }); }, 15000);
healthTimer.unref();
//# sourceMappingURL=runtime.js.map