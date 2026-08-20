import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, SESSIONS_DIR } from "../../core/utils";
import { callCompactionModel } from "../collaboration/group-compaction-engine";
import { callUnifiedCompactionModel } from "../../system/unified-session-compaction-model";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { resolveMainAgentContextPolicy } from "../../tools/main-agent-context-policy";
import { selectUserMcpToolDefinitions } from "../../system/session-context-tool-buckets";
import { resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import { resolveTrustedModelContextCapacity } from "../collaboration/model-capability-cache";
import { estimateTextTokens } from "../../system/context-budget";
import { calculateSessionMemoryKeepWindow, buildApiConversationRounds, peelOldestApiConversationRound } from "../../system/session-memory-window";
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
  buildSessionPostCompactGate,
  buildModelVisiblePayloadSnapshot,
  modelVisibleFixedTokens,
  modelVisiblePayloadAccounting,
  buildSessionCompactionBoundaryMarker,
  buildSessionMemoryState,
  evaluateSessionMemoryCadence,
  measureSessionContextTokens,
  normalizeSessionCompactionState,
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
import { buildUnifiedSessionModelContextProjection, resolveSessionModelMicroCompactPolicy } from "../../system/session-model-context";
import { buildUnifiedCompactionReceipt, buildUnifiedSessionCompactionStateV1, buildUnifiedRecoveryContext, orchestrateUnifiedCompaction, createUnifiedSessionCompactionEngine } from "../../system/unified-session-compaction";
import { createUnifiedScopeAdapter } from "../../system/unified-session-compaction-adapters";
import type { UnifiedCompactionResult } from "../../system/unified-session-compaction-types";
import { unifiedSummaryChecksum } from "../../system/unified-session-compaction-summary";
import { evaluateSessionSummaryQuality } from "../../system/session-summary-quality-gate";
import { reviewSessionSummaryIfSelected } from "../../system/session-summary-secondary-review";
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
  if (isProjectSessionAgentDispatchActive(safeProject, safeSessionId)) throw new Error("当前项目会话仍有第三方 Agent 正在执行，暂不能压缩");
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
      if (isProjectSessionAgentDispatchActive(safeProject, safeSessionId)) throw new Error("project_compaction_dispatch_started");
    },
    commit: (result, fence) => {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (projectCompactionSourceChecksum(data) !== fence.checksum) throw new Error("project_compaction_commit_fence_stale");
      const summary = result.fullCompaction.summary;
      if (!summary || summary.schema !== "ccm-unified-session-summary-v1") throw new Error("project_compaction_summary_missing");
      const preservedIds = result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")).filter(Boolean);
      const summarizedCount = Number(result.preservedRecentWindow.startIndex || 0);
      const previousBinding = getProjectSessionAgentBinding(safeProject, safeSessionId);
      const rotation = rotateProjectSessionAgentBinding(safeProject, safeSessionId, `统一会话压缩 ${result.receipt.checksum.slice(0, 12)}`);
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

function compactText(value: any, max = 1600) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, Math.ceil(max * .68))}\n...[摘要输入已截断]...\n${text.slice(-Math.floor(max * .25))}` : text;
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
  data.execution_history_version = 1;
  data.execution_history = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  data.updated_at = new Date().toISOString();
  persistSession(project, projectSessionId, data);
  return created;
}

function projectCompactionState(data: any, project: string, projectSessionId: string) {
  const unified = data?.unifiedSessionCompaction || null;
  if (!unified || unified.schema !== "ccm-unified-session-compaction-state-v1") {
    return normalizeSessionCompactionState({}, {
      scope: "project",
      sessionId: `${project}:${projectSessionId}`,
    });
  }
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
  const payload = suppliedPayload?.schema === "ccm-model-visible-payload-snapshot-v1" ? suppliedPayload : buildModelVisiblePayloadSnapshot({
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
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
  data.compaction = {
    ...(data.compaction || {}),
    latest_provider_usage: measurementUsage || null,
    latestProviderUsage: measurementUsage || null,
    token_measurement: tokenMeasurement,
    tokenMeasurement,
    model_visible_payload: accounting,
    modelVisiblePayload: accounting,
    v2: nextState,
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
  const history = Array.isArray(data.history) ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
  const state = projectCompactionState(data, safeProject, safeSessionId);
  const cadence = evaluateSessionMemoryCadence(history, state.sessionMemoryState || {});
  if (!cadence.shouldExtract) return { scheduled: false, reason: cadence.reason, cadence };
  const startIndex = Math.max(0, state.lastCompactedIndex + 1);
  const visibleTimeline = history.slice(startIndex);
  if (!visibleTimeline.length) return { scheduled: false, reason: "no_messages" };
  const timeline = projectModelTimeline(data, visibleTimeline);
  const reference = referenceSummary(timeline);
  const sourceMessageIds = reference.sourceMessageIds;
  const config = loadOrchestratorConfig();
  const system = [
    "你是 CCM 项目会话 Session Memory 提取器。只输出 JSON，不要 Markdown，不得编造。",
    "必须保留授权、决定、未完成事项、文件路径和 sourceMessageIds。",
  ].join("\n");
  const user = JSON.stringify({
    project: safeProject,
    projectSessionId: safeSessionId,
    previousSummary: state.sessionMemoryState?.summary || state.activeSummary || null,
    preservationReference: reference,
    sourceMessageIds,
    timeline,
  });
  const identity = {
    boundaryGeneration: state.boundaryGeneration,
    lastMessageId: String(history.at(-1)?.id || ""),
    transcriptChecksum: sessionCompactionChecksum([
      ...history.map((message: any) => [message.id, message.role, message.content]),
      ...projectExecutionEvents(data).map(message => [message.id, message.type, message.toolCallId, message.payload]),
    ]),
    cadence,
  };
  const invoke = options.modelCall || ((request: any) => callCompactionModel(config, request.system, request.user, request.maxOutputTokens));
  const scheduled = scheduleSessionMemoryExtraction({
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    identity,
    extract: () => invoke({ system, user, maxOutputTokens: MODEL_MAX_OUTPUT_TOKENS, sessionMemory: true }),
    commit: async (raw, expected) => {
      const latest = JSON.parse(fs.readFileSync(file, "utf8"));
      const latestHistory = Array.isArray(latest.history) ? latest.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
      const latestState = projectCompactionState(latest, safeProject, safeSessionId);
      if (latestState.boundaryGeneration !== expected.boundaryGeneration
        || String(latestHistory.at(-1)?.id || "") !== expected.lastMessageId
        || sessionCompactionChecksum([
          ...latestHistory.map((message: any) => [message.id, message.role, message.content]),
          ...projectExecutionEvents(latest).map(message => [message.id, message.type, message.toolCallId, message.payload]),
        ]) !== expected.transcriptChecksum) {
        return { committed: false, reason: "stale_identity" };
      }
      const candidate = raw?.summary || raw;
      const validation = validateSummary(bindTrustedProjectSourceBoundary(candidate, sourceMessageIds), reference, sourceMessageIds, {
        sessionId: `${safeProject}:${safeSessionId}`,
        sourceMessages: history,
        previousSummary: state.activeSummary,
      });
      if (!validation.valid) throw new Error(`项目 Session Memory 校验失败：${validation.issues.join(", ")}`);
      const summary = normalizeSummary(candidate, sourceMessageIds);
      const sessionMemoryState = buildSessionMemoryState({
        scope: "project",
        sessionId: `${safeProject}:${safeSessionId}`,
        summary,
        cadence,
        provider: raw?.provider,
        model: raw?.model || config.model,
      });
      latest.compaction = {
        ...(latest.compaction || {}),
        session_memory_state: sessionMemoryState,
        session_memory_extraction: { status: "committed", startedAt: scheduled.startedAt, completedAt: new Date().toISOString() },
        v2: { ...latestState, sessionMemoryState, sessionMemoryExtraction: { status: "committed", startedAt: scheduled.startedAt, completedAt: new Date().toISOString() } },
      };
      persistSession(safeProject, safeSessionId, latest);
      return { committed: true, sessionMemoryState };
    },
  });
  if (scheduled.scheduled) {
    data.compaction = {
      ...(data.compaction || {}),
      session_memory_extraction: { status: "in_flight", startedAt: scheduled.startedAt, identity },
      v2: { ...state, sessionMemoryExtraction: { status: "in_flight", startedAt: scheduled.startedAt, identity } },
    };
    persistSession(safeProject, safeSessionId, data);
  }
  return { ...scheduled, cadence };
}

function referenceSummary(messages: any[]) {
  const users = messages.filter(message => message.role === "user" && message.hidden_execution !== true);
  const assistants = messages.filter(message => message.role === "assistant" && message.hidden_execution !== true);
  const executionResults = messages.filter(message => message.type === "tool_result" || (message.hidden_execution === true && message.role === "user"));
  const allText = messages.map(message => String(message.content || ""));
  const filesAndResources = [...new Set(allText.flatMap(text => text.match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-40);
  const structuredFacts = messages.flatMap(message => Array.isArray(message?.structured_memory_facts) ? message.structured_memory_facts : []);
  const byStructuredType = (type: string) => structuredFacts
    .filter((item: any) => String(item?.type || "") === type && String(item?.text || "").trim())
    .map((item: any) => compactText(item.text, 1200))
    .slice(-24);
  return {
    primaryRequest: compactText(users.at(-1)?.content, 1800),
    userRequests: users.slice(-20).map(message => `#${message.id} ${compactText(message.content, 1000)}`),
    keyOutcomes: [
      ...assistants.slice(-20).map(message => `#${message.id} ${compactText(message.content, 1000)}`),
      ...executionResults.slice(-20).map(message => `#${message.id} ${compactText(message.content, 1200)}`),
    ].slice(-24),
    authorization: byStructuredType("authorization"),
    decisions: byStructuredType("decision"),
    unresolved: byStructuredType("unresolved"),
    filesAndResources,
    latestOutcome: compactText(assistants.at(-1)?.content, 1800),
    sourceMessageIds: messages.map(message => String(message.id || "")),
  };
}

