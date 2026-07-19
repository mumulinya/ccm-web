"use strict";
// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 5/5).
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.distillGroupMessagesToTypedMemoryUnlocked = distillGroupMessagesToTypedMemoryUnlocked;
exports.distillGroupMessagesToTypedMemory = distillGroupMessagesToTypedMemory;
exports.distillGroupMessagesToTypedMemoryUntilCaughtUp = distillGroupMessagesToTypedMemoryUntilCaughtUp;
exports.buildGroupSessionModelExtractionTopicRecallIndex = buildGroupSessionModelExtractionTopicRecallIndex;
exports.scoreGroupSessionModelExtractionTopicRecall = scoreGroupSessionModelExtractionTopicRecall;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_distillation_receipts_part_01_1 = require("./typed-memory-distillation-receipts-part-01");
const typed_memory_distillation_receipts_part_04_1 = require("./typed-memory-distillation-receipts-part-04");
function distillGroupMessagesToTypedMemoryUnlocked(groupId, messages = [], memory = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return { schema: "ccm-group-typed-memory-distillation-v1", version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION, groupId, skipped: true, reason: "disabled" };
    }
    const updatedAt = (0, typed_memory_shared_1.now)();
    const workState = (0, typed_memory_distillation_receipts_part_04_1.buildGroupTypedMemoryDistillationWorkState)(groupId, messages, options);
    const { ledger, eligibleRows, previousCursorMessageId, cursorIndex, forceRescan, cursorMissing, pendingRows, selectedRows, existingAdmission, inflatedFactCount, inflatedAdmissionObservationCount, postCompactUsageArchive, } = workState;
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
        .map((message, index) => (0, typed_memory_index_build_1.normalizeGroupDirectMemoryRequest)(groupId, message, index))
        .filter(Boolean);
    const extractedCandidates = (0, typed_memory_distillation_receipts_part_01_1.extractGroupLogDistillationCandidates)(groupId, sourceMessages);
    const lifecycleRequests = (0, typed_memory_distillation_receipts_part_01_1.extractGroupLogPositiveFeedbackLifecycleRequests)(groupId, sourceMessages);
    const admissionResult = (0, typed_memory_distillation_receipts_part_01_1.applyGroupLogDistillationAdmission)(extractedCandidates);
    const candidates = admissionResult.admitted;
    const maintenanceRequired = existingAdmission.rejected.length > 0
        || workState.postCompactUsageArchiveChanged
        || inflatedFactCount > 0
        || inflatedAdmissionObservationCount > 0;
    if (!sourceMessages.length && !maintenanceRequired && !forceRescan) {
        return {
            schema: "ccm-group-typed-memory-distillation-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
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
    const admissionBase = (0, typed_memory_distillation_receipts_part_01_1.buildGroupLogDistillationAdmissionLedger)(ledger.admission, candidates, admissionResult.rejected, existingAdmission.rejected, updatedAt);
    let newFactCount = 0;
    let updatedFactCount = 0;
    for (const candidate of candidates) {
        const type = (0, typed_memory_shared_1.normalizeMemoryType)(candidate.category);
        const bucket = facts[type] || {};
        const previous = bucket[candidate.checksum];
        bucket[candidate.checksum] = {
            ...candidate,
            firstSeenAt: previous?.firstSeenAt || updatedAt,
            lastSeenAt: updatedAt,
            count: previous ? Math.max(1, Number(previous.count || 1)) : 1,
        };
        facts[type] = bucket;
        if (previous)
            updatedFactCount += 1;
        else
            newFactCount += 1;
    }
    const tombstoneFiltered = (0, typed_memory_index_build_1.filterFactsByDirectMemoryTombstones)(facts, ledger.directMemory);
    facts = tombstoneFiltered.facts;
    const directApplied = (0, typed_memory_index_build_1.applyGroupDirectMemoryRequests)(groupId, facts, directRequests, ledger.directMemory, updatedAt);
    facts = directApplied.facts;
    const directMemory = {
        ...directApplied.ledger,
        tombstoneSuppressedFactCountThisRun: tombstoneFiltered.suppressedCount,
    };
    const lifecycleApplied = (0, typed_memory_distillation_receipts_part_01_1.applyGroupPositiveFeedbackLifecycle)(groupId, facts, lifecycleRequests, ledger.positiveFeedbackLifecycle, { updatedAt, projectRoot: String(options.projectRoot || options.project_root || "") });
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
    const prunedFacts = (0, typed_memory_distillation_receipts_part_01_1.pruneDistilledFacts)(facts, Number(options.perTypeLimit || options.per_type_limit || typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT));
    const lastMessageId = cursorAudit.lastCommittedMessageId;
    const transaction = options.__distillationTransaction || null;
    if (transaction?.handle) {
        const renewed = (0, typed_memory_distillation_receipts_part_01_1.renewGroupTypedMemoryDistillationLock)(transaction.handle);
        if (!renewed.renewed)
            throw new Error(`typed_memory_distillation_lock_lost_before_document_commit:${renewed.reason}`);
    }
    const distillationTransaction = transaction?.handle ? {
        schema: "ccm-group-typed-memory-distillation-transaction-commit-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
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
    const writes = [];
    const removals = [];
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
        const bucket = Object.values(prunedFacts[spec.type] || {}).sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0));
        if (!bucket.length) {
            const staleFile = path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), `${(0, typed_memory_shared_1.safeSegment)(spec.slug)}.md`);
            if (fs.existsSync(staleFile)) {
                try {
                    const mutation = typed_memory_shared_1.activeGroupTypedMemoryDistillationMutations.get(groupId);
                    const removed = mutation?.handle
                        ? (0, typed_memory_shared_1.stageGroupTypedMemoryArtifactRemoval)(mutation, staleFile)
                        : (() => { fs.unlinkSync(staleFile); return true; })();
                    removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed, reason: "no_admitted_facts" });
                }
                catch (error) {
                    removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed: false, reason: "no_admitted_facts", error: (0, typed_memory_shared_1.compactText)(error?.message || error, 300) });
                }
            }
            continue;
        }
        writes.push((0, typed_memory_index_build_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: spec.type,
            slug: spec.slug,
            name: spec.name,
            description: spec.description,
            source: "auto:group-log-distillation",
            updatedAt,
            body: (0, typed_memory_distillation_receipts_part_01_1.renderDistilledMemoryBody)(spec.title, bucket, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    if (postCompactUsageArchive.archived_count > 0) {
        writes.push((0, typed_memory_index_build_1.upsertGroupTypedMemoryDocument)(groupId, {
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
    const index = (0, typed_memory_index_build_1.buildGroupTypedMemoryIndex)(groupId);
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
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
        ...(0, typed_memory_distillation_receipts_part_01_1.preservedGroupTypedMemoryDistillationArchives)(ledger),
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
    const quality = (0, typed_memory_distillation_receipts_part_04_1.evaluateGroupTypedMemoryDistillationQuality)(groupId, {
        projectRoot: options.projectRoot || options.project_root,
    });
    const persistedLedger = (0, typed_memory_distillation_receipts_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
    if (transaction?.handle) {
        const renewed = (0, typed_memory_distillation_receipts_part_01_1.renewGroupTypedMemoryDistillationLock)(transaction.handle);
        if (!renewed.renewed)
            throw new Error(`typed_memory_distillation_lock_lost_before_quality_commit:${renewed.reason}`);
        if (distillationTransaction)
            distillationTransaction.renewedAt = String(transaction.handle.lock?.renewedAt || distillationTransaction.renewedAt);
    }
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
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
        ...(0, typed_memory_distillation_receipts_part_01_1.preservedGroupTypedMemoryDistillationArchives)(persistedLedger, ledger),
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
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
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
function distillGroupMessagesToTypedMemory(groupId, messages = [], memory = {}, options = {}) {
    return require("./group-memory-distillation").distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
}
function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages = [], memory = {}, options = {}) {
    return require("./group-memory-distillation").distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages, memory, options);
}
function buildGroupSessionModelExtractionTopicRecallIndex(groupId) {
    const ledger = (0, typed_memory_distillation_receipts_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const archive = ledger.modelExtractionTypedMemoryArchive || null;
    const valid = !!archive
        && archive.schema === "ccm-group-session-model-extraction-typed-memory-archive-v1"
        && (0, typed_memory_distillation_receipts_part_01_1.modelExtractionTypedArchiveChecksum)(archive) === String(archive.checksum || "");
    const byRelPath = new Map();
    if (valid) {
        for (const topic of Object.values(archive.topics || {})) {
            if (topic?.status !== "active")
                continue;
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
function scoreGroupSessionModelExtractionTopicRecall(doc, topic, query, queryTokens) {
    if (!topic)
        return null;
    const queryProfile = (0, typed_memory_distillation_receipts_part_01_1.modelExtractionTopicConceptProfile)(query);
    const similarity = (0, typed_memory_distillation_receipts_part_01_1.modelExtractionTopicSimilarity)(queryProfile.concepts, topic.concepts || []);
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
    const semanticMatch = !unclassified && similarity >= typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY;
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
        matchedTokens: (0, typed_memory_shared_1.uniqueStrings)(matchedTokens, 24),
        semanticMatch,
        strongLexicalMatch,
        unclassified,
        meanAssignmentConfidence: Number(topic.meanAssignmentConfidence || 0),
        lowConfidenceFactCount: Number(topic.lowConfidenceFactCount || 0),
        eligible,
        adjustment,
    };
}
//# sourceMappingURL=typed-memory-distillation-receipts-part-05.js.map