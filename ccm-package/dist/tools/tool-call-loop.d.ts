import type { ToolScope } from "./tool-manager";
export interface ParsedToolCall {
    name: string;
    arguments: any;
}
export interface ToolLoopContinuation {
    output: string;
    nativeSessionId?: string;
}
export interface ToolLoopEvent {
    type: "round_started" | "tool_result" | "continuation_started" | "loop_finished";
    round: number;
    tool?: string;
    ok?: boolean;
    text: string;
}
export interface ToolLoopOptions {
    initialOutput: string;
    initialSessionId?: string;
    scope?: ToolScope;
    runtime?: string;
    project?: string;
    groupId?: string;
    taskId?: string;
    executionId?: string;
    source?: string;
    maxRounds?: number;
    maxCallsPerRound?: number;
    parseToolCalls: (text: string) => ParsedToolCall[];
    executeToolCall: (name: string, args: any, scope?: ToolScope) => Promise<string>;
    continueAgent: (prompt: string, state: {
        round: number;
        nativeSessionId: string;
        transcript: string;
        toolResults: string;
    }) => Promise<ToolLoopContinuation>;
    onEvent?: (event: ToolLoopEvent) => void;
}
export interface ToolLoopResult {
    output: string;
    finalOutput: string;
    nativeSessionId: string;
    rounds: number;
    toolCalls: number;
    termination: "no_tool_call" | "completed" | "max_rounds" | "duplicate_call" | "continuation_failed";
    auditFile: string;
}
export declare function buildToolContinuationPrompt(input: {
    round: number;
    transcript: string;
    toolResults: string;
    hasNativeSession: boolean;
}): string;
export declare function runToolCallLoop(options: ToolLoopOptions): Promise<ToolLoopResult>;
export declare function runToolCallLoopSelfTest(): Promise<{
    pass: boolean;
    checks: {
        executesTool: boolean;
        continuesSameSession: boolean;
        feedsResultBack: boolean;
        finishesAfterContinuation: boolean;
        keepsTranscript: boolean;
    };
    result: ToolLoopResult;
}>;
