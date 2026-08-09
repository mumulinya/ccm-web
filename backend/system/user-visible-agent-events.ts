import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { estimateTextTokens } from "./context-budget";
import { buildToolDisplayDetail, type ToolDisplayDetailV1 } from "./tool-display-projection";
import {
  assistantProgressMilestoneChecksum,
  normalizeAssistantProgressKind,
  sanitizeAssistantProgressText,
  type AssistantProgressKind,
} from "./assistant-progress";

export const USER_VISIBLE_AGENT_EVENT_SCHEMA = "ccm-user-visible-agent-event-v1" as const;
export const USER_VISIBLE_AGENT_RESULT_SCHEMA = "ccm-user-visible-agent-result-v1" as const;

export type UserVisibleAgentEventType =
  | "turn_started"
  | "thinking_status"
  | "assistant_text_delta"
  | "assistant_progress"
  | "requirement_plan"
  | "tool_started"
  | "tool_progress"
  | "tool_completed"
  | "tool_failed"
  | "agent_started"
  | "agent_progress"
  | "agent_completed"
  | "agent_failed"
  | "permission_required"
  | "clarification_required"
  | "context_compacted"
  | "result";

export type UserVisibleAgentEvent = {
  schema: typeof USER_VISIBLE_AGENT_EVENT_SCHEMA;
  eventId: string;
  sequence: number;
  eventType: UserVisibleAgentEventType;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation: number;
  taskId?: string;
  workItemId?: string;
  agentRunId?: string;
  toolCallId?: string;
  toolName?: string;
  parentEventId?: string;
  parallelGroupId?: string;
  display: {
    title: string;
    target?: string;
    summary?: string;
    status: "running" | "success" | "failed" | "waiting";
    durationMs?: number;
    toolUseCount?: number;
    tokenCount?: number;
    tokenType?: "tool_output" | "provider_total";
    tokenAccuracy?: "reported" | "estimated";
  };
  detail?: {
    safeArguments?: any;
    safeResult?: any;
    evidenceIds?: string[];
    fileChanges?: any[];
    usage?: any;
    agentDisplay?: {
      projectId: string;
      projectName: string;
      runtimeLabel: string;
      workItemTitle: string;
      phase: string;
      attempt: number;
      queuePosition?: number;
      isParallel: boolean;
    };
    executionStage?: {
      kind: "preparation" | "project_execution" | "independent_verification" | "main_agent_summary";
      stageRunId: string;
      reviewCycleId?: string;
      attempt: number;
      startedAt: string;
      completedAt?: string;
      activeDurationMs?: number;
    };
    toolDisplay?: ToolDisplayDetailV1;
    timing?: {
      totalMs: number;
      modelMs?: number;
      toolWallMs?: number;
      dependencyWaitMs?: number;
      queueWaitMs?: number;
      otherMs?: number;
      stages?: {
        preparationMs?: number;
        projectAgentWallMs?: number;
        testAgentWallMs?: number;
        mainAgentSummaryMs?: number;
      };
    };
    progress?: {
      kind: AssistantProgressKind;
      text: string;
      modelCallIndex: number;
      relatedToolCallIds: string[];
      milestoneChecksum: string;
    };
    requirementPlan?: UserVisibleRequirementPlanV1;
  };
  visibility: "default" | "transcript" | "technical";
  contentStored: false;
  createdAt: string;
};

export type UserVisibleRequirementPlanStepV1 = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  project?: string;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "blocked" | "skipped";
};

export type UserVisibleRequirementPlanV1 = {
  schema: "ccm-user-visible-requirement-plan-v1";
  planId: string;
  revision: number;
  title: string;
  goal: string;
  steps: UserVisibleRequirementPlanStepV1[];
  scope: string[];
  expectedResults: string[];
  exclusions: string[];
  status: "ready" | "executing" | "completed" | "blocked" | "superseded";
  createdAt: string;
  updatedAt: string;
  planChecksum: string;
  contentStored: false;
};

type EventStore = {
  schema: "ccm-user-visible-agent-event-store-v1";
  revision: number;
  scope: string;
  scopeId: string;
  exactSessionId: string;
  events: UserVisibleAgentEvent[];
  updatedAt: string;
  checksum: string;
};

const STORE_ROOT = path.resolve(process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || path.join(os.homedir(), ".cc-connect", "agent-execution-events"));
const MAX_EVENTS_PER_SESSION = 3_000;
const listeners = new Set<(event: UserVisibleAgentEvent) => void>();

