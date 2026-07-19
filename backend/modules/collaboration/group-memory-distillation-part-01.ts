// Behavior-freeze split from group-memory-distillation.ts (part 1/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
  GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
  GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE,
  GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_LEDGER,
  GROUP_TYPED_MEMORY_DISTILLATION_LOCK,
  GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
  GroupTypedMemoryType,
  acquireGroupTypedMemoryDistillationLock,
  activeGroupTypedMemoryDistillationMutations,
  addDistillationQualityCheck,
  buildGroupSessionModelExtractionTypedMemoryTopics,
  buildGroupTypedMemoryDistillationWorkState,
  buildGroupTypedMemoryIndex,
  checksum,
  collectDistilledFacts,
  commitGroupTypedMemoryArtifactMutation,
  compactStrategyInputOutcomes,
  compactStrategyInputStrategy,
  compactStrategyTypedArchive,
  compactText,
  contextUsageRepairArchive,
  distillGroupMessagesToTypedMemoryUnlocked,
  distillationQualityPenalty,
  extractPathClaims,
  extractTaskStateSignal,
  getGroupTypedMemoryDir,
  groupLogDistillationAdmission,
  groupTypedMemoryDistillationLockChecksum,
  groupTypedMemoryDistillationStateChecksum,
  ignoreMemoryReceiptRepairArchive,
  loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows,
  mergeContextUsageRepairRows,
  mergeIgnoreMemoryReceiptRepairRows,
  mergePostCompactCompletionMemoryPreservationRepairClosureRows,
  mergePostCompactReceiptMemoryUsageRepairCompletionRows,
  mergePostCompactReinjectionRepairReceiptConsumptionRows,
  mergePressureMemoryProvenanceReceiptRepairRows,
  mergePressureProvenancePreDispatchComplianceRecoveryRows,
  mergePressureProvenancePreDispatchComplianceRows,
  mergeProviderDispatchOverrideFollowupReceiptValidationRows,
  mergeProviderDispatchOverrideFollowupRows,
  mergeProviderRankingMemoryUsageReceiptRepairRows,
  mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  mergeProviderReproofReceiptConsumptionRows,
  mergeProviderSwitchExecutionRows,
  modelExtractionEvidenceComparable,
  modelExtractionTypedArchiveChecksum,
  normalizeContextUsageRepairRows,
  normalizeIgnoreMemoryReceiptRepairRows,
  normalizeMemoryType,
  normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows,
  normalizePostCompactCompletionMemoryPreservationRepairClosureRows,
  normalizePostCompactReceiptMemoryUsageRepairCompletionRows,
  normalizePostCompactReinjectionRepairReceiptConsumptionRows,
  normalizePressureMemoryProvenanceReceiptRepairRows,
  normalizePressureProvenancePreDispatchComplianceRecoveryRows,
  normalizePressureProvenancePreDispatchComplianceRows,
  normalizeProviderDispatchOverrideFollowupReceiptValidationRows,
  normalizeProviderDispatchOverrideFollowupRows,
  normalizeProviderRankingMemoryUsageReceiptRepairRows,
  normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  normalizeProviderReproofReceiptConsumptionRows,
  normalizeProviderSwitchExecutionRows,
  now,
  positiveFeedbackLifecycleEventChecksum,
  postCompactReceiptMemoryUsageRepairCompletionArchive,
  pressureMemoryProvenanceReceiptRepairArchive,
  pressureProvenancePreDispatchComplianceArchive,
  pressureProvenancePreDispatchComplianceRecoveryArchive,
  pressureProvenanceProviderDispatchOverrideFollowupArchive,
  pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive,
  providerRankingMemoryUsageReceiptRepairArchive,
  providerSwitchExecutionArchive,
  ptlEmergencyTypedArchive,
  readJson,
  recoverGroupTypedMemoryArtifactTransaction,
  releaseGroupTypedMemoryDistillationLock,
  renderCompactStrategyCautionBody,
  renderCompactStrategyReferenceBody,
  renderContextUsageRepairBody,
  renderIgnoreMemoryReceiptRepairBody,
  renderModelExtractionTypedMemoryBody,
  renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody,
  renderPostCompactCompletionMemoryPreservationRepairClosureBody,
  renderPostCompactReceiptMemoryUsageRepairCompletionBody,
  renderPostCompactReinjectionRepairReceiptConsumptionBody,
  renderPressureMemoryProvenanceReceiptRepairBody,
  renderPressureProvenancePreDispatchComplianceBody,
  renderPressureProvenancePreDispatchComplianceRecoveryBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody,
  renderProviderRankingMemoryUsageReceiptRepairBody,
  renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody,
  renderProviderReproofReceiptConsumptionBody,
  renderProviderSwitchExecutionBody,
  renderPtlEmergencyTypedBody,
  resolveClaimPath,
  scanGroupTypedMemoryDocuments,
  scanGroupTypedMemoryDocumentsRaw,
  stageGroupTypedMemoryArtifactRemoval,
  typedMemoryDistillationProcessAlive,
  typedMemoryDistillationWait,
  typedMemorySessionScopeIdentity,
  uniqueStrings,
  upsertGroupTypedMemoryDocument,
  validateModelExtractionTypedMemoryInput,
  verifyGroupTypedMemoryDistillationLock,
  writeGroupTypedMemoryDistillationTransactionState,
  writeJsonAtomic,
  writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive,
} from "./group-memory-index";

export function getGroupTypedMemoryDistillationLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_DISTILLATION_LEDGER);
}

export function getGroupTypedMemoryDistillationLockFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_DISTILLATION_LOCK);
}

export function getGroupTypedMemoryDistillationTransactionStateFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE);
}

export function inspectGroupTypedMemoryDistillationLock(groupId: string, options: any = {}) {
  const file = String(options.file || getGroupTypedMemoryDistillationLockFile(groupId));
  const lock = readJson(file, null);
  const filePresent = fs.existsSync(file);
  if (!lock) {
    let ageMs = 0;
    try { ageMs = Math.max(0, Date.now() - fs.statSync(file).mtimeMs); } catch {}
    return filePresent
      ? { file, present: true, valid: false, checksumValid: false, identityValid: false, active: false, stale: false, corrupt: true, ageMs, lock: null }
      : { file, present: false, valid: true, active: false, stale: false, corrupt: false, ageMs: 0, lock: null };
  }
  const checksumValid = String(lock.lockChecksum || "") === groupTypedMemoryDistillationLockChecksum(lock);
  const identityValid = lock.schema === "ccm-group-typed-memory-distillation-lock-v1"
    && Number(lock.version || 0) === GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION
    && String(lock.groupId || "") === groupId
    && !!String(lock.leaseId || "")
    && Number(lock.fencingToken || 0) > 0;
  const ownerLocal = String(lock.ownerHostname || "") === os.hostname();
  const ownerAlive = !ownerLocal || typedMemoryDistillationProcessAlive(Number(lock.ownerPid || 0));
  const expiresAtMs = Date.parse(String(lock.expiresAt || ""));
  const unexpired = Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs;
  const valid = checksumValid && identityValid;
  // A live local owner remains authoritative even if a long synchronous
  // distillation crosses its nominal TTL. Remote owners require an unexpired lease.
  const active = valid && lock.status === "active" && ownerAlive && (ownerLocal || unexpired);
  let ageMs = 0;
  try { ageMs = Math.max(0, Date.now() - fs.statSync(file).mtimeMs); } catch {}
  return {
    file,
    present: true,
    valid,
    checksumValid,
    identityValid,
    active,
    stale: valid && lock.status === "active" && !active,
    ownerLocal,
    ownerAlive,
    unexpired,
    ageMs,
    lock,
  };
}

export function readGroupTypedMemoryDistillationTransactionState(groupId: string) {
  const file = getGroupTypedMemoryDistillationTransactionStateFile(groupId);
  const state = readJson(file, null);
  const filePresent = fs.existsSync(file);
  if (!state) return filePresent
    ? { file, present: true, valid: false, checksumValid: false, identityValid: false, corrupt: true, state: null }
    : { file, present: false, valid: true, corrupt: false, state: null };
  const checksumValid = String(state.stateChecksum || "") === groupTypedMemoryDistillationStateChecksum(state);
  const identityValid = state.schema === "ccm-group-typed-memory-distillation-transaction-state-v1"
    && Number(state.version || 0) === GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION
    && String(state.groupId || "") === groupId;
  return { file, present: true, valid: checksumValid && identityValid, checksumValid, identityValid, state };
}

