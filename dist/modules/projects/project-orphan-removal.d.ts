export declare function inspectOrphanProjectRemoval(name: string): {
    project: string;
    directory: {
        status: "project_missing";
        work_dir_configured: boolean;
    } | {
        status: "unconfigured";
        work_dir_configured: boolean;
    } | {
        status: "available";
        work_dir_configured: boolean;
    } | {
        status: "missing";
        work_dir_configured: boolean;
    } | {
        status: "unavailable";
        work_dir_configured: boolean;
    };
    eligible: boolean;
    reasons: string[];
    groups: {
        id: string;
        name: string;
    }[];
    coordinator_groups: {
        id: string;
        name: string;
    }[];
    active_task_count: number;
    active_run_count: number;
};
export declare function previewActiveOrphanProjectRemoval(name: string): {
    affected_groups: {
        id: string;
        name: string;
    }[];
    success: boolean;
    project: string;
    mode: "archived" | "orphan";
    items: {
        label: string;
        exists: boolean;
        bytes: number;
        modified_at: string;
        kind: string;
    }[];
    affected_group_ids: string[];
    session_count: number;
    total_bytes: number;
    retained: string[];
    preview_token: string;
    expires_at: string;
};
export declare function commitActiveOrphanProjectRemoval(name: string, previewToken: string): {
    affected_groups: {
        id: string;
        name: string;
    }[];
    warnings: string[];
    success: boolean;
    removed: boolean;
    project: string;
    audit_id: string;
    detached_group_ids: string[];
    retained: string[];
    message: string;
};
