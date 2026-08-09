import { type ToolScope } from "../tools/tool-manager";
import { buildContextSourceManifestReference } from "./main-agent-context-source-continuity";
export type MainAgentKind = "global" | "group" | "project";
export type MainAgentContinuityIdentityV1 = {
    agentKind: MainAgentKind;
    scope: MainAgentKind;
    scopeId: string;
    exactSessionId: string;
    generation: number;
};
export type InvokedSkillContinuityV1 = {
    schema: "ccm-invoked-skill-continuity-v1";
    name: string;
    contentHash: string;
    invocationEventId: string;
    sourceMessageId: string;
    invokedAt: string;
    bodyTokens: number;
};
export type LoadedMcpSchemaContinuityV1 = {
    schema: "ccm-loaded-mcp-schema-continuity-v1";
    canonicalName: string;
    server: string;
    schemaChecksum: string;
    loadSource: "tool_search" | "always_load";
    loadEventId: string;
    loadedAt: string;
    schemaTokens: number;
};
export type MainAgentPostCompactRestoreManifestV1 = {
    schema: "ccm-main-agent-post-compact-restore-manifest-v1";
    version: 1;
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    catalogRevision: string;
    authorizationChecksum: string;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    createdAt: string;
    checksum: string;
};
export type MainAgentPostCompactRestoreManifestV2 = Omit<MainAgentPostCompactRestoreManifestV1, "schema" | "version"> & {
    schema: "ccm-main-agent-post-compact-restore-manifest-v2";
    version: 2;
    contentStored: false;
};
export type MainAgentPostCompactRestoreManifestV3 = Omit<MainAgentPostCompactRestoreManifestV2, "schema" | "version"> & {
    schema: "ccm-main-agent-post-compact-restore-manifest-v3";
    version: 3;
    contextSourceManifest: ReturnType<typeof buildContextSourceManifestReference>;
};
export type MainAgentPostCompactRestoreManifest = MainAgentPostCompactRestoreManifestV1 | MainAgentPostCompactRestoreManifestV2 | MainAgentPostCompactRestoreManifestV3;
export type PostCompactToolRestoreReceiptV1 = {
    schema: "ccm-post-compact-tool-restore-receipt-v1";
    version: 1;
    identity: MainAgentContinuityIdentityV1;
    manifestChecksum: string;
    status: "not_required" | "restored" | "partial" | "rejected";
    loadedToolNames: string[];
    restoredSkillNames: string[];
    dropped: Array<{
        kind: "skill" | "mcp" | "manifest";
        name: string;
        reason: string;
    }>;
    restoredSkillTokens: number;
    restoredMcpSchemaTokens: number;
    catalogRevision: string;
    restoredAt: string;
    checksum: string;
};
export type PostCompactToolRestoreReceiptV2 = Omit<PostCompactToolRestoreReceiptV1, "schema" | "version"> & {
    schema: "ccm-post-compact-tool-restore-receipt-v2";
    version: 2;
    restoredSkills: Array<{
        name: string;
        contentHash: string;
        tokens: number;
        originalTokens: number;
        truncated: boolean;
        drift: "none";
    }>;
    restoredMcpSchemas: Array<{
        name: string;
        schemaChecksum: string;
        tokens: number;
        drift: "none";
    }>;
    contentStored: false;
};
export type PostCompactToolRestoreReceipt = PostCompactToolRestoreReceiptV1 | PostCompactToolRestoreReceiptV2;
export declare function resolveMainAgentContinuityIdentity(identityInput: MainAgentContinuityIdentityV1): {
    generation: any;
    agentKind: MainAgentKind;
    scope: MainAgentKind;
    scopeId: string;
    exactSessionId: string;
};
export declare function recordMainAgentInvokedSkill(input: {
    identity: MainAgentContinuityIdentityV1;
    name: string;
    contentHash: string;
    prompt?: string;
    invocationEventId?: string;
    sourceMessageId?: string;
    invokedAt?: string;
}): {
    checksum: string;
    updatedAt: string;
    schema: "ccm-main-agent-dynamic-context-evidence-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    latestManifest: MainAgentPostCompactRestoreManifest | null;
    contentStored: false;
};
export declare function recordMainAgentLoadedMcpSchemas(input: {
    identity: MainAgentContinuityIdentityV1;
    tools: any[];
    loadSource?: "tool_search" | "always_load";
    loadEventId?: string;
    loadedAt?: string;
}): {
    schema: "ccm-main-agent-dynamic-context-evidence-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: any;
    loadedMcpSchemas: any;
    latestManifest: any;
    updatedAt: string;
    contentStored: false;
    checksum: string;
};
export declare function recordMainAgentToolContinuityFromResult(input: {
    identity?: MainAgentContinuityIdentityV1 | null;
    requestName: string;
    requestArguments?: any;
    rawOutput?: any;
    loadedTools?: any[];
    eventId?: string;
    sourceMessageId?: string;
}): {
    schema: "ccm-main-agent-dynamic-context-evidence-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: any;
    loadedMcpSchemas: any;
    latestManifest: any;
    updatedAt: string;
    contentStored: false;
    checksum: string;
};
export declare function buildMainAgentPostCompactRestoreManifest(input: {
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    scope: ToolScope;
}): {
    checksum: string;
    schema: "ccm-main-agent-post-compact-restore-manifest-v3";
    version: 3;
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    catalogRevision: string;
    authorizationChecksum: string;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    createdAt: string;
    contextSourceManifest: {
        checksum: string;
        schema: "ccm-context-source-restore-manifest-reference-v1";
        storeChecksum: string;
        receiptIds: string[];
        receiptCount: number;
        contentStored: false;
    };
    contentStored: false;
};
export declare function persistMainAgentPostCompactRestoreManifest(manifest: MainAgentPostCompactRestoreManifest): {
    checksum: string;
    updatedAt: string;
    schema: "ccm-main-agent-dynamic-context-evidence-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    latestManifest: MainAgentPostCompactRestoreManifest | null;
    contentStored: false;
};
export declare function validateMainAgentPostCompactRestoreManifest(value: any, expected?: Partial<MainAgentContinuityIdentityV1> & {
    boundaryGeneration?: number;
}): {
    valid: boolean;
    issues: string[];
    identity: MainAgentContinuityIdentityV1;
};
export declare function restoreMainAgentPostCompactContext(input: {
    identity: MainAgentContinuityIdentityV1;
    scope: ToolScope;
    manifest?: MainAgentPostCompactRestoreManifest | null;
    maxPerSkillTokens?: number;
    maxTotalSkillTokens?: number;
    maxTotalMcpSchemaTokens?: number;
}): {
    manifest: MainAgentPostCompactRestoreManifest;
    loadedToolNames: string[];
    skillAttachments: any[];
    renderedSkillAttachments: string;
    receipt: PostCompactToolRestoreReceiptV2;
};
export declare function clearMainAgentPostCompactContinuity(identityInput: MainAgentContinuityIdentityV1): {
    deleted: boolean;
    sourceDeleted: boolean;
    identity: MainAgentContinuityIdentityV1;
};
export declare function runMainAgentPostCompactContinuitySelfTest(): {
    pass: boolean;
    manifest: {
        checksum: string;
        schema: "ccm-main-agent-post-compact-restore-manifest-v3";
        version: 3;
        identity: MainAgentContinuityIdentityV1;
        boundaryGeneration: number;
        catalogRevision: string;
        authorizationChecksum: string;
        invokedSkills: InvokedSkillContinuityV1[];
        loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
        createdAt: string;
        contextSourceManifest: {
            checksum: string;
            schema: "ccm-context-source-restore-manifest-reference-v1";
            storeChecksum: string;
            receiptIds: string[];
            receiptCount: number;
            contentStored: false;
        };
        contentStored: false;
    };
    restored: PostCompactToolRestoreReceiptV2;
    legacyRestored: PostCompactToolRestoreReceiptV2;
    isolated: PostCompactToolRestoreReceiptV2;
    budgeted: PostCompactToolRestoreReceiptV2;
    changedSkill: PostCompactToolRestoreReceiptV2;
    changedSchema: PostCompactToolRestoreReceiptV2;
    revoked: PostCompactToolRestoreReceiptV2;
};
