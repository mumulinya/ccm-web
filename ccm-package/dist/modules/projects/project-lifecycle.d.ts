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
    session_count: number;
    total_bytes: number;
    fingerprint: string;
    retained: string[];
    success: boolean;
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
