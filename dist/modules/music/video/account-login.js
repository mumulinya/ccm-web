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
exports.startVideoLogin = startVideoLogin;
exports.cancelVideoLogin = cancelVideoLogin;
exports.logoutVideo = logoutVideo;
exports.videoQr = videoQr;
exports.verifyVideoAccount = verifyVideoAccount;
exports.closeVideoAccounts = closeVideoAccounts;
exports.videoAccountStatus = videoAccountStatus;
const recommendations_1 = require("./recommendations");
const media_input_cache_1 = require("./media-input-cache");
const list_cache_1 = require("./list-cache");
const bilibili_account_1 = require("./bilibili-account");
const accounts_store_1 = require("./accounts-store");
const account_browser_1 = require("./account-browser");
const douyin_account_1 = require("./douyin-account");
const access_1 = require("./access");
const douyin_library_session_1 = require("./douyin-library-session");
const attempts = new Map(), starting = new Map();
const identity = (owner, provider) => JSON.stringify([owner, provider]);
const safeError = (error) => String(error?.message || '平台登录失败').replace(/https?:\/\/\S+/g, '[平台地址]').replace(/(?:cookie|token|sessionid|qrcode_key)\s*[=:]\s*[^;\s]+/ig, '[已脱敏]').slice(0, 250);
function syncLegacyDouyin(owner) {
    if (owner !== 'workspace')
        return false;
    try {
        const legacy = require('../douyin'), status = legacy.douyinPlatformStatus(), bridge = require('../douyin-mcp-bridge'), cookie = bridge.getDouyinMcpCookie(), storage = legacy.getDouyinBrowserStorage?.() || undefined;
        if (!status?.mcp?.authenticated || !/(?:^|;\s*)sessionid(?:_ss)?=[^;\s]+/.test(cookie))
            return false;
        const current = (0, accounts_store_1.videoAccount)(owner, 'douyin');
        if (current.status === 'authenticated' && current.cookieRef && (!storage || current.storageRef))
            return true;
        const attempt = (0, accounts_store_1.beginVideoAttempt)(owner, 'douyin');
        (0, accounts_store_1.commitVideoSession)(owner, 'douyin', attempt, cookie, { id: 'douyin-mcp', name: '抖音账号', avatar: '' }, storage);
        return true;
    }
    catch {
        return false;
    }
}
async function release(attempt) { attempt.stopped = true; if (attempt.timer)
    clearTimeout(attempt.timer); if (attempt.runtime)
    await attempt.runtime.browser.close().catch(() => { }); attempt.runtime = null; attempt.qr = ''; }
function alive(attempt) { return !!attempt && !attempt.stopped && attempts.get(identity(attempt.owner, attempt.provider)) === attempt; }
function patch(attempt, fields) { if (!alive(attempt))
    return; (0, accounts_store_1.requireVideoAttempt)(attempt.owner, attempt.provider, attempt); (0, accounts_store_1.writeVideoAccount)(attempt.owner, attempt.provider, fields); }
async function finish(attempt, error) { if (!alive(attempt))
    return; const state = (0, accounts_store_1.videoAccount)(attempt.owner, attempt.provider); if (state.epoch === attempt.epoch && state.attemptId === attempt.attemptId)
    (0, accounts_store_1.writeVideoAccount)(attempt.owner, attempt.provider, { loginState: error ? 'failed' : 'authenticated', error: error ? safeError(error) : '' }); await release(attempt); if (!error && attempt.provider === 'douyin')
    await require('../douyin-mcp-bridge').resetDouyinOwnerRuntime(attempt.owner); }
