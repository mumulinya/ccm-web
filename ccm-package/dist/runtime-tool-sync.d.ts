export interface RuntimeToolSyncAudit {
    runtime: string;
    mode: "native-and-proxy" | "ccm-proxy-only" | "failed";
    nativeSupported: boolean;
    workDir: string;
    snapshotId?: string;
    snapshotPath?: string;
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
    mcp_statuses?: RuntimeMcpStatus[];
    skill_statuses?: RuntimeSkillStatus[];
    permission_rules?: RuntimeToolPermissionRule[];
    invoked_skills?: RuntimeInvokedSkill[];
    reusedSnapshot?: boolean;
    errors: string[];
    warnings: string[];
    timestamp: string;
}
export interface RuntimeToolPermissionRule {
    kind: "mcp" | "skill";
    scope: "server" | "tool" | "skill";
    raw: string;
    server?: string;
    tool?: string;
    skill?: string;
    rule: string;
}
export interface RuntimeMcpStatus {
    name: string;
    serverName: string;
    state: "synced" | "missing" | "missing_tool" | "config_error";
    grants: string[];
    tools: string[];
    availableTools?: string[];
    missingTools?: string[];
    error?: string;
}
export interface RuntimeSkillStatus {
    name: string;
    state: "synced" | "missing";
    skillPath?: string;
    sourcePath?: string;
    sourceMtimeMs?: number;
    description?: string;
    contentHash?: string;
}
export interface RuntimeInvokedSkill {
    name: string;
    skillPath?: string;
    contentHash: string;
    invokedAt: string;
    source: "receipt" | "output" | "prompt";
}
export declare function getRuntimeExecutionEnv(agentType: string): Record<string, string>;
export declare function runRuntimeToolSyncSelfTest(): {
    pass: boolean;
    checks: {
        unifiedGatewayConfigured: boolean;
        webSearchDisabled: boolean;
        secretUsesEnvironment: boolean;
        secretNotPersisted: boolean;
        permissionRulesSupportToolScope: boolean;
        invokedSkillDetected: boolean;
    };
    rules: RuntimeToolPermissionRule[];
    invoked: RuntimeInvokedSkill[];
};
export declare function syncRuntimeTools(workDir: string, agentType: string, allowedTools: any): RuntimeToolSyncAudit;
export declare function buildRuntimeToolSyncPrompt(audit: RuntimeToolSyncAudit): string;
export declare function detectInvokedSkillsFromText(text: string, allowedTools?: any, skills?: any[]): RuntimeInvokedSkill[];
export declare function recordRuntimeToolSyncAudit(audit: RuntimeToolSyncAudit, projectName?: string, groupId?: string): void;
