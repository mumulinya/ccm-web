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
}>;
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
export declare function runTestAgentBlankPageSmokeSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    pageNotBlank?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    pageNotBlank: import("./types").BrowserStepResult;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptancePathSmokeSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    pathChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    pathChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptancePathGroupingSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    pathChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    pathChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDownloadFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    downloadChecks?: undefined;
    downloadArtifact?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    downloadChecks: import("./types").BrowserCheckSpec[];
    downloadArtifact: import("./types").BrowserEvidenceArtifact;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceUploadFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    uploadChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    uploadChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceMultiFieldFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceRedirectFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    flowChecks: import("./types").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightUrlIncludesWaitSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentBrowserUrlTitleAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserConsoleAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
    mcpReport?: undefined;
    mcpCalls?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    mcpReport: import("./types").TestAgentReport;
    mcpCalls: any[];
    reason?: undefined;
}>;
export declare function runTestAgentBrowserNetworkStateActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
    mcpReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    mcpReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserAccessibilityAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
    mcpReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    mcpReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserNetworkAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    networkLog?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    networkLog: string;
    reason?: undefined;
}>;
export declare function runTestAgentStructuredBrowserNetworkAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    networkLog?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    networkLog: string;
    reason?: undefined;
}>;
export declare function runTestAgentNegativeBrowserNetworkAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    networkLog?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    networkLog: string;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserRequestMetadataAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    networkLog?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    networkLog: string;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserInteractionSummarySelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    summary?: undefined;
    verdict?: undefined;
    artifactVerification?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    summary: import("./types").BrowserInteractionSummaryItem;
    verdict: any;
    artifactVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedChecksSelfTest(): {
    pass: boolean;
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    autoCheck: import("./types").BrowserCheckSpec;
};
export declare function runTestAgentSemanticLocatorSelfTest(): {
    pass: boolean;
    actionPlans: import("./browser/semantic-locator").SemanticLocatorPlan[];
    assertionPlans: import("./browser/semantic-locator").SemanticLocatorPlan[];
    issues: import("./types").WorkOrderIssue[];
};
export declare function runTestAgentBrowserStateSelfTest(): {
    pass: boolean;
    actionTypes: ("fill" | "check" | "goto" | "click" | "doubleClick" | "rightClick" | "selectOption" | "uncheck" | "uploadFile" | "dragTo" | "setClipboard" | "setCookie" | "clearCookies" | "setLocalStorage" | "setSessionStorage" | "clearStorage" | "setOffline" | "setOnline" | "hover" | "focus" | "typeText" | "press" | "scroll" | "openApplication" | "requestAccess" | "reload" | "goBack" | "goForward" | "waitForSelector" | "waitForText" | "waitForUrl" | "waitForTimeout" | "evaluate")[];
    assertionTypes: ("text" | "enabled" | "disabled" | "checked" | "visible" | "notVisible" | "focused" | "notFocused" | "notChecked" | "selectedValue" | "selectedTextIncludes" | "inputValueEquals" | "inputValueIncludes" | "attributeEquals" | "attributeIncludes" | "computedStyleEquals" | "computedStyleIncludes" | "elementCountEquals" | "elementCountAtLeast" | "elementCountAtMost" | "dialogAppeared" | "dialogMessageIncludes" | "dialogTypeEquals" | "popupOpened" | "popupUrlIncludes" | "popupTextIncludes" | "popupTitleIncludes" | "tableRowIncludes" | "tableCellTextIncludes" | "tableCellTextEquals" | "clipboardTextEquals" | "clipboardTextIncludes" | "elementScreenshotNotBlank" | "textOrder" | "urlEquals" | "urlIncludes" | "urlNotIncludes" | "titleEquals" | "titleIncludes" | "titleNotIncludes" | "elementTextIncludes" | "accessibleNameEquals" | "accessibleNameIncludes" | "accessibleDescriptionEquals" | "accessibleDescriptionIncludes" | "ariaSnapshotIncludes" | "inViewport" | "pageNotBlank" | "noHorizontalOverflow" | "onlineState" | "browserOnline" | "browserOffline" | "cookieExists" | "cookieValueIncludes" | "networkNoErrors" | "networkRequest" | "networkRequestIncludes" | "networkRequestNot" | "networkRequestNotIncludes" | "networkResponse" | "networkResponseIncludes" | "networkResponseNot" | "networkResponseNotIncludes" | "downloadedFile" | "consoleIncludes" | "consoleNotIncludes" | "consoleNoErrors" | "consoleNoWarnings" | "jsTruthy" | "jsEquals" | "localStorageEquals" | "localStorageIncludes" | "sessionStorageEquals" | "sessionStorageIncludes")[];
    issues: import("./types").WorkOrderIssue[];
};
export declare function runTestAgentBrowserSelectStateSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentBrowserInputValueAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserEnabledStateSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserFocusStateSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserElementCountSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserDialogAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
    dialogLog?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    dialogLog: string;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserPopupAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
    popupLog?: undefined;
    manifest?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    popupLog: string;
    manifest: any;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserTableAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserDragToActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserScrollActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserAdvancedMouseActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserKeyboardActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserStorageActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserCookieActionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserClipboardAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserElementScreenshotAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserTextOrderAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserAttributeAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserComputedStyleAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserCookieAssertionSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightDownloadArtifactSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    downloadArtifact?: undefined;
    manifest?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    downloadArtifact: import("./types").BrowserEvidenceArtifact;
    manifest: any;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightFileUploadSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightMultiFileUploadSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightViewportSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightContextOptionsSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightInViewportSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightNoHorizontalOverflowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    passReport?: undefined;
    failReport?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    passReport: import("./types").TestAgentReport;
    failReport: import("./types").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserPreflightSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    preflight: any[];
}>;
export declare function runTestAgentPlaywrightRealBrowserSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightResourceErrorSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    report?: undefined;
    networkErrors?: undefined;
    networkLog?: undefined;
    networkSummary?: undefined;
    verdict?: undefined;
    artifactVerification?: undefined;
    cliSummary?: undefined;
} | {
    pass: boolean;
    report: import("./types").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    networkErrors: string[];
    networkLog: string;
    networkSummary: import("./types").BrowserNetworkSummaryItem;
    verdict: any;
    artifactVerification: import("./artifact-verifier").TestAgentArtifactVerification;
    cliSummary: string;
    reason?: undefined;
}>;
export declare function runTestAgentStandaloneCliRealWebSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    runResult?: undefined;
    verifyResult?: undefined;
    report?: undefined;
    manifest?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    runResult: {
        status: number;
        signal: NodeJS.Signals;
        error: string;
        stdout: string;
        stderr: string;
    };
    verifyResult: {
        status: number;
        signal: NodeJS.Signals;
        error: string;
        stdout: string;
        stderr: string;
    };
    report: any;
    manifest: any;
    reason?: undefined;
}>;
export declare function runTestAgentStandaloneHandoffRealWebSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    reason: string;
    runResult?: undefined;
    verifyResult?: undefined;
    report?: undefined;
    manifest?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    runResult: {
        status: number;
        signal: NodeJS.Signals;
        error: string;
        stdout: string;
        stderr: string;
    };
    verifyResult: {
        status: number;
        signal: NodeJS.Signals;
        error: string;
        stdout: string;
        stderr: string;
    };
    report: any;
    manifest: any;
    reason?: undefined;
}>;
export declare function runTestAgentPlaywrightAvailabilitySelfTest(): Promise<{
    pass: false;
    available: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    unavailable: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
    fallback: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
            launchAttempts?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
        };
        reason?: undefined;
    } | {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            launchAttempts: string[];
            channel?: undefined;
            launchAttempt?: undefined;
            launchFallbackErrors?: undefined;
        };
    };
}>;
export declare function runTestAgentRequiredCheckCoverageSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
}>;
export declare function runTestAgentCliSelfTest(): Promise<{
    pass: any;
    parsed: import("./cli-options").TestAgentCliParseResult;
    handoffParsed: import("./cli-options").TestAgentCliParseResult;
    invalid: import("./cli-options").TestAgentCliParseResult;
    invalidHandoffCombo: import("./cli-options").TestAgentCliParseResult;
    validateResult: {
        exitCode: number;
    };
    runResult: {
        exitCode: number;
    };
    handoffValidateResult: {
        exitCode: number;
    };
    handoffRunResult: {
        exitCode: number;
    };
    invalidHandoffResult: {
        exitCode: number;
    };
    warningHandoffResult: {
        exitCode: number;
    };
    validationSummary: string;
    reportSummary: string;
    handoffReportSummary: string;
    invalidHandoffError: string;
    warningHandoffValidation: any;
}>;
export declare function runTestAgentContractSelfTest(): {
    pass: boolean;
    workOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    invalidWorkOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
