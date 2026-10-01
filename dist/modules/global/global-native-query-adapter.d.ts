import { type ProviderToolCall, type ProviderToolDefinition } from "../../system/provider-native-tools";
export declare function globalNativeTools(run: any): ProviderToolDefinition[];
export declare function nativeTurnToGlobalDecision(parsed: any, pendingWrite?: ProviderToolCall | null): {
    state: string;
    message: string;
    tool: {
        name: string;
        arguments: any;
    };
    workflowDecision: any;
    targets?: undefined;
    plan?: undefined;
} | {
    state: string;
    message: string;
    tool: any;
    targets: any;
    workflowDecision: any;
    plan?: undefined;
} | {
    state: string;
    message: string;
    tool: any;
    plan: any;
    workflowDecision: any;
    targets?: undefined;
};
export declare function runGlobalNativeQueryCall(input: {
    config: any;
    messages: Array<{
        role: string;
        content: any;
    }>;
    run: any;
    signal?: AbortSignal;
    executeTool: (name: string, args: any, run: any, signal?: AbortSignal) => Promise<any>;
    onEvent?: (event: any) => void;
    onUsage?: (usage: any) => void;
    onContextUsageDelta?: (delta: string) => void;
    onCanonicalPayload?: (input: {
        messages: any[];
        tools: ProviderToolDefinition[];
        modelCallIndex: number;
        round: number;
    }) => void | {
        payloadChecksum?: string;
    };
    onConversationContextPressure?: (input: {
        messages: any[];
        tools: ProviderToolDefinition[];
        modelCallIndex: number;
        round: number;
        forcePromptTooLong: boolean;
        preRequestEvaluation: any;
    }) => Promise<any[] | null> | any[] | null;
    markVisibleFeedback?: (at?: number) => void;
    markProviderToken?: (at?: number) => void;
}): Promise<any>;
export declare function runGlobalNativeQuerySelfTest(): {
    pass: boolean;
    checks: {
        replyMapsAnswer: boolean;
        writeMapsExecute: boolean;
        stableGlobalToolSurface: boolean;
        searchLoadsOnlySelectedTool: boolean;
        confirmationDoesNotChangeProviderToolSurface: boolean;
    };
};
