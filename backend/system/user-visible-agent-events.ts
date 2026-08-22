import * as crypto from "crypto";
import type { CcmInternalPromptBindings, CcmInternalPromptDescriptor } from "../agents/internal-prompt-contract";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { withSqliteTaskStore } from "../core/task-store";
import { estimateTextTokens } from "./context-budget";
import { buildToolDisplayDetail, isWorkspaceReadonlyToolName, type ToolDisplayDetailV1 } from "./tool-display-projection";
import {
  assistantProgressBatchId,
  assistantProgressMilestoneChecksum,
  normalizeAssistantProgressKind,
  sanitizeAssistantProgressText,
  type AssistantProgressKind,
} from "./assistant-progress";
import { buildCcmCompletionSummary, type CcmCompletionSummaryV1 } from "./completion-summary";

export const USER_VISIBLE_AGENT_EVENT_SCHEMA = "ccm-user-visible-agent-event-v1" as const;
export const USER_VISIBLE_AGENT_RESULT_SCHEMA = "ccm-user-visible-agent-result-v1" as const;

export type UserVisibleAgentEventType =
  | "turn_started"
  | "thinking_status"
  | "assistant_text_delta"
  | "assistant_progress"
  | "model_activity"
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

export type CcmAttemptReplayProjectionV1 = {
  schema: "ccm-attempt-replay-projection-v1";
  taskId: string;
  attempt: number;
  generation: number;
  status: "running" | "success" | "failed" | "blocked" | "interrupted" | "cancelled";
  exactSessionId?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  stoppedStage?: string;
  terminalReason?: string;
  counts: { events: number; tools: number; files: number; verification: number };
  contentStored: false;
};

export type UserVisibleAgentEvent = {
  schema: typeof USER_VISIBLE_AGENT_EVENT_SCHEMA;
  eventId: string;
  sequence: number;
  eventType: UserVisibleAgentEventType;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation: number;
  anchorMessageId?: string;
  originMessageId?: string;
  /** Stable identity for one visible request/recovery attempt. */
  turnId?: string;
  /** Recovery/work attempt number; omitted for legacy events without one. */
  attempt?: number;
  /** Authoritative assistant response row, when known. */
  responseMessageId?: string;
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
    toolContractVersion?: 2 | 3;
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
      kind: "preparation" | "coordination_dispatch" | "project_execution" | "independent_verification" | "main_agent_summary";
      stageRunId: string;
      reviewCycleId?: string;
      attempt: number;
      startedAt: string;
      completedAt?: string;
      activeDurationMs?: number;
    };
    toolDisplay?: ToolDisplayDetailV1;
    fileReadEvidence?: {
      project: string;
      path: string;
      ranges: Array<{ start: number; end: number }>;
      checksum?: string;
      source: "structured_tool" | "safe_command_inference";
      contentStored: false;
    };
    timing?: {
      totalMs: number;
      modelMs?: number;
      toolWallMs?: number;
      dependencyWaitMs?: number;
      queueWaitMs?: number;
      otherMs?: number;
      projectAgentWallMs?: number;
      verificationMs?: number;
      summaryMs?: number;
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
      batchId: string;
      milestoneChecksum: string;
      source?: "agent_reported" | "runtime_structured" | "system_observed";
      confidence?: "declared" | "observed";
      sourceEventChecksum?: string;
    };
    modelActivity?: {
      state: "started" | "waiting" | "retrying" | "streaming" | "completed" | "failed";
      phase: "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis";
      modelCallIndex: number;
      retryAttempt?: number;
      startedAt: string;
      firstDeltaAt?: string;
      safeLabel: string;
      contentStored: false;
    };
    keyProgress?: {
      schema: "ccm-agent-key-progress-v1";
      eventId: string;
      kind: "model_preamble" | "phase_update" | "tool_batch_started" | "tool_batch_completed" | "model_key_summary" | "child_agent_update" | "verification_update";
      source: "model_stream" | "deterministic" | "summary_model" | "child_agent";
      status: "running" | "success" | "failed" | "waiting";
      round: number;
      text: string;
      modelCallIndex: number;
      toolCallIds: string[];
      relatedEventIds: string[];
      contentStored: false;
    };
    promptBindings?: CcmInternalPromptBindings;
    liveProgress?: {
      phase: "starting" | "running" | "testing" | "building" | "finishing" | "retrying";
      safeSummary: string;
      completed?: number;
      total?: number;
      updatedAt: string;
      contentStored: false;
    };
    stream?: {
      sequence: number;
      final: boolean;
      checksum?: string;
    };
    availableActions?: UserVisibleAgentAction[];
    replayLink?: {
      schema: "ccm-task-event-link-v1";
      taskId: string;
      replayEventId?: string;
      scope: "global" | "project" | "group";
      scopeId: string;
      exactSessionId: string;
      anchorMessageId: string;
      generation: number;
      attempt: number;
      planStepId?: string;
      workItemId?: string;
      batchId?: string;
      evidenceIds?: string[];
      contentStored: false;
    };
    causalRefs?: {
      planStepId?: string;
      workItemId?: string;
      dependencyIds?: string[];
      criterionIds?: string[];
      evidenceIds?: string[];
    };
    requirementPlan?: UserVisibleRequirementPlanV1;
    runtimeObservation?: {
      eventType?: string;
      source: "agent_reported" | "runtime_structured" | "system_observed";
      confidence: "declared" | "observed";
      runtime?: string;
      runtimeVersion?: string;
      sourceEventChecksum: string;
      contentStored: false;
    };
    completionSummary?: CcmCompletionSummaryV1;
    terminalGate?: {
      passed: boolean;
      accepted: boolean;
      source: "task_ledger";
      contentStored: false;
    };
  };
  visibility: "default" | "transcript" | "technical";
  contentStored: false;
  createdAt: string;
};

export type UserVisibleAgentAction = {
  id: string;
  kind: "retry" | "resolve_permission" | "view_error" | "recheck" | "takeover";
  label: string;
  enabled: boolean;
  disabledReason?: string;
  revision?: number;
  generation?: number;
  bindingChecksum?: string;
};

export type UserVisibleRequirementPlanStepV1 = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  project?: string;
  files?: string[];
  artifacts?: string[];
  sourceEvidenceIds?: string[];
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "blocked" | "skipped";
};

