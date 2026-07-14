import { type ToolScope } from "./tool-manager";
export type ToolGrantSet = Required<Pick<ToolScope, "mcp" | "skill">>;
export declare function parseMcpGrant(value: string): {
    raw: string;
    server: string;
    tool: string;
};
export declare function buildToolAuthorizationInventory(input?: any): {
    schema: string;
    generatedAt: string;
    summary: any;
    scopes: any[];
};
export declare function buildAuthorizationReadiness(toolAudit: any, tools: ToolGrantSet): {
    schema: string;
    dispatchReady: boolean;
    status: string;
    requested: {
        mcp: number;
        skill: number;
    };
    available: {
        mcp: any;
        skill: any;
    };
    missing: {
        missing_mcp_servers: any;
        missing_mcp_tools: any;
        missing_skills: any;
    };
    invalid_mcp_grants: any;
    unavailable: {
        mcp: any;
        skill: any;
    };
};
export declare function buildToolConnectionPreflight(toolAudit: any, tools: ToolGrantSet): {
    schema: string;
    status: string;
    ready: boolean;
    checkedAt: string;
    summary: {
        configured: number;
        ready: number;
        needsAttention: number;
    };
    checks: any[];
};
export declare function normalizeToolAuthorization(input?: any): ToolGrantSet;
export declare function buildToolAuthorizationPayload(input?: any): {
    tools: ToolGrantSet;
    tool_audit: any;
    authorization_readiness: any;
    connection_preflight: any;
};
export declare function buildFreshToolAuthorizationPayload(input?: any): Promise<{
    tools: ToolGrantSet;
    tool_audit: any;
    authorization_readiness: any;
    connection_preflight: any;
}>;
export declare function buildToolAuthorizationChangeRecord(input: {
    scope: "project" | "group" | string;
    scopeId: string;
    previous?: any;
    next?: any;
    actor?: string;
    source?: string;
    toolAudit?: any;
    authorizationReadiness?: any;
}): {
    schema: string;
    scope: string;
    scopeId: string;
    actor: string;
    source: string;
    changed: boolean;
    before: Required<Pick<ToolScope, "mcp" | "skill">>;
    after: Required<Pick<ToolScope, "mcp" | "skill">>;
    diff: {
        mcp: {
            added: string[];
            removed: string[];
        };
        skill: {
            added: string[];
            removed: string[];
        };
    };
    audit: {
        missing_mcp_servers: any;
        missing_mcp_tools: any;
        missing_skills: any;
    };
    readiness: any;
};
export declare function recordToolAuthorizationChange(input: Parameters<typeof buildToolAuthorizationChangeRecord>[0]): {
    auditFile: string;
    schema: string;
    scope: string;
    scopeId: string;
    actor: string;
    source: string;
    changed: boolean;
    before: Required<Pick<ToolScope, "mcp" | "skill">>;
    after: Required<Pick<ToolScope, "mcp" | "skill">>;
    diff: {
        mcp: {
            added: string[];
            removed: string[];
        };
        skill: {
            added: string[];
            removed: string[];
        };
    };
    audit: {
        missing_mcp_servers: any;
        missing_mcp_tools: any;
        missing_skills: any;
    };
    readiness: any;
};
export declare function buildToolAuthorizationOptions(input?: any): {
    success: true;
    mcp: any[];
    skill: any[];
    summary: any;
};
export declare function runToolAuthorizationSelfTest(): {
    pass: boolean;
    checks: {
        deduplicatesMcpGrants: boolean;
        keepsStructuredSubtoolGrant: boolean;
        fullServerRemovesRedundantSubtool: boolean;
        nativeStyleFullServerRemovesRedundantSubtool: boolean;
        normalizesSkillObjects: boolean;
        preservesExplicitEmptyScope: boolean;
        stripsControlCharacters: boolean;
        buildsAuthorizationOptions: boolean;
        hidesRuntimeSecretsFromOptions: boolean;
        recordsAuthorizationDiff: boolean;
        summarizesAuditWithoutServerStatus: boolean;
        readinessMarksReadyAuthorization: boolean;
        readinessMarksMissingAuthorization: boolean;
        changeCarriesReadiness: boolean;
        buildsAuthorizationInventory: boolean;
        inventorySummarizesMissingScopes: boolean;
        inventoryHidesScopeSecrets: boolean;
        inventorySummarizesRuntimeCoverage: boolean;
        inventoryAttachesProjectRuntimeCoverage: boolean;
        inventoryUsesLatestSnapshotAfterRuntimeSwitch: boolean;
        inventoryAttachesGroupRuntimeCoverage: boolean;
        inventoryHidesRuntimePaths: boolean;
    };
    normalized: Required<Pick<ToolScope, "mcp" | "skill">>;
    empty: Required<Pick<ToolScope, "mcp" | "skill">>;
    options: {
        success: true;
        mcp: any[];
        skill: any[];
        summary: any;
    };
    change: {
        schema: string;
        scope: string;
        scopeId: string;
        actor: string;
        source: string;
        changed: boolean;
        before: Required<Pick<ToolScope, "mcp" | "skill">>;
        after: Required<Pick<ToolScope, "mcp" | "skill">>;
        diff: {
            mcp: {
                added: string[];
                removed: string[];
            };
            skill: {
                added: string[];
                removed: string[];
            };
        };
        audit: {
            missing_mcp_servers: any;
            missing_mcp_tools: any;
            missing_skills: any;
        };
        readiness: any;
    };
    inventory: {
        schema: string;
        generatedAt: string;
        summary: any;
        scopes: any[];
    };
};
