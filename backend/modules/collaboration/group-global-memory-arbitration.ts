// Behavior-freeze module extracted mechanically from the former facade.

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

import { GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION, GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION, compactMemoryText, hashSessionMemoryText, intersectionValues, uniqueByKey, writeJsonAtomic } from "./group-memory-shared";

export function getGroupGlobalMemoryArbitrationLedgerFile(groupId: string) {
  return path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}


export function buildChildGlobalAgentMemoryHealthGate(input: any = {}) {
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const selftestBypass = input.allowSelftestGlobalMemoryForSelfTest === true || input.allow_selftest_global_memory_for_selftest === true;
  let scan: any = null;
  let error = "";
  try {
    scan = scanGlobalAgentMemorySelfTestContamination({
      includeResidue: input.includeResidue !== false && input.include_residue !== false,
      limit: input.limit || 40,
    });
  } catch (err: any) {
    error = err?.message || String(err);
  }
  const activeCount = Number(scan?.active_contamination_count || 0);
  const residueCount = Number(scan?.residue_contamination_count || 0);
  const status = selftestBypass ? "ok" : error ? "fail" : activeCount > 0 ? "fail" : residueCount > 0 ? "warn" : "ok";
  const action = status === "fail"
    ? "block_global_agent_memory_recall"
    : status === "warn"
      ? "use_active_global_memory_with_residue_warning"
      : selftestBypass
        ? "allow_global_agent_memory_recall_for_selftest_fixture"
        : "allow_global_agent_memory_recall";
  const summarizeRow = (row: any = {}) => ({
    file: row.file || "",
    role: row.role || "",
    kind: row.kind || "",
    id: row.id || "",
    active: row.active === true,
  });
  const rows = Array.isArray(scan?.rows) ? scan.rows : [];
  const gate: any = {
    schema: "ccm-child-global-agent-memory-health-gate-v1",
    version: GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION,
    gate_id: `ggmh_${crypto.createHash("sha256").update(JSON.stringify([
      input.groupId || input.group_id || "",
      input.targetProject || input.target_project || "",
      input.task || input.query || "",
      activeCount,
      residueCount,
      scan?.generatedAt || generatedAt,
    ])).digest("hex").slice(0, 18)}`,
    generated_at: generatedAt,
    group_id: String(input.groupId || input.group_id || ""),
    target_project: String(input.targetProject || input.target_project || ""),
    status,
    pass: status !== "fail",
    action,
    selftest_bypass: selftestBypass,
    file: GLOBAL_AGENT_MEMORY_FILE,
    scan_status: scan?.status || (error ? "error" : "unknown"),
    active_contamination_count: activeCount,
    residue_contamination_count: residueCount,
    error: compactMemoryText(error, 420),
    active_rows: rows.filter((row: any) => row.active === true).slice(0, 8).map(summarizeRow),
    residue_rows: rows.filter((row: any) => row.active !== true).slice(0, 8).map(summarizeRow),
    policy: {
      fail_blocks_global_memory_recall: true,
      residue_warn_allows_active_memory: true,
      child_agent_must_verify_current_source: true,
      no_contaminated_preview_in_context: true,
    },
    receipt_contract: {
      required_fields: ["globalMemoryUsage", "memoryUsed", "memoryIgnored"],
      on_fail: "memoryIgnored must mention this gate and no global_memory_id should be used",
      on_warn: "globalMemoryUsage may use active memory but should acknowledge residue warning if relevant",
    },
  };
  return {
    ...gate,
    context_budget: buildContextBudget({ context: gate, maxChars: 5000, maxTokens: 12_000 }),
  };
}


