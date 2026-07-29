export declare function reconcileAttachmentReferences(tasks?: any[]): {
    schema: string;
    version: number;
    updated_at: string;
    items: {
        id: string;
        path_checksum: string;
        bytes: number;
        created_at: string;
        updated_at: string;
        reference_count: number;
        task_ids: string[];
    }[];
};
export declare function listOrphanAttachments(minAgeMs?: number): {
    id: string;
    path_checksum: string;
    bytes: number;
    created_at: string;
    updated_at: string;
    reference_count: number;
    task_ids: string[];
}[];
export declare function purgeOrphanAttachment(id: string, minAgeMs?: number): {
    id: string;
    bytes: number;
    removed: boolean;
};
export declare function cleanupStaleUploadStaging(minAgeMs?: number): {
    removed: number;
    bytes: number;
};
export declare function readAttachmentReferenceRegistry(): {
    schema: string;
    version: number;
    updated_at: string;
    items: any[];
};
