import { type LlmCallOptions, type LlmChatMessage, type LlmTokenUsage } from "../modules/collaboration/group-orchestrator-llm-client";
import type { ProviderAgentTurn, ProviderToolCall, ProviderToolDefinition } from "../system/provider-native-tools";
import { type AgentLoopBudget } from "../system/agent-loop-budget";
import { type NativeReadonlyRunner } from './native-tool-scheduling';
import { type ConversationPlanScope } from "../system/conversation-plan-mode-gate";
import { type MainAgentTurnDecisionV1 } from "./main-agent-turn";
import { type NativeQueryFamily, type NativeToolResult } from "./native-query-messages";
import { type ToolResultPersistContext } from "../tools/tool-result-storage";
import type { CcmNativeModelCallLifecycle } from "../system/model-activity";
import type { CcmProviderStreamActivityV1 } from "../system/provider-stream-activity";
import { type CcmModelCallStageV1 } from "../system/agent-cache-affinity";
export declare const NATIVE_CONTROL_TOOL_NAMES: readonly ["ccm_ask_user", "ccm_present_plan", "ccm_dispatch"];
export type NativeControlToolName = typeof NATIVE_CONTROL_TOOL_NAMES[number];
export declare function isNativeControlTool(name: string): boolean;
export declare function nativeControlToolDefinitions(): ProviderToolDefinition[];
export declare function nativeDiscoveryToolDefinitions(): ProviderToolDefinition[];
export declare function catalogToNativeTools(toolContext: any): ProviderToolDefinition[];
export declare function shouldUseNativeQueryLoop(config: any): boolean;
export declare function mapNativeTurnToParsed(turn: ProviderAgentTurn, controlCalls?: ProviderToolCall[]): {
    responseType: string;
    shouldDelegate: boolean;
    reply: string;
    friendlyResponse: string;
    targets: any;
    workflowDecision: any;
    architecturePlan: any;
    coordinationPlan: any;
    plan?: undefined;
    questionForUser?: undefined;
    dispatchPolicy?: undefined;
    directResponse?: undefined;
} | {
    responseType: string;
    shouldDelegate: boolean;
    reply: string;
    friendlyResponse: string;
    plan: any;
    workflowDecision: any;
    targets?: undefined;
    architecturePlan?: undefined;
    coordinationPlan?: undefined;
    questionForUser?: undefined;
    dispatchPolicy?: undefined;
    directResponse?: undefined;
} | {
    responseType: string;
    shouldDelegate: boolean;
    reply: string;
    questionForUser: string;
    dispatchPolicy: {
        action: string;
        reason: string;
        structuredClarificationQuestions: any;
    };
    workflowDecision: any;
    friendlyResponse?: undefined;
    targets?: undefined;
    architecturePlan?: undefined;
    coordinationPlan?: undefined;
    plan?: undefined;
    directResponse?: undefined;
} | {
    responseType: string;
    shouldDelegate: boolean;
    reply: string;
    friendlyResponse: string;
    directResponse: string;
    workflowDecision: {
        reason: string;
        actionRequired: boolean;
        requiresCodeChanges: boolean;
    };
    targets?: undefined;
    architecturePlan?: undefined;
    coordinationPlan?: undefined;
    plan?: undefined;
    questionForUser?: undefined;
    dispatchPolicy?: undefined;
};
export type NativeQueryExecuteContext = {
    round: number;
    turn: ProviderAgentTurn;
    signal?: AbortSignal;
    startedCallIds: Set<string>;
    runReadonlyTools?: NativeReadonlyRunner;
    onToolResult?: (row: NativeToolResult) => void;
};
export type NativeQueryDeltaContext = {
    modelCallIndex: number;
    round: number;
};
export type NativeQueryLoopInput = {
    config: any;
    messages: LlmChatMessage[];
    tools: ProviderToolDefinition[];
    scope: ConversationPlanScope;
    scopeId: string;
    exactSessionId: string;
    signal?: AbortSignal;
    nativeToolReference?: boolean;
    retryProfile?: LlmCallOptions["retryProfile"];
    maxTokens?: number;
    promptCacheTracking?: any;
    providerContextCache?: any;
    onProviderContextCache?: (receipt: any) => void;
    onDelta?: (delta: string, context: NativeQueryDeltaContext) => void;
    onProviderStreamActivity?: (activity: CcmProviderStreamActivityV1) => void;
    onUsage?: (usage: LlmTokenUsage) => void;
    onCanonicalPayload?: (input: {
        messages: LlmChatMessage[];
        tools: ProviderToolDefinition[];
        modelCallIndex: number;
        round: number;
    }) => void | {
        payloadChecksum?: string;
        totalTokens?: number;
    };
    onConversationContextPressure?: (input: {
        messages: LlmChatMessage[];
        tools: ProviderToolDefinition[];
        modelCallIndex: number;
        round: number;
        forcePromptTooLong: boolean;
        preRequestEvaluation: any;
    }) => Promise<LlmChatMessage[] | null> | LlmChatMessage[] | null;
    onRetry?: LlmCallOptions["onRetry"];
    onModelCallStart?: (info: {
        round: number;
        modelCallIndex: number;
        modelCallStage?: CcmModelCallStageV1;
    }) => CcmNativeModelCallLifecycle | void;
    onBeforeToolExecution?: (info: {
        round: number;
        modelCallIndex: number;
        calls: ProviderToolCall[];
    }) => void;
    onTurn?: (info: {
        round: number;
        turn: ProviderAgentTurn;
        modelCallIndex: number;
    }) => void;
    executeTools: (calls: ProviderToolCall[], ctx: NativeQueryExecuteContext) => Promise<NativeToolResult[]>;
    isReadOnly?: (call: ProviderToolCall) => boolean;
    loopBudget?: AgentLoopBudget;
    planModeEnabled?: boolean;
    errorPrefix?: string;
    jsonFallback?: () => Promise<NativeQueryLoopResult>;
    callTurn?: (config: any, options: LlmCallOptions) => Promise<ProviderAgentTurn>;
    getTools?: () => ProviderToolDefinition[];
    getToolPromptLayout?: () => import('../tools/main-agent-tool-prompt').ToolPromptLayout;
    compactTranscript?: (messages: LlmChatMessage[]) => LlmChatMessage[];
    persistContext?: ToolResultPersistContext | null;
    checkpointIdentity?: {
        trace_id?: string;
        attempt_id?: string;
        finalMessageId?: string;
    };
    shouldStopAfterTools?: (calls: ProviderToolCall[], results: NativeToolResult[]) => boolean;
    onPlanningPhase?: (info: {
        phase: "exploring" | "drafting" | "reviewing" | "repairing" | "awaiting_user" | "invalidated";
        intensity: "focused" | "coordinated" | "critical";
        evidenceCount?: number;
        issueCount?: number;
    }) => void;
    /**
     * Revalidate source evidence immediately before a formal plan is reviewed.
     * Global conversations use this hook to ask the authorized project/group
     * main Agent for fresh signed evidence instead of trusting conversational
     * memory from an earlier turn.
     */
    resolvePlanningEvidence?: (plan: any) => Promise<NativeToolResult[]>;
    /** Explicit single_step forces serial execution; otherwise verified read-only batches may run in parallel. */
    toolExecutionMode?: "single_step" | "adaptive";
};
export type NativeQueryLoopResult = {
    parsed: any;
    decision: MainAgentTurnDecisionV1;
    text: string;
    messages: LlmChatMessage[];
    toolResults: NativeToolResult[];
    modelCallCount: number;
    toolRoundCount: number;
    toolCallCount: number;
    stopReason: string;
    usage: LlmTokenUsage | null;
    noProgressCount: number;
    continuationSegments: number;
    family: NativeQueryFamily;
    ptlRecoveryAttempts?: number;
    ptlDroppedMessageIds?: string[];
};
export declare function unstreamedTurnText(turnText: string, emitted: string): string;
export declare function mergeNativeTurnParsed(previous: any, next: any): any;
export declare function runNativeQueryLoop(input: NativeQueryLoopInput): Promise<NativeQueryLoopResult>;
export declare function runNativeQueryLoopSelfTest(): Promise<{
    pass: boolean;
    checks: {
        firstTurnReturnsWithoutJsonExtract: boolean;
        secondTurnHasAssistantToolCalls: any;
        secondTurnHasToolResult: any;
        loopEndsOnText: boolean;
        controlToolMapsClarify: boolean;
        controlToolMapsQuestionAlias: boolean;
        jsonModeFallsBack: boolean;
        unstreamedPrefix: boolean;
        unstreamedRemainder: boolean;
        unstreamedNoDup: boolean;
        flushedUnstreamedTurnText: boolean;
        deltaCarriesModelCallIdentity: boolean;
        speculativeNarrationPrecedesTool: boolean;
        dispatchPromiseRepairsToControlTool: boolean;
        emptyPostToolTurnRepairsToControlTool: boolean;
        emptyFollowupKeepsFirstTurnText: boolean;
        keepClarifyAcrossTextFollowup: boolean;
        planQualityRepairsOnce: boolean;
        planQualityAcceptsDegradedAfterRepair: boolean;
        planQualityPassesFirstShot: boolean;
        catalogEmitsDiscoveryTools: boolean;
        catalogUsesWorkspaceShortNames: boolean;
        catalogIncludesGroupBuiltin: boolean;
    };
    result: NativeQueryLoopResult;
}>;
