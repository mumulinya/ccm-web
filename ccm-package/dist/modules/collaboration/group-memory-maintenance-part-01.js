"use strict";
// Behavior-freeze split from group-memory-maintenance.ts (part 1/3).
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile;
exports.acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile;
exports.writeCleanupCommitDiscoveryArtifacts = writeCleanupCommitDiscoveryArtifacts;
exports.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile;
exports.writeCleanupCommitRepairWorkItems = writeCleanupCommitRepairWorkItems;
exports.writeCleanupCommitRepairBriefs = writeCleanupCommitRepairBriefs;
exports.writeCleanupCommitRepairAssignments = writeCleanupCommitRepairAssignments;
exports.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem = updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem;
exports.writeCleanupCommitRepairResolutionReceipts = writeCleanupCommitRepairResolutionReceipts;
exports.readCleanupCommitRepairResolutionTransactionLedger = readCleanupCommitRepairResolutionTransactionLedger;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment;
exports.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const group_memory_index_1 = require("./group-memory-index");
const group_memory_maintenance_part_02_1 = require("./group-memory-maintenance-part-02");
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "manifest.json");
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options = {}) {
    const explicitManifest = options.manifest && typeof options.manifest === "object" ? options.manifest : null;
    const manifest = explicitManifest || (0, group_memory_index_1.readConflictResolutionColdArchiveManifest)(groupId);
    if (!manifest) {
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-archive-verification-v1",
            groupId,
            status: "missing",
            valid: false,
            manifestFile: getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId),
            manifest: null,
            shardCount: 0,
            verifiedShardCount: 0,
            rowCount: 0,
            rows: [],
            gaps: ["cold_archive_manifest_missing"],
        };
    }
    const manifestChecksumValid = manifest.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-manifest-v1"
        && String(manifest.group_id || "") === groupId
        && String(manifest.manifest_checksum || "") === (0, group_memory_index_1.conflictResolutionColdArchiveManifestChecksum)(manifest);
    const shardResults = (Array.isArray(manifest.shards) ? manifest.shards : []).map((descriptor) => (0, group_memory_index_1.readAndVerifyConflictResolutionColdArchiveShard)(groupId, descriptor));
    const rows = shardResults.flatMap((result) => result.valid ? result.rows : []);
    const rowIds = rows.map((row) => String(row.row_id || "")).filter(Boolean);
    const uniqueRowIds = new Set(rowIds);
    const rowsChecksumValid = rows.length === Number(manifest.row_count || 0)
        && uniqueRowIds.size === rows.length
        && (0, group_memory_index_1.checksum)([...rows].sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || ""))), 48) === String(manifest.rows_checksum || "");
    const valid = manifestChecksumValid && shardResults.every((result) => result.valid) && rowsChecksumValid;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-archive-verification-v1",
        groupId,
        status: valid ? "ok" : "fail",
        valid,
        manifestFile: options.manifestFile || options.manifest_file || manifest.file || getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId),
        manifest,
        manifestChecksumValid,
        shardCount: shardResults.length,
        verifiedShardCount: shardResults.filter((result) => result.valid).length,
        rowCount: rows.length,
        rows: options.includeRows === true || options.include_rows === true ? rows : [],
        shardResults: shardResults.map((result) => ({
            valid: result.valid,
            file: result.file,
            bucket: result.descriptor?.bucket || "",
            rowCount: result.rows.length,
            contentChecksum: result.descriptor?.content_checksum || "",
            calculatedChecksum: result.calculatedChecksum,
            error: result.error,
        })),
        gaps: [
            ...(!manifestChecksumValid ? ["cold_archive_manifest_checksum_mismatch"] : []),
            ...shardResults.filter((result) => !result.valid).map((result) => `cold_archive_shard_invalid:${result.descriptor?.bucket || "unknown"}`),
            ...(!rowsChecksumValid ? ["cold_archive_rows_checksum_or_count_mismatch"] : []),
        ],
    };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options = {}) {
    const currentManifest = (0, group_memory_index_1.readConflictResolutionColdArchiveManifest)(groupId);
    const current = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
        manifest: currentManifest,
        manifestFile: currentManifest?.file,
        includeRows: true,
    });
    const generationNumber = Number(currentManifest?.generation_number || 0);
    const currentGenerationFile = currentManifest?.manifest_checksum
        ? (0, group_memory_index_1.getConflictResolutionColdArchiveManifestGenerationFile)(groupId, currentManifest.manifest_checksum)
        : "";
    const currentGenerationManifest = currentGenerationFile ? (0, group_memory_index_1.readJson)(currentGenerationFile, null) : null;
    const currentGenerationCopyValid = !!currentGenerationManifest
        && currentGenerationManifest.manifest_checksum === currentManifest?.manifest_checksum
        && (0, group_memory_index_1.conflictResolutionColdArchiveManifestChecksum)(currentGenerationManifest) === currentManifest?.manifest_checksum;
    const previousManifest = currentManifest ? (0, group_memory_index_1.readPreviousConflictResolutionColdArchiveManifest)(groupId, currentManifest) : null;
    const previousRequired = generationNumber >= 2 || !!currentManifest?.previous_manifest_checksum;
    const previous = previousManifest && !previousManifest.invalidLink && !previousManifest.missing
        ? verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
            manifest: previousManifest,
            manifestFile: previousManifest.file,
            includeRows: true,
        })
        : null;
    const linkValid = !previousRequired || (!!previousManifest
        && !previousManifest.invalidLink
        && !previousManifest.missing
        && String(previousManifest.manifest_checksum || "") === String(currentManifest?.previous_manifest_checksum || "")
        && Number(previousManifest.generation_number || Math.max(1, generationNumber - 1)) < generationNumber);
    const currentRowIds = new Set((current.rows || []).map((row) => String(row.row_id || "")));
    const previousRowsRecoverable = !previousRequired || (previous?.valid === true
        && (previous.rows || []).every((row) => currentRowIds.has(String(row.row_id || ""))));
    const valid = current.valid === true
        && currentGenerationCopyValid
        && (!previousRequired || previous?.valid === true)
        && linkValid
        && previousRowsRecoverable;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-generation-verification-v1",
        groupId,
        status: valid ? "ok" : "fail",
        valid,
        generationNumber,
        currentManifestChecksum: currentManifest?.manifest_checksum || "",
        currentGenerationFile,
        currentGenerationCopyValid,
        previousManifestChecksum: currentManifest?.previous_manifest_checksum || "",
        previousRequired,
        current,
        previous,
        linkValid,
        previousRowsRecoverable,
        recoverySimulationPassed: valid && previousRowsRecoverable,
        gaps: [
            ...(current.valid ? [] : ["current_manifest_generation_invalid"]),
            ...(currentGenerationCopyValid ? [] : ["current_manifest_generation_copy_invalid"]),
            ...(previousRequired && previous?.valid !== true ? ["previous_manifest_generation_invalid"] : []),
            ...(!linkValid ? ["manifest_generation_link_invalid"] : []),
            ...(!previousRowsRecoverable ? ["previous_generation_rows_not_recoverable_from_current"] : []),
        ],
    };
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options = {}) {
    const generationsDir = (0, group_memory_index_1.getConflictResolutionColdArchiveManifestGenerationsDir)(groupId);
    const candidates = [];
    try {
        for (const name of fs.readdirSync(generationsDir).filter(name => name.endsWith(".json"))) {
            const file = path.join(generationsDir, name);
            const manifest = (0, group_memory_index_1.readJson)(file, null);
            if (!manifest || String(manifest.group_id || "") !== groupId)
                continue;
            const verification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
                manifest,
                manifestFile: file,
            });
            if (verification.valid)
                candidates.push({ manifest, file, verification });
        }
    }
    catch { }
    candidates.sort((a, b) => Number(b.manifest.generation_number || 0) - Number(a.manifest.generation_number || 0)
        || String(b.manifest.updated_at || "").localeCompare(String(a.manifest.updated_at || "")));
    const selected = candidates[0] || null;
    if (!selected)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-recovery-v1",
            groupId,
            status: "blocked",
            recovered: false,
            reason: "no_valid_manifest_generation",
            candidateCount: candidates.length,
        };
    const current = (0, group_memory_index_1.readConflictResolutionColdArchiveManifest)(groupId);
    const currentValid = current
        ? verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, { manifest: current, manifestFile: current.file }).valid === true
        : false;
    const alreadyCurrent = currentValid && current?.manifest_checksum === selected.manifest.manifest_checksum;
    if (!alreadyCurrent && options.dryRun !== true && options.dry_run !== true) {
        (0, group_memory_index_1.writeJsonAtomic)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId), selected.manifest);
    }
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-recovery-v1",
        groupId,
        status: alreadyCurrent ? "already_current" : options.dryRun === true || options.dry_run === true ? "recoverable" : "recovered",
        recovered: alreadyCurrent || !(options.dryRun === true || options.dry_run === true),
        alreadyCurrent,
        candidateCount: candidates.length,
        selectedGenerationNumber: Number(selected.manifest.generation_number || 0),
        selectedManifestChecksum: selected.manifest.manifest_checksum || "",
        selectedManifestFile: selected.file,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "quarantine.json");
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options = {}) {
    const at = String(options.at || options.generatedAt || options.generated_at || (0, group_memory_index_1.now)());
    const atMs = Date.parse(at);
    const gracePeriodMs = Math.max(0, Number(options.gracePeriodMs ?? options.grace_period_ms ?? 7 * 24 * 60 * 60 * 1000));
    const deleteEligible = options.deleteEligible === true || options.delete_eligible === true;
    const dryRun = options.dryRun === true || options.dry_run === true;
    const rawAllowedRelPaths = options.allowedRelPaths || options.allowed_rel_paths;
    const approvalRestricted = Array.isArray(rawAllowedRelPaths);
    const allowedRelPaths = new Set((0, group_memory_index_1.uniqueStrings)(Array.isArray(rawAllowedRelPaths) ? rawAllowedRelPaths : [], 5000));
    const generationHealth = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    const currentManifest = generationHealth.current?.manifest || {};
    const previousManifest = generationHealth.previous?.manifest || {};
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const referenced = new Set([
        ...(currentManifest.shards || []).map((shard) => String(shard.rel_path || "")),
        ...(previousManifest.shards || []).map((shard) => String(shard.rel_path || "")),
    ]);
    const currentRowIds = new Set((generationHealth.current?.rows || []).map((row) => String(row.row_id || "")));
    const openRepairEntryIds = (0, group_memory_index_1.conflictResolutionOpenRepairEntryIds)(groupId);
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId);
    const existing = (0, group_memory_index_1.readJson)(quarantineFile, {});
    const existingPresent = fs.existsSync(quarantineFile);
    const existingValid = !existingPresent || (existing.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1"
        && String(existing.group_id || "") === groupId
        && String(existing.quarantine_checksum || "") === (0, group_memory_index_1.conflictResolutionQuarantineChecksum)(existing));
    const existingByPath = new Map((existingValid && Array.isArray(existing.entries) ? existing.entries : []).map((entry) => [String(entry.rel_path || ""), entry]));
    const shardFiles = (0, group_memory_index_1.listConflictResolutionColdArchiveShardFiles)(groupId);
    const orphanFiles = shardFiles.filter(file => !referenced.has(path.relative(typedDir, file).split(path.sep).join("/")));
    const rows = [];
    for (const file of orphanFiles) {
        const relPath = path.relative(typedDir, file).split(path.sep).join("/");
        const previous = existingByPath.get(relPath) || null;
        const shard = (0, group_memory_index_1.readStandaloneConflictResolutionColdArchiveShard)(groupId, file);
        const resolutionEntryIds = (0, group_memory_index_1.uniqueStrings)((shard.rows || []).map((row) => row.resolution_entry_id), (shard.rows || []).length || 1);
        const referencedByOpenRepair = resolutionEntryIds.some((entryId) => openRepairEntryIds.has(entryId));
        const recoveryCovered = shard.valid === true && (shard.rows || []).every((row) => currentRowIds.has(String(row.row_id || "")));
        const firstSeenAt = String(previous?.first_seen_at || at);
        const firstSeenMs = Date.parse(firstSeenAt);
        const eligibleAfterMs = Number.isFinite(firstSeenMs) ? firstSeenMs + gracePeriodMs : Number.POSITIVE_INFINITY;
        const eligibleAfter = Number.isFinite(eligibleAfterMs) ? new Date(eligibleAfterMs).toISOString() : "";
        const graceElapsed = !!previous && Number.isFinite(atMs) && Number.isFinite(eligibleAfterMs) && atMs >= eligibleAfterMs;
        const explicitlyApproved = !approvalRestricted || allowedRelPaths.has(relPath);
        const canDelete = deleteEligible
            && !dryRun
            && !!previous
            && existingValid
            && graceElapsed
            && generationHealth.valid === true
            && generationHealth.previousRequired === true
            && generationHealth.previous?.valid === true
            && generationHealth.recoverySimulationPassed === true
            && shard.valid === true
            && recoveryCovered
            && !referencedByOpenRepair
            && explicitlyApproved;
        let status = !existingValid ? "blocked_quarantine_integrity"
            : referencedByOpenRepair ? "protected_open_repair"
                : !shard.valid ? "blocked_invalid_shard"
                    : !generationHealth.valid ? "blocked_manifest_generation"
                        : !recoveryCovered ? "blocked_recovery_simulation"
                            : graceElapsed && !explicitlyApproved ? "awaiting_explicit_approval"
                                : graceElapsed ? "eligible" : "quarantined";
        let deletedAt = String(previous?.deleted_at || "");
        if (canDelete) {
            fs.unlinkSync(file);
            status = "deleted";
            deletedAt = at;
        }
        rows.push({
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-shard-v1",
            group_id: groupId,
            rel_path: relPath,
            content_checksum: shard.shard?.content_checksum || path.basename(file, ".json"),
            row_count: (shard.rows || []).length,
            row_ids_checksum: (0, group_memory_index_1.checksum)((shard.rows || []).map((row) => row.row_id), 48),
            resolution_entry_ids: resolutionEntryIds,
            first_seen_at: firstSeenAt,
            last_seen_at: at,
            eligible_after: eligibleAfter,
            grace_elapsed: graceElapsed,
            shard_valid: shard.valid === true,
            recovery_covered: recoveryCovered,
            referenced_by_open_repair: referencedByOpenRepair,
            explicitly_approved: explicitlyApproved,
            status,
            deleted_at: deletedAt,
            error: shard.error || "",
        });
    }
    for (const entry of existingValid && Array.isArray(existing.entries) ? existing.entries : []) {
        if (rows.some(row => row.rel_path === entry.rel_path))
            continue;
        if (entry.status === "deleted")
            rows.push(entry);
    }
    const quarantine = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1",
        version: group_memory_index_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
        group_id: groupId,
        current_manifest_checksum: currentManifest.manifest_checksum || "",
        previous_manifest_checksum: previousManifest.manifest_checksum || "",
        grace_period_ms: gracePeriodMs,
        generation_chain_valid: generationHealth.valid === true,
        recovery_simulation_passed: generationHealth.recoverySimulationPassed === true,
        quarantine_input_valid: existingValid,
        orphan_count: rows.filter(row => row.status !== "deleted").length,
        quarantined_count: rows.filter(row => row.status === "quarantined").length,
        protected_open_repair_count: rows.filter(row => row.status === "protected_open_repair").length,
        eligible_count: rows.filter(row => row.status === "eligible").length,
        deleted_count: rows.filter(row => row.status === "deleted").length,
        blocked_count: rows.filter(row => String(row.status || "").startsWith("blocked_")).length,
        entries: rows.sort((a, b) => String(a.rel_path || "").localeCompare(String(b.rel_path || ""))),
        updated_at: at,
    };
    quarantine.quarantine_checksum = (0, group_memory_index_1.conflictResolutionQuarantineChecksum)(quarantine);
    if (!dryRun && existingValid)
        (0, group_memory_index_1.writeJsonAtomic)(quarantineFile, quarantine);
    return {
        ...quarantine,
        file: quarantineFile,
        dry_run: dryRun,
        delete_eligible: deleteEligible,
        generation_health: generationHealth,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-ledger.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "gc-approval-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notifications.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-deliveries.json");
}
function acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return (0, group_memory_index_1.createConflictResolutionMaintenanceNotificationReceipt)(groupId, "acknowledged", input);
}
function suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return (0, group_memory_index_1.createConflictResolutionMaintenanceNotificationReceipt)(groupId, "suppressed", input);
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, options = {}) {
    const at = String(options.at || options.now || (0, group_memory_index_1.now)());
    const atMs = Date.parse(at);
    const ledger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationReceiptLedger)(groupId);
    const entries = ledger.entries.map((receipt) => {
        const checksumValid = receipt.receipt_checksum === (0, group_memory_index_1.conflictResolutionMaintenanceNotificationReceiptChecksum)(receipt);
        const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
        const valid = receipt.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-v1"
            && String(receipt.group_id || "") === groupId
            && new Set(["acknowledged", "suppressed"]).has(String(receipt.receipt_kind || ""))
            && receipt.actor_role === receipt.audience
            && receipt.advisory_visibility_only === true
            && receipt.destructive_action_authorized === false
            && receipt.should_create_real_task === false
            && checksumValid
            && Number.isFinite(expiresAtMs)
            && Number.isFinite(atMs)
            && atMs <= expiresAtMs;
        return { ...receipt, checksum_valid: checksumValid, expired: Number.isFinite(expiresAtMs) && Number.isFinite(atMs) ? atMs > expiresAtMs : true, valid };
    });
    return {
        ...ledger,
        entries,
        valid_receipt_count: entries.filter((entry) => entry.valid).length,
        invalid_receipt_count: entries.filter((entry) => !entry.valid).length,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-quarantine.json");
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId) {
    const currentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const previousFile = (0, group_memory_index_1.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile)(groupId);
    const current = (0, group_memory_index_1.verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate)(groupId, currentFile);
    const previous = (0, group_memory_index_1.verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate)(groupId, previousFile);
    const previousRequired = current.valid && !!current.value?.previous_ledger_checksum;
    const chainValid = !previousRequired || (previous.valid && current.value.previous_ledger_checksum === previous.ledger_checksum);
    const recoverable = !current.valid && previous.valid;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-generation-verification-v1",
        group_id: groupId,
        status: current.valid && chainValid ? "ok" : recoverable ? "recoverable" : current.present || previous.present ? "blocked" : "empty",
        valid: current.valid && chainValid,
        recoverable,
        current,
        previous,
        previous_required: previousRequired,
        chain_valid: chainValid,
        gaps: [
            ...(!current.valid && current.present ? [current.error] : []),
            ...(previousRequired && !previous.valid ? [previous.error || "delivery_previous_invalid"] : []),
            ...(!chainValid ? ["delivery_generation_chain_invalid"] : []),
        ],
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-ledger.lock");
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId, options = {}) {
    const at = String(options.at || options.now || (0, group_memory_index_1.now)());
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const ledger = (0, group_memory_index_1.readJson)(file, {});
    const present = fs.existsSync(file);
    if (!present)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
            group_id: groupId,
            status: "empty",
            destructive_action_authorized: false,
            created_task_count: 0,
            created_approval_receipt_count: 0,
            deleted_count: 0,
        };
    if (String(ledger.group_id || "") !== groupId || ledger.quarantine_checksum !== (0, group_memory_index_1.conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum)(ledger))
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
            group_id: groupId,
            status: "blocked",
            reason: "delivery_quarantine_checksum_invalid",
            destructive_action_authorized: false,
            created_task_count: 0,
            created_approval_receipt_count: 0,
            deleted_count: 0,
        };
    const written = (0, group_memory_index_1.writeConflictResolutionMaintenanceNotificationDeliveryQuarantine)(groupId, ledger.entries || [], at, {
        ...options,
        compactedEntries: ledger.compacted_entries || [],
        expectedQuarantineChecksum: ledger.quarantine_checksum || "",
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
        group_id: groupId,
        status: "ok",
        retention: written.retention,
        quarantine_checksum: written.quarantine_checksum,
        unresolved_count: written.entries.length,
        compacted_count: written.compacted_quarantine_count,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
        file,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-journals.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId, receiptId) {
    const directory = path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-leases");
    return path.join(directory, `${(0, group_memory_index_1.checksum)([groupId, receiptId], 32)}.json`);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commits.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-quarantine.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-work-items.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-dispatch-briefs.json");
}
function writeCleanupCommitDiscoveryArtifacts(groupId, invalidRows, at) {
    return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-discovery-artifacts" }, () => {
        const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId);
        const workItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
        const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
        const quarantineCurrent = (0, group_memory_index_1.readJson)(quarantineFile, {});
        const workItemCurrent = (0, group_memory_index_1.readJson)(workItemFile, {});
        const briefCurrent = (0, group_memory_index_1.readJson)(briefFile, {});
        const transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
        if (!transactionLedger.ledger_checksum_valid)
            throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
        const resolutionBoundWorkItemIds = new Set(transactionLedger.entries.map((entry) => entry.work_item_id));
        const quarantineById = new Map((quarantineCurrent.entries || []).map((entry) => [entry.quarantine_id, entry]));
        const workItemById = new Map((workItemCurrent.entries || []).map((entry) => [entry.work_item_id, entry]));
        const briefById = new Map((briefCurrent.entries || []).map((entry) => [entry.brief_id, entry]));
        for (const row of invalidRows) {
            const gapsRoot = (0, group_memory_index_1.checksum)(row.gaps || [], 32);
            const quarantineId = `cleanup-commit-quarantine:${(0, group_memory_index_1.checksum)([groupId, row.transaction?.transaction_id || row.transaction_id, gapsRoot], 24)}`;
            const workItemId = `cleanup-commit-repair:${(0, group_memory_index_1.checksum)([groupId, quarantineId], 24)}`;
            const briefId = `cleanup-commit-repair-brief:${(0, group_memory_index_1.checksum)([groupId, workItemId], 24)}`;
            if (resolutionBoundWorkItemIds.has(workItemId))
                continue;
            const evidence = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
                quarantine_id: quarantineId,
                group_id: groupId,
                transaction_id: row.transaction?.transaction_id || row.transaction_id || "",
                observed_group_id: row.transaction?.group_id || "",
                gaps: row.gaps || [],
                transaction_checksum: row.transaction?.transaction_checksum || "",
                status: "quarantined_unproven_commit",
                first_seen_at: quarantineById.get(quarantineId)?.first_seen_at || at,
                last_seen_at: at,
            };
            evidence.evidence_checksum = (0, group_memory_index_1.checksum)(evidence, 48);
            quarantineById.set(quarantineId, evidence);
            const workItem = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
                work_item_id: workItemId,
                group_id: groupId,
                transaction_id: evidence.transaction_id,
                quarantine_id: quarantineId,
                status: workItemById.get(workItemId)?.status || "pending",
                priority: "critical",
                reason: "cleanup commit WAL cannot be recovered without exact receipt, journal and candidate proof",
                gaps: evidence.gaps,
                required_proof: ["valid group-local receipt checksum", "valid journal checksum and execution binding", "exact candidate IDs root", "valid commit-ledger checksum"],
                should_create_real_task: false,
                created_at: workItemById.get(workItemId)?.created_at || at,
                updated_at: at,
            };
            workItem.work_item_checksum = (0, group_memory_index_1.checksum)(workItem, 48);
            workItemById.set(workItemId, workItem);
            const brief = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
                brief_id: briefId,
                group_id: groupId,
                work_item_id: workItemId,
                transaction_id: evidence.transaction_id,
                target_agent_role: "group-main-agent",
                title: "Repair unproven cleanup commit WAL binding",
                status: briefById.get(briefId)?.status || "ready",
                instructions: ["Do not delete evidence or rewrite the WAL", "Re-prove receipt, journal and candidate bindings", "Resolve or explicitly cancel the repair work item with operator evidence"],
                required_files: [quarantineFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId)],
                should_create_real_task: false,
                created_at: briefById.get(briefId)?.created_at || at,
                updated_at: at,
            };
            brief.brief_checksum = (0, group_memory_index_1.checksum)(brief, 48);
            briefById.set(briefId, brief);
        }
        const quarantineEntries = [...quarantineById.values()].slice(-240);
        const workItems = [...workItemById.values()].slice(-240);
        const briefs = [...briefById.values()].slice(-240);
        (0, group_memory_index_1.writeJsonAtomic)(quarantineFile, { schema: "ccm-cleanup-commit-quarantine-ledger-v1", version: 1, group_id: groupId, entries: quarantineEntries, entry_count: quarantineEntries.length, updated_at: at, ledger_checksum: (0, group_memory_index_1.checksum)(quarantineEntries.map((entry) => entry.evidence_checksum), 48) });
        (0, group_memory_index_1.writeJsonAtomic)(workItemFile, { schema: "ccm-cleanup-commit-repair-work-item-ledger-v1", version: 1, group_id: groupId, entries: workItems, open_count: workItems.filter((entry) => !["resolved", "cancelled"].includes(entry.status)).length, updated_at: at, ledger_checksum: (0, group_memory_index_1.checksum)(workItems.map((entry) => entry.work_item_checksum), 48) });
        (0, group_memory_index_1.writeJsonAtomic)(briefFile, { schema: "ccm-cleanup-commit-repair-dispatch-brief-ledger-v1", version: 1, group_id: groupId, entries: briefs, ready_count: briefs.length, updated_at: at, ledger_checksum: (0, group_memory_index_1.checksum)(briefs.map((entry) => entry.brief_checksum), 48) });
        return { quarantineFile, workItemFile, briefFile, quarantineEntries, workItems, briefs };
    });
}
function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, options = {}) {
    const at = String(options.at || options.now || (0, group_memory_index_1.now)());
    let commitLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger)(groupId);
    let receiptLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
    let journalLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger)(groupId);
    const evaluate = () => commitLedger.entries.map((transaction) => {
        const links = (0, group_memory_index_1.cleanupCommitTransactionLinkGaps)(groupId, transaction, commitLedger, receiptLedger, journalLedger);
        const open = transaction.status !== "completed" && transaction.status !== "cancelled";
        return {
            transaction_id: transaction.transaction_id || "",
            transaction,
            phase: transaction.phase || "",
            status: transaction.status || "",
            gaps: links.gaps,
            recoverable: open && links.gaps.length === 0 && !!links.journal,
            invalid: links.gaps.length > 0,
        };
    });
    let rows = evaluate();
    let automaticRecoveryAttempted = false;
    if (options.recover !== false && options.persist === true && rows.some((row) => row.recoverable)) {
        automaticRecoveryAttempted = true;
        (0, group_memory_maintenance_part_02_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals)(groupId, { at, persist: true, trigger: options.trigger || "startup-discovery" });
        commitLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger)(groupId);
        receiptLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger)(groupId);
        journalLedger = (0, group_memory_index_1.readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger)(groupId);
        rows = evaluate();
    }
    const invalidRows = rows.filter((row) => row.invalid);
    const artifacts = options.persist === true && invalidRows.length > 0 ? writeCleanupCommitDiscoveryArtifacts(groupId, invalidRows, at) : null;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-discovery-v1",
        group_id: groupId,
        generated_at: at,
        transaction_count: rows.length,
        open_transaction_count: rows.filter((row) => row.status !== "completed" && row.status !== "cancelled").length,
        recoverable_transaction_count: rows.filter((row) => row.recoverable).length,
        invalid_transaction_count: invalidRows.length,
        quarantined_transaction_count: artifacts?.quarantineEntries?.length || 0,
        repair_work_item_count: artifacts?.workItems?.length || 0,
        repair_dispatch_brief_count: artifacts?.briefs?.length || 0,
        automatic_recovery_attempted: automaticRecoveryAttempted,
        rows: rows.map(({ transaction, ...row }) => row),
        quarantine_file: artifacts?.quarantineFile || getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId),
        repair_work_item_file: artifacts?.workItemFile || getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId),
        repair_dispatch_brief_file: artifacts?.briefFile || getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId),
        destructive_action_authorized: false,
        deleted_count: 0,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        policy: "startup_discovers_all_wal_entries_auto_recovers_only_exact_links_quarantines_unproven",
    };
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery(groupIds = [], options = {}) {
    const rows = (0, group_memory_index_1.uniqueStrings)(groupIds, 1000).map(groupId => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, options));
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-startup-discovery-v1",
        generated_at: String(options.at || options.now || (0, group_memory_index_1.now)()),
        group_count: rows.length,
        transaction_count: rows.reduce((sum, row) => sum + Number(row.transaction_count || 0), 0),
        open_transaction_count: rows.reduce((sum, row) => sum + Number(row.open_transaction_count || 0), 0),
        invalid_transaction_count: rows.reduce((sum, row) => sum + Number(row.invalid_transaction_count || 0), 0),
        repair_work_item_count: rows.reduce((sum, row) => sum + Number(row.repair_work_item_count || 0), 0),
        repair_dispatch_brief_count: rows.reduce((sum, row) => sum + Number(row.repair_dispatch_brief_count || 0), 0),
        rows,
        destructive_action_authorized: false,
        deleted_count: 0,
        created_task_count: 0,
        created_approval_receipt_count: 0,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-assignments.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transactions.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-quarantine.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-work-items.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-dispatch-briefs.json");
}
function writeCleanupCommitRepairWorkItems(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
    const valueEntries = entries.map((entry) => ({ ...entry, work_item_checksum: (0, group_memory_index_1.cleanupCommitRepairItemChecksum)(entry) })).slice(-240);
    (0, group_memory_index_1.writeJsonAtomic)(file, { schema: "ccm-cleanup-commit-repair-work-item-ledger-v1", version: 1, group_id: groupId, entries: valueEntries, open_count: valueEntries.filter((entry) => !["resolved", "cancelled"].includes(entry.status)).length, updated_at: at, ledger_checksum: (0, group_memory_index_1.checksum)(valueEntries.map((entry) => entry.work_item_checksum), 48) });
    return valueEntries;
}
function writeCleanupCommitRepairBriefs(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
    const valueEntries = entries.map((entry) => ({ ...entry, brief_checksum: (0, group_memory_index_1.cleanupCommitRepairBriefChecksum)(entry) })).slice(-240);
    (0, group_memory_index_1.writeJsonAtomic)(file, { schema: "ccm-cleanup-commit-repair-dispatch-brief-ledger-v1", version: 1, group_id: groupId, entries: valueEntries, ready_count: valueEntries.filter((entry) => entry.status === "ready" || entry.status === "assigned").length, updated_at: at, ledger_checksum: (0, group_memory_index_1.checksum)(valueEntries.map((entry) => entry.brief_checksum), 48) });
    return valueEntries;
}
function writeCleanupCommitRepairAssignments(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
    const valueEntries = entries.map((entry) => ({ ...entry, binding_checksum: (0, group_memory_index_1.cleanupCommitRepairAssignmentChecksum)(entry) })).slice(-240);
    (0, group_memory_index_1.writeJsonAtomic)(file, {
        schema: "ccm-cleanup-commit-repair-assignment-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: valueEntries,
        active_count: valueEntries.filter((entry) => entry.status === "active").length,
        updated_at: at,
        ledger_checksum: (0, group_memory_index_1.checksum)(valueEntries.map((entry) => entry.binding_checksum), 48),
    });
    return valueEntries;
}
function updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupId, input = {}) {
    const at = String(input.at || input.now || (0, group_memory_index_1.now)());
    const workItemId = String(input.workItemId || input.work_item_id || "").trim();
    const action = String(input.action || "").trim().toLowerCase();
    const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || "").trim();
    const reason = String(input.reason || "").trim();
    if (input.explicitAction !== true && input.explicit_action !== true)
        throw new Error("cleanup commit repair lifecycle requires explicitAction=true");
    if (!new Set(["group-main-agent", "local-user"]).has(actorRole))
        throw new Error("cleanup commit repair lifecycle actor role is not authorized");
    if (!actorId || !reason || !new Set(["claim", "dispatch", "reopen"]).has(action))
        throw new Error("cleanup commit repair lifecycle action is invalid");
    return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-lifecycle" }, () => {
        (0, group_memory_index_1.assertNoConflictingCleanupCommitRepairResolutionTransaction)(groupId, workItemId);
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
        const ledger = (0, group_memory_index_1.readJson)(file, {});
        if (!(0, group_memory_index_1.cleanupCommitRepairLedgerValid)(ledger, groupId, "work_item_checksum", group_memory_index_1.cleanupCommitRepairItemChecksum)) {
            throw new Error("cleanup commit repair work item ledger checksum invalid");
        }
        const index = (ledger.entries || []).findIndex((entry) => entry.work_item_id === workItemId);
        if (index < 0)
            throw new Error("cleanup commit repair work item not found");
        const current = ledger.entries[index];
        if (current.work_item_checksum !== (0, group_memory_index_1.cleanupCommitRepairItemChecksum)(current))
            throw new Error("cleanup commit repair work item checksum invalid");
        const allowed = action === "claim" ? current.status === "pending" || current.status === "reopened"
            : action === "dispatch" ? current.status === "claimed"
                : ["resolved", "cancelled", "blocked"].includes(current.status);
        if (!allowed)
            throw new Error("cleanup commit repair lifecycle transition is invalid");
        const status = action === "claim" ? "claimed" : action === "dispatch" ? "dispatched" : "reopened";
        const updated = { ...current, status, [`${action}ed_at`]: at, [`${action}ed_by`]: actorId, lifecycle_reason: reason, updated_at: at };
        const entries = [...ledger.entries];
        entries[index] = updated;
        const written = writeCleanupCommitRepairWorkItems(groupId, entries, at);
        return written[index];
    });
}
function writeCleanupCommitRepairResolutionReceipts(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
    const valueEntries = entries.map((entry) => ({
        ...entry,
        receipt_state_checksum: (0, group_memory_index_1.cleanupCommitRepairResolutionReceiptStateChecksum)(entry),
    })).slice(-240);
    (0, group_memory_index_1.writeJsonAtomic)(file, {
        schema: "ccm-cleanup-commit-repair-resolution-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: valueEntries,
        open_count: valueEntries.filter((entry) => entry.consumed !== true).length,
        updated_at: at,
        ledger_checksum: (0, group_memory_index_1.checksum)(valueEntries.map((entry) => entry.receipt_state_checksum), 48),
    });
    return valueEntries;
}
function readCleanupCommitRepairResolutionTransactionLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId);
    const ledger = (0, group_memory_index_1.readJson)(file, {});
    const revision = Number(ledger.revision || 0);
    const ledgerChecksum = String(ledger.ledger_checksum || "");
    const compactedHistory = ledger.compacted_history || null;
    const compactedHistoryValid = !compactedHistory || compactedHistory.compact_checksum === (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionCompactChecksum)(compactedHistory);
    return {
        schema: "ccm-cleanup-commit-repair-resolution-transaction-ledger-v1",
        version: 1,
        group_id: groupId,
        revision,
        previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        ledger_checksum: ledgerChecksum,
        ledger_checksum_valid: (((!ledgerChecksum && revision === 0)
            || (!!ledgerChecksum && String(ledger.group_id || "") === groupId && ledgerChecksum === (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionLedgerChecksum)(ledger))) && compactedHistoryValid),
        compacted_history: compactedHistory,
        compacted_history_valid: compactedHistoryValid,
        file,
    };
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input = {}) {
    const at = String(input.at || input.now || (0, group_memory_index_1.now)());
    const workItemId = String(input.workItemId || input.work_item_id || "").trim();
    const action = String(input.resolutionAction || input.resolution_action || "resolved").trim().toLowerCase();
    const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || "").trim();
    const reason = String(input.reason || "").trim();
    if (input.explicitApproval !== true && input.explicit_approval !== true)
        throw new Error("cleanup commit repair resolution requires explicitApproval=true");
    if (!new Set(["group-main-agent", "local-user"]).has(actorRole) || !actorId || !reason || !new Set(["resolved", "cancelled"]).has(action))
        throw new Error("cleanup commit repair resolution approval is invalid");
    return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-approval" }, () => {
        (0, group_memory_index_1.assertNoConflictingCleanupCommitRepairResolutionTransaction)(groupId, workItemId);
        const workLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
        if (!(0, group_memory_index_1.cleanupCommitRepairLedgerValid)(workLedger, groupId, "work_item_checksum", group_memory_index_1.cleanupCommitRepairItemChecksum)) {
            throw new Error("cleanup commit repair work item ledger checksum invalid");
        }
        const item = (workLedger.entries || []).find((entry) => entry.work_item_id === workItemId) || null;
        if (!item || item.work_item_checksum !== (0, group_memory_index_1.cleanupCommitRepairItemChecksum)(item) || !["claimed", "dispatched"].includes(item.status))
            throw new Error("cleanup commit repair work item is not resolvable");
        const quarantineLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId), {});
        const evidence = (quarantineLedger.entries || []).find((entry) => entry.quarantine_id === item.quarantine_id) || null;
        if (!evidence?.evidence_checksum || evidence.group_id !== groupId || evidence.evidence_checksum !== (0, group_memory_index_1.cleanupCommitRepairEvidenceChecksum)(evidence)
            || quarantineLedger.ledger_checksum !== (0, group_memory_index_1.checksum)((quarantineLedger.entries || []).map((entry) => entry.evidence_checksum || ""), 48)) {
            throw new Error("cleanup commit repair quarantine evidence missing or invalid");
        }
        const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
        const receipt = {
            schema: "ccm-cleanup-commit-repair-resolution-receipt-v1", version: 1,
            receipt_id: `cleanup-commit-repair-resolution:${(0, group_memory_index_1.checksum)([groupId, workItemId, item.work_item_checksum, action, actorId, at], 24)}`,
            group_id: groupId, work_item_id: workItemId, transaction_id: item.transaction_id, work_item_checksum: item.work_item_checksum,
            quarantine_evidence_checksum: evidence.evidence_checksum, resolution_action: action, actor_role: actorRole, actor_id: actorId, reason,
            issued_at: at, expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(), single_use: true, consumed: false,
        };
        receipt.receipt_checksum = (0, group_memory_index_1.cleanupCommitRepairResolutionReceiptChecksum)(receipt);
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
        const ledger = (0, group_memory_index_1.readJson)(file, {});
        if (Array.isArray(ledger.entries) && ledger.entries.length > 0 && !(0, group_memory_index_1.cleanupCommitRepairResolutionReceiptLedgerValid)(ledger, groupId)) {
            throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
        }
        const entries = [...(ledger.entries || []).filter((entry) => entry.receipt_id !== receipt.receipt_id), receipt].slice(-240);
        const written = writeCleanupCommitRepairResolutionReceipts(groupId, entries, at);
        return written[written.length - 1];
    });
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input = {}) {
    const at = String(input.at || input.now || (0, group_memory_index_1.now)());
    const receiptId = String(input.receiptId || input.receipt_id || "").trim();
    if (input.explicitExecution !== true && input.explicit_execution !== true)
        throw new Error("cleanup commit repair resolution requires explicitExecution=true");
    try {
        return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-executor" }, groupLedgerLockHandle => {
            const receiptLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId), {});
            if (!(0, group_memory_index_1.cleanupCommitRepairResolutionReceiptLedgerValid)(receiptLedger, groupId))
                throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
            const transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
            if (!transactionLedger.ledger_checksum_valid)
                throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
            let transaction = transactionLedger.entries.find((entry) => entry.receipt_id === receiptId && entry.status !== "cancelled") || null;
            if (transaction?.status === "completed")
                throw new Error("cleanup commit repair resolution receipt invalid or consumed");
            if (transaction) {
                if (transaction.transaction_checksum !== (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionChecksum)(transaction) || transaction.group_id !== groupId) {
                    throw new Error("cleanup commit repair resolution transaction invalid");
                }
                transaction = (0, group_memory_index_1.upsertCleanupCommitRepairResolutionTransaction)(groupId, {
                    ...transaction,
                    recovery_count: Number(transaction.recovery_count || 0) + 1,
                }, at, { groupLedgerLockHandle, ownerRole: "cleanup-commit-repair-resolution-resume" }).transaction;
            }
            else {
                const receipt = (receiptLedger.entries || []).find((entry) => entry.receipt_id === receiptId) || null;
                if (!receipt || receipt.receipt_checksum !== (0, group_memory_index_1.cleanupCommitRepairResolutionReceiptChecksum)(receipt) || receipt.group_id !== groupId || receipt.consumed === true) {
                    throw new Error("cleanup commit repair resolution receipt invalid or consumed");
                }
                const executionAtMs = Date.parse(at);
                const expiresAtMs = Date.parse(receipt.expires_at || "");
                if (!Number.isFinite(executionAtMs) || !Number.isFinite(expiresAtMs) || executionAtMs > expiresAtMs)
                    throw new Error("cleanup commit repair resolution receipt expired");
                transaction = (0, group_memory_index_1.prepareCleanupCommitRepairResolutionTransaction)(groupId, receipt, at, { groupLedgerLockHandle });
                (0, group_memory_index_1.maybeInterruptCleanupCommitRepairResolution)(input, "prepared");
            }
            return (0, group_memory_index_1.advanceCleanupCommitRepairResolutionTransaction)(groupId, transaction, at, { ...input, groupLedgerLockHandle });
        });
    }
    catch (error) {
        const reason = String(error?.message || error);
        if (reason.startsWith("simulated_cleanup_commit_repair_resolution_interruption_after_")) {
            const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
            const transaction = ledger.entries.find((entry) => entry.receipt_id === receiptId) || null;
            return {
                status: "interrupted",
                reason,
                group_id: groupId,
                receipt_id: receiptId,
                resolution_transaction_id: transaction?.resolution_transaction_id || "",
                resolution_transaction_phase: transaction?.phase || "",
                destructive_action_authorized: false,
                deleted_count: 0,
                created_task_count: 0,
                created_approval_receipt_count: 0,
            };
        }
        throw error;
    }
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId) {
    const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
    const rows = ledger.entries.map((transaction) => {
        const checksumValid = transaction.transaction_checksum === (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionChecksum)(transaction);
        const groupValid = transaction.group_id === groupId;
        const phaseValid = (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionPhaseRank)(transaction.phase) > 0;
        const completed = transaction.status === "completed";
        const completionProofValid = !completed || (transaction.phase === "completed"
            && !!transaction.work_item_commit?.work_item_checksum
            && !!transaction.brief_commit?.target_root
            && !!transaction.assignment_commit?.target_root
            && !!transaction.receipt_commit?.target_root
            && !!transaction.completed_at);
        return {
            resolution_transaction_id: transaction.resolution_transaction_id || "",
            work_item_id: transaction.work_item_id || "",
            receipt_id: transaction.receipt_id || "",
            phase: transaction.phase || "",
            status: transaction.status || "",
            checksum_valid: checksumValid,
            group_valid: groupValid,
            phase_valid: phaseValid,
            completion_proof_valid: completionProofValid,
            recovery_count: Number(transaction.recovery_count || 0),
            valid: checksumValid && groupValid && phaseValid && completionProofValid,
        };
    });
    const invalidCount = rows.filter((row) => !row.valid).length + (ledger.ledger_checksum_valid ? 0 : 1);
    return {
        schema: "ccm-cleanup-commit-repair-resolution-transaction-health-v1",
        group_id: groupId,
        status: ledger.entries.length === 0 ? "empty" : invalidCount > 0 ? "blocked" : rows.some((row) => row.status !== "completed" && row.status !== "cancelled") ? "recoverable" : "ok",
        file: ledger.file,
        ledger_revision: ledger.revision,
        ledger_checksum: ledger.ledger_checksum,
        ledger_checksum_valid: ledger.ledger_checksum_valid,
        compacted_history: ledger.compacted_history || null,
        compacted_history_valid: ledger.compacted_history_valid !== false,
        compacted_transaction_count: Number(ledger.compacted_history?.compacted_count || 0),
        transaction_count: rows.length,
        open_transaction_count: rows.filter((row) => row.status !== "completed" && row.status !== "cancelled").length,
        completed_transaction_count: rows.filter((row) => row.status === "completed").length,
        recovered_transaction_count: rows.filter((row) => row.recovery_count > 0).length,
        invalid_transaction_count: invalidCount,
        rows,
        destructive_action_authorized: false,
        deleted_count: 0,
        created_task_count: 0,
        created_approval_receipt_count: 0,
    };
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options = {}) {
    const at = String(options.at || options.now || (0, group_memory_index_1.now)());
    try {
        return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ...options, ownerRole: "cleanup-commit-repair-resolution-recovery" }, groupLedgerLockHandle => {
            let ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
            if (!ledger.ledger_checksum_valid)
                throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
            let recoveredCount = 0;
            const errors = [];
            for (const candidate of ledger.entries.filter((entry) => entry.status !== "completed" && entry.status !== "cancelled")) {
                try {
                    const authoritativeLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
                    const authoritativeCandidate = authoritativeLedger.entries.find((entry) => entry.resolution_transaction_id === candidate.resolution_transaction_id) || null;
                    const gaps = authoritativeCandidate ? (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionLinkGaps)(groupId, authoritativeCandidate, authoritativeLedger) : ["resolution_transaction_missing"];
                    if (!authoritativeCandidate || gaps.length > 0)
                        throw new Error(`cleanup commit repair resolution transaction is not exactly recoverable: ${gaps.join(",")}`);
                    const transaction = (0, group_memory_index_1.upsertCleanupCommitRepairResolutionTransaction)(groupId, {
                        ...authoritativeCandidate,
                        recovery_count: Number(authoritativeCandidate.recovery_count || 0) + 1,
                    }, at, { groupLedgerLockHandle, ownerRole: "cleanup-commit-repair-resolution-recovery" }).transaction;
                    (0, group_memory_index_1.advanceCleanupCommitRepairResolutionTransaction)(groupId, transaction, at, { groupLedgerLockHandle });
                    recoveredCount++;
                }
                catch (error) {
                    errors.push({ resolution_transaction_id: candidate.resolution_transaction_id || "", error: String(error?.message || error) });
                }
            }
            ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
            const health = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId);
            return {
                ...health,
                status: errors.length > 0 || health.invalid_transaction_count > 0 ? "blocked" : health.open_transaction_count > 0 ? "recoverable" : health.transaction_count > 0 ? "ok" : "empty",
                recovered_now_count: recoveredCount,
                recovery_error_count: errors.length,
                recovery_errors: errors,
                trigger: String(options.trigger || "manual"),
                generated_at: at,
                destructive_action_authorized: false,
                deleted_count: 0,
                created_task_count: 0,
                created_approval_receipt_count: 0,
            };
        });
    }
    catch (error) {
        const health = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId);
        return {
            ...health,
            status: "blocked",
            recovered_now_count: 0,
            recovery_error_count: 1,
            recovery_errors: [{ resolution_transaction_id: "", error: String(error?.message || error) }],
            trigger: String(options.trigger || "manual"),
            generated_at: at,
            destructive_action_authorized: false,
            deleted_count: 0,
            created_task_count: 0,
            created_approval_receipt_count: 0,
        };
    }
}
function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options = {}) {
    const at = String(options.at || options.now || (0, group_memory_index_1.now)());
    let transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
    const evaluate = () => transactionLedger.entries.map((transaction) => {
        const gaps = (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionLinkGaps)(groupId, transaction, transactionLedger);
        const open = transaction.status !== "completed" && transaction.status !== "cancelled";
        return {
            resolution_transaction_id: transaction.resolution_transaction_id || "",
            transaction,
            phase: transaction.phase || "",
            status: transaction.status || "",
            gaps,
            invalid: gaps.length > 0,
            recoverable: open && gaps.length === 0,
        };
    });
    let rows = evaluate();
    let recovery = null;
    if (options.recover !== false && rows.some((row) => row.recoverable)) {
        recovery = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, { at, trigger: options.trigger || "startup-discovery" });
        transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
        rows = evaluate();
    }
    const invalidRows = rows.filter((row) => row.invalid);
    let artifacts = null;
    if (options.persist !== false)
        artifacts = (0, group_memory_index_1.writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts)(groupId, invalidRows, at);
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId);
    const workItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId);
    const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId);
    const quarantineLedger = (0, group_memory_index_1.readJson)(quarantineFile, {});
    const workItemLedger = (0, group_memory_index_1.readJson)(workItemFile, {});
    const briefLedger = (0, group_memory_index_1.readJson)(briefFile, {});
    const quarantineArtifactValid = !Array.isArray(quarantineLedger.entries) || quarantineLedger.entries.length === 0
        || (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(quarantineLedger, groupId, "evidence_checksum");
    const workItemArtifactValid = !Array.isArray(workItemLedger.entries) || workItemLedger.entries.length === 0
        || (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(workItemLedger, groupId, "work_item_checksum");
    const briefArtifactValid = !Array.isArray(briefLedger.entries) || briefLedger.entries.length === 0
        || (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionArtifactLedgerValid)(briefLedger, groupId, "brief_checksum");
    const artifactIntegrityValid = quarantineArtifactValid && workItemArtifactValid && briefArtifactValid;
    const invalidIds = new Set(invalidRows.map((row) => row.resolution_transaction_id));
    const containedIds = new Set((quarantineLedger.entries || []).filter((entry) => entry.status === "quarantined_unproven_resolution_transaction").map((entry) => entry.resolution_transaction_id));
    const workIds = new Set((workItemLedger.entries || []).filter((entry) => !["resolved", "cancelled"].includes(entry.status)).map((entry) => entry.resolution_transaction_id));
    const briefIds = new Set((briefLedger.entries || []).filter((entry) => entry.status === "ready").map((entry) => entry.resolution_transaction_id));
    const containedInvalidCount = artifactIntegrityValid ? [...invalidIds].filter(id => containedIds.has(id) && workIds.has(id) && briefIds.has(id)).length : 0;
    const recoverableCount = rows.filter((row) => row.recoverable).length;
    const openCount = rows.filter((row) => row.status !== "completed" && row.status !== "cancelled").length;
    const uncontainedInvalidCount = Math.max(0, invalidRows.length - containedInvalidCount);
    return {
        schema: "ccm-cleanup-commit-repair-resolution-transaction-startup-discovery-v1",
        version: 1,
        group_id: groupId,
        generated_at: at,
        status: uncontainedInvalidCount > 0 ? "blocked" : recoverableCount > 0 ? "recoverable" : invalidRows.length > 0 ? "contained" : rows.length > 0 || transactionLedger.compacted_history ? "ok" : "empty",
        transaction_ledger_file: transactionLedger.file,
        transaction_ledger_revision: transactionLedger.revision,
        transaction_ledger_checksum_valid: transactionLedger.ledger_checksum_valid,
        ledger_checksum_valid: transactionLedger.ledger_checksum_valid,
        transaction_count: rows.length,
        compacted_transaction_count: Number(transactionLedger.compacted_history?.compacted_count || 0),
        compacted_history: transactionLedger.compacted_history || null,
        compacted_history_valid: transactionLedger.compacted_history_valid !== false,
        artifact_ledger_integrity_valid: artifactIntegrityValid,
        quarantine_artifact_ledger_valid: quarantineArtifactValid,
        repair_work_item_ledger_valid: workItemArtifactValid,
        repair_dispatch_brief_ledger_valid: briefArtifactValid,
        open_transaction_count: openCount,
        recoverable_transaction_count: recoverableCount,
        invalid_transaction_count: invalidRows.length,
        contained_invalid_transaction_count: containedInvalidCount,
        uncontained_invalid_transaction_count: uncontainedInvalidCount,
        automatic_recovery_attempted: !!recovery,
        recovered_now_count: Number(recovery?.recovered_now_count || 0),
        rows,
        quarantine_file: artifacts?.quarantineFile || quarantineFile,
        repair_work_item_file: artifacts?.workItemFile || workItemFile,
        repair_dispatch_brief_file: artifacts?.briefFile || briefFile,
        repair_work_item_count: (workItemLedger.entries || []).filter((entry) => !["resolved", "cancelled"].includes(entry.status)).length,
        repair_dispatch_brief_count: (briefLedger.entries || []).filter((entry) => entry.status === "ready").length,
        destructive_action_authorized: false,
        deleted_count: 0,
        created_task_count: 0,
        created_approval_receipt_count: 0,
    };
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery(groupIds = [], options = {}) {
    const rows = (0, group_memory_index_1.uniqueStrings)(groupIds, 500).map(groupId => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options));
    return {
        schema: "ccm-cleanup-commit-repair-resolution-transaction-startup-discovery-batch-v1",
        generated_at: String(options.at || options.now || (0, group_memory_index_1.now)()),
        group_count: rows.length,
        transaction_count: rows.reduce((sum, row) => sum + Number(row.transaction_count || 0), 0),
        compacted_transaction_count: rows.reduce((sum, row) => sum + Number(row.compacted_transaction_count || 0), 0),
        open_transaction_count: rows.reduce((sum, row) => sum + Number(row.open_transaction_count || 0), 0),
        invalid_transaction_count: rows.reduce((sum, row) => sum + Number(row.invalid_transaction_count || 0), 0),
        contained_invalid_transaction_count: rows.reduce((sum, row) => sum + Number(row.contained_invalid_transaction_count || 0), 0),
        recovered_now_count: rows.reduce((sum, row) => sum + Number(row.recovered_now_count || 0), 0),
        repair_work_item_count: rows.reduce((sum, row) => sum + Number(row.repair_work_item_count || 0), 0),
        repair_dispatch_brief_count: rows.reduce((sum, row) => sum + Number(row.repair_dispatch_brief_count || 0), 0),
        rows,
        destructive_action_authorized: false,
        deleted_count: 0,
        created_task_count: 0,
        created_approval_receipt_count: 0,
    };
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupId, input = {}) {
    const at = String(input.at || input.now || (0, group_memory_index_1.now)());
    const workItemId = String(input.workItemId || input.work_item_id || "").trim();
    const project = String(input.project || input.targetProject || input.target_project || "").trim();
    const agentType = String(input.agentType || input.agent_type || "").trim();
    const assignmentId = String(input.assignmentId || input.assignment_id || "").trim();
    const childSessionId = String(input.childSessionId || input.child_session_id || "").trim();
    const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || "").trim();
    if (input.explicitAssignment !== true && input.explicit_assignment !== true)
        throw new Error("cleanup commit repair assignment requires explicitAssignment=true");
    if (!new Set(["group-main-agent", "local-user"]).has(actorRole) || !actorId)
        throw new Error("cleanup commit repair assignment actor is not authorized");
    if (!project || !agentType || !assignmentId)
        throw new Error("cleanup commit repair assignment target is incomplete");
    return (0, group_memory_index_1.withCleanupGroupLedgerLock)(groupId, at, { ownerRole: "cleanup-commit-repair-assignment" }, () => {
        (0, group_memory_index_1.assertNoConflictingCleanupCommitRepairResolutionTransaction)(groupId, workItemId);
        const workLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
        const briefLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
        if (!(0, group_memory_index_1.cleanupCommitRepairLedgerValid)(workLedger, groupId, "work_item_checksum", group_memory_index_1.cleanupCommitRepairItemChecksum)) {
            throw new Error("cleanup commit repair work item ledger checksum invalid");
        }
        if (!(0, group_memory_index_1.cleanupCommitRepairLedgerValid)(briefLedger, groupId, "brief_checksum", group_memory_index_1.cleanupCommitRepairBriefChecksum)) {
            throw new Error("cleanup commit repair brief ledger checksum invalid");
        }
        const item = (workLedger.entries || []).find((entry) => entry.work_item_id === workItemId) || null;
        const brief = (briefLedger.entries || []).find((entry) => entry.work_item_id === workItemId) || null;
        if (!item || !brief || !["claimed", "dispatched"].includes(item.status) || brief.status === "closed")
            throw new Error("cleanup commit repair item is not assignable");
        const binding = {
            schema: "ccm-cleanup-commit-repair-assignment-v1", version: 1,
            binding_id: `cleanup-commit-repair-assignment:${(0, group_memory_index_1.checksum)([groupId, workItemId, assignmentId, project, agentType, childSessionId], 24)}`,
            group_id: groupId, work_item_id: workItemId, brief_id: brief.brief_id, transaction_id: item.transaction_id,
            assignment_id: assignmentId, project, agent_type: agentType, child_session_id: childSessionId,
            assigned_by_role: actorRole, assigned_by: actorId, status: "active", assigned_at: at,
        };
        binding.binding_checksum = (0, group_memory_index_1.cleanupCommitRepairAssignmentChecksum)(binding);
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
        const ledger = (0, group_memory_index_1.readJson)(file, {});
        if (Array.isArray(ledger.entries) && ledger.entries.length > 0 && !(0, group_memory_index_1.cleanupCommitRepairLedgerValid)(ledger, groupId, "binding_checksum", group_memory_index_1.cleanupCommitRepairAssignmentChecksum)) {
            throw new Error("cleanup commit repair assignment ledger checksum invalid");
        }
        const entries = [...(ledger.entries || []).filter((entry) => entry.binding_id !== binding.binding_id), binding].slice(-240);
        writeCleanupCommitRepairAssignments(groupId, entries, at);
        writeCleanupCommitRepairBriefs(groupId, (briefLedger.entries || []).map((entry) => entry.brief_id === brief.brief_id ? { ...entry, status: "assigned", assignment_binding_id: binding.binding_id, assigned_at: at } : entry), at);
        return binding;
    });
}
function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupId, audience, options = {}) {
    const normalizedAudience = String(audience || "").trim().toLowerCase();
    const workLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    const briefLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
    const assignmentLedger = (0, group_memory_index_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId), {});
    const workLedgerValid = (0, group_memory_index_1.cleanupCommitRepairLedgerValid)(workLedger, groupId, "work_item_checksum", group_memory_index_1.cleanupCommitRepairItemChecksum);
    const briefLedgerValid = (0, group_memory_index_1.cleanupCommitRepairLedgerValid)(briefLedger, groupId, "brief_checksum", group_memory_index_1.cleanupCommitRepairBriefChecksum);
    const assignmentLedgerEmpty = !Array.isArray(assignmentLedger.entries) || assignmentLedger.entries.length === 0;
    const assignmentLedgerValid = assignmentLedgerEmpty || (0, group_memory_index_1.cleanupCommitRepairLedgerValid)(assignmentLedger, groupId, "binding_checksum", group_memory_index_1.cleanupCommitRepairAssignmentChecksum);
    const integrityValid = workLedgerValid && briefLedgerValid && assignmentLedgerValid;
    const openIds = new Set(integrityValid ? (workLedger.entries || []).filter((entry) => !["resolved", "cancelled"].includes(entry.status)).map((entry) => entry.work_item_id) : []);
    let briefs = integrityValid ? (briefLedger.entries || []).filter((entry) => entry.group_id === groupId
        && openIds.has(entry.work_item_id) && entry.status !== "closed" && entry.should_create_real_task === false) : [];
    let assignment = null;
    if (normalizedAudience === "project-child-agent") {
        const assignmentId = String(options.assignmentId || options.assignment_id || "").trim();
        const project = String(options.project || options.targetProject || options.target_project || "").trim();
        const agentType = String(options.agentType || options.agent_type || "").trim();
        const childSessionId = String(options.childSessionId || options.child_session_id || "").trim();
        assignment = (assignmentLedger.entries || []).find((entry) => entry.status === "active"
            && entry.group_id === groupId && entry.assignment_id === assignmentId && entry.project === project && entry.agent_type === agentType
            && (!entry.child_session_id || entry.child_session_id === childSessionId)
            && entry.binding_checksum === (0, group_memory_index_1.cleanupCommitRepairAssignmentChecksum)(entry)) || null;
        briefs = assignment ? briefs.filter((entry) => entry.brief_id === assignment.brief_id) : [];
    }
    else if (normalizedAudience === "global-agent") {
        briefs = briefs.slice(0, Math.max(1, Number(options.limit || 4))).map((entry) => ({ brief_id: entry.brief_id, work_item_id: entry.work_item_id, transaction_id: entry.transaction_id, title: entry.title, status: entry.status }));
    }
    else if (normalizedAudience === "group-main-agent") {
        briefs = briefs.slice(0, Math.max(1, Number(options.limit || 8)));
    }
    else {
        briefs = [];
    }
    const context = {
        schema: "ccm-cleanup-commit-repair-context-v1", group_id: groupId, audience: normalizedAudience,
        brief_count: briefs.length, briefs, assignment_binding_id: assignment?.binding_id || "",
        integrity_valid: integrityValid,
        can_claim_or_dispatch: normalizedAudience === "group-main-agent",
        can_resolve_without_receipt: false,
        cross_group_authorization_allowed: false,
        policy: normalizedAudience === "project-child-agent" ? "exact_assignment_only_no_resolution_authority" : normalizedAudience === "global-agent" ? "visibility_only_no_cross_group_authority" : "group_local_repair_planning_only_explicit_resolution_receipt_required",
    };
    return { ...context, rendered: briefs.length ? `Cleanup commit repair context:\n${JSON.stringify(context)}` : "" };
}
//# sourceMappingURL=group-memory-maintenance-part-01.js.map