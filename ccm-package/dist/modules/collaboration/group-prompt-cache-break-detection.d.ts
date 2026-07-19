export declare function getGroupPromptCacheBreakDetectionFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupPromptCacheStateSnapshot(snapshot: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function recordGroupPromptCacheState(input?: any): {
    recorded: boolean;
    reason: string;
    ledger: any;
    snapshot?: undefined;
    changes?: undefined;
    event?: undefined;
} | {
    recorded: boolean;
    snapshot: any;
    changes: any;
    event: any;
    ledger: any;
    reason?: undefined;
} | {
    recorded: boolean;
    reason: string;
};
export declare function readGroupPromptCacheBreakDetection(groupId: string, groupSessionId: string): any;
export declare function verifyGroupPromptCacheCompactionNotification(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function notifyGroupPromptCacheCompaction(input?: any): any;
export declare function verifyGroupPromptCacheDeletionNotification(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function notifyGroupPromptCacheDeletion(input?: any): any;
export declare function recordGroupPromptCacheUsage(input?: any): {
    recorded: boolean;
    reason: string;
    ledger: any;
    event?: undefined;
} | {
    recorded: boolean;
    event: any;
    ledger: any;
    reason?: undefined;
} | {
    recorded: boolean;
    reason: string;
};
export declare function readGroupMainContextUsageBaseline(groupId: string, groupSessionId: string, expected?: any): {
    valid: boolean;
    issues: string[];
    event: any;
    ledger: any;
};
export declare function deleteGroupPromptCacheBreakDetection(groupId: string, groupSessionId: string): {
    file: string;
    deleted: number;
};
