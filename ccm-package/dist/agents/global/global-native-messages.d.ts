import type { LlmChatMessage } from "../../modules/collaboration/group-orchestrator-llm-client";
export declare const GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = "\u7CBE\u786E\u4F1A\u8BDD\u91CC\u5DF2\u6709\u76EE\u6807\u3001\u8BA1\u5212\u548C\u5DE5\u5177\u89C2\u5BDF\u89C6\u4E3A\u5DF2\u77E5\uFF1B\u672A\u53D8\u5316\u7684\u4E8B\u5B9E\u4E0D\u8981\u91CD\u590D\u8BFB\u53D6\u3002prior_steps \u91CC\u5DF2\u7ECF\u51FA\u73B0\u8FC7\u7684\u89C2\u5BDF\u4E0D\u8981\u518D\u5F53\u65B0\u8BC1\u636E\u3002";
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
