export declare function runTestAgentBrowserAuthenticationContractSelfTest(): Promise<{
    pass: boolean;
    validation: import("..").TestAgentWorkOrderContractValidation;
    normalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    plan: import("..").TestAgentExecutionPlan;
    invalidValidation: import("..").TestAgentWorkOrderContractValidation;
    invalidNormalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
}>;
export declare function runTestAgentPlaywrightAuthenticationSelfTest(): Promise<{
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
    validation?: undefined;
    plan?: undefined;
    report?: undefined;
    reportValidation?: undefined;
    artifactVerification?: undefined;
    missingReport?: undefined;
    tamperedContract?: undefined;
    tamperedVerification?: undefined;
    textEvidenceSafe?: undefined;
} | {
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
    validation: import("..").TestAgentWorkOrderContractValidation;
    plan: import("..").TestAgentExecutionPlan;
    report: import("..").TestAgentReport;
    reportValidation: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    missingReport: import("..").TestAgentReport;
    tamperedContract: import("..").TestAgentReportContractValidation;
    tamperedVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    textEvidenceSafe: boolean;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightMultiSessionAuthenticationSelfTest(): Promise<{
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
    validation?: undefined;
    plan?: undefined;
    report?: undefined;
    reportValidation?: undefined;
    artifactVerification?: undefined;
    textEvidenceSafe?: undefined;
} | {
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
    validation: import("..").TestAgentWorkOrderContractValidation;
    plan: import("..").TestAgentExecutionPlan;
    report: import("..").TestAgentReport;
    reportValidation: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    textEvidenceSafe: boolean;
    reason?: undefined;
}>;
