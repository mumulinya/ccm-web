// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 1/5).
// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { applyGroupDirectMemoryRequests, buildGroupTypedMemoryIndex, filterFactsByDirectMemoryTombstones, getGroupTypedMemoryArtifactTransactionStageRoot, inspectGroupTypedMemoryArtifactTransaction, normalizeGroupDirectMemoryRequest, upsertGroupTypedMemoryDocument } from "./typed-memory-index-build";
import { cleanupGroupLedgerLockHeld, conflictResolutionMaintenanceScopeMetadata, conflictResolutionMaintenanceState, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile, pruneCleanupMetadataArchives, withCleanupGroupLedgerLock } from "./typed-memory-ledgers";
import { pressureMemoryProvenanceRowsFromRawRecovery, pressureMemoryProvenanceStringList, roundPressureRecallUsageWeight } from "./typed-memory-recall";
import { GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR, GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS, GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION, GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION, GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_LOG_ACTIVITY_NOISE_PATTERN, GROUP_LOG_DURABLE_PATTERN, GROUP_LOG_EPHEMERAL_PATTERN, GROUP_LOG_EXTERNAL_RESOURCE_PATTERN, GROUP_LOG_NON_OBVIOUS_PATTERN, GROUP_LOG_POSITIVE_REVOCATION_PATTERN, GROUP_LOG_RATIONALE_PATTERN, GROUP_LOG_RESOURCE_PURPOSE_PATTERN, GROUP_LOG_USER_CORRECTION_PATTERN, GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION, GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION, GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION, GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION, GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS, GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS, GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION, GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION, GROUP_TYPED_MEMORY_DIR, GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT, GROUP_TYPED_MEMORY_DISTILLATION_LEDGER, GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES, GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION, GROUP_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION, GroupTypedMemoryType, MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS, MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS, activeGroupTypedMemoryDistillationMutations, buildGroupLogPositiveConfirmationCandidate, buildPostCompactCandidateUsageArchive, checksum, compactText, extractMessageFiles, extractMessageSkills, extractMessageVerification, getGroupTypedMemoryDir, isExactGroupTypedMemorySessionScope, messageActor, messageContent, messageIdentity, normalizeGroupLogMemoryAdmission, normalizeGroupLogMemoryRevocation, normalizeMemoryType, now, readJson, safeSegment, stageGroupTypedMemoryArtifactRemoval, tokens, typedMemorySessionScopeIdentity, uniqueStrings, verifyGroupLogLifecycleCurrentSourceEvidence, writeJsonAtomic } from "./typed-memory-shared";

import {
  postCompactReceiptMemoryUsageRepairCompletionArchive,
  postCompactReinjectionRepairReceiptConsumptionArchive,
  providerRankingMemoryUsageReceiptRepairArchive,
  providerRankingProvenanceCompactRepairReceiptConsumptionArchive,
  providerReproofReceiptConsumptionArchive,
} from "./typed-memory-distillation-receipts-part-02";

import {
  ignoreMemoryReceiptRepairArchive,
  pressureMemoryProvenanceReceiptRepairArchive,
  pressureProvenanceProviderDispatchOverrideFollowupArchive,
  providerSwitchExecutionArchive,
} from "./typed-memory-distillation-receipts-part-03";

import {
  compactStrategyTypedArchive,
  contextUsageRepairArchive,
  ptlEmergencyTypedArchive,
} from "./typed-memory-distillation-receipts-part-04";

export function postCompactCompletionMemoryPreservationClosureReceiptSourceReliability(entry: any = {}, options: any = {}) {
  const source = String(entry.receipt_source || entry.receiptSource || "").trim().toLowerCase();
  const configured = options.receiptSourceReliability || options.receipt_source_reliability || {};
  const configuredValue = configured && typeof configured === "object" ? configured[source] : undefined;
  const defaults: Record<string, number> = {
    corrected_repair_receipt: 1,
    timeline_binding: 0.95,
    assignment_binding: 0.9,
    "task.receipt": 0.9,
    "task.delivery_summary": 0.8,
    worker_context_packet_receipt: 0.8,
    "group_message.receipt": 0.75,
    "group_message.delivery_summary": 0.65,
    "timeline_binding.status": 0.55,
  };
  let reliability = Number.isFinite(Number(configuredValue)) ? Number(configuredValue) : defaults[source] ?? 0.65;
  const status = String(entry.receipt_status || entry.receiptStatus || "").trim().toLowerCase();
  if (status && !["done", "verified", "completed", "ok", "passed"].includes(status)) reliability *= 0.75;
  return {
    source: source || "unknown",
    status,
    reliability: roundPressureRecallUsageWeight(Math.max(0.1, Math.min(1, reliability)), 4),
  };
}

export function getGroupTypedMemoryDistillationLedgerFile(groupId: string) {
  return require("./group-memory-distillation").getGroupTypedMemoryDistillationLedgerFile(groupId);
}

export function getGroupTypedMemoryDistillationLockFile(groupId: string) {
  return require("./group-memory-distillation").getGroupTypedMemoryDistillationLockFile(groupId);
}

export function getGroupTypedMemoryDistillationTransactionStateFile(groupId: string) {
  return require("./group-memory-distillation").getGroupTypedMemoryDistillationTransactionStateFile(groupId);
}

export function groupTypedMemoryDistillationLockChecksum(lock: any = {}) {
  return checksum({
    schema: lock.schema || "",
    version: Number(lock.version || 0),
    groupId: lock.groupId || "",
    leaseId: lock.leaseId || "",
    fencingToken: Number(lock.fencingToken || 0),
    ownerPid: Number(lock.ownerPid || 0),
    ownerHostname: lock.ownerHostname || "",
    status: lock.status || "",
    acquiredAt: lock.acquiredAt || "",
    renewedAt: lock.renewedAt || "",
    expiresAt: lock.expiresAt || "",
    renewalCount: Number(lock.renewalCount || 0),
  }, 64);
}

export function groupTypedMemoryDistillationStateChecksum(state: any = {}) {
  return checksum({
    schema: state.schema || "",
    version: Number(state.version || 0),
    groupId: state.groupId || "",
    status: state.status || "",
    mutationKind: state.mutationKind || "",
    mutationKinds: Array.isArray(state.mutationKinds) ? state.mutationKinds.map(String) : [],
    lastMutationKind: state.lastMutationKind || "",
    leaseId: state.leaseId || "",
    fencingToken: Number(state.fencingToken || 0),
    lastFencingToken: Number(state.lastFencingToken || 0),
    lastCommittedFencingToken: Number(state.lastCommittedFencingToken || 0),
    recoveredLeaseCount: Number(state.recoveredLeaseCount || 0),
    waitedMs: Number(state.waitedMs || 0),
    writeCount: Number(state.writeCount || 0),
    startedAt: state.startedAt || "",
    completedAt: state.completedAt || "",
    failedAt: state.failedAt || "",
    error: state.error || "",
    updatedAt: state.updatedAt || "",
  }, 64);
}

export function typedMemoryDistillationProcessAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function typedMemoryDistillationWait(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, Math.floor(ms))); } catch {}
}

export function inspectGroupTypedMemoryDistillationLock(groupId: string, options: any = {}) {
  return require("./group-memory-distillation").inspectGroupTypedMemoryDistillationLock(groupId, options);
}

export function readGroupTypedMemoryDistillationTransactionState(groupId: string) {
  return require("./group-memory-distillation").readGroupTypedMemoryDistillationTransactionState(groupId);
}

export function writeGroupTypedMemoryDistillationTransactionState(groupId: string, value: any) {
  const file = getGroupTypedMemoryDistillationTransactionStateFile(groupId);
  const state = {
    schema: "ccm-group-typed-memory-distillation-transaction-state-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
    groupId,
    ...value,
  };
  state.stateChecksum = groupTypedMemoryDistillationStateChecksum(state);
  writeJsonAtomic(file, state);
  return { ...state, file };
}

export function nextGroupTypedMemoryDistillationFencingToken(groupId: string, abandonedLock: any = null) {
  const state = readGroupTypedMemoryDistillationTransactionState(groupId);
  const ledger = readJson(getGroupTypedMemoryDistillationLedgerFile(groupId), {});
  const timestampFloor = Date.now() * 1000 + Math.abs(process.pid % 1000);
  return Math.max(
    timestampFloor,
    Number(state.valid ? state.state?.lastFencingToken || state.state?.fencingToken || 0 : 0) + 1,
    Number(ledger?.distillationMutation?.fencingToken || ledger?.distillationTransaction?.fencingToken || 0) + 1,
    Number(abandonedLock?.fencingToken || 0) + 1,
  );
}

