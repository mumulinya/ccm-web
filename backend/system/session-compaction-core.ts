import { estimateTextTokens } from "./context-budget";
import { estimateModelTextTokens } from "./model-token-preflight";
import * as crypto from "crypto";
import { recordContextEngineEvent } from "./context-engine-observability";
import { isUserMcpToolDefinition, selectUserMcpToolDefinitions, runSessionContextToolBucketSelfTest } from "./session-context-tool-buckets";
import {
  normalizeCcmPrimaryTokenBreakdown,
  normalizeCcmTechnicalTokenBreakdown,
  sumCcmPrimaryTokenBreakdown,
  buildCcmProviderIdentityChecksum,
  type CcmPrimaryTokenBreakdownV2,
  type CcmTechnicalTokenBreakdownV2,
} from "./ccm-context-accounting-v2";

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
  protocol?: string;
  endpoint?: string;
  providerIdentityChecksum?: string;
  generation?: number;
  anchorMessageId?: string;
  boundaryGeneration?: number;
  inputTokens?: number;
  outputTokens?: number;
  directInputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  inputTokensIncludesCache?: boolean;
  recordedAt?: string;
  estimatedContextTokens?: number;
  providerObservedContextTokens?: number;
  payloadChecksum?: string;
  fixedContextChecksum?: string;
  estimatedFixedTokens?: number;
  estimatedPayloadTokens?: number;
};

export type ModelVisiblePayloadSnapshot = {
  schema: "ccm-model-visible-payload-snapshot-v2";
  scope: SessionCompactionScope;
  sessionId: string;
  system: any;
  tools: any;
  activeSummary: any;
  recentMessages: any[];
  currentRequest: any;
  recoveryContext: any;
  hookResults: any[];
  messages: any[];
  exactSessionId: string;
  provider: string;
  model: string;
  protocol: string;
  tokenBreakdown: Record<string, number>;
  totalTokens: number;
  predictedNextRequestTokens: number;
  unresolvedToolPairCount: number;
  payloadChecksum: string;
  fixedContextChecksum: string;
  pendingRequestChecksum: string;
  loadedContextItems: LoadedContextItemsV1;
  loadedContextItemsChecksum: string;
  accountingSchema: "ccm-context-accounting-v2";
  primaryTokenBreakdown: CcmPrimaryTokenBreakdownV2;
  technicalTokenBreakdown: CcmTechnicalTokenBreakdownV2;
  primaryTokenTotal: number;
};

export type LoadedContextItemV1 = {
  kind: "skill" | "mcp";
  name: string;
  aliases: string[];
  loadLevel: "catalog" | "body" | "schema" | "result";
  checksum: string;
  loadSource?: "same_run" | "post_compact_restored" | "always_load" | "catalog";
  tokens?: number;
  dropReason?: string;
};

export type InvokedContextItemV1 = {
  kind: "skill" | "mcp";
  name: string;
  aliases: string[];
  ok: boolean;
  resultChecksum: string;
};

export type LoadedContextItemsV1 = {
  schema: "ccm-loaded-context-items-v1";
  skills: LoadedContextItemV1[];
  mcp: LoadedContextItemV1[];
  invocations: InvokedContextItemV1[];
};

const MODEL_VISIBLE_FIXED_TOKEN_KEYS = [
  "system",
  "tools",
  "rules",
  "skills",
  "mcpTools",
  "subagentDefinitions",
  "recoveryContext",
  "hookResults",
] as const;

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
  dynamicContextRestoreManifest: any;
  dynamicContextRestoreReceipt: any;
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
  if (Array.isArray(value) && value.length === 0) return 0;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return 0;
  return estimateTextTokens(typeof value === "string" ? value : JSON.stringify(value));
}

type ContextComponentHints = {
  rules?: any;
  skills?: any;
  mcpTools?: any;
  mcpResults?: any;
  subagentDefinitions?: any;
  messageRules?: any;
  messageSkills?: any;
  messageMcpTools?: any;
  messageSubagentDefinitions?: any;
  loadedContextItems?: Partial<LoadedContextItemsV1>;
};

