export declare const UNIFIED_MODEL_MAX_ATTEMPTS = 5;
export declare const UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS = 30000;
export declare const UNIFIED_MODEL_TOTAL_TIMEOUT_MS = 180000;
export type ModelRetryProfileId = "interactive_first_turn" | "agent_orchestration" | "long_running_task" | "background_auxiliary";
export type ModelRetryProfileV1 = {
    schema: "ccm-model-retry-profile-v1";
    id: ModelRetryProfileId;
    maxAttempts: number;
    attemptTimeoutMs: number;
    totalTimeoutMs: number;
};
export declare function resolveModelRetryProfile(id?: ModelRetryProfileId, configuredAttemptTimeoutMs?: number): ModelRetryProfileV1;
export type ModelCallRetryContext = {
    attempt: number;
    maxAttempts: number;
    attemptTimeoutMs: number;
    elapsedMs: number;
    signal: AbortSignal;
    profile: ModelRetryProfileId;
};
export type ModelCallRetryNotice = Omit<ModelCallRetryContext, "signal"> & {
    delayMs: number;
    error: any;
};
export type ModelCallRetryOptions = {
    profile?: ModelRetryProfileId;
    attempts?: number;
    attemptTimeoutMs?: number;
    totalTimeoutMs?: number;
    baseDelayMs?: number;
    scope?: string;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (notice: ModelCallRetryNotice) => void;
    signal?: AbortSignal;
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
        interactiveFirstTurnHonorsConfiguredTimeout: boolean;
        orchestrationHonorsConfiguredTimeout: boolean;
    };
}>;
