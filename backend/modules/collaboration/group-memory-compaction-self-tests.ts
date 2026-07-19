// Extracted self-tests. Runtime remains in group-memory-compaction.ts.

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadSkills, SKILL_PACKAGES_DIR } from "../../core/db";
import { isCcmInternalSkillName } from "../../skills/internal-skill-catalog";
import { buildContextBudget, compactPreserveEdges, estimateTextTokens, getAutoCompactThreshold, microCompactText } from "../../system/context-budget";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import { inspectGroupSessionMemoryTemplateState } from "./group-session-memory-customization";
import { recordGroupPromptCacheState, recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";

import {
  GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA,
  GROUP_COMPACT_TRIGGER_TOKENS,
  GROUP_MEMORY_COMPACTION_VERSION,
  GROUP_PTL_EMERGENCY_VERSION,
  GROUP_TIME_BASED_MC_CLEARED_MESSAGE,
  buildBoundedRecentGroupContext,
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupApiMicrocompactNativeApplyPlan,
  buildGroupCompactStrategyDecision,
  buildGroupCompactionModelRequest,
  buildGroupMicroCompactPlan,
  buildGroupPreservedSegment,
  buildPostCompactReinjectionPlan,
  buildRelevantHistoricalGroupContext,
  calculateGroupCompactWarningState,
  calculateGroupMessagesToKeepIndex,
  compactGroupConversationMemory,
  createEmptyConversationSummary,
  evaluateGroupMemorySummaryQuality,
  extractFactAnchors,
  extractPersistentRequirements,
  getGroupAutoCompactThreshold,
  getGroupEffectiveContextWindow,
  getGroupMemoryCompactionHookLedgerFile,
  groupPostCompactCleanupAuditChecksum,
  mergeFactAnchors,
  mergePersistentRequirements,
  mergeSafeConversationSummary,
  mergeUnique,
  readGroupMemoryCompactionHookLedger,
  registerGroupMemoryCompactionHook,
  resolveGroupModelContextCapacity,
  verifyGroupCompactTransactionReceipt,
  verifyGroupPostCompactCleanupAudit,
} from "./group-memory-compaction";
import type { ConversationSummary } from "./group-memory-compaction";

export function runGroupMemoryCompactWarningSelfTest() {
  const config = {
    memoryContextWindowTokens: 80_000,
    memoryReservedTokens: 20_000,
    groupWarningBufferTokens: 20_000,
    groupErrorBufferTokens: 10_000,
    groupManualCompactBufferTokens: 3_000,
  };
  const ok = calculateGroupCompactWarningState({ activeTokens: 10_000, config, now: "2026-07-07T00:00:00.000Z" });
  const warning = calculateGroupCompactWarningState({ activeTokens: 30_000, config, now: "2026-07-07T00:00:00.000Z" });
  const error = calculateGroupCompactWarningState({ activeTokens: 40_000, config, now: "2026-07-07T00:00:00.000Z" });
  const autoCompact = calculateGroupCompactWarningState({ activeTokens: 48_000, config, activeMessageCount: 120, now: "2026-07-07T00:00:00.000Z" });
  const blocking = calculateGroupCompactWarningState({ activeTokens: 58_000, config, now: "2026-07-07T00:00:00.000Z" });
  const suppressed = calculateGroupCompactWarningState({
    activeTokens: 20_000,
    config,
    suppressed: true,
    suppressReason: "selftest_post_compaction",
    now: "2026-07-07T00:00:00.000Z",
  });
  const checks = {
    effectiveWindowMatchesCcStyleBudget: getGroupEffectiveContextWindow(config) === 60_000,
    autoThresholdMatchesBuffer: getGroupAutoCompactThreshold(config) === 47_000,
    okLevel: ok.level === "ok" && ok.flags.isAboveWarningThreshold === false,
    warningLevel: warning.level === "warning" && warning.flags.isAboveWarningThreshold === true && warning.flags.isAboveErrorThreshold === false,
    errorLevel: error.level === "error" && error.flags.isAboveErrorThreshold === true && error.flags.isAboveAutoCompactThreshold === false,
    autoCompactLevel: autoCompact.level === "auto_compact" && autoCompact.flags.isAboveAutoCompactThreshold === true,
    blockingLevel: blocking.level === "blocking" && blocking.flags.isAtBlockingLimit === true,
    suppressedLevel: suppressed.level === "suppressed" && suppressed.suppressed === true && suppressed.recommendation.includes("suppress"),
    thresholdsRecorded: warning.thresholds.warningThreshold === 27_000
      && warning.thresholds.errorThreshold === 37_000
      && warning.thresholds.blockingThreshold === 57_000,
  };
  return { pass: Object.values(checks).every(Boolean), checks, states: { ok, warning, error, autoCompact, blocking, suppressed } };
}

export function runGroupMemoryCompactionSelfTest() {
  const messages: any[] = [];
  for (let i = 0; i < 36; i++) {
    messages.push({ id: `u${i}`, role: "user", target: "coordinator", content: i === 0 ? "实现订单审核并保留权限校验" : `用户补充要求 ${i}` });
    messages.push({ id: `a${i}`, role: "assistant", agent: "backend", content: i === 10 ? "执行失败：mvn test 超时，需要修复" : `处理进度 ${i}，文件 src/order-${i}.ts`, receipt: i < 30 ? { status: "done", summary: `完成 ${i}` } : undefined });
  }
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const boundaryKeepIndex = calculateGroupMessagesToKeepIndex(messages, { floorIndex: 60, minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const compacted = messages.slice(0, keepIndex);
  const kept = messages.slice(keepIndex);
  const summary = buildDeterministicConversationSummary(compacted, { goal: "实现订单审核", decisions: [], completed: [], blocked: [], nextActions: [{ action: "继续测试" }] });
  const bounded = buildBoundedRecentGroupContext([{ id: "large", role: "assistant", agent: "worker", content: "x".repeat(20_000) }], 1);
  const retrieval = buildRelevantHistoricalGroupContext(messages, Math.max(0, keepIndex - 1), "订单审核 权限校验");
  const unsafeModel = { ...createEmptyConversationSummary(), filesAndCode: ["src/fake-hallucination.ts"], completedWork: ["已经上线生产"] };
  const safeMerged = mergeSafeConversationSummary(createEmptyConversationSummary(), summary, unsafeModel, compacted);
  const anchors = extractFactAnchors(compacted);
  const checks = {
    keepsRecentMessages: kept.length >= 8,
    compactsOlderMessages: compacted.length > 0,
    preservesUserIntent: summary.userMessages.some(item => item.includes("实现订单审核")),
    preservesErrors: summary.errorsAndFixes.some(item => item.includes("mvn test")),
    preservesFiles: summary.filesAndCode.some(item => item.includes("src/order-")),
    preservesNextStep: summary.nextStep.includes("继续测试"),
    microCompactsLargeOutput: bounded.length < 8_000 && bounded.includes("micro-compact"),
    rawTranscriptUntouched: messages[0].content === "实现订单审核并保留权限校验" && messages.length === 72,
    neverCrossesPreviousBoundary: boundaryKeepIndex >= 60,
    retrievesCompressedOriginalEvidence: retrieval.includes("#u0") && retrieval.includes("权限校验"),
    rejectsUngroundedModelClaims: !safeMerged.filesAndCode.includes("src/fake-hallucination.ts") && !safeMerged.completedWork.includes("已经上线生产"),
    preservesDeterministicFacts: safeMerged.filesAndCode.some(item => item.includes("src/order-")) && safeMerged.userMessages.some(item => item.includes("权限校验")),
    storesChecksummedUserAnchors: anchors.some(item => item.messageId === "u0" && item.type === "user_requirement" && item.checksum.length === 16),
    adaptiveThresholdMatchesDefaultBudget: getGroupAutoCompactThreshold({}) === GROUP_COMPACT_TRIGGER_TOKENS,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, keptMessages: kept.length, compactedMessages: compacted.length };
}

export function runGroupMemoryModelCapacitySelfTest() {
  const defaultCapacity = resolveGroupModelContextCapacity({});
  const preset516 = {
    modelContextWindow: 516_000,
    modelAutoCompactTokenLimit: 460_000,
  };
  const preset1m = {
    model_context_window: 1_000_000,
    model_auto_compact_token_limit: 900_000,
  };
  const sentinel = "MODEL_CAPACITY_3MB_SENTINEL";
  const largeContent = `${sentinel}:${"上下文容量证据".repeat(220_000)}`;
  const messages: any[] = [
    { id: "large-3mb", role: "user", content: largeContent },
    { id: "tail", role: "assistant", content: "继续执行并保留原始记录" },
  ];
  const fallback = buildDeterministicConversationSummary(messages, { goal: sentinel });
  const request = buildGroupCompactionModelRequest(messages, {}, fallback, {
    model: "small-window-selftest",
    modelContextWindow: 64_000,
    modelMaxOutputTokens: 8_000,
  });
  const checks = {
    ccDefaultUsesTwentyKSummaryReserve: defaultCapacity.contextWindow === 200_000
      && defaultCapacity.reservedOutputTokens === 20_000
      && defaultCapacity.effectiveContextWindow === 180_000,
    ccDefaultAutoCompactThresholdIs167k: getGroupAutoCompactThreshold({}) === 167_000,
    preset516IsApplied: getGroupEffectiveContextWindow(preset516) === 496_000
      && getGroupAutoCompactThreshold(preset516) === 460_000,
    preset1mIsApplied: getGroupEffectiveContextWindow(preset1m) === 980_000
      && getGroupAutoCompactThreshold(preset1m) === 900_000,
    threeMbSourceIsNeverSentWhole: request.audit.estimatedInputTokensBefore < estimateTextTokens(largeContent)
      && request.audit.estimatedInputTokens <= request.audit.maxInputTokens,
    requestCarriesCapacityProof: request.audit.schema === "ccm-group-compaction-model-request-budget-v1"
      && request.audit.withinBudget === true
      && request.audit.rawTranscriptPreserved === true,
    originalMemoryRemainsUntouched: messages[0].content.length === largeContent.length
      && messages[0].content.startsWith(sentinel),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    defaultCapacity,
    preset516Threshold: getGroupAutoCompactThreshold(preset516),
    preset1mThreshold: getGroupAutoCompactThreshold(preset1m),
    requestAudit: request.audit,
    sourceChars: largeContent.length,
  };
}

export async function runGroupCompactStrategyDecisionSelfTest() {
  const messages: any[] = [];
  for (let i = 0; i < 28; i++) {
    messages.push({
      id: `csd-user-${i}`,
      role: "user",
      target: "coordinator",
      task_id: `csd-task-${Math.floor(i / 2)}`,
      content: i === 0
        ? "必须保留 COMPACT_STRATEGY_DECISION_SENTINEL，子 Agent 新会话要知道本次为什么压缩。"
        : `压缩策略决策用户消息 ${i} src/strategy-${i}.ts ${"上下文".repeat(25)}`,
    });
    messages.push({
      id: `csd-agent-${i}`,
      role: "assistant",
      agent: "api",
      task_id: `csd-task-${Math.floor(i / 2)}`,
      content: `api 输出 ${i}，涉及 src/strategy-${i}.ts，npm run check ${"执行结果".repeat(30)}`,
      receipt: { status: "done", taskId: `csd-task-${Math.floor(i / 2)}`, filesChanged: [`src/strategy-${i}.ts`], verification: ["npm run check"] },
    });
  }
  const directKeepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 2, minTokens: 1, maxTokens: 1400 });
  const directMicro = buildGroupMicroCompactPlan(messages.slice(0, directKeepIndex), { maxChars: 900 });
  const directPreserved = buildGroupPreservedSegment(messages, directKeepIndex, {
    minMessages: 2,
    minTokens: 1,
    maxTokens: 1400,
    summaryChecksum: "compact-strategy-direct-summary",
    transcriptPath: "compact-strategy-direct-raw.json",
    now: "2026-07-08T00:00:00.000Z",
  });
  const directDecision = buildGroupCompactStrategyDecision({
    groupId: "compact-strategy-direct",
    messages,
    messagesToCompact: messages.slice(0, directKeepIndex),
    keptMessages: messages.slice(directKeepIndex),
    keepIndex: directKeepIndex,
    compacted: true,
    primaryCompact: true,
    microCompact: directMicro,
    preservedSegment: directPreserved,
    preCompactTokenCount: 9000,
    postCompactTokenCount: 1800,
    summaryChecksum: "compact-strategy-direct-summary",
    transcriptPath: "compact-strategy-direct-raw.json",
    reason: "selftest direct strategy decision",
    now: "2026-07-08T00:00:00.000Z",
  });
  const compacted: any = await compactGroupConversationMemory({
    groupId: `compact-strategy-selftest-${process.pid}`,
    groupSessionId: "gcs_compact_strategy_selftest",
    messages,
    memory: { goal: "compact strategy decision selftest", compaction: {} },
    transcriptPath: "compact-strategy-selftest-raw.json",
    force: true,
    config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1400, microCompact: { maxChars: 900 } },
  });
  const decision = compacted.memory?.compaction?.compactStrategyDecision || {};
  const boundaryDecision = compacted.boundary?.post_compact_restore?.strategyDecision || {};
  const checks = {
    directDecisionHasSchema: directDecision.schema === "ccm-group-compact-strategy-decision-v1"
      && directDecision.mode
      && directDecision.transcriptPath === "compact-strategy-direct-raw.json",
    directDecisionRecordsWindow: directDecision.messagesToSummarize === directKeepIndex
      && directDecision.keptMessages === messages.length - directKeepIndex
      && directDecision.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    directDecisionPassesInvariants: directDecision.invariantPass === true
      && directDecision.invariants?.noSplitTaskTransactions === true
      && directDecision.invariants?.noSplitToolResultPairs === true,
    compactResultCarriesDecision: decision.schema === "ccm-group-compact-strategy-decision-v1"
      && decision.compacted === true
      && decision.summaryChecksum === compacted.memory?.compaction?.summaryChecksum,
    boundaryCarriesDecision: boundaryDecision.decisionChecksum === decision.decisionChecksum
      && compacted.boundary?.compactStrategyDecision?.decisionChecksum === decision.decisionChecksum,
    decisionMentionsCcStyleMode: ["normal_compact", "micro_compact", "partial_compact", "ptl_emergency", "ptl_recovery"].includes(decision.mode)
      && decision.strategy === "cc-session-memory-v3-compatible",
  };
  return { pass: Object.values(checks).every(Boolean), checks, decision: { mode: decision.mode, invariantPass: decision.invariantPass, decisionChecksum: decision.decisionChecksum } };
}

