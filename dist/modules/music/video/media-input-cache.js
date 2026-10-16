"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoMediaInput = videoMediaInput;
exports.clearVideoMediaInputs = clearVideoMediaInputs;
exports.invalidateVideoMediaInput = invalidateVideoMediaInput;
const accounts_store_1 = require("./accounts-store");
const performance_1 = require("./performance");
// 地址/请求头只在内存中保留 60 秒。预热仅调用解析器，绝不启动 FFmpeg 或下载媒体。
const cache = new Map();
async function videoMediaInput(provider, id, read, signal) {
    const owner = (0, accounts_store_1.videoOwner)(), epoch = ['bilibili', 'douyin'].includes(provider) ? (0, accounts_store_1.videoEpoch)(owner, provider) : 0;
    const key = JSON.stringify([owner, provider, epoch, id]), start = Date.now();
    for (const [key, item] of cache)
        if (Date.now() - item.at > 60_000 && item.refs === 0)
            cache.delete(key);
    let item = cache.get(key), hit = !!item;
    if (!item) {
        if (cache.size >= 128) {
            const disposable = [...cache].find(([, entry]) => entry.refs === 0);
            if (disposable)
                cache.delete(disposable[0]);
            else
                throw new Error('播放资料解析繁忙');
        }
        const controller = new AbortController();
        item = { at: Date.now(), owner, provider, id, controller, refs: 0, promise: null };
        const entry = item;
        entry.promise = Promise.resolve().then(() => read(controller.signal)).then(result => { if (controller.signal.aborted || (['bilibili', 'douyin'].includes(provider) && (0, accounts_store_1.videoEpoch)(owner, provider) !== epoch))
            throw Object.assign(new Error('播放资料已失效'), { name: 'AbortError' }); return result; }).catch(error => { if (cache.get(key) === entry)
            cache.delete(key); throw error; });
        cache.set(key, entry);
    }
    item.refs++;
    let abort;
    try {
        const result = await Promise.race([item.promise, new Promise((_, reject) => { abort = () => reject(Object.assign(new Error('已取消'), { name: 'AbortError' })); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted)
                abort(); })]);
        (0, performance_1.videoTiming)('resolve', provider, start, hit);
        return result;
    }
    finally {
        signal?.removeEventListener('abort', abort);
        if (--item.refs === 0 && signal?.aborted) {
            if (cache.get(key) === item)
                cache.delete(key);
            item.controller.abort();
        }
    }
}
function clearVideoMediaInputs(owner, provider) { for (const [key, item] of cache)
    if (item.owner === owner && (!provider || item.provider === provider)) {
        item.controller.abort();
        cache.delete(key);
    } }
function invalidateVideoMediaInput(provider, id) { const owner = (0, accounts_store_1.videoOwner)(); for (const [key, item] of cache)
    if (item.owner === owner && item.provider === provider && item.id === id)
        cache.delete(key); }
//# sourceMappingURL=media-input-cache.js.map