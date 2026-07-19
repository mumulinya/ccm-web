// Behavior-freeze split from group-memory-loading.ts (part 3/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  CLAUDE_ALWAYS_ON_SETTING_SOURCES,
  CLAUDE_EDITABLE_SETTING_SOURCES,
  GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER,
  GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
  GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER,
  GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
  GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION,
  GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION,
  GROUP_PROJECT_MEMORY_IMPORT_VERSION,
  GROUP_TYPED_MEMORY_ENTRYPOINT,
  GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES,
  GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH,
  GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION,
  GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES,
  GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_DIR,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_VERSION,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_DECISION_DIR,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_DIR,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_VERSION,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_DIR,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
  GROUP_TYPED_MEMORY_MAX_RECALL,
  GroupTypedMemoryManifestSelectorExecutor,
  buildClaudeMemoryIncludeExpansion,
  buildGroupSessionModelExtractionTopicRecallIndex,
  buildGroupTypedMemoryConsumptionSummary,
  buildGroupTypedMemoryIndex,
  buildGroupTypedMemoryPendingStaleConflictIndex,
  buildGroupTypedMemoryRecallFreshness,
  buildGroupTypedMemoryShapeDrift,
  buildTypedMemoryLoadEntry,
  checksum,
  compactText,
  defaultManagedClaudeMemoryRoot,
  defaultUserClaudeMemoryRoot,
  deriveGroupTypedMemoryTargetPaths,
  evaluateTypedMemoryPathCondition,
  executeInstructionsLoadedHooksForImportedClaudeMemory,
  externalIncludeApprovalKey,
  extractSemanticRecallSnippet,
  finalizeGroupTypedMemoryManifestSelection,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryRecallLedgerFile,
  getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir,
  groupMemoryInstructionsLoadedHooks,
  groupTypedMemoryManifestSelectionChecksum,
  groupTypedMemoryManifestSelectorAgeStats,
  groupTypedMemoryManifestSelectorCalibrationChecksum,
  groupTypedMemoryManifestSelectorConsumptionChecksum,
  groupTypedMemoryManifestSelectorOutcomeChecksum,
  groupTypedMemoryManifestSelectorShapeChecksum,
  groupTypedMemoryPriority,
  isExactGroupTypedMemorySessionScope,
  isPathInside,
  listMarkdownFilesRecursive,
  neutralizeClaudeMemoryIncludeRefs,
  normalizeExternalIncludeApprovalPath,
  normalizeFileKey,
  normalizeGroupTypedMemoryOutcomeRelPaths,
  normalizeMemoryType,
  normalizePathGlobs,
  normalizePostCompactCandidateUsageHints,
  normalizePressureProvenanceDispatchFeedbackPolicyForRecall,
  normalizeTypedMemoryConsumptionUsageState,
  normalizeWorkerContextPressureRecallSignals,
  normalizeWorkerContextPressureRecallUsageHints,
  now,
  parseClaudeSettingSources,
  parseFrontmatter,
  parseGroupTypedMemoryManifestSelectorOutput,
  projectMemoryRelPath,
  readGroupTypedMemoryManifestSelectorChain,
  readGroupTypedMemoryRecallLedger,
  readJson,
  recordGroupTypedMemoryRecallUnlocked,
  recordGroupTypedMemoryShapeTrendContribution,
  resolveTypedMemoryIncludePath,
  safeSegment,
  scanGroupTypedMemoryDocuments,
  scoreGroupSessionModelExtractionTopicRecall,
  scoreGroupTypedMemoryConsumptionRecall,
  scorePostCompactCandidateUsageHint,
  scoreSemanticNaturalLanguageRecall,
  scoreWorkerContextPressureFeedbackPolicyRecallRisk,
  scoreWorkerContextPressureRecall,
  scoreWorkerContextPressureRecallUsageHint,
  semanticRecallCorpusStats,
  semanticRecallDuplicateOf,
  shouldIgnoreGroupMemoryRequest,
  summarizeGroupTypedMemoryShapeTrend,
  summarizeGroupTypedMemoryShapeTrendIncidents,
  summarizeGroupTypedMemoryWriteShapes,
  tokens,
  uniqueStrings,
  upsertGroupTypedMemoryDocument,
  verifyGroupTypedMemoryShapeDrift,
  verifyGroupTypedMemoryShapeTrendIncidentSummary,
  verifyGroupTypedMemoryShapeTrendSummary,
  writeGroupClaudeInstructionsLoadedHookLedger,
  writeGroupClaudeMemoryExternalIncludeApprovalLedger,
  writeTextAtomicRaw,
} from "./group-memory-index";

import {
  verifyGroupTypedMemoryManifestSelection,
} from "./group-memory-loading-part-02";

