"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neteaseCoverRelayUrl = neteaseCoverRelayUrl;
exports.readFoliaCover = readFoliaCover;
const platform_http_1 = require("../platform-http");
const cover_image_1 = require("./cover-image");
const cache = new Map();
const pending = new Map();
const unavailableUntil = new Map();
let cacheBytes = 0, active = 0;
const waiting = [];
const LIMIT = 16 * 1024 * 1024;
function neteaseCoverRelayUrl(url) {
    if (!/^[ps][1-9]\d?\.music\.126\.net$/.test(url.hostname)
        || url.protocol !== 'https:' || url.username || url.password || url.port
        || !/^\/[A-Za-z0-9_-]{20,32}={0,2}\/\d{3,30}\.(jpg|jpeg|png|webp|gif)$/i.test(url.pathname)
        || [...url.searchParams].some(([key, value]) => key !== 'param' || !/^\d{1,4}y\d{1,4}$/.test(value)))
        throw new Error('备用读取仅支持网易云公开封面地址');
    return 'https://wsrv.nl/?url=' + encodeURIComponent(url.toString());
}
function requireImage(result) {
    const mime = (0, cover_image_1.foliaImageMime)(result.headers['content-type'], result.buffer);
    if (result.statusCode !== 200 || !/^image\/(jpeg|png|webp|gif|avif)$/.test(mime))
        throw new Error('音乐平台未返回有效封面');
    return { ...result, headers: { ...result.headers, 'content-type': mime } };
}
function remember(key, result) {
    while (cache.size && (cache.size >= 128 || cacheBytes + result.buffer.length > LIMIT)) {
        const first = cache.keys().next().value;
        cacheBytes -= cache.get(first).result.buffer.length;
        cache.delete(first);
    }
    if (result.buffer.length <= LIMIT) {
        cache.set(key, { result, expires: Date.now() + 10 * 60_000 });
        cacheBytes += result.buffer.length;
    }
    return result;
}
// 不让一面歌单同时重复打向失败 CDN；同图去重，最多四个图片传输。
async function readFoliaCover(url, relayEnabled = false) {
    const relay = relayEnabled && /^[ps][1-9]\d?\.music\.126\.net$/.test(url.hostname);
    const key = JSON.stringify([url.toString(), relay]);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
        cache.delete(key);
        cache.set(key, cached);
        return cached.result;
    }
    if (cached) {
        cacheBytes -= cached.result.buffer.length;
        cache.delete(key);
    }
    if (pending.has(key))
        return pending.get(key);
    if (pending.size >= 128)
        throw Object.assign(new Error('封面请求较多，请稍后重试'), { statusCode: 429 });
    const operation = (async () => {
        if (active >= 4)
            await new Promise(resolve => waiting.push(resolve));
        else
            active++;
        try {
            let failure;
            if (!relay || !(unavailableUntil.get(url.hostname) > Date.now())) {
                try {
                    const result = requireImage(await (0, platform_http_1.musicPlatformRequest)({ url: url.toString(), allowedHosts: [url.hostname],
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url.hostname.endsWith('126.net') ? 'https://music.163.com/' : url.hostname === 'y.gtimg.cn' ? 'https://y.qq.com/' : url.hostname.endsWith('.kuwo.cn') ? 'https://bodian.kuwo.cn/' : 'https://www.kugou.com/' },
                        timeoutMs: relay ? 5000 : 10000, retries: relay ? 0 : 1, maxBytes: 8 * 1024 * 1024 }));
                    unavailableUntil.delete(url.hostname);
                    return remember(key, { ...result, coverReader: 'direct' });
                }
                catch (error) {
                    failure = error;
                    if (!relay || (error.status && !['timeout', 'unavailable'].includes(error.status)) || !error.status)
                        throw error;
                    unavailableUntil.set(url.hostname, Date.now() + 30_000);
                }
            }
            try {
                const target = neteaseCoverRelayUrl(url);
                const result = requireImage(await (0, platform_http_1.musicPlatformRequest)({ url: target, allowedHosts: ['wsrv.nl'],
                    headers: { 'User-Agent': 'CCM/5.0.0' }, timeoutMs: 10000, retries: 1, maxBytes: 8 * 1024 * 1024 }));
                return remember(key, { ...result, coverReader: 'wsrv' });
            }
            catch (error) {
                throw Object.assign(new Error(`网易云原图直连失败，备用图片读取也失败：${error.message}`), { status: error.status || failure?.status || 'unavailable' });
            }
        }
        finally {
            const next = waiting.shift();
            if (next)
                next();
            else
                active--;
        }
    })();
    pending.set(key, operation);
    try {
        return await operation;
    }
    finally {
        pending.delete(key);
    }
}
//# sourceMappingURL=cover-reader.js.map