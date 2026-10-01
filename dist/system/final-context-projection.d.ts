export declare const FINAL_CONTEXT_PROJECTION_SCHEMA = "ccm-final-context-projection-v1";
export declare const DEFAULT_FINAL_DYNAMIC_CONTEXT_BUDGET = 0;
export type FinalContextProjectionResult = {
    schema: typeof FINAL_CONTEXT_PROJECTION_SCHEMA;
    messages: any[];
    changed: boolean;
    enabled: boolean;
    originalTokens: number;
    projectedTokens: number;
    originalDynamicTokens: number;
    projectedDynamicTokens: number;
    budgetTokens: number;
    compactedMessageCount: number;
    preservedRecentMessageCount: number;
    omittedContentChecksum: string;
    projectionChecksum: string;
    microCompactApplied: boolean;
    microCompactReason: string;
    clearedToolResultCount: number;
    clearedToolResultTokens: number;
    retainedToolResultTokens: number;
    activeToolResultTokens: number;
    duplicateToolResultTokens: number;
    boundaryChecksum: string;
    contentStored: false;
};
export declare function finalContextProjectionEnabled(config?: any): boolean;
export declare function resolveFinalContextBudget(config?: any, stableTokens?: number): number;
/**
 * Compact only model-visible message content. Protocol roles, tool call IDs,
 * assistant tool declarations and the authoritative execution ledger remain
 * untouched. The same input always produces the same output.
 */
export declare function projectFinalContextMessages(messagesInput: any[], options?: {
    config?: any;
    budgetTokens?: number;
    preserveRecentMessages?: number;
    preserveAppendOnlyPrefix?: boolean;
}): FinalContextProjectionResult;
export declare function runFinalContextProjectionSelfTest(): {
    pass: boolean;
    checks: {
        stableSystemPreserved: boolean;
        recentMessagePreserved: boolean;
        toolProtocolPreserved: boolean;
        reduced: boolean;
        deterministic: boolean;
        contentNotStored: boolean;
    };
    result: FinalContextProjectionResult;
};
