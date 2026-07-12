export declare function runTestAgentInvocationSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    requestContract?: undefined;
    passed?: undefined;
    passedContract?: undefined;
    failed?: undefined;
    failedContract?: undefined;
    blocked?: undefined;
    blockedContract?: undefined;
    rejectedEnvelope?: undefined;
    rejectedEnvelopeContract?: undefined;
    rejectedPayload?: undefined;
    rejectedPayloadContract?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    requestContract: import("./contract").TestAgentInvocationContractValidation;
    passed: import("./invocation").TestAgentInvocationResult;
    passedContract: import("./contract").TestAgentInvocationContractValidation;
    failed: import("./invocation").TestAgentInvocationResult;
    failedContract: import("./contract").TestAgentInvocationContractValidation;
    blocked: import("./invocation").TestAgentInvocationResult;
    blockedContract: import("./contract").TestAgentInvocationContractValidation;
    rejectedEnvelope: import("./invocation").TestAgentInvocationResult;
    rejectedEnvelopeContract: import("./contract").TestAgentInvocationContractValidation;
    rejectedPayload: import("./invocation").TestAgentInvocationResult;
    rejectedPayloadContract: import("./contract").TestAgentInvocationContractValidation;
    availability?: undefined;
    reason?: undefined;
}>;
