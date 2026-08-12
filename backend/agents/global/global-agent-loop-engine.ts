// global-agent-loop-engine.ts — merged from 2 part files (behavior-freeze merge).

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  CCM_DIR,
} from "../../core/utils";
import {
  appendTraceEvent,
  ensureTraceId,
} from "../../system/reliability-ledger";
import {
  recordAgentRuntimeLifecycle,
} from "../runtime-kernel";
import { projectContextSourceToolResultForPersistence } from "../../system/context-source-tool-result-projection";
import { appendAssistantProgress, appendToolProjection, appendUserVisibleAgentEvent, appendUserVisibleRequirementPlan, buildUserVisibleAgentResult } from "../../system/user-visible-agent-events";
import { assistantProgressNarrationEnabled, buildAssistantProgressFallback, sanitizeAssistantProgressText } from "../../system/assistant-progress";
import { loadOrchestratorConfig } from "../../modules/collaboration/group-orchestrator-config";
import { publishUserVisibleAssistantText } from "../../system/user-visible-agent-projections";
import {
  recordGlobalAgentRunMetric,
} from "./global-agent-metrics";
import {
  evaluateAgentDecision,
  normalizeAgentDecisionIntent,
  recordAgentDecision,
  type AgentDecisionIntent,
} from "../quality-center";
import {
  appendReasoningClarification,
  captureReasoningFacts,
  createAgentReasoningState,
  explainReasoningDecision,
  normalizeAgentReasoningState,
  recordReasoningDeviation,
  recordReasoningPostmortem,
  recordReasoningRecoveryCheck,
  setReasoningAssertion,
  updateReasoningPlan,
  type AgentReasoningState,
} from "../reasoning-loop";
import {
  buildGlobalAgentToolDefinitions,
  buildGlobalAgentSessionDebug,
  evaluateGlobalAgentPermission,
  initializeGlobalAgentRuntimeRun,
  markGlobalAgentToolTodo as markRuntimeGlobalAgentToolTodo,
  recordGlobalAgentRuntimeOutput,
  runGlobalAgentHooks,
  updateGlobalAgentTodoLedger,
} from "./runtime";
import {
  buildMainAgentWorkchain,
  formatMainAgentCompletionReply,
  runMainAgentWorkchainSelfTest,
} from "../workchain";
import {
  buildMainAgentDeliveryReport,
  formatMainAgentDeliveryReply,
  runMainAgentDeliveryReportSelfTest,
} from "../delivery-report";
import {
  sanitizeMainAgentRoleLanguage,
  sanitizeMainAgentUserFacingText,
} from "../user-facing-text";
import {
  buildRoleSkillPrompt,
} from "../../skills/role-skills";
import {
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../workflow-decision";
import {
  globalWriteAuthorizationAllowsTool,
  revokeGlobalWriteAuthorization,
} from "./global-agent-authorization";
import { createGlobalRunTerminalReceipt } from "./global-terminal-delivery";
import { finalizeContextSourceRun, markContextSourcesFromOutput } from "../../system/main-agent-context-source-continuity";
import {
  createGlobalAgentLoopSelfTest,
} from "./global-agent-loop-self-tests";
import {
  createGlobalAgentRunSupervision,
} from "./global-agent-run-supervision";
import * as globalAgentRunProjection from "./global-agent-run-projection";
import * as globalAgentRunReplies from "./global-agent-run-replies";
import * as globalAgentRunStore from "./global-agent-run-store";
import type {
  GlobalAgentDecision,
  GlobalAgentDecisionState,
  GlobalAgentLoopRuntime,
  GlobalAgentRun,
  GlobalAgentRunStatus,
  GlobalAgentRunStep,
  GlobalAgentToolRisk,
  GlobalAgentToolSpec,
  GlobalAgentUserSteer,
  GlobalAgentUserSteerKind,
  GlobalAgentUserSteerStatus,
} from "./loop";

// ===== merged from global-agent-loop-engine-part-01.ts =====

const { compactObservation, GLOBAL_MODEL_ROUTE_KEYS, GLOBAL_MODEL_FORBIDDEN_FIELD, GROUP_SESSION_ID_PATTERN, redactGroupSessionIds, redactGroupSessionFields, projectRoutingValue, projectProjectRows, projectGroupRows, projectGlobalTaskRows, projectGlobalAgentObservationForModel, projectGlobalAgentReasoningForModel, parseGlobalAgentDecision, normalizeDecision, buildToolPrompt, buildGlobalAgentModelMessages } = globalAgentRunProjection;
const { nowIso, stripNonExecutionReportSections, GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN, hasGlobalUserSummaryTechnicalDetails, compactGlobalUserSummaryText, uniqueGlobalStrings, sanitizeGlobalVisibleReplyTerminology, globalVisibleReplyFallback, buildGlobalVisibleReplyContent, attachGlobalReplyTechnicalContent, getGlobalToolUserLabel, summarizeGlobalToolTarget, buildGlobalClarificationSummary, buildGlobalConfirmationSummary, buildGlobalPlanSteps, buildGlobalPlanExecutionFollowup, buildGlobalPlanModeSummary, updateGlobalPlanModeStatus, GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN, sanitizeGlobalDispatchVisibleText, normalizeDispatchDependency, buildGlobalDispatchRow, isGlobalDispatchTool, normalizeGlobalDispatchLaunchRowStatus, buildGlobalDispatchLaunchSummary } = globalAgentRunReplies;
const { GLOBAL_AGENT_TOOL_SPECS, STORE_DIR, STORE_FILE, STORE_BACKUP, MAX_STORED_RUNS, MAX_OBSERVATION_CHARS, GLOBAL_DISPATCH_TOOL_NAMES, LIGHT_UI_TOOL_NAMES, activeRuns, pauseRequests, cancelRequests, volatileRuns, activeRunObjects, destructiveOperation, writeJsonAtomic, normalizeGlobalAgentUserSteer, normalizeGlobalAgentUserSteers, normalizeRun, loadStore, saveRun, getGlobalAgentRun, listGlobalAgentRuns, findWaitingGlobalAgentRun, findClarifyingGlobalAgentRun, getGlobalAgentToolSpec, classifyGlobalAgentToolRisk, classifyGlobalAgentRunPresentation, isReadOnlyGlobalConsultation, stable, toolSignature, validateTool } = globalAgentRunStore;
const activeRunAbortControllers = new Map<string, AbortController>();

export const { attachGlobalAgentRunSupervision, completeGlobalAgentSupervision, globalSupervisionStateVisibleSummary, updateGlobalAgentSupervisionState } = createGlobalAgentRunSupervision({ appendTraceEvent, buildGlobalDisplayStreamFromWorkchain, buildGlobalRunWorkchain, getGlobalAgentRun, normalizeRun, recordGlobalAgentRuntimeOutput, saveRun, volatileRuns });

export function emitGlobalDispatchLaunchProgress(runtime: GlobalAgentLoopRuntime, run: GlobalAgentRun, step: GlobalAgentRunStep) {
  if (!isGlobalDispatchTool(step.tool?.name) || step.error || step.observation?.success === false || step.observation?.error) return;
  const dispatchLaunchSummary = buildGlobalDispatchLaunchSummary(run, run.status || "running", [...run.steps, step]);
  if (!dispatchLaunchSummary?.rows?.length) return;
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

export function emit(runtime: GlobalAgentLoopRuntime, event: any, run: GlobalAgentRun) {
  try { runtime.onEvent?.({ ...event, run_id: run.id, trace_id: run.trace_id, status: run.status, phase: run.phase }, run); } catch {}
  try {
    const sourceType = String(event?.type || "");
    const accepted = new Set([
      "started", "decision", "tool_started", "tool_completed", "tool_failed",
      "clarification_required", "confirmation_required", "completed", "failed", "cancelled", "blocked", "paused", "interrupted",
    ]);
    if (!accepted.has(sourceType) || !run.session_id) return;
    const tool = event?.tool || event?.pending_tool || {};
    const toolName = typeof tool === "string" ? tool : tool?.name;
    const eventType = sourceType === "decision" ? "thinking_status"
      : sourceType === "confirmation_required" ? "permission_required"
        : ["paused", "interrupted"].includes(sourceType) ? "result"
        : sourceType;
    const finalFileChanges = (() => {
      const candidates = [
        run.final_delivery_report?.files,
        run.final_report?.actual_file_changes,
        run.final_report?.file_changes,
        run.final_report?.files_modified,
        run.workchain?.delivery_report?.files,
        run.workchain?.completion_summary?.actual_file_changes,
        run.workchain?.completion_summary?.file_changes,
      ];
      return candidates.find(Array.isArray) || [];
    })();
    const result = ["completed", "failed", "cancelled", "blocked", "paused", "interrupted"].includes(sourceType)
      ? buildUserVisibleAgentResult({
        status: sourceType === "completed" ? "success" : sourceType,
        text: run.final_reply || event?.reply,
        durationMs: Math.max(0, Date.parse(run.completed_at || run.updated_at) - Date.parse(run.started_at)),
        turns: run.model_calls,
        toolCalls: run.tool_calls,
        stopReason: sourceType,
        usage: run.usage,
        fileChanges: finalFileChanges,
      })
      : undefined;
    const totalDurationMs = result ? Math.max(0, Date.parse(run.completed_at || run.updated_at) - Date.parse(run.started_at)) : 0;
    const modelDurationMs = result ? Math.max(0, Number(run.model_duration_ms || 0)) : 0;
    const toolWallDurationMs = result
      ? run.steps.reduce((sum, step) => sum + (step.tool ? Math.max(0, Number(step.duration_ms || 0)) : 0), 0)
      : 0;
    const otherDurationMs = result ? Math.max(0, totalDurationMs - modelDurationMs - toolWallDurationMs) : 0;
    const eventInput = {
      eventId: `global:${run.id}:${sourceType}:${tool?.signature || event?.step?.index || run.steps.length}`,
      scope: "global",
      scopeId: "global",
      exactSessionId: run.session_id,
      anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
      generation: Math.max(0, Number(run.resume_count || 0)),
      // A global run is a conversation turn, not automatically a formal task.
      // Only a real mission has a task-ledger entry and therefore a replay.
      taskId: run.mission_id || undefined,
      eventType,
      toolName: toolName === "invoke_mcp" ? (tool?.arguments?.tool_name || tool?.arguments?.toolName || toolName) : toolName,
      toolCallId: tool?.signature || undefined,
      arguments: tool?.arguments || {},
      observation: event?.observation,
      error: event?.error,
      durationMs: event?.step?.duration_ms,
      result,
      fileChanges: result ? finalFileChanges : undefined,
      usage: result ? run.usage : undefined,
      detail: result ? { timing: { totalMs: totalDurationMs, modelMs: modelDurationMs, toolWallMs: toolWallDurationMs, otherMs: otherDurationMs } } : undefined,
      display: {
        title: sourceType === "started" ? "全局 Agent"
          : sourceType === "decision" ? "正在思考"
            : sourceType === "confirmation_required" ? "需要操作确认"
              : sourceType === "clarification_required" ? "需要补充信息"
                : sourceType === "completed" ? "回复完成"
                  : undefined,
        summary: event?.message || event?.reply || event?.error || (sourceType === "tool_started" ? "正在执行" : sourceType === "tool_completed" ? "执行完成" : ""),
        status: sourceType === "completed" || sourceType === "tool_completed" ? "success"
          : sourceType === "tool_failed" || sourceType === "failed" || sourceType === "blocked" ? "failed"
            : ["confirmation_required", "clarification_required", "paused", "interrupted"].includes(sourceType) ? "waiting" : "running",
        toolUseCount: result ? run.tool_calls : undefined,
        tokenCount: result ? Number(run.usage?.totalTokens || 0) : undefined,
        tokenType: result ? "provider_total" : undefined,
        tokenAccuracy: result ? (run.usage?.reported === false ? "estimated" : "reported") : undefined,
      },
    };
    if (["tool_started", "tool_completed", "tool_failed"].includes(sourceType)) appendToolProjection(eventInput);
    else appendUserVisibleAgentEvent(eventInput);
  } catch {}
}

function appendGlobalRequirementPlan(run: GlobalAgentRun, decision: GlobalAgentDecision | null, terminalStatus?: "completed" | "blocked") {
  const current = (run as any).user_visible_requirement_plan || null;
  const planSteps = Array.isArray(decision?.plan) && decision!.plan.length
    ? decision!.plan.map(String).filter(Boolean)
    : Array.isArray(current?.steps) ? current.steps.map((step: any) => String(step?.title || "")).filter(Boolean) : [];
  const workflow = decision?.workflowDecision || run.workflow_decision || run.workflowDecision || null;
  const workflowValue: any = workflow;
  const actionRequired = workflowValue?.actionRequired === true || workflowValue?.action_required === true;
  if (!planSteps.length || (!actionRequired && !terminalStatus && !current)) return null;
  const runtimeDebug = buildGlobalAgentSessionDebug(run);
  const runtimeTodos = Array.isArray(runtimeDebug?.todos) ? runtimeDebug.todos : [];
  const todoByTitle = new Map(runtimeTodos.map((todo: any) => [String(todo?.text || "").trim(), String(todo?.status || "")]));
  const currentByTitle = new Map((Array.isArray(current?.steps) ? current.steps : []).map((step: any) => [String(step?.title || "").trim(), String(step?.status || "pending")]));
  const blockedStepIndex = Math.max(0, planSteps.findIndex((title: string) => {
    const todoStatus = todoByTitle.get(title);
    const previous = currentByTitle.get(title);
    return todoStatus === "blocked" || todoStatus === "in_progress" || previous === "running" || previous === "blocked";
  }));
  const stepStatuses = planSteps.map((title: string, index: number) => {
    if (terminalStatus === "completed") return "completed";
    if (terminalStatus === "blocked") {
      if (index === blockedStepIndex) return "blocked";
      return index < blockedStepIndex ? "completed" : "pending";
    }
    const todoStatus = todoByTitle.get(title);
    if (todoStatus === "done") return "completed";
    if (todoStatus === "blocked") return "blocked";
    if (todoStatus === "in_progress") return "running";
    const previous = currentByTitle.get(title);
    if (previous && previous !== "blocked") return previous;
    return index === 0 ? "running" : "pending";
  });
  const stablePlan = {
    goal: String(run.original_user_message || run.user_message || "完成当前任务。"),
    steps: planSteps,
    stepStatuses,
    scope: Array.isArray(workflowValue?.impactScope || workflowValue?.impact_scope) ? (workflowValue.impactScope || workflowValue.impact_scope).map(String) : [],
  };
  const checksum = crypto.createHash("sha256").update(JSON.stringify(stablePlan)).digest("hex");
  const changed = checksum !== String((run as any).user_visible_requirement_plan_checksum || "");
  const revision = changed ? Math.max(1, Number((run as any).user_visible_requirement_plan_revision || 0) + 1) : Math.max(1, Number((run as any).user_visible_requirement_plan_revision || 1));
  if (!terminalStatus && !changed && current) return null;
  const plan = {
    planId: run.mission_id || run.id,
    revision,
    title: "需求实施计划",
    goal: stablePlan.goal,
    steps: planSteps.map((title: string, index: number) => ({
      id: `step_${index + 1}`,
      title,
      description: title,
      outcome: "完成后进入下一阶段，并保留可验证的结果。",
      dependsOn: index > 0 ? [`step_${index}`] : [],
      status: stepStatuses[index],
    })),
    scope: stablePlan.scope,
    expectedResults: Array.isArray(decision?.completion?.evidence) ? decision!.completion!.evidence : [],
    exclusions: [],
    status: terminalStatus || "executing",
    createdAt: current?.createdAt || run.started_at,
    updatedAt: run.updated_at || new Date().toISOString(),
  };
  (run as any).user_visible_requirement_plan = plan;
  (run as any).user_visible_requirement_plan_checksum = checksum;
  (run as any).user_visible_requirement_plan_revision = revision;
  return appendUserVisibleRequirementPlan({
    eventId: `global:${run.id}:requirement-plan:${revision}:${terminalStatus || "executing"}`,
    scope: "global",
    scopeId: "global",
    exactSessionId: run.session_id,
    anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
    generation: Math.max(0, Number(run.resume_count || 0)),
    taskId: run.mission_id || undefined,
    plan,
  });
}

function markGlobalAgentToolTodo(run: GlobalAgentRun, tool: string, status: any, text = "") {
  const todos = markRuntimeGlobalAgentToolTodo(run, tool, status, text);
  appendGlobalRequirementPlan(run, null);
  return todos;
}

export function classifyGlobalAgentUserSteer(message: string, requestedKind: string = "auto"): GlobalAgentUserSteerKind {
  const requested = String(requestedKind || "auto").trim().toLowerCase();
  if (requested === "supplement" || requested === "revise_goal") return requested;
  void message;
  // 所有正常入口都会先调用统一大模型并传入明确 kind。缺失决策时采用
  // 不继承旧写授权的保守类型，不能用本地关键词猜测用户是在补充还是改目标。
  return "revise_goal";
}

export function buildGlobalAgentEffectiveGoal(run: GlobalAgentRun) {
  const applied = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, "applied", 16);
  return [
    run.original_user_message || run.user_message,
    ...applied.map(item => `${item.kind === "revise_goal" ? "执行中目标调整" : "执行中补充要求"}：${item.message}`),
  ].filter(Boolean).join("\n").slice(0, 50_000);
}

export function steerGlobalAgentRun(id: string, message: string, options: {
  kind?: GlobalAgentUserSteerKind | "auto";
  source?: string;
  requestId?: string;
} = {}) {
  const active = activeRunObjects.get(id);
  if (!active || !activeRuns.has(id) || active.status !== "running") {
    const stored = getGlobalAgentRun(id);
    if (!stored) throw new Error("全局 Agent 运行不存在");
    throw new Error("这次运行当前不在执行中；请使用继续、确认或新消息进入下一步");
  }
  const normalizedMessage = String(message || "").trim().slice(0, 8_000);
  if (!normalizedMessage) throw new Error("补充要求不能为空");
  const requestId = String(options.requestId || "").trim().slice(0, 160);
  const existing = requestId
    ? normalizeGlobalAgentUserSteers(active.user_steer_history || active.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
    : null;
  if (existing) return { run: active, steering: existing, duplicate: true };

  const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
  const at = new Date().toISOString();
  const steering: GlobalAgentUserSteer = {
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
  recordGlobalAgentRuntimeOutput(active, { type: "user_steer_queued", steering });
  appendTraceEvent(active.trace_id, {
    id: `${active.id}:user-steer-queued:${steering.id}`,
    type: "global_agent.user_steer_queued",
    status: "info",
    message: kind === "revise_goal" ? "执行中的目标调整已进入当前运行" : "执行中的补充要求已进入当前运行",
    data: { steering_id: steering.id, kind, source: steering.source, request_id: steering.request_id || "" },
  });
  return { run: active, steering, duplicate: false };
}

export function applyGlobalAgentSupervisionSteer(id: string, message: string, options: {
  kind?: GlobalAgentUserSteerKind | "auto";
  source?: string;
  requestId?: string;
  supervisorState?: string;
  continuationSummary?: any;
} = {}) {
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  if (!stored.supervisor_id || !["supervising", "paused"].includes(stored.status)) {
    throw new Error("这次运行当前不在持续跟进阶段");
  }
  const normalizedMessage = String(message || "").trim().slice(0, 8_000);
  if (!normalizedMessage) throw new Error("补充要求不能为空");
  const run = normalizeRun(stored);
  const requestId = String(options.requestId || "").trim().slice(0, 160);
  const existing = requestId
    ? normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
    : null;
  if (existing) return { run, steering: existing, duplicate: true, applied: existing.status === "applied" };

  const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
  const source = String(options.source || "global_supervision_steer").trim().slice(0, 120) || "global_supervision_steer";
  const at = new Date().toISOString();
  const steering: GlobalAgentUserSteer = {
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
  const interruptedTaskCount = Number(
    summary.interrupted_task_count
      ?? nestedSummary.interrupted_task_count
      ?? nestedSummary.interruption_requested_count
      ?? 0,
  );
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

  captureReasoningFacts(run.reasoning_loop, `supervision_steer:${steering.id}`, {
    message: normalizedMessage,
    kind,
    source,
    supervisor_id: run.supervisor_id,
    mission_id: run.mission_id,
    continuation: supervisionContinuation,
  });
  setReasoningAssertion(run.reasoning_loop, {
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
    recordReasoningDeviation(run.reasoning_loop, "supervision_goal_revised", `用户在持续跟进阶段调整目标：${normalizedMessage}`, "warning");
    explainReasoningDecision(run.reasoning_loop, "replan_supervised_mission", "旧目标对应的执行轮已停止或退出队列；重新规划前不沿用旧范围写入授权。");
  } else {
    explainReasoningDecision(run.reasoning_loop, "continue_supervised_mission", "补充要求已并入同一全局任务，不改变当前目标边界和已确认授权。");
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
  const todoStep = (id: string, label: string, activeForm: string, status: string, detail = "") => ({
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
  recordGlobalAgentRuntimeOutput(run, {
    type: "user_steer_applied",
    steering,
    supervision_continuation: supervisionContinuation,
  });
  appendTraceEvent(run.trace_id, {
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

export function applyPendingGlobalAgentUserSteers(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime) {
  const pending = normalizeGlobalAgentUserSteers(run.pending_user_messages || run.pendingUserMessages, "queued", 20);
  if (!pending.length) return [];
  const appliedAt = nowIso(runtime);
  run.pending_user_messages = [];
  run.pendingUserMessages = run.pending_user_messages;
  const history = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40);
  const applied = pending.map(item => ({
    ...item,
    status: "applied" as GlobalAgentUserSteerStatus,
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
    captureReasoningFacts(run.reasoning_loop, `user_steer:${steering.id}`, {
      kind: steering.kind,
      message: steering.message,
      source: steering.source,
      at: steering.at,
    });
    setReasoningAssertion(run.reasoning_loop, {
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
      recordReasoningDeviation(run.reasoning_loop, "user_goal_revised", `用户在执行中调整目标：${steering.message}`, "warning");
      explainReasoningDecision(run.reasoning_loop, "replan_after_user_steer", "最新目标边界优先于旧计划；重新规划前不沿用旧范围的写入授权。");
    } else {
      explainReasoningDecision(run.reasoning_loop, "continue_with_user_steer", "把用户的补充要求合并到同一运行，下一轮决策必须读取这条上下文。");
    }
    run.last_user_steer = steering;
    run.lastUserSteer = steering;
    recordGlobalAgentRuntimeOutput(run, { type: "user_steer_applied", steering });
    appendTraceEvent(run.trace_id, {
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

export function applyGlobalResumeFeedback(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, value: any, options: { source?: string } = {}) {
  const feedback = compactGlobalUserSummaryText(value, "", 720);
  if (!feedback) return "";
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
  captureReasoningFacts(run.reasoning_loop, "resume_feedback", { feedback, source, at, status: run.status, phase: run.phase });
  setReasoningAssertion(run.reasoning_loop, {
    id: "resume_feedback",
    label: "继续处理时的补充要求已纳入下一轮",
    kind: "intent",
    status: "passed",
    evidence: [feedback],
    reason: "用户在继续运行时补充了要求",
  });
  explainReasoningDecision(run.reasoning_loop, "resume_with_feedback", "用户在继续运行时补充了要求，下一轮决策必须合并这条上下文。");
  recordGlobalAgentRuntimeOutput(run, { type: "resume_feedback", feedback, source, at });
  appendTraceEvent(run.trace_id, {
    id: `${run.id}:resume-feedback:${run.resume_count + 1}:${Date.parse(at) || Date.now()}`,
    type: "global_agent.resume_feedback",
    status: "ok",
    message: "继续处理时的补充要求已记录",
    data: { source, feedback },
  });
  emit(runtime, { type: "resume_feedback", feedback, source, message: "继续处理时的补充要求已记录" }, run);
  return feedback;
}

export function buildGlobalRunWorkchain(run: GlobalAgentRun, status: GlobalAgentRunStatus, reply = "", report: any = null, options: { mode?: string } = {}) {
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
  const workchain = buildMainAgentWorkchain({
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
    (workchain as any).dispatch_launch_summary = dispatchLaunchSummary;
    (workchain as any).dispatchLaunchSummary = dispatchLaunchSummary;
    if ((workchain as any).completion_summary) {
      (workchain as any).completion_summary.dispatch_launch_summary = dispatchLaunchSummary;
      (workchain as any).completion_summary.dispatchLaunchSummary = dispatchLaunchSummary;
    }
  }
  if (deliveryReport) {
    (workchain as any).delivery_report = deliveryReport;
    if ((workchain as any).completion_summary) (workchain as any).completion_summary.delivery_report = deliveryReport;
  }
  return workchain;
}

export function buildGlobalDisplayStreamFromWorkchain(workchain: any) {
  const dispatchLaunchSummary = workchain.dispatch_launch_summary
    || workchain.dispatchLaunchSummary
    || workchain.completion_summary?.dispatch_launch_summary
    || workchain.completion_summary?.dispatchLaunchSummary
    || null;
  const mainAgentDecision: any = dispatchLaunchSummary ? {
    version: 2,
    mode: "delegation",
    trace_id: workchain.trace_id || workchain.technical_details?.find?.((item: any) => item?.id === "ids")?.items?.find?.((item: any) => item?.label === "Trace")?.value || "",
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
  if (mainAgentDecision) mainAgentDecision.display_stream = {
    schema: "ccm-streamlined-display-v2",
    user_visible_text: workchain.user_visible_text,
    dispatch_launch_summary: dispatchLaunchSummary,
    dispatchLaunchSummary,
    workchain,
  };
  if (mainAgentDecision) mainAgentDecision.user_plan_steps = mainAgentDecision.todo_plan.steps;
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

export function completeRun(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, status: GlobalAgentRunStatus, reply: string, error = "") {
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
    recordGlobalAgentRuntimeOutput(run, { type: "supervising", status: run.status, mission_id: run.mission_id, supervisor_id: run.supervisor_id, reply: run.final_reply });
    appendTraceEvent(run.trace_id, { id: `${run.id}:supervising:${run.updated_at}`, type: "global_agent.supervising", status: "info", message: run.final_reply, data: { mission_id: run.mission_id, supervisor_id: run.supervisor_id } });
    emit(runtime, { type: "supervising", reply: run.final_reply, mission_id: run.mission_id, supervisor_id: run.supervisor_id }, run);
    return run;
  }
  run.status = status;
  run.phase = status === "completed" ? "complete" : run.phase;
  run.error = String(error || "");
  run.clarification_summary = null;
  run.confirmation_summary = null;
  if (run.plan_mode) run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "failed", completedAt);
  const rawReply = String(reply || run.final_reply || (status === "completed" ? "已完成。" : "执行未完成。"));
  const intentCategory = String(run.decision_summary?.intent?.category || "");
  // 终态按当前证据重算档位，避免沿用等待确认时的旧 presentation
  run.presentation = classifyGlobalAgentRunPresentation({ ...run, presentation: undefined }, status);
  const ordinaryConversation = isReadOnlyGlobalConsultation({ ...run, presentation: run.presentation }, status) || run.presentation === "reply";
  const workchain = buildGlobalRunWorkchain(
    run,
    status,
    rawReply,
    run.final_delivery_report || run.final_report || null,
    { mode: ordinaryConversation ? "conversation" : undefined },
  );
  const includeDetails = !ordinaryConversation
    && run.presentation === "delivery"
    && (status !== "completed" || run.tool_calls > 0 || !!run.mission_id || ["execution", "high_risk"].includes(intentCategory));
  if (includeDetails) {
    const deliveryReport = buildMainAgentDeliveryReport({
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
    (workchain as any).delivery_report = deliveryReport;
    if ((workchain as any).completion_summary) (workchain as any).completion_summary.delivery_report = deliveryReport;
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
  if (!includeDetails) run.final_report = run.final_report || workchain.completion_summary;
  const finalReplyCandidate = includeDetails && run.final_delivery_report
    ? formatMainAgentDeliveryReply(run.final_delivery_report)
    : formatMainAgentCompletionReply({ reply: rawReply, workchain, includeDetails: false });
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
  run.terminal_receipt = createGlobalRunTerminalReceipt({
    id: "",
    mission_id: run.mission_id || "",
    global_run_id: run.id,
    session_id: run.session_id,
    outcome: status,
    report: run.final_report || { summary: run.final_reply, error: run.error },
    settled_at: completedAt,
  });
  if (run.session_id) {
    const sourceIdentity = { agentKind: "global" as const, scope: "global" as const, scopeId: "global-agent", exactSessionId: run.session_id, generation: 0 };
    // 最终回答只证明来源被使用；正式 promotion 必须由长期记忆原子准入后的事务入口完成。
    markContextSourcesFromOutput(sourceIdentity, run.final_reply);
    finalizeContextSourceRun(sourceIdentity);
  }
  appendGlobalRequirementPlan(run, null, status === "completed" ? "completed" : "blocked");
  saveRun(run, runtime.persist !== false);
  recordGlobalAgentRuntimeOutput(run, { type: "run_terminal", status, reply: run.final_reply, error: run.error });
  appendTraceEvent(run.trace_id, { id: `${run.id}:${status}:${run.completed_at}`, type: `global_agent.run_${status}`, status: status === "completed" ? "ok" : status === "cancelled" ? "warning" : "error", message: run.final_reply.slice(0, 1000), data: { steps: run.steps.length, model_calls: run.model_calls, tool_calls: run.tool_calls, error: run.error } });
  if (recordGlobalAgentRunMetric(run, status, { source: run.source || "global-agent-loop" }) && run.metrics_recorded === true) {
    saveRun(run, runtime.persist !== false);
  }
  publishUserVisibleAssistantText({
    scope: "global", scopeId: "global", exactSessionId: run.session_id,
    generation: Math.max(0, Number(run.resume_count || 0)), taskId: run.mission_id || undefined,
    turnId: run.id, text: run.final_reply, title: "全局 Agent 回复",
  });
  emit(runtime, { type: status === "completed" ? "completed" : status, reply: run.final_reply, error: run.error }, run);
  return run;
}

// ===== merged from global-agent-loop-engine-part-02.ts =====



async function continueLoop(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime): Promise<GlobalAgentRun> {
  if (activeRuns.has(run.id)) return activeRunObjects.get(run.id) || run;
  activeRuns.add(run.id);
  activeRunObjects.set(run.id, run);
  const runAbortController = new AbortController();
  activeRunAbortControllers.set(run.id, runAbortController);
  try {
    run.status = "running";
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
    initializeGlobalAgentRuntimeRun(run);
    recordGlobalAgentRuntimeOutput(run, { type: "run_started", status: run.status, phase: run.phase });
    emit(runtime, { type: "started" }, run);

    while (run.status === "running") {
      if (cancelRequests.delete(run.id)) return completeRun(run, runtime, "cancelled", "用户已取消本次运行。", "user_cancelled");
      if (pauseRequests.delete(run.id)) {
        run.status = "paused";
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        appendTraceEvent(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
        emit(runtime, { type: "paused", reply: "我已暂停这次运行。" }, run);
        return run;
      }
      applyPendingGlobalAgentUserSteers(run, runtime);
      const now = runtime.now ? runtime.now() : Date.now();
      if (now > Date.parse(run.deadline_at)) return completeRun(run, runtime, "failed", "本次运行已达到执行时间上限，我已安全停止。", "deadline_exceeded");
      if (run.steps.length >= run.max_steps) return completeRun(run, runtime, "failed", "本次运行已达到最大步骤数，我已停止以避免死循环。", "step_budget_exceeded");

      let decision: GlobalAgentDecision;
      const decisionStarted = now;
      try {
        let messages = await buildGlobalAgentModelMessages(run, runtime);
        if (runtime.prepareModelMessages) messages = await runtime.prepareModelMessages(messages, run);
        run.model_calls += 1;
        const modelStartedAt = runtime.now ? runtime.now() : Date.now();
        let rawDecision: any;
        try {
          rawDecision = await runtime.callModel(messages, run, runAbortController.signal);
        } finally {
          run.model_duration_ms = Math.max(0, Number(run.model_duration_ms || 0))
            + Math.max(0, (runtime.now ? runtime.now() : Date.now()) - modelStartedAt);
        }
        if (applyPendingGlobalAgentUserSteers(run, runtime).length) continue;
        decision = parseGlobalAgentDecision(rawDecision, run.workflow_decision || run.workflowDecision || null);
      } catch (error: any) {
        if (cancelRequests.delete(run.id)) return completeRun(run, runtime, "cancelled", "用户已取消本次运行。", "user_cancelled");
        if (pauseRequests.delete(run.id)) {
          run.status = "paused";
          run.updated_at = nowIso(runtime);
          saveRun(run, runtime.persist !== false);
          emit(runtime, { type: "interrupted", reply: "当前执行已停止，运行上下文已经保留。" }, run);
          return run;
        }
        if (applyPendingGlobalAgentUserSteers(run, runtime).length) continue;
        const fallback = runtime.fallbackDecision ? await runtime.fallbackDecision(run, error) : null;
        if (!fallback) return completeRun(run, runtime, "failed", `我暂时无法形成可靠决策：${error?.message || error}`, error?.message || String(error));
        decision = normalizeDecision(fallback, run.workflow_decision || run.workflowDecision || null);
      }

      run.phase = decision.state;
      run.workflow_decision = decision.workflowDecision;
      run.workflowDecision = decision.workflowDecision;
      if (runtime.onWorkflowDecision) {
        try {
          await runtime.onWorkflowDecision(decision.workflowDecision, run, run.model_calls, decision);
        } catch (error: any) {
          return completeRun(run, runtime, "failed", error?.message || "当前账户无权执行这项操作。", error?.code || error?.message || "workflow_authorization_failed");
        }
      }
      const normalizedIntent = normalizeAgentDecisionIntent(decision.intent, run.user_message);
      decision.intent = normalizedIntent;
      updateReasoningPlan(run.reasoning_loop, decision.plan || [], normalizedIntent.reason || `decision:${decision.state}`);
      updateGlobalAgentTodoLedger(run, decision.plan || [], decision.tool?.name || "");
      appendGlobalRequirementPlan(run, decision);
      explainReasoningDecision(run.reasoning_loop, decision.state, normalizedIntent.reason || decision.message || "模型形成下一步决策");
      const step: GlobalAgentRunStep = {
        index: run.steps.length + 1,
        at: nowIso(runtime),
        state: decision.state,
        message: String(decision.message || ""),
        plan: decision.plan || [],
        duration_ms: Math.max(0, (runtime.now ? runtime.now() : Date.now()) - decisionStarted),
        decision: { intent: normalizedIntent },
      };

      if (!decision.tool) {
        const quality = evaluateAgentDecision({ message: run.user_message, decision, risk: "read", explicitWriteAuthorization: run.explicit_write_authorization, priorSteps: run.steps, policyOverride: runtime.qualityPolicyOverride });
        run.decision_summary = quality;
        run.shadow_mode = quality.policy.shadowMode;
        step.decision = quality;
        run.steps.push(step);
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: null, risk: "read", target_grounded: true,
          authorization_basis: quality.authorizationBasis,
          outcome: decision.state === "needs_confirmation" ? "clarification_required" : ["answer", "complete"].includes(decision.state) ? (run.tool_calls > 0 ? "completed_after_action" : "answered") : "non_terminal_without_action",
          reasons: [quality.intent.reason], status: decision.state === "needs_confirmation" ? "warning" : "ok",
        });
        emit(runtime, { type: "decision", step }, run);
        recordGlobalAgentRuntimeOutput(run, { type: "decision", state: decision.state, message: step.message, intent: quality.intent });
        if (decision.state === "needs_confirmation") {
          markGlobalAgentToolTodo(run, "", "blocked", decision.message || "等待用户澄清");
          setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标与影响范围已澄清", kind: "intent", status: "blocked", reason: decision.message });
          recordReasoningDeviation(run.reasoning_loop, "ambiguous_intent", decision.message || normalizedIntent.reason, "warning");
          run.status = "waiting_clarification";
          run.phase = "needs_confirmation";
          run.clarification_question = decision.message || "请补充要操作的目标、期望动作和允许的影响范围。";
          run.final_reply = run.clarification_question;
          run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
          run.confirmation_summary = null;
          run.presentation = classifyGlobalAgentRunPresentation(run, run.status);
          run.updated_at = nowIso(runtime);
          saveRun(run, runtime.persist !== false);
          appendTraceEvent(run.trace_id, { id: `${run.id}:clarification:${step.index}`, type: "global_agent.clarification_required", status: "warning", message: run.final_reply, data: { intent: normalizedIntent } });
          emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
          return run;
        }
        if (["answer", "complete"].includes(decision.state)) {
          const completion = decision.completion || {};
          const executionIntent = ["execution", "high_risk"].includes(normalizedIntent.category) && normalizedIntent.action_required;
          const failedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "failed");
          const passedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "passed");
          if (executionIntent && run.explicit_write_authorization && run.tool_calls === 0) {
            const reason = "已识别明确执行意图，但尚未形成并执行可靠工具行动";
            recordReasoningDeviation(run.reasoning_loop, "missed_execution", reason, "error");
            recordReasoningPostmortem(run.reasoning_loop, { trigger: "missed_execution", whatHappened: reason, correction: "阻止终态并向用户索取可执行目标和验收范围", preventRepeat: "明确执行意图必须产生经过授权的工具行动或明确阻塞证据" });
            setReasoningAssertion(run.reasoning_loop, { id: "goal", label: "用户要求的执行目标已实际完成", kind: "goal", status: "blocked", reason });
            run.status = "waiting_clarification";
            run.phase = "needs_confirmation";
            run.clarification_question = "我识别到你要求实际执行，但当前还没有形成可核验的行动方案。请确认目标对象、允许修改的范围和验收结果；我不会把一段说明冒充已完成。";
            run.final_reply = run.clarification_question;
            run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality, reason });
            run.confirmation_summary = null;
            run.updated_at = nowIso(runtime);
            saveRun(run, runtime.persist !== false);
            emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
            return run;
          }
          if (executionIntent && failedToolAssertions.length && !passedToolAssertions.length) {
            recordReasoningDeviation(run.reasoning_loop, "premature_completion", "模型试图结束，但执行结果仍失败；要求重新规划", "error");
            recordReasoningPostmortem(run.reasoning_loop, { trigger: "premature_completion", whatHappened: "模型在所有执行结果仍失败时尝试结束", correction: "拒绝完成并回到计划阶段", preventRepeat: "完成前检查工具断言和验收证据，失败断言未消解时不得结束" });
            if (run.steps.length < run.max_steps) continue;
            return completeRun(run, runtime, "failed", "执行结果仍未通过验证，不能报告完成。", "unverified_completion");
          }
          setReasoningAssertion(run.reasoning_loop, {
            id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal", status: executionIntent ? (passedToolAssertions.length ? "passed" : "blocked") : "passed",
            evidence: [...(completion.evidence || []), ...passedToolAssertions.map(item => item.label)], reason: normalizedIntent.reason,
          });
          // 简单业务（presentation=reply）不因 intent=execution 拼交付栏目
          const includeDeliveryDetails = !isReadOnlyGlobalConsultation(run, "completed");
          const directReply = decision.message || completion.summary || "已完成。";
          const parts = [includeDeliveryDetails ? directReply : stripNonExecutionReportSections(directReply)];
          if (includeDeliveryDetails && completion.evidence?.length) parts.push(`验证/证据：\n- ${completion.evidence.join("\n- ")}`);
          if (includeDeliveryDetails && completion.risks?.length) parts.push(`风险：\n- ${completion.risks.join("\n- ")}`);
          if (includeDeliveryDetails && completion.next_action) parts.push(`下一步：${completion.next_action}`);
          markGlobalAgentToolTodo(run, "", "done", "本轮回复已整理");
          return completeRun(run, runtime, "completed", parts.filter(Boolean).join("\n\n"));
        }
        markGlobalAgentToolTodo(run, "", "blocked", "非终态决策缺少工具");
        return completeRun(run, runtime, "failed", "当前决策还没有可执行动作，我已停止并保留排障信息。", "non_terminal_without_tool");
      }

      let args: any;
      let risk: GlobalAgentToolRisk;
      let signature: string;
      try {
        args = validateTool(decision.tool.name, decision.tool.arguments || {});
        risk = classifyGlobalAgentToolRisk(decision.tool.name, args);
        signature = toolSignature(decision.tool.name, args);
      } catch (error: any) {
        step.error = error?.message || String(error);
        run.steps.push(step);
        run.consecutive_failures += 1;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        emit(runtime, { type: "tool_validation_failed", step }, run);
        if (run.consecutive_failures >= 2) return completeRun(run, runtime, "failed", `工具参数连续校验失败：${step.error}`, step.error);
        continue;
      }

      step.tool = { name: decision.tool.name, arguments: args, risk, signature };
      const quality = evaluateAgentDecision({
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
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", quality.clarificationQuestion);
        setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "blocked", reason: quality.clarificationReasons.join("；") });
        recordReasoningDeviation(run.reasoning_loop, "decision_quality_gap", quality.clarificationReasons.join("；"), "warning");
        run.steps.push(step);
        run.status = "waiting_clarification";
        run.phase = "needs_confirmation";
        run.clarification_question = quality.clarificationQuestion;
        run.final_reply = quality.clarificationQuestion;
        run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
        run.confirmation_summary = null;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "clarification_required", reasons: quality.clarificationReasons, status: "warning",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:quality-block:${signature}`, type: "global_agent.decision_blocked", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, reasons: quality.clarificationReasons, intent: quality.intent } });
        emit(runtime, { type: "clarification_required", reply: run.final_reply, pending_tool: null, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
        return run;
      }
      if (quality.shadowed) {
        markGlobalAgentToolTodo(run, decision.tool.name, "done", `影子模式记录 ${decision.tool.name}`);
        recordGlobalAgentRuntimeOutput(run, { type: "tool_shadowed", tool: decision.tool.name, risk, arguments: args });
        step.observation = { success: true, shadowed: true, executed: false, proposed_tool: decision.tool.name, arguments: args };
        run.steps.push(step);
        run.tool_calls += 0;
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "shadowed", reasons: ["影子模式启用，未产生副作用"], status: "info",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:shadow:${signature}`, type: "global_agent.tool_shadowed", status: "info", message: `影子模式记录 ${decision.tool.name}，未执行`, data: { tool: decision.tool.name, risk, arguments: args, intent: quality.intent } });
        recordAgentRuntimeLifecycle({
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
        return completeRun(run, runtime, "completed", `${decision.message || "已形成执行方案。"}\n\n当前处于影子模式：拟调用 ${decision.tool.name}，本次没有执行任何写操作。`);
      }
      const priorSame = run.steps.filter(item => item.tool?.signature === signature).length;
      if (priorSame >= 2) {
        step.error = "检测到重复工具调用，已阻止死循环";
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        return completeRun(run, runtime, "failed", step.error, "duplicate_tool_loop");
      }

      const permission = evaluateGlobalAgentPermission({ run, tool: decision.tool.name, args, risk, signature });
      if (permission.denied) {
        step.error = `权限规则拒绝执行 ${decision.tool.name}${permission.rule?.reason ? `：${permission.rule.reason}` : ""}`;
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        recordGlobalAgentRuntimeOutput(run, { type: "permission_denied", tool: decision.tool.name, risk, rule: permission.rule });
        return completeRun(run, runtime, "failed", step.error, "permission_denied");
      }
      const receiptAuthorization = globalWriteAuthorizationAllowsTool({ run, tool: decision.tool.name, args, risk });
      const approved = run.approved_tool_signatures.includes(signature) || permission.allowed;
      const requiresUserConfirmation = (risk === "write" && !receiptAuthorization.allowed && !approved) || (risk === "high" && !approved);
      // 点歌/导航等 UI 副作用：即使模型把 intent 标成 execution，也不挂「执行前计划」脚手架
      const lightUiTool = LIGHT_UI_TOOL_NAMES.includes(String(decision.tool.name || ""));
      const shouldExposePlanMode = !lightUiTool && (
        (Array.isArray(decision.plan) && decision.plan.length > 0)
        || ["execution", "high_risk"].includes(String(quality.intent?.category || ""))
        || risk !== "read"
        || isGlobalDispatchTool(decision.tool.name)
      );
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
          emit(runtime, {
            type: "plan_mode_ready",
            tool: { name: decision.tool.name, arguments: args, risk, signature },
            message: decision.message || "",
            plan_mode: run.plan_mode,
            planMode: run.plan_mode,
          }, run);
          recordGlobalAgentRuntimeOutput(run, { type: "plan_mode_ready", tool: decision.tool.name, risk, signature, auto_continue: true });
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
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "confirmation_required", reasons: [confirmationLabel], status: "warning",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:confirmation:${signature}`, type: "global_agent.confirmation_required", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, arguments: args } });
        recordAgentRuntimeLifecycle({
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
        emit(runtime, {
          type: "confirmation_required",
          pending_tool: run.pending_tool,
          reply: run.final_reply,
          confirmation_summary: run.confirmation_summary,
          confirmationSummary: run.confirmation_summary,
          plan_mode: run.plan_mode || null,
          planMode: run.plan_mode || null,
        }, run);
        recordGlobalAgentRuntimeOutput(run, { type: "confirmation_required", tool: decision.tool.name, risk, signature, permission });
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", run.final_reply);
        return run;
      }

      const preHooks = runGlobalAgentHooks("pre_tool_use", { run, tool: decision.tool.name, args, risk });
      if (preHooks.blocked) {
        step.error = `Hook 阻止执行 ${decision.tool.name}${preHooks.message ? `：${preHooks.message}` : ""}`;
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        recordGlobalAgentRuntimeOutput(run, { type: "hook_blocked", phase: "pre_tool_use", tool: decision.tool.name, risk, hooks: preHooks.fired });
        appendTraceEvent(run.trace_id, { id: `${run.id}:hook_blocked:${signature}`, type: "global_agent.hook_blocked", status: "warning", message: step.error, data: { tool: decision.tool.name, risk, hooks: preHooks.fired } });
        return completeRun(run, runtime, "failed", step.error, "hook_blocked");
      }

      recordAgentRuntimeLifecycle({
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
      let progressConfig: any = {};
      try { progressConfig = loadOrchestratorConfig(); } catch {}
      if (assistantProgressNarrationEnabled(progressConfig)) {
        const previousMessage = [...run.steps].reverse().find(item => item.tool)?.message || "";
        const decisionProgress = sanitizeAssistantProgressText(sanitizeMainAgentUserFacingText(String(decision.message || "")));
        const progressText = run.tool_calls === 0
          ? (decisionProgress || buildAssistantProgressFallback([{ name: decision.tool.name }], {
            target: decision.intent?.target_refs?.[0] || decision.tool.name,
            goal: run.user_message,
          }))
          : (decisionProgress && decisionProgress !== previousMessage ? decisionProgress : "");
        if (progressText) appendAssistantProgress({
          scope: "global", scopeId: "global", exactSessionId: run.session_id,
          generation: Math.max(0, Number(run.resume_count || 0)),
          anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
          taskId: run.mission_id || undefined,
          turnId: run.id,
          text: progressText,
          kind: run.tool_calls === 0 ? "before_tools" : "key_finding",
          modelCallIndex: run.model_calls,
          relatedToolCallIds: [signature],
          title: "全局 Agent",
        });
      }
      markGlobalAgentToolTodo(run, decision.tool.name, "in_progress", step.message || `执行 ${decision.tool.name}`);
      recordGlobalAgentRuntimeOutput(run, { type: "tool_started", tool: decision.tool.name, risk, arguments: args });
      emit(runtime, { type: "tool_started", tool: step.tool, message: step.message }, run);
      emit(runtime, { type: "tool_activity", phase: "started", tool: decision.tool.name, risk, step: step.index }, run);
      const toolStarted = runtime.now ? runtime.now() : Date.now();
      let acceptedSupervision = false;
      let lightUiShortReply = "";
      let lightUiToolSucceeded = false;
      try {
        const result = await runtime.executeTool(decision.tool.name, args, run, activeRunAbortControllers.get(run.id)?.signal);
        const persistentToolName = decision.tool.name === "invoke_mcp" ? (args?.tool_name || args?.toolName || decision.tool.name) : decision.tool.name;
        const persistentObservation = projectContextSourceToolResultForPersistence(persistentToolName, result, args?.query || args?.file_id || args?.name || "");
        acceptedSupervision = isGlobalDispatchTool(decision.tool.name)
          && result?.accepted === true
          && result?.completed !== true
          && !!run.supervisor_id;
        step.observation = compactObservation(result);
        captureReasoningFacts(run.reasoning_loop, `tool:${decision.tool.name}`, persistentObservation);
        if (result?.needs_clarification === true) {
          const question = String(
            (Array.isArray(result?.clarification_questions) ? result.clarification_questions[0] : "")
              || result?.message
              || result?.error
              || "当前执行缺少必要信息，请补充后继续。",
          ).trim();
          step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
          run.tool_calls += 1;
          run.consecutive_failures = 0;
          setReasoningAssertion(run.reasoning_loop, {
            id: `tool_${signature}`,
            label: `工具 ${decision.tool.name} 的执行条件已满足`,
            kind: "tool_outcome",
            status: "blocked",
            evidence: [compactObservation(persistentObservation)],
            reason: question,
          });
          recordReasoningDeviation(run.reasoning_loop, "tool_precondition_missing", question, "warning");
          markGlobalAgentToolTodo(run, decision.tool.name, "blocked", question);
          run.steps.push(step);
          run.pending_tool = null;
          run.status = "waiting_clarification";
          run.phase = "needs_confirmation";
          run.clarification_question = question;
          run.final_reply = question;
          run.clarification_summary = buildGlobalClarificationSummary({
            run,
            question,
            decision: quality,
            reason: String(result?.error || result?.message || "执行条件尚未满足"),
          });
          run.confirmation_summary = null;
          run.presentation = classifyGlobalAgentRunPresentation(run, run.status);
          run.updated_at = nowIso(runtime);
          recordGlobalAgentRuntimeOutput(run, {
            type: "clarification_required",
            tool: decision.tool.name,
            sourceToolName: persistentToolName,
            question,
            observation: persistentObservation,
          });
          appendTraceEvent(run.trace_id, {
            id: `${run.id}:tool-clarification:${step.index}:${signature}`,
            type: "global_agent.clarification_required",
            status: "warning",
            message: question,
            data: { tool: decision.tool.name, risk, source_coverage: result?.source_coverage || null },
          });
          saveRun(run, runtime.persist !== false);
          emit(runtime, {
            type: "clarification_required",
            reply: question,
            decision: quality,
            clarification_summary: run.clarification_summary,
            clarificationSummary: run.clarification_summary,
          }, run);
          return run;
        }
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
        setReasoningAssertion(run.reasoning_loop, {
          id: `tool_${signature}`,
          label: `工具 ${decision.tool.name} 产生可核验结果`,
          kind: "tool_outcome",
          status: toolSucceeded ? "passed" : "failed",
          evidence: [compactObservation(persistentObservation)],
          reason: toolSucceeded ? "工具返回成功观察" : String(result?.error || "工具结果标记失败"),
        });
        if (toolSucceeded) {
          run.reasoning_loop.replan_required = false;
          run.reasoning_loop.last_replan_reason = "";
        }
        if (!toolSucceeded) recordReasoningDeviation(run.reasoning_loop, "tool_result_mismatch", `${decision.tool.name} 返回失败结果，需要重新规划`, "error");
        if (!toolSucceeded) recordReasoningPostmortem(run.reasoning_loop, { trigger: "tool_result_mismatch", whatHappened: `${decision.tool.name} 返回失败观察`, correction: "把失败观察写入事实快照并要求模型调整计划", preventRepeat: "后续计划必须引用当前事实，不能机械重复旧工具参数" });
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
        run.tool_calls += 1;
        run.consecutive_failures = 0;
        if (result?.client_effect) run.client_effects.push(result.client_effect);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
          outcome: "executed", reasons: [quality.intent.reason], status: "ok",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:tool:${step.index}:${signature}`, type: "global_agent.tool_completed", status: "ok", message: `${decision.tool.name} 执行完成`, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
        recordAgentRuntimeLifecycle({
          scope: "global",
          traceId: run.trace_id,
          runId: run.id,
          action: decision.tool.name,
          phase: "post_tool_use",
          risk,
          target: signature,
          status: toolSucceeded ? "ok" : "error",
          message: `${decision.tool.name} 执行完成`,
          data: { duration_ms: step.duration_ms, observation: compactObservation(persistentObservation) },
        });
        runGlobalAgentHooks("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: persistentObservation });
        recordGlobalAgentRuntimeOutput(run, { type: "tool_completed", tool: decision.tool.name, sourceToolName: decision.tool.name === "invoke_mcp" ? (args?.tool_name || args?.toolName || "") : "", risk, duration_ms: step.duration_ms, observation: step.observation });
        markGlobalAgentToolTodo(run, decision.tool.name, toolSucceeded ? "done" : "blocked", toolSucceeded ? `${decision.tool.name} 完成` : String(result?.error || `${decision.tool.name} 返回失败`));
        emit(runtime, { type: "tool_completed", tool: step.tool, observation: step.observation }, run);
        if (!toolSucceeded && assistantProgressNarrationEnabled(progressConfig)) appendAssistantProgress({
          scope: "global", scopeId: "global", exactSessionId: run.session_id,
          generation: Math.max(0, Number(run.resume_count || 0)),
          anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
          taskId: run.mission_id || undefined, turnId: run.id,
          text: "当前工具返回了失败结果，我会根据这项观察调整计划，不会机械重复同一调用。",
          kind: "blocker", modelCallIndex: run.model_calls, relatedToolCallIds: [signature], title: "全局 Agent",
        });
        emit(runtime, { type: "tool_activity", phase: "completed", tool: decision.tool.name, risk, step: step.index }, run);
        if (toolSucceeded) emitGlobalDispatchLaunchProgress(runtime, run, step);
      } catch (error: any) {
        step.error = error?.message || String(error);
        step.observation = { success: false, error: step.error };
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
        run.tool_calls += 1;
        run.consecutive_failures += 1;
        setReasoningAssertion(run.reasoning_loop, { id: `tool_${signature}`, label: `工具 ${decision.tool.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: step.error });
        recordReasoningDeviation(run.reasoning_loop, "tool_execution_failed", `${decision.tool.name}: ${step.error}`, "error");
        recordReasoningPostmortem(run.reasoning_loop, { trigger: "tool_execution_failed", whatHappened: `${decision.tool.name}: ${step.error}`, correction: "保存失败断言并进入下一轮重规划或安全停止", preventRepeat: "优先核对当前状态、参数与执行器健康度后再重试" });
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
          outcome: "execution_failed", reasons: [step.error], status: "error",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:tool_failed:${step.index}:${signature}`, type: "global_agent.tool_failed", status: "error", message: step.error, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
        recordAgentRuntimeLifecycle({
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
        runGlobalAgentHooks("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
        recordGlobalAgentRuntimeOutput(run, { type: "tool_failed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, error: step.error });
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        emit(runtime, { type: "tool_failed", tool: step.tool, error: step.error }, run);
        if (assistantProgressNarrationEnabled(progressConfig)) appendAssistantProgress({
          scope: "global", scopeId: "global", exactSessionId: run.session_id,
          generation: Math.max(0, Number(run.resume_count || 0)),
          anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
          taskId: run.mission_id || undefined, turnId: run.id,
          text: "当前工具执行失败，我会先核对错误和可用能力，再决定是否重试或请求你介入。",
          kind: "blocker", modelCallIndex: run.model_calls, relatedToolCallIds: [signature], title: "全局 Agent",
        });
        emit(runtime, { type: "tool_activity", phase: "failed", tool: decision.tool.name, risk, step: step.index, error: step.error }, run);
      }
      run.steps.push(step);
      run.pending_tool = null;
      run.updated_at = nowIso(runtime);
      saveRun(run, runtime.persist !== false);
      if (acceptedSupervision) {
        return completeRun(run, runtime, "completed", decision.message || "全局任务已派发并进入持续跟进。");
      }
      // 轻量 UI 工具成功后直接短文案收口，避免第二轮模型再堆验证/证据
      if (lightUiToolSucceeded && lightUiShortReply) {
        return completeRun(run, runtime, "completed", stripNonExecutionReportSections(lightUiShortReply));
      }
      if (run.consecutive_failures >= 2) return completeRun(run, runtime, "failed", `工具连续执行失败，已停止：${step.error}`, step.error || "tool_failures");
    }
    return run;
  } finally {
    activeRuns.delete(run.id);
    if (activeRunObjects.get(run.id) === run) activeRunObjects.delete(run.id);
    activeRunAbortControllers.delete(run.id);
  }
}

export async function startGlobalAgentRun(input: {
  message: string;
  originalMessage?: string;
  history?: any[];
  sessionId?: string;
  source?: string;
  explicitWriteAuthorization?: boolean;
  workflowDecision?: WorkflowDecision | null;
  traceId?: string;
  maxSteps?: number;
  timeoutMs?: number;
  turnId?: string;
  queueScope?: string;
  writeAuthorizationReceipt?: any;
  authorizationMessage?: string;
  directReply?: string;
  requestedTargetRefs?: any[];
}, runtime: GlobalAgentLoopRuntime) {
  const createdAt = nowIso(runtime);
  const id = `gar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  const semanticUsage = input.workflowDecision?.semanticDecisionReceipt?.usage || null;
  const run = normalizeRun({
    id,
    trace_id: ensureTraceId(input.traceId, "global-agent"),
    session_id: input.sessionId || "default",
    source: input.source || "web",
    user_message: input.message,
    original_user_message: input.originalMessage || input.message,
    history: input.history || [],
    status: "running",
    phase: "plan",
    explicit_write_authorization: input.explicitWriteAuthorization === true,
    turn_id: String(input.turnId || "") || undefined,
    queue_scope: String(input.queueScope || "") || undefined,
    write_authorization_receipt: input.writeAuthorizationReceipt || null,
    writeAuthorizationReceipt: input.writeAuthorizationReceipt || null,
    authorization_message: String(input.authorizationMessage || input.originalMessage || input.message || ""),
    requested_target_refs: Array.isArray(input.requestedTargetRefs) ? input.requestedTargetRefs : [],
    workflow_decision: input.workflowDecision || null,
    workflowDecision: input.workflowDecision || null,
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
    model_calls: semanticUsage ? 1 : 0,
    tool_calls: 0,
    consecutive_failures: 0,
    client_effects: [],
    reasoning_loop: createAgentReasoningState({
      goal: input.originalMessage || input.message,
      authorizationScope: input.explicitWriteAuthorization ? ["本次明确请求所涉及的目标与影响范围"] : [],
      assertions: [{ id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal" }],
    }),
  });
  if (semanticUsage) {
    (run as any).latest_context_usage = semanticUsage;
    run.usage = {
      inputTokens: Math.max(0, Number(semanticUsage.inputTokens || 0)),
      outputTokens: Math.max(0, Number(semanticUsage.outputTokens || 0)),
      totalTokens: Math.max(0, Number(semanticUsage.totalTokens || 0)),
      reported: semanticUsage.reported === true,
      directInputTokens: Math.max(0, Number(semanticUsage.directInputTokens ?? semanticUsage.inputTokens ?? 0)),
      cacheCreationInputTokens: Math.max(0, Number(semanticUsage.cacheCreationInputTokens || 0)),
      cacheReadInputTokens: Math.max(0, Number(semanticUsage.cacheReadInputTokens || 0)),
      totalCostUsd: Math.max(0, Number(semanticUsage.costUsd || 0)),
    };
    run.input_tokens = run.usage.inputTokens;
    run.output_tokens = run.usage.outputTokens;
    run.total_cost_usd = run.usage.totalCostUsd;
  }
  saveRun(run, runtime.persist !== false);
  appendTraceEvent(run.trace_id, { id: `${run.id}:created`, type: "global_agent.run_created", status: "info", message: (input.originalMessage || input.message).slice(0, 1000), data: { session_id: run.session_id, source: run.source, explicit_write_authorization: run.explicit_write_authorization } });
  const directReply = String(input.directReply || "").trim();
  if (directReply) {
    const workflowDecision = input.workflowDecision || null;
    const intent = {
      category: "conversation",
      goal: String(input.originalMessage || input.message || "").trim(),
      action_required: false,
      target_refs: [],
      impact_scope: [],
      confidence: Number(workflowDecision?.confidence || 0),
      authorization_basis: "none",
      reason: String(workflowDecision?.reason || "模型确认当前消息可以直接回答"),
    };
    run.steps.push({
      index: 1,
      at: nowIso(runtime),
      state: "answer",
      message: directReply,
      plan: [],
      duration_ms: Math.max(0, Number(workflowDecision?.semanticDecisionReceipt?.durationMs || 0)),
      decision: { intent, workflowDecision, direct_reply_fast_path: true },
    });
    (run as any).decision_summary = { intent, workflowDecision };
    (run as any).direct_reply_fast_path = true;
    (run as any).directReplyFastPath = true;
    return completeRun(run, runtime, "completed", directReply);
  }
  return continueLoop(run, runtime);
}

export async function resumeGlobalAgentRun(id: string, runtime: GlobalAgentLoopRuntime, options: { approved?: boolean; cancelled?: boolean; feedback?: string; acceptFeedback?: string; source?: string; resumeSource?: string } = {}) {
  if (activeRuns.has(id)) {
    const started = Date.now();
    while (activeRuns.has(id) && Date.now() - started < 2 * 60_000) await new Promise(resolve => setTimeout(resolve, 100));
    if (activeRuns.has(id)) throw new Error("全局 Agent 当前步骤尚未安全停下，请稍后重试");
  }
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  const run = normalizeRun(stored);
  if (["supervising", "completed", "failed", "cancelled"].includes(run.status)) return run;
  if (run.status === "waiting_clarification") return run;
  if (options.cancelled || options.approved === false) return completeRun(run, runtime, "cancelled", "用户已取消本次操作。", "user_cancelled");
  if (run.status === "waiting_confirmation") {
    if (options.approved !== true) return run;
    if (!run.pending_tool?.signature) throw new Error("等待确认的工具信息不完整");
    const pending = run.pending_tool;
    const confirmedAt = nowIso(runtime);
    const acceptFeedback = compactGlobalUserSummaryText(options.feedback || options.acceptFeedback || "", "", 720);
    run.approved_tool_signatures.push(pending.signature);
    if (run.plan_mode) run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "confirmed", confirmedAt, acceptFeedback);
    run.plan_accept_feedback = acceptFeedback;
    run.last_plan_accept_feedback = acceptFeedback;
    run.last_plan_accept_feedback_at = acceptFeedback ? confirmedAt : "";
    if (acceptFeedback) {
      run.history.push({ role: "user", content: `确认执行前计划时补充要求：${acceptFeedback}` });
      run.history = run.history.slice(-12);
      captureReasoningFacts(run.reasoning_loop, "plan_accept_feedback", acceptFeedback);
      setReasoningAssertion(run.reasoning_loop, {
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
    appendTraceEvent(run.trace_id, { id: `${run.id}:confirmed:${pending.signature}`, type: "global_agent.confirmed", status: "ok", message: acceptFeedback ? "用户已确认待执行工具，并补充执行要求" : "用户已确认待执行工具", data: { tool: pending.name, has_accept_feedback: !!acceptFeedback } });
    const step = [...run.steps].reverse().find(item => item.tool?.signature === pending.signature && item.observation === undefined);
    const started = runtime.now ? runtime.now() : Date.now();
    try {
      const preHooks = runGlobalAgentHooks("pre_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk });
      if (preHooks.blocked) throw new Error(`Hook 阻止执行 ${pending.name}${preHooks.message ? `：${preHooks.message}` : ""}`);
      markGlobalAgentToolTodo(run, pending.name, "in_progress", `确认后执行 ${pending.name}`);
      recordGlobalAgentRuntimeOutput(run, { type: "tool_started", tool: pending.name, risk: pending.risk, confirmed: true, arguments: pending.arguments });
      emit(runtime, { type: "tool_started", tool: pending, confirmed: true }, run);
      const result = await runtime.executeTool(pending.name, pending.arguments, run, activeRunAbortControllers.get(run.id)?.signal);
      const persistentToolName = pending.name === "invoke_mcp" ? (pending.arguments?.tool_name || pending.arguments?.toolName || pending.name) : pending.name;
      const persistentObservation = projectContextSourceToolResultForPersistence(persistentToolName, result, pending.arguments?.query || pending.arguments?.file_id || pending.arguments?.name || "");
      captureReasoningFacts(run.reasoning_loop, `confirmed_tool:${pending.name}`, persistentObservation);
      setReasoningAssertion(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: result?.success === false || result?.error ? "failed" : "passed", evidence: [persistentObservation], reason: "用户确认后执行" });
      if (step) {
        step.observation = compactObservation(result);
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - started);
      }
      run.tool_calls += 1;
      run.consecutive_failures = 0;
      if (result?.client_effect) run.client_effects.push(result.client_effect);
      recordAgentDecision({
        run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
        intent: run.decision_summary?.intent || normalizeAgentDecisionIntent(null, run.user_message),
        proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
        target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
        outcome: "executed", reasons: ["用户确认后执行原待处理工具"], status: "ok",
      });
      appendTraceEvent(run.trace_id, { id: `${run.id}:tool_confirmed:${pending.signature}`, type: "global_agent.tool_completed", status: "ok", message: `${pending.name} 确认后执行完成`, data: { tool: pending.name, risk: pending.risk } });
      runGlobalAgentHooks("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: persistentObservation });
      recordGlobalAgentRuntimeOutput(run, { type: "tool_completed", tool: pending.name, sourceToolName: pending.name === "invoke_mcp" ? (pending.arguments?.tool_name || pending.arguments?.toolName || "") : "", risk: pending.risk, confirmed: true, observation: compactObservation(result) });
      markGlobalAgentToolTodo(run, pending.name, result?.success === false || result?.error ? "blocked" : "done", result?.error || `${pending.name} 确认后执行完成`);
      emit(runtime, { type: "tool_completed", tool: pending, observation: result, confirmed: true }, run);
      if (!(result?.success === false || result?.error) && step) emitGlobalDispatchLaunchProgress(runtime, run, step);
    } catch (error: any) {
      if (step) {
        step.error = error?.message || String(error);
        step.observation = { success: false, error: step.error };
      }
      run.tool_calls += 1;
      run.consecutive_failures += 1;
      setReasoningAssertion(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: error?.message || String(error) });
      recordReasoningDeviation(run.reasoning_loop, "confirmed_tool_failed", `${pending.name}: ${error?.message || error}`, "error");
      recordReasoningPostmortem(run.reasoning_loop, { trigger: "confirmed_tool_failed", whatHappened: `${pending.name} 在用户确认后执行失败`, correction: "保留失败证据并重新核对当前状态", preventRepeat: "确认只授权动作，不代表工具结果可跳过验证" });
      recordAgentDecision({
        run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
        intent: run.decision_summary?.intent || normalizeAgentDecisionIntent(null, run.user_message),
        proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
        target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
        outcome: "execution_failed", reasons: [step?.error || error?.message || String(error)], status: "error",
      });
      appendTraceEvent(run.trace_id, { id: `${run.id}:tool_confirmed_failed:${pending.signature}`, type: "global_agent.tool_failed", status: "error", message: error?.message || String(error), data: { tool: pending.name, risk: pending.risk } });
      runGlobalAgentHooks("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: { success: false, error: error?.message || String(error) } });
      recordGlobalAgentRuntimeOutput(run, { type: "tool_failed", tool: pending.name, risk: pending.risk, confirmed: true, error: error?.message || String(error) });
      markGlobalAgentToolTodo(run, pending.name, "blocked", error?.message || String(error));
    }
    run.pending_tool = null;
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
  } else {
    const resumedAt = nowIso(runtime);
    applyGlobalResumeFeedback(run, runtime, options.feedback || options.acceptFeedback || "", { source: options.source || options.resumeSource || "user" });
    run.status = "running";
    run.resume_count += 1;
    run.updated_at = resumedAt;
    saveRun(run, runtime.persist !== false);
  }
  return continueLoop(run, runtime);
}

export async function continueGlobalAgentRunWithClarification(id: string, answer: string, runtime: GlobalAgentLoopRuntime, options: { explicitWriteAuthorization?: boolean; writeAuthorizationReceipt?: any; turnId?: string } = {}) {
  if (activeRuns.has(id)) throw new Error("全局 Agent 当前仍在处理上一轮，请稍后再补充");
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  const run = normalizeRun(stored);
  if (run.status !== "waiting_clarification") throw new Error("该运行当前不在等待澄清状态");
  const clarification = String(answer || "").trim();
  if (!clarification) throw new Error("澄清内容不能为空");
  // This is an explicit continuation of a known waiting run. Natural-language
  // interpretation happens in the next main Agent loop call, not in a separate classifier.
  const clarificationDecision = run.workflow_decision || run.workflowDecision || null;
  const revokesAuthorization = false;
  const inheritedAuthorization = run.explicit_write_authorization;
  const currentAuthorization = options.explicitWriteAuthorization === true;
  appendReasoningClarification(run.reasoning_loop, {
    question: run.clarification_question || run.final_reply || "请补充目标和影响范围",
    answer: clarification,
    authorizationScope: currentAuthorization ? ["本轮澄清消息明确允许的范围"] : inheritedAuthorization ? ["同一澄清链中的原始明确执行范围"] : [],
  });
  if (revokesAuthorization) run.reasoning_loop.authorization_scope = [];
  setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "passed", evidence: [clarification], reason: "用户已在同一待澄清运行中补充信息" });
  explainReasoningDecision(run.reasoning_loop, "continue_after_clarification", "合并原始目标与当前澄清，不新开无上下文运行");
  run.history.push({ role: "assistant", content: run.clarification_question || run.final_reply || "请补充信息" }, { role: "user", content: clarification });
  run.history = run.history.slice(-12);
  run.user_message = run.reasoning_loop.effective_goal;
  run.workflow_decision = clarificationDecision;
  run.workflowDecision = clarificationDecision;
  if (clarificationDecision?.sourcePolicy === "ignore_unread") {
    (run as any).source_execution_waiver = {
      granted_at: nowIso(runtime),
      answer: clarification,
      scope: "current_run",
    };
    (run as any).sourceExecutionWaiver = (run as any).source_execution_waiver;
  }
  run.explicit_write_authorization = currentAuthorization || inheritedAuthorization;
  if (options.writeAuthorizationReceipt) {
    (run as any).write_authorization_receipt = options.writeAuthorizationReceipt;
    (run as any).writeAuthorizationReceipt = options.writeAuthorizationReceipt;
    (run as any).authorization_message = clarification;
    (run as any).turn_id = String(options.turnId || (run as any).turn_id || "");
  }
  if (revokesAuthorization) revokeGlobalWriteAuthorization(run);
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
  appendTraceEvent(run.trace_id, { id: `${run.id}:clarified:${run.resume_count}`, type: "global_agent.clarification_received", status: "ok", message: clarification.slice(0, 1000), data: { plan_version: run.reasoning_loop.plan_version, authorization_inherited: inheritedAuthorization, authorization_current: currentAuthorization } });
  return continueLoop(run, runtime);
}

export function pauseGlobalAgentRun(id: string) {
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  if (stored.status !== "running") return stored;
  pauseRequests.add(id);
  activeRunAbortControllers.get(id)?.abort(new Error("用户停止当前全局 Agent 执行"));
  const run = normalizeRun(stored);
  run.status = "paused";
  run.clarification_summary = null;
  run.confirmation_summary = null;
  run.updated_at = new Date().toISOString();
  saveRun(run, !volatileRuns.has(id));
  appendTraceEvent(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
  return run;
}

export function cancelGlobalAgentRun(id: string) {
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  if (["completed", "failed", "cancelled"].includes(stored.status)) return stored;
  cancelRequests.add(id);
  activeRunAbortControllers.get(id)?.abort(new Error("用户停止当前全局 Agent 执行"));
  if (activeRuns.has(id)) return stored;
  const run = normalizeRun(stored);
  run.status = "cancelled";
  run.final_reply = "用户已取消本次运行。";
  run.error = "user_cancelled";
  run.clarification_summary = null;
  run.confirmation_summary = null;
  run.completed_at = new Date().toISOString();
  if (run.plan_mode) run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "cancelled", run.completed_at);
  run.updated_at = run.completed_at;
  saveRun(run, !volatileRuns.has(id));
  appendTraceEvent(run.trace_id, { id: `${run.id}:cancelled:${run.updated_at}`, type: "global_agent.run_cancelled", status: "warning", message: run.final_reply });
  return run;
}

export async function recoverInterruptedGlobalAgentRuns(runtime: GlobalAgentLoopRuntime) {
  const candidates = loadStore().runs.filter((run) => run.status === "running");
  const results: any[] = [];
  for (const stored of candidates) {
    const run = normalizeRun(stored);
    if (Date.now() > Date.parse(run.deadline_at)) {
      recordReasoningRecoveryCheck(run.reasoning_loop, { reason: "服务重启恢复时已超过截止时间", goalRevalidated: true, stateRevalidated: false, acceptanceRevalidated: false, remainingGaps: ["执行时间预算已耗尽"] });
      results.push(completeRun(run, runtime, "failed", "服务重启后发现运行已超过时间预算，已安全终止。", "recovery_deadline_exceeded"));
      continue;
    }
    try {
      const currentContext = runtime.getContext ? await runtime.getContext(run) : {};
      const boundary = runtime.verifyContextBoundary?.(currentContext, run);
      if (boundary === false || (typeof boundary === "object" && boundary?.valid !== true)) throw new Error("恢复时上下文边界无法证明");
      captureReasoningFacts(run.reasoning_loop, "restart_recovery_context", currentContext);
      recordReasoningRecoveryCheck(run.reasoning_loop, { reason: "服务重启后恢复同一运行", goalRevalidated: !!run.reasoning_loop.original_goal, stateRevalidated: true, acceptanceRevalidated: run.reasoning_loop.assertions.length > 0, remainingGaps: run.reasoning_loop.assertions.filter(item => item.status !== "passed").map(item => item.label) });
      run.resume_count += 1;
      run.explicit_write_authorization = false;
      (run as any).write_authorization_receipt = null;
      (run as any).writeAuthorizationReceipt = null;
      recordGlobalAgentRuntimeOutput(run, { type: "recovered", status: "running", authorization_revalidation_required: true });
      results.push(await continueLoop(run, runtime));
    } catch (error: any) {
      run.status = "blocked";
      run.error = error?.message || String(error);
      run.final_reply = `服务重启后无法安全证明原运行状态，已阻止自动续跑：${run.error}`;
      run.retryable = true;
      run.updated_at = nowIso(runtime);
      saveRun(run, runtime.persist !== false);
      appendTraceEvent(run.trace_id, { id: `${run.id}:recovery-blocked:${run.updated_at}`, type: "global_agent.recovery_blocked", status: "warning", message: run.final_reply });
      results.push(run);
    }
  }
  return { total: candidates.length, resumed: results.filter(item => !["failed", "blocked"].includes(item.status)).length, blocked: results.filter(item => item.status === "blocked").length, results };
}


export const runGlobalAgentLoopSelfTest = createGlobalAgentLoopSelfTest({ GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, applyGlobalAgentSupervisionSteer, attachGlobalAgentRunSupervision, buildGlobalDispatchLaunchSummary, completeGlobalAgentSupervision, continueGlobalAgentRunWithClarification, parseGlobalAgentDecision, pauseGlobalAgentRun, resumeGlobalAgentRun, runMainAgentDeliveryReportSelfTest, runMainAgentWorkchainSelfTest, startGlobalAgentRun, steerGlobalAgentRun, updateGlobalAgentSupervisionState });
