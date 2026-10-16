"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoCoverTarget = videoCoverTarget;
exports.registerVideoArtwork = registerVideoArtwork;
exports.sendVideoArtwork = sendVideoArtwork;
const platform_http_1 = require("../platform-http");
// 图片地址来自平台资料，仅同源身份入口可读取，凭据不发送给 CDN。
const targets = new Map(), cache = new Map(), pending = new Map();
const key = (owner, provider, id) => JSON.stringify([owner, provider, id]);
let bytes = 0, active = 0;
const waiting = [];
function videoCoverTarget(provider, value) { const url = new URL(value.startsWith('//') ? 'https:' + value : value); if (url.protocol === 'http:')
    url.protocol = 'https:'; const host = url.hostname.toLowerCase(); if (url.protocol !== 'https:' || url.username || url.password || url.port || !(provider === 'bilibili' ? /(^|\.)hdslb\.com$/.test(host) : /(^|\.)(douyinpic\.com|byteimg\.com|ibytedtos\.com|douyincdn\.com|pstatp\.com|snssdk\.com|douyinvod\.com|iesdouyin\.com|toutiaoimg\.com|bytecdn\.cn)$/.test(host)))
    throw new Error('视频封面来源未授权'); return url.href; }
function registerVideoArtwork(owner, provider, id, url) { if (!url)
    return ''; try {
    const target = videoCoverTarget(provider, url), identity = key(owner, provider, id);
    targets.delete(identity);
    targets.set(identity, { url: target, expires: Date.now() + 10 * 60_000 });
    while (targets.size > 2048)
        targets.delete(targets.keys().next().value);
    return '/api/music/video/cover?provider=' + provider + '&sourceId=' + encodeURIComponent(id);
}
catch {
    return '';
} }
async function sendVideoArtwork(owner, provider, id, res) {
    const target = targets.get(key(owner, provider, id));
    if (!target || target.expires < Date.now())
        throw Object.assign(new Error('封面资料已过期，请刷新视频资料'), { statusCode: 404 });
    const previous = cache.get(target.url);
    let result;
    if (previous && previous.expires > Date.now())
        result = previous;
    else {
        if (!pending.has(target.url)) {
            if (pending.size >= 128)
                throw Object.assign(new Error('封面请求较多，请稍后重试'), { statusCode: 429 });
            const operation = (async () => {
                if (active >= 4)
                    await new Promise(resolve => waiting.push(resolve));
                else
                    active++;
                try {
                    const url = new URL(target.url), image = await (0, platform_http_1.musicPlatformRequest)({ url: url.href, allowedHosts: [url.hostname], headers: { 'User-Agent': 'Mozilla/5.0', Referer: provider === 'bilibili' ? 'https://www.bilibili.com/' : 'https://www.douyin.com/' }, maxBytes: 8 * 1024 * 1024, timeoutMs: 10000, retries: 1 }), mime = String(image.headers['content-type'] || '').split(';')[0];
                    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(mime))
                        throw new Error('平台未返回有效封面');
                    const value = { buffer: image.buffer, mime, expires: Date.now() + 10 * 60_000 };
                    const old = cache.get(target.url);
                    if (old) {
                        bytes -= old.buffer.length;
                        cache.delete(target.url);
                    }
                    while (cache.size && (cache.size >= 128 || bytes + image.buffer.length > 16 * 1024 * 1024)) {
                        const first = cache.keys().next().value;
                        bytes -= cache.get(first).buffer.length;
                        cache.delete(first);
                    }
                    cache.set(target.url, value);
                    bytes += image.buffer.length;
                    return value;
                }
                finally {
                    const next = waiting.shift();
                    if (next)
                        next();
                    else
                        active--;
                }
            })();
            pending.set(target.url, operation);
            void operation.finally(() => pending.delete(target.url)).catch(() => { });
        }
        result = await pending.get(target.url);
    }
    res.writeHead(200, { 'Content-Type': result.mime, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
    res.end(result.buffer);
}
//# sourceMappingURL=artwork.js.map