import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, SESSIONS_DIR } from "../../core/utils";
import { callCompactionModel } from "../collaboration/group-compaction-engine-part-01";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import { resolveTrustedModelContextCapacity } from "../collaboration/model-capability-cache";
import { estimateTextTokens } from "../../system/context-budget";
import { calculateSessionMemoryKeepWindow, buildCompleteConversationRounds, peelOldestCompleteConversationRound } from "../../system/session-memory-window";
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

const MODEL_MAX_OUTPUT_TOKENS = 20_000;
const compactions = new Map<string, { promise: Promise<any>; reason: string; startedAt: string }>();

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
  data.sessions[projectSessionId] = value;
  writeAtomic(ccFile, data);
}

function projectCompactionState(data: any, project: string, projectSessionId: string) {
  const state = normalizeSessionCompactionState(data?.compaction?.v2 || data?.compaction || {}, {
    scope: "project",
    sessionId: `${project}:${projectSessionId}`,
  });
  const source = String(data?.compaction?.summary_source || data?.compaction?.summarySource || "").toLowerCase();
  if (state.activeSummary && !["model", "session_memory", "session-memory"].includes(source)) {
    return {
      ...state,
      activeSummary: null,
      activeSummaryChecksum: "",
      previousSummaryChecksum: "",
      lastCompactedIndex: -1,
      lastCompactedMessageId: "",
      preservedRecentMessageIds: [],
      preservedRecentTokens: 0,
      preservedRecentTextMessageCount: 0,
      latestProviderUsage: null,
      boundaryGeneration: 0,
    };
  }
  return state;
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
  const currentRequest = pendingProjectRequest(visibleMessages, input.currentRequest || input.current_request);
  const payload = buildModelVisiblePayloadSnapshot({
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    system: input.fixedContext || input.fixed_context || null,
    tools: input.tools || null,
    activeSummary: state.activeSummary || null,
    recentMessages: visibleMessages,
    currentRequest,
    recoveryContext: input.recoveryContext || input.recovery_context || null,
    hookResults: input.hookResults || input.hook_results || [],
  });
  const usage = normalizeSessionProviderUsage({
    ...(input || {}),
    scope: "project",
    sessionId: `${safeProject}:${safeSessionId}`,
    boundaryGeneration: state.boundaryGeneration,
    payloadChecksum: input.payloadChecksum || input.payload_checksum || payload.payloadChecksum,
    fixedContextChecksum: input.fixedContextChecksum || input.fixed_context_checksum || payload.fixedContextChecksum,
    estimatedFixedTokens: input.estimatedFixedTokens || input.estimated_fixed_tokens
      || payload.tokenBreakdown.system + payload.tokenBreakdown.tools + payload.tokenBreakdown.recoveryContext + payload.tokenBreakdown.hookResults,
    estimatedPayloadTokens: input.estimatedPayloadTokens || input.estimated_payload_tokens || payload.totalTokens,
  });
  if (!usage) return null;
  data.compaction = {
    ...(data.compaction || {}),
    latest_provider_usage: usage,
    latestProviderUsage: usage,
    v2: { ...state, latestProviderUsage: usage },
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
  const timeline = history.slice(startIndex);
  if (!timeline.length) return { scheduled: false, reason: "no_messages" };
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
    transcriptChecksum: sessionCompactionChecksum(history.map((message: any) => [message.id, message.role, message.content])),
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
        || sessionCompactionChecksum(latestHistory.map((message: any) => [message.id, message.role, message.content])) !== expected.transcriptChecksum) {
        return { committed: false, reason: "stale_identity" };
      }
      const candidate = raw?.summary || raw;
      const validation = validateSummary(bindTrustedProjectSourceBoundary(candidate, sourceMessageIds), reference, sourceMessageIds);
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
  const users = messages.filter(message => message.role === "user");
  const assistants = messages.filter(message => message.role === "assistant");
  const allText = messages.map(message => String(message.content || ""));
  const filesAndResources = [...new Set(allText.flatMap(text => text.match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-40);
  const authorization = users
    .filter(message => /授权|允许|不要|禁止|只能|必须|可以修改|只读|permission|authorize/i.test(String(message.content || "")))
    .map(message => compactText(message.content, 1200))
    .slice(-16);
  return {
    primaryRequest: compactText(users.at(-1)?.content, 1800),
    userRequests: users.slice(-20).map(message => `#${message.id} ${compactText(message.content, 1000)}`),
    keyOutcomes: assistants.slice(-20).map(message => `#${message.id} ${compactText(message.content, 1000)}`),
    authorization,
    decisions: allText.filter(text => /决定|采用|选择|改为|方案|decision/i.test(text)).slice(-20).map(text => compactText(text, 1000)),
    unresolved: allText.filter(text => /未完成|下一步|待处理|阻塞|失败|错误|todo|remaining|blocked|failed/i.test(text)).slice(-20).map(text => compactText(text, 1000)),
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

function validateSummary(value: any, reference: any, sourceMessageIds: string[]) {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) issues.push("summary_not_object");
  const ids = Array.isArray(value?.sourceMessageIds) ? value.sourceMessageIds.map(String) : [];
  if (ids.length !== sourceMessageIds.length || ids.some((id, index) => id !== sourceMessageIds[index])) issues.push("source_boundary_mismatch");
  if (!String(value?.primaryRequest || value?.latestOutcome || "").trim()) issues.push("summary_core_empty");
  for (const key of ["authorization", "decisions", "unresolved", "filesAndResources"] as const) {
    const preserved = (Array.isArray(value?.[key]) ? value[key] : []).map(String);
    for (const anchor of reference[key] || []) if (!preserved.includes(String(anchor))) issues.push(`${key}_anchor_missing`);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

function bindTrustedProjectSourceBoundary(summary: any, sourceMessageIds: string[]) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  return { ...summary, sourceMessageIds: [...sourceMessageIds] };
}

function summaryChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value || null)).digest("hex");
}

function fitProjectCompactionPrompt(system: string, payload: any, maxInputTokens: number) {
  const rounds = buildCompleteConversationRounds(payload.timeline || []);
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
  provider?: string;
  model?: string;
} = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(projectSessionId);
  const scopeId = buildProjectSessionAgentScopeId(safeProject, safeSessionId);
  const current = compactions.get(scopeId);
  if (current) {
    if (options.force) throw new Error("当前项目会话已有压缩正在进行，请稍后重试");
    return current.promise;
  }
  const operation = (async () => {
    if (isProjectSessionAgentDispatchActive(safeProject, safeSessionId)) throw new Error("当前项目会话仍有第三方 Agent 正在执行，暂不能压缩");
    const file = sessionFile(safeProject, safeSessionId);
    if (!fs.existsSync(file)) throw new Error("项目会话不存在");
    await waitForScheduledSessionMemoryExtraction("project", `${safeProject}:${safeSessionId}`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const history = Array.isArray(data.history) ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
    let state = projectCompactionState(data, safeProject, safeSessionId);
    const storedSummarySource = String(data?.compaction?.summary_source || data?.compaction?.summarySource || "").toLowerCase();
    const legacySummaryNeedsValidation = !!data?.compaction?.active_summary && !["model", "session_memory", "session-memory"].includes(storedSummarySource);
    const legacyBoundaryCircuit = legacySummaryNeedsValidation
      && sessionCompactionCircuitOpen(state)
      && /source_boundary_mismatch/i.test(String(state.lastError || ""));
    if (legacyBoundaryCircuit) {
      state = resetSessionCompactionFailures(state);
      data.compaction = {
        ...(data.compaction || {}),
        consecutive_failures: 0,
        last_failure_at: "",
        last_error: "",
        v2: state,
      };
      data.updated_at = new Date().toISOString();
      persistSession(safeProject, safeSessionId, data);
    }
    const startIndex = Math.max(0, state.lastCompactedIndex + 1);
    const unsummarized = history.slice(startIndex);
    const config = loadOrchestratorConfig();
    const compactionModelCapacity = resolveGroupModelContextCapacity(config);
    const bindingAtMeasurement = getProjectSessionAgentBinding(safeProject, safeSessionId);
    const modelCapacity = resolveProjectCompactionCapacity(data, config, bindingAtMeasurement, state, options);
    const threshold = Math.max(1, Number(modelCapacity.autoCompactThreshold || 0));
    const currentRequest = pendingProjectRequest(history, options.currentRequest);
    const triggerPayload = buildModelVisiblePayloadSnapshot({
      scope: "project",
      sessionId: `${safeProject}:${safeSessionId}`,
      system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model },
      tools: options.tools || null,
      activeSummary: state.activeSummary,
      recentMessages: unsummarized,
      currentRequest,
      recoveryContext: options.recoveryContext || null,
      hookResults: [],
    });
    const tokenMeasurement = measureSessionContextTokens({
      scope: "project",
      sessionId: `${safeProject}:${safeSessionId}`,
      messages: unsummarized,
      activeSummary: state.activeSummary,
      latestProviderUsage: state.latestProviderUsage,
      provider: String(state.latestProviderUsage?.provider || bindingAtMeasurement.provider || ""),
      model: String(state.latestProviderUsage?.model || modelCapacity.model || ""),
      generation: Number(state.latestProviderUsage?.generation || bindingAtMeasurement.generation || 0),
      boundaryGeneration: state.boundaryGeneration,
      modelVisiblePayload: triggerPayload,
    });
    const tokenCount = tokenMeasurement.activeTokens;
    if (!options.force && tokenCount < threshold) return {
      compacted: false,
      reason: "below_threshold",
      before_tokens: tokenCount,
      auto_compact_threshold: threshold,
      model_context_capacity: modelCapacity,
      token_measurement: tokenMeasurement,
      model_visible_payload: triggerPayload,
      resolved_model_capacity: modelCapacity,
      pending_request_tokens: triggerPayload.tokenBreakdown.currentRequest,
      legacy_summary_ignored: legacySummaryNeedsValidation,
    };
    if (sessionCompactionCircuitOpen(state) && !options.force) return {
      compacted: false,
      reason: "circuit_breaker",
      before_tokens: tokenCount,
      consecutive_failures: state.consecutiveFailures,
    };
    const recentWindow = calculateSessionMemoryKeepWindow(history, {
      floorIndex: startIndex,
      lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
    });
    const keepStart = recentWindow.startIndex;
    const segment = history.slice(startIndex, keepStart);
    if (!segment.length) return { compacted: false, reason: "nothing_to_compact", before_tokens: tokenCount };
    const previousSummary = state.activeSummary || null;
    if (previousSummary && String(data.compaction?.active_summary_checksum || "") !== summaryChecksum(previousSummary)) {
      throw new Error("项目会话上一轮压缩摘要校验失败");
    }
    const currentReference = referenceSummary(segment);
    const reference = previousSummary ? {
      ...currentReference,
      primaryRequest: currentReference.primaryRequest || previousSummary.primaryRequest || "",
      userRequests: [...(previousSummary.userRequests || []), ...currentReference.userRequests].slice(-24),
      keyOutcomes: [...(previousSummary.keyOutcomes || []), ...currentReference.keyOutcomes].slice(-24),
      authorization: [...(previousSummary.authorization || []), ...currentReference.authorization].slice(-20),
      decisions: [...(previousSummary.decisions || []), ...currentReference.decisions].slice(-24),
      unresolved: [...(previousSummary.unresolved || []), ...currentReference.unresolved].slice(-24),
      filesAndResources: [...new Set([...(previousSummary.filesAndResources || []), ...currentReference.filesAndResources])].slice(-48),
      latestOutcome: currentReference.latestOutcome || previousSummary.latestOutcome || "",
    } : currentReference;
    const sourceMessageIds = reference.sourceMessageIds;
    const preHookResults = await runSessionCompactionHooks("pre_compact", {
      scope: "project",
      project: safeProject,
      sessionId: safeSessionId,
      trigger: options.force ? "manual" : "auto",
      customInstructions: options.customInstructions || "",
      previousSummary,
      tokenMeasurement,
    });
    const hookInstructions = preHookResults.map((item: any) => String(item?.customInstructions || item?.custom_instructions || "")).filter(Boolean).join("\n\n");
    const system = [
      "你是 CCM 项目会话压缩器。把旧对话压缩成可直接注入新 Claude Code/Codex/Cursor 会话的结构化上下文。",
      "只输出 JSON，不要 Markdown。不得编造。授权边界和文件路径必须逐字保留。",
      "消息边界由服务端绑定，无需返回 sourceMessageIds。",
      "字段固定为 primaryRequest,userRequests,keyOutcomes,authorization,decisions,unresolved,filesAndResources,latestOutcome。",
    ].join("\n");
    const promptPayload = {
      project: safeProject,
      projectSessionId: safeSessionId,
      customInstructions: compactText([options.customInstructions, hookInstructions].filter(Boolean).join("\n\n"), 4000),
      previousSummary,
      previousSummaryChecksum: state.activeSummaryChecksum || (previousSummary ? summaryChecksum(previousSummary) : ""),
      preservationReference: reference,
      timeline: segment.map((message: any) => ({ id: message.id, role: message.role, timestamp: message.timestamp, content: message.content })),
    };
    const maxInputTokens = Math.max(18_000, Number(compactionModelCapacity.effectiveContextWindow || 180_000) - 3_000);
    const promptFit = fitProjectCompactionPrompt(system, promptPayload, maxInputTokens);
    const invoke = options.modelCall || (async (request: any) => callCompactionModel(config, request.system, request.user, request.maxOutputTokens));
    let result: any = null;
    let validation: any = { valid: false, issues: ["summary_missing"] };
    let lastError: any = null;
    let nextSessionMemoryState = state.sessionMemoryState || null;
    const exactMemorySessionId = `${safeProject}:${safeSessionId}`;
    const expectedMemoryCursor = String(segment.at(-1)?.id || "");
    if (!options.customInstructions) {
      const reusable = validateSessionMemoryState(state.sessionMemoryState, {
        scope: "project",
        sessionId: exactMemorySessionId,
        expectedLastMessageId: expectedMemoryCursor,
      });
      if (reusable.valid) {
        validation = validateSummary(bindTrustedProjectSourceBoundary(reusable.summary, sourceMessageIds), reference, sourceMessageIds);
        if (validation.valid) result = { summary: reusable.summary, provider: state.sessionMemoryState?.provider, model: state.sessionMemoryState?.model, source: "session_memory" };
      }
    }
    let retryTimeline = promptFit.timeline;
    let retryUser = promptFit.user;
    let ptlRecoveryAttempts = Number(promptFit.projection.ptlRecoveryAttempts || 0);
    for (let attempt = 1; !validation.valid && attempt <= 4; attempt += 1) {
      try {
        result = await invoke({ system, user: retryUser, maxOutputTokens: MODEL_MAX_OUTPUT_TOKENS, attempt });
        const candidate = bindTrustedProjectSourceBoundary(result?.summary || result, sourceMessageIds);
        validation = validateSummary(candidate, reference, sourceMessageIds);
        if (validation.valid) break;
        lastError = new Error(`项目会话模型摘要校验失败：${validation.issues.join(", ")}`);
      } catch (error) {
        lastError = error;
        if (isPromptTooLong(error) && ptlRecoveryAttempts < 3) {
          const peeled = peelOldestCompleteConversationRound(retryTimeline);
          if (!peeled.peeled) break;
          retryTimeline = peeled.messages;
          ptlRecoveryAttempts += 1;
          retryUser = JSON.stringify({
            ...promptPayload,
            timeline: retryTimeline,
            timelineProjection: {
              strategy: "drop_oldest_complete_rounds",
              fullSourceMessageIds: sourceMessageIds,
              includedMessageIds: retryTimeline.map((message: any) => String(message?.id || "")),
              fullTranscriptRetained: true,
              ptlRecoveryAttempts,
            },
          });
        }
      }
    }
    if (!validation.valid) throw lastError || new Error("项目会话模型摘要不可用");
    const summary = normalizeSummary(result?.summary || result, sourceMessageIds);
    const verifiedRecoveryAttachments = buildVerifiedSessionRecoveryContext({
      rootDir: String(options.fixedContext?.workDir || options.fixedContext?.work_dir || ""),
      fileReferences: summary.filesAndResources || [],
      skills: Array.isArray(options.recoveryContext?.skills) ? options.recoveryContext.skills : [],
    });
    const sessionStartHookResults = await runSessionCompactionHooks("session_start", {
      scope: "project",
      project: safeProject,
      sessionId: safeSessionId,
      trigger: "compact",
      summary,
      previousSummary,
      recoveryContext: options.recoveryContext || {
        project: safeProject,
        filesAndResources: summary.filesAndResources || [],
        authorization: summary.authorization || [],
        unresolved: summary.unresolved || [],
        verifiedAttachments: verifiedRecoveryAttachments,
      },
    });
    const preservedMessages = history.slice(keepStart);
    const recoveryContext = options.recoveryContext || {
      project: safeProject,
      filesAndResources: summary.filesAndResources || [],
      authorization: summary.authorization || [],
      unresolved: summary.unresolved || [],
      verifiedAttachments: verifiedRecoveryAttachments,
    };
    const boundaryMarker = buildSessionCompactionBoundaryMarker({
      scope: "project",
      sessionId: `${safeProject}:${safeSessionId}`,
      generation: state.boundaryGeneration + 1,
      summarizedThroughMessageId: segment.at(-1)?.id || "",
      previousSummaryChecksum: state.activeSummaryChecksum || (previousSummary ? summaryChecksum(previousSummary) : ""),
      preservedMessageIds: preservedMessages.map((message: any) => String(message.id || "")),
    });
    const postCompactPayload = buildModelVisiblePayloadSnapshot({
      scope: "project",
      sessionId: `${safeProject}:${safeSessionId}`,
      system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model },
      tools: options.tools || null,
      activeSummary: summary,
      recentMessages: preservedMessages,
      currentRequest,
      recoveryContext: { boundaryMarker, ...recoveryContext },
      hookResults: sessionStartHookResults,
    });
    const afterTokens = postCompactPayload.totalTokens;
    const postCompactGate = buildSessionPostCompactGate({ modelVisiblePayload: postCompactPayload, threshold });
    if (postCompactGate.providerCallAllowed !== true) {
      const error: any = new Error(`项目会话压缩后仍超过阈值：${afterTokens}/${threshold}`);
      error.code = "PROJECT_SESSION_POST_COMPACT_THRESHOLD_EXCEEDED";
      error.postCompactGate = postCompactGate;
      throw error;
    }
    const archive = {
      id: `pca_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
      from_index: startIndex,
      to_index: keepStart - 1,
      source_message_ids: sourceMessageIds,
      summary,
      summary_checksum: summaryChecksum(summary),
      summary_source: "model",
      provider: result?.provider || "",
      model: result?.model || config.model || "",
      created_at: new Date().toISOString(),
      reason: options.reason || "auto_model",
        input_projection: promptFit.projection,
        ptl_recovery_attempts: ptlRecoveryAttempts,
      previous_summary_checksum: state.activeSummaryChecksum || (previousSummary ? summaryChecksum(previousSummary) : ""),
    };
    const beforeBinding = getProjectSessionAgentBinding(safeProject, safeSessionId);
    const rotation = rotateProjectSessionAgentBinding(safeProject, safeSessionId, `项目会话模型压缩 ${archive.id}`);
    try {
      const nextState = resetSessionCompactionFailures({
        ...state,
        activeSummary: summary,
        activeSummaryChecksum: summaryChecksum(summary),
        previousSummaryChecksum: state.activeSummaryChecksum || (previousSummary ? summaryChecksum(previousSummary) : ""),
        lastCompactedIndex: keepStart - 1,
        lastCompactedMessageId: segment.at(-1)?.id || "",
        preservedRecentMessageIds: history.slice(keepStart).map((message: any) => String(message.id || "")),
        preservedRecentTokens: recentWindow.preservedTokenCount,
        preservedRecentTextMessageCount: recentWindow.preservedTextMessageCount,
        latestProviderUsage: null,
        tokenMeasurement,
        sessionMemoryState: nextSessionMemoryState,
        postCompactGate,
        lastCompactedAt: new Date().toISOString(),
        boundaryGeneration: state.boundaryGeneration + 1,
        modelVisiblePayloadChecksum: postCompactPayload.payloadChecksum,
        fixedContextChecksum: postCompactPayload.fixedContextChecksum,
        pendingRequestChecksum: postCompactPayload.pendingRequestChecksum,
        boundaryMarker,
        preservedSegmentChecksum: sessionCompactionChecksum(preservedMessages.map((message: any) => String(message.id || ""))),
        recoveryContextTokens: postCompactPayload.tokenBreakdown.recoveryContext,
        hookResultTokens: postCompactPayload.tokenBreakdown.hookResults,
        ptlRecoveryAttempts,
      });
      data.compaction = {
        schema: "ccm-project-session-model-compaction-v2",
        mode: "model_required",
        summary_source: result?.source === "session_memory" ? "session_memory" : "model",
        active_summary: summary,
        active_summary_checksum: summaryChecksum(summary),
        archives: [...(Array.isArray(data.compaction?.archives) ? data.compaction.archives : []), archive].slice(-100),
        last_compacted_index: keepStart - 1,
        last_compacted_message_id: segment.at(-1)?.id || "",
        preserved_recent_message_ids: history.slice(keepStart).map((message: any) => message.id),
        preserved_recent_token_count: recentWindow.preservedTokenCount,
        preserved_recent_text_message_count: recentWindow.preservedTextMessageCount,
        recent_window: recentWindow,
        before_tokens: tokenCount,
        after_tokens: afterTokens,
        auto_compact_threshold: threshold,
        model_context_capacity: modelCapacity,
        compacted_at: new Date().toISOString(),
        rotated_from_generation: beforeBinding.generation,
        next_generation: rotation.nextGeneration,
        previous_summary_checksum: nextState.previousSummaryChecksum,
        latest_provider_usage: null,
        token_measurement: tokenMeasurement,
        session_memory_state: nextState.sessionMemoryState,
        post_compact_gate: postCompactGate,
        consecutive_failures: 0,
        boundary_generation: nextState.boundaryGeneration,
        boundary_marker: boundaryMarker,
        preserved_segment_checksum: nextState.preservedSegmentChecksum,
        model_visible_payload: postCompactPayload,
        resolved_model_capacity: modelCapacity,
        pending_request_tokens: postCompactPayload.tokenBreakdown.currentRequest,
        recovery_context_tokens: postCompactPayload.tokenBreakdown.recoveryContext,
        hook_result_tokens: postCompactPayload.tokenBreakdown.hookResults,
        ptl_recovery_attempts: ptlRecoveryAttempts,
        v2: nextState,
        hook_results: { pre: preHookResults, session_start: sessionStartHookResults },
      };
      data.updated_at = new Date().toISOString();
      persistSession(safeProject, safeSessionId, data);
    } catch (error) {
      reopenProjectSessionAgentBinding(safeProject, safeSessionId, "项目会话压缩提交失败，恢复旧世代");
      throw error;
    }
    const response = {
      compacted: true,
      archive_id: archive.id,
      before_tokens: data.compaction.before_tokens,
      after_tokens: data.compaction.after_tokens,
      preserved_messages: data.compaction.preserved_recent_message_ids.length,
      next_generation: data.compaction.next_generation,
      summary_source: "model",
      token_measurement: tokenMeasurement,
      post_compact_gate: postCompactGate,
      session_memory: data.compaction.session_memory_state,
      consecutive_failures: 0,
      model_context_capacity: modelCapacity,
      model_visible_payload: postCompactPayload,
      resolved_model_capacity: modelCapacity,
      pending_request_tokens: postCompactPayload.tokenBreakdown.currentRequest,
      recovery_context_tokens: postCompactPayload.tokenBreakdown.recoveryContext,
      hook_result_tokens: postCompactPayload.tokenBreakdown.hookResults,
      ptl_recovery_attempts: ptlRecoveryAttempts,
    };
    await runSessionCompactionHooks("post_compact", {
      scope: "project",
      project: safeProject,
      sessionId: safeSessionId,
      trigger: options.force ? "manual" : "auto",
      result: response,
    });
    return response;
  })().catch(error => {
    const file = sessionFile(safeProject, safeSessionId);
    if (fs.existsSync(file)) {
      const currentData = JSON.parse(fs.readFileSync(file, "utf8"));
      const failedState = recordSessionCompactionFailure(projectCompactionState(currentData, safeProject, safeSessionId), error);
      currentData.compaction = {
        ...(currentData.compaction || {}),
        consecutive_failures: failedState.consecutiveFailures,
        last_failure_at: failedState.lastFailureAt,
        last_error: failedState.lastError,
        v2: failedState,
      };
      currentData.updated_at = new Date().toISOString();
      persistSession(safeProject, safeSessionId, currentData);
    }
    throw error;
  }).finally(() => {
    if (compactions.get(scopeId)?.promise === operation) compactions.delete(scopeId);
  });
  compactions.set(scopeId, {
    promise: operation,
    reason: String(options.reason || "auto_model"),
    startedAt: new Date().toISOString(),
  });
  return operation;
}

export function buildProjectSessionPostCompactContext(project: string, projectSessionId: string, targetAgentType = "") {
  const file = sessionFile(project, projectSessionId);
  if (!fs.existsSync(file)) return "";
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const binding = getProjectSessionAgentBinding(project, projectSessionId);
  const targetProvider = targetAgentType ? normalizeAgentRuntimeId(targetAgentType) : "";
  if (binding.status === "open" && binding.turn_count > 0 && (!targetProvider || binding.provider === targetProvider)) return "";
  const state = projectCompactionState(data, project, projectSessionId);
  const summary = state.activeSummary || null;
  const compatibilitySummary = data.compaction?.active_summary || null;
  if (summary && compatibilitySummary && summaryChecksum(summary) !== summaryChecksum(compatibilitySummary)) {
    throw new Error("项目会话压缩摘要校验失败，V2 与兼容字段不一致");
  }
  if (summary && String(data.compaction?.active_summary_checksum || "") !== summaryChecksum(summary)) throw new Error("项目会话压缩摘要校验失败，拒绝注入");
  const history = Array.isArray(data.history) ? data.history.filter((message: any) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
  const recentFloor = Math.max(0, state.lastCompactedIndex + 1);
  const historyBeforeCurrentTurn = history.slice(0, -1);
  const recentWindow = calculateSessionMemoryKeepWindow(historyBeforeCurrentTurn, {
    floorIndex: recentFloor,
    lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
  });
  const recent = historyBeforeCurrentTurn.slice(recentWindow.startIndex).map((message: any) => ({ id: message.id, role: message.role, content: String(message.content || "") }));
  if (!summary && !recent.length) return "";
  return [
    "【当前项目逻辑会话连续性上下文】",
    "这是 CCM 为新第三方 Agent 会话世代恢复的历史上下文。执行前仍须核验当前文件和真实状态。",
    summary ? `模型压缩摘要：${JSON.stringify(summary)}` : "模型压缩摘要：无",
    recent.length ? `最近消息（${recentWindow.preservedTokenCount} tokens）：${JSON.stringify(recent)}` : "最近消息：无",
  ].join("\n");
}
