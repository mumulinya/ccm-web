type QueuePriority = "high" | "normal" | "low" | string;
export type UnifiedTaskSchedulerState = {
    schema: "ccm-unified-task-scheduler-state-v2";
    task_id: string;
    queue_key: string;
    workspace_lane: string;
    state: "queued" | "running" | "completed" | "failed";
    position: number;
    queued_at: string;
    started_at?: string;
    settled_at?: string;
    error?: string;
};
export declare function canonicalWorkspaceMutationLane(workDir: any, fallback?: string): string;
export declare function withUnifiedWorkspaceMutationLane<T>(workspaceLane: string, operation: () => Promise<T>): Promise<T>;
export declare function scheduleUnifiedTaskOperation<T>(input: {
    taskId: string;
    queueKey: string;
    workspaceLane: string;
    priority?: QueuePriority;
    operation: () => Promise<T>;
    onState?: (state: UnifiedTaskSchedulerState) => void;
}): Promise<T>;
export declare function getUnifiedTaskSchedulerStatus(): {
    schema: string;
    queued: number;
    running_lanes: string[];
    running_task_ids: string[];
    workspace_lanes: string[];
    queues: {
        queue_key: string;
        task_ids: string[];
    }[];
};
export {};
