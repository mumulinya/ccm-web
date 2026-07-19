"use strict";
// Behavior-freeze split from group-memory-distillation.ts (part 1/3).
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.getGroupTypedMemoryDistillationLedgerFile = getGroupTypedMemoryDistillationLedgerFile;
exports.getGroupTypedMemoryDistillationLockFile = getGroupTypedMemoryDistillationLockFile;
exports.getGroupTypedMemoryDistillationTransactionStateFile = getGroupTypedMemoryDistillationTransactionStateFile;
exports.inspectGroupTypedMemoryDistillationLock = inspectGroupTypedMemoryDistillationLock;
exports.readGroupTypedMemoryDistillationTransactionState = readGroupTypedMemoryDistillationTransactionState;
exports.runGroupTypedMemoryDistillationMutation = runGroupTypedMemoryDistillationMutation;
exports.readGroupTypedMemoryDistillationLedger = readGroupTypedMemoryDistillationLedger;
exports.distillGroupSessionModelExtractionToTypedMemory = distillGroupSessionModelExtractionToTypedMemory;
exports.providerReproofReceiptConsumptionArchive = providerReproofReceiptConsumptionArchive;
exports.distillProviderReproofReceiptConsumptionToTypedMemory = distillProviderReproofReceiptConsumptionToTypedMemory;
exports.providerRankingProvenanceCompactRepairReceiptConsumptionArchive = providerRankingProvenanceCompactRepairReceiptConsumptionArchive;
exports.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory;
exports.postCompactReinjectionRepairReceiptConsumptionArchive = postCompactReinjectionRepairReceiptConsumptionArchive;
exports.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory;
exports.distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory;
exports.postCompactCompletionMemoryPreservationRepairClosureArchive = postCompactCompletionMemoryPreservationRepairClosureArchive;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const group_memory_index_1 = require("./group-memory-index");
function getGroupTypedMemoryDistillationLedgerFile(groupId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER);
}
function getGroupTypedMemoryDistillationLockFile(groupId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_LOCK);
}
function getGroupTypedMemoryDistillationTransactionStateFile(groupId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE);
}
function inspectGroupTypedMemoryDistillationLock(groupId, options = {}) {
    const file = String(options.file || getGroupTypedMemoryDistillationLockFile(groupId));
    const lock = (0, group_memory_index_1.readJson)(file, null);
    const filePresent = fs.existsSync(file);
    if (!lock) {
        let ageMs = 0;
        try {
            ageMs = Math.max(0, Date.now() - fs.statSync(file).mtimeMs);
        }
        catch { }
        return filePresent
            ? { file, present: true, valid: false, checksumValid: false, identityValid: false, active: false, stale: false, corrupt: true, ageMs, lock: null }
            : { file, present: false, valid: true, active: false, stale: false, corrupt: false, ageMs: 0, lock: null };
    }
    const checksumValid = String(lock.lockChecksum || "") === (0, group_memory_index_1.groupTypedMemoryDistillationLockChecksum)(lock);
    const identityValid = lock.schema === "ccm-group-typed-memory-distillation-lock-v1"
        && Number(lock.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION
        && String(lock.groupId || "") === groupId
        && !!String(lock.leaseId || "")
        && Number(lock.fencingToken || 0) > 0;
    const ownerLocal = String(lock.ownerHostname || "") === os.hostname();
    const ownerAlive = !ownerLocal || (0, group_memory_index_1.typedMemoryDistillationProcessAlive)(Number(lock.ownerPid || 0));
    const expiresAtMs = Date.parse(String(lock.expiresAt || ""));
    const unexpired = Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs;
    const valid = checksumValid && identityValid;
    // A live local owner remains authoritative even if a long synchronous
    // distillation crosses its nominal TTL. Remote owners require an unexpired lease.
    const active = valid && lock.status === "active" && ownerAlive && (ownerLocal || unexpired);
    let ageMs = 0;
    try {
        ageMs = Math.max(0, Date.now() - fs.statSync(file).mtimeMs);
    }
    catch { }
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
function readGroupTypedMemoryDistillationTransactionState(groupId) {
    const file = getGroupTypedMemoryDistillationTransactionStateFile(groupId);
    const state = (0, group_memory_index_1.readJson)(file, null);
    const filePresent = fs.existsSync(file);
    if (!state)
        return filePresent
            ? { file, present: true, valid: false, checksumValid: false, identityValid: false, corrupt: true, state: null }
            : { file, present: false, valid: true, corrupt: false, state: null };
    const checksumValid = String(state.stateChecksum || "") === (0, group_memory_index_1.groupTypedMemoryDistillationStateChecksum)(state);
    const identityValid = state.schema === "ccm-group-typed-memory-distillation-transaction-state-v1"
        && Number(state.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION
        && String(state.groupId || "") === groupId;
    return { file, present: true, valid: checksumValid && identityValid, checksumValid, identityValid, state };
}
function runGroupTypedMemoryDistillationMutation(groupId, mutationKind, options, operation) {
    const existing = group_memory_index_1.activeGroupTypedMemoryDistillationMutations.get(groupId);
    if (existing?.handle) {
        existing.depth = Number(existing.depth || 1) + 1;
        existing.mutationKinds = [...new Set([...(existing.mutationKinds || []), mutationKind])];
        try {
            return operation(existing);
        }
        finally {
            existing.depth = Math.max(1, Number(existing.depth || 2) - 1);
        }
    }
    const acquired = (0, group_memory_index_1.acquireGroupTypedMemoryDistillationLock)(groupId, { ...(options || {}), mutationKind });
    if (!acquired.acquired) {
        const error = new Error(`typed_memory_distillation_mutation_unavailable:${acquired.reason || "lock_unavailable"}`);
        error.code = acquired.reason || "distillation_lock_unavailable";
        error.transaction = acquired;
        throw error;
    }
    const handle = acquired.handle;
    const context = {
        groupId,
        mutationKind,
        mutationKinds: [mutationKind],
        handle,
        options: options || {},
        pendingArtifacts: new Map(),
        depth: 1,
        writeCount: 0,
        startedAt: String(handle.lock?.acquiredAt || (0, group_memory_index_1.now)()),
    };
    group_memory_index_1.activeGroupTypedMemoryDistillationMutations.set(groupId, context);
    try {
        context.artifactRecovery = (0, group_memory_index_1.recoverGroupTypedMemoryArtifactTransaction)(groupId);
        const diagnosticHoldMs = Math.max(0, Math.min(10_000, Number(options?.__mutationDiagnosticHoldMs || 0)));
        if (diagnosticHoldMs > 0)
            (0, group_memory_index_1.typedMemoryDistillationWait)(diagnosticHoldMs);
        const value = operation(context);
        (0, group_memory_index_1.commitGroupTypedMemoryArtifactMutation)(context);
        const ownership = (0, group_memory_index_1.verifyGroupTypedMemoryDistillationLock)(handle);
        if (!ownership.owned)
            throw new Error(`typed_memory_distillation_lock_lost_after_mutation:${ownership.reason}`);
        const completedAt = (0, group_memory_index_1.now)();
        const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
        const committed = Number(context.writeCount || 0) > 0;
        (0, group_memory_index_1.writeGroupTypedMemoryDistillationTransactionState)(groupId, {
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
        if (!value || typeof value !== "object" || Array.isArray(value))
            return value;
        return {
            ...value,
            distillationMutation: {
                schema: "ccm-group-typed-memory-distillation-mutation-v1",
                version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
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
    }
    catch (error) {
        const failedAt = (0, group_memory_index_1.now)();
        const ownership = (0, group_memory_index_1.verifyGroupTypedMemoryDistillationLock)(handle);
        if (ownership.owned) {
            const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
            (0, group_memory_index_1.writeGroupTypedMemoryDistillationTransactionState)(groupId, {
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
                error: (0, group_memory_index_1.compactText)(error?.message || error, 800),
                updatedAt: failedAt,
            });
        }
        throw error;
    }
    finally {
        group_memory_index_1.activeGroupTypedMemoryDistillationMutations.delete(groupId);
        (0, group_memory_index_1.releaseGroupTypedMemoryDistillationLock)(handle, context.writeCount > 0 ? "completed" : "no_write");
    }
}
function readGroupTypedMemoryDistillationLedger(groupId) {
    const file = getGroupTypedMemoryDistillationLedgerFile(groupId);
    const state = (0, group_memory_index_1.readJson)(file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: {},
        updatedAt: "",
    });
    return { ...state, facts: state?.facts && typeof state.facts === "object" ? state.facts : {}, file };
}
function distillGroupSessionModelExtractionToTypedMemory(scopeId, input, options = {}) {
    const validated = (0, group_memory_index_1.validateModelExtractionTypedMemoryInput)(String(scopeId || "").trim(), input);
    return runGroupTypedMemoryDistillationMutation(scopeId, "model_extraction_typed_memory", options, () => {
        if (options.__modelExtractionTypedMemoryFailAfterSnapshot === true) {
            throw new Error("model_extraction_typed_memory_injected_failure");
        }
        const at = String(options.at || validated.receipt.completedAt || (0, group_memory_index_1.now)());
        const ledger = readGroupTypedMemoryDistillationLedger(scopeId);
        const previousArchive = ledger.modelExtractionTypedMemoryArchive || null;
        if (previousArchive?.schema
            && (previousArchive.schema !== "ccm-group-session-model-extraction-typed-memory-archive-v1"
                || (0, group_memory_index_1.modelExtractionTypedArchiveChecksum)(previousArchive) !== String(previousArchive.checksum || ""))) {
            throw new Error("model_extraction_typed_memory_archive_integrity_invalid");
        }
        const sourceById = new Map(validated.sourceRows.map((row) => [String(row?.id || ""), row]));
        const edges = Array.isArray(validated.graph.edges) ? validated.graph.edges : [];
        const edgeByNewChecksum = new Map(edges.map((edge) => [String(edge.newFactChecksum || ""), edge]));
        const facts = new Map(Object.entries(previousArchive?.facts || {}));
        const rejections = [];
        const admitted = [];
        let duplicateCount = 0;
        let supersededCount = 0;
        for (const edge of edges) {
            for (const [factId, fact] of facts.entries()) {
                if (fact.status !== "active")
                    continue;
                if (![fact.graphFactChecksum, fact.anchorChecksum, fact.sourceFactChecksum].includes(String(edge.oldFactChecksum || "")))
                    continue;
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
            const reject = (reason) => rejections.push({
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
            const edge = source === "explicit_replacement"
                ? edgeByNewChecksum.get(String(proposal.factChecksum || ""))
                : null;
            const sourceMessageId = String(proposal.sourceMessageId || edge?.sourceMessageId || "");
            const sourceRow = sourceById.get(sourceMessageId);
            const sourceContent = String(sourceRow?.content || "");
            const sourceChecksum = (0, group_memory_index_1.checksum)(sourceContent, 32);
            const expectedSourceChecksum = String(proposal.sourceMessageChecksum || edge?.sourceMessageChecksum || "");
            const text = (0, group_memory_index_1.compactText)(proposal.text || edge?.replacementText || "", 900);
            const comparableText = (0, group_memory_index_1.modelExtractionEvidenceComparable)(text);
            const sourceComparable = (0, group_memory_index_1.modelExtractionEvidenceComparable)(sourceContent);
            const markdownComparable = (0, group_memory_index_1.modelExtractionEvidenceComparable)(validated.markdown);
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
            const category = proposalType === "replacement" ? "feedback" : "user";
            const stableFactChecksum = (0, group_memory_index_1.checksum)([category, comparableText], 64);
            const existing = facts.get(stableFactChecksum);
            if (existing?.status === "active")
                duplicateCount += 1;
            const fact = {
                schema: "ccm-group-session-model-extraction-typed-memory-fact-v1",
                version: group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
                stableFactChecksum,
                graphFactChecksum: String(proposal.factChecksum || ""),
                anchorChecksum: (0, group_memory_index_1.checksum)(`constraint\0${text}`, 32),
                sourceFactChecksum: (0, group_memory_index_1.checksum)(text, 32),
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
            .sort((a, b) => Number(a[1].status === "active") - Number(b[1].status === "active")
            || String(a[1].lastCommittedAt || a[1].supersededAt || "").localeCompare(String(b[1].lastCommittedAt || b[1].supersededAt || "")))
            .slice(-500);
        const topicLifecycle = (0, group_memory_index_1.buildGroupSessionModelExtractionTypedMemoryTopics)(Object.fromEntries(boundedFacts), previousArchive?.topics || {}, { at, maxTopicsPerCategory: options.maxTopicsPerCategory || options.max_topics_per_category });
        boundedFacts = Object.entries(topicLifecycle.facts || {});
        const activeTopicRows = Object.values(topicLifecycle.topics || {})
            .filter((topic) => topic?.status === "active")
            .sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")) || String(a.name || "").localeCompare(String(b.name || "")));
        const topicDocumentSpecs = [];
        for (const topic of activeTopicRows) {
            const rows = (topic.factChecksums || [])
                .map((factChecksum) => topicLifecycle.facts?.[factChecksum])
                .filter((fact) => fact?.status === "active");
            const partCount = Math.max(1, Math.ceil(rows.length / group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE));
            topic.docSlugs = [];
            for (let part = 0; part < partCount; part += 1) {
                const partRows = rows.slice(part * group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE, (part + 1) * group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE);
                if (!partRows.length)
                    continue;
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
                .filter((row) => String(row?.executionId || "") !== execution.executionId), execution].slice(-200);
        const archiveCore = {
            schema: "ccm-group-session-model-extraction-typed-memory-archive-v1",
            version: group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
            scopeId,
            groupId: validated.groupId,
            groupSessionId: validated.groupSessionId,
            facts: Object.fromEntries(boundedFacts),
            topics: topicLifecycle.topics,
            executions,
            rejections: [...(Array.isArray(previousArchive?.rejections) ? previousArchive.rejections : []), ...rejections].slice(-500),
            activeFactCount: boundedFacts.filter(([, fact]) => fact.status === "active").length,
            supersededFactCount: boundedFacts.filter(([, fact]) => fact.status === "superseded").length,
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
        const archive = { ...archiveCore, checksum: (0, group_memory_index_1.modelExtractionTypedArchiveChecksum)(archiveCore) };
        const writes = [];
        const currentDocSlugs = new Set(topicDocumentSpecs.map(spec => spec.slug));
        for (const doc of (0, group_memory_index_1.scanGroupTypedMemoryDocumentsRaw)(scopeId)) {
            if (String(doc.source || "") !== "auto:model-extraction-evidence-admission" || currentDocSlugs.has(String(doc.relPath || "").replace(/\.md$/i, "")))
                continue;
            (0, group_memory_index_1.stageGroupTypedMemoryArtifactRemoval)(group_memory_index_1.activeGroupTypedMemoryDistillationMutations.get(scopeId), doc.file);
        }
        for (const spec of topicDocumentSpecs) {
            writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(scopeId, {
                type: spec.topic.category,
                slug: spec.slug,
                name: spec.name,
                description: spec.description,
                source: "auto:model-extraction-evidence-admission",
                updatedAt: at,
                body: (0, group_memory_index_1.renderModelExtractionTypedMemoryBody)(spec.name, spec.rows, at),
                maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
            }));
        }
        const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(scopeId);
        (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
            ...ledger,
            schema: "ccm-group-typed-memory-distillation-ledger-v1",
            version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: scopeId,
            modelExtractionTypedMemoryArchive: archive,
            updatedAt: at,
        });
        return {
            schema: "ccm-group-session-model-extraction-typed-memory-commit-v1",
            version: group_memory_index_1.GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
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
function providerReproofReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, group_memory_index_1.now)());
    const promoted = rows.filter((row) => row.category === "promoted");
    const caution = rows.filter((row) => row.category === "caution");
    return {
        schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        promoted_count: promoted.length,
        caution_count: caution.length,
        strong_receipt_claim_count: rows.filter((row) => row.status === "strong").length,
        used_count: rows.filter((row) => row.status === "used").length,
        verified_count: rows.filter((row) => row.status === "verified").length,
        ignored_count: rows.filter((row) => row.status === "ignored").length,
        blocked_count: rows.filter((row) => row.status === "blocked").length,
        rows,
        updatedAt,
    };
}
function distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.__distillationMutationCoordinator !== true)
        return runGroupTypedMemoryDistillationMutation(groupId, "provider_reproof_receipt_consumption", options, () => distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
            version: group_memory_index_1.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || (0, group_memory_index_1.now)());
    const scopeIdentity = (0, group_memory_index_1.typedMemorySessionScopeIdentity)(groupId, {
        groupId,
        sourceGroupId: options.sourceGroupId || options.source_group_id || "",
        groupSessionId: options.groupSessionId || options.group_session_id || "",
    });
    const sourceGroupId = scopeIdentity.rootGroupId || groupId;
    const groupSessionId = scopeIdentity.groupSessionId;
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = (0, group_memory_index_1.normalizeProviderReproofReceiptConsumptionRows)(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
    const previousArchive = ledger.providerReproofReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = (0, group_memory_index_1.mergeProviderReproofReceiptConsumptionRows)(previousRows, incomingRows, { ...options, updatedAt });
    const archive = { ...providerReproofReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
    const writes = [];
    const promotedRows = archive.rows.filter((row) => row.category === "promoted");
    const cautionRows = archive.rows.filter((row) => row.category === "caution");
    if (promotedRows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "provider-reproof-receipt-consumption-recall",
            name: "Provider re-proof receipt consumption recall",
            description: "Provider re-proof dispatch briefs that child Agents actually used, verified, or claimed strong after WorkerContextPacket injection.",
            source: "auto:provider-reproof-receipt-consumption-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderProviderReproofReceiptConsumptionBody)("Provider Re-proof Receipt Consumption Recall", promotedRows, { updatedAt, groupSessionId }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    if (cautionRows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "feedback",
            slug: "provider-reproof-receipt-consumption-cautions",
            name: "Provider re-proof receipt consumption cautions",
            description: "Provider re-proof dispatch briefs that child Agents ignored or blocked; keep them as cautionary memory, not promoted context.",
            source: "auto:provider-reproof-receipt-consumption-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderProviderReproofReceiptConsumptionBody)("Provider Re-proof Receipt Consumption Cautions", cautionRows, { updatedAt, groupSessionId }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        facts: ledger.facts || {},
        providerReproofReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        skipped: false,
        reason: (0, group_memory_index_1.compactText)(options.reason || "", 220),
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
function providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, group_memory_index_1.now)());
    const relPaths = (0, group_memory_index_1.uniqueStrings)(rows.flatMap((row) => row.typed_memory_rel_paths || []), 80);
    const rowIds = (0, group_memory_index_1.uniqueStrings)(rows.flatMap((row) => row.typed_memory_row_ids || []), 120);
    return {
        schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.status === "verified").length,
        preserved_count: rows.filter((row) => row.provider_ranking_provenance_preserved === true).length,
        receipt_count: (0, group_memory_index_1.uniqueStrings)(rows.map((row) => row.provider_switch_decision_receipt_id).filter(Boolean), 120).length,
        rel_path_count: relPaths.length,
        row_id_count: rowIds.length,
        typed_memory_rel_paths: relPaths,
        typed_memory_row_ids: rowIds,
        rows,
        updatedAt,
    };
}
function distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.__distillationMutationCoordinator !== true)
        return runGroupTypedMemoryDistillationMutation(groupId, "provider_ranking_provenance_compact_repair", options, () => distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
            version: group_memory_index_1.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || (0, group_memory_index_1.now)());
    const scopeIdentity = (0, group_memory_index_1.typedMemorySessionScopeIdentity)(groupId, {
        groupId,
        sourceGroupId: options.sourceGroupId || options.source_group_id || "",
        groupSessionId: options.groupSessionId || options.group_session_id || "",
    });
    const sourceGroupId = scopeIdentity.rootGroupId || groupId;
    const groupSessionId = scopeIdentity.groupSessionId;
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = (0, group_memory_index_1.normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows)(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
    const previousArchive = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = (0, group_memory_index_1.mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows)(previousRows, incomingRows, { ...options, updatedAt });
    const archive = { ...providerRankingProvenanceCompactRepairReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
    const writes = [];
    if (archive.rows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "provider-ranking-provenance-compact-repair-receipt-memory",
            name: "Provider ranking provenance compact repair receipt memory",
            description: "Verified child Agent receipts proving provider ranking provenance compact repair consumed typed MEMORY.md and provider switch receipt context.",
            source: "auto:provider-ranking-provenance-compact-repair-receipt-consumption-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody)(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        facts: ledger.facts || {},
        providerRankingProvenanceCompactRepairReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        skipped: false,
        reason: (0, group_memory_index_1.compactText)(options.reason || "", 220),
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
function postCompactReinjectionRepairReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, group_memory_index_1.now)());
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        restored_count: rows.filter((row) => row.category === "restored").length,
        caution_count: rows.filter((row) => row.category === "caution").length,
        used_count: rows.filter((row) => row.usage_state === "used").length,
        verified_count: rows.filter((row) => row.usage_state === "verified").length,
        ignored_count: rows.filter((row) => row.usage_state === "ignored").length,
        current_source_verified_count: rows.filter((row) => row.current_source_verified === true).length,
        task_session_count: (0, group_memory_index_1.uniqueStrings)(rows.map((row) => row.task_agent_session_id).filter(Boolean), 240).length,
        native_session_count: (0, group_memory_index_1.uniqueStrings)(rows.map((row) => row.native_session_id).filter(Boolean), 240).length,
        rows,
        updatedAt,
    };
}
function distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.__distillationMutationCoordinator !== true)
        return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_reinjection_repair", options, () => distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
            version: group_memory_index_1.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || (0, group_memory_index_1.now)());
    const scopeIdentity = (0, group_memory_index_1.typedMemorySessionScopeIdentity)(groupId, {
        groupId,
        sourceGroupId: options.sourceGroupId || options.source_group_id || "",
        groupSessionId: options.groupSessionId || options.group_session_id || "",
    });
    const sourceGroupId = scopeIdentity.rootGroupId || groupId;
    const groupSessionId = scopeIdentity.groupSessionId;
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = (0, group_memory_index_1.normalizePostCompactReinjectionRepairReceiptConsumptionRows)(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
    const previousArchive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = (0, group_memory_index_1.mergePostCompactReinjectionRepairReceiptConsumptionRows)(previousRows, incomingRows, { ...options, updatedAt });
    const archive = { ...postCompactReinjectionRepairReceiptConsumptionArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
    const writes = [];
    const restoredRows = archive.rows.filter((row) => row.category === "restored");
    const cautionRows = archive.rows.filter((row) => row.category === "caution");
    if (restoredRows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "post-compact-reinjection-repair-receipt-memory",
            name: "Post-compact reinjection repair receipt memory",
            description: "Verified exact gate/candidate repair completions bound to child Agent task and native sessions; historical recovery evidence requires current-source revalidation before reuse.",
            source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderPostCompactReinjectionRepairReceiptConsumptionBody)("Post-Compact Reinjection Repair Receipt Memory", restoredRows, { updatedAt, groupSessionId }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    if (cautionRows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "feedback",
            slug: "post-compact-reinjection-repair-receipt-cautions",
            name: "Post-compact reinjection repair receipt cautions",
            description: "Verified ignored post-compact reinjection candidates; retain the closure evidence without promoting the ignored candidate into future task context.",
            source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderPostCompactReinjectionRepairReceiptConsumptionBody)("Post-Compact Reinjection Repair Receipt Cautions", cautionRows, { updatedAt, groupSessionId }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        facts: ledger.facts || {},
        postCompactReinjectionRepairReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
        version: group_memory_index_1.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        skipped: false,
        reason: (0, group_memory_index_1.compactText)(options.reason || "", 220),
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
function distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.__distillationMutationCoordinator !== true)
        return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_receipt_memory_usage_repair", options, () => distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
            version: group_memory_index_1.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || (0, group_memory_index_1.now)());
    const scopeIdentity = (0, group_memory_index_1.typedMemorySessionScopeIdentity)(groupId, {
        groupId,
        sourceGroupId: options.sourceGroupId || options.source_group_id || "",
        groupSessionId: options.groupSessionId || options.group_session_id || "",
    });
    const sourceGroupId = scopeIdentity.rootGroupId || groupId;
    const groupSessionId = scopeIdentity.groupSessionId;
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = (0, group_memory_index_1.normalizePostCompactReceiptMemoryUsageRepairCompletionRows)(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
    const previousArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = (0, group_memory_index_1.mergePostCompactReceiptMemoryUsageRepairCompletionRows)(previousRows, incomingRows, { ...options, updatedAt });
    const archive = { ...(0, group_memory_index_1.postCompactReceiptMemoryUsageRepairCompletionArchive)(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
    const writes = [];
    if (archive.rows.length) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "post-compact-receipt-memory-usage-repair-completions",
            name: "Post-compact receipt memory usage repair completions",
            description: "Verified corrected-receipt completions from new repair sessions, with per-document usage evidence and mandatory future current-source reverification.",
            source: "auto:post-compact-receipt-memory-usage-repair-completion-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderPostCompactReceiptMemoryUsageRepairCompletionBody)(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        facts: ledger.facts || {},
        postCompactReceiptMemoryUsageRepairCompletionArchive: archive,
        updatedAt,
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
        version: group_memory_index_1.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
        groupId,
        sourceGroupId,
        groupSessionId,
        skipped: false,
        reason: (0, group_memory_index_1.compactText)(options.reason || "", 220),
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
function postCompactCompletionMemoryPreservationRepairClosureArchive(rows = [], options = {}) {
    return {
        schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
        version: group_memory_index_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.exact_identity_restored && row.current_session_boundary_restored).length,
        failed_outcome_count: (0, group_memory_index_1.uniqueStrings)(rows.map((row) => row.failed_outcome_id), 480).length,
        corrected_outcome_count: (0, group_memory_index_1.uniqueStrings)(rows.map((row) => row.corrected_outcome_id), 480).length,
        completion_doc_count: (0, group_memory_index_1.uniqueStrings)(rows.flatMap((row) => row.completion_doc_rel_paths || []), 240).length,
        completion_work_item_count: (0, group_memory_index_1.uniqueStrings)(rows.flatMap((row) => row.completion_work_item_ids || []), 480).length,
        timeline_binding_count: (0, group_memory_index_1.uniqueStrings)(rows.flatMap((row) => row.completion_timeline_binding_ids || []), 480).length,
        rows,
        updatedAt: String(options.updatedAt || (0, group_memory_index_1.now)()),
    };
}
//# sourceMappingURL=group-memory-distillation-part-01.js.map