import { appendUserVisibleAgentEvent } from "./user-visible-agent-events";
import { recordAgentKeyProgress } from "./agent-key-progress";
import { assistantProgressNarrationEnabled, type AssistantProgressKind } from "./assistant-progress";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";

function text(value: any) { return String(value || "").trim(); }
function number(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function taskIdentity(task: any) {
  const groupId = text(task?.group_id || task?.groupId);
  const project = text(task?.target_project || task?.project || task?.project_id || task?.projectId);
  const exactSessionId = text(
    task?.exact_session_id || task?.exactSessionId
    || task?.group_session_id || task?.groupSessionId
    || task?.project_session_id || task?.projectSessionId
    || task?.intake_identity?.exact_session_id,
  );
  const generation = Math.max(0, number(task?.generation, 0));
  if (groupId && exactSessionId) return { scope: "group" as const, scopeId: groupId, exactSessionId, project, generation };
  if (project && exactSessionId) return { scope: "project" as const, scopeId: project, exactSessionId, project, generation };
  return null;
}

function appendStageProgress(task: any, kind: AssistantProgressKind, message: string, attempt = 1) {
  const identity = taskIdentity(task);
  let enabled = true;
  try { enabled = assistantProgressNarrationEnabled(loadOrchestratorConfig()); } catch {}
  if (!identity || !enabled) return null;
  return recordAgentKeyProgress({
    ...identity,
    taskId: text(task?.id),
    turnId: `task:${text(task?.id)}`,
    eventId: `task-stage:${text(task?.id)}:progress:${kind}:${Math.max(1, attempt)}`,
    text: message,
    kind,
    source: "deterministic",
    status: kind === "blocker" ? "failed" : "running",
    modelCallIndex: 0,
    relatedToolCallIds: [],
    title: identity.scope === "group" ? "群聊主 Agent" : "项目主 Agent",
  });
}

function appendGroupTaskResult(task: any, input: any) {
  const identity = taskIdentity(task);
  if (!identity || identity.scope !== "group") return null;
  const taskId = text(task?.id);
  const at = text(input?.at) || new Date().toISOString();
  const startedAt = text(
    task?.created_at || task?.createdAt
    || task?.started_at || task?.startedAt
    || task?.project_main_execution?.started_at,
  ) || at;
  const durationMs = durationBetween(startedAt, at);
  const successful = text(task?.status) === "done";
  const gatePassed = successful && (
    task?.delivery_summary?.acceptance_gate_passed === true
    || task?.deliverySummary?.acceptanceGatePassed === true
    || task?.delivery_summary?.acceptance_gate?.pass === true
    || task?.deliverySummary?.acceptanceGate?.pass === true
  );
  return appendUserVisibleAgentEvent({
    eventId: `task-stage:${taskId}:result:${text(task?.status) || "terminal"}`,
    ...identity,
    taskId,
    eventType: "result",
    display: {
      title: gatePassed ? "任务已完成" : "任务未完成",
      target: text(task?.title),
      summary: text(task?.final_summary || task?.result || task?.status_detail)
        || (gatePassed ? "主 Agent 已完成最终验收与总结" : "任务尚未通过正式验收"),
      status: gatePassed ? "success" : "failed",
      durationMs,
    },
    detail: {
      timing: { totalMs: durationMs },
      terminalGate: { passed: gatePassed, accepted: gatePassed, source: "task_ledger" },
      evidenceIds: task?.delivery_summary?.verification || task?.verification || [],
      fileChanges: task?.delivery_summary?.actual_file_changes || task?.file_changes?.files || [],
      ...(!gatePassed ? { availableActions: [
        { id: "view_error", kind: "view_error", label: "查看错误", enabled: true, revision: number(task?.revision), generation: identity.generation },
        { id: "recheck", kind: "recheck", label: "重新核验", enabled: true, revision: number(task?.revision), generation: identity.generation },
      ] } : {}),
    },
  });
}

function durationBetween(startedAt: any, completedAt: any) {
  const start = Date.parse(text(startedAt));
  const end = Date.parse(text(completedAt));
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
}

function appendTestAgentEvent(task: any, eventType: "agent_started" | "agent_completed" | "agent_failed", input: any) {
  const identity = taskIdentity(task);
  if (!identity) return null;
  const taskId = text(task?.id);
  const attempt = Math.max(1, number(input?.attempt, number(task?.review_round, 1)));
  const reviewCycleId = text(task?.review_cycle_id || task?.reviewCycleId || `review:${taskId}`);
  const at = text(input?.at) || new Date().toISOString();
  const startedAt = text(input?.startedAt) || at;
  const durationMs = Math.max(0, number(input?.durationMs, durationBetween(startedAt, at)));
  const event = appendUserVisibleAgentEvent({
    eventId: `task-stage:${taskId}:test-agent:${attempt}:${eventType}`,
    ...identity,
    taskId,
    workItemId: text(task?.work_item_id || task?.workItemId || `test-agent:${identity.project || taskId}`),
    agentRunId: `task-test-agent:${taskId}:${identity.project || "group"}`,
    eventType,
    display: {
      title: [identity.project, "TestAgent"].filter(Boolean).join(" · ") || "TestAgent",
      target: `第 ${attempt} 轮独立验收`,
      summary: text(input?.summary),
      status: eventType === "agent_completed" ? "success" : eventType === "agent_failed" ? "failed" : "running",
      durationMs,
    },
    detail: {
      agentDisplay: {
        projectId: identity.project,
        projectName: identity.project,
        runtimeLabel: "TestAgent",
        workItemTitle: `第 ${attempt} 轮独立验收`,
        phase: eventType === "agent_completed" ? "completed" : eventType === "agent_failed" ? "rejected" : "executing",
        attempt,
        isParallel: false,
      },
      executionStage: {
        kind: "independent_verification",
        stageRunId: `test-agent:${taskId}`,
        reviewCycleId,
        attempt,
        startedAt,
        ...(eventType !== "agent_started" ? { completedAt: at } : {}),
        ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
      },
      evidenceIds: Array.isArray(input?.evidenceIds) ? input.evidenceIds : [],
      ...(eventType === "agent_failed" ? { availableActions: [
        { id: "view_error", kind: "view_error", label: "查看错误", enabled: true, revision: number(task?.revision), generation: identity.generation },
        { id: "recheck", kind: "recheck", label: "重新核验", enabled: true, revision: number(task?.revision), generation: identity.generation },
      ] } : {}),
    },
  });
  const progressText = eventType === "agent_started"
    ? `TestAgent 正在核对第 ${attempt} 轮验收标准`
    : eventType === "agent_completed"
      ? `TestAgent 第 ${attempt} 轮验收已通过`
      : `TestAgent 第 ${attempt} 轮验证未通过，准备返工`;
  recordAgentKeyProgress({
    ...identity,
    taskId,
    turnId: `task:${taskId}`,
    eventId: `task-key-progress:${taskId}:test-agent:${attempt}:${eventType}`,
    generation: identity.generation,
    kind: "verification_update",
    source: "child_agent",
    status: eventType === "agent_started" ? "running" : eventType === "agent_completed" ? "success" : "failed",
    round: attempt - 1,
    text: progressText,
    title: [identity.project, "TestAgent"].filter(Boolean).join(" · ") || "TestAgent",
  });
  return event;
}

function appendMainSummaryEvent(task: any, eventType: "agent_started" | "agent_completed" | "agent_failed", input: any) {
  const identity = taskIdentity(task);
  if (!identity) return null;
  const taskId = text(task?.id);
  const at = text(input?.at) || new Date().toISOString();
  const startedAt = text(input?.startedAt) || at;
  const durationMs = Math.max(0, number(input?.durationMs, durationBetween(startedAt, at)));
  const roleLabel = identity.scope === "group" ? "群聊主 Agent" : "项目主 Agent";
  const event = appendUserVisibleAgentEvent({
    eventId: `task-stage:${taskId}:main-summary:${eventType}`,
    ...identity,
    taskId,
    workItemId: `main-summary:${taskId}`,
    agentRunId: `task-main-summary:${taskId}`,
    eventType,
    display: {
      title: roleLabel,
      target: "最终验收与交付总结",
      summary: text(input?.summary),
      status: eventType === "agent_completed" ? "success" : eventType === "agent_failed" ? "failed" : "running",
      durationMs,
    },
    detail: {
      agentDisplay: {
        projectId: "",
        projectName: "",
        runtimeLabel: roleLabel,
        workItemTitle: "最终验收与交付总结",
        phase: eventType === "agent_completed" ? "completed" : eventType === "agent_failed" ? "failed" : "executing",
        attempt: 1,
        isParallel: false,
      },
      executionStage: {
        kind: "main_agent_summary",
        stageRunId: `main-summary:${taskId}`,
        attempt: 1,
        startedAt,
        ...(eventType !== "agent_started" ? { completedAt: at } : {}),
        ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
      },
      evidenceIds: Array.isArray(input?.evidenceIds) ? input.evidenceIds : [],
      ...(eventType === "agent_failed" ? { availableActions: [
        { id: "view_error", kind: "view_error", label: "查看错误", enabled: true, revision: number(task?.revision), generation: identity.generation },
        { id: "takeover", kind: "takeover", label: "人工接管", enabled: true, revision: number(task?.revision), generation: identity.generation },
      ] } : {}),
    },
  });
  recordAgentKeyProgress({
    ...identity,
    taskId,
    turnId: `task:${taskId}`,
    eventId: `task-key-progress:${taskId}:main-summary:${eventType}`,
    generation: identity.generation,
    kind: "phase_update",
    source: "deterministic",
    status: eventType === "agent_started" ? "running" : eventType === "agent_completed" ? "success" : "failed",
    round: 0,
    text: eventType === "agent_started"
      ? "主 Agent 正在整理最终结论"
      : eventType === "agent_completed"
        ? "主 Agent 已完成最终验收与交付总结"
        : "主 Agent 最终总结未完成，需要继续处理当前问题",
    title: identity.scope === "group" ? "群聊主 Agent" : "项目主 Agent",
  });
  return event;
}

export function projectTaskExecutionStageTransition(previous: any, current: any) {
  if (!current?.id) return;
  const previousAcceptance = text(previous?.acceptance_state || previous?.acceptanceState);
  const acceptance = text(current?.acceptance_state || current?.acceptanceState);
  const previousStatus = text(previous?.status);
  const status = text(current?.status);
  const at = text(current?.updated_at || current?.updatedAt) || new Date().toISOString();
  const attempt = Math.max(1, number(current?.review_round, 1));
  const previousAt = text(previous?.updated_at || previous?.updatedAt || at);

  if (acceptance === "test_agent_running" && previousAcceptance !== acceptance) {
    appendStageProgress(current, "verification", `项目执行结果已返回，我现在开始第 ${attempt} 轮独立验收。`, attempt);
    appendTestAgentEvent(current, "agent_started", {
      attempt, at, startedAt: at,
      summary: `TestAgent 正在执行第 ${attempt} 轮独立验收`,
    });
  }
  if (["test_agent_passed", "main_agent_accepting"].includes(acceptance) && previousAcceptance === "test_agent_running") {
    appendTestAgentEvent(current, "agent_completed", {
      attempt, at, startedAt: previousAt,
      summary: `第 ${attempt} 轮独立验收通过`,
      evidenceIds: current?.test_agent_review?.evidence_ids || [],
    });
    appendStageProgress(current, "verification", `第 ${attempt} 轮独立验收已通过，我会继续核对交付证据并整理最终结果。`, attempt);
  } else if (["rework_required", "reworking", "test_agent_recheck", "environment_blocked", "needs_user", "blocked"].includes(acceptance)
    && previousAcceptance === "test_agent_running") {
    appendTestAgentEvent(current, "agent_failed", {
      attempt, at, startedAt: previousAt,
      summary: text(current?.status_detail) || `第 ${attempt} 轮独立验收未通过`,
      evidenceIds: current?.test_agent_review?.evidence_ids || [],
    });
    appendStageProgress(current, acceptance === "environment_blocked" || acceptance === "needs_user" || acceptance === "blocked" ? "blocker" : "rework",
      acceptance === "environment_blocked" || acceptance === "needs_user" || acceptance === "blocked"
        ? "独立验收遇到环境或权限阻塞，需要先处理当前问题。"
        : `第 ${attempt} 轮独立验收未通过，我会把未满足项返回原项目 Agent 做增量返工。`, attempt);
  }

  if (acceptance === "main_agent_accepting" && previousAcceptance !== acceptance) {
    appendStageProgress(current, "before_summary", "独立验收已经通过，我正在做最后的差异核对并整理交付总结。", attempt);
    appendMainSummaryEvent(current, "agent_started", {
      at, startedAt: at,
      summary: "验收门禁已通过，正在生成最终交付总结",
    });
  }
  if (status === "done" && previousStatus !== "done") {
    appendMainSummaryEvent(current, "agent_completed", {
      at, startedAt: previousAcceptance === "main_agent_accepting" ? previousAt : at,
      summary: text(current?.final_summary || current?.result || current?.status_detail) || "最终交付总结已完成",
      evidenceIds: current?.delivery_summary?.verification || current?.verification || [],
      fileChanges: current?.delivery_summary?.actual_file_changes || current?.file_changes?.files || [],
    });
    appendGroupTaskResult(current, { at });
  } else if (["blocked", "failed", "cancelled"].includes(status) && previousStatus !== status && previousAcceptance === "main_agent_accepting") {
    appendMainSummaryEvent(current, "agent_failed", {
      at, startedAt: previousAt,
      summary: text(current?.status_detail || current?.result) || "最终总结阶段未能完成",
    });
    appendGroupTaskResult(current, { at });
  } else if (["blocked", "failed", "cancelled"].includes(status) && previousStatus !== status) {
    appendGroupTaskResult(current, { at });
  }
}
