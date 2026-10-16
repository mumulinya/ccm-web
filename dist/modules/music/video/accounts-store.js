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
exports.videoEpoch = exports.writeVideoAccount = exports.videoAccount = exports.videoOwner = void 0;
exports.videoProvider = videoProvider;
exports.videoCookie = videoCookie;
exports.videoStorage = videoStorage;
exports.beginVideoAttempt = beginVideoAttempt;
exports.requireVideoAttempt = requireVideoAttempt;
exports.commitVideoSession = commitVideoSession;
exports.clearVideoSession = clearVideoSession;
exports.publicVideoAccount = publicVideoAccount;
const crypto = __importStar(require("crypto"));
const accounts_1 = require("../folia/accounts");
const context_1 = require("../folia/context");
const credential_store_1 = require("../../../core/credential-store");
function videoProvider(value) { if (!['bilibili', 'douyin'].includes(value))
    throw new Error('无效视频平台'); return value; }
exports.videoOwner = context_1.currentFoliaOwner;
const videoAccount = (owner, provider) => (0, accounts_1.account)(owner, 'video-' + provider);
exports.videoAccount = videoAccount;
const writeVideoAccount = (owner, provider, fields) => (0, accounts_1.setAccount)(owner, 'video-' + provider, fields);
exports.writeVideoAccount = writeVideoAccount;
const videoEpoch = (owner, provider) => Number((0, exports.videoAccount)(owner, provider).epoch || 0);
exports.videoEpoch = videoEpoch;
function videoCookie(owner = (0, exports.videoOwner)(), provider = 'bilibili') {
    const state = (0, exports.videoAccount)(owner, provider);
    return state.cookieRef && state.status === 'authenticated' ? String((0, credential_store_1.resolveCredential)(state.cookieRef)) : '';
}
function videoStorage(owner, provider) {
    const state = (0, exports.videoAccount)(owner, provider);
    return state.storageRef && state.status === 'authenticated' ? JSON.parse(String((0, credential_store_1.resolveCredential)(state.storageRef))) : undefined;
}
function beginVideoAttempt(owner, provider) {
    const epoch = (0, exports.videoEpoch)(owner, provider) + 1, attemptId = crypto.randomUUID();
    (0, exports.writeVideoAccount)(owner, provider, { epoch, attemptId, loginState: 'preparing', expiresAt: Date.now() + 5 * 60_000, error: '' });
    return { epoch, attemptId };
}
function requireVideoAttempt(owner, provider, attempt) {
    const state = (0, exports.videoAccount)(owner, provider);
    if (state.epoch !== attempt.epoch || state.attemptId !== attempt.attemptId || Date.now() >= state.expiresAt)
        throw Object.assign(new Error('登录尝试已取消、过期或被替代'), { statusCode: 409 });
}
function commitVideoSession(owner, provider, attempt, cookie, profile, storage) {
    requireVideoAttempt(owner, provider, attempt);
    if (!(provider === 'douyin' ? /(?:^|;\s*)sessionid(?:_ss)?=[^;\s]+/ : /(?:^|;\s*)SESSDATA=[^;\s]+/).test(cookie || '') || !profile?.id || !profile?.name)
        throw new Error('平台尚未核验账号身份');
    const old = (0, exports.videoAccount)(owner, provider), scope = `video:${owner}:${provider}`;
    const cookieRef = (0, credential_store_1.protectCredential)(scope, 'cookie', cookie), storageRef = storage ? (0, credential_store_1.protectCredential)(scope, 'browser-storage', JSON.stringify(storage)) : null;
    (0, exports.writeVideoAccount)(owner, provider, { cookieRef, storageRef, profile: { id: String(profile.id), name: String(profile.name).slice(0, 100), avatar: String(profile.avatar || '') }, status: 'authenticated', loginState: 'authenticated', verifiedAt: Date.now(), sessionRef: crypto.randomUUID(), capabilities: {}, error: '' });
    for (const ref of [old.cookieRef, old.storageRef])
        if (ref && ![cookieRef, storageRef].includes(ref))
            (0, credential_store_1.deleteCredential)(ref);
}
function clearVideoSession(owner, provider) {
    const old = (0, exports.videoAccount)(owner, provider);
    (0, exports.writeVideoAccount)(owner, provider, { epoch: Number(old.epoch || 0) + 1, attemptId: null, cookieRef: null, storageRef: null, profile: null, status: 'anonymous', loginState: 'idle', sessionRef: null, verifiedAt: null, capabilities: {}, error: '' });
    for (const ref of [old.cookieRef, old.storageRef])
        if (ref)
            (0, credential_store_1.deleteCredential)(ref);
}
function publicVideoAccount(owner, provider) {
    const state = (0, exports.videoAccount)(owner, provider), authenticated = state.status === 'authenticated' && !!state.cookieRef;
    return { provider, status: authenticated ? 'authenticated' : state.status || 'anonymous', loginState: state.loginState || 'idle', attemptId: state.attemptId || null, expiresAt: state.expiresAt || null, profile: authenticated ? state.profile : null, sessionRef: authenticated ? state.sessionRef : null, verifiedAt: state.verifiedAt || null, error: String(state.error || '').slice(0, 250) };
}
//# sourceMappingURL=accounts-store.js.map