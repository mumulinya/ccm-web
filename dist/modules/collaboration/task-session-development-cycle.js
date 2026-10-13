"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTaskDevelopmentCycleTransition = validateTaskDevelopmentCycleTransition;
exports.taskSessionDevelopmentCycle = taskSessionDevelopmentCycle;
const task_workflow_model_1 = require("./task-workflow-model");
const rework_policy_1 = require("./rework-policy");
const task_session_store_1 = require("./task-session-store");
const agent_run_store_1 = require("../../agents/agent-run-store");
const task_session_boundary_1 = require("./task-session-boundary");
const work_items_1 = require("../../agents/work-items");
const acceptance_contract_1 = require("../../agents/acceptance-contract");
const CYCLE_SOURCES = ["task-session-follow-up", "project-completed-follow-up", "authorized-completed-follow-up"];
function validateTaskDevelopmentCycleTransition(task, updates, source) {
    if (!CYCLE_SOURCES.includes(source))
        return false;
    const session = (0, task_session_store_1.getTaskSession)(task.id);
    const oldRun = task.active_run_id || task.run_id || task.task_run?.run_id;
    const next = updates.task_run;
    const ref = updates.task_session_continuation_context;
    if (!session || !(0, task_session_boundary_1.taskSessionOpeningState)(task).open || ref?.session_id !== session.session_id
        || next?.schema !== "ccm-task-run-v1" || next.task_id !== task.id || next.trace_id !== task.trace_id
        || !next.run_id || next.run_id === oldRun || next.run_id !== updates.active_run_id
        || next.parent_run_id !== oldRun || updates.parent_run_id !== oldRun
        || next.attempt <= Number(task.execution_attempt || task.task_run?.attempt || 1)
        || next.spec_revision !== updates.task_spec?.revision || updates.task_spec?.task_id !== task.id
        || !updates.review_cycle_id || updates.review_cycle_id === task.review_cycle_id
        || updates.plan_revision_required !== true)
        return false;
    if (source === "task-session-follow-up" && session.pending_follow_up?.status !== "awaiting_confirmation")
        return false;
    return !(0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).some(run => ["created", "queued", "leased", "starting", "running", "waiting_input", "waiting_confirmation", "paused", "recovering"].includes(run.status));
}
/** An explicit follow-up starts a new execution; a terminal Run never reopens. */
function taskSessionDevelopmentCycle(task, source, currentlyRunning, proposed = {}) {
    if (!CYCLE_SOURCES.includes(source) || currentlyRunning)
        return {};
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id });
    if (runs.some(run => ["created", "queued", "leased", "starting", "running", "waiting_input", "waiting_confirmation", "paused", "recovering"].includes(run.status))) {
        throw Object.assign(new Error("原任务仍有未结束的运行，请先暂停或结束后再开始新的开发周期"), { code: "TASK_SESSION_ACTIVE_RUN", status: 409 });
    }
    const session = (0, task_session_store_1.getTaskSession)(task.id);
    const revision = Number(task.task_spec?.revision || 1) + 1;
    const generation = Math.max(Number(task.generation || 0), Number((0, acceptance_contract_1.taskAcceptanceContract)(task)?.generation || 0)) + 1;
    const updated = { ...task, ...proposed, task_spec_revision: revision, generation };
    const spec = (0, task_workflow_model_1.buildTaskSpecV1)(updated);
    const next = (0, task_workflow_model_1.buildTaskRunV1)({ ...updated, run_id: "", task_run: null,
        execution_attempt: Math.max(1, Number(task.execution_attempt || task.task_run?.attempt || 1)) + 1 }, spec, "user");
    const parent = task.active_run_id || task.run_id || task.task_run?.run_id || "";
    return { ...(0, rework_policy_1.buildReviewCycleResetUpdate)(task, "用户在任务会话确认再次开发"),
        task_run: { ...next, parent_run_id: parent }, run_id: next.run_id, active_run_id: next.run_id,
        ...(task.workflow_type === "project_main_agent" ? { project_main_run_id: next.run_id } : {}),
        parent_run_id: parent, execution_attempt: next.attempt, attempt_id: `${next.run_id}:${next.attempt}`,
        task_spec: spec, task_spec_revision: revision, plan_revision: revision,
        generation, plan_revision_required: true,
        acceptance_contract: null, plan_dispatch_contract: null, dispatch_preparation_plan: null, dispatch_preparation: null,
        workflow_meta: { ...(proposed.workflow_meta || task.workflow_meta || {}), plan_dispatch_contract: null, sandbox_rehearsal: null },
        sandbox_rehearsal: null, work_item_runtime: null,
        work_items: (0, work_items_1.buildMainAgentWorkItems)({ ...updated, status: "pending", work_items: [], workItems: [],
            delivery_summary: null, receipt: null, sandbox_rehearsal: null,
            workflow_meta: { ...(updated.workflow_meta || {}), sandbox_rehearsal: null } }),
        pending_dispatch_delivery: null, delivery_confirmation: null, user_acceptance: null, acceptance_decision: null,
        terminal_decision: null, terminal_state_receipt: null, final_output_revision: null,
        receipt: null, review: null, test_agent_review: null, delivery_summary: null, main_agent_final_acceptance: null,
        quick_check_receipt: null, main_agent_self_verification: null,
        acceptance_state: "pending", task_session_opened_at: task.task_session_opened_at || new Date().toISOString(),
        task_session_continuation_context: session ? { session_id: session.session_id, revision: session.revision,
            message_ids: session.messages.filter(row => row.role !== "system_context").map(row => row.message_id),
            runtime_bindings: session.runtime_bindings || [] } : null,
        delivery_history: [...(task.delivery_history || []), { run_id: parent, status: task.status,
                acceptance_state: task.acceptance_state, final_report: task.final_report || "", result: task.result || "",
                delivery_summary: task.delivery_summary || null, acceptance_contract: (0, acceptance_contract_1.taskAcceptanceContract)(task),
                plan_dispatch_contract: task.plan_dispatch_contract || task.workflow_meta?.plan_dispatch_contract || null,
                work_items: task.work_items || [], review_cycle_id: task.review_cycle_id,
                task_spec: task.task_spec, at: new Date().toISOString() }],
    };
}
//# sourceMappingURL=task-session-development-cycle.js.map