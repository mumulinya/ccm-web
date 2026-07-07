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
exports.normalizeMainAgentWorkItemStatus = normalizeMainAgentWorkItemStatus;
exports.buildMainAgentWorkItems = buildMainAgentWorkItems;
exports.updateMainAgentWorkItem = updateMainAgentWorkItem;
exports.claimMainAgentWorkItem = claimMainAgentWorkItem;
exports.requeueStaleMainAgentWorkItems = requeueStaleMainAgentWorkItems;
exports.buildMainAgentWorkItemSummary = buildMainAgentWorkItemSummary;
exports.runMainAgentWorkItemSelfTest = runMainAgentWorkItemSelfTest;
const crypto = __importStar(require("crypto"));
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const WORK_ITEM_VERIFICATION_PATTERN = /验证|验收|测试|复核|检查|verify|verification|test|qa|lint|build/i;
function compactText(value, max = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function stringList(value, limit = 20) {
    const source = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/\r?\n|；|;|,|、/)
            : [];
    return [...new Set(source.map(item => compactText(item, 220)).filter(Boolean))].slice(0, limit);
}
function stableId(prefix, value) {
    const hash = crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex").slice(0, 16);
    return `${prefix}_${hash}`;
}
function normalizeMainAgentWorkItemStatus(status) {
    const value = String(status || "").toLowerCase().trim();
    if (["done", "completed", "succeeded", "success"].includes(value))
        return "completed";
    if (["running", "in_progress", "executing", "reviewing", "ready", "prompt_accepted", "spawning"].includes(value))
        return "in_progress";
    if (["blocked", "needs_info", "needs_user", "waiting_user", "partial", "missing_receipt"].includes(value))
        return "blocked";
    if (["failed", "error"].includes(value))
        return "failed";
    if (["cancelled", "canceled"].includes(value))
        return "cancelled";
    return "pending";
}
function normalizeRefList(value) {
    return stringList(value, 20).map(item => item.replace(/^@/, "").trim()).filter(Boolean);
}
function workItemReferenceMatches(item, ref) {
    const value = String(ref || "").replace(/^@/, "").trim().toLowerCase();
    if (!value)
        return false;
    return [item.id, item.target, item.owner, item.subject].some(candidate => String(candidate || "").toLowerCase() === value);
}
function findWorkItemByRef(items, ref) {
    return items.find(item => workItemReferenceMatches(item, ref)) || null;
}
function normalizeReceiptRows(task = {}) {
    const summary = task.delivery_summary || {};
    return [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
        ...(task.receipt ? [task.receipt] : []),
    ];
}
function findReceiptForItem(item, receipts) {
    return receipts.find(receipt => {
        const agent = String(receipt?.agent || receipt?.project || receipt?.target || "").trim().toLowerCase();
        return agent && [item.target, item.owner].some(value => String(value || "").trim().toLowerCase() === agent);
    }) || null;
}
function findExecutionForItem(item, executions) {
    return executions.find(execution => {
        const project = String(execution?.project || execution?.agent || "").trim().toLowerCase();
        return project && [item.target, item.owner].some(value => String(value || "").trim().toLowerCase() === project);
    }) || null;
}
function normalizeWorkItem(raw = {}, context = {}) {
    const target = compactText(raw.target || raw.targetName || raw.project || raw.agent || raw.owner || context.target || "", 100);
    const subject = compactText(raw.subject || raw.title || raw.task || raw.message || raw.description || context.subject || "处理子任务", 160);
    const now = context.now || new Date().toISOString();
    const id = compactText(raw.id || raw.work_item_id || raw.workItemId || raw.assignmentId || raw.assignment_id || "", 100)
        || stableId("wi", {
            taskId: context.taskId,
            target,
            subject,
            index: context.index,
            source: raw.source || context.source,
        });
    return {
        id,
        taskId: String(raw.taskId || raw.task_id || context.taskId || "").trim(),
        scopeId: String(raw.scopeId || raw.scope_id || context.scopeId || "").trim(),
        subject,
        description: compactText(raw.description || raw.task || raw.message || subject, 500),
        activeForm: compactText(raw.activeForm || raw.active_form || `正在处理：${subject}`, 180),
        owner: compactText(raw.owner || raw.assignee || raw.project || raw.agent || target, 100),
        target,
        agentType: compactText(raw.agentType || raw.agent_type || raw.executor || raw.runtime || "", 80),
        status: normalizeMainAgentWorkItemStatus(raw.status),
        blocks: normalizeRefList(raw.blocks || raw.blocking || []),
        blockedBy: normalizeRefList(raw.blockedBy || raw.blocked_by || raw.dependsOn || raw.depends_on || raw.depends || []),
        attempt: Math.max(1, Number(raw.attempt || raw.retry_count || 1) || 1),
        source: compactText(raw.source || context.source || "main-agent", 80),
        createdAt: String(raw.createdAt || raw.created_at || now),
        updatedAt: String(raw.updatedAt || raw.updated_at || now),
        startedAt: String(raw.startedAt || raw.started_at || ""),
        completedAt: String(raw.completedAt || raw.completed_at || ""),
        lastReceipt: raw.lastReceipt || raw.last_receipt || raw.receipt || null,
        evidence: stringList([...(Array.isArray(raw.evidence) ? raw.evidence : []), ...(raw.summary ? [raw.summary] : [])], 12),
        filesChanged: stringList(raw.filesChanged || raw.files_changed || raw.files, 30),
        verification: stringList(raw.verification || raw.tests || raw.verification_results, 20),
        blockers: stringList(raw.blockers, 12),
        needs: stringList(raw.needs, 12),
        requeueReason: compactText(raw.requeueReason || raw.requeue_reason || "", 200),
    };
}
function assignmentToWorkItem(assignment, task, index) {
    return normalizeWorkItem({
        ...assignment,
        source: assignment.source || "assignment_evidence",
        subject: assignment.subject || assignment.task || assignment.message || task.business_goal || task.title,
        target: assignment.targetName || assignment.project || assignment.agent || assignment.target_project,
        owner: assignment.owner || assignment.project || assignment.agent || assignment.targetName || assignment.target_project,
        blockedBy: assignment.blockedBy || assignment.blocked_by || assignment.dependsOn || assignment.depends_on,
    }, {
        taskId: task.id,
        scopeId: task.group_id || task.global_mission_id || task.id,
        index,
        source: "assignment_evidence",
    });
}
function missionTargetToWorkItem(target, task, index) {
    return normalizeWorkItem({
        source: "mission_plan",
        subject: target.task || target.reason || task.business_goal || task.title,
        description: target.reason || target.task || task.business_goal || task.title,
        target: target.name || target.project || target.group_id || target.coordinator,
        owner: target.coordinator || target.project || target.name,
        agentType: target.type || "",
        blockedBy: target.depends_on || target.dependsOn || [],
    }, {
        taskId: task.id,
        scopeId: task.group_id || task.global_mission_id || task.id,
        index,
        source: "mission_plan",
    });
}
function fallbackTaskWorkItem(task) {
    const target = task.target_project || task.mission_target?.name || task.mission_target?.project || "";
    const executable = !!target || ["daily_dev", "project_task"].includes(String(task.workflow_type || ""));
    if (!executable)
        return null;
    return normalizeWorkItem({
        source: "task_target",
        subject: task.business_goal || task.title || "处理项目任务",
        description: task.description || task.business_goal || task.title,
        target: target || task.group_id || "main-agent",
        owner: target || "",
        status: task.status === "done" ? "completed" : task.status,
    }, {
        taskId: task.id,
        scopeId: task.group_id || task.global_mission_id || task.id,
        index: 0,
        source: "task_target",
    });
}
function applyReceiptAndExecution(item, task, receipts, executions, now) {
    const receipt = findReceiptForItem(item, receipts);
    const execution = findExecutionForItem(item, executions);
    let status = item.status;
    if (receipt)
        status = normalizeMainAgentWorkItemStatus(receipt.status || receipt.receipt_status);
    else if (execution)
        status = normalizeMainAgentWorkItemStatus(execution.state || execution.status);
    else if (task.status === "done" && item.source === "task_target")
        status = "completed";
    else if (["failed", "cancelled"].includes(String(task.status || "")) && item.source === "task_target")
        status = normalizeMainAgentWorkItemStatus(task.status);
    const filesChanged = stringList([
        ...item.filesChanged,
        ...(receipt ? stringList(receipt.filesChanged || receipt.files_changed || receipt.files, 30) : []),
    ], 30);
    const verification = stringList([
        ...item.verification,
        ...(receipt ? stringList(receipt.verification || receipt.tests || receipt.verification_results, 20) : []),
    ], 20);
    const blockers = stringList([
        ...item.blockers,
        ...(receipt ? stringList(receipt.blockers, 12) : []),
    ], 12);
    const needs = stringList([
        ...item.needs,
        ...(receipt ? stringList(receipt.needs, 12) : []),
    ], 12);
    const evidence = stringList([
        ...item.evidence,
        ...(receipt?.summary ? [receipt.summary] : []),
        ...(filesChanged.length ? [`修改文件 ${filesChanged.length} 个`] : []),
        ...(verification.length ? [`验证 ${verification.length} 项`] : []),
    ], 12);
    return {
        ...item,
        status,
        lastReceipt: receipt || item.lastReceipt || null,
        filesChanged,
        verification,
        blockers,
        needs,
        evidence,
        startedAt: item.startedAt || (status === "in_progress" ? now : ""),
        completedAt: item.completedAt || (TERMINAL_STATUSES.has(status) ? now : ""),
        updatedAt: receipt || execution ? now : item.updatedAt || now,
    };
}
function dedupeWorkItems(items) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const key = item.id || `${item.target}|${item.subject}`;
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result;
}
function workItemHasVerificationSignal(item) {
    const text = [
        item.subject,
        item.description,
        item.activeForm,
        item.owner,
        item.target,
        ...item.evidence,
        ...item.verification,
    ].filter(Boolean).join(" ");
    return WORK_ITEM_VERIFICATION_PATTERN.test(text);
}
function buildWorkItemVerificationReminder(items) {
    if (items.length < 3)
        return null;
    if (!items.every(item => item.status === "completed"))
        return null;
    if (items.some(workItemHasVerificationSignal))
        return null;
    return {
        schema: "ccm-main-agent-work-item-verification-reminder-v1",
        status: "needs_verification_work_item",
        title: "执行队列还缺验收",
        headline: "工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。",
        reason: "3 个以上工作项全部完成时，需要在最终总结前补一次真实验收。",
        next_action: "主 Agent 会补齐验收或说明无法验证的原因，再给出最终交付总结。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function buildMainAgentWorkItems(task = {}, options = {}) {
    const now = options.now || new Date().toISOString();
    const summary = task.delivery_summary || {};
    const explicit = Array.isArray(task.work_items || task.workItems) ? (task.work_items || task.workItems) : [];
    const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const missionTargets = Array.isArray(task.mission_plan?.targets) ? task.mission_plan.targets : [];
    const explicitItems = explicit.map((item, index) => normalizeWorkItem(item, { taskId: task.id, scopeId: task.group_id || task.global_mission_id || task.id, index, now, source: item.source || "task_work_items" }));
    const derivedItems = [
        ...assignments.map((assignment, index) => assignmentToWorkItem(assignment, task, index)),
        ...(!assignments.length ? missionTargets.map((target, index) => missionTargetToWorkItem(target, task, index)) : []),
    ];
    const fallback = !derivedItems.length ? fallbackTaskWorkItem(task) : null;
    const filteredExplicit = derivedItems.length
        ? explicitItems.filter(item => item.source !== "task_target" || !derivedItems.some(derived => (derived.target || derived.owner) && [item.target, item.owner].includes(derived.target || derived.owner)))
        : explicitItems;
    const baseItems = filteredExplicit.length || derivedItems.length
        ? [...filteredExplicit, ...derivedItems]
        : [fallback].filter(Boolean);
    const receipts = normalizeReceiptRows(task);
    const executions = Array.isArray(options.executions) ? options.executions : [];
    const enriched = dedupeWorkItems(baseItems)
        .map(item => applyReceiptAndExecution(item, task, receipts, executions, now));
    return enriched
        .map(item => {
        const unresolvedDeps = item.blockedBy.filter(ref => {
            const dep = findWorkItemByRef(enriched, ref);
            return dep && dep.status !== "completed";
        });
        if (unresolvedDeps.length && item.status === "pending")
            return { ...item, status: "blocked", blockers: stringList([...item.blockers, `等待前置工作：${unresolvedDeps.join("、")}`], 12) };
        return item;
    });
}
function updateMainAgentWorkItem(items, itemRef, patch = {}, now = new Date().toISOString()) {
    return items.map(item => {
        if (!workItemReferenceMatches(item, itemRef))
            return item;
        return normalizeWorkItem({ ...item, ...patch, status: patch.status || item.status, updatedAt: now }, { taskId: item.taskId, scopeId: item.scopeId, now, source: item.source });
    });
}
function claimMainAgentWorkItem(items, itemRef, owner, options = {}) {
    const now = options.now || new Date().toISOString();
    const normalizedOwner = compactText(owner, 100);
    const target = findWorkItemByRef(items, itemRef);
    if (!target)
        return { ok: false, reason: "task_not_found", items };
    if (TERMINAL_STATUSES.has(target.status))
        return { ok: false, reason: "already_resolved", item: target, items };
    if (target.owner && target.owner !== normalizedOwner && target.status === "in_progress") {
        return { ok: false, reason: "already_claimed", item: target, items };
    }
    const blocking = target.blockedBy.filter(ref => {
        const dep = findWorkItemByRef(items, ref);
        return dep && dep.status !== "completed";
    });
    if (blocking.length)
        return { ok: false, reason: "blocked", item: target, items, blocking };
    if (options.checkOwnerBusy) {
        const busy = items.find(item => item.id !== target.id && item.owner === normalizedOwner && !TERMINAL_STATUSES.has(item.status));
        if (busy)
            return { ok: false, reason: "agent_busy", item: busy, items };
    }
    const nextItems = items.map(item => item.id === target.id
        ? { ...item, owner: normalizedOwner || item.owner, status: "in_progress", startedAt: item.startedAt || now, updatedAt: now }
        : item);
    return { ok: true, item: nextItems.find(item => item.id === target.id), items: nextItems };
}
function requeueStaleMainAgentWorkItems(items, options = {}) {
    const staleMs = Number(options.staleMs || 30 * 60 * 1000);
    const nowMs = Number(options.nowMs || Date.now());
    const now = new Date(nowMs).toISOString();
    const requeued = [];
    const next = items.map(item => {
        if (item.status !== "in_progress")
            return item;
        const last = Date.parse(item.updatedAt || item.startedAt || item.createdAt || now);
        if (!Number.isFinite(last) || nowMs - last < staleMs)
            return item;
        const updated = {
            ...item,
            status: "pending",
            owner: "",
            attempt: Number(item.attempt || 1) + 1,
            updatedAt: now,
            requeueReason: compactText(options.reason || "子 Agent 长时间无进展，主 Agent 可重新分配", 200),
        };
        requeued.push(updated);
        return updated;
    });
    return { items: next, requeued };
}
function buildMainAgentWorkItemSummary(items) {
    const counts = items.reduce((acc, item) => {
        acc[item.status] = Number(acc[item.status] || 0) + 1;
        return acc;
    }, {});
    const nextClaimable = items.filter(item => item.status === "pending" && !item.blockedBy.some(ref => {
        const dep = findWorkItemByRef(items, ref);
        return dep && dep.status !== "completed";
    }));
    const verificationReminder = buildWorkItemVerificationReminder(items);
    return {
        total: items.length,
        counts,
        active: items.filter(item => item.status === "in_progress").map(item => item.owner || item.target).filter(Boolean),
        blocked: items.filter(item => item.status === "blocked").map(item => ({ id: item.id, target: item.target, blockers: item.blockers })),
        next_claimable: nextClaimable.map(item => ({ id: item.id, target: item.target, subject: item.subject })),
        verification_nudge: Boolean(verificationReminder),
        verification_reminder: verificationReminder,
        all_completed: items.length > 0 && items.every(item => item.status === "completed"),
    };
}
function runMainAgentWorkItemSelfTest() {
    const task = {
        id: "task-work-items",
        group_id: "group-1",
        title: "跨端筛选改造",
        delivery_summary: {
            assignment_evidence: [
                { project: "api", task: "提供 owner 筛选接口" },
                { project: "web", task: "接入 owner 筛选 UI", dependsOn: "api" },
            ],
            receipts: [
                { agent: "api", status: "done", summary: "接口完成", filesChanged: ["backend/api.ts"], verification: ["npm test"] },
            ],
        },
    };
    const items = buildMainAgentWorkItems(task, { now: "2026-07-07T00:00:00.000Z" });
    const blockedBefore = buildMainAgentWorkItems({
        ...task,
        delivery_summary: { ...task.delivery_summary, receipts: [] },
    }, { now: "2026-07-07T00:00:00.000Z" });
    const web = items.find(item => item.target === "web");
    const claimWeb = claimMainAgentWorkItem(items, web?.id || "web", "web", { checkOwnerBusy: true, now: "2026-07-07T00:01:00.000Z" });
    const busyClaim = claimMainAgentWorkItem(claimWeb.items, claimWeb.items.find(item => item.target === "api")?.id || "api", "web", { checkOwnerBusy: true });
    const stale = requeueStaleMainAgentWorkItems(claimWeb.items, { nowMs: Date.parse("2026-07-07T01:00:00.000Z"), staleMs: 1000, reason: "selftest stale" });
    const summary = buildMainAgentWorkItemSummary(items);
    const missingVerificationSummary = buildMainAgentWorkItemSummary([
        normalizeWorkItem({ id: "wi-1", subject: "实现接口", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 1, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
        normalizeWorkItem({ id: "wi-2", subject: "接入页面", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 2, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
        normalizeWorkItem({ id: "wi-3", subject: "整理说明", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 3, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    ]);
    const verifiedSummary = buildMainAgentWorkItemSummary([
        normalizeWorkItem({ id: "wi-1", subject: "实现接口", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 1, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
        normalizeWorkItem({ id: "wi-2", subject: "接入页面", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 2, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
        normalizeWorkItem({ id: "wi-3", subject: "运行验证", status: "completed", verification: ["npm test passed"] }, { taskId: "task-work-items", scopeId: "group-1", index: 3, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    ]);
    const checks = {
        derivesAssignments: items.length === 2,
        receiptCompletesDependency: items.find(item => item.target === "api")?.status === "completed",
        blocksBeforeDependencyDone: blockedBefore.find(item => item.target === "web")?.status === "blocked",
        claimAfterDependencyDone: claimWeb.ok && claimWeb.item?.status === "in_progress",
        ownerBusyGuard: busyClaim.reason === "already_resolved" || busyClaim.reason === "agent_busy",
        staleRequeues: stale.requeued.length === 1 && stale.requeued[0].status === "pending",
        summaryCounts: summary.total === 2 && summary.counts.completed === 1,
        workItemVerificationReminderWhenAllDoneWithoutVerification: missingVerificationSummary.verification_reminder?.schema === "ccm-main-agent-work-item-verification-reminder-v1",
        workItemVerificationReminderSkippedWhenVerificationExists: verifiedSummary.verification_reminder === null && verifiedSummary.verification_nudge === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, items, blockedBefore, claimWeb: { ok: claimWeb.ok, reason: claimWeb.reason }, stale: stale.requeued };
}
//# sourceMappingURL=work-items.js.map