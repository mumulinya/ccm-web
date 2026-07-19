// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 5/5).
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
  applyGroupLogDistillationAdmission,
  applyGroupPositiveFeedbackLifecycle,
  buildGroupLogDistillationAdmissionLedger,
  extractGroupLogDistillationCandidates,
  extractGroupLogPositiveFeedbackLifecycleRequests,
  modelExtractionTopicConceptProfile,
  modelExtractionTopicSimilarity,
  modelExtractionTypedArchiveChecksum,
  preservedGroupTypedMemoryDistillationArchives,
  pruneDistilledFacts,
  readGroupTypedMemoryDistillationLedger,
  renderDistilledMemoryBody,
  renewGroupTypedMemoryDistillationLock,
} from "./typed-memory-distillation-receipts-part-01";

import {
  buildGroupTypedMemoryDistillationWorkState,
  evaluateGroupTypedMemoryDistillationQuality,
} from "./typed-memory-distillation-receipts-part-04";

export function distillGroupMessagesToTypedMemoryUnlocked(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return { schema: "ccm-group-typed-memory-distillation-v1", version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION, groupId, skipped: true, reason: "disabled" };
  }
  const updatedAt = now();
  const workState = buildGroupTypedMemoryDistillationWorkState(groupId, messages, options);
  const {
    ledger,
    eligibleRows,
    previousCursorMessageId,
    cursorIndex,
    forceRescan,
    cursorMissing,
    pendingRows,
    selectedRows,
    existingAdmission,
    inflatedFactCount,
    inflatedAdmissionObservationCount,
    postCompactUsageArchive,
  } = workState;
  const sourceMessages = selectedRows.map(row => ({ ...row.message, __typedMemorySourceIndex: row.index }));
  const cursorAudit = {
    schema: "ccm-group-typed-memory-distillation-cursor-v1",
    previousCommittedMessageId: previousCursorMessageId,
    lastCommittedMessageId: selectedRows[selectedRows.length - 1]?.id || previousCursorMessageId,
    cursorFound: !previousCursorMessageId || cursorIndex >= 0,
    cursorMissingFallback: cursorMissing,
    forceRescan,
    eligibleMessageCount: eligibleRows.length,
    pendingMessageCount: pendingRows.length,
    processedMessageCount: selectedRows.length,
    remainingMessageCount: Math.max(0, pendingRows.length - selectedRows.length),
    batchLimited: pendingRows.length > selectedRows.length,
    committedAt: updatedAt,
  };
  const directRequests = sourceMessages
    .map((message, index) => normalizeGroupDirectMemoryRequest(groupId, message, index))
    .filter(Boolean);
  const extractedCandidates = extractGroupLogDistillationCandidates(groupId, sourceMessages);
  const lifecycleRequests = extractGroupLogPositiveFeedbackLifecycleRequests(groupId, sourceMessages);
  const admissionResult = applyGroupLogDistillationAdmission(extractedCandidates);
  const candidates = admissionResult.admitted;
  const maintenanceRequired = existingAdmission.rejected.length > 0
    || workState.postCompactUsageArchiveChanged
    || inflatedFactCount > 0
    || inflatedAdmissionObservationCount > 0;
  if (!sourceMessages.length && !maintenanceRequired && !forceRescan) {
    return {
      schema: "ccm-group-typed-memory-distillation-v1",
      version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "no_new_messages_after_committed_cursor",
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
      cursor: { ...cursorAudit, committedAt: String(ledger.distillationCursor?.committedAt || ledger.lastDistilledAt || "") },
      lastDistilledMessageId: previousCursorMessageId,
      distilledAt: String(ledger.lastDistilledAt || ledger.updatedAt || ""),
    };
  }
  let facts = { ...existingAdmission.admittedFacts };
  const admissionBase = buildGroupLogDistillationAdmissionLedger(
    ledger.admission,
    candidates,
    admissionResult.rejected,
    existingAdmission.rejected,
    updatedAt,
  );
  let newFactCount = 0;
  let updatedFactCount = 0;
  for (const candidate of candidates) {
    const type = normalizeMemoryType(candidate.category);
    const bucket = facts[type] || {};
    const previous = bucket[candidate.checksum];
    bucket[candidate.checksum] = {
      ...candidate,
      firstSeenAt: previous?.firstSeenAt || updatedAt,
      lastSeenAt: updatedAt,
      count: previous ? Math.max(1, Number(previous.count || 1)) : 1,
    };
    facts[type] = bucket;
    if (previous) updatedFactCount += 1;
    else newFactCount += 1;
  }
  const tombstoneFiltered = filterFactsByDirectMemoryTombstones(facts, ledger.directMemory);
  facts = tombstoneFiltered.facts;
  const directApplied = applyGroupDirectMemoryRequests(
    groupId,
    facts,
    directRequests,
    ledger.directMemory,
    updatedAt,
  );
  facts = directApplied.facts;
  const directMemory = {
    ...directApplied.ledger,
    tombstoneSuppressedFactCountThisRun: tombstoneFiltered.suppressedCount,
  };
  const lifecycleApplied = applyGroupPositiveFeedbackLifecycle(
    groupId,
    facts,
    lifecycleRequests,
    ledger.positiveFeedbackLifecycle,
    { updatedAt, projectRoot: String(options.projectRoot || options.project_root || "") },
  );
  facts = lifecycleApplied.facts;
  const positiveFeedbackLifecycle = lifecycleApplied.lifecycle;
  const admission = {
    ...admissionBase,
    positiveFeedbackActiveCount: Number(positiveFeedbackLifecycle.activeValidatedCount || 0),
    positiveFeedbackRevokedCount: Number(positiveFeedbackLifecycle.revokedCount || 0),
    positiveFeedbackSupersededCount: Number(positiveFeedbackLifecycle.supersededCount || 0),
    positiveFeedbackLifecycleRejectedThisRun: Number(positiveFeedbackLifecycle.rejectedThisRun || 0),
    positiveFeedbackLifecycleInvalidBindingThisRun: Number(positiveFeedbackLifecycle.invalidBindingThisRun || 0),
    positiveFeedbackCurrentSourceProofCount: Number(positiveFeedbackLifecycle.currentSourceProofCount || 0),
  };
  const prunedFacts = pruneDistilledFacts(facts, Number(options.perTypeLimit || options.per_type_limit || GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT));
  const lastMessageId = cursorAudit.lastCommittedMessageId;
  const transaction = options.__distillationTransaction || null;
  if (transaction?.handle) {
    const renewed = renewGroupTypedMemoryDistillationLock(transaction.handle);
    if (!renewed.renewed) throw new Error(`typed_memory_distillation_lock_lost_before_document_commit:${renewed.reason}`);
  }
  const distillationTransaction = transaction?.handle ? {
    schema: "ccm-group-typed-memory-distillation-transaction-commit-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
    groupId,
    leaseId: String(transaction.handle.lock?.leaseId || ""),
    fencingToken: Number(transaction.handle.lock?.fencingToken || 0),
    ownerPid: Number(transaction.handle.lock?.ownerPid || 0),
    ownerHostname: String(transaction.handle.lock?.ownerHostname || ""),
    acquiredAt: String(transaction.handle.lock?.acquiredAt || ""),
    renewedAt: String(transaction.handle.lock?.renewedAt || ""),
    waitedMs: Number(transaction.handle.waitedMs || 0),
    recoveredLeaseCount: Number(transaction.handle.recoveredLeaseCount || 0),
    committedAt: updatedAt,
    lastCommittedMessageId: lastMessageId,
  } : null;

  const writes: any[] = [];
  const removals: any[] = [];
  const docSpecs = [
    {
      type: "user",
      slug: "distilled-log-user-requirements",
      name: "Distilled group-log user requirements",
      description: "Long-term user constraints and goals distilled from the group transcript.",
      title: "Distilled Group-Log User Requirements",
    },
    {
      type: "project",
      slug: "distilled-log-project-context",
      name: "Distilled group-log project context",
      description: "Non-obvious project motivations with durable future impact distilled from the group transcript.",
      title: "Distilled Group-Log Project Context",
    },
    {
      type: "feedback",
      slug: "distilled-log-feedback-failures",
      name: "Distilled group-log feedback, validated approaches and failures",
      description: "Durable user corrections, bound positive confirmations and recurring non-obvious failures distilled from the group transcript.",
      title: "Distilled Group-Log Feedback, Validated Approaches And Failures",
    },
    {
      type: "reference",
      slug: "distilled-log-reference-artifacts",
      name: "Distilled group-log reference artifacts",
      description: "External resources and their future lookup purpose distilled from the group transcript.",
      title: "Distilled Group-Log Reference Artifacts",
    },
  ];
  for (const spec of docSpecs) {
    const bucket = Object.values(prunedFacts[spec.type] || {}).sort((a: any, b: any) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0));
    if (!bucket.length) {
      const staleFile = path.join(getGroupTypedMemoryDir(groupId), `${safeSegment(spec.slug)}.md`);
      if (fs.existsSync(staleFile)) {
        try {
          const mutation = activeGroupTypedMemoryDistillationMutations.get(groupId);
          const removed = mutation?.handle
            ? stageGroupTypedMemoryArtifactRemoval(mutation, staleFile)
            : (() => { fs.unlinkSync(staleFile); return true; })();
          removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed, reason: "no_admitted_facts" });
        } catch (error: any) {
          removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed: false, reason: "no_admitted_facts", error: compactText(error?.message || error, 300) });
        }
      }
      continue;
    }
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: spec.type,
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      source: "auto:group-log-distillation",
      updatedAt,
      body: renderDistilledMemoryBody(spec.title, bucket, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  if (postCompactUsageArchive.archived_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "post-compact-candidate-usage-archive",
      name: "Post-compact candidate usage archive",
      description: "Low-priority recovered-memory candidates that were ignored or lacked explicit used/ignored/verified receipts.",
      source: "auto:post-compact-usage-distillation",
      updatedAt,
      body: postCompactUsageArchive.body,
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const index = buildGroupTypedMemoryIndex(groupId);
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    reason: compactText(options.reason || "", 220),
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    extractedCandidateCount: extractedCandidates.length,
    rejectedCandidateCount: admissionResult.rejected.length,
    newFactCount,
    updatedFactCount,
    lastDistilledMessageId: lastMessageId,
    lastDistilledAt: updatedAt,
    distillationCursor: cursorAudit,
    cumulativeProcessedMessageCount: Number(ledger.cumulativeProcessedMessageCount || 0) + sourceMessages.length,
    duplicateInflationRepair: {
      schema: "ccm-group-typed-memory-distillation-duplicate-inflation-repair-v1",
      repairedFactCount: inflatedFactCount,
      repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
      repairedAt: updatedAt,
    },
    ...preservedGroupTypedMemoryDistillationArchives(ledger),
    facts: prunedFacts,
    admission,
    positiveFeedbackLifecycle,
    directMemory,
    ...(distillationTransaction ? { distillationTransaction } : {}),
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
      updatedAt,
    },
    updatedAt,
  });
  const quality = evaluateGroupTypedMemoryDistillationQuality(groupId, {
    projectRoot: options.projectRoot || options.project_root,
  });
  const persistedLedger = readGroupTypedMemoryDistillationLedger(groupId);
  if (transaction?.handle) {
    const renewed = renewGroupTypedMemoryDistillationLock(transaction.handle);
    if (!renewed.renewed) throw new Error(`typed_memory_distillation_lock_lost_before_quality_commit:${renewed.reason}`);
    if (distillationTransaction) distillationTransaction.renewedAt = String(transaction.handle.lock?.renewedAt || distillationTransaction.renewedAt);
  }
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    reason: compactText(options.reason || "", 220),
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    extractedCandidateCount: extractedCandidates.length,
    rejectedCandidateCount: admissionResult.rejected.length,
    newFactCount,
    updatedFactCount,
    lastDistilledMessageId: lastMessageId,
    lastDistilledAt: updatedAt,
    distillationCursor: cursorAudit,
    cumulativeProcessedMessageCount: Number(persistedLedger.cumulativeProcessedMessageCount || ledger.cumulativeProcessedMessageCount || 0),
    duplicateInflationRepair: persistedLedger.duplicateInflationRepair || {
      schema: "ccm-group-typed-memory-distillation-duplicate-inflation-repair-v1",
      repairedFactCount: inflatedFactCount,
      repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
      repairedAt: updatedAt,
    },
    ...preservedGroupTypedMemoryDistillationArchives(persistedLedger, ledger),
    facts: persistedLedger.facts || prunedFacts,
    admission: persistedLedger.admission || admission,
    positiveFeedbackLifecycle: persistedLedger.positiveFeedbackLifecycle || positiveFeedbackLifecycle,
    directMemory: persistedLedger.directMemory || directMemory,
    ...(distillationTransaction ? { distillationTransaction } : {}),
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
      updatedAt,
    },
    quality,
    updatedAt,
  });
  return {
    schema: "ccm-group-typed-memory-distillation-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    extractedCandidateCount: extractedCandidates.length,
    rejectedCandidateCount: admissionResult.rejected.length,
    evictedExistingFactCount: existingAdmission.rejected.length,
    newFactCount,
    updatedFactCount,
    writeCount: writes.length,
    removalCount: removals.filter(item => item.removed === true).length,
    writes,
    removals,
    index,
    quality,
    admission: persistedLedger.admission || admission,
    positiveFeedbackLifecycle: persistedLedger.positiveFeedbackLifecycle || positiveFeedbackLifecycle,
    directMemory: persistedLedger.directMemory || directMemory,
    distillationTransaction,
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
    },
    cursor: cursorAudit,
    duplicateInflationRepair: {
      repairedFactCount: inflatedFactCount,
      repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
    },
    lastDistilledMessageId: lastMessageId,
    distilledAt: updatedAt,
  };
}

