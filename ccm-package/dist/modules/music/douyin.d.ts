export type DouyinSearchChannel = "official" | "browser";
export type DouyinPlatformState = "success" | "login_required" | "risk_controlled" | "capability_unavailable" | "unavailable";
export type DouyinMusicResult = {
    awemeId: string;
    title: string;
    author: string;
    duration?: string;
    pic?: string;
    play?: number;
    shareUrl: string;
    searchChannel: DouyinSearchChannel;
    downloadable: boolean;
};
type DouyinSettings = {
    compatibilityEnabled: boolean;
    officialClientKey: string;
    officialClientSecretRef: string;
    browserStorageRef: string;
    browserAuthenticatedAt: string;
};
type RuntimePreparationState = {
    state: "idle" | "downloading" | "verifying" | "ready" | "failed";
    downloadedBytes: number;
    totalBytes: number;
    startedAt: string;
    updatedAt: string;
    error: string;
};
export declare function updateDouyinSettings(input: any): DouyinSettings;
export declare function douyinVideoUrl(awemeId: string): string;
export declare function startDouyinBrowserLogin(): Promise<any>;
export declare function revokeDouyinBrowserLogin(): {
    schema: string;
    official: {
        configured: boolean;
        clientKey: string;
        secretProtected: boolean;
    };
    browser: {
        compatibilityEnabled: boolean;
        authenticated: any;
        authenticatedAt: string;
        loginState: string;
        loginStartedAt: string;
        error: string;
    };
    runtime: {
        ready: boolean;
        managed: boolean;
        version: string;
        platformSupported: boolean;
        preparation: RuntimePreparationState;
    };
};
export declare function douyinSearch(keyword: string, limit?: number): Promise<DouyinMusicResult[]>;
export declare function prepareDouyinMediaRuntime(): Promise<any>;
export declare function resolveDouyinMediaInput(awemeId: string, options?: {
    signal?: AbortSignal;
}): Promise<{
    url: string;
    headers: Record<string, string>;
    title: string;
    durationSeconds: number;
    resolverVersion: any;
}>;
export declare function douyinPlatformStatus(): {
    schema: string;
    official: {
        configured: boolean;
        clientKey: string;
        secretProtected: boolean;
    };
    browser: {
        compatibilityEnabled: boolean;
        authenticated: any;
        authenticatedAt: string;
        loginState: string;
        loginStartedAt: string;
        error: string;
    };
    runtime: {
        ready: boolean;
        managed: boolean;
        version: string;
        platformSupported: boolean;
        preparation: RuntimePreparationState;
    };
};
export declare function runDouyinMusicSelfTest(): {
    ok: boolean;
    source: string;
    runtimeVersion: string;
};
export {};
