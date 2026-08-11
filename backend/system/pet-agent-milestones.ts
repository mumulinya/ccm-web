import * as crypto from "crypto";
import {
  subscribeUserVisibleAgentEvents,
  type UserVisibleAgentEvent,
} from "./user-visible-agent-events";
import { sanitizePetNotificationText } from "./user-notifications";

export const PET_AGENT_MILESTONE_SCHEMA = "ccm-pet-agent-milestone-v1" as const;

export type PetAgentMilestoneKind =
  | "planning"
  | "implementation_started"
  | "key_finding"
  | "direction_change"
  | "blocked"
  | "verification_started"
  | "rework"
  | "verification_passed"
  | "summary_started"
  | "result_submitted"
  | "completed"
  | "failed"
  | "cancelled"
  | "needs_user";

export type PetAgentMilestoneV1 = {
  schema: typeof PET_AGENT_MILESTONE_SCHEMA;
  milestoneId: string;
  kind: PetAgentMilestoneKind;
  source: "main_agent" | "runtime" | "test_agent" | "system";
  confidence: "declared" | "observed";
  taskId?: string;
  workItemId?: string;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId?: string;
  anchorMessageId?: string;
  originMessageId?: string;
  generation?: number;
  attempt?: number;
  agentRunId?: string;
  projectName?: string;
  runtimeLabel?: string;
  title: string;
  summary: string;
  petState: "planning" | "building" | "debugging" | "reviewing" | "waiting" | "happy" | "error" | "idle";
  terminal: boolean;
  durable: boolean;
  dedupeKey: string;
  action: Record<string, string>;
  contentStored: false;
};

type ProjectorOptions = {
  getMode?: () => "milestones" | "terminal_only";
  fallbackTimeoutMs?: number;
  emit: (milestone: PetAgentMilestoneV1) => void;
  persist?: (milestone: PetAgentMilestoneV1) => void;
};

type RunWatermark = { generation: number; attempt: number; terminal: boolean };

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function compact(value: any, max = 240) {
  return sanitizePetNotificationText(value, max);
}

function runtimeIdentity(event: UserVisibleAgentEvent) {
  const display = event.detail?.agentDisplay;
  return [event.taskId || "turn", event.workItemId || "work", event.agentRunId || display?.projectId || "main"].join(":");
}

function isTestAgent(event: UserVisibleAgentEvent) {
  const display = event.detail?.agentDisplay;
  return /test.?agent/i.test(`${display?.runtimeLabel || ""} ${display?.projectName || ""} ${event.display.title || ""}`);
}

function mainAgentTitle(event: UserVisibleAgentEvent) {
  if (event.scope === "global") return "全局 Agent";
  if (event.scope === "group") return "群聊主 Agent";
  return `${event.scopeId} · 项目主 Agent`;
}

function eventTitle(event: UserVisibleAgentEvent) {
  const display = event.detail?.agentDisplay;
  if (!display) return mainAgentTitle(event);
  return [display.projectName || display.projectId, display.runtimeLabel].filter(Boolean).join(" · ") || event.display.title || mainAgentTitle(event);
}

function actionFor(event: UserVisibleAgentEvent) {
  return Object.fromEntries(Object.entries({
    kind: event.taskId ? "task" : "agent",
    task_id: event.taskId || "",
    scope_type: event.scope,
    scope_id: event.scopeId,
    session_id: event.exactSessionId,
    project_id: event.scope === "project" ? event.scopeId : event.detail?.agentDisplay?.projectId || "",
    group_id: event.scope === "group" ? event.scopeId : "",
    anchor_message_id: event.anchorMessageId || "",
    origin_message_id: event.originMessageId || "",
    generation: String(event.generation || 0),
  }).filter(([, value]) => !!value));
}

