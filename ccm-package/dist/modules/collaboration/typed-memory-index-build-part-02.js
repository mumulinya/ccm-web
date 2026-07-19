"use strict";
// Behavior-freeze split from typed-memory-index-build.ts (part 2/2).
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
exports.applyGroupDirectMemoryRequests = applyGroupDirectMemoryRequests;
exports.filterFactsByDirectMemoryTombstones = filterFactsByDirectMemoryTombstones;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile;
exports.conflictResolutionColdArchiveManifestChecksum = conflictResolutionColdArchiveManifestChecksum;
exports.getConflictResolutionColdArchiveManifestGenerationsDir = getConflictResolutionColdArchiveManifestGenerationsDir;
exports.getConflictResolutionColdArchiveManifestGenerationFile = getConflictResolutionColdArchiveManifestGenerationFile;
exports.readConflictResolutionColdArchiveManifest = readConflictResolutionColdArchiveManifest;
exports.readPreviousConflictResolutionColdArchiveManifest = readPreviousConflictResolutionColdArchiveManifest;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration;
exports.buildGroupDirectMemoryAction = buildGroupDirectMemoryAction;
exports.commitGroupDirectMemoryAction = commitGroupDirectMemoryAction;
exports.syncGroupTypedMemoryFromGroupMemory = syncGroupTypedMemoryFromGroupMemory;
exports.groupTypedMemoryManifestSelectionChecksum = groupTypedMemoryManifestSelectionChecksum;
exports.groupTypedMemoryManifestSelectorCalibrationChecksum = groupTypedMemoryManifestSelectorCalibrationChecksum;
exports.getGroupTypedMemoryManifestSelectorDecisionDir = getGroupTypedMemoryManifestSelectorDecisionDir;
exports.getGroupTypedMemoryManifestSelectorOutcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir;
exports.getGroupTypedMemoryManifestSelectorConsumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir;
exports.groupTypedMemoryManifestSelectorOutcomeChecksum = groupTypedMemoryManifestSelectorOutcomeChecksum;
exports.verifyGroupTypedMemoryManifestSelectorOutcome = verifyGroupTypedMemoryManifestSelectorOutcome;
exports.recordGroupTypedMemoryManifestSelectorOutcome = recordGroupTypedMemoryManifestSelectorOutcome;
exports.groupTypedMemoryManifestSelectorConsumptionChecksum = groupTypedMemoryManifestSelectorConsumptionChecksum;
exports.readGroupTypedMemoryManifestSelectorChain = readGroupTypedMemoryManifestSelectorChain;
exports.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome = verifyGroupTypedMemoryManifestSelectorConsumptionOutcome;
exports.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes = recordGroupTypedMemoryManifestSelectorConsumptionOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorConsumption = summarizeGroupTypedMemoryManifestSelectorConsumption;
exports.verifyGroupTypedMemoryManifestSelectorCalibration = verifyGroupTypedMemoryManifestSelectorCalibration;
exports.buildGroupTypedMemoryManifestSelectorCalibration = buildGroupTypedMemoryManifestSelectorCalibration;
exports.groupTypedMemoryManifestSelectorAgeStats = groupTypedMemoryManifestSelectorAgeStats;
exports.recordGroupTypedMemoryManifestSelectorDecision = recordGroupTypedMemoryManifestSelectorDecision;
exports.verifyGroupTypedMemoryManifestSelection = verifyGroupTypedMemoryManifestSelection;
exports.configureGroupTypedMemoryManifestSelector = configureGroupTypedMemoryManifestSelector;
exports.buildGroupTypedMemoryManifest = buildGroupTypedMemoryManifest;
exports.parseGroupTypedMemoryManifestSelectorOutput = parseGroupTypedMemoryManifestSelectorOutput;
exports.finalizeGroupTypedMemoryManifestSelection = finalizeGroupTypedMemoryManifestSelection;
exports.selectGroupTypedMemoryManifest = selectGroupTypedMemoryManifest;
exports.summarizeGroupTypedMemoryManifestSelectorOutcomes = summarizeGroupTypedMemoryManifestSelectorOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorDecisions = summarizeGroupTypedMemoryManifestSelectorDecisions;
// Behavior-freeze module extracted mechanically from the former facade.
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_shape_trend_1 = require("./typed-memory-shape-trend");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_index_build_part_01_1 = require("./typed-memory-index-build-part-01");
function applyGroupDirectMemoryRequests(groupId, factsInput, requests = [], previous = {}, updatedAt = (0, typed_memory_shared_1.now)()) {
    const facts = {};
    for (const type of ["user", "project", "feedback", "reference"]) {
        facts[type] = { ...(factsInput?.[type] || {}) };
    }
    const receipts = new Map();
    for (const row of Array.isArray(previous?.receipts) ? previous.receipts : []) {
        if (row?.requestId)
            receipts.set(String(row.requestId), row);
    }
    const tombstones = new Map();
    for (const row of Array.isArray(previous?.tombstones) ? previous.tombstones : []) {
        if (row?.tombstoneId)
            tombstones.set(String(row.tombstoneId), row);
    }
    let rememberedThisRun = 0;
    let forgottenThisRun = 0;
    let duplicateThisRun = 0;
    let rejectedThisRun = 0;
    for (const request of [...requests].sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
        if (receipts.has(request.requestId)) {
            duplicateThisRun += 1;
            continue;
        }
        const base = {
            schema: "ccm-group-direct-memory-receipt-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
            requestId: request.requestId,
            action: request.action,
            groupId,
            messageId: request.messageId,
            sourceIndex: request.sourceIndex,
            requestChecksum: request.expectedChecksum,
            committedAt: updatedAt,
        };
        const reject = (reason, candidates = []) => {
            rejectedThisRun += 1;
            receipts.set(request.requestId, {
                ...base,
                status: "rejected",
                reason,
                candidateCount: candidates.length,
                candidates: candidates.slice(0, 12).map(row => ({
                    memoryId: row.memoryId,
                    type: row.type,
                    messageId: String(row.fact?.messageId || ""),
                    text: (0, typed_memory_shared_1.compactText)(row.fact?.text || "", 240),
                })),
            });
        };
        if (request.sourceRole !== "user") {
            reject("direct_memory_requires_user_message");
            continue;
        }
        if (!request.scopeMatches) {
            reject("direct_memory_scope_mismatch");
            continue;
        }
        if (!request.checksumMatches) {
            reject("direct_memory_request_checksum_mismatch");
            continue;
        }
        if (!request.content) {
            reject("direct_memory_content_required");
            continue;
        }
        if (request.action === "remember") {
            const identity = (0, typed_memory_index_build_part_01_1.directMemoryFactIdentity)(groupId, request.memoryType, request.content);
            const bucket = facts[request.memoryType] || {};
            const existing = bucket[identity.factKey];
            for (const [key, tombstone] of tombstones.entries()) {
                if (String(tombstone?.textChecksum || "") === identity.textChecksum)
                    tombstones.delete(key);
            }
            bucket[identity.factKey] = {
                id: identity.factKey,
                category: request.memoryType,
                type: "explicit_remember",
                groupId,
                memoryId: identity.memoryId,
                textChecksum: identity.textChecksum,
                messageId: request.messageId,
                sourceIndex: request.sourceIndex,
                actor: "用户 -> coordinator",
                sourceRole: "user",
                timestamp: request.requestedAt,
                text: request.content,
                checksum: identity.factKey,
                firstSeenAt: existing?.firstSeenAt || updatedAt,
                lastSeenAt: updatedAt,
                count: 1,
                directMemory: { requestId: request.requestId, requestChecksum: request.expectedChecksum },
                admission: {
                    admitted: true,
                    reason: "explicit_user_remember",
                    hardExclusion: false,
                    durable: true,
                    nonObvious: true,
                    hasRationale: true,
                    confidence: 1,
                    why: "The user explicitly requested this current group-session memory.",
                    howToApply: "Apply only inside this group session unless the user explicitly forgets or supersedes it.",
                },
            };
            facts[request.memoryType] = bucket;
            if (existing)
                duplicateThisRun += 1;
            else
                rememberedThisRun += 1;
            receipts.set(request.requestId, {
                ...base,
                status: existing ? "duplicate" : "committed",
                reason: existing ? "same_scoped_memory_already_exists" : "explicit_memory_committed",
                memoryId: identity.memoryId,
                memoryType: request.memoryType,
                textChecksum: identity.textChecksum,
            });
            continue;
        }
        const allRows = (0, typed_memory_index_build_part_01_1.directMemoryFactRows)(facts).map(row => {
            if (row.fact?.memoryId && row.fact?.textChecksum)
                return row;
            const derived = (0, typed_memory_index_build_part_01_1.directMemoryFactIdentity)(groupId, row.type, String(row.fact?.text || ""));
            return { ...row, memoryId: derived.memoryId, textChecksum: derived.textChecksum };
        });
        const target = (0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(request.targetMemoryId || request.content);
        let matches = allRows.filter(row => [row.memoryId, row.factKey, row.fact?.id, row.fact?.checksum, row.fact?.messageId]
            .some(value => (0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(value) === target));
        if (!matches.length) {
            matches = allRows.filter(row => (0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(row.fact?.text) === target);
        }
        if (!matches.length && target.length >= 8) {
            matches = allRows.filter(row => (0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(row.fact?.text).includes(target));
        }
        if (matches.length !== 1) {
            reject(matches.length ? "forget_target_ambiguous" : "forget_target_not_found", matches);
            continue;
        }
        const matched = matches[0];
        delete facts[matched.type][matched.factKey];
        const tombstoneId = `gmt_${(0, typed_memory_shared_1.checksum)([groupId, matched.memoryId, matched.factKey, request.requestId], 28)}`;
        tombstones.set(tombstoneId, {
            schema: "ccm-group-direct-memory-tombstone-v1",
            tombstoneId,
            groupId,
            memoryId: matched.memoryId,
            factKey: matched.factKey,
            textChecksum: matched.textChecksum || (0, typed_memory_shared_1.checksum)((0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(matched.fact?.text), 64),
            sourceMessageId: String(matched.fact?.messageId || ""),
            forgetMessageId: request.messageId,
            requestId: request.requestId,
            forgottenAt: updatedAt,
        });
        forgottenThisRun += 1;
        receipts.set(request.requestId, {
            ...base,
            status: "committed",
            reason: "explicit_memory_forgotten",
            memoryId: matched.memoryId,
            memoryType: matched.type,
            textChecksum: matched.textChecksum,
        });
    }
    const boundedReceipts = [...receipts.values()]
        .sort((a, b) => String(a.committedAt || "").localeCompare(String(b.committedAt || "")))
        .slice(-500);
    const boundedTombstones = [...tombstones.values()]
        .sort((a, b) => String(a.forgottenAt || "").localeCompare(String(b.forgottenAt || "")))
        .slice(-500);
    return {
        facts,
        ledger: {
            schema: "ccm-group-direct-memory-ledger-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
            groupId,
            evaluatedThisRun: requests.length,
            rememberedThisRun,
            forgottenThisRun,
            duplicateThisRun,
            rejectedThisRun,
            activeDirectMemoryCount: (0, typed_memory_index_build_part_01_1.directMemoryFactRows)(facts).filter(row => row.fact?.directMemory?.requestId).length,
            receiptCount: boundedReceipts.length,
            tombstoneCount: boundedTombstones.length,
            receipts: boundedReceipts,
            tombstones: boundedTombstones,
            updatedAt,
        },
    };
}
function filterFactsByDirectMemoryTombstones(facts, directMemory) {
    const blockedTextChecksums = new Set((Array.isArray(directMemory?.tombstones) ? directMemory.tombstones : [])
        .map((row) => String(row?.textChecksum || ""))
        .filter(Boolean));
    if (!blockedTextChecksums.size)
        return { facts, suppressedCount: 0 };
    const next = {};
    let suppressedCount = 0;
    for (const type of ["user", "project", "feedback", "reference"]) {
        next[type] = {};
        for (const [key, fact] of Object.entries(facts?.[type] || {})) {
            const textChecksum = String(fact?.textChecksum || (0, typed_memory_shared_1.checksum)((0, typed_memory_index_build_part_01_1.normalizeDirectMemoryText)(fact?.text), 64));
            if (blockedTextChecksums.has(textChecksum)) {
                suppressedCount += 1;
                continue;
            }
            next[type][key] = fact;
        }
    }
    return { facts: next, suppressedCount };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId) {
    return require("./group-memory-loading").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
}
function conflictResolutionColdArchiveManifestChecksum(manifest = {}) {
    return require("./group-memory-loading").conflictResolutionColdArchiveManifestChecksum(manifest);
}
function getConflictResolutionColdArchiveManifestGenerationsDir(groupId) {
    return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
}
function getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum) {
    return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum);
}
function readConflictResolutionColdArchiveManifest(groupId) {
    return require("./group-memory-loading").readConflictResolutionColdArchiveManifest(groupId);
}
function readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest = {}) {
    return require("./group-memory-loading").readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest);
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options = {}) {
    return require("./group-memory-loading").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options);
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options = {}) {
    return require("./group-memory-loading").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options);
}
function buildGroupDirectMemoryAction(groupId, input = {}) {
    const action = String(input.action || "").trim().toLowerCase();
    if (!["remember", "forget"].includes(action))
        throw new Error("unsupported_direct_memory_action");
    const messageId = (0, typed_memory_shared_1.compactText)(input.messageId || input.message_id || "", 180);
    if (!messageId)
        throw new Error("direct_memory_message_id_required");
    const content = (0, typed_memory_shared_1.compactText)(input.content || input.text || input.query || "", 1800);
    if (!content)
        throw new Error("direct_memory_content_required");
    const memoryType = (0, typed_memory_shared_1.normalizeMemoryType)(input.memoryType || input.memory_type || input.type || "user");
    const targetMemoryId = (0, typed_memory_shared_1.compactText)(input.targetMemoryId || input.target_memory_id || input.memoryId || input.memory_id || "", 180);
    const requestId = (0, typed_memory_shared_1.compactText)(input.requestId || input.request_id || `gmdr_${(0, typed_memory_shared_1.checksum)([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
    const requestChecksum = (0, typed_memory_shared_1.checksum)([typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
    return {
        schema: "ccm-group-direct-memory-action-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
        requestId,
        action,
        scopeId: groupId,
        content,
        memoryType,
        targetMemoryId,
        requestChecksum,
    };
}
function commitGroupDirectMemoryAction(groupId, messages = [], input = {}) {
    const requestId = String(input.requestId || input.request_id || "").trim();
    if (!requestId)
        throw new Error("direct_memory_request_id_required");
    const distillation = (0, typed_memory_distillation_receipts_1.distillGroupMessagesToTypedMemoryUntilCaughtUp)(groupId, messages, {}, {
        reason: String(input.reason || "direct-group-memory-action"),
        maxCatchUpBatches: Number(input.maxCatchUpBatches || input.max_catch_up_batches || 32),
    });
    const ledger = (0, typed_memory_distillation_receipts_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const receipt = (Array.isArray(ledger.directMemory?.receipts) ? ledger.directMemory.receipts : [])
        .find((row) => String(row?.requestId || "") === requestId) || null;
    return {
        schema: "ccm-group-direct-memory-commit-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
        groupId,
        requestId,
        committed: receipt?.status === "committed" || receipt?.status === "duplicate",
        receipt,
        directMemory: ledger.directMemory || null,
        distillation,
        index: (0, typed_memory_index_build_part_01_1.buildGroupTypedMemoryIndex)(groupId),
    };
}
function syncGroupTypedMemoryFromGroupMemory(groupId, memory = {}) {
    const updatedAt = (0, typed_memory_shared_1.now)();
    const goal = memory?.goal || memory?.summary || "";
    const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
    const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
    const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
    const blocked = Array.isArray(memory?.blocked) ? memory.blocked : [];
    const workerLedger = Array.isArray(memory?.workerLedger) ? memory.workerLedger : [];
    const reinject = memory?.compaction?.postCompactReinject || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan || {};
    const writes = [];
    const userBody = [
        "# User Requirements",
        goal ? `## Current Goal\n${(0, typed_memory_shared_1.compactText)(goal, 1200)}` : "",
        (0, typed_memory_shared_1.listLines)("Persistent Requirements", requirements, (item) => `#${item.messageId || item.id || ""} ${item.text || item}`, 24),
    ].filter(Boolean).join("\n\n");
    if (goal || requirements.length)
        writes.push((0, typed_memory_index_build_part_01_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "user",
            slug: "user-requirements",
            name: "User requirements and acceptance constraints",
            description: "Hard user constraints, acceptance requirements, and the active group goal.",
            source: "auto:group-memory-json",
            updatedAt,
            body: userBody,
        }));
    const projectBody = [
        "# Project Collaboration Context",
        goal ? `## Goal\n${(0, typed_memory_shared_1.compactText)(goal, 1200)}` : "",
        (0, typed_memory_shared_1.listLines)("Decisions", decisions, (item) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 16),
        (0, typed_memory_shared_1.listLines)("Next Actions", memory?.nextActions || [], (item) => item.action || item, 10),
        memory?.messageDigest ? `## Conversation Summary\n${(0, typed_memory_shared_1.compactText)(memory.messageDigest, 3000)}` : "",
    ].filter(Boolean).join("\n\n");
    if (projectBody.trim())
        writes.push((0, typed_memory_index_build_part_01_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "project",
            slug: "project-context",
            name: "Project collaboration context",
            description: "Group goal, decisions, next actions, and compacted conversation state.",
            source: "auto:group-memory-json",
            updatedAt,
            body: projectBody,
        }));
    const feedbackBody = [
        "# Feedback And Failure Memory",
        (0, typed_memory_shared_1.listLines)("Blocked Or Failed Work", blocked, (item) => `${item.project || item.agent || "agent"}: ${item.reason || item.summary || item.text || ""}`, 16),
        (0, typed_memory_shared_1.listLines)("Worker Ledger Warnings", workerLedger.filter((item) => !/done|success|completed/i.test(String(item.status || item.receiptStatus || ""))), (item) => `${item.project || item.agent || "agent"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 16),
    ].filter(Boolean).join("\n\n");
    if (blocked.length || feedbackBody.includes("- "))
        writes.push((0, typed_memory_index_build_part_01_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "feedback",
            slug: "feedback-failures",
            name: "Feedback and failure memory",
            description: "Corrections, blockers, failed receipts, and patterns the agents should not repeat.",
            source: "auto:group-memory-json",
            updatedAt,
            body: feedbackBody,
        }));
    const referenceBody = [
        "# Reference Artifacts",
        (0, typed_memory_shared_1.listLines)("Fact Anchors", facts, (item) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
        (0, typed_memory_shared_1.listLines)("Files To Reinject", reinject.files || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
        (0, typed_memory_shared_1.listLines)("Skills Or Tools To Reinject", reinject.skills || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
        (0, typed_memory_shared_1.listLines)("Verification To Reinject", reinject.verification || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    ].filter(Boolean).join("\n\n");
    if (facts.length || reinject?.hasCandidates)
        writes.push((0, typed_memory_index_build_part_01_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "reference-artifacts",
            name: "Reference artifacts and restored context",
            description: "Facts, files, skills, verification, and artifact pointers useful for future recall.",
            source: "auto:group-memory-json",
            updatedAt,
            body: referenceBody,
        }));
    const index = (0, typed_memory_index_build_part_01_1.buildGroupTypedMemoryIndex)(groupId);
    return { schema: "ccm-group-typed-memory-sync-v1", version: typed_memory_shared_1.GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}
function groupTypedMemoryManifestSelectionChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.decisionFile;
    delete payload.recallShapeTelemetry;
    delete payload.recallShapeTelemetryFile;
    delete payload.recallShapeTelemetryError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryManifestSelectorCalibrationChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function getGroupTypedMemoryManifestSelectorDecisionDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorDecisionDir(scopeId);
}
function getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
}
function getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
}
function groupTypedMemoryManifestSelectorOutcomeChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.outcomeFile;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId = "", selection = null) {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId, selection);
}
function recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input = {}) {
    return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input);
}
function groupTypedMemoryManifestSelectorConsumptionChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.consumptionFile;
    delete payload.valid;
    delete payload.idempotent;
    delete payload.trendContribution;
    delete payload.trendContributionError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function readGroupTypedMemoryManifestSelectorChain(scopeId, requestId) {
    const decisionFile = path.join(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId), `${(0, typed_memory_shared_1.safeSegment)(requestId)}.json`);
    const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
    const attachedFile = path.join(outcomeDir, `${(0, typed_memory_shared_1.safeSegment)(requestId)}.attached.json`);
    const committedFile = path.join(outcomeDir, `${(0, typed_memory_shared_1.safeSegment)(requestId)}.committed.json`);
    let selection = null;
    let attached = null;
    let committed = null;
    try {
        selection = JSON.parse(fs.readFileSync(decisionFile, "utf-8"));
    }
    catch { }
    try {
        attached = JSON.parse(fs.readFileSync(attachedFile, "utf-8"));
    }
    catch { }
    try {
        committed = JSON.parse(fs.readFileSync(committedFile, "utf-8"));
    }
    catch { }
    const selectionValid = verifyGroupTypedMemoryManifestSelection(selection, scopeId).valid === true;
    const attachedValid = selectionValid && verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeId, selection).valid === true && attached.stage === "attached";
    const committedValid = attachedValid
        && verifyGroupTypedMemoryManifestSelectorOutcome(committed, scopeId, selection).valid === true
        && committed.stage === "committed"
        && String(committed.attachedOutcomeChecksum || "") === String(attached.checksum || "")
        && String(committed.capsuleChecksum || "") === String(attached.capsuleChecksum || "");
    return {
        valid: committedValid,
        selection,
        attached,
        committed,
        files: { decisionFile, attachedFile, committedFile },
    };
}
function verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId = "", committedOutcome = null) {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId, committedOutcome);
}
function recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input = {}) {
    return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input);
}
function summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options);
}
function verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId = "", expectedQueryChecksum = "") {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId, expectedQueryChecksum);
}
function buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options = {}) {
    return require("./group-memory-loading").buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options);
}
function groupTypedMemoryManifestSelectorAgeStats(candidates, nowMs) {
    const ages = candidates.map((candidate) => {
        const mtimeMs = Number(candidate?.mtimeMs || 0);
        return mtimeMs > 0 ? Math.max(0, (nowMs - mtimeMs) / 86_400_000) : 0;
    });
    if (!ages.length)
        return { newest: -1, oldest: -1, average: -1 };
    return {
        newest: Number(Math.min(...ages).toFixed(6)),
        oldest: Number(Math.max(...ages).toFixed(6)),
        average: Number((ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(6)),
    };
}
function recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision) {
    const dir = path.resolve(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.resolve(dir, `${(0, typed_memory_shared_1.safeSegment)(decision.requestId, `ms-${(0, typed_memory_shared_1.checksum)(decision, 16)}`)}.json`);
    if (path.dirname(file).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_manifest_selector_decision_path_invalid");
    (0, typed_memory_shared_1.writeTextAtomicRaw)(file, JSON.stringify(decision, null, 2));
    try {
        const files = fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".json"))
            .map(name => ({ name, file: path.resolve(dir, name), mtimeMs: fs.statSync(path.resolve(dir, name)).mtimeMs }))
            .filter(item => path.dirname(item.file).toLowerCase() === dir.toLowerCase())
            .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
        for (const item of files.slice(200)) {
            try {
                fs.unlinkSync(item.file);
            }
            catch { }
            const requestId = item.name.replace(/\.json$/i, "");
            const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
            for (const stage of ["attached", "committed"]) {
                try {
                    fs.unlinkSync(path.join(outcomeDir, `${requestId}.${stage}.json`));
                }
                catch { }
            }
            const consumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
            try {
                for (const name of fs.readdirSync(consumptionDir).filter(name => name.startsWith(`${requestId}.`) && name.endsWith(".json"))) {
                    try {
                        fs.unlinkSync(path.join(consumptionDir, name));
                    }
                    catch { }
                }
            }
            catch { }
            try {
                fs.unlinkSync(path.join((0, typed_memory_shape_trend_1.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId), `${requestId}.json`));
            }
            catch { }
        }
    }
    catch { }
    return file;
}
function verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId = "") {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId);
}
function configureGroupTypedMemoryManifestSelector(executor) {
    return require("./group-memory-loading").configureGroupTypedMemoryManifestSelector(executor);
}
function buildGroupTypedMemoryManifest(scopeId, query, options = {}) {
    return require("./group-memory-loading").buildGroupTypedMemoryManifest(scopeId, query, options);
}
function parseGroupTypedMemoryManifestSelectorOutput(value) {
    if (Array.isArray(value?.selected_memories))
        return value.selected_memories;
    if (Array.isArray(value?.selectedMemories))
        return value.selectedMemories;
    const raw = String(value?.output ?? value?.text ?? value?.content ?? value ?? "").trim();
    if (!raw)
        return [];
    const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const candidates = [fenced, fenced.match(/\{[\s\S]*\}/)?.[0] || ""].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed?.selected_memories))
                return parsed.selected_memories;
            if (Array.isArray(parsed?.selectedMemories))
                return parsed.selectedMemories;
        }
        catch { }
    }
    throw new Error("manifest_selector_output_json_invalid");
}
function finalizeGroupTypedMemoryManifestSelection(scopeId, input, options = {}) {
    const core = {
        schema: "ccm-group-typed-memory-manifest-selection-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
        scopeId,
        requestId: String(input.requestId || `ms_${(0, typed_memory_shared_1.checksum)([scopeId, Date.now(), crypto.randomBytes(8).toString("hex")], 24)}`),
        status: String(input.status || "empty"),
        reason: String(input.reason || ""),
        selectorRan: input.selectorRan === true,
        shapeTelemetryExpected: input.shapeTelemetryExpected === true,
        queryChecksum: String(input.queryChecksum || ""),
        manifestChecksum: String(input.manifestChecksum || ""),
        candidateCount: Number(input.candidateCount || 0),
        selectedRelPaths: (0, typed_memory_shared_1.uniqueStrings)((input.selectedRelPaths || []).map(String), typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION),
        unknownFilenames: (0, typed_memory_shared_1.uniqueStrings)((input.unknownFilenames || []).map(String), 20),
        invalidFilenameCount: Number(input.invalidFilenameCount || 0),
        recentTools: (0, typed_memory_shared_1.uniqueStrings)((input.recentTools || []).map(String), 20),
        filterCounts: input.filterCounts || {},
        calibration: input.calibration || null,
        calibrationChecksum: String(input.calibrationChecksum || input.calibration?.checksum || ""),
        calibrationHintCount: Number(input.calibrationHintCount ?? input.calibration?.hintCount ?? 0),
        calibrationEvidenceCount: Number(input.calibrationEvidenceCount ?? input.calibration?.evidenceCount ?? 0),
        selectorProject: String(input.selectorProject || ""),
        selectorAgentType: String(input.selectorAgentType || ""),
        selectorModel: String(input.selectorModel || ""),
        startedAt: String(input.startedAt || ""),
        completedAt: String(input.completedAt || (0, typed_memory_shared_1.now)()),
    };
    const decision = { ...core, checksum: groupTypedMemoryManifestSelectionChecksum(core) };
    if (options.recordDecision !== false && (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        try {
            decision.decisionFile = recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision);
        }
        catch (error) {
            decision.recordError = (0, typed_memory_shared_1.compactText)(error?.message || error, 240);
        }
    }
    return decision;
}
async function selectGroupTypedMemoryManifest(scopeId, query, options = {}) {
    return require("./group-memory-loading").selectGroupTypedMemoryManifest(scopeId, query, options);
}
function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options);
}
function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options);
}
//# sourceMappingURL=typed-memory-index-build-part-02.js.map