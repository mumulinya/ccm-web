export declare function runTestAgentHttpPageResourcesSelfTest(): Promise<{
    pass: boolean;
    passingReport: import("./types-report").TestAgentReport;
    failingReport: import("./types-report").TestAgentReport;
    extracted: import("./http-page-resources").HttpPageResourceCandidate[];
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    failingArtifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    tamperedVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    requests: {
        [k: string]: number;
    };
}>;