function progressKind(event: UserVisibleAgentEvent): PetAgentMilestoneKind | null {
  const kind = event.detail?.progress?.kind;
  if (kind === "before_tools") return "planning";
  if (kind === "key_finding") return "key_finding";
  if (kind === "direction_change") return "direction_change";
  if (kind === "blocker") return "blocked";
  if (kind === "rework") return "rework";
  if (kind === "verification") return "verification_started";
  if (kind === "before_summary") return "summary_started";
  return null;
}

function stateFor(kind: PetAgentMilestoneKind): PetAgentMilestoneV1["petState"] {
  if (kind === "planning") return "planning";
  if (kind === "implementation_started") return "building";
  if (kind === "key_finding" || kind === "direction_change") return "building";
  if (kind === "blocked" || kind === "rework") return "debugging";
  if (["verification_started", "verification_passed", "summary_started", "result_submitted"].includes(kind)) return "reviewing";
  if (kind === "needs_user") return "waiting";
  if (kind === "completed") return "happy";
  if (kind === "failed") return "error";
  return "idle";
}

function sourceFor(event: UserVisibleAgentEvent): PetAgentMilestoneV1["source"] {
  if (isTestAgent(event) || event.detail?.executionStage?.kind === "independent_verification") return "test_agent";
  if (event.agentRunId || event.detail?.runtimeObservation) return "runtime";
  return "main_agent";
}

function project(event: UserVisibleAgentEvent): PetAgentMilestoneV1 | null {
  if (["assistant_progress", "agent_progress"].includes(event.eventType)
    && event.detail?.progress?.source === "system_observed") return null;
  let kind: PetAgentMilestoneKind | null = null;
  let summary = compact(event.detail?.progress?.text || event.display.summary, 240);
  const testAgent = isTestAgent(event);

  if (event.eventType === "requirement_plan") {
    kind = "planning";
    summary = compact(event.detail?.requirementPlan?.goal || summary || "正在制定任务执行计划", 240);
  } else if (event.eventType === "assistant_progress") {
    kind = progressKind(event);
  } else if (event.eventType === "agent_started") {
    kind = testAgent ? "verification_started" : "implementation_started";
    summary ||= testAgent ? "正在进行独立验收" : "已接收任务，开始执行";
  } else if (event.eventType === "agent_progress") {
    const phase = String(event.detail?.agentDisplay?.phase || event.display.summary || "").toLowerCase();
    if (event.detail?.progress?.text) kind = progressKind(event) || "key_finding";
    else if (/result_submitted|verifying|waiting.*accept|等待.*验收/.test(phase)) {
      kind = testAgent ? "verification_started" : "result_submitted";
      summary = testAgent ? "正在进行独立验收" : "已提交结果，等待 CCM 验收";
    } else if (/rework|返工/.test(phase)) {
      kind = "rework";
      summary ||= "验收未通过，正在返回项目 Agent 返工";
    }
  } else if (event.eventType === "agent_completed") {
    kind = testAgent ? "verification_passed" : "result_submitted";
    summary = testAgent ? "独立验收通过，等待主 Agent 总结" : "已提交结果，等待 CCM 验收";
  } else if (event.eventType === "agent_failed") {
    kind = testAgent ? "rework" : "blocked";
    summary ||= testAgent ? "验收未通过，正在返回项目 Agent 返工" : "执行遇到问题，等待 CCM 处理";
  } else if (event.eventType === "permission_required" || event.eventType === "clarification_required") {
    kind = "needs_user";
    summary ||= event.eventType === "permission_required" ? "任务需要你确认权限后继续" : "任务需要补充信息后继续";
  } else if (event.eventType === "result" && event.taskId) {
    const statusText = `${event.display.status} ${event.display.title} ${event.display.summary || ""}`.toLowerCase();
    if (/cancel/.test(statusText)) kind = "cancelled";
    else if (event.display.status === "failed") kind = "failed";
    else if (event.display.status === "waiting") kind = "needs_user";
    else kind = "completed";
    summary ||= kind === "completed" ? "任务已完成" : kind === "cancelled" ? "任务已取消" : "任务未能完成";
  }

  if (!kind || !summary) return null;
  const source = sourceFor(event);
  const attempt = Math.max(1, Number(event.detail?.agentDisplay?.attempt || event.detail?.executionStage?.attempt || 1));
  const projectName = compact(event.detail?.agentDisplay?.projectName || event.detail?.agentDisplay?.projectId, 120);
  const runtimeLabel = compact(event.detail?.agentDisplay?.runtimeLabel, 80);
  const terminal = ["completed", "failed", "cancelled"].includes(kind);
  const durable = terminal || kind === "needs_user";
  const identity = {
    kind,
    taskId: event.taskId || "",
    workItemId: event.workItemId || "",
    run: event.agentRunId || "",
    generation: event.generation,
    attempt,
    summary,
    checksum: event.detail?.progress?.milestoneChecksum || event.eventId,
  };
  return {
    schema: PET_AGENT_MILESTONE_SCHEMA,
    milestoneId: `pam_${hash(identity).slice(0, 28)}`,
    kind,
    source,
    confidence: event.detail?.progress?.confidence || event.detail?.runtimeObservation?.confidence || (source === "runtime" ? "observed" : "declared"),
    ...(event.taskId ? { taskId: event.taskId } : {}),
    ...(event.workItemId ? { workItemId: event.workItemId } : {}),
    scope: event.scope,
    scopeId: event.scopeId,
    ...(event.exactSessionId ? { exactSessionId: event.exactSessionId } : {}),
    ...(event.anchorMessageId ? { anchorMessageId: event.anchorMessageId } : {}),
    ...(event.originMessageId ? { originMessageId: event.originMessageId } : {}),
    generation: event.generation,
    attempt,
    ...(event.agentRunId ? { agentRunId: event.agentRunId } : {}),
    ...(projectName ? { projectName } : {}),
    ...(runtimeLabel ? { runtimeLabel } : {}),
    title: compact(eventTitle(event), 80),
    summary,
    petState: stateFor(kind),
    terminal,
    durable,
    dedupeKey: terminal
      ? `task-terminal:${event.taskId || hash(identity).slice(0, 24)}:${kind}`
      : kind === "needs_user"
        ? `task-terminal:${event.taskId || hash(identity).slice(0, 24)}:needs_user`
        : `pet-milestone:${hash(identity).slice(0, 40)}`,
    action: actionFor(event),
    contentStored: false,
  };
}

