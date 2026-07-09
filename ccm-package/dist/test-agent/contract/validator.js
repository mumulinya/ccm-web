"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handoffBuilderWarningIssues = handoffBuilderWarningIssues;
exports.validateTestAgentHandoffContract = validateTestAgentHandoffContract;
exports.assertTestAgentHandoffContract = assertTestAgentHandoffContract;
exports.validateTestAgentWorkOrderContract = validateTestAgentWorkOrderContract;
exports.assertTestAgentWorkOrderContract = assertTestAgentWorkOrderContract;
exports.validateTestAgentReportContract = validateTestAgentReportContract;
exports.validateTestAgentVerdictContract = validateTestAgentVerdictContract;
exports.assertTestAgentReportContract = assertTestAgentReportContract;
exports.assertTestAgentVerdictContract = assertTestAgentVerdictContract;
const work_order_1 = require("../work-order");
const work_order_builder_1 = require("../work-order-builder");
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
function handoffBuilderWarningIssues(warnings) {
    return warnings.map(message => ({
        severity: "warning",
        code: "handoff_builder_warning",
        message,
    }));
}
function splitIssues(issues) {
    return {
        errors: issues.filter(issue => issue.severity === "error"),
        warnings: issues.filter(issue => issue.severity === "warning"),
    };
}
function validateTestAgentHandoffContract(input, overrides = {}) {
    const parsed = schema_1.TestAgentHandoffContractSchema.safeParse(input);
    if (!parsed.success) {
        const { errors, warnings } = splitIssues(zodIssues(parsed.error));
        return { valid: false, errors, warnings, builderWarnings: [] };
    }
    const built = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(parsed.data);
    const builderWarningIssues = handoffBuilderWarningIssues(built.warnings);
    const workOrderValidation = validateTestAgentWorkOrderContract(built.workOrder, overrides);
    return {
        valid: workOrderValidation.valid,
        errors: workOrderValidation.errors,
        warnings: [...builderWarningIssues, ...workOrderValidation.warnings],
        normalized: workOrderValidation.normalized,
        workOrder: built.workOrder,
        built,
        builderWarnings: built.warnings,
        workOrderValidation,
    };
}
function assertTestAgentHandoffContract(input, overrides = {}) {
    const result = validateTestAgentHandoffContract(input, overrides);
    if (!result.valid) {
        const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
        throw new Error(`Invalid TestAgent handoff contract: ${message || "unknown error"}`);
    }
    return result;
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
function validateTestAgentVerdictContract(input) {
    const parsed = schema_1.TestAgentVerdictContractSchema.safeParse(input);
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
function assertTestAgentVerdictContract(input) {
    const result = validateTestAgentVerdictContract(input);
    if (!result.valid) {
        const message = result.errors.map(issue => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("; ");
        throw new Error(`Invalid TestAgent verdict contract: ${message || "unknown error"}`);
    }
    return input;
}
//# sourceMappingURL=validator.js.map