// Behavior-freeze split from group-session-memory-model-extraction.ts (part 3/3).
import { setAppendHookRegistered } from "./group-session-memory-model-extraction-part-01";

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { estimateTextTokens } from "../../system/context-budget";
import { CCM_DIR } from "../../core/utils";
import {
  buildGroupSessionMemorySectionEvidence,
  buildGroupSessionMemorySnapshot,
  commitGroupSessionMemorySnapshot,
  enforceGroupSessionMemoryBudget,
  evaluateGroupSessionMemoryUpdateCadence,
  loadGroupMemory,
  persistGroupSessionMemoryCadenceObservation,
  readGroupSessionMemorySnapshotSummary,
  resolveGroupSessionMemoryExtractionCursor,
} from "./memory";
import {
  readGroupSessionMemoryExtractionState,
  runGroupSessionMemoryExtractionTransactionAsync,
} from "./group-session-memory-extraction";
import {
  getActiveGroupChatSessionId,
  getGroupMessages,
  registerGroupMessageAppendHook,
} from "./storage";
import { distillGroupSessionModelExtractionToTypedMemory } from "./group-memory-index";
import {
  GROUP_SESSION_MEMORY_MODEL_TEMPLATE,
  parseGroupSessionMemoryTemplate,
  readGroupSessionMemoryCustomPromptProfile,
  readGroupSessionMemoryCustomTemplateProfile,
  validateGroupSessionMemoryCustomPrompt,
} from "./group-session-memory-customization";

import {
  MODEL_EXECUTOR_UNAVAILABLE_RETRY_MS,
  MODEL_EXTRACTION_DEBOUNCE_MS,
  MODEL_EXTRACTION_EXECUTION_TIMEOUT_MS,
  appendGroupSessionMemoryModelExtractionHistory,
  appendHookRegistered,
  buildGroupSessionMemoryModelExtractionPrompt,
  configuredExecutor,
  hashText,
  messageIdentity,
  modelFailureReceiptFile,
  modelReceiptFile,
  pending,
  persistGroupSessionMemoryModelExtractionReplayEvidence,
  readBoundedGroupTypedMemoryManifest,
  readCommittedDirectMemoryWriteProofs,
  receiptChecksum,
  running,
  substituteGroupSessionMemoryCustomPrompt,
  timers,
  transcriptRows,
  writeGroupSessionMemoryModelExtractionArtifact,
  writeJsonAtomic,
} from "./group-session-memory-model-extraction-part-01";

import {
  analyzeGroupSessionMemoryModelMergeQuality,
  persistFailedGroupSessionModelExtractionTypedMemoryCommit,
  recoverPendingGroupSessionMemoryTypedMemoryRetries,
  runAutomaticExtractionArtifactRetention,
  validateGroupSessionMemoryModelOutput,
} from "./group-session-memory-model-extraction-part-02";

