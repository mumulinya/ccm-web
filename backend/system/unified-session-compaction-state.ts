import * as crypto from "crypto";
import type { UnifiedCompactionReceipt } from "./unified-session-compaction";

export const CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA = "ccm-unified-session-compaction-state-v1" as const;

export type CcmUnifiedSessionCompactionStateV1 = {
  schema: typeof CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA;
  scope: string;
  exactSessionId: string;
  strategy: "cc_two_stage";
  stage: string;
  triggerReason: string;
  beforeTokens: number;
  afterTokens: number;
  summarySource: string;
  gateStatus: string;
  qualityStatus: "passed" | "failed" | "not_run";
  boundaryGeneration: number;
  summarizedThroughMessageId: string;
  summarizedMessageCount: number;
  preservedRecentMessageIds: string[];
  receiptChecksum: string;
  summaryChecksum: string;
  microCompactReceiptChecksum: string;
  recoveryContextChecksum: string;
  summaryQualityChecksum: string;
  contentStored: false;
  updatedAt: string;
  checksum: string;
};

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function buildUnifiedSessionCompactionStateV1(input: {
  receipt: UnifiedCompactionReceipt;
  summaryQuality?: any;
  microCompact?: any;
  recoveryContext?: any;
  triggerReason?: string;
  summarizedThroughMessageId?: string;
  summarizedMessageCount?: number;
  preservedRecentMessageIds?: string[];
}) {
  const core: Omit<CcmUnifiedSessionCompactionStateV1, "checksum"> = {
    schema: CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA,
    scope: input.receipt.scope,
    exactSessionId: input.receipt.exactSessionId,
    strategy: "cc_two_stage",
    stage: input.receipt.stage,
    triggerReason: String(input.triggerReason || "automatic"),
    beforeTokens: Math.max(0, Number(input.receipt.beforeTokens || 0)),
    afterTokens: Math.max(0, Number(input.receipt.afterTokens || 0)),
    summarySource: String(input.receipt.summarySource || "none"),
    gateStatus: String(input.receipt.gateStatus || "ready"),
    qualityStatus: input.summaryQuality == null ? "not_run" : input.summaryQuality?.valid === true || input.summaryQuality?.pass === true ? "passed" : "failed",
    boundaryGeneration: input.receipt.boundaryGeneration,
    summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
    summarizedMessageCount: Math.max(0, Number(input.summarizedMessageCount || 0)),
    preservedRecentMessageIds: (Array.isArray(input.preservedRecentMessageIds) ? input.preservedRecentMessageIds : []).map(String).filter(Boolean).slice(-256),
    receiptChecksum: input.receipt.checksum,
    summaryChecksum: input.receipt.summaryChecksum,
    microCompactReceiptChecksum: String(input.microCompact?.receiptChecksum || input.microCompact?.checksum || ""),
    recoveryContextChecksum: input.receipt.recoveryContextChecksum || String(input.recoveryContext?.checksum || ""),
    summaryQualityChecksum: checksum(input.summaryQuality || null),
    contentStored: false,
    updatedAt: new Date().toISOString(),
  };
  return { ...core, checksum: checksum(core) };
}

export function projectUnifiedSessionCompactionState(value: any) {
  if (!value || value.schema !== CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA) return null;
  return {
    schema: value.schema,
    scope: String(value.scope || ""),
    exactSessionId: String(value.exactSessionId || ""),
    strategy: "cc_two_stage",
    stage: String(value.stage || "idle"),
    triggerReason: String(value.triggerReason || "automatic"),
    beforeTokens: Math.max(0, Number(value.beforeTokens || 0)),
    afterTokens: Math.max(0, Number(value.afterTokens || 0)),
    summarySource: String(value.summarySource || "none"),
    gateStatus: String(value.gateStatus || "ready"),
    qualityStatus: String(value.qualityStatus || "not_run"),
    boundaryGeneration: Math.max(0, Number(value.boundaryGeneration || 0)),
    summarizedThroughMessageId: String(value.summarizedThroughMessageId || ""),
    summarizedMessageCount: Math.max(0, Number(value.summarizedMessageCount || 0)),
    preservedRecentMessageIds: (Array.isArray(value.preservedRecentMessageIds) ? value.preservedRecentMessageIds : []).map(String).filter(Boolean).slice(-256),
    receiptChecksum: String(value.receiptChecksum || ""),
    summaryChecksum: String(value.summaryChecksum || ""),
    microCompactReceiptChecksum: String(value.microCompactReceiptChecksum || ""),
    recoveryContextChecksum: String(value.recoveryContextChecksum || ""),
    summaryQualityChecksum: String(value.summaryQualityChecksum || ""),
    contentStored: false as const,
  };
}