function normalizedContextItemName(value: any) {
  return String(value || "").trim().slice(0, 240);
}

function normalizeContextAliases(value: any, name: string) {
  return Array.from(new Set([name, ...(Array.isArray(value) ? value : [])]
    .map(normalizedContextItemName)
    .filter(Boolean))).slice(0, 12);
}

function normalizeLoadedContextItems(value: any): LoadedContextItemsV1 {
  const normalizeLoaded = (rows: any, kind: "skill" | "mcp") => (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const name = normalizedContextItemName(row?.name);
      if (!name) return null;
      const requestedLevel = String(row?.loadLevel || row?.level || "");
      const loadLevel = kind === "skill"
        ? (requestedLevel === "body" || requestedLevel === "result" ? requestedLevel : "catalog")
        : (requestedLevel === "result" ? "result" : requestedLevel === "schema" ? "schema" : "catalog");
      return {
        kind,
        name,
        aliases: normalizeContextAliases(row?.aliases, name),
        loadLevel,
        checksum: normalizedContextItemName(row?.checksum || row?.contentHash || row?.content_hash),
        loadSource: (["same_run", "post_compact_restored", "always_load", "catalog"].includes(String(row?.loadSource || row?.load_source))
          ? String(row?.loadSource || row?.load_source)
          : undefined) as LoadedContextItemV1["loadSource"],
        tokens: Math.max(0, Math.floor(Number(row?.tokens || row?.tokenCount || row?.token_count || 0))),
        dropReason: normalizedContextItemName(row?.dropReason || row?.drop_reason),
      } as LoadedContextItemV1;
    })
    .filter(Boolean)
    .slice(0, 200) as LoadedContextItemV1[];
  const invocations = (Array.isArray(value?.invocations) ? value.invocations : [])
    .map((row: any) => {
      const kind = String(row?.kind || "") === "skill" ? "skill" : String(row?.kind || "") === "mcp" ? "mcp" : "";
      const name = normalizedContextItemName(row?.name || row?.itemName);
      if (!kind || !name) return null;
      return {
        kind,
        name,
        aliases: normalizeContextAliases(row?.aliases, name),
        ok: row?.ok === true,
        resultChecksum: normalizedContextItemName(row?.resultChecksum || row?.result_checksum || row?.checksum),
      } as InvokedContextItemV1;
    })
    .filter(Boolean)
    .slice(0, 200) as InvokedContextItemV1[];
  return {
    schema: "ccm-loaded-context-items-v1",
    skills: normalizeLoaded(value?.skills, "skill"),
    mcp: normalizeLoaded(value?.mcp, "mcp"),
    invocations,
  };
}

function contextComponentKey(key: string) {
  const value = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (/skill/.test(value)) return "skills";
  if (/mcp|dynamictool/.test(value)) return "mcpTools";
  if (/subagent|agentdefinition|agentcatalog|projectdirectory|groupmember|members/.test(value)) return "subagentDefinitions";
  if (/rule|policy|instruction|constraint|permission|authorization|boundary/.test(value)) return "rules";
  return "";
}

function structuredContextHints(value: any): Record<string, number> {
  const result: Record<string, number> = {};
  const visit = (current: any) => {
    if (!current || typeof current !== "object") return;
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    for (const [key, entry] of Object.entries(current)) {
      const component = contextComponentKey(key);
      if (component) result[component] = (result[component] || 0) + valueTokens({ [key]: entry });
      else visit(entry);
    }
  };
  visit(value);
  return result;
}

function userMcpHintTokens(value: any) {
  if (value == null || value === "") return 0;
  const selected = selectUserMcpToolDefinitions(value);
  if (selected.length) return valueTokens(selected);
  if (Array.isArray(value) || (value && typeof value === "object")) return 0;
  return 0;
}

