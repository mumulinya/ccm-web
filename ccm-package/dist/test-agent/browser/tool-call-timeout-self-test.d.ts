import { TestAgentReport } from "../types";
export declare function runTestAgentBrowserToolCallTimeoutSelfTest(): Promise<{
    pass: false;
    directDurationMs: number;
    directRecords: import("..").BrowserToolCallRecord[];
    preflightDurationMs: number;
    mcpPreflight: import("./provider-types").BrowserProviderAvailability;
    agentDurationMs: number;
    report: TestAgentReport;
    summary: import("..").BrowserToolCallTimeoutSummary;
    reportContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    artifactVerification: import("../artifact-verifier").TestAgentArtifactVerification;
    missingAbortContract: import("..").TestAgentReportContractValidation;
    falsePassContract: import("..").TestAgentReportContractValidation;
    tamperedVerification: import("../artifact-verifier").TestAgentArtifactVerification;
}>;
