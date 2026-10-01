export declare function runTestAgentAcceptanceEvidenceGateSelfTest(): Promise<{
    pass: boolean;
    weakReport: import("./types-report").TestAgentReport;
    directReport: import("./types-report").TestAgentReport;
    incompleteReport: import("./types-report").TestAgentReport;
    failedReport: import("./types-report").TestAgentReport;
    noCriteriaReport: import("./types-report").TestAgentReport;
    directVerdict: any;
    reportTamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    verdictTamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    cliSummary: string;
    markdown: string;
}>;
