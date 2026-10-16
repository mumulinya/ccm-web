"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDouyinLibrarySessions = void 0;
exports.readDouyinPersonalLibrary = readDouyinPersonalLibrary;
const accounts_store_1 = require("./accounts-store");
const douyin_mcp_bridge_1 = require("../douyin-mcp-bridge");
const douyin_browser_protocol_1 = require("./douyin-browser-protocol");
const douyin_library_session_1 = require("./douyin-library-session");
var douyin_library_session_2 = require("./douyin-library-session");
Object.defineProperty(exports, "closeDouyinLibrarySessions", { enumerable: true, get: function () { return douyin_library_session_2.closeDouyinLibrarySessions; } });
// 只监听官网浏览器实际发送的请求，不复制签名、不改写平台请求或账号凭据。
async function readDouyinPersonalLibrary(owner, kind, cursor, signal, refresh = false) {
    if (!Object.hasOwn(douyin_browser_protocol_1.DOUYIN_LIST_PATHS, kind))
        throw new Error('不支持的抖音列表');
    if (cursor === '0')
        cursor = '';
    cursor = (0, douyin_library_session_1.validDouyinCursor)(owner, kind, cursor);
    const session = await (0, douyin_library_session_1.acquireDouyinLibrarySession)(owner, kind, cursor, refresh), { runtime, epoch, pages: responses } = session;
    const target = cursor || '0';
    let completed = false;
    const abort = () => { void runtime.browser.close().catch(() => { }); };
    signal?.addEventListener('abort', abort, { once: true });
    const checkAccount = () => {
        if (signal?.aborted)
            throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
        if ((0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch)
            throw Object.assign(new Error('账号已退出或替换'), { statusCode: 409, state: 'account_changed' });
    };
    try {
        // 保留官网初始化所需资源；不批量拦截图片，以免打断页面自身的加载探测。
        if (session.fresh)
            await runtime.context.route('**/*', (route) => ['media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue());
        // showTab=like 的 SSR 可显示已选中，却未触发客户端取数；从主页真实切换标签。
        const address = kind === 'following' ? 'https://www.douyin.com/follow' : 'https://www.douyin.com/user/self?from_nav=1';
        if (session.fresh) {
            await runtime.page.goto(address, { waitUntil: 'commit', timeout: 30000 });
            session.fresh = false;
        }
        const label = kind === 'posts' ? '作品' : kind === 'likes' ? '喜欢' : '收藏';
        // 翻页时顶部标签可能已被官网滚动布局收起，不能再次等待它可见或把视口拉回顶部。
        const tab = kind === 'following' || cursor ? null : runtime.page.getByRole('tab', { name: new RegExp('^' + label + '(?:\\s|\\d|$)') }).first();
        if (!responses.get(target)?.parsed && tab)
            await tab.waitFor({ state: 'visible', timeout: 45000 });
        const deadline = Date.now() + 75000;
        let lastClick = 0;
        while (Date.now() < deadline) {
            checkAccount();
            const result = responses.get(target);
            if (result?.parsed) {
                const parsed = result.parsed;
                const rows = (0, douyin_mcp_bridge_1.normalizeDouyinRows)({ aweme_list: parsed.rows });
                // 平台列表保留原顺序和完整页；个人播放凭证由现有 API 按当前用户签发。
                completed = true;
                return { items: rows.map(row => ({ ...row, type: 'douyin' })), nextCursor: parsed.nextCursor ? `${session.nonce}:${parsed.nextCursor}` : null };
            }
            if (tab && await tab.getAttribute('aria-selected').catch(() => null) !== 'true' && Date.now() - lastClick > 1500) {
                lastClick = Date.now();
                await tab.click({ timeout: 3000 }).catch(() => { });
            }
            if (cursor) {
                // wheel 默认位于左侧导航，滚不到实际列表；滚动内容所在的真实容器。
                await runtime.page.evaluate(() => {
                    const lists = Array.from(globalThis.document.querySelectorAll('[data-e2e="scroll-list"]'));
                    const list = lists.find(node => node.getBoundingClientRect().height > 0);
                    list?.lastElementChild?.scrollIntoView({ block: 'end' });
                }).catch(() => { });
                await runtime.page.mouse.move(750, 650);
                await runtime.page.mouse.wheel(0, 900);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        checkAccount();
        if (responses.get(target)?.error)
            throw responses.get(target).error;
        if (tab && await tab.getAttribute('aria-selected').catch(() => null) !== 'true')
            throw Object.assign(new Error('抖音官方页面尚未完成加载，无法切换到' + label + '列表，请重试'), { state: 'platform_load_timeout', statusCode: 504 });
        throw Object.assign(new Error('抖音未在限定时间返回此列表，请重试原列表；当前登录会话已保留'), { state: 'platform_load_timeout', statusCode: 504 });
    }
    catch (error) {
        if (signal?.aborted)
            throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
        if (error?.name === 'TimeoutError')
            throw Object.assign(new Error('抖音官方个人页面加载超时，请重试；当前登录会话已保留'), { state: 'platform_load_timeout', statusCode: 504 });
        throw error;
    }
    finally {
        signal?.removeEventListener('abort', abort);
        await (0, douyin_library_session_1.releaseDouyinLibrarySession)(session, signal?.aborted || !completed && !cursor);
    }
}
//# sourceMappingURL=douyin-library.js.map