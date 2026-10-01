export declare const TYPED_MEMORY_DISPATCH_WAL_DIR: string;
export declare function getTypedMemoryDispatchWalFile(groupId: string, groupSessionId: string, ticketId: string): string;
export declare function getTypedMemoryDispatchWalScopeDir(groupId: string, groupSessionId: string): string;
export declare function readTypedMemoryDispatchWal(file: string): any;
export declare function createTypedMemoryDispatchWal(input?: any): {
    required: boolean;
    created: boolean;
    reason: string;
    idempotent?: undefined;
    record?: undefined;
} | {
    required: boolean;
    created: boolean;
    idempotent: boolean;
    record: any;
    reason?: undefined;
} | {
    required: boolean;
    created: boolean;
    record: any;
    reason?: undefined;
    idempotent?: undefined;
};
export declare function transitionTypedMemoryDispatchWal(recordOrFile: any, nextState: string, evidence?: any): any;
export declare function listTypedMemoryDispatchWal(): any[];
export declare function pruneTypedMemoryDispatchWal(options?: any): {
    deleted_count: number;
    deleted: string[];
};
export declare function verifyTypedMemoryDispatchWal(record: any): {
    valid: boolean;
    issues: string[];
};
