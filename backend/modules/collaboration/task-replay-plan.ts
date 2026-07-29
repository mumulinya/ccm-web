// 任务回放：计划书与工作单的用户可读视图。
// 只读取任务上已持久化的计划/工作单数据（plan_mode / todo_plan / work_items / assignment_evidence / mission_plan），
// 不参与计划的生成或修改路径（计划改动必须经 main-agent-plan-core）。
import { buildMainAgentWorkItems } from "../../agents/work-items";
import { readTaskPlanMode } from "./main-agent-plan-core";
import { iso, normalizeStatus, safeText, safeTextList, stringList } from "./task-replay-shared";

export interface TaskReplayPlanStep {
  id: string;
  title: string;
  detail: string;
  status: string;
  source: "model" | "user_followup" | "skeleton" | "live";
  added_at: string;
}

export interface TaskReplayPlanView {
  task_id: string;
  source: "plan_mode" | "coordination_plan" | "live_todo";
  title: string;
  status: "awaiting_confirmation" | "in_progress" | "completed";
  confirmed: boolean;
  confirmed_at: string;
  generated_at: string;
  revised_at: string;
  next_step: string;
  step_count: number;
  completed_count: number;
  progress_label: string;
  // 协作计划的 phases 没有逐步状态，只能按任务阶段整体推导；置 true 时前端要如实说明。
  step_status_derived: boolean;
  strategy: string;
  steps: TaskReplayPlanStep[];
  impact_projects: string[];
  impact_areas: string[];
  acceptance: string[];
  revision_count: number;
  revisions: Array<{ count: number; feedback: string; kind: string; at: string }>;
}

export interface TaskReplayWorkItemRow {
  id: string;
  task_id: string;
  subject: string;
  description: string;
  target: string;
  owner: string;
  agent_type: string;
  status: string;
  attempt: number;
  source: string;
  blocked_by: string[];
  files_changed: string[];
  files_changed_count: number;
  verification: string[];
  evidence: string[];
  blockers: string[];
  needs: string[];
  receipt_status: string;
  receipt_summary: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
}

const PLAN_STEP_STATUSES = new Set([
  "pending", "in_progress", "completed", "cancelled", "skipped",
  "needs_confirmation", "reviewing", "reworking", "blocked", "failed",
]);
const STEP_TERMINAL = new Set(["completed", "cancelled", "skipped"]);
const TASK_TERMINAL = new Set(["done", "completed"]);

function planStepStatus(value: any) {
  const text = String(value || "").toLowerCase().trim();
  if (PLAN_STEP_STATUSES.has(text)) return text;
  if (/done|success|passed/.test(text)) return "completed";
  if (/running|progress|active/.test(text)) return "in_progress";
  return "pending";
}

function planStepSource(step: any): TaskReplayPlanStep["source"] {
  const id = String(step?.id || "");
  const source = String(step?.source || "");
  if (source === "user_followup" || /^followup_requirement_\d+$/.test(id)) return "user_followup";
  if (source === "model" || /^model_plan_\d+$/.test(id)) return "model";
  return "skeleton";
}

function planStepRows(steps: any[], source: TaskReplayPlanStep["source"] | "" = "") {
  return steps.map((step: any, index: number): TaskReplayPlanStep => ({
    id: safeText(step?.id, 80) || `step_${index + 1}`,
    title: safeText(step?.label || step?.content || step?.title, 200) || `步骤 ${index + 1}`,
    detail: safeText(step?.detail || (source === "live" ? step?.activeForm : ""), 300),
    status: planStepStatus(step?.status),
    source: source || planStepSource(step),
    added_at: iso(step?.added_at),
  }));
}

function planProgress(steps: TaskReplayPlanStep[]) {
  const completed = steps.filter(step => step.status === "completed").length;
  return { completed, label: `${completed}/${steps.length}` };
}

// 协作计划（delivery_summary.coordination_plans / latest_coordination_plan）是绝大多数群聊任务真正落盘的计划，
// 它的 phases 是纯文字步骤、没有逐步状态，因此状态按任务阶段统一推导，并标记 step_status_derived。
function derivedStepStatus(task: any) {
  const status = String(task?.status || "").toLowerCase();
  if (TASK_TERMINAL.has(status)) return "completed";
  if (["cancelled", "reverted"].includes(status)) return "cancelled";
  if (["in_progress", "running", "executing"].includes(status)) return "in_progress";
  return "pending";
}

