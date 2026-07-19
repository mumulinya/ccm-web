"use strict";
// Behavior-freeze split from collaboration-acceptance.ts (part 2/2).
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.getTaskExecutionFromReceipt = getTaskExecutionFromReceipt;
exports.buildEvidenceGateFollowUps = buildEvidenceGateFollowUps;
exports.buildIndependentReviewGateFollowUps = buildIndependentReviewGateFollowUps;
exports.buildFailedIndependentReviewReworkFollowUps = buildFailedIndependentReviewReworkFollowUps;
exports.testAgentDecisionReceiptStatus = testAgentDecisionReceiptStatus;
exports.buildNativeTestAgentReceipt = buildNativeTestAgentReceipt;
exports.buildNativeTestAgentPlanBlockedReceipt = buildNativeTestAgentPlanBlockedReceipt;
exports.runtimeToolDispatchBlockedReceipt = runtimeToolDispatchBlockedReceipt;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.buildTaskGapContinuationDraft = buildTaskGapContinuationDraft;
exports.getTaskGapItems = getTaskGapItems;
exports.getTaskGapFingerprint = getTaskGapFingerprint;
exports.canAutoContinueTaskGaps = canAutoContinueTaskGaps;
const crypto = __importStar(require("crypto"));
const group_orchestrator_1 = require("./group-orchestrator");
const display_1 = require("./display");
const memory_1 = require("./memory");
const agent_qa_service_1 = require("./agent-qa-service");
const agent_receipts_1 = require("./agent-receipts");
const agent_notifications_1 = require("./agent-notifications");
const protocol_gates_1 = require("./protocol-gates");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const collaboration_1 = require("./collaboration");
const collaboration_acceptance_part_01_1 = require("./collaboration-acceptance-part-01");
function getTaskExecutionFromReceipt(response, receipt, details = {}) {
    if (!receipt) {
        if ((0, agent_receipts_1.checkTaskFailure)(response)) {
            return (0, collaboration_1.buildTaskExecutionResult)("failed", response, { ...details, detail: details.detail || "Agent 输出包含失败标记" });
        }
        if ((0, agent_receipts_1.checkTaskCompletion)(response)) {
            return (0, collaboration_1.buildTaskExecutionResult)("done", response, { ...details, detail: details.detail || "兼容旧 Agent：检测到完成标记但缺少结构化结果说明" });
        }
        return (0, collaboration_1.buildTaskExecutionResult)("waiting", response, { ...details, detail: details.detail || "缺少结构化结果说明，无法可靠验收" });
    }
    if (receipt.status === "done") {
        return (0, collaboration_1.buildTaskExecutionResult)("done", response, { ...details, receipt, detail: receipt.summary || details.detail || "子 Agent 结果说明确认完成" });
    }
    if (receipt.status === "failed") {
        return (0, collaboration_1.buildTaskExecutionResult)("failed", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || "子 Agent 结果说明失败" });
    }
    return (0, collaboration_1.buildTaskExecutionResult)("waiting", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || `子 Agent 结果说明状态为 ${receipt.status}` });
}
function buildEvidenceGateFollowUps(group, outputs) {
    const routable = new Set((0, group_orchestrator_1.getRoutableMembers)(group).map((m) => m.project));
    const seen = new Set();
    const followUps = [];
    const followUpSummary = (value, fallback = "补齐结果说明和验证证据") => (0, display_1.sanitizeMainAgentUserText)((0, memory_1.compactMemoryText)(value || fallback, 56), fallback, 56);
    for (const output of [...(outputs || [])].reverse()) {
        const text = String(output || "");
        const agent = (0, agent_notifications_1.getCollectedOutputAgent)(text);
        if (!agent || !routable.has(agent) || seen.has(agent))
            continue;
        const notificationStatus = (0, agent_notifications_1.extractTaskNotificationTag)(text, "status");
        const status = (0, agent_notifications_1.getCollectedOutputReceiptStatus)(text);
        const receipt = (0, collaboration_1.parseFormattedReceiptsFromText)(text)[0];
        const structuredTestAgentReview = (0, collaboration_1.isCoordinatorTestAgentName)(agent)
            && !!(receipt?.testAgentReport
                || receipt?.test_agent_report
                || receipt?.testAgentHandoff
                || receipt?.test_agent_handoff
                || receipt?.independentReview
                || receipt?.independent_review);
        if (structuredTestAgentReview) {
            seen.add(agent);
            continue;
        }
        if (notificationStatus === "missing_receipt" || text.includes("结构化回执：缺失")) {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补齐可验收结果说明",
                message: "主 Agent 验收未收到你的 CCM_AGENT_RECEIPT。请补充结构化回执，并明确：实际完成事项、是否修改文件、验证方式、阻塞点；不能把建议当作已完成。",
                reason: "缺少结构化结果说明，主 Agent 无法验收完成状态",
            });
            continue;
        }
        if (status && status !== "done") {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: followUpSummary(`处理结果说明状态 ${status}`),
                message: `主 Agent 验收发现你的回执状态为 ${status}。请继续处理到可验收状态，或明确说明仍需用户/其他 Agent 提供什么；完成后必须再次提交 CCM_AGENT_RECEIPT，status 只能在确有证据时写 done。`,
                reason: `结构化结果说明状态不是 done：${status}`,
            });
            continue;
        }
        const verificationGate = (0, collaboration_1.getVerificationEvidenceGate)(receipt ? [receipt] : []);
        if (status === "done" && !verificationGate.pass) {
            seen.add(agent);
            const reason = verificationGate.failed.length
                ? `验证未通过：${verificationGate.failed.join("；")}`
                : verificationGate.suggested.length
                    ? `验证记录只是建议或未执行：${verificationGate.suggested.join("；")}`
                    : "缺少已执行验证记录";
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补齐已执行验证证据",
                message: `主 Agent 验收发现你的 done 回执缺少可采信的已执行验证证据。请实际运行必要检查或说明人工核验结果；如果验证失败，先修复后再提交 CCM_AGENT_RECEIPT。当前缺口：${reason}`,
                reason,
            });
            continue;
        }
        const requiredVerificationCoverage = (0, collaboration_1.getRequiredVerificationCoverage)(receipt ? [receipt] : []);
        if (status === "done" && !requiredVerificationCoverage.pass) {
            seen.add(agent);
            const missing = requiredVerificationCoverage.missing
                .map((item) => item.required.join(" / "))
                .join("；");
            const reason = `缺少项目配置验证命令执行证据：${missing}`;
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补跑项目验证命令",
                message: `主 Agent 验收发现你的 done 回执没有覆盖项目配置的验证命令。请实际运行以下命令之一并把命令与结果写入 CCM_AGENT_RECEIPT.verification；如果无法运行，请写明人工核验结果和原因。需要覆盖：${missing}`,
                reason,
            });
        }
    }
    return followUps;
}
function buildIndependentReviewGateFollowUps(input) {
    const task = input.task || (0, collaboration_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const gate = (0, collaboration_acceptance_part_01_1.buildIndependentReviewGate)(task, actualFileChanges, receipts, agentQa);
    if (!gate.required || gate.pass || gate.status === "failed")
        return [];
    const existingText = (input.existingFollowUps || [])
        .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
        .join("\n");
    const assignmentEvidence = (0, collaboration_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const subject = (0, collaboration_1.inferIndependentReviewSubject)({ task, actualFileChanges, receipts, assignmentEvidence });
    if (!subject)
        return [];
    if (gate.status === "needs_recheck") {
        if (/test_agent_review_recheck|重新运行\s*TestAgent|重新复验/i.test(existingText))
            return [];
        const sourceReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "needs_recheck");
        const report = sourceReceipt?.testAgentReport
            || sourceReceipt?.test_agent_report
            || sourceReceipt?.report
            || null;
        const verdict = sourceReceipt?.testAgentVerdict
            || sourceReceipt?.test_agent_verdict
            || report?.verdict
            || null;
        const recheck = (0, collaboration_1.buildTestAgentReviewRecheckFollowUp)({
            subject: (0, collaboration_1.getReceiptIndependentReviewSubject)(sourceReceipt, subject),
            reason: gate.recheck_evidence?.[0]?.summary || gate.reason || "TestAgent 复核证据尚未闭环",
            handoff: (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReceipt),
            report,
            verdict,
            source: "independent_review_needs_recheck",
        });
        return recheck ? [recheck] : [];
    }
    if (gate.status === "needs_environment") {
        if (/test_agent_environment_prepare|补齐.{0,12}(?:环境|登录|运行条件)/i.test(existingText))
            return [];
        const sourceReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "needs_environment");
        const carriedHandoff = (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReceipt);
        const reviewSubject = (0, collaboration_1.getReceiptIndependentReviewSubject)(sourceReceipt, subject);
        const sourceReport = sourceReceipt?.testAgentReport
            || sourceReceipt?.test_agent_report
            || sourceReceipt?.report
            || null;
        const sourceVerdict = sourceReceipt?.testAgentVerdict
            || sourceReceipt?.test_agent_verdict
            || sourceReport?.verdict
            || null;
        const { buildTestAgentEnvironmentPrepChecklist, formatTestAgentEnvironmentPrepUserLines, applyTestAgentEnvironmentPrepToHandoff, } = require("./test-agent-environment-prep");
        const environmentPrep = buildTestAgentEnvironmentPrepChecklist(sourceReport, sourceVerdict);
        const prepLines = formatTestAgentEnvironmentPrepUserLines(environmentPrep);
        const enrichedHandoff = applyTestAgentEnvironmentPrepToHandoff(carriedHandoff, environmentPrep);
        return [{
                mention: `@${reviewSubject}`,
                targetName: reviewSubject,
                project: reviewSubject,
                summary: "补齐 TestAgent 复核条件",
                message: [
                    `TestAgent 暂时无法完成 ${reviewSubject} 的独立复核。`,
                    ...prepLines,
                    "请只补齐复核所需条件并确认服务可运行、测试账号可用或必要配置已生效；不要把环境准备误写成业务代码已经通过。",
                    "完成后提交 CCM_AGENT_RECEIPT，明确补齐了哪些条件（环境变量名 / 登录态文件 / 运行条件）、如何确认可用；不要回传密钥值。",
                    "主 Agent 收到可用结果后会自动沿用原复核工作单重新运行 TestAgent。",
                ].filter(Boolean).join("\n"),
                reason: gate.environment_evidence?.[0]?.summary || environmentPrep?.userSummary || gate.reason || "TestAgent 复核受环境、登录或运行条件阻塞",
                rework_kind: "test_agent_environment_prepare",
                testAgentEnvironmentPreparation: true,
                test_agent_environment_preparation: true,
                testAgentEnvironmentPrep: environmentPrep,
                test_agent_environment_prep: environmentPrep,
                rerunTestAgentAfterCompletion: true,
                rerun_test_agent_after_completion: true,
                reviewSubject,
                originalTarget: reviewSubject,
                testAgentRecheckHandoff: enrichedHandoff,
                test_agent_recheck_handoff: enrichedHandoff,
                userTaskPreview: environmentPrep?.missingEnvNames?.length
                    ? `补齐 ${reviewSubject} 复核条件（缺 ${environmentPrep.missingEnvNames.join("、")}），完成后自动复验`
                    : `补齐 ${reviewSubject} 的复核环境，完成后自动重新运行 TestAgent`,
            }];
    }
    if (/独立.{0,12}(?:验证|复核|检查)|(?:非|不是)原实现者|request_review|fresh\s+verifier|independent\s+(?:verification|review)|code\s+review/i.test(existingText)) {
        return [];
    }
    const highRiskFiles = (gate.high_risk_files || []).map((item) => item.path || "").filter(Boolean).slice(0, 5);
    const reason = gate.reason || "复杂代码变更需要另一个 Agent 复核";
    return [{
            mention: `@${subject}`,
            targetName: subject,
            project: subject,
            summary: "补齐复杂变更独立复核证据",
            message: [
                `主 Agent 验收发现 ${subject} 的交付需要独立复核。请让非原实现者只读检查本次目标覆盖、关键风险、文件变化和已执行验证证据。`,
                highRiskFiles.length ? `重点复核文件：${highRiskFiles.join("、")}` : "",
                "请给出明确结论：通过、需要返工或仍需用户确认；不要只复述原实现者的结论。",
            ].filter(Boolean).join("\n"),
            reason,
            rework_kind: "independent_review_gate",
            independentReviewGate: gate,
            userTaskPreview: `补齐独立复核：复核 ${subject} 的交付证据`,
        }];
}
function buildFailedIndependentReviewReworkFollowUps(input) {
    const task = input.task || (0, collaboration_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const gate = (0, collaboration_acceptance_part_01_1.buildIndependentReviewGate)(task, actualFileChanges, receipts, agentQa);
    if (!gate.required || gate.status !== "failed" || !Array.isArray(gate.failed_evidence) || gate.failed_evidence.length === 0)
        return [];
    const assignmentEvidence = (0, collaboration_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const fallbackSubject = (0, collaboration_1.inferIndependentReviewSubject)({ task, actualFileChanges, receipts, assignmentEvidence });
    const sourceReviewReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "failed");
    const sourceTestAgentHandoff = (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReviewReceipt);
    const routable = new Set((0, group_orchestrator_1.getRoutableMembers)(input.group).map((member) => String(member?.project || "").trim()).filter(Boolean));
    const existingFollowUps = Array.isArray(input.existingFollowUps) ? input.existingFollowUps : [];
    const targetFromEvidence = (item) => {
        const candidates = (0, collaboration_1.uniqueStrings)(item?.reviewSubject, item?.review_subject, item?.subject, item?.requester, fallbackSubject, task?.target_project, task?.targetProject).filter((value) => value && !(0, collaboration_1.isReviewLikeAgentName)(value));
        return candidates.find((value) => routable.size === 0 || routable.has(value)) || "";
    };
    const grouped = new Map();
    for (const failed of gate.failed_evidence || []) {
        const target = targetFromEvidence(failed);
        if (!target)
            continue;
        const current = grouped.get(target) || [];
        current.push(failed);
        grouped.set(target, current);
    }
    const followUps = [];
    for (const [target, failures] of grouped.entries()) {
        const existingSameTargetText = existingFollowUps
            .filter((item) => String(item?.targetName || item?.project || item?.agent || "").trim() === target)
            .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
            .join("\n");
        if (/(?:TestAgent|复核|验证).{0,30}(?:未通过|不通过|返工|失败)|failed_review|test_agent_failed/i.test(existingSameTargetText)) {
            continue;
        }
        const reviewers = (0, collaboration_1.uniqueStrings)(failures.map((item) => item?.reviewer).filter(Boolean)).slice(0, 3);
        const findingLines = (0, collaboration_1.uniqueStrings)(failures.map((item) => item?.summary).filter(Boolean), failures.flatMap((item) => Array.isArray(item?.evidence) ? item.evidence : [])).map((item) => (0, memory_1.compactMemoryText)(item, 260)).filter(Boolean).slice(0, 8);
        const reviewerLabel = reviewers.length ? reviewers.join("、") : "TestAgent";
        const reason = `${reviewerLabel} 复核未通过，需要原实现成员修复后重新复核`;
        followUps.push({
            mention: `@${target}`,
            targetName: target,
            project: target,
            summary: "复核未通过，交回原实现成员返工",
            message: [
                `${reviewerLabel} 已判定 ${target} 的交付还不能验收。请回到原实现上下文修复失败点，修复后重新提交 CCM_AGENT_RECEIPT；主 Agent 会再次运行 TestAgent 复核。`,
                findingLines.length ? "复核发现：" : "",
                ...findingLines.map((line) => `- ${line}`),
                "返工要求：修复根因，不只改表面现象；补跑与失败点相关的最小必要验证；在结果说明里写清楚修复内容、验证结果和剩余风险。",
                "下一步：返工完成后，主 Agent 会自动沿用原工作单重新运行 TestAgent 复核；只有复核通过后才能给用户做完成总结。",
            ].filter(Boolean).join("\n"),
            reason,
            rework_kind: "test_agent_failed_review_rework",
            reviewFailed: true,
            reviewSubject: target,
            originalTarget: target,
            rerunTestAgentAfterCompletion: true,
            rerun_test_agent_after_completion: true,
            testAgentRecheckHandoff: sourceTestAgentHandoff,
            test_agent_recheck_handoff: sourceTestAgentHandoff,
            failedReviewGate: gate,
            failedReviewEvidence: failures,
            userTaskPreview: `返工 ${target}：复核未通过，修复后重新复核`,
        });
    }
    return (0, memory_1.uniqueByKey)(followUps, (item) => `${String(item?.targetName || item?.project || "").trim()}|test_agent_failed_review_rework`, 12);
}
function testAgentDecisionReceiptStatus(report, verdict) {
    if (verdict?.canAccept === true)
        return "done";
    if (verdict?.needsRework === true)
        return "failed";
    if (verdict?.needsRecheck === true || verdict?.needsEnvironment === true)
        return "blocked";
    if (verdict?.needsHuman === true)
        return "blocked";
    return (0, collaboration_1.testAgentStatusToReceiptStatus)(verdict?.status || report.status);
}
function buildNativeTestAgentReceipt(targetName, report, handoff = null, workOrder = null, invocationResult = null) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentReceipt(targetName, report, handoff, workOrder, invocationResult);
}
function buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch = null, handoff = null) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch, handoff);
}
function runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext = {}) {
    const message = (0, collaboration_1.runtimeToolDispatchBlockedMessage)(projectName, runtimeToolContext);
    return {
        agent: projectName,
        status: "blocked",
        summary: message,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [message],
        needs: ["在 CCM 工具配置中修复缺失 MCP/Skill，或从项目/群聊授权中移除不可用项后重新派发"],
        runtimeToolDispatchGate: runtimeToolContext.dispatchGate || runtimeToolContext.audit?.dispatch_gate || null,
    };
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    if (task?.workflow_type !== "daily_dev")
        return false;
    if (!summary || execution?.status === "failed")
        return false;
    const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || execution?.receipt?.status === "done"
        || task?.receipt?.status === "done";
    const hasBlockingReceipt = receiptStatuses.some((item) => ["failed", "blocked", "needs_info", "partial"].includes(String(item?.status || "")));
    const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || execution?.fileChanges?.count || 0);
    const executedVerificationCount = Number(summary.verification_executed?.length || 0);
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || 0);
    const openSummaryItems = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.blocking_needs)
            ? summary.blocking_needs
            : (Array.isArray(summary.needs) ? summary.needs.filter((item) => !(0, collaboration_1.isAdvisoryNeed)(item, task)) : [])),
        ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
        ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
    ].filter(Boolean);
    if (hasBlockingReceipt || openSummaryItems.length > 0)
        return false;
    if (coordinationPlanCount <= 0 || assignmentCount <= 0 || workerNotificationCount <= 0)
        return false;
    if (!hasDoneReceipt || !summary.has_final_review)
        return false;
    if ((0, collaboration_1.taskRequiresCodeChanges)(task) && actualChangeCount <= 0)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && executedVerificationCount <= 0)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && summary.verification_required_gate_passed === false)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && summary.verification_source_gate_passed !== true)
        return false;
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        return false;
    if (summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true)
        return false;
    if (((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) && summary.ack_gate_passed !== true)
        return false;
    if (((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) && summary.receipt_quality_gate_passed !== true)
        return false;
    if (summary.contract_injection_gate_passed === false)
        return false;
    if (summary.work_item_summary?.total && summary.work_item_summary.all_completed !== true)
        return false;
    if (summary.acceptance_gate && summary.acceptance_gate.pass !== true)
        return false;
    return true;
}
function buildTaskGapContinuationDraft(task) {
    const summary = task?.delivery_summary || {};
    const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || assignmentEvidence.length || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || workerNotifications.length || 0);
    const relatedWorkers = (0, collaboration_1.uniqueStrings)([
        ...workerNotifications.map((item) => item.task_id),
        ...assignmentEvidence.map((item) => item.project),
        ...((Array.isArray(summary.receipts) ? summary.receipts : []).map((item) => item.agent)),
        ...((Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []).map((item) => item.agent)),
        ...((Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []).map((item) => item.agent)),
    ].filter(Boolean)).slice(0, 8);
    const lines = [
        `请继续推进任务：${task?.title || ""}`,
        "",
    ];
    if (relatedWorkers.length) {
        lines.push("同一子 Agent 续跑目标：");
        relatedWorkers.forEach(worker => lines.push(`- ${worker}：continuationStrategy=same_worker_scratchpad，优先承接上一轮执行结果和结果说明继续处理。`));
        lines.push("");
    }
    if (workerNotifications.length) {
        lines.push("上一轮子 Agent 执行结果：");
        workerNotifications.slice(0, 10).forEach((item) => {
            lines.push(`- ${item.task_id || "未知子 Agent"}：执行状态 ${item.status || "unknown"} / 结果说明 ${item.receipt_status || "missing"}；${String(item.summary || item.result || "无摘要").slice(0, 500)}`);
        });
        lines.push("");
    }
    const blockers = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.needs) ? summary.needs : []),
    ].filter(Boolean);
    if (blockers.length) {
        lines.push("需要处理的阻塞/待补充：");
        blockers.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    const coordinationGaps = [
        coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据：请先重新理解业务文档，输出可验收的协调计划，再派发 Worker。",
        assignmentCount > 0 ? "" : "缺少主 Agent 派发证据：请生成 self-contained assignment，并明确派发给目标项目子 Agent。",
        workerNotificationCount > 0 ? "" : "缺少子 Agent 执行结果：请让目标子 Agent 实际执行，并提交可验收的结构化结果说明。",
    ].filter(Boolean);
    if (coordinationGaps.length) {
        lines.push("需要补齐的主 Agent 协作证据：");
        coordinationGaps.forEach(item => lines.push(`- ${item}`));
        lines.push("");
    }
    if (summary.agent_qa_required && summary.agent_qa_gate_passed !== true) {
        lines.push("需要补齐的 Agent 协作问答证据：");
        lines.push(`- 当前问答 ${Number(summary.agent_qa_count || 0)} 条、采纳 ${Number(summary.agent_qa_accepted_count || 0)} 条、回答后续跑 ${Number(summary.agent_qa_resumed_count || 0)} 条。`);
        lines.push("- 让实际被阻塞的子 Agent 输出 ask_agent/request_review，目标 Agent 提供文件、合同或验证证据；主 Agent 采纳后必须自动恢复原任务会话。不得用普通 @消息冒充 Agent QA。");
        lines.push("");
    }
    const ackRewriteRows = (0, protocol_gates_1.getTaskAckRewriteRows)(task);
    if (ackRewriteRows.length) {
        lines.push("需要先返工的 ACK 前置审核：");
        ackRewriteRows.slice(0, 10).forEach((row) => {
            lines.push(`- ${row.agent}：${row.reason || "ACK 不合格"}。请只重写接单 ACK，必须包含 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear。`);
            if (row.unclear?.length)
                lines.push(`  - 未澄清项：${row.unclear.join("；")}`);
        });
        lines.push("- ACK 未通过前不得宣布 daily_dev 完成；ACK 合格后再继续实现、验证或验收。");
        lines.push("");
    }
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    if (contractGate.required && !contractGate.pass) {
        lines.push("需要注入依赖 Agent 的 contractChanges：");
        contractGate.missing.slice(0, 12).forEach((row) => {
            const endpoint = row.endpoint || row.type || "contract";
            const injection = (0, runtime_kernel_1.buildContractInjectionEvent)({
                traceId: task?.trace_id || task?.traceId || "",
                taskId: task?.id || "",
                sourceAgent: row.source || row.source_agent || row.producer || "",
                targetAgent: row.target || row.consumer || "",
                contract: row,
            });
            lines.push(`- ${row.target}：续跑同一任务和同 Agent 会话，注入 ${endpoint}；injection_id=${injection.injection_id}。${row.summary || "结构化契约变化需要同步给消费者 Agent"}`);
        });
        contractGate.unconsumed.slice(0, 12).forEach((row) => {
            const endpoint = row.endpoint || row.type || "contract";
            lines.push(`- ${row.target}：已收到 ${endpoint} 注入但回执未完成消费；请复用原任务和同 Agent 会话续跑，回执 consumedInjectionIds 必须包含 ${row.injection_id}，contractConsumption 必须写 status=adapted/no_change/not_required 之一，并附适配/无需适配/验证证据。${row.consumption_reason ? `当前问题：${row.consumption_reason}` : ""}`);
        });
        lines.push("- 主 Agent 必须优先复用原任务、原 Trace、原 native session/scratchpad，通过同一任务卡继续派发，不要新建无关任务。");
        lines.push("- 依赖 Agent 收到注入后必须说明是否需要适配代码、是否已完成适配和验证；回执里保留 contractChanges 消费结论，并引用对应 injection_id。");
        lines.push("");
    }
    if (Array.isArray(summary.verification_required_missing) && summary.verification_required_missing.length) {
        lines.push("需要补齐的项目验证命令证据：");
        summary.verification_required_missing.slice(0, 10).forEach((item) => {
            const required = Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置验证命令";
            lines.push(`- ${item?.agent || "未知 Agent"}：请实际运行并回执 ${required}`);
        });
        lines.push("");
    }
    if (Array.isArray(summary.verification_suggested) && summary.verification_suggested.length) {
        lines.push("以下验证只是建议或未执行，需要改为实际执行结果：");
        summary.verification_suggested.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    if (Array.isArray(summary.verification_failed) && summary.verification_failed.length) {
        lines.push("以下验证失败，需要修复后重新验证：");
        summary.verification_failed.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true) {
        const independentGate = summary.independent_review_gate || {};
        const failedEvidence = Array.isArray(independentGate.failed_evidence) ? independentGate.failed_evidence : [];
        if (independentGate.status === "failed" || failedEvidence.length) {
            lines.push("复杂变更复核未通过，需要原实现成员返工：");
            lines.push(`- 触发原因：${independentGate.reason || "复杂代码变更复核未通过"}`);
            failedEvidence.slice(0, 6).forEach((item) => {
                const subject = item.reviewSubject || item.review_subject || item.requester || "";
                const reviewer = item.reviewer || "TestAgent";
                const summaryLine = (0, memory_1.compactMemoryText)(item.summary || (Array.isArray(item.evidence) ? item.evidence.join("；") : "") || "复核未通过", 420);
                lines.push(`- ${subject ? `${subject}：` : ""}${reviewer} 复核未通过；${summaryLine}`);
            });
            lines.push("- 让原实现成员复用同一任务和同一子 Agent 上下文修复失败点；修复后重新提交结果说明，并重新运行 TestAgent/独立复核。");
            lines.push("- 主 Agent 不能把失败复核当作已完成；只有修复后复核通过，才能进入最终总结。");
        }
        else {
            lines.push("需要补齐的复杂变更独立复核：");
            lines.push(`- 触发原因：${independentGate.reason || "复杂代码变更需要另一个 Agent 复核"}`);
            const highRiskFiles = Array.isArray(independentGate.high_risk_files) ? independentGate.high_risk_files : [];
            highRiskFiles.slice(0, 8).forEach((item) => {
                lines.push(`- 高风险文件：${[item.project, item.path].filter(Boolean).join(": ")}`);
            });
            lines.push("- 让非原实现者的 Agent 使用 request_review 做只读复核，检查目标覆盖、关键风险和验证证据；主 Agent 采纳回答后必须回到原任务继续收敛。");
            lines.push("- 或让第三方写代码 Agent 在 CCM_AGENT_RECEIPT.independentReview / codeReview 中返回 reviewer、verdict=passed、summary 和 evidence。");
        }
        lines.push("");
    }
    if (summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true) {
        const spotCheckGate = summary.post_review_spot_check_gate || {};
        const spotCheckSummary = summary.post_review_spot_check_summary || spotCheckGate.summary || {};
        lines.push("TestAgent 通过后的完成前抽查尚未通过：");
        lines.push(`- ${spotCheckSummary.headline || spotCheckGate.reason || "主 Agent 还没有完成关键验证抽查。"}`);
        lines.push("- 优先沿用原 TestAgent 工作单重新复验，并根据最新真实输出重新判断。");
        lines.push("- 抽查与 TestAgent 结论一致前，不能进入最终完成总结。");
        lines.push("");
    }
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].filter((item) => item && item.status && item.status !== "done");
    if (receipts.length) {
        lines.push("需要跟进的子 Agent 结果说明：");
        receipts.slice(0, 8).forEach((item) => {
            lines.push(`- ${item.agent || "未知 Agent"}：${item.status || "unknown"}；${String(item.summary || item.message || "无摘要").slice(0, 500)}`);
            const needs = [
                ...(Array.isArray(item.blockers) ? item.blockers : []),
                ...(Array.isArray(item.needs) ? item.needs : []),
            ].filter(Boolean);
            needs.slice(0, 5).forEach((need) => lines.push(`  - ${String(need).slice(0, 500)}`));
        });
        lines.push("");
    }
    if (task?.review?.content || task?.review?.summary) {
        lines.push("主 Agent 复盘提示：");
        lines.push(String(task.review.content || task.review.summary).slice(0, 1200));
        lines.push("");
    }
    lines.push("继续执行要求：");
    lines.push("- 主 Agent 先判断这些阻塞是否已被本次补充消解。");
    lines.push("- 如可继续，优先派发给相关子 Agent 返工，并保持同一子 Agent 上下文续跑；不要重新派给无关 Agent。");
    lines.push("- 子 Agent 返工工作单必须写清上一轮执行结果/结果说明缺口、补齐动作、实际文件变更和验证命令。");
    lines.push("- 完成后仍需主 Agent 协调计划、派发证据、子 Agent 执行结果、结构化结果说明、主 Agent 复盘、实际变更证据和已执行验证记录。");
    return lines.filter((line, index, arr) => line || arr[index - 1]).join("\n").trim();
}
function getTaskGapItems(task) {
    const summary = task?.delivery_summary || {};
    const items = [];
    if (summary.acceptance_gate_passed === true && !(0, collaboration_1.hasStrongTaskAcceptanceEvidence)(task, [], summary))
        items.push("acceptance_evidence");
    if (Number(summary.coordination_plan_count || 0) <= 0)
        items.push("coordination_plan");
    if (Number(summary.assignment_count || 0) <= 0)
        items.push("assignment_evidence");
    if (Number(summary.worker_notification_count || 0) <= 0)
        items.push("worker_notification");
    for (const value of Array.isArray(summary.blockers) ? summary.blockers : [])
        items.push(`blocker:${(0, memory_1.compactMemoryText)(value, 240)}`);
    const blockingNeeds = Array.isArray(summary.blocking_needs)
        ? summary.blocking_needs
        : Array.isArray(summary.needs)
            ? summary.needs
            : [];
    for (const value of blockingNeeds)
        items.push(`need:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : [])
        items.push(`verification_failed:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_suggested) ? summary.verification_suggested : [])
        items.push(`verification_unexecuted:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []) {
        const required = (Array.isArray(value?.required) ? value.required : []).map((item) => (0, memory_1.compactMemoryText)(item, 160)).sort().join("|");
        items.push(`verification_required:${(0, memory_1.compactMemoryText)(value?.agent || "agent", 80)}:${required}`);
    }
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    for (const receipt of receipts) {
        const status = String(receipt?.status || "").trim();
        if (status && status !== "done")
            items.push(`receipt:${(0, memory_1.compactMemoryText)(receipt?.agent || "agent", 80)}:${status}`);
    }
    for (const row of (0, protocol_gates_1.getTaskAckRewriteRows)(task)) {
        items.push(`ack_rewrite:${(0, memory_1.compactMemoryText)(row.agent, 80)}:${row.status}:${(0, memory_1.compactMemoryText)(row.reason, 180)}`);
    }
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    for (const row of contractGate.missing || []) {
        items.push(`contract_inject:${(0, memory_1.compactMemoryText)(row.target, 80)}:${(0, memory_1.compactMemoryText)(row.endpoint || row.type || "contract", 180)}`);
    }
    for (const row of contractGate.unconsumed || []) {
        items.push(`contract_consume:${(0, memory_1.compactMemoryText)(row.target, 80)}:${(0, memory_1.compactMemoryText)(row.injection_id || row.endpoint || row.type || "contract", 180)}`);
    }
    const latestWorkerNotifications = new Map();
    for (const notification of Array.isArray(summary.worker_notifications) ? summary.worker_notifications : []) {
        const worker = (0, memory_1.compactMemoryText)(notification?.task_id || notification?.agent || "worker", 80);
        latestWorkerNotifications.set(worker.toLowerCase(), notification);
    }
    for (const notification of latestWorkerNotifications.values()) {
        const status = String(notification?.status || "").trim();
        const receiptStatus = String(notification?.receipt_status || "").trim();
        if (["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status) || (receiptStatus && receiptStatus !== "done")) {
            items.push(`notification:${(0, memory_1.compactMemoryText)(notification?.task_id || notification?.agent || "worker", 80)}:${status}:${receiptStatus}`);
        }
    }
    if (summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true)
        items.push("agent_qa_evidence");
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        items.push(`independent_review:${(0, memory_1.compactMemoryText)(summary.independent_review_gate?.reason || "required", 220)}`);
    return (0, collaboration_1.uniqueStrings)(items.filter(Boolean)).sort();
}
function getTaskGapFingerprint(task) {
    const items = getTaskGapItems(task);
    if (!items.length)
        return "";
    return crypto.createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 24);
}
function canAutoContinueTaskGaps(task) {
    if (!(0, collaboration_1.hasDailyDevContinuationGaps)(task))
        return false;
    const fingerprint = getTaskGapFingerprint(task);
    const previous = task?.collaboration_state?.gap || {};
    return !(fingerprint && previous.fingerprint === fingerprint && Number(previous.auto_attempts || 0) >= 1);
}
//# sourceMappingURL=collaboration-acceptance-part-02.js.map