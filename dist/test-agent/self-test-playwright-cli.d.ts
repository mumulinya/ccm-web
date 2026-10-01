export declare function runTestAgentPlaywrightFileUploadSelfTest(): Promise<{
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
export declare function runTestAgentPlaywrightMultiFileUploadSelfTest(): Promise<{
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
export declare function runTestAgentPlaywrightViewportSelfTest(): Promise<{
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
export declare function runTestAgentPlaywrightContextOptionsSelfTest(): Promise<{
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
export declare function runTestAgentPlaywrightInViewportSelfTest(): Promise<{
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
export declare function runTestAgentPlaywrightNoHorizontalOverflowSelfTest(): Promise<{
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
export declare function runTestAgentBrowserPreflightSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    verdict: import("./types-report").TestAgentVerdict;
    preflight: any[];
    providerSummary: import("./types-results").BrowserProviderSummary;
    cliSummary: string;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
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
export declare function runTestAgentPlaywrightResourceErrorSelfTest(): Promise<{
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
    networkErrors?: undefined;
    networkLog?: undefined;
    networkSummary?: undefined;
    verdict?: undefined;
    artifactVerification?: undefined;
    cliSummary?: undefined;
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
    networkErrors: string[];
    networkLog: string;
    networkSummary: import("./types-results").BrowserNetworkSummaryItem;
    verdict: any;
    artifactVerification: import("./artifact-verifier-core").TestAgentArtifactVerification;
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
    unavailable: {
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
    fallback: {
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
}>;
export declare function buildRequiredCheckCoverageFixturesPart01(dir: string): {
    genericBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    networkBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedNetworkBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericAccessibilityCoverage: import("./types-results").RequiredCheckCoverageItem[];
    accessibilityBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedAccessibilityCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericConsoleWarningCoverage: import("./types-results").RequiredCheckCoverageItem[];
    warningFreeConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    warningConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedWarningAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedConsoleErrorCoverage: import("./types-results").RequiredCheckCoverageItem[];
    computerUseConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    dialogInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDialogInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    popupInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedPopupInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    uploadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedUploadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    downloadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDownloadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    clipboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedClipboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    focusInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedFocusInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    keyboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedKeyboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericVisualLayoutCoverage: import("./types-results").RequiredCheckCoverageItem[];
    visualAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedVisualAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    layoutAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedLayoutAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
};
export declare function buildRequiredCheckCoverageFixturesPart02(dir: string): {
    genericUiStructureCoverage: import("./types-results").RequiredCheckCoverageItem[];
    formFlowCoverage: import("./types-results").RequiredCheckCoverageItem[];
    formStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedFormStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    tableCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedTableCoverage: import("./types-results").RequiredCheckCoverageItem[];
    listCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedListCoverage: import("./types-results").RequiredCheckCoverageItem[];
    textOrderCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedTextOrderCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericPageStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    urlTitleNavigationCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedUrlTitleNavigationCoverage: import("./types-results").RequiredCheckCoverageItem[];
    attributeCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedAttributeCoverage: import("./types-results").RequiredCheckCoverageItem[];
    networkStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedNetworkStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    presenceCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedPresenceCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    hoverInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedHoverInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    dragInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDragInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    scrollInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedScrollInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    historyInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedHistoryInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericScriptWaitCoverage: import("./types-results").RequiredCheckCoverageItem[];
    scriptCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedScriptCoverage: import("./types-results").RequiredCheckCoverageItem[];
    waitCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedWaitCoverage: import("./types-results").RequiredCheckCoverageItem[];
};
export declare function runTestAgentRequiredCheckCoverageSelfTest(): Promise<{
    pass: boolean;
    report: import("./types-report").TestAgentReport;
    genericBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    networkBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedNetworkBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericAccessibilityCoverage: import("./types-results").RequiredCheckCoverageItem[];
    accessibilityBrowserCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedAccessibilityCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericConsoleWarningCoverage: import("./types-results").RequiredCheckCoverageItem[];
    warningFreeConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    warningConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedWarningAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedConsoleErrorCoverage: import("./types-results").RequiredCheckCoverageItem[];
    computerUseConsoleCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    dialogInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDialogInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    popupInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedPopupInteractionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    uploadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedUploadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    downloadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDownloadTransferCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    clipboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedClipboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    focusInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedFocusInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    keyboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedKeyboardInputCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericVisualLayoutCoverage: import("./types-results").RequiredCheckCoverageItem[];
    visualAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedVisualAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    layoutAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedLayoutAssertionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericUiStructureCoverage: import("./types-results").RequiredCheckCoverageItem[];
    formFlowCoverage: import("./types-results").RequiredCheckCoverageItem[];
    formStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedFormStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    tableCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedTableCoverage: import("./types-results").RequiredCheckCoverageItem[];
    listCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedListCoverage: import("./types-results").RequiredCheckCoverageItem[];
    textOrderCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedTextOrderCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericPageStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    urlTitleNavigationCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedUrlTitleNavigationCoverage: import("./types-results").RequiredCheckCoverageItem[];
    attributeCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedAttributeCoverage: import("./types-results").RequiredCheckCoverageItem[];
    networkStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedNetworkStateCoverage: import("./types-results").RequiredCheckCoverageItem[];
    presenceCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedPresenceCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    hoverInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedHoverInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    dragInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedDragInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    scrollInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedScrollInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    historyInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedHistoryInteractionActionCoverage: import("./types-results").RequiredCheckCoverageItem[];
    genericScriptWaitCoverage: import("./types-results").RequiredCheckCoverageItem[];
    scriptCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedScriptCoverage: import("./types-results").RequiredCheckCoverageItem[];
    waitCoverage: import("./types-results").RequiredCheckCoverageItem[];
    failedWaitCoverage: import("./types-results").RequiredCheckCoverageItem[];
}>;
export declare function runTestAgentCliSelfTest(): Promise<{
    pass: boolean;
    parsed: import("./cli-options").TestAgentCliParseResult;
    handoffParsed: import("./cli-options").TestAgentCliParseResult;
    invalid: import("./cli-options").TestAgentCliParseResult;
    invalidHandoffCombo: import("./cli-options").TestAgentCliParseResult;
    selfTestMatrixParsed: import("./cli-options").TestAgentCliParseResult;
    invalidSelfTestMatrixCombo: import("./cli-options").TestAgentCliParseResult;
    invalidSelfTestTimeout: import("./cli-options").TestAgentCliParseResult;
    invalidSelfTestSelector: import("./cli-options").TestAgentCliParseResult;
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
    selfTestMatrixResult: {
        exitCode: number;
    };
    failingSelfTestMatrixResult: {
        exitCode: number;
    };
    validationSummary: string;
    reportSummary: string;
    handoffReportSummary: string;
    invalidHandoffError: string;
    warningHandoffValidation: any;
    selfTestMatrixSummary: string;
    failingSelfTestMatrixJson: any;
}>;
export declare function runTestAgentContractSelfTest(): {
    pass: boolean;
    workOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    stabilityWorkOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    invalidStabilityWorkOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    invalidWorkOrderValidation: import("./contract").TestAgentWorkOrderContractValidation;
    reportValidation: import("./contract").TestAgentReportContractValidation;
    verdictValidation: import("./contract").TestAgentVerdictContractValidation;
};
