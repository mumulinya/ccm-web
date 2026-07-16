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

export function distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_completion_memory_preservation_closure", options, () => distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
      version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, ledger);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const incomingRows = normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input, {
    ...options,
    groupId: sourceGroupId,
    groupSessionId,
    updatedAt,
  });
  const previousArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
  const merged = mergePostCompactCompletionMemoryPreservationRepairClosureRows(
    Array.isArray(previousArchive.rows) ? previousArchive.rows : [],
    incomingRows,
    { ...options, updatedAt }
  );
  const archive = {
    ...postCompactCompletionMemoryPreservationRepairClosureArchive(merged.rows, { updatedAt }),
    sourceGroupId,
    groupSessionId,
    exactSession: !!groupSessionId,
  };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-completion-memory-preservation-repair-closures",
      name: "Post-compact completion memory preservation repair closures",
      description: "Verified newer compact outcomes that restored corrected-receipt completion identity and session authority, with mandatory future current-source reverification.",
      source: "auto:post-compact-completion-memory-preservation-repair-closure-distillation",
      updatedAt,
      body: renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive, { updatedAt, sourceGroupId, groupSessionId }),
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
    postCompactCompletionMemoryPreservationRepairClosureArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    verifiedCount: archive.verified_count,
    failedOutcomeCount: archive.failed_outcome_count,
    correctedOutcomeCount: archive.corrected_outcome_count,
    completionDocCount: archive.completion_doc_count,
    completionWorkItemCount: archive.completion_work_item_count,
    timelineBindingCount: archive.timeline_binding_count,
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

export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, options: any = {}) {
  return require("./group-memory-maintenance").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options);
}

export function lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, query: any = {}, options: any = {}) {
  return require("./group-memory-maintenance").lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query, options);
}

export function distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_completion_conflict_resolution", options, () => distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, ledger);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const incomingRows = normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input, {
    ...options,
    sourceGroupId,
    groupSessionId,
    updatedAt,
  });
  const previousArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
  const previousColdRows = loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId);
  const merged = new Map<string, any>();
  for (const row of previousColdRows) merged.set(row.row_id, row);
  for (const row of Array.isArray(previousArchive.rows) ? previousArchive.rows : []) merged.set(row.row_id, row);
  const previousIds = new Set(merged.keys());
  for (const row of incomingRows) {
    const previous = merged.get(row.row_id);
    merged.set(row.row_id, {
      ...(previous || {}),
      ...row,
      first_seen_at: previous?.first_seen_at || row.resolved_at,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const rows = [...merged.values()].sort((a: any, b: any) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")));
  const hotRowLimit = Math.max(20, Number(options.hotRowLimit || options.hot_row_limit || GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT));
  const hotRows = rows.slice(-hotRowLimit);
  const coldManifest = writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, rows, { ...options, updatedAt, hotRowLimit });
  const archive = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
    sourceGroupId,
    groupSessionId,
    exactSession: !!groupSessionId,
    archived_count: rows.length,
    resolved_used_or_verified_count: rows.filter((row: any) => ["used", "verified"].includes(row.resolution_usage_state)).length,
    resolved_ignored_count: rows.filter((row: any) => row.resolution_usage_state === "ignored").length,
    task_family_count: uniqueStrings(rows.map((row: any) => row.task_family_key), 320).length,
    task_session_count: uniqueStrings(rows.map((row: any) => row.task_agent_session_id), 320).length,
    native_session_count: uniqueStrings(rows.map((row: any) => row.native_session_id), 320).length,
    immutable_branch_count: rows.length,
    retention_policy: "checksum_addressed_cold_shards_bounded_hot_index_render_latest_100",
    retention_pruned_count: 0,
    hot_row_limit: hotRowLimit,
    hot_row_count: hotRows.length,
    cold_archive_row_count: Number(coldManifest.row_count || 0),
    cold_archive_shard_count: Number(coldManifest.shard_count || 0),
    cold_archive_manifest_rel_path: path.relative(getGroupTypedMemoryDir(groupId), coldManifest.file).split(path.sep).join("/"),
    cold_archive_manifest_checksum: coldManifest.manifest_checksum,
    cold_archive_rows_checksum: coldManifest.rows_checksum,
    rows: hotRows,
    updatedAt,
  };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "post-compact-completion-memory-preservation-closure-conflict-resolutions",
      name: "Post-compact completion memory preservation closure conflict resolutions",
      description: "Session-bound, reversible current-source decisions resolving contradictory closure-memory feedback without erasing historical branches.",
      source: "auto:post-compact-completion-memory-preservation-closure-conflict-resolution-distillation",
      updatedAt,
      body: renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive, { updatedAt, sourceGroupId, groupSessionId }),
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
    postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incomingRows.some((incoming: any) => incoming.row_id === row.row_id)).length,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_ranking_memory_usage_repair", options, () => distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
      version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
  const incomingRows = normalizeProviderRankingMemoryUsageReceiptRepairRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderRankingMemoryUsageReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...providerRankingMemoryUsageReceiptRepairArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-ranking-memory-usage-receipt-discipline",
      name: "Provider ranking memory usage receipt discipline",
      description: "Child Agent receipt discipline for provider ranking compact repair typed memory usage.",
      source: "auto:provider-ranking-memory-usage-receipt-repair-distillation",
      updatedAt,
      body: renderProviderRankingMemoryUsageReceiptRepairBody(archive, { updatedAt, groupSessionId }),
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
    providerRankingMemoryUsageReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
    version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    docRelPathCount: archive.doc_rel_path_count,
    correctedPromptCount: archive.corrected_prompt_count,
    usageStatePromptCount: archive.usage_state_prompt_count,
    authorizationBoundaryPromptCount: archive.authorization_boundary_prompt_count,
    freshReceiptPromptCount: archive.fresh_receipt_prompt_count,
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

export function distillProviderDispatchOverrideFollowupToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_dispatch_override_followup", options, () => distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderDispatchOverrideFollowupRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderDispatchOverrideFollowupRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenanceProviderDispatchOverrideFollowupArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-dispatch-override-followup-recall",
      name: "Provider dispatch override follow-up repair history",
      description: "Completed pressure provenance provider dispatch overrides whose follow-up repair was verified by child Agent memoryProvenanceUsage receipts.",
      source: "auto:pressure-provenance-provider-dispatch-override-followup-distillation",
      updatedAt,
      body: renderPressureProvenanceProviderDispatchOverrideFollowupBody(archive, { updatedAt }),
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
    facts: ledger.facts || {},
    pressureProvenanceProviderDispatchOverrideFollowupArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    completedCount: archive.completed_count,
    attributionCount: archive.attribution_count,
    relPathCount: archive.rel_path_count,
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

export function distillProviderSwitchExecutionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_switch_execution", options, () => distillProviderSwitchExecutionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-switch-execution-distillation-v1",
      version: GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderSwitchExecutionRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.providerSwitchExecutionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderSwitchExecutionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = providerSwitchExecutionArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-switch-execution-memory",
      name: "Provider switch execution memory",
      description: "System-attested provider switch executions and mismatch feedback from child Agent completion receipts.",
      source: "auto:provider-switch-execution-distillation",
      updatedAt,
      body: renderProviderSwitchExecutionBody(archive, { updatedAt }),
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
    facts: ledger.facts || {},
    providerSwitchExecutionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-switch-execution-distillation-v1",
    version: GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    approvedCount: archive.approved_count,
    executedCount: archive.executed_count,
    passedCount: archive.passed_count,
    failedCount: archive.failed_count,
    mismatchCount: archive.mismatch_count,
    attributionCount: archive.attribution_count,
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