export function buildChildGlobalAgentMemoryContext(query: string, options: any = {}) {
  if (options.includeGlobalAgentMemory === false || options.include_global_agent_memory === false) {
    return {
      schema: "ccm-child-global-agent-memory-recall-v1",
      included: false,
      ignored: false,
      reason: "disabled_by_options",
      file: GLOBAL_AGENT_MEMORY_FILE,
      items: [],
      citations: [],
      itemCount: 0,
    };
  }
  if (shouldIgnoreGroupMemoryRequest(query, options)) {
    return {
      schema: "ccm-child-global-agent-memory-recall-v1",
      included: false,
      ignored: true,
      reason: "user_requested_ignore_memory",
      file: GLOBAL_AGENT_MEMORY_FILE,
      items: [],
      citations: [],
      itemCount: 0,
    };
  }
  const memoryHealthGate = buildChildGlobalAgentMemoryHealthGate({
    groupId: options.groupId || options.group_id,
    targetProject: options.targetProject || options.target_project,
    query,
    generatedAt: options.generatedAt || options.generated_at,
    allowSelftestGlobalMemoryForSelfTest: options.allowSelftestGlobalMemoryForSelfTest || options.allow_selftest_global_memory_for_selftest,
  });
  if (memoryHealthGate.status === "fail") {
    return {
      schema: "ccm-child-global-agent-memory-recall-v1",
      version: 1,
      included: false,
      ignored: false,
      healthBlocked: true,
      reason: "global_agent_memory_health_gate_failed",
      file: GLOBAL_AGENT_MEMORY_FILE,
      memory_health_gate: memoryHealthGate,
      arbitration: {
        schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
        status: "health_blocked",
        localEvidenceCount: 0,
        demotedCount: 0,
        conflictCount: 0,
        crossGroupSuppressedCount: 0,
        crossGroupScannedLedgerCount: 0,
        activeCount: 0,
        authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
      },
      crossGroupSuppression: {
        schema: "ccm-cross-group-global-memory-suppression-summary-v1",
        sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount: 0,
        indexedMemoryCount: 0,
        suppressedCount: 0,
        advisoryCount: 0,
        supersededCount: 0,
        decayedCount: 0,
        conflictCount: 0,
        demotedCount: 0,
        items: [],
        advisoryItems: [],
      },
      items: [],
      citations: [],
      itemCount: 0,
    };
  }
  const recall = recallGlobalAgentMemory(query, {
    sessionId: options.globalAgentSessionId || options.global_agent_session_id || options.sessionId || options.session_id,
    limit: Number(options.maxGlobalAgentMemory || options.max_global_agent_memory || 5),
  });
  if (recall?.ignored) {
    return {
      schema: "ccm-child-global-agent-memory-recall-v1",
      included: false,
      ignored: true,
      reason: "user_requested_ignore_memory",
      file: GLOBAL_AGENT_MEMORY_FILE,
      items: [],
      citations: [],
      itemCount: 0,
      memory_health_gate: memoryHealthGate,
    };
  }
  const currentGroupId = String(options.groupId || options.group_id || "");
  const localEvidence = collectChildGlobalMemoryLocalEvidence(options);
  const crossGroupSuppressionIndex = buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId, options);
  const items = (Array.isArray(recall?.items) ? recall.items : []).slice(0, 8).map((item: any) => {
    const source = item.source || {};
    const crossGroupSuppression = buildCrossGroupGlobalMemorySuppressionForItem(item, crossGroupSuppressionIndex, options);
    const arbitration = applyCrossGroupGlobalMemorySuppression(
      arbitrateChildGlobalAgentMemoryItem(item, localEvidence),
      crossGroupSuppression
    );
    return {
      id: item.id || "",
      type: item.type || "",
      text: compactMemoryText(item.text || "", 900),
      why: compactMemoryText(item.why || "", 320),
      howToApply: compactMemoryText(item.howToApply || item.how_to_apply || "", 360),
      importance: Number(item.importance || 0),
      confidence: Number(item.confidence || 0),
      score: Math.round(Number(item.score || 0) * 10) / 10,
      matchedTerms: (Array.isArray(item.matchedTerms) ? item.matchedTerms : []).slice(0, 12),
      updatedAt: item.updatedAt || item.createdAt || "",
      source: {
        sessionId: source.sessionId || "",
        messageIds: (Array.isArray(source.messageIds) ? source.messageIds : []).slice(0, 8),
        missionId: source.missionId || "",
        traceId: source.traceId || "",
        source: source.source || "",
        timestamp: source.timestamp || "",
      },
      arbitration,
      crossGroupSuppression,
    };
  });
  const demotedItems = items.filter((item: any) => item.arbitration?.demoted === true);
  const conflictItems = items.filter((item: any) => item.arbitration?.conflict === true);
  const crossGroupSuppressedItems = items.filter((item: any) => item.crossGroupSuppression?.suppressed === true);
  const crossGroupSuppressionSummary = summarizeCrossGroupGlobalMemorySuppression(items, crossGroupSuppressionIndex);
  return {
    schema: "ccm-child-global-agent-memory-recall-v1",
    version: 1,
    included: items.length > 0,
    ignored: false,
    reason: conflictItems.length ? "global_memory_conflicts_with_newer_group_evidence"
      : crossGroupSuppressedItems.length ? "global_memory_suppressed_by_cross_group_arbitration"
        : demotedItems.length ? "global_memory_demoted_by_newer_group_evidence"
        : items.length ? "relevant_global_agent_memory" : "no_relevant_global_agent_memory",
    file: GLOBAL_AGENT_MEMORY_FILE,
    memory_health_gate: memoryHealthGate,
    sessionSummary: recall?.sessionSummary || null,
    boundary: recall?.boundary || null,
    arbitration: {
      schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
      status: conflictItems.length ? "conflict" : demotedItems.length ? "demoted" : items.length ? "ok" : "empty",
      localEvidenceCount: localEvidence.length,
      demotedCount: demotedItems.length,
      conflictCount: conflictItems.length,
      crossGroupSuppressedCount: crossGroupSuppressedItems.length,
      crossGroupScannedLedgerCount: crossGroupSuppressionSummary.scannedLedgerCount,
      activeCount: items.length - demotedItems.length,
      authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
    },
    crossGroupSuppression: crossGroupSuppressionSummary,
    items,
    citations: Array.isArray(recall?.citations) ? recall.citations.slice(0, 12) : [],
    itemCount: items.length,
  };
}


export function globalMemorySuppressionKey(value: any = {}) {
  const id = String(value.globalMemoryId || value.global_memory_id || value.id || value.memoryId || value.memory_id || "").trim();
  if (id) return id;
  const text = [value.globalText, value.text, value.why, value.howToApply || value.how_to_apply].filter(Boolean).join("\n");
  return text ? `text:${hashSessionMemoryText(text, 18)}` : "";
}