function coordinationPlanView(task: any, plan: any, history: any[]): TaskReplayPlanView {
  const stepStatus = derivedStepStatus(task);
  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  const steps: TaskReplayPlanStep[] = phases.map((phase: any, index: number) => {
    const text = safeText(phase, 300);
    const [head, ...rest] = text.split(/[：:]/);
    return {
      id: `coordination_phase_${index + 1}`,
      title: safeText(rest.length ? head : text, 200) || `阶段 ${index + 1}`,
      detail: rest.length ? safeText(rest.join("："), 300) : "",
      status: stepStatus,
      source: "skeleton" as const,
      added_at: "",
    };
  });
  const { completed, label } = planProgress(steps);
  const timestamps = history.map((item: any) => iso(item?.timestamp)).filter(Boolean).sort();
  return {
    task_id: String(task?.id || ""),
    source: "coordination_plan",
    title: "主 Agent 协作计划",
    status: TASK_TERMINAL.has(String(task?.status || "").toLowerCase()) ? "completed" : "in_progress",
    confirmed: true,
    confirmed_at: "",
    generated_at: timestamps[0] || iso(plan.timestamp, iso(task?.created_at)),
    revised_at: history.length > 1 ? (timestamps[timestamps.length - 1] || "") : "",
    next_step: safeTextList(plan.missingInfo, 3, 240).join("；"),
    step_count: steps.length,
    completed_count: completed,
    progress_label: label,
    step_status_derived: true,
    strategy: safeText(plan.strategy || plan.mode, 120),
    steps,
    impact_projects: safeTextList(plan.targets, 12, 100),
    impact_areas: [],
    acceptance: safeTextList(task?.acceptance_criteria, 8, 240),
    revision_count: Math.max(0, history.length - 1),
    revisions: history.slice(1).map((item: any, index: number) => ({
      count: index + 1,
      feedback: safeText(item?.strategy || item?.mode, 240),
      kind: "replan",
      at: iso(item?.timestamp),
    })),
  };
}

function planModeView(task: any, plan: any): TaskReplayPlanView {
  const steps = planStepRows(Array.isArray(plan.steps) ? plan.steps : []);
  const { completed, label } = planProgress(steps);
  const confirmed = String(plan.confirmation_status || "") === "confirmed"
    || !!plan.confirmed_at || !!plan.accepted_at || plan.requires_confirmation === false;
  const allSettled = steps.length > 0 && steps.every(step => STEP_TERMINAL.has(step.status));
  const status: TaskReplayPlanView["status"] = !confirmed
    ? "awaiting_confirmation"
    : TASK_TERMINAL.has(String(task?.status || "").toLowerCase()) || allSettled ? "completed" : "in_progress";
  return {
    task_id: String(task?.id || ""),
    source: "plan_mode",
    title: safeText(plan.title, 120) || "执行前计划",
    status,
    confirmed,
    confirmed_at: iso(plan.confirmed_at || plan.accepted_at),
    generated_at: iso(plan.generated_at, iso(task?.created_at)),
    revised_at: iso(plan.revised_at),
    next_step: safeText(plan.next_step, 240),
    step_count: steps.length,
    completed_count: completed,
    progress_label: label,
    step_status_derived: false,
    strategy: "",
    steps,
    impact_projects: safeTextList(plan.impact_scope?.projects, 12, 100),
    impact_areas: safeTextList(plan.impact_scope?.areas, 8, 120),
    acceptance: safeTextList(plan.acceptance, 8, 240),
    revision_count: Math.max(0, Number(plan.revision_count || 0) || 0),
    revisions: (Array.isArray(plan.plan_revisions) ? plan.plan_revisions : []).map((row: any) => ({
      count: Math.max(0, Number(row?.count || 0) || 0),
      feedback: safeText(row?.feedback, 240),
      kind: safeText(row?.kind, 40),
      at: iso(row?.at),
    })),
  };
}

