export type TaskOrigin = "conversation" | "dispatch" | "workbench" | "automation" | "global_agent";
export type TaskSessionArchivePolicy = "user_confirm" | "auto_terminal";
export type TaskSessionCreationPolicy = "on_create" | "on_terminal";
export type DispatchMode = "direct_worker" | "planned_worker" | "orchestrated";
export type VerificationMode = "quick_check" | "main_agent_self" | "test_agent";
export type WorkspaceMode = "shared_serial" | "isolated_worktree";
export type ApprovalMode = "preapproved" | "confirm_before_write" | "confirm_before_delivery";
export type TaskRunTrigger = "user" | "automation" | "retry" | "resume";
export type TaskRunStatus = "queued" | "running" | "verifying" | "waiting_user" | "blocked" | "completed" | "failed" | "cancelled" | "recovery_required";
export interface TaskExecutionPolicy {
    dispatch: DispatchMode;
    verification: VerificationMode;
    workspace: WorkspaceMode;
    approval: ApprovalMode;
    reasons: string[];
    checksum: string;
}
export interface TaskSpecV1 {
    schema: "ccm-task-spec-v1";
    task_id: string;
    origin: TaskOrigin;
    task_session_creation_policy: TaskSessionCreationPolicy;
    task_session_archive_policy: TaskSessionArchivePolicy;
    target: {
        type: "project" | "group";
        id: string;
        exact_session_id: string;
    };
    goal: string;
    scope: string;
    attachments: any[];
    acceptance: string[];
    acceptance_policy: {
        criteria: string[];
        verification: VerificationMode;
    };
    approval_policy: ApprovalMode;
    delivery_policy: {
        require_confirmation: boolean;
        channels: string[];
    };
    execution_policy: TaskExecutionPolicy;
    source_snapshot: {
        content_checksum: string;
        source_channel: string;
        client_message_id: string;
    };
    revision: number;
    spec_revision: number;
    checksum: string;
    plan_revision: number;
    plan_checksum: string;
    created_at: string;
}
export interface TaskRunV1 {
    schema: "ccm-task-run-v1";
    run_id: string;
    task_id: string;
    trace_id: string;
    spec_revision: number;
    trigger: TaskRunTrigger;
    status: TaskRunStatus;
    attempt: number;
    created_at: string;
    updated_at: string;
    automation_definition_id?: string;
    automation_definition_revision?: number;
    queue_lane?: string;
    parent_run_id?: string;
    lease?: any | null;
    execution_evidence?: any[];
    verification_result?: any;
    delivery_result?: any;
}
export interface AutomationDefinitionV1 {
    schema: "ccm-automation-definition-v1";
    definition_id: string;
    revision: number;
    name: string;
    target: {
        type: "project" | "group";
        id: string;
        exact_session_id: string;
    };
    goal: string;
    scope: string;
    prompt: string;
    attachments: any[];
    schedule: string;
    timezone: string;
    execution_policy: TaskExecutionPolicy;
    notification_policy: any;
    metadata?: any;
    source_snapshot: {
        checksum: string;
        captured_at: string;
    };
    frozen_at: string;
    checksum: string;
}
export declare function normalizeTaskOrigin(task: any): TaskOrigin;
export declare function resolveTaskSessionArchivePolicy(task: any): TaskSessionArchivePolicy;
export declare function resolveTaskSessionCreationPolicy(task: any): TaskSessionCreationPolicy;
/**
 * Resolve the default only while creating a brand-new task. Callers may pass
 * an explicit policy when an entrypoint has a special lifecycle contract.
 */
export declare function defaultTaskSessionCreationPolicy(task: any): TaskSessionCreationPolicy;
export declare function resolveTaskExecutionPolicy(task: any): TaskExecutionPolicy;
export declare function buildTaskSpecV1(task: any, policy?: TaskExecutionPolicy): TaskSpecV1;
export declare function buildTaskRunV1(task: any, spec: TaskSpecV1, trigger?: TaskRunTrigger): TaskRunV1;
export declare function buildAutomationDefinitionV1(job: any, policy?: TaskExecutionPolicy): AutomationDefinitionV1;
export declare function validateTaskWorkflowModel(task: any): {
    valid: boolean;
    spec: any;
    run: any;
    reason: string;
};
