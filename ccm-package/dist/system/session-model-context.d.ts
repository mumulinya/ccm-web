import { type SessionExecutionEvent } from "./session-execution-ledger";
export type SessionModelContextScope = "global" | "group" | "project";
export type SessionModelContextMicroCompactPolicy = {
    enabled?: boolean;
    trigger?: "time_based" | "context_pressure" | "auto";
    mainThread?: boolean;
    gapThresholdMinutes?: number;
    keepRecent?: number;
    contextTokens?: number;
    pressureThresholdTokens?: number;
    contextPressureEnabled?: boolean;
    now?: string | number | Date;
};
export type SessionModelContextContentReplacementPolicy = {
    enabled?: boolean;
    maxResultTokens?: number;
    keepRecent?: number;
};
export type UnifiedSessionModelContextInput = {
    scope: SessionModelContextScope;
    sessionId: string;
    scopeId?: string;
    messages: any[];
    executionEvents?: SessionExecutionEvent[];
    canonicalSummary?: any;
    summarySource?: string;
    summaryChecksum?: string;
    boundaryGeneration?: number;
    summarizedThroughIndex?: number;
    lastSummarizedMessageId?: string;
    currentRequest?: any;
    microCompact?: SessionModelContextMicroCompactPolicy;
    contentReplacement?: SessionModelContextContentReplacementPolicy;
    heading?: string;
};
export declare function resolveSessionModelMicroCompactPolicy(config?: any, overrides?: SessionModelContextMicroCompactPolicy): SessionModelContextMicroCompactPolicy;
export declare function sessionModelMessageContent(value: any): string;
export declare function sessionModelMicroCompactReceiptChecksum(receipt: any): string;
export declare function verifySessionModelMicroCompactReceipt(receipt: any, expected?: {
    scope?: string;
    sessionId?: string;
    scopeId?: string;
}): {
    valid: boolean;
    issues: string[];
};
export declare function sessionModelReplacementTextMap(contentReplacement: any): Map<string, string>;
export declare function verifySessionModelContentReplacementReceipt(receipt: any, expected?: {
    scope?: string;
    sessionId?: string;
    scopeId?: string;
}): {
    valid: boolean;
    issues: string[];
};
export declare function buildUnifiedSessionModelContextProjection(input: UnifiedSessionModelContextInput): any;
export declare function runUnifiedSessionModelContextSelfTest(): {
    pass: boolean;
    checks: {
        precompactKeepsEveryTurn: boolean;
        precompactUsesNoCharacterCut: boolean;
        microCompactDisabledByDefault: boolean;
        exactScopeBound: boolean;
        tokenAccountingPresent: boolean;
        freshToolResultsRemainRaw: any;
        oldCompletedToolResultClearedSelectively: any;
        pressureTriggerClearsOldToolResult: boolean;
        oldLargeToolResultReplacedRecoverably: boolean;
        contentReplacementReceiptVerifies: boolean;
        toolPairsStayBound: boolean;
        configuredPolicyCanDisableMicroCompact: boolean;
        configuredPolicyControlsTimeAndRetention: boolean;
    };
};
