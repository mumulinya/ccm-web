// group-compact-file-references.ts — merged from 3 part files (behavior-freeze merge).

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  loadProjectConfigs,
  loadTasks,
} from "../../core/db";
import {
  CCM_DIR,
  getWorkDirForProject,
} from "../../core/utils";
import {
  buildContextBudget,
  estimateTextTokens,
} from "../../system/context-budget";
import {
  buildToolAuthorizationPayload,
  normalizeToolAuthorization,
} from "../../tools/tool-authorization";
import {
  toolManager,
} from "../../tools/tool-manager";
import {
  getPublicAgentRuntimes,
  normalizeAgentRuntimeId,
} from "../../agents/runtime";
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
import {
  loadExecution,
} from "../../agents/execution-kernel";
import {
  DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA,
  pruneDirectAgentDispatchSpool,
  validateDirectAgentDispatchPair,
} from "../../agents/direct-dispatch-spool";
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
import {
  deleteTaskAgentInvocationLineageArtifacts,
} from "../../tasks/task-agent-invocation-lineage";
import {
  deleteTaskAgentContinuationSoakArtifacts,
} from "../../tasks/task-agent-continuation-soak";
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
import {
  deleteGroupReactiveCompactRetryOwnership,
} from "./group-reactive-compact-retry-ownership";
import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification,
} from "./group-prompt-cache-break-detection";
import {
  deleteWorkerContextCompactSessionArtifactsForCoordinator,
} from "./group-orchestrator";
import {
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR,
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR,
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS,
  GROUP_COMPACT_FILE_REFERENCE_DIR,
  GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
  GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION,
  GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
  GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR,
  GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
  GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
  GROUP_MEMORY_RELOAD_AUDIT_VERSION,
  GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION,
  GROUP_MEMORY_SOURCE_MANIFEST_VERSION,
  apiMicrocompactBetaHeadersFromHeaders,
  buildGroupMemorySourceEntry,
  buildStableSourceFingerprint,
  compactMemoryText,
  compactReferenceFingerprint,
  getGroupMessagesFileHint,
  hashSessionMemoryText,
  normalizePostCompactUsageState,
  readGroupMemoryReloadLedger,
  readGroupPostCompactDispatchLedger,
  resolvePostCompactBoundaryMarkerParts,
  stableApiMicrocompactChecksum,
  uniqueApiMicrocompactStrings,
  uniqueByKey,
  usageRecommendationForStats,
  writeGroupMemoryReloadLedger,
  writeGroupPostCompactDispatchLedger,
} from "./group-memory-shared";
import {
  getGroupMemoryFile,
  getGroupMemoryReloadLedgerFile,
  getGroupPostCompactDispatchLedgerFile,
  getGroupSessionSidecarFile,
} from "./group-memory-storage";

// ===== merged from group-compact-file-references-part-01.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function getGroupPostCompactCandidateUsageLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR, groupId, sessionId);
}

export function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, groupId, sessionId);
}

export function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId: string, sessionId = "") {
  return getGroupSessionSidecarFile(GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, groupId, sessionId);
}

export function getGroupCompactFileReferenceLedgerFile(groupId: string) {
  return path.join(GROUP_COMPACT_FILE_REFERENCE_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}

export function normalizeCompactFileReferencePath(value: any) {
  return String(value || "").replace(/\\/g, "/").trim();
}

export function compactFileReferenceId(groupId: string, type: string, filePath: string) {
  return `compact-file:${crypto.createHash("sha256").update(JSON.stringify([groupId, type, normalizeCompactFileReferencePath(filePath)])).digest("hex").slice(0, 14)}`;
}

export function compactFileReferenceKind(filePath: string) {
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    return stat?.isDirectory() ? "directory" : "file";
  } catch {
    return "file";
  }
}

export function compactFileReferenceEntry(groupId: string, type: string, filePath: any, reason: string, extra: any = {}) {
  const normalizedPath = String(filePath || "").trim();
  if (!normalizedPath) return null;
  const sourceState = buildGroupMemorySourceEntry(`compact:${type}`, normalizedPath, type);
  return {
    schema: "ccm-compact-file-reference-v1",
    reference_id: compactFileReferenceId(groupId, type, normalizedPath),
    type,
    kind: sourceState.kind || compactFileReferenceKind(normalizedPath),
    path: normalizedPath,
    displayPath: normalizeCompactFileReferencePath(normalizedPath),
    reason: compactMemoryText(reason, 260),
    exists: sourceState.exists === true,
    bytes: Number(sourceState.bytes || 0),
    checksum: sourceState.checksum || "",
    checksumMode: sourceState.checksumMode || "",
    mtimeMs: Number(sourceState.mtimeMs || 0),
    mtime: sourceState.mtime || "",
    sourceChecksum: sourceState.checksum || "",
    sourceChecksumMode: sourceState.checksumMode || "",
    sourceMtimeMs: Number(sourceState.mtimeMs || 0),
    sourceMtime: sourceState.mtime || "",
    sourceBytes: Number(sourceState.bytes || 0),
    ...extra,
  };
}

export function uniqueCompactFileReferences(refs: any[] = [], limit = 40) {
  return uniqueByKey(
    refs.filter(Boolean),
    (item: any) => `${item.reference_id || ""}|${normalizeCompactFileReferencePath(item.path || "")}`,
    limit
  );
}

export function buildGroupCompactFileReferences(groupId: string, input: any = {}) {
  const refs: any[] = [];
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const sourceManifest = input.sourceManifest || input.source_manifest || {};
  const rawSources = input.rawSources || input.raw_sources || {};
  const sessionMemory = input.sessionMemory || input.session_memory || {};
  const toolContinuity = input.toolContinuity || input.tool_continuity || {};
  const typedMemory = input.typedMemory || input.typed_memory || {};
  const add = (type: string, filePath: any, reason: string, extra: any = {}) => {
    const ref = compactFileReferenceEntry(groupId, type, filePath, reason, extra);
    if (ref) refs.push(ref);
  };

  add("group_session_memory", sessionMemory.summaryFile || rawSources.group_session_memory_summary_file, "CC 风格 Session Memory summary.md；压缩后优先作为会话短记忆恢复。", {
    checksum: sessionMemory.markdownChecksum || "",
    source_schema: sessionMemory.schema || "",
  });
  add("group_session_memory_snapshot", sessionMemory.snapshotFile || rawSources.group_session_memory_snapshot_file, "Session Memory snapshot.json；用于核对摘要 checksum 和压缩边界。", {
    checksum: sessionMemory.snapshotChecksum || sessionMemory.summaryChecksum || "",
    source_schema: sessionMemory.schema || "",
  });
  add("tool_continuity_summary", toolContinuity.summaryFile || rawSources.group_tool_continuity_summary_file, "工具/技能连续性 summary.md；只恢复上下文，不扩大授权。", {
    checksum: toolContinuity.markdownChecksum || "",
    source_schema: toolContinuity.schema || "",
  });
  add("tool_continuity_snapshot", toolContinuity.snapshotFile || rawSources.group_tool_continuity_snapshot_file, "工具/技能连续性 snapshot.json；用于核对 allowed/requested/synced/missing 和 invoked skills。", {
    checksum: toolContinuity.snapshotChecksum || "",
    source_schema: toolContinuity.schema || "",
  });
  add("typed_memory_index", rawSources.group_typed_memory_index_file || typedMemory.sync?.indexFile || typedMemory.sync?.index_file, "typed MEMORY.md 入口；长期记忆索引和召回入口。");
  add("typed_memory_dir", rawSources.group_typed_memory_dir || typedMemory.sync?.memoryDir || typedMemory.sync?.memory_dir, "typed memory 目录；必要时按索引继续读取具体记忆文档。");
  add("group_memory_json", rawSources.group_memory_file || getGroupMemoryFile(groupId, groupSessionId), "群聊结构化记忆 JSON；压缩摘要、约束和工作账本的结构化来源。");
  add("raw_group_messages_json", rawSources.group_messages_file || getGroupMessagesFileHint(groupId, groupSessionId), "群聊原始消息 JSON；最高保真来源，按 message id 回溯。");
  add("global_agent_memory_json", rawSources.global_agent_memory_file, "全局 Agent 长期记忆 JSON；只注入与当前任务匹配的全局约束/历史结论，使用前必须核验当前状态。");
  add("global_memory_arbitration_ledger", rawSources.group_global_memory_arbitration_ledger_file, "全局/群聊记忆仲裁账本；用于核对被本群聊新证据降权或冲突的全局记忆，并为 typed memory 蒸馏提供候选。");
  add("global_memory_cross_group_arbitration", rawSources.global_memory_cross_group_arbitration_dir, "跨群聊全局记忆仲裁 ledger 目录；用于核对同一全局记忆是否已在其他群聊被降权/冲突，避免 stale 全局记忆重复注入子 Agent。");
  add("typed_memory_recall_ledger", rawSources.group_typed_memory_recall_ledger_file, "typed memory recall ledger；用于避免重复召回和核对已 surfaced 记忆。");
  add("typed_memory_distillation_ledger", rawSources.group_typed_memory_distillation_ledger_file, "typed memory distillation ledger；用于核对长期日志蒸馏和归档。");
  add("post_compact_candidate_usage_ledger", rawSources.group_post_compact_candidate_usage_ledger_file, "压缩重注入候选使用账本；子 Agent 回执应声明 used/ignored/verified。");
  add("post_compact_dispatch_ledger", rawSources.group_post_compact_dispatch_ledger_file, "压缩后首次派发账本；用于核对 post-compact 第一跳上下文。");
  add("replay_repair_work_items", rawSources.group_replay_repair_work_items_file, "Replay repair work items；压缩恢复缺口的待办来源。");

  for (const entry of Array.isArray(sourceManifest.entries) ? sourceManifest.entries : []) {
    if (!entry?.path) continue;
    if (!["typed_memory_doc", "typed_memory_entrypoint", "raw_group_messages_json", "group_memory_json"].includes(String(entry.type || ""))) continue;
    add(String(entry.type || "memory_source"), entry.path, `source manifest ${entry.id || "entry"}；${entry.type || "memory source"}`, {
      manifest_id: entry.id || "",
      checksum: entry.checksum || entry.docChecksum || "",
      source_schema: sourceManifest.schema || "",
    });
  }

  const unique = uniqueCompactFileReferences(refs, Number(input.limit || 40));
  return {
    schema: "ccm-group-compact-file-references-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    generatedAt: String(input.generatedAt || input.generated_at || new Date().toISOString()),
    referenceCount: unique.length,
    fileCount: unique.filter((item: any) => item.kind === "file").length,
    directoryCount: unique.filter((item: any) => item.kind === "directory").length,
    missingCount: unique.filter((item: any) => item.exists === false).length,
    references: unique,
    usePolicy: {
      sourceOfTruth: "raw_group_messages_json",
      behavior: "compact_file_reference",
      note: "这些路径是压缩后恢复上下文的文件引用；内容过大或过旧时应按当前任务选择性读取/核验，不要盲目假定。",
    },
  };
}

export function compactFileReferenceReadPlanPriority(reference: any = {}) {
  const type = String(reference.type || "");
  if (reference.exists === false) return { priority: 900, action: "skip_missing", readMode: "unavailable", reason: "引用路径不存在；不要假定该来源可读，在 memoryIgnored 中说明缺失。" };
  if (type === "group_session_memory") return { priority: 10, action: "read_first_for_compact_summary", readMode: "read_markdown_summary", reason: "压缩后短记忆摘要，优先用来恢复会话目标、约束和近期结论。" };
  if (type === "raw_group_messages_json") return { priority: 20, action: "read_if_summary_is_insufficient", readMode: "targeted_json_source_of_truth", reason: "群聊原始消息是最高保真来源；只在需要核对 message id、用户原话或摘要冲突时读取。" };
  if (type === "typed_memory_index") return { priority: 30, action: "read_index_before_specific_memory_docs", readMode: "read_index_then_targeted_docs", reason: "typed MEMORY.md 是长期记忆入口；先看索引，再按任务读取具体类型化文档。" };
  if (type === "typed_memory_dir") return { priority: 35, action: "list_or_open_index_only", readMode: "directory_index_only", reason: "typed memory 目录只作为入口；避免盲目读取整个目录。" };
  if (type === "group_memory_json") return { priority: 40, action: "read_for_structured_state", readMode: "targeted_json_state", reason: "结构化群聊记忆可核对 workerLedger、约束、压缩边界和当前阶段。" };
  if (type === "group_session_memory_snapshot") return { priority: 45, action: "read_to_verify_summary_checksum", readMode: "targeted_json_metadata", reason: "用于核对 Session Memory 摘要 checksum、边界和生成状态。" };
  if (type === "tool_continuity_summary") return { priority: 50, action: "read_if_tool_or_skill_context_matters", readMode: "read_markdown_summary", reason: "工具/技能连续性只恢复上下文，不扩大授权；涉及工具选择时再读取。" };
  if (type === "tool_continuity_snapshot") return { priority: 55, action: "read_to_verify_tool_context_only", readMode: "targeted_json_metadata", reason: "核对 allowed/requested/synced/missing 与 invoked skills，仍以当前 runtime gate 为准。" };
  if (type === "post_compact_candidate_usage_ledger") return { priority: 60, action: "read_for_candidate_usage_history", readMode: "targeted_json_ledger", reason: "核对压缩重注入候选历史 used/ignored/verified，避免重复提升 stale 记忆。" };
  if (type === "post_compact_dispatch_ledger") return { priority: 65, action: "read_for_first_dispatch_after_compact", readMode: "targeted_json_ledger", reason: "核对压缩后第一跳派发 marker 和边界连续性。" };
  if (type === "typed_memory_recall_ledger") return { priority: 70, action: "read_for_recall_dedupe", readMode: "targeted_json_ledger", reason: "需要排查重复召回或已 surfaced 记忆时再读取。" };
  if (type === "typed_memory_distillation_ledger") return { priority: 75, action: "read_for_distillation_archive", readMode: "targeted_json_ledger", reason: "需要核对长期日志蒸馏、归档和降权历史时再读取。" };
  if (type === "global_memory_arbitration_ledger") return { priority: 58, action: "read_for_global_group_memory_conflict_history", readMode: "targeted_json_ledger", reason: "排查全局记忆与本群聊新证据冲突时读取；重复冲突应优先蒸馏为 typed MEMORY.md。" };
  if (type === "global_memory_cross_group_arbitration") return { priority: 59, action: "read_for_cross_group_global_memory_suppression", readMode: "directory_index_then_targeted_json_ledgers", reason: "排查同一全局记忆是否已在其他群聊被降权/冲突；只能作为谨慎背景，不能覆盖当前群聊证据。" };
  if (type === "replay_repair_work_items") return { priority: 80, action: "read_for_replay_repair_work", readMode: "targeted_json_work_items", reason: "需要处理压缩恢复缺口或待办时读取。" };
  return { priority: 85, action: "read_if_current_task_requires", readMode: reference.kind === "directory" ? "directory_index_only" : "targeted_file_read", reason: "按当前任务相关性决定是否读取；读取后必须在回执声明。" };
}