const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)(?:$|_)/i;
const BODY_KEY = /^(?:prompt|systemPrompt|system_prompt|rawPrompt|raw_prompt|body|content|text|output|rawOutput|raw_output|context|sourceCode|source_code|webpage|html|notebookOutput|notebook_output)$/i;
const NATIVE_ID_KEY = /(?:native[_-]?session|provider[_-]?request[_-]?id|lease[_-]?id|trace[_-]?id)/i;
const INLINE_SECRET = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;

function now() { return new Date().toISOString(); }
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function compactText(value: any, max = 500) {
  return String(value ?? "")
    .replace(INLINE_SECRET, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
    .replace(/[\0\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}
function uniqueStrings(value: any, max = 100) {
  return [...new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(item => compactText(item, 500)).filter(Boolean))].slice(0, max);
}

export function sanitizeUserVisibleAgentDetail(value: any, depth = 0, seen = new WeakSet<object>()): any {
  if (depth > 7) return "[depth-limited]";
  if (typeof value === "string") return compactText(value, 1_500);
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return `[binary:${value.byteLength}]`;
  if (Array.isArray(value)) return value.slice(0, 40).map(item => sanitizeUserVisibleAgentDetail(item, depth + 1, seen));
  const output: any = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) output[key] = "[redacted]";
    else if (BODY_KEY.test(key)) output[`${key}Checksum`] = hash(nested).slice(0, 24);
    else if (NATIVE_ID_KEY.test(key)) output[`${key}Checksum`] = hash(nested).slice(0, 24);
    else output[key] = sanitizeUserVisibleAgentDetail(nested, depth + 1, seen);
  }
  return output;
}

function sanitizeUserVisibleFileChanges(value: any) {
  return (Array.isArray(value) ? value : []).slice(0, 100).map((item: any) => {
    if (typeof item === "string") return { path: compactText(item, 500) };
    const pathValue = compactText(item?.path || item?.file || item?.name, 500);
    if (!pathValue) return null;
    const additions = Number(item?.additions ?? item?.diff?.additions);
    const deletions = Number(item?.deletions ?? item?.diff?.deletions);
    return {
      path: pathValue,
      ...(compactText(item?.project || item?.target_project || item?.projectName || item?.agent, 240)
        ? { project: compactText(item?.project || item?.target_project || item?.projectName || item?.agent, 240) } : {}),
      ...(compactText(item?.statusText || item?.status, 80) ? { status: compactText(item?.statusText || item?.status, 80) } : {}),
      ...(Number.isFinite(additions) ? { additions: Math.max(0, additions) } : {}),
      ...(Number.isFinite(deletions) ? { deletions: Math.max(0, deletions) } : {}),
      ...(item?.binary === true ? { binary: true } : {}),
      ...(item?.deleted === true ? { deleted: true } : {}),
    };
  }).filter(Boolean);
}

function normalizeRequirementPlanStepStatus(value: any): UserVisibleRequirementPlanStepV1["status"] {
  const status = String(value || "pending").toLowerCase();
  if (["completed", "done", "success", "succeeded", "accepted"].includes(status)) return "completed";
  if (["running", "in_progress", "executing", "awaiting_review", "reworking", "reviewing"].includes(status)) return "running";
  if (["blocked", "failed", "rejected", "needs_confirmation"].includes(status)) return "blocked";
  if (["skipped", "cancelled", "canceled"].includes(status)) return "skipped";
  return "pending";
}

