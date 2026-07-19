"use strict";
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
exports.runCoordinatorReviewLoop = runCoordinatorReviewLoop;
exports.finalizeTaskKernel = finalizeTaskKernel;
exports.processTargetQueue = processTargetQueue;
exports.enqueueTask = enqueueTask;
exports.createAndQueueTask = createAndQueueTask;
exports.backfillTaskTraceIds = backfillTaskTraceIds;
exports.resumeTaskQueues = resumeTaskQueues;
exports.getQueueStatus = getQueueStatus;
exports.getTaskTargetKeyFromTask = getTaskTargetKeyFromTask;
exports.isTaskQueuedInMemory = isTaskQueuedInMemory;
exports.getTaskAgeMs = getTaskAgeMs;
// Behavior-freeze split from collaboration-runtime-coordinator-review.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 6/9).
const fs = __importStar(require("fs"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const display_1 = require("./display");
const memory_1 = require("./memory");
const memory_context_consumption_receipt_1 = require("../../integrations/memory-context-consumption-receipt");
const agent_receipts_1 = require("./agent-receipts");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const worktree_1 = require("../../agents/worktree");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const task_agent_invocation_lineage_1 = require("../../tasks/task-agent-invocation-lineage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const memory_2 = require("../../projects/memory");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const worker_handoff_1 = require("../../agents/worker-handoff");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_cross_agent_runtime_1 = require("./collaboration-runtime-cross-agent-runtime");
const collaboration_runtime_test_agent_handoff_1 = require("./collaboration-runtime-test-agent-handoff");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
async function runCoordinatorReviewLoop(input) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(input.group);
    const seenMentions = new Set();
    const allOutputs = [...(input.crossOutputs || [])];
    const pendingTestAgentRechecks = [];
    const testAgentRecheckCountsBySubject = new Map();
    // A bounded five-stage loop supports initial review -> repair/preparation ->
    // TestAgent recheck -> optional spot-check repair -> final acceptance.
    const maxReviewRounds = collaboration_runtime_test_agent_handoff_1.COORDINATOR_REVIEW_MAX_ROUNDS;
    if (allOutputs.length === 0)
        return null;
    let lastReview = null;
    for (let round = 1; round <= maxReviewRounds; round++) {
        const allowFollowUps = round < maxReviewRounds;
        const scheduledBudget = (0, collaboration_runtime_test_agent_handoff_1.applyTestAgentRecheckBudget)(pendingTestAgentRechecks.splice(0, pendingTestAgentRechecks.length), testAgentRecheckCountsBySubject);
        const scheduledTestAgentRechecks = scheduledBudget.kept;
        if (scheduledBudget.blocked.length && input.streamRes) {
            (0, collaboration_runtime_daily_dev_1.writeSse)(input.streamRes, {
                type: "status",
                text: scheduledBudget.blocked.map((item) => item.reason).slice(0, 2).join("；"),
                agent: coordinator.project,
            });
        }
        const scheduledReviewSubjects = new Set(scheduledTestAgentRechecks
            .map((item) => String(item?.reviewSubject || item?.originalTarget || "").trim())
            .filter(Boolean));
        let review = await (0, group_orchestrator_1.runLlmCoordinatorReview)(input.group, input.userMessage, input.coordinatorOutput, allOutputs, { allowFollowUps, round, maxRounds: maxReviewRounds, taskId: input.taskId || "", executionId: input.taskId || "", groupSessionId: input.groupSessionId || "" });
        if (!review) {
            review = (0, collaboration_runtime_daily_dev_1.buildCodedCoordinatorReview)(input.group, allOutputs, {
                allowFollowUps,
                round,
                maxRounds: maxReviewRounds,
            });
        }
        lastReview = review;
        const proposedLlmFollowUps = Array.isArray(review.followUps) ? review.followUps : [];
        const gateFollowUps = (0, collaboration_runtime_daily_dev_1.buildEvidenceGateFollowUps)(input.group, allOutputs)
            .filter((item) => !(scheduledTestAgentRechecks.length && (0, collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName)(item?.targetName || item?.project)));
        const failedIndependentReviewFollowUps = (0, collaboration_runtime_daily_dev_1.buildFailedIndependentReviewReworkFollowUps)({
            group: input.group,
            taskId: input.taskId || "",
            outputs: allOutputs,
            existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps],
        }).filter((item) => !scheduledReviewSubjects.has(String(item?.reviewSubject || item?.targetName || item?.project || "").trim()));
        const postReviewSpotCheckFollowUps = (0, collaboration_runtime_daily_dev_1.buildPostReviewSpotCheckFollowUps)({
            group: input.group,
            taskId: input.taskId || "",
            outputs: allOutputs,
            existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps, ...failedIndependentReviewFollowUps],
        });
        const independentReviewGateFollowUpsRaw = (0, collaboration_runtime_daily_dev_1.buildIndependentReviewGateFollowUps)({
            group: input.group,
            taskId: input.taskId || "",
            outputs: allOutputs,
            existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps],
        }).filter((item) => !scheduledReviewSubjects.has(String(item?.reviewSubject || item?.targetName || item?.project || "").trim()));
        const independentReviewBudget = (0, collaboration_runtime_test_agent_handoff_1.applyTestAgentRecheckBudget)(independentReviewGateFollowUpsRaw, testAgentRecheckCountsBySubject);
        const independentReviewGateFollowUps = independentReviewBudget.kept;
        if (independentReviewBudget.blocked.length) {
            review.test_agent_recheck_budget_blocked = [
                ...(review.test_agent_recheck_budget_blocked || []),
                ...independentReviewBudget.blocked,
                ...scheduledBudget.blocked,
            ];
            if (input.streamRes) {
                (0, collaboration_runtime_daily_dev_1.writeSse)(input.streamRes, {
                    type: "status",
                    text: independentReviewBudget.blocked.map((item) => item.reason).slice(0, 2).join("；"),
                    agent: coordinator.project,
                });
            }
        }
        const hardReviewFollowUps = [
            ...scheduledTestAgentRechecks,
            ...failedIndependentReviewFollowUps,
            ...postReviewSpotCheckFollowUps,
            ...independentReviewGateFollowUps,
        ];
        const llmFollowUps = (0, collaboration_runtime_test_agent_handoff_1.filterCoordinatorLlmFollowUpsAgainstHardRoutes)(proposedLlmFollowUps, hardReviewFollowUps, scheduledTestAgentRechecks.length > 0);
        // Never dispatch another Worker from the final review round.  Previously
        // LLM-proposed follow-ups bypassed `allowFollowUps`, so the last round could
        // start one more execution even though the loop was already exhausted.
        const followUps = allowFollowUps
            ? (0, memory_1.uniqueByKey)([...scheduledTestAgentRechecks, ...llmFollowUps, ...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps, ...independentReviewGateFollowUps], (item) => `${String(item?.targetName || item?.project || "").trim()}|${(0, collaboration_runtime_task_queue_1.normalizeMentionTask)(String(item?.message || item?.task || ""))}`, 20)
            : [];
        const reviewTask = input.taskId ? (0, db_1.loadTasks)().find((item) => item.id === input.taskId) : null;
        const memorySnapshot = (0, memory_1.loadGroupMemory)(input.groupId, reviewTask ? (0, collaboration_runtime_task_queue_1.groupSessionIdForTask)(reviewTask) : "");
        const reworkFollowUps = followUps.map((item) => (0, collaboration_runtime_test_agent_handoff_1.buildCoordinatorReworkFollowUp)(item, {
            group: input.group,
            memorySnapshot,
            userMessage: input.userMessage,
            coordinatorOutput: input.coordinatorOutput,
            round,
            maxRounds: maxReviewRounds,
            taskId: input.taskId || "",
        }));
        const dispatchableReworkFollowUps = reworkFollowUps.filter((item) => !item.dispatchBlocked
            && String(item?.targetName || item?.project || "").trim()
            && String(item?.message || item?.task || "").trim());
        const blockedVerifierFollowUps = reworkFollowUps.filter((item) => item.dispatchBlocked);
        if (reworkFollowUps.length) {
            review.rework_routes = reworkFollowUps.map((item) => item.reworkRoute).filter(Boolean);
            if (review.structured_review && typeof review.structured_review === "object") {
                review.structured_review.rework_routes = review.rework_routes;
                if (Array.isArray(review.structured_review.follow_ups)) {
                    review.structured_review.follow_ups = review.structured_review.follow_ups.map((followUp, index) => ({
                        ...followUp,
                        route: reworkFollowUps[index]?.reworkRoute || null,
                    }));
                }
            }
        }
        const gateReasons = [...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps, ...independentReviewGateFollowUps]
            .map((item) => String(item.reason || "").trim())
            .filter(Boolean);
        if (blockedVerifierFollowUps.length && dispatchableReworkFollowUps.length === 0) {
            review.status = "needs_user";
        }
        if (!allowFollowUps && gateReasons.length) {
            review.status = "needs_user";
        }
        let reviewContent = gateReasons.length
            ? `${review.content}\n\n系统验收门禁：${gateReasons.join("；")}${allowFollowUps ? "" : "\n已达到自动返工上限，需要用户确认是否继续派发或人工介入。"}`
            : review.content;
        if (reworkFollowUps.length) {
            reviewContent = [
                reviewContent,
                "",
                "主 Agent 返工工作单：",
                ...reworkFollowUps.map((item) => {
                    const preview = item.summary ? `${(0, display_1.sanitizeMainAgentUserText)(item.summary, "补齐结果说明和验证证据", 80)}：` : "";
                    const routeLabel = item.reworkRoute?.user_label || "继续补齐缺口";
                    const reason = (0, display_1.sanitizeMainAgentUserText)(item.reason || item.task || item.message || "", "补齐可验收证据", 140);
                    if (item.dispatchBlocked) {
                        return `需要配置独立验证 Agent：${item.userTaskPreview || reason}`;
                    }
                    return `@${item.targetName || item.project} ${routeLabel}：${preview}${reason}`;
                }),
            ].join("\n");
        }
        const followUpAssignments = (0, collaboration_runtime_task_queue_1.normalizePlanAssignments)(dispatchableReworkFollowUps.map((item) => ({
            project: String(item?.targetName || item?.project || "").trim(),
            task: String(item?.message || item?.task || "").trim(),
            reason: String(item?.reason || "主 Agent 复盘后发现仍有缺口，需要补充处理").trim(),
            summary: String(item?.summary || item?.reason || "").trim(),
            dependsOn: String(item?.dependsOn || "").trim(),
            rework: true,
            continuationOf: String(item?.continuationOf || item?.targetName || item?.project || "").trim(),
            continuationStrategy: String(item?.continuationStrategy || "same_worker_scratchpad").trim(),
            reworkRoute: item?.reworkRoute || null,
            originalTarget: String(item?.originalTarget || item?.reviewSubject || "").trim(),
            reviewSubject: String(item?.reviewSubject || item?.originalTarget || "").trim(),
            verifierSelection: item?.verifierSelection || null,
            testAgentHandoff: item?.testAgentHandoff || item?.test_agent_handoff || null,
            test_agent_handoff: item?.testAgentHandoff || item?.test_agent_handoff || null,
            testAgentHandoffWarnings: item?.testAgentHandoffWarnings || item?.test_agent_handoff_warnings || item?.testAgentHandoff?.warnings || item?.test_agent_handoff?.warnings || [],
            test_agent_handoff_warnings: item?.testAgentHandoffWarnings || item?.test_agent_handoff_warnings || item?.testAgentHandoff?.warnings || item?.test_agent_handoff?.warnings || [],
            testAgentWorkOrder: item?.testAgentWorkOrder || item?.test_agent_work_order || null,
            test_agent_work_order: item?.testAgentWorkOrder || item?.test_agent_work_order || null,
            userTaskPreview: String(item?.userTaskPreview || item?.summary || item?.reason || "").trim(),
            attempt: round + 1,
        })).filter((item) => item.project && item.task));
        const reviewMessageId = await (0, collaboration_runtime_cross_agent_runtime_1.appendCoordinatorMessage)(input.groupId, coordinator.project, reviewContent, input.streamRes, `review${round}`, followUpAssignments.length > 0
            ? {
                assignments: followUpAssignments,
                executionOrder: input.executionOrder || "parallel",
                runtime: "llm-review",
                workflow: (0, collaboration_runtime_task_queue_1.buildWorkflowMeta)("rework", `第 ${round} 轮验收后返工`),
                rework_routes: reworkFollowUps.map((item) => item.reworkRoute).filter(Boolean),
                blocked_rework_followups: blockedVerifierFollowUps,
            }
            : {
                runtime: "llm-review",
                workflow: (0, collaboration_runtime_task_queue_1.buildWorkflowMeta)(review.status === "needs_user" ? "needs_user" : "reviewing", `第 ${round} 轮主 Agent 验收`),
                blocked_rework_followups: blockedVerifierFollowUps,
            });
        (0, memory_1.updateGroupMemory)(input.groupId, {
            currentPhase: followUpAssignments.length > 0 ? "rework" : (review.status === "needs_user" ? "needs_user" : "reviewing"),
            decision: `主 Agent 第 ${round} 轮验收：${review.status || "review"}`,
            reason: gateReasons.join("；") || (review.gaps || []).join("；") || (review.conflicts || []).join("；"),
            openQuestion: review.content?.includes("需要你确认") ? review.content : "",
            nextAction: followUpAssignments.length > 0 ? `执行第 ${round} 轮返工计划` : "等待用户确认或进入最终总结",
        });
        if (dispatchableReworkFollowUps.length === 0) {
            input.crossOutputs.splice(0, input.crossOutputs.length, ...allOutputs);
            return review;
        }
        const followUpPreview = dispatchableReworkFollowUps
            .map((item) => `${item.targetName || item.project}${item.summary ? `：${(0, display_1.sanitizeMainAgentUserText)(item.summary, "补齐结果说明和验证证据", 48)}` : ""}`)
            .filter(Boolean)
            .slice(0, 3)
            .join("、");
        (0, collaboration_runtime_daily_dev_1.writeSse)(input.streamRes, {
            type: "status",
            text: followUpPreview
                ? `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问：${followUpPreview}`
                : `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问相关子 Agent...`,
            agent: coordinator.project,
        });
        const followOutputs = await (0, collaboration_runtime_cross_agent_runtime_1.processCrossAgents)(input.groupId, input.group, coordinator.project, reviewContent, dispatchableReworkFollowUps, input.configs, input.ctx, input.streamRes, round, seenMentions, input.executionOrder || "parallel", reviewMessageId, input.taskId || "");
        allOutputs.push(...followOutputs);
        pendingTestAgentRechecks.push(...(0, collaboration_runtime_test_agent_handoff_1.scheduleTestAgentRecheckAfterFollowUps)(dispatchableReworkFollowUps, followOutputs));
    }
    const finalSummary = lastReview
        || await (0, group_orchestrator_1.runLlmCoordinatorSummary)(input.group, input.userMessage, allOutputs, { groupSessionId: input.groupSessionId || "" })
        || (0, group_orchestrator_1.buildCodedCoordinatorSummary)(input.group, allOutputs);
    if (finalSummary) {
        await (0, collaboration_runtime_cross_agent_runtime_1.appendCoordinatorMessage)(input.groupId, finalSummary.agent || coordinator.project, finalSummary.content, input.streamRes, "final", { workflow: (0, collaboration_runtime_task_queue_1.buildWorkflowMeta)(finalSummary.status === "needs_user" ? "needs_user" : "complete", "最终验收") });
        (0, memory_1.updateGroupMemory)(input.groupId, {
            currentPhase: finalSummary.status === "needs_user" ? "needs_user" : "complete",
            decision: "主 Agent 完成最终验收",
            reason: (0, memory_1.compactMemoryText)(finalSummary.content || "", 300),
            nextAction: finalSummary.status === "needs_user" ? "等待用户补充信息" : "本轮协作已完成",
        });
    }
    input.crossOutputs.splice(0, input.crossOutputs.length, ...allOutputs);
    return finalSummary;
}
function requirementEpicExecutionBoundary(task) {
    const item = task?.requirement_item;
    if (task?.parent_workflow_type !== "requirement_epic" || !item)
        return "";
    return [
        "【已确认的 Requirement Epic 子任务边界】",
        `item_key：${item.item_key || task.requirement_item_key || ""}`,
        `标题：${item.title || task.title || ""}`,
        `业务目标：${item.business_goal || task.business_goal || ""}`,
        `范围：${(item.scope || []).join("；") || "仅限本子任务"}`,
        `验收标准：${(item.acceptance_criteria || []).join("；") || task.acceptance_criteria || ""}`,
        `依赖：${(item.depends_on || []).join("、") || "无"}`,
        "这是用户已确认的范围。主 Agent 和子 Agent不得静默扩大、删减或替换；发现冲突或需要跨项变更时暂停并请求用户调整 Epic 计划。",
    ].join("\n");
}
function alignRequirementEpicAssignments(task, assignments) {
    const boundary = requirementEpicExecutionBoundary(task);
    if (!boundary)
        return assignments;
    return assignments.map((assignment) => ({
        ...assignment,
        task: [assignment.task || task.description || task.title, boundary].filter(Boolean).join("\n\n"),
        requirement_item_key: task.requirement_item_key || task.requirement_item?.item_key || "",
        confirmed_scope_locked: true,
    }));
}
// === 执行任务核心 ===
async function executeTask(task, ctx) {
    return require("./collaboration-task-executor").executeTask(task, ctx, {
        addTaskLog: logs_1.addTaskLog,
        admitChildTypedMemoryDelivery: memory_1.admitChildTypedMemoryDelivery,
        alignRequirementEpicAssignments,
        appendGroupMessage: storage_1.appendGroupMessage,
        appendTaskTimelineEvent: logs_1.appendTaskTimelineEvent,
        assertRuntimeToolDispatchReady: collaboration_runtime_runtime_tools_1.assertRuntimeToolDispatchReady,
        attachExecutionWorkspace: execution_kernel_1.attachExecutionWorkspace,
        attachInvokedSkillsToReceipt: collaboration_runtime_task_queue_1.attachInvokedSkillsToReceipt,
        attachMemoryContextConsumptionChallenge: memory_context_consumption_receipt_1.attachMemoryContextConsumptionChallenge,
        bindTaskAgentInvocationContext: task_agent_invocation_lineage_1.bindTaskAgentInvocationContext,
        bindTaskAgentInvocationMemoryDelivery: task_agent_invocation_lineage_1.bindTaskAgentInvocationMemoryDelivery,
        bindTaskAgentInvocationRunnerRequest: task_agent_invocation_lineage_1.bindTaskAgentInvocationRunnerRequest,
        bindTaskAgentMemoryContextSnapshot: agent_sessions_1.bindTaskAgentMemoryContextSnapshot,
        buildAgentMemoryContextBundleWithManifestSelection: memory_1.buildAgentMemoryContextBundleWithManifestSelection,
        buildAgentToolContext: collaboration_runtime_plan_tools_1.buildAgentToolContext,
        buildChildAgentDevelopmentContract: collaboration_runtime_task_queue_1.buildChildAgentDevelopmentContract,
        buildChildAgentTaskText: collaboration_runtime_task_queue_1.buildChildAgentTaskText,
        buildChildAgentWorkerHandoff: collaboration_runtime_task_queue_1.buildChildAgentWorkerHandoff,
        buildChildAgentWorktreeNotice: worktree_1.buildChildAgentWorktreeNotice,
        buildCoordinatorSharedFilesContext: collaboration_runtime_plan_tools_1.buildCoordinatorSharedFilesContext,
        buildGroupContextPacket: memory_1.buildGroupContextPacket,
        buildProjectVerificationHints: collaboration_runtime_runtime_tools_1.buildProjectVerificationHints,
        buildQueuedGroupTaskMessage: collaboration_runtime_task_queue_1.buildQueuedGroupTaskMessage,
        buildTaskProviderSwitchRequests: collaboration_runtime_task_queue_1.buildTaskProviderSwitchRequests,
        buildTaskSandboxRehearsal: collaboration_runtime_status_helpers_1.buildTaskSandboxRehearsal,
        buildTaskSourceDocumentsContext: collaboration_runtime_plan_tools_1.buildTaskSourceDocumentsContext,
        buildUserCoordinationAcknowledgement: collaboration_runtime_task_queue_1.buildUserCoordinationAcknowledgement,
        buildWorkerContinuationHandoff: collaboration_runtime_task_queue_1.buildWorkerContinuationHandoff,
        buildWorkflowMeta: collaboration_runtime_task_queue_1.buildWorkflowMeta,
        captureReasoningFacts: reasoning_loop_1.captureReasoningFacts,
        checkTaskFailure: agent_receipts_1.checkTaskFailure,
        claimTaskWorkItemForAgent: collaboration_runtime_task_queue_1.claimTaskWorkItemForAgent,
        commitChildTypedMemoryDelivery: memory_1.commitChildTypedMemoryDelivery,
        commitTaskAgentSessionCapacityRevalidation: agent_sessions_1.commitTaskAgentSessionCapacityRevalidation,
        compactMemoryText: memory_1.compactMemoryText,
        compactRuntimeToolAudit: collaboration_runtime_task_queue_1.compactRuntimeToolAudit,
        completeTaskAgentInvocationEdge: task_agent_invocation_lineage_1.completeTaskAgentInvocationEdge,
        createChildTypedMemoryDispatchWal: memory_1.createChildTypedMemoryDispatchWal,
        createExecutionCheckpoint: execution_kernel_1.createExecutionCheckpoint,
        createMemoryContextConsumptionChallenge: memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge,
        dispatchTaskAgentInvocationEdge: task_agent_invocation_lineage_1.dispatchTaskAgentInvocationEdge,
        ensureExecution: execution_kernel_1.ensureExecution,
        evaluateGreenContract: execution_kernel_1.evaluateGreenContract,
        explainReasoningDecision: reasoning_loop_1.explainReasoningDecision,
        extractAgentReceipt: agent_receipts_1.extractAgentReceipt,
        extractRunnerVerificationEvidence: agent_receipts_1.extractRunnerVerificationEvidence,
        getChildAgentIsolationMode: collaboration_runtime_task_queue_1.getChildAgentIsolationMode,
        getConfigInfo: db_1.getConfigInfo,
        getConfigs: db_1.getConfigs,
        getCoordinatorActionMentions: collaboration_runtime_status_helpers_1.getCoordinatorActionMentions,
        getCoordinatorMember: group_orchestrator_1.getCoordinatorMember,
        getGroupTaskExecutionStatus: collaboration_runtime_status_helpers_1.getGroupTaskExecutionStatus,
        getInitialWorkflowMeta: collaboration_runtime_task_queue_1.getInitialWorkflowMeta,
        getRoutableMembers: group_orchestrator_1.getRoutableMembers,
        getTaskAgentSessionOptions: agent_sessions_1.getTaskAgentSessionOptions,
        getTaskExecutionFromReceipt: collaboration_runtime_status_helpers_1.getTaskExecutionFromReceipt,
        groupSessionIdForTask: collaboration_runtime_task_queue_1.groupSessionIdForTask,
        loadExecution: execution_kernel_1.loadExecution,
        loadGroups: storage_1.loadGroups,
        loadTasks: db_1.loadTasks,
        markChildTypedMemoryDispatchCommitted: memory_1.markChildTypedMemoryDispatchCommitted,
        markChildTypedMemoryDispatchStarted: memory_1.markChildTypedMemoryDispatchStarted,
        markChildTypedMemoryRunnerReturned: memory_1.markChildTypedMemoryRunnerReturned,
        markGroupCoordinationDependencyStarted: collaboration_runtime_cross_agent_runtime_1.markGroupCoordinationDependencyStarted,
        memoryContextConsumptionReceiptFile: memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile,
        mergeCoordinatorDocumentContexts: collaboration_runtime_plan_tools_1.mergeCoordinatorDocumentContexts,
        normalizeAgentReasoningState: reasoning_loop_1.normalizeAgentReasoningState,
        normalizePlanAssignments: collaboration_runtime_task_queue_1.normalizePlanAssignments,
        openTaskAgentSession: agent_sessions_1.openTaskAgentSession,
        prepareAgentRuntimeTools: collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools,
        prepareChildAgentWorkDir: worktree_1.prepareChildAgentWorkDir,
        prepareTaskAgentInvocationEdge: task_agent_invocation_lineage_1.prepareTaskAgentInvocationEdge,
        prepareTaskAgentSessionCapacityRevalidation: agent_sessions_1.prepareTaskAgentSessionCapacityRevalidation,
        processCrossAgents: collaboration_runtime_cross_agent_runtime_1.processCrossAgents,
        recordAgentRuntimeLifecycle: runtime_kernel_1.recordAgentRuntimeLifecycle,
        recordReasoningDeviation: reasoning_loop_1.recordReasoningDeviation,
        recordReplayRepairTimelineBindingsForMention: collaboration_runtime_status_helpers_1.recordReplayRepairTimelineBindingsForMention,
        recordTaskAgentMemoryContextDelivery: agent_sessions_1.recordTaskAgentMemoryContextDelivery,
        recordTaskAgentSessionTurn: agent_sessions_1.recordTaskAgentSessionTurn,
        requirementEpicExecutionBoundary,
        runCodedGroupOrchestrator: group_orchestrator_1.runCodedGroupOrchestrator,
        runCoordinatorReviewLoop,
        runGroupOrchestrator: group_orchestrator_1.runGroupOrchestrator,
        runtimeToolDispatchBlockedReceipt: collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedReceipt,
        runtimeToolSnapshotFromAudit: collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit,
        safeAddGroupLog: logs_1.safeAddGroupLog,
        saveTasks: db_1.saveTasks,
        setReasoningAssertion: reasoning_loop_1.setReasoningAssertion,
        summarizeReplayRepairTimelineBindingsForEvent: collaboration_runtime_status_helpers_1.summarizeReplayRepairTimelineBindingsForEvent,
        summarizeWorkerHandoffForUser: worker_handoff_1.summarizeWorkerHandoffForUser,
        taskAgentInvocationMemoryOptions: collaboration_runtime_task_queue_1.taskAgentInvocationMemoryOptions,
        taskAgentSessionLifecycleRunnerOptions: collaboration_runtime_task_queue_1.taskAgentSessionLifecycleRunnerOptions,
        taskRequiresCodeChanges: collaboration_runtime_status_helpers_1.taskRequiresCodeChanges,
        transitionExecution: execution_kernel_1.transitionExecution,
        updateGroupMemory: memory_1.updateGroupMemory,
        updateReasoningPlan: reasoning_loop_1.updateReasoningPlan,
        updateTask: collaboration_runtime_runtime_tools_1.updateTask,
        updateTaskWorkItemFromReceipt: collaboration_runtime_task_queue_1.updateTaskWorkItemFromReceipt
    });
}
function ensureTaskKernelExecution(task) {
    if (!task?.id)
        return null;
    if ((0, execution_kernel_1.loadExecution)(task.id))
        return (0, execution_kernel_1.loadExecution)(task.id);
    let project = String(task.target_project || "");
    if (task.assign_type === "group" && task.group_id) {
        const group = (0, storage_1.loadGroups)().find((item) => item.id === task.group_id);
        if (group)
            project = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
    }
    const config = (0, db_1.getConfigs)().find((item) => item.name === project);
    const workDir = config ? String((0, db_1.getConfigInfo)(config.path)?.[0]?.workDir || "") : "";
    if (!project || !workDir || !fs.existsSync(workDir))
        return null;
    return (0, execution_kernel_1.ensureExecution)({ task, project, agent: project, workDir, executionId: task.id });
}
function finalizeTaskKernel(task, execution, deliverySummary, state, message) {
    ensureTaskKernelExecution(task);
    const records = (0, execution_kernel_1.listExecutions)({ taskId: task.id });
    let rootGreen = null;
    for (const record of records) {
        if (state === "cancelled") {
            (0, execution_kernel_1.transitionExecution)(record.id, "cancelled", message);
            continue;
        }
        if (state === "failed") {
            const failure = (0, execution_kernel_1.classifyExecutionFailure)(message);
            (0, execution_kernel_1.transitionExecution)(record.id, "failed", message, { failure, failureClass: failure.failureClass });
            continue;
        }
        let branchFresh = true;
        if (record.workspace?.mode === "worktree" && record.workspace?.worktreePath) {
            try {
                branchFresh = (0, execution_kernel_1.inspectBranchFreshness)(record.workspace.worktreePath, record.workspace.baseBranch || "").fresh;
            }
            catch {
                branchFresh = false;
            }
        }
        const acceptancePassed = state === "succeeded" && (0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, records, deliverySummary || {});
        let green = record.green || { level: "none", pass: false };
        if (record.id === task.id) {
            green = (0, execution_kernel_1.evaluateGreenContract)({
                receipt: execution?.receipt || { status: execution?.status, verification: deliverySummary?.verification_executed || [] },
                fileChanges: (0, collaboration_runtime_status_helpers_1.extractActualFileChanges)(execution?.fileChanges, task.target_project || record.project),
                requiresChanges: (0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(task),
                requiresVerification: task.requires_verification !== false,
                workspacePassed: acceptancePassed,
                branchFresh,
                reviewPassed: state === "succeeded",
                requiredLevel: record.workspace?.mode === "worktree" ? "merge_ready" : "project",
            });
            rootGreen = green;
        }
        else if (state === "succeeded" && acceptancePassed && branchFresh && ["project", "workspace", "merge_ready"].includes(String(green.level))) {
            green = { ...green, level: record.workspace?.mode === "worktree" ? "merge_ready" : green.level, pass: true, reviewedAt: new Date().toISOString() };
        }
        (0, execution_kernel_1.transitionExecution)(record.id, state, message, { green });
    }
    if (records.length)
        (0, collaboration_runtime_runtime_tools_1.updateTask)(task.id, { execution_kernel: { execution_id: task.id, state, green: rootGreen, updated_at: new Date().toISOString() } });
    return rootGreen;
}
// 队列处理
async function processTargetQueue(targetKey, ctx) {
    if (collaboration_runtime_task_queue_1.runningTasks.has(targetKey)) {
        console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
        return;
    }
    const queue = collaboration_runtime_task_queue_1.taskQueues.get(targetKey);
    if (!queue || queue.length === 0)
        return;
    collaboration_runtime_task_queue_1.runningTasks.set(targetKey, true);
    console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);
    while (queue.length > 0) {
        const taskId = queue.shift();
        if (!taskId)
            continue;
        const tasks = (0, db_1.loadTasks)();
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived" || task.archived || task.deleted_at) {
            (0, logs_1.addTaskLog)(taskId, "info", `跳过任务（不存在或已完成）`);
            continue;
        }
        if ((0, collaboration_runtime_task_queue_1.isTaskPaused)(task)) {
            (0, logs_1.addTaskLog)(taskId, "info", `任务已暂停，跳过本次队列执行`);
            continue;
        }
        const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id, "task");
        const leaseResult = (0, reliability_ledger_1.acquireTaskLease)(taskId, traceId, 45_000);
        if (!leaseResult.acquired) {
            (0, logs_1.addTaskLog)(taskId, "warning", `任务已有存活 Worker 租约，本实例跳过重复执行（owner=${leaseResult.lease?.owner_id || "unknown"}）`);
            (0, reliability_ledger_1.appendTraceEvent)(traceId, { type: "task.duplicate_execution_suppressed", status: "warning", task_id: taskId, group_id: task.group_id || "", message: "检测到有效执行租约，阻止重复执行" });
            continue;
        }
        let leaseHeartbeat = null;
        let enqueueFollowupAfterRound = false;
        const executionFollowupRevision = Number(task.followup_revision || 0);
        (0, logs_1.addTaskLog)(taskId, "info", `开始执行任务: ${task.title}`);
        try {
            collaboration_runtime_task_queue_1.runningTaskIds.add(taskId);
            leaseHeartbeat = setInterval(() => (0, reliability_ledger_1.renewTaskLease)(taskId, 45_000), 10_000);
            ensureTaskKernelExecution(task);
            (0, execution_kernel_1.transitionExecution)(taskId, "spawning", "任务队列正在启动开发执行内核");
            const reasoningLoop = (0, collaboration_runtime_task_queue_1.buildTaskPreflightReasoning)(task, "主 Agent 执行前重新核对目标、当前状态和验收条件", Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery);
            const startedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, { status: "in_progress", trace_id: traceId, started_at: new Date().toISOString(), reasoning_loop: reasoningLoop, execution_lease: { owner_id: leaseResult.lease.owner_id, acquired_at: leaseResult.lease.acquired_at, recovery_count: leaseResult.lease.recovery_count } }) || task;
            (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "reasoning_preflight", title: "我已复核目标与验收", detail: `计划版本 v${reasoningLoop.plan_version} · 待证明 ${reasoningLoop.assertions.filter(item => item.status !== "passed").length} 项`, status: "ok", phase: "planning", data: { plan_version: reasoningLoop.plan_version, fact_hash: reasoningLoop.fact_snapshots[reasoningLoop.fact_snapshots.length - 1]?.hash || "", recovery: Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery } });
            (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(startedTask, "in_progress", "我已开始协调执行");
            (0, logs_1.addTaskLog)(taskId, "info", `任务状态更新为: 进行中`);
            (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(startedTask, "in_progress", "任务已进入执行阶段");
            await ctx.onTaskStatusChange?.(startedTask, "in_progress");
            (0, logs_1.addTaskLog)(taskId, "info", `调用 Agent 执行任务...`);
            const execution = await executeTask(startedTask, ctx);
            const result = execution.result || execution.report || "";
            const latestWithFollowups = (0, db_1.loadTasks)().find((item) => item.id === taskId) || startedTask;
            const resumeAfterGoalRevisionInterruption = (0, execution_kernel_1.isTaskCancellationRequested)(taskId)
                && (0, collaboration_runtime_task_queue_1.shouldResumeAfterGoalRevisionInterruption)(latestWithFollowups, executionFollowupRevision);
            if ((0, execution_kernel_1.isTaskCancellationRequested)(taskId) && !resumeAfterGoalRevisionInterruption) {
                const cancelledTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, { status: "cancelled", result: "任务已取消", status_detail: "任务已由用户取消", cancelled_at: new Date().toISOString() }) || { ...task, status: "cancelled" };
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(cancelledTask, "cancelled", "任务已由用户取消");
                finalizeTaskKernel(task, execution, null, "cancelled", "任务已由用户取消");
                (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
                (0, logs_1.addTaskLog)(taskId, "warning", "任务执行进程已终止，状态更新为已取消");
                await ctx.onTaskStatusChange?.(cancelledTask, "cancelled", "任务已由用户取消");
                continue;
            }
            if (Number(latestWithFollowups.followup_revision || 0) > executionFollowupRevision) {
                const pending = Array.isArray(latestWithFollowups.pending_followups) ? latestWithFollowups.pending_followups : [];
                const deliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(latestWithFollowups, execution, "waiting");
                const hasGoalRevision = pending.some((item) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
                const acceptedAt = new Date().toISOString();
                const latestCollaborationState = latestWithFollowups.collaboration_state || {};
                const lastContinuation = latestCollaborationState.last_continuation
                    ? { ...latestCollaborationState.last_continuation, status: "accepted", resumed_at: acceptedAt }
                    : latestCollaborationState.last_continuation;
                const resumedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                    status: "pending",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    receipt: execution.receipt || null,
                    review: execution.review || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: deliverySummary,
                    reasoning_loop: deliverySummary.reasoning_loop,
                    consumed_followup_revision: Number(latestWithFollowups.followup_revision || 0),
                    pending_followups: pending.map((item) => ({ ...item, status: "accepted", accepted_at: acceptedAt })),
                    status_detail: resumeAfterGoalRevisionInterruption
                        ? (0, collaboration_runtime_task_queue_1.buildGoalRevisionInterruptedStatus)(pending)
                        : hasGoalRevision
                            ? `已接收目标调整，当前轮已结束；我会重新核对计划并继续`
                            : `已接收 ${Math.max(1, pending.filter((item) => item.status !== "accepted").length)} 条追加要求，继续使用当前任务上下文`,
                    plan_revision_required: latestWithFollowups.plan_revision_required || hasGoalRevision || undefined,
                    collaboration_state: {
                        ...latestCollaborationState,
                        phase: "reworking",
                        needs_user: false,
                        last_continuation: lastContinuation,
                        continuation_resumed_at: acceptedAt,
                        goal_revision_interruption: resumeAfterGoalRevisionInterruption
                            ? { ...(latestCollaborationState.goal_revision_interruption || {}), resolved_at: acceptedAt, resumed: true }
                            : latestCollaborationState.goal_revision_interruption || null,
                    },
                }) || latestWithFollowups;
                if (resumeAfterGoalRevisionInterruption)
                    (0, execution_kernel_1.clearTaskCancellation)(taskId);
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(resumedTask, "pending", resumedTask.status_detail);
                finalizeTaskKernel(task, execution, deliverySummary, "reviewing", resumeAfterGoalRevisionInterruption ? "当前轮次已停止，正在按新目标重核计划" : "当前轮次已完成，正在承接用户追加要求");
                (0, logs_1.addTaskLog)(taskId, "info", resumeAfterGoalRevisionInterruption ? "当前执行轮次已停止，目标调整将在同一任务上下文中重新规划" : "当前执行轮次结束，用户追加要求将在同一任务上下文中继续");
                enqueueFollowupAfterRound = true;
                continue;
            }
            (0, logs_1.addTaskLog)(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);
            if (task.workflow_type === "agent_coordination_dependency") {
                const coordinationRequest = (0, collaboration_runtime_cross_agent_runtime_1.getCoordinationRequestForTask)(task);
                const coordinationReceipt = execution.receipt || null;
                const coordinationKernel = (0, execution_kernel_1.loadExecution)(task.id);
                const coordinationAcceptance = coordinationRequest
                    ? (0, collaboration_runtime_cross_agent_runtime_1.evaluateCoordinationTaskEvidence)(task, coordinationRequest, coordinationReceipt, coordinationKernel)
                    : (0, collaboration_runtime_cross_agent_runtime_1.buildRejectedCoordinationAcceptance)(task, {}, coordinationReceipt, "找不到协调请求记录");
                const workspaceFiles = coordinationAcceptance.workspace_files || [];
                const green = (0, execution_kernel_1.evaluateGreenContract)({
                    receipt: coordinationReceipt,
                    fileChanges: workspaceFiles,
                    requiresChanges: (0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(task),
                    requiresVerification: task.requires_verification !== false,
                    workspacePassed: coordinationAcceptance.accepted,
                    branchFresh: true,
                    reviewPassed: coordinationAcceptance.accepted,
                    requiredLevel: coordinationKernel?.workspace?.mode === "worktree" ? "merge_ready" : "project",
                });
                const completedAt = new Date().toISOString();
                (0, execution_kernel_1.transitionExecution)(task.id, coordinationAcceptance.accepted ? "succeeded" : "failed", coordinationAcceptance.reason, {
                    green,
                    receipt: coordinationReceipt,
                    fileChanges: { files: workspaceFiles },
                    runnerVerification: { status: coordinationAcceptance.accepted ? "passed" : "failed", verification: coordinationAcceptance.verification || [] },
                    outputPreview: result,
                    data: { coordination_acceptance: coordinationAcceptance },
                });
                const settledTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(task.id, {
                    status: coordinationAcceptance.accepted ? "done" : "failed",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    status_detail: coordinationAcceptance.reason,
                    receipt: coordinationReceipt,
                    file_changes: { files: workspaceFiles },
                    coordination_acceptance: coordinationAcceptance,
                    completed_at: coordinationAcceptance.accepted ? completedAt : undefined,
                    failed_at: coordinationAcceptance.accepted ? undefined : completedAt,
                    execution_kernel: { execution_id: task.id, state: coordinationAcceptance.accepted ? "succeeded" : "failed", green, updated_at: completedAt },
                }) || task;
                (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, coordinationAcceptance.accepted ? "协作工作项已交付，等待主 Agent 合并" : "协作工作项未通过证据门禁");
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
                (0, logs_1.addTaskLog)(task.id, coordinationAcceptance.accepted ? "success" : "warning", coordinationAcceptance.reason);
                await ctx.onTaskStatusChange?.(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
                continue;
            }
            if (execution.status === "failed") {
                const deliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, execution, "failed");
                (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: "fail", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
                const failedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                    status: "failed",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    status_detail: execution.detail || "Agent 回执失败",
                    receipt: execution.receipt || null,
                    review: execution.review || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: deliverySummary,
                    reasoning_loop: deliverySummary.reasoning_loop,
                }) || { ...task, status: "failed", result: result.substring(0, 500) };
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(failedTask, "failed", execution.detail || "Agent 回执失败");
                finalizeTaskKernel(task, execution, deliverySummary, "failed", execution.detail || "Agent 回执失败");
                (0, logs_1.addTaskLog)(taskId, "error", `❌ 任务执行失败：${execution.detail || "Agent 回执失败"}`);
                (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(failedTask, "blocked", execution.detail || result.substring(0, 500));
                await ctx.onTaskStatusChange?.(failedTask, "failed", result.substring(0, 500));
                (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(failedTask, "failed", execution.detail || result.substring(0, 500));
                await (0, collaboration_runtime_task_queue_1.sendTaskFailureNotification)(failedTask, execution.detail || result.substring(0, 500));
                continue;
            }
            if ((0, agent_receipts_1.checkTaskFailure)(result)) {
                throw new Error(result.substring(0, 500));
            }
            const isCompleted = execution.status === "done";
            if (isCompleted) {
                const deliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, execution, "waiting");
                (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: deliverySummary.acceptance_gate_passed ? "验收通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
                if (!deliverySummary.acceptance_gate_passed) {
                    const detail = `验收检查未通过：${deliverySummary.acceptance_gate?.failed_count || 1} 项缺口，任务保持进行中`;
                    const waitingTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: deliverySummary, reasoning_loop: deliverySummary.reasoning_loop }) || task;
                    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(waitingTask, "in_progress", detail);
                    finalizeTaskKernel(task, execution, deliverySummary, "reviewing", detail);
                    (0, logs_1.addTaskLog)(taskId, "warning", detail);
                    await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
                    continue;
                }
                const closedSessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
                const finalizedExecution = { ...execution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item) => item.id) } };
                const finalizedDeliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, finalizedExecution, "done");
                if (!finalizedDeliverySummary.acceptance_gate_passed) {
                    const detail = `最终收尾门禁未通过：${finalizedDeliverySummary.acceptance_gate?.failed_checks?.map((item) => item.label).join("、") || "团队仍未完全收尾"}`;
                    const waitingTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: finalizedDeliverySummary, reasoning_loop: finalizedDeliverySummary.reasoning_loop }) || task;
                    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(waitingTask, "in_progress", detail);
                    finalizeTaskKernel(task, finalizedExecution, finalizedDeliverySummary, "reviewing", detail);
                    (0, logs_1.addTaskLog)(taskId, "warning", detail);
                    await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
                    continue;
                }
                const completedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                    status: "done",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    status_detail: execution.detail || "验收通过",
                    receipt: execution.receipt || null,
                    review: execution.review || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: finalizedDeliverySummary,
                    reasoning_loop: finalizedDeliverySummary.reasoning_loop,
                    execution_readiness: null,
                    daily_dev_execution_readiness: null,
                    completed_at: new Date().toISOString()
                }) || { ...task, status: "done", result: result.substring(0, 500) };
                const projectMemoryResult = (0, memory_2.recordAcceptedProjectDeliveryMemory)({ task: completedTask, deliverySummary: finalizedDeliverySummary });
                if (projectMemoryResult.committed)
                    (0, logs_1.addTaskLog)(taskId, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.projects.length} 个项目，${projectMemoryResult.durableCandidateCount} 条长期记录`);
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(completedTask, "done", execution.detail || "验收通过");
                finalizeTaskKernel(task, execution, finalizedDeliverySummary, "succeeded", execution.detail || "验收通过");
                (0, logs_1.addTaskLog)(taskId, "success", `✅ 任务完成：${execution.detail || "验收通过"}`);
                (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(completedTask, "done", execution.detail || result.substring(0, 500));
                await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
                (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(completedTask, "done", execution.detail || result.substring(0, 500));
                await (0, collaboration_runtime_task_queue_1.sendTaskCompletionNotification)(completedTask, result);
            }
            else {
                const deliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, execution, "waiting");
                (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: deliverySummary.acceptance_gate_passed ? "验收通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过，任务继续推进`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
                if ((0, collaboration_runtime_runtime_tools_1.canCompleteDailyDevFromDeliverySummary)(task, execution, deliverySummary)) {
                    const promotedExecution = {
                        ...execution,
                        status: "done",
                        detail: "daily_dev 验收证据齐全，系统自动完成",
                    };
                    const promotedSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, promotedExecution, "waiting");
                    (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: promotedSummary.acceptance_gate_passed ? "验收通过并自动完成" : `${promotedSummary.acceptance_gate?.failed_count || 0} 项未通过`, status: promotedSummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: promotedSummary.acceptance_gate || {} });
                    const closedSessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
                    const finalizedPromotedExecution = { ...promotedExecution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item) => item.id) } };
                    const finalizedPromotedSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, finalizedPromotedExecution, "done");
                    if (!finalizedPromotedSummary.acceptance_gate_passed) {
                        const detail = `最终收尾门禁未通过：${finalizedPromotedSummary.acceptance_gate?.failed_checks?.map((item) => item.label).join("、") || "团队仍未完全收尾"}`;
                        const waitingTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: finalizedPromotedSummary, reasoning_loop: finalizedPromotedSummary.reasoning_loop }) || task;
                        (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(waitingTask, "in_progress", detail);
                        finalizeTaskKernel(task, finalizedPromotedExecution, finalizedPromotedSummary, "reviewing", detail);
                        (0, logs_1.addTaskLog)(taskId, "warning", detail);
                        await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
                        continue;
                    }
                    const completedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                        status: "done",
                        result: result.substring(0, 500),
                        final_report: execution.report || result,
                        status_detail: promotedExecution.detail,
                        receipt: execution.receipt || null,
                        review: execution.review || null,
                        file_changes: execution.fileChanges || null,
                        delivery_summary: finalizedPromotedSummary,
                        reasoning_loop: finalizedPromotedSummary.reasoning_loop,
                        execution_readiness: null,
                        daily_dev_execution_readiness: null,
                        completed_at: new Date().toISOString()
                    }) || { ...task, status: "done", result: result.substring(0, 500) };
                    const projectMemoryResult = (0, memory_2.recordAcceptedProjectDeliveryMemory)({ task: completedTask, deliverySummary: finalizedPromotedSummary });
                    if (projectMemoryResult.committed)
                        (0, logs_1.addTaskLog)(taskId, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.projects.length} 个项目，${projectMemoryResult.durableCandidateCount} 条长期记录`);
                    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(completedTask, "done", promotedExecution.detail);
                    finalizeTaskKernel(task, promotedExecution, finalizedPromotedSummary, "succeeded", promotedExecution.detail);
                    (0, logs_1.addTaskLog)(taskId, "success", `✅ 任务完成：${promotedExecution.detail}`);
                    (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(completedTask, "done", promotedExecution.detail);
                    await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
                    (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(completedTask, "done", promotedExecution.detail);
                    await (0, collaboration_runtime_task_queue_1.sendTaskCompletionNotification)(completedTask, result);
                }
                else {
                    const waitingTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                        status: "in_progress",
                        result: result.substring(0, 500),
                        final_report: execution.report || result,
                        status_detail: execution.detail || "等待补充信息或返工",
                        receipt: execution.receipt || null,
                        review: execution.review || null,
                        file_changes: execution.fileChanges || null,
                        delivery_summary: deliverySummary,
                        reasoning_loop: deliverySummary.reasoning_loop,
                    }) || { ...task, status: "in_progress", result: result.substring(0, 500) };
                    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(waitingTask, "in_progress", execution.detail || "等待补充信息或返工");
                    finalizeTaskKernel(task, execution, deliverySummary, "reviewing", execution.detail || "等待补充信息或返工");
                    (0, logs_1.addTaskLog)(taskId, "warning", `任务仍需继续：${execution.detail || "验收未完成"}`);
                    (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(waitingTask, "blocked", execution.detail || result.substring(0, 500));
                    await ctx.onTaskStatusChange?.(waitingTask, "waiting", result.substring(0, 500));
                    (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(waitingTask, "waiting", execution.detail || result.substring(0, 500));
                }
            }
        }
        catch (error) {
            console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
            const failure = (0, execution_kernel_1.classifyExecutionFailure)(error);
            const cancelled = failure.failureClass === "cancelled" || (0, execution_kernel_1.isTaskCancellationRequested)(taskId);
            const latestWithFollowups = (0, db_1.loadTasks)().find((item) => item.id === taskId) || task;
            if (cancelled && (0, collaboration_runtime_task_queue_1.shouldResumeAfterGoalRevisionInterruption)(latestWithFollowups, executionFollowupRevision)) {
                const pending = Array.isArray(latestWithFollowups.pending_followups) ? latestWithFollowups.pending_followups : [];
                const acceptedAt = new Date().toISOString();
                const interruptedExecution = (0, collaboration_runtime_status_helpers_1.buildTaskExecutionResult)("waiting", "当前执行轮已按目标调整停止，等待重新核对计划", { detail: "目标调整触发当前执行轮停止" });
                const interruptedDeliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(latestWithFollowups, interruptedExecution, "waiting");
                const latestCollaborationState = latestWithFollowups.collaboration_state || {};
                const lastContinuation = latestCollaborationState.last_continuation
                    ? { ...latestCollaborationState.last_continuation, status: "accepted", resumed_at: acceptedAt }
                    : latestCollaborationState.last_continuation;
                const resumedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                    status: "pending",
                    result: "当前执行轮已停止，等待主 Agent 重新核对计划",
                    final_report: "",
                    delivery_summary: interruptedDeliverySummary,
                    reasoning_loop: interruptedDeliverySummary.reasoning_loop,
                    consumed_followup_revision: Number(latestWithFollowups.followup_revision || 0),
                    pending_followups: pending.map((item) => ({ ...item, status: "accepted", accepted_at: acceptedAt })),
                    status_detail: (0, collaboration_runtime_task_queue_1.buildGoalRevisionInterruptedStatus)(pending),
                    plan_revision_required: true,
                    collaboration_state: {
                        ...latestCollaborationState,
                        phase: "reworking",
                        needs_user: false,
                        last_continuation: lastContinuation,
                        continuation_resumed_at: acceptedAt,
                        goal_revision_interruption: { ...(latestCollaborationState.goal_revision_interruption || {}), resolved_at: acceptedAt, resumed: true },
                    },
                }) || latestWithFollowups;
                (0, execution_kernel_1.clearTaskCancellation)(taskId);
                (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(resumedTask, "pending", resumedTask.status_detail);
                finalizeTaskKernel(task, interruptedExecution, interruptedDeliverySummary, "reviewing", "当前轮次已停止，正在按新目标重核计划");
                (0, logs_1.addTaskLog)(taskId, "warning", "目标调整已停止当前执行轮，任务保持同一上下文并重新入队");
                (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(resumedTask, "in_progress", resumedTask.status_detail);
                await ctx.onTaskStatusChange?.(resumedTask, "waiting", resumedTask.status_detail);
                enqueueFollowupAfterRound = true;
                continue;
            }
            const failedExecution = (0, collaboration_runtime_status_helpers_1.buildTaskExecutionResult)("failed", `执行失败: ${error.message}`, { detail: String(error.message || "执行失败") });
            const failedDeliverySummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, failedExecution, "failed");
            const failedTask = (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
                status: cancelled ? "cancelled" : "failed",
                result: cancelled ? "任务已取消" : `执行失败: ${error.message}`,
                status_detail: String(error.message || "执行失败").slice(0, 500),
                failure_class: failure.failureClass,
                delivery_summary: failedDeliverySummary,
                reasoning_loop: failedDeliverySummary.reasoning_loop,
            }) || { ...task, status: cancelled ? "cancelled" : "failed", result: cancelled ? "任务已取消" : `执行失败: ${error.message}` };
            (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(failedTask, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : String(error.message || "执行失败"));
            finalizeTaskKernel(task, failedExecution, failedTask.delivery_summary, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : error.message);
            if (cancelled) {
                (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
                (0, execution_kernel_1.clearTaskCancellation)(taskId);
            }
            (0, logs_1.addTaskLog)(taskId, cancelled ? "warning" : "error", cancelled ? "任务已取消，运行中的 Agent 进程已终止" : `❌ 任务执行失败: ${error.message}`);
            (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(failedTask, "blocked", error.message);
            await ctx.onTaskStatusChange?.(failedTask, cancelled ? "cancelled" : "failed", String(error.message || ""));
            (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(failedTask, cancelled ? "waiting" : "failed", cancelled ? "任务已取消" : error.message);
            if (!cancelled)
                await (0, collaboration_runtime_task_queue_1.sendTaskFailureNotification)(failedTask, error.message);
        }
        finally {
            if (leaseHeartbeat)
                clearInterval(leaseHeartbeat);
            collaboration_runtime_task_queue_1.runningTaskIds.delete(taskId);
            const finalTask = (0, db_1.loadTasks)().find((item) => item.id === taskId);
            if (finalTask?.workflow_type === "agent_coordination_dependency") {
                try {
                    await (0, collaboration_runtime_cross_agent_runtime_1.settleGroupCoordinationDependency)(finalTask, ctx);
                }
                catch (error) {
                    (0, logs_1.addTaskLog)(taskId, "error", `协作工作项收口失败：${error?.message || error}`);
                }
            }
            (0, reliability_ledger_1.releaseTaskLease)(taskId, finalTask?.status || "unknown");
            if (enqueueFollowupAfterRound && finalTask && finalTask.status !== "cancelled")
                enqueueTask(taskId, ctx);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    collaboration_runtime_task_queue_1.runningTasks.delete(targetKey);
    console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}
function enqueueTask(taskId, ctx) {
    return require("./collaboration-task-runtime").enqueueTask(taskId, ctx);
}
function createAndQueueTask(task, ctx) {
    return require("./collaboration-task-runtime").createAndQueueTask(task, ctx);
}
function backfillTaskTraceIds() {
    const tasks = (0, db_1.loadTasks)();
    let changed = 0;
    for (const task of tasks) {
        if (task.trace_id)
            continue;
        task.trace_id = (0, reliability_ledger_1.createTraceId)("task");
        task.updated_at = task.updated_at || new Date().toISOString();
        (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { id: `task:${task.id}:trace-backfill`, type: "task.trace_backfilled", status: "info", task_id: task.id, group_id: task.group_id || "", agent: task.target_project || "", message: "历史任务已补齐统一 Trace ID", data: { original_created_at: task.created_at || "" } });
        changed++;
    }
    if (changed)
        (0, db_1.saveTasks)(tasks);
    return changed;
}
function resumeTaskQueues(ctx, options = {}) {
    return require("./collaboration-task-runtime").resumeTaskQueues(ctx, options);
}
function getQueueStatus(taskSnapshot) {
    let totalQueued = 0;
    const targetStatus = {};
    for (const [targetKey, queue] of collaboration_runtime_task_queue_1.taskQueues.entries()) {
        totalQueued += queue.length;
        targetStatus[targetKey] = {
            queued: queue.length,
            running: collaboration_runtime_task_queue_1.runningTasks.has(targetKey)
        };
    }
    const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : (0, db_1.loadTasks)();
    return {
        total_queued: totalQueued,
        running_targets: collaboration_runtime_task_queue_1.runningTasks.size,
        target_status: targetStatus,
        pending_tasks: tasks.filter(t => t.status === "pending").length,
        in_progress_tasks: tasks.filter(t => t.status === "in_progress").length,
        failed_tasks: tasks.filter(t => t.status === "failed").length,
        running_task_ids: Array.from(collaboration_runtime_task_queue_1.runningTaskIds)
    };
}
function getTaskTargetKeyFromTask(task) {
    if (task?.queue_scope === "isolated_parallel" && task?.id)
        return `isolated:${task.target_project || "unknown"}:${task.id}`;
    if (task?.assign_type === "group" && task?.group_id)
        return `group:${task.group_id}`;
    return `project:${task?.target_project || "unknown"}`;
}
function isTaskQueuedInMemory(taskId) {
    for (const queue of collaboration_runtime_task_queue_1.taskQueues.values()) {
        if (queue.includes(taskId))
            return true;
    }
    return false;
}
function getTaskAgeMs(task, now = Date.now()) {
    const time = Date.parse(task?.updated_at || task?.started_at || task?.queued_at || task?.created_at || "");
    return Number.isFinite(time) ? Math.max(0, now - time) : 0;
}
//# sourceMappingURL=collaboration-runtime-coordinator-review-part-01.js.map