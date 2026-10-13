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
/** Layer checksums include appended runtime controls. Only encoded tools can
 * prove a tool contract change; private checksum changes alone cannot. */
export declare function compareProviderPrefixLayers(previous: ProviderPrefixLayerSummary | undefined, current: ProviderPrefixLayerSummary, evidence: {
    fullPrefixPreserved: boolean;
    toolDefinitionChanged: boolean;
}): {
    firstChangedSegment: string;
    reuseClassification: string;
    workspacePublicChecksum: string;
    scopePrivateChecksum: string;
    workspacePublicBytes: number;
    scopePrivateBytes: number;
    contentStored: false;
};
