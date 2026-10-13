export { GLOBAL_SOURCE_TOOLS, isGlobalSourceTool, globalSourceToolSchema, globalSourceModelPayload, globalSourcePersistence } from './global-source-model-content';
export declare function sourceAccessPrincipal(run: any, current?: any): any;
export declare function bindGlobalSourceIdentity(run: any, principal?: any, sourceMessageId?: string): void;
export declare function effectiveSourcePrincipal(principal: any): any;
export declare function assertGlobalSourceProjectAccess(principal: any, project: string): void;
export declare function assertGlobalSourceToolRequest(name: string, args: any, run: any, current?: any): void;
export declare function authorizedProjectSourceOperation(project: string, operation: string, args: any, principal: any, signal?: AbortSignal): Promise<any>;
export declare function directSourceSummary(run: any, toolName: string, args: any, result: any): {
    accessId: string;
    mode: string;
    status: string;
    runId: any;
    sourceMessageId: any;
    toolCallId: string;
    projectIds: any[];
    evidenceRefs: any;
    missingEvidenceSummaries: string[];
    availableActions: string[];
    revision: number;
    durationMs: any;
    contentStored: boolean;
};
export declare function executeGlobalSourceTool(name: string, args: any, run: any, principal?: any, signal?: AbortSignal): Promise<any>;
/** Rehydrate after restart and recheck authorization/version before every model call. */
export declare function hydrateGlobalSourceObservations(run: any): Promise<void>;
export declare function hydrateGlobalSourceMessages(messages: any[], run: any): Promise<any>;
