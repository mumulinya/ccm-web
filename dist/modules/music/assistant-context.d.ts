export declare function normalizeMusicAssistantContext(value: any): {
    workspace: "music" | "video";
    source: string;
};
export declare const musicAssistantContextPolicy = "When uiContext is present, it is the user's default search/play scope for this turn, not the source of the currently playing item. For an underspecified request, use uiContext.workspace (music => audio; video => video) and uiContext.source. If source is auto, search only the corresponding workspace's providers. A platform or media choice explicitly requested in the CURRENT message overrides the UI default; recent history must not override a newly selected channel. Decide from full semantics, never just platform keywords. For both search and play, return mediaMode=video when looking for videos. Local video means downloaded video only. Bodian is not supported by this assistant's search adapter: return action=none and explain that native Bodian search remains available; do not silently search another provider. This context does not authorize account writes or platform operations.";
export declare function musicAssistantConversationContext(value: any): string;
