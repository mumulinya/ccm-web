export declare function runTestAgentExistingSessionContractSelfTest(): {
    pass: boolean;
    validation: import("..").TestAgentWorkOrderContractValidation;
    normalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    plan: import("..").TestAgentExecutionPlan;
    conflictValidation: import("..").TestAgentWorkOrderContractValidation;
    conflictNormalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
};
export declare function runTestAgentClaudeChromeExistingSessionSelfTest(): Promise<{
    pass: boolean;
    minimalReport: import("..").TestAgentReport;
    minimalContract: import("..").TestAgentReportContractValidation;
    minimalArtifacts: import("../artifact-verifier-core").TestAgentArtifactVerification;
    transcriptTamperedArtifacts: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tamperedContract: import("..").TestAgentReportContractValidation;
    reportTamperedArtifacts: import("../artifact-verifier-core").TestAgentArtifactVerification;
    fullReport: import("..").TestAgentReport;
    fullContract: import("..").TestAgentReportContractValidation;
    fullArtifacts: import("../artifact-verifier-core").TestAgentArtifactVerification;
    missingReport: import("..").TestAgentReport;
    minimalCalls: {
        toolName: string;
        input: Record<string, any>;
    }[];
    fullCalls: {
        toolName: string;
        input: Record<string, any>;
    }[];
}>;
export declare function runTestAgentChromeDevtoolsExistingSessionSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: {
        toolName: string;
        input: Record<string, any>;
    }[];
}>;
export declare function runTestAgentMixedBrowserProviderRoutingSelfTest(): Promise<{
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
    reportValidation?: undefined;
    directPlaywrightBlock?: undefined;
    calls?: undefined;
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
    report: import("..").TestAgentReport;
    reportValidation: import("..").TestAgentReportContractValidation;
    directPlaywrightBlock: import("..").BrowserCheckResult[];
    calls: {
        toolName: string;
        input: Record<string, any>;
    }[];
    reason?: undefined;
}>;