export function writeGroupTypedMemoryDistillationLockHandle(handle: any, patch: any = {}) {
  const lock = { ...handle.lock, ...patch };
  delete lock.lockChecksum;
  lock.lockChecksum = groupTypedMemoryDistillationLockChecksum(lock);
  fs.ftruncateSync(handle.fd, 0);
  fs.writeSync(handle.fd, JSON.stringify(lock, null, 2), 0, "utf-8");
  fs.fsyncSync(handle.fd);
  handle.lock = lock;
  return lock;
}

export function acquireGroupTypedMemoryDistillationLock(groupId: string, options: any = {}) {
  const file = getGroupTypedMemoryDistillationLockFile(groupId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const maxWaitMs = Math.max(0, Math.min(30_000, Number(options.transactionMaxWaitMs ?? options.transaction_max_wait_ms ?? 10_000)));
  const ttlMs = Math.max(10_000, Math.min(10 * 60_000, Number(options.transactionTtlMs ?? options.transaction_ttl_ms ?? 120_000)));
  const corruptGraceMs = Math.max(250, Math.min(30_000, Number(options.transactionCorruptGraceMs ?? options.transaction_corrupt_grace_ms ?? 5_000)));
  let waitedMs = 0;
  let recoveredLeaseCount = 0;
  let abandonedLock: any = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const status = inspectGroupTypedMemoryDistillationLock(groupId);
    if (status.present) {
      if (status.active || (!status.valid && status.ageMs < corruptGraceMs)) {
        if (waitedMs >= maxWaitMs) return { acquired: false, reason: status.active ? "distillation_lock_busy" : "distillation_lock_corrupt_grace", waitedMs, status };
        const waitMs = Math.min(maxWaitMs - waitedMs, Math.max(5, Math.min(100, 5 * Math.pow(1.35, Math.min(attempt, 20)))));
        typedMemoryDistillationWait(waitMs);
        waitedMs += waitMs;
        continue;
      }
      abandonedLock = status.lock;
      const archive = `${file}.abandoned.${checksum([status.lock?.leaseId || "invalid", Date.now(), crypto.randomBytes(4).toString("hex")], 20)}`;
      try {
        fs.renameSync(file, archive);
        recoveredLeaseCount += 1;
        pruneCleanupMetadataArchives(path.dirname(file), `${path.basename(file)}.abandoned.`, 32);
      } catch {
        continue;
      }
    }
    let fd = -1;
    try {
      fd = fs.openSync(file, "wx+");
      const acquiredAt = now();
      const fencingToken = nextGroupTypedMemoryDistillationFencingToken(groupId, abandonedLock);
      const leaseId = `gtmdl_${checksum([groupId, fencingToken, process.pid, crypto.randomBytes(12).toString("hex")], 32)}`;
      const handle: any = {
        fd,
        file,
        released: false,
        waitedMs,
        recoveredLeaseCount,
        ttlMs,
        lock: {
          schema: "ccm-group-typed-memory-distillation-lock-v1",
          version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
          groupId,
          leaseId,
          fencingToken,
          ownerPid: process.pid,
          ownerHostname: os.hostname(),
          status: "active",
          acquiredAt,
          renewedAt: acquiredAt,
          expiresAt: new Date(Date.now() + ttlMs).toISOString(),
          renewalCount: 0,
        },
      };
      writeGroupTypedMemoryDistillationLockHandle(handle);
      const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
      writeGroupTypedMemoryDistillationTransactionState(groupId, {
        status: "in_progress",
        mutationKind: String(options.mutationKind || options.mutation_kind || ""),
        mutationKinds: uniqueStrings([options.mutationKind || options.mutation_kind].filter(Boolean).map(String), 32),
        leaseId,
        fencingToken,
        lastFencingToken: fencingToken,
        lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
        recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : 0) + recoveredLeaseCount,
        waitedMs,
        writeCount: 0,
        startedAt: acquiredAt,
        completedAt: "",
        failedAt: "",
        error: "",
        updatedAt: acquiredAt,
      });
      return { acquired: true, handle, lock: handle.lock, waitedMs, recoveredLeaseCount };
    } catch (error: any) {
      if (fd >= 0) try { fs.closeSync(fd); } catch {}
      if (error?.code === "EEXIST") continue;
      return { acquired: false, reason: "distillation_lock_acquire_failed", waitedMs, error: String(error?.message || error) };
    }
  }
  return { acquired: false, reason: "distillation_lock_contended", waitedMs };
}

export function verifyGroupTypedMemoryDistillationLock(handle: any) {
  if (!handle || handle.released === true || Number(handle.fd) < 0) return { owned: false, reason: "lock_handle_unavailable" };
  const status = inspectGroupTypedMemoryDistillationLock(String(handle.lock?.groupId || ""), { file: handle.file });
  const owned = status.valid === true
    && status.active === true
    && String(status.lock?.leaseId || "") === String(handle.lock?.leaseId || "")
    && Number(status.lock?.fencingToken || 0) === Number(handle.lock?.fencingToken || 0);
  return { owned, reason: owned ? "owned" : status.present ? "lock_replaced_or_invalid" : "lock_missing", status };
}

export function renewGroupTypedMemoryDistillationLock(handle: any) {
  const before = verifyGroupTypedMemoryDistillationLock(handle);
  if (!before.owned) return { renewed: false, reason: before.reason, verification: before };
  const renewedAt = now();
  writeGroupTypedMemoryDistillationLockHandle(handle, {
    renewedAt,
    expiresAt: new Date(Date.now() + Number(handle.ttlMs || 120_000)).toISOString(),
    renewalCount: Number(handle.lock?.renewalCount || 0) + 1,
  });
  const after = verifyGroupTypedMemoryDistillationLock(handle);
  return { renewed: after.owned, reason: after.owned ? "renewed" : after.reason, verification: after, lock: handle.lock };
}

export function releaseGroupTypedMemoryDistillationLock(handle: any, finalStatus = "completed") {
  if (!handle || handle.released === true || Number(handle.fd) < 0) return false;
  const releasedAt = now();
  try {
    writeGroupTypedMemoryDistillationLockHandle(handle, {
      status: "released",
      releasedAt,
      expiresAt: releasedAt,
      finalStatus,
    });
  } catch {}
  try { fs.closeSync(handle.fd); } catch {}
  handle.fd = -1;
  handle.released = true;
  const current = readJson(handle.file, null);
  if (current?.leaseId === handle.lock?.leaseId && Number(current?.fencingToken || 0) === Number(handle.lock?.fencingToken || 0)) {
    try { fs.unlinkSync(handle.file); } catch {}
  }
  return true;
}

export function runGroupTypedMemoryDistillationMutation(groupId: string, mutationKind: string, options: any, operation: (context: any) => any) {
  return require("./group-memory-distillation").runGroupTypedMemoryDistillationMutation(groupId, mutationKind, options, operation);
}

export function extractGroupLogPositiveFeedbackLifecycleRequests(groupId: string, messages: any[] = []) {
  const requests: any[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (normalizeGroupDirectMemoryRequest(groupId, message, index)) continue;
    const content = messageContent(message);
    const requested = normalizeGroupLogMemoryRevocation(message);
    const explicit = requested.revoked === true || GROUP_LOG_POSITIVE_REVOCATION_PATTERN.test(content);
    if (message?.role !== "user" || !explicit) continue;

    let inferred: any = null;
    if (!requested.targetConfirmationMessageId && !requested.targetApproachMessageId) {
      for (let cursor = index - 1; cursor >= Math.max(0, index - 12); cursor -= 1) {
        const candidate = buildGroupLogPositiveConfirmationCandidate(groupId, messages, cursor);
        if (!candidate) continue;
        const admission = groupLogDistillationAdmission({
          category: "feedback",
          type: "validated_approach",
          text: candidate.text,
          memoryAdmission: candidate.memoryAdmission,
          confirmation: candidate.confirmation,
        });
        if (admission.admitted) {
          inferred = candidate.confirmation;
          break;
        }
      }
    }
    const admission = normalizeGroupLogMemoryAdmission(message);
    const reason = requested.reason
      || admission.why
      || (GROUP_LOG_RATIONALE_PATTERN.test(content) ? compactText(content, 500) : "");
    requests.push({
      schema: "ccm-group-positive-feedback-lifecycle-request-v1",
      revocationMessageId: messageIdentity(message, index),
      sourceIndex: index,
      targetConfirmationMessageId: requested.targetConfirmationMessageId || inferred?.confirmationMessageId || "",
      targetApproachMessageId: requested.targetApproachMessageId || inferred?.targetMessageId || "",
      targetApproachChecksum: requested.targetApproachChecksum || inferred?.targetMessageChecksum || "",
      claimedGroupSessionScopeId: requested.groupSessionScopeId,
      scopeMatches: !requested.groupSessionScopeId || requested.groupSessionScopeId === groupId,
      reason,
      replacementRule: requested.replacementRule,
      howToApply: requested.howToApply || admission.howToApply || "",
      currentSourceEvidence: requested.currentSourceEvidence,
      bindingMode: inferred ? "adjacent_confirmation" : "explicit_lifecycle_binding",
    });
  }
  return requests;
}

