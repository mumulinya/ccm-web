interface SkillDef {
    name: string;
    description: string;
    prompt?: string;
    enabled: boolean;
    filename?: string;
    sourcePath?: string;
    contentHash?: string;
}
export interface PostCompactDynamicToolCatalog {
    tools: Array<{
        name: string;
        description: string;
        server: string;
        line: string;
    }>;
    skills: Array<{
        name: string;
        description: string;
        contentHash: string;
        line: string;
    }>;
    mcpInstructions: Array<{
        name: string;
        instructions: string;
        block: string;
    }>;
}
export interface ToolScope {
    mcp?: string[];
    skill?: string[];
    auditContext?: ToolInvocationAuditContext;
}
export interface ToolInvocationAuditContext {
    runtime?: string;
    project?: string;
    groupId?: string;
    taskId?: string;
    executionId?: string;
    source?: string;
}
interface McpServerStatus {
    name: string;
    state: "pending" | "connected" | "failed" | "disconnected" | "auth_required";
    toolsCount: number;
    error?: string;
    lastConnectedAt?: string;
    lastErrorAt?: string;
    retryCount: number;
    auth?: McpAuthStatus;
}
interface McpAuthStatus {
    authRequired: boolean;
    authConfigured: boolean;
    tokenExpiresAt?: string;
    tokenExpired: boolean;
    refreshConfigured: boolean;
    needsUserAuth: boolean;
    elicitationRequired: boolean;
    message: string;
    detectedSignals: string[];
}
export declare class ToolManager {
    private clients;
    private serverConfigs;
    private serverStatuses;
    private tools;
    private skills;
    private initialized;
    loadTools(): Promise<void>;
    buildToolPrompt(scope?: ToolScope): string;
    buildScopeAudit(scope?: ToolScope): {
        mcp: {
            raw: string;
            server: string;
            tool: string;
            state: string;
            availableTools: string[];
            missingTools: string[];
            serverStatus: McpServerStatus;
        }[];
        skills: {
            name: string;
            state: string;
            description: string;
            contentHash: string;
            toolName: string;
        }[];
        missing_mcp_tools: {
            raw: string;
            server: string;
            tool: string;
            state: string;
            availableTools: string[];
            missingTools: string[];
            serverStatus: McpServerStatus;
        }[];
        missing_mcp_servers: {
            raw: string;
            server: string;
            tool: string;
            state: string;
            availableTools: string[];
            missingTools: string[];
            serverStatus: McpServerStatus;
        }[];
        missing_skills: {
            name: string;
            state: string;
            description: string;
            contentHash: string;
            toolName: string;
        }[];
    };
    discoverSkills(scope?: ToolScope): {
        name: string;
        description: string;
        enabled: boolean;
        contentHash: string;
        sourcePath: string;
        toolName: string;
        invokeToolName: string;
    }[];
    getPostCompactDynamicToolCatalog(scope?: ToolScope): PostCompactDynamicToolCatalog;
    invokeSkill(name: string, input?: any, scope?: ToolScope): {
        ok: boolean;
        name: string;
        description: string;
        contentHash: string;
        prompt: string;
        renderedPrompt: string;
        input: string;
        invokedAt: string;
        auditFile: string;
    } | {
        ok: boolean;
        name: string;
        error: string;
        invokedAt: string;
        contentHash?: undefined;
    } | {
        ok: boolean;
        name: string;
        contentHash: string;
        error: string;
        invokedAt: string;
    };
    private parseSkillToolCall;
    private reconnectServer;
    parseToolCalls(text: string): Array<{
        name: string;
        arguments: any;
    }>;
    executeToolCall(toolName: string, args: any, scope?: ToolScope): Promise<string>;
    getToolList(): {
        mcp: {
            name: string;
            description: string;
            server: string;
            schema: any;
        }[];
        skills: SkillDef[];
        skillTools: {
            name: string;
            description: string;
            enabled: boolean;
            contentHash: string;
            sourcePath: string;
            toolName: string;
            invokeToolName: string;
        }[];
        skillAuditFile: string;
        servers: {
            name: string;
            connected: boolean;
            toolsCount: number;
            state: "connected" | "disconnected" | "pending" | "failed" | "auth_required";
            error: string;
            lastConnectedAt: string;
            lastErrorAt: string;
            retryCount: number;
            instructions: string;
            auth: McpAuthStatus;
        }[];
    };
    testConnection(command: string, env: string, args?: any): Promise<{
        success: boolean;
        tools: string[];
        error?: string;
        auth?: McpAuthStatus;
    }>;
    disconnect(): void;
    private loadMcpConfigs;
    private loadSkillConfigs;
    private parseEnv;
    private parseArgs;
}
export declare const toolManager: ToolManager;
export declare function runToolManagerRuntimeSelfTest(): Promise<{
    pass: boolean;
    checks: {
        detectsMissingTool: any;
        nativeStyleMcpGrantParsesAsAvailable: boolean;
        detectsMissingSkill: boolean;
        promptOnlyShowsAuthorizedTool: boolean;
        promptShowsSkillToolProtocol: any;
        discoversAuthorizedSkillTool: boolean;
        invokesAuthorizedSkillTool: boolean;
        skillInvocationAuditCarriesContext: boolean;
        parsesInvokeSkillToolCall: boolean;
        executesNativeStyleMcpToolName: boolean;
        rejectsUnauthorizedNativeStyleMcpToolName: boolean;
        rejectsUnauthorizedSkillTool: boolean;
        emptyScopeDeniesAllTools: boolean;
        detectsMcpAuthRequired: boolean;
        reloadDisconnectsStaleClient: boolean;
        reloadClearsStaleMcpStatus: boolean;
        reloadRefreshesSkillCatalog: any;
    };
    audit: any;
    discovered: any;
    invoked: any;
    denied: any;
    authStatus: any;
}>;
export {};