export function buildGroupTypedMemoryRecall(groupId: string, query: string, options: any = {}) {
  const text = String(query || "");
  const requestedNowMs = Number(options.nowMs || options.now_ms || Date.now());
  const recallNowMs = Number.isFinite(requestedNowMs) ? requestedNowMs : Date.now();
  const index = buildGroupTypedMemoryIndex(groupId);
  if (shouldIgnoreGroupMemoryRequest(text, options)) {
    return {
      schema: "ccm-group-typed-memory-recall-v1",
      ignored: true,
      reason: "user_requested_ignore_memory",
      indexFile: index.file,
      memoryDir: index.dir,
      recalled: [],
      surfaced: [],
    };
  }
  const queryTokens = tokens(text);
  const targetPaths = deriveGroupTypedMemoryTargetPaths(text, options.targetPaths || options.target_paths || []);
  const already = new Set<string>((options.alreadySurfaced || options.already_surfaced || []).map((item: any) => String(item || "").toLowerCase()));
  const requiredRelPaths = new Set((options.requiredRelPaths || options.required_rel_paths || [])
    .map((item: any) => String(item || "").trim().toLowerCase())
    .filter(Boolean));
  const recentTools = new Set<string>((options.recentTools || options.recent_tools || []).map((item: any) => String(item || "").toLowerCase()).filter(Boolean));
  const postCompactUsageHints = normalizePostCompactCandidateUsageHints(options);
  const workerContextPressureSignals = normalizeWorkerContextPressureRecallSignals(options);
  const workerContextPressureUsageHints = normalizeWorkerContextPressureRecallUsageHints(groupId, options);
  const pressureProvenanceDispatchFeedbackPolicy = normalizePressureProvenanceDispatchFeedbackPolicyForRecall(options);
  const semanticStats = semanticRecallCorpusStats(index.docs, text);
  const modelExtractionTopicIndex = buildGroupSessionModelExtractionTopicRecallIndex(groupId);
  const pendingStaleConflictIndex = buildGroupTypedMemoryPendingStaleConflictIndex(groupId);
  const manifestSelection = options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || options.manifestSelection || options.manifest_selection || null;
  const manifestSelectionVerification = manifestSelection
    ? verifyGroupTypedMemoryManifestSelection(manifestSelection, groupId)
    : { valid: false, scopeValid: true, checksumValid: true, selectedCount: 0 };
  const manifestSelectionQueryValid = !manifestSelection
    || String(manifestSelection.queryChecksum || "") === checksum(text, 64);
  const manifestSelectionApplied = !!manifestSelection;
  const manifestSelectionValid = manifestSelectionVerification.valid === true && manifestSelectionQueryValid;
  const manifestSelectedRelPaths = new Set<string>(manifestSelectionValid
    ? (manifestSelection.selectedRelPaths || []).map((item: any) => String(item || "").toLowerCase())
    : []);
  const typedMemoryConsumptionSummary = buildGroupTypedMemoryConsumptionSummary(groupId, {
    targetProject: options.targetProject || options.target_project || "",
    queryFeatures: semanticStats.queryFeatures,
    nowMs: options.nowMs || options.now_ms,
    halfLifeDays: options.typedMemoryConsumptionHalfLifeDays || options.typed_memory_consumption_half_life_days,
    staleAfterDays: options.typedMemoryConsumptionStaleAfterDays || options.typed_memory_consumption_stale_after_days,
  });
  const diagnostics: any[] = [];
  const scored = index.docs.map(doc => {
    const freshness = buildGroupTypedMemoryRecallFreshness(doc, recallNowMs);
    const requiredRecall = requiredRelPaths.has(String(doc.relPath || "").toLowerCase());
    const modelExtractionDocument = String(doc.source || "") === "auto:model-extraction-evidence-admission";
    const modelExtractionTopic = modelExtractionTopicIndex.byRelPath.get(String(doc.relPath || "").toLowerCase()) || null;
    const pendingStaleConflicts = pendingStaleConflictIndex.byRelPath.get(String(doc.relPath || "").toLowerCase()) || [];
    const manifestSelected = manifestSelectedRelPaths.has(String(doc.relPath || "").toLowerCase());
    if (modelExtractionDocument && (!modelExtractionTopicIndex.valid || !modelExtractionTopic)) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "model_topic_archive_invalid_or_unbound", freshness });
      return null;
    }
    if (pendingStaleConflicts.length > 0 && !requiredRecall) {
      diagnostics.push({
        relPath: doc.relPath,
        skipped: true,
        reason: "pending_stale_conflict_quarantined",
        pendingStaleConflictCount: pendingStaleConflicts.length,
        pendingStaleCandidateIds: pendingStaleConflicts.map((candidate: any) => candidate.candidate_id),
        freshness,
      });
      return null;
    }
    if (!requiredRecall && (already.has(doc.relPath.toLowerCase()) || already.has(doc.file.toLowerCase()))) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "already_surfaced", freshness });
      return null;
    }
    const pathCondition = evaluateTypedMemoryPathCondition(doc, targetPaths);
    if (pathCondition.conditional && !pathCondition.matched) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "path_condition_miss", globs: pathCondition.globs, targetPaths, freshness });
      return null;
    }
    if (manifestSelectionApplied && !requiredRecall && (!manifestSelectionValid || !manifestSelected)) {
      diagnostics.push({
        relPath: doc.relPath,
        skipped: true,
        reason: manifestSelectionValid ? "manifest_selector_not_selected" : "manifest_selector_selection_invalid",
        manifestSelectionStatus: String(manifestSelection?.status || ""),
        manifestSelectionValid,
        manifestSelectionQueryValid,
        freshness,
      });
      return null;
    }
    const corpus = `${doc.name}\n${doc.description}\n${doc.body}`.toLowerCase();
    let score = 0;
    let lexicalScore = 0;
    for (const token of queryTokens) if (corpus.includes(token)) lexicalScore += token.length >= 5 ? 3 : 1;
    score += lexicalScore;
    if (doc.type === "user") score += 4;
    if (doc.type === "feedback") score += 3;
    if (doc.type === "project") score += 2;
    if (doc.type === "reference") score += 1;
    const source = String(doc.source || "").toLowerCase();
    if (source.includes("global-claude-memory:")) score += 5;
    if (source.includes("global-claude-memory:managed:")) score += 2;
    if (pathCondition.conditional && pathCondition.matched) score += 64;
    if (requiredRecall) score += 100;
    if (manifestSelected) score += 48;
    for (const tool of recentTools) {
      if (!tool || !corpus.includes(tool)) continue;
      if (/(警告|陷阱|风险|失败|阻塞|不要|禁止|warning|pitfall|risk|failed|blocked|do not|never)/i.test(corpus)) score += 2;
      else score -= 4;
    }
    const postCompactUsage = scorePostCompactCandidateUsageHint(corpus, postCompactUsageHints);
    if (postCompactUsage.adjustment) score += postCompactUsage.adjustment;
    const workerContextPressureRecall = scoreWorkerContextPressureRecall(corpus, doc, workerContextPressureSignals, text, queryTokens);
    if (workerContextPressureRecall.adjustment) score += workerContextPressureRecall.adjustment;
    const workerContextPressureUsage = scoreWorkerContextPressureRecallUsageHint(doc, workerContextPressureUsageHints, workerContextPressureSignals);
    if (workerContextPressureUsage.adjustment) score += workerContextPressureUsage.adjustment;
    const workerContextPressureFeedbackPolicy = scoreWorkerContextPressureFeedbackPolicyRecallRisk(doc, corpus, workerContextPressureUsage, pressureProvenanceDispatchFeedbackPolicy, text, queryTokens);
    if (workerContextPressureFeedbackPolicy.adjustment) score += workerContextPressureFeedbackPolicy.adjustment;
    const semanticReference: any = scoreSemanticNaturalLanguageRecall(doc, semanticStats);
    const scoreBeforeSemantic = score;
    const queryConstraintDirective = (semanticStats.queryFeatures.polarities || []).some((polarity: string) =>
      ["prohibit", "require", "sequence", "conditional"].includes(polarity));
    const semanticConstraintEligible = semanticStats.queryFeatures.constraintLike === true
      && semanticReference.constraintShapeMatched === true
      && semanticReference.matchedConcepts.length >= 2
      && queryConstraintDirective;
    const semanticAdjustmentApplied = semanticReference.adjustment <= 0
      || scoreBeforeSemantic > 0
      || requiredRecall
      || semanticConstraintEligible;
    if (semanticAdjustmentApplied && semanticReference.adjustment) score += semanticReference.adjustment;
    if (!semanticAdjustmentApplied) {
      semanticReference.rawAdjustment = semanticReference.adjustment;
      semanticReference.adjustment = 0;
      semanticReference.gated = true;
      semanticReference.gateReason = "specialized_recall_policy_non_positive";
    }
    const modelExtractionTopicRecall = modelExtractionDocument
      ? scoreGroupSessionModelExtractionTopicRecall(doc, modelExtractionTopic, text, queryTokens)
      : null;
    if (modelExtractionTopicRecall?.adjustment) score += modelExtractionTopicRecall.adjustment;
    const forceMemory = options.forceMemory === true || options.force_memory === true;
    if (modelExtractionDocument
      && !requiredRecall
      && !manifestSelected
      && !forceMemory
      && modelExtractionTopicRecall?.eligible !== true) {
      diagnostics.push({
        relPath: doc.relPath,
        skipped: true,
        reason: modelExtractionTopicRecall?.unclassified ? "unclassified_topic_not_clearly_relevant" : "model_topic_not_clearly_relevant",
        score,
        lexicalScore,
        modelExtractionTopicRecall,
        semanticReference,
        freshness,
      });
      return null;
    }
    const typedMemoryConsumption: any = scoreGroupTypedMemoryConsumptionRecall(doc, typedMemoryConsumptionSummary);
    const consumptionAdjustmentApplied = typedMemoryConsumption.adjustment <= 0 || score > 0 || requiredRecall;
    if (consumptionAdjustmentApplied && typedMemoryConsumption.adjustment) score += typedMemoryConsumption.adjustment;
    if (!consumptionAdjustmentApplied) {
      typedMemoryConsumption.raw_adjustment = typedMemoryConsumption.adjustment;
      typedMemoryConsumption.adjustment = 0;
      typedMemoryConsumption.gated = true;
      typedMemoryConsumption.gate_reason = "specialized_recall_policy_non_positive";
    }
    if (!requiredRecall && score <= 0 && queryTokens.length && !(pathCondition.conditional && pathCondition.matched)) {
      const reason = workerContextPressureFeedbackPolicy.active === true
        && workerContextPressureFeedbackPolicy.risk_doc === true
        && Number(workerContextPressureFeedbackPolicy.adjustment || 0) < 0
        ? "pressure_feedback_policy_risk_gated"
        : "low_score";
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason, score, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy, semanticReference, modelExtractionTopicRecall, typedMemoryConsumption, freshness });
      return null;
    }
    diagnostics.push({ relPath: doc.relPath, skipped: false, score, pathCondition, manifestSelected, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy, semanticReference, modelExtractionTopicRecall, pendingStaleConflictCount: pendingStaleConflicts.length, typedMemoryConsumption, freshness });
    return {
      ...doc,
      pathCondition,
      score,
      postCompactUsage,
      workerContextPressureRecall,
      workerContextPressureUsage,
      workerContextPressureFeedbackPolicy,
      semanticReference,
      modelExtractionTopicRecall,
      pendingStaleConflicts,
      typedMemoryConsumption,
      freshness,
      requiredRecall,
      manifestSelected,
      snippet: extractSemanticRecallSnippet(doc.body, semanticStats.queryFeatures, Number(options.snippetChars || options.snippet_chars || 800)),
    };
  }).filter(Boolean).sort((a: any, b: any) => b.score - a.score || b.mtimeMs - a.mtimeMs);
  const recallLimit = Math.max(1, Number(options.max || options.limit || GROUP_TYPED_MEMORY_MAX_RECALL));
  const recalled: any[] = [];
  let semanticDuplicateCount = 0;
  let modelTopicDuplicateCount = 0;
  for (const candidate of scored) {
    if (recalled.length >= recallLimit) break;
    const modelTopicDuplicateOf = candidate.requiredRecall
      ? null
      : recalled.find(item => candidate.modelExtractionTopicRecall?.topicId
        && candidate.modelExtractionTopicRecall.topicId === item.modelExtractionTopicRecall?.topicId);
    if (modelTopicDuplicateOf) {
      modelTopicDuplicateCount += 1;
      diagnostics.push({
        relPath: candidate.relPath,
        skipped: true,
        reason: "model_topic_duplicate",
        duplicateOf: modelTopicDuplicateOf.relPath,
        topicId: candidate.modelExtractionTopicRecall.topicId,
        score: candidate.score,
      });
      continue;
    }
    const duplicateOf = candidate.requiredRecall || (candidate.pathCondition?.conditional && candidate.pathCondition?.matched)
      ? null
      : semanticRecallDuplicateOf(candidate, recalled);
    if (duplicateOf) {
      semanticDuplicateCount += 1;
      diagnostics.push({
        relPath: candidate.relPath,
        skipped: true,
        reason: "semantic_duplicate",
        duplicateOf: duplicateOf.relPath,
        score: candidate.score,
        semanticReference: candidate.semanticReference,
      });
      continue;
    }
    recalled.push(candidate);
  }
  return {
    schema: "ccm-group-typed-memory-recall-v1",
    ignored: false,
    reason: "",
    indexFile: index.file,
    memoryDir: index.dir,
    recalled,
    surfaced: recalled.map((item: any) => item.relPath),
    memoryFreshness: {
      schema: "ccm-group-typed-memory-recall-freshness-summary-v1",
      version: 1,
      evaluated_at: new Date(recallNowMs).toISOString(),
      recalled_count: recalled.length,
      fresh_count: recalled.filter((item: any) => item.freshness?.stale !== true).length,
      stale_count: recalled.filter((item: any) => item.freshness?.stale === true).length,
      stale_after_days: 1,
      current_source_verification_required: recalled.length > 0,
      stale_rel_paths: recalled.filter((item: any) => item.freshness?.stale === true).map((item: any) => item.relPath),
      checksum: checksum(recalled.map((item: any) => [item.relPath, item.checksum, item.freshness?.age_days, item.freshness?.stale]), 32),
    },
    candidateCount: index.docs.length,
    targetPaths,
    conditionalMatched: diagnostics.filter((item: any) => item.pathCondition?.conditional && item.pathCondition?.matched).length,
    conditionalSkipped: diagnostics.filter((item: any) => item.reason === "path_condition_miss").length,
    semanticReferenceScoring: {
      schema: "ccm-group-typed-memory-semantic-reference-scoring-v1",
      evaluated_count: index.docs.length,
      boosted_count: diagnostics.filter((item: any) => Number(item.semanticReference?.adjustment || 0) > 0).length,
      conflict_penalized_count: diagnostics.filter((item: any) => Array.isArray(item.semanticReference?.reasons)
        && item.semanticReference.reasons.some((reason: any) => String(reason.kind || "").startsWith("polarity_conflict_"))).length,
      semantic_duplicate_count: semanticDuplicateCount,
      query_concepts: semanticStats.queryFeatures.concepts || [],
      query_polarities: semanticStats.queryFeatures.polarities || [],
      query_relations: semanticStats.queryFeatures.relations || [],
    },
    modelExtractionTopicScoring: {
      schema: "ccm-group-session-model-extraction-topic-recall-scoring-v1",
      archive_present: modelExtractionTopicIndex.archivePresent,
      archive_valid: modelExtractionTopicIndex.valid,
      model_document_count: index.docs.filter((item: any) => String(item.source || "") === "auto:model-extraction-evidence-admission").length,
      archive_bound_document_count: modelExtractionTopicIndex.byRelPath.size,
      archive_integrity_gated_count: diagnostics.filter((item: any) => item.reason === "model_topic_archive_invalid_or_unbound").length,
      evaluated_count: diagnostics.filter((item: any) => item.modelExtractionTopicRecall).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.modelExtractionTopicRecall?.adjustment || 0) > 0).length,
      clearly_relevant_count: diagnostics.filter((item: any) => item.modelExtractionTopicRecall?.eligible === true).length,
      relevance_gated_count: diagnostics.filter((item: any) => ["model_topic_not_clearly_relevant", "unclassified_topic_not_clearly_relevant"].includes(item.reason)).length,
      unclassified_matched_count: diagnostics.filter((item: any) => item.modelExtractionTopicRecall?.unclassified === true && item.modelExtractionTopicRecall?.eligible === true).length,
      pending_stale_conflict_count: pendingStaleConflictIndex.pendingCount,
      stale_conflict_gated_count: diagnostics.filter((item: any) => item.reason === "pending_stale_conflict_quarantined").length,
      topic_duplicate_count: modelTopicDuplicateCount,
    },
    manifestSelectionScoring: {
      schema: "ccm-group-typed-memory-manifest-selection-scoring-v1",
      applied: manifestSelectionApplied,
      valid: manifestSelectionValid,
      scope_valid: manifestSelectionVerification.scopeValid !== false,
      checksum_valid: manifestSelectionVerification.checksumValid !== false,
      query_valid: manifestSelectionQueryValid,
      status: String(manifestSelection?.status || ""),
      request_id: String(manifestSelection?.requestId || ""),
      candidate_count: Number(manifestSelection?.candidateCount || 0),
      selected_count: manifestSelectedRelPaths.size,
      selected_rel_paths: [...manifestSelectedRelPaths],
      selected_recalled_count: recalled.filter((item: any) => item.manifestSelected === true).length,
      not_selected_gated_count: diagnostics.filter((item: any) => item.reason === "manifest_selector_not_selected").length,
      invalid_selection_gated_count: diagnostics.filter((item: any) => item.reason === "manifest_selector_selection_invalid").length,
      unknown_filename_count: Array.isArray(manifestSelection?.unknownFilenames) ? manifestSelection.unknownFilenames.length : 0,
      invalid_filename_count: Number(manifestSelection?.invalidFilenameCount || 0),
      decision_file: String(manifestSelection?.decisionFile || ""),
    },
    typedMemoryConsumptionScoring: {
      schema: "ccm-group-typed-memory-consumption-recall-scoring-v1",
      ledger_checksum_valid: typedMemoryConsumptionSummary.ledger_checksum_valid === true,
      invalid_entry_count: typedMemoryConsumptionSummary.invalid_entry_count || 0,
      entry_count: typedMemoryConsumptionSummary.entry_count || 0,
      relevant_entry_count: typedMemoryConsumptionSummary.relevant_entry_count || 0,
      stale_entry_count: typedMemoryConsumptionSummary.stale_entry_count || 0,
      proof_verified_entry_count: typedMemoryConsumptionSummary.proof_verified_entry_count || 0,
      downgraded_verified_entry_count: typedMemoryConsumptionSummary.downgraded_verified_entry_count || 0,
      anomaly_entry_count: typedMemoryConsumptionSummary.anomaly_entry_count || 0,
      average_evidence_confidence: typedMemoryConsumptionSummary.average_evidence_confidence || 0,
      matched_doc_count: diagnostics.filter((item: any) => Number(item.typedMemoryConsumption?.matched_count || 0) > 0).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.typedMemoryConsumption?.adjustment || 0) > 0).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.typedMemoryConsumption?.adjustment || 0) < 0).length,
      conflict_count: diagnostics.filter((item: any) => item.typedMemoryConsumption?.conflict === true).length,
      half_life_days: typedMemoryConsumptionSummary.half_life_days,
      stale_after_days: typedMemoryConsumptionSummary.stale_after_days,
    },
    postCompactUsageScoring: {
      schema: "ccm-group-typed-memory-post-compact-usage-scoring-v1",
      hint_count: postCompactUsageHints.length,
      matched_count: diagnostics.filter((item: any) => Array.isArray(item.postCompactUsage?.matched) && item.postCompactUsage.matched.length).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) > 0).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) < 0).length,
    },
    workerContextPressureScoring: {
      schema: "ccm-group-typed-memory-worker-context-pressure-scoring-v1",
      active: workerContextPressureSignals.active === true,
      signal_count: workerContextPressureSignals.signal_count || 0,
      active_signal_count: workerContextPressureSignals.active_signal_count || 0,
      suppressed_signal_count: workerContextPressureSignals.suppressed_signal_count || 0,
      pressure_status: workerContextPressureSignals.pressure_status || "",
      max_pressure: workerContextPressureSignals.max_pressure || 0,
      min_free_tokens: workerContextPressureSignals.min_free_tokens || 0,
      ptl_emergency: workerContextPressureSignals.ptl_emergency === true,
      repeated_compact_failure: workerContextPressureSignals.repeated_compact_failure === true,
      pressure_doc_count: diagnostics.filter((item: any) => item.workerContextPressureRecall?.pressure_doc).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.workerContextPressureRecall?.adjustment || 0) > 0).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.workerContextPressureRecall?.adjustment || 0) < 0).length,
      signals: workerContextPressureSignals.signals || [],
    },
    workerContextPressureUsageScoring: {
      schema: "ccm-group-typed-memory-worker-context-pressure-usage-scoring-v1",
      hint_count: workerContextPressureUsageHints.length,
      stale_hint_count: workerContextPressureUsageHints.filter((item: any) => item.recommendation === "stale_pressure_recall_history").length,
      cross_group_hint_count: workerContextPressureUsageHints.filter((item: any) => item.hint_scope === "cross_group_project").length,
      matched_count: diagnostics.filter((item: any) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.length).length,
      stale_matched_count: diagnostics.filter((item: any) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match: any) => match.recommendation === "stale_pressure_recall_history")).length,
      cross_group_matched_count: diagnostics.filter((item: any) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match: any) => match.hint_scope === "cross_group_project")).length,
      repair_hint_count: workerContextPressureUsageHints.filter((item: any) => item.repair_open === true).length,
      repair_matched_count: diagnostics.filter((item: any) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match: any) => match.repair_open === true)).length,
      disputed_matched_count: diagnostics.filter((item: any) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match: any) => match.provenance_status === "disputed_under_repair")).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.workerContextPressureUsage?.adjustment || 0) > 0).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.workerContextPressureUsage?.adjustment || 0) < 0).length,
    },
    workerContextPressureFeedbackPolicyScoring: {
      schema: "ccm-group-typed-memory-worker-context-pressure-provenance-feedback-recall-risk-scoring-v1",
      active: pressureProvenanceDispatchFeedbackPolicy.active === true,
      disabled: pressureProvenanceDispatchFeedbackPolicy.disabled === true,
      agent_type: pressureProvenanceDispatchFeedbackPolicy.agentType || pressureProvenanceDispatchFeedbackPolicy.agent_type || "unknown",
      target_project: pressureProvenanceDispatchFeedbackPolicy.targetProject || pressureProvenanceDispatchFeedbackPolicy.target_project || "",
      action: pressureProvenanceDispatchFeedbackPolicy.action || "",
      severity: pressureProvenanceDispatchFeedbackPolicy.severity || "",
      policy_row_count: Array.isArray(pressureProvenanceDispatchFeedbackPolicy.policyRows) ? pressureProvenanceDispatchFeedbackPolicy.policyRows.length : 0,
      risk_doc_count: diagnostics.filter((item: any) => item.workerContextPressureFeedbackPolicy?.risk_doc === true).length,
      repair_first_count: diagnostics.filter((item: any) => item.workerContextPressureFeedbackPolicy?.repair_first === true).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.workerContextPressureFeedbackPolicy?.adjustment || 0) < 0).length,
      risk_gated_count: diagnostics.filter((item: any) => item.reason === "pressure_feedback_policy_risk_gated").length,
    },
    diagnostics: diagnostics.slice(-40),
  };
}

