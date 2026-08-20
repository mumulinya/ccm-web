import * as crypto from "crypto";
import { estimateTextTokens, getAutoCompactThreshold } from "./context-budget";

export type UnifiedCompactionScope = "global" | "group" | "project";
export type UnifiedCompactionStage = "idle" | "microcompact" | "full_compaction" | "post_gate" | "recovery";

export type UnifiedCompactionPolicy = {
  strategy: "cc_two_stage";
  microCompactEnabled: boolean;
  pressureFirst: boolean;
  idleAssistEnabled: boolean;
  idleGapMinutes: number;
  keepRecentToolResults: number;
  minKeepTokens: number;
  minKeepTextMessages: number;
  maxKeepTokens: number;
  autoCompactThreshold: number;
};

export type UnifiedRecoveryContext = {
  schema: "ccm-unified-recovery-context-v1";
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  taskBindings: Array<{ taskId: string; generation?: number; attempt?: number; leaseId?: string }>;
  planBindings: Array<{ planId: string; revision?: number; checksum?: string }>;
  fileReferences: string[];
  verificationEvidence: string[];
  pendingActions: string[];
  permissionBoundary: string;
  contentStored: false;
  checksum: string;
};

export type UnifiedCompactionReceipt = {
  schema: "ccm-unified-session-compaction-v1";
  strategy: "cc_two_stage";
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  stage: UnifiedCompactionStage;
  beforeTokens: number;
  afterTokens: number;
  microCompactApplied: boolean;
  microCompactTrigger: "pressure" | "idle" | "none";
  summarySource: "model" | "session_memory" | "reused" | "none";
  gateStatus: "ready" | "recompact_required" | "degraded";
  boundaryGeneration: number;
  summaryChecksum: string;
  recoveryContextChecksum: string;
  contentStored: false;
  createdAt: string;
  checksum: string;
};

export type UnifiedCompactionProjection = {
  schema: "ccm-unified-session-compaction-projection-v1";
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  strategy: "cc_two_stage";
  stage: UnifiedCompactionStage;
  beforeTokens: number;
  afterTokens: number;
  microCompactApplied: boolean;
  summarySource: UnifiedCompactionReceipt["summarySource"];
  gateStatus: UnifiedCompactionReceipt["gateStatus"];
  boundaryGeneration: number;
  summaryQuality: unknown;
  receiptChecksum: string;
  contentStored: false;
};

export type UnifiedCompactionOrchestrationInput = {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  activeTokens: number;
  threshold: number;
  microCompactApplied?: boolean;
  microCompactTrigger?: UnifiedCompactionReceipt["microCompactTrigger"];
  force?: boolean;
  promptTooLong?: boolean;
  summarySource?: UnifiedCompactionReceipt["summarySource"];
  summaryQuality?: unknown;
  afterTokens?: number;
  boundaryGeneration?: number;
  recoveryContextChecksum?: string;
};

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function positive(value: unknown, fallback: number, min = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}

export function resolveUnifiedCompactionPolicy(config: any = {}, overrides: Partial<UnifiedCompactionPolicy> = {}): UnifiedCompactionPolicy {
  const contextWindow = positive(config?.modelContextWindow || config?.model_context_window, 200_000, 18_000);
  const reserved = positive(config?.reservedOutputTokens || config?.reserved_output_tokens, 20_000);
  const threshold = positive(
    overrides.autoCompactThreshold
      ?? config?.autoCompactThreshold
      ?? config?.auto_compact_threshold
      ?? config?.modelAutoCompactTokenLimit
      ?? config?.model_auto_compact_token_limit,
    getAutoCompactThreshold({ maxTokens: contextWindow, reservedOutputTokens: reserved }),
    overrides.autoCompactThreshold !== undefined ? 1 : 18_000,
  );
  return {
    strategy: "cc_two_stage",
    // The unified default is enabled. Existing explicit false remains respected.
    microCompactEnabled: overrides.microCompactEnabled ?? (config?.timeBasedMicrocompactEnabled !== false && config?.time_based_microcompact_enabled !== false),
    pressureFirst: overrides.pressureFirst ?? true,
    idleAssistEnabled: overrides.idleAssistEnabled ?? (config?.timeBasedMicrocompactEnabled !== false && config?.time_based_microcompact_enabled !== false),
    idleGapMinutes: positive(overrides.idleGapMinutes ?? config?.timeBasedMicrocompactGapMinutes ?? config?.time_based_microcompact_gap_minutes, 60, 1),
    keepRecentToolResults: positive(overrides.keepRecentToolResults ?? config?.timeBasedMicrocompactKeepRecent ?? config?.time_based_microcompact_keep_recent, 5, 1),
    minKeepTokens: positive(overrides.minKeepTokens ?? config?.minKeepTokens ?? config?.min_keep_tokens, 10_000, 1),
    minKeepTextMessages: positive(overrides.minKeepTextMessages ?? config?.minKeepMessages ?? config?.min_keep_messages, 5, 1),
    maxKeepTokens: positive(overrides.maxKeepTokens ?? config?.maxKeepTokens ?? config?.max_keep_tokens, 40_000, 10_000),
    autoCompactThreshold: threshold,
  };
}

