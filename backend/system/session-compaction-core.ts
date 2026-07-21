import { estimateTextTokens } from "./context-budget";
import * as crypto from "crypto";

export const SESSION_COMPACTION_STATE_SCHEMA = "ccm-session-compaction-state-v2";
export const SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES = 3;
export const SESSION_MEMORY_INITIAL_TOKENS = 10_000;
export const SESSION_MEMORY_UPDATE_GROWTH_TOKENS = 5_000;
export const SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
export const SESSION_MEMORY_EXTRACTION_WAIT_MS = 15_000;

export type SessionCompactionScope = "global" | "group" | "project" | "task_agent" | "music";
export type SessionCompactionHookPhase = "pre_compact" | "session_start" | "post_compact";

export type SessionProviderUsageBaseline = {
  scope?: SessionCompactionScope;
  sessionId?: string;
  provider?: string;
  model?: string;
  generation?: number;
  anchorMessageId?: string;
  boundaryGeneration?: number;
  inputTokens?: number;
  outputTokens?: number;
  directInputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  recordedAt?: string;
  estimatedContextTokens?: number;
  providerObservedContextTokens?: number;
  payloadChecksum?: string;
  fixedContextChecksum?: string;
  estimatedFixedTokens?: number;
  estimatedPayloadTokens?: number;
};

export type ModelVisiblePayloadSnapshot = {
  schema: "ccm-model-visible-payload-snapshot-v1";
  scope: SessionCompactionScope;
  sessionId: string;
  system: any;
  tools: any;
  activeSummary: any;
  recentMessages: any[];
  currentRequest: any;
  recoveryContext: any;
  hookResults: any[];
  tokenBreakdown: Record<string, number>;
  totalTokens: number;
  payloadChecksum: string;
  fixedContextChecksum: string;
  pendingRequestChecksum: string;
};

export type SessionCompactionStateV2 = {
  schema: typeof SESSION_COMPACTION_STATE_SCHEMA;
  scope: SessionCompactionScope;
  sessionId: string;
  activeSummary: any;
  activeSummaryChecksum: string;
  previousSummaryChecksum: string;
  lastCompactedIndex: number;
  lastCompactedMessageId: string;
  preservedRecentMessageIds: string[];
  preservedRecentTokens: number;
  preservedRecentTextMessageCount: number;
  latestProviderUsage: SessionProviderUsageBaseline | null;
  tokenMeasurement: any;
  sessionMemoryState: any;
  postCompactGate: any;
  consecutiveFailures: number;
  lastFailureAt: string;
  lastError: string;
  lastCompactedAt: string;
  boundaryGeneration: number;
  modelVisiblePayloadChecksum: string;
  fixedContextChecksum: string;
  pendingRequestChecksum: string;
  sessionMemoryExtraction: any;
  boundaryMarker: any;
  preservedSegmentChecksum: string;
  recoveryContextTokens: number;
  hookResultTokens: number;
  ptlRecoveryAttempts: number;
};

type SessionCompactionHook = (input: any) => any | Promise<any>;

const lifecycleHooks: Record<SessionCompactionHookPhase, Set<SessionCompactionHook>> = {
  pre_compact: new Set(),
  session_start: new Set(),
  post_compact: new Set(),
};

const sessionMemoryExtractions = new Map<string, { identity: any; promise: Promise<any>; startedAt: string }>();