function sanitizeUserVisibleRequirementPlan(value: any): UserVisibleRequirementPlanV1 | null {
  if (!value || typeof value !== "object") return null;
  const planId = compactText(value.planId || value.plan_id || value.id, 240);
  const title = compactText(value.title || "需求实施计划", 160) || "需求实施计划";
  const goal = compactText(value.goal || value.summary || value.objective, 1200);
  const steps = (Array.isArray(value.steps) ? value.steps : [])
    .slice(0, 30)
    .map((step: any, index: number) => {
      const stepTitle = compactText(step?.title || step?.label || step?.objective, 240);
      if (!stepTitle) return null;
      return {
        id: compactText(step?.id || `step_${index + 1}`, 100),
        title: stepTitle,
        description: compactText(step?.description || step?.objective || step?.detail, 800),
        outcome: compactText(step?.outcome || step?.expectedResult || step?.expected_result || step?.acceptance?.[0], 600),
        ...(compactText(step?.project || step?.projectName || step?.project_name, 160)
          ? { project: compactText(step?.project || step?.projectName || step?.project_name, 160) } : {}),
        dependsOn: uniqueStrings(step?.dependsOn || step?.depends_on, 20).map(item => compactText(item, 100)),
        status: normalizeRequirementPlanStepStatus(step?.status),
      } as UserVisibleRequirementPlanStepV1;
    })
    .filter(Boolean) as UserVisibleRequirementPlanStepV1[];
  if (!planId || !goal || !steps.length) return null;
  const rawStatus = String(value.status || "ready").toLowerCase();
  const status: UserVisibleRequirementPlanV1["status"] = ["ready", "executing", "completed", "blocked", "superseded"].includes(rawStatus)
    ? rawStatus as UserVisibleRequirementPlanV1["status"]
    : "ready";
  const createdAt = compactText(value.createdAt || value.created_at, 40) || now();
  const updatedAt = compactText(value.updatedAt || value.updated_at, 40) || createdAt;
  const projected = {
    schema: "ccm-user-visible-requirement-plan-v1" as const,
    planId,
    revision: Math.max(1, Number(value.revision || 1)),
    title,
    goal,
    steps,
    scope: uniqueStrings(value.scope || value.scopes, 20).map(item => compactText(item, 300)),
    expectedResults: uniqueStrings(value.expectedResults || value.expected_results, 24).map(item => compactText(item, 600)),
    exclusions: uniqueStrings(value.exclusions || value.outOfScope || value.out_of_scope, 20).map(item => compactText(item, 600)),
    status,
    createdAt,
    updatedAt,
    contentStored: false as const,
  };
  return { ...projected, planChecksum: hash(projected) };
}

function normalizeScope(value: any): UserVisibleAgentEvent["scope"] {
  const scope = String(value || "").toLowerCase();
  if (scope === "project" || scope === "group") return scope;
  return "global";
}

function eventStoreFile(scope: string, scopeId: string, exactSessionId: string) {
  const identity = `${scope}:${scopeId}:${exactSessionId}`;
  return path.join(STORE_ROOT, scope, `${hash(identity).slice(0, 32)}.json`);
}

function emptyStore(scope: string, scopeId: string, exactSessionId: string): EventStore {
  return {
    schema: "ccm-user-visible-agent-event-store-v1",
    revision: 0,
    scope,
    scopeId,
    exactSessionId,
    events: [],
    updatedAt: "",
    checksum: "",
  };
}

function storeChecksum(store: Omit<EventStore, "checksum"> | EventStore) {
  const { checksum: _checksum, ...stable } = store as EventStore;
  return hash(stable);
}

function readStore(scope: string, scopeId: string, exactSessionId: string): EventStore {
  const fallback = emptyStore(scope, scopeId, exactSessionId);
  const file = eventStoreFile(scope, scopeId, exactSessionId);
  const value = readJsonWithBackup<any>(file, fallback);
  const store: EventStore = {
    ...fallback,
    revision: Math.max(0, Number(value?.revision || 0)),
    events: Array.isArray(value?.events) ? value.events.filter((item: any) => item?.schema === USER_VISIBLE_AGENT_EVENT_SCHEMA) : [],
    updatedAt: compactText(value?.updatedAt, 40),
    checksum: compactText(value?.checksum, 80),
  };
  if (store.checksum && store.checksum !== storeChecksum(store)) return fallback;
  return store;
}

function toolPresentation(toolNameInput: any, args: any = {}) {
  const display = buildToolDisplayDetail({ toolName: toolNameInput, arguments: args });
  return { title: display.tool.label, target: display.tool.target || "" };
}

function normalizeEventType(input: any): UserVisibleAgentEventType {
  const source = String(input || "").toLowerCase();
  if ([
    "turn_started", "thinking_status", "assistant_text_delta", "assistant_progress", "requirement_plan",
    "tool_started", "tool_progress", "tool_completed", "tool_failed",
    "agent_started", "agent_progress", "agent_completed", "agent_failed",
    "permission_required", "clarification_required", "context_compacted", "result",
  ].includes(source)) return source as UserVisibleAgentEventType;
  if (["tool_use", "tool_started"].includes(source)) return "tool_started";
  if (["tool_result", "tool_completed"].includes(source)) return "tool_completed";
  if (source === "tool_failed") return "tool_failed";
  if (source === "tool_activity" || source === "progress") return "tool_progress";
  if (source === "started") return "turn_started";
  if (["decision", "planning", "thinking"].includes(source)) return "thinking_status";
  if (["clarification_required", "waiting_clarification"].includes(source)) return "clarification_required";
  if (["waiting_confirmation", "permission_required"].includes(source)) return "permission_required";
  if (["compacted", "context_compacted"].includes(source)) return "context_compacted";
  if (["completed", "failed", "cancelled", "blocked", "result"].includes(source)) return "result";
  if (source.startsWith("agent_")) return source as UserVisibleAgentEventType;
  return "thinking_status";
}

