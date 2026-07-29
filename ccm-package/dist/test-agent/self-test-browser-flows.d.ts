export declare function runTestAgentBrowserCheckSourceMetadataSelfTest(): {
    pass: boolean;
    autoCheck: import("./types-specs").BrowserCheckSpec;
    pathCheck: import("./types-specs").BrowserCheckSpec;
    formCheck: import("./types-specs").BrowserCheckSpec;
    invalidFormCheck: import("./types-specs").BrowserCheckSpec;
    clipboardCheck: import("./types-specs").BrowserCheckSpec;
    dialogCheck: import("./types-specs").BrowserCheckSpec;
    dragCheck: import("./types-specs").BrowserCheckSpec;
    popupCheck: import("./types-specs").BrowserCheckSpec;
    downloadCheck: import("./types-specs").BrowserCheckSpec;
    uploadCheck: import("./types-specs").BrowserCheckSpec;
    repeatedClickCheck: import("./types-specs").BrowserCheckSpec;
    keyboardCheck: import("./types-specs").BrowserCheckSpec;
    networkStateCheck: import("./types-specs").BrowserCheckSpec;
    clickCheck: import("./types-specs").BrowserCheckSpec;
    hoverCheck: import("./types-specs").BrowserCheckSpec;
    scrollCheck: import("./types-specs").BrowserCheckSpec;
    responsiveCheck: import("./types-specs").BrowserCheckSpec;
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
};
export declare function runTestAgentAcceptanceNetworkStateFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    networkStateChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    networkStateChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceHistoryFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    historyChecks?: undefined;
    ambiguousPageBackChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    historyChecks: import("./types-specs").BrowserCheckSpec[];
    ambiguousPageBackChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentMultiSessionBrowserSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    contract?: undefined;
    executionPlan?: undefined;
    mcpExecutionPlan?: undefined;
    invalidNormalized?: undefined;
    report?: undefined;
    verdict?: undefined;
    cliSummary?: undefined;
    markdown?: undefined;
    reportValidation?: undefined;
    verdictValidation?: undefined;
    artifactVerification?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    contract: import("./contract").TestAgentWorkOrderContractValidation;
    executionPlan: import("./execution-plan").TestAgentExecutionPlan;
    mcpExecutionPlan: import("./execution-plan").TestAgentExecutionPlan;
    invalidNormalized: {
        workOrder: import("./types-results").NormalizedTestAgentWorkOrder;
        issues: import("./types-results").WorkOrderIssue[];
    };
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    cliSummary: string;
    markdown: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserStabilitySelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    validation?: undefined;
    plan?: undefined;
    report?: undefined;
    verdict?: undefined;
    cliSummary?: undefined;
    markdown?: undefined;
    artifactVerification?: undefined;
    reusedArtifactVerification?: undefined;
    reportValidation?: undefined;
    verdictValidation?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    validation: import("./contract").TestAgentWorkOrderContractValidation;
    plan: import("./execution-plan").TestAgentExecutionPlan;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    cliSummary: string;
    markdown: string;
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    reusedArtifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDragFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    dragChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    dragChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceClipboardFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    clipboardChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    clipboardChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDialogFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    dialogChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
    dialogLogText?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    dialogChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    dialogLogText: string;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptancePopupFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    popupChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
    popupLogText?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    popupChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    popupLogText: string;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceKeyboardFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    keyboardChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    keyboardChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceHoverFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    hoverChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    hoverChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceScrollFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    scrollChecks?: undefined;
    layoutOnlyScrollChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    scrollChecks: import("./types-specs").BrowserCheckSpec[];
    layoutOnlyScrollChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceRepeatedClickSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    repeatedChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    repeatedChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseRepeatedClickSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    repeatedChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    repeatedChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    pageNotBlank?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    pageNotBlank: import("./types-results").BrowserStepResult;
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    pathChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    pathChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    pathChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    pathChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceResponsiveViewportSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    responsiveChecks?: undefined;
    generatedChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    responsiveChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseResponsiveViewportSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    responsiveChecks?: undefined;
    generatedChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    responsiveChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    downloadChecks?: undefined;
    downloadArtifact?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    downloadChecks: import("./types-specs").BrowserCheckSpec[];
    downloadArtifact: import("./types-results").BrowserEvidenceArtifact;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseDownloadFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    downloadChecks?: undefined;
    downloadArtifact?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    downloadChecks: import("./types-specs").BrowserCheckSpec[];
    downloadArtifact: import("./types-results").BrowserEvidenceArtifact;
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    uploadChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    uploadChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseUploadFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    uploadChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    uploadChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceClickFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    clickChecks?: undefined;
    markdown?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    clickChecks: import("./types-specs").BrowserCheckSpec[];
    markdown: string;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseClickFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    clickChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    clickChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceClickNavigationFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    clickChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    clickChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceMultiClickFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    clickChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    clickChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceChineseFormFlowSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceInvalidFormAdversarialSelfTest(): Promise<{
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    flowChecks?: undefined;
    generatedChecks?: undefined;
    report?: undefined;
} | {
    pass: boolean;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
    flowChecks?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    flowChecks: import("./types-specs").BrowserCheckSpec[];
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
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason: string;
    report?: undefined;
} | {
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    availability: {
        available: boolean;
        reason: string;
        diagnostics: {
            packageAvailable: boolean;
            launchChecked: boolean;
            browser?: undefined;
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
        };
    } | {
        available: boolean;
        diagnostics: {
            warning?: string;
            packageAvailable: boolean;
            launchChecked: boolean;
            browser: string;
            channel: any;
            launchAttempt: string;
            launchFallbackErrors: string[];
            launchAttempts?: undefined;
            installCommand?: undefined;
            linuxDependencyCommand?: undefined;
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
            installCommand: string;
            linuxDependencyCommand: string;
        };
    };
    reason?: undefined;
}>;