export function listGroupGlobalMemoryArbitrationLedgerFiles(limit = 80) {
  try {
    return fs.readdirSync(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
      .filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-"))
      .map(name => {
        const file = path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, name);
        try {
          const stat = fs.statSync(file);
          return stat.isFile() ? { file, mtimeMs: stat.mtimeMs } : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
      .slice(0, Math.max(1, limit))
      .map((item: any) => item.file);
  } catch {
    return [];
  }
}


export function buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId: string, options: any = {}) {
  if (options.includeCrossGroupGlobalMemorySuppression === false || options.include_cross_group_global_memory_suppression === false) {
    return {
      schema: "ccm-cross-group-global-memory-suppression-index-v1",
      enabled: false,
      currentGroupId,
      sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
      scannedLedgerCount: 0,
      itemCount: 0,
      items: [],
      byMemoryId: new Map<string, any>(),
    };
  }
  const current = String(currentGroupId || "").trim();
  const maxLedgers = Math.max(10, Number(options.maxCrossGroupGlobalMemoryLedgers || options.max_cross_group_global_memory_ledgers || 80));
  const rows = new Map<string, any>();
  let scannedLedgerCount = 0;
  for (const file of listGroupGlobalMemoryArbitrationLedgerFiles(maxLedgers)) {
    let ledger: any = null;
    try {
      ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      continue;
    }
    const ledgerGroupId = String(ledger?.groupId || path.basename(file, ".json") || "").trim();
    if (current && ledgerGroupId === current) continue;
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    if (!entries.length) continue;
    scannedLedgerCount += 1;
    for (const entry of entries) {
      const key = globalMemorySuppressionKey(entry);
      if (!key) continue;
      const statusText = String(entry.status || "");
      const conflict = entry.conflict === true || /conflict/i.test(statusText);
      const demoted = entry.demoted === true || conflict || /demoted|suppress/i.test(statusText);
      if (!conflict && !demoted) continue;
      const occurrenceCount = Math.max(1, Number(entry.occurrenceCount || 1));
      const row = rows.get(key) || {
        schema: "ccm-cross-group-global-memory-suppression-row-v1",
        globalMemoryId: key,
        groupIds: new Set<string>(),
        conflictGroupIds: new Set<string>(),
        demotedGroupIds: new Set<string>(),
        sourceLedgers: new Map<string, any>(),
        typedMemoryDocs: new Map<string, any>(),
        targetProjects: new Set<string>(),
        totalOccurrenceCount: 0,
        conflictCount: 0,
        demotedCount: 0,
        latestEvidence: [],
      };
      row.groupIds.add(ledgerGroupId);
      if (entry.targetProject) row.targetProjects.add(String(entry.targetProject));
      row.totalOccurrenceCount += occurrenceCount;
      if (conflict) {
        row.conflictGroupIds.add(ledgerGroupId);
        row.conflictCount += occurrenceCount;
      }
      if (demoted) {
        row.demotedGroupIds.add(ledgerGroupId);
        row.demotedCount += occurrenceCount;
      }
      row.sourceLedgers.set(file, { file, groupId: ledgerGroupId });
      if (entry.typedMemoryDoc) row.typedMemoryDocs.set(String(entry.typedMemoryDoc), {
        file: entry.typedMemoryDoc,
        slug: entry.typedMemorySlug || "",
        type: entry.typedMemoryType || "",
      });
      row.latestEvidence.push({
        groupId: ledgerGroupId,
        ledgerFile: file,
        status: entry.status || "",
        conflict,
        demoted,
        occurrenceCount,
        targetProject: entry.targetProject || "",
        lastSeenAt: entry.lastSeenAt || entry.at || "",
        localRuleText: compactMemoryText(entry.localRuleText || "", 260),
        globalText: compactMemoryText(entry.globalText || "", 260),
        typedMemoryDoc: entry.typedMemoryDoc || "",
      });
      rows.set(key, row);
    }
  }
  const items = [...rows.values()].map((row: any) => {
    const latestEvidence = row.latestEvidence
      .slice()
      .sort((a: any, b: any) => Date.parse(b.lastSeenAt || "") - Date.parse(a.lastSeenAt || ""))
      .slice(0, 6);
    return {
      schema: row.schema,
      globalMemoryId: row.globalMemoryId,
      groupCount: row.groupIds.size,
      groupIds: [...row.groupIds].slice(0, 12),
      conflictGroupCount: row.conflictGroupIds.size,
      conflictGroupIds: [...row.conflictGroupIds].slice(0, 12),
      demotedGroupCount: row.demotedGroupIds.size,
      demotedGroupIds: [...row.demotedGroupIds].slice(0, 12),
      totalOccurrenceCount: row.totalOccurrenceCount,
      conflictCount: row.conflictCount,
      demotedCount: row.demotedCount,
      targetProjects: [...row.targetProjects].slice(0, 12),
      sourceLedgers: [...row.sourceLedgers.values()].slice(0, 12),
      typedMemoryDocs: [...row.typedMemoryDocs.values()].slice(0, 12),
      latestEvidence,
      latestSeenAt: latestEvidence[0]?.lastSeenAt || "",
    };
  });
  return {
    schema: "ccm-cross-group-global-memory-suppression-index-v1",
    enabled: true,
    currentGroupId: current,
    sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
    scannedLedgerCount,
    itemCount: items.length,
    items,
    byMemoryId: new Map(items.map((item: any) => [item.globalMemoryId, item])),
  };
}


export function buildCrossGroupGlobalMemorySuppressionForItem(item: any, index: any = {}, options: any = {}) {
  const key = globalMemorySuppressionKey(item);
  const row = key && index?.byMemoryId instanceof Map ? index.byMemoryId.get(key) : null;
  const conflictGroupThreshold = Math.max(1, Number(options.crossGroupGlobalMemoryConflictGroupThreshold || options.cross_group_global_memory_conflict_group_threshold || 1));
  const occurrenceThreshold = Math.max(2, Number(options.crossGroupGlobalMemoryOccurrenceThreshold || options.cross_group_global_memory_occurrence_threshold || 2));
  const rawSuppressed = !!row && (
    Number(row.conflictGroupCount || 0) >= conflictGroupThreshold
    || Number(row.totalOccurrenceCount || 0) >= occurrenceThreshold
  );
  const globalUpdatedAt = String(item.updatedAt || item.updated_at || item.source?.timestamp || item.createdAt || item.created_at || "");
  const globalUpdatedAtMs = Date.parse(globalUpdatedAt || "");
  const latestEvidenceAt = String(row?.latestSeenAt || "");
  const latestEvidenceAtMs = Date.parse(latestEvidenceAt || "");
  const newerGlobalGraceMs = Math.max(0, Number(options.crossGroupGlobalMemoryNewerGraceMs || options.cross_group_global_memory_newer_grace_ms || 1000));
  const maxEvidenceAgeDays = Number(options.crossGroupGlobalMemoryMaxEvidenceAgeDays || options.cross_group_global_memory_max_evidence_age_days || 90);
  const maxEvidenceAgeMs = Number.isFinite(maxEvidenceAgeDays) && maxEvidenceAgeDays > 0 ? maxEvidenceAgeDays * 24 * 60 * 60 * 1000 : 0;
  const nowMs = Date.now();
  const globalNewerByMs = Number.isFinite(globalUpdatedAtMs) && Number.isFinite(latestEvidenceAtMs)
    ? globalUpdatedAtMs - latestEvidenceAtMs
    : 0;
  const supersededByNewerGlobalMemory = rawSuppressed && globalNewerByMs > newerGlobalGraceMs;
  const evidenceAgeMs = Number.isFinite(latestEvidenceAtMs) ? Math.max(0, nowMs - latestEvidenceAtMs) : 0;
  const decayedToAdvisory = rawSuppressed
    && !supersededByNewerGlobalMemory
    && maxEvidenceAgeMs > 0
    && Number.isFinite(latestEvidenceAtMs)
    && evidenceAgeMs > maxEvidenceAgeMs;
  const suppressed = rawSuppressed && !supersededByNewerGlobalMemory && !decayedToAdvisory;
  const advisory = !!row && !suppressed && (rawSuppressed || supersededByNewerGlobalMemory || decayedToAdvisory);
  const reason = suppressed
    ? "global_memory_conflicted_or_demoted_in_other_groups"
    : supersededByNewerGlobalMemory
      ? "cross_group_evidence_superseded_by_newer_global_memory"
      : decayedToAdvisory
        ? "cross_group_evidence_decayed_to_advisory"
        : row ? "cross_group_evidence_below_threshold" : "no_cross_group_arbitration_evidence";
  return {
    schema: "ccm-cross-group-global-memory-suppression-v1",
    globalMemoryId: key,
    suppressed,
    rawSuppressed,
    advisory,
    reason,
    action: suppressed
      ? "treat_as_background_only_verify_current_group_before_use"
      : supersededByNewerGlobalMemory
        ? "use_newer_global_memory_as_context_after_current_source_verification"
        : decayedToAdvisory
          ? "treat_cross_group_evidence_as_advisory_only"
          : "no_cross_group_demotion",
    sourceDir: index?.sourceDir || GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
    scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
    groupCount: Number(row?.groupCount || 0),
    conflictGroupCount: Number(row?.conflictGroupCount || 0),
    demotedGroupCount: Number(row?.demotedGroupCount || 0),
    totalOccurrenceCount: Number(row?.totalOccurrenceCount || 0),
    conflictCount: Number(row?.conflictCount || 0),
    demotedCount: Number(row?.demotedCount || 0),
    sourceLedgers: Array.isArray(row?.sourceLedgers) ? row.sourceLedgers.slice(0, 6) : [],
    typedMemoryDocs: Array.isArray(row?.typedMemoryDocs) ? row.typedMemoryDocs.slice(0, 6) : [],
    latestEvidence: Array.isArray(row?.latestEvidence) ? row.latestEvidence.slice(0, 3) : [],
    freshness: {
      schema: "ccm-cross-group-global-memory-suppression-freshness-v1",
      globalUpdatedAt,
      latestEvidenceAt,
      globalNewerByMs,
      evidenceAgeMs,
      maxEvidenceAgeMs,
      newerGlobalGraceMs,
      supersededByNewerGlobalMemory,
      decayedToAdvisory,
    },
    thresholds: {
      conflictGroupThreshold,
      occurrenceThreshold,
    },
  };
}


export function applyCrossGroupGlobalMemorySuppression(arbitration: any = {}, suppression: any = {}) {
  if (suppression?.suppressed !== true) {
    return {
      ...arbitration,
      crossGroupSuppressed: false,
      crossGroupSuppression: suppression,
    };
  }
  const active = arbitration.status === "active_global_context";
  const crossEvidence = (Array.isArray(suppression.latestEvidence) ? suppression.latestEvidence : []).slice(0, 2).map((evidence: any) => ({
    source: "cross_group.global_memory_arbitration_ledger",
    type: "cross_group_global_memory_suppression",
    text: compactMemoryText([
      `group=${evidence.groupId || ""}`,
      `status=${evidence.status || ""}`,
      evidence.localRuleText ? `rule=${evidence.localRuleText}` : "",
      evidence.typedMemoryDoc ? `typed=${evidence.typedMemoryDoc}` : "",
    ].filter(Boolean).join("; "), 360),
    updatedAt: evidence.lastSeenAt || "",
    messageId: "",
    matchedTerms: [],
    newer: true,
    conflict: evidence.conflict === true,
  }));
  return {
    ...arbitration,
    status: active ? "suppressed_by_cross_group_arbitration" : arbitration.status,
    authority: active ? "cross_group_arbitration_ledger" : arbitration.authority,
    action: active ? "do_not_apply_directly_treat_as_background_verify_current_group_and_sources" : arbitration.action,
    demoted: arbitration.demoted === true || active,
    conflict: arbitration.conflict === true,
    crossGroupSuppressed: true,
    crossGroupConflictCount: Number(suppression.conflictCount || 0),
    crossGroupSuppression: suppression,
    decisiveEvidence: [
      ...(Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []),
      ...crossEvidence,
    ].slice(0, 6),
  };
}


export function summarizeCrossGroupGlobalMemorySuppression(items: any[] = [], index: any = {}) {
  const suppressedItems = items.filter((item: any) => item.crossGroupSuppression?.suppressed === true);
  const advisoryItems = items.filter((item: any) => item.crossGroupSuppression?.advisory === true);
  const supersededItems = items.filter((item: any) => item.crossGroupSuppression?.freshness?.supersededByNewerGlobalMemory === true);
  const decayedItems = items.filter((item: any) => item.crossGroupSuppression?.freshness?.decayedToAdvisory === true);
  return {
    schema: "ccm-cross-group-global-memory-suppression-summary-v1",
    sourceDir: index?.sourceDir || GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
    scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
    indexedMemoryCount: Number(index?.itemCount || 0),
    suppressedCount: suppressedItems.length,
    advisoryCount: advisoryItems.length,
    supersededCount: supersededItems.length,
    decayedCount: decayedItems.length,
    conflictCount: suppressedItems.reduce((sum: number, item: any) => sum + Number(item.crossGroupSuppression?.conflictCount || 0), 0),
    demotedCount: suppressedItems.reduce((sum: number, item: any) => sum + Number(item.crossGroupSuppression?.demotedCount || 0), 0),
    items: suppressedItems.slice(0, 8).map((item: any) => ({
      globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
      status: item.arbitration?.status || "",
      groupCount: item.crossGroupSuppression?.groupCount || 0,
      conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
      totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
      sourceLedgers: item.crossGroupSuppression?.sourceLedgers || [],
      typedMemoryDocs: item.crossGroupSuppression?.typedMemoryDocs || [],
    })),
    advisoryItems: advisoryItems.slice(0, 8).map((item: any) => ({
      globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
      reason: item.crossGroupSuppression?.reason || "",
      action: item.crossGroupSuppression?.action || "",
      groupCount: item.crossGroupSuppression?.groupCount || 0,
      conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
      totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
      freshness: item.crossGroupSuppression?.freshness || {},
    })),
  };
}


export function readGroupGlobalMemoryArbitrationLedger(groupId: string) {
  const file = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  } catch {
    return {
      schema: "ccm-group-global-memory-arbitration-ledger-v1",
      version: GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
      groupId,
      file,
      entries: [],
      totals: { total: 0, demoted: 0, conflict: 0, repeatedConflict: 0 },
      updatedAt: "",
    };
  }
}


export function globalMemoryArbitrationSignature(groupId: string, targetProject: string, item: any = {}, arbitration: any = {}) {
  const decisive = Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : [];
  const groupEvidence = decisive.filter((evidence: any) => String(evidence.source || "").startsWith("group."));
  const groupMessageIds = [...new Set(groupEvidence.map((evidence: any) => String(evidence.messageId || "").trim()).filter(Boolean))].sort();
  const signatureEvidence = groupMessageIds.length
    ? [["messageIds", groupMessageIds.join(",")]]
    : (groupEvidence.length ? groupEvidence : decisive.slice(0, 1))
      .map((evidence: any) => [
        "",
        compactMemoryText(evidence.text || "", 120),
      ]);
  return crypto.createHash("sha256").update(JSON.stringify([
    groupId,
    targetProject,
    item.id || "",
    arbitration.status || "",
    signatureEvidence,
  ])).digest("hex").slice(0, 18);
}


export function summarizeGroupGlobalMemoryArbitrationLedger(groupId: string, ledger: any, recordedRows: any[] = []) {
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const conflicts = entries.filter((entry: any) => entry.conflict === true);
  const demoted = entries.filter((entry: any) => entry.demoted === true);
  const semanticRiskEntries = entries.filter((entry: any) => Number(entry.semanticRiskScore || 0) > 0);
  const repeatedConflicts = conflicts.filter((entry: any) => Number(entry.occurrenceCount || 0) > 1);
  const distilledConflicts = repeatedConflicts.filter((entry: any) => entry.distilledAt || entry.typedMemoryDoc);
  const pendingDistillation = repeatedConflicts.filter((entry: any) => !entry.distilledAt && !entry.typedMemoryDoc);
  return {
    schema: "ccm-group-global-memory-arbitration-ledger-summary-v1",
    groupId,
    file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId),
    entryCount: entries.length,
    recordedCount: recordedRows.length,
    demotedCount: demoted.length,
    conflictCount: conflicts.length,
    semanticRiskCount: semanticRiskEntries.length,
    semanticConflictCount: semanticRiskEntries.filter((entry: any) => Number(entry.semanticRiskScore || 0) >= 60).length,
    maxSemanticRiskScore: semanticRiskEntries.reduce((max: number, entry: any) => Math.max(max, Number(entry.semanticRiskScore || 0)), 0),
    repeatedConflictCount: repeatedConflicts.length,
    distilledConflictCount: distilledConflicts.length,
    pendingDistillationCount: pendingDistillation.length,
    typedMemoryDocs: uniqueByKey(distilledConflicts.map((entry: any) => ({
      file: entry.typedMemoryDoc || "",
      slug: entry.typedMemorySlug || "",
      type: entry.typedMemoryType || "",
    })).filter((item: any) => item.file), (item: any) => item.file, 12),
    updatedAt: ledger.updatedAt || "",
    latestEntries: entries
      .slice()
      .sort((a: any, b: any) => Date.parse(b.lastSeenAt || b.at || "") - Date.parse(a.lastSeenAt || a.at || ""))
      .slice(0, 8)
      .map((entry: any) => ({
        entry_id: entry.entry_id,
        status: entry.status,
        globalMemoryId: entry.globalMemoryId,
        targetProject: entry.targetProject,
      semanticRiskScore: Number(entry.semanticRiskScore || 0),
      semanticRiskLevel: entry.semanticRiskLevel || "",
      semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
      occurrenceCount: entry.occurrenceCount || 1,
      lastSeenAt: entry.lastSeenAt || entry.at || "",
      distilledAt: entry.distilledAt || "",
      typedMemoryDoc: entry.typedMemoryDoc || "",
      localEvidence: (entry.decisiveEvidence || []).slice(0, 2).map((evidence: any) => ({
          source: evidence.source || "",
          messageId: evidence.messageId || "",
          text: compactMemoryText(evidence.text || "", 180),
          semanticRiskScore: Number(evidence.semanticRiskScore || 0),
          semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : []).slice(0, 4),
        })),
      })),
    distillationCandidates: repeatedConflicts.slice(0, 8).map((entry: any) => ({
      globalMemoryId: entry.globalMemoryId,
      targetProject: entry.targetProject,
      occurrenceCount: entry.occurrenceCount || 1,
      semanticRiskScore: Number(entry.semanticRiskScore || 0),
      semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
      suggestedMemoryType: entry.conflict ? "decision" : "fact",
      reason: "同一全局记忆多次被群聊新证据降权/冲突，可蒸馏为 typed MEMORY.md 规则。",
      candidateText: compactMemoryText(entry.localRuleText || entry.globalText || "", 320),
      distilled: !!(entry.distilledAt || entry.typedMemoryDoc),
      typedMemoryDoc: entry.typedMemoryDoc || "",
    })),
  };
}


