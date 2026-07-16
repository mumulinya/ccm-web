// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_TYPED_MEMORY_ENTRYPOINT,
  approveGroupClaudeMemoryExternalInclude,
  buildClaudeMemorySettingSourcePolicy,
  buildGroupTypedMemoryLoadPlan,
  buildGroupTypedMemoryPressureRecallUsageProjectSummary,
  buildGroupTypedMemoryPressureRecallUsageSummary,
  buildGroupTypedMemoryRecall,
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext,
  checksum,
  cleanupCommitRepairEvidenceChecksum,
  cleanupCommitRepairResolutionTransactionChecksum,
  cleanupCommitRepairResolutionTransactionLedgerChecksum,
  createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment,
  createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt,
  discoverGlobalClaudeMemoryFiles,
  discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions,
  discoverProjectMemoryFiles,
  distillGroupMessagesToTypedMemory,
  distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory,
  distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory,
  distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory,
  distillProviderReproofReceiptConsumptionToTypedMemory,
  executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt,
  getAlreadySurfacedGroupTypedMemory,
  getGroupClaudeMemoryExternalIncludeApprovalLedgerFile,
  getGroupPressureRecallUsageRepairWorkItemsFile,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryIndexFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile,
  hasGroupMemoryInstructionsLoadedHook,
  importGlobalClaudeMemoryToGroupTypedMemory,
  importProjectMemoryFilesToGroupTypedMemory,
  inspectGroupTypedMemoryDistillationLock,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions,
  loadGroupClaudeInstructionsLoadedHookLedger,
  markGroupClaudeMemoryExternalIncludeWarningShown,
  normalizeExternalIncludeApprovalPath,
  now,
  postCompactCompletionMemoryPreservationRepairClosureArchive,
  postCompactReinjectionRepairReceiptConsumptionArchive,
  providerRankingProvenanceCompactRepairReceiptConsumptionArchive,
  providerReproofReceiptConsumptionArchive,
  readCleanupCommitRepairResolutionTransactionLedger,
  readGroupTypedMemoryDistillationLedger,
  readGroupTypedMemoryDistillationTransactionState,
  readJson,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions,
  recordGroupTypedMemoryPressureRecallUsageLedger,
  recordGroupTypedMemoryRecall,
  registerGroupMemoryInstructionsLoadedHook,
  renderGroupTypedMemoryLoadPlan,
  renderGroupTypedMemoryRecall,
  runGroupTypedMemoryDistillationMutation,
  runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery,
  scanGroupTypedMemoryDocuments,
  syncGroupTypedMemoryFromGroupMemory,
  tokens,
  updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem,
  upsertGroupTypedMemoryDocument,
  writeCleanupCommitDiscoveryArtifacts,
  writeCleanupCommitRepairAssignments,
  writeCleanupCommitRepairBriefs,
  writeCleanupCommitRepairResolutionReceipts,
  writeCleanupCommitRepairWorkItems,
  writeJsonAtomic,
} from "./group-memory-index";

