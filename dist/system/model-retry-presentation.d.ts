export declare const FOREGROUND_MODEL_MAX_RETRIES = 5;
export declare const FOREGROUND_MODEL_MAX_ATTEMPTS: number;
export declare function providerRetryCountFromError(error: any): number;
export declare function isProviderUnavailableError(error: any): boolean;
export type ModelFailureKind = "preparation_failed" | "connection_timeout" | "provider_error" | "user_cancelled";
export type ModelRetryStopReason = "max_attempts" | "total_timeout" | "non_retryable_error" | "stream_already_started" | "cancelled";
export declare function modelRequestFailureEvidence(error: any): {
    attemptCount: number;
    retryCount: number;
    requestDispatchCount: number;
    responseStartedCount: number;
    providerRequestIdPresent: boolean;
    contentStored: boolean;
};
export declare function classifyModelFailure(error: any, evidence?: {
    attemptCount: number;
    retryCount: number;
    requestDispatchCount: number;
    responseStartedCount: number;
    providerRequestIdPresent: boolean;
    contentStored: boolean;
}): ModelFailureKind;
export declare function modelProviderFailurePresentation(error: any): {
    retryCount: number;
    maxRetries: number;
    maxAttempts: number;
    stopReason: ModelRetryStopReason;
    stopReasonText: string;
    text: string;
    attemptCount: number;
    requestDispatchCount: number;
    responseStartedCount: number;
    providerRequestIdPresent: boolean;
    contentStored: boolean;
    unavailable: boolean;
    presentable: boolean;
    failureKind: ModelFailureKind;
};
