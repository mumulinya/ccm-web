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
exports.proxyFoliaProvider = proxyFoliaProvider;
exports.requestFoliaProvider = requestFoliaProvider;
exports.requestFoliaNavidrome = requestFoliaNavidrome;
exports.requireFoliaNavidromeInstance = requireFoliaNavidromeInstance;
exports.readFoliaNavidrome = readFoliaNavidrome;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("./runtime");
const accounts_1 = require("./accounts");
const platform_http_1 = require("../platform-http");
const login_fence_1 = require("./login-fence");
// 配套 API 的同源边界：不转发浏览器 IP、Cookie 或任意目标地址。
async function proxyFoliaProvider(owner, provider, endpoint, req, res, body) {
    if (!/^\/[a-zA-Z0-9_/-]*$/.test(endpoint) || endpoint.includes('..'))
        throw new Error('无效音源接口');
    const before = (0, accounts_1.account)(owner, provider), logoutCookie = endpoint === '/logout' && before.cookieMarker ? String((0, accounts_1.revealProviderValue)(owner, provider, before.cookieMarker)) : '';
    const acceptLogin = (0, login_fence_1.beginFoliaLoginRequest)(owner, provider, endpoint, req, body);
    const port = await (0, runtime_1.ensureFoliaProvider)(provider);
    const input = new URL(req.url, 'http://ccm.local');
    if (provider === 'netease' && (input.searchParams.get('unblock') === 'true' || body?.unblock === true || body?.unblock === 'true'))
        throw new Error('音乐工作区仅使用选定平台的原曲，不启用跨平台替代解析');
    const target = new URL(endpoint, `http://127.0.0.1:${port}`);
    for (const [key, value] of input.searchParams) {
        if (!['realIP', 'ip', 'proxy'].includes(key) && !(endpoint === '/logout' && ['cookie', 'token', 'dfid'].includes(key)))
            target.searchParams.append(key, String((0, accounts_1.revealProviderValue)(owner, provider, value)));
    }
    const state = (0, accounts_1.account)(owner, provider);
    if (state.cookieMarker)
        target.searchParams.set('cookie', (0, accounts_1.revealProviderValue)(owner, provider, state.cookieMarker));
    if (logoutCookie && provider !== 'qq')
        target.searchParams.set('cookie', logoutCookie);
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'qq' && state.cookieMarker) {
        const cookie = String((0, accounts_1.revealProviderValue)(owner, provider, state.cookieMarker));
        headers['X-QQ-Session'] = /qqmusic_session=([^;]+)/.exec(cookie)?.[1] || cookie;
        target.searchParams.delete('cookie');
    }
    if (provider === 'qq' && logoutCookie)
        headers['X-QQ-Session'] = /qqmusic_session=([^;]+)/.exec(logoutCookie)?.[1] || logoutCookie;
    const requestBody = body && endpoint === '/logout' ? Object.fromEntries(Object.entries(body).filter(([key]) => !['cookie', 'token', 'dfid'].includes(key))) : body;
    const response = await fetch(target, { method: req.method, headers, ...(requestBody ? { body: JSON.stringify((0, accounts_1.revealProviderValue)(owner, provider, requestBody)) } : {}), signal: AbortSignal.timeout(25_000), redirect: 'error' });
    const text = await response.text();
    if (Buffer.byteLength(text) > 4 * 1024 * 1024)
        throw new Error('音源响应过大');
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new Error(`音源接口未返回 JSON（HTTP ${response.status}）`);
    }
    acceptLogin(data);
    if (!endpoint.startsWith('/login/qr/') && !['/logout', '/register/anonimous'].includes(endpoint) && (0, accounts_1.account)(owner, provider).cookieMarker !== before.cookieMarker)
        throw Object.assign(new Error('音乐账号会话已更新，请刷新后重试'), { statusCode: 409 });
    // 酷狗 HTTP 登录通过 Set-Cookie 返回会话；转换为不透明响应字段，绝不向 CCM 域写平台 cookie。
    const cookies = response.headers.getSetCookie();
    if (cookies.length && provider === 'kugou')
        data.cookie = cookies;
    const safe = endpoint === '/logout' ? (0, accounts_1.redactFoliaResponse)(data) : (0, accounts_1.hideProviderSecrets)(owner, provider, data, endpoint === '/register/anonimous' ? 'anonymous_cookie' : 'cookie');
    (0, login_fence_1.noteFoliaProfile)(owner, provider, endpoint, data);
    if (provider === 'qq' && typeof safe.cookie === 'string' && safe.cookie.startsWith('ccm_folia_'))
        safe.cookie = 'qqmusic_session=' + safe.cookie;
    res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(safe));
}
async function requestFoliaProvider(owner, provider, endpoint, params) {
    const port = await (0, runtime_1.ensureFoliaProvider)(provider), url = new URL(endpoint, `http://127.0.0.1:${port}`);
    for (const [key, value] of Object.entries(params))
        if (value !== undefined)
            url.searchParams.set(key, String(value));
    const state = (0, accounts_1.account)(owner, provider), headers = {};
    if (state.cookieMarker) {
        const cookie = String((0, accounts_1.revealProviderValue)(owner, provider, state.cookieMarker));
        if (provider === 'qq')
            headers['X-QQ-Session'] = /qqmusic_session=([^;]+)/.exec(cookie)?.[1] || cookie;
        else
            url.searchParams.set('cookie', cookie);
    }
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000), redirect: 'error' });
    const data = await response.json();
    if (!response.ok)
        throw new Error(data.message || data.msg || `音源请求失败（${response.status}）`);
    return data;
}
async function requestFoliaNavidrome(owner, endpoint, params) {
    if (!/^[a-zA-Z0-9]+(?:\.view)?$/.test(endpoint))
        throw new Error('无效 Navidrome 接口');
    const config = (0, accounts_1.account)(owner, 'navidrome');
    if (!config.baseUrl || !config.password)
        throw new Error('请先配置 Navidrome');
    const target = new URL(config.baseUrl.replace(/\/$/, '') + '/rest/' + endpoint), salt = crypto.randomBytes(12).toString('hex');
    for (const [key, value] of params)
        if (!['u', 't', 's', 'p', 'apiKey'].includes(key))
            target.searchParams.append(key, value);
    target.searchParams.set('u', config.username);
    target.searchParams.set('s', salt);
    target.searchParams.set('t', crypto.createHash('md5').update(String(require('../../../core/credential-store').resolveCredential(config.password)) + salt).digest('hex'));
    return { target, host: target.hostname };
}
function requireFoliaNavidromeInstance(owner, instanceId) {
    if (instanceId !== ((0, accounts_1.account)(owner, 'navidrome').instanceId || 'default'))
        throw Object.assign(new Error('Navidrome 服务器已更换，请刷新播放器或重新连接原服务器'), { statusCode: 409 });
}
async function readFoliaNavidrome(owner, endpoint, params) {
    const { target, host } = await requestFoliaNavidrome(owner, endpoint, params);
    return (0, platform_http_1.musicPlatformJson)({ url: target.toString(), allowedHosts: [host] });
}
//# sourceMappingURL=proxy.js.map