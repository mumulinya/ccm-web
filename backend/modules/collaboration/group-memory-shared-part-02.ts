// Behavior-freeze split from group-memory-shared.ts (part 2/2).
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

import { upsertAgentMemory } from "./group-agent-memory-packet";
import { normalizeCompactFileReferencePath } from "./group-compact-file-references";
import { scoreMemorySemanticContradiction } from "./group-global-memory-arbitration";
import { getGroupMemoryReloadLedgerFile, getGroupPostCompactDispatchLedgerFile, hashGroupMemoryFileWindow, loadGroupMemory, saveGroupMemory } from "./group-memory-storage";
import { enforceGroupSessionMemoryBudget } from "./group-session-memory-snapshot";

import {
  compactMemoryText,
  normalizeAgentMemoryProject,
  resolveGroupProjectMemoryRoot,
  uniqueByKey,
} from "./group-memory-shared-part-01";

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