export function buildGroupCompactFileReferenceReadPlan(groupId: string, references: any = {}, options: any = {}) {
  const refs = Array.isArray(references?.references) ? references.references : [];
  const maxEntries = Math.max(1, Math.min(20, Number(options.maxEntries || options.max_entries || 10)));
  const entries = refs.map((reference: any) => {
    const plan = compactFileReferenceReadPlanPriority(reference);
    const bytes = Number(reference.bytes || 0);
    const maxBytesToInspect = reference.kind === "directory"
      ? 0
      : Math.min(bytes || Number(options.defaultMaxBytes || 128 * 1024), Number(options.maxBytesPerReference || options.max_bytes_per_reference || 256 * 1024));
    return {
      schema: "ccm-compact-file-reference-read-plan-entry-v1",
      read_plan_id: `cfr-read:${crypto.createHash("sha256").update(JSON.stringify([groupId, reference.reference_id || "", reference.path || "", plan.action])).digest("hex").slice(0, 12)}`,
      reference_id: reference.reference_id || "",
      type: reference.type || "",
      kind: reference.kind || "",
      path: reference.path || "",
      displayPath: reference.displayPath || normalizeCompactFileReferencePath(reference.path || ""),
      exists: reference.exists === true,
      sourceChecksum: reference.sourceChecksum || reference.checksum || "",
      sourceChecksumMode: reference.sourceChecksumMode || reference.checksumMode || "",
      sourceMtimeMs: Number(reference.sourceMtimeMs || reference.mtimeMs || 0),
      sourceMtime: reference.sourceMtime || reference.mtime || "",
      sourceBytes: Number(reference.sourceBytes || reference.bytes || 0),
      priority: plan.priority,
      action: plan.action,
      readMode: plan.readMode,
      maxBytesToInspect,
      tokenBudgetHint: maxBytesToInspect ? Math.ceil(maxBytesToInspect / 4) : 0,
      reason: plan.reason,
      receipt: "读取或决定不读取后，在 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 中引用 read_plan_id、reference_id 或路径。",
    };
  }).sort((a: any, b: any) => Number(a.priority || 0) - Number(b.priority || 0) || String(a.type || "").localeCompare(String(b.type || "")));
  const planned = entries.filter((entry: any) => entry.action !== "skip_missing").slice(0, maxEntries);
  const missing = entries.filter((entry: any) => entry.action === "skip_missing");
  const sourceOfTruth = planned.filter((entry: any) => ["raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")));
  const compactSummaries = planned.filter((entry: any) => ["group_session_memory", "typed_memory_index", "tool_continuity_summary"].includes(String(entry.type || "")));
  return {
    schema: "ccm-group-compact-file-reference-read-plan-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    generatedAt: String(options.generatedAt || options.generated_at || new Date().toISOString()),
    sourceReferenceCount: refs.length,
    plannedCount: planned.length,
    missingCount: missing.length,
    maxEntries,
    hasSourceOfTruth: sourceOfTruth.length > 0,
    hasCompactSummary: compactSummaries.length > 0,
    entries: [...planned, ...missing.slice(0, Math.max(0, maxEntries - planned.length))],
    policy: {
      mode: "read_on_demand_after_compact",
      sourceOfTruth: "raw_group_messages_json",
      doNotReadAll: true,
      preferOrder: ["group_session_memory", "raw_group_messages_json", "typed_memory_index", "group_memory_json"],
      receiptFields: ["memoryUsed", "memoryIgnored"],
      note: "这是压缩后文件引用读取计划：先按任务相关性选择读取，避免盲目全量读目录或大 JSON；读取或忽略都要回执声明。",
    },
  };
}

export function readGroupCompactFileReferenceLedger(groupId: string) {
  const file = getGroupCompactFileReferenceLedgerFile(groupId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
    };
  } catch {
    return {
      schema: "ccm-group-compact-file-reference-ledger-v1",
      version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
      groupId,
      file,
      entries: [],
      stats: {},
      updatedAt: "",
    };
  }
}

