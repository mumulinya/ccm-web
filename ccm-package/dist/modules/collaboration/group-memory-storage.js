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
exports.getGroupSessionSidecarFile = getGroupSessionSidecarFile;
exports.getGroupMemoryFile = getGroupMemoryFile;
exports.getGroupMemoryReloadLedgerFile = getGroupMemoryReloadLedgerFile;
exports.getGroupPostCompactDispatchLedgerFile = getGroupPostCompactDispatchLedgerFile;
exports.getGroupReplayRepairLedgerFile = getGroupReplayRepairLedgerFile;
exports.getGroupReplayRepairWorkItemsFile = getGroupReplayRepairWorkItemsFile;
exports.getGroupSessionMemoryDir = getGroupSessionMemoryDir;
exports.getGroupSessionMemoryMarkdownFile = getGroupSessionMemoryMarkdownFile;
exports.readGroupReplayRepairLedgerSummary = readGroupReplayRepairLedgerSummary;
exports.readGroupReplayRepairWorkItemsSummary = readGroupReplayRepairWorkItemsSummary;
exports.replayRepairWorkItemStatusForMemory = replayRepairWorkItemStatusForMemory;
exports.replayRepairCandidatePriorityRank = replayRepairCandidatePriorityRank;
exports.readGroupReplayRepairDispatchCandidatesSummary = readGroupReplayRepairDispatchCandidatesSummary;
exports.getGroupMemoryBackupFile = getGroupMemoryBackupFile;
exports.createEmptyGroupMemory = createEmptyGroupMemory;
exports.loadGroupMemory = loadGroupMemory;
exports.saveGroupMemory = saveGroupMemory;
exports.deleteGroupSessionMemoryArtifacts = deleteGroupSessionMemoryArtifacts;
exports.persistGroupMemoryResumeEffectiveTokenBaseline = persistGroupMemoryResumeEffectiveTokenBaseline;
exports.hashGroupMemoryFileWindow = hashGroupMemoryFileWindow;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
const group_session_memory_extraction_1 = require("./group-session-memory-extraction");
const typed_memory_dispatch_wal_1 = require("./typed-memory-dispatch-wal");
const task_agent_invocation_lineage_1 = require("../../tasks/task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("../../tasks/task-agent-continuation-soak");
const group_compact_head_1 = require("./group-compact-head");
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const provider_native_compact_session_capacity_1 = require("./provider-native-compact-session-capacity");
const group_memory_auto_compact_circuit_breaker_1 = require("./group-memory-auto-compact-circuit-breaker");
const group_reactive_compact_retry_ownership_1 = require("./group-reactive-compact-retry-ownership");
const group_compaction_activity_1 = require("./group-compaction-activity");
const final_dispatch_context_collapse_1 = require("../../agents/final-dispatch-context-collapse");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_orchestrator_1 = require("./group-orchestrator");
const group_compact_file_references_1 = require("./group-compact-file-references");
const group_memory_shared_1 = require("./group-memory-shared");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
const group_tool_continuity_1 = require("./group-tool-continuity");
function getGroupSessionSidecarFile(root, groupId, sessionId = "") {
    const cleanSessionId = String(sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId)).trim();
    if (!cleanSessionId || cleanSessionId === "default") {
        return path.join(root, `${(0, group_memory_shared_1.cleanGroupMemoryScopePart)(groupId)}.json`);
    }
    return path.join(root, (0, group_memory_shared_1.cleanGroupMemoryScopePart)(groupId), `${(0, group_memory_shared_1.cleanGroupMemoryScopePart)(cleanSessionId)}.json`);
}
function getGroupMemoryFile(groupId, sessionId = "") {
    const resolvedSessionId = String(sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    if (resolvedSessionId === "default")
        return path.join(group_memory_shared_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    return path.join(group_memory_shared_1.GROUP_SESSION_SCOPED_MEMORY_DIR, (0, group_memory_shared_1.cleanGroupMemoryScopePart)(groupId), `${(0, group_memory_shared_1.cleanGroupMemoryScopePart)(resolvedSessionId)}.json`);
}
function getGroupMemoryReloadLedgerFile(groupId, sessionId = "") {
    return getGroupSessionSidecarFile(group_memory_shared_1.GROUP_MEMORY_RELOAD_DIR, groupId, sessionId);
}
function getGroupPostCompactDispatchLedgerFile(groupId, sessionId = "") {
    return getGroupSessionSidecarFile(group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR, groupId, sessionId);
}
function getGroupReplayRepairLedgerFile(groupId, sessionId = "") {
    return getGroupSessionSidecarFile(group_memory_shared_1.GROUP_MEMORY_REPLAY_REPAIR_DIR, groupId, sessionId);
}
function getGroupReplayRepairWorkItemsFile(groupId, sessionId = "") {
    return getGroupSessionSidecarFile(group_memory_shared_1.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, groupId, sessionId);
}
function getGroupSessionMemoryDir(groupId) {
    return path.join(group_memory_shared_1.GROUP_SESSION_MEMORY_DIR, String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
}
function getGroupSessionMemoryMarkdownFile(groupId) {
    return path.join(getGroupSessionMemoryDir(groupId), "summary.md");
}
function readGroupReplayRepairLedgerSummary(groupId, sessionId = "") {
    const file = getGroupReplayRepairLedgerFile(groupId, sessionId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema !== "ccm-compact-boundary-replay-repair-ledger-v1")
            return null;
        const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
        const latest = entries[entries.length - 1] || {};
        const latestRequiredActionCount = Number(latest.required_action_count || 0);
        const openActionCount = latest.status === "ok" ? 0 : latestRequiredActionCount;
        return {
            schema: "ccm-compact-boundary-replay-repair-ledger-summary-v1",
            file,
            updatedAt: ledger.updatedAt || latest.last_seen_at || latest.at || "",
            attemptCount: entries.length,
            openActionCount,
            reworkRequiredCount: openActionCount > 0 ? 1 : 0,
            historicalReworkRequiredCount: entries.filter((entry) => Number(entry.required_action_count || 0) > 0).length,
            latestStatus: latest.status || "",
            latestScore: latest.score ?? null,
            latestRenderedHash: latest.rendered_hash || "",
            latestAttemptId: latest.attempt_id || "",
            recentAttempts: entries.slice(-4).reverse().map((entry) => ({
                attempt_id: entry.attempt_id || "",
                status: entry.status || "",
                score: entry.score ?? null,
                target_project: entry.target_project || "",
                required_action_count: Number(entry.required_action_count || 0),
                gap_count: Number(entry.gap_count || 0),
                rendered_hash: entry.rendered_hash || "",
                seen_count: Number(entry.seen_count || 1),
                last_seen_at: entry.last_seen_at || entry.at || "",
            })),
        };
    }
    catch {
        return null;
    }
}
function readGroupReplayRepairWorkItemsSummary(groupId, sessionId = "") {
    const file = getGroupReplayRepairWorkItemsFile(groupId, sessionId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1")
            return null;
        const items = Array.isArray(ledger.items) ? ledger.items : [];
        const statusOf = (item) => {
            const status = String(item?.status || "").toLowerCase();
            if (["in_progress", "running", "claimed", "dispatching"].includes(status))
                return "in_progress";
            if (["blocked", "needs_info", "needs_user", "waiting"].includes(status))
                return "blocked";
            if (["completed", "done", "resolved", "ok"].includes(status))
                return "completed";
            if (["cancelled", "canceled", "superseded"].includes(status))
                return "cancelled";
            return "pending";
        };
        const open = items.filter((item) => ["pending", "in_progress", "blocked"].includes(statusOf(item)));
        const priorityRank = (priority) => priority === "critical" ? 0 : priority === "high" ? 1 : priority === "medium" ? 2 : 3;
        const sortedOpen = [...open].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
        return {
            schema: "ccm-compact-boundary-replay-repair-work-items-summary-v1",
            file,
            updatedAt: ledger.updatedAt || "",
            latestReplay: ledger.latestReplay || null,
            total: items.length,
            openItemCount: open.length,
            pendingCount: items.filter((item) => statusOf(item) === "pending").length,
            inProgressCount: items.filter((item) => statusOf(item) === "in_progress").length,
            blockedCount: items.filter((item) => statusOf(item) === "blocked").length,
            completedCount: items.filter((item) => statusOf(item) === "completed").length,
            cancelledCount: items.filter((item) => statusOf(item) === "cancelled").length,
            openItems: sortedOpen.slice(0, 8).map((item) => ({
                id: item.id || item.work_item_id || "",
                status: statusOf(item),
                owner: item.owner || "",
                priority: item.priority || "",
                component: item.component || "",
                subject: item.subject || "",
                target: item.target || "",
                repair_target: item.repair_target || "",
                target_project: item.target_project || "",
                source: item.source || "",
                proof_entry_id: item.proof_entry_id || "",
                plan_checksum: item.plan_checksum || "",
                request_patch_checksum: item.request_patch_checksum || "",
                request_telemetry_status: item.request_telemetry_status || "",
                request_telemetry_session_status: item.request_telemetry_session_status || "",
                request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
                runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
                instruction: (0, group_memory_shared_1.compactMemoryText)(item.instruction || item.description || "", 260),
                expected: (0, group_memory_shared_1.compactMemoryText)(item.expected || "", 160),
                dispatch_target: item.dispatch_target || item.dispatchTarget || "",
                replay_attempt_id: item.replay_attempt_id || "",
                replay_rendered_hash: item.replay_rendered_hash || "",
            })),
            items: [...sortedOpen, ...items.filter((item) => !open.includes(item)).slice(-8)].slice(0, 12).map((item) => ({
                id: item.id || item.work_item_id || "",
                status: statusOf(item),
                owner: item.owner || "",
                priority: item.priority || "",
                component: item.component || "",
                subject: item.subject || "",
                target: item.target || "",
                repair_target: item.repair_target || "",
                target_project: item.target_project || "",
                source: item.source || "",
                proof_entry_id: item.proof_entry_id || "",
                plan_checksum: item.plan_checksum || "",
                request_patch_checksum: item.request_patch_checksum || "",
                request_telemetry_status: item.request_telemetry_status || "",
                request_telemetry_session_status: item.request_telemetry_session_status || "",
                request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
                runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
                instruction: (0, group_memory_shared_1.compactMemoryText)(item.instruction || item.description || "", 260),
                expected: (0, group_memory_shared_1.compactMemoryText)(item.expected || "", 160),
                dispatch_target: item.dispatch_target || item.dispatchTarget || "",
                replay_attempt_id: item.replay_attempt_id || "",
                replay_rendered_hash: item.replay_rendered_hash || "",
            })),
        };
    }
    catch {
        return null;
    }
}
function replayRepairWorkItemStatusForMemory(item) {
    const status = String(item?.status || "").toLowerCase();
    if (["in_progress", "running", "claimed", "dispatching"].includes(status))
        return "in_progress";
    if (["blocked", "needs_info", "needs_user", "waiting"].includes(status))
        return "blocked";
    if (["completed", "done", "resolved", "ok"].includes(status))
        return "completed";
    if (["cancelled", "canceled", "superseded"].includes(status))
        return "cancelled";
    return "pending";
}
function replayRepairCandidatePriorityRank(item) {
    const dispatchTarget = String(item.dispatch_target || item.dispatchTarget || "").trim();
    const status = replayRepairWorkItemStatusForMemory(item);
    if (dispatchTarget)
        return 0;
    if (status === "in_progress" && String(item.owner || "") === "group-main-agent")
        return 1;
    if (["critical", "high"].includes(String(item.priority || "").toLowerCase()))
        return 2;
    return 9;
}
function readGroupReplayRepairDispatchCandidatesSummary(groupId, limit = 12, sessionId = "") {
    const file = getGroupReplayRepairWorkItemsFile(groupId, sessionId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1")
            return null;
        const items = Array.isArray(ledger.items) ? ledger.items : [];
        const openItems = items.filter((item) => ["pending", "in_progress", "blocked"].includes(replayRepairWorkItemStatusForMemory(item)));
        const candidates = openItems
            .filter((item) => {
            const status = replayRepairWorkItemStatusForMemory(item);
            const priority = String(item.priority || "").toLowerCase();
            return !!String(item.dispatch_target || item.dispatchTarget || "").trim()
                || (status === "in_progress" && String(item.owner || "") === "group-main-agent")
                || (status === "pending" && ["critical", "high"].includes(priority));
        })
            .sort((a, b) => {
            const dispatchRank = replayRepairCandidatePriorityRank(a) - replayRepairCandidatePriorityRank(b);
            if (dispatchRank)
                return dispatchRank;
            const priorityRank = (p) => p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : 3;
            const priority = priorityRank(a.priority) - priorityRank(b.priority);
            if (priority)
                return priority;
            return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        })
            .slice(0, limit)
            .map((item, index) => {
            const dispatchTarget = (0, group_memory_shared_1.compactMemoryText)(item.dispatch_target || item.dispatchTarget || "", 120);
            const targetProject = (0, group_memory_shared_1.compactMemoryText)(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
            const workItemId = String(item.work_item_id || item.id || `repair-${index}`);
            return {
                candidate_id: `replay-repair-dispatch:${crypto.createHash("sha256").update(JSON.stringify([groupId, workItemId, targetProject, item.replay_rendered_hash || ""])).digest("hex").slice(0, 14)}`,
                work_item_id: workItemId,
                groupId,
                status: replayRepairWorkItemStatusForMemory(item),
                owner: item.owner || "",
                priority: item.priority || "medium",
                component: item.component || "replay_renderer",
                subject: item.subject || item.title || "修复 Replay Gate 缺口",
                targetProject,
                dispatch_target: dispatchTarget,
                repair_target: item.repair_target || "",
                source: item.source || "",
                proof_entry_id: item.proof_entry_id || "",
                plan_checksum: item.plan_checksum || "",
                request_patch_checksum: item.request_patch_checksum || "",
                worker_context_packet_id: item.worker_context_packet_id || item.packet_id || "",
                worker_context_packet_binding_id: item.worker_context_packet_binding_id || item.binding_id || "",
                worker_context_packet_memory_policy_reason: item.worker_context_packet_memory_policy_reason || "",
                binding_id: item.binding_id || item.worker_context_packet_binding_id || "",
                assignment_id: item.assignment_id || "",
                dispatch_key: item.dispatch_key || "",
                pressure_memory_provenance_gap_codes: item.pressure_memory_provenance_gap_codes || [],
                pressure_memory_provenance_repair_work_item_ids: item.pressure_memory_provenance_repair_work_item_ids || [],
                pressure_memory_provenance_rel_paths: item.pressure_memory_provenance_rel_paths || [],
                request_telemetry_status: item.request_telemetry_status || "",
                request_telemetry_session_status: item.request_telemetry_session_status || "",
                request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
                runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
                instruction: (0, group_memory_shared_1.compactMemoryText)(item.instruction || item.description || "", 360),
                expected: (0, group_memory_shared_1.compactMemoryText)(item.expected || "", 200),
                prompt_patch: (0, group_memory_shared_1.compactMemoryText)(item.prompt_patch || "", 900),
                raw_recovery: item.raw_recovery || {},
                replay_attempt_id: item.replay_attempt_id || "",
                replay_rendered_hash: item.replay_rendered_hash || "",
                boundary_checksum: item.boundary_checksum || "",
                recommendedAction: dispatchTarget
                    ? "main_agent_review_and_dispatch_to_child_agent"
                    : replayRepairWorkItemStatusForMemory(item) === "in_progress"
                        ? "main_agent_prepare_dispatch_brief"
                        : "main_agent_claim_or_triage_before_next_child_dispatch",
                shouldCreateRealTask: false,
            };
        });
        const claimedCount = openItems.filter((item) => replayRepairWorkItemStatusForMemory(item) === "in_progress" && String(item.owner || "") === "group-main-agent").length;
        const dispatchMarkedCount = openItems.filter((item) => String(item.dispatch_target || item.dispatchTarget || "").trim()).length;
        const criticalCount = openItems.filter((item) => ["critical", "high"].includes(String(item.priority || "").toLowerCase())).length;
        return {
            schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
            groupId,
            file,
            updatedAt: ledger.updatedAt || "",
            candidateCount: candidates.length,
            openItemCount: openItems.length,
            claimedCount,
            dispatchMarkedCount,
            criticalCount,
            readyCount: candidates.filter((candidate) => candidate.dispatch_target || candidate.status === "in_progress").length,
            shouldCreateRealTask: false,
            candidates,
        };
    }
    catch {
        return null;
    }
}
function getGroupMemoryBackupFile(groupId, sessionId = "") {
    return `${getGroupMemoryFile(groupId, sessionId)}.bak`;
}
function createEmptyGroupMemory(groupId, sessionId = "") {
    const resolvedSessionId = String(sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    return {
        groupId,
        groupSessionId: resolvedSessionId,
        goal: "",
        summary: "",
        currentPhase: "idle",
        decisions: [],
        completed: [],
        blocked: [],
        workerLedger: [],
        agentMemories: {},
        conversationSummary: null,
        factAnchors: [],
        persistentRequirements: [],
        messageDigest: "",
        sessionMemory: null,
        toolContinuity: null,
        compactBoundary: null,
        compaction: { version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION, enabled: true, health: "empty", compactedMessageCount: 0 },
        messageCompression: { enabled: true, recentLimit: 12, olderLimit: 30, totalMessages: 0, compressedMessages: 0, lastCompressedAt: "" },
        longTermLogDistillation: null,
        openQuestions: [],
        nextActions: [],
        updated_at: new Date().toISOString(),
    };
}
function loadGroupMemory(groupId, sessionId = "") {
    const resolvedSessionId = String(sessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const file = getGroupMemoryFile(groupId, resolvedSessionId);
    if (!fs.existsSync(file))
        return createEmptyGroupMemory(groupId, resolvedSessionId);
    try {
        return { ...createEmptyGroupMemory(groupId, resolvedSessionId), ...JSON.parse(fs.readFileSync(file, "utf-8")), groupSessionId: resolvedSessionId };
    }
    catch {
        const backup = getGroupMemoryBackupFile(groupId, resolvedSessionId);
        try {
            const recovered = { ...createEmptyGroupMemory(groupId, resolvedSessionId), ...JSON.parse(fs.readFileSync(backup, "utf-8")), groupSessionId: resolvedSessionId };
            const temp = `${file}.${process.pid}.recover.tmp`;
            fs.writeFileSync(temp, JSON.stringify(recovered, null, 2), "utf-8");
            fs.renameSync(temp, file);
            return recovered;
        }
        catch { }
        return createEmptyGroupMemory(groupId, resolvedSessionId);
    }
}
function saveGroupMemory(groupId, memory, sessionId = "", options = {}) {
    const resolvedSessionId = String(sessionId || memory?.groupSessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const snapshotScopeId = resolvedSessionId === "default" ? groupId : `${groupId}--${resolvedSessionId}`;
    const file = getGroupMemoryFile(groupId, resolvedSessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let next = (0, group_memory_shared_1.compressGroupMemory)({
        ...createEmptyGroupMemory(groupId, resolvedSessionId),
        ...(memory || {}),
        groupId,
        groupSessionId: resolvedSessionId,
        updated_at: new Date().toISOString(),
    });
    try {
        const cadenceDecision = options.sessionMemoryCadenceDecision || options.session_memory_cadence_decision || null;
        let sessionMemory = null;
        if (cadenceDecision?.shouldExtract === true
            && !options.sessionMemoryModelMarkdown
            && !options.session_memory_model_markdown) {
            sessionMemory = (0, group_session_memory_snapshot_1.persistGroupSessionMemoryCadenceObservation)(snapshotScopeId, {
                ...cadenceDecision,
                shouldExtract: false,
                status: "model_extraction_due",
                modelExtractionRequired: true,
                modelExtractionQueuedAt: new Date().toISOString(),
            });
        }
        else if (cadenceDecision && cadenceDecision.shouldExtract !== true) {
            sessionMemory = (0, group_session_memory_snapshot_1.persistGroupSessionMemoryCadenceObservation)(snapshotScopeId, cadenceDecision);
        }
        else {
            const transaction = (0, group_session_memory_extraction_1.runGroupSessionMemoryExtractionTransaction)(snapshotScopeId, (extraction) => {
                const prepared = (0, group_session_memory_snapshot_1.buildGroupSessionMemorySnapshot)(snapshotScopeId, next, {
                    reason: cadenceDecision ? "automatic_session_memory_extraction" : "save_group_memory_manual",
                    cadenceDecision,
                    extractionTransaction: {
                        schema: "ccm-group-session-memory-extraction-transaction-v1",
                        status: "prepared",
                        leaseId: extraction.lease?.leaseId || "",
                        fencingToken: Number(extraction.lease?.fencingToken || 0),
                        recovered: extraction.recovered === true,
                        startedAt: extraction.state?.startedAt || "",
                    },
                });
                return {
                    schema: "ccm-group-session-memory-extraction-staged-commit-v1",
                    commit: () => (0, group_session_memory_snapshot_1.commitGroupSessionMemorySnapshot)(prepared),
                };
            }, {
                failBeforeCommit: options.failSessionMemoryExtractionBeforeCommit === true || options.fail_session_memory_extraction_before_commit === true,
                at: options.sessionMemoryExtractionAt || options.session_memory_extraction_at,
                ttlMs: options.sessionMemoryExtractionTtlMs || options.session_memory_extraction_ttl_ms,
            });
            if (transaction.committed) {
                sessionMemory = transaction.value;
            }
            else if (transaction.status === "lease_busy") {
                const existing = (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(snapshotScopeId) || {};
                sessionMemory = {
                    ...existing,
                    extractionTransaction: {
                        schema: "ccm-group-session-memory-extraction-transaction-v1",
                        status: "in_progress",
                        leaseId: transaction.acquired?.status?.lease?.leaseId || "",
                        fencingToken: Number(transaction.acquired?.status?.lease?.fencingToken || 0),
                    },
                };
            }
            else if (transaction.status === "failed") {
                const existing = (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(snapshotScopeId) || {};
                const failedCadence = cadenceDecision || existing.updateCadence || null;
                sessionMemory = failedCadence
                    ? (0, group_session_memory_snapshot_1.persistGroupSessionMemoryCadenceObservation)(snapshotScopeId, {
                        ...failedCadence,
                        shouldExtract: false,
                        status: "extraction_failed",
                        lastExtractionError: transaction.error || transaction.status,
                    })
                    : existing;
                sessionMemory = {
                    ...sessionMemory,
                    extractionTransaction: {
                        schema: "ccm-group-session-memory-extraction-transaction-v1",
                        status: "failed",
                        error: transaction.error || transaction.status,
                        leaseId: transaction.lease?.leaseId || "",
                        fencingToken: Number(transaction.lease?.fencingToken || 0),
                    },
                };
            }
            else {
                const existing = (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(snapshotScopeId) || {};
                sessionMemory = {
                    ...existing,
                    extractionTransaction: {
                        schema: "ccm-group-session-memory-extraction-transaction-v1",
                        status: "blocked",
                        error: transaction.error || transaction.status,
                    },
                };
            }
        }
        next = {
            ...next,
            sessionMemory,
        };
    }
    catch (error) {
        next = {
            ...next,
            sessionMemory: {
                schema: "ccm-group-session-memory-snapshot-v1",
                version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
                groupId,
                snapshotFile: (0, group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile)(snapshotScopeId),
                summaryFile: getGroupSessionMemoryMarkdownFile(snapshotScopeId),
                generatedAt: new Date().toISOString(),
                error: error?.message || String(error),
            },
        };
    }
    try {
        next = {
            ...next,
            toolContinuity: (0, group_tool_continuity_1.persistGroupToolContinuitySnapshot)(snapshotScopeId, next, { reason: "save_group_memory" }),
        };
    }
    catch (error) {
        next = {
            ...next,
            toolContinuity: {
                schema: "ccm-group-tool-continuity-snapshot-v1",
                version: group_memory_shared_1.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
                groupId,
                snapshotFile: (0, group_tool_continuity_1.getGroupToolContinuitySnapshotFile)(snapshotScopeId),
                summaryFile: (0, group_tool_continuity_1.getGroupToolContinuityMarkdownFile)(snapshotScopeId),
                generatedAt: new Date().toISOString(),
                shouldReuseAsContext: true,
                shouldBypassAuthorization: false,
                error: error?.message || String(error),
            },
        };
    }
    const backup = getGroupMemoryBackupFile(groupId, resolvedSessionId);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    if (fs.existsSync(file)) {
        try {
            JSON.parse(fs.readFileSync(file, "utf-8"));
            fs.copyFileSync(file, backup);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(temp, file);
    try {
        (0, group_memory_boundary_journal_1.commitGroupMemoryCompactBoundary)({
            groupId,
            sessionId: resolvedSessionId,
            memory: next,
            boundary: next.compactBoundary,
            messages: (0, storage_1.getGroupMessages)(groupId, resolvedSessionId).filter((message) => !String(message?.content || "").startsWith("📤")),
            transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, resolvedSessionId),
        });
    }
    catch { }
    return next;
}
function deleteGroupSessionMemoryArtifacts(groupId, sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId)
        throw new Error("缺少群聊会话 ID");
    const scopeId = cleanSessionId === "default" ? groupId : `${groupId}--${cleanSessionId}`;
    const files = [
        getGroupMemoryFile(groupId, cleanSessionId),
        `${getGroupMemoryFile(groupId, cleanSessionId)}.bak`,
        (0, group_compact_file_references_1.getGroupCompactFileReferenceLedgerFile)(scopeId),
        `${(0, group_compact_file_references_1.getGroupCompactFileReferenceLedgerFile)(scopeId)}.bak`,
        getGroupMemoryReloadLedgerFile(groupId, cleanSessionId),
        `${getGroupMemoryReloadLedgerFile(groupId, cleanSessionId)}.bak`,
        getGroupPostCompactDispatchLedgerFile(groupId, cleanSessionId),
        `${getGroupPostCompactDispatchLedgerFile(groupId, cleanSessionId)}.bak`,
        (0, group_compact_file_references_1.getGroupPostCompactCandidateUsageLedgerFile)(groupId, cleanSessionId),
        `${(0, group_compact_file_references_1.getGroupPostCompactCandidateUsageLedgerFile)(groupId, cleanSessionId)}.bak`,
        (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId, cleanSessionId),
        `${(0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId, cleanSessionId)}.bak`,
        (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId, cleanSessionId),
        `${(0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId, cleanSessionId)}.bak`,
        (0, provider_native_compact_execution_receipt_1.getProviderNativeCompactExecutionReceiptLedgerFile)(groupId, cleanSessionId),
        `${(0, provider_native_compact_execution_receipt_1.getProviderNativeCompactExecutionReceiptLedgerFile)(groupId, cleanSessionId)}.bak`,
        getGroupReplayRepairLedgerFile(groupId, cleanSessionId),
        `${getGroupReplayRepairLedgerFile(groupId, cleanSessionId)}.bak`,
        getGroupReplayRepairWorkItemsFile(groupId, cleanSessionId),
        `${getGroupReplayRepairWorkItemsFile(groupId, cleanSessionId)}.bak`,
    ];
    let deletedFiles = 0;
    for (const file of files) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                deletedFiles += 1;
            }
        }
        catch { }
    }
    const directories = [
        { root: group_memory_shared_1.GROUP_SESSION_MEMORY_DIR, target: path.join(group_memory_shared_1.GROUP_SESSION_MEMORY_DIR, scopeId) },
        { root: group_memory_shared_1.GROUP_TOOL_CONTINUITY_DIR, target: path.join(group_memory_shared_1.GROUP_TOOL_CONTINUITY_DIR, scopeId) },
        { root: path.dirname((0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId)), target: (0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId) },
    ];
    for (const item of directories) {
        try {
            deletedFiles += (0, group_memory_shared_1.removeSessionDirectoryWithin)(item.root, item.target);
        }
        catch { }
    }
    let typedMemoryDispatchWalDeleted = 0;
    if (cleanSessionId.startsWith("gcs_")) {
        try {
            typedMemoryDispatchWalDeleted = (0, group_memory_shared_1.removeSessionDirectoryWithin)(typed_memory_dispatch_wal_1.TYPED_MEMORY_DISPATCH_WAL_DIR, (0, typed_memory_dispatch_wal_1.getTypedMemoryDispatchWalScopeDir)(groupId, cleanSessionId));
            deletedFiles += typedMemoryDispatchWalDeleted;
        }
        catch { }
    }
    const boundaryArtifacts = (0, group_memory_boundary_journal_1.deleteGroupMemoryBoundaryArtifacts)(groupId, cleanSessionId);
    deletedFiles += Number(boundaryArtifacts.deletedFiles || 0);
    const invocationLineageArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, task_agent_invocation_lineage_1.deleteTaskAgentInvocationLineageArtifacts)(groupId, cleanSessionId)
        : { deleted: 0, recoveryDeleted: 0 };
    const recoveryDeleted = "recoveryDeleted" in invocationLineageArtifacts
        ? invocationLineageArtifacts.recoveryDeleted
        : 0;
    deletedFiles += Number(invocationLineageArtifacts.deleted || 0) + Number(recoveryDeleted || 0);
    const continuationSoakArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, task_agent_continuation_soak_1.deleteTaskAgentContinuationSoakArtifacts)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(continuationSoakArtifacts.deleted || 0);
    const compactHeadArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_compact_head_1.deleteGroupCompactHead)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(compactHeadArtifacts.deleted || 0);
    const providerNativeCompactSessionCapacityArtifacts = (0, provider_native_compact_session_capacity_1.deleteProviderNativeCompactSessionCapacity)(groupId, cleanSessionId);
    deletedFiles += Number(providerNativeCompactSessionCapacityArtifacts.deleted || 0);
    const autoCompactCircuitBreakerArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_memory_auto_compact_circuit_breaker_1.deleteGroupMemoryAutoCompactCircuitBreaker)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(autoCompactCircuitBreakerArtifacts.deleted || 0);
    const compactionActivityArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_compaction_activity_1.deleteGroupCompactionActivity)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(compactionActivityArtifacts.deleted || 0);
    const reactiveCompactRetryOwnershipArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_reactive_compact_retry_ownership_1.deleteGroupReactiveCompactRetryOwnership)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(reactiveCompactRetryOwnershipArtifacts.deleted || 0);
    const finalDispatchContextCollapseArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, final_dispatch_context_collapse_1.deleteFinalDispatchContextCollapse)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(finalDispatchContextCollapseArtifacts.deleted || 0);
    const promptCacheBreakDetectionArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_prompt_cache_break_detection_1.deleteGroupPromptCacheBreakDetection)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(promptCacheBreakDetectionArtifacts.deleted || 0);
    const workerContextCompactSessionArtifacts = cleanSessionId.startsWith("gcs_")
        ? (0, group_orchestrator_1.deleteWorkerContextCompactSessionArtifactsForCoordinator)(groupId, cleanSessionId)
        : { deleted: 0 };
    deletedFiles += Number(workerContextCompactSessionArtifacts.deleted || 0);
    const conflictResolutionMaintenanceSchedulerArtifacts = cleanSessionId.startsWith("gcs_")
        ? (() => {
            try {
                const { deleteConflictResolutionMemoryMaintenanceSchedulerSessionState } = require("../scheduling/cron");
                return deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId, cleanSessionId);
            }
            catch (error) {
                return { removed: false, error: String(error?.message || error) };
            }
        })()
        : { removed: false };
    return {
        schema: "ccm-group-session-memory-artifact-delete-v1",
        groupId,
        sessionId: cleanSessionId,
        scopeId,
        deletedFiles,
        boundaryArtifacts,
        typedMemoryDispatchWalArtifacts: { deletedFiles: typedMemoryDispatchWalDeleted },
        invocationLineageArtifacts,
        continuationSoakArtifacts,
        compactHeadArtifacts,
        providerNativeCompactSessionCapacityArtifacts,
        autoCompactCircuitBreakerArtifacts,
        compactionActivityArtifacts,
        reactiveCompactRetryOwnershipArtifacts,
        promptCacheBreakDetectionArtifacts,
        workerContextCompactSessionArtifacts,
        conflictResolutionMaintenanceSchedulerArtifacts,
        deletedAt: new Date().toISOString(),
    };
}
function persistGroupMemoryResumeEffectiveTokenBaseline(groupId, groupSessionId, allMessages, memory, projection, options = {}) {
    const baseline = (0, group_memory_shared_1.buildGroupMemoryResumeEffectiveTokenBaseline)(projection, memory, allMessages, options);
    if (!baseline || !(0, group_memory_shared_1.validateGroupMemoryResumeEffectiveTokenBaseline)(baseline))
        return { memory, baseline: null, cadenceDecision: null };
    const sessionMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const previousSessionMemory = (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(sessionMemoryScopeId) || memory?.sessionMemory || {};
    const previousCadence = previousSessionMemory?.updateCadence || previousSessionMemory?.update_cadence || {};
    const previousTokensAtLastExtraction = Math.max(0, Number(previousCadence.tokensAtLastExtraction || 0));
    const cadenceRebased = previousTokensAtLastExtraction > baseline.effectiveContextTokens;
    const cadenceDecision = {
        ...(0, group_session_memory_snapshot_1.evaluateGroupSessionMemoryUpdateCadence)(projection.projectedMessages || [], {
            ...previousSessionMemory,
            updateCadence: {
                ...previousCadence,
                tokensAtLastExtraction: cadenceRebased ? baseline.effectiveContextTokens : previousTokensAtLastExtraction,
            },
        }, { ...options, currentContextTokens: baseline.effectiveContextTokens }),
        tokenBasis: "verified_resume_effective_context",
        resumeBaselineId: baseline.baselineId,
        resumeBaselineChecksum: baseline.baselineChecksum,
        rawTranscriptTokens: baseline.rawTranscriptTokens,
        effectiveContextTokens: baseline.effectiveContextTokens,
        cadenceRebased,
        previousTokensAtLastExtraction,
    };
    const saved = saveGroupMemory(groupId, {
        ...memory,
        compaction: {
            ...(memory?.compaction || {}),
            resumeEffectiveTokenBaseline: baseline,
            contextPressureWarning: baseline.pressureWarning,
            compactWarning: baseline.pressureWarning,
            lastPressureSampleAt: baseline.observedAt,
        },
        messageCompression: {
            ...(memory?.messageCompression || {}),
            resumeEffectiveTokenBaseline: baseline,
            contextPressureWarning: baseline.pressureWarning,
        },
    }, groupSessionId, { sessionMemoryCadenceDecision: cadenceDecision });
    return { memory: saved, baseline, cadenceDecision };
}
function hashGroupMemoryFileWindow(file, stat, maxBytes = 256_000) {
    const hash = crypto.createHash("sha256");
    if (stat.size <= maxBytes) {
        const content = fs.readFileSync(file);
        hash.update(content);
        return {
            checksum: hash.digest("hex").slice(0, 24),
            checksumMode: "full",
            lineCount: content.toString("utf-8").split(/\n/).length,
        };
    }
    const headBytes = Math.max(1, Math.floor(maxBytes / 2));
    const tailBytes = Math.max(1, maxBytes - headBytes);
    const fd = fs.openSync(file, "r");
    try {
        const head = Buffer.alloc(headBytes);
        const tail = Buffer.alloc(tailBytes);
        const headRead = fs.readSync(fd, head, 0, headBytes, 0);
        const tailRead = fs.readSync(fd, tail, 0, tailBytes, Math.max(0, stat.size - tailBytes));
        hash.update(`head_tail:${stat.size}:${stat.mtimeMs}:`);
        hash.update(head.subarray(0, headRead));
        hash.update(tail.subarray(0, tailRead));
        return { checksum: hash.digest("hex").slice(0, 24), checksumMode: "head_tail", lineCount: 0 };
    }
    finally {
        try {
            fs.closeSync(fd);
        }
        catch { }
    }
}
//# sourceMappingURL=group-memory-storage.js.map