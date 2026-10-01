export declare const TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA: "ccm-test-agent-runtime-fingerprint-v1";
export declare function runtimeFingerprintChecksum(value: any): string;
export type TestAgentRuntimeFingerprint = {
    schema: typeof TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA;
    version: 1;
    capturedAt: string;
    workDir: string;
    runtime: {
        node: string;
        platform: string;
        arch: string;
    };
    files: Array<{
        path: string;
        checksum: string;
    }>;
    target: {
        url: string;
        providerFamily: string;
        providerCapabilityVersion: string;
    };
    isolation: {
        mode: string;
        environmentId: string;
        testTenantReferenceChecksum: string;
        credentialReferenceChecksum: string;
    };
    checksum: string;
    contentStored: false;
};
export declare function captureTestAgentRuntimeFingerprint(input?: {
    workDir?: string;
    targetUrl?: string;
    providerFamily?: string;
    providerCapabilityVersion?: string;
    runtimeFiles?: string[];
    isolationMode?: string;
    isolationEnvironmentId?: string;
    testTenantReference?: string;
    credentialReference?: string;
}): TestAgentRuntimeFingerprint;
export declare function runtimeFingerprintChanged(before: any, after: any): boolean;
export declare function readTestAgentRuntimeFingerprint(value: any): TestAgentRuntimeFingerprint | null;
export declare function runTestAgentRuntimeFingerprintSelfTest(): {
    pass: boolean;
    fingerprint: TestAgentRuntimeFingerprint;
};
