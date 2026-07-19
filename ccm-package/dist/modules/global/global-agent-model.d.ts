export declare function callLlm(config: any, messages: any[], options?: {
    onUsage?: (usage: any) => void;
}): Promise<string>;
export declare function shouldRetryGlobalModelError(error: any): boolean;
export declare function callGlobalModelWithRetry(config: any, messages: any[], options?: {
    attempts?: number;
    delayMs?: number;
    onUsage?: (usage: any) => void;
    call?: (config: any, messages: any[]) => Promise<string>;
}): Promise<string>;
export declare function runGlobalModelRetrySelfTest(): Promise<{
    pass: boolean;
    checks: {
        transientFailureRetriesOnce: boolean;
        permanentClientErrorDoesNotRetry: boolean;
        openAiBaseUrlUsesV1Endpoint: boolean;
        anthropicBaseUrlUsesV1Endpoint: boolean;
    };
}>;
