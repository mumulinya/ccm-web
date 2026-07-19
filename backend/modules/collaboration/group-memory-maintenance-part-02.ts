// Behavior-freeze split from group-memory-maintenance.ts (part 2/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT,
  GROUP_TYPED_MEMORY_DIR,
  abandonConflictResolutionMaintenanceNotificationDeliveryCleanupLease,
  acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease,
  advanceCleanupCommitRepairResolutionTransaction,
  appendConflictResolutionMaintenanceNotificationDeliveryQuarantine,
  assertNoConflictingCleanupCommitRepairResolutionTransaction,
  buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates,
  checksum,
  cleanupCommitPhaseRank,
  cleanupCommitRepairAssignmentChecksum,
  cleanupCommitRepairBriefChecksum,
  cleanupCommitRepairEvidenceChecksum,
  cleanupCommitRepairItemChecksum,
  cleanupCommitRepairLedgerValid,
  cleanupCommitRepairResolutionReceiptChecksum,
  cleanupCommitRepairResolutionReceiptLedgerValid,
  cleanupCommitRepairResolutionReceiptStateChecksum,
  cleanupCommitRepairResolutionTransactionArtifactLedgerValid,
  cleanupCommitRepairResolutionTransactionChecksum,
  cleanupCommitRepairResolutionTransactionCompactChecksum,
  cleanupCommitRepairResolutionTransactionLedgerChecksum,
  cleanupCommitRepairResolutionTransactionLinkGaps,
  cleanupCommitRepairResolutionTransactionPhaseRank,
  cleanupCommitTransactionLinkGaps,
  cleanupLeaseHeld,
  conflictResolutionColdArchiveManifestChecksum,
  conflictResolutionGcApprovalReceiptChecksum,
  conflictResolutionMaintenanceNotificationDeliveryChecksum,
  conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum,
  conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum,
  conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum,
  conflictResolutionMaintenanceNotificationDeliveryCompactChecksum,
  conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum,
  conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum,
  conflictResolutionMaintenanceNotificationReceiptChecksum,
  conflictResolutionMaintenanceRecommendation,
  conflictResolutionMaintenanceScopeMetadata,
  conflictResolutionMaintenanceState,
  conflictResolutionOpenRepairEntryIds,
  conflictResolutionQuarantineChecksum,
  createConflictResolutionMaintenanceNotificationReceipt,
  emitConflictResolutionMaintenanceNotifications,
  finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal,
  getConflictResolutionColdArchiveManifestGenerationFile,
  getConflictResolutionColdArchiveManifestGenerationsDir,
  getConflictResolutionMaintenanceNotificationDeliveryPreviousFile,
  getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryDistillationLedgerFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir,
  inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease,
  listConflictResolutionColdArchiveShardFiles,
  maybeInterruptCleanupCommitRepairResolution,
  mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger,
  now,
  prepareCleanupCommitRepairResolutionTransaction,
  readAndVerifyConflictResolutionColdArchiveShard,
  readCleanupGroupLedgerLock,
  readConflictResolutionColdArchiveManifest,
  readConflictResolutionGcApprovalLedger,
  readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger,
  readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger,
  readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger,
  readConflictResolutionMaintenanceNotificationDeliveryLedger,
  readConflictResolutionMaintenanceNotificationReceiptLedger,
  readGroupTypedMemoryDistillationLedger,
  readJson,
  readPreviousConflictResolutionColdArchiveManifest,
  readStandaloneConflictResolutionColdArchiveShard,
  releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease,
  renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease,
  runGroupTypedMemoryDistillationMutation,
  safeSegment,
  typedMemorySessionScopeIdentity,
  uniqueStrings,
  upsertCleanupCommitRepairResolutionTransaction,
  upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal,
  verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate,
  withCleanupGroupLedgerLock,
  writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts,
  writeConflictResolutionGcApprovalLedger,
  writeConflictResolutionMaintenanceNotificationDeliveryLedger,
  writeConflictResolutionMaintenanceNotificationDeliveryQuarantine,
  writeJsonAtomic,
} from "./group-memory-index";

