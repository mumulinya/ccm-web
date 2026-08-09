export declare function providerNativeToolIdentity(config: any, family: string): {
    identityChecksum: string;
    endpoint: string;
    protocol: string;
    providerFamily: string;
    model: string;
};
export declare function recordProviderNativeToolCapability(config: any, family: string, status: "confirmed" | "unsupported", reason: any): {
    status: "confirmed" | "unsupported";
    reason: string;
    checkedAt: string;
    expiresAt: string;
    contentStored: boolean;
    identityChecksum: string;
    endpoint: string;
    protocol: string;
    providerFamily: string;
    model: string;
};
export declare function readProviderNativeToolCapability(config: any, family?: string): {
    official: boolean;
    status: any;
    checkedAt: any;
    expiresAt: any;
    contentStored: boolean;
    identityChecksum: string;
    endpoint: string;
    protocol: string;
    providerFamily: string;
    model: string;
}[];
export declare function providerNativeToolReferenceAllowed(config: any): boolean;
