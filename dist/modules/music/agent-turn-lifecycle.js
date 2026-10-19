"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelMusicAgentTurn = cancelMusicAgentTurn;
exports.beginMusicAgentTurn = beginMusicAgentTurn;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const music_memory_scope_1 = require("./music-memory-scope");
const context_1 = require("./folia/context");
const music_persistence_1 = require("./music-persistence");
const state_1 = require("./state");
const recommendation_store_1 = require("./recommendation-store");
const live = new Map();
const file = () => path_1.default.join(utils_1.CCM_DIR, 'music-agent-users', (0, music_memory_scope_1.musicOwnerKey)(), 'requests.json');
function change(operation) { const target = file(); return (0, atomic_json_file_1.withFileLock)(target, () => { const rows = (0, atomic_json_file_1.readJsonWithBackup)(target, []), result = operation(rows); (0, atomic_json_file_1.writeJsonAtomic)(target, rows.slice(-200)); return result; }); }
function cancelMusicAgentTurn(requestId, clientId) {
    const rows = (0, atomic_json_file_1.readJsonWithBackup)(file(), []), record = rows.find(row => row.id === requestId && row.clientId === clientId);
    if (!record)
        return false;
    const key = (0, music_memory_scope_1.musicOwnerKey)() + ':' + clientId, entry = live.get(key);
    if (entry?.requestId === requestId)
        entry.controller.abort();
    (0, recommendation_store_1.cancelRecommendationBatch)(requestId);
    change(items => { const current = items.find(item => item.id === requestId); if (current)
        Object.assign(current, { status: 'cancelled', events: [], completedAt: Date.now() }); });
    const id = 'music_' + crypto_1.default.createHash('sha256').update(JSON.stringify([(0, context_1.currentFoliaOwner)(), requestId])).digest('hex').slice(0, 32);
    const command = (0, music_persistence_1.listPersistedMusicCommands)().find(item => item.id === id);
    if (command && ['pending', 'resolving', 'ready', 'claimed', 'needs_user_gesture'].includes(command.status))
        (0, state_1.completeMusicRemoteCommand)({ id, status: 'cancelled', error: '用户停止了助手请求' });
    return true;
}
function beginMusicAgentTurn(body) {
    const requestId = String(body.requestId || crypto_1.default.randomUUID()), clientId = String(body.clientId || 'legacy');
    if (!/^[a-zA-Z0-9_:-]{1,160}$/.test(requestId) || !/^[a-zA-Z0-9_:-]{1,160}$/.test(clientId))
        throw Error('助手请求身份无效');
    const checksum = crypto_1.default.createHash('sha256').update(JSON.stringify([body.message, body.uiContext, body.recommendationContext])).digest('hex');
    const existing = change(rows => { const old = rows.find(row => row.id === requestId); if (old) {
        if (old.checksum !== checksum)
            throw Error('请求身份已用于不同内容');
        return old;
    } rows.push({ id: requestId, clientId, checksum, status: 'running', pid: process.pid, at: Date.now() }); });
    if (existing) {
        if (existing.status === 'completed' && existing.events?.length)
            return { replay: existing.events };
        throw Object.assign(Error(existing.status === 'running' ? '该请求仍在处理或已中断，请稍后使用新请求重试' : '该请求已结束，请使用新请求重试'), { statusCode: 409 });
    }
    const key = (0, music_memory_scope_1.musicOwnerKey)() + ':' + clientId;
    live.get(key)?.controller.abort();
    const controller = new AbortController(), entry = { controller, requestId };
    live.set(key, entry);
    const events = [];
    const current = () => !controller.signal.aborted && live.get(key) === entry;
    return { requestId, signal: controller.signal, current, abort: () => controller.abort(), capture: (event) => { if (events.length < 100)
            events.push(event); }, finish: (success) => { change(rows => { const row = rows.find(row => row.id === requestId); if (row)
            Object.assign(row, { status: success && current() ? 'completed' : 'cancelled', events: success && current() ? events : [], completedAt: Date.now() }); }); if (live.get(key) === entry)
            live.delete(key); } };
}
//# sourceMappingURL=agent-turn-lifecycle.js.map