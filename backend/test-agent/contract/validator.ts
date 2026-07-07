import { z } from "zod";
import { TestAgentOptions, TestAgentReport, TestAgentWorkOrder, WorkOrderIssue } from "../types";
import { normalizeTestAgentWorkOrder } from "../work-order";
import {
  TestAgentReportContractSchema,
  TestAgentWorkOrderContractSchema,
} from "./schema";

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

function pathFor(issue: z.ZodIssue) {
  return issue.path.map(part => String(part)).join(".");
}

function zodIssues(error: z.ZodError, severity: "error" | "warning" = "error"): TestAgentContractIssue[] {
  return error.issues.map(issue => ({
    severity,
    code: `contract_${issue.code}`,
    message: issue.message,
    path: pathFor(issue),
  }));
}

function workOrderIssue(issue: WorkOrderIssue): TestAgentContractIssue {
  return {
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    project: issue.project,
  };
}

function splitIssues(issues: TestAgentContractIssue[]) {
  return {
    errors: issues.filter(issue => issue.severity === "error"),
    warnings: issues.filter(issue => issue.severity === "warning"),
  };
}

export function validateTestAgentWorkOrderContract(input: unknown, overrides: Partial<TestAgentOptions> = {}): TestAgentWorkOrderContractValidation {
  const parsed = TestAgentWorkOrderContractSchema.safeParse(input);
  if (!parsed.success) {
    const { errors, warnings } = splitIssues(zodIssues(parsed.error));
    return { valid: false, errors, warnings };
  }

  const normalized = normalizeTestAgentWorkOrder(parsed.data as unknown as TestAgentWorkOrder, overrides);
  const semanticIssues = normalized.issues.map(workOrderIssue);
  const { errors, warnings } = splitIssues(semanticIssues);
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized: normalized.workOrder,
  };
}

export function assertTestAgentWorkOrderContract(input: unknown, overrides: Partial<TestAgentOptions> = {}) {
  const result = validateTestAgentWorkOrderContract(input, overrides);
  if (!result.valid) {
    const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
    throw new Error(`Invalid TestAgent work order contract: ${message || "unknown error"}`);
  }
  return result.normalized!;
}

export function validateTestAgentReportContract(input: unknown): TestAgentReportContractValidation {
  const parsed = TestAgentReportContractSchema.safeParse(input);
  if (!parsed.success) {
    const { errors, warnings } = splitIssues(zodIssues(parsed.error));
    return { valid: false, errors, warnings };
  }
  return { valid: true, errors: [], warnings: [] };
}

export function assertTestAgentReportContract(input: unknown): TestAgentReport {
  const result = validateTestAgentReportContract(input);
  if (!result.valid) {
    const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
    throw new Error(`Invalid TestAgent report contract: ${message || "unknown error"}`);
  }
  return input as TestAgentReport;
}
