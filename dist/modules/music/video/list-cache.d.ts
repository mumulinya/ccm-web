export declare const LIST_FRESH_MS = 60000, LIST_STALE_MS = 300000;
export declare function clearVideoListCache(owner: string, provider?: string): void;
export declare function cachedVideoList(owner: string, provider: any, parts: unknown[], read: (signal: AbortSignal) => Promise<any>, options?: {
    force?: boolean;
    signal?: AbortSignal;
    freshOnly?: boolean;
}): Promise<any>;