async function poll(attempt) {
    if (!alive(attempt))
        return;
    if (Date.now() >= attempt.expiresAt) {
        (0, accounts_store_1.writeVideoAccount)(attempt.owner, attempt.provider, { loginState: 'expired', error: '二维码或登录等待已过期，请重新生成' });
        await release(attempt);
        return;
    }
    try {
        (0, accounts_store_1.requireVideoAttempt)(attempt.owner, attempt.provider, attempt);
        if (attempt.provider === 'bilibili' && attempt.key === 'browser') {
            const cookie = await (0, account_browser_1.browserCookie)(attempt.runtime.context, 'bilibili');
            if (cookie.includes('SESSDATA=')) {
                patch(attempt, { loginState: 'verifying' });
                const profile = await (0, bilibili_account_1.verifyBiliAccount)(attempt.owner, cookie);
                (0, accounts_store_1.commitVideoSession)(attempt.owner, 'bilibili', attempt, cookie, profile, await attempt.runtime.context.storageState());
                await finish(attempt);
                return;
            }
            const qr = attempt.runtime.page.locator('[class*="qrcode"] canvas,[class*="qrcode"] img,img[alt*="二维码"]').first();
            if (await qr.isVisible())
                attempt.qr = 'data:image/png;base64,' + (await qr.screenshot()).toString('base64');
            patch(attempt, { loginState: 'needs_action', error: '请在官方窗口完成登录或验证' });
        }
        else if (attempt.provider === 'bilibili') {
            const result = await (0, bilibili_account_1.biliQrPoll)(attempt.key);
            if (!alive(attempt))
                return;
            if (result.code === 0) {
                patch(attempt, { loginState: 'verifying' });
                const profile = await (0, bilibili_account_1.verifyBiliAccount)(attempt.owner, result.cookies);
                (0, accounts_store_1.commitVideoSession)(attempt.owner, attempt.provider, attempt, result.cookies, profile);
                await finish(attempt);
                return;
            }
            if (result.code === 86038) {
                patch(attempt, { loginState: 'expired', error: 'B站二维码已过期，请重新生成' });
                await release(attempt);
                return;
            }
            if (![86090, 86101].includes(result.code))
                throw new Error(result.message || 'B站暂不能读取扫码状态');
            patch(attempt, { loginState: result.code === 86090 ? 'confirming' : 'waiting' });
        }
        else if (attempt.provider === 'douyin' && attempt.key === 'legacy') {
            const status = require('../douyin').douyinPlatformStatus();
            if (status?.mcp?.authenticated && syncLegacyDouyin(attempt.owner)) {
                await finish(attempt);
                return;
            }
            if (status?.mcp?.loginState === 'failed')
                throw new Error(status.mcp.error || '抖音设置页登录失败');
            patch(attempt, { loginState: 'waiting', error: status?.mcp?.error || '' });
        }
        else if (attempt.provider === 'douyin' && attempt.key === 'douyin-api') {
            const result = await (0, douyin_account_1.douyinQrPoll)(attempt.qrToken || '');
            if (!alive(attempt))
                return;
            if (result.code === 0) {
                if (!/sessionid(?:_ss)?=/i.test(result.cookie || ''))
                    throw new Error('抖音扫码成功但未取得有效会话，请打开官方登录窗口重试');
                patch(attempt, { loginState: 'verifying' });
                (0, accounts_store_1.commitVideoSession)(attempt.owner, attempt.provider, attempt, result.cookie, { id: 'douyin', name: '抖音账号', avatar: '' });
                try {
                    const profile = await (0, account_browser_1.readDouyinProfile)(attempt.owner);
                    (0, accounts_store_1.writeVideoAccount)(attempt.owner, attempt.provider, { profile });
                }
                catch { }
                await finish(attempt);
                return;
            }
            if (result.code === 3) {
                patch(attempt, { loginState: 'expired', error: '抖音二维码已过期，请重新生成' });
                await release(attempt);
                return;
            }
            patch(attempt, { loginState: result.code === 2 ? 'confirming' : 'waiting' });
        }
        else {
            const page = attempt.runtime.page;
            if (page.isClosed())
                throw new Error('官方登录窗口已关闭');
            const text = await page.locator('body').innerText({ timeout: 3000 });
            if (/验证码|安全验证|拖动滑块/.test(text))
                patch(attempt, { loginState: 'needs_action', error: '请打开官方登录窗口完成验证' });
            else if (/二维码已失效|二维码已过期/.test(text))
                patch(attempt, { loginState: 'expired', error: '抖音二维码已过期，请重新生成' });
            const qr = page.locator('img[src*="qrcode"],img[alt*="二维码"],[class*="qrcode"] img,[class*="qrcode"] canvas,[class*="login"] canvas').first();
            if (await qr.isVisible())
                attempt.qr = 'data:image/png;base64,' + (await qr.screenshot()).toString('base64');
        }
    }
    catch (error) {
        await finish(attempt, error);
        return;
    }
    if (alive(attempt)) {
        attempt.timer = setTimeout(() => { attempt.pending = poll(attempt); }, 2000);
        attempt.timer.unref?.();
    }
}
function startVideoLogin(owner, provider, refresh = false, visible = false) {
    if ([...attempts.values()].filter(alive).length >= 32 && !attempts.has(identity(owner, provider)))
        return Promise.reject(Object.assign(new Error('当前平台登录较多，请稍后再试'), { statusCode: 429 }));
    const id = identity(owner, provider);
    if (starting.has(id))
        return starting.get(id);
    const existing = attempts.get(id);
    if (existing && alive(existing) && !refresh && Date.now() < existing.expiresAt)
        return Promise.resolve((0, accounts_store_1.publicVideoAccount)(owner, provider));
    const operation = (async () => {
        (0, recommendations_1.closeVideoRecommendations)(owner, provider);
        (0, list_cache_1.clearVideoListCache)(owner, provider);
        (0, media_input_cache_1.clearVideoMediaInputs)(owner, provider);
        const issued = (0, accounts_store_1.beginVideoAttempt)(owner, provider);
        (0, access_1.revokeVideoMedia)(owner, provider);
        if (provider === 'douyin')
            await (0, douyin_library_session_1.closeDouyinLibrarySessions)(owner);
        if (existing)
            await release(existing);
        const attempt = { ...issued, owner, provider, expiresAt: Date.now() + 5 * 60_000 };
        attempts.set(id, attempt);
        try {
            if (provider === 'bilibili' && !visible) {
                const qr = await (0, bilibili_account_1.biliQrStart)();
                (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt);
                attempt.key = qr.qrcode_key;
                attempt.qr = await require('qrcode').toDataURL(qr.url, { width: 260, margin: 2 });
                patch(attempt, { loginState: 'waiting' });
            }
            else if (provider === 'douyin' && owner === 'workspace') {
                if (syncLegacyDouyin(owner)) {
                    await release(attempt);
                    return (0, accounts_store_1.publicVideoAccount)(owner, provider);
                }
                const status = await require('../douyin').startDouyinLogin();
                (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt);
                attempt.key = 'legacy';
                patch(attempt, { loginState: status?.mcp?.loginState === 'failed' ? 'failed' : 'waiting', error: status?.mcp?.error || '' });
            }
            else if (provider === 'douyin' && !visible) {
                try {
                    const qr = await (0, douyin_account_1.douyinQrStart)();
                    (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt);
                    attempt.key = 'douyin-api';
                    attempt.qrToken = qr.token;
                    attempt.qr = await require('qrcode').toDataURL(qr.qrcodeUrl, { width: 260, margin: 2 });
                    patch(attempt, { loginState: 'waiting' });
                }
                catch (error) {
                    // SSO may return an anti-bot HTML page. Keep the attempt alive and fall back to
                    // the official isolated browser so the user can finish QR/CAPTCHA verification.
                    attempt.runtime = await (0, account_browser_1.createVideoBrowser)(owner, 'douyin', true, false);
                    (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt);
                    attempt.key = 'browser';
                    await attempt.runtime.page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    patch(attempt, { loginState: 'needs_action', error: '抖音二维码接口暂时不可用，已打开官方登录窗口；完成扫码或验证后会自动核验' });
                }
            }
            else {
                attempt.runtime = await (0, account_browser_1.createVideoBrowser)(owner, provider, visible, false);
                (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt);
                if (provider === 'douyin')
                    (0, account_browser_1.observeDouyinProfile)(attempt.runtime.page, async (profile) => {
                        try {
                            if (!alive(attempt) || attempt.committing)
                                return;
                            attempt.committing = true;
                            patch(attempt, { loginState: 'verifying' });
                            const cookie = await (0, account_browser_1.browserCookie)(attempt.runtime.context, provider), storage = await attempt.runtime.context.storageState();
                            (0, accounts_store_1.commitVideoSession)(owner, provider, attempt, cookie, profile, storage);
                            await finish(attempt);
                        }
                        catch (error) {
                            await finish(attempt, error);
                        }
                    });
                await attempt.runtime.page.goto(provider === 'douyin' ? 'https://www.douyin.com/' : 'https://www.bilibili.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                if (provider === 'bilibili') {
                    attempt.key = 'browser';
                    const login = attempt.runtime.page.getByText('登录', { exact: true }).first();
                    if (await login.isVisible())
                        await login.click({ timeout: 3000 });
                }
                else {
                    const login = attempt.runtime.page.getByText('登录', { exact: true }).first();
                    if (await login.isVisible())
                        await login.click({ timeout: 3000 });
                    patch(attempt, { loginState: visible ? 'needs_action' : 'waiting', error: visible ? '请在官方窗口完成登录' : '' });
                }
            }
            attempt.pending = poll(attempt);
            return (0, accounts_store_1.publicVideoAccount)(owner, provider);
        }
        catch (error) {
            await finish(attempt, error);
            await release(attempt);
            return (0, accounts_store_1.publicVideoAccount)(owner, provider);
        }
    })();
    starting.set(id, operation);
    void operation.finally(() => starting.delete(id));
    return operation;
}
async function cancelVideoLogin(owner, provider, attemptId) {
    const state = (0, accounts_store_1.videoAccount)(owner, provider);
    if (attemptId && state.attemptId !== attemptId)
        throw Object.assign(new Error('登录尝试已被其他窗口替代'), { statusCode: 409 });
    (0, accounts_store_1.writeVideoAccount)(owner, provider, { epoch: Number(state.epoch || 0) + 1, attemptId: null, loginState: 'cancelled', error: '' });
    (0, recommendations_1.closeVideoRecommendations)(owner, provider);
    (0, list_cache_1.clearVideoListCache)(owner, provider);
    (0, media_input_cache_1.clearVideoMediaInputs)(owner, provider);
    (0, access_1.revokeVideoMedia)(owner, provider);
    if (provider === 'douyin')
        await (0, douyin_library_session_1.closeDouyinLibrarySessions)(owner);
    const attempt = attempts.get(identity(owner, provider));
    if (attempt)
        await release(attempt);
    return (0, accounts_store_1.publicVideoAccount)(owner, provider);
}
async function logoutVideo(owner, provider) { (0, recommendations_1.closeVideoRecommendations)(owner, provider); (0, list_cache_1.clearVideoListCache)(owner, provider); (0, media_input_cache_1.clearVideoMediaInputs)(owner, provider); (0, accounts_store_1.clearVideoSession)(owner, provider); if (provider === 'douyin')
    await (0, douyin_library_session_1.closeDouyinLibrarySessions)(owner); (0, access_1.revokeVideoMedia)(owner, provider); const attempt = attempts.get(identity(owner, provider)); if (attempt)
    await release(attempt); if (provider === 'douyin') {
    await require('../douyin-mcp-bridge').resetDouyinOwnerRuntime(owner);
    if (owner === 'workspace')
        await require('../douyin').revokeDouyinLogin().catch(() => { });
} return (0, accounts_store_1.publicVideoAccount)(owner, provider); }
function videoQr(owner, provider, attemptId) { const attempt = attempts.get(identity(owner, provider)); if (!attempt || attempt.attemptId !== attemptId || !alive(attempt))
    throw Object.assign(new Error('二维码已取消或过期'), { statusCode: 409 }); (0, accounts_store_1.requireVideoAttempt)(owner, provider, attempt); return attempt.qr || null; }