export function recordGroupGlobalMemoryArbitrationLedger(groupId: string, input: any = {}) {
  const recall = input.globalAgentMemoryRecall || input.global_agent_memory_recall || {};
  const targetProject = String(input.targetProject || input.target_project || "");
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const task = compactMemoryText(input.task || input.query || "", 320);
  const rows = (Array.isArray(recall.items) ? recall.items : [])
    .filter((item: any) => item?.arbitration?.demoted === true || item?.arbitration?.conflict === true)
    .map((item: any) => {
      const arbitration = item.arbitration || {};
      const signature = globalMemoryArbitrationSignature(groupId, targetProject, item, arbitration);
      const decisiveEvidence = (Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []).slice(0, 6);
      const localRuleText = decisiveEvidence.map((evidence: any) => evidence.text).filter(Boolean).join("\n");
      return {
        schema: "ccm-group-global-memory-arbitration-ledger-entry-v1",
        entry_id: `gma:${signature}`,
        signature,
        at: generatedAt,
        groupId,
        targetProject,
        task,
        globalMemoryId: item.id || "",
        globalMemoryType: item.type || "",
        status: arbitration.status || "",
        authority: arbitration.authority || "",
        action: arbitration.action || "",
        demoted: arbitration.demoted === true,
        conflict: arbitration.conflict === true,
        matchedLocalEvidenceCount: Number(arbitration.matchedLocalEvidenceCount || 0),
        semanticRiskScore: Number(arbitration.semanticRiskScore || arbitration.semanticRisk?.score || 0),
        semanticRiskLevel: arbitration.semanticRisk?.level || "",
        semanticReasons: (Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons : arbitration.semanticRisk?.reasons || []).slice(0, 10),
        globalText: compactMemoryText(item.text || "", 700),
        globalHowToApply: compactMemoryText(item.howToApply || item.how_to_apply || "", 300),
        localRuleText: compactMemoryText(localRuleText, 700),
        crossGroupSuppression: item.crossGroupSuppression || arbitration.crossGroupSuppression || null,
        decisiveEvidence: decisiveEvidence.map((evidence: any) => ({
          source: evidence.source || "",
          type: evidence.type || "",
          text: compactMemoryText(evidence.text || "", 360),
          updatedAt: evidence.updatedAt || "",
          messageId: evidence.messageId || "",
          matchedTerms: (Array.isArray(evidence.matchedTerms) ? evidence.matchedTerms : []).slice(0, 8),
          newer: evidence.newer === true,
          conflict: evidence.conflict === true,
          semanticRiskScore: Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0),
          semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : evidence.semanticRisk?.reasons || []).slice(0, 8),
          semanticRisk: evidence.semanticRisk || null,
        })),
        source: item.source || {},
        distillationCandidate: {
          shouldDistill: true,
          suggestedMemoryType: arbitration.conflict ? "decision" : "fact",
          reason: arbitration.conflict
            ? "全局记忆和群聊新证据冲突；应把最新群聊规则蒸馏成 typed memory。"
            : "全局记忆被更新群聊证据降权；应把更新后的本地事实蒸馏成 typed memory。",
        },
      };
    });
  const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
  if (!rows.length) return summarizeGroupGlobalMemoryArbitrationLedger(groupId, ledger, []);
  const bySignature = new Map<string, any>((ledger.entries || []).map((entry: any) => [String(entry.signature || entry.entry_id || ""), entry]));
  const evidenceMessageIds = (entry: any = {}) => new Set((Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [])
    .map((evidence: any) => String(evidence.messageId || "").trim())
    .filter(Boolean));
  for (const row of rows) {
    const rowMessageIds = evidenceMessageIds(row);
    const previous = bySignature.get(row.signature) || [...bySignature.values()].find((entry: any) => {
      if (entry.globalMemoryId !== row.globalMemoryId || entry.targetProject !== row.targetProject || entry.status !== row.status) return false;
      const previousMessageIds = evidenceMessageIds(entry);
      return [...rowMessageIds].some(messageId => previousMessageIds.has(messageId));
    });
    const signature = previous?.signature || row.signature;
    bySignature.set(signature, previous ? {
      ...previous,
      ...row,
      entry_id: previous.entry_id || row.entry_id,
      signature,
      firstSeenAt: previous.firstSeenAt || previous.at || row.at,
      lastSeenAt: generatedAt,
      occurrenceCount: Number(previous.occurrenceCount || 1) + 1,
    } : {
      ...row,
      firstSeenAt: generatedAt,
      lastSeenAt: generatedAt,
      occurrenceCount: 1,
    });
  }
  const entries = [...bySignature.values()]
    .sort((a: any, b: any) => Date.parse(a.lastSeenAt || a.at || "") - Date.parse(b.lastSeenAt || b.at || ""))
    .slice(-240);
  const totals = {
    total: entries.length,
    demoted: entries.filter((entry: any) => entry.demoted === true).length,
    conflict: entries.filter((entry: any) => entry.conflict === true).length,
    repeatedConflict: entries.filter((entry: any) => entry.conflict === true && Number(entry.occurrenceCount || 0) > 1).length,
  };
  const nextLedger = {
    schema: "ccm-group-global-memory-arbitration-ledger-v1",
    version: GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
    groupId,
    entries,
    totals,
    updatedAt: generatedAt,
  };
  writeJsonAtomic(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
  return summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, rows);
}


