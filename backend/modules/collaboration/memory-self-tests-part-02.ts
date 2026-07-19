// Behavior-freeze split from memory-self-tests.ts (part 2/2).
// Extracted self-tests. Runtime remains in memory.ts.

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { loadProjectConfigs, loadTasks } from "../../core/db";
import { CCM_DIR, getWorkDirForProject } from "../../core/utils";
import { buildContextBudget, estimateTextTokens } from "../../system/context-budget";
import { buildToolAuthorizationPayload, normalizeToolAuthorization } from "../../tools/tool-authorization";
import { toolManager } from "../../tools/tool-manager";
import { getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../../agents/runtime";
import {
  buildBoundedRecentGroupContext,
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupApiMicrocompactNativeApplyPlan,
  buildGroupTimeBasedThinkingProjection,
  buildGroupTimeBasedToolResultProjection,
  buildGroupCompactStrategyDecision,
  buildGroupCompactEpoch,
  buildGroupPostCompactCleanupAudit,
  buildGroupPostCompactSessionStateResetReceipt,
  buildGroupPostCompactRecoveryAudit,
  buildGroupPostCompactTaskStatusProjection,
  buildGroupPostCompactDynamicContextDeltaProjection,
  verifyGroupPostCompactMessageOrderReceipt,
  verifyGroupCompactLineage,
  verifyGroupCompactionModelUsageReceipt,
  verifyGroupPostCompactSessionStateResetReceipt,
  buildGroupPreservedSegment,
  buildGroupMicroCompactPlan,
  buildGroupPtlRecoveryPlan,
  buildPostCompactReinjectionPlan,
  calculateGroupCompactWarningState,
  calculateGroupMessagesToKeepIndex,
  buildRelevantHistoricalGroupContext,
  compactGroupConversationMemory,
  estimateGroupMessageTokens,
  estimateGroupTextTokens,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_MEMORY_COMPACTION_VERSION,
  renderConversationSummary,
} from "./group-memory-compaction";
import {
  buildGroupTypedMemoryLoadPlan,
  buildGroupTypedMemoryIndex,
  buildGroupTypedMemoryRecall,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  buildPostCompactCompletionMemoryPreservationClosureUsageSummary,
  deriveGroupTypedMemoryTargetPaths,
  distillGroupMessagesToTypedMemory,
  distillGroupMessagesToTypedMemoryUntilCaughtUp,
  evaluateGroupTypedMemoryDistillationQuality,
  getAlreadySurfacedGroupTypedMemory,
  getGroupTypedMemoryRecallScopeStats,
  getGroupTypedMemoryDir,
  importGlobalClaudeMemoryToGroupTypedMemory,
  importProjectMemoryFilesToGroupTypedMemory,
  recordGroupTypedMemoryRecall,
  recordGroupTypedMemoryManifestSelectorOutcome,
  selectGroupTypedMemoryManifest,
  readGroupTypedMemoryRecallLedger,
  recordGroupTypedMemoryPressureRecallUsageLedger,
  readGroupTypedMemoryDistillationLedger,
  renderGroupTypedMemoryLoadPlan,
  renderGroupTypedMemoryRecall,
  runGroupTypedMemoryIndexSelfTest,
  shouldIgnoreGroupMemoryRequest,
  syncGroupTypedMemoryFromGroupMemory,
  upsertGroupTypedMemoryDocument,
} from "./group-memory-index";
import {
  buildWorkerTypedMemoryDeliveryLease,
  buildWorkerTypedMemoryDispatchTicket,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  validateWorkerTypedMemoryDeliveryLease,
  validateWorkerTypedMemoryDispatchTicket,
} from "../../agents/runtime-kernel";
import {
  appendGroupMessage,
  getActiveGroupChatSessionId,
  getGroupChatSessionMessagesFile,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  registerGroupMessageAppendHook,
  saveGroupMessages,
} from "./storage";
import {
  buildGroupMemorySnipBoundaryMarker,
  buildGroupMemoryResumeProjection,
  commitGroupMemoryCompactBoundary,
  deleteGroupMemoryBoundaryArtifacts,
  getGroupMemoryBoundaryJournalFile,
  getGroupMemoryResumeProofFile,
  quarantineInvalidGroupMemoryBoundaryJournal,
  recordGroupMemoryResumeProjectionProof,
  retireGroupMemoryBoundaryJournal,
} from "./group-memory-boundary-journal";
import {
  runGroupSessionMemoryExtractionTransaction,
} from "./group-session-memory-extraction";
import {
  GLOBAL_AGENT_MEMORY_FILE,
  acquireGlobalAgentMemorySelfTestLock,
  recallGlobalAgentMemory,
  scanGlobalAgentMemorySelfTestContamination,
} from "../../agents/global/memory";
import { loadExecution } from "../../agents/execution-kernel";
import { DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA, pruneDirectAgentDispatchSpool, validateDirectAgentDispatchPair } from "../../agents/direct-dispatch-spool";
import {
  commitTaskAgentSessionCapacityRevalidation,
  recordTaskAgentMemoryContextDelivery,
  verifyMemoryContextDeliveryReceiptChecksum,
} from "../../tasks/agent-sessions";
import {
  createTypedMemoryDispatchWal,
  getTypedMemoryDispatchWalScopeDir,
  listTypedMemoryDispatchWal,
  pruneTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  transitionTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal,
} from "./typed-memory-dispatch-wal";
import {
  backfillGroupPostTurnSummaries,
  buildGroupPostTurnSummaryDeliveryCapsule,
  extractGroupPostTurnSummaryDeliveryCapsule,
  getGroupPostTurnSummaryLedgerFile,
  readGroupPostTurnSummaries,
  recordGroupPostTurnSummary,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "./group-post-turn-summary";
import { deleteTaskAgentInvocationLineageArtifacts } from "../../tasks/task-agent-invocation-lineage";
import { deleteTaskAgentContinuationSoakArtifacts } from "../../tasks/task-agent-continuation-soak";
import {
  commitGroupCompactHead,
  deleteGroupCompactHead,
  readGroupCompactHead,
  reconcileGroupCompactHeadFromMemory,
} from "./group-compact-head";
import {
  buildProviderNativeCompactExecutionReceiptSummary,
  getProviderNativeCompactExecutionReceiptLedgerFile,
} from "./provider-native-compact-execution-receipt";
import {
  consumeProviderNativeCompactSessionCapacity,
  deleteProviderNativeCompactSessionCapacity,
  getProviderNativeCompactSessionGenerationFence,
  reconcileProviderNativeCompactSessionCapacityReset,
  resetProviderNativeCompactSessionCapacity,
} from "./provider-native-compact-session-capacity";
import {
  deleteGroupMemoryAutoCompactCircuitBreaker,
  readGroupMemoryAutoCompactCircuitBreaker,
  recordGroupMemoryAutoCompactCircuitBreakerOutcome,
} from "./group-memory-auto-compact-circuit-breaker";
import { deleteGroupReactiveCompactRetryOwnership } from "./group-reactive-compact-retry-ownership";
import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification,
} from "./group-prompt-cache-break-detection";
import { deleteWorkerContextCompactSessionArtifactsForCoordinator } from "./group-orchestrator";

import {
  GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
  GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
  buildAgentMemoryContextBundle,
  buildGlobalGroupMemoryContext,
  buildGroupPostCompactCandidateUsageSummary,
  getGroupCompactFileReferenceLedgerFile,
  getGroupGlobalMemoryArbitrationLedgerFile,
  getGroupMemoryBackupFile,
  getGroupMemoryFile,
  getGroupMemoryReloadLedgerFile,
  getGroupMessagesFileHint,
  getGroupPostCompactCandidateUsageLedgerFile,
  getGroupPostCompactDispatchLedgerFile,
  getGroupReplayRepairWorkItemsFile,
  getGroupSessionMemorySnapshotFile,
  getGroupToolContinuitySnapshotFile,
  loadGroupMemory,
  readGroupMemoryReloadLedger,
  readGroupPostCompactCandidateUsageLedger,
  readGroupPostCompactDispatchLedger,
  recordGroupMemoryReloadAudit,
  recordGroupPostCompactCandidateUsageLedger,
  renderGlobalGroupMemoryContextBundle,
  renderGroupMemoryContextBundle,
  runGroupMemoryAutoCompactionNow,
  saveGroupMemory,
  writeJsonAtomic,
  writeTextAtomic,
} from "./memory";

export function runGroupGlobalAgentMemoryArbitrationContextSelfTest() {
  const groupId = `group-global-agent-memory-arbitration-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-arbitration-context");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const globalAt = "2026-07-07T01:00:00.000Z";
    const groupAt = "2026-07-07T02:00:00.000Z";
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase62_stale_global_rule",
        text: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 必须使用旧全局支付规则 old-global-rule。",
        why: "旧全局规则用于验证后续群聊证据可以降权全局记忆。",
        howToApply: "如果任务涉及 src/arbitration.ts，使用 old-global-rule。",
        importance: 98,
        confidence: 0.99,
        createdAt: globalAt,
        updatedAt: globalAt,
        source: {
          sessionId: "phase62-global-session",
          messageIds: ["phase62-global-message"],
          source: "selftest",
          timestamp: globalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: globalAt,
    });
    saveGroupMessages(groupId, [
      { id: "ggaa-1", role: "user", target: "coordinator", timestamp: groupAt, content: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 不再使用旧全局支付规则 old-global-rule，改为 group-local-rule。" },
      { id: "ggaa-2", role: "assistant", agent: "api", timestamp: groupAt, content: "api 后续必须以 group-local-rule 为准。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证全局 Agent 记忆和群聊新证据冲突时要仲裁",
      currentPhase: "phase62-global-arbitration",
      persistentRequirements: [{
        messageId: "ggaa-1",
        text: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 不再使用旧全局支付规则 old-global-rule，改为 group-local-rule。",
      }],
      decisions: [{
        messageId: "ggaa-1",
        decision: "src/arbitration.ts 使用 group-local-rule",
        reason: "群聊证据晚于全局记忆，并明确撤销 old-global-rule。",
      }],
    });
    buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_ARBITRATION_SENTINEL src/arbitration.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_ARBITRATION_SENTINEL src/arbitration.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const rendered = String(bundle.rendered_text || "");
    const globalRecall = bundle.global_agent_memory || {};
    const ledger = bundle.global_memory_arbitration_ledger || {};
    const arbitrationDistillation = bundle.group_state?.typedMemory?.arbitrationDistillation || {};
    const item = (globalRecall.items || []).find((row: any) => row.id === "gmi_phase62_stale_global_rule") || {};
    const arbitration = item.arbitration || {};
    const checks = {
      globalMemoryWasRecalled: Number(globalRecall.itemCount || 0) >= 1
        && JSON.stringify(globalRecall.items || []).includes("GLOBAL_AGENT_ARBITRATION_SENTINEL"),
      arbitrationDemotesGlobalRule: arbitration.demoted === true
        && arbitration.conflict === true
        && arbitration.status === "possible_conflict_with_newer_group_memory",
      summaryCountsConflict: globalRecall.arbitration?.status === "conflict"
        && Number(globalRecall.arbitration?.conflictCount || 0) >= 1,
      renderedShowsDemotion: rendered.includes("全局记忆仲裁规则")
        && rendered.includes("possible_conflict_with_newer_group_memory")
        && rendered.includes("local_evidence=group.")
        && rendered.includes("#ggaa-1"),
      renderedKeepsLocalRuleVisible: rendered.includes("group-local-rule")
        && rendered.includes("old-global-rule"),
      arbitrationLedgerPersistsConflict: ledger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
        && ledger.file === arbitrationLedgerFile
        && Number(ledger.conflictCount || 0) >= 1
        && Number(ledger.repeatedConflictCount || 0) >= 1
        && fs.existsSync(arbitrationLedgerFile),
      sourceManifestTracksArbitrationLedger: (bundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_arbitration_ledger" && entry.exists === true),
      compactReferencesTrackArbitrationLedger: (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_arbitration_ledger" && entry.exists === true),
      readPlanCanTargetArbitrationLedger: (bundle.compact_file_reference_read_plan?.entries || []).some((entry: any) => entry.type === "global_memory_arbitration_ledger" && entry.action === "read_for_global_group_memory_conflict_history"),
      repeatedConflictDistilledToTypedMemory: arbitrationDistillation.schema === "ccm-group-global-memory-arbitration-distillation-v1"
        && arbitrationDistillation.skipped === false
        && Number(arbitrationDistillation.candidateCount || 0) >= 1
        && fs.existsSync(arbitrationDistillation.write?.file || "")
        && String(fs.readFileSync(arbitrationDistillation.write?.file || "", "utf-8")).includes("GLOBAL_AGENT_ARBITRATION_SENTINEL"),
      renderedMentionsArbitrationDistillation: rendered.includes("全局记忆仲裁蒸馏")
        && rendered.includes("typed MEMORY.md"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, arbitration, ledger, arbitrationDistillation };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, arbitrationLedgerFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try {
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else writeTextAtomic(GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else writeTextAtomic(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
    } catch {}
    releaseGlobalMemorySelftest();
  }
}

export function runGroupGlobalAgentMemorySemanticArbitrationSelfTest() {
  const groupId = `group-global-agent-memory-semantic-arbitration-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-semantic-arbitration");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const globalAt = "2026-07-07T03:00:00.000Z";
    const groupAt = "2026-07-07T04:00:00.000Z";
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase70_semantic_rule",
        text: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 必须使用 stripe-v1-policy 处理支付重试策略。",
        why: "旧全局规则用于验证 semantic arbitration 能识别同一文件锚点下的规则替换。",
        howToApply: "如果任务涉及 src/semantic-arbitration.ts，使用 stripe-v1-policy。",
        importance: 98,
        confidence: 0.99,
        createdAt: globalAt,
        updatedAt: globalAt,
        source: {
          sessionId: "phase70-global-session",
          messageIds: ["phase70-global-message"],
          source: "selftest",
          timestamp: globalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: globalAt,
    });
    saveGroupMessages(groupId, [
      { id: "phase70-semantic-1", role: "user", target: "coordinator", timestamp: groupAt, content: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 当前支付重试策略使用 ledger-v2-policy，stripe-v1-policy 只作为历史标签。" },
      { id: "phase70-semantic-2", role: "assistant", agent: "api", timestamp: groupAt, content: "api 后续核验 src/semantic-arbitration.ts 时以 ledger-v2-policy 为当前规则。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证语义级全局记忆仲裁评分",
      currentPhase: "phase70-semantic-arbitration",
      persistentRequirements: [{
        messageId: "phase70-semantic-1",
        text: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 当前支付重试策略使用 ledger-v2-policy，stripe-v1-policy 只作为历史标签。",
      }],
      decisions: [{
        messageId: "phase70-semantic-1",
        decision: "src/semantic-arbitration.ts 使用 ledger-v2-policy",
        reason: "群聊新证据晚于全局记忆，并给出了同一文件锚点下的当前规则名。",
      }],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL src/semantic-arbitration.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const rendered = String(bundle.rendered_text || "");
    const globalRecall = bundle.global_agent_memory || {};
    const item = (globalRecall.items || []).find((row: any) => row.id === "gmi_phase70_semantic_rule") || {};
    const arbitration = item.arbitration || {};
    const semanticRisk = arbitration.semanticRisk || {};
    const decisiveEvidence = Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : [];
    const ledger = bundle.global_memory_arbitration_ledger || {};
    const rawLedger = fs.existsSync(arbitrationLedgerFile) ? JSON.parse(fs.readFileSync(arbitrationLedgerFile, "utf-8")) : {};
    const ledgerEntry = (rawLedger.entries || []).find((entry: any) => entry.globalMemoryId === "gmi_phase70_semantic_rule") || {};
    const checks = {
      globalMemoryWasRecalled: Number(globalRecall.itemCount || 0) >= 1
        && item.id === "gmi_phase70_semantic_rule",
      semanticRiskScoresConflict: Number(arbitration.semanticRiskScore || semanticRisk.score || 0) >= 60
        && semanticRisk.level !== "none"
        && (semanticRisk.reasons || []).includes("different_named_rule"),
      arbitrationDemotesViaSemanticConflict: arbitration.demoted === true
        && arbitration.conflict === true
        && arbitration.status === "possible_conflict_with_newer_group_memory",
      decisiveEvidenceCarriesSemanticReasons: decisiveEvidence.some((evidence: any) => Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0) >= 60
        && (evidence.semanticReasons || evidence.semanticRisk?.reasons || []).includes("current_local_rule_differs")),
      renderedShowsSemanticRisk: rendered.includes("semantic_risk=")
        && rendered.includes("semantic_reasons=")
        && rendered.includes("different_named_rule")
        && rendered.includes("ledger-v2-policy")
        && rendered.includes("stripe-v1-policy"),
      ledgerPersistsSemanticRisk: ledger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
        && Number(ledger.semanticRiskCount || 0) >= 1
        && Number(ledger.maxSemanticRiskScore || 0) >= 60
        && Number(ledgerEntry.semanticRiskScore || 0) >= 60
        && (ledgerEntry.semanticReasons || []).includes("different_named_rule"),
      sourceManifestTracksArbitrationLedger: (bundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_arbitration_ledger" && entry.exists === true),
      compactReferencesTrackArbitrationLedger: (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_arbitration_ledger" && entry.exists === true),
    };
    return { pass: Object.values(checks).every(Boolean), checks, arbitration, ledger, ledgerEntry };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, arbitrationLedgerFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try {
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else writeTextAtomic(GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else writeTextAtomic(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
    } catch {}
    releaseGlobalMemorySelftest();
  }
}

export function runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest() {
  const suffix = `${process.pid}-${Date.now().toString(36)}`;
  const groupA = `group-global-agent-memory-cross-group-source-${suffix}`;
  const groupB = `group-global-agent-memory-cross-group-target-${suffix}`;
  const cleanupFiles = [groupA, groupB].flatMap(groupId => [
    getGroupMessagesFileHint(groupId),
    `${getGroupMessagesFileHint(groupId)}.bak`,
    getGroupMemoryFile(groupId),
    `${getGroupMemoryFile(groupId)}.bak`,
    getGroupMemoryReloadLedgerFile(groupId),
    `${getGroupMemoryReloadLedgerFile(groupId)}.bak`,
    getGroupGlobalMemoryArbitrationLedgerFile(groupId),
    `${getGroupGlobalMemoryArbitrationLedgerFile(groupId)}.bak`,
  ]);
  const cleanupDirs = [getGroupTypedMemoryDir(groupA), getGroupTypedMemoryDir(groupB)];
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-cross-group-suppression");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const globalAt = "2026-07-07T05:00:00.000Z";
    const sourceGroupAt = "2026-07-07T06:00:00.000Z";
    const targetGroupAt = "2026-07-07T07:00:00.000Z";
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase67_cross_group_stale_rule",
        text: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 必须使用 old-cross-group-rule。",
        why: "旧全局规则用于验证其他群聊已判定过时后，新的群聊子 Agent 包会谨慎降权。",
        howToApply: "如果任务涉及 src/cross-group.ts，直接使用 old-cross-group-rule。",
        importance: 99,
        confidence: 0.99,
        createdAt: globalAt,
        updatedAt: globalAt,
        source: {
          sessionId: "phase67-global-session",
          messageIds: ["phase67-global-message"],
          source: "selftest",
          timestamp: globalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: globalAt,
    });
    saveGroupMessages(groupA, [
      { id: "phase67-a-1", role: "user", target: "coordinator", timestamp: sourceGroupAt, content: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 不再使用 old-cross-group-rule，改为 fresh-cross-group-rule。" },
    ]);
    saveGroupMemory(groupA, {
      groupId: groupA,
      goal: "验证跨群聊全局记忆抑制的来源群聊",
      currentPhase: "phase67-cross-group-source",
      persistentRequirements: [{
        messageId: "phase67-a-1",
        text: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 不再使用 old-cross-group-rule，改为 fresh-cross-group-rule。",
      }],
      decisions: [{
        messageId: "phase67-a-1",
        decision: "src/cross-group.ts 使用 fresh-cross-group-rule",
        reason: "群聊 A 的新证据明确撤销旧全局规则。",
      }],
    });
    const sourceBundle = buildAgentMemoryContextBundle(groupA, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-group.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const sourceLedger = sourceBundle.global_memory_arbitration_ledger || {};

    saveGroupMessages(groupB, [
      { id: "phase67-b-1", role: "user", target: "coordinator", timestamp: targetGroupAt, content: "继续 src/cross-group.ts，本群聊需要先核验当前真实状态。" },
    ]);
    saveGroupMemory(groupB, {
      groupId: groupB,
      goal: "验证跨群聊全局记忆抑制的目标群聊",
      currentPhase: "phase67-cross-group-target",
      completed: [{ project: "api", summary: "准备检查 src/cross-group.ts 当前实现。" }],
    });
    const targetBundle = buildAgentMemoryContextBundle(groupB, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-group.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      crossGroupGlobalMemoryConflictGroupThreshold: 1,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const rendered = String(targetBundle.rendered_text || "");
    const globalRecall = targetBundle.global_agent_memory || {};
    const item = (globalRecall.items || []).find((row: any) => row.id === "gmi_phase67_cross_group_stale_rule") || {};
    const cross = item.crossGroupSuppression || {};
    const arbitration = item.arbitration || {};
    const checks = {
      sourceGroupRecordedConflict: sourceLedger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
        && Number(sourceLedger.conflictCount || 0) >= 1
        && fs.existsSync(getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
      targetRecallsSameGlobalMemory: Number(globalRecall.itemCount || 0) >= 1
        && item.id === "gmi_phase67_cross_group_stale_rule",
      targetSuppressesByCrossGroupLedger: cross.suppressed === true
        && Number(cross.conflictGroupCount || 0) >= 1
        && (cross.sourceLedgers || []).some((entry: any) => entry.file === getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
      arbitrationDemotesWithoutLocalConflict: ["suppressed_by_cross_group_arbitration", "demoted_by_newer_group_evidence"].includes(arbitration.status)
        && arbitration.demoted === true
        && arbitration.conflict === false
        && arbitration.crossGroupSuppressed === true,
      recallSummaryCountsCrossGroupSuppression: Number(globalRecall.arbitration?.crossGroupSuppressedCount || 0) >= 1
        && globalRecall.reason === "global_memory_suppressed_by_cross_group_arbitration",
      renderedWarnsChildAgent: rendered.includes("跨群聊全局记忆抑制")
        && rendered.includes("cross_group_suppression=background_only")
        && rendered.includes("background"),
      sourceManifestTracksCrossGroupLedgerDir: (targetBundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_cross_group_arbitration" && entry.exists === true),
      compactReferencesTrackCrossGroupLedgerDir: (targetBundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_cross_group_arbitration" && entry.exists === true),
      readPlanTargetsCrossGroupSuppression: (targetBundle.compact_file_reference_read_plan?.entries || []).some((entry: any) => entry.type === "global_memory_cross_group_arbitration" && entry.action === "read_for_cross_group_global_memory_suppression"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      crossGroupSuppression: cross,
      arbitration,
      sourceLedger,
      targetSummary: globalRecall.crossGroupSuppression || {},
    };
  } finally {
    for (const file of cleanupFiles) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of cleanupDirs) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    try {
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else writeTextAtomic(GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else writeTextAtomic(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
    } catch {}
    releaseGlobalMemorySelftest();
  }
}

export function runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest() {
  const suffix = `${process.pid}-${Date.now().toString(36)}`;
  const groupA = `group-global-agent-memory-freshness-source-${suffix}`;
  const groupB = `group-global-agent-memory-freshness-target-${suffix}`;
  const cleanupFiles = [groupA, groupB].flatMap(groupId => [
    getGroupMessagesFileHint(groupId),
    `${getGroupMessagesFileHint(groupId)}.bak`,
    getGroupMemoryFile(groupId),
    `${getGroupMemoryFile(groupId)}.bak`,
    getGroupMemoryReloadLedgerFile(groupId),
    `${getGroupMemoryReloadLedgerFile(groupId)}.bak`,
    getGroupGlobalMemoryArbitrationLedgerFile(groupId),
    `${getGroupGlobalMemoryArbitrationLedgerFile(groupId)}.bak`,
  ]);
  const cleanupDirs = [getGroupTypedMemoryDir(groupA), getGroupTypedMemoryDir(groupB)];
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-cross-group-freshness");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const oldGlobalAt = "2026-07-07T05:00:00.000Z";
    const sourceAt = "2026-07-07T06:00:00.000Z";
    const newerGlobalAt = new Date(Date.now() + 60_000).toISOString();
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase68_cross_group_freshness_rule",
        text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 必须使用 stale-freshness-rule。",
        why: "旧全局规则用于验证 cross-group suppression freshness。",
        howToApply: "旧规则：直接使用 stale-freshness-rule。",
        importance: 99,
        confidence: 0.99,
        createdAt: oldGlobalAt,
        updatedAt: oldGlobalAt,
        source: {
          sessionId: "phase68-old-global-session",
          messageIds: ["phase68-old-global-message"],
          source: "selftest",
          timestamp: oldGlobalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: oldGlobalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: oldGlobalAt,
    });
    saveGroupMessages(groupA, [
      { id: "phase68-a-1", role: "user", target: "coordinator", timestamp: sourceAt, content: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 不再使用 stale-freshness-rule，改为 source-group-rule。" },
    ]);
    saveGroupMemory(groupA, {
      groupId: groupA,
      goal: "验证跨群聊抑制新鲜度的来源群聊",
      currentPhase: "phase68-freshness-source",
      persistentRequirements: [{
        messageId: "phase68-a-1",
        text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 不再使用 stale-freshness-rule，改为 source-group-rule。",
      }],
    });
    const sourceBundle = buildAgentMemoryContextBundle(groupA, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL src/freshness.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const sourceLedger = sourceBundle.global_memory_arbitration_ledger || {};

    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase68_cross_group_freshness_rule",
        text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 已更新为 verified-global-rule；旧跨群聊冲突只能作为 advisory。",
        why: "同一 Global Agent memory id 在跨群聊冲突之后被重新写入，应覆盖旧 suppression。",
        howToApply: "使用 verified-global-rule 前仍读取当前代码和当前群聊证据。",
        importance: 99,
        confidence: 0.99,
        createdAt: oldGlobalAt,
        updatedAt: newerGlobalAt,
        source: {
          sessionId: "phase68-new-global-session",
          messageIds: ["phase68-new-global-message"],
          source: "selftest",
          timestamp: newerGlobalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: newerGlobalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: newerGlobalAt,
    });
    saveGroupMessages(groupB, [
      { id: "phase68-b-1", role: "user", target: "coordinator", timestamp: newerGlobalAt, content: "继续 freshness 目标群聊，按当前来源核验。" },
    ]);
    saveGroupMemory(groupB, {
      groupId: groupB,
      goal: "验证跨群聊抑制被新全局记忆覆盖",
      currentPhase: "phase68-freshness-target",
    });
    const targetBundle = buildAgentMemoryContextBundle(groupB, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL src/freshness.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      crossGroupGlobalMemoryConflictGroupThreshold: 1,
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const rendered = String(targetBundle.rendered_text || "");
    const globalRecall = targetBundle.global_agent_memory || {};
    const item = (globalRecall.items || []).find((row: any) => row.id === "gmi_phase68_cross_group_freshness_rule") || {};
    const cross = item.crossGroupSuppression || {};
    const freshness = cross.freshness || {};
    const arbitration = item.arbitration || {};
    const checks = {
      sourceGroupRecordedConflict: sourceLedger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
        && Number(sourceLedger.conflictCount || 0) >= 1
        && fs.existsSync(getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
      targetRecallsUpdatedGlobalMemory: Number(globalRecall.itemCount || 0) >= 1
        && item.id === "gmi_phase68_cross_group_freshness_rule"
        && JSON.stringify(globalRecall.items || []).includes("verified-global-rule"),
      suppressionDowngradedToAdvisory: cross.suppressed === false
        && cross.advisory === true
        && cross.reason === "cross_group_evidence_superseded_by_newer_global_memory"
        && freshness.supersededByNewerGlobalMemory === true
        && Number(freshness.globalNewerByMs || 0) > 0,
      arbitrationDoesNotCrossGroupSuppress: arbitration.crossGroupSuppressed === false
        && arbitration.status === "active_global_context",
      recallSummaryCountsFreshness: Number(globalRecall.crossGroupSuppression?.advisoryCount || 0) >= 1
        && Number(globalRecall.crossGroupSuppression?.supersededCount || 0) >= 1
        && Number(globalRecall.crossGroupSuppression?.suppressedCount || 0) === 0,
      renderedShowsFreshnessAdvisory: rendered.includes("跨群聊抑制新鲜度")
        && rendered.includes("cross_group_suppression=advisory")
        && rendered.includes("superseded=true"),
      sourceManifestTracksCrossGroupLedgerDir: (targetBundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_cross_group_arbitration" && entry.exists === true),
      compactReferencesTrackCrossGroupLedgerDir: (targetBundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_cross_group_arbitration" && entry.exists === true),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      crossGroupSuppression: cross,
      arbitration,
      sourceLedger,
      targetSummary: globalRecall.crossGroupSuppression || {},
    };
  } finally {
    for (const file of cleanupFiles) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of cleanupDirs) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    try {
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else writeTextAtomic(GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else writeTextAtomic(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
    } catch {}
    releaseGlobalMemorySelftest();
  }
}

export function runGroupTypedMemoryContextSelfTest() {
  const groupId = `typed-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, Array.from({ length: 18 }, (_, index) => ({
      id: `tm-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? "必须长期保留 IDEMPOTENCY_CONTEXT_SENTINEL，以后每次支付回调都不能跳过验签。"
        : `类型化记忆上下文测试 ${index}，涉及 src/pay.ts 和 npm run check。`,
    })));
    saveGroupMemory(groupId, {
      goal: "支付回调 typed memory 上下文自测",
      persistentRequirements: [{ messageId: "tm-0", text: "必须长期保留 IDEMPOTENCY_CONTEXT_SENTINEL，以后每次支付回调都不能跳过验签。" }],
      decisions: [{ decision: "使用 webhook idempotency key", reason: "避免重复入账" }],
      blocked: [{ project: "api", reason: "验签测试失败，需要继续修复" }],
      factAnchors: [{ id: "tm-fact", type: "user_requirement", messageId: "tm-0", text: "src/pay.ts 是支付回调核心文件" }],
      compaction: {
        postCompactReinject: {
          hasCandidates: true,
          files: [{ value: "src/pay.ts", sourceMessageId: "tm-1" }],
          verification: [{ value: "npm run check", sourceMessageId: "tm-2" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          action: "safe_to_inject_child_agent_memory_packet",
          passedChecks: 11,
          checkCount: 11,
          failedChecks: [],
          transcriptPath: "typed-context-raw.json",
          candidateCounts: { files: 1, skills: 0, verification: 1, blockers: 0 },
        },
        partialSegments: [{
          schema: "ccm-group-partial-compact-segment-v1",
          direction: "range",
          range: { fromMessageId: "tm-4", throughMessageId: "tm-8", messageCount: 5 },
          quality: { score: 96, status: "pass", pass: true },
          summaryChecksum: "partial-sidecar-context-test",
        }],
        ptlEmergency: {
          schema: "ccm-group-ptl-emergency-v1",
          version: 1,
          engaged: true,
          emergencyLevel: "critical",
          reason: "context-selftest-pressure",
          triggerTokens: 137000,
          messageDigestMaxChars: 700,
          rawTranscriptPath: "typed-context-raw.json",
        },
      },
    });
    const typedIndex = runGroupTypedMemoryIndexSelfTest();
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "pay-path-context-rule",
      name: "Pay path context rule",
      description: "Only applies to src/pay.ts context bundles.",
      source: "selftest:path-condition",
      paths: ["src/pay.ts"],
      body: "PATH_CONTEXT_RULE_PAY_SENTINEL：src/pay.ts 子 Agent 必须优先验签和幂等。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "search-path-context-rule",
      name: "Search path context rule",
      description: "Only applies to search files.",
      source: "selftest:path-condition",
      paths: ["src/search/**/*.ts"],
      body: "PATH_CONTEXT_RULE_SEARCH_SENTINEL：搜索任务专用，支付任务不应注入。",
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续支付回调 IDEMPOTENCY_CONTEXT_SENTINEL src/pay.ts npm run check", { minKeepTokens: 1 });
    const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "继续支付回调 IDEMPOTENCY_CONTEXT_SENTINEL src/pay.ts npm run check", { minKeepTokens: 1 });
    const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
    const recall = bundle.group_state?.typedMemory?.recall || {};
    const secondRecall = secondBundle.group_state?.typedMemory?.recall || {};
    const ignoredRecall = ignored.group_state?.typedMemory?.recall || {};
    const checks = {
      typedIndexSelfTestPasses: typedIndex.pass === true,
      syncCreatesIndex: !!bundle.group_state?.typedMemory?.sync?.indexFile && fs.existsSync(bundle.group_state.typedMemory.sync.indexFile),
      recallsTypedMemory: Array.isArray(recall.recalled) && recall.recalled.length > 0,
      recallFindsSentinel: JSON.stringify(recall.recalled || []).includes("IDEMPOTENCY_CONTEXT_SENTINEL"),
      renderedInjectsTypedMemory: String(bundle.rendered_text || "").includes("类型化长期记忆") && String(bundle.rendered_text || "").includes("src/pay.ts"),
      distillationRunsForContextBundle: bundle.group_state?.typedMemory?.distillation?.schema === "ccm-group-typed-memory-distillation-v1"
        && Number(bundle.group_state.typedMemory.distillation.candidateCount || 0) > 0,
      renderedMentionsDistillation: String(bundle.rendered_text || "").includes("长期日志蒸馏"),
      renderedMentionsDistillationQuality: String(bundle.rendered_text || "").includes("长期日志蒸馏质量"),
      renderedMentionsSourceManifest: String(bundle.rendered_text || "").includes("记忆源 manifest")
        && bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1"
        && bundle.source_manifest?.status === "pass",
      renderedMentionsReloadAudit: String(bundle.rendered_text || "").includes("记忆 reload 审计")
        && bundle.memory_reload_audit?.schema === "ccm-group-memory-reload-audit-v1",
      renderedMentionsTypedLoadPlan: String(bundle.rendered_text || "").includes("类型化 MEMORY.md 加载计划")
        && bundle.group_state?.typedMemory?.loadPlan?.schema === "ccm-group-typed-memory-load-plan-v1"
        && bundle.group_state.typedMemory.loadPlan.status === "pass",
      pathConditionalMemoryHonored: String(bundle.rendered_text || "").includes("PATH_CONTEXT_RULE_PAY_SENTINEL")
        && !String(bundle.rendered_text || "").includes("PATH_CONTEXT_RULE_SEARCH_SENTINEL")
        && Number(bundle.group_state?.typedMemory?.recall?.conditionalSkipped || 0) >= 1,
      renderedMentionsPostCompactRecoveryAudit: String(bundle.rendered_text || "").includes("压缩后恢复审计")
        && String(bundle.rendered_text || "").includes("safe_to_inject_child_agent_memory_packet"),
      postCompactReinjectionGateRecorded: bundle.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1"
        && bundle.post_compact_reinjection_gate?.candidate_count >= 1,
      renderedMentionsPostCompactReinjectionGate: String(bundle.rendered_text || "").includes("压缩后重注入门禁")
        && !!bundle.post_compact_reinjection_gate?.reinjection_gate_id
        && String(bundle.rendered_text || "").includes(bundle.post_compact_reinjection_gate.reinjection_gate_id),
      renderedMentionsReinjectionCandidateIds: String(bundle.rendered_text || "").includes("candidate_id=pcrc_"),
      postCompactDispatchMarkerRecorded: bundle.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && bundle.post_compact_dispatch_marker?.first_dispatch_after_compact === true
        && secondBundle.post_compact_dispatch_marker?.dispatch_sequence === 2,
      renderedMentionsPostCompactDispatchMarker: String(bundle.rendered_text || "").includes("压缩后派发标记")
        && String(bundle.rendered_text || "").includes(bundle.post_compact_dispatch_marker?.marker_id || "missing-marker"),
      renderedMentionsPartialSidecar: String(bundle.rendered_text || "").includes("选择性压缩 sidecar")
        && String(bundle.rendered_text || "").includes("tm-4"),
      ptlRecoveryRendered: bundle.compaction?.ptlRecovery?.schema === "ccm-group-ptl-recovery-v1"
        && String(bundle.rendered_text || "").includes("PTL 自动恢复")
        && !bundle.compaction?.ptlEmergency,
      ledgerDedupesSecondRecall: Array.isArray(secondRecall.recalled) && secondRecall.recalled.length < recall.recalled.length,
      ledgerRecordedSurfaced: Array.isArray(bundle.group_state?.typedMemory?.ledger?.recordedThisTurn) && bundle.group_state.typedMemory.ledger.recordedThisTurn.length > 0,
      ignoreMemoryHonoredForTypedRecall: ignoredRecall.ignored === true && Array.isArray(ignoredRecall.recalled) && ignoredRecall.recalled.length === 0
        && String(ignored.rendered_text || "").includes("忽略记忆"),
      ignoreMemoryRenderedWithoutOldFacts: !String(ignored.rendered_text || "").includes("IDEMPOTENCY_CONTEXT_SENTINEL")
        && !String(ignored.rendered_text || "").includes("src/pay.ts")
        && !String(ignored.rendered_text || "").includes("类型化长期记忆（MEMORY.md"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, recalled: (recall.recalled || []).map((item: any) => item.relPath) };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryContextPressureRepairProvenanceSelfTest() {
  const groupId = `typed-memory-context-pressure-repair-${process.pid}-${Date.now().toString(36)}`;
  const targetProject = "phase131-pressure-project";
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
  const repairFile = getGroupReplayRepairWorkItemsFile(groupId);
  try {
    saveGroupMessages(groupId, [{
      id: "phase131-1",
      role: "user",
      target: "coordinator",
      content: "继续 WorkerContextPacket pressure repair provenance 下发测试。",
    }]);
    saveGroupMemory(groupId, {
      goal: "验证 pressure recall repair provenance 进入子 Agent 上下文",
      persistentRequirements: [{ messageId: "phase131-1", text: "pressure repair provenance must be visible to child Agent sessions." }],
      decisions: [],
      factAnchors: [],
      compaction: {},
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Child Agent context must show when this pressure memory is disputed under repair.",
      source: "selftest:context-pressure-repair-provenance",
      body: [
        "PRESSURE_CONTEXT_REPAIR_BUNDLE_SENTINEL",
        "When this memory appears with pressure repair provenance, verify current packet budget before applying it.",
      ].join("\n"),
    });
    recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
      targetProject,
      taskId: "phase131-pressure-context-task",
      executionId: "phase131-pressure-context-execution",
      agent: targetProject,
      generatedAt: "2026-07-09T23:59:00.000Z",
      rows: [
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-phase131-context-ignored-1" },
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-phase131-context-ignored-2" },
      ],
    });
    writeJsonAtomic(repairFile, {
      schema: "ccm-compact-boundary-replay-repair-work-items-v1",
      version: 1,
      groupId,
      file: repairFile,
      items: [{
        id: "cgpru-context-repair-provenance-selftest",
        work_item_id: "cgpru-context-repair-provenance-selftest",
        source: "cross_group_pressure_recall_usage_repair",
        component: "cross_group_pressure_recall_usage",
        status: "pending",
        priority: "high",
        target_project: targetProject,
        repair_target: "worker-context-usage-pressure-discipline.md",
        cross_group_pressure_recall_usage_gap_type: "recommendation_conflict",
        cross_group_pressure_recall_usage_rel_path: "worker-context-usage-pressure-discipline.md",
        cross_group_pressure_recall_usage_reason: "selftest: pressure memory disputed before child Agent dispatch",
        local_recommendation: "deprioritize_pressure_recall",
        cross_group_recommendation: "promote_pressure_recall",
        source_group_count: 1,
        source_groups: [{ groupId: "phase131-source-group", entry_count: 2 }],
        shouldCreateRealTask: false,
        updatedAt: "2026-07-09T23:59:10.000Z",
      }],
      stats: { total: 1, openItemCount: 1, pendingCount: 1 },
      updatedAt: "2026-07-09T23:59:10.000Z",
    });
    const contextUsage = {
      schema: "ccm-worker-context-usage-v1",
      packet_id: "wcp-phase131-context",
      project: targetProject,
      status: "over_budget",
      pressure: 113,
      total_tokens: 101_700,
      max_tokens: 90_000,
      free_tokens: -24_700,
      autocompact_buffer_tokens: 13_000,
    };
    const bundle = buildAgentMemoryContextBundle(
      groupId,
      targetProject,
      "继续 WorkerContextPacket over_budget PRESSURE_CONTEXT_REPAIR_BUNDLE_SENTINEL",
      {
        workerContextPacketContextUsage: contextUsage,
        maxTypedMemory: 8,
        minKeepTokens: 1,
      },
    );
    const recall = bundle.group_state?.typedMemory?.recall || {};
    const doc: any = (recall.recalled || []).find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md")
      || (recall.diagnostics || []).find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md")
      || {};
    const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
    const packet = buildWorkerContextPacket({
      group: { id: groupId, name: "phase131-pressure-repair", members: [{ project: targetProject }] },
      project: targetProject,
      task: "继续 WorkerContextPacket over_budget PRESSURE_CONTEXT_REPAIR_BUNDLE_SENTINEL",
      memory: bundle,
      contextUsageOptions: { maxTokens: 90_000 },
    });
    const renderedPacket = renderWorkerContextPacket(packet);
    const discipline = bundle.pressure_memory_provenance_receipt_discipline || {};
    const checks = {
      bundleRecallCarriesRepair: Number(recall.workerContextPressureUsageScoring?.repair_matched_count || 0) >= 1
        && doc.workerContextPressureUsage?.matched?.some((match: any) => match.repair_work_item_id === "cgpru-context-repair-provenance-selftest"
          && match.provenance_status === "disputed_under_repair"),
      bundleRenderedTextCarriesRepair: String(bundle.rendered_text || "").includes("pressure repair recommendation_conflict:pending")
        && String(bundle.rendered_text || "").includes("PRESSURE_CONTEXT_REPAIR_BUNDLE_SENTINEL")
        && String(bundle.rendered_text || "").includes("memoryProvenanceUsage 示例")
        && String(bundle.rendered_text || "").includes("repairStatus")
        && String(bundle.rendered_text || "").includes("repairGapType"),
      bundleCarriesPreDispatchDiscipline: discipline.schema === "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1"
        && discipline.active === true
        && Number(discipline.docCount || 0) >= 1
        && (discipline.requiredFields || []).includes("repairStatus")
        && (discipline.requiredFields || []).includes("repairGapType")
        && JSON.stringify(discipline.exampleRows || []).includes("currentSourceVerified"),
      workerContextPacketCarriesRepairMemory: renderedPacket.includes("pressure repair recommendation_conflict:pending")
        && renderedPacket.includes("Pressure memory provenance receipt discipline")
        && renderedPacket.includes("Example CCM_AGENT_RECEIPT.memoryProvenanceUsage")
        && packet.acceptance?.memory_provenance_usage_required === true
        && packet.pressure_memory_provenance_receipt_discipline?.schema === "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1"
        && renderedPacket.includes("平台记忆")
        && packet.context_usage?.categories?.some((item: any) => item.id === "group_memory_rendered" && Number(item.tokens || 0) > 0)
        && packet.context_usage?.categories?.some((item: any) => item.id === "pressure_memory_provenance_receipt_discipline" && item.required === true && Number(item.tokens || 0) > 0),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      scoring: recall.workerContextPressureUsageScoring || null,
      renderedExcerpt: String(renderedPacket || "").slice(0, 1800),
    };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile, repairFile, `${repairFile}.bak`]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export async function runGroupMemoryAutoCompactionSelfTest() {
  const groupId = `group-memory-auto-compact-selftest-${process.pid}-${Date.now().toString(36)}`;
  const sessionId = `gcs_auto_compact_${process.pid}_${Date.now().toString(36)}`;
  const typedMemoryScopeId = `${groupId}--${sessionId}`;
  const messageFile = getGroupMessagesFileHint(groupId, sessionId);
  const memoryFile = getGroupMemoryFile(groupId, sessionId);
  const typedDir = getGroupTypedMemoryDir(typedMemoryScopeId);
  const bareGroupTypedDir = getGroupTypedMemoryDir(groupId);
  const messages = Array.from({ length: 80 }, (_, index) => ({
    id: `gm-auto-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "frontend" : undefined,
    timestamp: `2026-07-07T01:${String(index % 60).padStart(2, "0")}:00.000Z`,
    content: index === 0
      ? "长期必须保留自动压缩哨兵 AUTO_COMPACT_SENTINEL_20260707"
      : `自动压缩测试消息 ${index}，涉及 src/auto-${index}.ts，${"上下文".repeat(40)}`,
  }));
  try {
    saveGroupMessages(groupId, messages, sessionId);
    const result: any = await runGroupMemoryAutoCompactionNow(groupId, {
      sessionId,
      force: true,
      rebuild: true,
      reason: "selftest",
      config: { memoryCompactionUseModel: false },
    });
    const memory = loadGroupMemory(groupId, sessionId);
    const rawMessages = getGroupMessages(groupId, sessionId);
    const checks = {
      success: result.success === true,
      compacted: result.compacted === true,
      boundaryRecorded: !!memory?.compactBoundary?.summarizedThroughMessageId || !!memory?.compaction?.lastCompactedMessageId,
      backgroundRecorded: memory?.compaction?.background?.status === "compacted" && memory.compaction.background.reason === "selftest",
      qualityGatePassed: memory?.compaction?.quality?.pass === true && Number(memory?.compaction?.quality?.score || 0) >= 80,
      microCompactRecorded: memory?.compaction?.microCompact?.schema === "ccm-group-micro-compact-v1",
      postCompactReinjectRecorded: memory?.compaction?.postCompactReinject?.schema === "ccm-post-compact-reinjection-v1",
      postCompactRecoveryAuditRecorded: memory?.compaction?.postCompactRecoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1"
        && memory?.messageCompression?.postCompactRecoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1",
      logDistillationRecorded: memory?.compaction?.logDistillation?.schema === "ccm-group-typed-memory-distillation-v1"
        && Number(memory.compaction.logDistillation.candidateCount || 0) > 0,
      typedMemoryBoundToSession: result.typedMemoryScopeId === typedMemoryScopeId
        && memory?.compaction?.background?.typedMemoryScopeId === typedMemoryScopeId
        && memory?.compaction?.logDistillation?.groupId === typedMemoryScopeId,
      noBareGroupTypedMemoryCreated: !fs.existsSync(bareGroupTypedDir),
      contextPressureWarningRecorded: memory?.compaction?.contextPressureWarning?.schema === "ccm-group-compact-warning-v1"
        && memory?.messageCompression?.contextPressureWarning?.schema === "ccm-group-compact-warning-v1",
      summaryPreservesSentinel: JSON.stringify(memory?.conversationSummary || {}).includes("AUTO_COMPACT_SENTINEL_20260707")
        || String(memory?.messageDigest || "").includes("AUTO_COMPACT_SENTINEL_20260707"),
      rawTranscriptUntouched: rawMessages.length === messages.length && rawMessages[0]?.content?.includes("AUTO_COMPACT_SENTINEL_20260707"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, background: memory?.compaction?.background || null };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}
