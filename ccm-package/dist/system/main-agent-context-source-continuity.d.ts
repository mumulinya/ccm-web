import type { MainAgentContinuityIdentityV1 } from "./main-agent-post-compact-continuity";
import { type AgentKnowledgeAccessContext } from "../modules/knowledge/knowledge-access";
import { type SharedFileScope } from "../modules/tools/shared-files-v2";
export type ContextSourceKind = "knowledge" | "shared_file";
export type ContextSourceState = "discovered" | "read" | "injected" | "used" | "ignored" | "promoted" | "restored";
export type ContextSourceMemoryKind = "project_durable_memory" | "group_typed_memory";
export type ContextSourceReference = {
    receiptId?: string;
    sourceKind: ContextSourceKind;
    sourceId: string;
    chunkIds?: string[];
    revision?: string;
    checksum?: string;
};
export type ContextSourcePromotionEvidence = {
    memoryKind: ContextSourceMemoryKind;
    memoryId: string;
    admissionChecksum: string;
    sourceRefChecksum: string;
    promotedAt: string;
};
export type ContextSourceReceiptV2 = {
    schema: "ccm-context-source-read-receipt-v2";
    version: 2;
    receiptId: string;
    identity: MainAgentContinuityIdentityV1;
    boundaryGeneration: number;
    sourceKind: ContextSourceKind;
    sourceId: string;
    documentName: string;
    chunkIds: string[];
    headings: string[];
    revision: string;
    checksum: string;
    indexGeneration: string;
    scopeChecksum: string;
    queryChecksum: string;
    tokenCount: number;
    state: ContextSourceState;
    discoveredAt: string;
    readAt: string;
    injectedAt: string;
    usedAt: string;
    promotedAt: string;
    promotionEvidence: ContextSourcePromotionEvidence[];
    restoredAt: string;
    injected: boolean;
    used: boolean;
    important: boolean;
    truncated: boolean;
    contentStored: false;
    checksumVersion: 1;
    receiptChecksum: string;
};
/** 兼容既有调用方类型名；读取 v1 后统一规范化为 v2。 */
export type ContextSourceReceiptV1 = ContextSourceReceiptV2;
export type ContextSourceRestoreReceiptV1 = {
    schema: "ccm-post-compact-source-restore-receipt-v1";
    version: 1;
    identity: MainAgentContinuityIdentityV1;
    status: "not_required" | "restored" | "partial" | "rejected";
    budget: {
        maxPerItemTokens: number;
        maxTotalTokens: number;
        hydrationTargetTokens: number;
        restoredTokens: number;
        remainingSafeTokens: number;
    };
    restored: Array<{
        sourceKind: ContextSourceKind;
        sourceId: string;
        documentName: string;
        tokens: number;
        truncated: boolean;
        drift: "none" | "revision" | "checksum" | "index_generation";
    }>;
    dropped: Array<{
        sourceKind: ContextSourceKind;
        sourceId: string;
        documentName: string;
        reason: string;
    }>;
    restoredAt: string;
    contentStored: false;
    checksum: string;
};
export type ContextSourceBudgetReceipt = {
    catalogTargetTokens: number;
    catalogUsedTokens: number;
    hydrationTargetTokens: number;
    hydrationUsedTokens: number;
    knowledgeTokens: number;
    sharedFileTokens: number;
    restoredTokens: number;
    remainingSafeTokens: number;
};
export declare function calculateContextSourceBudget(input: {
    contextWindow: number;
    catalogPercent?: number;
    hydrationPercent?: number;
    remainingSafeTokens?: number;
    catalogUsedTokens?: number;
    hydrationUsedTokens?: number;
    knowledgeTokens?: number;
    sharedFileTokens?: number;
    restoredTokens?: number;
}): ContextSourceBudgetReceipt;
export declare function recordContextSourceReceipts(identityInput: MainAgentContinuityIdentityV1, inputs: any[], budget?: Partial<ContextSourceBudgetReceipt>): {
    checksum: string;
    updatedAt: string;
    contentStored: false;
    schema: "ccm-context-source-continuity-store-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    receipts: ContextSourceReceiptV1[];
    latestRestore: ContextSourceRestoreReceiptV1 | null;
    budget: ContextSourceBudgetReceipt;
};
export declare function recordSharedFileProjection(identity: MainAgentContinuityIdentityV1, projection: any, budget?: Partial<ContextSourceBudgetReceipt>): {
    checksum: string;
    updatedAt: string;
    contentStored: false;
    schema: "ccm-context-source-continuity-store-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    receipts: ContextSourceReceiptV1[];
    latestRestore: ContextSourceRestoreReceiptV1 | null;
    budget: ContextSourceBudgetReceipt;
};
export declare function markContextSourcesFromOutput(identityInput: MainAgentContinuityIdentityV1, output: string, _legacyPromoted?: boolean): {
    checksum: string;
    updatedAt: string;
    contentStored: false;
    schema: "ccm-context-source-continuity-store-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    receipts: ContextSourceReceiptV1[];
    latestRestore: ContextSourceRestoreReceiptV1 | null;
    budget: ContextSourceBudgetReceipt;
};
export declare function extractStructuredContextSourceRefs(...values: any[]): ContextSourceReference[];
export declare function promoteContextSourceReceipts(input: {
    identity: MainAgentContinuityIdentityV1;
    sourceRefs: any[];
    memoryKind: ContextSourceMemoryKind;
    memoryId: string;
    admissionChecksum: string;
}): {
    matched: number;
    alreadyPromoted: number;
    unmatched: ContextSourceReference[];
    storeChecksum: string;
    contentStored: false;
};
export declare function finalizeContextSourceRun(identityInput: MainAgentContinuityIdentityV1): {
    checksum: string;
    updatedAt: string;
    contentStored: false;
    schema: "ccm-context-source-continuity-store-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    receipts: ContextSourceReceiptV1[];
    latestRestore: ContextSourceRestoreReceiptV1 | null;
    budget: ContextSourceBudgetReceipt;
};
export declare function readContextSourceContinuity(identityInput: MainAgentContinuityIdentityV1): {
    budget: ContextSourceBudgetReceipt;
    receipts: ContextSourceReceiptV2[];
    latestRestore: ContextSourceRestoreReceiptV1;
};
export declare function buildContextSourceManifestReference(identityInput: MainAgentContinuityIdentityV1): {
    checksum: string;
    schema: "ccm-context-source-restore-manifest-reference-v1";
    storeChecksum: string;
    receiptIds: string[];
    receiptCount: number;
    contentStored: false;
};
export declare function buildContextSourceCatalog(input: {
    sources: any[];
    maxTokens: number;
    explicitText?: string;
    recentReceipts?: ContextSourceReceiptV1[];
}): {
    context: string;
    usedTokens: number;
    included: number;
    deferred: number;
    total: number;
    includedSources: any[];
    checksum: string;
};
export declare function recordContextSourceCatalog(identity: MainAgentContinuityIdentityV1, catalog: any, budget?: Partial<ContextSourceBudgetReceipt>): {
    checksum: string;
    updatedAt: string;
    contentStored: false;
    schema: "ccm-context-source-continuity-store-v2";
    version: 2;
    identity: MainAgentContinuityIdentityV1;
    receipts: ContextSourceReceiptV1[];
    latestRestore: ContextSourceRestoreReceiptV1 | null;
    budget: ContextSourceBudgetReceipt;
};
export declare function restoreContextSources(input: {
    identity: MainAgentContinuityIdentityV1;
    knowledgeContext?: AgentKnowledgeAccessContext;
    explicitText?: string;
    maxPerItemTokens: number;
    maxTotalTokens: number;
    hydrationTargetTokens: number;
    remainingSafeTokens: number;
}): {
    context: string;
    receipt: ContextSourceRestoreReceiptV1;
};
export declare function listContextSourceCatalogEntries(input: {
    sharedScope?: SharedFileScope;
    sharedScopeId?: string;
    knowledgeContext?: AgentKnowledgeAccessContext;
}): {
    sourceKind: string;
    sourceId: any;
    documentName: any;
    revision: string;
    checksum: any;
    readable: boolean;
}[];
export declare function clearContextSourceContinuity(identityInput: MainAgentContinuityIdentityV1): boolean;
export declare function runContextSourceContinuitySelfTest(): {
    pass: boolean;
    budgets: ContextSourceBudgetReceipt[];
    catalog: {
        included: number;
        deferred: number;
        usedTokens: number;
    };
    continuity: {
        budget: ContextSourceBudgetReceipt;
        receipts: ContextSourceReceiptV2[];
        latestRestore: ContextSourceRestoreReceiptV1;
    };
    reference: {
        checksum: string;
        schema: "ccm-context-source-restore-manifest-reference-v1";
        storeChecksum: string;
        receiptIds: string[];
        receiptCount: number;
        contentStored: false;
    };
};
