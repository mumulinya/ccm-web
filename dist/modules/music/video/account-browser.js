"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserCookie = void 0;
exports.launchVideoBrowser = launchVideoBrowser;
exports.closeVideoBrowsers = closeVideoBrowsers;
exports.createVideoBrowser = createVideoBrowser;
exports.fetchDouyinSelfProfile = fetchDouyinSelfProfile;
exports.observeDouyinProfile = observeDouyinProfile;
exports.readDouyinProfile = readDouyinProfile;
const performance_1 = require("./performance");
const playwright_1 = require("playwright");
const accounts_store_1 = require("./accounts-store");
const douyin_browser_protocol_1 = require("./douyin-browser-protocol");
// 平台浏览器只使用独立上下文，绝不读取用户系统浏览器的 Cookie/Profile。
const browsers = new Set();
let launching = 0, draining = false;
async function launchVideoBrowser(visible = false) {
    if (draining || browsers.size + launching >= 6)
        throw Object.assign(new Error('平台浏览器繁忙，请稍后重试'), { statusCode: 429 });
    launching++;
    let failure;
    try {
        for (const options of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
            try {
                const browser = await playwright_1.chromium.launch({ ...options, headless: !visible, timeout: 15000, args: ['--disable-blink-features=AutomationControlled'] });
                browsers.add(browser);
                browser.on('disconnected', () => browsers.delete(browser));
                return browser;
            }
            catch (error) {
                failure = error;
            }
        }
        throw new Error('平台登录浏览器不可用，请安装 Edge/Chrome 或准备 Chromium 运行环境');
    }
    finally {
        launching--;
    }
}
async function closeVideoBrowsers() { draining = true; await Promise.all([...browsers].map(browser => browser.close().catch(() => { }))); browsers.clear(); }
async function createVideoBrowser(owner, provider, visible = false, useSession = true) {
    const started = Date.now(), browser = await launchVideoBrowser(visible);
    (0, performance_1.videoTiming)('browser_start', provider, started);
    try {
        const storage = useSession ? (0, accounts_store_1.videoStorage)(owner, provider) : undefined;
        // 保持登录和只读会话的 UA 一致；无头模式的 HeadlessChrome 标记会让
        // 抖音把相同的有效账号会话送到不同的页面。只调整正常浏览器标识，不处理验证码。
        let userAgent;
        if (provider === 'douyin' && !visible) {
            const session = await browser.newBrowserCDPSession();
            try {
                userAgent = (await session.send('Browser.getVersion')).userAgent.replace('HeadlessChrome/', 'Chrome/');
            }
            finally {
                await session.detach();
            }
        }
        const context = await browser.newContext({ ...(storage ? { storageState: storage } : {}), ...(userAgent ? { userAgent } : {}), viewport: { width: 1100, height: 820 }, locale: 'zh-CN' });
        // Douyin serves the profile and personal-list data through browser-only
        // signed requests. Keep the managed context close to a normal desktop
        // browser so a valid saved session is not mistaken for a logged-out one.
        await context.addInitScript(() => { try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        }
        catch { } });
        if (!storage && useSession) {
            const cookie = (0, accounts_store_1.videoCookie)(owner, provider);
            if (cookie)
                await context.addCookies(cookie.split(';').map(pair => { const equal = pair.indexOf('='); return { name: pair.slice(0, equal).trim(), value: pair.slice(equal + 1).trim(), domain: provider === 'douyin' ? '.douyin.com' : '.bilibili.com', path: '/' }; }).filter(c => c.name));
        }
        return { browser, context, page: await context.newPage() };
    }
    catch (error) {
        await browser.close();
        throw error;
    }
}
const browserCookie = async (context, provider) => (await context.cookies()).filter(c => c.domain === provider + '.com' || c.domain.endsWith('.' + provider + '.com')).map(c => c.name + '=' + c.value).join('; ');
exports.browserCookie = browserCookie;
function douyinSelfProfile(data) {
    const user = data?.user || data?.user_info || data?.data?.user;
    return data?.status_code === 0 && user?.sec_uid && user?.nickname ? { id: user.sec_uid, name: user.nickname, avatar: user.avatar_thumb?.url_list?.[0] || user.avatar_larger?.url_list?.[0] || '' } : null;
}
async function fetchDouyinSelfProfile(page) {
    const data = await page.evaluate(async () => { try {
        return await (await fetch('/aweme/v1/web/user/profile/self/?device_platform=webapp&aid=6383&channel=channel_pc_web', { signal: AbortSignal.timeout(10000) })).json();
    }
    catch {
        return null;
    } }).catch(() => null);
    return douyinSelfProfile(data);
}
function observeDouyinProfile(page, onProfile) {
    const listener = async (response) => {
        try {
            const url = (0, douyin_browser_protocol_1.douyinBrowserApiUrl)(response.url());
            if (!url || url.pathname !== '/aweme/v1/web/user/profile/self/')
                return;
            const profile = douyinSelfProfile(await response.json());
            if (profile)
                onProfile(profile);
        }
        catch { }
    };
    page.on('response', listener);
    return () => page.off('response', listener);
}
async function readDouyinProfile(owner) {
    const epoch = (0, accounts_store_1.videoEpoch)(owner, 'douyin'), runtime = await createVideoBrowser(owner, 'douyin');
    let profile;
    const stop = observeDouyinProfile(runtime.page, value => profile = value);
    try {
        await runtime.page.goto('https://www.douyin.com/user/self?from_nav=1', { waitUntil: 'commit', timeout: 30000 });
        await runtime.page.locator('body').waitFor({ state: 'attached', timeout: 30000 });
        // SSR 页面不一定再次请求 self 资料，主动使用同一隔离会话核验官方
        // self 接口；不能把公开 other 资料或页面里出现昵称当作登录证明。
        profile = profile || await fetchDouyinSelfProfile(runtime.page);
        const deadline = Date.now() + 15000;
        while (!profile && Date.now() < deadline)
            await new Promise(resolve => setTimeout(resolve, 500));
        if ((0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch)
            throw Object.assign(new Error('账号已退出或被替代'), { statusCode: 409 });
        if (!profile) {
            throw Object.assign(new Error('抖音暂未返回可核验的当前账号资料，请稍后重试或在官方窗口检查登录状态'), { state: 'verification_unavailable', statusCode: 502 });
        }
        return profile;
    }
    finally {
        stop();
        await runtime.browser.close();
    }
}
//# sourceMappingURL=account-browser.js.map