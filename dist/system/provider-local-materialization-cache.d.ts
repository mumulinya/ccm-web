/**
 * Policy helpers for CCM's local materialization cache.
 *
 * This cache contains request-preparation data only; it is never Provider
 * prompt-cache state.  Keep the policy separate from the context projection
 * implementation so memory limits can evolve without changing serialization.
 */
export type LocalMaterializationCacheEntry = {
    bindingKey: string;
    approximateBytes?: number;
    lastAccessAtMs?: number;
};
export declare const LOCAL_HOT_CACHE_MAX_ENTRIES: number;
export declare const LOCAL_HOT_CACHE_MAX_BYTES: number;
export declare const LOCAL_HOT_CACHE_MAX_ENTRY_BYTES: number;
export declare const LOCAL_HOT_CACHE_MAX_SESSION_BYTES: number;
export declare function shouldKeepLocalMaterialization(approximateBytes: number): boolean;
export declare function localMaterializationBytes<T extends LocalMaterializationCacheEntry>(entries: Iterable<T>): number;
export declare function localMaterializationSessionKey(bindingKey: string): string;
export declare function evictLocalMaterializations<T extends LocalMaterializationCacheEntry>(entries: Map<string, T>, onEvict?: (key: string, entry: T) => void): number;
