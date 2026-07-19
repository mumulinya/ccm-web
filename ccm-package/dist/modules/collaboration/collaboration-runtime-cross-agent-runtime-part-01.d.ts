import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function processCrossAgents(groupId: string, group: any, sourceProject: string, output: string, atMentions: any[], configs: any[], ctx: CollabCtx, streamRes?: any, depth?: number, seenMentions?: Set<string>, executionOrder?: string, planMessageId?: string, taskId?: string): Promise<string[]>;
export declare function resumeAgentQaFromStoredContinuation(qa: any, group: any, ctx: CollabCtx, streamRes?: any): Promise<{
    resumed: boolean;
    reason: string;
    runtimeToolDispatchGate?: undefined;
    item?: undefined;
    output?: undefined;
    session?: undefined;
} | {
    resumed: boolean;
    reason: string;
    runtimeToolDispatchGate: import("../../tools/runtime-tool-sync-part-01").RuntimeToolDispatchGate;
    item?: undefined;
    output?: undefined;
    session?: undefined;
} | {
    resumed: boolean;
    item: any;
    output: string;
    session: any;
    reason?: undefined;
    runtimeToolDispatchGate?: undefined;
}>;
export declare function retryAgentQaItem(id: string, ctx: CollabCtx, streamRes?: any): Promise<{
    success: boolean;
    error: string;
    item?: undefined;
    wakeup?: undefined;
} | {
    success: boolean;
    item: any;
    wakeup: {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate?: undefined;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate: import("../../tools/runtime-tool-sync-part-01").RuntimeToolDispatchGate;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        item: any;
        output: string;
        session: any;
        reason?: undefined;
        runtimeToolDispatchGate?: undefined;
    };
    error?: undefined;
}>;
export declare function handleAgentQaRequests(input: {
    groupId: string;
    group: any;
    sourceProject: string;
    sourceOutput: string;
    originalPrompt: string;
    sourceWorkDir: string;
    sourceAgentType: string;
    allowedTools: any;
    mcpConfigPath?: string;
    runtimeToolSnapshot?: any;
    configs: any[];
    ctx: CollabCtx;
    streamRes?: any;
    taskId?: string;
    sourceTaskAgentSessionId?: string;
    sourceNativeSessionId?: string;
    qaDepth?: number;
}): Promise<{
    outputs: string[];
    resumedOutput: string;
}>;
export declare function evaluateCoordinationImplementationReceipt(receipt: any, request: any): {
    status: string;
    accepted: boolean;
    score: number;
    evidence: string[];
    files_changed: string[];
    verification: string[];
    gaps: string[];
    reason: string;
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function evaluateCoordinationTaskEvidence(task: any, request: any, receipt: any, execution: any): {
    status: string;
    accepted: boolean;
    score: number;
    gaps: string[];
    workspace_files: any;
    evidence: string[];
    reason: string;
    files_changed: string[];
    verification: string[];
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function getCoordinationRequestForTask(task: any): import("./group-coordination-store").GroupCoordinationRequestRecord;
export declare function getCoordinationQaForRequest(requestId: string): any;
export declare function coordinationAuditHas(request: any, type: string): any;
