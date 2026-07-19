"use strict";
// Behavior-freeze split from typed-memory-ledgers.ts (part 3/4).
// Behavior-freeze module extracted mechanically from the former facade.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts = writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts;
exports.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment;
exports.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycle = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycle;
exports.finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal = finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals;
exports.buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates = buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth;
exports.readConflictResolutionMaintenanceNotificationDeliveryLedger = readConflictResolutionMaintenanceNotificationDeliveryLedger;
exports.retainConflictResolutionMaintenanceNotificationDeliveries = retainConflictResolutionMaintenanceNotificationDeliveries;
exports.writeConflictResolutionMaintenanceNotificationDeliveryLedger = writeConflictResolutionMaintenanceNotificationDeliveryLedger;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention;
exports.recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery = recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth;
exports.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext;
exports.emitConflictResolutionMaintenanceNotifications = emitConflictResolutionMaintenanceNotifications;
exports.conflictResolutionMaintenanceRecommendation = conflictResolutionMaintenanceRecommendation;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.readConflictResolutionGcApprovalLedger = readConflictResolutionGcApprovalLedger;
exports.writeConflictResolutionGcApprovalLedger = writeConflictResolutionGcApprovalLedger;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds = listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds;
exports.runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows = loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows;
exports.writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows = restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows;
exports.readGroupTypedMemoryRecallLedger = readGroupTypedMemoryRecallLedger;
exports.typedMemoryConsumptionEntryChecksum = typedMemoryConsumptionEntryChecksum;
exports.typedMemoryConsumptionLedgerChecksum = typedMemoryConsumptionLedgerChecksum;
exports.resolveGroupTypedMemoryConsumptionScopeId = resolveGroupTypedMemoryConsumptionScopeId;
exports.readGroupTypedMemoryConsumptionLedger = readGroupTypedMemoryConsumptionLedger;
exports.normalizeTypedMemoryConsumptionUsageState = normalizeTypedMemoryConsumptionUsageState;
exports.typedMemoryConsumptionObservationId = typedMemoryConsumptionObservationId;
exports.typedMemoryConsumptionEvidenceConfidence = typedMemoryConsumptionEvidenceConfidence;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_ledgers_part_01_1 = require("./typed-memory-ledgers-part-01");
const typed_memory_ledgers_part_02_1 = require("./typed-memory-ledgers-part-02");
function writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts(groupId, invalidRows, at) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-transaction-discovery" }, () => {
        const quarantineFile = (0, typed_memory_ledgers_part_02_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile)(groupId);
        const workItemFile = (0, typed_memory_ledgers_part_02_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile)(groupId);
        const briefFile = (0, typed_memory_ledgers_part_02_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile)(groupId);
        const quarantineLedger = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
        const workItemLedger = (0, typed_memory_shared_1.readJson)(workItemFile, {});
        const briefLedger = (0, typed_memory_shared_1.readJson)(briefFile, {});
        if (Array.isArray(quarantineLedger.entries) && quarantineLedger.entries.length > 0
            && !(0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(quarantineLedger, groupId, "evidence_checksum"))
            throw new Error("resolution transaction quarantine artifact ledger checksum invalid");
        if (Array.isArray(workItemLedger.entries) && workItemLedger.entries.length > 0
            && !(0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(workItemLedger, groupId, "work_item_checksum"))
            throw new Error("resolution transaction repair work item ledger checksum invalid");
        if (Array.isArray(briefLedger.entries) && briefLedger.entries.length > 0
            && !(0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(briefLedger, groupId, "brief_checksum"))
            throw new Error("resolution transaction repair brief ledger checksum invalid");
        const quarantineById = new Map((quarantineLedger.entries || []).map((entry) => [entry.quarantine_id, entry]));
        const workItemById = new Map((workItemLedger.entries || []).map((entry) => [entry.work_item_id, entry]));
        const briefById = new Map((briefLedger.entries || []).map((entry) => [entry.brief_id, entry]));
        const activeTransactionIds = new Set(invalidRows.map((row) => row.resolution_transaction_id));
        for (const row of invalidRows) {
            const gapsRoot = (0, typed_memory_shared_1.checksum)(row.gaps || [], 32);
            const quarantineId = `cleanup-commit-repair-resolution-tx-quarantine:${(0, typed_memory_shared_1.checksum)([groupId, row.resolution_transaction_id, gapsRoot], 24)}`;
            const workItemId = `cleanup-commit-repair-resolution-tx-work:${(0, typed_memory_shared_1.checksum)([groupId, quarantineId], 24)}`;
            const briefId = `cleanup-commit-repair-resolution-tx-brief:${(0, typed_memory_shared_1.checksum)([groupId, workItemId], 24)}`;
            const evidence = {
                schema: "ccm-cleanup-commit-repair-resolution-transaction-quarantine-entry-v1",
                version: 1,
                quarantine_id: quarantineId,
                group_id: groupId,
                resolution_transaction_id: row.resolution_transaction_id || "",
                observed_group_id: row.transaction?.group_id || "",
                work_item_id: row.transaction?.work_item_id || "",
                receipt_id: row.transaction?.receipt_id || "",
                observed_transaction_checksum: row.transaction?.transaction_checksum || "",
                gaps: row.gaps || [],
                status: "quarantined_unproven_resolution_transaction",
                first_seen_at: quarantineById.get(quarantineId)?.first_seen_at || at,
                last_seen_at: at,
            };
            evidence.evidence_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(evidence, "evidence_checksum");
            quarantineById.set(quarantineId, evidence);
            const workItem = {
                schema: "ccm-cleanup-commit-repair-resolution-transaction-work-item-v1",
                version: 1,
                work_item_id: workItemId,
                group_id: groupId,
                resolution_transaction_id: row.resolution_transaction_id || "",
                quarantine_id: quarantineId,
                status: workItemById.get(workItemId)?.status || "pending",
                priority: "critical",
                reason: "repair resolution transaction cannot be recovered without exact group-local transaction, receipt, evidence and target-ledger proof",
                gaps: row.gaps || [],
                required_proof: ["valid transaction checksum and parent ledger root", "exact group-local receipt and evidence binding", "exact phase target snapshots"],
                should_create_real_task: false,
                created_at: workItemById.get(workItemId)?.created_at || at,
                updated_at: at,
            };
            workItem.work_item_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(workItem, "work_item_checksum");
            workItemById.set(workItemId, workItem);
            const brief = {
                schema: "ccm-cleanup-commit-repair-resolution-transaction-dispatch-brief-v1",
                version: 1,
                brief_id: briefId,
                group_id: groupId,
                work_item_id: workItemId,
                resolution_transaction_id: row.resolution_transaction_id || "",
                target_agent_role: "group-main-agent",
                title: "Repair unproven cleanup-commit resolution transaction",
                status: briefById.get(briefId)?.status || "ready",
                instructions: ["Do not rewrite or delete the original transaction WAL", "Re-prove receipt, evidence and target-ledger phase bindings", "Use an explicit operator repair path before closing this containment item"],
                required_files: [(0, typed_memory_ledgers_part_02_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile)(groupId), quarantineFile],
                should_create_real_task: false,
                created_at: briefById.get(briefId)?.created_at || at,
                updated_at: at,
            };
            brief.brief_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(brief, "brief_checksum");
            briefById.set(briefId, brief);
        }
        for (const [id, entry] of quarantineById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && entry.status === "quarantined_unproven_resolution_transaction") {
                const next = { ...entry, status: "contained_transaction_no_longer_invalid", contained_at: at, last_seen_at: at };
                next.evidence_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(next, "evidence_checksum");
                quarantineById.set(id, next);
            }
        }
        for (const [id, entry] of workItemById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && !["resolved", "cancelled"].includes(entry.status)) {
                const next = { ...entry, status: "resolved", resolved_at: at, updated_at: at };
                next.work_item_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(next, "work_item_checksum");
                workItemById.set(id, next);
            }
        }
        for (const [id, entry] of briefById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && entry.status !== "closed") {
                const next = { ...entry, status: "closed", closed_at: at, updated_at: at };
                next.brief_checksum = (0, typed_memory_ledgers_part_02_1.cleanupCommitRepairResolutionTransactionArtifactChecksum)(next, "brief_checksum");
                briefById.set(id, next);
            }
        }
        const quarantineEntries = [...quarantineById.values()].slice(-240);
        const workItems = [...workItemById.values()].slice(-240);
        const briefs = [...briefById.values()].slice(-240);
        (0, typed_memory_shared_1.writeJsonAtomic)(quarantineFile, { schema: "ccm-cleanup-commit-repair-resolution-transaction-quarantine-ledger-v1", version: 1, group_id: groupId, entries: quarantineEntries, active_count: quarantineEntries.filter((entry) => entry.status === "quarantined_unproven_resolution_transaction").length, updated_at: at, ledger_checksum: (0, typed_memory_shared_1.checksum)(quarantineEntries.map((entry) => entry.evidence_checksum), 48) });
        (0, typed_memory_shared_1.writeJsonAtomic)(workItemFile, { schema: "ccm-cleanup-commit-repair-resolution-transaction-work-item-ledger-v1", version: 1, group_id: groupId, entries: workItems, open_count: workItems.filter((entry) => !["resolved", "cancelled"].includes(entry.status)).length, updated_at: at, ledger_checksum: (0, typed_memory_shared_1.checksum)(workItems.map((entry) => entry.work_item_checksum), 48) });
        (0, typed_memory_shared_1.writeJsonAtomic)(briefFile, { schema: "ccm-cleanup-commit-repair-resolution-transaction-dispatch-brief-ledger-v1", version: 1, group_id: groupId, entries: briefs, ready_count: briefs.filter((entry) => entry.status === "ready").length, updated_at: at, ledger_checksum: (0, typed_memory_shared_1.checksum)(briefs.map((entry) => entry.brief_checksum), 48) });
        return { quarantineFile, workItemFile, briefFile, quarantineEntries, workItems, briefs };
    });
}
function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options = {}) {
    return require("./group-memory-maintenance").discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options);
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery(groupIds = [], options = {}) {
    return require("./group-memory-maintenance").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery(groupIds, options);
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupId, input = {}) {
    return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupId, input);
}
function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupId, audience, options = {}) {
    return require("./group-memory-maintenance").buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupId, audience, options);
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycle(groupId) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycle(groupId);
}
function finalizeConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journalInput, at, leaseHandle, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, { ...options, ownerRole: options.ownerRole || "cleanup-finalization" }, groupLedgerLockHandle => {
        if (!(0, typed_memory_ledgers_part_02_1.cleanupLeaseHeld)(leaseHandle))
            throw new Error("cleanup_execution_lease_lost");
        let journalLedger = (0, typed_memory_ledgers_part_02_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger)(groupId);
        let receiptLedger = (0, typed_memory_distillation_receipts_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
        if (!journalLedger.ledger_checksum_valid)
            throw new Error("cleanup_journal_ledger_checksum_invalid");
        if (!receiptLedger.ledger_checksum_valid)
            throw new Error("cleanup_receipt_ledger_checksum_invalid");
        let journal = journalLedger.entries.find((entry) => entry.execution_id === journalInput.execution_id) || null;
        if (!journal || journal.journal_checksum !== (0, typed_memory_ledgers_part_02_1.conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum)(journal))
            throw new Error("cleanup_journal_checksum_invalid");
        if (String(journal.group_id || "") !== groupId || journal.receipt_id !== journalInput.receipt_id)
            throw new Error("cleanup_journal_group_mismatch");
        if (!(journal.candidates || []).length || !(journal.candidates || []).every((candidate) => candidate.status === "deleted"))
            throw new Error("cleanup_journal_not_ready_to_finalize");
        const receipt = receiptLedger.entries.find((entry) => entry.receipt_id === journal.receipt_id) || null;
        if (!receipt || receipt.receipt_checksum !== (0, typed_memory_distillation_receipts_1.conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum)(receipt) || String(receipt.group_id || "") !== groupId || receipt.revoked === true) {
            throw new Error("cleanup_receipt_invalid_during_finalization");
        }
        if (receipt.consumed === true && receipt.execution_id !== journal.execution_id)
            throw new Error("cleanup_receipt_consumed_by_different_execution");
        const quarantineFile = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile)(groupId);
        let quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
        if (String(quarantine.group_id || "") !== groupId || quarantine.quarantine_checksum !== (0, typed_memory_ledgers_part_02_1.conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum)(quarantine)) {
            throw new Error("cleanup_quarantine_checksum_invalid");
        }
        const candidateIds = new Set((journal.candidates || []).map((candidate) => String(candidate.quarantine_id || "")));
        const candidateIdsRoot = (0, typed_memory_shared_1.checksum)([...candidateIds].sort(), 48);
        const transactionId = `delivery-cleanup-commit:${(0, typed_memory_shared_1.checksum)([groupId, receipt.receipt_id, journal.execution_id, journal.receipt_checksum, candidateIdsRoot], 32)}`;
        const commitLedger = (0, typed_memory_ledgers_part_02_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger)(groupId);
        if (!commitLedger.ledger_checksum_valid)
            throw new Error("cleanup_commit_ledger_checksum_invalid");
        let transaction = commitLedger.entries.find((entry) => entry.transaction_id === transactionId) || null;
        if (transaction) {
            if (transaction.transaction_checksum !== (0, typed_memory_ledgers_part_02_1.conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum)(transaction)
                || String(transaction.group_id || "") !== groupId
                || transaction.receipt_id !== receipt.receipt_id
                || transaction.execution_id !== journal.execution_id
                || transaction.receipt_checksum !== receipt.receipt_checksum
                || transaction.candidate_ids_root !== candidateIdsRoot)
                throw new Error("cleanup_commit_identity_invalid");
        }
        else {
            transaction = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-v1",
                version: 1,
                transaction_id: transactionId,
                group_id: groupId,
                receipt_id: receipt.receipt_id,
                execution_id: journal.execution_id,
                receipt_checksum: receipt.receipt_checksum,
                candidate_ids_root: candidateIdsRoot,
                initial_fencing_token: Number(leaseHandle.lease.fencing_token || 0),
                latest_fencing_token: Number(leaseHandle.lease.fencing_token || 0),
                recovery_count: 0,
                phase: "prepared",
                status: "in_progress",
                before: {
                    quarantine_revision: Number(quarantine.revision || 0),
                    quarantine_checksum: quarantine.quarantine_checksum || "",
                    receipt_ledger_revision: Number(receiptLedger.revision || 0),
                    receipt_ledger_checksum: receiptLedger.ledger_checksum || "",
                    journal_ledger_revision: Number(journalLedger.revision || 0),
                    journal_ledger_checksum: journalLedger.ledger_checksum || "",
                },
                quarantine_commit: {},
                receipt_commit: {},
                journal_commit: {},
                started_at: at,
                updated_at: at,
                completed_at: "",
            };
        }
        if (transaction.status === "completed" && transaction.phase === "completed") {
            return { journal, receipt, updatedQuarantine: { ...quarantine, file: quarantineFile }, transaction };
        }
        const recoveredTransaction = Number(transaction.latest_fencing_token || 0) !== Number(leaseHandle.lease.fencing_token || 0);
        transaction = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit)(groupId, {
            ...transaction,
            latest_fencing_token: Number(leaseHandle.lease.fencing_token || 0),
            recovery_count: Number(transaction.recovery_count || 0) + (recoveredTransaction ? 1 : 0),
        }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        (0, typed_memory_ledgers_part_02_1.maybeInterruptCleanupCommit)(options, "prepared");
        let updatedQuarantine = { ...quarantine, file: quarantineFile };
        if ((0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)(transaction.phase) < (0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)("quarantine_committed")) {
            quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
            if (String(quarantine.group_id || "") !== groupId || quarantine.quarantine_checksum !== (0, typed_memory_ledgers_part_02_1.conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum)(quarantine))
                throw new Error("cleanup_quarantine_checksum_invalid");
            const candidateRows = (quarantine.entries || []).filter((entry) => candidateIds.has(String(entry.quarantine_id || "")));
            if (candidateRows.some((entry) => entry.status === "cleaned" && entry.cleanup_receipt_id && entry.cleanup_receipt_id !== receipt.receipt_id))
                throw new Error("cleanup_candidate_claim_conflict");
            if (candidateRows.length > 0 && candidateRows.length !== candidateIds.size)
                throw new Error("cleanup_quarantine_partial_candidate_set");
            if (candidateRows.length > 0) {
                updatedQuarantine = (0, typed_memory_ledgers_part_02_1.writeConflictResolutionMaintenanceNotificationDeliveryQuarantine)(groupId, (quarantine.entries || []).map((entry) => candidateIds.has(String(entry.quarantine_id || "")) ? {
                    ...entry,
                    status: "cleaned",
                    cleaned_at: at,
                    cleanup_receipt_id: receipt.receipt_id,
                } : entry), at, {
                    compactedEntries: quarantine.compacted_entries || [],
                    expectedQuarantineChecksum: quarantine.quarantine_checksum || "",
                    groupLedgerLockHandle,
                });
            }
            else if (quarantine.quarantine_checksum === transaction.before.quarantine_checksum) {
                throw new Error("cleanup_quarantine_candidates_missing_before_commit");
            }
            else {
                updatedQuarantine = { ...quarantine, file: quarantineFile };
            }
            transaction = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit)(groupId, {
                ...transaction,
                phase: "quarantine_committed",
                quarantine_commit: {
                    revision: Number(updatedQuarantine.revision || 0),
                    checksum: updatedQuarantine.quarantine_checksum || "",
                    committed_at: at,
                },
            }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        }
        (0, typed_memory_ledgers_part_02_1.maybeInterruptCleanupCommit)(options, "quarantine_committed");
        if ((0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)(transaction.phase) < (0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)("receipt_committed")) {
            receiptLedger = (0, typed_memory_distillation_receipts_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
            const currentReceipt = receiptLedger.entries.find((entry) => entry.receipt_id === receipt.receipt_id) || null;
            if (!currentReceipt || currentReceipt.revoked === true || currentReceipt.receipt_checksum !== receipt.receipt_checksum)
                throw new Error("cleanup_receipt_invalid_during_commit");
            const journalAlreadyCompleted = journal.status === "completed";
            if (currentReceipt.consumed !== true || (!journalAlreadyCompleted && Number(currentReceipt.execution_fencing_token || 0) !== Number(leaseHandle.lease.fencing_token || 0))) {
                (0, typed_memory_distillation_receipts_1.mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId, at, entries => entries.map((entry) => entry.receipt_id === receipt.receipt_id ? {
                    ...entry,
                    consumed: true,
                    consumed_at: at,
                    deleted_count: journal.candidates.length,
                    execution_id: journal.execution_id,
                    execution_checksum: (0, typed_memory_shared_1.checksum)({ receipt_id: receipt.receipt_id, candidates: journal.candidates, at }, 48),
                    execution_fencing_token: leaseHandle.lease.fencing_token,
                } : entry), { groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" });
            }
            receiptLedger = (0, typed_memory_distillation_receipts_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
            transaction = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit)(groupId, {
                ...transaction,
                phase: "receipt_committed",
                receipt_commit: {
                    revision: Number(receiptLedger.revision || 0),
                    checksum: receiptLedger.ledger_checksum || "",
                    fencing_token: Number((receiptLedger.entries.find((entry) => entry.receipt_id === receipt.receipt_id) || {}).execution_fencing_token || 0),
                    committed_at: at,
                },
            }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        }
        (0, typed_memory_ledgers_part_02_1.maybeInterruptCleanupCommit)(options, "receipt_committed");
        if ((0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)(transaction.phase) < (0, typed_memory_ledgers_part_02_1.cleanupCommitPhaseRank)("journal_committed")) {
            journalLedger = (0, typed_memory_ledgers_part_02_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger)(groupId);
            journal = journalLedger.entries.find((entry) => entry.execution_id === journal.execution_id) || journal;
            if (journal.status !== "completed") {
                journal = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal)(groupId, {
                    ...journal,
                    status: "completed",
                    completed_at: journal.completed_at || at,
                }, at, { leaseHandle, leaseStatus: "released", groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" });
            }
            journalLedger = (0, typed_memory_ledgers_part_02_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger)(groupId);
            transaction = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit)(groupId, {
                ...transaction,
                phase: "journal_committed",
                journal_commit: {
                    revision: Number(journalLedger.revision || 0),
                    checksum: journalLedger.ledger_checksum || "",
                    journal_checksum: journal.journal_checksum || "",
                    committed_at: at,
                },
            }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        }
        (0, typed_memory_ledgers_part_02_1.maybeInterruptCleanupCommit)(options, "journal_committed");
        transaction = (0, typed_memory_ledgers_part_02_1.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit)(groupId, {
            ...transaction,
            phase: "completed",
            status: "completed",
            completed_at: transaction.completed_at || at,
        }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        return { journal, receipt, updatedQuarantine, transaction };
    });
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, options = {}) {
    return require("./group-memory-maintenance").reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, options);
}
function buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, options = {}) {
    const quarantineFile = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile)(groupId);
    const quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
    if (quarantine.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1"
        || String(quarantine.group_id || "") !== groupId
        || quarantine.quarantine_checksum !== (0, typed_memory_ledgers_part_02_1.conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum)(quarantine)) {
        throw new Error("delivery cleanup requires a valid group-local quarantine ledger");
    }
    const generation = (0, typed_memory_ledgers_part_01_1.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations)(groupId);
    if (!generation.valid)
        throw new Error("delivery cleanup requires a valid current/previous delivery generation chain");
    const entries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    const latestRecoveryProofId = entries
        .filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0]?.quarantine_id || "";
    const requestedRaw = options.quarantineIds || options.quarantine_ids;
    const requested = Array.isArray(requestedRaw) ? new Set((0, typed_memory_shared_1.uniqueStrings)(requestedRaw, 1000)) : null;
    const coldDir = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId);
    const evidenceDir = (0, typed_memory_ledgers_part_01_1.getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir)(groupId);
    const currentFile = path.resolve((0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile)(groupId));
    const previousFile = path.resolve((0, typed_memory_ledgers_part_01_1.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile)(groupId));
    const candidates = [];
    for (const entry of entries) {
        if (requested && !requested.has(String(entry.quarantine_id || "")))
            continue;
        if (entry.status === "cleaned" || entry.quarantine_id === latestRecoveryProofId)
            continue;
        let targetPath = "";
        let targetKind = "";
        if (entry.status === "quarantined_corrupt_current" && entry.evidence_path) {
            targetPath = String(entry.evidence_path);
            targetKind = "recovery_evidence";
            if (!(0, typed_memory_shared_1.pathWithinDirectory)(targetPath, evidenceDir))
                continue;
        }
        else if (entry.reason === "interrupted_atomic_temp") {
            targetPath = String(entry.source_path || "");
            targetKind = "interrupted_temp";
            if (!(0, typed_memory_shared_1.pathWithinDirectory)(targetPath, coldDir))
                continue;
        }
        else if (entry.reason === "orphan_or_mismatched_previous") {
            targetPath = String(entry.source_path || "");
            targetKind = "orphan_previous";
            if (!(0, typed_memory_shared_1.pathWithinDirectory)(targetPath, coldDir))
                continue;
        }
        if (!targetPath || !fs.existsSync(targetPath))
            continue;
        const resolvedTarget = path.resolve(targetPath);
        if (resolvedTarget === currentFile || (resolvedTarget === previousFile && generation.previous_required))
            continue;
        let content = "";
        try {
            content = fs.readFileSync(resolvedTarget, "utf-8");
        }
        catch {
            continue;
        }
        const targetContentChecksum = (0, typed_memory_shared_1.checksum)(content, 48);
        if (targetKind !== "recovery_evidence" && targetContentChecksum !== String(entry.content_checksum || ""))
            continue;
        candidates.push({
            quarantine_id: entry.quarantine_id,
            reason: entry.reason,
            target_path: resolvedTarget,
            target_kind: targetKind,
            target_content_checksum: targetContentChecksum,
        });
    }
    if (requested && candidates.length !== requested.size)
        throw new Error("delivery cleanup requested set contains protected, missing or stale evidence");
    return { quarantine, generation, latestRecoveryProofId, candidates };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupId, options = {}) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupId, options);
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, options = {}) {
    return require("./group-memory-maintenance").reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, options);
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId, options = {}) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId, options);
}
function readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId) {
    const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile)(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const present = fs.existsSync(file);
    const legacy = ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v1";
    const checksumValid = !present || legacy || (ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && ledger.ledger_checksum === (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum)(ledger));
    const previousFile = (0, typed_memory_ledgers_part_01_1.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile)(groupId);
    const previous = (0, typed_memory_shared_1.readJson)(previousFile, null);
    const previousChainValid = !ledger.previous_ledger_checksum
        || (!!previous
            && previous.ledger_checksum === ledger.previous_ledger_checksum
            && previous.ledger_checksum === (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum)(previous));
    return {
        schema: ledger.schema || "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2",
        version: Number(ledger.version || (legacy ? 1 : 2)),
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        compacted_entries: Array.isArray(ledger.compacted_entries) ? ledger.compacted_entries : [],
        retention_generation: Number(ledger.retention_generation || 0),
        previous_ledger_checksum: ledger.previous_ledger_checksum || "",
        ledger_checksum: ledger.ledger_checksum || "",
        ledger_checksum_valid: checksumValid,
        previous_chain_valid: previousChainValid,
        previous_file: previousFile,
        retention: ledger.retention || {},
        file,
        updated_at: ledger.updated_at || "",
    };
}
function retainConflictResolutionMaintenanceNotificationDeliveries(groupId, entries, compactedEntries, at, options = {}) {
    const atMs = Date.parse(at);
    const terminalAgeMs = Math.max(60_000, Number(options.terminalAgeMs || options.terminal_age_ms || 30 * 24 * 60 * 60 * 1000));
    const maxHotEntries = Math.max(20, Math.min(2000, Number(options.maxHotEntries || options.max_hot_entries || 320)));
    const maxCompactedEntries = Math.max(20, Math.min(1000, Number(options.maxCompactedEntries || options.max_compacted_entries || 160)));
    const currentNotifications = ["group-main-agent", "global-agent"].flatMap(audience => {
        const context = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, {
            at,
            maxNotifications: 20,
            recordDelivery: false,
        });
        return context.notifications || [];
    });
    const currentByKey = new Map(currentNotifications.map((notification) => [
        JSON.stringify([notification.audience, notification.notification_id, notification.state_fingerprint]),
        notification,
    ]));
    const validRows = [];
    const invalidRows = [];
    for (const entry of entries) {
        const valid = entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
            && String(entry.group_id || "") === groupId
            && entry.delivery_checksum === (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryChecksum)(entry);
        (valid ? validRows : invalidRows).push(entry);
    }
    const pinned = [];
    const terminalCandidates = [];
    const recentCandidates = [];
    for (const entry of validRows) {
        const key = JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint]);
        const current = currentByKey.get(key);
        const currentDelivery = !!current && (!current.state_observed_at || String(entry.last_delivered_at || "") >= String(current.state_observed_at));
        if (currentDelivery) {
            pinned.push(entry);
            continue;
        }
        const deliveredAtMs = Date.parse(String(entry.last_delivered_at || ""));
        const old = Number.isFinite(atMs) && Number.isFinite(deliveredAtMs) && atMs - deliveredAtMs >= terminalAgeMs;
        (old ? terminalCandidates : recentCandidates).push(entry);
    }
    recentCandidates.sort((a, b) => String(b.last_delivered_at || "").localeCompare(String(a.last_delivered_at || "")));
    const invalidHot = invalidRows.slice(-Math.min(40, maxHotEntries));
    const hotCapacity = Math.max(0, maxHotEntries - pinned.length - invalidHot.length);
    const recentHot = recentCandidates.slice(0, hotCapacity);
    terminalCandidates.push(...recentCandidates.slice(hotCapacity));
    const compactById = new Map();
    for (const entry of compactedEntries) {
        if (entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
            || String(entry.group_id || "") !== groupId
            || entry.compact_checksum !== (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryCompactChecksum)(entry))
            continue;
        compactById.set(String(entry.compact_id || ""), entry);
    }
    const terminalGroups = new Map();
    for (const entry of terminalCandidates) {
        const key = JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint]);
        terminalGroups.set(key, [...(terminalGroups.get(key) || []), entry]);
    }
    for (const [key, rows] of terminalGroups) {
        const [audience, notificationId, stateFingerprint] = JSON.parse(key);
        const compactId = `conflict-resolution-maintenance-notification-delivery-compact:${(0, typed_memory_shared_1.checksum)([groupId, key], 24)}`;
        const existing = compactById.get(compactId) || null;
        const contextIds = (0, typed_memory_shared_1.uniqueStrings)(rows.map((entry) => entry.context_id), 5000).sort();
        const sourceChecksums = rows.map((entry) => entry.delivery_checksum).filter(Boolean).sort();
        const compact = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1",
            version: 1,
            compact_id: compactId,
            group_id: groupId,
            audience,
            notification_id: notificationId,
            state_fingerprint: stateFingerprint,
            first_delivered_at: [existing?.first_delivered_at, ...rows.map((entry) => entry.first_delivered_at)].filter(Boolean).sort()[0] || at,
            last_delivered_at: [existing?.last_delivered_at, ...rows.map((entry) => entry.last_delivered_at)].filter(Boolean).sort().slice(-1)[0] || at,
            delivery_count: Number(existing?.delivery_count || 0) + rows.reduce((sum, entry) => sum + Number(entry.delivery_count || 0), 0),
            detailed_entry_count: Number(existing?.detailed_entry_count || 0) + rows.length,
            context_ids_root_checksum: (0, typed_memory_shared_1.checksum)([existing?.context_ids_root_checksum || "", contextIds], 48),
            source_delivery_checksums_root: (0, typed_memory_shared_1.checksum)([existing?.source_delivery_checksums_root || "", sourceChecksums], 48),
            terminal: true,
            advisory_only: true,
            destructive_action_authorized: false,
            should_create_real_task: false,
            compacted_at: at,
        };
        compact.compact_checksum = (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryCompactChecksum)(compact);
        compactById.set(compactId, compact);
    }
    const compacted = [...compactById.values()]
        .sort((a, b) => String(a.last_delivered_at || "").localeCompare(String(b.last_delivered_at || "")))
        .slice(-maxCompactedEntries);
    const hot = [...invalidHot, ...recentHot, ...pinned]
        .sort((a, b) => String(a.last_delivered_at || "").localeCompare(String(b.last_delivered_at || "")));
    return {
        entries: hot,
        compacted_entries: compacted,
        retention: {
            policy: "pin_current_delivery_compact_terminal_preserve_invalid_diagnostics",
            max_hot_entries: maxHotEntries,
            max_compacted_entries: maxCompactedEntries,
            terminal_age_ms: terminalAgeMs,
            input_detailed_count: entries.length,
            hot_detailed_count: hot.length,
            pinned_current_delivery_count: pinned.length,
            invalid_hot_count: invalidHot.length,
            compacted_this_run_count: terminalCandidates.length,
            compacted_summary_count: compacted.length,
            protected_current_notification_ids: currentNotifications.map((notification) => notification.notification_id),
        },
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, entries, at, options = {}) {
    const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile)(groupId);
    const previousRaw = options.previousLedgerOverride && typeof options.previousLedgerOverride === "object"
        ? options.previousLedgerOverride
        : (0, typed_memory_shared_1.readJson)(file, {});
    const previousValid = previousRaw.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && previousRaw.ledger_checksum === (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum)(previousRaw);
    const retained = retainConflictResolutionMaintenanceNotificationDeliveries(groupId, entries, Array.isArray(options.compactedEntries) ? options.compactedEntries : (Array.isArray(previousRaw.compacted_entries) ? previousRaw.compacted_entries : []), at, options);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2",
        version: 2,
        group_id: groupId,
        retention_generation: Number(previousRaw.retention_generation || 0) + 1,
        previous_ledger_checksum: previousValid ? previousRaw.ledger_checksum : "",
        entries: retained.entries,
        compacted_entries: retained.compacted_entries,
        delivery_count: retained.entries.length,
        compacted_delivery_count: retained.compacted_entries.reduce((sum, entry) => sum + Number(entry.delivery_count || 0), 0),
        retention: retained.retention,
        updated_at: at,
    };
    value.ledger_checksum = (0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum)(value);
    if (previousValid)
        (0, typed_memory_shared_1.writeJsonAtomic)((0, typed_memory_ledgers_part_01_1.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile)(groupId), previousRaw);
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file };
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, options = {}) {
    return require("./group-memory-maintenance").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, options);
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupId, options = {}) {
    return require("./group-memory-maintenance").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupId, options);
}
function recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId, audience, notifications = [], input = {}) {
    return require("./group-memory-maintenance").recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId, audience, notifications, input);
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, options = {}) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, options);
}
function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, options = {}) {
    return require("./group-memory-maintenance").buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, options);
}
function emitConflictResolutionMaintenanceNotifications(groupId, run = {}, options = {}) {
    const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile)(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const previous = Array.isArray(ledger.entries) ? ledger.entries : [];
    const at = String(run.at || options.at || (0, typed_memory_shared_1.now)());
    const stateFingerprint = (0, typed_memory_shared_1.checksum)([
        groupId,
        run.current_manifest_checksum || "",
        run.previous_manifest_checksum || "",
        run.quarantine_checksum || "",
        run.recommendation?.severity || "",
        run.recommendation?.action || "",
    ], 32);
    const drafts = [
        { audience: "group-main-agent", recommendation: run.group_main_agent_recommendation || run.recommendation || {} },
        { audience: "global-agent", recommendation: run.global_agent_recommendation || run.recommendation || {} },
    ].map((draft) => {
        const notificationId = `conflict-resolution-maintenance-notification:${(0, typed_memory_shared_1.checksum)([groupId, draft.audience, stateFingerprint], 24)}`;
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-v1",
            version: 1,
            notification_id: notificationId,
            group_id: groupId,
            ...(0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceScopeMetadata)(groupId),
            audience: draft.audience,
            state_fingerprint: stateFingerprint,
            severity: draft.recommendation.severity || "info",
            action: draft.recommendation.action || "continue_read_only_verification",
            reason: draft.recommendation.reason || "",
            advisory_only: true,
            destructive_action_authorized: false,
            should_create_real_task: false,
            cross_group_authorization_allowed: false,
            source_run_id: run.run_id || "",
            state_observed_at: at,
            current_manifest_checksum: run.current_manifest_checksum || "",
            previous_manifest_checksum: run.previous_manifest_checksum || "",
            quarantine_checksum: run.quarantine_checksum || "",
            grace_period_ms: Number(run.grace_period_ms || 0),
            first_seen_at: at,
            last_seen_at: at,
            seen_count: 1,
        };
    });
    const byId = new Map(previous.map((entry) => [String(entry.notification_id || ""), entry]));
    let newCount = 0;
    let deduplicatedCount = 0;
    for (const draft of drafts) {
        const existing = byId.get(draft.notification_id);
        if (existing) {
            deduplicatedCount++;
            byId.set(draft.notification_id, {
                ...existing,
                ...draft,
                first_seen_at: existing.first_seen_at || draft.first_seen_at,
                last_seen_at: at,
                seen_count: Number(existing.seen_count || 1) + 1,
            });
        }
        else {
            newCount++;
            byId.set(draft.notification_id, draft);
        }
    }
    const pinnedIds = new Set(drafts.map((draft) => draft.notification_id));
    const pinned = [...byId.values()].filter((entry) => pinnedIds.has(entry.notification_id));
    const recent = [...byId.values()]
        .filter((entry) => !pinnedIds.has(entry.notification_id))
        .sort((a, b) => String(a.last_seen_at || a.first_seen_at || "").localeCompare(String(b.last_seen_at || b.first_seen_at || "")))
        .slice(-Math.max(0, 240 - pinned.length));
    const entries = [...recent, ...pinned]
        .sort((a, b) => String(a.last_seen_at || a.first_seen_at || "").localeCompare(String(b.last_seen_at || b.first_seen_at || "")));
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-ledger-v1",
        version: 1,
        group_id: groupId,
        ...(0, typed_memory_ledgers_part_01_1.conflictResolutionMaintenanceScopeMetadata)(groupId),
        entries,
        notification_count: entries.length,
        new_notification_count: newCount,
        deduplicated_notification_count: deduplicatedCount,
        pinned_current_notification_ids: [...pinnedIds],
        pinned_current_notification_count: pinned.length,
        retention_policy: "pin_current_group_and_audience_state_then_keep_recent_terminal_notifications",
        updated_at: at,
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file, stateFingerprint };
}
function conflictResolutionMaintenanceRecommendation(generation = {}, quarantine = {}) {
    if (generation.valid !== true)
        return {
            severity: "critical",
            action: "recover_or_repair_manifest_generation",
            destructive: false,
            reason: `manifest generation invalid: ${(generation.gaps || []).join(",") || "unknown"}`,
        };
    if (Number(quarantine.protected_open_repair_count || 0) > 0)
        return {
            severity: "warn",
            action: "wait_for_open_repair_closure",
            destructive: false,
            reason: `orphan shards protected by open repairs=${quarantine.protected_open_repair_count}`,
        };
    if (Number(quarantine.eligible_count || 0) > 0)
        return {
            severity: "advisory",
            action: "request_explicit_gc_approval_receipt",
            destructive: false,
            reason: `eligible orphan shards=${quarantine.eligible_count}; background maintenance cannot authorize deletion`,
        };
    if (Number(quarantine.quarantined_count || 0) > 0)
        return {
            severity: "info",
            action: "continue_quarantine_grace_monitoring",
            destructive: false,
            reason: `quarantined orphan shards=${quarantine.quarantined_count}`,
        };
    return {
        severity: "ok",
        action: "continue_read_only_verification",
        destructive: false,
        reason: "manifest generations and cold shards verify; no destructive maintenance required",
    };
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options = {}) {
    return require("./group-memory-maintenance").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options);
}
function readConflictResolutionGcApprovalLedger(groupId) {
    const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
        updated_at: ledger.updated_at || "",
    };
}
function writeConflictResolutionGcApprovalLedger(groupId, entries, at) {
    const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupId);
    const open = entries.filter((entry) => entry.consumed !== true && entry.revoked !== true);
    const terminal = entries.filter((entry) => entry.consumed === true || entry.revoked === true).slice(-160);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: [...open, ...terminal],
        open_receipt_count: open.length,
        consumed_receipt_count: terminal.filter((entry) => entry.consumed === true).length,
        updated_at: at,
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options = {}) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options);
}
function listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds(groupIds = [], options = {}) {
    return require("./group-memory-maintenance").listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds(groupIds, options);
}
function runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupIds = [], options = {}) {
    return require("./group-memory-maintenance").runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupIds, options);
}
function loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId) {
    const manifest = (0, typed_memory_index_build_1.readConflictResolutionColdArchiveManifest)(groupId);
    if (!manifest)
        return [];
    const verification = (0, typed_memory_ledgers_part_01_1.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive)(groupId, { includeRows: true });
    if (!verification.valid)
        throw new Error(`conflict-resolution cold archive verification failed: ${(verification.gaps || []).join(",")}`);
    return verification.rows || [];
}
function writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, inputRows = [], options = {}) {
    const rows = [...inputRows]
        .filter((row) => String(row.typed_scope_id || row.group_id || "") === groupId && row.row_id)
        .sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || "")));
    const currentManifest = (0, typed_memory_index_build_1.readConflictResolutionColdArchiveManifest)(groupId);
    if (currentManifest) {
        const currentVerification = (0, typed_memory_ledgers_part_01_1.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive)(groupId, {
            manifest: currentManifest,
            manifestFile: currentManifest.file,
        });
        if (!currentVerification.valid)
            throw new Error(`refusing to advance invalid conflict-resolution cold archive manifest: ${(currentVerification.gaps || []).join(",")}`);
        const currentGenerationFile = (0, typed_memory_index_build_1.getConflictResolutionColdArchiveManifestGenerationFile)(groupId, currentManifest.manifest_checksum);
        if (fs.existsSync(currentGenerationFile)) {
            const existingGeneration = (0, typed_memory_shared_1.readJson)(currentGenerationFile, null);
            if (!existingGeneration || existingGeneration.manifest_checksum !== currentManifest.manifest_checksum
                || (0, typed_memory_index_build_1.conflictResolutionColdArchiveManifestChecksum)(existingGeneration) !== currentManifest.manifest_checksum) {
                throw new Error(`existing conflict-resolution manifest generation is invalid: ${currentGenerationFile}`);
            }
        }
        else {
            const state = { ...currentManifest };
            delete state.file;
            (0, typed_memory_shared_1.writeJsonAtomic)(currentGenerationFile, state);
        }
    }
    const buckets = new Map();
    for (const row of rows) {
        const bucket = (0, typed_memory_shared_1.checksum)(String(row.row_id || ""), 1);
        buckets.set(bucket, [...(buckets.get(bucket) || []), row]);
    }
    const typedDir = (0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId);
    const descriptors = [];
    for (const [bucket, bucketRows] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const sortedRows = [...bucketRows].sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || "")));
        const contentChecksum = (0, typed_memory_shared_1.checksum)(sortedRows, 48);
        const relPath = path.posix.join(typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR, "shards", bucket, `${contentChecksum}.json`);
        const file = (0, typed_memory_ledgers_part_01_1.conflictResolutionColdArchiveShardFile)(groupId, relPath);
        const shard = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1",
            version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
            group_id: groupId,
            bucket,
            content_checksum: contentChecksum,
            row_count: sortedRows.length,
            rows: sortedRows,
            created_at: String(options.updatedAt || options.updated_at || (0, typed_memory_shared_1.now)()),
        };
        if (fs.existsSync(file)) {
            const existing = (0, typed_memory_shared_1.readJson)(file, null);
            if (!existing || (0, typed_memory_shared_1.checksum)(existing.rows || [], 48) !== contentChecksum || existing.content_checksum !== contentChecksum) {
                throw new Error(`refusing to overwrite invalid content-addressed conflict-resolution shard: ${file}`);
            }
        }
        else {
            (0, typed_memory_shared_1.writeJsonAtomic)(file, shard);
        }
        descriptors.push({
            shard_id: `conflict-resolution-shard:${bucket}:${contentChecksum}`,
            bucket,
            rel_path: path.relative(typedDir, file).split(path.sep).join("/"),
            content_checksum: contentChecksum,
            row_count: sortedRows.length,
            row_ids: sortedRows.map((row) => row.row_id),
            resolution_entry_ids: (0, typed_memory_shared_1.uniqueStrings)(sortedRows.map((row) => row.resolution_entry_id), sortedRows.length),
            task_family_keys: (0, typed_memory_shared_1.uniqueStrings)(sortedRows.map((row) => row.task_family_key), sortedRows.length),
            row_ids_checksum: (0, typed_memory_shared_1.checksum)(sortedRows.map((row) => row.row_id), 48),
        });
    }
    const generationNumber = currentManifest ? Math.max(1, Number(currentManifest.generation_number || 1)) + 1 : 1;
    const previousManifestChecksum = String(currentManifest?.manifest_checksum || "");
    const previousManifestFile = previousManifestChecksum
        ? (0, typed_memory_index_build_1.getConflictResolutionColdArchiveManifestGenerationFile)(groupId, previousManifestChecksum)
        : "";
    const manifest = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-manifest-v1",
        version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
        group_id: groupId,
        row_count: rows.length,
        hot_row_count: Math.min(rows.length, Number(options.hotRowLimit || options.hot_row_limit || typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT)),
        shard_count: descriptors.length,
        rows_checksum: (0, typed_memory_shared_1.checksum)(rows, 48),
        shards: descriptors,
        generation_number: generationNumber,
        generation_id: `conflict-resolution-cold-generation:${generationNumber}:${(0, typed_memory_shared_1.checksum)(rows, 16)}`,
        previous_manifest_checksum: previousManifestChecksum,
        previous_manifest_rel_path: previousManifestFile ? path.relative(typedDir, previousManifestFile).split(path.sep).join("/") : "",
        updated_at: String(options.updatedAt || options.updated_at || (0, typed_memory_shared_1.now)()),
    };
    manifest.manifest_checksum = (0, typed_memory_index_build_1.conflictResolutionColdArchiveManifestChecksum)(manifest);
    const file = (0, typed_memory_index_build_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile)(groupId);
    const generationFile = (0, typed_memory_index_build_1.getConflictResolutionColdArchiveManifestGenerationFile)(groupId, manifest.manifest_checksum);
    if (fs.existsSync(generationFile)) {
        const existing = (0, typed_memory_shared_1.readJson)(generationFile, null);
        if (!existing || existing.manifest_checksum !== manifest.manifest_checksum
            || (0, typed_memory_index_build_1.conflictResolutionColdArchiveManifestChecksum)(existing) !== manifest.manifest_checksum) {
            throw new Error(`refusing to overwrite invalid conflict-resolution manifest generation: ${generationFile}`);
        }
    }
    else {
        (0, typed_memory_shared_1.writeJsonAtomic)(generationFile, manifest);
    }
    (0, typed_memory_shared_1.writeJsonAtomic)(file, manifest);
    return { ...manifest, file, generation_file: generationFile };
}
function lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query = {}, options = {}) {
    return require("./group-memory-distillation").lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query, options);
}
function restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId, query = {}, options = {}) {
    return require("./group-memory-maintenance").restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId, query, options);
}
function readGroupTypedMemoryRecallLedger(groupId) {
    const file = (0, typed_memory_ledgers_part_01_1.getGroupTypedMemoryRecallLedgerFile)(groupId);
    const state = (0, typed_memory_shared_1.readJson)(file, { schema: "ccm-group-typed-memory-recall-ledger-v1", version: 1, scopes: {}, updatedAt: "" });
    return { ...state, scopes: state?.scopes && typeof state.scopes === "object" ? state.scopes : {}, file };
}
function typedMemoryConsumptionEntryChecksum(entry) {
    const fields = [
        entry.schema,
        entry.entry_id,
        entry.group_id,
        entry.target_project,
        entry.task_id,
        entry.execution_id,
        entry.task_agent_session_id,
        entry.memory_context_snapshot_id,
        entry.memory_context_snapshot_checksum,
        entry.delivery_receipt_checksum,
        entry.rel_path,
        entry.document_checksum,
        entry.usage_state,
        entry.current_source_verified === true,
        entry.query_concepts || [],
        entry.query_polarities || [],
        entry.query_relations || [],
        entry.receipt_evidence_checksum,
        entry.generated_at,
    ];
    if (Number(entry.version || 1) >= 2)
        fields.push(entry.observation_id, entry.agent_type, entry.claimed_usage_state, entry.evidence_tier, entry.evidence_confidence, entry.verification_status, entry.current_source_proof_valid === true, entry.current_source_relative_path, entry.current_source_claimed_checksum, entry.current_source_observed_checksum, entry.current_source_proof_id, entry.anomaly_codes || []);
    if (Number(entry.version || 1) >= 3)
        fields.push(entry.lifecycle_state, entry.delivery_state, entry.access_state, entry.access_event_count, entry.access_evidence_checksum, entry.access_event_checksums || [], entry.access_capture_status, entry.access_evidence_valid === true);
    return (0, typed_memory_shared_1.checksum)(fields, 64);
}
function typedMemoryConsumptionLedgerChecksum(entries, updatedAt) {
    return (0, typed_memory_shared_1.checksum)([1, entries.map(entry => entry.checksum || ""), updatedAt], 64);
}
function resolveGroupTypedMemoryConsumptionScopeId(groupId) {
    const requested = String(groupId || "").trim();
    if (!requested || /--gcs_[a-zA-Z0-9._-]+$/.test(requested))
        return requested;
    try {
        const manifestFile = path.join(utils_1.CCM_DIR, "group-messages", "sessions", (0, typed_memory_shared_1.safeSegment)(requested), "manifest.json");
        const manifest = (0, typed_memory_shared_1.readJson)(manifestFile, null);
        const activeSessionId = String(manifest?.activeSessionId || manifest?.active_session_id || "").trim();
        const activeRecord = (Array.isArray(manifest?.sessions) ? manifest.sessions : [])
            .find((row) => String(row?.id || "").trim() === activeSessionId);
        if (/^gcs_[a-zA-Z0-9._-]+$/.test(activeSessionId) && activeRecord && activeRecord.archived !== true) {
            return `${requested}--${activeSessionId}`;
        }
    }
    catch { }
    try {
        const activeSessionId = String(require("./storage").getActiveGroupChatSessionId(requested) || "default").trim();
        if (/^gcs_[a-zA-Z0-9._-]+$/.test(activeSessionId))
            return `${requested}--${activeSessionId}`;
    }
    catch { }
    return requested;
}
function readGroupTypedMemoryConsumptionLedger(groupId) {
    const requestedGroupId = String(groupId || "").trim();
    const scopedGroupId = resolveGroupTypedMemoryConsumptionScopeId(requestedGroupId);
    const file = (0, typed_memory_ledgers_part_01_1.getGroupTypedMemoryConsumptionLedgerFile)(scopedGroupId);
    const state = (0, typed_memory_shared_1.readJson)(file, {
        schema: "ccm-group-typed-memory-consumption-ledger-v1",
        version: 1,
        group_id: scopedGroupId,
        entries: [],
        updated_at: "",
        checksum: "",
    });
    const rawEntries = Array.isArray(state.entries) ? state.entries : [];
    const updatedAt = String(state.updated_at || state.updatedAt || "");
    const declaredLedgerChecksum = String(state.checksum || "");
    const computedLedgerChecksum = typedMemoryConsumptionLedgerChecksum(rawEntries, updatedAt);
    const ledgerChecksumValid = rawEntries.length === 0 && !declaredLedgerChecksum
        ? true
        : !!declaredLedgerChecksum && declaredLedgerChecksum === computedLedgerChecksum;
    const entryChecks = rawEntries.map((entry) => ({
        entry,
        valid: String(entry?.checksum || "") === typedMemoryConsumptionEntryChecksum(entry || {}),
    }));
    const validEntries = ledgerChecksumValid ? entryChecks.filter(row => row.valid).map(row => row.entry) : [];
    return {
        ...state,
        schema: "ccm-group-typed-memory-consumption-ledger-v1",
        version: 1,
        group_id: scopedGroupId,
        requested_group_id: requestedGroupId,
        session_scope_redirected: scopedGroupId !== requestedGroupId,
        entries: validEntries,
        raw_entry_count: rawEntries.length,
        valid_entry_count: validEntries.length,
        invalid_entry_count: entryChecks.filter(row => !row.valid).length,
        ledger_checksum_valid: ledgerChecksumValid,
        computed_checksum: computedLedgerChecksum,
        file,
    };
}
function normalizeTypedMemoryConsumptionUsageState(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/verified|validated|checked|current_source_verified|current source|re-read|核验|验证|当前源|已检查/.test(text))
        return "verified";
    if (/ignored|ignore|skip|unused|not_used|未使用|不使用|忽略|跳过/.test(text))
        return "ignored";
    if (/used|use|applied|referenced|consumed|使用|采用|应用|引用|参考/.test(text))
        return "used";
    if (/mentioned|surfaced|shown|presented|missing|提及|出现|下发|未声明/.test(text))
        return "mentioned";
    return "";
}
function typedMemoryConsumptionObservationId(groupId, row = {}, input = {}) {
    return `tmco_${(0, typed_memory_shared_1.checksum)([
        groupId,
        row.target_project || row.targetProject || input.targetProject || input.target_project || "",
        row.task_id || row.taskId || input.taskId || input.task_id || "",
        row.execution_id || row.executionId || input.executionId || input.execution_id || "",
        row.task_agent_session_id || row.taskAgentSessionId || "",
        row.memory_context_snapshot_id || row.memoryContextSnapshotId || "",
        String(row.rel_path || row.relPath || "").toLowerCase(),
        row.document_checksum || row.documentChecksum || "",
    ], 28)}`;
}
function typedMemoryConsumptionEvidenceConfidence(row, usageState, proofValid) {
    if (proofValid && usageState === "verified")
        return 1;
    const directReference = row.direct_reference === true || row.directReference === true;
    const tier = String(row.evidence_tier || row.evidenceTier || "").trim();
    const ceiling = tier === "system_current_source_file_proof"
        ? 1
        : directReference || tier === "bound_structured_receipt"
            ? 0.75
            : tier === "bound_text_receipt"
                ? 0.5
                : 0.4;
    const requested = Number(row.evidence_confidence ?? row.evidenceConfidence ?? ceiling);
    return (0, typed_memory_recall_1.roundSemanticRecallScore)(Math.max(0, Math.min(ceiling, Number.isFinite(requested) ? requested : ceiling)), 4);
}
//# sourceMappingURL=typed-memory-ledgers-part-03.js.map