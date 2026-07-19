export declare function runTestAgentBrowserStabilitySummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    summary: import("..").BrowserStabilitySummary;
    duplicateSummary: import("..").BrowserStabilitySummary;
    incompleteSummary: import("..").BrowserStabilitySummary;
    blockedSummary: import("..").BrowserStabilitySummary;
    stableFailSummary: import("..").BrowserStabilitySummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
export declare function runTestAgentAcceptanceSummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    byCriterion: {
        [k: string]: import("..").AcceptanceCoverageItem;
    };
    fallbackCoverage: import("..").AcceptanceCoverageItem[];
    fallbackSummary: import("..").TestAgentAcceptanceSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
export declare function runTestAgentArtifactManifestSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    manifest: any;
}>;
export declare function runTestAgentArtifactVerifierSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    verification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    semanticTampered: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tampered: import("../artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpScreenshotArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    screenshotPath: string;
    manifest: any;
    verification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    blank: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tampered: import("../artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpFailureScreenshotSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    manifest: any;
    verification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    calls: any[];
    screenshotPath: string;
}>;
export declare function runTestAgentBrowserEvidenceArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    manifest: any;
    verification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    emptyTrace: import("../artifact-verifier-core").TestAgentArtifactVerification;
    noEventTrace: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tamperedHar: import("../artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentCoverageSelfTest(): {
    pass: boolean;
    coverage: import("..").AcceptanceCoverageItem[];
};
export declare function runTestAgentCommandPlannerSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    planned: any[];
}>;
export declare function runTestAgentExecutionPlanSelfTest(): Promise<{
    pass: boolean;
    validation: import("..").TestAgentWorkOrderContractValidation;
    plan: import("..").TestAgentExecutionPlan;
    summary: string;
    providerWarningPlan: import("..").TestAgentExecutionPlan;
    providerWarningSummary: string;
    cliResult: {
        exitCode: number;
    };
    cliSummary: string;
    runAgentCalled: boolean;
}>;
export declare function runTestAgentHttpApiSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
}>;
export declare function runTestAgentAdversarialHttpSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
}>;
export declare function runTestAgentAdversarialBrowserSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentBrowserProbeTemplateSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
}>;