export function runGroupTypedMemoryDistillationMutationCoordinatorSelfTest() {
  const groupId = `group-phase272-reentrant-${process.pid}-${Date.now().toString(36)}--gcs_phase272_reentrant`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    const result: any = runGroupTypedMemoryDistillationMutation(groupId, "phase272_outer", {}, outer => {
      const nested = runGroupTypedMemoryDistillationMutation(groupId, "phase272_inner", {}, inner => {
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const ledgerState = { ...ledger };
        delete ledgerState.file;
        writeJsonAtomic(ledger.file, {
          ...ledgerState,
          schema: "ccm-group-typed-memory-distillation-ledger-v1",
          version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
          groupId,
          facts: ledger.facts || {},
          coordinatorSelfTestArchive: {
            schema: "ccm-group-typed-memory-distillation-mutation-coordinator-selftest-v1",
            nestedDepth: Number(inner.depth || 0),
            sameLease: String(inner.handle?.lock?.leaseId || "") === String(outer.handle?.lock?.leaseId || ""),
            updatedAt: now(),
          },
          updatedAt: now(),
        });
        return {
          nestedDepth: Number(inner.depth || 0),
          sameLease: String(inner.handle?.lock?.leaseId || "") === String(outer.handle?.lock?.leaseId || ""),
        };
      });
      return { nested };
    });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const state = readGroupTypedMemoryDistillationTransactionState(groupId);
    let failClosed = false;
    try {
      writeJsonAtomic(ledger.file, { schema: "invalid-uncoordinated-selftest", groupId });
    } catch (error: any) {
      failClosed = String(error?.message || error).includes("uncoordinated_group_typed_memory_distillation_ledger_write");
    }
    const receipt = result.distillationMutation || {};
    const commit = ledger.distillationMutation || {};
    const mutationKinds = Array.isArray(receipt.mutationKinds) ? receipt.mutationKinds : [];
    const checks = {
      nestedCallReusesLease: result.nested?.sameLease === true && Number(result.nested?.nestedDepth || 0) === 2,
      nestedKindsAreAudited: mutationKinds.includes("phase272_outer") && mutationKinds.includes("phase272_inner"),
      oneLedgerWriteCommitted: Number(receipt.writeCount || 0) === 1 && Number(commit.writeSequence || 0) === 1,
      receiptBindsLedgerFence: String(receipt.leaseId || "") === String(commit.leaseId || "")
        && Number(receipt.fencingToken || 0) === Number(commit.fencingToken || 0),
      stateBindsMutation: state.valid === true
        && state.state?.status === "completed"
        && state.state?.mutationKind === "phase272_outer"
        && Number(state.state?.fencingToken || 0) === Number(receipt.fencingToken || 0),
      lockReleased: inspectGroupTypedMemoryDistillationLock(groupId).present === false,
      uncoordinatedWriteFailsClosed: failClosed,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      schema: "ccm-group-typed-memory-distillation-mutation-coordinator-selftest-v1",
      groupId,
      checks,
      receipt,
      commit,
      state: state.state,
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryIndexSelfTest() {
  const groupId = `typed-memory-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    const sync = syncGroupTypedMemoryFromGroupMemory(groupId, {
      goal: "实现支付回调，必须保留 IDEMPOTENCY_TYPED_SENTINEL",
      persistentRequirements: [{ messageId: "u1", text: "必须保留 IDEMPOTENCY_TYPED_SENTINEL，不能跳过验签。" }],
      decisions: [{ decision: "使用 webhook idempotency key", reason: "避免重复入账" }],
      blocked: [{ project: "api", reason: "验签测试失败" }],
      factAnchors: [{ id: "f1", type: "user_requirement", messageId: "u1", text: "支付回调依赖 src/pay.ts" }],
      compaction: { postCompactReinject: { hasCandidates: true, files: [{ value: "src/pay.ts", sourceMessageId: "a1" }], verification: [{ value: "npm run check", sourceMessageId: "a2" }] } },
      messageDigest: "群聊会话压缩摘要：支付回调仍在进行。",
    });
    const recall = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", {});
    const ledgerBefore = getAlreadySurfacedGroupTypedMemory(groupId, "api");
    recordGroupTypedMemoryRecall(groupId, "api", recall, "支付回调 IDEMPOTENCY_TYPED_SENTINEL");
    const ledgerAfter = getAlreadySurfacedGroupTypedMemory(groupId, "api");
    const deduped = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", { alreadySurfaced: ledgerAfter });
    const ignored = buildGroupTypedMemoryRecall(groupId, "本轮请忽略记忆，只看当前任务", {});
    const rendered = renderGroupTypedMemoryRecall(recall);
    const checks = {
      indexCreated: fs.existsSync(sync.index.file) && fs.readFileSync(sync.index.file, "utf-8").includes("MEMORY.md"),
      fourTypeDocsCreated: sync.index.docs.some((item: any) => item.type === "user")
        && sync.index.docs.some((item: any) => item.type === "project")
        && sync.index.docs.some((item: any) => item.type === "feedback")
        && sync.index.docs.some((item: any) => item.type === "reference"),
      recallFindsSentinel: recall.recalled.some((item: any) => `${item.name}\n${item.snippet}`.includes("IDEMPOTENCY_TYPED_SENTINEL")),
      recallFindsFile: JSON.stringify(recall.recalled).includes("src/pay.ts"),
      recallLedgerStartsEmpty: ledgerBefore.length === 0,
      recallLedgerRecordsSurfaced: ledgerAfter.length >= recall.surfaced.length && ledgerAfter.length > 0,
      alreadySurfacedDedupesRecall: deduped.recalled.length < recall.recalled.length,
      ignoreMemoryHonored: ignored.ignored === true && ignored.recalled.length === 0,
      renderedMentionsVerification: rendered.includes("类型化长期记忆") && rendered.includes("npm run check"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, indexFile: sync.index.file, recalled: recall.recalled.map((item: any) => item.relPath) };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryPostCompactUsageScoringSelfTest() {
  const groupId = `typed-memory-post-compact-usage-scoring-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-useful-candidate",
      name: "Recovered useful candidate",
      description: "恢复候选任务中多次被 used / verified 的文件。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_USEFUL_SENTINEL：src/recovered.ts 是压缩后恢复候选，历史回执 used/verified 后应提高 MEMORY.md 召回优先级。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-ignored-candidate",
      name: "Recovered ignored candidate",
      description: "恢复候选任务中多次被 ignored 的旧文件。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_IGNORED_SENTINEL：src/ignored.ts 是历史多次 ignored 的压缩恢复候选，除非当前任务强相关，否则应被降权。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "post-compact-neutral-candidate",
      name: "Neutral project memory",
      description: "普通恢复候选任务背景。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_NEUTRAL_SENTINEL：普通项目背景，不带候选使用账本信号。",
    });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续恢复候选任务", {
      max: 5,
      postCompactCandidateUsage: {
        useful_candidates: [{
          candidate_id: "pcrc_useful",
          value: "src/recovered.ts",
          recommendation: "promote_recall",
          used_count: 2,
          verified_count: 1,
        }],
        ignored_candidates: [{
          candidate_id: "pcrc_ignored",
          value: "src/ignored.ts",
          recommendation: "deprioritize_or_distill",
          ignored_count: 3,
        }],
      },
    });
    const rendered = renderGroupTypedMemoryRecall(recall);
    const useful: any = recall.recalled.find((item: any) => item.relPath.includes("post-compact-useful-candidate"));
    const ignored: any = recall.recalled.find((item: any) => item.relPath.includes("post-compact-ignored-candidate"));
    const checks = {
      usefulCandidateRecalled: !!useful
        && String(JSON.stringify(useful)).includes("RECOVERED_USEFUL_SENTINEL"),
      usefulCandidateBoosted: Number(useful?.postCompactUsage?.adjustment || 0) > 0
        && useful.postCompactUsage.matched?.some((item: any) => item.recommendation === "promote_recall"),
      ignoredCandidateDeprioritized: !ignored
        && recall.diagnostics?.some((item: any) => item.relPath.includes("post-compact-ignored-candidate")
          && Number(item.postCompactUsage?.adjustment || 0) < 0),
      recallSummaryCountsUsageScoring: recall.postCompactUsageScoring?.hint_count === 2
        && recall.postCompactUsageScoring?.boosted_count >= 1
        && recall.postCompactUsageScoring?.deprioritized_count >= 1,
      renderedShowsUsageAdjustment: rendered.includes("post-compact usage +")
        && rendered.includes("RECOVERED_USEFUL_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      scoring: recall.postCompactUsageScoring,
      recalled: recall.recalled.map((item: any) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryWorkerContextPressureRecallSelfTest() {
  const groupId = `typed-memory-worker-context-pressure-recall-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Recall only when WorkerContextPacket context pressure is active.",
      source: "auto:context-usage-repair-distillation",
      body: [
        "PRESSURE_CONTEXT_USAGE_SENTINEL",
        "When context_usage.status is compact_recommended, critical, or over_budget, keep Context usage budget visible.",
        "Target free_tokens>=autocompact_buffer_tokens before child-Agent dispatch.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "worker-context-compact-strategy-memory",
      name: "WorkerContextPacket compact strategy memory",
      description: "Recall compact strategy only under pressure.",
      source: "auto:compact-strategy-memory-distillation",
      body: [
        "PRESSURE_COMPACT_STRATEGY_SENTINEL",
        "Prefer metadata_partial_compact categories with positive free_token_delta and task_hash_unchanged=true.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-ptl-emergency-downgrade",
      name: "WorkerContextPacket PTL emergency downgrade discipline",
      description: "Recall PTL emergency budgets only for repeated compact failure.",
      source: "auto:ptl-emergency-downgrade-distillation",
      body: [
        "PRESSURE_PTL_EMERGENCY_SENTINEL",
        "PTL emergency downgrade uses maxTaskChars and maxRenderedChars when repeated compact failure blocks dispatch.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "worker-context-old-ignore-memory",
      name: "WorkerContextPacket stale pressure recall memory",
      description: "Old ignored pressure recall feedback should decay before future scoring.",
      source: "selftest",
      body: [
        "PRESSURE_STALE_USAGE_SENTINEL",
        "worker-context-compact-strategy stale pressure recall feedback should not permanently suppress future typed memory recall.",
        "metadata_partial_compact guidance can become stale when child Agent receipts stop referencing it.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "normal-payment-memory",
      name: "Normal payment memory",
      description: "Ordinary task memory should win when no WorkerContextPacket pressure exists.",
      source: "selftest",
      body: "NORMAL_PRESSURE_RECALL_SENTINEL：普通支付回调任务背景，不需要上下文预算修复。",
    });
    const query = "继续 NORMAL_PRESSURE_RECALL_SENTINEL 普通支付回调";
    const noPressure = buildGroupTypedMemoryRecall(groupId, query, { max: 6 });
    const pressure = buildGroupTypedMemoryRecall(groupId, query, {
      max: 6,
      workerContextPacketContextUsage: {
        schema: "ccm-worker-context-usage-v1",
        status: "over_budget",
        pressure: 104,
        total_tokens: 93_800,
        max_tokens: 90_000,
        free_tokens: -16_800,
        autocompact_buffer_tokens: 13_000,
        top_categories: [{ id: "typed_memory_recall", tokens: 18_000 }],
      },
    });
    const ptl = buildGroupTypedMemoryRecall(groupId, query, {
      max: 6,
      ptlEmergency: {
        engaged: true,
        emergency_level: "critical",
        blocked_outcome_count: 3,
        task_compacted_blocked_count: 1,
        reason: "WorkerContextPacket repeated compact failure requires PTL emergency downgrade.",
      },
    });
    const usageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
      targetProject: "api",
      taskId: "pressure-recall-usage-task",
      executionId: "pressure-recall-usage-exec",
      rows: [
        { target_project: "api", agent: "api", rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "used", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-1" },
        { target_project: "api", agent: "api", rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "verified", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-2" },
        { target_project: "api", agent: "api", rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-3" },
        { target_project: "api", agent: "api", rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-4" },
      ],
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    const usageSummary: any = buildGroupTypedMemoryPressureRecallUsageSummary(groupId, { targetProject: "api" });
    const staleUsageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
      targetProject: "api",
      taskId: "pressure-recall-stale-usage-task",
      executionId: "pressure-recall-stale-usage-exec",
      rows: [
        { target_project: "api", agent: "api", rel_path: "worker-context-old-ignore-memory.md", name: "WorkerContextPacket stale pressure recall memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-stale-1" },
        { target_project: "api", agent: "api", rel_path: "worker-context-old-ignore-memory.md", name: "WorkerContextPacket stale pressure recall memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-stale-2" },
      ],
      generatedAt: "2026-03-01T00:00:00.000Z",
    });
    const staleUsageSummary: any = buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
      targetProject: "api",
      nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
    });
    const pressureAfterUsage = buildGroupTypedMemoryRecall(groupId, query, {
      max: 6,
      targetProject: "api",
      nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
      workerContextPacketContextUsage: {
        schema: "ccm-worker-context-usage-v1",
        status: "over_budget",
        pressure: 104,
        total_tokens: 93_800,
        max_tokens: 90_000,
        free_tokens: -16_800,
        autocompact_buffer_tokens: 13_000,
      },
    });
    const pressureAfterStaleUsage = buildGroupTypedMemoryRecall(groupId, "PRESSURE_STALE_USAGE_SENTINEL worker context over_budget", {
      max: 8,
      targetProject: "api",
      nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
      workerContextPacketContextUsage: {
        schema: "ccm-worker-context-usage-v1",
        status: "over_budget",
        pressure: 104,
        total_tokens: 93_800,
        max_tokens: 90_000,
        free_tokens: -16_800,
        autocompact_buffer_tokens: 13_000,
      },
    });
    const rendered = renderGroupTypedMemoryRecall(pressure);
    const relsNoPressure = (noPressure.recalled || []).map((item: any) => item.relPath);
    const pressureUsage: any = pressure.recalled.find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md");
    const pressureStrategy: any = pressure.recalled.find((item: any) => item.relPath === "worker-context-compact-strategy-memory.md");
    const pressurePtl: any = ptl.recalled.find((item: any) => item.relPath === "worker-context-ptl-emergency-downgrade.md");
    const afterUsageDoc: any = pressureAfterUsage.recalled.find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md");
    const afterIgnoredStrategy: any = pressureAfterUsage.recalled.find((item: any) => item.relPath === "worker-context-compact-strategy-memory.md")
      || pressureAfterUsage.diagnostics.find((item: any) => item.relPath === "worker-context-compact-strategy-memory.md");
    const staleIgnoredDoc: any = pressureAfterStaleUsage.diagnostics.find((item: any) => item.relPath === "worker-context-old-ignore-memory.md")
      || pressureAfterStaleUsage.recalled.find((item: any) => item.relPath === "worker-context-old-ignore-memory.md");
    const checks = {
      noPressureDoesNotPolluteNormalRecall: relsNoPressure.includes("normal-payment-memory.md")
        && !relsNoPressure.includes("worker-context-usage-pressure-discipline.md")
        && !relsNoPressure.includes("worker-context-compact-strategy-memory.md")
        && !relsNoPressure.includes("worker-context-ptl-emergency-downgrade.md")
        && Number(noPressure.workerContextPressureScoring?.deprioritized_count || 0) >= 3,
      overBudgetBoostsUsagePressureMemory: !!pressureUsage
        && Number(pressureUsage.workerContextPressureRecall?.adjustment || 0) > 0
        && JSON.stringify(pressureUsage).includes("PRESSURE_CONTEXT_USAGE_SENTINEL"),
      overBudgetBoostsCompactStrategyMemory: !!pressureStrategy
        && Number(pressureStrategy.workerContextPressureRecall?.adjustment || 0) > 0
        && JSON.stringify(pressureStrategy).includes("PRESSURE_COMPACT_STRATEGY_SENTINEL"),
      ptlEmergencyBoostsDowngradeMemory: !!pressurePtl
        && Number(pressurePtl.workerContextPressureRecall?.adjustment || 0) > 0
        && pressurePtl.workerContextPressureRecall?.ptl_emergency === true,
      pressureScoringSummarized: pressure.workerContextPressureScoring?.active === true
        && pressure.workerContextPressureScoring?.pressure_status === "over_budget"
        && pressure.workerContextPressureScoring?.boosted_count >= 2,
      usageLedgerFeedsFuturePressureRecall: usageRecord?.recorded_count === 4
        && usageSummary.totals?.used === 1
        && usageSummary.totals?.verified === 1
        && usageSummary.totals?.ignored === 2
        && Number(afterUsageDoc?.workerContextPressureUsage?.adjustment || 0) > 0
        && Number(afterIgnoredStrategy?.workerContextPressureUsage?.adjustment || 0) < 0
        && pressureAfterUsage.workerContextPressureUsageScoring?.boosted_count >= 1
        && pressureAfterUsage.workerContextPressureUsageScoring?.deprioritized_count >= 1,
      staleUsageFeedbackDecaysBeforeScoring: staleUsageRecord?.recorded_count === 2
        && staleUsageSummary.totals?.ignored === 4
        && Number(staleUsageSummary.weighted_totals?.ignored || 0) < Number(staleUsageSummary.totals?.ignored || 0)
        && Number(staleUsageSummary.aging?.stale_entry_count || 0) >= 2
        && (staleUsageSummary.stale_pressure_memories || []).some((item: any) => item.rel_path === "worker-context-old-ignore-memory.md")
        && staleIgnoredDoc?.workerContextPressureUsage?.matched?.some((match: any) => match.recommendation === "stale_pressure_recall_history" && Number(match.delta || 0) === 0)
        && Number(staleIgnoredDoc?.workerContextPressureUsage?.adjustment || 0) === 0
        && Number(pressureAfterStaleUsage.workerContextPressureUsageScoring?.stale_hint_count || 0) >= 1
        && Number(pressureAfterStaleUsage.workerContextPressureUsageScoring?.stale_matched_count || 0) >= 1,
      renderedShowsPressureRecall: rendered.includes("上下文压力召回")
        && rendered.includes("pressure recall +")
        && rendered.includes("PRESSURE_CONTEXT_USAGE_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      noPressure: {
        scoring: noPressure.workerContextPressureScoring,
        recalled: relsNoPressure,
      },
      pressure: {
        scoring: pressure.workerContextPressureScoring,
        recalled: pressure.recalled.map((item: any) => ({ relPath: item.relPath, score: item.score, workerContextPressureRecall: item.workerContextPressureRecall })),
      },
      ptl: {
        scoring: ptl.workerContextPressureScoring,
        recalled: ptl.recalled.map((item: any) => ({ relPath: item.relPath, score: item.score, workerContextPressureRecall: item.workerContextPressureRecall })),
      },
      usage: {
        record: usageRecord,
        summary: usageSummary,
        staleRecord: staleUsageRecord,
        staleSummary: staleUsageSummary,
        scoring: pressureAfterUsage.workerContextPressureUsageScoring,
        staleScoring: pressureAfterStaleUsage.workerContextPressureUsageScoring,
      },
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest() {
  const sourceGroupId = `typed-memory-cross-group-pressure-source-${process.pid}-${Date.now().toString(36)}`;
  const targetGroupId = `typed-memory-cross-group-pressure-target-${process.pid}-${Date.now().toString(36)}`;
  const dirs = [getGroupTypedMemoryDir(sourceGroupId), getGroupTypedMemoryDir(targetGroupId)];
  const nowMs = Date.parse("2026-07-09T23:10:00.000Z");
  const pressureUsage = {
    schema: "ccm-worker-context-usage-v1",
    status: "over_budget",
    pressure: 105,
    total_tokens: 94_500,
    max_tokens: 90_000,
    free_tokens: -17_500,
    autocompact_buffer_tokens: 13_000,
  };
  const findDoc = (recall: any, relPath: string) => (recall.recalled || []).find((item: any) => item.relPath === relPath)
    || (recall.diagnostics || []).find((item: any) => item.relPath === relPath)
    || {};
  try {
    upsertGroupTypedMemoryDocument(targetGroupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Cross-group pressure usage should promote this pressure memory only for the same project.",
      source: "selftest:cross-group-pressure-usage",
      body: [
        "CROSS_GROUP_PRESSURE_USAGE_SENTINEL",
        "When WorkerContextPacket context_usage is over_budget, keep free_tokens and autocompact_buffer_tokens visible before dispatch.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(targetGroupId, {
      type: "reference",
      slug: "worker-context-compact-strategy-memory",
      name: "WorkerContextPacket compact strategy memory",
      description: "Cross-group ignored pressure usage should deprioritize this memory.",
      source: "selftest:cross-group-pressure-usage",
      body: [
        "CROSS_GROUP_PRESSURE_IGNORED_SENTINEL",
        "metadata_partial_compact strategy memory can be deprioritized when child receipts repeatedly ignored it.",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(targetGroupId, {
      type: "project",
      slug: "normal-cross-project-memory",
      name: "Normal cross project memory",
      description: "Ordinary target project task memory.",
      source: "selftest:cross-group-pressure-usage",
      body: "NORMAL_CROSS_GROUP_PRESSURE_SENTINEL：普通项目记忆，用来确认跨群聊压力提示只在压力路径补强。",
    });
    const sourceRecord = recordGroupTypedMemoryPressureRecallUsageLedger(sourceGroupId, {
      targetProject: "api",
      taskId: "cross-group-pressure-usage-source-task",
      executionId: "cross-group-pressure-usage-source-exec",
      agent: "api",
      generatedAt: "2026-07-09T23:09:00.000Z",
      rows: [
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "used", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-used" },
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "verified", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-verified" },
        { rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-ignored-1" },
        { rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-ignored-2" },
      ],
    });
    const crossSummary = buildGroupTypedMemoryPressureRecallUsageProjectSummary(targetGroupId, {
      targetProject: "api",
      groupIds: [sourceGroupId],
      nowMs,
    });
    const crossRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
      max: 8,
      targetProject: "api",
      nowMs,
      workerContextPacketContextUsage: pressureUsage,
      crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
    });
    const wrongProjectRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
      max: 8,
      targetProject: "web",
      nowMs,
      workerContextPacketContextUsage: pressureUsage,
      crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
    });
    const promotedDoc: any = findDoc(crossRecall, "worker-context-usage-pressure-discipline.md");
    const ignoredDoc: any = findDoc(crossRecall, "worker-context-compact-strategy-memory.md");
    const localRecord = recordGroupTypedMemoryPressureRecallUsageLedger(targetGroupId, {
      targetProject: "api",
      taskId: "cross-group-pressure-usage-local-task",
      executionId: "cross-group-pressure-usage-local-exec",
      agent: "api",
      generatedAt: "2026-07-09T23:09:30.000Z",
      rows: [
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-1" },
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-2" },
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-3" },
      ],
    });
    const localOverrideRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
      max: 8,
      targetProject: "api",
      nowMs,
      workerContextPacketContextUsage: pressureUsage,
      crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
    });
    const localOverrideDoc: any = findDoc(localOverrideRecall, "worker-context-usage-pressure-discipline.md");
    const localOverrideMatches = localOverrideDoc.workerContextPressureUsage?.matched || [];
    const checks = {
      sourceLedgerRecorded: sourceRecord?.recorded_count === 4,
      projectSummaryReadsOnlySourceGroup: crossSummary.source === "cross_group_project_pressure_recall_usage"
        && crossSummary.source_group_count === 1
        && crossSummary.entry_count === 4
        && crossSummary.target_project === "api"
        && (crossSummary.source_groups || []).some((item: any) => item.groupId === sourceGroupId),
      crossGroupHintsPromoteSameProjectPressureMemory: Number(crossRecall.workerContextPressureUsageScoring?.cross_group_hint_count || 0) >= 2
        && Number(crossRecall.workerContextPressureUsageScoring?.cross_group_matched_count || 0) >= 2
        && promotedDoc.workerContextPressureUsage?.matched?.some((match: any) => match.hint_scope === "cross_group_project"
          && match.recommendation === "promote_pressure_recall"
          && Number(match.delta || 0) > 0
          && match.group_ids?.includes(sourceGroupId)),
      crossGroupHintsCanDeprioritizeIgnoredPressureMemory: ignoredDoc.workerContextPressureUsage?.matched?.some((match: any) => match.hint_scope === "cross_group_project"
        && match.recommendation === "deprioritize_pressure_recall"
        && Number(match.delta || 0) < 0),
      targetProjectIsolationBlocksWrongProjectHints: Number(wrongProjectRecall.workerContextPressureUsageScoring?.cross_group_hint_count || 0) === 0
        && Number(wrongProjectRecall.workerContextPressureUsageScoring?.cross_group_matched_count || 0) === 0,
      localGroupUsageOverridesSameDocCrossGroupHint: localRecord?.recorded_count === 3
        && localOverrideMatches.some((match: any) => match.hint_scope === "local_group" && match.recommendation === "deprioritize_pressure_recall")
        && !localOverrideMatches.some((match: any) => match.hint_scope === "cross_group_project"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      crossSummary: {
        source_group_count: crossSummary.source_group_count || 0,
        entry_count: crossSummary.entry_count || 0,
        weighted_totals: crossSummary.weighted_totals || {},
        rows: crossSummary.rows || [],
      },
      crossRecall: {
        scoring: crossRecall.workerContextPressureUsageScoring,
        promotedDoc: promotedDoc.workerContextPressureUsage || null,
        ignoredDoc: ignoredDoc.workerContextPressureUsage || null,
      },
      localOverride: {
        scoring: localOverrideRecall.workerContextPressureUsageScoring,
        usageDocMatches: localOverrideMatches,
      },
    };
  } finally {
    for (const dir of dirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest() {
  const groupId = `typed-memory-pressure-repair-provenance-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const repairFile = getGroupPressureRecallUsageRepairWorkItemsFile(groupId);
  const nowMs = Date.parse("2026-07-09T23:58:00.000Z");
  const targetProject = "phase131-pressure-project";
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Repair provenance must be visible when pressure usage recommendations are disputed.",
      source: "selftest:pressure-repair-provenance",
      body: [
        "PRESSURE_REPAIR_PROVENANCE_SENTINEL",
        "When WorkerContextPacket context_usage is over_budget, check whether the pressure memory is trusted or under repair before following it.",
      ].join("\n"),
    });
    const usageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
      targetProject,
      taskId: "pressure-repair-provenance-task",
      executionId: "pressure-repair-provenance-execution",
      agent: "api",
      generatedAt: "2026-07-09T23:57:00.000Z",
      rows: [
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-repair-ignored-1" },
        { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-repair-ignored-2" },
      ],
    });
    writeJsonAtomic(repairFile, {
      schema: "ccm-compact-boundary-replay-repair-work-items-v1",
      version: 1,
      groupId,
      file: repairFile,
      items: [{
        id: "cgpru-repair-provenance-selftest",
        work_item_id: "cgpru-repair-provenance-selftest",
        source: "cross_group_pressure_recall_usage_repair",
        component: "cross_group_pressure_recall_usage",
        status: "pending",
        priority: "high",
        target_project: targetProject,
        repair_target: "worker-context-usage-pressure-discipline.md",
        cross_group_pressure_recall_usage_gap_type: "recommendation_conflict",
        cross_group_pressure_recall_usage_rel_path: "worker-context-usage-pressure-discipline.md",
        cross_group_pressure_recall_usage_reason: "selftest: local deprioritize_pressure_recall but cross-group promote_pressure_recall",
        local_recommendation: "deprioritize_pressure_recall",
        cross_group_recommendation: "promote_pressure_recall",
        source_group_count: 1,
        source_groups: [{ groupId: "source-pressure-repair-provenance", entry_count: 2 }],
        shouldCreateRealTask: false,
        updatedAt: "2026-07-09T23:57:30.000Z",
      }],
      stats: { total: 1, openItemCount: 1, pendingCount: 1 },
      updatedAt: "2026-07-09T23:57:30.000Z",
    });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 WorkerContextPacket over_budget PRESSURE_REPAIR_PROVENANCE_SENTINEL", {
      max: 6,
      targetProject,
      nowMs,
      workerContextPacketContextUsage: {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-pressure-repair-provenance",
        project: targetProject,
        status: "over_budget",
        pressure: 112,
        total_tokens: 101_000,
        max_tokens: 90_000,
        free_tokens: -24_000,
        autocompact_buffer_tokens: 13_000,
      },
    });
    const doc: any = (recall.recalled || []).find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md")
      || (recall.diagnostics || []).find((item: any) => item.relPath === "worker-context-usage-pressure-discipline.md")
      || {};
    const matches = doc.workerContextPressureUsage?.matched || [];
    const rendered = renderGroupTypedMemoryRecall(recall);
    const repairMatch = matches.find((match: any) => match.repair_open === true);
    const checks = {
      usageLedgerRecorded: usageRecord?.recorded_count === 2,
      repairHintMatchedDoc: repairMatch?.repair_work_item_id === "cgpru-repair-provenance-selftest"
        && repairMatch.provenance_status === "disputed_under_repair"
        && repairMatch.repair_gap_type === "recommendation_conflict"
        && repairMatch.repair_local_recommendation === "deprioritize_pressure_recall"
        && repairMatch.repair_cross_group_recommendation === "promote_pressure_recall",
      scoringCountsRepair: Number(recall.workerContextPressureUsageScoring?.repair_hint_count || 0) >= 1
        && Number(recall.workerContextPressureUsageScoring?.repair_matched_count || 0) >= 1
        && Number(recall.workerContextPressureUsageScoring?.disputed_matched_count || 0) >= 1,
      renderedCarriesRepairProvenance: rendered.includes("pressure repair recommendation_conflict:pending")
        && rendered.includes("PRESSURE_REPAIR_PROVENANCE_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      scoring: recall.workerContextPressureUsageScoring,
      doc: {
        relPath: doc.relPath || doc.rel_path || "",
        score: doc.score || 0,
        workerContextPressureUsage: doc.workerContextPressureUsage || null,
      },
      rendered,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    for (const file of [repairFile, `${repairFile}.bak`]) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runGroupTypedMemoryLoadPlanSelfTest() {
  const groupId = `typed-memory-load-plan-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "aaa-main-project",
      name: "Main project memory",
      description: "Project memory that includes another typed memory file.",
      source: "selftest",
      body: [
        "# Main Project Memory",
        "LOAD_PLAN_MAIN_SENTINEL",
        "@zzz-included-project.md",
        "@missing-memory.md",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "zzz-included-project",
      name: "Included project memory",
      description: "Included memory must load before its parent.",
      source: "selftest",
      body: "LOAD_PLAN_INCLUDE_SENTINEL",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "cycle-a",
      name: "Cycle A",
      description: "Cycle source A",
      source: "selftest",
      body: "@cycle-b.md",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "cycle-b",
      name: "Cycle B",
      description: "Cycle source B",
      source: "selftest",
      body: "@cycle-a.md",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "user",
      slug: "zz-user-requirements",
      name: "User requirements",
      description: "Highest priority user memory.",
      source: "selftest",
      body: "LOAD_PLAN_USER_SENTINEL must win when memory conflicts.",
    });
    const plan = buildGroupTypedMemoryLoadPlan(groupId, {});
    const rendered = renderGroupTypedMemoryLoadPlan(plan);
    const entries = Array.isArray(plan.entries) ? plan.entries : [];
    const byRel = new Map<string, any>(entries.map((entry: any) => [entry.relPath, entry]));
    const included = byRel.get("zzz-included-project.md") || {};
    const parent = byRel.get("aaa-main-project.md") || {};
    const user = byRel.get("zz-user-requirements.md") || {};
    const referencePriority = plan.priorityTiers.reference;
    const projectPriority = plan.priorityTiers.project;
    const feedbackPriority = plan.priorityTiers.feedback;
    const userPriority = plan.priorityTiers.user;
    const checks = {
      schema: plan.schema === "ccm-group-typed-memory-load-plan-v1",
      entrypointFirst: entries[0]?.relPath === GROUP_TYPED_MEMORY_ENTRYPOINT && entries[0]?.kind === "entrypoint",
      priorityTierOrdering: referencePriority < projectPriority && projectPriority < feedbackPriority && feedbackPriority < userPriority,
      includeLoadsBeforeParent: Number(included.loadOrder) < Number(parent.loadOrder)
        && included.parentRelPath === "aaa-main-project.md",
      missingIncludeAudited: plan.issues.some((issue: any) => issue.type === "missing_include" && String(issue.ref || "").includes("missing-memory.md")),
      cycleAudited: plan.issues.some((issue: any) => issue.type === "circular_include"),
      userMemoryHighestPriority: Number(user.priority || 0) === userPriority
        && Number(user.loadOrder || 0) > Number(parent.loadOrder || 0),
      boundedEntries: plan.entryCount <= plan.maxEntries && plan.totalBytes > 0 && plan.estimatedTokens > 0,
      renderedMentionsPlan: rendered.includes("类型化 MEMORY.md 加载计划")
        && rendered.includes("entrypoint < reference < project < feedback < user"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, plan: { status: plan.status, entryCount: plan.entryCount, issues: plan.issues.map((issue: any) => issue.type) } };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryPathConditionSelfTest() {
  const groupId = `typed-memory-path-condition-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "pay-path-rule",
      name: "Payment callback path rule",
      description: "Only applies to payment callback files.",
      source: "selftest",
      paths: ["src/pay.ts", "src/payment/**/*.ts"],
      body: "PATH_CONDITION_PAY_SENTINEL: 支付回调必须验签并保留幂等键。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "search-path-rule",
      name: "Search path rule",
      description: "Only applies to search files.",
      source: "selftest",
      paths: ["src/search/**/*.ts"],
      body: "PATH_CONDITION_SEARCH_SENTINEL: 搜索索引刷新需要单独验证。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "general-project",
      name: "General project memory",
      description: "Unconditional memory should still be recallable by query.",
      source: "selftest",
      body: "PATH_CONDITION_GENERAL_SENTINEL: 通用项目记忆。",
    });
    const payRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts 支付回调 PATH_CONDITION_PAY_SENTINEL", { max: 8 });
    const searchRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/search/index.ts 搜索索引 PATH_CONDITION_SEARCH_SENTINEL", { max: 8 });
    const unrelatedRecall = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md 文档任务 PATH_CONDITION", { max: 8 });
    const payPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
    const unrelatedPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["docs/readme.md"] });
    const rendered = renderGroupTypedMemoryRecall(payRecall);
    const payEntries = JSON.stringify(payPlan.entries || []);
    const unrelatedEntries = JSON.stringify(unrelatedPlan.entries || []);
    const checks = {
      pathsPersistedInFrontmatter: fs.readFileSync(path.join(dir, "pay-path-rule.md"), "utf-8").includes("\"src/pay.ts\""),
      payRecallIncludesPayRule: JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL"),
      payRecallSkipsSearchRule: !JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      searchRecallIncludesSearchRule: JSON.stringify(searchRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      unrelatedSkipsConditionalRules: !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL")
        && !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      diagnosticsRecordPathMiss: unrelatedRecall.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      loadPlanIncludesMatchedConditional: payEntries.includes("pay-path-rule.md") && !payEntries.includes("search-path-rule.md"),
      loadPlanSkipsUnmatchedConditionals: !unrelatedEntries.includes("pay-path-rule.md") && !unrelatedEntries.includes("search-path-rule.md"),
      loadPlanCountsConditionalSkips: unrelatedPlan.conditionalSkipped >= 2 && payPlan.conditionalMatched >= 1,
      renderedMentionsPathCondition: rendered.includes("路径条件匹配") && rendered.includes("src/pay.ts"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      payRecall: { surfaced: payRecall.surfaced, conditionalMatched: payRecall.conditionalMatched, conditionalSkipped: payRecall.conditionalSkipped },
      payPlan: { conditionalMatched: payPlan.conditionalMatched, conditionalSkipped: payPlan.conditionalSkipped },
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupProjectMemoryImportSelfTest() {
  const groupId = `project-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const projectRoot = path.join(CCM_DIR, "tmp-project-memory-import-selftest", groupId);
  try {
    fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
      "# Project Instructions",
      "@./docs/project-extra.md",
      "@./docs/missing-project-extra.md",
      "<!-- @./docs/comment-hidden.md -->",
      "PROJECT_MEMORY_IMPORT_ROOT_SENTINEL: all child Agents must preserve project instructions.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "docs", "project-extra.md"), [
      "# Project Extra Include",
      "PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL: imported @include content must reach child Agent typed memory.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "docs", "comment-hidden.md"), [
      "# Hidden Include",
      "PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL should not be imported from an HTML comment.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "CLAUDE.md"), [
      "# Dot Claude Instructions",
      "PROJECT_MEMORY_IMPORT_DOT_SENTINEL: dot-claude instructions are project memory.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "pay.md"), [
      "---",
      "name: \"Pay Rule\"",
      "description: \"Payment callback rule\"",
      "paths: [\"src/pay.ts\", \"src/payment/**/*.ts\"]",
      "---",
      "PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL: src/pay.ts requires signature verification.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), [
      "# Local Instructions",
      "PROJECT_MEMORY_IMPORT_LOCAL_SENTINEL: local private instruction imported for CCM context.",
    ].join("\n"), "utf-8");
    const discovery = discoverProjectMemoryFiles(projectRoot, {});
    const imported = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
    const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL", { max: 10 });
    const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
    const plan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
    const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const checks = {
      discoversClaudeFiles: discovery.discoveredCount === 4
        && discovery.files.some((item: any) => item.relPath === "CLAUDE.md")
        && discovery.files.some((item: any) => item.relPath === ".claude/CLAUDE.md")
        && discovery.files.some((item: any) => item.relPath === ".claude/rules/pay.md")
        && discovery.files.some((item: any) => item.relPath === "CLAUDE.local.md"),
      importsTypedDocs: imported.importedCount === 5
        && docs.some(item => String(item.source || "").includes("project-memory:api:project:CLAUDE.md"))
        && docs.some(item => String(item.source || "").includes("project-memory:api:project_rule:.claude/rules/pay.md")),
      importsClaudeIncludes: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
        && Number(imported.includeAudit.importedIncludeCount || 0) === 1
        && JSON.stringify(includeRecall.recalled || []).includes("PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL")
        && !JSON.stringify(docs).includes("PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL"),
      missingIncludeAudited: (imported.issues || []).some((item: any) => item.type === "missing_include" && String(item.ref || "").includes("missing-project-extra.md")),
      preservesPathFrontmatter: docs.some(item => item.relPath.includes("pay") && (item.paths || []).includes("src/pay.ts")),
      recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL"),
      unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL")
        && unrelated.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      loadPlanIncludesImportedRule: JSON.stringify(plan.entries || []).includes(".claude/rules/pay.md")
        && Number(plan.conditionalMatched || 0) >= 1,
      indexLinksImportedDocs: indexText.includes("Project Rule: .claude/rules/pay.md")
        && indexText.includes("Project Memory: CLAUDE.md"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
      imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
      recalled: recall.surfaced,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupGlobalClaudeMemoryImportSelfTest() {
  const groupId = `global-claude-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const root = path.join(CCM_DIR, "tmp-global-claude-memory-import-selftest", groupId);
  const userRoot = path.join(root, "user-claude");
  const managedRoot = path.join(root, "managed-claude");
  try {
    fs.mkdirSync(path.join(userRoot, "rules"), { recursive: true });
    fs.mkdirSync(path.join(managedRoot, ".claude", "rules"), { recursive: true });
    fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), [
      "# User Claude Memory",
      "@../user-external.md",
      "GLOBAL_CLAUDE_USER_SENTINEL: 所有项目子 Agent 都要保留用户全局偏好。",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(root, "user-external.md"), [
      "# User External Include",
      "GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL: user Claude memory may include external text files.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(userRoot, "rules", "pay.md"), [
      "---",
      "name: \"User Pay Rule\"",
      "paths: [\"src/pay.ts\"]",
      "---",
      "GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL: src/pay.ts 必须先检查用户级支付规则。",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), [
      "# Managed Claude Memory",
      "@../managed-external.md",
      "GLOBAL_CLAUDE_MANAGED_SENTINEL: managed policy memory imported.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(root, "managed-external.md"), [
      "# Managed External Include",
      "GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL should be skipped unless external includes are approved.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(managedRoot, ".claude", "rules", "security.md"), [
      "---",
      "name: \"Managed Security Rule\"",
      "paths: [\"src/**/*.ts\"]",
      "---",
      "GLOBAL_CLAUDE_MANAGED_SECURITY_SENTINEL: TypeScript files require security review.",
    ].join("\n"), "utf-8");
    const discovery = discoverGlobalClaudeMemoryFiles({ userRoot, managedRoot });
    const imported = importGlobalClaudeMemoryToGroupTypedMemory(groupId, { userRoot, managedRoot });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
    const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL", { max: 10 });
    const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
    const checks = {
      discoversUserAndManaged: discovery.discoveredCount === 4
        && discovery.files.some((item: any) => item.scope === "user" && item.kind === "user")
        && discovery.files.some((item: any) => item.scope === "managed" && item.kind === "managed"),
      importsTypedDocs: imported.importedCount === 5
        && docs.some(item => String(item.source || "").includes("global-claude-memory:user:user:CLAUDE.md"))
        && docs.some(item => String(item.source || "").includes("global-claude-memory:managed:managed:CLAUDE.md")),
      importsUserExternalInclude: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
        && Number(imported.includeAudit.importedIncludeCount || 0) === 1
        && JSON.stringify(includeRecall.recalled || []).includes("GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL"),
      skipsManagedExternalInclude: (imported.issues || []).some((item: any) => item.type === "external_include_skipped" && String(item.ref || "").includes("managed-external.md"))
        && !JSON.stringify(docs).includes("GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL"),
      userMemoryHasHighPriorityType: docs.some(item => item.type === "user" && String(item.body || "").includes("GLOBAL_CLAUDE_USER_SENTINEL")),
      managedMemoryIsReference: docs.some(item => item.type === "reference" && String(item.body || "").includes("GLOBAL_CLAUDE_MANAGED_SENTINEL")),
      preservesRulePaths: docs.some(item => String(item.source || "").includes("rules/pay.md") && (item.paths || []).includes("src/pay.ts")),
      recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL"),
      unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL")
        && unrelated.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      indexLinksGlobalDocs: indexText.includes("User Claude Memory: CLAUDE.md")
        && indexText.includes("Managed Claude Memory: CLAUDE.md"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
      imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
      recalled: recall.surfaced,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}