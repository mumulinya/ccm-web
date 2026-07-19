"use strict";
// Behavior-freeze split from collaboration-routes.ts (part 3/4).
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCollaborationApiTaskLifecycleRoutes = handleCollaborationApiTaskLifecycleRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const logs_1 = require("./logs");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function handleCollaborationApiTaskLifecycleRoutes(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/tasks/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const current = (0, db_1.loadTasks)().find(t => t.id === id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const validationError = (0, collaboration_1.validateTaskManualStatusUpdate)(current, updates);
                if (validationError)
                    return (0, utils_1.sendJson)(res, { error: validationError }, 409);
                const task = (0, collaboration_1.updateTask)(id, updates);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, collaboration_1.updateGroupTaskInlineStatus)(task, task.status, task.status_detail || "任务状态已更新");
                (0, utils_1.sendJson)(res, { success: true, task });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/reconcile-delivery" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.taskId || payload.id || "");
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const result = (0, collaboration_1.reconcileTaskDeliveryEvidence)(taskId);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : (result.status || 400));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                const message = (0, collaboration_1.compactFormText)(payload.message || payload.followup || payload.note, "");
                const result = (0, collaboration_1.continueTaskWithMessage)(taskId, message, ctx, {
                    source: payload.source || "user",
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                    continuationKind: payload.continuation_kind || payload.continuationKind || "auto",
                    idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error, new_task_suggested: result.new_task_suggested === true, continuation_kind: result.new_task_suggested ? "new_task" : undefined }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue-from-gaps" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const current = (0, db_1.loadTasks)().find(t => t.id === taskId);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                if (current.status === "done")
                    return (0, utils_1.sendJson)(res, { error: "已完成任务不需要按缺口继续" }, 409);
                const targeted = payload.rework_kind || payload.reworkKind || payload.work_item_id || payload.workItemId || payload.target || payload.agent || payload.project || payload.reason;
                const message = (0, collaboration_1.compactFormText)(payload.message, "") || (targeted ? (0, collaboration_1.buildTargetedReworkContinuationDraft)(current, payload) : (0, collaboration_1.buildTaskGapContinuationDraft)(current));
                const reworkKind = (0, collaboration_1.compactFormText)(payload.rework_kind || payload.reworkKind || "", "");
                const target = (0, collaboration_1.compactFormText)(payload.target || payload.agent || payload.project || "", "");
                const reason = (0, collaboration_1.compactFormText)(payload.reason || payload.detail || "", "");
                const title = (0, collaboration_1.compactFormText)(payload.title || payload.label || "", "");
                const workItemId = (0, collaboration_1.compactFormText)(payload.work_item_id || payload.workItemId || "", "");
                const isNextWorkItem = reworkKind === "next_claimable_work_item" || /user_next_work_item|next_work_item/i.test(String(payload.source || ""));
                const friendlyStatus = targeted
                    ? isNextWorkItem
                        ? `已接上${target ? ` ${target} 的` : ""}下一步工作项，等待主 Agent 继续派发`
                        : `已接上${target ? ` ${target} 的` : ""}精准返工，等待主 Agent 继续执行`
                    : "已按交付缺口生成返工说明，等待主 Agent 继续执行";
                let claimOwner = target;
                let claimRef = workItemId || target;
                if (isNextWorkItem) {
                    const currentItems = (0, collaboration_1.getTaskWorkItems)(current);
                    const requestedItem = currentItems.find((item) => [item.id, item.target, item.owner, item.subject].some(value => String(value || "").toLowerCase() === String(claimRef || "").toLowerCase()));
                    claimRef = claimRef || requestedItem?.id || "";
                    claimOwner = claimOwner || requestedItem?.owner || requestedItem?.target || "";
                    const preflight = (0, work_items_1.claimMainAgentWorkItem)(currentItems, claimRef, claimOwner, { checkOwnerBusy: true });
                    if (!preflight.ok) {
                        const claimSummary = (0, work_items_1.buildMainAgentWorkItemClaimSummary)(preflight, claimOwner, claimRef);
                        (0, collaboration_1.persistTaskWorkItems)(taskId, preflight.items, {
                            last_claim_summary: claimSummary,
                            last_claim_attempt: { agent: claimOwner, item_id: preflight.item?.id || "", result: "waiting", reason: preflight.reason || "", at: new Date().toISOString() },
                        });
                        (0, logs_1.addTaskLog)(taskId, "warning", claimSummary.headline);
                        return (0, utils_1.sendJson)(res, {
                            success: true,
                            waiting: true,
                            queued: false,
                            work_item_claim_summary: claimSummary,
                            task: (0, collaboration_1.getTaskById)(taskId),
                        });
                    }
                }
                const result = (0, collaboration_1.continueTaskWithMessage)(taskId, message, ctx, {
                    source: payload.source || (targeted ? "targeted_gap_rework" : "auto_gap_rework"),
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                    status_detail: friendlyStatus,
                    rework_kind: reworkKind,
                    target,
                    reason,
                    title,
                    work_item_id: workItemId,
                    idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                const claimResult = isNextWorkItem
                    ? (0, collaboration_1.claimTaskWorkItemForAgent)(taskId, claimOwner, reason || title, { itemRef: claimRef, checkOwnerBusy: true })
                    : null;
                (0, utils_1.sendJson)(res, {
                    ...result,
                    continuation_message: message,
                    queued: true,
                    work_item_claim_summary: claimResult?.summary || null,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=collaboration-routes-part-03.js.map