import type { CcmUnifiedSessionSummaryV1 } from "./unified-session-compaction-types";
export declare function unifiedSummaryChecksum(summary: unknown): string;
export declare function normalizeCcmUnifiedSummary(value: any, sourceMessageIds?: string[]): CcmUnifiedSessionSummaryV1;
export declare function buildUnifiedSummaryReference(snapshot: {
    messages?: any[];
    executionEvents?: any[];
    activeSummary?: any;
}): CcmUnifiedSessionSummaryV1;
export declare const UNIFIED_COMPACTION_SYSTEM_PROMPT: string;
export declare function buildUnifiedSummaryPrompt(input: {
    snapshot: any;
    previousSummary?: any;
    reason?: string;
    customInstructions?: string;
}): string;
export declare function runUnifiedSummaryShapeCheck(summary: any): {
    valid: boolean;
    missing: string[];
};