function finiteToken(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function messageId(message: any) {
  return String(message?.id || message?.uuid || message?.messageId || "");
}

function messageContent(message: any) {
  const content = message?.content ?? message?.message?.content ?? "";
  return typeof content === "string" ? content : JSON.stringify(content);
}

function sessionMemoryChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

export function sessionCompactionChecksum(value: any) {
  return checksum(value);
}

function valueTokens(value: any) {
  if (value == null || value === "") return 0;
  return estimateTextTokens(typeof value === "string" ? value : JSON.stringify(value));
}

export function buildModelVisiblePayloadSnapshot(input: {
  scope: SessionCompactionScope;
  sessionId: string;
  system?: any;
  tools?: any;
  activeSummary?: any;
  recentMessages?: any[];
  currentRequest?: any;
  recoveryContext?: any;
  hookResults?: any[];
}): ModelVisiblePayloadSnapshot {
  const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages : [];
  const hookResults = Array.isArray(input.hookResults) ? input.hookResults : [];
  const fixedContext = { system: input.system ?? null, tools: input.tools ?? null, recoveryContext: input.recoveryContext ?? null, hookResults };
  const tokenBreakdown = {
    system: valueTokens(input.system),
    tools: valueTokens(input.tools),
    summary: valueTokens(input.activeSummary),
    recentMessages: recentMessages.reduce((sum, message) => sum + valueTokens(messageContent(message)), 0),
    currentRequest: valueTokens(input.currentRequest),
    recoveryContext: valueTokens(input.recoveryContext),
    hookResults: valueTokens(hookResults),
  };
  const payload = {
    system: input.system ?? null,
    tools: input.tools ?? null,
    activeSummary: input.activeSummary ?? null,
    recentMessages,
    currentRequest: input.currentRequest ?? null,
    recoveryContext: input.recoveryContext ?? null,
    hookResults,
  };
  return {
    schema: "ccm-model-visible-payload-snapshot-v1",
    scope: input.scope,
    sessionId: input.sessionId,
    ...payload,
    tokenBreakdown,
    totalTokens: Object.values(tokenBreakdown).reduce((sum, value) => sum + value, 0),
    payloadChecksum: checksum(payload),
    fixedContextChecksum: checksum(fixedContext),
    pendingRequestChecksum: input.currentRequest == null ? "" : checksum(input.currentRequest),
  };
}

function messageToolCallCount(message: any) {
  const content = message?.content ?? message?.message?.content;
  const blocks = Array.isArray(content) ? content : [];
  const blockCount = blocks.filter((block: any) => ["tool_use", "tool_result", "tool_call", "function_call"].includes(String(block?.type || ""))).length;
  const explicit = Array.isArray(message?.tool_calls) ? message.tool_calls.length : message?.tool_call || message?.toolUse ? 1 : 0;
  return blockCount + explicit;
}

export function evaluateSessionMemoryCadence(messagesInput: any[], stateInput: any = {}) {
  const messages = Array.isArray(messagesInput) ? messagesInput : [];
  const state = stateInput && typeof stateInput === "object" ? stateInput : {};
  const totalTokens = messages.reduce((sum, message) => sum + estimateTextTokens(messageContent(message)), 0);
  const lastMessageId = String(state.lastExtractedMessageId || state.last_extracted_message_id || "");
  const cursorIndex = lastMessageId ? messages.findIndex(message => messageId(message) === lastMessageId) : -1;
  const hasPriorSummary = !!(state.summary || state.activeSummary || state.markdown);
  const cursorValid = !hasPriorSummary || (!!lastMessageId && cursorIndex >= 0);
  const priorTokens = Math.max(0, Math.floor(Number(state.tokensAtLastExtraction ?? state.tokens_at_last_extraction ?? 0)));
  const growthTokens = Math.max(0, totalTokens - priorTokens);
  const messagesSinceCursor = cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
  const toolCallsSinceLastExtraction = messagesSinceCursor.reduce((sum, message) => sum + messageToolCallCount(message), 0);
  const shouldExtract = !hasPriorSummary
    ? totalTokens >= SESSION_MEMORY_INITIAL_TOKENS
    : cursorValid && (growthTokens >= SESSION_MEMORY_UPDATE_GROWTH_TOKENS || toolCallsSinceLastExtraction >= SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES);
  return {
    schema: "ccm-session-memory-cadence-v2",
    shouldExtract,
    reason: !cursorValid ? "cursor_mismatch"
      : !hasPriorSummary && totalTokens < SESSION_MEMORY_INITIAL_TOKENS ? "waiting_initial_10k"
      : hasPriorSummary && growthTokens < SESSION_MEMORY_UPDATE_GROWTH_TOKENS && toolCallsSinceLastExtraction < SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES ? "waiting_5k_or_3_tool_calls"
      : hasPriorSummary ? "update_due" : "initial_due",
    totalTokens,
    priorTokens,
    growthTokens,
    toolCallsSinceLastExtraction,
    cursorIndex,
    cursorValid,
    sourceLastMessageId: messageId(messages.at(-1)),
    sourceMessageIds: messages.map(messageId),
  };
}

export function validateSessionMemoryState(stateInput: any, input: { scope: SessionCompactionScope; sessionId: string; expectedLastMessageId?: string }) {
  const state = stateInput && typeof stateInput === "object" ? stateInput : {};
  const summary = state.summary ?? state.activeSummary ?? null;
  const checksum = String(state.summaryChecksum || state.summary_checksum || "");
  const issues = [
    String(state.scope || "") !== input.scope ? "scope_mismatch" : "",
    String(state.sessionId || state.session_id || "") !== input.sessionId ? "session_mismatch" : "",
    !summary ? "summary_missing" : "",
    summary && checksum !== sessionMemoryChecksum(summary) ? "checksum_mismatch" : "",
    input.expectedLastMessageId && String(state.lastExtractedMessageId || state.last_extracted_message_id || "") !== input.expectedLastMessageId ? "cursor_mismatch" : "",
  ].filter(Boolean);
  return { valid: issues.length === 0, issues, summary, checksum };
}

export async function waitForSessionMemoryExtraction<T>(promise: Promise<T>, timeoutMs = SESSION_MEMORY_EXTRACTION_WAIT_MS) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then(value => ({ status: "ready" as const, value })),
      new Promise<{ status: "timeout"; value: null }>(resolve => {
        timeout = setTimeout(() => resolve({ status: "timeout", value: null }), Math.max(1, timeoutMs));
      }),
    ]);
  } catch (error) {
    return { status: "failed" as const, value: null, error };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function extractionKey(scope: SessionCompactionScope, sessionId: string) {
  return `${scope}:${sessionId}`;
}

export function scheduleSessionMemoryExtraction(input: {
  scope: SessionCompactionScope;
  sessionId: string;
  identity: any;
  extract: () => Promise<any>;
  commit: (value: any, identity: any) => Promise<any> | any;
}) {
  const key = extractionKey(input.scope, input.sessionId);
  const existing = sessionMemoryExtractions.get(key);
  if (existing) return { scheduled: false, reason: "already_in_flight", startedAt: existing.startedAt, identity: existing.identity };
  const startedAt = new Date().toISOString();
  const promise = Promise.resolve()
    .then(input.extract)
    .then(value => input.commit(value, input.identity))
    .finally(() => {
      if (sessionMemoryExtractions.get(key)?.promise === promise) sessionMemoryExtractions.delete(key);
    });
  sessionMemoryExtractions.set(key, { identity: input.identity, promise, startedAt });
  promise.catch(() => undefined);
  return { scheduled: true, reason: "scheduled", startedAt, identity: input.identity };
}

export function inspectSessionMemoryExtraction(scope: SessionCompactionScope, sessionId: string) {
  const row = sessionMemoryExtractions.get(extractionKey(scope, sessionId));
  return row ? { inFlight: true, startedAt: row.startedAt, identity: row.identity } : { inFlight: false };
}

export async function waitForScheduledSessionMemoryExtraction(scope: SessionCompactionScope, sessionId: string, timeoutMs = SESSION_MEMORY_EXTRACTION_WAIT_MS) {
  const row = sessionMemoryExtractions.get(extractionKey(scope, sessionId));
  if (!row) return { status: "missing" as const, value: null };
  return waitForSessionMemoryExtraction(row.promise, timeoutMs);
}

export function buildSessionMemoryState(input: {
  scope: SessionCompactionScope;
  sessionId: string;
  summary: any;
  cadence: any;
  provider?: string;
  model?: string;
}) {
  return {
    schema: "ccm-session-memory-state-v2",
    scope: input.scope,
    sessionId: input.sessionId,
    summary: input.summary,
    summaryChecksum: sessionMemoryChecksum(input.summary),
    lastExtractedMessageId: String(input.cadence?.sourceLastMessageId || ""),
    sourceMessageIds: Array.isArray(input.cadence?.sourceMessageIds) ? input.cadence.sourceMessageIds : [],
    tokensAtLastExtraction: Number(input.cadence?.totalTokens || 0),
    toolCallsAtLastExtraction: Number(input.cadence?.toolCallsSinceLastExtraction || 0),
    provider: String(input.provider || ""),
    model: String(input.model || ""),
    extractionSource: "model",
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSessionProviderUsage(value: any): SessionProviderUsageBaseline | null {
  if (!value || typeof value !== "object") return null;
  const usage = value.usage && typeof value.usage === "object" ? value.usage : value;
  const normalized = {
    scope: String(value.scope || usage.scope || "") as SessionCompactionScope,
    sessionId: String(value.sessionId || value.session_id || usage.sessionId || usage.session_id || ""),
    provider: String(value.provider || usage.provider || ""),
    model: String(value.model || usage.model || ""),
    generation: Math.max(0, Math.floor(Number(value.generation ?? usage.generation ?? 0))),
    anchorMessageId: String(value.anchorMessageId || value.anchor_message_id || ""),
    boundaryGeneration: Math.max(0, Math.floor(Number(value.boundaryGeneration ?? value.boundary_generation ?? 0))),
    inputTokens: finiteToken(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: finiteToken(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens),
    directInputTokens: finiteToken(usage.directInputTokens ?? usage.direct_input_tokens),
    cacheCreationInputTokens: finiteToken(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens),
    cacheReadInputTokens: finiteToken(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens),
    recordedAt: String(value.recordedAt || value.recorded_at || new Date().toISOString()),
    estimatedContextTokens: finiteToken(value.estimatedContextTokens ?? value.estimated_context_tokens),
    providerObservedContextTokens: finiteToken(value.providerObservedContextTokens ?? value.provider_observed_context_tokens),
    payloadChecksum: String(value.payloadChecksum || value.payload_checksum || ""),
    fixedContextChecksum: String(value.fixedContextChecksum || value.fixed_context_checksum || ""),
    estimatedFixedTokens: finiteToken(value.estimatedFixedTokens ?? value.estimated_fixed_tokens),
    estimatedPayloadTokens: finiteToken(value.estimatedPayloadTokens ?? value.estimated_payload_tokens ?? value.estimatedContextTokens ?? value.estimated_context_tokens),
  };
  const providerObservedTokens = normalized.providerObservedContextTokens || (normalized.inputTokens || normalized.directInputTokens)
    + normalized.cacheCreationInputTokens
    + normalized.cacheReadInputTokens
    + normalized.outputTokens;
  return providerObservedTokens > 0 ? normalized : null;
}

export function providerObservedContextTokens(value: any) {
  const usage = normalizeSessionProviderUsage(value);
  if (!usage) return 0;
  return usage.providerObservedContextTokens || (usage.inputTokens! || usage.directInputTokens!)
    + usage.cacheCreationInputTokens!
    + usage.cacheReadInputTokens!
    + usage.outputTokens!;
}

export function measureSessionContextTokens(input: {
  scope?: SessionCompactionScope;
  sessionId?: string;
  messages?: any[];
  activeSummary?: any;
  fixedContext?: any;
  latestProviderUsage?: any;
  provider?: string;
  model?: string;
  generation?: number;
  boundaryGeneration?: number;
  modelVisiblePayload?: ModelVisiblePayloadSnapshot | null;
}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const usage = normalizeSessionProviderUsage(input.latestProviderUsage);
  const expectedProvider = String(input.provider || "");
  const expectedScope = String(input.scope || "");
  const expectedSessionId = String(input.sessionId || "");
  const expectedModel = String(input.model || "");
  const expectedGeneration = Math.max(0, Math.floor(Number(input.generation || 0)));
  const expectedBoundaryGeneration = Math.max(0, Math.floor(Number(input.boundaryGeneration || 0)));
  const payload = input.modelVisiblePayload?.schema === "ccm-model-visible-payload-snapshot-v1" ? input.modelVisiblePayload : null;
  const fixedIdentityValid = !payload || !!usage?.fixedContextChecksum && usage.fixedContextChecksum === payload.fixedContextChecksum;
  const identityValid = !!usage
    && (!expectedScope || usage.scope === expectedScope)
    && (!expectedSessionId || usage.sessionId === expectedSessionId)
    && (!expectedProvider || usage.provider === expectedProvider)
    && (!expectedModel || usage.model === expectedModel)
    && (!expectedGeneration || usage.generation === expectedGeneration)
    && usage.boundaryGeneration === expectedBoundaryGeneration
    && fixedIdentityValid;
  const anchorIndex = identityValid && usage?.anchorMessageId
    ? messages.findIndex(message => messageId(message) === usage.anchorMessageId)
    : -1;
  const snapshotBaselineValid = identityValid
    && Number(usage?.providerObservedContextTokens || 0) > 0
    && Number(usage?.estimatedContextTokens || 0) > 0;
  const baselineValid = identityValid && (anchorIndex >= 0 || snapshotBaselineValid);
  const estimatedSummaryTokens = payload ? payload.tokenBreakdown.summary : input.activeSummary == null ? 0 : estimateTextTokens(JSON.stringify(input.activeSummary));
  const estimatedFixedTokens = payload
    ? payload.tokenBreakdown.system + payload.tokenBreakdown.tools + payload.tokenBreakdown.recoveryContext + payload.tokenBreakdown.hookResults
    : input.fixedContext == null ? 0 : estimateTextTokens(typeof input.fixedContext === "string" ? input.fixedContext : JSON.stringify(input.fixedContext));
  const estimatedMessageTokens = payload ? payload.tokenBreakdown.recentMessages : messages.reduce((sum, message) => sum + estimateTextTokens(messageContent(message)), 0);
  const currentEstimatedPayloadTokens = payload?.totalTokens ?? estimatedSummaryTokens + estimatedFixedTokens + estimatedMessageTokens;
  const estimatedTokensAfterUsage = baselineValid
    ? payload && Number(usage?.estimatedPayloadTokens || 0) > 0
      ? Math.max(0, currentEstimatedPayloadTokens - Number(usage?.estimatedPayloadTokens || 0))
      : anchorIndex >= 0
      ? messages.slice(anchorIndex + 1).reduce((sum, message) => sum + estimateTextTokens(messageContent(message)), 0)
      : Math.max(0, currentEstimatedPayloadTokens - Number(usage?.estimatedContextTokens || 0))
    : 0;
  const observedTokens = baselineValid ? providerObservedContextTokens(usage) : 0;
  return {
    schema: "ccm-session-context-token-measurement-v2",
    method: baselineValid ? "latest_provider_usage_plus_new_message_estimate" : "model_visible_payload_estimate",
    activeTokens: baselineValid
      ? observedTokens + estimatedTokensAfterUsage
      : currentEstimatedPayloadTokens,
    providerObservedTokens: observedTokens,
    estimatedTokensAfterUsage,
    estimatedSummaryTokens,
    estimatedFixedTokens,
    estimatedMessageTokens,
    baselineValid,
    baselineIssues: baselineValid ? [] : [
      !usage ? "usage_missing" : "",
      usage && !identityValid ? "usage_identity_stale" : "",
      usage && identityValid && anchorIndex < 0 && !snapshotBaselineValid ? "usage_anchor_or_snapshot_missing" : "",
    ].filter(Boolean),
    anchorMessageId: usage?.anchorMessageId || "",
    provider: usage?.provider || expectedProvider,
    model: usage?.model || expectedModel,
    generation: usage?.generation || expectedGeneration,
    boundaryGeneration: expectedBoundaryGeneration,
    modelVisiblePayload: payload,
    payloadChecksum: payload?.payloadChecksum || "",
    fixedContextChecksum: payload?.fixedContextChecksum || "",
    pendingRequestChecksum: payload?.pendingRequestChecksum || "",
  };
}

export function buildSessionPostCompactGate(input: { afterTokens?: number; threshold: number; modelVisiblePayload?: ModelVisiblePayloadSnapshot | null }) {
  const afterTokens = Math.max(0, Math.floor(Number(input.modelVisiblePayload?.totalTokens ?? input.afterTokens ?? 0)));
  const threshold = Math.max(1, Math.floor(Number(input.threshold || 0)));
  const ready = afterTokens < threshold;
  return {
    schema: "ccm-session-post-compact-gate-v2",
    status: ready ? "ready" : "recompact_required",
    providerCallAllowed: ready,
    afterTokens,
    threshold,
    remainingTokens: Math.max(0, threshold - afterTokens),
    payloadChecksum: input.modelVisiblePayload?.payloadChecksum || "",
    fixedContextChecksum: input.modelVisiblePayload?.fixedContextChecksum || "",
    tokenBreakdown: input.modelVisiblePayload?.tokenBreakdown || null,
  };
}

export function buildSessionCompactionBoundaryMarker(input: {
  scope: SessionCompactionScope;
  sessionId: string;
  generation: number;
  summarizedThroughMessageId?: string;
  previousSummaryChecksum?: string;
  preservedMessageIds?: string[];
}) {
  const core = {
    schema: "ccm-session-compact-boundary-v2",
    type: "compact_boundary",
    scope: input.scope,
    sessionId: input.sessionId,
    generation: Math.max(0, Math.floor(Number(input.generation || 0))),
    summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
    previousSummaryChecksum: String(input.previousSummaryChecksum || ""),
    preservedMessageIds: Array.isArray(input.preservedMessageIds) ? input.preservedMessageIds.map(String) : [],
  };
  return { ...core, checksum: checksum(core) };
}

export function normalizeSessionCompactionState(value: any, input: {
  scope: SessionCompactionScope;
  sessionId: string;
}): SessionCompactionStateV2 {
  const source = value && typeof value === "object" ? value : {};
  return {
    schema: SESSION_COMPACTION_STATE_SCHEMA,
    scope: input.scope,
    sessionId: input.sessionId,
    activeSummary: source.activeSummary ?? source.active_summary ?? source.summary ?? null,
    activeSummaryChecksum: String(source.activeSummaryChecksum || source.active_summary_checksum || source.summaryChecksum || ""),
    previousSummaryChecksum: String(source.previousSummaryChecksum || source.previous_summary_checksum || ""),
    lastCompactedIndex: Math.floor(Number(source.lastCompactedIndex ?? source.last_compacted_index ?? -1)),
    lastCompactedMessageId: String(source.lastCompactedMessageId || source.last_compacted_message_id || ""),
    preservedRecentMessageIds: Array.isArray(source.preservedRecentMessageIds || source.preserved_recent_message_ids)
      ? [...(source.preservedRecentMessageIds || source.preserved_recent_message_ids)].map(String)
      : [],
    preservedRecentTokens: Math.max(0, Math.floor(Number(source.preservedRecentTokens ?? source.preserved_recent_token_count ?? 0))),
    preservedRecentTextMessageCount: Math.max(0, Math.floor(Number(source.preservedRecentTextMessageCount ?? source.preserved_recent_text_message_count ?? 0))),
    latestProviderUsage: normalizeSessionProviderUsage(source.latestProviderUsage || source.latest_provider_usage),
    tokenMeasurement: source.tokenMeasurement || source.token_measurement || null,
    sessionMemoryState: source.sessionMemoryState || source.session_memory_state || null,
    postCompactGate: source.postCompactGate || source.post_compact_gate || null,
    consecutiveFailures: Math.max(0, Math.floor(Number(source.consecutiveFailures ?? source.consecutive_failures ?? 0))),
    lastFailureAt: String(source.lastFailureAt || source.last_failure_at || ""),
    lastError: String(source.lastError || source.last_error || ""),
    lastCompactedAt: String(source.lastCompactedAt || source.last_compacted_at || source.compacted_at || ""),
    boundaryGeneration: Math.max(0, Math.floor(Number(source.boundaryGeneration ?? source.boundary_generation ?? 0))),
    modelVisiblePayloadChecksum: String(source.modelVisiblePayloadChecksum || source.model_visible_payload_checksum || ""),
    fixedContextChecksum: String(source.fixedContextChecksum || source.fixed_context_checksum || ""),
    pendingRequestChecksum: String(source.pendingRequestChecksum || source.pending_request_checksum || ""),
    sessionMemoryExtraction: source.sessionMemoryExtraction || source.session_memory_extraction || null,
    boundaryMarker: source.boundaryMarker || source.boundary_marker || null,
    preservedSegmentChecksum: String(source.preservedSegmentChecksum || source.preserved_segment_checksum || ""),
    recoveryContextTokens: Math.max(0, Math.floor(Number(source.recoveryContextTokens ?? source.recovery_context_tokens ?? 0))),
    hookResultTokens: Math.max(0, Math.floor(Number(source.hookResultTokens ?? source.hook_result_tokens ?? 0))),
    ptlRecoveryAttempts: Math.max(0, Math.floor(Number(source.ptlRecoveryAttempts ?? source.ptl_recovery_attempts ?? 0))),
  };
}

export function sessionCompactionCircuitOpen(state: any) {
  return Number(state?.consecutiveFailures ?? state?.consecutive_failures ?? 0) >= SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES;
}

export function recordSessionCompactionFailure(state: any, error: any) {
  const normalized = { ...(state || {}) };
  normalized.consecutiveFailures = Math.min(
    SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES,
    Math.max(0, Number(normalized.consecutiveFailures || 0)) + 1,
  );
  normalized.lastFailureAt = new Date().toISOString();
  normalized.lastError = String(error?.message || error || "session_compaction_failed").slice(0, 800);
  return normalized;
}

export function resetSessionCompactionFailures(state: any) {
  return { ...(state || {}), consecutiveFailures: 0, lastFailureAt: "", lastError: "" };
}

export function registerSessionCompactionHook(phase: SessionCompactionHookPhase, hook: SessionCompactionHook) {
  lifecycleHooks[phase].add(hook);
  return () => lifecycleHooks[phase].delete(hook);
}

export async function runSessionCompactionHooks(phase: SessionCompactionHookPhase, input: any) {
  const results: any[] = [];
  for (const hook of lifecycleHooks[phase]) results.push(await hook({ ...input, phase }));
  return results.filter(result => result !== undefined && result !== null);
}
