"use strict";
// Behavior-freeze split from global-agent-loop-engine.ts (part 1/2).
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGlobalAgentSupervisionState = exports.globalSupervisionStateVisibleSummary = exports.completeGlobalAgentSupervision = exports.attachGlobalAgentRunSupervision = void 0;
exports.emitGlobalDispatchLaunchProgress = emitGlobalDispatchLaunchProgress;
exports.emit = emit;
exports.classifyGlobalAgentUserSteer = classifyGlobalAgentUserSteer;
exports.buildGlobalAgentEffectiveGoal = buildGlobalAgentEffectiveGoal;
exports.steerGlobalAgentRun = steerGlobalAgentRun;
exports.applyGlobalAgentSupervisionSteer = applyGlobalAgentSupervisionSteer;
exports.applyPendingGlobalAgentUserSteers = applyPendingGlobalAgentUserSteers;
exports.applyGlobalResumeFeedback = applyGlobalResumeFeedback;
exports.buildGlobalRunWorkchain = buildGlobalRunWorkchain;
exports.buildGlobalDisplayStreamFromWorkchain = buildGlobalDisplayStreamFromWorkchain;
exports.completeRun = completeRun;
const crypto = __importStar(require("crypto"));
const reliability_ledger_1 = require("../../system/reliability-ledger");
const global_agent_metrics_1 = require("./global-agent-metrics");
const reasoning_loop_1 = require("../reasoning-loop");
const runtime_1 = require("./runtime");
const workchain_1 = require("../workchain");
const delivery_report_1 = require("../delivery-report");
const global_agent_run_supervision_1 = require("./global-agent-run-supervision");
const globalAgentRunProjection = __importStar(require("./global-agent-run-projection"));
const globalAgentRunReplies = __importStar(require("./global-agent-run-replies"));
const globalAgentRunStore = __importStar(require("./global-agent-run-store"));
const { compactObservation, GLOBAL_MODEL_ROUTE_KEYS, GLOBAL_MODEL_FORBIDDEN_FIELD, GROUP_SESSION_ID_PATTERN, redactGroupSessionIds, redactGroupSessionFields, projectRoutingValue, projectProjectRows, projectGroupRows, projectGlobalTaskRows, projectGlobalAgentObservationForModel, projectGlobalAgentReasoningForModel, parseGlobalAgentDecision, normalizeDecision, buildToolPrompt, buildGlobalAgentModelMessages } = globalAgentRunProjection;
const { nowIso, stripNonExecutionReportSections, GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN, hasGlobalUserSummaryTechnicalDetails, compactGlobalUserSummaryText, uniqueGlobalStrings, sanitizeGlobalVisibleReplyTerminology, globalVisibleReplyFallback, buildGlobalVisibleReplyContent, attachGlobalReplyTechnicalContent, getGlobalToolUserLabel, summarizeGlobalToolTarget, buildGlobalClarificationSummary, buildGlobalConfirmationSummary, buildGlobalPlanSteps, buildGlobalPlanExecutionFollowup, buildGlobalPlanModeSummary, updateGlobalPlanModeStatus, GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN, sanitizeGlobalDispatchVisibleText, normalizeDispatchDependency, buildGlobalDispatchRow, isGlobalDispatchTool, normalizeGlobalDispatchLaunchRowStatus, buildGlobalDispatchLaunchSummary } = globalAgentRunReplies;
const { GLOBAL_AGENT_TOOL_SPECS, STORE_DIR, STORE_FILE, STORE_BACKUP, MAX_STORED_RUNS, MAX_OBSERVATION_CHARS, GLOBAL_DISPATCH_TOOL_NAMES, activeRuns, pauseRequests, cancelRequests, volatileRuns, activeRunObjects, destructiveOperation, writeJsonAtomic, normalizeGlobalAgentUserSteer, normalizeGlobalAgentUserSteers, normalizeRun, loadStore, saveRun, getGlobalAgentRun, listGlobalAgentRuns, findWaitingGlobalAgentRun, findClarifyingGlobalAgentRun, getGlobalAgentToolSpec, classifyGlobalAgentToolRisk, classifyGlobalAgentRunPresentation, isReadOnlyGlobalConsultation, stable, toolSignature, validateTool } = globalAgentRunStore;
_a = (0, global_agent_run_supervision_1.createGlobalAgentRunSupervision)({ appendTraceEvent: reliability_ledger_1.appendTraceEvent, buildGlobalDisplayStreamFromWorkchain, buildGlobalRunWorkchain, getGlobalAgentRun, normalizeRun, recordGlobalAgentRuntimeOutput: runtime_1.recordGlobalAgentRuntimeOutput, saveRun, volatileRuns }), exports.attachGlobalAgentRunSupervision = _a.attachGlobalAgentRunSupervision, exports.completeGlobalAgentSupervision = _a.completeGlobalAgentSupervision, exports.globalSupervisionStateVisibleSummary = _a.globalSupervisionStateVisibleSummary, exports.updateGlobalAgentSupervisionState = _a.updateGlobalAgentSupervisionState;
function emitGlobalDispatchLaunchProgress(runtime, run, step) {
    if (!isGlobalDispatchTool(step.tool?.name) || step.error || step.observation?.success === false || step.observation?.error)
        return;
    const dispatchLaunchSummary = buildGlobalDispatchLaunchSummary(run, run.status || "running", [...run.steps, step]);
    if (!dispatchLaunchSummary?.rows?.length)
        return;
    emit(runtime, {
        type: "dispatch_launch_summary",
        tool: step.tool,
        observation: step.observation,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        progress_checkpoint: {
            schema: "ccm-main-agent-live-checkpoint-v1",
            id: `${run.id}:dispatch-launch:${step.index}`,
            label: dispatchLaunchSummary.title || "已派发的工作",
            detail: dispatchLaunchSummary.headline || "派发已发出，正在跟踪后续结果。",
            status: "done",
            phase: "dispatching",
            at: nowIso(runtime),
            run_id: run.id,
            source: "global-agent-dispatch-launch-summary",
        },
    }, run);
}
function emit(runtime, event, run) {
    try {
        runtime.onEvent?.({ ...event, run_id: run.id, trace_id: run.trace_id, status: run.status, phase: run.phase }, run);
    }
    catch { }
}
function classifyGlobalAgentUserSteer(message, requestedKind = "auto") {
    const requested = String(requestedKind || "auto").trim().toLowerCase();
    if (requested === "supplement" || requested === "revise_goal")
        return requested;
    const text = String(message || "").replace(/\s+/g, " ").trim();
    const revisesGoal = /(?:目标|范围|方案|方向|优先级|验收|交付).{0,12}(?:调整|改为|改成|变更|缩小|扩大|取消|替换)|(?:改为|改成|换成|只做|仅做|不要再|不再|先别|停止当前|忽略之前|重新开始|新任务|换个任务|另外一个任务)/i.test(text);
    return revisesGoal ? "revise_goal" : "supplement";
}
function buildGlobalAgentEffectiveGoal(run) {
    const applied = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, "applied", 16);
    return [
        run.original_user_message || run.user_message,
        ...applied.map(item => `${item.kind === "revise_goal" ? "执行中目标调整" : "执行中补充要求"}：${item.message}`),
    ].filter(Boolean).join("\n").slice(0, 50_000);
}
function steerGlobalAgentRun(id, message, options = {}) {
    const active = activeRunObjects.get(id);
    if (!active || !activeRuns.has(id) || active.status !== "running") {
        const stored = getGlobalAgentRun(id);
        if (!stored)
            throw new Error("全局 Agent 运行不存在");
        throw new Error("这次运行当前不在执行中；请使用继续、确认或新消息进入下一步");
    }
    const normalizedMessage = String(message || "").trim().slice(0, 8_000);
    if (!normalizedMessage)
        throw new Error("补充要求不能为空");
    const requestId = String(options.requestId || "").trim().slice(0, 160);
    const existing = requestId
        ? normalizeGlobalAgentUserSteers(active.user_steer_history || active.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
        : null;
    if (existing)
        return { run: active, steering: existing, duplicate: true };
    const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
    const at = new Date().toISOString();
    const steering = {
        id: `steer_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        message: normalizedMessage,
        kind,
        source: String(options.source || "user").trim().slice(0, 120) || "user",
        request_id: requestId || undefined,
        at,
        status: "queued",
        authorization_preserved: kind === "supplement" && active.explicit_write_authorization,
    };
    active.pending_user_messages = [...normalizeGlobalAgentUserSteers(active.pending_user_messages || active.pendingUserMessages, "queued", 19), steering];
    active.pendingUserMessages = active.pending_user_messages;
    active.user_steer_history = [...normalizeGlobalAgentUserSteers(active.user_steer_history || active.userSteerHistory, undefined, 39), steering];
    active.userSteerHistory = active.user_steer_history;
    active.last_user_steer = steering;
    active.lastUserSteer = steering;
    active.max_steps = Math.max(active.max_steps, Math.min(16, active.steps.length + 3));
    active.updated_at = at;
    saveRun(active, !volatileRuns.has(id));
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(active, { type: "user_steer_queued", steering });
    (0, reliability_ledger_1.appendTraceEvent)(active.trace_id, {
        id: `${active.id}:user-steer-queued:${steering.id}`,
        type: "global_agent.user_steer_queued",
        status: "info",
        message: kind === "revise_goal" ? "执行中的目标调整已进入当前运行" : "执行中的补充要求已进入当前运行",
        data: { steering_id: steering.id, kind, source: steering.source, request_id: steering.request_id || "" },
    });
    return { run: active, steering, duplicate: false };
}
function applyGlobalAgentSupervisionSteer(id, message, options = {}) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (!stored.supervisor_id || !["supervising", "paused"].includes(stored.status)) {
        throw new Error("这次运行当前不在持续跟进阶段");
    }
    const normalizedMessage = String(message || "").trim().slice(0, 8_000);
    if (!normalizedMessage)
        throw new Error("补充要求不能为空");
    const run = normalizeRun(stored);
    const requestId = String(options.requestId || "").trim().slice(0, 160);
    const existing = requestId
        ? normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
        : null;
    if (existing)
        return { run, steering: existing, duplicate: true, applied: existing.status === "applied" };
    const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
    const source = String(options.source || "global_supervision_steer").trim().slice(0, 120) || "global_supervision_steer";
    const at = new Date().toISOString();
    const steering = {
        id: `steer_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        message: normalizedMessage,
        kind,
        source,
        request_id: requestId || undefined,
        at,
        status: "applied",
        applied_at: at,
        authorization_preserved: kind === "supplement" && run.explicit_write_authorization,
    };
    run.pending_user_messages = [];
    run.pendingUserMessages = run.pending_user_messages;
    run.user_steer_history = [
        ...normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 39),
        steering,
    ].slice(-40);
    run.userSteerHistory = run.user_steer_history;
    run.last_user_steer = steering;
    run.lastUserSteer = steering;
    run.history.push({
        role: "user",
        content: `${kind === "revise_goal" ? "持续跟进中的目标调整" : "持续跟进中的补充要求"}：${normalizedMessage}`,
    });
    run.history = run.history.slice(-12);
    const summary = options.continuationSummary && typeof options.continuationSummary === "object"
        ? options.continuationSummary
        : {};
    const nestedSummary = summary.continuation_summary && typeof summary.continuation_summary === "object"
        ? summary.continuation_summary
        : summary;
    const affectedTaskCount = Number(summary.affected_task_count ?? nestedSummary.affected_task_count ?? 0);
    const queuedTaskCount = Number(summary.queued_task_count ?? nestedSummary.queued_task_count ?? 0);
    const deferredTaskCount = Number(summary.deferred_task_count ?? nestedSummary.deferred_task_count ?? 0);
    const interruptedTaskCount = Number(summary.interrupted_task_count
        ?? nestedSummary.interrupted_task_count
        ?? nestedSummary.interruption_requested_count
        ?? 0);
    const failedTaskCount = Number(summary.failed_task_count ?? nestedSummary.failed_task_count ?? 0);
    const supervisionContinuation = {
        schema: "ccm-global-supervision-steering-v1",
        kind,
        source,
        affected_task_count: affectedTaskCount,
        queued_task_count: queuedTaskCount,
        deferred_task_count: deferredTaskCount,
        interrupted_task_count: interruptedTaskCount,
        failed_task_count: failedTaskCount,
        replan_required: kind === "revise_goal",
        authorization_preserved: steering.authorization_preserved,
        at,
    };
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `supervision_steer:${steering.id}`, {
        message: normalizedMessage,
        kind,
        source,
        supervisor_id: run.supervisor_id,
        mission_id: run.mission_id,
        continuation: supervisionContinuation,
    });
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
        id: `supervision_steer_${steering.id}`,
        label: kind === "revise_goal" ? "持续跟进中的最新目标已同步到子任务" : "持续跟进中的补充要求已同步到子任务",
        kind: "intent",
        status: failedTaskCount > 0 && affectedTaskCount === 0 ? "failed" : "passed",
        evidence: [
            normalizedMessage,
            `影响 ${affectedTaskCount} 个子任务`,
            kind === "revise_goal" ? `停止 ${interruptedTaskCount} 个旧执行轮` : `延后接续 ${deferredTaskCount} 个执行轮`,
        ],
        reason: failedTaskCount > 0 ? "部分子任务接续失败，技术详情保留失败统计" : "监督控制面已接收并同步最新用户要求",
    });
    if (kind === "revise_goal") {
        run.explicit_write_authorization = false;
        run.approved_tool_signatures = [];
        run.reasoning_loop.authorization_scope = [];
        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "supervision_goal_revised", `用户在持续跟进阶段调整目标：${normalizedMessage}`, "warning");
        (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "replan_supervised_mission", "旧目标对应的执行轮已停止或退出队列；重新规划前不沿用旧范围写入授权。");
    }
    else {
        (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_supervised_mission", "补充要求已并入同一全局任务，不改变当前目标边界和已确认授权。");
    }
    run.user_message = buildGlobalAgentEffectiveGoal(run);
    run.reasoning_loop.effective_goal = run.user_message.slice(0, 8_000);
    run.status = "supervising";
    run.phase = kind === "revise_goal" ? "plan" : "execute";
    run.supervision_state = kind === "revise_goal" ? "replanning" : String(options.supervisorState || "monitoring");
    const friendlyReply = kind === "revise_goal"
        ? interruptedTaskCount > 0
            ? `目标调整已接收。旧执行已停止，正在按新目标重新规划。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`
            : `目标调整已接收。当前没有仍在运行的旧执行轮，正在按新目标重新规划。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`
        : `补充要求已接收，已并入当前任务继续处理。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`;
    const nextAction = kind === "revise_goal"
        ? "重新核对目标、执行范围和验收标准后继续派发，并重新运行验收与复核。"
        : "继续跟踪当前执行、验收和复核结果，完成后给出最终总结。";
    const todoStep = (id, label, activeForm, status, detail = "") => ({
        id,
        label,
        content: label,
        active_form: activeForm,
        activeForm,
        status,
        ...(detail ? { detail } : {}),
    });
    const supervisionTodoPlan = {
        schema: "ccm-main-agent-workchain-todo-v1",
        source: "global-supervision-steering",
        title: kind === "revise_goal" ? "调整后的执行计划" : "当前执行计划",
        steps: kind === "revise_goal"
            ? [
                todoStep("recheck_goal", "重新核对目标和范围", "已重新核对目标和范围", "completed"),
                todoStep("interrupt_previous_run", "停止旧执行轮", "旧执行已停止", "completed", "旧目标对应的执行轮不会继续写入。"),
                todoStep("replan_supervised_mission", "按新目标重新规划", "正在按新目标重新规划", "in_progress", "正在重新核对执行范围和验收标准。"),
                todoStep("rerun_acceptance_review", "重新执行验收和复核", "等待重新执行验收和复核", "pending"),
            ]
            : [
                todoStep("receive_supplement", "接收补充要求", "已接收补充要求", "completed"),
                todoStep("sync_execution_targets", "同步补充要求到执行目标", "已同步到执行目标", "completed"),
                todoStep("continue_execution_acceptance", "继续执行和验收", "正在继续执行和验收", "in_progress"),
                todoStep("prepare_final_summary", "整理最终总结", "等待整理最终总结", "pending"),
            ],
        next_action: nextAction,
        nextAction,
        display_policy: {
            user_visible: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
    const technicalContent = JSON.stringify({
        supervision_continuation: supervisionContinuation,
        supervisor_state: options.supervisorState || "",
        raw_continuation_summary: nestedSummary,
    });
    const report = {
        ...(run.final_report && typeof run.final_report === "object" ? run.final_report : {}),
        summary: friendlyReply,
        next_action: nextAction,
        risks: failedTaskCount > 0 ? [`有 ${failedTaskCount} 个子任务未成功接入最新要求，正在等待后续监督检查。`] : [],
        supervision_continuation: supervisionContinuation,
        todo_plan: supervisionTodoPlan,
        todoPlan: supervisionTodoPlan,
        technical_content: technicalContent,
    };
    run.final_reply = friendlyReply;
    run.final_report = report;
    run.workchain = buildGlobalRunWorkchain(run, run.status, friendlyReply, report);
    run.todo_plan = supervisionTodoPlan;
    run.todoPlan = supervisionTodoPlan;
    run.workchain.todo_plan = supervisionTodoPlan;
    run.workchain.todoPlan = supervisionTodoPlan;
    if (Array.isArray(run.workchain?.technical_details)) {
        run.workchain.technical_details.push({
            id: "supervision_continuation",
            title: "持续跟进接续统计",
            items: [
                { label: "接续类型", value: kind },
                { label: "受影响子任务", value: String(affectedTaskCount) },
                { label: "重新排队", value: String(queuedTaskCount) },
                { label: "等待当前轮结束", value: String(deferredTaskCount) },
                { label: "停止旧执行轮", value: String(interruptedTaskCount) },
                { label: "接续失败", value: String(failedTaskCount) },
            ],
        });
    }
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
    run.display_stream.todo_plan = supervisionTodoPlan;
    run.display_stream.todoPlan = supervisionTodoPlan;
    const supervisionDecision = run.display_stream.main_agent_decision || run.display_stream.mainAgentDecision;
    if (supervisionDecision) {
        supervisionDecision.mode = kind === "revise_goal" ? "goal_revision" : "followup";
        supervisionDecision.decision = {
            ...(supervisionDecision.decision || {}),
            selected_actions: kind === "revise_goal"
                ? ["replan_from_observation", "dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"]
                : ["dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"],
            dispatch_policy: {
                action: kind === "revise_goal" ? "replan" : "continue",
                reason: friendlyReply,
                nextStep: nextAction,
            },
            reason: friendlyReply,
        };
        supervisionDecision.todo_plan = supervisionTodoPlan;
        supervisionDecision.todoPlan = supervisionTodoPlan;
        supervisionDecision.user_plan_steps = supervisionTodoPlan.steps;
        supervisionDecision.verify = {
            passed: false,
            blocked_actions: [],
            conclusion: kind === "revise_goal" ? "正在按新目标重新规划" : "正在继续执行和验收",
        };
        if (supervisionDecision.display_stream) {
            supervisionDecision.display_stream.todo_plan = supervisionTodoPlan;
            supervisionDecision.display_stream.todoPlan = supervisionTodoPlan;
        }
        run.display_stream.main_agent_decision = supervisionDecision;
        run.display_stream.mainAgentDecision = supervisionDecision;
    }
    run.updated_at = at;
    saveRun(run, !volatileRuns.has(id));
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
        type: "user_steer_applied",
        steering,
        supervision_continuation: supervisionContinuation,
    });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
        id: `${run.id}:supervision-steer:${steering.id}`,
        type: kind === "revise_goal" ? "global_agent.supervision_goal_revised" : "global_agent.supervision_supplemented",
        status: failedTaskCount > 0 ? "warning" : "ok",
        task_id: run.mission_id || "",
        message: friendlyReply,
        data: {
            steering_id: steering.id,
            supervisor_id: run.supervisor_id,
            mission_id: run.mission_id,
            continuation: supervisionContinuation,
        },
    });
    return { run, steering, duplicate: false, applied: true, continuation: supervisionContinuation };
}
function applyPendingGlobalAgentUserSteers(run, runtime) {
    const pending = normalizeGlobalAgentUserSteers(run.pending_user_messages || run.pendingUserMessages, "queued", 20);
    if (!pending.length)
        return [];
    const appliedAt = nowIso(runtime);
    run.pending_user_messages = [];
    run.pendingUserMessages = run.pending_user_messages;
    const history = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40);
    const applied = pending.map(item => ({
        ...item,
        status: "applied",
        applied_at: appliedAt,
        authorization_preserved: item.kind === "supplement" && run.explicit_write_authorization,
    }));
    const appliedById = new Map(applied.map(item => [item.id, item]));
    run.user_steer_history = history
        .map(item => appliedById.get(item.id) || item)
        .concat(applied.filter(item => !history.some(existing => existing.id === item.id)))
        .slice(-40);
    run.userSteerHistory = run.user_steer_history;
    for (const steering of applied) {
        const label = steering.kind === "revise_goal" ? "执行中目标调整" : "执行中补充要求";
        run.history.push({ role: "user", content: `${label}：${steering.message}` });
        (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `user_steer:${steering.id}`, {
            kind: steering.kind,
            message: steering.message,
            source: steering.source,
            at: steering.at,
        });
        (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
            id: `user_steer_${steering.id}`,
            label: steering.kind === "revise_goal" ? "最新目标调整已纳入当前运行" : "执行中的补充要求已纳入当前运行",
            kind: "intent",
            status: "passed",
            evidence: [steering.message],
            reason: "用户在当前运行尚未结束时补充了上下文",
        });
        if (steering.kind === "revise_goal") {
            run.explicit_write_authorization = false;
            run.approved_tool_signatures = [];
            run.reasoning_loop.authorization_scope = [];
            (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "user_goal_revised", `用户在执行中调整目标：${steering.message}`, "warning");
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "replan_after_user_steer", "最新目标边界优先于旧计划；重新规划前不沿用旧范围的写入授权。");
        }
        else {
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_with_user_steer", "把用户的补充要求合并到同一运行，下一轮决策必须读取这条上下文。");
        }
        run.last_user_steer = steering;
        run.lastUserSteer = steering;
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "user_steer_applied", steering });
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
            id: `${run.id}:user-steer-applied:${steering.id}`,
            type: "global_agent.user_steer_applied",
            status: "ok",
            message: steering.kind === "revise_goal" ? "目标调整已纳入当前运行，等待重核计划" : "补充要求已纳入当前运行",
            data: {
                steering_id: steering.id,
                kind: steering.kind,
                source: steering.source,
                authorization_preserved: steering.authorization_preserved,
            },
        });
        emit(runtime, {
            type: "user_steer_applied",
            steering,
            user_steer: steering,
            userSteer: steering,
            replan_required: steering.kind === "revise_goal",
            message: steering.kind === "revise_goal"
                ? "新的目标边界已纳入，我会先重新核对计划再继续。"
                : "补充要求已纳入当前任务，我会带着它继续处理。",
        }, run);
    }
    run.history = run.history.slice(-12);
    run.user_message = buildGlobalAgentEffectiveGoal(run);
    run.reasoning_loop.effective_goal = run.user_message.slice(0, 8_000);
    run.updated_at = appliedAt;
    saveRun(run, runtime.persist !== false);
    return applied;
}
function applyGlobalResumeFeedback(run, runtime, value, options = {}) {
    const feedback = compactGlobalUserSummaryText(value, "", 720);
    if (!feedback)
        return "";
    const at = nowIso(runtime);
    const source = compactGlobalUserSummaryText(options.source || "user", "user", 80);
    const item = { feedback, at, status: String(run.status || "") };
    run.resume_feedback = feedback;
    run.resumeFeedback = feedback;
    run.last_resume_feedback = feedback;
    run.lastResumeFeedback = feedback;
    run.last_resume_feedback_at = at;
    run.lastResumeFeedbackAt = at;
    run.resume_feedback_history = [...(Array.isArray(run.resume_feedback_history) ? run.resume_feedback_history : []), item].slice(-20);
    run.resumeFeedbackHistory = run.resume_feedback_history;
    run.history.push({ role: "user", content: `继续处理时补充要求：${feedback}` });
    run.history = run.history.slice(-12);
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "resume_feedback", { feedback, source, at, status: run.status, phase: run.phase });
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
        id: "resume_feedback",
        label: "继续处理时的补充要求已纳入下一轮",
        kind: "intent",
        status: "passed",
        evidence: [feedback],
        reason: "用户在继续运行时补充了要求",
    });
    (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "resume_with_feedback", "用户在继续运行时补充了要求，下一轮决策必须合并这条上下文。");
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "resume_feedback", feedback, source, at });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
        id: `${run.id}:resume-feedback:${run.resume_count + 1}:${Date.parse(at) || Date.now()}`,
        type: "global_agent.resume_feedback",
        status: "ok",
        message: "继续处理时的补充要求已记录",
        data: { source, feedback },
    });
    emit(runtime, { type: "resume_feedback", feedback, source, message: "继续处理时的补充要求已记录" }, run);
    return feedback;
}
function buildGlobalRunWorkchain(run, status, reply = "", report = null, options = {}) {
    const actionIds = run.steps.map(step => step.tool?.name || step.state).filter(Boolean);
    const deliveryReport = report?.schema === "ccm-main-agent-delivery-report-v1" ? report : report?.delivery_report || null;
    const dispatchLaunchSummary = buildGlobalDispatchLaunchSummary(run, status);
    const visibleReply = buildGlobalVisibleReplyContent({ value: reply || run.final_reply, rawSource: reply || run.final_reply, status, max: 1200 });
    const technicalContent = visibleReply.technical_content || report?.technical_content || report?.technicalContent || "";
    const stepRows = run.steps.map(step => ({
        id: `step-${step.index}`,
        content: step.message || step.tool?.name || step.state,
        status: step.error ? "failed" : step.observation ? "completed" : step.state === "needs_confirmation" ? "needs_confirmation" : "completed",
        activeForm: step.tool?.name ? `执行 ${step.tool.name}` : step.message,
    }));
    const assertionEvidence = run.reasoning_loop?.assertions
        ?.filter(item => item.status === "passed")
        ?.map(item => item.label)
        || [];
    const workchain = (0, workchain_1.buildMainAgentWorkchain)({
        surface: "global",
        mode: options.mode || run.phase,
        status,
        phase: run.phase,
        userText: visibleReply.text,
        goal: run.original_user_message || run.user_message,
        actionIds,
        steps: stepRows,
        workers: [],
        executions: [],
        summary: {
            ...(report || {}),
            dispatch_launch_summary: dispatchLaunchSummary,
            verification_executed: report?.verification_results || report?.verification || report?.checks || deliveryReport?.verification || [],
            actual_file_changes: report?.actual_file_changes || report?.file_changes || report?.files_modified || deliveryReport?.files || [],
            risks: report?.risks || report?.remaining_items || deliveryReport?.risks || [],
        },
        completion: { summary: report?.summary || deliveryReport?.headline || reply, evidence: [...assertionEvidence, ...(report?.evidence || [])], risks: report?.risks || deliveryReport?.risks || [], next_action: report?.next_action || deliveryReport?.next_action || "" },
        technical: { blockers: run.error ? [run.error] : [], execution_ids: [], session_ids: [], technical_content: technicalContent },
        traceId: run.trace_id,
        runId: run.id,
        missionId: run.mission_id,
        supervisorId: run.supervisor_id,
    });
    if (dispatchLaunchSummary) {
        workchain.dispatch_launch_summary = dispatchLaunchSummary;
        workchain.dispatchLaunchSummary = dispatchLaunchSummary;
        if (workchain.completion_summary) {
            workchain.completion_summary.dispatch_launch_summary = dispatchLaunchSummary;
            workchain.completion_summary.dispatchLaunchSummary = dispatchLaunchSummary;
        }
    }
    if (deliveryReport) {
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
    }
    return workchain;
}
function buildGlobalDisplayStreamFromWorkchain(workchain) {
    const dispatchLaunchSummary = workchain.dispatch_launch_summary
        || workchain.dispatchLaunchSummary
        || workchain.completion_summary?.dispatch_launch_summary
        || workchain.completion_summary?.dispatchLaunchSummary
        || null;
    const mainAgentDecision = dispatchLaunchSummary ? {
        version: 2,
        mode: "delegation",
        trace_id: workchain.trace_id || workchain.technical_details?.find?.((item) => item?.id === "ids")?.items?.find?.((item) => item?.label === "Trace")?.value || "",
        decision: {
            selected_actions: ["dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"],
            dispatch_policy: {
                action: "delegate",
                reason: dispatchLaunchSummary.headline || "派发已发出。",
                nextStep: dispatchLaunchSummary.next_action || "等待下游执行目标更新结果。",
            },
            reason: dispatchLaunchSummary.headline || "派发已发出。",
        },
        display_stream: null,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary,
        todo_plan: {
            title: "我准备这样处理",
            source: "cc-style-todo",
            schema: "cc-style-todo-v2",
            display: { max_visible_steps: 5, quiet_completed: true, show_current_focus: true, user_visible: true },
            steps: [
                { id: "understand_intent", content: "理解你的需求和目标范围", activeForm: "已理解需求目标", status: "completed" },
                { id: "dispatch_child_agent", content: `派发给 ${dispatchLaunchSummary.count_label || `${dispatchLaunchSummary.rows?.length || 0} 个执行目标`}`, activeForm: "已派发执行目标", status: "completed" },
                { id: "track_delivery", content: "跟踪执行、验收和最终总结", activeForm: dispatchLaunchSummary.next_action || "等待下游执行目标更新结果", status: workchain.status === "completed" ? "completed" : "in_progress" },
            ],
        },
        user_plan_steps: [],
        permissions: [],
        verify: { passed: true, blocked_actions: [], conclusion: "派发摘要已整理" },
    } : null;
    if (mainAgentDecision)
        mainAgentDecision.display_stream = {
            schema: "ccm-streamlined-display-v2",
            user_visible_text: workchain.user_visible_text,
            dispatch_launch_summary: dispatchLaunchSummary,
            dispatchLaunchSummary,
            workchain,
        };
    if (mainAgentDecision)
        mainAgentDecision.user_plan_steps = mainAgentDecision.todo_plan.steps;
    return {
        schema: "ccm-streamlined-display-v2",
        type: "streamlined_agent_display",
        user_visible: true,
        user_visible_text: workchain.user_visible_text,
        text_message: { type: "streamlined_text", text: workchain.user_visible_text },
        tool_use_summary: {
            type: "streamlined_tool_use_summary",
            tool_summary: workchain.completion_summary?.evidence?.length
                ? workchain.completion_summary.evidence.slice(0, 4).join("，")
                : "本轮没有需要展示的工具调用",
            counts: {},
            hidden_tool_uses: 0,
        },
        workchain,
        completion_summary: workchain.completion_summary,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        main_agent_decision: mainAgentDecision,
        mainAgentDecision,
        progress_checkpoints: workchain.progress_checkpoints,
        delivery_report: workchain.delivery_report || workchain.completion_summary?.delivery_report || null,
        workchain_stages: workchain.stages,
        technical_details: workchain.technical_details || [],
        todo: {
            visible: workchain.surface !== "global" || !["answer", "conversation", "question", "analysis"].includes(String(workchain.mode || "")),
            surface: "plan_panel",
            tool_message_visible: false,
            quiet_completed: true,
        },
        terminology: {
            sanitized: true,
            blocked_terms: ["Coordinator", "Pipeline", "Runtime Kernel", "trace_id", "session_ids"],
        },
    };
}
function completeRun(run, runtime, status, reply, error = "") {
    const completedAt = nowIso(runtime);
    if (status === "completed" && run.supervisor_id && run.supervision_state !== "completed") {
        run.status = "supervising";
        run.phase = "execute";
        run.supervision_state = run.supervision_state || "monitoring";
        run.final_reply = "全局任务已派发，我会持续跟进执行与验收。\n\n这只是已受理和跟进中，不代表任务已经完成。只有文件变更、验证和交付验收都通过后，才会发送最终交付报告。";
        run.workchain = buildGlobalRunWorkchain(run, "supervising", run.final_reply, null);
        run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
        run.error = "";
        run.updated_at = nowIso(runtime);
        run.pending_tool = null;
        saveRun(run, runtime.persist !== false);
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "supervising", status: run.status, mission_id: run.mission_id, supervisor_id: run.supervisor_id, reply: run.final_reply });
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:supervising:${run.updated_at}`, type: "global_agent.supervising", status: "info", message: run.final_reply, data: { mission_id: run.mission_id, supervisor_id: run.supervisor_id } });
        emit(runtime, { type: "supervising", reply: run.final_reply, mission_id: run.mission_id, supervisor_id: run.supervisor_id }, run);
        return run;
    }
    run.status = status;
    run.phase = status === "completed" ? "complete" : run.phase;
    run.error = String(error || "");
    run.clarification_summary = null;
    run.confirmation_summary = null;
    if (run.plan_mode)
        run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "failed", completedAt);
    const rawReply = String(reply || run.final_reply || (status === "completed" ? "已完成。" : "执行未完成。"));
    const intentCategory = String(run.decision_summary?.intent?.category || "");
    // 终态按当前证据重算档位，避免沿用等待确认时的旧 presentation
    run.presentation = classifyGlobalAgentRunPresentation({ ...run, presentation: undefined }, status);
    const ordinaryConversation = isReadOnlyGlobalConsultation({ ...run, presentation: run.presentation }, status) || run.presentation === "reply";
    const workchain = buildGlobalRunWorkchain(run, status, rawReply, run.final_delivery_report || run.final_report || null, { mode: ordinaryConversation ? "conversation" : undefined });
    const includeDetails = !ordinaryConversation
        && run.presentation === "delivery"
        && (status !== "completed" || run.tool_calls > 0 || !!run.mission_id || ["execution", "high_risk"].includes(intentCategory));
    if (includeDetails) {
        const deliveryReport = (0, delivery_report_1.buildMainAgentDeliveryReport)({
            surface: "global",
            status,
            title: run.original_user_message || run.user_message || "全局任务",
            goal: run.original_user_message || run.user_message,
            detail: rawReply,
            run,
            report: run.final_report || run.final_delivery_report || workchain.completion_summary || {},
            summary: workchain.completion_summary || {},
            completion: workchain.completion_summary || {},
            workchain,
            executed: true,
        });
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
        run.final_delivery_report = deliveryReport;
        run.final_report = {
            ...(run.final_report && run.final_report.schema !== "ccm-main-agent-delivery-report-v1" ? run.final_report : {}),
            summary: deliveryReport.headline,
            formatted: deliveryReport.markdown,
            user_text: deliveryReport.user_text,
            actual_file_changes: deliveryReport.files,
            verification_results: deliveryReport.verification,
            risks: deliveryReport.risks,
            next_action: deliveryReport.next_action,
            delivery_report: deliveryReport,
        };
    }
    run.workchain = workchain;
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(workchain);
    if (!includeDetails)
        run.final_report = run.final_report || workchain.completion_summary;
    const finalReplyCandidate = includeDetails && run.final_delivery_report
        ? (0, delivery_report_1.formatMainAgentDeliveryReply)(run.final_delivery_report)
        : (0, workchain_1.formatMainAgentCompletionReply)({ reply: rawReply, workchain, includeDetails: false });
    const visibleReply = buildGlobalVisibleReplyContent({
        value: finalReplyCandidate,
        rawSource: rawReply,
        status,
        max: 8000,
    });
    if (visibleReply.technical_content) {
        run.final_report = run.final_report || {};
        attachGlobalReplyTechnicalContent(run.final_report, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(run.final_delivery_report, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(workchain, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(run.display_stream, visibleReply.technical_content);
    }
    if (visibleReply.hidden_visible_protocol && run.final_delivery_report) {
        run.final_delivery_report.headline = visibleReply.text;
        run.final_delivery_report.user_text = visibleReply.text;
        run.final_delivery_report.markdown = visibleReply.text;
        if (run.final_report) {
            run.final_report.summary = visibleReply.text;
            run.final_report.user_text = visibleReply.text;
            run.final_report.formatted = visibleReply.text;
        }
    }
    run.final_reply = ordinaryConversation
        ? stripNonExecutionReportSections(visibleReply.text)
        : visibleReply.text;
    // 简单业务不保留交付报告，避免前端气泡误读 markdown
    if (ordinaryConversation || run.presentation === "reply") {
        run.final_delivery_report = null;
    }
    run.completed_at = completedAt;
    run.updated_at = run.completed_at;
    run.pending_tool = null;
    saveRun(run, runtime.persist !== false);
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "run_terminal", status, reply: run.final_reply, error: run.error });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:${status}:${run.completed_at}`, type: `global_agent.run_${status}`, status: status === "completed" ? "ok" : status === "cancelled" ? "warning" : "error", message: run.final_reply.slice(0, 1000), data: { steps: run.steps.length, model_calls: run.model_calls, tool_calls: run.tool_calls, error: run.error } });
    if ((0, global_agent_metrics_1.recordGlobalAgentRunMetric)(run, status, { source: run.source || "global-agent-loop" }) && run.metrics_recorded === true) {
        saveRun(run, runtime.persist !== false);
    }
    emit(runtime, { type: status === "completed" ? "completed" : status, reply: run.final_reply, error: run.error }, run);
    return run;
}
//# sourceMappingURL=global-agent-loop-engine-part-01.js.map