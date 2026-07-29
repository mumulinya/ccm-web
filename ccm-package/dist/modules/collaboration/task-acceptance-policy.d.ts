export type TaskAcceptanceMode = "test_agent" | "main_agent_self_verification";
export type TaskAcceptancePolicySnapshotV1 = {
    schema: "ccm-task-acceptance-policy-snapshot-v1";
    version: 1;
    task_id: string;
    scope: "group" | "project";
    scope_id: string;
    exact_session_id: string;
    mode: TaskAcceptanceMode;
    test_agent_enabled: boolean;
    max_review_rounds: number;
    settings_revision: string;
    captured_at: string;
    checksum: string;
};
export declare function taskNeedsAcceptancePolicy(task: any): boolean;
export declare function buildTaskAcceptancePolicySnapshot(task: any, options?: {
    capturedAt?: string;
}): TaskAcceptancePolicySnapshotV1 | null;
export declare function validateTaskAcceptancePolicySnapshot(task: any, snapshot?: any): {
    valid: boolean;
    reason: string;
    snapshot: TaskAcceptancePolicySnapshotV1 | null;
};
export declare function resolveTaskAcceptancePolicy(task: any, options?: {
    allowLegacyCapture?: boolean;
}): {
    legacyCaptured: boolean;
    valid: boolean;
    reason: string;
    snapshot: TaskAcceptancePolicySnapshotV1 | null;
};
export declare function acceptanceModeForTask(task: any): TaskAcceptanceMode | null;
