import { type SessionExecutionEvent } from "./session-execution-ledger";
import { type CcmSessionTaskIndexV1 } from "../tasks/session-task-timeline";
import type { CcmPartialCompactionProjectionV2 } from "./manual-session-compaction";
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
export type SessionModelContextPostTurnCompactionPolicy = {
    enabled?: boolean;
    persist?: boolean;
    scopeId?: string;
    generation?: number;
    attempt?: number;
    trigger?: "turn_completed" | "terminal_gate_completed" | "context_pressure" | "manual";
    singleResultThresholdTokens?: number;
    turnResultThresholdTokens?: number;
    contextPressure?: boolean;
    contextPressureThresholdTokens?: number;
    retainRecentCompletedTurns?: number;
    recentResultBudgetTokens?: number;
    lastProviderRequestTokens?: number;
    currentRepoStateChecksums?: Record<string, string>;
    pressureOnly?: boolean;
    protectedToolCallIds?: string[];
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
    postTurnCompaction?: SessionModelContextPostTurnCompactionPolicy;
    heading?: string;
    currentTaskId?: string;
    taskContext?: any;
    sessionTaskIndex?: CcmSessionTaskIndexV1 | null;
    partialCompaction?: CcmPartialCompactionProjectionV2 | null;
    consumeSessionStartHookContext?: boolean;
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
        timeGapDoesNotCompactToolResults: any;
        projectorPressureDoesNotCompactToolResults: any;
        largeToolResultStaysRawUntilPreRequestPressure: boolean;
        contentReplacementReceiptVerifies: boolean;
        toolPairsStayBound: boolean;
        configuredPolicyCanDisableMicroCompact: boolean;
        legacyConfigCannotReactivateMicroCompact: boolean;
    };
};
