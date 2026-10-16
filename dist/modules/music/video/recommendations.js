"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeVideoRecommendations = closeVideoRecommendations;
exports.readVideoRecommendations = readVideoRecommendations;
const crypto_1 = require("crypto");
const bilibili_1 = require("../bilibili");
const platform_http_1 = require("../platform-http");
const accounts_store_1 = require("./accounts-store");
const list_cache_1 = require("./list-cache");
const recommendation_protocol_1 = require("./recommendation-protocol");
const douyin_recommendations_1 = require("./douyin-recommendations");
const batches = new Map();
const creating = new Set();
let keyCheckedAt = 0, keyFlight = null;
async function recommendationKey() { if (keyFlight)
    return keyFlight; if (Date.now() - keyCheckedAt < 60000)
    return; keyFlight = (0, bilibili_1.ensureWbiKey)().finally(() => { keyCheckedAt = Date.now(); keyFlight = null; }); return keyFlight; }
const expired = () => Object.assign(new Error('推荐批次已过期，请换一批后继续'), { state: 'pagination_expired', statusCode: 409 });
function dispose(batch) { if (batch.closed)
    return; batch.closed = true; clearTimeout(batch.timer); batches.delete(batch.id); void batch.reader?.close(); }
function closeVideoRecommendations(owner, provider) { for (const batch of batches.values())
    if ((!owner || batch.owner === owner) && (!provider || batch.provider === provider))
        dispose(batch); }
function touch(batch) { clearTimeout(batch.timer); batch.used = Date.now(); batch.timer = setTimeout(() => dispose(batch), 300000); batch.timer.unref?.(); }
function current(owner, provider, id) { const batch = batches.get(id); if (!batch || batch.closed || batch.owner !== owner || batch.provider !== provider || batch.epoch !== (0, accounts_store_1.videoEpoch)(owner, provider))
    throw expired(); touch(batch); return batch; }
async function readPage(batch, index, signal) {
    if (signal.aborted)
        throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
    if (batch.pages.has(index))
        return batch.pages.get(index);
    let result;
    if (batch.provider === 'bilibili') {
        await recommendationKey();
        if (signal.aborted)
            throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
        const query = (0, bilibili_1.signBiliParams)({ fresh_type: '4', fresh_idx: String(index + 1), ps: '12' });
        const data = await (0, platform_http_1.musicPlatformJson)({ url: 'https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd?' + query, allowedHosts: ['api.bilibili.com'], headers: { 'User-Agent': bilibili_1.BILI_UA, Referer: 'https://www.bilibili.com/', Cookie: (0, accounts_store_1.videoCookie)(batch.owner, 'bilibili') }, signal, timeoutMs: 15000, maxBytes: 4 * 1024 * 1024, retries: 1 });
        result = { items: (0, recommendation_protocol_1.biliRecommendationRows)(data), more: data.data.item.length > 0, sourceLabel: 'B站网页版首页推荐' };
    }
    else {
        if (!batch.reader) {
            if (creating.size + [...batches.values()].filter(b => b.reader && !b.closed).length >= 3)
                throw Object.assign(new Error('推荐读取繁忙，请稍后重试'), { statusCode: 429 });
            creating.add(batch.id);
            try {
                batch.reader = await (0, douyin_recommendations_1.createDouyinRecommendationReader)(batch.owner);
            }
            finally {
                creating.delete(batch.id);
            }
            if (batch.closed) {
                await batch.reader.close();
                throw expired();
            }
        }
        try {
            result = await batch.reader.read(index, signal);
        }
        catch (e) {
            if (signal.aborted || batch.reader.alive?.() === false) {
                dispose(batch);
                if (signal.aborted)
                    throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
                throw expired();
            }
            throw e;
        }
    }
    current(batch.owner, batch.provider, batch.id);
    if (signal.aborted)
        throw Object.assign(new Error('已取消读取'), { name: 'AbortError' });
    const value = { items: result.items, sourceLabel: result.sourceLabel || '', batchId: batch.id, nextCursor: result.more && index < 15 ? `${batch.id}:${index + 1}` : null };
    batch.pages.set(index, value);
    return value;
}
async function readVideoRecommendations(owner, provider, id, cursor, refresh, signal) {
    if (!id && !cursor) {
        const data = await (0, list_cache_1.cachedVideoList)(owner, provider, ['recommend-root'], async (shared) => {
            if (batches.size >= 32) {
                const oldest = [...batches.values()].sort((a, b) => a.used - b.used)[0];
                dispose(oldest);
            }
            const batch = { id: (0, crypto_1.randomUUID)(), owner, provider, epoch: (0, accounts_store_1.videoEpoch)(owner, provider), used: Date.now(), pages: new Map() };
            batches.set(batch.id, batch);
            touch(batch);
            try {
                return await readPage(batch, 0, shared);
            }
            catch (e) {
                dispose(batch);
                throw e;
            }
        }, { force: refresh, signal, freshOnly: true });
        try {
            current(owner, provider, data.batchId);
            return data;
        }
        catch (e) {
            if (!refresh)
                return readVideoRecommendations(owner, provider, '', '', true, signal);
            throw e;
        }
    }
    const match = /^([a-f0-9-]{36}):(\d{1,2})$/.exec(cursor || '');
    if (!match || match[1] !== id)
        throw expired();
    const batch = current(owner, provider, id), index = Number(match[2]);
    if (index < 1 || index > 15 || !batch.pages.has(index - 1))
        throw expired();
    return (0, list_cache_1.cachedVideoList)(owner, provider, ['recommend', id, index], shared => readPage(batch, index, shared), { signal, freshOnly: true });
}
//# sourceMappingURL=recommendations.js.map