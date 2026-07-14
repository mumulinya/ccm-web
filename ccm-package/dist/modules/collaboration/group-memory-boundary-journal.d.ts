export declare const GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION = 1;
export declare const GROUP_MEMORY_RESUME_PROJECTION_VERSION = 1;
export declare function getGroupMemoryBoundaryJournalFile(groupId: string, sessionId: string, options?: any): string;
export declare function getGroupMemoryResumeProofFile(groupId: string, sessionId: string, options?: any): string;
export declare function readGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    sessionId: string;
    file: string;
    missing: boolean;
    valid: boolean;
    status: string;
    commitCount: number;
    lineCount: number;
    invalidRows: any[];
    latestCommit: any;
};
export declare function calculateGroupMemorySummaryChecksum(memory: any): string;
export declare function commitGroupMemoryCompactBoundary(input: any): {
    committed: boolean;
    reason: string;
    commit: any;
    journal: {
        schema: string;
        version: number;
        groupId: string;
        sessionId: string;
        file: string;
        missing: boolean;
        valid: boolean;
        status: string;
        commitCount: number;
        lineCount: number;
        invalidRows: any[];
        latestCommit: any;
    };
} | {
    committed: boolean;
    commit: any;
    journal: {
        schema: string;
        version: number;
        groupId: string;
        sessionId: string;
        file: string;
        missing: boolean;
        valid: boolean;
        status: string;
        commitCount: number;
        lineCount: number;
        invalidRows: any[];
        latestCommit: any;
    };
    reason?: undefined;
} | {
    committed: boolean;
    reason: string;
    groupId: string;
    sessionId: string;
};
export declare function buildGroupMemoryResumeProjection(input: any): any;
export declare function recordGroupMemoryResumeProjectionProof(projection: any, options?: any): any;
export declare function readGroupMemoryResumeProjectionProofs(groupId: string, sessionId: string, options?: any): {
    schema: string;
    groupId: string;
    sessionId: string;
    file: string;
    valid: boolean;
    proofCount: number;
    invalidRows: any[];
    latestProof: any;
    recentProofs: any[];
};
export declare function quarantineInvalidGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options?: any): {
    rotated: boolean;
    reason: string;
    file: string;
    target?: undefined;
} | {
    rotated: boolean;
    reason: string;
    file: string;
    target: string;
};
export declare function retireGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options?: any): {
    rotated: boolean;
    reason: string;
    file: string;
    target?: undefined;
} | {
    rotated: boolean;
    reason: string;
    file: string;
    target: string;
};
export declare function inspectGroupMemoryResumeProjection(input: any): any;
export declare function deleteGroupMemoryBoundaryArtifacts(groupId: string, sessionId: string, options?: any): {
    schema: string;
    groupId: string;
    sessionId: string;
    deletedFiles: number;
    files: string[];
    deletedAt: string;
};