function liveTodoView(task: any, todo: any): TaskReplayPlanView {
  const steps = planStepRows(Array.isArray(todo.steps) ? todo.steps : [], "live");
  const { completed, label } = planProgress(steps);
  const allSettled = steps.length > 0 && steps.every(step => STEP_TERMINAL.has(step.status));
  return {
    task_id: String(task?.id || ""),
    source: "live_todo",
    title: safeText(todo.title, 120) || "执行计划",
    status: TASK_TERMINAL.has(String(task?.status || "").toLowerCase()) || allSettled ? "completed" : "in_progress",
    confirmed: true,
    confirmed_at: "",
    generated_at: iso(task?.created_at),
    revised_at: "",
    next_step: "",
    step_count: steps.length,
    completed_count: completed,
    progress_label: label,
    step_status_derived: false,
    strategy: "",
    steps,
    impact_projects: [],
    impact_areas: [],
    acceptance: [],
    revision_count: 0,
    revisions: [],
  };
}

// 计划视图按"信息量"降级取源：
// 1) plan_mode 执行前计划书（最完整，带逐步状态与修订史，但只有走计划模式的任务才有）
// 2) coordination_plans 主 Agent 协作计划（绝大多数群聊任务真正落盘的计划）
// 3) 执行期实时计划（不落任务记录，挂在群消息 main_agent_decision.todo_plan，由调用方经 fallbackTodo 传入）
export function buildTaskReplayPlanView(task: any, options: { fallbackTodo?: any } = {}): TaskReplayPlanView | null {
  const planMode = readTaskPlanMode(task);
  if (planMode && Array.isArray(planMode.steps) && planMode.steps.length) return planModeView(task, planMode);
  const summary = task?.delivery_summary || {};
  const history = (Array.isArray(summary.coordination_plans) ? summary.coordination_plans : []).filter((item: any) => item && typeof item === "object");
  const coordination = summary.latest_coordination_plan && typeof summary.latest_coordination_plan === "object"
    ? summary.latest_coordination_plan
    : history[history.length - 1];
  if (coordination && Array.isArray(coordination.phases) && coordination.phases.length) {
    return coordinationPlanView(task, coordination, history.length ? history : [coordination]);
  }
  const todo = task?.todo_plan || task?.todoPlan || summary.todo_plan || summary.todoPlan || options.fallbackTodo;
  if (todo && Array.isArray(todo.steps) && todo.steps.length) return liveTodoView(task, todo);
  return null;
}

// 工作单视图：复用主 Agent 工作项底座（含回执与执行记录合并），再做回放级脱敏。
// now 固定为任务创建时间，保证同一任务状态下重复构建的时间戳稳定，避免增量游标反复重发。
export function buildTaskReplayWorkItemRows(task: any, executions: any[] = []): TaskReplayWorkItemRow[] {
  let items: any[] = [];
  try {
    items = buildMainAgentWorkItems(task, { executions, now: iso(task?.created_at) || undefined });
  } catch {
    return [];
  }
  return items.slice(0, 60).map((item: any): TaskReplayWorkItemRow => {
    const receipt = item.lastReceipt && typeof item.lastReceipt === "object" ? item.lastReceipt : null;
    const filesChanged = stringList(item.filesChanged, 30);
    return {
      id: safeText(item.id, 100),
      task_id: String(item.taskId || task?.id || ""),
      subject: safeText(item.subject, 200) || "处理子任务",
      description: safeText(item.description, 400),
      target: safeText(item.target || item.owner, 100),
      owner: safeText(item.owner || item.target, 100),
      agent_type: safeText(item.agentType, 80),
      status: String(item.status || "pending"),
      attempt: Math.max(1, Number(item.attempt || 1) || 1),
      source: safeText(item.source, 80),
      blocked_by: safeTextList(item.blockedBy, 12, 100),
      files_changed: filesChanged,
      files_changed_count: filesChanged.length,
      verification: safeTextList(item.verification, 12, 240),
      evidence: safeTextList(item.evidence, 8, 240),
      blockers: safeTextList(item.blockers, 8, 240),
      needs: safeTextList(item.needs, 8, 240),
      receipt_status: receipt ? normalizeStatus(receipt.status || receipt.receipt_status) : "",
      receipt_summary: receipt ? safeText(receipt.summary || receipt.message || receipt.result, 400) : "",
      created_at: iso(item.createdAt),
      updated_at: iso(item.updatedAt),
      completed_at: iso(item.completedAt),
    };
  });
}

