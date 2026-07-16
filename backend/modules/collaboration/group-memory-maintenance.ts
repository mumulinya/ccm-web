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

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "manifest.json");
}

export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, options: any = {}) {
  const explicitManifest = options.manifest && typeof options.manifest === "object" ? options.manifest : null;
  const manifest = explicitManifest || readConflictResolutionColdArchiveManifest(groupId);
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
    && String(manifest.manifest_checksum || "") === conflictResolutionColdArchiveManifestChecksum(manifest);
  const shardResults = (Array.isArray(manifest.shards) ? manifest.shards : []).map((descriptor: any) => readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor));
  const rows = shardResults.flatMap((result: any) => result.valid ? result.rows : []);
  const rowIds = rows.map((row: any) => String(row.row_id || "")).filter(Boolean);
  const uniqueRowIds = new Set(rowIds);
  const rowsChecksumValid = rows.length === Number(manifest.row_count || 0)
    && uniqueRowIds.size === rows.length
    && checksum([...rows].sort((a: any, b: any) => String(a.row_id || "").localeCompare(String(b.row_id || ""))), 48) === String(manifest.rows_checksum || "");
  const valid = manifestChecksumValid && shardResults.every((result: any) => result.valid) && rowsChecksumValid;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-archive-verification-v1",
    groupId,
    status: valid ? "ok" : "fail",
    valid,
    manifestFile: options.manifestFile || options.manifest_file || manifest.file || getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId),
    manifest,
    manifestChecksumValid,
    shardCount: shardResults.length,
    verifiedShardCount: shardResults.filter((result: any) => result.valid).length,
    rowCount: rows.length,
    rows: options.includeRows === true || options.include_rows === true ? rows : [],
    shardResults: shardResults.map((result: any) => ({
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
      ...shardResults.filter((result: any) => !result.valid).map((result: any) => `cold_archive_shard_invalid:${result.descriptor?.bucket || "unknown"}`),
      ...(!rowsChecksumValid ? ["cold_archive_rows_checksum_or_count_mismatch"] : []),
    ],
  };
}

export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId: string, options: any = {}) {
  const currentManifest = readConflictResolutionColdArchiveManifest(groupId);
  const current = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
    manifest: currentManifest,
    manifestFile: currentManifest?.file,
    includeRows: true,
  });
  const generationNumber = Number(currentManifest?.generation_number || 0);
  const currentGenerationFile = currentManifest?.manifest_checksum
    ? getConflictResolutionColdArchiveManifestGenerationFile(groupId, currentManifest.manifest_checksum)
    : "";
  const currentGenerationManifest = currentGenerationFile ? readJson(currentGenerationFile, null) : null;
  const currentGenerationCopyValid = !!currentGenerationManifest
    && currentGenerationManifest.manifest_checksum === currentManifest?.manifest_checksum
    && conflictResolutionColdArchiveManifestChecksum(currentGenerationManifest) === currentManifest?.manifest_checksum;
  const previousManifest = currentManifest ? readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest) : null;
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
  const currentRowIds = new Set((current.rows || []).map((row: any) => String(row.row_id || "")));
  const previousRowsRecoverable = !previousRequired || (previous?.valid === true
    && (previous.rows || []).every((row: any) => currentRowIds.has(String(row.row_id || ""))));
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

export function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId: string, options: any = {}) {
  const generationsDir = getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
  const candidates: any[] = [];
  try {
    for (const name of fs.readdirSync(generationsDir).filter(name => name.endsWith(".json"))) {
      const file = path.join(generationsDir, name);
      const manifest = readJson(file, null);
      if (!manifest || String(manifest.group_id || "") !== groupId) continue;
      const verification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
        manifest,
        manifestFile: file,
      });
      if (verification.valid) candidates.push({ manifest, file, verification });
    }
  } catch {}
  candidates.sort((a, b) => Number(b.manifest.generation_number || 0) - Number(a.manifest.generation_number || 0)
    || String(b.manifest.updated_at || "").localeCompare(String(a.manifest.updated_at || "")));
  const selected = candidates[0] || null;
  if (!selected) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-recovery-v1",
    groupId,
    status: "blocked",
    recovered: false,
    reason: "no_valid_manifest_generation",
    candidateCount: candidates.length,
  };
  const current = readConflictResolutionColdArchiveManifest(groupId);
  const currentValid = current
    ? verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, { manifest: current, manifestFile: current.file }).valid === true
    : false;
  const alreadyCurrent = currentValid && current?.manifest_checksum === selected.manifest.manifest_checksum;
  if (!alreadyCurrent && options.dryRun !== true && options.dry_run !== true) {
    writeJsonAtomic(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId), selected.manifest);
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

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "quarantine.json");
}

export function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId: string, options: any = {}) {
  const at = String(options.at || options.generatedAt || options.generated_at || now());
  const atMs = Date.parse(at);
  const gracePeriodMs = Math.max(0, Number(options.gracePeriodMs ?? options.grace_period_ms ?? 7 * 24 * 60 * 60 * 1000));
  const deleteEligible = options.deleteEligible === true || options.delete_eligible === true;
  const dryRun = options.dryRun === true || options.dry_run === true;
  const rawAllowedRelPaths = options.allowedRelPaths || options.allowed_rel_paths;
  const approvalRestricted = Array.isArray(rawAllowedRelPaths);
  const allowedRelPaths = new Set(uniqueStrings(Array.isArray(rawAllowedRelPaths) ? rawAllowedRelPaths : [], 5000));
  const generationHealth = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
  const currentManifest = generationHealth.current?.manifest || {};
  const previousManifest = generationHealth.previous?.manifest || {};
  const typedDir = getGroupTypedMemoryDir(groupId);
  const referenced = new Set<string>([
    ...(currentManifest.shards || []).map((shard: any) => String(shard.rel_path || "")),
    ...(previousManifest.shards || []).map((shard: any) => String(shard.rel_path || "")),
  ]);
  const currentRowIds = new Set((generationHealth.current?.rows || []).map((row: any) => String(row.row_id || "")));
  const openRepairEntryIds = conflictResolutionOpenRepairEntryIds(groupId);
  const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId);
  const existing = readJson(quarantineFile, {});
  const existingPresent = fs.existsSync(quarantineFile);
  const existingValid = !existingPresent || (existing.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1"
    && String(existing.group_id || "") === groupId
    && String(existing.quarantine_checksum || "") === conflictResolutionQuarantineChecksum(existing));
  const existingByPath = new Map<string, any>((existingValid && Array.isArray(existing.entries) ? existing.entries : []).map((entry: any) => [String(entry.rel_path || ""), entry]));
  const shardFiles = listConflictResolutionColdArchiveShardFiles(groupId);
  const orphanFiles = shardFiles.filter(file => !referenced.has(path.relative(typedDir, file).split(path.sep).join("/")));
  const rows: any[] = [];
  for (const file of orphanFiles) {
    const relPath = path.relative(typedDir, file).split(path.sep).join("/");
    const previous = existingByPath.get(relPath) || null;
    const shard = readStandaloneConflictResolutionColdArchiveShard(groupId, file);
    const resolutionEntryIds = uniqueStrings((shard.rows || []).map((row: any) => row.resolution_entry_id), (shard.rows || []).length || 1);
    const referencedByOpenRepair = resolutionEntryIds.some((entryId: string) => openRepairEntryIds.has(entryId));
    const recoveryCovered = shard.valid === true && (shard.rows || []).every((row: any) => currentRowIds.has(String(row.row_id || "")));
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
      row_ids_checksum: checksum((shard.rows || []).map((row: any) => row.row_id), 48),
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
    if (rows.some(row => row.rel_path === entry.rel_path)) continue;
    if (entry.status === "deleted") rows.push(entry);
  }
  const quarantine: any = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
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
  quarantine.quarantine_checksum = conflictResolutionQuarantineChecksum(quarantine);
  if (!dryRun && existingValid) writeJsonAtomic(quarantineFile, quarantine);
  return {
    ...quarantine,
    file: quarantineFile,
    dry_run: dryRun,
    delete_eligible: deleteEligible,
    generation_health: generationHealth,
  };
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-ledger.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "gc-approval-receipts.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notifications.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-receipts.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-deliveries.json");
}

