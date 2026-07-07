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
export declare function buildRuntimeToolDispatchGate(audit?: any): RuntimeToolDispatchGate;
export declare function getRuntimeToolCatalogRevision(catalog?: RuntimeToolSyncCatalog, selection?: any): string;
export declare function listRecentRuntimeToolAudits(limit?: number): any[];
export declare function probeRuntimeToolReadiness(audit: any, options?: {
    deep?: boolean;
    catalogRevision?: string;
    catalog?: RuntimeToolSyncCatalog;
    record?: boolean;
}): RuntimeToolReadiness;
interface CodexGatewayConfig {
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
interface RuntimeToolSyncCatalog {
    mcpTools?: any[];
    skills?: any[];
    codexGateway?: CodexGatewayConfig | null;
    runtimeStorageRoot?: string;
    skillPackagesDir?: string;
}
export declare function getRuntimeExecutionEnv(agentType: string): Record<string, string>;
export declare function runRuntimeToolSyncSelfTest(): {
    pass: boolean;
    checks: {
        unifiedGatewayConfigured: boolean;
        webSearchDisabled: boolean;
        secretUsesEnvironment: boolean;
        secretNotPersisted: boolean;
        codexSkillPathRegistered: boolean;
        permissionRulesSupportToolScope: boolean;
        toolScopedMcpStaysProxyOnly: boolean;
        nativeStyleToolScopedMcpStaysProxyOnly: boolean;
        fullServerMcpCanUseNative: boolean;
        grantServerMatchingKeepsToolGrant: boolean;
        nativeStyleGrantServerMatchingKeepsToolGrant: boolean;
        nativeAndProxyOnlyAuditNames: boolean;
        runtimeSyncIntegration: boolean;
        authorizationReadinessPromptWarnsChildAgent: boolean;
        authorizationReadinessBlocksDelivery: boolean;
        runtimeReadinessChecksDispatchGate: boolean;
        dispatchGateBlocksMissingAuthorization: boolean;
        snapshotPersistsDispatchGate: boolean;
        runtimeResyncSupportsSnapshotFilter: boolean;
        cursorRuntimeSyncSucceeded: boolean;
        cursorPluginMcpContainsOnlyNativeSafeServers: boolean;
        cursorReadinessChecksPluginMcpInheritance: boolean;
        cursorDoesNotPolluteProjectWorkspace: boolean;
        invokedSkillDetected: boolean;
    };
    rules: RuntimeToolPermissionRule[];
    invoked: RuntimeInvokedSkill[];
    integration: {
        pass: boolean;
        checks: {
            integrationSyncSucceeded: boolean;
            toolScopedMcpIsProxyOnly: boolean;
            toolScopedMcpNotInNativeConfig: boolean;
            fullServerMcpInNativeConfig: boolean;
            exactPermissionRulePersisted: boolean;
            snapshotCarriesCatalogRevision: boolean;
            readinessChecksCatalogRevision: boolean;
            staleCatalogRevisionBlocksDelivery: boolean;
            runtimeResyncRefreshesStaleSnapshot: boolean;
            runtimeResyncSupportsSnapshotFilter: boolean;
            authorizationReadinessPromptWarnsChildAgent: boolean;
            authorizationReadinessBlocksDelivery: boolean;
            runtimeReadinessChecksDispatchGate: boolean;
            dispatchGateBlocksMissingAuthorization: boolean;
            skillSyncedToCodexHome: boolean;
            marketplacePackageSkillCopiedToCodexHome: boolean;
            marketplacePackageSkillRegistered: boolean;
            snapshotPersistsNativeAndProxyDelivery: any;
            snapshotPersistsPackageSkillStatus: any;
            snapshotPersistsDispatchGate: boolean;
            gatewaySecretNotPersisted: boolean;
            claudeRuntimeSyncSucceeded: boolean;
            claudePluginManifestDeclaresSkillsAndMcp: boolean;
            claudePluginMcpContainsOnlyNativeSafeServers: boolean;
            claudeStrictMcpConfigMatchesPluginNativeScope: boolean;
            claudePluginSkillsCopiedForChildAgents: boolean;
            claudeSnapshotPersistsPluginDir: boolean;
            claudeReadinessChecksPluginMcpInheritance: boolean;
            codexSkillRuntimeAliasPersisted: boolean;
            claudeSkillRuntimeAliasPersisted: boolean;
            runtimePromptIncludesSkillAliasMapping: boolean;
            cursorRuntimeSyncSucceeded: boolean;
            cursorPluginManifestDeclaresSkillsAndMcp: boolean;
            cursorPluginMcpContainsOnlyNativeSafeServers: boolean;
            cursorPluginSkillsCopiedForChildAgents: boolean;
            cursorSnapshotPersistsPluginDir: boolean;
            cursorReadinessChecksPluginMcpInheritance: boolean;
            cursorDoesNotPolluteProjectWorkspace: boolean;
            cursorSkillRuntimeAliasPersisted: boolean;
            cursorPromptIncludesSkillAliasMapping: boolean;
        };
        audit: {
            mode: "failed" | "native-and-proxy" | "ccm-proxy-only";
            configFormat: string;
            mcp_statuses: RuntimeMcpStatus[];
            skill_statuses: {
                name: string;
                state: "missing" | "synced";
            }[];
        };
        claudeAudit: {
            mode: "failed" | "native-and-proxy" | "ccm-proxy-only";
            configFormat: string;
            mcp_statuses: RuntimeMcpStatus[];
            skill_statuses: {
                name: string;
                state: "missing" | "synced";
            }[];
        };
        cursorAudit: {
            mode: "failed" | "native-and-proxy" | "ccm-proxy-only";
            configFormat: string;
            mcp_statuses: RuntimeMcpStatus[];
            skill_statuses: {
                name: string;
                state: "missing" | "synced";
            }[];
        };
    };
};
export declare function syncRuntimeToolsWithCatalog(workDir: string, agentType: string, allowedTools: any, catalog?: RuntimeToolSyncCatalog, options?: RuntimeToolSyncOptions): RuntimeToolSyncAudit;
export declare function syncRuntimeTools(workDir: string, agentType: string, allowedTools: any, options?: RuntimeToolSyncOptions): RuntimeToolSyncAudit;
export declare function resyncMissingRuntimeToolSnapshots(options?: any): RuntimeMissingToolResyncResult;
export declare function resyncRecentRuntimeToolSnapshots(options?: any): RuntimeToolResyncResult;
export declare function buildRuntimeToolSyncPrompt(audit: RuntimeToolSyncAudit): string;
export declare function detectInvokedSkillsFromText(text: string, allowedTools?: any, skills?: any[]): RuntimeInvokedSkill[];
export declare function recordRuntimeToolSyncAudit(audit: RuntimeToolSyncAudit, projectName?: string, groupId?: string): void;
export {};