import {
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts,
  verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations,
} from "./group-memory-maintenance-part-01";

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycle(groupId: string) {
  const quarantineLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId), {});
  const workLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
  const briefLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
  const assignmentLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId), {});
  const receiptLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId), {});
  const workEntries = Array.isArray(workLedger.entries) ? workLedger.entries : [];
  const briefEntries = Array.isArray(briefLedger.entries) ? briefLedger.entries : [];
  const assignmentEntries = Array.isArray(assignmentLedger.entries) ? assignmentLedger.entries : [];
  const receiptEntries = Array.isArray(receiptLedger.entries) ? receiptLedger.entries : [];
  const quarantineEntries = Array.isArray(quarantineLedger.entries) ? quarantineLedger.entries : [];
  const present = workEntries.length > 0 || briefEntries.length > 0 || assignmentEntries.length > 0 || receiptEntries.length > 0;
  const quarantineValid = quarantineEntries.length === 0 || (quarantineLedger.group_id === groupId
    && quarantineEntries.every((entry: any) => entry.group_id === groupId && entry.evidence_checksum === cleanupCommitRepairEvidenceChecksum(entry))
    && quarantineLedger.ledger_checksum === checksum(quarantineEntries.map((entry: any) => entry.evidence_checksum || ""), 48));
  const workValid = workEntries.length === 0 || cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum);
  const briefValid = briefEntries.length === 0 || cleanupCommitRepairLedgerValid(briefLedger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum);
  const assignmentValid = assignmentEntries.length === 0 || cleanupCommitRepairLedgerValid(assignmentLedger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum);
  const receiptValid = receiptEntries.length === 0 || cleanupCommitRepairResolutionReceiptLedgerValid(receiptLedger, groupId);
  const openItems = workEntries.filter((entry: any) => !["resolved", "cancelled"].includes(entry.status));
  const terminalItems = workEntries.filter((entry: any) => ["resolved", "cancelled"].includes(entry.status));
  const openIds = new Set(openItems.map((entry: any) => entry.work_item_id));
  const terminalIds = new Set(terminalItems.map((entry: any) => entry.work_item_id));
  const openItemsCovered = openItems.every((item: any) => briefEntries.some((brief: any) => brief.group_id === groupId
    && brief.work_item_id === item.work_item_id && brief.status !== "closed" && brief.should_create_real_task === false));
  const terminalBriefLeakCount = briefEntries.filter((brief: any) => terminalIds.has(brief.work_item_id) && brief.status !== "closed").length;
  const invalidAssignmentCount = assignmentEntries.filter((binding: any) => binding.status === "active" && (binding.group_id !== groupId
    || !openIds.has(binding.work_item_id)
    || !briefEntries.some((brief: any) => brief.brief_id === binding.brief_id && brief.work_item_id === binding.work_item_id && brief.status !== "closed"))).length;
  const invalidReceiptCount = receiptEntries.filter((receipt: any) => receipt.group_id !== groupId
    || (receipt.consumed === true && !terminalIds.has(receipt.work_item_id))
    || (receipt.consumed !== true && !openIds.has(receipt.work_item_id))).length;
  const nonTasking = workEntries.every((entry: any) => entry.should_create_real_task === false)
    && briefEntries.every((entry: any) => entry.should_create_real_task === false);
  const integrityValid = quarantineValid && workValid && briefValid && assignmentValid && receiptValid;
  const safe = integrityValid && openItemsCovered && terminalBriefLeakCount === 0 && invalidAssignmentCount === 0 && invalidReceiptCount === 0 && nonTasking;
  return {
    schema: "ccm-cleanup-commit-repair-lifecycle-health-v1",
    group_id: groupId,
    present,
    status: !present ? "empty" : safe ? "ok" : "fail",
    integrity_valid: integrityValid,
    quarantine_valid: quarantineValid,
    work_item_ledger_valid: workValid,
    brief_ledger_valid: briefValid,
    assignment_ledger_valid: assignmentValid,
    resolution_receipt_ledger_valid: receiptValid,
    open_work_item_count: openItems.length,
    terminal_work_item_count: terminalItems.length,
    open_items_covered: openItemsCovered,
    terminal_brief_leak_count: terminalBriefLeakCount,
    invalid_assignment_count: invalidAssignmentCount,
    invalid_resolution_receipt_count: invalidReceiptCount,
    non_tasking: nonTasking,
    destructive_action_authorized: false,
    cross_group_authorization_allowed: false,
    policy: "group_local_checksummed_lifecycle_exact_assignment_single_use_resolution_receipt",
  };
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest() {
  return require("./group-memory-maintenance-self-tests").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest();
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest() {
  return require("./group-memory-maintenance-self-tests").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest();
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest() {
  return require("./group-memory-maintenance-self-tests").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest();
}

export function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
  let reconciledCount = 0;
  let recoveredExecutorCount = 0;
  const rows = ledger.entries.map((journalInput: any) => {
    let journal = journalInput;
    let checksumValid = journal.journal_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal);
    const groupValid = String(journal.group_id || "") === groupId;
    let reconciliationBlockedReason = "";
    let leaseActive = false;
    let leaseRecovered = false;
    let leaseStatus = inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, String(journal.receipt_id || ""), at);
    if (options.persist === true && journal.status === "in_progress" && checksumValid && groupValid) {
      const leaseResult = acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, String(journal.receipt_id || ""), String(journal.execution_id || ""), {
        at,
        ttlMs: options.leaseTtlMs || options.lease_ttl_ms,
        ownerRole: "scheduler-reconciler",
      });
      if (!leaseResult.acquired) {
        leaseActive = leaseResult.reason === "cleanup_execution_lease_busy";
        if (!leaseActive) reconciliationBlockedReason = leaseResult.reason || "cleanup_execution_lease_unavailable";
      } else {
        const leaseHandle = leaseResult.handle;
        leaseRecovered = leaseResult.recovered === true;
        if (leaseRecovered) recoveredExecutorCount++;
        try {
          const recoveredCandidates = (journal.candidates || []).map((candidate: any) => candidate.status === "delete_intent" && !fs.existsSync(candidate.target_path)
            ? { ...candidate, status: "deleted", deleted_at: candidate.deleted_at || at, recovered_from_intent_at: at }
            : candidate);
          if (recoveredCandidates.some((candidate: any, index: number) => candidate.status !== journal.candidates?.[index]?.status)) {
            journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, { ...journal, candidates: recoveredCandidates }, at, { leaseHandle });
            checksumValid = true;
            reconciledCount++;
          }
          const allDeleted = recoveredCandidates.length > 0 && recoveredCandidates.every((candidate: any) => candidate.status === "deleted");
          if (allDeleted) {
            const finalization = finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, { ...journal, candidates: recoveredCandidates }, at, leaseHandle, {
              ownerRole: "scheduler-cleanup-finalization",
            });
            journal = finalization.journal;
            checksumValid = true;
            reconciledCount++;
          }
        } catch (error: any) {
          reconciliationBlockedReason = String(error?.message || error || "cleanup_journal_reconciliation_failed");
        } finally {
          releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle, at, reconciliationBlockedReason ? "scheduler_blocked" : "scheduler_reconciled");
        }
      }
    } else if (options.persist === true
      && (journal.status === "completed" || journal.status === "cancelled")
      && checksumValid
      && groupValid
      && leaseStatus.abandoned === true) {
      const terminalLeaseResult = acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, String(journal.receipt_id || ""), String(journal.execution_id || ""), {
        at,
        ttlMs: options.leaseTtlMs || options.lease_ttl_ms,
        ownerRole: "scheduler-terminal-lease-reconciler",
      });
      if (terminalLeaseResult.acquired) {
        const terminalLeaseHandle = terminalLeaseResult.handle;
        try {
          leaseRecovered = terminalLeaseResult.recovered === true;
          if (leaseRecovered) recoveredExecutorCount++;
          const openCommit = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId).entries.find((entry: any) => entry.execution_id === journal.execution_id && entry.status !== "completed") || null;
          if (journal.status === "completed" && openCommit) {
            const finalization = finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, terminalLeaseHandle, {
              ownerRole: "scheduler-terminal-commit-reconciler",
            });
            journal = finalization.journal;
          }
          reconciledCount++;
        } catch (error: any) {
          reconciliationBlockedReason = String(error?.message || error || "cleanup_terminal_commit_reconciliation_failed");
        } finally {
          releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease(terminalLeaseHandle, at, reconciliationBlockedReason ? "scheduler_terminal_commit_blocked" : "scheduler_terminal_lease_released");
        }
      } else if (terminalLeaseResult.reason !== "cleanup_execution_lease_busy") {
        reconciliationBlockedReason = terminalLeaseResult.reason || "cleanup_terminal_execution_lease_unavailable";
      }
    }
    leaseStatus = inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, String(journal.receipt_id || ""), at);
    leaseActive = leaseActive || leaseStatus.active === true;
    let missingPendingCount = 0;
    let missingIntentCount = 0;
    for (const candidate of journal.candidates || []) {
      if (candidate.status === "deleted") continue;
      const exists = fs.existsSync(candidate.target_path);
      if (!exists && candidate.status === "delete_intent") missingIntentCount++;
      if (!exists && candidate.status === "pending") missingPendingCount++;
    }
    const resumable = journal.status === "in_progress" && checksumValid && groupValid && missingPendingCount === 0 && !leaseActive && !reconciliationBlockedReason;
    return {
      execution_id: journal.execution_id,
      receipt_id: journal.receipt_id,
      status: journal.status,
      checksum_valid: checksumValid,
      group_valid: groupValid,
      resumable,
      lease_active: leaseActive,
      lease_valid: leaseStatus.valid !== false,
      lease_abandoned: leaseStatus.abandoned === true,
      lease_recovered: leaseRecovered,
      lease_id: leaseStatus.lease?.lease_id || journal.lease_id || "",
      lease_fencing_token: Number(journal.lease_fencing_token || leaseStatus.lease?.fencing_token || 0),
      current_lease_fencing_token: Number(leaseStatus.lease?.fencing_token || 0),
      lease_recovery_count: Number(leaseStatus.lease?.recovery_count || journal.lease_recovery_count || 0),
      missing_after_intent_count: missingIntentCount,
      missing_without_intent_count: missingPendingCount,
      deleted_count: (journal.candidates || []).filter((candidate: any) => candidate.status === "deleted").length + missingIntentCount,
      candidate_count: (journal.candidates || []).length,
      reconciliation_blocked_reason: reconciliationBlockedReason,
    };
  });
  const candidateClaims = new Map<string, string[]>();
  for (const row of ledger.entries.filter((entry: any) => entry.status !== "cancelled")) {
    for (const candidate of row.candidates || []) {
      const quarantineId = String(candidate.quarantine_id || "");
      if (!quarantineId) continue;
      candidateClaims.set(quarantineId, [...(candidateClaims.get(quarantineId) || []), String(row.execution_id || "")]);
    }
  }
  const claimConflicts = [...candidateClaims.entries()].filter(([, executionIds]) => new Set(executionIds).size > 1);
  const groupLedgerLock = readCleanupGroupLedgerLock(groupId, at);
  const commitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
  const commitRows = commitLedger.entries.map((transaction: any) => {
    const completed = transaction.status === "completed" && transaction.phase === "completed";
    const revisionBindingsValid = !completed || (
      Number(transaction.quarantine_commit?.revision || 0) > Number(transaction.before?.quarantine_revision || 0)
      && Number(transaction.receipt_commit?.revision || 0) > Number(transaction.before?.receipt_ledger_revision || 0)
      && Number(transaction.journal_commit?.revision || 0) > Number(transaction.before?.journal_ledger_revision || 0)
      && !!transaction.quarantine_commit?.checksum
      && !!transaction.receipt_commit?.checksum
      && !!transaction.journal_commit?.checksum
    );
    return {
      transaction_id: transaction.transaction_id || "",
      receipt_id: transaction.receipt_id || "",
      execution_id: transaction.execution_id || "",
      phase: transaction.phase || "",
      status: transaction.status || "",
      checksum_valid: transaction.transaction_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(transaction),
      group_valid: String(transaction.group_id || "") === groupId,
      revision_bindings_valid: revisionBindingsValid,
      latest_fencing_token: Number(transaction.latest_fencing_token || 0),
      recovery_count: Number(transaction.recovery_count || 0),
    };
  });
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-reconciliation-v1",
    group_id: groupId,
    generated_at: at,
    journal_count: rows.length,
    ledger_revision: Number(ledger.revision || 0),
    ledger_checksum: ledger.ledger_checksum || "",
    ledger_checksum_valid: ledger.ledger_checksum_valid !== false,
    candidate_claim_conflict_count: claimConflicts.length,
    candidate_claim_conflicts: claimConflicts.slice(0, 20).map(([quarantineId, executionIds]) => ({ quarantine_id: quarantineId, execution_ids: [...new Set(executionIds)] })),
    group_ledger_lock_present: groupLedgerLock.present,
    group_ledger_lock_valid: groupLedgerLock.valid,
    group_ledger_lock_active: groupLedgerLock.active,
    group_ledger_lock_abandoned: groupLedgerLock.abandoned,
    commit_ledger_file: commitLedger.file,
    commit_ledger_revision: Number(commitLedger.revision || 0),
    commit_ledger_checksum: commitLedger.ledger_checksum || "",
    commit_ledger_checksum_valid: commitLedger.ledger_checksum_valid !== false,
    commit_compacted_transaction_count: Number(commitLedger.compacted_history?.compacted_count || 0),
    commit_compacted_history_valid: commitLedger.compacted_history_valid !== false,
    commit_compacted_history: commitLedger.compacted_history || null,
    commit_transaction_count: commitRows.length,
    open_commit_transaction_count: commitRows.filter((row: any) => row.status !== "completed" && row.status !== "cancelled").length,
    invalid_commit_transaction_count: commitRows.filter((row: any) => !row.checksum_valid || !row.group_valid || !row.revision_bindings_valid || cleanupCommitPhaseRank(row.phase) === 0).length + (commitLedger.ledger_checksum_valid === false ? 1 : 0),
    recovered_commit_transaction_count: commitRows.filter((row: any) => row.recovery_count > 0).length,
    commit_transactions: commitRows,
    open_journal_count: rows.filter((row: any) => row.status === "in_progress").length,
    leased_journal_count: rows.filter((row: any) => row.lease_active).length,
    abandoned_journal_count: rows.filter((row: any) => row.lease_abandoned).length,
    resumable_journal_count: rows.filter((row: any) => row.resumable).length,
    blocked_journal_count: rows.filter((row: any) => row.status === "in_progress" && !row.resumable && !row.lease_active).length,
    invalid_journal_count: rows.filter((row: any) => !row.checksum_valid || !row.group_valid || row.lease_valid === false).length + (ledger.ledger_checksum_valid === false ? 1 : 0),
    reconciled_journal_count: reconciledCount,
    recovered_executor_count: recoveredExecutorCount,
    rows,
    destructive_action_authorized: false,
    resumed_count: 0,
    deleted_count: 0,
    policy: "per_journal_fenced_lease_scheduler_reconciles_metadata_only_explicit_execution_deletes",
    file: ledger.file,
  };
}

