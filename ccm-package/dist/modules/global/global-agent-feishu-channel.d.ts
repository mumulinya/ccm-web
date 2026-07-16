import type { CollabCtx } from "../collaboration/collaboration";
export declare function createGlobalAgentFeishuChannel(deps: any): {
    normalizeFeishuEventPayload: (payload: any, config: any) => any;
    verifyFeishuEventToken: (payload: any, config: any) => void;
    extractFeishuMessageText: (payload: any) => string;
    extractCcConnectHookText: (payload: any) => string;
    processFeishuGlobalAgentMessage: (baseUrl: string, ctx: CollabCtx, text: string, payload: any, options?: {
        sendReport?: boolean;
        traceId?: string;
    }) => Promise<string>;
    parseFeishuConversationTurnCommand: (value: any) => {
        kind: "normal" | "steer" | "queue" | "stop";
        message: string;
    };
    startFeishuConversationTurnRecoveryForServer: (baseUrl: string, ctx: CollabCtx) => {
        started: boolean;
    };
    stopFeishuConversationTurnRecoveryForServer: () => void;
    processFeishuControlledMessage: (baseUrl: string, ctx: CollabCtx, text: string, payload: any, options?: any) => Promise<{
        reply: string;
        stopped_run_id: any;
        turn?: undefined;
        run_id?: undefined;
        queued?: undefined;
        position?: undefined;
    } | {
        reply: string;
        turn: any;
        run_id: any;
        stopped_run_id?: undefined;
        queued?: undefined;
        position?: undefined;
    } | {
        reply: string;
        queued: boolean;
        position: any;
        turn: any;
        stopped_run_id?: undefined;
        run_id?: undefined;
    } | {
        reply: string;
        stopped_run_id?: undefined;
        turn?: undefined;
        run_id?: undefined;
        queued?: undefined;
        position?: undefined;
    }>;
    runFeishuConversationTurnCommandSelfTest: () => {
        pass: boolean;
        checks: {
            stop: boolean;
            steer: boolean;
            queue: boolean;
            ordinaryDefaultsToNormal: boolean;
        };
    };
};
