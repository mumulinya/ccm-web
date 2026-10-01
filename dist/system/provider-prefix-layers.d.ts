export type ProviderPrefixLayerSummary = {
    workspacePublicChecksum: string;
    scopePrivateChecksum: string;
    workspacePublicBytes: number;
    scopePrivateBytes: number;
    firstChangedSegment: string | null;
    reuseClassification: string;
    contentStored: false;
};
/** Classifies only explicitly tagged prompt blocks. Dynamic/session content is
 * deliberately excluded from the public layer and can never be inferred from
 * keywords or arbitrary business fields. */
export declare function summarizeProviderPrefixLayers(messages?: any[], previous?: ProviderPrefixLayerSummary | null): ProviderPrefixLayerSummary;
