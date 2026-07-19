export declare function runTestAgentCliSelfTest(): Promise<{
    pass: boolean;
    parsed: import("../cli-options").TestAgentCliParseResult;
    handoffParsed: import("../cli-options").TestAgentCliParseResult;
    invalid: import("../cli-options").TestAgentCliParseResult;
    invalidHandoffCombo: import("../cli-options").TestAgentCliParseResult;
    selfTestMatrixParsed: import("../cli-options").TestAgentCliParseResult;
    invalidSelfTestMatrixCombo: import("../cli-options").TestAgentCliParseResult;
    invalidSelfTestTimeout: import("../cli-options").TestAgentCliParseResult;
    invalidSelfTestSelector: import("../cli-options").TestAgentCliParseResult;
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
    workOrderValidation: import("..").TestAgentWorkOrderContractValidation;
    stabilityWorkOrderValidation: import("..").TestAgentWorkOrderContractValidation;
    invalidStabilityWorkOrderValidation: import("..").TestAgentWorkOrderContractValidation;
    invalidWorkOrderValidation: import("..").TestAgentWorkOrderContractValidation;
    reportValidation: import("..").TestAgentReportContractValidation;
    verdictValidation: import("..").TestAgentVerdictContractValidation;
};
