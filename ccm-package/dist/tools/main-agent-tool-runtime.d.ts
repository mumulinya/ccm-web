import { type ToolGrantSet } from "./tool-authorization";
import { type ToolScope } from "./tool-manager";
import type { LoadedContextItemsV1 } from "../system/session-compaction-core";
export type MainAgentToolRequest = {
    name: string;
    arguments: any;
    reason: string;
};
export type MainAgentToolRuntimeContext = {
    schema: "ccm-main-agent-tool-runtime-context-v1";
    scope: ToolScope;
    configured: ToolGrantSet;
    executionSkills: string[];
    effective: ToolGrantSet;
    catalog: {
        mcp: any[];
        skills: any[];
        rejectedMcp: any[];
    };
    toolAudit: any;
    mcpPrompt: string;
    skillPrompt: string;
    policyPrompt: string;
    checksum: string;
};
export declare function isMainAgentReadOnlyMcpTool(tool: any): boolean;
export declare function buildMainAgentToolRuntimeContext(input: {
    configuredTools?: any;
    executionSkills?: string[];
    auditContext?: ToolScope["auditContext"];
    mcpPolicy?: "read_only" | "all";
    label?: string;
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
