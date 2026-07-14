interface MarketplaceSource {
    id: string;
    label: string;
    kind: "builtin" | "skills-sh" | "smithery" | "catalog" | "github" | "direct";
    url?: string;
    trust: "official" | "community" | "custom";
}
interface InstallationRecord {
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
}
interface MarketplaceInstallStore {
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
