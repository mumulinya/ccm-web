"use strict";
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
exports.runGroupSessionMemoryModelExtractionNow = runGroupSessionMemoryModelExtractionNow;
exports.scheduleGroupSessionMemoryModelExtraction = scheduleGroupSessionMemoryModelExtraction;
exports.ensureGroupSessionMemoryModelExtractionHook = ensureGroupSessionMemoryModelExtractionHook;
// Behavior-freeze split from group-session-memory-model-extraction.ts (part 3/3).
const group_session_memory_model_extraction_part_01_1 = require("./group-session-memory-model-extraction-part-01");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const memory_1 = require("./memory");
const group_session_memory_extraction_1 = require("./group-session-memory-extraction");
const storage_1 = require("./storage");
const group_memory_index_1 = require("./group-memory-index");
const group_session_memory_customization_1 = require("./group-session-memory-customization");
const group_session_memory_model_extraction_part_01_2 = require("./group-session-memory-model-extraction-part-01");
const group_session_memory_model_extraction_part_02_1 = require("./group-session-memory-model-extraction-part-02");
async function suppressGroupSessionMemoryModelExtractionAfterDirectWrite(input) {
    const { groupId, groupSessionId, scopeId, sourceMessages, previousSnapshot, cadence, proof, options, } = input;
    const suppressedAt = String(options.at || new Date().toISOString());
    const sourceMessageIds = sourceMessages.map((message, index) => (0, group_session_memory_model_extraction_part_01_2.messageIdentity)(message, index));
    const cursorBefore = String(previousSnapshot.updateCadence?.lastExtractionMessageId || "");
    const cursorAfter = String(cadence.lastObservedMessageId || sourceMessageIds[sourceMessageIds.length - 1] || cursorBefore);
    const receiptCore = {
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
        suppressedTranscriptChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify((0, group_session_memory_model_extraction_part_01_2.transcriptRows)(sourceMessages)), 64),
        directMemoryProofCount: proof.proofs.length,
        directMemoryProofs: proof.proofs,
        directMemoryChecksum: proof.directMemoryChecksum,
        ledgerFile: proof.ledgerFile,
        ledgerMutationFence: Number(proof.ledgerMutationFence || 0),
        ledgerMutationLeaseId: String(proof.ledgerMutationLeaseId || ""),
        suppressedAt,
    };
    const transaction = await (0, group_session_memory_extraction_1.runGroupSessionMemoryExtractionTransactionAsync)(scopeId, async (extraction) => {
        const receiptWithoutChecksum = {
            ...receiptCore,
            extractionLeaseId: String(extraction.lease?.leaseId || ""),
            extractionFencingToken: Number(extraction.lease?.fencingToken || 0),
        };
        const receipt = { ...receiptWithoutChecksum, checksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify(receiptWithoutChecksum), 64) };
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
                const snapshot = (0, memory_1.persistGroupSessionMemoryCadenceObservation)(scopeId, cadenceObservation);
                return { snapshot, receipt };
            },
        };
    }, {
        ...options,
        mode: "direct_memory_write_suppression",
        respectBackoff: false,
    });
    const receipt = transaction.value?.receipt || null;
    (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
        status: transaction.committed ? "suppressed" : "suppression_failed",
        reason: transaction.committed ? "committed_direct_memory_write_in_source_range" : String(transaction.status || "suppression_transaction_failed"),
        groupId,
        groupSessionId,
        scopeId,
        cursorBefore,
        cursorAfter,
        directMemoryProofCount: proof.proofs.length,
        directMemoryRequestIds: proof.proofs.map((row) => row.requestId),
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
async function runGroupSessionMemoryModelExtractionNow(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { committed: false, status: "missing_group_id" };
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!groupSessionId || groupSessionId === "default")
        return { committed: false, status: "legacy_default_session_rejected" };
    const scopeId = `${id}--${groupSessionId}`;
    const messages = (0, storage_1.getGroupMessages)(id, groupSessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const manualExtraction = options.manual === true || options.manual_extraction === true;
    if (manualExtraction && messages.length === 0) {
        return { committed: false, status: "manual_extraction_empty_transcript", groupId: id, groupSessionId, scopeId, modelInvoked: false };
    }
    const previousSnapshot = (0, memory_1.readGroupSessionMemorySnapshotSummary)(scopeId) || {};
    const suppliedCadence = options.cadenceDecision || options.cadence_decision || null;
    const cadence = suppliedCadence?.schema
        ? suppliedCadence
        : (0, memory_1.evaluateGroupSessionMemoryUpdateCadence)(messages, previousSnapshot, options.cadence || options);
    if (cadence.shouldExtract !== true && options.force !== true) {
        return { committed: false, status: cadence.status || "not_due", cadence };
    }
    const state = (0, group_session_memory_extraction_1.readGroupSessionMemoryExtractionState)(scopeId);
    const observedAtMs = Date.parse(String(options.at || "")) || Date.now();
    const nextRetryAtMs = Date.parse(String(state.nextRetryAt || "")) || 0;
    if (options.respectBackoff !== false && nextRetryAtMs > observedAtMs) {
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
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
        ? messages.findIndex((message, index) => (0, group_session_memory_model_extraction_part_01_2.messageIdentity)(message, index) === lastExtractionMessageId)
        : -1;
    const incrementalSourceMessages = messages.slice(Math.max(0, lastIndex + 1));
    const sourceMessages = manualExtraction ? messages : incrementalSourceMessages;
    const sourceRangeMode = manualExtraction ? "full_session_refresh" : "incremental_after_safe_cursor";
    const manualRefreshWithoutNewMessages = manualExtraction && incrementalSourceMessages.length === 0;
    const directMemoryProof = (0, group_session_memory_model_extraction_part_01_2.readCommittedDirectMemoryWriteProofs)(scopeId, sourceMessages);
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
    const executor = options.executor || group_session_memory_model_extraction_part_01_2.configuredExecutor;
    if (typeof executor !== "function") {
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
            status: "deferred",
            reason: "model_executor_unavailable",
            groupId: id,
            groupSessionId,
            dedupeKey: "model_executor_unavailable",
        }, { dedupeWindowMs: 5 * 60_000 });
        return { committed: false, status: "model_executor_unavailable", retryInMs: group_session_memory_model_extraction_part_01_2.MODEL_EXECUTOR_UNAVAILABLE_RETRY_MS, cadence, state, modelInvoked: false };
    }
    const customTemplateProfile = (0, group_session_memory_customization_1.readGroupSessionMemoryCustomTemplateProfile)(scopeId);
    let currentNotes = customTemplateProfile.content;
    try {
        if (previousSnapshot.summaryFile && fs.existsSync(previousSnapshot.summaryFile)) {
            currentNotes = fs.readFileSync(previousSnapshot.summaryFile, "utf-8") || currentNotes;
        }
    }
    catch { }
    const customPromptProfile = (0, group_session_memory_customization_1.readGroupSessionMemoryCustomPromptProfile)(scopeId);
    const customInstructions = (0, group_session_memory_model_extraction_part_01_2.substituteGroupSessionMemoryCustomPrompt)(customPromptProfile.content, {
        currentNotes: currentNotes.trim(),
        notesPath: String(previousSnapshot.summaryFile || path.join(utils_1.CCM_DIR, "group-session-memory", scopeId, "summary.md")),
        scopeId,
        groupId: id,
        groupSessionId,
    });
    const executionId = `gsmme_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
    const typedMemoryManifest = (0, group_session_memory_model_extraction_part_01_2.readBoundedGroupTypedMemoryManifest)(scopeId);
    const request = (0, group_session_memory_model_extraction_part_01_2.buildGroupSessionMemoryModelExtractionPrompt)({
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
    let executorMetadata = {};
    let preparedSnapshot = null;
    let mergeQuality = null;
    let validatedOutput = null;
    let requestArtifactMeta = null;
    let resultArtifactMeta = null;
    let modelInvoked = false;
    if (request.audit.inputBudgetExceeded === true) {
        requestArtifactMeta = (0, group_session_memory_model_extraction_part_01_2.writeGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "request", {
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
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
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
        const artifactRetention = (0, group_session_memory_model_extraction_part_02_1.runAutomaticExtractionArtifactRetention)(scopeId);
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
    const transaction = await (0, group_session_memory_extraction_1.runGroupSessionMemoryExtractionTransactionAsync)(scopeId, async (extraction) => {
        requestArtifactMeta = (0, group_session_memory_model_extraction_part_01_2.writeGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "request", {
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
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
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
        const executionTimeoutMs = Math.max(1_000, Number(options.modelTimeoutMs || options.model_timeout_ms || group_session_memory_model_extraction_part_01_2.MODEL_EXTRACTION_EXECUTION_TIMEOUT_MS));
        let timeout = null;
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
        let executionResult;
        try {
            executionResult = await Promise.race([executionPromise, timeoutPromise]);
        }
        finally {
            if (timeout)
                clearTimeout(timeout);
        }
        rawOutput = typeof executionResult === "string" ? executionResult : String(executionResult?.output || executionResult?.text || "");
        executorMetadata = typeof executionResult === "object" && executionResult ? executionResult : {};
        const validated = (0, group_session_memory_model_extraction_part_02_1.validateGroupSessionMemoryModelOutput)(rawOutput, request.replayMaterial.requiredTemplate);
        validatedOutput = validated;
        mergeQuality = (0, group_session_memory_model_extraction_part_02_1.analyzeGroupSessionMemoryModelMergeQuality)({
            currentNotes: request.replayMaterial.currentNotes,
            markdown: validated.markdown,
            sourceText: request.replayMaterial.transcript,
            sourceTranscriptChecksum: request.audit.sourceTranscriptChecksum,
            requiredTemplate: request.replayMaterial.requiredTemplate,
        });
        if (mergeQuality.pass !== true) {
            const error = new Error(`session_memory_model_merge_quality_invalid:missing_sections=${mergeQuality.missingRequiredSections.join(",")}:lost_constraints=${mergeQuality.lostConstraintCount}:retention=${mergeQuality.anchorRetentionPercent}`);
            error.code = "invalid_model_output";
            throw error;
        }
        const generatedAt = String(options.completedAt || options.completed_at || options.at || new Date().toISOString());
        const committedCadence = { ...cadence, shouldExtract: true };
        const cursorAdvance = (0, memory_1.resolveGroupSessionMemoryExtractionCursor)(committedCadence);
        const sectionEvidence = (0, memory_1.buildGroupSessionMemorySectionEvidence)(validated.markdown, {
            sourceType: "model_transcript_range",
            ...request.audit,
        });
        const receiptCore = {
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
        const receipt = { ...receiptCore, checksum: (0, group_session_memory_model_extraction_part_01_2.receiptChecksum)(receiptCore) };
        const memory = (0, memory_1.loadGroupMemory)(id, groupSessionId);
        preparedSnapshot = (0, memory_1.buildGroupSessionMemorySnapshot)(scopeId, memory, {
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
        const receiptFile = (0, group_session_memory_model_extraction_part_01_2.modelReceiptFile)(preparedSnapshot);
        const persistedReceipt = { ...receipt, receiptFile };
        persistedReceipt.checksum = (0, group_session_memory_model_extraction_part_01_2.receiptChecksum)(persistedReceipt);
        resultArtifactMeta = (0, group_session_memory_model_extraction_part_01_2.writeGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "result", {
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
                const committed = (0, memory_1.commitGroupSessionMemorySnapshot)(preparedSnapshot);
                (0, group_session_memory_model_extraction_part_01_2.writeJsonAtomic)(receiptFile, persistedReceipt);
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
        const failureCore = {
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
            outputChecksum: rawOutput ? (0, group_session_memory_model_extraction_part_01_2.hashText)(rawOutput, 32) : "",
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
        const receiptFile = (0, group_session_memory_model_extraction_part_01_2.modelFailureReceiptFile)(scopeId, fallbackSnapshot);
        const failedReceipt = { ...failureCore, receiptFile };
        failedReceipt.checksum = (0, group_session_memory_model_extraction_part_01_2.receiptChecksum)(failedReceipt);
        try {
            (0, group_session_memory_model_extraction_part_01_2.writeJsonAtomic)(receiptFile, failedReceipt);
        }
        catch { }
        resultArtifactMeta = (0, group_session_memory_model_extraction_part_01_2.writeGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "result", {
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
    let deliveryEvidence = null;
    let typedMemoryCommit = null;
    if (transaction.committed) {
        const committedReceipt = transaction.value?.receipt || preparedSnapshot?.modelExtractionReceipt || null;
        const committedResultArtifact = transaction.value?.resultArtifact || resultArtifactMeta || null;
        try {
            typedMemoryCommit = (0, group_memory_index_1.distillGroupSessionModelExtractionToTypedMemory)(scopeId, {
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
        }
        catch (error) {
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
                const retry = (0, group_session_memory_model_extraction_part_02_1.persistFailedGroupSessionModelExtractionTypedMemoryCommit)(scopeId, {
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
            }
            catch (retryError) {
                typedMemoryCommit.retryPersistenceError = String(retryError?.message || retryError || "").slice(0, 1000);
            }
        }
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
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
        deliveryEvidence = (0, group_session_memory_model_extraction_part_01_2.persistGroupSessionMemoryModelExtractionReplayEvidence)(scopeId, executionId, String(preparedSnapshot?.snapshotFile || ""), committedReceipt, typedMemoryCommit);
    }
    else if (transaction.status === "failed") {
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
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
    }
    else if (["lease_busy", "retry_backoff", "lease_lost"].includes(String(transaction.status || ""))) {
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
            status: "deferred",
            reason: String(transaction.status || "blocked"),
            executionId,
            groupId: id,
            groupSessionId,
            dedupeKey: `${transaction.status}:${transaction.retryAt || transaction.lease?.leaseId || ""}`,
        }, { dedupeWindowMs: 60_000 });
    }
    const artifactRetention = transaction.committed || transaction.status === "failed"
        ? (0, group_session_memory_model_extraction_part_02_1.runAutomaticExtractionArtifactRetention)(scopeId)
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
function scheduleGroupSessionMemoryModelExtraction(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { scheduled: false, reason: "missing_group_id" };
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!groupSessionId || groupSessionId === "default")
        return { scheduled: false, reason: "legacy_default_session_rejected" };
    const scopeKey = `${id}::${groupSessionId}`;
    if (group_session_memory_model_extraction_part_01_2.timers.has(scopeKey))
        clearTimeout(group_session_memory_model_extraction_part_01_2.timers.get(scopeKey));
    const delayMs = Math.max(0, Number(options.delayMs ?? options.delay_ms ?? group_session_memory_model_extraction_part_01_2.MODEL_EXTRACTION_DEBOUNCE_MS));
    const timer = setTimeout(async () => {
        group_session_memory_model_extraction_part_01_2.timers.delete(scopeKey);
        if (group_session_memory_model_extraction_part_01_2.running.has(scopeKey)) {
            group_session_memory_model_extraction_part_01_2.pending.add(scopeKey);
            return;
        }
        group_session_memory_model_extraction_part_01_2.running.add(scopeKey);
        let result = null;
        try {
            result = await runGroupSessionMemoryModelExtractionNow(id, { ...options, groupSessionId });
        }
        finally {
            group_session_memory_model_extraction_part_01_2.running.delete(scopeKey);
            if (group_session_memory_model_extraction_part_01_2.pending.has(scopeKey)) {
                group_session_memory_model_extraction_part_01_2.pending.delete(scopeKey);
                scheduleGroupSessionMemoryModelExtraction(id, { ...options, groupSessionId, delayMs: group_session_memory_model_extraction_part_01_2.MODEL_EXTRACTION_DEBOUNCE_MS });
            }
            else if (["failed", "model_executor_unavailable"].includes(String(result?.status || "")) && result?.retryInMs > 0) {
                scheduleGroupSessionMemoryModelExtraction(id, { ...options, groupSessionId, delayMs: result.retryInMs });
            }
        }
    }, delayMs);
    timer.unref?.();
    group_session_memory_model_extraction_part_01_2.timers.set(scopeKey, timer);
    return { scheduled: true, groupId: id, groupSessionId, delayMs };
}
function ensureGroupSessionMemoryModelExtractionHook() {
    if (group_session_memory_model_extraction_part_01_2.appendHookRegistered)
        return { registered: true, already: true };
    (0, storage_1.registerGroupMessageAppendHook)((groupId, message) => {
        if (String(message?.role || message?.type || "").toLowerCase() !== "assistant")
            return;
        scheduleGroupSessionMemoryModelExtraction(groupId, {
            reason: "post_sampling_assistant_message",
            messageId: String(message?.id || ""),
            groupSessionId: String(message?.group_session_id || message?.groupSessionId || ""),
        });
    });
    (0, group_session_memory_model_extraction_part_01_1.setAppendHookRegistered)(true);
    return { registered: true, already: false };
}
ensureGroupSessionMemoryModelExtractionHook();
const typedMemoryRetryRecoveryTimer = setTimeout(() => {
    try {
        (0, group_session_memory_model_extraction_part_02_1.recoverPendingGroupSessionMemoryTypedMemoryRetries)();
    }
    catch { }
}, 0);
typedMemoryRetryRecoveryTimer.unref?.();
//# sourceMappingURL=group-session-memory-model-extraction-part-03.js.map