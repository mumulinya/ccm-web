import { type CollabCtx } from "../collaboration/collaboration";
import type { AgentRoutineRun } from "../../agents/agent-governance-types";
interface AutomationDispatchOutcome {
    queued: boolean;
    skipped?: boolean;
    coalesced?: boolean;
    duplicate?: boolean;
    failed?: boolean;
    reason?: string;
    error?: unknown;
    task?: any;
    routineRun?: AgentRoutineRun;
}
export declare function dispatchAutomationDefinitionOccurrence(ctx: CollabCtx, definition: any, now: Date, occurrenceId?: string): Promise<AutomationDispatchOutcome>;
export declare function drainDeferredAutomationWindows(ctx: CollabCtx): Promise<any[]>;
export declare function startAutomationScheduler(ctx: CollabCtx): void;
export declare function stopAutomationScheduler(): void;
export declare function automationSchedulerStatus(): {
    running: boolean;
    tick_in_progress: boolean;
    interval_ms: number;
};
export {};
