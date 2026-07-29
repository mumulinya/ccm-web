import { type ToolScope } from "../../tools/tool-manager";
import { type ToolGrantSet } from "../../tools/tool-authorization";
type GlobalAgentToolAuthorizationStore = {
    schema: "ccm-global-agent-tool-authorization-v1";
    tools: ToolGrantSet;
    updated_at: string;
    updated_by: string;
};
export declare function loadGlobalAgentToolAuthorization(): GlobalAgentToolAuthorizationStore;
export declare function getGlobalAgentToolAuthorizationPayload(): {
    tools: ToolGrantSet;
    tool_audit: any;
    authorization_readiness: any;
    connection_preflight: any;
    schema: "ccm-global-agent-tool-authorization-v1";
    updated_at: string;
    updated_by: string;
};
export declare function saveGlobalAgentToolAuthorization(input?: any): Promise<{
    authorization_change: {
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
    tools: ToolGrantSet;
    tool_audit: any;
    authorization_readiness: any;
    connection_preflight: any;
    schema: "ccm-global-agent-tool-authorization-v1";
    updated_at: string;
    updated_by: string;
}>;
export declare function buildGlobalAgentToolRuntimeContext(auditContext?: ToolScope["auditContext"]): {
    schema: string;
    tools: Required<Pick<ToolScope, "mcp" | "skill">>;
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
        mcp: number;
        skill: number;
    };
    checksum: string;
    scope: ToolScope;
    updated_at: string;
    updated_by: string;
};
export declare function executeGlobalAgentAuthorizedTool(kind: "mcp" | "skill", input: any, auditContext?: ToolScope["auditContext"]): Promise<{
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
    storage_file: string;
};
export {};
