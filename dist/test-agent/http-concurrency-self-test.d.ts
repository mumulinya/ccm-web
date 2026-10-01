export declare function runTestAgentHttpConcurrencySelfTest(): Promise<{
    pass: boolean;
    passingReport: import("./types-report").TestAgentReport;
    brokenReport: import("./types-report").TestAgentReport;
    blockedReport: import("./types-report").TestAgentReport;
    plan: import("./execution-plan").TestAgentExecutionPlan;
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    reportTamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    statusTamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    verdictTamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    invalidContracts: import("./contract").TestAgentWorkOrderContractValidation[];
}>;