export function positiveFeedbackLifecycleEventChecksum(event: any) {
  return checksum([
    event.schema,
    event.groupId,
    event.eventId,
    event.action,
    event.targetFactId,
    event.targetConfirmationMessageId,
    event.targetApproachMessageId,
    event.targetApproachChecksum,
    event.revocationMessageId,
    event.replacementFactId,
    event.replacementMessageId,
    event.reason,
    event.evidenceTier,
    event.currentSourceProof?.proofId || "",
    event.revokedAt,
  ], 64);
}

export function applyGroupPositiveFeedbackLifecycle(groupId: string, facts: any, requests: any[] = [], previous: any = {}, options: any = {}) {
  const events = new Map<string, any>();
  for (const raw of Array.isArray(previous?.events) ? previous.events : []) {
    if (!raw?.eventId) continue;
    const expected = positiveFeedbackLifecycleEventChecksum(raw);
    if (raw.eventChecksum === expected) events.set(String(raw.eventId), raw);
  }
  const observations = new Map<string, any>();
  for (const raw of Array.isArray(previous?.observations) ? previous.observations : []) {
    if (raw?.observationId) observations.set(String(raw.observationId), raw);
  }
  const feedbackFacts = facts.feedback || {};
  let appliedThisRun = 0;
  let rejectedThisRun = 0;
  let invalidBindingThisRun = 0;
  const observeRejection = (request: any, reason: string) => {
    rejectedThisRun += 1;
    if (/(?:target|scope|checksum|proof|binding)/.test(reason)) invalidBindingThisRun += 1;
    const observationId = checksum([request.revocationMessageId, reason], 24);
    const prior = observations.get(observationId);
    observations.set(observationId, {
      observationId,
      revocationMessageId: String(request.revocationMessageId || ""),
      reason,
      firstSeenAt: prior?.firstSeenAt || options.updatedAt || now(),
      lastSeenAt: options.updatedAt || now(),
      count: Number(prior?.count || 0) + 1,
    });
  };

  for (const request of requests.sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
    const priorEvent = [...events.values()].find((event: any) => event.revocationMessageId === request.revocationMessageId);
    if (priorEvent) {
      const replayedTarget = Object.entries(feedbackFacts).find(([, fact]: any) => fact?.id === priorEvent.targetFactId);
      if (replayedTarget) delete feedbackFacts[replayedTarget[0]];
      continue;
    }
    if (request.scopeMatches !== true) {
      observeRejection(request, "positive_feedback_revocation_scope_mismatch");
      continue;
    }
    if (!request.targetConfirmationMessageId && !request.targetApproachMessageId) {
      observeRejection(request, "positive_feedback_revocation_target_binding_missing");
      continue;
    }
    const matches = Object.entries(feedbackFacts).filter(([, fact]: any) => {
      if (fact?.type !== "validated_approach") return false;
      const binding = fact?.confirmation || {};
      if (request.targetConfirmationMessageId && binding.confirmationMessageId !== request.targetConfirmationMessageId) return false;
      if (request.targetApproachMessageId && binding.targetMessageId !== request.targetApproachMessageId) return false;
      return true;
    });
    if (matches.length !== 1) {
      observeRejection(request, matches.length ? "positive_feedback_revocation_target_ambiguous" : "positive_feedback_revocation_target_missing");
      continue;
    }
    const [targetKey, targetFact]: any = matches[0];
    const targetChecksum = String(targetFact?.confirmation?.targetMessageChecksum || "");
    if (!/^[a-f0-9]{64}$/.test(targetChecksum)) {
      observeRejection(request, "positive_feedback_revocation_target_checksum_unproven");
      continue;
    }
    if (request.targetApproachChecksum && request.targetApproachChecksum !== targetChecksum) {
      observeRejection(request, "positive_feedback_revocation_checksum_mismatch");
      continue;
    }
    if (!request.reason) {
      observeRejection(request, "positive_feedback_revocation_reason_missing");
      continue;
    }
    const currentSourceProof = verifyGroupLogLifecycleCurrentSourceEvidence(request.currentSourceEvidence, String(options.projectRoot || ""));
    if (request.currentSourceEvidence && currentSourceProof.valid !== true) {
      observeRejection(request, `positive_feedback_revocation_source_proof_${currentSourceProof.status}`);
      continue;
    }
    const replacementEntry: any = Object.entries(feedbackFacts).find(([, fact]: any) =>
      fact?.type === "user_correction"
      && fact?.messageId === request.revocationMessageId
      && (!request.replacementRule || compactText(fact?.text || "", 900) === request.replacementRule));
    const replacementFact: any = replacementEntry?.[1] || null;
    const action = replacementFact ? "superseded" : "revoked";
    const eventId = `pfl_${checksum([groupId, request.revocationMessageId, targetFact.id || targetKey, targetChecksum], 28)}`;
    const revokedAt = String(options.updatedAt || now());
    const event: any = {
      schema: "ccm-group-positive-feedback-lifecycle-event-v1",
      version: GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
      groupId,
      eventId,
      action,
      targetFactId: String(targetFact.id || targetKey),
      targetConfirmationMessageId: String(targetFact.confirmation?.confirmationMessageId || ""),
      targetApproachMessageId: String(targetFact.confirmation?.targetMessageId || ""),
      targetApproachChecksum: targetChecksum,
      revocationMessageId: request.revocationMessageId,
      bindingMode: request.bindingMode,
      reason: request.reason,
      replacementFactId: String(replacementFact?.id || ""),
      replacementMessageId: String(replacementFact?.messageId || ""),
      evidenceTier: currentSourceProof.valid === true ? "system_current_source_file_proof" : "bound_user_revocation",
      currentSourceProof: currentSourceProof.valid === true ? currentSourceProof : null,
      revokedAt,
    };
    event.eventChecksum = positiveFeedbackLifecycleEventChecksum(event);
    events.set(eventId, event);
    delete feedbackFacts[targetKey];
    appliedThisRun += 1;
  }

  const boundedEvents = [...events.values()]
    .sort((a: any, b: any) => String(a.revokedAt || "").localeCompare(String(b.revokedAt || "")))
    .slice(-500);
  const boundedObservations = [...observations.values()]
    .sort((a: any, b: any) => String(a.lastSeenAt || "").localeCompare(String(b.lastSeenAt || "")))
    .slice(-500);
  const activeValidatedCount = Object.values(feedbackFacts).filter((fact: any) => fact?.type === "validated_approach").length;
  return {
    facts,
    lifecycle: {
      schema: "ccm-group-positive-feedback-lifecycle-v1",
      version: GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
      groupId,
      activeValidatedCount,
      revokedCount: boundedEvents.filter((event: any) => event.action === "revoked").length,
      supersededCount: boundedEvents.filter((event: any) => event.action === "superseded").length,
      currentSourceProofCount: boundedEvents.filter((event: any) => event.evidenceTier === "system_current_source_file_proof").length,
      eventCount: boundedEvents.length,
      observationCount: boundedObservations.length,
      appliedThisRun,
      rejectedThisRun,
      invalidBindingThisRun,
      events: boundedEvents,
      observations: boundedObservations,
      updatedAt: options.updatedAt || now(),
    },
  };
}

