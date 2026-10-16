"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.douyinQrStart = douyinQrStart;
exports.douyinQrPoll = douyinQrPoll;
const platform_http_1 = require("../platform-http");
const DOUYIN_HOME = 'https://www.douyin.com';
const SSO_BASE = 'https://sso.douyin.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';
const ALLOWED_HOSTS = ['sso.douyin.com', 'www.douyin.com', 'douyin.com', 'open.douyin.com'];
function cookieHeader(headers) {
    const raw = headers['set-cookie'];
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return rows.map(value => String(value).split(';', 1)[0].trim()).filter(value => /^[^=;\s]+=.+$/.test(value)).join('; ');
}
function mergeCookies(...values) {
    const map = new Map();
    for (const value of values)
        for (const part of String(value || '').split(';')) {
            const index = part.indexOf('=');
            if (index <= 0)
                continue;
            map.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
        }
    return [...map].map(([name, value]) => `${name}=${value}`).join('; ');
}
async function douyinQrStart() {
    const query = new URLSearchParams({ aid: '6383', service: DOUYIN_HOME, next: DOUYIN_HOME });
    const data = await (0, platform_http_1.musicPlatformJson)({
        url: `${SSO_BASE}/get_qrcode/?${query}`,
        headers: { 'User-Agent': USER_AGENT, Referer: DOUYIN_HOME, Accept: 'application/json, text/plain, */*' },
        allowedHosts: ALLOWED_HOSTS,
        timeoutMs: 10_000,
        maxBytes: 512 * 1024,
        retries: 1,
    });
    const token = String(data?.data?.token || '');
    const qrcodeUrl = String(data?.data?.qrcode_index_url || '');
    let qrHost = '';
    try {
        qrHost = new URL(qrcodeUrl).hostname.toLowerCase();
    }
    catch { }
    if (Number(data?.error_code || 0) !== 0 || !token || !/^https:\/\//i.test(qrcodeUrl) || !/(^|\.)douyin\.com$/.test(qrHost))
        throw Object.assign(new Error('抖音暂未返回可用登录二维码，请打开官方登录窗口重试'), { state: 'capability_unavailable' });
    return { token, qrcodeUrl };
}
async function douyinQrPoll(token) {
    const query = new URLSearchParams({ token, aid: '6383', service: DOUYIN_HOME });
    const response = await (0, platform_http_1.musicPlatformRequest)({
        url: `${SSO_BASE}/check_qrconnect/?${query}`,
        headers: { 'User-Agent': USER_AGENT, Referer: DOUYIN_HOME, Accept: 'application/json, text/plain, */*' },
        allowedHosts: ALLOWED_HOSTS,
        timeoutMs: 10_000,
        maxBytes: 512 * 1024,
        retries: 1,
    });
    let data;
    try {
        data = JSON.parse(response.text);
    }
    catch {
        throw new Error('抖音登录状态响应无效');
    }
    let cookie = cookieHeader(response.headers);
    const status = String(data?.data?.status || '');
    const redirectUrl = String(data?.data?.redirect_url || '');
    if (status === '5' && redirectUrl) {
        try {
            const redirected = await (0, platform_http_1.musicPlatformRequest)({
                url: redirectUrl,
                headers: { 'User-Agent': USER_AGENT, Referer: DOUYIN_HOME, Accept: 'text/html,application/xhtml+xml' },
                allowedHosts: ALLOWED_HOSTS,
                timeoutMs: 10_000,
                maxBytes: 512 * 1024,
                retries: 0,
            });
            cookie = mergeCookies(cookie, cookieHeader(redirected.headers));
        }
        catch { /* 平台可能在后续首页响应才下发 Cookie，继续尝试首页 */ }
    }
    if (status === '5' && cookie && !/sessionid(?:_ss)?=/i.test(cookie)) {
        try {
            const home = await (0, platform_http_1.musicPlatformRequest)({
                url: DOUYIN_HOME,
                headers: { 'User-Agent': USER_AGENT, Referer: DOUYIN_HOME, Cookie: cookie },
                allowedHosts: ALLOWED_HOSTS,
                timeoutMs: 10_000,
                maxBytes: 512 * 1024,
                retries: 0,
            });
            cookie = mergeCookies(cookie, cookieHeader(home.headers));
        }
        catch { /* keep the explicit missing-session error below */ }
    }
    return { status, code: status === '5' ? 0 : status === '2' ? 2 : status === '1' ? 1 : 3, cookie, redirectUrl };
}
//# sourceMappingURL=douyin-account.js.map