export declare function runTestAgentPlaywrightActionEffectSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    plan: import("..").TestAgentExecutionPlan;
    contract: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    digestTamper: import("../artifact-verifier-core").TestAgentArtifactVerification;
    countTamper: import("../artifact-verifier-core").TestAgentArtifactVerification;
    summaryTamper: import("../artifact-verifier-core").TestAgentArtifactVerification;
    rawDetailTamper: import("../artifact-verifier-core").TestAgentArtifactVerification;
    generatedChecks: import("..").BrowserCheckSpec[];
}>;
export declare function runTestAgentMultiSessionActionEffectSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    plan: import("..").TestAgentExecutionPlan;
    contract: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    missingSessionTamper: {
        contract: import("..").TestAgentReportContractValidation;
        artifact: import("../artifact-verifier-core").TestAgentArtifactVerification;
    };
    mismatchedSessionTamper: {
        contract: import("..").TestAgentReportContractValidation;
        artifact: import("../artifact-verifier-core").TestAgentArtifactVerification;
    };
}>;
export declare function runTestAgentCrossSessionActionEffectSelfTest(): Promise<{
    pass: boolean;
    passReport: import("..").TestAgentReport;
    failReport: import("..").TestAgentReport;
    plan: import("..").TestAgentExecutionPlan;
    verdict: import("..").TestAgentVerdict;
    passContract: import("..").TestAgentReportContractValidation;
    failContract: import("..").TestAgentReportContractValidation;
    verdictContract: import("..").TestAgentVerdictContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    missingTargetTamper: {
        contract: import("..").TestAgentReportContractValidation;
        artifact: import("../artifact-verifier-core").TestAgentArtifactVerification;
    };
    mismatchedTargetTamper: {
        contract: import("..").TestAgentReportContractValidation;
        artifact: import("../artifact-verifier-core").TestAgentArtifactVerification;
    };
    invalidSingleSession: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    invalidUnknownTarget: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    invalidMissingVerify: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
    invalidSameTarget: {
        workOrder: import("..").NormalizedTestAgentWorkOrder;
        issues: import("..").WorkOrderIssue[];
    };
}>;
export declare function runTestAgentMcpActionEffectSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    plan: import("..").TestAgentExecutionPlan;
    contract: import("..").TestAgentReportContractValidation;
    artifactVerification: import("../artifact-verifier-core").TestAgentArtifactVerification;
    calls: {
        toolName: string;
        input: Record<string, any>;
    }[];
}>;
