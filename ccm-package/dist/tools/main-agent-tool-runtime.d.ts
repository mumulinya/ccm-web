import { type ToolGrantSet } from "./tool-authorization";
import { type ToolScope } from "./tool-manager";
import type { LoadedContextItemsV1 } from "../system/session-compaction-core";
import { type MainAgentScopeKind } from "./workspace-readonly-tools";
import { type MainAgentContinuityIdentityV1, type PostCompactToolRestoreReceiptV1 } from "../system/main-agent-post-compact-continuity";
export type MainAgentToolRequest = {
    name: string;
    arguments: any;
    reason: string;
};
export type MainAgentToolRuntimeContext = {
    schema: "ccm-main-agent-tool-runtime-context-v2";
    scope: ToolScope;
    configured: ToolGrantSet;
    executionSkills: string[];
    effective: ToolGrantSet;
    catalog: {
        mcp: any[];
        skills: any[];
        rejectedMcp: any[];
        discoverableMcp?: any[];
        native?: any[];
    };
    toolAudit: any;
    mcpPrompt: string;
    skillPrompt: string;
    policyPrompt: string;
    checksum: string;
    version?: 2;
    capabilityToken?: string;
    loadedToolNames?: string[];
    deferredToolNames?: string[];
    scopeIdentity?: MainAgentContinuityIdentityV1;
    restoredSkillAttachments?: any[];
    postCompactRestoreReceipt?: PostCompactToolRestoreReceiptV1;
};
export type MainAgentNativeToolV2 = {
    name: string;
    description: string;
    loadPolicy: "base" | "conditional";
    sideEffect: "none" | "orchestrator_control";
};
export declare const MAIN_AGENT_NATIVE_TOOLS_V2: MainAgentNativeToolV2[];
export declare function isMainAgentReadOnlyMcpTool(tool: any): boolean;
export declare function buildMainAgentToolRuntimeContext(input: {
    configuredTools?: any;
    executionSkills?: string[];
    auditContext?: ToolScope["auditContext"];
    mcpPolicy?: "read_only" | "all";
    label?: string;
    scopeIdentity?: {
        scope: MainAgentScopeKind;
        scopeId: string;
        exactSessionId: string;
        allowedProjects?: string[];
        generation?: number;
    };
    loadedToolNames?: string[];
}): MainAgentToolRuntimeContext;
export declare function normalizeMainAgentToolRequests(value: any, limit?: number): MainAgentToolRequest[];
export declare function mainAgentToolRequestFingerprint(request: MainAgentToolRequest): string;
export declare function buildMainAgentLoadedContextItems(toolContext: MainAgentToolRuntimeContext, results?: any[], additionalSkills?: Array<{
    name: string;
    contentHash?: string;
    checksum?: string;
    loadLevel?: "catalog" | "body";
}>): LoadedContextItemsV1;
export declare function executeMainAgentToolRequests(input: {
    requests: MainAgentToolRequest[];
    toolContext: MainAgentToolRuntimeContext;
    executeToolCall?: (name: string, args: any, scope?: ToolScope) => Promise<any>;
    onUse?: (request: MainAgentToolRequest) => string | void;
    onResult?: (request: MainAgentToolRequest, callId: string, output: any, error?: string) => void;
    resultTokenLimit?: number;
}): Promise<any[]>;