export function acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId: string, input: any = {}) {
  return createConflictResolutionMaintenanceNotificationReceipt(groupId, "acknowledged", input);
}

export function suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId: string, input: any = {}) {
  return createConflictResolutionMaintenanceNotificationReceipt(groupId, "suppressed", input);
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const atMs = Date.parse(at);
  const ledger = readConflictResolutionMaintenanceNotificationReceiptLedger(groupId);
  const entries = ledger.entries.map((receipt: any) => {
    const checksumValid = receipt.receipt_checksum === conflictResolutionMaintenanceNotificationReceiptChecksum(receipt);
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
    valid_receipt_count: entries.filter((entry: any) => entry.valid).length,
    invalid_receipt_count: entries.filter((entry: any) => !entry.valid).length,
  };
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-quarantine.json");
}

export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId: string) {
  const currentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
  const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
  const current = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, currentFile);
  const previous = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, previousFile);
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

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-ledger.lock");
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
  const ledger = readJson(file, {});
  const present = fs.existsSync(file);
  if (!present) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
    group_id: groupId,
    status: "empty",
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
  if (String(ledger.group_id || "") !== groupId || ledger.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(ledger)) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
    group_id: groupId,
    status: "blocked",
    reason: "delivery_quarantine_checksum_invalid",
    destructive_action_authorized: false,
    created_task_count: 0,
    created_approval_receipt_count: 0,
    deleted_count: 0,
  };
  const written = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, ledger.entries || [], at, {
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

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-receipts.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-journals.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupId: string, receiptId: string) {
  const directory = path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-leases");
  return path.join(directory, `${checksum([groupId, receiptId], 32)}.json`);
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commits.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-quarantine.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-work-items.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-dispatch-briefs.json");
}

export function writeCleanupCommitDiscoveryArtifacts(groupId: string, invalidRows: any[], at: string) {
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-discovery-artifacts" }, () => {
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId);
    const workItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
    const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
    const quarantineCurrent = readJson(quarantineFile, {});
    const workItemCurrent = readJson(workItemFile, {});
    const briefCurrent = readJson(briefFile, {});
    const transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
    if (!transactionLedger.ledger_checksum_valid) throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
    const resolutionBoundWorkItemIds = new Set(transactionLedger.entries.map((entry: any) => entry.work_item_id));
    const quarantineById = new Map<string, any>((quarantineCurrent.entries || []).map((entry: any) => [entry.quarantine_id, entry]));
    const workItemById = new Map<string, any>((workItemCurrent.entries || []).map((entry: any) => [entry.work_item_id, entry]));
    const briefById = new Map<string, any>((briefCurrent.entries || []).map((entry: any) => [entry.brief_id, entry]));
    for (const row of invalidRows) {
    const gapsRoot = checksum(row.gaps || [], 32);
    const quarantineId = `cleanup-commit-quarantine:${checksum([groupId, row.transaction?.transaction_id || row.transaction_id, gapsRoot], 24)}`;
    const workItemId = `cleanup-commit-repair:${checksum([groupId, quarantineId], 24)}`;
    const briefId = `cleanup-commit-repair-brief:${checksum([groupId, workItemId], 24)}`;
      if (resolutionBoundWorkItemIds.has(workItemId)) continue;
      const evidence: any = {
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
      evidence.evidence_checksum = checksum(evidence, 48);
      quarantineById.set(quarantineId, evidence);
      const workItem: any = {
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
      workItem.work_item_checksum = checksum(workItem, 48);
      workItemById.set(workItemId, workItem);
      const brief: any = {
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
      brief.brief_checksum = checksum(brief, 48);
      briefById.set(briefId, brief);
    }
    const quarantineEntries = [...quarantineById.values()].slice(-240);
    const workItems = [...workItemById.values()].slice(-240);
    const briefs = [...briefById.values()].slice(-240);
    writeJsonAtomic(quarantineFile, { schema: "ccm-cleanup-commit-quarantine-ledger-v1", version: 1, group_id: groupId, entries: quarantineEntries, entry_count: quarantineEntries.length, updated_at: at, ledger_checksum: checksum(quarantineEntries.map((entry: any) => entry.evidence_checksum), 48) });
    writeJsonAtomic(workItemFile, { schema: "ccm-cleanup-commit-repair-work-item-ledger-v1", version: 1, group_id: groupId, entries: workItems, open_count: workItems.filter((entry: any) => !["resolved", "cancelled"].includes(entry.status)).length, updated_at: at, ledger_checksum: checksum(workItems.map((entry: any) => entry.work_item_checksum), 48) });
    writeJsonAtomic(briefFile, { schema: "ccm-cleanup-commit-repair-dispatch-brief-ledger-v1", version: 1, group_id: groupId, entries: briefs, ready_count: briefs.length, updated_at: at, ledger_checksum: checksum(briefs.map((entry: any) => entry.brief_checksum), 48) });
    return { quarantineFile, workItemFile, briefFile, quarantineEntries, workItems, briefs };
  });
}

export function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  let commitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
  let receiptLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
  let journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
  const evaluate = () => commitLedger.entries.map((transaction: any) => {
    const links = cleanupCommitTransactionLinkGaps(groupId, transaction, commitLedger, receiptLedger, journalLedger);
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
  if (options.recover !== false && options.persist === true && rows.some((row: any) => row.recoverable)) {
    automaticRecoveryAttempted = true;
    reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, { at, persist: true, trigger: options.trigger || "startup-discovery" });
    commitLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupCommitLedger(groupId);
    receiptLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    journalLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    rows = evaluate();
  }
  const invalidRows = rows.filter((row: any) => row.invalid);
  const artifacts = options.persist === true && invalidRows.length > 0 ? writeCleanupCommitDiscoveryArtifacts(groupId, invalidRows, at) : null;
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-discovery-v1",
    group_id: groupId,
    generated_at: at,
    transaction_count: rows.length,
    open_transaction_count: rows.filter((row: any) => row.status !== "completed" && row.status !== "cancelled").length,
    recoverable_transaction_count: rows.filter((row: any) => row.recoverable).length,
    invalid_transaction_count: invalidRows.length,
    quarantined_transaction_count: artifacts?.quarantineEntries?.length || 0,
    repair_work_item_count: artifacts?.workItems?.length || 0,
    repair_dispatch_brief_count: artifacts?.briefs?.length || 0,
    automatic_recovery_attempted: automaticRecoveryAttempted,
    rows: rows.map(({ transaction, ...row }: any) => row),
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

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery(groupIds: string[] = [], options: any = {}) {
  const rows = uniqueStrings(groupIds, 1000).map(groupId => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, options));
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-startup-discovery-v1",
    generated_at: String(options.at || options.now || now()),
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

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-assignments.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-receipts.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transactions.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-quarantine.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-work-items.json");
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId: string) {
  return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-dispatch-briefs.json");
}