export function revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.revokedAt || input.revoked_at || now());
  const receiptId = String(input.receiptId || input.receipt_id || "").trim();
  const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
  const reason = String(input.reason || "").trim();
  if (input.explicitRevocation !== true && input.explicit_revocation !== true) throw new Error("delivery cleanup revocation requires explicitRevocation=true");
  if (!actorId || !reason) throw new Error("delivery cleanup revocation requires actorId and reason");
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-receipt-revocation" }, groupLedgerLockHandle => {
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    const receipt = ledger.entries.find((entry: any) => entry.receipt_id === receiptId) || null;
    if (!receipt) throw new Error("delivery cleanup receipt not found");
    if (String(receipt.group_id || "") !== groupId) throw new Error("delivery cleanup receipt group mismatch");
    if (receipt.consumed === true) throw new Error("consumed delivery cleanup receipt cannot be revoked");
    if (receipt.revoked === true) return receipt;
    if (receipt.receipt_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt)) throw new Error("delivery cleanup receipt checksum invalid");
    const journals = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    if (journals.entries.some((journal: any) => journal.receipt_id === receiptId && journal.status === "in_progress")) {
      throw new Error("delivery cleanup receipt with in-progress journal cannot be revoked");
    }
    const revoked = {
      ...receipt,
      revoked: true,
      revoked_at: at,
      revoked_by: actorId,
      revocation_reason: reason,
    };
    mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, at, entries => entries.map((entry: any) => entry.receipt_id === receiptId ? revoked : entry), {
      groupLedgerLockHandle,
      ownerRole: "cleanup-receipt-revocation",
    });
    return revoked;
  });
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.issuedAt || input.issued_at || now());
  const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
  const reason = String(input.reason || "").trim();
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("delivery cleanup receipt requires explicitApproval=true");
  if (!new Set(["group-main-agent", "global-agent", "local-user"]).has(actorRole)) throw new Error("delivery cleanup actor role is invalid");
  if (!actorId || !reason) throw new Error("delivery cleanup receipt requires actorId and reason");
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-receipt-issuance" }, groupLedgerLockHandle => {
    if (typeof input.onGroupLedgerLockAcquired === "function") input.onGroupLedgerLockAcquired({
      lock_id: groupLedgerLockHandle.lock?.lock_id || "",
      waited_ms: Number(groupLedgerLockHandle.waitedMs || 0),
    });
    const selection = buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, input);
    if (!selection.candidates.length) throw new Error("delivery cleanup requires at least one eligible non-current evidence file");
    const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
    const receipt: any = {
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-v1",
      version: 1,
      receipt_id: `delivery-telemetry-cleanup:${checksum([groupId, selection.quarantine.quarantine_checksum, selection.candidates, actorRole, actorId, at], 24)}`,
      group_id: groupId,
      actor_role: actorRole,
      actor_id: actorId,
      reason,
      quarantine_checksum: selection.quarantine.quarantine_checksum,
      current_ledger_checksum: selection.generation.current.ledger_checksum,
      previous_ledger_checksum: selection.generation.previous.ledger_checksum,
      latest_recovery_proof_id: selection.latestRecoveryProofId,
      candidates: selection.candidates.sort((a: any, b: any) => a.target_path.localeCompare(b.target_path)),
      issued_at: at,
      expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
      single_use: true,
      consumed: false,
      authorization_boundary: "exact_group_quarantine_generation_and_file_checksum_only",
    };
    receipt.receipt_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt);
    mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, at, entries => {
      if (entries.some((entry: any) => entry.receipt_id === receipt.receipt_id)) throw new Error("cleanup_receipt_duplicate_id");
      return [...entries, receipt];
    }, { groupLedgerLockHandle, ownerRole: "cleanup-receipt-issuance" });
    return receipt;
  });
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.executedAt || input.executed_at || now());
  const trigger = String(input.trigger || input.source || "manual").trim().toLowerCase();
  const receiptId = String(input.receiptId || input.receipt_id || "").trim();
  let ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
  let receipt = ledger.entries.find((entry: any) => entry.receipt_id === receiptId) || null;
  const blocked = (reason: string, extra: any = {}) => ({
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
    group_id: groupId,
    receipt_id: receiptId,
    status: "blocked",
    executed: false,
    reason,
    deleted_count: 0,
    ...extra,
  });
  if (["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger)) return blocked("background_trigger_cannot_cleanup_delivery_evidence");
  if (input.explicitExecution !== true && input.explicit_execution !== true) return blocked("explicit_execution_required");
  if (!receipt) return blocked("cleanup_receipt_not_found");
  if (String(receipt.group_id || "") !== groupId) return blocked("cleanup_receipt_group_mismatch");
  if (receipt.consumed === true) return blocked("cleanup_receipt_already_consumed");
  if (receipt.revoked === true) return blocked("cleanup_receipt_revoked");
  if (receipt.single_use !== true || receipt.receipt_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt)) return blocked("cleanup_receipt_checksum_invalid");
  const journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
  let journal = journalLedger.entries.find((entry: any) => entry.receipt_id === receiptId && entry.status === "in_progress") || null;
  if (journal && (journal.journal_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal)
    || String(journal.group_id || "") !== groupId
    || journal.receipt_checksum !== receipt.receipt_checksum)) return blocked("cleanup_journal_checksum_invalid");
  const executionId = String(journal?.execution_id || `delivery-telemetry-cleanup-execution:${checksum([groupId, receiptId, receipt.receipt_checksum], 24)}`);
  const atMs = Date.parse(at);
  const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
  if (!journal && (!Number.isFinite(atMs) || !Number.isFinite(expiresAtMs) || atMs > expiresAtMs)) return blocked("cleanup_receipt_expired");
  const leaseResult = acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, receiptId, executionId, {
    at,
    ttlMs: input.leaseTtlMs || input.lease_ttl_ms,
    ownerInstanceId: input.executorId || input.executor_id,
    ownerRole: "explicit-executor",
  });
  if (!leaseResult.acquired) return blocked(leaseResult.reason || "cleanup_execution_lease_unavailable", {
    competing_lease_id: leaseResult.status?.lease?.lease_id || "",
    competing_owner_instance_id: leaseResult.status?.lease?.owner_instance_id || "",
    competing_fencing_token: Number(leaseResult.status?.lease?.fencing_token || 0),
  });
  const leaseHandle = leaseResult.handle;
  let preserveLeaseForRecovery = false;
  let completed = false;
  let resumed = !!journal;
  try {
    if (typeof input.onLeaseAcquired === "function") input.onLeaseAcquired({ ...leaseHandle.lease, lease_checksum: undefined });
    if (!cleanupLeaseHeld(leaseHandle)) return blocked("cleanup_execution_lease_lost", { lease_id: leaseHandle.lease.lease_id, fencing_token: leaseHandle.lease.fencing_token });

    ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    receipt = ledger.entries.find((entry: any) => entry.receipt_id === receiptId) || null;
    if (!receipt) return blocked("cleanup_receipt_not_found");
    if (String(receipt.group_id || "") !== groupId) return blocked("cleanup_receipt_group_mismatch");
    if (receipt.consumed === true) return blocked("cleanup_receipt_already_consumed");
    if (receipt.revoked === true) return blocked("cleanup_receipt_revoked");
    if (receipt.single_use !== true || receipt.receipt_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt)) return blocked("cleanup_receipt_checksum_invalid");

    const authoritativeJournals = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    journal = authoritativeJournals.entries.find((entry: any) => entry.receipt_id === receiptId && entry.status === "in_progress") || null;
    resumed = !!journal;
    if (journal && (journal.journal_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal)
      || String(journal.group_id || "") !== groupId
      || journal.receipt_checksum !== receipt.receipt_checksum)) return blocked("cleanup_journal_checksum_invalid");
    if (!journal && (!Number.isFinite(atMs) || !Number.isFinite(expiresAtMs) || atMs > expiresAtMs)) return blocked("cleanup_receipt_expired");

    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const quarantine = readJson(quarantineFile, {});
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    if (!generation.valid) return blocked("cleanup_delivery_generation_stale");
    if (String(quarantine.group_id || "") !== groupId || quarantine.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine)) return blocked("cleanup_quarantine_checksum_invalid");
    if (!journal && quarantine.quarantine_checksum !== receipt.quarantine_checksum) return blocked("cleanup_quarantine_stale");
    const quarantineEntriesCurrent = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    if (journal) {
      const currentQuarantineIds = new Set(quarantineEntriesCurrent.map((entry: any) => entry.quarantine_id));
      if ((journal.candidates || []).some((candidate: any) => !currentQuarantineIds.has(candidate.quarantine_id))) return blocked("cleanup_journal_candidate_missing_from_quarantine");
    }
    const latestRecoveryProofId = quarantineEntriesCurrent
      .filter((entry: any) => entry.status === "quarantined_corrupt_current")
      .sort((a: any, b: any) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0]?.quarantine_id || "";
    if (!journal && (generation.current.ledger_checksum !== receipt.current_ledger_checksum || generation.previous.ledger_checksum !== receipt.previous_ledger_checksum)) return blocked("cleanup_delivery_generation_stale");
    if (latestRecoveryProofId !== receipt.latest_recovery_proof_id) return blocked("cleanup_latest_recovery_proof_changed");
    if (!journal) {
      let selection: any;
      try { selection = buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, { quarantineIds: receipt.candidates.map((candidate: any) => candidate.quarantine_id) }); }
      catch { return blocked("cleanup_candidate_state_stale_or_protected"); }
      const selectedById = new Map(selection.candidates.map((candidate: any) => [candidate.quarantine_id, candidate]));
      for (const candidate of receipt.candidates) {
        const current = selectedById.get(candidate.quarantine_id) as any;
        if (!current || current.target_path !== candidate.target_path || current.target_kind !== candidate.target_kind || current.target_content_checksum !== candidate.target_content_checksum) return blocked("cleanup_candidate_checksum_stale");
      }
      journal = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-v1",
        version: 1,
        execution_id: executionId,
        group_id: groupId,
        receipt_id: receiptId,
        receipt_checksum: receipt.receipt_checksum,
        quarantine_checksum: receipt.quarantine_checksum,
        current_ledger_checksum: receipt.current_ledger_checksum,
        previous_ledger_checksum: receipt.previous_ledger_checksum,
        latest_recovery_proof_id: receipt.latest_recovery_proof_id,
        status: "in_progress",
        candidates: receipt.candidates.map((candidate: any) => ({ ...candidate, status: "pending", intent_at: "", deleted_at: "" })),
        started_at: at,
        updated_at: at,
        completed_at: "",
      };
    }
    journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, { leaseHandle });
    if (typeof input.onJournalLeasePersisted === "function") input.onJournalLeasePersisted({ ...journal });
    if (!renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle)) return blocked("cleanup_execution_lease_lost", { lease_id: leaseHandle.lease.lease_id, fencing_token: leaseHandle.lease.fencing_token });

    let newlyDeleted = 0;
    const simulateCrashAfterDeletes = Math.max(0, Number(input.simulateCrashAfterDeletes || input.simulate_crash_after_deletes || 0));
    for (let index = 0; index < journal.candidates.length; index++) {
      if (!renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle)) return blocked("cleanup_execution_lease_lost", { lease_id: leaseHandle.lease.lease_id, fencing_token: leaseHandle.lease.fencing_token });
      let candidate = journal.candidates[index];
      if (candidate.status === "deleted") continue;
      if (candidate.status === "pending") {
        if (!fs.existsSync(candidate.target_path)) return blocked("cleanup_pending_candidate_missing_without_intent");
        let content = "";
        try { content = fs.readFileSync(candidate.target_path, "utf-8"); } catch { return blocked("cleanup_candidate_read_failed"); }
        if (checksum(content, 48) !== candidate.target_content_checksum) return blocked("cleanup_candidate_checksum_stale");
        candidate = { ...candidate, status: "delete_intent", intent_at: at };
        journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, {
          ...journal,
          candidates: journal.candidates.map((entry: any, candidateIndex: number) => candidateIndex === index ? candidate : entry),
        }, at, { leaseHandle });
      }
      if (candidate.status === "delete_intent") {
        if (!cleanupLeaseHeld(leaseHandle)) return blocked("cleanup_execution_lease_lost", { lease_id: leaseHandle.lease.lease_id, fencing_token: leaseHandle.lease.fencing_token });
        if (fs.existsSync(candidate.target_path)) {
          let content = "";
          try { content = fs.readFileSync(candidate.target_path, "utf-8"); } catch { return blocked("cleanup_candidate_read_failed"); }
          if (checksum(content, 48) !== candidate.target_content_checksum) return blocked("cleanup_candidate_checksum_stale");
          fs.unlinkSync(candidate.target_path);
        }
        candidate = { ...candidate, status: "deleted", deleted_at: at };
        journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, {
          ...journal,
          candidates: journal.candidates.map((entry: any, candidateIndex: number) => candidateIndex === index ? candidate : entry),
        }, at, { leaseHandle });
        newlyDeleted++;
        if (simulateCrashAfterDeletes > 0 && newlyDeleted >= simulateCrashAfterDeletes) {
          preserveLeaseForRecovery = true;
          return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
            group_id: groupId,
            receipt_id: receiptId,
            execution_id: journal.execution_id,
            status: "interrupted",
            executed: false,
            resumed,
            lease_id: leaseHandle.lease.lease_id,
            fencing_token: leaseHandle.lease.fencing_token,
            lease_expires_at: leaseHandle.lease.expires_at,
            deleted_count: journal.candidates.filter((entry: any) => entry.status === "deleted").length,
            newly_deleted_count: newlyDeleted,
            remaining_count: journal.candidates.filter((entry: any) => entry.status !== "deleted").length,
            reason: "simulated_process_interruption_after_delete",
          };
        }
      }
    }
    if (input.simulateCrashBeforeFinalize === true || input.simulate_crash_before_finalize === true) {
      preserveLeaseForRecovery = true;
      return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
        group_id: groupId,
        receipt_id: receiptId,
        execution_id: journal.execution_id,
        status: "interrupted",
        executed: false,
        resumed,
        lease_id: leaseHandle.lease.lease_id,
        fencing_token: leaseHandle.lease.fencing_token,
        lease_expires_at: leaseHandle.lease.expires_at,
        deleted_count: journal.candidates.length,
        newly_deleted_count: newlyDeleted,
        remaining_count: 0,
        reason: "simulated_process_interruption_before_finalize",
      };
    }
    if (!renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle)) return blocked("cleanup_execution_lease_lost", { lease_id: leaseHandle.lease.lease_id, fencing_token: leaseHandle.lease.fencing_token });
    const finalization = finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, leaseHandle, {
      ownerRole: "explicit-cleanup-finalization",
      simulateCommitCrashAfter: input.simulateCommitCrashAfter || input.simulate_commit_crash_after,
      commitTerminalLimit: input.commitTerminalLimit || input.commit_terminal_limit,
    });
    journal = finalization.journal;
    const updatedQuarantine = finalization.updatedQuarantine;
    completed = true;
    if (input.simulateCrashAfterFinalize === true || input.simulate_crash_after_finalize === true) {
      preserveLeaseForRecovery = true;
      return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
        group_id: groupId,
        receipt_id: receiptId,
        execution_id: journal.execution_id,
        status: "interrupted",
        executed: true,
        finalized: true,
        resumed,
        lease_id: leaseHandle.lease.lease_id,
        fencing_token: leaseHandle.lease.fencing_token,
        lease_expires_at: leaseHandle.lease.expires_at,
        deleted_count: journal.candidates.length,
        newly_deleted_count: newlyDeleted,
        remaining_count: 0,
        reason: "simulated_process_interruption_after_finalize",
      };
    }
    return {
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
      group_id: groupId,
      receipt_id: receiptId,
      execution_id: journal.execution_id,
      status: "executed",
      executed: true,
      resumed,
      lease_id: leaseHandle.lease.lease_id,
      fencing_token: leaseHandle.lease.fencing_token,
      lease_recovered: leaseResult.recovered === true,
      lease_recovery_count: leaseHandle.lease.recovery_count,
      deleted_count: journal.candidates.length,
      newly_deleted_count: newlyDeleted,
      deleted_paths: journal.candidates.map((candidate: any) => candidate.target_path),
      quarantine_checksum_after: updatedQuarantine.quarantine_checksum,
      destructive_action_authorized: true,
      explicit_receipt_required: true,
      executed_at: at,
    };
  } catch (error: any) {
    const reason = String(error?.message || error || "cleanup_execution_failed");
    if (reason.startsWith("simulated_cleanup_commit_interruption_after_")) {
      preserveLeaseForRecovery = true;
      const commitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
      const transaction = commitLedger.entries.find((entry: any) => entry.execution_id === journal?.execution_id && entry.receipt_id === receiptId) || null;
      const latestJournal = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId).entries.find((entry: any) => entry.execution_id === journal?.execution_id) || journal;
      completed = latestJournal?.status === "completed";
      return blocked(reason, {
        status: "interrupted",
        executed: completed,
        finalized: completed,
        execution_id: journal?.execution_id || executionId,
        commit_transaction_id: transaction?.transaction_id || "",
        commit_phase: transaction?.phase || "",
        commit_recovery_count: Number(transaction?.recovery_count || 0),
        lease_id: leaseHandle.lease.lease_id,
        fencing_token: leaseHandle.lease.fencing_token,
        lease_expires_at: leaseHandle.lease.expires_at,
        deleted_count: (journal?.candidates || []).filter((entry: any) => entry.status === "deleted").length,
        remaining_count: 0,
      });
    }
    return blocked(reason.startsWith("cleanup_") ? reason : "cleanup_execution_failed", {
      lease_id: leaseHandle.lease.lease_id,
      fencing_token: leaseHandle.lease.fencing_token,
    });
  } finally {
    if (preserveLeaseForRecovery) {
      abandonConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle);
    } else {
      if (!completed && journal?.status === "in_progress" && cleanupLeaseHeld(leaseHandle)) {
        try { journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, { leaseHandle, leaseStatus: "released" }); } catch {}
      }
      releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease(leaseHandle, at, completed ? "executed" : "blocked_or_released");
    }
  }
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const atMs = Date.parse(at);
  const receipts = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
  const receiptRows = receipts.entries.map((receipt: any) => {
    const checksumValid = receipt.receipt_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt);
    const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
    const valid = receipt.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-v1"
      && String(receipt.group_id || "") === groupId
      && receipt.single_use === true
      && checksumValid;
    return { ...receipt, checksum_valid: checksumValid, expired: Number.isFinite(atMs) && Number.isFinite(expiresAtMs) ? atMs > expiresAtMs : true, valid };
  });
  const recoveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId, { at });
  const journalReconciliation = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, { at, persist: false });
  const quarantine = readJson(recoveryHealth.quarantine_file, {});
  const groupLedgerLock = readCleanupGroupLedgerLock(groupId, at);
  const entries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
  const latestProof = recoveryHealth.latest_recovery_proof_id
    ? entries.find((entry: any) => entry.quarantine_id === recoveryHealth.latest_recovery_proof_id) || null
    : null;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-status-v1",
    group_id: groupId,
    generated_at: at,
    receipt_file: receipts.file,
    receipt_ledger_revision: Number(receipts.revision || 0),
    receipt_ledger_checksum: receipts.ledger_checksum || "",
    receipt_ledger_checksum_valid: receipts.ledger_checksum_valid !== false,
    receipt_count: receiptRows.length,
    open_receipt_count: receiptRows.filter((receipt: any) => receipt.consumed !== true && receipt.revoked !== true).length,
    consumed_receipt_count: receiptRows.filter((receipt: any) => receipt.consumed === true).length,
    invalid_receipt_count: receiptRows.filter((receipt: any) => !receipt.valid).length + (receipts.ledger_checksum_valid === false ? 1 : 0),
    expired_open_receipt_count: receiptRows.filter((receipt: any) => receipt.expired && receipt.consumed !== true && receipt.revoked !== true).length,
    receipts: receiptRows,
    recovery_health: recoveryHealth,
    quarantine_revision: Number(quarantine.revision || 0),
    quarantine_checksum_valid: quarantine.quarantine_checksum === conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine),
    unresolved_quarantine_count: entries.length,
    compacted_quarantine_count: Number(quarantine.compacted_quarantine_count || recoveryHealth.compacted_quarantine_count || 0),
    latest_recovery_proof_id: recoveryHealth.latest_recovery_proof_id || "",
    latest_recovery_proof_present: !!latestProof && (!latestProof.evidence_path || fs.existsSync(latestProof.evidence_path)),
    retention: quarantine.retention || {},
    cleanup_journals: journalReconciliation,
    open_journal_count: journalReconciliation.open_journal_count,
    leased_journal_count: journalReconciliation.leased_journal_count,
    abandoned_journal_count: journalReconciliation.abandoned_journal_count,
    resumable_journal_count: journalReconciliation.resumable_journal_count,
    blocked_journal_count: journalReconciliation.blocked_journal_count,
    invalid_journal_count: journalReconciliation.invalid_journal_count,
    recovered_executor_count: journalReconciliation.recovered_executor_count,
    journal_ledger_revision: Number(journalReconciliation.ledger_revision || 0),
    journal_ledger_checksum: journalReconciliation.ledger_checksum || "",
    journal_ledger_checksum_valid: journalReconciliation.ledger_checksum_valid !== false,
    candidate_claim_conflict_count: Number(journalReconciliation.candidate_claim_conflict_count || 0),
    commit_ledger_revision: Number(journalReconciliation.commit_ledger_revision || 0),
    commit_ledger_checksum: journalReconciliation.commit_ledger_checksum || "",
    commit_ledger_checksum_valid: journalReconciliation.commit_ledger_checksum_valid !== false,
    commit_compacted_transaction_count: Number(journalReconciliation.commit_compacted_transaction_count || 0),
    commit_compacted_history_valid: journalReconciliation.commit_compacted_history_valid !== false,
    commit_compacted_history: journalReconciliation.commit_compacted_history || null,
    commit_transaction_count: Number(journalReconciliation.commit_transaction_count || 0),
    open_commit_transaction_count: Number(journalReconciliation.open_commit_transaction_count || 0),
    invalid_commit_transaction_count: Number(journalReconciliation.invalid_commit_transaction_count || 0),
    recovered_commit_transaction_count: Number(journalReconciliation.recovered_commit_transaction_count || 0),
    commit_transactions: journalReconciliation.commit_transactions || [],
    group_ledger_lock: {
      present: groupLedgerLock.present,
      valid: groupLedgerLock.valid,
      active: groupLedgerLock.active,
      abandoned: groupLedgerLock.abandoned,
      owner_role: groupLedgerLock.lock?.owner_role || "",
      file: groupLedgerLock.file,
    },
    scheduler_cleanup_authorized: false,
    policy: "explicit_exact_checksum_single_use_cleanup_only_latest_recovery_proof_protected",
  };
}