export function normalizeUserVisibleAgentEvent(input: any, sequence = 0): UserVisibleAgentEvent {
  const scope = normalizeScope(input?.scope);
  const scopeId = compactText(input?.scopeId || input?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id, 240);
  if (!scopeId || !exactSessionId) throw new Error("用户可见Agent事件缺少精确作用域或会话身份");
  const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
  const args = input?.arguments || input?.args || input?.tool?.arguments || input?.detail?.safeArguments || {};
  let eventType = normalizeEventType(input?.eventType || input?.event_type || input?.type);
  if (/dispatch|test_agent|skill_fork/i.test(String(toolName))) {
    if (eventType === "tool_started") eventType = "agent_started";
    if (eventType === "tool_progress") eventType = "agent_progress";
    if (eventType === "tool_completed") eventType = "agent_completed";
    if (eventType === "tool_failed") eventType = "agent_failed";
  }
  const presentation = toolPresentation(toolName, args);
  const status = input?.display?.status || (eventType.endsWith("_failed") ? "failed"
    : eventType.endsWith("_completed") || eventType === "context_compacted" || (eventType === "result" && !input?.error) ? "success"
      : ["permission_required", "clarification_required"].includes(eventType) ? "waiting" : "running");
  const createdAt = compactText(input?.createdAt || input?.created_at || input?.timestamp || input?.at, 40) || now();
  const display = {
    title: compactText(input?.display?.title || input?.title || presentation.title || "Agent", 200),
    ...(compactText(input?.display?.target || input?.target || presentation.target, 300) ? { target: compactText(input?.display?.target || input?.target || presentation.target, 300) } : {}),
    ...(compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 600) ? { summary: compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 600) } : {}),
    status,
    ...(Number.isFinite(Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) ? { durationMs: Math.max(0, Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) } : {}),
    ...(Number.isFinite(Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) ? { toolUseCount: Math.max(0, Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) } : {}),
    ...(Number.isFinite(Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) ? { tokenCount: Math.max(0, Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) } : {}),
    ...(["tool_output", "provider_total"].includes(String(input?.display?.tokenType || input?.tokenType || input?.token_type))
      ? { tokenType: String(input?.display?.tokenType || input?.tokenType || input?.token_type) as "tool_output" | "provider_total" } : {}),
    ...(["reported", "estimated"].includes(String(input?.display?.tokenAccuracy || input?.tokenAccuracy || input?.token_accuracy))
      ? { tokenAccuracy: String(input?.display?.tokenAccuracy || input?.tokenAccuracy || input?.token_accuracy) as "reported" | "estimated" } : {}),
  } as UserVisibleAgentEvent["display"];
  const detailSource = input?.detail || {};
  const detail: UserVisibleAgentEvent["detail"] = {
    ...(args && Object.keys(args).length ? { safeArguments: sanitizeUserVisibleAgentDetail(args) } : {}),
    ...(detailSource.safeResult != null || input?.observation != null || input?.result != null
      ? { safeResult: sanitizeUserVisibleAgentDetail(detailSource.safeResult ?? input?.observation ?? input?.result) } : {}),
    ...(uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids).length
      ? { evidenceIds: uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids) } : {}),
    ...(Array.isArray(detailSource.fileChanges || input?.fileChanges || input?.file_changes || input?.result?.fileChanges || input?.result?.file_changes)
      ? { fileChanges: sanitizeUserVisibleFileChanges(detailSource.fileChanges || input?.fileChanges || input?.file_changes || input?.result?.fileChanges || input?.result?.file_changes) } : {}),
    ...(detailSource.usage || input?.usage ? { usage: sanitizeUserVisibleAgentDetail(detailSource.usage || input?.usage) } : {}),
    ...(detailSource.agentDisplay && typeof detailSource.agentDisplay === "object" ? {
      agentDisplay: sanitizeUserVisibleAgentDetail({
        projectId: compactText(detailSource.agentDisplay.projectId || detailSource.agentDisplay.project_id, 240),
        projectName: compactText(detailSource.agentDisplay.projectName || detailSource.agentDisplay.project_name, 240),
        runtimeLabel: compactText(detailSource.agentDisplay.runtimeLabel || detailSource.agentDisplay.runtime_label, 120),
        workItemTitle: compactText(detailSource.agentDisplay.workItemTitle || detailSource.agentDisplay.work_item_title, 300),
        phase: compactText(detailSource.agentDisplay.phase, 120),
        attempt: Math.max(1, Number(detailSource.agentDisplay.attempt || 1)),
        ...(Number.isFinite(Number(detailSource.agentDisplay.queuePosition ?? detailSource.agentDisplay.queue_position))
          ? { queuePosition: Math.max(1, Number(detailSource.agentDisplay.queuePosition ?? detailSource.agentDisplay.queue_position)) }
          : {}),
        isParallel: detailSource.agentDisplay.isParallel === true || detailSource.agentDisplay.is_parallel === true,
      }),
    } : {}),
    ...(detailSource.executionStage && typeof detailSource.executionStage === "object"
      && ["preparation", "project_execution", "independent_verification", "main_agent_summary"].includes(String(detailSource.executionStage.kind)) ? {
      executionStage: sanitizeUserVisibleAgentDetail({
        kind: String(detailSource.executionStage.kind),
        stageRunId: compactText(detailSource.executionStage.stageRunId || detailSource.executionStage.stage_run_id, 240),
        ...(compactText(detailSource.executionStage.reviewCycleId || detailSource.executionStage.review_cycle_id, 240)
          ? { reviewCycleId: compactText(detailSource.executionStage.reviewCycleId || detailSource.executionStage.review_cycle_id, 240) } : {}),
        attempt: Math.max(1, Number(detailSource.executionStage.attempt || 1)),
        startedAt: compactText(detailSource.executionStage.startedAt || detailSource.executionStage.started_at, 40),
        ...(compactText(detailSource.executionStage.completedAt || detailSource.executionStage.completed_at, 40)
          ? { completedAt: compactText(detailSource.executionStage.completedAt || detailSource.executionStage.completed_at, 40) } : {}),
        ...(Number.isFinite(Number(detailSource.executionStage.activeDurationMs ?? detailSource.executionStage.active_duration_ms))
          ? { activeDurationMs: Math.max(0, Number(detailSource.executionStage.activeDurationMs ?? detailSource.executionStage.active_duration_ms)) } : {}),
      }),
    } : {}),
    ...(detailSource.toolDisplay?.schema === "ccm-tool-display-detail-v1" ? { toolDisplay: detailSource.toolDisplay } : {}),
    ...(detailSource.timing && typeof detailSource.timing === "object" ? {
      timing: sanitizeUserVisibleAgentDetail({
        totalMs: Math.max(0, Number(detailSource.timing.totalMs || 0)),
        ...(Number.isFinite(Number(detailSource.timing.modelMs)) ? { modelMs: Math.max(0, Number(detailSource.timing.modelMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.toolWallMs)) ? { toolWallMs: Math.max(0, Number(detailSource.timing.toolWallMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.dependencyWaitMs)) ? { dependencyWaitMs: Math.max(0, Number(detailSource.timing.dependencyWaitMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.queueWaitMs)) ? { queueWaitMs: Math.max(0, Number(detailSource.timing.queueWaitMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.otherMs)) ? { otherMs: Math.max(0, Number(detailSource.timing.otherMs)) } : {}),
        ...(detailSource.timing.stages && typeof detailSource.timing.stages === "object" ? { stages: {
          ...(Number.isFinite(Number(detailSource.timing.stages.preparationMs)) ? { preparationMs: Math.max(0, Number(detailSource.timing.stages.preparationMs)) } : {}),
          ...(Number.isFinite(Number(detailSource.timing.stages.projectAgentWallMs)) ? { projectAgentWallMs: Math.max(0, Number(detailSource.timing.stages.projectAgentWallMs)) } : {}),
          ...(Number.isFinite(Number(detailSource.timing.stages.testAgentWallMs)) ? { testAgentWallMs: Math.max(0, Number(detailSource.timing.stages.testAgentWallMs)) } : {}),
          ...(Number.isFinite(Number(detailSource.timing.stages.mainAgentSummaryMs)) ? { mainAgentSummaryMs: Math.max(0, Number(detailSource.timing.stages.mainAgentSummaryMs)) } : {}),
        } } : {}),
      }),
    } : {}),
    ...(detailSource.progress && typeof detailSource.progress === "object"
      && sanitizeAssistantProgressText(detailSource.progress.text, 600) ? {
      progress: {
        kind: normalizeAssistantProgressKind(detailSource.progress.kind),
        text: sanitizeAssistantProgressText(detailSource.progress.text, 600),
        modelCallIndex: Math.max(0, Number(detailSource.progress.modelCallIndex || detailSource.progress.model_call_index || 0)),
        relatedToolCallIds: uniqueStrings(detailSource.progress.relatedToolCallIds || detailSource.progress.related_tool_call_ids, 64),
        milestoneChecksum: compactText(detailSource.progress.milestoneChecksum || detailSource.progress.milestone_checksum, 80),
      },
    } : {}),
    ...(sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan)
      ? { requirementPlan: sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan)! }
      : {}),
  };
  const stableIdentity = {
    scope, scopeId, exactSessionId, generation: Math.max(0, Number(input?.generation || 0)),
    taskId: input?.taskId || input?.task_id || "", workItemId: input?.workItemId || input?.work_item_id || "",
    toolCallId: input?.toolCallId || input?.tool_call_id || "", eventType, createdAt,
  };
  return {
    schema: USER_VISIBLE_AGENT_EVENT_SCHEMA,
    eventId: compactText(input?.eventId || input?.event_id, 240) || `uve_${hash(stableIdentity).slice(0, 28)}`,
    sequence: Math.max(0, Number((input?.sequence ?? sequence) || 0)),
    eventType,
    scope,
    scopeId,
    exactSessionId,
    generation: Math.max(0, Number(input?.generation || 0)),
    ...(compactText(input?.taskId || input?.task_id, 240) ? { taskId: compactText(input?.taskId || input?.task_id, 240) } : {}),
    ...(compactText(input?.workItemId || input?.work_item_id, 240) ? { workItemId: compactText(input?.workItemId || input?.work_item_id, 240) } : {}),
    ...(compactText(input?.agentRunId || input?.agent_run_id, 240) ? { agentRunId: compactText(input?.agentRunId || input?.agent_run_id, 240) } : {}),
    ...(compactText(input?.toolCallId || input?.tool_call_id, 240) ? { toolCallId: compactText(input?.toolCallId || input?.tool_call_id, 240) } : {}),
    ...(compactText(toolName, 240) ? { toolName: compactText(toolName, 240) } : {}),
    ...(compactText(input?.parentEventId || input?.parent_event_id, 240) ? { parentEventId: compactText(input?.parentEventId || input?.parent_event_id, 240) } : {}),
    ...(compactText(input?.parallelGroupId || input?.parallel_group_id, 240) ? { parallelGroupId: compactText(input?.parallelGroupId || input?.parallel_group_id, 240) } : {}),
    display,
    ...(Object.keys(detail).length ? { detail } : {}),
    visibility: ["default", "transcript", "technical"].includes(String(input?.visibility)) ? input.visibility : "default",
    contentStored: false,
    createdAt,
  };
}

