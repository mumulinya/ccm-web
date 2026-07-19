// Behavior-freeze split from group-memory-distillation.ts (part 3/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
  GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
  GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE,
  GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_LEDGER,
  GROUP_TYPED_MEMORY_DISTILLATION_LOCK,
  GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
  GroupTypedMemoryType,
  acquireGroupTypedMemoryDistillationLock,
  activeGroupTypedMemoryDistillationMutations,
  addDistillationQualityCheck,
  buildGroupSessionModelExtractionTypedMemoryTopics,
  buildGroupTypedMemoryDistillationWorkState,
  buildGroupTypedMemoryIndex,
  checksum,
  collectDistilledFacts,
  commitGroupTypedMemoryArtifactMutation,
  compactStrategyInputOutcomes,
  compactStrategyInputStrategy,
  compactStrategyTypedArchive,
  compactText,
  contextUsageRepairArchive,
  distillGroupMessagesToTypedMemoryUnlocked,
  distillationQualityPenalty,
  extractPathClaims,
  extractTaskStateSignal,
  getGroupTypedMemoryDir,
  groupLogDistillationAdmission,
  groupTypedMemoryDistillationLockChecksum,
  groupTypedMemoryDistillationStateChecksum,
  ignoreMemoryReceiptRepairArchive,
  loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows,
  mergeContextUsageRepairRows,
  mergeIgnoreMemoryReceiptRepairRows,
  mergePostCompactCompletionMemoryPreservationRepairClosureRows,
  mergePostCompactReceiptMemoryUsageRepairCompletionRows,
  mergePostCompactReinjectionRepairReceiptConsumptionRows,
  mergePressureMemoryProvenanceReceiptRepairRows,
  mergePressureProvenancePreDispatchComplianceRecoveryRows,
  mergePressureProvenancePreDispatchComplianceRows,
  mergeProviderDispatchOverrideFollowupReceiptValidationRows,
  mergeProviderDispatchOverrideFollowupRows,
  mergeProviderRankingMemoryUsageReceiptRepairRows,
  mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  mergeProviderReproofReceiptConsumptionRows,
  mergeProviderSwitchExecutionRows,
  modelExtractionEvidenceComparable,
  modelExtractionTypedArchiveChecksum,
  normalizeContextUsageRepairRows,
  normalizeIgnoreMemoryReceiptRepairRows,
  normalizeMemoryType,
  normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows,
  normalizePostCompactCompletionMemoryPreservationRepairClosureRows,
  normalizePostCompactReceiptMemoryUsageRepairCompletionRows,
  normalizePostCompactReinjectionRepairReceiptConsumptionRows,
  normalizePressureMemoryProvenanceReceiptRepairRows,
  normalizePressureProvenancePreDispatchComplianceRecoveryRows,
  normalizePressureProvenancePreDispatchComplianceRows,
  normalizeProviderDispatchOverrideFollowupReceiptValidationRows,
  normalizeProviderDispatchOverrideFollowupRows,
  normalizeProviderRankingMemoryUsageReceiptRepairRows,
  normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  normalizeProviderReproofReceiptConsumptionRows,
  normalizeProviderSwitchExecutionRows,
  now,
  positiveFeedbackLifecycleEventChecksum,
  postCompactReceiptMemoryUsageRepairCompletionArchive,
  pressureMemoryProvenanceReceiptRepairArchive,
  pressureProvenancePreDispatchComplianceArchive,
  pressureProvenancePreDispatchComplianceRecoveryArchive,
  pressureProvenanceProviderDispatchOverrideFollowupArchive,
  pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive,
  providerRankingMemoryUsageReceiptRepairArchive,
  providerSwitchExecutionArchive,
  ptlEmergencyTypedArchive,
  readJson,
  recoverGroupTypedMemoryArtifactTransaction,
  releaseGroupTypedMemoryDistillationLock,
  renderCompactStrategyCautionBody,
  renderCompactStrategyReferenceBody,
  renderContextUsageRepairBody,
  renderIgnoreMemoryReceiptRepairBody,
  renderModelExtractionTypedMemoryBody,
  renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody,
  renderPostCompactCompletionMemoryPreservationRepairClosureBody,
  renderPostCompactReceiptMemoryUsageRepairCompletionBody,
  renderPostCompactReinjectionRepairReceiptConsumptionBody,
  renderPressureMemoryProvenanceReceiptRepairBody,
  renderPressureProvenancePreDispatchComplianceBody,
  renderPressureProvenancePreDispatchComplianceRecoveryBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody,
  renderProviderRankingMemoryUsageReceiptRepairBody,
  renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody,
  renderProviderReproofReceiptConsumptionBody,
  renderProviderSwitchExecutionBody,
  renderPtlEmergencyTypedBody,
  resolveClaimPath,
  scanGroupTypedMemoryDocuments,
  scanGroupTypedMemoryDocumentsRaw,
  stageGroupTypedMemoryArtifactRemoval,
  typedMemoryDistillationProcessAlive,
  typedMemoryDistillationWait,
  typedMemorySessionScopeIdentity,
  uniqueStrings,
  upsertGroupTypedMemoryDocument,
  validateModelExtractionTypedMemoryInput,
  verifyGroupTypedMemoryDistillationLock,
  writeGroupTypedMemoryDistillationTransactionState,
  writeJsonAtomic,
  writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive,
} from "./group-memory-index";