export function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const coldDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId);
  const currentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
  const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
  const candidates: any[] = [];
  let names: string[] = [];
  try { names = fs.readdirSync(coldDir); } catch {}
  for (const name of names.filter(name => /^maintenance-notification-deliveries(?:\.previous)?\.json\..+\.tmp$/.test(name))) {
    const source = path.join(coldDir, name);
    let content = "";
    try { content = fs.readFileSync(source, "utf-8"); } catch {}
    candidates.push({ source_path: source, content_checksum: checksum(content, 48), reason: "interrupted_atomic_temp", status: "quarantined_temp", recovery_eligible: false });
  }
  if (generation.current.valid && generation.previous.present && (!generation.previous_required || !generation.chain_valid)) {
    let content = "";
    try { content = fs.readFileSync(previousFile, "utf-8"); } catch {}
    candidates.push({ source_path: previousFile, content_checksum: checksum(content, 48), reason: "orphan_or_mismatched_previous", status: "quarantined_previous", recovery_eligible: false });
  }
  const records = options.persist === false ? candidates : candidates.map(candidate => appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, candidate, at).entry);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-orphan-reconciliation-v1",
    group_id: groupId,
    status: "ok",
    current_file: currentFile,
    previous_file: previousFile,
    candidate_count: candidates.length,
    temp_candidate_count: candidates.filter(row => row.reason === "interrupted_atomic_temp").length,
    orphan_previous_count: candidates.filter(row => row.reason === "orphan_or_mismatched_previous").length,
    candidates: records,
    generation,
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId: string, options: any = {}) {
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
  const orphans = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, { ...options, persist: false });
  const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
  const quarantinePresent = fs.existsSync(quarantineFile);
  const quarantine = readJson(quarantineFile, {});
  const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
  const evidenceDir = path.resolve(getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId));
  const quarantineEntries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
  const compactedQuarantineEntries = Array.isArray(quarantine.compacted_entries) ? quarantine.compacted_entries : [];
  const quarantineChecksumValid = !quarantinePresent || (quarantine.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1"
    && String(quarantine.group_id || "") === groupId
    && quarantine.quarantine_checksum === conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine));
  const invalidQuarantineEntries = quarantineEntries.filter((entry: any) => {
    const source = path.resolve(String(entry.source_path || coldDir));
    const sourceLocal = source === coldDir || source.startsWith(`${coldDir}${path.sep}`);
    const evidencePath = String(entry.evidence_path || "");
    const evidenceLocal = !evidencePath || path.resolve(evidencePath).startsWith(`${evidenceDir}${path.sep}`);
    const evidence = evidencePath ? readJson(evidencePath, null) : null;
    const evidenceValid = !evidencePath || (!!evidence
      && String(evidence.group_id || "") === groupId
      && String(evidence.source_content_checksum || "") === String(entry.content_checksum || "")
      && checksum(String(evidence.source_content || ""), 48) === String(entry.content_checksum || ""));
    return String(entry.group_id || "") !== groupId || !sourceLocal || !evidenceLocal || !evidenceValid;
  });
  const invalidCompactedQuarantineEntries = compactedQuarantineEntries.filter((entry: any) => entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1"
    || String(entry.group_id || "") !== groupId
    || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(entry));
  const latestRecoveryProof = quarantineEntries
    .filter((entry: any) => entry.status === "quarantined_corrupt_current")
    .sort((a: any, b: any) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0] || null;
  const safe = (generation.valid || generation.status === "empty")
    && quarantineChecksumValid
    && invalidQuarantineEntries.length === 0
    && invalidCompactedQuarantineEntries.length === 0
    && orphans.destructive_action_authorized === false
    && orphans.created_task_count === 0
    && orphans.created_approval_receipt_count === 0
    && orphans.deleted_count === 0;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-health-v1",
    group_id: groupId,
    status: safe ? "ok" : generation.recoverable ? "recoverable" : "fail",
    safe,
    generation,
    orphans,
    quarantine_file: quarantineFile,
    quarantine_present: quarantinePresent,
    quarantine_checksum_valid: quarantineChecksumValid,
    quarantine_count: quarantineEntries.length,
    compacted_quarantine_count: compactedQuarantineEntries.reduce((sum: number, entry: any) => sum + Number(entry.cleaned_count || 0), 0),
    invalid_quarantine_entry_count: invalidQuarantineEntries.length + invalidCompactedQuarantineEntries.length,
    latest_recovery_proof_id: latestRecoveryProof?.quarantine_id || "",
    latest_recovery_proof_present: !!latestRecoveryProof,
    retention: quarantine.retention || {},
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
}

