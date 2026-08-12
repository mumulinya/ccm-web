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
        onDelta?: (delta: string) => void;
        originReceipt?: any;
        principal?: any;
        turnId?: string;
        turn_id?: string;
    }) => Promise<any>;
    parseFeishuConversationTurnCommand: (value: any) => {
        kind: "normal" | "steer" | "queue" | "stop" | "aside";
        message: string;
    };
    drainFeishuConversationTurns: (baseUrl: string, ctx: CollabCtx, conversationId: string, payload: any) => Promise<void>;
    startFeishuConversationTurnRecoveryForServer: (baseUrl: string, ctx: CollabCtx) => {
        started: boolean;
    };
    stopFeishuConversationTurnRecoveryForServer: () => void;
    processFeishuControlledMessage: (baseUrl: string, ctx: CollabCtx, text: string, payload: any, options?: any) => Promise<{
        reply: string;
        denied: boolean;
        ephemeral: boolean;
        content_stored?: undefined;
        report_sent?: undefined;
        turn_id?: undefined;
    } | {
        reply: string;
        ephemeral: boolean;
        denied?: undefined;
        content_stored?: undefined;
        report_sent?: undefined;
        turn_id?: undefined;
    } | {
        reply: string;
        ephemeral: boolean;
        content_stored: boolean;
        denied?: undefined;
        report_sent?: undefined;
        turn_id?: undefined;
    } | {
        reply: string;
        denied: boolean;
        report_sent: boolean;
        ephemeral?: undefined;
        content_stored?: undefined;
        turn_id?: undefined;
    } | {
        report_sent: boolean;
        reply: string;
        stopped_run_id: any;
        denied?: undefined;
        ephemeral?: undefined;
        content_stored?: undefined;
        turn_id?: undefined;
    } | {
        report_sent: boolean;
        reply: string;
        turn: any;
        run_id: any;
        denied?: undefined;
        ephemeral?: undefined;
        content_stored?: undefined;
        turn_id?: undefined;
    } | {
        report_sent: boolean;
        origin_receipt: import("../collaboration/feishu-conversation-v2").FeishuOriginReceiptV2;
        reply: string;
        queued: boolean;
        position: any;
        turn: any;
        denied?: undefined;
        ephemeral?: undefined;
        content_stored?: undefined;
        turn_id?: undefined;
    } | {
        reply: any;
        turn_id: any;
        denied?: undefined;
        ephemeral?: undefined;
        content_stored?: undefined;
        report_sent?: undefined;
    }>;
    processFeishuCardAction: (baseUrl: string, payload: any, ctx?: CollabCtx) => Promise<{
        success: boolean;
        action: string;
        target: {
            scope: "group" | "project";
            scopeId: string;
            canonicalName: string;
            displayName: string;
        };
        run_id: any;
        status: any;
        message: string;
        decision?: undefined;
        request_id?: undefined;
    } | {
        success: boolean;
        decision: string;
        request_id: string;
        message: string;
        action?: undefined;
        target?: undefined;
        run_id?: undefined;
        status?: undefined;
    }>;
    runFeishuConversationTurnCommandSelfTest: () => {
        pass: boolean;
        checks: {
            stop: boolean;
            steer: boolean;
            queue: boolean;
            aside: boolean;
            ordinaryDefaultsToNormal: boolean;
        };
    };
};