export async function runGroupPostCompactCleanupAuditSelfTest() {
  const groupId = `post-compact-cleanup-selftest-${process.pid}`;
  const groupSessionId = "gcs_post_compact_cleanup_selftest";
  const messages: any[] = [];
  for (let i = 0; i < 20; i++) {
    messages.push({
      id: `pcca-user-${i}`,
      role: "user",
      target: "coordinator",
      content: i === 0
        ? "必须保留 POST_COMPACT_CLEANUP_SENTINEL，压缩后不能清掉 skill/tool continuity。"
        : `cleanup audit 用户消息 ${i} src/cleanup-${i}.ts ${"上下文".repeat(30)}`,
    });
    messages.push({
      id: `pcca-agent-${i}`,
      role: "assistant",
      agent: "api",
      task_id: `pcca-task-${i}`,
      content: `Skill:typescript-audit#cleanup-${i}\napi cleanup 输出 ${i}，文件 src/cleanup-${i}.ts，npm run check ${"日志".repeat(40)}`,
      invokedSkills: [{ name: "typescript-audit", contentHash: `cleanup-${i}` }],
      receipt: { status: "done", filesChanged: [`src/cleanup-${i}.ts`], verification: ["npm run check"] },
    });
  }
  const result: any = await compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages,
    memory: { goal: "post compact cleanup audit selftest", compaction: {} },
    transcriptPath: "post-compact-cleanup-selftest-raw.json",
    force: true,
    config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1600, microCompact: { maxChars: 900 } },
  });
  const audit = result.memory?.compaction?.postCompactCleanupAudit || {};
  const boundaryAudit = result.boundary?.post_compact_restore?.cleanupAudit || {};
  const messageCompressionAudit = result.memory?.messageCompression?.postCompactCleanupAudit || {};
  const receipt = result.compactTransactionReceipt || result.memory?.compaction?.compactTransactionReceipt || {};
  const actionIds = (audit.cleanupActions || []).map((item: any) => item.id);
  const checkById = new Map<string, any>((audit.checks || []).map((check: any) => [check.id, check]));
  const auditVerification = verifyGroupPostCompactCleanupAudit(audit, { groupId, groupSessionId, boundaryId: result.boundary?.id });
  const receiptVerification = verifyGroupCompactTransactionReceipt(receipt, {
    groupId,
    groupSessionId,
    boundaryId: result.boundary?.id,
    cleanupAuditChecksum: audit.audit_checksum,
  });
  const tamperedAudit = {
    ...audit,
    groupSessionId: "gcs_post_compact_cleanup_other",
    scopeId: `${groupId}::gcs_post_compact_cleanup_other`,
    compactSource: {
      ...(audit.compactSource || {}),
      querySource: `group_main:${groupId}::gcs_post_compact_cleanup_other`,
    },
    cleanupScope: {
      ...(audit.cleanupScope || {}),
      groupSessionId: "gcs_post_compact_cleanup_other",
      scopeId: `${groupId}::gcs_post_compact_cleanup_other`,
    },
  };
  tamperedAudit.audit_checksum = groupPostCompactCleanupAuditChecksum(tamperedAudit);
  const crossSessionVerification = verifyGroupPostCompactCleanupAudit(tamperedAudit, { groupId, groupSessionId, boundaryId: result.boundary?.id });
  const reboundReceiptVerification = verifyGroupCompactTransactionReceipt(receipt, {
    groupId,
    groupSessionId,
    boundaryId: result.boundary?.id,
    cleanupAuditChecksum: tamperedAudit.audit_checksum,
  });
  const checks = {
    cleanupAuditHasSchema: audit.schema === "ccm-post-compact-cleanup-audit-v2"
      && audit.status === "pass"
      && audit.action === "cleanup_recorded_and_safe_to_dispatch_fresh_child_context",
    cleanupAuditBindsExactMainAgentSession: auditVerification.valid === true
      && audit.groupSessionId === groupSessionId
      && audit.scopeId === `${groupId}::${groupSessionId}`
      && audit.compactSource?.kind === "group_main_agent"
      && audit.cleanupScope?.allowsOtherGroupSessionReset === false
      && audit.cleanupScope?.allowsGlobalReset === false,
    cleanupAuditRecordedEverywhere: boundaryAudit.schema === audit.schema
      && boundaryAudit.summaryChecksum === audit.summaryChecksum
      && messageCompressionAudit.schema === audit.schema,
    cleanupLinksStrategyAndRecovery: checkById.get("strategy_decision_linked")?.pass === true
      && checkById.get("recovery_audit_linked")?.pass === true
      && audit.compactStrategyDecisionId === result.memory?.compaction?.compactStrategyDecision?.decisionId,
    cleanupPreservesRawTranscript: checkById.get("raw_transcript_preserved")?.pass === true
      && audit.transcriptPath === "post-compact-cleanup-selftest-raw.json",
    cleanupPreservesSkillAndToolContinuity: audit.preserveInvokedSkills === true
      && audit.preserveToolContinuity === true
      && checkById.get("invoked_skills_preserved")?.pass === true,
    cleanupActionsCoverCcStyleState: ["reset_microcompact_tracking", "rebuild_child_context_packets", "preserve_skill_continuity", "preserve_raw_recovery_sources", "do_not_delete_ledgers"].every(id => actionIds.includes(id)),
    cleanupDoesNotMutateRawMessages: messages[0].content.includes("POST_COMPACT_CLEANUP_SENTINEL")
      && messages.length === 40,
    compactReceiptBindsCleanupAuditChecksum: receipt.schema === "ccm-group-memory-compact-transaction-receipt-v3"
      && receipt.cleanup_audit_checksum === audit.audit_checksum
      && receiptVerification.valid === true,
    crossSessionAuditCopyFailsClosed: crossSessionVerification.valid === false
      && crossSessionVerification.issues.includes("post_compact_cleanup_group_session_mismatch"),
    recomputedTamperedAuditCannotRebindReceipt: reboundReceiptVerification.valid === false
      && reboundReceiptVerification.issues.includes("compact_transaction_cleanup_audit_mismatch"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, audit: { status: audit.status, actionIds, failedChecks: audit.failedChecks || [] } };
}