export function shouldRunUnifiedFullCompaction(input: { activeTokens: number; threshold: number; force?: boolean; promptTooLong?: boolean }) {
  const activeTokens = Math.max(0, Number(input.activeTokens || 0));
  const threshold = Math.max(1, Number(input.threshold || 0));
  return {
    required: input.force === true || input.promptTooLong === true || activeTokens >= threshold,
    activeTokens,
    threshold,
    pressure: threshold > 0 ? Math.round(activeTokens / threshold * 1000) / 10 : 0,
  };
}

export function buildUnifiedRecoveryContext(input: {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  taskBindings?: any[];
  planBindings?: any[];
  fileReferences?: any[];
  verificationEvidence?: any[];
  pendingActions?: any[];
  permissionBoundary?: string;
}): UnifiedRecoveryContext {
  const clean = (value: unknown, max = 240) => String(value ?? "").trim().slice(0, max);
  const taskBindings = (Array.isArray(input.taskBindings) ? input.taskBindings : []).map(row => ({
    taskId: clean(row?.taskId || row?.task_id),
    ...(Number.isFinite(Number(row?.generation)) ? { generation: Number(row.generation) } : {}),
    ...(Number.isFinite(Number(row?.attempt)) ? { attempt: Number(row.attempt) } : {}),
    ...(row?.leaseId || row?.lease_id ? { leaseId: clean(row?.leaseId || row?.lease_id) } : {}),
  })).filter(row => row.taskId).slice(-32);
  const planBindings = (Array.isArray(input.planBindings) ? input.planBindings : []).map(row => ({
    planId: clean(row?.planId || row?.plan_id),
    ...(Number.isFinite(Number(row?.revision)) ? { revision: Number(row.revision) } : {}),
    ...(row?.checksum ? { checksum: clean(row.checksum, 128) } : {}),
  })).filter(row => row.planId).slice(-16);
  const result: Omit<UnifiedRecoveryContext, "checksum"> = {
    schema: "ccm-unified-recovery-context-v1",
    scope: input.scope,
    exactSessionId: clean(input.exactSessionId, 320),
    taskBindings,
    planBindings,
    fileReferences: (Array.isArray(input.fileReferences) ? input.fileReferences : []).map(row => clean(typeof row === "string" ? row : row?.path || row?.file)).filter(Boolean).slice(-48),
    verificationEvidence: (Array.isArray(input.verificationEvidence) ? input.verificationEvidence : []).map(row => clean(typeof row === "string" ? row : row?.id || row?.summary)).filter(Boolean).slice(-48),
    pendingActions: (Array.isArray(input.pendingActions) ? input.pendingActions : []).map(row => clean(typeof row === "string" ? row : row?.title || row?.action)).filter(Boolean).slice(-24),
    permissionBoundary: clean(input.permissionBoundary, 800),
    contentStored: false,
  };
  return { ...result, checksum: checksum(result) };
}

export function buildUnifiedCompactionReceipt(input: Partial<UnifiedCompactionReceipt> & {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  beforeTokens?: number;
  afterTokens?: number;
  boundaryGeneration?: number;
  summaryChecksum?: string;
  recoveryContextChecksum?: string;
}) {
  const core: Omit<UnifiedCompactionReceipt, "checksum"> = {
    schema: "ccm-unified-session-compaction-v1",
    strategy: "cc_two_stage",
    scope: input.scope,
    exactSessionId: String(input.exactSessionId || ""),
    stage: input.stage || "idle",
    beforeTokens: Math.max(0, Number(input.beforeTokens || 0)),
    afterTokens: Math.max(0, Number(input.afterTokens || 0)),
    microCompactApplied: input.microCompactApplied === true,
    microCompactTrigger: input.microCompactTrigger || "none",
    summarySource: input.summarySource || "none",
    gateStatus: input.gateStatus || "ready",
    boundaryGeneration: Math.max(0, Number(input.boundaryGeneration || 0)),
    summaryChecksum: String(input.summaryChecksum || ""),
    recoveryContextChecksum: String(input.recoveryContextChecksum || ""),
    contentStored: false,
    createdAt: String(input.createdAt || new Date().toISOString()),
  };
  return { ...core, checksum: checksum(core) };
}

