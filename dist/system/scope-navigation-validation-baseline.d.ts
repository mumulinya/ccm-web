export declare function captureNavigationValidationBaseline(config: any, scopeConfiguration: any, root?: string): {
    schema: string;
    codeDigest: string;
    contractVersion: string;
    configurationDigest: string;
    protocol: import("./provider-cache-protocol").CcmProviderCacheProtocol;
    scopeConfigurationDigest: string;
    contentStored: boolean;
};
export declare function captureNavigationPhaseBaseline(prepared: any, config: any): {
    scope: any;
    scopeId: any;
    contractVersion: any;
    scanFingerprint: any;
    inputDigest: any;
    encodingDigest: string;
    executionIdentity: string;
    contentStored: boolean;
};
export declare function captureNavigationScopeConfiguration(projectId: string, groupId: string): {
    projectId: string;
    groupId: string;
    group: {
        name: any;
        purpose: any;
        members: any;
    };
};
export declare function establishNavigationValidationBaseline(id: string, phase: string, value: any): void;
export declare function sealNavigationValidation(id: string, reason: string, phase?: string): void;
export declare function verifyNavigationValidationBaseline(id: string, phase: string, actual: any, stage: string): void;
export declare function checkNavigationValidationRequest(id: string, prepared: any, config: any, stage: string): void;
