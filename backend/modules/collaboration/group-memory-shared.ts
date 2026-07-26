// group-memory-shared.ts — merged from 2 part files (behavior-freeze merge).

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
  upsertAgentMemory,
} from "./group-agent-memory-packet";
import {
  normalizeCompactFileReferencePath,
} from "./group-compact-file-references";
import {
  scoreMemorySemanticContradiction,
} from "./group-global-memory-arbitration";
import {
  getGroupMemoryReloadLedgerFile,
  getGroupPostCompactDispatchLedgerFile,
  hashGroupMemoryFileWindow,
  loadGroupMemory,
  saveGroupMemory,
} from "./group-memory-storage";
import {
  enforceGroupSessionMemoryBudget,
} from "./group-session-memory-snapshot";

// ===== merged from group-memory-shared-part-01.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");

export const GROUP_SESSION_SCOPED_MEMORY_DIR = path.join(CCM_DIR, "group-memory-sessions");

export const GROUP_MEMORY_SOURCE_MANIFEST_VERSION = 1;

export const GROUP_MEMORY_RELOAD_AUDIT_VERSION = 1;

export const GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = 1;

export const GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = 1;

export const GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = 1;

export const GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = 1;

export const GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = 1;

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = 1;

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = 1;

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = 3;

export const GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS = 2_000;

export const GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS = 12_000;

export const GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT = 10_000;

export const GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES = 5_000;

export const GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;

export const GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = 1;

export const GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = 1;

export const GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = 1;

export const GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = 1;

export const GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = 1;

export const GROUP_MEMORY_RELOAD_DIR = path.join(CCM_DIR, "group-memory-reload");

export const GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR = path.join(CCM_DIR, "group-memory-post-compact-dispatch");

export const GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR = path.join(CCM_DIR, "group-memory-post-compact-candidate-usage");

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = path.join(CCM_DIR, "group-api-microcompact-native-apply-proof");

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = path.join(CCM_DIR, "group-api-microcompact-native-apply-request-telemetry");

export const GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(CCM_DIR, "group-memory-replay-repair");

export const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-work-items");

export const GROUP_SESSION_MEMORY_DIR = path.join(CCM_DIR, "group-session-memory");

export const GROUP_TOOL_CONTINUITY_DIR = path.join(CCM_DIR, "group-tool-continuity");

export const GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(CCM_DIR, "group-memory-file-references");

export const GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(CCM_DIR, "group-global-memory-arbitration");

export function cleanGroupMemoryScopePart(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}

export function getGroupSessionMemoryScopeId(groupId: string, sessionId = "") {
  const cleanSessionId = String(sessionId || "").trim();
  return !cleanSessionId || cleanSessionId === "default" ? groupId : `${groupId}--${cleanSessionId}`;
}

export function buildGroupCompactBoundaryHistorySummary(memory: any = {}) {
  const boundaries = Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : [];
  if (!boundaries.length) return null;
  const rows = boundaries.slice(-8).map((boundary: any, index: number) => ({
    index,
    id: String(boundary.id || boundary.boundary_id || boundary.summaryChecksum || boundary.summary_checksum || boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || `boundary-${index}`),
    summaryChecksum: String(boundary.summaryChecksum || boundary.summary_checksum || ""),
    summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || ""),
    compactedMessageCount: Number(boundary.summarizedMessageCount || boundary.summarized_message_count || boundary.compactedMessageCount || boundary.compacted_message_count || 0),
    preCompactTokenCount: Number(boundary.preCompactTokenCount || boundary.pre_compact_token_count || 0),
    postCompactTokenCount: Number(boundary.postCompactTokenCount || boundary.post_compact_token_count || 0),
  }));
  return {
    schema: "ccm-compact-boundary-history-summary-v1",
    boundaryCount: rows.length,
    latest: rows[rows.length - 1] || null,
    rows,
  };
}

export function uniqueByKey(items: any[], keyFn: (item: any) => string, limit = 20) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of [...(items || [])].reverse()) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.unshift(item);
  }
  return result.slice(-limit);
}

export function compactMemoryText(value: any, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function compactPreserveLines(value: any, max = 2200) {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}

export function hashSessionMemoryText(value: any, length = 16) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

export function writeTextAtomic(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, text, "utf-8");
  fs.renameSync(temp, file);
}

export function writeJsonAtomic(file: string, value: any) {
  writeTextAtomic(file, JSON.stringify(value, null, 2));
}

export function memoryTextsMayConflict(globalText: string, localText: string) {
  return scoreMemorySemanticContradiction(globalText, localText).conflict === true;
}

export function intersectionValues(a: string[] = [], b: string[] = []) {
  const right = new Set(b);
  return a.filter(value => right.has(value));
}

export function groupSessionMemoryToolCallCount(message: any = {}) {
  const direct = [message.tool_calls, message.toolCalls, message.tool_uses, message.toolUses]
    .filter(Array.isArray)
    .reduce((sum: number, rows: any[]) => sum + rows.length, 0);
  const content = Array.isArray(message?.content)
    ? message.content
    : Array.isArray(message?.message?.content) ? message.message.content : [];
  return direct + content.filter((block: any) => String(block?.type || "").toLowerCase() === "tool_use").length;
}

export function inspectGroupSessionMemoryToolCallsSince(messages: any[], sinceMessageId = "") {
  const rows = Array.isArray(messages) ? messages : [];
  const start = sinceMessageId
    ? rows.findIndex((message: any, index: number) => getMemoryMessageIdentity(message, index) === sinceMessageId)
    : -1;
  if (sinceMessageId && start < 0) {
    return {
      count: 0,
      cursorStatus: "not_found",
      cursorIndex: -1,
      scannedMessageCount: 0,
    };
  }
  const scanned = rows.slice(Math.max(0, start + 1));
  return {
    count: scanned.reduce((sum: number, message: any) => sum + groupSessionMemoryToolCallCount(message), 0),
    cursorStatus: sinceMessageId ? "resolved" : "not_set",
    cursorIndex: start,
    scannedMessageCount: scanned.length,
  };
}

