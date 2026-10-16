"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDouyinLibrarySessions = closeDouyinLibrarySessions;
exports.acquireDouyinLibrarySession = acquireDouyinLibrarySession;
exports.releaseDouyinLibrarySession = releaseDouyinLibrarySession;
exports.validDouyinCursor = validDouyinCursor;
const crypto_1 = require("crypto");
const account_browser_1 = require("./account-browser");
const accounts_store_1 = require("./accounts-store");
const douyin_browser_protocol_1 = require("./douyin-browser-protocol");
const douyin_browser_media_1 = require("./douyin-browser-media");
const sessions = new Map();
const creating = new Set();
let stopping = false;
const keyFor = (owner, kind) => JSON.stringify([owner, kind]);
const IDLE_MS = 300_000, MAX_SESSIONS = 3, MAX_PAGES = 16;
async function dispose(session) {
    if (session.closed)
        return;
    session.closed = true;
    clearTimeout(session.timer);
    if (sessions.get(keyFor(session.owner, session.kind)) === session)
        sessions.delete(keyFor(session.owner, session.kind));
    session.runtime.page.off('response', session.listener);
    await session.runtime.browser.close().catch(() => { });
    session.pages.clear();
    session.cursors.clear();
}
async function closeDouyinLibrarySessions(owner) {
    (0, douyin_browser_media_1.clearDouyinMediaHints)(owner);
    if (owner === undefined)
        stopping = true;
    await Promise.all([...sessions.values()].filter(session => owner === undefined || session.owner === owner).map(dispose));
}
// 延续官网自身分页状态与签名；尤其关注流的 cursor 不能在重新打开的页面中重建。
async function acquireDouyinLibrarySession(owner, kind, cursor, refresh = false) {
    if (stopping)
        throw Object.assign(new Error('平台读取服务正在关闭'), { statusCode: 503 });
    const key = keyFor(owner, kind), epoch = (0, accounts_store_1.videoEpoch)(owner, 'douyin');
    if (creating.has(key))
        throw Object.assign(new Error('此列表正在打开，请稍后重试'), { state: 'reading', statusCode: 409 });
    let session = sessions.get(key);
    if (session?.busy)
        throw Object.assign(new Error('此列表正在读取，请稍后重试'), { state: 'reading', statusCode: 409 });
    if (session && (session.epoch !== epoch)) {
        await dispose(session);
        session = undefined;
    }
    if (cursor && (!session || !session.cursors.has(cursor)))
        throw Object.assign(new Error('列表翻页会话已过期，请刷新此列表后继续'), { state: 'pagination_expired', statusCode: 409 });
    if (!session) {
        if (sessions.size + creating.size >= MAX_SESSIONS) {
            const idle = [...sessions.values()].filter(value => !value.busy).sort((a, b) => a.used - b.used)[0];
            if (!idle)
                throw Object.assign(new Error('个人列表读取繁忙，请稍后重试'), { statusCode: 429 });
            await dispose(idle);
        }
        creating.add(key);
        let runtime;
        try {
            runtime = await (0, account_browser_1.createVideoBrowser)(owner, 'douyin');
        }
        finally {
            creating.delete(key);
        }
        if (stopping || (0, accounts_store_1.videoEpoch)(owner, 'douyin') !== epoch) {
            await runtime.browser.close();
            throw Object.assign(new Error('账号或读取服务已变化'), { state: 'account_changed', statusCode: 409 });
        }
        session = { nonce: (0, crypto_1.randomUUID)(), owner, kind, epoch, runtime, fresh: true, busy: false, pages: new Map(), cursors: new Set(['0']), listener: null, used: Date.now(), closed: false };
        const captured = session, selfId = (0, accounts_store_1.videoAccount)(owner, 'douyin').profile?.id;
        captured.listener = async (response) => {
            const request = (0, douyin_browser_protocol_1.douyinListRequest)(kind, response.url(), selfId, response.request?.().postData?.());
            if (!request || captured.closed || captured.epoch !== (0, accounts_store_1.videoEpoch)(owner, 'douyin'))
                return;
            try {
                const parsed = (0, douyin_browser_protocol_1.parseDouyinList)(await response.json(), request.cursor, kind);
                if (captured.closed || captured.epoch !== (0, accounts_store_1.videoEpoch)(owner, 'douyin') || captured.pages.get(request.cursor)?.parsed)
                    return;
                (0, douyin_browser_media_1.rememberDouyinMediaHints)(owner, parsed.rows, response.request?.().headers?.()['user-agent'] || '');
                if (captured.pages.size >= MAX_PAGES) {
                    const oldest = captured.pages.keys().next().value;
                    captured.pages.delete(oldest);
                    captured.cursors.delete(oldest);
                }
                captured.pages.set(request.cursor, { parsed });
                captured.cursors.add(request.cursor);
                if (parsed.nextCursor)
                    captured.cursors.add(parsed.nextCursor);
            }
            catch (error) {
                if (!captured.closed && captured.cursors.has(request.cursor) && !captured.pages.get(request.cursor)?.parsed)
                    captured.pages.set(request.cursor, { error: error?.state ? error : Object.assign(new Error('抖音列表请求未返回有效数据，请在官方窗口检查验证状态后重试'), { state: 'risk_controlled', statusCode: 422 }) });
            }
        };
        runtime.page.on('response', captured.listener);
        sessions.set(key, session);
    }
    if (refresh && !cursor && !session.fresh) {
        session.pages.clear();
        session.cursors = new Set(['0']);
        session.nonce = (0, crypto_1.randomUUID)();
        await session.runtime.page.reload({ waitUntil: 'commit', timeout: 30000 });
    }
    clearTimeout(session.timer);
    session.busy = true;
    session.used = Date.now();
    const page = session.pages.get(cursor || '0');
    if (page?.error)
        session.pages.delete(cursor || '0');
    return session;
}
async function releaseDouyinLibrarySession(session, discard = false) {
    session.busy = false;
    session.used = Date.now();
    if (discard || session.closed || (0, accounts_store_1.videoEpoch)(session.owner, 'douyin') !== session.epoch)
        return dispose(session);
    session.timer = setTimeout(() => { void dispose(session); }, IDLE_MS);
    session.timer.unref?.();
}
function validDouyinCursor(owner, kind, token) {
    if (!token)
        return '';
    const session = sessions.get(keyFor(owner, kind)), match = /^([a-f0-9-]{36}):(\d{1,24})$/.exec(token);
    if (!session || session.closed || session.epoch !== (0, accounts_store_1.videoEpoch)(owner, 'douyin') || !match || match[1] !== session.nonce || !session.cursors.has(match[2]))
        throw Object.assign(new Error('列表翻页会话已过期，请刷新此列表'), { state: 'pagination_expired', statusCode: 409 });
    return match[2];
}
//# sourceMappingURL=douyin-library-session.js.map