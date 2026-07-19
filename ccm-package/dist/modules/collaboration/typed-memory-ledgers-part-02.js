"use strict";
// Behavior-freeze split from typed-memory-ledgers.ts (part 2/4).
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
exports.writeConflictResolutionMaintenanceNotificationDeliveryQuarantine = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine;
exports.conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum;
exports.cleanupLeaseProcessAlive = cleanupLeaseProcessAlive;
exports.inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease = inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle = writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle;
exports.acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease = acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.cleanupLeaseHeld = cleanupLeaseHeld;
exports.renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease = renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease = releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.abandonConflictResolutionMaintenanceNotificationDeliveryCleanupLease = abandonConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.attachConflictResolutionMaintenanceNotificationDeliveryCleanupLease = attachConflictResolutionMaintenanceNotificationDeliveryCleanupLease;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum;
exports.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedgerChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedgerChecksum;
exports.writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger = writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger;
exports.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupCommitCompactChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitCompactChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedgerChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedgerChecksum;
exports.readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger;
exports.upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit;
exports.cleanupCommitPhaseRank = cleanupCommitPhaseRank;
exports.maybeInterruptCleanupCommit = maybeInterruptCleanupCommit;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile;
exports.cleanupCommitTransactionLinkGaps = cleanupCommitTransactionLinkGaps;
exports.writeCleanupCommitDiscoveryArtifacts = writeCleanupCommitDiscoveryArtifacts;
exports.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile;
exports.cleanupCommitRepairItemChecksum = cleanupCommitRepairItemChecksum;
exports.cleanupCommitRepairEvidenceChecksum = cleanupCommitRepairEvidenceChecksum;
exports.cleanupCommitRepairBriefChecksum = cleanupCommitRepairBriefChecksum;
exports.cleanupCommitRepairAssignmentChecksum = cleanupCommitRepairAssignmentChecksum;
exports.cleanupCommitRepairLedgerValid = cleanupCommitRepairLedgerValid;
exports.writeCleanupCommitRepairWorkItems = writeCleanupCommitRepairWorkItems;
exports.writeCleanupCommitRepairBriefs = writeCleanupCommitRepairBriefs;
exports.writeCleanupCommitRepairAssignments = writeCleanupCommitRepairAssignments;
exports.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem = updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem;
exports.cleanupCommitRepairResolutionTransactionPhaseRank = cleanupCommitRepairResolutionTransactionPhaseRank;
exports.cleanupCommitRepairResolutionTransactionChecksum = cleanupCommitRepairResolutionTransactionChecksum;
exports.cleanupCommitRepairResolutionTransactionCompactChecksum = cleanupCommitRepairResolutionTransactionCompactChecksum;
exports.cleanupCommitRepairResolutionTransactionLedgerChecksum = cleanupCommitRepairResolutionTransactionLedgerChecksum;
exports.readCleanupCommitRepairResolutionTransactionLedger = readCleanupCommitRepairResolutionTransactionLedger;
exports.upsertCleanupCommitRepairResolutionTransaction = upsertCleanupCommitRepairResolutionTransaction;
exports.cleanupCommitRepairTargetSnapshots = cleanupCommitRepairTargetSnapshots;
exports.cleanupCommitRepairTargetSnapshotsMatch = cleanupCommitRepairTargetSnapshotsMatch;
exports.maybeInterruptCleanupCommitRepairResolution = maybeInterruptCleanupCommitRepairResolution;
exports.assertNoConflictingCleanupCommitRepairResolutionTransaction = assertNoConflictingCleanupCommitRepairResolutionTransaction;
exports.validateCleanupCommitRepairResolutionEvidence = validateCleanupCommitRepairResolutionEvidence;
exports.prepareCleanupCommitRepairResolutionTransaction = prepareCleanupCommitRepairResolutionTransaction;
exports.advanceCleanupCommitRepairResolutionTransaction = advanceCleanupCommitRepairResolutionTransaction;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.cleanupCommitRepairResolutionTransactionLinkGaps = cleanupCommitRepairResolutionTransactionLinkGaps;
exports.cleanupCommitRepairResolutionTransactionArtifactChecksum = cleanupCommitRepairResolutionTransactionArtifactChecksum;
exports.cleanupCommitRepairResolutionTransactionArtifactLedgerValid = cleanupCommitRepairResolutionTransactionArtifactLedgerValid;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_ledgers_part_01_1 = require("./typed-memory-ledgers-part-01");
function writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, at, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const file = (0, typed_memory_ledgers_part_01_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile)(groupId);
        const current = (0, typed_memory_shared_1.readJson)(file, {});
        const expectedChecksum = options.expectedQuarantineChecksum;
        if (expectedChecksum !== undefined && String(current.quarantine_checksum || "") !== String(expectedChecksum || "")) {
            throw new Error("cleanup_quarantine_revision_conflict");
        }
        const retained = (0, typed_memory_ledgers_part_01_1.retainConflictResolutionMaintenanceNotificationDeliveryQuarantine)(groupId, entries, Array.isArray(options.compactedEntries) ? options.compactedEntries : [], at, options);
        const value = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1",
            version: 1,
            group_id: groupId,
            revision: Number(current.revision || 0) + 1,
            previous_quarantine_checksum: current.quarantine_checksum || "",
            entries: retained.entries,
            compacted_entries: retained.compacted_entries,
            quarantine_count: retained.entries.length,
            compacted_quarantine_count: retained.compacted_entries.reduce((sum, row) => sum + Number(row.cleaned_count || 0), 0),
            retention: retained.retention,
            updated_at: at,
        };
        value.quarantine_checksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(value);
        if (!(0, typed_memory_ledgers_part_01_1.cleanupGroupLedgerLockHeld)(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
        return { ...value, file };
    });
}
function conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(value = {}) {
    const payload = {
        group_id: value.group_id || "",
        entries: (value.entries || []).map((row) => ({
            quarantine_id: row.quarantine_id || "",
            content_checksum: row.content_checksum || "",
            reason: row.reason || "",
            status: row.status || "",
        })),
    };
    if (Array.isArray(value.compacted_entries) && value.compacted_entries.length) {
        payload.compacted_entries = value.compacted_entries.map((row) => ({ compact_id: row.compact_id || "", compact_checksum: row.compact_checksum || "" }));
    }
    if (Number(value.revision || 0) > 0)
        Object.assign(payload, {
            revision: Number(value.revision || 0),
            previous_quarantine_checksum: value.previous_quarantine_checksum || "",
        });
    return (0, typed_memory_shared_1.checksum)(payload, 48);
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId, options = {}) {
    return require("./group-memory-maintenance").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId, receiptId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId, receiptId);
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum(lease = {}) {
    return (0, typed_memory_shared_1.checksum)({
        lease_id: lease.lease_id || "",
        execution_id: lease.execution_id || "",
        group_id: lease.group_id || "",
        receipt_id: lease.receipt_id || "",
        owner_instance_id: lease.owner_instance_id || "",
        owner_pid: Number(lease.owner_pid || 0),
        owner_hostname: lease.owner_hostname || "",
        owner_role: lease.owner_role || "",
        fencing_token: Number(lease.fencing_token || 0),
        recovery_count: Number(lease.recovery_count || 0),
        status: lease.status || "",
        acquired_at: lease.acquired_at || "",
        renewed_at: lease.renewed_at || "",
        expires_at: lease.expires_at || "",
        released_at: lease.released_at || "",
        final_status: lease.final_status || "",
    }, 48);
}
function cleanupLeaseProcessAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, receiptId, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId, receiptId);
    const lease = (0, typed_memory_shared_1.readJson)(file, null);
    if (!lease)
        return { file, present: false, valid: true, active: false, abandoned: false, lease: null };
    const checksumValid = lease.lease_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum(lease);
    const identityValid = lease.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-lease-v1"
        && String(lease.group_id || "") === groupId
        && String(lease.receipt_id || "") === receiptId
        && Number(lease.fencing_token || 0) > 0;
    const atMs = Date.parse(at);
    const expiresAtMs = Date.parse(String(lease.expires_at || ""));
    const ownerLocal = String(lease.owner_hostname || "") === os.hostname();
    const ownerAlive = !ownerLocal || cleanupLeaseProcessAlive(Number(lease.owner_pid || 0));
    const unexpired = Number.isFinite(atMs) && Number.isFinite(expiresAtMs) && atMs < expiresAtMs;
    const active = checksumValid && identityValid && lease.status === "active" && unexpired && ownerAlive;
    return {
        file,
        present: true,
        valid: checksumValid && identityValid,
        checksum_valid: checksumValid,
        identity_valid: identityValid,
        active,
        abandoned: checksumValid && identityValid && lease.status === "active" && !active,
        expired: Number.isFinite(atMs) && Number.isFinite(expiresAtMs) ? atMs >= expiresAtMs : true,
        owner_alive: ownerAlive,
        lease,
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle(handle, leaseInput) {
    const lease = { ...leaseInput };
    lease.lease_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum(lease);
    const payload = JSON.stringify(lease, null, 2);
    fs.ftruncateSync(handle.fd, 0);
    fs.writeSync(handle.fd, payload, 0, "utf-8");
    fs.fsyncSync(handle.fd);
    handle.lease = lease;
    return lease;
}
function acquireConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, receiptId, executionId, options = {}) {
    const at = String(options.at || (0, typed_memory_shared_1.now)());
    const atMs = Date.parse(at);
    const effectiveAtMs = Number.isFinite(atMs) ? atMs : Date.now();
    const ttlMs = Math.max(5_000, Math.min(typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTION_LEASE_MAX_TTL_MS, Number(options.ttlMs || typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTION_LEASE_TTL_MS)));
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId, receiptId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let previous = null;
    for (let attempt = 0; attempt < 4; attempt++) {
        const status = inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, receiptId, at);
        if (status.present) {
            if (!status.valid)
                return { acquired: false, reason: "cleanup_execution_lease_invalid", status };
            if (status.active)
                return { acquired: false, reason: "cleanup_execution_lease_busy", status };
            previous = status.lease;
            const abandonedFile = `${file}.abandoned.${(0, typed_memory_shared_1.checksum)(previous.lease_id || String(Date.now()), 16)}.${crypto.randomBytes(3).toString("hex")}`;
            try {
                fs.renameSync(file, abandonedFile);
            }
            catch {
                if (fs.existsSync(file))
                    continue;
            }
        }
        let fd = -1;
        try {
            fd = fs.openSync(file, "wx+");
            const recovered = previous?.status === "active";
            const lease = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-lease-v1",
                version: 1,
                lease_id: `delivery-cleanup-lease:${(0, typed_memory_shared_1.checksum)([groupId, receiptId, executionId, effectiveAtMs, crypto.randomBytes(8).toString("hex")], 32)}`,
                execution_id: executionId,
                group_id: groupId,
                receipt_id: receiptId,
                owner_instance_id: String(options.ownerInstanceId || `${typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID}:${crypto.randomBytes(4).toString("hex")}`),
                owner_pid: Number(options.ownerPid || process.pid),
                owner_hostname: String(options.ownerHostname || os.hostname()),
                owner_role: String(options.ownerRole || "explicit-executor"),
                fencing_token: Math.max(1, Number(previous?.fencing_token || 0) + 1),
                recovery_count: Number(previous?.recovery_count || 0) + (recovered ? 1 : 0),
                status: "active",
                acquired_at: at,
                renewed_at: at,
                expires_at: new Date(effectiveAtMs + ttlMs).toISOString(),
                released_at: "",
                final_status: "",
            };
            const handle = { fd, file, lease, ttlMs, released: false, acquiredWallMs: Date.now(), acquiredLogicalMs: effectiveAtMs };
            writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle(handle, lease);
            const prunedHistoryCount = (0, typed_memory_ledgers_part_01_1.pruneCleanupMetadataArchives)(path.dirname(file), `${path.basename(file)}.abandoned.`, 16);
            handle.prunedHistoryCount = prunedHistoryCount;
            return { acquired: true, recovered, previous_lease: previous, pruned_history_count: prunedHistoryCount, handle, lease: handle.lease, status: inspectConflictResolutionMaintenanceNotificationDeliveryCleanupLease(groupId, receiptId, at) };
        }
        catch (error) {
            if (fd >= 0)
                try {
                    fs.closeSync(fd);
                }
                catch { }
            if (error?.code === "EEXIST")
                continue;
            return { acquired: false, reason: "cleanup_execution_lease_acquire_failed", error: String(error?.message || error) };
        }
    }
    return { acquired: false, reason: "cleanup_execution_lease_contended" };
}
function cleanupLeaseHeld(handle) {
    if (!handle || handle.released === true || Number(handle.fd) < 0)
        return false;
    const current = (0, typed_memory_shared_1.readJson)(handle.file, null);
    return !!current
        && current.lease_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupLeaseChecksum(current)
        && current.status === "active"
        && current.lease_id === handle.lease.lease_id
        && Number(current.fencing_token || 0) === Number(handle.lease.fencing_token || 0);
}
function renewConflictResolutionMaintenanceNotificationDeliveryCleanupLease(handle) {
    if (!cleanupLeaseHeld(handle))
        return false;
    const elapsedMs = Math.max(0, Date.now() - Number(handle.acquiredWallMs || Date.now()));
    const logicalNowMs = Number(handle.acquiredLogicalMs || Date.now()) + elapsedMs;
    writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle(handle, {
        ...handle.lease,
        status: "active",
        renewed_at: new Date(logicalNowMs).toISOString(),
        expires_at: new Date(logicalNowMs + Number(handle.ttlMs || typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTION_LEASE_TTL_MS)).toISOString(),
    });
    return cleanupLeaseHeld(handle);
}
function releaseConflictResolutionMaintenanceNotificationDeliveryCleanupLease(handle, at, finalStatus) {
    if (!handle || handle.released === true)
        return false;
    let released = false;
    try {
        if (cleanupLeaseHeld(handle)) {
            writeConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseHandle(handle, {
                ...handle.lease,
                status: "released",
                released_at: at,
                final_status: finalStatus,
                expires_at: "",
            });
            released = true;
        }
    }
    finally {
        try {
            fs.closeSync(handle.fd);
        }
        catch { }
        handle.released = true;
        handle.fd = -1;
    }
    return released;
}
function abandonConflictResolutionMaintenanceNotificationDeliveryCleanupLease(handle) {
    if (!handle || handle.released === true)
        return;
    try {
        fs.closeSync(handle.fd);
    }
    catch { }
    handle.released = true;
    handle.fd = -1;
}
function attachConflictResolutionMaintenanceNotificationDeliveryCleanupLease(journal, lease, leaseStatus = "active", at = "") {
    return {
        ...journal,
        lease_contract_version: 1,
        lease_id: lease.lease_id,
        lease_owner_instance_id: lease.owner_instance_id,
        lease_owner_pid: Number(lease.owner_pid || 0),
        lease_owner_hostname: lease.owner_hostname,
        lease_fencing_token: Number(lease.fencing_token || 0),
        lease_recovery_count: Number(lease.recovery_count || 0),
        lease_acquired_at: lease.acquired_at,
        lease_expires_at: lease.expires_at,
        lease_status: leaseStatus,
        lease_released_at: leaseStatus === "released" ? at : "",
    };
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal = {}) {
    const value = {
        execution_id: journal.execution_id || "",
        group_id: journal.group_id || "",
        receipt_id: journal.receipt_id || "",
        receipt_checksum: journal.receipt_checksum || "",
        quarantine_checksum: journal.quarantine_checksum || "",
        current_ledger_checksum: journal.current_ledger_checksum || "",
        previous_ledger_checksum: journal.previous_ledger_checksum || "",
        latest_recovery_proof_id: journal.latest_recovery_proof_id || "",
        status: journal.status || "",
        candidates: (journal.candidates || []).map((candidate) => ({
            quarantine_id: candidate.quarantine_id || "",
            target_path: candidate.target_path || "",
            target_kind: candidate.target_kind || "",
            target_content_checksum: candidate.target_content_checksum || "",
            status: candidate.status || "",
            intent_at: candidate.intent_at || "",
            deleted_at: candidate.deleted_at || "",
        })),
        started_at: journal.started_at || "",
        updated_at: journal.updated_at || "",
        completed_at: journal.completed_at || "",
    };
    if (Number(journal.lease_contract_version || 0) > 0)
        Object.assign(value, {
            lease_contract_version: Number(journal.lease_contract_version || 0),
            lease_id: journal.lease_id || "",
            lease_owner_instance_id: journal.lease_owner_instance_id || "",
            lease_owner_pid: Number(journal.lease_owner_pid || 0),
            lease_owner_hostname: journal.lease_owner_hostname || "",
            lease_fencing_token: Number(journal.lease_fencing_token || 0),
            lease_recovery_count: Number(journal.lease_recovery_count || 0),
            lease_acquired_at: journal.lease_acquired_at || "",
            lease_expires_at: journal.lease_expires_at || "",
            lease_status: journal.lease_status || "",
            lease_released_at: journal.lease_released_at || "",
        });
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const revision = Number(ledger.revision || 0);
    const ledgerChecksum = String(ledger.ledger_checksum || "");
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        revision,
        previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
        ledger_checksum: ledgerChecksum,
        ledger_checksum_valid: (!ledgerChecksum && revision === 0) || (!!ledgerChecksum && ledgerChecksum === conflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedgerChecksum(ledger)),
        file,
    };
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedgerChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        group_id: value.group_id || "",
        revision: Number(value.revision || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({
            execution_id: entry.execution_id || "",
            receipt_id: entry.receipt_id || "",
            journal_checksum: entry.journal_checksum || "",
            status: entry.status || "",
            lease_fencing_token: Number(entry.lease_fencing_token || 0),
        })),
    }, 48);
}
function writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId, entries, at, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId);
        const current = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
        if (!current.ledger_checksum_valid)
            throw new Error("cleanup_journal_ledger_checksum_invalid");
        if (options.expectedRevision !== undefined && Number(options.expectedRevision) !== Number(current.revision || 0))
            throw new Error("cleanup_journal_ledger_revision_conflict");
        if (options.expectedLedgerChecksum !== undefined && String(options.expectedLedgerChecksum || "") !== String(current.ledger_checksum || ""))
            throw new Error("cleanup_journal_ledger_revision_conflict");
        const open = entries.filter((entry) => entry.status !== "completed" && entry.status !== "cancelled");
        const terminal = entries.filter((entry) => entry.status === "completed" || entry.status === "cancelled").slice(-160);
        const value = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-ledger-v1",
            version: 1,
            group_id: groupId,
            revision: Number(current.revision || 0) + 1,
            previous_ledger_checksum: current.ledger_checksum || "",
            entries: [...open, ...terminal],
            open_journal_count: open.length,
            completed_journal_count: terminal.filter((entry) => entry.status === "completed").length,
            updated_at: at,
        };
        value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedgerChecksum(value);
        if (!(0, typed_memory_ledgers_part_01_1.cleanupGroupLedgerLockHeld)(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
        return { ...value, file };
    });
}
function upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
        if (!ledger.ledger_checksum_valid)
            throw new Error("cleanup_journal_ledger_checksum_invalid");
        const leaseHandle = options.leaseHandle || null;
        if (leaseHandle && !cleanupLeaseHeld(leaseHandle))
            throw new Error("cleanup_execution_lease_lost");
        const current = ledger.entries.find((entry) => entry.execution_id === journal.execution_id) || null;
        if (leaseHandle && Number(current?.lease_fencing_token || 0) > Number(leaseHandle.lease.fencing_token || 0)) {
            throw new Error("cleanup_execution_fencing_token_stale");
        }
        const candidateIds = new Set((journal.candidates || []).map((candidate) => String(candidate.quarantine_id || "")).filter(Boolean));
        const conflictingJournal = ledger.entries.find((entry) => entry.execution_id !== journal.execution_id
            && entry.status !== "cancelled"
            && (entry.candidates || []).some((candidate) => candidateIds.has(String(candidate.quarantine_id || ""))));
        if (conflictingJournal)
            throw new Error("cleanup_candidate_claim_conflict");
        let normalized = { ...journal, updated_at: at };
        if (leaseHandle)
            normalized = attachConflictResolutionMaintenanceNotificationDeliveryCleanupLease(normalized, leaseHandle.lease, options.leaseStatus || "active", at);
        normalized.journal_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(normalized);
        if (leaseHandle && !cleanupLeaseHeld(leaseHandle))
            throw new Error("cleanup_execution_lease_lost");
        const entries = [...ledger.entries.filter((entry) => entry.execution_id !== normalized.execution_id), normalized];
        writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId, entries, at, {
            ...options,
            groupLedgerLockHandle,
            expectedRevision: ledger.revision,
            expectedLedgerChecksum: ledger.ledger_checksum,
        });
        return normalized;
    });
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId);
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(transaction = {}) {
    return (0, typed_memory_shared_1.checksum)({
        transaction_id: transaction.transaction_id || "",
        group_id: transaction.group_id || "",
        receipt_id: transaction.receipt_id || "",
        execution_id: transaction.execution_id || "",
        receipt_checksum: transaction.receipt_checksum || "",
        candidate_ids_root: transaction.candidate_ids_root || "",
        initial_fencing_token: Number(transaction.initial_fencing_token || 0),
        latest_fencing_token: Number(transaction.latest_fencing_token || 0),
        recovery_count: Number(transaction.recovery_count || 0),
        phase: transaction.phase || "",
        status: transaction.status || "",
        before: transaction.before || {},
        quarantine_commit: transaction.quarantine_commit || {},
        receipt_commit: transaction.receipt_commit || {},
        journal_commit: transaction.journal_commit || {},
        started_at: transaction.started_at || "",
        updated_at: transaction.updated_at || "",
        completed_at: transaction.completed_at || "",
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupCommitCompactChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        group_id: value.group_id || "",
        compacted_count: Number(value.compacted_count || 0),
        transaction_ids_root: value.transaction_ids_root || "",
        transaction_checksums_root: value.transaction_checksums_root || "",
        first_completed_at: value.first_completed_at || "",
        last_completed_at: value.last_completed_at || "",
        generation: Number(value.generation || 0),
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedgerChecksum(value = {}) {
    const payload = {
        group_id: value.group_id || "",
        revision: Number(value.revision || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({
            transaction_id: entry.transaction_id || "",
            execution_id: entry.execution_id || "",
            phase: entry.phase || "",
            status: entry.status || "",
            transaction_checksum: entry.transaction_checksum || "",
        })),
    };
    if (value.compacted_history?.compact_checksum)
        payload.compacted_history_checksum = value.compacted_history.compact_checksum;
    return (0, typed_memory_shared_1.checksum)(payload, 48);
}
function readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const revision = Number(ledger.revision || 0);
    const ledgerChecksum = String(ledger.ledger_checksum || "");
    const compactedHistory = ledger.compacted_history || null;
    const compactedHistoryValid = !compactedHistory || compactedHistory.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupCommitCompactChecksum(compactedHistory);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-ledger-v1",
        version: 1,
        group_id: groupId,
        revision,
        previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
        ledger_checksum: ledgerChecksum,
        ledger_checksum_valid: (((!ledgerChecksum && revision === 0) || (!!ledgerChecksum && ledgerChecksum === conflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedgerChecksum(ledger))) && compactedHistoryValid),
        compacted_history: compactedHistory,
        compacted_history_valid: compactedHistoryValid,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
    };
}
function upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, transactionInput, at, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
        if (!ledger.ledger_checksum_valid)
            throw new Error("cleanup_commit_ledger_checksum_invalid");
        const current = ledger.entries.find((entry) => entry.transaction_id === transactionInput.transaction_id) || null;
        if (current && current.transaction_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(current))
            throw new Error("cleanup_commit_checksum_invalid");
        const transaction = { ...transactionInput, updated_at: at };
        transaction.transaction_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(transaction);
        const all = [...ledger.entries.filter((entry) => entry.transaction_id !== transaction.transaction_id), transaction];
        const open = all.filter((entry) => entry.status !== "completed" && entry.status !== "cancelled");
        const terminalAll = all.filter((entry) => entry.status === "completed" || entry.status === "cancelled");
        const terminalLimit = Math.max(4, Math.min(500, Number(options.commitTerminalLimit || options.commit_terminal_limit || 160)));
        const dropped = terminalAll.slice(0, Math.max(0, terminalAll.length - terminalLimit));
        const terminal = terminalAll.slice(-terminalLimit);
        let compactedHistory = ledger.compacted_history || null;
        if (dropped.length > 0) {
            const completedTimes = dropped.map((entry) => entry.completed_at).filter(Boolean).sort();
            compactedHistory = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-compact-v1",
                version: 1,
                group_id: groupId,
                compacted_count: Number(compactedHistory?.compacted_count || 0) + dropped.length,
                transaction_ids_root: (0, typed_memory_shared_1.checksum)([compactedHistory?.transaction_ids_root || "", dropped.map((entry) => entry.transaction_id).sort()], 48),
                transaction_checksums_root: (0, typed_memory_shared_1.checksum)([compactedHistory?.transaction_checksums_root || "", dropped.map((entry) => entry.transaction_checksum).sort()], 48),
                first_completed_at: [compactedHistory?.first_completed_at, ...completedTimes].filter(Boolean).sort()[0] || at,
                last_completed_at: [compactedHistory?.last_completed_at, ...completedTimes].filter(Boolean).sort().slice(-1)[0] || at,
                generation: Number(compactedHistory?.generation || 0) + 1,
                compacted_at: at,
            };
            compactedHistory.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitCompactChecksum(compactedHistory);
        }
        const value = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-ledger-v1",
            version: 1,
            group_id: groupId,
            revision: Number(ledger.revision || 0) + 1,
            previous_ledger_checksum: ledger.ledger_checksum || "",
            entries: [...open, ...terminal],
            compacted_history: compactedHistory,
            open_transaction_count: open.length,
            completed_transaction_count: terminal.filter((entry) => entry.status === "completed").length,
            compacted_transaction_count: Number(compactedHistory?.compacted_count || 0),
            updated_at: at,
        };
        value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedgerChecksum(value);
        if (!(0, typed_memory_ledgers_part_01_1.cleanupGroupLedgerLockHeld)(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, value);
        return { transaction, ledger: { ...value, file: ledger.file } };
    });
}
function cleanupCommitPhaseRank(phase) {
    return { prepared: 1, quarantine_committed: 2, receipt_committed: 3, journal_committed: 4, completed: 5 }[phase] || 0;
}
function maybeInterruptCleanupCommit(options, phase) {
    const requested = String(options.simulateCommitCrashAfter || options.simulate_commit_crash_after || "").trim().toLowerCase();
    if (requested === phase || requested === phase.replace(/_committed$/, "")) {
        throw new Error(`simulated_cleanup_commit_interruption_after_${phase}`);
    }
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
}
function cleanupCommitTransactionLinkGaps(groupId, transaction, commitLedger, receiptLedger, journalLedger) {
    const gaps = [];
    if (!commitLedger.ledger_checksum_valid)
        gaps.push("commit_ledger_checksum_invalid");
    if (transaction.transaction_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(transaction))
        gaps.push("transaction_checksum_invalid");
    if (String(transaction.group_id || "") !== groupId)
        gaps.push("transaction_group_mismatch");
    if (cleanupCommitPhaseRank(String(transaction.phase || "")) === 0)
        gaps.push("transaction_phase_invalid");
    const receipt = receiptLedger.entries.find((entry) => entry.receipt_id === transaction.receipt_id) || null;
    const journal = journalLedger.entries.find((entry) => entry.execution_id === transaction.execution_id) || null;
    if (!receipt)
        gaps.push("transaction_receipt_missing");
    else {
        if (String(receipt.group_id || "") !== groupId)
            gaps.push("transaction_receipt_group_mismatch");
        if (receipt.receipt_checksum !== (0, typed_memory_distillation_receipts_1.conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum)(receipt))
            gaps.push("transaction_receipt_checksum_invalid");
        if (transaction.receipt_checksum !== receipt.receipt_checksum)
            gaps.push("transaction_receipt_checksum_mismatch");
    }
    if (!journal)
        gaps.push("transaction_journal_missing");
    else {
        if (String(journal.group_id || "") !== groupId)
            gaps.push("transaction_journal_group_mismatch");
        if (journal.journal_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal))
            gaps.push("transaction_journal_checksum_invalid");
        if (journal.receipt_id !== transaction.receipt_id)
            gaps.push("transaction_journal_receipt_mismatch");
        const candidateIdsRoot = (0, typed_memory_shared_1.checksum)((journal.candidates || []).map((candidate) => String(candidate.quarantine_id || "")).filter(Boolean).sort(), 48);
        if (candidateIdsRoot !== transaction.candidate_ids_root)
            gaps.push("transaction_candidate_root_mismatch");
    }
    if (!receiptLedger.ledger_checksum_valid)
        gaps.push("receipt_ledger_checksum_invalid");
    if (!journalLedger.ledger_checksum_valid)
        gaps.push("journal_ledger_checksum_invalid");
    return { gaps: (0, typed_memory_shared_1.uniqueStrings)(gaps, 40), receipt, journal };
}
function writeCleanupCommitDiscoveryArtifacts(groupId, invalidRows, at) {
    return require("./group-memory-maintenance").writeCleanupCommitDiscoveryArtifacts(groupId, invalidRows, at);
}
function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, options = {}) {
    return require("./group-memory-maintenance").discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, options);
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery(groupIds = [], options = {}) {
    return require("./group-memory-maintenance").runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery(groupIds, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId);
}
function cleanupCommitRepairItemChecksum(item = {}) {
    const { work_item_checksum, ...value } = item;
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function cleanupCommitRepairEvidenceChecksum(evidence = {}) {
    const { evidence_checksum, ...value } = evidence;
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function cleanupCommitRepairBriefChecksum(brief = {}) {
    const { brief_checksum, ...value } = brief;
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function cleanupCommitRepairAssignmentChecksum(binding = {}) {
    const { binding_checksum, ...value } = binding;
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function cleanupCommitRepairLedgerValid(ledger, groupId, checksumField, entryChecksum) {
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    return String(ledger?.group_id || "") === groupId
        && entries.every((entry) => entry?.[checksumField] === entryChecksum(entry))
        && ledger?.ledger_checksum === (0, typed_memory_shared_1.checksum)(entries.map((entry) => entry?.[checksumField] || ""), 48);
}
function writeCleanupCommitRepairWorkItems(groupId, entries, at) {
    return require("./group-memory-maintenance").writeCleanupCommitRepairWorkItems(groupId, entries, at);
}
function writeCleanupCommitRepairBriefs(groupId, entries, at) {
    return require("./group-memory-maintenance").writeCleanupCommitRepairBriefs(groupId, entries, at);
}
function writeCleanupCommitRepairAssignments(groupId, entries, at) {
    return require("./group-memory-maintenance").writeCleanupCommitRepairAssignments(groupId, entries, at);
}
function updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupId, input = {}) {
    return require("./group-memory-maintenance").updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupId, input);
}
function cleanupCommitRepairResolutionTransactionPhaseRank(phase) {
    return { prepared: 1, work_item_committed: 2, brief_committed: 3, assignment_committed: 4, receipt_committed: 5, completed: 6 }[phase] || 0;
}
function cleanupCommitRepairResolutionTransactionChecksum(transaction = {}) {
    return (0, typed_memory_shared_1.checksum)({
        resolution_transaction_id: transaction.resolution_transaction_id || "",
        group_id: transaction.group_id || "",
        work_item_id: transaction.work_item_id || "",
        receipt_id: transaction.receipt_id || "",
        receipt_checksum: transaction.receipt_checksum || "",
        quarantine_evidence_checksum: transaction.quarantine_evidence_checksum || "",
        resolution_action: transaction.resolution_action || "",
        phase: transaction.phase || "",
        status: transaction.status || "",
        recovery_count: Number(transaction.recovery_count || 0),
        before: transaction.before || {},
        work_item_commit: transaction.work_item_commit || {},
        brief_commit: transaction.brief_commit || {},
        assignment_commit: transaction.assignment_commit || {},
        receipt_commit: transaction.receipt_commit || {},
        started_at: transaction.started_at || "",
        updated_at: transaction.updated_at || "",
        completed_at: transaction.completed_at || "",
    }, 48);
}
function cleanupCommitRepairResolutionTransactionCompactChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        group_id: value.group_id || "",
        compacted_count: Number(value.compacted_count || 0),
        transaction_ids_root: value.transaction_ids_root || "",
        transaction_checksums_root: value.transaction_checksums_root || "",
        first_completed_at: value.first_completed_at || "",
        last_completed_at: value.last_completed_at || "",
        generation: Number(value.generation || 0),
    }, 48);
}
function cleanupCommitRepairResolutionTransactionLedgerChecksum(ledger = {}) {
    const payload = {
        group_id: ledger.group_id || "",
        revision: Number(ledger.revision || 0),
        previous_ledger_checksum: ledger.previous_ledger_checksum || "",
        entries: (ledger.entries || []).map((entry) => ({
            resolution_transaction_id: entry.resolution_transaction_id || "",
            work_item_id: entry.work_item_id || "",
            receipt_id: entry.receipt_id || "",
            phase: entry.phase || "",
            status: entry.status || "",
            transaction_checksum: entry.transaction_checksum || "",
        })),
    };
    if (ledger.compacted_history?.compact_checksum)
        payload.compacted_history_checksum = ledger.compacted_history.compact_checksum;
    return (0, typed_memory_shared_1.checksum)(payload, 48);
}
function readCleanupCommitRepairResolutionTransactionLedger(groupId) {
    return require("./group-memory-maintenance").readCleanupCommitRepairResolutionTransactionLedger(groupId);
}
function upsertCleanupCommitRepairResolutionTransaction(groupId, transactionInput, at, options = {}) {
    return (0, typed_memory_ledgers_part_01_1.withCleanupGroupLedgerLock)(groupId, at, { ...options, ownerRole: options.ownerRole || "cleanup-commit-repair-resolution-transaction" }, groupLedgerLockHandle => {
        const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
        if (!ledger.ledger_checksum_valid)
            throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
        const current = ledger.entries.find((entry) => entry.resolution_transaction_id === transactionInput.resolution_transaction_id) || null;
        if (current) {
            if (current.transaction_checksum !== cleanupCommitRepairResolutionTransactionChecksum(current))
                throw new Error("cleanup commit repair resolution transaction checksum invalid");
            for (const field of ["group_id", "work_item_id", "receipt_id", "receipt_checksum", "quarantine_evidence_checksum", "resolution_action"]) {
                if (String(current[field] || "") !== String(transactionInput[field] || ""))
                    throw new Error("cleanup commit repair resolution transaction identity changed");
            }
            if (cleanupCommitRepairResolutionTransactionPhaseRank(transactionInput.phase) < cleanupCommitRepairResolutionTransactionPhaseRank(current.phase)) {
                throw new Error("cleanup commit repair resolution transaction phase regression");
            }
        }
        const transaction = { ...transactionInput, updated_at: at };
        transaction.transaction_checksum = cleanupCommitRepairResolutionTransactionChecksum(transaction);
        const all = [...ledger.entries.filter((entry) => entry.resolution_transaction_id !== transaction.resolution_transaction_id), transaction];
        const open = all.filter((entry) => entry.status !== "completed" && entry.status !== "cancelled");
        const terminalAll = all.filter((entry) => entry.status === "completed" || entry.status === "cancelled");
        const terminalLimit = Math.max(4, Math.min(500, Number(options.resolutionTransactionTerminalLimit || options.resolution_transaction_terminal_limit || 160)));
        const dropped = terminalAll.slice(0, Math.max(0, terminalAll.length - terminalLimit));
        const terminal = terminalAll.slice(-terminalLimit);
        let compactedHistory = ledger.compacted_history || null;
        if (dropped.length > 0) {
            const completedTimes = dropped.map((entry) => entry.completed_at).filter(Boolean).sort();
            compactedHistory = {
                schema: "ccm-cleanup-commit-repair-resolution-transaction-compact-v1",
                version: 1,
                group_id: groupId,
                compacted_count: Number(compactedHistory?.compacted_count || 0) + dropped.length,
                transaction_ids_root: (0, typed_memory_shared_1.checksum)([compactedHistory?.transaction_ids_root || "", dropped.map((entry) => entry.resolution_transaction_id).sort()], 48),
                transaction_checksums_root: (0, typed_memory_shared_1.checksum)([compactedHistory?.transaction_checksums_root || "", dropped.map((entry) => entry.transaction_checksum).sort()], 48),
                first_completed_at: [compactedHistory?.first_completed_at, ...completedTimes].filter(Boolean).sort()[0] || at,
                last_completed_at: [compactedHistory?.last_completed_at, ...completedTimes].filter(Boolean).sort().slice(-1)[0] || at,
                generation: Number(compactedHistory?.generation || 0) + 1,
                compacted_at: at,
            };
            compactedHistory.compact_checksum = cleanupCommitRepairResolutionTransactionCompactChecksum(compactedHistory);
        }
        const value = {
            schema: "ccm-cleanup-commit-repair-resolution-transaction-ledger-v1",
            version: 1,
            group_id: groupId,
            revision: Number(ledger.revision || 0) + 1,
            previous_ledger_checksum: ledger.ledger_checksum || "",
            entries: [...open, ...terminal],
            compacted_history: compactedHistory,
            open_transaction_count: open.length,
            completed_transaction_count: terminal.filter((entry) => entry.status === "completed").length,
            recovered_transaction_count: [...open, ...terminal].filter((entry) => Number(entry.recovery_count || 0) > 0).length,
            compacted_transaction_count: Number(compactedHistory?.compacted_count || 0),
            updated_at: at,
        };
        value.ledger_checksum = cleanupCommitRepairResolutionTransactionLedgerChecksum(value);
        if (!(0, typed_memory_ledgers_part_01_1.cleanupGroupLedgerLockHeld)(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, value);
        return { transaction, ledger: { ...value, file: ledger.file } };
    });
}
function cleanupCommitRepairTargetSnapshots(entries, idField, checksumField) {
    return (entries || []).map((entry) => ({ id: String(entry[idField] || ""), checksum: String(entry[checksumField] || "") }))
        .filter((entry) => entry.id)
        .sort((a, b) => a.id.localeCompare(b.id));
}
function cleanupCommitRepairTargetSnapshotsMatch(entries, idField, checksumField, expected) {
    return (0, typed_memory_shared_1.checksum)(cleanupCommitRepairTargetSnapshots(entries, idField, checksumField), 48) === (0, typed_memory_shared_1.checksum)(expected || [], 48);
}
function maybeInterruptCleanupCommitRepairResolution(options, phase) {
    const requested = String(options.simulateResolutionCrashAfter || options.simulate_resolution_crash_after || "").trim().toLowerCase();
    if (requested === phase)
        throw new Error(`simulated_cleanup_commit_repair_resolution_interruption_after_${phase}`);
}
function assertNoConflictingCleanupCommitRepairResolutionTransaction(groupId, workItemId, allowedTransactionId = "") {
    const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
    if (!ledger.ledger_checksum_valid)
        throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
    const conflict = ledger.entries.find((entry) => entry.work_item_id === workItemId
        && entry.status !== "completed" && entry.status !== "cancelled"
        && entry.resolution_transaction_id !== allowedTransactionId);
    if (conflict)
        throw new Error("cleanup commit repair resolution transaction already in progress");
    return ledger;
}
function validateCleanupCommitRepairResolutionEvidence(groupId, evidenceChecksum) {
    const quarantineLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId), {});
    const evidence = (quarantineLedger.entries || []).find((entry) => entry.evidence_checksum === evidenceChecksum) || null;
    const valid = !!evidence && evidence.group_id === groupId && evidence.evidence_checksum === cleanupCommitRepairEvidenceChecksum(evidence)
        && quarantineLedger.ledger_checksum === (0, typed_memory_shared_1.checksum)((quarantineLedger.entries || []).map((entry) => entry.evidence_checksum || ""), 48);
    if (!valid)
        throw new Error("cleanup commit repair quarantine evidence changed after approval");
    return evidence;
}
function prepareCleanupCommitRepairResolutionTransaction(groupId, receipt, at, options = {}) {
    const workLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    const briefLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
    const assignmentLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId), {});
    const receiptLedger = (0, typed_memory_shared_1.readJson)((0, typed_memory_distillation_receipts_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupId), {});
    if (!cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum))
        throw new Error("cleanup commit repair work item ledger checksum invalid");
    if (!cleanupCommitRepairLedgerValid(briefLedger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum))
        throw new Error("cleanup commit repair brief ledger checksum invalid");
    if (Array.isArray(assignmentLedger.entries) && assignmentLedger.entries.length > 0
        && !cleanupCommitRepairLedgerValid(assignmentLedger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum)) {
        throw new Error("cleanup commit repair assignment ledger checksum invalid");
    }
    if (!(0, typed_memory_distillation_receipts_1.cleanupCommitRepairResolutionReceiptLedgerValid)(receiptLedger, groupId))
        throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
    validateCleanupCommitRepairResolutionEvidence(groupId, receipt.quarantine_evidence_checksum);
    const item = (workLedger.entries || []).find((entry) => entry.work_item_id === receipt.work_item_id) || null;
    if (!item || item.work_item_checksum !== receipt.work_item_checksum || !["claimed", "dispatched"].includes(item.status)) {
        throw new Error("cleanup commit repair work item changed after approval");
    }
    const briefs = (briefLedger.entries || []).filter((entry) => entry.work_item_id === receipt.work_item_id);
    if (briefs.length === 0 || briefs.some((entry) => entry.status === "closed"))
        throw new Error("cleanup commit repair brief is not resolvable");
    const assignments = (assignmentLedger.entries || []).filter((entry) => entry.work_item_id === receipt.work_item_id);
    const receipts = (receiptLedger.entries || []).filter((entry) => entry.work_item_id === receipt.work_item_id);
    if (!receipts.some((entry) => entry.receipt_id === receipt.receipt_id && entry.consumed !== true))
        throw new Error("cleanup commit repair resolution receipt invalid or consumed");
    const transactionId = `cleanup-commit-repair-resolution-transaction:${(0, typed_memory_shared_1.checksum)([groupId, receipt.receipt_id, receipt.receipt_checksum], 24)}`;
    assertNoConflictingCleanupCommitRepairResolutionTransaction(groupId, receipt.work_item_id, transactionId);
    const transaction = {
        schema: "ccm-cleanup-commit-repair-resolution-transaction-v1",
        version: 1,
        resolution_transaction_id: transactionId,
        group_id: groupId,
        work_item_id: receipt.work_item_id,
        receipt_id: receipt.receipt_id,
        receipt_checksum: receipt.receipt_checksum,
        quarantine_evidence_checksum: receipt.quarantine_evidence_checksum,
        resolution_action: receipt.resolution_action,
        phase: "prepared",
        status: "in_progress",
        recovery_count: 0,
        before: {
            work_item_checksum: item.work_item_checksum,
            work_item_ledger_checksum: workLedger.ledger_checksum || "",
            briefs: cleanupCommitRepairTargetSnapshots(briefs, "brief_id", "brief_checksum"),
            brief_ledger_checksum: briefLedger.ledger_checksum || "",
            assignments: cleanupCommitRepairTargetSnapshots(assignments, "binding_id", "binding_checksum"),
            assignment_ledger_checksum: assignmentLedger.ledger_checksum || "",
            receipts: cleanupCommitRepairTargetSnapshots(receipts, "receipt_id", "receipt_state_checksum"),
            receipt_ledger_checksum: receiptLedger.ledger_checksum || "",
        },
        work_item_commit: {},
        brief_commit: {},
        assignment_commit: {},
        receipt_commit: {},
        started_at: at,
        updated_at: at,
        completed_at: "",
    };
    return upsertCleanupCommitRepairResolutionTransaction(groupId, transaction, at, options).transaction;
}
function advanceCleanupCommitRepairResolutionTransaction(groupId, transactionInput, at, options = {}) {
    let transaction = { ...transactionInput };
    if (transaction.transaction_checksum !== cleanupCommitRepairResolutionTransactionChecksum(transaction)
        || transaction.group_id !== groupId
        || cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) === 0
        || transaction.status === "cancelled") {
        throw new Error("cleanup commit repair resolution transaction invalid");
    }
    const persist = (next) => {
        transaction = upsertCleanupCommitRepairResolutionTransaction(groupId, next, at, options).transaction;
        return transaction;
    };
    const receiptFile = (0, typed_memory_distillation_receipts_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupId);
    const sourceReceiptLedger = (0, typed_memory_shared_1.readJson)(receiptFile, {});
    if (!(0, typed_memory_distillation_receipts_1.cleanupCommitRepairResolutionReceiptLedgerValid)(sourceReceiptLedger, groupId))
        throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
    const sourceReceipt = (sourceReceiptLedger.entries || []).find((entry) => entry.receipt_id === transaction.receipt_id) || null;
    if (!sourceReceipt || sourceReceipt.receipt_checksum !== transaction.receipt_checksum || sourceReceipt.group_id !== groupId
        || sourceReceipt.work_item_id !== transaction.work_item_id || sourceReceipt.resolution_action !== transaction.resolution_action) {
        throw new Error("cleanup commit repair resolution transaction receipt binding invalid");
    }
    if (Date.parse(transaction.started_at || "") > Date.parse(sourceReceipt.expires_at || ""))
        throw new Error("cleanup commit repair resolution transaction started after receipt expiry");
    validateCleanupCommitRepairResolutionEvidence(groupId, transaction.quarantine_evidence_checksum);
    if (cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) < cleanupCommitRepairResolutionTransactionPhaseRank("work_item_committed")) {
        const workFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
        let ledger = (0, typed_memory_shared_1.readJson)(workFile, {});
        if (!cleanupCommitRepairLedgerValid(ledger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum))
            throw new Error("cleanup commit repair work item ledger checksum invalid");
        const index = (ledger.entries || []).findIndex((entry) => entry.work_item_id === transaction.work_item_id);
        if (index < 0)
            throw new Error("cleanup commit repair work item missing during resolution recovery");
        const item = ledger.entries[index];
        const alreadyApplied = item.status === transaction.resolution_action && item.resolution_receipt_id === transaction.receipt_id;
        if (!alreadyApplied) {
            if (item.work_item_checksum !== transaction.before.work_item_checksum || !["claimed", "dispatched"].includes(item.status)) {
                throw new Error("cleanup commit repair work item diverged during resolution recovery");
            }
            const entries = [...ledger.entries];
            entries[index] = {
                ...item,
                status: transaction.resolution_action,
                resolved_at: at,
                resolution_receipt_id: transaction.receipt_id,
                resolution_reason: sourceReceipt.reason,
                updated_at: at,
            };
            writeCleanupCommitRepairWorkItems(groupId, entries, at);
            maybeInterruptCleanupCommitRepairResolution(options, "work_item_written");
            ledger = (0, typed_memory_shared_1.readJson)(workFile, {});
        }
        const committedItem = (ledger.entries || []).find((entry) => entry.work_item_id === transaction.work_item_id) || {};
        if (committedItem.status !== transaction.resolution_action || committedItem.resolution_receipt_id !== transaction.receipt_id) {
            throw new Error("cleanup commit repair work item commit proof invalid");
        }
        persist({ ...transaction, phase: "work_item_committed", work_item_commit: { ledger_checksum: ledger.ledger_checksum || "", work_item_checksum: committedItem.work_item_checksum || "", committed_at: at } });
        maybeInterruptCleanupCommitRepairResolution(options, "work_item_committed");
    }
    if (cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) < cleanupCommitRepairResolutionTransactionPhaseRank("brief_committed")) {
        const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
        let ledger = (0, typed_memory_shared_1.readJson)(briefFile, {});
        if (!cleanupCommitRepairLedgerValid(ledger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum))
            throw new Error("cleanup commit repair brief ledger checksum invalid");
        const expectedIds = new Set((transaction.before.briefs || []).map((entry) => entry.id));
        let targets = (ledger.entries || []).filter((entry) => expectedIds.has(entry.brief_id));
        if (targets.length !== expectedIds.size)
            throw new Error("cleanup commit repair brief target missing during resolution recovery");
        const alreadyApplied = targets.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id);
        if (!alreadyApplied) {
            if (!cleanupCommitRepairTargetSnapshotsMatch(targets, "brief_id", "brief_checksum", transaction.before.briefs))
                throw new Error("cleanup commit repair brief diverged during resolution recovery");
            writeCleanupCommitRepairBriefs(groupId, (ledger.entries || []).map((entry) => expectedIds.has(entry.brief_id)
                ? { ...entry, status: "closed", closed_at: at, resolution_receipt_id: transaction.receipt_id }
                : entry), at);
            maybeInterruptCleanupCommitRepairResolution(options, "brief_written");
            ledger = (0, typed_memory_shared_1.readJson)(briefFile, {});
            targets = (ledger.entries || []).filter((entry) => expectedIds.has(entry.brief_id));
        }
        if (!targets.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id))
            throw new Error("cleanup commit repair brief commit proof invalid");
        persist({ ...transaction, phase: "brief_committed", brief_commit: { ledger_checksum: ledger.ledger_checksum || "", target_root: (0, typed_memory_shared_1.checksum)(cleanupCommitRepairTargetSnapshots(targets, "brief_id", "brief_checksum"), 48), committed_at: at } });
        maybeInterruptCleanupCommitRepairResolution(options, "brief_committed");
    }
    if (cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) < cleanupCommitRepairResolutionTransactionPhaseRank("assignment_committed")) {
        const assignmentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
        let ledger = (0, typed_memory_shared_1.readJson)(assignmentFile, {});
        const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
        if (entries.length > 0 && !cleanupCommitRepairLedgerValid(ledger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum))
            throw new Error("cleanup commit repair assignment ledger checksum invalid");
        const expectedIds = new Set((transaction.before.assignments || []).map((entry) => entry.id));
        let targets = entries.filter((entry) => expectedIds.has(entry.binding_id));
        if (targets.length !== expectedIds.size)
            throw new Error("cleanup commit repair assignment target missing during resolution recovery");
        const alreadyApplied = targets.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id);
        if (!alreadyApplied) {
            if (!cleanupCommitRepairTargetSnapshotsMatch(targets, "binding_id", "binding_checksum", transaction.before.assignments))
                throw new Error("cleanup commit repair assignment diverged during resolution recovery");
            if (expectedIds.size > 0) {
                writeCleanupCommitRepairAssignments(groupId, entries.map((entry) => expectedIds.has(entry.binding_id)
                    ? { ...entry, status: "closed", closed_at: at, resolution_receipt_id: transaction.receipt_id }
                    : entry), at);
                maybeInterruptCleanupCommitRepairResolution(options, "assignment_written");
                ledger = (0, typed_memory_shared_1.readJson)(assignmentFile, {});
                targets = (ledger.entries || []).filter((entry) => expectedIds.has(entry.binding_id));
            }
        }
        if (!targets.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id))
            throw new Error("cleanup commit repair assignment commit proof invalid");
        persist({ ...transaction, phase: "assignment_committed", assignment_commit: { ledger_checksum: ledger.ledger_checksum || "", target_root: (0, typed_memory_shared_1.checksum)(cleanupCommitRepairTargetSnapshots(targets, "binding_id", "binding_checksum"), 48), committed_at: at } });
        maybeInterruptCleanupCommitRepairResolution(options, "assignment_committed");
    }
    if (cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) < cleanupCommitRepairResolutionTransactionPhaseRank("receipt_committed")) {
        let ledger = (0, typed_memory_shared_1.readJson)(receiptFile, {});
        if (!(0, typed_memory_distillation_receipts_1.cleanupCommitRepairResolutionReceiptLedgerValid)(ledger, groupId))
            throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
        const expectedIds = new Set((transaction.before.receipts || []).map((entry) => entry.id));
        let targets = (ledger.entries || []).filter((entry) => expectedIds.has(entry.receipt_id));
        if (targets.length !== expectedIds.size)
            throw new Error("cleanup commit repair receipt target missing during resolution recovery");
        const alreadyApplied = targets.every((entry) => entry.consumed === true)
            && targets.some((entry) => entry.receipt_id === transaction.receipt_id && entry.consumed === true);
        if (!alreadyApplied) {
            if (!cleanupCommitRepairTargetSnapshotsMatch(targets, "receipt_id", "receipt_state_checksum", transaction.before.receipts))
                throw new Error("cleanup commit repair receipt diverged during resolution recovery");
            (0, typed_memory_distillation_receipts_1.writeCleanupCommitRepairResolutionReceipts)(groupId, (ledger.entries || []).map((entry) => entry.receipt_id === transaction.receipt_id
                ? { ...entry, consumed: true, consumed_at: at }
                : expectedIds.has(entry.receipt_id) && entry.consumed !== true
                    ? { ...entry, consumed: true, consumed_at: at, invalidated_by_receipt_id: transaction.receipt_id }
                    : entry), at);
            maybeInterruptCleanupCommitRepairResolution(options, "receipt_written");
            ledger = (0, typed_memory_shared_1.readJson)(receiptFile, {});
            targets = (ledger.entries || []).filter((entry) => expectedIds.has(entry.receipt_id));
        }
        if (!targets.every((entry) => entry.consumed === true))
            throw new Error("cleanup commit repair receipt commit proof invalid");
        persist({ ...transaction, phase: "receipt_committed", receipt_commit: { ledger_checksum: ledger.ledger_checksum || "", target_root: (0, typed_memory_shared_1.checksum)(cleanupCommitRepairTargetSnapshots(targets, "receipt_id", "receipt_state_checksum"), 48), committed_at: at } });
        maybeInterruptCleanupCommitRepairResolution(options, "receipt_committed");
    }
    if (transaction.status !== "completed") {
        persist({ ...transaction, phase: "completed", status: "completed", completed_at: at });
        maybeInterruptCleanupCommitRepairResolution(options, "completed");
    }
    const finalWorkLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    const finalItem = (finalWorkLedger.entries || []).find((entry) => entry.work_item_id === transaction.work_item_id) || null;
    return { ...finalItem, resolution_receipt_id: transaction.receipt_id, resolution_transaction_id: transaction.resolution_transaction_id, resolution_transaction_phase: transaction.phase };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId);
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options = {}) {
    return require("./group-memory-maintenance").reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options);
}
function cleanupCommitRepairResolutionTransactionLinkGaps(groupId, transaction, transactionLedger) {
    const gaps = [];
    if (!transactionLedger.ledger_checksum_valid)
        gaps.push("resolution_transaction_ledger_checksum_invalid");
    if (transaction.transaction_checksum !== cleanupCommitRepairResolutionTransactionChecksum(transaction))
        gaps.push("resolution_transaction_checksum_invalid");
    if (String(transaction.group_id || "") !== groupId)
        gaps.push("resolution_transaction_group_mismatch");
    const phaseRank = cleanupCommitRepairResolutionTransactionPhaseRank(String(transaction.phase || ""));
    if (phaseRank === 0)
        gaps.push("resolution_transaction_phase_invalid");
    const receiptLedger = (0, typed_memory_shared_1.readJson)((0, typed_memory_distillation_receipts_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupId), {});
    if (!(0, typed_memory_distillation_receipts_1.cleanupCommitRepairResolutionReceiptLedgerValid)(receiptLedger, groupId))
        gaps.push("resolution_receipt_ledger_checksum_invalid");
    const receipt = (receiptLedger.entries || []).find((entry) => entry.receipt_id === transaction.receipt_id) || null;
    if (!receipt)
        gaps.push("resolution_transaction_receipt_missing");
    else {
        if (receipt.group_id !== groupId)
            gaps.push("resolution_transaction_receipt_group_mismatch");
        if (receipt.receipt_checksum !== (0, typed_memory_distillation_receipts_1.cleanupCommitRepairResolutionReceiptChecksum)(receipt))
            gaps.push("resolution_transaction_receipt_checksum_invalid");
        if (receipt.receipt_checksum !== transaction.receipt_checksum)
            gaps.push("resolution_transaction_receipt_checksum_mismatch");
        if (receipt.work_item_id !== transaction.work_item_id)
            gaps.push("resolution_transaction_receipt_work_item_mismatch");
        if (receipt.resolution_action !== transaction.resolution_action)
            gaps.push("resolution_transaction_receipt_action_mismatch");
        if (receipt.quarantine_evidence_checksum !== transaction.quarantine_evidence_checksum)
            gaps.push("resolution_transaction_receipt_evidence_mismatch");
        if (Date.parse(transaction.started_at || "") > Date.parse(receipt.expires_at || ""))
            gaps.push("resolution_transaction_started_after_receipt_expiry");
    }
    try {
        validateCleanupCommitRepairResolutionEvidence(groupId, transaction.quarantine_evidence_checksum);
    }
    catch {
        gaps.push("resolution_transaction_quarantine_evidence_invalid");
    }
    const workLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    if (!cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum))
        gaps.push("resolution_work_item_ledger_checksum_invalid");
    const item = (workLedger.entries || []).find((entry) => entry.work_item_id === transaction.work_item_id) || null;
    if (!item)
        gaps.push("resolution_transaction_work_item_missing");
    else {
        const applied = item.status === transaction.resolution_action && item.resolution_receipt_id === transaction.receipt_id;
        if (phaseRank >= cleanupCommitRepairResolutionTransactionPhaseRank("work_item_committed")) {
            if (!applied)
                gaps.push("resolution_transaction_work_item_phase_proof_missing");
        }
        else if (!applied && item.work_item_checksum !== transaction.before?.work_item_checksum)
            gaps.push("resolution_transaction_work_item_diverged");
    }
    const briefLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
    if (!cleanupCommitRepairLedgerValid(briefLedger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum))
        gaps.push("resolution_brief_ledger_checksum_invalid");
    const expectedBriefIds = new Set((transaction.before?.briefs || []).map((entry) => entry.id));
    const briefs = (briefLedger.entries || []).filter((entry) => expectedBriefIds.has(entry.brief_id));
    if (briefs.length !== expectedBriefIds.size)
        gaps.push("resolution_transaction_brief_target_missing");
    else {
        const applied = briefs.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id);
        if (phaseRank >= cleanupCommitRepairResolutionTransactionPhaseRank("brief_committed")) {
            if (!applied)
                gaps.push("resolution_transaction_brief_phase_proof_missing");
        }
        else if (!applied && !cleanupCommitRepairTargetSnapshotsMatch(briefs, "brief_id", "brief_checksum", transaction.before?.briefs || []))
            gaps.push("resolution_transaction_brief_diverged");
    }
    const assignmentLedger = (0, typed_memory_shared_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId), {});
    const assignmentEntries = Array.isArray(assignmentLedger.entries) ? assignmentLedger.entries : [];
    if (assignmentEntries.length > 0 && !cleanupCommitRepairLedgerValid(assignmentLedger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum))
        gaps.push("resolution_assignment_ledger_checksum_invalid");
    const expectedAssignmentIds = new Set((transaction.before?.assignments || []).map((entry) => entry.id));
    const assignments = assignmentEntries.filter((entry) => expectedAssignmentIds.has(entry.binding_id));
    if (assignments.length !== expectedAssignmentIds.size)
        gaps.push("resolution_transaction_assignment_target_missing");
    else {
        const applied = assignments.every((entry) => entry.status === "closed" && entry.resolution_receipt_id === transaction.receipt_id);
        if (phaseRank >= cleanupCommitRepairResolutionTransactionPhaseRank("assignment_committed")) {
            if (!applied)
                gaps.push("resolution_transaction_assignment_phase_proof_missing");
        }
        else if (!applied && !cleanupCommitRepairTargetSnapshotsMatch(assignments, "binding_id", "binding_checksum", transaction.before?.assignments || []))
            gaps.push("resolution_transaction_assignment_diverged");
    }
    const expectedReceiptIds = new Set((transaction.before?.receipts || []).map((entry) => entry.id));
    const receipts = (receiptLedger.entries || []).filter((entry) => expectedReceiptIds.has(entry.receipt_id));
    if (receipts.length !== expectedReceiptIds.size)
        gaps.push("resolution_transaction_receipt_target_missing");
    else {
        const applied = receipts.every((entry) => entry.consumed === true);
        if (phaseRank >= cleanupCommitRepairResolutionTransactionPhaseRank("receipt_committed")) {
            if (!applied)
                gaps.push("resolution_transaction_receipt_phase_proof_missing");
        }
        else if (!applied && !cleanupCommitRepairTargetSnapshotsMatch(receipts, "receipt_id", "receipt_state_checksum", transaction.before?.receipts || []))
            gaps.push("resolution_transaction_receipt_diverged");
    }
    if (transaction.status === "completed" && (!transaction.completed_at || transaction.phase !== "completed"
        || !transaction.work_item_commit?.work_item_checksum || !transaction.brief_commit?.target_root
        || !transaction.assignment_commit?.target_root || !transaction.receipt_commit?.target_root)) {
        gaps.push("resolution_transaction_completion_proof_invalid");
    }
    return (0, typed_memory_shared_1.uniqueStrings)(gaps, 80);
}
function cleanupCommitRepairResolutionTransactionArtifactChecksum(entry = {}, checksumField) {
    const value = { ...entry };
    delete value[checksumField];
    return (0, typed_memory_shared_1.checksum)(value, 48);
}
function cleanupCommitRepairResolutionTransactionArtifactLedgerValid(ledger, groupId, checksumField) {
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    return String(ledger?.group_id || "") === groupId
        && entries.every((entry) => entry[checksumField] === cleanupCommitRepairResolutionTransactionArtifactChecksum(entry, checksumField))
        && ledger.ledger_checksum === (0, typed_memory_shared_1.checksum)(entries.map((entry) => entry[checksumField] || ""), 48);
}
//# sourceMappingURL=typed-memory-ledgers-part-02.js.map