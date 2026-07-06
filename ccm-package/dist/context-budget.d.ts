export type ContextBudgetInput = {
    prompt?: any;
    context?: any;
    history?: any[];
    maxChars?: number;
    maxTokens?: number;
    reservedOutputTokens?: number;
    autoCompactBufferTokens?: number;
};
export declare const DEFAULT_CONTEXT_WINDOW_TOKENS = 200000;
export declare const DEFAULT_RESERVED_OUTPUT_TOKENS = 20000;
export declare const DEFAULT_AUTO_COMPACT_BUFFER_TOKENS = 13000;
export declare const DEFAULT_WARNING_BUFFER_TOKENS = 20000;
export declare const DEFAULT_MANUAL_COMPACT_BUFFER_TOKENS = 3000;
export declare function estimateTextTokens(value: any): number;
export declare function compactPreserveEdges(value: any, max?: number, marker?: string): string;
export declare function buildContextBudget(input?: ContextBudgetInput): {
    chars: number;
    estimated_tokens: number;
    max_chars: number;
    max_tokens: number;
    reserved_output_tokens: number;
    auto_compact_threshold: number;
    warning_threshold: number;
    blocking_threshold: number;
    pressure: number;
    compact_recommended: boolean;
    boundary: {
        type: string;
        preserved_head_chars: number;
        preserved_tail_chars: number;
    };
};
export declare function getAutoCompactThreshold(input?: {
    maxTokens?: number;
    reservedOutputTokens?: number;
    autoCompactBufferTokens?: number;
}): number;
export declare function microCompactText(value: any, maxChars?: number): {
    text: string;
    compacted: boolean;
    original_chars: number;
    compacted_chars: number;
    tokens_before: number;
    tokens_after: number;
};