export function writeCleanupCommitRepairWorkItems(groupId: string, entries: any[], at: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
  const valueEntries = entries.map((entry: any) => ({ ...entry, work_item_checksum: cleanupCommitRepairItemChecksum(entry) })).slice(-240);
  writeJsonAtomic(file, { schema: "ccm-cleanup-commit-repair-work-item-ledger-v1", version: 1, group_id: groupId, entries: valueEntries, open_count: valueEntries.filter((entry: any) => !["resolved", "cancelled"].includes(entry.status)).length, updated_at: at, ledger_checksum: checksum(valueEntries.map((entry: any) => entry.work_item_checksum), 48) });
  return valueEntries;
}

export function writeCleanupCommitRepairBriefs(groupId: string, entries: any[], at: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId);
  const valueEntries = entries.map((entry: any) => ({ ...entry, brief_checksum: cleanupCommitRepairBriefChecksum(entry) })).slice(-240);
  writeJsonAtomic(file, { schema: "ccm-cleanup-commit-repair-dispatch-brief-ledger-v1", version: 1, group_id: groupId, entries: valueEntries, ready_count: valueEntries.filter((entry: any) => entry.status === "ready" || entry.status === "assigned").length, updated_at: at, ledger_checksum: checksum(valueEntries.map((entry: any) => entry.brief_checksum), 48) });
  return valueEntries;
}

export function writeCleanupCommitRepairAssignments(groupId: string, entries: any[], at: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
  const valueEntries = entries.map((entry: any) => ({ ...entry, binding_checksum: cleanupCommitRepairAssignmentChecksum(entry) })).slice(-240);
  writeJsonAtomic(file, {
    schema: "ccm-cleanup-commit-repair-assignment-ledger-v1",
    version: 1,
    group_id: groupId,
    entries: valueEntries,
    active_count: valueEntries.filter((entry: any) => entry.status === "active").length,
    updated_at: at,
    ledger_checksum: checksum(valueEntries.map((entry: any) => entry.binding_checksum), 48),
  });
  return valueEntries;
}

export function updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem(groupId: string, input: any = {}) {
  const at = String(input.at || input.now || now());
  const workItemId = String(input.workItemId || input.work_item_id || "").trim();
  const action = String(input.action || "").trim().toLowerCase();
  const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || "").trim();
  const reason = String(input.reason || "").trim();
  if (input.explicitAction !== true && input.explicit_action !== true) throw new Error("cleanup commit repair lifecycle requires explicitAction=true");
  if (!new Set(["group-main-agent", "local-user"]).has(actorRole)) throw new Error("cleanup commit repair lifecycle actor role is not authorized");
  if (!actorId || !reason || !new Set(["claim", "dispatch", "reopen"]).has(action)) throw new Error("cleanup commit repair lifecycle action is invalid");
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-lifecycle" }, () => {
    assertNoConflictingCleanupCommitRepairResolutionTransaction(groupId, workItemId);
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId);
    const ledger = readJson(file, {});
    if (!cleanupCommitRepairLedgerValid(ledger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum)) {
      throw new Error("cleanup commit repair work item ledger checksum invalid");
    }
    const index = (ledger.entries || []).findIndex((entry: any) => entry.work_item_id === workItemId);
    if (index < 0) throw new Error("cleanup commit repair work item not found");
    const current = ledger.entries[index];
    if (current.work_item_checksum !== cleanupCommitRepairItemChecksum(current)) throw new Error("cleanup commit repair work item checksum invalid");
    const allowed = action === "claim" ? current.status === "pending" || current.status === "reopened"
      : action === "dispatch" ? current.status === "claimed"
        : ["resolved", "cancelled", "blocked"].includes(current.status);
    if (!allowed) throw new Error("cleanup commit repair lifecycle transition is invalid");
    const status = action === "claim" ? "claimed" : action === "dispatch" ? "dispatched" : "reopened";
    const updated = { ...current, status, [`${action}ed_at`]: at, [`${action}ed_by`]: actorId, lifecycle_reason: reason, updated_at: at };
    const entries = [...ledger.entries];
    entries[index] = updated;
    const written = writeCleanupCommitRepairWorkItems(groupId, entries, at);
    return written[index];
  });
}

export function writeCleanupCommitRepairResolutionReceipts(groupId: string, entries: any[], at: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
  const valueEntries = entries.map((entry: any) => ({
    ...entry,
    receipt_state_checksum: cleanupCommitRepairResolutionReceiptStateChecksum(entry),
  })).slice(-240);
  writeJsonAtomic(file, {
    schema: "ccm-cleanup-commit-repair-resolution-receipt-ledger-v1",
    version: 1,
    group_id: groupId,
    entries: valueEntries,
    open_count: valueEntries.filter((entry: any) => entry.consumed !== true).length,
    updated_at: at,
    ledger_checksum: checksum(valueEntries.map((entry: any) => entry.receipt_state_checksum), 48),
  });
  return valueEntries;
}