export type UserVisibleRequirementPlanV1 = {
  schema: "ccm-user-visible-requirement-plan-v1";
  planId: string;
  revision: number;
  title: string;
  goal: string;
  overview?: string;
  steps: UserVisibleRequirementPlanStepV1[];
  scope: string[];
  expectedResults: string[];
  exclusions: string[];
  status: "ready" | "executing" | "completed" | "blocked" | "superseded";
  createdAt: string;
  updatedAt: string;
  planChecksum: string;
  contentStored: false;
  quality?: {
    ok: boolean;
    repaired: boolean;
    issues: string[];
  };
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
const BODY_KEY = /^(?:prompt|systemPrompt|system_prompt|rawPrompt|raw_prompt|body|content|text|output|rawOutput|raw_output|context|sourceCode|source_code|webpage|html|notebookOutput|notebook_output|command|script|shellCommand|shell_command|cmd|env|environment)$/i;
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

function sanitizePromptDescriptor(value: any): CcmInternalPromptDescriptor | null {
  if (!value || typeof value !== "object" || value.schema !== "ccm-internal-prompt-v1" || value.language !== "en" || value.visibility !== "internal_only") return null;
  const promptId = compactText(value.promptId, 160);
  const promptVersion = compactText(value.promptVersion, 80);
  const scope = ["global", "group", "project", "child_agent", "test_agent", "runtime"].includes(String(value.scope)) ? value.scope : "runtime";
  const checksum = compactText(value.checksum, 128);
  if (!promptId || !promptVersion || !checksum || value.contentStored !== false) return null;
  return { schema: "ccm-internal-prompt-v1", promptId, promptVersion, language: "en", scope, visibility: "internal_only", checksum, contentStored: false };
}

function sanitizePromptBindings(value: any): CcmInternalPromptBindings | null {
  if (!value || typeof value !== "object") return null;
  const skills = (Array.isArray(value.skills) ? value.skills : []).map((item: any) => ({
    name: compactText(item?.name, 160),
    ...(item?.version ? { version: compactText(item.version, 80) } : {}),
    checksum: compactText(item?.checksum, 128),
    language: "en" as const,
  })).filter((item: any) => item.name && item.checksum);
  const mcp = (Array.isArray(value.mcp) ? value.mcp : []).map((item: any) => ({
    name: compactText(item?.name, 160),
    ...(item?.version ? { version: compactText(item.version, 80) } : {}),
    checksum: compactText(item?.checksum, 128),
    language: "en" as const,
  })).filter((item: any) => item.name && item.checksum);
  const system = sanitizePromptDescriptor(value.system);
  const developer = sanitizePromptDescriptor(value.developer);
  if (!system && !developer && !skills.length && !mcp.length) return null;
  return { ...(system ? { system } : {}), ...(developer ? { developer } : {}), skills, mcp };
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
  const overview = compactText(value.overview || value.body, 4000);
  const goal = compactText(value.goal || value.summary || value.objective || overview, 1200);
  const steps = (Array.isArray(value.steps) ? value.steps : [])
    .slice(0, 30)
    .map((step: any, index: number) => {
      const stepTitle = compactText(step?.title || step?.label || step?.objective, 240);
      if (!stepTitle) return null;
      return {
        id: compactText(step?.id || `step_${index + 1}`, 100),
        title: stepTitle,
        description: compactText(step?.description || step?.detail || step?.objective, 800),
        outcome: compactText(step?.outcome || step?.expectedResult || step?.expected_result || step?.acceptance?.[0], 800),
        ...(compactText(step?.project || step?.projectName || step?.project_name, 160)
          ? { project: compactText(step?.project || step?.projectName || step?.project_name, 160) } : {}),
        ...(uniqueStrings(step?.files || step?.allowedFiles || step?.allowed_files, 30).length
          ? { files: uniqueStrings(step?.files || step?.allowedFiles || step?.allowed_files, 30).map(item => compactText(item, 500)) } : {}),
        ...(uniqueStrings(step?.artifacts || step?.outputs, 20).length
          ? { artifacts: uniqueStrings(step?.artifacts || step?.outputs, 20).map(item => compactText(item, 300)) } : {}),
        ...(uniqueStrings(step?.sourceEvidenceIds || step?.source_evidence_ids, 30).length
          ? { sourceEvidenceIds: uniqueStrings(step?.sourceEvidenceIds || step?.source_evidence_ids, 30).map(item => compactText(item, 180)) } : {}),
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
    ...(overview ? { overview } : {}),
    steps,
    scope: uniqueStrings(value.scope || value.scopes, 20).map(item => compactText(item, 300)),
    expectedResults: uniqueStrings(value.expectedResults || value.expected_results, 24).map(item => compactText(item, 600)),
    exclusions: uniqueStrings(value.exclusions || value.outOfScope || value.out_of_scope, 20).map(item => compactText(item, 600)),
    status,
    createdAt,
    updatedAt,
    contentStored: false as const,
    ...(value.quality && typeof value.quality === "object" ? {
      quality: {
        ok: value.quality.ok === true,
        repaired: value.quality.repaired === true,
        issues: uniqueStrings(value.quality.issues, 12).map(item => compactText(item, 240)),
      },
    } : {}),
  };
  return { ...projected, planChecksum: hash(projected) };
}

function normalizeScope(value: any): UserVisibleAgentEvent["scope"] {
  const scope = String(value || "").toLowerCase();
  if (scope === "project" || scope === "group") return scope;
  return "global";
}

function sanitizeAvailableActions(value: any): UserVisibleAgentAction[] {
  const allowedKinds = new Set<UserVisibleAgentAction["kind"]>([
    "retry", "resolve_permission", "view_error", "recheck", "takeover",
  ]);
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).slice(0, 8).flatMap((item: any) => {
    const kind = String(item?.kind || "").trim() as UserVisibleAgentAction["kind"];
    const id = compactText(item?.id || kind, 100);
    if (!id || !allowedKinds.has(kind) || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      kind,
      label: compactText(item?.label || ({
        retry: "重试", resolve_permission: "处理授权", view_error: "查看错误",
        recheck: "重新核验", takeover: "人工接管",
      } as Record<string, string>)[kind], 80),
      enabled: item?.enabled !== false,
      ...(compactText(item?.disabledReason || item?.disabled_reason, 240)
        ? { disabledReason: compactText(item?.disabledReason || item?.disabled_reason, 240) } : {}),
      ...(Number.isFinite(Number(item?.revision)) ? { revision: Math.max(0, Number(item.revision)) } : {}),
      ...(Number.isFinite(Number(item?.generation)) ? { generation: Math.max(0, Number(item.generation)) } : {}),
      ...(compactText(item?.bindingChecksum || item?.binding_checksum, 120)
        ? { bindingChecksum: compactText(item?.bindingChecksum || item?.binding_checksum, 120) } : {}),
    }];
  });
}

function explicitFailureActions(input: any): UserVisibleAgentAction[] {
  const source = input?.detail || {};
  const revision = Number(source.revision ?? input?.revision);
  const generation = Number(input?.generation ?? source.generation);
  const bindingChecksum = compactText(source.bindingChecksum || source.binding_checksum || input?.bindingChecksum || input?.binding_checksum, 120);
  const identity = {
    ...(Number.isFinite(revision) ? { revision: Math.max(0, revision) } : {}),
    ...(Number.isFinite(generation) ? { generation: Math.max(0, generation) } : {}),
    ...(bindingChecksum ? { bindingChecksum } : {}),
  };
  if (source.recoveryRequired === true || source.recovery_required === true) return [
    { id: "recheck", kind: "recheck", label: "重新核验", enabled: true, ...identity },
    { id: "takeover", kind: "takeover", label: "人工接管", enabled: true, ...identity },
  ];
  const actions: UserVisibleAgentAction[] = [];
  if (source.authorizationRequired === true || source.authorization_required === true) {
    actions.push({ id: "resolve_permission", kind: "resolve_permission", label: "处理授权", enabled: true, ...identity });
  }
  actions.push({ id: "view_error", kind: "view_error", label: "查看错误", enabled: true, ...identity });
  const sideEffectState = String(source.sideEffectState || source.side_effect_state || "").toLowerCase();
  if ((source.retryable === true || source.safeRetry === true || source.safe_retry === true)
    && ["", "none", "not_started", "safe", "read_only"].includes(sideEffectState)) {
    actions.unshift({ id: "retry", kind: "retry", label: "重试", enabled: true, ...identity });
  }
  return actions;
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
  const safeEvents = store.events.filter(item => projectSafeStoredEvent(item) !== null);
  if (safeEvents.length !== store.events.length) {
    const repaired = {
      ...store,
      events: safeEvents,
      updatedAt: now(),
      checksum: "",
    } as EventStore;
    repaired.checksum = storeChecksum(repaired);
    try { writeJsonAtomic(file, repaired); } catch {}
    return repaired;
  }
  return store;
}

function eventAttempt(event: UserVisibleAgentEvent) {
  const explicit = event?.attempt ?? event?.detail?.replayLink?.attempt;
  const parsed = Number(explicit || 0);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  const match = String(event?.eventId || "").match(/(?:^|:)attempt:(\d+):/i);
  return match?.[1] ? Math.max(1, Number(match[1])) : 0;
}

function readEventStoresForScope(scope: string, scopeId: string) {
  const directory = path.join(STORE_ROOT, scope);
  if (!fs.existsSync(directory)) return [] as EventStore[];
  const stores: EventStore[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const value = JSON.parse(fs.readFileSync(path.join(directory, entry.name), "utf8"));
      if (value?.schema !== "ccm-user-visible-agent-event-store-v1"
        || compactText(value?.scope, 40) !== scope
        || compactText(value?.scopeId, 240) !== scopeId
        || !compactText(value?.exactSessionId, 240)) continue;
      stores.push(readStore(scope, scopeId, compactText(value.exactSessionId, 240)));
    } catch {}
  }
  return stores;
}

