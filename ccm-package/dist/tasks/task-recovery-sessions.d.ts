export declare function resolveTaskUserSession(taskInput: any, options?: {
    attempt?: number;
    forceRecoverySession?: boolean;
    expectedContextChecksum?: string;
}): {
    mode: string;
    originalSessionId: string;
    activeSessionId: any;
    reason: any;
    error: string;
    created: boolean;
    binding?: undefined;
    task?: undefined;
} | {
    mode: string;
    originalSessionId: string;
    reason: any;
    created: boolean;
    activeSessionId?: undefined;
    error?: undefined;
    binding?: undefined;
    task?: undefined;
} | {
    mode: string;
    originalSessionId: string;
    reason: string;
    created: boolean;
    error: string;
    activeSessionId?: undefined;
    binding?: undefined;
    task?: undefined;
} | {
    mode: "rejected" | "original_reused" | "recovery_session_created";
    originalSessionId: string;
    activeSessionId: string;
    created: boolean;
    reason: any;
    binding: import("./task-context").CcmTaskSessionBindingV1;
    task: any;
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
export declare function purgeTaskRecoveryUserSessions(task: any): any[];