export function readCleanupCommitRepairResolutionTransactionLedger(groupId: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile(groupId);
  const ledger = readJson(file, {});
  const revision = Number(ledger.revision || 0);
  const ledgerChecksum = String(ledger.ledger_checksum || "");
  const compactedHistory = ledger.compacted_history || null;
  const compactedHistoryValid = !compactedHistory || compactedHistory.compact_checksum === cleanupCommitRepairResolutionTransactionCompactChecksum(compactedHistory);
  return {
    schema: "ccm-cleanup-commit-repair-resolution-transaction-ledger-v1",
    version: 1,
    group_id: groupId,
    revision,
    previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
    entries: Array.isArray(ledger.entries) ? ledger.entries : [],
    ledger_checksum: ledgerChecksum,
    ledger_checksum_valid: (((!ledgerChecksum && revision === 0)
      || (!!ledgerChecksum && String(ledger.group_id || "") === groupId && ledgerChecksum === cleanupCommitRepairResolutionTransactionLedgerChecksum(ledger))) && compactedHistoryValid),
    compacted_history: compactedHistory,
    compacted_history_valid: compactedHistoryValid,
    file,
  };
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.now || now());
  const workItemId = String(input.workItemId || input.work_item_id || "").trim();
  const action = String(input.resolutionAction || input.resolution_action || "resolved").trim().toLowerCase();
  const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || "").trim();
  const reason = String(input.reason || "").trim();
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("cleanup commit repair resolution requires explicitApproval=true");
  if (!new Set(["group-main-agent", "local-user"]).has(actorRole) || !actorId || !reason || !new Set(["resolved", "cancelled"]).has(action)) throw new Error("cleanup commit repair resolution approval is invalid");
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-approval" }, () => {
    assertNoConflictingCleanupCommitRepairResolutionTransaction(groupId, workItemId);
    const workLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    if (!cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum)) {
      throw new Error("cleanup commit repair work item ledger checksum invalid");
    }
    const item = (workLedger.entries || []).find((entry: any) => entry.work_item_id === workItemId) || null;
    if (!item || item.work_item_checksum !== cleanupCommitRepairItemChecksum(item) || !["claimed", "dispatched"].includes(item.status)) throw new Error("cleanup commit repair work item is not resolvable");
    const quarantineLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile(groupId), {});
    const evidence = (quarantineLedger.entries || []).find((entry: any) => entry.quarantine_id === item.quarantine_id) || null;
    if (!evidence?.evidence_checksum || evidence.group_id !== groupId || evidence.evidence_checksum !== cleanupCommitRepairEvidenceChecksum(evidence)
      || quarantineLedger.ledger_checksum !== checksum((quarantineLedger.entries || []).map((entry: any) => entry.evidence_checksum || ""), 48)) {
      throw new Error("cleanup commit repair quarantine evidence missing or invalid");
    }
    const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
    const receipt: any = {
      schema: "ccm-cleanup-commit-repair-resolution-receipt-v1", version: 1,
      receipt_id: `cleanup-commit-repair-resolution:${checksum([groupId, workItemId, item.work_item_checksum, action, actorId, at], 24)}`,
      group_id: groupId, work_item_id: workItemId, transaction_id: item.transaction_id, work_item_checksum: item.work_item_checksum,
      quarantine_evidence_checksum: evidence.evidence_checksum, resolution_action: action, actor_role: actorRole, actor_id: actorId, reason,
      issued_at: at, expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(), single_use: true, consumed: false,
    };
    receipt.receipt_checksum = cleanupCommitRepairResolutionReceiptChecksum(receipt);
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
    const ledger = readJson(file, {});
    if (Array.isArray(ledger.entries) && ledger.entries.length > 0 && !cleanupCommitRepairResolutionReceiptLedgerValid(ledger, groupId)) {
      throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
    }
    const entries = [...(ledger.entries || []).filter((entry: any) => entry.receipt_id !== receipt.receipt_id), receipt].slice(-240);
    const written = writeCleanupCommitRepairResolutionReceipts(groupId, entries, at);
    return written[written.length - 1];
  });
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.now || now());
  const receiptId = String(input.receiptId || input.receipt_id || "").trim();
  if (input.explicitExecution !== true && input.explicit_execution !== true) throw new Error("cleanup commit repair resolution requires explicitExecution=true");
  try {
    return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-resolution-executor" }, groupLedgerLockHandle => {
      const receiptLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId), {});
      if (!cleanupCommitRepairResolutionReceiptLedgerValid(receiptLedger, groupId)) throw new Error("cleanup commit repair resolution receipt ledger checksum invalid");
      const transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
      if (!transactionLedger.ledger_checksum_valid) throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
      let transaction = transactionLedger.entries.find((entry: any) => entry.receipt_id === receiptId && entry.status !== "cancelled") || null;
      if (transaction?.status === "completed") throw new Error("cleanup commit repair resolution receipt invalid or consumed");
      if (transaction) {
        if (transaction.transaction_checksum !== cleanupCommitRepairResolutionTransactionChecksum(transaction) || transaction.group_id !== groupId) {
          throw new Error("cleanup commit repair resolution transaction invalid");
        }
        transaction = upsertCleanupCommitRepairResolutionTransaction(groupId, {
          ...transaction,
          recovery_count: Number(transaction.recovery_count || 0) + 1,
        }, at, { groupLedgerLockHandle, ownerRole: "cleanup-commit-repair-resolution-resume" }).transaction;
      } else {
        const receipt = (receiptLedger.entries || []).find((entry: any) => entry.receipt_id === receiptId) || null;
        if (!receipt || receipt.receipt_checksum !== cleanupCommitRepairResolutionReceiptChecksum(receipt) || receipt.group_id !== groupId || receipt.consumed === true) {
          throw new Error("cleanup commit repair resolution receipt invalid or consumed");
        }
        const executionAtMs = Date.parse(at);
        const expiresAtMs = Date.parse(receipt.expires_at || "");
        if (!Number.isFinite(executionAtMs) || !Number.isFinite(expiresAtMs) || executionAtMs > expiresAtMs) throw new Error("cleanup commit repair resolution receipt expired");
        transaction = prepareCleanupCommitRepairResolutionTransaction(groupId, receipt, at, { groupLedgerLockHandle });
        maybeInterruptCleanupCommitRepairResolution(input, "prepared");
      }
      return advanceCleanupCommitRepairResolutionTransaction(groupId, transaction, at, { ...input, groupLedgerLockHandle });
    });
  } catch (error: any) {
    const reason = String(error?.message || error);
    if (reason.startsWith("simulated_cleanup_commit_repair_resolution_interruption_after_")) {
      const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
      const transaction = ledger.entries.find((entry: any) => entry.receipt_id === receiptId) || null;
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

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId: string) {
  const ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
  const rows = ledger.entries.map((transaction: any) => {
    const checksumValid = transaction.transaction_checksum === cleanupCommitRepairResolutionTransactionChecksum(transaction);
    const groupValid = transaction.group_id === groupId;
    const phaseValid = cleanupCommitRepairResolutionTransactionPhaseRank(transaction.phase) > 0;
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
  const invalidCount = rows.filter((row: any) => !row.valid).length + (ledger.ledger_checksum_valid ? 0 : 1);
  return {
    schema: "ccm-cleanup-commit-repair-resolution-transaction-health-v1",
    group_id: groupId,
    status: ledger.entries.length === 0 ? "empty" : invalidCount > 0 ? "blocked" : rows.some((row: any) => row.status !== "completed" && row.status !== "cancelled") ? "recoverable" : "ok",
    file: ledger.file,
    ledger_revision: ledger.revision,
    ledger_checksum: ledger.ledger_checksum,
    ledger_checksum_valid: ledger.ledger_checksum_valid,
    compacted_history: ledger.compacted_history || null,
    compacted_history_valid: ledger.compacted_history_valid !== false,
    compacted_transaction_count: Number(ledger.compacted_history?.compacted_count || 0),
    transaction_count: rows.length,
    open_transaction_count: rows.filter((row: any) => row.status !== "completed" && row.status !== "cancelled").length,
    completed_transaction_count: rows.filter((row: any) => row.status === "completed").length,
    recovered_transaction_count: rows.filter((row: any) => row.recovery_count > 0).length,
    invalid_transaction_count: invalidCount,
    rows,
    destructive_action_authorized: false,
    deleted_count: 0,
    created_task_count: 0,
    created_approval_receipt_count: 0,
  };
}

export function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  try {
    return withCleanupGroupLedgerLock(groupId, at, { ...options, ownerRole: "cleanup-commit-repair-resolution-recovery" }, groupLedgerLockHandle => {
      let ledger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
      if (!ledger.ledger_checksum_valid) throw new Error("cleanup commit repair resolution transaction ledger checksum invalid");
      let recoveredCount = 0;
      const errors: any[] = [];
      for (const candidate of ledger.entries.filter((entry: any) => entry.status !== "completed" && entry.status !== "cancelled")) {
        try {
          const authoritativeLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
          const authoritativeCandidate = authoritativeLedger.entries.find((entry: any) => entry.resolution_transaction_id === candidate.resolution_transaction_id) || null;
          const gaps = authoritativeCandidate ? cleanupCommitRepairResolutionTransactionLinkGaps(groupId, authoritativeCandidate, authoritativeLedger) : ["resolution_transaction_missing"];
          if (!authoritativeCandidate || gaps.length > 0) throw new Error(`cleanup commit repair resolution transaction is not exactly recoverable: ${gaps.join(",")}`);
          const transaction = upsertCleanupCommitRepairResolutionTransaction(groupId, {
            ...authoritativeCandidate,
            recovery_count: Number(authoritativeCandidate.recovery_count || 0) + 1,
          }, at, { groupLedgerLockHandle, ownerRole: "cleanup-commit-repair-resolution-recovery" }).transaction;
          advanceCleanupCommitRepairResolutionTransaction(groupId, transaction, at, { groupLedgerLockHandle });
          recoveredCount++;
        } catch (error: any) {
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
  } catch (error: any) {
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

export function discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId: string, options: any = {}) {
  const at = String(options.at || options.now || now());
  let transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
  const evaluate = () => transactionLedger.entries.map((transaction: any) => {
    const gaps = cleanupCommitRepairResolutionTransactionLinkGaps(groupId, transaction, transactionLedger);
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
  let recovery: any = null;
  if (options.recover !== false && rows.some((row: any) => row.recoverable)) {
    recovery = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, { at, trigger: options.trigger || "startup-discovery" });
    transactionLedger = readCleanupCommitRepairResolutionTransactionLedger(groupId);
    rows = evaluate();
  }
  const invalidRows = rows.filter((row: any) => row.invalid);
  let artifacts: any = null;
  if (options.persist !== false) artifacts = writeCleanupCommitRepairResolutionTransactionDiscoveryArtifacts(groupId, invalidRows, at);
  const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionQuarantineFile(groupId);
  const workItemFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairWorkItemFile(groupId);
  const briefFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionRepairDispatchBriefFile(groupId);
  const quarantineLedger = readJson(quarantineFile, {});
  const workItemLedger = readJson(workItemFile, {});
  const briefLedger = readJson(briefFile, {});
  const quarantineArtifactValid = !Array.isArray(quarantineLedger.entries) || quarantineLedger.entries.length === 0
    || cleanupCommitRepairResolutionTransactionArtifactLedgerValid(quarantineLedger, groupId, "evidence_checksum");
  const workItemArtifactValid = !Array.isArray(workItemLedger.entries) || workItemLedger.entries.length === 0
    || cleanupCommitRepairResolutionTransactionArtifactLedgerValid(workItemLedger, groupId, "work_item_checksum");
  const briefArtifactValid = !Array.isArray(briefLedger.entries) || briefLedger.entries.length === 0
    || cleanupCommitRepairResolutionTransactionArtifactLedgerValid(briefLedger, groupId, "brief_checksum");
  const artifactIntegrityValid = quarantineArtifactValid && workItemArtifactValid && briefArtifactValid;
  const invalidIds = new Set(invalidRows.map((row: any) => row.resolution_transaction_id));
  const containedIds = new Set((quarantineLedger.entries || []).filter((entry: any) => entry.status === "quarantined_unproven_resolution_transaction").map((entry: any) => entry.resolution_transaction_id));
  const workIds = new Set((workItemLedger.entries || []).filter((entry: any) => !["resolved", "cancelled"].includes(entry.status)).map((entry: any) => entry.resolution_transaction_id));
  const briefIds = new Set((briefLedger.entries || []).filter((entry: any) => entry.status === "ready").map((entry: any) => entry.resolution_transaction_id));
  const containedInvalidCount = artifactIntegrityValid ? [...invalidIds].filter(id => containedIds.has(id) && workIds.has(id) && briefIds.has(id)).length : 0;
  const recoverableCount = rows.filter((row: any) => row.recoverable).length;
  const openCount = rows.filter((row: any) => row.status !== "completed" && row.status !== "cancelled").length;
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
    repair_work_item_count: (workItemLedger.entries || []).filter((entry: any) => !["resolved", "cancelled"].includes(entry.status)).length,
    repair_dispatch_brief_count: (briefLedger.entries || []).filter((entry: any) => entry.status === "ready").length,
    destructive_action_authorized: false,
    deleted_count: 0,
    created_task_count: 0,
    created_approval_receipt_count: 0,
  };
}

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery(groupIds: string[] = [], options: any = {}) {
  const rows = uniqueStrings(groupIds, 500).map(groupId => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, options));
  return {
    schema: "ccm-cleanup-commit-repair-resolution-transaction-startup-discovery-batch-v1",
    generated_at: String(options.at || options.now || now()),
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

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment(groupId: string, input: any = {}) {
  const at = String(input.at || input.now || now());
  const workItemId = String(input.workItemId || input.work_item_id || "").trim();
  const project = String(input.project || input.targetProject || input.target_project || "").trim();
  const agentType = String(input.agentType || input.agent_type || "").trim();
  const assignmentId = String(input.assignmentId || input.assignment_id || "").trim();
  const childSessionId = String(input.childSessionId || input.child_session_id || "").trim();
  const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || "").trim();
  if (input.explicitAssignment !== true && input.explicit_assignment !== true) throw new Error("cleanup commit repair assignment requires explicitAssignment=true");
  if (!new Set(["group-main-agent", "local-user"]).has(actorRole) || !actorId) throw new Error("cleanup commit repair assignment actor is not authorized");
  if (!project || !agentType || !assignmentId) throw new Error("cleanup commit repair assignment target is incomplete");
  return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "cleanup-commit-repair-assignment" }, () => {
    assertNoConflictingCleanupCommitRepairResolutionTransaction(groupId, workItemId);
    const workLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
    const briefLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
    if (!cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum)) {
      throw new Error("cleanup commit repair work item ledger checksum invalid");
    }
    if (!cleanupCommitRepairLedgerValid(briefLedger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum)) {
      throw new Error("cleanup commit repair brief ledger checksum invalid");
    }
    const item = (workLedger.entries || []).find((entry: any) => entry.work_item_id === workItemId) || null;
    const brief = (briefLedger.entries || []).find((entry: any) => entry.work_item_id === workItemId) || null;
    if (!item || !brief || !["claimed", "dispatched"].includes(item.status) || brief.status === "closed") throw new Error("cleanup commit repair item is not assignable");
    const binding: any = {
      schema: "ccm-cleanup-commit-repair-assignment-v1", version: 1,
      binding_id: `cleanup-commit-repair-assignment:${checksum([groupId, workItemId, assignmentId, project, agentType, childSessionId], 24)}`,
      group_id: groupId, work_item_id: workItemId, brief_id: brief.brief_id, transaction_id: item.transaction_id,
      assignment_id: assignmentId, project, agent_type: agentType, child_session_id: childSessionId,
      assigned_by_role: actorRole, assigned_by: actorId, status: "active", assigned_at: at,
    };
    binding.binding_checksum = cleanupCommitRepairAssignmentChecksum(binding);
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId);
    const ledger = readJson(file, {});
    if (Array.isArray(ledger.entries) && ledger.entries.length > 0 && !cleanupCommitRepairLedgerValid(ledger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum)) {
      throw new Error("cleanup commit repair assignment ledger checksum invalid");
    }
    const entries = [...(ledger.entries || []).filter((entry: any) => entry.binding_id !== binding.binding_id), binding].slice(-240);
    writeCleanupCommitRepairAssignments(groupId, entries, at);
    writeCleanupCommitRepairBriefs(groupId, (briefLedger.entries || []).map((entry: any) => entry.brief_id === brief.brief_id ? { ...entry, status: "assigned", assignment_binding_id: binding.binding_id, assigned_at: at } : entry), at);
    return binding;
  });
}

export function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(groupId: string, audience: string, options: any = {}) {
  const normalizedAudience = String(audience || "").trim().toLowerCase();
  const workLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile(groupId), {});
  const briefLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile(groupId), {});
  const assignmentLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile(groupId), {});
  const workLedgerValid = cleanupCommitRepairLedgerValid(workLedger, groupId, "work_item_checksum", cleanupCommitRepairItemChecksum);
  const briefLedgerValid = cleanupCommitRepairLedgerValid(briefLedger, groupId, "brief_checksum", cleanupCommitRepairBriefChecksum);
  const assignmentLedgerEmpty = !Array.isArray(assignmentLedger.entries) || assignmentLedger.entries.length === 0;
  const assignmentLedgerValid = assignmentLedgerEmpty || cleanupCommitRepairLedgerValid(assignmentLedger, groupId, "binding_checksum", cleanupCommitRepairAssignmentChecksum);
  const integrityValid = workLedgerValid && briefLedgerValid && assignmentLedgerValid;
  const openIds = new Set(integrityValid ? (workLedger.entries || []).filter((entry: any) => !["resolved", "cancelled"].includes(entry.status)).map((entry: any) => entry.work_item_id) : []);
  let briefs = integrityValid ? (briefLedger.entries || []).filter((entry: any) => entry.group_id === groupId
    && openIds.has(entry.work_item_id) && entry.status !== "closed" && entry.should_create_real_task === false) : [];
  let assignment: any = null;
  if (normalizedAudience === "project-child-agent") {
    const assignmentId = String(options.assignmentId || options.assignment_id || "").trim();
    const project = String(options.project || options.targetProject || options.target_project || "").trim();
    const agentType = String(options.agentType || options.agent_type || "").trim();
    const childSessionId = String(options.childSessionId || options.child_session_id || "").trim();
    assignment = (assignmentLedger.entries || []).find((entry: any) => entry.status === "active"
      && entry.group_id === groupId && entry.assignment_id === assignmentId && entry.project === project && entry.agent_type === agentType
      && (!entry.child_session_id || entry.child_session_id === childSessionId)
      && entry.binding_checksum === cleanupCommitRepairAssignmentChecksum(entry)) || null;
    briefs = assignment ? briefs.filter((entry: any) => entry.brief_id === assignment.brief_id) : [];
  } else if (normalizedAudience === "global-agent") {
    briefs = briefs.slice(0, Math.max(1, Number(options.limit || 4))).map((entry: any) => ({ brief_id: entry.brief_id, work_item_id: entry.work_item_id, transaction_id: entry.transaction_id, title: entry.title, status: entry.status }));
  } else if (normalizedAudience === "group-main-agent") {
    briefs = briefs.slice(0, Math.max(1, Number(options.limit || 8)));
  } else {
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

export function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId: string, options: any = {}) {
  const at = String(options.at || options.generatedAt || options.generated_at || now());
  const trigger = String(options.trigger || options.source || "manual").trim().toLowerCase();
  const backgroundTrigger = ["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger);
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
  const archive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId);
  const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
    dryRun: true,
    at,
    gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
  });
  const recommendation = conflictResolutionMaintenanceRecommendation(generation, quarantine);
  const intervalMs = Math.max(60_000, Number(options.intervalMs || options.interval_ms || 6 * 60 * 60 * 1000));
  const runCore = {
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    trigger,
    at,
    current_manifest_checksum: generation.currentManifestChecksum || "",
    previous_manifest_checksum: generation.previousManifestChecksum || "",
    quarantine_checksum: quarantine.quarantine_checksum || "",
    generation_valid: generation.valid === true,
    archive_valid: archive.valid === true,
    orphan_count: Number(quarantine.orphan_count || 0),
    eligible_count: Number(quarantine.eligible_count || 0),
    protected_open_repair_count: Number(quarantine.protected_open_repair_count || 0),
    grace_period_ms: Number(quarantine.grace_period_ms || 0),
  };
  const runId = `conflict-resolution-maintenance:${checksum(runCore, 24)}`;
  const run = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-run-v1",
    version: 1,
    run_id: runId,
    ...runCore,
    mode: "verify_and_quarantine_dry_run_only",
    destructive_action_authorized: false,
    deletion_attempted: false,
    background_trigger: backgroundTrigger,
    recommendation,
    group_main_agent_recommendation: {
      ...recommendation,
      owner: "group-main-agent",
      should_create_real_task: false,
      next_step_requires_explicit_dispatch: true,
    },
    global_agent_recommendation: {
      ...recommendation,
      owner: "global-agent",
      advisory_only: true,
      cross_group_authorization_allowed: false,
    },
    next_run_at: new Date(Date.parse(at) + intervalMs).toISOString(),
  };
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
  const ledger = readJson(file, {});
  const entries = [...(Array.isArray(ledger.entries) ? ledger.entries : []).filter((entry: any) => entry.run_id !== runId), run].slice(-240);
  const value = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-ledger-v1",
    version: 1,
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    controller_policy: "background_verify_and_dry_run_never_delete",
    entries,
    latest_run: run,
    next_run_at: run.next_run_at,
    updated_at: at,
  };
  if (options.persist !== false) writeJsonAtomic(file, value);
  const notifications = options.emitNotifications === true || options.emit_notifications === true
    ? emitConflictResolutionMaintenanceNotifications(groupId, run, { at })
    : null;
  return { ...run, file, ledger: value, generation, archive, quarantine, notifications };
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.issuedAt || input.issued_at || now());
  const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
  const reason = String(input.reason || "").trim();
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("GC approval requires explicitApproval=true");
  if (!new Set(["group-main-agent", "global-agent"]).has(actorRole)) throw new Error("GC approval actor must be group-main-agent or global-agent");
  if (!actorId) throw new Error("GC approval requires actorId");
  if (!reason) throw new Error("GC approval requires reason");
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
  if (!generation.valid) throw new Error(`GC approval blocked by invalid manifest generations: ${(generation.gaps || []).join(",")}`);
  const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
    dryRun: true,
    at,
    gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
  });
  if (quarantine.quarantine_input_valid === false) throw new Error("GC approval blocked by invalid quarantine manifest");
  const requestedPathsRaw = input.candidateRelPaths || input.candidate_rel_paths;
  const requestedPaths = Array.isArray(requestedPathsRaw) ? new Set(uniqueStrings(requestedPathsRaw, 5000)) : null;
  const eligible = (quarantine.entries || []).filter((entry: any) => entry.status === "eligible"
    && entry.shard_valid === true
    && entry.recovery_covered === true
    && entry.referenced_by_open_repair !== true
    && (!requestedPaths || requestedPaths.has(entry.rel_path)));
  if (!eligible.length) throw new Error("GC approval requires at least one eligible quarantined shard");
  if (requestedPaths && eligible.length !== requestedPaths.size) throw new Error("GC approval candidate set includes non-eligible or missing shards");
  const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
  const receiptId = `conflict-resolution-gc-approval:${checksum([
    groupId,
    generation.currentManifestChecksum,
    generation.previousManifestChecksum,
    quarantine.quarantine_checksum,
    eligible.map((entry: any) => entry.rel_path),
    actorRole,
    actorId,
    at,
  ], 24)}`;
  const receipt: any = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-receipt-v1",
    version: 1,
    receipt_id: receiptId,
    group_id: groupId,
    approved: true,
    allow_delete: true,
    actor_role: actorRole,
    actor_id: actorId,
    reason,
    current_manifest_checksum: generation.currentManifestChecksum,
    previous_manifest_checksum: generation.previousManifestChecksum,
    quarantine_checksum: quarantine.quarantine_checksum,
    candidates: eligible.map((entry: any) => ({
      rel_path: entry.rel_path,
      content_checksum: entry.content_checksum,
      row_ids_checksum: entry.row_ids_checksum,
    })).sort((a: any, b: any) => a.rel_path.localeCompare(b.rel_path)),
    issued_at: at,
    expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
    single_use: true,
    consumed: false,
    authorization_boundary: "exact_group_generation_quarantine_and_shard_set_only",
  };
  receipt.receipt_checksum = conflictResolutionGcApprovalReceiptChecksum(receipt);
  const ledger = readConflictResolutionGcApprovalLedger(groupId);
  const entries = [...ledger.entries.filter((entry: any) => entry.receipt_id !== receiptId), receipt];
  writeConflictResolutionGcApprovalLedger(groupId, entries, at);
  return receipt;
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId: string, input: any = {}) {
  const at = String(input.at || input.executedAt || input.executed_at || now());
  const trigger = String(input.trigger || input.source || "manual").trim().toLowerCase();
  const receiptId = String(input.receiptId || input.receipt_id || "").trim();
  const ledger = readConflictResolutionGcApprovalLedger(groupId);
  const receipt = ledger.entries.find((entry: any) => entry.receipt_id === receiptId) || null;
  const blocked = (reason: string, extra: any = {}) => ({
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-execution-v1",
    groupId,
    status: "blocked",
    executed: false,
    reason,
    receipt_id: receiptId,
    ...extra,
  });
  if (["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger)) return blocked("background_trigger_cannot_authorize_destructive_gc");
  if (input.explicitExecution !== true && input.explicit_execution !== true) return blocked("explicit_execution_required");
  if (!receipt) return blocked("approval_receipt_not_found");
  if (String(receipt.group_id || "") !== groupId) return blocked("approval_receipt_group_mismatch");
  if (receipt.consumed === true) return blocked("approval_receipt_already_consumed");
  if (receipt.revoked === true) return blocked("approval_receipt_revoked");
  if (receipt.approved !== true || receipt.allow_delete !== true || receipt.single_use !== true) return blocked("approval_receipt_policy_invalid");
  if (receipt.receipt_checksum !== conflictResolutionGcApprovalReceiptChecksum(receipt)) return blocked("approval_receipt_checksum_invalid");
  const expiresAt = Date.parse(String(receipt.expires_at || ""));
  const atMs = Date.parse(at);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(atMs) || atMs > expiresAt) return blocked("approval_receipt_expired");
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
  if (!generation.valid) return blocked("manifest_generation_invalid", { gaps: generation.gaps || [] });
  if (generation.currentManifestChecksum !== receipt.current_manifest_checksum
    || generation.previousManifestChecksum !== receipt.previous_manifest_checksum) return blocked("approval_receipt_generation_stale");
  const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
    dryRun: true,
    at,
    gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
  });
  if (quarantine.quarantine_input_valid === false) return blocked("quarantine_manifest_invalid");
  if (quarantine.quarantine_checksum !== receipt.quarantine_checksum) return blocked("approval_receipt_quarantine_stale");
  const eligibleByPath = new Map((quarantine.entries || []).filter((entry: any) => entry.status === "eligible").map((entry: any) => [entry.rel_path, entry]));
  const candidatesValid = (receipt.candidates || []).every((candidate: any) => {
    const entry: any = eligibleByPath.get(candidate.rel_path);
    return !!entry
      && entry.content_checksum === candidate.content_checksum
      && entry.row_ids_checksum === candidate.row_ids_checksum
      && entry.shard_valid === true
      && entry.recovery_covered === true
      && entry.referenced_by_open_repair !== true;
  });
  if (!candidatesValid || !(receipt.candidates || []).length) return blocked("approval_receipt_candidate_set_stale");
  const allowedRelPaths = receipt.candidates.map((candidate: any) => candidate.rel_path);
  const result = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
    at,
    gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
    deleteEligible: true,
    allowedRelPaths,
  });
  const deletedThisRun = (result.entries || []).filter((entry: any) => entry.status === "deleted" && entry.deleted_at === at);
  if (deletedThisRun.some((entry: any) => !allowedRelPaths.includes(entry.rel_path))) return blocked("gc_deleted_outside_approved_candidate_set");
  const execution = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-execution-v1",
    groupId,
    status: "executed",
    executed: true,
    receipt_id: receiptId,
    receipt_checksum: receipt.receipt_checksum,
    deleted_count: deletedThisRun.length,
    deleted_rel_paths: deletedThisRun.map((entry: any) => entry.rel_path),
    current_manifest_checksum: generation.currentManifestChecksum,
    previous_manifest_checksum: generation.previousManifestChecksum,
    quarantine_checksum_before: quarantine.quarantine_checksum,
    quarantine_checksum_after: result.quarantine_checksum,
    executed_at: at,
    actor_role: receipt.actor_role,
    actor_id: receipt.actor_id,
  };
  const updatedEntries = ledger.entries.map((entry: any) => entry.receipt_id === receiptId ? {
    ...entry,
    consumed: true,
    consumed_at: at,
    execution_status: execution.status,
    execution_deleted_count: execution.deleted_count,
    execution_checksum: checksum(execution, 48),
  } : entry);
  writeConflictResolutionGcApprovalLedger(groupId, updatedEntries, at);
  return { ...execution, result };
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId: string, options: any = {}) {
  const maintenanceFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
  const maintenanceLedger = readJson(maintenanceFile, {});
  const approvalLedger = readConflictResolutionGcApprovalLedger(groupId);
  const notificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
  const notificationLedger = readJson(notificationFile, {});
  const receipts = approvalLedger.entries || [];
  const invalidReceipts = receipts.filter((receipt: any) => receipt.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-receipt-v1"
    || String(receipt.group_id || "") !== groupId
    || receipt.receipt_checksum !== conflictResolutionGcApprovalReceiptChecksum(receipt));
  const latestRun = maintenanceLedger.latest_run || null;
  const latestRunSafe = !latestRun || (latestRun.mode === "verify_and_quarantine_dry_run_only"
    && latestRun.destructive_action_authorized === false
    && latestRun.deletion_attempted === false);
  const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
  const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
    dryRun: true,
    at: options.at || options.now || now(),
    gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
  });
  const notificationDeliveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, options);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-status-v1",
    groupId,
    status: latestRunSafe && invalidReceipts.length === 0 && generation.valid === true && quarantine.quarantine_input_valid !== false ? "ok" : "fail",
    maintenanceFile,
    approvalFile: approvalLedger.file,
    notificationFile,
    notifications: Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [],
    notificationCount: Number(notificationLedger.notification_count || 0),
    notificationDeliveryHealth,
    latestRun,
    nextRunAt: maintenanceLedger.next_run_at || latestRun?.next_run_at || "",
    latestRunSafe,
    receiptCount: receipts.length,
    openApprovalCount: receipts.filter((receipt: any) => receipt.consumed !== true && receipt.revoked !== true).length,
    consumedApprovalCount: receipts.filter((receipt: any) => receipt.consumed === true).length,
    invalidApprovalCount: invalidReceipts.length,
    backgroundDeletionAuthorized: false,
    generation,
    quarantine,
    recommendation: conflictResolutionMaintenanceRecommendation(generation, quarantine),
    gaps: [
      ...(!latestRunSafe ? ["maintenance_latest_run_violated_dry_run_boundary"] : []),
      ...(invalidReceipts.length ? [`invalid_gc_approval_receipts:${invalidReceipts.length}`] : []),
      ...(generation.gaps || []),
      ...(quarantine.quarantine_input_valid === false ? ["quarantine_manifest_invalid"] : []),
    ],
  };
}

