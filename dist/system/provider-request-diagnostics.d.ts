import { compareProviderWire, comparePublicProviderWire, type WireSnapshot } from './provider-wire-evidence';
export type RequestAttribution = {
    purpose: string;
    requestClass: 'foreground_main' | 'auxiliary' | 'probe' | 'unattributed';
    scope?: string;
    scopeId?: string;
    exactSessionId?: string;
    turnId?: string;
    trace_id?: string;
};
type Attempt = {
    schema: 'ccm-provider-request-attempt-v1';
    requestId: string;
    logicalCallId: string;
    attempt: number;
    attribution: RequestAttribution;
    protocol: string;
    model: string;
    startedAt: string;
    status: string;
    snapshot: WireSnapshot;
    wireReuseEvidence: ReturnType<typeof compareProviderWire> & {
        publicPrefix?: ReturnType<typeof comparePublicProviderWire>;
        crossSessionComparable?: boolean;
        comparedRequestId?: string;
        comparedRequestStatus?: string;
        comparedProtocol?: string;
        comparedModel?: string;
        comparedRoute?: string;
        comparedPurpose?: string;
    };
    [key: string]: any;
};
export declare function withRequestDiagnostics<T extends object>(options: T, config?: any): T;
export declare function mainRequestAttribution(input: any): RequestAttribution;
export declare function startProviderAttempt(options: any, config: any, body: any, protocol: string, endpoint?: any): Attempt;
export declare function auditedProviderFetch(fetcher: (endpoint: any, init: any) => Promise<any>, endpoint: any, init: any, meta?: {
    options: any;
    config: any;
    protocol: string;
}): Promise<any>;
export declare function providerAttemptResponse(options: any, response: any): void;
export declare function providerAttemptUsage(options: any, usage: any): void;
/**
 * Read the wire comparison captured when the active physical attempt started.
 * The model response is finalized after this point, so callers that classify
 * Provider reuse must use this snapshot rather than reconstructing a second
 * comparison from the completion receipt.
 */
export declare function providerAttemptWireReuseEvidence(options: any): any;
export declare function finishProviderAttempt(options: any, result: any): any;
export declare function readProviderRequestDiagnostics(binding?: any): {
    recentRequests: {
        wireLayoutVersion: string;
        publicPrefixChecksum: string;
        publicInstructionChecksum: string;
        publicInstructionTokens: number;
        publicInstructionBlockCount: number;
        publicPrefixContiguous: boolean;
        publicToolProfileChecksum: string;
        publicToolSchemaChecksum: string;
        publicToolSchemaVersion: string;
        publicProfileVersion: string;
        crossSessionComparable: boolean;
        firstPrivateDifference: string;
        routeKeyChecksum: string;
        endpointFingerprint: string;
        providerRouteFingerprint: string;
        providerNodeFingerprint: string;
        providerRouteHeaderCount: number;
        schema: "ccm-provider-request-attempt-v1";
        requestId: string;
        logicalCallId: string;
        attempt: number;
        attribution: RequestAttribution;
        protocol: string;
        model: string;
        startedAt: string;
        status: string;
        wireReuseEvidence: ReturnType<typeof compareProviderWire> & {
            publicPrefix?: ReturnType<typeof comparePublicProviderWire>;
            crossSessionComparable?: boolean;
            comparedRequestId?: string;
            comparedRequestStatus?: string;
            comparedProtocol?: string;
            comparedModel?: string;
            comparedRoute?: string;
            comparedPurpose?: string;
        };
    }[];
    adjacentComparisons: {
        currentRequestId: string;
        previousRequestId: string;
        currentStartedAt: string;
        previousStartedAt: string;
        currentStatus: string;
        previousStatus: any;
        comparisonProtocol: any;
        comparisonModel: any;
        comparisonRouteValidated: boolean;
        comparisonPurposeValidated: boolean;
        comparisonValidated: boolean;
        sameLogicalCall: boolean;
        comparison: any;
        firstChangedSegment: any;
        matchingPrefixBytesLowerBound: number;
        matchingPrefixTokensEstimate: number;
        currentCacheReadInputTokens: any;
        previousCacheReadInputTokens: any;
        currentProviderCacheReuseClass: any;
        previousProviderCacheReuseClass: any;
        currentProviderNodeFingerprint: string;
        previousProviderNodeFingerprint: string;
        providerNodeChanged: boolean;
        currentBreakpointChecksums: any;
        previousBreakpointChecksums: any;
        contentStored: boolean;
    }[];
    requestGroups: {
        main: {
            attempts: number;
            logicalCalls: number;
            reportedAttempts: number;
            totalInputTokens: number;
            cacheReadInputTokens: number;
            fullReuseRequests: number;
            partialReuseRequests: number;
            baselineOnlyRequests: number;
            missRequests: number;
        };
        auxiliary: {
            attempts: number;
            logicalCalls: number;
            reportedAttempts: number;
            totalInputTokens: number;
            cacheReadInputTokens: number;
            fullReuseRequests: number;
            partialReuseRequests: number;
            baselineOnlyRequests: number;
            missRequests: number;
        };
        probe: {
            attempts: number;
            logicalCalls: number;
            reportedAttempts: number;
            totalInputTokens: number;
            cacheReadInputTokens: number;
            fullReuseRequests: number;
            partialReuseRequests: number;
            baselineOnlyRequests: number;
            missRequests: number;
        };
        unattributed: {
            attempts: number;
            logicalCalls: number;
            reportedAttempts: number;
            totalInputTokens: number;
            cacheReadInputTokens: number;
            fullReuseRequests: number;
            partialReuseRequests: number;
            baselineOnlyRequests: number;
            missRequests: number;
        };
    };
    contentStored: boolean;
};
export {};