function toolContextHints(value: any) {
  const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  let mcpTools = 0;
  let subagentDefinitions = 0;
  for (const item of items) {
    const identity = JSON.stringify({ name: item?.name || item?.function?.name || item?.id || "", type: item?.type || "", source: item?.source || "" });
    const tokens = valueTokens(item);
    if (/subagent|task[_-]?agent|worker[_-]?agent/i.test(identity)) subagentDefinitions += tokens;
    else if (isUserMcpToolDefinition(item)) mcpTools += tokens;
  }
  return { mcpTools, subagentDefinitions };
}

function partitionTokens(totalInput: number, requestedInput: Record<string, number>) {
  const total = Math.max(0, Math.floor(totalInput));
  const requested = Object.fromEntries(Object.entries(requestedInput).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value || 0)))]));
  const requestedTotal = Object.values(requested).reduce((sum, value) => sum + value, 0);
  if (!requestedTotal) return { allocated: requested, remaining: total };
  if (requestedTotal <= total) return { allocated: requested, remaining: total - requestedTotal };
  const allocated: Record<string, number> = {};
  let used = 0;
  const entries = Object.entries(requested);
  entries.forEach(([key, value], index) => {
    const next = index === entries.length - 1 ? total - used : Math.floor((value / requestedTotal) * total);
    allocated[key] = Math.max(0, next);
    used += allocated[key];
  });
  return { allocated, remaining: 0 };
}