import {
  readGroupTypedMemoryDistillationLedger,
  readGroupTypedMemoryDistillationTransactionState,
  runGroupTypedMemoryDistillationMutation,
} from "./group-memory-distillation-part-01";

export function distillPtlEmergencyDowngradeToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "ptl_emergency_downgrade", options, () => distillPtlEmergencyDowngradeToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
      version: GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const archive = ptlEmergencyTypedArchive(groupId, input, { ...options, updatedAt });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const writes: any[] = [];
  if (archive.engaged || archive.outcome_count > 0 || archive.blocked_outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-ptl-emergency-downgrade",
      name: "WorkerContextPacket PTL emergency downgrade discipline",
      description: "Emergency downgrade budgets and cautions for repeated WorkerContextPacket compact failures.",
      source: "auto:ptl-emergency-downgrade-distillation",
      updatedAt,
      body: renderPtlEmergencyTypedBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    facts: ledger.facts || {},
    ptlEmergencyArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
    version: GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    engaged: archive.engaged,
    emergencyLevel: archive.emergency_level,
    blockedOutcomeCount: archive.blocked_outcome_count,
    taskCompactedBlockedCount: archive.task_compacted_blocked_count,
    failedCategoryCount: archive.failed_category_count,
    outcomeCount: archive.outcome_count,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function evaluateGroupTypedMemoryDistillationQuality(groupId: string, options: any = {}) {
  const evaluatedAt = now();
  const projectRoot = path.resolve(String(options.projectRoot || options.project_root || process.cwd()));
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const docs = scanGroupTypedMemoryDocuments(groupId);
  const facts = collectDistilledFacts(ledger);
  const checks: any[] = [];
  const factsByType = new Map<string, any[]>();
  for (const fact of facts) {
    const type = normalizeMemoryType(fact.category || fact.type);
    factsByType.set(type, [...(factsByType.get(type) || []), fact]);
  }

  const inadmissibleFacts = facts
    .map(fact => ({ fact, admission: groupLogDistillationAdmission(fact) }))
    .filter(row => !row.admission.admitted)
    .map(row => `#${row.fact.messageId || ""} ${row.fact.type || row.fact.category || ""}: ${row.admission.reason}`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "long_term_write_admission",
    label: "长期记忆写入符合非流水准入规则",
    pass: inadmissibleFacts.length === 0 && ledger.admission?.schema === "ccm-group-typed-memory-write-admission-v1",
    severity: "fatal",
    detail: inadmissibleFacts.length
      ? "长期记忆仍包含可重建、临时或缺少非显然理由的流水事实。"
      : "通用群聊蒸馏只保留跨会话有效且满足 Claude Code 写入门槛的事实。",
    evidence: [{
      evaluatedThisRun: Number(ledger.admission?.evaluatedThisRun || 0),
      admittedThisRun: Number(ledger.admission?.admittedThisRun || 0),
      rejectedThisRun: Number(ledger.admission?.rejectedThisRun || 0),
      evictedExistingFactCount: Number(ledger.admission?.evictedExistingFactCount || 0),
    }],
    gaps: inadmissibleFacts,
  });

  const invalidPositiveFeedbackFacts = facts
    .filter(fact => fact.type === "validated_approach")
    .filter(fact => {
      const binding = fact?.confirmation || {};
      return binding.schema !== "ccm-group-positive-feedback-binding-v1"
        || binding.explicit !== true
        || binding.targetFound !== true
        || binding.targetSourceRole !== "assistant"
        || binding.scopeMatches !== true
        || binding.checksumMatches !== true
        || binding.targetEligible !== true;
    })
    .map(fact => `#${fact.messageId || ""} validated_approach`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "positive_feedback_binding",
    label: "正向反馈绑定同会话非显然做法",
    pass: invalidPositiveFeedbackFacts.length === 0,
    severity: "fatal",
    detail: invalidPositiveFeedbackFacts.length
      ? "存在没有可靠绑定到同会话 Assistant 做法的正向反馈记忆。"
      : "正向反馈只在同会话目标、checksum、跨会话价值和 Why/How 全部成立时写入。",
    gaps: invalidPositiveFeedbackFacts,
  });

  const positiveFeedbackLifecycle = ledger.positiveFeedbackLifecycle || {};
  const lifecycleEvents = Array.isArray(positiveFeedbackLifecycle.events) ? positiveFeedbackLifecycle.events : [];
  const activeFactIds = new Set(facts.map(fact => String(fact.id || "")).filter(Boolean));
  const invalidLifecycleEvents = lifecycleEvents.filter((event: any) =>
    event.schema !== "ccm-group-positive-feedback-lifecycle-event-v1"
    || Number(event.version || 0) !== GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION
    || event.groupId !== groupId
    || !["revoked", "superseded"].includes(String(event.action || ""))
    || !event.eventId
    || !event.targetFactId
    || !event.targetConfirmationMessageId
    || !event.targetApproachMessageId
    || !/^[a-f0-9]{64}$/.test(String(event.targetApproachChecksum || ""))
    || !event.revocationMessageId
    || !event.reason
    || (event.action === "superseded" && (!event.replacementFactId || !event.replacementMessageId))
    || event.eventChecksum !== positiveFeedbackLifecycleEventChecksum(event)
    || activeFactIds.has(String(event.targetFactId || ""))
  ).map((event: any) => `#${event.eventId || "missing"} ${event.action || "unknown"}`).slice(0, 30);
  const lifecycleObservationsLeakBody = (Array.isArray(positiveFeedbackLifecycle.observations) ? positiveFeedbackLifecycle.observations : [])
    .some((row: any) => row?.text !== undefined || row?.content !== undefined || row?.reasonText !== undefined);
  const lifecycleSummaryMatches = Number(positiveFeedbackLifecycle.activeValidatedCount || 0)
    === facts.filter(fact => fact.type === "validated_approach").length;
  const lifecycleApplicable = positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
    || lifecycleEvents.length > 0
    || facts.some(fact => fact.type === "validated_approach");
  addDistillationQualityCheck(checks, {
    id: "positive_feedback_lifecycle",
    label: "正向反馈撤销与替代保持可验证生命周期",
    pass: !lifecycleApplicable || (positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
      && positiveFeedbackLifecycle.groupId === groupId
      && invalidLifecycleEvents.length === 0
      && lifecycleObservationsLeakBody === false
      && lifecycleSummaryMatches),
    severity: "fatal",
    detail: invalidLifecycleEvents.length || lifecycleObservationsLeakBody || !lifecycleSummaryMatches
      ? "正向反馈生命周期存在无效事件、活动事实残留、统计偏差或拒绝正文泄漏。"
      : "被撤销或替代的正向反馈不再进入活动 MEMORY.md，并保留同会话绑定和校验事件。",
    gaps: [
      ...invalidLifecycleEvents,
      ...(lifecycleObservationsLeakBody ? ["rejected_lifecycle_observation_body_leak"] : []),
      ...(!lifecycleSummaryMatches ? ["active_validated_count_mismatch"] : []),
    ],
  });

  const expectedTypes = [...factsByType.keys()].filter(type => (factsByType.get(type) || []).length > 0);
  const docsByType = new Map<string, any[]>();
  for (const doc of docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation")) {
    docsByType.set(doc.type, [...(docsByType.get(doc.type) || []), doc]);
  }
  const missingTypeDocs = expectedTypes.filter(type => !(docsByType.get(type) || []).length);
  addDistillationQualityCheck(checks, {
    id: "typed_doc_coverage",
    label: "蒸馏事实有对应 typed Markdown",
    pass: missingTypeDocs.length === 0,
    severity: "high",
    detail: missingTypeDocs.length ? "部分蒸馏事实类别缺少对应 Markdown 记忆。" : "所有有事实的类别都有 Markdown 记忆。",
    gaps: missingTypeDocs,
  });

  const docText = docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation").map(doc => doc.body).join("\n");
  const missingSourceLinks = facts
    .filter(fact => fact.messageId && !docText.includes(`#${fact.messageId}`))
    .map(fact => `#${fact.messageId} ${compactText(fact.text, 120)}`)
    .slice(0, 20);
  addDistillationQualityCheck(checks, {
    id: "source_message_links_preserved",
    label: "蒸馏事实保留 source message id",
    pass: missingSourceLinks.length === 0,
    severity: "fatal",
    detail: missingSourceLinks.length ? "部分事实无法从 Markdown 中回溯到 source message id。" : "蒸馏 Markdown 保留了 source message id。",
    gaps: missingSourceLinks,
  });

  const pathClaims = uniqueStrings(facts.flatMap(fact => extractPathClaims(fact.text)), 120);
  const stalePaths = pathClaims
    .map(claim => ({ claim, resolved: resolveClaimPath(projectRoot, claim) }))
    .filter(item => item.resolved && !fs.existsSync(item.resolved))
    .map(item => `${item.claim} -> ${item.resolved}`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "file_path_claims_checked",
    label: "文件路径声明已按当前仓库核验",
    pass: stalePaths.length === 0,
    severity: "medium",
    detail: stalePaths.length ? "部分记忆里的文件路径在当前仓库不存在，使用前必须重新核验。" : "未发现当前仓库不存在的文件路径声明。",
    evidence: pathClaims.slice(0, 30),
    gaps: stalePaths,
  });

  const taskSignals = facts.map(extractTaskStateSignal).filter(Boolean);
  const taskMap = new Map<string, any[]>();
  for (const signal of taskSignals) taskMap.set(signal.taskId, [...(taskMap.get(signal.taskId) || []), signal]);
  const unresolvedContradictions: string[] = [];
  for (const [taskId, signals] of taskMap.entries()) {
    const sorted = signals.sort((a, b) => a.sourceIndex - b.sourceIndex);
    const states = new Set(sorted.map(item => item.state));
    const last = sorted[sorted.length - 1];
    if (states.has("done") && states.has("blocked") && last?.state === "blocked") {
      unresolvedContradictions.push(`[${taskId}] latest=${last.state} #${last.messageId} ${last.text}`);
    }
  }
  addDistillationQualityCheck(checks, {
    id: "no_unresolved_status_contradictions",
    label: "完成/阻塞状态没有未解决矛盾",
    pass: unresolvedContradictions.length === 0,
    severity: "high",
    detail: unresolvedContradictions.length ? "发现同一任务先完成后又阻塞，需按最新阻塞处理。" : "未发现未解决的完成/阻塞矛盾。",
    gaps: unresolvedContradictions.slice(0, 12),
  });

  const hasUsefulFacts = facts.length > 0 && (expectedTypes.includes("user") || expectedTypes.includes("project") || expectedTypes.includes("feedback") || expectedTypes.includes("reference"));
  addDistillationQualityCheck(checks, {
    id: "distilled_signal_not_empty",
    label: "蒸馏结果不是空洞记忆",
    pass: hasUsefulFacts || Number(ledger.sourceMessageCount || 0) === 0,
    severity: "medium",
    detail: hasUsefulFacts ? "蒸馏 ledger 中有可召回事实。" : "存在消息来源但没有可召回蒸馏事实。",
  });

  const failedChecks = checks.filter(check => !check.pass);
  const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + distillationQualityPenalty(check.severity), 0)));
  const status = failedChecks.some(check => check.severity === "fatal") || score < 60
    ? "failed"
    : failedChecks.some(check => check.severity === "high") || score < 80
      ? "degraded"
      : "pass";
  return {
    schema: "ccm-group-typed-memory-distillation-quality-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
    groupId,
    score,
    pass: status === "pass",
    status,
    evaluatedAt,
    projectRoot,
    factCount: facts.length,
    docCount: docs.length,
    pathClaimCount: pathClaims.length,
    stalePathCount: stalePaths.length,
    contradictionCount: unresolvedContradictions.length,
    checks,
  };
}