export function writeGroupCompactFileReferenceLedger(groupId: string, ledger: any) {
  const file = getGroupCompactFileReferenceLedgerFile(groupId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-compact-file-reference-ledger-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    entries: (ledger.entries || []).slice(-180),
    stats: ledger.stats || {},
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
  return { ...ledger, file };
}

export function compactFileReferenceTextForDetection(reference: any = {}) {
  return [
    reference.reference_id,
    reference.path,
    reference.displayPath,
    path.basename(String(reference.path || "")),
  ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}

export function compactFileReferenceMentioned(text: string, reference: any = {}) {
  const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
  if (!lower) return false;
  return compactFileReferenceTextForDetection(reference).some(token => token && lower.includes(token));
}

export function recordGroupCompactFileReferenceSurfacing(groupId: string, references: any = {}, options: any = {}) {
  if (!references?.schema || !Array.isArray(references.references) || !references.references.length) return null;
  const ledger = readGroupCompactFileReferenceLedger(groupId);
  const readPlan = options.readPlan || options.read_plan || {};
  const readPlanEntries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
  const readPlanRevalidationGate = options.readPlanRevalidationGate || options.read_plan_revalidation_gate || null;
  const sessionBinding = options.sessionBinding || options.session_binding || null;
  const fingerprint = compactReferenceFingerprint(references.references);
  const scope = String(options.scope || options.contextKind || options.context_kind || "child_agent");
  const targetProject = String(options.targetProject || options.target_project || "");
  const entryId = `file-ref:${crypto.createHash("sha256").update(JSON.stringify([groupId, scope, targetProject, fingerprint])).digest("hex").slice(0, 14)}`;
  const entry = {
    entry_id: entryId,
    generated_at: String(options.generatedAt || options.generated_at || new Date().toISOString()),
    scope,
    target_project: targetProject,
    task_id: String(options.taskId || options.task_id || sessionBinding?.task_id || sessionBinding?.taskId || ""),
    trace_id: String(options.traceId || options.trace_id || sessionBinding?.trace_id || sessionBinding?.traceId || ""),
    task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
    native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
    session_binding: sessionBinding?.schema ? sessionBinding : null,
    task_query_hash: hashSessionMemoryText(options.task || options.task_query || "", 12),
    reference_count: references.referenceCount || references.references.length,
    missing_count: references.missingCount || 0,
    read_plan_count: readPlanEntries.length,
    reference_fingerprint: fingerprint,
    references: references.references.slice(0, 40).map((item: any) => ({
      reference_id: item.reference_id,
      type: item.type,
      kind: item.kind,
      path: item.path,
      checksum: item.checksum || "",
      exists: item.exists === true,
    })),
    read_plan_entries: readPlanEntries.slice(0, 40).map((item: any) => ({
      read_plan_id: item.read_plan_id,
      reference_id: item.reference_id,
      type: item.type,
      action: item.action,
      priority: item.priority,
      path: item.path,
      exists: item.exists === true,
      sourceChecksum: item.sourceChecksum || "",
      sourceChecksumMode: item.sourceChecksumMode || "",
      sourceMtimeMs: Number(item.sourceMtimeMs || 0),
      sourceBytes: Number(item.sourceBytes || 0),
    })),
    read_plan_revalidation_gate: readPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
      ? {
        schema: readPlanRevalidationGate.schema,
        version: readPlanRevalidationGate.version,
        revalidation_gate_id: readPlanRevalidationGate.revalidation_gate_id || "",
        group_id: readPlanRevalidationGate.group_id || groupId,
        target_project: readPlanRevalidationGate.target_project || targetProject,
        scope: readPlanRevalidationGate.scope || scope,
        generated_at: readPlanRevalidationGate.generated_at || String(options.generatedAt || options.generated_at || new Date().toISOString()),
        status: readPlanRevalidationGate.status || "",
        action: readPlanRevalidationGate.action || "",
        required_count: Number(readPlanRevalidationGate.required_count || 0),
        verification_count: Number(readPlanRevalidationGate.verification_count || 0),
        checked_count: Number(readPlanRevalidationGate.checked_count || 0),
        required_read_plan_ids: (readPlanRevalidationGate.required_read_plan_ids || []).slice(0, 20),
        verification_read_plan_ids: (readPlanRevalidationGate.verification_read_plan_ids || []).slice(0, 12),
        required_entries: (readPlanRevalidationGate.required_entries || []).slice(0, 20),
        verification_entries: (readPlanRevalidationGate.verification_entries || []).slice(0, 12),
        receipt_contract: readPlanRevalidationGate.receipt_contract || {},
        session_binding: readPlanRevalidationGate.session_binding || sessionBinding || null,
      }
      : null,
  };
  const entries = uniqueByKey([...(ledger.entries || []), entry], (item: any) => item.entry_id || `${item.scope}|${item.target_project}|${item.reference_fingerprint}`, 180);
  const stats = {
    entryCount: entries.length,
    latestReferenceCount: entry.reference_count,
    latestMissingCount: entry.missing_count,
    latestReadPlanCount: entry.read_plan_count,
    targetProjects: uniqueByKey(entries.map((item: any) => ({ target_project: item.target_project || "" })), (item: any) => item.target_project, 40).map((item: any) => item.target_project).filter(Boolean),
  };
  return writeGroupCompactFileReferenceLedger(groupId, { ...ledger, entries, stats, updatedAt: entry.generated_at });
}

export function summarizeGroupCompactFileReferenceAccess(groupId: string, references: any = {}, memory: any = {}) {
  const refs = Array.isArray(references?.references) ? references.references : [];
  const ledger = readGroupCompactFileReferenceLedger(groupId);
  const evidenceSources: any[] = [];
  for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
    evidenceSources.push({
      source: "worker_ledger",
      target_project: item.project || item.agent || "",
      task_id: item.taskId || item.task_id || "",
      text: [
        item.summary,
        ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
        ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
      ].filter(Boolean).join("\n"),
    });
  }
  for (const message of getGroupMessages(groupId, String(memory?.groupSessionId || "")).slice(-160)) {
    evidenceSources.push({
      source: "group_message",
      target_project: message.agent || message.target || "",
      task_id: message.task_id || message.taskId || "",
      message_id: message.id || message.uuid || "",
      text: [
        message.content,
        JSON.stringify(message.receipt || {}),
        JSON.stringify(message.delivery_summary || {}),
      ].filter(Boolean).join("\n"),
    });
  }
  const rows = refs.map((reference: any) => {
    const matches = evidenceSources.filter(source => compactFileReferenceMentioned(source.text, reference)).slice(-8);
    return {
      reference_id: reference.reference_id,
      type: reference.type,
      path: reference.path,
      exists: reference.exists === true,
      mentioned: matches.length > 0,
      mention_count: matches.length,
      latest: matches[matches.length - 1] || null,
    };
  });
  const mentioned = rows.filter(row => row.mentioned);
  return {
    schema: "ccm-group-compact-file-reference-access-summary-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    ledger_file: ledger.file,
    ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
    reference_count: refs.length,
    mentioned_count: mentioned.length,
    missing_count: rows.filter(row => row.exists === false).length,
    mention_rate: refs.length ? Math.round((mentioned.length / refs.length) * 1000) / 10 : null,
    rows,
    recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse(),
  };
}

export function compactFileReferenceReadPlanMentionTokens(entry: any = {}) {
  return [
    entry.read_plan_id,
    entry.reference_id,
    entry.path,
    entry.displayPath,
    path.basename(String(entry.path || "")),
  ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}

export function compactFileReferenceReadPlanMentioned(text: string, entry: any = {}) {
  const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
  if (!lower) return { mentioned: false, readPlanIdMentioned: false, referenceMentioned: false };
  const readPlanId = String(entry.read_plan_id || "").toLowerCase();
  const readPlanIdMentioned = !!readPlanId && lower.includes(readPlanId);
  const referenceMentioned = compactFileReferenceReadPlanMentionTokens(entry)
    .filter(token => token !== readPlanId)
    .some(token => token && lower.includes(token));
  return { mentioned: readPlanIdMentioned || referenceMentioned, readPlanIdMentioned, referenceMentioned };
}

export function summarizeGroupCompactFileReferenceReadPlanAccess(groupId: string, readPlan: any = {}, memory: any = {}) {
  const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
  const ledger = readGroupCompactFileReferenceLedger(groupId);
  const evidenceSources: any[] = [];
  for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
    evidenceSources.push({
      source: "worker_ledger",
      target_project: item.project || item.agent || "",
      task_id: item.taskId || item.task_id || "",
      text: [
        item.summary,
        ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
        ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
      ].filter(Boolean).join("\n"),
    });
  }
  for (const message of getGroupMessages(groupId, String(memory?.groupSessionId || "")).slice(-160)) {
    evidenceSources.push({
      source: "group_message",
      target_project: message.agent || message.target || "",
      task_id: message.task_id || message.taskId || "",
      message_id: message.id || message.uuid || "",
      text: [
        message.content,
        JSON.stringify(message.receipt || {}),
        JSON.stringify(message.delivery_summary || {}),
      ].filter(Boolean).join("\n"),
    });
  }
  const rows = entries.map((entry: any) => {
    const matches = evidenceSources.map(source => {
      const match = compactFileReferenceReadPlanMentioned(source.text, entry);
      return match.mentioned ? { ...source, read_plan_id_mentioned: match.readPlanIdMentioned, reference_mentioned: match.referenceMentioned } : null;
    }).filter(Boolean).slice(-8);
    return {
      read_plan_id: entry.read_plan_id,
      reference_id: entry.reference_id,
      type: entry.type,
      action: entry.action,
      priority: Number(entry.priority || 0),
      path: entry.path,
      exists: entry.exists === true,
      mentioned: matches.length > 0,
      read_plan_id_mentioned: matches.some((match: any) => match.read_plan_id_mentioned === true),
      reference_mentioned: matches.some((match: any) => match.reference_mentioned === true),
      mention_count: matches.length,
      latest: matches[matches.length - 1] || null,
    };
  });
  const mentioned = rows.filter(row => row.mentioned);
  const readPlanIdMentioned = rows.filter(row => row.read_plan_id_mentioned);
  return {
    schema: "ccm-group-compact-file-reference-read-plan-access-summary-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    ledger_file: ledger.file,
    ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
    read_plan_entry_count: entries.length,
    mentioned_count: mentioned.length,
    read_plan_id_mentioned_count: readPlanIdMentioned.length,
    reference_mentioned_count: rows.filter(row => row.reference_mentioned).length,
    mention_rate: entries.length ? Math.round((mentioned.length / entries.length) * 1000) / 10 : null,
    read_plan_id_mention_rate: entries.length ? Math.round((readPlanIdMentioned.length / entries.length) * 1000) / 10 : null,
    rows,
    recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse().map((entry: any) => ({
      entry_id: entry.entry_id || "",
      generated_at: entry.generated_at || "",
      scope: entry.scope || "",
      target_project: entry.target_project || "",
      read_plan_count: Number(entry.read_plan_count || (entry.read_plan_entries || []).length || 0),
    })),
  };
}

export function summarizeGroupCompactFileReferenceReadPlanFreshness(groupId: string, readPlan: any = {}) {
  const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
  const rows = entries.map((entry: any) => {
    const current = buildGroupMemorySourceEntry(
      `read_plan:${entry.read_plan_id || entry.reference_id || entry.type || "source"}`,
      entry.path || "",
      entry.type || "compact_read_plan_source"
    );
    const expectedChecksum = String(entry.sourceChecksum || entry.checksum || "");
    const expectedMtimeMs = Number(entry.sourceMtimeMs || entry.mtimeMs || 0);
    const expectedBytes = Number(entry.sourceBytes || entry.bytes || 0);
    const planned = entry.action !== "skip_missing";
    const existsChanged = entry.exists === true && current.exists !== true;
    const checksumChanged = !!expectedChecksum && !!current.checksum && expectedChecksum !== current.checksum;
    const bytesChanged = expectedBytes > 0 && Number(current.bytes || 0) !== expectedBytes;
    const mtimeChanged = expectedMtimeMs > 0 && Number(current.mtimeMs || 0) !== expectedMtimeMs;
    const unverifiable = planned && current.exists === true && !expectedChecksum && !expectedMtimeMs && !expectedBytes;
    const changed = planned && (existsChanged || checksumChanged || bytesChanged || (!checksumChanged && mtimeChanged));
    const freshnessStatus = !planned && current.exists !== true
      ? "missing_expected"
      : current.exists !== true ? "missing"
      : changed ? "changed"
      : unverifiable ? "unverifiable"
      : "fresh";
    return {
      read_plan_id: entry.read_plan_id || "",
      reference_id: entry.reference_id || "",
      type: entry.type || "",
      action: entry.action || "",
      priority: Number(entry.priority || 0),
      path: entry.path || "",
      exists: current.exists === true,
      planned,
      freshness_status: freshnessStatus,
      fresh: freshnessStatus === "fresh" || freshnessStatus === "missing_expected",
      changed,
      unverifiable,
      expected: {
        checksum: expectedChecksum,
        checksumMode: entry.sourceChecksumMode || entry.checksumMode || "",
        mtimeMs: expectedMtimeMs,
        bytes: expectedBytes,
      },
      current: {
        checksum: current.checksum || "",
        checksumMode: current.checksumMode || "",
        mtimeMs: Number(current.mtimeMs || 0),
        bytes: Number(current.bytes || 0),
        status: current.status || "",
      },
      changes: [
        existsChanged ? "exists" : "",
        checksumChanged ? "checksum" : "",
        bytesChanged ? "bytes" : "",
        mtimeChanged ? "mtimeMs" : "",
      ].filter(Boolean),
      reason: changed
        ? "read plan source changed after surfacing; re-read and verify current source before using this memory"
        : unverifiable ? "read plan source lacks stable fingerprint; verify current source before using"
        : "read plan source is fresh",
    };
  });
  const checkedRows = rows.filter((row: any) => row.planned);
  const changedRows = checkedRows.filter((row: any) => row.changed || row.freshness_status === "missing");
  const unverifiableRows = checkedRows.filter((row: any) => row.unverifiable);
  const freshRows = checkedRows.filter((row: any) => row.freshness_status === "fresh");
  const freshnessRate = checkedRows.length ? Math.round((freshRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = checkedRows.length === 0
    ? "empty"
    : changedRows.length > 0 ? "fail"
    : unverifiableRows.length > 0 ? "warn"
    : "ok";
  return {
    schema: "ccm-group-compact-file-reference-read-plan-freshness-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
    groupId,
    generatedAt: new Date().toISOString(),
    status,
    checked: checkedRows.length,
    freshCount: freshRows.length,
    changedCount: changedRows.length,
    unverifiableCount: unverifiableRows.length,
    freshnessRate,
    rows: rows.slice(0, 40),
    staleRows: changedRows.slice(0, 12),
    gaps: [
      ...changedRows.slice(0, 8).map((row: any) => ({
        read_plan_id: row.read_plan_id,
        reference_id: row.reference_id,
        type: row.type,
        path: row.path,
        reason: row.reason,
        changes: row.changes,
      })),
      ...unverifiableRows.slice(0, 4).map((row: any) => ({
        read_plan_id: row.read_plan_id,
        reference_id: row.reference_id,
        type: row.type,
        path: row.path,
        reason: row.reason,
        changes: ["fingerprint_missing"],
      })),
    ].slice(0, 12),
  };
}

export function latestGroupCompactFileReferenceReadPlanRows(groupId: string, fallbackReadPlan: any = {}, options: any = {}) {
  const ledger = readGroupCompactFileReferenceLedger(groupId);
  const maxLedgerEntries = Math.max(1, Math.min(20, Number(options.maxLedgerEntries || options.max_ledger_entries || 8)));
  const fromLedger = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-maxLedgerEntries).flatMap((entry: any) => (
    Array.isArray(entry.read_plan_entries) ? entry.read_plan_entries : []
  ).map((row: any) => ({
    ...row,
    surfaced_at: entry.generated_at || "",
    surfacing_scope: entry.scope || "",
    target_project: entry.target_project || "",
    surfacing_entry_id: entry.entry_id || "",
  })));
  const rowsSource = fromLedger.length ? fromLedger : (Array.isArray(fallbackReadPlan?.entries) ? fallbackReadPlan.entries : []);
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const row of [...rowsSource].reverse()) {
    const id = String(row.read_plan_id || row.readPlanId || "").trim();
    const referenceId = String(row.reference_id || row.referenceId || "").trim();
    const refPath = String(row.path || "").trim();
    const key = id || referenceId || refPath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.unshift({
      read_plan_id: id,
      reference_id: referenceId,
      type: row.type || "",
      action: row.action || "",
      priority: Number(row.priority || 0),
      path: refPath,
      displayPath: row.displayPath || normalizeCompactFileReferencePath(refPath),
      exists: row.exists !== false,
      sourceChecksum: row.sourceChecksum || row.source_checksum || row.checksum || "",
      sourceChecksumMode: row.sourceChecksumMode || row.source_checksum_mode || row.checksumMode || "",
      sourceMtimeMs: Number(row.sourceMtimeMs || row.source_mtime_ms || row.mtimeMs || 0),
      sourceBytes: Number(row.sourceBytes || row.source_bytes || row.bytes || 0),
      surfaced_at: row.surfaced_at || row.generated_at || "",
      surfacing_scope: row.surfacing_scope || row.scope || "",
      target_project: row.target_project || "",
      surfacing_entry_id: row.surfacing_entry_id || row.entry_id || "",
    });
  }
  return {
    schema: "ccm-group-compact-file-reference-read-plan-latest-rows-v1",
    groupId,
    ledgerFile: ledger.file,
    ledgerEntryCount: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
    rows: rows.slice(0, Math.max(1, Math.min(80, Number(options.maxRows || options.max_rows || 60)))),
  };
}

export function latestGroupCompactFileReferenceReadPlanRevalidationGate(groupId: string) {
  const ledger = readGroupCompactFileReferenceLedger(groupId);
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  for (const entry of [...entries].reverse()) {
    const gate = entry.read_plan_revalidation_gate || entry.readPlanRevalidationGate;
    if (gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") {
      return {
        ...gate,
        ledger_file: ledger.file,
        surfacing_entry_id: entry.entry_id || "",
        surfaced_at: entry.generated_at || "",
        surfacing_scope: entry.scope || "",
        target_project: entry.target_project || gate.target_project || "",
      };
    }
  }
  return null;
}

export function compactReadPlanRevalidationGateRow(row: any = {}, action: string) {
  return {
    read_plan_id: row.read_plan_id || "",
    reference_id: row.reference_id || "",
    type: row.type || "",
    action: row.action || "",
    revalidation_action: action,
    priority: Number(row.priority || 0),
    path: row.path || "",
    displayPath: row.displayPath || normalizeCompactFileReferencePath(row.path || ""),
    freshness_status: row.freshness_status || "",
    changes: Array.isArray(row.changes) ? row.changes : [],
    expected: row.expected || {},
    current: row.current || {},
    reason: row.reason || "",
  };
}

export function buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId: string, freshness: any = {}, options: any = {}) {
  const rows = Array.isArray(freshness?.rows) ? freshness.rows : [];
  const sessionBinding = options.sessionBinding || options.session_binding || null;
  const requiredRows = rows
    .filter((row: any) => row?.planned !== false && (row.changed === true || row.freshness_status === "missing"))
    .map((row: any) => compactReadPlanRevalidationGateRow(row, "must_re_read_current_source_before_use"));
  const verificationRows = rows
    .filter((row: any) => row?.planned !== false && row.unverifiable === true)
    .map((row: any) => compactReadPlanRevalidationGateRow(row, "verify_current_source_before_use"));
  const targetProject = String(options.targetProject || options.target_project || "");
  const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
  const gateId = `cfr-rvg:${crypto.createHash("sha256").update(JSON.stringify([
    groupId,
    targetProject,
    requiredRows.map((row: any) => [row.read_plan_id, row.freshness_status, row.changes, row.current?.checksum || row.current?.mtimeMs || ""]),
    verificationRows.map((row: any) => [row.read_plan_id, row.freshness_status]),
    sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || "",
    sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || "",
  ])).digest("hex").slice(0, 14)}`;
  const status = requiredRows.length
    ? "required"
    : verificationRows.length ? "verify_recommended"
    : rows.length ? "not_required" : "empty";
  const action = requiredRows.length
    ? "re_read_changed_sources_before_using_compact_memory"
    : verificationRows.length ? "verify_unfingerprinted_sources_before_using_compact_memory"
    : "none";
  const gate = {
    schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1",
    version: GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION,
    revalidation_gate_id: gateId,
    group_id: groupId,
    target_project: targetProject,
    scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child")),
    generated_at: generatedAt,
    task_id: String(sessionBinding?.task_id || sessionBinding?.taskId || options.taskId || options.task_id || ""),
    trace_id: String(sessionBinding?.trace_id || sessionBinding?.traceId || options.traceId || options.trace_id || ""),
    task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
    native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
    session_binding: sessionBinding?.schema ? sessionBinding : null,
    status,
    action,
    required_count: requiredRows.length,
    verification_count: verificationRows.length,
    checked_count: Number(freshness.checked || rows.filter((row: any) => row?.planned !== false).length || 0),
    freshness_status: freshness.status || "unknown",
    freshness_rate: freshness.freshnessRate ?? null,
    changed_count: Number(freshness.changedCount || requiredRows.length || 0),
    unverifiable_count: Number(freshness.unverifiableCount || verificationRows.length || 0),
    required_read_plan_ids: requiredRows.map((row: any) => row.read_plan_id).filter(Boolean),
    verification_read_plan_ids: verificationRows.map((row: any) => row.read_plan_id).filter(Boolean),
    required_entries: requiredRows.slice(0, 20),
    verification_entries: verificationRows.slice(0, 12),
    receipt_contract: {
      required_receipt_fields: ["memoryUsed", "memoryIgnored"],
      required_reference: gateId,
      required_read_plan_ids: requiredRows.map((row: any) => row.read_plan_id).filter(Boolean).slice(0, 20),
      required_task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
      required_native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
      memory_used_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
      memory_ignored_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
      receipt_should_match_session: !!(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || sessionBinding?.native_session_id || sessionBinding?.nativeSessionId),
      require_current_source_verification: requiredRows.length > 0,
      required_receipt_signal: "read_plan_id plus re-read/current source verified, or memoryIgnored explaining the read_plan_id was not used",
      note: "changed read plan entries must be re-read from the current source before applying compact memory; the receipt must mention the read_plan_id and gate id.",
    },
    prompt_patch: requiredRows.length
      ? [
        "Compact read plan revalidation required:",
        sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}; receipt must stay tied to this task Agent session.` : "",
        ...requiredRows.slice(0, 8).map((row: any) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; changes=${(row.changes || []).join(",") || row.freshness_status}; re-read current source before using compact memory.`),
        `Receipt: mention gate ${gateId}, each read_plan_id, and "current source verified" in memoryUsed; if not used, mention the read_plan_id in memoryIgnored with the reason.`,
      ].join("\n")
      : verificationRows.length
        ? [
          "Compact read plan verification recommended:",
          sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}.` : "",
          ...verificationRows.slice(0, 6).map((row: any) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; fingerprint missing; verify current source before using.`),
          `Receipt: mention gate ${gateId} and the read_plan_id in memoryUsed/memoryIgnored.`,
        ].join("\n")
        : "",
  };
  return {
    ...gate,
    context_budget: buildContextBudget({ context: gate, maxChars: 9000, maxTokens: 24_000 }),
  };
}

