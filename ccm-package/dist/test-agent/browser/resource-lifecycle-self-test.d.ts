import { TestAgentReport } from "../types";
export declare function runTestAgentBrowserResourceLifecycleSelfTest(): Promise<{
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
    failedReport?: undefined;
    mcpReport?: undefined;
    reportContract?: undefined;
    failedContract?: undefined;
    mcpContract?: undefined;
    verdictContract?: undefined;
    artifactVerification?: undefined;
    openSummary?: undefined;
    cleanupFailedSummary?: undefined;
    foreignPlanSummary?: undefined;
    duplicateSummary?: undefined;
    tamperedArtifactVerification?: undefined;
} | {
    pass: boolean;
    report: TestAgentReport;
    failedReport: TestAgentReport;
    mcpReport: TestAgentReport;
    reportContract: import("..").TestAgentReportContractValidation;
    failedContract: import("..").TestAgentReportContractValidation;
    mcpContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    artifactVerification: import("../artifact-verifier").TestAgentArtifactVerification;
    openSummary: import("..").BrowserResourceLifecycleSummary;
    cleanupFailedSummary: import("..").BrowserResourceLifecycleSummary;
    foreignPlanSummary: import("..").BrowserResourceLifecycleSummary;
    duplicateSummary: import("..").BrowserResourceLifecycleSummary;
    tamperedArtifactVerification: import("../artifact-verifier").TestAgentArtifactVerification;
    availability?: undefined;
    reason?: undefined;
}>;
