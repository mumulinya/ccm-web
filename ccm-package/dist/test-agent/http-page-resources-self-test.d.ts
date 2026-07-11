export declare function runTestAgentHttpPageResourcesSelfTest(): Promise<{
    pass: boolean;
    passingReport: import("./types").TestAgentReport;
    failingReport: import("./types").TestAgentReport;
    extracted: import("./http-page-resources").HttpPageResourceCandidate[];
    artifactVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    failingArtifactVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    tamperedVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    requests: {
        [k: string]: number;
    };
}>;