export function buildGroupMemorySourceManifest(groupId: string, input: any = {}) {
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
  const typedSync = input.typedMemorySync || input.typed_memory_sync || {};
  const typedIndex = typedSync.index || typedSync || {};
  const typedDocs = Array.isArray(input.typedDocs || input.typed_docs)
    ? (input.typedDocs || input.typed_docs)
    : Array.isArray(typedIndex.docs) ? typedIndex.docs : [];
  const baseEntries = [
    buildGroupMemorySourceEntry("group_memory", getGroupMemoryFile(groupId, groupSessionId), "group_memory_json"),
    buildGroupMemorySourceEntry("group_messages", getGroupMessagesFileHint(groupId, groupSessionId), "raw_group_messages_json"),
    buildGroupMemorySourceEntry("typed_memory_dir", typedIndex.dir || getGroupTypedMemoryDir(typedMemoryScopeId), "typed_memory_directory"),
    buildGroupMemorySourceEntry("typed_memory_index", typedIndex.file || path.join(getGroupTypedMemoryDir(typedMemoryScopeId), "MEMORY.md"), "typed_memory_entrypoint"),
  ];
  if (input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile) {
    baseEntries.push(buildGroupMemorySourceEntry(
      "typed_memory_distillation_ledger",
      input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile,
      "typed_memory_distillation_ledger"
    ));
  }
  if (input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file) {
    baseEntries.push(buildGroupMemorySourceEntry(
      "typed_memory_recall_ledger",
      input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file,
      "typed_memory_recall_ledger"
    ));
  }
  if (input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file) {
    baseEntries.push(buildGroupMemorySourceEntry(
      "global_agent_memory",
      input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file,
      "global_agent_memory_json"
    ));
  }
  if (input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || (input.globalMemoryArbitrationLedger?.file && Number(input.globalMemoryArbitrationLedger?.entryCount || 0) > 0)) {
    baseEntries.push(buildGroupMemorySourceEntry(
      "global_memory_arbitration_ledger",
      input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || input.globalMemoryArbitrationLedger?.file,
      "global_memory_arbitration_ledger"
    ));
  }
  const crossGroupSuppression = input.globalAgentMemoryRecall?.crossGroupSuppression || input.global_agent_memory_recall?.crossGroupSuppression || {};
  if (input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || (crossGroupSuppression.sourceDir && (Number(crossGroupSuppression.suppressedCount || 0) > 0 || Number(crossGroupSuppression.advisoryCount || 0) > 0))) {
    baseEntries.push(buildGroupMemorySourceEntry(
      "global_memory_cross_group_arbitration",
      input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || crossGroupSuppression.sourceDir,
      "global_memory_cross_group_arbitration_ledgers"
    ));
  }
  const docEntries = typedDocs.slice(0, 80).map((doc: any) => buildGroupMemorySourceEntry(
    `typed_doc:${doc.relPath || path.basename(String(doc.file || ""))}`,
    doc.file,
    "typed_memory_doc",
    {
      relPath: doc.relPath || path.basename(String(doc.file || "")),
      memoryType: doc.type || "",
      source: doc.source || "",
      docChecksum: doc.checksum || "",
    }
  ));
  const entries = [...baseEntries, ...docEntries];
  const requiredIds = new Set(["group_memory", "group_messages", "typed_memory_index"]);
  const missingRequired = entries.filter(entry => requiredIds.has(entry.id) && entry.exists !== true).map(entry => entry.id);
  const generatedAtMs = Date.parse(generatedAt);
  const changedAfterManifest = Number.isFinite(generatedAtMs)
    ? entries.filter(entry => entry.exists && entry.mtimeMs > generatedAtMs + 5000).map(entry => entry.id)
    : [];
  const latestMtimeMs = entries.reduce((max, entry) => Math.max(max, Number(entry.mtimeMs || 0)), 0);
  const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(entries.map(entry => ({
    id: entry.id,
    path: entry.path,
    exists: entry.exists,
    bytes: entry.bytes,
    mtimeMs: entry.mtimeMs,
    checksum: entry.checksum,
  })))).digest("hex").slice(0, 24);
  const status = missingRequired.length ? "missing_required_source" : changedAfterManifest.length ? "changed_after_context_build" : "pass";
  return {
    schema: "ccm-group-memory-source-manifest-v1",
    version: GROUP_MEMORY_SOURCE_MANIFEST_VERSION,
    groupId,
    groupSessionId,
    generatedAt,
    status,
    pass: status === "pass",
    sourceOrder: [
      "group_memory_json",
      "raw_group_messages_json",
      "typed_MEMORY.md_entrypoint",
      "typed_memory_docs",
      "global_agent_memory_json",
      "global_memory_arbitration_ledger",
      "global_memory_cross_group_arbitration_ledgers",
      "recall_and_distillation_ledgers",
    ],
    entryCount: entries.length,
    typedDocCount: typedDocs.length,
    includedTypedDocCount: docEntries.length,
    requiredIds: [...requiredIds],
    missingRequired,
    changedAfterManifest,
    latestMtimeMs,
    latestMtime: latestMtimeMs ? new Date(latestMtimeMs).toISOString() : "",
    manifestChecksum,
    entries,
  };
}

export function readGroupPostCompactCandidateUsageLedger(groupId: string, sessionId = "") {
  const file = getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  } catch {
    return {
      schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
      version: GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
      groupId,
      groupSessionId: String(sessionId || "default"),
      file,
      stats: {},
      entries: [],
      totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
      updatedAt: "",
    };
  }
}

export function writeGroupPostCompactCandidateUsageLedger(groupId: string, ledger: any, sessionId = "") {
  const file = getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-240);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
    version: GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
    groupId,
    groupSessionId: String(sessionId || "default"),
    stats: ledger.stats || {},
    entries,
    totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function readGroupApiMicrocompactNativeApplyProofLedger(groupId: string, sessionId = "") {
  const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  } catch {
    return {
      schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
      version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
      groupId,
      groupSessionId: String(sessionId || "default"),
      file,
      stats: {},
      entries: [],
      totals: { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
      updatedAt: "",
    };
  }
}

