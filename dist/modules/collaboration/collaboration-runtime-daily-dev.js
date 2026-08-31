"use strict";
// collaboration-runtime-daily-dev.ts — merged from 2 part files (behavior-freeze merge).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyDevCompletionGateSelfTest = getDailyDevCompletionGateSelfTest;
exports.runMemoryDispatchGateReceiptValidationSelfTest = runMemoryDispatchGateReceiptValidationSelfTest;
exports.runPressureMemoryProvenanceReceiptUsageSelfTest = runPressureMemoryProvenanceReceiptUsageSelfTest;
exports.runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest = runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest;
exports.runGlobalMemoryUsageReceiptValidationSelfTest = runGlobalMemoryUsageReceiptValidationSelfTest;
exports.runGlobalMemoryHealthGateReceiptValidationSelfTest = runGlobalMemoryHealthGateReceiptValidationSelfTest;
exports.runReadPlanRevalidationGateReceiptValidationSelfTest = runReadPlanRevalidationGateReceiptValidationSelfTest;
exports.runApiMicrocompactReceiptValidationSelfTest = runApiMicrocompactReceiptValidationSelfTest;
exports.runPostCompactReinjectionGateReceiptValidationSelfTest = runPostCompactReinjectionGateReceiptValidationSelfTest;
exports.runPostCompactDispatchMarkerVisibleSelfTest = runPostCompactDispatchMarkerVisibleSelfTest;
exports.buildDailyDevWorkflowRehearsal = buildDailyDevWorkflowRehearsal;
exports.selectDailyDevSmokeTarget = selectDailyDevSmokeTarget;
exports.createDailyDevSmokeTask = createDailyDevSmokeTask;
exports.getDailyDevSmokeStatus = getDailyDevSmokeStatus;
exports.runAgentCliProbe = runAgentCliProbe;
exports.taskRequiresAgentQa = taskRequiresAgentQa;
exports.getTaskAgentQaGate = getTaskAgentQaGate;
exports.runRuntimeFallbackProbe = runRuntimeFallbackProbe;
exports.normalizeStringArray = normalizeStringArray;
exports.buildEvidenceGateFollowUps = buildEvidenceGateFollowUps;
exports.isReviewLikeAgentName = isReviewLikeAgentName;
exports.inferIndependentReviewSubject = inferIndependentReviewSubject;
exports.getReceiptTestAgentHandoff = getReceiptTestAgentHandoff;
exports.getReceiptIndependentReviewSubject = getReceiptIndependentReviewSubject;
exports.findLatestTestAgentReviewReceipt = findLatestTestAgentReviewReceipt;
exports.buildTestAgentReviewRecheckFollowUp = buildTestAgentReviewRecheckFollowUp;
exports.buildIndependentReviewGateFollowUps = buildIndependentReviewGateFollowUps;
exports.buildFailedIndependentReviewReworkFollowUps = buildFailedIndependentReviewReworkFollowUps;
exports.buildPostReviewSpotCheckFollowUps = buildPostReviewSpotCheckFollowUps;
exports.buildCodedCoordinatorReview = buildCodedCoordinatorReview;
exports.writeSse = writeSse;
exports.emitAssignmentStatus = emitAssignmentStatus;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const agent_qa_service_1 = require("./agent-qa-service");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_receipts_1 = require("./agent-receipts");
const agent_notifications_1 = require("./agent-notifications");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const runtime_1 = require("../../agents/runtime");
const collaboration_resilience_1 = require("./collaboration-resilience");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_cross_agent_runtime_1 = require("./collaboration-runtime-cross-agent-runtime");
const collaboration_runtime_test_agent_handoff_1 = require("./collaboration-runtime-test-agent-handoff");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const rework_policy_1 = require("./rework-policy");
// ===== merged from collaboration-runtime-daily-dev-part-01.ts =====
function getDailyDevCompletionGateSelfTest() {
    const task = { workflow_type: "daily_dev", title: "self-test", requires_code_changes: true };
    const taskWithActualChanges = {
        ...task,
        file_changes: {
            files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }],
            count: 1,
        },
    };
    const coordinatorResult = { agent: "coordinator", assignments: [], dispatchPolicy: {} };
    const plannedCoordinatorResult = {
        agent: "coordinator",
        assignments: [{ project: "frontend", task: "修改页面并提交结果说明" }],
        coordinationPlan: {
            strategy: "research_synthesis_implementation_verification",
            phases: ["理解需求", "分配任务", "协同执行", "复盘验收"],
            targets: ["frontend"],
        },
        dispatchPolicy: {},
    };
    const doneReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成测试改动",
        actions: ["修改页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test"],
        blockers: [],
        needs: [],
    };
    const doneReceiptText = [
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n");
    const doneWorkerOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("frontend", doneReceiptText, doneReceipt);
    const staleAckThenDoneReceipts = (0, collaboration_runtime_status_helpers_1.parseFormattedReceiptsFromText)([
        (0, agent_notifications_1.formatCollectedAgentOutput)("frontend", "ACK 完成，等待进入实现阶段", {
            ...doneReceipt,
            status: "needs_info",
            summary: "ACK-only 前置确认完成，等待进入实现阶段",
            filesChanged: [],
            verification: [],
        }),
        doneWorkerOutput,
    ].join("\n"));
    const latestDoneReceiptSupersedesStaleAck = staleAckThenDoneReceipts.length === 1
        && staleAckThenDoneReceipts[0]?.agent === "frontend"
        && staleAckThenDoneReceipts[0]?.status === "done";
    const embeddedFenceReceipt = {
        ...doneReceipt,
        agent: "test-agent",
        postReviewSpotCheck: { required: true, pass: true, status: "passed" },
        testAgentHandoff: {
            metadata: {
                coordinatorOutputPreview: "技术上下文包含协议字样 CCM_AGENT_RECEIPT 和围栏：```ts\nexport const sample = true\n```",
            },
        },
    };
    const embeddedFenceReceiptOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("test-agent", [
        "TestAgent 已通过，主 Agent 抽查也已通过。",
        "CCM_AGENT_RECEIPT",
        "```json",
        JSON.stringify(embeddedFenceReceipt, null, 2),
        "```",
    ].join("\n"), embeddedFenceReceipt);
    const parsedEmbeddedFenceReceipt = (0, collaboration_runtime_status_helpers_1.parseFormattedReceiptsFromText)(embeddedFenceReceiptOutput)[0] || null;
    const embeddedMarkdownFenceDoesNotTruncateReceipt = parsedEmbeddedFenceReceipt?.postReviewSpotCheck?.pass === true;
    const noChild = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, "主 Agent 自己说已经完成", task);
    const withChild = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, [
        "【frontend】",
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n"), task);
    const withFailedChild = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "needs_user", content: "主 Agent 复盘发现子 Agent 运行失败" }, coordinatorResult, [
        "【frontend】",
        "执行失败",
        "",
        "结构化回执：",
        "- 状态：failed",
        "- 摘要：spawn EPERM",
        "- 动作：未填写",
        "- 文件：无",
        "- 验证：未提供",
        "- 阻塞：spawn EPERM",
        "- 需要补充：检查运行环境",
    ].join("\n"), task);
    const withActualChange = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, plannedCoordinatorResult, doneWorkerOutput, taskWithActualChanges);
    const withActualChangeNoCoordinationEvidence = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, doneWorkerOutput, taskWithActualChanges);
    const waitingExecutionWithCompleteEvidence = { ...withActualChange, status: "waiting", detail: "" };
    const waitingSummaryWithCompleteEvidence = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(taskWithActualChanges, waitingExecutionWithCompleteEvidence, "waiting");
    const waitingEvidencePromotesToDone = (0, collaboration_runtime_runtime_tools_1.canCompleteDailyDevFromDeliverySummary)(taskWithActualChanges, waitingExecutionWithCompleteEvidence, waitingSummaryWithCompleteEvidence);
    const blockedVerificationReceipt = { ...doneReceipt, verification: ["mvn test -B -q → 仍需交互审批，命令被沙箱拦截"], blockers: ["mvn test 被沙箱拦截"], needs: ["用户本地补充 mvn test 输出"] };
    const optionalRecommendationDoesNotBlock = !(0, collaboration_runtime_status_helpers_1.receiptHasOpenNeeds)({ ...doneReceipt, blockers: [], needs: ["建议用户 npm start 后人工确认页面样式"] });
    const coordinatorOwnedReviewFollowUpDoesNotBlock = !(0, collaboration_runtime_status_helpers_1.receiptHasOpenNeeds)({
        ...doneReceipt,
        blockers: [],
        needs: [
            "等待主 Agent 安排 TestAgent 独立复核",
            "等待主 Agent 最终抽查并总结",
            "主 Agent 最终抽查",
            "TestAgent 独立复核",
            "请 @coordinator 安排 TestAgent 独立复核，或主 Agent 直接抽查验收",
            "等待 TestAgent 独立复核",
            "需要主 Agent 抽查后总结",
            "等待主 Agent 逐项验收修改证据和验证结果；主 Agent 后续可安排独立复核",
            "主 Agent 调用 TestAgent 重新执行独立复核，确认 CCM_TEST_AGENT_REVIEW=1 路径通过",
        ],
    });
    const blockedVerificationOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("frontend", "验证被沙箱拦截", blockedVerificationReceipt);
    const blockedVerificationGate = (0, collaboration_runtime_status_helpers_1.getVerificationEvidenceGate)([blockedVerificationReceipt]);
    const zeroFailureVerificationGate = (0, collaboration_runtime_status_helpers_1.getVerificationEvidenceGate)([{ verification: ["npm test — 11/11 通过，0 failed（exit code 0）"] }]);
    const withDoneReceiptButOpenNeeds = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, plannedCoordinatorResult, blockedVerificationOutput, taskWithActualChanges);
    const blockedSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(taskWithActualChanges, withDoneReceiptButOpenNeeds, "waiting");
    const blockedEvidenceDoesNotPromote = !(0, collaboration_runtime_runtime_tools_1.canCompleteDailyDevFromDeliverySummary)(taskWithActualChanges, withDoneReceiptButOpenNeeds, blockedSummary);
    const withActualChangeNoExecutedVerification = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)({ status: "complete", content: "主 Agent 复盘完成" }, plannedCoordinatorResult, (0, agent_notifications_1.formatCollectedAgentOutput)("frontend", [
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：建议运行 npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n"), {
        ...doneReceipt,
        verification: ["建议运行 npm test"],
    }), taskWithActualChanges);
    const runnerMergedReceipt = (0, agent_receipts_1.extractAgentReceipt)([
        "```json",
        "{\"ccm_receipt\":true,\"status\":\"done\",\"summary\":\"完成测试改动\",\"actions\":[\"修改页面\"],\"filesChanged\":[\"src/App.vue\"],\"verification\":[\"等待外部 runner 验证\"],\"blockers\":[],\"needs\":[]}",
        "```",
        "CCM_RUNNER_VERIFICATION",
        "```json",
        "{\"ccm_runner_verification\":true,\"status\":\"passed\",\"verification\":[\"npm run check passed by external runner (exit 0)\",\"npm run build passed by external runner (exit 0)\"],\"failed\":[]}",
        "```",
    ].join("\n"), "frontend");
    const runnerVerificationMerged = !!runnerMergedReceipt
        && runnerMergedReceipt.verification.includes("npm run check passed by external runner (exit 0)")
        && runnerMergedReceipt.verification.includes("npm run build passed by external runner (exit 0)");
    return {
        noChildReceiptStatus: noChild.status,
        noChildReceiptDetail: noChild.detail,
        withChildReceiptStatus: withChild.status,
        withChildReceiptDetail: withChild.detail,
        withFailedChildStatus: withFailedChild.status,
        withFailedChildDetail: withFailedChild.detail,
        withActualChangeStatus: withActualChange.status,
        withActualChangeNoCoordinationEvidenceStatus: withActualChangeNoCoordinationEvidence.status,
        withActualChangeNoCoordinationEvidenceDetail: withActualChangeNoCoordinationEvidence.detail,
        waitingEvidencePromotesToDone,
        blockedVerificationFailsGate: blockedVerificationGate.pass === false && blockedVerificationGate.failed.length > 0,
        zeroFailuresCountAsPass: zeroFailureVerificationGate.pass === true && zeroFailureVerificationGate.failed.length === 0,
        optionalRecommendationDoesNotBlock,
        coordinatorOwnedReviewFollowUpDoesNotBlock,
        latestDoneReceiptSupersedesStaleAck,
        embeddedMarkdownFenceDoesNotTruncateReceipt,
        doneReceiptWithOpenNeedsStatus: withDoneReceiptButOpenNeeds.status,
        blockedEvidenceDoesNotPromote,
        withActualChangeNoExecutedVerificationStatus: withActualChangeNoExecutedVerification.status,
        withActualChangeNoExecutedVerificationDetail: withActualChangeNoExecutedVerification.detail,
        runnerVerificationMerged,
        pass: noChild.status === "waiting"
            && withChild.status === "waiting"
            && withFailedChild.status === "failed"
            && withActualChange.status === "done"
            && waitingEvidencePromotesToDone
            && blockedVerificationGate.pass === false
            && zeroFailureVerificationGate.pass === true
            && optionalRecommendationDoesNotBlock
            && coordinatorOwnedReviewFollowUpDoesNotBlock
            && latestDoneReceiptSupersedesStaleAck
            && embeddedMarkdownFenceDoesNotTruncateReceipt
            && withDoneReceiptButOpenNeeds.status === "waiting"
            && blockedEvidenceDoesNotPromote
            && withActualChangeNoCoordinationEvidence.status === "waiting"
            && withActualChangeNoExecutedVerification.status === "waiting"
            && runnerVerificationMerged,
    };
}
function runMemoryDispatchGateReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runMemoryDispatchGateReceiptValidationSelfTest();
}
function runPressureMemoryProvenanceReceiptUsageSelfTest() {
    return require("./collaboration-receipt-self-tests").runPressureMemoryProvenanceReceiptUsageSelfTest();
}
function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest();
}
function runGlobalMemoryUsageReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runGlobalMemoryUsageReceiptValidationSelfTest();
}
function runGlobalMemoryHealthGateReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runGlobalMemoryHealthGateReceiptValidationSelfTest();
}
function runReadPlanRevalidationGateReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runReadPlanRevalidationGateReceiptValidationSelfTest();
}
function runApiMicrocompactReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runApiMicrocompactReceiptValidationSelfTest();
}
function runPostCompactReinjectionGateReceiptValidationSelfTest() {
    return require("./collaboration-receipt-self-tests").runPostCompactReinjectionGateReceiptValidationSelfTest();
}
function runPostCompactDispatchMarkerVisibleSelfTest() {
    return require("./collaboration-receipt-self-tests").runPostCompactDispatchMarkerVisibleSelfTest();
}
function buildDailyDevWorkflowRehearsal(payload = {}) {
    const groups = (0, storage_1.loadGroups)();
    const configs = (0, db_1.getConfigs)();
    const groupId = payload.group_id || payload.groupId || groups[0]?.id || "";
    const group = groups.find((item) => item.id === groupId) || groups[0] || null;
    const { normalizedGroup, coordinator, routableMembers, readyMembers } = (0, collaboration_runtime_status_helpers_1.getReadyDailyDevMembers)(group, configs);
    const selectedMember = readyMembers[0] || routableMembers[0] || { project: "demo-agent" };
    const verificationCommands = (0, collaboration_runtime_runtime_tools_1.getConfiguredProjectVerificationCommands)(selectedMember.project);
    const verificationText = verificationCommands[0] || "npm run check";
    const businessGoal = (0, collaboration_runtime_runtime_tools_1.compactFormText)(payload.business_goal || payload.businessGoal || "演练：给设置页增加一个业务开发闭环状态提示", "演练：给设置页增加一个业务开发闭环状态提示");
    const description = (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
        business_goal: businessGoal,
        scope: payload.scope || "由主 Agent 拆给一个子 Agent，子 Agent 返回结构化结果说明，主 Agent 完成复盘。",
        documents: payload.documents || "演练不读取真实业务文档，仅验证任务模板和完成门禁。",
        acceptance: payload.acceptance || "必须有子 Agent 结果说明、主 Agent 复盘、实际文件变更证据和交付摘要。",
        constraints: payload.constraints || "不创建真实任务，不修改业务仓库。",
        requires_code_changes: true,
    });
    const rehearsalReceipt = {
        agent: selectedMember.project,
        status: "done",
        summary: "完成演练改动",
        actions: ["修改演练文件"],
        filesChanged: ["src/daily-dev-rehearsal.ts"],
        verification: [verificationText],
        blockers: [],
        needs: [],
    };
    const receiptText = [
        `【${selectedMember.project}】`,
        "已完成演练改动。",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成演练改动",
        "- 动作：修改演练文件",
        "- 文件：src/daily-dev-rehearsal.ts",
        `- 验证：${verificationText}`,
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n");
    const workerNotificationOutput = (0, agent_notifications_1.formatCollectedAgentOutput)(selectedMember.project, receiptText, rehearsalReceipt);
    const rehearsalMemory = (0, memory_1.appendWorkerLedger)((0, memory_1.createEmptyGroupMemory)("daily-dev-rehearsal"), {
        taskId: "daily-dev-rehearsal",
        project: selectedMember.project,
        status: "completed",
        receiptStatus: "done",
        summary: rehearsalReceipt.summary,
        filesChanged: rehearsalReceipt.filesChanged,
        verification: rehearsalReceipt.verification,
        blockers: [],
        needs: [],
    });
    const rehearsalScratchpadContext = (0, memory_1.buildGroupMemoryContext)(rehearsalMemory);
    const review = { status: "complete", content: "主 Agent 复盘完成，演练满足验收证据。" };
    const coordinatorResult = {
        agent: coordinator.project,
        assignments: [{ project: selectedMember.project, task: "执行演练改动" }],
        coordinationPlan: {
            mode: "cc-style-coordinator",
            strategy: "research_synthesis_implementation_verification",
            executionOrder: "parallel",
            phases: ["理解需求", "研究与综合", "分配任务", "协同执行", "复盘验收"],
            targets: [selectedMember.project],
            missingInfo: [],
        },
        dispatchPolicy: {},
        runtime: "rehearsal",
    };
    const baseTask = {
        id: "daily-dev-rehearsal",
        title: businessGoal,
        description,
        group_id: normalizedGroup?.id || "",
        workflow_type: "daily_dev",
        requires_code_changes: true,
        requires_verification: true,
        business_goal: businessGoal,
        acceptance_criteria: "演练验收：必须记录主 Agent 计划、返工证据和已执行验证。",
        source_documents: "接口：POST /api/rehearsal/check\n字段：enabled(boolean), message(string)\n验收：报告展示主 Agent 计划和返工证据。",
    };
    const taskDocumentContext = (0, collaboration_runtime_plan_tools_1.buildTaskSourceDocumentsContext)(baseTask);
    const noChangeExecution = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)(review, coordinatorResult, workerNotificationOutput, baseTask);
    const taskWithChanges = {
        ...baseTask,
        file_changes: {
            files: [{
                    path: "src/daily-dev-rehearsal.ts",
                    statusText: "修改",
                    statusKind: "modified",
                    diff: { additions: 3, deletions: 1 },
                }],
            count: 1,
        },
    };
    const doneExecution = (0, collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus)(review, coordinatorResult, workerNotificationOutput, taskWithChanges);
    const propagatedAssignmentSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(taskWithChanges, doneExecution, doneExecution.status === "done" ? "done" : "waiting");
    const deliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(taskWithChanges, {
        ...doneExecution,
        assignments: [...(doneExecution.assignments || []), {
                project: selectedMember.project,
                task: "主 Agent 返工工作单：补齐演练验证证据",
                reason: "演练模拟：首次回执缺少验证证据",
                rework: true,
                attempt: 2,
                continuationOf: selectedMember.project,
                continuationStrategy: "same_worker_scratchpad",
            }],
    }, doneExecution.status === "done" ? "done" : "waiting");
    const coordinatorProtocol = (0, group_orchestrator_1.runCoordinatorProtocolSelfTest)();
    const reworkProtocol = (0, collaboration_runtime_test_agent_handoff_1.runCoordinatorReworkProtocolSelfTest)();
    const notificationPass = workerNotificationOutput.includes("<task-notification>")
        && (0, agent_notifications_1.extractTaskNotificationTag)(workerNotificationOutput, "task-id") === selectedMember.project
        && (0, agent_notifications_1.extractTaskNotificationTag)(workerNotificationOutput, "status") === "completed";
    const scratchpadPass = rehearsalScratchpadContext.includes("Worker scratchpad")
        && rehearsalScratchpadContext.includes("完成演练改动")
        && rehearsalScratchpadContext.includes(verificationText);
    const pass = !!normalizedGroup
        && readyMembers.length > 0
        && coordinatorProtocol.pass
        && reworkProtocol.pass
        && notificationPass
        && scratchpadPass
        && taskDocumentContext.includes("/api/rehearsal/check")
        && noChangeExecution.status === "waiting"
        && doneExecution.status === "done"
        && (doneExecution.assignments || []).length > 0
        && propagatedAssignmentSummary.assignment_count > 0
        && deliverySummary.actual_file_change_count > 0
        && deliverySummary.has_final_review
        && deliverySummary.assignment_count > 0
        && deliverySummary.continuation_count > 0
        && deliverySummary.rework_count > 0
        && deliverySummary.verification_gate_passed;
    return {
        success: true,
        pass,
        status: pass ? "ok" : "fail",
        generated_at: new Date().toISOString(),
        group: normalizedGroup ? {
            id: normalizedGroup.id,
            name: normalizedGroup.name || normalizedGroup.id,
            coordinator: coordinator.project,
            readyMemberCount: readyMembers.length,
            selectedMember: selectedMember.project,
        } : null,
        steps: [
            { id: "business-description", status: businessGoal ? "ok" : "fail", message: "业务描述已生成主 Agent 工作单" },
            { id: "task-document-context", status: taskDocumentContext.includes("/api/rehearsal/check") ? "ok" : "fail", message: taskDocumentContext.includes("/api/rehearsal/check") ? "任务表单里的业务/接口文档会进入主 Agent 文档上下文" : "任务级文档未进入主 Agent 文档上下文" },
            { id: "coordinator-protocol", status: coordinatorProtocol.pass ? "ok" : "fail", message: coordinatorProtocol.pass ? `主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 生成 ${coordinatorProtocol.assignmentCount} 个自包含子任务` : "主 Agent 协调协议自测失败" },
            { id: "coordinator-rework-protocol", status: reworkProtocol.pass ? "ok" : "fail", message: reworkProtocol.pass ? "主 Agent 验收发现缺口时会生成自包含返工工作单" : "主 Agent 返工协议自测失败" },
            { id: "worker-notification", status: notificationPass ? "ok" : "fail", message: notificationPass ? "子 Agent 演练输出已封装为 task-notification 并可被主 Agent 识别" : "子 Agent 演练输出未形成有效 task-notification" },
            { id: "worker-scratchpad", status: scratchpadPass ? "ok" : "fail", message: scratchpadPass ? "Worker 通知已写入协作 scratchpad，可进入后续上下文" : "Worker 通知未进入协作 scratchpad 上下文" },
            { id: "group-ready", status: normalizedGroup && readyMembers.length > 0 ? "ok" : "fail", message: normalizedGroup ? `可用子 Agent ${readyMembers.length} 个` : "没有可用开发群聊" },
            { id: "receipt-gate", status: noChangeExecution.status === "waiting" ? "ok" : "fail", message: "只有子 Agent 结果说明但没有实际变更时不会误判完成" },
            { id: "file-change-gate", status: doneExecution.status === "done" ? "ok" : "fail", message: "补齐实际文件变更证据后允许完成" },
            { id: "execution-assignment-propagation", status: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "ok" : "fail", message: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "执行结果会携带主 Agent 派发证据，交付摘要可直接验收" : "执行结果缺少主 Agent 派发证据" },
            { id: "assignment-evidence", status: deliverySummary.assignment_count > 0 ? "ok" : "fail", message: deliverySummary.assignment_count > 0 ? `交付摘要捕获 ${deliverySummary.assignment_count} 条主 Agent 派发证据` : "交付摘要未捕获主 Agent 派发证据" },
            { id: "continuation-evidence", status: deliverySummary.continuation_count > 0 ? "ok" : "fail", message: deliverySummary.continuation_count > 0 ? `交付摘要捕获 ${deliverySummary.continuation_count} 条续跑证据` : "交付摘要未捕获续跑证据" },
            { id: "rework-evidence", status: deliverySummary.rework_count > 0 ? "ok" : "fail", message: deliverySummary.rework_count > 0 ? `交付摘要捕获 ${deliverySummary.rework_count} 条返工证据` : "交付摘要未捕获主 Agent 返工证据" },
            { id: "verification-gate", status: deliverySummary.verification_gate_passed ? "ok" : "fail", message: "已执行验证记录会进入交付摘要并作为完成门禁" },
            { id: "delivery-summary", status: deliverySummary.actual_file_change_count > 0 ? "ok" : "fail", message: `交付摘要捕获 ${deliverySummary.actual_file_change_count} 个实际文件变更` },
        ],
        task_description: description,
        task_document_context: taskDocumentContext,
        no_change_result: { status: noChangeExecution.status, detail: noChangeExecution.detail },
        done_result: { status: doneExecution.status, detail: doneExecution.detail },
        propagated_assignment_summary: {
            assignment_count: propagatedAssignmentSummary.assignment_count,
            assignments: propagatedAssignmentSummary.assignment_evidence,
        },
        worker_notification: {
            status: (0, agent_notifications_1.extractTaskNotificationTag)(workerNotificationOutput, "status"),
            task_id: (0, agent_notifications_1.extractTaskNotificationTag)(workerNotificationOutput, "task-id"),
            receipt_status: (0, agent_notifications_1.extractTaskNotificationTag)(workerNotificationOutput, "receipt-status"),
        },
        scratchpad_context: rehearsalScratchpadContext,
        coordinator_protocol: coordinatorProtocol,
        rework_protocol: reworkProtocol,
        delivery_summary: deliverySummary,
    };
}
function normalizeSmokeFilePath(value) {
    const raw = String(value || "ccm-daily-dev-smoke.md").trim().replace(/\\/g, "/");
    const file = raw || "ccm-daily-dev-smoke.md";
    if (path.isAbsolute(file) || file.startsWith("~/") || file.includes("\0")) {
        throw new Error("试运行文件必须是项目内相对路径");
    }
    const segments = file.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some(segment => segment === "." || segment === "..")) {
        throw new Error("试运行文件路径不能包含 . 或 ..");
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
        throw new Error("试运行文件路径只能包含字母、数字、点、下划线、短横线和斜杠");
    }
    return file;
}
function selectDailyDevSmokeTarget(payload = {}) {
    const groups = (0, storage_1.loadGroups)();
    const configs = (0, db_1.getConfigs)();
    const groupId = payload.group_id || payload.groupId || "";
    const directProject = String(payload.target_project || payload.targetProject || payload.project || (!groupId ? (payload.target_member || payload.targetMember || "") : "")).trim();
    if (directProject) {
        const config = configs.find((item) => String(item?.name || "") === directProject);
        const infos = config ? (0, db_1.getConfigInfo)(config.path) : [];
        const info = infos.find((item) => String(item?.name || "") === directProject) || infos[0] || null;
        const configuredWorkDir = String(info?.workDir || "").trim();
        if (!config || !info || !configuredWorkDir)
            throw new Error(`项目 ${directProject} 没有可用的执行目录配置`);
        let workDir = "";
        try {
            workDir = fs.realpathSync(configuredWorkDir);
            if (!fs.statSync(workDir).isDirectory())
                throw new Error("not-directory");
            fs.accessSync(workDir, fs.constants.R_OK | fs.constants.W_OK);
        }
        catch {
            throw new Error(`项目 ${directProject} 的执行目录不可读写`);
        }
        const coordinatorProject = `__ccm_direct_project_main__:${directProject}`;
        const member = { project: directProject, role: "implementation", agent: info.agent || "claudecode", workDir };
        const group = {
            id: "",
            name: `${directProject} 项目自动化`,
            orchestrator: { coordinatorProject },
            members: [{ project: coordinatorProject, role: "coordinator" }, member],
        };
        return {
            group,
            coordinator: group.members[0],
            selectedMember: member,
            readyMembers: [member],
            runtime: { project: directProject, workDir, agentType: member.agent, configured: true },
            directProject: true,
        };
    }
    const candidates = groupId
        ? groups.filter((group) => group.id === groupId)
        : groups;
    for (const group of candidates) {
        const readiness = (0, collaboration_runtime_status_helpers_1.getReadyDailyDevMembers)(group, configs);
        if (readiness.normalizedGroup && readiness.readyMembers.length > 0) {
            const requestedMember = payload.target_member || payload.targetMember || "";
            const selectedMember = readiness.readyMembers.find((member) => member.project === requestedMember)
                || readiness.readyMembers[0];
            return {
                group: readiness.normalizedGroup,
                coordinator: readiness.coordinator,
                selectedMember,
                readyMembers: readiness.readyMembers,
            };
        }
    }
    if (groupId)
        throw new Error("所选开发群聊没有可写工作目录的子 Agent");
    throw new Error("没有可用于真实试运行的开发群聊，请先配置群聊和可写的项目子 Agent");
}
function createDailyDevSmokeTask(payload, ctx) {
    const smokeFile = normalizeSmokeFilePath(payload.smoke_file || payload.smokeFile);
    const target = selectDailyDevSmokeTarget(payload);
    const selectedProject = target.selectedMember.project;
    const groupName = target.group.name || target.group.id;
    const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
    const businessGoal = (0, collaboration_runtime_runtime_tools_1.compactFormText)(payload.business_goal || payload.businessGoal, `真实试运行：验证主 Agent 能派发 ${selectedProject} 子 Agent 完成可验收文件修改`);
    const description = (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
        business_goal: businessGoal,
        scope: [
            `主 Agent 必须把本任务派发给 @${selectedProject}。`,
            `${selectedProject} 子 Agent 只允许在自己的项目工作目录内新增或更新 ${smokeFile}。`,
            "文件内容写入本次试运行时间、群聊名称、目标 Agent、执行摘要和验证命令。",
            "不修改业务源码、依赖配置或其他无关文件。"
        ].join("\n"),
        documents: [
            "这是真实日常开发闭环 smoke 任务，用来验证：业务描述 -> 主 Agent 拆分 -> 子 Agent 改文件 -> 回执 -> 主 Agent 复盘 -> 系统捕获实际变更。",
            `目标群聊：${groupName}`,
            `目标子 Agent：${selectedProject}`,
            `目标文件：${smokeFile}`
        ].join("\n"),
        acceptance: [
            `主 Agent 需要明确派发给 @${selectedProject}，不能只给方案。`,
            `${selectedProject} 必须实际新增或更新 ${smokeFile}。`,
            "子 Agent 回复末尾必须追加 CCM_AGENT_RECEIPT，status=done，filesChanged 包含目标文件。",
            "主 Agent 必须完成最终复盘，说明实际文件变更、已执行验证和风险。",
            "系统必须捕获到实际文件变更和已执行验证记录后，任务才允许变为已完成。"
        ].join("\n"),
        constraints: [
            "这是受控试运行任务，目标是验证自动开发闭环。",
            "不要手动标记完成；必须通过队列执行和系统验收完成。",
            "如果无法写入目标文件或无法运行验证，回执 status 不能写 done，必须说明阻塞点。",
            payload.constraints || ""
        ].filter(Boolean).join("\n"),
        requires_code_changes: true,
    });
    const task = (0, collaboration_runtime_runtime_tools_1.createTask)({
        title: (0, collaboration_runtime_runtime_tools_1.compactFormText)(payload.title, `真实日常开发闭环试运行 - ${selectedProject}`),
        description,
        target_project: target.coordinator?.project || selectedProject,
        group_id: target.group.id,
        assign_type: "group",
        priority: payload.priority || "normal",
        auto_execute: autoExecute,
        workflow_type: "daily_dev",
        requires_code_changes: true,
        requires_verification: true,
        business_goal: businessGoal,
        acceptance_criteria: `修改 ${smokeFile}，子 Agent 结果说明 done，主 Agent 复盘 complete，系统捕获实际变更和已执行验证记录。`,
        source_documents: `daily-dev smoke target=${selectedProject}; file=${smokeFile}`,
        workflow_meta: {
            smoke_test: true,
            smoke_file: smokeFile,
            target_member: selectedProject,
            group_name: groupName,
        },
    });
    (0, logs_1.addTaskLog)(task.id, "info", `创建真实日常开发闭环试运行任务：${selectedProject} -> ${smokeFile}`);
    let queueResult = null;
    if (autoExecute)
        queueResult = (0, collaboration_runtime_coordinator_review_1.enqueueTask)(task.id, ctx);
    return {
        success: true,
        task,
        group: { id: target.group.id, name: groupName, coordinator: target.coordinator?.project || "" },
        target_member: selectedProject,
        smoke_file: smokeFile,
        queued: !!queueResult?.queued,
        queue_result: queueResult,
        queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)(),
    };
}
function getDailyDevSmokeStatus(payload = {}) {
    const tasks = (0, db_1.loadTasks)();
    const taskId = String(payload.task_id || payload.taskId || "").trim();
    const smokeTasks = tasks
        .filter((task) => task?.workflow_type === "daily_dev" && task?.workflow_meta?.smoke_test)
        .sort((a, b) => String(b.created_at || b.updated_at || "").localeCompare(String(a.created_at || a.updated_at || "")));
    const task = taskId
        ? tasks.find((item) => item.id === taskId)
        : smokeTasks[0];
    if (!task || !task.workflow_meta?.smoke_test) {
        return {
            success: true,
            pass: false,
            status: "no_task",
            message: taskId ? "未找到指定真实试运行任务" : "还没有创建真实日常开发闭环试运行任务",
            latest_task_id: smokeTasks[0]?.id || null,
            execution_readiness: (0, collaboration_runtime_plan_tools_1.getAgentExecutionReadiness)(),
        };
    }
    const smokeFile = normalizeSmokeFilePath(task.workflow_meta.smoke_file || payload.smoke_file || payload.smokeFile);
    const group = (0, storage_1.loadGroups)().find((item) => item.id === task.group_id) || null;
    const targetMember = task.workflow_meta.target_member || "";
    const runtime = targetMember && group ? (0, group_orchestrator_1.resolveMemberRuntime)(targetMember, group, (0, db_1.getConfigs)()) : null;
    const workDir = runtime?.workDir || "";
    const resolvedWorkDir = workDir ? path.resolve(workDir) : "";
    const resolvedSmokePath = resolvedWorkDir ? path.resolve(resolvedWorkDir, smokeFile) : "";
    const insideWorkDir = !!resolvedWorkDir && (resolvedSmokePath === resolvedWorkDir || resolvedSmokePath.startsWith(resolvedWorkDir + path.sep));
    const fileExists = insideWorkDir && fs.existsSync(resolvedSmokePath);
    const stat = fileExists ? fs.statSync(resolvedSmokePath) : null;
    const summary = task.delivery_summary || {};
    const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const targetAssignment = assignmentEvidence.find((item) => item?.project === targetMember);
    const hasTargetAssignment = !!targetAssignment;
    const hasTargetWorkerNotification = workerNotifications.some((item) => item?.task_id === targetMember || item?.agent === targetMember);
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || task.receipt?.status === "done";
    const hasFinalReview = !!(summary.has_final_review || task.review);
    const actualChangeCount = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
    const executedVerificationCount = Number(summary.verification_executed?.length || 0);
    const requiredVerificationPassed = summary.verification_required_gate_passed !== false;
    const openSmokeGaps = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.blocking_needs)
            ? summary.blocking_needs
            : (Array.isArray(summary.needs) ? summary.needs.filter((item) => !(0, collaboration_runtime_status_helpers_1.isAdvisoryNeed)(item, task)) : [])),
        ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
        ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
    ].filter(Boolean);
    const pass = task.status === "done"
        && fileExists
        && coordinationPlanCount > 0
        && hasTargetAssignment
        && hasTargetWorkerNotification
        && actualChangeCount > 0
        && hasDoneReceipt
        && hasFinalReview
        && executedVerificationCount > 0
        && requiredVerificationPassed
        && openSmokeGaps.length === 0;
    const missing = [
        task.status === "done" ? "" : "任务尚未完成",
        fileExists ? "" : "目标 smoke 文件不存在",
        coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据",
        hasTargetAssignment ? "" : "缺少主 Agent 派发给目标子 Agent 的证据",
        hasTargetWorkerNotification ? "" : "缺少目标子 Agent 的 Worker 通知",
        actualChangeCount > 0 ? "" : "未捕获实际文件变更",
        hasDoneReceipt ? "" : "缺少子 Agent done 回执",
        hasFinalReview ? "" : "缺少主 Agent 最终复盘",
        executedVerificationCount > 0 ? "" : "缺少已执行验证记录",
        requiredVerificationPassed ? "" : "缺少项目配置验证命令证据",
        openSmokeGaps.length ? `仍有未解决阻塞/补充/失败验证：${openSmokeGaps.slice(0, 3).join("；")}` : "",
    ].filter(Boolean);
    const readiness = (0, collaboration_runtime_plan_tools_1.getTaskAgentExecutionReadiness)(task);
    const status = pass
        ? "passed"
        : readiness.ready === false
            ? "blocked"
            : (task.status === "failed" ? "failed" : "waiting");
    return {
        success: true,
        pass,
        status,
        message: pass
            ? "真实日常开发闭环试运行已通过"
            : (status === "blocked" ? readiness.message : `真实试运行尚未通过：${missing.join("、") || task.status_detail || "等待执行结果"}`),
        task: {
            id: task.id,
            title: task.title,
            status: task.status,
            status_detail: task.status_detail || "",
            created_at: task.created_at,
            updated_at: task.updated_at,
            completed_at: task.completed_at || null,
        },
        target: {
            group_id: task.group_id || "",
            group_name: group?.name || task.workflow_meta.group_name || "",
            member: targetMember,
            work_dir: workDir,
            smoke_file: smokeFile,
            smoke_path: insideWorkDir ? resolvedSmokePath : "",
            file_exists: fileExists,
            file_size: stat?.size || 0,
            file_modified_at: stat ? stat.mtime.toISOString() : "",
        },
        evidence: {
            task_done: task.status === "done",
            file_exists: fileExists,
            assignment_count: assignmentEvidence.length,
            has_target_assignment: hasTargetAssignment,
            target_assignment: targetAssignment || null,
            worker_notification_count: workerNotifications.length,
            has_target_worker_notification: hasTargetWorkerNotification,
            coordination_plan_count: coordinationPlanCount,
            actual_file_change_count: actualChangeCount,
            has_done_receipt: hasDoneReceipt,
            has_final_review: hasFinalReview,
            executed_verification_count: executedVerificationCount,
            required_verification_passed: requiredVerificationPassed,
            missing,
            delivery_summary: summary,
        },
        execution_readiness: readiness,
    };
}
// ===== merged from collaboration-runtime-daily-dev-part-02.ts =====
async function runAgentCliProbe(payload, ctx) {
    const target = selectDailyDevSmokeTarget(payload);
    const selectedProject = target.selectedMember.project;
    const runtime = target.runtime || (0, group_orchestrator_1.resolveMemberRuntime)(selectedProject, target.group, (0, db_1.getConfigs)());
    if (!runtime?.workDir)
        throw new Error("未找到探针目标 Agent 的工作目录");
    const requestedAgentType = String(payload.agent_type || payload.agentType || "").trim().toLowerCase();
    const requestedRuntime = requestedAgentType
        ? (0, runtime_1.getPublicAgentRuntimes)().find((item) => item.id === requestedAgentType || item.aliases?.includes(requestedAgentType))
        : null;
    if (requestedAgentType && !requestedRuntime)
        throw new Error(`不支持的 Agent Runtime：${requestedAgentType}`);
    const agentType = requestedRuntime?.id || (0, runtime_1.normalizeAgentRuntimeId)(runtime.agentType || "claudecode");
    const probeTarget = {
        group_id: target.group.id,
        group_name: target.group.name || target.group.id,
        project: selectedProject,
        agent_type: agentType,
        work_dir: runtime.workDir,
    };
    const readiness = (0, collaboration_runtime_plan_tools_1.getAgentProbeExecutionReadiness)(probeTarget);
    if (!readiness.ready) {
        const fixActions = readiness.fix_actions || (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: readiness.message, probe: readiness.probe, agentType });
        const result = {
            success: false,
            blocked: true,
            message: readiness.message,
            error: readiness.message,
            fix_actions: fixActions,
            target: probeTarget,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
    const started = Date.now();
    const capabilityWrite = payload.capability_write !== false && payload.capabilityWrite !== false;
    const writeToken = `CCM_WRITE_OK_${crypto.randomBytes(6).toString("hex")}`;
    const writeFileName = `.ccm-permission-probe-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.tmp`;
    const writeFilePath = path.join(runtime.workDir, writeFileName);
    const verifyWriteCapability = () => {
        if (!capabilityWrite)
            return { requested: false, pass: true, file: "", reason: "只读连通性探针" };
        try {
            const content = fs.existsSync(writeFilePath) ? fs.readFileSync(writeFilePath, "utf-8").trim() : "";
            return { requested: true, pass: content === writeToken, file: writeFileName, reason: content === writeToken ? "项目内写入握手通过" : "Agent 未能在项目目录写入握手文件" };
        }
        catch (error) {
            return { requested: true, pass: false, file: writeFileName, reason: `读取握手文件失败：${error?.message || error}` };
        }
    };
    const cleanupWriteProbe = () => { try {
        if (fs.existsSync(writeFilePath))
            fs.unlinkSync(writeFilePath);
    }
    catch { } };
    const prompt = capabilityWrite ? [
        "MANDATORY CCM EXECUTION PROBE.",
        "This is an execution task, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
        `Current working directory: ${runtime.workDir}`,
        `Create a file named ${writeFileName} in the current working directory.`,
        "The file content must be exactly this single line:",
        writeToken,
        "Do not modify any other file. Do not delete the probe file.",
        "After the file has been written successfully, print exactly this single line and nothing else:",
        "CCM_AGENT_PROBE_OK",
    ].join("\n") : [
        "MANDATORY CCM EXECUTION PROBE.",
        "This is a CLI health probe, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
        "Do not modify files and do not run write commands.",
        "Print exactly this single line and nothing else:",
        "CCM_AGENT_PROBE_OK",
    ].join("\n");
    try {
        const toolContext = (0, collaboration_runtime_plan_tools_1.buildAgentToolContext)(ctx, target.group, selectedProject);
        const runtimeToolContext = (0, collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools)(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
        });
        if (runtimeToolContext.dispatchBlocked) {
            cleanupWriteProbe();
            const message = (0, collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage)(selectedProject, runtimeToolContext);
            const result = {
                success: false,
                blocked: true,
                message,
                error: message,
                fix_actions: (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: message, agentType }),
                execution_path: readiness.mode,
                expected_marker: "CCM_AGENT_PROBE_OK",
                target: probeTarget,
                duration_ms: Date.now() - started,
                output: "",
                readiness,
                runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
            };
            (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
            return result;
        }
        const timeoutMs = Math.max(15000, Math.min(300000, Number(payload.timeout_ms || payload.timeoutMs || 120000)));
        if (payload.native_session || payload.nativeSession) {
            const probeTaskId = `native-probe-${agentType}-${Date.now()}`;
            let nativeSessionId = agentType === "claudecode" ? crypto.randomUUID() : "";
            let firstErrored = false;
            const firstMarker = "CCM_NATIVE_SESSION_ROUND_1_OK";
            const firstOutput = await ctx.callAgentForGroupStream(selectedProject, `${prompt}\n本轮改为只回复一行：${firstMarker}`, runtime.workDir, agentType, {
                groupId: target.group.id,
                timeoutMs,
                allowedTools: toolContext.allowedTools,
                mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                taskId: probeTaskId,
                agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: false },
                onDone: (opts) => {
                    firstErrored = opts.isError === true;
                    nativeSessionId = String(opts.nativeSessionId || nativeSessionId || "");
                },
            });
            const writeCapability = verifyWriteCapability();
            cleanupWriteProbe();
            const firstOk = !firstErrored && firstOutput.includes(firstMarker) && !!nativeSessionId && writeCapability.pass;
            let secondErrored = false;
            const secondMarker = "CCM_NATIVE_SESSION_ROUND_2_OK";
            const secondOutput = firstOk
                ? await ctx.callAgentForGroupStream(selectedProject, `继续同一个健康探针会话。不要修改文件，只回复一行：${secondMarker}`, runtime.workDir, agentType, {
                    groupId: target.group.id,
                    timeoutMs,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                    taskId: probeTaskId,
                    agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: true },
                    onDone: (opts) => { secondErrored = opts.isError === true; },
                })
                : "";
            const ok = firstOk && !secondErrored && secondOutput.includes(secondMarker);
            const outputFailure = (0, collaboration_runtime_plan_tools_1.getAgentProbeOutputFailure)(firstOutput || secondOutput);
            const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(firstOutput || secondOutput || ""));
            const nativeFailureMessage = !writeCapability.pass && explicitPermissionDrift
                ? `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`
                : (!writeCapability.pass && outputFailure.error !== "empty_output"
                    ? outputFailure.message
                    : (!writeCapability.pass ? `Agent 未完成项目写入握手：${writeCapability.reason}` : "Agent 原生会话两轮续跑探针失败"));
            const result = {
                success: ok,
                blocked: false,
                message: ok ? "Agent 原生会话两轮续跑与项目写入握手通过" : nativeFailureMessage,
                error: ok ? "" : (!writeCapability.pass && !explicitPermissionDrift ? outputFailure.error : (!writeCapability.pass ? writeCapability.reason : (0, memory_1.compactMemoryText)(firstOutput || secondOutput || "未捕获探针输出", 500))),
                fix_actions: ok ? [] : (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: firstOutput || secondOutput, agentType }),
                execution_path: readiness.mode,
                expected_marker: secondMarker,
                target: probeTarget,
                duration_ms: Date.now() - started,
                native_session: { captured: !!nativeSessionId, session_id: nativeSessionId, first_round: firstOk, second_round: !secondErrored && secondOutput.includes(secondMarker) },
                capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
                output: (0, memory_1.compactMemoryText)(secondOutput || firstOutput, 1000),
                readiness,
            };
            (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
            return result;
        }
        const callProbeAgent = (probePrompt) => ctx.callAgent(selectedProject, probePrompt, runtime.workDir, agentType, Number(payload.timeout_ms || payload.timeoutMs || 120000), {
            tab: "groups",
            groupId: target.group.id,
            project: selectedProject,
            probe: true,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
        });
        let probeAttempts = 1;
        let output = await callProbeAgent(prompt);
        let writeCapability = verifyWriteCapability();
        if ((!/CCM_AGENT_PROBE_OK/i.test(output) || !writeCapability.pass) && payload.disable_probe_retry !== true && payload.disableProbeRetry !== true) {
            probeAttempts++;
            output = await callProbeAgent([
                prompt,
                "The previous probe attempt did not complete both required checks.",
                "Retry the file write now and only print the success marker after the exact file content exists.",
            ].join("\n"));
            writeCapability = verifyWriteCapability();
        }
        cleanupWriteProbe();
        const ok = /CCM_AGENT_PROBE_OK/i.test(output) && writeCapability.pass;
        const outputFailure = (0, collaboration_runtime_plan_tools_1.getAgentProbeOutputFailure)(output);
        const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(output || ""));
        const failure = ok ? null : (!writeCapability.pass && explicitPermissionDrift)
            ? { message: `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`, error: writeCapability.reason }
            : (!writeCapability.pass && outputFailure.error === "empty_output")
                ? { message: `Agent 未完成项目写入握手：${writeCapability.reason}`, error: writeCapability.reason }
                : outputFailure;
        const fixActions = ok ? [] : (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({
            error: failure?.error || failure?.message || output,
            agentType,
            probe: { target: { agent_type: agentType }, output, message: failure?.message, error: failure?.error },
        });
        const result = {
            success: ok,
            blocked: false,
            message: ok ? "Agent CLI 探针通过" : failure?.message,
            error: ok ? "" : failure?.error,
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: probeTarget,
            duration_ms: Date.now() - started,
            probe_attempts: probeAttempts,
            output: String(output || "").slice(0, 2000),
            capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
    catch (e) {
        cleanupWriteProbe();
        const fixActions = (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({
            error: e.message || String(e),
            agentType,
            probe: { target: { agent_type: agentType }, message: e.message || String(e), error: e.message || String(e) },
        });
        const result = {
            success: false,
            blocked: false,
            message: e.message || "Agent CLI 探针失败",
            error: e.message || String(e),
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: probeTarget,
            duration_ms: Date.now() - started,
            output: "",
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
}
function taskRequiresAgentQa(task) {
    if (task?.requires_agent_qa === false || task?.requiresAgentQa === false)
        return false;
    if (task?.requires_agent_qa === true || task?.requiresAgentQa === true)
        return true;
    return task?.workflowDecision?.requiresAgentQa === true
        || task?.workflow_decision?.requires_agent_qa === true
        || task?.intake_draft?.workflowDecision?.requiresAgentQa === true;
}
function getTaskAgentQaGate(task) {
    const items = task?.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(String(task.group_id), 200).filter((item) => item.task_id === task.id) : [];
    const accepted = items.filter((item) => item.acceptance?.accepted === true);
    const resumed = items.filter((item) => item.status === "resumed" || item.resumed_at);
    return {
        required: taskRequiresAgentQa(task),
        pass: !taskRequiresAgentQa(task) || (accepted.length > 0 && resumed.length > 0),
        total: items.length,
        accepted: accepted.length,
        resumed: resumed.length,
        qa_ids: items.map((item) => item.id).filter(Boolean),
    };
}
async function runRuntimeFallbackProbe(payload, ctx) {
    const target = selectDailyDevSmokeTarget(payload);
    const selectedProject = target.selectedMember.project;
    const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(selectedProject, target.group, (0, db_1.getConfigs)());
    if (!runtime?.workDir)
        throw new Error("未找到探针目标 Agent 的工作目录");
    const normalizeRequestedRuntime = (value, fallback) => {
        const requested = String(value || fallback).trim().toLowerCase();
        const descriptor = (0, runtime_1.getPublicAgentRuntimes)().find((item) => item.id === requested || item.aliases?.includes(requested));
        if (!descriptor)
            throw new Error(`不支持的 Agent Runtime：${requested}`);
        return descriptor.id;
    };
    const primaryRuntime = normalizeRequestedRuntime(payload.primary_runtime || payload.primaryRuntime, "gemini");
    const fallbackRuntime = normalizeRequestedRuntime(payload.fallback_runtime || payload.fallbackRuntime, "codex");
    const timeoutMs = Math.max(15000, Math.min(120000, Number(payload.timeout_ms || payload.timeoutMs || 30000)));
    const marker = "CCM_RUNTIME_FALLBACK_OK";
    const prompt = `这是 cc-connect 执行器切换探针。不要修改任何文件，不要运行写入命令。只回复一行：${marker}`;
    const toolContext = (0, collaboration_runtime_plan_tools_1.buildAgentToolContext)(ctx, target.group, selectedProject);
    const taskId = `fallback-probe-${Date.now()}`;
    const attempts = [];
    let previousOutput = "";
    let switched = false;
    for (const [index, agentType] of [primaryRuntime, fallbackRuntime].entries()) {
        const runtimeToolContext = (0, collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools)(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
        });
        if (runtimeToolContext.dispatchBlocked) {
            const message = (0, collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage)(selectedProject, runtimeToolContext);
            attempts.push({ runtime: agentType, success: false, error: true, output: message, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
            return {
                success: false,
                message,
                error: message,
                switched,
                attempts,
                runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
            };
        }
        let errored = false;
        const attemptPrompt = index === 0 ? prompt : (0, collaboration_resilience_1.buildRuntimeRecoveryPrompt)({
            originalPrompt: prompt,
            previousOutput,
            failure: previousOutput,
            fromRuntime: primaryRuntime,
            toRuntime: fallbackRuntime,
            attempt: 2,
        });
        const output = await ctx.callAgentForGroupStream(selectedProject, attemptPrompt, runtime.workDir, agentType, {
            groupId: target.group.id,
            timeoutMs,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            taskId,
            onDone: (opts) => { errored = opts.isError === true; },
        });
        const ok = !errored && output.includes(marker);
        attempts.push({ runtime: agentType, success: ok, error: errored, output: (0, memory_1.compactMemoryText)(output, 500) });
        if (ok) {
            return {
                success: true,
                message: index === 0 ? "主执行器探针通过，未触发切换" : "主执行器失败后已自动切换并续跑成功",
                switched,
                primary_runtime: primaryRuntime,
                final_runtime: agentType,
                attempts,
            };
        }
        previousOutput = output;
        if (index === 0) {
            const decision = (0, collaboration_resilience_1.shouldSwitchRuntime)(errored ? `Agent 进程退出：${output}` : output);
            if (!decision.switchRuntime) {
                return { success: false, message: "主执行器失败但未被判定为可恢复故障", switched: false, primary_runtime: primaryRuntime, final_runtime: primaryRuntime, attempts, decision };
            }
            switched = true;
            attempts[0].decision = decision;
        }
    }
    return { success: false, message: "执行器切换后仍失败", switched, primary_runtime: primaryRuntime, final_runtime: fallbackRuntime, attempts };
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function buildEvidenceGateFollowUps(group, outputs) {
    return require("./collaboration-acceptance").buildEvidenceGateFollowUps(group, outputs);
}
function isReviewLikeAgentName(value) {
    return /test[-_\s]*agent|qa|test|tester|verify|verification|review|reviewer|audit|checker|quality|测试|验证|复核|审查|检查/i.test(String(value || ""));
}
function inferIndependentReviewSubject(input) {
    const changes = Array.isArray(input.actualFileChanges) ? input.actualFileChanges : [];
    const highRiskProjects = changes
        .filter(collaboration_runtime_status_helpers_1.changeLooksHighRiskForIndependentReview)
        .map((item) => item.project || item.agent || item.target_project || "")
        .filter(Boolean);
    const changedProjects = changes
        .map((item) => item.project || item.agent || item.target_project || "")
        .filter(Boolean);
    const receiptAgents = (input.receipts || [])
        .filter((item) => String(item?.status || "") === "done")
        .map((item) => item.agent || item.project || "")
        .filter(Boolean);
    const assignedProjects = (input.assignmentEvidence || [])
        .map((item) => item.project || item.target || "")
        .filter(Boolean);
    const candidates = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(highRiskProjects, changedProjects, receiptAgents, assignedProjects, input.task?.target_project || input.task?.targetProject || "").filter((item) => !isReviewLikeAgentName(item));
    return candidates[0] || (0, collaboration_runtime_status_helpers_1.uniqueStrings)(changedProjects, receiptAgents, assignedProjects)[0] || "";
}
function getReceiptTestAgentVerdict(receipt) {
    return receipt?.testAgentReport?.verdict
        || receipt?.test_agent_report?.verdict
        || receipt?.testAgentVerdict
        || receipt?.test_agent_verdict
        || null;
}
function getReceiptTestAgentHandoff(receipt) {
    return receipt?.testAgentHandoff
        || receipt?.test_agent_handoff
        || receipt?.testAgentReport?.testAgentHandoff
        || receipt?.test_agent_report?.test_agent_handoff
        || null;
}
function getReceiptIndependentReviewSubject(receipt, fallback = "") {
    const handoff = getReceiptTestAgentHandoff(receipt);
    const reviews = [
        ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview : []),
        ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review : []),
    ];
    return String((0, collaboration_runtime_cross_agent_runtime_1.getTestAgentHandoffReviewSubject)(handoff)
        || reviews[0]?.reviewSubject
        || reviews[0]?.review_subject
        || receipt?.reviewSubject
        || receipt?.review_subject
        || fallback
        || "").trim();
}
function findLatestTestAgentReviewReceipt(receipts = [], route = "") {
    return [...(receipts || [])].reverse().find((receipt) => {
        const verdict = getReceiptTestAgentVerdict(receipt);
        const reviewStates = [
            verdict?.reviewRoute,
            verdict?.status,
            verdict?.recommendation,
            receipt?.status,
            ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview.map((item) => item?.verdict || item?.status) : []),
            ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review.map((item) => item?.verdict || item?.status) : []),
        ].filter(Boolean).map(collaboration_runtime_status_helpers_1.independentReviewVerdictState);
        const reviewState = ["needs_recheck", "needs_environment", "needs_user", "failed", "passed"]
            .find(state => reviewStates.includes(state)) || "unknown";
        if (route === "needs_recheck")
            return verdict?.needsRecheck === true || verdict?.reviewRoute === "test_agent_recheck" || reviewState === "needs_recheck";
        if (route === "needs_environment")
            return verdict?.needsEnvironment === true || verdict?.reviewRoute === "environment" || reviewState === "needs_environment";
        if (route === "failed")
            return verdict?.needsRework === true || verdict?.reviewRoute === "implementation_rework" || reviewState === "failed";
        return !!verdict || (0, collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName)(receipt?.reviewer || receipt?.agent);
    }) || null;
}
function buildTestAgentReviewRecheckFollowUp(input) {
    const subject = String(input.subject || "").trim();
    if (!subject)
        return null;
    const { applyTestAgentProviderGapPlaywrightReroute } = require("./test-agent-independent-review-decision");
    const { buildTestAgentEnvironmentPrepChecklist, applyTestAgentEnvironmentPrepToHandoff, } = require("./test-agent-environment-prep");
    let handoff = applyTestAgentProviderGapPlaywrightReroute(input.handoff || null, {
        report: input.report,
        verdict: input.verdict,
        reason: input.reason,
        reviewRoute: "test_agent_recheck",
    });
    const environmentPrep = handoff?.metadata?.testAgentEnvironmentPrep
        || buildTestAgentEnvironmentPrepChecklist(input.report, input.verdict);
    if (environmentPrep && /environment|补齐|登录条件|运行条件/i.test(String(input.source || input.reason || ""))) {
        handoff = applyTestAgentEnvironmentPrepToHandoff(handoff, environmentPrep);
    }
    const providerGapReroute = handoff?.metadata?.providerGapReroute === true;
    return {
        mention: handoff ? "@test-agent" : `@${subject}`,
        targetName: handoff ? "test-agent" : subject,
        project: handoff ? "test-agent" : subject,
        summary: "重新运行 TestAgent 复验",
        message: [
            `${subject} 的实现或复核条件已更新，请重新执行 TestAgent 独立复核。`,
            "必须基于最新文件、最新运行环境和最新真实输出重新判断；不要复用上一轮结论。",
            "重点补齐上一轮未闭环的操作效果、会话恢复、边界异常或完成前抽查证据。",
            providerGapReroute
                ? "上一轮存在浏览器 Provider 能力缺口：本轮复验已强制改走 Playwright，禁止继续用 MCP/Computer Use 假绿。"
                : "",
            "如果仍无法验证，请明确返回需复验、补条件或待确认；只有新证据完整通过后才能接受交付。",
        ].filter(Boolean).join("\n"),
        reason: input.reason || "上一轮交付或复核条件已更新，需要 TestAgent 基于最新状态重新验证",
        rework_kind: "test_agent_review_recheck",
        testAgentReviewRecheck: true,
        test_agent_review_recheck: true,
        reviewSubject: subject,
        originalTarget: subject,
        independentReviewGate: handoff ? null : {
            required: true,
            pass: false,
            status: "needs_recheck",
            reason: input.reason || "需要重新运行独立 TestAgent 复核",
        },
        testAgentHandoff: handoff,
        test_agent_handoff: handoff,
        userTaskPreview: providerGapReroute
            ? `重新复验 ${subject}：改走 Playwright 后运行 TestAgent`
            : `重新复验 ${subject}：基于最新状态运行 TestAgent`,
        source: input.source || "test_agent_review_recheck",
    };
}
function buildIndependentReviewGateFollowUps(input) {
    return require("./collaboration-acceptance").buildIndependentReviewGateFollowUps(input);
}
function buildFailedIndependentReviewReworkFollowUps(input) {
    return require("./collaboration-acceptance").buildFailedIndependentReviewReworkFollowUps(input);
}
function buildPostReviewSpotCheckFollowUps(input) {
    const task = input.task || (0, collaboration_runtime_task_queue_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_runtime_status_helpers_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_runtime_status_helpers_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const independentReviewGate = (0, collaboration_runtime_status_helpers_1.buildIndependentReviewGate)(task, actualFileChanges, receipts, agentQa);
    const spotCheckGate = (0, post_review_spot_check_1.buildPostReviewSpotCheckGate)({
        required: independentReviewGate.required && independentReviewGate.pass,
        receipts,
    });
    if (!spotCheckGate.required || spotCheckGate.pass)
        return [];
    const existingText = (input.existingFollowUps || [])
        .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
        .join("\n");
    if (/post_review_spot_check|完成前抽查.{0,24}(?:重新复验|补齐|不一致)|TestAgent.{0,24}重新判断/i.test(existingText))
        return [];
    const sourceReceipt = receipts.find((receipt) => receipt?.post_review_spot_check
        || receipt?.postReviewSpotCheck
        || receipt?.testAgentHandoff
        || receipt?.test_agent_handoff) || null;
    const carriedHandoff = sourceReceipt?.testAgentHandoff || sourceReceipt?.test_agent_handoff || null;
    const assignmentEvidence = (0, collaboration_runtime_status_helpers_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const subject = String(carriedHandoff?.review_subject
        || carriedHandoff?.reviewSubject
        || sourceReceipt?.reviewSubject
        || sourceReceipt?.review_subject
        || sourceReceipt?.independentReview?.[0]?.reviewSubject
        || inferIndependentReviewSubject({ task, actualFileChanges, receipts, assignmentEvidence })
        || task?.target_project
        || "").trim();
    if (!subject)
        return [];
    const reason = spotCheckGate.reason || "TestAgent 通过后，主 Agent 的关键验证抽查尚未通过";
    if (carriedHandoff) {
        return [{
                mention: "@test-agent",
                targetName: "test-agent",
                project: "test-agent",
                summary: "完成前抽查需要 TestAgent 重新复验",
                message: [
                    `TestAgent 已对 ${subject} 给出通过结论，但主 Agent 的完成前抽查尚未一致。`,
                    "请沿用原复核工作单重新执行验证，并根据最新真实输出重新判断；不要复用上一轮 PASS。",
                    "如果重新执行失败，请明确返回失败或需要返工；如果仍然通过，请返回新的命令结果块和实际输出，供主 Agent 再次抽查。",
                ].join("\n"),
                reason,
                rework_kind: "post_review_spot_check_reverify",
                postReviewSpotCheckReverify: true,
                postReviewSpotCheckGate: spotCheckGate,
                reviewSubject: subject,
                originalTarget: subject,
                testAgentHandoff: carriedHandoff,
                test_agent_handoff: carriedHandoff,
                userTaskPreview: `重新复验 ${subject}：完成前抽查尚未一致`,
            }];
    }
    return [{
            mention: `@${subject}`,
            targetName: subject,
            project: subject,
            summary: "补齐 TestAgent 通过后的完成前抽查",
            message: [
                `主 Agent 已收到 ${subject} 的独立复核通过结论，但还没有可供主 Agent 重跑的完整命令结果。`,
                "请重新发起独立 TestAgent 复核，确保通过报告包含实际执行的命令、退出状态和输出；主 Agent 会在 PASS 后抽查关键验证。",
            ].join("\n"),
            reason,
            rework_kind: "post_review_spot_check_missing",
            independentReviewGate: {
                ...independentReviewGate,
                required: true,
                pass: false,
                status: "missing",
                reason,
            },
            postReviewSpotCheckGate: spotCheckGate,
            reviewSubject: subject,
            originalTarget: subject,
            userTaskPreview: `补齐完成前抽查：重新复核 ${subject}`,
        }];
}
function buildCodedCoordinatorReview(group, outputs, options = {}) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
    const allowFollowUps = options.allowFollowUps !== false;
    const round = Math.max(1, Number(options.round || 1));
    const maxRounds = Math.max(round, Number(options.maxRounds || rework_policy_1.AUTO_REWORK_MAX_ROUNDS));
    const gateFollowUps = buildEvidenceGateFollowUps(group, outputs);
    const gaps = gateFollowUps.map((item) => String(item.reason || item.message || "").trim()).filter(Boolean);
    const followUps = allowFollowUps ? gateFollowUps : [];
    const status = followUps.length > 0
        ? "needs_followup"
        : gaps.length > 0
            ? "needs_user"
            : "complete";
    const lines = ["📋 **规则协调复盘**", ""];
    if (status === "complete") {
        lines.push("已完成规则验收：子 Agent 结果说明和验证证据未发现必须自动返工的缺口。");
    }
    else {
        lines.push(`第 ${round}/${maxRounds} 轮规则验收发现缺口：${gaps.join("；") || "仍缺少可验收证据"}`);
    }
    if (followUps.length) {
        lines.push("", "我会继续追问：");
        for (const item of followUps) {
            const preview = item.summary ? `${item.summary}：` : "";
            lines.push(`@${item.targetName || item.project} ${preview}${item.message}`);
        }
    }
    else if (gaps.length) {
        lines.push("", "已达到自动返工上限，需要用户确认是否继续派发或人工介入。");
    }
    return {
        agent: coordinator.project,
        status,
        followUps,
        structured_review: {
            schema: "ccm-coded-coordinator-review-v1",
            status,
            follow_ups: followUps.map((item) => ({
                project: item.targetName || item.project || "",
                summary: item.summary || "",
                reason: item.reason || "",
            })),
            gaps,
        },
        gaps,
        conflicts: [],
        content: lines.join("\n").trim(),
        confidence: status === "complete" ? 0.82 : 0.68,
        runtime: "coded-review",
    };
}
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        const sequence = Number(res.__ccmSseSequence || 0) + 1;
        res.__ccmSseSequence = sequence;
        const streamId = String(data?.traceId || data?.trace_id || data?.taskId || data?.task_id || "group-stream");
        const eventId = String(data?.event_id || data?.eventId || `${streamId}:${sequence}`);
        res.write(`data: ${JSON.stringify({ ...data, event_id: eventId, eventId, sequence })}\n\n`);
    }
    catch { }
}
(0, agent_qa_service_1.configureAgentQaService)({ getTaskById: collaboration_runtime_task_queue_1.getTaskById, updateTask: collaboration_runtime_runtime_tools_1.updateTask, writeSse });
function emitAssignmentStatus(streamRes, groupId, planMessageId, project, status, statusText = "") {
    if (!planMessageId || !project)
        return;
    const text = statusText || status;
    const workflow = (0, collaboration_runtime_task_queue_1.updateGroupMessageAssignmentStatus)(groupId, planMessageId, project, status, text);
    writeSse(streamRes, {
        type: "assignment_status",
        planMessageId,
        project,
        status,
        statusText: text,
        workflow,
    });
}
//# sourceMappingURL=collaboration-runtime-daily-dev.js.map