export function renderGroupTypedMemoryRecall(recall: any) {
  if (!recall) return "";
  if (recall.ignored) return "类型化长期记忆：用户要求本轮忽略记忆，按空 MEMORY.md 处理。";
  const docs = Array.isArray(recall.recalled) ? recall.recalled : [];
  if (!docs.length) return "";
  const feedbackScoring = recall.workerContextPressureFeedbackPolicyScoring || recall.worker_context_pressure_feedback_policy_scoring || {};
  const feedbackHint = feedbackScoring.active
    ? `；pressure feedback policy gating risk ${feedbackScoring.risk_doc_count || 0}/gated ${feedbackScoring.risk_gated_count || 0}/repair-first ${feedbackScoring.repair_first_count || 0}`
    : "";
  const semanticScoring = recall.semanticReferenceScoring || recall.semantic_reference_scoring || {};
  const semanticHint = Number(semanticScoring.boosted_count || 0) > 0
    ? `；语义匹配 ${semanticScoring.boosted_count || 0}、冲突降权 ${semanticScoring.conflict_penalized_count || 0}、同义去重 ${semanticScoring.semantic_duplicate_count || 0}`
    : "";
  const consumptionScoring = recall.typedMemoryConsumptionScoring || recall.typed_memory_consumption_scoring || {};
  const consumptionHint = Number(consumptionScoring.entry_count || 0) > 0
    ? `；消费反馈 +${consumptionScoring.boosted_count || 0}/-${consumptionScoring.deprioritized_count || 0}/冲突 ${consumptionScoring.conflict_count || 0}`
    : "";
  const topicScoring = recall.modelExtractionTopicScoring || recall.model_extraction_topic_scoring || {};
  const topicHint = Number(topicScoring.model_document_count || 0) > 0
    ? `；模型 Topic 明确相关 ${topicScoring.clearly_relevant_count || 0}/门禁 ${topicScoring.relevance_gated_count || 0}/同 Topic 去重 ${topicScoring.topic_duplicate_count || 0}`
    : "";
  const manifestScoring = recall.manifestSelectionScoring || recall.manifest_selection_scoring || {};
  const manifestHint = manifestScoring.applied
    ? `；manifest selector ${manifestScoring.status || "unknown"} ${manifestScoring.selected_recalled_count || 0}/${manifestScoring.selected_count || 0}`
    : "";
  const lines = [
    `类型化长期记忆（MEMORY.md 索引召回，路径条件匹配 ${recall.conditionalMatched || 0}、跳过 ${recall.conditionalSkipped || 0}${semanticHint}${topicHint}${manifestHint}${consumptionHint}${recall.workerContextPressureScoring?.active ? `；上下文压力召回 ${recall.workerContextPressureScoring.boosted_count || 0}` : ""}${feedbackHint}；陈旧 ${recall.memoryFreshness?.stale_count || 0}/${docs.length}；使用前如涉及文件/函数/flag 必须再核验当前仓库）：`,
  ];
  for (const doc of docs) {
    const pathHint = doc.pathCondition?.conditional ? `；paths ${doc.pathCondition.matchedPaths?.join(",") || "matched"}` : "";
    const usageHint = Array.isArray(doc.postCompactUsage?.matched) && doc.postCompactUsage.matched.length
      ? `；post-compact usage ${doc.postCompactUsage.adjustment > 0 ? "+" : ""}${doc.postCompactUsage.adjustment}`
      : "";
    const pressureHint = Array.isArray(doc.workerContextPressureRecall?.matched) && doc.workerContextPressureRecall.matched.length && Number(doc.workerContextPressureRecall.adjustment || 0) > 0
      ? `；pressure recall +${doc.workerContextPressureRecall.adjustment}`
      : "";
    const pressureUsageHint = Array.isArray(doc.workerContextPressureUsage?.matched) && doc.workerContextPressureUsage.matched.length
      ? `；pressure usage ${doc.workerContextPressureUsage.adjustment > 0 ? "+" : ""}${doc.workerContextPressureUsage.adjustment}`
      : "";
    const pressureRepair = Array.isArray(doc.workerContextPressureUsage?.matched)
      ? doc.workerContextPressureUsage.matched.find((match: any) => match.repair_open === true)
      : null;
    const pressureRepairHint = pressureRepair
      ? `；pressure repair ${pressureRepair.repair_gap_type || "gap"}:${pressureRepair.repair_status || "pending"}`
      : "";
    const feedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
    const feedbackPolicyHint = feedbackPolicy.active && feedbackPolicy.risk_doc
      ? `；pressure feedback policy ${feedbackPolicy.repair_first ? "repair-first" : `${feedbackPolicy.adjustment > 0 ? "+" : ""}${feedbackPolicy.adjustment}`}`
      : "";
    const crossGroupProvenance = !pressureRepair && Array.isArray(doc.workerContextPressureUsage?.matched)
      ? doc.workerContextPressureUsage.matched.find((match: any) => match.provenance_status === "cross_group_project_assist")
      : null;
    const provenanceHint = crossGroupProvenance ? "；provenance cross_group_project_assist" : "";
    const semanticReference = doc.semanticReference || doc.semantic_reference || {};
    const semanticConcepts = Array.isArray(semanticReference.matchedConcepts) ? semanticReference.matchedConcepts.slice(0, 6) : [];
    const semanticConflict = Array.isArray(semanticReference.reasons)
      && semanticReference.reasons.some((reason: any) => String(reason.kind || "").startsWith("polarity_conflict_"));
    const semanticDocHint = Number(semanticReference.adjustment || 0) !== 0
      ? `；semantic ${semanticReference.adjustment > 0 ? "+" : ""}${semanticReference.adjustment}${semanticConcepts.length ? ` [${semanticConcepts.join(",")}]` : ""}${semanticConflict ? " conflict" : ""}`
      : "";
    const consumption = doc.typedMemoryConsumption || doc.typed_memory_consumption || {};
    const consumptionDocHint = Number(consumption.matched_count || 0) > 0
      ? `；consumption ${consumption.adjustment > 0 ? "+" : ""}${consumption.adjustment}${consumption.conflict ? " conflict/reverify" : ""}`
      : "";
    const modelTopic = doc.modelExtractionTopicRecall || doc.model_extraction_topic_recall || {};
    const modelTopicHint = modelTopic.topicId
      ? `；topic ${modelTopic.topicId} ${modelTopic.semanticMatch ? `semantic ${modelTopic.similarity}` : `lexical ${Array.isArray(modelTopic.matchedTokens) ? modelTopic.matchedTokens.slice(0, 4).join(",") : "matched"}`}`
      : "";
    const pendingStaleConflicts = Array.isArray(doc.pendingStaleConflicts)
      ? doc.pendingStaleConflicts
      : Array.isArray(doc.pending_stale_conflicts) ? doc.pending_stale_conflicts : [];
    const staleConflictHint = pendingStaleConflicts.length
      ? `；PENDING STALE CONFLICT ${pendingStaleConflicts.length} / REVERIFY REQUIRED`
      : "";
    const manifestSelectedHint = doc.manifestSelected === true ? "；manifest selected" : "";
    const freshness = doc.freshness || {};
    const freshnessHint = freshness.stale === true
      ? `；STALE ${freshness.age_days || 0} days old`
      : `；saved ${freshness.age_label || "today"}`;
    if (pendingStaleConflicts.length) {
      const candidateIds = pendingStaleConflicts.map((item: any) => String(item.candidate_id || "")).filter(Boolean).slice(0, 4);
      lines.push(`- PENDING STALE CONFLICT / REVERIFY REQUIRED ${doc.relPath}：该记忆仅因 requiredRelPath 被显式加载，当前存在待处理冲突${candidateIds.length ? `（${candidateIds.join(", ")}）` : ""}。在读取当前来源并重新验证前，不得把旧记忆当作事实或据此修改代码。`);
    }
    if (freshness.stale === true && freshness.warning) lines.push(`- 记忆新鲜度警告 ${doc.relPath}：${freshness.warning}`);
    lines.push(`- [${doc.type}] ${doc.name}（score ${doc.score}，${doc.relPath}${freshnessHint}${pathHint}${semanticDocHint}${modelTopicHint}${manifestSelectedHint}${staleConflictHint}${consumptionDocHint}${usageHint}${pressureHint}${pressureUsageHint}${pressureRepairHint}${feedbackPolicyHint}${provenanceHint}）：${doc.description || ""}`);
    if (doc.snippet) lines.push(`  ${compactText(doc.snippet, 700).replace(/\n/g, "\n  ")}`);
  }
  lines.push("- 回执要求：最终 CCM_AGENT_RECEIPT.typedMemoryUsage 必须逐条引用上述 relPath，声明 usageState=used/verified/ignored、currentSourceVerified 和 reason；memoryUsed/memoryIgnored 保留同一 relPath 的人类可读说明。");
  return lines.join("\n");
}
