/** Keep legacy implicit request bytes intact while preparing its audit plan. */
export declare function modelCacheAdapterPatch(config: any, plan: any, capability: any, messages: any[], options: any): {
    capability: any;
    strategy: import("./provider-cache-strategy").CcmProviderCacheStrategyV3;
    body: {};
    headers: {};
    patchChecksum: string;
    promptCacheKeyChecksum: string;
    promptCacheKeyPresent: boolean;
    cacheKeyOmissionReason: string;
    breakpointMessageIndexes: any[];
    breakpointChecksums: any[];
    breakpointDiagnostic: any;
    breakpointOmissionReason: string;
    cacheRouteVersion: number;
    routeKeyRotated: boolean;
} | {
    breakpointDiagnostic: import("./provider-context-cache-adapters").CcmCacheBreakpointDiagnosticV2;
    patchChecksum: string;
    promptCacheKeyChecksum: string;
    promptCacheKeyPresent: boolean;
    cacheKeyOmissionReason: string;
    breakpointOmissionReason: string;
    cacheRouteVersion: number;
    cacheKeyScope: string;
    routeKeyRotated: boolean;
    capability: any;
    strategy: import("./provider-cache-strategy").CcmProviderCacheStrategyV3;
    body: any;
    headers: {};
    breakpointMessageIndexes: number[];
    breakpointChecksums: string[];
    rollingBreakpointIndex: number;
    rollingBreakpointReason: string;
};
export declare function prepareModelCacheSafely<T>(options: any, prepare: () => Promise<T>, fallback: T): Promise<T>;
/** A diagnostic persistence failure must not replace a successful model reply. */
export declare function completeModelCacheSafely<T>(complete: () => T): T | null;
