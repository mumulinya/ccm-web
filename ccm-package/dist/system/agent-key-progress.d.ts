import { type UserVisibleAgentEvent } from "./user-visible-agent-events";
import { type AssistantProgressKind } from "./assistant-progress";
export declare const CCM_AGENT_KEY_PROGRESS_SCHEMA: "ccm-agent-key-progress-v1";
export type CcmAgentKeyProgressKind = "model_preamble" | "phase_update" | "tool_batch_started" | "tool_batch_completed" | "model_key_summary" | "child_agent_update" | "verification_update";
export type CcmAgentKeyProgressSource = "model_stream" | "deterministic" | "summary_model" | "child_agent";
export type CcmAgentKeyProgressV1 = {
    schema: typeof CCM_AGENT_KEY_PROGRESS_SCHEMA;
    eventId: string;
    scope: "global" | "group" | "project";
    exactSessionId: string;
    turnId: string;
    generation: number;
    modelCallIndex: number;
    round: number;
    kind: CcmAgentKeyProgressKind;
    text: string;
    source: CcmAgentKeyProgressSource;
    status: "running" | "success" | "failed" | "waiting";
    toolCallIds?: string[];
    relatedToolCallIds?: string[];
    relatedEventIds?: string[];
    contentStored: false;
};
type ProgressCoordinatorInput = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    generation?: number;
    anchorMessageId?: string;
    taskId?: string;
    title?: string;
    target?: string;
    goal?: string;
    modelCallIndex?: number;
    config?: any;
};
type ProgressEmitInput = {
    kind: CcmAgentKeyProgressKind | AssistantProgressKind;
    text: string;
    source?: CcmAgentKeyProgressSource;
    status?: "running" | "success" | "failed" | "waiting";
    modelCallIndex?: number;
    round?: number;
    toolCallIds?: string[];
    relatedToolCallIds?: string[];
    relatedEventIds?: string[];
    eventId?: string;
    detail?: any;
};
/**
 * Shared safe progress projection for global, group and project conversations.
 * It deliberately writes only the short user-facing milestone, never model
 * prompts, hidden reasoning or raw tool output.
 */
export declare function recordAgentKeyProgress(input: ProgressCoordinatorInput & ProgressEmitInput): UserVisibleAgentEvent | null;
export declare function createAgentKeyProgressCoordinator(input: ProgressCoordinatorInput): {
    enabled: boolean;
    emit: (event: ProgressEmitInput) => UserVisibleAgentEvent;
    phase(phase: string, modelCallIndex?: number, round?: number): UserVisibleAgentEvent;
    modelPreamble(text: string, modelCallIndex?: number, round?: number): UserVisibleAgentEvent;
    toolBatchStarted(calls: any[], round: number, modelCallIndex?: number): UserVisibleAgentEvent;
    toolBatchCompleted(results: any[], round: number, modelCallIndex?: number): UserVisibleAgentEvent;
    childAgent(text: string, modelCallIndex?: number, round?: number, status?: ProgressEmitInput["status"]): UserVisibleAgentEvent;
    verification(text: string, modelCallIndex?: number, round?: number, status?: ProgressEmitInput["status"]): UserVisibleAgentEvent;
    shouldSummarize(round: number, calls?: any[]): boolean;
    markSummary(round: number): void;
    summarizeToolBatch(round: number, results: any[], callSummaryModel?: (prompt: string) => Promise<string>, modelCallIndex?: number): Promise<UserVisibleAgentEvent>;
    buildFallback(calls: any[]): string;
};
export declare function runAgentKeyProgressSelfTest(): {
    schema: "ccm-agent-key-progress-v1";
    singleTool: boolean;
    multiTool: boolean;
    secondRound: boolean;
    fallback: string;
    passed: boolean;
};
export {};
