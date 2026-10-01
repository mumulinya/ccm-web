export declare const CCM_DIR: string;
export declare const SMITHERY_CONFIG_FILE: string;
export declare const MAX_CATALOG_BYTES: number;
export declare const MAX_SKILL_FILE_BYTES: number;
export declare const CCM_COMMUNITY_CATALOG_URL = "https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/marketplace.json";
export declare const SKILLS_SH_SEARCH_URL = "https://skills.sh/api/search";
export declare const SMITHERY_SERVERS_URL = "https://api.smithery.ai/servers";
export declare const DEFAULT_MARKETPLACE_PAGE_SIZE = 12;
export declare const MAX_MARKETPLACE_PAGE_SIZE = 50;
export declare const CCM_OFFICIAL_MARKETPLACE_REVISION = "2026-07-30.2";
export interface MarketplaceSource {
    id: string;
    label: string;
    kind: "builtin" | "skills-sh" | "smithery" | "catalog" | "github" | "direct";
    url?: string;
    trust: "official" | "community" | "custom";
}
export interface MarketplaceListOptions {
    query?: string;
    page?: number;
    pageSize?: number;
    category?: string;
    sort?: string;
    requestedItem?: any;
}
export interface InstallationRecord {
    key: string;
    name: string;
    type: "mcp" | "skill";
    version: string;
    checksum: string;
    source: MarketplaceSource;
    sourceProof?: any;
    packagePath?: string;
    installedAt: string;
    updatedAt: string;
    schema?: "ccm-marketplace-installation-v2";
    installationId?: string;
    state?: "active" | "quarantined_legacy" | "resync_required" | "failed";
    materialTreeHash?: string;
    catalogRevision?: string;
    transport?: "stdio" | "streamable_http" | "sse";
    activatedBy?: string;
    activatedAt?: string;
    runtimeState?: string;
    resyncState?: string;
}
interface MarketplaceSavedSource extends MarketplaceSource {
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    credentialRef?: string;
}
export interface MarketplaceInstallStore {
    skillPackagesDir?: string;
    loadInstallations?: () => InstallationRecord[];
    saveInstallations?: (items: InstallationRecord[]) => void;
    saveMcpTool?: (tool: any) => void;
    saveSkill?: (skill: any) => void;
    deleteMcpTool?: (name: string) => void;
    deleteSkill?: (name: string) => void;
    reloadTools?: () => void | Promise<void>;
    appendAudit?: (entry: any) => void;
    loadAudit?: () => any[];
    loadRuntimeAudits?: () => any[];
    loadMcpTools?: () => any[];
    loadSkills?: () => any[];
    loadProjectConfigs?: () => any;
    loadGroups?: () => any[];
}
export declare function safeSlug(value: any): string;
export declare function installationKey(type: string, name: string): string;
export declare function writeJsonAtomic(file: string, value: any): void;
export declare function appendJsonlBounded(file: string, entry: any): void;
export declare function appendMarketplaceOperationAudit(entry: any, store?: MarketplaceInstallStore): void;
export declare function readMarketplaceOperationAudit(input?: any, store?: MarketplaceInstallStore): {
    schema: string;
    limit: number;
    items: {
        schema: string;
        at: string;
        action: string;
        key: string;
        type: string;
        name: string;
        source: {
            id: string;
            label: string;
            kind: any;
            trust: any;
            url: string;
        };
        previousVersion: string;
        version: string;
        previousChecksum: string;
        checksum: string;
        changed: boolean;
        packageManaged: boolean;
        toolManagerReloaded: boolean;
        authorizationImpact: {
            schema: string;
            action: string;
            type: string;
            name: string;
            summary: {
                scopeCount: number;
                projects: number;
                groups: number;
                mcpGrants: number;
                skillGrants: number;
            };
            scopes: any;
            truncated: boolean;
        };
        runtimeImpact: {
            schema: string;
            action: string;
            type: string;
            name: string;
            summary: {
                runtimeSnapshots: number;
                catalogStale: number;
                dispatchBlocked: number;
                deliveryBlocked: number;
                affectedProjects: number;
                affectedGroups: number;
            };
            snapshots: any;
            truncated: boolean;
        };
        runtimeResync: {
            schema: string;
            success: boolean;
            requestedAt: string;
            error: string;
            summary: {
                scanned: number;
                selected: number;
                created: number;
                resynced: number;
                skipped: number;
                failed: number;
            };
            items: any;
        };
        sourceProof: {
            schema: string;
            itemId: string;
            type: string;
            name: string;
            version: string;
            source: {
                id: string;
                label: string;
                kind: any;
                trust: any;
                url: string;
                credentialConfigured: boolean;
            };
            materialKind: string;
            materialHash: string;
            checksum: string;
            envKeys: any;
            headerKeys: any;
            packageStats: {
                files: number;
                totalBytes: number;
                treeHash: string;
            };
        };
    }[];
    summary: {
        totalReturned: number;
        actionCounts: any;
        impactedScopes: number;
        impactedRuntimeSnapshots: number;
        staleRuntimeSnapshots: number;
        runtimeResynced: number;
        runtimeResyncFailed: number;
        truncated: boolean;
    };
};
export declare function buildMarketplaceAuthorizationImpact(input: {
    action: string;
    type: string;
    name: string;
}, store?: MarketplaceInstallStore): {
    schema: string;
    action: string;
    type: string;
    name: string;
    summary: {
        scopeCount: number;
        projects: number;
        groups: number;
        mcpGrants: number;
        skillGrants: number;
    };
    scopes: any;
    truncated: boolean;
};
export declare function previewMarketplaceAuthorizationImpact(payload: any, store?: MarketplaceInstallStore): {
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
};
export declare function buildMarketplaceRuntimeImpact(input: {
    action: string;
    type: string;
    name: string;
}, store?: MarketplaceInstallStore): {
    schema: string;
    action: string;
    type: string;
    name: string;
    summary: {
        runtimeSnapshots: number;
        catalogStale: number;
        dispatchBlocked: number;
        deliveryBlocked: number;
        affectedProjects: number;
        affectedGroups: number;
    };
    snapshots: any;
    truncated: boolean;
};
export declare function buildMarketplaceRuntimeCatalog(store?: MarketplaceInstallStore): {
    mcpTools: any[];
    skills: any[];
    skillPackagesDir: string;
};
export declare function maybeAutoResyncMarketplaceRuntime(impact: any, options?: any, store?: MarketplaceInstallStore): {
    schema: string;
    success: boolean;
    requestedAt: string;
    error: string;
    summary: {
        scanned: number;
        selected: number;
        created: number;
        resynced: number;
        skipped: number;
        failed: number;
    };
    items: any;
};
export declare function previewToolCatalogMutationImpact(input: {
    action: string;
    type: string;
    name: string;
}, store?: MarketplaceInstallStore): {
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
    runtimeImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            runtimeSnapshots: number;
            catalogStale: number;
            dispatchBlocked: number;
            deliveryBlocked: number;
            affectedProjects: number;
            affectedGroups: number;
        };
        snapshots: any;
        truncated: boolean;
    };
};
export declare function completeToolCatalogMutationLifecycle(input: {
    action: string;
    type: string;
    name: string;
    autoResync?: any;
}, store?: MarketplaceInstallStore): {
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
    runtimeImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            runtimeSnapshots: number;
            catalogStale: number;
            dispatchBlocked: number;
            deliveryBlocked: number;
            affectedProjects: number;
            affectedGroups: number;
        };
        snapshots: any;
        truncated: boolean;
    };
    runtimeResync: {
        schema: string;
        success: boolean;
        requestedAt: string;
        error: string;
        summary: {
            scanned: number;
            selected: number;
            created: number;
            resynced: number;
            skipped: number;
            failed: number;
        };
        items: any;
    };
};
export declare function loadInstallations(): InstallationRecord[];
export declare function saveInstallations(items: InstallationRecord[]): void;
export declare function marketplaceSourceId(url: string): string;
export declare function normalizeSavedSource(value: any): MarketplaceSavedSource | null;
export declare function loadMarketplaceSources(): MarketplaceSavedSource[];
export declare function saveMarketplaceSources(items: MarketplaceSavedSource[]): void;
export declare function recoverMarketplaceProductionState(): {
    at: string;
    quarantined: number;
    migrated: number;
    credentialsMigrated: number;
    staleStagingRemoved: number;
    recoveredTransactions: number;
    officialFilesystemRepaired: boolean;
    runtimeResync: any;
};
export declare function removeManagedPackage(packagePath: string, skillPackagesDir?: string): void;
export declare function sha256(value: Buffer | string): string;
export declare function buildMarketplaceSourceProof(item: any, input?: any): {
    schema: string;
    itemId: string;
    type: string;
    name: string;
    version: string;
    source: {
        id: string;
        label: string;
        kind: any;
        trust: any;
        url: string;
        credentialConfigured: boolean;
    };
    materialKind: string;
    materialHash: string;
    checksum: string;
    envKeys: any;
    headerKeys: any;
    packageStats: {
        files: number;
        totalBytes: number;
        treeHash: string;
    };
};
export declare function sanitizeMarketplacePreviewItem(item: any): {
    id: string;
    name: string;
    displayName: string;
    type: string;
    description: string;
    author: string;
    version: string;
    source: {
        id: string;
        label: string;
        kind: any;
        trust: any;
        url: string;
        credentialConfigured: boolean;
    };
    sourceUrl: string;
    downloadUrl: string;
    homepage: string;
    command: string;
    args: any;
    url: string;
    envKeys: string[];
    headerKeys: string[];
};
export declare function sanitizeMarketplaceSourceProof(value: any): {
    schema: string;
    itemId: string;
    type: string;
    name: string;
    version: string;
    source: {
        id: string;
        label: string;
        kind: any;
        trust: any;
        url: string;
        credentialConfigured: boolean;
    };
    materialKind: string;
    materialHash: string;
    checksum: string;
    envKeys: any;
    headerKeys: any;
    packageStats: {
        files: number;
        totalBytes: number;
        treeHash: string;
    };
};
export declare function compareVersions(left: string, right: string): number;
export declare function baseMarketplaceSourceId(value: any): string;
export declare function publicMarketplaceSources(): {
    url: string;
    credentialConfigured: boolean;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    id: string;
    label: string;
    kind: "builtin" | "skills-sh" | "smithery" | "catalog" | "github" | "direct";
    trust: "official" | "community" | "custom";
}[];
export declare function normalizeMarketplaceItem(item: any, fallbackSource: MarketplaceSource): any;
export declare function normalizeMarketplaceInstallRequest(item: any, fallbackSource: MarketplaceSource): {
    id: string;
    name: string;
    type: string;
    source: MarketplaceSource;
};
export declare function githubRepoFromUrlOrShorthand(value: any): string;
export declare function catalogItemsFromParsedJson(parsed: any, source: MarketplaceSource, catalogUrl?: string): any[];
export declare function decorateInstallState(items: any[]): any[];
export declare function isPrivateAddress(address: string): boolean;
export declare function assertSafeHttpsUrl(value: string): Promise<URL>;
export declare function fetchRemote(value: string, maxBytes: number, headers?: Record<string, string>, redirects?: number): Promise<{
    body: Buffer;
    contentType: string;
    finalUrl: string;
}>;
export declare function parseSkillMarkdown(content: string, fallbackName?: string, fallbackDescription?: string): {
    name: string;
    description: string;
    prompt: string;
    content: string;
    context: string;
    allowedTools: string[];
    agent: string;
    model: string;
    effort: string;
};
export declare function parseGithubSkillSource(value: string): {
    cloneUrl: string;
    ref: string;
    subpath: string;
    repository: string;
};
export declare function validateSkillDirectory(root: string): {
    files: number;
    totalBytes: number;
    treeHash: string;
    manifest: {
        path: string;
        type: "file";
        size: number;
        checksum: string;
    }[];
};
export declare function cloneGithubSkill(item: any, staging: string): Promise<{
    commit: string;
}>;
export declare function stageSkillPackage(item: any, skillPackagesDir?: string): Promise<{
    staging: string;
    skillFile: string;
    parsed: {
        name: string;
        description: string;
        prompt: string;
        content: string;
        context: string;
        allowedTools: string[];
        agent: string;
        model: string;
        effort: string;
    };
    checksum: string;
    treeHash: string;
    sourceRevision: string;
    packageStats: {
        files: number;
        totalBytes: number;
        treeHash: string;
        manifest: {
            path: string;
            type: "file";
            size: number;
            checksum: string;
        }[];
    };
}>;
export declare function installStagedPackage(staging: string, name: string, skillPackagesDir?: string, identityChecksum?: string): string;
export declare function localMarketplaceItems(): any[];
export declare function runMarketplaceSelfTest(): Promise<{
    pass: boolean;
    checks: {
        versionComparisonWorks: boolean;
        privateAddressProtectionWorks: boolean;
        invalidCatalogEntryRejected: boolean;
        skillFrontmatterParsed: boolean;
        claudePluginMarketplaceMcpConverted: any;
        claudePluginMarketplaceSkillConverted: any;
        bundledFeishuPathResolved: boolean;
        filesystemMcpUsesManagedSharedRoot: boolean;
        localItemsCarryOfficialTrust: boolean;
        savedSourceIdIsStable: boolean;
        externalSourceKeepsCommunityTrust: boolean;
        externalSourceCannotClaimOfficialTrust: boolean;
        plainHttpSourceRejected: boolean;
        installedMcpEntersAuthorizationOptions: boolean;
        installedSkillEntersAuthorizationOptions: boolean;
        marketplaceMetadataPreservedForAuthorization: boolean;
        authorizationOptionsHideInstallSecrets: boolean;
        installationRecordUsesStableKey: boolean;
        marketplacePreviewReturnsSourceProof: boolean;
        marketplaceInstallationRecordCarriesSourceProof: boolean;
        sourceProofHidesSecretValues: boolean;
        marketplacePreviewHidesSecretValues: boolean;
        sourceBoundInstallUsesCatalogMaterial: boolean;
        sourceBoundInstallRejectsUnsavedSource: boolean;
        sourceBoundUpdateUsesCatalogMaterial: boolean;
        onlineMarketplaceQueryIsSanitized: boolean;
        onlineMarketplacePaginationIsBounded: boolean;
        skillsShIdentityIsSourceBound: boolean;
        smitheryIdentityIsSourceBound: boolean;
        anonymousSourceStatusHidesCredentials: boolean;
        marketplaceInstallE2E: boolean;
    };
    localItems: any[];
    authorizationOptions: {
        success: true;
        mcp: any[];
        skill: any[];
        summary: any;
    };
    installE2E: {
        pass: boolean;
        checks: {
            realMcpJsonPersisted: boolean;
            realSkillJsonPersisted: boolean;
            explicitUpdateRequiresExistingInstall: boolean;
            marketplaceUpdatePersistsNewVersion: boolean;
            marketplaceOperationAuditRecordsInstallAndUpdate: boolean;
            marketplaceAuthorizationImpactPreflightWorks: boolean;
            marketplaceUpdateReportsAuthorizationImpact: boolean;
            marketplaceUpdateReportsRuntimeImpact: boolean;
            marketplaceUpdateReportsSourceProof: boolean;
            marketplaceUpdateAutoResyncsRuntime: boolean;
            marketplaceImpactMatchesNativeMcpGrant: any;
            skillPackageInstalled: boolean;
            installationRecordsPersisted: boolean;
            installedResourcesReachAuthorizationOptions: boolean;
            installedResourcesReachRuntimeSync: any;
            runtimeSyncDoesNotPersistGatewaySecret: boolean;
            installHidesSecretsInAuthorizationOptions: boolean;
            uninstallRemovesCatalogEntries: boolean;
            uninstallRemovesSkillPackage: boolean;
            uninstallRemovesInstallationRecords: boolean;
            uninstallOperationAuditRecorded: boolean;
            uninstallReportsAffectedAuthorizations: boolean;
            uninstallReportsRuntimeImpact: boolean;
            uninstallAutoResyncsRuntime: boolean;
            marketplaceOperationAuditRecordsAuthorizationImpact: boolean;
            marketplaceOperationAuditRecordsRuntimeImpact: boolean;
            marketplaceOperationAuditRecordsRuntimeResync: boolean;
            marketplaceOperationAuditRecordsSourceProof: boolean;
            marketplaceOperationHistoryReadsRecentSanitizedEntries: boolean;
            marketplaceOperationHistoryIncludesSourceProof: boolean;
            reloadCalledForInstallUpdateAndUninstall: boolean;
        };
    };
}>;
export declare function installMarketplaceItemWithStore(rawItem: any, store?: MarketplaceInstallStore, mode?: "install" | "update", options?: any): Promise<{
    item: any;
    record: InstallationRecord;
    action: string;
    updated: boolean;
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
    runtimeImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            runtimeSnapshots: number;
            catalogStale: number;
            dispatchBlocked: number;
            deliveryBlocked: number;
            affectedProjects: number;
            affectedGroups: number;
        };
        snapshots: any;
        truncated: boolean;
    };
    runtimeResync: {
        schema: string;
        success: boolean;
        requestedAt: string;
        error: string;
        summary: {
            scanned: number;
            selected: number;
            created: number;
            resynced: number;
            skipped: number;
            failed: number;
        };
        items: any;
    };
    sourceProof: any;
}>;
export declare function uninstallMarketplaceItemWithStore(payload: any, store?: MarketplaceInstallStore, options?: any): Promise<{
    name: string;
    type: string;
    action: string;
    removed: boolean;
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
    runtimeImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            runtimeSnapshots: number;
            catalogStale: number;
            dispatchBlocked: number;
            deliveryBlocked: number;
            affectedProjects: number;
            affectedGroups: number;
        };
        snapshots: any;
        truncated: boolean;
    };
    runtimeResync: {
        schema: string;
        success: boolean;
        requestedAt: string;
        error: string;
        summary: {
            scanned: number;
            selected: number;
            created: number;
            resynced: number;
            skipped: number;
            failed: number;
        };
        items: any;
    };
}>;
export declare function handleMarketplaceApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
