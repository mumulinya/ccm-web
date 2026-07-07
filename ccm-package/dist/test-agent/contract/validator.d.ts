import { TestAgentOptions, TestAgentReport } from "../types";
import { normalizeTestAgentWorkOrder } from "../work-order";
export interface TestAgentContractIssue {
    severity: "error" | "warning";
    code: string;
    message: string;
    path?: string;
    project?: string;
}
export interface TestAgentWorkOrderContractValidation {
    valid: boolean;
    errors: TestAgentContractIssue[];
    warnings: TestAgentContractIssue[];
    normalized?: ReturnType<typeof normalizeTestAgentWorkOrder>["workOrder"];
}
export interface TestAgentReportContractValidation {
    valid: boolean;
    errors: TestAgentContractIssue[];
    warnings: TestAgentContractIssue[];
}
export declare function validateTestAgentWorkOrderContract(input: unknown, overrides?: Partial<TestAgentOptions>): TestAgentWorkOrderContractValidation;
export declare function assertTestAgentWorkOrderContract(input: unknown, overrides?: Partial<TestAgentOptions>): import("..").NormalizedTestAgentWorkOrder;
export declare function validateTestAgentReportContract(input: unknown): TestAgentReportContractValidation;
export declare function assertTestAgentReportContract(input: unknown): TestAgentReport;