async function suppressGroupSessionMemoryModelExtractionAfterDirectWrite(input: any) {
  const {
    groupId,
    groupSessionId,
    scopeId,
    sourceMessages,
    previousSnapshot,
    cadence,
    proof,
    options,
  } = input;
  const suppressedAt = String(options.at || new Date().toISOString());
  const sourceMessageIds = sourceMessages.map((message: any, index: number) => messageIdentity(message, index));
  const cursorBefore = String(previousSnapshot.updateCadence?.lastExtractionMessageId || "");
  const cursorAfter = String(cadence.lastObservedMessageId || sourceMessageIds[sourceMessageIds.length - 1] || cursorBefore);
  const receiptCore: any = {
    schema: "ccm-group-session-memory-direct-write-suppression-receipt-v1",
    version: 1,
    groupId,
    groupSessionId,
    scopeId,
    reason: proof.reason,
    cursorBefore,
    cursorAfter,
    cursorAdvancedWithoutModel: true,
    suppressedMessageCount: sourceMessages.length,
    suppressedMessageIds: sourceMessageIds.slice(0, 240),
    suppressedTranscriptChecksum: hashText(JSON.stringify(transcriptRows(sourceMessages)), 64),
    directMemoryProofCount: proof.proofs.length,
    directMemoryProofs: proof.proofs,
    directMemoryChecksum: proof.directMemoryChecksum,
    ledgerFile: proof.ledgerFile,
    ledgerMutationFence: Number(proof.ledgerMutationFence || 0),
    ledgerMutationLeaseId: String(proof.ledgerMutationLeaseId || ""),
    suppressedAt,
  };
  const transaction: any = await runGroupSessionMemoryExtractionTransactionAsync(scopeId, async (extraction: any) => {
    const receiptWithoutChecksum = {
      ...receiptCore,
      extractionLeaseId: String(extraction.lease?.leaseId || ""),
      extractionFencingToken: Number(extraction.lease?.fencingToken || 0),
    };
    const receipt = { ...receiptWithoutChecksum, checksum: hashText(JSON.stringify(receiptWithoutChecksum), 64) };
    const cadenceObservation = {
      ...cadence,
      status: "direct_memory_write_suppressed",
      shouldExtract: false,
      extractedThisObservation: false,
      tokensAtLastExtraction: Number(cadence.currentContextTokens || previousSnapshot.updateCadence?.tokensAtLastExtraction || 0),
      lastExtractionMessageId: cursorAfter,
      extractionCount: Number(previousSnapshot.updateCadence?.extractionCount || 0),
      directMemorySuppressionCount: Number(previousSnapshot.updateCadence?.directMemorySuppressionCount || 0) + 1,
      lastDirectMemorySuppressedAt: suppressedAt,
      directMemorySuppression: receipt,
    };
    return {
      schema: "ccm-group-session-memory-extraction-staged-commit-v1",
      commit: () => {
        const snapshot = persistGroupSessionMemoryCadenceObservation(scopeId, cadenceObservation);
        return { snapshot, receipt };
      },
    };
  }, {
    ...options,
    mode: "direct_memory_write_suppression",
    respectBackoff: false,
  });
  const receipt = transaction.value?.receipt || null;
  appendGroupSessionMemoryModelExtractionHistory(scopeId, {
    status: transaction.committed ? "suppressed" : "suppression_failed",
    reason: transaction.committed ? "committed_direct_memory_write_in_source_range" : String(transaction.status || "suppression_transaction_failed"),
    groupId,
    groupSessionId,
    scopeId,
    cursorBefore,
    cursorAfter,
    directMemoryProofCount: proof.proofs.length,
    directMemoryRequestIds: proof.proofs.map((row: any) => row.requestId),
    ledgerMutationFence: Number(proof.ledgerMutationFence || 0),
    extractionFencingToken: Number(transaction.lease?.fencingToken || 0),
    receiptChecksum: String(receipt?.checksum || ""),
    dedupeKey: `direct_memory_write_suppressed:${cursorAfter}:${proof.directMemoryChecksum}`,
  }, { dedupeWindowMs: 24 * 60 * 60_000 });
  if (!transaction.committed) {
    return {
      committed: false,
      status: transaction.status || "direct_memory_write_suppression_failed",
      suppressionAttempted: true,
      transaction,
      cadence,
    };
  }
  return {
    committed: true,
    status: "direct_memory_write_suppressed",
    modelInvoked: false,
    cursorAdvanced: true,
    cadence: transaction.value?.snapshot?.updateCadence || null,
    suppressionReceipt: receipt,
    transaction,
  };
}

