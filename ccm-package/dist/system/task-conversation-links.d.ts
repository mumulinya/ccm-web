export type TaskConversationScope = "global" | "project" | "group";
export interface TaskConversationLinkV1 {
    schema: "ccm-task-conversation-link-v1";
    linkId: string;
    relation: "source" | "target";
    taskId: string;
    missionId?: string;
    scope: TaskConversationScope;
    scopeId: string;
    exactSessionId: string;
    messageId?: string;
    title: string;
    available: boolean;
    unavailableReason?: string;
    generation: number;
    revision: number;
    bindingChecksum: string;
    contentStored: false;
}
export type TaskMutationConflictCode = "TASK_REVISION_CONFLICT" | "TASK_GENERATION_CONFLICT" | "TASK_BINDING_CONFLICT" | "TASK_TARGET_UNAVAILABLE";
export type TaskMutationGuardResult = {
    valid: true;
    revision: number;
    generation: number;
    bindingChecksum: string;
} | {
    valid: false;
    status: 409;
    code: TaskMutationConflictCode;
    error: string;
    details: Record<string, any>;
};
export declare function buildTaskConversationLinks(taskOrId: any, tasksInput?: any[]): {
    schema: string;
    taskId: string;
    missionId: string;
    revision: number;
    generation: number;
    bindingChecksum: string;
    projectionRevision: string;
    links: TaskConversationLinkV1[];
    contentStored: boolean;
};
/**
 * Optimistic concurrency fence shared by all task-card mutations.
 * Legacy/internal callers remain compatible when they omit a guard; new user-facing cards always submit it.
 */
export declare function validateTaskMutationGuard(task: any, payload?: any, options?: {
    requireTarget?: boolean;
}): TaskMutationGuardResult;
export declare function buildGlobalMissionSafeProjection(mission: any, children?: any[], supervisor?: any): {
    schema: string;
    status: string;
    summary: string;
    files: any[];
    verification: string[];
    risks: string[];
    remainingItems: string[];
    acceptancePassed: boolean;
    contentStored: boolean;
};
