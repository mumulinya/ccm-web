import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, SESSIONS_DIR } from "../../core/utils";
import { callUnifiedCompactionModel } from "../../system/unified-session-compaction-model";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { resolveMainAgentContextPolicy } from "../../tools/main-agent-context-policy";
import { selectUserMcpToolDefinitions } from "../../system/session-context-tool-buckets";
import { resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import { resolveTrustedModelContextCapacity } from "../collaboration/model-capability-cache";
import { estimateTextTokens } from "../../system/context-budget";
import { normalizeAgentRuntimeId } from "../../agents/runtime";
import {
  buildProjectSessionAgentScopeId,
  getProjectSessionAgentBinding,
  isProjectSessionAgentDispatchActive,
  reopenProjectSessionAgentBinding,
  rotateProjectSessionAgentBinding,
} from "./project-session-agent-binding";
import { resolveContainedPath, validateProjectName, validateSessionId } from "./project-validation";
import {
  buildModelVisiblePayloadSnapshot,
  isModelVisiblePayloadSnapshot,
  modelVisibleFixedTokens,
  modelVisiblePayloadAccounting,
  buildSessionCompactionBoundaryMarker,
  buildSessionMemoryState,
  evaluateSessionMemoryCadence,
  measureSessionContextTokens,
  normalizeSessionProviderUsage,
  recordSessionCompactionFailure,
  resetSessionCompactionFailures,
  runSessionCompactionHooks,
  sessionCompactionCircuitOpen,
  validateSessionMemoryState,
  waitForScheduledSessionMemoryExtraction,
  sessionCompactionChecksum,
  scheduleSessionMemoryExtraction,
} from "../../system/session-compaction-core";
import { buildVerifiedSessionRecoveryContext } from "../../system/session-recovery-context";
import {
  createSessionExecutionEvent,
  eventsAnchoredToMessages,
  findPendingToolCallId,
  mergeConversationWithExecution,
  normalizeSessionExecutionEvents,
} from "../../system/session-execution-ledger";
import { appendSessionTimelineEvent } from "../../tasks/session-task-timeline";
import { readVerifiedSessionTaskIndex } from "../../tasks/session-task-timeline";
import { buildUnifiedSessionModelContextProjection, resolveSessionModelMicroCompactPolicy } from "../../system/session-model-context";
import { buildUnifiedSessionCompactionStateV1, createUnifiedSessionCompactionEngine } from "../../system/unified-session-compaction";
import { createUnifiedScopeAdapter } from "../../system/unified-session-compaction-adapters";
import { buildCcmProviderIdentityChecksum } from "../../system/ccm-context-accounting-v2";
import type { UnifiedCompactionResult } from "../../system/unified-session-compaction-types";
import { unifiedSummaryChecksum } from "../../system/unified-session-compaction-summary";
import { loadProjectConfigs } from "../../core/db";
import { toolManager } from "../../tools/tool-manager";
import {
  buildMainAgentPostCompactRestoreManifest,
  persistMainAgentPostCompactRestoreManifest,
  restoreMainAgentPostCompactContext,
} from "../../system/main-agent-post-compact-continuity";

const MODEL_MAX_OUTPUT_TOKENS = 20_000;
const compactions = new Map<string, { promise: Promise<any>; reason: string; startedAt: string }>();

function projectCompactionSourceChecksum(data: any) {
  return crypto.createHash("sha256").update(JSON.stringify({
    history: (Array.isArray(data?.history) ? data.history : []).map((item: any) => String(item?.id || item?.messageId || "")),
    execution: projectExecutionEvents(data).map((item: any) => String(item?.id || "")),
    generation: Number(data?.unifiedSessionCompaction?.boundaryGeneration || 0),
  })).digest("hex");
}

async function runUnifiedProjectSessionCompaction(project: string, projectSessionId: string, options: any = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(projectSessionId);
  const expectedDispatchScopeId = buildProjectSessionAgentScopeId(safeProject, safeSessionId);
  const ownsActiveDispatch = String(options.activeDispatchScopeId || "") === expectedDispatchScopeId;
  if (isProjectSessionAgentDispatchActive(safeProject, safeSessionId) && !ownsActiveDispatch) {
    throw new Error("当前项目会话仍有第三方 Agent 正在执行，暂不能压缩");
  }
  const file = sessionFile(safeProject, safeSessionId);
  if (!fs.existsSync(file)) throw new Error("项目会话不存在");
  const config = loadOrchestratorConfig();
  const binding = getProjectSessionAgentBinding(safeProject, safeSessionId);
  const modelCapacity = resolveProjectCompactionCapacity(JSON.parse(fs.readFileSync(file, "utf8")), config, binding, {}, options);
  let acquiredChecksum = "";
  const adapter = createProjectSessionCompactionAdapter({
    project: safeProject,
    sessionId: safeSessionId,
    acquire: () => {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      acquiredChecksum = projectCompactionSourceChecksum(data);
      return { scope: "project", exactSessionId: `${safeProject}:${safeSessionId}`, generation: Number(data?.unifiedSessionCompaction?.boundaryGeneration || 0), checksum: acquiredChecksum, acquiredAt: new Date().toISOString() };
    },
    load: () => {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const history = Array.isArray(data.history) ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
      const state = data.unifiedSessionCompaction || {};
      return {
        scope: "project",
        exactSessionId: `${safeProject}:${safeSessionId}`,
        messages: history,
        executionEvents: projectExecutionEvents(data),
        activeSummary: data.unifiedSessionSummary || null,
        previousState: state,
        boundaryGeneration: Number(state.boundaryGeneration || 0),
        compactionFloorIndex: Number(state.summarizedMessageCount || 0),
        recoveryContext: data.unifiedRecoveryContext || { permissionBoundary: safeProject, planBindings: data.plan ? [data.plan] : [], taskBindings: data.taskBindings || [] },
        contextComponents: options.contextComponents || options.context_components || {},
        providerUsage: state.providerUsage || null,
      };
    },
    validate: () => {
      const current = JSON.parse(fs.readFileSync(file, "utf8"));
      if (projectCompactionSourceChecksum(current) !== acquiredChecksum) throw new Error("project_compaction_fence_stale");
      if (isProjectSessionAgentDispatchActive(safeProject, safeSessionId) && !ownsActiveDispatch) throw new Error("project_compaction_dispatch_started");
    },
    commit: (result, fence) => {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (projectCompactionSourceChecksum(data) !== fence.checksum) throw new Error("project_compaction_commit_fence_stale");
      const summary = result.fullCompaction.summary;
      if (!summary || summary.schema !== "ccm-unified-session-summary-v1") throw new Error("project_compaction_summary_missing");
      const preservedIds = result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")).filter(Boolean);
      const summarizedCount = Number(result.preservedRecentWindow.startIndex || 0);
      const previousBinding = getProjectSessionAgentBinding(safeProject, safeSessionId);
      const rotation = rotateProjectSessionAgentBinding(safeProject, safeSessionId, `统一会话压缩 ${result.receipt.checksum.slice(0, 12)}`, ownsActiveDispatch ? expectedDispatchScopeId : "");
      const state = buildUnifiedSessionCompactionStateV1({ receipt: result.receipt, summaryQuality: result.summaryQuality, microCompact: result.microCompact, recoveryContext: result.recoveryContext, triggerReason: options.reason || "automatic", summarizedThroughMessageId: data.history?.[summarizedCount - 1]?.id || "", summarizedMessageCount: summarizedCount, preservedRecentMessageIds: preservedIds });
      try {
        data.unifiedSessionSummary = summary;
        data.unifiedSessionCompaction = state;
        data.unifiedRecoveryContext = result.recoveryContext;
        data.unifiedSessionBoundary = { summarizedMessageCount: summarizedCount, summarizedThroughMessageId: data.history?.[summarizedCount - 1]?.id || "", preservedRecentMessageIds: preservedIds, checksum: result.receipt.checksum };
        data.projectAgentGeneration = rotation.nextGeneration;
        data.updated_at = new Date().toISOString();
        persistSession(safeProject, safeSessionId, data);
      } catch (error) {
        reopenProjectSessionAgentBinding(safeProject, safeSessionId, "统一压缩提交失败，恢复旧世代");
        throw error;
      }
      void previousBinding;
    },
    failure: (error) => {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      data.unifiedSessionCompactionFailure = { code: String((error as any)?.code || "CCM_UNIFIED_COMPACTION_FAILED"), message: String((error as any)?.message || error).slice(0, 300), at: new Date().toISOString(), contentStored: false };
      persistSession(safeProject, safeSessionId, data);
    },
  });
  const modelCall = options.modelCall || ((request: any) => callUnifiedCompactionModel(config, request.system, request.user, request.maxOutputTokens));
  const engine = createUnifiedSessionCompactionEngine({
    adapter,
    config: { ...config, autoCompactThreshold: modelCapacity.autoCompactThreshold },
    force: options.force,
    promptTooLong: options.promptTooLong,
    reason: options.reason,
    customInstructions: options.customInstructions,
    modelCall,
    buildProjection: (snapshot: any) => options.modelVisiblePayload || buildModelVisiblePayloadSnapshot({ scope: "project", sessionId: `${safeProject}:${safeSessionId}`, system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model }, tools: options.tools || null, activeSummary: snapshot.activeSummary, recentMessages: mergeConversationWithExecution(snapshot.messages, snapshot.executionEvents), currentRequest: options.currentRequest || null, recoveryContext: snapshot.recoveryContext, hookResults: [], contextComponents: options.contextComponents || options.context_components || {} }),
    buildPostCompactPayload: ({ summary, preservedTimeline, recoveryContext }: any) => buildModelVisiblePayloadSnapshot({ scope: "project", sessionId: `${safeProject}:${safeSessionId}`, system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model }, tools: options.tools || null, activeSummary: summary, recentMessages: preservedTimeline, currentRequest: options.currentRequest || null, recoveryContext, hookResults: [], contextComponents: options.contextComponents || options.context_components || {} }),
    measure: (payload: any) => Number(payload?.totalTokens || estimateTextTokens(JSON.stringify(payload || {}))),
    qualityReference: () => ({ authorizationBoundaries: [safeProject], fileReferences: [], verificationEvidence: [], pendingWork: [], sourceMessageIds: [] }),
  });
  const result: any = await engine.run();
  const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    compacted: result.compacted,
    reason: result.reason,
    before_tokens: result.receipt.beforeTokens,
    after_tokens: result.receipt.afterTokens,
    summary_source: result.receipt.summarySource,
    boundary_generation: result.boundaryGeneration,
    boundaryGeneration: result.boundaryGeneration,
    boundary: persisted.unifiedSessionBoundary || null,
    receipt: result.receipt,
    unifiedSessionSummary: result.fullCompaction.summary,
    unifiedSessionCompaction: result.receipt,
    model_context_capacity: modelCapacity,
    auto_compact_threshold: modelCapacity.autoCompactThreshold,
    contentStored: false,
  };
}

