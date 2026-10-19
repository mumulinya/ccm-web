"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicAssistantContextPolicy = void 0;
exports.normalizeMusicAssistantContext = normalizeMusicAssistantContext;
exports.musicAssistantConversationContext = musicAssistantConversationContext;
// 仅接受页面公开的频道标识；不接受凭据、地址或任意模型提示。
function normalizeMusicAssistantContext(value) {
    if (!value || !['music', 'video'].includes(value.workspace))
        return undefined;
    const sources = value.workspace === 'video' ? ['local', 'bilibili', 'douyin'] : ['local', 'netease', 'qq', 'kugou', 'navidrome', 'bodian'];
    return { workspace: value.workspace, source: sources.includes(value.source) ? String(value.source) : 'auto' };
}
exports.musicAssistantContextPolicy = `When uiContext is present, it is the user's default search/play scope for this turn, not the source of the currently playing item. For an underspecified request, use uiContext.workspace (music => audio; video => video) and uiContext.source. If source is auto, search only the corresponding workspace's providers. A platform or media choice explicitly requested in the CURRENT message overrides the UI default; recent history must not override a newly selected channel. Decide from full semantics, never just platform keywords. For both search and play, return mediaMode=video when looking for videos. Local video means downloaded video only. Bodian is not supported by this assistant's search adapter: return action=none and explain that native Bodian search remains available; do not silently search another provider. This context does not authorize account writes or platform operations.`;
function musicAssistantConversationContext(value) {
    const context = normalizeMusicAssistantContext(value);
    return context ? `当前用户选择的默认频道：${JSON.stringify(context)}。明确提出其他来源时以本次请求为准。波点原生功能保持可用，但本助手尚无波点搜索适配，不能声称已检索或换用其他平台。` : '';
}
//# sourceMappingURL=assistant-context.js.map