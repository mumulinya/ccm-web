import { type ProviderPrefixLayerSummary } from './provider-prefix-layers';
export type WirePart = {
    kind: string;
    checksum: string;
    bytes: number;
    estimatedTokens: number;
};
export type WireSnapshot = {
    version: 2;
    protocol: string;
    layoutVersion: string;
    requestBytes: number;
    parts: WirePart[];
    cachePrefixParts?: WirePart[];
    publicParts?: WirePart[];
    prefixLayers?: ProviderPrefixLayerSummary;
    publicPrefixChecksum?: string;
    publicInstructionChecksum?: string;
    publicInstructionTokens?: number;
    publicInstructionBlockCount?: number;
    publicPrefixContiguous?: boolean;
    publicToolProfileChecksum?: string;
    publicToolSchemaChecksum?: string;
    publicToolSchemaVersion?: string;
    publicProfileVersion?: string;
    crossSessionComparable?: boolean;
    contentStored: false;
};
/** Inspect the final encoded body, without storing its content or modifying it. */
export declare function snapshotProviderWire(body: any, protocol: string, layoutVersion?: string, sourceMessages?: any[]): WireSnapshot;
export declare function compareProviderWire(previous: WireSnapshot | undefined, current: WireSnapshot): {
    comparison: string;
    matchedParts: number;
    firstDifferencePart: string;
    matchingPrefixBytesLowerBound: number;
    matchingPrefixTokensEstimate: number;
    requestBytes: number;
    inputBreakdown: {
        totalFragmentBytes: number;
        totalTokensEstimate: number;
        confirmedPrefixBytes: number;
        confirmedPrefixTokensEstimate: number;
        appendedBytes: number;
        appendedTokensEstimate: number;
        changedOrUnverifiedBytes: number;
        changedOrUnverifiedTokensEstimate: number;
        estimationOnly: boolean;
        contentStored: boolean;
    };
    prefixLayers: {
        firstChangedSegment: string;
        reuseClassification: string;
        workspacePublicChecksum: string;
        scopePrivateChecksum: string;
        workspacePublicBytes: number;
        scopePrivateBytes: number;
        contentStored: false;
    };
    firstChangedSegment: string;
    firstDivergenceKind: string;
    estimationOnly: boolean;
    providerReuseReason: string;
    contentStored: boolean;
};
/** Only explicitly tagged public blocks that still match the encoded request qualify. */
export declare function publicProviderWireParts(body: any, sourceMessages?: any[]): WirePart[];
export declare function comparePublicProviderWire(previous: WireSnapshot | undefined, current: WireSnapshot): {
    comparison: string;
    firstChangedSegment: string;
    firstDivergenceKind: string;
    matchedParts: number;
    matchingPrefixBytesLowerBound: number;
    matchingPrefixTokensEstimate: number;
    estimationOnly: boolean;
    contentStored: boolean;
};
