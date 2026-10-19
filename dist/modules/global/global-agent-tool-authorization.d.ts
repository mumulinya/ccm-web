import { type ToolScope } from "../../tools/tool-manager";
export declare function loadGlobalAgentToolAuthorization(): {
    tools: {
        mcp: any[];
        skill: any[];
    };
    schema: "ccm-global-agent-tool-authorization-v1";
    updated_at: string;
    updated_by: string;
};
export declare function getGlobalAgentToolAuthorizationPayload(): any;
export declare function saveGlobalAgentToolAuthorization(input?: any): Promise<any>;
export declare function resolveGlobalAgentExecutionSkills(input?: {
    message?: string;
    source?: string;
    workflowDecision?: any;
}): string[];
export declare function resolveGlobalAgentExecutionSkillsFromRun(run: any): string[];
export declare function buildGlobalAgentToolRuntimeContext(auditContext?: ToolScope["auditContext"], loadedToolNames?: string[], options?: {
    executionSkills?: string[];
}): {
    schema: string;
    tools: any;
    tool_audit: any;
    authorization_readiness: any;
    connection_preflight: any;
    catalog: {
        tools: any[];
        skills: any[];
    };
    counts: {
        mcp: number;
        skill: number;
    };
    configured_counts: {
        mcp: any;
        skill: any;
    };
    checksum: string;
    scope: ToolScope;
    capability_token: string;
    loaded_tool_names: string[];
    loaded_tools: any[];
    discoverable_tools: any[];
    deferred_tool_names: string[];
    scope_identity: import("../../system/main-agent-post-compact-continuity").MainAgentContinuityIdentityV1;
    restored_skill_attachments: any[];
    post_compact_restore_receipt: import("../../system/main-agent-post-compact-continuity").PostCompactToolRestoreReceiptV2;
    context_policy: {
        override: Partial<import("../../tools/main-agent-context-policy").MainAgentContextPolicy>;
        effective: {
            mcpToolLoadingMode: import("../../tools/main-agent-context-policy").McpToolLoadingMode;
            mcpToolAutoThresholdPercent: number;
            skillCatalogBudgetPercent: number;
            postCompactSkillPerItemMaxTokens: number;
            postCompactSkillTotalMaxTokens: number;
            contextSourceCatalogBudgetPercent: number;
            contextSourceHydrationBudgetPercent: number;
            postCompactSourcePerItemMaxTokens: number;
            postCompactSourceTotalMaxTokens: number;
            agentMaxParallelPerProject: number;
            agentMaxParallelGlobal: number;
        };
        source: string;
    };
    context_budget: any;
    policy_prompt: string;
    toolPromptLayout: import("../../tools/main-agent-tool-prompt").ToolPromptLayout;
    mcp_prompt: string;
    execution_skills: string[];
    updated_at: any;
    updated_by: any;
};
export declare function executeGlobalAgentAuthorizedTool(kind: "mcp" | "skill", input: any, auditContext?: ToolScope["auditContext"], loadedToolNames?: string[], options?: {
    executionSkills?: string[];
}): Promise<{
    success: boolean;
    kind: "skill";
    name: string;
    result: any;
    authorization_checksum: string;
} | {
    success: boolean;
    kind: "mcp";
    name: any;
    result: any;
    authorization_checksum: string;
}>;
export declare function runGlobalAgentToolAuthorizationSelfTest(): {
    pass: boolean;
    normalized: Required<Pick<ToolScope, "mcp" | "skill">>;
    idleSkills: string[];
    workSkills: string[];
    storage_file: string;
};
