"use strict";
// collaboration-runtime-plan-tools.ts — merged from 2 part files (behavior-freeze merge).
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
exports.appendMainAgentDecisionTrace = appendMainAgentDecisionTrace;
exports.applyMainAgentDecisionPetState = applyMainAgentDecisionPetState;
exports.runGroupMainAgentToolLoopSelfTest = runGroupMainAgentToolLoopSelfTest;
exports.getWorkDirState = getWorkDirState;
exports.getClaudeLocalGatewayReadiness = getClaudeLocalGatewayReadiness;
exports.getChildProcessCapability = getChildProcessCapability;
exports.readRunnerJson = readRunnerJson;
exports.normalizeAgentProbeTarget = normalizeAgentProbeTarget;
exports.getAgentProbeTargetStatusKey = getAgentProbeTargetStatusKey;
exports.getAgentProbeTargetStatusFile = getAgentProbeTargetStatusFile;
exports.readAgentProbeStatusFile = readAgentProbeStatusFile;
exports.doesProbeTargetMatchRequired = doesProbeTargetMatchRequired;
exports.listAgentProbeTargetStatuses = listAgentProbeTargetStatuses;
exports.readAgentProbeStatus = readAgentProbeStatus;
exports.getAgentProbeHealth = getAgentProbeHealth;
exports.writeAgentProbeStatus = writeAgentProbeStatus;
exports.buildRunnerFixHint = buildRunnerFixHint;
exports.buildAgentExecutionFixActions = buildAgentExecutionFixActions;
exports.getAgentProbeOutputFailure = getAgentProbeOutputFailure;
exports.getAgentExecutionReadiness = getAgentExecutionReadiness;
exports.enforceAgentProbeExecutionReadiness = enforceAgentProbeExecutionReadiness;
exports.getAgentProbeExecutionReadiness = getAgentProbeExecutionReadiness;
exports.taskRequiresFreshAgentProbe = taskRequiresFreshAgentProbe;
exports.getTaskRequiredProbeTarget = getTaskRequiredProbeTarget;
exports.getProbeTargetLabel = getProbeTargetLabel;
exports.doesProbeMatchTaskTarget = doesProbeMatchTaskTarget;
exports.taskNeedsGroupWideAgentProbe = taskNeedsGroupWideAgentProbe;
exports.getExecutableProbeTargetsFromDevGroup = getExecutableProbeTargetsFromDevGroup;
exports.summarizeAgentProbeTargets = summarizeAgentProbeTargets;
exports.getTaskGroupAgentProbeReadiness = getTaskGroupAgentProbeReadiness;
exports.enforceTaskAgentProbeReadiness = enforceTaskAgentProbeReadiness;
exports.getTaskAgentExecutionReadiness = getTaskAgentExecutionReadiness;
exports.getExternalAgentRunnerStatus = getExternalAgentRunnerStatus;
exports.buildAgentProbeMatrix = buildAgentProbeMatrix;
exports.buildDailyDevAgentDiagnostics = buildDailyDevAgentDiagnostics;
exports.runAgentCliProbeBatch = runAgentCliProbeBatch;
exports.buildCoordinatorSharedFilesContext = buildCoordinatorSharedFilesContext;
exports.buildTaskSourceDocumentsContext = buildTaskSourceDocumentsContext;
exports.mergeCoordinatorDocumentContexts = mergeCoordinatorDocumentContexts;
exports.runCollaborationProtocolSelfTest = runCollaborationProtocolSelfTest;
exports.getProjectExtraConfig = getProjectExtraConfig;
exports.normalizeProjectConfigList = normalizeProjectConfigList;
exports.getProjectAgentCapabilityProfile = getProjectAgentCapabilityProfile;
exports.collectProjectPolicyViolations = collectProjectPolicyViolations;
exports.buildAgentToolContext = buildAgentToolContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const role_skills_1 = require("../../skills/role-skills");
const shared_files_v2_1 = require("../tools/shared-files-v2");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const main_agent_context_policy_1 = require("../../tools/main-agent-context-policy");
const main_agent_context_source_continuity_1 = require("../../system/main-agent-context-source-continuity");
const main_agent_post_compact_continuity_1 = require("../../system/main-agent-post-compact-continuity");
const group_orchestrator_1 = require("./group-orchestrator");
const display_1 = require("./display");
const memory_1 = require("./memory");
const storage_1 = require("./storage");
const runtime_1 = require("../../agents/runtime");
const tool_authorization_1 = require("../../tools/tool-authorization");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const main_agent_plan_core_1 = require("./main-agent-plan-core");
// ===== merged from collaboration-runtime-plan-tools-part-01.ts =====
function buildMainAgentUserPlanSteps(input) {
    const mode = String(input.mode || "conversation");
    const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
    const blockedActions = (input.permissions || []).filter((item) => item.allowed === false).map((item) => item.action_id);
    const hasDispatch = actionIds.includes("dispatch_child_agent");
    const assignmentCount = Array.isArray(input.assignments) ? input.assignments.length : 0;
    const steps = [];
    // content/activeForm 传空串时回退到 PLAN_STEP_LIBRARY 的统一文案；仅带模式特有信息时才写字面量。
    const add = (id, content, status, activeForm = content, detail = "") => {
        const text = (0, main_agent_plan_core_1.planStepText)(id, { content, activeForm });
        steps.push((0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id, content: text.content, activeForm: text.activeForm, status, detail }));
    };
    add("understand_intent", "理解用户目标并决定下一步", "completed", "正在判断用户意图", input.taskIntent?.reason || input.dispatchPolicy?.reason || "");
    add("read_group_context", "", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "read_group_context"));
    if (mode === "project_task" || mode === "delegation") {
        add("read_project_code_snapshot", "确认涉及的项目、范围和可能影响的代码位置", actionIds.includes("read_project_code_snapshot") ? (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "read_project_code_snapshot") : "pending", "正在确认项目和代码范围");
        add("create_project_task", "", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "create_project_task", input.taskId ? "completed" : "pending"), "", input.taskId ? `任务 ${input.taskId}` : "");
        add("dispatch_child_agent", assignmentCount > 0 ? `派发给 ${assignmentCount} 个子 Agent 执行` : "判断是否需要派发子 Agent，并生成工作单", blockedActions.includes("dispatch_child_agent") ? "needs_confirmation" : hasDispatch ? "in_progress" : "pending", "正在派发子 Agent");
        add("read_child_agent_receipts", "", hasDispatch ? "pending" : "skipped");
        add("verify_and_reply", "", "pending", "", "参考 Claude Code TodoWrite 的验证推动：复杂任务必须保留验收步骤。");
        return steps;
    }
    if (mode === "followup") {
        add("inspect_task_status", "", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "inspect_task_status"));
        add("replan_from_observation", "", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "replan_from_observation"));
        add("generate_final_reply", "告诉用户追加要求如何并入当前任务", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "generate_final_reply"), "正在生成回复");
        return steps;
    }
    if (mode === "governance") {
        add("inspect_task_status", "读取任务状态，确认要操作的是哪一个任务", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "inspect_task_status"), "正在查看任务状态");
        add("govern_task_lifecycle", "", blockedActions.includes("govern_task_lifecycle") ? "needs_confirmation" : (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "govern_task_lifecycle"));
        add("generate_final_reply", "说明本轮治理动作是否已执行", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "generate_final_reply", blockedActions.length ? "pending" : "completed"), "正在生成回复");
        return steps;
    }
    add("decide_dispatch", "判断是否需要派发子 Agent：本轮不需要创建任务", "skipped", "正在判断是否派发子 Agent");
    if (actionIds.includes("ask_user_clarification")) {
        add("ask_user_clarification", "", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "ask_user_clarification"));
    }
    add("generate_final_reply", "直接回答用户的问题", (0, collaboration_runtime_coordinator_review_1.mainAgentPlanStepStatus)(actionIds, blockedActions, "generate_final_reply"), "正在生成回复");
    return steps;
}
function normalizeLiveTodoStatus(status) {
    return require("./collaboration-task-card").normalizeLiveTodoStatus.apply(null, arguments);
}
function buildTodoStepEvidence(input) {
    return require("./collaboration-task-card").buildTodoStepEvidence.apply(null, arguments);
}
function buildTodoStepActions(input) {
    return require("./collaboration-task-card").buildTodoStepActions.apply(null, arguments);
}
function buildLiveMainAgentTodoPlan(task, phase, workers, executions, summary = {}) {
    return require("./collaboration-task-card").buildLiveMainAgentTodoPlan.apply(null, arguments);
}
function buildLiveMainAgentDecisionForTask(task, phase, liveTodoPlan, summary = {}) {
    return require("./collaboration-task-card").buildLiveMainAgentDecisionForTask.apply(null, arguments);
}
function buildMainAgentDecisionChain(input) {
    const mode = input.mode || "conversation";
    const policyAction = String(input.dispatchPolicy?.action || "").trim();
    const actionIds = (0, collaboration_runtime_coordinator_review_1.normalizeMainAgentActionIds)([
        "read_group_context",
        ...(mode === "project_task" ? ["create_project_task", "dispatch_child_agent", "inspect_task_status"] : []),
        ...(mode === "followup" ? ["inspect_task_status", "replan_from_observation"] : []),
        ...(mode === "governance" ? ["govern_task_lifecycle", "inspect_task_status"] : []),
        ...(policyAction === "ask_user" ? ["ask_user_clarification"] : []),
        ...(policyAction === "delegate" || (input.assignments || []).length ? ["dispatch_child_agent", "read_child_agent_receipts"] : []),
        ...(mode === "delegation" ? ["inspect_task_status"] : []),
        "generate_final_reply",
    ]);
    const permissions = (0, collaboration_runtime_coordinator_review_1.buildMainAgentPermissionJudgement)(actionIds, {
        taskIntent: input.taskIntent,
        messageMode: input.messageMode,
        explicitGovernance: input.explicitGovernance,
    });
    const blocked = permissions.filter(item => !item.allowed);
    const userPlanSteps = buildMainAgentUserPlanSteps({
        mode,
        actionIds,
        permissions,
        taskIntent: input.taskIntent,
        dispatchPolicy: input.dispatchPolicy,
        assignments: input.assignments,
        taskId: input.taskId,
    });
    const observations = {
        message_mode: input.messageMode || "",
        intent_kind: input.taskIntent?.kind || "",
        executable: input.taskIntent?.executable === true,
        tool_activity: input.taskIntent?.hasToolActivity === true,
        dispatch_action: policyAction || (mode === "project_task" ? "create_task" : "direct_reply"),
        assignment_count: (input.assignments || []).length,
        ...(input.observations || {}),
    };
    const dispatchLaunchSummary = (0, collaboration_runtime_task_queue_1.buildDispatchLaunchSummary)({
        goal: input.taskIntent?.goal || input.reply?.text || input.dispatchPolicy?.reason || "",
        assignments: input.assignments || [],
        dispatchPolicy: input.dispatchPolicy,
        mode,
        taskId: input.taskId || "",
    });
    const verified = blocked.length === 0
        && (mode !== "project_task" || input.taskId)
        && actionIds.includes("generate_final_reply");
    const internalLoop = (0, collaboration_runtime_coordinator_review_1.buildGroupMainAgentInternalLoop)({
        mode,
        actionIds,
        permissions,
        taskIntent: input.taskIntent,
        dispatchPolicy: input.dispatchPolicy,
        assignments: input.assignments || [],
        observations,
        verified,
    });
    const displayStream = (0, display_1.buildMainAgentDisplayStream)({
        surface: "group",
        mode,
        status: verified ? "completed" : blocked.length ? "waiting_confirmation" : "running",
        phase: mode,
        userText: input.reply?.text || input.dispatchPolicy?.nextStep || input.dispatchPolicy?.reason || input.taskIntent?.reason || "",
        goal: input.taskIntent?.goal || input.reply?.text || "",
        actionIds,
        steps: userPlanSteps,
        permissions,
        observations,
        traceId: input.traceId,
        technical: { blockers: blocked.map((item) => item.reason || item.action_id) },
        workers: input.assignments || [],
        executions: [],
        summary: { assignment_count: (input.assignments || []).length, dispatch_launch_summary: dispatchLaunchSummary },
        rawEvents: [],
        taskId: input.taskId || "",
    });
    const verificationReminder = (0, collaboration_runtime_coordinator_review_1.buildMainAgentPlanVerificationReminder)({
        mode,
        steps: userPlanSteps,
        summary: observations,
        verified,
    });
    const chain = {
        version: 2,
        trace_id: input.traceId,
        group_id: input.groupId,
        task_id: input.taskId || "",
        message_id: input.messageId || "",
        coordinator: input.coordinator || "coordinator",
        mode,
        decision: {
            selected_actions: actionIds,
            dispatch_policy: input.dispatchPolicy || null,
            reason: input.dispatchPolicy?.reason || input.taskIntent?.reason || "",
        },
        internal_loop: internalLoop,
        loop: internalLoop,
        user_plan_steps: userPlanSteps,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        display_stream: displayStream,
        displayStream,
        todo_plan: {
            title: "我准备这样处理",
            source: "cc-style-todo",
            schema: "cc-style-todo-v2",
            display: {
                max_visible_steps: 7,
                quiet_completed: true,
                show_current_focus: true,
                user_visible: mode !== "conversation" || blocked.length > 0 || policyAction === "ask_user",
                hide_for_simple_conversation: mode === "conversation" && blocked.length === 0 && policyAction !== "ask_user",
            },
            strategy: "完整列表替换；普通用户看计划步骤，内部 Action/Trace 折叠",
            verification_nudge: Boolean(verificationReminder),
            verification_reminder: verificationReminder,
            steps: userPlanSteps,
        },
        verification_reminder: verificationReminder,
        verificationReminder,
        permissions,
        observation: observations,
        verify: {
            passed: verified,
            blocked_actions: blocked.map(item => item.action_id),
            conclusion: verified ? "主 Agent 本轮动作链路满足权限和证据边界" : "主 Agent 本轮存在未授权或证据不足的动作",
        },
        reply: {
            kind: input.reply?.kind || (mode === "project_task" ? "task_card" : "assistant_message"),
            message_id: input.reply?.messageId || input.messageId || "",
            preview: (0, memory_1.compactMemoryText)(input.reply?.text || "", 240),
        },
        created_at: new Date().toISOString(),
    };
    return chain;
}
function appendMainAgentDecisionTrace(input) {
    const chain = buildMainAgentDecisionChain(input);
    (0, reliability_ledger_1.appendTraceEvent)(input.traceId, {
        id: `main-agent-decision:${input.messageId || input.taskId || Date.now()}:${chain.mode}`,
        type: "main_agent_decision",
        status: chain.verify.passed ? "ok" : "warning",
        task_id: input.taskId || "",
        group_id: input.groupId,
        agent: input.coordinator || "coordinator",
        message: `${chain.mode}：${chain.decision.selected_actions.join(" -> ")}`,
        data: chain,
    });
    return chain;
}
function mainAgentPetStateFromDecision(decision) {
    if (!decision?.verify?.passed)
        return { state: "waiting", text: "这个操作需要确认一下。" };
    const mode = String(decision?.mode || "");
    if (mode === "project_task")
        return { state: "planning", text: "我已创建任务，正在安排执行。" };
    if (mode === "delegation")
        return { state: "building", text: "我正在派发子 Agent 协作。" };
    if (mode === "followup")
        return { state: "working", text: "我把追加要求并入原任务了。" };
    if (mode === "governance")
        return { state: "waiting", text: "任务治理动作需要明确确认。" };
    return { state: "thinking", text: "我在组织这次回复。" };
}
function applyMainAgentDecisionPetState(ctx, decision) {
    if (!ctx || !decision?.coordinator)
        return;
    const pet = mainAgentPetStateFromDecision(decision);
    const groupTarget = { tab: "groups", groupId: decision.group_id || "" };
    const globalDetail = decision.coordinator && decision.coordinator !== "global-agent"
        ? `${decision.coordinator}：${pet.text}`
        : pet.text;
    try {
        ctx.setAgentActivity?.(decision.coordinator, pet.state, pet.text, groupTarget, 90 * 1000);
        ctx.broadcastPetSpeech?.(decision.coordinator, { role: decision.verify?.passed ? "status" : "attention", text: pet.text, source: "group", mode: "replace" });
        if (decision.coordinator !== "global-agent") {
            ctx.setAgentActivity?.("global-agent", pet.state, globalDetail, groupTarget, 90 * 1000);
            ctx.broadcastPetSpeech?.("global-agent", { role: decision.verify?.passed ? "status" : "attention", text: globalDetail, source: "workspace-group", mode: "replace" });
        }
    }
    catch { }
}
function runGroupMainAgentToolLoopSelfTest() {
    // 自测使用固定意图桩：同步关键词分类 classifyGroupProjectTaskIntent 已停用（调用即抛错），
    // 自测只需要形状正确的 taskIntent（权限判定仅消费 executable 字段）。
    const stubIntent = (kind, executable, hasToolActivity, reason, goal = "") => ({ kind, executable, hasToolActivity, reason, goal, source: "self-test-stub" });
    const conversation = buildMainAgentDecisionChain({
        groupId: "g-loop",
        traceId: "trace-loop-conversation",
        messageId: "m1",
        coordinator: "coordinator",
        mode: "conversation",
        messageMode: "conversation",
        taskIntent: stubIntent("conversation", false, false, "自测桩：普通问候"),
        dispatchPolicy: { action: "answer", reason: "普通问候" },
        reply: { text: "你好，我在。" },
    });
    const analysis = buildMainAgentDecisionChain({
        groupId: "g-loop",
        traceId: "trace-loop-analysis",
        messageId: "m2",
        coordinator: "coordinator",
        mode: "conversation",
        messageMode: "conversation",
        taskIntent: stubIntent("question", false, true, "自测桩：只读项目询问"),
        dispatchPolicy: { action: "answer", reason: "已读取项目上下文" },
        observations: { code_snapshot: true, knowledge_recall: true },
        reply: { text: "这是只读分析。" },
    });
    const projectTask = buildMainAgentDecisionChain({
        groupId: "g-loop",
        traceId: "trace-loop-task",
        messageId: "m3",
        taskId: "task-loop",
        coordinator: "coordinator",
        mode: "project_task",
        messageMode: "project_task",
        taskIntent: stubIntent("task", true, true, "自测桩：明确修复请求", "修复登录 bug 并跑测试"),
        dispatchPolicy: { action: "delegate", reason: "明确修复请求" },
        assignments: [{ project: "demo" }],
        observations: { task_created: true, queued: true },
        reply: { kind: "task_card", text: "任务已创建。" },
    });
    const unsafeGovernance = buildMainAgentDecisionChain({
        groupId: "g-loop",
        traceId: "trace-loop-governance",
        messageId: "m4",
        coordinator: "coordinator",
        mode: "governance",
        messageMode: "conversation",
        taskIntent: stubIntent("conversation", false, false, "自测桩：无治理授权的普通消息"),
        dispatchPolicy: { action: "hold", reason: "没有显式治理授权" },
        explicitGovernance: false,
        reply: { text: "需要确认。" },
    });
    const manualMissingVerificationReminder = (0, collaboration_runtime_coordinator_review_1.buildMainAgentPlanVerificationReminder)({
        mode: "project_task",
        steps: [
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "scope", content: "确认需求范围", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "change", content: "修改相关代码", status: "in_progress" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "reply", content: "整理交付说明", status: "pending" }),
        ],
    });
    const reviewOnlyMissingVerificationReminder = (0, collaboration_runtime_coordinator_review_1.buildMainAgentPlanVerificationReminder)({
        mode: "project_task",
        steps: [
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "scope", content: "确认需求范围", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "change", content: "修改相关代码", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "coordinator_review", content: "主 Agent 验收子 Agent 结果", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "final_delivery_report", content: "生成最终交付报告", status: "pending" }),
        ],
    });
    const manualConversationReminder = (0, collaboration_runtime_coordinator_review_1.buildMainAgentPlanVerificationReminder)({
        mode: "conversation",
        steps: [
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "understand", content: "理解问题", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "answer", content: "直接回答", status: "completed" }),
            (0, collaboration_runtime_coordinator_review_1.buildUserVisiblePlanStep)({ id: "close", content: "收尾", status: "completed" }),
        ],
    });
    const checks = {
        conversationDoesNotCreateTask: !conversation.decision.selected_actions.includes("create_project_task") && !conversation.decision.selected_actions.includes("dispatch_child_agent"),
        projectAnalysisIsReadOnly: analysis.decision.selected_actions.includes("read_project_code_snapshot") && !analysis.decision.selected_actions.includes("create_project_task"),
        explicitTaskCreatesAndDispatches: projectTask.decision.selected_actions.includes("create_project_task") && projectTask.decision.selected_actions.includes("dispatch_child_agent") && projectTask.verify.passed,
        highRiskGovernanceBlockedWithoutExplicitCommand: unsafeGovernance.decision.selected_actions.includes("govern_task_lifecycle") && unsafeGovernance.verify.passed === false,
        allHaveTraceShape: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.decision && item.observation && item.verify && item.reply),
        allHaveUserTodoPlan: [conversation, analysis, projectTask, unsafeGovernance].every(item => Array.isArray(item.user_plan_steps) && item.user_plan_steps.length >= 3 && item.todo_plan?.source === "cc-style-todo"),
        conversationTodoSkipsDispatch: conversation.user_plan_steps.some((step) => step.id === "decide_dispatch" && step.status === "skipped"),
        projectTaskTodoTracksExecution: projectTask.user_plan_steps.some((step) => step.id === "create_project_task" && step.status === "completed") && projectTask.user_plan_steps.some((step) => step.id === "dispatch_child_agent" && step.status === "in_progress"),
        governanceTodoNeedsConfirmation: unsafeGovernance.user_plan_steps.some((step) => step.status === "needs_confirmation"),
        planVerificationReminderVisibleWhenTaskPlanMissesVerification: manualMissingVerificationReminder?.schema === "ccm-main-agent-plan-verification-reminder-v1" && manualMissingVerificationReminder?.title === "还缺验收步骤",
        planVerificationReminderNotSuppressedByReviewOnlyStep: reviewOnlyMissingVerificationReminder?.schema === "ccm-main-agent-plan-verification-reminder-v1" && /真实验证/.test(reviewOnlyMissingVerificationReminder?.reason || ""),
        planVerificationReminderHiddenForOrdinaryConversation: manualConversationReminder === null,
        projectTaskTodoHasVerificationStepNoReminder: projectTask.todo_plan?.verification_reminder === null && projectTask.todo_plan?.verification_nudge === false,
        allHaveInternalLoop: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.internal_loop?.pattern === "observe-think-plan-act-monitor-reflect-respond" && item.internal_loop.stages?.length === 7),
        conversationLoopSkipsAct: conversation.internal_loop?.stages?.some((stage) => stage.id === "act" && stage.status === "skipped"),
        projectAnalysisLoopReadOnly: analysis.internal_loop?.stages?.some((stage) => stage.id === "observe" && stage.actions.includes("read_project_code_snapshot")) && analysis.internal_loop?.stages?.some((stage) => stage.id === "act" && stage.status === "skipped"),
        projectTaskLoopActsAndMonitors: projectTask.internal_loop?.stages?.some((stage) => stage.id === "act" && ["completed", "in_progress"].includes(stage.status)) && projectTask.internal_loop?.stages?.some((stage) => stage.id === "monitor" && ["completed", "in_progress"].includes(stage.status)),
        governanceLoopBlocksUnauthorizedAct: unsafeGovernance.internal_loop?.stages?.some((stage) => stage.id === "act" && stage.status === "needs_confirmation"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, samples: { conversation, analysis, projectTask, unsafeGovernance } };
}
function getWorkDirState(workDir) {
    const resolved = path.resolve(String(workDir || ""));
    if (!resolved)
        return { exists: false, writable: false, path: "" };
    try {
        const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
        if (!stat?.isDirectory())
            return { exists: false, writable: false, path: resolved };
        try {
            fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
            return { exists: true, writable: true, path: resolved };
        }
        catch {
            return { exists: true, writable: false, path: resolved };
        }
    }
    catch {
        return { exists: false, writable: false, path: resolved };
    }
}
let childProcessCapabilityCache = null;
const claudeLocalGatewayProbeCache = new Map();
function readClaudeSettingsEnv() {
    try {
        const file = path.join(os.homedir(), ".claude", "settings.json");
        if (!fs.existsSync(file))
            return {};
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return parsed?.env && typeof parsed.env === "object" && !Array.isArray(parsed.env) ? parsed.env : {};
    }
    catch {
        return {};
    }
}
function parseLocalHttpUrl(value) {
    try {
        const url = new URL(String(value || "").trim());
        const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
        if (!["127.0.0.1", "localhost", "::1"].includes(host))
            return null;
        const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
        if (!Number.isFinite(port) || port <= 0)
            return null;
        return { protocol: url.protocol, host, port, href: `${url.protocol}//${url.host}` };
    }
    catch {
        return null;
    }
}
function probeLocalTcpSync(host, port, timeoutMs = 1200) {
    const key = `${host}:${port}`;
    const cached = claudeLocalGatewayProbeCache.get(key);
    if (cached && Date.now() - cached.checkedAt < 30 * 1000)
        return cached.result;
    const script = [
        "const net=require('net');",
        "const host=process.argv[1];",
        "const port=Number(process.argv[2]);",
        "const timeout=Number(process.argv[3]||1200);",
        "const socket=net.createConnection({host,port});",
        "let done=false;",
        "function finish(ok,error){if(done)return;done=true;try{socket.destroy();}catch{};console.log(JSON.stringify({ok,error:error||''}));process.exit(ok?0:1);}",
        "socket.setTimeout(timeout,()=>finish(false,'timeout'));",
        "socket.on('connect',()=>finish(true,''));",
        "socket.on('error',err=>finish(false,err.code||err.message||String(err)));",
    ].join("");
    const result = (0, child_process_1.spawnSync)(process.execPath, ["-e", script, host, String(port), String(timeoutMs)], {
        encoding: "utf-8",
        timeout: Math.max(2000, timeoutMs + 1000),
        windowsHide: true,
    });
    let parsed = null;
    try {
        parsed = JSON.parse(String(result.stdout || "{}"));
    }
    catch { }
    const normalized = parsed && typeof parsed === "object"
        ? { ok: parsed.ok === true, error: String(parsed.error || "") }
        : { ok: false, error: result.error?.message || result.stderr || "tcp_probe_failed" };
    claudeLocalGatewayProbeCache.set(key, { checkedAt: Date.now(), result: normalized });
    return normalized;
}
function getClaudeLocalGatewayReadiness(probeTarget = null) {
    const rawAgentType = String(probeTarget?.agent_type || probeTarget?.agentType || "").trim();
    if (!rawAgentType)
        return null;
    const agentType = (0, runtime_1.normalizeAgentRuntimeId)(rawAgentType);
    if (agentType !== "claudecode")
        return null;
    const env = readClaudeSettingsEnv();
    const local = parseLocalHttpUrl(env.ANTHROPIC_BASE_URL);
    if (!local)
        return null;
    const probe = probeLocalTcpSync(local.host, local.port);
    if (probe.ok)
        return null;
    const message = `Claude Code 本地模型网关不可达：ANTHROPIC_BASE_URL=${local.href}，端口 ${local.port} 未连接（${probe.error || "connection_failed"}）`;
    return {
        ready: false,
        mode: "claude-local-gateway-unreachable",
        message,
        fix_actions: [
            `启动或恢复 ${local.href} 对应的 Claude/Anthropic 本地代理服务`,
            "或在 Claude Code 设置中移除/更新 ANTHROPIC_BASE_URL，改用可用的模型 API",
            "修复后在设置页点击“复检执行通道”或“立即恢复自动任务”",
        ],
        gateway: { baseUrl: local.href, host: local.host, port: local.port, ok: false, error: probe.error || "" },
    };
}
function getChildProcessCapability() {
    if (childProcessCapabilityCache)
        return childProcessCapabilityCache;
    try {
        const result = (0, child_process_1.spawnSync)(process.execPath, ["--version"], {
            encoding: "utf-8",
            timeout: 5000,
            windowsHide: true,
        });
        childProcessCapabilityCache = {
            ok: !result.error && result.status === 0,
            status: result.status,
            stdout: String(result.stdout || "").trim(),
            stderr: String(result.stderr || "").trim(),
            error: result.error ? `${result.error.code || ""} ${result.error.message || result.error}`.trim() : "",
        };
        return childProcessCapabilityCache;
    }
    catch (e) {
        childProcessCapabilityCache = { ok: false, status: null, stdout: "", stderr: "", error: e.message || String(e) };
        return childProcessCapabilityCache;
    }
}
function readRunnerJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
}
function normalizeAgentProbeTarget(target = {}) {
    return {
        groupId: String(target.group_id || target.groupId || "").trim(),
        project: String(target.project || target.target_member || target.targetMember || "").trim(),
        agentType: String(target.agent_type || target.agentType || "").trim(),
    };
}
function getAgentProbeTargetStatusKey(target) {
    return require("./collaboration-agent-probes").getAgentProbeTargetStatusKey(target);
}
function getAgentProbeTargetStatusFile(target) {
    const key = getAgentProbeTargetStatusKey(target);
    return key ? path.join(collaboration_runtime_task_queue_1.AGENT_PROBE_TARGET_STATUS_DIR, `${key}.json`) : "";
}
function attachAgentProbeAge(data) {
    if (!data)
        return null;
    const checkedAt = data?.checked_at ? Date.parse(data.checked_at) : 0;
    return {
        ...data,
        age_ms: checkedAt ? Date.now() - checkedAt : null,
    };
}
function readAgentProbeStatusFile(file) {
    try {
        if (!file || !fs.existsSync(file))
            return null;
        return attachAgentProbeAge(readRunnerJson(file));
    }
    catch {
        return null;
    }
}
function doesProbeTargetMatchRequired(probeTarget, requiredTarget) {
    const required = normalizeAgentProbeTarget(requiredTarget);
    if (!required.groupId && !required.project && !required.agentType)
        return true;
    const target = normalizeAgentProbeTarget(probeTarget);
    return (!required.groupId || target.groupId === required.groupId)
        && (!required.project || target.project === required.project)
        && (!required.agentType || target.agentType === required.agentType);
}
function listAgentProbeTargetStatuses(requiredTarget = null) {
    try {
        if (!fs.existsSync(collaboration_runtime_task_queue_1.AGENT_PROBE_TARGET_STATUS_DIR))
            return [];
        return fs.readdirSync(collaboration_runtime_task_queue_1.AGENT_PROBE_TARGET_STATUS_DIR)
            .filter(file => file.endsWith(".json"))
            .map(file => readAgentProbeStatusFile(path.join(collaboration_runtime_task_queue_1.AGENT_PROBE_TARGET_STATUS_DIR, file)))
            .filter(Boolean)
            .filter((probe) => !requiredTarget || doesProbeTargetMatchRequired(probe?.target, requiredTarget))
            .sort((a, b) => Date.parse(b?.checked_at || "") - Date.parse(a?.checked_at || ""));
    }
    catch {
        return [];
    }
}
function readAgentProbeStatus(requiredTarget = null) {
    return require("./collaboration-agent-probes").readAgentProbeStatus(requiredTarget);
}
function getAgentProbeHealth(probe) {
    return require("./collaboration-agent-probes").getAgentProbeHealth(probe);
}
function writeAgentProbeStatus(data) {
    try {
        if (!fs.existsSync(collaboration_runtime_task_queue_1.AGENT_RUNNER_DIR))
            fs.mkdirSync(collaboration_runtime_task_queue_1.AGENT_RUNNER_DIR, { recursive: true });
        const target = data?.target || null;
        const fixActions = Array.isArray(data?.fix_actions) && data.fix_actions.length
            ? data.fix_actions
            : (data?.readiness?.fix_actions || buildAgentExecutionFixActions({
                error: data?.message || data?.error || data?.output || "",
                agentType: target?.agent_type || data?.readiness?.probe?.target?.agent_type || "",
                probe: data,
            }));
        const payload = {
            success: !!data?.success,
            blocked: !!data?.blocked,
            message: String(data?.message || data?.error || "").slice(0, 1000),
            error: String(data?.error || "").slice(0, 1000),
            fix_actions: (0, collaboration_runtime_status_helpers_1.uniqueStrings)(fixActions).slice(0, 6),
            target: target ? {
                group_id: target.group_id || "",
                group_name: target.group_name || "",
                project: target.project || "",
                agent_type: target.agent_type || "",
                work_dir: target.work_dir || "",
            } : null,
            execution_path: data?.execution_path || data?.readiness?.mode || "",
            expected_marker: data?.expected_marker || "CCM_AGENT_PROBE_OK",
            output_preview: String(data?.output || "").slice(0, 1000),
            duration_ms: Number(data?.duration_ms || 0),
            capabilities: data?.capabilities && typeof data.capabilities === "object" ? data.capabilities : null,
            native_session: data?.native_session && typeof data.native_session === "object" ? data.native_session : null,
            readiness_mode: data?.readiness?.mode || "",
            checked_at: new Date().toISOString(),
        };
        const writeJsonAtomic = (file) => {
            const dir = path.dirname(file);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            const tmp = `${file}.${process.pid}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf-8");
            fs.renameSync(tmp, file);
        };
        writeJsonAtomic(collaboration_runtime_task_queue_1.AGENT_PROBE_STATUS_FILE);
        const targetFile = getAgentProbeTargetStatusFile(target);
        if (targetFile)
            writeJsonAtomic(targetFile);
    }
    catch { }
}
function buildRunnerFixHint(error, agentType) {
    const command = (0, runtime_1.getAgentCommandLabel)(agentType);
    const text = String(error || "");
    if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        return `请先在同一台机器上确认 ${command} 可以连接模型 API；当前 Runner 能启动命令，但底层 CLI/API 连接被拒绝`;
    }
    if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
        return `请安装或加入 PATH：${command}`;
    }
    if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
        return `请检查 ${command} 的登录状态或 API Key 权限`;
    }
    return `请在子 Agent 工作目录中手动运行 ${command} 验证 CLI 是否可用`;
}
function buildAgentExecutionFixActions(input = {}) {
    const text = [input.error, input.probe?.message, input.probe?.error, input.externalRunner?.last_result?.error, input.externalRunner?.last_result?.output]
        .filter(Boolean)
        .join("\n");
    const agentType = input.agentType || input.externalRunner?.last_result?.agentType || input.probe?.target?.agent_type || "claudecode";
    const command = (0, runtime_1.getAgentCommandLabel)(agentType);
    const actions = [];
    if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        actions.push(`在同一台机器的普通终端里运行 ${command}，确认它能连接模型 API`);
        actions.push("检查 Claude/Codex 等 CLI 的登录状态、代理环境变量、网络出口和模型 API Base URL");
        actions.push("如果使用本地代理或转发服务，先确认服务端口正在监听且没有被防火墙拦截");
    }
    else if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
        actions.push(`安装对应 CLI，或把 ${command} 所在目录加入 PATH`);
    }
    else if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
        actions.push(`重新登录或刷新 ${command} 的 API Key/Token 权限`);
    }
    else if (/spawn\s+EPERM|spawnSync .* EPERM/i.test(text) || input.childProcess?.ok === false) {
        actions.push("当前 Node 进程不能直接启动子 Agent CLI；在独立 PowerShell 里运行 npm run agent-runner:ps");
        actions.push("确认外部 Agent Runner 在线后，再点击“复检执行通道”或“立即恢复自动任务”");
    }
    else {
        actions.push(`在子 Agent 工作目录中手动运行 ${command}，确认 CLI 能正常返回`);
    }
    actions.push("修复后在设置页点击“复检执行通道”或“立即恢复自动任务”，系统会自动重试等待中的开发任务");
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)(actions).slice(0, 6);
}
function getAgentProbeOutputFailure(output) {
    return require("./collaboration-agent-probes").getAgentProbeOutputFailure(output);
}
function getAgentExecutionReadiness(probeTarget = null) {
    return require("./collaboration-agent-probes").getAgentExecutionReadiness(probeTarget);
}
function enforceAgentProbeExecutionReadiness(capability = {}) {
    return require("./collaboration-agent-probes").enforceAgentProbeExecutionReadiness(capability);
}
function getAgentProbeExecutionReadiness(probeTarget = null) {
    return enforceAgentProbeExecutionReadiness({
        childProcess: getChildProcessCapability(),
        externalRunner: getExternalAgentRunnerStatus(),
        probe: readAgentProbeStatus(probeTarget),
        probeTarget,
    });
}
function taskRequiresFreshAgentProbe(task) {
    return task?.workflow_type === "daily_dev";
}
function getTaskRequiredProbeTarget(task) {
    const meta = task?.workflow_meta || task?.workflowMeta || {};
    const groupId = String(task?.group_id || task?.groupId || meta.group_id || meta.groupId || "").trim();
    const targetMember = String(meta.target_member || meta.targetMember || meta.probe_target_project || meta.probeTargetProject || "").trim();
    const targetProject = String(task?.target_project || task?.targetProject || "").trim();
    const project = targetMember || (task?.assign_type === "project" || !task?.assign_type ? targetProject : "");
    const taskRuntime = String(task?.runtime_overrides?.[project]
        || task?.runtime_overrides?.["*"]
        || task?.runtime_override
        || "").trim();
    const agentType = String(meta.agent_type || meta.agentType || meta.probe_agent_type || meta.probeAgentType || taskRuntime || "").trim();
    return { groupId, project, agentType };
}
function getProbeTargetLabel(probe) {
    const target = probe?.target || {};
    const project = String(target.project || "").trim();
    const agentType = String(target.agent_type || target.agentType || "").trim();
    return [project, agentType].filter(Boolean).join(" / ") || "未知目标";
}
function doesProbeMatchTaskTarget(probe, task) {
    const required = getTaskRequiredProbeTarget(task);
    if (!required.groupId && !required.project && !required.agentType)
        return true;
    return doesProbeTargetMatchRequired(probe?.target, required);
}
function taskNeedsGroupWideAgentProbe(task) {
    return require("./collaboration-agent-probes").taskNeedsGroupWideAgentProbe(task);
}
function getExecutableProbeTargetsFromDevGroup(group) {
    return (group?.members || [])
        .filter((member) => member.configured && member.workDirExists && member.workDirWritable)
        .map((member) => ({
        group_id: group.id,
        group_name: group.name || group.id,
        project: member.project,
        agent_type: member.agentType || member.agent || "claudecode",
        work_dir: member.workDir || "",
        requires_write: member.requiresWrite !== false,
    }));
}
function getExecutableProbeTargetsForTaskGroup(task) {
    if (!taskNeedsGroupWideAgentProbe(task))
        return null;
    const required = getTaskRequiredProbeTarget(task);
    const groups = (0, storage_1.loadGroups)();
    const configs = (0, db_1.getConfigs)();
    const group = groups
        .map((item) => (0, group_orchestrator_1.normalizeGroupOrchestrator)(item))
        .find((item) => String(item.id || "").trim() === required.groupId);
    if (!group)
        return [];
    const routableMembers = (0, group_orchestrator_1.getRoutableMembers)(group);
    const members = routableMembers.map((member) => {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(member.project, group, configs);
        const taskRuntime = String(task?.runtime_overrides?.[member.project]
            || task?.runtime_overrides?.["*"]
            || task?.runtime_override
            || "").trim();
        const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
        return {
            project: member.project,
            configured: !!runtime,
            // A user-selected task executor is the authoritative probe target for
            // this task.  Otherwise a healthy fallback could never pass admission
            // when the project's static primary runtime is down.
            agentType: taskRuntime || runtime?.agentType || member.agent || "",
            workDir: runtime?.workDir || "",
            workDirExists: !!workDirState?.exists,
            workDirWritable: !!workDirState?.writable,
        };
    });
    return getExecutableProbeTargetsFromDevGroup({
        id: group.id,
        name: group.name || group.id,
        members,
    });
}
function summarizeAgentProbeTargets(targets, probeResolver = readAgentProbeStatus) {
    return require("./collaboration-agent-probes").summarizeAgentProbeTargets(targets, probeResolver);
}
function getTaskGroupAgentProbeReadiness(task) {
    const rawTargets = getExecutableProbeTargetsForTaskGroup(task);
    const targets = rawTargets?.map((target) => ({ ...target, requires_write: (0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(task) }));
    if (!targets)
        return null;
    const summary = summarizeAgentProbeTargets(targets);
    const failed = summary.rows.filter((row) => !row.ready);
    const failedLabels = failed
        .slice(0, 5)
        .map((row) => `${row.project || "unknown"}(${row.agent_type || "agent"}:${row.probeHealth?.status || "missing"})`)
        .join("、");
    const groupLabel = String(targets[0]?.group_name || getTaskRequiredProbeTarget(task).groupId || "目标群聊").trim();
    return {
        ready: summary.allReady,
        mode: "group-target-agent-cli-probe",
        message: summary.allReady
            ? `daily_dev 群聊任务已具备真实执行准入：${groupLabel} 的 ${summary.ready}/${summary.total} 个可执行项目 Agent 探针近期成功`
            : `daily_dev 群聊任务需要所有可执行项目 Agent 通过真实 CLI 探针：${groupLabel} 当前通过 ${summary.ready}/${summary.total}，未复检 ${summary.missing}，过期 ${summary.stale}，最近失败 ${summary.failed_recent}${failedLabels ? `；未通过：${failedLabels}` : ""}`,
        summary,
        fix_actions: [
            "在设置页的“项目 Agent 执行探针”中点击“复检全部”，让系统实际调用该群聊下每个可执行项目 Agent CLI",
            "也可以逐个选择项目 Agent 复检；全部通过后再恢复 daily_dev 群聊任务",
        ],
    };
}
function enforceTaskAgentProbeReadiness(task, readiness) {
    return require("./collaboration-agent-probes").enforceTaskAgentProbeReadiness(task, readiness);
}
// ===== merged from collaboration-runtime-plan-tools-part-02.ts =====
function getTaskAgentExecutionReadiness(task) {
    return require("./collaboration-agent-probes").getTaskAgentExecutionReadiness(task);
}
function getExternalAgentRunnerStatus() {
    const runnerDir = path.join(utils_1.CCM_DIR, "agent-runner");
    const heartbeatFile = path.join(runnerDir, "heartbeat.json");
    const requestsDir = path.join(runnerDir, "requests");
    const resultsDir = path.join(runnerDir, "results");
    let heartbeat = null;
    try {
        if (fs.existsSync(heartbeatFile))
            heartbeat = readRunnerJson(heartbeatFile);
    }
    catch { }
    const updatedAt = heartbeat?.updated_at ? Date.parse(heartbeat.updated_at) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : null;
    const pid = heartbeat?.pid ? Number(heartbeat.pid) : 0;
    let processAlive = false;
    if (pid > 0) {
        try {
            process.kill(pid, 0);
            processAlive = true;
        }
        catch {
            processAlive = false;
        }
    }
    const activeWindowMs = heartbeat?.status === "running" ? 10 * 60 * 1000 : 15000;
    const active = !!heartbeat && processAlive && ageMs !== null && ageMs < activeWindowMs && heartbeat.status !== "error";
    const listJsonFiles = (dir) => {
        try {
            return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith(".json")) : [];
        }
        catch {
            return [];
        }
    };
    const requestFiles = listJsonFiles(requestsDir);
    const resultFiles = listJsonFiles(resultsDir);
    const resultIds = new Set(resultFiles.map(file => file.replace(/\.json$/, "")));
    const pendingRequests = requestFiles.filter(file => !resultIds.has(file.replace(/\.json$/, ""))).length;
    let lastResult = null;
    try {
        if (fs.existsSync(resultsDir)) {
            const latest = resultFiles
                .map(file => {
                const full = path.join(resultsDir, file);
                const stat = fs.statSync(full);
                return { file, full, mtimeMs: stat.mtimeMs };
            })
                .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
            if (latest) {
                const data = readRunnerJson(latest.full);
                lastResult = {
                    id: data?.id || latest.file.replace(/\.json$/, ""),
                    success: data?.success !== false,
                    error: String(data?.error || "").slice(0, 500),
                    output: String(data?.output || "").slice(0, 500),
                    agentType: data?.agentType || "",
                    command: data?.command || (0, runtime_1.getAgentCommandLabel)(data?.agentType || ""),
                    exitCode: data?.exitCode ?? null,
                    runner: data?.runner || "",
                    completed_at: data?.completed_at || new Date(latest.mtimeMs).toISOString(),
                    age_ms: Date.now() - latest.mtimeMs,
                };
                lastResult.hint = buildRunnerFixHint(lastResult.error || lastResult.output, lastResult.agentType || "");
            }
        }
    }
    catch { }
    return {
        active,
        status: heartbeat?.status || "missing",
        detail: heartbeat?.detail || "",
        pid: pid || null,
        process_alive: processAlive,
        updated_at: heartbeat?.updated_at || "",
        age_ms: ageMs,
        pending_requests: pendingRequests,
        requests: requestFiles.length,
        results: resultFiles.length,
        last_result: lastResult,
    };
}
function buildAgentProbeMatrix(devGroups) {
    const targets = devGroups.flatMap((group) => (group.members || []).map((member) => {
        const target = {
            group_id: group.id,
            group_name: group.name || group.id,
            project: member.project,
            agent_type: member.agentType || member.agent || "claudecode",
            work_dir: member.workDir || "",
        };
        const fallbackRow = member.configured && member.workDirExists && member.workDirWritable
            ? summarizeAgentProbeTargets([{ ...target, requires_write: true }]).rows[0]
            : null;
        const probe = fallbackRow?.probe || null;
        const probeHealth = fallbackRow?.probeHealth || getAgentProbeHealth(probe);
        const taskReadiness = member.configured && member.workDirExists && member.workDirWritable
            ? {
                ready: fallbackRow?.ready === true,
                mode: fallbackRow?.fallback_active ? "fallback-agent-cli-probe" : "agent-cli-probe",
                message: fallbackRow?.ready
                    ? (fallbackRow?.fallback_active
                        ? `默认执行器不可用，备用执行器 ${fallbackRow.effective_agent_type} 已通过真实写入探针`
                        : "目标执行器已通过真实写入探针")
                    : (probeHealth.message || "目标项目 Agent 尚未通过探针"),
                fix_actions: [],
            }
            : {
                ready: false,
                mode: "member-not-executable",
                message: !member.configured
                    ? "项目 Agent 未配置执行器或工作目录"
                    : (!member.workDirExists ? "项目 Agent 工作目录不存在" : "项目 Agent 工作目录不可写"),
            };
        const status = taskReadiness.ready === true
            ? "ok"
            : (member.configured && member.workDirExists && member.workDirWritable ? "warn" : "fail");
        return {
            key: getAgentProbeTargetStatusKey(target),
            status,
            ready: taskReadiness.ready === true,
            group_id: group.id,
            group_name: group.name || group.id,
            project: member.project,
            role: member.role || "member",
            agent_type: target.agent_type,
            effective_agent_type: fallbackRow?.effective_agent_type || target.agent_type,
            fallback_active: fallbackRow?.fallback_active === true,
            runtime_candidates: fallbackRow?.runtime_candidates || [],
            command: (0, runtime_1.getAgentCommandLabel)(fallbackRow?.effective_agent_type || target.agent_type),
            configured: !!member.configured,
            workDir: member.workDir || "",
            workDirExists: !!member.workDirExists,
            workDirWritable: !!member.workDirWritable,
            probe,
            probeHealth,
            readiness: {
                ready: taskReadiness.ready === true,
                mode: taskReadiness.mode || "",
                message: taskReadiness.message || probeHealth.message || "",
                fix_actions: Array.isArray(taskReadiness.fix_actions) ? taskReadiness.fix_actions : [],
            },
            checked_at: probe?.checked_at || "",
            age_ms: probe?.age_ms ?? null,
            message: taskReadiness.ready === true
                ? "目标项目 Agent 可执行 daily_dev"
                : (taskReadiness.message || probeHealth.message || "目标项目 Agent 尚未通过探针"),
        };
    }));
    const executable = targets.filter((target) => target.configured && target.workDirExists && target.workDirWritable);
    const ready = executable.filter((target) => target.ready);
    const stale = executable.filter((target) => target.probeHealth?.status === "stale_ok" || target.probeHealth?.status === "stale_failed");
    const missing = executable.filter((target) => target.probeHealth?.status === "missing");
    const failedRecent = executable.filter((target) => target.probeHealth?.failureRecent);
    const groupSummaries = devGroups.map((group) => {
        const groupTargets = getExecutableProbeTargetsFromDevGroup(group);
        const summary = summarizeAgentProbeTargets(groupTargets);
        return {
            group_id: group.id,
            group_name: group.name || group.id,
            orchestratorEnabled: group.orchestratorEnabled !== false,
            executable: summary.total,
            ready: summary.ready,
            missing: summary.missing,
            stale: summary.stale,
            failed_recent: summary.failed_recent,
            all_ready: summary.allReady,
            targets: summary.rows.map((row) => ({
                project: row.project,
                agent_type: row.agent_type,
                effective_agent_type: row.effective_agent_type || row.agent_type,
                fallback_active: row.fallback_active === true,
                ready: row.ready,
                probe_status: row.probeHealth?.status || "missing",
            })),
        };
    });
    const fullyReadyGroups = groupSummaries.filter((group) => group.orchestratorEnabled && group.executable > 0 && group.all_ready);
    return {
        total: targets.length,
        executable: executable.length,
        ready: ready.length,
        blocked: targets.filter((target) => !target.ready).length,
        missing: missing.length,
        stale: stale.length,
        failed_recent: failedRecent.length,
        group_total: groupSummaries.length,
        group_ready: fullyReadyGroups.length,
        groups: groupSummaries,
        targets,
    };
}
function buildDailyDevAgentDiagnostics() {
    return require("./collaboration-agent-probes").buildDailyDevAgentDiagnostics();
}
function getAgentProbeBatchTargets(payload = {}) {
    const diagnostics = buildDailyDevAgentDiagnostics();
    const includeReady = !!(payload.include_ready || payload.includeReady);
    const onlyMissing = !!(payload.only_missing || payload.onlyMissing);
    const groupId = String(payload.group_id || payload.groupId || "").trim();
    const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
    const requestedKeys = new Set(requestedTargets.map((target) => [
        String(target.group_id || target.groupId || "").trim(),
        String(target.target_member || target.targetMember || target.project || "").trim(),
    ].filter(Boolean).join("::")).filter(Boolean));
    const limit = Math.max(1, Math.min(20, Number(payload.limit || requestedTargets.length || 3)));
    const targets = (diagnostics.agent_probe_matrix?.targets || [])
        .filter((target) => target.configured && target.workDirExists && target.workDirWritable)
        .filter((target) => !groupId || target.group_id === groupId)
        .filter((target) => {
        if (requestedKeys.size === 0)
            return true;
        return requestedKeys.has(`${target.group_id}::${target.project}`) || requestedKeys.has(target.group_id) || requestedKeys.has(target.project);
    })
        .filter((target) => includeReady || !target.ready)
        .filter((target) => !onlyMissing || target.probeHealth?.status === "missing")
        .slice(0, limit);
    return { targets, diagnostics, limit, includeReady, onlyMissing };
}
async function runAgentCliProbeBatch(payload, ctx) {
    const selection = getAgentProbeBatchTargets(payload);
    const timeoutMs = Number(payload.timeout_ms || payload.timeoutMs || 120000);
    const dryRun = !!(payload.dry_run || payload.dryRun);
    if (dryRun) {
        return {
            success: true,
            dry_run: true,
            total: selection.targets.length,
            passed: 0,
            failed: 0,
            skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
            limit: selection.limit,
            include_ready: selection.includeReady,
            only_missing: selection.onlyMissing,
            auto_resume: false,
            resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
            targets: selection.targets.map((target) => ({
                group_id: target.group_id,
                group_name: target.group_name,
                project: target.project,
                agent_type: target.agent_type,
                command: target.command,
                probe_status: target.probeHealth?.status || "missing",
            })),
            probe_matrix: selection.diagnostics.agent_probe_matrix,
            message: selection.targets.length === 0 ? "没有需要批量复检的可执行项目 Agent" : `将复检 ${selection.targets.length} 个项目 Agent`,
        };
    }
    const results = [];
    for (const target of selection.targets) {
        const result = await (0, collaboration_runtime_daily_dev_1.runAgentCliProbe)({
            ...payload,
            group_id: target.group_id,
            target_member: target.project,
            timeout_ms: timeoutMs,
            source: "agent-cli-probe-batch",
        }, ctx);
        results.push({
            group_id: target.group_id,
            group_name: target.group_name,
            project: target.project,
            agent_type: target.agent_type,
            success: !!result?.success,
            blocked: !!result?.blocked,
            message: result?.message || result?.error || "",
            result,
        });
    }
    const after = buildDailyDevAgentDiagnostics();
    return {
        success: results.some((item) => item.success),
        total: selection.targets.length,
        passed: results.filter((item) => item.success).length,
        failed: results.filter((item) => !item.success).length,
        skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
        limit: selection.limit,
        include_ready: selection.includeReady,
        only_missing: selection.onlyMissing,
        timeout_ms: timeoutMs,
        auto_resume: false,
        resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
        results,
        probe_matrix: after.agent_probe_matrix,
        message: results.length === 0
            ? "没有需要批量复检的可执行项目 Agent"
            : `批量复检完成：通过 ${results.filter((item) => item.success).length}/${results.length}`,
    };
}
function buildCoordinatorSharedFilesContext(ctx, group, options = {}) {
    const groupId = String(group?.id || "").trim();
    if (!groupId)
        return undefined;
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const contextPolicy = (0, main_agent_context_policy_1.resolveMainAgentContextPolicy)(config, group?.context_policy || group?.contextPolicy || {}).effective;
    const contextWindow = Number((0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config).effectiveContextWindow || 200_000);
    const budget = (0, main_agent_context_source_continuity_1.calculateContextSourceBudget)({ contextWindow, catalogPercent: contextPolicy.contextSourceCatalogBudgetPercent, hydrationPercent: contextPolicy.contextSourceHydrationBudgetPercent });
    (0, shared_files_v2_1.migrateLegacySharedFilesV2)("group", groupId, group?.shared_files || [], "groups-v1");
    const projection = (0, shared_files_v2_1.buildSharedFilesContextV2)("group", groupId, {
        contextWindow,
        hydrationBudgetPercent: contextPolicy.contextSourceHydrationBudgetPercent,
        remainingSafeTokens: budget.hydrationTargetTokens,
        explicitText: options.message,
        title: "以下是当前群聊已授权共享文档/文件。主 Agent拆分任务时必须引用对应文件与分片证据：",
    });
    const identity = options.groupSessionId ? (0, main_agent_post_compact_continuity_1.resolveMainAgentContinuityIdentity)({ agentKind: "group", scope: "group", scopeId: groupId, exactSessionId: options.groupSessionId, generation: Number(options.generation || 0) }) : null;
    const projects = (0, group_orchestrator_1.getRoutableMembers)(group).map((member) => ({ name: String(member?.project || "") })).filter((item) => item.name);
    const catalog = (0, main_agent_context_source_continuity_1.buildContextSourceCatalog)({
        sources: (0, main_agent_context_source_continuity_1.listContextSourceCatalogEntries)({ sharedScope: "group", sharedScopeId: groupId, knowledgeContext: { role: "group-main-agent", groupId, projects } }),
        maxTokens: budget.catalogTargetTokens,
        explicitText: options.message,
        recentReceipts: identity ? (0, main_agent_context_source_continuity_1.readContextSourceContinuity)(identity).receipts : [],
    });
    if (identity) {
        (0, main_agent_context_source_continuity_1.recordContextSourceCatalog)(identity, catalog, budget);
        (0, main_agent_context_source_continuity_1.recordSharedFileProjection)(identity, projection, { ...budget, catalogUsedTokens: catalog.usedTokens, sharedFileTokens: projection.total_tokens, hydrationUsedTokens: projection.total_tokens });
    }
    const restoredSources = identity && identity.generation > 0 ? (0, main_agent_context_source_continuity_1.restoreContextSources)({
        identity,
        knowledgeContext: { role: "group-main-agent", groupId, projects },
        explicitText: options.message,
        maxPerItemTokens: contextPolicy.postCompactSourcePerItemMaxTokens,
        maxTotalTokens: contextPolicy.postCompactSourceTotalMaxTokens,
        hydrationTargetTokens: budget.hydrationTargetTokens,
        remainingSafeTokens: budget.remainingSafeTokens,
    }).context : "";
    const context = [catalog.context, restoredSources, projection.context].filter(Boolean).join("\n\n");
    return context.trim() ? context : undefined;
}
function buildTaskSourceDocumentsContext(task) {
    const lines = [
        "[任务级业务/接口文档]",
        task?.business_goal || task?.businessGoal ? `业务目标：${(0, memory_1.compactMemoryText)(task.business_goal || task.businessGoal, 600)}` : "",
        task?.acceptance_criteria || task?.acceptanceCriteria ? `验收标准：${(0, memory_1.compactMemoryText)(task.acceptance_criteria || task.acceptanceCriteria, 800)}` : "",
        task?.source_documents || task?.sourceDocuments ? `关联文档：${(0, memory_1.compactMemoryText)(task.source_documents || task.sourceDocuments, 12_000)}` : "",
        task?.source_attachment_context || task?.sourceAttachmentContext
            ? (0, memory_1.compactMemoryText)(task.source_attachment_context || task.sourceAttachmentContext, 50_000)
            : "",
    ].filter(Boolean);
    return lines.length > 1 ? lines.join("\n") : "";
}
function mergeCoordinatorDocumentContexts(...contexts) {
    const text = contexts
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n\n");
    return text || undefined;
}
function runCollaborationProtocolSelfTest() {
    return require("./collaboration-protocol-self-tests").runCollaborationProtocolSelfTest();
}
function normalizeToolSelection(tools = {}) {
    return {
        mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x) => String(x || "").trim()).filter(Boolean) : [],
        skill: Array.isArray(tools.skill) ? tools.skill.map((x) => String(x || "").trim()).filter(Boolean) : [],
    };
}
function mergeToolSelections(...items) {
    const merged = { mcp: new Set(), skill: new Set() };
    for (const item of items) {
        const normalized = normalizeToolSelection(item);
        for (const name of normalized.mcp)
            merged.mcp.add(name);
        for (const name of normalized.skill)
            merged.skill.add(name);
    }
    return {
        mcp: Array.from(merged.mcp),
        skill: Array.from(merged.skill),
    };
}
function getProjectToolSelection(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
}
function getProjectExtraConfig(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return configs?.[projectName] || {};
}
function normalizeProjectConfigList(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function getProjectAgentCapabilityProfile(projectName, workDir = "") {
    const config = getProjectExtraConfig(projectName);
    const verification = (0, collaboration_runtime_runtime_tools_1.getProjectVerificationHintDetail)(projectName, workDir);
    const responsibility = String(config.responsibility || config.role_scope || config.roleScope || "").trim();
    const capabilities = normalizeProjectConfigList(config.capabilities || config.capability_tags || config.capabilityTags);
    const writablePaths = normalizeProjectConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths);
    const forbiddenPaths = normalizeProjectConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths);
    const deliveryContract = String(config.delivery_contract || config.deliveryContract || "").trim();
    return {
        project: projectName,
        configured: !!(responsibility || capabilities.length || writablePaths.length || forbiddenPaths.length || deliveryContract || verification.commands.length),
        responsibility,
        capabilities,
        writable_paths: writablePaths,
        forbidden_paths: forbiddenPaths,
        delivery_contract: deliveryContract,
        verification_source: verification.source,
        verification_commands: verification.commands,
        work_dir: workDir || "",
    };
}
function buildProjectAgentProfileContractLines(profile) {
    return require("./collaboration-coordination-ux").buildProjectAgentProfileContractLines.apply(null, arguments);
}
function normalizePolicyPath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}
function policyPathMatches(filePath, pattern) {
    const file = normalizePolicyPath(filePath);
    const raw = normalizePolicyPath(pattern);
    if (!raw || raw === "**" || raw === "**/*" || raw === "*")
        return true;
    const prefix = raw.replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
    return file === prefix || file.startsWith(`${prefix}/`);
}
function collectProjectPolicyViolations(actualFileChanges = [], evidenceExclusions = []) {
    const violations = [];
    const excludedPaths = new Set((evidenceExclusions || []).map((item) => normalizePolicyPath(typeof item === "string" ? item : item?.path)).filter(Boolean));
    for (const change of actualFileChanges || []) {
        const agent = String(change?.agent || "").trim();
        const filePath = normalizePolicyPath(change?.path);
        if (!agent || !filePath)
            continue;
        if (excludedPaths.has(filePath))
            continue;
        const profile = getProjectAgentCapabilityProfile(agent);
        const writable = Array.isArray(profile.writable_paths) ? profile.writable_paths : [];
        const forbidden = Array.isArray(profile.forbidden_paths) ? profile.forbidden_paths : [];
        // These directories are generated by CCM while preparing native runtimes.
        // They are orchestration metadata, not an agent-authored project deliverable.
        if ([".claude", ".cursor", ".codex"].some(prefix => filePath === prefix || filePath.startsWith(`${prefix}/`)))
            continue;
        // Older evidence produced before the porcelain parser fix may be missing the
        // first character of a tracked path (for example `ackend/` -> `backend/`).
        // Reconcile only when it unambiguously matches a configured writable prefix.
        const repairedPath = writable.reduce((current, pattern) => {
            if (current !== filePath)
                return current;
            const prefix = normalizePolicyPath(pattern).replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
            if (prefix.length > 1 && (filePath === prefix.slice(1) || filePath.startsWith(`${prefix.slice(1)}/`))) {
                return `${prefix[0]}${filePath}`;
            }
            return current;
        }, filePath);
        const forbiddenMatch = forbidden.find((pattern) => policyPathMatches(repairedPath, pattern));
        if (forbiddenMatch) {
            violations.push({ agent, path: repairedPath, rule: "forbidden_paths", pattern: forbiddenMatch, message: `${agent} 修改了禁止范围 ${forbiddenMatch}: ${repairedPath}` });
            continue;
        }
        const hasStrictWritable = writable.length > 0 && !writable.some((pattern) => ["**", "**/*", "*"].includes(normalizePolicyPath(pattern)));
        if (hasStrictWritable && !writable.some((pattern) => policyPathMatches(repairedPath, pattern))) {
            violations.push({ agent, path: repairedPath, rule: "writable_paths", pattern: writable.join("; "), message: `${agent} 文件变更不在允许写入范围: ${repairedPath}` });
        }
    }
    return violations;
}
function buildAgentToolContext(ctx, group, projectName, taskText = "", selectedSkillNames = []) {
    const selectedRoleSkills = (0, role_skills_1.selectRoleSkills)("project-child-agent", taskText, {
        forceWork: true,
        phase: "execution",
        selectedSkillNames,
        modelDecision: { actionRequired: true, selectedSkills: selectedSkillNames },
    });
    const configuredTools = (0, tool_authorization_1.normalizeToolAuthorization)(mergeToolSelections(group?.tools || {}, getProjectToolSelection(projectName)));
    const executionRoleSkills = selectedRoleSkills.map(skill => skill.name);
    const allowedTools = {
        ...(0, tool_authorization_1.normalizeToolAuthorization)(mergeToolSelections(configuredTools, { skill: executionRoleSkills })),
        configuredTools,
        executionRoleSkills,
        enforceExecutionRoleSkills: true,
    };
    const prompt = [
        (0, role_skills_1.buildSelectedSkillUsageDirective)(selectedRoleSkills),
        ctx.toolManager.buildToolPrompt(allowedTools),
    ].filter(Boolean).join("\n\n");
    const toolAudit = typeof ctx.toolManager.buildScopeAudit === "function" ? ctx.toolManager.buildScopeAudit(allowedTools) : null;
    const authorizationReadiness = (0, tool_authorization_1.buildAuthorizationReadiness)(toolAudit, allowedTools);
    return {
        prompt,
        allowedTools,
        toolAudit,
        authorizationReadiness,
        configuredTools,
        executionRoleSkills,
        selectedRoleSkills: selectedRoleSkills.map(skill => ({ name: skill.name, kind: skill.kind, reason: skill.reason })),
    };
}
//# sourceMappingURL=collaboration-runtime-plan-tools.js.map