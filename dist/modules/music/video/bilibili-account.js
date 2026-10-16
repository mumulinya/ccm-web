"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.biliRead = biliRead;
exports.verifyBiliAccount = verifyBiliAccount;
exports.biliQrStart = biliQrStart;
exports.biliQrPoll = biliQrPoll;
exports.refreshBiliProfile = refreshBiliProfile;
const platform_http_1 = require("../platform-http");
const accounts_store_1 = require("./accounts-store");
// B站账号只读接口，凭据仅发往 B站 API，不转发至图片或媒体 CDN。
const ua = 'Mozilla/5.0';
async function biliRead(owner, endpoint, params = {}, cookie = (0, accounts_store_1.videoCookie)(owner, 'bilibili'), signal) {
    const url = new URL('https://api.bilibili.com' + endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const data = await (0, platform_http_1.musicPlatformJson)({ url: url.href, allowedHosts: ['api.bilibili.com'], headers: { 'User-Agent': ua, Referer: 'https://www.bilibili.com/', ...(cookie ? { Cookie: cookie } : {}) }, maxBytes: 4 * 1024 * 1024, timeoutMs: 15000, retries: 1, signal });
    if (data.code !== 0)
        throw Object.assign(new Error(data.message || 'B站请求失败'), { statusCode: data.code === -101 ? 401 : 422, state: data.code === -101 ? 'login_required' : [-352, -412].includes(data.code) ? 'risk_controlled' : 'unavailable' });
    return data.data;
}
async function verifyBiliAccount(owner, cookie) {
    const data = await biliRead(owner, '/x/web-interface/nav', {}, cookie);
    if (!data.isLogin || !data.mid || !data.uname)
        throw Object.assign(new Error('B站登录已过期'), { statusCode: 401, state: 'login_required' });
    return { id: String(data.mid), name: data.uname, avatar: data.face };
}
async function biliQrStart() {
    const data = await (0, platform_http_1.musicPlatformJson)({ url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate', allowedHosts: ['passport.bilibili.com'], headers: { 'User-Agent': ua, Referer: 'https://www.bilibili.com/' }, timeoutMs: 15000 });
    if (data.code !== 0 || typeof data.data?.qrcode_key !== 'string' || data.data.qrcode_key.length > 256 || !data.data?.url)
        throw new Error('B站未生成有效登录二维码');
    const target = new URL(data.data.url);
    if (target.protocol !== 'https:' || target.hostname !== 'passport.bilibili.com' || target.username || target.password || target.port)
        throw new Error('B站登录二维码地址无效');
    return data.data;
}
async function biliQrPoll(key) {
    const result = await (0, platform_http_1.musicPlatformRequest)({ url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=' + encodeURIComponent(key), allowedHosts: ['passport.bilibili.com'], headers: { 'User-Agent': ua, Referer: 'https://www.bilibili.com/' }, timeoutMs: 15000, maxBytes: 1024 * 1024 });
    const data = JSON.parse(result.text);
    if (data.code !== 0 || !data.data)
        throw new Error(data.message || 'B站扫码状态读取失败');
    const raw = result.headers['set-cookie'], cookies = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(value => String(value).split(';')[0]).join('; ');
    return { ...data.data, cookies };
}
async function refreshBiliProfile(owner) {
    const epoch = (0, accounts_store_1.videoEpoch)(owner, 'bilibili');
    try {
        const profile = await verifyBiliAccount(owner);
        if ((0, accounts_store_1.videoEpoch)(owner, 'bilibili') !== epoch)
            throw new Error('账号会话已变化');
        (0, accounts_store_1.writeVideoAccount)(owner, 'bilibili', { profile, verifiedAt: Date.now(), status: 'authenticated', error: '' });
        return profile;
    }
    catch (error) {
        if (error.state === 'login_required' && (0, accounts_store_1.videoEpoch)(owner, 'bilibili') === epoch)
            (0, accounts_store_1.writeVideoAccount)(owner, 'bilibili', { status: 'expired', error: error.message });
        throw error;
    }
}
//# sourceMappingURL=bilibili-account.js.map