export function buildModelVisiblePayloadSnapshot(input: {
  scope: SessionCompactionScope;
  sessionId: string;
  exactSessionId?: string;
  provider?: string;
  model?: string;
  protocol?: string;
  modelConfig?: any;
  system?: any;
  tools?: any;
  activeSummary?: any;
  recentMessages?: any[];
  currentRequest?: any;
  recoveryContext?: any;
  hookResults?: any[];
  contextComponents?: ContextComponentHints;
}): ModelVisiblePayloadSnapshot {
  const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages : [];
  const hookResults = Array.isArray(input.hookResults) ? input.hookResults : [];
  const fixedContext = { system: input.system ?? null, tools: input.tools ?? null, recoveryContext: input.recoveryContext ?? null, hookResults };
  const modelConfig = input.modelConfig || { provider: input.provider, model: input.model, format: input.protocol };
  const modelValueTokens = (value: any) => {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return 0;
    try { return estimateModelTextTokens(value, modelConfig).safetyAdjustedTokens; } catch { return valueTokens(value); }
  };
  const rawSystemTokens = modelValueTokens(input.system);
  const rawToolTokens = modelValueTokens(input.tools);
  const structuredHints = structuredContextHints(input.system);
  const toolHints = toolContextHints(input.tools);
  const explicit = input.contextComponents || {};
  const loadedContextItems = normalizeLoadedContextItems(explicit.loadedContextItems);
  const toolMcpTokens = toolHints.mcpTools;
  const toolSubagentTokens = toolHints.subagentDefinitions;
  const toolPartition = partitionTokens(rawToolTokens, { mcpTools: toolMcpTokens, subagentDefinitions: toolSubagentTokens });
  const rawRecentMessageTokens = recentMessages.reduce((sum, message) => sum + modelValueTokens(messageContent(message)), 0);
  const recentPartition = partitionTokens(rawRecentMessageTokens, {
    rules: explicit.messageRules === undefined ? 0 : modelValueTokens(explicit.messageRules),
    skills: explicit.messageSkills === undefined ? 0 : modelValueTokens(explicit.messageSkills),
    mcpTools: explicit.messageMcpTools === undefined ? 0 : userMcpHintTokens(explicit.messageMcpTools),
    subagentDefinitions: explicit.messageSubagentDefinitions === undefined ? 0 : modelValueTokens(explicit.messageSubagentDefinitions),
  });
  const systemPartition = partitionTokens(rawSystemTokens, {
    rules: explicit.rules === undefined ? structuredHints.rules || 0 : modelValueTokens(explicit.rules),
    skills: explicit.skills === undefined ? structuredHints.skills || 0 : modelValueTokens(explicit.skills),
    mcpTools: rawToolTokens > 0 ? 0 : explicit.mcpTools === undefined ? structuredHints.mcpTools || 0 : userMcpHintTokens(explicit.mcpTools),
    subagentDefinitions: explicit.subagentDefinitions === undefined ? structuredHints.subagentDefinitions || 0 : modelValueTokens(explicit.subagentDefinitions),
  });
  const tokenBreakdown = {
    system: systemPartition.remaining,
    tools: toolPartition.remaining,
    rules: Number(systemPartition.allocated.rules || 0) + Number(recentPartition.allocated.rules || 0),
    skills: Number(systemPartition.allocated.skills || 0) + Number(recentPartition.allocated.skills || 0),
    mcpTools: Number(systemPartition.allocated.mcpTools || 0) + Number(toolPartition.allocated.mcpTools || 0) + Number(recentPartition.allocated.mcpTools || 0),
    // Tool results are part of the model-visible conversation timeline. Keep
    // the legacy field at zero so the same tokens cannot be counted a second
    // time as a separate MCP result bucket.
    mcpResults: 0,
    subagentDefinitions: Number(systemPartition.allocated.subagentDefinitions || 0) + Number(toolPartition.allocated.subagentDefinitions || 0) + Number(recentPartition.allocated.subagentDefinitions || 0),
    summary: modelValueTokens(input.activeSummary),
    recentMessages: recentPartition.remaining + Number(recentPartition.allocated.mcpResults || 0),
    currentRequest: modelValueTokens(input.currentRequest),
    recoveryContext: modelValueTokens(input.recoveryContext),
    hookResults: modelValueTokens(hookResults),
  };
  const primaryTokenBreakdown = normalizeCcmPrimaryTokenBreakdown({
    ...tokenBreakdown,
  });
  const technicalTokenBreakdown = normalizeCcmTechnicalTokenBreakdown(tokenBreakdown);
  const payload = {
    system: input.system ?? null,
    tools: input.tools ?? null,
    activeSummary: input.activeSummary ?? null,
    recentMessages,
    currentRequest: input.currentRequest ?? null,
    recoveryContext: input.recoveryContext ?? null,
    hookResults,
  };
  const messages = [
    ...(Array.isArray(input.system) ? input.system : input.system == null ? [] : [{ role: "system", content: input.system }]),
    ...(input.activeSummary == null ? [] : [{ role: "system", content: input.activeSummary, ccm_summary: true }]),
    ...recentMessages,
    ...(input.currentRequest == null ? [] : [input.currentRequest]),
  ];
  return {
    schema: "ccm-model-visible-payload-snapshot-v2",
    scope: input.scope,
    sessionId: input.sessionId,
    exactSessionId: input.exactSessionId || input.sessionId,
    provider: String(input.provider || modelConfig.provider || ""),
    model: String(input.model || modelConfig.model || ""),
    protocol: String(input.protocol || modelConfig.protocol || modelConfig.format || ""),
    ...payload,
    messages,
    tokenBreakdown,
    accountingSchema: "ccm-context-accounting-v2",
    primaryTokenBreakdown,
    technicalTokenBreakdown,
    primaryTokenTotal: sumCcmPrimaryTokenBreakdown(primaryTokenBreakdown),
    totalTokens: Object.values(tokenBreakdown).reduce((sum, value) => sum + value, 0),
    predictedNextRequestTokens: Object.values(tokenBreakdown).reduce((sum, value) => sum + value, 0),
    unresolvedToolPairCount: unresolvedToolPairCount(messages),
    payloadChecksum: checksum(payload),
    fixedContextChecksum: checksum(fixedContext),
    pendingRequestChecksum: input.currentRequest == null ? "" : checksum(input.currentRequest),
    loadedContextItems,
    loadedContextItemsChecksum: checksum(loadedContextItems),
  };
}

