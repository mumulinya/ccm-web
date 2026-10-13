import type { InternalMcpTaskContext, InternalMcpToolDefinition } from "./internal-mcp-runtime";
export declare const dispatchScopeTools: InternalMcpToolDefinition[];
export declare function callBoundDispatchScopeDecision(context: InternalMcpTaskContext, name: string, args: any): Promise<any>;
export declare function requestBoundDispatchScope(context: InternalMcpTaskContext, args: any): Promise<{
    status: string;
    reason: string;
    requestId: any;
    requestedPaths?: undefined;
    contractRevision?: undefined;
    runId?: undefined;
} | {
    status: string;
    requestId: any;
    requestedPaths: any;
    contractRevision: any;
    runId: string;
    reason?: undefined;
} | {
    status: string;
    requestId: any;
    reason?: undefined;
    requestedPaths?: undefined;
    contractRevision?: undefined;
    runId?: undefined;
}>;
export declare function assertBoundDispatchControl(context: InternalMcpTaskContext): void;
