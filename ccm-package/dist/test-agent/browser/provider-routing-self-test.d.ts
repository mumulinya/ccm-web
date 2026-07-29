export declare function runTestAgentCapabilityAwareProviderRoutingSelfTest(): Promise<{
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
    plan?: undefined;
    calls?: undefined;
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
    report: import("..").TestAgentReport;
    plan: import("..").TestAgentExecutionPlan;
    calls: {
        toolName: string;
        input: Record<string, any>;
    }[];
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    reason?: undefined;
}>;