export function modelVisibleFixedTokens(snapshot: Pick<ModelVisiblePayloadSnapshot, "tokenBreakdown"> | null | undefined) {
  const breakdown = snapshot?.tokenBreakdown || {};
  return MODEL_VISIBLE_FIXED_TOKEN_KEYS.reduce((sum, key) => sum + Math.max(0, Math.floor(Number(breakdown[key] || 0))), 0);
}

export function isModelVisiblePayloadSnapshot(value: any): value is ModelVisiblePayloadSnapshot {
  return value?.schema === "ccm-model-visible-payload-snapshot-v2"
    || value?.schema === "ccm-model-visible-payload-snapshot-v1";
}

export function modelVisiblePayloadAccounting(snapshot: ModelVisiblePayloadSnapshot | null | undefined) {
  if (!snapshot) return null;
  return {
    schema: "ccm-model-visible-payload-accounting-v2",
    scope: snapshot.scope,
    sessionId: snapshot.sessionId,
    exactSessionId: snapshot.exactSessionId || snapshot.sessionId,
    provider: snapshot.provider || "",
    model: snapshot.model || "",
    protocol: snapshot.protocol || "",
    messages: Array.isArray(snapshot.messages) ? snapshot.messages.map((item: any) => ({ role: item?.role, type: item?.type, id: item?.id })) : [],
    tokenBreakdown: { ...snapshot.tokenBreakdown },
    accountingSchema: "ccm-context-accounting-v2",
    primaryTokenBreakdown: normalizeCcmPrimaryTokenBreakdown(snapshot.primaryTokenBreakdown || snapshot.tokenBreakdown),
    technicalTokenBreakdown: normalizeCcmTechnicalTokenBreakdown(snapshot.technicalTokenBreakdown || snapshot.tokenBreakdown),
    primaryTokenTotal: Number(snapshot.primaryTokenTotal || sumCcmPrimaryTokenBreakdown(normalizeCcmPrimaryTokenBreakdown(snapshot.primaryTokenBreakdown || snapshot.tokenBreakdown))),
    totalTokens: snapshot.totalTokens,
    predictedNextRequestTokens: snapshot.predictedNextRequestTokens || snapshot.totalTokens,
    unresolvedToolPairCount: Number(snapshot.unresolvedToolPairCount || 0),
    payloadChecksum: snapshot.payloadChecksum,
    fixedContextChecksum: snapshot.fixedContextChecksum,
    pendingRequestChecksum: snapshot.pendingRequestChecksum,
    loadedContextItems: normalizeLoadedContextItems(snapshot.loadedContextItems),
    loadedContextItemsChecksum: snapshot.loadedContextItemsChecksum || checksum(normalizeLoadedContextItems(snapshot.loadedContextItems)),
    contentStored: false,
  };
}

function messageToolCallCount(message: any) {
  const content = message?.content ?? message?.message?.content;
  const blocks = Array.isArray(content) ? content : [];
  const blockCount = blocks.filter((block: any) => ["tool_use", "tool_result", "tool_call", "function_call"].includes(String(block?.type || ""))).length;
  const explicit = Array.isArray(message?.tool_calls) ? message.tool_calls.length : message?.tool_call || message?.toolUse ? 1 : 0;
  return blockCount + explicit;
}

