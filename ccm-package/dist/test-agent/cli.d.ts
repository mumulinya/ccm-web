import { TestAgentArtifactVerification } from "./artifact-verifier";
import { TestAgentWorkOrderContractValidation } from "./contract";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
interface TestAgentCliWriter {
    write(message: string): unknown;
}
export interface TestAgentCliIo {
    stdout?: TestAgentCliWriter;
    stderr?: TestAgentCliWriter;
    readFile?: (file: string) => string;
    runAgent?: (input: TestAgentWorkOrder, options: TestAgentRuntimeOptions) => Promise<TestAgentReport>;
}
export declare function formatTestAgentCliValidationSummary(validation: TestAgentWorkOrderContractValidation): string;
export declare function formatTestAgentCliReportSummary(report: TestAgentReport): string;
export declare function formatTestAgentCliArtifactVerificationSummary(verification: TestAgentArtifactVerification): string;
export declare function runTestAgentCli(args?: string[], io?: TestAgentCliIo): Promise<{
    exitCode: number;
}>;
export {};