export function renderGlobalMemoryArbitrationTypedMemoryBody(entries: any[] = [], options: any = {}) {
  const lines = [
    "# Global/Group Memory Arbitration Decisions",
    "",
    "This document is generated from repeated Global Agent memory arbitration conflicts.",
    "When these rows apply, current group memory and typed MEMORY.md override stale Global Agent memory. Treat the global item as background only and verify current source before acting.",
    "",
    `Generated at: ${options.updatedAt || new Date().toISOString()}`,
    "",
  ];
  for (const entry of entries.slice(0, 24)) {
    lines.push(`## ${entry.globalMemoryId || "global-memory"} -> ${entry.targetProject || "project"}`);
    lines.push("");
    lines.push(`- status: ${entry.status || ""}`);
    lines.push(`- occurrence_count: ${entry.occurrenceCount || 1}`);
    if (Number(entry.semanticRiskScore || 0) > 0) {
      lines.push(`- semantic_risk: ${entry.semanticRiskScore}; level=${entry.semanticRiskLevel || "unknown"}; reasons=${(entry.semanticReasons || []).join(",")}`);
    }
    lines.push(`- first_seen: ${entry.firstSeenAt || entry.at || ""}`);
    lines.push(`- last_seen: ${entry.lastSeenAt || entry.at || ""}`);
    if (entry.task) lines.push(`- task: ${compactMemoryText(entry.task, 260)}`);
    if (entry.globalText) lines.push(`- stale_global_memory: ${compactMemoryText(entry.globalText, 520)}`);
    if (entry.localRuleText) lines.push(`- current_group_rule: ${compactMemoryText(entry.localRuleText, 700)}`);
    const evidence = Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [];
    if (evidence.length) {
      lines.push("- decisive_evidence:");
      for (const item of evidence.slice(0, 4)) {
        const semantic = Number(item.semanticRiskScore || item.semanticRisk?.score || 0) > 0
          ? ` semantic_risk=${item.semanticRiskScore || item.semanticRisk?.score}; reasons=${(item.semanticReasons || item.semanticRisk?.reasons || []).slice(0, 4).join(",")};`
          : "";
        lines.push(`  - ${item.source || "group"}${item.messageId ? `#${item.messageId}` : ""}:${semantic} ${compactMemoryText(item.text || "", 420)}`);
      }
    }
    lines.push("- application_rule: do_not_apply_the_stale_global_memory_directly; use_current_group_rule_after_current-source verification.");
    lines.push("");
  }
  return lines.join("\n").trim();
}


export function distillGroupGlobalMemoryArbitrationToTypedMemory(groupId: string, input: any = {}) {
  const threshold = Math.max(2, Number(input.threshold || input.minOccurrences || input.min_occurrences || 2));
  const updatedAt = String(input.updatedAt || input.updated_at || input.generatedAt || input.generated_at || new Date().toISOString());
  const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const candidates = entries.filter((entry: any) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold);
  if (!candidates.length) {
    return {
      schema: "ccm-group-global-memory-arbitration-distillation-v1",
      groupId,
      skipped: true,
      reason: "no_repeated_conflicts",
      threshold,
      candidateCount: 0,
      writeCount: 0,
      ledgerFile: ledger.file,
    };
  }
  const body = renderGlobalMemoryArbitrationTypedMemoryBody(candidates, { updatedAt });
  const paths = deriveGroupTypedMemoryTargetPaths(body, candidates.flatMap((entry: any) => [
    entry.targetProject,
    ...(Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence.flatMap((evidence: any) => evidence.matchedTerms || []) : []),
  ]));
  const write = upsertGroupTypedMemoryDocument(groupId, {
    type: "project",
    slug: "global-memory-arbitration-decisions",
    name: "Global memory arbitration decisions",
    description: "Repeated conflicts where current group evidence overrides stale Global Agent memory.",
    source: "auto:global-memory-arbitration-ledger",
    updatedAt,
    paths,
    body,
    maxBodyChars: Number(input.maxBodyChars || input.max_body_chars || 24_000),
  });
  const nextEntries = entries.map((entry: any) => {
    const match = candidates.some((candidate: any) => candidate.entry_id === entry.entry_id || candidate.signature === entry.signature);
    if (!match) return entry;
    return {
      ...entry,
      distilledAt: entry.distilledAt || updatedAt,
      distillationStatus: "typed_memory_written",
      typedMemoryDoc: write.file,
      typedMemorySlug: write.slug,
      typedMemoryType: write.type,
      typedMemoryChanged: write.changed === true,
    };
  });
  const nextLedger = {
    schema: "ccm-group-global-memory-arbitration-ledger-v1",
    version: GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
    groupId,
    entries: nextEntries,
    totals: {
      total: nextEntries.length,
      demoted: nextEntries.filter((entry: any) => entry.demoted === true).length,
      conflict: nextEntries.filter((entry: any) => entry.conflict === true).length,
      repeatedConflict: nextEntries.filter((entry: any) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold).length,
      distilled: nextEntries.filter((entry: any) => entry.distilledAt || entry.typedMemoryDoc).length,
    },
    distillation: {
      schema: "ccm-group-global-memory-arbitration-distillation-state-v1",
      threshold,
      lastDistilledAt: updatedAt,
      candidateCount: candidates.length,
      typedMemoryDoc: write.file,
      typedMemorySlug: write.slug,
      changed: write.changed === true,
    },
    updatedAt,
  };
  writeJsonAtomic(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
  const index = buildGroupTypedMemoryIndex(groupId);
  const summary = summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, []);
  return {
    schema: "ccm-group-global-memory-arbitration-distillation-v1",
    groupId,
    skipped: false,
    reason: "repeated_global_group_conflict",
    threshold,
    candidateCount: candidates.length,
    writeCount: write.changed ? 1 : 0,
    write,
    index,
    ledgerFile: ledger.file,
    summary,
    distilledAt: updatedAt,
  };
}


export function memoryArbitrationTokens(value: any) {
  const text = String(value || "").toLowerCase().replace(/\\/g, "/");
  const englishStopWords = new Set([
    "the", "and", "for", "with", "global", "agent", "memory", "context",
    "current", "goal", "goals", "requirement", "requirements", "constraint", "constraints", "acceptance",
  ]);
  const chineseStopWords = new Set(["当前", "记忆", "目标", "需求", "约束", "验收", "任务", "群聊", "全局", "验证", "用户", "阶段"]);
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./:-]{3,}/g)) {
    const token = match[0];
    if (englishStopWords.has(token)) continue;
    tokens.add(token);
  }
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) {
    const token = chinese.slice(index, index + 2);
    if (chineseStopWords.has(token)) continue;
    tokens.add(token);
  }
  return [...tokens].slice(0, 120);
}