export function appendUserVisibleAgentEvent(input: any) {
  const initial = normalizeUserVisibleAgentEvent(input);
  const file = eventStoreFile(initial.scope, initial.scopeId, initial.exactSessionId);
  let event = initial;
  let appended = false;
  withFileLock(file, () => {
    const store = readStore(initial.scope, initial.scopeId, initial.exactSessionId);
    const existing = store.events.find(item => item.eventId === initial.eventId);
    if (existing) { event = existing; return; }
    event = { ...initial, sequence: Math.max(store.revision, ...store.events.map(item => item.sequence), 0) + 1 };
    appended = true;
    store.events = [...store.events, event].slice(-MAX_EVENTS_PER_SESSION);
    store.revision = event.sequence;
    store.updatedAt = now();
    store.checksum = storeChecksum(store);
    writeJsonAtomic(file, store);
  });
  if (appended) {
    for (const listener of [...listeners]) { try { listener(event); } catch {} }
  }
  return event;
}

export function appendAssistantProgress(input: any) {
  const text = sanitizeAssistantProgressText(input?.text || input?.progressUpdate || input?.progress_update, 600);
  if (!text) return null;
  const kind = normalizeAssistantProgressKind(input?.kind || input?.progressKind || input?.progress_kind);
  const modelCallIndex = Math.max(0, Number(input?.modelCallIndex || input?.model_call_index || 0));
  const relatedToolCallIds = uniqueStrings(input?.relatedToolCallIds || input?.related_tool_call_ids, 64);
  const milestoneChecksum = assistantProgressMilestoneChecksum({ kind, text, modelCallIndex, relatedToolCallIds });
  const eventId = compactText(input?.eventId || input?.event_id, 240)
    || `assistant-progress:${compactText(input?.turnId || input?.turn_id || input?.taskId || input?.task_id || "turn", 120)}:${modelCallIndex}:${milestoneChecksum.slice(0, 20)}`;
  return appendUserVisibleAgentEvent({
    ...input,
    eventId,
    eventType: "assistant_progress",
    display: {
      title: compactText(input?.display?.title || input?.title || "进度说明", 120),
      summary: text,
      status: input?.display?.status || "running",
    },
    detail: {
      ...(input?.detail || {}),
      progress: { kind, text, modelCallIndex, relatedToolCallIds, milestoneChecksum },
    },
    visibility: "default",
  });
}