export function createPetAgentMilestoneProjector(options: ProjectorOptions) {
  const delivered = new Set<string>();
  const watermarks = new Map<string, RunWatermark>();
  const fallbackTimers = new Map<string, NodeJS.Timeout>();
  const fallbackTimeoutMs = Math.max(15_000, Math.min(300_000, Number(options.fallbackTimeoutMs || 60_000)));

  const clearFallback = (key: string) => {
    const timer = fallbackTimers.get(key);
    if (timer) clearTimeout(timer);
    fallbackTimers.delete(key);
  };

  const acceptIdentity = (event: UserVisibleAgentEvent, milestone: PetAgentMilestoneV1) => {
    const key = runtimeIdentity(event);
    const previous = watermarks.get(key);
    const generation = Math.max(0, Number(milestone.generation || 0));
    const attempt = Math.max(1, Number(milestone.attempt || 1));
    if (previous && (generation < previous.generation || (generation === previous.generation && attempt < previous.attempt))) return false;
    if (previous?.terminal && generation === previous.generation && attempt === previous.attempt && !milestone.terminal) return false;
    watermarks.set(key, { generation, attempt, terminal: milestone.terminal || previous?.terminal === true });
    return true;
  };

  const scheduleFallback = (event: UserVisibleAgentEvent, milestone: PetAgentMilestoneV1) => {
    if (!event.agentRunId || milestone.terminal || milestone.kind === "result_submitted") return;
    const key = runtimeIdentity(event);
    clearFallback(key);
    fallbackTimers.set(key, setTimeout(() => {
      fallbackTimers.delete(key);
      const files = event.detail?.fileChanges || [];
      const summary = files.length
        ? `已修改 ${files.length} 个文件，Agent 仍在运行`
        : milestone.source === "test_agent" ? "独立验收仍在运行，等待可验证结果" : "Agent 仍在运行，等待可验证进度";
      const observed: PetAgentMilestoneV1 = {
        ...milestone,
        milestoneId: `pam_${hash({ key, summary, generation: milestone.generation, attempt: milestone.attempt }).slice(0, 28)}`,
        kind: milestone.source === "test_agent" ? "verification_started" : "key_finding",
        source: "system",
        confidence: "observed",
        title: milestone.title,
        summary,
        petState: milestone.source === "test_agent" ? "reviewing" : "building",
        terminal: false,
        durable: false,
        dedupeKey: `pet-fallback:${key}:${milestone.generation || 0}:${milestone.attempt || 1}:${files.length}`,
      };
      if (!delivered.has(observed.dedupeKey) && options.getMode?.() !== "terminal_only") {
        delivered.add(observed.dedupeKey);
        options.emit(observed);
      }
    }, fallbackTimeoutMs));
  };

  const onEvent = (event: UserVisibleAgentEvent) => {
    const milestone = project(event);
    if (!milestone || !acceptIdentity(event, milestone)) return;
    const key = runtimeIdentity(event);
    if (milestone.terminal || milestone.kind === "result_submitted" || milestone.kind === "verification_passed") clearFallback(key);
    else scheduleFallback(event, milestone);
    if (milestone.durable) {
      if (!delivered.has(milestone.dedupeKey)) {
        delivered.add(milestone.dedupeKey);
        options.persist?.(milestone);
      }
      return;
    }
    if (options.getMode?.() === "terminal_only" || delivered.has(milestone.dedupeKey)) return;
    delivered.add(milestone.dedupeKey);
    options.emit(milestone);
  };

  const unsubscribe = subscribeUserVisibleAgentEvents(onEvent);
  return {
    stop() {
      unsubscribe();
      for (const timer of fallbackTimers.values()) clearTimeout(timer);
      fallbackTimers.clear();
    },
    project,
  };
}