export function distillGroupMessagesToTypedMemory(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}): any {
  return require("./group-memory-distillation").distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
}

export function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages, memory, options);
}

export function buildGroupSessionModelExtractionTopicRecallIndex(groupId: string) {
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const archive = ledger.modelExtractionTypedMemoryArchive || null;
  const valid = !!archive
    && archive.schema === "ccm-group-session-model-extraction-typed-memory-archive-v1"
    && modelExtractionTypedArchiveChecksum(archive) === String(archive.checksum || "");
  const byRelPath = new Map<string, any>();
  if (valid) {
    for (const topic of Object.values(archive.topics || {}) as any[]) {
      if (topic?.status !== "active") continue;
      for (const slug of topic.docSlugs || []) {
        byRelPath.set(`${String(slug || "").toLowerCase()}.md`, topic);
      }
    }
  }
  return {
    schema: "ccm-group-session-model-extraction-topic-recall-index-v1",
    valid,
    archivePresent: !!archive,
    archiveChecksum: String(archive?.checksum || ""),
    byRelPath,
  };
}

export function scoreGroupSessionModelExtractionTopicRecall(doc: any, topic: any, query: string, queryTokens: string[]) {
  if (!topic) return null;
  const queryProfile = modelExtractionTopicConceptProfile(query);
  const similarity = modelExtractionTopicSimilarity(queryProfile.concepts, topic.concepts || []);
  const factText = String(doc.body || "").split("\n")
    .filter(line => /^- #/.test(line.trim()))
    .join("\n")
    .toLowerCase();
  const genericTokens = new Set(["continue", "project", "task", "memory", "session", "agent", "继续", "任务", "项目", "记忆", "会话"]);
  const matchedTokens = queryTokens.filter(token => !genericTokens.has(token) && factText.includes(token));
  const latinMatches = matchedTokens.filter(token => /[a-z0-9_]/i.test(token) && token.length >= 5);
  const cjkMatches = matchedTokens.filter(token => /^[\u3400-\u9fff]+$/.test(token));
  const strongLexicalMatch = latinMatches.length > 0 || cjkMatches.length >= 2;
  const unclassified = /_unclassified$/.test(String(topic.topicId || ""));
  const semanticMatch = !unclassified && similarity >= GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY;
  const eligible = semanticMatch || strongLexicalMatch;
  const adjustment = semanticMatch
    ? Math.max(8, Math.round(similarity * 24))
    : strongLexicalMatch
      ? Math.min(14, 4 + latinMatches.length * 3 + cjkMatches.length)
      : -12;
  return {
    schema: "ccm-group-session-model-extraction-topic-recall-score-v1",
    topicId: String(topic.topicId || ""),
    topicSlug: String(topic.slug || ""),
    assignmentVersion: Number(topic.assignmentVersion || topic.version || 0),
    similarity: Number(similarity.toFixed(4)),
    queryConcepts: queryProfile.concepts,
    topicConcepts: topic.concepts || [],
    matchedTokens: uniqueStrings(matchedTokens, 24),
    semanticMatch,
    strongLexicalMatch,
    unclassified,
    meanAssignmentConfidence: Number(topic.meanAssignmentConfidence || 0),
    lowConfidenceFactCount: Number(topic.lowConfidenceFactCount || 0),
    eligible,
    adjustment,
  };
}
