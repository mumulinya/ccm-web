"use strict";
// Behavior-freeze split from global-agent-loop-engine.ts (part 2/2).
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
exports.runGlobalAgentLoopSelfTest = void 0;
exports.startGlobalAgentRun = startGlobalAgentRun;
exports.resumeGlobalAgentRun = resumeGlobalAgentRun;
exports.continueGlobalAgentRunWithClarification = continueGlobalAgentRunWithClarification;
exports.pauseGlobalAgentRun = pauseGlobalAgentRun;
exports.cancelGlobalAgentRun = cancelGlobalAgentRun;
exports.recoverInterruptedGlobalAgentRuns = recoverInterruptedGlobalAgentRuns;
const crypto = __importStar(require("crypto"));
const reliability_ledger_1 = require("../../system/reliability-ledger");
const runtime_kernel_1 = require("../runtime-kernel");
const quality_center_1 = require("../quality-center");
const reasoning_loop_1 = require("../reasoning-loop");
const runtime_1 = require("./runtime");
const workchain_1 = require("../workchain");
const delivery_report_1 = require("../delivery-report");
const global_agent_loop_self_tests_1 = require("./global-agent-loop-self-tests");
const globalAgentRunProjection = __importStar(require("./global-agent-run-projection"));
const globalAgentRunReplies = __importStar(require("./global-agent-run-replies"));
const globalAgentRunStore = __importStar(require("./global-agent-run-store"));
const { compactObservation, GLOBAL_MODEL_ROUTE_KEYS, GLOBAL_MODEL_FORBIDDEN_FIELD, GROUP_SESSION_ID_PATTERN, redactGroupSessionIds, redactGroupSessionFields, projectRoutingValue, projectProjectRows, projectGroupRows, projectGlobalTaskRows, projectGlobalAgentObservationForModel, projectGlobalAgentReasoningForModel, parseGlobalAgentDecision, normalizeDecision, buildToolPrompt, buildGlobalAgentModelMessages } = globalAgentRunProjection;
const { nowIso, stripNonExecutionReportSections, GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN, hasGlobalUserSummaryTechnicalDetails, compactGlobalUserSummaryText, uniqueGlobalStrings, sanitizeGlobalVisibleReplyTerminology, globalVisibleReplyFallback, buildGlobalVisibleReplyContent, attachGlobalReplyTechnicalContent, getGlobalToolUserLabel, summarizeGlobalToolTarget, buildGlobalClarificationSummary, buildGlobalConfirmationSummary, buildGlobalPlanSteps, buildGlobalPlanExecutionFollowup, buildGlobalPlanModeSummary, updateGlobalPlanModeStatus, GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN, sanitizeGlobalDispatchVisibleText, normalizeDispatchDependency, buildGlobalDispatchRow, isGlobalDispatchTool, normalizeGlobalDispatchLaunchRowStatus, buildGlobalDispatchLaunchSummary } = globalAgentRunReplies;
const { GLOBAL_AGENT_TOOL_SPECS, STORE_DIR, STORE_FILE, STORE_BACKUP, MAX_STORED_RUNS, MAX_OBSERVATION_CHARS, GLOBAL_DISPATCH_TOOL_NAMES, LIGHT_UI_TOOL_NAMES, activeRuns, pauseRequests, cancelRequests, volatileRuns, activeRunObjects, destructiveOperation, writeJsonAtomic, normalizeGlobalAgentUserSteer, normalizeGlobalAgentUserSteers, normalizeRun, loadStore, saveRun, getGlobalAgentRun, listGlobalAgentRuns, findWaitingGlobalAgentRun, findClarifyingGlobalAgentRun, getGlobalAgentToolSpec, classifyGlobalAgentToolRisk, classifyGlobalAgentRunPresentation, isReadOnlyGlobalConsultation, stable, toolSignature, validateTool } = globalAgentRunStore;
const global_agent_loop_engine_part_01_1 = require("./global-agent-loop-engine-part-01");
async function continueLoop(run, runtime) {
    if (activeRuns.has(run.id))
        return activeRunObjects.get(run.id) || run;
    activeRuns.add(run.id);
    activeRunObjects.set(run.id, run);
    try {
        run.status = "running";
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        (0, runtime_1.initializeGlobalAgentRuntimeRun)(run);
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "run_started", status: run.status, phase: run.phase });
        (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "started" }, run);
        while (run.status === "running") {
            if (cancelRequests.delete(run.id))
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "cancelled", "用户已取消本次运行。", "user_cancelled");
            if (pauseRequests.delete(run.id)) {
                run.status = "paused";
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "paused", reply: "我已暂停这次运行。" }, run);
                return run;
            }
            (0, global_agent_loop_engine_part_01_1.applyPendingGlobalAgentUserSteers)(run, runtime);
            const now = runtime.now ? runtime.now() : Date.now();
            if (now > Date.parse(run.deadline_at))
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", "本次运行已达到执行时间上限，我已安全停止。", "deadline_exceeded");
            if (run.steps.length >= run.max_steps)
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", "本次运行已达到最大步骤数，我已停止以避免死循环。", "step_budget_exceeded");
            let decision;
            const decisionStarted = now;
            try {
                const messages = await buildGlobalAgentModelMessages(run, runtime);
                run.model_calls += 1;
                const rawDecision = await runtime.callModel(messages, run);
                if ((0, global_agent_loop_engine_part_01_1.applyPendingGlobalAgentUserSteers)(run, runtime).length)
                    continue;
                decision = parseGlobalAgentDecision(rawDecision);
            }
            catch (error) {
                if ((0, global_agent_loop_engine_part_01_1.applyPendingGlobalAgentUserSteers)(run, runtime).length)
                    continue;
                const fallback = runtime.fallbackDecision ? await runtime.fallbackDecision(run, error) : null;
                if (!fallback)
                    return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", `我暂时无法形成可靠决策：${error?.message || error}`, error?.message || String(error));
                decision = normalizeDecision(fallback);
            }
            run.phase = decision.state;
            run.workflow_decision = decision.workflowDecision;
            run.workflowDecision = decision.workflowDecision;
            const normalizedIntent = (0, quality_center_1.normalizeAgentDecisionIntent)(decision.intent, run.user_message);
            decision.intent = normalizedIntent;
            (0, reasoning_loop_1.updateReasoningPlan)(run.reasoning_loop, decision.plan || [], normalizedIntent.reason || `decision:${decision.state}`);
            (0, runtime_1.updateGlobalAgentTodoLedger)(run, decision.plan || [], decision.tool?.name || "");
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, decision.state, normalizedIntent.reason || decision.message || "模型形成下一步决策");
            const step = {
                index: run.steps.length + 1,
                at: nowIso(runtime),
                state: decision.state,
                message: String(decision.message || ""),
                plan: decision.plan || [],
                duration_ms: Math.max(0, (runtime.now ? runtime.now() : Date.now()) - decisionStarted),
                decision: { intent: normalizedIntent },
            };
            if (!decision.tool) {
                const quality = (0, quality_center_1.evaluateAgentDecision)({ message: run.user_message, decision, risk: "read", explicitWriteAuthorization: run.explicit_write_authorization, priorSteps: run.steps, policyOverride: runtime.qualityPolicyOverride });
                run.decision_summary = quality;
                run.shadow_mode = quality.policy.shadowMode;
                step.decision = quality;
                run.steps.push(step);
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: null, risk: "read", target_grounded: true,
                    authorization_basis: quality.authorizationBasis,
                    outcome: decision.state === "needs_confirmation" ? "clarification_required" : ["answer", "complete"].includes(decision.state) ? (run.tool_calls > 0 ? "completed_after_action" : "answered") : "non_terminal_without_action",
                    reasons: [quality.intent.reason], status: decision.state === "needs_confirmation" ? "warning" : "ok",
                });
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "decision", step }, run);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "decision", state: decision.state, message: step.message, intent: quality.intent });
                if (decision.state === "needs_confirmation") {
                    (0, runtime_1.markGlobalAgentToolTodo)(run, "", "blocked", decision.message || "等待用户澄清");
                    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标与影响范围已澄清", kind: "intent", status: "blocked", reason: decision.message });
                    (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "ambiguous_intent", decision.message || normalizedIntent.reason, "warning");
                    run.status = "waiting_clarification";
                    run.phase = "needs_confirmation";
                    run.clarification_question = decision.message || "请补充要操作的目标、期望动作和允许的影响范围。";
                    run.final_reply = run.clarification_question;
                    run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
                    run.confirmation_summary = null;
                    run.presentation = classifyGlobalAgentRunPresentation(run, run.status);
                    run.updated_at = nowIso(runtime);
                    saveRun(run, runtime.persist !== false);
                    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:clarification:${step.index}`, type: "global_agent.clarification_required", status: "warning", message: run.final_reply, data: { intent: normalizedIntent } });
                    (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                    return run;
                }
                if (["answer", "complete"].includes(decision.state)) {
                    const completion = decision.completion || {};
                    const executionIntent = ["execution", "high_risk"].includes(normalizedIntent.category) && normalizedIntent.action_required;
                    const failedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "failed");
                    const passedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "passed");
                    if (executionIntent && run.explicit_write_authorization && run.tool_calls === 0) {
                        const reason = "已识别明确执行意图，但尚未形成并执行可靠工具行动";
                        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "missed_execution", reason, "error");
                        (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "missed_execution", whatHappened: reason, correction: "阻止终态并向用户索取可执行目标和验收范围", preventRepeat: "明确执行意图必须产生经过授权的工具行动或明确阻塞证据" });
                        (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "goal", label: "用户要求的执行目标已实际完成", kind: "goal", status: "blocked", reason });
                        run.status = "waiting_clarification";
                        run.phase = "needs_confirmation";
                        run.clarification_question = "我识别到你要求实际执行，但当前还没有形成可核验的行动方案。请确认目标对象、允许修改的范围和验收结果；我不会把一段说明冒充已完成。";
                        run.final_reply = run.clarification_question;
                        run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality, reason });
                        run.confirmation_summary = null;
                        run.updated_at = nowIso(runtime);
                        saveRun(run, runtime.persist !== false);
                        (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                        return run;
                    }
                    if (executionIntent && failedToolAssertions.length && !passedToolAssertions.length) {
                        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "premature_completion", "模型试图结束，但执行结果仍失败；要求重新规划", "error");
                        (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "premature_completion", whatHappened: "模型在所有执行结果仍失败时尝试结束", correction: "拒绝完成并回到计划阶段", preventRepeat: "完成前检查工具断言和验收证据，失败断言未消解时不得结束" });
                        if (run.steps.length < run.max_steps)
                            continue;
                        return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", "执行结果仍未通过验证，不能报告完成。", "unverified_completion");
                    }
                    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                        id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal", status: executionIntent ? (passedToolAssertions.length ? "passed" : "blocked") : "passed",
                        evidence: [...(completion.evidence || []), ...passedToolAssertions.map(item => item.label)], reason: normalizedIntent.reason,
                    });
                    // 简单业务（presentation=reply）不因 intent=execution 拼交付栏目
                    const includeDeliveryDetails = !isReadOnlyGlobalConsultation(run, "completed");
                    const directReply = decision.message || completion.summary || "已完成。";
                    const parts = [includeDeliveryDetails ? directReply : stripNonExecutionReportSections(directReply)];
                    if (includeDeliveryDetails && completion.evidence?.length)
                        parts.push(`验证/证据：\n- ${completion.evidence.join("\n- ")}`);
                    if (includeDeliveryDetails && completion.risks?.length)
                        parts.push(`风险：\n- ${completion.risks.join("\n- ")}`);
                    if (includeDeliveryDetails && completion.next_action)
                        parts.push(`下一步：${completion.next_action}`);
                    (0, runtime_1.markGlobalAgentToolTodo)(run, "", "done", "本轮回复已整理");
                    return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "completed", parts.filter(Boolean).join("\n\n"));
                }
                (0, runtime_1.markGlobalAgentToolTodo)(run, "", "blocked", "非终态决策缺少工具");
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", "当前决策还没有可执行动作，我已停止并保留排障信息。", "non_terminal_without_tool");
            }
            let args;
            let risk;
            let signature;
            try {
                args = validateTool(decision.tool.name, decision.tool.arguments || {});
                risk = classifyGlobalAgentToolRisk(decision.tool.name, args);
                signature = toolSignature(decision.tool.name, args);
            }
            catch (error) {
                step.error = error?.message || String(error);
                run.steps.push(step);
                run.consecutive_failures += 1;
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_validation_failed", step }, run);
                if (run.consecutive_failures >= 2)
                    return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", `工具参数连续校验失败：${step.error}`, step.error);
                continue;
            }
            step.tool = { name: decision.tool.name, arguments: args, risk, signature };
            const quality = (0, quality_center_1.evaluateAgentDecision)({
                message: run.user_message,
                decision,
                toolName: decision.tool.name,
                args,
                risk,
                explicitWriteAuthorization: run.explicit_write_authorization,
                priorSteps: run.steps,
                policyOverride: runtime.qualityPolicyOverride,
            });
            run.decision_summary = quality;
            run.shadow_mode = quality.policy.shadowMode;
            step.decision = quality;
            if (quality.requiresClarification) {
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", quality.clarificationQuestion);
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "blocked", reason: quality.clarificationReasons.join("；") });
                (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "decision_quality_gap", quality.clarificationReasons.join("；"), "warning");
                run.steps.push(step);
                run.status = "waiting_clarification";
                run.phase = "needs_confirmation";
                run.clarification_question = quality.clarificationQuestion;
                run.final_reply = quality.clarificationQuestion;
                run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
                run.confirmation_summary = null;
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "clarification_required", reasons: quality.clarificationReasons, status: "warning",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:quality-block:${signature}`, type: "global_agent.decision_blocked", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, reasons: quality.clarificationReasons, intent: quality.intent } });
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "clarification_required", reply: run.final_reply, pending_tool: null, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                return run;
            }
            if (quality.shadowed) {
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "done", `影子模式记录 ${decision.tool.name}`);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_shadowed", tool: decision.tool.name, risk, arguments: args });
                step.observation = { success: true, shadowed: true, executed: false, proposed_tool: decision.tool.name, arguments: args };
                run.steps.push(step);
                run.tool_calls += 0;
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "shadowed", reasons: ["影子模式启用，未产生副作用"], status: "info",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:shadow:${signature}`, type: "global_agent.tool_shadowed", status: "info", message: `影子模式记录 ${decision.tool.name}，未执行`, data: { tool: decision.tool.name, risk, arguments: args, intent: quality.intent } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "shadow",
                    risk,
                    target: signature,
                    status: "skipped",
                    message: `影子模式记录 ${decision.tool.name}，未执行`,
                    data: { arguments: args, intent: quality.intent },
                });
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "completed", `${decision.message || "已形成执行方案。"}\n\n当前处于影子模式：拟调用 ${decision.tool.name}，本次没有执行任何写操作。`);
            }
            const priorSame = run.steps.filter(item => item.tool?.signature === signature).length;
            if (priorSame >= 2) {
                step.error = "检测到重复工具调用，已阻止死循环";
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", step.error, "duplicate_tool_loop");
            }
            const permission = (0, runtime_1.evaluateGlobalAgentPermission)({ run, tool: decision.tool.name, args, risk, signature });
            if (permission.denied) {
                step.error = `权限规则拒绝执行 ${decision.tool.name}${permission.rule?.reason ? `：${permission.rule.reason}` : ""}`;
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "permission_denied", tool: decision.tool.name, risk, rule: permission.rule });
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", step.error, "permission_denied");
            }
            const approved = run.approved_tool_signatures.includes(signature) || permission.allowed;
            const requiresUserConfirmation = (risk === "write" && !run.explicit_write_authorization && !approved) || (risk === "high" && !approved);
            // 点歌/导航等 UI 副作用：即使模型把 intent 标成 execution，也不挂「执行前计划」脚手架
            const lightUiTool = LIGHT_UI_TOOL_NAMES.includes(String(decision.tool.name || ""));
            const shouldExposePlanMode = !lightUiTool && ((Array.isArray(decision.plan) && decision.plan.length > 0)
                || ["execution", "high_risk"].includes(String(quality.intent?.category || ""))
                || risk !== "read"
                || isGlobalDispatchTool(decision.tool.name));
            if (shouldExposePlanMode) {
                run.plan_mode = buildGlobalPlanModeSummary({
                    run,
                    decision,
                    risk,
                    pendingTool: { name: decision.tool.name, arguments: args, risk, signature },
                    requiresConfirmation: requiresUserConfirmation,
                    confirmationStatus: requiresUserConfirmation ? "awaiting_confirmation" : "auto_continue",
                });
                if (!requiresUserConfirmation) {
                    (0, global_agent_loop_engine_part_01_1.emit)(runtime, {
                        type: "plan_mode_ready",
                        tool: { name: decision.tool.name, arguments: args, risk, signature },
                        message: decision.message || "",
                        plan_mode: run.plan_mode,
                        planMode: run.plan_mode,
                    }, run);
                    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "plan_mode_ready", tool: decision.tool.name, risk, signature, auto_continue: true });
                }
            }
            if (requiresUserConfirmation) {
                run.steps.push(step);
                run.status = "waiting_confirmation";
                run.phase = "needs_confirmation";
                run.pending_tool = { name: decision.tool.name, arguments: args, risk, signature };
                const confirmationLabel = risk === "high" ? "高风险操作" : "尚未获得明确写入授权的操作";
                run.final_reply = `${decision.message || `准备调用 ${decision.tool.name}`}\n\n${confirmationLabel}尚未执行，需要你确认后才能继续。`;
                run.confirmation_summary = buildGlobalConfirmationSummary({ run, pendingTool: run.pending_tool, reply: run.final_reply, decision: quality, permission });
                run.clarification_summary = null;
                run.presentation = classifyGlobalAgentRunPresentation(run, run.status);
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "confirmation_required", reasons: [confirmationLabel], status: "warning",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:confirmation:${signature}`, type: "global_agent.confirmation_required", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, arguments: args } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "permission",
                    risk,
                    target: signature,
                    status: "blocked",
                    message: confirmationLabel,
                    data: { arguments: args, authorization_basis: quality.authorizationBasis },
                });
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, {
                    type: "confirmation_required",
                    pending_tool: run.pending_tool,
                    reply: run.final_reply,
                    confirmation_summary: run.confirmation_summary,
                    confirmationSummary: run.confirmation_summary,
                    plan_mode: run.plan_mode || null,
                    planMode: run.plan_mode || null,
                }, run);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "confirmation_required", tool: decision.tool.name, risk, signature, permission });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", run.final_reply);
                return run;
            }
            const preHooks = (0, runtime_1.runGlobalAgentHooks)("pre_tool_use", { run, tool: decision.tool.name, args, risk });
            if (preHooks.blocked) {
                step.error = `Hook 阻止执行 ${decision.tool.name}${preHooks.message ? `：${preHooks.message}` : ""}`;
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "hook_blocked", phase: "pre_tool_use", tool: decision.tool.name, risk, hooks: preHooks.fired });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:hook_blocked:${signature}`, type: "global_agent.hook_blocked", status: "warning", message: step.error, data: { tool: decision.tool.name, risk, hooks: preHooks.fired } });
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", step.error, "hook_blocked");
            }
            (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                scope: "global",
                traceId: run.trace_id,
                runId: run.id,
                action: decision.tool.name,
                phase: "pre_tool_use",
                risk,
                target: signature,
                status: "running",
                message: step.message,
                data: { arguments: args, context: run.user_message },
            });
            (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "in_progress", step.message || `执行 ${decision.tool.name}`);
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_started", tool: decision.tool.name, risk, arguments: args });
            (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_started", tool: step.tool, message: step.message }, run);
            const toolStarted = runtime.now ? runtime.now() : Date.now();
            let acceptedSupervision = false;
            let lightUiShortReply = "";
            let lightUiToolSucceeded = false;
            try {
                const result = await runtime.executeTool(decision.tool.name, args, run);
                acceptedSupervision = isGlobalDispatchTool(decision.tool.name)
                    && result?.accepted === true
                    && result?.completed !== true
                    && !!run.supervisor_id;
                step.observation = compactObservation(result);
                (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `tool:${decision.tool.name}`, result);
                const toolSucceeded = result?.success !== false && !result?.error;
                if (toolSucceeded && LIGHT_UI_TOOL_NAMES.includes(String(decision.tool.name || ""))) {
                    lightUiToolSucceeded = true;
                    const fallbackByTool = decision.tool.name === "stop_music"
                        ? "已停止播放。"
                        : decision.tool.name === "navigate"
                            ? "已切换页面。"
                            : "已处理。";
                    lightUiShortReply = String(result?.message || decision.message || "").trim() || fallbackByTool;
                }
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                    id: `tool_${signature}`,
                    label: `工具 ${decision.tool.name} 产生可核验结果`,
                    kind: "tool_outcome",
                    status: toolSucceeded ? "passed" : "failed",
                    evidence: [compactObservation(result)],
                    reason: toolSucceeded ? "工具返回成功观察" : String(result?.error || "工具结果标记失败"),
                });
                if (toolSucceeded) {
                    run.reasoning_loop.replan_required = false;
                    run.reasoning_loop.last_replan_reason = "";
                }
                if (!toolSucceeded)
                    (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "tool_result_mismatch", `${decision.tool.name} 返回失败结果，需要重新规划`, "error");
                if (!toolSucceeded)
                    (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "tool_result_mismatch", whatHappened: `${decision.tool.name} 返回失败观察`, correction: "把失败观察写入事实快照并要求模型调整计划", preventRepeat: "后续计划必须引用当前事实，不能机械重复旧工具参数" });
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
                run.tool_calls += 1;
                run.consecutive_failures = 0;
                if (result?.client_effect)
                    run.client_effects.push(result.client_effect);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
                    outcome: "executed", reasons: [quality.intent.reason], status: "ok",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool:${step.index}:${signature}`, type: "global_agent.tool_completed", status: "ok", message: `${decision.tool.name} 执行完成`, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "post_tool_use",
                    risk,
                    target: signature,
                    status: toolSucceeded ? "ok" : "error",
                    message: `${decision.tool.name} 执行完成`,
                    data: { duration_ms: step.duration_ms, observation: step.observation },
                });
                (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_completed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, observation: step.observation });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, toolSucceeded ? "done" : "blocked", toolSucceeded ? `${decision.tool.name} 完成` : String(result?.error || `${decision.tool.name} 返回失败`));
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_completed", tool: step.tool, observation: step.observation }, run);
                if (toolSucceeded)
                    (0, global_agent_loop_engine_part_01_1.emitGlobalDispatchLaunchProgress)(runtime, run, step);
            }
            catch (error) {
                step.error = error?.message || String(error);
                step.observation = { success: false, error: step.error };
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
                run.tool_calls += 1;
                run.consecutive_failures += 1;
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${signature}`, label: `工具 ${decision.tool.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: step.error });
                (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "tool_execution_failed", `${decision.tool.name}: ${step.error}`, "error");
                (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "tool_execution_failed", whatHappened: `${decision.tool.name}: ${step.error}`, correction: "保存失败断言并进入下一轮重规划或安全停止", preventRepeat: "优先核对当前状态、参数与执行器健康度后再重试" });
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
                    outcome: "execution_failed", reasons: [step.error], status: "error",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_failed:${step.index}:${signature}`, type: "global_agent.tool_failed", status: "error", message: step.error, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "post_tool_use",
                    risk,
                    target: signature,
                    status: "error",
                    message: step.error,
                    data: { duration_ms: step.duration_ms, observation: step.observation },
                });
                (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_failed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, error: step.error });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_failed", tool: step.tool, error: step.error }, run);
            }
            run.steps.push(step);
            run.pending_tool = null;
            run.updated_at = nowIso(runtime);
            saveRun(run, runtime.persist !== false);
            if (acceptedSupervision) {
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "completed", decision.message || "全局任务已派发并进入持续跟进。");
            }
            // 轻量 UI 工具成功后直接短文案收口，避免第二轮模型再堆验证/证据
            if (lightUiToolSucceeded && lightUiShortReply) {
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "completed", stripNonExecutionReportSections(lightUiShortReply));
            }
            if (run.consecutive_failures >= 2)
                return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", `工具连续执行失败，已停止：${step.error}`, step.error || "tool_failures");
        }
        return run;
    }
    finally {
        activeRuns.delete(run.id);
        if (activeRunObjects.get(run.id) === run)
            activeRunObjects.delete(run.id);
    }
}
async function startGlobalAgentRun(input, runtime) {
    const createdAt = nowIso(runtime);
    const id = `gar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const run = normalizeRun({
        id,
        trace_id: (0, reliability_ledger_1.ensureTraceId)(input.traceId, "global-agent"),
        session_id: input.sessionId || "default",
        source: input.source || "web",
        user_message: input.message,
        original_user_message: input.message,
        history: input.history || [],
        status: "running",
        phase: "plan",
        explicit_write_authorization: input.explicitWriteAuthorization === true,
        created_at: createdAt,
        updated_at: createdAt,
        started_at: createdAt,
        deadline_at: new Date((runtime.now ? runtime.now() : Date.now()) + Math.max(10_000, Math.min(30 * 60_000, Number(input.timeoutMs || 10 * 60_000)))).toISOString(),
        max_steps: input.maxSteps || 8,
        steps: [],
        pending_tool: null,
        approved_tool_signatures: [],
        final_reply: "",
        error: "",
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        consecutive_failures: 0,
        client_effects: [],
        reasoning_loop: (0, reasoning_loop_1.createAgentReasoningState)({
            goal: input.message,
            authorizationScope: input.explicitWriteAuthorization ? ["本次明确请求所涉及的目标与影响范围"] : [],
            assertions: [{ id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal" }],
        }),
    });
    saveRun(run, runtime.persist !== false);
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:created`, type: "global_agent.run_created", status: "info", message: input.message.slice(0, 1000), data: { session_id: run.session_id, source: run.source, explicit_write_authorization: run.explicit_write_authorization } });
    return continueLoop(run, runtime);
}
async function resumeGlobalAgentRun(id, runtime, options = {}) {
    if (activeRuns.has(id)) {
        const started = Date.now();
        while (activeRuns.has(id) && Date.now() - started < 2 * 60_000)
            await new Promise(resolve => setTimeout(resolve, 100));
        if (activeRuns.has(id))
            throw new Error("全局 Agent 当前步骤尚未安全停下，请稍后重试");
    }
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    const run = normalizeRun(stored);
    if (["supervising", "completed", "failed", "cancelled"].includes(run.status))
        return run;
    if (run.status === "waiting_clarification")
        return run;
    if (options.cancelled || options.approved === false)
        return (0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "cancelled", "用户已取消本次操作。", "user_cancelled");
    if (run.status === "waiting_confirmation") {
        if (options.approved !== true)
            return run;
        if (!run.pending_tool?.signature)
            throw new Error("等待确认的工具信息不完整");
        const pending = run.pending_tool;
        const confirmedAt = nowIso(runtime);
        const acceptFeedback = compactGlobalUserSummaryText(options.feedback || options.acceptFeedback || "", "", 720);
        run.approved_tool_signatures.push(pending.signature);
        if (run.plan_mode)
            run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "confirmed", confirmedAt, acceptFeedback);
        run.plan_accept_feedback = acceptFeedback;
        run.last_plan_accept_feedback = acceptFeedback;
        run.last_plan_accept_feedback_at = acceptFeedback ? confirmedAt : "";
        if (acceptFeedback) {
            run.history.push({ role: "user", content: `确认执行前计划时补充要求：${acceptFeedback}` });
            run.history = run.history.slice(-12);
            (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "plan_accept_feedback", acceptFeedback);
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                id: "plan_accept_feedback",
                label: "用户确认计划时补充要求已纳入执行",
                kind: "intent",
                status: "passed",
                evidence: [acceptFeedback],
                reason: "用户在确认执行前计划时补充了执行要求",
            });
        }
        run.status = "running";
        run.phase = "execute";
        run.confirmation_summary = null;
        run.clarification_summary = null;
        run.resume_count += 1;
        run.updated_at = confirmedAt;
        saveRun(run, runtime.persist !== false);
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:confirmed:${pending.signature}`, type: "global_agent.confirmed", status: "ok", message: acceptFeedback ? "用户已确认待执行工具，并补充执行要求" : "用户已确认待执行工具", data: { tool: pending.name, has_accept_feedback: !!acceptFeedback } });
        const step = [...run.steps].reverse().find(item => item.tool?.signature === pending.signature && item.observation === undefined);
        const started = runtime.now ? runtime.now() : Date.now();
        try {
            const preHooks = (0, runtime_1.runGlobalAgentHooks)("pre_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk });
            if (preHooks.blocked)
                throw new Error(`Hook 阻止执行 ${pending.name}${preHooks.message ? `：${preHooks.message}` : ""}`);
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, "in_progress", `确认后执行 ${pending.name}`);
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_started", tool: pending.name, risk: pending.risk, confirmed: true, arguments: pending.arguments });
            (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_started", tool: pending, confirmed: true }, run);
            const result = await runtime.executeTool(pending.name, pending.arguments, run);
            (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `confirmed_tool:${pending.name}`, result);
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: result?.success === false || result?.error ? "failed" : "passed", evidence: [result], reason: "用户确认后执行" });
            if (step) {
                step.observation = compactObservation(result);
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - started);
            }
            run.tool_calls += 1;
            run.consecutive_failures = 0;
            if (result?.client_effect)
                run.client_effects.push(result.client_effect);
            (0, quality_center_1.recordAgentDecision)({
                run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                intent: run.decision_summary?.intent || (0, quality_center_1.normalizeAgentDecisionIntent)(null, run.user_message),
                proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
                target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
                outcome: "executed", reasons: ["用户确认后执行原待处理工具"], status: "ok",
            });
            (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_confirmed:${pending.signature}`, type: "global_agent.tool_completed", status: "ok", message: `${pending.name} 确认后执行完成`, data: { tool: pending.name, risk: pending.risk } });
            (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: result });
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_completed", tool: pending.name, risk: pending.risk, confirmed: true, observation: compactObservation(result) });
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, result?.success === false || result?.error ? "blocked" : "done", result?.error || `${pending.name} 确认后执行完成`);
            (0, global_agent_loop_engine_part_01_1.emit)(runtime, { type: "tool_completed", tool: pending, observation: result, confirmed: true }, run);
            if (!(result?.success === false || result?.error) && step)
                (0, global_agent_loop_engine_part_01_1.emitGlobalDispatchLaunchProgress)(runtime, run, step);
        }
        catch (error) {
            if (step) {
                step.error = error?.message || String(error);
                step.observation = { success: false, error: step.error };
            }
            run.tool_calls += 1;
            run.consecutive_failures += 1;
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: error?.message || String(error) });
            (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "confirmed_tool_failed", `${pending.name}: ${error?.message || error}`, "error");
            (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "confirmed_tool_failed", whatHappened: `${pending.name} 在用户确认后执行失败`, correction: "保留失败证据并重新核对当前状态", preventRepeat: "确认只授权动作，不代表工具结果可跳过验证" });
            (0, quality_center_1.recordAgentDecision)({
                run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                intent: run.decision_summary?.intent || (0, quality_center_1.normalizeAgentDecisionIntent)(null, run.user_message),
                proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
                target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
                outcome: "execution_failed", reasons: [step?.error || error?.message || String(error)], status: "error",
            });
            (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_confirmed_failed:${pending.signature}`, type: "global_agent.tool_failed", status: "error", message: error?.message || String(error), data: { tool: pending.name, risk: pending.risk } });
            (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: { success: false, error: error?.message || String(error) } });
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_failed", tool: pending.name, risk: pending.risk, confirmed: true, error: error?.message || String(error) });
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, "blocked", error?.message || String(error));
        }
        run.pending_tool = null;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
    }
    else {
        const resumedAt = nowIso(runtime);
        (0, global_agent_loop_engine_part_01_1.applyGlobalResumeFeedback)(run, runtime, options.feedback || options.acceptFeedback || "", { source: options.source || options.resumeSource || "user" });
        run.status = "running";
        run.resume_count += 1;
        run.updated_at = resumedAt;
        saveRun(run, runtime.persist !== false);
    }
    return continueLoop(run, runtime);
}
async function continueGlobalAgentRunWithClarification(id, answer, runtime, options = {}) {
    if (activeRuns.has(id))
        throw new Error("全局 Agent 当前仍在处理上一轮，请稍后再补充");
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    const run = normalizeRun(stored);
    if (run.status !== "waiting_clarification")
        throw new Error("该运行当前不在等待澄清状态");
    const clarification = String(answer || "").trim();
    if (!clarification)
        throw new Error("澄清内容不能为空");
    const deniesAction = /(?:不要|不用|先别|暂时别|只分析|仅分析|不执行|不要执行)/.test(clarification);
    const inheritedAuthorization = run.explicit_write_authorization && !deniesAction;
    const currentAuthorization = options.explicitWriteAuthorization === true && !deniesAction;
    (0, reasoning_loop_1.appendReasoningClarification)(run.reasoning_loop, {
        question: run.clarification_question || run.final_reply || "请补充目标和影响范围",
        answer: clarification,
        authorizationScope: currentAuthorization ? ["本轮澄清消息明确允许的范围"] : inheritedAuthorization ? ["同一澄清链中的原始明确执行范围"] : [],
    });
    if (deniesAction)
        run.reasoning_loop.authorization_scope = [];
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "passed", evidence: [clarification], reason: "用户已在同一待澄清运行中补充信息" });
    (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_after_clarification", "合并原始目标与当前澄清，不新开无上下文运行");
    run.history.push({ role: "assistant", content: run.clarification_question || run.final_reply || "请补充信息" }, { role: "user", content: clarification });
    run.history = run.history.slice(-12);
    run.user_message = run.reasoning_loop.effective_goal;
    run.explicit_write_authorization = currentAuthorization || inheritedAuthorization;
    run.status = "running";
    run.phase = "plan";
    run.clarification_question = "";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.final_reply = "";
    run.resume_count += 1;
    run.consecutive_failures = 0;
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:clarified:${run.resume_count}`, type: "global_agent.clarification_received", status: "ok", message: clarification.slice(0, 1000), data: { plan_version: run.reasoning_loop.plan_version, authorization_inherited: inheritedAuthorization, authorization_current: currentAuthorization } });
    return continueLoop(run, runtime);
}
function pauseGlobalAgentRun(id) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (stored.status !== "running")
        return stored;
    pauseRequests.add(id);
    const run = normalizeRun(stored);
    run.status = "paused";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.updated_at = new Date().toISOString();
    saveRun(run, !volatileRuns.has(id));
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
    return run;
}
function cancelGlobalAgentRun(id) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (["completed", "failed", "cancelled"].includes(stored.status))
        return stored;
    cancelRequests.add(id);
    if (activeRuns.has(id))
        return stored;
    const run = normalizeRun(stored);
    run.status = "cancelled";
    run.final_reply = "用户已取消本次运行。";
    run.error = "user_cancelled";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.completed_at = new Date().toISOString();
    if (run.plan_mode)
        run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "cancelled", run.completed_at);
    run.updated_at = run.completed_at;
    saveRun(run, !volatileRuns.has(id));
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:cancelled:${run.updated_at}`, type: "global_agent.run_cancelled", status: "warning", message: run.final_reply });
    return run;
}
async function recoverInterruptedGlobalAgentRuns(runtime) {
    const candidates = listGlobalAgentRuns({ status: "running", limit: 20 });
    const results = [];
    for (const stored of candidates) {
        const run = normalizeRun(stored);
        if (Date.now() > Date.parse(run.deadline_at)) {
            (0, reasoning_loop_1.recordReasoningRecoveryCheck)(run.reasoning_loop, { reason: "服务重启恢复时已超过截止时间", goalRevalidated: true, stateRevalidated: false, acceptanceRevalidated: false, remainingGaps: ["执行时间预算已耗尽"] });
            results.push((0, global_agent_loop_engine_part_01_1.completeRun)(run, runtime, "failed", "服务重启后发现运行已超过时间预算，已安全终止。", "recovery_deadline_exceeded"));
            continue;
        }
        const currentContext = runtime.getContext ? await runtime.getContext(run) : {};
        (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "restart_recovery_context", currentContext);
        (0, reasoning_loop_1.recordReasoningRecoveryCheck)(run.reasoning_loop, { reason: "服务重启后恢复同一运行", goalRevalidated: !!run.reasoning_loop.original_goal, stateRevalidated: true, acceptanceRevalidated: run.reasoning_loop.assertions.length > 0, remainingGaps: run.reasoning_loop.assertions.filter(item => item.status !== "passed").map(item => item.label) });
        run.resume_count += 1;
        results.push(await continueLoop(run, runtime));
    }
    return { total: candidates.length, resumed: results.filter(item => item.status !== "failed").length, results };
}
exports.runGlobalAgentLoopSelfTest = (0, global_agent_loop_self_tests_1.createGlobalAgentLoopSelfTest)({ GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, applyGlobalAgentSupervisionSteer: global_agent_loop_engine_part_01_1.applyGlobalAgentSupervisionSteer, attachGlobalAgentRunSupervision: global_agent_loop_engine_part_01_1.attachGlobalAgentRunSupervision, buildGlobalDispatchLaunchSummary, completeGlobalAgentSupervision: global_agent_loop_engine_part_01_1.completeGlobalAgentSupervision, continueGlobalAgentRunWithClarification, parseGlobalAgentDecision, pauseGlobalAgentRun, resumeGlobalAgentRun, runMainAgentDeliveryReportSelfTest: delivery_report_1.runMainAgentDeliveryReportSelfTest, runMainAgentWorkchainSelfTest: workchain_1.runMainAgentWorkchainSelfTest, startGlobalAgentRun, steerGlobalAgentRun: global_agent_loop_engine_part_01_1.steerGlobalAgentRun, updateGlobalAgentSupervisionState: global_agent_loop_engine_part_01_1.updateGlobalAgentSupervisionState });
//# sourceMappingURL=global-agent-loop-engine-part-02.js.map