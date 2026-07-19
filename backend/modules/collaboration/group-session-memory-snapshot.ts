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

import { buildGroupPostCompactDynamicContextCatalog } from "./group-memory-context";
import { GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS, GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS, GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES, GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT, GROUP_SESSION_MEMORY_SNAPSHOT_VERSION, GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES, compactPreserveLines, extractGroupFactAnchors, extractPersistentRequirementsFromAnchors, getGroupMessagesFileHint, getMemoryMessageContent, getMemoryMessageIdentity, groupSessionMemoryLastAssistantTurnHasToolCalls, hashSessionMemoryText, inspectGroupSessionMemoryToolCallsSince, mergeFactAnchorList, renderGroupSessionMemoryMarkdown, resolveGroupSessionMemoryExtractionCursor, writeJsonAtomic, writeTextAtomic } from "./group-memory-shared";
import { getGroupSessionMemoryDir, getGroupSessionMemoryMarkdownFile, saveGroupMemory } from "./group-memory-storage";

export function getGroupSessionMemorySnapshotFile(groupId: string) {
  return path.join(getGroupSessionMemoryDir(groupId), "snapshot.json");
}


export function groupSessionMemorySectionTokenLimit(header: string) {
  const normalized = String(header || "").replace(/^#+\s*/, "").trim().toLowerCase();
  if (normalized === "ccm group session memory") return 600;
  if (normalized === "goal") return 900;
  if (normalized === "session summary") return GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS;
  if (normalized === "persistent requirements") return 1_600;
  if (normalized === "fact anchors") return 1_400;
  if (normalized === "decisions" || normalized === "worker state") return 1_200;
  if (normalized === "open questions") return 800;
  if (normalized === "next actions") return 1_000;
  if (normalized === "use policy") return 700;
  return Math.min(800, GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS);
}


export function splitGroupSessionMemorySections(markdown: string) {
  const sections: Array<{ header: string; lines: string[] }> = [];
  let current = { header: "", lines: [] as string[] };
  for (const line of String(markdown || "").split("\n")) {
    if (/^#{1,2}\s+/.test(line)) {
      if (current.header || current.lines.some(item => item.trim())) sections.push(current);
      current = { header: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.header || current.lines.some(item => item.trim())) sections.push(current);
  return sections;
}


export function truncateGroupSessionMemorySection(section: { header: string; lines: string[] }, maxTokens: number) {
  const marker = "[... section truncated for session memory budget; raw transcript remains authoritative ...]";
  const original = [section.header, ...section.lines].filter((line, index) => index > 0 || !!line).join("\n").trim();
  const tokensBefore = estimateGroupTextTokens(original);
  if (tokensBefore <= maxTokens) {
    return { text: original, truncated: false, tokensBefore, tokensAfter: tokensBefore };
  }
  const kept = section.header ? [section.header] : [];
  for (const line of section.lines) {
    const candidate = [...kept, line, marker].join("\n").trim();
    if (estimateGroupTextTokens(candidate) <= maxTokens) {
      kept.push(line);
      continue;
    }
    let low = 0;
    let high = line.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const partial = [...kept, line.slice(0, middle), marker].join("\n").trim();
      if (estimateGroupTextTokens(partial) <= maxTokens) low = middle;
      else high = middle - 1;
    }
    if (low > 0) kept.push(line.slice(0, low).trimEnd());
    break;
  }
  kept.push(marker);
  const text = kept.join("\n").trim();
  return { text, truncated: true, tokensBefore, tokensAfter: estimateGroupTextTokens(text) };
}


export function analyzeGroupSessionMemoryBudget(markdown: string) {
  const sections = splitGroupSessionMemorySections(markdown).map(section => {
    const text = [section.header, ...section.lines].filter((line, index) => index > 0 || !!line).join("\n").trim();
    const tokens = text ? estimateGroupTextTokens(text) : 0;
    return {
      header: section.header || "preamble",
      tokens,
      maxTokens: GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
      overBudget: tokens > GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
    };
  });
  const totalTokens = String(markdown || "").trim() ? estimateGroupTextTokens(markdown) : 0;
  const oversizedSections = sections.filter(section => section.overBudget);
  const totalUtilizationPercent = Math.round(totalTokens / GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS * 1000) / 10;
  const maxSectionUtilizationPercent = sections.length
    ? Math.round(Math.max(...sections.map(section => section.tokens / GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS)) * 1000) / 10
    : 0;
  const status = totalTokens > GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS || oversizedSections.length
    ? "over_budget"
    : totalUtilizationPercent >= 90 || maxSectionUtilizationPercent >= 90
      ? "near_budget"
      : totalTokens > 0 ? "ok" : "empty";
  return {
    schema: "ccm-group-session-memory-budget-v1",
    version: 1,
    status,
    estimator: "ccm-model-context-conservative-ascii-cjk-v1",
    ccParitySource: "Claude Code SessionMemory MAX_SECTION_LENGTH=2000 MAX_TOTAL_SESSION_MEMORY_TOKENS=12000",
    totalTokens,
    maxTotalTokens: GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS,
    totalUtilizationPercent,
    maxSectionTokens: GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
    maxSectionUtilizationPercent,
    sectionCount: sections.length,
    oversizedSectionCount: oversizedSections.length,
    oversizedSections,
    sections,
  };
}


export function evaluateGroupSessionMemoryUpdateCadence(messages: any[], previousSnapshot: any = {}, options: any = {}) {
  const rows = Array.isArray(messages) ? messages : [];
  const previous = previousSnapshot?.updateCadence || previousSnapshot?.update_cadence || {};
  const minimumMessageTokensToInit = Math.max(1, Number(options.minimumMessageTokensToInit || options.minimum_message_tokens_to_init || previous.minimumMessageTokensToInit || GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT));
  const minimumTokensBetweenUpdate = Math.max(1, Number(options.minimumTokensBetweenUpdate || options.minimum_tokens_between_update || previous.minimumTokensBetweenUpdate || GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES));
  const toolCallsBetweenUpdates = Math.max(1, Number(options.toolCallsBetweenUpdates || options.tool_calls_between_updates || previous.toolCallsBetweenUpdates || GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES));
  const currentContextTokens = Math.max(0, Number(options.currentContextTokens || options.current_context_tokens || rows.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0)));
  const initialized = previous.initialized === true || currentContextTokens >= minimumMessageTokensToInit;
  const tokensAtLastExtraction = Math.max(0, Number(previous.tokensAtLastExtraction || 0));
  const tokensSinceLastExtraction = currentContextTokens - tokensAtLastExtraction;
  const lastExtractionMessageId = String(previous.lastExtractionMessageId || previous.last_extraction_message_id || "");
  const toolCallScan = inspectGroupSessionMemoryToolCallsSince(rows, lastExtractionMessageId);
  const toolCallsSinceLastExtraction = toolCallScan.count;
  const lastAssistantTurnHasToolCalls = groupSessionMemoryLastAssistantTurnHasToolCalls(rows);
  const tokenThresholdMet = initialized && tokensSinceLastExtraction >= minimumTokensBetweenUpdate;
  const toolCallThresholdMet = toolCallsSinceLastExtraction >= toolCallsBetweenUpdates;
  const naturalBreak = !lastAssistantTurnHasToolCalls;
  const shouldExtract = tokenThresholdMet && (toolCallThresholdMet || naturalBreak);
  const lastMessageId = rows.length ? getMemoryMessageIdentity(rows[rows.length - 1], rows.length - 1) : "";
  const status = shouldExtract
    ? "extraction_due"
    : !initialized ? "waiting_initialization_tokens"
    : !tokenThresholdMet ? "waiting_update_tokens"
    : toolCallScan.cursorStatus === "not_found" ? "waiting_natural_break_after_cursor_miss"
    : "waiting_tool_calls_or_natural_break";
  return {
    schema: "ccm-group-session-memory-update-cadence-v1",
    version: 1,
    ccParitySource: "Claude Code SessionMemory minimumMessageTokensToInit=10000 minimumTokensBetweenUpdate=5000 toolCallsBetweenUpdates=3",
    minimumMessageTokensToInit,
    minimumTokensBetweenUpdate,
    toolCallsBetweenUpdates,
    initialized,
    status,
    shouldExtract,
    currentContextTokens,
    tokensAtLastExtraction,
    tokensSinceLastExtraction,
    toolCallsSinceLastExtraction,
    lastAssistantTurnHasToolCalls,
    tokenThresholdMet,
    toolCallThresholdMet,
    naturalBreak,
    lastObservedMessageId: lastMessageId,
    lastExtractionMessageId,
    lastExtractionCursorStatus: toolCallScan.cursorStatus,
    lastExtractionCursorIndex: toolCallScan.cursorIndex,
    toolCallScanMessageCount: toolCallScan.scannedMessageCount,
    extractionCount: Math.max(0, Number(previous.extractionCount || 0)),
    lastExtractedAt: String(previous.lastExtractedAt || ""),
    observedAt: String(options.now || new Date().toISOString()),
  };
}


export function enforceGroupSessionMemoryBudget(markdown: string) {
  const before = analyzeGroupSessionMemoryBudget(markdown);
  const truncatedSections: string[] = [];
  const renderedSections = splitGroupSessionMemorySections(markdown).map(section => {
    const limit = Math.min(GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS, groupSessionMemorySectionTokenLimit(section.header));
    const result = truncateGroupSessionMemorySection(section, limit);
    if (result.truncated) truncatedSections.push(section.header || "preamble");
    return result.text;
  });
  let bounded = renderedSections.filter(Boolean).join("\n\n").trim();
  if (estimateGroupTextTokens(bounded) > GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS) {
    const whole = truncateGroupSessionMemorySection({ header: "", lines: bounded.split("\n") }, GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS);
    bounded = whole.text;
    truncatedSections.push("total");
  }
  return {
    markdown: bounded,
    wasTruncated: truncatedSections.length > 0,
    truncatedSections: [...new Set(truncatedSections)],
    before,
    after: analyzeGroupSessionMemoryBudget(bounded),
  };
}


export function buildGroupSessionMemorySectionEvidence(markdown: string, source: any = {}) {
  const text = String(markdown || "").trim();
  const markdownChecksum = hashSessionMemoryText(text, 24);
  const matches = Array.from(text.matchAll(/^# ([^\r\n]+)\r?$/gm));
  const sourceTranscriptChecksum = String(source.sourceTranscriptChecksum || source.source_transcript_checksum || "").trim();
  const sourceFirstMessageId = String(source.sourceFirstMessageId || source.source_first_message_id || "").trim();
  const sourceLastMessageId = String(source.sourceLastMessageId || source.source_last_message_id || "").trim();
  const sourceMessageCount = Math.max(0, Number(source.sourceMessageCount || source.source_message_count || 0));
  const sourceMessageIds = Array.from(new Set(
    (Array.isArray(source.sourceMessageIds || source.source_message_ids) ? (source.sourceMessageIds || source.source_message_ids) : [])
      .map((item: any) => String(item || "").trim())
      .filter(Boolean)
  )).slice(0, 240);
  const sourceType = String(source.sourceType || source.source_type || (sourceTranscriptChecksum ? "model_transcript_range" : "deterministic_memory_snapshot"));
  const sections = matches.map((match: any, index: number) => {
    const start = Number(match.index || 0);
    const end = index + 1 < matches.length ? Number(matches[index + 1].index || text.length) : text.length;
    const section = String(match[1] || "").trim();
    const sectionMarkdown = text.slice(start, end).trim();
    const sectionChecksum = hashSessionMemoryText(sectionMarkdown, 24);
    const evidenceSeed = [markdownChecksum, section, sectionChecksum, sourceTranscriptChecksum, sourceFirstMessageId, sourceLastMessageId].join("\0");
    return {
      evidenceId: `gsmse_${hashSessionMemoryText(evidenceSeed, 20)}`,
      section,
      sectionIndex: index + 1,
      sectionChecksum,
      sourceTranscriptChecksum,
      sourceFirstMessageId,
      sourceLastMessageId,
      sourceMessageCount,
      sourceMessageIds,
    };
  });
  const payload = {
    schema: "ccm-group-session-memory-section-evidence-v1",
    version: 1,
    sourceType,
    markdownChecksum,
    sourceTranscriptChecksum,
    sourceFirstMessageId,
    sourceLastMessageId,
    sourceMessageCount,
    sourceMessageIds,
    sections,
  };
  return { ...payload, checksum: hashSessionMemoryText(JSON.stringify(payload), 32) };
}


export function buildGroupSessionMemorySnapshot(groupId: string, memory: any = {}, options: any = {}) {
  const markdownFile = getGroupSessionMemoryMarkdownFile(groupId);
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const modelMarkdown = String(options.sessionMemoryModelMarkdown || options.session_memory_model_markdown || options.markdown || "").trim();
  const boundedMarkdown = enforceGroupSessionMemoryBudget(modelMarkdown || renderGroupSessionMemoryMarkdown(groupId, memory));
  const markdown = boundedMarkdown.markdown;
  const budget = analyzeGroupSessionMemoryBudget(markdown);
  const compaction = memory.compaction || {};
  const compression = memory.messageCompression || {};
  const boundary = memory.compactBoundary || {};
  const summaryText = String(memory.messageDigest || renderConversationSummary(memory.conversationSummary || null) || "");
  const semanticSummary = {
    goal: String(memory.goal || ""),
    summary: String(memory.summary || ""),
    messageDigest: summaryText,
    persistentRequirements: Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [],
    factAnchors: Array.isArray(memory.factAnchors) ? memory.factAnchors : [],
    decisions: Array.isArray(memory.decisions) ? memory.decisions : [],
    workerLedger: Array.isArray(memory.workerLedger) ? memory.workerLedger : [],
    openQuestions: Array.isArray(memory.openQuestions) ? memory.openQuestions : [],
    nextActions: Array.isArray(memory.nextActions) ? memory.nextActions : [],
  };
  const hasSummary = !!modelMarkdown || Object.values(semanticSummary).some(value => Array.isArray(value) ? value.length > 0 : !!String(value || "").trim());
  const semanticSummaryChecksum = hashSessionMemoryText(JSON.stringify(semanticSummary), 24);
  const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
  const cadenceInput = options.cadenceDecision || options.cadence_decision || memory?.sessionMemory?.updateCadence || {};
  const cursorAdvance = resolveGroupSessionMemoryExtractionCursor(cadenceInput);
  const updateCadence = cadenceInput?.schema
    ? {
      ...cadenceInput,
      ...cursorAdvance,
      status: cadenceInput.shouldExtract === true ? "extracted" : cadenceInput.status,
      shouldExtract: false,
      extractedThisObservation: cadenceInput.shouldExtract === true,
      tokensAtLastExtraction: cadenceInput.shouldExtract === true ? Number(cadenceInput.currentContextTokens || 0) : Number(cadenceInput.tokensAtLastExtraction || 0),
      lastExtractionMessageId: cursorAdvance.cursorAfter,
      extractionCount: Math.max(0, Number(cadenceInput.extractionCount || 0)) + (cadenceInput.shouldExtract === true ? 1 : 0),
      lastExtractedAt: cadenceInput.shouldExtract === true ? generatedAt : String(cadenceInput.lastExtractedAt || ""),
    }
    : null;
  const extractionInput = options.extractionTransaction || options.extraction_transaction || null;
  const extractionTransaction = extractionInput?.schema
    ? {
      ...extractionInput,
      status: "completed",
      committedAt: generatedAt,
    }
    : memory?.sessionMemory?.extractionTransaction || null;
  const modelExtractionReceipt = options.modelExtractionReceipt || options.model_extraction_receipt || null;
  const modelMergeQuality = options.modelMergeQuality || options.model_merge_quality || modelExtractionReceipt?.mergeQuality || null;
  const factSupersessionGraph = options.factSupersessionGraph
    || options.fact_supersession_graph
    || modelExtractionReceipt?.factSupersessionGraph
    || modelMergeQuality?.factSupersessionGraph
    || null;
  const extractionMethod = modelMarkdown ? "forked_model_session_memory" : "deterministic_structured_fallback";
  const postCompactSessionStateReset = compaction.postCompactSessionStateReset
    || compression.postCompactSessionStateReset
    || boundary.postCompactSessionStateReset
    || boundary.post_compact_restore?.postCompactSessionStateReset
    || null;
  const postCompactSessionStateResetVerification = postCompactSessionStateReset?.schema
    ? verifyGroupPostCompactSessionStateResetReceipt(postCompactSessionStateReset, {
      groupId: memory.groupId,
      groupSessionId: memory.groupSessionId,
      boundaryId: boundary.id,
      summaryChecksum: compaction.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || "",
    })
    : null;
  const extractionCursor = postCompactSessionStateResetVerification?.valid === true
    ? String(postCompactSessionStateReset.session_memory_extraction_cursor?.message_id || "")
    : String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || "");
  const sectionEvidence = options.sectionEvidence || options.section_evidence || buildGroupSessionMemorySectionEvidence(markdown, {
    sourceType: modelMarkdown ? "model_transcript_range" : "deterministic_memory_snapshot",
    sourceTranscriptChecksum: modelExtractionReceipt?.requestAudit?.sourceTranscriptChecksum || semanticSummaryChecksum,
    sourceFirstMessageId: modelExtractionReceipt?.requestAudit?.sourceFirstMessageId || "",
    sourceLastMessageId: modelExtractionReceipt?.requestAudit?.sourceLastMessageId || String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""),
    sourceMessageCount: modelExtractionReceipt?.requestAudit?.sourceMessageCount || 0,
    sourceMessageIds: modelExtractionReceipt?.requestAudit?.sourceMessageIds || [],
  });
  return {
    schema: "ccm-group-session-memory-snapshot-v1",
    version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
    groupId,
    generatedAt,
    reason: String(options.reason || "save_group_memory"),
    strategy: modelMarkdown ? "cc-session-memory-forked-model-v1" : String(compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"),
    extractionMethod,
    modelExtracted: !!modelMarkdown,
    deterministicFallback: !modelMarkdown,
    modelExtractionReceipt,
    modelMergeQuality,
    factSupersessionGraph,
    sectionEvidence,
    budgetEnforcement: {
      wasTruncated: boundedMarkdown.wasTruncated,
      truncatedSections: boundedMarkdown.truncatedSections,
      before: boundedMarkdown.before,
      after: boundedMarkdown.after,
    },
    summaryFile: markdownFile,
    snapshotFile,
    lastSummarizedMessageId: extractionCursor,
    durableBoundaryMessageId: String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""),
    providerActiveLastSummarizedMessageId: postCompactSessionStateResetVerification?.valid === true ? "" : extractionCursor,
    providerActiveCursorStatus: postCompactSessionStateResetVerification?.valid === true ? "cleared_after_compact" : "legacy_shared_cursor",
    extractionCursorGeneration: Math.max(0, Number(postCompactSessionStateReset?.session_memory_extraction_cursor?.generation || 0)),
    postCompactSessionStateReset,
    postCompactSessionStateResetValid: postCompactSessionStateResetVerification?.valid === true,
    postCompactSessionStateResetIssues: postCompactSessionStateResetVerification?.issues || [],
    summaryChecksum: String(compaction.summaryChecksum || boundary.summaryChecksum || semanticSummaryChecksum),
    markdownChecksum: hashSessionMemoryText(markdown, 24),
    markdownChars: markdown.length,
    markdownTokens: budget.totalTokens,
    memoryBudget: budget,
    updateCadence,
    extractionTransaction,
    hasSummary,
    compactedMessageCount: Number(compaction.compactedMessageCount || compression.compressedMessages || 0),
    preservedRecentMessages: Number(compaction.preservedRecentMessages || compression.recentMessages || 0),
    preCompactTokenCount: Number(compaction.preCompactTokenCount || compression.preCompactTokenCount || 0),
    postCompactTokenCount: Number(compaction.postCompactTokenCount || compression.postCompactTokenCount || 0),
    health: String(compaction.health || ""),
    contextPressureWarning: compaction.contextPressureWarning || compression.contextPressureWarning || null,
    markdownExcerpt: compactPreserveLines(markdown, 1200),
    markdown,
  };
}


export function summarizeGroupSessionMemorySnapshot(snapshot: any = {}) {
  if (!snapshot?.schema) return null;
  const { markdown, ...rest } = snapshot;
  return {
    ...rest,
    markdownExcerpt: compactPreserveLines(snapshot.markdownExcerpt || markdown || "", 1200),
  };
}


export function persistGroupSessionMemorySnapshot(groupId: string, memory: any = {}, options: any = {}) {
  const snapshot = buildGroupSessionMemorySnapshot(groupId, memory, options);
  return commitGroupSessionMemorySnapshot(snapshot);
}


export function commitGroupSessionMemorySnapshot(snapshot: any = {}) {
  if (!snapshot?.schema || !snapshot?.summaryFile || !snapshot?.snapshotFile) {
    throw new Error("invalid_group_session_memory_snapshot_commit");
  }
  writeTextAtomic(snapshot.summaryFile, snapshot.markdown);
  writeJsonAtomic(snapshot.snapshotFile, summarizeGroupSessionMemorySnapshot(snapshot));
  return summarizeGroupSessionMemorySnapshot(snapshot);
}


export function persistGroupSessionMemoryCadenceObservation(groupId: string, cadenceDecision: any = {}) {
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
  let previous: any = null;
  try { if (fs.existsSync(snapshotFile)) previous = JSON.parse(fs.readFileSync(snapshotFile, "utf-8")); } catch {}
  const next = {
    ...(previous?.schema === "ccm-group-session-memory-snapshot-v1" ? previous : {
      schema: "ccm-group-session-memory-snapshot-v1",
      version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
      groupId,
      snapshotFile,
      summaryFile,
      generatedAt: "",
      hasSummary: false,
      markdownChars: 0,
      markdownTokens: 0,
    }),
    version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
    snapshotFile,
    summaryFile,
    updateCadence: { ...cadenceDecision, shouldExtract: false },
    cadenceUpdatedAt: String(cadenceDecision.observedAt || new Date().toISOString()),
  };
  writeJsonAtomic(snapshotFile, next);
  return summarizeGroupSessionMemorySnapshot(next);
}


export function readGroupSessionMemorySnapshotSummary(groupId: string) {
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
  try {
    const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
    const markdown = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : "";
    const memoryBudget = analyzeGroupSessionMemoryBudget(markdown);
    return {
      ...parsed,
      schema: "ccm-group-session-memory-snapshot-v1",
      version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
      groupId,
      snapshotFile,
      summaryFile,
      markdownExists: !!markdown,
      markdownChecksumMatches: markdown ? hashSessionMemoryText(markdown, 24) === parsed.markdownChecksum : false,
      markdownChars: markdown.length,
      markdownTokens: memoryBudget.totalTokens,
      memoryBudget,
      markdownExcerpt: compactPreserveLines(parsed.markdownExcerpt || markdown, 1200),
    };
  } catch {
    let markdown = "";
    try { if (fs.existsSync(summaryFile)) markdown = fs.readFileSync(summaryFile, "utf-8"); } catch {}
    const memoryBudget = analyzeGroupSessionMemoryBudget(markdown);
    return {
      schema: "ccm-group-session-memory-snapshot-v1",
      version: GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
      groupId,
      snapshotFile,
      summaryFile,
      markdownExists: !!markdown,
      markdownChecksumMatches: false,
      markdownChars: markdown.length,
      markdownTokens: memoryBudget.totalTokens,
      memoryBudget,
      hasSummary: false,
      generatedAt: "",
    };
  }
}


export function refreshGroupConversationMemorySnapshot(groupId: string, allMessages: any[], memory: any, options: any = {}) {
  const groupSessionId = String(options.groupSessionId || options.group_session_id || memory?.groupSessionId || getActiveGroupChatSessionId(groupId));
  const sessionMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
  const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || memory?.messageCompression?.recentLimit || 12));
  const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || memory?.messageCompression?.olderLimit || 30));
  const messages = (allMessages || []).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const minKeepMessages = Math.max(GROUP_COMPACT_MIN_KEEP_MESSAGES, Number(options.minKeepMessages || options.min_keep_messages || recentLimit));
  const minKeepTokens = Math.max(1, Number(options.minKeepTokens || options.min_keep_tokens || GROUP_COMPACT_MIN_KEEP_TOKENS));
  const maxKeepTokens = Math.max(minKeepTokens, Number(options.maxKeepTokens || options.max_keep_tokens || GROUP_COMPACT_MAX_KEEP_TOKENS));
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, {
    floorIndex: 0,
    minMessages: minKeepMessages,
    minTokens: minKeepTokens,
    maxTokens: maxKeepTokens,
  });
  const messagesToSummarize = messages.slice(0, keepIndex);
  const keptMessages = messages.slice(keepIndex);
  const activeTokenEstimate = messages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const sessionMemoryCadenceDecision = evaluateGroupSessionMemoryUpdateCadence(
    messages,
    readGroupSessionMemorySnapshotSummary(sessionMemoryScopeId) || memory?.sessionMemory || {},
    { ...options, currentContextTokens: activeTokenEstimate }
  );
  const currentPressureWarning = calculateGroupCompactWarningState({
    activeTokens: activeTokenEstimate,
    activeMessageCount: messages.length,
    config: options.config || options,
  });
  const anchors = extractGroupFactAnchors(messagesToSummarize);
  const persistentRequirements = mergeFactAnchorList(
    memory?.persistentRequirements || [],
    extractPersistentRequirementsFromAnchors(anchors),
    160
  );
  const modelSummaryRequired = options.modelSummaryRequired === true
    || String(options.config?.memoryCompactionMode || options.config?.memory_compaction_mode || "").toLowerCase() === "model-required";

  if (!messagesToSummarize.length || modelSummaryRequired) {
    const now = new Date().toISOString();
    const hasCommittedCompactBoundary = !!memory?.compactBoundary?.id;
    const compactStrategyDecision = buildGroupCompactStrategyDecision({
      groupId,
      messages,
      messagesToCompact: [],
      keptMessages: messages,
      keepIndex,
      compacted: false,
      primaryCompact: false,
      preCompactWarning: currentPressureWarning,
      activeTokens: activeTokenEstimate,
      activeMessageCount: messages.length,
      preCompactTokenCount: activeTokenEstimate,
      postCompactTokenCount: activeTokenEstimate,
      transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
      reason: modelSummaryRequired
        ? "model summary required; local sync compaction disabled"
        : "recent window only; no sync snapshot compaction needed",
      now,
    });
    const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
      groupId,
      activeTokens: activeTokenEstimate,
      targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
      maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
      now,
    });
    return saveGroupMemory(groupId, {
      ...memory,
      conversationSummary: hasCommittedCompactBoundary ? (memory?.conversationSummary || null) : null,
      messageDigest: hasCommittedCompactBoundary ? String(memory?.messageDigest || "") : "",
      compactBoundary: hasCommittedCompactBoundary ? memory.compactBoundary : null,
      compaction: {
        ...(memory?.compaction || {}),
        version: GROUP_MEMORY_COMPACTION_VERSION,
        enabled: true,
        health: hasCommittedCompactBoundary
          ? String(memory?.compaction?.health || "healthy")
          : messages.length ? "recent-window-only" : "empty",
        compactedMessageCount: hasCommittedCompactBoundary
          ? Number(memory?.compaction?.compactedMessageCount || memory?.compactBoundary?.summarizedMessageCount || 0)
          : 0,
        totalMessagesSeen: messages.length,
        preservedRecentMessages: messages.length,
        lastCompactedMessageId: hasCommittedCompactBoundary
          ? String(memory?.compaction?.lastCompactedMessageId || memory?.compactBoundary?.summarizedThroughMessageId || "")
          : "",
        contextPressureWarning: currentPressureWarning,
        compactWarning: currentPressureWarning,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        lastPressureSampleAt: now,
      },
      factAnchors: mergeFactAnchorList(memory?.factAnchors || [], extractGroupFactAnchors(messages), 300),
      persistentRequirements,
      messageCompression: {
        ...(memory?.messageCompression || {}),
        enabled: true,
        strategy: "cc-session-memory-v3-sync",
        configuredRecentLimit: recentLimit,
        recentLimit: messages.length,
        olderLimit,
        totalMessages: messages.length,
        compressedMessages: hasCommittedCompactBoundary
          ? Number(memory?.messageCompression?.compressedMessages || memory?.compaction?.compactedMessageCount || memory?.compactBoundary?.summarizedMessageCount || 0)
          : 0,
        recentMessages: messages.length,
        contextPressureWarning: currentPressureWarning,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        lastCompressedAt: now,
      },
    }, groupSessionId, { sessionMemoryCadenceDecision });
  }

  const conversationSummary = buildDeterministicConversationSummary(
    messagesToSummarize,
    memory,
    memory?.conversationSummary || {}
  );
  const now = new Date().toISOString();
  const currentTasks = loadTasks();
  const postCompactTaskStatusProjection = buildGroupPostCompactTaskStatusProjection(currentTasks, {
    groupId,
    groupSessionId,
    taskStatusBudget: options.postCompactReinject?.taskStatusBudget || options.postCompactReinject?.task_status_budget,
    completedMaxAgeMs: options.postCompactReinject?.completedMaxAgeMs || options.postCompactReinject?.completed_max_age_ms,
    now,
  });
  const microCompact = buildGroupMicroCompactPlan(messagesToSummarize);
  const postCompactReinject = buildPostCompactReinjectionPlan(messagesToSummarize, microCompact, {
    groupId,
    groupSessionId,
    sessionMessages: messages,
    preservedMessages: keptMessages,
    taskStatuses: postCompactTaskStatusProjection.tasks,
    tasks: currentTasks,
    currentTaskId: options.currentTaskId || options.current_task_id,
    dynamicContextCatalog: buildGroupPostCompactDynamicContextCatalog(groupId, memory, options),
    dynamicContextScanMode: "full",
    now,
  });
  const preCompactTokenCount = messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const postCompactTokenCount = estimateGroupTextTokens(JSON.stringify(conversationSummary))
    + keptMessages.reduce((sum, message) => sum + Math.min(estimateGroupMessageTokens(message), 2500), 0);
  const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
  const postCompactWarning = calculateGroupCompactWarningState({
    activeTokens: postCompactTokenCount,
    activeMessageCount: keptMessages.length,
    config: options.config || options,
    suppressed: true,
    suppressReason: "post_sync_compaction_until_next_group_memory_pressure_sample",
    now,
  });
  const baseContextBudget = buildContextBudget({
    context: {
      conversationSummary,
      microCompact: {
        compactedMessageCount: microCompact.compactedMessageCount,
        tokensFreed: microCompact.tokensFreed,
        records: (microCompact.records || []).slice(-12),
      },
      postCompactReinject,
      keptRecent: keptMessages.map((message: any) => getMemoryMessageContent(message)),
    },
    maxChars: 48_000,
    maxTokens: 90_000,
  });
  const previousPtlEmergency = memory?.compaction?.ptlEmergency
    || memory?.compactBoundary?.ptlEmergency
    || memory?.messageCompression?.ptlEmergency
    || null;
  const ptlRecovery = buildGroupPtlRecoveryPlan({
    previousPtlEmergency,
    currentPtlEmergency: null,
    contextBudget: baseContextBudget,
    triggerTokens: previousPtlEmergency?.triggerTokens || baseContextBudget.max_tokens,
    postCompactTokenCount,
    restoredMessageDigestMaxChars: 14_000,
    summaryChecksum,
    transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
    config: options.config || options,
    now,
  });
  const activePtlEmergency = ptlRecovery ? null : previousPtlEmergency;
  const messageDigest = renderConversationSummary(conversationSummary, activePtlEmergency?.messageDigestMaxChars || 14_000);
  const effectiveContextBudget = ptlRecovery
    ? {
      ...baseContextBudget,
      ptl_recovery: {
        schema: ptlRecovery.schema,
        reason: ptlRecovery.reason,
        restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
        contextBudgetPressure: ptlRecovery.contextBudgetPressure,
      },
    }
    : activePtlEmergency
      ? {
        ...baseContextBudget,
        ptl_emergency: {
          schema: activePtlEmergency.schema,
          emergencyLevel: activePtlEmergency.emergencyLevel,
          reason: activePtlEmergency.reason,
          messageDigestMaxChars: activePtlEmergency.messageDigestMaxChars,
        },
      }
      : baseContextBudget;
  const boundaryThrough = messagesToSummarize[messagesToSummarize.length - 1];
  const preservedSegment = buildGroupPreservedSegment(messages, keepIndex, {
    groupId,
    floorIndex: 0,
    minMessages: minKeepMessages,
    minTokens: minKeepTokens,
    maxTokens: maxKeepTokens,
    summaryChecksum,
    transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
    now,
  });
  const compactStrategyDecision = buildGroupCompactStrategyDecision({
    groupId,
    messages,
    messagesToCompact: messagesToSummarize,
    keptMessages,
    keepIndex,
    compacted: true,
    primaryCompact: true,
    microCompact,
    ptlRecovery,
    preservedSegment,
    preCompactWarning: currentPressureWarning,
    activeTokens: activeTokenEstimate,
    activeMessageCount: messages.length,
    preCompactTokenCount,
    postCompactTokenCount,
    summaryChecksum,
    transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
    reason: "sync snapshot compact selected session-memory style summary plus recent window",
    now,
  });
  const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
    groupId,
    activeTokens: preCompactTokenCount,
    targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
    maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
    now,
  });
  let boundary: any = {
    id: `compact-sync-${Date.now().toString(36)}`,
    type: "sync-context",
    summarizedFromMessageId: getMemoryMessageIdentity(messagesToSummarize[0], 0),
    summarizedThroughMessageId: getMemoryMessageIdentity(boundaryThrough, keepIndex - 1),
    summarizedMessageCount: messagesToSummarize.length,
    preservedMessageIds: keptMessages.slice(-40).map((message: any, index: number) => getMemoryMessageIdentity(message, keepIndex + index)),
    preservedSegment,
    preCompactTokenCount,
    postCompactTokenCount,
    summaryChecksum,
    compactStrategyDecision,
    apiMicroCompactEditPlan,
    post_compact_restore: {
      strategy: "conversation_summary_recent_reinject",
      preservedMessageIds: keptMessages.slice(-20).map((message: any, index: number) => getMemoryMessageIdentity(message, keepIndex + index)),
      preservedSegment,
      strategyDecision: compactStrategyDecision,
      apiMicroCompactEditPlan,
      transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
      microCompact,
      reinjectionPlan: postCompactReinject,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      ptlRecovery,
      recoveryAudit: null as any,
      cleanupAudit: null as any,
    },
    context_budget: effectiveContextBudget,
    summarySource: "deterministic-sync",
    createdAt: now,
  };
  const previousBoundary = memory?.compactBoundary || null;
  const previousSegment = previousBoundary?.preservedSegment || previousBoundary?.post_compact_restore?.preservedSegment || null;
  if (previousBoundary?.id
    && String(previousBoundary.summarizedThroughMessageId || "") === String(boundary.summarizedThroughMessageId || "")
    && String(memory?.compaction?.summaryChecksum || previousBoundary?.summaryChecksum || previousSegment?.summaryChecksum || "") === summaryChecksum
    && previousSegment?.schema === "ccm-group-preserved-segment-v1") {
    boundary = {
      ...boundary,
      id: previousBoundary.id,
      createdAt: previousBoundary.createdAt || boundary.createdAt,
      refreshedAt: now,
      preservedMessageIds: previousBoundary.preservedMessageIds || boundary.preservedMessageIds,
      preservedSegment: previousSegment,
      post_compact_restore: {
        ...(boundary.post_compact_restore || {}),
        preservedMessageIds: previousBoundary?.post_compact_restore?.preservedMessageIds || boundary.post_compact_restore?.preservedMessageIds,
        preservedSegment: previousSegment,
      },
    };
  }
  const postCompactRecoveryAudit = buildGroupPostCompactRecoveryAudit({
    groupId,
    messages,
    boundary,
    keepIndex,
    conversationSummary,
    messageDigest,
    summaryChecksum,
    transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
    preservedSegment,
    postCompactReinject,
    microCompact,
    contextPressureWarning: postCompactWarning,
    contextBudget: effectiveContextBudget,
    ptlRecovery,
    now,
  });
  boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
  const postCompactCleanupAudit = buildGroupPostCompactCleanupAudit({
    groupId,
    groupSessionId,
    boundary,
    compactStrategyDecision,
    apiMicroCompactEditPlan,
    postCompactRecoveryAudit,
    microCompact,
    postCompactReinject,
    postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
    preservedSegment,
    transcriptPath: getGroupMessagesFileHint(groupId, groupSessionId),
    summaryChecksum,
    now,
  });
  boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
  const compaction = {
    ...(memory?.compaction || {}),
    version: GROUP_MEMORY_COMPACTION_VERSION,
    enabled: true,
    lastCompactedMessageId: boundary.summarizedThroughMessageId,
    lastCompactedAt: now,
    compactedMessageCount: messagesToSummarize.length,
    totalMessagesSeen: messages.length,
    preservedRecentMessages: keptMessages.length,
    preCompactTokenCount,
    postCompactTokenCount,
    summaryChecksum,
    summarySource: "deterministic-sync",
    modelMode: "session-memory-first",
    deterministicFactsPreserved: true,
    health: ptlRecovery
      ? "healthy"
      : activePtlEmergency?.engaged
        ? "ptl_emergency"
        : postCompactTokenCount < preCompactTokenCount ? "healthy" : "watch",
    context_budget: boundary.context_budget,
    microCompact,
    postCompactReinject,
    postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
    ptlEmergency: activePtlEmergency,
    ptlRecovery,
    preservedSegment,
    compactStrategyDecision,
    apiMicroCompactEditPlan,
    postCompactRecoveryAudit,
    postCompactCleanupAudit,
    contextPressureWarning: postCompactWarning,
    compactWarning: postCompactWarning,
    preCompactWarning: currentPressureWarning,
    lastPressureSampleAt: now,
    boundaries: [...(Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : []), boundary].slice(-8),
  };

  return saveGroupMemory(groupId, {
    ...memory,
    conversationSummary,
    messageDigest,
    compactBoundary: boundary,
    compaction,
    factAnchors: mergeFactAnchorList(memory?.factAnchors || [], anchors, 300),
    persistentRequirements,
    messageCompression: {
      enabled: true,
      strategy: "cc-session-memory-v3-sync",
      configuredRecentLimit: recentLimit,
      recentLimit: keptMessages.length,
      olderLimit,
      totalMessages: messages.length,
      compressedMessages: messagesToSummarize.length,
      recentMessages: keptMessages.length,
      preCompactTokenCount,
      postCompactTokenCount,
      microCompactTokensFreed: microCompact.tokensFreed,
      ptlEmergency: activePtlEmergency,
      ptlRecovery,
      preservedSegment,
      compactStrategyDecision,
      apiMicroCompactEditPlan,
      postCompactRecoveryAudit,
      postCompactCleanupAudit,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      contextPressureWarning: postCompactWarning,
      lastCompressedAt: now,
    },
  }, groupSessionId, { sessionMemoryCadenceDecision });
}
