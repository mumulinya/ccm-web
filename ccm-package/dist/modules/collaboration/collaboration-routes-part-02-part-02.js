"use strict";
// Behavior-freeze split from collaboration-routes-part-02.ts (part 2/2).
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
exports.handleCollaborationApiIntakeRoutesPartB = handleCollaborationApiIntakeRoutesPartB;
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const mission_supervisor_1 = require("../../agents/global/mission-supervisor");
const db_1 = require("../../core/db");
const task_delivery_report_1 = require("./task-delivery-report");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_1 = require("./collaboration");
function handleCollaborationApiIntakeRoutesPartB(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/tasks/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const task = (0, collaboration_1.createTask)(payload);
                let queueResult = null;
                if (payload.auto_execute || payload.autoExecute) {
                    queueResult = (0, collaboration_1.enqueueTask)(task.id, ctx);
                }
                (0, utils_1.sendJson)(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            let operationKey = "";
            try {
                const payload = body ? JSON.parse(body) : {};
                operationKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
                const traceId = (0, reliability_ledger_1.ensureTraceId)(payload.trace_id || payload.traceId, "daily-dev");
                const groupId = payload.group_id || payload.groupId;
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "请选择目标开发群聊" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === groupId);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "开发群聊不存在" }, 404);
                const groupReadiness = (0, collaboration_1.validateDailyDevGroupReady)(group);
                const goal = (0, collaboration_1.compactFormText)(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
                if (!goal)
                    return (0, utils_1.sendJson)(res, { error: "请输入业务目标" }, 400);
                const quality = (0, daily_dev_backlog_1.evaluateDailyDevIntakeQuality)(payload, goal);
                const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
                if (!quality.pass && !forceQualityGate) {
                    return (0, utils_1.sendJson)(res, {
                        success: false,
                        needs_confirmation: true,
                        error: quality.message,
                        quality,
                    }, 422);
                }
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
                if (operation && !operation.acquired) {
                    const existingTask = operation.record?.result?.task_id ? (0, db_1.loadTasks)().find((item) => item.id === operation.record.result.task_id) : null;
                    (0, utils_1.sendJson)(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
                    return;
                }
                const title = (0, collaboration_1.compactFormText)(payload.title, goal.slice(0, 60));
                const backlogFile = (0, daily_dev_backlog_1.persistDailyDevBacklogFile)(groups, group, payload, title, goal);
                const sourceDocuments = [
                    payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
                    backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
                ].filter(Boolean).join("\n\n");
                const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };
                const task = (0, collaboration_1.createTask)({
                    title,
                    description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)(taskPayload),
                    target_project: groupReadiness.coordinator.project,
                    group_id: groupId,
                    assign_type: "group",
                    priority: payload.priority || "normal",
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    workflow_type: "daily_dev",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                    requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
                    business_goal: goal,
                    acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
                    source_documents: sourceDocuments,
                    workflow_meta: {
                        ...(payload.workflow_meta || payload.workflowMeta || {}),
                        intake_quality: quality,
                        intake: backlogFile ? {
                            backlog_file: backlogFile.name,
                            persisted_at: new Date().toISOString(),
                            source: "create-daily-dev",
                        } : null,
                    },
                    trace_id: traceId,
                    idempotency_key: operationKey || null,
                });
                if (backlogFile) {
                    (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, backlogFile.name, "dispatched", {
                        task_id: task.id,
                        result: "业务开发任务已创建并关联此需求池条目",
                    });
                }
                let queueResult = null;
                if (task.auto_execute) {
                    queueResult = (0, collaboration_1.enqueueTask)(task.id, ctx);
                    if (backlogFile && queueResult?.blocked) {
                        (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, backlogFile.name, "dispatched", {
                            task_id: task.id,
                            result: queueResult.message || "任务已创建，等待执行通道恢复",
                        });
                    }
                }
                if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("create-daily-dev", operationKey, { task_id: task.id, queued: !!queueResult?.queued });
                (0, utils_1.sendJson)(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() });
            }
            catch (e) {
                if (operationKey) {
                    try {
                        (0, reliability_ledger_1.failIdempotency)("create-daily-dev", operationKey, e);
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
        const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
        const items = (0, daily_dev_backlog_1.listDailyDevBacklogs)(groupId);
        const counts = items.reduce((acc, item) => {
            acc[item.status] = Number(acc[item.status] || 0) + 1;
            return acc;
        }, {});
        (0, utils_1.sendJson)(res, { success: true, items, counts });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                const status = String(payload.status || "").trim();
                if (!groupId || !name || !status)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id、name 或 status" }, 400);
                if (!["draft", "needs_user", "ready", "planned", "dispatched", "queued", "in_progress", "running", "reviewing", "blocked", "done", "failed"].includes(status)) {
                    return (0, utils_1.sendJson)(res, { error: "不支持的需求池状态" }, 400);
                }
                const file = (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, name, status, {
                    result: payload.reason || `用户手动设置为 ${status}`,
                });
                if (!file)
                    return (0, utils_1.sendJson)(res, { error: "需求池文件不存在" }, 404);
                const items = (0, daily_dev_backlog_1.listDailyDevBacklogs)(groupId);
                (0, utils_1.sendJson)(res, { success: true, file, items });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, daily_dev_backlog_1.importSharedDocsToDailyDevBacklog)({
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    force: !!payload.force,
                    priority: payload.priority || "normal",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                if (!groupId || !name)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id 或 name" }, 400);
                const result = (0, daily_dev_backlog_1.dispatchDailyDevBacklog)(groupId, name, ctx, {
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    force: !!payload.force,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, daily_dev_backlog_1.dispatchReadyDailyDevBacklogs)(ctx, {
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/requirement-epic/version" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, collaboration_1.updateRequirementEpicFromPlan)(payload);
                if (result.needs_confirmation)
                    return (0, utils_1.sendJson)(res, result, 409);
                const supervisor = result.epic ? (0, mission_supervisor_1.startGlobalMissionSupervisor)({
                    mission_id: result.epic.id,
                    trace_id: result.epic.trace_id,
                    session_id: result.epic.group_session_id || result.epic.group_id || "web",
                    source: payload.source || "requirement-epic-version",
                    business_goal: result.epic.business_goal,
                    acceptance: result.epic.acceptance_criteria,
                    max_attempts: payload.max_attempts || payload.maxAttempts || 3,
                    restart: true,
                }) : null;
                const queueResults = (result.children || [])
                    .filter((child) => child.status === "pending" && (!child.mission_dependencies || child.mission_dependencies.length === 0))
                    .map((child) => ({ task_id: child.id, ...(0, collaboration_1.enqueueTask)(child.id, ctx) }));
                (0, utils_1.sendJson)(res, { ...result, queue_results: queueResults, supervisor });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/requirement-epic/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.id || payload.task_id || payload.taskId || "").trim();
                const operation = String(payload.operation || "approve").trim().toLowerCase();
                const tasks = (0, db_1.loadTasks)();
                const epic = tasks.find((task) => task.id === taskId && task.workflow_type === "requirement_epic");
                if (!epic)
                    return (0, utils_1.sendJson)(res, { success: false, error: "需求 Epic 不存在" }, 404);
                const plan = epic.decomposition_plan || epic.requirement_decomposition || {};
                const children = tasks.filter((task) => task.parent_task_id === epic.id);
                if (operation === "approve") {
                    if (epic.status === "done" && epic.epic_review?.status === "approved") {
                        return (0, utils_1.sendJson)(res, { success: true, duplicate: true, task: epic, evidence_matrix: epic.epic_review?.evidence_matrix || [] });
                    }
                    const summary = epic.mission_summary || {};
                    if (summary.all_passed !== true || children.length === 0) {
                        return (0, utils_1.sendJson)(res, { success: false, error: "仍有子任务未通过交付验收，不能批准 Epic" }, 409);
                    }
                    const statusByTaskId = new Map((summary.children || []).map((row) => [String(row.task_id || ""), row]));
                    const childByKey = new Map(children.map((child) => [String(child.requirement_item_key || ""), child]));
                    const evidenceMatrix = (plan.items || []).map((item) => {
                        const child = childByKey.get(String(item.item_key || ""));
                        const status = child ? statusByTaskId.get(String(child.id)) : null;
                        return {
                            item_key: item.item_key,
                            title: item.title,
                            task_id: child?.id || "",
                            acceptance_criteria: item.acceptance_criteria || [],
                            source_evidence: item.source_evidence || [],
                            gate_passed: status?.gate_passed === true,
                            verification_count: Number(status?.verification_count || 0),
                            actual_file_change_count: Number(status?.actual_file_change_count || 0),
                        };
                    });
                    const approvedAt = new Date().toISOString();
                    const epicDeliverySummary = {
                        ...(epic.delivery_summary || {}),
                        headline: "需求 Epic 已通过整批变更审阅并完成交付",
                        requirement_epic: true,
                        acceptance_gate_passed: true,
                        evidence_matrix: evidenceMatrix,
                        global_acceptance_criteria: plan.global_acceptance_criteria || [],
                        requirement_content_hash: epic.requirement_content_hash || plan.content_hash || "",
                        plan_version: epic.requirement_version || plan.version || 1,
                        child_task_count: children.length,
                        approved_at: approvedAt,
                    };
                    const deliveryReport = (0, task_delivery_report_1.buildTaskDeliveryReport)({ ...epic, status: "done", status_detail: "用户已审阅整批变更并批准需求 Epic 交付" }, epicDeliverySummary, "done", "全部子任务、集成验收证据与原始需求验收矩阵已归档");
                    const updated = (0, collaboration_1.updateTask)(epic.id, {
                        status: "done",
                        status_detail: "用户已审阅整批变更并批准需求 Epic 交付",
                        completed_at: approvedAt,
                        epic_review: {
                            status: "approved",
                            approved_at: approvedAt,
                            reviewer: payload.reviewer || "user",
                            comment: payload.comment || payload.feedback || "",
                            evidence_matrix: evidenceMatrix,
                        },
                        delivery_summary: {
                            ...epicDeliverySummary,
                            delivery_report: deliveryReport,
                        },
                        collaboration_state: { ...(epic.collaboration_state || {}), phase: "completed", needs_user: false, completed_at: approvedAt },
                    }) || epic;
                    (0, logs_1.appendTaskTimelineEvent)(epic.id, {
                        type: "requirement_epic_approved",
                        title: "用户已批准 Epic 整批交付",
                        detail: `${children.length} 个子任务和原始验收标准证据矩阵已归档`,
                        status: "ok",
                        phase: "completed",
                        data: { evidence_matrix: evidenceMatrix },
                    });
                    return (0, utils_1.sendJson)(res, { success: true, task: updated, evidence_matrix: evidenceMatrix });
                }
                if (operation === "rework") {
                    const itemKey = String(payload.item_key || payload.itemKey || "").trim();
                    const feedback = (0, collaboration_1.compactFormText)(payload.feedback || payload.reason || payload.message, "");
                    if (!itemKey || !feedback)
                        return (0, utils_1.sendJson)(res, { success: false, error: "退回返工需要 item_key 和反馈说明" }, 400);
                    const child = children.find((task) => String(task.requirement_item_key || "") === itemKey || String(task.id) === itemKey);
                    if (!child)
                        return (0, utils_1.sendJson)(res, { success: false, error: "没有找到要返工的 Epic 子任务" }, 404);
                    const reworkKey = `${epic.id}:review-rework:${child.id}:${crypto.createHash("sha256").update(feedback).digest("hex").slice(0, 12)}`;
                    if (epic.epic_review?.status === "rework_requested" && epic.epic_review?.idempotency_key === reworkKey) {
                        return (0, utils_1.sendJson)(res, { success: true, duplicate: true, task: epic, child });
                    }
                    const continuation = (0, collaboration_1.continueTaskWithMessage)(child.id, `需求 Epic 整批审阅退回返工：${feedback}`, ctx, {
                        source: "requirement_epic_targeted_rework",
                        auto_execute: true,
                        idempotency_key: reworkKey,
                        status_detail: "用户在 Epic 整批审阅中退回该子任务返工",
                    });
                    const affectedDescendantIds = new Set();
                    let expanded = true;
                    while (expanded) {
                        expanded = false;
                        for (const candidate of children) {
                            if (candidate.id === child.id || affectedDescendantIds.has(candidate.id))
                                continue;
                            const dependencies = Array.isArray(candidate.mission_dependencies) ? candidate.mission_dependencies.map(String) : [];
                            if (dependencies.includes(child.id) || dependencies.some((dependencyId) => affectedDescendantIds.has(dependencyId))) {
                                affectedDescendantIds.add(candidate.id);
                                expanded = true;
                            }
                        }
                    }
                    const reopenedDescendants = children
                        .filter((candidate) => affectedDescendantIds.has(candidate.id))
                        .map((candidate) => (0, collaboration_1.updateTask)(candidate.id, {
                        status: "pending",
                        status_detail: `上游子任务 ${child.title} 已退回返工，等待上游重新验收后重跑`,
                        completed_at: null,
                        acceptance: null,
                        delivery_summary: null,
                        receipt: null,
                        global_mission_gate_passed: false,
                        dependency_blocked: true,
                        delivery_history: [
                            ...(Array.isArray(candidate.delivery_history) ? candidate.delivery_history : []),
                            {
                                archived_at: new Date().toISOString(),
                                reason: `上游 ${child.requirement_item_key || child.id} 定向返工`,
                                status: candidate.status,
                                delivery_summary: candidate.delivery_summary || null,
                                receipt: candidate.receipt || null,
                            },
                        ].slice(-20),
                    })).filter(Boolean);
                    const updatedEpic = (0, collaboration_1.updateTask)(epic.id, {
                        status: "in_progress",
                        status_detail: `子任务 ${child.title} 已退回返工，后继依赖将继续等待`,
                        epic_review: {
                            status: "rework_requested",
                            item_key: itemKey,
                            child_task_id: child.id,
                            feedback,
                            idempotency_key: reworkKey,
                            requested_at: new Date().toISOString(),
                        },
                        collaboration_state: { ...(epic.collaboration_state || {}), phase: "reworking", needs_user: false },
                    }) || epic;
                    (0, logs_1.appendTaskTimelineEvent)(epic.id, {
                        type: "requirement_epic_targeted_rework",
                        title: `已退回子任务：${child.title}`,
                        detail: feedback,
                        status: "active",
                        phase: "reworking",
                        data: { item_key: itemKey, child_task_id: child.id, reopened_descendant_ids: [...affectedDescendantIds] },
                    });
                    const supervisor = (0, mission_supervisor_1.startGlobalMissionSupervisor)({
                        mission_id: epic.id,
                        trace_id: epic.trace_id,
                        session_id: epic.group_session_id || epic.group_id || "web",
                        source: "requirement-epic-targeted-rework",
                        business_goal: epic.business_goal,
                        acceptance: epic.acceptance_criteria,
                        max_attempts: 3,
                        restart: true,
                    });
                    return (0, utils_1.sendJson)(res, { success: true, task: updatedEpic, child, continuation, reopened_descendants: reopenedDescendants, supervisor });
                }
                return (0, utils_1.sendJson)(res, { success: false, error: "不支持的 Epic 审阅操作" }, 400);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=collaboration-routes-part-02-part-02.js.map