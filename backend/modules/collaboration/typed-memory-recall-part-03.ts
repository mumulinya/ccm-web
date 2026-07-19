// Behavior-freeze split from typed-memory-recall.ts (part 3/3).
// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { buildCrossGroupProviderDispatchReliabilitySignal, getGroupTypedMemoryDistillationLedgerFile, pressureProvenanceProviderDispatchOverrideFollowupArchive, pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive, providerDispatchReliabilityRound, providerSwitchExecutionArchive, readGroupTypedMemoryDistillationLedger, scoreProviderDispatchReliabilityRows, scoreProviderSwitchExecutionRows, summarizeProviderDispatchOverrideFollowupPolicyAttributions, summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions, summarizeProviderSwitchExecutionPolicyAttributions } from "./typed-memory-distillation-receipts";
import { buildGroupTypedMemoryIndex, scanGroupTypedMemoryDocuments, scanGroupTypedMemoryDocumentsRaw, upsertGroupTypedMemoryDocument } from "./typed-memory-index-build";
import { readGroupTypedMemoryRecallLedger, readGroupTypedMemoryStaleCandidateLedger, writeGroupTypedMemoryStaleCandidateLedger } from "./typed-memory-ledgers";
import { GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES, SEMANTIC_RECALL_CONCEPTS, checksum, compactText, firstFiniteNumber, isExactGroupTypedMemorySessionScope, normalizeMemoryType, now, safeSegment, tokens, typedMemoryDeliveryLeaseChecksum, typedMemoryStaleRejectionChecksum, typedMemoryStaleResolutionChecksum, uniqueStrings, writeJsonAtomic } from "./typed-memory-shared";

import {
  typedMemoryStaleCandidateChecksum,
} from "./typed-memory-recall-part-02";

export function typedMemoryStaleCandidateRejection(scopeId: string, row: any, codes: string[], at: string) {
  const payload = {
    schema: "ccm-group-typed-memory-stale-candidate-rejection-v1",
    version: 1,
    rejection_id: `tmsr_${checksum([scopeId, row.task_id || row.taskId || "", row.execution_id || row.executionId || "", row.task_agent_session_id || row.taskAgentSessionId || "", row.rel_path || row.relPath || "", row.recommended_memory_action || row.recommendedMemoryAction || "", codes], 28)}`,
    scope_id: scopeId,
    task_id: String(row.task_id || row.taskId || ""),
    execution_id: String(row.execution_id || row.executionId || ""),
    task_agent_session_id: String(row.task_agent_session_id || row.taskAgentSessionId || ""),
    rel_path: String(row.rel_path || row.relPath || ""),
    requested_action: String(row.recommended_memory_action || row.recommendedMemoryAction || ""),
    rejection_codes: uniqueStrings(codes).slice(0, 16),
    rejected_at: at,
  };
  return { ...payload, checksum: typedMemoryStaleRejectionChecksum(payload) };
}

