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
exports.cancelFoliaLogin = cancelFoliaLogin;
exports.clearFoliaSession = clearFoliaSession;
exports.beginFoliaLoginRequest = beginFoliaLoginRequest;
exports.noteFoliaProfile = noteFoliaProfile;
const crypto = __importStar(require("crypto"));
const accounts_1 = require("./accounts");
// 登录轮次属于 CCM 主体；过期、取消或被替代的二维码响应不能再写入平台会话。
const providers = ['netease', 'qq', 'kugou'];
function cancelFoliaLogin(owner, provider, input) {
    if (!providers.includes(provider))
        throw new Error('不支持的账号音源');
    const current = (0, accounts_1.account)(owner, provider), round = current.qrRound;
    if (!round || (input.key ? round.key !== String(input.key) : round.attemptId !== input.attemptId))
        return { success: true, skipped: true };
    (0, accounts_1.setAccount)(owner, provider, { qrRound: { ...round, status: 'cancelled' } });
    return { success: true };
}
function clearFoliaSession(owner, provider) {
    const current = (0, accounts_1.account)(owner, provider);
    (0, accounts_1.setAccount)(owner, provider, { cookieMarker: null, authenticatedAt: null, profile: null, sessionHints: {}, secrets: {}, secretDigests: {}, qrRound: current.qrRound ? { ...current.qrRound, status: 'cancelled' } : null });
}
function beginFoliaLoginRequest(owner, provider, endpoint, req, body) {
    if (endpoint === '/logout') {
        clearFoliaSession(owner, provider);
        return (_data) => { };
    }
    if (!endpoint.startsWith('/login/qr/'))
        return (_data) => { };
    const input = new URL(req.url, 'http://ccm.local'), key = String(body?.key || input.searchParams.get('key') || '');
    const attempt = String(req.headers['x-ccm-login-attempt'] || '');
    if (attempt && !/^[a-zA-Z0-9_-]{1,160}$/.test(attempt))
        throw new Error('无效登录请求身份');
    const previous = (0, accounts_1.account)(owner, provider).qrRound;
    if (endpoint === '/login/qr/cancel') {
        cancelFoliaLogin(owner, provider, { key });
        return (_data) => { };
    }
    const round = endpoint === '/login/qr/key' ? { generation: Number(previous?.generation || 0) + 1, attemptId: attempt || crypto.randomUUID(), key: null, status: 'loading', expiresAt: Date.now() + 180000 } : previous;
    if (endpoint === '/login/qr/key')
        (0, accounts_1.setAccount)(owner, provider, { qrRound: round });
    const current = () => {
        const value = (0, accounts_1.account)(owner, provider).qrRound;
        if (!round || !value || round.generation !== value.generation || round.attemptId !== value.attemptId || value.status === 'cancelled' || value.expiresAt < Date.now() || (attempt && value.attemptId !== attempt) || (endpoint !== '/login/qr/key' && value.key !== key))
            throw Object.assign(new Error('扫码请求已取消、过期或被另一窗口替代，请重新登录'), { statusCode: 409 });
        return value;
    };
    current();
    return (data) => {
        const active = current();
        if (endpoint === '/login/qr/key') {
            const qrKey = provider === 'kugou' ? data?.data?.qrcode || data?.data?.qrkey || data?.data?.key : data?.data?.unikey;
            if (qrKey)
                (0, accounts_1.setAccount)(owner, provider, { qrRound: { ...active, key: String(qrKey), status: 'waiting' } });
        }
        if (endpoint === '/login/qr/check' && (Number(data.code) === 803 || provider === 'kugou' && Number(data.data?.status) === 4))
            (0, accounts_1.setAccount)(owner, provider, { qrRound: { ...active, status: 'confirmed' } });
    };
}
function noteFoliaProfile(owner, provider, endpoint, data) {
    if (!(endpoint === '/login/status' && provider !== 'kugou' || endpoint === '/user/detail' && provider === 'kugou'))
        return;
    const raw = provider === 'kugou' ? data?.data?.user_info || data?.data?.userinfo || data?.data?.profile || data?.data : data?.data?.profile;
    if (!raw) {
        if ([301, 401, 403].includes(Number(data.code)) || endpoint === '/login/status' && data.code === 200)
            (0, accounts_1.setAccount)(owner, provider, { authenticatedAt: null, profile: null });
        return;
    }
    const info = raw.info || raw;
    const id = raw.userId || raw.str_musicid || raw.musicid || raw.uin || raw.userid || raw.user_id || raw.id || info.str_musicid || info.musicid || info.uin || '';
    if (provider !== 'qq' && !id)
        return;
    const profile = { id: String(id).slice(0, 160), nickname: String(raw.nickname || raw.nick_name || raw.username || raw.nick || raw.name || info.nickname || info.nick || info.name || '').slice(0, 120) };
    (0, accounts_1.setAccount)(owner, provider, { authenticatedAt: new Date().toISOString(), profile });
}
//# sourceMappingURL=login-fence.js.map