export declare const GROUP_COMPACT_HEAD_SCHEMA = "ccm-group-compact-head-v1";
export declare const GROUP_COMPACT_HEAD_DIR: string;
export declare function getGroupCompactHeadFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupCompactHead(head: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupCompactHead(groupId: string, groupSessionId: string): any;
export declare function commitGroupCompactHead(input?: any): {
    committed: boolean;
    idempotent: boolean;
    head: any;
    file: any;
};
export declare function validateGroupCompactHeadBinding(input?: any): {
    schema: string;
    valid: boolean;
    status: string;
    issues: string[];
    expected: {
        headId: any;
        generation: number;
        compactEpoch: string;
        boundaryId: string;
        compactTransactionReceiptChecksum: string;
        headChecksum: string;
    };
};
export declare function deleteGroupCompactHead(groupId: string, groupSessionId: string): {
    deleted: number;
    groupId: string;
    groupSessionId: string;
    file: string;
};
