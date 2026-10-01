export declare function runTestAgentSelfTest(options?: {
    includeBrowser?: boolean;
}): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
}>;
export declare function runTestAgentMcpProviderSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentClaudeChromeMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentComputerUseMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentWorkOrderNormalizationSelfTest(): {
    pass: boolean;
    normalized: {
        workOrder: import("./types-results").NormalizedTestAgentWorkOrder;
        issues: import("./types-results").WorkOrderIssue[];
    };
    invalid: {
        workOrder: import("./types-results").NormalizedTestAgentWorkOrder;
        issues: import("./types-results").WorkOrderIssue[];
    };
};
export declare function runTestAgentSelfTestMatrixSelfTest(): Promise<{
    pass: boolean;
    discovered: string[];
    report: import("./self-test-matrix").TestAgentSelfTestMatrixReport;
    timeoutReport: import("./self-test-matrix").TestAgentSelfTestMatrixReport;
    summary: string;
}>;
export declare function runTestAgentHandoffBuilderSelfTest(): {
    pass: boolean;
    built: import("./work-order-builder").TestAgentBuiltWorkOrder;
    validation: import("./contract").TestAgentWorkOrderContractValidation;
    normalized: {
        workOrder: import("./types-results").NormalizedTestAgentWorkOrder;
        issues: import("./types-results").WorkOrderIssue[];
    };
    examples: {
        minimal: {
            built: import("./work-order-builder").TestAgentBuiltWorkOrder;
            validation: import("./contract").TestAgentWorkOrderContractValidation;
        };
        webApp: {
            built: import("./work-order-builder").TestAgentBuiltWorkOrder;
            validation: import("./contract").TestAgentWorkOrderContractValidation;
        };
    };
};
export declare function runTestAgentHandoffContractSelfTest(): {
    pass: boolean;
    minimal: import("./contract").TestAgentHandoffContractValidation;
    web: import("./contract").TestAgentHandoffContractValidation;
    singleProject: import("./contract").TestAgentHandoffContractValidation;
    warning: import("./contract").TestAgentHandoffContractValidation;
    missingProjects: import("./contract").TestAgentHandoffContractValidation;
    invalidProjectsType: import("./contract").TestAgentHandoffContractValidation;
    invalidNestedHttp: import("./contract").TestAgentHandoffContractValidation;
};
export declare function runTestAgentArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    files: {
        jsonPath: string;
        markdownPath: string;
        verdictPath: string;
    };
    verdict: any;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
}>;
export declare function runTestAgentVerdictSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: any;
    validation: import("./contract").TestAgentVerdictContractValidation;
    manifest: any;
    cliSummary: string;
    markdown: string;
}>;
export declare function runTestAgentFailureSummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserProviderGapSummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    uploadGap: import("./types-results").BrowserProviderGapItem;
    networkGap: import("./types-results").BrowserProviderGapItem;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserSessionComparisonSelfTest(): Promise<{
    pass: boolean;
    equals: {
        step: import("./types-results").BrowserStepResult;
        result: import("./types-results").BrowserSessionComparisonResult;
    };
    notEquals: {
        step: import("./types-results").BrowserStepResult;
        result: import("./types-results").BrowserSessionComparisonResult;
    };
    includes: {
        step: import("./types-results").BrowserStepResult;
        result: import("./types-results").BrowserSessionComparisonResult;
    };
    redacted: {
        step: import("./types-results").BrowserStepResult;
        result: import("./types-results").BrowserSessionComparisonResult;
    };
    hanging: {
        step: import("./types-results").BrowserStepResult;
        result: import("./types-results").BrowserSessionComparisonResult;
    };
    hangingElapsedMs: number;
    normalized: {
        workOrder: import("./types-results").NormalizedTestAgentWorkOrder;
        issues: import("./types-results").WorkOrderIssue[];
    };
}>;
export declare function runTestAgentBrowserFlowSummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    summary: import("./types-results").BrowserFlowSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserMultiSessionSummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    summary: import("./types-results").BrowserMultiSessionSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserStabilitySummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    summary: import("./types-results").BrowserStabilitySummary;
    duplicateSummary: import("./types-results").BrowserStabilitySummary;
    incompleteSummary: import("./types-results").BrowserStabilitySummary;
    blockedSummary: import("./types-results").BrowserStabilitySummary;
    stableFailSummary: import("./types-results").BrowserStabilitySummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentAcceptanceSummarySelfTest(): {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    byCriterion: {
        [k: string]: import("./types-results").AcceptanceCoverageItem;
    };
    fallbackCoverage: import("./types-results").AcceptanceCoverageItem[];
    fallbackSummary: import("./types-results").TestAgentAcceptanceSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentArtifactManifestSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    manifest: any;
}>;
export declare function runTestAgentArtifactVerifierSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    semanticTampered: import("./artifact-verifier-core").TestAgentArtifactVerification;
    tampered: import("./artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpScreenshotArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    screenshotPath: string;
    manifest: any;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    blank: import("./artifact-verifier-core").TestAgentArtifactVerification;
    tampered: import("./artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpFailureScreenshotSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    calls: any[];
    screenshotPath: string;
}>;
export declare function runTestAgentBrowserEvidenceArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    emptyTrace: import("./artifact-verifier-core").TestAgentArtifactVerification;
    noEventTrace: import("./artifact-verifier-core").TestAgentArtifactVerification;
    tamperedHar: import("./artifact-verifier-core").TestAgentArtifactVerification;
}>;
export declare function runTestAgentCoverageSelfTest(): {
    pass: boolean;
    coverage: import("./types-results").AcceptanceCoverageItem[];
};
export declare function runTestAgentCommandPlannerSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    planned: any[];
}>;
export declare function runTestAgentExecutionPlanSelfTest(): Promise<{
    pass: boolean;
    validation: import("./contract").TestAgentWorkOrderContractValidation;
    plan: import("./execution-plan").TestAgentExecutionPlan;
    summary: string;
    providerWarningPlan: import("./execution-plan").TestAgentExecutionPlan;
    providerWarningSummary: string;
    cliResult: {
        exitCode: number;
    };
    cliSummary: string;
    runAgentCalled: boolean;
}>;
export declare function runTestAgentHttpApiSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
}>;
export declare function runTestAgentAdversarialHttpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
}>;
export declare function runTestAgentAdversarialBrowserSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentBrowserProbeTemplateSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentAutoBrowserSmokeSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    calls: any[];
    autoCheck: import("./types-specs").BrowserCheckSpec;
    derivedAssertions: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
}>;
