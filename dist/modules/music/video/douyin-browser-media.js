"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDouyinMediaHints = clearDouyinMediaHints;
exports.rememberDouyinMediaHints = rememberDouyinMediaHints;
exports.trustedDouyinMediaUrl = trustedDouyinMediaUrl;
exports.selectDouyinBrowserMedia = selectDouyinBrowserMedia;
exports.resolveDouyinBrowserMedia = resolveDouyinBrowserMedia;
const account_browser_1 = require("./account-browser");
const accounts_store_1 = require("./accounts-store");
const douyin_browser_protocol_1 = require("./douyin-browser-protocol");
// 播放解析复用当前 CCM 用户的官方会话，签名地址只在服务端短期使用。
const MEDIA_HOSTS = ['douyinvod.com', 'douyin.com', 'zjcdn.com', 'bytecdn.cn', 'amemv.com'];
const hints = new Map();
const hintKey = (owner, id) => JSON.stringify([owner, id]);
function clearDouyinMediaHints(owner, id) {
    for (const [key, hint] of hints)
        if ((owner === undefined || hint.owner === owner) && (!id || key === hintKey(owner, id)))
            hints.delete(key);
}
function rememberDouyinMediaHints(owner, rows, userAgent) {
    for (const [key, hint] of hints)
        if (hint.expires <= Date.now())
            hints.delete(key);
    for (const row of rows) {
        const id = String(row?.aweme_id || '');
        if (!/^\d{10,24}$/.test(id))
            continue;
        try {
            const media = selectDouyinBrowserMedia({ status_code: 0, aweme_detail: row }, id);
            if (!media)
                continue;
            const key = hintKey(owner, id);
            hints.delete(key);
            hints.set(key, { owner, epoch: (0, accounts_store_1.videoEpoch)(owner, 'douyin'), expires: Date.now() + 60_000, media, userAgent });
            while (hints.size > 128)
                hints.delete(hints.keys().next().value);
        }
        catch { /* 图文或直播不作为普通视频缓存 */ }
    }
}
function trustedDouyinMediaUrl(raw) {
    if (typeof raw !== 'string')
        return false;
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && !url.port && !url.username && !url.password && MEDIA_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    }
    catch {
        return false;
    }
}
function selectDouyinBrowserMedia(data, id) {
    const item = data?.aweme_detail;
    if (data?.status_code !== 0 || String(item?.aweme_id) !== id)
        return null;
    const video = item.video;
    if (!video || item.is_live || item.images?.length)
        throw Object.assign(new Error('此内容不是可播放的普通视频'), { category: 'unsupported_stream' });
    const urls = [...(video.play_addr_h264?.url_list || []), ...(video.play_addr?.url_list || [])].filter(trustedDouyinMediaUrl);
    if (!urls.length)
        return null;
    return { videoCodec: video.play_addr_h264?.url_list?.length ? 'h264' : 'unknown', audioCodec: 'unknown', urls: [...new Set(urls)].slice(0, 4), durationSeconds: Number(video.duration || item.duration || 0) / 1000,
        title: String(item.desc || id).slice(0, 300), author: String(item.author?.nickname || '').slice(0, 150) };
}
async function resolveDouyinBrowserMedia(id, signal) {
    if (!/^\d{10,24}$/.test(id))
        throw new Error('抖音视频 ID 无效');
    if (signal?.aborted)
        throw Object.assign(new Error('视频准备已取消'), { name: 'AbortError' });
    const owner = (0, accounts_store_1.videoOwner)(), epoch = (0, accounts_store_1.videoEpoch)(owner, 'douyin');
    const hint = hints.get(hintKey(owner, id));
    if (hint && hint.epoch === epoch && hint.expires > Date.now() && hint.userAgent)
        return { ...hint.media, url: hint.media.urls[0], headers: { 'User-Agent': hint.userAgent, Referer: 'https://www.douyin.com/' } };
    hints.delete(hintKey(owner, id));
    const runtime = await (0, account_browser_1.createVideoBrowser)(owner, 'douyin');
    let media, unavailable;
    const abort = () => { void runtime.browser.close().catch(() => { }); };
    const listener = async (response) => {
        const url = (0, douyin_browser_protocol_1.douyinBrowserApiUrl)(response.url());
        if (!url || url.pathname !== '/aweme/v1/web/aweme/detail/' || url.searchParams.get('aweme_id') !== id)
            return;
        try {
            const result = selectDouyinBrowserMedia(await response.json(), id);
            if (result)
                media = result;
        }
        catch (error) {
            unavailable = error;
        }
    };
    signal?.addEventListener('abort', abort, { once: true });
    runtime.page.on('response', listener);
    try {
        if (signal?.aborted)
            throw Object.assign(new Error('视频准备已取消'), { name: 'AbortError' });
        // 官网自行发送带签名的 detail 请求；不构造签名或让 yt-dlp 猜测 Cookie。
        await runtime.page.route('**/*', (route) => ['media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue());
        await runtime.page.goto(`https://www.douyin.com/video/${id}`, { waitUntil: 'commit', timeout: 30_000 });
        const deadline = Date.now() + 35_000;
        while (!media && !unavailable && Date.now() < deadline && !signal?.aborted)
            await new Promise(resolve => setTimeout(resolve, 200));
        if (signal?.aborted)
            throw Object.assign(new Error('视频准备已取消'), { name: 'AbortError' });
        if ((0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch)
            throw Object.assign(new Error('平台账号已变化，请重新准备视频'), { category: 'login_required' });
        if (unavailable)
            throw unavailable;
        if (!media)
            throw Object.assign(new Error('抖音官网暂未返回此视频的播放资料，请重试或在官方窗口检查验证状态'), { category: 'source_unavailable' });
        const userAgent = await runtime.page.evaluate(() => globalThis.navigator.userAgent);
        return { ...media, url: media.urls[0], headers: { 'User-Agent': userAgent, Referer: 'https://www.douyin.com/' } };
    }
    finally {
        signal?.removeEventListener('abort', abort);
        runtime.page.off('response', listener);
        await runtime.browser.close().catch(() => { });
    }
}
//# sourceMappingURL=douyin-browser-media.js.map