export function groupSessionMemoryLastAssistantTurnHasToolCalls(messages: any[]) {
  const rows = Array.isArray(messages) ? messages : [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (String(row?.role || row?.type || "").toLowerCase() === "assistant") return groupSessionMemoryToolCallCount(row) > 0;
  }
  return false;
}

export function resolveGroupSessionMemoryExtractionCursor(cadenceDecision: any = {}) {
  const shouldExtract = cadenceDecision.shouldExtract === true;
  const cursorBefore = String(cadenceDecision.lastExtractionMessageId || cadenceDecision.last_extraction_message_id || "");
  const cursorAdvanceSafe = cadenceDecision.lastAssistantTurnHasToolCalls !== true;
  const cursorAfter = shouldExtract && cursorAdvanceSafe
    ? String(cadenceDecision.lastObservedMessageId || cadenceDecision.last_observed_message_id || cursorBefore)
    : cursorBefore;
  const cursorAdvanceStatus = !shouldExtract
    ? "not_extracted"
    : cursorAdvanceSafe ? "advanced" : "held_tool_use_boundary";
  return {
    cursorAdvanceStatus,
    cursorAdvanceSafe,
    cursorBefore,
    cursorAfter,
    cursorHeldReason: cursorAdvanceStatus === "held_tool_use_boundary"
      ? "last_assistant_turn_has_tool_calls"
      : "",
  };
}

