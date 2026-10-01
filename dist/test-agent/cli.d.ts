import { TestAgentArtifactVerification } from "./artifact-verifier";
import { TestAgentWorkOrderContractValidation } from "./contract";
import { TestAgentExecutionPlan } from "./execution-plan";
import { TestAgentSelfTestMatrixOptions, TestAgentSelfTestMatrixReport } from "./self-test-matrix";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
interface TestAgentCliWriter {
    write(message: string): unknown;
}
export interface TestAgentCliIo {
    stdout?: TestAgentCliWriter;
    stderr?: TestAgentCliWriter;
    readFile?: (file: string) => string;
    runAgent?: (input: TestAgentWorkOrder, options: TestAgentRuntimeOptions) => Promise<TestAgentReport>;
    runSelfTestMatrix?: (options: TestAgentSelfTestMatrixOptions) => Promise<TestAgentSelfTestMatrixReport>;
}
export declare function formatTestAgentCliValidationSummary(validation: TestAgentWorkOrderContractValidation): string;
export declare function formatTestAgentCliReportSummary(report: TestAgentReport): string;
export declare function formatTestAgentCliArtifactVerificationSummary(verification: TestAgentArtifactVerification): string;
export declare function formatTestAgentCliExecutionPlanSummary(plan: TestAgentExecutionPlan): string;
export declare function runTestAgentCli(args?: string[], io?: TestAgentCliIo): Promise<{
    exitCode: number;
}>;
export {};
