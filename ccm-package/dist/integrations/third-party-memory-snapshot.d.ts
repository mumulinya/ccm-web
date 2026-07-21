export declare const THIRD_PARTY_MEMORY_SNAPSHOT_SCHEMA = "ccm-third-party-memory-snapshot-v1";
export declare const THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES: string[];
export declare function validateThirdPartyMemorySnapshot(snapshot: any): {
    valid: boolean;
    issues: string[];
};
export declare function createThirdPartyMemorySnapshot(input: any): any;
export declare function loadThirdPartyMemorySnapshot(snapshotId: string, expectedChecksum?: string): any;
export declare function getThirdPartyMemoryManifest(context: any): {
    schema: string;
    snapshotId: any;
    snapshotChecksum: any;
    mode: any;
    deliveryMode: any;
    rehydrationRequired: any;
    rehydrationReason: any;
    boundaryGeneration: any;
    nativeGeneration: any;
    requiredHydrationTokens: any;
    messageCursor: any;
    requiredSegmentIds: any;
    requiredMemoryItemIds: any;
    sessionSegments: any;
    memoryItems: any;
};
export declare function readThirdPartySessionContext(context: any, input?: any): {
    success: boolean;
    snapshotId: any;
    snapshotChecksum: any;
    view: string;
    cursor: number;
    nextCursor: number;
    hasMore: boolean;
    tokens: number;
    segments: any[];
};
export declare function readThirdPartyMemoryItems(context: any, ids: any[]): {
    success: boolean;
    snapshotId: any;
    snapshotChecksum: any;
    totalTokens: any;
    items: any[];
};
export declare function storeThirdPartyMemorySearchItems(context: any, itemsInput: any[]): {
    id: string;
    kind: string;
    source: string;
    tokens: number;
    stale: boolean;
    requiresVerification: boolean;
    preview: any;
}[];
export declare function inspectThirdPartyMemoryHydration(context: any): {
    ready: boolean;
    manifestRead: boolean;
    missingSegmentIds: any;
    missingMemoryItemIds: any;
    snapshot: any;
    ledger: any;
};
export declare function acknowledgeThirdPartyMemoryHydration(context: any): {
    snapshot: any;
    ledger: any;
};
export declare function reportThirdPartyMemoryUsage(context: any, input?: any): {
    checksum: string;
    schema: string;
    version: number;
    id: string;
    at: string;
    snapshotId: any;
    snapshotChecksum: any;
    identity: any;
    usedIds: string[];
    ignoredIds: string[];
    verifiedIds: string[];
    conflicts: any;
    acceptedCandidates: any[];
    rejectedCandidates: any[];
    status: string;
};
export declare function readThirdPartyMemoryUsageReports(snapshotId: string, snapshotChecksum?: string): any[];
export declare function mergeThirdPartyMemoryUsageIntoReceipt(receiptInput: any, snapshotId: string, snapshotChecksum?: string): any;
export declare function buildThirdPartyMemoryBootstrap(snapshot: any, challenge: any): string;
