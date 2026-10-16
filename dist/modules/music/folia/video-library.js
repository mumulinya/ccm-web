"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoLibraryKey = void 0;
exports.normalizeVideoLibrary = normalizeVideoLibrary;
exports.applyVideoMutation = applyVideoMutation;
const video_state_1 = require("./video-state");
// 视频独立权威库：稳定身份、旧数据兼容与增量修改，不接触平台账号或下载文件。
const videoLibraryKey = (item) => `${item.type}:${item.sourceId || item.bvid || item.awemeId}`;
exports.videoLibraryKey = videoLibraryKey;
const boundedItems = (items, limit = 500) => {
    if (!Array.isArray(items) || items.length > limit)
        throw new Error('视频列表超出限制');
    return [...new Map(items.map(raw => { const item = (0, video_state_1.cleanVideoItem)(raw); return [(0, exports.videoLibraryKey)(item), item]; })).values()];
};
function normalizeVideoLibrary(raw = {}) {
    const base = (0, video_state_1.cleanVideoState)({ current: raw.current, queue: raw.queue || [], position: raw.position });
    const state = { ...base, version: 2, favorites: [...raw.favorites || []], playlists: JSON.parse(JSON.stringify(raw.playlists || [])), history: [...raw.history || []], progress: { ...raw.progress }, playEvents: raw.playEvents || (raw.history || []).map((event) => event.eventId).filter(Boolean), playback: raw.playback ? { ...raw.playback } : null };
    if (raw.version !== 2 && base.current && base.position > 0)
        state.progress[(0, exports.videoLibraryKey)(base.current)] ||= { position: base.position, duration: 0, completed: false, updatedAt: 0 };
    return state;
}
function playlist(state, id) { const value = state.playlists.find((p) => p.id === id); if (!value)
    throw new Error('片单已不存在，请刷新'); return value; }
function name(value) { const text = String(value || '').trim(); if (!text || text.length > 100)
    throw new Error('片单名称需要 1 至 100 个字符'); return text; }
function applyVideoMutation(raw, operation) {
    const state = normalizeVideoLibrary(raw), op = operation || {}, now = Date.now();
    if (op.kind === 'favorite') {
        if (typeof op.saved !== 'boolean')
            throw new Error('收藏状态无效');
        const item = (0, video_state_1.cleanVideoItem)(op.item), key = (0, exports.videoLibraryKey)(item);
        state.favorites = boundedItems([...state.favorites.filter((row) => (0, exports.videoLibraryKey)(row) !== key), ...(op.saved ? [item] : [])], 2000);
    }
    else if (op.kind === 'playlist-create') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(op.id))
            throw new Error('片单身份无效');
        if (!state.playlists.some((p) => p.id === op.id)) {
            if (state.playlists.length >= 100)
                throw new Error('最多保存 100 个片单');
            state.playlists.push({ id: op.id, name: name(op.name), items: boundedItems(op.items || []) });
        }
    }
    else if (op.kind === 'playlist-rename') {
        const p = playlist(state, op.id);
        if (op.baseName !== undefined && op.baseName !== p.name)
            throw Object.assign(new Error('片单名称已在其他窗口修改，请刷新后重试'), { statusCode: 409 });
        p.name = name(op.name);
    }
    else if (op.kind === 'playlist-delete') {
        const p = state.playlists.find((p) => p.id === op.id);
        if (p && op.baseName !== undefined && p.name !== op.baseName)
            throw Object.assign(new Error('片单已在其他窗口修改，请核对后再删除'), { statusCode: 409 });
        state.playlists = state.playlists.filter((p) => p.id !== op.id);
    }
    else if (op.kind === 'playlist-add') {
        const p = playlist(state, op.id);
        p.items = boundedItems([...p.items, ...boundedItems(op.items)]);
    }
    else if (op.kind === 'playlist-remove') {
        const p = playlist(state, op.id);
        p.items = p.items.filter((item) => (0, exports.videoLibraryKey)(item) !== op.key);
    }
    else if (op.kind === 'playlist-order') {
        const p = playlist(state, op.id), next = boundedItems(op.items);
        if (next.length !== p.items.length || next.some((item) => !p.items.some((old) => (0, exports.videoLibraryKey)(old) === (0, exports.videoLibraryKey)(item))))
            throw new Error('片单内容已变化，请刷新后排序');
        p.items = next;
    }
    else if (op.kind === 'queue-add')
        state.queue = boundedItems([...state.queue, ...boundedItems(op.items)]);
    else if (op.kind === 'queue-set')
        state.queue = boundedItems(op.items);
    else if (op.kind === 'queue-remove')
        state.queue = state.queue.filter((item) => (0, exports.videoLibraryKey)(item) !== op.key);
    else if (op.kind === 'queue-clear')
        state.queue = state.current ? state.queue.filter((item) => (0, exports.videoLibraryKey)(item) === (0, exports.videoLibraryKey)(state.current)) : [];
    else if (op.kind === 'queue-order') {
        const next = boundedItems(op.items);
        if (next.length !== state.queue.length || next.some((item) => !state.queue.some((old) => (0, exports.videoLibraryKey)(old) === (0, exports.videoLibraryKey)(item))))
            throw new Error('队列内容已变化，请刷新后排序');
        state.queue = next;
    }
    else if (op.kind === 'played') {
        if (!/^[a-zA-Z0-9_:-]{1,160}$/.test(op.runId))
            throw new Error('播放事件身份无效');
        if (state.playEvents.includes(op.runId))
            return state;
        const item = (0, video_state_1.cleanVideoItem)(op.item);
        state.playEvents = [...state.playEvents, op.runId].slice(-2000);
        state.current = item;
        state.position = 0;
        state.playback = { runId: op.runId, sequence: 0 };
        state.history = [...state.history.filter((event) => (0, exports.videoLibraryKey)(event.item) !== (0, exports.videoLibraryKey)(item)), { item, eventId: op.runId, playedAt: now }].slice(-2000);
        state.progress[(0, exports.videoLibraryKey)(item)] = { position: 0, duration: item.duration || 0, completed: false, updatedAt: now };
    }
    else if (op.kind === 'progress') {
        if (state.playback?.runId !== op.runId || !Number.isSafeInteger(op.sequence) || op.sequence <= state.playback.sequence)
            return state;
        const position = Number(op.position), duration = Number(op.duration || 0);
        if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration < 0)
            throw new Error('无效视频进度');
        if (!state.current || (0, exports.videoLibraryKey)((0, video_state_1.cleanVideoItem)(op.item)) !== (0, exports.videoLibraryKey)(state.current))
            return state;
        const key = (0, exports.videoLibraryKey)(state.current), bounded = duration > 0 ? Math.min(position, duration) : position;
        state.position = bounded;
        state.playback.sequence = op.sequence;
        delete state.progress[key];
        state.progress[key] = { position: bounded, duration, completed: op.completed === true, updatedAt: now };
        state.progress = Object.fromEntries(Object.entries(state.progress).slice(-2000));
    }
    else
        throw new Error('未知视频库操作');
    return state;
}
//# sourceMappingURL=video-library.js.map