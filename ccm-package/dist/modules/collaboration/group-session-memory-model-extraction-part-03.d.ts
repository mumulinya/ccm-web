export declare function runGroupSessionMemoryModelExtractionNow(groupId: string, options?: any): Promise<any>;
export declare function scheduleGroupSessionMemoryModelExtraction(groupId: string, options?: any): {
    scheduled: boolean;
    reason: string;
    groupId?: undefined;
    groupSessionId?: undefined;
    delayMs?: undefined;
} | {
    scheduled: boolean;
    groupId: string;
    groupSessionId: string;
    delayMs: number;
    reason?: undefined;
};
export declare function ensureGroupSessionMemoryModelExtractionHook(): {
    registered: boolean;
    already: boolean;
};
