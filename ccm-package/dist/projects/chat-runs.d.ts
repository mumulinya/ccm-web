export declare const PROJECT_CHAT_RUNS_FILE: string;
export declare const projectChatRuns: Map<string, any>;
export declare function saveProjectChatRuns(): void;
export declare function loadProjectChatRuns(): void;
export declare function createProjectChatRun(project: string, message: string, workDir: string, parentRunId?: string): any;
export declare function publicProjectChatRun(run: any): {
    id: any;
    trace_id: any;
    project: any;
    status: any;
    message_mode: any;
    workflow_decision: any;
    checkpoint_id: any;
    rollback_available: boolean;
    parent_run_id: any;
    task_session_scope_id: any;
    task_agent_session_id: any;
    native_session_id: any;
    resume_mode: any;
    archived: boolean;
    archived_at: any;
    deleted_at: any;
    deletion_reason: any;
    created_at: any;
    updated_at: any;
};
export declare function archiveProjectChatRun(id: string, reason?: string): any;
export declare function purgeProjectChatRun(id: string): {
    run: any;
    cleanup: {
        sessions: number;
        executions: number;
        checkpoints: number;
        outputs: number;
    };
};
