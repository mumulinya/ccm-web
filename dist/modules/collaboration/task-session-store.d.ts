export type TaskSessionMessage = {
    message_id: string;
    task_id: string;
    role: "user" | "assistant" | "system_context";
    content: string;
    run_id?: string;
    source_ref?: any;
    attachments?: Array<{
        name?: string;
        filename?: string;
        size?: number;
        content_type?: string;
        stored?: boolean;
    }>;
    created_at: string;
};
export type TaskSessionRecord = {
    schema: "ccm-task-session-v1";
    task_id: string;
    session_id: string;
    title: string;
    origin: string;
    status: "available";
    lifecycle: "planning" | "awaiting_confirmation" | "running" | "available";
    creation_policy: "on_create" | "on_terminal";
    archive_policy: "user_confirm" | "auto_terminal";
    plan_revision: number;
    task_spec_revision: number;
    created_at: string;
    updated_at: string;
    materialized_at: string;
    revision: number;
    active_run_id: string;
    run_ids: string[];
    dossier: any;
    messages: TaskSessionMessage[];
    pending_follow_up?: {
        message_id: string;
        content: string;
        requested_at: string;
        status: "awaiting_confirmation" | "accepted" | "rejected";
        mode?: "queue" | "steer";
        active_run_id?: string;
        attempt_id?: string;
    } | null;
};
export declare function taskSessionArchiveState(task: any): {
    eligible: boolean;
    policy: any;
    reason: string;
};
export declare function taskSessionCreationState(task: any): {
    eligible: boolean;
    policy: any;
    reason: string;
    archive_policy?: undefined;
} | {
    eligible: boolean;
    policy: any;
    reason: string;
    archive_policy: any;
};
export declare function taskSessionArchiveActions(task: any): string[];
export declare function taskSessionOutputRevision(task: any): string;
export declare function taskSessionStorePath(): string;
export declare function getTaskSession(taskId: string): TaskSessionRecord;
export declare function listTaskSessions(): TaskSessionRecord[];
export declare function isTaskSessionAvailable(task: any): boolean;
export declare function reconcileTaskSessions(): {
    checked: number;
    created: number;
    available: number;
    failed: number;
};
export declare function materializeTaskSession(taskInput: any): {
    available: boolean;
    created: boolean;
    session: TaskSessionRecord;
} | {
    available: boolean;
    created: boolean;
    reason: string;
    task_id?: undefined;
} | {
    available: boolean;
    created: boolean;
    reason: string;
    task_id: string;
};
export declare function appendTaskSessionMessage(taskId: string, input: any): TaskSessionMessage;
export declare function setTaskSessionPendingFollowUp(taskId: string, pending: TaskSessionRecord["pending_follow_up"]): {
    pending_follow_up: {
        message_id: string;
        content: string;
        requested_at: string;
        status: "awaiting_confirmation" | "accepted" | "rejected";
        mode?: "queue" | "steer";
        active_run_id?: string;
        attempt_id?: string;
    };
    revision: number;
    updated_at: string;
    schema: "ccm-task-session-v1";
    task_id: string;
    session_id: string;
    title: string;
    origin: string;
    status: "available";
    lifecycle: "planning" | "awaiting_confirmation" | "running" | "available";
    creation_policy: "on_create" | "on_terminal";
    archive_policy: "user_confirm" | "auto_terminal";
    plan_revision: number;
    task_spec_revision: number;
    created_at: string;
    materialized_at: string;
    active_run_id: string;
    run_ids: string[];
    dossier: any;
    messages: TaskSessionMessage[];
};
export declare function buildTaskSessionDiscussionReply(taskId: string, question?: string): string;
export declare function taskSessionEvents(taskId: string, after?: number): any[];