export function appendUserVisibleRequirementPlan(input: any) {
  const plan = sanitizeUserVisibleRequirementPlan(input?.plan || input?.requirementPlan || input?.requirement_plan);
  if (!plan) return null;
  const eventId = compactText(input?.eventId || input?.event_id, 240)
    || `requirement-plan:${plan.planId}:${plan.revision}:${plan.status}`;
  return appendUserVisibleAgentEvent({
    ...input,
    eventId,
    eventType: "requirement_plan",
    display: {
      title: plan.title,
      summary: plan.goal,
      status: plan.status === "blocked" ? "failed" : plan.status === "completed" ? "success" : "running",
    },
    detail: { ...(input?.detail || {}), requirementPlan: plan },
    visibility: "default",
  });
}

export function listUserVisibleAgentEvents(filter: any) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  if (!scopeId || !exactSessionId) throw new Error("查询执行记录必须指定scope、scopeId和exactSessionId");
  const cursor = Math.max(0, Number(filter?.cursor || filter?.after || 0));
  const limit = Math.max(1, Math.min(500, Number(filter?.limit || 200)));
  const store = readStore(scope, scopeId, exactSessionId);
  const rows = store.events.filter(item => item.sequence > cursor).slice(0, limit);
  return {
    schema: "ccm-user-visible-agent-event-list-v1",
    events: rows,
    nextCursor: rows.at(-1)?.sequence || cursor,
    hasMore: store.events.some(item => item.sequence > (rows.at(-1)?.sequence || cursor)),
    contentStored: false,
  };
}