export function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const apply = options.apply === true || options.recover === true || options.dryRun === false || options.dry_run === false;
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
  const resultBase = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-v1",
    group_id: groupId,
    generation,
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
  if (generation.valid) return { ...resultBase, status: "current_valid", recovered: false, recovery_required: false };
  if (!generation.recoverable) return {
    ...resultBase,
    status: generation.status === "empty" ? "empty" : "blocked",
    recovered: false,
    recovery_required: generation.status !== "empty",
    reason: generation.status === "empty" ? "delivery_ledger_not_initialized" : "no_valid_same_group_previous_delivery_generation",
  };
  const currentFile = generation.current.file;
  let currentContent = "";
  try { currentContent = fs.readFileSync(currentFile, "utf-8"); } catch {}
  const corruptChecksum = checksum(currentContent, 48);
  const evidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId);
  const evidenceFile = path.join(evidenceDir, `${corruptChecksum || "missing"}.json`);
  if (!apply) return {
    ...resultBase,
    status: "recoverable",
    recovered: false,
    recovery_required: true,
    selected_previous_checksum: generation.previous.ledger_checksum,
    corrupt_current_checksum: corruptChecksum,
    evidence_file: evidenceFile,
  };
  const evidence = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-evidence-v1",
    version: 1,
    group_id: groupId,
    source_file: currentFile,
    source_content_checksum: corruptChecksum,
    source_content: currentContent,
    reason: generation.current.error || "current_delivery_generation_invalid",
    quarantined_at: at,
  };
  writeJsonAtomic(evidenceFile, evidence);
  appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, {
    source_path: currentFile,
    evidence_path: evidenceFile,
    content_checksum: corruptChecksum,
    reason: generation.current.error || "current_delivery_generation_invalid",
    status: "quarantined_corrupt_current",
    recovery_eligible: false,
  }, at);
  const selected = generation.previous.value;
  const written = writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, selected.entries || [], at, {
    ...options,
    compactedEntries: selected.compacted_entries || [],
    previousLedgerOverride: selected,
  });
  const verified = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
  return {
    ...resultBase,
    status: verified.valid ? "recovered" : "blocked",
    recovered: verified.valid,
    recovery_required: !verified.valid,
    selected_previous_checksum: generation.previous.ledger_checksum,
    corrupt_current_checksum: corruptChecksum,
    evidence_file: evidenceFile,
    retention_generation: written.retention_generation,
    ledger_checksum: written.ledger_checksum,
    verification: verified,
  };
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
  if (!ledger.ledger_checksum_valid) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-retention-v1",
    group_id: groupId,
    status: "blocked",
    reason: "delivery_ledger_checksum_invalid",
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
  const written = writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, ledger.entries, at, {
    ...options,
    compactedEntries: ledger.compacted_entries,
  });
  const health = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, { ...options, at });
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-retention-v1",
    group_id: groupId,
    status: health.invalid_delivery_count === 0 ? "ok" : "warn",
    retention_generation: written.retention_generation,
    ledger_checksum: written.ledger_checksum,
    previous_ledger_checksum: written.previous_ledger_checksum,
    retention: written.retention,
    health,
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
    file: written.file,
  };
}

