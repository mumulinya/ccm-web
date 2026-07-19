// Behavior-freeze split from group-memory-maintenance.ts (part 3/3).
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
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards,
  verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive,
  verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations,
} from "./group-memory-maintenance-part-01";

import {
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth,
} from "./group-memory-maintenance-part-02";

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