export function inspectGroupTypedMemoryDistillationWork(groupId: string, messages: any[] = [], options: any = {}) {
  const state = buildGroupTypedMemoryDistillationWorkState(groupId, messages, options);
  const skipReason = state.disabled && state.recoveryReasons.length === 0
    ? "disabled"
    : state.runRequired
      ? "work_pending"
      : "no_new_messages_after_committed_cursor";
  return {
    schema: "ccm-group-typed-memory-distillation-preflight-v1",
    version: 1,
    groupId,
    runRequired: state.runRequired,
    skipped: !state.runRequired,
    reason: skipReason,
    disabled: state.disabled,
    lockRequired: state.runRequired,
    lockAcquired: false,
    previousCommittedMessageId: state.previousCursorMessageId,
    cursorFound: !state.previousCursorMessageId || state.cursorIndex >= 0,
    cursorMissingFallback: state.cursorMissing,
    forceRescan: state.forceRescan,
    eligibleMessageCount: state.eligibleRows.length,
    pendingMessageCount: state.pendingRows.length,
    selectedMessageCount: state.selectedRows.length,
    remainingMessageCount: Math.max(0, state.pendingRows.length - state.selectedRows.length),
    maxMessages: state.maxMessages,
    maintenanceRequired: state.maintenanceReasons.length > 0,
    maintenanceReasons: state.maintenanceReasons,
    recoveryRequired: state.recoveryReasons.length > 0,
    recoveryReasons: state.recoveryReasons,
    postCompactUsageArchiveChanged: state.postCompactUsageArchiveChanged,
  };
}

