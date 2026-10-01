export type TaskLifecycleStatus = "pending" | "queued" | "in_progress" | "executing" | "reviewing" | "reworking" | "blocked" | "waiting_user" | "paused" | "completed" | "done" | "failed" | "cancelled" | "reverted";
export declare const TASK_STATUS_CANONICAL: Record<string, TaskLifecycleStatus>;
export declare function canonicalTaskStatus(value: any): TaskLifecycleStatus | string;
export declare function normalizeTaskStatus(value: any): TaskLifecycleStatus | string;
export declare function validateTaskLifecycleTransition(from: any, to: any, context?: string): {
    valid: boolean;
    issues: string[];
    from: string;
    to: string;
};
export declare function normalizeTaskLifecycle(task: any): {
    status: string;
    acceptanceState: string;
    phase: string;
    terminal: boolean;
};
export declare function runTaskLifecycleSelfTest(): boolean;
export declare function taskAvailableActions(task: any): string[];