export function groupLogDistillationAdmission(candidate: any) {
  const text = String(candidate?.text || "");
  const structured = candidate?.memoryAdmission || {};
  const activityNoise = GROUP_LOG_ACTIVITY_NOISE_PATTERN.test(text);
  const ephemeral = GROUP_LOG_EPHEMERAL_PATTERN.test(text);
  const durable = structured.futureApplicable === true || GROUP_LOG_DURABLE_PATTERN.test(text);
  const nonObvious = structured.surprising === true || structured.nonObvious === true || GROUP_LOG_NON_OBVIOUS_PATTERN.test(text);
  const rationale = String(structured.why || "").trim() || (GROUP_LOG_RATIONALE_PATTERN.test(text) ? compactText(text, 420) : "");
  const howToApply = String(structured.howToApply || "").trim();
  const type = String(candidate?.type || "");
  const category = normalizeMemoryType(candidate?.category);
  const reject = (reason: string, hardExclusion = false) => ({
    admitted: false,
    reason,
    hardExclusion,
    durable,
    nonObvious,
    hasRationale: !!rationale,
    confidence: 0,
    why: "",
    howToApply: "",
  });
  const admit = (reason: string, confidence: number, defaultHow: string) => ({
    admitted: true,
    reason,
    hardExclusion: false,
    durable,
    nonObvious,
    hasRationale: !!rationale,
    confidence,
    why: rationale || (category === "user" ? "The user marked this rule as durable across conversations." : ""),
    howToApply: howToApply || defaultHow,
  });

  if (candidate?.directMemory?.requestId && candidate?.sourceRole === "user" && type === "explicit_remember") {
    return admit("explicit_user_remember", 1, "Apply only inside this group session unless the user explicitly forgets or supersedes it.");
  }

  if (activityNoise) return reject("activity_log_noise", true);
  if (["completed_work", "assignment"].includes(type)) return reject("ephemeral_task_activity", true);
  if (["files", "skills", "verification"].includes(type)) return reject("derivable_current_project_state", true);
  if (ephemeral && !durable) return reject("ephemeral_current_task_state", true);

  if (category === "user" && type === "requirement") {
    return durable
      ? admit("durable_user_rule", 0.9, "Apply this rule to future matching group tasks unless the user supersedes it.")
      : reject("missing_cross_session_durability");
  }
  if (category === "feedback" && type === "user_correction") {
    return durable && nonObvious && !!rationale
      ? admit("non_obvious_user_feedback", 0.95, "Apply the corrected approach to future matching work and preserve the stated reason.")
      : reject("feedback_missing_non_obvious_reason_or_future_scope");
  }
  if (category === "feedback" && type === "validated_approach") {
    const binding = candidate?.confirmation || {};
    if (binding?.schema !== "ccm-group-positive-feedback-binding-v1" || binding.explicit !== true) {
      return reject("positive_confirmation_missing_binding");
    }
    if (binding.targetFound !== true || binding.targetSourceRole !== "assistant") {
      return reject("positive_confirmation_target_missing_or_not_assistant");
    }
    if (binding.scopeMatches !== true) return reject("positive_confirmation_scope_mismatch", true);
    if (binding.checksumMatches !== true) return reject("positive_confirmation_checksum_mismatch", true);
    if (binding.targetEligible !== true || !durable || !nonObvious || !rationale || !howToApply) {
      return reject("positive_confirmation_target_not_durable_non_obvious_or_explained");
    }
    return admit("validated_non_obvious_approach", 0.95, howToApply);
  }
  if (category === "feedback" && type === "failure_or_blocker") {
    const recurring = /(?:反复|多次|再次|累计|recurring|repeated|again|\b[2-9]\d*\s+times?\b)/i.test(text);
    return durable && nonObvious && !!rationale && recurring
      ? admit("recurring_non_obvious_failure", 0.8, "Use this as a prevention rule for future matching tasks; verify current repository state first.")
      : reject("one_off_failure_or_blocker");
  }
  if (category === "project" && ["technical_decision", "dispatch_decision"].includes(type)) {
    return durable && nonObvious && !!rationale
      ? admit("non_obvious_project_motivation", 0.8, "Use the motivation when judging future scope; verify current implementation before acting.")
      : reject("project_decision_missing_non_obvious_reason_or_future_scope");
  }
  if (category === "reference" && type === "external_resource") {
    return GROUP_LOG_RESOURCE_PURPOSE_PATTERN.test(text)
      ? admit("external_resource_with_purpose", 0.85, "Consult this resource when its stated purpose matches the current task.")
      : reject("external_resource_missing_purpose");
  }
  return reject("unsupported_long_term_memory_shape");
}

export function addDistilledCandidate(candidates: any[], category: GroupTypedMemoryType, type: string, message: any, index: number, text: any, overrides: any = {}) {
  const bounded = compactText(text, 900);
  if (!bounded) return;
  const messageId = messageIdentity(message, index);
  const actor = messageActor(message);
  const key = checksum([category, type, messageId, bounded], 24);
  candidates.push({
    id: key,
    category,
    type,
    messageId,
    sourceIndex: Number(message?.__typedMemorySourceIndex ?? index),
    actor,
    sourceRole: String(message?.role || ""),
    timestamp: String(message?.timestamp || message?.time || ""),
    text: bounded,
    checksum: key,
    memoryAdmission: overrides.memoryAdmission || normalizeGroupLogMemoryAdmission(message),
    ...(overrides.confirmation ? { confirmation: overrides.confirmation } : {}),
  });
}

export function extractGroupLogDistillationCandidates(groupId: string, messages: any[] = []) {
  const candidates: any[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    // Explicit remember/forget is committed by the direct-memory transaction below.
    // Keeping it out of heuristic extraction prevents a second, differently keyed fact.
    if (normalizeGroupDirectMemoryRequest(groupId, message, index)) continue;
    const content = messageContent(message);
    if (!content) continue;
    const actor = messageActor(message);
    const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
    const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
    const revocation = normalizeGroupLogMemoryRevocation(message);
    const lifecycleSignal = message?.role === "user" && (revocation.revoked === true || GROUP_LOG_POSITIVE_REVOCATION_PATTERN.test(content));
    if (message?.role === "user" && revocation.replacementRule) {
      const replacementAdmission = normalizeGroupLogMemoryAdmission(message);
      addDistilledCandidate(candidates, "feedback", "user_correction", message, index, revocation.replacementRule, {
        memoryAdmission: {
          ...replacementAdmission,
          futureApplicable: true,
          why: revocation.reason || replacementAdmission.why,
          howToApply: revocation.howToApply || replacementAdmission.howToApply,
          requestedByUser: true,
        },
      });
    }
    if (message?.role === "user" && !lifecycleSignal && !revocation.replacementRule && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|目标|长期|撤回|不再|改为|must\b|never\b|always\b|do not\b|no longer\b|instead\b|required?\b)/i.test(content)) {
      const correction = GROUP_LOG_USER_CORRECTION_PATTERN.test(content);
      addDistilledCandidate(candidates, correction ? "feedback" : "user", correction ? "user_correction" : "requirement", message, index, content);
    }
    const positiveConfirmation = buildGroupLogPositiveConfirmationCandidate(groupId, messages, index);
    if (positiveConfirmation) {
      addDistilledCandidate(candidates, "feedback", "validated_approach", message, index, positiveConfirmation.text, positiveConfirmation);
    }
    if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
      addDistilledCandidate(candidates, "project", "dispatch_decision", message, index, `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`);
      for (const assignment of message.assignments || []) {
        addDistilledCandidate(candidates, "project", "assignment", message, index, `${assignment?.project || assignment?.target || "unknown"}：${assignment?.task || assignment?.reason || ""}`);
      }
    }
    if (/(决定|采用|使用|方案|策略|decision|decided|use|strategy)/i.test(content) && /(src\/|\.ts|\.js|\.vue|接口|服务|数据库|api|agent|memory|compact|压缩|记忆)/i.test(content)) {
      addDistilledCandidate(candidates, "project", "technical_decision", message, index, content);
    }
    if (/(失败|阻塞|未完成|超时|异常|回退|拒绝|error|failed|blocked|timeout|needs_info|need info)/i.test(`${status}\n${content}`)) {
      addDistilledCandidate(candidates, "feedback", "failure_or_blocker", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${content}`);
    }
    if (["done", "complete", "completed", "success"].includes(status) || message?.delivery_summary?.has_final_review) {
      addDistilledCandidate(candidates, "project", "completed_work", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${message?.receipt?.summary || message?.delivery_summary?.headline || content}`);
    }
    const files = uniqueStrings(extractMessageFiles(message), 12);
    if (files.length) addDistilledCandidate(candidates, "reference", "files", message, index, `${actor}: ${files.join(", ")} | ${compactText(content, 300)}`);
    const skills = uniqueStrings(extractMessageSkills(message), 10);
    if (skills.length) addDistilledCandidate(candidates, "reference", "skills", message, index, `${actor}: ${skills.map(item => `Skill:${item}`).join(", ")}`);
    const verification = uniqueStrings(extractMessageVerification(message), 10);
    if (verification.length) addDistilledCandidate(candidates, "reference", "verification", message, index, `${actor}: ${verification.join(", ")}`);
    if (GROUP_LOG_EXTERNAL_RESOURCE_PATTERN.test(content)) {
      addDistilledCandidate(candidates, "reference", "external_resource", message, index, content);
    }
  }
  return candidates;
}

export function applyGroupLogDistillationAdmission(candidates: any[] = []) {
  const admitted: any[] = [];
  const rejected: any[] = [];
  for (const candidate of candidates) {
    const admission = groupLogDistillationAdmission(candidate);
    const row = { ...candidate, admission };
    if (admission.admitted) admitted.push(row);
    else rejected.push(row);
  }
  return { admitted, rejected };
}

export function filterExistingDistilledFactsByAdmission(facts: any = {}) {
  const admittedFacts: any = {};
  const rejected: any[] = [];
  for (const category of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    admittedFacts[category] = {};
    for (const [key, fact] of Object.entries(facts?.[category] || {}) as Array<[string, any]>) {
      const admission = groupLogDistillationAdmission({ ...fact, category });
      if (admission.admitted) admittedFacts[category][key] = { ...fact, category, admission, count: 1 };
      else rejected.push({ ...fact, category, admission });
    }
  }
  return { admittedFacts, rejected };
}