export function distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_dispatch_override_followup_validation", options, () => distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
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
  const incomingRows = normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderDispatchOverrideFollowupReceiptValidationRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive(merged.rows, { ...options, sourceGroupId, groupSessionId, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-dispatch-override-followup-receipt-validation-history",
      name: "Provider dispatch override follow-up receipt validation history",
      description: "Append-only failed and repaired corrected-receipt validation attempts used by provider-specific pre-dispatch policy.",
      source: "auto:pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation",
      updatedAt,
      body: renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody(archive, { updatedAt }),
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
    pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attemptCount: archive.attempt_count,
    failedCount: archive.failed_count,
    passedCount: archive.passed_count,
    attributionCount: archive.attribution_count,
    escalatedAttributionCount: archive.escalated_attribution_count,
    repairedAttributionCount: archive.repaired_attribution_count,
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

export function distillIgnoreMemoryReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "ignore_memory_receipt_repair", options, () => distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
      version: GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeIgnoreMemoryReceiptRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.ignoreMemoryReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeIgnoreMemoryReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = ignoreMemoryReceiptRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "ignore-memory-receipt-discipline",
      name: "Ignore-memory receipt discipline",
      description: "Child Agent receipt discipline for WorkerContextPacket ignore-memory policy.",
      source: "auto:ignore-memory-receipt-repair-distillation",
      updatedAt,
      body: renderIgnoreMemoryReceiptRepairBody(archive.rows, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    ignoreMemoryReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
    version: GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    correctedPromptCount: archive.corrected_prompt_count,
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

export function distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_memory_provenance_repair", options, () => distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
      version: GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureMemoryProvenanceReceiptRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureMemoryProvenanceReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureMemoryProvenanceReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureMemoryProvenanceReceiptRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-memory-provenance-receipt-discipline",
      name: "Pressure memory provenance receipt discipline",
      description: "Child Agent receipt discipline for WorkerContextPacket pressure repair MEMORY.md provenance.",
      source: "auto:pressure-memory-provenance-receipt-repair-distillation",
      updatedAt,
      body: renderPressureMemoryProvenanceReceiptRepairBody(archive.rows, { updatedAt }),
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
    facts: ledger.facts || {},
    pressureMemoryProvenanceReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
    version: GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    relPathCount: archive.rel_path_count,
    repairWorkItemCount: archive.repair_work_item_count,
    correctedPromptCount: archive.corrected_prompt_count,
    currentSourceVerifiedPromptCount: archive.current_source_verified_prompt_count,
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

export function distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_provenance_pre_dispatch_compliance", options, () => distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureProvenancePreDispatchComplianceRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureProvenancePreDispatchComplianceRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenancePreDispatchComplianceArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-provenance-pre-dispatch-compliance",
      name: "Pressure provenance pre-dispatch compliance",
      description: "Executor/project attribution for pressure provenance receipt failures after pre-dispatch discipline was shown.",
      source: "auto:pressure-provenance-pre-dispatch-compliance-distillation",
      updatedAt,
      body: renderPressureProvenancePreDispatchComplianceBody(archive, { updatedAt }),
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
    facts: ledger.facts || {},
    pressureProvenancePreDispatchComplianceArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attributionCount: archive.attribution_count,
    frequentAttributionCount: archive.frequent_attribution_count,
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

export function distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_provenance_compliance_recovery", options, () => distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureProvenancePreDispatchComplianceRecoveryRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureProvenancePreDispatchComplianceRecoveryRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenancePreDispatchComplianceRecoveryArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-provenance-compliance-recovery",
      name: "Pressure provenance compliance recovery",
      description: "Executor/project recovery evidence for compliant pressure provenance receipts after feedback policy.",
      source: "auto:pressure-provenance-compliance-recovery-distillation",
      updatedAt,
      body: renderPressureProvenancePreDispatchComplianceRecoveryBody(archive, { updatedAt }),
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
    facts: ledger.facts || {},
    pressureProvenancePreDispatchComplianceRecoveryArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attributionCount: archive.attribution_count,
    compliantCount: archive.compliant_count,
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

export function distillContextUsageRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "context_usage_repair", options, () => distillContextUsageRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-context-usage-repair-distillation-v1",
      version: GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeContextUsageRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.contextUsageRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeContextUsageRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = contextUsageRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Reactive compact/crop discipline for WorkerContextPacket context pressure before child Agent dispatch.",
      source: "auto:context-usage-repair-distillation",
      updatedAt,
      body: renderContextUsageRepairBody(archive.rows, { updatedAt }),
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
    facts: ledger.facts || {},
    contextUsageRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-context-usage-repair-distillation-v1",
    version: GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    overBudgetCount: archive.over_budget_count,
    criticalCount: archive.critical_count,
    compactRecommendedCount: archive.compact_recommended_count,
    openCount: archive.open_count,
    packetBoundCount: archive.packet_bound_count,
    maxPressure: archive.max_pressure,
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

export function distillCompactStrategyToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "compact_strategy", options, () => distillCompactStrategyToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-compact-strategy-typed-memory-distillation-v1",
      version: GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const strategy = compactStrategyInputStrategy(input);
  const outcomes = compactStrategyInputOutcomes(input);
  const archive = compactStrategyTypedArchive({ ...strategy, groupId: strategy.groupId || strategy.group_id || groupId }, outcomes, { ...options, groupId, updatedAt });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const writes: any[] = [];
  if (archive.category_count > 0 || archive.outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "worker-context-compact-strategy-memory",
      name: "WorkerContextPacket compact strategy memory",
      description: "Reusable compact strategy outcomes for WorkerContextPacket budget recovery.",
      source: "auto:compact-strategy-memory-distillation",
      updatedAt,
      body: renderCompactStrategyReferenceBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
    }));
  }
  if (archive.avoid_count > 0 || archive.blocked_outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-compact-strategy-cautions",
      name: "WorkerContextPacket compact strategy cautions",
      description: "Compact strategy categories and outcomes that blocked dispatch or need review before reuse.",
      source: "auto:compact-strategy-memory-distillation",
      updatedAt,
      body: renderCompactStrategyCautionBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    facts: ledger.facts || {},
    compactStrategyArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-compact-strategy-typed-memory-distillation-v1",
    version: GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    archivedCount: archive.outcome_count,
    categoryCount: archive.category_count,
    preferredCount: archive.preferred_count,
    avoidCount: archive.avoid_count,
    recoveredOutcomeCount: archive.recovered_outcome_count,
    blockedOutcomeCount: archive.blocked_outcome_count,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillPtlEmergencyDowngradeToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "ptl_emergency_downgrade", options, () => distillPtlEmergencyDowngradeToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
      version: GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const archive = ptlEmergencyTypedArchive(groupId, input, { ...options, updatedAt });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const writes: any[] = [];
  if (archive.engaged || archive.outcome_count > 0 || archive.blocked_outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-ptl-emergency-downgrade",
      name: "WorkerContextPacket PTL emergency downgrade discipline",
      description: "Emergency downgrade budgets and cautions for repeated WorkerContextPacket compact failures.",
      source: "auto:ptl-emergency-downgrade-distillation",
      updatedAt,
      body: renderPtlEmergencyTypedBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    facts: ledger.facts || {},
    ptlEmergencyArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
    version: GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    engaged: archive.engaged,
    emergencyLevel: archive.emergency_level,
    blockedOutcomeCount: archive.blocked_outcome_count,
    taskCompactedBlockedCount: archive.task_compacted_blocked_count,
    failedCategoryCount: archive.failed_category_count,
    outcomeCount: archive.outcome_count,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function evaluateGroupTypedMemoryDistillationQuality(groupId: string, options: any = {}) {
  const evaluatedAt = now();
  const projectRoot = path.resolve(String(options.projectRoot || options.project_root || process.cwd()));
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const docs = scanGroupTypedMemoryDocuments(groupId);
  const facts = collectDistilledFacts(ledger);
  const checks: any[] = [];
  const factsByType = new Map<string, any[]>();
  for (const fact of facts) {
    const type = normalizeMemoryType(fact.category || fact.type);
    factsByType.set(type, [...(factsByType.get(type) || []), fact]);
  }

  const inadmissibleFacts = facts
    .map(fact => ({ fact, admission: groupLogDistillationAdmission(fact) }))
    .filter(row => !row.admission.admitted)
    .map(row => `#${row.fact.messageId || ""} ${row.fact.type || row.fact.category || ""}: ${row.admission.reason}`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "long_term_write_admission",
    label: "长期记忆写入符合非流水准入规则",
    pass: inadmissibleFacts.length === 0 && ledger.admission?.schema === "ccm-group-typed-memory-write-admission-v1",
    severity: "fatal",
    detail: inadmissibleFacts.length
      ? "长期记忆仍包含可重建、临时或缺少非显然理由的流水事实。"
      : "通用群聊蒸馏只保留跨会话有效且满足 Claude Code 写入门槛的事实。",
    evidence: [{
      evaluatedThisRun: Number(ledger.admission?.evaluatedThisRun || 0),
      admittedThisRun: Number(ledger.admission?.admittedThisRun || 0),
      rejectedThisRun: Number(ledger.admission?.rejectedThisRun || 0),
      evictedExistingFactCount: Number(ledger.admission?.evictedExistingFactCount || 0),
    }],
    gaps: inadmissibleFacts,
  });

  const invalidPositiveFeedbackFacts = facts
    .filter(fact => fact.type === "validated_approach")
    .filter(fact => {
      const binding = fact?.confirmation || {};
      return binding.schema !== "ccm-group-positive-feedback-binding-v1"
        || binding.explicit !== true
        || binding.targetFound !== true
        || binding.targetSourceRole !== "assistant"
        || binding.scopeMatches !== true
        || binding.checksumMatches !== true
        || binding.targetEligible !== true;
    })
    .map(fact => `#${fact.messageId || ""} validated_approach`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "positive_feedback_binding",
    label: "正向反馈绑定同会话非显然做法",
    pass: invalidPositiveFeedbackFacts.length === 0,
    severity: "fatal",
    detail: invalidPositiveFeedbackFacts.length
      ? "存在没有可靠绑定到同会话 Assistant 做法的正向反馈记忆。"
      : "正向反馈只在同会话目标、checksum、跨会话价值和 Why/How 全部成立时写入。",
    gaps: invalidPositiveFeedbackFacts,
  });

  const positiveFeedbackLifecycle = ledger.positiveFeedbackLifecycle || {};
  const lifecycleEvents = Array.isArray(positiveFeedbackLifecycle.events) ? positiveFeedbackLifecycle.events : [];
  const activeFactIds = new Set(facts.map(fact => String(fact.id || "")).filter(Boolean));
  const invalidLifecycleEvents = lifecycleEvents.filter((event: any) =>
    event.schema !== "ccm-group-positive-feedback-lifecycle-event-v1"
    || Number(event.version || 0) !== GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION
    || event.groupId !== groupId
    || !["revoked", "superseded"].includes(String(event.action || ""))
    || !event.eventId
    || !event.targetFactId
    || !event.targetConfirmationMessageId
    || !event.targetApproachMessageId
    || !/^[a-f0-9]{64}$/.test(String(event.targetApproachChecksum || ""))
    || !event.revocationMessageId
    || !event.reason
    || (event.action === "superseded" && (!event.replacementFactId || !event.replacementMessageId))
    || event.eventChecksum !== positiveFeedbackLifecycleEventChecksum(event)
    || activeFactIds.has(String(event.targetFactId || ""))
  ).map((event: any) => `#${event.eventId || "missing"} ${event.action || "unknown"}`).slice(0, 30);
  const lifecycleObservationsLeakBody = (Array.isArray(positiveFeedbackLifecycle.observations) ? positiveFeedbackLifecycle.observations : [])
    .some((row: any) => row?.text !== undefined || row?.content !== undefined || row?.reasonText !== undefined);
  const lifecycleSummaryMatches = Number(positiveFeedbackLifecycle.activeValidatedCount || 0)
    === facts.filter(fact => fact.type === "validated_approach").length;
  const lifecycleApplicable = positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
    || lifecycleEvents.length > 0
    || facts.some(fact => fact.type === "validated_approach");
  addDistillationQualityCheck(checks, {
    id: "positive_feedback_lifecycle",
    label: "正向反馈撤销与替代保持可验证生命周期",
    pass: !lifecycleApplicable || (positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
      && positiveFeedbackLifecycle.groupId === groupId
      && invalidLifecycleEvents.length === 0
      && lifecycleObservationsLeakBody === false
      && lifecycleSummaryMatches),
    severity: "fatal",
    detail: invalidLifecycleEvents.length || lifecycleObservationsLeakBody || !lifecycleSummaryMatches
      ? "正向反馈生命周期存在无效事件、活动事实残留、统计偏差或拒绝正文泄漏。"
      : "被撤销或替代的正向反馈不再进入活动 MEMORY.md，并保留同会话绑定和校验事件。",
    gaps: [
      ...invalidLifecycleEvents,
      ...(lifecycleObservationsLeakBody ? ["rejected_lifecycle_observation_body_leak"] : []),
      ...(!lifecycleSummaryMatches ? ["active_validated_count_mismatch"] : []),
    ],
  });

  const expectedTypes = [...factsByType.keys()].filter(type => (factsByType.get(type) || []).length > 0);
  const docsByType = new Map<string, any[]>();
  for (const doc of docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation")) {
    docsByType.set(doc.type, [...(docsByType.get(doc.type) || []), doc]);
  }
  const missingTypeDocs = expectedTypes.filter(type => !(docsByType.get(type) || []).length);
  addDistillationQualityCheck(checks, {
    id: "typed_doc_coverage",
    label: "蒸馏事实有对应 typed Markdown",
    pass: missingTypeDocs.length === 0,
    severity: "high",
    detail: missingTypeDocs.length ? "部分蒸馏事实类别缺少对应 Markdown 记忆。" : "所有有事实的类别都有 Markdown 记忆。",
    gaps: missingTypeDocs,
  });

  const docText = docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation").map(doc => doc.body).join("\n");
  const missingSourceLinks = facts
    .filter(fact => fact.messageId && !docText.includes(`#${fact.messageId}`))
    .map(fact => `#${fact.messageId} ${compactText(fact.text, 120)}`)
    .slice(0, 20);
  addDistillationQualityCheck(checks, {
    id: "source_message_links_preserved",
    label: "蒸馏事实保留 source message id",
    pass: missingSourceLinks.length === 0,
    severity: "fatal",
    detail: missingSourceLinks.length ? "部分事实无法从 Markdown 中回溯到 source message id。" : "蒸馏 Markdown 保留了 source message id。",
    gaps: missingSourceLinks,
  });

  const pathClaims = uniqueStrings(facts.flatMap(fact => extractPathClaims(fact.text)), 120);
  const stalePaths = pathClaims
    .map(claim => ({ claim, resolved: resolveClaimPath(projectRoot, claim) }))
    .filter(item => item.resolved && !fs.existsSync(item.resolved))
    .map(item => `${item.claim} -> ${item.resolved}`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "file_path_claims_checked",
    label: "文件路径声明已按当前仓库核验",
    pass: stalePaths.length === 0,
    severity: "medium",
    detail: stalePaths.length ? "部分记忆里的文件路径在当前仓库不存在，使用前必须重新核验。" : "未发现当前仓库不存在的文件路径声明。",
    evidence: pathClaims.slice(0, 30),
    gaps: stalePaths,
  });

  const taskSignals = facts.map(extractTaskStateSignal).filter(Boolean);
  const taskMap = new Map<string, any[]>();
  for (const signal of taskSignals) taskMap.set(signal.taskId, [...(taskMap.get(signal.taskId) || []), signal]);
  const unresolvedContradictions: string[] = [];
  for (const [taskId, signals] of taskMap.entries()) {
    const sorted = signals.sort((a, b) => a.sourceIndex - b.sourceIndex);
    const states = new Set(sorted.map(item => item.state));
    const last = sorted[sorted.length - 1];
    if (states.has("done") && states.has("blocked") && last?.state === "blocked") {
      unresolvedContradictions.push(`[${taskId}] latest=${last.state} #${last.messageId} ${last.text}`);
    }
  }
  addDistillationQualityCheck(checks, {
    id: "no_unresolved_status_contradictions",
    label: "完成/阻塞状态没有未解决矛盾",
    pass: unresolvedContradictions.length === 0,
    severity: "high",
    detail: unresolvedContradictions.length ? "发现同一任务先完成后又阻塞，需按最新阻塞处理。" : "未发现未解决的完成/阻塞矛盾。",
    gaps: unresolvedContradictions.slice(0, 12),
  });

  const hasUsefulFacts = facts.length > 0 && (expectedTypes.includes("user") || expectedTypes.includes("project") || expectedTypes.includes("feedback") || expectedTypes.includes("reference"));
  addDistillationQualityCheck(checks, {
    id: "distilled_signal_not_empty",
    label: "蒸馏结果不是空洞记忆",
    pass: hasUsefulFacts || Number(ledger.sourceMessageCount || 0) === 0,
    severity: "medium",
    detail: hasUsefulFacts ? "蒸馏 ledger 中有可召回事实。" : "存在消息来源但没有可召回蒸馏事实。",
  });

  const failedChecks = checks.filter(check => !check.pass);
  const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + distillationQualityPenalty(check.severity), 0)));
  const status = failedChecks.some(check => check.severity === "fatal") || score < 60
    ? "failed"
    : failedChecks.some(check => check.severity === "high") || score < 80
      ? "degraded"
      : "pass";
  return {
    schema: "ccm-group-typed-memory-distillation-quality-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
    groupId,
    score,
    pass: status === "pass",
    status,
    evaluatedAt,
    projectRoot,
    factCount: facts.length,
    docCount: docs.length,
    pathClaimCount: pathClaims.length,
    stalePathCount: stalePaths.length,
    contradictionCount: unresolvedContradictions.length,
    checks,
  };
}