export function memoryArbitrationTimestamp(value: any, messagesById: Map<string, any> = new Map()) {
  const direct = value?.updatedAt || value?.updated_at || value?.timestamp || value?.time || value?.createdAt || value?.created_at || "";
  if (direct && Number.isFinite(Date.parse(String(direct)))) return String(direct);
  const messageId = value?.messageId || value?.message_id || value?.sourceMessageId || value?.source_message_id || value?.source?.messageId || value?.source?.message_id;
  const message = messageId ? messagesById.get(String(messageId)) : null;
  return message?.timestamp || message?.time || "";
}


export function memoryArbitrationTextForItem(type: string, item: any) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return [
    item.text,
    item.decision,
    item.summary,
    item.reason,
    item.action,
    item.question,
    item.value,
    item.description,
    item.body,
  ].filter(Boolean).join("\n");
}


export function collectChildGlobalMemoryLocalEvidence(options: any = {}) {
  const memory = options.groupMemory || options.group_memory || {};
  const messages = Array.isArray(options.groupMessages || options.group_messages) ? (options.groupMessages || options.group_messages) : [];
  const messagesById = new Map<string, any>(messages.map((message: any) => [String(message.id || message.uuid || ""), message]));
  const rows: any[] = [];
  const push = (source: string, item: any, type = source) => {
    const text = memoryArbitrationTextForItem(type, item);
    if (!String(text || "").trim()) return;
    rows.push({
      source,
      type,
      text: compactMemoryText(text, 900),
      updatedAt: memoryArbitrationTimestamp(item, messagesById) || memory.updated_at || "",
      messageId: item?.messageId || item?.message_id || item?.sourceMessageId || item?.source_message_id || item?.source?.messageId || "",
      authority: source.startsWith("typed") ? "typed_memory" : "group_memory",
    });
  };
  for (const key of ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "nextActions", "openQuestions"]) {
    for (const item of Array.isArray(memory[key]) ? memory[key] : []) push(`group.${key}`, item, key);
  }
  const recall = options.typedMemoryRecall || options.typed_memory_recall || {};
  for (const doc of Array.isArray(recall.recalled) ? recall.recalled : []) {
    const text = [doc.name, doc.description, doc.snippet, doc.body].filter(Boolean).join("\n");
    push("typed.recall", {
      text,
      updatedAt: doc.updatedAt || doc.updated_at || (Number(doc.mtimeMs || 0) ? new Date(Number(doc.mtimeMs)).toISOString() : ""),
      messageId: doc.sourceMessageId || "",
    }, doc.type || "typed_memory");
  }
  return rows.slice(-120);
}


