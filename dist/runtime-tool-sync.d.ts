export interface RuntimeToolSyncAudit {
    runtime: string;
    mode: "native-and-proxy" | "ccm-proxy-only" | "failed";
    nativeSupported: boolean;
    workDir: string;
    mcpConfigPath?: string;
    runtimeHomePath?: string;
    skillRoot?: string;
    configFormat?: string;
    isolation?: "strict" | "allowlist" | "project-scope" | "proxy";
    requested: {
        mcp: string[];
        skill: string[];
    };
    synced: {
        mcp: string[];
        skill: string[];
    };
    missing: {
        mcp: string[];
        skill: string[];
    };
    errors: string[];
    warnings: string[];
    timestamp: string;
}
export declare function syncRuntimeTools(workDir: string, agentType: string, allowedTools: any): RuntimeToolSyncAudit;
export declare function buildRuntimeToolSyncPrompt(audit: RuntimeToolSyncAudit): string;
export declare function recordRuntimeToolSyncAudit(audit: RuntimeToolSyncAudit, projectName?: string, groupId?: string): void;