export function writeGroupApiMicrocompactNativeApplyProofLedger(groupId: string, ledger: any, sessionId = "") {
  const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
    version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
    groupId,
    groupSessionId: String(sessionId || "default"),
    stats: ledger.stats || {},
    entries,
    totals: ledger.totals || { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId: string, sessionId = "") {
  const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  } catch {
    return {
      schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
      version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
      groupId,
      groupSessionId: String(sessionId || "default"),
      file,
      stats: {},
      entries: [],
      totals: { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
      updatedAt: "",
    };
  }
}

export function writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId: string, ledger: any, sessionId = "") {
  const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
    version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
    groupId,
    groupSessionId: String(sessionId || "default"),
    stats: ledger.stats || {},
    entries,
    totals: ledger.totals || { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function postCompactCandidateStatsKey(row: any = {}, targetProject = "") {
  const candidateId = String(row.candidate_id || row.candidateId || "").trim();
  const value = compactMemoryText(row.value || "", 220);
  return [
    String(targetProject || row.target_project || row.targetProject || "").trim().toLowerCase(),
    candidateId || crypto.createHash("sha256").update(value).digest("hex").slice(0, 18),
  ].join("|");
}

export function buildPostCompactCandidateEntry(groupId: string, input: any = {}, row: any = {}) {
  const usageState = normalizePostCompactUsageState(row.usage_state || row.usageState);
  if (!usageState) return null;
  const candidateId = String(row.candidate_id || row.candidateId || "").trim();
  const value = compactMemoryText(row.value || "", 260);
  if (!candidateId && !value) return null;
  const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
  const agent = String(row.agent || input.agent || input.project || "").trim();
  const gateId = String(row.gate_id || row.gateId || input.gateId || input.gate_id || "").trim();
  const taskId = String(input.taskId || input.task_id || "").trim();
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const entryCore = {
    group_id: groupId,
    group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
    target_project: targetProject,
    agent,
    task_id: taskId,
    execution_id: String(input.executionId || input.execution_id || ""),
    gate_id: gateId,
    candidate_id: candidateId,
    kind: String(row.kind || ""),
    value,
    sourceMessageId: String(row.sourceMessageId || row.source_message_id || ""),
    usage_state: usageState,
    direct_reference: row.direct_reference === true || row.directReference === true,
    referenced: row.referenced === true,
    receipt_status: String(input.receiptStatus || input.receipt_status || ""),
    generated_at: generatedAt,
  };
  return {
    schema: "ccm-group-post-compact-candidate-usage-entry-v1",
    entry_id: `pccu_${crypto.createHash("sha256").update(JSON.stringify(entryCore)).digest("hex").slice(0, 18)}`,
    ...entryCore,
  };
}

// ===== merged from group-compact-file-references-part-02.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function recordGroupPostCompactCandidateUsageLedger(groupId: string, input: any = {}) {
  groupId = String(groupId || "").trim();
  if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true) return null;
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const rows = Array.isArray(input.rows)
    ? input.rows
    : Array.isArray(input.receiptRows || input.receipt_rows)
      ? (input.receiptRows || input.receipt_rows).flatMap((receiptRow: any) => {
        const gate = receiptRow.post_compact_reinjection_gate || receiptRow.postCompactReinjectionGate || {};
        const usageRows = Array.isArray(gate.candidate_usage_rows || gate.candidateUsageRows) ? (gate.candidate_usage_rows || gate.candidateUsageRows) : [];
        return usageRows.map((usageRow: any) => ({
          ...usageRow,
          agent: receiptRow.agent || receiptRow.project || usageRow.agent || "",
          target_project: gate.target_project || receiptRow.project || input.targetProject || input.target_project || "",
          gate_id: usageRow.gate_id || gate.gate_id || gate.gateId || (Array.isArray(gate.gate_ids) ? gate.gate_ids[0] : ""),
          receipt_status: receiptRow.status || receiptRow.receipt_status || "",
        }));
      })
      : [];
  const entries = rows
    .filter((row: any) => row && row.usage_state !== "unreferenced" && (row.referenced === true || ["used", "ignored", "verified", "mentioned"].includes(normalizePostCompactUsageState(row.usage_state || row.usageState))))
    .map((row: any) => buildPostCompactCandidateEntry(groupId, input, row))
    .filter(Boolean);
  const file = getGroupPostCompactCandidateUsageLedgerFile(groupId, groupSessionId);
  if (!entries.length) {
    const ledger = readGroupPostCompactCandidateUsageLedger(groupId, groupSessionId);
    return {
      schema: "ccm-group-post-compact-candidate-usage-record-v1",
      groupId,
      groupSessionId,
      file,
      skipped: true,
      reason: "no_candidate_usage_rows",
      recorded_count: 0,
      totals: ledger.totals || {},
    };
  }
  const ledger = readGroupPostCompactCandidateUsageLedger(groupId, groupSessionId);
  const seen = new Set((ledger.entries || []).map((entry: any) => entry.entry_id));
  const newEntries = entries.filter((entry: any) => !seen.has(entry.entry_id));
  const stats = ledger.stats || {};
  for (const entry of newEntries) {
    const key = postCompactCandidateStatsKey(entry, entry.target_project);
    const current = stats[key] || {
      candidate_id: entry.candidate_id,
      kind: entry.kind,
      value: entry.value,
      sourceMessageId: entry.sourceMessageId,
      target_project: entry.target_project,
      used_count: 0,
      ignored_count: 0,
      verified_count: 0,
      mentioned_count: 0,
      total_count: 0,
      agents: [],
      task_ids: [],
      gate_ids: [],
      first_seen_at: entry.generated_at,
    };
    current.candidate_id = current.candidate_id || entry.candidate_id;
    current.kind = current.kind || entry.kind;
    current.value = current.value || entry.value;
    current.sourceMessageId = current.sourceMessageId || entry.sourceMessageId;
    current.target_project = current.target_project || entry.target_project;
    current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
    current.total_count = Number(current.total_count || 0) + 1;
    current.last_usage_state = entry.usage_state;
    current.last_agent = entry.agent;
    current.last_task_id = entry.task_id;
    current.last_gate_id = entry.gate_id;
    current.last_seen_at = entry.generated_at;
    current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
    current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
    current.gate_ids = Array.from(new Set([...(Array.isArray(current.gate_ids) ? current.gate_ids : []), entry.gate_id].filter(Boolean))).slice(-12);
    current.recommendation = usageRecommendationForStats(current);
    stats[key] = current;
  }
  const allEntries = [...(ledger.entries || []), ...newEntries].slice(-240);
  const totals = allEntries.reduce((acc: any, entry: any) => {
    const state = normalizePostCompactUsageState(entry.usage_state);
    if (state) acc[state] = Number(acc[state] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
  const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  writeGroupPostCompactCandidateUsageLedger(groupId, {
    stats,
    entries: allEntries,
    totals,
    updatedAt,
  }, groupSessionId);
  return {
    schema: "ccm-group-post-compact-candidate-usage-record-v1",
    groupId,
    groupSessionId,
    file,
    recorded_count: newEntries.length,
    duplicate_count: entries.length - newEntries.length,
    totals,
    updatedAt,
  };
}

export function buildGroupPostCompactCandidateUsageSummary(groupId: string, options: any = {}) {
  groupId = String(groupId || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
  const ledger = readGroupPostCompactCandidateUsageLedger(groupId, groupSessionId);
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const candidates = Array.isArray(options.candidates) ? options.candidates : [];
  const candidateKeys = new Set(candidates.map((candidate: any) => postCompactCandidateStatsKey(candidate, targetProject)).filter(Boolean));
  const candidateIds = new Set(candidates.map((candidate: any) => String(candidate.candidate_id || candidate.candidateId || "").trim().toLowerCase()).filter(Boolean));
  const candidateValues = new Set(candidates.map((candidate: any) => compactMemoryText(candidate.value || "", 260).toLowerCase()).filter(Boolean));
  const statsRows = Object.values(ledger.stats || {})
    .filter((row: any) => !targetProject || String(row.target_project || "").toLowerCase() === targetProject)
    .filter((row: any) => !candidateKeys.size
      || candidateKeys.has(postCompactCandidateStatsKey(row, targetProject))
      || candidateIds.has(String(row.candidate_id || "").trim().toLowerCase())
      || candidateValues.has(compactMemoryText(row.value || "", 260).toLowerCase()))
    .sort((a: any, b: any) => {
      const aScore = Number(a.used_count || 0) * 3 + Number(a.verified_count || 0) * 2 - Number(a.ignored_count || 0);
      const bScore = Number(b.used_count || 0) * 3 + Number(b.verified_count || 0) * 2 - Number(b.ignored_count || 0);
      return bScore - aScore || String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""));
    });
  const totals = statsRows.reduce((acc: any, row: any) => {
    acc.used += Number(row.used_count || 0);
    acc.ignored += Number(row.ignored_count || 0);
    acc.verified += Number(row.verified_count || 0);
    acc.mentioned += Number(row.mentioned_count || 0);
    acc.total += Number(row.total_count || 0);
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
  return {
    schema: "ccm-group-post-compact-candidate-usage-summary-v1",
    version: GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
    groupId,
    groupSessionId,
    target_project: targetProject,
    ledger_file: ledger.file,
    has_history: statsRows.length > 0,
    candidate_count: statsRows.length,
    totals,
    useful_candidates: statsRows.filter((row: any) => ["promote_recall", "neutral_verify_current_context"].includes(row.recommendation)).slice(0, 8),
    ignored_candidates: statsRows.filter((row: any) => row.recommendation === "deprioritize_or_distill").slice(0, 8),
    missing_usage_candidates: statsRows.filter((row: any) => row.recommendation === "require_usage_receipt").slice(0, 8),
    recent_entries: (ledger.entries || [])
      .filter((entry: any) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
      .slice(-16),
    updatedAt: ledger.updatedAt || "",
  };
}

export function normalizeApiMicrocompactNativeApplyProofStatus(row: any = {}) {
  const usageState = String(row.usage_state || row.usageState || "").toLowerCase().trim();
  const nativeApplied = row.native_applied === true || row.nativeApplied === true || usageState === "native_applied";
  if (nativeApplied) {
    const checksumMatched = row.apply_plan_checksum_matched !== false
      && row.request_patch_checksum_matched !== false
      && !!(row.apply_plan_checksum || row.applyPlanChecksum)
      && !!(row.request_patch_checksum || row.requestPatchChecksum);
    const sessionMatched = row.session_matched !== false && row.sessionMismatch !== true && row.session_mismatch !== true;
    const nativeReady = row.native_apply_ready === true || row.nativeApplyReady === true || row.can_apply_natively === true || row.canApplyNatively === true;
    const pass = row.pass === true && row.unsafe_native_applied !== true && row.unsafeNativeApplied !== true;
    return pass && checksumMatched && sessionMatched && nativeReady ? "verified" : "failed";
  }
  if (usageState === "advisory") return "advisory";
  if (usageState === "ignored" || usageState === "not_supported") return "not_supported";
  return "";
}

export function buildApiMicrocompactNativeApplyProofEntry(groupId: string, input: any = {}, receiptRow: any = {}, planRow: any = {}) {
  const proofStatus = normalizeApiMicrocompactNativeApplyProofStatus(planRow);
  if (!proofStatus) return null;
  const agent = String(receiptRow.agent || receiptRow.project || input.agent || input.targetProject || input.target_project || "").trim();
  const targetProject = String(planRow.target_project || planRow.targetProject || receiptRow.target_project || receiptRow.targetProject || input.targetProject || input.target_project || agent || "").trim();
  const taskId = String(input.taskId || input.task_id || receiptRow.taskId || receiptRow.task_id || "").trim();
  const executionId = String(input.executionId || input.execution_id || receiptRow.executionId || receiptRow.execution_id || "").trim();
  const runnerRequestId = String(planRow.runner_request_id || planRow.runnerRequestId || receiptRow.runner_request_id || receiptRow.runnerRequestId || input.runnerRequestId || input.runner_request_id || "").trim();
  const externalRunnerRequestId = String(planRow.external_runner_request_id || planRow.externalRunnerRequestId || receiptRow.external_runner_request_id || receiptRow.externalRunnerRequestId || input.externalRunnerRequestId || input.external_runner_request_id || runnerRequestId || "").trim();
  const generatedAt = String(input.generatedAt || input.generated_at || receiptRow.generatedAt || receiptRow.generated_at || new Date().toISOString());
  const planChecksum = String(planRow.plan_checksum || planRow.planChecksum || "").trim();
  const expectedApplyPlanChecksum = String(planRow.apply_plan_checksum || planRow.applyPlanChecksum || "").trim();
  const expectedRequestPatchChecksum = String(planRow.request_patch_checksum || planRow.requestPatchChecksum || "").trim();
  const receiptApplyPlanChecksum = String(planRow.receipt_apply_plan_checksum || planRow.receiptApplyPlanChecksum || expectedApplyPlanChecksum || "").trim();
  const receiptRequestPatchChecksum = String(planRow.receipt_request_patch_checksum || planRow.receiptRequestPatchChecksum || expectedRequestPatchChecksum || "").trim();
  const expectedTaskAgentSessionId = String(planRow.expected_task_agent_session_id || planRow.expectedTaskAgentSessionId || "").trim();
  const receiptTaskAgentSessionId = String(planRow.receipt_task_agent_session_id || planRow.receiptTaskAgentSessionId || receiptRow.task_agent_session_id || receiptRow.taskAgentSessionId || "").trim();
  const expectedNativeSessionId = String(planRow.expected_native_session_id || planRow.expectedNativeSessionId || "").trim();
  const receiptNativeSessionId = String(planRow.receipt_native_session_id || planRow.receiptNativeSessionId || receiptRow.native_session_id || receiptRow.nativeSessionId || "").trim();
  const expectedSnapshotId = String(planRow.expected_memory_context_snapshot_id || planRow.expectedMemoryContextSnapshotId || "").trim();
  const receiptSnapshotId = String(planRow.receipt_memory_context_snapshot_id || planRow.receiptMemoryContextSnapshotId || receiptRow.memory_context_snapshot_id || receiptRow.memoryContextSnapshotId || "").trim();
  const expectedSnapshotChecksum = String(planRow.expected_memory_context_snapshot_checksum || planRow.expectedMemoryContextSnapshotChecksum || "").trim();
  const receiptSnapshotChecksum = String(planRow.receipt_memory_context_snapshot_checksum || planRow.receiptMemoryContextSnapshotChecksum || receiptRow.memory_context_snapshot_checksum || receiptRow.memoryContextSnapshotChecksum || "").trim();
  const usageState = String(planRow.usage_state || planRow.usageState || "").trim();
  const entryCore = {
    group_id: groupId,
    group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
    target_project: targetProject,
    agent,
    task_id: taskId,
    execution_id: executionId,
    runner_request_id: runnerRequestId || externalRunnerRequestId,
    external_runner_request_id: externalRunnerRequestId || runnerRequestId,
    final_status: String(input.finalStatus || input.final_status || ""),
    receipt_status: String(receiptRow.status || receiptRow.receipt_status || ""),
    plan_checksum: planChecksum,
    apply_plan_checksum: expectedApplyPlanChecksum,
    request_patch_checksum: expectedRequestPatchChecksum,
    receipt_apply_plan_checksum: receiptApplyPlanChecksum,
    receipt_request_patch_checksum: receiptRequestPatchChecksum,
    task_agent_session_id: receiptTaskAgentSessionId || expectedTaskAgentSessionId,
    native_session_id: receiptNativeSessionId || expectedNativeSessionId,
    memory_context_snapshot_id: receiptSnapshotId || expectedSnapshotId,
    memory_context_snapshot_checksum: receiptSnapshotChecksum || expectedSnapshotChecksum,
  };
  const proofKey = crypto.createHash("sha256").update(JSON.stringify({
    groupId,
    taskId,
    executionId,
    runnerRequestId: entryCore.runner_request_id,
    externalRunnerRequestId: entryCore.external_runner_request_id,
    agent,
    planChecksum,
    applyPlanChecksum: expectedApplyPlanChecksum || receiptApplyPlanChecksum,
    requestPatchChecksum: expectedRequestPatchChecksum || receiptRequestPatchChecksum,
    taskAgentSessionId: entryCore.task_agent_session_id,
    nativeSessionId: entryCore.native_session_id,
    memoryContextSnapshotId: entryCore.memory_context_snapshot_id,
    memoryContextSnapshotChecksum: entryCore.memory_context_snapshot_checksum,
  })).digest("hex").slice(0, 20);
  return {
    schema: "ccm-group-api-microcompact-native-apply-proof-entry-v1",
    entry_id: `api_microcompact_native_apply_proof_${proofKey}`,
    ...entryCore,
    expected_task_agent_session_id: expectedTaskAgentSessionId,
    receipt_task_agent_session_id: receiptTaskAgentSessionId,
    expected_native_session_id: expectedNativeSessionId,
    receipt_native_session_id: receiptNativeSessionId,
    expected_memory_context_snapshot_id: expectedSnapshotId,
    receipt_memory_context_snapshot_id: receiptSnapshotId,
    expected_memory_context_snapshot_checksum: expectedSnapshotChecksum,
    receipt_memory_context_snapshot_checksum: receiptSnapshotChecksum,
    usage_state: usageState,
    native_applied: planRow.native_applied === true || usageState === "native_applied",
    proof_status: proofStatus,
    strong_proof: proofStatus === "verified",
    native_apply_ready: planRow.native_apply_ready === true || planRow.nativeApplyReady === true,
    apply_plan_checksum_matched: planRow.apply_plan_checksum_matched === true,
    request_patch_checksum_matched: planRow.request_patch_checksum_matched === true,
    session_binding_required: planRow.session_binding_required === true,
    session_matched: planRow.session_matched !== false,
    session_mismatch: planRow.session_mismatch === true,
    unsafe_native_applied: planRow.unsafe_native_applied === true,
    reason: compactMemoryText(planRow.reason || receiptRow.reason || "", 500),
    generated_at: generatedAt,
  };
}

export function apiMicrocompactNativeApplyProofStatsKey(entry: any = {}) {
  return [
    String(entry.target_project || "").trim().toLowerCase(),
    String(entry.plan_checksum || "").trim(),
    String(entry.apply_plan_checksum || entry.receipt_apply_plan_checksum || "").trim(),
    String(entry.request_patch_checksum || entry.receipt_request_patch_checksum || "").trim(),
  ].join("|");
}

export function apiMicrocompactNativeApplyProofTotals(entries: any[] = []) {
  return entries.reduce((acc: any, entry: any) => {
    const status = String(entry.proof_status || "").trim();
    if (status && Object.prototype.hasOwnProperty.call(acc, status)) acc[status] = Number(acc[status] || 0) + 1;
    if (entry.native_applied === true || status === "verified" || status === "failed") acc.native_claims = Number(acc.native_claims || 0) + 1;
    if (entry.strong_proof === true || status === "verified") acc.strong_verified = Number(acc.strong_verified || 0) + 1;
    acc.total = Number(acc.total || 0) + 1;
    return acc;
  }, { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, strong_verified: 0, total: 0 });
}

export function normalizeApiMicrocompactNativeApplyTelemetryStatus(row: any = {}) {
  const explicit = String(row.telemetry_status || row.telemetryStatus || row.status || "").toLowerCase().trim();
  if (["sent", "matched_contract", "invalid", "failed"].includes(explicit)) return explicit;
  const hasContextManagement = row.has_context_management === true
    || row.hasContextManagement === true
    || !!row.context_management
    || !!row.contextManagement
    || !!row.request_body?.context_management
    || !!row.requestBody?.context_management;
  const requestPatchChecksum = String(row.requestPatchChecksum || row.request_patch_checksum || "").trim();
  if (row.error || row.failed === true || row.ok === false) return "failed";
  if (hasContextManagement && requestPatchChecksum) return "matched_contract";
  if (requestPatchChecksum || hasContextManagement) return "sent";
  return "invalid";
}

export function buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow(input: any = {}) {
  const plan = input.apiMicrocompactNativeApplyPlan
    || input.api_microcompact_native_apply_plan
    || input.nativeApplyPlan
    || input.native_apply_plan
    || {};
  const requestPatch = input.requestPatch || input.request_patch || plan.requestPatch || plan.request_patch || {};
  const requestPatchBody = requestPatch.body || requestPatch.request_body || {};
  const requestBody = input.requestBody || input.request_body || {};
  const contextManagement = requestBody?.context_management
    || requestPatchBody?.context_management
    || input.contextManagement
    || input.context_management
    || null;
  const betaHeaders = uniqueApiMicrocompactStrings(
    input.betaHeaders || input.beta_headers || [],
    requestPatch.beta_headers || requestPatch.betaHeaders || [],
    apiMicrocompactBetaHeadersFromHeaders(input.headers || input.requestHeaders || input.request_headers),
  );
  const requestPatchChecksum = String(
    input.requestPatchChecksum
    || input.request_patch_checksum
    || plan.requestPatchChecksum
    || plan.request_patch_checksum
    || (Object.keys(requestPatch || {}).length ? stableApiMicrocompactChecksum(requestPatch) : "")
  ).trim();
  const row = {
    planChecksum: String(
      input.planChecksum
      || input.plan_checksum
      || plan.apiEditPlanChecksum
      || plan.api_edit_plan_checksum
      || plan.planChecksum
      || plan.plan_checksum
      || ""
    ).trim(),
    applyPlanChecksum: String(input.applyPlanChecksum || input.apply_plan_checksum || plan.applyPlanChecksum || plan.apply_plan_checksum || "").trim(),
    requestPatchChecksum,
    requestBodyChecksum: String(input.requestBodyChecksum || input.request_body_checksum || stableApiMicrocompactChecksum(requestBody)).trim(),
    requestBody,
    hasContextManagement: !!contextManagement,
    contextManagementEditCount: Number(
      input.contextManagementEditCount
      || input.context_management_edit_count
      || contextManagement?.edits?.length
      || 0
    ),
    betaHeaders,
    provider: String(input.provider || plan.executor?.provider || plan.provider || "").trim(),
    model: String(input.model || "").trim(),
    endpoint: String(input.endpoint || input.url || input.apiUrl || input.api_url || "").trim(),
    method: String(input.method || "POST").trim().toUpperCase(),
    responseStatus: Number(input.responseStatus || input.response_status || input.httpStatus || input.http_status || 0),
    requestId: String(input.requestId || input.request_id || input.providerRequestId || input.provider_request_id || "").trim(),
    runnerRequestId: String(input.runnerRequestId || input.runner_request_id || input.externalRunnerRequestId || input.external_runner_request_id || plan.runnerRequestId || plan.runner_request_id || "").trim(),
    externalRunnerRequestId: String(input.externalRunnerRequestId || input.external_runner_request_id || input.runnerRequestId || input.runner_request_id || plan.externalRunnerRequestId || plan.external_runner_request_id || plan.runnerRequestId || plan.runner_request_id || "").trim(),
    taskAgentSessionId: String(input.taskAgentSessionId || input.task_agent_session_id || plan.taskAgentSessionId || plan.task_agent_session_id || "").trim(),
    nativeSessionId: String(input.nativeSessionId || input.native_session_id || plan.nativeSessionId || plan.native_session_id || "").trim(),
    memoryContextSnapshotId: String(input.memoryContextSnapshotId || input.memory_context_snapshot_id || plan.memoryContextSnapshotId || plan.memory_context_snapshot_id || "").trim(),
    memoryContextSnapshotChecksum: String(input.memoryContextSnapshotChecksum || input.memory_context_snapshot_checksum || plan.memoryContextSnapshotChecksum || plan.memory_context_snapshot_checksum || "").trim(),
    groupSessionId: String(input.groupSessionId || input.group_session_id || plan.groupSessionId || plan.group_session_id || "default").trim() || "default",
    targetProject: String(input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
    agent: String(input.agent || input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
    taskId: String(input.taskId || input.task_id || "").trim(),
    executionId: String(input.executionId || input.execution_id || "").trim(),
    sentAt: String(input.sentAt || input.sent_at || input.generatedAt || input.generated_at || new Date().toISOString()),
    telemetrySource: "native_request_adapter",
    ok: input.ok,
    error: compactMemoryText(input.error || input.errorMessage || input.error_message || "", 360),
  };
  return row;
}

export function recordGroupApiMicrocompactNativeApplyAdapterTelemetry(input: any = {}) {
  const plan = input.apiMicrocompactNativeApplyPlan
    || input.api_microcompact_native_apply_plan
    || input.nativeApplyPlan
    || input.native_apply_plan
    || {};
  const groupId = String(input.groupId || input.group_id || plan.groupId || plan.group_id || "").trim();
  const row = buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow(input);
  if (!groupId) {
    return {
      schema: "ccm-group-api-microcompact-native-apply-adapter-telemetry-record-v1",
      skipped: true,
      reason: "missing_group_id",
      recorded_count: 0,
    };
  }
  if (!row.planChecksum && !row.applyPlanChecksum && !row.requestPatchChecksum && input.force !== true) {
    return {
      schema: "ccm-group-api-microcompact-native-apply-adapter-telemetry-record-v1",
      groupId,
      skipped: true,
      reason: "missing_native_apply_plan",
      recorded_count: 0,
    };
  }
  return recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, {
    groupSessionId: row.groupSessionId,
    targetProject: row.targetProject,
    taskId: row.taskId,
    executionId: row.executionId,
    rows: [row],
    telemetrySource: "native_request_adapter",
    generatedAt: row.sentAt,
  });
}

export function buildApiMicrocompactNativeApplyTelemetryEntry(groupId: string, input: any = {}, receiptRow: any = {}, row: any = {}) {
  if (!row || typeof row !== "object") return null;
  const taskId = String(input.taskId || input.task_id || receiptRow.taskId || receiptRow.task_id || row.taskId || row.task_id || "").trim();
  const executionId = String(input.executionId || input.execution_id || receiptRow.executionId || receiptRow.execution_id || row.executionId || row.execution_id || "").trim();
  const targetProject = String(row.targetProject || row.target_project || receiptRow.agent || receiptRow.project || input.targetProject || input.target_project || "").trim();
  const agent = String(row.agent || receiptRow.agent || receiptRow.project || targetProject || "").trim();
  const sentAt = String(row.sentAt || row.sent_at || row.generatedAt || row.generated_at || input.generatedAt || input.generated_at || new Date().toISOString());
  const requestBody = row.requestBody || row.request_body || null;
  const requestBodyChecksum = String(row.requestBodyChecksum || row.request_body_checksum || (requestBody ? crypto.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex").slice(0, 24) : "")).trim();
  const runnerRequestId = String(
    row.runnerRequestId
    || row.runner_request_id
    || receiptRow.runnerRequestId
    || receiptRow.runner_request_id
    || input.runnerRequestId
    || input.runner_request_id
    || row.externalRunnerRequestId
    || row.external_runner_request_id
    || receiptRow.externalRunnerRequestId
    || receiptRow.external_runner_request_id
    || input.externalRunnerRequestId
    || input.external_runner_request_id
    || ""
  ).trim();
  const externalRunnerRequestId = String(
    row.externalRunnerRequestId
    || row.external_runner_request_id
    || receiptRow.externalRunnerRequestId
    || receiptRow.external_runner_request_id
    || input.externalRunnerRequestId
    || input.external_runner_request_id
    || runnerRequestId
    || ""
  ).trim();
  const betaHeaders = [
    ...(Array.isArray(row.betaHeaders || row.beta_headers) ? (row.betaHeaders || row.beta_headers) : []),
    ...apiMicrocompactBetaHeadersFromHeaders(row.headers || row.requestHeaders || row.request_headers),
  ].map((item: any) => String(item || "").trim()).filter(Boolean);
  const hasContextManagement = row.has_context_management === true
    || row.hasContextManagement === true
    || !!row.context_management
    || !!row.contextManagement
    || !!requestBody?.context_management
    || betaHeaders.includes("context-management-2025-06-27");
  const entryCore = {
    group_id: groupId,
    group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
    target_project: targetProject,
    agent,
    task_id: taskId,
    execution_id: executionId,
    plan_checksum: String(row.planChecksum || row.plan_checksum || row.apiMicrocompactPlanChecksum || row.api_microcompact_plan_checksum || "").trim(),
    apply_plan_checksum: String(row.applyPlanChecksum || row.apply_plan_checksum || row.nativeApplyPlanChecksum || row.native_apply_plan_checksum || "").trim(),
    request_patch_checksum: String(row.requestPatchChecksum || row.request_patch_checksum || "").trim(),
    runner_request_id: runnerRequestId || externalRunnerRequestId,
    external_runner_request_id: externalRunnerRequestId || runnerRequestId,
    task_agent_session_id: String(row.taskAgentSessionId || row.task_agent_session_id || receiptRow.taskAgentSessionId || receiptRow.task_agent_session_id || "").trim(),
    native_session_id: String(row.nativeSessionId || row.native_session_id || receiptRow.nativeSessionId || receiptRow.native_session_id || "").trim(),
    memory_context_snapshot_id: String(row.memoryContextSnapshotId || row.memory_context_snapshot_id || receiptRow.memoryContextSnapshotId || receiptRow.memory_context_snapshot_id || "").trim(),
    memory_context_snapshot_checksum: String(row.memoryContextSnapshotChecksum || row.memory_context_snapshot_checksum || receiptRow.memoryContextSnapshotChecksum || receiptRow.memory_context_snapshot_checksum || "").trim(),
    provider: String(row.provider || row.apiProvider || row.api_provider || "").trim(),
    model: String(row.model || "").trim(),
    endpoint: compactMemoryText(row.endpoint || row.url || row.apiUrl || row.api_url || "", 240),
    method: String(row.method || "POST").trim().toUpperCase(),
    request_id: String(row.requestId || row.request_id || row.providerRequestId || row.provider_request_id || "").trim(),
    request_body_checksum: requestBodyChecksum,
    beta_headers: betaHeaders.slice(0, 12),
    has_context_management: hasContextManagement,
    context_management_edit_count: Number(row.contextManagementEditCount || row.context_management_edit_count || row.context_management?.edits?.length || row.contextManagement?.edits?.length || requestBody?.context_management?.edits?.length || 0),
    response_status: Number(row.responseStatus || row.response_status || row.httpStatus || row.http_status || 0),
    telemetry_source: String(row.telemetrySource || row.telemetry_source || input.telemetrySource || input.telemetry_source || "agent_receipt").trim(),
    sent_at: sentAt,
  };
  const telemetryStatus = normalizeApiMicrocompactNativeApplyTelemetryStatus({ ...row, has_context_management: hasContextManagement });
  const entryId = `api_microcompact_native_apply_request_${crypto.createHash("sha256").update(JSON.stringify({
    groupId,
    taskId,
    executionId,
    agent,
    planChecksum: entryCore.plan_checksum,
    applyPlanChecksum: entryCore.apply_plan_checksum,
    requestPatchChecksum: entryCore.request_patch_checksum,
    runnerRequestId: entryCore.runner_request_id,
    externalRunnerRequestId: entryCore.external_runner_request_id,
    taskAgentSessionId: entryCore.task_agent_session_id,
    nativeSessionId: entryCore.native_session_id,
    memoryContextSnapshotId: entryCore.memory_context_snapshot_id,
    requestBodyChecksum,
    requestId: entryCore.request_id,
  })).digest("hex").slice(0, 20)}`;
  return {
    schema: "ccm-group-api-microcompact-native-apply-request-telemetry-entry-v1",
    entry_id: entryId,
    ...entryCore,
    telemetry_status: telemetryStatus,
    matched_contract: telemetryStatus === "matched_contract",
    error: compactMemoryText(row.error || row.errorMessage || row.error_message || "", 360),
  };
}

export function apiMicrocompactNativeApplyTelemetryTotals(entries: any[] = []) {
  return entries.reduce((acc: any, entry: any) => {
    const status = String(entry.telemetry_status || "").trim();
    if (status === "matched_contract") acc.matched_contract = Number(acc.matched_contract || 0) + 1;
    else if (status && Object.prototype.hasOwnProperty.call(acc, status)) acc[status] = Number(acc[status] || 0) + 1;
    if (status === "sent" || status === "matched_contract") acc.sent = Number(acc.sent || 0) + 1;
    acc.total = Number(acc.total || 0) + 1;
    return acc;
  }, { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 });
}

export function apiMicrocompactNativeApplyTelemetrySourceCounts(entries: any[] = []) {
  return entries.reduce((acc: any, entry: any) => {
    const source = String(entry.telemetry_source || "unknown").trim() || "unknown";
    const status = String(entry.telemetry_status || "").trim();
    const current = acc[source] || { total: 0, sent: 0, matched_contract: 0, invalid: 0, failed: 0 };
    current.total += 1;
    if (status === "sent" || status === "matched_contract") current.sent += 1;
    if (status === "matched_contract") current.matched_contract += 1;
    if (status === "invalid") current.invalid += 1;
    if (status === "failed") current.failed += 1;
    acc[source] = current;
    return acc;
  }, {});
}

export function apiMicrocompactNativeApplyTelemetryStatsKey(entry: any = {}) {
  return [
    String(entry.target_project || "").trim().toLowerCase(),
    String(entry.plan_checksum || "").trim(),
    String(entry.apply_plan_checksum || "").trim(),
    String(entry.request_patch_checksum || "").trim(),
  ].join("|");
}

export function recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId: string, input: any = {}) {
  groupId = String(groupId || "").trim();
  if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true) return null;
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const directRows = Array.isArray(input.rows) ? input.rows : [];
  const receiptRows = Array.isArray(input.receipts || input.receiptRows || input.receipt_rows)
    ? (input.receipts || input.receiptRows || input.receipt_rows)
    : [];
  const rows = [
    ...directRows.map((row: any) => ({ receipt: {}, row })),
    ...receiptRows.flatMap((receipt: any) => {
      const telemetryRows = [
        ...(Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry)
          ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry)
          : []),
        ...(Array.isArray(receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
          ? (receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
          : []),
        ...(Array.isArray(receipt.providerRequestTelemetry || receipt.provider_request_telemetry)
          ? (receipt.providerRequestTelemetry || receipt.provider_request_telemetry)
          : []),
      ];
      return telemetryRows.map((row: any) => ({ receipt, row }));
    }),
  ];
  const entries = rows
    .map(({ receipt, row }: any) => buildApiMicrocompactNativeApplyTelemetryEntry(groupId, input, receipt, row))
    .filter(Boolean);
  const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, groupSessionId);
  if (!entries.length) {
    const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, groupSessionId);
    return {
      schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
      groupId,
      groupSessionId,
      file,
      skipped: true,
      reason: "no_request_telemetry_rows",
      recorded_count: 0,
      totals: ledger.totals || {},
    };
  }
  const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, groupSessionId);
  const entryMap = new Map((Array.isArray(ledger.entries) ? ledger.entries : []).map((entry: any) => [entry.entry_id, entry]));
  let recordedCount = 0;
  let updatedCount = 0;
  for (const entry of entries) {
    if (entryMap.has(entry.entry_id)) updatedCount += 1;
    else recordedCount += 1;
    entryMap.set(entry.entry_id, entry);
  }
  const allEntries = Array.from(entryMap.values())
    .sort((a: any, b: any) => String(a.sent_at || "").localeCompare(String(b.sent_at || "")))
    .slice(-320);
  const stats = allEntries.reduce((acc: any, entry: any) => {
    const key = apiMicrocompactNativeApplyTelemetryStatsKey(entry);
    const current = acc[key] || {
      target_project: entry.target_project,
      plan_checksum: entry.plan_checksum,
      apply_plan_checksum: entry.apply_plan_checksum,
      request_patch_checksum: entry.request_patch_checksum,
      sent_count: 0,
      matched_contract_count: 0,
      invalid_count: 0,
      failed_count: 0,
      agents: [],
      task_ids: [],
      first_seen_at: entry.sent_at,
    };
    const status = String(entry.telemetry_status || "");
    if (status && !["sent", "matched_contract"].includes(status)) current[`${status}_count`] = Number(current[`${status}_count`] || 0) + 1;
    if (status === "matched_contract") current.matched_contract_count = Number(current.matched_contract_count || 0) + 1;
    if (status === "sent" || status === "matched_contract") current.sent_count = Number(current.sent_count || 0) + 1;
    current.last_status = status;
    current.last_agent = entry.agent;
    current.last_task_id = entry.task_id;
    current.last_seen_at = entry.sent_at;
    current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
    current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
    acc[key] = current;
    return acc;
  }, {});
  const totals = apiMicrocompactNativeApplyTelemetryTotals(allEntries);
  const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, {
    stats,
    entries: allEntries,
    totals,
    updatedAt,
  }, groupSessionId);
  return {
    schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
    groupId,
    groupSessionId,
    file,
    recorded_count: recordedCount,
    updated_count: updatedCount,
    totals,
    updatedAt,
  };
}

export function apiMicrocompactNativeApplyTelemetryMatchesProof(telemetry: any = {}, proof: any = {}) {
  const samePlan = !proof.plan_checksum || String(telemetry.plan_checksum || "") === String(proof.plan_checksum || "");
  const sameApply = !proof.apply_plan_checksum && !proof.receipt_apply_plan_checksum
    || [proof.apply_plan_checksum, proof.receipt_apply_plan_checksum].some(value => String(value || "") === String(telemetry.apply_plan_checksum || ""));
  const sameRequest = !proof.request_patch_checksum && !proof.receipt_request_patch_checksum
    || [proof.request_patch_checksum, proof.receipt_request_patch_checksum].some(value => String(value || "") === String(telemetry.request_patch_checksum || ""));
  const sameTaskSession = !proof.task_agent_session_id && !proof.receipt_task_agent_session_id
    || [proof.task_agent_session_id, proof.receipt_task_agent_session_id, proof.expected_task_agent_session_id].some(value => String(value || "") === String(telemetry.task_agent_session_id || ""));
  const sameNativeSession = !proof.native_session_id && !proof.receipt_native_session_id
    || [proof.native_session_id, proof.receipt_native_session_id, proof.expected_native_session_id].some(value => String(value || "") === String(telemetry.native_session_id || ""));
  const sameSnapshot = !proof.memory_context_snapshot_id && !proof.receipt_memory_context_snapshot_id
    || [proof.memory_context_snapshot_id, proof.receipt_memory_context_snapshot_id, proof.expected_memory_context_snapshot_id].some(value => String(value || "") === String(telemetry.memory_context_snapshot_id || ""));
  return samePlan && sameApply && sameRequest && sameTaskSession && sameNativeSession && sameSnapshot;
}

export function enrichApiMicrocompactNativeApplyProofWithTelemetry(entry: any = {}, telemetryEntries: any[] = [], options: any = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const maxAgeMs = Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS);
  const matched = telemetryEntries.find((telemetry: any) => apiMicrocompactNativeApplyTelemetryMatchesProof(telemetry, entry));
  const matchedContract = !!matched && (matched.matched_contract === true || matched.telemetry_status === "matched_contract");
  const sentMs = Date.parse(matched?.sent_at || "");
  const ageMs = Number.isFinite(sentMs) && sentMs > 0 ? Math.max(0, nowMs - sentMs) : null;
  const fresh = !!matched && matchedContract && ageMs !== null && ageMs <= maxAgeMs;
  const telemetrySource = matched?.telemetry_source || "";
  const adapterCaptured = telemetrySource === "native_request_adapter";
  const strong = matchedContract && fresh && adapterCaptured;
  const telemetryStatus = matched
    ? !matchedContract
      ? String(matched.telemetry_status || "invalid")
      : !fresh
        ? "stale"
        : adapterCaptured
          ? "matched"
          : "receipt_only"
    : entry.proof_status === "verified"
      ? "missing"
      : "not_required";
  return {
    ...entry,
    request_telemetry_matched: matchedContract,
    request_telemetry_fresh: fresh,
    request_telemetry_stale: telemetryStatus === "stale",
    request_telemetry_age_ms: ageMs,
    request_telemetry_status: telemetryStatus,
    request_telemetry_entry_id: matched?.entry_id || "",
    request_telemetry_sent_at: matched?.sent_at || "",
    request_telemetry_source: telemetrySource,
    request_telemetry_adapter_captured: adapterCaptured,
    request_telemetry_strong: strong,
    request_telemetry_weak_reason: strong
      ? ""
      : matchedContract && !fresh
          ? "stale"
          : matchedContract && !adapterCaptured
            ? "receipt_only"
          : telemetryStatus,
    request_telemetry_file: matched ? getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(entry.group_id || "", entry.group_session_id || "") : "",
  };
}

export function buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId: string, options: any = {}) {
  groupId = String(groupId || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
  const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, groupSessionId);
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
    .map((item: any) => String(item || "").trim())
    .filter(Boolean));
  const entries = (Array.isArray(ledger.entries) ? ledger.entries : [])
    .filter((entry: any) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
    .filter((entry: any) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "").trim()));
  const totals = apiMicrocompactNativeApplyTelemetryTotals(entries);
  const status = entries.length === 0
    ? "empty"
    : Number(totals.failed || 0) > 0 || Number(totals.invalid || 0) > 0
      ? "fail"
      : Number(totals.matched_contract || 0) > 0
        ? "ok"
        : "warn";
  return {
    schema: "ccm-group-api-microcompact-native-apply-request-telemetry-summary-v1",
    version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
    groupId,
    groupSessionId,
    target_project: targetProject,
    ledger_file: ledger.file,
    has_history: entries.length > 0,
    status,
    entry_count: entries.length,
    totals,
    source_counts: apiMicrocompactNativeApplyTelemetrySourceCounts(entries),
    matched_entries: entries.filter((entry: any) => entry.telemetry_status === "matched_contract").slice(-12).reverse(),
    failed_entries: entries.filter((entry: any) => entry.telemetry_status === "failed" || entry.telemetry_status === "invalid").slice(-12).reverse(),
    recent_entries: entries.slice(-20).reverse(),
    updatedAt: ledger.updatedAt || "",
  };
}

