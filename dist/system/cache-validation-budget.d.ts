export declare function currentCacheValidationBinding(): {
    validationId: string;
    executionOrigin: "probe";
};
export declare function withCacheValidationBinding<T>(id: string, fn: () => T): T;
type Permit = {
    requestId: string;
    ordinal: number;
    at: string;
    protocol: string;
    transport: string;
    purpose: string;
    status: string;
    pid: number;
};
export type CacheValidationRun = {
    id: string;
    trace_id: string;
    sessionId: string;
    limit: number;
    used: number;
    status: string;
    leaseUntil: number;
    controllerPid?: number;
    createdAt: string;
    requests: Permit[];
    rejections: any[];
    metadata: any;
    windows?: {
        openedAt: string;
        closedAt?: string;
        reason?: string;
    }[];
};
export declare function isCacheValidationControlError(value: any): boolean;
export declare function createCacheValidationRun(input: {
    limit: number;
    sessionId: string;
    metadata?: any;
}): CacheValidationRun;
export declare function readCacheValidationRun(id: string): CacheValidationRun;
export declare function updateCacheValidationMetadata(id: string, metadata: any): CacheValidationRun;
export declare function activeCacheValidationRun(): CacheValidationRun;
export declare function cacheValidationForSession(sessionId: string): CacheValidationRun;
export declare function renewCacheValidationRun(id: string): CacheValidationRun;
export declare function resumeCacheValidationRun(id: string): CacheValidationRun;
export declare function finishCacheValidationRun(id: string, status?: string): CacheValidationRun;
export declare function cacheValidationBackgroundDeferred(): boolean;
export declare function waitForCacheValidationBackground(signal?: AbortSignal): Promise<void>;
/** Must run outside diagnostic best-effort catches, before each actual send. */
export declare function reserveCacheValidationRequest(options?: any, config?: any, protocol?: string, transport?: string): any;
export declare function completeCacheValidationRequest(id: string, requestId: string, status: string): void;
export {};
