import type { LlmChatMessage } from "./group-orchestrator-llm-client";
import { type ToolResultPersistContext } from "../../tools/tool-result-storage";
export declare function compactGroupMainToolResultsForPayload(rows?: any[], budgetTokens?: number, persistContext?: ToolResultPersistContext | null): {
    rows: any[];
    changed: boolean;
    tokens: any;
};
export declare function compactGroupNativeTranscript(messages: LlmChatMessage[], rows?: any[], budgetTokens?: number, persistContext?: ToolResultPersistContext | null): {
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
        persistOversizePreview: boolean;
    };
};