export function recordGroupTypedMemoryStaleCandidates(groupId: string, input: any = {}) {
  const scopeId = String(groupId || "").trim();
  const rows = Array.isArray(input.rows) ? input.rows.slice(0, 240) : [];
  const ledger = readGroupTypedMemoryStaleCandidateLedger(scopeId);
  if (ledger.ledger_checksum_valid !== true) {
    return { ...ledger, recorded_count: 0, duplicate_count: 0, rejected_this_run: rows.length, blocked_reason: "ledger_checksum_invalid" };
  }
  const at = String(input.generatedAt || input.generated_at || now());
  if (!isExactGroupTypedMemorySessionScope(scopeId)) {
    const scopeRejections = rows
      .filter((row: any) => row.conflict_detected === true || row.conflictDetected === true)
      .map((row: any) => typedMemoryStaleCandidateRejection(scopeId, row, ["invalid_or_unscoped_group_session"], at));
    return {
      ...ledger,
      rejections: [...ledger.rejections, ...scopeRejections],
      recorded_count: 0,
      duplicate_count: 0,
      rejected_this_run: scopeRejections.length,
      persisted: false,
      blocked_reason: "invalid_or_unscoped_group_session",
    };
  }
  const candidates = [...ledger.candidates.map((candidate: any) => {
    const { status, resolution, ...stored } = candidate;
    return stored;
  })];
  const events = [...ledger.resolution_events];
  const rejections = [...ledger.rejections];
  const docs = new Map(scanGroupTypedMemoryDocumentsRaw(scopeId).map((doc: any) => [String(doc.relPath || "").toLowerCase(), doc]));
  const existingIds = new Set(candidates.map((candidate: any) => String(candidate.candidate_id || "")));
  const existingRejectionIds = new Set(rejections.map((rejection: any) => String(rejection.rejection_id || "")));
  let recordedCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;
  for (const row of rows) {
    const conflictDetected = row.conflict_detected === true || row.conflictDetected === true;
    if (!conflictDetected) continue;
    const relPath = String(row.rel_path || row.relPath || "").trim();
    const documentChecksum = String(row.document_checksum || row.documentChecksum || "").trim();
    const action = String(row.recommended_memory_action || row.recommendedMemoryAction || "").trim().toLowerCase();
    const conflictKind = String(row.conflict_kind || row.conflictKind || "behavior_changed").trim().toLowerCase();
    const conflictReason = compactText(row.conflict_reason || row.conflictReason || "", 1200);
    const replacementMemory = compactText(row.replacement_memory || row.replacementMemory || "", 12_000);
    const currentDoc: any = docs.get(relPath.toLowerCase());
    const rejectionCodes: string[] = [];
    if (!isExactGroupTypedMemorySessionScope(scopeId)) rejectionCodes.push("invalid_or_unscoped_group_session");
    if (String(row.usage_state || row.usageState || "").toLowerCase() === "ignored") rejectionCodes.push("ignored_memory_cannot_create_candidate");
    if (!relPath || !documentChecksum || !currentDoc || String(currentDoc.checksum || "") !== documentChecksum) rejectionCodes.push("memory_document_binding_invalid");
    if (row.evidence_valid !== true && row.evidenceValid !== true) rejectionCodes.push("task_snapshot_binding_invalid");
    if (!String(row.task_agent_session_id || row.taskAgentSessionId || "").trim()
      || !String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || "").trim()
      || !String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || "").trim()
      || !String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || "").trim()) rejectionCodes.push("delivery_binding_incomplete");
    const proofValid = row.current_source_proof_valid === true || row.currentSourceProofValid === true;
    const claimedSourceChecksum = String(row.current_source_claimed_checksum || row.currentSourceClaimedChecksum || "").trim().toLowerCase();
    const observedSourceChecksum = String(row.current_source_observed_checksum || row.currentSourceObservedChecksum || "").trim().toLowerCase();
    if (!proofValid || !String(row.current_source_relative_path || row.currentSourceRelativePath || "").trim()
      || !String(row.current_source_proof_id || row.currentSourceProofId || "").trim()
      || !/^[a-f0-9]{64}$/.test(observedSourceChecksum)
      || claimedSourceChecksum !== observedSourceChecksum) rejectionCodes.push("current_source_proof_invalid");
    if (!["update", "remove"].includes(action)) rejectionCodes.push("unsupported_memory_action");
    if (!conflictReason) rejectionCodes.push("missing_conflict_reason");
    if (action === "update" && !replacementMemory) rejectionCodes.push("missing_replacement_memory");
    if (rejectionCodes.length) {
      const rejection = typedMemoryStaleCandidateRejection(scopeId, row, rejectionCodes, at);
      if (existingRejectionIds.has(rejection.rejection_id)) duplicateCount += 1;
      else {
        rejections.push(rejection);
        existingRejectionIds.add(rejection.rejection_id);
        rejectedCount += 1;
      }
      continue;
    }
    const candidateId = `tmsc_${checksum([
      scopeId,
      row.task_id || row.taskId || "",
      row.execution_id || row.executionId || "",
      row.task_agent_session_id || row.taskAgentSessionId || "",
      relPath.toLowerCase(),
      documentChecksum,
      action,
      conflictReason,
      replacementMemory,
      observedSourceChecksum,
    ], 28)}`;
    if (existingIds.has(candidateId)) {
      duplicateCount += 1;
      continue;
    }
    const payload = {
      schema: "ccm-group-typed-memory-stale-candidate-v1",
      version: 1,
      candidate_id: candidateId,
      scope_id: scopeId,
      target_project: String(row.target_project || row.targetProject || input.targetProject || input.target_project || ""),
      task_id: String(row.task_id || row.taskId || input.taskId || input.task_id || ""),
      execution_id: String(row.execution_id || row.executionId || input.executionId || input.execution_id || ""),
      task_agent_session_id: String(row.task_agent_session_id || row.taskAgentSessionId || ""),
      memory_context_snapshot_id: String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || ""),
      memory_context_snapshot_checksum: String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || ""),
      delivery_receipt_checksum: String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || ""),
      rel_path: relPath,
      document_checksum: documentChecksum,
      memory_name: compactText(currentDoc.name || "", 180),
      memory_type: normalizeMemoryType(currentDoc.type),
      conflict_kind: conflictKind,
      recommended_action: action,
      conflict_reason: conflictReason,
      replacement_memory: action === "update" ? replacementMemory : "",
      current_source_relative_path: String(row.current_source_relative_path || row.currentSourceRelativePath || ""),
      current_source_claimed_checksum: claimedSourceChecksum,
      current_source_observed_checksum: observedSourceChecksum,
      current_source_proof_id: String(row.current_source_proof_id || row.currentSourceProofId || ""),
      receipt_evidence_checksum: String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || ""),
      generated_at: String(row.generated_at || row.generatedAt || at),
    };
    candidates.push({ ...payload, checksum: typedMemoryStaleCandidateChecksum(payload) });
    existingIds.add(candidateId);
    recordedCount += 1;
  }
  const next = writeGroupTypedMemoryStaleCandidateLedger(scopeId, {
    candidates,
    resolution_events: events,
    rejections,
    updated_at: at,
  });
  return { ...next, recorded_count: recordedCount, duplicate_count: duplicateCount, rejected_this_run: rejectedCount };
}

