import type { CollabCtx } from "../collaboration/collaboration";
export declare function createGlobalAgentFeishuChannel(deps: any): {
    normalizeFeishuEventPayload: (payload: any, config: any) => any;
    verifyFeishuEventToken: (payload: any, config: any) => void;
    extractFeishuMessageText: (payload: any) => string;
    extractCcConnectHookText: (payload: any) => string;
    processFeishuGlobalAgentMessage: (baseUrl: string, ctx: CollabCtx, text: string, payload: any, options?: {
        sendReport?: boolean;
        traceId?: string;
        inboundRecorded?: boolean;
        destination?: any;
        conversationId?: string;
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
        report_sent: boolean;
        reply: string;
        stopped_run_id: any;
    } | {
        report_sent: boolean;
        reply: string;
        turn: any;
        run_id: any;
    } | {
        report_sent: boolean;
        reply: string;
        queued: boolean;
        position: any;
        turn: any;
    } | {
        reply: string;
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