export function createProjectSessionCompactionAdapter(input: {
  project: string;
  sessionId: string;
  load: () => Promise<any> | any;
  commit: (result: UnifiedCompactionResult, fence: any) => Promise<void> | void;
  acquire?: () => Promise<any> | any;
  failure?: (error: unknown, fence: any) => Promise<void> | void;
  validate?: (fence: any, snapshot: any) => Promise<void> | void;
}) {
  return createUnifiedScopeAdapter({
    load: async () => ({ scope: "project", exactSessionId: `${input.project}:${input.sessionId}`, ...(await input.load()) }),
    acquire: input.acquire,
    commit: input.commit,
    failure: input.failure,
    validate: input.validate,
  });
}

export function getProjectSessionCompactionActivity(project: string, projectSessionId: string) {
  let scopeId = "";
  try { scopeId = buildProjectSessionAgentScopeId(validateProjectName(project), validateSessionId(projectSessionId)); } catch {}
  const active = scopeId ? compactions.get(scopeId) : null;
  return active ? {
    active: true,
    status: "running",
    stage: "model_compaction",
    reason: active.reason,
    startedAt: active.startedAt,
    updatedAt: active.startedAt,
  } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}

function sessionFile(project: string, projectSessionId: string) {
  return resolveContainedPath(path.join(CCM_DIR, "web-sessions"), validateProjectName(project), `${validateSessionId(projectSessionId)}.json`);
}

