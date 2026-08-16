import type { LlmChatMessage } from "../collaboration/group-orchestrator-llm-client";
import { PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE, buildProjectMainSessionGuidance } from "../../agents/main-agent-identity";
export { PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE, buildProjectMainSessionGuidance };
export declare function tryBuildProjectNativeMainMessages(input: {
    project: string;
    projectSessionId: string;
    userMessage: string;
    identityRules: string;
    sessionGuidance?: string;
    mcpPolicy?: string;
    metaBlocks?: Array<{
        title: string;
        body: string;
    }>;
    toolResults?: any[];
    config?: any;
}): LlmChatMessage[] | null;
