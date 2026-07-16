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

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest() {
  const suffix = `${process.pid}-${Date.now()}`;
  const groupA = `cleanup-commit-repair-lifecycle-a-${suffix}`;
  const groupB = `cleanup-commit-repair-lifecycle-b-${suffix}`;
  const workItemId = `cleanup-commit-repair:selftest-${suffix}`;
  const briefId = `cleanup-commit-repair-brief:selftest-${suffix}`;
  const quarantineId = `cleanup-commit-quarantine:selftest-${suffix}`;
  const transactionId = `delivery-cleanup-commit:selftest-${suffix}`;
  const workFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA);
  const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupA);
  const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupA);
  const receiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupA);
  const approvalFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA);
  const approvalFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB);
  const cleanupDirs = [...new Set([path.dirname(workFile), path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupB))])];
  const tasksBefore = require("../../core/db").loadTasks().length;
  const approvalsBefore = (readJson(approvalFileA, {}).entries || []).length + (readJson(approvalFileB, {}).entries || []).length;
  const throws = (fn: () => any, includes = "") => {
    try { fn(); return false; } catch (error: any) { return !includes || String(error?.message || error).includes(includes); }
  };
  try {
    const at = "2026-07-12T14:00:00.000Z";
    const evidence: any = {
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
      quarantine_id: quarantineId,
      group_id: groupA,
      transaction_id: transactionId,
      observed_group_id: groupA,
      gaps: ["transaction_journal_missing"],
      transaction_checksum: `transaction-checksum-${suffix}`,
      status: "quarantined_unproven_commit",
      first_seen_at: at,
      last_seen_at: at,
    };
    evidence.evidence_checksum = cleanupCommitRepairEvidenceChecksum(evidence);
    writeJsonAtomic(quarantineFile, {
      schema: "ccm-cleanup-commit-quarantine-ledger-v1",
      version: 1,
      group_id: groupA,
      entries: [evidence],
      entry_count: 1,
      updated_at: at,
      ledger_checksum: checksum([evidence.evidence_checksum], 48),
    });
    writeCleanupCommitRepairWorkItems(groupA, [{
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
      work_item_id: workItemId,
      group_id: groupA,
      transaction_id: transactionId,
      quarantine_id: quarantineId,
      status: "pending",
      priority: "critical",
      reason: "selftest unproven cleanup commit WAL binding",
      gaps: ["transaction_journal_missing"],
      required_proof: ["valid group-local receipt checksum", "exact journal binding"],
      should_create_real_task: false,
      created_at: at,
      updated_at: at,
    }], at);
    writeCleanupCommitRepairBriefs(groupA, [{
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
      brief_id: briefId,
      group_id: groupA,
      work_item_id: workItemId,
      transaction_id: transactionId,
      target_agent_role: "group-main-agent",
      title: "Repair selftest cleanup commit WAL binding",
      status: "ready",
      instructions: ["Do not delete evidence or rewrite the WAL", "Re-prove exact bindings"],
      required_files: [quarantineFile],
      should_create_real_task: false,
      created_at: at,
      updated_at: at,
    }], at);

    const group = { id: groupA, name: "Repair lifecycle selftest", members: [{ project: "api", agent: "claudecode" }] };
    const { buildCoordinatorMaintenanceNotificationInstructions, buildWorkerContextPacketForAssignment } = require("./group-orchestrator");
    const { buildAgenticContext } = require("../global/global-agent");
    const mainBefore = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "group-main-agent");
    const globalBefore = buildAgenticContext("", "", { groups: [group, { id: groupB, name: "Other group", members: [] }] }).cleanup_commit_repair_context || null;
    const coordinatorBefore = buildCoordinatorMaintenanceNotificationInstructions(group, { at }).cleanup_commit_repair_context;
    const globalClaimBlocked = throws(() => updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupA, {
      at: "2026-07-12T14:00:10.000Z", workItemId, action: "claim", actorRole: "global-agent", actorId: "global", reason: "not authorized", explicitAction: true,
    }), "not authorized");
    const claimed = updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupA, {
      at: "2026-07-12T14:00:11.000Z", workItemId, action: "claim", actorRole: "group-main-agent", actorId: "coordinator", reason: "accept repair", explicitAction: true,
    });
    const dispatched = updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupA, {
      at: "2026-07-12T14:00:12.000Z", workItemId, action: "dispatch", actorRole: "group-main-agent", actorId: "coordinator", reason: "send exact evidence review", explicitAction: true,
    });
    const assignmentId = `api::${groupA}|coordinator|api|repair-selftest::initial::1`;
    const unauthorizedAssignmentBlocked = throws(() => createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupA, {
      at: "2026-07-12T14:00:13.000Z", workItemId, project: "api", agentType: "claudecode", assignmentId, childSessionId: "child-session-1",
      actorRole: "global-agent", actorId: "global", explicitAssignment: true,
    }), "not authorized");
    const assignment = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupA, {
      at: "2026-07-12T14:00:14.000Z", workItemId, project: "api", agentType: "claudecode", assignmentId, childSessionId: "child-session-1",
      actorRole: "group-main-agent", actorId: "coordinator", explicitAssignment: true,
    });
    const childOptions = { assignmentId, project: "api", agentType: "claudecode", childSessionId: "child-session-1" };
    const childExact = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "project-child-agent", childOptions);
    const childUnassigned = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "project-child-agent", { ...childOptions, assignmentId: "wrong-assignment" });
    const childWrongProject = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "project-child-agent", { ...childOptions, project: "frontend" });
    const childWrongSession = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "project-child-agent", { ...childOptions, childSessionId: "wrong-session" });
    const childWrongGroup = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupB, "project-child-agent", childOptions);
    const baseAssignment = { project: "api", task: "repair selftest", assignmentId, scopeId: groupA, agentType: "claudecode" };
    const exactPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], { group, childSessionId: "child-session-1" });
    const wrongPacket = buildWorkerContextPacketForAssignment({ ...baseAssignment, assignmentId: "wrong-assignment" }, "", [], { group, childSessionId: "child-session-1" });

    const expiredReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:01:00.000Z", workItemId, resolutionAction: "resolved", actorRole: "group-main-agent", actorId: "coordinator", reason: "expired approval selftest", explicitApproval: true, expiresInMs: 60_000,
    });
    const expiredBlocked = throws(() => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:02:01.000Z", receiptId: expiredReceipt.receipt_id, explicitExecution: true,
    }), "expired");
    const validReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:03:00.000Z", workItemId, resolutionAction: "resolved", actorRole: "group-main-agent", actorId: "coordinator", reason: "proof reviewed", explicitApproval: true, expiresInMs: 60_000,
    });
    const crossGroupBlocked = throws(() => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupB, {
      at: "2026-07-12T14:03:10.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
    }), "ledger checksum invalid");
    const resolved = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:03:20.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
    });
    const replayBlocked = throws(() => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:03:21.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
    }), "invalid or consumed");
    const qualityCheckId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_lifecycle_context";
    const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
    const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityCheckId], groupIds: [groupA], now: "2026-07-12T14:03:21.500Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const receiptLedger = readJson(receiptFile, {});
    writeJsonAtomic(receiptFile, {
      ...receiptLedger,
      entries: (receiptLedger.entries || []).map((entry: any) => entry.receipt_id === validReceipt.receipt_id ? { ...entry, consumed: false } : entry),
    });
    const consumedStateTamperBlocked = throws(() => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: "2026-07-12T14:03:22.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
    }), "ledger checksum invalid");
    const qualityAfterTamper = buildMemoryQualityReport({ checkIds: [qualityCheckId], groupIds: [groupA], now: "2026-07-12T14:03:22.500Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const mainAfter = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "group-main-agent");
    const childAfter = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupA, "project-child-agent", childOptions);
    const coordinatorAfter = buildCoordinatorMaintenanceNotificationInstructions(group, { at: "2026-07-12T14:03:30.000Z" }).cleanup_commit_repair_context;
    const globalAfter = buildAgenticContext("", "", { groups: [group] }).cleanup_commit_repair_context || null;
    const quarantineAfter = readJson(quarantineFile, {});
    const approvalsAfter = (readJson(approvalFileA, {}).entries || []).length + (readJson(approvalFileB, {}).entries || []).length;
    const checks = {
      readyBriefInjectedIntoGroupMainAndCoordinator: mainBefore.brief_count === 1 && coordinatorBefore.brief_count === 1,
      globalAgentExcludesGroupScopedRepairContext: globalBefore == null,
      globalAgentCannotClaimOrAssign: globalClaimBlocked && unauthorizedAssignmentBlocked,
      lifecycleTransitionsPendingClaimedDispatched: claimed.status === "claimed" && dispatched.status === "dispatched",
      exactAssignmentBindingCreated: assignment.group_id === groupA && assignment.assignment_id === assignmentId && assignment.child_session_id === "child-session-1",
      unassignedAndMismatchedChildrenSeeNoBrief: childUnassigned.brief_count === 0 && childWrongProject.brief_count === 0 && childWrongSession.brief_count === 0 && childWrongGroup.brief_count === 0,
      exactChildAndWorkerPacketReceiveOneBrief: childExact.brief_count === 1 && childExact.briefs[0]?.brief_id === briefId
        && exactPacket.cleanup_commit_repair_context?.brief_count === 1 && wrongPacket.cleanup_commit_repair_context == null,
      approvalAndExecutionAreSeparated: validReceipt.consumed === false && resolved.status === "resolved" && resolved.resolution_receipt_id === validReceipt.receipt_id,
      expiredAndCrossGroupReceiptsBlocked: expiredBlocked && crossGroupBlocked,
      replayAndConsumedStateTamperBlocked: replayBlocked && consumedStateTamperBlocked,
      persistentQualityGateAcceptsHealthyAndRejectsTamper: qualityBeforeTamper.id === qualityCheckId && qualityBeforeTamper.status === "ok"
        && qualityAfterTamper.id === qualityCheckId && qualityAfterTamper.status === "fail",
      resolvedBriefRemovedFromAllContexts: mainAfter.brief_count === 0 && childAfter.brief_count === 0 && coordinatorAfter.brief_count === 0 && globalAfter == null,
      evidenceTasksAndApprovalsPreserved: quarantineAfter.entries?.[0]?.evidence_checksum === evidence.evidence_checksum
        && require("../../core/db").loadTasks().length === tasksBefore && approvalsAfter === approvalsBefore,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      lifecycle: { claimed: claimed.status, dispatched: dispatched.status, resolved: resolved.status },
      assignment: { binding_id: assignment.binding_id, packet_brief_count: exactPacket.cleanup_commit_repair_context?.brief_count || 0 },
      receipt: { expiredBlocked, crossGroupBlocked, replayBlocked, consumedStateTamperBlocked },
      quality: {
        before: { id: qualityBeforeTamper.id, status: qualityBeforeTamper.status, report: qualityBeforeTamper.report },
        after: { id: qualityAfterTamper.id, status: qualityAfterTamper.status, report: qualityAfterTamper.report },
      },
    };
  } finally {
    for (const dir of cleanupDirs) {
      try { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest() {
  const suffix = `${process.pid}-${Date.now()}`;
  const groupA = `cleanup-commit-repair-resolution-tx-a-${suffix}`;
  const groupB = `cleanup-commit-repair-resolution-tx-b-${suffix}`;
  const groupC = `cleanup-commit-repair-resolution-tx-c-${suffix}`;
  const phases = ["prepared", "work_item_written", "work_item_committed", "brief_written", "brief_committed", "assignment_written", "assignment_committed", "receipt_written", "receipt_committed"];
  const schedulerStateFile = path.join(CCM_DIR, "memory-control", `cleanup-commit-repair-resolution-tx-selftest-${suffix}.json`);
  const groupIds = [groupA, groupB, groupC];
  const cleanupDirs = groupIds.map(groupId => path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId)));
  const tasksBefore = require("../../core/db").loadTasks().length;
  const approvalFiles = groupIds.map(groupId => getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId));
  const approvalsBefore = approvalFiles.reduce((sum, file) => sum + (readJson(file, {}).entries || []).length, 0);
  const throws = (fn: () => any, includes = "") => {
    try { fn(); return false; } catch (error: any) { return !includes || String(error?.message || error).includes(includes); }
  };
  const seed = (groupId: string, labels: string[], baseAt: string) => {
    const evidenceEntries: any[] = [];
    const workEntries: any[] = [];
    const briefEntries: any[] = [];
    const assignmentEntries: any[] = [];
    for (const [index, label] of labels.entries()) {
      const transactionId = `delivery-cleanup-commit:${groupId}:${label}`;
      const gaps = ["transaction_journal_missing"];
      const quarantineId = `cleanup-commit-quarantine:${checksum([groupId, transactionId, checksum(gaps, 32)], 24)}`;
      const workItemId = `cleanup-commit-repair:${checksum([groupId, quarantineId], 24)}`;
      const briefId = `cleanup-commit-repair-brief:${checksum([groupId, workItemId], 24)}`;
      const evidence: any = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
        quarantine_id: quarantineId,
        group_id: groupId,
        transaction_id: transactionId,
        observed_group_id: groupId,
        gaps,
        transaction_checksum: `transaction-checksum-${label}`,
        status: "quarantined_unproven_commit",
        first_seen_at: baseAt,
        last_seen_at: baseAt,
      };
      evidence.evidence_checksum = cleanupCommitRepairEvidenceChecksum(evidence);
      evidenceEntries.push(evidence);
      workEntries.push({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
        work_item_id: workItemId,
        group_id: groupId,
        transaction_id: transactionId,
        quarantine_id: quarantineId,
        status: "dispatched",
        priority: "critical",
        reason: `resolution transaction selftest ${label}`,
        gaps: ["transaction_journal_missing"],
        required_proof: ["valid exact binding"],
        should_create_real_task: false,
        created_at: baseAt,
        updated_at: baseAt,
      });
      briefEntries.push({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
        brief_id: briefId,
        group_id: groupId,
        work_item_id: workItemId,
        transaction_id: transactionId,
        target_agent_role: "group-main-agent",
        title: `Repair resolution transaction ${label}`,
        status: "assigned",
        instructions: ["Preserve evidence"],
        required_files: [],
        should_create_real_task: false,
        created_at: baseAt,
        updated_at: baseAt,
      });
      assignmentEntries.push({
        schema: "ccm-cleanup-commit-repair-assignment-v1",
        version: 1,
        binding_id: `cleanup-commit-repair-assignment:${groupId}:${label}`,
        group_id: groupId,
        work_item_id: workItemId,
        brief_id: briefId,
        transaction_id: transactionId,
        assignment_id: `assignment:${groupId}:${label}`,
        project: "api",
        agent_type: "claudecode",
        child_session_id: `child-session:${label}`,
        assigned_by_role: "group-main-agent",
        assigned_by: "coordinator",
        status: "active",
        assigned_at: baseAt,
      });
    }
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId);
    writeJsonAtomic(quarantineFile, {
      schema: "ccm-cleanup-commit-quarantine-ledger-v1",
      version: 1,
      group_id: groupId,
      entries: evidenceEntries,
      entry_count: evidenceEntries.length,
      updated_at: baseAt,
      ledger_checksum: checksum(evidenceEntries.map(entry => entry.evidence_checksum), 48),
    });
    const writtenWork = writeCleanupCommitRepairWorkItems(groupId, workEntries, baseAt);
    writeCleanupCommitRepairBriefs(groupId, briefEntries, baseAt);
    writeCleanupCommitRepairAssignments(groupId, assignmentEntries, baseAt);
    const receipts = writtenWork.map((item: any, index: number) => createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, {
      at: new Date(Date.parse(baseAt) + (index + 1) * 1_000).toISOString(),
      workItemId: item.work_item_id,
      resolutionAction: "resolved",
      actorRole: "group-main-agent",
      actorId: "coordinator",
      reason: `verified resolution proof ${labels[index]}`,
      explicitApproval: true,
      expiresInMs: 60 * 60 * 1000,
    }));
    return { workItems: writtenWork, receipts, evidenceEntries };
  };
  try {
    const seededA = seed(groupA, phases, "2026-07-12T16:00:00.000Z");
    const seededB = seed(groupB, ["isolation"], "2026-07-12T16:00:00.000Z");
    const moduleFile = path.resolve(__dirname, "group-memory-index.js");
    const childProcess = require("child_process");
    const interrupted: any[] = [];
    for (const [index, phase] of phases.entries()) {
      const script = [
        "const m=require(process.argv[1]);",
        "const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(process.argv[2],{at:process.argv[4],receiptId:process.argv[3],explicitExecution:true,simulateResolutionCrashAfter:process.argv[5]});",
        "process.stdout.write(JSON.stringify(r));",
        "process.exit(r.status==='interrupted'?0:1);",
      ].join("");
      const at = new Date(Date.parse("2026-07-12T16:10:00.000Z") + index * 1_000).toISOString();
      const run = childProcess.spawnSync(process.execPath, ["-e", script, moduleFile, groupA, seededA.receipts[index].receipt_id, at, phase], {
        cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000,
      });
      let result: any = null;
      try { result = JSON.parse(String(run.stdout || "{}")); } catch { result = { status: "invalid_child_output", stderr: run.stderr }; }
      interrupted.push({ phase, runStatus: run.status, result });
    }
    const beforeRecovery = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA);
    const discoveryEntriesBefore = {
      quarantine: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupA), {}).entries || [],
      work: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA), {}).entries || [],
      brief: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupA), {}).entries || [],
    };
    writeCleanupCommitDiscoveryArtifacts(groupA, phases.map(label => ({
      transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
      transaction: {
        transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
        group_id: groupA,
        transaction_checksum: `transaction-checksum-${label}`,
      },
      gaps: ["transaction_journal_missing"],
    })), "2026-07-12T16:10:30.000Z");
    const discoveryEntriesAfter = {
      quarantine: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupA), {}).entries || [],
      work: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA), {}).entries || [],
      brief: readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupA), {}).entries || [],
    };
    const preparedWork = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA), {}).entries?.[0] || {};
    const mutationBlocked = throws(() => updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupA, {
      at: "2026-07-12T16:11:00.000Z", workItemId: seededA.workItems[0].work_item_id, action: "reopen", actorRole: "group-main-agent", actorId: "coordinator", reason: "must wait for recovery", explicitAction: true,
    }), "transaction already in progress");
    const groupBBefore = {
      work: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupB), "utf-8"), 48),
      brief: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupB), "utf-8"), 48),
      assignment: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupB), "utf-8"), 48),
      receipt: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupB), "utf-8"), 48),
    };
    const recovered = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA, {
      at: "2026-07-12T16:20:00.000Z", trigger: "startup-selftest",
    });
    const recoveredAgain = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA, {
      at: "2026-07-12T16:20:01.000Z", trigger: "startup-selftest-repeat",
    });
    const workAfter = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA), {}).entries || [];
    const briefAfter = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupA), {}).entries || [];
    const assignmentAfter = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupA), {}).entries || [];
    const receiptAfter = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupA), {}).entries || [];
    const groupBAfter = {
      work: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupB), "utf-8"), 48),
      brief: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupB), "utf-8"), 48),
      assignment: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupB), "utf-8"), 48),
      receipt: checksum(fs.readFileSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupB), "utf-8"), 48),
    };

    const seededC = seed(groupC, ["scheduler"], "2026-07-12T17:00:00.000Z");
    const schedulerCrash = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupC, {
      at: "2026-07-12T17:00:10.000Z", receiptId: seededC.receipts[0].receipt_id, explicitExecution: true, simulateResolutionCrashAfter: "brief_written",
    });
    writeJsonAtomic(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupC), { schema: "selftest-manifest", group_id: groupC });
    const safeTelemetry = () => ({ destructive_action_authorized: false, deleted_count: 0, created_task_count: 0, created_approval_receipt_count: 0 });
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const scheduler = runConflictResolutionMemoryMaintenanceSchedulerTick({
      at: "2026-07-12T17:01:00.000Z", groupIds: [groupC], force: true, stateFile: schedulerStateFile,
      runMaintenance: () => ({ dueCount: 0, skippedCount: 1, destructiveActionAuthorized: false, deletedCount: 0 }),
      runTelemetryRecovery: safeTelemetry,
      runTelemetryOrphanReconciliation: safeTelemetry,
      runTelemetryCleanupCommitDiscovery: safeTelemetry,
      runTelemetryCleanupJournalReconciliation: () => ({ ...safeTelemetry(), ledger_checksum_valid: true, commit_ledger_checksum_valid: true, group_ledger_lock_valid: true, invalid_commit_transaction_count: 0, candidate_claim_conflict_count: 0 }),
      runTelemetryQuarantineRetention: safeTelemetry,
      runTelemetryRetention: safeTelemetry,
    });
    const qualityId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction";
    const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
    const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA, groupC], now: "2026-07-12T17:02:00.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const transactionFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupA);
    const transactionLedgerA = readJson(transactionFileA, {});
    writeJsonAtomic(transactionFileA, {
      ...transactionLedgerA,
      entries: (transactionLedgerA.entries || []).map((entry: any, index: number) => index === 0 ? { ...entry, recovery_count: Number(entry.recovery_count || 0) + 1 } : entry),
    });
    const tamperedHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA);
    const tamperedRecovery = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA, { at: "2026-07-12T17:02:01.000Z", trigger: "tamper-selftest" });
    const qualityAfterTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA], now: "2026-07-12T17:02:02.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const approvalsAfter = approvalFiles.reduce((sum, file) => sum + (readJson(file, {}).entries || []).length, 0);
    const expectedWriteBeforePhase = new Map([
      ["prepared", "prepared"], ["work_item_written", "prepared"], ["work_item_committed", "work_item_committed"],
      ["brief_written", "work_item_committed"], ["brief_committed", "brief_committed"],
      ["assignment_written", "brief_committed"], ["assignment_committed", "assignment_committed"],
      ["receipt_written", "assignment_committed"], ["receipt_committed", "receipt_committed"],
    ]);
    const checks = {
      allCrashBoundariesPersistAnOpenTransaction: interrupted.length === phases.length
        && interrupted.every(row => row.runStatus === 0 && row.result.status === "interrupted" && !!row.result.resolution_transaction_id)
        && beforeRecovery.open_transaction_count === phases.length,
      writeBeforePhaseInterruptionsRetainPreviousDurablePhase: interrupted.every(row => row.result.resolution_transaction_phase === expectedWriteBeforePhase.get(row.phase)),
      preparedWalPrecedesAnyRepairLedgerMutation: preparedWork.status === "dispatched" && !preparedWork.resolution_receipt_id,
      discoveryPreservesArtifactsBoundByOpenResolutionTransactions: checksum(discoveryEntriesBefore, 48) === checksum(discoveryEntriesAfter, 48),
      concurrentMutationBlockedWhileTransactionOpen: mutationBlocked,
      startupReconciliationRecoversEveryOpenTransaction: recovered.status === "ok" && recovered.recovered_now_count === phases.length
        && recovered.open_transaction_count === 0 && recovered.invalid_transaction_count === 0,
      completedTransactionsCarryAllPhaseProofs: recovered.rows.length === phases.length && recovered.rows.every((row: any) => row.status === "completed" && row.phase === "completed" && row.completion_proof_valid),
      allRepairLedgersConvergeToTerminalState: workAfter.every((entry: any) => entry.status === "resolved" && !!entry.resolution_receipt_id)
        && briefAfter.every((entry: any) => entry.status === "closed" && !!entry.resolution_receipt_id)
        && assignmentAfter.every((entry: any) => entry.status === "closed" && !!entry.resolution_receipt_id)
        && receiptAfter.every((entry: any) => entry.consumed === true),
      repeatedReconciliationIsIdempotent: recoveredAgain.status === "ok" && recoveredAgain.recovered_now_count === 0 && recoveredAgain.open_transaction_count === 0,
      otherGroupLedgersRemainByteStable: JSON.stringify(groupBBefore) === JSON.stringify(groupBAfter)
        && seededB.workItems.length === 1 && seededB.receipts.length === 1,
      schedulerRunsRealResolutionRecovery: schedulerCrash.status === "interrupted" && scheduler.failedCount === 0
        && scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount === 1
        && scheduler.deliveryCleanupCommitRepairResolutionOpenTransactionCount === 0,
      qualityGateAcceptsRecoveredStateAndRejectsTamper: qualityBeforeTamper.id === qualityId && qualityBeforeTamper.status === "ok"
        && qualityAfterTamper.id === qualityId && qualityAfterTamper.status === "fail",
      transactionAndLedgerTamperFailClosed: tamperedHealth.invalid_transaction_count > 0 && tamperedRecovery.status === "blocked" && tamperedRecovery.recovered_now_count === 0,
      recoveryCreatesNoTasksApprovalsOrDeletionAuthority: require("../../core/db").loadTasks().length === tasksBefore
        && approvalsAfter === approvalsBefore && recovered.destructive_action_authorized === false && recovered.deleted_count === 0
        && scheduler.destructiveActionAuthorized === false && scheduler.deletedCount === 0,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      crashMatrix: interrupted.map(row => ({ requested: row.phase, durablePhase: row.result.resolution_transaction_phase, status: row.result.status })),
      recovery: { recoveredNow: recovered.recovered_now_count, completed: recovered.completed_transaction_count, open: recovered.open_transaction_count, invalid: recovered.invalid_transaction_count },
      scheduler: { failed: scheduler.failedCount, recoveredNow: scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount, open: scheduler.deliveryCleanupCommitRepairResolutionOpenTransactionCount },
      quality: { before: qualityBeforeTamper.status, after: qualityAfterTamper.status },
    };
  } finally {
    for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of cleanupDirs) {
      try { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest() {
  const suffix = `${process.pid}-${Date.now()}`;
  const groupA = `cleanup-commit-repair-resolution-discovery-a-${suffix}`;
  const groupB = `cleanup-commit-repair-resolution-discovery-b-${suffix}`;
  const groupIds = [groupA, groupB];
  const schedulerStateFile = path.join(CCM_DIR, "memory-control", `cleanup-commit-repair-resolution-discovery-selftest-${suffix}.json`);
  const cleanupDirs = groupIds.map(groupId => path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId)));
  const approvalFiles = groupIds.map(groupId => getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId));
  const tasksBefore = require("../../core/db").loadTasks().length;
  const approvalsBefore = approvalFiles.reduce((sum, file) => sum + (readJson(file, {}).entries || []).length, 0);
  const seed = (groupId: string, labels: string[], baseAt: string) => {
    const evidenceEntries: any[] = [];
    const workEntries: any[] = [];
    const briefEntries: any[] = [];
    for (const label of labels) {
      const transactionId = `delivery-cleanup-commit:${groupId}:${label}`;
      const gaps = ["transaction_journal_missing"];
      const quarantineId = `cleanup-commit-quarantine:${checksum([groupId, transactionId, checksum(gaps, 32)], 24)}`;
      const workItemId = `cleanup-commit-repair:${checksum([groupId, quarantineId], 24)}`;
      const briefId = `cleanup-commit-repair-brief:${checksum([groupId, workItemId], 24)}`;
      const evidence: any = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
        quarantine_id: quarantineId,
        group_id: groupId,
        transaction_id: transactionId,
        observed_group_id: groupId,
        gaps,
        transaction_checksum: `transaction-checksum-${label}`,
        status: "quarantined_unproven_commit",
        first_seen_at: baseAt,
        last_seen_at: baseAt,
      };
      evidence.evidence_checksum = cleanupCommitRepairEvidenceChecksum(evidence);
      evidenceEntries.push(evidence);
      workEntries.push({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
        work_item_id: workItemId,
        group_id: groupId,
        transaction_id: transactionId,
        quarantine_id: quarantineId,
        status: "dispatched",
        priority: "critical",
        reason: `startup discovery ${label}`,
        gaps,
        required_proof: ["exact group-local proof"],
        should_create_real_task: false,
        created_at: baseAt,
        updated_at: baseAt,
      });
      briefEntries.push({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
        brief_id: briefId,
        group_id: groupId,
        work_item_id: workItemId,
        transaction_id: transactionId,
        target_agent_role: "group-main-agent",
        title: `Startup discovery ${label}`,
        status: "ready",
        instructions: ["Preserve evidence"],
        required_files: [],
        should_create_real_task: false,
        created_at: baseAt,
        updated_at: baseAt,
      });
    }
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId);
    writeJsonAtomic(quarantineFile, {
      schema: "ccm-cleanup-commit-quarantine-ledger-v1", version: 1, group_id: groupId,
      entries: evidenceEntries, entry_count: evidenceEntries.length, updated_at: baseAt,
      ledger_checksum: checksum(evidenceEntries.map(entry => entry.evidence_checksum), 48),
    });
    const workItems = writeCleanupCommitRepairWorkItems(groupId, workEntries, baseAt);
    writeCleanupCommitRepairBriefs(groupId, briefEntries, baseAt);
    const receipts = workItems.map((item: any, index: number) => createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, {
      at: new Date(Date.parse(baseAt) + (index + 1) * 1_000).toISOString(),
      workItemId: item.work_item_id,
      resolutionAction: "resolved",
      actorRole: "group-main-agent",
      actorId: "coordinator",
      reason: `verified startup discovery proof ${labels[index]}`,
      explicitApproval: true,
      expiresInMs: 60 * 60 * 1000,
    }));
    return { workItems, receipts, evidenceEntries };
  };
  try {
    const compactLabels = Array.from({ length: 7 }, (_, index) => `compact-${index}`);
    const seededA = seed(groupA, compactLabels, "2026-07-12T18:00:00.000Z");
    const compactExecutions = seededA.receipts.map((receipt: any, index: number) => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupA, {
      at: new Date(Date.parse("2026-07-12T18:05:00.000Z") + index * 1_000).toISOString(),
      receiptId: receipt.receipt_id,
      explicitExecution: true,
      resolutionTransactionTerminalLimit: 4,
    }));
    const retainedTransactionLedgerA = readCleanupCommitRepairResolutionTransactionLedger(groupA);
    const retainedWorkItemIds = new Set(retainedTransactionLedgerA.entries.map((entry: any) => entry.work_item_id));
    const retainedArtifactSnapshot = () => ({
      quarantine: (readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupA), {}).entries || []).filter((entry: any) => retainedWorkItemIds.has((seededA.workItems.find((item: any) => item.quarantine_id === entry.quarantine_id) || {}).work_item_id)),
      work: (readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupA), {}).entries || []).filter((entry: any) => retainedWorkItemIds.has(entry.work_item_id)),
      brief: (readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupA), {}).entries || []).filter((entry: any) => retainedWorkItemIds.has(entry.work_item_id)),
    });
    const retainedArtifactsBeforeDiscovery = retainedArtifactSnapshot();
    writeCleanupCommitDiscoveryArtifacts(groupA, compactLabels.map(label => ({
      transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
      transaction: { transaction_id: `delivery-cleanup-commit:${groupA}:${label}`, group_id: groupA, transaction_checksum: `transaction-checksum-${label}` },
      gaps: ["transaction_journal_missing"],
    })), "2026-07-12T18:05:30.000Z");
    const retainedArtifactsAfterDiscovery = retainedArtifactSnapshot();
    const compactDiscovery = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupA, {
      at: "2026-07-12T18:06:00.000Z", persist: true, recover: true, trigger: "startup-selftest-compact",
    });

    const invalidLabels = ["recoverable", "cross-group", "checksum-tamper", "missing-receipt"];
    const seededB = seed(groupB, invalidLabels, "2026-07-12T18:10:00.000Z");
    const prepared = seededB.receipts.map((receipt: any, index: number) => executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupB, {
      at: new Date(Date.parse("2026-07-12T18:15:00.000Z") + index * 1_000).toISOString(),
      receiptId: receipt.receipt_id,
      explicitExecution: true,
      simulateResolutionCrashAfter: "prepared",
    }));
    const transactionFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupB);
    const transactionLedgerB = readJson(transactionFileB, {});
    const txByReceipt = new Map((transactionLedgerB.entries || []).map((entry: any) => [entry.receipt_id, entry]));
    const crossTx: any = { ...(txByReceipt.get(seededB.receipts[1].receipt_id) as any), group_id: groupA };
    crossTx.transaction_checksum = cleanupCommitRepairResolutionTransactionChecksum(crossTx);
    const tamperedTx: any = { ...(txByReceipt.get(seededB.receipts[2].receipt_id) as any), recovery_count: 77 };
    const updatedTransactions = (transactionLedgerB.entries || []).map((entry: any) => entry.receipt_id === crossTx.receipt_id ? crossTx : entry.receipt_id === tamperedTx.receipt_id ? tamperedTx : entry);
    const updatedTransactionLedger: any = { ...transactionLedgerB, entries: updatedTransactions };
    updatedTransactionLedger.ledger_checksum = cleanupCommitRepairResolutionTransactionLedgerChecksum(updatedTransactionLedger);
    writeJsonAtomic(transactionFileB, updatedTransactionLedger);
    const receiptFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupB);
    const receiptLedgerB = readJson(receiptFileB, {});
    writeCleanupCommitRepairResolutionReceipts(groupB, (receiptLedgerB.entries || []).filter((entry: any) => entry.receipt_id !== seededB.receipts[3].receipt_id), "2026-07-12T18:15:10.000Z");
    const invalidIds = new Set([crossTx.resolution_transaction_id, tamperedTx.resolution_transaction_id, (txByReceipt.get(seededB.receipts[3].receipt_id) as any).resolution_transaction_id]);
    const invalidBefore = new Map((readJson(transactionFileB, {}).entries || []).filter((entry: any) => invalidIds.has(entry.resolution_transaction_id)).map((entry: any) => [entry.resolution_transaction_id, checksum(entry, 48)]));
    const discoveryB = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupB, {
      at: "2026-07-12T18:16:00.000Z", persist: true, recover: true, trigger: "startup-selftest-invalid",
    });
    const invalidAfter = new Map((readJson(transactionFileB, {}).entries || []).filter((entry: any) => invalidIds.has(entry.resolution_transaction_id)).map((entry: any) => [entry.resolution_transaction_id, checksum(entry, 48)]));
    const discoveryBRepeat = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupB, {
      at: "2026-07-12T18:16:01.000Z", persist: true, recover: true, trigger: "startup-selftest-invalid-repeat",
    });
    const batch = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery([groupA, groupB], {
      at: "2026-07-12T18:16:02.000Z", persist: true, recover: true, trigger: "startup-selftest-batch",
    });
    const workArtifacts = readJson(discoveryB.repair_work_item_file, {}).entries || [];
    const briefArtifacts = readJson(discoveryB.repair_dispatch_brief_file, {}).entries || [];
    const quarantineArtifacts = readJson(discoveryB.quarantine_file, {}).entries || [];

    writeJsonAtomic(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupB), { schema: "selftest-manifest", group_id: groupB });
    const safeTelemetry = () => ({ destructive_action_authorized: false, deleted_count: 0, created_task_count: 0, created_approval_receipt_count: 0 });
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const scheduler = runConflictResolutionMemoryMaintenanceSchedulerTick({
      at: "2026-07-12T18:17:00.000Z", groupIds: [groupB], force: true, stateFile: schedulerStateFile,
      runMaintenance: () => ({ dueCount: 0, skippedCount: 1, destructiveActionAuthorized: false, deletedCount: 0 }),
      runTelemetryRecovery: safeTelemetry,
      runTelemetryOrphanReconciliation: safeTelemetry,
      runTelemetryCleanupCommitDiscovery: safeTelemetry,
      runTelemetryCleanupJournalReconciliation: () => ({ ...safeTelemetry(), ledger_checksum_valid: true, commit_ledger_checksum_valid: true, group_ledger_lock_valid: true, invalid_commit_transaction_count: 0, candidate_claim_conflict_count: 0 }),
      runTelemetryQuarantineRetention: safeTelemetry,
      runTelemetryRetention: safeTelemetry,
    });

    const qualityId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction_startup_discovery";
    const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
    const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA, groupB], now: "2026-07-12T18:18:00.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const transactionLedgerA = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupA), {});
    writeJsonAtomic(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupA), {
      ...transactionLedgerA,
      compacted_history: { ...transactionLedgerA.compacted_history, transaction_ids_root: `${transactionLedgerA.compacted_history?.transaction_ids_root || ""}-tampered` },
    });
    const qualityAfterCompactTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA], now: "2026-07-12T18:18:01.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
    const approvalsAfter = approvalFiles.reduce((sum, file) => sum + (readJson(file, {}).entries || []).length, 0);
    const checks = {
      terminalResolutionHistoryCompactsWithAuditRoot: compactExecutions.every((entry: any) => entry.status === "resolved")
        && compactDiscovery.transaction_count === 4 && compactDiscovery.compacted_transaction_count === 3
        && compactDiscovery.compacted_history_valid === true && !!compactDiscovery.compacted_history?.transaction_ids_root
        && !!compactDiscovery.compacted_history?.transaction_checksums_root && !!compactDiscovery.compacted_history?.compact_checksum,
      terminalDetailedTransactionEvidenceRemainsFrozenAcrossDiscovery: checksum(retainedArtifactsBeforeDiscovery, 48) === checksum(retainedArtifactsAfterDiscovery, 48)
        && compactDiscovery.invalid_transaction_count === 0,
      walFirstDiscoveryRecoversExactTransaction: prepared.every((entry: any) => entry.status === "interrupted")
        && discoveryB.recovered_now_count === 1 && discoveryB.rows.some((row: any) => row.transaction.receipt_id === seededB.receipts[0].receipt_id && row.status === "completed"),
      missingReceiptTransactionIsFoundDirectlyFromWal: discoveryB.rows.some((row: any) => row.resolution_transaction_id === (txByReceipt.get(seededB.receipts[3].receipt_id) as any).resolution_transaction_id
        && row.gaps.includes("resolution_transaction_receipt_missing")),
      crossGroupAndChecksumTamperAreNotAutoRecovered: discoveryB.invalid_transaction_count === 3
        && discoveryB.rows.some((row: any) => row.resolution_transaction_id === crossTx.resolution_transaction_id && row.gaps.includes("resolution_transaction_group_mismatch"))
        && discoveryB.rows.some((row: any) => row.resolution_transaction_id === tamperedTx.resolution_transaction_id && row.gaps.includes("resolution_transaction_checksum_invalid")),
      invalidTransactionsAreFullyContainedWithoutTasks: discoveryB.contained_invalid_transaction_count === 3 && discoveryB.uncontained_invalid_transaction_count === 0
        && quarantineArtifacts.filter((entry: any) => entry.status === "quarantined_unproven_resolution_transaction").length === 3
        && workArtifacts.filter((entry: any) => entry.status === "pending" && entry.should_create_real_task === false).length === 3
        && briefArtifacts.filter((entry: any) => entry.status === "ready" && entry.should_create_real_task === false).length === 3,
      containmentDoesNotRewriteInvalidWalRows: [...invalidBefore].every(([id, value]) => invalidAfter.get(id) === value),
      repeatedDiscoveryIsIdempotent: discoveryBRepeat.repair_work_item_count === discoveryB.repair_work_item_count
        && discoveryBRepeat.repair_dispatch_brief_count === discoveryB.repair_dispatch_brief_count
        && discoveryBRepeat.contained_invalid_transaction_count === discoveryB.contained_invalid_transaction_count,
      startupBatchCoversMultipleGroups: batch.group_count === 2 && batch.compacted_transaction_count === 3
        && batch.invalid_transaction_count === 3 && batch.contained_invalid_transaction_count === 3,
      schedulerAcceptsContainedInvalidState: scheduler.failedCount === 0
        && scheduler.deliveryCleanupCommitRepairResolutionContainedInvalidTransactionCount === 3
        && scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount === 0,
      qualityGateAcceptsHealthyOrContainedAndRejectsCompactTamper: qualityBeforeTamper.id === qualityId && qualityBeforeTamper.status === "ok"
        && Number(qualityBeforeTamper.checked || 0) === 2 && Number(qualityBeforeTamper.passed || 0) === 2
        && qualityAfterCompactTamper.id === qualityId && qualityAfterCompactTamper.status === "fail",
      recoveryAndContainmentCreateNoTasksApprovalsOrDeletion: require("../../core/db").loadTasks().length === tasksBefore
        && approvalsAfter === approvalsBefore && discoveryB.destructive_action_authorized === false && discoveryB.deleted_count === 0
        && scheduler.destructiveActionAuthorized === false && scheduler.deletedCount === 0,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      compact: { retained: compactDiscovery.transaction_count, compacted: compactDiscovery.compacted_transaction_count, history: compactDiscovery.compacted_history },
      discovery: { recovered: discoveryB.recovered_now_count, invalid: discoveryB.invalid_transaction_count, contained: discoveryB.contained_invalid_transaction_count, repairs: discoveryB.repair_work_item_count, briefs: discoveryB.repair_dispatch_brief_count },
      scheduler: { failed: scheduler.failedCount, contained: scheduler.deliveryCleanupCommitRepairResolutionContainedInvalidTransactionCount },
      quality: { before: qualityBeforeTamper.status, afterCompactTamper: qualityAfterCompactTamper.status },
    };
  } finally {
    for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of cleanupDirs) {
      try { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}