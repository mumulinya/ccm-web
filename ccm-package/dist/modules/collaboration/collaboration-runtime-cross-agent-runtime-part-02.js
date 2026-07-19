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
exports.markGroupCoordinationDependencyStarted = markGroupCoordinationDependencyStarted;
exports.buildRejectedCoordinationAcceptance = buildRejectedCoordinationAcceptance;
exports.settleGroupCoordinationDependency = settleGroupCoordinationDependency;
exports.recoverGroupCoordinationDependencies = recoverGroupCoordinationDependencies;
exports.runGroupCoordinationBusinessChainTestTurn = runGroupCoordinationBusinessChainTestTurn;
exports.getCoordinatorVisibleMessageSelfTest = getCoordinatorVisibleMessageSelfTest;
exports.appendCoordinatorMessage = appendCoordinatorMessage;
exports.buildCoordinatorReworkRoutingDecision = buildCoordinatorReworkRoutingDecision;
exports.getMentionReworkRoute = getMentionReworkRoute;
exports.coordinatorReworkRouteRequiresStop = coordinatorReworkRouteRequiresStop;
exports.coordinatorReworkRouteNeedsFreshVerifier = coordinatorReworkRouteNeedsFreshVerifier;
exports.coordinatorReworkRouteUsesVerifier = coordinatorReworkRouteUsesVerifier;
exports.selectCoordinatorIndependentVerifier = selectCoordinatorIndependentVerifier;
exports.isCoordinatorTestAgentName = isCoordinatorTestAgentName;
exports.resolveProjectRuntimeForTestAgentHandoff = resolveProjectRuntimeForTestAgentHandoff;
exports.collectCoordinatorChangedFiles = collectCoordinatorChangedFiles;
exports.collectCoordinatorVerificationCommands = collectCoordinatorVerificationCommands;
exports.isCoordinatorReviewInstruction = isCoordinatorReviewInstruction;
exports.buildCoordinatorTestAgentAcceptanceCriteria = buildCoordinatorTestAgentAcceptanceCriteria;
exports.buildTestAgentHandoffId = buildTestAgentHandoffId;
exports.getTestAgentHandoffReviewSubject = getTestAgentHandoffReviewSubject;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const group_coordination_store_1 = require("./group-coordination-store");
const agent_qa_service_1 = require("./agent-qa-service");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
// === 跨 Agent 并行与递归协作（核心）===
const collaboration_runtime_cross_agent_runtime_part_01_1 = require("./collaboration-runtime-cross-agent-runtime-part-01");
function markGroupCoordinationDependencyStarted(task, workspace, session) {
    if (task?.workflow_type !== "agent_coordination_dependency")
        return null;
    const request = (0, collaboration_runtime_cross_agent_runtime_part_01_1.getCoordinationRequestForTask)(task);
    if (!request || ["resumed", "failed", "cancelled", "timeout"].includes(request.status))
        return request;
    const qa = (0, collaboration_runtime_cross_agent_runtime_part_01_1.getCoordinationQaForRequest)(request.id);
    const execution = {
        mode: "parallel_isolated_native_session",
        target_project: task.target_project || request.target_hint || "",
        work_item_task_id: task.id,
        task_agent_session_id: session?.id || "",
        native_session_id: session?.nativeSessionId || "",
        agent_type: session?.agentType || "",
        workspace_mode: workspace?.mode || "",
        worktree_path: workspace?.worktreePath || "",
        worktree_branch: workspace?.worktreeBranch || "",
        original_work_dir: workspace?.originalWorkDir || "",
        started_at: new Date().toISOString(),
    };
    (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
        status: "executing",
        resolution: { ...(request.resolution || {}), execution },
        auditType: (0, collaboration_runtime_cross_agent_runtime_part_01_1.coordinationAuditHas)(request, "parallel_session_started") ? "parallel_session_heartbeat" : "parallel_session_started",
        auditDetail: `${task.target_project} 已在独立第三方 Agent 会话和 worktree 中并行执行`,
    });
    if (!(0, collaboration_runtime_cross_agent_runtime_part_01_1.coordinationAuditHas)(request, "parallel_session_started")) {
        const runningQa = qa ? (0, agent_qa_service_1.upsertAgentQaItem)({
            ...qa,
            status: "executing",
            execution_mode: execution.mode,
            coordination_execution: execution,
            work_item_task_id: task.id,
            audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: execution.started_at, type: "parallel_session_started", detail: `${task.target_project} 已在独立会话开始实现` }].slice(-30),
        }) : null;
        if (runningQa)
            (0, storage_1.appendGroupMessage)(task.group_id, (0, agent_qa_service_1.buildAgentQaMessage)("progress", runningQa, `${task.target_project} 已在独立会话并行处理`));
        if (task.parent_task_id)
            (0, logs_1.appendTaskTimelineEvent)(task.parent_task_id, {
                type: "coordination_parallel_session_started",
                title: `${task.target_project} 已在独立会话开始处理`,
                detail: "该协作工作项与目标 Agent 的原有会话并行运行，完成后由主 Agent 验收和合并",
                status: "active",
                phase: "waiting_dependency",
                agent: task.target_project,
                data: { coordination_request_id: request.id, execution },
            });
        (0, logs_1.appendTaskTimelineEvent)(task.id, {
            type: "coordination_isolated_workspace_ready",
            title: "独立会话和工作区已准备",
            detail: `${session?.agentType || "第三方 Agent"} 已启动，代码修改已与其他会话隔离`,
            status: "ok",
            phase: "executing",
            agent: task.target_project,
            data: execution,
        });
        (0, logs_1.safeAddGroupLog)(task.group_id, "info", "agent_coordination", `${task.target_project} 已在独立会话并行处理协作依赖`, { coordination_request_id: request.id, execution });
    }
    return execution;
}
function buildRejectedCoordinationAcceptance(task, request, receipt, reason) {
    const base = (0, collaboration_runtime_cross_agent_runtime_part_01_1.evaluateCoordinationImplementationReceipt)(receipt, request);
    const gaps = (0, collaboration_runtime_status_helpers_1.uniqueStrings)([...(base.gaps || []), reason]).filter(Boolean);
    return {
        ...base,
        status: "needs_evidence",
        accepted: false,
        score: Math.min(Number(base.score || 0), 50),
        gaps,
        reason: `正式工作项尚未通过验收：${gaps.join("；")}`,
    };
}
async function settleGroupCoordinationDependency(task, ctx, streamRes = null) {
    if (task?.workflow_type !== "agent_coordination_dependency")
        return { handled: false, reason: "not_coordination_dependency" };
    const request = (0, collaboration_runtime_cross_agent_runtime_part_01_1.getCoordinationRequestForTask)(task);
    if (!request)
        return { handled: false, reason: "coordination_request_missing" };
    if (request.status === "resumed")
        return { handled: true, duplicate: true, status: "resumed" };
    if (request.status === "merge_conflict" && task.status === "failed") {
        return { handled: true, pending: true, status: "merge_conflict", reason: task.status_detail || "等待处理代码合并冲突" };
    }
    if (collaboration_runtime_task_queue_1.coordinationSettlementInFlight.has(request.id))
        return { handled: true, duplicate: true, status: "settling" };
    collaboration_runtime_task_queue_1.coordinationSettlementInFlight.add(request.id);
    try {
        const qa = (0, collaboration_runtime_cross_agent_runtime_part_01_1.getCoordinationQaForRequest)(request.id);
        if (!qa)
            return { handled: false, reason: "coordination_qa_missing" };
        if (request.status === "resolved" && qa.status === "resumed") {
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, { status: "resumed", auditType: "source_agent_resume_reconciled", auditDetail: "重启恢复时已确认原 Agent 会话此前完成续跑" });
            return { handled: true, duplicate: true, accepted: true, resumed: true, status: "resumed" };
        }
        if (request.status === "resolved" && qa.acceptance?.accepted) {
            const group = (0, storage_1.loadGroups)().find((item) => item.id === task.group_id);
            if (!group)
                return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
            const wakeup = await (0, collaboration_runtime_cross_agent_runtime_part_01_1.resumeAgentQaFromStoredContinuation)(qa, group, ctx, streamRes);
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
                status: wakeup.resumed ? "resumed" : "resolved",
                auditType: wakeup.resumed ? "source_agent_resumed_after_restart" : "source_agent_resume_waiting",
                auditDetail: wakeup.resumed ? "服务恢复后，原 Agent 已收到合并结果并继续原任务" : wakeup.reason || "原 Agent 暂未恢复，等待自动重试",
            });
            return { handled: true, accepted: true, resumed: wakeup.resumed, wakeup, reason: wakeup.reason };
        }
        const execution = (0, execution_kernel_1.loadExecution)(task.id);
        const receipt = task.receipt || execution?.receipt || null;
        const hasReturned = ["done", "failed", "cancelled"].includes(String(task.status || ""))
            || (!!receipt && !collaboration_runtime_task_queue_1.runningTaskIds.has(task.id) && !(0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task.id));
        if (!hasReturned)
            return { handled: true, pending: true, status: task.status };
        let acceptance = (0, collaboration_runtime_cross_agent_runtime_part_01_1.evaluateCoordinationTaskEvidence)(task, request, receipt, execution);
        if (task.status !== "done") {
            acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `执行状态为 ${task.status || "unknown"}`);
        }
        (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
            status: "evidence_review",
            resolution: { ...(request.resolution || {}), target_project: task.target_project, work_item_task_id: task.id, receipt, acceptance },
            auditType: "evidence_review",
            auditDetail: acceptance.reason,
        });
        if (task.parent_task_id)
            (0, logs_1.appendTaskTimelineEvent)(task.parent_task_id, {
                type: "coordination_evidence_review",
                title: `主 Agent 正在验收 ${task.target_project} 的协作结果`,
                detail: acceptance.accepted ? "代码变更和验证证据已齐全，准备安全合并" : acceptance.reason,
                status: acceptance.accepted ? "active" : "warn",
                phase: "reviewing",
                agent: "coordinator",
                data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance },
            });
        let mergeResult = { required: false, success: true };
        if (acceptance.accepted && execution?.workspace?.mode === "worktree") {
            const mergingQa = (0, agent_qa_service_1.upsertAgentQaItem)({
                ...qa,
                status: "merging",
                work_item_task_id: task.id,
                acceptance,
                coordination_execution: { ...(qa.coordination_execution || {}), workspace: execution.workspace },
            });
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
                status: "merging",
                auditType: "worktree_merge_started",
                auditDetail: `主 Agent 开始把 ${task.target_project} 的已验证变更安全合并回项目`,
            });
            if (!(0, collaboration_runtime_cross_agent_runtime_part_01_1.coordinationAuditHas)(request, "worktree_merge_started")) {
                (0, storage_1.appendGroupMessage)(task.group_id, (0, agent_qa_service_1.buildAgentQaMessage)("progress", mergingQa, "实现和验证已完成，正在安全合并代码"));
            }
            try {
                mergeResult = (0, execution_kernel_1.mergeExecutionWorktree)(task.id, {
                    message: `feat: complete coordination dependency ${task.id}`,
                    mergeMessage: `merge: coordination dependency ${task.id}`,
                });
                if (!(0, execution_kernel_1.loadExecution)(task.id)?.workspace?.cleanedAt) {
                    try {
                        (0, execution_kernel_1.cleanupExecutionWorktree)(task.id);
                    }
                    catch (cleanupError) {
                        (0, logs_1.addTaskLog)(task.id, "warning", `协作 worktree 已合并但清理失败：${cleanupError?.message || cleanupError}`);
                    }
                }
            }
            catch (error) {
                mergeResult = { required: true, success: false, error: error?.message || String(error) };
                acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `代码安全合并失败：${mergeResult.error}`);
                (0, collaboration_runtime_runtime_tools_1.updateTask)(task.id, { status: "failed", status_detail: acceptance.reason, merge_result: mergeResult });
                (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
                    status: "merge_conflict",
                    resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
                    auditType: "worktree_merge_failed",
                    auditDetail: acceptance.reason,
                });
            }
        }
        const latestQa = (0, collaboration_runtime_cross_agent_runtime_part_01_1.getCoordinationQaForRequest)(request.id) || qa;
        const completedQa = (0, agent_qa_service_1.upsertAgentQaItem)({
            ...latestQa,
            status: acceptance.accepted ? "answered" : "rejected",
            answer: (0, memory_1.compactMemoryText)(receipt?.summary || acceptance.reason, 4000),
            answer_evidence: acceptance.evidence,
            acceptance: { ...acceptance, merge: mergeResult },
            work_item_task_id: task.id,
            answered_at: new Date().toISOString(),
            audit: [...(Array.isArray(latestQa.audit) ? latestQa.audit : []), { at: new Date().toISOString(), type: acceptance.accepted ? "work_item_accepted" : "work_item_rejected", detail: acceptance.reason }].slice(-30),
        });
        (0, storage_1.appendGroupMessage)(task.group_id, (0, agent_qa_service_1.buildAgentQaMessage)("answer", completedQa, completedQa.answer));
        (0, agent_qa_service_1.emitAgentQaEvent)(streamRes, "answer", completedQa, completedQa.answer);
        (0, agent_qa_service_1.appendAgentQaTrace)(task.parent_task_id || "", "agent.coordination.work_item_review", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult });
        const sourceTask = (0, collaboration_runtime_task_queue_1.getTaskById)(task.parent_task_id || "");
        if (sourceTask)
            (0, collaboration_runtime_runtime_tools_1.updateTask)(sourceTask.id, {
                collaboration_state: {
                    ...(sourceTask.collaboration_state || {}),
                    phase: acceptance.accepted ? "executing" : "waiting_dependency",
                    dependency_status: acceptance.accepted ? "accepted" : "rejected",
                    dependency_task_id: task.id,
                    coordination_request_id: request.id,
                    merge_result: mergeResult,
                    updated_at: new Date().toISOString(),
                },
                status_detail: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并，正在恢复原任务` : acceptance.reason,
            });
        if (task.parent_task_id)
            (0, logs_1.appendTaskTimelineEvent)(task.parent_task_id, {
                type: acceptance.accepted ? "coordination_dependency_merged" : "coordination_dependency_rejected",
                title: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并` : `${task.target_project} 的协作结果需要处理`,
                detail: acceptance.reason,
                status: acceptance.accepted ? "ok" : "warn",
                phase: acceptance.accepted ? "executing" : "waiting_dependency",
                agent: "coordinator",
                data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult },
            });
        if (!acceptance.accepted) {
            const mergeConflict = mergeResult?.required === true && mergeResult?.success === false;
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, { status: mergeConflict ? "merge_conflict" : "failed", auditType: mergeConflict ? "merge_conflict_waiting_rework" : "acceptance_failed", auditDetail: acceptance.reason });
            return { handled: true, accepted: false, acceptance, merge: mergeResult };
        }
        (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, {
            status: "resolved",
            resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
            auditType: "resolved",
            auditDetail: "正式工作项已通过主 Agent 验收并安全合并，准备恢复原 Agent",
        });
        const group = (0, storage_1.loadGroups)().find((item) => item.id === task.group_id);
        if (!group)
            return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
        const wakeup = await (0, collaboration_runtime_cross_agent_runtime_part_01_1.resumeAgentQaFromStoredContinuation)(completedQa, group, ctx, streamRes);
        if (wakeup.resumed) {
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, { status: "resumed", auditType: "source_agent_resumed", auditDetail: "原 Agent 已收到合并后的依赖结果并从原任务会话继续" });
            return { handled: true, accepted: true, resumed: true, wakeup, merge: mergeResult };
        }
        (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.id, { status: "resolved", auditType: "source_agent_resume_waiting", auditDetail: wakeup.reason || "原 Agent 暂未恢复，等待自动重试" });
        return { handled: true, accepted: true, resumed: false, reason: wakeup.reason, merge: mergeResult };
    }
    finally {
        collaboration_runtime_task_queue_1.coordinationSettlementInFlight.delete(request.id);
    }
}
async function recoverGroupCoordinationDependencies(ctx) {
    const requests = (0, group_coordination_store_1.listGroupCoordinationRequests)({}).filter((item) => ["work_item_created", "executing", "evidence_review", "merging", "merge_conflict", "resolved"].includes(item.status));
    const results = [];
    for (const request of requests) {
        const task = (0, collaboration_runtime_task_queue_1.getTaskById)(request.work_item_task_id || "");
        if (!task) {
            results.push({ request_id: request.id, recovered: false, reason: "work_item_missing" });
            continue;
        }
        if (["pending", "queued"].includes(task.status) && task.auto_execute !== false && !(0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task.id) && !collaboration_runtime_task_queue_1.runningTaskIds.has(task.id)) {
            results.push({ request_id: request.id, task_id: task.id, ...(0, collaboration_runtime_coordinator_review_1.enqueueTask)(task.id, ctx) });
            continue;
        }
        const settled = await settleGroupCoordinationDependency(task, ctx);
        results.push({ request_id: request.id, task_id: task.id, ...settled });
    }
    return { total: requests.length, results };
}
async function runGroupCoordinationBusinessChainTestTurn(input) {
    return (0, collaboration_runtime_cross_agent_runtime_part_01_1.handleAgentQaRequests)(input);
}
function buildCoordinatorVisibleMessageContent(content, fallback = "我已整理这次协作进展，技术细节已放入技术详情。", maxLength = 4000) {
    const polish = (value) => String(value || "")
        .replace(/\bcompleted\b/gi, "已完成")
        .replace(/\bfailed\b/gi, "失败")
        .replace(/\bblocked\b/gi, "阻塞")
        .replace(/\bpartial\b/gi, "部分完成")
        .replace(/\bmissing_receipt\b/gi, "缺少结果说明")
        .replace(/\bdone\b/gi, "完成")
        .replace(/的\s+表示\s+/g, "：")
        .replace(/\s*，\s*。/g, "。")
        .replace(/\s+/g, " ")
        .trim();
    const raw = String(content || "").trim();
    if (!raw)
        return fallback;
    const hasInternalSignals = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|task-id|WorkerContextPacket|trace_id|session_id|native_session|scratchpad|raw\s+receipt|raw\s+payload|runtime kernel|workflow_timeline/i.test(raw);
    if (hasInternalSignals) {
        return polish((0, group_orchestrator_1.sanitizeCoordinatorUserText)(raw, fallback, Math.min(maxLength, 1200)));
    }
    const lines = raw.split(/\r?\n/).map((line) => {
        if (!line.trim())
            return "";
        return polish((0, group_orchestrator_1.sanitizeCoordinatorUserText)(line, "", 900));
    });
    const visible = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return visible ? (0, memory_1.compactMemoryText)(visible, maxLength) : fallback;
}
function getCoordinatorVisibleMessageSelfTest() {
    const raw = [
        "📋 **协调复盘**",
        "",
        "web-app 的 <task-notification> 表示 completed，trace_id=abc123。",
        "CCM_AGENT_RECEIPT: {\"status\":\"done\"}",
    ].join("\n");
    const visible = buildCoordinatorVisibleMessageContent(raw, "我已整理执行成员的结果。", 1200);
    const friendly = buildCoordinatorVisibleMessageContent("📋 **协调复盘**\n\n- web-app：已完成页面入口。", "", 1200);
    return {
        pass: !/CCM_AGENT_RECEIPT|task-notification|trace_id|session_id|WorkerContextPacket/i.test(visible)
            && visible.includes("web-app")
            && /结果|主 Agent|技术详情|完成/i.test(visible)
            && friendly.includes("web-app")
            && friendly.includes("已完成页面入口"),
        visible,
        friendly,
    };
}
async function appendCoordinatorMessage(groupId, agent, content, streamRes = null, suffix = "review", metadata = {}) {
    const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
    const rawContent = String(content || "");
    const visibleContent = buildCoordinatorVisibleMessageContent(rawContent);
    const messageMetadata = { ...metadata };
    if (visibleContent !== rawContent && !messageMetadata.technical_content && !messageMetadata.technicalContent) {
        messageMetadata.technical_content = rawContent;
    }
    (0, storage_1.appendGroupMessage)(groupId, {
        id: messageId,
        role: "assistant",
        agent,
        content: visibleContent,
        timestamp: new Date().toISOString(),
        ...messageMetadata,
    });
    (0, collaboration_runtime_daily_dev_1.writeSse)(streamRes, {
        type: "agent_done",
        agent,
        text: visibleContent,
        messageId,
        ...messageMetadata,
    });
    return messageId;
}
function buildCoordinatorReworkRoutingDecision(item, input = {}) {
    return require("./collaboration-test-agent-runtime").buildCoordinatorReworkRoutingDecision(item, input);
}
function getMentionReworkRoute(mention) {
    if (!mention || typeof mention === "string")
        return null;
    const route = mention.reworkRoute || mention.rework_route || mention.routing || null;
    return route && typeof route === "object" ? route : null;
}
function coordinatorReworkRouteRequiresStop(route) {
    if (!route || typeof route !== "object")
        return false;
    return route.requires_stop === true || /stop_wrong_direction/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}
