export declare function runTestAgentSelfTest(options?: {
    includeBrowser?: boolean;
}): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
}>;
export declare function runTestAgentMcpProviderSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentClaudeChromeMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentComputerUseMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentWorkOrderNormalizationSelfTest(): {
    pass: boolean;
    normalized: {
        workOrder: import("./types").NormalizedTestAgentWorkOrder;
        issues: import("./types").WorkOrderIssue[];
    };
    invalid: {
        workOrder: import("./types").NormalizedTestAgentWorkOrder;
        issues: import("./types").WorkOrderIssue[];
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
        workOrder: import("./types").NormalizedTestAgentWorkOrder;
        issues: import("./types").WorkOrderIssue[];
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
    report: import("./types").TestAgentReport;
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
    report: import("./types").TestAgentReport;
    verdict: any;
    validation: import("./contract").TestAgentVerdictContractValidation;
    manifest: any;
    cliSummary: string;
    markdown: string;
}>;
export declare function runTestAgentFailureSummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserProviderGapSummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    uploadGap: import("./types").BrowserProviderGapItem;
    networkGap: import("./types").BrowserProviderGapItem;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserSessionComparisonSelfTest(): Promise<{
    pass: boolean;
    equals: {
        step: import("./types").BrowserStepResult;
        result: import("./types").BrowserSessionComparisonResult;
    };
    notEquals: {
        step: import("./types").BrowserStepResult;
        result: import("./types").BrowserSessionComparisonResult;
    };
    includes: {
        step: import("./types").BrowserStepResult;
        result: import("./types").BrowserSessionComparisonResult;
    };
    redacted: {
        step: import("./types").BrowserStepResult;
        result: import("./types").BrowserSessionComparisonResult;
    };
    hanging: {
        step: import("./types").BrowserStepResult;
        result: import("./types").BrowserSessionComparisonResult;
    };
    hangingElapsedMs: number;
    normalized: {
        workOrder: import("./types").NormalizedTestAgentWorkOrder;
        issues: import("./types").WorkOrderIssue[];
    };
}>;
export declare function runTestAgentBrowserFlowSummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    summary: import("./types").BrowserFlowSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserMultiSessionSummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    summary: import("./types").BrowserMultiSessionSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserStabilitySummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    summary: import("./types").BrowserStabilitySummary;
    duplicateSummary: import("./types").BrowserStabilitySummary;
    incompleteSummary: import("./types").BrowserStabilitySummary;
    blockedSummary: import("./types").BrowserStabilitySummary;
    stableFailSummary: import("./types").BrowserStabilitySummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentAcceptanceSummarySelfTest(): {
    pass: boolean;
    report: import("./types").TestAgentReport;
    verdict: import("./types").TestAgentVerdict;
    byCriterion: {
        [k: string]: import("./types").AcceptanceCoverageItem;
    };
    fallbackCoverage: import("./types").AcceptanceCoverageItem[];
    fallbackSummary: import("./types").TestAgentAcceptanceSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
export declare function runTestAgentArtifactManifestSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    manifest: any;
}>;
export declare function runTestAgentArtifactVerifierSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    verification: import("./artifact-verifier").TestAgentArtifactVerification;
    semanticTampered: import("./artifact-verifier").TestAgentArtifactVerification;
    tampered: import("./artifact-verifier").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpScreenshotArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    screenshotPath: string;
    manifest: any;
    verification: import("./artifact-verifier").TestAgentArtifactVerification;
    blank: import("./artifact-verifier").TestAgentArtifactVerification;
    tampered: import("./artifact-verifier").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpFailureScreenshotSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier").TestAgentArtifactVerification;
    calls: any[];
    screenshotPath: string;
}>;
export declare function runTestAgentBrowserEvidenceArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier").TestAgentArtifactVerification;
    emptyTrace: import("./artifact-verifier").TestAgentArtifactVerification;
    noEventTrace: import("./artifact-verifier").TestAgentArtifactVerification;
    tamperedHar: import("./artifact-verifier").TestAgentArtifactVerification;
}>;
export declare function runTestAgentCoverageSelfTest(): {
    pass: boolean;
    coverage: import("./types").AcceptanceCoverageItem[];
};
export declare function runTestAgentCommandPlannerSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
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
    report: import("./types").TestAgentReport;
}>;
export declare function runTestAgentAdversarialHttpSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
}>;
export declare function runTestAgentAdversarialBrowserSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentBrowserProbeTemplateSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentAutoBrowserSmokeSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    calls: any[];
    autoCheck: import("./types").BrowserCheckSpec;
    derivedAssertions: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
}>;
