import { TestAgentReport } from "../types";
export declare function runTestAgentBrowserToolEvidenceLineageSelfTest(): Promise<{
    pass: boolean;
    report: TestAgentReport;
    summary: import("..").BrowserToolEvidenceLineageSummary;
    missingSummary: import("..").BrowserToolEvidenceLineageSummary;
    foreignSummary: import("..").BrowserToolEvidenceLineageSummary;
    unscopedSummary: import("..").BrowserToolEvidenceLineageSummary;
    reportContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tamperedMissingVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tamperedTranscriptVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
}>;