export function runGroupTypedMemoryDistillationMutation(groupId: string, mutationKind: string, options: any, operation: (context: any) => any) {
  const existing = activeGroupTypedMemoryDistillationMutations.get(groupId);
  if (existing?.handle) {
    existing.depth = Number(existing.depth || 1) + 1;
    existing.mutationKinds = [...new Set([...(existing.mutationKinds || []), mutationKind])];
    try {
      return operation(existing);
    } finally {
      existing.depth = Math.max(1, Number(existing.depth || 2) - 1);
    }
  }

  const acquired = acquireGroupTypedMemoryDistillationLock(groupId, { ...(options || {}), mutationKind });
  if (!acquired.acquired) {
    const error: any = new Error(`typed_memory_distillation_mutation_unavailable:${acquired.reason || "lock_unavailable"}`);
    error.code = acquired.reason || "distillation_lock_unavailable";
    error.transaction = acquired;
    throw error;
  }
  const handle = acquired.handle;
  const context: any = {
    groupId,
    mutationKind,
    mutationKinds: [mutationKind],
    handle,
    options: options || {},
    pendingArtifacts: new Map<string, any>(),
    depth: 1,
    writeCount: 0,
    startedAt: String(handle.lock?.acquiredAt || now()),
  };
  activeGroupTypedMemoryDistillationMutations.set(groupId, context);
  try {
    context.artifactRecovery = recoverGroupTypedMemoryArtifactTransaction(groupId);
    const diagnosticHoldMs = Math.max(0, Math.min(10_000, Number(options?.__mutationDiagnosticHoldMs || 0)));
    if (diagnosticHoldMs > 0) typedMemoryDistillationWait(diagnosticHoldMs);
    const value = operation(context);
    commitGroupTypedMemoryArtifactMutation(context);
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (!ownership.owned) throw new Error(`typed_memory_distillation_lock_lost_after_mutation:${ownership.reason}`);
    const completedAt = now();
    const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
    const committed = Number(context.writeCount || 0) > 0;
    writeGroupTypedMemoryDistillationTransactionState(groupId, {
      status: "completed",
      mutationKind,
      mutationKinds: context.mutationKinds,
      lastMutationKind: mutationKind,
      leaseId: String(handle.lock?.leaseId || ""),
      fencingToken: Number(handle.lock?.fencingToken || 0),
      lastFencingToken: Number(handle.lock?.fencingToken || 0),
      lastCommittedFencingToken: committed
        ? Number(handle.lock?.fencingToken || 0)
        : Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
      recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
      waitedMs: Number(acquired.waitedMs || 0),
      writeCount: Number(context.writeCount || 0),
      startedAt: context.startedAt,
      completedAt,
      failedAt: "",
      error: "",
      updatedAt: completedAt,
    });
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return {
      ...value,
      distillationMutation: {
        schema: "ccm-group-typed-memory-distillation-mutation-v1",
        version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        mutationKind,
        mutationKinds: context.mutationKinds,
        leaseId: String(handle.lock?.leaseId || ""),
        fencingToken: Number(handle.lock?.fencingToken || 0),
        waitedMs: Number(acquired.waitedMs || 0),
        recoveredLeaseCount: Number(acquired.recoveredLeaseCount || 0),
        writeCount: Number(context.writeCount || 0),
        status: "completed",
        acquiredAt: context.startedAt,
        completedAt,
        artifactTransaction: context.artifactTransaction || null,
        artifactRecovery: context.artifactRecovery || null,
      },
    };
  } catch (error: any) {
    const failedAt = now();
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (ownership.owned) {
      const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
      writeGroupTypedMemoryDistillationTransactionState(groupId, {
        status: "failed",
        mutationKind,
        mutationKinds: context.mutationKinds,
        lastMutationKind: String(priorState.valid ? priorState.state?.lastMutationKind || "" : ""),
        leaseId: String(handle.lock?.leaseId || ""),
        fencingToken: Number(handle.lock?.fencingToken || 0),
        lastFencingToken: Number(handle.lock?.fencingToken || 0),
        lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
        recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
        waitedMs: Number(acquired.waitedMs || 0),
        writeCount: Number(context.writeCount || 0),
        startedAt: context.startedAt,
        completedAt: "",
        failedAt,
        error: compactText(error?.message || error, 800),
        updatedAt: failedAt,
      });
    }
    throw error;
  } finally {
    activeGroupTypedMemoryDistillationMutations.delete(groupId);
    releaseGroupTypedMemoryDistillationLock(handle, context.writeCount > 0 ? "completed" : "no_write");
  }
}