async function verifyVideoAccount(owner, provider) { if (provider === 'douyin' && owner === 'workspace' && syncLegacyDouyin(owner))
    return (0, accounts_store_1.publicVideoAccount)(owner, provider); const epoch = (0, accounts_store_1.videoEpoch)(owner, provider); try {
    const profile = provider === 'bilibili' ? await (0, bilibili_account_1.refreshBiliProfile)(owner) : await (0, account_browser_1.readDouyinProfile)(owner);
    if ((0, accounts_store_1.videoEpoch)(owner, provider) !== epoch)
        throw new Error('账号已被替代');
    (0, accounts_store_1.writeVideoAccount)(owner, provider, { profile, status: 'authenticated', verifiedAt: Date.now(), error: '' });
    return (0, accounts_store_1.publicVideoAccount)(owner, provider);
}
catch (error) {
    if (error.state === 'login_required' && (0, accounts_store_1.videoEpoch)(owner, provider) === epoch)
        (0, accounts_store_1.writeVideoAccount)(owner, provider, { status: 'expired', error: safeError(error) });
    throw error;
} }
async function closeVideoAccounts() { await (await Promise.resolve().then(() => __importStar(require('../stream-playback-sessions')))).shutdownVideoStreams(); (0, recommendations_1.closeVideoRecommendations)(); await (0, douyin_library_session_1.closeDouyinLibrarySessions)(); await Promise.all([...attempts.values()].map(release)); attempts.clear(); }
function videoAccountStatus(owner, provider) { if (provider === 'douyin')
    syncLegacyDouyin(owner); const state = (0, accounts_store_1.videoAccount)(owner, provider), attempt = attempts.get(identity(owner, provider)); if (['preparing', 'waiting', 'confirming', 'verifying', 'needs_action'].includes(state.loginState) && !alive(attempt) && !starting.has(identity(owner, provider)))
    (0, accounts_store_1.writeVideoAccount)(owner, provider, { epoch: Number(state.epoch || 0) + 1, attemptId: null, loginState: 'failed', error: '服务重启或登录已中断，请重新登录' }); return (0, accounts_store_1.publicVideoAccount)(owner, provider); }
//# sourceMappingURL=account-login.js.map