import type { LlmChatMessage } from "./group-orchestrator-llm-client";
export declare function tryBuildGroupNativeCoordinatorMessages(input: {
    group: any;
    message: string;
    groupSessionId?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    identityRules: string;
    sessionGuidance: string;
    mcpPolicy?: string;
    mainAgentToolResults?: any[];
    config?: any;
}): LlmChatMessage[] | null;