function unresolvedToolPairCount(messages: any[]) {
  const uses = new Set<string>();
  const results = new Set<string>();
  for (const message of Array.isArray(messages) ? messages : []) {
    const blocks = Array.isArray(message?.content) ? message.content : [];
    for (const block of blocks) {
      const type = String(block?.type || "");
      const id = String(block?.id || block?.tool_use_id || block?.toolUseId || "");
      if (!id) continue;
      if (["tool_use", "tool_call", "function_call", "server_tool_use"].includes(type)) uses.add(id);
      if (["tool_result", "function_result", "web_search_tool_result"].includes(type)) results.add(id);
    }
    if (["tool_use", "tool_call", "function_call"].includes(String(message?.type || ""))) uses.add(String(message?.toolCallId || message?.tool_call_id || message?.id || ""));
    if (["tool_result", "function_result"].includes(String(message?.type || ""))) results.add(String(message?.toolCallId || message?.tool_call_id || message?.tool_use_id || message?.id || ""));
  }
  return [...uses].filter(id => id && !results.has(id)).length;
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
    protocol: String(value.protocol || value.format || usage.protocol || usage.format || ""),
    endpoint: String(value.endpoint || value.apiUrl || value.api_url || usage.endpoint || ""),
    providerIdentityChecksum: String(value.providerIdentityChecksum || value.provider_identity_checksum || usage.providerIdentityChecksum || usage.provider_identity_checksum || ""),
    generation: Math.max(0, Math.floor(Number(value.generation ?? usage.generation ?? 0))),
    anchorMessageId: String(value.anchorMessageId || value.anchor_message_id || ""),
    boundaryGeneration: Math.max(0, Math.floor(Number(value.boundaryGeneration ?? value.boundary_generation ?? 0))),
    inputTokens: finiteToken(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: finiteToken(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens),
    directInputTokens: finiteToken(usage.directInputTokens ?? usage.direct_input_tokens),
    cacheCreationInputTokens: finiteToken(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens),
    cacheReadInputTokens: finiteToken(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens),
    inputTokensIncludesCache: usage.inputTokensIncludesCache === true || usage.input_tokens_includes_cache === true,
    recordedAt: String(value.recordedAt || value.recorded_at || new Date().toISOString()),
    estimatedContextTokens: finiteToken(value.estimatedContextTokens ?? value.estimated_context_tokens),
    providerObservedContextTokens: finiteToken(value.providerObservedContextTokens ?? value.provider_observed_context_tokens),
    payloadChecksum: String(value.payloadChecksum || value.payload_checksum || ""),
    fixedContextChecksum: String(value.fixedContextChecksum || value.fixed_context_checksum || ""),
    estimatedFixedTokens: finiteToken(value.estimatedFixedTokens ?? value.estimated_fixed_tokens),
    estimatedPayloadTokens: finiteToken(value.estimatedPayloadTokens ?? value.estimated_payload_tokens ?? value.estimatedContextTokens ?? value.estimated_context_tokens),
  };
  // Input usage is the context-window measurement. Output tokens are tracked
  // separately for cost/output reporting and must never inflate active input
  // context. Providers that expose split cache fields default to an input
  // value excluding those fields; adapters may explicitly mark aggregate
  // input_tokens as already including cache to avoid double counting.
  const baseInputTokens = normalized.inputTokens || normalized.directInputTokens;
  const cacheTokens = normalized.inputTokensIncludesCache ? 0 : normalized.cacheCreationInputTokens + normalized.cacheReadInputTokens;
  const providerObservedTokens = normalized.providerObservedContextTokens || baseInputTokens + cacheTokens;
  normalized.providerObservedContextTokens = providerObservedTokens;
  if (!normalized.providerIdentityChecksum && (normalized.provider || normalized.model || normalized.protocol || normalized.endpoint)) {
    normalized.providerIdentityChecksum = buildCcmProviderIdentityChecksum(normalized);
  }
  return providerObservedTokens > 0 ? normalized : null;
}

