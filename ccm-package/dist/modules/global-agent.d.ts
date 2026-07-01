import { type CollabCtx } from "./collaboration";
export declare function runGlobalAgentIntentSelfTest(): {
    passed: boolean;
    results: ({
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount: number;
        authorized: boolean;
    } | {
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        authorized: boolean;
        expectedTargetCount?: undefined;
    } | {
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount?: undefined;
        authorized?: undefined;
    })[];
    actionBlockHidden: boolean;
    keywordFallbackCannotWrite: boolean;
    visibleReply: string;
};
export declare function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number): Promise<{
    total: number;
    resumed: number;
    results: any[];
}>;
export declare function startGlobalMissionSupervisionForServer(ctx: CollabCtx): {
    started: boolean;
    active: boolean;
    resumed?: undefined;
} | {
    started: boolean;
    active: boolean;
    resumed: number;
};
export declare function bootstrapGlobalAgentMemoryForServer(): {
    total: any;
    migrated: number;
    results: any[];
};
export declare function stopGlobalMissionSupervisionForServer(): void;
export declare function handleGlobalAgentApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