export function runTaskReplayPlanSelfTest() {
  const planTask = {
    id: "task-plan-1",
    status: "in_progress",
    created_at: "2026-07-20T01:00:00.000Z",
    group_id: "group-1",
    workflow_meta: {
      plan_mode: {
        title: "执行前计划",
        generated_at: "2026-07-20T01:00:05.000Z",
        requires_confirmation: false,
        confirmation_status: "confirmed",
        confirmed_at: "2026-07-20T01:01:00.000Z",
        revision_count: 1,
        plan_revisions: [{ count: 1, feedback: "顺便把注册页也一起改了", at: "2026-07-20T01:00:30.000Z", kind: "supplement", source: "user" }],
        impact_scope: { areas: ["登录会话恢复"], projects: ["web"] },
        acceptance: ["刷新后仍保持登录"],
        steps: [
          { id: "understand_goal", label: "理解需求与验收目标", status: "completed" },
          { id: "model_plan_1", label: "改造登录接口", status: "in_progress", source: "model" },
          { id: "followup_requirement_1", label: "并入追加要求：顺便把注册页也一起改了", status: "pending", source: "user_followup" },
          { id: "verify_and_summarize", label: "验收结果并总结给用户", status: "pending" },
        ],
      },
    },
    work_items: [{
      id: "wi-web",
      subject: "修复登录状态恢复",
      target: "web",
      owner: "web",
      status: "in_progress",
      files: ["C:\\Users\\someone\\repo\\src\\session.ts"],
    }],
    delivery_summary: {
      receipts: [{ agent: "web", status: "done", summary: "已完成修复并通过 npm test", files_changed: ["src/session.ts"] }],
    },
  };
  const todoTask = {
    id: "task-todo-1",
    status: "done",
    created_at: "2026-07-20T02:00:00.000Z",
    todo_plan: {
      title: "协作群当前计划",
      steps: [
        { content: "理解需求与验收目标", status: "completed", activeForm: "正在理解需求" },
        { content: "验收结果并总结给用户", status: "completed" },
      ],
    },
  };

  const assignmentTask = {
    id: "task-assign-1",
    status: "in_progress",
    created_at: "2026-07-20T03:00:00.000Z",
    group_id: "group-1",
    delivery_summary: {
      assignment_evidence: [{ project: "api", task: "升级接口契约", timestamp: "2026-07-20T03:05:00.000Z" }],
    },
  };

  // 绝大多数历史群聊任务没有 plan_mode，计划实际落在 delivery_summary.coordination_plans。
  const coordinationTask = {
    id: "task-coord-1",
    status: "done",
    created_at: "2026-07-20T05:00:00.000Z",
    acceptance_criteria: "修改 smoke.md，子 Agent 回执 done。",
    delivery_summary: {
      coordination_plans: [
        { mode: "cc-style-coordinator", strategy: "research_synthesis_implementation_verification", phases: ["理解需求：提炼业务目标与约束", "分配任务：派发给 cc-connect-test"], targets: ["cc-connect-test"], timestamp: "2026-07-20T05:01:00.000Z" },
        { mode: "cc-style-coordinator", strategy: "research_synthesis_implementation_verification", phases: ["理解需求：提炼业务目标与约束", "分配任务：派发给 cc-connect-test", "复盘验收：汇总回执与验证证据"], targets: ["cc-connect-test"], timestamp: "2026-07-20T05:09:00.000Z" },
      ],
      latest_coordination_plan: { mode: "cc-style-coordinator", strategy: "research_synthesis_implementation_verification", phases: ["理解需求：提炼业务目标与约束", "分配任务：派发给 cc-connect-test", "复盘验收：汇总回执与验证证据"], targets: ["cc-connect-test"], missingInfo: [], timestamp: "2026-07-20T05:09:00.000Z" },
    },
  };

  const planView = buildTaskReplayPlanView(planTask);
  const todoView = buildTaskReplayPlanView(todoTask);
  const coordinationView = buildTaskReplayPlanView(coordinationTask);
  const longPlanView = buildTaskReplayPlanView({
    id: "task-plan-long",
    status: "in_progress",
    workflow_meta: {
      plan_mode: {
        title: "长计划",
        requires_confirmation: false,
        confirmation_status: "confirmed",
        steps: Array.from({ length: 25 }, (_, index) => ({ id: `long_${index + 1}`, label: `计划步骤 ${index + 1}`, status: index < 4 ? "completed" : "pending" })),
      },
    },
  });
  const fallbackTodoView = buildTaskReplayPlanView(
    { id: "task-live-1", status: "in_progress", created_at: "2026-07-20T04:00:00.000Z" },
    { fallbackTodo: { title: "协作群当前计划", steps: [{ content: "派发执行成员", status: "in_progress" }] } },
  );
  const workItems = buildTaskReplayWorkItemRows(planTask);
  const workItemsAgain = buildTaskReplayWorkItemRows(planTask);
  const assignmentRows = buildTaskReplayWorkItemRows(assignmentTask);
  const assignmentRowsAgain = buildTaskReplayWorkItemRows(assignmentTask);
  const primary = workItems.find(item => item.target === "web") || workItems[0];
  const serialized = JSON.stringify({ planView, workItems });

  const checks = {
    plan_mode_view_built: planView?.source === "plan_mode" && planView.step_count === 4 && planView.confirmed === true && planView.status === "in_progress",
    plan_followup_step_marked: planView?.steps.some(step => step.source === "user_followup") === true,
    plan_revision_recorded: planView?.revision_count === 1 && planView.revisions[0]?.feedback.includes("注册页"),
    plan_scope_and_acceptance_kept: (planView?.impact_projects || []).includes("web") && (planView?.acceptance || []).length === 1,
    long_plan_is_not_truncated: longPlanView?.step_count === 25 && longPlanView.steps.length === 25 && longPlanView.completed_count === 4,
    live_todo_fallback: todoView?.source === "live_todo" && todoView.status === "completed" && todoView.step_count === 2,
    empty_task_has_no_plan: buildTaskReplayPlanView({}) === null && buildTaskReplayWorkItemRows({}).length === 0,
    work_item_receipt_applied: primary?.status === "completed" && primary.receipt_status === "passed" && primary.receipt_summary.includes("npm test"),
    work_item_paths_redacted: !serialized.includes("C:\\\\Users") && !serialized.includes("C:\\Users"),
    work_item_timestamps_stable: JSON.stringify(workItems) === JSON.stringify(workItemsAgain),
    derived_work_item_timestamps_stable: assignmentRows.length === 1
      && JSON.stringify(assignmentRows) === JSON.stringify(assignmentRowsAgain)
      && assignmentRows[0].created_at === "2026-07-20T03:05:00.000Z",
    fallback_todo_reachable: fallbackTodoView?.source === "live_todo" && fallbackTodoView.step_count === 1 && fallbackTodoView.status === "in_progress",
    // 历史群聊任务的主路径：协作计划必须能出面板，且如实标注步骤状态是推导的。
    coordination_plan_view_built: coordinationView?.source === "coordination_plan"
      && coordinationView.step_count === 3
      && coordinationView.status === "completed"
      && coordinationView.step_status_derived === true
      && coordinationView.progress_label === "3/3",
    coordination_plan_splits_phase_text: coordinationView?.steps[0].title === "理解需求" && coordinationView.steps[0].detail === "提炼业务目标与约束",
    coordination_plan_keeps_targets_and_history: (coordinationView?.impact_projects || []).includes("cc-connect-test")
      && coordinationView?.revision_count === 1
      && (coordinationView?.acceptance || []).length === 1
      && coordinationView?.strategy === "research_synthesis_implementation_verification",
    plan_mode_still_wins_over_coordination: buildTaskReplayPlanView({ ...coordinationTask, workflow_meta: planTask.workflow_meta })?.source === "plan_mode",
  };
  return {
    schema: "ccm-task-replay-plan-selftest-v1",
    pass: Object.values(checks).every(Boolean),
    checks,
  };
}