export function inspectGroupTypedMemoryDistillationWork(groupId: string, messages: any[] = [], options: any = {}) {
  const state = buildGroupTypedMemoryDistillationWorkState(groupId, messages, options);
  const skipReason = state.disabled && state.recoveryReasons.length === 0
    ? "disabled"
    : state.runRequired
      ? "work_pending"
      : "no_new_messages_after_committed_cursor";
  return {
    schema: "ccm-group-typed-memory-distillation-preflight-v1",
    version: 1,
    groupId,
    runRequired: state.runRequired,
    skipped: !state.runRequired,
    reason: skipReason,
    disabled: state.disabled,
    lockRequired: state.runRequired,
    lockAcquired: false,
    previousCommittedMessageId: state.previousCursorMessageId,
    cursorFound: !state.previousCursorMessageId || state.cursorIndex >= 0,
    cursorMissingFallback: state.cursorMissing,
    forceRescan: state.forceRescan,
    eligibleMessageCount: state.eligibleRows.length,
    pendingMessageCount: state.pendingRows.length,
    selectedMessageCount: state.selectedRows.length,
    remainingMessageCount: Math.max(0, state.pendingRows.length - state.selectedRows.length),
    maxMessages: state.maxMessages,
    maintenanceRequired: state.maintenanceReasons.length > 0,
    maintenanceReasons: state.maintenanceReasons,
    recoveryRequired: state.recoveryReasons.length > 0,
    recoveryReasons: state.recoveryReasons,
    postCompactUsageArchiveChanged: state.postCompactUsageArchiveChanged,
  };
}