export function getUserVisibleAgentEvent(filter: any, eventId: string) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  if (!scopeId || !exactSessionId) throw new Error("查询工具详情必须指定scope、scopeId和exactSessionId");
  return readStore(scope, scopeId, exactSessionId).events.find(item => item.eventId === compactText(eventId, 240)) || null;
}

export function subscribeUserVisibleAgentEvents(handler: (event: UserVisibleAgentEvent) => void) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/** Live-only text/progress events. They deliberately bypass the projection store. */
export function publishEphemeralUserVisibleAgentEvent(input: any) {
  const event = normalizeUserVisibleAgentEvent({ ...input, contentStored: false }, 0);
  for (const listener of [...listeners]) { try { listener(event); } catch {} }
  return event;
}

export function buildUserVisibleAgentResult(input: any) {
  return {
    schema: USER_VISIBLE_AGENT_RESULT_SCHEMA,
    status: compactText(input?.status, 80) || "success",
    text: compactText(input?.text || input?.reply || input?.summary, 4_000),
    durationMs: Math.max(0, Number(input?.durationMs || input?.duration_ms || 0)),
    modelDurationMs: Math.max(0, Number(input?.modelDurationMs || input?.duration_api_ms || 0)),
    turns: Math.max(0, Number(input?.turns || input?.numTurns || input?.num_turns || 0)),
    toolCalls: Math.max(0, Number(input?.toolCalls || input?.tool_calls || 0)),
    stopReason: compactText(input?.stopReason || input?.stop_reason, 120),
    agentStats: sanitizeUserVisibleAgentDetail(input?.agentStats || input?.agent_stats || input?.agents || {}),
    fileChanges: sanitizeUserVisibleFileChanges(input?.fileChanges || input?.file_changes || input?.filesChanged || input?.files_changed || []),
    verification: sanitizeUserVisibleAgentDetail(input?.verification || input?.verificationResults || input?.verification_results || []),
    unfinished: uniqueStrings(input?.unfinished || input?.incomplete || input?.blockers),
    usage: sanitizeUserVisibleAgentDetail(input?.usage || {}),
    contentStored: false,
  };
}

