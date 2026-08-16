import type { LlmChatMessage } from "../../modules/collaboration/group-orchestrator-llm-client";
export { GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE } from "../main-agent-identity";
export declare function tryBuildGlobalNativeModelMessages(input: {
    sessionId: string;
    currentUserText: string;
    identityRules: string;
    sessionGuidance?: string;
    mcpPolicy?: string;
    continuation?: any;
    runHistory?: any[];
    metaBlocks?: Array<{
        title: string;
        body: string;
    }>;
    observations?: any[];
    config?: any;
}): LlmChatMessage[] | null;