export function runPetAgentMilestoneSelfTest() {
  const base: any = {
    schema: "ccm-user-visible-agent-event-v1",
    eventId: "event-1",
    sequence: 1,
    scope: "group",
    scopeId: "group-1",
    exactSessionId: "session-1",
    generation: 2,
    taskId: "task-1",
    workItemId: "work-1",
    agentRunId: "message-1",
    anchorMessageId: "anchor-1",
    display: { title: "smart-live-ui · Codex", summary: "执行中", status: "running" },
    detail: { agentDisplay: { projectId: "smart-live-ui", projectName: "smart-live-ui", runtimeLabel: "Codex", workItemTitle: "实现前端", phase: "executing", attempt: 1, isParallel: true } },
    visibility: "default",
    contentStored: false,
    createdAt: new Date().toISOString(),
  };
  const started = project({ ...base, eventType: "agent_started" });
  const submitted = project({ ...base, eventId: "event-2", eventType: "agent_completed", display: { ...base.display, status: "success" } });
  const terminal = project({ ...base, eventId: "event-3", eventType: "result", agentRunId: undefined, display: { title: "任务已完成", summary: "全部验收通过", status: "success" } });
  return {
    pass: started?.kind === "implementation_started"
      && started?.title === "smart-live-ui · Codex"
      && submitted?.kind === "result_submitted"
      && submitted?.summary.includes("等待 CCM 验收")
      && terminal?.kind === "completed"
      && terminal?.durable === true
      && terminal?.action.anchor_message_id === "anchor-1"
      && JSON.stringify([started, submitted, terminal]).includes("contentStored")
      && !JSON.stringify([started, submitted, terminal]).includes("lease"),
    started,
    submitted,
    terminal,
  };
}
