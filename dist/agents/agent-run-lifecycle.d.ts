import type { AgentRunStatus } from "./agent-run-types";
export declare function isAgentRunTerminal(status: AgentRunStatus | string): boolean;
export declare function canTransitionAgentRun(from: AgentRunStatus | string, to: AgentRunStatus | string): boolean;
export declare function assertAgentRunTransition(from: AgentRunStatus | string, to: AgentRunStatus | string): void;
export declare function listAgentRunTransitions(): {
    [k: string]: ("queued" | "paused" | "failed" | "cancelled" | "running" | "recovering" | "succeeded" | "waiting_confirmation" | "recovery_required" | "starting" | "created" | "leased" | "waiting_input")[];
};