export function renderGroupSessionMemoryMarkdown(groupId: string, memory: any = {}) {
  const compaction = memory.compaction || {};
  const compression = memory.messageCompression || {};
  const boundary = memory.compactBoundary || {};
  const summaryText = compactPreserveLines(memory.messageDigest || renderConversationSummary(memory.conversationSummary || null), 5200);
  const lines = [
    "# CCM Group Session Memory",
    "",
    `- groupId: ${groupId}`,
    `- generatedAt: ${new Date().toISOString()}`,
    `- strategy: ${compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"}`,
    `- lastSummarizedMessageId: ${compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""}`,
    `- summaryChecksum: ${compaction.summaryChecksum || boundary.summaryChecksum || ""}`,
    `- compactedMessages: ${Number(compaction.compactedMessageCount || compression.compressedMessages || 0)}`,
    `- preservedRecentMessages: ${Number(compaction.preservedRecentMessages || compression.recentMessages || 0)}`,
    "",
    "## Goal",
    memory.goal || "未记录",
    "",
    "## Session Summary",
    summaryText || "暂无压缩摘要；当前群聊仍处于近期原文窗口。",
  ];
  const addList = (title: string, items: any[], mapper: (item: any) => string, limit = 10) => {
    const rows = (Array.isArray(items) ? items : []).slice(-limit).map(mapper).filter(Boolean);
    if (!rows.length) return;
    lines.push("", `## ${title}`);
    for (const row of rows) lines.push(`- ${compactPreserveLines(row, 420)}`);
  };
  addList("Persistent Requirements", memory.persistentRequirements || [], (item: any) => item.text || item.value || String(item || ""), 16);
  addList("Fact Anchors", memory.factAnchors || [], (item: any) => item.text || item.value || String(item || ""), 16);
  addList("Decisions", memory.decisions || [], (item: any) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 10);
  addList("Worker State", memory.workerLedger || [], (item: any) => `${item.project || item.agent || "unknown"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 12);
  addList("Open Questions", memory.openQuestions || [], (item: any) => item.question || String(item || ""), 8);
  addList("Next Actions", memory.nextActions || [], (item: any) => item.action || String(item || ""), 8);
  lines.push(
    "",
    "## Use Policy",
    "- Treat this file as the compacted session memory for this group chat.",
    "- Child Agent sessions may be fresh third-party CLI sessions; inject this summary together with recent raw messages.",
    "- If the user asks to ignore memory, behave as if this file were empty and declare memoryIgnored in the receipt.",
  );
  return enforceGroupSessionMemoryBudget(lines.join("\n")).markdown;
}

export function mergeToolGrantSets(...sets: any[]) {
  const merged = { mcp: new Set<string>(), skill: new Set<string>() };
  for (const set of sets || []) {
    let normalized = { mcp: [], skill: [] } as any;
    try {
      normalized = normalizeToolAuthorization(set || {});
    } catch {}
    for (const value of normalized.mcp || []) merged.mcp.add(String(value || "").trim());
    for (const value of normalized.skill || []) merged.skill.add(String(value || "").trim());
  }
  return {
    mcp: Array.from(merged.mcp).filter(Boolean).slice(0, 120),
    skill: Array.from(merged.skill).filter(Boolean).slice(0, 120),
  };
}

export function countToolGrantSet(set: any = {}) {
  return (Array.isArray(set.mcp) ? set.mcp.length : 0) + (Array.isArray(set.skill) ? set.skill.length : 0);
}

export function hasToolGrantSet(set: any = {}) {
  return countToolGrantSet(set) > 0;
}

export function extractToolGrantSet(value: any = {}) {
  return mergeToolGrantSets(value?.allowedTools || value?.allowed_tools || value?.tools || value);
}

export function compactReferenceFingerprint(references: any[] = []) {
  return hashSessionMemoryText((references || []).map((item: any) => ({
    id: item.reference_id,
    path: normalizeCompactFileReferencePath(item.path || ""),
    checksum: item.checksum || "",
  })), 16);
}

export function summarizeMemoryItems(title: string, items: any[], mapper: (item: any) => string) {
  const values = (items || []).map(mapper).filter(Boolean);
  if (!values.length) return "";
  return `${title}: ${values.join("；")}`;
}

export function compressGroupMemory(memory: any) {
  const next = { ...(memory || {}) };
  const summaryParts: string[] = [];
  const compressList = (key: string, keep = 8, title = key, mapper = (item: any) => JSON.stringify(item)) => {
    const items = Array.isArray(next[key]) ? next[key] : [];
    if (items.length <= keep) return;
    const oldItems = items.slice(0, Math.max(0, items.length - keep));
    next[key] = items.slice(-keep);
    const summary = summarizeMemoryItems(title, oldItems, mapper);
    if (summary) summaryParts.push(summary);
  };

  compressList("decisions", 8, "历史决策", (item: any) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
  compressList("completed", 10, "历史完成", (item: any) => `${item.project || "unknown"}:${item.summary || ""}`);
  compressList("blocked", 8, "历史阻塞", (item: any) => `${item.project || "unknown"}:${item.reason || ""}`);
  compressList("workerLedger", 18, "历史 Worker 通知", (item: any) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
  if (!next.agentMemories || !Object.keys(next.agentMemories || {}).length) {
    next.agentMemories = normalizeAgentMemories({}, next.workerLedger || []);
  }
  compressList("openQuestions", 6, "历史问题", (item: any) => String(item.question || item));
  compressList("nextActions", 6, "历史下一步", (item: any) => String(item.action || item));

  const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
  next.summary = compactMemoryText(mergedSummary, 1800);
  return next;
}

export function normalizeAgentMemoryProject(project: string) {
  return String(project || "").trim() || "unknown";
}

export function resolveGroupProjectMemoryRoot(project: string, options: any = {}) {
  const explicit = options.projectRoot || options.project_root || options.workDir || options.work_dir;
  if (explicit) return path.resolve(String(explicit));
  try {
    const workDir = getWorkDirForProject(project);
    return workDir ? path.resolve(String(workDir)) : "";
  } catch {
    return "";
  }
}

export function formatAgentMemoryReceipt(item: any) {
  return [
    `[${item.status || item.receiptStatus || "unknown"}]`,
    item.summary || "无摘要",
    item.filesChanged?.length ? `文件：${item.filesChanged.slice(0, 6).join("、")}` : "",
    item.verification?.length ? `验证：${item.verification.slice(0, 4).join("、")}` : "",
    item.blockers?.length ? `阻塞：${item.blockers.slice(0, 3).join("、")}` : "",
    item.needs?.length ? `需要：${item.needs.slice(0, 3).join("、")}` : "",
  ].filter(Boolean).join("；");
}

export function createEmptyAgentMemory(project: string) {
  return {
    project: normalizeAgentMemoryProject(project),
    summary: "",
    recentReceipts: [],
    frequentFiles: [],
    verificationHints: [],
    blockers: [],
    needs: [],
    stats: { totalReceipts: 0, compressedReceipts: 0, recentReceipts: 0, lastUpdatedAt: "" },
  };
}

export function normalizeAgentMemories(agentMemories: any = {}, workerLedger: any[] = []) {
  let next = { ...(agentMemories || {}) };
  for (const item of workerLedger || []) next = upsertAgentMemory(next, item);
  return next;
}

export function removeSessionDirectoryWithin(root: string, target: string) {
  const safeRoot = path.resolve(root);
  const safeTarget = path.resolve(target);
  if (safeTarget === safeRoot || !safeTarget.startsWith(`${safeRoot}${path.sep}`)) throw new Error(`unsafe session artifact path: ${safeTarget}`);
  if (!fs.existsSync(safeTarget)) return 0;
  let deleted = 0;
  for (const entry of fs.readdirSync(safeTarget, { withFileTypes: true })) {
    const child = path.join(safeTarget, entry.name);
    if (entry.isDirectory()) deleted += removeSessionDirectoryWithin(root, child);
    else { fs.unlinkSync(child); deleted += 1; }
  }
  fs.rmdirSync(safeTarget);
  return deleted;
}

export function getMemoryMessageContent(message: any) {
  return String(message?.content || message?.delivery_summary?.headline || message?.receipt?.summary || "").trim();
}

export function getMemoryMessageIdentity(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

export function getMemoryMessageActor(message: any) {
  if (message?.role === "user") return `用户 -> ${message?.target || "all"}`;
  return message?.agent || message?.role || "Agent";
}

export function anchorChecksum(type: string, text: string) {
  return crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16);
}

export function buildFactAnchor(message: any, index: number, type: string, text: string) {
  const compacted = compactPreserveLines(text, 1600);
  if (!compacted) return null;
  const messageId = getMemoryMessageIdentity(message, index);
  return {
    id: `${messageId}:${type}`,
    type,
    messageId,
    actor: getMemoryMessageActor(message),
    text: compacted,
    timestamp: String(message?.timestamp || message?.time || ""),
    checksum: anchorChecksum(type, compacted),
  };
}

export function mergeFactAnchorList(existing: any[] = [], incoming: any[] = [], limit = 300) {
  const merged = new Map<string, any>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!item?.id || !item?.text) continue;
    merged.set(String(item.id), item);
  }
  return [...merged.values()].slice(-limit);
}

export function extractGroupFactAnchors(messages: any[]) {
  const anchors: any[] = [];
  for (let index = 0; index < (messages || []).length; index += 1) {
    const message = messages[index];
    const content = getMemoryMessageContent(message);
    if (!content) continue;
    if (message?.role === "user") {
      const anchor = buildFactAnchor(message, index, "user_requirement", content);
      if (anchor) anchors.push(anchor);
    }
    if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason || Array.isArray(message?.assignments) && message.assignments.length) {
      const anchor = buildFactAnchor(
        message,
        index,
        "dispatch_decision",
        `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`
      );
      if (anchor) anchors.push(anchor);
    }
  }
  return anchors;
}

export function extractPersistentRequirementsFromAnchors(anchors: any[]) {
  return (anchors || []).filter((item: any) =>
    item?.type === "user_requirement"
    && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|保留|优先|must\b|never\b|always\b|do not\b|required?\b)/i.test(String(item.text || ""))
  ).slice(-120);
}

export function getCompactBoundaryIndex(memory: any, messages: any[]) {
  const boundaryId = String(
    memory?.compactBoundary?.summarizedThroughMessageId
      || memory?.compaction?.lastCompactedMessageId
      || ""
  );
  if (!boundaryId) return -1;
  return (messages || []).findIndex((message: any, index: number) => getMemoryMessageIdentity(message, index) === boundaryId);
}

export function clearUntrustedGroupCompactionState(memory: any, reason: string) {
  const now = new Date().toISOString();
  return {
    ...(memory || {}),
    conversationSummary: null,
    messageDigest: "",
    compactBoundary: null,
    compaction: {
      version: GROUP_MEMORY_COMPACTION_VERSION,
      enabled: true,
      health: "recovering",
      boundaries: [],
      compactedMessageCount: 0,
      preservedRecentMessages: 0,
      lastCompactedMessageId: "",
      summaryChecksum: "",
      resumeRecovery: {
        schema: "ccm-group-memory-resume-recovery-v1",
        status: "rebuilding_from_full_raw_transcript",
        reason,
        startedAt: now,
      },
    },
    messageCompression: {
      ...(memory?.messageCompression || {}),
      compressedMessages: 0,
      lastCompressedAt: "",
      preservedSegment: null,
    },
  };
}

export function appendGroupMemorySnipBoundaryMarker(
  groupId: string,
  groupSessionId: string,
  removedMessageIds: string[],
  options: any = {}
) {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  if (!id || !sessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_snip_boundary_append");
  const messages = getGroupMessages(id, sessionId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const existingIds = new Set(messages.map((message: any, index: number) => getMemoryMessageIdentity(message, index)));
  const requestedIds = [...new Set((Array.isArray(removedMessageIds) ? removedMessageIds : [])
    .map(item => String(item || "").trim()).filter(Boolean))];
  const missingIds = requestedIds.filter(messageId => !existingIds.has(messageId));
  if (!requestedIds.length) throw new Error("snip_boundary_removed_message_ids_required");
  if (missingIds.length && options.allowMissing !== true && options.allow_missing !== true) {
    throw new Error(`snip_boundary_message_ids_not_found:${missingIds.slice(0, 8).join(",")}`);
  }
  const effectiveIds = options.allowMissing === true || options.allow_missing === true
    ? requestedIds.filter(messageId => existingIds.has(messageId))
    : requestedIds;
  if (!effectiveIds.length) throw new Error("snip_boundary_has_no_existing_message_ids");
  const parentMessage = messages[messages.length - 1] || null;
  const marker = buildGroupMemorySnipBoundaryMarker({
    ...options,
    groupId: id,
    groupSessionId: sessionId,
    removedMessageIds: effectiveIds,
    parentUuid: options.parentUuid
      || options.parent_uuid
      || (parentMessage ? getMemoryMessageIdentity(parentMessage, messages.length - 1) : null),
  });
  const appended = appendGroupMessage(id, marker);
  return {
    schema: "ccm-group-history-snip-boundary-append-v1",
    version: 1,
    groupId: id,
    groupSessionId: sessionId,
    appended: true,
    marker: appended,
    removedMessageCount: effectiveIds.length,
    missingMessageCount: missingIds.length,
    removalChecksum: marker.snipMetadata.removedUuidsChecksum,
  };
}

export function buildGroupMemoryResumeEffectiveTokenBaseline(
  projection: any,
  memory: any,
  allMessages: any[],
  options: any = {}
) {
  if (projection?.status !== "verified" || projection?.useProjection !== true) return null;
  const rawMessages = (allMessages || []).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const projectedMessages = Array.isArray(projection.projectedMessages) ? projection.projectedMessages : [];
  const omittedMessageCount = Math.max(0, Math.min(rawMessages.length, Number(projection.omittedMessageCount || 0)));
  const rawTranscriptTokens = rawMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const omittedRawTokens = rawMessages.slice(0, omittedMessageCount)
    .reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const projectedMessageTokens = projectedMessages
    .reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const summaryText = String(memory?.messageDigest || renderConversationSummary(memory?.conversationSummary || null) || "");
  const summaryTokens = estimateGroupTextTokens(summaryText);
  const effectiveContextTokens = summaryTokens + projectedMessageTokens;
  const pressureWarning = calculateGroupCompactWarningState({
    activeTokens: effectiveContextTokens,
    activeMessageCount: projectedMessages.length,
    autoCompactThreshold: options.autoCompactThreshold || options.auto_compact_threshold,
    config: options.config || options,
  });
  const core: any = {
    schema: "ccm-group-memory-resume-effective-token-baseline-v1",
    version: 1,
    groupId: String(projection.groupId || memory?.groupId || ""),
    groupSessionId: String(projection.sessionId || memory?.groupSessionId || ""),
    boundaryId: String(projection.boundary?.boundaryId || ""),
    summaryChecksum: String(projection.boundary?.summaryChecksum || memory?.compaction?.summaryChecksum || ""),
    projectionChecksum: String(projection.projectionChecksum || ""),
    rawMessageCount: rawMessages.length,
    omittedMessageCount,
    snipOmittedMessageCount: Math.max(0, Number(projection.snipOmittedMessageCount || 0)),
    totalOmittedMessageCount: Math.max(0, Number(projection.totalOmittedMessageCount || omittedMessageCount)),
    projectedMessageCount: projectedMessages.length,
    rawTranscriptTokens,
    omittedRawTokens,
    projectedMessageTokens,
    summaryTokens,
    effectiveContextTokens,
    tokenSavings: Math.max(0, rawTranscriptTokens - effectiveContextTokens),
    staleProviderUsageTokensExcluded: Math.max(0, Number(projection.staleProviderUsageTokensExcluded || 0)),
    usageSanitizedMessageCount: Math.max(0, Number(projection.usageSanitizedMessageCount || 0)),
    snipRemovedMessageCount: Math.max(0, Number(projection.snipReplay?.removedMessageCount || 0)),
    snipRemovedTokenEstimate: Math.max(0, Number(projection.snipReplay?.removedTokenEstimate || 0)),
    snipRelinkedMessageCount: Math.max(0, Number(projection.snipReplay?.relinkedMessageCount || 0)),
    snipRemovalChecksum: String(projection.snipReplay?.removalChecksum || ""),
    resumeConsistencyDelta: Number(projection.roundTripConsistency?.delta || 0),
    resumeConsistencyChecksum: String(projection.roundTripConsistency?.checksum || ""),
    calculation: "effective_context_tokens=summary_tokens+projected_message_tokens; committed_prefix_raw_tokens, replayed_snip_ranges, and preserved_provider_usage_are_excluded",
    pressureWarning,
  };
  const baselineChecksum = crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0, 32);
  return {
    ...core,
    baselineId: `gmrb_${baselineChecksum.slice(0, 20)}`,
    baselineChecksum,
    observedAt: String(options.now || new Date().toISOString()),
  };
}

export function validateGroupMemoryResumeEffectiveTokenBaseline(baseline: any) {
  if (baseline?.schema !== "ccm-group-memory-resume-effective-token-baseline-v1") return false;
  const { baselineId, baselineChecksum, observedAt, ...core } = baseline || {};
  const calculated = crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0, 32);
  return String(baselineChecksum || "") === calculated
    && String(baselineId || "") === `gmrb_${calculated.slice(0, 20)}`;
}

export function getGroupMessagesFileHint(groupId: string, sessionId = "") {
  return getGroupChatSessionMessagesFile(groupId, sessionId);
}

export function buildGroupMemorySourceEntry(id: string, sourcePath: string, purpose: string, extra: any = {}) {
  const file = String(sourcePath || "");
  const entry: any = {
    id,
    purpose,
    path: file,
    exists: false,
    kind: "missing",
    bytes: 0,
    mtimeMs: 0,
    mtime: "",
    checksum: "",
    checksumMode: "",
    status: file ? "missing" : "missing_path",
    ...extra,
  };
  if (!file) return entry;
  try {
    const stat = fs.statSync(file);
    entry.exists = true;
    entry.bytes = stat.size;
    entry.mtimeMs = Math.round(stat.mtimeMs);
    entry.mtime = stat.mtime.toISOString();
    if (stat.isDirectory()) {
      entry.kind = "directory";
      const names = fs.readdirSync(file).filter(Boolean).sort();
      entry.childCount = names.length;
      entry.checksum = crypto.createHash("sha256").update(names.join("\n")).digest("hex").slice(0, 24);
      entry.checksumMode = "directory_listing";
    } else if (stat.isFile()) {
      entry.kind = "file";
      const digest = hashGroupMemoryFileWindow(file, stat);
      entry.checksum = digest.checksum;
      entry.checksumMode = digest.checksumMode;
      entry.lineCount = digest.lineCount;
    } else {
      entry.kind = "other";
      entry.checksum = crypto.createHash("sha256").update(`${stat.size}:${stat.mtimeMs}`).digest("hex").slice(0, 24);
      entry.checksumMode = "stat";
    }
    entry.status = "present";
  } catch (error: any) {
    entry.status = "unreadable";
    entry.error = compactMemoryText(error?.message || error, 260);
  }
  return entry;
}

export function readGroupMemoryReloadLedger(groupId: string, sessionId = "") {
  const file = getGroupMemoryReloadLedgerFile(groupId, sessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
    };
  } catch {
    return {
      schema: "ccm-group-memory-reload-ledger-v1",
      version: 1,
      groupId,
      groupSessionId: String(sessionId || "default"),
      file,
      scopes: {},
      entries: [],
      updatedAt: "",
    };
  }
}

export function writeGroupMemoryReloadLedger(groupId: string, ledger: any, sessionId = "") {
  const file = getGroupMemoryReloadLedgerFile(groupId, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-memory-reload-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: String(sessionId || "default"),
    scopes: ledger.scopes || {},
    entries: (ledger.entries || []).slice(-120),
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function readGroupPostCompactDispatchLedger(groupId: string, sessionId = "") {
  const file = getGroupPostCompactDispatchLedgerFile(groupId, sessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
    };
  } catch {
    return {
      schema: "ccm-group-post-compact-dispatch-ledger-v1",
      version: 1,
      groupId,
      groupSessionId: String(sessionId || "default"),
      file,
      scopes: {},
      entries: [],
      updatedAt: "",
    };
  }
}

export function writeGroupPostCompactDispatchLedger(groupId: string, ledger: any, sessionId = "") {
  const file = getGroupPostCompactDispatchLedgerFile(groupId, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({
    schema: "ccm-group-post-compact-dispatch-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: String(sessionId || "default"),
    scopes: ledger.scopes || {},
    entries: (ledger.entries || []).slice(-160),
    updatedAt: ledger.updatedAt || new Date().toISOString(),
  }, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function normalizePostCompactUsageState(value: any) {
  const state = String(value || "").toLowerCase().trim();
  if (["used", "ignored", "verified", "mentioned"].includes(state)) return state;
  if (state === "checked" || state === "reviewed" || state === "validated") return "verified";
  if (state === "skipped" || state === "unused" || state === "not_used") return "ignored";
  return "";
}

export function usageRecommendationForStats(stats: any = {}) {
  const used = Number(stats.used_count || 0);
  const verified = Number(stats.verified_count || 0);
  const ignored = Number(stats.ignored_count || 0);
  const mentioned = Number(stats.mentioned_count || 0);
  if (used + verified >= ignored + mentioned + 2) return "promote_recall";
  if (ignored >= used + verified + 2) return "deprioritize_or_distill";
  if (mentioned > 0 && used + verified + ignored === 0) return "require_usage_receipt";
  return "neutral_verify_current_context";
}

export function stableApiMicrocompactJson(value: any): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableApiMicrocompactJson(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableApiMicrocompactJson(value[key])}`).join(",")}}`;
}

export function stableApiMicrocompactChecksum(value: any, length = 24) {
  return crypto.createHash("sha256").update(stableApiMicrocompactJson(value)).digest("hex").slice(0, length);
}

export function apiMicrocompactHeaderValue(headers: any, name: string) {
  if (!headers) return "";
  const wanted = String(name || "").toLowerCase();
  if (typeof headers.get === "function") {
    try { return String(headers.get(name) || headers.get(wanted) || ""); } catch {}
  }
  if (Array.isArray(headers)) {
    const match = headers.find((row: any) => String(row?.[0] || "").toLowerCase() === wanted);
    return String(match?.[1] || "");
  }
  if (typeof headers === "object") {
    const key = Object.keys(headers).find(item => item.toLowerCase() === wanted);
    return key ? String(headers[key] || "") : "";
  }
  return "";
}

export function apiMicrocompactBetaHeadersFromHeaders(headers: any) {
  const raw = [
    apiMicrocompactHeaderValue(headers, "anthropic-beta"),
    apiMicrocompactHeaderValue(headers, "x-anthropic-beta"),
  ].filter(Boolean).join(",");
  return raw.split(",").map(item => item.trim()).filter(Boolean);
}

export function uniqueApiMicrocompactStrings(...values: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.flat(Infinity)) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

export function buildStableSourceFingerprint(sourceManifest: any = {}) {
  const entries = Array.isArray(sourceManifest.entries) ? sourceManifest.entries : [];
  const stable = entries.map((entry: any) => ({
    id: entry.id,
    purpose: entry.purpose,
    path: entry.path,
    exists: entry.exists === true,
    kind: entry.kind || "",
    bytes: Number(entry.bytes || 0),
    lineCount: Number(entry.lineCount || 0),
    childCount: Number(entry.childCount || 0),
  }));
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 24);
}

// ===== merged from group-memory-shared-part-02.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function resolvePostCompactBoundaryMarkerParts(groupId: string, input: any = {}) {
  const compaction = input.compaction || {};
  const boundary = input.compactBoundary || input.compact_boundary || compaction.boundary || {};
  const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
  const recoveryAudit = input.postCompactRecoveryAudit
    || input.post_compact_recovery_audit
    || gate.post_compact_recovery_audit
    || gate.postCompactRecoveryAudit
    || {};
  const rawBoundaryId = String(
    input.rawBoundaryId
      || input.raw_boundary_id
      || boundary.id
      || recoveryAudit.boundaryId
      || recoveryAudit.boundary_id
      || ""
  );
  const summarizedThroughMessageId = String(
    input.lastCompactedMessageId
      || input.last_compacted_message_id
      || compaction.lastCompactedMessageId
      || compaction.last_compacted_message_id
      || boundary.summarizedThroughMessageId
      || boundary.summarized_through_message_id
      || ""
  );
  const summaryChecksum = String(
    input.summaryChecksum
      || input.summary_checksum
      || compaction.summaryChecksum
      || compaction.summary_checksum
      || boundary.summaryChecksum
      || boundary.summary_checksum
      || recoveryAudit.summaryChecksum
      || recoveryAudit.summary_checksum
      || gate.summary_checksum
      || ""
  );
  const compactedMessageCount = Number(
    input.compactedMessageCount
      || input.compacted_message_count
      || compaction.compactedMessageCount
      || compaction.compacted_message_count
      || boundary.summarizedMessageCount
      || boundary.summarized_message_count
      || 0
  );
  const hasPostCompactBoundary = !!(rawBoundaryId || summarizedThroughMessageId || summaryChecksum)
    && (compactedMessageCount > 0 || !!gate?.schema || !!compaction.postCompactReinject || !!compaction.post_compact_reinject);
  if (!hasPostCompactBoundary) return null;
  const boundaryId = `pcb_${crypto.createHash("sha256").update(JSON.stringify([
    groupId,
    summarizedThroughMessageId,
    summaryChecksum,
    rawBoundaryId && !summarizedThroughMessageId ? rawBoundaryId : "",
  ])).digest("hex").slice(0, 18)}`;
  return {
    boundaryId,
    rawBoundaryId,
    summarizedThroughMessageId,
    summaryChecksum,
    compactedMessageCount,
  };
}

export const GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = Math.max(
  250,
  Number(process.env.CCM_GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS || 2500)
);

export const groupMemoryAutoCompactTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const groupMemoryAutoCompactRunning = new Set<string>();

export const groupMemoryAutoCompactPending = new Set<string>();

export {
  groupMemoryAutoCompactHookRegistered,
  isGroupMemoryAutoCompactHookRegistered,
  markGroupMemoryAutoCompactHookRegistered,
} from "./group-memory-auto-compact-hook-state";

export function loadGroupMemoryCompactionConfig(overrides: any = {}) {
  let config: any = {};
  try {
    const mod = require("./group-orchestrator");
    if (typeof mod.loadOrchestratorConfig === "function") config = mod.loadOrchestratorConfig();
  } catch {}
  return { ...(config || {}), ...(overrides || {}) };
}

export function isGroupModelCompactionEnabled(config: any) {
  return config?.memoryCompactionUseModel === true
    || ["hybrid", "model-required"].includes(String(config?.memoryCompactionMode || "").toLowerCase());
}

export function buildBackgroundCompactionState(input: any = {}) {
  return {
    status: String(input.status || "unknown"),
    reason: String(input.reason || ""),
    messageId: String(input.messageId || ""),
    compacted: input.compacted === true,
    modelCompactionEnabled: input.modelCompactionEnabled === true,
    rebuild: input.rebuild === true,
    force: input.force === true,
    boundaryId: String(input.boundaryId || ""),
    summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
    keepIndex: Number(input.keepIndex || 0),
    messageCount: Number(input.messageCount || 0),
    typedMemoryScopeId: String(input.typedMemoryScopeId || input.typed_memory_scope_id || ""),
    error: compactMemoryText(input.error || "", 500),
    startedAt: String(input.startedAt || ""),
    completedAt: String(input.completedAt || new Date().toISOString()),
  };
}

// Defer until the current require graph finishes so context ↔ shared cycles don't see incomplete exports.
setImmediate(() => {
  try {
    const { ensureGroupMemoryAutoCompactionHook } = require("./group-memory-context");
    if (typeof ensureGroupMemoryAutoCompactionHook !== "function") {
      console.warn("[group-memory] ensureGroupMemoryAutoCompactionHook unavailable during module init");
      return;
    }
    const result = ensureGroupMemoryAutoCompactionHook();
    if (!result || result.registered !== true) {
      console.warn("[group-memory] auto-compact hook registration returned unexpected result", result);
    }
  } catch (err: any) {
    console.warn(
      "[group-memory] auto-compact hook registration failed:",
      err?.message || String(err || "unknown error")
    );
  }
});

export const PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH = "provider-ranking-provenance-compact-repair-receipt-memory.md";

export const PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH = "provider-ranking-memory-usage-receipt-discipline.md";

export const POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH = "post-compact-reinjection-repair-receipt-memory.md";

export const POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH = "post-compact-reinjection-repair-receipt-cautions.md";

export const POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH = "post-compact-receipt-memory-usage-repair-completions.md";

export const POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH = "post-compact-completion-memory-preservation-repair-closures.md";

export const POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";

export function uniqueProviderRankingCompactRepairRecallStrings(values: any[] = [], limit = 40) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values.flatMap((value: any) => Array.isArray(value) ? value : [value])) {
    const value = String(raw || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

export function isProviderRankingProvenanceCompactRepairReceiptRecallQuery(value: any) {
  const text = String(value || "").toLowerCase();
  return /provider[-_\s]?ranking|provider switch|provider-switch|provider_switch|provenance|compact repair|compact[-_\s]?repair|replayrepairdispatchbriefusage|replay repair dispatch|ranking evidence|fresh valid provider switch|供应商|提供商|排序|来源|压缩.*修复|修复.*压缩/.test(text);
}

export function isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery(value: any, rows: any[] = []) {
  const text = String(value || "").toLowerCase();
  if (/corrected[-_\s]?receipt|receipt[-_\s]?memory[-_\s]?usage|memoryused|memoryignored|current source|recovery evidence|回执修复|记忆使用|当前源|恢复证据/.test(text)) {
    return true;
  }
  return rows.some((row: any) => [
    row.work_item_id,
    row.brief_id,
    row.timeline_binding_id,
    row.original_worker_context_packet_id,
    ...(Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths : []),
  ].some((token: any) => {
    const normalized = String(token || "").trim().toLowerCase();
    return normalized.length >= 4 && text.includes(normalized);
  }));
}

export function isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery(value: any, rows: any[] = []) {
  const text = String(value || "").toLowerCase();
  if (/completion[-_\s]?memory|compact[-_\s]?preservation|corrected[-_\s]?(retry|outcome)|exact identity|authority boundary|压缩.*保全|保全.*修复|纠正.*结果|会话权限/.test(text)) {
    return true;
  }
  return rows.some((row: any) => [
    row.work_item_id,
    row.failed_retry_id,
    row.failed_outcome_id,
    row.corrected_retry_id,
    row.corrected_outcome_id,
    ...(Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths : []),
    ...(Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids : []),
    ...(Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids : []),
  ].some((token: any) => {
    const normalized = String(token || "").trim().toLowerCase();
    return normalized.length >= 4 && text.includes(normalized);
  }));
}

export const TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS = 5;

export const TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT = 4096;

export const TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT = 200;

export const TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES = 60 * 1024;

export function findMemoryArtifactBySchema(value: any, schema: string, seen = new Set<any>()): any {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (value.schema === schema) return value;
  for (const nested of Array.isArray(value) ? value : Object.values(value)) {
    const found = findMemoryArtifactBySchema(nested, schema, seen);
    if (found) return found;
  }
  return null;
}

export function runnerRequestHasDurableReturnEvidence(record: any) {
  const runnerRequestId = String(record.runner_request_id || "");
  if (!runnerRequestId) return true;
  const requestFile = path.join(CCM_DIR, "agent-runner", "requests", `${runnerRequestId}.json`);
  const resultFile = path.join(CCM_DIR, "agent-runner", "results", `${runnerRequestId}.json`);
  if (!fs.existsSync(requestFile) || !fs.existsSync(resultFile)) return false;
  try {
    const request = JSON.parse(fs.readFileSync(requestFile, "utf-8"));
    const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
    if (String(request.id || "") !== runnerRequestId || String(result.id || "") !== runnerRequestId) return false;
    if (request.schema === DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA && validateDirectAgentDispatchPair(request, result).valid !== true) return false;
    if (String(request.taskAgentSessionId || "") !== String(record.task_agent_session_id || "")) return false;
    if (String(request.groupId || "") !== String(record.group_id || "")) return false;
    const execution = record.execution_id ? loadExecution(String(record.execution_id)) : null;
    return !execution || (execution.externalRunnerRequestIds || []).includes(runnerRequestId);
  } catch { return false; }
}

export function tokenizeGlobalGroupMemoryQuery(value: any) {
  const text = String(value || "").toLowerCase();
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g)) tokens.add(match[0]);
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) tokens.add(chinese.slice(index, index + 2));
  return [...tokens].slice(0, 120);
}

export function globalGroupMemoryCorpus(group: any, memory: any) {
  const members = (group?.members || []).map((member: any) => [member.project, member.agent, member.platform].filter(Boolean).join(":")).join(" ");
  const listText = (items: any[] = [], mapper = (item: any) => JSON.stringify(item)) => (items || []).slice(-12).map(mapper).join("\n");
  return [
    group?.id,
    group?.name,
    members,
    memory?.goal,
    memory?.currentPhase,
    memory?.summary,
    memory?.messageDigest,
    listText(memory?.persistentRequirements || [], (item: any) => item.text || item),
    listText(memory?.factAnchors || [], (item: any) => item.text || item),
    listText(memory?.decisions || [], (item: any) => item.decision || item),
    listText(memory?.completed || [], (item: any) => `${item.project || ""} ${item.summary || ""}`),
    listText(memory?.blocked || [], (item: any) => `${item.project || ""} ${item.reason || ""}`),
    listText(memory?.nextActions || [], (item: any) => item.action || item),
  ].filter(Boolean).join("\n").toLowerCase();
}

export function scoreGlobalGroupMemoryCandidate(group: any, memory: any, messages: any[], query = "") {
  const queryTokens = tokenizeGlobalGroupMemoryQuery(query);
  let score = 0;
  const corpus = globalGroupMemoryCorpus(group, memory);
  if (!queryTokens.length) score += 1;
  for (const token of queryTokens) {
    if (!token) continue;
    if (corpus.includes(token)) score += token.length >= 5 ? 3 : 1;
  }
  if (String(group?.id || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.id).toLowerCase())) score += 8;
  if (String(group?.name || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.name).toLowerCase())) score += 8;
  if ((memory?.blocked || []).length) score += 2;
  if ((memory?.nextActions || []).length) score += 2;
  if ((memory?.persistentRequirements || []).length) score += 2;
  if ((memory?.completed || []).length) score += 1;
  if ((messages || []).length) score += 1;
  return score;
}

export function latestGroupMessageTimestamp(messages: any[] = []) {
  for (const message of [...(messages || [])].reverse()) {
    const value = String(message?.timestamp || message?.time || message?.created_at || "");
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return value;
  }
  return "";
}

export function normalizeGlobalGroupMemoryMembers(group: any) {
  return (group?.members || []).slice(0, 12).map((member: any) => ({
    project: member.project,
    agent: member.agent,
    platform: member.platform || "",
  }));
}

export function importGroupProjectMemoriesForMembers(groupId: string, group: any, options: any = {}) {
  const rootsByProject = options.projectRoots || options.project_roots || {};
  const imports: any[] = [];
  const seen = new Set<string>();
  for (const member of (group?.members || []).slice(0, Number(options.maxProjectMemoryImportMembers || options.max_project_memory_import_members || 6))) {
    const project = normalizeAgentMemoryProject(member?.project || "");
    if (!project || project === "coordinator" || project === "unknown") continue;
    const explicit = member?.projectRoot || member?.project_root || member?.workDir || member?.work_dir || rootsByProject[project];
    const root = explicit ? path.resolve(String(explicit)) : resolveGroupProjectMemoryRoot(project, {});
    if (!root || seen.has(root.toLowerCase())) continue;
    seen.add(root.toLowerCase());
    imports.push(importProjectMemoryFilesToGroupTypedMemory(groupId, root, {
      project,
      settingSources: options.settingSources ?? options.setting_sources,
      includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
      includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
      maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
      maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
      maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files,
    }));
  }
  return imports;
}

export function getGroupMessageMemoryWho(message: any) {
  if (message?.role === "user") return `[用户 -> ${message.target || "all"}]`;
  if (message?.role === "thinking") return "[系统思考]";
  return `[${message?.agent || "Agent"}]`;
}

export function buildGroupMessageMemoryLine(message: any, max = 260) {
  const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
  const id = message?.id ? `#${message.id}` : "#local";
  const who = getGroupMessageMemoryWho(message);
  const content = compactMemoryText(message?.content || message?.delivery_summary?.headline || "", max);
  const extras: string[] = [];
  if (Array.isArray(message?.assignments) && message.assignments.length) {
    extras.push(`派发:${message.assignments.slice(0, 4).map((item: any) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
  }
  if (message?.fileChanges?.count) extras.push(`文件变更:${message.fileChanges.count}`);
  if (message?.delivery_summary?.headline) extras.push(`交付:${compactMemoryText(message.delivery_summary.headline, 120)}`);
  return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}

export function buildCompressedGroupMessageDigest(messages: any[], limit = 30) {
  const source = (messages || []).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  if (!source.length) return "";
  const omitted = Math.max(0, source.length - limit);
  const lines = source.slice(-limit).map((message: any) => buildGroupMessageMemoryLine(message, 220));
  if (omitted > 0) lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
  return lines.join("\n");
}

export function normalizeMemoryStringArray(value: any) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => String(item || "").trim()).filter(Boolean);
}

export function normalizeWorkerLedgerItem(item: any = {}) {
  return {
    time: item.time || new Date().toISOString(),
    taskId: String(item.taskId || item.task_id || "").trim(),
    project: String(item.project || item.agent || "").trim(),
    status: String(item.status || "").trim(),
    receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
    summary: compactMemoryText(item.summary || "", 320),
    filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
    verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
    blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
    needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
    memoryUsed: normalizeMemoryStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
    memoryIgnored: normalizeMemoryStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
  };
}

export function findLatestWorkerLedger(memory: any, project: string) {
  const target = String(project || "").trim();
  if (!target) return null;
  return [...(memory?.workerLedger || [])].reverse().find((item: any) => item.project === target) || null;
}

export function appendWorkerLedger(memory: any, item: any) {
  const normalized = normalizeWorkerLedgerItem(item);
  if (!normalized.project && !normalized.summary) return memory;
  return {
    ...(memory || {}),
    workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x: any) => [
      x.taskId || "",
      x.project || "",
      x.status || "",
      x.summary || "",
    ].join("|"), 40),
  };
}

export function updateGroupMemory(groupId: string, patch: any = {}) {
  const sessionId = String(patch.groupSessionId || patch.group_session_id || getActiveGroupChatSessionId(groupId));
  const memory = loadGroupMemory(groupId, sessionId);
  const next = { ...memory };
  if (patch.goal && !next.goal) next.goal = compactMemoryText(patch.goal, 500);
  if (patch.currentPhase) next.currentPhase = patch.currentPhase;
  if (patch.decision) {
    next.decisions = uniqueByKey([...(next.decisions || []), {
      time: new Date().toISOString(),
      decision: compactMemoryText(patch.decision, 260),
      reason: compactMemoryText(patch.reason || "", 220),
    }], (item: any) => `${item.decision}|${item.reason}`, 20);
  }
  if (patch.completed) {
    const item = patch.completed;
    next.completed = uniqueByKey([...(next.completed || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      summary: compactMemoryText(item.summary || "", 260),
      filesChanged: item.filesChanged || [],
      verification: item.verification || [],
    }], (x: any) => `${x.project}|${x.summary}`, 30);
    next.blocked = (next.blocked || []).filter((x: any) => x.project !== item.project);
  }
  if (patch.blocked) {
    const item = patch.blocked;
    next.blocked = uniqueByKey([...(next.blocked || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      reason: compactMemoryText(item.reason || "", 260),
      needs: item.needs || [],
    }], (x: any) => `${x.project}|${x.reason}`, 30);
  }
  if (patch.messageDigest) {
    next.messageDigest = compactMemoryText([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
  }
  if (patch.messageCompression) {
    next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
  }
  if (patch.workerLedger || patch.workerNotification) {
    const item = patch.workerLedger || patch.workerNotification;
    const merged = appendWorkerLedger(next, item);
    next.workerLedger = merged.workerLedger || [];
    next.agentMemories = upsertAgentMemory(next.agentMemories || {}, item);
  }
  if (patch.openQuestion) {
    next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
      time: new Date().toISOString(),
      question: compactMemoryText(patch.openQuestion, 260),
    }], (x: any) => x.question, 20);
  }
  if (patch.nextAction) {
    next.nextActions = uniqueByKey([...(next.nextActions || []), {
      time: new Date().toISOString(),
      action: compactMemoryText(patch.nextAction, 260),
    }], (x: any) => x.action, 20);
  }
  return saveGroupMemory(groupId, next, sessionId);
}
