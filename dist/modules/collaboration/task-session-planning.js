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
exports.reconcilePlanningOperation = reconcilePlanningOperation;
exports.taskPlanningTargetContext = taskPlanningTargetContext;
exports.mergePlanningQuestions = mergePlanningQuestions;
exports.resolvePlanningTarget = resolvePlanningTarget;
exports.assertPlanningState = assertPlanningState;
exports.assertPlanningVersion = assertPlanningVersion;
exports.updatePlanningTask = updatePlanningTask;
exports.prepareTaskPlanConfirmation = prepareTaskPlanConfirmation;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const source_evidence_v2_1 = require("../requirements/source-evidence-v2");
const source_ingestion_1 = require("../requirements/source-ingestion");
const task_workflow_model_1 = require("./task-workflow-model");
const task_session_store_1 = require("./task-session-store");
const task_run_store_1 = require("./task-run-store");
const inflight = new Map();
const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
function conflict(code, message) {
    return Object.assign(new Error(message), { code, status: 409 });
}
/**
 * A planning operation is only live inside the current server process. If the
 * process was restarted while the operation was marked running, release the
 * stale marker so the user can retry instead of being blocked forever.
 */
function reconcilePlanningOperation(task) {
    const operation = task?.planning_operation;
    if (operation?.status !== "running")
        return task;
    if (Number(operation.owner_pid || 0) === process.pid)
        return task;
    return (0, db_1.updateTaskById)(String(task.id), row => row?.planning_operation?.status === "running"
        ? { ...row, planning_operation: { ...row.planning_operation, status: "failed", recovered_at: new Date().toISOString(), recovery_reason: "server_restart" } }
        : row) || task;
}
/** Selected targets are facts supplied to the model, never keyword routing rules. */
function taskPlanningTargetContext(payload, groups, configs) {
    const groupId = String(payload.group_id || payload.groupId || "").trim();
    const projectId = String(payload.target_project || payload.targetProject || "").trim();
    const group = groupId ? groups.find(item => item.id === groupId) : null;
    if (groupId && !group)
        throw conflict("TASK_TARGET_NOT_FOUND", "选择的群聊不存在");
    const projects = group
        ? [...new Set((group.members || []).map((item) => String(item.project || "")).filter(Boolean))]
        : [];
    const targetProject = projectId || (projects.length === 1 ? projects[0] : "");
    const project = targetProject ? configs.find(item => item.name === targetProject) : null;
    if (targetProject && !project)
        throw conflict("TASK_TARGET_NOT_FOUND", "选择的项目不存在");
    if (!group && !project)
        throw conflict("TASK_TARGET_REQUIRED", "请先选择目标项目或群聊");
    if (group && project && !projects.includes(project.name))
        throw conflict("TASK_TARGET_MISMATCH", "项目不属于选择的群聊");
    const context = {
        target_determined: !!project,
        project_id: project?.name || "",
        project_path: project?.workDir || project?.work_dir
            || (project?.path ? (0, db_1.getConfigInfo)(project.path).find((row) => row.name === project.name)?.workDir : "") || "",
        group_id: group?.id || "",
        group_name: group?.name || "",
        candidate_projects: projects,
    };
    return {
        group, targetProject,
        context,
        userText: `目标上下文（已由用户选择，请沿用，不要重新询问已确定的项目名称、路径或归属；业务信息不足仍须澄清。多项目群聊未选项目时，先确定执行目标）：\n${JSON.stringify(context)}`,
        availableTargets: project
            ? [{ type: "project", id: project.name, name: project.name }]
            : projects.map(id => ({ type: "project", id, name: id })),
    };
}
function mergePlanningQuestions(...lists) {
    const seen = new Set();
    return lists.flat().filter(question => {
        const key = String(typeof question === "string" ? question : question?.question || question?.text || question?.id || "").trim();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function resolvePlanningTarget(context, plan) {
    const candidates = context?.candidate_projects || [];
    const selected = context?.project_id || "";
    const targets = [...new Set((plan?.items || []).map((item) => item.target_type === "project" ? String(item.target_id || "") : selected).filter(Boolean))];
    if (targets.some(id => selected ? id !== selected : !candidates.includes(id))) {
        throw conflict("TASK_PLAN_TARGET_MISMATCH", "计划执行目标不属于用户选择的项目或群聊");
    }
    return { targetProject: selected || (targets.length === 1 ? targets[0] : ""), targets };
}
function assertPlanningState(task) {
    if (task?.intake_state !== "awaiting_confirmation" || task?.auto_execute !== false
        || !["pending", "planning", "blocked"].includes(String(task?.status || ""))) {
        throw conflict("TASK_PLAN_NOT_EDITABLE", "任务已开始或结束，不能修改执行前计划；请提交新的继续执行请求");
    }
}
function assertPlanningVersion(task, input) {
    if (Number(input?.plan_revision) !== Number(task?.plan_revision_count || task?.task_spec?.plan_revision || 1)
        || String(input?.spec_checksum || "") !== String(task?.task_spec?.checksum || "")) {
        throw conflict("TASK_PLAN_VERSION_CHANGED", "计划已更新，请刷新后确认最新计划");
    }
}
async function modelReplan(task, draft) {
    const selected = task?.planning_target_context || {
        project_id: task.target_project || "",
        group_id: task.group_id || "",
        target_determined: !!task.target_project,
    };
    const attachments = task.source_attachments || task.attachments || [];
    const result = await (0, source_ingestion_1.ingestRequirementSources)({
        userText: `请重新规划这个任务。目标上下文是已确认的事实，不要重新询问已知项目身份。依据补充回答和计划反馈重新判断尚缺的业务信息，不得仅删除问题。\n${JSON.stringify({
            original_request: task.user_message || task.description || task.title,
            target_context: selected,
            current_plan: draft,
        })}`,
        files: attachments.filter((item) => item.savedPath || item.path),
        urls: attachments.map((item) => item.url).filter(Boolean),
        extractRequirement: true,
        decomposeRequirement: true,
        availableTargets: selected.project_id ? [{ type: "project", id: selected.project_id }]
            : (selected.candidate_projects || []).map((id) => ({ type: "project", id })),
    });
    if (!result.requirement || !result.decomposition || result.coverage_receipt?.complete === false) {
        throw conflict("TASK_PLAN_MODEL_REQUIRED", result.warnings?.[0] || "规划模型未生成可靠计划，原计划已保留");
    }
    return { requirement: result.requirement, plan: result.decomposition, source_ingestion: result.technical };
}
/** A persisted receipt prevents retries and competing tabs from applying feedback twice. */
async function updatePlanningTask(taskInput, input, deps = {}) {
    const taskId = String(taskInput.id);
    const kind = String(input?.message_type || input?.type || "");
    if (!["clarification_answer", "plan_feedback"].includes(kind))
        return { task: taskInput, changed: false };
    const key = String(input.message_id || input.idempotency_key || "").trim();
    if (!key)
        throw conflict("TASK_PLAN_IDEMPOTENCY_REQUIRED", "计划更新必须提供消息身份");
    if (!String(input.content || "").trim())
        throw conflict("TASK_PLAN_CONTENT_REQUIRED", "补充信息不能为空");
    const fingerprint = digest({ kind, content: input.content, question_id: input.question_id });
    const flightKey = `${taskId}:${key}`;
    const persisted = reconcilePlanningOperation((0, db_1.getTaskById)(taskId) || taskInput);
    const receipt = persisted.planning_receipts?.[key];
    if (receipt) {
        if (receipt.fingerprint !== fingerprint)
            throw conflict("TASK_PLAN_IDEMPOTENCY_CONFLICT", "同一消息身份不能提交不同内容");
        return { task: persisted, changed: false, replayed: true };
    }
    if (inflight.has(flightKey)) {
        if (persisted.planning_operation?.fingerprint !== fingerprint)
            throw conflict("TASK_PLAN_IDEMPOTENCY_CONFLICT", "消息内容已变化");
        return inflight.get(flightKey);
    }
    assertPlanningState(persisted);
    assertPlanningVersion(persisted, input);
    if (persisted.planning_operation?.status === "running")
        throw conflict("TASK_PLAN_UPDATE_IN_PROGRESS", "计划正在更新，请等待或在恢复后重新提交");
    const operation = (async () => {
        const draft = structuredClone(persisted.intake_draft || {});
        if (kind === "clarification_answer") {
            const questions = draft.clarification_questions || [];
            const index = questions.findIndex((question, index) => String(question?.id || question?.question_id || `question-${index}`) === String(input.question_id));
            if (index < 0)
                throw conflict("TASK_CLARIFICATION_NOT_FOUND", "澄清问题已变化，请刷新后回答");
            draft.clarification_answers = [...(draft.clarification_answers || []), { question_id: input.question_id, question: questions[index], answer: String(input.content || "").trim() }];
        }
        else {
            draft.plan_feedback = String(input.content || "").trim();
            draft.plan_feedback_history = [...(draft.plan_feedback_history || []), draft.plan_feedback];
        }
        (0, db_1.updateTaskById)(taskId, (row) => ({ ...row, planning_operation: { key, fingerprint, status: "running", owner_pid: process.pid, at: new Date().toISOString() } }));
        try {
            const generated = await (deps.replan || modelReplan)(persisted, draft);
            if (!generated?.requirement || !generated?.plan)
                throw conflict("TASK_PLAN_MODEL_REQUIRED", "没有收到完整的新计划");
            const current = (0, db_1.getTaskById)(taskId);
            assertPlanningState(current);
            assertPlanningVersion(current, input);
            const revision = Number(current.task_spec?.revision || 1) + 1;
            const planRevision = Number(current.plan_revision_count || 1) + 1;
            const requirement = generated.requirement;
            const target = resolvePlanningTarget(current.planning_target_context || {
                project_id: current.target_project, candidate_projects: [],
            }, generated.plan);
            const updatedDraft = {
                ...draft, ...(0, source_ingestion_1.requirementToIntakeDraft)(requirement, draft),
                project: target.targetProject,
                decomposition_plan: generated.plan,
                clarification_questions: mergePlanningQuestions(requirement.clarification_questions || [], generated.plan.clarification_questions || [], !target.targetProject && target.targets.length === 0 ? ["请选择本次任务要执行的项目"] : []),
            };
            const updated = (0, db_1.updateTaskById)(taskId, (row) => {
                assertPlanningState(row);
                assertPlanningVersion(row, input);
                const next = {
                    ...row, intake_draft: updatedDraft,
                    target_project: target.targetProject,
                    ...(generated.source_ingestion ? { source_ingestion: generated.source_ingestion } : {}),
                    business_goal: requirement.business_goal,
                    scope: (requirement.scope || []).join("；"),
                    acceptance_criteria: (requirement.acceptance_criteria || []).join("；"),
                    requirement_extraction: requirement, decomposition_plan: generated.plan,
                    requirement_decomposition: generated.plan,
                    task_spec_revision: revision, plan_revision_count: planRevision,
                    plan_history: [...(row.plan_history || []), {
                            revision: row.plan_revision_count || 1,
                            task_spec: structuredClone(row.task_spec), intake_draft: structuredClone(row.intake_draft),
                            plan: structuredClone(row.decomposition_plan || row.intake_draft?.decomposition_plan || {}),
                            feedback_message_id: key, at: new Date().toISOString(),
                        }],
                    planning_receipts: { ...(row.planning_receipts || {}), [key]: { fingerprint, plan_revision: planRevision } },
                    planning_operation: null,
                    status_detail: updatedDraft.clarification_questions.length ? "计划已更新，等待补充信息" : "计划已更新，等待确认执行",
                };
                return { ...next, task_spec: (0, task_workflow_model_1.buildTaskSpecV1)(next) };
            });
            (0, task_session_store_1.materializeTaskSession)(updated);
            return { task: updated, changed: true };
        }
        catch (error) {
            (0, db_1.updateTaskById)(taskId, (row) => row.planning_operation?.key === key
                ? { ...row, planning_operation: { ...row.planning_operation, status: "failed" } } : row);
            throw error;
        }
    })();
    inflight.set(flightKey, operation);
    try {
        return await operation;
    }
    finally {
        inflight.delete(flightKey);
    }
}
/** Only a never-started run can acquire the newly confirmed specification. */
function prepareTaskPlanConfirmation(task, payload) {
    assertPlanningState(task);
    assertPlanningVersion(task, payload);
    if (task.planning_operation?.status === "running")
        throw conflict("TASK_PLAN_UPDATE_IN_PROGRESS", "计划正在更新");
    const questions = task.intake_draft?.clarification_questions || [];
    if (questions.length)
        throw conflict("TASK_CLARIFICATION_REQUIRED", "请先回答澄清问题");
    const sources = task.source_ingestion || {};
    (0, source_evidence_v2_1.assertRequirementPlanEvidence)(task.decomposition_plan || task.requirement_decomposition || {}, sources.manifest || [], sources.coverage_receipt || { complete: !(sources.blocking_sources || []).length });
    const runId = String(payload.run_id || "");
    const guard = (0, task_run_store_1.validateActiveTaskRun)(task, runId);
    if (!guard.ok)
        throw conflict(guard.code, guard.error);
    const run = (0, task_run_store_1.getTaskRun)(runId);
    if (!run || !["blocked", "queued"].includes(run.status) || run.lease || run.execution_evidence.length
        || run.history.some(item => ["running", "verifying", "completed", "failed", "cancelled"].includes(item.status))) {
        throw conflict("TASK_RUN_ALREADY_STARTED", "当前运行已执行，不能重新绑定计划");
    }
    if (String(payload.attempt_id || "") !== `${run.run_id}:${run.attempt}`)
        throw conflict("TASK_RUN_ATTEMPT_MISMATCH", "运行身份已变化，请刷新");
    if (!payload.idempotency_key)
        throw conflict("TASK_PLAN_IDEMPOTENCY_REQUIRED", "确认执行必须提供幂等键");
    return (0, task_run_store_1.patchTaskRun)(runId, { spec_revision: task.task_spec.revision, task_spec_checksum: task.task_spec.checksum }, { expectedRevision: run.spec_revision });
}
//# sourceMappingURL=task-session-planning.js.map