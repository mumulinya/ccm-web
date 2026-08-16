import type { LlmChatMessage } from "./group-orchestrator-llm-client";
export declare function compactGroupMainToolResultsForPayload(rows?: any[], budgetTokens?: number): {
    rows: any[];
    changed: boolean;
    tokens: any;
};
export declare function compactGroupNativeTranscript(messages: LlmChatMessage[], rows?: any[], budgetTokens?: number): {
    messages: LlmChatMessage[];
    rows: any[];
    changed: boolean;
    tokens: any;
};
export declare function runGroupMainToolResultCompactSelfTest(): {
    pass: boolean;
    checks: {
        reducedTokens: boolean;
        keptGrepPreview: boolean;
        keptSmallRow: boolean;
        fileReadKeepsContent: boolean;
        transcriptRewritesToolResult: boolean;
    };
};
