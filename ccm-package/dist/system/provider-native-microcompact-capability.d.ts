export type ProviderNativeMicrocompactStatus = "confirmed" | "unsupported" | "unproven" | "degraded";
export declare function recordProviderNativeMicrocompactCapability(config: any, input: {
    status: ProviderNativeMicrocompactStatus;
    reason?: any;
    providerRequestId?: any;
    source?: any;
}): any;
export declare function readProviderNativeMicrocompactCapability(config: any): {
    schema: string;
    version: number;
    identity: {
        identityChecksum: string;
        interfaceFingerprint: string;
        interfaceProtocol: string;
        cacheFamily: string;
        model: string;
        inferenceBackendKind: import("./provider-cache-capability-registry").InferenceBackendKind;
    };
    status: "confirmed";
    source: string;
    evidence: any;
    contentStored: boolean;
    expired?: undefined;
} | {
    schema: string;
    version: number;
    identity: {
        identityChecksum: string;
        interfaceFingerprint: string;
        interfaceProtocol: string;
        cacheFamily: string;
        model: string;
        inferenceBackendKind: import("./provider-cache-capability-registry").InferenceBackendKind;
    };
    status: ProviderNativeMicrocompactStatus;
    source: any;
    evidence: any;
    expired: boolean;
    contentStored: boolean;
};
export declare function providerNativeMicrocompactAllowed(config: any): boolean;
export declare function isProviderNativeMicrocompactFieldRejection(error: any): boolean;
