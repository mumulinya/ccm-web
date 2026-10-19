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
exports.readFoliaSyncConfig = readFoliaSyncConfig;
exports.saveFoliaSyncConfig = saveFoliaSyncConfig;
exports.requestFoliaSync = requestFoliaSync;
const crypto = __importStar(require("crypto"));
const accounts_1 = require("./accounts");
const credential_store_1 = require("../../../core/credential-store");
// Sync 只代理固定协议的视觉/主题接口；令牌留在当前 CCM 用户的加密凭据库。
const provider = 'sync-server';
const pending = new Map();
const endpoints = {
    '/health': 'GET', '/state': 'GET', '/themes/manifest': 'GET', '/settings': 'GET,PUT',
    '/themes/get': 'POST', '/themes/put': 'POST', '/themes/bucket': 'POST', '/themes/list': 'POST',
};
function baseUrl(value) {
    if (typeof value !== 'string' || value.length > 2048)
        throw Error('Sync 服务器地址无效');
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw Error('Sync 地址只允许不含凭据或查询参数的 HTTP/HTTPS 地址');
    return url.href.replace(/\/+$/, '');
}
function readFoliaSyncConfig(owner) {
    const state = (0, accounts_1.account)(owner, provider);
    return { provider, enabled: state.enabled === true, workerBaseUrl: state.baseUrl || '', authToken: '',
        hasToken: !!state.token, sessionRef: state.sessionRef || '', revision: Number(state.revision || 0) };
}
function saveFoliaSyncConfig(owner, input) {
    const previous = (0, accounts_1.account)(owner, provider), url = input.workerBaseUrl ? baseUrl(input.workerBaseUrl) : '';
    if (input.revision !== Number(previous.revision || 0))
        throw Object.assign(Error('同步设置已在其他窗口修改，请刷新后重试'), { statusCode: 409 });
    if (typeof input.enabled !== 'boolean' || typeof input.authToken !== 'string' || input.authToken.length > 16384)
        throw Error('Sync 设置无效');
    if (input.authToken && /[\r\n]/.test(input.authToken))
        throw Error('Sync 令牌无效');
    let token = input.clearToken === true ? null : previous.token;
    if (url !== previous.baseUrl && !input.authToken.trim())
        token = null;
    if (input.authToken.trim())
        token = (0, credential_store_1.protectCredential)(`folia:${owner}:sync`, 'token', input.authToken.trim());
    if (input.enabled && (!url || !token))
        throw Error('启用同步前请配置服务器地址和令牌');
    for (const controller of pending.get(owner) || [])
        controller.abort();
    (0, accounts_1.setAccount)(owner, provider, { enabled: input.enabled, baseUrl: url, token,
        sessionRef: crypto.randomUUID(), revision: Number(previous.revision || 0) + 1 });
    return readFoliaSyncConfig(owner);
}
// 测试可注入 HTTP；生产始终拒绝重定向，不把令牌发给渲染端指定的任意地址。
async function requestFoliaSync(owner, input, request = fetch, test = false) {
    const saved = (0, accounts_1.account)(owner, provider), state = { ...saved };
    let method = String(input.method || 'GET');
    let testToken;
    if (test) {
        state.baseUrl = baseUrl(input.workerBaseUrl);
        if (typeof input.authToken !== 'string' || input.authToken.length > 16384 || /[\r\n]/.test(input.authToken))
            throw Error('Sync 令牌无效');
        testToken = input.authToken.trim() || (state.baseUrl === saved.baseUrl && input.sessionRef === saved.sessionRef && saved.token ? (0, credential_store_1.resolveCredential)(saved.token) : '');
        if (!testToken)
            throw Error('请输入此服务器的 Sync 令牌');
        const testPath = input.path || '/health';
        if (!['/health', '/state'].includes(testPath))
            throw Error('同步测试只允许健康与状态读取');
        method = 'GET';
        input = { ...input, path: testPath, method, body: undefined, sessionRef: saved.sessionRef };
    }
    if (!test && (!state.enabled || !state.token))
        throw Object.assign(Error('请先配置并启用 Sync'), { statusCode: 409 });
    if (input.sessionRef !== state.sessionRef)
        throw Object.assign(Error('Sync 会话已变更，请刷新设置'), { statusCode: 409 });
    if (!endpoints[input.path]?.split(',').includes(method))
        throw Error('不支持的 Sync 操作');
    if (input.workerBaseUrl !== state.baseUrl)
        throw Error('Sync 地址已改变，请保存设置后重试');
    const body = input.body === undefined ? undefined : JSON.stringify(input.body);
    if (body && (method === 'GET' || Buffer.byteLength(body) > 4 * 1024 * 1024))
        throw Error('Sync 请求内容无效或过大');
    const controllers = pending.get(owner) || new Set();
    if (controllers.size >= 4)
        throw Object.assign(Error('Sync 请求过多，请稍后重试'), { statusCode: 429 });
    const controller = new AbortController();
    controllers.add(controller);
    pending.set(owner, controllers);
    try {
        const response = await request(state.baseUrl + input.path, { method, body,
            headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer ' + (testToken || (0, credential_store_1.resolveCredential)(state.token)) },
            credentials: 'omit', redirect: 'error', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
        if (!response.ok)
            throw Object.assign(Error(`Sync 请求失败（HTTP ${response.status}）`), { statusCode: response.status });
        let data = null;
        if (response.status !== 204) {
            if (!/application\/(?:[\w.+-]*\+)?json/i.test(response.headers.get('content-type') || ''))
                throw Error('Sync 未返回 JSON');
            const chunks = [];
            let size = 0;
            for await (const chunk of response.body) {
                const value = Buffer.from(chunk);
                size += value.length;
                if (size > 8 * 1024 * 1024) {
                    controller.abort();
                    throw Error('Sync 响应过大');
                }
                chunks.push(value);
            }
            data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }
        if (controller.signal.aborted || (0, accounts_1.account)(owner, provider).sessionRef !== state.sessionRef)
            throw Error('Sync 会话已撤销');
        return { data };
    }
    catch (error) {
        // 网络库异常可能携带请求对象；只返回固定诊断，不包含令牌或完整目标地址。
        if (error.statusCode)
            throw error;
        throw Error(controller.signal.aborted ? 'Sync 请求已取消' : 'Sync 连接或响应失败，请检查服务器和令牌');
    }
    finally {
        controllers.delete(controller);
        if (!controllers.size)
            pending.delete(owner);
    }
}
//# sourceMappingURL=sync-settings.js.map