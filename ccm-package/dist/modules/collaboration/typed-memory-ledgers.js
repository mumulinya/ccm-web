"use strict";
// typed-memory-ledgers.ts — merged from 4 part files (behavior-freeze merge).
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
exports.readGroupTypedMemoryPressureRecallUsageLedger = readGroupTypedMemoryPressureRecallUsageLedger;
exports.writeGroupTypedMemoryPressureRecallUsageLedger = writeGroupTypedMemoryPressureRecallUsageLedger;
exports.recordGroupTypedMemoryPressureRecallUsageLedger = recordGroupTypedMemoryPressureRecallUsageLedger;
exports.getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile = getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile;
exports.normalizePostCompactCompletionMemoryPreservationClosureUsageState = normalizePostCompactCompletionMemoryPreservationClosureUsageState;
exports.normalizePostCompactCompletionMemoryPreservationClosureTaskFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily;
exports.postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance = postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance;
exports.normalizePostCompactCompletionMemoryPreservationClosureUsageAging = normalizePostCompactCompletionMemoryPreservationClosureUsageAging;
exports.postCompactCompletionMemoryPreservationClosureEvidenceSessionKey = postCompactCompletionMemoryPreservationClosureEvidenceSessionKey;
exports.clusterPostCompactCompletionMemoryPreservationClosureEvidence = clusterPostCompactCompletionMemoryPreservationClosureEvidence;
exports.scorePostCompactCompletionMemoryPreservationClosureEvidence = scorePostCompactCompletionMemoryPreservationClosureEvidence;
exports.arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict = arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict;
exports.postCompactCompletionMemoryPreservationClosureUsageRecommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation;
exports.readPostCompactCompletionMemoryPreservationClosureUsageLedger = readPostCompactCompletionMemoryPreservationClosureUsageLedger;
exports.recordPostCompactCompletionMemoryPreservationClosureUsage = recordPostCompactCompletionMemoryPreservationClosureUsage;
exports.buildPostCompactCompletionMemoryPreservationClosureUsageSummary = buildPostCompactCompletionMemoryPreservationClosureUsageSummary;
exports.listGroupTypedMemoryPressureRecallUsageLedgers = listGroupTypedMemoryPressureRecallUsageLedgers;
exports.getGroupTypedMemoryRecallLedgerFile = getGroupTypedMemoryRecallLedgerFile;
exports.getGroupTypedMemoryConsumptionLedgerFile = getGroupTypedMemoryConsumptionLedgerFile;
exports.getGroupTypedMemoryStaleCandidateLedgerFile = getGroupTypedMemoryStaleCandidateLedgerFile;
exports.getGroupTypedMemoryPressureRecallUsageLedgerFile = getGroupTypedMemoryPressureRecallUsageLedgerFile;
exports.cleanupGroupTypedMemoryArtifactStage = cleanupGroupTypedMemoryArtifactStage;
exports.postCompactCompletionMemoryPreservationRepairClosureInputRows = postCompactCompletionMemoryPreservationRepairClosureInputRows;
exports.postCompactCompletionMemoryPreservationRepairClosureRowId = postCompactCompletionMemoryPreservationRepairClosureRowId;
exports.normalizePostCompactCompletionMemoryPreservationRepairClosureRows = normalizePostCompactCompletionMemoryPreservationRepairClosureRows;
exports.mergePostCompactCompletionMemoryPreservationRepairClosureRows = mergePostCompactCompletionMemoryPreservationRepairClosureRows;
exports.postCompactCompletionMemoryPreservationRepairClosureArchive = postCompactCompletionMemoryPreservationRepairClosureArchive;
exports.renderPostCompactCompletionMemoryPreservationRepairClosureBody = renderPostCompactCompletionMemoryPreservationRepairClosureBody;
exports.normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows = normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows;
exports.renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody = renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir;
exports.conflictResolutionColdArchiveShardFile = conflictResolutionColdArchiveShardFile;
exports.readAndVerifyConflictResolutionColdArchiveShard = readAndVerifyConflictResolutionColdArchiveShard;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile;
exports.listConflictResolutionColdArchiveShardFiles = listConflictResolutionColdArchiveShardFiles;
exports.readStandaloneConflictResolutionColdArchiveShard = readStandaloneConflictResolutionColdArchiveShard;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile;
exports.conflictResolutionMaintenanceScopeMetadata = conflictResolutionMaintenanceScopeMetadata;
exports.conflictResolutionMaintenanceState = conflictResolutionMaintenanceState;
exports.acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.conflictResolutionMaintenanceNotificationDeliveryChecksum = conflictResolutionMaintenanceNotificationDeliveryChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryCompactChecksum = conflictResolutionMaintenanceNotificationDeliveryCompactChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum = conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum;
exports.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile;
exports.getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir;
exports.verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile;
exports.cleanupGroupLedgerLockChecksum = cleanupGroupLedgerLockChecksum;
exports.readCleanupGroupLedgerLock = readCleanupGroupLedgerLock;
exports.cleanupMetadataBackoffWait = cleanupMetadataBackoffWait;
exports.pruneCleanupMetadataArchives = pruneCleanupMetadataArchives;
exports.acquireCleanupGroupLedgerLock = acquireCleanupGroupLedgerLock;
exports.cleanupGroupLedgerLockHeld = cleanupGroupLedgerLockHeld;
exports.releaseCleanupGroupLedgerLock = releaseCleanupGroupLedgerLock;
exports.withCleanupGroupLedgerLock = withCleanupGroupLedgerLock;
exports.appendConflictResolutionMaintenanceNotificationDeliveryQuarantine = appendConflictResolutionMaintenanceNotificationDeliveryQuarantine;
exports.conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum;
exports.retainConflictResolutionMaintenanceNotificationDeliveryQuarantine = retainConflictResolutionMaintenanceNotificationDeliveryQuarantine;
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
exports.recordGroupTypedMemoryConsumptionLedger = recordGroupTypedMemoryConsumptionLedger;
exports.typedMemoryStaleCandidateLedgerChecksum = typedMemoryStaleCandidateLedgerChecksum;
exports.readGroupTypedMemoryStaleCandidateLedger = readGroupTypedMemoryStaleCandidateLedger;
exports.writeGroupTypedMemoryStaleCandidateLedger = writeGroupTypedMemoryStaleCandidateLedger;
exports.typedMemoryConsumptionQueryRelevance = typedMemoryConsumptionQueryRelevance;
exports.buildGroupTypedMemoryConsumptionSummary = buildGroupTypedMemoryConsumptionSummary;
exports.scoreGroupTypedMemoryConsumptionRecall = scoreGroupTypedMemoryConsumptionRecall;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
// ===== merged from typed-memory-ledgers-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function readGroupTypedMemoryPressureRecallUsageLedger(groupId) {
    return require("./group-memory-recall-usage").readGroupTypedMemoryPressureRecallUsageLedger(groupId);
}
function writeGroupTypedMemoryPressureRecallUsageLedger(groupId, ledger) {
    const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-260);
    (0, typed_memory_shared_1.writeJsonAtomic)(file, {
        schema: "ccm-group-typed-memory-pressure-recall-usage-ledger-v1",
        version: 1,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
        updatedAt: ledger.updatedAt || (0, typed_memory_shared_1.now)(),
    });
}
function recordGroupTypedMemoryPressureRecallUsageLedger(groupId, input = {}) {
    return require("./group-memory-recall-usage").recordGroupTypedMemoryPressureRecallUsageLedger(groupId, input);
}
function getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER);
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageState(value) {
    const state = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["used", "applied", "consumed"].includes(state))
        return "used";
    if (["verified", "checked", "reverified"].includes(state))
        return "verified";
    if (["ignored", "not_used", "skipped"].includes(state))
        return "ignored";
    if (["mentioned", "missing", "unclassified"].includes(state))
        return "mentioned";
    return "";
}
function normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(text, explicitKey = "") {
    const explicit = String(explicitKey || "").trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
    const source = (0, typed_memory_shared_1.compactText)(text || "", 1200).toLowerCase();
    const asciiTokens = (source.match(/[a-z0-9_./:-]{3,}/g) || [])
        .flatMap((token) => token.split(/[./:_-]+/g))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3
        && token.length <= 48
        && !typed_memory_shared_1.POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS.has(token)
        && !/^(phase)?\d+$/.test(token)
        && !/^[a-f0-9]{16,}$/.test(token));
    const chineseTokens = [];
    for (const run of source.match(/[\u3400-\u9fff]{2,}/g) || []) {
        for (let index = 0; index < run.length - 1 && chineseTokens.length < 32; index += 1) {
            const token = run.slice(index, index + 2);
            if (!typed_memory_shared_1.POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS.has(token))
                chineseTokens.push(token);
        }
    }
    const tokens = (0, typed_memory_shared_1.uniqueStrings)([...asciiTokens, ...chineseTokens], 40).sort();
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-task-family-v1",
        key: explicit || (tokens.length ? `task-family-${(0, typed_memory_shared_1.checksum)(tokens, 18)}` : ""),
        tokens,
        source_available: !!source,
    };
}
function postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance(entry = {}, queryFamily = {}, options = {}) {
    const entryKey = String(entry.task_family_key || entry.taskFamilyKey || "").trim();
    const entryTokens = (0, typed_memory_shared_1.uniqueStrings)(entry.task_family_tokens || entry.taskFamilyTokens || [], 40);
    const queryKey = String(queryFamily.key || "").trim();
    const queryTokens = (0, typed_memory_shared_1.uniqueStrings)(queryFamily.tokens || [], 40);
    if (!queryKey && queryTokens.length === 0)
        return { score: 1, matched: true, reason: "no_task_family_filter" };
    if (entryKey && queryKey && entryKey === queryKey)
        return { score: 1, matched: true, reason: "exact_task_family" };
    if (entryTokens.length === 0)
        return { score: 1, matched: true, reason: "legacy_global_feedback" };
    if (queryTokens.length === 0)
        return { score: 1, matched: true, reason: "query_family_unavailable" };
    const querySet = new Set(queryTokens);
    const overlap = entryTokens.filter((token) => querySet.has(token));
    const score = (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(overlap.length / Math.max(1, Math.min(entryTokens.length, queryTokens.length)), 4);
    const threshold = Math.max(0.1, Math.min(1, Number(options.taskFamilyRelevanceThreshold
        ?? options.task_family_relevance_threshold
        ?? options.postCompactClosureTaskFamilyRelevanceThreshold
        ?? options.post_compact_closure_task_family_relevance_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD)));
    return {
        score,
        matched: score >= threshold,
        reason: score >= threshold ? "related_task_family" : "unrelated_task_family",
        overlap_tokens: overlap,
        threshold,
    };
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageAging(options = {}) {
    return (0, typed_memory_recall_1.normalizeWorkerContextPressureRecallUsageAging)({
        ...options,
        usageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays
            ?? options.post_compact_closure_usage_half_life_days
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS,
        usageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays
            ?? options.post_compact_closure_usage_stale_after_days
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS,
        usageMinDecayWeight: options.postCompactClosureUsageMinDecayWeight
            ?? options.post_compact_closure_usage_min_decay_weight
            ?? 0,
    });
}
function postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry = {}) {
    const taskSession = String(entry.task_agent_session_id || entry.taskAgentSessionId || "").trim();
    const nativeSession = String(entry.native_session_id || entry.nativeSessionId || "").trim();
    if (!taskSession && !nativeSession)
        return "";
    return `${taskSession || "missing-task"}|${nativeSession || "missing-native"}`;
}
function clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries = []) {
    const clusters = [];
    for (const entry of entries) {
        const sessionKey = postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry);
        const packetKey = String(entry.worker_context_packet_id || entry.workerContextPacketId || "").trim();
        const matchingIndexes = [];
        clusters.forEach((cluster, index) => {
            if (sessionKey && cluster.session_keys.has(sessionKey))
                matchingIndexes.push(index);
            else if (packetKey && cluster.packet_keys.has(packetKey))
                matchingIndexes.push(index);
        });
        if (!matchingIndexes.length) {
            clusters.push({
                entries: [entry],
                session_keys: new Set(sessionKey ? [sessionKey] : []),
                packet_keys: new Set(packetKey ? [packetKey] : []),
            });
            continue;
        }
        const targetIndex = matchingIndexes[0];
        const target = clusters[targetIndex];
        target.entries.push(entry);
        if (sessionKey)
            target.session_keys.add(sessionKey);
        if (packetKey)
            target.packet_keys.add(packetKey);
        for (const index of matchingIndexes.slice(1).sort((a, b) => b - a)) {
            const merged = clusters[index];
            target.entries.push(...merged.entries);
            for (const key of merged.session_keys)
                target.session_keys.add(key);
            for (const key of merged.packet_keys)
                target.packet_keys.add(key);
            clusters.splice(index, 1);
        }
    }
    return clusters.map((cluster, index) => {
        const ordered = [...cluster.entries].sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
        const representative = ordered[ordered.length - 1] || {};
        return {
            ...representative,
            evidence_cluster_id: `closure-evidence-${(0, typed_memory_shared_1.checksum)([
                ...[...cluster.session_keys].sort(),
                ...[...cluster.packet_keys].sort(),
                representative.entry_id || index,
            ], 18)}`,
            correlated_entry_count: cluster.entries.length,
            correlated_duplicate_count: Math.max(0, cluster.entries.length - 1),
            evidence_session_keys: [...cluster.session_keys],
            evidence_packet_keys: [...cluster.packet_keys],
        };
    });
}
function scorePostCompactCompletionMemoryPreservationClosureEvidence(entries = [], options = {}) {
    const independentEntries = clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries).map((entry) => {
        const sourceReliability = (0, typed_memory_distillation_receipts_1.postCompactCompletionMemoryPreservationClosureReceiptSourceReliability)(entry, options);
        return {
            ...entry,
            receipt_source_reliability: sourceReliability,
            independent_effective_weight: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(Number(entry.effective_weight || 0) * sourceReliability.reliability, 4),
        };
    });
    const independentSessionKeys = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.flatMap((entry) => entry.evidence_session_keys || []), 320);
    const independentPacketKeys = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.flatMap((entry) => entry.evidence_packet_keys || []), 320);
    const providers = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.map((entry) => String(entry.agent || "").trim().toLowerCase()).filter(Boolean), 64);
    const receiptSources = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 32);
    const weightedEvidence = independentEntries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
    const baseConfidence = 1 - Math.exp(-weightedEvidence / 1.5);
    const sessionFactor = independentSessionKeys.length >= 2 ? 1 : independentSessionKeys.length === 1 ? 0.55 : 0.4;
    const providerFactor = providers.length >= 2 ? 1 : 0.9;
    const sourceFactor = receiptSources.length >= 2 ? 1 : 0.92;
    const confidence = (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(baseConfidence * sessionFactor * providerFactor * sourceFactor, 4);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-independent-evidence-v1",
        independentEntries,
        rawEntryCount: entries.length,
        independentEvidenceCount: independentEntries.length,
        correlatedDuplicateCount: Math.max(0, entries.length - independentEntries.length),
        independentSessionCount: independentSessionKeys.length,
        independentPacketCount: independentPacketKeys.length,
        distinctProviderCount: providers.length,
        distinctReceiptSourceCount: receiptSources.length,
        providers,
        receiptSources,
        weightedEvidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(weightedEvidence, 4),
        averageSourceReliability: independentEntries.length
            ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(independentEntries.reduce((sum, entry) => sum + Number(entry.receipt_source_reliability?.reliability || 0), 0) / independentEntries.length, 4)
            : 0,
        confidence,
        confidenceThreshold: Math.max(0.1, Math.min(1, Number(options.evidenceConfidenceThreshold
            ?? options.evidence_confidence_threshold
            ?? options.postCompactClosureEvidenceConfidenceThreshold
            ?? options.post_compact_closure_evidence_confidence_threshold
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD))),
    };
}
function arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict(independentEntries = [], options = {}) {
    const compliant = independentEntries.filter((entry) => entry.compliant === true);
    const positiveEntries = compliant.filter((entry) => ["used", "verified"].includes(String(entry.usage_state || "")));
    const ignoredEntries = compliant.filter((entry) => entry.usage_state === "ignored");
    const summarizeBranch = (entries) => {
        const weight = entries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
        const sessions = (0, typed_memory_shared_1.uniqueStrings)(entries.flatMap((entry) => entry.evidence_session_keys || []), 320);
        return {
            entry_count: entries.length,
            independent_session_count: sessions.length,
            independent_packet_count: (0, typed_memory_shared_1.uniqueStrings)(entries.flatMap((entry) => entry.evidence_packet_keys || []), 320).length,
            weighted_evidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(weight, 4),
            confidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(1 - Math.exp(-weight / 1.5), 4),
            providers: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.agent).filter(Boolean), 32),
            receipt_sources: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 24),
            entry_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.entry_id).filter(Boolean), 32),
            task_agent_session_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.task_agent_session_id).filter(Boolean), 32),
            native_session_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.native_session_id).filter(Boolean), 32),
        };
    };
    const positive = summarizeBranch(positiveEntries);
    const ignored = summarizeBranch(ignoredEntries);
    const maxWeight = Math.max(positive.weighted_evidence, ignored.weighted_evidence);
    const minWeight = Math.min(positive.weighted_evidence, ignored.weighted_evidence);
    const conflictRatio = maxWeight > 0 ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(minWeight / maxWeight, 4) : 0;
    const minBranchWeight = Math.max(0.1, Number(options.conflictMinBranchWeight
        ?? options.conflict_min_branch_weight
        ?? options.postCompactClosureConflictMinBranchWeight
        ?? options.post_compact_closure_conflict_min_branch_weight
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT));
    const ratioThreshold = Math.max(0.05, Math.min(1, Number(options.conflictRatioThreshold
        ?? options.conflict_ratio_threshold
        ?? options.postCompactClosureConflictRatioThreshold
        ?? options.post_compact_closure_conflict_ratio_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD)));
    const active = positive.independent_session_count > 0
        && ignored.independent_session_count > 0
        && positive.weighted_evidence >= minBranchWeight
        && ignored.weighted_evidence >= minBranchWeight
        && conflictRatio >= ratioThreshold;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-v1",
        active,
        arbitration_state: active
            ? "contradictory_reverify_current_session"
            : positive.weighted_evidence > ignored.weighted_evidence
                ? "consistent_used_or_verified"
                : ignored.weighted_evidence > positive.weighted_evidence
                    ? "consistent_ignored"
                    : "insufficient_evidence",
        ranking_action: active ? "neutralize_historical_promotion_and_suppression" : "use_confidence_gated_recommendation",
        current_session_verification_required: active,
        historical_majority_authorization_allowed: false,
        conflict_ratio: conflictRatio,
        conflict_confidence: active ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(Math.min(positive.confidence, ignored.confidence) * conflictRatio, 4) : 0,
        min_branch_weight: minBranchWeight,
        ratio_threshold: ratioThreshold,
        positive,
        ignored,
    };
}
function postCompactCompletionMemoryPreservationClosureUsageRecommendation(stats = {}, options = {}) {
    const ignoredThreshold = Math.max(1, Number(options.weightedIgnoredThreshold || options.weighted_ignored_threshold || 1.5));
    const used = Number(stats.weighted_used_count ?? stats.used_count ?? 0);
    const verified = Number(stats.weighted_verified_count ?? stats.verified_count ?? 0);
    const ignored = Number(stats.weighted_ignored_count ?? stats.ignored_count ?? 0);
    const stale = Number(stats.stale_count || 0);
    if (stats.active_receipt_repair_required === true)
        return "require_receipt_repair_before_reuse";
    if (stats.conflict_resolution_active === true) {
        return ["used", "verified"].includes(String(stats.conflict_resolution_usage_state || ""))
            ? "resolved_conflict_promote_but_reverify_future_session"
            : "resolved_conflict_neutral_reverify_future_session";
    }
    if (stats.feedback_conflict_active === true)
        return "surface_conflict_reverify_current_session";
    const confidenceThreshold = Number(stats.evidence_confidence_threshold
        ?? options.evidenceConfidenceThreshold
        ?? options.evidence_confidence_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD);
    const ignoredEvidenceConfident = Number(stats.independent_session_count || 0) >= 2
        && Number(stats.evidence_confidence || 0) >= confidenceThreshold;
    if (ignored >= ignoredThreshold && ignored > used + verified && ignoredEvidenceConfident)
        return "deprioritize_closure_recall";
    if (["used", "verified"].includes(String(stats.last_usage_state || ""))
        && stats.last_current_source_verified === true
        && stats.last_feedback_fresh !== false)
        return "promote_but_reverify_current_source";
    if (used + verified > ignored && stale === 0)
        return "promote_but_reverify_current_source";
    if (stale > 0)
        return "caution_stale_history_reverify_current_source";
    return "neutral_reverify_current_source";
}
function readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId, options = {}) {
    return require("./group-memory-recall-usage").readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId, options);
}
function recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, input = {}) {
    return require("./group-memory-recall-usage").recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, input);
}
function buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, options = {}) {
    return require("./group-memory-recall-usage").buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, options);
}
function listGroupTypedMemoryPressureRecallUsageLedgers(options = {}) {
    const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids)
        ? (options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const maxGroups = Math.max(1, Number(options.maxGroups || options.max_groups || options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups || typed_memory_shared_1.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS));
    const exclude = new Set((Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : [])
        .map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const candidates = explicitGroupIds.length
        ? explicitGroupIds.map((groupId) => ({
            groupId,
            file: getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId),
        }))
        : (() => {
            try {
                return fs.readdirSync(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .map(entry => ({
                    groupId: entry.name,
                    file: path.join(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, entry.name, typed_memory_shared_1.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER),
                }));
            }
            catch {
                return [];
            }
        })();
    return candidates
        .filter((item) => item.file && fs.existsSync(item.file))
        .map((item) => {
        try {
            const stat = fs.statSync(item.file);
            return { ...item, mtimeMs: stat.mtimeMs || 0 };
        }
        catch {
            return { ...item, mtimeMs: 0 };
        }
    })
        .filter((item) => !exclude.has(String(item.groupId || "").toLowerCase()))
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
        .slice(0, maxGroups);
}
function getGroupTypedMemoryRecallLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_RECALL_LEDGER);
}
function getGroupTypedMemoryConsumptionLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_LEDGER);
}
function getGroupTypedMemoryStaleCandidateLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_STALE_CANDIDATE_LEDGER);
}
function getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId) {
    return require("./group-memory-recall-usage").getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
}
function cleanupGroupTypedMemoryArtifactStage(groupId, leaseId) {
    const dir = (0, typed_memory_shared_1.groupTypedMemoryArtifactStageDir)(groupId, leaseId);
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    const root = (0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionStageRoot)(groupId);
    try {
        if (fs.existsSync(root) && fs.readdirSync(root).length === 0)
            fs.rmdirSync(root);
    }
    catch { }
}
function postCompactCompletionMemoryPreservationRepairClosureInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const direct = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.completions) ? input.completions : []),
    ];
    if (direct.length)
        return direct;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => (Array.isArray(group.items) ? group.items : []).map((row) => ({
        ...row,
        groupId: row.groupId || row.group_id || group.groupId || group.group_id || "",
        groupSessionId: row.groupSessionId || row.group_session_id || group.groupSessionId || group.group_session_id || "",
    })));
}
function postCompactCompletionMemoryPreservationRepairClosureRowId(row = {}) {
    return `post-compact-completion-memory-preservation-repair-closure:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
        row.work_item_id,
        row.failed_outcome_id,
        row.corrected_outcome_id,
        row.completion_doc_rel_paths,
        row.completion_work_item_ids,
        row.completion_timeline_binding_ids,
        row.current_session_binding_id,
        row.current_task_agent_session_id,
        row.current_native_session_id,
    ], 24)}`;
}
function normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    const forcedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return postCompactCompletionMemoryPreservationRepairClosureInputRows(input).map((raw, index) => {
        const item = raw?.item || raw?.completion || raw || {};
        const proof = item.corrected_retry_proof || item.correctedRetryProof || {};
        const historicalTaskSessions = (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_historical_task_agent_session_ids || item.completionPreservationHistoricalTaskAgentSessionIds || [], 32);
        const historicalNativeSessions = (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_historical_native_session_ids || item.completionPreservationHistoricalNativeSessionIds || [], 32);
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
            groupId: String(item.groupId || item.group_id || item.scopeId || item.scope_id || fallbackGroupId).trim(),
            groupSessionId: forcedGroupSessionId || String(item.groupSessionId || item.group_session_id || "").trim(),
            source: String(item.source || "").trim(),
            component: String(item.component || "").trim(),
            project: String(item.target_project || item.project || item.target || "").trim(),
            work_item_id: String(item.work_item_id || item.id || "").trim(),
            assignment_id: String(item.assignment_id || item.taskId || "").trim(),
            dispatch_key: String(item.dispatch_key || "").trim(),
            worker_context_packet_id: String(item.worker_context_packet_id || "").trim(),
            binding_id: String(item.binding_id || item.worker_context_packet_binding_id || "").trim(),
            failed_retry_id: String(item.compact_retry_id || proof.failed_retry_id || "").trim(),
            failed_outcome_id: String(item.compact_outcome_id || proof.failed_outcome_id || "").trim(),
            failed_hook_run_id: String(item.compact_hook_run_id || "").trim(),
            corrected_retry_id: String(item.corrected_compact_retry_id || proof.corrected_retry_id || "").trim(),
            corrected_outcome_id: String(item.corrected_compact_outcome_id || proof.corrected_outcome_id || "").trim(),
            corrected_hook_run_id: String(item.corrected_compact_hook_run_id || proof.corrected_hook_run_id || "").trim(),
            completion_doc_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_completion_doc_rel_paths || item.completionPreservationCompletionDocRelPaths || [], 24),
            required_doc_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_required_doc_rel_paths || item.completionPreservationRequiredDocRelPaths || [], 24),
            completion_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_work_item_ids || item.completionPreservationWorkItemIds || [], 32),
            completion_timeline_binding_ids: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_timeline_binding_ids || item.completionPreservationTimelineBindingIds || [], 32),
            historical_task_agent_session_ids: historicalTaskSessions,
            historical_native_session_ids: historicalNativeSessions,
            current_session_binding_id: String(item.completion_preservation_current_session_binding_id || item.completionPreservationCurrentSessionBindingId || "").trim(),
            current_task_agent_session_id: String(item.completion_preservation_current_task_agent_session_id || item.completionPreservationCurrentTaskAgentSessionId || "").trim(),
            current_native_session_id: String(item.completion_preservation_current_native_session_id || item.completionPreservationCurrentNativeSessionId || "").trim(),
            original_gap_codes: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_gap_codes || item.completionPreservationGapCodes || [], 32),
            exact_identity_restored: proof.exact_identity_restored === true || proof.exactIdentityRestored === true,
            current_session_boundary_restored: proof.current_session_boundary_restored === true || proof.currentSessionBoundaryRestored === true,
            historical_sessions_remain_evidence_only: proof.historical_sessions_remain_evidence_only === true || proof.historicalSessionsRemainEvidenceOnly === true,
            completion_source: String(item.completion_source || "").trim(),
            resolution_reason: String(item.resolutionReason || item.resolution_reason || "").trim(),
            completed_at: String(item.completedAt || item.completed_at || proof.verified_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            reuse_policy: "historical_compaction_repair_closure_requires_new_session_current_source_reverification",
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        row.row_id = postCompactCompletionMemoryPreservationRepairClosureRowId(row);
        return row;
    })
        .filter((row) => row.groupId === fallbackGroupId || (!fallbackGroupId && !!row.groupId))
        .filter((row) => !forcedGroupSessionId || row.groupSessionId === forcedGroupSessionId)
        .filter((row) => row.source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair")
        .filter((row) => row.component === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation")
        .filter((row) => row.completion_source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry")
        .filter((row) => row.resolution_reason === "completion_memory_compaction_preservation_corrected_retry_verified")
        .filter((row) => row.exact_identity_restored && row.current_session_boundary_restored && row.historical_sessions_remain_evidence_only)
        .filter((row) => row.work_item_id && row.failed_retry_id && row.failed_outcome_id && row.corrected_retry_id && row.corrected_outcome_id)
        .filter((row) => row.failed_retry_id !== row.corrected_retry_id && row.failed_outcome_id !== row.corrected_outcome_id)
        .filter((row) => row.completion_doc_rel_paths.length > 0 && row.required_doc_rel_paths.length > 0)
        .filter((row) => row.completion_work_item_ids.length > 0 && row.completion_timeline_binding_ids.length > 0)
        .filter((row) => row.current_session_binding_id && row.current_task_agent_session_id && row.current_native_session_id)
        .filter((row) => !row.historical_task_agent_session_ids.includes(row.current_task_agent_session_id))
        .filter((row) => !row.historical_native_session_ids.includes(row.current_native_session_id));
}
function mergePostCompactCompletionMemoryPreservationRepairClosureRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.completed_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function postCompactCompletionMemoryPreservationRepairClosureArchive(rows = [], options = {}) {
    return require("./group-memory-distillation").postCompactCompletionMemoryPreservationRepairClosureArchive(rows, options);
}
function renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Repair Closures",
        "",
        `Generated by CCM compact-preservation repair closure distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId
            ? `Exact group-chat session: ${options.groupSessionId}. Root group: ${options.sourceGroupId || "unknown"}.`
            : "Legacy unscoped group memory: no exact group-chat session was recorded.",
        "Each row records a failed compact outcome whose corrected-receipt completion memory was restored only by a newer, different compact retry/outcome with exact identity and current-session authority proof.",
        "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Every future child Agent session must reverify the current source and classify this recalled MEMORY.md in memoryUsed or memoryIgnored.",
        "All task/native sessions listed here are historical evidence in a future child session and never authorize that future session.",
        "",
        "## Verified Closure Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [verified] repair_work_item=${row.work_item_id}; failed_retry=${row.failed_retry_id}; failed_outcome=${row.failed_outcome_id}; corrected_retry=${row.corrected_retry_id}; corrected_outcome=${row.corrected_outcome_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
        lines.push(`  Restored identity: completion_docs=${(row.completion_doc_rel_paths || []).join(",")}; required_docs=${(row.required_doc_rel_paths || []).join(",")}; completion_work_items=${(row.completion_work_item_ids || []).join(",")}; timelines=${(row.completion_timeline_binding_ids || []).join(",")}.`);
        lines.push(`  Historical closure session: binding=${row.current_session_binding_id}; task_agent_session=${row.current_task_agent_session_id}; native_session=${row.current_native_session_id}; exactIdentityRestored=${row.exact_identity_restored === true}; currentSessionBoundaryRestored=${row.current_session_boundary_restored === true}; historicalSessionsRemainEvidenceOnly=${row.historical_sessions_remain_evidence_only === true}.`);
        if (row.original_gap_codes?.length)
            lines.push(`  Original preservation gaps: ${row.original_gap_codes.join(", ")}.`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Use this history to avoid reopening the identical failed retry/outcome after its exact corrected outcome is still applicable.");
    lines.push("- Never use this history as current repository truth or current-session authority; re-read current sources and produce a fresh memory usage receipt.");
    return lines.join("\n").trim() + "\n";
}
function normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input = {}, options = {}) {
    const rows = Array.isArray(input) ? input : Array.isArray(input.rows) ? input.rows : [];
    const scopeIdentity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(groupId, options);
    const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
    return rows.map((entry) => {
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-row-v1",
            version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
            group_id: String(entry.group_id || entry.groupId || sourceGroupId || "").trim(),
            source_group_id: sourceGroupId,
            group_session_id: String(entry.group_session_id || entry.groupSessionId || groupSessionId || "").trim(),
            typed_scope_id: groupId,
            target_project: String(entry.target_project || entry.targetProject || "").trim(),
            task_id: String(entry.task_id || entry.taskId || "").trim(),
            task_text: (0, typed_memory_shared_1.compactText)(entry.task_text || entry.taskText || "", 900),
            task_family_key: String(entry.task_family_key || entry.taskFamilyKey || "").trim(),
            task_family_tokens: (0, typed_memory_shared_1.uniqueStrings)(entry.task_family_tokens || entry.taskFamilyTokens || [], 40),
            resolution_entry_id: String(entry.entry_id || "").trim(),
            resolution_usage_state: normalizePostCompactCompletionMemoryPreservationClosureUsageState(entry.conflict_resolution_state || entry.usage_state),
            current_source_verified: entry.current_source_verified === true,
            reason: (0, typed_memory_shared_1.compactText)(entry.reason || "", 700),
            worker_context_packet_id: String(entry.worker_context_packet_id || "").trim(),
            binding_id: String(entry.binding_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || "").trim(),
            native_session_id: String(entry.native_session_id || "").trim(),
            execution_id: String(entry.execution_id || "").trim(),
            receipt_source: String(entry.receipt_source || "").trim(),
            receipt_status: String(entry.receipt_status || "").trim(),
            parent_arbitration_state: String(entry.conflict_parent_arbitration_state || "").trim(),
            parent_conflict_fingerprint: String(entry.conflict_parent_fingerprint || "").trim(),
            parent_conflict_ratio: Number(entry.conflict_parent_ratio || 0),
            parent_positive_weight: Number(entry.conflict_parent_positive_weight || 0),
            parent_ignored_weight: Number(entry.conflict_parent_ignored_weight || 0),
            reversible: entry.conflict_resolution_reversible === true,
            historical_branches_preserved: true,
            historical_majority_authorization_allowed: false,
            resolved_at: String(entry.generated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
        };
        row.row_id = `post-compact-closure-conflict-resolution:${(0, typed_memory_shared_1.checksum)([
            row.group_id,
            row.group_session_id,
            row.typed_scope_id,
            row.task_family_key,
            row.resolution_entry_id,
            row.task_agent_session_id,
            row.native_session_id,
            row.parent_conflict_fingerprint,
        ], 24)}`;
        return row;
    }).filter((row) => row.group_id === sourceGroupId && row.typed_scope_id === groupId)
        .filter((row) => groupSessionId ? row.group_session_id === groupSessionId : !row.group_session_id)
        .filter((row) => row.resolution_entry_id && row.task_family_key)
        .filter((row) => row.task_agent_session_id && row.native_session_id)
        .filter((row) => row.parent_arbitration_state === "contradictory_reverify_current_session" && row.parent_conflict_fingerprint)
        .filter((row) => row.reversible === true)
        .filter((row) => row.resolution_usage_state === "ignored" ? !!row.reason : ["used", "verified"].includes(row.resolution_usage_state) && row.current_source_verified === true);
}
function renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Closure Conflict Resolutions",
        "",
        `Generated by CCM closure conflict-resolution distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId
            ? `Exact group-chat session: ${options.groupSessionId}. Root group: ${options.sourceGroupId || "unknown"}.`
            : "Legacy unscoped group memory: automatic fresh-child injection remains blocked until exact session ownership is known.",
        "Each row records a newer current-session decision that resolved a contradictory used/verified versus ignored closure-memory history for one task family.",
        "Stable boundary: the resolution is session-bound recovery evidence, not permanent repository truth or authorization. Historical branches remain immutable and a later reliable contradiction may reopen arbitration.",
        "",
        "## Session-Bound Resolution Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [resolved:${row.resolution_usage_state}] task_family=${row.task_family_key}; resolution_entry=${row.resolution_entry_id}; parent=${row.parent_conflict_fingerprint}; resolved_at=${row.resolved_at}.`);
        lines.push(`  Current resolution session: packet=${row.worker_context_packet_id}; binding=${row.binding_id}; task_agent_session=${row.task_agent_session_id}; native_session=${row.native_session_id}; execution=${row.execution_id || ""}.`);
        lines.push(`  Verification: currentSourceVerified=${row.current_source_verified === true}; reason=${row.reason || ""}; parentState=${row.parent_arbitration_state}; parentRatio=${row.parent_conflict_ratio}; positiveWeight=${row.parent_positive_weight}; ignoredWeight=${row.parent_ignored_weight}.`);
        lines.push("  Reuse boundary: reversible=true; historicalBranchesPreserved=true; historicalMajorityAuthorizationAllowed=false.");
    }
    lines.push("");
    lines.push("## Future Session Rule");
    lines.push("- Use the newest valid resolution as ranking guidance for the same task family only, then reverify current source and return a fresh memoryUsed or memoryIgnored decision.");
    lines.push("- Never erase either historical conflict branch; reopen conflict arbitration when newer reliable opposing evidence appears.");
    return lines.join("\n").trim() + "\n";
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR);
}
function conflictResolutionColdArchiveShardFile(groupId, relPath) {
    const typedDir = path.resolve((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId));
    const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
    const file = path.resolve(typedDir, String(relPath || ""));
    if (file !== coldDir && !file.startsWith(`${coldDir}${path.sep}`))
        throw new Error("conflict-resolution cold archive shard path escapes group archive directory");
    return file;
}
function readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor = {}) {
    try {
        const file = conflictResolutionColdArchiveShardFile(groupId, descriptor.rel_path || descriptor.relPath || "");
        const shard = (0, typed_memory_shared_1.readJson)(file, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = (0, typed_memory_shared_1.checksum)(rows, 48);
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && String(shard.bucket || "") === String(descriptor.bucket || "")
            && calculatedChecksum === String(descriptor.content_checksum || "")
            && calculatedChecksum === String(shard.content_checksum || "")
            && rows.length === Number(descriptor.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId);
        return {
            valid,
            file,
            descriptor,
            shard,
            rows,
            calculatedChecksum,
            error: valid ? "" : "cold archive shard schema/group/checksum/count mismatch",
        };
    }
    catch (error) {
        return { valid: false, file: "", descriptor, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options = {}) {
    return require("./group-memory-distillation").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId);
}
function listConflictResolutionColdArchiveShardFiles(groupId) {
    const root = path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "shards");
    const files = [];
    const visit = (dir) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && entry.name.endsWith(".json"))
                files.push(file);
        }
    };
    visit(root);
    return files.sort();
}
function readStandaloneConflictResolutionColdArchiveShard(groupId, file) {
    try {
        const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
        const resolved = path.resolve(file);
        if (!resolved.startsWith(`${coldDir}${path.sep}`))
            throw new Error("orphan shard path escapes cold archive");
        const shard = (0, typed_memory_shared_1.readJson)(resolved, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = (0, typed_memory_shared_1.checksum)(rows, 48);
        const filenameChecksum = path.basename(resolved, ".json");
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && calculatedChecksum === String(shard.content_checksum || "")
            && calculatedChecksum === filenameChecksum
            && rows.length === Number(shard.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId && row.row_id);
        return { valid, file: resolved, shard, rows, calculatedChecksum, error: valid ? "" : "standalone orphan shard checksum/group/count mismatch" };
    }
    catch (error) {
        return { valid: false, file, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options = {}) {
    return require("./group-memory-maintenance").reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
}
function conflictResolutionMaintenanceScopeMetadata(scopeId) {
    const ledger = (0, typed_memory_shared_1.readJson)((0, typed_memory_distillation_receipts_1.getGroupTypedMemoryDistillationLedgerFile)(scopeId), {});
    const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(scopeId, ledger);
    return {
        source_group_id: identity.rootGroupId,
        group_session_id: identity.groupSessionId,
        typed_scope_id: identity.ledgerScopeId || scopeId,
        exact_session: identity.exactSession,
    };
}
function conflictResolutionMaintenanceState(groupId, options = {}) {
    const at = String(options.at || options.now || (0, typed_memory_shared_1.now)());
    const generation = (0, typed_memory_index_build_1.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations)(groupId);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
    });
    const recommendation = conflictResolutionMaintenanceRecommendation(generation, quarantine);
    const stateFingerprint = (0, typed_memory_shared_1.checksum)([
        groupId,
        generation.currentManifestChecksum || "",
        generation.previousManifestChecksum || "",
        quarantine.quarantine_checksum || "",
        recommendation.severity || "",
        recommendation.action || "",
    ], 32);
    return {
        at,
        group_id: groupId,
        ...conflictResolutionMaintenanceScopeMetadata(groupId),
        current_manifest_checksum: generation.currentManifestChecksum || "",
        previous_manifest_checksum: generation.previousManifestChecksum || "",
        quarantine_checksum: quarantine.quarantine_checksum || "",
        grace_period_ms: Number(quarantine.grace_period_ms || 0),
        recommendation,
        state_fingerprint: stateFingerprint,
        revalidated: !!generation && !!quarantine && !!quarantine.quarantine_checksum,
        healthy: generation.valid === true && quarantine.quarantine_input_valid !== false,
        valid: generation.valid === true && quarantine.quarantine_input_valid !== false,
        generation,
        quarantine,
    };
}
function acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return require("./group-memory-maintenance").acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input);
}
function suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return require("./group-memory-maintenance").suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input);
}
function conflictResolutionMaintenanceNotificationDeliveryChecksum(entry = {}) {
    return (0, typed_memory_shared_1.checksum)({
        delivery_id: entry.delivery_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        context_id: entry.context_id || "",
        consumer_session_id: entry.consumer_session_id || "",
        channel: entry.channel || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        advisory_only: entry.advisory_only === true,
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry = {}) {
    return (0, typed_memory_shared_1.checksum)({
        compact_id: entry.compact_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        detailed_entry_count: Number(entry.detailed_entry_count || 0),
        context_ids_root_checksum: entry.context_ids_root_checksum || "",
        source_delivery_checksums_root: entry.source_delivery_checksums_root || "",
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        schema: value.schema || "",
        version: Number(value.version || 0),
        group_id: value.group_id || "",
        retention_generation: Number(value.retention_generation || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({ delivery_id: entry.delivery_id || "", delivery_checksum: entry.delivery_checksum || "" })),
        compacted_entries: (value.compacted_entries || []).map((entry) => ({ compact_id: entry.compact_id || "", compact_checksum: entry.compact_checksum || "" })),
        updated_at: value.updated_at || "",
    }, 48);
}
function getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-deliveries.previous.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
}
function getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "delivery-telemetry-recovery-evidence");
}
function verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, file) {
    const present = fs.existsSync(file);
    const value = (0, typed_memory_shared_1.readJson)(file, null);
    const detailed = Array.isArray(value?.entries) ? value.entries : [];
    const compacted = Array.isArray(value?.compacted_entries) ? value.compacted_entries : [];
    const detailedValid = detailed.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
        && String(entry.group_id || "") === groupId
        && entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry));
    const compactedValid = compacted.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
        && String(entry.group_id || "") === groupId
        && entry.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry));
    const ledgerChecksumValid = !!value
        && value.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && value.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value);
    const valid = present
        && String(value?.group_id || "") === groupId
        && ledgerChecksumValid
        && detailedValid
        && compactedValid;
    return {
        file,
        present,
        value,
        valid,
        group_valid: String(value?.group_id || "") === groupId,
        ledger_checksum_valid: ledgerChecksumValid,
        detailed_valid: detailedValid,
        compacted_valid: compactedValid,
        retention_generation: Number(value?.retention_generation || 0),
        ledger_checksum: value?.ledger_checksum || "",
        error: valid ? "" : !present ? "delivery_ledger_missing" : !value ? "delivery_ledger_json_invalid" : String(value?.group_id || "") !== groupId ? "delivery_ledger_group_mismatch" : !ledgerChecksumValid ? "delivery_ledger_checksum_invalid" : !detailedValid ? "delivery_detail_invalid" : "delivery_compact_invalid",
    };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId) {
    return require("./group-memory-maintenance").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
}
function cleanupGroupLedgerLockChecksum(lock = {}) {
    return (0, typed_memory_shared_1.checksum)({
        lock_id: lock.lock_id || "",
        group_id: lock.group_id || "",
        owner_instance_id: lock.owner_instance_id || "",
        owner_pid: Number(lock.owner_pid || 0),
        owner_hostname: lock.owner_hostname || "",
        owner_role: lock.owner_role || "",
        acquired_at: lock.acquired_at || "",
        expires_at: lock.expires_at || "",
    }, 48);
}
function readCleanupGroupLedgerLock(groupId, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
    const lock = (0, typed_memory_shared_1.readJson)(file, null);
    if (!lock)
        return { file, present: false, valid: true, active: false, abandoned: false, lock: null };
    const checksumValid = lock.lock_checksum === cleanupGroupLedgerLockChecksum(lock);
    const identityValid = lock.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-group-ledger-lock-v1"
        && String(lock.group_id || "") === groupId;
    const atMs = Date.parse(at);
    const expiresAtMs = Date.parse(String(lock.expires_at || ""));
    const ownerLocal = String(lock.owner_hostname || "") === os.hostname();
    const ownerAlive = !ownerLocal || cleanupLeaseProcessAlive(Number(lock.owner_pid || 0));
    const active = checksumValid && identityValid && Number.isFinite(atMs) && Number.isFinite(expiresAtMs) && atMs < expiresAtMs && ownerAlive;
    return { file, present: true, valid: checksumValid && identityValid, active, abandoned: checksumValid && identityValid && !active, owner_alive: ownerAlive, lock };
}
function cleanupMetadataBackoffWait(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return;
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, Math.floor(ms)));
    }
    catch { }
}
function pruneCleanupMetadataArchives(directory, prefix, maxEntries) {
    let files = [];
    try {
        files = fs.readdirSync(directory, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
            .map(entry => {
            const file = path.join(directory, entry.name);
            let mtimeMs = 0;
            try {
                mtimeMs = fs.statSync(file).mtimeMs;
            }
            catch { }
            return { file, mtimeMs };
        })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
    }
    catch { }
    let pruned = 0;
    for (const row of files.slice(Math.max(1, maxEntries))) {
        try {
            fs.unlinkSync(row.file);
            pruned++;
        }
        catch { }
    }
    return pruned;
}
function acquireCleanupGroupLedgerLock(groupId, at, options = {}) {
    const atMs = Date.parse(at);
    const effectiveAtMs = Number.isFinite(atMs) ? atMs : Date.now();
    const ttlMs = Math.max(5_000, Math.min(60_000, Number(options.ttlMs || 15_000)));
    const maxWaitMs = Math.max(0, Math.min(2_000, Number(options.maxWaitMs ?? options.max_wait_ms ?? 120)));
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let waitedMs = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
        const status = readCleanupGroupLedgerLock(groupId, at);
        if (status.present) {
            if (!status.valid)
                return { acquired: false, reason: "cleanup_group_ledger_lock_invalid", status };
            if (status.active) {
                if (waitedMs >= maxWaitMs)
                    return { acquired: false, reason: "cleanup_group_ledger_lock_busy", status, waited_ms: waitedMs, retryable: true };
                const waitMs = Math.min(maxWaitMs - waitedMs, Math.max(4, Math.min(48, 4 * Math.pow(2, attempt))));
                cleanupMetadataBackoffWait(waitMs);
                waitedMs += waitMs;
                continue;
            }
            try {
                fs.renameSync(file, `${file}.abandoned.${(0, typed_memory_shared_1.checksum)(status.lock?.lock_id || String(Date.now()), 16)}.${crypto.randomBytes(3).toString("hex")}`);
            }
            catch {
                if (fs.existsSync(file))
                    continue;
            }
        }
        let fd = -1;
        try {
            fd = fs.openSync(file, "wx+");
            const lock = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-group-ledger-lock-v1",
                version: 1,
                lock_id: `delivery-cleanup-ledger-lock:${(0, typed_memory_shared_1.checksum)([groupId, effectiveAtMs, process.pid, crypto.randomBytes(8).toString("hex")], 32)}`,
                group_id: groupId,
                owner_instance_id: String(options.ownerInstanceId || typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID),
                owner_pid: process.pid,
                owner_hostname: os.hostname(),
                owner_role: String(options.ownerRole || "cleanup-ledger-writer"),
                acquired_at: at,
                expires_at: new Date(effectiveAtMs + ttlMs).toISOString(),
            };
            lock.lock_checksum = cleanupGroupLedgerLockChecksum(lock);
            fs.writeSync(fd, JSON.stringify(lock, null, 2), 0, "utf-8");
            fs.fsyncSync(fd);
            const prunedHistoryCount = pruneCleanupMetadataArchives(path.dirname(file), `${path.basename(file)}.abandoned.`, 32);
            return { acquired: true, waited_ms: waitedMs, handle: { fd, file, lock, released: false, waitedMs, prunedHistoryCount } };
        }
        catch (error) {
            if (fd >= 0)
                try {
                    fs.closeSync(fd);
                }
                catch { }
            if (error?.code === "EEXIST")
                continue;
            return { acquired: false, reason: "cleanup_group_ledger_lock_acquire_failed", error: String(error?.message || error) };
        }
    }
    return { acquired: false, reason: "cleanup_group_ledger_lock_contended" };
}
function cleanupGroupLedgerLockHeld(groupId, handle) {
    if (!handle || handle.released === true || Number(handle.fd) < 0)
        return false;
    const current = (0, typed_memory_shared_1.readJson)(handle.file, null);
    return !!current
        && String(current.group_id || "") === groupId
        && current.lock_id === handle.lock.lock_id
        && current.lock_checksum === cleanupGroupLedgerLockChecksum(current);
}
function releaseCleanupGroupLedgerLock(groupId, handle) {
    if (!handle || handle.released === true)
        return;
    const owned = cleanupGroupLedgerLockHeld(groupId, handle);
    try {
        fs.closeSync(handle.fd);
    }
    catch { }
    handle.released = true;
    handle.fd = -1;
    if (owned)
        try {
            fs.unlinkSync(handle.file);
        }
        catch { }
}
function withCleanupGroupLedgerLock(groupId, at, options, run) {
    const existing = options?.groupLedgerLockHandle || null;
    if (existing) {
        if (!cleanupGroupLedgerLockHeld(groupId, existing))
            throw new Error("cleanup_group_ledger_lock_lost");
        return run(existing);
    }
    const acquired = acquireCleanupGroupLedgerLock(groupId, at, options || {});
    if (!acquired.acquired)
        throw new Error(acquired.reason || "cleanup_group_ledger_lock_unavailable");
    try {
        return run(acquired.handle);
    }
    finally {
        releaseCleanupGroupLedgerLock(groupId, acquired.handle);
    }
}
function appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entry, at) {
    return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "quarantine-append" }, groupLedgerLockHandle => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
        const ledger = (0, typed_memory_shared_1.readJson)(file, {});
        const previous = Array.isArray(ledger.entries) ? ledger.entries : [];
        const quarantineId = String(entry.quarantine_id || `delivery-telemetry-quarantine:${(0, typed_memory_shared_1.checksum)([groupId, entry.source_path, entry.content_checksum, entry.reason], 24)}`);
        const normalized = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-entry-v1",
            quarantine_id: quarantineId,
            group_id: groupId,
            source_path: entry.source_path || "",
            evidence_path: entry.evidence_path || "",
            content_checksum: entry.content_checksum || "",
            reason: entry.reason || "unknown",
            status: entry.status || "quarantined",
            recovery_eligible: entry.recovery_eligible === true,
            first_seen_at: entry.first_seen_at || at,
            last_seen_at: at,
        };
        const byId = new Map(previous.map((row) => [String(row.quarantine_id || ""), row]));
        const existing = byId.get(quarantineId);
        byId.set(quarantineId, { ...existing, ...normalized, first_seen_at: existing?.first_seen_at || normalized.first_seen_at });
        const value = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, [...byId.values()], at, {
            compactedEntries: Array.isArray(ledger.compacted_entries) ? ledger.compacted_entries : [],
            expectedQuarantineChecksum: ledger.quarantine_checksum || "",
            groupLedgerLockHandle,
        });
        return { ...value, file, entry: value.entries.find((row) => row.quarantine_id === quarantineId) || byId.get(quarantineId) };
    });
}
function conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        compact_id: value.compact_id || "",
        group_id: value.group_id || "",
        reason: value.reason || "",
        cleaned_count: Number(value.cleaned_count || 0),
        first_seen_at: value.first_seen_at || "",
        last_cleaned_at: value.last_cleaned_at || "",
        quarantine_ids_root: value.quarantine_ids_root || "",
        cleanup_receipt_ids_root: value.cleanup_receipt_ids_root || "",
    }, 48);
}
function retainConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, compactedEntries, at, options = {}) {
    const unresolved = entries.filter((entry) => String(entry.status || "") !== "cleaned");
    const cleaned = entries.filter((entry) => String(entry.status || "") === "cleaned");
    const compactById = new Map();
    for (const entry of compactedEntries) {
        if (entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1"
            || String(entry.group_id || "") !== groupId
            || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(entry))
            continue;
        compactById.set(String(entry.compact_id || ""), entry);
    }
    const cleanedByReason = new Map();
    for (const entry of cleaned) {
        const reason = String(entry.reason || "unknown");
        cleanedByReason.set(reason, [...(cleanedByReason.get(reason) || []), entry]);
    }
    for (const [reason, rows] of cleanedByReason) {
        const compactId = `delivery-telemetry-quarantine-compact:${(0, typed_memory_shared_1.checksum)([groupId, reason], 24)}`;
        const existing = compactById.get(compactId) || null;
        const quarantineIds = rows.map((row) => row.quarantine_id).filter(Boolean).sort();
        const receiptIds = rows.map((row) => row.cleanup_receipt_id).filter(Boolean).sort();
        const compact = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1",
            version: 1,
            compact_id: compactId,
            group_id: groupId,
            reason,
            cleaned_count: Number(existing?.cleaned_count || 0) + rows.length,
            first_seen_at: [existing?.first_seen_at, ...rows.map((row) => row.first_seen_at)].filter(Boolean).sort()[0] || at,
            last_cleaned_at: [existing?.last_cleaned_at, ...rows.map((row) => row.cleaned_at)].filter(Boolean).sort().slice(-1)[0] || at,
            quarantine_ids_root: (0, typed_memory_shared_1.checksum)([existing?.quarantine_ids_root || "", quarantineIds], 48),
            cleanup_receipt_ids_root: (0, typed_memory_shared_1.checksum)([existing?.cleanup_receipt_ids_root || "", receiptIds], 48),
            terminal: true,
            compacted_at: at,
        };
        compact.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(compact);
        compactById.set(compactId, compact);
    }
    const maxCompactedEntries = Math.max(20, Math.min(500, Number(options.maxCompactedEntries || options.max_compacted_entries || 120)));
    const compacted = [...compactById.values()]
        .sort((a, b) => String(a.last_cleaned_at || "").localeCompare(String(b.last_cleaned_at || "")))
        .slice(-maxCompactedEntries);
    const recoveryProofs = unresolved.filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")));
    return {
        entries: unresolved.sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || ""))),
        compacted_entries: compacted,
        retention: {
            policy: "preserve_all_unresolved_and_latest_recovery_proof_compact_cleaned_terminal_only",
            unresolved_count: unresolved.length,
            cleaned_compacted_this_run_count: cleaned.length,
            compacted_summary_count: compacted.length,
            latest_recovery_proof_id: recoveryProofs[0]?.quarantine_id || "",
            max_compacted_entries: maxCompactedEntries,
        },
    };
}
// ===== merged from typed-memory-ledgers-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, at, options = {}) {
    return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
        const current = (0, typed_memory_shared_1.readJson)(file, {});
        const expectedChecksum = options.expectedQuarantineChecksum;
        if (expectedChecksum !== undefined && String(current.quarantine_checksum || "") !== String(expectedChecksum || "")) {
            throw new Error("cleanup_quarantine_revision_conflict");
        }
        const retained = retainConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, Array.isArray(options.compactedEntries) ? options.compactedEntries : [], at, options);
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
        if (!cleanupGroupLedgerLockHeld(groupId, groupLedgerLockHandle))
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
            const prunedHistoryCount = pruneCleanupMetadataArchives(path.dirname(file), `${path.basename(file)}.abandoned.`, 16);
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
    return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
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
        if (!cleanupGroupLedgerLockHeld(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
        return { ...value, file };
    });
}
function upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at, options = {}) {
    return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
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
    return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
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
        if (!cleanupGroupLedgerLockHeld(groupId, groupLedgerLockHandle))
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
    return withCleanupGroupLedgerLock(groupId, at, { ...options, ownerRole: options.ownerRole || "cleanup-commit-repair-resolution-transaction" }, groupLedgerLockHandle => {
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
        if (!cleanupGroupLedgerLockHeld(groupId, groupLedgerLockHandle))
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
// ===== merged from typed-memory-ledgers-part-03.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts(groupId, invalidRows, at) {
    return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-transaction-discovery" }, () => {
        const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId);
        const workItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId);
        const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId);
        const quarantineLedger = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
        const workItemLedger = (0, typed_memory_shared_1.readJson)(workItemFile, {});
        const briefLedger = (0, typed_memory_shared_1.readJson)(briefFile, {});
        if (Array.isArray(quarantineLedger.entries) && quarantineLedger.entries.length > 0
            && !cleanupCommitRepairResolutionTransactionArtifactLedgerValid(quarantineLedger, groupId, "evidence_checksum"))
            throw new Error("resolution transaction quarantine artifact ledger checksum invalid");
        if (Array.isArray(workItemLedger.entries) && workItemLedger.entries.length > 0
            && !cleanupCommitRepairResolutionTransactionArtifactLedgerValid(workItemLedger, groupId, "work_item_checksum"))
            throw new Error("resolution transaction repair work item ledger checksum invalid");
        if (Array.isArray(briefLedger.entries) && briefLedger.entries.length > 0
            && !cleanupCommitRepairResolutionTransactionArtifactLedgerValid(briefLedger, groupId, "brief_checksum"))
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
            evidence.evidence_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(evidence, "evidence_checksum");
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
            workItem.work_item_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(workItem, "work_item_checksum");
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
                required_files: [getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId), quarantineFile],
                should_create_real_task: false,
                created_at: briefById.get(briefId)?.created_at || at,
                updated_at: at,
            };
            brief.brief_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(brief, "brief_checksum");
            briefById.set(briefId, brief);
        }
        for (const [id, entry] of quarantineById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && entry.status === "quarantined_unproven_resolution_transaction") {
                const next = { ...entry, status: "contained_transaction_no_longer_invalid", contained_at: at, last_seen_at: at };
                next.evidence_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(next, "evidence_checksum");
                quarantineById.set(id, next);
            }
        }
        for (const [id, entry] of workItemById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && !["resolved", "cancelled"].includes(entry.status)) {
                const next = { ...entry, status: "resolved", resolved_at: at, updated_at: at };
                next.work_item_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(next, "work_item_checksum");
                workItemById.set(id, next);
            }
        }
        for (const [id, entry] of briefById) {
            if (!activeTransactionIds.has(entry.resolution_transaction_id) && entry.status !== "closed") {
                const next = { ...entry, status: "closed", closed_at: at, updated_at: at };
                next.brief_checksum = cleanupCommitRepairResolutionTransactionArtifactChecksum(next, "brief_checksum");
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
    return withCleanupGroupLedgerLock(groupId, at, { ...options, ownerRole: options.ownerRole || "cleanup-finalization" }, groupLedgerLockHandle => {
        if (!cleanupLeaseHeld(leaseHandle))
            throw new Error("cleanup_execution_lease_lost");
        let journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
        let receiptLedger = (0, typed_memory_distillation_receipts_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
        if (!journalLedger.ledger_checksum_valid)
            throw new Error("cleanup_journal_ledger_checksum_invalid");
        if (!receiptLedger.ledger_checksum_valid)
            throw new Error("cleanup_receipt_ledger_checksum_invalid");
        let journal = journalLedger.entries.find((entry) => entry.execution_id === journalInput.execution_id) || null;
        if (!journal || journal.journal_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal))
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
        const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
        let quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
        if (String(quarantine.group_id || "") !== groupId || quarantine.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine)) {
            throw new Error("cleanup_quarantine_checksum_invalid");
        }
        const candidateIds = new Set((journal.candidates || []).map((candidate) => String(candidate.quarantine_id || "")));
        const candidateIdsRoot = (0, typed_memory_shared_1.checksum)([...candidateIds].sort(), 48);
        const transactionId = `delivery-cleanup-commit:${(0, typed_memory_shared_1.checksum)([groupId, receipt.receipt_id, journal.execution_id, journal.receipt_checksum, candidateIdsRoot], 32)}`;
        const commitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
        if (!commitLedger.ledger_checksum_valid)
            throw new Error("cleanup_commit_ledger_checksum_invalid");
        let transaction = commitLedger.entries.find((entry) => entry.transaction_id === transactionId) || null;
        if (transaction) {
            if (transaction.transaction_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupCommitChecksum(transaction)
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
        transaction = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, {
            ...transaction,
            latest_fencing_token: Number(leaseHandle.lease.fencing_token || 0),
            recovery_count: Number(transaction.recovery_count || 0) + (recoveredTransaction ? 1 : 0),
        }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        maybeInterruptCleanupCommit(options, "prepared");
        let updatedQuarantine = { ...quarantine, file: quarantineFile };
        if (cleanupCommitPhaseRank(transaction.phase) < cleanupCommitPhaseRank("quarantine_committed")) {
            quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
            if (String(quarantine.group_id || "") !== groupId || quarantine.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine))
                throw new Error("cleanup_quarantine_checksum_invalid");
            const candidateRows = (quarantine.entries || []).filter((entry) => candidateIds.has(String(entry.quarantine_id || "")));
            if (candidateRows.some((entry) => entry.status === "cleaned" && entry.cleanup_receipt_id && entry.cleanup_receipt_id !== receipt.receipt_id))
                throw new Error("cleanup_candidate_claim_conflict");
            if (candidateRows.length > 0 && candidateRows.length !== candidateIds.size)
                throw new Error("cleanup_quarantine_partial_candidate_set");
            if (candidateRows.length > 0) {
                updatedQuarantine = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, (quarantine.entries || []).map((entry) => candidateIds.has(String(entry.quarantine_id || "")) ? {
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
            transaction = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, {
                ...transaction,
                phase: "quarantine_committed",
                quarantine_commit: {
                    revision: Number(updatedQuarantine.revision || 0),
                    checksum: updatedQuarantine.quarantine_checksum || "",
                    committed_at: at,
                },
            }, at, { ...options, groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" }).transaction;
        }
        maybeInterruptCleanupCommit(options, "quarantine_committed");
        if (cleanupCommitPhaseRank(transaction.phase) < cleanupCommitPhaseRank("receipt_committed")) {
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
            transaction = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, {
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
        maybeInterruptCleanupCommit(options, "receipt_committed");
        if (cleanupCommitPhaseRank(transaction.phase) < cleanupCommitPhaseRank("journal_committed")) {
            journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
            journal = journalLedger.entries.find((entry) => entry.execution_id === journal.execution_id) || journal;
            if (journal.status !== "completed") {
                journal = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, {
                    ...journal,
                    status: "completed",
                    completed_at: journal.completed_at || at,
                }, at, { leaseHandle, leaseStatus: "released", groupLedgerLockHandle, ownerRole: options.ownerRole || "cleanup-finalization" });
            }
            journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
            transaction = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, {
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
        maybeInterruptCleanupCommit(options, "journal_committed");
        transaction = upsertConflictResolutionMaintenanceNotificationDeliveryCleanupCommit(groupId, {
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
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const quarantine = (0, typed_memory_shared_1.readJson)(quarantineFile, {});
    if (quarantine.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1"
        || String(quarantine.group_id || "") !== groupId
        || quarantine.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine)) {
        throw new Error("delivery cleanup requires a valid group-local quarantine ledger");
    }
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    if (!generation.valid)
        throw new Error("delivery cleanup requires a valid current/previous delivery generation chain");
    const entries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    const latestRecoveryProofId = entries
        .filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0]?.quarantine_id || "";
    const requestedRaw = options.quarantineIds || options.quarantine_ids;
    const requested = Array.isArray(requestedRaw) ? new Set((0, typed_memory_shared_1.uniqueStrings)(requestedRaw, 1000)) : null;
    const coldDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId);
    const evidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId);
    const currentFile = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId));
    const previousFile = path.resolve(getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId));
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
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const present = fs.existsSync(file);
    const legacy = ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v1";
    const checksumValid = !present || legacy || (ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && ledger.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(ledger));
    const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
    const previous = (0, typed_memory_shared_1.readJson)(previousFile, null);
    const previousChainValid = !ledger.previous_ledger_checksum
        || (!!previous
            && previous.ledger_checksum === ledger.previous_ledger_checksum
            && previous.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(previous));
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
            && entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
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
            || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry))
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
        compact.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(compact);
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
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const previousRaw = options.previousLedgerOverride && typeof options.previousLedgerOverride === "object"
        ? options.previousLedgerOverride
        : (0, typed_memory_shared_1.readJson)(file, {});
    const previousValid = previousRaw.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && previousRaw.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(previousRaw);
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
    value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value);
    if (previousValid)
        (0, typed_memory_shared_1.writeJsonAtomic)(getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId), previousRaw);
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
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
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
            ...conflictResolutionMaintenanceScopeMetadata(groupId),
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
        ...conflictResolutionMaintenanceScopeMetadata(groupId),
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
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
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
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
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
    const verification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, { includeRows: true });
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
        const currentVerification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
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
        const file = conflictResolutionColdArchiveShardFile(groupId, relPath);
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
    const file = getGroupTypedMemoryRecallLedgerFile(groupId);
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
    const file = getGroupTypedMemoryConsumptionLedgerFile(scopedGroupId);
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
// ===== merged from typed-memory-ledgers-part-04.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function recordGroupTypedMemoryConsumptionLedger(groupId, input = {}) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const ledger = readGroupTypedMemoryConsumptionLedger(groupId);
    const scopedGroupId = String(ledger.group_id || groupId);
    const entries = ledger.ledger_checksum_valid === true ? [...ledger.entries] : [];
    const at = String(input.generatedAt || input.generated_at || (0, typed_memory_shared_1.now)());
    let rejectedCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    let downgradedVerifiedCount = 0;
    let upgradedObservationCount = 0;
    let recordedCount = 0;
    const existingIds = new Set(entries.map((entry) => String(entry.entry_id || "")));
    const existingObservationStates = new Map(entries.map((entry, index) => [
        String(entry.observation_id || typedMemoryConsumptionObservationId(scopedGroupId, entry, entry)),
        { state: normalizeTypedMemoryConsumptionUsageState(entry.usage_state), index, entryId: String(entry.entry_id || "") },
    ]));
    const incoming = rows.slice(0, 240).map((row) => ({
        row,
        claimedUsageState: normalizeTypedMemoryConsumptionUsageState(row.claimed_usage_state || row.claimedUsageState || row.usage_state || row.usageState || ""),
        observationId: typedMemoryConsumptionObservationId(scopedGroupId, row, input),
    }));
    const incomingStates = new Map();
    for (const candidate of incoming) {
        const states = incomingStates.get(candidate.observationId) || new Set();
        if (candidate.claimedUsageState)
            states.add(candidate.claimedUsageState);
        incomingStates.set(candidate.observationId, states);
    }
    const conflictingIncoming = new Set([...incomingStates.entries()].filter(([, states]) => states.size > 1).map(([id]) => id));
    conflictCount += conflictingIncoming.size;
    const seenIncoming = new Set();
    for (const candidate of incoming) {
        const { row, claimedUsageState, observationId } = candidate;
        const relPath = String(row.rel_path || row.relPath || "").trim();
        const documentChecksum = String(row.document_checksum || row.documentChecksum || "").trim();
        if (conflictingIncoming.has(observationId)) {
            rejectedCount += 1;
            continue;
        }
        if (seenIncoming.has(observationId)) {
            duplicateCount += 1;
            continue;
        }
        seenIncoming.add(observationId);
        const proofValid = row.current_source_proof_valid === true || row.currentSourceProofValid === true;
        const proofPath = String(row.current_source_relative_path || row.currentSourceRelativePath || "").trim();
        const claimedSourceChecksum = String(row.current_source_claimed_checksum || row.currentSourceClaimedChecksum || "").trim().toLowerCase();
        const observedSourceChecksum = String(row.current_source_observed_checksum || row.currentSourceObservedChecksum || "").trim().toLowerCase();
        const proofId = String(row.current_source_proof_id || row.currentSourceProofId || "").trim();
        const structurallyValidProof = proofValid && !!proofPath && /^[a-f0-9]{64}$/.test(claimedSourceChecksum)
            && claimedSourceChecksum === observedSourceChecksum && !!proofId;
        const usageState = claimedUsageState === "verified" && !structurallyValidProof ? "used" : claimedUsageState;
        if (claimedUsageState === "verified" && usageState !== "verified")
            downgradedVerifiedCount += 1;
        const evidenceValid = row.evidence_valid === true || row.evidenceValid === true;
        if (!relPath || !documentChecksum || !usageState || !evidenceValid) {
            rejectedCount += 1;
            continue;
        }
        const taskAgentSessionId = String(row.task_agent_session_id || row.taskAgentSessionId || "").trim();
        const snapshotId = String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || "").trim();
        const snapshotChecksum = String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || "").trim();
        const deliveryReceiptChecksum = String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || "").trim();
        if (!taskAgentSessionId || !snapshotId || !snapshotChecksum || !deliveryReceiptChecksum) {
            rejectedCount += 1;
            continue;
        }
        const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
        const taskId = String(row.task_id || row.taskId || input.taskId || input.task_id || "").trim();
        const executionId = String(row.execution_id || row.executionId || input.executionId || input.execution_id || "").trim();
        const previousObservation = existingObservationStates.get(observationId);
        if (previousObservation) {
            duplicateCount += 1;
            if (previousObservation.state === "mentioned" && usageState !== "mentioned") {
                const previousIndex = entries.findIndex((entry) => String(entry.observation_id || typedMemoryConsumptionObservationId(scopedGroupId, entry, entry)) === observationId);
                if (previousIndex >= 0) {
                    const [removed] = entries.splice(previousIndex, 1);
                    existingIds.delete(String(removed?.entry_id || previousObservation.entryId || ""));
                    upgradedObservationCount += 1;
                    duplicateCount -= 1;
                }
            }
            else if (usageState === "mentioned" || previousObservation.state === usageState) {
                continue;
            }
            else {
                conflictCount += 1;
                rejectedCount += 1;
                continue;
            }
        }
        const receiptEvidenceChecksum = String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || (0, typed_memory_shared_1.checksum)([
            row.memory_used || row.memoryUsed || [],
            row.memory_ignored || row.memoryIgnored || [],
            row.typed_memory_usage || row.typedMemoryUsage || [],
        ], 64));
        const entryId = `tmcu_${(0, typed_memory_shared_1.checksum)([
            scopedGroupId,
            targetProject,
            taskId,
            executionId,
            taskAgentSessionId,
            snapshotId,
            relPath,
            usageState,
            receiptEvidenceChecksum,
        ], 28)}`;
        if (existingIds.has(entryId)) {
            duplicateCount += 1;
            continue;
        }
        const anomalyCodes = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(row.anomaly_codes || row.anomalyCodes) ? (row.anomaly_codes || row.anomalyCodes) : []),
            ...(claimedUsageState === "verified" && usageState !== "verified" ? ["verified_without_system_current_source_proof"] : []),
        ]).slice(0, 12);
        const evidenceTier = structurallyValidProof && usageState === "verified"
            ? "system_current_source_file_proof"
            : String(row.evidence_tier || row.evidenceTier || (row.direct_reference === true ? "bound_structured_receipt" : "bound_text_receipt"));
        const evidenceConfidence = typedMemoryConsumptionEvidenceConfidence(row, usageState, structurallyValidProof);
        const payload = {
            schema: "ccm-group-typed-memory-consumption-entry-v1",
            version: 3,
            entry_id: entryId,
            observation_id: observationId,
            group_id: scopedGroupId,
            target_project: targetProject,
            agent_type: String(row.agent_type || row.agentType || ""),
            task_id: taskId,
            execution_id: executionId,
            task_agent_session_id: taskAgentSessionId,
            memory_context_snapshot_id: snapshotId,
            memory_context_snapshot_checksum: snapshotChecksum,
            delivery_receipt_checksum: deliveryReceiptChecksum,
            rel_path: relPath,
            name: (0, typed_memory_shared_1.compactText)(row.name || "", 160),
            type: String(row.type || ""),
            document_checksum: documentChecksum,
            usage_state: usageState,
            claimed_usage_state: claimedUsageState,
            current_source_verified: usageState === "verified" && structurallyValidProof,
            current_source_proof_valid: structurallyValidProof,
            current_source_relative_path: proofPath,
            current_source_claimed_checksum: claimedSourceChecksum,
            current_source_observed_checksum: observedSourceChecksum,
            current_source_proof_id: proofId,
            verification_status: structurallyValidProof ? "system_file_checksum_match" : claimedUsageState === "verified" ? "downgraded_missing_or_invalid_proof" : "not_requested",
            evidence_tier: evidenceTier,
            evidence_confidence: evidenceConfidence,
            anomaly_codes: anomalyCodes,
            lifecycle_state: String(row.lifecycle_state || row.lifecycleState || (usageState === "mentioned" ? "delivered_unreported" : usageState)),
            delivery_state: String(row.delivery_state || row.deliveryState || "delivered"),
            access_state: String(row.access_state || row.accessState || "capture_missing"),
            access_event_count: Math.max(0, Number(row.access_event_count || row.accessEventCount || 0)),
            access_evidence_checksum: String(row.access_evidence_checksum || row.accessEvidenceChecksum || ""),
            access_event_checksums: (0, typed_memory_shared_1.uniqueStrings)(row.access_event_checksums || row.accessEventChecksums || []).slice(0, 20),
            access_capture_status: String(row.access_capture_status || row.accessCaptureStatus || "capture_missing"),
            access_evidence_valid: row.access_evidence_valid === true || row.accessEvidenceValid === true,
            direct_reference: row.direct_reference === true || row.directReference === true,
            query_concepts: (0, typed_memory_shared_1.uniqueStrings)(row.query_concepts || row.queryConcepts || []).slice(0, 24),
            query_polarities: (0, typed_memory_shared_1.uniqueStrings)(row.query_polarities || row.queryPolarities || []).slice(0, 12),
            query_relations: (0, typed_memory_shared_1.uniqueStrings)(row.query_relations || row.queryRelations || []).slice(0, 12),
            reason: (0, typed_memory_shared_1.compactText)(row.reason || "", 500),
            receipt_evidence_checksum: receiptEvidenceChecksum,
            generated_at: String(row.generated_at || row.generatedAt || at),
        };
        const entry = { ...payload, checksum: typedMemoryConsumptionEntryChecksum(payload) };
        entries.push(entry);
        existingIds.add(entryId);
        existingObservationStates.set(observationId, { state: usageState, index: entries.length - 1, entryId });
        recordedCount += 1;
    }
    const retained = entries.sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || ""))).slice(-1200);
    const updatedAt = at;
    const payload = {
        schema: "ccm-group-typed-memory-consumption-ledger-v1",
        version: 1,
        group_id: scopedGroupId,
        entries: retained,
        updated_at: updatedAt,
        checksum: typedMemoryConsumptionLedgerChecksum(retained, updatedAt),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, payload);
    return {
        ...readGroupTypedMemoryConsumptionLedger(groupId),
        recorded_count: recordedCount,
        rejected_count: rejectedCount,
        duplicate_count: duplicateCount,
        conflict_count: conflictCount,
        downgraded_verified_count: downgradedVerifiedCount,
        upgraded_observation_count: upgradedObservationCount,
    };
}
function typedMemoryStaleCandidateLedgerChecksum(candidates, events, rejections, updatedAt) {
    return (0, typed_memory_shared_1.checksum)([
        1,
        candidates.map(candidate => candidate.checksum || ""),
        events.map(event => event.checksum || ""),
        rejections.map(rejection => rejection.checksum || ""),
        updatedAt,
    ], 64);
}
function readGroupTypedMemoryStaleCandidateLedger(groupId) {
    const scopeId = String(groupId || "").trim();
    const file = getGroupTypedMemoryStaleCandidateLedgerFile(scopeId);
    const state = (0, typed_memory_shared_1.readJson)(file, {
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        candidates: [],
        resolution_events: [],
        rejections: [],
        updated_at: "",
        checksum: "",
    });
    const rawCandidates = Array.isArray(state.candidates) ? state.candidates : [];
    const rawEvents = Array.isArray(state.resolution_events) ? state.resolution_events : [];
    const rawRejections = Array.isArray(state.rejections) ? state.rejections : [];
    const updatedAt = String(state.updated_at || "");
    const declaredChecksum = String(state.checksum || "");
    const computedChecksum = typedMemoryStaleCandidateLedgerChecksum(rawCandidates, rawEvents, rawRejections, updatedAt);
    const ledgerChecksumValid = rawCandidates.length === 0 && rawEvents.length === 0 && rawRejections.length === 0 && !declaredChecksum
        ? true
        : !!declaredChecksum && declaredChecksum === computedChecksum;
    const validCandidates = ledgerChecksumValid
        ? rawCandidates.filter((candidate) => String(candidate?.scope_id || "") === scopeId
            && String(candidate?.checksum || "") === (0, typed_memory_recall_1.typedMemoryStaleCandidateChecksum)(candidate || {}))
        : [];
    const validCandidateIds = new Set(validCandidates.map((candidate) => String(candidate.candidate_id || "")));
    const validCandidateChecksums = new Map(validCandidates.map((candidate) => [String(candidate.candidate_id || ""), String(candidate.checksum || "")]));
    const validEvents = ledgerChecksumValid
        ? rawEvents.filter((event) => String(event?.scope_id || "") === scopeId
            && validCandidateIds.has(String(event?.candidate_id || ""))
            && String(event?.candidate_checksum || "") === validCandidateChecksums.get(String(event?.candidate_id || ""))
            && String(event?.checksum || "") === (0, typed_memory_shared_1.typedMemoryStaleResolutionChecksum)(event || {}))
        : [];
    const validRejections = ledgerChecksumValid
        ? rawRejections.filter((rejection) => String(rejection?.scope_id || "") === scopeId
            && String(rejection?.checksum || "") === (0, typed_memory_shared_1.typedMemoryStaleRejectionChecksum)(rejection || {}))
        : [];
    const integrityValid = ledgerChecksumValid
        && String(state.scope_id || "") === scopeId
        && validCandidates.length === rawCandidates.length
        && validEvents.length === rawEvents.length
        && validRejections.length === rawRejections.length;
    const latestEvent = new Map();
    for (const event of validEvents)
        latestEvent.set(String(event.candidate_id || ""), event);
    const candidates = validCandidates.map((candidate) => {
        const resolution = latestEvent.get(String(candidate.candidate_id || ""));
        return {
            ...candidate,
            status: resolution?.status === "applied" ? "applied" : resolution?.status === "rejected" ? "rejected" : "pending",
            resolution: resolution || null,
        };
    });
    return {
        ...state,
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        exact_session_scope: (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId),
        candidates,
        resolution_events: validEvents,
        rejections: validRejections,
        raw_candidate_count: rawCandidates.length,
        valid_candidate_count: validCandidates.length,
        invalid_candidate_count: rawCandidates.length - validCandidates.length,
        invalid_resolution_event_count: rawEvents.length - validEvents.length,
        invalid_rejection_count: rawRejections.length - validRejections.length,
        pending_count: candidates.filter((candidate) => candidate.status === "pending").length,
        applied_count: candidates.filter((candidate) => candidate.status === "applied").length,
        rejected_count: candidates.filter((candidate) => candidate.status === "rejected").length,
        ledger_checksum_valid: integrityValid,
        envelope_checksum_valid: ledgerChecksumValid,
        computed_checksum: computedChecksum,
        file,
    };
}
function writeGroupTypedMemoryStaleCandidateLedger(scopeId, input) {
    const file = getGroupTypedMemoryStaleCandidateLedgerFile(scopeId);
    const candidates = Array.isArray(input.candidates) ? input.candidates : [];
    const resolutionEvents = Array.isArray(input.resolution_events) ? input.resolution_events : [];
    const rejections = Array.isArray(input.rejections) ? input.rejections.slice(-600) : [];
    const updatedAt = String(input.updated_at || (0, typed_memory_shared_1.now)());
    const payload = {
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        candidates,
        resolution_events: resolutionEvents,
        rejections,
        updated_at: updatedAt,
        checksum: typedMemoryStaleCandidateLedgerChecksum(candidates, resolutionEvents, rejections, updatedAt),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, payload);
    return readGroupTypedMemoryStaleCandidateLedger(scopeId);
}
function typedMemoryConsumptionQueryRelevance(entry, queryFeatures) {
    const currentConcepts = new Set(queryFeatures?.concepts || []);
    const historicalConcepts = new Set(entry.query_concepts || []);
    const currentRelations = new Set(queryFeatures?.relations || []);
    const historicalRelations = new Set(entry.query_relations || []);
    if (!currentConcepts.size || !historicalConcepts.size)
        return { relevant: false, concept_coverage: 0, relation_match: false };
    const conceptOverlap = [...currentConcepts].filter(concept => historicalConcepts.has(concept)).length;
    const conceptCoverage = conceptOverlap / Math.max(1, Math.min(currentConcepts.size, historicalConcepts.size));
    const relationMatch = [...currentRelations].some(relation => historicalRelations.has(relation));
    return { relevant: conceptCoverage >= 0.5 || relationMatch, concept_coverage: (0, typed_memory_recall_1.roundSemanticRecallScore)(conceptCoverage, 4), relation_match: relationMatch };
}
function buildGroupTypedMemoryConsumptionSummary(groupId, options = {}) {
    const ledger = readGroupTypedMemoryConsumptionLedger(groupId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const queryFeatures = options.queryFeatures || options.query_features || (0, typed_memory_recall_1.semanticRecallFeatures)(options.query || "");
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const halfLifeDays = Math.max(1, Number(options.halfLifeDays || options.half_life_days || typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_HALF_LIFE_DAYS));
    const staleAfterDays = Math.max(halfLifeDays, Number(options.staleAfterDays || options.stale_after_days || typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_STALE_AFTER_DAYS));
    const rows = (ledger.entries || []).filter((entry) => {
        const entryProject = String(entry.target_project || "").trim().toLowerCase();
        return !targetProject || !entryProject || targetProject === entryProject;
    }).map((entry) => {
        const generatedMs = Date.parse(String(entry.generated_at || ""));
        const ageDays = Number.isFinite(generatedMs) ? Math.max(0, (nowMs - generatedMs) / 86_400_000) : staleAfterDays + 1;
        const decayWeight = ageDays > staleAfterDays ? 0 : Math.pow(0.5, ageDays / halfLifeDays);
        const relevance = typedMemoryConsumptionQueryRelevance(entry, queryFeatures);
        return {
            ...entry,
            age_days: (0, typed_memory_recall_1.roundSemanticRecallScore)(ageDays, 3),
            decay_weight: (0, typed_memory_recall_1.roundSemanticRecallScore)(decayWeight, 4),
            stale: ageDays > staleAfterDays,
            query_relevant: relevance.relevant,
            query_concept_coverage: relevance.concept_coverage,
            query_relation_match: relevance.relation_match,
            evidence_confidence: Number(entry.evidence_confidence ?? (Number(entry.version || 1) >= 2 ? 0.4 : entry.usage_state === "verified" ? 0.65 : 0.75)),
            evidence_tier: String(entry.evidence_tier || (Number(entry.version || 1) >= 2 ? "unknown" : "legacy_bound_receipt")),
            verification_status: String(entry.verification_status || (entry.usage_state === "verified" ? "legacy_unproven" : "not_requested")),
            anomaly_codes: Array.isArray(entry.anomaly_codes) ? entry.anomaly_codes : (entry.usage_state === "verified" && Number(entry.version || 1) < 2 ? ["legacy_verified_without_system_proof"] : []),
        };
    });
    return {
        schema: "ccm-group-typed-memory-consumption-summary-v1",
        version: 1,
        group_id: groupId,
        target_project: targetProject,
        ledger_file: ledger.file,
        ledger_checksum_valid: ledger.ledger_checksum_valid === true,
        invalid_entry_count: Number(ledger.invalid_entry_count || 0),
        entry_count: rows.length,
        relevant_entry_count: rows.filter((row) => row.query_relevant && !row.stale).length,
        stale_entry_count: rows.filter((row) => row.stale).length,
        proof_verified_entry_count: rows.filter((row) => row.usage_state === "verified" && row.current_source_proof_valid === true).length,
        downgraded_verified_entry_count: rows.filter((row) => row.claimed_usage_state === "verified" && row.usage_state !== "verified").length,
        anomaly_entry_count: rows.filter((row) => Array.isArray(row.anomaly_codes) && row.anomaly_codes.length > 0).length,
        average_evidence_confidence: rows.length
            ? (0, typed_memory_recall_1.roundSemanticRecallScore)(rows.reduce((sum, row) => sum + Number(row.evidence_confidence || 0), 0) / rows.length, 4)
            : 0,
        rows,
        query_concepts: queryFeatures.concepts || [],
        query_polarities: queryFeatures.polarities || [],
        query_relations: queryFeatures.relations || [],
        half_life_days: halfLifeDays,
        stale_after_days: staleAfterDays,
    };
}
function scoreGroupTypedMemoryConsumptionRecall(doc, summary) {
    const relPath = String(doc.relPath || doc.rel_path || "").toLowerCase();
    const documentChecksum = String(doc.checksum || "");
    const matches = (summary.rows || []).filter((row) => String(row.rel_path || "").toLowerCase() === relPath
        && String(row.document_checksum || "") === documentChecksum
        && row.query_relevant === true
        && row.stale !== true
        && Number(row.decay_weight || 0) > 0);
    const weighted = { verified: 0, used: 0, ignored: 0, mentioned: 0 };
    for (const row of matches) {
        const state = normalizeTypedMemoryConsumptionUsageState(row.usage_state);
        if (!(state in weighted))
            continue;
        weighted[state] += Number(row.decay_weight || 0) * Number(row.evidence_confidence || 0);
    }
    const positive = weighted.verified * 6 + weighted.used * 4;
    const negative = weighted.ignored * 5;
    const conflictRatio = Math.min(positive, negative) / Math.max(1, Math.max(positive, negative));
    const conflict = positive >= 1 && negative >= 1 && conflictRatio >= 0.35;
    const adjustment = conflict ? 0 : Math.max(-10, Math.min(8, (0, typed_memory_recall_1.roundSemanticRecallScore)(positive - negative, 3)));
    return {
        schema: "ccm-group-typed-memory-consumption-recall-score-v1",
        adjustment,
        matched_count: matches.length,
        weighted: Object.fromEntries(Object.entries(weighted).map(([key, value]) => [key, (0, typed_memory_recall_1.roundSemanticRecallScore)(value, 4)])),
        positive_score: (0, typed_memory_recall_1.roundSemanticRecallScore)(positive, 3),
        negative_score: (0, typed_memory_recall_1.roundSemanticRecallScore)(negative, 3),
        conflict,
        conflict_ratio: (0, typed_memory_recall_1.roundSemanticRecallScore)(conflictRatio, 4),
        current_document_checksum: documentChecksum,
        matched_entries: matches.slice(-8).map((row) => ({
            entry_id: row.entry_id,
            usage_state: row.usage_state,
            age_days: row.age_days,
            decay_weight: row.decay_weight,
            evidence_confidence: row.evidence_confidence,
            evidence_tier: row.evidence_tier,
            verification_status: row.verification_status,
            anomaly_codes: row.anomaly_codes || [],
            task_agent_session_id: row.task_agent_session_id,
            memory_context_snapshot_id: row.memory_context_snapshot_id,
        })),
    };
}
//# sourceMappingURL=typed-memory-ledgers.js.map