function taskEventsAcrossSessions(scope: string, scopeId: string, taskId: string) {
  const byIdentity = new Map<string, UserVisibleAgentEvent>();
  for (const store of readEventStoresForScope(scope, scopeId)) {
    for (const stored of store.events) {
      if (compactText(stored?.taskId, 240) !== taskId) continue;
      const safe = projectSafeStoredEvent(stored);
      if (!safe) continue;
      byIdentity.set(`${safe.exactSessionId}:${safe.eventId}`, safe);
    }
  }
  return [...byIdentity.values()].sort((left, right) => {
    const timeDelta = Date.parse(String(left.createdAt || "")) - Date.parse(String(right.createdAt || ""));
    if (Number.isFinite(timeDelta) && timeDelta) return timeDelta;
    return Number(left.sequence || 0) - Number(right.sequence || 0);
  });
}

function attemptStatus(value: any): CcmAttemptReplayProjectionV1["status"] {
  const status = String(value || "running").toLowerCase();
  if (status === "success" || status === "completed" || status === "accepted") return "success";
  if (status === "blocked") return "blocked";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "interrupted") return "interrupted";
  if (status === "failed" || status === "error" || status === "rejected") return "failed";
  return "running";
}

function attemptTerminalReason(events: UserVisibleAgentEvent[]) {
  const terminal = [...events].reverse().find(event => event.eventType === "result" || ["failed", "waiting"].includes(String(event.display?.status || "")));
  const completion = terminal?.detail?.completionSummary || terminal?.detail?.safeResult?.completionSummary;
  return compactText(completion?.detail || completion?.headline || terminal?.display?.summary, 500);
}

function attemptStoppedStage(events: UserVisibleAgentEvent[]) {
  const event = [...events].reverse().find(item => compactText(item?.detail?.executionStage?.kind, 80));
  return compactText(event?.detail?.executionStage?.kind, 80);
}

function taskAttemptRows(taskId: string, scope: string, scopeId: string) {
  return withSqliteTaskStore(db => db.prepare(`
    SELECT s.exact_session_id, s.scope, s.scope_id, a.attempt, a.status,
           a.start_sequence, a.end_sequence, a.created_at, a.updated_at,
           start_event.created_at AS started_at,
           end_event.created_at AS ended_at,
           COALESCE(end_event.generation, start_event.generation, 0) AS generation
      FROM task_attempt_spans a
      JOIN task_timeline_spans s ON s.span_id = a.span_id
 LEFT JOIN session_timeline_events start_event
        ON start_event.scope = s.scope AND start_event.scope_id = s.scope_id
       AND start_event.exact_session_id = s.exact_session_id AND start_event.sequence = a.start_sequence
 LEFT JOIN session_timeline_events end_event
        ON end_event.scope = s.scope AND end_event.scope_id = s.scope_id
       AND end_event.exact_session_id = s.exact_session_id AND end_event.sequence = a.end_sequence
     WHERE s.task_id = ? AND s.scope = ? AND s.scope_id = ?
  ORDER BY a.attempt ASC, a.start_sequence ASC
  `).all(taskId, scope, scopeId) as any[]);
}

export function listTaskAttemptReplayProjections(filter: any) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  const taskId = compactText(filter?.taskId || filter?.task_id, 240);
  if (!scopeId || !exactSessionId || !taskId) throw new Error("查询历史执行必须指定scope、scopeId、exactSessionId和taskId");
  const allTaskEvents = taskEventsAcrossSessions(scope, scopeId, taskId);
  const timelineRows = taskAttemptRows(taskId, scope, scopeId);
  const sessionBound = timelineRows.some(row => compactText(row?.exact_session_id, 240) === exactSessionId)
    || allTaskEvents.some(event => event.exactSessionId === exactSessionId);
  if (!sessionBound) throw new Error("任务不属于当前精确会话或其恢复链路");
  const attemptNumbers = new Set<number>();
  for (const row of timelineRows) if (Number(row?.attempt || 0) > 0) attemptNumbers.add(Number(row.attempt));
  for (const event of allTaskEvents) if (eventAttempt(event) > 0) attemptNumbers.add(eventAttempt(event));
  const attempts = [...attemptNumbers].sort((left, right) => left - right).map(attempt => {
    const rows = timelineRows.filter(row => Number(row?.attempt || 0) === attempt);
    const events = allTaskEvents.filter(event => eventAttempt(event) === attempt);
    const lastRow = rows.at(-1);
    const status = attemptStatus(lastRow?.status || [...events].reverse().find(event => event.eventType === "result")?.display?.status);
    const startedAt = compactText(lastRow?.started_at || lastRow?.created_at || events[0]?.createdAt, 40);
    const endedAt = status === "running" ? "" : compactText(lastRow?.ended_at || lastRow?.updated_at || events.at(-1)?.createdAt, 40);
    const startedMs = Date.parse(startedAt);
    const endedMs = Date.parse(endedAt);
    const tools = new Set(events.filter(event => String(event.eventType || "").startsWith("tool_"))
      .map(event => compactText(event.toolCallId || event.eventId, 240)).filter(Boolean));
    const files = new Set(events.flatMap(event => Array.isArray(event.detail?.fileChanges) ? event.detail!.fileChanges! : [])
      .map((file: any) => compactText(file?.path || file?.file || file?.name || file, 500)).filter(Boolean));
    const verification = new Set(events.filter(event => {
      const stage = compactText(event?.detail?.executionStage?.kind, 80);
      return stage === "independent_verification" || /test.?agent|验证|验收/i.test(`${event.display?.title || ""} ${event.display?.summary || ""}`);
    }).map(event => event.eventId));
    return {
      schema: "ccm-attempt-replay-projection-v1",
      taskId,
      attempt,
      generation: Math.max(Number(lastRow?.generation || 0), ...events.map(event => Number(event.generation || 0)), 0),
      status,
      ...(compactText(lastRow?.exact_session_id, 240) ? { exactSessionId: compactText(lastRow.exact_session_id, 240) } : {}),
      ...(startedAt ? { startedAt } : {}),
      ...(endedAt ? { endedAt } : {}),
      ...(Number.isFinite(startedMs) && Number.isFinite(endedMs) && endedMs >= startedMs ? { durationMs: endedMs - startedMs } : {}),
      ...(attemptStoppedStage(events) ? { stoppedStage: attemptStoppedStage(events) } : {}),
      ...(attemptTerminalReason(events) ? { terminalReason: attemptTerminalReason(events) } : {}),
      counts: { events: events.length, tools: tools.size, files: files.size, verification: verification.size },
      contentStored: false,
    } satisfies CcmAttemptReplayProjectionV1;
  });
  return { schema: "ccm-attempt-replay-list-v1", taskId, attempts, contentStored: false };
}

