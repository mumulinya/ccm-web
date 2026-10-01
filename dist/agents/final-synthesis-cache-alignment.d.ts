import type { LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
/** Preserve an already-built main-Agent system prefix for a final-answer-only call. */
export declare function buildCacheAlignedFinalMessagesFromSystemPrefix(input: {
    baseMessages: LlmChatMessage[];
    instruction: string;
    payload: any;
}): LlmChatMessage[];
/** Build the same stable identity boundary used by a native main-Agent loop. */
export declare function buildCacheAlignedFinalMessages(input: {
    identityRules: string;
    sessionGuidance: string;
    mcpPolicy: string;
    toolPromptLayout?: import('../tools/main-agent-tool-prompt').ToolPromptLayout;
    instruction: string;
    payload: any;
}): LlmChatMessage[];
export declare function runFinalSynthesisCacheAlignmentSelfTest(): {
    pass: boolean;
    checks: {
        stableIdentityRemainsFirst: boolean;
        finalInstructionsStayDynamic: boolean;
        finalPayloadRemainsUserSuffix: boolean;
    };
};