export function recordGroupApiMicrocompactNativeApplyProofLedger(groupId: string, input: any = {}) {
  groupId = String(groupId || "").trim();
  if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true) return null;
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const receiptRows = Array.isArray(input.receiptRows || input.receipt_rows || input.apiMicrocompactReceiptRows || input.api_microcompact_receipt_rows)
    ? (input.receiptRows || input.receipt_rows || input.apiMicrocompactReceiptRows || input.api_microcompact_receipt_rows)
    : [];
  const entries = receiptRows.flatMap((receiptRow: any) => {
    const gate = receiptRow.api_microcompact || receiptRow.apiMicrocompact || receiptRow.api_microcompact_receipt || receiptRow.apiMicrocompactReceipt || receiptRow;
    const rows = Array.isArray(gate.rows) ? gate.rows : [];
    return rows
      .map((row: any) => buildApiMicrocompactNativeApplyProofEntry(groupId, input, receiptRow, row))
      .filter(Boolean);
  });
  const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, groupSessionId);
  if (!entries.length) {
    const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId, groupSessionId);
    return {
      schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
      groupId,
      groupSessionId,
      file,
      skipped: true,
      reason: "no_api_microcompact_receipt_rows",
      recorded_count: 0,
      totals: ledger.totals || {},
    };
  }
  const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId, groupSessionId);
  const entryMap = new Map((Array.isArray(ledger.entries) ? ledger.entries : []).map((entry: any) => [entry.entry_id, entry]));
  let recordedCount = 0;
  let updatedCount = 0;
  for (const entry of entries) {
    if (entryMap.has(entry.entry_id)) updatedCount += 1;
    else recordedCount += 1;
    entryMap.set(entry.entry_id, entry);
  }
  const allEntries = Array.from(entryMap.values())
    .sort((a: any, b: any) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")))
    .slice(-320);
  const stats = allEntries.reduce((acc: any, entry: any) => {
    const key = apiMicrocompactNativeApplyProofStatsKey(entry);
    const current = acc[key] || {
      target_project: entry.target_project,
      plan_checksum: entry.plan_checksum,
      apply_plan_checksum: entry.apply_plan_checksum || entry.receipt_apply_plan_checksum,
      request_patch_checksum: entry.request_patch_checksum || entry.receipt_request_patch_checksum,
      verified_count: 0,
      failed_count: 0,
      advisory_count: 0,
      not_supported_count: 0,
      native_claim_count: 0,
      agents: [],
      task_ids: [],
      first_seen_at: entry.generated_at,
    };
    const status = String(entry.proof_status || "");
    if (status) current[`${status}_count`] = Number(current[`${status}_count`] || 0) + 1;
    if (entry.native_applied === true || status === "verified" || status === "failed") current.native_claim_count = Number(current.native_claim_count || 0) + 1;
    current.last_status = status;
    current.last_agent = entry.agent;
    current.last_task_id = entry.task_id;
    current.last_seen_at = entry.generated_at;
    current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
    current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
    acc[key] = current;
    return acc;
  }, {});
  const totals = apiMicrocompactNativeApplyProofTotals(allEntries);
  const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  writeGroupApiMicrocompactNativeApplyProofLedger(groupId, {
    stats,
    entries: allEntries,
    totals,
    updatedAt,
  }, groupSessionId);
  return {
    schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
    groupId,
    groupSessionId,
    file,
    recorded_count: recordedCount,
    updated_count: updatedCount,
    totals,
    updatedAt,
  };
}

