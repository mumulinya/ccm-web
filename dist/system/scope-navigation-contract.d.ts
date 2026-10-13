export declare const SCOPE_NAVIGATION_CONTRACT = "scope-navigation-v2";
export declare const navigationDigest: (value: any) => string;
export declare function stableNavigationJson(value: any): string;
export type ScopeNavigationSnapshot = {
    scope: 'project' | 'group';
    scopeId: string;
    system: string;
    prompt: string;
    inputDigest: string;
    contractVersion: string;
    sourceCount: number;
};
export declare function buildScopeNavigationSnapshot(input: {
    scope: 'project' | 'group';
    scopeId: string;
    system: string;
    blocks: Array<{
        path?: string;
        projectId?: string;
        content: string;
        checksum?: string;
    }>;
    metadata: any;
}): ScopeNavigationSnapshot;
export declare function scopeNavigationRequestOptions(config: any, snapshot: ScopeNavigationSnapshot): {
    modelRequestContext: import("./model-request-context").ModelRequestContext;
    providerContextCache: {
        scope: "group" | "project";
        scopeId: string;
        sessionId: string;
        source: string;
        requestClass: string;
        adaptiveStablePrefix: boolean;
        enabled: boolean;
    };
    system: string;
    messages: {
        role: string;
        content: string;
    }[];
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    retryAttempts: number;
    invalidJsonMessage: string;
};
