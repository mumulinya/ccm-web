import { type CollabCtx } from "./collaboration";
export declare function runGlobalAgentIntentSelfTest(): {
    passed: boolean;
    results: ({
        actual: any;
        targetCount: any;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount: number;
    } | {
        actual: any;
        targetCount: any;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount?: undefined;
    })[];
    actionBlockHidden: boolean;
    visibleReply: string;
};
export declare function handleGlobalAgentApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
