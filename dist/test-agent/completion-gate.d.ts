export type TestAgentCompletionGateCheck = {
    id: string;
    pass: boolean;
    status: "passed" | "failed" | "missing" | "waived";
    detail: string;
};
export type TestAgentCompletionGateV2 = {
    schema: "ccm-test-agent-completion-gate-v2";
    version: 2;
    taskId: string;
    workItemId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    sourceFingerprint: string;
    runtimeFingerprint: string;
    policyChecksum: string;
    checks: TestAgentCompletionGateCheck[];
    pass: boolean;
    blockedReasons: string[];
    decidedAt: string;
    contentStored: false;
    checksum: string;
};
export declare function buildTestAgentCompletionGate(input: {
    task?: any;
    workItemId?: string;
    exactSessionId?: string;
    generation?: number;
    attempt?: number;
    policy?: any;
    review?: any;
    reviewPolicy?: any;
    spotCheck?: any;
}): TestAgentCompletionGateV2;
export declare function validateTestAgentCompletionGate(value: any): {
    valid: boolean;
    reason: string;
};
export declare function publicTestAgentVerificationHardening(value: any): {
    schema: string;
    pass: boolean;
    policyChecksum: string;
    sourceFingerprint: string;
    runtimeFingerprint: string;
    checks: any;
    blockedReasons: any;
    metrics: {
        schema: string;
        counters: {
            [k: string]: number;
        };
        contentStored: boolean;
    };
    decidedAt: string;
    contentStored: boolean;
    checksum: string;
};
export declare function runTestAgentCompletionGateSelfTest(): {
    pass: boolean;
    gate: TestAgentCompletionGateV2;
};
