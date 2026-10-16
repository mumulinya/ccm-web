"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDouyinRecommendationReader = createDouyinRecommendationReader;
const account_browser_1 = require("./account-browser");
const accounts_store_1 = require("./accounts-store");
const douyin_browser_protocol_1 = require("./douyin-browser-protocol");
const recommendation_protocol_1 = require("./recommendation-protocol");
const douyin_mcp_bridge_1 = require("../douyin-mcp-bridge");
const douyin_browser_media_1 = require("./douyin-browser-media");
const performance_1 = require("./performance");
// 推荐分页跟随官网原始请求顺序，不重放或构造平台签名、游标。
async function createDouyinRecommendationReader(owner) {
    const epoch = (0, accounts_store_1.videoEpoch)(owner, 'douyin'), runtime = await (0, account_browser_1.createVideoBrowser)(owner, 'douyin');
    const pages = [], seen = new Set(), order = new WeakMap(), requestTimes = new WeakMap(), pending = new Map();
    let error, started = false, closed = false, mismatch = false, verified = false, requested = 0, completed = 0, profileAttempted = false, feedKind = '';
    const profileCheck = (profile) => { if (profile?.id !== (0, accounts_store_1.videoAccount)(owner, 'douyin').profile?.id)
        mismatch = true;
    else
        verified = true; };
    const stopProfile = (0, account_browser_1.observeDouyinProfile)(runtime.page, profileCheck);
    // 官网会在同一 feed 上混用短二进制响应和 JSON 列表。跳过不可读响应槽位，
    // 继续等待官网自己的后续请求；不把不可读数据解释为空列表或猜测 protobuf 字段。
    const flush = () => { while (pending.has(completed)) {
        const value = pending.get(completed);
        pending.delete(completed++);
        if (value && !seen.has(value.ids)) {
            seen.add(value.ids);
            if (pages.length < 16)
                pages.push({ items: value.items, more: value.more, sourceLabel: value.sourceLabel });
        }
    } };
    const feedUrl = (value) => ['/aweme/v1/web/tab/feed/', '/aweme/v2/web/module/feed/'].includes((0, douyin_browser_protocol_1.douyinBrowserApiUrl)(value)?.pathname || '');
    const requestListener = (request) => { const pathname = (0, douyin_browser_protocol_1.douyinBrowserApiUrl)(request.url())?.pathname; if (requested < 64 && feedUrl(request.url()) && (!feedKind || feedKind === pathname)) {
        feedKind = pathname;
        order.set(request, requested++);
        requestTimes.set(request, Date.now());
    } };
    const failedListener = (request) => { const sequence = order.get(request); if (sequence === undefined || closed)
        return; pending.set(sequence, null); flush(); };
    runtime.page.on('request', requestListener);
    runtime.page.on('requestfailed', failedListener);
    await runtime.context.route('**/*', (route) => { const req = route.request(), url = new URL(req.url()); return ['media', 'font'].includes(req.resourceType()) || /\.(?:mp4|m4s|m3u8|ts)$/.test(url.pathname) || url.hostname.endsWith('douyinvod.com') ? route.abort() : route.continue(); });
    const listener = async (response) => {
        try {
            if (closed || pages.length >= 16 || !feedUrl(response.url()) || order.get(response.request()) === undefined)
                return;
            (0, performance_1.videoTiming)('recommend_response', 'douyin', requestTimes.get(response.request()) || Date.now());
            let body;
            try {
                body = await response.json();
            }
            catch {
                throw Object.assign(new Error('抖音已返回二进制推荐数据，当前适配暂不支持此格式；登录状态已保留，可使用其他列表或稍后重试'), { state: 'capability_unavailable', statusCode: 422 });
            }
            (0, performance_1.videoTiming)('recommend_json', 'douyin', requestTimes.get(response.request()) || Date.now());
            const raw = (0, recommendation_protocol_1.douyinRecommendationRows)(body), ids = body.aweme_list.map(row => row.aweme_id).join(',');
            if (closed || mismatch || (0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch)
                return;
            (0, douyin_browser_media_1.rememberDouyinMediaHints)(owner, raw, response.request().headers()['user-agent'] || '');
            const rows = (0, douyin_mcp_bridge_1.normalizeDouyinRows)({ aweme_list: raw }).map(row => ({ ...row, type: 'douyin' }));
            const sequence = order.get(response.request());
            if (sequence === undefined)
                return;
            pending.set(sequence, { ids, items: rows, more: body.has_more === 1 || body.has_more === true, sourceLabel: feedKind === '/aweme/v2/web/module/feed/' ? '抖音网页版精选推荐' : '抖音网页版推荐' });
            flush();
        }
        catch (e) {
            error = e;
            const sequence = order.get(response.request());
            if (sequence !== undefined && !closed) {
                pending.set(sequence, null);
                flush();
            }
        }
    };
    runtime.page.on('response', listener);
    return {
        alive: () => !closed && !runtime.page.isClosed(),
        async read(index, signal) {
            if (signal.aborted)
                throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
            if (closed || runtime.page.isClosed())
                throw Object.assign(new Error('推荐读取会话已失效，请换一批'), { state: 'pagination_expired', statusCode: 409 });
            const abort = () => { closed = true; void runtime.browser.close().catch(() => { }); };
            signal.addEventListener('abort', abort, { once: true });
            try {
                if (!started) {
                    started = true;
                    await runtime.page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await runtime.page.mouse.move(750, 600);
                    if (!pages.length)
                        await runtime.page.mouse.wheel(0, 650);
                }
                const deadline = Date.now() + (index === 0 ? 90000 : 45000);
                let moves = 0, lastMove = 0;
                while (Date.now() < deadline) {
                    if (signal.aborted)
                        throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
                    if (mismatch || (0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch)
                        throw Object.assign(new Error('平台账号已变化，请重新进入推荐'), { state: 'account_changed', statusCode: 409 });
                    if (pages[index]) {
                        if (!verified && !profileAttempted) {
                            profileAttempted = true;
                            const profile = await (0, account_browser_1.fetchDouyinSelfProfile)(runtime.page);
                            if (profile)
                                profileCheck(profile);
                        }
                        if (mismatch)
                            throw Object.assign(new Error('推荐会话不属于当前抖音账号，请重新核验'), { state: 'account_changed', statusCode: 409 });
                        if (verified)
                            return pages[index];
                    }
                    const title = await runtime.page.title();
                    if (/验证码|验证中心/.test(title))
                        throw Object.assign(new Error('抖音推荐需要官方验证码，请在账号面板完成官方验证后重试'), { state: 'risk_controlled', statusCode: 422 });
                    if (index > 0 && Date.now() - lastMove > 500 && moves < 40) {
                        lastMove = Date.now();
                        moves++;
                        await runtime.page.mouse.move(750, 600);
                        await runtime.page.mouse.wheel(0, 650);
                    }
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                if (pages[index] && !verified)
                    throw Object.assign(new Error('推荐已返回，但当前抖音会话未能核验账号，请核验账号后重试'), { state: 'verification_unavailable', statusCode: 502 });
                throw error || Object.assign(new Error(requested ? '抖音推荐请求已发出，但平台未在限定时间返回可读列表，请重试原平台' : '抖音官网尚未加载出推荐请求，请重试；账号登录状态已保留'), { state: 'platform_load_timeout', statusCode: 504 });
            }
            catch (e) {
                if (/验证码|验证中心/.test(await runtime.page.title().catch(() => '')))
                    throw Object.assign(new Error('抖音推荐需要官方验证码，请在账号面板完成官方验证后重试'), { state: 'risk_controlled', statusCode: 422 });
                throw e;
            }
            finally {
                signal.removeEventListener('abort', abort);
            }
        },
        async close() { closed = true; stopProfile(); runtime.page.off('request', requestListener); runtime.page.off('requestfailed', failedListener); runtime.page.off('response', listener); await runtime.browser.close().catch(() => { }); }
    };
}
//# sourceMappingURL=douyin-recommendations.js.map