function findCcSessionFile(project: string) {
  if (!fs.existsSync(SESSIONS_DIR)) return "";
  const escaped = validateProjectName(project).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const files = fs.readdirSync(SESSIONS_DIR).filter(file => new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`).test(file));
  const selected = files.find(file => file !== `${project}.json`) || files[0];
  return selected ? resolveContainedPath(SESSIONS_DIR, selected) : "";
}

function writeAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, file);
}

function persistSession(project: string, projectSessionId: string, value: any) {
  writeAtomic(sessionFile(project, projectSessionId), value);
  const ccFile = findCcSessionFile(project);
  if (!ccFile || !fs.existsSync(ccFile)) return;
  const data = JSON.parse(fs.readFileSync(ccFile, "utf8"));
  data.sessions = data.sessions || {};
  const { execution_history, executionHistory, execution_history_version, ...sharedSessionValue } = value || {};
  data.sessions[projectSessionId] = sharedSessionValue;
  writeAtomic(ccFile, data);
}

function projectExecutionEvents(data: any) {
  return normalizeSessionExecutionEvents(data?.execution_history || data?.executionHistory);
}

export function listProjectSessionExecutionEvents(projectInput: string, projectSessionIdInput: string) {
  try {
    const project = validateProjectName(projectInput);
    const projectSessionId = validateSessionId(projectSessionIdInput);
    const file = sessionFile(project, projectSessionId);
    if (!fs.existsSync(file)) return [];
    return projectExecutionEvents(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return [];
  }
}

export function listProjectSessionHistoryMessages(projectInput: string, projectSessionIdInput: string) {
  try {
    const project = validateProjectName(projectInput);
    const projectSessionId = validateSessionId(projectSessionIdInput);
    const file = sessionFile(project, projectSessionId);
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return (Array.isArray(data.history) ? data.history : []).filter((message: any) => ["user", "assistant"].includes(String(message?.role || "")));
  } catch {
    return [];
  }
}

function projectExecutionForMessages(data: any, messages: any[]) {
  return eventsAnchoredToMessages(projectExecutionEvents(data), messages);
}

function projectModelTimeline(data: any, messages: any[]) {
  return mergeConversationWithExecution(messages, projectExecutionForMessages(data, messages));
}

export function appendProjectSessionExecutionEvent(projectInput: string, projectSessionIdInput: string, event: any) {
  const project = validateProjectName(projectInput);
  const projectSessionId = validateSessionId(projectSessionIdInput);
  const file = sessionFile(project, projectSessionId);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const events = projectExecutionEvents(data);
  const type = String(event?.type || "") === "tool_use" || String(event?.type || "") === "tool_started" ? "tool_use" : "tool_result";
  const toolName = String(event?.toolName || event?.tool_name || event?.tool || "tool");
  const runId = String(event?.runId || event?.run_id || "");
  const toolCallId = type === "tool_result"
    ? (String(event?.toolCallId || event?.tool_call_id || "") || findPendingToolCallId(events, runId, toolName))
    : String(event?.toolCallId || event?.tool_call_id || "");
  const history = Array.isArray(data.history) ? data.history : [];
  const anchor = [...history].reverse().find((message: any) => message?.role === "user") || history.at(-1) || null;
  const created = createSessionExecutionEvent({
    type,
    toolName,
    toolCallId,
    runId,
    traceId: String(event?.traceId || event?.trace_id || ""),
    anchorMessageId: String(event?.anchorMessageId || event?.anchor_message_id || anchor?.id || ""),
    timestamp: event?.timestamp || event?.at || new Date().toISOString(),
    status: event?.status === "error" || event?.error ? "error" : type === "tool_use" ? "running" : "ok",
    payload: event?.payload ?? (type === "tool_use" ? { arguments: event?.arguments || {} } : { observation: event?.observation ?? null, error: event?.error || "" }),
    persistContext: { scope: "project", sessionId: projectSessionId },
  });
  if (!events.some(item => item.id === created.id)) events.push(created);
  if (event?.taskId || event?.task_id) {
    appendSessionTimelineEvent({
      exactSessionId: projectSessionId,
      scope: "project",
      scopeId: project,
      type,
      eventId: `execution:${created.id}`,
      taskId: String(event?.taskId || event?.task_id),
      workItemId: event?.workItemId || event?.work_item_id,
      generation: event?.generation,
      attempt: event?.attempt,
      leaseId: event?.leaseId || event?.lease_id,
      payloadRef: created.id,
      timestamp: created.timestamp,
    });
  }
  data.execution_history_version = 1;
  data.execution_history = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  data.updated_at = new Date().toISOString();
  persistSession(project, projectSessionId, data);
  return created;
}

function projectCompactionState(data: any, project: string, projectSessionId: string) {
  const unified = data?.unifiedSessionCompaction || null;
  if (!unified || unified.schema !== "ccm-unified-session-compaction-state-v1") return {
    schema: "ccm-unified-session-compaction-state-v1",
    scope: "project",
    exactSessionId: `${project}:${projectSessionId}`,
    activeSummary: null,
    boundaryGeneration: 0,
    summarizedMessageCount: 0,
    preservedRecentMessageIds: [],
    latestProviderUsage: null,
  };
  return {
    ...unified,
    activeSummary: data?.unifiedSessionSummary || null,
    activeSummaryChecksum: String(unified.summaryChecksum || ""),
    lastCompactedIndex: Math.max(-1, Number(unified.summarizedMessageCount || 0) - 1),
    lastCompactedMessageId: String(unified.summarizedThroughMessageId || ""),
    preservedRecentMessageIds: Array.isArray(unified.preservedRecentMessageIds) ? unified.preservedRecentMessageIds : [],
    boundaryGeneration: Number(unified.boundaryGeneration || 0),
  };
}

function resolveProjectCompactionCapacity(data: any, config: any, binding: any, state: any, requested: any = {}) {
  const provider = String(requested.provider || state.latestProviderUsage?.provider || binding.provider || "");
  const model = String(requested.model || state.latestProviderUsage?.model || data?.agent_model || data?.model || "");
  const policy = data?.compaction_policy || data?.memory_context_policy || {};
  const explicitWindow = Number(policy.modelContextWindow || policy.model_context_window || 0);
  const trusted = resolveTrustedModelContextCapacity({
    provider,
    model,
    ...(explicitWindow > 0 ? {
      modelContextWindow: explicitWindow,
      modelMaxOutputTokens: Number(policy.maxOutputTokens || policy.max_output_tokens || 20_000),
      capacityCheckedAt: policy.updatedAt || policy.updated_at || new Date().toISOString(),
    } : {}),
  });
  const globalCapacity = resolveGroupModelContextCapacity(config);
  const resolved = explicitWindow > 0 || trusted.conservativeFallback !== true ? trusted : globalCapacity;
  const explicitThreshold = Number(policy.autoCompactThreshold || policy.auto_compact_threshold || 0);
  return {
    ...resolved,
    provider,
    model,
    autoCompactThreshold: explicitThreshold > 0 ? explicitThreshold : Number(resolved.autoCompactThreshold || globalCapacity.autoCompactThreshold || 0),
    resolution: explicitWindow > 0 ? "exact_scope_override" : trusted.conservativeFallback !== true ? "trusted_provider_model" : "global_user_preset",
  };
}

function pendingProjectRequest(history: any[], value: any) {
  if (value == null || value === "") return null;
  const content = typeof value === "string" ? value : String(value?.content || JSON.stringify(value));
  const last = history.at(-1);
  if (String(last?.role || "") === "user" && String(last?.content || "") === content) return null;
  return typeof value === "string" ? { role: "user", content } : value;
}

export function recordProjectSessionProviderUsage(project: string, projectSessionId: string, input: any = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(projectSessionId);
  const file = sessionFile(safeProject, safeSessionId);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const state = projectCompactionState(data, safeProject, safeSessionId);
  const history = Array.isArray(data.history) ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
  const visibleMessages = history.slice(state.lastCompactedIndex + 1);
  const modelVisibleMessages = projectModelTimeline(data, visibleMessages);
  const currentRequest = pendingProjectRequest(visibleMessages, input.currentRequest || input.current_request);
  const suppliedPayload = input.modelVisiblePayload || input.model_visible_payload || null;
  const payload = isModelVisiblePayloadSnapshot(suppliedPayload) ? suppliedPayload : buildModelVisiblePayloadSnapshot({
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    exactSessionId: safeSessionId,
    provider: String(input.provider || ""),
    model: String(input.model || ""),
    protocol: String(input.protocol || input.format || ""),
    modelConfig: input.modelConfig || { provider: input.provider, model: input.model, format: input.protocol || input.format },
    system: input.fixedContext || input.fixed_context || null,
    tools: input.tools || null,
    activeSummary: state.activeSummary || null,
    recentMessages: modelVisibleMessages,
    currentRequest,
    recoveryContext: input.recoveryContext || input.recovery_context || null,
    hookResults: input.hookResults || input.hook_results || [],
    contextComponents: input.contextComponents || input.context_components || undefined,
  });
  const usage = normalizeSessionProviderUsage({
    ...(input || {}),
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    providerIdentityChecksum: input.providerIdentityChecksum || buildCcmProviderIdentityChecksum({ provider: input.provider, model: input.model, protocol: input.protocol || input.format, endpoint: input.endpoint || input.apiUrl }),
    boundaryGeneration: state.boundaryGeneration,
    payloadChecksum: input.payloadChecksum || input.payload_checksum || payload.payloadChecksum,
    fixedContextChecksum: input.fixedContextChecksum || input.fixed_context_checksum || payload.fixedContextChecksum,
    estimatedFixedTokens: input.estimatedFixedTokens || input.estimated_fixed_tokens || modelVisibleFixedTokens(payload),
    estimatedContextTokens: input.estimatedContextTokens || input.estimated_context_tokens || payload.totalTokens,
    estimatedPayloadTokens: input.estimatedPayloadTokens || input.estimated_payload_tokens || payload.totalTokens,
  });
  const measurementUsage = usage || state.latestProviderUsage;
  const tokenMeasurement = measureSessionContextTokens({
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    messages: modelVisibleMessages,
    activeSummary: state.activeSummary,
    latestProviderUsage: measurementUsage,
    provider: String(measurementUsage?.provider || ""),
    model: String(measurementUsage?.model || ""),
    protocol: String(measurementUsage?.protocol || input.protocol || input.format || ""),
    endpoint: String(measurementUsage?.endpoint || input.endpoint || input.apiUrl || ""),
    generation: Number(measurementUsage?.generation || 0),
    boundaryGeneration: state.boundaryGeneration,
    modelVisiblePayload: payload,
  });
  const accounting = modelVisiblePayloadAccounting(payload);
  const nextState = {
    ...state,
    latestProviderUsage: measurementUsage || null,
    tokenMeasurement,
    modelVisiblePayload: accounting,
    modelVisiblePayloadChecksum: payload.payloadChecksum,
    fixedContextChecksum: payload.fixedContextChecksum,
    pendingRequestChecksum: payload.pendingRequestChecksum,
    recoveryContextTokens: payload.tokenBreakdown.recoveryContext,
    hookResultTokens: payload.tokenBreakdown.hookResults,
  };
  data.unifiedSessionCompaction = {
    ...data.unifiedSessionCompaction,
    ...nextState,
    providerUsage: measurementUsage || null,
    tokenMeasurement,
    modelVisiblePayload: accounting,
  };
  data.updated_at = new Date().toISOString();
  persistSession(safeProject, safeSessionId, data);
  return usage;
}

export function scheduleProjectSessionMemoryExtraction(project: string, projectSessionId: string, options: { modelCall?: (request: any) => Promise<any> } = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(projectSessionId);
  const file = sessionFile(safeProject, safeSessionId);
  if (!fs.existsSync(file)) return { scheduled: false, reason: "session_missing" };
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const promise = compactProjectSessionWithModel(safeProject, safeSessionId, {
    reason: "automatic",
    modelCall: options.modelCall,
  });
  void promise.catch(() => undefined);
  return { scheduled: true, unified: true, promise };
}

function summaryChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value || null)).digest("hex");
}

export async function compactProjectSessionWithModel(project: string, projectSessionId: string, options: {
  force?: boolean;
  reason?: string;
  customInstructions?: string;
  modelCall?: (request: any) => Promise<any>;
  currentRequest?: any;
  fixedContext?: any;
  tools?: any;
  recoveryContext?: any;
  contextComponents?: any;
  context_components?: any;
  provider?: string;
  model?: string;
  modelVisiblePayload?: any;
  activeDispatchScopeId?: string;
} = {}) {
  return runUnifiedProjectSessionCompaction(project, projectSessionId, options);
}

function projectSessionMessageContent(value: any) {
  const content = value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "content")
    ? value.content
    : value;
  if (typeof content === "string") return content;
  try { return JSON.stringify(content); } catch { return String(content || ""); }
}

function excludePendingProjectRequest(history: any[], currentRequest: any) {
  if (currentRequest == null || currentRequest === "") return { history, deduplicated: false };
  const last = history.at(-1);
  const matchesSavedRequest = String(last?.role || "") === "user"
    && projectSessionMessageContent(last) === projectSessionMessageContent(currentRequest);
  return matchesSavedRequest
    ? { history: history.slice(0, -1), deduplicated: true }
    : { history, deduplicated: false };
}

export function buildProjectSessionPostCompactContext(
  project: string,
  projectSessionId: string,
  targetAgentType = "",
  options: { currentRequest?: any } = {},
) {
  const binding = getProjectSessionAgentBinding(project, projectSessionId);
  const targetProvider = targetAgentType ? normalizeAgentRuntimeId(targetAgentType) : "";
  if (binding.status === "open"
    && binding.turn_count > 0
    && (!targetProvider || binding.provider === targetProvider)) return "";
  const projection = buildProjectSessionModelContextProjection(project, projectSessionId, { ...options, persistMicroCompactReceipt: true });
  if (!projection) return "";
  if (!projection.summary && !projection.visibleMessages.length) return "";
  return [
    "【当前项目逻辑会话连续性上下文】",
    "这是 CCM 为新第三方 Agent 会话世代恢复的历史上下文。执行前仍须核验当前文件和真实状态。",
    projection.rendered,
  ].join("\n");
}

export function buildProjectSessionModelContextProjection(
  project: string,
  projectSessionId: string,
  options: { currentRequest?: any; persistMicroCompactReceipt?: boolean } = {},
) {
  const file = sessionFile(project, projectSessionId);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const state = projectCompactionState(data, project, projectSessionId);
  const sessionTaskIndex = readVerifiedSessionTaskIndex({ exactSessionId: projectSessionId, scope: "project", scopeId: project });
  const summary = data.unifiedSessionSummary || state.activeSummary || null;
  const history = Array.isArray(data.history)
    ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || "")))
    : [];
  const canonicalSummary = !!summary;
  const config = loadOrchestratorConfig();
  const unified = buildUnifiedSessionModelContextProjection({
    scope: "project",
    scopeId: `${project}:${projectSessionId}`,
    sessionId: projectSessionId,
    messages: history,
    executionEvents: projectExecutionEvents(data),
    canonicalSummary: canonicalSummary ? summary : null,
    summarySource: canonicalSummary ? "model" : "",
    summaryChecksum: canonicalSummary ? summaryChecksum(summary) : "",
    boundaryGeneration: Number(state.boundaryGeneration || 0),
    summarizedThroughIndex: Number(state.lastCompactedIndex || -1),
    lastSummarizedMessageId: String(state.summarizedThroughMessageId || ""),
    currentRequest: options.currentRequest,
    microCompact: resolveSessionModelMicroCompactPolicy(config, {
      contextTokens: Number(state.tokenMeasurement?.activeTokens || 0),
     pressureThresholdTokens: Number(state.autoCompactThreshold || 0),
    }),
    currentTaskId: sessionTaskIndex.activeTaskId,
    sessionTaskIndex,
  });
  return {
    ...unified,
    schema: "ccm-project-session-model-context-v1",
    project,
    projectSessionId,
    lastCompactedIndex: Number(state.lastCompactedIndex || -1),
  };
}
