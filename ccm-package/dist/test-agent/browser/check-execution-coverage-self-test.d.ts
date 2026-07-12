export declare function runTestAgentBrowserCheckExecutionCoverageSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    completeCoverage: import("..").BrowserCheckExecutionCoverageSummary;
    missing: import("..").BrowserCheckExecutionCoverageSummary;
    duplicate: import("..").BrowserCheckExecutionCoverageSummary;
    stability: import("..").BrowserCheckExecutionCoverageSummary;
    reportContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    excessiveRunsContract: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier").TestAgentArtifactVerification;
    tamperedMissingContract: import("..").TestAgentReportContractValidation;
    tamperedMissingVerification: import("../artifact-verifier").TestAgentArtifactVerification;
    tamperedDuplicateVerification: import("../artifact-verifier").TestAgentArtifactVerification;
}>;
