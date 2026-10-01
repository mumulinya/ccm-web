type ReactionScope = "global" | "project";
type ReactionStatus = "completed" | "failed" | "cancelled";
type ReactionCredentials = {
    appId: string;
    appSecret: string;
};
type ReactionDependencies = {
    fetchImpl?: typeof fetch;
    resolveCredentials?: (scope: ReactionScope, project: string) => ReactionCredentials;
    timeoutMs?: number;
};
export declare function beginFeishuReactionFeedback(input: {
    scope?: ReactionScope;
    project?: string;
    messageId?: string;
}, deps?: ReactionDependencies): {
    accepted: boolean;
    duplicate: boolean;
    key: string;
};
export declare function finishFeishuReactionFeedback(input: {
    scope?: ReactionScope;
    project?: string;
    messageId?: string;
    status?: ReactionStatus;
}, deps?: ReactionDependencies): {
    accepted: boolean;
    missing: boolean;
    key: string;
    status?: undefined;
    error?: undefined;
} | {
    accepted: boolean;
    missing: boolean;
    key: string;
    status: ReactionStatus;
    error: string;
} | {
    accepted: boolean;
    missing: boolean;
    key: string;
    status: ReactionStatus;
    error?: undefined;
};
export declare function getFeishuReactionFeedbackState(): {
    key: string;
    scope: ReactionScope;
    project: string;
    finalizing: boolean;
}[];
export declare function handleFeishuReactionFeedbackApi(pathname: string, req: any, res: any): boolean;
export declare function runFeishuReactionFeedbackSelfTest(): Promise<{
    pass: boolean;
    checks: {
        startAccepted: boolean;
        duplicateSuppressed: boolean;
        finishAccepted: boolean;
        processingAddedFirst: boolean;
        processingRemoved: boolean;
        doneAddedLast: boolean;
        failedTurnAddedProcessing: boolean;
        failedTurnRemovedProcessing: boolean;
        failedTurnDidNotClaimDone: boolean;
        stateReleased: boolean;
    };
    callCount: number;
}>;
export {};