export function verifyTypedMemoryStaleCandidateCurrentSource(candidate: any) {
  const project = String(candidate.target_project || "").trim().toLowerCase();
  const relativePath = String(candidate.current_source_relative_path || "").trim();
  const expectedChecksum = String(candidate.current_source_observed_checksum || "").trim().toLowerCase();
  if (!project || !relativePath || !/^[a-f0-9]{64}$/.test(expectedChecksum)) return { valid: false, status: "candidate_source_binding_invalid" };
  try {
    const db = require("../../core/db");
    const config = (db.getConfigs() || []).find((item: any) => String(item?.name || "").trim().toLowerCase() === project);
    const workDir = String(config ? db.getConfigInfo(config.path)?.[0]?.workDir || "" : "").trim();
    if (!workDir || !fs.existsSync(workDir)) return { valid: false, status: "project_workdir_unavailable" };
    const realRoot = fs.realpathSync(path.resolve(workDir));
    const requested = path.resolve(realRoot, relativePath);
    if (!fs.existsSync(requested)) return { valid: false, status: "source_missing" };
    const realFile = fs.realpathSync(requested);
    const rootPrefix = `${realRoot}${path.sep}`.toLowerCase();
    if (realFile.toLowerCase() !== realRoot.toLowerCase() && !realFile.toLowerCase().startsWith(rootPrefix)) return { valid: false, status: "source_outside_project" };
    if (!fs.statSync(realFile).isFile()) return { valid: false, status: "source_not_file" };
    const observedChecksum = crypto.createHash("sha256").update(fs.readFileSync(realFile)).digest("hex");
    return { valid: observedChecksum === expectedChecksum, status: observedChecksum === expectedChecksum ? "system_file_checksum_match" : "source_changed_since_candidate", observed_checksum: observedChecksum };
  } catch {
    return { valid: false, status: "source_revalidation_failed" };
  }
}