export async function runGroupSessionMemoryModelExtractionNow(groupId: string, options: any = {}) {
  const id = String(groupId || "").trim();
  if (!id) return { committed: false, status: "missing_group_id" };
  const groupSessionId = String(options.groupSessionId || options.group_session_id || getActiveGroupChatSessionId(id));
  if (!groupSessionId || groupSessionId === "default") return { committed: false, status: "legacy_default_session_rejected" };
  const scopeId = `${id}--${groupSessionId}`;
  const messages = getGroupMessages(id, groupSessionId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const manualExtraction = options.manual === true || options.manual_extraction === true;
  if (manualExtraction && messages.length === 0) {
    return { committed: false, status: "manual_extraction_empty_transcript", groupId: id, groupSessionId, scopeId, modelInvoked: false };
  }
  const previousSnapshot = readGroupSessionMemorySnapshotSummary(scopeId) || {};
  const suppliedCadence = options.cadenceDecision || options.cadence_decision || null;
  const cadence = suppliedCadence?.schema
    ? suppliedCadence
    : evaluateGroupSessionMemoryUpdateCadence(messages, previousSnapshot, options.cadence || options);
  if (cadence.shouldExtract !== true && options.force !== true) {
    return { committed: false, status: cadence.status || "not_due", cadence };
  }
  const state = readGroupSessionMemoryExtractionState(scopeId);
  const observedAtMs = Date.parse(String(options.at || "")) || Date.now();
  const nextRetryAtMs = Date.parse(String(state.nextRetryAt || "")) || 0;
  if (options.respectBackoff !== false && nextRetryAtMs > observedAtMs) {
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "deferred",
      reason: "retry_backoff",
      groupId: id,
      groupSessionId,
      retryAt: state.nextRetryAt,
      retryInMs: nextRetryAtMs - observedAtMs,
      dedupeKey: `retry_backoff:${state.nextRetryAt}`,
    }, { dedupeWindowMs: 60_000 });
    return { committed: false, status: "retry_backoff", retryAt: state.nextRetryAt, retryInMs: nextRetryAtMs - observedAtMs, cadence, state };
  }
  const lastExtractionMessageId = String(previousSnapshot.updateCadence?.lastExtractionMessageId || "");
  const lastIndex = lastExtractionMessageId
    ? messages.findIndex((message: any, index: number) => messageIdentity(message, index) === lastExtractionMessageId)
    : -1;
  const incrementalSourceMessages = messages.slice(Math.max(0, lastIndex + 1));
  const sourceMessages = manualExtraction ? messages : incrementalSourceMessages;
  const sourceRangeMode = manualExtraction ? "full_session_refresh" : "incremental_after_safe_cursor";
  const manualRefreshWithoutNewMessages = manualExtraction && incrementalSourceMessages.length === 0;
  const directMemoryProof = readCommittedDirectMemoryWriteProofs(scopeId, sourceMessages);
  const manualDirectMemorySuppressionBypass = manualExtraction && directMemoryProof.eligible === true;
  const directMemorySuppressionDisabled = manualExtraction
    || options.disableDirectMemoryWriteSuppression === true
    || options.disable_direct_memory_write_suppression === true;
  if (directMemoryProof.eligible === true && !directMemorySuppressionDisabled) {
    return suppressGroupSessionMemoryModelExtractionAfterDirectWrite({
      groupId: id,
      groupSessionId,
      scopeId,
      sourceMessages,
      previousSnapshot,
      cadence,
      proof: directMemoryProof,
      options,
    });
  }
  const executor = options.executor || configuredExecutor;
  if (typeof executor !== "function") {
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "deferred",
      reason: "model_executor_unavailable",
      groupId: id,
      groupSessionId,
      dedupeKey: "model_executor_unavailable",
    }, { dedupeWindowMs: 5 * 60_000 });
    return { committed: false, status: "model_executor_unavailable", retryInMs: MODEL_EXECUTOR_UNAVAILABLE_RETRY_MS, cadence, state, modelInvoked: false };
  }

  const customTemplateProfile = readGroupSessionMemoryCustomTemplateProfile(scopeId);
  let currentNotes = customTemplateProfile.content;
  try {
    if (previousSnapshot.summaryFile && fs.existsSync(previousSnapshot.summaryFile)) {
      currentNotes = fs.readFileSync(previousSnapshot.summaryFile, "utf-8") || currentNotes;
    }
  } catch {}
  const customPromptProfile = readGroupSessionMemoryCustomPromptProfile(scopeId);
  const customInstructions = substituteGroupSessionMemoryCustomPrompt(customPromptProfile.content, {
    currentNotes: currentNotes.trim(),
    notesPath: String(previousSnapshot.summaryFile || path.join(CCM_DIR, "group-session-memory", scopeId, "summary.md")),
    scopeId,
    groupId: id,
    groupSessionId,
  });
  const executionId = `gsmme_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
  const typedMemoryManifest = readBoundedGroupTypedMemoryManifest(scopeId);
  const request: any = buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes,
    existingMemoryManifest: typedMemoryManifest.content,
    messages: sourceMessages,
    maxInputTokens: options.maxInputTokens,
    customInstructions,
    customPromptSource: customPromptProfile.source,
    requiredTemplate: customTemplateProfile.content,
    customTemplateSource: customTemplateProfile.source,
  });
  request.audit.existingMemoryManifestFile = typedMemoryManifest.file;
  request.audit.existingMemoryManifestOriginalChars = typedMemoryManifest.originalChars;
  request.audit.existingMemoryManifestTruncated = typedMemoryManifest.truncated;
  request.audit.directMemorySuppressionEligible = directMemoryProof.eligible === true;
  request.audit.directMemorySuppressionBypassedForManualExtraction = manualDirectMemorySuppressionBypass;
  request.audit.directMemoryProofCount = Number(directMemoryProof.proofs?.length || 0);
  request.audit.directMemoryChecksum = String(directMemoryProof.directMemoryChecksum || "");
  request.audit.directMemoryLedgerMutationFence = Number(directMemoryProof.ledgerMutationFence || 0);
  request.audit.sourceRangeMode = sourceRangeMode;
  request.audit.incrementalSourceMessageCount = incrementalSourceMessages.length;
  request.audit.manualRefreshWithoutNewMessages = manualRefreshWithoutNewMessages;
  request.audit.priorSafeCursor = lastExtractionMessageId;
  const startedAt = String(options.at || new Date().toISOString());
  const startedAtMs = Date.parse(startedAt) || Date.now();
  let rawOutput = "";
  let executorMetadata: any = {};
  let preparedSnapshot: any = null;
  let mergeQuality: any = null;
  let validatedOutput: any = null;
  let requestArtifactMeta: any = null;
  let resultArtifactMeta: any = null;
  let modelInvoked = false;

  if (request.audit.inputBudgetExceeded === true) {
    requestArtifactMeta = writeGroupSessionMemoryModelExtractionArtifact(scopeId, executionId, "request", {
      createdAt: startedAt,
      groupId: id,
      groupSessionId,
      currentNotes: request.replayMaterial.currentNotes,
      existingMemoryManifest: request.replayMaterial.existingMemoryManifest,
      transcript: request.replayMaterial.transcript,
      customInstructions: request.replayMaterial.customInstructions,
      requiredTemplate: request.replayMaterial.requiredTemplate,
      requestAudit: request.audit,
    });
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "deferred",
      reason: "model_input_budget_exceeded",
      executionId,
      groupId: id,
      groupSessionId,
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta.artifactFile,
      requestArtifactChecksum: requestArtifactMeta.artifactChecksum,
      dedupeKey: `model_input_budget_exceeded:${request.audit.currentNotesChecksum}:${request.audit.maxInputTokens}`,
    }, { dedupeWindowMs: 60_000 });
    const artifactRetention = runAutomaticExtractionArtifactRetention(scopeId);
    return {
      committed: false,
      status: "model_input_budget_exceeded",
      cadence,
      requestAudit: request.audit,
      executionId,
      requestArtifact: requestArtifactMeta,
      artifactRetention,
      modelInvoked: false,
    };
  }

  const transaction: any = await runGroupSessionMemoryExtractionTransactionAsync(scopeId, async (extraction: any) => {
    requestArtifactMeta = writeGroupSessionMemoryModelExtractionArtifact(scopeId, executionId, "request", {
      createdAt: startedAt,
      groupId: id,
      groupSessionId,
      currentNotes: request.replayMaterial.currentNotes,
      existingMemoryManifest: request.replayMaterial.existingMemoryManifest,
      transcript: request.replayMaterial.transcript,
      customInstructions: request.replayMaterial.customInstructions,
      requiredTemplate: request.replayMaterial.requiredTemplate,
      requestAudit: request.audit,
      leaseId: String(extraction.lease?.leaseId || ""),
      fencingToken: Number(extraction.lease?.fencingToken || 0),
    });
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "attempt_started",
      reason: manualExtraction ? "memory_center_manual_extraction" : String(options.reason || "automatic_model_extraction"),
      trigger: manualExtraction ? "manual" : "automatic",
      executionId,
      groupId: id,
      groupSessionId,
      startedAt,
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta.artifactFile,
      requestArtifactChecksum: requestArtifactMeta.artifactChecksum,
      leaseId: String(extraction.lease?.leaseId || ""),
      fencingToken: Number(extraction.lease?.fencingToken || 0),
    });
    const executionTimeoutMs = Math.max(1_000, Number(options.modelTimeoutMs || options.model_timeout_ms || MODEL_EXTRACTION_EXECUTION_TIMEOUT_MS));
    let timeout: ReturnType<typeof setTimeout> | null = null;
    modelInvoked = true;
    const executionPromise = Promise.resolve(executor({
      schema: "ccm-group-session-memory-model-execution-request-v1",
      executionId,
      groupId: id,
      groupSessionId,
      scopeId,
      prompt: request.prompt,
      maxOutputTokens: request.maxOutputTokens,
      requestAudit: request.audit,
      lease: extraction.lease,
    }));
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`session_memory_model_execution_timeout:${executionTimeoutMs}`)), executionTimeoutMs);
    });
    let executionResult: any;
    try {
      executionResult = await Promise.race([executionPromise, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    rawOutput = typeof executionResult === "string" ? executionResult : String(executionResult?.output || executionResult?.text || "");
    executorMetadata = typeof executionResult === "object" && executionResult ? executionResult : {};
    const validated = validateGroupSessionMemoryModelOutput(rawOutput, request.replayMaterial.requiredTemplate);
    validatedOutput = validated;
    mergeQuality = analyzeGroupSessionMemoryModelMergeQuality({
      currentNotes: request.replayMaterial.currentNotes,
      markdown: validated.markdown,
      sourceText: request.replayMaterial.transcript,
      sourceTranscriptChecksum: request.audit.sourceTranscriptChecksum,
      requiredTemplate: request.replayMaterial.requiredTemplate,
    });
    if (mergeQuality.pass !== true) {
      const error: any = new Error(`session_memory_model_merge_quality_invalid:missing_sections=${mergeQuality.missingRequiredSections.join(",")}:lost_constraints=${mergeQuality.lostConstraintCount}:retention=${mergeQuality.anchorRetentionPercent}`);
      error.code = "invalid_model_output";
      throw error;
    }
    const generatedAt = String(options.completedAt || options.completed_at || options.at || new Date().toISOString());
    const committedCadence = { ...cadence, shouldExtract: true };
    const cursorAdvance = resolveGroupSessionMemoryExtractionCursor(committedCadence);
    const sectionEvidence = buildGroupSessionMemorySectionEvidence(validated.markdown, {
      sourceType: "model_transcript_range",
      ...request.audit,
    });
    const receiptCore: any = {
      schema: "ccm-group-session-memory-model-extraction-receipt-v1",
      version: 3,
      status: "committed",
      trigger: manualExtraction ? "manual" : "automatic",
      reason: manualExtraction ? "memory_center_manual_extraction" : String(options.reason || "automatic_model_extraction"),
      modelInvoked: true,
      sourceRangeMode,
      incrementalSourceMessageCount: incrementalSourceMessages.length,
      manualRefreshWithoutNewMessages,
      directMemorySuppressionEligible: directMemoryProof.eligible === true,
      directMemorySuppressionBypassedForManualExtraction: manualDirectMemorySuppressionBypass,
      directMemoryProofCount: Number(directMemoryProof.proofs?.length || 0),
      directMemoryChecksum: String(directMemoryProof.directMemoryChecksum || ""),
      directMemoryLedgerMutationFence: Number(directMemoryProof.ledgerMutationFence || 0),
      executionId,
      groupId: id,
      groupSessionId,
      scopeId,
      startedAt,
      completedAt: generatedAt,
      durationMs: Math.max(0, (Date.parse(generatedAt) || Date.now()) - startedAtMs),
      extractorProject: String(executorMetadata.project || executorMetadata.extractorProject || ""),
      extractorAgentType: String(executorMetadata.agentType || executorMetadata.runtime || ""),
      model: String(executorMetadata.model || ""),
      nativeSessionId: String(executorMetadata.nativeSessionId || ""),
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      outputChecksum: validated.outputChecksum,
      outputChars: rawOutput.length,
      markdownChecksum: validated.markdownChecksum,
      templateChecksum: validated.templateChecksum,
      templateSectionCount: validated.templateSectionCount,
      markdownTokens: validated.budget.totalTokens,
      sectionEvidenceChecksum: sectionEvidence.checksum,
      sectionEvidenceCount: sectionEvidence.sections.length,
      budget: validated.budget,
      budgetEnforced: validated.budgetEnforced,
      truncatedSections: validated.truncatedSections,
      mergeQuality,
      mergeQualityInput: {
        canonicalization: String(request.audit.currentNotesCanonicalization || "trim"),
        currentNotesChecksum: String(request.audit.currentNotesChecksum || ""),
        rawCurrentNotesChecksum: String(request.audit.currentNotesRawChecksum || ""),
        rawChars: Number(request.audit.currentNotesRawChars || 0),
        canonicalChars: Number(request.audit.currentNotesCanonicalChars || 0),
        normalized: request.audit.currentNotesNormalized === true,
      },
      factSupersessionGraph: mergeQuality.factSupersessionGraph,
      factSupersessionGraphChecksum: mergeQuality.factSupersessionGraphChecksum,
      leaseId: String(extraction.lease?.leaseId || ""),
      fencingToken: Number(extraction.lease?.fencingToken || 0),
      cursorAdvanceStatus: cursorAdvance.cursorAdvanceStatus,
      cursorAdvanceSafe: cursorAdvance.cursorAdvanceSafe,
      cursorHeldReason: cursorAdvance.cursorHeldReason,
      cursorBefore: {
        tokensAtLastExtraction: Number(previousSnapshot.updateCadence?.tokensAtLastExtraction || 0),
        lastExtractionMessageId,
        extractionCount: Number(previousSnapshot.updateCadence?.extractionCount || 0),
      },
      cursorAfter: {
        tokensAtLastExtraction: cadence.currentContextTokens,
        lastExtractionMessageId: cursorAdvance.cursorAfter,
        extractionCount: Number(previousSnapshot.updateCadence?.extractionCount || 0) + 1,
      },
    };
    const receipt = { ...receiptCore, checksum: receiptChecksum(receiptCore) };
    const memory = loadGroupMemory(id, groupSessionId);
    preparedSnapshot = buildGroupSessionMemorySnapshot(scopeId, memory, {
      reason: manualExtraction ? "manual_forked_model_session_memory_extraction" : "automatic_forked_model_session_memory_extraction",
      generatedAt,
      cadenceDecision: committedCadence,
      sessionMemoryModelMarkdown: validated.markdown,
      modelExtractionReceipt: receipt,
      sectionEvidence,
      modelMergeQuality: mergeQuality,
      extractionTransaction: {
        schema: "ccm-group-session-memory-extraction-transaction-v1",
        status: "prepared",
        mode: manualExtraction ? "manual_forked_model_session_memory" : "forked_model_session_memory",
        executionId,
        leaseId: extraction.lease?.leaseId || "",
        fencingToken: Number(extraction.lease?.fencingToken || 0),
        recovered: extraction.recovered === true,
        startedAt: extraction.state?.startedAt || startedAt,
      },
    });
    const receiptFile = modelReceiptFile(preparedSnapshot);
    const persistedReceipt = { ...receipt, receiptFile };
    persistedReceipt.checksum = receiptChecksum(persistedReceipt);
    resultArtifactMeta = writeGroupSessionMemoryModelExtractionArtifact(scopeId, executionId, "result", {
      createdAt: generatedAt,
      status: "committed",
      groupId: id,
      groupSessionId,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      rawOutput,
      outputChecksum: validated.outputChecksum,
      validated: validatedOutput,
      mergeQuality,
      receipt: persistedReceipt,
    });
    return {
      schema: "ccm-group-session-memory-extraction-staged-commit-v1",
      commit: () => {
        const committed = commitGroupSessionMemorySnapshot(preparedSnapshot);
        writeJsonAtomic(receiptFile, persistedReceipt);
        return { snapshot: committed, receipt: persistedReceipt, resultArtifact: resultArtifactMeta };
      },
    };
  }, {
    ...options,
    mode: manualExtraction ? "manual_forked_model_session_memory" : "forked_model_session_memory",
    respectBackoff: options.respectBackoff !== false,
  });

  if (!transaction.committed && transaction.status === "failed") {
    const fallbackSnapshot = previousSnapshot?.snapshotFile ? previousSnapshot : preparedSnapshot || {
      snapshotFile: path.join(process.cwd(), `${scopeId}.snapshot.json`),
    };
    const failureCore: any = {
      schema: "ccm-group-session-memory-model-extraction-receipt-v1",
      version: 3,
      status: "failed",
      trigger: manualExtraction ? "manual" : "automatic",
      modelInvoked,
      sourceRangeMode,
      incrementalSourceMessageCount: incrementalSourceMessages.length,
      manualRefreshWithoutNewMessages,
      executionId,
      groupId: id,
      groupSessionId,
      scopeId,
      startedAt,
      failedAt: String(transaction.state?.lastFailedAt || new Date().toISOString()),
      failureClass: String(transaction.failureClass || "model_execution_failed"),
      error: String(transaction.error || "model extraction failed").slice(0, 1000),
      retryAt: String(transaction.retryAt || ""),
      retryInMs: Number(transaction.retryInMs || 0),
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      outputChecksum: rawOutput ? hashText(rawOutput, 32) : "",
      outputChars: rawOutput.length,
      extractorProject: String(executorMetadata.project || executorMetadata.extractorProject || ""),
      extractorAgentType: String(executorMetadata.agentType || executorMetadata.runtime || ""),
      leaseId: String(transaction.lease?.leaseId || ""),
      fencingToken: Number(transaction.lease?.fencingToken || 0),
      previousSnapshotPreserved: !!previousSnapshot?.markdownChecksum,
      previousMarkdownChecksum: String(previousSnapshot?.markdownChecksum || ""),
      directMemorySuppressionEligible: directMemoryProof.eligible === true,
      directMemorySuppressionBypassedForManualExtraction: manualDirectMemorySuppressionBypass,
      mergeQuality,
    };
    const receiptFile = modelFailureReceiptFile(scopeId, fallbackSnapshot);
    const failedReceipt = { ...failureCore, receiptFile };
    failedReceipt.checksum = receiptChecksum(failedReceipt);
    try { writeJsonAtomic(receiptFile, failedReceipt); } catch {}
    resultArtifactMeta = writeGroupSessionMemoryModelExtractionArtifact(scopeId, executionId, "result", {
      createdAt: failureCore.failedAt,
      status: "failed",
      failureClass: failureCore.failureClass,
      error: failureCore.error,
      groupId: id,
      groupSessionId,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      rawOutput,
      outputChecksum: failureCore.outputChecksum,
      validated: validatedOutput,
      mergeQuality,
      receipt: failedReceipt,
    });
    transaction.failureReceipt = failedReceipt;
    transaction.resultArtifact = resultArtifactMeta;
  }
  let deliveryEvidence: any = null;
  let typedMemoryCommit: any = null;
  if (transaction.committed) {
    const committedReceipt = transaction.value?.receipt || preparedSnapshot?.modelExtractionReceipt || null;
    const committedResultArtifact = transaction.value?.resultArtifact || resultArtifactMeta || null;
    try {
      typedMemoryCommit = distillGroupSessionModelExtractionToTypedMemory(scopeId, {
        receipt: committedReceipt,
        factSupersessionGraph: committedReceipt?.factSupersessionGraph || mergeQuality?.factSupersessionGraph,
        transcript: request.replayMaterial.transcript,
        markdown: validatedOutput?.markdown || "",
        requestArtifact: requestArtifactMeta,
        extractionFencingToken: Number(transaction.lease?.fencingToken || 0),
      }, {
        reason: "committed_forked_model_extraction",
        at: String(committedReceipt?.completedAt || new Date().toISOString()),
        __modelExtractionTypedMemoryFailAfterSnapshot: options.__modelExtractionTypedMemoryFailAfterSnapshot === true,
      });
    } catch (error: any) {
      typedMemoryCommit = {
        schema: "ccm-group-session-model-extraction-typed-memory-commit-v1",
        committed: false,
        status: "failed_retriable",
        scopeId,
        executionId,
        error: String(error?.message || error || "model extraction typed memory commit failed").slice(0, 1000),
        failedAt: new Date().toISOString(),
      };
      try {
        const retry = persistFailedGroupSessionModelExtractionTypedMemoryCommit(scopeId, {
          executionId,
          receiptChecksum: String(committedReceipt?.checksum || ""),
          requestArtifactChecksum: String(requestArtifactMeta?.artifactChecksum || ""),
          resultArtifactChecksum: String(committedResultArtifact?.artifactChecksum || ""),
          graphChecksum: String(committedReceipt?.factSupersessionGraphChecksum || ""),
          error: typedMemoryCommit.error,
          failedAt: typedMemoryCommit.failedAt,
        }, { schedule: options.disableTypedMemoryRetrySchedule !== true });
        typedMemoryCommit.retryStateFile = retry.state?.file || "";
        typedMemoryCommit.nextRetryAt = retry.nextRetryAt;
        typedMemoryCommit.retryInMs = retry.retryInMs;
      } catch (retryError: any) {
        typedMemoryCommit.retryPersistenceError = String(retryError?.message || retryError || "").slice(0, 1000);
      }
    }
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "committed",
      executionId,
      groupId: id,
      groupSessionId,
      startedAt,
      completedAt: String(committedReceipt?.completedAt || new Date().toISOString()),
      durationMs: Number(committedReceipt?.durationMs || 0),
      markdownChecksum: String(committedReceipt?.markdownChecksum || preparedSnapshot?.markdownChecksum || ""),
      sectionEvidenceChecksum: String(committedReceipt?.sectionEvidenceChecksum || preparedSnapshot?.sectionEvidence?.checksum || ""),
      mergeQuality: committedReceipt?.mergeQuality || mergeQuality,
      factSupersessionGraphChecksum: String(committedReceipt?.factSupersessionGraphChecksum || mergeQuality?.factSupersessionGraphChecksum || ""),
      supersededFactCount: Number(committedReceipt?.factSupersessionGraph?.supersededFactCount || mergeQuality?.factSupersessionGraph?.supersededFactCount || 0),
      unjustifiedLostFactCount: Number(committedReceipt?.factSupersessionGraph?.unjustifiedLostFactCount || mergeQuality?.factSupersessionGraph?.unjustifiedLostFactCount || 0),
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      resultArtifactFile: committedResultArtifact?.artifactFile || "",
      resultArtifactChecksum: committedResultArtifact?.artifactChecksum || "",
      receiptFile: committedReceipt?.receiptFile || "",
      receiptChecksum: committedReceipt?.checksum || "",
      leaseId: String(transaction.lease?.leaseId || ""),
      fencingToken: Number(transaction.lease?.fencingToken || 0),
      cursorBefore: committedReceipt?.cursorBefore || null,
      cursorAfter: committedReceipt?.cursorAfter || null,
      typedMemoryCommit: {
        status: String(typedMemoryCommit?.status || "unobserved"),
        committed: typedMemoryCommit?.committed === true,
        proposalCount: Number(typedMemoryCommit?.proposalCount || 0),
        admittedCount: Number(typedMemoryCommit?.admittedCount || 0),
        rejectedCount: Number(typedMemoryCommit?.rejectedCount || 0),
        duplicateCount: Number(typedMemoryCommit?.duplicateCount || 0),
        supersededCount: Number(typedMemoryCommit?.supersededCount || 0),
        archiveChecksum: String(typedMemoryCommit?.archiveChecksum || ""),
        error: String(typedMemoryCommit?.error || ""),
        nextRetryAt: String(typedMemoryCommit?.nextRetryAt || ""),
        retryStateFile: String(typedMemoryCommit?.retryStateFile || ""),
      },
    });
    deliveryEvidence = persistGroupSessionMemoryModelExtractionReplayEvidence(
      scopeId,
      executionId,
      String(preparedSnapshot?.snapshotFile || ""),
      committedReceipt,
      typedMemoryCommit,
    );
  } else if (transaction.status === "failed") {
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "failed",
      executionId,
      groupId: id,
      groupSessionId,
      startedAt,
      failedAt: String(transaction.state?.lastFailedAt || new Date().toISOString()),
      failureClass: String(transaction.failureClass || "model_execution_failed"),
      error: String(transaction.error || "model extraction failed").slice(0, 1000),
      retryAt: String(transaction.retryAt || ""),
      retryInMs: Number(transaction.retryInMs || 0),
      previousMarkdownChecksum: String(previousSnapshot?.markdownChecksum || ""),
      mergeQuality,
      requestAudit: request.audit,
      requestArtifactFile: requestArtifactMeta?.artifactFile || "",
      requestArtifactChecksum: requestArtifactMeta?.artifactChecksum || "",
      resultArtifactFile: resultArtifactMeta?.artifactFile || "",
      resultArtifactChecksum: resultArtifactMeta?.artifactChecksum || "",
      receiptFile: transaction.failureReceipt?.receiptFile || "",
      receiptChecksum: transaction.failureReceipt?.checksum || "",
      leaseId: String(transaction.lease?.leaseId || ""),
      fencingToken: Number(transaction.lease?.fencingToken || 0),
    });
  } else if (["lease_busy", "retry_backoff", "lease_lost"].includes(String(transaction.status || ""))) {
    appendGroupSessionMemoryModelExtractionHistory(scopeId, {
      status: "deferred",
      reason: String(transaction.status || "blocked"),
      executionId,
      groupId: id,
      groupSessionId,
      dedupeKey: `${transaction.status}:${transaction.retryAt || transaction.lease?.leaseId || ""}`,
    }, { dedupeWindowMs: 60_000 });
  }
  const artifactRetention = transaction.committed || transaction.status === "failed"
    ? runAutomaticExtractionArtifactRetention(scopeId)
    : null;
  return {
    ...transaction,
    cadence,
    executionId,
    requestAudit: request.audit,
    requestArtifact: requestArtifactMeta,
    resultArtifact: resultArtifactMeta,
    deliveryEvidence,
    typedMemoryCommit,
    artifactRetention,
    modelInvoked,
  };
}

export function scheduleGroupSessionMemoryModelExtraction(groupId: string, options: any = {}) {
  const id = String(groupId || "").trim();
  if (!id) return { scheduled: false, reason: "missing_group_id" };
  const groupSessionId = String(options.groupSessionId || options.group_session_id || getActiveGroupChatSessionId(id));
  if (!groupSessionId || groupSessionId === "default") return { scheduled: false, reason: "legacy_default_session_rejected" };
  const scopeKey = `${id}::${groupSessionId}`;
  if (timers.has(scopeKey)) clearTimeout(timers.get(scopeKey)!);
  const delayMs = Math.max(0, Number(options.delayMs ?? options.delay_ms ?? MODEL_EXTRACTION_DEBOUNCE_MS));
  const timer = setTimeout(async () => {
    timers.delete(scopeKey);
    if (running.has(scopeKey)) {
      pending.add(scopeKey);
      return;
    }
    running.add(scopeKey);
    let result: any = null;
    try {
      result = await runGroupSessionMemoryModelExtractionNow(id, { ...options, groupSessionId });
    } finally {
      running.delete(scopeKey);
      if (pending.has(scopeKey)) {
        pending.delete(scopeKey);
        scheduleGroupSessionMemoryModelExtraction(id, { ...options, groupSessionId, delayMs: MODEL_EXTRACTION_DEBOUNCE_MS });
      } else if (["failed", "model_executor_unavailable"].includes(String(result?.status || "")) && result?.retryInMs > 0) {
        scheduleGroupSessionMemoryModelExtraction(id, { ...options, groupSessionId, delayMs: result.retryInMs });
      }
    }
  }, delayMs);
  timer.unref?.();
  timers.set(scopeKey, timer);
  return { scheduled: true, groupId: id, groupSessionId, delayMs };
}

export function ensureGroupSessionMemoryModelExtractionHook() {
  if (appendHookRegistered) return { registered: true, already: true };
  registerGroupMessageAppendHook((groupId, message) => {
    if (String(message?.role || message?.type || "").toLowerCase() !== "assistant") return;
    scheduleGroupSessionMemoryModelExtraction(groupId, {
      reason: "post_sampling_assistant_message",
      messageId: String(message?.id || ""),
      groupSessionId: String(message?.group_session_id || message?.groupSessionId || ""),
    });
  });
  setAppendHookRegistered(true);
  return { registered: true, already: false };
}

ensureGroupSessionMemoryModelExtractionHook();
const typedMemoryRetryRecoveryTimer = setTimeout(() => {
  try { recoverPendingGroupSessionMemoryTypedMemoryRetries(); } catch {}
}, 0);
typedMemoryRetryRecoveryTimer.unref?.();
