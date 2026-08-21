import * as crypto from "crypto";

export type CcmContextCapacityV2 = {
  schema: "ccm-context-capacity-v2";
  provider: string;
  model: string;
  rawWindowTokens: number;
  windowSemantics: "total_context" | "max_input";
  reservedOutputTokens: number;
  effectiveInputWindowTokens: number;
  autoCompactBufferTokens: number;
  autoCompactThresholdTokens: number;
  source: "provider_capability" | "user_setting" | "conservative_fallback";
  confidence: number;
  evidenceId?: string;
};

export type CcmContextMeasurementV2 = {
  schema: "ccm-context-measurement-v2";
  source: "provider_reported" | "model_visible_estimate" | "unavailable";
  precision: "exact" | "estimated" | "unavailable";
  measurementBasis?:
    | "exact_payload_usage"
    | "provider_usage_anchor_plus_delta"
    | "local_payload_prediction"
    | "unavailable";
  currentInputTokens: number;
  outputTokens: number;
  estimatedNewInputTokens: number;
  totalModelVisibleTokens: number;
  lastProviderObservedTokens?: number;
  predictedNextRequestTokens?: number;
  providerIdentityChecksum?: string;
  providerEvidenceId?: string;
  payloadChecksum?: string;
  updatedAt: string;
};

export type CcmPrimaryTokenBreakdownV2 = {
  systemPrompt: number;
  rules: number;
  skills: number;
  mcpAndDynamicTools: number;
  subagentDefinitions: number;
  summarizedConversation: number;
  conversation: number;
  currentRequest: number;
};

export type CcmTechnicalTokenBreakdownV2 = {
  recoveryContext: number;
  hooks: number;
  workerBootstrap: number;
  hydratedContext: number;
  providerEnvelope: number;
  providerUnpartitionedRemainder: number;
};

export function normalizeCcmContextCapacity(input: any = {}): CcmContextCapacityV2 {
  const configuredWindow = Math.max(0, Math.floor(Number(input.rawWindowTokens ?? input.raw_window_tokens ?? input.contextWindow ?? input.context_window ?? 0)));
  // CCM's evidence-free baseline is a 200K total context window with a 20K
  // output reservation. Never turn missing provider evidence into an
  // artificially precise 18K capacity.
  const rawWindowTokens = configuredWindow > 0 ? configuredWindow : 200_000;
  const requestedSemantics = String(input.windowSemantics || input.window_semantics || "").toLowerCase();
  const windowSemantics = requestedSemantics === "max_input"
    ? "max_input"
    : requestedSemantics === "total_context"
      ? "total_context"
      : input.maxInputTokens !== undefined || input.max_input_tokens !== undefined
        ? "max_input"
        : "total_context";
  const reservedOutputTokens = windowSemantics === "max_input"
    ? 0
    : Math.min(20_000, Math.max(0, Math.floor(Number(input.reservedOutputTokens ?? input.reserved_output_tokens ?? input.maxOutputTokens ?? input.max_output_tokens ?? 20_000))));
  const effectiveInputWindowTokens = Math.max(18_000, windowSemantics === "max_input" ? rawWindowTokens : rawWindowTokens - reservedOutputTokens);
  const autoCompactBufferTokens = Math.max(0, Math.floor(Number(input.autoCompactBufferTokens ?? input.auto_compact_buffer_tokens ?? 13_000)));
  const sourceValue = String(input.source || "");
  const source: CcmContextCapacityV2["source"] = sourceValue === "provider_capability" || sourceValue === "user_setting" || sourceValue === "conservative_fallback"
    ? sourceValue
    : "conservative_fallback";
  return {
    schema: "ccm-context-capacity-v2",
    provider: String(input.provider || ""),
    model: String(input.model || ""),
    rawWindowTokens,
    windowSemantics,
    reservedOutputTokens,
    effectiveInputWindowTokens,
    autoCompactBufferTokens,
    autoCompactThresholdTokens: Math.max(18_000, effectiveInputWindowTokens - autoCompactBufferTokens),
    source,
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0))),
    ...(input.evidenceId || input.evidence_id ? { evidenceId: String(input.evidenceId || input.evidence_id) } : {}),
  };
}

export function checksumCcmContextAccounting(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function buildCcmProviderIdentityChecksum(input: any = {}) {
  const endpoint = String(input.endpoint || input.apiUrl || input.api_url || "").trim().replace(/\/+$/, "");
  const protocol = String(input.protocol || input.format || "").trim().toLowerCase();
  const provider = String(input.provider || "").trim().toLowerCase();
  const model = String(input.model || "").trim();
  return checksumCcmContextAccounting({ endpoint, protocol, provider, model });
}

export function normalizeCcmPrimaryTokenBreakdown(value: any = {}): CcmPrimaryTokenBreakdownV2 {
  const source = value && typeof value === "object" ? value : {};
  // Tool calls and tool results already live in the conversation timeline.
  // Legacy mcpResults fields are intentionally ignored here so they cannot
  // inflate the canonical primary total a second time.
  const conversation = Math.max(0, Math.floor(Number(source.conversation ?? source.recentMessages ?? source.recent_messages ?? 0)));
  return {
    systemPrompt: Math.max(0, Math.floor(Number(source.systemPrompt ?? source.system ?? 0))),
    rules: Math.max(0, Math.floor(Number(source.rules || 0))),
    skills: Math.max(0, Math.floor(Number(source.skills || 0))),
    mcpAndDynamicTools: Math.max(0, Math.floor(Number(source.mcpAndDynamicTools ?? source.mcpTools ?? source.mcp ?? 0)))
      + Math.max(0, Math.floor(Number(source.tools ?? source.toolDefinitions ?? source.tool_definitions ?? 0))),
    subagentDefinitions: Math.max(0, Math.floor(Number(source.subagentDefinitions ?? source.subagents ?? 0))),
    summarizedConversation: Math.max(0, Math.floor(Number(source.summarizedConversation ?? source.summary ?? 0))),
    conversation,
    currentRequest: Math.max(0, Math.floor(Number(source.currentRequest ?? source.current_request ?? 0))),
  };
}

export function normalizeCcmTechnicalTokenBreakdown(value: any = {}): CcmTechnicalTokenBreakdownV2 {
  const source = value && typeof value === "object" ? value : {};
  return {
    recoveryContext: Math.max(0, Math.floor(Number(source.recoveryContext ?? source.recovery_context ?? 0))),
    hooks: Math.max(0, Math.floor(Number(source.hooks ?? source.hookResults ?? source.hook_results ?? 0))),
    workerBootstrap: Math.max(0, Math.floor(Number(source.workerBootstrap ?? source.worker_bootstrap ?? 0))),
    hydratedContext: Math.max(0, Math.floor(Number(source.hydratedContext ?? source.hydrated_context ?? 0))),
    providerEnvelope: Math.max(0, Math.floor(Number(source.providerEnvelope ?? source.provider_envelope ?? 0))),
    providerUnpartitionedRemainder: Math.max(0, Math.floor(Number(source.providerUnpartitionedRemainder ?? source.provider_remainder ?? 0))),
  };
}

export function sumCcmPrimaryTokenBreakdown(value: CcmPrimaryTokenBreakdownV2) {
  return Object.values(value).reduce((sum, tokenCount) => sum + Math.max(0, Math.floor(Number(tokenCount || 0))), 0);
}
