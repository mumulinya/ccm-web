export declare function getCleanupSummary(): {
    success: boolean;
    updated_at: string;
    cards: {
        id: string;
        title: string;
        count: any;
        detail: string;
    }[];
    details: {
        tasks: {
            total: number;
            archived: number;
            failed: number;
            done: number;
        };
        cron: {
            total: number;
            archived: number;
            disabled: number;
        };
        project_runs: {
            total: number;
            archived: number;
            failed: number;
        };
        group_messages: {
            id: any;
            name: any;
            messages: number;
        }[];
        project_sessions: {
            files: number;
            bytes: number;
        };
        execution_artifacts: {
            executions: {
                files: number;
                bytes: number;
            };
            checkpoints: {
                files: number;
                bytes: number;
            };
            outputs: {
                files: number;
                bytes: number;
            };
        };
    };
    rows: {
        tasks: {
            id: any;
            title: any;
            status: any;
            project: any;
            updated_at: any;
            archived: boolean;
        }[];
        cron: {
            id: any;
            title: any;
            status: string;
            target: any;
            schedule: any;
            updated_at: any;
            archived: boolean;
        }[];
        project_runs: {
            id: any;
            title: any;
            status: any;
            project: any;
            trace_id: any;
            native_session_id: any;
            updated_at: any;
            archived: boolean;
        }[];
        project_sessions: any[];
        group_messages: {
            id: any;
            title: any;
            messages: any;
            status: string;
        }[];
        global_sessions: any;
        execution_artifacts: {
            id: string;
            title: string;
            files: number;
            bytes: number;
        }[];
    };
    actions: {
        id: string;
        label: string;
        risk: string;
        target_count: number;
    }[];
};
export declare function previewCleanupAction(action: string): {
    success: boolean;
    error: string;
    action?: undefined;
    preview?: undefined;
} | {
    success: boolean;
    action: {
        id: string;
        label: string;
        risk: string;
        target_count: number;
    };
    preview: {
        will_affect: number;
        risk: string;
        irreversible: boolean;
        note: string;
    };
    error?: undefined;
};
export declare function runCleanupAction(action: string): {
    success: boolean;
    action: string;
    archived: number;
    purged?: undefined;
    cleanup?: undefined;
    timestamp?: undefined;
    error?: undefined;
} | {
    success: boolean;
    action: string;
    purged: number;
    cleanup: {
        sessions: number;
        executions: number;
        checkpoints: number;
        outputs: number;
    };
    archived?: undefined;
    timestamp?: undefined;
    error?: undefined;
} | {
    success: boolean;
    action: string;
    purged: number;
    timestamp: string;
    archived?: undefined;
    cleanup?: undefined;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    action?: undefined;
    archived?: undefined;
    purged?: undefined;
    cleanup?: undefined;
    timestamp?: undefined;
};
