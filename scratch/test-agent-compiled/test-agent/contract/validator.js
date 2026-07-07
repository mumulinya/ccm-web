"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTestAgentWorkOrderContract = validateTestAgentWorkOrderContract;
exports.assertTestAgentWorkOrderContract = assertTestAgentWorkOrderContract;
exports.validateTestAgentReportContract = validateTestAgentReportContract;
exports.assertTestAgentReportContract = assertTestAgentReportContract;
const work_order_1 = require("../work-order");
const schema_1 = require("./schema");
function pathFor(issue) {
    return issue.path.map(part => String(part)).join(".");
}
function zodIssues(error, severity = "error") {
    return error.issues.map(issue => ({
        severity,
        code: `contract_${issue.code}`,
        message: issue.message,
        path: pathFor(issue),
    }));
}
function workOrderIssue(issue) {
    return {
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        project: issue.project,
    };
}
function splitIssues(issues) {
    return {
        errors: issues.filter(issue => issue.severity === "error"),
        warnings: issues.filter(issue => issue.severity === "warning"),
    };
}
function validateTestAgentWorkOrderContract(input, overrides = {}) {
    const parsed = schema_1.TestAgentWorkOrderContractSchema.safeParse(input);
    if (!parsed.success) {
        const { errors, warnings } = splitIssues(zodIssues(parsed.error));
        return { valid: false, errors, warnings };
    }
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(parsed.data, overrides);
    const semanticIssues = normalized.issues.map(workOrderIssue);
    const { errors, warnings } = splitIssues(semanticIssues);
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        normalized: normalized.workOrder,
    };
}
function assertTestAgentWorkOrderContract(input, overrides = {}) {
    const result = validateTestAgentWorkOrderContract(input, overrides);
    if (!result.valid) {
        const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
        throw new Error(`Invalid TestAgent work order contract: ${message || "unknown error"}`);
    }
    return result.normalized;
}
function validateTestAgentReportContract(input) {
    const parsed = schema_1.TestAgentReportContractSchema.safeParse(input);
    if (!parsed.success) {
        const { errors, warnings } = splitIssues(zodIssues(parsed.error));
        return { valid: false, errors, warnings };
    }
    return { valid: true, errors: [], warnings: [] };
}
function assertTestAgentReportContract(input) {
    const result = validateTestAgentReportContract(input);
    if (!result.valid) {
        const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
        throw new Error(`Invalid TestAgent report contract: ${message || "unknown error"}`);
    }
    return input;
}
