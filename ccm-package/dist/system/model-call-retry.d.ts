export declare const UNIFIED_MODEL_MAX_ATTEMPTS = 5;
export declare const UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS = 30000;
export declare const UNIFIED_MODEL_TOTAL_TIMEOUT_MS = 180000;
export type ModelCallRetryContext = {
    attempt: number;
    maxAttempts: number;
    attemptTimeoutMs: number;
    elapsedMs: number;
};
export type ModelCallRetryNotice = ModelCallRetryContext & {
    delayMs: number;
    error: any;
};
export type ModelCallRetryOptions = {
    attempts?: number;
    attemptTimeoutMs?: number;
    totalTimeoutMs?: number;
    baseDelayMs?: number;
    scope?: string;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (notice: ModelCallRetryNotice) => void;
};
export declare function shouldRetryModelCallError(error: any): boolean;
export declare function runModelCallWithRetry<T>(call: (context: ModelCallRetryContext) => Promise<T>, options?: ModelCallRetryOptions): Promise<T>;
export declare function runModelCallRetrySelfTest(): Promise<{
    pass: boolean;
    checks: {
        transientUsesFiveAttempts: boolean;
        permanentFailureStopsImmediately: boolean;
        timeoutIsRetryable: boolean;
        invalidJsonIsRetryable: boolean;
        missingKeyIsPermanent: boolean;
        emittedStreamDoesNotRetry: boolean;
    };
}>;
