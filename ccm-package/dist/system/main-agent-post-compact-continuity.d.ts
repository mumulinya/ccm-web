import { type ToolScope } from "../tools/tool-manager";
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
    schema: "ccm-main-agent-dynamic-context-evidence-v1";
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    latestManifest: MainAgentPostCompactRestoreManifestV1 | null;
};
export declare function recordMainAgentLoadedMcpSchemas(input: {
    identity: MainAgentContinuityIdentityV1;
    tools: any[];
    loadSource?: "tool_search" | "always_load";
    loadEventId?: string;
    loadedAt?: string;
}): {
    schema: "ccm-main-agent-dynamic-context-evidence-v1";
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: any;
    loadedMcpSchemas: any;
    latestManifest: any;
    updatedAt: string;
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
    schema: "ccm-main-agent-dynamic-context-evidence-v1";
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: any;
    loadedMcpSchemas: any;
    latestManifest: any;
    updatedAt: string;
    checksum: string;
};
export declare function buildMainAgentPostCompactRestoreManifest(input: {
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    scope: ToolScope;
}): {
    checksum: string;
    schema: "ccm-main-agent-post-compact-restore-manifest-v1";
    version: 1;
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    catalogRevision: string;
    authorizationChecksum: string;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    createdAt: string;
};
export declare function persistMainAgentPostCompactRestoreManifest(manifest: MainAgentPostCompactRestoreManifestV1): {
    checksum: string;
    updatedAt: string;
    schema: "ccm-main-agent-dynamic-context-evidence-v1";
    identity: MainAgentContinuityIdentityV1;
    invokedSkills: InvokedSkillContinuityV1[];
    loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
    latestManifest: MainAgentPostCompactRestoreManifestV1 | null;
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
    manifest?: MainAgentPostCompactRestoreManifestV1 | null;
    maxPerSkillTokens?: number;
    maxTotalSkillTokens?: number;
    maxTotalMcpSchemaTokens?: number;
}): {
    manifest: MainAgentPostCompactRestoreManifestV1;
    loadedToolNames: string[];
    skillAttachments: any[];
    renderedSkillAttachments: string;
    receipt: PostCompactToolRestoreReceiptV1;
};
export declare function clearMainAgentPostCompactContinuity(identityInput: MainAgentContinuityIdentityV1): {
    deleted: boolean;
    identity: MainAgentContinuityIdentityV1;
};
export declare function runMainAgentPostCompactContinuitySelfTest(): {
    pass: boolean;
    manifest: {
        checksum: string;
        schema: "ccm-main-agent-post-compact-restore-manifest-v1";
        version: 1;
        identity: MainAgentContinuityIdentityV1;
        boundaryGeneration: number;
        catalogRevision: string;
        authorizationChecksum: string;
        invokedSkills: InvokedSkillContinuityV1[];
        loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
        createdAt: string;
    };
    restored: PostCompactToolRestoreReceiptV1;
    isolated: PostCompactToolRestoreReceiptV1;
    budgeted: PostCompactToolRestoreReceiptV1;
    changedSkill: PostCompactToolRestoreReceiptV1;
    changedSchema: PostCompactToolRestoreReceiptV1;
};