export function buildGroupApiMicrocompactNativeApplyProofSummary(groupId: string, options: any = {}) {
  groupId = String(groupId || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
  const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId, groupSessionId);
  const telemetrySummary = buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId, options);
  const platformExecutionReceipts = buildProviderNativeCompactExecutionReceiptSummary(groupId, options);
  const telemetryEntries = [
    ...(Array.isArray(telemetrySummary.matched_entries) ? telemetrySummary.matched_entries : []),
    ...(Array.isArray(telemetrySummary.failed_entries) ? telemetrySummary.failed_entries : []),
    ...(Array.isArray(telemetrySummary.recent_entries) ? telemetrySummary.recent_entries : []),
  ];
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
    .map((item: any) => String(item || "").trim())
    .filter(Boolean));
  const legacyEntries = (Array.isArray(ledger.entries) ? ledger.entries : [])
    .filter((entry: any) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
    .filter((entry: any) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "").trim()));
  const platformEntries = (Array.isArray(platformExecutionReceipts.entries) ? platformExecutionReceipts.entries : platformExecutionReceipts.recent_entries || []).map((receipt: any) => ({
    schema: "ccm-group-api-microcompact-native-apply-proof-entry-v1",
    entry_id: receipt.receipt_id,
    group_id: receipt.group_id,
    group_session_id: receipt.group_session_id,
    target_project: receipt.target_project,
    agent: receipt.target_project,
    task_id: receipt.task_id,
    execution_id: receipt.execution_id,
    runner_request_id: receipt.runner_request_id,
    external_runner_request_id: receipt.runner_request_id,
    plan_checksum: receipt.plan_checksum,
    apply_plan_checksum: receipt.apply_plan_checksum,
    request_patch_checksum: receipt.request_patch_checksum,
    receipt_apply_plan_checksum: receipt.apply_plan_checksum,
    receipt_request_patch_checksum: receipt.request_patch_checksum,
    task_agent_session_id: receipt.task_agent_session_id,
    native_session_id: receipt.native_session_id,
    memory_context_snapshot_id: receipt.memory_context_snapshot_id,
    memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum,
    usage_state: receipt.status === "native_applied" ? "native_applied" : ["advisory_only", "request_accepted", "no_edits_applied"].includes(receipt.status) ? "advisory" : receipt.status === "not_supported" ? "not_supported" : "native_applied",
    native_applied: receipt.status === "native_applied",
    proof_status: receipt.status === "native_applied" && receipt.strong_proof === true
      ? "verified"
      : ["advisory_only", "request_accepted", "no_edits_applied"].includes(receipt.status)
        ? "advisory"
        : receipt.status === "not_supported"
          ? "not_supported"
          : "failed",
    pass: receipt.status === "native_applied" && receipt.strong_proof === true,
    strong_proof: receipt.status === "native_applied" && receipt.strong_proof === true,
    proof_source: "platform_execution_receipt",
    platform_execution_receipt_id: receipt.receipt_id,
    platform_execution_receipt_checksum: receipt.receipt_checksum,
    generated_at: receipt.accepted_at || receipt.sent_at || receipt.created_at,
    reason: receipt.failure_reason || `platform request adapter status=${receipt.status}`,
  }));
  const proofKey = (entry: any) => [
    entry.plan_checksum,
    entry.apply_plan_checksum || entry.receipt_apply_plan_checksum,
    entry.request_patch_checksum || entry.receipt_request_patch_checksum,
    entry.task_agent_session_id || entry.receipt_task_agent_session_id,
    entry.execution_id,
    entry.runner_request_id || entry.external_runner_request_id,
  ].map(value => String(value || "")).join("|");
  const platformKeys = new Set(platformEntries.map(proofKey));
  const entries = [...platformEntries, ...legacyEntries.filter((entry: any) => !platformKeys.has(proofKey(entry)))];
  const totals = apiMicrocompactNativeApplyProofTotals(entries);
  const proofCoverage = Number(totals.native_claims || 0) > 0
    ? Math.round(Number(totals.verified || 0) / Number(totals.native_claims || 1) * 1000) / 10
    : null;
  const enrichedEntries = entries.map((entry: any) => {
    const enriched = enrichApiMicrocompactNativeApplyProofWithTelemetry(entry, telemetryEntries, options);
    if (entry.proof_source !== "platform_execution_receipt" || entry.proof_status !== "verified") return enriched;
    return {
      ...enriched,
      request_telemetry_matched: true,
      request_telemetry_fresh: true,
      request_telemetry_status: "matched",
      request_telemetry_source: "native_request_adapter",
      request_telemetry_adapter_captured: true,
      request_telemetry_strong: true,
      request_telemetry_weak_reason: "",
      request_telemetry_runner_request_id: entry.runner_request_id,
      request_telemetry_runner_matched: true,
      request_telemetry_session_bound: true,
      request_telemetry_dispatch_bound: true,
    };
  });
  const telemetryMatchedCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_matched === true).length;
  const telemetryAdapterMatchedCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source === "native_request_adapter").length;
  const telemetryReceiptMatchedCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source !== "native_request_adapter").length;
  const telemetryStrongCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_strong === true).length;
  const telemetryReceiptOnlyCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_status === "receipt_only").length;
  const telemetryMissingCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_status === "missing").length;
  const telemetryStaleCount = enrichedEntries.filter((entry: any) => entry.proof_status === "verified" && entry.request_telemetry_status === "stale").length;
  const status = entries.length === 0
    ? "empty"
    : Number(totals.failed || 0) > 0 || platformExecutionReceipts.status === "fail"
      ? "fail"
      : telemetryMissingCount > 0 || telemetryStaleCount > 0 || platformExecutionReceipts.status === "warn"
        ? "warn"
      : Number(totals.verified || 0) > 0
        ? "ok"
        : "advisory";
  return {
    schema: "ccm-group-api-microcompact-native-apply-proof-summary-v1",
    version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
    groupId,
    groupSessionId,
    target_project: targetProject,
    ledger_file: ledger.file,
    has_history: entries.length > 0,
    status,
    entry_count: entries.length,
    proof_coverage_rate: proofCoverage,
    request_telemetry: {
      ...telemetrySummary,
      matched_verified_count: telemetryMatchedCount,
      adapter_matched_verified_count: telemetryAdapterMatchedCount,
      receipt_matched_verified_count: telemetryReceiptMatchedCount,
      strong_verified_count: telemetryStrongCount,
      receipt_only_verified_count: telemetryReceiptOnlyCount,
      missing_verified_count: telemetryMissingCount,
      stale_verified_count: telemetryStaleCount,
      max_age_ms: Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS),
    },
    platform_execution_receipts: platformExecutionReceipts,
    totals,
    verified_entries: enrichedEntries.filter((entry: any) => entry.proof_status === "verified").slice(-12).reverse(),
    failed_entries: enrichedEntries.filter((entry: any) => entry.proof_status === "failed").slice(-12).reverse(),
    advisory_entries: enrichedEntries.filter((entry: any) => entry.proof_status === "advisory" || entry.proof_status === "not_supported").slice(-12).reverse(),
    recent_entries: enrichedEntries.slice(-20).reverse(),
    updatedAt: ledger.updatedAt || "",
  };
}

export function buildSourceManifestSnapshot(sourceManifest: any = {}) {
  const entries = Array.isArray(sourceManifest.entries) ? sourceManifest.entries : [];
  return entries.slice(0, 180).map((entry: any) => ({
    id: String(entry.id || ""),
    purpose: String(entry.purpose || ""),
    path: String(entry.path || ""),
    exists: entry.exists === true,
    kind: String(entry.kind || ""),
    bytes: Number(entry.bytes || 0),
    mtimeMs: Number(entry.mtimeMs || 0),
    checksum: String(entry.checksum || ""),
    checksumMode: String(entry.checksumMode || ""),
    lineCount: Number(entry.lineCount || 0),
    childCount: Number(entry.childCount || 0),
  })).filter(entry => entry.id || entry.path);
}