export function listUserVisibleAgentEventsForTaskAttempt(filter: any) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  const taskId = compactText(filter?.taskId || filter?.task_id, 240);
  const attempt = Math.max(1, Number(filter?.attempt || 1));
  const cursor = Math.max(0, Number(filter?.cursor || filter?.after || 0));
  const limit = Math.max(1, Math.min(500, Number(filter?.limit || 200)));
  const projection = listTaskAttemptReplayProjections({ scope, scopeId, exactSessionId, taskId });
  if (!projection.attempts.some(item => item.attempt === attempt)) {
    return { schema: "ccm-user-visible-agent-event-list-v1", events: [], nextCursor: cursor, hasMore: false, contentStored: false };
  }
  const source = taskEventsAcrossSessions(scope, scopeId, taskId).filter(event => eventAttempt(event) === attempt);
  const events = source.slice(cursor, cursor + limit);
  const nextCursor = cursor + events.length;
  return { schema: "ccm-user-visible-agent-event-list-v1", events, nextCursor, hasMore: nextCursor < source.length, contentStored: false };
}

function toolPresentation(toolNameInput: any, args: any = {}) {
  const display = buildToolDisplayDetail({ toolName: toolNameInput, arguments: args });
  return { title: display.tool.userLabel || display.tool.label, target: display.tool.target || "" };
}

