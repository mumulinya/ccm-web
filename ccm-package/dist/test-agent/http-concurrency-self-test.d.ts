export declare function runTestAgentHttpConcurrencySelfTest(): Promise<{
    pass: boolean;
    passingReport: import("./types").TestAgentReport;
    brokenReport: import("./types").TestAgentReport;
    blockedReport: import("./types").TestAgentReport;
    plan: import("./execution-plan").TestAgentExecutionPlan;
    artifactVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    reportTamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    statusTamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    verdictTamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    invalidContracts: import("./contract").TestAgentWorkOrderContractValidation[];
}>;
