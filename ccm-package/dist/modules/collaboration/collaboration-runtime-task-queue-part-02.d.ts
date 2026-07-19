import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function buildPlanModeClarificationQuestions(message: string, risk?: any, selectedProjects?: string[]): any;
export declare function buildGroupPlanModePreflight(input: {
    group: any;
    message: string;
    ctx: CollabCtx;
    configs?: any[];
    taskIntent?: any;
    attachmentCount?: number;
    coordinatorProject?: string;
}): any;
export declare function buildGroupProjectAnalysisContext(group: any, message: string, ctx: CollabCtx, configs?: any[]): string;
export declare function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string): any;
export declare function runCollaborationUxSelfTest(): any;
export declare function buildInlineTaskRuntime(task: any): {
    taskId: any;
    status: any;
    statusText: any;
    updatedAt: any;
    lifecycle: any;
    reasoning: {
        planVersion: number;
        openAssertions: any;
        deviations: any;
        recoveryChecks: any;
        lastDecision: any;
    };
    counts: {
        total: number;
        running: number;
        reviewing: number;
        failed: number;
        mergeReady: number;
    };
    agents: {
        project: string;
        state: import("../../agents/execution-kernel").ExecutionState;
        green: any;
        failureClass: any;
        runtimeFallbacks: number;
        conflictGroup: any;
    }[];
    sessions: any;
    taskCard: any;
    task_card: any;
};
export declare function updateGroupTaskInlineStatus(task: any, status: string, detail?: string): {
    taskId: any;
    status: any;
    statusText: any;
    updatedAt: any;
    lifecycle: any;
    reasoning: {
        planVersion: number;
        openAssertions: any;
        deviations: any;
        recoveryChecks: any;
        lastDecision: any;
    };
    counts: {
        total: number;
        running: number;
        reviewing: number;
        failed: number;
        mergeReady: number;
    };
    agents: {
        project: string;
        state: import("../../agents/execution-kernel").ExecutionState;
        green: any;
        failureClass: any;
        runtimeFallbacks: number;
        conflictGroup: any;
    }[];
    sessions: any;
    taskCard: any;
    task_card: any;
};
export declare function buildChildAgentWorkerHandoff(targetProject: string, taskText?: string, options?: any): any;
export declare function taskAgentInvocationMemoryOptions(edge: any): any;
export declare function taskAgentSessionLifecycleRunnerOptions(snapshot: any): any;
export declare function buildWorkerContinuationHandoff(task: any, targetProject?: string, options?: any): any;
export declare function buildChildAgentDevelopmentContract(targetProject: string, taskText?: string, options?: any): any;
export declare function getTaskById(taskId: string): any;
export declare function buildChildAgentTaskText(childTaskText: string, task?: any): string;
export declare function buildQueuedGroupTaskMessage(task: any): any;
export declare function normalizePlanAssignments(assignments: any[]): any[];
export declare function buildWorkflowMeta(phase: string, label?: string): {
    phase: string;
    label: string;
    updated_at: string;
};
export declare function getInitialWorkflowMeta(assignments: any[], dispatchPolicy: any, label?: string): {
    phase: string;
    label: string;
    updated_at: string;
};
export declare function updateGroupMessageAssignmentStatus(groupId: string, messageId: string, project: string, status: string, statusText?: string): any;
export declare function sendTaskCompletionNotification(task: any, result: string): Promise<void>;
export declare function sendTaskFailureNotification(task: any, errorMsg: string): Promise<void>;
export declare function appendTaskGroupReport(task: any, status: "done" | "waiting" | "failed", detail?: string): void;
export declare function buildTaskProviderSwitchRequests(task?: any): Record<string, any>;
export declare function appendLegacyTaskExecutionGroupReport(input: {
    groupId: string;
    task: any;
    status: "done" | "waiting" | "failed";
    detail?: string;
    rawResult?: string;
    fileChanges?: any;
}): void;
export declare function appendLegacyCodeReviewGroupReport(input: {
    groupId: string;
    project: string;
    coordinator: string;
    reviewResults: any[];
}): void;
export declare function syncTaskBacklogStatus(task: any, status: "queued" | "in_progress" | "done" | "blocked" | "failed", result?: string): any;
export declare function getTaskTargetKey(task: any): string;
export declare function isActionableMentionText(text: string): boolean;
export declare function normalizeMentionTask(text: string): string;
export declare function escapeRegExp(value: string): string;
export declare function extractActionableMentions(text: string, group: any, sourceProject?: string): any[];
export declare function buildAgentQaProtocolInstructions(currentAgent: string, memberList: string): string;
