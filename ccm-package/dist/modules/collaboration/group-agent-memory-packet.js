"use strict";
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
exports.verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext = verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext;
exports.upsertAgentMemory = upsertAgentMemory;
exports.buildChildTypedMemoryRecallLedgerScope = buildChildTypedMemoryRecallLedgerScope;
exports.boundedTypedMemoryDeliveryInteger = boundedTypedMemoryDeliveryInteger;
exports.typedMemoryDeliveryLineCount = typedMemoryDeliveryLineCount;
exports.truncateTypedMemoryDeliveryContent = truncateTypedMemoryDeliveryContent;
exports.buildChildTypedMemoryDeliveryCapsule = buildChildTypedMemoryDeliveryCapsule;
exports.admitChildPostTurnSummaryDelivery = admitChildPostTurnSummaryDelivery;
exports.admitChildTypedMemoryDelivery = admitChildTypedMemoryDelivery;
exports.commitChildTypedMemoryDelivery = commitChildTypedMemoryDelivery;
exports.createChildTypedMemoryDispatchWal = createChildTypedMemoryDispatchWal;
exports.markChildTypedMemoryDispatchStarted = markChildTypedMemoryDispatchStarted;
exports.markChildTypedMemoryRunnerReturned = markChildTypedMemoryRunnerReturned;
exports.markChildTypedMemoryDispatchCommitted = markChildTypedMemoryDispatchCommitted;
exports.recoverDeliveryReceiptFromRunnerWal = recoverDeliveryReceiptFromRunnerWal;
exports.recoverChildTypedMemoryDispatchWal = recoverChildTypedMemoryDispatchWal;
exports.buildAgentMemoryPacket = buildAgentMemoryPacket;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const context_budget_1 = require("../../system/context-budget");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const storage_1 = require("./storage");
const direct_dispatch_spool_1 = require("../../agents/direct-dispatch-spool");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const typed_memory_dispatch_wal_1 = require("./typed-memory-dispatch-wal");
const group_post_turn_summary_1 = require("./group-post-turn-summary");
const group_memory_context_1 = require("./group-memory-context");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
function verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext(evidence) {
    if (!evidence?.checksum || evidence.schema !== "ccm-group-session-memory-model-extraction-delivery-evidence-v1")
        return false;
    const payload = { ...evidence };
    delete payload.checksum;
    return (0, group_memory_shared_1.hashSessionMemoryText)(JSON.stringify(payload), 64) === String(evidence.checksum || "");
}
function upsertAgentMemory(agentMemories = {}, item = {}) {
    const normalized = (0, group_memory_shared_1.normalizeWorkerLedgerItem)(item);
    const project = (0, group_memory_shared_1.normalizeAgentMemoryProject)(normalized.project);
    if (!project || project === "unknown")
        return agentMemories || {};
    const current = { ...(0, group_memory_shared_1.createEmptyAgentMemory)(project), ...((agentMemories || {})[project] || {}) };
    const entry = {
        time: normalized.time,
        taskId: normalized.taskId,
        status: normalized.status,
        receiptStatus: normalized.receiptStatus,
        summary: (0, group_memory_shared_1.compactMemoryText)(normalized.summary, 420),
        filesChanged: normalized.filesChanged || [],
        verification: normalized.verification || [],
        blockers: normalized.blockers || [],
        needs: normalized.needs || [],
    };
    const allReceipts = (0, group_memory_shared_1.uniqueByKey)([...(current.recentReceipts || []), entry], (x) => [x.taskId || "", x.status || "", x.receiptStatus || "", x.summary || ""].join("|"), 20);
    const older = allReceipts.slice(0, Math.max(0, allReceipts.length - 8));
    const recentReceipts = allReceipts.slice(-8);
    const summaryParts = [current.summary || "", ...older.map((x) => (0, group_memory_shared_1.formatAgentMemoryReceipt)(x))].filter(Boolean);
    const files = Array.from(new Set([...(current.frequentFiles || []), ...(entry.filesChanged || [])].filter(Boolean))).slice(-20);
    const verification = Array.from(new Set([...(current.verificationHints || []), ...(entry.verification || [])].filter(Boolean))).slice(-20);
    const blockers = Array.from(new Set([...(current.blockers || []), ...(entry.blockers || [])].filter(Boolean))).slice(-20);
    const needs = Array.from(new Set([...(current.needs || []), ...(entry.needs || [])].filter(Boolean))).slice(-20);
    const totalReceipts = Math.max(Number(current.stats?.totalReceipts || 0) + 1, recentReceipts.length + Number(current.stats?.compressedReceipts || 0));
    return {
        ...(agentMemories || {}),
        [project]: {
            project,
            summary: (0, group_memory_shared_1.compactMemoryText)(summaryParts.join(" | "), 1800),
            recentReceipts,
            frequentFiles: files,
            verificationHints: verification,
            blockers,
            needs,
            stats: {
                totalReceipts,
                compressedReceipts: Math.max(0, totalReceipts - recentReceipts.length),
                recentReceipts: recentReceipts.length,
                lastUpdatedAt: new Date().toISOString(),
            },
        },
    };
}
function buildChildTypedMemoryRecallLedgerScope(targetProject, sessionBinding = {}, memory = {}, options = {}) {
    const project = (0, group_memory_shared_1.normalizeAgentMemoryProject)(targetProject);
    const taskAgentSessionId = String(sessionBinding?.task_agent_session_id
        || sessionBinding?.taskAgentSessionId
        || options.taskAgentSessionId
        || options.task_agent_session_id
        || "").trim();
    const taskId = String(sessionBinding?.task_id
        || sessionBinding?.taskId
        || options.taskId
        || options.task_id
        || "").trim();
    const compactTransactionReceipt = memory?.compaction?.compactTransactionReceipt
        || memory?.compactBoundary?.compactTransactionReceipt
        || memory?.compactBoundary?.post_compact_restore?.compactTransactionReceipt
        || null;
    const rawCompactEpoch = String(options.typedMemoryRecallEpoch
        || options.typed_memory_recall_epoch
        || compactTransactionReceipt?.compact_epoch
        || memory?.compactBoundary?.id
        || memory?.compactBoundary?.boundary_id
        || memory?.compactBoundary?.boundaryId
        || memory?.compaction?.summaryChecksum
        || memory?.compaction?.summary_checksum
        || memory?.messageCompression?.summaryChecksum
        || memory?.messageCompression?.summary_checksum
        || "precompact").trim() || "precompact";
    const compactEpoch = rawCompactEpoch === "precompact" || rawCompactEpoch.startsWith("cmp_")
        ? rawCompactEpoch
        : (0, group_memory_compaction_1.buildGroupCompactEpoch)(rawCompactEpoch);
    const scopeKind = taskAgentSessionId ? "task_agent_session" : taskId ? "task" : "project_preview";
    const identity = taskAgentSessionId || taskId || "preview";
    const explicitScope = String(options.typedMemoryRecallScope || options.typed_memory_recall_scope || "").trim();
    return {
        schema: "ccm-child-typed-memory-recall-ledger-scope-v1",
        version: 1,
        scope: explicitScope || `child-agent:${project}:${identity}:${compactEpoch}`,
        scopeKind,
        targetProject: project,
        taskId,
        taskAgentSessionId,
        compactEpoch,
        sessionBound: !!taskAgentSessionId,
        dedupeBoundary: "same_task_agent_session_and_compact_epoch_and_document_checksum",
        crossTaskSessionRecallRequired: true,
        postCompactRecallRequired: true,
        changedDocumentRecallRequired: true,
    };
}
function boundedTypedMemoryDeliveryInteger(value, fallback, min, max) {
    const parsed = Number(value);
    return Math.min(max, Math.max(min, Math.floor(Number.isFinite(parsed) ? parsed : fallback)));
}
function typedMemoryDeliveryLineCount(value) {
    const text = String(value || "");
    return text ? text.split("\n").length : 0;
}
function truncateTypedMemoryDeliveryContent(source, limits) {
    const normalized = String(source || "").replace(/\r/g, "").trim();
    const sourceLines = typedMemoryDeliveryLineCount(normalized);
    const lineBounded = normalized.split("\n").slice(0, Math.max(0, limits.maxLines)).join("\n");
    const reasons = [];
    if (sourceLines > limits.maxLines)
        reasons.push("line_limit");
    const points = Array.from(lineBounded);
    let low = 0;
    let high = points.length;
    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        const candidate = points.slice(0, mid).join("");
        if (Buffer.byteLength(candidate, "utf8") <= limits.maxBytes && (0, context_budget_1.estimateTextTokens)(candidate) <= limits.maxTokens)
            low = mid;
        else
            high = mid - 1;
    }
    const content = points.slice(0, low).join("").trimEnd();
    if (Buffer.byteLength(lineBounded, "utf8") > limits.maxBytes)
        reasons.push("byte_limit");
    if ((0, context_budget_1.estimateTextTokens)(lineBounded) > limits.maxTokens)
        reasons.push("token_limit");
    return {
        content,
        sourceChars: normalized.length,
        sourceBytes: Buffer.byteLength(normalized, "utf8"),
        sourceLines,
        sourceTokens: (0, context_budget_1.estimateTextTokens)(normalized),
        deliveredChars: content.length,
        deliveredBytes: Buffer.byteLength(content, "utf8"),
        deliveredLines: typedMemoryDeliveryLineCount(content),
        deliveredTokens: content ? (0, context_budget_1.estimateTextTokens)(content) : 0,
        truncationReasons: [...new Set(reasons)],
    };
}
function buildChildTypedMemoryDeliveryCapsule(input = {}, options = {}) {
    const recall = input.recall || input.typedMemoryRecall || input.typed_memory_recall || {};
    const allDocs = Array.isArray(recall.recalled) ? recall.recalled : [];
    const maxDocuments = boundedTypedMemoryDeliveryInteger(options.maxDocuments ?? options.max_documents, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS, 1, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS);
    const maxBytesPerDocument = boundedTypedMemoryDeliveryInteger(options.maxBytesPerDocument ?? options.max_bytes_per_document, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT, 512, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT);
    const maxLinesPerDocument = boundedTypedMemoryDeliveryInteger(options.maxLinesPerDocument ?? options.max_lines_per_document, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT, 10, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT);
    const maxSessionBytes = boundedTypedMemoryDeliveryInteger(options.maxSessionBytes ?? options.max_session_bytes, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES, 4096, group_memory_shared_1.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES);
    const configuredMaxTokens = boundedTypedMemoryDeliveryInteger(options.maxTokens ?? options.max_tokens, 5000, 500, 20_000);
    const requestedModelContextWindow = Number(options.modelContextWindow ?? options.model_context_window ?? 0);
    const modelContextWindow = boundedTypedMemoryDeliveryInteger(requestedModelContextWindow > 0 ? requestedModelContextWindow : 200_000, 200_000, 32_000, 4_000_000);
    const effectiveMaxTokens = Math.min(configuredMaxTokens, Math.max(1000, Math.floor(modelContextWindow * 0.02)));
    const sessionDeliveredBytesBefore = Math.max(0, Math.floor(Number(options.sessionDeliveredBytes ?? options.session_delivered_bytes ?? 0) || 0));
    const sessionRemainingBytesBefore = Math.max(0, maxSessionBytes - sessionDeliveredBytesBefore);
    const turnMaxBytes = Math.min(maxDocuments * maxBytesPerDocument, sessionRemainingBytesBefore);
    const docs = allDocs.slice(0, maxDocuments);
    const rows = [];
    const skippedRows = allDocs.slice(maxDocuments).map((doc) => ({
        rel_path: String(doc.relPath || doc.rel_path || ""),
        reason: "document_limit",
    }));
    let deliveredChars = 0;
    let deliveredBytes = 0;
    let deliveredLines = 0;
    let deliveredTokens = 0;
    for (const doc of docs) {
        const remainingBytes = turnMaxBytes - deliveredBytes;
        const remainingTokens = effectiveMaxTokens - deliveredTokens;
        const relPath = String(doc.relPath || doc.rel_path || "");
        if (remainingBytes <= 0 || remainingTokens <= 0) {
            skippedRows.push({ rel_path: relPath, reason: remainingBytes <= 0 ? "session_or_turn_byte_budget_exhausted" : "turn_token_budget_exhausted" });
            continue;
        }
        const sourceContent = String(doc.snippet || doc.description || doc.body || "").trim();
        const rowByteLimit = Math.min(maxBytesPerDocument, remainingBytes);
        const truncated = truncateTypedMemoryDeliveryContent(sourceContent, {
            maxLines: maxLinesPerDocument,
            maxBytes: rowByteLimit,
            maxTokens: remainingTokens,
        });
        if (rowByteLimit < maxBytesPerDocument && truncated.sourceBytes > rowByteLimit) {
            truncated.truncationReasons.push("session_byte_limit");
        }
        const content = truncated.content;
        const row = {
            rel_path: relPath,
            document_checksum: String(doc.checksum || doc.document_checksum || ""),
            type: String(doc.type || "project"),
            name: String(doc.name || ""),
            description: (0, group_memory_shared_1.compactMemoryText)(doc.description || "", 260),
            score: Number(doc.score || 0),
            stale: doc.freshness?.stale === true,
            content,
            content_checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 32),
            source_chars: truncated.sourceChars,
            source_bytes: truncated.sourceBytes,
            source_lines: truncated.sourceLines,
            source_tokens: truncated.sourceTokens,
            delivered_chars: truncated.deliveredChars,
            delivered_bytes: truncated.deliveredBytes,
            delivered_lines: truncated.deliveredLines,
            delivered_tokens: truncated.deliveredTokens,
            truncated: truncated.sourceChars !== truncated.deliveredChars,
            truncation_reasons: [...new Set(truncated.truncationReasons)],
        };
        if (!row.rel_path || !row.document_checksum || !row.content) {
            skippedRows.push({ rel_path: row.rel_path, reason: !row.content ? "empty_after_budget" : "missing_document_identity" });
            continue;
        }
        rows.push(row);
        deliveredChars += content.length;
        deliveredBytes += row.delivered_bytes;
        deliveredLines += row.delivered_lines;
        deliveredTokens += row.delivered_tokens;
    }
    const ledgerScope = input.ledgerScope || input.ledger_scope || {};
    const requiredRelPaths = rows.map(row => row.rel_path);
    const budget = {
        schema: "ccm-child-typed-memory-delivery-budget-v1",
        max_documents: maxDocuments,
        max_bytes_per_document: maxBytesPerDocument,
        max_lines_per_document: maxLinesPerDocument,
        max_session_bytes: maxSessionBytes,
        configured_max_tokens: configuredMaxTokens,
        model_context_window: modelContextWindow,
        model_window_ratio: 0.02,
        effective_max_tokens: effectiveMaxTokens,
        session_delivered_bytes_before: sessionDeliveredBytesBefore,
        session_remaining_bytes_before: sessionRemainingBytesBefore,
        turn_max_bytes: turnMaxBytes,
        token_budget_formula: "min(configured_max_tokens,max(1000,floor(model_context_window*0.02)))",
    };
    const capsule = {
        schema: "ccm-child-typed-memory-delivery-capsule-v1",
        version: 2,
        group_id: String(input.groupId || input.group_id || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || ""),
        target_project: (0, group_memory_shared_1.normalizeAgentMemoryProject)(input.targetProject || input.target_project || "unknown"),
        task_id: String(input.taskId || input.task_id || ledgerScope.taskId || ledgerScope.task_id || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || ledgerScope.taskAgentSessionId || ledgerScope.task_agent_session_id || ""),
        recall_scope: String(ledgerScope.scope || input.recallScope || input.recall_scope || ""),
        compact_epoch: String(ledgerScope.compactEpoch || ledgerScope.compact_epoch || input.compactEpoch || input.compact_epoch || "precompact"),
        budget,
        max_documents: maxDocuments,
        max_bytes_per_document: maxBytesPerDocument,
        max_lines_per_document: maxLinesPerDocument,
        max_session_bytes: maxSessionBytes,
        configured_max_tokens: configuredMaxTokens,
        model_context_window: modelContextWindow,
        effective_max_tokens: effectiveMaxTokens,
        candidate_count: allDocs.length,
        considered_count: docs.length,
        delivered_count: rows.length,
        delivered_chars: deliveredChars,
        delivered_bytes: deliveredBytes,
        delivered_lines: deliveredLines,
        delivered_tokens: deliveredTokens,
        session_delivered_bytes_before: sessionDeliveredBytesBefore,
        session_delivered_bytes_after: sessionDeliveredBytesBefore + deliveredBytes,
        session_remaining_bytes_after: Math.max(0, maxSessionBytes - sessionDeliveredBytesBefore - deliveredBytes),
        required_rel_paths: requiredRelPaths,
        delivered_rel_paths: requiredRelPaths,
        skipped_rel_paths: skippedRows.map(row => row.rel_path).filter(Boolean),
        skipped_rows: skippedRows,
        truncated_count: rows.filter(row => row.truncated).length,
        budget_exhausted: sessionRemainingBytesBefore <= 0 || deliveredBytes >= turnMaxBytes || deliveredTokens >= effectiveMaxTokens,
        delivery_complete: rows.length === requiredRelPaths.length && rows.every(row => row.document_checksum && row.content_checksum),
        current_source_verification_required: rows.length > 0,
        rows,
    };
    capsule.capsule_checksum = crypto.createHash("sha256").update(JSON.stringify([
        capsule.version,
        capsule.group_id,
        capsule.group_session_id,
        capsule.target_project,
        capsule.task_id,
        capsule.task_agent_session_id,
        capsule.recall_scope,
        capsule.compact_epoch,
        capsule.budget,
        capsule.candidate_count,
        capsule.considered_count,
        capsule.delivered_count,
        capsule.delivered_chars,
        capsule.delivered_bytes,
        capsule.delivered_lines,
        capsule.delivered_tokens,
        capsule.session_delivered_bytes_after,
        capsule.required_rel_paths,
        capsule.delivered_rel_paths,
        capsule.skipped_rel_paths,
        capsule.skipped_rows,
        capsule.truncated_count,
        capsule.budget_exhausted,
        rows.map(row => [
            row.rel_path,
            row.document_checksum,
            row.content_checksum,
            row.content,
            row.source_chars,
            row.source_bytes,
            row.source_lines,
            row.source_tokens,
            row.delivered_chars,
            row.delivered_bytes,
            row.delivered_lines,
            row.delivered_tokens,
            row.truncated,
            row.truncation_reasons,
        ]),
    ])).digest("hex").slice(0, 32);
    return capsule;
}
function admitChildPostTurnSummaryDelivery(memoryBundle, options = {}) {
    const workerContextPacket = options.workerContextPacket || options.worker_context_packet || null;
    const renderedPrompt = String(options.renderedPrompt || options.rendered_prompt || "");
    if (!memoryBundle)
        return { admitted: true, required: false, reason: "no_group_memory_context" };
    if (!workerContextPacket || !renderedPrompt)
        return { admitted: false, required: false, reason: "worker_packet_or_prompt_missing" };
    const packetMemory = workerContextPacket.memory || memoryBundle;
    const capsuleInput = workerContextPacket.post_turn_summary_delivery_capsule
        || workerContextPacket.postTurnSummaryDeliveryCapsule
        || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(packetMemory)
        || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(memoryBundle);
    if (!capsuleInput?.schema)
        return { admitted: true, required: false, reason: "no_post_turn_summary_attachment" };
    const groupMemory = packetMemory?.group_memory || packetMemory?.groupMemory || packetMemory || memoryBundle;
    const sessionBinding = groupMemory?.session_binding || groupMemory?.sessionBinding || {};
    const expectedAttemptSequence = Math.max(0, Math.floor(Number(options.attemptSequence || options.attempt_sequence || 0) || 0));
    const expectedBinding = {
        group_id: String(workerContextPacket.group?.id || workerContextPacket.group_id || groupMemory.group_id || ""),
        group_session_id: String(workerContextPacket.group_session_id || groupMemory.group_session_id || ""),
        task_id: String(workerContextPacket.task_id || sessionBinding.task_id || ""),
        target_project: String(workerContextPacket.project || groupMemory.target_project || ""),
        task_agent_session_id: String(workerContextPacket.task_agent_session_id || sessionBinding.task_agent_session_id || ""),
        native_session_id: String(sessionBinding.native_session_id || ""),
        execution_id: String(sessionBinding.execution_id || ""),
        ...(expectedAttemptSequence > 0 ? { attempt_sequence: expectedAttemptSequence, invocation_kind: expectedAttemptSequence > 1 ? "resume" : "spawn" } : {}),
        ...(workerContextPacket.task_agent_invocation_lineage?.invocation_edge_id ? {
            invocation_edge_id: workerContextPacket.task_agent_invocation_lineage.invocation_edge_id,
            parent_invocation_edge_id: workerContextPacket.task_agent_invocation_lineage.parent_invocation_edge_id || "",
            root_invocation_edge_id: workerContextPacket.task_agent_invocation_lineage.root_invocation_edge_id || "",
            branch_id: workerContextPacket.task_agent_invocation_lineage.branch_id || "",
            parent_branch_id: workerContextPacket.task_agent_invocation_lineage.parent_branch_id || "",
            branch_kind: workerContextPacket.task_agent_invocation_lineage.branch_kind || "main",
            expected_lineage_head_checksum: workerContextPacket.task_agent_invocation_lineage.expected_lineage_head_checksum || "",
        } : {}),
    };
    const groupId = expectedBinding.group_id;
    const groupSessionId = expectedBinding.group_session_id;
    if (options.skipGroupSessionPresenceCheck !== true && options.skip_group_session_presence_check !== true) {
        const sessionManifest = (0, storage_1.listGroupChatSessions)(groupId);
        const sessionExists = (sessionManifest.sessions || []).some((session) => String(session.id || "") === groupSessionId);
        if (!sessionExists || groupSessionId === "default") {
            return { admitted: false, required: true, reason: groupSessionId === "default" ? "legacy_group_session_not_dispatchable" : "group_session_deleted_before_dispatch" };
        }
    }
    const currentMemory = (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId);
    const currentScope = buildChildTypedMemoryRecallLedgerScope(expectedBinding.target_project, {
        task_id: expectedBinding.task_id,
        task_agent_session_id: expectedBinding.task_agent_session_id,
    }, currentMemory, {});
    expectedBinding.compact_epoch = currentScope.compactEpoch;
    const ledger = (0, group_post_turn_summary_1.readGroupPostTurnSummaries)(groupId, groupSessionId, { limit: 10_000 });
    const capsule = (0, group_post_turn_summary_1.validateGroupPostTurnSummaryDeliveryCapsule)(capsuleInput, {
        expectedBinding,
        ledger,
        requireCurrentHead: true,
        renderedPrompt,
    });
    if (capsule?.trusted_for_delivery !== true) {
        const issues = capsule?.validation_issues || [];
        const reason = issues.includes("compact_epoch_mismatch")
            ? "post_turn_summary_compact_epoch_changed_before_dispatch"
            : issues.includes("ledger_head_changed")
                ? "post_turn_summary_ledger_changed_before_dispatch"
                : issues.includes("prompt_missing_capsule_checksum")
                    ? "prompt_missing_post_turn_summary_capsule_checksum"
                    : "post_turn_summary_delivery_capsule_not_trusted";
        return { admitted: false, required: true, reason, validation_issues: issues, capsule };
    }
    return { admitted: true, required: true, reason: "post_turn_summary_delivery_admitted", capsule };
}
function admitChildTypedMemoryDelivery(memoryBundle, options = {}) {
    const workerContextPacket = options.workerContextPacket || options.worker_context_packet || null;
    const renderedPrompt = String(options.renderedPrompt || options.rendered_prompt || "");
    if (!memoryBundle)
        return { admitted: true, required: false, reason: "no_group_memory_context" };
    if (!workerContextPacket || !renderedPrompt)
        return { admitted: false, required: false, reason: "worker_packet_or_prompt_missing" };
    const packetMemory = workerContextPacket.memory || memoryBundle;
    const postTurnSummaryAdmission = admitChildPostTurnSummaryDelivery(memoryBundle, options);
    if (postTurnSummaryAdmission.admitted !== true)
        return postTurnSummaryAdmission;
    const packetCapsuleInput = workerContextPacket.typed_memory_delivery_capsule
        || workerContextPacket.typedMemoryDeliveryCapsule
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-child-typed-memory-delivery-capsule-v1");
    const leaseInput = (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-child-typed-memory-delivery-lease-v1")
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(memoryBundle, "ccm-child-typed-memory-delivery-lease-v1");
    if (!packetCapsuleInput?.schema && !leaseInput?.schema)
        return postTurnSummaryAdmission.required
            ? { ...postTurnSummaryAdmission, reason: "post_turn_summary_delivery_admitted_without_typed_memory" }
            : { admitted: true, required: false, reason: "no_typed_memory_attachment" };
    if (!packetCapsuleInput?.schema || !leaseInput?.schema)
        return { admitted: false, required: true, reason: "capsule_or_lease_missing" };
    const expectedBinding = workerContextPacket.typed_memory_delivery_expected_binding
        || workerContextPacket.typedMemoryDeliveryExpectedBinding
        || (0, runtime_kernel_1.buildWorkerTypedMemoryDeliveryExpectedBinding)(workerContextPacket, packetMemory);
    const packetCapsule = (0, runtime_kernel_1.validateWorkerTypedMemoryDeliveryCapsule)(packetCapsuleInput, { expectedBinding });
    if (packetCapsule?.trusted_for_delivery !== true) {
        return { admitted: false, required: true, reason: "delivery_capsule_not_trusted", validation_issues: packetCapsule?.validation_issues || [] };
    }
    const lease = (0, runtime_kernel_1.validateWorkerTypedMemoryDeliveryLease)(leaseInput, { capsule: packetCapsule });
    if (lease?.valid_for_commit !== true) {
        return { admitted: false, required: true, reason: "delivery_lease_invalid", validation_issues: lease?.validation_issues || [] };
    }
    if (!renderedPrompt.includes(String(packetCapsule.capsule_checksum || ""))) {
        return { admitted: false, required: true, reason: "prompt_missing_capsule_checksum" };
    }
    const expectedAttemptSequence = Math.max(0, Math.floor(Number(options.attemptSequence || options.attempt_sequence || 0) || 0));
    if (expectedAttemptSequence > 0 && Number(lease.attempt_sequence || 0) !== expectedAttemptSequence) {
        return { admitted: false, required: true, reason: "task_agent_turn_changed", expectedAttemptSequence, leaseAttemptSequence: Number(lease.attempt_sequence || 0) };
    }
    const groupId = String(lease.group_id || "");
    const groupSessionId = String(lease.group_session_id || "");
    const targetProject = (0, group_memory_shared_1.normalizeAgentMemoryProject)(lease.target_project || "unknown");
    if (options.skipGroupSessionPresenceCheck !== true && options.skip_group_session_presence_check !== true) {
        const sessionManifest = (0, storage_1.listGroupChatSessions)(groupId);
        const sessionExists = (sessionManifest.sessions || []).some((session) => String(session.id || "") === groupSessionId);
        if (!sessionExists || groupSessionId === "default") {
            return { admitted: false, required: true, reason: groupSessionId === "default" ? "legacy_group_session_not_dispatchable" : "group_session_deleted_before_dispatch" };
        }
    }
    const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const currentMemory = (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId);
    const currentScope = buildChildTypedMemoryRecallLedgerScope(targetProject, {
        task_id: String(lease.task_id || ""),
        task_agent_session_id: String(lease.task_agent_session_id || ""),
    }, currentMemory, {});
    if (String(currentScope.compactEpoch || "precompact") !== String(lease.compact_epoch || "precompact")) {
        return {
            admitted: false,
            required: true,
            reason: "compact_epoch_changed_before_dispatch",
            leaseCompactEpoch: String(lease.compact_epoch || "precompact"),
            currentCompactEpoch: String(currentScope.compactEpoch || "precompact"),
        };
    }
    const ledger = (0, group_memory_index_1.readGroupTypedMemoryRecallLedger)(typedMemoryScopeId);
    const scoped = ledger.scopes?.[String(lease.recall_scope || "")] || {};
    const existingCommit = scoped.deliveryLeases?.[String(lease.lease_id || "")] || null;
    const stats = (0, group_memory_index_1.getGroupTypedMemoryRecallScopeStats)(typedMemoryScopeId, String(lease.recall_scope || ""));
    const expectedDeliveredBytesBefore = Number(packetCapsule.budget?.session_delivered_bytes_before || packetCapsule.session_delivered_bytes_before || 0);
    if (existingCommit?.status !== "committed" && stats.deliveredBytes !== expectedDeliveredBytesBefore) {
        return {
            admitted: false,
            required: true,
            reason: "surfaced_budget_changed_before_dispatch",
            expectedDeliveredBytesBefore,
            currentDeliveredBytes: stats.deliveredBytes,
        };
    }
    const admittedAt = String(options.admittedAt || options.admitted_at || new Date().toISOString());
    const ticket = (0, runtime_kernel_1.buildWorkerTypedMemoryDispatchTicket)({
        lease,
        capsule: packetCapsule,
        workerContextPacket,
        renderedPrompt,
    }, {
        admittedAt,
        dispatchWindowMs: options.dispatchWindowMs || options.dispatch_window_ms || 30_000,
    });
    const validatedTicket = (0, runtime_kernel_1.validateWorkerTypedMemoryDispatchTicket)(ticket, {
        lease,
        capsule: packetCapsule,
        workerContextPacket,
        renderedPrompt,
    });
    if (validatedTicket?.valid_for_dispatch !== true) {
        return { admitted: false, required: true, reason: "dispatch_ticket_invalid", validation_issues: validatedTicket?.validation_issues || [] };
    }
    return {
        admitted: true,
        required: true,
        reason: existingCommit?.status === "committed" ? "lease_already_committed_retry_admitted" : "pending_lease_consumed_at_dispatch_point",
        idempotentRetry: existingCommit?.status === "committed",
        ticket: validatedTicket,
        lease,
        capsule: packetCapsule,
        postTurnSummaryCapsule: postTurnSummaryAdmission.capsule || null,
        stats,
    };
}
function commitChildTypedMemoryDelivery(memoryBundle, options = {}) {
    const workerContextPacket = options.workerContextPacket || options.worker_context_packet || null;
    const dispatchEvidence = options.dispatchEvidence || options.dispatch_evidence || {};
    if (!memoryBundle || !workerContextPacket)
        return { committed: false, reason: "memory_or_worker_packet_missing" };
    const packetMemory = workerContextPacket.memory || memoryBundle;
    const packetCapsuleInput = workerContextPacket.typed_memory_delivery_capsule
        || workerContextPacket.typedMemoryDeliveryCapsule
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-child-typed-memory-delivery-capsule-v1");
    if (!packetCapsuleInput?.schema)
        return { committed: false, reason: "delivery_capsule_missing" };
    const expectedBinding = workerContextPacket.typed_memory_delivery_expected_binding
        || workerContextPacket.typedMemoryDeliveryExpectedBinding
        || (0, runtime_kernel_1.buildWorkerTypedMemoryDeliveryExpectedBinding)(workerContextPacket, packetMemory);
    const packetCapsule = (0, runtime_kernel_1.validateWorkerTypedMemoryDeliveryCapsule)(packetCapsuleInput, { expectedBinding });
    if (packetCapsule?.trusted_for_delivery !== true) {
        return { committed: false, reason: "delivery_capsule_not_trusted", validation_issues: packetCapsule?.validation_issues || [] };
    }
    const leaseInput = (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-child-typed-memory-delivery-lease-v1")
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(memoryBundle, "ccm-child-typed-memory-delivery-lease-v1");
    const lease = (0, runtime_kernel_1.validateWorkerTypedMemoryDeliveryLease)(leaseInput, { capsule: packetCapsule });
    if (lease?.valid_for_commit !== true) {
        return { committed: false, reason: "delivery_lease_invalid", validation_issues: lease?.validation_issues || ["lease_missing"] };
    }
    const receipt = dispatchEvidence.deliveryReceipt || dispatchEvidence.delivery_receipt || null;
    const dispatchTicketInput = dispatchEvidence.dispatchTicket || dispatchEvidence.dispatch_ticket || null;
    const dispatchStartedAt = String(dispatchEvidence.dispatchStartedAt || dispatchEvidence.dispatch_started_at || "");
    const dispatchTicket = (0, runtime_kernel_1.validateWorkerTypedMemoryDispatchTicket)(dispatchTicketInput, {
        lease,
        capsule: packetCapsule,
        workerContextPacket,
        renderedPrompt: String(dispatchEvidence.renderedPrompt || dispatchEvidence.rendered_prompt || ""),
        dispatchStartedAt,
        requireDispatchStart: true,
    });
    if (dispatchTicket?.valid_for_commit !== true) {
        return { committed: false, reason: "dispatch_ticket_invalid", validation_issues: dispatchTicket?.validation_issues || ["ticket_missing"] };
    }
    const dispatched = dispatchEvidence.dispatched === true || receipt?.delivered === true;
    const executionReturned = dispatchEvidence.executionReturned === true
        || dispatchEvidence.execution_returned === true
        || receipt?.delivered === true;
    const renderedPrompt = String(dispatchEvidence.renderedPrompt || dispatchEvidence.rendered_prompt || "");
    const promptBindingVerified = dispatchEvidence.promptBindingVerified === true
        || dispatchEvidence.prompt_binding_verified === true
        || (!!renderedPrompt && renderedPrompt.includes(String(packetCapsule.capsule_checksum || "")))
        || receipt?.delivered === true;
    if (!dispatched || !executionReturned || !promptBindingVerified) {
        return { committed: false, reason: "dispatch_witness_incomplete", dispatched, executionReturned, promptBindingVerified };
    }
    const groupId = String(lease.group_id || "");
    const groupSessionId = String(lease.group_session_id || "");
    const targetProject = (0, group_memory_shared_1.normalizeAgentMemoryProject)(lease.target_project || "unknown");
    const taskAgentSessionId = String(lease.task_agent_session_id || "");
    if (!groupId || !groupSessionId || !taskAgentSessionId || !String(taskAgentSessionId).startsWith("tas_")) {
        return { committed: false, reason: "delivery_identity_incomplete" };
    }
    const bundleGroup = String(memoryBundle.group_id || memoryBundle.groupId || groupId);
    const bundleGroupSession = String(memoryBundle.group_session_id || memoryBundle.groupSessionId || groupSessionId);
    const bundleProject = (0, group_memory_shared_1.normalizeAgentMemoryProject)(memoryBundle.target_project || memoryBundle.targetProject || targetProject);
    if (bundleGroup !== groupId || bundleGroupSession !== groupSessionId || bundleProject !== targetProject) {
        return { committed: false, reason: "memory_bundle_identity_mismatch" };
    }
    const recall = (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-group-typed-memory-recall-v1")
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(memoryBundle, "ccm-group-typed-memory-recall-v1");
    if (!recall || recall.ignored === true)
        return { committed: false, reason: "typed_memory_recall_missing_or_ignored" };
    const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const scopeMetadata = {
        scope: String(lease.recall_scope || ""),
        scopeKind: "task_agent_session",
        targetProject,
        taskId: String(lease.task_id || ""),
        taskAgentSessionId,
        compactEpoch: String(lease.compact_epoch || "precompact"),
    };
    const ledger = (0, group_memory_index_1.recordGroupTypedMemoryRecall)(typedMemoryScopeId, scopeMetadata.scope, recall, String(lease.query_checksum || ""), { scopeMetadata, deliveryCapsule: packetCapsule, deliveryLease: lease });
    const committedLease = ledger.scopes?.[scopeMetadata.scope]?.deliveryLeases?.[lease.lease_id] || null;
    const stats = (0, group_memory_index_1.getGroupTypedMemoryRecallScopeStats)(typedMemoryScopeId, scopeMetadata.scope);
    let manifestSelectorOutcome = null;
    const manifestSelection = memoryBundle.typedMemoryManifestSelection
        || memoryBundle.typed_memory_manifest_selection
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-group-typed-memory-manifest-selection-v1")
        || (0, group_memory_shared_1.findMemoryArtifactBySchema)(memoryBundle, "ccm-group-typed-memory-manifest-selection-v1");
    if (committedLease?.status === "committed" && manifestSelection?.schema) {
        const attachedOutcome = memoryBundle.typedMemoryManifestSelectorOutcome
            || memoryBundle.typed_memory_manifest_selector_outcome
            || (0, group_memory_shared_1.findMemoryArtifactBySchema)(packetMemory, "ccm-group-typed-memory-manifest-selector-outcome-v1")
            || (0, group_memory_shared_1.findMemoryArtifactBySchema)(memoryBundle, "ccm-group-typed-memory-manifest-selector-outcome-v1");
        try {
            manifestSelectorOutcome = (0, group_memory_index_1.recordGroupTypedMemoryManifestSelectorOutcome)(typedMemoryScopeId, manifestSelection, {
                stage: "committed",
                attachedOutcome,
                recalledRelPaths: (recall.recalled || []).map((row) => row.relPath),
                attachedRelPaths: packetCapsule.delivered_rel_paths || [],
                capsuleChecksum: packetCapsule.capsule_checksum || "",
                deliveryLeaseId: lease.lease_id || "",
                dispatchTicketChecksum: dispatchTicket.checksum || dispatchTicket.ticket_checksum || "",
                deliveryReceiptChecksum: receipt?.checksum || receipt?.receipt_checksum || "",
                memoryContextSnapshotId: receipt?.snapshotId || receipt?.snapshot_id || receipt?.memoryContextSnapshotId || receipt?.memory_context_snapshot_id || "",
                memoryContextSnapshotChecksum: receipt?.snapshotChecksum || receipt?.snapshot_checksum || receipt?.memoryContextSnapshotChecksum || receipt?.memory_context_snapshot_checksum || "",
                workerContextPacketId: receipt?.workerContextPacketId || receipt?.worker_context_packet_id || workerContextPacket.packet_id || "",
                taskId: scopeMetadata.taskId,
                taskAgentSessionId,
                targetProject,
                recordOutcome: attachedOutcome?.recorded !== false,
            });
        }
        catch (error) {
            return {
                committed: false,
                reason: "manifest_selector_outcome_commit_failed",
                error: (0, group_memory_shared_1.compactMemoryText)(error?.message || error, 240),
                lease: committedLease,
                stats,
                ledger_file: ledger.file,
            };
        }
    }
    return {
        committed: committedLease?.status === "committed",
        idempotent: committedLease?.commitCount === 1 && committedLease?.lastCommitDuplicate === true,
        reason: committedLease?.status === "committed" ? "delivery_lease_committed" : "delivery_lease_not_persisted",
        lease: committedLease,
        stats,
        ledger_file: ledger.file,
        manifest_selector_outcome: manifestSelectorOutcome,
    };
}
function createChildTypedMemoryDispatchWal(admission, input = {}) {
    if (admission?.required !== true || !admission?.ticket) {
        return { required: false, created: false, reason: "typed_memory_dispatch_wal_not_required", record: null };
    }
    return (0, typed_memory_dispatch_wal_1.createTypedMemoryDispatchWal)({
        memoryBundle: input.memoryBundle || input.memory_bundle || null,
        workerContextPacket: input.workerContextPacket || input.worker_context_packet || null,
        renderedPrompt: input.renderedPrompt || input.rendered_prompt || "",
        snapshotRenderedPrompt: input.snapshotRenderedPrompt || input.snapshot_rendered_prompt || input.renderedPrompt || input.rendered_prompt || "",
        dispatchTicket: admission.ticket,
        deliveryLease: admission.lease,
        deliveryCapsule: admission.capsule,
        executionId: input.executionId || input.execution_id || "",
        platformDispatchId: input.platformDispatchId || input.platform_dispatch_id || "",
        capacityRevalidationProof: input.capacityRevalidationProof || input.capacity_revalidation_proof || null,
    });
}
function markChildTypedMemoryDispatchStarted(wal, input = {}) {
    if (!wal?.required || !wal?.record)
        return null;
    return (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(wal.record, "dispatch_started", {
        dispatch_started_at: String(input.dispatchStartedAt || input.dispatch_started_at || new Date().toISOString()),
        transport: String(input.transport || "third_party_agent"),
        runner_request_id: String(input.runnerRequestId || input.runner_request_id || wal.record.runner_request_id || ""),
    });
}
function markChildTypedMemoryRunnerReturned(record, input = {}) {
    if (!record)
        return null;
    return (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "runner_returned", {
        runner_returned_at: String(input.runnerReturnedAt || input.runner_returned_at || new Date().toISOString()),
        runner_request_id: String(input.runnerRequestId || input.runner_request_id || ""),
        runner_succeeded: input.runnerSucceeded !== false && input.runner_succeeded !== false,
        output_checksum: input.output ? crypto.createHash("sha256").update(String(input.output)).digest("hex") : "",
        delivery_receipt_id: String(input.deliveryReceipt?.receiptId || input.delivery_receipt?.receiptId || ""),
        delivery_receipt_checksum: String(input.deliveryReceipt?.checksum || input.delivery_receipt?.checksum || ""),
        delivery_receipt: input.deliveryReceipt || input.delivery_receipt || null,
    });
}
function markChildTypedMemoryDispatchCommitted(record, commit = {}) {
    if (!record)
        return null;
    if (commit?.committed !== true)
        return (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "runner_returned", {
            last_commit_error: String(commit?.reason || "unknown"),
            last_commit_attempt_at: new Date().toISOString(),
        });
    return (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "committed", {
        committed_at: new Date().toISOString(),
        ledger_file: String(commit.ledger_file || ""),
        committed_lease_id: String(commit.lease?.leaseId || commit.lease?.lease_id || ""),
        terminal_reason: commit.idempotent === true ? "delivery_lease_already_committed" : "delivery_lease_committed",
        recovery_payload: null,
    });
}
function recoverDeliveryReceiptFromRunnerWal(record) {
    const runnerRequestId = String(record.runner_request_id || "");
    if (!runnerRequestId)
        return null;
    const requestFile = path.join(utils_1.CCM_DIR, "agent-runner", "requests", `${runnerRequestId}.json`);
    const resultFile = path.join(utils_1.CCM_DIR, "agent-runner", "results", `${runnerRequestId}.json`);
    try {
        const request = JSON.parse(fs.readFileSync(requestFile, "utf-8"));
        const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
        const prompt = String(record.recovery_payload?.rendered_prompt || "");
        const promptChecksum = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 32);
        if (!request.started_at || String(request.message || "") !== prompt || promptChecksum !== String(record.prompt_checksum || ""))
            return null;
        if (String(request.taskAgentSessionId || "") !== String(record.task_agent_session_id || ""))
            return null;
        if (String(request.groupId || "") !== String(record.group_id || ""))
            return null;
        return (0, agent_sessions_1.recordTaskAgentMemoryContextDelivery)(String(record.task_agent_session_id || ""), {
            renderedPrompt: prompt,
            snapshotRenderedPrompt: String(record.recovery_payload?.snapshot_rendered_prompt || prompt),
            executionId: String(record.execution_id || ""),
            runtime: String(request.agentType || ""),
            attempt: Math.max(1, Number(record.attempt_sequence || 1)),
            nativeSessionId: String(result.nativeSessionId || ""),
            runnerRequestId,
            dispatched: true,
            executionSucceeded: result.success === true,
            output: String(result.output || result.error || ""),
            providerUsage: result.usage || null,
        });
    }
    catch {
        return null;
    }
}
function recoverChildTypedMemoryDispatchWal(options = {}) {
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const ticketIds = new Set((Array.isArray(options.ticketIds || options.ticket_ids) ? (options.ticketIds || options.ticket_ids) : [])
        .map((item) => String(item || ""))
        .filter(Boolean));
    const rows = [];
    for (const source of (0, typed_memory_dispatch_wal_1.listTypedMemoryDispatchWal)()) {
        if (ticketIds.size > 0 && !ticketIds.has(String(source.ticket_id || "")))
            continue;
        const validation = (0, typed_memory_dispatch_wal_1.verifyTypedMemoryDispatchWal)(source);
        if (!validation.valid) {
            rows.push({ ticket_id: source.ticket_id, state: source.state, action: "blocked_invalid_wal", issues: validation.issues });
            continue;
        }
        let record = source;
        try {
            const capacityRevalidationProof = record.recovery_payload?.capacity_revalidation_proof || null;
            if (capacityRevalidationProof && ["dispatch_started", "runner_returned", "committed"].includes(String(record.state || ""))) {
                (0, agent_sessions_1.commitTaskAgentSessionCapacityRevalidation)(String(record.task_agent_session_id || ""), capacityRevalidationProof, {
                    typedMemoryDispatchWalRecordChecksum: String(record.record_checksum || ""),
                    typedMemoryDispatchWalState: String(record.state || ""),
                    runnerRequestId: String(record.runner_request_id || ""),
                    runnerStarted: !!record.dispatch_started_at,
                });
            }
            if (record.state === "admitted") {
                const expiresAt = Date.parse(String(record.dispatch_not_after || ""));
                if (!Number.isFinite(expiresAt) || nowMs > expiresAt) {
                    record = (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "expired", { terminal_reason: "ticket_expired_before_dispatch" });
                    rows.push({ ticket_id: record.ticket_id, state: record.state, action: "expired" });
                }
                else {
                    rows.push({ ticket_id: record.ticket_id, state: record.state, action: "left_admitted" });
                }
                continue;
            }
            if (record.state === "dispatch_started") {
                const recoveredDelivery = recoverDeliveryReceiptFromRunnerWal(record);
                if (!recoveredDelivery?.receipt) {
                    record = (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "uncertain_after_crash", { terminal_reason: "dispatch_started_without_runner_return_evidence" });
                    rows.push({ ticket_id: record.ticket_id, state: record.state, action: "marked_uncertain" });
                    continue;
                }
                record = markChildTypedMemoryRunnerReturned(record, {
                    runnerRequestId: record.runner_request_id,
                    runnerSucceeded: recoveredDelivery.receipt.executionSucceeded === true,
                    deliveryReceipt: recoveredDelivery.receipt,
                });
            }
            if (record.state !== "runner_returned") {
                rows.push({ ticket_id: record.ticket_id, state: record.state, action: "terminal_or_noop" });
                continue;
            }
            if (!record.delivery_receipt && record.runner_request_id) {
                const recoveredDelivery = recoverDeliveryReceiptFromRunnerWal(record);
                if (recoveredDelivery?.receipt) {
                    record = markChildTypedMemoryRunnerReturned(record, {
                        runnerRequestId: record.runner_request_id,
                        runnerSucceeded: recoveredDelivery.receipt.executionSucceeded === true,
                        deliveryReceipt: recoveredDelivery.receipt,
                    });
                }
            }
            const receipt = record.delivery_receipt || null;
            const receiptValid = receipt?.delivered === true
                && String(receipt.checksum || "") === String(record.delivery_receipt_checksum || "")
                && (0, agent_sessions_1.verifyMemoryContextDeliveryReceiptChecksum)(receipt)
                && String(receipt.taskAgentSessionId || "") === String(record.task_agent_session_id || "")
                && String(receipt.workerContextPacketId || "") === String(record.worker_context_packet_id || "");
            if (!receiptValid || !(0, group_memory_shared_1.runnerRequestHasDurableReturnEvidence)(record)) {
                record = (0, typed_memory_dispatch_wal_1.transitionTypedMemoryDispatchWal)(record, "uncertain_after_crash", { terminal_reason: receiptValid ? "runner_return_evidence_invalid" : "delivery_receipt_invalid" });
                rows.push({ ticket_id: record.ticket_id, state: record.state, action: "marked_uncertain" });
                continue;
            }
            const payload = record.recovery_payload || {};
            const commit = commitChildTypedMemoryDelivery(payload.memory_bundle, {
                workerContextPacket: payload.worker_context_packet,
                dispatchEvidence: {
                    deliveryReceipt: receipt,
                    renderedPrompt: payload.rendered_prompt,
                    dispatchTicket: payload.dispatch_ticket,
                    dispatchStartedAt: record.dispatch_started_at,
                    dispatched: true,
                    executionReturned: true,
                },
            });
            record = markChildTypedMemoryDispatchCommitted(record, commit);
            rows.push({ ticket_id: record.ticket_id, state: record.state, action: commit.committed === true ? "recovered_commit" : "commit_failed", reason: commit.reason });
        }
        catch (error) {
            rows.push({ ticket_id: record.ticket_id, state: record.state, action: "recovery_error", error: String(error?.message || error) });
        }
    }
    const pruned = (0, typed_memory_dispatch_wal_1.pruneTypedMemoryDispatchWal)(options);
    const directSpoolPruned = (0, direct_dispatch_spool_1.pruneDirectAgentDispatchSpool)(options);
    return {
        schema: "ccm-child-typed-memory-dispatch-wal-recovery-v1",
        checked_at: new Date(nowMs).toISOString(),
        total: rows.length,
        recovered: rows.filter(row => row.action === "recovered_commit").length,
        uncertain: rows.filter(row => row.action === "marked_uncertain").length,
        expired: rows.filter(row => row.action === "expired").length,
        invalid: rows.filter(row => row.action === "blocked_invalid_wal").length,
        pruned: pruned.deleted_count,
        direct_spool_pruned: directSpoolPruned.deleted_count,
        rows,
    };
}
function buildAgentMemoryPacket(groupId, targetProject, task = "", options = {}) {
    return (0, group_memory_context_1.renderGroupMemoryContextBundle)((0, group_memory_context_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, options));
}
//# sourceMappingURL=group-agent-memory-packet.js.map