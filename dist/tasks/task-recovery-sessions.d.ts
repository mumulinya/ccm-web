import { type CcmTaskScope } from "./task-context";
export declare function resolveTaskUserSession(taskInput: any, options?: {
    attempt?: number;
    forceRecoverySession?: boolean;
    expectedContextChecksum?: string;
}): {
    mode: string;
    reason: string;
    created: boolean;
    error: string;
    originalSessionId?: undefined;
    contamination?: undefined;
    activeSessionId?: undefined;
    binding?: undefined;
} | {
    mode: string;
    originalSessionId: string;
    reason: string;
    created: boolean;
    error: string;
    contamination: import("../agents/session-contamination-detector").ContaminationDecision & {
        anchor?: import("../agents/session-contamination-detector").TaskContextAnchor;
        headSequence?: number;
    };
    activeSessionId?: undefined;
    binding?: undefined;
} | {
    mode: string;
    originalSessionId: string;
    reason: any;
    created: boolean;
    error?: undefined;
    contamination?: undefined;
    activeSessionId?: undefined;
    binding?: undefined;
} | {
    mode: "original_reused" | "internal_task_session";
    originalSessionId: string;
    activeSessionId: string;
    created: boolean;
    reason: any;
    binding: import("./task-context").CcmTaskSessionBindingV1;
    contamination: import("../agents/session-contamination-detector").ContaminationDecision & {
        anchor?: import("../agents/session-contamination-detector").TaskContextAnchor;
        headSequence?: number;
    };
    error?: undefined;
};
export declare function resolveTaskAgentSessionProjection(task: any, workItem: any, attempt: number, mode?: "native_session" | "rehydrated_session" | "new_session" | "rejected"): {
    checksum: any;
    provider: string;
    project: string;
    taskContextChecksum: string;
    workItemChecksum: any;
    workspaceManifestChecksum: string;
    blockers: any[];
    contentStored: false;
    previousAgentSessionId?: string;
    taskId: string;
    workItemId: string;
    attempt: number;
    mode: "rejected" | "native_session" | "rehydrated_session" | "new_session";
};
export declare function rollbackResolvedTaskUserSession(resolution: any, scope: CcmTaskScope, scopeId: string): boolean;
export declare function purgeTaskRecoveryUserSessions(task: any): any[];