export function appendToolProjection(input: any) {
  const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
  const args = input?.arguments || input?.args || input?.detail?.safeArguments || {};
  const rawResult = input?.observation ?? input?.result ?? input?.detail?.safeResult;
  const toolDisplay = buildToolDisplayDetail({ toolName, arguments: args, result: rawResult, error: input?.error });
  const eventType = normalizeEventType(input?.error ? "tool_failed" : input?.eventType || input?.type);
  const terminal = eventType === "tool_completed" || eventType === "tool_failed";
  const explicitTokens = Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens);
  const outputTokens = terminal
    ? (Number.isFinite(explicitTokens) && explicitTokens > 0 ? explicitTokens : estimateTextTokens(JSON.stringify(rawResult ?? "")))
    : 0;
  const suppliedSummary = compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 500);
  const summary = terminal
    ? (eventType === "tool_failed" ? toolDisplay.result.summary : (toolDisplay.result.summary === "工具执行完成" ? "" : toolDisplay.result.summary))
    : suppliedSummary;
  const durationMs = Math.max(0, Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms ?? 0));
  const stageKind = /test.?agent/i.test(String(toolName))
    ? "independent_verification"
    : /dispatch|skill.?fork/i.test(String(toolName))
      ? "project_execution"
      : "preparation";
  const completedAt = terminal ? new Date().toISOString() : "";
  const startedAt = input?.detail?.executionStage?.startedAt || input?.createdAt
    || (durationMs > 0 ? new Date(Date.now() - durationMs).toISOString() : new Date().toISOString());
  return appendUserVisibleAgentEvent({
    ...input,
    // The raw runtime receipt is consumed by the display projector above and
    // must not leak back through normalizeUserVisibleAgentEvent's legacy
    // safeResult compatibility path.
    observation: undefined,
    result: undefined,
    eventType,
    display: {
      ...(input?.display || {}),
      ...(summary ? { summary } : { summary: undefined }),
      ...(outputTokens > 0 ? {
        tokenCount: outputTokens,
        tokenType: "tool_output",
        tokenAccuracy: input?.display?.tokenAccuracy === "reported" || input?.tokenAccuracy === "reported" ? "reported" : "estimated",
      } : {}),
    },
    detail: {
      ...(input?.detail || {}),
      executionStage: input?.detail?.executionStage || {
        kind: stageKind,
        stageRunId: `tool:${String(input?.toolCallId || input?.tool_call_id || toolName)}`,
        attempt: Math.max(1, Number(input?.attempt || 1)),
        startedAt,
        ...(completedAt ? { completedAt } : {}),
        ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
      },
      safeArguments: input?.arguments || input?.args || input?.detail?.safeArguments,
      toolDisplay,
    },
  });
}

export function clearUserVisibleAgentEventsForTest() {
  if (!process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || !fs.existsSync(STORE_ROOT)) return;
  fs.rmSync(STORE_ROOT, { recursive: true, force: true });
}

export function runUserVisibleAgentEventSelfTest() {
  const event = normalizeUserVisibleAgentEvent({
    scope: "project", scopeId: "demo", exactSessionId: "session-1", eventType: "tool_started",
    toolName: "find_definition", toolCallId: "call-1", arguments: { symbol: "hello", api_key: "SENTINEL" },
    detail: { safeResult: { content: "SOURCE_SENTINEL", count: 2 } },
  }, 1);
  const serialized = JSON.stringify(event);
  const checks = {
    schema: event.schema === USER_VISIBLE_AGENT_EVENT_SCHEMA,
    ccLabel: event.display.title === "Find definition",
    secretRedacted: !serialized.includes("SENTINEL"),
    bodyProjected: !serialized.includes("SOURCE_SENTINEL") && serialized.includes("contentChecksum"),
    noContent: event.contentStored === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks, event };
}