export function buildGroupLogDistillationAdmissionLedger(previous: any = {}, admitted: any[] = [], rejected: any[] = [], evicted: any[] = [], updatedAt = now()) {
  const observations = new Map<string, any>();
  for (const row of Array.isArray(previous?.observations) ? previous.observations : []) {
    if (row?.observationId) observations.set(String(row.observationId), { ...row, count: 1 });
  }
  for (const row of [...rejected, ...evicted]) {
    const reason = String(row?.admission?.reason || "rejected");
    const observationId = checksum([row?.checksum || row?.id || "", reason], 24);
    const prior = observations.get(observationId);
    observations.set(observationId, {
      observationId,
      candidateId: String(row?.id || row?.checksum || ""),
      messageId: String(row?.messageId || ""),
      category: normalizeMemoryType(row?.category),
      type: String(row?.type || ""),
      reason,
      hardExclusion: row?.admission?.hardExclusion === true,
      firstSeenAt: prior?.firstSeenAt || updatedAt,
      lastSeenAt: updatedAt,
      count: prior ? Math.max(1, Number(prior.count || 1)) : 1,
      evictedExistingFact: evicted.includes(row),
    });
  }
  const bounded = [...observations.values()]
    .sort((a, b) => String(a.lastSeenAt || "").localeCompare(String(b.lastSeenAt || "")))
    .slice(-500);
  const reasonCounts: Record<string, number> = {};
  for (const row of bounded) reasonCounts[row.reason] = Number(reasonCounts[row.reason] || 0) + Number(row.count || 0);
  const confirmationCandidates = [...admitted, ...rejected].filter(row => row?.type === "validated_approach");
  return {
    schema: "ccm-group-typed-memory-write-admission-v1",
    version: GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION,
    evaluatedThisRun: admitted.length + rejected.length,
    admittedThisRun: admitted.length,
    rejectedThisRun: rejected.length,
    evictedExistingFactCount: evicted.length,
    hardExclusionThisRun: rejected.filter(row => row?.admission?.hardExclusion === true).length,
    positiveConfirmationCandidateCount: confirmationCandidates.length,
    positiveConfirmationAdmittedCount: admitted.filter(row => row?.type === "validated_approach").length,
    positiveConfirmationRejectedCount: rejected.filter(row => row?.type === "validated_approach").length,
    positiveConfirmationInvalidBindingCount: rejected.filter(row => row?.type === "validated_approach" && /(?:binding|target|scope|checksum)/.test(String(row?.admission?.reason || ""))).length,
    admittedByCategory: admitted.reduce((acc: Record<string, number>, row: any) => {
      const category = normalizeMemoryType(row.category);
      acc[category] = Number(acc[category] || 0) + 1;
      return acc;
    }, {}),
    reasonCounts,
    observationCount: bounded.length,
    observations: bounded,
    updatedAt,
  };
}

export function readGroupTypedMemoryDistillationLedger(groupId: string) {
  return require("./group-memory-distillation").readGroupTypedMemoryDistillationLedger(groupId);
}

export function pruneDistilledFacts(facts: any = {}, perTypeLimit = GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT) {
  const next: any = {};
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    const entries = Object.entries(facts[type] || {})
      .sort((a: any, b: any) => Number(a[1].sourceIndex || 0) - Number(b[1].sourceIndex || 0) || String(a[1].lastSeenAt || "").localeCompare(String(b[1].lastSeenAt || "")))
      .slice(-perTypeLimit);
    next[type] = Object.fromEntries(entries);
  }
  return next;
}

export function renderDistilledMemoryBody(title: string, facts: any[], options: any = {}) {
  const lines = [
    `# ${title}`,
    "",
    `Generated by CCM long-term group-log distillation at ${options.updatedAt || now()}.`,
    "Each fact keeps its source message id so a future agent can recover the raw transcript before trusting file/function/flag claims.",
    "",
    "## Distilled Facts",
  ];
  for (const fact of facts) {
    const source = `#${fact.messageId || ""}`;
    const kind = fact.type ? `[${fact.type}] ` : "";
    const actor = fact.actor ? `${fact.actor}: ` : "";
    lines.push(`- ${source} ${kind}${actor}${compactText(fact.text, 900)}`);
    if (fact?.memoryId) lines.push(`  - **Memory ID:** ${compactText(fact.memoryId, 180)}`);
    if (fact?.confirmation?.targetMessageId) lines.push(`  - **Validated approach:** #${compactText(fact.confirmation.targetMessageId, 160)} (${fact.confirmation.bindingMode || "bound"})`);
    if (fact?.admission?.why) lines.push(`  - **Why:** ${compactText(fact.admission.why, 420)}`);
    if (fact?.admission?.howToApply) lines.push(`  - **How to apply:** ${compactText(fact.admission.howToApply, 420)}`);
  }
  return lines.join("\n").trim() + "\n";
}

export function preservedGroupTypedMemoryDistillationArchives(...ledgers: any[]) {
  const keys = [
    "providerReproofReceiptConsumptionArchive",
    "ignoreMemoryReceiptRepairArchive",
    "pressureMemoryProvenanceReceiptRepairArchive",
    "pressureProvenancePreDispatchComplianceArchive",
    "pressureProvenancePreDispatchComplianceRecoveryArchive",
    "pressureProvenanceProviderDispatchOverrideFollowupArchive",
    "providerSwitchExecutionArchive",
    "providerRankingProvenanceCompactRepairReceiptConsumptionArchive",
    "postCompactReinjectionRepairReceiptConsumptionArchive",
    "postCompactReceiptMemoryUsageRepairCompletionArchive",
    "postCompactCompletionMemoryPreservationRepairClosureArchive",
    "postCompactCompletionMemoryPreservationClosureConflictResolutionArchive",
    "providerRankingMemoryUsageReceiptRepairArchive",
    "contextUsageRepairArchive",
    "compactStrategyTypedArchive",
    "ptlEmergencyTypedArchive",
    "modelExtractionTypedMemoryArchive",
    "positiveFeedbackLifecycle",
  ];
  const out: any = {};
  for (const key of keys) {
    const value = ledgers.map((ledger: any) => ledger?.[key]).find((candidate: any) => candidate?.schema);
    if (value?.schema) out[key] = value;
  }
  return out;
}

export function modelExtractionTypedArchiveChecksum(archive: any) {
  const payload = { ...(archive || {}) };
  delete payload.checksum;
  return checksum(JSON.stringify(payload), 64);
}

export function modelExtractionReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.checksum;
  delete payload.receiptFile;
  return checksum(JSON.stringify(payload), 64);
}

export function modelExtractionArtifactChecksum(artifact: any) {
  const payload = { ...(artifact || {}) };
  delete payload.checksum;
  return checksum(JSON.stringify(payload), 64);
}

export function modelExtractionGraphChecksum(graph: any) {
  const payload = { ...(graph || {}) };
  delete payload.checksum;
  return checksum(JSON.stringify(payload), 64);
}