export function recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId: string, audience: string, notifications: any[] = [], input: any = {}) {
  const normalizedAudience = String(audience || "").trim().toLowerCase();
  if (!new Set(["group-main-agent", "global-agent"]).has(normalizedAudience)) throw new Error("maintenance notification delivery audience is invalid");
  const at = String(input.at || input.deliveredAt || input.delivered_at || now());
  const contextId = String(input.contextId || input.context_id || "").trim();
  const consumerSessionId = String(input.consumerSessionId || input.consumer_session_id || input.sessionId || input.session_id || "").trim();
  const channel = String(input.channel || normalizedAudience).trim().slice(0, 80) || normalizedAudience;
  if (!contextId || !consumerSessionId) throw new Error("maintenance notification delivery requires contextId and consumerSessionId");
  const safeNotifications = (Array.isArray(notifications) ? notifications : []).filter((entry: any) => entry
    && String(entry.group_id || "") === groupId
    && String(entry.audience || "") === normalizedAudience
    && entry.notification_id
    && entry.state_fingerprint
    && entry.advisory_only === true
    && entry.destructive_action_authorized === false
    && entry.should_create_real_task === false
    && entry.cross_group_authorization_allowed === false);
  const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
  if (!ledger.ledger_checksum_valid) throw new Error("maintenance notification delivery ledger checksum is invalid");
  const byId = new Map<string, any>(ledger.entries.map((entry: any) => [String(entry.delivery_id || ""), entry]));
  const recorded: any[] = [];
  for (const notification of safeNotifications) {
    const deliveryId = `conflict-resolution-maintenance-notification-delivery:${checksum([
      groupId,
      normalizedAudience,
      notification.notification_id,
      notification.state_fingerprint,
      contextId,
      consumerSessionId,
    ], 24)}`;
    const previous = byId.get(deliveryId) || null;
    const entry: any = {
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1",
      version: 1,
      delivery_id: deliveryId,
      group_id: groupId,
      ...conflictResolutionMaintenanceScopeMetadata(groupId),
      audience: normalizedAudience,
      notification_id: notification.notification_id,
      state_fingerprint: notification.state_fingerprint,
      severity: notification.severity || "info",
      context_id: contextId,
      consumer_session_id: consumerSessionId,
      channel,
      first_delivered_at: previous?.first_delivered_at || at,
      last_delivered_at: at,
      delivery_count: Number(previous?.delivery_count || 0) + 1,
      advisory_only: true,
      destructive_action_authorized: false,
      should_create_real_task: false,
      cross_group_authorization_allowed: false,
    };
    entry.delivery_checksum = conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
    byId.set(deliveryId, entry);
    recorded.push(entry);
  }
  if (recorded.length) writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, [...byId.values()], at);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-result-v1",
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    audience: normalizedAudience,
    context_id: contextId,
    consumer_session_id: consumerSessionId,
    recorded_count: recorded.length,
    entries: recorded,
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const atMs = Date.parse(at);
  const unseenAfterMs = Math.max(60_000, Number(options.unseenAfterMs || options.unseen_after_ms || 15 * 60 * 1000));
  const repeatThreshold = Math.max(2, Number(options.repeatThreshold || options.repeat_threshold || 3));
  const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
  const notificationLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId), {});
  const pinnedCurrentNotificationIds = new Set(uniqueStrings(notificationLedger.pinned_current_notification_ids || [], 20));
  const deliveries = ledger.entries.map((entry: any) => {
    const checksumValid = entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
    const valid = entry.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
      && String(entry.group_id || "") === groupId
      && new Set(["group-main-agent", "global-agent"]).has(String(entry.audience || ""))
      && entry.advisory_only === true
      && entry.destructive_action_authorized === false
      && entry.should_create_real_task === false
      && checksumValid;
    return { ...entry, checksum_valid: checksumValid, valid };
  });
  const compactedDeliveries = ledger.compacted_entries.map((entry: any) => {
    const checksumValid = entry.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry);
    const valid = entry.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
      && String(entry.group_id || "") === groupId
      && new Set(["group-main-agent", "global-agent"]).has(String(entry.audience || ""))
      && entry.advisory_only === true
      && entry.destructive_action_authorized === false
      && entry.should_create_real_task === false
      && checksumValid;
    return { ...entry, checksum_valid: checksumValid, valid };
  });
  const pending = ["group-main-agent", "global-agent"].flatMap(audience => {
    const context = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, {
      at,
      maxNotifications: 20,
      recordDelivery: false,
    });
    return context.notifications || [];
  });
  const rows = pending.map((notification: any) => {
    const matching = deliveries.filter((entry: any) => entry.valid === true
      && entry.audience === notification.audience
      && entry.notification_id === notification.notification_id
      && entry.state_fingerprint === notification.state_fingerprint
      && (!notification.state_observed_at || String(entry.last_delivered_at || "") >= String(notification.state_observed_at)));
    const firstSeenMs = Date.parse(String(notification.first_seen_at || notification.last_seen_at || ""));
    const ageMs = Number.isFinite(atMs) && Number.isFinite(firstSeenMs) ? Math.max(0, atMs - firstSeenMs) : 0;
    const severe = new Set(["critical", "warn", "warning", "error"]).has(String(notification.severity || "").toLowerCase());
    const delivered = matching.length > 0;
    const repeatedUnseen = !delivered && severe && ageMs >= unseenAfterMs && Number(notification.seen_count || 0) >= repeatThreshold;
    return {
      group_id: groupId,
      ...conflictResolutionMaintenanceScopeMetadata(groupId),
      audience: notification.audience,
      notification_id: notification.notification_id,
      state_fingerprint: notification.state_fingerprint,
      severity: notification.severity,
      action: notification.action,
      state_observed_at: notification.state_observed_at || "",
      first_seen_at: notification.first_seen_at || "",
      last_seen_at: notification.last_seen_at || "",
      seen_count: Number(notification.seen_count || 0),
      age_ms: ageMs,
      delivered,
      delivery_count: matching.reduce((sum: number, entry: any) => sum + Number(entry.delivery_count || 0), 0),
      repeated_unseen: repeatedUnseen,
      advisory_only: true,
      should_create_real_task: false,
    };
  });
  const currentKeys = new Map(rows.map((row: any) => [JSON.stringify([row.audience, row.notification_id, row.state_fingerprint]), row]));
  const compactedCurrentDeliveryCount = compactedDeliveries.filter((entry: any) => {
    const current = currentKeys.get(JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint])) as any;
    return !!current && (!current.state_observed_at || String(entry.last_delivered_at || "") >= String(current.state_observed_at));
  }).length;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-health-v1",
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    generated_at: at,
    pending_count: rows.length,
    delivered_pending_count: rows.filter((row: any) => row.delivered).length,
    unseen_pending_count: rows.filter((row: any) => !row.delivered).length,
    repeated_unseen_count: rows.filter((row: any) => row.repeated_unseen).length,
    invalid_delivery_count: deliveries.filter((entry: any) => !entry.valid).length + compactedDeliveries.filter((entry: any) => !entry.valid).length + (ledger.ledger_checksum_valid ? 0 : 1),
    ledger_checksum_valid: ledger.ledger_checksum_valid,
    previous_chain_valid: ledger.previous_chain_valid,
    retention_generation: ledger.retention_generation,
    hot_delivery_entry_count: deliveries.length,
    compacted_delivery_entry_count: compactedDeliveries.length,
    compacted_current_delivery_count: compactedCurrentDeliveryCount,
    pinned_current_notification_count: pinnedCurrentNotificationIds.size,
    unprotected_repeated_unseen_count: rows.filter((row: any) => row.repeated_unseen && !pinnedCurrentNotificationIds.has(row.notification_id)).length,
    retention: ledger.retention || {},
    rows,
    policy: "read_only_delivery_observation_no_task_no_approval_no_delete",
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
    file: ledger.file,
  };
}

