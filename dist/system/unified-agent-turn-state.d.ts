import type { UserVisibleAgentEvent } from "./user-visible-agent-events";
export type UnifiedAgentTurnState = "thinking" | "planning" | "executing" | "waiting_user" | "waiting_dependency" | "verifying" | "completed" | "failed" | "interrupted" | "cancelled";
export declare function projectUnifiedAgentTurnState(events: UserVisibleAgentEvent[]): {
    state: "completed" | "failed" | "cancelled" | "interrupted";
    generation: number;
    terminal: boolean;
    showThinking: boolean;
    eventId: string;
    contentStored: boolean;
} | {
    state: "executing" | "waiting_user" | "planning" | "thinking" | "waiting_dependency" | "verifying";
    generation: number;
    terminal: boolean;
    showThinking: boolean;
    eventId: string;
    contentStored: boolean;
};
export declare function projectUnifiedAgentTurnStates(events: UserVisibleAgentEvent[]): {
    [k: string]: {
        state: "completed" | "failed" | "cancelled" | "interrupted";
        generation: number;
        terminal: boolean;
        showThinking: boolean;
        eventId: string;
        contentStored: boolean;
    } | {
        state: "executing" | "waiting_user" | "planning" | "thinking" | "waiting_dependency" | "verifying";
        generation: number;
        terminal: boolean;
        showThinking: boolean;
        eventId: string;
        contentStored: boolean;
    };
};
