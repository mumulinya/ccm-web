"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIST_STALE_MS = exports.LIST_FRESH_MS = void 0;
exports.clearVideoListCache = clearVideoListCache;
exports.cachedVideoList = cachedVideoList;
const accounts_store_1 = require("./accounts-store");
const performance_1 = require("./performance");
const entries = new Map(), flights = new Map();
exports.LIST_FRESH_MS = 60_000, exports.LIST_STALE_MS = 300_000;
function clearVideoListCache(owner, provider) {
    for (const [key, item] of entries)
        if (item.owner === owner && (!provider || item.provider === provider))
            entries.delete(key);
    for (const [key, item] of flights)
        if (item.owner === owner && (!provider || item.provider === provider)) {
            item.controller.abort();
            flights.delete(key);
        }
}
async function cachedVideoList(owner, provider, parts, read, options = {}) {
    const start = Date.now(), epoch = (0, accounts_store_1.videoEpoch)(owner, provider), key = JSON.stringify([owner, provider, epoch, ...parts]);
    const assertCurrent = () => { if ((0, accounts_store_1.videoEpoch)(owner, provider) !== epoch)
        throw Object.assign(new Error('账号已变化，请刷新列表'), { state: 'account_changed', statusCode: 409 }); };
    if (options.signal?.aborted)
        throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
    const cached = entries.get(key), age = cached ? Date.now() - cached.at : Infinity;
    if (!options.force && age < (options.freshOnly ? exports.LIST_FRESH_MS : exports.LIST_STALE_MS)) {
        assertCurrent();
        (0, performance_1.videoTiming)('list', provider, start, true);
        return { ...cached.value, cache: { at: cached.at, state: age < exports.LIST_FRESH_MS ? 'fresh' : 'stale', updating: age >= exports.LIST_FRESH_MS } };
    }
    let flight = flights.get(key);
    if (!flight) {
        if (flights.size >= 16)
            throw Object.assign(new Error('平台读取繁忙，请稍后重试'), { statusCode: 429 });
        const controller = new AbortController();
        flight = { owner, provider, controller, refs: 0, promise: null };
        const current = flight;
        current.promise = Promise.resolve().then(() => read(controller.signal)).then(value => {
            assertCurrent();
            if (controller.signal.aborted)
                throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
            const item = { owner, provider, epoch, value, at: Date.now() };
            entries.delete(key);
            entries.set(key, item);
            while (entries.size > 256)
                entries.delete(entries.keys().next().value);
            (0, performance_1.videoTiming)('list', provider, start);
            return item;
        }).finally(() => { if (flights.get(key) === current)
            flights.delete(key); });
        flights.set(key, current);
    }
    flight.refs++;
    let abort;
    try {
        const item = await Promise.race([flight.promise, new Promise((_, reject) => {
                abort = () => reject(Object.assign(new Error('已取消读取'), { name: 'AbortError' }));
                options.signal?.addEventListener('abort', abort, { once: true });
                if (options.signal?.aborted)
                    abort();
            })]);
        assertCurrent();
        return { ...item.value, cache: { at: item.at, state: 'fresh', updating: false } };
    }
    finally {
        options.signal?.removeEventListener('abort', abort);
        if (--flight.refs === 0 && flights.get(key) === flight) {
            flights.delete(key);
            flight.controller.abort();
        }
    }
}
//# sourceMappingURL=list-cache.js.map