function normalizeEventType(input: any): UserVisibleAgentEventType {
  const source = String(input || "").toLowerCase();
  if ([
    "turn_started", "thinking_status", "assistant_text_delta", "assistant_progress", "model_activity", "requirement_plan",
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
  const terminalGateSource = detailSource?.terminalGate
    || detailSource?.terminal_gate
    || input?.terminalGate
    || input?.terminal_gate
    || input?.result?.terminalGate
    || input?.result?.terminal_gate;
  const terminalGate = terminalGateSource && typeof terminalGateSource === "object"
    && (typeof terminalGateSource.passed === "boolean" || typeof terminalGateSource.accepted === "boolean")
    ? {
      passed: terminalGateSource.passed === true,
      accepted: terminalGateSource.accepted === true,
      source: "task_ledger" as const,
      contentStored: false as const,
    }
    : null;
  const taskIdentity = compactText(input?.taskId || input?.task_id, 240);
  const anchorIdentity = compactText(input?.anchorMessageId || input?.anchor_message_id, 240);
  const turnIdentity = compactText(input?.turnId || input?.turn_id || input?.executionTurnId || input?.execution_turn_id, 240);
  const responseIdentity = compactText(input?.responseMessageId || input?.response_message_id, 240);
  const workItemIdentity = compactText(input?.workItemId || input?.work_item_id || detailSource?.causalRefs?.workItemId || detailSource?.causal_refs?.work_item_id, 240);
  const planStepIdentity = compactText(detailSource?.causalRefs?.planStepId || detailSource?.causal_refs?.plan_step_id || input?.planStepId || input?.plan_step_id, 160);
  const batchIdentity = compactText(detailSource?.progress?.batchId || detailSource?.progress?.batch_id || detailSource?.replayLink?.batchId || detailSource?.replay_link?.batch_id, 160);
  const causalEvidenceIds = uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids, 64);
  const dependencyIds = uniqueStrings(detailSource?.causalRefs?.dependencyIds || detailSource?.causal_refs?.dependency_ids || input?.dependencyIds || input?.dependency_ids, 40);
  const criterionIds = uniqueStrings(detailSource?.causalRefs?.criterionIds || detailSource?.causal_refs?.criterion_ids || input?.criterionIds || input?.criterion_ids, 40);
  const eventAttempt = Math.max(1, Number(detailSource?.agentDisplay?.attempt || detailSource?.executionStage?.attempt || input?.attempt || 1));
  const suppliedAttempt = Number(input?.attempt ?? input?.executionAttempt ?? input?.execution_attempt);
  const detail: UserVisibleAgentEvent["detail"] = {
    ...(Number(detailSource.toolContractVersion || detailSource.tool_contract_version || input?.toolContractVersion || input?.tool_contract_version) === 3
      ? { toolContractVersion: 3 as const } : {}),
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
      && ["preparation", "coordination_dispatch", "project_execution", "independent_verification", "main_agent_summary"].includes(String(detailSource.executionStage.kind)) ? {
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
    ...(detailSource.fileReadEvidence && typeof detailSource.fileReadEvidence === "object"
      && ["structured_tool", "safe_command_inference"].includes(String(detailSource.fileReadEvidence.source))
      && compactText(detailSource.fileReadEvidence.path, 500) ? {
      fileReadEvidence: {
        project: compactText(detailSource.fileReadEvidence.project, 240),
        path: compactText(detailSource.fileReadEvidence.path, 500).replace(/\\/g, "/"),
        ranges: (Array.isArray(detailSource.fileReadEvidence.ranges) ? detailSource.fileReadEvidence.ranges : [])
          .slice(0, 20).map((range: any) => ({
            start: Math.max(1, Number(range?.start || 1)),
            end: Math.max(Math.max(1, Number(range?.start || 1)), Number(range?.end || range?.start || 1)),
          })),
        ...(compactText(detailSource.fileReadEvidence.checksum, 160) ? { checksum: compactText(detailSource.fileReadEvidence.checksum, 160) } : {}),
        source: detailSource.fileReadEvidence.source,
        contentStored: false,
      },
    } : {}),
    ...(detailSource.timing && typeof detailSource.timing === "object" ? {
      timing: sanitizeUserVisibleAgentDetail({
        totalMs: Math.max(0, Number(detailSource.timing.totalMs || 0)),
        ...(Number.isFinite(Number(detailSource.timing.modelMs)) ? { modelMs: Math.max(0, Number(detailSource.timing.modelMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.toolWallMs)) ? { toolWallMs: Math.max(0, Number(detailSource.timing.toolWallMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.dependencyWaitMs)) ? { dependencyWaitMs: Math.max(0, Number(detailSource.timing.dependencyWaitMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.queueWaitMs)) ? { queueWaitMs: Math.max(0, Number(detailSource.timing.queueWaitMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.otherMs)) ? { otherMs: Math.max(0, Number(detailSource.timing.otherMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.projectAgentWallMs)) ? { projectAgentWallMs: Math.max(0, Number(detailSource.timing.projectAgentWallMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.verificationMs)) ? { verificationMs: Math.max(0, Number(detailSource.timing.verificationMs)) } : {}),
        ...(Number.isFinite(Number(detailSource.timing.summaryMs)) ? { summaryMs: Math.max(0, Number(detailSource.timing.summaryMs)) } : {}),
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
        batchId: compactText(detailSource.progress.batchId || detailSource.progress.batch_id, 120),
        milestoneChecksum: compactText(detailSource.progress.milestoneChecksum || detailSource.progress.milestone_checksum, 80),
        ...(["agent_reported", "runtime_structured", "system_observed"].includes(String(detailSource.progress.source))
          ? { source: String(detailSource.progress.source) as "agent_reported" | "runtime_structured" | "system_observed" } : {}),
        ...(["declared", "observed"].includes(String(detailSource.progress.confidence))
          ? { confidence: String(detailSource.progress.confidence) as "declared" | "observed" } : {}),
        ...(compactText(detailSource.progress.sourceEventChecksum || detailSource.progress.source_event_checksum, 80)
          ? { sourceEventChecksum: compactText(detailSource.progress.sourceEventChecksum || detailSource.progress.source_event_checksum, 80) } : {}),
      },
    } : {}),
    ...(detailSource.modelActivity && typeof detailSource.modelActivity === "object"
      && ["started", "waiting", "retrying", "streaming", "completed", "failed"].includes(String(detailSource.modelActivity.state))
      && ["understanding", "tool_decision", "tool_result_review", "verification", "final_synthesis"].includes(String(detailSource.modelActivity.phase)) ? {
      modelActivity: {
        state: String(detailSource.modelActivity.state) as "started" | "waiting" | "retrying" | "streaming" | "completed" | "failed",
        phase: String(detailSource.modelActivity.phase) as "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis",
        modelCallIndex: Math.max(1, Number(detailSource.modelActivity.modelCallIndex || 1)),
        ...(Number(detailSource.modelActivity.retryAttempt) > 0 ? { retryAttempt: Math.max(1, Number(detailSource.modelActivity.retryAttempt)) } : {}),
        startedAt: compactText(detailSource.modelActivity.startedAt, 40),
        ...(compactText(detailSource.modelActivity.firstDeltaAt, 40) ? { firstDeltaAt: compactText(detailSource.modelActivity.firstDeltaAt, 40) } : {}),
        safeLabel: compactText(detailSource.modelActivity.safeLabel, 120),
        contentStored: false as const,
      },
    } : {}),
    ...(detailSource.keyProgress && typeof detailSource.keyProgress === "object"
      && String(detailSource.keyProgress.schema || "ccm-agent-key-progress-v1") === "ccm-agent-key-progress-v1"
      && ["model_preamble", "phase_update", "tool_batch_started", "tool_batch_completed", "model_key_summary", "child_agent_update", "verification_update"].includes(String(detailSource.keyProgress.kind))
      && ["model_stream", "deterministic", "summary_model", "child_agent"].includes(String(detailSource.keyProgress.source)) ? {
      keyProgress: {
        schema: "ccm-agent-key-progress-v1" as const,
        eventId: compactText(detailSource.keyProgress.eventId || input?.eventId || input?.event_id, 240),
        kind: String(detailSource.keyProgress.kind) as UserVisibleAgentEvent["detail"]["keyProgress"]["kind"],
        source: String(detailSource.keyProgress.source) as UserVisibleAgentEvent["detail"]["keyProgress"]["source"],
        status: ["running", "success", "failed", "waiting"].includes(String(detailSource.keyProgress.status))
          ? String(detailSource.keyProgress.status) as UserVisibleAgentEvent["detail"]["keyProgress"]["status"]
          : "running",
        round: Math.max(0, Number(detailSource.keyProgress.round || 0)),
        text: sanitizeAssistantProgressText(detailSource.keyProgress.text || detailSource.progress?.text || "", 240),
        modelCallIndex: Math.max(0, Number(detailSource.keyProgress.modelCallIndex || 0)),
        toolCallIds: uniqueStrings(detailSource.keyProgress.toolCallIds || detailSource.keyProgress.tool_call_ids, 64),
        relatedEventIds: uniqueStrings(detailSource.keyProgress.relatedEventIds || detailSource.keyProgress.related_event_ids, 64),
        contentStored: false as const,
      },
    } : {}),
    ...(sanitizePromptBindings(detailSource.promptBindings || detailSource.prompt_bindings)
      ? { promptBindings: sanitizePromptBindings(detailSource.promptBindings || detailSource.prompt_bindings)! }
      : {}),
    ...(detailSource.liveProgress && typeof detailSource.liveProgress === "object"
      && ["starting", "running", "testing", "building", "finishing", "retrying"].includes(String(detailSource.liveProgress.phase))
      && compactText(detailSource.liveProgress.safeSummary, 160) ? {
      liveProgress: {
        phase: String(detailSource.liveProgress.phase) as "starting" | "running" | "testing" | "building" | "finishing" | "retrying",
        safeSummary: compactText(detailSource.liveProgress.safeSummary, 160),
        ...(Number.isFinite(Number(detailSource.liveProgress.completed)) ? { completed: Math.max(0, Number(detailSource.liveProgress.completed)) } : {}),
        ...(Number.isFinite(Number(detailSource.liveProgress.total)) ? { total: Math.max(0, Number(detailSource.liveProgress.total)) } : {}),
        updatedAt: compactText(detailSource.liveProgress.updatedAt, 40) || now(),
        contentStored: false as const,
      },
    } : {}),
    ...(detailSource.stream && typeof detailSource.stream === "object" ? {
      stream: {
        sequence: Math.max(0, Number(detailSource.stream.sequence || 0)),
        final: detailSource.stream.final === true,
        ...(compactText(detailSource.stream.checksum, 80) ? { checksum: compactText(detailSource.stream.checksum, 80) } : {}),
      },
    } : {}),
    ...(sanitizeAvailableActions(detailSource.availableActions || detailSource.available_actions).length
      ? { availableActions: sanitizeAvailableActions(detailSource.availableActions || detailSource.available_actions) }
      : {}),
    ...(taskIdentity && anchorIdentity ? { replayLink: {
      schema: "ccm-task-event-link-v1" as const,
      taskId: taskIdentity,
      ...(compactText(input?.eventId || input?.event_id, 240) ? { replayEventId: compactText(input?.eventId || input?.event_id, 240) } : {}),
      scope,
      scopeId,
      exactSessionId,
      anchorMessageId: anchorIdentity,
      generation: Math.max(0, Number(input?.generation || 0)),
      attempt: eventAttempt,
      ...(planStepIdentity ? { planStepId: planStepIdentity } : {}),
      ...(workItemIdentity ? { workItemId: workItemIdentity } : {}),
      ...(batchIdentity ? { batchId: batchIdentity } : {}),
      ...(causalEvidenceIds.length ? { evidenceIds: causalEvidenceIds } : {}),
      contentStored: false as const,
    } } : {}),
    ...((planStepIdentity || workItemIdentity || dependencyIds.length || criterionIds.length || causalEvidenceIds.length) ? { causalRefs: {
      ...(planStepIdentity ? { planStepId: planStepIdentity } : {}),
      ...(workItemIdentity ? { workItemId: workItemIdentity } : {}),
      ...(dependencyIds.length ? { dependencyIds } : {}),
      ...(criterionIds.length ? { criterionIds } : {}),
      ...(causalEvidenceIds.length ? { evidenceIds: causalEvidenceIds } : {}),
    } } : {}),
    ...(sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan)
      ? { requirementPlan: sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan)! }
      : {}),
    ...(detailSource.runtimeObservation && typeof detailSource.runtimeObservation === "object"
      && ["agent_reported", "runtime_structured", "system_observed"].includes(String(detailSource.runtimeObservation.source))
      && ["declared", "observed"].includes(String(detailSource.runtimeObservation.confidence))
      && compactText(detailSource.runtimeObservation.sourceEventChecksum, 80) ? {
      runtimeObservation: {
        ...(compactText(detailSource.runtimeObservation.eventType, 80) ? { eventType: compactText(detailSource.runtimeObservation.eventType, 80) } : {}),
        source: detailSource.runtimeObservation.source,
        confidence: detailSource.runtimeObservation.confidence,
        ...(compactText(detailSource.runtimeObservation.runtime, 80) ? { runtime: compactText(detailSource.runtimeObservation.runtime, 80) } : {}),
        ...(compactText(detailSource.runtimeObservation.runtimeVersion, 120) ? { runtimeVersion: compactText(detailSource.runtimeObservation.runtimeVersion, 120) } : {}),
        sourceEventChecksum: compactText(detailSource.runtimeObservation.sourceEventChecksum, 80),
        contentStored: false,
      },
    } : {}),
    ...(detailSource.completionSummary || input?.completionSummary || input?.result?.completionSummary || input?.result?.completion_summary
      ? { completionSummary: buildCcmCompletionSummary({
        ...(detailSource.completionSummary || input?.completionSummary || input?.result?.completionSummary || input?.result?.completion_summary),
        ...(terminalGate ? { terminalGate } : {}),
      }) }
      : {}),
    ...(terminalGate ? { terminalGate } : {}),
  };
  const stableIdentity = {
    scope, scopeId, exactSessionId, generation: Math.max(0, Number(input?.generation || 0)),
    taskId: input?.taskId || input?.task_id || "", workItemId: input?.workItemId || input?.work_item_id || "",
    toolCallId: input?.toolCallId || input?.tool_call_id || "", eventType, createdAt,
  };
  const normalizedEventId = compactText(input?.eventId || input?.event_id, 240) || `uve_${hash(stableIdentity).slice(0, 28)}`;
  if (/^agent_(?:started|progress|completed|failed)$/.test(eventType) && !detail.keyProgress) {
    const childText = sanitizeAssistantProgressText(
      detail.liveProgress?.safeSummary || display.summary || display.title,
      240,
    );
    if (childText) {
      detail.keyProgress = {
        schema: "ccm-agent-key-progress-v1",
        eventId: normalizedEventId,
        kind: "child_agent_update",
        source: "child_agent",
        status: status === "success" ? "success" : status === "failed" ? "failed" : status === "waiting" ? "waiting" : "running",
        round: Math.max(0, eventAttempt - 1),
        text: childText,
        modelCallIndex: 0,
        toolCallIds: [],
        relatedEventIds: [],
        contentStored: false,
      };
    }
  }
  return {
    schema: USER_VISIBLE_AGENT_EVENT_SCHEMA,
    eventId: normalizedEventId,
    sequence: Math.max(0, Number((input?.sequence ?? sequence) || 0)),
    eventType,
    scope,
    scopeId,
    exactSessionId,
    generation: Math.max(0, Number(input?.generation || 0)),
    ...(compactText(input?.anchorMessageId || input?.anchor_message_id, 240)
      ? { anchorMessageId: compactText(input?.anchorMessageId || input?.anchor_message_id, 240) } : {}),
    ...(compactText(input?.originMessageId || input?.origin_message_id, 240)
      ? { originMessageId: compactText(input?.originMessageId || input?.origin_message_id, 240) } : {}),
    ...(turnIdentity ? { turnId: turnIdentity } : {}),
    ...(Number.isFinite(suppliedAttempt) && suppliedAttempt > 0 ? { attempt: Math.max(1, Math.floor(suppliedAttempt)) } : {}),
    ...(responseIdentity ? { responseMessageId: responseIdentity } : {}),
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

function sameVisibleEventLane(item: UserVisibleAgentEvent, next: UserVisibleAgentEvent) {
  if (Number(item.generation || 0) !== Number(next.generation || 0)) return false;
  const itemAttempt = Number(item.attempt || item.detail?.executionStage?.attempt || item.detail?.agentDisplay?.attempt || 0);
  const nextAttempt = Number(next.attempt || next.detail?.executionStage?.attempt || next.detail?.agentDisplay?.attempt || 0);
  if ((itemAttempt || nextAttempt) && itemAttempt !== nextAttempt) return false;
  const nextTask = compactText(next.taskId, 240);
  const itemTask = compactText(item.taskId, 240);
  return nextTask ? itemTask === nextTask : !itemTask;
}

function shouldDropLateAssistantProgress(store: { events: UserVisibleAgentEvent[] }, next: UserVisibleAgentEvent) {
  if (next.eventType !== "assistant_progress") return false;
  const lastTurnStart = [...store.events].reverse().find(item => item.eventType === "turn_started" && sameVisibleEventLane(item, next));
  const lastResult = [...store.events].reverse().find(item => item.eventType === "result" && sameVisibleEventLane(item, next));
  return !!(lastResult && (!lastTurnStart || Number(lastResult.sequence || 0) >= Number(lastTurnStart.sequence || 0)));
}

export function appendUserVisibleAgentEvent(input: any) {
  const initial = normalizeUserVisibleAgentEvent(input);
  const file = eventStoreFile(initial.scope, initial.scopeId, initial.exactSessionId);
  let event = initial;
  let appended = false;
  withFileLock(file, () => {
    const store = readStore(initial.scope, initial.scopeId, initial.exactSessionId);
    if (shouldDropLateAssistantProgress(store, initial)) return;
    const existingIndex = store.events.findIndex(item => item.eventId === initial.eventId);
    const existing = existingIndex >= 0 ? store.events[existingIndex] : null;
    if (existing) {
      const lifecycleRank = (value: string) => value === "tool_started" ? 1 : ["tool_completed", "tool_failed"].includes(value) ? 2 : 0;
      if (initial.toolCallId && existing.toolCallId === initial.toolCallId
        && lifecycleRank(initial.eventType) > lifecycleRank(existing.eventType)) {
        event = { ...initial, sequence: existing.sequence, createdAt: existing.createdAt || initial.createdAt };
        store.events[existingIndex] = event;
        store.revision = Math.max(store.revision, ...store.events.map(item => item.sequence), 0) + 1;
        store.updatedAt = now();
        store.checksum = storeChecksum(store);
        writeJsonAtomic(file, store);
        appended = true;
        return;
      }
      event = existing;
      return;
    }
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
  const turnIdentity = compactText(input?.turnId || input?.turn_id || input?.taskId || input?.task_id || "turn", 120);
  const batchId = compactText(input?.batchId || input?.batch_id, 120) || assistantProgressBatchId({
    turnId: turnIdentity,
    generation: input?.generation,
    modelCallIndex,
    kind,
    relatedToolCallIds,
  });
  const milestoneChecksum = assistantProgressMilestoneChecksum({ kind, text, modelCallIndex, relatedToolCallIds, batchId });
  const repeatableKind = kind === "before_tools" || kind === "key_finding";
  const semanticFingerprint = hash({
    kind,
    text: text.toLowerCase(),
    generation: Math.max(0, Number(input?.generation || 0)),
    attempt: Math.max(1, Number(input?.attempt || input?.detail?.technical?.attempt || 1)),
    target: compactText(input?.businessTarget || input?.target || input?.display?.target, 120).toLowerCase(),
    stage: compactText(input?.detail?.executionStage?.kind, 80).toLowerCase(),
  }).slice(0, 16);
  const eventId = compactText(input?.eventId || input?.event_id, 240)
    || `assistant-progress:${turnIdentity}:${repeatableKind ? `${kind}:${semanticFingerprint}` : `${modelCallIndex}:${milestoneChecksum.slice(0, 20)}`}`;
  const legacyKindToKeyKind: Record<string, string> = {
    before_tools: "model_preamble",
    verification: "verification_update",
    rework: "child_agent_update",
    direction_change: "child_agent_update",
    before_summary: "model_key_summary",
    key_finding: "phase_update",
    blocker: "verification_update",
  };
  const existingKeyProgress = input?.detail?.keyProgress;
  const keyProgress = existingKeyProgress && existingKeyProgress.schema === "ccm-agent-key-progress-v1"
    ? { ...existingKeyProgress, eventId: compactText(existingKeyProgress.eventId || eventId, 240) }
    : {
      schema: "ccm-agent-key-progress-v1",
      eventId,
      kind: legacyKindToKeyKind[kind] || "phase_update",
      source: "deterministic",
      status: input?.display?.status || "running",
      round: Math.max(0, Number(input?.round || 0)),
      text: text.slice(0, 240),
      modelCallIndex,
      toolCallIds: relatedToolCallIds,
      relatedEventIds: [],
      contentStored: false,
    };
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
      progress: { kind, text, modelCallIndex, relatedToolCallIds, batchId, milestoneChecksum },
      keyProgress,
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

function projectSafeStoredEvent(event: UserVisibleAgentEvent | null) {
  if (!event) return event;
  if (event.eventType === "tool_completed" && /(?:^|__)read_files$/i.test(String(event.toolName || ""))) {
    const paths = event.detail?.safeArguments?.paths;
    const requestedCount = Array.isArray(paths) ? paths.length : 0;
    const currentTotal = Number(event.detail?.toolDisplay?.result?.total || 0);
    if (requestedCount > 0 && currentTotal === 0 && /已读取\s*0\s*个文件/.test(String(event.display?.summary || ""))) {
      const summary = `已读取 ${requestedCount} 个文件`;
      return {
        ...event,
        display: { ...event.display, summary },
        detail: {
          ...(event.detail || {}),
          toolDisplay: event.detail?.toolDisplay ? {
            ...event.detail.toolDisplay,
            result: { ...event.detail.toolDisplay.result, summary, total: requestedCount },
          } : event.detail?.toolDisplay,
        },
      } as UserVisibleAgentEvent;
    }
  }
  if (event.eventType !== "assistant_progress") return event;
  const progress = event.detail?.progress;
  const safeText = sanitizeAssistantProgressText(progress?.text || event.display?.summary || "", 600);
  if (!safeText) return null;
  if (safeText === progress?.text && safeText === event.display?.summary) return event;
  return {
    ...event,
    display: { ...event.display, summary: safeText },
    detail: {
      ...(event.detail || {}),
      progress: progress ? { ...progress, text: safeText } : progress,
    },
  } as UserVisibleAgentEvent;
}

export function listUserVisibleAgentEvents(filter: any) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  if (!scopeId || !exactSessionId) throw new Error("查询执行记录必须指定scope、scopeId和exactSessionId");
  const cursor = Math.max(0, Number(filter?.cursor || filter?.after || 0));
  const limit = Math.max(1, Math.min(500, Number(filter?.limit || 200)));
  const store = readStore(scope, scopeId, exactSessionId);
  const scanned = store.events.filter(item => item.sequence > cursor).slice(0, limit);
  const rows = scanned
    .map(projectSafeStoredEvent)
    .filter(Boolean) as UserVisibleAgentEvent[];
  const nextCursor = scanned.at(-1)?.sequence || cursor;
  return {
    schema: "ccm-user-visible-agent-event-list-v1",
    events: rows,
    nextCursor,
    hasMore: store.events.some(item => item.sequence > nextCursor),
    contentStored: false,
  };
}

export function getUserVisibleAgentEvent(filter: any, eventId: string) {
  const scope = normalizeScope(filter?.scope);
  const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
  const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
  if (!scopeId || !exactSessionId) throw new Error("查询工具详情必须指定scope、scopeId和exactSessionId");
  return projectSafeStoredEvent(readStore(scope, scopeId, exactSessionId).events.find(item => item.eventId === compactText(eventId, 240)) || null);
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
  const source = input?.source === "terminal_gate" || input?.terminalGate || input?.terminal_gate
    ? "terminal_gate"
    : "query_projection";
  const completionSummary = buildCcmCompletionSummary({
    ...input,
    source,
    terminalGate: input?.terminalGate || input?.terminal_gate,
    fileChanges: input?.fileChanges || input?.file_changes || input?.filesChanged || input?.files_changed,
    verification: input?.verification || input?.verificationResults || input?.verification_results,
    blockers: input?.blockers || input?.unfinished || input?.incomplete,
  });
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
    completionSummary,
    contentStored: false,
  };
}

export function appendToolProjection(input: any) {
  const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
  const args = input?.arguments || input?.args || input?.detail?.safeArguments || {};
  const rawResult = input?.observation ?? input?.result ?? input?.detail?.safeResult;
  const safeEventArguments = Object.fromEntries(Object.entries(args && typeof args === "object" ? args : {}).map(([key, value]) => {
    if (!/^(?:command|cmd|script|shellCommand|shell_command|content|text|body|old_text|new_text|replacement|file_data)$/i.test(key)) return [key, value];
    return [key, {
      hidden: true,
      checksum: crypto.createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 16),
    }];
  }));
  const toolDisplay = buildToolDisplayDetail({ toolName, arguments: args, result: rawResult, error: input?.error, includeTechnicalCommand: true });
  const eventType = normalizeEventType(input?.error ? "tool_failed" : input?.eventType || input?.type);
  const terminal = eventType === "tool_completed" || eventType === "tool_failed";
  const explicitTokens = Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens
    ?? rawResult?.outputTokens ?? rawResult?.output_tokens);
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
    : input?.scope === "global" && /dispatch|skill.?fork|orchestrat/i.test(String(toolName))
      ? "coordination_dispatch"
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
      ...((input?.toolContractVersion === 3 || input?.detail?.toolContractVersion === 3 || rawResult?.toolContractVersion === 3 || isWorkspaceReadonlyToolName(toolName))
        ? { toolContractVersion: 3 as const } : {}),
      ...((eventType === "tool_failed" || eventType === "agent_failed") ? {
        availableActions: sanitizeAvailableActions(input?.detail?.availableActions || input?.detail?.available_actions).length
          ? sanitizeAvailableActions(input?.detail?.availableActions || input?.detail?.available_actions)
          : explicitFailureActions(input),
      } : {}),
      executionStage: input?.detail?.executionStage || {
        kind: stageKind,
        stageRunId: `tool:${String(input?.toolCallId || input?.tool_call_id || toolName)}`,
        attempt: Math.max(1, Number(input?.attempt || 1)),
        startedAt,
        ...(completedAt ? { completedAt } : {}),
        ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
      },
      safeArguments: safeEventArguments,
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
  const linked = normalizeUserVisibleAgentEvent({
    scope: "group", scopeId: "group-1", exactSessionId: "session-2", anchorMessageId: "message-1",
    taskId: "task-1", workItemId: "work-1", generation: 3, attempt: 2, eventType: "agent_progress",
    detail: { progress: { kind: "key_finding", text: "完成接口定位", modelCallIndex: 1, relatedToolCallIds: [], batchId: "batch-1", milestoneChecksum: "sum" }, causalRefs: { planStepId: "step-1", dependencyIds: ["dep-1"] } },
  }, 2);
  const longProgress = sanitizeAssistantProgressText(`我会先检查当前项目结构和配置，再定位实际启动入口。${"这是不应继续展示的冗长说明。".repeat(20)}`);
  const protocolProgress = sanitizeAssistantProgressText('{"workflowDecision":{"actionRequired":false},"selectedSkills":[]}');
  const globalDispatch = appendToolProjection({
    scope: "global", scopeId: "global", exactSessionId: "session-global-dispatch", eventId: "global-dispatch-stage",
    eventType: "tool_completed", toolName: "dispatch_project_task", toolCallId: "dispatch-1",
    observation: { success: true, count: 1 },
  });
  const projectDispatch = appendToolProjection({
    scope: "project", scopeId: "demo", exactSessionId: "session-project-dispatch", eventId: "project-dispatch-stage",
    eventType: "tool_completed", toolName: "dispatch_project_task", toolCallId: "dispatch-2",
    observation: { success: true, count: 1 },
  });
  const internalWorkspaceRead = buildToolDisplayDetail({
    toolName: "mcp__ccm__ccm_workspace_readonly__read_file",
    arguments: { path: "README.md" },
  });
  const nativeRuntimeGlob = buildToolDisplayDetail({ toolName: "Glob", arguments: { pattern: "**/*.ts" } });
  const inlineCommand = buildToolDisplayDetail({
    toolName: "run_command",
    arguments: { command: 'powershell -Command "Write-Output SOURCE_COMMAND_SENTINEL"', description: "检查构建" },
    includeTechnicalCommand: true,
  });
  const nestedBatchReceipt = {
    output: JSON.stringify({
      schema: "ccm-workspace-tool-envelope-v3",
      toolContractVersion: 3,
      modelPayload: {
        schema: "ccm-workspace-read-files-result-v3",
        files: [{ path: "README.md", truncated: true, next_cursor: "101", checksum: "readme-sum" }, { path: "package.json", truncated: false }],
        item_count: 2,
        truncated: true,
      },
      safeReceipt: { kind: "text", itemCount: 2, truncated: true, contentStored: false },
      contentStored: false,
    }),
    outputTokens: 1234,
  };
  const nestedBatchDisplay = buildToolDisplayDetail({
    toolName: "mcp__ccm__ccm_workspace_readonly__read_files",
    arguments: { paths: ["README.md", "package.json"] },
    result: nestedBatchReceipt,
  });
  const nestedBatchEvent = appendToolProjection({
    scope: "project", scopeId: "demo", exactSessionId: "session-batch-read", eventId: "batch-read-result",
    eventType: "tool_completed", toolName: "mcp__ccm__ccm_workspace_readonly__read_files", toolCallId: "batch-read-1",
    arguments: { paths: ["README.md", "package.json"] }, observation: nestedBatchReceipt,
  });
  const legacyBatchEvent = projectSafeStoredEvent({
    schema: USER_VISIBLE_AGENT_EVENT_SCHEMA, eventId: "legacy-batch", sequence: 1, eventType: "tool_completed",
    scope: "project", scopeId: "demo", exactSessionId: "legacy-session", generation: 0,
    toolName: "mcp__ccm__ccm_workspace_readonly__read_files",
    display: { title: "批量读取文件", summary: "已读取 0 个文件", status: "success" },
    detail: {
      safeArguments: { paths: ["README.md", "package.json"] },
      toolDisplay: buildToolDisplayDetail({ toolName: "read_files", arguments: { paths: ["README.md", "package.json"] }, result: {} }),
    },
    visibility: "default", contentStored: false, createdAt: new Date().toISOString(),
  } as UserVisibleAgentEvent);
  const checks = {
    schema: event.schema === USER_VISIBLE_AGENT_EVENT_SCHEMA,
    ccLabel: event.display.title === "查找定义",
    secretRedacted: !serialized.includes("SENTINEL"),
    bodyProjected: !serialized.includes("SOURCE_SENTINEL") && serialized.includes("contentChecksum"),
    noContent: event.contentStored === false,
    replayLinkSafe: linked.detail?.replayLink?.schema === "ccm-task-event-link-v1" && linked.detail.replayLink.anchorMessageId === "message-1" && linked.detail.replayLink.attempt === 2 && linked.detail.replayLink.contentStored === false,
    causalRefsSafe: linked.detail?.causalRefs?.planStepId === "step-1" && linked.detail.causalRefs.dependencyIds?.[0] === "dep-1",
    progressLengthBounded: longProgress.length <= 120 && longProgress.split(/[。！？!?]/).filter(Boolean).length <= 2,
    internalProgressRejected: protocolProgress === "",
    globalDispatchStage: globalDispatch.detail?.executionStage?.kind === "coordination_dispatch",
    projectDispatchStage: projectDispatch.detail?.executionStage?.kind === "project_execution",
    workspaceMcpUsesNativeFacade: internalWorkspaceRead.tool.name === "read_file"
      && internalWorkspaceRead.tool.userLabel === "读取文件"
      && internalWorkspaceRead.tool.category === "builtin"
      && !internalWorkspaceRead.tool.serverLabel,
    nativeRuntimeToolLocalized: nativeRuntimeGlob.tool.userLabel === "查找文件"
      && nativeRuntimeGlob.tool.family === "search",
    inlineCommandBodyHidden: !JSON.stringify(inlineCommand).includes("SOURCE_COMMAND_SENTINEL")
      && inlineCommand.sensitiveCommand?.includes("[脚本内容已隐藏]"),
    nestedBatchCountProjected: nestedBatchDisplay.result.total === 2
      && nestedBatchDisplay.result.summary.startsWith("已读取 2 个文件")
      && nestedBatchDisplay.result.truncated === true,
    nestedBatchUsesRuntimeTokenCount: nestedBatchEvent.display.tokenCount === 1234,
    legacyBatchCountRecovered: legacyBatchEvent?.display?.summary === "已读取 2 个文件"
      && legacyBatchEvent?.detail?.toolDisplay?.result?.total === 2,
    nextTurnProgressAfterPreviousResult: (() => {
      const identity = { scope: "project" as const, scopeId: "demo", exactSessionId: "session-next-turn-progress" };
      appendUserVisibleAgentEvent({
        ...identity, eventId: "prev-turn-started", eventType: "turn_started",
        display: { title: "项目主 Agent", summary: "上一轮开始", status: "running" },
      });
      appendUserVisibleAgentEvent({
        ...identity, eventId: "prev-turn-result", eventType: "result",
        display: { title: "回复完成", summary: "上一轮已完成", status: "success" },
      });
      appendUserVisibleAgentEvent({
        ...identity, eventId: "next-turn-started", eventType: "turn_started",
        display: { title: "项目主 Agent", summary: "本轮开始", status: "running" },
      });
      const nextProgress = appendAssistantProgress({
        ...identity, turnId: "next-turn", text: "我先定位相关代码和配置，再根据结果继续判断。",
        kind: "before_tools", modelCallIndex: 1, relatedToolCallIds: ["tool-next"],
      });
      const listed = listUserVisibleAgentEvents({ ...identity, cursor: 0, limit: 20 });
      return nextProgress?.eventType === "assistant_progress"
        && listed.events.some(item => item.eventId === nextProgress.eventId);
    })(),
  };
  return { pass: Object.values(checks).every(Boolean), checks, event };
}