export function modelExtractionEvidenceComparable(value: any) {
  return String(value || "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/[`*]/g, "")
    .replace(/^_+|_+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function verifyModelExtractionGraphForTypedMemory(graph: any) {
  if (graph?.schema !== "ccm-group-session-memory-fact-supersession-graph-v1"
    || !graph?.checksum
    || modelExtractionGraphChecksum(graph) !== String(graph.checksum || "")) return false;
  const facts = Array.isArray(graph.facts) ? graph.facts : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const factById = new Map(facts.map((fact: any) => [String(fact.factId || ""), fact]));
  return edges.every((edge: any) => {
    const oldFact: any = factById.get(String(edge.oldFactId || ""));
    return !!oldFact
      && oldFact.status === "superseded"
      && String(oldFact.factChecksum || "") === String(edge.oldFactChecksum || "")
      && String(oldFact.supersessionEdgeId || "") === String(edge.edgeId || "")
      && !!String(edge.sourceMessageId || "")
      && checksum(edge.replacementText, 32) === String(edge.newFactChecksum || "")
      && checksum(edge.sourceMessageText, 32) === String(edge.sourceMessageChecksum || "");
  });
}

export function validateModelExtractionTypedMemoryInput(scopeId: string, input: any) {
  if (!isExactGroupTypedMemorySessionScope(scopeId)) throw new Error("model_extraction_typed_memory_requires_exact_group_gcs_scope");
  const separator = scopeId.lastIndexOf("--gcs_");
  const groupId = scopeId.slice(0, separator);
  const groupSessionId = scopeId.slice(separator + 2);
  const receipt = input?.receipt || {};
  const graph = input?.factSupersessionGraph || receipt.factSupersessionGraph || {};
  const transcript = String(input?.transcript || "");
  const markdown = String(input?.markdown || "");
  const requestArtifact = input?.requestArtifact?.artifact || input?.requestArtifact || {};
  const resultArtifact = input?.resultArtifact?.artifact || input?.resultArtifact || {};
  if (receipt.schema !== "ccm-group-session-memory-model-extraction-receipt-v1"
    || receipt.status !== "committed"
    || modelExtractionReceiptChecksum(receipt) !== String(receipt.checksum || "")) {
    throw new Error("model_extraction_typed_memory_receipt_invalid");
  }
  if (String(receipt.groupId || "") !== groupId
    || String(receipt.groupSessionId || "") !== groupSessionId
    || String(receipt.scopeId || "") !== scopeId
    || !String(receipt.executionId || "")
    || Number(receipt.fencingToken || 0) <= 0) {
    throw new Error("model_extraction_typed_memory_receipt_scope_or_fence_invalid");
  }
  const expectedReceiptFile = path.resolve(CCM_DIR, "group-session-memory", scopeId, "model-extraction-receipt.json");
  if (path.resolve(String(receipt.receiptFile || "")) !== expectedReceiptFile) {
    throw new Error("model_extraction_typed_memory_receipt_file_binding_invalid");
  }
  const persistedReceipt = readJson(expectedReceiptFile, null);
  const currentReceiptValid = !!persistedReceipt
    && String(persistedReceipt.checksum || "") === String(receipt.checksum || "")
    && modelExtractionReceiptChecksum(persistedReceipt) === String(persistedReceipt.checksum || "");
  const resultArtifactValid = resultArtifact.schema === "ccm-group-session-memory-model-extraction-result-artifact-v1"
    && resultArtifact.status === "committed"
    && String(resultArtifact.scopeId || "") === scopeId
    && String(resultArtifact.executionId || "") === String(receipt.executionId || "")
    && String(resultArtifact.kind || "") === "result"
    && modelExtractionArtifactChecksum(resultArtifact) === String(resultArtifact.checksum || "")
    && String(resultArtifact.receipt?.checksum || "") === String(receipt.checksum || "")
    && modelExtractionReceiptChecksum(resultArtifact.receipt) === String(receipt.checksum || "")
    && String(resultArtifact.validated?.markdown || "") === markdown;
  if (!currentReceiptValid && !resultArtifactValid) {
    throw new Error("model_extraction_typed_memory_committed_receipt_missing_or_changed");
  }
  if (!verifyModelExtractionGraphForTypedMemory(graph)
    || String(receipt.factSupersessionGraphChecksum || "") !== String(graph.checksum || "")
    || String(graph.sourceTranscriptChecksum || "") !== String(receipt.requestAudit?.sourceTranscriptChecksum || "")
    || String(graph.outputMarkdownChecksum || "") !== checksum(markdown, 24)
    || String(receipt.markdownChecksum || "") !== checksum(markdown, 24)) {
    throw new Error("model_extraction_typed_memory_graph_or_markdown_binding_invalid");
  }
  let sourceRows: any[] = [];
  try { sourceRows = JSON.parse(transcript); } catch {}
  if (!Array.isArray(sourceRows)
    || checksum(JSON.stringify(sourceRows), 32) !== String(receipt.requestAudit?.sourceTranscriptChecksum || "")) {
    throw new Error("model_extraction_typed_memory_transcript_checksum_invalid");
  }
  if (requestArtifact.schema !== "ccm-group-session-memory-model-extraction-request-artifact-v1"
    || String(requestArtifact.scopeId || "") !== scopeId
    || String(requestArtifact.executionId || "") !== String(receipt.executionId || "")
    || String(requestArtifact.transcript || "") !== transcript
    || String(requestArtifact.checksum || "") !== String(receipt.requestArtifactChecksum || "")
    || modelExtractionArtifactChecksum(requestArtifact) !== String(requestArtifact.checksum || "")
    || Number(requestArtifact.fencingToken || 0) !== Number(receipt.fencingToken || 0)) {
    throw new Error("model_extraction_typed_memory_request_artifact_invalid");
  }
  const expectedFence = Number(input?.extractionFencingToken || input?.extraction_fencing_token || 0);
  if (expectedFence > 0 && expectedFence !== Number(receipt.fencingToken || 0)) {
    throw new Error("model_extraction_typed_memory_extraction_fence_mismatch");
  }
  return { groupId, groupSessionId, receipt, graph, transcript, sourceRows, markdown, requestArtifact, resultArtifact, currentReceiptValid, resultArtifactValid };
}

export function modelExtractionTopicConceptProfile(value: any) {
  const text = String(value || "").normalize("NFKC").replace(/https?:\/\/\S+/gi, " ");
  const semanticText = text.replace(/[_-]+/g, " ");
  const cjkCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinCharCount = (text.match(/[A-Za-z]/g) || []).length;
  const language = cjkCharCount >= 4 ? "cjk" : latinCharCount >= 4 ? "latin" : "unknown";
  const canonical = MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS.filter(([, pattern]) => pattern.test(semanticText)).map(([concept]) => concept);
  const rawTokens = text.match(/[A-Z][A-Z0-9_]{3,}|[A-Za-z][A-Za-z0-9_-]{3,}|[\u4e00-\u9fff]{2,16}/g) || [];
  const lexical: string[] = [];
  const seen = new Set(canonical);
  for (const token of rawTokens) {
    let normalized = token.toLowerCase().replace(/^_+|_+$/g, "");
    normalized = normalized.replace(/^(?:必须长期使用|必须长期保留|必须长期记住|请长期记住|用户要求|长期使用|长期保留|长期记住)+/, "");
    if (!normalized || normalized.length < 2 || MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS.has(normalized) || seen.has(normalized)) continue;
    if (/^(?:phase\d+|current|future|matching|apply|inside|unless|policy|value_?\d*)$/.test(normalized)) continue;
    if (/^[\u4e00-\u9fff]+$/.test(normalized) && /^(?:这个|那个|这样|如此|事情|内容|规则|要求)$/.test(normalized)) continue;
    seen.add(normalized);
    lexical.push(normalized.slice(0, 80));
    if (lexical.length >= 12) break;
  }
  const identifierCount = lexical.filter(token => /[_\d]/.test(token) || /^[a-z][a-z0-9_-]{4,}$/i.test(token)).length;
  const cjkCount = lexical.filter(token => /^[\u4e00-\u9fff]+$/.test(token)).length;
  const confidence = canonical.length >= 2
    ? 0.95
    : canonical.length === 1 && lexical.length > 0
      ? 0.86
      : canonical.length === 1
        ? 0.72
        : identifierCount > 0
          ? 0.78
          : cjkCount > 0
            ? 0.6
            : lexical.length > 0
              ? 0.56
              : 0.2;
  return {
    concepts: uniqueStrings([...canonical, ...lexical], 16),
    canonicalConcepts: canonical,
    lexicalConcepts: lexical,
    confidence,
    lowConfidence: confidence < GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE,
    language,
  };
}

export function modelExtractionTopicConcepts(value: any) {
  return modelExtractionTopicConceptProfile(value).concepts;
}

export function modelExtractionTopicSimilarity(left: string[] = [], right: string[] = []) {
  if (!left.length || !right.length) return 0;
  const a = new Set(left);
  const b = new Set(right);
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  if (!overlap) return 0;
  const canonicalOverlap = [...a].filter(item => item.startsWith("domain_") && b.has(item)).length;
  const overlapCoefficient = overlap / Math.max(1, Math.min(a.size, b.size));
  const jaccard = overlap / Math.max(1, new Set([...a, ...b]).size);
  return Math.min(1, canonicalOverlap > 0
    ? 0.64 + Math.min(0.2, canonicalOverlap * 0.1) + (jaccard * 0.16)
    : (overlapCoefficient * 0.55) + (jaccard * 0.45));
}

export function modelExtractionTopicDisplayConcept(concepts: string[], category: string, topicId: string) {
  const preferred = concepts.find(concept => /[a-z0-9]/i.test(concept)) || concepts[0] || topicId.slice(-8);
  return `${category === "feedback" ? "Corrections" : "User constraints"}: ${preferred.replace(/[_-]+/g, " ")}`;
}

export function modelExtractionTopicSlug(category: string, concepts: string[], topicId: string) {
  const readable = concepts.find(concept => /^[a-z0-9][a-z0-9_-]{2,48}$/i.test(concept)) || "topic";
  return safeSegment(`model-${category}-${readable}-${checksum(topicId, 8)}`, `model-${category}-${checksum(topicId, 12)}`).toLowerCase();
}

export function buildGroupSessionModelExtractionTypedMemoryTopics(factsInput: any = {}, previousTopicsInput: any = {}, options: any = {}) {
  const at = String(options.at || now());
  const maxPerCategory = Math.max(2, Math.min(100, Number(options.maxTopicsPerCategory || options.max_topics_per_category || GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY)));
  const facts: any = Object.fromEntries(Object.entries(factsInput || {}).map(([key, fact]: any) => [key, { ...fact }]));
  const previousTopics: any = Object.fromEntries(Object.entries(previousTopicsInput || {})
    .filter(([, topic]: any) => topic?.schema === "ccm-group-session-model-extraction-topic-v1")
    .map(([topicId, topic]: any) => {
      const normalizedConcepts = modelExtractionTopicConceptProfile((topic.concepts || []).join(" ")).concepts;
      return [topicId, { ...topic, concepts: uniqueStrings([...(topic.concepts || []), ...normalizedConcepts], 20) }];
    }));
  for (const fact of Object.values(facts) as any[]) {
    const priorTopic = previousTopics[String(fact?.topicId || "")];
    if (!priorTopic || fact?.status !== "active") continue;
    const profile = modelExtractionTopicConceptProfile(fact.text);
    priorTopic.concepts = uniqueStrings([...(priorTopic.concepts || []), ...profile.concepts], 20);
    priorTopic.languages = uniqueStrings([...(priorTopic.languages || []), profile.language].filter(language => language !== "unknown"), 4);
    priorTopic.assignmentVersion = GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
  }
  const topicAliases = new Map<string, string>();
  const priorRows: any[] = Object.values(previousTopics).sort((a: any, b: any) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.topicId || "").localeCompare(String(b.topicId || "")));
  for (const topic of priorRows) {
    if (topic.status === "merged" && previousTopics[String(topic.mergedIntoTopicId || "")]) {
      topicAliases.set(topic.topicId, String(topic.mergedIntoTopicId));
    }
  }
  for (let index = 0; index < priorRows.length; index += 1) {
    const topic = priorRows[index];
    if (topicAliases.has(topic.topicId) || ["retired", "merged"].includes(String(topic.status || "")) || /_(?:general|unclassified)$/.test(String(topic.topicId || ""))) continue;
    for (let cursor = index + 1; cursor < priorRows.length; cursor += 1) {
      const candidate = priorRows[cursor];
      if (candidate.category !== topic.category
        || topicAliases.has(candidate.topicId)
        || ["retired", "merged"].includes(String(candidate.status || ""))
        || /_(?:general|unclassified)$/.test(String(candidate.topicId || ""))) continue;
      if (modelExtractionTopicSimilarity(topic.concepts || [], candidate.concepts || []) >= GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY) {
        topicAliases.set(candidate.topicId, topic.topicId);
      }
    }
  }

  const topics = new Map<string, any>();
  for (const topic of priorRows) {
    const canonical = topicAliases.get(topic.topicId);
    if (canonical) continue;
    topics.set(topic.topicId, { ...topic, factChecksums: [], status: topic.status === "retired" ? "retired" : "inactive" });
  }
  let createdTopicCount = 0;
  let reusedTopicCount = 0;
  let lowConfidenceFactCount = 0;
  const activeFacts = Object.entries(facts)
    .filter(([, fact]: any) => fact?.status === "active" && ["user", "feedback"].includes(String(fact?.category || "")))
    .sort((a: any, b: any) => String(a[1].firstCommittedAt || "").localeCompare(String(b[1].firstCommittedAt || "")) || String(a[0]).localeCompare(String(b[0])));

  for (const [factChecksum, fact] of activeFacts as Array<[string, any]>) {
    const category = String(fact.category || "user");
    const profile = modelExtractionTopicConceptProfile(fact.text);
    const concepts = profile.concepts;
    const originalTopicId = String(fact.topicId || "");
    const priorTopicId = topicAliases.get(originalTopicId) || originalTopicId;
    let topic: any = null;
    let strategy = "new_semantic_topic";
    let similarityScore = 0;
    let crossLanguageReuse = false;
    if (profile.lowConfidence) {
      lowConfidenceFactCount += 1;
      const topicId = `met_${category}_unclassified`;
      topic = topics.get(topicId);
      if (!topic) {
        topic = {
          schema: "ccm-group-session-model-extraction-topic-v1",
          version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
          assignmentVersion: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
          topicId,
          category,
          name: category === "feedback" ? "Corrections: unclassified" : "User constraints: unclassified",
          slug: `model-${category}-unclassified`,
          concepts: ["unclassified"],
          createdAt: at,
          factChecksums: [],
        };
        topics.set(topicId, topic);
        createdTopicCount += 1;
      } else {
        reusedTopicCount += 1;
      }
      strategy = "low_confidence_unclassified";
    } else {
      topic = priorTopicId ? topics.get(priorTopicId) : null;
      if (topic && topic.category !== category) topic = null;
      if (topic) {
        strategy = topicAliases.has(originalTopicId) ? "historical_topic_rebalanced" : "stable_topic_reuse";
        similarityScore = modelExtractionTopicSimilarity(concepts, topic.concepts || []);
      }
    }
    if (!topic && !profile.lowConfidence) {
      const candidates = [...topics.values()]
        .filter(row => row.category === category && !["retired", "merged"].includes(String(row.status || "")) && !/_(?:general|unclassified)$/.test(String(row.topicId || "")))
        .map(row => ({ row, score: modelExtractionTopicSimilarity(concepts, row.concepts || []) }))
        .filter(item => item.score >= GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score || String(a.row.createdAt || "").localeCompare(String(b.row.createdAt || "")));
      topic = candidates[0]?.row || null;
      if (topic) {
        similarityScore = candidates[0].score;
        strategy = "semantic_similarity_reuse";
        reusedTopicCount += 1;
        const topicCanonical = new Set((topic.concepts || []).filter((concept: string) => concept.startsWith("domain_")));
        const lexicalOverlap = profile.lexicalConcepts.some((concept: string) => (topic.concepts || []).includes(concept));
        const topicLanguages = new Set(topic.languages || []);
        crossLanguageReuse = !lexicalOverlap
          && profile.language !== "unknown"
          && topicLanguages.size > 0
          && !topicLanguages.has(profile.language)
          && profile.canonicalConcepts.some((concept: string) => topicCanonical.has(concept));
      }
    }
    if (!topic) {
      const categoryTopics = [...topics.values()].filter(row => row.category === category && row.status !== "retired");
      // Reserve one bounded slot for the deterministic overflow topic.
      if (categoryTopics.length >= maxPerCategory - 1) {
        const topicId = `met_${category}_general`;
        topic = topics.get(topicId);
        if (!topic) {
          topic = {
            schema: "ccm-group-session-model-extraction-topic-v1",
            version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
            assignmentVersion: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
            topicId,
            category,
            name: category === "feedback" ? "Corrections: consolidated" : "User constraints: consolidated",
            slug: `model-${category}-consolidated`,
            concepts: ["consolidated"],
            createdAt: at,
            factChecksums: [],
          };
          topics.set(topicId, topic);
          createdTopicCount += 1;
        }
        strategy = "capacity_consolidated";
      } else {
        const identityConcepts = concepts.length ? concepts.slice(0, 4) : [checksum(fact.text, 12)];
        let topicId = `met_${checksum([category, identityConcepts], 20)}`;
        let collision = 0;
        while (topics.has(topicId)) {
          collision += 1;
          topicId = `met_${checksum([category, identityConcepts, collision], 20)}`;
        }
        topic = {
          schema: "ccm-group-session-model-extraction-topic-v1",
          version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
          assignmentVersion: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
          topicId,
          category,
          name: modelExtractionTopicDisplayConcept(identityConcepts, category, topicId),
          slug: modelExtractionTopicSlug(category, identityConcepts, topicId),
          concepts: identityConcepts,
          createdAt: at,
          factChecksums: [],
        };
        topics.set(topicId, topic);
        createdTopicCount += 1;
      }
    } else if (!["low_confidence_unclassified", "semantic_similarity_reuse"].includes(strategy)) {
      reusedTopicCount += 1;
    }
    topic.status = "active";
    delete topic.retiredAt;
    delete topic.mergedIntoTopicId;
    topic.updatedAt = at;
    topic.assignmentVersion = GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
    topic.concepts = uniqueStrings([...(topic.concepts || []), ...concepts], 20);
    topic.languages = uniqueStrings([...(topic.languages || []), profile.language].filter(language => language !== "unknown"), 4);
    topic.factChecksums = [...new Set([...(topic.factChecksums || []), factChecksum])];
    const rebalancedNow = !!originalTopicId && originalTopicId !== topic.topicId;
    const rebalanced = rebalancedNow || fact.topicAssignment?.rebalanced === true;
    facts[factChecksum] = {
      ...fact,
      topicId: topic.topicId,
      topicSlug: topic.slug,
      topicAssignment: {
        schema: "ccm-group-session-model-extraction-topic-assignment-v1",
        version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
        strategy,
        confidence: profile.confidence,
        similarityScore: Number(similarityScore.toFixed(4)),
        lowConfidence: profile.lowConfidence,
        rebalanced,
        rebalancedFromTopicId: rebalancedNow ? originalTopicId : String(fact.topicAssignment?.rebalancedFromTopicId || ""),
        crossLanguageReuse: crossLanguageReuse || fact.topicAssignment?.crossLanguageReuse === true,
        initialStrategy: String(fact.topicAssignment?.initialStrategy || fact.topicAssignment?.strategy || strategy),
        language: profile.language,
        concepts: profile.concepts,
        firstAssignedAt: String(fact.topicAssignment?.firstAssignedAt || fact.topicAssignment?.assignedAt || at),
        assignedAt: at,
      },
    };
  }

  for (const category of ["user", "feedback"]) {
    const generalTopicId = `met_${category}_general`;
    const unclassifiedTopicId = `met_${category}_unclassified`;
    const regularTopics = [...topics.values()]
      .filter(topic => topic.category === category
        && topic.status === "active"
        && ![generalTopicId, unclassifiedTopicId].includes(topic.topicId)
        && (topic.factChecksums || []).length > 0)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.topicId || "").localeCompare(String(b.topicId || "")));
    const unclassifiedActive = Number((topics.get(unclassifiedTopicId)?.factChecksums || []).length > 0);
    const generalAlreadyActive = Number((topics.get(generalTopicId)?.factChecksums || []).length > 0);
    const currentRegularLimit = Math.max(0, maxPerCategory - unclassifiedActive - generalAlreadyActive);
    if (regularTopics.length <= currentRegularLimit) continue;
    let generalTopic = topics.get(generalTopicId);
    if (!generalTopic) {
      generalTopic = {
        schema: "ccm-group-session-model-extraction-topic-v1",
        version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
        assignmentVersion: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
        topicId: generalTopicId,
        category,
        name: category === "feedback" ? "Corrections: consolidated" : "User constraints: consolidated",
        slug: `model-${category}-consolidated`,
        concepts: ["consolidated"],
        createdAt: at,
        factChecksums: [],
      };
      topics.set(generalTopicId, generalTopic);
      createdTopicCount += 1;
    }
    generalTopic.status = "active";
    generalTopic.updatedAt = at;
    generalTopic.assignmentVersion = GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
    delete generalTopic.retiredAt;
    const boundedRegularLimit = Math.max(0, maxPerCategory - unclassifiedActive - 1);
    for (const overflowTopic of regularTopics.slice(boundedRegularLimit)) {
      for (const factChecksum of overflowTopic.factChecksums || []) {
        generalTopic.factChecksums = [...new Set([...(generalTopic.factChecksums || []), factChecksum])];
        if (facts[factChecksum]) {
          const assignment = facts[factChecksum].topicAssignment || {};
          facts[factChecksum] = {
            ...facts[factChecksum],
            topicId: generalTopic.topicId,
            topicSlug: generalTopic.slug,
            topicAssignment: {
              ...assignment,
              strategy: "capacity_rebalanced",
              rebalanced: true,
              rebalancedFromTopicId: String(assignment.rebalancedFromTopicId || overflowTopic.topicId),
              initialStrategy: String(assignment.initialStrategy || assignment.strategy || "capacity_rebalanced"),
              assignedAt: at,
            },
          };
        }
      }
      generalTopic.concepts = uniqueStrings([...(generalTopic.concepts || []), ...(overflowTopic.concepts || [])], 20);
      overflowTopic.factChecksums = [];
      overflowTopic.updatedAt = at;
    }
  }

  for (const topic of topics.values()) {
    const topicFacts = (topic.factChecksums || []).map((factChecksum: string) => facts[factChecksum]).filter(Boolean);
    if (!topicFacts.length) continue;
    const confidences = topicFacts.map((fact: any) => Number(fact.topicAssignment?.confidence || 0));
    topic.assignmentVersion = GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
    topic.meanAssignmentConfidence = Number((confidences.reduce((sum: number, value: number) => sum + value, 0) / confidences.length).toFixed(4));
    topic.lowConfidenceFactCount = topicFacts.filter((fact: any) => fact.topicAssignment?.lowConfidence === true).length;
    topic.rebalancedFactCount = topicFacts.filter((fact: any) => fact.topicAssignment?.rebalanced === true).length;
  }

  for (const [topicId, topic] of topics.entries()) {
    if ((topic.factChecksums || []).length > 0) continue;
    topic.status = "retired";
    topic.retiredAt = topic.retiredAt || at;
    topics.set(topicId, topic);
  }
  for (const [retiredId, canonicalId] of topicAliases.entries()) {
    const prior: any = previousTopics[retiredId];
    if (!prior) continue;
    topics.set(retiredId, { ...prior, status: "merged", mergedIntoTopicId: canonicalId, factChecksums: [], retiredAt: at, updatedAt: at });
  }
  const activeTopicCount = [...topics.values()].filter(topic => topic.status === "active").length;
  const retiredTopicCount = [...topics.values()].filter(topic => topic.status === "retired").length;
  const consolidatedFactCount = [...topics.values()]
    .filter(topic => topic.status === "active" && topic.topicId === `met_${topic.category}_general`)
    .reduce((sum, topic) => sum + Number(topic.factChecksums?.length || 0), 0);
  const unclassifiedFactCount = [...topics.values()]
    .filter(topic => topic.status === "active" && topic.topicId === `met_${topic.category}_unclassified`)
    .reduce((sum, topic) => sum + Number(topic.factChecksums?.length || 0), 0);
  const activeAssignmentFacts = Object.values(facts).filter((fact: any) => fact?.status === "active");
  const rebalancedFactCount = activeAssignmentFacts.filter((fact: any) => fact.topicAssignment?.rebalanced === true).length;
  const crossLanguageReuseCount = activeAssignmentFacts.filter((fact: any) => fact.topicAssignment?.crossLanguageReuse === true).length;
  return {
    schema: "ccm-group-session-model-extraction-topic-lifecycle-v1",
    version: GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
    facts,
    topics: Object.fromEntries([...topics.entries()]
      .sort((a: any, b: any) => Number(a[1].status === "active") - Number(b[1].status === "active") || String(a[1].updatedAt || a[1].createdAt || "").localeCompare(String(b[1].updatedAt || b[1].createdAt || "")))
      .slice(-200)),
    activeTopicCount,
    retiredTopicCount,
    mergedTopicCount: topicAliases.size,
    createdTopicCount,
    reusedTopicCount,
    consolidatedFactCount,
    unclassifiedFactCount,
    lowConfidenceFactCount,
    rebalancedFactCount,
    crossLanguageReuseCount,
    maxTopicsPerCategory: maxPerCategory,
    updatedAt: at,
  };
}

