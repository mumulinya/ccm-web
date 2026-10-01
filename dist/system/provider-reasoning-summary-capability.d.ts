export type ProviderReasoningSummaryStatus = "confirmed" | "unsupported" | "unproven";
export declare function readProviderReasoningSummaryCapability(config: any): {
    identityChecksum: string;
    status: ProviderReasoningSummaryStatus;
    evidence: any;
    contentStored: boolean;
};
export declare function recordProviderReasoningSummaryCapability(config: any, status: "confirmed" | "unsupported", reason: any): any;
export declare function providerReasoningSummaryAllowed(config: any): boolean;
export declare function isProviderReasoningSummaryFieldRejection(status: number, detail: any): boolean;
