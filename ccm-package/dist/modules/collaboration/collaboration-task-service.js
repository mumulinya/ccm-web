"use strict";
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
exports.createTask = createTask;
exports.classifyTaskContinuation = classifyTaskContinuation;
exports.looksLikeTaskContinuation = looksLikeTaskContinuation;
exports.updateTask = updateTask;
exports.removeTaskFromQueues = removeTaskFromQueues;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.reconcileTaskCollaborationState = reconcileTaskCollaborationState;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.retryTask = retryTask;
exports.purgeArchivedTask = purgeArchivedTask;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const memory_1 = require("./memory");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const artifact_retention_1 = require("../../test-agent/artifact-retention");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const task_replay_journal_1 = require("../../system/task-replay-journal");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function createTask(task) {
    const tasks = (0, db_1.loadTasks)();
    const idempotencyKey = String(task.idempotency_key || task.idempotencyKey || "").trim();
    if (idempotencyKey) {
        const existing = tasks.find((item) => String(item.idempotency_key || "") === idempotencyKey);
        if (existing)
            return existing;
    }
    const taskGroupId = String(task.group_id || task.groupId || "").trim();
    const taskGroupSession = taskGroupId
        ? (0, storage_1.resolveWritableGroupChatSession)(taskGroupId, task.group_session_id || task.groupSessionId || "", {
            title: (0, memory_1.compactMemoryText)(task.title || "任务会话", 80),
        })
        : null;
    const taskGroupSessionId = String(taskGroupSession?.id || "");
    const semanticGoal = (0, collaboration_1.compactFormText)(task.business_goal || task.businessGoal || task.description || task.title, "").toLowerCase().replace(/\s+/g, " ");
    const semanticTarget = [taskGroupId, taskGroupSessionId, task.target_project || task.targetProject || "", task.workflow_type || task.workflowType || "general"].join("|").toLowerCase();
    if (semanticGoal && task.allow_duplicate !== true && task.allowDuplicate !== true) {
        const duplicate = [...tasks].reverse().find((item) => {
            if (item.archived || item.deleted_at || ["done", "cancelled", "archived", "failed"].includes(String(item.status || "")))
                return false;
            if (Date.now() - Date.parse(item.created_at || "") > 5 * 60 * 1000)
                return false;
            const itemGoal = (0, collaboration_1.compactFormText)(item.business_goal || item.description || item.title, "").toLowerCase().replace(/\s+/g, " ");
            const itemTarget = [item.group_id || "", item.group_session_id || item.groupSessionId || "", item.target_project || "", item.workflow_type || "general"].join("|").toLowerCase();
            return itemGoal === semanticGoal && itemTarget === semanticTarget;
        });
        if (duplicate)
            return { ...duplicate, deduplicated: true, duplicate_reason: "5 分钟内已存在相同目标与执行范围的活动任务" };
    }
    const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id || task.traceId, "task");
    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: task.title,
        description: task.description || "",
        target_project: task.target_project,
        group_id: taskGroupId || null,
        group_session_id: taskGroupSessionId || null,
        assign_type: task.assign_type || "project",
        status: "pending",
        priority: task.priority || "normal",
        auto_execute: !!(task.auto_execute || task.autoExecute),
        queue_scope: task.queue_scope || task.queueScope || "",
        child_agent_isolation: task.child_agent_isolation || task.childAgentIsolation || "",
        branch_policy: task.branch_policy || task.branchPolicy || "",
        commit_policy: task.commit_policy || task.commitPolicy || "",
        allowed_paths: Array.isArray(task.allowed_paths || task.allowedPaths) ? (task.allowed_paths || task.allowedPaths) : [],
        workflow_type: task.workflow_type || task.workflowType || "general",
        business_goal: task.business_goal || task.businessGoal || "",
        acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || "",
        source_documents: task.source_documents || task.sourceDocuments || "",
        source_attachments: Array.isArray(task.source_attachments || task.sourceAttachments)
            ? (task.source_attachments || task.sourceAttachments)
            : [],
        requirement_extraction: task.requirement_extraction || task.requirementExtraction || null,
        source_ingestion: task.source_ingestion || task.sourceIngestion || null,
        requires_code_changes: task.requires_code_changes ?? task.requiresCodeChanges ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        requires_verification: task.requires_verification ?? task.requiresVerification ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        requires_independent_review: task.requires_independent_review ?? task.requiresIndependentReview ?? false,
        requires_agent_qa: task.requires_agent_qa ?? task.requiresAgentQa ?? false,
        workflow_meta: task.workflow_meta || task.workflowMeta || null,
        parent_task_id: task.parent_task_id || task.parentTaskId || null,
        global_mission_id: task.global_mission_id || task.globalMissionId || null,
        mission_target: task.mission_target || task.missionTarget || null,
        mission_handoff: task.mission_handoff || task.missionHandoff || null,
        mission_dependencies: Array.isArray(task.mission_dependencies || task.missionDependencies)
            ? (task.mission_dependencies || task.missionDependencies)
            : [],
        child_task_ids: Array.isArray(task.child_task_ids || task.childTaskIds) ? (task.child_task_ids || task.childTaskIds) : [],
        mission_plan: task.mission_plan || task.missionPlan || null,
        followups: Array.isArray(task.followups) ? task.followups : [],
        intake_state: task.intake_state || task.intakeState || null,
        intake_draft: task.intake_draft || task.intakeDraft || null,
        cron_job_id: task.cron_job_id || null,
        cron_trigger: task.cron_trigger || null,
        trace_id: traceId,
        idempotency_key: idempotencyKey || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    newTask.work_items = (0, work_items_1.buildMainAgentWorkItems)(newTask);
    newTask.work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(newTask.work_items);
    tasks.push(newTask);
    (0, db_1.saveTasks)(tasks);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `task:${newTask.id}:created`, type: "task.created", status: "ok", task_id: newTask.id, group_id: newTask.group_id || "", agent: newTask.target_project || "", message: newTask.title, data: { workflow_type: newTask.workflow_type, assign_type: newTask.assign_type, group_session_id: newTask.group_session_id || "", idempotency_key: idempotencyKey ? "present" : "absent" } });
    return newTask;
}
function classifyTaskContinuation(message) {
    const text = String(message || "").trim();
    if (/(?:这是|作为|创建|开始).{0,10}(?:新任务|另一个任务)|与当前任务无关|另外一个项目/i.test(text))
        return "new_task";
    if (/(?:目标|需求|方案).{0,12}(?:改成|调整为|替换为)|不要.{0,30}(?:改为|改成)|以.+为准/i.test(text))
        return "revise_goal";
    return "supplement";
}
function looksLikeTaskContinuation(message) {
    return /^(?:再|还要|还需要|另外补充|补充|继续|接着|顺便|刚才|上面|这个任务|把它)|(?:改成|调整为|再加|再补|继续修改|基于刚才)/i.test(String(message || "").trim());
}
function updateTask(id, updates) {
    const tasks = (0, db_1.loadTasks)();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    const previousStatus = tasks[idx].status;
    const previousReceiptKey = String(tasks[idx].receipt_idempotency_key || "");
    const previousCollaborationState = tasks[idx].collaboration_state || {};
    tasks[idx].trace_id = (0, reliability_ledger_1.ensureTraceId)(tasks[idx].trace_id || updates.trace_id || updates.traceId, "task");
    if (updates.receipt) {
        updates.receipt_idempotency_key = crypto.createHash("sha256").update(JSON.stringify(updates.receipt)).digest("hex");
    }
    Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
    if (updates.delivery_summary && typeof updates.delivery_summary === "object") {
        tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
    }
    else if (updates.status === "done" || updates.status === "cancelled") {
        tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
    }
    else if (updates.collaboration_state && typeof updates.collaboration_state === "object") {
        tasks[idx].collaboration_state = { ...previousCollaborationState, ...updates.collaboration_state, updated_at: new Date().toISOString() };
    }
    const taskExecutions = (0, execution_kernel_1.listExecutions)({ taskId: id });
    tasks[idx].lifecycle = (0, collaboration_1.deriveTaskLifecycle)(tasks[idx], taskExecutions);
    tasks[idx].work_items = (0, work_items_1.buildMainAgentWorkItems)(tasks[idx], { executions: taskExecutions });
    tasks[idx].work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(tasks[idx].work_items);
    if (updates.status === "done") {
        tasks[idx].completed_at = updates.completed_at || new Date().toISOString();
    }
    else if (updates.status && updates.status !== "done") {
        delete tasks[idx].completed_at;
    }
    if (tasks[idx].parent_task_id) {
        (0, collaboration_1.refreshGlobalMissionParentInTaskList)(tasks, tasks[idx].parent_task_id);
    }
    (0, collaboration_1.appendGlobalDirectDispatchContinuationToHistory)(tasks[idx], previousStatus);
    (0, collaboration_1.appendGlobalDirectDispatchCompletionToHistory)(tasks[idx], previousStatus);
    (0, collaboration_1.appendGlobalDirectDispatchRollbackToHistory)(tasks[idx], previousStatus);
    (0, db_1.saveTasks)(tasks);
    if (updates.status && updates.status !== previousStatus) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `task:${id}:status:${updates.status}:${tasks[idx].updated_at}`, type: "task.status_changed", status: updates.status === "failed" ? "error" : updates.status === "done" ? "ok" : "info", task_id: id, group_id: tasks[idx].group_id || "", agent: tasks[idx].target_project || "", message: `${previousStatus || "unknown"} → ${updates.status}`, data: { from: previousStatus || "", to: updates.status, detail: String(updates.status_detail || updates.result || "").slice(0, 500) } });
    }
    if (updates.receipt && updates.receipt_idempotency_key !== previousReceiptKey) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `task:${id}:receipt:${updates.receipt_idempotency_key}`, type: "worker.receipt_persisted", status: updates.receipt.status === "done" ? "ok" : updates.receipt.status === "failed" ? "error" : "warning", task_id: id, group_id: tasks[idx].group_id || "", agent: updates.receipt.agent || tasks[idx].target_project || "", message: updates.receipt.summary || `回执状态 ${updates.receipt.status || "unknown"}`, data: { receipt_status: updates.receipt.status || "", filesChanged: updates.receipt.filesChanged || [], verification: updates.receipt.verification || [] } });
    }
    return tasks[idx];
}
function removeTaskFromQueues(taskId) {
    let removed = 0;
    for (const queue of collaboration_1.taskQueues.values()) {
        let index = queue.indexOf(taskId);
        while (index >= 0) {
            queue.splice(index, 1);
            removed++;
            index = queue.indexOf(taskId);
        }
    }
    collaboration_1.runningTaskIds.delete(taskId);
    return removed;
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    return require("./collaboration-acceptance").canCompleteDailyDevFromDeliverySummary(task, execution, summary);
}
function reconcileTaskCollaborationState(task, previous = {}) {
    const now = new Date().toISOString();
    if (task?.status === "done" && (0, collaboration_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}))
        return { ...previous, phase: "completed", needs_user: false, completed_at: task.completed_at || now, updated_at: now };
    if (task?.status === "cancelled")
        return { ...previous, phase: "cancelled", needs_user: false, updated_at: now };
    const items = (0, collaboration_1.getTaskGapItems)(task);
    const fingerprint = items.length ? (0, collaboration_1.getTaskGapFingerprint)(task) : "";
    const oldGap = previous?.gap || {};
    const sameGap = !!fingerprint && oldGap.fingerprint === fingerprint;
    const attempts = sameGap ? Number(oldGap.auto_attempts || 0) : 0;
    const exhausted = items.length > 0 && attempts >= 1;
    return {
        ...previous,
        phase: exhausted ? "needs_user" : items.length ? "reviewing" : task?.status === "in_progress" ? "executing" : "planning",
        needs_user: exhausted,
        gap: items.length ? { ...oldGap, fingerprint, items, auto_attempts: attempts, updated_at: now } : null,
        updated_at: now,
    };
}
function continueDailyDevTasksFromGaps(ctx, options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(50, Number(options.limit || 5)));
    const maxPerTask = Math.max(1, Math.min(20, Number(options.max_per_task || options.maxPerTask || 3)));
    const candidates = (0, db_1.loadTasks)()
        .filter(task => (0, collaboration_1.hasDailyDevContinuationGaps)(task))
        .filter(task => (0, collaboration_1.canAutoContinueTaskGaps)(task))
        .filter(task => !groupId || task.group_id === groupId)
        .filter(task => Number(task.auto_gap_continue_count || 0) < maxPerTask)
        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
        .slice(0, limit);
    const results = candidates.map((task) => {
        const message = (0, collaboration_1.buildTaskGapContinuationDraft)(task);
        const result = (0, collaboration_1.continueTaskWithMessage)(task.id, message, ctx, {
            source: options.source || "autopilot_gap_rework",
            auto_execute: options.auto_execute,
            autoExecute: options.autoExecute,
            status_detail: "自动驾驶已按交付缺口生成返工说明，等待主 Agent 继续执行",
        });
        return {
            task_id: task.id,
            title: task.title,
            group_id: task.group_id,
            ...result,
            task: undefined,
            continuation_message: message,
        };
    });
    return {
        success: true,
        total_candidates: candidates.length,
        continued: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        blocked: results.filter((item) => item.queue_result?.blocked).length,
        failed: results.filter((item) => !item.success).length,
        limit,
        max_per_task: maxPerTask,
        results,
    };
}
function retryTask(id, ctx, reason = "", autoExecute = true) {
    if (collaboration_1.runningTaskIds.has(id)) {
        return { success: false, status: 409, error: "任务正在执行中，请等待本轮结束后再重试" };
    }
    const current = (0, db_1.loadTasks)().find(t => t.id === id);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    if (current.status === "done")
        return { success: false, status: 409, error: "已完成任务不能重试" };
    const retryCount = Number(current.retry_count || 0) + 1;
    (0, execution_kernel_1.clearTaskCancellation)(id);
    const retryReason = (0, collaboration_1.compactFormText)(reason, "用户重新入队");
    const previousDelivery = (current.delivery_summary || current.receipt || current.review || current.final_report || current.result)
        ? {
            retry: retryCount,
            archived_at: new Date().toISOString(),
            reason: retryReason,
            status: current.status,
            status_detail: current.status_detail || "",
            receipt: current.receipt || null,
            review: current.review || null,
            file_changes: current.file_changes || null,
            delivery_summary: current.delivery_summary || null,
            final_report: current.final_report || "",
            result: current.result || "",
        }
        : null;
    const task = updateTask(id, {
        status: "pending",
        is_paused: false,
        paused: false,
        queued_at: null,
        started_at: null,
        result: "",
        final_report: "",
        status_detail: `第 ${retryCount} 次重试，等待主 Agent 重新执行`,
        // 当前证据在新一轮产出前仍是唯一可追溯事实；同时冻结到历史，禁止重试把证据链抹掉。
        delivery_history: previousDelivery
            ? [...(Array.isArray(current.delivery_history) ? current.delivery_history : []), previousDelivery].slice(-20)
            : (Array.isArray(current.delivery_history) ? current.delivery_history : []),
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        last_retry_reason: retryReason,
    });
    if (task)
        (0, collaboration_1.updateGroupTaskInlineStatus)(task, "pending", `第 ${retryCount} 次重试，等待主 Agent 重新执行`);
    (0, logs_1.addTaskLog)(id, "info", `任务重新入队重试：${retryReason}`);
    const queueResult = autoExecute ? (0, collaboration_1.enqueueTask)(id, ctx) : null;
    return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() };
}
function purgeArchivedTask(id) {
    const tasks = (0, db_1.loadTasks)();
    const current = tasks.find(task => task.id === id);
    if (!current)
        return null;
    if (!current.archived && !current.deleted_at)
        throw new Error("任务必须先删除归档，才能永久清除");
    removeTaskFromQueues(id);
    (0, execution_kernel_1.requestTaskCancellation)(id, "永久清除归档任务", "task-governance");
    (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: id }, "永久清除归档任务");
    (0, reliability_ledger_1.releaseTaskLease)(id, "purged");
    for (const execution of (0, execution_kernel_1.listExecutions)({ taskId: id })) {
        if (execution.workspace?.mode === "worktree" && !execution.workspace?.cleanedAt) {
            try {
                (0, execution_kernel_1.cleanupExecutionWorktree)(execution.id, true);
            }
            catch { }
        }
    }
    const purgedSessions = (0, agent_sessions_1.purgeTaskAgentSessions)(id);
    const purgedExecutionArtifacts = (0, execution_kernel_1.purgeTaskExecutionArtifacts)(id);
    const purgedTestAgentArtifacts = (0, artifact_retention_1.purgeTestAgentArtifactsForTask)(id);
    const purgedTestAgentRuns = (0, test_agent_runner_1.purgeTestAgentRunnerRecordsForTask)(id);
    const purgedReplayJournal = (0, task_replay_journal_1.purgeTaskReplayJournalForTask)(id);
    (0, execution_kernel_1.clearTaskCancellation)(id);
    (0, db_1.saveTasks)(tasks.filter(task => task.id !== id));
    return { ...current, purge_cleanup: { sessions: purgedSessions.length, test_agent_artifacts: purgedTestAgentArtifacts, test_agent_runs: purgedTestAgentRuns, replay_journal: purgedReplayJournal, ...purgedExecutionArtifacts } };
}
//# sourceMappingURL=collaboration-task-service.js.map