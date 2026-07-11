export declare function runTestAgentAcceptanceEvidenceGateSelfTest(): Promise<{
    pass: boolean;
    weakReport: import("./types").TestAgentReport;
    directReport: import("./types").TestAgentReport;
    incompleteReport: import("./types").TestAgentReport;
    failedReport: import("./types").TestAgentReport;
    noCriteriaReport: import("./types").TestAgentReport;
    directVerdict: any;
    reportTamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    verdictTamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    cliSummary: string;
    markdown: string;
}>;
