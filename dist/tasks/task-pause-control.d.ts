export type TaskPauseState = "requested" | "quiescing" | "paused" | "resuming" | "blocked";
export type TaskPauseCheckpointV1 = {
    phase: string;
    workItemId?: string;
    planChecksum: string;
    workspaceChecksum?: string;
    completedWorkItemIds: string[];
    suspendedSessionCount: number;
};
export type TaskPauseControlV1 = {
    schema: "ccm-task-pause-control-v1";
    state: TaskPauseState;
    taskId: string;
    generation: number;
    attempt: number;
    pauseSequence: number;
    revision: number;
    requestedAt: string;
    pausedAt?: string;
    resumedAt?: string;
    checkpoint?: TaskPauseCheckpointV1;
    pendingWriterCount: number;
    blockedReason?: string;
    checksum: string;
    contentStored: false;
};
export declare const TASK_PAUSE_STUCK_MS = 30000;
export declare function taskPausePlanChecksum(task: any): string;
export declare function taskPauseWorkspaceChecksum(task: any): string;
export declare function taskPauseCompletedWorkItemIds(task: any): any;
export declare function isTaskPauseRequested(task: any): boolean;
export declare function isTaskSafelyPaused(task: any): boolean;
export declare function isTaskPauseHeld(task: any): boolean;
export declare function validateTaskPauseControl(control: any): boolean;
export declare function createTaskPauseRequest(task: any, input?: {
    pendingWriterCount?: number;
    phase?: string;
    workItemId?: string;
    suspendedSessionCount?: number;
    requestedAt?: string;
}): TaskPauseControlV1;
export declare function updateTaskPauseProgress(task: any, input: {
    state?: TaskPauseState;
    pendingWriterCount?: number;
    suspendedSessionCount?: number;
    workspaceChecksum?: string;
    blockedReason?: string;
    pausedAt?: string;
}): TaskPauseControlV1;
export declare function createTaskResumeControl(task: any, resumedAt?: string): TaskPauseControlV1;
export declare function validateTaskPauseResume(task: any, input?: {
    currentWorkspaceChecksum?: string;
    authorizationValid?: boolean;
    runtimeValid?: boolean;
    activeWriterCount?: number;
}): {
    valid: boolean;
    checks: {
        control_valid: boolean;
        safely_paused: boolean;
        generation_unchanged: boolean;
        attempt_unchanged: boolean;
        plan_unchanged: boolean;
        workspace_unchanged: boolean;
        authorization_valid: boolean;
        runtime_valid: boolean;
        no_active_writers: boolean;
    };
    reason: string;
};
export declare function taskPauseStatusProjection(task: any, input?: {
    activeWriterCount?: number;
    descendantCount?: number;
    childPausedCount?: number;
}): {
    schema: string;
    taskId: string;
    state: string;
    requestedAt: string;
    pausedAt: string;
    resumedAt: string;
    elapsedMs: number;
    stuck: boolean;
    activeWriterCount: number;
    descendantCount: number;
    childPausedCount: number;
    checkpoint: {
        phase: string;
        completedWorkItemCount: any;
        suspendedSessionCount: number;
    };
    pauseSequence: number;
    revision: number;
    generation: number;
    availableActions: {
        id: string;
        kind: string;
        label: string;
        enabled: boolean;
    }[];
    checksum: string;
    contentStored: boolean;
};
export declare function taskPauseBoundaryError(task: any, phase?: string, workItemId?: string): any;
export declare function assertTaskPauseBoundary(task: any, phase?: string, workItemId?: string): void;
export declare function runTaskPauseControlSelfTest(): {
    pass: boolean;
    checks: {
        requestIsDurable: boolean;
        pausesWithoutGenerationChange: boolean;
        preservesCompletedWork: boolean;
        resumesSameSequence: boolean;
        validatesUnchangedState: boolean;
    };
};