function normalizeSummary(value: any, sourceMessageIds: string[]) {
  const list = (input: any, maxItems: number, maxChars = 1400) => (Array.isArray(input) ? input : []).map(item => compactText(item, maxChars)).filter(Boolean).slice(-maxItems);
  return {
    primaryRequest: compactText(value?.primaryRequest, 1800),
    userRequests: list(value?.userRequests, 24),
    keyOutcomes: list(value?.keyOutcomes, 24),
    authorization: list(value?.authorization, 20),
    decisions: list(value?.decisions, 24),
    unresolved: list(value?.unresolved, 24),
    filesAndResources: list(value?.filesAndResources, 48, 600),
    latestOutcome: compactText(value?.latestOutcome, 1800),
    sourceMessageIds,
  };
}

function validateSummary(value: any, reference: any, sourceMessageIds: string[], context: { sessionId?: string; sourceMessages?: any[]; previousSummary?: any } = {}) {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) issues.push("summary_not_object");
  const ids = Array.isArray(value?.sourceMessageIds) ? value.sourceMessageIds.map(String) : [];
  if (ids.length !== sourceMessageIds.length || ids.some((id, index) => id !== sourceMessageIds[index])) issues.push("source_boundary_mismatch");
  if (!String(value?.primaryRequest || value?.latestOutcome || "").trim()) issues.push("summary_core_empty");
  for (const key of ["authorization", "decisions", "unresolved", "filesAndResources"] as const) {
    const preserved = (Array.isArray(value?.[key]) ? value[key] : []).map(String);
    for (const anchor of reference[key] || []) if (!preserved.includes(String(anchor))) issues.push(`${key}_anchor_missing`);
  }
  const quality = evaluateSessionSummaryQuality({
    scope: "project",
    sessionId: String(context.sessionId || "project-session"),
    summary: value,
    reference,
    previousSummary: context.previousSummary,
    sourceMessages: context.sourceMessages,
    sourceMessageIds,
  });
  issues.push(...quality.issues);
  return { valid: issues.length === 0, issues: [...new Set(issues)], quality };
}

