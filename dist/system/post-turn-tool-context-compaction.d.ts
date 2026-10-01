import type { SessionExecutionEvent } from "./session-execution-ledger";
/**
 * V1 is a read-only compatibility contract. New generations must use
 * pre-request-tool-context.ts and must never persist this schema.
 */
export type CcmConsumedToolEvidenceV1 = {
    schema: "ccm-consumed-tool-evidence-v1";
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    generation: number;
    attempt: number;
    toolCallId: string;
    toolName: string;
    projectId?: string;
    evidenceRefs: Array<{
        projectId?: string;
        path?: string;
        ranges?: Array<{
            startLine: number;
            endLine: number;
        }>;
        checksum: string;
    }>;
    repoStateChecksum?: string;
    resultChecksum: string;
    resultState: "complete" | "partial" | "failed" | "stale";
    factSummary?: Record<string, unknown>;
    conclusionMessageId?: string;
    conclusionChecksum?: string;
    unresolvedCodes: string[];
    originalTokens: number;
    retainedTokens: number;
    rehydratable: boolean;
    contentStored: false;
};
export type CcmPostTurnToolContextCompactionReceiptV1 = {
    schema: "ccm-post-turn-tool-context-compaction-receipt-v1";
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    generation: number;
    attempt: number;
    trigger: "turn_completed" | "terminal_gate_completed" | "context_pressure" | "manual";
    evaluatedToolCallCount: number;
    compactedToolCallIds: string[];
    preservedToolCallIds: string[];
    tokensBefore: number;
    tokensAfter: number;
    tokensFreed: number;
    evidenceChecksum: string;
    rawExecutionLedgerPreserved: true;
    status: "applied" | "not_required" | "partial";
    contentStored: false;
    receiptChecksum: string;
};
export type CcmContextRetentionMetricsV1 = {
    schema: "ccm-context-retention-metrics-v1";
    retentionStrategy: "dynamic_scope_pressure";
    contextPressure: boolean;
    contextPressureRatio?: number;
    recentCompletedTurnLimit: number;
    recentToolResultBudgetTokens: number;
    retainedRecentToolResultTokens: number;
    lastProviderRequestTokens: number;
    nextTurnRetainedTokens: number;
    activeToolResultTokens: number;
    compressedEvidenceTokens: number;
    reclaimedToolResultTokens: number;
    lastCompactedAt?: string;
    lastCompactionTrigger?: string;
    contentStored: false;
};
export type CcmPostTurnToolContextStateV1 = {
    schema: "ccm-post-turn-tool-context-state-v1";
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    evidence: CcmConsumedToolEvidenceV1[];
    receipts: CcmPostTurnToolContextCompactionReceiptV1[];
    retentionMetrics: CcmContextRetentionMetricsV1;
    updatedAt: string;
    contentStored: false;
};
export declare function loadPostTurnToolContextState(scope: "global" | "group" | "project", scopeId: string, exactSessionId: string): CcmPostTurnToolContextStateV1 | null;
export declare function deletePostTurnToolContextState(scope: "global" | "group" | "project", scopeId: string, exactSessionId: string): {
    deleted: boolean;
    contentStored: boolean;
};
/** @deprecated Read-only compatibility stub. It intentionally never writes or replaces model content. */
export declare function compactConsumedToolResultsAfterTurn(input: {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    messages?: unknown[];
    executionEvents?: SessionExecutionEvent[];
    lastProviderRequestTokens?: number;
    [key: string]: unknown;
}): {
    evidence: CcmConsumedToolEvidenceV1[];
    receipts: CcmPostTurnToolContextCompactionReceiptV1[];
    replacements: Map<string, string>;
    compactedToolCallIds: string[];
    preservedToolCallIds: string[];
    retentionMetrics: CcmContextRetentionMetricsV1;
    persistedState: any;
    compatibilityOnly: boolean;
};
export declare function verifyPostTurnToolContextCompactionReceipt(receipt: any, expected?: {
    scope?: string;
    scopeId?: string;
    exactSessionId?: string;
}): {
    valid: boolean;
    issues: string[];
};
export declare function runPostTurnToolContextCompactionSelfTest(): {
    pass: boolean;
    checks: {
        compatibilityOnly: boolean;
        noCompaction: boolean;
        noReceiptWrite: boolean;
        toolResultPreserved: boolean;
    };
};
