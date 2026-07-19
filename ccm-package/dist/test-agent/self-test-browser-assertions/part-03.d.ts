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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
    mcpReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
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
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
    reason?: undefined;
}>;