export function resolveGroupTypedMemoryStaleCandidate(groupId: string, input: any = {}) {
  const scopeId = String(groupId || "").trim();
  if (!isExactGroupTypedMemorySessionScope(scopeId)) throw new Error("Stale memory candidate resolution requires exact group--gcs_* scope");
  if (input.explicitConfirmation !== true && input.explicit_confirmation !== true) throw new Error("Stale memory candidate resolution requires explicit user confirmation");
  const reason = compactText(input.reason || "", 800);
  if (!reason) throw new Error("Stale memory candidate resolution requires a reason");
  const requestedAction = String(input.action || "").trim().toLowerCase();
  if (!["confirm_update", "confirm_remove", "reject"].includes(requestedAction)) throw new Error("Unsupported stale memory candidate resolution action");
  const candidateId = String(input.candidateId || input.candidate_id || "").trim();
  const candidateChecksum = String(input.candidateChecksum || input.candidate_checksum || "").trim();
  const ledger = readGroupTypedMemoryStaleCandidateLedger(scopeId);
  if (ledger.ledger_checksum_valid !== true) throw new Error("Stale memory candidate ledger checksum is invalid");
  const candidate = ledger.candidates.find((item: any) => item.candidate_id === candidateId);
  if (!candidate || candidate.status !== "pending") throw new Error("Pending stale memory candidate not found");
  if (!candidateChecksum || candidateChecksum !== candidate.checksum) throw new Error("Stale memory candidate checksum mismatch");
  const action = requestedAction === "reject" ? candidate.recommended_action : requestedAction.replace("confirm_", "");
  if (requestedAction !== "reject" && action !== candidate.recommended_action) throw new Error("Confirmed action does not match candidate recommendation");
  let replacementRelPath = "";
  let replacementDocumentChecksum = "";
  if (requestedAction !== "reject") {
    const doc = scanGroupTypedMemoryDocumentsRaw(scopeId).find((item: any) => String(item.relPath || "").toLowerCase() === String(candidate.rel_path || "").toLowerCase());
    if (!doc || String(doc.checksum || "") !== String(candidate.document_checksum || "")) throw new Error("Memory document changed since candidate creation");
    const sourceProof = verifyTypedMemoryStaleCandidateCurrentSource(candidate);
    if (sourceProof.valid !== true) throw new Error(`Current source proof is no longer valid: ${sourceProof.status}`);
    if (action === "update") {
      const write = upsertGroupTypedMemoryDocument(scopeId, {
        type: candidate.memory_type || "project",
        slug: `stale-replacement-${candidate.candidate_id}`,
        name: `${candidate.memory_name || candidate.rel_path} (confirmed update)`,
        description: candidate.conflict_reason,
        source: `stale-memory-resolution:${candidate.candidate_id}`,
        updatedAt: now(),
        body: candidate.replacement_memory,
      });
      replacementRelPath = path.basename(write.file);
      replacementDocumentChecksum = String(scanGroupTypedMemoryDocumentsRaw(scopeId)
        .find((item: any) => String(item.relPath || "").toLowerCase() === replacementRelPath.toLowerCase())?.checksum || "");
      if (!replacementDocumentChecksum) throw new Error("Replacement memory document could not be verified");
    }
  }
  const at = now();
  const eventPayload = {
    schema: "ccm-group-typed-memory-stale-resolution-event-v1",
    version: 1,
    event_id: `tmse_${checksum([scopeId, candidateId, requestedAction, candidateChecksum, at], 28)}`,
    candidate_id: candidateId,
    candidate_checksum: candidateChecksum,
    scope_id: scopeId,
    action,
    status: requestedAction === "reject" ? "rejected" : "applied",
    rel_path: candidate.rel_path,
    document_checksum: candidate.document_checksum,
    replacement_rel_path: replacementRelPath,
    replacement_document_checksum: replacementDocumentChecksum,
    actor: String(input.actor || "local-user"),
    reason,
    resolved_at: at,
  };
  const event = { ...eventPayload, checksum: typedMemoryStaleResolutionChecksum(eventPayload) };
  const storedCandidates = ledger.candidates.map((item: any) => {
    const { status, resolution, ...stored } = item;
    return stored;
  });
  const next = writeGroupTypedMemoryStaleCandidateLedger(scopeId, {
    candidates: storedCandidates,
    resolution_events: [...ledger.resolution_events, event],
    rejections: ledger.rejections,
    updated_at: at,
  });
  if (event.status === "applied") buildGroupTypedMemoryIndex(scopeId);
  return { event, candidate: next.candidates.find((item: any) => item.candidate_id === candidateId), ledger: next };
}

export function buildGroupTypedMemoryRecallFreshness(doc: any, nowMs = Date.now()) {
  const parsedUpdatedAt = Date.parse(String(doc?.updatedAt || doc?.updated_at || ""));
  const observedMtimeMs = Number(doc?.mtimeMs || doc?.mtime_ms || 0)
    || (Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : Number(nowMs || Date.now()));
  const evaluatedAtMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const ageDays = Math.max(0, Math.floor((evaluatedAtMs - observedMtimeMs) / 86_400_000));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${ageDays} days ago`;
  const stale = ageDays > 1;
  return {
    schema: "ccm-group-typed-memory-recall-freshness-v1",
    version: 1,
    observed_mtime_ms: observedMtimeMs,
    observed_at: new Date(observedMtimeMs).toISOString(),
    evaluated_at: new Date(evaluatedAtMs).toISOString(),
    age_days: ageDays,
    age_label: ageLabel,
    stale_after_days: 1,
    stale,
    current_source_verification_required: true,
    warning: stale
      ? `This memory is ${ageDays} days old. Memories are point-in-time observations, not live state; verify current files, functions, flags, and resources before asserting them as fact.`
      : "",
  };
}

export function buildGroupTypedMemoryRecall(groupId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryRecall(groupId, query, options);
}

export function renderGroupTypedMemoryRecall(recall: any) {
  return require("./group-memory-loading").renderGroupTypedMemoryRecall(recall);
}
