/** Only protocol-owned cache fields are inspected; tool arguments and text are opaque. */
export declare function actualProviderCacheFields(body: any): {
    requestFields: string[];
    requestPatchApplied: boolean;
    explicitBreakpointCount: number;
    promptCacheKeyPresent: boolean;
    promptCacheKeyChecksum: string;
    optionsChecksum: string;
    retention: any;
    evidenceSource: string;
    contentStored: boolean;
};