export function distillGroupMessagesToTypedMemory(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}): any {
  const existingMutation = activeGroupTypedMemoryDistillationMutations.get(groupId);
  if (existingMutation?.handle) {
    existingMutation.depth = Number(existingMutation.depth || 1) + 1;
    existingMutation.mutationKinds = [...new Set([...(existingMutation.mutationKinds || []), "group_log_distillation"])];
    try {
      const value = distillGroupMessagesToTypedMemoryUnlocked(groupId, messages, memory, {
        ...options,
        __distillationTransaction: { handle: existingMutation.handle, summary: null },
      });
      return {
        ...value,
        transaction: {
          schema: "ccm-group-typed-memory-distillation-transaction-v1",
          version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
          groupId,
          leaseId: String(existingMutation.handle.lock?.leaseId || ""),
          fencingToken: Number(existingMutation.handle.lock?.fencingToken || 0),
          status: "reentrant",
          committed: value?.skipped !== true,
        },
      };
    } finally {
      existingMutation.depth = Math.max(1, Number(existingMutation.depth || 2) - 1);
    }
  }
  const preflight = inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
  if (!preflight.runRequired) {
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    return {
      schema: "ccm-group-typed-memory-distillation-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: preflight.reason,
      ledgerFile: ledger.file,
      sourceMessageCount: 0,
      candidateCount: 0,
      extractedCandidateCount: 0,
      rejectedCandidateCount: 0,
      evictedExistingFactCount: 0,
      newFactCount: 0,
      updatedFactCount: 0,
      writeCount: 0,
      removalCount: 0,
      writes: [],
      removals: [],
      quality: ledger.quality || null,
      admission: ledger.admission || null,
      positiveFeedbackLifecycle: {
        ...(ledger.positiveFeedbackLifecycle || {}),
        appliedThisRun: 0,
        rejectedThisRun: 0,
      },
      cursor: {
        schema: "ccm-group-typed-memory-distillation-cursor-v1",
        previousCommittedMessageId: preflight.previousCommittedMessageId,
        lastCommittedMessageId: preflight.previousCommittedMessageId,
        cursorFound: preflight.cursorFound,
        cursorMissingFallback: preflight.cursorMissingFallback,
        forceRescan: preflight.forceRescan,
        eligibleMessageCount: preflight.eligibleMessageCount,
        pendingMessageCount: preflight.pendingMessageCount,
        processedMessageCount: 0,
        remainingMessageCount: preflight.pendingMessageCount,
        batchLimited: false,
        committedAt: String(ledger.distillationCursor?.committedAt || ledger.lastDistilledAt || ""),
      },
      lastDistilledMessageId: preflight.previousCommittedMessageId,
      distilledAt: String(ledger.lastDistilledAt || ledger.updatedAt || ""),
      preflight,
      transaction: {
        schema: "ccm-group-typed-memory-distillation-transaction-v1",
        version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        status: "preflight_skipped",
        committed: false,
        lockAcquired: false,
      },
    };
  }
  const acquired = acquireGroupTypedMemoryDistillationLock(groupId, { ...options, mutationKind: "group_log_distillation" });
  if (!acquired.acquired) {
    const error: any = new Error(`typed_memory_distillation_transaction_unavailable:${acquired.reason || "lock_unavailable"}`);
    error.code = acquired.reason || "distillation_lock_unavailable";
    error.transaction = acquired;
    throw error;
  }
  const handle = acquired.handle;
  const mutationContext: any = {
    groupId,
    mutationKind: "group_log_distillation",
    mutationKinds: ["group_log_distillation"],
    handle,
    options,
    pendingArtifacts: new Map<string, any>(),
    depth: 1,
    writeCount: 0,
    startedAt: String(handle.lock?.acquiredAt || now()),
  };
  activeGroupTypedMemoryDistillationMutations.set(groupId, mutationContext);
  const transactionSummary = {
    schema: "ccm-group-typed-memory-distillation-transaction-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
    groupId,
    leaseId: String(handle.lock?.leaseId || ""),
    fencingToken: Number(handle.lock?.fencingToken || 0),
    waitedMs: Number(acquired.waitedMs || 0),
    recoveredLeaseCount: Number(acquired.recoveredLeaseCount || 0),
    acquiredAt: String(handle.lock?.acquiredAt || ""),
  };
  try {
    mutationContext.artifactRecovery = recoverGroupTypedMemoryArtifactTransaction(groupId);
    const diagnosticHoldMs = Math.max(0, Math.min(10_000, Number(options.__transactionDiagnosticHoldMs || 0)));
    if (diagnosticHoldMs > 0) typedMemoryDistillationWait(diagnosticHoldMs);
    const value = distillGroupMessagesToTypedMemoryUnlocked(groupId, messages, memory, {
      ...options,
      __distillationTransaction: { handle, summary: transactionSummary },
    });
    commitGroupTypedMemoryArtifactMutation(mutationContext);
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (!ownership.owned) throw new Error(`typed_memory_distillation_lock_lost_after_commit:${ownership.reason}`);
    const completedAt = now();
    const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
    const committed = value?.skipped !== true;
    writeGroupTypedMemoryDistillationTransactionState(groupId, {
      status: "completed",
      mutationKind: "group_log_distillation",
      mutationKinds: mutationContext.mutationKinds,
      lastMutationKind: "group_log_distillation",
      leaseId: transactionSummary.leaseId,
      fencingToken: transactionSummary.fencingToken,
      lastFencingToken: transactionSummary.fencingToken,
      lastCommittedFencingToken: committed
        ? transactionSummary.fencingToken
        : Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
      recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
      waitedMs: Number(acquired.waitedMs || 0),
      writeCount: Number(mutationContext.writeCount || 0),
      startedAt: transactionSummary.acquiredAt,
      completedAt,
      failedAt: "",
      error: "",
      updatedAt: completedAt,
    });
    activeGroupTypedMemoryDistillationMutations.delete(groupId);
    releaseGroupTypedMemoryDistillationLock(handle, "completed");
    return {
      ...value,
      preflight: {
        ...preflight,
        lockAcquired: true,
      },
      transaction: {
        ...transactionSummary,
        status: "completed",
        committed,
        completedAt,
        artifactTransaction: mutationContext.artifactTransaction || null,
        artifactRecovery: mutationContext.artifactRecovery || null,
      },
    };
  } catch (error: any) {
    const failedAt = now();
    const ownership = verifyGroupTypedMemoryDistillationLock(handle);
    if (ownership.owned) {
      const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
      writeGroupTypedMemoryDistillationTransactionState(groupId, {
        status: "failed",
        mutationKind: "group_log_distillation",
        mutationKinds: mutationContext.mutationKinds,
        lastMutationKind: String(priorState.valid ? priorState.state?.lastMutationKind || "" : ""),
        leaseId: transactionSummary.leaseId,
        fencingToken: transactionSummary.fencingToken,
        lastFencingToken: transactionSummary.fencingToken,
        lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
        recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
        waitedMs: Number(acquired.waitedMs || 0),
        writeCount: Number(mutationContext.writeCount || 0),
        startedAt: transactionSummary.acquiredAt,
        completedAt: "",
        failedAt,
        error: compactText(error?.message || error, 800),
        updatedAt: failedAt,
      });
    }
    activeGroupTypedMemoryDistillationMutations.delete(groupId);
    releaseGroupTypedMemoryDistillationLock(handle, "failed");
    throw error;
  }
}