export function listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds(groupIds: string[] = [], options: any = {}) {
  const requested = uniqueStrings(groupIds, 1000);
  const requestedKeys = new Set(requested.flatMap((value: string) => [value.toLowerCase(), safeSegment(value).toLowerCase()]));
  const candidates = new Set<string>();
  for (const value of requested) {
    if (fs.existsSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(value))) candidates.add(value);
  }
  try {
    for (const entry of fs.readdirSync(GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const scopeId = entry.name;
      if (!fs.existsSync(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(scopeId))) continue;
      const ledger = readJson(getGroupTypedMemoryDistillationLedgerFile(scopeId), {});
      const identity = typedMemorySessionScopeIdentity(scopeId, ledger);
      if (requestedKeys.size
        && !requestedKeys.has(scopeId.toLowerCase())
        && !requestedKeys.has(safeSegment(scopeId).toLowerCase())
        && !requestedKeys.has(identity.rootGroupId.toLowerCase())
        && !requestedKeys.has(safeSegment(identity.rootGroupId).toLowerCase())) continue;
      candidates.add(scopeId);
    }
  } catch {}
  const maxScopes = Math.max(1, Math.min(5000, Number(options.maxScopes || options.max_scopes || 1000)));
  return [...candidates].sort().slice(0, maxScopes);
}

