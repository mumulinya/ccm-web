export declare function applyProtocolBlockCacheControl(bodyInput: any, strategy: any): {
    body: any;
    applied: boolean;
    breakpointCount: number;
    reason: string;
};
export declare function runProviderCacheBreakpointEncodingSelfTest(): {
    pass: boolean;
    checks: {
        staticAndRollingApplied: boolean;
        systemBoundaryHasOneHourTtl: boolean;
        completedAssistantGetsRollingBoundary: boolean;
        completedToolResultGetsRollingBoundary: boolean;
        unfinishedToolBatchDoesNotGetRollingBoundary: boolean;
    };
};
