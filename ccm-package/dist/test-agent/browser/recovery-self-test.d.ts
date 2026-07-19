interface ToolCall {
    toolName: string;
    input: Record<string, any>;
}
export declare function runTestAgentClaudeChromeRecoverySelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    contract: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    tamperedContract: import("..").TestAgentReportContractValidation;
    tamperedArtifacts: import("../artifact-verifier-core").TestAgentArtifactVerification;
    calls: ToolCall[];
    plan: import("..").TestAgentExecutionPlan;
}>;
export declare function runTestAgentUnsafeBrowserRecoverySelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: ToolCall[];
}>;
export declare function runTestAgentFailedBrowserRecoverySelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: ToolCall[];
}>;
export declare function runTestAgentChromeDevtoolsRecoverySelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: ToolCall[];
}>;
export {};