export async function runGroupApiMicroCompactEditPlanSelfTest() {
  const messages: any[] = [
    {
      id: "api-mc-thinking",
      role: "assistant",
      agent: "api",
      timestamp: "2026-07-08T03:00:00.000Z",
      content: [
        { type: "thinking", thinking: "API_MICROCOMPACT_THINKING_SENTINEL" },
        { type: "tool_use", id: "tool-read-1", name: "Read", input: { file_path: "src/api-microcompact.ts" } },
      ],
    },
    {
      id: "api-mc-tool-result",
      role: "user",
      timestamp: "2026-07-08T03:01:00.000Z",
      content: [
        { type: "tool_result", tool_use_id: "tool-read-1", content: "src/api-microcompact.ts\nAPI_MICROCOMPACT_TOOL_RESULT_SENTINEL" },
      ],
    },
    ...Array.from({ length: 28 }, (_, index) => ({
      id: `api-mc-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: `API microcompact edit plan 自测 ${index}，src/api-microcompact-${index}.ts ${"上下文".repeat(40)}`,
    })),
  ];
  const direct = buildGroupApiMicroCompactEditPlan(messages, {
    groupId: "api-microcompact-direct",
    activeTokens: 220_000,
    force: true,
    now: "2026-07-08T04:30:00.000Z",
  });
  const compacted: any = await compactGroupConversationMemory({
    groupId: `api-microcompact-selftest-${process.pid}`,
    groupSessionId: "gcs_api_microcompact_selftest",
    messages,
    memory: { goal: "api microcompact edit plan selftest", compaction: {} },
    transcriptPath: "api-microcompact-selftest-raw.json",
    force: true,
    config: {
      minKeepMessages: 2,
      minKeepTokens: 1,
      maxKeepTokens: 1600,
      apiMicrocompactMaxInputTokens: 1000,
      apiMicrocompactTargetInputTokens: 400,
    },
  });
  const plan = compacted.memory?.compaction?.apiMicroCompactEditPlan || {};
  const boundaryPlan = compacted.boundary?.post_compact_restore?.apiMicroCompactEditPlan || {};
  const editTypes = (direct.contextManagement?.edits || []).map((edit: any) => edit.type);
  const checks = {
    directPlanHasSchema: direct.schema === "ccm-api-microcompact-edit-plan-v1"
      && direct.source === "claude-code-api-microcompact-compatible"
      && direct.planChecksum,
    directPlanIncludesThinkingEdit: editTypes.includes("clear_thinking_20251015")
      && direct.signalCounts.thinkingBlocks >= 1,
    directPlanIncludesToolEdit: editTypes.includes("clear_tool_uses_20250919")
      && direct.signalCounts.toolUses >= 1
      && direct.signalCounts.toolResults >= 1,
    compactResultCarriesPlan: plan.schema === "ccm-api-microcompact-edit-plan-v1"
      && plan.editCount > 0
      && plan.contextManagement?.edits?.length === plan.editCount,
    boundaryAndCleanupCarryPlan: boundaryPlan.planChecksum === plan.planChecksum
      && compacted.memory?.compaction?.postCompactCleanupAudit?.apiMicroCompactEditPlanId === plan.planChecksum,
    planIsAdvisoryForThirdPartyCli: plan.advisoryOnly === true
      && plan.canApplyNatively === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks, plan: { editCount: plan.editCount, checksum: plan.planChecksum, signalCounts: plan.signalCounts } };
}

export function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
  const editPlan = buildGroupApiMicroCompactEditPlan([
    {
      id: "native-apply-thinking",
      role: "assistant",
      content: [{ type: "thinking", thinking: "NATIVE_APPLY_THINKING_SENTINEL" }],
    },
    {
      id: "native-apply-tool",
      role: "assistant",
      content: [{ type: "tool_use", id: "native-read", name: "Read", input: { file_path: "src/native.ts" } }],
    },
    {
      id: "native-apply-result",
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "native-read", content: "native apply result" }],
    },
  ], {
    groupId: "native-apply-selftest",
    targetProject: "api",
    activeTokens: 220000,
    force: true,
    now: "2026-07-08T07:00:00.000Z",
  });
  const cli = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claudecode",
    transport: "cli",
    now: "2026-07-08T07:01:00.000Z",
  });
  const native = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claude-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    contextManagementBetaHeaderEnabled: true,
    sessionBinding: {
      schema: "ccm-child-agent-memory-session-binding-v1",
      binding_id: "csm-native-apply-selftest",
      task_agent_session_id: "tas-native-apply-selftest",
      native_session_id: "native-native-apply-selftest",
    },
    now: "2026-07-08T07:02:00.000Z",
  });
  const missingBeta = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claude-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    now: "2026-07-08T07:03:00.000Z",
  });
  const checks = {
    cliStaysAdvisory: cli.schema === "ccm-api-microcompact-native-apply-plan-v1"
      && cli.mode === "advisory_only"
      && cli.nativeApplyReady === false
      && cli.requestPatch === null
      && cli.executor.cli === true,
    nativeApiBuildsRealRequestPatch: native.mode === "native_api_context_management"
      && native.nativeApplyReady === true
      && native.requestPatch?.body?.context_management?.edits?.length === editPlan.editCount
      && native.requestPatch?.beta_headers?.includes(GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA),
    nativePatchLinksEditPlan: native.apiEditPlanChecksum === editPlan.planChecksum
      && native.requestPatchChecksum
      && native.applyPlanChecksum,
    nativePatchBindsChildAgentSession: native.task_agent_session_id === "tas-native-apply-selftest"
      && native.sessionBindingRequired === true
      && native.receiptContract?.required_task_agent_session_id === "tas-native-apply-selftest"
      && native.receiptContract?.required_apply_plan_checksum === native.applyPlanChecksum,
    missingBetaFailsClosed: missingBeta.nativeApplyReady === false
      && missingBeta.failedChecks.includes("context_management_beta_enabled")
      && missingBeta.requestPatch === null,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    cli: { mode: cli.mode, reason: cli.reason, failedChecks: cli.failedChecks },
    native: { mode: native.mode, requestPatch: native.requestPatch, checksum: native.applyPlanChecksum },
    missingBeta: { mode: missingBeta.mode, failedChecks: missingBeta.failedChecks },
  };
}

export function runGroupMemoryQualityGateSelfTest() {
  const messages: any[] = [
    {
      id: "q-user-0",
      role: "user",
      target: "coordinator",
      content: "必须保留 HARD_MEMORY_SENTINEL_20260707，不能在测试失败时声明全部完成。",
    },
    {
      id: "q-worker-0",
      role: "assistant",
      agent: "backend",
      task_id: "quality-task-1",
      content: "执行失败：vitest timeout，quality-task-1 blocked，需要继续修复。",
      receipt: { status: "failed", taskId: "quality-task-1", summary: "vitest timeout" },
    },
  ];
  const fallback = buildDeterministicConversationSummary(messages, {
    goal: "质量门禁自测",
    nextActions: [{ action: "继续修复 quality-task-1" }],
  });
  const persistentRequirements = mergePersistentRequirements([], extractPersistentRequirements(messages));
  const factAnchors = mergeFactAnchors([], extractFactAnchors(messages));
  const good = evaluateGroupMemorySummaryQuality(fallback, fallback, messages, {}, { persistentRequirements, factAnchors });
  const bad: ConversationSummary = {
    ...fallback,
    userMessages: [],
    errorsAndFixes: [],
    pendingTasks: [],
    taskStates: [],
    currentWork: "released to production PROD_RELEASE_999",
    nextStep: "",
    completedWork: mergeUnique(fallback.completedWork, ["released to production PROD_RELEASE_999"], 30, 700),
  };
  const badQuality = evaluateGroupMemorySummaryQuality(bad, fallback, messages, {}, { persistentRequirements, factAnchors });
  const checks = {
    goodSummaryPasses: good.pass === true && good.score >= 80,
    goodSummaryPreservesSentinel: JSON.stringify(fallback).includes("HARD_MEMORY_SENTINEL_20260707"),
    badSummaryFails: badQuality.pass === false && badQuality.downgrade_required === true,
    driftDetected: badQuality.drift.detected === true,
    missingFallbackDetected: badQuality.checks.some(check => check.id === "fallback_preserved" && check.pass === false),
    ungroundedCompletionDetected: badQuality.checks.some(check => check.id === "no_ungrounded_completion" && check.pass === false),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    good: { score: good.score, status: good.status },
    bad: { score: badQuality.score, status: badQuality.status, downgrade_reason: badQuality.downgrade_reason },
  };
}

export function runGroupMemoryMicroCompactSelfTest() {
  const longOutput = [
    "构建输出开始",
    "src/payment/callback.ts",
    "Skill:typescript-audit#abc123",
    "npm run check passed",
    "x".repeat(12_000),
    "构建输出结束 MICRO_COMPACT_TAIL_SENTINEL",
  ].join("\n");
  const messages: any[] = [
    {
      id: "mc-user-0",
      role: "user",
      content: "实现支付回调。",
    },
    {
      id: "mc-agent-0",
      role: "assistant",
      agent: "payment-agent",
      task_id: "mc-task",
      content: longOutput,
      invokedSkills: [{ name: "typescript-audit", contentHash: "abc123" }],
      receipt: {
        status: "done",
        filesChanged: ["src/payment/callback.ts"],
        verification: ["npm run check passed"],
      },
    },
  ];
  const micro = buildGroupMicroCompactPlan(messages, { maxChars: 1400 });
  const reinject = buildPostCompactReinjectionPlan(messages, micro);
  const checks = {
    compactedLongAgentOutput: micro.compactedMessageCount === 1 && micro.tokensFreed > 0,
    preservesTailSentinel: JSON.stringify(micro.records).includes("MICRO_COMPACT_TAIL_SENTINEL"),
    recordsChecksum: String(micro.records?.[0]?.checksum || "").length === 16,
    reinjectsFile: reinject.files.some((item: any) => String(item.value || "").includes("src/payment/callback.ts")),
    reinjectsSkill: reinject.skills.some((item: any) => String(item.value || "").includes("typescript-audit")),
    reinjectsVerification: reinject.verification.some((item: any) => String(item.value || "").includes("npm run check")),
  };
  return { pass: Object.values(checks).every(Boolean), checks, micro: { recordCount: micro.recordCount, compactedMessageCount: micro.compactedMessageCount, tokensFreed: micro.tokensFreed }, reinject };
}

export function runGroupMemoryTimeBasedMicroCompactSelfTest() {
  const base = Date.parse("2026-07-07T00:00:00.000Z");
  const messages = Array.from({ length: 8 }, (_, index) => ({
    id: `tb-${index}`,
    role: "assistant",
    agent: "worker",
    timestamp: new Date(base + index * 60_000).toISOString(),
    task_id: `tb-task-${index}`,
    content: `time based micro compact output ${index} src/time-${index}.ts npm run check ${"结果".repeat(40)}`,
    receipt: {
      status: index % 3 === 0 ? "failed" : "done",
      taskId: `tb-task-${index}`,
      summary: `time based result ${index}`,
      verification: ["npm run check"],
      filesChanged: [`src/time-${index}.ts`],
    },
  }));
  const plan = buildGroupMicroCompactPlan(messages, {
    timeBased: {
      enabled: true,
      gapThresholdMinutes: 60,
      keepRecent: 3,
      now: "2026-07-07T02:30:00.000Z",
    },
    maxChars: 5000,
  });
  const notTriggered = buildGroupMicroCompactPlan(messages, {
    timeBased: {
      enabled: true,
      gapThresholdMinutes: 240,
      keepRecent: 3,
      now: "2026-07-07T02:30:00.000Z",
    },
    maxChars: 5000,
  });
  const cleared = (plan.records || []).filter((record: any) => record.timeBasedCleared);
  const keptIds = new Set(messages.slice(-3).map((message: any) => message.id));
  const checks = {
    timeBasedTriggered: plan.timeBased?.triggered === true && plan.timeBased.reason === "assistant_gap_exceeded_threshold",
    clearsOldButKeepsRecent: cleared.length === 5 && cleared.every((record: any) => !keptIds.has(record.messageId)),
    preservesArtifactHints: JSON.stringify(plan.records || []).includes("src/time-0.ts") && JSON.stringify(plan.records || []).includes("npm run check"),
    recordsClearedPlaceholder: cleared.every((record: any) => String(record.text || "").includes(GROUP_TIME_BASED_MC_CLEARED_MESSAGE)),
    freesTokens: Number(plan.tokensFreed || 0) > 0 && Number(plan.tokensAfter || 0) < Number(plan.tokensBefore || 0),
    notTriggeredWhenGapBelowThreshold: notTriggered.timeBased?.triggered === false && (notTriggered.records || []).every((record: any) => record.timeBasedCleared !== true),
    rawTranscriptUntouched: messages[0].content.includes("time based micro compact output 0") && messages.length === 8,
  };
  return { pass: Object.values(checks).every(Boolean), checks, timeBased: plan.timeBased, cleared: cleared.map((record: any) => record.messageId) };
}

export async function runGroupMemoryCompactionHookSelfTest() {
  const groupId = `hook-self-test-${process.pid}-${Date.now().toString(36)}`;
  const groupSessionId = "gcs_hook_selftest";
  const ledgerFile = getGroupMemoryCompactionHookLedgerFile(groupId, groupSessionId);
  const messages = Array.from({ length: 90 }, (_, index) => ({
    id: `hook-${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "hook-agent" : undefined,
    content: index === 1
      ? `Agent 输出 ${"x".repeat(6000)} src/hook-memory.ts`
      : `hook 测试消息 ${index} ${"内容".repeat(520)}`,
  }));
  const unregisterPre = registerGroupMemoryCompactionHook("pre", input => ({
    mustKeep: [{ id: "hook-must-keep", messageId: "hook-pre", text: `必须保留 HOOK_SENTINEL_${input.groupId}` }],
    factAnchors: [{ id: "hook-anchor", type: "dispatch_decision", messageId: "hook-pre", text: "hook 注入调度事实" }],
  }));
  const unregisterPost = registerGroupMemoryCompactionHook("post", input => ({
    checked: input.quality?.pass === true,
    microRecords: input.microCompact?.recordCount || 0,
  }));
  try {
    const result: any = await compactGroupConversationMemory({
      groupId,
      groupSessionId,
      messages,
      memory: { goal: "hook 自测" },
      config: { memoryCompactionUseModel: false },
      transcriptPath: "hook-raw.json",
      force: true,
    });
    const checks = {
      compacted: result.compacted === true,
      preHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.pre) && result.memory.compaction.hookResults.pre.length >= 1,
      postHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.post) && result.memory.compaction.hookResults.post.length >= 1,
      hookRequirementPersisted: (result.memory?.persistentRequirements || []).some((item: any) => String(item.text || "").includes(`HOOK_SENTINEL_${groupId}`)),
      hookFactAnchorPersisted: (result.memory?.factAnchors || []).some((item: any) => String(item.text || "").includes("hook 注入调度事实")),
      microCompactStored: Number(result.memory?.compaction?.microCompact?.recordCount || 0) > 0,
      reinjectionStored: result.memory?.compaction?.postCompactReinject?.hasCandidates === true,
      hookLedgerStored: result.memory?.compaction?.hookLedger?.schema === "ccm-group-memory-compaction-hook-ledger-summary-v1"
        && result.memory.compaction.hookLedger?.recentEntries?.some((entry: any) => entry.phase === "pre")
        && result.memory.compaction.hookLedger?.recentEntries?.some((entry: any) => entry.phase === "post"),
      hookLedgerReadable: readGroupMemoryCompactionHookLedger(groupId, groupSessionId).entries?.length >= 2
        && readGroupMemoryCompactionHookLedger(groupId, groupSessionId).stats?.pre?.ok >= 1
        && readGroupMemoryCompactionHookLedger(groupId, groupSessionId).stats?.post?.ok >= 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    unregisterPre();
    unregisterPost();
    try { if (fs.existsSync(ledgerFile)) fs.unlinkSync(ledgerFile); } catch {}
  }
}

export async function runGroupMemoryPartialCompactSelfTest() {
  const messages = Array.from({ length: 60 }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "partial-agent" : undefined,
    content: index === 0
      ? "必须保留 PARTIAL_COMPACT_SENTINEL_20260707，并只压缩到指定边界。"
      : `partial compact 阶段 ${index} src/partial-${index}.ts ${"上下文".repeat(220)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "partial-compact-self-test",
    groupSessionId: "gcs_partial_compact_selftest",
    messages,
    memory: { goal: "选择性压缩自测" },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "partial-raw.json",
    partialCompact: { direction: "up_to", messageId: "m30", reason: "selftest selected boundary" },
  });
  const checks = {
    compacted: result.compacted === true,
    boundaryIsPartial: result.boundary?.type === "partial-up-to",
    compactedThroughSelected: result.boundary?.summarizedThroughMessageId === "m30" && result.memory?.compaction?.lastCompactedMessageId === "m30",
    laterMessagesRemainRaw: result.keepIndex === 31 && messages[result.keepIndex]?.id === "m31" && result.boundary?.preservedMessageIds?.includes("m31"),
    partialMetadataRecorded: result.memory?.compaction?.partialCompact?.schema === "ccm-group-partial-compact-v1"
      && result.memory.compaction.partialCompact.enabled === true
      && result.memory.compaction.partialCompact.direction === "up_to",
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PARTIAL_COMPACT_SENTINEL_20260707"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    keepIndex: result.keepIndex,
    boundary: result.boundary,
  };
}

export async function runGroupMemoryPartialCompactSidecarSelfTest() {
  const messages = Array.from({ length: 48 }, (_, index) => ({
    id: `s${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "sidecar-agent" : undefined,
    content: index === 20
      ? "必须保留 PARTIAL_SIDECAR_SENTINEL_20260707，并只作为 sidecar 中段摘要，不推进主压缩边界。"
      : index === 24
        ? "执行失败：sidecar-task blocked，src/sidecar.ts 需要继续修复。"
        : `partial sidecar 阶段 ${index} src/sidecar-${index}.ts`,
    task_id: index >= 20 && index <= 30 ? "sidecar-task" : undefined,
    receipt: index === 24 ? { status: "failed", taskId: "sidecar-task", summary: "sidecar blocked" } : undefined,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "partial-sidecar-self-test",
    groupSessionId: "gcs_partial_sidecar_selftest",
    messages,
    memory: {
      goal: "选择性 sidecar 压缩自测",
      compaction: {
        version: GROUP_MEMORY_COMPACTION_VERSION,
        lastCompactedMessageId: "s5",
        compactedMessageCount: 6,
      },
    },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "partial-sidecar-raw.json",
    partialCompact: { direction: "range", fromMessageId: "s20", throughMessageId: "s30", reason: "selftest sidecar range" },
  });
  const segment = result.memory?.compaction?.partialSegments?.[0] || {};
  const cleanupAudit = result.postCompactCleanupAudit || result.memory?.compaction?.postCompactCleanupAudit || {};
  const cleanupVerification = verifyGroupPostCompactCleanupAudit(cleanupAudit, {
    groupId: "partial-sidecar-self-test",
    groupSessionId: "gcs_partial_sidecar_selftest",
    boundaryId: segment.id,
  });
  const checks = {
    sidecarCompacted: result.compacted === true && result.partialCompacted === true,
    primaryBoundaryUnchanged: !result.boundary && result.memory?.compaction?.lastCompactedMessageId === "s5"
      && Number(result.memory?.compaction?.compactedMessageCount || 0) === 6,
    sidecarMetadataRecorded: segment.schema === "ccm-group-partial-compact-segment-v1"
      && segment.direction === "range"
      && segment.range?.fromMessageId === "s20"
      && segment.range?.throughMessageId === "s30",
    sidecarSummaryPreservesSentinel: JSON.stringify(segment.summary || {}).includes("PARTIAL_SIDECAR_SENTINEL_20260707")
      && String(segment.messageDigest || "").includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
    sidecarQualityPasses: segment.quality?.pass === true && Number(segment.quality?.score || 0) >= 80,
    sidecarReinjectsFile: JSON.stringify(segment.reinjectionPlan || {}).includes("src/sidecar-"),
    sidecarFactMerged: JSON.stringify(result.memory?.persistentRequirements || []).includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
    sidecarCleanupDoesNotResetPrimaryDerivedState: cleanupVerification.valid === true
      && cleanupAudit.partialSidecarOnly === true
      && cleanupAudit.resetDerivedCompactState === false
      && cleanupAudit.cleanupScope?.allowsExactGroupSessionReset === false
      && cleanupAudit.cleanupScope?.allowsDescendantProviderReset === false,
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    partialSegment: segment,
  };
}

export async function runGroupMemoryPtlEmergencySelfTest() {
  const messages = Array.from({ length: 70 }, (_, index) => ({
    id: `ptl-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "ptl-agent" : undefined,
    content: index === 0
      ? "必须保留 PTL_SENTINEL_20260707，PTL 紧急降级不得修改原始消息。"
      : `PTL 压力阶段 ${index} src/ptl-${index}.ts ${"高压上下文".repeat(280)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "ptl-emergency-self-test",
    groupSessionId: "gcs_ptl_emergency_selftest",
    messages,
    memory: { goal: "PTL 紧急降级自测" },
    config: { memoryCompactionUseModel: false, ptlEmergency: true },
    transcriptPath: "ptl-raw.json",
    force: true,
  });
  const maxDigest = Number(result.memory?.compaction?.ptlEmergency?.messageDigestMaxChars || 0);
  const checks = {
    compacted: result.compacted === true,
    ptlRecordedInCompaction: result.memory?.compaction?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
      && result.memory.compaction.ptlEmergency.engaged === true,
    ptlRecordedInBoundary: result.boundary?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
      && result.boundary.ptlEmergency.rawTranscriptUnmodified === true,
    ptlRecordedInMessageCompression: result.memory?.messageCompression?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1",
    healthDowngraded: result.memory?.compaction?.health === "ptl_emergency",
    digestIsBounded: maxDigest > 0 && String(result.memory?.messageDigest || "").length <= maxDigest + 200,
    qualityStillPasses: result.memory?.compaction?.quality?.pass === true,
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_SENTINEL_20260707"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    ptlEmergency: result.memory?.compaction?.ptlEmergency,
  };
}

export async function runGroupMemoryPtlRecoverySelfTest() {
  const messages = Array.from({ length: 52 }, (_, index) => ({
    id: `ptlr-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "ptl-recovery-agent" : undefined,
    content: index === 0
      ? "必须保留 PTL_RECOVERY_SENTINEL_20260707，压力恢复后应退出紧急摘要。"
      : `PTL recovery 阶段 ${index} src/ptl-recovery-${index}.ts ${"恢复上下文".repeat(80)}`,
  }));
  const previousEmergency = {
    schema: "ccm-group-ptl-emergency-v1",
    version: GROUP_PTL_EMERGENCY_VERSION,
    engaged: true,
    emergencyLevel: "critical",
    reason: "previous_context_pressure_exhausted",
    triggerTokens: GROUP_COMPACT_TRIGGER_TOKENS,
    messageDigestMaxChars: 700,
    rawTranscriptPath: "ptl-recovery-raw.json",
  };
  const result: any = await compactGroupConversationMemory({
    groupId: "ptl-recovery-self-test",
    groupSessionId: "gcs_ptl_recovery_selftest",
    messages,
    memory: {
      goal: "PTL 自动恢复自测",
      compaction: {
        version: GROUP_MEMORY_COMPACTION_VERSION,
        ptlEmergency: previousEmergency,
        health: "ptl_emergency",
      },
    },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "ptl-recovery-raw.json",
    force: true,
  });
  const recovery = result.memory?.compaction?.ptlRecovery || {};
  const checks = {
    compacted: result.compacted === true,
    recoveryRecorded: recovery.schema === "ccm-group-ptl-recovery-v1" && recovery.recovered === true,
    emergencyCleared: !result.memory?.compaction?.ptlEmergency && !result.memory?.messageCompression?.ptlEmergency,
    healthHealthy: result.memory?.compaction?.health === "healthy",
    digestRestoredAboveEmergencyBudget: String(result.memory?.messageDigest || "").length > previousEmergency.messageDigestMaxChars,
    recoveryStoredInBoundaryBudget: result.boundary?.context_budget?.ptl_recovery?.schema === "ccm-group-ptl-recovery-v1",
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_RECOVERY_SENTINEL_20260707"),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    recovery,
  };
}

export async function runGroupMemoryCompactionIntegrationSelfTest() {
  const messages = Array.from({ length: 70 }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: index === 0
      ? "实现支付回调，必须保留幂等校验"
      : index === 20
        ? "Error: signature mismatch in src/pay.ts"
        : `阶段 ${index} ${"内容".repeat(250)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const first: any = await compactGroupConversationMemory({
    groupId: "compaction-self-test",
    groupSessionId: "gcs_compaction_selftest",
    messages,
    memory: { goal: "支付回调", nextActions: [{ action: "继续验签测试" }] },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const appended = messages.concat(Array.from({ length: 30 }, (_, index) => ({
    id: `n${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: `新增阶段 ${index} ${"x".repeat(1000)}`,
  })));
  const second: any = first.compacted
    ? await compactGroupConversationMemory({
      groupId: "compaction-self-test",
      groupSessionId: "gcs_compaction_selftest",
      messages: appended,
      memory: first.memory,
      config: {},
      transcriptPath: "raw.json",
      force: true,
    })
    : { compacted: false };
  const migrated: any = await compactGroupConversationMemory({
    groupId: "compaction-migration-self-test",
    groupSessionId: "gcs_compaction_migration_selftest",
    messages,
    memory: { compaction: { version: 2, lastCompactedMessageId: "m60" } },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const expectedSecondStart = first.compacted ? messages[first.keepIndex]?.id : "";
  const checks = {
    actualAsyncCompaction: !!first.compacted,
    structuredFallbackWithoutModel: first.memory?.compaction?.summarySource === "structured",
    qualityGatePassed: first.memory?.compaction?.quality?.pass === true,
    microCompactRecorded: first.memory?.compaction?.microCompact?.schema === "ccm-group-micro-compact-v1",
    postCompactReinjectRecorded: first.memory?.compaction?.postCompactReinject?.schema === "ccm-post-compact-reinjection-v1",
    fallbackPreservesUserIntent: !!first.memory?.conversationSummary?.userMessages?.length,
    rawMessagesRemainImmutable: JSON.stringify(messages) === originalMessages,
    incrementalSecondCompaction: !!second.compacted,
    nextBoundaryStartsAfterPrevious: second.boundary?.summarizedFromMessageId === expectedSecondStart,
    postCompactRestoreAnchorsRecorded: Array.isArray(first.boundary?.post_compact_restore?.preservedMessageIds) && first.boundary.post_compact_restore.preservedMessageIds.length > 0,
    legacyVersionRebuildsFromRawTranscript: migrated.memory?.compaction?.version === GROUP_MEMORY_COMPACTION_VERSION
      && migrated.memory?.compaction?.migratedFromVersion === 2
      && migrated.boundary?.summarizedFromMessageId === "m0",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

export async function runGroupMemoryCompactionStressSelfTest() {
  const messages: any[] = [];
  let memory: any = { goal: "长期维护支付审计链路", nextActions: [{ action: "继续完成当前任务" }] };
  let lastBoundaryIndex = -1;
  let boundariesAdvance = true;
  let validationsPass = true;
  let checksumsPresent = true;
  let reductionsHealthy = true;
  for (let round = 0; round < 12; round += 1) {
    for (let offset = 0; offset < 100; offset += 1) {
      const index = round * 100 + offset;
      const role = index % 2 === 0 ? "user" : "assistant";
      const taskId = `stress-task-${Math.floor(index / 40)}`;
      const content = index === 0
        ? "必须保留审计日志，任何压缩都不得删除 AUDIT_SENTINEL_73921"
        : index === 640
          ? "新的约束：支付回调必须使用幂等键 IDEMPOTENCY_V2"
          : `${role === "user" ? "用户要求" : "Agent进度"} ${index}，处理 src/payment/module-${index}.ts，${"上下文".repeat(180)}`;
      messages.push({
        id: `stress-${index}`,
        role,
        agent: role === "assistant" ? "payment-agent" : undefined,
        target: role === "user" ? "coordinator" : undefined,
        task_id: taskId,
        content,
        receipt: role === "assistant" ? { status: index % 40 === 39 ? "done" : "partial", summary: `任务阶段 ${index}` } : undefined,
      });
    }
    const result: any = await compactGroupConversationMemory({
      groupId: "compaction-stress-test",
      groupSessionId: "gcs_compaction_stress_selftest",
      messages,
      memory,
      config: {},
      transcriptPath: "stress-raw.json",
      force: true,
    });
    if (!result.compacted) {
      boundariesAdvance = false;
      break;
    }
    const boundaryIndex = messages.findIndex(item => item.id === result.boundary?.summarizedThroughMessageId);
    boundariesAdvance = boundariesAdvance && boundaryIndex > lastBoundaryIndex;
    lastBoundaryIndex = boundaryIndex;
    validationsPass = validationsPass && result.memory?.compaction?.validation?.pass === true;
    validationsPass = validationsPass && result.memory?.compaction?.quality?.pass === true;
    checksumsPresent = checksumsPresent && String(result.memory?.compaction?.summaryChecksum || "").length === 24;
    reductionsHealthy = reductionsHealthy && Number(result.memory?.compaction?.reductionRatio || 0) > 0.2;
    memory = result.memory;
  }
  const retrieval = buildRelevantHistoricalGroupContext(messages, lastBoundaryIndex, "审计日志 AUDIT_SENTINEL_73921");
  const persistent = Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [];
  const checks = {
    handlesTwelveIncrementalCompactions: boundariesAdvance && Number(memory?.compaction?.compactedMessageCount || 0) > 1000,
    summaryValidationNeverDrifts: validationsPass,
    everySummaryHasIntegrityChecksum: checksumsPresent,
    compactionActuallyReleasesContext: reductionsHealthy,
    persistentRequirementSurvives: persistent.some((item: any) => String(item.text || "").includes("AUDIT_SENTINEL_73921"))
      && persistent.some((item: any) => String(item.text || "").includes("IDEMPOTENCY_V2")),
    oldRawEvidenceIsAutomaticallyRetrievable: retrieval.includes("#stress-0") && retrieval.includes("AUDIT_SENTINEL_73921"),
    rawTranscriptRemainsUntouched: messages[0]?.content.includes("AUDIT_SENTINEL_73921") && messages.length === 1200,
    boundaryHistoryIsBounded: Array.isArray(memory?.compaction?.boundaries) && memory.compaction.boundaries.length <= 8,
  };
  return { pass: Object.values(checks).every(Boolean), checks, finalBoundaryIndex: lastBoundaryIndex };
}
