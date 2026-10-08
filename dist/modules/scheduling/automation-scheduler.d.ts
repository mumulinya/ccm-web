import { type CollabCtx } from "../collaboration/collaboration";
export declare function dispatchAutomationDefinitionOccurrence(ctx: CollabCtx, definition: any, now: Date, occurrenceId?: string): Promise<{
    queued: boolean;
    skipped: boolean;
    reason: string;
    duplicate?: undefined;
    routineRun?: undefined;
    coalesced?: undefined;
    task?: undefined;
    failed?: undefined;
    error?: undefined;
} | {
    queued: boolean;
    duplicate: boolean;
    routineRun: import("../../agents/agent-governance-types").AgentRoutineRun;
    skipped?: undefined;
    reason?: undefined;
    coalesced?: undefined;
    task?: undefined;
    failed?: undefined;
    error?: undefined;
} | {
    queued: boolean;
    skipped: boolean;
    reason: string;
    routineRun: import("../../agents/agent-governance-types").AgentRoutineRun;
    duplicate?: undefined;
    coalesced?: undefined;
    task?: undefined;
    failed?: undefined;
    error?: undefined;
} | {
    queued: boolean;
    coalesced: boolean;
    reason: string;
    routineRun: import("../../agents/agent-governance-types").AgentRoutineRun;
    skipped?: undefined;
    duplicate?: undefined;
    task?: undefined;
    failed?: undefined;
    error?: undefined;
} | {
    queued: boolean;
    task: any;
    routineRun: import("../../agents/agent-governance-types").AgentRoutineRun;
    skipped?: undefined;
    reason?: undefined;
    duplicate?: undefined;
    coalesced?: undefined;
    failed?: undefined;
    error?: undefined;
} | {
    queued: boolean;
    failed: boolean;
    error: any;
    routineRun: import("../../agents/agent-governance-types").AgentRoutineRun;
    skipped?: undefined;
    reason?: undefined;
    duplicate?: undefined;
    coalesced?: undefined;
    task?: undefined;
}>;
export declare function startAutomationScheduler(ctx: CollabCtx): void;
export declare function stopAutomationScheduler(): void;
export declare function automationSchedulerStatus(): {
    running: boolean;
    tick_in_progress: boolean;
    interval_ms: number;
};
