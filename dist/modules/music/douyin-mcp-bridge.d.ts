export type DouyinMcpMode = "auto" | "on" | "off";
export type DouyinMcpToolName = "check_login_status" | "logout" | "search_videos" | "get_video_detail" | "get_video_comments" | "get_video_live_comments" | "get_sub_comments" | "get_user_info" | "get_user_posts" | "get_homefeed" | "get_login_qrcode" | "resolve_share_url" | "download_video" | "download_aweme_images" | "ocr_aweme_images" | "transcribe_video" | "batch_transcribe";
export type DouyinMcpCapability = {
    name: DouyinMcpToolName;
    available: boolean;
    readOnly: boolean;
    description: string;
};
export type DouyinMcpCallOptions = {
    timeoutMs?: number;
    signal?: AbortSignal;
    outputSubdir?: string;
};
export type DouyinMcpSearchOptions = {
    offset?: number;
    count?: number;
    searchChannel?: string;
    sortType?: number;
    publishTime?: number;
};
export type DouyinMcpSearchRow = {
    awemeId: string;
    title: string;
    author: string;
    duration?: string;
    pic?: string;
    play?: number;
    shareUrl: string;
    searchChannel: "mcp";
    downloadable: boolean;
    musicId?: string;
    musicTitle?: string;
    musicAuthor?: string;
    secUserId?: string;
};
export declare function adoptDouyinMcpCookie(storage: any): boolean;
export declare function callDouyinMcpTool<T = any>(name: DouyinMcpToolName, input?: Record<string, any>, options?: DouyinMcpCallOptions): Promise<T>;
export declare function douyinMcpCapabilities(): Promise<DouyinMcpCapability[]>;
export declare function douyinMcpGetVideoDetail(awemeId: string): Promise<any>;
export declare function douyinMcpGetVideoComments(awemeId: string, cursor?: number, count?: number, sourceKeyword?: string): Promise<any>;
export declare function douyinMcpGetVideoLiveComments(awemeId: string, sinceTime?: number, count?: number, sourceKeyword?: string): Promise<any>;
export declare function douyinMcpGetSubComments(commentId: string, cursor?: number, count?: number, sourceKeyword?: string): Promise<any>;
export declare function douyinMcpGetUserInfo(secUserId: string): Promise<any>;
export declare function douyinMcpGetUserPosts(secUserId: string, maxCursor?: string, count?: number): Promise<any>;
export declare function douyinMcpGetHomefeed(tag?: string, count?: number, refreshIndex?: number): Promise<any>;
export declare function douyinMcpGetLoginQrcode(): Promise<{
    mode: string;
    launched: boolean;
    enabled: boolean;
    root: string;
    commit: string;
    dependencies: {
        uv: boolean;
        python: boolean;
        files: boolean;
        playwright: "ready" | "unknown" | "missing";
    };
    connected: boolean;
    authenticated: boolean;
    verified: boolean;
    loginState: "failed" | "waiting" | "idle" | "authenticated";
    loginStartedAt: string;
    error: string;
    installHint: string;
}>;
export declare function douyinMcpResolveShareUrl(shareUrl: string): Promise<any>;
export declare function douyinMcpDownloadVideo(awemeId: string, subdir?: string, options?: DouyinMcpCallOptions): Promise<any>;
export declare function isDouyinManagedMediaPath(value: any): boolean;
export declare function douyinMcpDownloadImages(awemeId: string, subdir?: string): Promise<any>;
export declare function douyinMcpOcrImages(awemeId: string, subdir?: string): Promise<any>;
export declare function douyinMcpTranscribeVideo(awemeId: string): Promise<any>;
export declare function douyinMcpBatchTranscribe(keyword: string, count?: number, sortType?: number): Promise<any>;
export declare function normalizeDouyinRows(value: any): DouyinMcpSearchRow[];
export declare function douyinMcpStatus(): {
    enabled: boolean;
    mode: DouyinMcpMode;
    root: string;
    commit: string;
    dependencies: {
        uv: boolean;
        python: boolean;
        files: boolean;
        playwright: "ready" | "unknown" | "missing";
    };
    connected: boolean;
    authenticated: boolean;
    verified: boolean;
    loginState: "failed" | "waiting" | "idle" | "authenticated";
    loginStartedAt: string;
    error: string;
    installHint: string;
};
export declare function douyinMcpCheckLogin(): Promise<boolean>;
export declare function douyinMcpSearchPage(keyword: string, options?: DouyinMcpSearchOptions): Promise<any>;
export declare function douyinMcpSearch(keyword: string, limit?: number, options?: DouyinMcpSearchOptions): Promise<DouyinMcpSearchRow[]>;
export declare function startDouyinMcpLogin(): {
    enabled: boolean;
    mode: DouyinMcpMode;
    root: string;
    commit: string;
    dependencies: {
        uv: boolean;
        python: boolean;
        files: boolean;
        playwright: "ready" | "unknown" | "missing";
    };
    connected: boolean;
    authenticated: boolean;
    verified: boolean;
    loginState: "failed" | "waiting" | "idle" | "authenticated";
    loginStartedAt: string;
    error: string;
    installHint: string;
};
export declare function revokeDouyinMcpLogin(): Promise<{
    enabled: boolean;
    mode: DouyinMcpMode;
    root: string;
    commit: string;
    dependencies: {
        uv: boolean;
        python: boolean;
        files: boolean;
        playwright: "ready" | "unknown" | "missing";
    };
    connected: boolean;
    authenticated: boolean;
    verified: boolean;
    loginState: "failed" | "waiting" | "idle" | "authenticated";
    loginStartedAt: string;
    error: string;
    installHint: string;
}>;
export declare function runDouyinMcpBridgeSelfTest(): {
    ok: boolean;
    rootFound: boolean;
    mode: DouyinMcpMode;
    status: {
        enabled: boolean;
        mode: DouyinMcpMode;
        root: string;
        commit: string;
        dependencies: {
            uv: boolean;
            python: boolean;
            files: boolean;
            playwright: "ready" | "unknown" | "missing";
        };
        connected: boolean;
        authenticated: boolean;
        verified: boolean;
        loginState: "failed" | "waiting" | "idle" | "authenticated";
        loginStartedAt: string;
        error: string;
        installHint: string;
    };
    checksum: string;
};
/** Release sidecars without logging out or changing encrypted credentials. */
export declare function closeDouyinMcpRuntime(): Promise<void>;
