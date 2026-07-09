import { TestAgentOptions, TestAgentReport, TestAgentVerdict, TestAgentWorkOrder } from "../types";
import { normalizeTestAgentWorkOrder } from "../work-order";
import { TestAgentBuiltWorkOrder } from "../work-order-builder";
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
export interface TestAgentHandoffContractValidation extends TestAgentWorkOrderContractValidation {
    workOrder?: TestAgentWorkOrder;
    built?: TestAgentBuiltWorkOrder;
    builderWarnings: string[];
    workOrderValidation?: TestAgentWorkOrderContractValidation;
}
export interface TestAgentReportContractValidation {
    valid: boolean;
    errors: TestAgentContractIssue[];
    warnings: TestAgentContractIssue[];
}
export interface TestAgentVerdictContractValidation {
    valid: boolean;
    errors: TestAgentContractIssue[];
    warnings: TestAgentContractIssue[];
}
export declare function handoffBuilderWarningIssues(warnings: string[]): TestAgentContractIssue[];
export declare function validateTestAgentHandoffContract(input: unknown, overrides?: Partial<TestAgentOptions>): TestAgentHandoffContractValidation;
export declare function assertTestAgentHandoffContract(input: unknown, overrides?: Partial<TestAgentOptions>): TestAgentHandoffContractValidation;
export declare function validateTestAgentWorkOrderContract(input: unknown, overrides?: Partial<TestAgentOptions>): TestAgentWorkOrderContractValidation;
export declare function assertTestAgentWorkOrderContract(input: unknown, overrides?: Partial<TestAgentOptions>): import("..").NormalizedTestAgentWorkOrder;
export declare function validateTestAgentReportContract(input: unknown): TestAgentReportContractValidation;
export declare function validateTestAgentVerdictContract(input: unknown): TestAgentVerdictContractValidation;
export declare function assertTestAgentReportContract(input: unknown): TestAgentReport;
export declare function assertTestAgentVerdictContract(input: unknown): TestAgentVerdict;