export function providerObservedContextTokens(value: any) {
  const usage = normalizeSessionProviderUsage(value);
  if (!usage) return 0;
  const baseInputTokens = usage.inputTokens! || usage.directInputTokens!;
  const cacheTokens = usage.inputTokensIncludesCache ? 0 : usage.cacheCreationInputTokens! + usage.cacheReadInputTokens!;
  return usage.providerObservedContextTokens || baseInputTokens + cacheTokens;
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
  protocol?: string;
  endpoint?: string;
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
  const expectedProtocol = String(input.protocol || "");
  const expectedEndpoint = String(input.endpoint || "");
  const expectedGeneration = Math.max(0, Math.floor(Number(input.generation || 0)));
  const expectedBoundaryGeneration = Math.max(0, Math.floor(Number(input.boundaryGeneration || 0)));
  const payload = isModelVisiblePayloadSnapshot(input.modelVisiblePayload) ? input.modelVisiblePayload : null;
  const fixedIdentityValid = !payload || !!usage?.fixedContextChecksum && usage.fixedContextChecksum === payload.fixedContextChecksum;
  const identityValid = !!usage
    && (!expectedScope || usage.scope === expectedScope)
    && (!expectedSessionId || usage.sessionId === expectedSessionId)
    && (!expectedProvider || usage.provider === expectedProvider)
    && (!expectedModel || usage.model === expectedModel)
    && (!expectedProtocol || usage.protocol === expectedProtocol)
    && (!expectedEndpoint || usage.endpoint === expectedEndpoint)
    && (!expectedGeneration || usage.generation === expectedGeneration)
    && usage.boundaryGeneration === expectedBoundaryGeneration
    && fixedIdentityValid;
  const anchorIndex = identityValid && usage?.anchorMessageId
    ? messages.findIndex(message => messageId(message) === usage.anchorMessageId)
    : -1;
  const snapshotBaselineValid = identityValid
    && providerObservedContextTokens(usage) > 0
    && (Number(usage?.estimatedContextTokens || 0) > 0 || (!!payload && usage?.payloadChecksum === payload.payloadChecksum));
  const baselineValid = identityValid && (anchorIndex >= 0 || snapshotBaselineValid);
  const payloadExact = baselineValid && !!payload && !!usage?.payloadChecksum && usage.payloadChecksum === payload.payloadChecksum;
  const estimatedSummaryTokens = payload ? payload.tokenBreakdown.summary : input.activeSummary == null ? 0 : estimateTextTokens(JSON.stringify(input.activeSummary));
  const estimatedFixedTokens = payload
    ? modelVisibleFixedTokens(payload)
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
    schema: "ccm-context-measurement-v2",
    accountingSchema: "ccm-context-accounting-v2",
    source: baselineValid ? "provider_reported" : payload ? "model_visible_estimate" : "unavailable",
    method: payloadExact ? "exact_payload_usage" : baselineValid ? "latest_provider_usage_plus_new_message_estimate" : "model_visible_payload_estimate",
    activeTokens: baselineValid
      ? observedTokens + estimatedTokensAfterUsage
      : currentEstimatedPayloadTokens,
    providerObservedTokens: observedTokens,
    currentInputTokens: observedTokens,
    outputTokens: Number(usage?.outputTokens || 0),
    precision: payloadExact ? "exact" : baselineValid ? "estimated" : payload ? "estimated" : "unavailable",
    measurementBasis: payloadExact ? "exact_payload_usage" : baselineValid ? "provider_usage_anchor_plus_delta" : payload ? "local_payload_prediction" : "unavailable",
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
    estimatedNewInputTokens: estimatedTokensAfterUsage,
    lastProviderObservedTokens: observedTokens,
    predictedNextRequestTokens: currentEstimatedPayloadTokens,
    providerIdentityChecksum: usage?.providerIdentityChecksum || buildCcmProviderIdentityChecksum({ provider: usage?.provider || expectedProvider, model: usage?.model || expectedModel, protocol: usage?.protocol || expectedProtocol, endpoint: usage?.endpoint || expectedEndpoint }),
    totalModelVisibleTokens: baselineValid
      ? observedTokens + estimatedTokensAfterUsage
      : currentEstimatedPayloadTokens,
    updatedAt: new Date().toISOString(),
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
  dynamicContextRestoreManifest?: any;
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
    dynamicContextRestoreManifest: input.dynamicContextRestoreManifest || null,
    dynamicContextRestoreChecksum: String(input.dynamicContextRestoreManifest?.checksum || ""),
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
    dynamicContextRestoreManifest: source.dynamicContextRestoreManifest || source.dynamic_context_restore_manifest || source.boundaryMarker?.dynamicContextRestoreManifest || source.boundary_marker?.dynamicContextRestoreManifest || null,
    dynamicContextRestoreReceipt: source.dynamicContextRestoreReceipt || source.dynamic_context_restore_receipt || null,
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
  recordContextEngineEvent({
    kind: "compaction_failure",
    scope: normalized.scope || "other",
    scopeId: normalized.scopeId || normalized.project || normalized.groupId || normalized.sessionId || "",
    sessionId: normalized.sessionId || "",
    status: "failed",
    consecutiveFailures: normalized.consecutiveFailures,
    reasonCode: error?.code || normalized.lastError,
  });
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
  if (phase === "post_compact") {
    const result = input?.result || {};
    const quality = result.summaryQuality || result.summary_quality || result.modelMetadata?.summaryQuality || null;
    recordContextEngineEvent({
      kind: "compaction_success",
      scope: input?.scope || "other",
      scopeId: input?.scopeId || input?.project || input?.groupId || input?.sessionId || "",
      sessionId: input?.sessionId || "",
      status: "completed",
      beforeTokens: result.before_tokens ?? result.beforeTokens,
      afterTokens: result.after_tokens ?? result.afterTokens,
      summaryQualityScore: quality?.score,
    });
  }
  return results.filter(result => result !== undefined && result !== null);
}

