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
};
export declare function runTestAgentArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    files: {
        jsonPath: string;
        markdownPath: string;
    };
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
    tampered: import("./artifact-verifier").TestAgentArtifactVerification;
}>;
export declare function runTestAgentMcpScreenshotArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    screenshotPath: string;
    manifest: any;
}>;
export declare function runTestAgentBrowserEvidenceArtifactSelfTest(): Promise<{
    pass: boolean;
    report: import("./types").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier").TestAgentArtifactVerification;
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
    actionTypes: ("fill" | "check" | "reload" | "goto" | "click" | "selectOption" | "uncheck" | "hover" | "press" | "scroll" | "openApplication" | "requestAccess" | "goBack" | "goForward" | "waitForSelector" | "waitForText" | "waitForTimeout" | "evaluate")[];
    assertionTypes: ("text" | "visible" | "notVisible" | "urlIncludes" | "titleIncludes" | "elementTextIncludes" | "networkNoErrors" | "consoleNoErrors" | "jsTruthy" | "jsEquals" | "localStorageEquals" | "localStorageIncludes" | "sessionStorageEquals" | "sessionStorageIncludes")[];
    issues: import("./types").WorkOrderIssue[];
};
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
    pass: boolean;
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
    validationSummary: string;
    reportSummary: string;
    handoffReportSummary: string;
}>;
export declare function runTestAgentContractSelfTest(): {
    pass: boolean;
    workOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    invalidWorkOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    reportValidation: import("./contract").TestAgentReportContractValidation;
};