function bindTrustedProjectSourceBoundary(summary: any, sourceMessageIds: string[]) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  return { ...summary, sourceMessageIds: [...sourceMessageIds] };
}

function summaryChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value || null)).digest("hex");
}

function fitProjectCompactionPrompt(system: string, payload: any, maxInputTokens: number) {
  const rounds = buildApiConversationRounds(payload.timeline || []);
  const selectedRounds = [...rounds];
  const droppedMessageIds: string[] = [];
  let droppedRounds = 0;
  const render = (timeline: any[]) => JSON.stringify({
    ...payload,
    timeline,
    timelineProjection: {
      strategy: droppedMessageIds.length ? "drop_oldest_complete_rounds" : "full_timeline",
      fullSourceMessageIds: payload.preservationReference?.sourceMessageIds || [],
      includedMessageIds: timeline.map((message: any) => String(message?.id || "")),
      droppedMessageIds,
      fullTranscriptRetained: true,
    },
  });
  let timeline = selectedRounds.flat();
  let user = render(timeline);
  while (selectedRounds.length > 1 && droppedRounds < 3 && estimateTextTokens(system) + estimateTextTokens(user) > maxInputTokens) {
    const dropped = selectedRounds.shift() || [];
    droppedMessageIds.push(...dropped.map((message: any) => String(message?.id || "")));
    droppedRounds += 1;
    timeline = selectedRounds.flat();
    user = render(timeline);
  }
  if (estimateTextTokens(system) + estimateTextTokens(user) > maxInputTokens) {
    throw new Error("项目会话压缩输入删除三轮最旧完整对话后仍超过模型容量");
  }
  return {
    user,
    projection: {
      strategy: droppedMessageIds.length ? "drop_oldest_complete_rounds" : "full_timeline",
      originalMessageCount: (payload.timeline || []).length,
      includedMessageCount: timeline.length,
      droppedMessageIds,
      projectedMessageContent: false,
      ptlRecoveryAttempts: droppedRounds,
      estimatedInputTokens: estimateTextTokens(system) + estimateTextTokens(user),
      maxInputTokens,
    },
    timeline,
  };
}

function isPromptTooLong(error: any) {
  return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|request too large/i.test(String(error?.message || error || ""));
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
    lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
    currentRequest: options.currentRequest,
    microCompact: resolveSessionModelMicroCompactPolicy(config, {
      contextTokens: Number(state.tokenMeasurement?.activeTokens || 0),
    pressureThresholdTokens: Number(state.autoCompactThreshold || data.compaction?.auto_compact_threshold || 0),
    }),
  });
  if (options.persistMicroCompactReceipt === true) {
    data.compaction = {
      ...(data.compaction || {}),
      micro_compact_receipt: unified.microCompact,
      tool_result_content_replacement_receipt: unified.contentReplacement,
    };
    data.updated_at = new Date().toISOString();
    persistSession(project, projectSessionId, data);
  }
  return {
    ...unified,
    schema: "ccm-project-session-model-context-v1",
    project,
    projectSessionId,
    lastCompactedIndex: Number(state.lastCompactedIndex || -1),
  };
}