export function estimateRecoveryContextTokens(context: UnifiedRecoveryContext | null | undefined) {
  return context ? estimateTextTokens(JSON.stringify(context)) : 0;
}

/**
 * Shared decision/receipt boundary used by all three session adapters. The
 * adapter owns model summarisation and transactional persistence; this layer
 * owns only the invariant two-stage policy and safe receipt shape.
 */
export function orchestrateUnifiedCompaction(input: UnifiedCompactionOrchestrationInput) {
  const decision = shouldRunUnifiedFullCompaction({
    activeTokens: input.activeTokens,
    threshold: input.threshold,
    force: input.force,
    promptTooLong: input.promptTooLong,
  });
  const microApplied = input.microCompactApplied === true;
  const receipt = buildUnifiedCompactionReceipt({
    scope: input.scope,
    exactSessionId: input.exactSessionId,
    stage: decision.required ? (input.afterTokens === undefined ? "full_compaction" : "post_gate") : microApplied ? "microcompact" : "idle",
    beforeTokens: decision.activeTokens,
    afterTokens: Math.max(0, Number(input.afterTokens ?? input.activeTokens)),
    microCompactApplied: microApplied,
    microCompactTrigger: input.microCompactTrigger || "none",
    summarySource: input.summarySource || "none",
    gateStatus: decision.required && input.afterTokens === undefined ? "recompact_required" : "ready",
    boundaryGeneration: input.boundaryGeneration || 0,
    recoveryContextChecksum: input.recoveryContextChecksum || "",
  });
  return { decision, receipt, projection: projectUnifiedCompactionReceipt(receipt, input.summaryQuality) };
}

export function projectUnifiedCompactionReceipt(receipt: UnifiedCompactionReceipt | null | undefined, summaryQuality?: unknown): UnifiedCompactionProjection | null {
  if (!receipt || receipt.schema !== "ccm-unified-session-compaction-v1") return null;
  return {
    schema: "ccm-unified-session-compaction-projection-v1",
    scope: receipt.scope,
    exactSessionId: receipt.exactSessionId,
    strategy: "cc_two_stage",
    stage: receipt.stage,
    beforeTokens: receipt.beforeTokens,
    afterTokens: receipt.afterTokens,
    microCompactApplied: receipt.microCompactApplied,
    summarySource: receipt.summarySource,
    gateStatus: receipt.gateStatus,
    boundaryGeneration: receipt.boundaryGeneration,
    summaryQuality: summaryQuality ?? null,
    receiptChecksum: receipt.checksum,
    contentStored: false,
  };
}

// Public compatibility barrel for the final unified lifecycle engine. Scope
// modules may keep their persistence-specific imports while all new lifecycle
// code is implemented in these focused modules.
export type {
  CcmUnifiedSessionSummaryV1,
  UnifiedCompactionSnapshot,
  UnifiedCompactionFence,
  UnifiedRecoveryInput,
  UnifiedSessionCompactionAdapter,
  UnifiedCompactionResult,
  UnifiedCompactionEngineInput,
} from "./unified-session-compaction-types";
export { UnifiedSessionCompactionEngine, createUnifiedSessionCompactionEngine } from "./unified-session-compaction-engine";
export { buildUnifiedRecoveryAttachment, verifyUnifiedRecoveryAttachment } from "./unified-session-compaction-recovery";
export { buildUnifiedSessionCompactionStateV1, projectUnifiedSessionCompactionState, CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA } from "./unified-session-compaction-state";
export { createUnifiedScopeAdapter, runUnifiedScopeCompaction } from "./unified-session-compaction-adapters";
export {
  normalizeCcmUnifiedSummary,
  unifiedSummaryChecksum,
  buildUnifiedSummaryReference,
  buildUnifiedSummaryPrompt,
  runUnifiedSummaryShapeCheck,
  UNIFIED_COMPACTION_SYSTEM_PROMPT,
} from "./unified-session-compaction-summary";