export function renderModelExtractionTypedMemoryBody(title: string, facts: any[], updatedAt: string) {
  const lines = [
    `# ${title}`,
    "",
    `Committed from evidence-bound model extraction proposals at ${updatedAt}.`,
    "Only active facts with an exact raw user-message source are rendered. Superseded facts remain in the audit ledger but are not injected.",
    "",
    "## Active Facts",
  ];
  for (const fact of facts) {
    lines.push(`- #${fact.sourceMessageId} ${compactText(fact.text, 900)}`);
    lines.push(`  - **Evidence:** execution=${fact.executionId}; receipt=${fact.receiptChecksum}; graph=${fact.graphChecksum}`);
  }
  return `${lines.join("\n").trim()}\n`;
}

export function distillGroupSessionModelExtractionToTypedMemory(scopeId: string, input: any, options: any = {}) {
  return require("./group-memory-distillation").distillGroupSessionModelExtractionToTypedMemory(scopeId, input, options);
}

export function normalizeProviderReproofReceiptConsumptionStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["strong", "native_strong", "provider_strong"].includes(status)) return "strong";
  if (["used", "consumed", "applied"].includes(status)) return "used";
  if (["verified", "checked", "rechecked"].includes(status)) return "verified";
  if (["ignored", "not_used", "not-used", "not used", "skipped"].includes(status)) return "ignored";
  if (["blocked", "failed", "needs_info", "needs-user", "needs_user", "waiting"].includes(status)) return "blocked";
  return status ? "invalid" : "missing";
}

export function providerReproofReceiptConsumptionCategory(status: string) {
  return status === "ignored" || status === "blocked" ? "caution" : "promoted";
}

export function providerReproofReceiptConsumptionRecommendation(row: any = {}) {
  const status = String(row.status || "");
  if (status === "blocked") return "requires_followup_before_reuse";
  if (status === "ignored") return "do_not_promote_unless_current_task_explicitly_matches";
  if (status === "strong") return "recall_but_verify_native_provider_proof_ledger";
  if (status === "verified") return "promote_recall_with_current_source_verification";
  return "promote_recall_with_current_repo_verification";
}
