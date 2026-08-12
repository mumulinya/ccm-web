import { WorkspaceReadContextLedger } from "./workspace-read-context";
export type MainAgentScopeKind = "global" | "group" | "project";
export type ScopedToolCapabilityV1 = {
    schema: "ccm-scoped-tool-capability-v1";
    scope: MainAgentScopeKind;
    scopeId: string;
    exactSessionId: string;
    generation: number;
    allowedProjects: string[];
    issuedAt: string;
    expiresAt: string;
};
export type WorkspaceReadonlyToolDefinitionV2 = {
    name: string;
    canonicalName: string;
    server: "ccm__workspace_readonly";
    description: string;
    inputSchema: Record<string, any>;
    annotations: {
        readOnlyHint: true;
        destructiveHint: false;
        idempotentHint: true;
        ccmTrustedReadonly: true;
    };
    loadPolicy: "base" | "search";
    checksum: string;
};
export type WorkspaceReadonlyToolDefinitionV3 = WorkspaceReadonlyToolDefinitionV2 & {
    toolContractVersion: 3;
};
export type CcmWorkspaceToolEnvelopeV3 = {
    schema: "ccm-workspace-tool-envelope-v3";
    toolContractVersion: 3;
    modelPayload: unknown;
    safeReceipt: {
        kind: "text" | "image" | "pdf" | "notebook" | "glob" | "grep" | "unchanged";
        path?: string;
        checksum: string;
        itemCount?: number;
        lineCount?: number;
        pageCount?: number;
        truncated: boolean;
        contentStored: false;
    };
    contentStored: false;
};
export type WorkspaceReadonlyExecutionOptions = {
    signal?: AbortSignal;
    readContext?: WorkspaceReadContextLedger;
};
export declare function sealScopedToolCapability(input: Omit<ScopedToolCapabilityV1, "schema" | "issuedAt" | "expiresAt"> & Partial<Pick<ScopedToolCapabilityV1, "issuedAt" | "expiresAt">>): string;
export declare function openScopedToolCapability(token: string): ScopedToolCapabilityV1;
export declare const WORKSPACE_READONLY_TOOL_DEFINITIONS_V2: WorkspaceReadonlyToolDefinitionV2[];
export declare const WORKSPACE_READONLY_TOOL_DEFINITIONS_V3: WorkspaceReadonlyToolDefinitionV3[];
export declare function executeWorkspaceReadonlyTool(toolName: string, args: any, capabilityToken: string, contractVersion?: 2 | 3, options?: WorkspaceReadonlyExecutionOptions): Promise<any>;
export declare function executeWorkspaceReadonlyToolWithCapability(toolName: string, args: any, capability: ScopedToolCapabilityV1, contractVersion?: 2 | 3, options?: WorkspaceReadonlyExecutionOptions): Promise<any>;
export declare function runWorkspaceReadonlyToolsSelfTest(): {
    success: boolean;
    tools: {
        name: string;
        checksum: string;
        loadPolicy: "search" | "base";
        toolContractVersion: 3;
    }[];
};
