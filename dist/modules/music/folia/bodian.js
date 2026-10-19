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
exports.requestFoliaBodian = requestFoliaBodian;
const crypto = __importStar(require("crypto"));
const accounts_1 = require("./accounts");
const credential_store_1 = require("../../../core/credential-store");
// 波点协议复用固定 SDK，账号仅进入 CCM 加密仓库；扫码代次与会话代次均由服务端维护。
const clients = new Map();
function client(owner) {
    if (clients.has(owner))
        return clients.get(owner);
    if (clients.size >= 64)
        throw Error('波点会话数量已达上限，请稍后重试');
    const provider = 'bodian';
    if (!(0, accounts_1.account)(owner, provider).deviceId)
        (0, accounts_1.setAccount)(owner, provider, { deviceId: crypto.randomBytes(16).toString('hex') });
    const sessions = {
        get revision() { return Number((0, accounts_1.account)(owner, provider).sessionEpoch || 0); },
        get() { const state = (0, accounts_1.account)(owner, provider); if (!state.bodianSession)
            return null; return JSON.parse((0, credential_store_1.resolveCredential)(state.bodianSession)); },
        set(value) {
            if (!/^[1-9]\d{0,19}$/.test(String(value.uid)) || value.user?.id !== String(value.uid) || typeof value.token !== 'string' || !value.token)
                throw Error('波点账号身份不一致');
            const old = (0, accounts_1.account)(owner, provider), reference = (0, credential_store_1.protectCredential)(`folia:${owner}:bodian`, 'session', JSON.stringify(value));
            (0, accounts_1.setAccount)(owner, provider, { bodianSession: reference, profile: value.user, sessionEpoch: Number(old.sessionEpoch || 0) + 1, authenticatedAt: new Date().toISOString() });
        },
        clear() { const old = (0, accounts_1.account)(owner, provider); if (old.bodianSession)
            (0, credential_store_1.deleteCredential)(old.bodianSession); (0, accounts_1.setAccount)(owner, provider, { bodianSession: null, profile: null, authenticatedAt: null, sessionEpoch: Number(old.sessionEpoch || 0) + 1, qrGeneration: Number(old.qrGeneration || 0) + 1, qrRound: null }); },
    };
    const api = require('bodian-music-api').createBodianApi({ deviceId: (0, accounts_1.account)(owner, provider).deviceId, sessions });
    const value = { api, sessions };
    clients.set(owner, value);
    return value;
}
async function requestFoliaBodian(owner, input) {
    const { BODIAN_OPERATIONS } = require('bodian-music-api');
    const operation = input?.operation, params = input?.params || {};
    if (!BODIAN_OPERATIONS.includes(operation) || !params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length > 20 || Object.values(params).some(value => !['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'string' && value.length > 4000)))
        throw Error('无效波点操作或参数');
    const { api, sessions } = client(owner);
    if (operation === 'login_qr_key') {
        const old = (0, accounts_1.account)(owner, 'bodian'), generation = Number(old.qrGeneration || 0) + 1;
        (0, accounts_1.setAccount)(owner, 'bodian', { qrGeneration: generation, sessionEpoch: sessions.revision + 1, qrRound: { generation, status: 'loading', expiresAt: Date.now() + 300000 } });
        const result = await api.request(operation, params), current = (0, accounts_1.account)(owner, 'bodian');
        if (current.qrGeneration !== generation || !current.qrRound || current.qrRound.status === 'cancelled') {
            if (result.ok && result.data?.key)
                await api.request('login_qr_cancel', { key: result.data.key });
            throw Object.assign(Error('扫码请求已被替代或取消'), { statusCode: 409 });
        }
        if (result.ok && result.data?.key)
            (0, accounts_1.setAccount)(owner, 'bodian', { qrRound: { ...current.qrRound, key: result.data.key, status: 'waiting' } });
        return (0, accounts_1.hideProviderSecrets)(owner, 'bodian', result);
    }
    const before = (0, accounts_1.account)(owner, 'bodian');
    if (['login_qr_create', 'login_qr_check'].includes(operation) && (!before.qrRound || before.qrRound.key !== params.key || before.qrRound.status === 'cancelled' || before.qrRound.expiresAt < Date.now()))
        throw Object.assign(Error('二维码已过期或取消，请重新登录'), { statusCode: 409 });
    if (operation === 'login_qr_cancel' && before.qrRound && (!params.key || before.qrRound.key === params.key)) {
        (0, accounts_1.setAccount)(owner, 'bodian', { qrRound: { ...before.qrRound, status: 'cancelled' }, sessionEpoch: sessions.revision + 1 });
        // 获取二维码期间也能取消。迟到的 key 会在上面的代次检查中撤销。
        if (!params.key)
            return { ok: true, data: { cancelled: true } };
    }
    const result = await api.request(operation, params);
    if (['login_qr_create', 'login_qr_check'].includes(operation) && (0, accounts_1.account)(owner, 'bodian').qrGeneration !== before.qrGeneration)
        throw Object.assign(Error('扫码请求已被替代'), { statusCode: 409 });
    if (operation === 'login_status' && result.ok && result.data) {
        // SDK 的状态只读取本地会话；必须再以受保护的账号请求核验，不能仅凭文件宣布已登录。
        const verified = await api.request('user_albums', { limit: 1, offset: 0 });
        if (!verified.ok)
            return verified;
    }
    return (0, accounts_1.hideProviderSecrets)(owner, 'bodian', result);
}
//# sourceMappingURL=bodian.js.map