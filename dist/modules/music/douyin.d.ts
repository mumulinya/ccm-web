export type DouyinSearchChannel = "official" | "browser" | "mcp";
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
    mcpMode: "auto" | "on" | "off";
    officialClientKey: string;
    officialClientSecretRef: string;
    browserStorageRef: string;
    browserAuthenticatedAt: string;
    asrProvider: "siliconflow" | "openai" | "custom" | "volcengine";
    asrApiUrl: string;
    asrModel: string;
    asrApiKeyRef: string;
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
/** Use the upstream MCP login flow exclusively. The legacy TypeScript
 * Playwright login opens duplicate browser pages on some Windows hosts, so
 * it must not be selected for the user-facing login action. */
export declare function startDouyinLogin(): Promise<{
    enabled: boolean;
    mode: import("./douyin-mcp-bridge").DouyinMcpMode;
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
    mcp: {
        enabled: boolean;
        mode: import("./douyin-mcp-bridge").DouyinMcpMode;
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
    runtime: {
        ready: boolean;
        managed: boolean;
        version: string;
        platformSupported: boolean;
        preparation: RuntimePreparationState;
    };
    asr: {
        provider: "openai" | "custom" | "siliconflow" | "volcengine";
        configured: boolean;
        apiUrl: string;
        model: string;
        apiUrlConfigured: boolean;
        keyProtected: boolean;
    };
    search: {
        enabled: boolean;
        mode: string;
        anonymousSupported: boolean;
        authenticatedEnhancement: boolean;
    };
};
export declare function revokeDouyinLogin(): Promise<{
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
    mcp: {
        enabled: boolean;
        mode: import("./douyin-mcp-bridge").DouyinMcpMode;
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
    runtime: {
        ready: boolean;
        managed: boolean;
        version: string;
        platformSupported: boolean;
        preparation: RuntimePreparationState;
    };
    asr: {
        provider: "openai" | "custom" | "siliconflow" | "volcengine";
        configured: boolean;
        apiUrl: string;
        model: string;
        apiUrlConfigured: boolean;
        keyProtected: boolean;
    };
    search: {
        enabled: boolean;
        mode: string;
        anonymousSupported: boolean;
        authenticatedEnhancement: boolean;
    };
}>;
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
/** MCP-first local media acquisition used by the CCM music download queue. */
export declare function downloadDouyinVideoForPlayback(awemeId: string, options?: {
    signal?: AbortSignal;
}): Promise<{
    filePath: string;
    title: string;
    durationSeconds: number;
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
    mcp: {
        enabled: boolean;
        mode: import("./douyin-mcp-bridge").DouyinMcpMode;
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
    runtime: {
        ready: boolean;
        managed: boolean;
        version: string;
        platformSupported: boolean;
        preparation: RuntimePreparationState;
    };
    asr: {
        provider: "openai" | "custom" | "siliconflow" | "volcengine";
        configured: boolean;
        apiUrl: string;
        model: string;
        apiUrlConfigured: boolean;
        keyProtected: boolean;
    };
    search: {
        enabled: boolean;
        mode: string;
        anonymousSupported: boolean;
        authenticatedEnhancement: boolean;
    };
};
export declare function runDouyinMusicSelfTest(): {
    ok: boolean;
    source: string;
    runtimeVersion: string;
};
export {};