export function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  const maxBatches = Math.max(1, Math.min(32, Number(options.maxCatchUpBatches || options.max_catch_up_batches || 8)));
  const batches: any[] = [];
  let latest: any = null;
  for (let batch = 0; batch < maxBatches; batch += 1) {
    latest = distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
    batches.push(latest);
    if (latest?.skipped === true || Number(latest?.cursor?.remainingMessageCount || 0) <= 0) break;
  }
  const sum = (key: string) => batches.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  const remainingMessageCount = Number(latest?.cursor?.remainingMessageCount || 0);
  return {
    ...(latest || {
      schema: "ccm-group-typed-memory-distillation-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "no_distillation_batch_executed",
    }),
    sourceMessageCount: sum("sourceMessageCount"),
    candidateCount: sum("candidateCount"),
    extractedCandidateCount: sum("extractedCandidateCount"),
    rejectedCandidateCount: sum("rejectedCandidateCount"),
    evictedExistingFactCount: sum("evictedExistingFactCount"),
    newFactCount: sum("newFactCount"),
    updatedFactCount: sum("updatedFactCount"),
    writeCount: sum("writeCount"),
    removalCount: sum("removalCount"),
    writes: batches.flatMap(row => Array.isArray(row?.writes) ? row.writes : []),
    removals: batches.flatMap(row => Array.isArray(row?.removals) ? row.removals : []),
    catchUp: {
      schema: "ccm-group-typed-memory-distillation-catch-up-v1",
      batchCount: batches.length,
      maxBatches,
      complete: remainingMessageCount === 0,
      remainingMessageCount,
      batches: batches.map((row, index) => ({
        batch: index + 1,
        skipped: row?.skipped === true,
        reason: row?.reason || "",
        sourceMessageCount: Number(row?.sourceMessageCount || 0),
        newFactCount: Number(row?.newFactCount || 0),
        updatedFactCount: Number(row?.updatedFactCount || 0),
        previousCommittedMessageId: row?.cursor?.previousCommittedMessageId || "",
        lastCommittedMessageId: row?.cursor?.lastCommittedMessageId || row?.lastDistilledMessageId || "",
        remainingMessageCount: Number(row?.cursor?.remainingMessageCount || 0),
      })),
    },
  };
}

export function runGroupTypedMemoryDistillationMutationCoordinatorSelfTest() {
  return require("./group-memory-recall-self-tests").runGroupTypedMemoryDistillationMutationCoordinatorSelfTest();
}

export function runGroupTypedMemoryLogDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryLogDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactUsageDistillationSelfTest();
}

export function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest();
}

export function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest();
}

export function runGroupTypedMemoryDistillationQualitySelfTest() {
  return require("./group-memory-distillation-self-tests").runGroupTypedMemoryDistillationQualitySelfTest();
}