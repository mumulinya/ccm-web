"use strict";
// 主 Agent 计划核心模块：三处计划生成（执行前计划、决策链模板计划、执行期实时计划）的共享底座。
// 职责：
// 1. PLAN_STEP_LIBRARY —— 统一步骤文案，消除三处骨架各自维护导致的措辞漂移；
// 2. buildPlanModeWorkStepSpecs —— 让执行前计划中的模型步骤（model_plan_N）和追加要求步骤
//    贯穿执行期实时计划，随任务阶段推进状态，避免"计划一份、执行另一份"；
// 3. mergeFollowupIntoPlanMode —— 用户在计划书给出后继续追加要求时，把追加内容并入计划书
//    （新增步骤 + 修订历史），等待确认阶段要求重新确认，执行中则并入后继续。
// 本模块必须保持无内部依赖（不 import 其他 collaboration 模块），任何计划相关文件都可以安全引用。
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_STEP_LIBRARY = void 0;
exports.planStepText = planStepText;
exports.readTaskPlanMode = readTaskPlanMode;
exports.extractPlanModeWorkSteps = extractPlanModeWorkSteps;
exports.planWorkStepLiveStatus = planWorkStepLiveStatus;
exports.buildPlanModeWorkStepSpecs = buildPlanModeWorkStepSpecs;
exports.mergeFollowupIntoPlanMode = mergeFollowupIntoPlanMode;
exports.buildPlanRevisionTaskUpdates = buildPlanRevisionTaskUpdates;
exports.summarizePlanRevisionForUser = summarizePlanRevisionForUser;
exports.runMainAgentPlanCoreSelfTest = runMainAgentPlanCoreSelfTest;
function compactPlanText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
// 统一步骤文案字典。key 为步骤 id，三处计划生成必须从这里取文案，不得各写一份。
exports.PLAN_STEP_LIBRARY = {
    // 通用理解与上下文
    understand_intent: { content: "确认需求目标和涉及范围", activeForm: "正在确认需求目标" },
    understand_goal: { content: "理解需求与验收目标", activeForm: "正在理解需求与验收目标" },
    read_group_context: { content: "读取群聊上下文和任务历史", activeForm: "正在读取群聊上下文" },
    read_only_explore: { content: "只读探索影响范围", activeForm: "正在只读探索影响范围" },
    read_project_code_snapshot: { content: "只读读取绑定项目的结构和相关代码快照", activeForm: "正在只读查看项目结构和代码" },
    query_knowledge_base: { content: "查询知识库，补充项目背景和历史结论", activeForm: "正在查询知识库" },
    restore_task_context: { content: "恢复上次任务上下文和未完成 Todo", activeForm: "正在恢复上次任务上下文" },
    inspect_task_status: { content: "查看原任务当前状态和子 Agent 进度", activeForm: "正在查看任务状态" },
    // 任务创建与派发
    create_project_task: { content: "创建可跟踪的项目任务卡", activeForm: "正在创建项目任务卡" },
    decide_dispatch: { content: "判断是否需要派发子 Agent", activeForm: "正在判断是否派发子 Agent" },
    dispatch_child_agent: { content: "判断是否需要派发执行成员", activeForm: "正在派发执行成员" },
    dispatch_sub_agents: { content: "派发子 Agent 工作单", activeForm: "正在派发子 Agent 工作单" },
    confirm_boundary: { content: "确认执行边界", activeForm: "正在确认执行边界" },
    ask_user_clarification: { content: "信息不足时先追问用户，不擅自开任务", activeForm: "正在追问用户" },
    // 执行与验收
    child_agent_execution: { content: "执行成员执行并提交结果", activeForm: "执行成员正在执行" },
    read_child_agent_receipts: { content: "等待执行成员结果说明", activeForm: "正在等待和读取结果说明" },
    replan_from_observation: { content: "把追加要求合并进原计划，必要时重新安排", activeForm: "正在重新规划" },
    govern_task_lifecycle: { content: "执行停止、取消、归档或删除前等待用户明确确认", activeForm: "正在等待治理确认" },
    coordinator_review: { content: "最终验收执行成员结果", activeForm: "我正在验收" },
    verify_and_reply: { content: "汇总修改、验证结果和风险，生成最终回复", activeForm: "正在验收并生成最终回复" },
    verify_and_summarize: { content: "验收结果并总结给用户", activeForm: "正在验收结果并总结" },
    final_delivery_report: { content: "生成最终交付报告，说明改动、验证和风险", activeForm: "正在生成交付报告" },
    generate_final_reply: { content: "生成回复", activeForm: "正在生成回复" },
};
function planStepText(id, overrides = {}) {
    const base = exports.PLAN_STEP_LIBRARY[id] || { content: id, activeForm: `正在处理 ${id}` };
    return {
        content: overrides.content || base.content,
        activeForm: overrides.activeForm || base.activeForm,
    };
}
// ---------------------------------------------------------------------------
// 模型计划步骤贯穿执行期
// ---------------------------------------------------------------------------
function readTaskPlanMode(task) {
    // 与 collaboration-task-intake.getTaskPlanMode 保持相同优先级；本模块不 import 它以避免循环依赖。
    return task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
}
// 执行前计划里"实际要做的工作"步骤：模型生成的 model_plan_N 与用户追加的 followup_requirement_N。
function extractPlanModeWorkSteps(planMode) {
    const steps = Array.isArray(planMode?.steps) ? planMode.steps : [];
    return steps.filter((step) => {
        const id = String(step?.id || "");
        const source = String(step?.source || "");
        return source === "model" || source === "user_followup"
            || /^model_plan_\d+$/.test(id) || /^followup_requirement_\d+$/.test(id);
    });
}
// 任务阶段 → 模型计划步骤的执行期状态。子 Agent 回执没有步骤级映射，
// 因此模型步骤统一随任务阶段推进，这是当前证据粒度下最诚实的展示。
function planWorkStepLiveStatus(phase, task) {
    if (["cancelled", "reverted"].includes(phase))
        return "cancelled";
    if (task?.status === "failed" || phase === "blocked")
        return "needs_confirmation";
    if (phase === "completed")
        return "completed";
    if (phase === "reviewing")
        return "reviewing";
    if (phase === "reworking")
        return "reworking";
    if (["dispatching", "executing"].includes(phase))
        return "in_progress";
    return "pending";
}
// 供执行期实时计划（buildLiveMainAgentTodoPlan）注入：把执行前计划中的工作步骤转成实时步骤规格。
function buildPlanModeWorkStepSpecs(task, phase) {
    const workSteps = extractPlanModeWorkSteps(readTaskPlanMode(task));
    const liveStatus = planWorkStepLiveStatus(phase, task);
    return workSteps.map((step) => {
        const label = compactPlanText(step?.label || step?.content || "", 160) || "执行计划步骤";
        const fromFollowup = String(step?.source || "") === "user_followup" || /^followup_requirement_\d+$/.test(String(step?.id || ""));
        return {
            id: String(step?.id || ""),
            content: label,
            // 计划步骤自身已标记完成/取消时尊重原状态，否则随任务阶段推进。
            status: ["completed", "cancelled", "skipped"].includes(String(step?.status || "")) ? String(step.status) : liveStatus,
            activeForm: `正在推进：${compactPlanText(label, 60)}`,
            detail: fromFollowup ? "来自你在计划确认后的追加要求" : "来自执行前计划的模型步骤",
        };
    });
}
// ---------------------------------------------------------------------------
// 追加要求并入计划书
// ---------------------------------------------------------------------------
// 追加步骤插在这些"门槛/验收"步骤之前，保证验收始终是计划的收尾。
const PLAN_GATE_STEP_IDS = ["confirm_boundary", "dispatch_sub_agents", "verify_and_summarize", "verify_and_reply", "coordinator_review", "final_delivery_report"];
function mergeFollowupIntoPlanMode(planMode, input) {
    const base = planMode && typeof planMode === "object" ? planMode : {};
    const now = input.at || new Date().toISOString();
    const text = compactPlanText(input.message, 520) || "用户追加了新的要求。";
    const kind = String(input.kind || "supplement");
    // 幂等短路：同一条反馈（内容+类型+来源均相同）重放时原样返回，避免重试/双击重复插入步骤、虚增修订计数。
    const lastRevision = Array.isArray(base.plan_revisions) ? base.plan_revisions[base.plan_revisions.length - 1] : null;
    if (lastRevision
        && String(lastRevision.feedback || "") === text
        && String(lastRevision.kind || "") === kind
        && String(lastRevision.source || "") === String(input.source || "user")) {
        return base;
    }
    const revisionCount = Number(base.revision_count || base.revisionCount || 0) + 1;
    const existingSteps = Array.isArray(base.steps) ? [...base.steps] : [];
    const followupIndex = existingSteps.filter((step) => /^followup_requirement_\d+$/.test(String(step?.id || ""))).length + 1;
    const followupStep = {
        id: `followup_requirement_${followupIndex}`,
        label: `${kind === "revise_goal" ? "按调整后的目标执行" : "并入追加要求"}：${compactPlanText(text, 160)}`,
        detail: kind === "revise_goal"
            ? "用户调整了目标，后续步骤按新目标执行"
            : "用户在计划提出后补充的要求，已并入计划书",
        status: "pending",
        source: "user_followup",
        added_at: now,
    };
    const gateIndex = existingSteps.findIndex((step) => PLAN_GATE_STEP_IDS.includes(String(step?.id || "")));
    const steps = gateIndex >= 0
        ? [...existingSteps.slice(0, gateIndex), followupStep, ...existingSteps.slice(gateIndex)]
        : [...existingSteps, followupStep];
    const revision = {
        count: revisionCount,
        feedback: text,
        at: now,
        kind,
        source: String(input.source || "user"),
        // 目标调整可能触发停止当前执行轮重核，不能宣称"继续执行"。
        status: input.executing ? (kind === "revise_goal" ? "replan_pending" : "merged_in_flight") : "revision_requested",
        step_id: followupStep.id,
    };
    return {
        ...base,
        title: base.title || "执行前计划",
        steps,
        revision_status: revision.status,
        revision_count: revisionCount,
        last_revision_feedback: text,
        revised_at: now,
        plan_revisions: [
            ...(Array.isArray(base.plan_revisions) ? base.plan_revisions : []),
            revision,
        ].slice(-10),
        ...(input.executing
            ? {
                next_step: kind === "revise_goal"
                    ? "目标调整已并入计划；我会先核对进行中的执行轮是否需要停止，再按新目标继续。"
                    : "追加要求已并入计划，我会在当前任务中继续执行并在验收时核对。",
            }
            : {
                requires_confirmation: true,
                auto_continue: false,
                next_step: "请重新确认调整后的执行前计划；确认后才会派发执行成员。",
            }),
    };
}
// 把修订后的计划同步回任务的全部计划存储位（intake_draft / workflow_meta.plan_mode / workflow_meta.intake.plan_mode），
// 三处必须同写，否则 getTaskPlanMode 的读取优先级会读到旧计划。
function buildPlanRevisionTaskUpdates(task, revisedPlan) {
    const meta = task?.workflow_meta && typeof task.workflow_meta === "object" ? task.workflow_meta : {};
    return {
        intake_draft: revisedPlan,
        plan_revision_count: revisedPlan.revision_count,
        last_plan_revision_feedback: revisedPlan.last_revision_feedback,
        last_plan_revision_at: revisedPlan.revised_at,
        workflow_meta: {
            ...meta,
            plan_mode: revisedPlan,
            ...(meta.intake ? { intake: { ...meta.intake, plan_mode: revisedPlan } } : {}),
        },
    };
}
// 给用户看的修订说明（群消息 / 时间线用）。
function summarizePlanRevisionForUser(revisedPlan, input = {}) {
    const feedback = compactPlanText(revisedPlan?.last_revision_feedback || "", 120);
    const count = Number(revisedPlan?.revision_count || 0);
    const revisions = Array.isArray(revisedPlan?.plan_revisions) ? revisedPlan.plan_revisions : [];
    const lastKind = String(revisions[revisions.length - 1]?.kind || "");
    const head = `计划书已更新（第 ${count} 次修订）`;
    const body = feedback ? `：已把「${feedback}」并入计划步骤` : "";
    const tail = !input.executing
        ? "，请重新确认后我再开始派发。"
        : lastKind === "revise_goal"
            ? "，我会按调整后的目标重核执行安排后继续。"
            : "，任务继续执行，验收时会一并核对。";
    return `${head}${body}${tail}`;
}
// ---------------------------------------------------------------------------
// 自测
// ---------------------------------------------------------------------------
function runMainAgentPlanCoreSelfTest() {
    const basePlan = {
        title: "执行前计划",
        revision_count: 0,
        requires_confirmation: true,
        steps: [
            { id: "understand_goal", label: "理解需求与验收目标", status: "completed" },
            { id: "model_plan_1", label: "改造登录接口", status: "pending", source: "model" },
            { id: "confirm_boundary", label: "确认执行边界", status: "needs_confirmation" },
            { id: "dispatch_sub_agents", label: "派发子 Agent 工作单", status: "pending" },
            { id: "verify_and_summarize", label: "验收结果并总结给用户", status: "pending" },
        ],
    };
    const awaiting = mergeFollowupIntoPlanMode(basePlan, { message: "顺便把注册页也一起改了", executing: false, source: "test" });
    const replayed = mergeFollowupIntoPlanMode(awaiting, { message: "顺便把注册页也一起改了", executing: false, source: "test" });
    const inFlight = mergeFollowupIntoPlanMode(awaiting, { message: "登录还要兼容旧 token", executing: true, kind: "supplement", source: "test" });
    const followupStepAwaiting = awaiting.steps.find((step) => step.id === "followup_requirement_1");
    const followupStepInFlight = inFlight.steps.find((step) => step.id === "followup_requirement_2");
    const gatePosition = awaiting.steps.findIndex((step) => step.id === "confirm_boundary");
    const followupPosition = awaiting.steps.findIndex((step) => step.id === "followup_requirement_1");
    const taskExecuting = { workflow_meta: { plan_mode: inFlight }, status: "in_progress" };
    const liveSpecs = buildPlanModeWorkStepSpecs(taskExecuting, "executing");
    const liveSpecsReviewing = buildPlanModeWorkStepSpecs(taskExecuting, "reviewing");
    const liveSpecsCompleted = buildPlanModeWorkStepSpecs({ ...taskExecuting, status: "done" }, "completed");
    const checks = {
        followupStepInsertedBeforeGate: followupPosition >= 0 && gatePosition > followupPosition,
        awaitingRevisionRequiresReconfirm: awaiting.requires_confirmation === true && awaiting.auto_continue === false && awaiting.revision_status === "revision_requested",
        inFlightRevisionKeepsExecution: followupStepInFlight != null && inFlight.revision_status === "merged_in_flight" && inFlight.revision_count === 2,
        revisionHistoryAccumulates: Array.isArray(inFlight.plan_revisions) && inFlight.plan_revisions.length === 2 && inFlight.plan_revisions[0].count === 1,
        followupStepMarkedAsUserSource: followupStepAwaiting?.source === "user_followup",
        replayedFollowupIsIdempotent: replayed === awaiting,
        liveSpecsCarryModelAndFollowupSteps: liveSpecs.length === 3 && liveSpecs.some(spec => spec.id === "model_plan_1") && liveSpecs.some(spec => spec.id === "followup_requirement_2"),
        liveSpecsProgressWithPhase: liveSpecs.every(spec => spec.status === "in_progress") && liveSpecsReviewing.every(spec => spec.status === "reviewing") && liveSpecsCompleted.every(spec => spec.status === "completed"),
        planStepTextFallsBack: planStepText("create_project_task").content === "创建可跟踪的项目任务卡" && planStepText("unknown_step").content === "unknown_step",
        revisionUpdatesSyncAllStores: (() => {
            const task = { workflow_meta: { plan_mode: basePlan, intake: { plan_mode: basePlan } } };
            const updates = buildPlanRevisionTaskUpdates(task, awaiting);
            return updates.intake_draft === awaiting && updates.workflow_meta.plan_mode === awaiting && updates.workflow_meta.intake.plan_mode === awaiting;
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks, samples: { awaiting, inFlight, liveSpecs } };
}
//# sourceMappingURL=main-agent-plan-core.js.map