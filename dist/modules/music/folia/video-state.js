"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanVideoItem = cleanVideoItem;
exports.cleanVideoState = cleanVideoState;
// 视频身份持久化不保存短期播放 URL、下载令牌或平台凭据。
function cleanVideoItem(input) {
    if (!input || !['bilibili', 'douyin'].includes(input.type))
        throw new Error('无效视频来源');
    const id = String((input.type === 'bilibili' ? input.bvid : input.awemeId) || input.sourceId);
    if (!(input.type === 'bilibili' ? /^BV[a-zA-Z0-9]{10}$/.test(id) : /^\d{10,24}$/.test(id)))
        throw new Error('无效视频身份');
    return { type: input.type, sourceId: id, ...(input.type === 'bilibili' ? { bvid: id } : { awemeId: id }), title: String(input.title || id).slice(0, 300), author: String(input.author || '').slice(0, 300), ...(input.requiresAuth === true ? { requiresAuth: true } : {}), ...(Number(input.duration) > 0 ? { duration: Math.min(Number(input.duration), 604800) } : {}) };
}
function cleanVideoState(input) {
    if (!Array.isArray(input.queue) || input.queue.length > 500)
        throw new Error('视频队列超出限制');
    const position = Number(input.position || 0);
    if (!Number.isFinite(position) || position < 0)
        throw new Error('无效视频进度');
    return { current: input.current ? cleanVideoItem(input.current) : null, queue: input.queue.map(cleanVideoItem), position };
}
//# sourceMappingURL=video-state.js.map