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
exports.buildTaskPlanDetail = buildTaskPlanDetail;
exports.buildTaskPlanPatch = buildTaskPlanPatch;
exports.runTaskPlanDetailSelfTest = runTaskPlanDetailSelfTest;
const crypto = __importStar(require("crypto"));
const text = (value, max = 320) => {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
};
const list = (value, max = 80) => (Array.isArray(value) ? value : value ? [value] : [])
    .map(item => text(item, 400))
    .filter(Boolean)
    .slice(0, max);
const firstArray = (...values) => values.find(value => Array.isArray(value) && value.length) || [];
function planModeOf(task) {
    return task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || {};
}
function taskScope(task) {
    return task?.group_id || task?.assign_type === "group" || task?.orchestration_scope === "group_session" ? "group" : "project";
}
function normalizedStatus(value) {
    const status = String(value || "pending").toLowerCase();
    if (["done", "success", "succeeded", "accepted", "completed"].includes(status))
        return "completed";
    if (["running", "in_progress", "executing", "active"].includes(status))
        return "running";
    if (["reviewing", "awaiting_review", "verification"].includes(status))
        return "reviewing";
    if (["rework", "reworking", "revision"].includes(status))
        return "rework";
    if (["waiting_dependency", "dependency_wait", "waiting_for_dependency"].includes(status))
        return "waiting_dependency";
    if (["waiting_permission", "permission_required", "needs_confirmation"].includes(status))
        return "waiting_permission";
    if (["failed", "blocked", "rejected"].includes(status))
        return "blocked";
    if (["cancelled", "canceled", "skipped"].includes(status))
        return "skipped";
    return "pending";
}
function planStatus(task) {
    const runtime = String(task?.phase || task?.runtime_status?.phase || task?.status || "").toLowerCase();
    if (task?.intake_state === "awaiting_confirmation" || task?.status === "paused")
        return "awaiting_confirmation";
    if (["done", "completed", "succeeded"].includes(runtime) && task?.acceptance_state === "accepted")
        return "completed";
    if (["reviewing", "accepting", "verifying"].includes(runtime))
        return "reviewing";
    if (["failed", "blocked", "recovery_required", "needs_user"].includes(runtime))
        return "blocked";
    if (["pending", "ready", "created"].includes(runtime))
        return "ready";
    return "executing";
}
function rawWorkItems(task) {
    const planMode = planModeOf(task);
    const architecture = planMode?.architecture_plan || task?.architecture_plan || {};
    return firstArray(task?.work_items, task?.workflow_meta?.project_main_plan?.workItems, architecture?.dependencySteps, architecture?.dependency_steps, planMode?.steps);
}
function workItems(task) {
    const scope = taskScope(task);
    const defaultProject = text(task?.target_project || task?.project || "", 120);
    return rawWorkItems(task).slice(0, 80).map((item, index) => {
        const id = text(item?.id || item?.work_item_id || item?.workItemId || `work_${index + 1}`, 100);
        const status = normalizedStatus(item?.status);
        const project = text(item?.project || item?.target_project || item?.targetProject || defaultProject, 120);
        const waitingReason = text(item?.waiting_reason || item?.waitingReason || item?.blocked_reason || item?.blockedReason || "", 220);
        return {
            id,
            planStepId: text(item?.plan_step_id || item?.planStepId || id, 100),
            title: text(item?.title || item?.label || item?.content || `执行步骤 ${index + 1}`, 180),
            objective: text(item?.objective || item?.description || item?.detail || item?.content || item?.title || "", 520),
            project,
            status,
            dependsOn: list(item?.dependsOn || item?.depends_on, 24),
            acceptanceCriteria: list(item?.acceptanceCriteria || item?.acceptance_criteria || item?.acceptance || item?.outcome, 16),
            waitingReason,
            assignedAgentLabel: text(item?.assigned_agent_label || item?.assignedAgentLabel || item?.agent || (scope === "group" ? project : "项目子 Agent"), 120),
            editable: !["completed", "running", "reviewing"].includes(status),
        };
    }).filter((item) => item.id && item.title);
}
function assignments(task, items) {
    const rows = firstArray(task?.assignments, task?.plan_assignments, task?.workflow_meta?.assignments, task?.workflow_meta?.plan_assignments);
    if (rows.length)
        return rows.slice(0, 40).map((item, index) => {
            const project = text(item?.project || item?.target_project || item?.targetProject || item?.member?.project, 120);
            return {
                id: text(item?.id || `assignment_${index + 1}`, 100),
                project,
                label: text(item?.label || item?.title || item?.reason || `${project || "项目"}工作项`, 180),
                status: normalizedStatus(item?.status),
                workItemIds: list(item?.workItemIds || item?.work_item_ids || item?.work_items, 40),
                waitingReason: text(item?.waitingReason || item?.waiting_reason || item?.blockedReason || "", 220),
            };
        }).filter((item) => item.project || item.label);
    const grouped = new Map();
    for (const item of items) {
        const project = item.project || text(task?.target_project || "当前项目", 120);
        const current = grouped.get(project) || { id: `assignment_${grouped.size + 1}`, project, label: project, status: "pending", workItemIds: [], waitingReason: "" };
        current.workItemIds.push(item.id);
        if (["running", "reviewing", "rework", "blocked"].includes(item.status))
            current.status = item.status;
        else if (item.status === "completed" && current.status === "pending")
            current.status = "completed";
        if (!current.waitingReason && item.waitingReason)
            current.waitingReason = item.waitingReason;
        grouped.set(project, current);
    }
    return [...grouped.values()];
}
function sourceReferences(task) {
    const projectEvidence = task?.workflow_meta?.project_main_plan?.sourceEvidence || task?.source_evidence || {};
    const planning = task?.planning_source_evidence || task?.workflow_meta?.planning_source_evidence || {};
    const rows = [];
    if (projectEvidence && (projectEvidence.selectedPaths || projectEvidence.selected_paths))
        rows.push({
            project: text(task?.target_project || task?.project || "当前项目", 120),
            paths: list(projectEvidence.selectedPaths || projectEvidence.selected_paths, 24),
            checksum: text(projectEvidence.checksum || projectEvidence.sourceSnapshotChecksum || "", 160),
        });
    const projects = Array.isArray(planning?.projects) ? planning.projects : Array.isArray(planning) ? planning : [];
    for (const item of projects.slice(0, 20))
        rows.push({
            project: text(item?.project || item?.name, 120),
            paths: list(item?.selected_paths || item?.selectedPaths || item?.paths, 24),
            checksum: text(item?.checksum || item?.source_snapshot_checksum || "", 160),
        });
    return rows.filter(row => row.project && row.paths.length);
}
function revisionHistory(task, planMode) {
    return firstArray(task?.plan_revisions, planMode?.plan_revisions, planMode?.revisions).slice(-30).map((item, index) => ({
        revision: Math.max(1, Number(item?.revision || item?.count || index + 1)),
        summary: text(item?.summary || item?.feedback || item?.reason || "计划已调整", 320),
        createdAt: String(item?.created_at || item?.createdAt || item?.at || item?.completed_at || ""),
    }));
}
function buildTaskPlanDetail(task) {
    const planMode = planModeOf(task);
    const items = workItems(task);
    const scope = taskScope(task);
    const detail = {
        schema: "ccm-task-plan-detail-v1",
        taskId: String(task?.id || ""),
        scope,
        scopeId: text(scope === "group" ? task?.group_id : task?.target_project, 160),
        generation: Math.max(0, Number(task?.generation || task?.workflow_generation || 0)),
        revision: Math.max(1, Number(task?.user_visible_plan_revision || task?.plan_detail_revision || task?.plan_revision_count || planMode?.revision_count || 1)),
        title: text(task?.title || planMode?.title || "需求实施计划", 180),
        goal: text(task?.business_goal || task?.description || planMode?.architecture_plan?.goal || planMode?.goal || "", 900),
        summary: text(task?.description || planMode?.risk?.summary || task?.status_detail || "", 520),
        status: planStatus(task),
        workItems: items,
        assignments: assignments(task, items),
        acceptanceCriteria: list(task?.acceptance_evidence_plan?.map?.((item) => item?.criterion || item?.observableOutcome) || task?.acceptance_criteria || planMode?.acceptance, 30),
        permissionBoundaries: list(planMode?.permission_boundaries || task?.workflow_meta?.project_main_plan?.permissionBoundaries, 24),
        risks: list(task?.risks || planMode?.risk?.reasons || planMode?.risk?.summary, 20),
        sourceReferences: sourceReferences(task),
        revisionHistory: revisionHistory(task, planMode),
        contentStored: false,
    };
    detail.bindingChecksum = crypto.createHash("sha256").update(JSON.stringify({
        taskId: detail.taskId,
        generation: detail.generation,
        revision: detail.revision,
        workItems: detail.workItems.map((item) => ({ id: item.id, status: item.status, project: item.project, dependsOn: item.dependsOn })),
    })).digest("hex");
    return detail;
}
function assertAcyclic(items) {
    const map = new Map(items.map(item => [item.id, item]));
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id))
            throw new Error("执行清单存在循环依赖，请调整依赖关系");
        if (visited.has(id))
            return;
        visiting.add(id);
        for (const dependency of map.get(id)?.dependsOn || [])
            if (map.has(dependency))
                visit(dependency);
        visiting.delete(id);
        visited.add(id);
    };
    for (const item of items)
        visit(item.id);
}
function buildTaskPlanPatch(task, payload) {
    const current = buildTaskPlanDetail(task);
    if (Number(payload?.revision) !== current.revision
        || Number(payload?.generation) !== current.generation
        || String(payload?.bindingChecksum || "") !== current.bindingChecksum) {
        const error = new Error("计划已经更新，请刷新后重新调整");
        error.code = "TASK_PLAN_REVISION_CONFLICT";
        error.status = 409;
        error.current = current;
        throw error;
    }
    if (current.status === "completed")
        throw new Error("已完成计划不能再修改");
    const incoming = Array.isArray(payload?.workItems) ? payload.workItems : [];
    if (!incoming.length)
        throw new Error("执行清单至少需要保留一项");
    const existing = new Map(current.workItems.map((item) => [item.id, item]));
    const ids = new Set();
    const nextItems = incoming.slice(0, 80).map((item, index) => {
        const id = text(item?.id || `work_${index + 1}`, 100);
        if (!id || ids.has(id))
            throw new Error("执行清单包含重复或无效的工作项 ID");
        ids.add(id);
        const previous = existing.get(id);
        if (previous && ["completed", "running", "reviewing"].includes(previous.status)) {
            const unchanged = text(item?.title, 180) === previous.title
                && text(item?.objective, 520) === previous.objective
                && JSON.stringify(list(item?.dependsOn, 24)) === JSON.stringify(previous.dependsOn);
            if (!unchanged)
                throw new Error(`“${previous.title}”已经执行，不能直接修改`);
        }
        return {
            ...(task?.work_items || []).find((raw) => String(raw?.id || "") === id),
            id,
            title: text(item?.title || `执行步骤 ${index + 1}`, 180),
            objective: text(item?.objective || item?.description || item?.title, 520),
            project: text(item?.project || previous?.project || task?.target_project || "", 120),
            status: previous?.status || "pending",
            dependsOn: list(item?.dependsOn, 24).filter(value => value !== id),
            acceptanceCriteria: list(item?.acceptanceCriteria, 16),
            planStepId: text(item?.planStepId || previous?.planStepId || id, 100),
        };
    });
    for (const previous of current.workItems) {
        if (["completed", "running", "reviewing"].includes(previous.status) && !ids.has(previous.id)) {
            throw new Error(`“${previous.title}”已经执行，不能删除`);
        }
    }
    for (const item of nextItems) {
        const missing = item.dependsOn.filter((id) => !ids.has(id));
        if (missing.length)
            throw new Error(`“${item.title}”引用了不存在的前置工作项`);
    }
    assertAcyclic(nextItems);
    const now = new Date().toISOString();
    const revision = current.revision + 1;
    const feedback = text(payload?.summary || payload?.feedback || "用户结构化调整了详细计划", 320);
    const previousPlanMode = planModeOf(task);
    const nextPlanMode = {
        ...previousPlanMode,
        title: text(payload?.title || current.title, 180),
        architecture_plan: { ...(previousPlanMode?.architecture_plan || {}), goal: text(payload?.goal || current.goal, 900) },
        steps: nextItems.map(item => ({
            id: item.id,
            label: item.title,
            content: item.objective,
            project: item.project,
            dependsOn: item.dependsOn,
            acceptance: item.acceptanceCriteria,
            status: item.status,
            source: "user_structured_edit",
        })),
        acceptance: list(payload?.acceptanceCriteria || current.acceptanceCriteria, 30),
        permission_boundaries: list(payload?.permissionBoundaries || current.permissionBoundaries, 24),
        revision_count: revision,
        last_revision_feedback: feedback,
        revised_at: now,
    };
    const revisionRow = { revision, feedback, summary: feedback, created_at: now, source: "structured_plan_editor" };
    return {
        revision,
        updates: {
            title: nextPlanMode.title,
            business_goal: nextPlanMode.architecture_plan.goal,
            work_items: nextItems,
            acceptance_criteria: nextPlanMode.acceptance.join("\n"),
            plan_detail_revision: revision,
            user_visible_plan_revision: revision,
            plan_revision_count: revision,
            plan_revisions: [...(Array.isArray(task?.plan_revisions) ? task.plan_revisions : []), revisionRow].slice(-50),
            status_detail: current.status === "executing" ? "后续执行清单已更新，将按新的依赖继续" : "执行计划已调整，等待确认或分派",
            intake_draft: nextPlanMode,
            workflow_meta: {
                ...(task?.workflow_meta || {}),
                plan_mode: nextPlanMode,
                intake: { ...(task?.workflow_meta?.intake || {}), plan_mode: nextPlanMode },
                project_main_plan: task?.workflow_meta?.project_main_plan ? {
                    ...task.workflow_meta.project_main_plan,
                    title: nextPlanMode.title,
                    summary: nextPlanMode.architecture_plan.goal,
                    workItems: nextItems,
                    acceptanceCriteria: nextPlanMode.acceptance,
                } : task?.workflow_meta?.project_main_plan,
            },
        },
    };
}
function runTaskPlanDetailSelfTest() {
    const task = {
        id: "task-plan-detail-fixture",
        assign_type: "group",
        group_id: "group-a",
        title: "退款审核",
        business_goal: "完成后端、商家端和 Pad 的退款审核闭环",
        status: "in_progress",
        generation: 2,
        user_visible_plan_revision: 3,
        work_items: [
            { id: "contract", title: "确定接口契约", objective: "固定字段", project: "cloud", status: "completed", dependsOn: [], acceptanceCriteria: ["契约明确"] },
            { id: "ui", title: "接入审核页面", objective: "实现页面", project: "ui", status: "pending", dependsOn: ["contract"], acceptanceCriteria: ["页面可用"] },
            { id: "pad", title: "展示退款状态", objective: "只读展示", project: "pad", status: "pending", dependsOn: ["contract"], acceptanceCriteria: ["无审核入口"] },
        ],
        acceptance_evidence_plan: [{ criterion: "三端字段一致" }],
        workflow_meta: { plan_mode: { permission_boundaries: ["生产发布需确认"] } },
    };
    const detail = buildTaskPlanDetail(task);
    const patch = buildTaskPlanPatch(task, {
        revision: detail.revision,
        generation: detail.generation,
        bindingChecksum: detail.bindingChecksum,
        title: detail.title,
        goal: detail.goal,
        acceptanceCriteria: detail.acceptanceCriteria,
        permissionBoundaries: detail.permissionBoundaries,
        workItems: detail.workItems.map((item) => item.id === "ui" ? { ...item, title: "接入商家端审核页面" } : item),
    });
    let conflictBlocked = false;
    try {
        buildTaskPlanPatch(task, { revision: 1, generation: 2, bindingChecksum: "stale", workItems: detail.workItems });
    }
    catch (error) {
        conflictBlocked = error?.code === "TASK_PLAN_REVISION_CONFLICT";
    }
    let cycleBlocked = false;
    try {
        buildTaskPlanPatch(task, {
            revision: detail.revision, generation: detail.generation, bindingChecksum: detail.bindingChecksum,
            workItems: detail.workItems.map((item) => item.id === "ui" ? { ...item, dependsOn: ["pad"] } : item.id === "pad" ? { ...item, dependsOn: ["ui"] } : item),
        });
    }
    catch (error) {
        cycleBlocked = /循环依赖/.test(String(error?.message || ""));
    }
    return {
        success: detail.schema === "ccm-task-plan-detail-v1"
            && detail.scope === "group"
            && detail.workItems.length === 3
            && detail.assignments.length === 3
            && patch.revision === 4
            && patch.updates.work_items[1].title === "接入商家端审核页面"
            && conflictBlocked
            && cycleBlocked,
        checks: {
            safeProjection: detail.contentStored === false && !!detail.bindingChecksum,
            projectAssignments: detail.assignments.length === 3,
            structuredRevision: patch.revision === 4,
            immutableCompletedItem: patch.updates.work_items[0].status === "completed",
            staleRevisionBlocked: conflictBlocked,
            dependencyCycleBlocked: cycleBlocked,
        },
    };
}
//# sourceMappingURL=task-plan-detail.js.map