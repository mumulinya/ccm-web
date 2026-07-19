import { BrowserCheckExecutionPlan, TestAgentReport } from "../types";
export declare function runTestAgentBrowserEvidenceTemporalIntegritySelfTest(): Promise<{
    pass: boolean;
    report: TestAgentReport;
    firstPlan: BrowserCheckExecutionPlan;
    secondPlan: BrowserCheckExecutionPlan;
    reportContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    crossRunSummary: import("..").BrowserEvidenceTemporalIntegritySummary;
    crossRunContract: import("..").TestAgentReportContractValidation;
    outsideReportSummary: import("..").BrowserEvidenceTemporalIntegritySummary;
    outsideReportContract: import("..").TestAgentReportContractValidation;
    durationSummary: import("..").BrowserEvidenceTemporalIntegritySummary;
    durationContract: import("..").TestAgentReportContractValidation;
    toolWindowSummary: import("..").BrowserEvidenceTemporalIntegritySummary;
    toolWindowContract: import("..").TestAgentReportContractValidation;
    crossRunArtifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
}>;