export function diffSourceManifestSnapshots(previousEntries: any[] = [], currentEntries: any[] = []) {
  const keyFor = (entry: any) => String(entry.id || entry.path || "");
  const previous = new Map<string, any>();
  const current = new Map<string, any>();
  for (const entry of previousEntries || []) {
    const key = keyFor(entry);
    if (key) previous.set(key, entry);
  }
  for (const entry of currentEntries || []) {
    const key = keyFor(entry);
    if (key) current.set(key, entry);
  }
  const added: any[] = [];
  const removed: any[] = [];
  const changed: any[] = [];
  for (const [key, entry] of current) {
    const before = previous.get(key);
    if (!before) {
      added.push({ id: entry.id, path: entry.path, purpose: entry.purpose, checksum: entry.checksum });
      continue;
    }
    const changes: string[] = [];
    for (const field of ["exists", "kind", "bytes", "mtimeMs", "checksum", "lineCount", "childCount"]) {
      if ((before as any)[field] !== (entry as any)[field]) changes.push(field);
    }
    if (changes.length) {
      changed.push({
        id: entry.id,
        path: entry.path,
        purpose: entry.purpose,
        changes,
        previousChecksum: before.checksum || "",
        checksum: entry.checksum || "",
        previousMtimeMs: before.mtimeMs || 0,
        mtimeMs: entry.mtimeMs || 0,
      });
    }
  }
  for (const [key, entry] of previous) {
    if (!current.has(key)) removed.push({ id: entry.id, path: entry.path, purpose: entry.purpose, checksum: entry.checksum });
  }
  return {
    added: added.slice(0, 40),
    removed: removed.slice(0, 40),
    changed: changed.slice(0, 80),
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
    changedIds: changed.slice(0, 40).map(item => item.id || item.path),
  };
}

export function recordGroupMemoryReloadAudit(groupId: string, input: any = {}) {
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const sourceManifest = input.sourceManifest || input.source_manifest || {};
  const loadPlan = input.loadPlan || input.load_plan || {};
  const scope = String(input.scope || input.contextScope || input.context_scope || "default");
  const originalReason = String(input.reason || input.reloadReason || input.reload_reason || "context_bundle");
  const sourceManifestChecksum = String(sourceManifest.manifestChecksum || "");
  const stableSourceFingerprint = buildStableSourceFingerprint(sourceManifest);
  const sourceEntries = buildSourceManifestSnapshot(sourceManifest);
  const loadPlanFingerprint = crypto.createHash("sha256").update(JSON.stringify((loadPlan.entries || []).map((entry: any) => ({
    relPath: entry.relPath,
    type: entry.type,
    loadOrder: entry.loadOrder,
    checksum: entry.checksum,
    pathGlobs: entry.pathGlobs || [],
  })))).digest("hex").slice(0, 24);
  const ledger = readGroupMemoryReloadLedger(groupId, groupSessionId);
  const previous = ledger.scopes?.[scope] || null;
  const sourceManifestChanged = !!previous && previous.sourceManifestChecksum !== sourceManifestChecksum;
  const sourceShapeChanged = !!previous && previous.stableSourceFingerprint !== stableSourceFingerprint;
  const loadPlanChanged = !!previous && previous.loadPlanFingerprint !== loadPlanFingerprint;
  const sourceDiff = diffSourceManifestSnapshots(previous?.sourceEntries || [], sourceEntries);
  const hasSourceDiff = !!previous && (sourceManifestChanged || sourceShapeChanged || sourceDiff.addedCount > 0 || sourceDiff.removedCount > 0 || sourceDiff.changedCount > 0);
  const autoSourceChangeReasons = new Set(["context_bundle", "global_context_bundle", "source_cache_checked"]);
  const reason = hasSourceDiff && autoSourceChangeReasons.has(originalReason)
    ? "memory_source_changed"
    : originalReason;
  const forceReloadReasons = new Set([
    "compact",
    "post_compact_restore",
    "project_memory_import",
    "global_claude_memory_import",
    "memory_file_import",
    "memory_source_changed",
    "manual",
    "session_start",
  ]);
  const shouldReload = !previous || sourceManifestChanged || loadPlanChanged || forceReloadReasons.has(reason);
  const sourceChangeTrigger = {
    schema: "ccm-group-memory-source-change-trigger-v1",
    version: GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION,
    triggered: hasSourceDiff,
    reason,
    originalReason,
    generatedAt,
    previousAuditAt: previous?.generatedAt || "",
    sourceManifestChanged,
    sourceShapeChanged,
    loadPlanChanged,
    addedCount: sourceDiff.addedCount,
    removedCount: sourceDiff.removedCount,
    changedCount: sourceDiff.changedCount,
    changedIds: sourceDiff.changedIds,
    added: sourceDiff.added,
    removed: sourceDiff.removed,
    changed: sourceDiff.changed,
  };
  const audit = {
    schema: "ccm-group-memory-reload-audit-v1",
    version: GROUP_MEMORY_RELOAD_AUDIT_VERSION,
    groupId,
    groupSessionId,
    scope,
    contextKind: input.contextKind || input.context_kind || "child_agent",
    reason,
    originalReason,
    generatedAt,
    shouldReload,
    cacheAction: shouldReload ? "reload_memory_context" : "reuse_memory_context_sources",
    hookEvent: shouldReload ? "instructions_loaded" : "source_cache_checked",
    previousAuditAt: previous?.generatedAt || "",
    sourceManifestChecksum,
    previousSourceManifestChecksum: previous?.sourceManifestChecksum || "",
    sourceManifestChanged,
    stableSourceFingerprint,
    previousStableSourceFingerprint: previous?.stableSourceFingerprint || "",
    sourceShapeChanged,
    loadPlanFingerprint,
    previousLoadPlanFingerprint: previous?.loadPlanFingerprint || "",
    loadPlanChanged,
    sourceChangeTrigger,
    sourceStatus: sourceManifest.status || "",
    sourceEntryCount: Number(sourceManifest.entryCount || 0),
    typedDocCount: Number(sourceManifest.typedDocCount || 0),
    loadPlanStatus: loadPlan.status || "",
    loadPlanEntryCount: Number(loadPlan.entryCount || 0),
    imports: {
      globalClaudeImported: Number(input.globalClaudeMemoryImport?.importedCount || input.global_claude_memory_import?.importedCount || 0),
      projectImported: Number(input.projectMemoryImport?.importedCount || input.project_memory_import?.importedCount || 0),
      projectImportRoots: Array.isArray(input.projectMemoryImports || input.project_memory_imports)
        ? (input.projectMemoryImports || input.project_memory_imports).map((item: any) => item.projectRoot || "").filter(Boolean).slice(0, 8)
        : [],
    },
    compact: {
      postCompactRecoveryStatus: input.postCompactRecoveryAudit?.status || input.post_compact_recovery_audit?.status || "",
      summaryChecksum: input.postCompactRecoveryAudit?.summaryChecksum || input.post_compact_recovery_audit?.summaryChecksum || "",
    },
  };
  ledger.scopes = ledger.scopes || {};
  ledger.scopes[scope] = {
    generatedAt,
    reason,
    sourceManifestChecksum,
    stableSourceFingerprint,
    loadPlanFingerprint,
    sourceEntries,
    sourceChangeTrigger: {
      triggered: sourceChangeTrigger.triggered,
      reason: sourceChangeTrigger.reason,
      originalReason: sourceChangeTrigger.originalReason,
      addedCount: sourceChangeTrigger.addedCount,
      removedCount: sourceChangeTrigger.removedCount,
      changedCount: sourceChangeTrigger.changedCount,
      changedIds: sourceChangeTrigger.changedIds,
    },
    sourceStatus: audit.sourceStatus,
    loadPlanStatus: audit.loadPlanStatus,
  };
  ledger.entries = [...(ledger.entries || []), audit].slice(-120);
  ledger.updatedAt = generatedAt;
  writeGroupMemoryReloadLedger(groupId, ledger, groupSessionId);
  return { ...audit, ledgerFile: getGroupMemoryReloadLedgerFile(groupId, groupSessionId) };
}

// ===== merged from group-compact-file-references-part-03.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function buildGroupMemoryDispatchFreshnessGate(input: any = {}) {
  const sourceManifest = input.sourceManifest || input.source_manifest || {};
  const reloadAudit = input.reloadAudit || input.reload_audit || {};
  const memoryIgnored = input.memoryIgnored === true || input.memory_ignored === true;
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const scope = String(input.scope || reloadAudit.scope || "default");
  const sourceChecksum = String(sourceManifest.manifestChecksum || "");
  const reloadReason = String(reloadAudit.reason || (memoryIgnored ? "ignore_memory" : "context_bundle"));
  const sourceStatus = String(sourceManifest.status || (memoryIgnored ? "ignored" : "unknown"));
  const missingRequired = Array.isArray(sourceManifest.missingRequired) ? sourceManifest.missingRequired : [];
  const dispatchId = `gmd_${crypto.createHash("sha256").update(JSON.stringify([
    input.groupId || input.group_id || "",
    input.targetProject || input.target_project || "",
    scope,
    generatedAt,
    sourceChecksum,
    reloadReason,
    memoryIgnored,
  ])).digest("hex").slice(0, 18)}`;
  const status = memoryIgnored
    ? "memory_ignored"
    : sourceStatus === "fail" || missingRequired.length
      ? "source_incomplete"
      : reloadAudit.shouldReload === false
        ? "fresh_reused_stable_sources"
        : "fresh_reloaded";
  const gate = {
    schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
    version: GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
    dispatch_gate_id: dispatchId,
    group_id: String(input.groupId || input.group_id || ""),
    target_project: String(input.targetProject || input.target_project || ""),
    scope,
    generated_at: generatedAt,
    status,
    memory_ignored: memoryIgnored,
    action: memoryIgnored
      ? "do_not_use_platform_memory"
      : status === "source_incomplete"
        ? "use_current_context_but_verify_missing_sources"
        : reloadAudit.shouldReload === false
          ? "reuse_stable_context_sources"
          : "use_reloaded_context",
    source_manifest: {
      checksum: sourceChecksum,
      status: sourceStatus,
      entry_count: Number(sourceManifest.entryCount || 0),
      typed_doc_count: Number(sourceManifest.typedDocCount || 0),
      latest_mtime: sourceManifest.latestMtime || "",
      missing_required: missingRequired,
    },
    reload_audit: {
      reason: reloadReason,
      original_reason: reloadAudit.originalReason || reloadReason,
      should_reload: reloadAudit.shouldReload !== false,
      cache_action: reloadAudit.cacheAction || "",
      hook_event: reloadAudit.hookEvent || "",
      previous_audit_at: reloadAudit.previousAuditAt || "",
      source_changed: reloadAudit.sourceManifestChanged === true || reloadAudit.sourceChangeTrigger?.triggered === true,
      load_plan_changed: reloadAudit.loadPlanChanged === true,
      source_change_trigger: reloadAudit.sourceChangeTrigger || null,
    },
    receipt_contract: {
      memory_used_should_reference_gate: !memoryIgnored,
      memory_ignored_should_reference_gate: memoryIgnored,
      required_receipt_fields: ["memoryUsed", "memoryIgnored"],
    },
  };
  return {
    ...gate,
    context_budget: buildContextBudget({ context: gate, maxChars: 8000, maxTokens: 20_000 }),
  };
}

export function recordGroupPostCompactFirstDispatchMarker(groupId: string, input: any = {}) {
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const targetProject = String(input.targetProject || input.target_project || "").trim();
  const scope = String(input.scope || (targetProject ? `child:${targetProject}` : "child"));
  const parts = resolvePostCompactBoundaryMarkerParts(groupId, input);
  if (!parts) return null;
  const ledgerFile = getGroupPostCompactDispatchLedgerFile(groupId, groupSessionId);
  const ledgerDisabled = input.disableLedger === true
    || input.disable_ledger === true
    || input.disablePostCompactDispatchLedger === true
    || input.disable_post_compact_dispatch_ledger === true;
  const ledger = ledgerDisabled ? { scopes: {}, entries: [] } : readGroupPostCompactDispatchLedger(groupId, groupSessionId);
  const scopeKey = `${scope}|${parts.boundaryId}`;
  const previous = ledger.scopes?.[scopeKey] || null;
  const dispatchSequence = Number(previous?.dispatchSequence || previous?.dispatch_sequence || 0) + 1;
  const firstDispatchAfterCompact = dispatchSequence === 1;
  const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
  const markerCore: any = {
    schema: "ccm-post-compact-first-dispatch-marker-v1",
    version: GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
    marker_id: `pcfd_${crypto.createHash("sha256").update(JSON.stringify([
      groupId,
      targetProject,
      scope,
      parts.boundaryId,
      dispatchSequence,
    ])).digest("hex").slice(0, 18)}`,
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: targetProject,
    scope,
    generated_at: generatedAt,
    boundary_id: parts.boundaryId,
    raw_boundary_id: parts.rawBoundaryId,
    summarized_through_message_id: parts.summarizedThroughMessageId,
    summary_checksum: parts.summaryChecksum,
    compacted_message_count: parts.compactedMessageCount,
    first_dispatch_after_compact: firstDispatchAfterCompact,
    dispatch_sequence: dispatchSequence,
    previous_dispatch_at: previous?.generatedAt || previous?.generated_at || "",
    status: firstDispatchAfterCompact ? "first_dispatch_after_compact" : "post_compact_followup_dispatch",
    action: firstDispatchAfterCompact
      ? "treat_reinjected_memory_as_fresh_recovered_context"
      : "reuse_recovered_context_with_sequence_awareness",
    reinjection_gate_id: gate.reinjection_gate_id || gate.reinjectionGateId || "",
    candidate_count: Number(gate.candidate_count || gate.candidateCount || 0),
    ledger_file: ledgerFile,
    cc_parity_reference: {
      source: "Claude Code pendingPostCompaction / consumePostCompaction",
      semantics: "mark once per compact boundary and target child Agent dispatch sequence",
    },
    receipt_contract: {
      memory_used_or_ignored_may_reference_marker: true,
      required_receipt_fields: ["memoryUsed", "memoryIgnored"],
      note: "该 marker 是压缩后派发遥测；first_dispatch_after_compact=true 时，子 Agent 应把本轮记忆包视为压缩恢复后的第一跳上下文。",
    },
  };
  const marker = {
    ...markerCore,
    context_budget: buildContextBudget({ context: markerCore, maxChars: 5000, maxTokens: 12_000 }),
  };
  if (!ledgerDisabled) {
    ledger.scopes = ledger.scopes || {};
    ledger.scopes[scopeKey] = {
      groupId,
      groupSessionId,
      targetProject,
      scope,
      boundaryId: parts.boundaryId,
      rawBoundaryId: parts.rawBoundaryId,
      summarizedThroughMessageId: parts.summarizedThroughMessageId,
      summaryChecksum: parts.summaryChecksum,
      dispatchSequence,
      firstDispatchAt: previous?.firstDispatchAt || previous?.first_dispatch_at || generatedAt,
      generatedAt,
      latestMarkerId: marker.marker_id,
      reinjectionGateId: marker.reinjection_gate_id,
      candidateCount: marker.candidate_count,
    };
    ledger.entries = [...(ledger.entries || []), markerCore].slice(-160);
    ledger.updatedAt = generatedAt;
    writeGroupPostCompactDispatchLedger(groupId, ledger, groupSessionId);
  }
  return marker;
}
