import type { UnifiedCompactionScope, UnifiedCompactionReceipt, UnifiedCompactionPolicy } from "./unified-session-compaction";

export type CcmUnifiedSessionSummaryV1 = {
  schema: "ccm-unified-session-summary-v1";
  userGoals: string[];
  corrections: string[];
  decisions: string[];
  authorizationBoundaries: string[];
  completedWork: string[];
  pendingWork: string[];
  risksAndBlockers: string[];
  fileReferences: string[];
  verificationEvidence: string[];
  attachmentReferences: string[];
  nextActions: string[];
  sourceMessageIds: string[];
  contentStored: false;
};

export type UnifiedCompactionSnapshot = {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  messages: any[];
  executionEvents: any[];
  activeSummary?: CcmUnifiedSessionSummaryV1 | null;
  providerUsage?: any;
  recoveryContext?: any;
  contextComponents?: any;
  currentRequest?: any;
  previousState?: any;
  threshold?: number;
  boundaryGeneration?: number;
  compactionFloorIndex?: number;
};

export type UnifiedCompactionFence = {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  generation: number;
  checksum: string;
  acquiredAt: string;
  release?: () => void | Promise<void>;
};

export type UnifiedRecoveryInput = {
  scope: UnifiedCompactionScope;
  exactSessionId: string;
  summary: CcmUnifiedSessionSummaryV1;
  snapshot: UnifiedCompactionSnapshot;
};

export interface UnifiedSessionCompactionAdapter {
  acquireFence(): Promise<UnifiedCompactionFence>;
  loadSnapshot(fence: UnifiedCompactionFence): Promise<UnifiedCompactionSnapshot>;
  validateFence(fence: UnifiedCompactionFence, snapshot: UnifiedCompactionSnapshot): Promise<void>;
  buildRecoveryInput(summary: CcmUnifiedSessionSummaryV1, snapshot: UnifiedCompactionSnapshot): UnifiedRecoveryInput;
  commit(result: UnifiedCompactionResult, fence: UnifiedCompactionFence): Promise<void>;
  recordFailure(error: unknown, fence: UnifiedCompactionFence): Promise<void>;
}

export type UnifiedCompactionResult = {
  strategy: "cc_two_stage";
  compacted: boolean;
  reason: "below_threshold" | "microcompact" | "full_compaction";
  snapshot: UnifiedCompactionSnapshot;
  microCompact: any;
  fullCompaction: {
    attempted: boolean;
    source: "model" | "session_memory" | "reused" | "none";
    summary: CcmUnifiedSessionSummaryV1 | null;
    attempts: number;
  };
  preservedRecentWindow: {
    messages: any[];
    executionEvents: any[];
    timeline: any[];
    startIndex: number;
    textMessageCount: number;
    tokens: number;
  };
  postCompactGate: any;
  summaryQuality: any;
  recoveryContext: any;
  recoveryInput: UnifiedRecoveryInput | null;
  receipt: UnifiedCompactionReceipt;
  boundaryGeneration: number;
  summaryChecksum: string;
  contentStored: false;
  modelMetadata?: { provider?: string; model?: string; responseId?: string; usage?: any };
};

export type UnifiedCompactionEngineInput = {
  adapter: UnifiedSessionCompactionAdapter;
  policy?: Partial<UnifiedCompactionPolicy>;
  config?: any;
  force?: boolean;
  promptTooLong?: boolean;
  reason?: string;
  customInstructions?: string;
  modelCall?: (input: { system: string; user: string; maxOutputTokens: number; attempt: number; scope: UnifiedCompactionScope; exactSessionId: string }) => Promise<any>;
  microCompact?: (snapshot: UnifiedCompactionSnapshot, policy: UnifiedCompactionPolicy) => Promise<{ snapshot?: UnifiedCompactionSnapshot; receipt?: any }> | { snapshot?: UnifiedCompactionSnapshot; receipt?: any };
  buildProjection?: (snapshot: UnifiedCompactionSnapshot, policy: UnifiedCompactionPolicy) => any;
  buildPostCompactPayload?: (input: { summary: CcmUnifiedSessionSummaryV1; preservedMessages: any[]; preservedTimeline: any[]; recoveryContext: any; snapshot: UnifiedCompactionSnapshot }) => Promise<any> | any;
  measure?: (payload: any, snapshot: UnifiedCompactionSnapshot) => number;
  qualityReference?: (snapshot: UnifiedCompactionSnapshot) => any;
};
