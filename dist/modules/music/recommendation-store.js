"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationKey = void 0;
exports.recommendationAccountFence = recommendationAccountFence;
exports.readRecommendationState = readRecommendationState;
exports.getRecommendationBatch = getRecommendationBatch;
exports.saveRecommendationBatch = saveRecommendationBatch;
exports.lessRecommendation = lessRecommendation;
exports.cancelRecommendationBatch = cancelRecommendationBatch;
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const context_1 = require("./folia/context");
const accounts_1 = require("./folia/accounts");
const music_memory_scope_1 = require("./music-memory-scope");
const filename = () => path_1.default.join(utils_1.CCM_DIR, 'music-agent-users', (0, music_memory_scope_1.musicOwnerKey)(), 'recommendations.json');
const recommendationKey = (item) => JSON.stringify([item.source, item.instanceId || 'default', item.sourceId]);
exports.recommendationKey = recommendationKey;
function recommendationAccountFence(provider) {
    if (provider === 'local')
        return 'local';
    const state = (0, accounts_1.account)((0, context_1.currentFoliaOwner)(), provider);
    // authenticatedAt 是每次资料核验的时间，不是账号代次；普通核验不能让推荐与缓存失效。
    return crypto_1.default.createHash('sha256').update(JSON.stringify([state.cookieMarker || '', state.sessionHints || {}, state.instanceId || '', !!state.authenticatedAt, state.profile?.id || '', state.baseUrl || '', state.username || '', state.password || ''])).digest('hex');
}
function readRecommendationState() { return (0, atomic_json_file_1.readJsonWithBackup)(filename(), { batches: [], less: [], seen: [] }); }
function mutate(operation) { const file = filename(); return (0, atomic_json_file_1.withFileLock)(file, () => { const state = readRecommendationState(), result = operation(state); (0, atomic_json_file_1.writeJsonAtomic)(file, state); return result; }); }
function getRecommendationBatch(id) {
    const state = readRecommendationState(), batch = id ? state.batches.find((item) => item.id === id) : state.batches[0];
    if (!batch)
        throw Object.assign(Error('这组推荐已不存在，请重新推荐'), { statusCode: 409 });
    if (batch.cancelledAt)
        throw Object.assign(Error('这组推荐已取消，请重新推荐'), { statusCode: 409 });
    if (batch.expiresAt < Date.now())
        throw Object.assign(Error('这组推荐已过期，请重新推荐'), { statusCode: 409 });
    for (const [provider, fence] of Object.entries(batch.fences))
        if (recommendationAccountFence(provider) !== fence)
            throw Object.assign(Error('音源账号已变化，请重新推荐'), { statusCode: 409 });
    return batch;
}
function saveRecommendationBatch(input) {
    return mutate(state => {
        const fences = Object.fromEntries([...new Set(input.items.map((item) => item.source))].map(provider => [provider, recommendationAccountFence(provider)]));
        const batch = { ...input, id: crypto_1.default.randomUUID(), createdAt: new Date().toISOString(), expiresAt: Date.now() + 24 * 3600000, fences };
        state.batches = [batch, ...state.batches].slice(0, 20);
        state.seen = [...new Set([...batch.items.map(exports.recommendationKey), ...state.seen])].slice(0, 100);
        return batch;
    });
}
function lessRecommendation(batchId, index) { const batch = getRecommendationBatch(batchId), item = batch.items[index]; if (!item)
    throw Error('推荐歌曲已变化，请刷新后重试'); return mutate(state => { state.less = [...new Set([(0, exports.recommendationKey)(item), ...state.less])].slice(0, 200); return item; }); }
function cancelRecommendationBatch(requestId) { return mutate(state => { for (const batch of state.batches)
    if (batch.requestId === requestId)
        batch.cancelledAt = new Date().toISOString(); }); }
//# sourceMappingURL=recommendation-store.js.map