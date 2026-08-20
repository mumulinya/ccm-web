export declare function runTestAgentPlaywrightFailureScreenshotSelfTest(): Promise<{
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
    manifest?: undefined;
    verification?: undefined;
    screenshotPath?: undefined;
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
    report: import("./types-report").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    screenshotPath: string;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    mcpReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    mcpReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    mcpReport: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest(): Promise<{
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
    manifest?: undefined;
    verification?: undefined;
    accessibilityArtifact?: undefined;
    accessibilityPreview?: undefined;
    reportValidation?: undefined;
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
    report: import("./types-report").TestAgentReport;
    manifest: any;
    verification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    accessibilityArtifact: import("./types-results").BrowserEvidenceArtifact;
    accessibilityPreview: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserAriaStateAssertionSelfTest(): Promise<{
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    mcpReport: import("./types-report").TestAgentReport;
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
    networkLog?: undefined;
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
    networkLog?: undefined;
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
    networkLog?: undefined;
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
    networkLog?: undefined;
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
    summary?: undefined;
    verdict?: undefined;
    artifactVerification?: undefined;
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
    summary: import("./types-results").BrowserInteractionSummaryItem;
    verdict: any;
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedChecksSelfTest(): {
    pass: boolean;
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    autoCheck: import("./types-specs").BrowserCheckSpec;
};
export declare function runTestAgentAcceptanceDerivedAccessibilitySelfTest(): Promise<{
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
    derived?: undefined;
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
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedStorageAssertionSelfTest(): Promise<{
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
    derived?: undefined;
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
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedCookieAssertionSelfTest(): Promise<{
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
    derived?: undefined;
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
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedNetworkAssertionSelfTest(): Promise<{
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
    derived?: undefined;
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
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentAcceptanceDerivedNegativeUiSelfTest(): Promise<{
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
    derived?: undefined;
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
    derived: import("./browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
    generatedChecks: import("./types-specs").BrowserCheckSpec[];
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentSemanticLocatorSelfTest(): {
    pass: boolean;
    actionPlans: import("./browser/semantic-locator").SemanticLocatorPlan[];
    assertionPlans: import("./browser/semantic-locator").SemanticLocatorPlan[];
    issues: import("./types-results").WorkOrderIssue[];
};
export declare function runTestAgentBrowserStateSelfTest(): {
    pass: boolean;
    actionTypes: ("fill" | "check" | "click" | "goto" | "doubleClick" | "rightClick" | "selectOption" | "uncheck" | "uploadFile" | "dragTo" | "setClipboard" | "setCookie" | "clearCookies" | "setLocalStorage" | "setSessionStorage" | "clearStorage" | "setOffline" | "setOnline" | "hover" | "focus" | "typeText" | "press" | "scroll" | "openApplication" | "requestAccess" | "reload" | "goBack" | "goForward" | "waitForSelector" | "waitForText" | "waitForUrl" | "waitForTimeout" | "evaluate")[];
    assertionTypes: ("enabled" | "text" | "disabled" | "present" | "focused" | "urlIncludes" | "visible" | "notVisible" | "notPresent" | "notFocused" | "checked" | "notChecked" | "selectedValue" | "selectedTextIncludes" | "inputValueEquals" | "inputValueIncludes" | "attributeEquals" | "attributeIncludes" | "computedStyleEquals" | "computedStyleIncludes" | "elementCountEquals" | "elementCountAtLeast" | "elementCountAtMost" | "dialogAppeared" | "dialogMessageIncludes" | "dialogTypeEquals" | "popupOpened" | "popupUrlIncludes" | "popupTextIncludes" | "popupTitleIncludes" | "tableRowIncludes" | "tableCellTextIncludes" | "tableCellTextEquals" | "clipboardTextEquals" | "clipboardTextIncludes" | "elementScreenshotNotBlank" | "textOrder" | "urlEquals" | "urlNotIncludes" | "titleEquals" | "titleIncludes" | "titleNotIncludes" | "elementTextIncludes" | "accessibleNameEquals" | "accessibleNameIncludes" | "accessibleDescriptionEquals" | "accessibleDescriptionIncludes" | "ariaSnapshotIncludes" | "ariaExpanded" | "ariaCollapsed" | "ariaPressed" | "ariaNotPressed" | "ariaSelected" | "ariaNotSelected" | "ariaInvalid" | "ariaValid" | "ariaRequired" | "ariaNotRequired" | "inViewport" | "pageNotBlank" | "noHorizontalOverflow" | "onlineState" | "browserOnline" | "browserOffline" | "cookieExists" | "cookieValueEquals" | "cookieValueIncludes" | "networkNoErrors" | "networkRequest" | "networkRequestIncludes" | "networkRequestNot" | "networkRequestNotIncludes" | "networkResponse" | "networkResponseIncludes" | "networkResponseNot" | "networkResponseNotIncludes" | "downloadedFile" | "consoleIncludes" | "consoleNotIncludes" | "consoleNoErrors" | "consoleNoWarnings" | "jsTruthy" | "jsEquals" | "localStorageEquals" | "localStorageIncludes" | "sessionStorageEquals" | "sessionStorageIncludes")[];
    issues: import("./types-results").WorkOrderIssue[];
};
export declare function runTestAgentBrowserScriptWaitAssertionSelfTest(): Promise<{
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
    report: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserSelectStateSelfTest(): Promise<{
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
export declare function runTestAgentBrowserInputValueAssertionSelfTest(): Promise<{
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserPresenceAssertionSelfTest(): Promise<{
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    mcpReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserHoverActionSelfTest(): Promise<{
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
    reason?: undefined;
}>;
export declare function runTestAgentBrowserHistoryNavigationActionSelfTest(): Promise<{
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
    report: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    passReport: import("./types-report").TestAgentReport;
    failReport: import("./types-report").TestAgentReport;
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
    downloadArtifact?: undefined;
    manifest?: undefined;
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
    downloadArtifact: import("./types-results").BrowserEvidenceArtifact;
    manifest: any;
    reason?: undefined;
}>;
