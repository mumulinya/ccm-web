export declare function runTestAgentSelfTest(options?: {
    includeBrowser?: boolean;
}): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
}>;
export declare function runTestAgentMcpProviderSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentClaudeChromeMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentComputerUseMcpSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
}>;
export declare function runTestAgentWorkOrderNormalizationSelfTest(): {
    pass: boolean;
    normalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    invalid: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
};
export declare function runTestAgentSelfTestMatrixSelfTest(): Promise<{
    pass: boolean;
    discovered: string[];
    report: import("../self-test-matrix").TestAgentSelfTestMatrixReport;
    timeoutReport: import("../self-test-matrix").TestAgentSelfTestMatrixReport;
    summary: string;
}>;
export declare function runTestAgentHandoffBuilderSelfTest(): {
    pass: boolean;
    built: import("..").TestAgentBuiltWorkOrder;
    validation: import("..").TestAgentWorkOrderContractValidation;
    normalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    examples: {
        minimal: {
            built: import("..").TestAgentBuiltWorkOrder;
            validation: import("..").TestAgentWorkOrderContractValidation;
        };
        webApp: {
            built: import("..").TestAgentBuiltWorkOrder;
            validation: import("..").TestAgentWorkOrderContractValidation;
        };
    };
};
export declare function runTestAgentHandoffContractSelfTest(): {
    pass: boolean;
    minimal: import("..").TestAgentHandoffContractValidation;
    web: import("..").TestAgentHandoffContractValidation;
    singleProject: import("..").TestAgentHandoffContractValidation;
    warning: import("..").TestAgentHandoffContractValidation;
    missingProjects: import("..").TestAgentHandoffContractValidation;
    invalidProjectsType: import("..").TestAgentHandoffContractValidation;
    invalidNestedHttp: import("..").TestAgentHandoffContractValidation;
};
export declare function runTestAgentArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    files: {
        jsonPath: string;
        markdownPath: string;
        verdictPath: string;
    };
    verdict: any;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
}>;
export declare function runTestAgentVerdictSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: any;
    validation: import("..").TestAgentVerdictContractValidation;
    manifest: any;
    cliSummary: string;
    markdown: string;
}>;
export declare function runTestAgentFailureSummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserProviderGapSummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    uploadGap: import("..").BrowserProviderGapItem;
    networkGap: import("..").BrowserProviderGapItem;
    cliSummary: string;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserSessionComparisonSelfTest(): Promise<{
    pass: boolean;
    equals: {
        step: import("..").BrowserStepResult;
        result: import("..").BrowserSessionComparisonResult;
    };
    notEquals: {
        step: import("..").BrowserStepResult;
        result: import("..").BrowserSessionComparisonResult;
    };
    includes: {
        step: import("..").BrowserStepResult;
        result: import("..").BrowserSessionComparisonResult;
    };
    redacted: {
        step: import("..").BrowserStepResult;
        result: import("..").BrowserSessionComparisonResult;
    };
    hanging: {
        step: import("..").BrowserStepResult;
        result: import("..").BrowserSessionComparisonResult;
    };
    hangingElapsedMs: number;
    normalized: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
}>;
export declare function runTestAgentBrowserFlowSummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    summary: import("..").BrowserFlowSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
export declare function runTestAgentBrowserMultiSessionSummarySelfTest(): {
    pass: boolean;
    report: import("..").TestAgentReport;
    verdict: import("..").TestAgentVerdict;
    summary: import("..").BrowserMultiSessionSummary;
    cliSummary: string;
    markdown: string;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
