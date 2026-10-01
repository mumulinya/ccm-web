export declare function inspectProjectDirectoryState(name: string): {
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
export declare function listArchivedProjects(): {
    name: string;
    archived_at: string;
    config_file: string;
}[];
export declare function archiveProject(name: string): {
    success: boolean;
    archived: boolean;
    project: string;
    audit_id: string;
    message: string;
};
export declare function restoreProject(name: string): {
    success: boolean;
    restored: boolean;
    project: string;
    audit_id: string;
    message: string;
};
export declare function previewProjectPurge(name: string): {
    preview_token: string;
    expires_at: string;
    project: string;
    mode: "archived" | "orphan";
    items: ({
        label: string;
        path: string;
        exists: boolean;
        bytes: number;
        modified_at?: undefined;
        kind?: undefined;
    } | {
        label: string;
        path: string;
        exists: boolean;
        bytes: number;
        modified_at: string;
        kind: string;
    })[];
    affected_group_ids: string[];
    session_count: number;
    total_bytes: number;
    fingerprint: string;
    retained: string[];
    success: boolean;
};
export declare function previewOrphanProjectRemoval(name: string, affectedGroupIds?: string[]): {
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
export declare function removeOrphanProject(name: string, previewToken: string, affectedGroupIds?: string[]): {
    success: boolean;
    removed: boolean;
    project: string;
    audit_id: string;
    detached_group_ids: string[];
    retained: string[];
    message: string;
};
export declare function purgeArchivedProject(name: string, previewToken: string): {
    success: boolean;
    purged: boolean;
    project: string;
    audit_id: string;
    retained: string[];
    message: string;
};
export declare function getProjectLifecycleAudit(limit?: number): any[];
