export type CcmScopeInstructionKind = "project" | "group" | "group_project";
export type CcmScopeInstructionStatus = "queued" | "generating" | "ready" | "stale" | "waiting_input" | "failed";
export type CcmScopeInstructionCatalogEntryV1 = {
    schema: "ccm-scope-instruction-catalog-entry-v1";
    documentId: string;
    kind: CcmScopeInstructionKind;
    scope?: "project" | "group";
    scopeId?: string;
    projectId?: string;
    groupId?: string;
    fileName: string;
    title: string;
    purpose: string;
    status: CcmScopeInstructionStatus;
    generation: number;
    revision: number;
    checksum?: string;
    updatedAt: string;
    readTool: "read_scope_instruction";
    contentStored: false;
    currentVersion?: number;
    targetVersion?: number;
    lastReadyVersion?: number;
    lastReadyRevision?: number;
    lastReadyAt?: string;
    lastCheckedAt?: string;
    refreshReasons?: CcmScopeInstructionRefreshReason[];
    displayingPreviousVersion?: boolean;
    generationRunId?: string;
    generationAttempts?: number;
    failureReason?: string;
};
export type CcmScopeInstructionRefreshReason = "initial_generation" | "key_files_changed" | "module_topology_changed" | "public_interface_changed" | "large_source_change" | "accepted_architecture_task" | "group_purpose_changed" | "group_members_changed" | "project_cognition_changed" | "manual_regeneration";
export type ScopeInstructionIdentity = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId?: string;
    allowedProjects?: string[];
    allowedGroups?: string[];
    generation?: number;
};
export declare function ensureProjectScopeInstruction(projectIdValue: string): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function checkProjectScopeInstructionFreshness(projectIdValue: string, options?: {
    trigger?: "panel_open" | "accepted_task" | "accepted_architecture_task";
    force?: boolean;
}): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function checkScopeInstructionFreshness(input: {
    scope: "project" | "group";
    scopeId: string;
    force?: boolean;
}): {
    scope: "project";
    scopeId: string;
    entries: (CcmScopeInstructionCatalogEntryV1 & {
        sourceCount: number;
    })[];
    contentStored: boolean;
} | {
    scope: "group";
    scopeId: string;
    entries: (CcmScopeInstructionCatalogEntryV1 & {
        sourceCount: number;
    })[];
    contentStored: boolean;
};
export declare function scheduleProjectScopeInstructionRefreshAfterAcceptedTask(projectIdValue: string, fileChanges?: any[]): {
    scheduled: boolean;
    projectId: string;
    trigger: string;
    changedFileCount: number;
    contentStored: boolean;
};
export declare function ensureGroupScopeInstructions(input: {
    groupId: string;
    name?: string;
    purpose?: string;
    projectIds?: string[];
}): (CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
})[];
export declare function deactivateProjectScopeInstruction(projectIdValue: string): void;
export declare function restoreProjectScopeInstruction(projectId: string): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function purgeProjectScopeInstruction(projectIdValue: string): void;
export declare function deactivateGroupScopeInstructions(groupIdValue: string): void;
export declare function listScopeInstructionCatalog(identity: ScopeInstructionIdentity): (CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
})[];
export declare function getScopeInstructionCatalogEntry(documentIdValue: string): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function renderScopeInstructionCatalog(identity: ScopeInstructionIdentity): string;
export declare function readScopeInstructionForAgent(input: {
    identity: ScopeInstructionIdentity;
    documentId: string;
    expectedChecksum?: string;
}): {
    schema: string;
    documentId: string;
    kind: CcmScopeInstructionKind;
    projectId: string;
    groupId: string;
    revision: number;
    checksum: string;
    content: string;
    loadReceipt: {
        scope: "global" | "group" | "project";
        scopeId: string;
        exactSessionId: string;
        checksum: string;
        loadedAt: string;
        contentStored: boolean;
    };
};
export declare function restoreScopeInstructionContext(identity: ScopeInstructionIdentity): {
    context: string;
    restored: any[];
    dropped: any[];
};
export declare function readScopeInstructionDetail(documentIdValue: string): {
    entry: CcmScopeInstructionCatalogEntryV1 & {
        sourceCount: number;
    };
    markdown: string;
    generatedMarkdown: string;
    userSupplement: string;
    displayedVersion: number;
    isHistorical: boolean;
    contentStored: boolean;
};
export declare function supplementScopeInstruction(input: {
    documentId: string;
    revision: number;
    content: string;
}): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function regenerateScopeInstruction(documentIdValue: string, expectedRevision?: number): CcmScopeInstructionCatalogEntryV1 & {
    sourceCount: number;
};
export declare function initializeScopeInstructions(input?: {
    projects?: string[];
    groups?: any[];
}): void;
export declare function scopeInstructionStoreRootForTests(): string;