export function distillGroupMessagesToTypedMemory(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}): any {
  const existingMutation = activeGroupTypedMemoryDistillationMutations.get(groupId);
  if (existingMutation?.handle) {
    existingMutation.depth = Number(existingMutation.depth || 1) + 1;
    existingMutation.mutationKinds = [...new Set([...(existingMutation.mutationKinds || []), "group_log_distillation"])];
    try {
      const value = distillGroupMessagesToTypedMemoryUnlocked(groupId, messages, memory, {
        ...options,
        __distillationTransaction: { handle: existingMutation.handle, summary: null },
      });
      return {
        ...value,
        transaction: {
          schema: "ccm-group-typed-memory-distillation-transaction-v1",
          version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
          groupId,
          leaseId: String(existingMutation.handle.lock?.leaseId || ""),
          fencingToken: Number(existingMutation.handle.lock?.fencingToken || 0),
          status: "reentrant",
          committed: value?.skipped !== true,
        },
      };
    } finally {
      existingMutation.depth = Math.max(1, Number(existingMutation.depth || 2) - 1);
    }
  }
  const preflight = inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
  if (!preflight.runRequired) {
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    return {
      schema: "ccm-group-typed-memory-distillation-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: preflight.reason,
      ledgerFile: ledger.file,
      sourceMessageCount: 0,
      candidateCount: 0,
      extractedCandidateCount: 0,
      rejectedCandidateCount: 0,
      evictedExistingFactCount: 0,
      newFactCount: 0,
      updatedFactCount: 0,
      writeCount: 0,
      removalCount: 0,
      writes: [],
      removals: [],
      quality: ledger.quality || null,
      admission: ledger.admission || null,
      positiveFeedbackLifecycle: {
        ...(ledger.positiveFeedbackLifecycle || {}),
        appliedThisRun: 0,
        rejectedThisRun: 0,
      },
      cursor: {
        schema: "ccm-group-typed-memory-distillation-cursor-v1",
        previousCommittedMessageId: preflight.previousCommittedMessageId,
        lastCommittedMessageId: preflight.previousCommittedMessageId,
        cursorFound: preflight.cursorFound,
        cursorMissingFallback: preflight.cursorMissingFallback,
        forceRescan: preflight.forceRescan,
        eligibleMessageCount: preflight.eligibleMessageCount,
        pendingMessageCount: preflight.pendingMessageCount,
        processedMessageCount: 0,
        remainingMessageCount: preflight.pendingMessageCount,
        batchLimited: false,
        committedAt: String(ledger.distillationCursor?.committedAt || ledger.lastDistilledAt || ""),
      },
      lastDistilledMessageId: preflight.previousCommittedMessageId,
      distilledAt: String(ledger.lastDistilledAt || ledger.updatedAt || ""),
      preflight,
      transaction: {
        schema: "ccm-group-typed-memory-distillation-transaction-v1",
        version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        status: "preflight_skipped",
        committed: false,
        lockAcquired: false,
      },
    };
  }
  const acquired = acquireGroupTypedMemoryDistillationLock(groupId, { ...options, mutationKind: "group_log_distillation" });
  if (!acquired.acquired) {
    const error: any = new Error(`typed_memory_distillation_transaction_unavailable:${acquired.reason || "lock_unavailable"}`);
    error.code = acquired.reason || "distillation_lock_unavailable";
    error.transaction = acquired;
    throw error;
  }
  const handle = acquired.handle;
  const mutationContext: any = {
    groupId,
    mutationKind: "group_log_distillation",
    mutationKinds: ["group_log_distillation"],
    handle,
    options,
    pendingArtifacts: new Map<string, any>(),
    depth: 1,
    writeCount: 0,
    startedAt: String(handle.lock?.acquiredAt || now()),
  };
  activeGroupTypedMemoryDistillationMutations.set(groupId, mutationContext);
  const transactionSummary = {
    schema: "ccm-group-typed-memory-distillation-transaction-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
    groupId,
    leaseId: String(handle.lock?.leaseId || ""),
    fencingToken: Number(handle.lock?.fencingToken || 0),
    waitedMs: Number(acquired.waitedMs || 0),
    recoveredLeaseCount: Number(acquired.recoveredLeaseCount || 0),
    acquiredAt: String(handle.lock?.acquiredAt || ""),
  };
  try {
    mutationContext.artifactRecovery = recoverGroupTypedMemoryArtifactTransaction(groupId);
    const diagnosticHoldMs = Math.max(0, Math.min(10_000, Number(options.__transactionDiagnosticHoldMs || 0)));
    if (diagnosticHoldMs > 0) typedMemoryDistillationWait(diagnosticHoldMs);
    const value = distillGroupMessagesToTypedMemoryUnlocked(groupId, messages, memory, {
      ...options,
      __distillationTransaction: { handle, summary: transactionSummary },
    });
    commitGroupTypedMemoryArtifactMutation(mutationContext);
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (!ownership.owned) throw new Error(`typed_memory_distillation_lock_lost_after_commit:${ownership.reason}`);
    const completedAt = now();
    const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
    const committed = value?.skipped !== true;
    writeGroupTypedMemoryDistillationTransactionState(groupId, {
      status: "completed",
      mutationKind: "group_log_distillation",
      mutationKinds: mutationContext.mutationKinds,
      lastMutationKind: "group_log_distillation",
      leaseId: transactionSummary.leaseId,
      fencingToken: transactionSummary.fencingToken,
      lastFencingToken: transactionSummary.fencingToken,
      lastCommittedFencingToken: committed
        ? transactionSummary.fencingToken
        : Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
      recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
      waitedMs: Number(acquired.waitedMs || 0),
      writeCount: Number(mutationContext.writeCount || 0),
      startedAt: transactionSummary.acquiredAt,
      completedAt,
      failedAt: "",
      error: "",
      updatedAt: completedAt,
    });
    activeGroupTypedMemoryDistillationMutations.delete(groupId);
    releaseGroupTypedMemoryDistillationLock(handle, "completed");
    return {
      ...value,
      preflight: {
        ...preflight,
        lockAcquired: true,
      },
      transaction: {
        ...transactionSummary,
        status: "completed",
        committed,
        completedAt,
        artifactTransaction: mutationContext.artifactTransaction || null,
        artifactRecovery: mutationContext.artifactRecovery || null,
      },
    };
  } catch (error: any) {
    const failedAt = now();
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (ownership.owned) {
      const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
      writeGroupTypedMemoryDistillationTransactionState(groupId, {
        status: "failed",
        mutationKind: "group_log_distillation",
        mutationKinds: mutationContext.mutationKinds,
        lastMutationKind: String(priorState.valid ? priorState.state?.lastMutationKind || "" : ""),
        leaseId: transactionSummary.leaseId,
        fencingToken: transactionSummary.fencingToken,
        lastFencingToken: transactionSummary.fencingToken,
        lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
        recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
        waitedMs: Number(acquired.waitedMs || 0),
        writeCount: Number(mutationContext.writeCount || 0),
        startedAt: transactionSummary.acquiredAt,
        completedAt: "",
        failedAt,
        error: compactText(error?.message || error, 800),
        updatedAt: failedAt,
      });
    }
    activeGroupTypedMemoryDistillationMutations.delete(groupId);
    releaseGroupTypedMemoryDistillationLock(handle, "failed");
    throw error;
  }
}