export function uniqueMemoryArbitrationValues(values: any[] = [], limit = 24) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}


export function memoryArbitrationEntities(value: any) {
  const text = String(value || "");
  const normalized = text.toLowerCase().replace(/\\/g, "/");
  const paths = uniqueMemoryArbitrationValues([...normalized.matchAll(/(?:^|[\s"'`([{])([a-z0-9_./@-]+\.(?:tsx?|jsx?|mjs|cjs|md|json|ya?ml|toml|css|scss|html|py|go|rs|java|kt|cs|php|rb|sh|sql))/gi)].map(match => match[1]));
  const sentinels = uniqueMemoryArbitrationValues([...text.matchAll(/\b[A-Z][A-Z0-9_]{5,}_SENTINEL\b/g)].map(match => match[0].toLowerCase()));
  const ruleTerms = uniqueMemoryArbitrationValues([...normalized.matchAll(/\b[a-z0-9][a-z0-9._-]*(?:rule|policy|mode|strategy|pipeline|provider|adapter|implementation|impl|flow|version)[a-z0-9._-]*\b/g)].map(match => match[0])
    .filter(term => !paths.includes(term) && !sentinels.includes(term) && !/^(user|system|assistant|agent|task|project|memory)[_-]/.test(term)));
  return {
    paths,
    sentinels,
    ruleTerms,
    anchors: uniqueMemoryArbitrationValues([...paths, ...sentinels]),
  };
}


export function memoryArbitrationSignals(value: any) {
  const text = String(value || "");
  return {
    positive: /(必须|务必|需要|应该|保留|继承|使用|优先|启用|must|required|should|use|keep|prefer|enable)/i.test(text),
    negative: /(不要|不再|禁止|取消|废弃|作废|忽略|不能|不可|无需|不需要|停止|revert|rollback|deprecated|do not|never|stop|cancel|disable)/i.test(text),
    replacement: /(改为|替换为|切换到|迁移到|以.+为准|现在使用|当前使用|最新使用|instead|use .+ instead|replace|switch(?:ed)? to|migrate(?:d)? to|supersede(?:d)?)/i.test(text),
    current: /(当前|现在|最新|新规则|新实现|current|latest|new rule|new implementation|source of truth)/i.test(text),
    legacy: /(旧|历史|过时|陈旧|legacy|stale|old|obsolete|deprecated)/i.test(text),
  };
}


export function scoreMemorySemanticContradiction(globalText: string, localText: string, options: any = {}) {
  const globalEntities = memoryArbitrationEntities(globalText);
  const localEntities = memoryArbitrationEntities(localText);
  const globalSignals = memoryArbitrationSignals(globalText);
  const localSignals = memoryArbitrationSignals(localText);
  const matchedTerms = uniqueMemoryArbitrationValues(options.matchedTerms || []);
  const sharedPaths = intersectionValues(globalEntities.paths, localEntities.paths);
  const sharedSentinels = intersectionValues(globalEntities.sentinels, localEntities.sentinels);
  const sharedAnchors = uniqueMemoryArbitrationValues([...sharedPaths, ...sharedSentinels, ...intersectionValues(globalEntities.anchors, localEntities.anchors)]);
  const sharedRuleTerms = intersectionValues(globalEntities.ruleTerms, localEntities.ruleTerms);
  const differingGlobalRules = globalEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
  const differingLocalRules = localEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
  const differentNamedRules = sharedAnchors.length > 0
    && differingGlobalRules.length > 0
    && differingLocalRules.length > 0;
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };
  if (sharedSentinels.length) add(25, "shared_sentinel_anchor");
  if (sharedPaths.length) add(25, "shared_file_anchor");
  if (!sharedPaths.length && !sharedSentinels.length && matchedTerms.length >= 3) add(12, "shared_task_terms");
  if (differentNamedRules) add(28, "different_named_rule");
  if (localSignals.replacement) add(24, "local_replacement_signal");
  if (localSignals.current && differentNamedRules) add(12, "current_local_rule_differs");
  if (globalSignals.positive && localSignals.negative) add(34, "local_negates_global_directive");
  if (globalSignals.positive && (localSignals.current || localSignals.replacement) && differentNamedRules) add(18, "positive_global_superseded_by_current_local_rule");
  if (globalSignals.legacy || localSignals.legacy) add(8, "legacy_or_stale_rule_signal");
  if (options.newer === true && score > 0) add(8, "newer_local_evidence");
  if (!sharedAnchors.length && matchedTerms.length < 2) score = Math.min(score, 35);
  const normalizedScore = Math.max(0, Math.min(100, score));
  return {
    schema: "ccm-child-global-agent-memory-semantic-arbitration-v1",
    score: normalizedScore,
    level: normalizedScore >= 80 ? "high" : normalizedScore >= 60 ? "medium" : normalizedScore >= 35 ? "low" : "none",
    conflict: normalizedScore >= 60 && (sharedAnchors.length > 0 || matchedTerms.length >= 3),
    reasons: uniqueMemoryArbitrationValues(reasons, 10),
    sharedAnchors: sharedAnchors.slice(0, 8),
    sharedPaths: sharedPaths.slice(0, 6),
    sharedSentinels: sharedSentinels.slice(0, 4),
    differingGlobalRules: differingGlobalRules.slice(0, 8),
    differingLocalRules: differingLocalRules.slice(0, 8),
    matchedTerms: matchedTerms.slice(0, 8),
  };
}


export function arbitrateChildGlobalAgentMemoryItem(item: any, localEvidence: any[] = []) {
  const globalText = [item.text, item.why, item.howToApply].filter(Boolean).join("\n");
  const globalTerms = new Set(memoryArbitrationTokens(globalText));
  const globalAt = item.updatedAt || item.source?.timestamp || "";
  const globalAtMs = Date.parse(globalAt || "");
  const matches = localEvidence.map((evidence: any) => {
    const evidenceTerms = memoryArbitrationTokens(evidence.text);
    const matchedTerms = evidenceTerms.filter(term => globalTerms.has(term));
    const strongMatch = matchedTerms.length >= 2
      || matchedTerms.some(term => /sentinel|[a-z0-9_-]+\.tsx?$|[a-z0-9_-]+\.jsx?$|[a-z0-9_-]+\.md$/.test(term));
    const evidenceAtMs = Date.parse(evidence.updatedAt || "");
    const newer = Number.isFinite(evidenceAtMs) && (!Number.isFinite(globalAtMs) || evidenceAtMs > globalAtMs + 1000);
    const semanticRisk = scoreMemorySemanticContradiction(globalText, evidence.text, { matchedTerms, newer });
    const conflict = strongMatch && semanticRisk.conflict === true;
    return {
      ...evidence,
      matchedTerms,
      strongMatch,
      newer,
      conflict,
      semanticRisk,
    };
  }).filter((evidence: any) => evidence.strongMatch && (evidence.newer || evidence.conflict));
  const conflicts = matches.filter((evidence: any) => evidence.conflict);
  const newerMatches = matches.filter((evidence: any) => evidence.newer);
  const decisive = (conflicts.length ? conflicts : newerMatches)
    .sort((a: any, b: any) => {
      const authorityRank = (value: any) => String(value.source || "").startsWith("group.") ? 0 : 1;
      const rank = authorityRank(a) - authorityRank(b);
      if (rank) return rank;
      return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
    })
    .slice(0, 3);
  const status = conflicts.length
    ? "possible_conflict_with_newer_group_memory"
    : newerMatches.length
      ? "demoted_by_newer_group_evidence"
      : "active_global_context";
  const semanticRiskScores = matches.map((evidence: any) => Number(evidence.semanticRisk?.score || 0)).filter(score => score > 0);
  const semanticRiskScore = semanticRiskScores.length ? Math.max(...semanticRiskScores) : 0;
  const semanticReasons = uniqueMemoryArbitrationValues(matches.flatMap((evidence: any) => evidence.semanticRisk?.reasons || []), 10);
  return {
    schema: "ccm-child-global-agent-memory-arbitration-v1",
    status,
    authority: status === "active_global_context" ? "global_agent_memory" : "group_memory",
    action: status === "active_global_context" ? "use_as_relevant_context_after_verification" : "do_not_apply_directly_treat_as_background",
    demoted: status !== "active_global_context",
    conflict: conflicts.length > 0,
    matchedLocalEvidenceCount: matches.length,
    semanticRisk: {
      schema: "ccm-child-global-agent-memory-semantic-risk-summary-v1",
      score: semanticRiskScore,
      level: semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore >= 35 ? "low" : "none",
      conflictCount: conflicts.filter((evidence: any) => evidence.semanticRisk?.conflict === true).length,
      reasons: semanticReasons,
    },
    semanticRiskScore,
    semanticReasons,
    decisiveEvidence: decisive.map((evidence: any) => ({
      source: evidence.source,
      type: evidence.type,
      text: compactMemoryText(evidence.text, 360),
      updatedAt: evidence.updatedAt || "",
      messageId: evidence.messageId || "",
      matchedTerms: evidence.matchedTerms.slice(0, 8),
      newer: evidence.newer,
      conflict: evidence.conflict,
      semanticRiskScore: Number(evidence.semanticRisk?.score || 0),
      semanticReasons: (Array.isArray(evidence.semanticRisk?.reasons) ? evidence.semanticRisk.reasons : []).slice(0, 8),
      semanticRisk: evidence.semanticRisk,
    })),
  };
}
