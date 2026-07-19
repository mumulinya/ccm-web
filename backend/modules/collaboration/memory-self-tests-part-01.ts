// Behavior-freeze split from memory-self-tests.ts (part 1/2).
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

export function runGroupMemoryStorageRecoverySelfTest() {
  const groupId = `memory-storage-self-test-${process.pid}-${Date.now()}`;
  const file = getGroupMemoryFile(groupId);
  const backup = getGroupMemoryBackupFile(groupId);
  try {
    const first = saveGroupMemory(groupId, { goal: "first-valid-state", decisions: [{ decision: "keep" }] });
    saveGroupMemory(groupId, { goal: "second-valid-state" });
    fs.writeFileSync(file, "{broken-json", "utf-8");
    const recovered = loadGroupMemory(groupId);
    const checks = {
      atomicFileIsValidJson: (() => { try { JSON.parse(fs.readFileSync(file, "utf-8")); return true; } catch { return false; } })(),
      backupRecoveryWorks: recovered.goal === first.goal && recovered.decisions?.[0]?.decision === "keep",
      backupExists: fs.existsSync(backup),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    for (const target of [file, backup]) try { fs.unlinkSync(target); } catch {}
  }
}

export function runGlobalGroupMemoryContextSelfTest() {
  const id = `global-group-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
  const groupA = `${id}-checkout`;
  const groupB = `${id}-search`;
  const groups = [
    { id: groupA, name: "Checkout Memory Group", members: [{ project: "api", agent: "claudecode" }, { project: "web", agent: "cursor" }] },
    { id: groupB, name: "Search Memory Group", members: [{ project: "search", agent: "codex" }] },
  ];
  const files = [groupA, groupB].flatMap(groupId => [getGroupMemoryFile(groupId), `${getGroupMemoryFile(groupId)}.bak`, getGroupMessagesFileHint(groupId), `${getGroupMessagesFileHint(groupId)}.bak`, getGroupMemoryReloadLedgerFile(groupId)]);
  const typedDirs = [getGroupTypedMemoryDir(groupA), getGroupTypedMemoryDir(groupB)];
  try {
    saveGroupMessages(groupA, [
      { id: "ga-1", role: "user", target: "coordinator", timestamp: "2026-07-07T01:00:00.000Z", content: "全局派发前必须保留 GLOBAL_GROUP_MEMORY_SENTINEL，支付回调不能跳过验签。" },
      { id: "ga-2", role: "assistant", agent: "api", timestamp: "2026-07-07T01:01:00.000Z", content: "api 已修改 src/pay.ts，验证 npm run check 通过。" },
    ]);
    saveGroupMessages(groupB, [
      { id: "gb-1", role: "user", target: "coordinator", timestamp: "2026-07-07T02:00:00.000Z", content: "搜索任务要保留 SEARCH_GROUP_SENTINEL，并优先检查 src/search.ts。" },
      { id: "gb-2", role: "assistant", agent: "search", timestamp: "2026-07-07T02:01:00.000Z", content: "search 仍阻塞在索引刷新测试。" },
    ]);
    saveGroupMemory(groupA, {
      goal: "Checkout 全局群聊记忆上下文自测",
      currentPhase: "dispatch_ready",
      persistentRequirements: [{ messageId: "ga-1", text: "必须保留 GLOBAL_GROUP_MEMORY_SENTINEL，支付回调不能跳过验签。" }],
      decisions: [{ decision: "全局 Agent 派发前先查看群聊 typed memory", reason: "避免跨会话遗忘" }],
      completed: [{ project: "api", summary: "已修改 src/pay.ts", verification: ["npm run check"] }],
      factAnchors: [{ id: "ga-fact", type: "user_requirement", messageId: "ga-1", text: "src/pay.ts 是支付回调核心文件" }],
      compaction: {
        health: "healthy",
        quality: { score: 94, status: "pass", pass: true },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          action: "safe_to_inject_child_agent_memory_packet",
          passedChecks: 11,
          checkCount: 11,
        },
      },
    });
    saveGroupMemory(groupB, {
      goal: "Search 多群聊记忆上下文自测",
      currentPhase: "blocked",
      persistentRequirements: [{ messageId: "gb-1", text: "必须保留 SEARCH_GROUP_SENTINEL，优先检查 src/search.ts。" }],
      blocked: [{ project: "search", reason: "索引刷新测试失败" }],
      nextActions: [{ action: "让 search 子 Agent 继续验证 src/search.ts" }],
      compaction: { health: "healthy", quality: { score: 91, status: "pass", pass: true } },
    });
    const bundle = buildGlobalGroupMemoryContext("继续 GLOBAL_GROUP_MEMORY_SENTINEL 和 SEARCH_GROUP_SENTINEL 的多群聊任务", {
      groups,
      sessionId: `${id}-session`,
      maxGroups: 5,
      disableLedger: true,
    });
    const ignored = buildGlobalGroupMemoryContext("本轮请忽略记忆，只看当前消息", { groups, sessionId: `${id}-ignore` });
    const rendered = String(bundle.rendered_text || "");
    const ignoredRendered = String(ignored.rendered_text || "");
    const checks = {
      schema: bundle.schema === "ccm-global-group-memory-context-v1",
      includesMultipleGroups: bundle.selected_group_count === 2 && (bundle.groups || []).some((item: any) => item.group_id === groupA) && (bundle.groups || []).some((item: any) => item.group_id === groupB),
      recallsTypedMemory: JSON.stringify(bundle.groups || []).includes("GLOBAL_GROUP_MEMORY_SENTINEL") && JSON.stringify(bundle.groups || []).includes("SEARCH_GROUP_SENTINEL"),
      renderedMentionsMemoryBoundary: rendered.includes("全局 Agent 群聊记忆上下文") && rendered.includes("第三方子 Agent 每次都可能是新会话"),
      renderedMentionsQuality: rendered.includes("蒸馏质量") || rendered.includes("quality="),
      renderedMentionsPostCompactRecoveryAudit: rendered.includes("post-compact recovery audit"),
      renderedMentionsSourceManifest: rendered.includes("source manifest")
        && JSON.stringify(bundle.groups || []).includes("ccm-group-memory-source-manifest-v1"),
      renderedMentionsReloadAudit: rendered.includes("memory reload audit")
        && JSON.stringify(bundle.groups || []).includes("ccm-group-memory-reload-audit-v1"),
      renderedMentionsTypedLoadPlan: rendered.includes("类型化 MEMORY.md 加载计划")
        && JSON.stringify(bundle.groups || []).includes("ccm-group-typed-memory-load-plan-v1"),
      rawSourcesExposed: rendered.includes("group-memory") && rendered.includes("group-messages") && rendered.includes("group-memory-md"),
      ignoreMemoryHonored: ignored.memory_policy?.ignored === true && ignored.groups.length === 0 && ignoredRendered.includes("忽略记忆")
        && !ignoredRendered.includes("GLOBAL_GROUP_MEMORY_SENTINEL") && !ignoredRendered.includes("SEARCH_GROUP_SENTINEL"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, selected: (bundle.groups || []).map((item: any) => item.group_id) };
  } finally {
    for (const file of files) try { fs.unlinkSync(file); } catch {}
    for (const dir of typedDirs) try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupCompactFileReferenceReadPlanSelfTest() {
  const groupId = `group-compact-file-reference-read-plan-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const sessionDir = path.dirname(getGroupSessionMemorySnapshotFile(groupId));
  const toolDir = path.dirname(getGroupToolContinuitySnapshotFile(groupId));
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, [
      { id: "cfrp-1", role: "user", target: "coordinator", timestamp: "2026-07-07T15:00:00.000Z", content: "COMPACT_REFERENCE_READ_PLAN_SENTINEL：压缩后子 Agent 要知道先读 Session Memory，再按需读 raw messages 和 typed MEMORY。" },
      { id: "cfrp-2", role: "assistant", agent: "api", timestamp: "2026-07-07T15:01:00.000Z", content: "api 已记录 read plan 自测，涉及 src/read-plan.ts。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "验证 compact file references 的按需读取计划",
      currentPhase: "read-plan-selftest",
      messageDigest: "COMPACT_REFERENCE_READ_PLAN_SENTINEL：read plan 应指导子 Agent 按需恢复压缩文件来源。",
      persistentRequirements: [{ messageId: "cfrp-1", text: "子 Agent 必须收到 compact file reference read plan。" }],
      completed: [{ project: "api", summary: "已记录 read plan 自测", verification: ["npm run check"] }],
      compaction: {
        health: "healthy",
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-reference-read-plan-summary",
        lastCompactedMessageId: "cfrp-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_REFERENCE_READ_PLAN_SENTINEL src/read-plan.ts", {
      minKeepTokens: 1,
    });
    const refs = childBundle.compact_file_references || {};
    const readPlan = childBundle.compact_file_reference_read_plan || {};
    const rendered = renderGroupMemoryContextBundle(childBundle);
    const globalBundle = buildGlobalGroupMemoryContext("COMPACT_REFERENCE_READ_PLAN_SENTINEL", {
      groups: [{ id: groupId, name: "Compact Reference Read Plan", members: [{ project: "api", agent: "claude-code" }] }],
      disableLedger: true,
      maxGroups: 1,
    });
    const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
    const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
    const checks = {
      referencesExist: refs.schema === "ccm-group-compact-file-references-v1"
        && Number(refs.referenceCount || 0) >= 3,
      readPlanSchema: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && Number(readPlan.plannedCount || 0) >= 3,
      readPlanPrioritizesSummaryAndSource: entries.some((entry: any) => entry.type === "group_session_memory" && entry.priority === 10)
        && entries.some((entry: any) => entry.type === "raw_group_messages_json" && entry.priority === 20)
        && entries.some((entry: any) => entry.type === "typed_memory_index"),
      readPlanCarriesReceiptContract: entries.every((entry: any) => String(entry.receipt || "").includes("memoryUsed")
        && String(entry.read_plan_id || "").startsWith("cfr-read:")),
      childRenderedMentionsReadPlan: rendered.includes("compact file reference read plan")
        && rendered.includes("read_plan_id=")
        && rendered.includes("不要全量读取所有引用"),
      globalContextSeesReadPlan: globalRendered.includes("compact file reference read plan")
        && globalRendered.includes("sourceOfTruth=true"),
      policyIsReadOnDemand: readPlan.policy?.mode === "read_on_demand_after_compact"
        && readPlan.policy?.doNotReadAll === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks, readPlan: { plannedCount: readPlan.plannedCount, missingCount: readPlan.missingCount, entries: entries.slice(0, 4).map((entry: any) => ({ type: entry.type, priority: entry.priority, action: entry.action })) } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runGroupMemorySourceManifestSelfTest() {
  const groupId = `group-memory-source-manifest-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, [
      { id: "sm-1", role: "user", target: "coordinator", timestamp: "2026-07-07T03:00:00.000Z", content: "必须保留 SOURCE_MANIFEST_SENTINEL，子 Agent 每轮都要知道记忆源文件。" },
      { id: "sm-2", role: "assistant", agent: "api", timestamp: "2026-07-07T03:01:00.000Z", content: "api 修改 src/source-manifest.ts，验证 npm run check passed。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "source manifest 自测",
      persistentRequirements: [{ messageId: "sm-1", text: "必须保留 SOURCE_MANIFEST_SENTINEL。" }],
      factAnchors: [{ id: "sm-fact", type: "user_requirement", messageId: "sm-1", text: "src/source-manifest.ts 是本轮源文件审计测试文件" }],
      completed: [{ project: "api", summary: "已修改 src/source-manifest.ts", verification: ["npm run check passed"] }],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 SOURCE_MANIFEST_SENTINEL src/source-manifest.ts npm run check", {
      disableLedger: true,
      minKeepTokens: 1,
    });
    const manifest = bundle.source_manifest || {};
    const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
    const byId = new Map<string, any>(entries.map((entry: any) => [entry.id, entry]));
    const rendered = String(bundle.rendered_text || "");
    const checks = {
      schema: manifest.schema === "ccm-group-memory-source-manifest-v1",
      manifestPasses: manifest.pass === true && manifest.status === "pass",
      requiredSourcesPresent: byId.get("group_memory")?.exists === true
        && byId.get("group_messages")?.exists === true
        && byId.get("typed_memory_index")?.exists === true,
      typedDocsRecorded: Number(manifest.typedDocCount || 0) >= 3
        && entries.some((entry: any) => String(entry.id || "").startsWith("typed_doc:")),
      checksumsRecorded: entries.filter((entry: any) => entry.kind === "file").every((entry: any) => String(entry.checksum || "").length >= 12),
      rawSourcesExposeRecallLedger: !!bundle.raw_sources?.group_typed_memory_recall_ledger_file,
      renderedMentionsManifest: rendered.includes("记忆源 manifest") && rendered.includes("typed docs"),
      contextUsesTypedMemory: rendered.includes("SOURCE_MANIFEST_SENTINEL") && rendered.includes("src/source-manifest.ts"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, manifest: { status: manifest.status, entryCount: manifest.entryCount, typedDocCount: manifest.typedDocCount } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupMemoryReloadAuditSelfTest() {
  const groupId = `group-memory-reload-audit-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, [
      { id: "reload-1", role: "user", target: "coordinator", content: "必须保留 RELOAD_AUDIT_SENTINEL，检查记忆 reload reason。" },
      { id: "reload-2", role: "assistant", agent: "api", content: "api 处理 src/reload.ts，验证 npm run check passed。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "reload audit 自测",
      persistentRequirements: [{ messageId: "reload-1", text: "必须保留 RELOAD_AUDIT_SENTINEL。" }],
      factAnchors: [{ id: "reload-fact", type: "user_requirement", messageId: "reload-1", text: "src/reload.ts 是 reload audit 测试文件" }],
    });
    const first = buildAgentMemoryContextBundle(groupId, "api", "继续 RELOAD_AUDIT_SENTINEL src/reload.ts", {
      includeGlobalClaudeMemory: false,
      memoryReloadReason: "session_start",
      minKeepTokens: 1,
    });
    const second = buildAgentMemoryContextBundle(groupId, "api", "继续 RELOAD_AUDIT_SENTINEL src/reload.ts", {
      includeGlobalClaudeMemory: false,
      memoryReloadReason: "context_bundle",
      minKeepTokens: 1,
    });
    const ledger = readGroupMemoryReloadLedger(groupId);
    const firstAudit = first.memory_reload_audit || {};
    const secondAudit = second.memory_reload_audit || {};
    const rendered = String(second.rendered_text || "");
    const checks = {
      firstAuditRecorded: firstAudit.schema === "ccm-group-memory-reload-audit-v1"
        && firstAudit.reason === "session_start"
        && firstAudit.shouldReload === true
        && firstAudit.hookEvent === "instructions_loaded",
      secondAuditSeesPrevious: secondAudit.schema === "ccm-group-memory-reload-audit-v1"
        && secondAudit.reason === "memory_source_changed"
        && secondAudit.originalReason === "context_bundle"
        && !!secondAudit.previousAuditAt
        && secondAudit.previousSourceManifestChecksum === firstAudit.sourceManifestChecksum
        && secondAudit.sourceChangeTrigger?.triggered === true,
      ledgerPersisted: fs.existsSync(reloadFile)
        && Array.isArray(ledger.entries)
        && ledger.entries.length >= 2
        && ledger.scopes?.["child:api"]?.reason === "memory_source_changed",
      renderedMentionsReloadAudit: rendered.includes("记忆 reload 审计")
        && rendered.includes("reason=memory_source_changed")
        && rendered.includes("scope=child:api"),
      rawSourcesExposeReloadLedger: second.raw_sources?.group_memory_reload_ledger_file === reloadFile,
    };
    return { pass: Object.values(checks).every(Boolean), checks, firstAudit: { reason: firstAudit.reason, action: firstAudit.cacheAction }, secondAudit: { reason: secondAudit.reason, action: secondAudit.cacheAction } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupMemorySourceChangeReloadSelfTest() {
  const groupId = `group-memory-source-change-reload-selftest-${process.pid}-${Date.now().toString(36)}`;
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const loadPlan = {
    entries: [{ relPath: "MEMORY.md", type: "entrypoint", loadOrder: 0, checksum: "plan-a", pathGlobs: [] }],
  };
  const manifestA = {
    schema: "ccm-group-memory-source-manifest-v1",
    manifestChecksum: "manifest-a",
    status: "pass",
    entryCount: 2,
    typedDocCount: 1,
    entries: [
      { id: "group_memory", purpose: "group_memory_json", path: "group-memory.json", exists: true, kind: "file", bytes: 10, mtimeMs: 1000, checksum: "gm-a", lineCount: 1 },
      { id: "typed_memory_index", purpose: "typed_memory_entrypoint", path: "MEMORY.md", exists: true, kind: "file", bytes: 20, mtimeMs: 1000, checksum: "typed-a", lineCount: 2 },
    ],
  };
  const manifestB = {
    ...manifestA,
    manifestChecksum: "manifest-b",
    entries: [
      manifestA.entries[0],
      { ...manifestA.entries[1], bytes: 30, mtimeMs: 2000, checksum: "typed-b", lineCount: 3 },
    ],
  };
  try {
    const first = recordGroupMemoryReloadAudit(groupId, {
      scope: "child:api",
      contextKind: "child_agent",
      reason: "context_bundle",
      sourceManifest: manifestA,
      loadPlan,
      generatedAt: "2026-07-07T05:00:00.000Z",
    });
    const second = recordGroupMemoryReloadAudit(groupId, {
      scope: "child:api",
      contextKind: "child_agent",
      reason: "context_bundle",
      sourceManifest: manifestB,
      loadPlan,
      generatedAt: "2026-07-07T05:01:00.000Z",
    });
    const third = recordGroupMemoryReloadAudit(groupId, {
      scope: "child:api",
      contextKind: "child_agent",
      reason: "context_bundle",
      sourceManifest: manifestB,
      loadPlan,
      generatedAt: "2026-07-07T05:02:00.000Z",
    });
    const ledger = readGroupMemoryReloadLedger(groupId);
    const checks = {
      firstCreatesBaselineWithoutSourceTrigger: first.reason === "context_bundle"
        && first.shouldReload === true
        && first.sourceChangeTrigger?.triggered === false,
      secondAutoPromotesReason: second.reason === "memory_source_changed"
        && second.originalReason === "context_bundle"
        && second.shouldReload === true
        && second.sourceChangeTrigger?.triggered === true
        && second.sourceChangeTrigger.changedCount === 1
        && second.sourceChangeTrigger.changedIds.includes("typed_memory_index"),
      thirdReusesWhenStable: third.reason === "context_bundle"
        && third.shouldReload === false
        && third.sourceChangeTrigger?.triggered === false,
      ledgerStoresSnapshotAndTrigger: fs.existsSync(reloadFile)
        && Array.isArray(ledger.scopes?.["child:api"]?.sourceEntries)
        && ledger.scopes["child:api"].sourceEntries.some((entry: any) => entry.id === "typed_memory_index" && entry.checksum === "typed-b")
        && ledger.entries.some((entry: any) => entry.reason === "memory_source_changed"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      second: { reason: second.reason, trigger: second.sourceChangeTrigger },
      third: { reason: third.reason, shouldReload: third.shouldReload },
    };
  } finally {
    try { fs.unlinkSync(reloadFile); } catch {}
  }
}

export function runGroupMemoryDispatchFreshnessGateSelfTest() {
  const groupId = `group-memory-dispatch-freshness-gate-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, [
      { id: "gate-1", role: "user", target: "coordinator", content: "必须保留 DISPATCH_FRESHNESS_GATE_SENTINEL，子 Agent 派发前要证明记忆新鲜。" },
      { id: "gate-2", role: "assistant", agent: "api", content: "api 继续 src/gate.ts，验证 npm run check。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "dispatch freshness gate 自测",
      persistentRequirements: [{ messageId: "gate-1", text: "必须保留 DISPATCH_FRESHNESS_GATE_SENTINEL。" }],
      factAnchors: [{ id: "gate-fact", type: "user_requirement", messageId: "gate-1", text: "src/gate.ts 是派发新鲜度门禁测试文件" }],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 DISPATCH_FRESHNESS_GATE_SENTINEL src/gate.ts", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
    const gate = bundle.dispatch_freshness_gate || {};
    const ignoredGate = ignored.dispatch_freshness_gate || {};
    const rendered = String(bundle.rendered_text || "");
    const ignoredRendered = String(ignored.rendered_text || "");
    const checks = {
      gateSchema: gate.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1"
        && gate.version === GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
      gateBindsScopeAndTarget: gate.group_id === groupId
        && gate.target_project === "api"
        && gate.scope === "child:api"
        && String(gate.dispatch_gate_id || "").startsWith("gmd_"),
      gateCarriesSourceAndReload: gate.source_manifest?.checksum === bundle.source_manifest?.manifestChecksum
        && gate.reload_audit?.reason === bundle.memory_reload_audit?.reason
        && gate.reload_audit?.cache_action === bundle.memory_reload_audit?.cacheAction,
      gateRequiresReceiptDeclaration: gate.receipt_contract?.memory_used_should_reference_gate === true
        && Array.isArray(gate.receipt_contract.required_receipt_fields)
        && gate.receipt_contract.required_receipt_fields.includes("memoryUsed"),
      renderedMentionsFreshnessGate: rendered.includes("子 Agent 记忆派发新鲜度")
        && rendered.includes(gate.dispatch_gate_id)
        && rendered.includes("memoryUsed/memoryIgnored"),
      ignoredGateHonorsUserPolicy: ignoredGate.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1"
        && ignoredGate.status === "memory_ignored"
        && ignoredGate.memory_ignored === true
        && ignoredRendered.includes("记忆派发门禁")
        && ignoredRendered.includes("memoryIgnored"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, gate: { id: gate.dispatch_gate_id, status: gate.status, action: gate.action } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupPostCompactFirstDispatchMarkerSelfTest() {
  const groupId = `group-post-compact-first-dispatch-marker-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, Array.from({ length: 18 }, (_, index) => ({
      id: `pcfd-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? "必须保留 POST_COMPACT_FIRST_DISPATCH_SENTINEL，压缩后首次派发要被标记。"
        : `压缩后首次派发 marker 自测 ${index}，涉及 src/post-compact-dispatch.ts 和 npm run check。`,
    })));
    saveGroupMemory(groupId, {
      goal: "post compact first dispatch marker 自测",
      persistentRequirements: [{ messageId: "pcfd-0", text: "必须保留 POST_COMPACT_FIRST_DISPATCH_SENTINEL。" }],
    });
    const first = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const second = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const otherTarget = buildAgentMemoryContextBundle(groupId, "frontend", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const firstMarker = first.post_compact_dispatch_marker || {};
    const secondMarker = second.post_compact_dispatch_marker || {};
    const otherMarker = otherTarget.post_compact_dispatch_marker || {};
    const ledger = readGroupPostCompactDispatchLedger(groupId);
    const rendered = String(first.rendered_text || "");
    const checks = {
      firstMarkerRecorded: firstMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && firstMarker.version === GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION
        && firstMarker.first_dispatch_after_compact === true
        && firstMarker.dispatch_sequence === 1
        && String(firstMarker.marker_id || "").startsWith("pcfd_"),
      secondMarkerAdvancesSameTarget: secondMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && secondMarker.boundary_id === firstMarker.boundary_id
        && secondMarker.first_dispatch_after_compact === false
        && secondMarker.dispatch_sequence === 2,
      otherTargetGetsOwnFirstDispatch: otherMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && otherMarker.boundary_id === firstMarker.boundary_id
        && otherMarker.target_project === "frontend"
        && otherMarker.first_dispatch_after_compact === true
        && otherMarker.dispatch_sequence === 1,
      renderedMentionsMarker: rendered.includes("压缩后派发标记")
        && rendered.includes(firstMarker.marker_id)
        && rendered.includes("first=true"),
      rawSourcesExposeDispatchLedger: first.raw_sources?.group_post_compact_dispatch_ledger_file === dispatchFile,
      ledgerPersisted: fs.existsSync(dispatchFile)
        && Array.isArray(ledger.entries)
        && ledger.entries.length >= 3
        && Object.values(ledger.scopes || {}).some((item: any) => item.targetProject === "api" && item.dispatchSequence === 2)
        && Object.values(ledger.scopes || {}).some((item: any) => item.targetProject === "frontend" && item.dispatchSequence === 1),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      first: { marker_id: firstMarker.marker_id, boundary_id: firstMarker.boundary_id, dispatch_sequence: firstMarker.dispatch_sequence },
      second: { marker_id: secondMarker.marker_id, boundary_id: secondMarker.boundary_id, dispatch_sequence: secondMarker.dispatch_sequence },
      other: { marker_id: otherMarker.marker_id, boundary_id: otherMarker.boundary_id, dispatch_sequence: otherMarker.dispatch_sequence },
    };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupPostCompactCandidateUsageLedgerSelfTest() {
  const groupId = `group-post-compact-candidate-usage-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
  const usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
  try {
    saveGroupMessages(groupId, Array.from({ length: 16 }, (_, index) => ({
      id: `pccu-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? "必须保留 POST_COMPACT_USAGE_LEDGER_SENTINEL，候选使用状态要进入长期账本。"
        : `候选使用账本自测 ${index}，涉及 src/usage-ledger.ts 和 npm run check。`,
    })));
    saveGroupMemory(groupId, {
      goal: "post compact candidate usage ledger 自测",
      persistentRequirements: [{ messageId: "pccu-0", text: "必须保留 POST_COMPACT_USAGE_LEDGER_SENTINEL。" }],
      compaction: {
        postCompactReinject: {
          hasCandidates: true,
          files: [{ candidate_id: "pcrc_usage_file", value: "src/usage-ledger.ts", sourceMessageId: "pccu-1" }],
          verification: [{ candidate_id: "pcrc_usage_check", value: "npm run check", sourceMessageId: "pccu-2" }],
          blockers: [{ candidate_id: "pcrc_usage_legacy", value: "legacy blocker already resolved", sourceMessageId: "pccu-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          action: "safe_to_inject_child_agent_memory_packet",
          summaryChecksum: "usage-ledger-summary",
          transcriptPath: "usage-ledger-raw.json",
          candidateCounts: { files: 1, skills: 0, verification: 1, blockers: 1 },
        },
      },
    });
    const record = recordGroupPostCompactCandidateUsageLedger(groupId, {
      targetProject: "api",
      taskId: "task-usage-ledger",
      executionId: "exec-usage-ledger",
      generatedAt: "2026-07-07T00:00:00.000Z",
      receiptRows: [{
        agent: "api",
        status: "done",
        post_compact_reinjection_gate: {
          gate_ids: ["pcrg_usage_ledger"],
          candidate_usage_rows: [
            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_file", kind: "file", value: "src/usage-ledger.ts", usage_state: "used", used: true, referenced: true, direct_reference: true },
            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_check", kind: "verification", value: "npm run check", usage_state: "verified", verified: true, referenced: true, direct_reference: true },
            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_legacy", kind: "blocker", value: "legacy blocker already resolved", usage_state: "ignored", ignored: true, referenced: true, direct_reference: true },
          ],
        },
      }],
    });
    const duplicate = recordGroupPostCompactCandidateUsageLedger(groupId, {
      targetProject: "api",
      taskId: "task-usage-ledger",
      executionId: "exec-usage-ledger",
      generatedAt: "2026-07-07T00:00:00.000Z",
      receiptRows: [{
        agent: "api",
        status: "done",
        post_compact_reinjection_gate: {
          gate_ids: ["pcrg_usage_ledger"],
          candidate_usage_rows: [
            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_file", kind: "file", value: "src/usage-ledger.ts", usage_state: "used", used: true, referenced: true, direct_reference: true },
          ],
        },
      }],
    });
    const ledger = readGroupPostCompactCandidateUsageLedger(groupId);
    const summary: any = buildGroupPostCompactCandidateUsageSummary(groupId, {
      targetProject: "api",
      candidates: [
        { candidate_id: "pcrc_usage_file", value: "src/usage-ledger.ts" },
        { candidate_id: "pcrc_usage_check", value: "npm run check" },
        { candidate_id: "pcrc_usage_legacy", value: "legacy blocker already resolved" },
      ],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_USAGE_LEDGER_SENTINEL src/usage-ledger.ts npm run check", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const rendered = String(bundle.rendered_text || "");
    const fileStats: any = Object.values(ledger.stats || {}).find((item: any) => item.candidate_id === "pcrc_usage_file") || {};
    const ignoredStats: any = Object.values(ledger.stats || {}).find((item: any) => item.candidate_id === "pcrc_usage_legacy") || {};
    const checks = {
      recordWritesThreeEntries: record?.recorded_count === 3
        && fs.existsSync(usageFile)
        && Array.isArray(ledger.entries)
        && ledger.entries.length === 3,
      duplicateDoesNotRecount: duplicate?.recorded_count === 0
        && duplicate?.duplicate_count === 1
        && Number(fileStats.used_count || 0) === 1,
      statsClassifyUsage: Number(fileStats.used_count || 0) === 1
        && Number(ignoredStats.ignored_count || 0) === 1
        && ignoredStats.recommendation === "neutral_verify_current_context",
      summaryFiltersCurrentCandidates: summary.schema === "ccm-group-post-compact-candidate-usage-summary-v1"
        && summary.has_history === true
        && summary.totals.used === 1
        && summary.totals.verified === 1
        && summary.totals.ignored === 1,
      bundleExposesUsageLedger: bundle.post_compact_candidate_usage?.has_history === true
        && bundle.raw_sources?.group_post_compact_candidate_usage_ledger_file === usageFile,
      bundleFeedsUsageIntoTypedRecall: Number(bundle.group_state?.typedMemory?.recall?.postCompactUsageScoring?.hint_count || 0) >= 1
        && Number(bundle.group_state?.typedMemory?.recall?.postCompactUsageScoring?.boosted_count || 0) >= 1,
      renderedMentionsUsageLedger: rendered.includes("压缩重注入候选使用账本")
        && rendered.includes("pcrc_usage_file")
        && rendered.includes("used=1"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      record,
      summary: { totals: summary.totals, candidate_count: summary.candidate_count },
    };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile, usageFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupProjectMemoryImportContextSelfTest() {
  const groupId = `group-project-memory-import-context-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const projectRoot = path.join(CCM_DIR, "tmp-project-memory-context-selftest", groupId);
  try {
    fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "PROJECT_MEMORY_CONTEXT_ROOT_SENTINEL: 子 Agent 处理 src/pay.ts 支付回调时必须读取项目 CLAUDE.md。\n", "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "pay.md"), [
      "---",
      "name: \"Pay Context Rule\"",
      "paths: [\"src/pay.ts\"]",
      "---",
      "PROJECT_MEMORY_CONTEXT_PAY_RULE_SENTINEL: src/pay.ts 必须保留验签。",
    ].join("\n"), "utf-8");
    saveGroupMessages(groupId, [
      { id: "pmc-1", role: "user", target: "coordinator", content: "继续 src/pay.ts，必须使用项目 Claude 记忆。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "项目 Claude 记忆导入上下文自测",
      persistentRequirements: [{ messageId: "pmc-1", text: "src/pay.ts 必须使用项目记忆。" }],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 src/pay.ts 支付回调", {
      projectRoot,
      minKeepTokens: 1,
      maxTypedMemory: 10,
    });
    const rendered = String(bundle.rendered_text || "");
    const projectImport = bundle.group_state?.typedMemory?.projectMemoryImport || {};
    const checks = {
      importRecorded: projectImport.schema === "ccm-project-memory-import-v1"
        && projectImport.importedCount >= 2,
      renderedMentionsProjectImport: rendered.includes("项目记忆导入")
        && rendered.includes("CLAUDE"),
      rootClaudeInjected: rendered.includes("PROJECT_MEMORY_CONTEXT_ROOT_SENTINEL"),
      pathRuleInjected: rendered.includes("PROJECT_MEMORY_CONTEXT_PAY_RULE_SENTINEL"),
      loadPlanSeesImportedDocs: JSON.stringify(bundle.group_state?.typedMemory?.loadPlan || {}).includes("project-memory:api"),
      sourceManifestSeesTypedDocs: Number(bundle.source_manifest?.typedDocCount || 0) >= 3,
    };
    return { pass: Object.values(checks).every(Boolean), checks, imported: { importedCount: projectImport.importedCount, status: projectImport.status } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupGlobalClaudeMemoryImportContextSelfTest() {
  const groupId = `group-global-claude-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const root = path.join(CCM_DIR, "tmp-global-claude-context-selftest", groupId);
  const userRoot = path.join(root, "user-claude");
  const managedRoot = path.join(root, "managed-claude");
  try {
    fs.mkdirSync(path.join(userRoot, "rules"), { recursive: true });
    fs.mkdirSync(path.join(managedRoot, ".claude", "rules"), { recursive: true });
    fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), "GLOBAL_CLAUDE_CONTEXT_USER_SENTINEL: src/pay.ts 子 Agent 必须保留用户偏好。\n", "utf-8");
    fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), "GLOBAL_CLAUDE_CONTEXT_MANAGED_SENTINEL: managed policy imported for src/pay.ts child Agent.\n", "utf-8");
    fs.writeFileSync(path.join(userRoot, "rules", "pay.md"), [
      "---",
      "name: \"Global Pay User Rule\"",
      "paths: [\"src/pay.ts\"]",
      "---",
      "GLOBAL_CLAUDE_CONTEXT_PAY_RULE_SENTINEL: src/pay.ts 使用用户级支付规则。",
    ].join("\n"), "utf-8");
    saveGroupMessages(groupId, [
      { id: "gcm-1", role: "user", target: "coordinator", content: "继续 src/pay.ts，必须使用全局 Claude 记忆。" },
    ]);
    saveGroupMemory(groupId, {
      goal: "全局 Claude 记忆导入上下文自测",
      persistentRequirements: [{ messageId: "gcm-1", text: "src/pay.ts 必须使用全局 Claude 记忆。" }],
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 src/pay.ts 支付回调", {
      claudeUserRoot: userRoot,
      claudeManagedRoot: managedRoot,
      minKeepTokens: 1,
      maxTypedMemory: 10,
    });
    const rendered = String(bundle.rendered_text || "");
    const imported = bundle.group_state?.typedMemory?.globalClaudeMemoryImport || {};
    const checks = {
      importRecorded: imported.schema === "ccm-global-claude-memory-import-v1"
        && imported.importedCount >= 3,
      renderedMentionsGlobalImport: rendered.includes("全局 Claude 记忆导入"),
      userMemoryInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_USER_SENTINEL"),
      managedMemoryInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_MANAGED_SENTINEL"),
      pathRuleInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_PAY_RULE_SENTINEL"),
      sourceManifestSeesGlobalDocs: Number(bundle.source_manifest?.typedDocCount || 0) >= 3,
    };
    return { pass: Object.values(checks).every(Boolean), checks, imported: { importedCount: imported.importedCount, status: imported.status } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
    }
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupGlobalAgentMemoryBridgeContextSelfTest() {
  const groupId = `group-global-agent-memory-bridge-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-bridge-context");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const at = new Date().toISOString();
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_phase61_child_context_user",
        text: "GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL: src/pay.ts 子 Agent 必须继承全局 Agent 的支付回调偏好，但执行前要核验当前代码。",
        why: "验证全局 Agent 长期记忆会桥接进群聊项目子 Agent 记忆包。",
        howToApply: "只在支付回调相关任务中提醒子 Agent 先核验 src/pay.ts 当前状态。",
        importance: 98,
        confidence: 0.99,
        createdAt: at,
        updatedAt: at,
        source: {
          sessionId: "phase61-global-session",
          messageIds: ["phase61-global-message"],
          source: "selftest",
          timestamp: at,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [{
        sessionId: "phase61-global-session",
        summary: {
          primaryRequest: "GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL payment callback preference",
          filesAndResources: ["src/pay.ts"],
          sourceMessageIds: ["phase61-global-message"],
        },
        boundary: {
          type: "compact_boundary",
          archiveId: "phase61-global-archive",
          preservedMessageCount: 1,
          preservedTokenCount: 120,
          context_budget: { pressure: 7 },
          post_compact_restore: {
            recentMessageIds: ["phase61-global-message"],
            filesAndResources: ["src/pay.ts"],
          },
        },
      }],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 1, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: at,
    });
    saveGroupMessages(groupId, [
      { id: "ggam-1", role: "user", target: "coordinator", timestamp: at, content: "继续 GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL 的支付回调任务。" },
      { id: "ggam-2", role: "assistant", agent: "api", timestamp: at, content: "api 将检查 src/pay.ts。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证全局 Agent 长期记忆桥接到子 Agent 上下文",
      currentPhase: "phase61-global-agent-memory-bridge",
      persistentRequirements: [{ messageId: "ggam-1", text: "支付回调任务必须继承相关全局 Agent 记忆。" }],
      compaction: {
        health: "healthy",
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "phase61-global-agent-memory-bridge",
      },
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL src/pay.ts 支付回调", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
      globalAgentSessionId: "phase61-global-session",
      allowSelftestGlobalMemoryForSelfTest: true,
    });
    const rendered = String(bundle.rendered_text || "");
    const globalRecall = bundle.global_agent_memory || {};
    const healthGate = bundle.global_memory_health_gate || globalRecall.memory_health_gate || {};
    const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
    const ignoredRendered = String(ignored.rendered_text || "");
    const checks = {
      healthGateAllowsCleanGlobalMemory: healthGate.schema === "ccm-child-global-agent-memory-health-gate-v1"
        && healthGate.status === "ok"
        && healthGate.selftest_bypass === true
        && healthGate.action === "allow_global_agent_memory_recall_for_selftest_fixture",
      globalRecallStructured: globalRecall.schema === "ccm-child-global-agent-memory-recall-v1"
        && Number(globalRecall.itemCount || 0) >= 1
        && JSON.stringify(globalRecall.items || []).includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL"),
      renderedInjectsGlobalAgentMemory: rendered.includes("全局 Agent 长期记忆召回")
        && rendered.includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL")
        && rendered.includes("global_memory_id=gmi_phase61_child_context_user"),
      renderedMentionsHealthGate: rendered.includes("Global Agent memory health gate")
        && rendered.includes("allow_global_agent_memory_recall_for_selftest_fixture"),
      currentStateBoundaryRendered: rendered.includes("必须读取当前真实状态复核") || rendered.includes("必须读取当前真实状态"),
      sourceManifestTracksGlobalMemory: bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1"
        && (bundle.source_manifest.entries || []).some((entry: any) => entry.id === "global_agent_memory" && entry.exists === true),
      compactReferencesTrackGlobalMemory: (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_agent_memory_json" && entry.exists === true),
      reloadAuditCanUseGlobalReason: bundle.memory_reload_audit?.schema === "ccm-group-memory-reload-audit-v1"
        && ["global_agent_memory_recall", "context_bundle"].includes(String(bundle.memory_reload_audit.reason || "")),
      rawSourceExposesGlobalMemoryFile: bundle.raw_sources?.global_agent_memory_file === GLOBAL_AGENT_MEMORY_FILE,
      ignoreMemorySuppressesGlobalAgentMemory: ignored.memory_policy?.ignored === true
        && !ignored.global_agent_memory
        && !ignoredRendered.includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL")
        && !ignoredRendered.includes("全局 Agent 长期记忆召回"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, globalRecall: { itemCount: globalRecall.itemCount, file: globalRecall.file } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
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

export function runGroupGlobalAgentMemoryHealthGateSelfTest() {
  const groupId = `group-global-agent-memory-health-gate-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messageFile = getGroupMessagesFileHint(groupId);
  const memoryFile = getGroupMemoryFile(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("group-global-agent-memory-health-gate");
  const previousGlobalMemory = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const at = new Date().toISOString();
    writeJsonAtomic(GLOBAL_AGENT_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_health_gate_polluted",
        text: "GLOBAL_AGENT_MEMORY_HEALTH_GATE_SENTINEL: this active selftest data must never be injected into child Agent context.",
        why: "验证 active Global Agent memory 污染会阻断全局记忆召回。",
        howToApply: "如果看到这条文本进入 rendered_text，就是健康门失败。",
        importance: 99,
        confidence: 0.99,
        createdAt: at,
        updatedAt: at,
        source: {
          sessionId: "health-gate-selftest",
          messageIds: ["health-gate-message"],
          source: "selftest",
          timestamp: at,
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
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: at,
    });
    saveGroupMessages(groupId, [
      { id: "ggmh-1", role: "user", target: "coordinator", timestamp: at, content: "继续 Global Agent memory health gate 自测任务。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 Global Agent memory active 污染阻断子 Agent 注入",
      currentPhase: "global-memory-health-gate",
      persistentRequirements: [{ messageId: "ggmh-1", text: "active Global Agent memory 污染时不能向子 Agent 注入全局记忆内容。" }],
      compaction: { health: "healthy", compactedMessageCount: 1, preservedRecentMessages: 1 },
    });
    const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 Global Agent memory health gate 阻断验证 src/health-gate.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
    });
    const rendered = String(bundle.rendered_text || "");
    const globalRecall = bundle.global_agent_memory || {};
    const healthGate = bundle.global_memory_health_gate || globalRecall.memory_health_gate || {};
    const checks = {
      healthGateFailsActivePollution: healthGate.schema === "ccm-child-global-agent-memory-health-gate-v1"
        && healthGate.status === "fail"
        && Number(healthGate.active_contamination_count || 0) >= 1,
      recallBlocked: globalRecall.reason === "global_agent_memory_health_gate_failed"
        && globalRecall.healthBlocked === true
        && Number(globalRecall.itemCount || 0) === 0,
      renderedBlocksGlobalMemory: rendered.includes("全局记忆健康门阻断")
        && rendered.includes("block_global_agent_memory_recall")
        && !rendered.includes("global_memory_id=gmi_health_gate_polluted"),
      contaminatedPreviewNotRendered: !rendered.includes("this active selftest data must never be injected")
        && !rendered.includes("GLOBAL_AGENT_MEMORY_HEALTH_GATE_SENTINEL"),
      sourceManifestStillAvailable: bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1",
      rawSourceStillTrackedForAudit: bundle.raw_sources?.global_agent_memory_file === GLOBAL_AGENT_MEMORY_FILE,
    };
    return { pass: Object.values(checks).every(Boolean), checks, healthGate: { status: healthGate.status, active: healthGate.active_contamination_count } };
  } finally {
    for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
      try { fs.unlinkSync(file); } catch {}
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