export function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  const maxBatches = Math.max(1, Math.min(32, Number(options.maxCatchUpBatches || options.max_catch_up_batches || 8)));
  const batches: any[] = [];
  let latest: any = null;
  for (let batch = 0; batch < maxBatches; batch += 1) {
    latest = distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
    batches.push(latest);
    if (latest?.skipped === true || Number(latest?.cursor?.remainingMessageCount || 0) <= 0) break;
  }
  const sum = (key: string) => batches.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  const remainingMessageCount = Number(latest?.cursor?.remainingMessageCount || 0);
  return {
    ...(latest || {
      schema: "ccm-group-typed-memory-distillation-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "no_distillation_batch_executed",
    }),
    sourceMessageCount: sum("sourceMessageCount"),
    candidateCount: sum("candidateCount"),
    extractedCandidateCount: sum("extractedCandidateCount"),
    rejectedCandidateCount: sum("rejectedCandidateCount"),
    evictedExistingFactCount: sum("evictedExistingFactCount"),
    newFactCount: sum("newFactCount"),
    updatedFactCount: sum("updatedFactCount"),
    writeCount: sum("writeCount"),
    removalCount: sum("removalCount"),
    writes: batches.flatMap(row => Array.isArray(row?.writes) ? row.writes : []),
    removals: batches.flatMap(row => Array.isArray(row?.removals) ? row.removals : []),
    catchUp: {
      schema: "ccm-group-typed-memory-distillation-catch-up-v1",
      batchCount: batches.length,
      maxBatches,
      complete: remainingMessageCount === 0,
      remainingMessageCount,
      batches: batches.map((row, index) => ({
        batch: index + 1,
        skipped: row?.skipped === true,
        reason: row?.reason || "",
        sourceMessageCount: Number(row?.sourceMessageCount || 0),
        newFactCount: Number(row?.newFactCount || 0),
        updatedFactCount: Number(row?.updatedFactCount || 0),
        previousCommittedMessageId: row?.cursor?.previousCommittedMessageId || "",
        lastCommittedMessageId: row?.cursor?.lastCommittedMessageId || row?.lastDistilledMessageId || "",
        remainingMessageCount: Number(row?.cursor?.remainingMessageCount || 0),
      })),
    },
  };
}

export function runGroupTypedMemoryDistillationMutationCoordinatorSelfTest() {
  return require("./group-memory-recall-self-tests").runGroupTypedMemoryDistillationMutationCoordinatorSelfTest();
}

export function runGroupTypedMemoryLogDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryLogDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactUsageDistillationSelfTest();
}

export function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest();
}

export function runGroupTypedMemoryDistillationQualitySelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryDistillationQualitySelfTest();
}