export function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId: string, audience: string, options: any = {}) {
  const normalizedAudience = String(audience || "").trim().toLowerCase();
  if (!new Set(["group-main-agent", "global-agent"]).has(normalizedAudience)) throw new Error("maintenance notification context audience is invalid");
  const at = String(options.at || options.now || now());
  const notificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
  const notificationLedger = readJson(notificationFile, {});
  const audienceNotifications = (Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [])
    .filter((entry: any) => String(entry.group_id || "") === groupId && String(entry.audience || "") === normalizedAudience);
  const pinnedIds = new Set(uniqueStrings(notificationLedger.pinned_current_notification_ids || [], 20));
  const pinnedNotifications = audienceNotifications.filter((entry: any) => pinnedIds.has(String(entry.notification_id || "")));
  const notifications = pinnedNotifications.length
    ? pinnedNotifications
    : audienceNotifications
      .sort((a: any, b: any) => String(b.state_observed_at || b.last_seen_at || "").localeCompare(String(a.state_observed_at || a.last_seen_at || "")))
      .slice(0, 8);
  const receiptInspection = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, { at });
  const receipts = receiptInspection.entries.filter((entry: any) => entry.valid === true && entry.audience === normalizedAudience);
  const stateCache = new Map<string, any>();
  const currentRows = notifications.filter((entry: any) => {
    const gracePeriodMs = Number(entry.grace_period_ms || 0);
    const observedAt = String(entry.state_observed_at || entry.first_seen_at || at);
    const cacheKey = `${observedAt}:${gracePeriodMs}`;
    if (!stateCache.has(cacheKey)) stateCache.set(cacheKey, conflictResolutionMaintenanceState(groupId, { at: observedAt, gracePeriodMs }));
    const state = stateCache.get(cacheKey);
    return state.revalidated === true
      && entry.state_fingerprint === state.state_fingerprint
      && (!entry.current_manifest_checksum || entry.current_manifest_checksum === state.current_manifest_checksum)
      && (!entry.previous_manifest_checksum || entry.previous_manifest_checksum === state.previous_manifest_checksum)
      && (!entry.quarantine_checksum || entry.quarantine_checksum === state.quarantine_checksum);
  });
  const hiddenIds = new Set(receipts.map((receipt: any) => `${receipt.notification_id}:${receipt.state_fingerprint}`));
  const maxNotifications = Math.max(1, Math.min(20, Number(options.maxNotifications || options.max_notifications || 4)));
  const pending = currentRows
    .filter((entry: any) => !hiddenIds.has(`${entry.notification_id}:${entry.state_fingerprint}`))
    .sort((a: any, b: any) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))
    .slice(0, maxNotifications)
    .map((entry: any) => ({
      notification_id: entry.notification_id,
      group_id: groupId,
      ...conflictResolutionMaintenanceScopeMetadata(groupId),
      audience: normalizedAudience,
      state_fingerprint: entry.state_fingerprint,
      severity: entry.severity || "info",
      action: entry.action || "continue_read_only_verification",
      reason: String(entry.reason || "").slice(0, 360),
      state_observed_at: entry.state_observed_at || "",
      first_seen_at: entry.first_seen_at || "",
      last_seen_at: entry.last_seen_at || "",
      seen_count: Number(entry.seen_count || 1),
      advisory_only: true,
      destructive_action_authorized: false,
      should_create_real_task: false,
      cross_group_authorization_allowed: false,
    }));
  const delivery = options.recordDelivery === true && pending.length
    ? recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId, normalizedAudience, pending, {
      at,
      contextId: options.contextId || options.context_id,
      consumerSessionId: options.consumerSessionId || options.consumer_session_id || options.sessionId || options.session_id,
      channel: options.channel || normalizedAudience,
    })
    : null;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-context-v1",
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    audience: normalizedAudience,
    generated_at: at,
    pending_count: pending.length,
    current_notification_count: currentRows.length,
    hidden_by_valid_receipt_count: currentRows.length - pending.length,
    notifications: pending,
    policy: "advisory_visibility_only_no_task_no_approval_no_delete",
    advisory_only: true,
    cross_group_authorization_allowed: false,
    notification_file: notificationFile,
    receipt_file: receiptInspection.file,
    delivery,
  };
}