export function runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupIds: string[] = [], options: any = {}) {
  const at = String(options.at || options.now || now());
  const atMs = Date.parse(at);
  const scopeIds = options.expandScopes === false || options.expand_scopes === false
    ? uniqueStrings(groupIds, 1000)
    : listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds(groupIds, options);
  const rows = scopeIds.map((groupId: string) => {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
    const ledger = readJson(file, {});
    const nextRunAt = String(ledger.next_run_at || "");
    const nextRunMs = Date.parse(nextRunAt);
    const due = options.force === true || !Number.isFinite(nextRunMs) || (Number.isFinite(atMs) && atMs >= nextRunMs);
    if (!due) return { groupId, due: false, skipped: true, nextRunAt, destructiveActionAuthorized: false };
    const run = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, {
      at,
      trigger: "background",
      intervalMs: options.intervalMs || options.interval_ms,
      gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
      persist: options.persist !== false,
      emitNotifications: options.emitNotifications === true || options.emit_notifications === true,
    });
    return { groupId, due: true, skipped: false, run, nextRunAt: run.next_run_at, destructiveActionAuthorized: false };
  });
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-due-maintenance-v1",
    at,
    groupCount: rows.length,
    rootGroupCount: new Set(rows.map((row: any) => typedMemorySessionScopeIdentity(row.groupId, readJson(getGroupTypedMemoryDistillationLedgerFile(row.groupId), {})).rootGroupId)).size,
    exactSessionCount: rows.filter((row: any) => typedMemorySessionScopeIdentity(row.groupId, readJson(getGroupTypedMemoryDistillationLedgerFile(row.groupId), {})).exactSession).length,
    legacyScopeCount: rows.filter((row: any) => !typedMemorySessionScopeIdentity(row.groupId, readJson(getGroupTypedMemoryDistillationLedgerFile(row.groupId), {})).exactSession).length,
    dueCount: rows.filter(row => row.due).length,
    skippedCount: rows.filter(row => row.skipped).length,
    destructiveActionAuthorized: false,
    deletedCount: 0,
    rows,
  };
}

