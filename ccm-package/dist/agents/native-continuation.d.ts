export declare const NATIVE_SESSION_CONTINUATION_EVIDENCE_SCHEMA = "ccm-native-session-continuation-evidence-v1";
export declare const NATIVE_CONTINUATION_CAPABILITY_PROFILE_SCHEMA = "ccm-native-continuation-capability-profile-v1";
export declare function getNativeContinuationCapabilityProfile(provider: any): {
    schema: string;
    version: number;
    provider: any;
    sessionResume: boolean;
    resumeAckPolicy: string;
    sessionIdOrigin: string;
    nativeFork: boolean;
    forkStrategy: string;
};
export declare function buildNativeSessionContinuationEvidence(input?: any): any;
export declare function verifyNativeSessionContinuationEvidence(evidence: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
