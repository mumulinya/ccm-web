export declare function getGroupMemoryFile(groupId: string): string;
export declare function createEmptyGroupMemory(groupId: string): {
    groupId: string;
    goal: string;
    summary: string;
    currentPhase: string;
    decisions: any[];
    completed: any[];
    blocked: any[];
    workerLedger: any[];
    agentMemories: {};
    messageDigest: string;
    messageCompression: {
        enabled: boolean;
        recentLimit: number;
        olderLimit: number;
        totalMessages: number;
        compressedMessages: number;
        lastCompressedAt: string;
    };
    openQuestions: any[];
    nextActions: any[];
    updated_at: string;
};
export declare function loadGroupMemory(groupId: string): any;
export declare function saveGroupMemory(groupId: string, memory: any): any;
export declare function runGroupMemoryStorageRecoverySelfTest(): {
    pass: boolean;
    checks: {
        atomicFileIsValidJson: boolean;
        backupRecoveryWorks: boolean;
        backupExists: boolean;
    };
};
export declare function uniqueByKey(items: any[], keyFn: (item: any) => string, limit?: number): any[];
export declare function compactMemoryText(value: any, max?: number): string;
export declare function compactPreserveLines(value: any, max?: number): string;
export declare function buildGroupMemoryContext(memory: any): string;
export declare function buildAgentMemoryPacket(groupId: string, targetProject: string, task?: string): string;
export declare function buildGroupContextPacket(groupId: string, options?: any): string;
export declare function findLatestWorkerLedger(memory: any, project: string): any;
export declare function appendWorkerLedger(memory: any, item: any): any;
export declare function updateGroupMemory(groupId: string, patch?: any): any;