export function lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, query: any = {}, options: any = {}) {
  const manifest = readConflictResolutionColdArchiveManifest(groupId);
  if (!manifest) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
    groupId,
    status: "missing",
    found: false,
    rows: [],
    shardsRead: 0,
    gaps: ["cold_archive_manifest_missing"],
  };
  if (manifest.manifest_checksum !== conflictResolutionColdArchiveManifestChecksum(manifest)) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
    groupId,
    status: "tampered",
    found: false,
    rows: [],
    shardsRead: 0,
    gaps: ["cold_archive_manifest_checksum_mismatch"],
  };
  const rowId = String(query.rowId || query.row_id || "").trim();
  const resolutionEntryId = String(query.resolutionEntryId || query.resolution_entry_id || query.entryId || query.entry_id || "").trim();
  const taskFamilyKey = String(query.taskFamilyKey || query.task_family_key || "").trim();
  const descriptors = (manifest.shards || []).filter((shard: any) => {
    if (rowId) return (shard.row_ids || []).includes(rowId);
    if (resolutionEntryId) return (shard.resolution_entry_ids || []).includes(resolutionEntryId);
    if (taskFamilyKey) return (shard.task_family_keys || []).includes(taskFamilyKey);
    return options.verifyAll === true || options.verify_all === true;
  });
  const shardResults = descriptors.map((descriptor: any) => readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor));
  if (shardResults.some((result: any) => !result.valid)) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
    groupId,
    status: "tampered",
    found: false,
    rows: [],
    shardsRead: shardResults.length,
    gaps: shardResults.filter((result: any) => !result.valid).map((result: any) => `cold_archive_shard_invalid:${result.descriptor?.bucket || "unknown"}`),
  };
  const rows = shardResults.flatMap((result: any) => result.rows).filter((row: any) => {
    if (rowId && row.row_id !== rowId) return false;
    if (resolutionEntryId && row.resolution_entry_id !== resolutionEntryId) return false;
    if (taskFamilyKey && row.task_family_key !== taskFamilyKey) return false;
    return true;
  });
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
    groupId,
    status: rows.length ? "found" : "not_found",
    found: rows.length > 0,
    rows: rows.slice(0, Math.max(1, Number(options.limit || 20))),
    matchedRowCount: rows.length,
    shardsRead: shardResults.length,
    manifestChecksum: manifest.manifest_checksum,
    gaps: [],
  };
}

