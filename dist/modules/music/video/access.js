"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithVideoOwner = void 0;
exports.videoMediaScope = videoMediaScope;
exports.requireVideoMediaAccess = requireVideoMediaAccess;
exports.videoMediaVisible = videoMediaVisible;
exports.trackVideoAuthorization = trackVideoAuthorization;
exports.revokeVideoMedia = revokeVideoMedia;
const context_1 = require("../folia/context");
const accounts_store_1 = require("./accounts-store");
// 个人账号媒体绑定创建用户和账号代次；后台任务恢复时必须显式恢复同一用户上下文。
const active = new Map();
function videoMediaScope(source, requiresAuth = false) { const owner = (0, accounts_store_1.videoOwner)(), state = ['bilibili', 'douyin'].includes(source) ? (0, accounts_store_1.videoAccount)(owner, source) : {}; const authenticated = requiresAuth || state.status === 'authenticated'; return { owner, requiresAuth: authenticated, accountEpoch: authenticated ? Number(state.epoch || 0) : null }; }
function requireVideoMediaAccess(record) { if (record.owner && record.owner !== (0, accounts_store_1.videoOwner)())
    throw Object.assign(new Error('视频任务不属于当前账号'), { statusCode: 403 }); if (record.requiresAuth && (['bilibili', 'douyin'].includes(record.source))) {
    const state = (0, accounts_store_1.videoAccount)((0, accounts_store_1.videoOwner)(), record.source);
    if (state.status !== 'authenticated' || Number(state.epoch || 0) !== record.accountEpoch)
        throw Object.assign(new Error('平台会话已退出或替换，请重新登录后准备视频'), { statusCode: 401, state: 'login_required' });
} }
function videoMediaVisible(record) { try {
    requireVideoMediaAccess(record);
    return true;
}
catch {
    return false;
} }
const runWithVideoOwner = (record, operation) => (0, context_1.withFoliaRequest)({ ccmAuth: { userId: record.owner || 'workspace' } }, operation);
exports.runWithVideoOwner = runWithVideoOwner;
function trackVideoAuthorization(record, onRevoke) { if (!record.requiresAuth)
    return () => { }; const key = JSON.stringify([record.owner, record.source]); let set = active.get(key); if (!set) {
    set = new Set();
    active.set(key, set);
} set.add(onRevoke); return () => { set.delete(onRevoke); if (!set.size)
    active.delete(key); }; }
function revokeVideoMedia(owner, provider) { const key = JSON.stringify([owner, provider]), set = active.get(key); active.delete(key); for (const stop of set || [])
    try {
        stop();
    }
    catch { } }
//# sourceMappingURL=access.js.map