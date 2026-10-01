import { type CollabCtx } from "../collaboration/collaboration";
export declare function startAutomationScheduler(ctx: CollabCtx): void;
export declare function stopAutomationScheduler(): void;
export declare function automationSchedulerStatus(): {
    running: boolean;
    tick_in_progress: boolean;
    interval_ms: number;
};