export function readGroupTypedMemoryDistillationLedger(groupId: string) {
  const file = getGroupTypedMemoryDistillationLedgerFile(groupId);
  const state = readJson(file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: {},
    updatedAt: "",
  });
  return { ...state, facts: state?.facts && typeof state.facts === "object" ? state.facts : {}, file };
}

export function distillGroupSessionModelExtractionToTypedMemory(scopeId: string, input: any, options: any = {}) {
  const validated = validateModelExtractionTypedMemoryInput(String(scopeId || "").trim(), input);
  return runGroupTypedMemoryDistillationMutation(scopeId, "model_extraction_typed_memory", options, () => {
    if (options.__modelExtractionTypedMemoryFailAfterSnapshot === true) {
      throw new Error("model_extraction_typed_memory_injected_failure");
    }
    const at = String(options.at || validated.receipt.completedAt || now());
    const ledger = readGroupTypedMemoryDistillationLedger(scopeId);
    const previousArchive = ledger.modelExtractionTypedMemoryArchive || null;
    if (previousArchive?.schema
      && (previousArchive.schema !== "ccm-group-session-model-extraction-typed-memory-archive-v1"
        || modelExtractionTypedArchiveChecksum(previousArchive) !== String(previousArchive.checksum || ""))) {
      throw new Error("model_extraction_typed_memory_archive_integrity_invalid");
    }
    const sourceById = new Map(validated.sourceRows.map((row: any) => [String(row?.id || ""), row]));
    const edges = Array.isArray(validated.graph.edges) ? validated.graph.edges : [];
    const edgeByNewChecksum = new Map(edges.map((edge: any) => [String(edge.newFactChecksum || ""), edge]));
    const facts = new Map<string, any>(Object.entries(previousArchive?.facts || {}));
    const rejections: any[] = [];
    const admitted: any[] = [];
    let duplicateCount = 0;
    let supersededCount = 0;

    for (const edge of edges) {
      for (const [factId, fact] of facts.entries()) {
        if (fact.status !== "active") continue;
        if (![fact.graphFactChecksum, fact.anchorChecksum, fact.sourceFactChecksum].includes(String(edge.oldFactChecksum || ""))) continue;
        facts.set(factId, {
          ...fact,
          status: "superseded",
          supersededAt: at,
          supersededByGraphFactChecksum: String(edge.newFactChecksum || ""),
          supersessionEdgeId: String(edge.edgeId || ""),
          supersessionExecutionId: String(validated.receipt.executionId || ""),
        });
        supersededCount += 1;
      }
    }

    const activeFacts = Array.isArray(validated.graph.activeFacts) ? validated.graph.activeFacts : [];
    for (const proposal of activeFacts) {
      const proposalType = String(proposal?.type || "");
      const source = String(proposal?.source || "");
      const reject = (reason: string) => rejections.push({
        proposalType,
        source,
        factChecksum: String(proposal?.factChecksum || ""),
        sourceMessageId: String(proposal?.sourceMessageId || ""),
        reason,
        executionId: String(validated.receipt.executionId || ""),
        rejectedAt: at,
      });
      if (["unresolved", "path", "symbol"].includes(proposalType)) {
        reject("ephemeral_or_derivable_fact_shape");
        continue;
      }
      if (!["constraint", "replacement"].includes(proposalType)) {
        reject("unsupported_model_fact_shape");
        continue;
      }
      if (!["model_confirmed_source", "explicit_replacement"].includes(source)) {
        reject("missing_current_raw_message_evidence");
        continue;
      }
      const edge: any = source === "explicit_replacement"
        ? edgeByNewChecksum.get(String(proposal.factChecksum || ""))
        : null;
      const sourceMessageId = String(proposal.sourceMessageId || edge?.sourceMessageId || "");
      const sourceRow: any = sourceById.get(sourceMessageId);
      const sourceContent = String(sourceRow?.content || "");
      const sourceChecksum = checksum(sourceContent, 32);
      const expectedSourceChecksum = String(proposal.sourceMessageChecksum || edge?.sourceMessageChecksum || "");
      const text = compactText(proposal.text || edge?.replacementText || "", 900);
      const comparableText = modelExtractionEvidenceComparable(text);
      const sourceComparable = modelExtractionEvidenceComparable(sourceContent);
      const markdownComparable = modelExtractionEvidenceComparable(validated.markdown);
      if (!sourceRow || String(sourceRow?.role || "").toLowerCase() !== "user") {
        reject("source_message_missing_or_not_user");
        continue;
      }
      if (!expectedSourceChecksum || sourceChecksum !== expectedSourceChecksum) {
        reject("source_message_checksum_mismatch");
        continue;
      }
      if (!comparableText || !sourceComparable.includes(comparableText) || !markdownComparable.includes(comparableText)) {
        reject("fact_not_exactly_bound_to_source_and_model_output");
        continue;
      }
      const category: GroupTypedMemoryType = proposalType === "replacement" ? "feedback" : "user";
      const stableFactChecksum = checksum([category, comparableText], 64);
      const existing = facts.get(stableFactChecksum);
      if (existing?.status === "active") duplicateCount += 1;
      const fact = {
        schema: "ccm-group-session-model-extraction-typed-memory-fact-v1",
        version: GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
        stableFactChecksum,
        graphFactChecksum: String(proposal.factChecksum || ""),
        anchorChecksum: checksum(`constraint\0${text}`, 32),
        sourceFactChecksum: checksum(text, 32),
        category,
        proposalType,
        text,
        status: "active",
        sourceMessageId,
        sourceMessageChecksum: sourceChecksum,
        sourceTranscriptChecksum: String(validated.receipt.requestAudit?.sourceTranscriptChecksum || ""),
        executionId: String(validated.receipt.executionId || ""),
        receiptChecksum: String(validated.receipt.checksum || ""),
        requestArtifactChecksum: String(validated.receipt.requestArtifactChecksum || ""),
        graphChecksum: String(validated.graph.checksum || ""),
        extractionFencingToken: Number(validated.receipt.fencingToken || 0),
        firstCommittedAt: existing?.firstCommittedAt || at,
        lastCommittedAt: at,
      };
      facts.set(stableFactChecksum, fact);
      admitted.push(fact);
    }

    let boundedFacts = Array.from(facts.entries())
      .sort((a: any, b: any) => Number(a[1].status === "active") - Number(b[1].status === "active")
        || String(a[1].lastCommittedAt || a[1].supersededAt || "").localeCompare(String(b[1].lastCommittedAt || b[1].supersededAt || "")))
      .slice(-500);
    const topicLifecycle = buildGroupSessionModelExtractionTypedMemoryTopics(
      Object.fromEntries(boundedFacts),
      previousArchive?.topics || {},
      { at, maxTopicsPerCategory: options.maxTopicsPerCategory || options.max_topics_per_category }
    );
    boundedFacts = Object.entries(topicLifecycle.facts || {});
    const activeTopicRows = Object.values(topicLifecycle.topics || {})
      .filter((topic: any) => topic?.status === "active")
      .sort((a: any, b: any) => String(a.category || "").localeCompare(String(b.category || "")) || String(a.name || "").localeCompare(String(b.name || "")));
    const topicDocumentSpecs: any[] = [];
    for (const topic of activeTopicRows as any[]) {
      const rows = (topic.factChecksums || [])
        .map((factChecksum: string) => topicLifecycle.facts?.[factChecksum])
        .filter((fact: any) => fact?.status === "active");
      const partCount = Math.max(1, Math.ceil(rows.length / GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE));
      topic.docSlugs = [];
      for (let part = 0; part < partCount; part += 1) {
        const partRows = rows.slice(part * GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE, (part + 1) * GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE);
        if (!partRows.length) continue;
        const slug = `${topic.slug}${partCount > 1 ? `-part-${part + 1}` : ""}`;
        topic.docSlugs.push(slug);
        topicDocumentSpecs.push({
          topic,
          rows: partRows,
          slug,
          name: partCount > 1 ? `${topic.name} (${part + 1}/${partCount})` : topic.name,
          description: `${topic.category === "feedback" ? "User corrections" : "Durable user constraints"} about ${(topic.concepts || []).slice(0, 4).join(", ") || "a stable semantic topic"}.`,
        });
      }
    }
    const execution = {
      executionId: String(validated.receipt.executionId || ""),
      receiptChecksum: String(validated.receipt.checksum || ""),
      graphChecksum: String(validated.graph.checksum || ""),
      proposalCount: activeFacts.length,
      admittedCount: admitted.length,
      rejectedCount: rejections.length,
      duplicateCount,
      supersededCount,
      activeTopicCount: topicLifecycle.activeTopicCount,
      createdTopicCount: topicLifecycle.createdTopicCount,
      reusedTopicCount: topicLifecycle.reusedTopicCount,
      consolidatedFactCount: topicLifecycle.consolidatedFactCount,
      unclassifiedFactCount: topicLifecycle.unclassifiedFactCount,
      lowConfidenceFactCount: topicLifecycle.lowConfidenceFactCount,
      rebalancedFactCount: topicLifecycle.rebalancedFactCount,
      crossLanguageReuseCount: topicLifecycle.crossLanguageReuseCount,
      status: "committed",
      committedAt: at,
    };
    const executions = [...(Array.isArray(previousArchive?.executions) ? previousArchive.executions : [])
      .filter((row: any) => String(row?.executionId || "") !== execution.executionId), execution].slice(-200);
    const archiveCore: any = {
      schema: "ccm-group-session-model-extraction-typed-memory-archive-v1",
      version: GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
      scopeId,
      groupId: validated.groupId,
      groupSessionId: validated.groupSessionId,
      facts: Object.fromEntries(boundedFacts),
      topics: topicLifecycle.topics,
      executions,
      rejections: [...(Array.isArray(previousArchive?.rejections) ? previousArchive.rejections : []), ...rejections].slice(-500),
      activeFactCount: boundedFacts.filter(([, fact]: any) => fact.status === "active").length,
      supersededFactCount: boundedFacts.filter(([, fact]: any) => fact.status === "superseded").length,
      activeTopicCount: topicLifecycle.activeTopicCount,
      retiredTopicCount: topicLifecycle.retiredTopicCount,
      mergedTopicCount: topicLifecycle.mergedTopicCount,
      consolidatedFactCount: topicLifecycle.consolidatedFactCount,
      unclassifiedFactCount: topicLifecycle.unclassifiedFactCount,
      lowConfidenceFactCount: topicLifecycle.lowConfidenceFactCount,
      rebalancedFactCount: topicLifecycle.rebalancedFactCount,
      crossLanguageReuseCount: topicLifecycle.crossLanguageReuseCount,
      updatedAt: at,
    };
    const archive = { ...archiveCore, checksum: modelExtractionTypedArchiveChecksum(archiveCore) };
    const writes: any[] = [];
    const currentDocSlugs = new Set(topicDocumentSpecs.map(spec => spec.slug));
    for (const doc of scanGroupTypedMemoryDocumentsRaw(scopeId)) {
      if (String(doc.source || "") !== "auto:model-extraction-evidence-admission" || currentDocSlugs.has(String(doc.relPath || "").replace(/\.md$/i, ""))) continue;
      stageGroupTypedMemoryArtifactRemoval(activeGroupTypedMemoryDistillationMutations.get(scopeId), doc.file);
    }
    for (const spec of topicDocumentSpecs) {
      writes.push(upsertGroupTypedMemoryDocument(scopeId, {
        type: spec.topic.category,
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        source: "auto:model-extraction-evidence-admission",
        updatedAt: at,
        body: renderModelExtractionTypedMemoryBody(spec.name, spec.rows, at),
        maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
      }));
    }
    const index = buildGroupTypedMemoryIndex(scopeId);
    writeJsonAtomic(ledger.file, {
      ...ledger,
      schema: "ccm-group-typed-memory-distillation-ledger-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId: scopeId,
      modelExtractionTypedMemoryArchive: archive,
      updatedAt: at,
    });
    return {
      schema: "ccm-group-session-model-extraction-typed-memory-commit-v1",
      version: GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
      committed: true,
      status: "committed",
      scopeId,
      executionId: execution.executionId,
      proposalCount: activeFacts.length,
      admittedCount: admitted.length,
      rejectedCount: rejections.length,
      duplicateCount,
      supersededCount,
      activeFactCount: archive.activeFactCount,
      activeTopicCount: topicLifecycle.activeTopicCount,
      retiredTopicCount: topicLifecycle.retiredTopicCount,
      mergedTopicCount: topicLifecycle.mergedTopicCount,
      createdTopicCount: topicLifecycle.createdTopicCount,
      reusedTopicCount: topicLifecycle.reusedTopicCount,
      consolidatedFactCount: topicLifecycle.consolidatedFactCount,
      unclassifiedFactCount: topicLifecycle.unclassifiedFactCount,
      lowConfidenceFactCount: topicLifecycle.lowConfidenceFactCount,
      rebalancedFactCount: topicLifecycle.rebalancedFactCount,
      crossLanguageReuseCount: topicLifecycle.crossLanguageReuseCount,
      archiveChecksum: archive.checksum,
      writes,
      index,
      rejections,
    };
  });
}