export function runSessionContextCcMessageBucketSelfTest() {
  const identity = runSessionContextToolBucketSelfTest();
  const readFilesBody = `${"README.md\n".repeat(40)}${"x".repeat(24_000)}`;
  const inspectBody = `${"inspect_system\n".repeat(20)}${"y".repeat(18_000)}`;
  const workspace = { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read a workspace file" };
  const userMcp = { name: "search_records", canonicalName: "mcp__ccm__docs__search_records", server: "docs", description: "search approved records", inputSchema: { type: "object", properties: { query: { type: "string" } } } };
  const project = buildModelVisiblePayloadSnapshot({
    scope: "project",
    sessionId: "cc-connect-test:s1",
    tools: [workspace, userMcp],
    recentMessages: [
      { role: "user", content: "read the project readme" },
      { role: "tool", name: "read_files", content: readFilesBody },
    ],
    contextComponents: {
      mcpTools: [workspace, userMcp],
      mcpResults: readFilesBody,
    },
  });
  const global = buildModelVisiblePayloadSnapshot({
    scope: "global",
    sessionId: "session:global-inspect",
    tools: [{ name: "inspect_system", description: "inspect CCM" }, { name: "read_file", description: "read a file" }],
    recentMessages: [
      { role: "user", content: "inspect the system" },
      { role: "tool", name: "inspect_system", content: inspectBody },
    ],
    contextComponents: {
      mcpTools: [
        { name: "inspect_system" },
        { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly" },
        userMcp,
      ],
    },
  });
  const checks = {
    ...identity.checks,
    identityPass: identity.pass === true,
    projectResultsStayInConversation: project.tokenBreakdown.recentMessages > project.tokenBreakdown.mcpTools
      && project.tokenBreakdown.recentMessages > 1_000
      && Number(project.tokenBreakdown.mcpResults || 0) === 0,
    projectMcpIsUserSchemaOnly: project.tokenBreakdown.mcpTools > 0
      && project.tokenBreakdown.tools > 0
      && project.tokenBreakdown.mcpTools < 400
      && project.tokenBreakdown.mcpTools < project.tokenBreakdown.recentMessages,
    projectIgnoresMcpResultsHint: Number(project.tokenBreakdown.mcpResults || 0) === 0,
    globalObservationsStayInConversation: global.tokenBreakdown.recentMessages > 1_000
      && Number(global.tokenBreakdown.mcpResults || 0) === 0,
    globalManagementToolsStayInDefinitions: global.tokenBreakdown.tools > 0
      && global.tokenBreakdown.mcpTools === 0,
  };
  return { pass: Object.values(checks).every(Boolean), checks, project: project.tokenBreakdown, global: global.tokenBreakdown };
}