function coordinatorReworkRouteNeedsFreshVerifier(route) {
    if (!route || typeof route !== "object")
        return false;
    return route.requires_fresh_verifier === true
        || /fresh_verification|fresh_verifier|independent/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}
function coordinatorReworkRouteUsesVerifier(route) {
    if (!route || typeof route !== "object")
        return false;
    return coordinatorReworkRouteNeedsFreshVerifier(route)
        || /resume_verifier|same_verifier|test_agent_recheck/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}
function selectCoordinatorIndependentVerifier(group, originalTarget = "") {
    return require("./collaboration-test-agent-runtime").selectCoordinatorIndependentVerifier(group, originalTarget);
}
function isCoordinatorTestAgentName(value) {
    return /^(?:test[-_\s]*agent|测试\s*agent)$/i.test(String(value || "").trim());
}
function resolveProjectRuntimeForTestAgentHandoff(group, project) {
    const name = String(project || "").trim();
    if (!name)
        return { workDir: "", agentType: "", source: "missing" };
    const directMember = (group?.members || []).find((member) => String(member?.project || "").trim() === name);
    const directWorkDir = String(directMember?.workDir || directMember?.work_dir || "").trim();
    if (directWorkDir) {
        return { workDir: directWorkDir, agentType: String(directMember?.agentType || directMember?.agent || ""), source: "group_member" };
    }
    try {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(name, group, (0, db_1.getConfigs)());
        if (runtime?.workDir)
            return { workDir: String(runtime.workDir || ""), agentType: String(runtime.agentType || ""), source: "member_runtime" };
    }
    catch { }
    try {
        for (const config of (0, db_1.getConfigs)()) {
            for (const info of (0, db_1.getConfigInfo)(config.path)) {
                if (String(info.name || "").trim() === name) {
                    return { workDir: String(info.workDir || ""), agentType: String(info.agent || ""), source: "project_config" };
                }
            }
        }
    }
    catch { }
    return { workDir: "", agentType: "", source: "missing" };
}
function fileEntryMatchesProject(item, project) {
    if (!project || typeof item === "string")
        return true;
    const owner = String(item?.project || item?.agent || item?.target_project || item?.targetProject || "").trim();
    return !owner || owner === project;
}
function collectCoordinatorChangedFiles(value, project = "") {
    const source = Array.isArray(value)
        ? value
        : Array.isArray(value?.files)
            ? value.files
            : Array.isArray(value?.changes)
                ? value.changes
                : value ? [value] : [];
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)(source
        .filter((item) => fileEntryMatchesProject(item, project))
        .map((item) => typeof item === "string" ? item : item?.path || item?.file || item?.name || item?.relative_path || item?.relativePath || "")
        .filter(Boolean)).slice(0, 40);
}
function normalizeCoordinatorVerificationEvidenceCommand(value) {
    let source = String(value || "").trim();
    if (!source)
        return "";
    source = source
        .replace(/^[-*+]\s+/, "")
        .replace(/^`+|`+$/g, "")
        .split(/\r?\n/, 1)[0]
        .trim();
    if (!source || /[;&|<>]/.test(source))
        return "";
    const packageCommand = source.match(/^(npm|pnpm|yarn|bun)\s+(?:run\s+)?([a-zA-Z0-9][a-zA-Z0-9:._-]*)\b/i);
    if (packageCommand) {
        const manager = packageCommand[1].toLowerCase();
        const script = packageCommand[2];
        return `${manager} run ${script}`;
    }
    const command = source
        .split(/\s+(?:→|=>|passed\b|failed\b|verified\b|succeeded\b|exit(?:\s+code)?\s*[=:])/i, 1)[0]
        .replace(/:\s+(?=(?:node|python|pytest|jest|vitest|verified|passed|failed|built|compiled|exit)\b).*$/i, "")
        .trim();
    if (!command || !/^(?:npx\s+(?:tsc|jest|vitest|eslint)|pytest\b|python\s+-m\s+pytest\b|jest\b|vitest\b|tsc\b|go\s+test\b|cargo\s+test\b|mvn(?:w|\.cmd)?\s+test\b|gradle(?:w|\.bat)?\s+test\b)/i.test(command))
        return "";
    return /^[a-zA-Z0-9_./:@%+=,\-\s]+$/.test(command) ? command : "";
}
function collectCoordinatorVerificationCommands(project, workDir = "", previousLedger = null) {
    const fromLedger = Array.isArray(previousLedger?.verification) ? previousLedger.verification : [];
    const commands = (0, collaboration_runtime_status_helpers_1.uniqueStrings)([
        ...(0, collaboration_runtime_runtime_tools_1.buildProjectVerificationHints)(project, workDir),
        ...fromLedger.map(normalizeCoordinatorVerificationEvidenceCommand).filter(Boolean),
    ]);
    return commands.slice(0, 8);
}
function isCoordinatorOnlyAcceptanceCriterion(value) {
    const criterion = String(value || "").trim();
    if (!criterion)
        return true;
    const namesCoordinator = /(?:主\s*Agent|主智能体|协调(?:者|Agent)|coordinator|global\s+agent)/i.test(criterion);
    const describesCoordinatorDuty = /(?:总结|汇报|协调|分派|派发|调度|计划|todo|验收|复盘|审核|最终答复|最终回复|用户可见|技术详情)/i.test(criterion);
    if (namesCoordinator && describesCoordinatorDuty)
        return true;
    if (/(?:最终报告|最终总结|交付总结|完成报告).*(?:说明|包含|覆盖|变更文件|验证结果|风险|用户)/i.test(criterion))
        return true;
    if (/(?:涉及代码|代码任务|代码变更).*(?:实际文件变更|变更文件).*(?:构建|测试|验证).*证据/i.test(criterion))
        return true;
    if (/(?:TestAgent|测试\s*Agent|独立复核|独立验证|主\s*Agent.*抽查)/i.test(criterion))
        return true;
    if (/(?:项目执行成员|子\s*Agent|原实现(?:成员|Agent)?).*(?:说明|汇报|返回|回传).*(?:实际动作|文件变(?:化|更)|验证|风险)/i.test(criterion))
        return true;
    if (/(?:复核|验证).*(?:失败|未通过).*(?:返工|修复).*(?:复验|重跑|重新(?:复核|验证))/i.test(criterion))
        return true;
    return false;
}
function isCoordinatorReviewInstruction(value) {
    const text = String(value || "").trim();
    if (!text)
        return true;
    return /^(?:请)?基于最新(?:项目)?状态(?:核对|复核|检查)|^(?:请)?独立复核|不得只复述原实现者结论/i.test(text);
}
function buildCoordinatorTestAgentAcceptanceCriteria(task, verificationCommands) {
    const projectCriteria = (0, collaboration_runtime_task_queue_1.splitUserAcceptanceText)(task.acceptance_criteria || task.acceptanceCriteria)
        .filter((criterion) => !isCoordinatorOnlyAcceptanceCriterion(criterion));
    const commandCriteria = verificationCommands.map(command => `命令 ${command} 必须成功执行。`);
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([...projectCriteria, ...commandCriteria]).slice(0, 10);
}
function buildTestAgentHandoffId(taskId = "", originalTarget = "") {
    const base = [taskId || "test-agent-handoff", originalTarget || "project"].join("-");
    return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || `test-agent-handoff-${Date.now().toString(36)}`;
}
function getTestAgentHandoffReviewSubject(handoff = null) {
    return String(handoff?.review_subject
        || handoff?.reviewSubject
        || handoff?.metadata?.reviewSubject
        || handoff?.metadata?.review_subject
        || handoff?.projects?.[0]?.name
        || handoff?.project?.name
        || "").trim();
}
//# sourceMappingURL=collaboration-runtime-cross-agent-runtime-part-02.js.map