export function providerReproofReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const promoted = rows.filter((row: any) => row.category === "promoted");
  const caution = rows.filter((row: any) => row.category === "caution");
  return {
    schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
    version: GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    archived_count: rows.length,
    promoted_count: promoted.length,
    caution_count: caution.length,
    strong_receipt_claim_count: rows.filter((row: any) => row.status === "strong").length,
    used_count: rows.filter((row: any) => row.status === "used").length,
    verified_count: rows.filter((row: any) => row.status === "verified").length,
    ignored_count: rows.filter((row: any) => row.status === "ignored").length,
    blocked_count: rows.filter((row: any) => row.status === "blocked").length,
    rows,
    updatedAt,
  };
}

export function distillProviderReproofReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_reproof_receipt_consumption", options, () => distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
      version: GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderReproofReceiptConsumptionRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.providerReproofReceiptConsumptionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderReproofReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...providerReproofReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  const promotedRows = archive.rows.filter((row: any) => row.category === "promoted");
  const cautionRows = archive.rows.filter((row: any) => row.category === "caution");
  if (promotedRows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "provider-reproof-receipt-consumption-recall",
      name: "Provider re-proof receipt consumption recall",
      description: "Provider re-proof dispatch briefs that child Agents actually used, verified, or claimed strong after WorkerContextPacket injection.",
      source: "auto:provider-reproof-receipt-consumption-distillation",
      updatedAt,
      body: renderProviderReproofReceiptConsumptionBody("Provider Re-proof Receipt Consumption Recall", promotedRows, { updatedAt, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  if (cautionRows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-reproof-receipt-consumption-cautions",
      name: "Provider re-proof receipt consumption cautions",
      description: "Provider re-proof dispatch briefs that child Agents ignored or blocked; keep them as cautionary memory, not promoted context.",
      source: "auto:provider-reproof-receipt-consumption-distillation",
      updatedAt,
      body: renderProviderReproofReceiptConsumptionBody("Provider Re-proof Receipt Consumption Cautions", cautionRows, { updatedAt, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    providerReproofReceiptConsumptionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
    version: GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    promotedCount: archive.promoted_count,
    cautionCount: archive.caution_count,
    strongReceiptClaimCount: archive.strong_receipt_claim_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const relPaths = uniqueStrings(rows.flatMap((row: any) => row.typed_memory_rel_paths || []), 80);
  const rowIds = uniqueStrings(rows.flatMap((row: any) => row.typed_memory_row_ids || []), 120);
  return {
    schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
    version: GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    archived_count: rows.length,
    verified_count: rows.filter((row: any) => row.status === "verified").length,
    preserved_count: rows.filter((row: any) => row.provider_ranking_provenance_preserved === true).length,
    receipt_count: uniqueStrings(rows.map((row: any) => row.provider_switch_decision_receipt_id).filter(Boolean), 120).length,
    rel_path_count: relPaths.length,
    row_id_count: rowIds.length,
    typed_memory_rel_paths: relPaths,
    typed_memory_row_ids: rowIds,
    rows,
    updatedAt,
  };
}

export function distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_ranking_provenance_compact_repair", options, () => distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
      version: GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...providerRankingProvenanceCompactRepairReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "provider-ranking-provenance-compact-repair-receipt-memory",
      name: "Provider ranking provenance compact repair receipt memory",
      description: "Verified child Agent receipts proving provider ranking provenance compact repair consumed typed MEMORY.md and provider switch receipt context.",
      source: "auto:provider-ranking-provenance-compact-repair-receipt-consumption-distillation",
      updatedAt,
      body: renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    providerRankingProvenanceCompactRepairReceiptConsumptionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
    version: GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    verifiedCount: archive.verified_count,
    preservedCount: archive.preserved_count,
    receiptCount: archive.receipt_count,
    relPathCount: archive.rel_path_count,
    rowIdCount: archive.row_id_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function postCompactReinjectionRepairReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  return {
    schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
    version: GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    archived_count: rows.length,
    restored_count: rows.filter((row: any) => row.category === "restored").length,
    caution_count: rows.filter((row: any) => row.category === "caution").length,
    used_count: rows.filter((row: any) => row.usage_state === "used").length,
    verified_count: rows.filter((row: any) => row.usage_state === "verified").length,
    ignored_count: rows.filter((row: any) => row.usage_state === "ignored").length,
    current_source_verified_count: rows.filter((row: any) => row.current_source_verified === true).length,
    task_session_count: uniqueStrings(rows.map((row: any) => row.task_agent_session_id).filter(Boolean), 240).length,
    native_session_count: uniqueStrings(rows.map((row: any) => row.native_session_id).filter(Boolean), 240).length,
    rows,
    updatedAt,
  };
}

export function distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_reinjection_repair", options, () => distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
      version: GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePostCompactReinjectionRepairReceiptConsumptionRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePostCompactReinjectionRepairReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...postCompactReinjectionRepairReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  const restoredRows = archive.rows.filter((row: any) => row.category === "restored");
  const cautionRows = archive.rows.filter((row: any) => row.category === "caution");
  if (restoredRows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-reinjection-repair-receipt-memory",
      name: "Post-compact reinjection repair receipt memory",
      description: "Verified exact gate/candidate repair completions bound to child Agent task and native sessions; historical recovery evidence requires current-source revalidation before reuse.",
      source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
      updatedAt,
      body: renderPostCompactReinjectionRepairReceiptConsumptionBody("Post-Compact Reinjection Repair Receipt Memory", restoredRows, { updatedAt, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  if (cautionRows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "post-compact-reinjection-repair-receipt-cautions",
      name: "Post-compact reinjection repair receipt cautions",
      description: "Verified ignored post-compact reinjection candidates; retain the closure evidence without promoting the ignored candidate into future task context.",
      source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
      updatedAt,
      body: renderPostCompactReinjectionRepairReceiptConsumptionBody("Post-Compact Reinjection Repair Receipt Cautions", cautionRows, { updatedAt, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    postCompactReinjectionRepairReceiptConsumptionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
    version: GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    restoredCount: archive.restored_count,
    cautionCount: archive.caution_count,
    usedCount: archive.used_count,
    verifiedCount: archive.verified_count,
    ignoredCount: archive.ignored_count,
    currentSourceVerifiedCount: archive.current_source_verified_count,
    taskSessionCount: archive.task_session_count,
    nativeSessionCount: archive.native_session_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_receipt_memory_usage_repair", options, () => distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
      version: GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePostCompactReceiptMemoryUsageRepairCompletionRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePostCompactReceiptMemoryUsageRepairCompletionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...postCompactReceiptMemoryUsageRepairCompletionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-receipt-memory-usage-repair-completions",
      name: "Post-compact receipt memory usage repair completions",
      description: "Verified corrected-receipt completions from new repair sessions, with per-document usage evidence and mandatory future current-source reverification.",
      source: "auto:post-compact-receipt-memory-usage-repair-completion-distillation",
      updatedAt,
      body: renderPostCompactReceiptMemoryUsageRepairCompletionBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    postCompactReceiptMemoryUsageRepairCompletionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
    version: GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    verifiedCount: archive.verified_count,
    originalSessionCount: archive.original_session_count,
    repairSessionCount: archive.repair_session_count,
    requiredDocCount: archive.required_doc_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function postCompactCompletionMemoryPreservationRepairClosureArchive(rows: any[] = [], options: any = {}) {
  return {
    schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
    archived_count: rows.length,
    verified_count: rows.filter((row: any) => row.exact_identity_restored && row.current_session_boundary_restored).length,
    failed_outcome_count: uniqueStrings(rows.map((row: any) => row.failed_outcome_id), 480).length,
    corrected_outcome_count: uniqueStrings(rows.map((row: any) => row.corrected_outcome_id), 480).length,
    completion_doc_count: uniqueStrings(rows.flatMap((row: any) => row.completion_doc_rel_paths || []), 240).length,
    completion_work_item_count: uniqueStrings(rows.flatMap((row: any) => row.completion_work_item_ids || []), 480).length,
    timeline_binding_count: uniqueStrings(rows.flatMap((row: any) => row.completion_timeline_binding_ids || []), 480).length,
    rows,
    updatedAt: String(options.updatedAt || now()),
  };
}
