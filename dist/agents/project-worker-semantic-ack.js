"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectWorkerSemanticAckPrompt = buildProjectWorkerSemanticAckPrompt;
exports.buildProjectWorkerSemanticAckRepairPrompt = buildProjectWorkerSemanticAckRepairPrompt;
exports.projectWorkerSemanticAckCanRepair = projectWorkerSemanticAckCanRepair;
exports.validateProjectWorkerSemanticAck = validateProjectWorkerSemanticAck;
exports.runProjectWorkerSemanticAckSelfTest = runProjectWorkerSemanticAckSelfTest;
function text(value, max = 2000) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function list(value, max = 80, itemMax = 800) {
    const source = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return [...new Set(source.map(item => text(item, itemMax)).filter(Boolean))].slice(0, max);
}
function parseJsonObject(value) {
    const source = String(value || "").trim();
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || source;
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start < 0 || end <= start)
        return null;
    try {
        return JSON.parse(fenced.slice(start, end + 1));
    }
    catch {
        return null;
    }
}
function buildProjectWorkerSemanticAckPrompt(workItem) {
    return [
        "[CCM PROJECT WORKER ACK PREFLIGHT]",
        "This is a read-only acknowledgement turn. Do not modify files, run commands, invoke tools, or perform implementation work.",
        "Return exactly one JSON object and no prose.",
        JSON.stringify({
            schema: "ccm-project-worker-semantic-ack-request-v1",
            requirementChecksum: workItem.requirementChecksum,
            planChecksum: workItem.planChecksum,
            stepId: workItem.stepId,
            businessGoal: workItem.businessGoal,
            title: workItem.title,
            objective: workItem.objective,
            acceptanceCriterionIds: workItem.acceptanceCriterionIds,
            acceptance: workItem.acceptance,
            plannedScope: workItem.files,
            forbiddenScope: workItem.forbiddenPaths,
            verificationPlan: workItem.verification.map(item => item.command || item.expected).filter(Boolean),
        }),
        "Required response schema:",
        JSON.stringify({
            schema: "ccm-project-worker-semantic-ack-v1",
            requirementChecksum: "echo exactly",
            planChecksum: "echo exactly",
            stepId: "echo exactly",
            understoodGoal: "brief understanding without changing the business goal",
            acceptanceCriterionIds: ["echo every assigned criterion ID"],
            plannedScope: ["planned file/path scope"],
            forbiddenScope: ["forbidden scope"],
            verificationPlan: ["planned verification"],
            unclear: [],
        }),
    ].join("\n");
}
function buildProjectWorkerSemanticAckRepairPrompt(workItem, issues) {
    return [
        "[CCM PROJECT WORKER ACK CORRECTION]",
        "Your previous acknowledgement failed strict validation only for the listed fields.",
        `Validation errors: ${issues.join(", ")}`,
        "This is one final read-only correction attempt. Do not modify files, run commands, invoke tools, or perform implementation work.",
        "Copy every opaque checksum and ID character-for-character from the request below. Return exactly one JSON object and no prose.",
        buildProjectWorkerSemanticAckPrompt(workItem),
    ].join("\n");
}
function projectWorkerSemanticAckCanRepair(issues) {
    return issues.length > 0 && issues.every(issue => [
        "requirement_checksum_mismatch",
        "plan_checksum_mismatch",
        "acceptance_criterion_ids_mismatch",
    ].includes(issue));
}
function validateProjectWorkerSemanticAck(workItem, output) {
    const receipt = parseJsonObject(output);
    const issues = [];
    if (receipt?.schema !== "ccm-project-worker-semantic-ack-v1")
        issues.push("ack_schema_invalid");
    if (text(receipt?.requirementChecksum, 128) !== workItem.requirementChecksum)
        issues.push("requirement_checksum_mismatch");
    if (text(receipt?.planChecksum, 128) !== workItem.planChecksum)
        issues.push("plan_checksum_mismatch");
    if (text(receipt?.stepId, 160) !== workItem.stepId)
        issues.push("step_id_mismatch");
    if (!text(receipt?.understoodGoal, 1000))
        issues.push("understood_goal_missing");
    const expectedCriteria = [...workItem.acceptanceCriterionIds].sort();
    const receivedCriteria = list(receipt?.acceptanceCriterionIds, 80, 160).sort();
    if (JSON.stringify(expectedCriteria) !== JSON.stringify(receivedCriteria))
        issues.push("acceptance_criterion_ids_mismatch");
    if (list(receipt?.unclear, 30, 500).length)
        issues.push("ack_has_unresolved_questions");
    return {
        ok: issues.length === 0,
        issues,
        receipt: receipt ? {
            schema: "ccm-project-worker-semantic-ack-v1",
            requirementChecksum: text(receipt.requirementChecksum, 128),
            planChecksum: text(receipt.planChecksum, 128),
            stepId: text(receipt.stepId, 160),
            understoodGoal: text(receipt.understoodGoal, 1000),
            acceptanceCriterionIds: receivedCriteria,
            plannedScope: list(receipt.plannedScope, 80, 500),
            forbiddenScope: list(receipt.forbiddenScope, 80, 500),
            verificationPlan: list(receipt.verificationPlan, 80, 500),
            unclear: list(receipt.unclear, 30, 500),
            contentStored: false,
        } : null,
    };
}
function runProjectWorkerSemanticAckSelfTest() {
    const workItem = {
        requirementChecksum: "req-checksum",
        planChecksum: "plan-checksum",
        stepId: "step-web",
        businessGoal: "用户可以导出订单",
        title: "实现导出入口",
        objective: "在订单页增加导出功能",
        acceptanceCriterionIds: ["ac-export"],
        acceptance: ["导出文件只包含筛选结果"],
        files: ["src/orders/export.ts"],
        forbiddenPaths: ["src/billing/**"],
        verification: [{ command: "npm test", expected: "测试通过" }],
    };
    const output = JSON.stringify({ schema: "ccm-project-worker-semantic-ack-v1", requirementChecksum: "req-checksum", planChecksum: "plan-checksum", stepId: "step-web", understoodGoal: "实现筛选订单导出", acceptanceCriterionIds: ["ac-export"], plannedScope: ["src/orders/export.ts"], forbiddenScope: ["src/billing/**"], verificationPlan: ["npm test"], unclear: [] });
    const typo = JSON.stringify({ schema: "ccm-project-worker-semantic-ack-v1", requirementChecksum: "req-checksum", planChecksum: "plan-cheksum", stepId: "step-web", understoodGoal: "实现筛选订单导出", acceptanceCriterionIds: ["ac-export"], plannedScope: ["src/orders/export.ts"], forbiddenScope: ["src/billing/**"], verificationPlan: ["npm test"], unclear: [] });
    const typoResult = validateProjectWorkerSemanticAck(workItem, typo);
    const missingGoal = JSON.stringify({ schema: "ccm-project-worker-semantic-ack-v1", requirementChecksum: "req-checksum", planChecksum: "plan-checksum", stepId: "step-web", understoodGoal: "", acceptanceCriterionIds: ["ac-export"], unclear: [] });
    const missingGoalResult = validateProjectWorkerSemanticAck(workItem, missingGoal);
    const criterionIdTypo = JSON.stringify({ schema: "ccm-project-worker-semantic-ack-v1", requirementChecksum: "req-checksum", planChecksum: "plan-checksum", stepId: "step-web", understoodGoal: "实现筛选订单导出", acceptanceCriterionIds: ["ac-exprot"], plannedScope: ["src/orders/export.ts"], forbiddenScope: ["src/billing/**"], verificationPlan: ["npm test"], unclear: [] });
    const criterionIdTypoResult = validateProjectWorkerSemanticAck(workItem, criterionIdTypo);
    const repairPrompt = buildProjectWorkerSemanticAckRepairPrompt(workItem, typoResult.issues);
    const checks = {
        validAckAccepted: validateProjectWorkerSemanticAck(workItem, output).ok,
        opaqueChecksumTypoCanRetryOnce: projectWorkerSemanticAckCanRepair(typoResult.issues),
        opaqueCriterionIdTypoCanRetryOnce: projectWorkerSemanticAckCanRepair(criterionIdTypoResult.issues),
        missingSemanticUnderstandingCannotUseChecksumRetry: !projectWorkerSemanticAckCanRepair(missingGoalResult.issues),
        repairPromptCarriesExactFrozenChecksum: repairPrompt.includes('"planChecksum":"plan-checksum"') && repairPrompt.includes("one final read-only correction attempt"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=project-worker-semantic-ack.js.map