export function restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId: string, query: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "conflict_resolution_cold_archive_restore", options, () => restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId, query, { ...options, __distillationMutationCoordinator: true }));
  const lookup = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query, options);
  if (lookup.status === "tampered") return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
    groupId,
    status: "blocked",
    restored: false,
    reason: "cold_archive_integrity_failed",
    lookup,
  };
  if (!lookup.found || !(lookup.rows || []).length) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
    groupId,
    status: "not_found",
    restored: false,
    reason: "matching_cold_rows_not_found",
    lookup,
  };
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const archive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
  if (archive.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1") return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
    groupId,
    status: "blocked",
    restored: false,
    reason: "hot_archive_contract_missing",
    lookup,
  };
  const hotRowLimit = Math.max(20, Number(archive.hot_row_limit || GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT));
  const requested = new Map<string, any>((lookup.rows || []).slice(0, hotRowLimit).map((row: any) => [String(row.row_id || ""), row]));
  const merged = new Map<string, any>();
  for (const row of Array.isArray(archive.rows) ? archive.rows : []) merged.set(String(row.row_id || ""), row);
  for (const [rowId, row] of requested) merged.set(rowId, row);
  const sorted = [...merged.values()].sort((a: any, b: any) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")));
  const requestedIds = new Set(requested.keys());
  const recentNonRequested = sorted.filter((row: any) => !requestedIds.has(String(row.row_id || ""))).slice(-Math.max(0, hotRowLimit - requestedIds.size));
  const restoredRows = [...recentNonRequested, ...requested.values()]
    .sort((a: any, b: any) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")))
    .slice(-hotRowLimit);
  const restoredAt = String(options.restoredAt || options.restored_at || now());
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: {
      ...archive,
      rows: restoredRows,
      hot_row_count: restoredRows.length,
      restored_cold_row_ids: uniqueStrings([...(archive.restored_cold_row_ids || []), ...requestedIds], 64),
      last_cold_restore_at: restoredAt,
      cold_restore_mode: "audit_only_not_current_authority",
    },
    updatedAt: restoredAt,
  });
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
    groupId,
    status: "restored",
    restored: true,
    restoredRowCount: requested.size,
    restoredRowIds: [...requestedIds],
    hotRowCount: restoredRows.length,
    hotRowLimit,
    authorityBoundary: "audit_only_not_current_authority",
    lookup,
    restoredAt,
  };
}