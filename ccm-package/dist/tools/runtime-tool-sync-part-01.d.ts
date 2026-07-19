export declare const CCM_MCP_PREFIX = "ccm__";
export declare const CCM_SKILL_MARKER = ".ccm-managed.json";
export interface RuntimeToolSyncAudit {
    runtime: string;
    mode: "native-and-proxy" | "ccm-proxy-only" | "failed";
    nativeSupported: boolean;
    workDir: string;
    snapshotId?: string;
    snapshotPath?: string;
    mcpConfigPath?: string;
    runtimeHomePath?: string;
    isolatedHomePath?: string;
    pluginDirPath?: string;
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
    authorization_readiness?: any;
    internal_mcp?: Array<{
        name: string;
        protected: true;
        state: "synced" | "config_error";
        error?: string;
    }>;
    dispatch_gate?: RuntimeToolDispatchGate;
    reusedSnapshot?: boolean;
    catalogRevision?: string;
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
    state: "synced" | "proxy_only" | "missing" | "missing_tool" | "config_error";
    grants: string[];
    tools: string[];
    delivery?: "native" | "proxy";
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
    runtimeDirectory?: string;
    nativeSkillNames?: string[];
    invocationAliases?: string[];
}
export interface RuntimeInvokedSkill {
    name: string;
    skillPath?: string;
    contentHash: string;
    invokedAt: string;
    source: "receipt" | "output" | "prompt";
}
export interface RuntimeToolReadiness {
    runtime: string;
    snapshotId: string;
    projectName: string;
    groupId: string;
    checkedAt: string;
    snapshotGeneratedAt: string;
    deliveryReady: boolean;
    runtimeReady: boolean;
    deepChecked: boolean;
    overallReady: boolean;
    catalogRevision: string;
    currentCatalogRevision: string;
    catalogStale: boolean;
    authorizationReadiness?: any;
    dispatchGate?: RuntimeToolDispatchGate;
    cli: {
        command: string;
        available: boolean;
        version?: string;
        error?: string;
    };
    checks: Array<{
        id: string;
        ok: boolean;
        detail: string;
    }>;
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
}
export interface RuntimeToolSyncOptions {
    authorizationReadiness?: any;
    internalMcpServers?: Record<string, any>;
}
export interface RuntimeToolDispatchGate {
    schema: "ccm-runtime-tool-dispatch-gate-v1";
    dispatchReady: boolean;
    status: "ready" | "blocked";
    reason: string;
    blockers: Array<{
        id: string;
        detail: string;
        data?: any;
    }>;
}
export interface RuntimeToolResyncResult {
    schema: "ccm-runtime-tool-resync-v1";
    requestedAt: string;
    summary: {
        scanned: number;
        selected: number;
        resynced: number;
        skipped: number;
        failed: number;
    };
    items: any[];
}
export interface RuntimeMissingToolResyncResult {
    schema: "ccm-runtime-tool-missing-snapshot-resync-v1";
    requestedAt: string;
    summary: {
        scanned: number;
        selected: number;
        created: number;
        skipped: number;
        failed: number;
    };
    items: any[];
}
export declare function uniqueNames(value: any): string[];
export declare function cleanRuntimeResyncText(value: any, max?: number): string;
export declare function getAuthorizationReadiness(auditOrReadiness?: any): any;
export declare function formatAuthorizationReadinessNotice(audit: RuntimeToolSyncAudit): string;
export declare function buildRuntimeToolDispatchGate(audit?: any): RuntimeToolDispatchGate;
export declare function appendJsonlBounded(file: string, entry: any): void;
export declare function readJsonFile(file: string): any;
export declare function stableHash(value: any, length?: number): string;
export declare function getRuntimeToolCatalogRevision(catalog?: RuntimeToolSyncCatalog, selection?: any): string;
export declare function listRecentRuntimeToolAudits(limit?: number): any[];
export declare function probeRuntimeToolReadiness(audit: any, options?: {
    deep?: boolean;
    catalogRevision?: string;
    catalog?: RuntimeToolSyncCatalog;
    record?: boolean;
}): RuntimeToolReadiness;
export declare function normalizeMcpKey(value: any): string;
export declare function parseMcpGrant(value: any): {
    raw: string;
    server: string;
    tool: string;
};
export declare function mcpGrantsForServer(grants: string[], serverName: string): string[];
export declare function mcpGrantToolsForServer(grants: string[], serverName: string): string[];
export declare function shouldExposeMcpServerNatively(grants: string[], serverName: string): boolean;
export declare function requestedMcpServers(value: any): string[];
export declare function nativeMcpNamesFromAudit(audit: any): string[];
export declare function proxyOnlyMcpNamesFromAudit(audit: any): string[];
export declare function toMcpServer(tool: any): any;
export declare function safeSlug(value: string): string;
export declare function readJsonObject(file: string): any;
export declare function writeJsonAtomic(file: string, value: any): void;
export declare function resolveSkillPackage(skill: any, skillPackagesDir?: string): {
    packagePath: string;
    skillPath: string;
};
export declare function syncManagedSkills(skillRoot: string, skills: any[], audit: RuntimeToolSyncAudit, skillPackagesDir?: string): void;
export declare function writeSessionPlugin(pluginRoot: string, runtime: "claudecode" | "cursor", snapshotId: string, mcpServers: Record<string, any>, skills: any[], audit: RuntimeToolSyncAudit, skillPackagesDir?: string): void;
export declare function buildPermissionRules(requested: {
    mcp: string[];
    skill: string[];
}): RuntimeToolPermissionRule[];
export declare function writeRuntimeSnapshot(runtimeRoot: string, audit: RuntimeToolSyncAudit): void;
export declare function pruneManagedMcpSnapshots(runtimeRoot: string, keepFile: string): void;
export declare function tomlString(value: any): string;
export interface CodexGatewayConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
    providerId?: string;
    providerName?: string;
    envKey?: string;
    wireApi?: string;
    requiresOpenAiAuth?: boolean;
    linkAuth?: boolean;
}
export interface RuntimeToolSyncCatalog {
    mcpTools?: any[];
    skills?: any[];
    codexGateway?: CodexGatewayConfig | null;
    runtimeStorageRoot?: string;
    skillPackagesDir?: string;
}
export declare function loadCodexGatewayConfig(): CodexGatewayConfig | null;
export declare function loadCodexLocalAccessConfig(): CodexGatewayConfig | null;
export declare function loadCodexProviderConfig(): CodexGatewayConfig | null;
