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
exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION = exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION = void 0;
exports.getGroupMemoryFile = getGroupMemoryFile;
exports.getGroupPostCompactDispatchLedgerFile = getGroupPostCompactDispatchLedgerFile;
exports.getGroupPostCompactCandidateUsageLedgerFile = getGroupPostCompactCandidateUsageLedgerFile;
exports.getGroupApiMicrocompactNativeApplyProofLedgerFile = getGroupApiMicrocompactNativeApplyProofLedgerFile;
exports.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile;
exports.getGroupSessionMemorySnapshotFile = getGroupSessionMemorySnapshotFile;
exports.getGroupSessionMemoryMarkdownFile = getGroupSessionMemoryMarkdownFile;
exports.getGroupToolContinuitySnapshotFile = getGroupToolContinuitySnapshotFile;
exports.getGroupToolContinuityMarkdownFile = getGroupToolContinuityMarkdownFile;
exports.getGroupCompactFileReferenceLedgerFile = getGroupCompactFileReferenceLedgerFile;
exports.getGroupGlobalMemoryArbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile;
exports.readGroupReplayRepairDispatchCandidatesSummary = readGroupReplayRepairDispatchCandidatesSummary;
exports.createEmptyGroupMemory = createEmptyGroupMemory;
exports.loadGroupMemory = loadGroupMemory;
exports.saveGroupMemory = saveGroupMemory;
exports.runGroupMemoryStorageRecoverySelfTest = runGroupMemoryStorageRecoverySelfTest;
exports.uniqueByKey = uniqueByKey;
exports.compactMemoryText = compactMemoryText;
exports.compactPreserveLines = compactPreserveLines;
exports.buildChildGlobalAgentMemoryHealthGate = buildChildGlobalAgentMemoryHealthGate;
exports.readGroupGlobalMemoryArbitrationLedger = readGroupGlobalMemoryArbitrationLedger;
exports.recordGroupGlobalMemoryArbitrationLedger = recordGroupGlobalMemoryArbitrationLedger;
exports.distillGroupGlobalMemoryArbitrationToTypedMemory = distillGroupGlobalMemoryArbitrationToTypedMemory;
exports.persistGroupSessionMemorySnapshot = persistGroupSessionMemorySnapshot;
exports.readGroupSessionMemorySnapshotSummary = readGroupSessionMemorySnapshotSummary;
exports.persistGroupToolContinuitySnapshot = persistGroupToolContinuitySnapshot;
exports.readGroupToolContinuitySnapshotSummary = readGroupToolContinuitySnapshotSummary;
exports.buildGroupCompactFileReferences = buildGroupCompactFileReferences;
exports.buildGroupCompactFileReferenceReadPlan = buildGroupCompactFileReferenceReadPlan;
exports.readGroupCompactFileReferenceLedger = readGroupCompactFileReferenceLedger;
exports.recordGroupCompactFileReferenceSurfacing = recordGroupCompactFileReferenceSurfacing;
exports.summarizeGroupCompactFileReferenceAccess = summarizeGroupCompactFileReferenceAccess;
exports.summarizeGroupCompactFileReferenceReadPlanAccess = summarizeGroupCompactFileReferenceReadPlanAccess;
exports.summarizeGroupCompactFileReferenceReadPlanFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness;
exports.latestGroupCompactFileReferenceReadPlanRows = latestGroupCompactFileReferenceReadPlanRows;
exports.latestGroupCompactFileReferenceReadPlanRevalidationGate = latestGroupCompactFileReferenceReadPlanRevalidationGate;
exports.buildGroupCompactFileReferenceReadPlanRevalidationGate = buildGroupCompactFileReferenceReadPlanRevalidationGate;
exports.buildGroupMemoryContext = buildGroupMemoryContext;
exports.buildGroupMemorySourceManifest = buildGroupMemorySourceManifest;
exports.readGroupPostCompactDispatchLedger = readGroupPostCompactDispatchLedger;
exports.readGroupPostCompactCandidateUsageLedger = readGroupPostCompactCandidateUsageLedger;
exports.readGroupApiMicrocompactNativeApplyProofLedger = readGroupApiMicrocompactNativeApplyProofLedger;
exports.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger;
exports.recordGroupPostCompactCandidateUsageLedger = recordGroupPostCompactCandidateUsageLedger;
exports.buildGroupPostCompactCandidateUsageSummary = buildGroupPostCompactCandidateUsageSummary;
exports.buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow = buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow;
exports.recordGroupApiMicrocompactNativeApplyAdapterTelemetry = recordGroupApiMicrocompactNativeApplyAdapterTelemetry;
exports.recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger = recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger;
exports.buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary = buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary;
exports.recordGroupApiMicrocompactNativeApplyProofLedger = recordGroupApiMicrocompactNativeApplyProofLedger;
exports.buildGroupApiMicrocompactNativeApplyProofSummary = buildGroupApiMicrocompactNativeApplyProofSummary;
exports.recordGroupMemoryReloadAudit = recordGroupMemoryReloadAudit;
exports.scheduleGroupMemoryAutoCompaction = scheduleGroupMemoryAutoCompaction;
exports.runGroupMemoryAutoCompactionNow = runGroupMemoryAutoCompactionNow;
exports.ensureGroupMemoryAutoCompactionHook = ensureGroupMemoryAutoCompactionHook;
exports.runGroupMemoryAutoCompactionSelfTest = runGroupMemoryAutoCompactionSelfTest;
exports.buildAgentMemoryContextBundle = buildAgentMemoryContextBundle;
exports.renderGroupMemoryContextBundle = renderGroupMemoryContextBundle;
exports.buildAgentMemoryPacket = buildAgentMemoryPacket;
exports.buildGlobalGroupMemoryContext = buildGlobalGroupMemoryContext;
exports.renderGlobalGroupMemoryContextBundle = renderGlobalGroupMemoryContextBundle;
exports.runGlobalGroupMemoryContextSelfTest = runGlobalGroupMemoryContextSelfTest;
exports.runGroupCompactFileReferenceReadPlanSelfTest = runGroupCompactFileReferenceReadPlanSelfTest;
exports.runGroupMemorySourceManifestSelfTest = runGroupMemorySourceManifestSelfTest;
exports.runGroupMemoryReloadAuditSelfTest = runGroupMemoryReloadAuditSelfTest;
exports.runGroupMemorySourceChangeReloadSelfTest = runGroupMemorySourceChangeReloadSelfTest;
exports.runGroupMemoryDispatchFreshnessGateSelfTest = runGroupMemoryDispatchFreshnessGateSelfTest;
exports.runGroupPostCompactFirstDispatchMarkerSelfTest = runGroupPostCompactFirstDispatchMarkerSelfTest;
exports.runGroupPostCompactCandidateUsageLedgerSelfTest = runGroupPostCompactCandidateUsageLedgerSelfTest;
exports.runGroupProjectMemoryImportContextSelfTest = runGroupProjectMemoryImportContextSelfTest;
exports.runGroupGlobalClaudeMemoryImportContextSelfTest = runGroupGlobalClaudeMemoryImportContextSelfTest;
exports.runGroupGlobalAgentMemoryBridgeContextSelfTest = runGroupGlobalAgentMemoryBridgeContextSelfTest;
exports.runGroupGlobalAgentMemoryHealthGateSelfTest = runGroupGlobalAgentMemoryHealthGateSelfTest;
exports.runGroupGlobalAgentMemoryArbitrationContextSelfTest = runGroupGlobalAgentMemoryArbitrationContextSelfTest;
exports.runGroupGlobalAgentMemorySemanticArbitrationSelfTest = runGroupGlobalAgentMemorySemanticArbitrationSelfTest;
exports.runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest = runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest;
exports.runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest = runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest;
exports.runGroupTypedMemoryContextSelfTest = runGroupTypedMemoryContextSelfTest;
exports.buildGroupContextPacket = buildGroupContextPacket;
exports.findLatestWorkerLedger = findLatestWorkerLedger;
exports.appendWorkerLedger = appendWorkerLedger;
exports.updateGroupMemory = updateGroupMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const context_budget_1 = require("../../system/context-budget");
const tool_authorization_1 = require("../../tools/tool-authorization");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const memory_1 = require("../../agents/global/memory");
const GROUP_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory");
exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION = 1;
exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION = 1;
exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = 1;
exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = 1;
exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = 1;
exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = 1;
exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = 1;
exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = 1;
exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = 1;
const GROUP_MEMORY_RELOAD_DIR = path.join(utils_1.CCM_DIR, "group-memory-reload");
const GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR = path.join(utils_1.CCM_DIR, "group-memory-post-compact-dispatch");
const GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR = path.join(utils_1.CCM_DIR, "group-memory-post-compact-candidate-usage");
const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-proof");
const GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-request-telemetry");
const GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair");
const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-work-items");
const GROUP_SESSION_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-session-memory");
const GROUP_TOOL_CONTINUITY_DIR = path.join(utils_1.CCM_DIR, "group-tool-continuity");
const GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(utils_1.CCM_DIR, "group-memory-file-references");
const GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(utils_1.CCM_DIR, "group-global-memory-arbitration");
function getGroupMemoryFile(groupId) {
    return path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
}
function getGroupMemoryReloadLedgerFile(groupId) {
    return path.join(GROUP_MEMORY_RELOAD_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-")}.json`);
}
function getGroupPostCompactDispatchLedgerFile(groupId) {
    return path.join(GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-")}.json`);
}
function getGroupPostCompactCandidateUsageLedgerFile(groupId) {
    return path.join(GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-")}.json`);
}
function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId) {
    return path.join(GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId) {
    return path.join(GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function getGroupReplayRepairLedgerFile(groupId) {
    return path.join(GROUP_MEMORY_REPLAY_REPAIR_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function getGroupReplayRepairWorkItemsFile(groupId) {
    return path.join(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function getGroupSessionMemoryDir(groupId) {
    return path.join(GROUP_SESSION_MEMORY_DIR, String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
}
function getGroupToolContinuityDir(groupId) {
    return path.join(GROUP_TOOL_CONTINUITY_DIR, String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
}
function getGroupSessionMemorySnapshotFile(groupId) {
    return path.join(getGroupSessionMemoryDir(groupId), "snapshot.json");
}
function getGroupSessionMemoryMarkdownFile(groupId) {
    return path.join(getGroupSessionMemoryDir(groupId), "summary.md");
}
function getGroupToolContinuitySnapshotFile(groupId) {
    return path.join(getGroupToolContinuityDir(groupId), "snapshot.json");
}
function getGroupToolContinuityMarkdownFile(groupId) {
    return path.join(getGroupToolContinuityDir(groupId), "summary.md");
}
function getGroupCompactFileReferenceLedgerFile(groupId) {
    return path.join(GROUP_COMPACT_FILE_REFERENCE_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function getGroupGlobalMemoryArbitrationLedgerFile(groupId) {
    return path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function readGroupReplayRepairLedgerSummary(groupId) {
    const file = getGroupReplayRepairLedgerFile(groupId);
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
function readGroupReplayRepairWorkItemsSummary(groupId) {
    const file = getGroupReplayRepairWorkItemsFile(groupId);
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
                instruction: compactMemoryText(item.instruction || item.description || "", 260),
                expected: compactMemoryText(item.expected || "", 160),
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
                instruction: compactMemoryText(item.instruction || item.description || "", 260),
                expected: compactMemoryText(item.expected || "", 160),
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
function readGroupReplayRepairDispatchCandidatesSummary(groupId, limit = 12) {
    const file = getGroupReplayRepairWorkItemsFile(groupId);
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
            const dispatchTarget = compactMemoryText(item.dispatch_target || item.dispatchTarget || "", 120);
            const targetProject = compactMemoryText(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
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
                request_telemetry_status: item.request_telemetry_status || "",
                request_telemetry_session_status: item.request_telemetry_session_status || "",
                request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
                runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
                instruction: compactMemoryText(item.instruction || item.description || "", 360),
                expected: compactMemoryText(item.expected || "", 200),
                prompt_patch: compactMemoryText(item.prompt_patch || "", 900),
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
function buildGroupCompactBoundaryHistorySummary(memory = {}) {
    const boundaries = Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : [];
    if (!boundaries.length)
        return null;
    const rows = boundaries.slice(-8).map((boundary, index) => ({
        index,
        id: String(boundary.id || boundary.boundary_id || boundary.summaryChecksum || boundary.summary_checksum || boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || `boundary-${index}`),
        summaryChecksum: String(boundary.summaryChecksum || boundary.summary_checksum || ""),
        summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || ""),
        compactedMessageCount: Number(boundary.summarizedMessageCount || boundary.summarized_message_count || boundary.compactedMessageCount || boundary.compacted_message_count || 0),
        preCompactTokenCount: Number(boundary.preCompactTokenCount || boundary.pre_compact_token_count || 0),
        postCompactTokenCount: Number(boundary.postCompactTokenCount || boundary.post_compact_token_count || 0),
    }));
    return {
        schema: "ccm-compact-boundary-history-summary-v1",
        boundaryCount: rows.length,
        latest: rows[rows.length - 1] || null,
        rows,
    };
}
function buildChildAgentTypeSummary(memory = {}) {
    const typeMap = new Map();
    const normalize = (value) => {
        const raw = String(value || "").trim().toLowerCase();
        if (!raw)
            return "unknown";
        if (/(claude|claudecode|claude-code|cc\b)/i.test(raw))
            return "claudecode";
        if (/cursor/i.test(raw))
            return "cursor";
        if (/codex/i.test(raw))
            return "codex";
        return raw.replace(/[^a-z0-9._:-]+/g, "-").slice(0, 80) || "unknown";
    };
    const add = (project, agentType, source = "memory") => {
        const targetProject = String(project || "").trim();
        if (!targetProject)
            return;
        const type = normalize(agentType || targetProject);
        const row = typeMap.get(type) || { agentType: type, targetCount: 0, targets: [] };
        if (!row.targets.some((item) => item.targetProject === targetProject)) {
            row.targetCount++;
            row.targets.push({ targetProject, source, rawAgentType: String(agentType || "").trim() });
        }
        typeMap.set(type, row);
    };
    for (const [project, agentMemory] of Object.entries(memory?.agentMemories || {})) {
        add(project, agentMemory?.agentType || agentMemory?.agent_type || agentMemory?.agent || "", "agent_memory");
    }
    for (const entry of Array.isArray(memory?.workerLedger) ? memory.workerLedger.slice(-30) : []) {
        add(entry.project || entry.target_project || entry.agent, entry.agentType || entry.agent_type || entry.runner || "", "worker_ledger");
    }
    const rows = Array.from(typeMap.values()).sort((a, b) => String(a.agentType).localeCompare(String(b.agentType)));
    if (!rows.length)
        return null;
    return {
        schema: "ccm-child-agent-type-summary-v1",
        agentTypeCount: rows.length,
        targetCount: rows.reduce((sum, row) => sum + Number(row.targetCount || 0), 0),
        rows,
    };
}
function getGroupMemoryBackupFile(groupId) {
    return `${getGroupMemoryFile(groupId)}.bak`;
}
function createEmptyGroupMemory(groupId) {
    return {
        groupId,
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
function loadGroupMemory(groupId) {
    const file = getGroupMemoryFile(groupId);
    if (!fs.existsSync(file))
        return createEmptyGroupMemory(groupId);
    try {
        return { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
    }
    catch {
        const backup = getGroupMemoryBackupFile(groupId);
        try {
            const recovered = { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(backup, "utf-8")) };
            const temp = `${file}.${process.pid}.recover.tmp`;
            fs.writeFileSync(temp, JSON.stringify(recovered, null, 2), "utf-8");
            fs.renameSync(temp, file);
            return recovered;
        }
        catch { }
        return createEmptyGroupMemory(groupId);
    }
}
function saveGroupMemory(groupId, memory) {
    if (!fs.existsSync(GROUP_MEMORY_DIR))
        fs.mkdirSync(GROUP_MEMORY_DIR, { recursive: true });
    let next = compressGroupMemory({
        ...createEmptyGroupMemory(groupId),
        ...(memory || {}),
        groupId,
        updated_at: new Date().toISOString(),
    });
    try {
        next = {
            ...next,
            sessionMemory: persistGroupSessionMemorySnapshot(groupId, next, { reason: "save_group_memory" }),
        };
    }
    catch (error) {
        next = {
            ...next,
            sessionMemory: {
                schema: "ccm-group-session-memory-snapshot-v1",
                version: exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
                groupId,
                snapshotFile: getGroupSessionMemorySnapshotFile(groupId),
                summaryFile: getGroupSessionMemoryMarkdownFile(groupId),
                generatedAt: new Date().toISOString(),
                error: error?.message || String(error),
            },
        };
    }
    try {
        next = {
            ...next,
            toolContinuity: persistGroupToolContinuitySnapshot(groupId, next, { reason: "save_group_memory" }),
        };
    }
    catch (error) {
        next = {
            ...next,
            toolContinuity: {
                schema: "ccm-group-tool-continuity-snapshot-v1",
                version: exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
                groupId,
                snapshotFile: getGroupToolContinuitySnapshotFile(groupId),
                summaryFile: getGroupToolContinuityMarkdownFile(groupId),
                generatedAt: new Date().toISOString(),
                shouldReuseAsContext: true,
                shouldBypassAuthorization: false,
                error: error?.message || String(error),
            },
        };
    }
    const file = getGroupMemoryFile(groupId);
    const backup = getGroupMemoryBackupFile(groupId);
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
    return next;
}
function runGroupMemoryStorageRecoverySelfTest() {
    const groupId = `memory-storage-self-test-${process.pid}-${Date.now()}`;
    const file = getGroupMemoryFile(groupId);
    const backup = getGroupMemoryBackupFile(groupId);
    try {
        const first = saveGroupMemory(groupId, { goal: "first-valid-state", decisions: [{ decision: "keep" }] });
        saveGroupMemory(groupId, { goal: "second-valid-state" });
        fs.writeFileSync(file, "{broken-json", "utf-8");
        const recovered = loadGroupMemory(groupId);
        const checks = {
            atomicFileIsValidJson: (() => { try {
                JSON.parse(fs.readFileSync(file, "utf-8"));
                return true;
            }
            catch {
                return false;
            } })(),
            backupRecoveryWorks: recovered.goal === first.goal && recovered.decisions?.[0]?.decision === "keep",
            backupExists: fs.existsSync(backup),
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        for (const target of [file, backup])
            try {
                fs.unlinkSync(target);
            }
            catch { }
    }
}
function uniqueByKey(items, keyFn, limit = 20) {
    const seen = new Set();
    const result = [];
    for (const item of [...(items || [])].reverse()) {
        const key = keyFn(item);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.unshift(item);
    }
    return result.slice(-limit);
}
function compactMemoryText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function compactPreserveLines(value, max = 2200) {
    const text = String(value || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(line => line.replace(/[ \t]+$/g, ""))
        .join("\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();
    return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}
function buildChildGlobalAgentMemoryHealthGate(input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const selftestBypass = input.allowSelftestGlobalMemoryForSelfTest === true || input.allow_selftest_global_memory_for_selftest === true;
    let scan = null;
    let error = "";
    try {
        scan = (0, memory_1.scanGlobalAgentMemorySelfTestContamination)({
            includeResidue: input.includeResidue !== false && input.include_residue !== false,
            limit: input.limit || 40,
        });
    }
    catch (err) {
        error = err?.message || String(err);
    }
    const activeCount = Number(scan?.active_contamination_count || 0);
    const residueCount = Number(scan?.residue_contamination_count || 0);
    const status = selftestBypass ? "ok" : error ? "fail" : activeCount > 0 ? "fail" : residueCount > 0 ? "warn" : "ok";
    const action = status === "fail"
        ? "block_global_agent_memory_recall"
        : status === "warn"
            ? "use_active_global_memory_with_residue_warning"
            : selftestBypass
                ? "allow_global_agent_memory_recall_for_selftest_fixture"
                : "allow_global_agent_memory_recall";
    const summarizeRow = (row = {}) => ({
        file: row.file || "",
        role: row.role || "",
        kind: row.kind || "",
        id: row.id || "",
        active: row.active === true,
    });
    const rows = Array.isArray(scan?.rows) ? scan.rows : [];
    const gate = {
        schema: "ccm-child-global-agent-memory-health-gate-v1",
        version: exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION,
        gate_id: `ggmh_${crypto.createHash("sha256").update(JSON.stringify([
            input.groupId || input.group_id || "",
            input.targetProject || input.target_project || "",
            input.task || input.query || "",
            activeCount,
            residueCount,
            scan?.generatedAt || generatedAt,
        ])).digest("hex").slice(0, 18)}`,
        generated_at: generatedAt,
        group_id: String(input.groupId || input.group_id || ""),
        target_project: String(input.targetProject || input.target_project || ""),
        status,
        pass: status !== "fail",
        action,
        selftest_bypass: selftestBypass,
        file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
        scan_status: scan?.status || (error ? "error" : "unknown"),
        active_contamination_count: activeCount,
        residue_contamination_count: residueCount,
        error: compactMemoryText(error, 420),
        active_rows: rows.filter((row) => row.active === true).slice(0, 8).map(summarizeRow),
        residue_rows: rows.filter((row) => row.active !== true).slice(0, 8).map(summarizeRow),
        policy: {
            fail_blocks_global_memory_recall: true,
            residue_warn_allows_active_memory: true,
            child_agent_must_verify_current_source: true,
            no_contaminated_preview_in_context: true,
        },
        receipt_contract: {
            required_fields: ["globalMemoryUsage", "memoryUsed", "memoryIgnored"],
            on_fail: "memoryIgnored must mention this gate and no global_memory_id should be used",
            on_warn: "globalMemoryUsage may use active memory but should acknowledge residue warning if relevant",
        },
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 5000, maxTokens: 12_000 }),
    };
}
function buildChildGlobalAgentMemoryContext(query, options = {}) {
    if (options.includeGlobalAgentMemory === false || options.include_global_agent_memory === false) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: false,
            reason: "disabled_by_options",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options)) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: true,
            reason: "user_requested_ignore_memory",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    const memoryHealthGate = buildChildGlobalAgentMemoryHealthGate({
        groupId: options.groupId || options.group_id,
        targetProject: options.targetProject || options.target_project,
        query,
        generatedAt: options.generatedAt || options.generated_at,
        allowSelftestGlobalMemoryForSelfTest: options.allowSelftestGlobalMemoryForSelfTest || options.allow_selftest_global_memory_for_selftest,
    });
    if (memoryHealthGate.status === "fail") {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            version: 1,
            included: false,
            ignored: false,
            healthBlocked: true,
            reason: "global_agent_memory_health_gate_failed",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            memory_health_gate: memoryHealthGate,
            arbitration: {
                schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
                status: "health_blocked",
                localEvidenceCount: 0,
                demotedCount: 0,
                conflictCount: 0,
                crossGroupSuppressedCount: 0,
                crossGroupScannedLedgerCount: 0,
                activeCount: 0,
                authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
            },
            crossGroupSuppression: {
                schema: "ccm-cross-group-global-memory-suppression-summary-v1",
                sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
                scannedLedgerCount: 0,
                indexedMemoryCount: 0,
                suppressedCount: 0,
                advisoryCount: 0,
                supersededCount: 0,
                decayedCount: 0,
                conflictCount: 0,
                demotedCount: 0,
                items: [],
                advisoryItems: [],
            },
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    const recall = (0, memory_1.recallGlobalAgentMemory)(query, {
        sessionId: options.globalAgentSessionId || options.global_agent_session_id || options.sessionId || options.session_id,
        limit: Number(options.maxGlobalAgentMemory || options.max_global_agent_memory || 5),
    });
    if (recall?.ignored) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: true,
            reason: "user_requested_ignore_memory",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
            memory_health_gate: memoryHealthGate,
        };
    }
    const currentGroupId = String(options.groupId || options.group_id || "");
    const localEvidence = collectChildGlobalMemoryLocalEvidence(options);
    const crossGroupSuppressionIndex = buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId, options);
    const items = (Array.isArray(recall?.items) ? recall.items : []).slice(0, 8).map((item) => {
        const source = item.source || {};
        const crossGroupSuppression = buildCrossGroupGlobalMemorySuppressionForItem(item, crossGroupSuppressionIndex, options);
        const arbitration = applyCrossGroupGlobalMemorySuppression(arbitrateChildGlobalAgentMemoryItem(item, localEvidence), crossGroupSuppression);
        return {
            id: item.id || "",
            type: item.type || "",
            text: compactMemoryText(item.text || "", 900),
            why: compactMemoryText(item.why || "", 320),
            howToApply: compactMemoryText(item.howToApply || item.how_to_apply || "", 360),
            importance: Number(item.importance || 0),
            confidence: Number(item.confidence || 0),
            score: Math.round(Number(item.score || 0) * 10) / 10,
            matchedTerms: (Array.isArray(item.matchedTerms) ? item.matchedTerms : []).slice(0, 12),
            updatedAt: item.updatedAt || item.createdAt || "",
            source: {
                sessionId: source.sessionId || "",
                messageIds: (Array.isArray(source.messageIds) ? source.messageIds : []).slice(0, 8),
                missionId: source.missionId || "",
                traceId: source.traceId || "",
                source: source.source || "",
                timestamp: source.timestamp || "",
            },
            arbitration,
            crossGroupSuppression,
        };
    });
    const demotedItems = items.filter((item) => item.arbitration?.demoted === true);
    const conflictItems = items.filter((item) => item.arbitration?.conflict === true);
    const crossGroupSuppressedItems = items.filter((item) => item.crossGroupSuppression?.suppressed === true);
    const crossGroupSuppressionSummary = summarizeCrossGroupGlobalMemorySuppression(items, crossGroupSuppressionIndex);
    return {
        schema: "ccm-child-global-agent-memory-recall-v1",
        version: 1,
        included: items.length > 0,
        ignored: false,
        reason: conflictItems.length ? "global_memory_conflicts_with_newer_group_evidence"
            : crossGroupSuppressedItems.length ? "global_memory_suppressed_by_cross_group_arbitration"
                : demotedItems.length ? "global_memory_demoted_by_newer_group_evidence"
                    : items.length ? "relevant_global_agent_memory" : "no_relevant_global_agent_memory",
        file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
        memory_health_gate: memoryHealthGate,
        sessionSummary: recall?.sessionSummary || null,
        boundary: recall?.boundary || null,
        arbitration: {
            schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
            status: conflictItems.length ? "conflict" : demotedItems.length ? "demoted" : items.length ? "ok" : "empty",
            localEvidenceCount: localEvidence.length,
            demotedCount: demotedItems.length,
            conflictCount: conflictItems.length,
            crossGroupSuppressedCount: crossGroupSuppressedItems.length,
            crossGroupScannedLedgerCount: crossGroupSuppressionSummary.scannedLedgerCount,
            activeCount: items.length - demotedItems.length,
            authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
        },
        crossGroupSuppression: crossGroupSuppressionSummary,
        items,
        citations: Array.isArray(recall?.citations) ? recall.citations.slice(0, 12) : [],
        itemCount: items.length,
    };
}
function hashSessionMemoryText(value, length = 16) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}
function globalMemorySuppressionKey(value = {}) {
    const id = String(value.globalMemoryId || value.global_memory_id || value.id || value.memoryId || value.memory_id || "").trim();
    if (id)
        return id;
    const text = [value.globalText, value.text, value.why, value.howToApply || value.how_to_apply].filter(Boolean).join("\n");
    return text ? `text:${hashSessionMemoryText(text, 18)}` : "";
}
function listGroupGlobalMemoryArbitrationLedgerFiles(limit = 80) {
    try {
        return fs.readdirSync(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
            .filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-"))
            .map(name => {
            const file = path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, name);
            try {
                const stat = fs.statSync(file);
                return stat.isFile() ? { file, mtimeMs: stat.mtimeMs } : null;
            }
            catch {
                return null;
            }
        })
            .filter(Boolean)
            .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
            .slice(0, Math.max(1, limit))
            .map((item) => item.file);
    }
    catch {
        return [];
    }
}
function buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId, options = {}) {
    if (options.includeCrossGroupGlobalMemorySuppression === false || options.include_cross_group_global_memory_suppression === false) {
        return {
            schema: "ccm-cross-group-global-memory-suppression-index-v1",
            enabled: false,
            currentGroupId,
            sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
            scannedLedgerCount: 0,
            itemCount: 0,
            items: [],
            byMemoryId: new Map(),
        };
    }
    const current = String(currentGroupId || "").trim();
    const maxLedgers = Math.max(10, Number(options.maxCrossGroupGlobalMemoryLedgers || options.max_cross_group_global_memory_ledgers || 80));
    const rows = new Map();
    let scannedLedgerCount = 0;
    for (const file of listGroupGlobalMemoryArbitrationLedgerFiles(maxLedgers)) {
        let ledger = null;
        try {
            ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        }
        catch {
            continue;
        }
        const ledgerGroupId = String(ledger?.groupId || path.basename(file, ".json") || "").trim();
        if (current && ledgerGroupId === current)
            continue;
        const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
        if (!entries.length)
            continue;
        scannedLedgerCount += 1;
        for (const entry of entries) {
            const key = globalMemorySuppressionKey(entry);
            if (!key)
                continue;
            const statusText = String(entry.status || "");
            const conflict = entry.conflict === true || /conflict/i.test(statusText);
            const demoted = entry.demoted === true || conflict || /demoted|suppress/i.test(statusText);
            if (!conflict && !demoted)
                continue;
            const occurrenceCount = Math.max(1, Number(entry.occurrenceCount || 1));
            const row = rows.get(key) || {
                schema: "ccm-cross-group-global-memory-suppression-row-v1",
                globalMemoryId: key,
                groupIds: new Set(),
                conflictGroupIds: new Set(),
                demotedGroupIds: new Set(),
                sourceLedgers: new Map(),
                typedMemoryDocs: new Map(),
                targetProjects: new Set(),
                totalOccurrenceCount: 0,
                conflictCount: 0,
                demotedCount: 0,
                latestEvidence: [],
            };
            row.groupIds.add(ledgerGroupId);
            if (entry.targetProject)
                row.targetProjects.add(String(entry.targetProject));
            row.totalOccurrenceCount += occurrenceCount;
            if (conflict) {
                row.conflictGroupIds.add(ledgerGroupId);
                row.conflictCount += occurrenceCount;
            }
            if (demoted) {
                row.demotedGroupIds.add(ledgerGroupId);
                row.demotedCount += occurrenceCount;
            }
            row.sourceLedgers.set(file, { file, groupId: ledgerGroupId });
            if (entry.typedMemoryDoc)
                row.typedMemoryDocs.set(String(entry.typedMemoryDoc), {
                    file: entry.typedMemoryDoc,
                    slug: entry.typedMemorySlug || "",
                    type: entry.typedMemoryType || "",
                });
            row.latestEvidence.push({
                groupId: ledgerGroupId,
                ledgerFile: file,
                status: entry.status || "",
                conflict,
                demoted,
                occurrenceCount,
                targetProject: entry.targetProject || "",
                lastSeenAt: entry.lastSeenAt || entry.at || "",
                localRuleText: compactMemoryText(entry.localRuleText || "", 260),
                globalText: compactMemoryText(entry.globalText || "", 260),
                typedMemoryDoc: entry.typedMemoryDoc || "",
            });
            rows.set(key, row);
        }
    }
    const items = [...rows.values()].map((row) => {
        const latestEvidence = row.latestEvidence
            .slice()
            .sort((a, b) => Date.parse(b.lastSeenAt || "") - Date.parse(a.lastSeenAt || ""))
            .slice(0, 6);
        return {
            schema: row.schema,
            globalMemoryId: row.globalMemoryId,
            groupCount: row.groupIds.size,
            groupIds: [...row.groupIds].slice(0, 12),
            conflictGroupCount: row.conflictGroupIds.size,
            conflictGroupIds: [...row.conflictGroupIds].slice(0, 12),
            demotedGroupCount: row.demotedGroupIds.size,
            demotedGroupIds: [...row.demotedGroupIds].slice(0, 12),
            totalOccurrenceCount: row.totalOccurrenceCount,
            conflictCount: row.conflictCount,
            demotedCount: row.demotedCount,
            targetProjects: [...row.targetProjects].slice(0, 12),
            sourceLedgers: [...row.sourceLedgers.values()].slice(0, 12),
            typedMemoryDocs: [...row.typedMemoryDocs.values()].slice(0, 12),
            latestEvidence,
            latestSeenAt: latestEvidence[0]?.lastSeenAt || "",
        };
    });
    return {
        schema: "ccm-cross-group-global-memory-suppression-index-v1",
        enabled: true,
        currentGroupId: current,
        sourceDir: GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount,
        itemCount: items.length,
        items,
        byMemoryId: new Map(items.map((item) => [item.globalMemoryId, item])),
    };
}
function buildCrossGroupGlobalMemorySuppressionForItem(item, index = {}, options = {}) {
    const key = globalMemorySuppressionKey(item);
    const row = key && index?.byMemoryId instanceof Map ? index.byMemoryId.get(key) : null;
    const conflictGroupThreshold = Math.max(1, Number(options.crossGroupGlobalMemoryConflictGroupThreshold || options.cross_group_global_memory_conflict_group_threshold || 1));
    const occurrenceThreshold = Math.max(2, Number(options.crossGroupGlobalMemoryOccurrenceThreshold || options.cross_group_global_memory_occurrence_threshold || 2));
    const rawSuppressed = !!row && (Number(row.conflictGroupCount || 0) >= conflictGroupThreshold
        || Number(row.totalOccurrenceCount || 0) >= occurrenceThreshold);
    const globalUpdatedAt = String(item.updatedAt || item.updated_at || item.source?.timestamp || item.createdAt || item.created_at || "");
    const globalUpdatedAtMs = Date.parse(globalUpdatedAt || "");
    const latestEvidenceAt = String(row?.latestSeenAt || "");
    const latestEvidenceAtMs = Date.parse(latestEvidenceAt || "");
    const newerGlobalGraceMs = Math.max(0, Number(options.crossGroupGlobalMemoryNewerGraceMs || options.cross_group_global_memory_newer_grace_ms || 1000));
    const maxEvidenceAgeDays = Number(options.crossGroupGlobalMemoryMaxEvidenceAgeDays || options.cross_group_global_memory_max_evidence_age_days || 90);
    const maxEvidenceAgeMs = Number.isFinite(maxEvidenceAgeDays) && maxEvidenceAgeDays > 0 ? maxEvidenceAgeDays * 24 * 60 * 60 * 1000 : 0;
    const nowMs = Date.now();
    const globalNewerByMs = Number.isFinite(globalUpdatedAtMs) && Number.isFinite(latestEvidenceAtMs)
        ? globalUpdatedAtMs - latestEvidenceAtMs
        : 0;
    const supersededByNewerGlobalMemory = rawSuppressed && globalNewerByMs > newerGlobalGraceMs;
    const evidenceAgeMs = Number.isFinite(latestEvidenceAtMs) ? Math.max(0, nowMs - latestEvidenceAtMs) : 0;
    const decayedToAdvisory = rawSuppressed
        && !supersededByNewerGlobalMemory
        && maxEvidenceAgeMs > 0
        && Number.isFinite(latestEvidenceAtMs)
        && evidenceAgeMs > maxEvidenceAgeMs;
    const suppressed = rawSuppressed && !supersededByNewerGlobalMemory && !decayedToAdvisory;
    const advisory = !!row && !suppressed && (rawSuppressed || supersededByNewerGlobalMemory || decayedToAdvisory);
    const reason = suppressed
        ? "global_memory_conflicted_or_demoted_in_other_groups"
        : supersededByNewerGlobalMemory
            ? "cross_group_evidence_superseded_by_newer_global_memory"
            : decayedToAdvisory
                ? "cross_group_evidence_decayed_to_advisory"
                : row ? "cross_group_evidence_below_threshold" : "no_cross_group_arbitration_evidence";
    return {
        schema: "ccm-cross-group-global-memory-suppression-v1",
        globalMemoryId: key,
        suppressed,
        rawSuppressed,
        advisory,
        reason,
        action: suppressed
            ? "treat_as_background_only_verify_current_group_before_use"
            : supersededByNewerGlobalMemory
                ? "use_newer_global_memory_as_context_after_current_source_verification"
                : decayedToAdvisory
                    ? "treat_cross_group_evidence_as_advisory_only"
                    : "no_cross_group_demotion",
        sourceDir: index?.sourceDir || GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
        groupCount: Number(row?.groupCount || 0),
        conflictGroupCount: Number(row?.conflictGroupCount || 0),
        demotedGroupCount: Number(row?.demotedGroupCount || 0),
        totalOccurrenceCount: Number(row?.totalOccurrenceCount || 0),
        conflictCount: Number(row?.conflictCount || 0),
        demotedCount: Number(row?.demotedCount || 0),
        sourceLedgers: Array.isArray(row?.sourceLedgers) ? row.sourceLedgers.slice(0, 6) : [],
        typedMemoryDocs: Array.isArray(row?.typedMemoryDocs) ? row.typedMemoryDocs.slice(0, 6) : [],
        latestEvidence: Array.isArray(row?.latestEvidence) ? row.latestEvidence.slice(0, 3) : [],
        freshness: {
            schema: "ccm-cross-group-global-memory-suppression-freshness-v1",
            globalUpdatedAt,
            latestEvidenceAt,
            globalNewerByMs,
            evidenceAgeMs,
            maxEvidenceAgeMs,
            newerGlobalGraceMs,
            supersededByNewerGlobalMemory,
            decayedToAdvisory,
        },
        thresholds: {
            conflictGroupThreshold,
            occurrenceThreshold,
        },
    };
}
function applyCrossGroupGlobalMemorySuppression(arbitration = {}, suppression = {}) {
    if (suppression?.suppressed !== true) {
        return {
            ...arbitration,
            crossGroupSuppressed: false,
            crossGroupSuppression: suppression,
        };
    }
    const active = arbitration.status === "active_global_context";
    const crossEvidence = (Array.isArray(suppression.latestEvidence) ? suppression.latestEvidence : []).slice(0, 2).map((evidence) => ({
        source: "cross_group.global_memory_arbitration_ledger",
        type: "cross_group_global_memory_suppression",
        text: compactMemoryText([
            `group=${evidence.groupId || ""}`,
            `status=${evidence.status || ""}`,
            evidence.localRuleText ? `rule=${evidence.localRuleText}` : "",
            evidence.typedMemoryDoc ? `typed=${evidence.typedMemoryDoc}` : "",
        ].filter(Boolean).join("; "), 360),
        updatedAt: evidence.lastSeenAt || "",
        messageId: "",
        matchedTerms: [],
        newer: true,
        conflict: evidence.conflict === true,
    }));
    return {
        ...arbitration,
        status: active ? "suppressed_by_cross_group_arbitration" : arbitration.status,
        authority: active ? "cross_group_arbitration_ledger" : arbitration.authority,
        action: active ? "do_not_apply_directly_treat_as_background_verify_current_group_and_sources" : arbitration.action,
        demoted: arbitration.demoted === true || active,
        conflict: arbitration.conflict === true,
        crossGroupSuppressed: true,
        crossGroupConflictCount: Number(suppression.conflictCount || 0),
        crossGroupSuppression: suppression,
        decisiveEvidence: [
            ...(Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []),
            ...crossEvidence,
        ].slice(0, 6),
    };
}
function summarizeCrossGroupGlobalMemorySuppression(items = [], index = {}) {
    const suppressedItems = items.filter((item) => item.crossGroupSuppression?.suppressed === true);
    const advisoryItems = items.filter((item) => item.crossGroupSuppression?.advisory === true);
    const supersededItems = items.filter((item) => item.crossGroupSuppression?.freshness?.supersededByNewerGlobalMemory === true);
    const decayedItems = items.filter((item) => item.crossGroupSuppression?.freshness?.decayedToAdvisory === true);
    return {
        schema: "ccm-cross-group-global-memory-suppression-summary-v1",
        sourceDir: index?.sourceDir || GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
        indexedMemoryCount: Number(index?.itemCount || 0),
        suppressedCount: suppressedItems.length,
        advisoryCount: advisoryItems.length,
        supersededCount: supersededItems.length,
        decayedCount: decayedItems.length,
        conflictCount: suppressedItems.reduce((sum, item) => sum + Number(item.crossGroupSuppression?.conflictCount || 0), 0),
        demotedCount: suppressedItems.reduce((sum, item) => sum + Number(item.crossGroupSuppression?.demotedCount || 0), 0),
        items: suppressedItems.slice(0, 8).map((item) => ({
            globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
            status: item.arbitration?.status || "",
            groupCount: item.crossGroupSuppression?.groupCount || 0,
            conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
            totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
            sourceLedgers: item.crossGroupSuppression?.sourceLedgers || [],
            typedMemoryDocs: item.crossGroupSuppression?.typedMemoryDocs || [],
        })),
        advisoryItems: advisoryItems.slice(0, 8).map((item) => ({
            globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
            reason: item.crossGroupSuppression?.reason || "",
            action: item.crossGroupSuppression?.action || "",
            groupCount: item.crossGroupSuppression?.groupCount || 0,
            conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
            totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
            freshness: item.crossGroupSuppression?.freshness || {},
        })),
    };
}
function writeTextAtomic(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, text, "utf-8");
    fs.renameSync(temp, file);
}
function writeJsonAtomic(file, value) {
    writeTextAtomic(file, JSON.stringify(value, null, 2));
}
function readGroupGlobalMemoryArbitrationLedger(groupId) {
    const file = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-global-memory-arbitration-ledger-v1",
            version: exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
            groupId,
            file,
            entries: [],
            totals: { total: 0, demoted: 0, conflict: 0, repeatedConflict: 0 },
            updatedAt: "",
        };
    }
}
function globalMemoryArbitrationSignature(groupId, targetProject, item = {}, arbitration = {}) {
    const decisive = Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : [];
    const groupEvidence = decisive.filter((evidence) => String(evidence.source || "").startsWith("group."));
    const groupMessageIds = [...new Set(groupEvidence.map((evidence) => String(evidence.messageId || "").trim()).filter(Boolean))].sort();
    const signatureEvidence = groupMessageIds.length
        ? [["messageIds", groupMessageIds.join(",")]]
        : (groupEvidence.length ? groupEvidence : decisive.slice(0, 1))
            .map((evidence) => [
            "",
            compactMemoryText(evidence.text || "", 120),
        ]);
    return crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        item.id || "",
        arbitration.status || "",
        signatureEvidence,
    ])).digest("hex").slice(0, 18);
}
function summarizeGroupGlobalMemoryArbitrationLedger(groupId, ledger, recordedRows = []) {
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const conflicts = entries.filter((entry) => entry.conflict === true);
    const demoted = entries.filter((entry) => entry.demoted === true);
    const semanticRiskEntries = entries.filter((entry) => Number(entry.semanticRiskScore || 0) > 0);
    const repeatedConflicts = conflicts.filter((entry) => Number(entry.occurrenceCount || 0) > 1);
    const distilledConflicts = repeatedConflicts.filter((entry) => entry.distilledAt || entry.typedMemoryDoc);
    const pendingDistillation = repeatedConflicts.filter((entry) => !entry.distilledAt && !entry.typedMemoryDoc);
    return {
        schema: "ccm-group-global-memory-arbitration-ledger-summary-v1",
        groupId,
        file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId),
        entryCount: entries.length,
        recordedCount: recordedRows.length,
        demotedCount: demoted.length,
        conflictCount: conflicts.length,
        semanticRiskCount: semanticRiskEntries.length,
        semanticConflictCount: semanticRiskEntries.filter((entry) => Number(entry.semanticRiskScore || 0) >= 60).length,
        maxSemanticRiskScore: semanticRiskEntries.reduce((max, entry) => Math.max(max, Number(entry.semanticRiskScore || 0)), 0),
        repeatedConflictCount: repeatedConflicts.length,
        distilledConflictCount: distilledConflicts.length,
        pendingDistillationCount: pendingDistillation.length,
        typedMemoryDocs: uniqueByKey(distilledConflicts.map((entry) => ({
            file: entry.typedMemoryDoc || "",
            slug: entry.typedMemorySlug || "",
            type: entry.typedMemoryType || "",
        })).filter((item) => item.file), (item) => item.file, 12),
        updatedAt: ledger.updatedAt || "",
        latestEntries: entries
            .slice()
            .sort((a, b) => Date.parse(b.lastSeenAt || b.at || "") - Date.parse(a.lastSeenAt || a.at || ""))
            .slice(0, 8)
            .map((entry) => ({
            entry_id: entry.entry_id,
            status: entry.status,
            globalMemoryId: entry.globalMemoryId,
            targetProject: entry.targetProject,
            semanticRiskScore: Number(entry.semanticRiskScore || 0),
            semanticRiskLevel: entry.semanticRiskLevel || "",
            semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
            occurrenceCount: entry.occurrenceCount || 1,
            lastSeenAt: entry.lastSeenAt || entry.at || "",
            distilledAt: entry.distilledAt || "",
            typedMemoryDoc: entry.typedMemoryDoc || "",
            localEvidence: (entry.decisiveEvidence || []).slice(0, 2).map((evidence) => ({
                source: evidence.source || "",
                messageId: evidence.messageId || "",
                text: compactMemoryText(evidence.text || "", 180),
                semanticRiskScore: Number(evidence.semanticRiskScore || 0),
                semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : []).slice(0, 4),
            })),
        })),
        distillationCandidates: repeatedConflicts.slice(0, 8).map((entry) => ({
            globalMemoryId: entry.globalMemoryId,
            targetProject: entry.targetProject,
            occurrenceCount: entry.occurrenceCount || 1,
            semanticRiskScore: Number(entry.semanticRiskScore || 0),
            semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
            suggestedMemoryType: entry.conflict ? "decision" : "fact",
            reason: "同一全局记忆多次被群聊新证据降权/冲突，可蒸馏为 typed MEMORY.md 规则。",
            candidateText: compactMemoryText(entry.localRuleText || entry.globalText || "", 320),
            distilled: !!(entry.distilledAt || entry.typedMemoryDoc),
            typedMemoryDoc: entry.typedMemoryDoc || "",
        })),
    };
}
function recordGroupGlobalMemoryArbitrationLedger(groupId, input = {}) {
    const recall = input.globalAgentMemoryRecall || input.global_agent_memory_recall || {};
    const targetProject = String(input.targetProject || input.target_project || "");
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const task = compactMemoryText(input.task || input.query || "", 320);
    const rows = (Array.isArray(recall.items) ? recall.items : [])
        .filter((item) => item?.arbitration?.demoted === true || item?.arbitration?.conflict === true)
        .map((item) => {
        const arbitration = item.arbitration || {};
        const signature = globalMemoryArbitrationSignature(groupId, targetProject, item, arbitration);
        const decisiveEvidence = (Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []).slice(0, 6);
        const localRuleText = decisiveEvidence.map((evidence) => evidence.text).filter(Boolean).join("\n");
        return {
            schema: "ccm-group-global-memory-arbitration-ledger-entry-v1",
            entry_id: `gma:${signature}`,
            signature,
            at: generatedAt,
            groupId,
            targetProject,
            task,
            globalMemoryId: item.id || "",
            globalMemoryType: item.type || "",
            status: arbitration.status || "",
            authority: arbitration.authority || "",
            action: arbitration.action || "",
            demoted: arbitration.demoted === true,
            conflict: arbitration.conflict === true,
            matchedLocalEvidenceCount: Number(arbitration.matchedLocalEvidenceCount || 0),
            semanticRiskScore: Number(arbitration.semanticRiskScore || arbitration.semanticRisk?.score || 0),
            semanticRiskLevel: arbitration.semanticRisk?.level || "",
            semanticReasons: (Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons : arbitration.semanticRisk?.reasons || []).slice(0, 10),
            globalText: compactMemoryText(item.text || "", 700),
            globalHowToApply: compactMemoryText(item.howToApply || item.how_to_apply || "", 300),
            localRuleText: compactMemoryText(localRuleText, 700),
            crossGroupSuppression: item.crossGroupSuppression || arbitration.crossGroupSuppression || null,
            decisiveEvidence: decisiveEvidence.map((evidence) => ({
                source: evidence.source || "",
                type: evidence.type || "",
                text: compactMemoryText(evidence.text || "", 360),
                updatedAt: evidence.updatedAt || "",
                messageId: evidence.messageId || "",
                matchedTerms: (Array.isArray(evidence.matchedTerms) ? evidence.matchedTerms : []).slice(0, 8),
                newer: evidence.newer === true,
                conflict: evidence.conflict === true,
                semanticRiskScore: Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0),
                semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : evidence.semanticRisk?.reasons || []).slice(0, 8),
                semanticRisk: evidence.semanticRisk || null,
            })),
            source: item.source || {},
            distillationCandidate: {
                shouldDistill: true,
                suggestedMemoryType: arbitration.conflict ? "decision" : "fact",
                reason: arbitration.conflict
                    ? "全局记忆和群聊新证据冲突；应把最新群聊规则蒸馏成 typed memory。"
                    : "全局记忆被更新群聊证据降权；应把更新后的本地事实蒸馏成 typed memory。",
            },
        };
    });
    const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
    if (!rows.length)
        return summarizeGroupGlobalMemoryArbitrationLedger(groupId, ledger, []);
    const bySignature = new Map((ledger.entries || []).map((entry) => [String(entry.signature || entry.entry_id || ""), entry]));
    const evidenceMessageIds = (entry = {}) => new Set((Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [])
        .map((evidence) => String(evidence.messageId || "").trim())
        .filter(Boolean));
    for (const row of rows) {
        const rowMessageIds = evidenceMessageIds(row);
        const previous = bySignature.get(row.signature) || [...bySignature.values()].find((entry) => {
            if (entry.globalMemoryId !== row.globalMemoryId || entry.targetProject !== row.targetProject || entry.status !== row.status)
                return false;
            const previousMessageIds = evidenceMessageIds(entry);
            return [...rowMessageIds].some(messageId => previousMessageIds.has(messageId));
        });
        const signature = previous?.signature || row.signature;
        bySignature.set(signature, previous ? {
            ...previous,
            ...row,
            entry_id: previous.entry_id || row.entry_id,
            signature,
            firstSeenAt: previous.firstSeenAt || previous.at || row.at,
            lastSeenAt: generatedAt,
            occurrenceCount: Number(previous.occurrenceCount || 1) + 1,
        } : {
            ...row,
            firstSeenAt: generatedAt,
            lastSeenAt: generatedAt,
            occurrenceCount: 1,
        });
    }
    const entries = [...bySignature.values()]
        .sort((a, b) => Date.parse(a.lastSeenAt || a.at || "") - Date.parse(b.lastSeenAt || b.at || ""))
        .slice(-240);
    const totals = {
        total: entries.length,
        demoted: entries.filter((entry) => entry.demoted === true).length,
        conflict: entries.filter((entry) => entry.conflict === true).length,
        repeatedConflict: entries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) > 1).length,
    };
    const nextLedger = {
        schema: "ccm-group-global-memory-arbitration-ledger-v1",
        version: exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
        groupId,
        entries,
        totals,
        updatedAt: generatedAt,
    };
    writeJsonAtomic(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
    return summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, rows);
}
function renderGlobalMemoryArbitrationTypedMemoryBody(entries = [], options = {}) {
    const lines = [
        "# Global/Group Memory Arbitration Decisions",
        "",
        "This document is generated from repeated Global Agent memory arbitration conflicts.",
        "When these rows apply, current group memory and typed MEMORY.md override stale Global Agent memory. Treat the global item as background only and verify current source before acting.",
        "",
        `Generated at: ${options.updatedAt || new Date().toISOString()}`,
        "",
    ];
    for (const entry of entries.slice(0, 24)) {
        lines.push(`## ${entry.globalMemoryId || "global-memory"} -> ${entry.targetProject || "project"}`);
        lines.push("");
        lines.push(`- status: ${entry.status || ""}`);
        lines.push(`- occurrence_count: ${entry.occurrenceCount || 1}`);
        if (Number(entry.semanticRiskScore || 0) > 0) {
            lines.push(`- semantic_risk: ${entry.semanticRiskScore}; level=${entry.semanticRiskLevel || "unknown"}; reasons=${(entry.semanticReasons || []).join(",")}`);
        }
        lines.push(`- first_seen: ${entry.firstSeenAt || entry.at || ""}`);
        lines.push(`- last_seen: ${entry.lastSeenAt || entry.at || ""}`);
        if (entry.task)
            lines.push(`- task: ${compactMemoryText(entry.task, 260)}`);
        if (entry.globalText)
            lines.push(`- stale_global_memory: ${compactMemoryText(entry.globalText, 520)}`);
        if (entry.localRuleText)
            lines.push(`- current_group_rule: ${compactMemoryText(entry.localRuleText, 700)}`);
        const evidence = Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [];
        if (evidence.length) {
            lines.push("- decisive_evidence:");
            for (const item of evidence.slice(0, 4)) {
                const semantic = Number(item.semanticRiskScore || item.semanticRisk?.score || 0) > 0
                    ? ` semantic_risk=${item.semanticRiskScore || item.semanticRisk?.score}; reasons=${(item.semanticReasons || item.semanticRisk?.reasons || []).slice(0, 4).join(",")};`
                    : "";
                lines.push(`  - ${item.source || "group"}${item.messageId ? `#${item.messageId}` : ""}:${semantic} ${compactMemoryText(item.text || "", 420)}`);
            }
        }
        lines.push("- application_rule: do_not_apply_the_stale_global_memory_directly; use_current_group_rule_after_current-source verification.");
        lines.push("");
    }
    return lines.join("\n").trim();
}
function distillGroupGlobalMemoryArbitrationToTypedMemory(groupId, input = {}) {
    const threshold = Math.max(2, Number(input.threshold || input.minOccurrences || input.min_occurrences || 2));
    const updatedAt = String(input.updatedAt || input.updated_at || input.generatedAt || input.generated_at || new Date().toISOString());
    const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const candidates = entries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold);
    if (!candidates.length) {
        return {
            schema: "ccm-group-global-memory-arbitration-distillation-v1",
            groupId,
            skipped: true,
            reason: "no_repeated_conflicts",
            threshold,
            candidateCount: 0,
            writeCount: 0,
            ledgerFile: ledger.file,
        };
    }
    const body = renderGlobalMemoryArbitrationTypedMemoryBody(candidates, { updatedAt });
    const paths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(body, candidates.flatMap((entry) => [
        entry.targetProject,
        ...(Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence.flatMap((evidence) => evidence.matchedTerms || []) : []),
    ]));
    const write = (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
        type: "project",
        slug: "global-memory-arbitration-decisions",
        name: "Global memory arbitration decisions",
        description: "Repeated conflicts where current group evidence overrides stale Global Agent memory.",
        source: "auto:global-memory-arbitration-ledger",
        updatedAt,
        paths,
        body,
        maxBodyChars: Number(input.maxBodyChars || input.max_body_chars || 24_000),
    });
    const nextEntries = entries.map((entry) => {
        const match = candidates.some((candidate) => candidate.entry_id === entry.entry_id || candidate.signature === entry.signature);
        if (!match)
            return entry;
        return {
            ...entry,
            distilledAt: entry.distilledAt || updatedAt,
            distillationStatus: "typed_memory_written",
            typedMemoryDoc: write.file,
            typedMemorySlug: write.slug,
            typedMemoryType: write.type,
            typedMemoryChanged: write.changed === true,
        };
    });
    const nextLedger = {
        schema: "ccm-group-global-memory-arbitration-ledger-v1",
        version: exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
        groupId,
        entries: nextEntries,
        totals: {
            total: nextEntries.length,
            demoted: nextEntries.filter((entry) => entry.demoted === true).length,
            conflict: nextEntries.filter((entry) => entry.conflict === true).length,
            repeatedConflict: nextEntries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold).length,
            distilled: nextEntries.filter((entry) => entry.distilledAt || entry.typedMemoryDoc).length,
        },
        distillation: {
            schema: "ccm-group-global-memory-arbitration-distillation-state-v1",
            threshold,
            lastDistilledAt: updatedAt,
            candidateCount: candidates.length,
            typedMemoryDoc: write.file,
            typedMemorySlug: write.slug,
            changed: write.changed === true,
        },
        updatedAt,
    };
    writeJsonAtomic(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    const summary = summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, []);
    return {
        schema: "ccm-group-global-memory-arbitration-distillation-v1",
        groupId,
        skipped: false,
        reason: "repeated_global_group_conflict",
        threshold,
        candidateCount: candidates.length,
        writeCount: write.changed ? 1 : 0,
        write,
        index,
        ledgerFile: ledger.file,
        summary,
        distilledAt: updatedAt,
    };
}
function memoryArbitrationTokens(value) {
    const text = String(value || "").toLowerCase().replace(/\\/g, "/");
    const englishStopWords = new Set([
        "the", "and", "for", "with", "global", "agent", "memory", "context",
        "current", "goal", "goals", "requirement", "requirements", "constraint", "constraints", "acceptance",
    ]);
    const chineseStopWords = new Set(["当前", "记忆", "目标", "需求", "约束", "验收", "任务", "群聊", "全局", "验证", "用户", "阶段"]);
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./:-]{3,}/g)) {
        const token = match[0];
        if (englishStopWords.has(token))
            continue;
        tokens.add(token);
    }
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1) {
        const token = chinese.slice(index, index + 2);
        if (chineseStopWords.has(token))
            continue;
        tokens.add(token);
    }
    return [...tokens].slice(0, 120);
}
function memoryArbitrationTimestamp(value, messagesById = new Map()) {
    const direct = value?.updatedAt || value?.updated_at || value?.timestamp || value?.time || value?.createdAt || value?.created_at || "";
    if (direct && Number.isFinite(Date.parse(String(direct))))
        return String(direct);
    const messageId = value?.messageId || value?.message_id || value?.sourceMessageId || value?.source_message_id || value?.source?.messageId || value?.source?.message_id;
    const message = messageId ? messagesById.get(String(messageId)) : null;
    return message?.timestamp || message?.time || "";
}
function memoryArbitrationTextForItem(type, item) {
    if (!item)
        return "";
    if (typeof item === "string")
        return item;
    return [
        item.text,
        item.decision,
        item.summary,
        item.reason,
        item.action,
        item.question,
        item.value,
        item.description,
        item.body,
    ].filter(Boolean).join("\n");
}
function collectChildGlobalMemoryLocalEvidence(options = {}) {
    const memory = options.groupMemory || options.group_memory || {};
    const messages = Array.isArray(options.groupMessages || options.group_messages) ? (options.groupMessages || options.group_messages) : [];
    const messagesById = new Map(messages.map((message) => [String(message.id || message.uuid || ""), message]));
    const rows = [];
    const push = (source, item, type = source) => {
        const text = memoryArbitrationTextForItem(type, item);
        if (!String(text || "").trim())
            return;
        rows.push({
            source,
            type,
            text: compactMemoryText(text, 900),
            updatedAt: memoryArbitrationTimestamp(item, messagesById) || memory.updated_at || "",
            messageId: item?.messageId || item?.message_id || item?.sourceMessageId || item?.source_message_id || item?.source?.messageId || "",
            authority: source.startsWith("typed") ? "typed_memory" : "group_memory",
        });
    };
    for (const key of ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "nextActions", "openQuestions"]) {
        for (const item of Array.isArray(memory[key]) ? memory[key] : [])
            push(`group.${key}`, item, key);
    }
    const recall = options.typedMemoryRecall || options.typed_memory_recall || {};
    for (const doc of Array.isArray(recall.recalled) ? recall.recalled : []) {
        const text = [doc.name, doc.description, doc.snippet, doc.body].filter(Boolean).join("\n");
        push("typed.recall", {
            text,
            updatedAt: doc.updatedAt || doc.updated_at || (Number(doc.mtimeMs || 0) ? new Date(Number(doc.mtimeMs)).toISOString() : ""),
            messageId: doc.sourceMessageId || "",
        }, doc.type || "typed_memory");
    }
    return rows.slice(-120);
}
function memoryTextsMayConflict(globalText, localText) {
    return scoreMemorySemanticContradiction(globalText, localText).conflict === true;
}
function uniqueMemoryArbitrationValues(values = [], limit = 24) {
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}
function memoryArbitrationEntities(value) {
    const text = String(value || "");
    const normalized = text.toLowerCase().replace(/\\/g, "/");
    const paths = uniqueMemoryArbitrationValues([...normalized.matchAll(/(?:^|[\s"'`([{])([a-z0-9_./@-]+\.(?:tsx?|jsx?|mjs|cjs|md|json|ya?ml|toml|css|scss|html|py|go|rs|java|kt|cs|php|rb|sh|sql))/gi)].map(match => match[1]));
    const sentinels = uniqueMemoryArbitrationValues([...text.matchAll(/\b[A-Z][A-Z0-9_]{5,}_SENTINEL\b/g)].map(match => match[0].toLowerCase()));
    const ruleTerms = uniqueMemoryArbitrationValues([...normalized.matchAll(/\b[a-z0-9][a-z0-9._-]*(?:rule|policy|mode|strategy|pipeline|provider|adapter|implementation|impl|flow|version)[a-z0-9._-]*\b/g)].map(match => match[0])
        .filter(term => !paths.includes(term) && !sentinels.includes(term) && !/^(user|system|assistant|agent|task|project|memory)[_-]/.test(term)));
    return {
        paths,
        sentinels,
        ruleTerms,
        anchors: uniqueMemoryArbitrationValues([...paths, ...sentinels]),
    };
}
function memoryArbitrationSignals(value) {
    const text = String(value || "");
    return {
        positive: /(必须|务必|需要|应该|保留|继承|使用|优先|启用|must|required|should|use|keep|prefer|enable)/i.test(text),
        negative: /(不要|不再|禁止|取消|废弃|作废|忽略|不能|不可|无需|不需要|停止|revert|rollback|deprecated|do not|never|stop|cancel|disable)/i.test(text),
        replacement: /(改为|替换为|切换到|迁移到|以.+为准|现在使用|当前使用|最新使用|instead|use .+ instead|replace|switch(?:ed)? to|migrate(?:d)? to|supersede(?:d)?)/i.test(text),
        current: /(当前|现在|最新|新规则|新实现|current|latest|new rule|new implementation|source of truth)/i.test(text),
        legacy: /(旧|历史|过时|陈旧|legacy|stale|old|obsolete|deprecated)/i.test(text),
    };
}
function intersectionValues(a = [], b = []) {
    const right = new Set(b);
    return a.filter(value => right.has(value));
}
function scoreMemorySemanticContradiction(globalText, localText, options = {}) {
    const globalEntities = memoryArbitrationEntities(globalText);
    const localEntities = memoryArbitrationEntities(localText);
    const globalSignals = memoryArbitrationSignals(globalText);
    const localSignals = memoryArbitrationSignals(localText);
    const matchedTerms = uniqueMemoryArbitrationValues(options.matchedTerms || []);
    const sharedPaths = intersectionValues(globalEntities.paths, localEntities.paths);
    const sharedSentinels = intersectionValues(globalEntities.sentinels, localEntities.sentinels);
    const sharedAnchors = uniqueMemoryArbitrationValues([...sharedPaths, ...sharedSentinels, ...intersectionValues(globalEntities.anchors, localEntities.anchors)]);
    const sharedRuleTerms = intersectionValues(globalEntities.ruleTerms, localEntities.ruleTerms);
    const differingGlobalRules = globalEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
    const differingLocalRules = localEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
    const differentNamedRules = sharedAnchors.length > 0
        && differingGlobalRules.length > 0
        && differingLocalRules.length > 0;
    const reasons = [];
    let score = 0;
    const add = (points, reason) => {
        score += points;
        reasons.push(reason);
    };
    if (sharedSentinels.length)
        add(25, "shared_sentinel_anchor");
    if (sharedPaths.length)
        add(25, "shared_file_anchor");
    if (!sharedPaths.length && !sharedSentinels.length && matchedTerms.length >= 3)
        add(12, "shared_task_terms");
    if (differentNamedRules)
        add(28, "different_named_rule");
    if (localSignals.replacement)
        add(24, "local_replacement_signal");
    if (localSignals.current && differentNamedRules)
        add(12, "current_local_rule_differs");
    if (globalSignals.positive && localSignals.negative)
        add(34, "local_negates_global_directive");
    if (globalSignals.positive && (localSignals.current || localSignals.replacement) && differentNamedRules)
        add(18, "positive_global_superseded_by_current_local_rule");
    if (globalSignals.legacy || localSignals.legacy)
        add(8, "legacy_or_stale_rule_signal");
    if (options.newer === true && score > 0)
        add(8, "newer_local_evidence");
    if (!sharedAnchors.length && matchedTerms.length < 2)
        score = Math.min(score, 35);
    const normalizedScore = Math.max(0, Math.min(100, score));
    return {
        schema: "ccm-child-global-agent-memory-semantic-arbitration-v1",
        score: normalizedScore,
        level: normalizedScore >= 80 ? "high" : normalizedScore >= 60 ? "medium" : normalizedScore >= 35 ? "low" : "none",
        conflict: normalizedScore >= 60 && (sharedAnchors.length > 0 || matchedTerms.length >= 3),
        reasons: uniqueMemoryArbitrationValues(reasons, 10),
        sharedAnchors: sharedAnchors.slice(0, 8),
        sharedPaths: sharedPaths.slice(0, 6),
        sharedSentinels: sharedSentinels.slice(0, 4),
        differingGlobalRules: differingGlobalRules.slice(0, 8),
        differingLocalRules: differingLocalRules.slice(0, 8),
        matchedTerms: matchedTerms.slice(0, 8),
    };
}
function arbitrateChildGlobalAgentMemoryItem(item, localEvidence = []) {
    const globalText = [item.text, item.why, item.howToApply].filter(Boolean).join("\n");
    const globalTerms = new Set(memoryArbitrationTokens(globalText));
    const globalAt = item.updatedAt || item.source?.timestamp || "";
    const globalAtMs = Date.parse(globalAt || "");
    const matches = localEvidence.map((evidence) => {
        const evidenceTerms = memoryArbitrationTokens(evidence.text);
        const matchedTerms = evidenceTerms.filter(term => globalTerms.has(term));
        const strongMatch = matchedTerms.length >= 2
            || matchedTerms.some(term => /sentinel|[a-z0-9_-]+\.tsx?$|[a-z0-9_-]+\.jsx?$|[a-z0-9_-]+\.md$/.test(term));
        const evidenceAtMs = Date.parse(evidence.updatedAt || "");
        const newer = Number.isFinite(evidenceAtMs) && (!Number.isFinite(globalAtMs) || evidenceAtMs > globalAtMs + 1000);
        const semanticRisk = scoreMemorySemanticContradiction(globalText, evidence.text, { matchedTerms, newer });
        const conflict = strongMatch && semanticRisk.conflict === true;
        return {
            ...evidence,
            matchedTerms,
            strongMatch,
            newer,
            conflict,
            semanticRisk,
        };
    }).filter((evidence) => evidence.strongMatch && (evidence.newer || evidence.conflict));
    const conflicts = matches.filter((evidence) => evidence.conflict);
    const newerMatches = matches.filter((evidence) => evidence.newer);
    const decisive = (conflicts.length ? conflicts : newerMatches)
        .sort((a, b) => {
        const authorityRank = (value) => String(value.source || "").startsWith("group.") ? 0 : 1;
        const rank = authorityRank(a) - authorityRank(b);
        if (rank)
            return rank;
        return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
    })
        .slice(0, 3);
    const status = conflicts.length
        ? "possible_conflict_with_newer_group_memory"
        : newerMatches.length
            ? "demoted_by_newer_group_evidence"
            : "active_global_context";
    const semanticRiskScores = matches.map((evidence) => Number(evidence.semanticRisk?.score || 0)).filter(score => score > 0);
    const semanticRiskScore = semanticRiskScores.length ? Math.max(...semanticRiskScores) : 0;
    const semanticReasons = uniqueMemoryArbitrationValues(matches.flatMap((evidence) => evidence.semanticRisk?.reasons || []), 10);
    return {
        schema: "ccm-child-global-agent-memory-arbitration-v1",
        status,
        authority: status === "active_global_context" ? "global_agent_memory" : "group_memory",
        action: status === "active_global_context" ? "use_as_relevant_context_after_verification" : "do_not_apply_directly_treat_as_background",
        demoted: status !== "active_global_context",
        conflict: conflicts.length > 0,
        matchedLocalEvidenceCount: matches.length,
        semanticRisk: {
            schema: "ccm-child-global-agent-memory-semantic-risk-summary-v1",
            score: semanticRiskScore,
            level: semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore >= 35 ? "low" : "none",
            conflictCount: conflicts.filter((evidence) => evidence.semanticRisk?.conflict === true).length,
            reasons: semanticReasons,
        },
        semanticRiskScore,
        semanticReasons,
        decisiveEvidence: decisive.map((evidence) => ({
            source: evidence.source,
            type: evidence.type,
            text: compactMemoryText(evidence.text, 360),
            updatedAt: evidence.updatedAt || "",
            messageId: evidence.messageId || "",
            matchedTerms: evidence.matchedTerms.slice(0, 8),
            newer: evidence.newer,
            conflict: evidence.conflict,
            semanticRiskScore: Number(evidence.semanticRisk?.score || 0),
            semanticReasons: (Array.isArray(evidence.semanticRisk?.reasons) ? evidence.semanticRisk.reasons : []).slice(0, 8),
            semanticRisk: evidence.semanticRisk,
        })),
    };
}
function renderGroupSessionMemoryMarkdown(groupId, memory = {}) {
    const compaction = memory.compaction || {};
    const compression = memory.messageCompression || {};
    const boundary = memory.compactBoundary || {};
    const summaryText = compactPreserveLines(memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null), 5200);
    const lines = [
        "# CCM Group Session Memory",
        "",
        `- groupId: ${groupId}`,
        `- generatedAt: ${new Date().toISOString()}`,
        `- strategy: ${compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"}`,
        `- lastSummarizedMessageId: ${compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""}`,
        `- summaryChecksum: ${compaction.summaryChecksum || boundary.summaryChecksum || ""}`,
        `- compactedMessages: ${Number(compaction.compactedMessageCount || compression.compressedMessages || 0)}`,
        `- preservedRecentMessages: ${Number(compaction.preservedRecentMessages || compression.recentMessages || 0)}`,
        "",
        "## Goal",
        memory.goal || "未记录",
        "",
        "## Session Summary",
        summaryText || "暂无压缩摘要；当前群聊仍处于近期原文窗口。",
    ];
    const addList = (title, items, mapper, limit = 10) => {
        const rows = (Array.isArray(items) ? items : []).slice(-limit).map(mapper).filter(Boolean);
        if (!rows.length)
            return;
        lines.push("", `## ${title}`);
        for (const row of rows)
            lines.push(`- ${compactPreserveLines(row, 420)}`);
    };
    addList("Persistent Requirements", memory.persistentRequirements || [], (item) => item.text || item.value || String(item || ""), 16);
    addList("Fact Anchors", memory.factAnchors || [], (item) => item.text || item.value || String(item || ""), 16);
    addList("Decisions", memory.decisions || [], (item) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 10);
    addList("Worker State", memory.workerLedger || [], (item) => `${item.project || item.agent || "unknown"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 12);
    addList("Open Questions", memory.openQuestions || [], (item) => item.question || String(item || ""), 8);
    addList("Next Actions", memory.nextActions || [], (item) => item.action || String(item || ""), 8);
    lines.push("", "## Use Policy", "- Treat this file as the compacted session memory for this group chat.", "- Child Agent sessions may be fresh third-party CLI sessions; inject this summary together with recent raw messages.", "- If the user asks to ignore memory, behave as if this file were empty and declare memoryIgnored in the receipt.");
    return compactPreserveLines(lines.join("\n"), 18_000);
}
function buildGroupSessionMemorySnapshot(groupId, memory = {}, options = {}) {
    const markdownFile = getGroupSessionMemoryMarkdownFile(groupId);
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const markdown = renderGroupSessionMemoryMarkdown(groupId, memory);
    const compaction = memory.compaction || {};
    const compression = memory.messageCompression || {};
    const boundary = memory.compactBoundary || {};
    const summaryText = String(memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null) || "");
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    return {
        schema: "ccm-group-session-memory-snapshot-v1",
        version: exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
        groupId,
        generatedAt,
        reason: String(options.reason || "save_group_memory"),
        strategy: String(compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"),
        summaryFile: markdownFile,
        snapshotFile,
        lastSummarizedMessageId: String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""),
        summaryChecksum: String(compaction.summaryChecksum || boundary.summaryChecksum || hashSessionMemoryText(summaryText, 24)),
        markdownChecksum: hashSessionMemoryText(markdown, 24),
        markdownChars: markdown.length,
        hasSummary: !!summaryText.trim(),
        compactedMessageCount: Number(compaction.compactedMessageCount || compression.compressedMessages || 0),
        preservedRecentMessages: Number(compaction.preservedRecentMessages || compression.recentMessages || 0),
        preCompactTokenCount: Number(compaction.preCompactTokenCount || compression.preCompactTokenCount || 0),
        postCompactTokenCount: Number(compaction.postCompactTokenCount || compression.postCompactTokenCount || 0),
        health: String(compaction.health || ""),
        contextPressureWarning: compaction.contextPressureWarning || compression.contextPressureWarning || null,
        markdownExcerpt: compactPreserveLines(markdown, 1200),
        markdown,
    };
}
function summarizeGroupSessionMemorySnapshot(snapshot = {}) {
    if (!snapshot?.schema)
        return null;
    const { markdown, ...rest } = snapshot;
    return {
        ...rest,
        markdownExcerpt: compactPreserveLines(snapshot.markdownExcerpt || markdown || "", 1200),
    };
}
function persistGroupSessionMemorySnapshot(groupId, memory = {}, options = {}) {
    const snapshot = buildGroupSessionMemorySnapshot(groupId, memory, options);
    writeTextAtomic(snapshot.summaryFile, snapshot.markdown);
    writeJsonAtomic(snapshot.snapshotFile, summarizeGroupSessionMemorySnapshot(snapshot));
    return summarizeGroupSessionMemorySnapshot(snapshot);
}
function readGroupSessionMemorySnapshotSummary(groupId) {
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
        const markdown = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : "";
        return {
            ...parsed,
            schema: "ccm-group-session-memory-snapshot-v1",
            version: exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: markdown ? hashSessionMemoryText(markdown, 24) === parsed.markdownChecksum : false,
            markdownExcerpt: compactPreserveLines(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    catch {
        return {
            schema: "ccm-group-session-memory-snapshot-v1",
            version: exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: fs.existsSync(summaryFile),
            markdownChecksumMatches: false,
            hasSummary: false,
            generatedAt: "",
        };
    }
}
function mergeToolGrantSets(...sets) {
    const merged = { mcp: new Set(), skill: new Set() };
    for (const set of sets || []) {
        let normalized = { mcp: [], skill: [] };
        try {
            normalized = (0, tool_authorization_1.normalizeToolAuthorization)(set || {});
        }
        catch { }
        for (const value of normalized.mcp || [])
            merged.mcp.add(String(value || "").trim());
        for (const value of normalized.skill || [])
            merged.skill.add(String(value || "").trim());
    }
    return {
        mcp: Array.from(merged.mcp).filter(Boolean).slice(0, 120),
        skill: Array.from(merged.skill).filter(Boolean).slice(0, 120),
    };
}
function countToolGrantSet(set = {}) {
    return (Array.isArray(set.mcp) ? set.mcp.length : 0) + (Array.isArray(set.skill) ? set.skill.length : 0);
}
function hasToolGrantSet(set = {}) {
    return countToolGrantSet(set) > 0;
}
function normalizeToolContinuitySkill(value, source = "", at = "") {
    if (!value)
        return null;
    if (typeof value === "string") {
        const text = value.replace(/^Skill\s*[:：]\s*/i, "").trim();
        if (!text)
            return null;
        const [name, contentHash] = text.split("#");
        return {
            name: compactMemoryText(name, 160),
            contentHash: compactMemoryText(contentHash || "", 80),
            source,
            lastSeenAt: at,
        };
    }
    if (typeof value !== "object")
        return null;
    const name = String(value.name || value.skill || value.id || value.shortId || "").replace(/^Skill\s*[:：]\s*/i, "").trim();
    if (!name)
        return null;
    return {
        name: compactMemoryText(name, 160),
        contentHash: compactMemoryText(value.contentHash || value.content_hash || value.hash || "", 80),
        sourcePath: compactMemoryText(value.sourcePath || value.source_path || value.file || "", 260),
        source: compactMemoryText(source || value.source || "", 120),
        lastSeenAt: String(at || value.lastSeenAt || value.last_seen_at || value.timestamp || ""),
    };
}
function compactToolContinuityStatus(row = {}, kind = "mcp", source = "") {
    if (!row || typeof row !== "object")
        return null;
    if (kind === "skill") {
        const name = String(row.name || row.skill || row.id || "").trim();
        if (!name)
            return null;
        return {
            name: compactMemoryText(name, 160),
            state: compactMemoryText(row.state || row.status || "unknown", 80),
            contentHash: compactMemoryText(row.contentHash || row.content_hash || row.hash || "", 80),
            source,
        };
    }
    const raw = String(row.raw || row.name || row.server || row.serverName || row.server_name || "").trim();
    const server = String(row.server || row.name || raw || "").trim();
    const tool = String(row.tool || row.toolName || row.tool_name || "").trim();
    if (!raw && !server && !tool)
        return null;
    return {
        raw: compactMemoryText(raw || (tool ? `${server}/${tool}` : server), 180),
        server: compactMemoryText(server, 120),
        serverName: compactMemoryText(row.serverName || row.server_name || "", 120),
        tool: compactMemoryText(tool, 120),
        state: compactMemoryText(row.state || row.status || "unknown", 80),
        missingTools: Array.isArray(row.missingTools || row.missing_tools) ? (row.missingTools || row.missing_tools).map((item) => compactMemoryText(item, 120)).slice(0, 20) : [],
        availableTools: Array.isArray(row.availableTools || row.available_tools) ? (row.availableTools || row.available_tools).map((item) => compactMemoryText(item, 120)).slice(0, 20) : [],
        source,
    };
}
function compactToolContinuityReadiness(readiness = {}, source = "") {
    if (!readiness || typeof readiness !== "object")
        return null;
    return {
        schema: readiness.schema || "ccm-tool-authorization-readiness-v1",
        source,
        dispatchReady: readiness.dispatchReady !== false,
        status: compactMemoryText(readiness.status || (readiness.dispatchReady === false ? "needs_attention" : "ready"), 80),
        requested: readiness.requested || {},
        available: readiness.available || {},
        missing: readiness.missing || {},
        invalid_mcp_grants: Number(readiness.invalid_mcp_grants || 0),
        unavailable: readiness.unavailable || {},
    };
}
function extractToolGrantSet(value = {}) {
    return mergeToolGrantSets(value?.allowedTools || value?.allowed_tools || value?.tools || value);
}
function buildGroupToolContinuityConfigSources(groupId, memory = {}) {
    const sources = [];
    const addSource = (source, scope, id, tools) => {
        const normalized = mergeToolGrantSets(tools || {});
        if (!hasToolGrantSet(normalized))
            return;
        sources.push({
            source,
            scope,
            id: compactMemoryText(id || groupId, 160),
            tools: normalized,
            counts: { mcp: normalized.mcp.length, skill: normalized.skill.length },
        });
    };
    addSource("group_memory", "group", groupId, memory.tools || memory.allowedTools || memory.allowed_tools || {});
    let group = null;
    try {
        group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(groupId));
    }
    catch { }
    if (group)
        addSource("group_config", "group", groupId, group.tools || {});
    let projectConfigs = {};
    try {
        projectConfigs = (0, db_1.loadProjectConfigs)();
    }
    catch { }
    for (const member of Array.isArray(group?.members) ? group.members : []) {
        const project = String(member?.project || member?.name || "").trim();
        if (!project)
            continue;
        addSource("group_member", "member", project, member.tools || {});
        addSource("project_config", "project", project, projectConfigs?.[project]?.tools || {});
    }
    const configuredTools = mergeToolGrantSets(...sources.map(source => source.tools));
    return {
        groupFound: !!group,
        memberCount: Array.isArray(group?.members) ? group.members.length : 0,
        configuredTools,
        configuredSources: sources.slice(0, 40),
    };
}
function renderGroupToolContinuityMarkdown(snapshot = {}) {
    const lines = [
        "# CCM Group Tool Continuity",
        "",
        `- groupId: ${snapshot.groupId || ""}`,
        `- generatedAt: ${snapshot.generatedAt || ""}`,
        `- strategy: cc-tool-skill-continuity-context-v1`,
        `- status: ${snapshot.status || "empty"}`,
        `- shouldReuseAsContext: ${snapshot.shouldReuseAsContext === true}`,
        `- shouldBypassAuthorization: ${snapshot.shouldBypassAuthorization === true}`,
        "",
        "## Use Policy",
        "- Treat this as continuity context for the group chat and fresh third-party child Agent sessions.",
        "- This snapshot never grants tools and never bypasses CCM runtime authorization.",
        "- Real dispatch must still pass the current runtime tool gate, MCP config sync, and authorization readiness checks.",
    ];
    const addGrantSet = (title, set = {}) => {
        if (!hasToolGrantSet(set))
            return;
        lines.push("", `## ${title}`);
        if (Array.isArray(set.mcp) && set.mcp.length)
            lines.push(`- MCP: ${set.mcp.slice(0, 24).join(", ")}`);
        if (Array.isArray(set.skill) && set.skill.length)
            lines.push(`- Skill: ${set.skill.slice(0, 24).join(", ")}`);
    };
    addGrantSet("Configured Tools", snapshot.configuredTools || {});
    addGrantSet("Continuity Allowed Tools", snapshot.allowedTools || {});
    addGrantSet("Requested Tools", snapshot.requested || {});
    addGrantSet("Synced Tools", snapshot.synced || {});
    addGrantSet("Missing Tools", snapshot.missing || {});
    if (Array.isArray(snapshot.invokedSkills) && snapshot.invokedSkills.length) {
        lines.push("", "## Invoked Skills");
        for (const skill of snapshot.invokedSkills.slice(0, 24)) {
            lines.push(`- ${skill.name || "unknown"}${skill.contentHash ? `#${skill.contentHash}` : ""}${skill.source ? ` (${skill.source})` : ""}`);
        }
    }
    if (Array.isArray(snapshot.configuredSources) && snapshot.configuredSources.length) {
        lines.push("", "## Configured Sources");
        for (const source of snapshot.configuredSources.slice(0, 16)) {
            lines.push(`- ${source.source}/${source.scope}/${source.id}: MCP ${source.counts?.mcp || 0}, Skill ${source.counts?.skill || 0}`);
        }
    }
    if (Array.isArray(snapshot.dispatchGates) && snapshot.dispatchGates.length) {
        lines.push("", "## Runtime Gates");
        for (const gate of snapshot.dispatchGates.slice(0, 12)) {
            lines.push(`- ${gate.dispatch_gate_id || gate.gateId || gate.id || "gate"}: dispatchReady=${gate.dispatchReady !== false}; blockers=${(gate.blockers || []).slice(0, 6).join(", ")}`);
        }
    }
    if (Array.isArray(snapshot.warnings) && snapshot.warnings.length) {
        lines.push("", "## Warnings");
        for (const warning of snapshot.warnings.slice(0, 12))
            lines.push(`- ${warning}`);
    }
    if (Array.isArray(snapshot.errors) && snapshot.errors.length) {
        lines.push("", "## Errors");
        for (const error of snapshot.errors.slice(0, 12))
            lines.push(`- ${error}`);
    }
    return compactPreserveLines(lines.join("\n"), 16_000);
}
function buildGroupToolContinuitySnapshot(groupId, memory = {}, options = {}) {
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
    const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
    const config = buildGroupToolContinuityConfigSources(groupId, memory);
    const allowedSets = [config.configuredTools];
    const requestedSets = [config.configuredTools];
    const syncedSets = [];
    const missingSets = [];
    const mcpStatuses = [];
    const skillStatuses = [];
    const invokedSkills = [];
    const authorizationReadiness = [];
    const dispatchGates = [];
    const permissionRules = [];
    const warnings = new Set();
    const errors = new Set();
    const snapshotIds = new Set();
    const snapshotPaths = new Set();
    const mcpConfigPaths = new Set();
    const catalogRevisions = new Set();
    const sourceMessageIds = new Set();
    const sourceTaskIds = new Set();
    const sourceProjects = new Set();
    let runtimeSnapshotCount = 0;
    let runtimeAuditCount = 0;
    let receiptCount = 0;
    let lastRuntimeAt = "";
    const markMeta = (meta = {}) => {
        if (meta.messageId)
            sourceMessageIds.add(String(meta.messageId));
        if (meta.taskId)
            sourceTaskIds.add(String(meta.taskId));
        if (meta.project)
            sourceProjects.add(String(meta.project));
        if (meta.at && String(meta.at).localeCompare(lastRuntimeAt) > 0)
            lastRuntimeAt = String(meta.at);
    };
    const addInvoked = (values, source = "", at = "") => {
        for (const value of Array.isArray(values) ? values : []) {
            const skill = normalizeToolContinuitySkill(value, source, at);
            if (skill)
                invokedSkills.push(skill);
        }
    };
    const addSnapshot = (snapshot, meta = {}) => {
        if (!snapshot || typeof snapshot !== "object")
            return;
        runtimeSnapshotCount += 1;
        markMeta(meta);
        const allowed = extractToolGrantSet(snapshot.allowedTools || snapshot.allowed_tools || {});
        if (hasToolGrantSet(allowed)) {
            allowedSets.push(allowed);
            requestedSets.push(allowed);
        }
        if (snapshot.snapshotId || snapshot.snapshot_id)
            snapshotIds.add(String(snapshot.snapshotId || snapshot.snapshot_id));
        if (snapshot.snapshotPath || snapshot.snapshot_path)
            snapshotPaths.add(String(snapshot.snapshotPath || snapshot.snapshot_path));
        if (snapshot.mcpConfigPath || snapshot.mcp_config_path)
            mcpConfigPaths.add(String(snapshot.mcpConfigPath || snapshot.mcp_config_path));
        if (snapshot.catalogRevision || snapshot.catalog_revision)
            catalogRevisions.add(String(snapshot.catalogRevision || snapshot.catalog_revision));
        if (Array.isArray(snapshot.permissionRules || snapshot.permission_rules))
            permissionRules.push(...(snapshot.permissionRules || snapshot.permission_rules).slice(0, 50));
        const readiness = compactToolContinuityReadiness(snapshot.authorizationReadiness || snapshot.authorization_readiness, "runtime_snapshot");
        if (readiness)
            authorizationReadiness.push(readiness);
        const gate = snapshot.dispatchGate || snapshot.dispatch_gate;
        if (gate && typeof gate === "object")
            dispatchGates.push({ ...gate, source: "runtime_snapshot" });
    };
    const addAudit = (audit, meta = {}) => {
        if (!audit || typeof audit !== "object")
            return;
        runtimeAuditCount += 1;
        markMeta({ ...meta, at: meta.at || audit.timestamp || audit.at || "" });
        requestedSets.push(extractToolGrantSet(audit.requested || audit.requestedTools || audit.requested_tools || {}));
        syncedSets.push(extractToolGrantSet(audit.synced || audit.syncedTools || audit.synced_tools || {}));
        missingSets.push(extractToolGrantSet(audit.missing || audit.missingTools || audit.missing_tools || {}));
        for (const row of Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : []) {
            const status = compactToolContinuityStatus(row, "mcp", "runtime_audit");
            if (status)
                mcpStatuses.push(status);
        }
        for (const row of Array.isArray(audit.skill_statuses) ? audit.skill_statuses : []) {
            const status = compactToolContinuityStatus(row, "skill", "runtime_audit");
            if (status)
                skillStatuses.push(status);
        }
        for (const rule of Array.isArray(audit.permission_rules) ? audit.permission_rules : [])
            permissionRules.push(rule);
        addInvoked(audit.invoked_skills || audit.invokedSkills || [], "runtime_audit", audit.timestamp || audit.at || meta.at || "");
        const readiness = compactToolContinuityReadiness(audit.authorization_readiness || audit.authorizationReadiness, "runtime_audit");
        if (readiness)
            authorizationReadiness.push(readiness);
        const gate = audit.dispatch_gate || audit.dispatchGate;
        if (gate && typeof gate === "object")
            dispatchGates.push({ ...gate, source: "runtime_audit" });
        if (audit.snapshotId || audit.snapshot_id)
            snapshotIds.add(String(audit.snapshotId || audit.snapshot_id));
        if (audit.snapshotPath || audit.snapshot_path)
            snapshotPaths.add(String(audit.snapshotPath || audit.snapshot_path));
        if (audit.mcpConfigPath || audit.mcp_config_path)
            mcpConfigPaths.add(String(audit.mcpConfigPath || audit.mcp_config_path));
        if (audit.catalogRevision || audit.catalog_revision)
            catalogRevisions.add(String(audit.catalogRevision || audit.catalog_revision));
        for (const warning of Array.isArray(audit.warnings) ? audit.warnings : [])
            warnings.add(compactMemoryText(warning, 220));
        for (const error of Array.isArray(audit.errors) ? audit.errors : [])
            errors.add(compactMemoryText(error, 220));
    };
    const visitRuntimeCarrier = (carrier, meta = {}) => {
        if (!carrier || typeof carrier !== "object")
            return;
        markMeta({
            messageId: meta.messageId || carrier.messageId || carrier.message_id || carrier.id || carrier.uuid || "",
            taskId: meta.taskId || carrier.taskId || carrier.task_id || "",
            project: meta.project || carrier.project || carrier.agent || carrier.target_project || carrier.target || "",
            at: meta.at || carrier.time || carrier.timestamp || carrier.generated_at || carrier.generatedAt || "",
        });
        if (carrier.runtimeToolSnapshot || carrier.runtime_tool_snapshot)
            addSnapshot(carrier.runtimeToolSnapshot || carrier.runtime_tool_snapshot, meta);
        if (carrier.runtimeToolSync || carrier.runtime_tool_sync)
            addAudit(carrier.runtimeToolSync || carrier.runtime_tool_sync, meta);
        if (carrier.runtime_tooling || carrier.runtimeTooling)
            addAudit(carrier.runtime_tooling || carrier.runtimeTooling, meta);
        if (carrier.allowedTools || carrier.allowed_tools) {
            const allowed = extractToolGrantSet(carrier.allowedTools || carrier.allowed_tools);
            if (hasToolGrantSet(allowed)) {
                allowedSets.push(allowed);
                requestedSets.push(allowed);
            }
        }
        addInvoked(carrier.invokedSkills || carrier.invoked_skills || [], "receipt", meta.at || carrier.time || carrier.timestamp || "");
        if (carrier.receipt && typeof carrier.receipt === "object") {
            receiptCount += 1;
            visitRuntimeCarrier(carrier.receipt, meta);
        }
        const deliveryRuntime = carrier.delivery_summary?.runtime_tooling || carrier.deliverySummary?.runtime_tooling || carrier.deliverySummary?.runtimeTooling;
        if (deliveryRuntime)
            addAudit(deliveryRuntime, meta);
        for (const event of Array.isArray(carrier.workEvents) ? carrier.workEvents : []) {
            addAudit(event.runtimeToolSync || event.runtime_tool_sync || event.data?.runtime_tool_sync || event.data?.runtimeToolSync, {
                ...meta,
                at: event.at || event.timestamp || meta.at,
            });
            addInvoked(event.invokedSkills || event.invoked_skills || event.data?.invoked_skills || [], "work_event", event.at || event.timestamp || meta.at || "");
        }
    };
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger.slice(-80) : []) {
        visitRuntimeCarrier(item, {
            taskId: item.taskId || item.task_id || "",
            project: item.project || item.agent || "",
            at: item.time || item.timestamp || "",
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId).slice(-160)) {
        visitRuntimeCarrier(message, {
            messageId: message.id || message.uuid || "",
            taskId: message.task_id || message.taskId || "",
            project: message.agent || message.target || "",
            at: message.timestamp || message.time || "",
        });
    }
    try {
        const payload = (0, tool_authorization_1.buildToolAuthorizationPayload)(config.configuredTools);
        requestedSets.push(payload.tools);
        const readiness = compactToolContinuityReadiness(payload.authorization_readiness, "current_authorization");
        if (readiness)
            authorizationReadiness.push(readiness);
        for (const row of Array.isArray(payload.tool_audit?.mcp) ? payload.tool_audit.mcp : []) {
            const status = compactToolContinuityStatus(row, "mcp", "current_authorization");
            if (status)
                mcpStatuses.push(status);
        }
        for (const row of Array.isArray(payload.tool_audit?.skills) ? payload.tool_audit.skills : []) {
            const status = compactToolContinuityStatus(row, "skill", "current_authorization");
            if (status)
                skillStatuses.push(status);
        }
        const unavailable = payload.authorization_readiness?.unavailable || {};
        missingSets.push({
            mcp: (Array.isArray(unavailable.mcp) ? unavailable.mcp : []).map((row) => row.raw || (row.tool ? `${row.server}/${row.tool}` : row.server)).filter(Boolean),
            skill: (Array.isArray(unavailable.skill) ? unavailable.skill : []).map((row) => row.name).filter(Boolean),
        });
    }
    catch (error) {
        warnings.add(`current_authorization_audit_failed: ${compactMemoryText(error?.message || String(error), 180)}`);
    }
    const configuredTools = config.configuredTools;
    const allowedTools = mergeToolGrantSets(...allowedSets);
    const requested = mergeToolGrantSets(...requestedSets);
    const synced = mergeToolGrantSets(...syncedSets);
    const missing = mergeToolGrantSets(...missingSets);
    const uniqueInvokedSkills = uniqueByKey(invokedSkills, (item) => `${item.name || ""}#${item.contentHash || ""}`, 50);
    const uniqueMcpStatuses = uniqueByKey(mcpStatuses, (item) => `${item.raw || item.server || ""}/${item.tool || ""}/${item.state || ""}/${item.source || ""}`, 80);
    const uniqueSkillStatuses = uniqueByKey(skillStatuses, (item) => `${item.name || ""}/${item.state || ""}/${item.source || ""}`, 80);
    const hasMissing = hasToolGrantSet(missing);
    const hasRuntimeEvidence = runtimeSnapshotCount > 0 || runtimeAuditCount > 0 || uniqueInvokedSkills.length > 0;
    const status = errors.size ? "fail"
        : hasMissing ? "needs_attention"
            : hasToolGrantSet(allowedTools) || hasRuntimeEvidence ? "ready"
                : "empty";
    const base = {
        schema: "ccm-group-tool-continuity-snapshot-v1",
        version: exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
        groupId,
        generatedAt,
        reason: String(options.reason || "save_group_memory"),
        status,
        snapshotFile,
        summaryFile,
        strategy: "cc-tool-skill-continuity-context-v1",
        configuredTools,
        allowedTools,
        requested,
        synced,
        missing,
        invokedSkills: uniqueInvokedSkills,
        mcpStatuses: uniqueMcpStatuses,
        skillStatuses: uniqueSkillStatuses,
        permissionRules: uniqueByKey(permissionRules, (item) => JSON.stringify(item || {}), 80),
        authorizationReadiness: uniqueByKey(authorizationReadiness, (item) => `${item.source || ""}/${item.status || ""}/${JSON.stringify(item.missing || {})}`, 20),
        dispatchGates: uniqueByKey(dispatchGates, (item) => `${item.dispatch_gate_id || item.gateId || item.id || ""}/${item.source || ""}`, 20),
        configuredSources: config.configuredSources,
        sourceSummary: {
            groupFound: config.groupFound,
            memberCount: config.memberCount,
            configuredSourceCount: config.configuredSources.length,
            runtimeSnapshotCount,
            runtimeAuditCount,
            receiptCount,
        },
        sourceMessageIds: Array.from(sourceMessageIds).filter(Boolean).slice(-60),
        sourceTaskIds: Array.from(sourceTaskIds).filter(Boolean).slice(-60),
        sourceProjects: Array.from(sourceProjects).filter(Boolean).slice(-30),
        snapshotIds: Array.from(snapshotIds).filter(Boolean).slice(-30),
        snapshotPaths: Array.from(snapshotPaths).filter(Boolean).slice(-30),
        mcpConfigPaths: Array.from(mcpConfigPaths).filter(Boolean).slice(-30),
        catalogRevisions: Array.from(catalogRevisions).filter(Boolean).slice(-30),
        warnings: Array.from(warnings).filter(Boolean).slice(-30),
        errors: Array.from(errors).filter(Boolean).slice(-30),
        lastRuntimeAt,
        hasRuntimeEvidence,
        shouldReuseAsContext: true,
        shouldBypassAuthorization: false,
    };
    const markdown = renderGroupToolContinuityMarkdown(base);
    const markdownChecksum = hashSessionMemoryText(markdown, 24);
    const snapshotChecksum = hashSessionMemoryText({ ...base, markdownChecksum }, 24);
    return {
        ...base,
        snapshotChecksum,
        markdownChecksum,
        markdownChars: markdown.length,
        markdownExcerpt: compactPreserveLines(markdown, 1200),
        markdown,
    };
}
function summarizeGroupToolContinuitySnapshot(snapshot = {}) {
    if (!snapshot?.schema)
        return null;
    const { markdown, ...rest } = snapshot;
    return {
        ...rest,
        markdownExcerpt: compactPreserveLines(snapshot.markdownExcerpt || markdown || "", 1200),
    };
}
function persistGroupToolContinuitySnapshot(groupId, memory = {}, options = {}) {
    const snapshot = buildGroupToolContinuitySnapshot(groupId, memory, options);
    writeTextAtomic(snapshot.summaryFile, snapshot.markdown);
    writeJsonAtomic(snapshot.snapshotFile, summarizeGroupToolContinuitySnapshot(snapshot));
    return summarizeGroupToolContinuitySnapshot(snapshot);
}
function readGroupToolContinuitySnapshotSummary(groupId) {
    const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
    const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
        const markdown = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : "";
        return {
            ...parsed,
            schema: "ccm-group-tool-continuity-snapshot-v1",
            version: exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: markdown ? hashSessionMemoryText(markdown, 24) === parsed.markdownChecksum : false,
            markdownExcerpt: compactPreserveLines(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    catch {
        return {
            schema: "ccm-group-tool-continuity-snapshot-v1",
            version: exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: fs.existsSync(summaryFile),
            markdownChecksumMatches: false,
            shouldReuseAsContext: true,
            shouldBypassAuthorization: false,
            status: "empty",
            generatedAt: "",
            configuredTools: { mcp: [], skill: [] },
            allowedTools: { mcp: [], skill: [] },
            requested: { mcp: [], skill: [] },
            synced: { mcp: [], skill: [] },
            missing: { mcp: [], skill: [] },
            invokedSkills: [],
            hasRuntimeEvidence: false,
        };
    }
}
function normalizeCompactFileReferencePath(value) {
    return String(value || "").replace(/\\/g, "/").trim();
}
function compactFileReferenceId(groupId, type, filePath) {
    return `compact-file:${crypto.createHash("sha256").update(JSON.stringify([groupId, type, normalizeCompactFileReferencePath(filePath)])).digest("hex").slice(0, 14)}`;
}
function compactFileReferenceKind(filePath) {
    try {
        const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        return stat?.isDirectory() ? "directory" : "file";
    }
    catch {
        return "file";
    }
}
function compactFileReferenceEntry(groupId, type, filePath, reason, extra = {}) {
    const normalizedPath = String(filePath || "").trim();
    if (!normalizedPath)
        return null;
    const sourceState = buildGroupMemorySourceEntry(`compact:${type}`, normalizedPath, type);
    return {
        schema: "ccm-compact-file-reference-v1",
        reference_id: compactFileReferenceId(groupId, type, normalizedPath),
        type,
        kind: sourceState.kind || compactFileReferenceKind(normalizedPath),
        path: normalizedPath,
        displayPath: normalizeCompactFileReferencePath(normalizedPath),
        reason: compactMemoryText(reason, 260),
        exists: sourceState.exists === true,
        bytes: Number(sourceState.bytes || 0),
        checksum: sourceState.checksum || "",
        checksumMode: sourceState.checksumMode || "",
        mtimeMs: Number(sourceState.mtimeMs || 0),
        mtime: sourceState.mtime || "",
        sourceChecksum: sourceState.checksum || "",
        sourceChecksumMode: sourceState.checksumMode || "",
        sourceMtimeMs: Number(sourceState.mtimeMs || 0),
        sourceMtime: sourceState.mtime || "",
        sourceBytes: Number(sourceState.bytes || 0),
        ...extra,
    };
}
function uniqueCompactFileReferences(refs = [], limit = 40) {
    return uniqueByKey(refs.filter(Boolean), (item) => `${item.reference_id || ""}|${normalizeCompactFileReferencePath(item.path || "")}`, limit);
}
function buildGroupCompactFileReferences(groupId, input = {}) {
    const refs = [];
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const rawSources = input.rawSources || input.raw_sources || {};
    const sessionMemory = input.sessionMemory || input.session_memory || {};
    const toolContinuity = input.toolContinuity || input.tool_continuity || {};
    const typedMemory = input.typedMemory || input.typed_memory || {};
    const add = (type, filePath, reason, extra = {}) => {
        const ref = compactFileReferenceEntry(groupId, type, filePath, reason, extra);
        if (ref)
            refs.push(ref);
    };
    add("group_session_memory", sessionMemory.summaryFile || rawSources.group_session_memory_summary_file, "CC 风格 Session Memory summary.md；压缩后优先作为会话短记忆恢复。", {
        checksum: sessionMemory.markdownChecksum || "",
        source_schema: sessionMemory.schema || "",
    });
    add("group_session_memory_snapshot", sessionMemory.snapshotFile || rawSources.group_session_memory_snapshot_file, "Session Memory snapshot.json；用于核对摘要 checksum 和压缩边界。", {
        checksum: sessionMemory.snapshotChecksum || sessionMemory.summaryChecksum || "",
        source_schema: sessionMemory.schema || "",
    });
    add("tool_continuity_summary", toolContinuity.summaryFile || rawSources.group_tool_continuity_summary_file, "工具/技能连续性 summary.md；只恢复上下文，不扩大授权。", {
        checksum: toolContinuity.markdownChecksum || "",
        source_schema: toolContinuity.schema || "",
    });
    add("tool_continuity_snapshot", toolContinuity.snapshotFile || rawSources.group_tool_continuity_snapshot_file, "工具/技能连续性 snapshot.json；用于核对 allowed/requested/synced/missing 和 invoked skills。", {
        checksum: toolContinuity.snapshotChecksum || "",
        source_schema: toolContinuity.schema || "",
    });
    add("typed_memory_index", rawSources.group_typed_memory_index_file || typedMemory.sync?.indexFile || typedMemory.sync?.index_file, "typed MEMORY.md 入口；长期记忆索引和召回入口。");
    add("typed_memory_dir", rawSources.group_typed_memory_dir || typedMemory.sync?.memoryDir || typedMemory.sync?.memory_dir, "typed memory 目录；必要时按索引继续读取具体记忆文档。");
    add("group_memory_json", rawSources.group_memory_file || getGroupMemoryFile(groupId), "群聊结构化记忆 JSON；压缩摘要、约束和工作账本的结构化来源。");
    add("raw_group_messages_json", rawSources.group_messages_file || getGroupMessagesFileHint(groupId), "群聊原始消息 JSON；最高保真来源，按 message id 回溯。");
    add("global_agent_memory_json", rawSources.global_agent_memory_file, "全局 Agent 长期记忆 JSON；只注入与当前任务匹配的全局约束/历史结论，使用前必须核验当前状态。");
    add("global_memory_arbitration_ledger", rawSources.group_global_memory_arbitration_ledger_file, "全局/群聊记忆仲裁账本；用于核对被本群聊新证据降权或冲突的全局记忆，并为 typed memory 蒸馏提供候选。");
    add("global_memory_cross_group_arbitration", rawSources.global_memory_cross_group_arbitration_dir, "跨群聊全局记忆仲裁 ledger 目录；用于核对同一全局记忆是否已在其他群聊被降权/冲突，避免 stale 全局记忆重复注入子 Agent。");
    add("typed_memory_recall_ledger", rawSources.group_typed_memory_recall_ledger_file, "typed memory recall ledger；用于避免重复召回和核对已 surfaced 记忆。");
    add("typed_memory_distillation_ledger", rawSources.group_typed_memory_distillation_ledger_file, "typed memory distillation ledger；用于核对长期日志蒸馏和归档。");
    add("post_compact_candidate_usage_ledger", rawSources.group_post_compact_candidate_usage_ledger_file, "压缩重注入候选使用账本；子 Agent 回执应声明 used/ignored/verified。");
    add("post_compact_dispatch_ledger", rawSources.group_post_compact_dispatch_ledger_file, "压缩后首次派发账本；用于核对 post-compact 第一跳上下文。");
    add("replay_repair_work_items", rawSources.group_replay_repair_work_items_file, "Replay repair work items；压缩恢复缺口的待办来源。");
    for (const entry of Array.isArray(sourceManifest.entries) ? sourceManifest.entries : []) {
        if (!entry?.path)
            continue;
        if (!["typed_memory_doc", "typed_memory_entrypoint", "raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")))
            continue;
        add(String(entry.type || "memory_source"), entry.path, `source manifest ${entry.id || "entry"}；${entry.type || "memory source"}`, {
            manifest_id: entry.id || "",
            checksum: entry.checksum || entry.docChecksum || "",
            source_schema: sourceManifest.schema || "",
        });
    }
    const unique = uniqueCompactFileReferences(refs, Number(input.limit || 40));
    return {
        schema: "ccm-group-compact-file-references-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: String(input.generatedAt || input.generated_at || new Date().toISOString()),
        referenceCount: unique.length,
        fileCount: unique.filter((item) => item.kind === "file").length,
        directoryCount: unique.filter((item) => item.kind === "directory").length,
        missingCount: unique.filter((item) => item.exists === false).length,
        references: unique,
        usePolicy: {
            sourceOfTruth: "raw_group_messages_json",
            behavior: "compact_file_reference",
            note: "这些路径是压缩后恢复上下文的文件引用；内容过大或过旧时应按当前任务选择性读取/核验，不要盲目假定。",
        },
    };
}
function compactFileReferenceReadPlanPriority(reference = {}) {
    const type = String(reference.type || "");
    if (reference.exists === false)
        return { priority: 900, action: "skip_missing", readMode: "unavailable", reason: "引用路径不存在；不要假定该来源可读，在 memoryIgnored 中说明缺失。" };
    if (type === "group_session_memory")
        return { priority: 10, action: "read_first_for_compact_summary", readMode: "read_markdown_summary", reason: "压缩后短记忆摘要，优先用来恢复会话目标、约束和近期结论。" };
    if (type === "raw_group_messages_json")
        return { priority: 20, action: "read_if_summary_is_insufficient", readMode: "targeted_json_source_of_truth", reason: "群聊原始消息是最高保真来源；只在需要核对 message id、用户原话或摘要冲突时读取。" };
    if (type === "typed_memory_index")
        return { priority: 30, action: "read_index_before_specific_memory_docs", readMode: "read_index_then_targeted_docs", reason: "typed MEMORY.md 是长期记忆入口；先看索引，再按任务读取具体类型化文档。" };
    if (type === "typed_memory_dir")
        return { priority: 35, action: "list_or_open_index_only", readMode: "directory_index_only", reason: "typed memory 目录只作为入口；避免盲目读取整个目录。" };
    if (type === "group_memory_json")
        return { priority: 40, action: "read_for_structured_state", readMode: "targeted_json_state", reason: "结构化群聊记忆可核对 workerLedger、约束、压缩边界和当前阶段。" };
    if (type === "group_session_memory_snapshot")
        return { priority: 45, action: "read_to_verify_summary_checksum", readMode: "targeted_json_metadata", reason: "用于核对 Session Memory 摘要 checksum、边界和生成状态。" };
    if (type === "tool_continuity_summary")
        return { priority: 50, action: "read_if_tool_or_skill_context_matters", readMode: "read_markdown_summary", reason: "工具/技能连续性只恢复上下文，不扩大授权；涉及工具选择时再读取。" };
    if (type === "tool_continuity_snapshot")
        return { priority: 55, action: "read_to_verify_tool_context_only", readMode: "targeted_json_metadata", reason: "核对 allowed/requested/synced/missing 与 invoked skills，仍以当前 runtime gate 为准。" };
    if (type === "post_compact_candidate_usage_ledger")
        return { priority: 60, action: "read_for_candidate_usage_history", readMode: "targeted_json_ledger", reason: "核对压缩重注入候选历史 used/ignored/verified，避免重复提升 stale 记忆。" };
    if (type === "post_compact_dispatch_ledger")
        return { priority: 65, action: "read_for_first_dispatch_after_compact", readMode: "targeted_json_ledger", reason: "核对压缩后第一跳派发 marker 和边界连续性。" };
    if (type === "typed_memory_recall_ledger")
        return { priority: 70, action: "read_for_recall_dedupe", readMode: "targeted_json_ledger", reason: "需要排查重复召回或已 surfaced 记忆时再读取。" };
    if (type === "typed_memory_distillation_ledger")
        return { priority: 75, action: "read_for_distillation_archive", readMode: "targeted_json_ledger", reason: "需要核对长期日志蒸馏、归档和降权历史时再读取。" };
    if (type === "global_memory_arbitration_ledger")
        return { priority: 58, action: "read_for_global_group_memory_conflict_history", readMode: "targeted_json_ledger", reason: "排查全局记忆与本群聊新证据冲突时读取；重复冲突应优先蒸馏为 typed MEMORY.md。" };
    if (type === "global_memory_cross_group_arbitration")
        return { priority: 59, action: "read_for_cross_group_global_memory_suppression", readMode: "directory_index_then_targeted_json_ledgers", reason: "排查同一全局记忆是否已在其他群聊被降权/冲突；只能作为谨慎背景，不能覆盖当前群聊证据。" };
    if (type === "replay_repair_work_items")
        return { priority: 80, action: "read_for_replay_repair_work", readMode: "targeted_json_work_items", reason: "需要处理压缩恢复缺口或待办时读取。" };
    return { priority: 85, action: "read_if_current_task_requires", readMode: reference.kind === "directory" ? "directory_index_only" : "targeted_file_read", reason: "按当前任务相关性决定是否读取；读取后必须在回执声明。" };
}
function buildGroupCompactFileReferenceReadPlan(groupId, references = {}, options = {}) {
    const refs = Array.isArray(references?.references) ? references.references : [];
    const maxEntries = Math.max(1, Math.min(20, Number(options.maxEntries || options.max_entries || 10)));
    const entries = refs.map((reference) => {
        const plan = compactFileReferenceReadPlanPriority(reference);
        const bytes = Number(reference.bytes || 0);
        const maxBytesToInspect = reference.kind === "directory"
            ? 0
            : Math.min(bytes || Number(options.defaultMaxBytes || 128 * 1024), Number(options.maxBytesPerReference || options.max_bytes_per_reference || 256 * 1024));
        return {
            schema: "ccm-compact-file-reference-read-plan-entry-v1",
            read_plan_id: `cfr-read:${crypto.createHash("sha256").update(JSON.stringify([groupId, reference.reference_id || "", reference.path || "", plan.action])).digest("hex").slice(0, 12)}`,
            reference_id: reference.reference_id || "",
            type: reference.type || "",
            kind: reference.kind || "",
            path: reference.path || "",
            displayPath: reference.displayPath || normalizeCompactFileReferencePath(reference.path || ""),
            exists: reference.exists === true,
            sourceChecksum: reference.sourceChecksum || reference.checksum || "",
            sourceChecksumMode: reference.sourceChecksumMode || reference.checksumMode || "",
            sourceMtimeMs: Number(reference.sourceMtimeMs || reference.mtimeMs || 0),
            sourceMtime: reference.sourceMtime || reference.mtime || "",
            sourceBytes: Number(reference.sourceBytes || reference.bytes || 0),
            priority: plan.priority,
            action: plan.action,
            readMode: plan.readMode,
            maxBytesToInspect,
            tokenBudgetHint: maxBytesToInspect ? Math.ceil(maxBytesToInspect / 4) : 0,
            reason: plan.reason,
            receipt: "读取或决定不读取后，在 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 中引用 read_plan_id、reference_id 或路径。",
        };
    }).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0) || String(a.type || "").localeCompare(String(b.type || "")));
    const planned = entries.filter((entry) => entry.action !== "skip_missing").slice(0, maxEntries);
    const missing = entries.filter((entry) => entry.action === "skip_missing");
    const sourceOfTruth = planned.filter((entry) => ["raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")));
    const compactSummaries = planned.filter((entry) => ["group_session_memory", "typed_memory_index", "tool_continuity_summary"].includes(String(entry.type || "")));
    return {
        schema: "ccm-group-compact-file-reference-read-plan-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        sourceReferenceCount: refs.length,
        plannedCount: planned.length,
        missingCount: missing.length,
        maxEntries,
        hasSourceOfTruth: sourceOfTruth.length > 0,
        hasCompactSummary: compactSummaries.length > 0,
        entries: [...planned, ...missing.slice(0, Math.max(0, maxEntries - planned.length))],
        policy: {
            mode: "read_on_demand_after_compact",
            sourceOfTruth: "raw_group_messages_json",
            doNotReadAll: true,
            preferOrder: ["group_session_memory", "raw_group_messages_json", "typed_memory_index", "group_memory_json"],
            receiptFields: ["memoryUsed", "memoryIgnored"],
            note: "这是压缩后文件引用读取计划：先按任务相关性选择读取，避免盲目全量读目录或大 JSON；读取或忽略都要回执声明。",
        },
    };
}
function readGroupCompactFileReferenceLedger(groupId) {
    const file = getGroupCompactFileReferenceLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            entries: Array.isArray(parsed.entries) ? parsed.entries : [],
            stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-compact-file-reference-ledger-v1",
            version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
            groupId,
            file,
            entries: [],
            stats: {},
            updatedAt: "",
        };
    }
}
function writeGroupCompactFileReferenceLedger(groupId, ledger) {
    const file = getGroupCompactFileReferenceLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-compact-file-reference-ledger-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        entries: (ledger.entries || []).slice(-180),
        stats: ledger.stats || {},
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
    return { ...ledger, file };
}
function compactReferenceFingerprint(references = []) {
    return hashSessionMemoryText((references || []).map((item) => ({
        id: item.reference_id,
        path: normalizeCompactFileReferencePath(item.path || ""),
        checksum: item.checksum || "",
    })), 16);
}
function compactFileReferenceTextForDetection(reference = {}) {
    return [
        reference.reference_id,
        reference.path,
        reference.displayPath,
        path.basename(String(reference.path || "")),
    ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}
function compactFileReferenceMentioned(text, reference = {}) {
    const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
    if (!lower)
        return false;
    return compactFileReferenceTextForDetection(reference).some(token => token && lower.includes(token));
}
function recordGroupCompactFileReferenceSurfacing(groupId, references = {}, options = {}) {
    if (!references?.schema || !Array.isArray(references.references) || !references.references.length)
        return null;
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const readPlan = options.readPlan || options.read_plan || {};
    const readPlanEntries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
    const readPlanRevalidationGate = options.readPlanRevalidationGate || options.read_plan_revalidation_gate || null;
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const fingerprint = compactReferenceFingerprint(references.references);
    const scope = String(options.scope || options.contextKind || options.context_kind || "child_agent");
    const targetProject = String(options.targetProject || options.target_project || "");
    const entryId = `file-ref:${crypto.createHash("sha256").update(JSON.stringify([groupId, scope, targetProject, fingerprint])).digest("hex").slice(0, 14)}`;
    const entry = {
        entry_id: entryId,
        generated_at: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        scope,
        target_project: targetProject,
        task_id: String(options.taskId || options.task_id || sessionBinding?.task_id || sessionBinding?.taskId || ""),
        trace_id: String(options.traceId || options.trace_id || sessionBinding?.trace_id || sessionBinding?.traceId || ""),
        task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
        native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
        session_binding: sessionBinding?.schema ? sessionBinding : null,
        task_query_hash: hashSessionMemoryText(options.task || options.task_query || "", 12),
        reference_count: references.referenceCount || references.references.length,
        missing_count: references.missingCount || 0,
        read_plan_count: readPlanEntries.length,
        reference_fingerprint: fingerprint,
        references: references.references.slice(0, 40).map((item) => ({
            reference_id: item.reference_id,
            type: item.type,
            kind: item.kind,
            path: item.path,
            checksum: item.checksum || "",
            exists: item.exists === true,
        })),
        read_plan_entries: readPlanEntries.slice(0, 40).map((item) => ({
            read_plan_id: item.read_plan_id,
            reference_id: item.reference_id,
            type: item.type,
            action: item.action,
            priority: item.priority,
            path: item.path,
            exists: item.exists === true,
            sourceChecksum: item.sourceChecksum || "",
            sourceChecksumMode: item.sourceChecksumMode || "",
            sourceMtimeMs: Number(item.sourceMtimeMs || 0),
            sourceBytes: Number(item.sourceBytes || 0),
        })),
        read_plan_revalidation_gate: readPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
            ? {
                schema: readPlanRevalidationGate.schema,
                version: readPlanRevalidationGate.version,
                revalidation_gate_id: readPlanRevalidationGate.revalidation_gate_id || "",
                group_id: readPlanRevalidationGate.group_id || groupId,
                target_project: readPlanRevalidationGate.target_project || targetProject,
                scope: readPlanRevalidationGate.scope || scope,
                generated_at: readPlanRevalidationGate.generated_at || String(options.generatedAt || options.generated_at || new Date().toISOString()),
                status: readPlanRevalidationGate.status || "",
                action: readPlanRevalidationGate.action || "",
                required_count: Number(readPlanRevalidationGate.required_count || 0),
                verification_count: Number(readPlanRevalidationGate.verification_count || 0),
                checked_count: Number(readPlanRevalidationGate.checked_count || 0),
                required_read_plan_ids: (readPlanRevalidationGate.required_read_plan_ids || []).slice(0, 20),
                verification_read_plan_ids: (readPlanRevalidationGate.verification_read_plan_ids || []).slice(0, 12),
                required_entries: (readPlanRevalidationGate.required_entries || []).slice(0, 20),
                verification_entries: (readPlanRevalidationGate.verification_entries || []).slice(0, 12),
                receipt_contract: readPlanRevalidationGate.receipt_contract || {},
                session_binding: readPlanRevalidationGate.session_binding || sessionBinding || null,
            }
            : null,
    };
    const entries = uniqueByKey([...(ledger.entries || []), entry], (item) => item.entry_id || `${item.scope}|${item.target_project}|${item.reference_fingerprint}`, 180);
    const stats = {
        entryCount: entries.length,
        latestReferenceCount: entry.reference_count,
        latestMissingCount: entry.missing_count,
        latestReadPlanCount: entry.read_plan_count,
        targetProjects: uniqueByKey(entries.map((item) => ({ target_project: item.target_project || "" })), (item) => item.target_project, 40).map((item) => item.target_project).filter(Boolean),
    };
    return writeGroupCompactFileReferenceLedger(groupId, { ...ledger, entries, stats, updatedAt: entry.generated_at });
}
function summarizeGroupCompactFileReferenceAccess(groupId, references = {}, memory = {}) {
    const refs = Array.isArray(references?.references) ? references.references : [];
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const evidenceSources = [];
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
        evidenceSources.push({
            source: "worker_ledger",
            target_project: item.project || item.agent || "",
            task_id: item.taskId || item.task_id || "",
            text: [
                item.summary,
                ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
                ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
            ].filter(Boolean).join("\n"),
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId).slice(-160)) {
        evidenceSources.push({
            source: "group_message",
            target_project: message.agent || message.target || "",
            task_id: message.task_id || message.taskId || "",
            message_id: message.id || message.uuid || "",
            text: [
                message.content,
                JSON.stringify(message.receipt || {}),
                JSON.stringify(message.delivery_summary || {}),
            ].filter(Boolean).join("\n"),
        });
    }
    const rows = refs.map((reference) => {
        const matches = evidenceSources.filter(source => compactFileReferenceMentioned(source.text, reference)).slice(-8);
        return {
            reference_id: reference.reference_id,
            type: reference.type,
            path: reference.path,
            exists: reference.exists === true,
            mentioned: matches.length > 0,
            mention_count: matches.length,
            latest: matches[matches.length - 1] || null,
        };
    });
    const mentioned = rows.filter(row => row.mentioned);
    return {
        schema: "ccm-group-compact-file-reference-access-summary-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        ledger_file: ledger.file,
        ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        reference_count: refs.length,
        mentioned_count: mentioned.length,
        missing_count: rows.filter(row => row.exists === false).length,
        mention_rate: refs.length ? Math.round((mentioned.length / refs.length) * 1000) / 10 : null,
        rows,
        recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse(),
    };
}
function compactFileReferenceReadPlanMentionTokens(entry = {}) {
    return [
        entry.read_plan_id,
        entry.reference_id,
        entry.path,
        entry.displayPath,
        path.basename(String(entry.path || "")),
    ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}
function compactFileReferenceReadPlanMentioned(text, entry = {}) {
    const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
    if (!lower)
        return { mentioned: false, readPlanIdMentioned: false, referenceMentioned: false };
    const readPlanId = String(entry.read_plan_id || "").toLowerCase();
    const readPlanIdMentioned = !!readPlanId && lower.includes(readPlanId);
    const referenceMentioned = compactFileReferenceReadPlanMentionTokens(entry)
        .filter(token => token !== readPlanId)
        .some(token => token && lower.includes(token));
    return { mentioned: readPlanIdMentioned || referenceMentioned, readPlanIdMentioned, referenceMentioned };
}
function summarizeGroupCompactFileReferenceReadPlanAccess(groupId, readPlan = {}, memory = {}) {
    const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const evidenceSources = [];
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
        evidenceSources.push({
            source: "worker_ledger",
            target_project: item.project || item.agent || "",
            task_id: item.taskId || item.task_id || "",
            text: [
                item.summary,
                ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
                ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
            ].filter(Boolean).join("\n"),
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId).slice(-160)) {
        evidenceSources.push({
            source: "group_message",
            target_project: message.agent || message.target || "",
            task_id: message.task_id || message.taskId || "",
            message_id: message.id || message.uuid || "",
            text: [
                message.content,
                JSON.stringify(message.receipt || {}),
                JSON.stringify(message.delivery_summary || {}),
            ].filter(Boolean).join("\n"),
        });
    }
    const rows = entries.map((entry) => {
        const matches = evidenceSources.map(source => {
            const match = compactFileReferenceReadPlanMentioned(source.text, entry);
            return match.mentioned ? { ...source, read_plan_id_mentioned: match.readPlanIdMentioned, reference_mentioned: match.referenceMentioned } : null;
        }).filter(Boolean).slice(-8);
        return {
            read_plan_id: entry.read_plan_id,
            reference_id: entry.reference_id,
            type: entry.type,
            action: entry.action,
            priority: Number(entry.priority || 0),
            path: entry.path,
            exists: entry.exists === true,
            mentioned: matches.length > 0,
            read_plan_id_mentioned: matches.some((match) => match.read_plan_id_mentioned === true),
            reference_mentioned: matches.some((match) => match.reference_mentioned === true),
            mention_count: matches.length,
            latest: matches[matches.length - 1] || null,
        };
    });
    const mentioned = rows.filter(row => row.mentioned);
    const readPlanIdMentioned = rows.filter(row => row.read_plan_id_mentioned);
    return {
        schema: "ccm-group-compact-file-reference-read-plan-access-summary-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        ledger_file: ledger.file,
        ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        read_plan_entry_count: entries.length,
        mentioned_count: mentioned.length,
        read_plan_id_mentioned_count: readPlanIdMentioned.length,
        reference_mentioned_count: rows.filter(row => row.reference_mentioned).length,
        mention_rate: entries.length ? Math.round((mentioned.length / entries.length) * 1000) / 10 : null,
        read_plan_id_mention_rate: entries.length ? Math.round((readPlanIdMentioned.length / entries.length) * 1000) / 10 : null,
        rows,
        recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse().map((entry) => ({
            entry_id: entry.entry_id || "",
            generated_at: entry.generated_at || "",
            scope: entry.scope || "",
            target_project: entry.target_project || "",
            read_plan_count: Number(entry.read_plan_count || (entry.read_plan_entries || []).length || 0),
        })),
    };
}
function summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, readPlan = {}) {
    const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
    const rows = entries.map((entry) => {
        const current = buildGroupMemorySourceEntry(`read_plan:${entry.read_plan_id || entry.reference_id || entry.type || "source"}`, entry.path || "", entry.type || "compact_read_plan_source");
        const expectedChecksum = String(entry.sourceChecksum || entry.checksum || "");
        const expectedMtimeMs = Number(entry.sourceMtimeMs || entry.mtimeMs || 0);
        const expectedBytes = Number(entry.sourceBytes || entry.bytes || 0);
        const planned = entry.action !== "skip_missing";
        const existsChanged = entry.exists === true && current.exists !== true;
        const checksumChanged = !!expectedChecksum && !!current.checksum && expectedChecksum !== current.checksum;
        const bytesChanged = expectedBytes > 0 && Number(current.bytes || 0) !== expectedBytes;
        const mtimeChanged = expectedMtimeMs > 0 && Number(current.mtimeMs || 0) !== expectedMtimeMs;
        const unverifiable = planned && current.exists === true && !expectedChecksum && !expectedMtimeMs && !expectedBytes;
        const changed = planned && (existsChanged || checksumChanged || bytesChanged || (!checksumChanged && mtimeChanged));
        const freshnessStatus = !planned && current.exists !== true
            ? "missing_expected"
            : current.exists !== true ? "missing"
                : changed ? "changed"
                    : unverifiable ? "unverifiable"
                        : "fresh";
        return {
            read_plan_id: entry.read_plan_id || "",
            reference_id: entry.reference_id || "",
            type: entry.type || "",
            action: entry.action || "",
            priority: Number(entry.priority || 0),
            path: entry.path || "",
            exists: current.exists === true,
            planned,
            freshness_status: freshnessStatus,
            fresh: freshnessStatus === "fresh" || freshnessStatus === "missing_expected",
            changed,
            unverifiable,
            expected: {
                checksum: expectedChecksum,
                checksumMode: entry.sourceChecksumMode || entry.checksumMode || "",
                mtimeMs: expectedMtimeMs,
                bytes: expectedBytes,
            },
            current: {
                checksum: current.checksum || "",
                checksumMode: current.checksumMode || "",
                mtimeMs: Number(current.mtimeMs || 0),
                bytes: Number(current.bytes || 0),
                status: current.status || "",
            },
            changes: [
                existsChanged ? "exists" : "",
                checksumChanged ? "checksum" : "",
                bytesChanged ? "bytes" : "",
                mtimeChanged ? "mtimeMs" : "",
            ].filter(Boolean),
            reason: changed
                ? "read plan source changed after surfacing; re-read and verify current source before using this memory"
                : unverifiable ? "read plan source lacks stable fingerprint; verify current source before using"
                    : "read plan source is fresh",
        };
    });
    const checkedRows = rows.filter((row) => row.planned);
    const changedRows = checkedRows.filter((row) => row.changed || row.freshness_status === "missing");
    const unverifiableRows = checkedRows.filter((row) => row.unverifiable);
    const freshRows = checkedRows.filter((row) => row.freshness_status === "fresh");
    const freshnessRate = checkedRows.length ? Math.round((freshRows.length / checkedRows.length) * 1000) / 10 : null;
    const status = checkedRows.length === 0
        ? "empty"
        : changedRows.length > 0 ? "fail"
            : unverifiableRows.length > 0 ? "warn"
                : "ok";
    return {
        schema: "ccm-group-compact-file-reference-read-plan-freshness-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: new Date().toISOString(),
        status,
        checked: checkedRows.length,
        freshCount: freshRows.length,
        changedCount: changedRows.length,
        unverifiableCount: unverifiableRows.length,
        freshnessRate,
        rows: rows.slice(0, 40),
        staleRows: changedRows.slice(0, 12),
        gaps: [
            ...changedRows.slice(0, 8).map((row) => ({
                read_plan_id: row.read_plan_id,
                reference_id: row.reference_id,
                type: row.type,
                path: row.path,
                reason: row.reason,
                changes: row.changes,
            })),
            ...unverifiableRows.slice(0, 4).map((row) => ({
                read_plan_id: row.read_plan_id,
                reference_id: row.reference_id,
                type: row.type,
                path: row.path,
                reason: row.reason,
                changes: ["fingerprint_missing"],
            })),
        ].slice(0, 12),
    };
}
function latestGroupCompactFileReferenceReadPlanRows(groupId, fallbackReadPlan = {}, options = {}) {
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const maxLedgerEntries = Math.max(1, Math.min(20, Number(options.maxLedgerEntries || options.max_ledger_entries || 8)));
    const fromLedger = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-maxLedgerEntries).flatMap((entry) => (Array.isArray(entry.read_plan_entries) ? entry.read_plan_entries : []).map((row) => ({
        ...row,
        surfaced_at: entry.generated_at || "",
        surfacing_scope: entry.scope || "",
        target_project: entry.target_project || "",
        surfacing_entry_id: entry.entry_id || "",
    })));
    const rowsSource = fromLedger.length ? fromLedger : (Array.isArray(fallbackReadPlan?.entries) ? fallbackReadPlan.entries : []);
    const seen = new Set();
    const rows = [];
    for (const row of [...rowsSource].reverse()) {
        const id = String(row.read_plan_id || row.readPlanId || "").trim();
        const referenceId = String(row.reference_id || row.referenceId || "").trim();
        const refPath = String(row.path || "").trim();
        const key = id || referenceId || refPath;
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        rows.unshift({
            read_plan_id: id,
            reference_id: referenceId,
            type: row.type || "",
            action: row.action || "",
            priority: Number(row.priority || 0),
            path: refPath,
            displayPath: row.displayPath || normalizeCompactFileReferencePath(refPath),
            exists: row.exists !== false,
            sourceChecksum: row.sourceChecksum || row.source_checksum || row.checksum || "",
            sourceChecksumMode: row.sourceChecksumMode || row.source_checksum_mode || row.checksumMode || "",
            sourceMtimeMs: Number(row.sourceMtimeMs || row.source_mtime_ms || row.mtimeMs || 0),
            sourceBytes: Number(row.sourceBytes || row.source_bytes || row.bytes || 0),
            surfaced_at: row.surfaced_at || row.generated_at || "",
            surfacing_scope: row.surfacing_scope || row.scope || "",
            target_project: row.target_project || "",
            surfacing_entry_id: row.surfacing_entry_id || row.entry_id || "",
        });
    }
    return {
        schema: "ccm-group-compact-file-reference-read-plan-latest-rows-v1",
        groupId,
        ledgerFile: ledger.file,
        ledgerEntryCount: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        rows: rows.slice(0, Math.max(1, Math.min(80, Number(options.maxRows || options.max_rows || 60)))),
    };
}
function latestGroupCompactFileReferenceReadPlanRevalidationGate(groupId) {
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    for (const entry of [...entries].reverse()) {
        const gate = entry.read_plan_revalidation_gate || entry.readPlanRevalidationGate;
        if (gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") {
            return {
                ...gate,
                ledger_file: ledger.file,
                surfacing_entry_id: entry.entry_id || "",
                surfaced_at: entry.generated_at || "",
                surfacing_scope: entry.scope || "",
                target_project: entry.target_project || gate.target_project || "",
            };
        }
    }
    return null;
}
function compactReadPlanRevalidationGateRow(row = {}, action) {
    return {
        read_plan_id: row.read_plan_id || "",
        reference_id: row.reference_id || "",
        type: row.type || "",
        action: row.action || "",
        revalidation_action: action,
        priority: Number(row.priority || 0),
        path: row.path || "",
        displayPath: row.displayPath || normalizeCompactFileReferencePath(row.path || ""),
        freshness_status: row.freshness_status || "",
        changes: Array.isArray(row.changes) ? row.changes : [],
        expected: row.expected || {},
        current: row.current || {},
        reason: row.reason || "",
    };
}
function buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId, freshness = {}, options = {}) {
    const rows = Array.isArray(freshness?.rows) ? freshness.rows : [];
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const requiredRows = rows
        .filter((row) => row?.planned !== false && (row.changed === true || row.freshness_status === "missing"))
        .map((row) => compactReadPlanRevalidationGateRow(row, "must_re_read_current_source_before_use"));
    const verificationRows = rows
        .filter((row) => row?.planned !== false && row.unverifiable === true)
        .map((row) => compactReadPlanRevalidationGateRow(row, "verify_current_source_before_use"));
    const targetProject = String(options.targetProject || options.target_project || "");
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const gateId = `cfr-rvg:${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        requiredRows.map((row) => [row.read_plan_id, row.freshness_status, row.changes, row.current?.checksum || row.current?.mtimeMs || ""]),
        verificationRows.map((row) => [row.read_plan_id, row.freshness_status]),
        sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || "",
        sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || "",
    ])).digest("hex").slice(0, 14)}`;
    const status = requiredRows.length
        ? "required"
        : verificationRows.length ? "verify_recommended"
            : rows.length ? "not_required" : "empty";
    const action = requiredRows.length
        ? "re_read_changed_sources_before_using_compact_memory"
        : verificationRows.length ? "verify_unfingerprinted_sources_before_using_compact_memory"
            : "none";
    const gate = {
        schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1",
        version: exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION,
        revalidation_gate_id: gateId,
        group_id: groupId,
        target_project: targetProject,
        scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child")),
        generated_at: generatedAt,
        task_id: String(sessionBinding?.task_id || sessionBinding?.taskId || options.taskId || options.task_id || ""),
        trace_id: String(sessionBinding?.trace_id || sessionBinding?.traceId || options.traceId || options.trace_id || ""),
        task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
        native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
        session_binding: sessionBinding?.schema ? sessionBinding : null,
        status,
        action,
        required_count: requiredRows.length,
        verification_count: verificationRows.length,
        checked_count: Number(freshness.checked || rows.filter((row) => row?.planned !== false).length || 0),
        freshness_status: freshness.status || "unknown",
        freshness_rate: freshness.freshnessRate ?? null,
        changed_count: Number(freshness.changedCount || requiredRows.length || 0),
        unverifiable_count: Number(freshness.unverifiableCount || verificationRows.length || 0),
        required_read_plan_ids: requiredRows.map((row) => row.read_plan_id).filter(Boolean),
        verification_read_plan_ids: verificationRows.map((row) => row.read_plan_id).filter(Boolean),
        required_entries: requiredRows.slice(0, 20),
        verification_entries: verificationRows.slice(0, 12),
        receipt_contract: {
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            required_reference: gateId,
            required_read_plan_ids: requiredRows.map((row) => row.read_plan_id).filter(Boolean).slice(0, 20),
            required_task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
            required_native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
            memory_used_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
            memory_ignored_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
            receipt_should_match_session: !!(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || sessionBinding?.native_session_id || sessionBinding?.nativeSessionId),
            require_current_source_verification: requiredRows.length > 0,
            required_receipt_signal: "read_plan_id plus re-read/current source verified, or memoryIgnored explaining the read_plan_id was not used",
            note: "changed read plan entries must be re-read from the current source before applying compact memory; the receipt must mention the read_plan_id and gate id.",
        },
        prompt_patch: requiredRows.length
            ? [
                "Compact read plan revalidation required:",
                sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}; receipt must stay tied to this task Agent session.` : "",
                ...requiredRows.slice(0, 8).map((row) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; changes=${(row.changes || []).join(",") || row.freshness_status}; re-read current source before using compact memory.`),
                `Receipt: mention gate ${gateId}, each read_plan_id, and "current source verified" in memoryUsed; if not used, mention the read_plan_id in memoryIgnored with the reason.`,
            ].join("\n")
            : verificationRows.length
                ? [
                    "Compact read plan verification recommended:",
                    sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}.` : "",
                    ...verificationRows.slice(0, 6).map((row) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; fingerprint missing; verify current source before using.`),
                    `Receipt: mention gate ${gateId} and the read_plan_id in memoryUsed/memoryIgnored.`,
                ].join("\n")
                : "",
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 9000, maxTokens: 24_000 }),
    };
}
function summarizeMemoryItems(title, items, mapper) {
    const values = (items || []).map(mapper).filter(Boolean);
    if (!values.length)
        return "";
    return `${title}: ${values.join("；")}`;
}
function buildChildAgentSessionBinding(groupId, targetProject, task = "", options = {}) {
    const taskId = String(options.taskId || options.task_id || options.task?.id || "").trim();
    const traceId = String(options.traceId || options.trace_id || options.task?.trace_id || options.task?.traceId || "").trim();
    const taskAgentSessionId = String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionRecordId || options.session_record_id || "").trim();
    const nativeSessionId = String(options.nativeSessionId || options.native_session_id || "").trim();
    const agentType = String(options.agentType || options.agent_type || "").trim();
    const executionId = String(options.executionId || options.execution_id || "").trim();
    const parentRunId = String(options.parentRunId || options.parent_run_id || options.globalRunId || options.global_run_id || "").trim();
    const turn = Number(options.taskAgentSessionTurn || options.task_agent_session_turn || options.sessionTurn || options.session_turn || 0);
    const bindingId = `csm:${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        taskId,
        taskAgentSessionId,
        nativeSessionId,
        agentType,
        executionId,
        parentRunId,
        task ? hashSessionMemoryText(task, 12) : "",
    ])).digest("hex").slice(0, 14)}`;
    return {
        schema: "ccm-child-agent-memory-session-binding-v1",
        binding_id: bindingId,
        group_id: groupId,
        target_project: targetProject,
        task_id: taskId,
        trace_id: traceId,
        execution_id: executionId,
        parent_run_id: parentRunId,
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        agent_type: agentType,
        turn,
        binding_required: !!(taskAgentSessionId || nativeSessionId),
        scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child")),
    };
}
function compressGroupMemory(memory) {
    const next = { ...(memory || {}) };
    const summaryParts = [];
    const compressList = (key, keep = 8, title = key, mapper = (item) => JSON.stringify(item)) => {
        const items = Array.isArray(next[key]) ? next[key] : [];
        if (items.length <= keep)
            return;
        const oldItems = items.slice(0, Math.max(0, items.length - keep));
        next[key] = items.slice(-keep);
        const summary = summarizeMemoryItems(title, oldItems, mapper);
        if (summary)
            summaryParts.push(summary);
    };
    compressList("decisions", 8, "历史决策", (item) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
    compressList("completed", 10, "历史完成", (item) => `${item.project || "unknown"}:${item.summary || ""}`);
    compressList("blocked", 8, "历史阻塞", (item) => `${item.project || "unknown"}:${item.reason || ""}`);
    compressList("workerLedger", 18, "历史 Worker 通知", (item) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
    if (!next.agentMemories || !Object.keys(next.agentMemories || {}).length) {
        next.agentMemories = normalizeAgentMemories({}, next.workerLedger || []);
    }
    compressList("openQuestions", 6, "历史问题", (item) => String(item.question || item));
    compressList("nextActions", 6, "历史下一步", (item) => String(item.action || item));
    const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
    next.summary = compactMemoryText(mergedSummary, 1800);
    return next;
}
function buildGroupMemoryContext(memory) {
    if (!memory || (!memory.goal && !memory.summary && !memory.messageDigest && !memory.conversationSummary && !memory.sessionMemory?.schema && !memory.toolContinuity?.schema && !memory.decisions?.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !Object.keys(memory.agentMemories || {}).length && !memory.openQuestions?.length && !memory.nextActions?.length)) {
        return "";
    }
    const lines = [
        "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
        `- 原始/当前目标：${memory.goal || "未记录"}`,
        `- 当前阶段：${memory.currentPhase || "idle"}`,
    ];
    if (memory.summary)
        lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 900)}`);
    if (memory.messageDigest)
        lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 900)}`);
    const sessionMemory = memory.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotSummary(memory.groupId || "");
    if (sessionMemory?.schema && (sessionMemory.hasSummary || sessionMemory.markdownExists)) {
        lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；该文件是压缩后主/子 Agent 可重注入的会话级短记忆。`);
    }
    const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotSummary(memory.groupId || "");
    if (toolContinuity?.schema && (hasToolGrantSet(toolContinuity.allowedTools) || hasToolGrantSet(toolContinuity.requested) || (toolContinuity.invokedSkills || []).length || toolContinuity.markdownExists)) {
        lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；allowed MCP ${(toolContinuity.allowedTools?.mcp || []).length}/Skill ${(toolContinuity.allowedTools?.skill || []).length}；invokedSkill ${(toolContinuity.invokedSkills || []).length}；只恢复工具上下文，不扩大授权，真实派发仍以当前 runtime tool gate 为准。`);
    }
    if (memory.compactBoundary) {
        const boundary = memory.compactBoundary;
        const budget = boundary.context_budget || {};
        lines.push(`- 群聊压缩边界：${boundary.summarizedFromMessageId || ""} -> ${boundary.summarizedThroughMessageId || ""}；保留 ${boundary.preservedMessageIds?.length || 0} 条锚点；压缩前 ${boundary.preCompactTokenCount || 0} tokens，压缩后 ${boundary.postCompactTokenCount || 0} tokens，压力 ${budget.pressure ?? 0}%。`);
        if (boundary.preservedSegment?.schema) {
            lines.push(`- 保留窗口：preservedSegment 保留 ${boundary.preservedSegment.preservedMessageCount || 0} 条 / 约 ${boundary.preservedSegment.preservedTokenEstimate || 0} tokens / ${boundary.preservedSegment.preservedTextBlockMessageCount || 0} 条文本消息；首条 ${boundary.preservedSegment.firstPreservedMessageId || "unknown"}。`);
        }
    }
    if (memory.messageCompression?.compressedMessages)
        lines.push(`- 压缩状态：共 ${memory.messageCompression.totalMessages || 0} 条消息，旧消息压缩 ${memory.messageCompression.compressedMessages || 0} 条，近期原文 ${memory.messageCompression.recentLimit || 0} 条。`);
    const pressureWarning = memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning;
    if (pressureWarning?.schema) {
        lines.push(`- 上下文压力：${pressureWarning.level || "unknown"}；使用约 ${pressureWarning.tokenUsage || 0} tokens，距 auto-compact ${pressureWarning.percentLeft ?? "unknown"}%；建议 ${pressureWarning.recommendation || "continue"}${pressureWarning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
    }
    const addList = (title, items, mapper) => {
        if (!items?.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items.slice(-6))
            lines.push(`  - ${mapper(item)}`);
    };
    addList("关键决策", memory.decisions || [], (item) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
    addList("已完成", memory.completed || [], (item) => `${item.project || "unknown"}：${item.summary || ""}`);
    addList("阻塞/未完成", memory.blocked || [], (item) => `${item.project || "unknown"}：${item.reason || ""}`);
    addList("Worker scratchpad", memory.workerLedger || [], (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
    addList("开放问题", memory.openQuestions || [], (item) => String(item.question || item));
    addList("下一步", memory.nextActions || [], (item) => String(item.action || item));
    return lines.join("\n");
}
function normalizeAgentMemoryProject(project) {
    return String(project || "").trim() || "unknown";
}
function resolveGroupProjectMemoryRoot(project, options = {}) {
    const explicit = options.projectRoot || options.project_root || options.workDir || options.work_dir;
    if (explicit)
        return path.resolve(String(explicit));
    try {
        const workDir = (0, utils_1.getWorkDirForProject)(project);
        return workDir ? path.resolve(String(workDir)) : "";
    }
    catch {
        return "";
    }
}
function formatAgentMemoryReceipt(item) {
    return [
        `[${item.status || item.receiptStatus || "unknown"}]`,
        item.summary || "无摘要",
        item.filesChanged?.length ? `文件：${item.filesChanged.slice(0, 6).join("、")}` : "",
        item.verification?.length ? `验证：${item.verification.slice(0, 4).join("、")}` : "",
        item.blockers?.length ? `阻塞：${item.blockers.slice(0, 3).join("、")}` : "",
        item.needs?.length ? `需要：${item.needs.slice(0, 3).join("、")}` : "",
    ].filter(Boolean).join("；");
}
function createEmptyAgentMemory(project) {
    return {
        project: normalizeAgentMemoryProject(project),
        summary: "",
        recentReceipts: [],
        frequentFiles: [],
        verificationHints: [],
        blockers: [],
        needs: [],
        stats: { totalReceipts: 0, compressedReceipts: 0, recentReceipts: 0, lastUpdatedAt: "" },
    };
}
function upsertAgentMemory(agentMemories = {}, item = {}) {
    const normalized = normalizeWorkerLedgerItem(item);
    const project = normalizeAgentMemoryProject(normalized.project);
    if (!project || project === "unknown")
        return agentMemories || {};
    const current = { ...createEmptyAgentMemory(project), ...((agentMemories || {})[project] || {}) };
    const entry = {
        time: normalized.time,
        taskId: normalized.taskId,
        status: normalized.status,
        receiptStatus: normalized.receiptStatus,
        summary: compactMemoryText(normalized.summary, 420),
        filesChanged: normalized.filesChanged || [],
        verification: normalized.verification || [],
        blockers: normalized.blockers || [],
        needs: normalized.needs || [],
    };
    const allReceipts = uniqueByKey([...(current.recentReceipts || []), entry], (x) => [x.taskId || "", x.status || "", x.receiptStatus || "", x.summary || ""].join("|"), 20);
    const older = allReceipts.slice(0, Math.max(0, allReceipts.length - 8));
    const recentReceipts = allReceipts.slice(-8);
    const summaryParts = [current.summary || "", ...older.map((x) => formatAgentMemoryReceipt(x))].filter(Boolean);
    const files = Array.from(new Set([...(current.frequentFiles || []), ...(entry.filesChanged || [])].filter(Boolean))).slice(-20);
    const verification = Array.from(new Set([...(current.verificationHints || []), ...(entry.verification || [])].filter(Boolean))).slice(-20);
    const blockers = Array.from(new Set([...(current.blockers || []), ...(entry.blockers || [])].filter(Boolean))).slice(-20);
    const needs = Array.from(new Set([...(current.needs || []), ...(entry.needs || [])].filter(Boolean))).slice(-20);
    const totalReceipts = Math.max(Number(current.stats?.totalReceipts || 0) + 1, recentReceipts.length + Number(current.stats?.compressedReceipts || 0));
    return {
        ...(agentMemories || {}),
        [project]: {
            project,
            summary: compactMemoryText(summaryParts.join(" | "), 1800),
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
function normalizeAgentMemories(agentMemories = {}, workerLedger = []) {
    let next = { ...(agentMemories || {}) };
    for (const item of workerLedger || [])
        next = upsertAgentMemory(next, item);
    return next;
}
function getMemoryMessageContent(message) {
    return String(message?.content || message?.delivery_summary?.headline || message?.receipt?.summary || "").trim();
}
function getMemoryMessageIdentity(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function getMemoryMessageActor(message) {
    if (message?.role === "user")
        return `用户 -> ${message?.target || "all"}`;
    return message?.agent || message?.role || "Agent";
}
function anchorChecksum(type, text) {
    return crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16);
}
function buildFactAnchor(message, index, type, text) {
    const compacted = compactPreserveLines(text, 1600);
    if (!compacted)
        return null;
    const messageId = getMemoryMessageIdentity(message, index);
    return {
        id: `${messageId}:${type}`,
        type,
        messageId,
        actor: getMemoryMessageActor(message),
        text: compacted,
        timestamp: String(message?.timestamp || message?.time || ""),
        checksum: anchorChecksum(type, compacted),
    };
}
function mergeFactAnchorList(existing = [], incoming = [], limit = 300) {
    const merged = new Map();
    for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
        if (!item?.id || !item?.text)
            continue;
        merged.set(String(item.id), item);
    }
    return [...merged.values()].slice(-limit);
}
function extractGroupFactAnchors(messages) {
    const anchors = [];
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        const content = getMemoryMessageContent(message);
        if (!content)
            continue;
        if (message?.role === "user") {
            const anchor = buildFactAnchor(message, index, "user_requirement", content);
            if (anchor)
                anchors.push(anchor);
        }
        if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason || Array.isArray(message?.assignments) && message.assignments.length) {
            const anchor = buildFactAnchor(message, index, "dispatch_decision", `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`);
            if (anchor)
                anchors.push(anchor);
        }
    }
    return anchors;
}
function extractPersistentRequirementsFromAnchors(anchors) {
    return (anchors || []).filter((item) => item?.type === "user_requirement"
        && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|保留|优先|must\b|never\b|always\b|do not\b|required?\b)/i.test(String(item.text || ""))).slice(-120);
}
function getCompactBoundaryIndex(memory, messages) {
    const boundaryId = String(memory?.compactBoundary?.summarizedThroughMessageId
        || memory?.compaction?.lastCompactedMessageId
        || "");
    if (!boundaryId)
        return -1;
    return (messages || []).findIndex((message, index) => getMemoryMessageIdentity(message, index) === boundaryId);
}
function refreshGroupConversationMemorySnapshot(groupId, allMessages, memory, options = {}) {
    const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || memory?.messageCompression?.recentLimit || 12));
    const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || memory?.messageCompression?.olderLimit || 30));
    const messages = (allMessages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    const minKeepMessages = Math.max(group_memory_compaction_1.GROUP_COMPACT_MIN_KEEP_MESSAGES, Number(options.minKeepMessages || options.min_keep_messages || recentLimit));
    const minKeepTokens = Math.max(1, Number(options.minKeepTokens || options.min_keep_tokens || group_memory_compaction_1.GROUP_COMPACT_MIN_KEEP_TOKENS));
    const maxKeepTokens = Math.max(minKeepTokens, Number(options.maxKeepTokens || options.max_keep_tokens || group_memory_compaction_1.GROUP_COMPACT_MAX_KEEP_TOKENS));
    const keepIndex = (0, group_memory_compaction_1.calculateGroupMessagesToKeepIndex)(messages, {
        floorIndex: 0,
        minMessages: minKeepMessages,
        minTokens: minKeepTokens,
        maxTokens: maxKeepTokens,
    });
    const messagesToSummarize = messages.slice(0, keepIndex);
    const keptMessages = messages.slice(keepIndex);
    const activeTokenEstimate = messages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const currentPressureWarning = (0, group_memory_compaction_1.calculateGroupCompactWarningState)({
        activeTokens: activeTokenEstimate,
        activeMessageCount: messages.length,
        config: options.config || options,
    });
    const anchors = extractGroupFactAnchors(messagesToSummarize);
    const persistentRequirements = mergeFactAnchorList(memory?.persistentRequirements || [], extractPersistentRequirementsFromAnchors(anchors), 160);
    if (!messagesToSummarize.length) {
        const now = new Date().toISOString();
        const compactStrategyDecision = (0, group_memory_compaction_1.buildGroupCompactStrategyDecision)({
            groupId,
            messages,
            messagesToCompact: [],
            keptMessages: messages,
            keepIndex,
            compacted: false,
            primaryCompact: false,
            preCompactWarning: currentPressureWarning,
            activeTokens: activeTokenEstimate,
            activeMessageCount: messages.length,
            preCompactTokenCount: activeTokenEstimate,
            postCompactTokenCount: activeTokenEstimate,
            transcriptPath: getGroupMessagesFileHint(groupId),
            reason: "recent window only; no sync snapshot compaction needed",
            now,
        });
        const apiMicroCompactEditPlan = (0, group_memory_compaction_1.buildGroupApiMicroCompactEditPlan)(messages, {
            groupId,
            activeTokens: activeTokenEstimate,
            targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
            maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
            now,
        });
        return saveGroupMemory(groupId, {
            ...memory,
            conversationSummary: null,
            messageDigest: "",
            compactBoundary: null,
            compaction: {
                ...(memory?.compaction || {}),
                version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
                enabled: true,
                health: messages.length ? "recent-window-only" : "empty",
                compactedMessageCount: 0,
                totalMessagesSeen: messages.length,
                preservedRecentMessages: messages.length,
                lastCompactedMessageId: "",
                contextPressureWarning: currentPressureWarning,
                compactWarning: currentPressureWarning,
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                lastPressureSampleAt: now,
            },
            factAnchors: mergeFactAnchorList(memory?.factAnchors || [], extractGroupFactAnchors(messages), 300),
            persistentRequirements,
            messageCompression: {
                ...(memory?.messageCompression || {}),
                enabled: true,
                strategy: "cc-session-memory-v3-sync",
                configuredRecentLimit: recentLimit,
                recentLimit: messages.length,
                olderLimit,
                totalMessages: messages.length,
                compressedMessages: 0,
                recentMessages: messages.length,
                contextPressureWarning: currentPressureWarning,
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                lastCompressedAt: now,
            },
        });
    }
    const conversationSummary = (0, group_memory_compaction_1.buildDeterministicConversationSummary)(messagesToSummarize, memory, memory?.conversationSummary || {});
    const microCompact = (0, group_memory_compaction_1.buildGroupMicroCompactPlan)(messagesToSummarize);
    const postCompactReinject = (0, group_memory_compaction_1.buildPostCompactReinjectionPlan)(messagesToSummarize, microCompact);
    const now = new Date().toISOString();
    const preCompactTokenCount = messages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const postCompactTokenCount = (0, group_memory_compaction_1.estimateGroupTextTokens)(JSON.stringify(conversationSummary))
        + keptMessages.reduce((sum, message) => sum + Math.min((0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 2500), 0);
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
    const postCompactWarning = (0, group_memory_compaction_1.calculateGroupCompactWarningState)({
        activeTokens: postCompactTokenCount,
        activeMessageCount: keptMessages.length,
        config: options.config || options,
        suppressed: true,
        suppressReason: "post_sync_compaction_until_next_group_memory_pressure_sample",
        now,
    });
    const baseContextBudget = (0, context_budget_1.buildContextBudget)({
        context: {
            conversationSummary,
            microCompact: {
                compactedMessageCount: microCompact.compactedMessageCount,
                tokensFreed: microCompact.tokensFreed,
                records: (microCompact.records || []).slice(-12),
            },
            postCompactReinject,
            keptRecent: keptMessages.map((message) => getMemoryMessageContent(message)),
        },
        maxChars: 48_000,
        maxTokens: 90_000,
    });
    const previousPtlEmergency = memory?.compaction?.ptlEmergency
        || memory?.compactBoundary?.ptlEmergency
        || memory?.messageCompression?.ptlEmergency
        || null;
    const ptlRecovery = (0, group_memory_compaction_1.buildGroupPtlRecoveryPlan)({
        previousPtlEmergency,
        currentPtlEmergency: null,
        contextBudget: baseContextBudget,
        triggerTokens: previousPtlEmergency?.triggerTokens || baseContextBudget.max_tokens,
        postCompactTokenCount,
        restoredMessageDigestMaxChars: 14_000,
        summaryChecksum,
        transcriptPath: getGroupMessagesFileHint(groupId),
        config: options.config || options,
        now,
    });
    const activePtlEmergency = ptlRecovery ? null : previousPtlEmergency;
    const messageDigest = (0, group_memory_compaction_1.renderConversationSummary)(conversationSummary, activePtlEmergency?.messageDigestMaxChars || 14_000);
    const effectiveContextBudget = ptlRecovery
        ? {
            ...baseContextBudget,
            ptl_recovery: {
                schema: ptlRecovery.schema,
                reason: ptlRecovery.reason,
                restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
                contextBudgetPressure: ptlRecovery.contextBudgetPressure,
            },
        }
        : activePtlEmergency
            ? {
                ...baseContextBudget,
                ptl_emergency: {
                    schema: activePtlEmergency.schema,
                    emergencyLevel: activePtlEmergency.emergencyLevel,
                    reason: activePtlEmergency.reason,
                    messageDigestMaxChars: activePtlEmergency.messageDigestMaxChars,
                },
            }
            : baseContextBudget;
    const boundaryThrough = messagesToSummarize[messagesToSummarize.length - 1];
    const preservedSegment = (0, group_memory_compaction_1.buildGroupPreservedSegment)(messages, keepIndex, {
        floorIndex: 0,
        minMessages: minKeepMessages,
        minTokens: minKeepTokens,
        maxTokens: maxKeepTokens,
        summaryChecksum,
        transcriptPath: getGroupMessagesFileHint(groupId),
        now,
    });
    const compactStrategyDecision = (0, group_memory_compaction_1.buildGroupCompactStrategyDecision)({
        groupId,
        messages,
        messagesToCompact: messagesToSummarize,
        keptMessages,
        keepIndex,
        compacted: true,
        primaryCompact: true,
        microCompact,
        ptlRecovery,
        preservedSegment,
        preCompactWarning: currentPressureWarning,
        activeTokens: activeTokenEstimate,
        activeMessageCount: messages.length,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        transcriptPath: getGroupMessagesFileHint(groupId),
        reason: "sync snapshot compact selected session-memory style summary plus recent window",
        now,
    });
    const apiMicroCompactEditPlan = (0, group_memory_compaction_1.buildGroupApiMicroCompactEditPlan)(messages, {
        groupId,
        activeTokens: preCompactTokenCount,
        targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
        maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
        now,
    });
    const boundary = {
        id: `compact-sync-${Date.now().toString(36)}`,
        type: "sync-context",
        summarizedFromMessageId: getMemoryMessageIdentity(messagesToSummarize[0], 0),
        summarizedThroughMessageId: getMemoryMessageIdentity(boundaryThrough, keepIndex - 1),
        summarizedMessageCount: messagesToSummarize.length,
        preservedMessageIds: keptMessages.slice(-40).map((message, index) => getMemoryMessageIdentity(message, keepIndex + index)),
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        post_compact_restore: {
            strategy: "conversation_summary_recent_reinject",
            preservedMessageIds: keptMessages.slice(-20).map((message, index) => getMemoryMessageIdentity(message, keepIndex + index)),
            preservedSegment,
            strategyDecision: compactStrategyDecision,
            apiMicroCompactEditPlan,
            transcriptPath: getGroupMessagesFileHint(groupId),
            microCompact,
            reinjectionPlan: postCompactReinject,
            ptlRecovery,
            recoveryAudit: null,
            cleanupAudit: null,
        },
        context_budget: effectiveContextBudget,
        summarySource: "deterministic-sync",
        createdAt: now,
    };
    const postCompactRecoveryAudit = (0, group_memory_compaction_1.buildGroupPostCompactRecoveryAudit)({
        groupId,
        messages,
        boundary,
        keepIndex,
        conversationSummary,
        messageDigest,
        summaryChecksum,
        transcriptPath: getGroupMessagesFileHint(groupId),
        preservedSegment,
        postCompactReinject,
        microCompact,
        contextPressureWarning: postCompactWarning,
        contextBudget: effectiveContextBudget,
        ptlRecovery,
        now,
    });
    boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
    const postCompactCleanupAudit = (0, group_memory_compaction_1.buildGroupPostCompactCleanupAudit)({
        groupId,
        boundary,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        microCompact,
        postCompactReinject,
        preservedSegment,
        transcriptPath: getGroupMessagesFileHint(groupId),
        summaryChecksum,
        now,
    });
    boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
    const compaction = {
        ...(memory?.compaction || {}),
        version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
        enabled: true,
        lastCompactedMessageId: boundary.summarizedThroughMessageId,
        lastCompactedAt: now,
        compactedMessageCount: messagesToSummarize.length,
        totalMessagesSeen: messages.length,
        preservedRecentMessages: keptMessages.length,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        summarySource: "deterministic-sync",
        modelMode: "session-memory-first",
        deterministicFactsPreserved: true,
        health: ptlRecovery
            ? "healthy"
            : activePtlEmergency?.engaged
                ? "ptl_emergency"
                : postCompactTokenCount < preCompactTokenCount ? "healthy" : "watch",
        context_budget: boundary.context_budget,
        microCompact,
        postCompactReinject,
        ptlEmergency: activePtlEmergency,
        ptlRecovery,
        preservedSegment,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        postCompactCleanupAudit,
        contextPressureWarning: postCompactWarning,
        compactWarning: postCompactWarning,
        preCompactWarning: currentPressureWarning,
        lastPressureSampleAt: now,
        boundaries: [...(Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : []), boundary].slice(-8),
    };
    return saveGroupMemory(groupId, {
        ...memory,
        conversationSummary,
        messageDigest,
        compactBoundary: boundary,
        compaction,
        factAnchors: mergeFactAnchorList(memory?.factAnchors || [], anchors, 300),
        persistentRequirements,
        messageCompression: {
            enabled: true,
            strategy: "cc-session-memory-v3-sync",
            configuredRecentLimit: recentLimit,
            recentLimit: keptMessages.length,
            olderLimit,
            totalMessages: messages.length,
            compressedMessages: messagesToSummarize.length,
            recentMessages: keptMessages.length,
            preCompactTokenCount,
            postCompactTokenCount,
            microCompactTokensFreed: microCompact.tokensFreed,
            ptlEmergency: activePtlEmergency,
            ptlRecovery,
            preservedSegment,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            postCompactRecoveryAudit,
            postCompactCleanupAudit,
            contextPressureWarning: postCompactWarning,
            lastCompressedAt: now,
        },
    });
}
function getGroupMessagesFileHint(groupId) {
    return path.join(utils_1.CCM_DIR, "group-messages", `${groupId}.json`);
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
function buildGroupMemorySourceEntry(id, sourcePath, purpose, extra = {}) {
    const file = String(sourcePath || "");
    const entry = {
        id,
        purpose,
        path: file,
        exists: false,
        kind: "missing",
        bytes: 0,
        mtimeMs: 0,
        mtime: "",
        checksum: "",
        checksumMode: "",
        status: file ? "missing" : "missing_path",
        ...extra,
    };
    if (!file)
        return entry;
    try {
        const stat = fs.statSync(file);
        entry.exists = true;
        entry.bytes = stat.size;
        entry.mtimeMs = Math.round(stat.mtimeMs);
        entry.mtime = stat.mtime.toISOString();
        if (stat.isDirectory()) {
            entry.kind = "directory";
            const names = fs.readdirSync(file).filter(Boolean).sort();
            entry.childCount = names.length;
            entry.checksum = crypto.createHash("sha256").update(names.join("\n")).digest("hex").slice(0, 24);
            entry.checksumMode = "directory_listing";
        }
        else if (stat.isFile()) {
            entry.kind = "file";
            const digest = hashGroupMemoryFileWindow(file, stat);
            entry.checksum = digest.checksum;
            entry.checksumMode = digest.checksumMode;
            entry.lineCount = digest.lineCount;
        }
        else {
            entry.kind = "other";
            entry.checksum = crypto.createHash("sha256").update(`${stat.size}:${stat.mtimeMs}`).digest("hex").slice(0, 24);
            entry.checksumMode = "stat";
        }
        entry.status = "present";
    }
    catch (error) {
        entry.status = "unreadable";
        entry.error = compactMemoryText(error?.message || error, 260);
    }
    return entry;
}
function buildGroupMemorySourceManifest(groupId, input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const typedSync = input.typedMemorySync || input.typed_memory_sync || {};
    const typedIndex = typedSync.index || typedSync || {};
    const typedDocs = Array.isArray(input.typedDocs || input.typed_docs)
        ? (input.typedDocs || input.typed_docs)
        : Array.isArray(typedIndex.docs) ? typedIndex.docs : [];
    const baseEntries = [
        buildGroupMemorySourceEntry("group_memory", getGroupMemoryFile(groupId), "group_memory_json"),
        buildGroupMemorySourceEntry("group_messages", getGroupMessagesFileHint(groupId), "raw_group_messages_json"),
        buildGroupMemorySourceEntry("typed_memory_dir", typedIndex.dir || (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), "typed_memory_directory"),
        buildGroupMemorySourceEntry("typed_memory_index", typedIndex.file || path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), "MEMORY.md"), "typed_memory_entrypoint"),
    ];
    if (input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile) {
        baseEntries.push(buildGroupMemorySourceEntry("typed_memory_distillation_ledger", input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile, "typed_memory_distillation_ledger"));
    }
    if (input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file) {
        baseEntries.push(buildGroupMemorySourceEntry("typed_memory_recall_ledger", input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file, "typed_memory_recall_ledger"));
    }
    if (input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file) {
        baseEntries.push(buildGroupMemorySourceEntry("global_agent_memory", input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file, "global_agent_memory_json"));
    }
    if (input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || (input.globalMemoryArbitrationLedger?.file && Number(input.globalMemoryArbitrationLedger?.entryCount || 0) > 0)) {
        baseEntries.push(buildGroupMemorySourceEntry("global_memory_arbitration_ledger", input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || input.globalMemoryArbitrationLedger?.file, "global_memory_arbitration_ledger"));
    }
    const crossGroupSuppression = input.globalAgentMemoryRecall?.crossGroupSuppression || input.global_agent_memory_recall?.crossGroupSuppression || {};
    if (input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || (crossGroupSuppression.sourceDir && (Number(crossGroupSuppression.suppressedCount || 0) > 0 || Number(crossGroupSuppression.advisoryCount || 0) > 0))) {
        baseEntries.push(buildGroupMemorySourceEntry("global_memory_cross_group_arbitration", input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || crossGroupSuppression.sourceDir, "global_memory_cross_group_arbitration_ledgers"));
    }
    const docEntries = typedDocs.slice(0, 80).map((doc) => buildGroupMemorySourceEntry(`typed_doc:${doc.relPath || path.basename(String(doc.file || ""))}`, doc.file, "typed_memory_doc", {
        relPath: doc.relPath || path.basename(String(doc.file || "")),
        memoryType: doc.type || "",
        source: doc.source || "",
        docChecksum: doc.checksum || "",
    }));
    const entries = [...baseEntries, ...docEntries];
    const requiredIds = new Set(["group_memory", "group_messages", "typed_memory_index"]);
    const missingRequired = entries.filter(entry => requiredIds.has(entry.id) && entry.exists !== true).map(entry => entry.id);
    const generatedAtMs = Date.parse(generatedAt);
    const changedAfterManifest = Number.isFinite(generatedAtMs)
        ? entries.filter(entry => entry.exists && entry.mtimeMs > generatedAtMs + 5000).map(entry => entry.id)
        : [];
    const latestMtimeMs = entries.reduce((max, entry) => Math.max(max, Number(entry.mtimeMs || 0)), 0);
    const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(entries.map(entry => ({
        id: entry.id,
        path: entry.path,
        exists: entry.exists,
        bytes: entry.bytes,
        mtimeMs: entry.mtimeMs,
        checksum: entry.checksum,
    })))).digest("hex").slice(0, 24);
    const status = missingRequired.length ? "missing_required_source" : changedAfterManifest.length ? "changed_after_context_build" : "pass";
    return {
        schema: "ccm-group-memory-source-manifest-v1",
        version: exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION,
        groupId,
        generatedAt,
        status,
        pass: status === "pass",
        sourceOrder: [
            "group_memory_json",
            "raw_group_messages_json",
            "typed_MEMORY.md_entrypoint",
            "typed_memory_docs",
            "global_agent_memory_json",
            "global_memory_arbitration_ledger",
            "global_memory_cross_group_arbitration_ledgers",
            "recall_and_distillation_ledgers",
        ],
        entryCount: entries.length,
        typedDocCount: typedDocs.length,
        includedTypedDocCount: docEntries.length,
        requiredIds: [...requiredIds],
        missingRequired,
        changedAfterManifest,
        latestMtimeMs,
        latestMtime: latestMtimeMs ? new Date(latestMtimeMs).toISOString() : "",
        manifestChecksum,
        entries,
    };
}
function readGroupMemoryReloadLedger(groupId) {
    const file = getGroupMemoryReloadLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    }
    catch {
        return {
            schema: "ccm-group-memory-reload-ledger-v1",
            version: 1,
            groupId,
            file,
            scopes: {},
            entries: [],
            updatedAt: "",
        };
    }
}
function writeGroupMemoryReloadLedger(groupId, ledger) {
    const file = getGroupMemoryReloadLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-memory-reload-ledger-v1",
        version: 1,
        groupId,
        scopes: ledger.scopes || {},
        entries: (ledger.entries || []).slice(-120),
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupPostCompactDispatchLedger(groupId) {
    const file = getGroupPostCompactDispatchLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    }
    catch {
        return {
            schema: "ccm-group-post-compact-dispatch-ledger-v1",
            version: 1,
            groupId,
            file,
            scopes: {},
            entries: [],
            updatedAt: "",
        };
    }
}
function writeGroupPostCompactDispatchLedger(groupId, ledger) {
    const file = getGroupPostCompactDispatchLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-post-compact-dispatch-ledger-v1",
        version: 1,
        groupId,
        scopes: ledger.scopes || {},
        entries: (ledger.entries || []).slice(-160),
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupPostCompactCandidateUsageLedger(groupId) {
    const file = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
            version: exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
            groupId,
            file,
            stats: {},
            entries: [],
            totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupPostCompactCandidateUsageLedger(groupId, ledger) {
    const file = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-240);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
        version: exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupApiMicrocompactNativeApplyProofLedger(groupId) {
    const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
            version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
            groupId,
            file,
            stats: {},
            entries: [],
            totals: { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupApiMicrocompactNativeApplyProofLedger(groupId, ledger) {
    const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
        version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId) {
    const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
            version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
            groupId,
            file,
            stats: {},
            entries: [],
            totals: { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, ledger) {
    const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
        version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function normalizePostCompactUsageState(value) {
    const state = String(value || "").toLowerCase().trim();
    if (["used", "ignored", "verified", "mentioned"].includes(state))
        return state;
    if (state === "checked" || state === "reviewed" || state === "validated")
        return "verified";
    if (state === "skipped" || state === "unused" || state === "not_used")
        return "ignored";
    return "";
}
function postCompactCandidateStatsKey(row = {}, targetProject = "") {
    const candidateId = String(row.candidate_id || row.candidateId || "").trim();
    const value = compactMemoryText(row.value || "", 220);
    return [
        String(targetProject || row.target_project || row.targetProject || "").trim().toLowerCase(),
        candidateId || crypto.createHash("sha256").update(value).digest("hex").slice(0, 18),
    ].join("|");
}
function buildPostCompactCandidateEntry(groupId, input = {}, row = {}) {
    const usageState = normalizePostCompactUsageState(row.usage_state || row.usageState);
    if (!usageState)
        return null;
    const candidateId = String(row.candidate_id || row.candidateId || "").trim();
    const value = compactMemoryText(row.value || "", 260);
    if (!candidateId && !value)
        return null;
    const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
    const agent = String(row.agent || input.agent || input.project || "").trim();
    const gateId = String(row.gate_id || row.gateId || input.gateId || input.gate_id || "").trim();
    const taskId = String(input.taskId || input.task_id || "").trim();
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const entryCore = {
        group_id: groupId,
        target_project: targetProject,
        agent,
        task_id: taskId,
        execution_id: String(input.executionId || input.execution_id || ""),
        gate_id: gateId,
        candidate_id: candidateId,
        kind: String(row.kind || ""),
        value,
        sourceMessageId: String(row.sourceMessageId || row.source_message_id || ""),
        usage_state: usageState,
        direct_reference: row.direct_reference === true || row.directReference === true,
        referenced: row.referenced === true,
        receipt_status: String(input.receiptStatus || input.receipt_status || ""),
        generated_at: generatedAt,
    };
    return {
        schema: "ccm-group-post-compact-candidate-usage-entry-v1",
        entry_id: `pccu_${crypto.createHash("sha256").update(JSON.stringify(entryCore)).digest("hex").slice(0, 18)}`,
        ...entryCore,
    };
}
function usageRecommendationForStats(stats = {}) {
    const used = Number(stats.used_count || 0);
    const verified = Number(stats.verified_count || 0);
    const ignored = Number(stats.ignored_count || 0);
    const mentioned = Number(stats.mentioned_count || 0);
    if (used + verified >= ignored + mentioned + 2)
        return "promote_recall";
    if (ignored >= used + verified + 2)
        return "deprioritize_or_distill";
    if (mentioned > 0 && used + verified + ignored === 0)
        return "require_usage_receipt";
    return "neutral_verify_current_context";
}
function recordGroupPostCompactCandidateUsageLedger(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const rows = Array.isArray(input.rows)
        ? input.rows
        : Array.isArray(input.receiptRows || input.receipt_rows)
            ? (input.receiptRows || input.receipt_rows).flatMap((receiptRow) => {
                const gate = receiptRow.post_compact_reinjection_gate || receiptRow.postCompactReinjectionGate || {};
                const usageRows = Array.isArray(gate.candidate_usage_rows || gate.candidateUsageRows) ? (gate.candidate_usage_rows || gate.candidateUsageRows) : [];
                return usageRows.map((usageRow) => ({
                    ...usageRow,
                    agent: receiptRow.agent || receiptRow.project || usageRow.agent || "",
                    target_project: gate.target_project || receiptRow.project || input.targetProject || input.target_project || "",
                    gate_id: usageRow.gate_id || gate.gate_id || gate.gateId || (Array.isArray(gate.gate_ids) ? gate.gate_ids[0] : ""),
                    receipt_status: receiptRow.status || receiptRow.receipt_status || "",
                }));
            })
            : [];
    const entries = rows
        .filter((row) => row && row.usage_state !== "unreferenced" && (row.referenced === true || ["used", "ignored", "verified", "mentioned"].includes(normalizePostCompactUsageState(row.usage_state || row.usageState))))
        .map((row) => buildPostCompactCandidateEntry(groupId, input, row))
        .filter(Boolean);
    const file = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    if (!entries.length) {
        const ledger = readGroupPostCompactCandidateUsageLedger(groupId);
        return {
            schema: "ccm-group-post-compact-candidate-usage-record-v1",
            groupId,
            file,
            skipped: true,
            reason: "no_candidate_usage_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = readGroupPostCompactCandidateUsageLedger(groupId);
    const seen = new Set((ledger.entries || []).map((entry) => entry.entry_id));
    const newEntries = entries.filter((entry) => !seen.has(entry.entry_id));
    const stats = ledger.stats || {};
    for (const entry of newEntries) {
        const key = postCompactCandidateStatsKey(entry, entry.target_project);
        const current = stats[key] || {
            candidate_id: entry.candidate_id,
            kind: entry.kind,
            value: entry.value,
            sourceMessageId: entry.sourceMessageId,
            target_project: entry.target_project,
            used_count: 0,
            ignored_count: 0,
            verified_count: 0,
            mentioned_count: 0,
            total_count: 0,
            agents: [],
            task_ids: [],
            gate_ids: [],
            first_seen_at: entry.generated_at,
        };
        current.candidate_id = current.candidate_id || entry.candidate_id;
        current.kind = current.kind || entry.kind;
        current.value = current.value || entry.value;
        current.sourceMessageId = current.sourceMessageId || entry.sourceMessageId;
        current.target_project = current.target_project || entry.target_project;
        current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
        current.total_count = Number(current.total_count || 0) + 1;
        current.last_usage_state = entry.usage_state;
        current.last_agent = entry.agent;
        current.last_task_id = entry.task_id;
        current.last_gate_id = entry.gate_id;
        current.last_seen_at = entry.generated_at;
        current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
        current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
        current.gate_ids = Array.from(new Set([...(Array.isArray(current.gate_ids) ? current.gate_ids : []), entry.gate_id].filter(Boolean))).slice(-12);
        current.recommendation = usageRecommendationForStats(current);
        stats[key] = current;
    }
    const allEntries = [...(ledger.entries || []), ...newEntries].slice(-240);
    const totals = allEntries.reduce((acc, entry) => {
        const state = normalizePostCompactUsageState(entry.usage_state);
        if (state)
            acc[state] = Number(acc[state] || 0) + 1;
        acc.total += 1;
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    writeGroupPostCompactCandidateUsageLedger(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    });
    return {
        schema: "ccm-group-post-compact-candidate-usage-record-v1",
        groupId,
        file,
        recorded_count: newEntries.length,
        duplicate_count: entries.length - newEntries.length,
        totals,
        updatedAt,
    };
}
function buildGroupPostCompactCandidateUsageSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const ledger = readGroupPostCompactCandidateUsageLedger(groupId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const candidates = Array.isArray(options.candidates) ? options.candidates : [];
    const candidateKeys = new Set(candidates.map((candidate) => postCompactCandidateStatsKey(candidate, targetProject)).filter(Boolean));
    const candidateIds = new Set(candidates.map((candidate) => String(candidate.candidate_id || candidate.candidateId || "").trim().toLowerCase()).filter(Boolean));
    const candidateValues = new Set(candidates.map((candidate) => compactMemoryText(candidate.value || "", 260).toLowerCase()).filter(Boolean));
    const statsRows = Object.values(ledger.stats || {})
        .filter((row) => !targetProject || String(row.target_project || "").toLowerCase() === targetProject)
        .filter((row) => !candidateKeys.size
        || candidateKeys.has(postCompactCandidateStatsKey(row, targetProject))
        || candidateIds.has(String(row.candidate_id || "").trim().toLowerCase())
        || candidateValues.has(compactMemoryText(row.value || "", 260).toLowerCase()))
        .sort((a, b) => {
        const aScore = Number(a.used_count || 0) * 3 + Number(a.verified_count || 0) * 2 - Number(a.ignored_count || 0);
        const bScore = Number(b.used_count || 0) * 3 + Number(b.verified_count || 0) * 2 - Number(b.ignored_count || 0);
        return bScore - aScore || String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""));
    });
    const totals = statsRows.reduce((acc, row) => {
        acc.used += Number(row.used_count || 0);
        acc.ignored += Number(row.ignored_count || 0);
        acc.verified += Number(row.verified_count || 0);
        acc.mentioned += Number(row.mentioned_count || 0);
        acc.total += Number(row.total_count || 0);
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    return {
        schema: "ccm-group-post-compact-candidate-usage-summary-v1",
        version: exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
        groupId,
        target_project: targetProject,
        ledger_file: ledger.file,
        has_history: statsRows.length > 0,
        candidate_count: statsRows.length,
        totals,
        useful_candidates: statsRows.filter((row) => ["promote_recall", "neutral_verify_current_context"].includes(row.recommendation)).slice(0, 8),
        ignored_candidates: statsRows.filter((row) => row.recommendation === "deprioritize_or_distill").slice(0, 8),
        missing_usage_candidates: statsRows.filter((row) => row.recommendation === "require_usage_receipt").slice(0, 8),
        recent_entries: (ledger.entries || [])
            .filter((entry) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
            .slice(-16),
        updatedAt: ledger.updatedAt || "",
    };
}
function normalizeApiMicrocompactNativeApplyProofStatus(row = {}) {
    const usageState = String(row.usage_state || row.usageState || "").toLowerCase().trim();
    const nativeApplied = row.native_applied === true || row.nativeApplied === true || usageState === "native_applied";
    if (nativeApplied) {
        const checksumMatched = row.apply_plan_checksum_matched !== false
            && row.request_patch_checksum_matched !== false
            && !!(row.apply_plan_checksum || row.applyPlanChecksum)
            && !!(row.request_patch_checksum || row.requestPatchChecksum);
        const sessionMatched = row.session_matched !== false && row.sessionMismatch !== true && row.session_mismatch !== true;
        const nativeReady = row.native_apply_ready === true || row.nativeApplyReady === true || row.can_apply_natively === true || row.canApplyNatively === true;
        const pass = row.pass === true && row.unsafe_native_applied !== true && row.unsafeNativeApplied !== true;
        return pass && checksumMatched && sessionMatched && nativeReady ? "verified" : "failed";
    }
    if (usageState === "advisory")
        return "advisory";
    if (usageState === "ignored" || usageState === "not_supported")
        return "not_supported";
    return "";
}
function buildApiMicrocompactNativeApplyProofEntry(groupId, input = {}, receiptRow = {}, planRow = {}) {
    const proofStatus = normalizeApiMicrocompactNativeApplyProofStatus(planRow);
    if (!proofStatus)
        return null;
    const agent = String(receiptRow.agent || receiptRow.project || input.agent || input.targetProject || input.target_project || "").trim();
    const targetProject = String(planRow.target_project || planRow.targetProject || receiptRow.target_project || receiptRow.targetProject || input.targetProject || input.target_project || agent || "").trim();
    const taskId = String(input.taskId || input.task_id || receiptRow.taskId || receiptRow.task_id || "").trim();
    const executionId = String(input.executionId || input.execution_id || receiptRow.executionId || receiptRow.execution_id || "").trim();
    const runnerRequestId = String(planRow.runner_request_id || planRow.runnerRequestId || receiptRow.runner_request_id || receiptRow.runnerRequestId || input.runnerRequestId || input.runner_request_id || "").trim();
    const externalRunnerRequestId = String(planRow.external_runner_request_id || planRow.externalRunnerRequestId || receiptRow.external_runner_request_id || receiptRow.externalRunnerRequestId || input.externalRunnerRequestId || input.external_runner_request_id || runnerRequestId || "").trim();
    const generatedAt = String(input.generatedAt || input.generated_at || receiptRow.generatedAt || receiptRow.generated_at || new Date().toISOString());
    const planChecksum = String(planRow.plan_checksum || planRow.planChecksum || "").trim();
    const expectedApplyPlanChecksum = String(planRow.apply_plan_checksum || planRow.applyPlanChecksum || "").trim();
    const expectedRequestPatchChecksum = String(planRow.request_patch_checksum || planRow.requestPatchChecksum || "").trim();
    const receiptApplyPlanChecksum = String(planRow.receipt_apply_plan_checksum || planRow.receiptApplyPlanChecksum || expectedApplyPlanChecksum || "").trim();
    const receiptRequestPatchChecksum = String(planRow.receipt_request_patch_checksum || planRow.receiptRequestPatchChecksum || expectedRequestPatchChecksum || "").trim();
    const expectedTaskAgentSessionId = String(planRow.expected_task_agent_session_id || planRow.expectedTaskAgentSessionId || "").trim();
    const receiptTaskAgentSessionId = String(planRow.receipt_task_agent_session_id || planRow.receiptTaskAgentSessionId || receiptRow.task_agent_session_id || receiptRow.taskAgentSessionId || "").trim();
    const expectedNativeSessionId = String(planRow.expected_native_session_id || planRow.expectedNativeSessionId || "").trim();
    const receiptNativeSessionId = String(planRow.receipt_native_session_id || planRow.receiptNativeSessionId || receiptRow.native_session_id || receiptRow.nativeSessionId || "").trim();
    const expectedSnapshotId = String(planRow.expected_memory_context_snapshot_id || planRow.expectedMemoryContextSnapshotId || "").trim();
    const receiptSnapshotId = String(planRow.receipt_memory_context_snapshot_id || planRow.receiptMemoryContextSnapshotId || receiptRow.memory_context_snapshot_id || receiptRow.memoryContextSnapshotId || "").trim();
    const expectedSnapshotChecksum = String(planRow.expected_memory_context_snapshot_checksum || planRow.expectedMemoryContextSnapshotChecksum || "").trim();
    const receiptSnapshotChecksum = String(planRow.receipt_memory_context_snapshot_checksum || planRow.receiptMemoryContextSnapshotChecksum || receiptRow.memory_context_snapshot_checksum || receiptRow.memoryContextSnapshotChecksum || "").trim();
    const usageState = String(planRow.usage_state || planRow.usageState || "").trim();
    const entryCore = {
        group_id: groupId,
        target_project: targetProject,
        agent,
        task_id: taskId,
        execution_id: executionId,
        runner_request_id: runnerRequestId || externalRunnerRequestId,
        external_runner_request_id: externalRunnerRequestId || runnerRequestId,
        final_status: String(input.finalStatus || input.final_status || ""),
        receipt_status: String(receiptRow.status || receiptRow.receipt_status || ""),
        plan_checksum: planChecksum,
        apply_plan_checksum: expectedApplyPlanChecksum,
        request_patch_checksum: expectedRequestPatchChecksum,
        receipt_apply_plan_checksum: receiptApplyPlanChecksum,
        receipt_request_patch_checksum: receiptRequestPatchChecksum,
        task_agent_session_id: receiptTaskAgentSessionId || expectedTaskAgentSessionId,
        native_session_id: receiptNativeSessionId || expectedNativeSessionId,
        memory_context_snapshot_id: receiptSnapshotId || expectedSnapshotId,
        memory_context_snapshot_checksum: receiptSnapshotChecksum || expectedSnapshotChecksum,
    };
    const proofKey = crypto.createHash("sha256").update(JSON.stringify({
        groupId,
        taskId,
        executionId,
        runnerRequestId: entryCore.runner_request_id,
        externalRunnerRequestId: entryCore.external_runner_request_id,
        agent,
        planChecksum,
        applyPlanChecksum: expectedApplyPlanChecksum || receiptApplyPlanChecksum,
        requestPatchChecksum: expectedRequestPatchChecksum || receiptRequestPatchChecksum,
        taskAgentSessionId: entryCore.task_agent_session_id,
        nativeSessionId: entryCore.native_session_id,
        memoryContextSnapshotId: entryCore.memory_context_snapshot_id,
        memoryContextSnapshotChecksum: entryCore.memory_context_snapshot_checksum,
    })).digest("hex").slice(0, 20);
    return {
        schema: "ccm-group-api-microcompact-native-apply-proof-entry-v1",
        entry_id: `api_microcompact_native_apply_proof_${proofKey}`,
        ...entryCore,
        expected_task_agent_session_id: expectedTaskAgentSessionId,
        receipt_task_agent_session_id: receiptTaskAgentSessionId,
        expected_native_session_id: expectedNativeSessionId,
        receipt_native_session_id: receiptNativeSessionId,
        expected_memory_context_snapshot_id: expectedSnapshotId,
        receipt_memory_context_snapshot_id: receiptSnapshotId,
        expected_memory_context_snapshot_checksum: expectedSnapshotChecksum,
        receipt_memory_context_snapshot_checksum: receiptSnapshotChecksum,
        usage_state: usageState,
        native_applied: planRow.native_applied === true || usageState === "native_applied",
        proof_status: proofStatus,
        strong_proof: proofStatus === "verified",
        native_apply_ready: planRow.native_apply_ready === true || planRow.nativeApplyReady === true,
        apply_plan_checksum_matched: planRow.apply_plan_checksum_matched === true,
        request_patch_checksum_matched: planRow.request_patch_checksum_matched === true,
        session_binding_required: planRow.session_binding_required === true,
        session_matched: planRow.session_matched !== false,
        session_mismatch: planRow.session_mismatch === true,
        unsafe_native_applied: planRow.unsafe_native_applied === true,
        reason: compactMemoryText(planRow.reason || receiptRow.reason || "", 500),
        generated_at: generatedAt,
    };
}
function apiMicrocompactNativeApplyProofStatsKey(entry = {}) {
    return [
        String(entry.target_project || "").trim().toLowerCase(),
        String(entry.plan_checksum || "").trim(),
        String(entry.apply_plan_checksum || entry.receipt_apply_plan_checksum || "").trim(),
        String(entry.request_patch_checksum || entry.receipt_request_patch_checksum || "").trim(),
    ].join("|");
}
function apiMicrocompactNativeApplyProofTotals(entries = []) {
    return entries.reduce((acc, entry) => {
        const status = String(entry.proof_status || "").trim();
        if (status && Object.prototype.hasOwnProperty.call(acc, status))
            acc[status] = Number(acc[status] || 0) + 1;
        if (entry.native_applied === true || status === "verified" || status === "failed")
            acc.native_claims = Number(acc.native_claims || 0) + 1;
        if (entry.strong_proof === true || status === "verified")
            acc.strong_verified = Number(acc.strong_verified || 0) + 1;
        acc.total = Number(acc.total || 0) + 1;
        return acc;
    }, { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, strong_verified: 0, total: 0 });
}
function normalizeApiMicrocompactNativeApplyTelemetryStatus(row = {}) {
    const explicit = String(row.telemetry_status || row.telemetryStatus || row.status || "").toLowerCase().trim();
    if (["sent", "matched_contract", "invalid", "failed"].includes(explicit))
        return explicit;
    const hasContextManagement = row.has_context_management === true
        || row.hasContextManagement === true
        || !!row.context_management
        || !!row.contextManagement
        || !!row.request_body?.context_management
        || !!row.requestBody?.context_management;
    const requestPatchChecksum = String(row.requestPatchChecksum || row.request_patch_checksum || "").trim();
    if (row.error || row.failed === true || row.ok === false)
        return "failed";
    if (hasContextManagement && requestPatchChecksum)
        return "matched_contract";
    if (requestPatchChecksum || hasContextManagement)
        return "sent";
    return "invalid";
}
function stableApiMicrocompactJson(value) {
    if (value === undefined)
        return "null";
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(item => stableApiMicrocompactJson(item)).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableApiMicrocompactJson(value[key])}`).join(",")}}`;
}
function stableApiMicrocompactChecksum(value, length = 24) {
    return crypto.createHash("sha256").update(stableApiMicrocompactJson(value)).digest("hex").slice(0, length);
}
function apiMicrocompactHeaderValue(headers, name) {
    if (!headers)
        return "";
    const wanted = String(name || "").toLowerCase();
    if (typeof headers.get === "function") {
        try {
            return String(headers.get(name) || headers.get(wanted) || "");
        }
        catch { }
    }
    if (Array.isArray(headers)) {
        const match = headers.find((row) => String(row?.[0] || "").toLowerCase() === wanted);
        return String(match?.[1] || "");
    }
    if (typeof headers === "object") {
        const key = Object.keys(headers).find(item => item.toLowerCase() === wanted);
        return key ? String(headers[key] || "") : "";
    }
    return "";
}
function apiMicrocompactBetaHeadersFromHeaders(headers) {
    const raw = [
        apiMicrocompactHeaderValue(headers, "anthropic-beta"),
        apiMicrocompactHeaderValue(headers, "x-anthropic-beta"),
    ].filter(Boolean).join(",");
    return raw.split(",").map(item => item.trim()).filter(Boolean);
}
function uniqueApiMicrocompactStrings(...values) {
    const seen = new Set();
    const result = [];
    for (const value of values.flat(Infinity)) {
        const text = String(value || "").trim();
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        result.push(text);
    }
    return result;
}
function buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow(input = {}) {
    const plan = input.apiMicrocompactNativeApplyPlan
        || input.api_microcompact_native_apply_plan
        || input.nativeApplyPlan
        || input.native_apply_plan
        || {};
    const requestPatch = input.requestPatch || input.request_patch || plan.requestPatch || plan.request_patch || {};
    const requestPatchBody = requestPatch.body || requestPatch.request_body || {};
    const requestBody = input.requestBody || input.request_body || {};
    const contextManagement = requestBody?.context_management
        || requestPatchBody?.context_management
        || input.contextManagement
        || input.context_management
        || null;
    const betaHeaders = uniqueApiMicrocompactStrings(input.betaHeaders || input.beta_headers || [], requestPatch.beta_headers || requestPatch.betaHeaders || [], apiMicrocompactBetaHeadersFromHeaders(input.headers || input.requestHeaders || input.request_headers));
    const requestPatchChecksum = String(input.requestPatchChecksum
        || input.request_patch_checksum
        || plan.requestPatchChecksum
        || plan.request_patch_checksum
        || (Object.keys(requestPatch || {}).length ? stableApiMicrocompactChecksum(requestPatch) : "")).trim();
    const row = {
        planChecksum: String(input.planChecksum
            || input.plan_checksum
            || plan.apiEditPlanChecksum
            || plan.api_edit_plan_checksum
            || plan.planChecksum
            || plan.plan_checksum
            || "").trim(),
        applyPlanChecksum: String(input.applyPlanChecksum || input.apply_plan_checksum || plan.applyPlanChecksum || plan.apply_plan_checksum || "").trim(),
        requestPatchChecksum,
        requestBodyChecksum: String(input.requestBodyChecksum || input.request_body_checksum || stableApiMicrocompactChecksum(requestBody)).trim(),
        requestBody,
        hasContextManagement: !!contextManagement,
        contextManagementEditCount: Number(input.contextManagementEditCount
            || input.context_management_edit_count
            || contextManagement?.edits?.length
            || 0),
        betaHeaders,
        provider: String(input.provider || plan.executor?.provider || plan.provider || "").trim(),
        model: String(input.model || "").trim(),
        endpoint: String(input.endpoint || input.url || input.apiUrl || input.api_url || "").trim(),
        method: String(input.method || "POST").trim().toUpperCase(),
        responseStatus: Number(input.responseStatus || input.response_status || input.httpStatus || input.http_status || 0),
        requestId: String(input.requestId || input.request_id || input.providerRequestId || input.provider_request_id || "").trim(),
        runnerRequestId: String(input.runnerRequestId || input.runner_request_id || input.externalRunnerRequestId || input.external_runner_request_id || plan.runnerRequestId || plan.runner_request_id || "").trim(),
        externalRunnerRequestId: String(input.externalRunnerRequestId || input.external_runner_request_id || input.runnerRequestId || input.runner_request_id || plan.externalRunnerRequestId || plan.external_runner_request_id || plan.runnerRequestId || plan.runner_request_id || "").trim(),
        taskAgentSessionId: String(input.taskAgentSessionId || input.task_agent_session_id || plan.taskAgentSessionId || plan.task_agent_session_id || "").trim(),
        nativeSessionId: String(input.nativeSessionId || input.native_session_id || plan.nativeSessionId || plan.native_session_id || "").trim(),
        memoryContextSnapshotId: String(input.memoryContextSnapshotId || input.memory_context_snapshot_id || plan.memoryContextSnapshotId || plan.memory_context_snapshot_id || "").trim(),
        memoryContextSnapshotChecksum: String(input.memoryContextSnapshotChecksum || input.memory_context_snapshot_checksum || plan.memoryContextSnapshotChecksum || plan.memory_context_snapshot_checksum || "").trim(),
        targetProject: String(input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
        agent: String(input.agent || input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
        taskId: String(input.taskId || input.task_id || "").trim(),
        executionId: String(input.executionId || input.execution_id || "").trim(),
        sentAt: String(input.sentAt || input.sent_at || input.generatedAt || input.generated_at || new Date().toISOString()),
        telemetrySource: "native_request_adapter",
        ok: input.ok,
        error: compactMemoryText(input.error || input.errorMessage || input.error_message || "", 360),
    };
    return row;
}
function recordGroupApiMicrocompactNativeApplyAdapterTelemetry(input = {}) {
    const plan = input.apiMicrocompactNativeApplyPlan
        || input.api_microcompact_native_apply_plan
        || input.nativeApplyPlan
        || input.native_apply_plan
        || {};
    const groupId = String(input.groupId || input.group_id || plan.groupId || plan.group_id || "").trim();
    const row = buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow(input);
    if (!groupId) {
        return {
            schema: "ccm-group-api-microcompact-native-apply-adapter-telemetry-record-v1",
            skipped: true,
            reason: "missing_group_id",
            recorded_count: 0,
        };
    }
    if (!row.planChecksum && !row.applyPlanChecksum && !row.requestPatchChecksum && input.force !== true) {
        return {
            schema: "ccm-group-api-microcompact-native-apply-adapter-telemetry-record-v1",
            groupId,
            skipped: true,
            reason: "missing_native_apply_plan",
            recorded_count: 0,
        };
    }
    return recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, {
        targetProject: row.targetProject,
        taskId: row.taskId,
        executionId: row.executionId,
        rows: [row],
        telemetrySource: "native_request_adapter",
        generatedAt: row.sentAt,
    });
}
function buildApiMicrocompactNativeApplyTelemetryEntry(groupId, input = {}, receiptRow = {}, row = {}) {
    if (!row || typeof row !== "object")
        return null;
    const taskId = String(input.taskId || input.task_id || receiptRow.taskId || receiptRow.task_id || row.taskId || row.task_id || "").trim();
    const executionId = String(input.executionId || input.execution_id || receiptRow.executionId || receiptRow.execution_id || row.executionId || row.execution_id || "").trim();
    const targetProject = String(row.targetProject || row.target_project || receiptRow.agent || receiptRow.project || input.targetProject || input.target_project || "").trim();
    const agent = String(row.agent || receiptRow.agent || receiptRow.project || targetProject || "").trim();
    const sentAt = String(row.sentAt || row.sent_at || row.generatedAt || row.generated_at || input.generatedAt || input.generated_at || new Date().toISOString());
    const requestBody = row.requestBody || row.request_body || null;
    const requestBodyChecksum = String(row.requestBodyChecksum || row.request_body_checksum || (requestBody ? crypto.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex").slice(0, 24) : "")).trim();
    const runnerRequestId = String(row.runnerRequestId
        || row.runner_request_id
        || receiptRow.runnerRequestId
        || receiptRow.runner_request_id
        || input.runnerRequestId
        || input.runner_request_id
        || row.externalRunnerRequestId
        || row.external_runner_request_id
        || receiptRow.externalRunnerRequestId
        || receiptRow.external_runner_request_id
        || input.externalRunnerRequestId
        || input.external_runner_request_id
        || "").trim();
    const externalRunnerRequestId = String(row.externalRunnerRequestId
        || row.external_runner_request_id
        || receiptRow.externalRunnerRequestId
        || receiptRow.external_runner_request_id
        || input.externalRunnerRequestId
        || input.external_runner_request_id
        || runnerRequestId
        || "").trim();
    const betaHeaders = [
        ...(Array.isArray(row.betaHeaders || row.beta_headers) ? (row.betaHeaders || row.beta_headers) : []),
        ...apiMicrocompactBetaHeadersFromHeaders(row.headers || row.requestHeaders || row.request_headers),
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const hasContextManagement = row.has_context_management === true
        || row.hasContextManagement === true
        || !!row.context_management
        || !!row.contextManagement
        || !!requestBody?.context_management
        || betaHeaders.includes("context-management-2025-06-27");
    const entryCore = {
        group_id: groupId,
        target_project: targetProject,
        agent,
        task_id: taskId,
        execution_id: executionId,
        plan_checksum: String(row.planChecksum || row.plan_checksum || row.apiMicrocompactPlanChecksum || row.api_microcompact_plan_checksum || "").trim(),
        apply_plan_checksum: String(row.applyPlanChecksum || row.apply_plan_checksum || row.nativeApplyPlanChecksum || row.native_apply_plan_checksum || "").trim(),
        request_patch_checksum: String(row.requestPatchChecksum || row.request_patch_checksum || "").trim(),
        runner_request_id: runnerRequestId || externalRunnerRequestId,
        external_runner_request_id: externalRunnerRequestId || runnerRequestId,
        task_agent_session_id: String(row.taskAgentSessionId || row.task_agent_session_id || receiptRow.taskAgentSessionId || receiptRow.task_agent_session_id || "").trim(),
        native_session_id: String(row.nativeSessionId || row.native_session_id || receiptRow.nativeSessionId || receiptRow.native_session_id || "").trim(),
        memory_context_snapshot_id: String(row.memoryContextSnapshotId || row.memory_context_snapshot_id || receiptRow.memoryContextSnapshotId || receiptRow.memory_context_snapshot_id || "").trim(),
        memory_context_snapshot_checksum: String(row.memoryContextSnapshotChecksum || row.memory_context_snapshot_checksum || receiptRow.memoryContextSnapshotChecksum || receiptRow.memory_context_snapshot_checksum || "").trim(),
        provider: String(row.provider || row.apiProvider || row.api_provider || "").trim(),
        model: String(row.model || "").trim(),
        endpoint: compactMemoryText(row.endpoint || row.url || row.apiUrl || row.api_url || "", 240),
        method: String(row.method || "POST").trim().toUpperCase(),
        request_id: String(row.requestId || row.request_id || row.providerRequestId || row.provider_request_id || "").trim(),
        request_body_checksum: requestBodyChecksum,
        beta_headers: betaHeaders.slice(0, 12),
        has_context_management: hasContextManagement,
        context_management_edit_count: Number(row.contextManagementEditCount || row.context_management_edit_count || row.context_management?.edits?.length || row.contextManagement?.edits?.length || requestBody?.context_management?.edits?.length || 0),
        response_status: Number(row.responseStatus || row.response_status || row.httpStatus || row.http_status || 0),
        telemetry_source: String(row.telemetrySource || row.telemetry_source || input.telemetrySource || input.telemetry_source || "agent_receipt").trim(),
        sent_at: sentAt,
    };
    const telemetryStatus = normalizeApiMicrocompactNativeApplyTelemetryStatus({ ...row, has_context_management: hasContextManagement });
    const entryId = `api_microcompact_native_apply_request_${crypto.createHash("sha256").update(JSON.stringify({
        groupId,
        taskId,
        executionId,
        agent,
        planChecksum: entryCore.plan_checksum,
        applyPlanChecksum: entryCore.apply_plan_checksum,
        requestPatchChecksum: entryCore.request_patch_checksum,
        runnerRequestId: entryCore.runner_request_id,
        externalRunnerRequestId: entryCore.external_runner_request_id,
        taskAgentSessionId: entryCore.task_agent_session_id,
        nativeSessionId: entryCore.native_session_id,
        memoryContextSnapshotId: entryCore.memory_context_snapshot_id,
        requestBodyChecksum,
        requestId: entryCore.request_id,
    })).digest("hex").slice(0, 20)}`;
    return {
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-entry-v1",
        entry_id: entryId,
        ...entryCore,
        telemetry_status: telemetryStatus,
        matched_contract: telemetryStatus === "matched_contract",
        error: compactMemoryText(row.error || row.errorMessage || row.error_message || "", 360),
    };
}
function apiMicrocompactNativeApplyTelemetryTotals(entries = []) {
    return entries.reduce((acc, entry) => {
        const status = String(entry.telemetry_status || "").trim();
        if (status === "matched_contract")
            acc.matched_contract = Number(acc.matched_contract || 0) + 1;
        else if (status && Object.prototype.hasOwnProperty.call(acc, status))
            acc[status] = Number(acc[status] || 0) + 1;
        if (status === "sent" || status === "matched_contract")
            acc.sent = Number(acc.sent || 0) + 1;
        acc.total = Number(acc.total || 0) + 1;
        return acc;
    }, { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 });
}
function apiMicrocompactNativeApplyTelemetrySourceCounts(entries = []) {
    return entries.reduce((acc, entry) => {
        const source = String(entry.telemetry_source || "unknown").trim() || "unknown";
        const status = String(entry.telemetry_status || "").trim();
        const current = acc[source] || { total: 0, sent: 0, matched_contract: 0, invalid: 0, failed: 0 };
        current.total += 1;
        if (status === "sent" || status === "matched_contract")
            current.sent += 1;
        if (status === "matched_contract")
            current.matched_contract += 1;
        if (status === "invalid")
            current.invalid += 1;
        if (status === "failed")
            current.failed += 1;
        acc[source] = current;
        return acc;
    }, {});
}
function apiMicrocompactNativeApplyTelemetryStatsKey(entry = {}) {
    return [
        String(entry.target_project || "").trim().toLowerCase(),
        String(entry.plan_checksum || "").trim(),
        String(entry.apply_plan_checksum || "").trim(),
        String(entry.request_patch_checksum || "").trim(),
    ].join("|");
}
function recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const directRows = Array.isArray(input.rows) ? input.rows : [];
    const receiptRows = Array.isArray(input.receipts || input.receiptRows || input.receipt_rows)
        ? (input.receipts || input.receiptRows || input.receipt_rows)
        : [];
    const rows = [
        ...directRows.map((row) => ({ receipt: {}, row })),
        ...receiptRows.flatMap((receipt) => {
            const telemetryRows = [
                ...(Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry)
                    ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry)
                    : []),
                ...(Array.isArray(receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
                    ? (receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
                    : []),
                ...(Array.isArray(receipt.providerRequestTelemetry || receipt.provider_request_telemetry)
                    ? (receipt.providerRequestTelemetry || receipt.provider_request_telemetry)
                    : []),
            ];
            return telemetryRows.map((row) => ({ receipt, row }));
        }),
    ];
    const entries = rows
        .map(({ receipt, row }) => buildApiMicrocompactNativeApplyTelemetryEntry(groupId, input, receipt, row))
        .filter(Boolean);
    const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId);
    if (!entries.length) {
        const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId);
        return {
            schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
            groupId,
            file,
            skipped: true,
            reason: "no_request_telemetry_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId);
    const entryMap = new Map((Array.isArray(ledger.entries) ? ledger.entries : []).map((entry) => [entry.entry_id, entry]));
    let recordedCount = 0;
    let updatedCount = 0;
    for (const entry of entries) {
        if (entryMap.has(entry.entry_id))
            updatedCount += 1;
        else
            recordedCount += 1;
        entryMap.set(entry.entry_id, entry);
    }
    const allEntries = Array.from(entryMap.values())
        .sort((a, b) => String(a.sent_at || "").localeCompare(String(b.sent_at || "")))
        .slice(-320);
    const stats = allEntries.reduce((acc, entry) => {
        const key = apiMicrocompactNativeApplyTelemetryStatsKey(entry);
        const current = acc[key] || {
            target_project: entry.target_project,
            plan_checksum: entry.plan_checksum,
            apply_plan_checksum: entry.apply_plan_checksum,
            request_patch_checksum: entry.request_patch_checksum,
            sent_count: 0,
            matched_contract_count: 0,
            invalid_count: 0,
            failed_count: 0,
            agents: [],
            task_ids: [],
            first_seen_at: entry.sent_at,
        };
        const status = String(entry.telemetry_status || "");
        if (status && !["sent", "matched_contract"].includes(status))
            current[`${status}_count`] = Number(current[`${status}_count`] || 0) + 1;
        if (status === "matched_contract")
            current.matched_contract_count = Number(current.matched_contract_count || 0) + 1;
        if (status === "sent" || status === "matched_contract")
            current.sent_count = Number(current.sent_count || 0) + 1;
        current.last_status = status;
        current.last_agent = entry.agent;
        current.last_task_id = entry.task_id;
        current.last_seen_at = entry.sent_at;
        current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
        current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
        acc[key] = current;
        return acc;
    }, {});
    const totals = apiMicrocompactNativeApplyTelemetryTotals(allEntries);
    const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    });
    return {
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
        groupId,
        file,
        recorded_count: recordedCount,
        updated_count: updatedCount,
        totals,
        updatedAt,
    };
}
function apiMicrocompactNativeApplyTelemetryMatchesProof(telemetry = {}, proof = {}) {
    const samePlan = !proof.plan_checksum || String(telemetry.plan_checksum || "") === String(proof.plan_checksum || "");
    const sameApply = !proof.apply_plan_checksum && !proof.receipt_apply_plan_checksum
        || [proof.apply_plan_checksum, proof.receipt_apply_plan_checksum].some(value => String(value || "") === String(telemetry.apply_plan_checksum || ""));
    const sameRequest = !proof.request_patch_checksum && !proof.receipt_request_patch_checksum
        || [proof.request_patch_checksum, proof.receipt_request_patch_checksum].some(value => String(value || "") === String(telemetry.request_patch_checksum || ""));
    const sameTaskSession = !proof.task_agent_session_id && !proof.receipt_task_agent_session_id
        || [proof.task_agent_session_id, proof.receipt_task_agent_session_id, proof.expected_task_agent_session_id].some(value => String(value || "") === String(telemetry.task_agent_session_id || ""));
    const sameNativeSession = !proof.native_session_id && !proof.receipt_native_session_id
        || [proof.native_session_id, proof.receipt_native_session_id, proof.expected_native_session_id].some(value => String(value || "") === String(telemetry.native_session_id || ""));
    const sameSnapshot = !proof.memory_context_snapshot_id && !proof.receipt_memory_context_snapshot_id
        || [proof.memory_context_snapshot_id, proof.receipt_memory_context_snapshot_id, proof.expected_memory_context_snapshot_id].some(value => String(value || "") === String(telemetry.memory_context_snapshot_id || ""));
    return samePlan && sameApply && sameRequest && sameTaskSession && sameNativeSession && sameSnapshot;
}
function enrichApiMicrocompactNativeApplyProofWithTelemetry(entry = {}, telemetryEntries = [], options = {}) {
    const nowMs = Number(options.nowMs || Date.now());
    const maxAgeMs = Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS);
    const matched = telemetryEntries.find((telemetry) => apiMicrocompactNativeApplyTelemetryMatchesProof(telemetry, entry));
    const matchedContract = !!matched && (matched.matched_contract === true || matched.telemetry_status === "matched_contract");
    const sentMs = Date.parse(matched?.sent_at || "");
    const ageMs = Number.isFinite(sentMs) && sentMs > 0 ? Math.max(0, nowMs - sentMs) : null;
    const fresh = !!matched && matchedContract && ageMs !== null && ageMs <= maxAgeMs;
    const telemetrySource = matched?.telemetry_source || "";
    const adapterCaptured = telemetrySource === "native_request_adapter";
    const strong = matchedContract && fresh && adapterCaptured;
    const telemetryStatus = matched
        ? !matchedContract
            ? String(matched.telemetry_status || "invalid")
            : !fresh
                ? "stale"
                : adapterCaptured
                    ? "matched"
                    : "receipt_only"
        : entry.proof_status === "verified"
            ? "missing"
            : "not_required";
    return {
        ...entry,
        request_telemetry_matched: matchedContract,
        request_telemetry_fresh: fresh,
        request_telemetry_stale: telemetryStatus === "stale",
        request_telemetry_age_ms: ageMs,
        request_telemetry_status: telemetryStatus,
        request_telemetry_entry_id: matched?.entry_id || "",
        request_telemetry_sent_at: matched?.sent_at || "",
        request_telemetry_source: telemetrySource,
        request_telemetry_adapter_captured: adapterCaptured,
        request_telemetry_strong: strong,
        request_telemetry_weak_reason: strong
            ? ""
            : matchedContract && !fresh
                ? "stale"
                : matchedContract && !adapterCaptured
                    ? "receipt_only"
                    : telemetryStatus,
        request_telemetry_file: matched ? getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(entry.group_id || "") : "",
    };
}
function buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const ledger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean));
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : [])
        .filter((entry) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
        .filter((entry) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "").trim()));
    const totals = apiMicrocompactNativeApplyTelemetryTotals(entries);
    const status = entries.length === 0
        ? "empty"
        : Number(totals.failed || 0) > 0 || Number(totals.invalid || 0) > 0
            ? "fail"
            : Number(totals.matched_contract || 0) > 0
                ? "ok"
                : "warn";
    return {
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-summary-v1",
        version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
        groupId,
        target_project: targetProject,
        ledger_file: ledger.file,
        has_history: entries.length > 0,
        status,
        entry_count: entries.length,
        totals,
        source_counts: apiMicrocompactNativeApplyTelemetrySourceCounts(entries),
        matched_entries: entries.filter((entry) => entry.telemetry_status === "matched_contract").slice(-12).reverse(),
        failed_entries: entries.filter((entry) => entry.telemetry_status === "failed" || entry.telemetry_status === "invalid").slice(-12).reverse(),
        recent_entries: entries.slice(-20).reverse(),
        updatedAt: ledger.updatedAt || "",
    };
}
function recordGroupApiMicrocompactNativeApplyProofLedger(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const receiptRows = Array.isArray(input.receiptRows || input.receipt_rows || input.apiMicrocompactReceiptRows || input.api_microcompact_receipt_rows)
        ? (input.receiptRows || input.receipt_rows || input.apiMicrocompactReceiptRows || input.api_microcompact_receipt_rows)
        : [];
    const entries = receiptRows.flatMap((receiptRow) => {
        const gate = receiptRow.api_microcompact || receiptRow.apiMicrocompact || receiptRow.api_microcompact_receipt || receiptRow.apiMicrocompactReceipt || receiptRow;
        const rows = Array.isArray(gate.rows) ? gate.rows : [];
        return rows
            .map((row) => buildApiMicrocompactNativeApplyProofEntry(groupId, input, receiptRow, row))
            .filter(Boolean);
    });
    const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId);
    if (!entries.length) {
        const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId);
        return {
            schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
            groupId,
            file,
            skipped: true,
            reason: "no_api_microcompact_receipt_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId);
    const entryMap = new Map((Array.isArray(ledger.entries) ? ledger.entries : []).map((entry) => [entry.entry_id, entry]));
    let recordedCount = 0;
    let updatedCount = 0;
    for (const entry of entries) {
        if (entryMap.has(entry.entry_id))
            updatedCount += 1;
        else
            recordedCount += 1;
        entryMap.set(entry.entry_id, entry);
    }
    const allEntries = Array.from(entryMap.values())
        .sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")))
        .slice(-320);
    const stats = allEntries.reduce((acc, entry) => {
        const key = apiMicrocompactNativeApplyProofStatsKey(entry);
        const current = acc[key] || {
            target_project: entry.target_project,
            plan_checksum: entry.plan_checksum,
            apply_plan_checksum: entry.apply_plan_checksum || entry.receipt_apply_plan_checksum,
            request_patch_checksum: entry.request_patch_checksum || entry.receipt_request_patch_checksum,
            verified_count: 0,
            failed_count: 0,
            advisory_count: 0,
            not_supported_count: 0,
            native_claim_count: 0,
            agents: [],
            task_ids: [],
            first_seen_at: entry.generated_at,
        };
        const status = String(entry.proof_status || "");
        if (status)
            current[`${status}_count`] = Number(current[`${status}_count`] || 0) + 1;
        if (entry.native_applied === true || status === "verified" || status === "failed")
            current.native_claim_count = Number(current.native_claim_count || 0) + 1;
        current.last_status = status;
        current.last_agent = entry.agent;
        current.last_task_id = entry.task_id;
        current.last_seen_at = entry.generated_at;
        current.agents = Array.from(new Set([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean))).slice(-12);
        current.task_ids = Array.from(new Set([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean))).slice(-12);
        acc[key] = current;
        return acc;
    }, {});
    const totals = apiMicrocompactNativeApplyProofTotals(allEntries);
    const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    writeGroupApiMicrocompactNativeApplyProofLedger(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    });
    return {
        schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
        groupId,
        file,
        recorded_count: recordedCount,
        updated_count: updatedCount,
        totals,
        updatedAt,
    };
}
function buildGroupApiMicrocompactNativeApplyProofSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const ledger = readGroupApiMicrocompactNativeApplyProofLedger(groupId);
    const telemetrySummary = buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId, options);
    const telemetryEntries = [
        ...(Array.isArray(telemetrySummary.matched_entries) ? telemetrySummary.matched_entries : []),
        ...(Array.isArray(telemetrySummary.failed_entries) ? telemetrySummary.failed_entries : []),
        ...(Array.isArray(telemetrySummary.recent_entries) ? telemetrySummary.recent_entries : []),
    ];
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean));
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : [])
        .filter((entry) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
        .filter((entry) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "").trim()));
    const totals = apiMicrocompactNativeApplyProofTotals(entries);
    const proofCoverage = Number(totals.native_claims || 0) > 0
        ? Math.round(Number(totals.verified || 0) / Number(totals.native_claims || 1) * 1000) / 10
        : null;
    const enrichedEntries = entries.map((entry) => enrichApiMicrocompactNativeApplyProofWithTelemetry(entry, telemetryEntries, options));
    const telemetryMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true).length;
    const telemetryAdapterMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source === "native_request_adapter").length;
    const telemetryReceiptMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source !== "native_request_adapter").length;
    const telemetryStrongCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_strong === true).length;
    const telemetryReceiptOnlyCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "receipt_only").length;
    const telemetryMissingCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "missing").length;
    const telemetryStaleCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "stale").length;
    const status = entries.length === 0
        ? "empty"
        : Number(totals.failed || 0) > 0
            ? "fail"
            : telemetryMissingCount > 0 || telemetryStaleCount > 0
                ? "warn"
                : Number(totals.verified || 0) > 0
                    ? "ok"
                    : "advisory";
    return {
        schema: "ccm-group-api-microcompact-native-apply-proof-summary-v1",
        version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
        groupId,
        target_project: targetProject,
        ledger_file: ledger.file,
        has_history: entries.length > 0,
        status,
        entry_count: entries.length,
        proof_coverage_rate: proofCoverage,
        request_telemetry: {
            ...telemetrySummary,
            matched_verified_count: telemetryMatchedCount,
            adapter_matched_verified_count: telemetryAdapterMatchedCount,
            receipt_matched_verified_count: telemetryReceiptMatchedCount,
            strong_verified_count: telemetryStrongCount,
            receipt_only_verified_count: telemetryReceiptOnlyCount,
            missing_verified_count: telemetryMissingCount,
            stale_verified_count: telemetryStaleCount,
            max_age_ms: Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS),
        },
        totals,
        verified_entries: enrichedEntries.filter((entry) => entry.proof_status === "verified").slice(-12).reverse(),
        failed_entries: enrichedEntries.filter((entry) => entry.proof_status === "failed").slice(-12).reverse(),
        advisory_entries: enrichedEntries.filter((entry) => entry.proof_status === "advisory" || entry.proof_status === "not_supported").slice(-12).reverse(),
        recent_entries: enrichedEntries.slice(-20).reverse(),
        updatedAt: ledger.updatedAt || "",
    };
}
function buildStableSourceFingerprint(sourceManifest = {}) {
    const entries = Array.isArray(sourceManifest.entries) ? sourceManifest.entries : [];
    const stable = entries.map((entry) => ({
        id: entry.id,
        purpose: entry.purpose,
        path: entry.path,
        exists: entry.exists === true,
        kind: entry.kind || "",
        bytes: Number(entry.bytes || 0),
        lineCount: Number(entry.lineCount || 0),
        childCount: Number(entry.childCount || 0),
    }));
    return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 24);
}
function buildSourceManifestSnapshot(sourceManifest = {}) {
    const entries = Array.isArray(sourceManifest.entries) ? sourceManifest.entries : [];
    return entries.slice(0, 180).map((entry) => ({
        id: String(entry.id || ""),
        purpose: String(entry.purpose || ""),
        path: String(entry.path || ""),
        exists: entry.exists === true,
        kind: String(entry.kind || ""),
        bytes: Number(entry.bytes || 0),
        mtimeMs: Number(entry.mtimeMs || 0),
        checksum: String(entry.checksum || ""),
        checksumMode: String(entry.checksumMode || ""),
        lineCount: Number(entry.lineCount || 0),
        childCount: Number(entry.childCount || 0),
    })).filter(entry => entry.id || entry.path);
}
function diffSourceManifestSnapshots(previousEntries = [], currentEntries = []) {
    const keyFor = (entry) => String(entry.id || entry.path || "");
    const previous = new Map();
    const current = new Map();
    for (const entry of previousEntries || []) {
        const key = keyFor(entry);
        if (key)
            previous.set(key, entry);
    }
    for (const entry of currentEntries || []) {
        const key = keyFor(entry);
        if (key)
            current.set(key, entry);
    }
    const added = [];
    const removed = [];
    const changed = [];
    for (const [key, entry] of current) {
        const before = previous.get(key);
        if (!before) {
            added.push({ id: entry.id, path: entry.path, purpose: entry.purpose, checksum: entry.checksum });
            continue;
        }
        const changes = [];
        for (const field of ["exists", "kind", "bytes", "mtimeMs", "checksum", "lineCount", "childCount"]) {
            if (before[field] !== entry[field])
                changes.push(field);
        }
        if (changes.length) {
            changed.push({
                id: entry.id,
                path: entry.path,
                purpose: entry.purpose,
                changes,
                previousChecksum: before.checksum || "",
                checksum: entry.checksum || "",
                previousMtimeMs: before.mtimeMs || 0,
                mtimeMs: entry.mtimeMs || 0,
            });
        }
    }
    for (const [key, entry] of previous) {
        if (!current.has(key))
            removed.push({ id: entry.id, path: entry.path, purpose: entry.purpose, checksum: entry.checksum });
    }
    return {
        added: added.slice(0, 40),
        removed: removed.slice(0, 40),
        changed: changed.slice(0, 80),
        addedCount: added.length,
        removedCount: removed.length,
        changedCount: changed.length,
        changedIds: changed.slice(0, 40).map(item => item.id || item.path),
    };
}
function recordGroupMemoryReloadAudit(groupId, input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const loadPlan = input.loadPlan || input.load_plan || {};
    const scope = String(input.scope || input.contextScope || input.context_scope || "default");
    const originalReason = String(input.reason || input.reloadReason || input.reload_reason || "context_bundle");
    const sourceManifestChecksum = String(sourceManifest.manifestChecksum || "");
    const stableSourceFingerprint = buildStableSourceFingerprint(sourceManifest);
    const sourceEntries = buildSourceManifestSnapshot(sourceManifest);
    const loadPlanFingerprint = crypto.createHash("sha256").update(JSON.stringify((loadPlan.entries || []).map((entry) => ({
        relPath: entry.relPath,
        type: entry.type,
        loadOrder: entry.loadOrder,
        checksum: entry.checksum,
        pathGlobs: entry.pathGlobs || [],
    })))).digest("hex").slice(0, 24);
    const ledger = readGroupMemoryReloadLedger(groupId);
    const previous = ledger.scopes?.[scope] || null;
    const sourceManifestChanged = !!previous && previous.sourceManifestChecksum !== sourceManifestChecksum;
    const sourceShapeChanged = !!previous && previous.stableSourceFingerprint !== stableSourceFingerprint;
    const loadPlanChanged = !!previous && previous.loadPlanFingerprint !== loadPlanFingerprint;
    const sourceDiff = diffSourceManifestSnapshots(previous?.sourceEntries || [], sourceEntries);
    const hasSourceDiff = !!previous && (sourceManifestChanged || sourceShapeChanged || sourceDiff.addedCount > 0 || sourceDiff.removedCount > 0 || sourceDiff.changedCount > 0);
    const autoSourceChangeReasons = new Set(["context_bundle", "global_context_bundle", "source_cache_checked"]);
    const reason = hasSourceDiff && autoSourceChangeReasons.has(originalReason)
        ? "memory_source_changed"
        : originalReason;
    const forceReloadReasons = new Set([
        "compact",
        "post_compact_restore",
        "project_memory_import",
        "global_claude_memory_import",
        "memory_file_import",
        "memory_source_changed",
        "manual",
        "session_start",
    ]);
    const shouldReload = !previous || sourceManifestChanged || loadPlanChanged || forceReloadReasons.has(reason);
    const sourceChangeTrigger = {
        schema: "ccm-group-memory-source-change-trigger-v1",
        version: exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION,
        triggered: hasSourceDiff,
        reason,
        originalReason,
        generatedAt,
        previousAuditAt: previous?.generatedAt || "",
        sourceManifestChanged,
        sourceShapeChanged,
        loadPlanChanged,
        addedCount: sourceDiff.addedCount,
        removedCount: sourceDiff.removedCount,
        changedCount: sourceDiff.changedCount,
        changedIds: sourceDiff.changedIds,
        added: sourceDiff.added,
        removed: sourceDiff.removed,
        changed: sourceDiff.changed,
    };
    const audit = {
        schema: "ccm-group-memory-reload-audit-v1",
        version: exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION,
        groupId,
        scope,
        contextKind: input.contextKind || input.context_kind || "child_agent",
        reason,
        originalReason,
        generatedAt,
        shouldReload,
        cacheAction: shouldReload ? "reload_memory_context" : "reuse_memory_context_sources",
        hookEvent: shouldReload ? "instructions_loaded" : "source_cache_checked",
        previousAuditAt: previous?.generatedAt || "",
        sourceManifestChecksum,
        previousSourceManifestChecksum: previous?.sourceManifestChecksum || "",
        sourceManifestChanged,
        stableSourceFingerprint,
        previousStableSourceFingerprint: previous?.stableSourceFingerprint || "",
        sourceShapeChanged,
        loadPlanFingerprint,
        previousLoadPlanFingerprint: previous?.loadPlanFingerprint || "",
        loadPlanChanged,
        sourceChangeTrigger,
        sourceStatus: sourceManifest.status || "",
        sourceEntryCount: Number(sourceManifest.entryCount || 0),
        typedDocCount: Number(sourceManifest.typedDocCount || 0),
        loadPlanStatus: loadPlan.status || "",
        loadPlanEntryCount: Number(loadPlan.entryCount || 0),
        imports: {
            globalClaudeImported: Number(input.globalClaudeMemoryImport?.importedCount || input.global_claude_memory_import?.importedCount || 0),
            projectImported: Number(input.projectMemoryImport?.importedCount || input.project_memory_import?.importedCount || 0),
            projectImportRoots: Array.isArray(input.projectMemoryImports || input.project_memory_imports)
                ? (input.projectMemoryImports || input.project_memory_imports).map((item) => item.projectRoot || "").filter(Boolean).slice(0, 8)
                : [],
        },
        compact: {
            postCompactRecoveryStatus: input.postCompactRecoveryAudit?.status || input.post_compact_recovery_audit?.status || "",
            summaryChecksum: input.postCompactRecoveryAudit?.summaryChecksum || input.post_compact_recovery_audit?.summaryChecksum || "",
        },
    };
    ledger.scopes = ledger.scopes || {};
    ledger.scopes[scope] = {
        generatedAt,
        reason,
        sourceManifestChecksum,
        stableSourceFingerprint,
        loadPlanFingerprint,
        sourceEntries,
        sourceChangeTrigger: {
            triggered: sourceChangeTrigger.triggered,
            reason: sourceChangeTrigger.reason,
            originalReason: sourceChangeTrigger.originalReason,
            addedCount: sourceChangeTrigger.addedCount,
            removedCount: sourceChangeTrigger.removedCount,
            changedCount: sourceChangeTrigger.changedCount,
            changedIds: sourceChangeTrigger.changedIds,
        },
        sourceStatus: audit.sourceStatus,
        loadPlanStatus: audit.loadPlanStatus,
    };
    ledger.entries = [...(ledger.entries || []), audit].slice(-120);
    ledger.updatedAt = generatedAt;
    writeGroupMemoryReloadLedger(groupId, ledger);
    return { ...audit, ledgerFile: getGroupMemoryReloadLedgerFile(groupId) };
}
function buildGroupMemoryDispatchFreshnessGate(input = {}) {
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const reloadAudit = input.reloadAudit || input.reload_audit || {};
    const memoryIgnored = input.memoryIgnored === true || input.memory_ignored === true;
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const scope = String(input.scope || reloadAudit.scope || "default");
    const sourceChecksum = String(sourceManifest.manifestChecksum || "");
    const reloadReason = String(reloadAudit.reason || (memoryIgnored ? "ignore_memory" : "context_bundle"));
    const sourceStatus = String(sourceManifest.status || (memoryIgnored ? "ignored" : "unknown"));
    const missingRequired = Array.isArray(sourceManifest.missingRequired) ? sourceManifest.missingRequired : [];
    const dispatchId = `gmd_${crypto.createHash("sha256").update(JSON.stringify([
        input.groupId || input.group_id || "",
        input.targetProject || input.target_project || "",
        scope,
        generatedAt,
        sourceChecksum,
        reloadReason,
        memoryIgnored,
    ])).digest("hex").slice(0, 18)}`;
    const status = memoryIgnored
        ? "memory_ignored"
        : sourceStatus === "fail" || missingRequired.length
            ? "source_incomplete"
            : reloadAudit.shouldReload === false
                ? "fresh_reused_stable_sources"
                : "fresh_reloaded";
    const gate = {
        schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
        version: exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
        dispatch_gate_id: dispatchId,
        group_id: String(input.groupId || input.group_id || ""),
        target_project: String(input.targetProject || input.target_project || ""),
        scope,
        generated_at: generatedAt,
        status,
        memory_ignored: memoryIgnored,
        action: memoryIgnored
            ? "do_not_use_platform_memory"
            : status === "source_incomplete"
                ? "use_current_context_but_verify_missing_sources"
                : reloadAudit.shouldReload === false
                    ? "reuse_stable_context_sources"
                    : "use_reloaded_context",
        source_manifest: {
            checksum: sourceChecksum,
            status: sourceStatus,
            entry_count: Number(sourceManifest.entryCount || 0),
            typed_doc_count: Number(sourceManifest.typedDocCount || 0),
            latest_mtime: sourceManifest.latestMtime || "",
            missing_required: missingRequired,
        },
        reload_audit: {
            reason: reloadReason,
            original_reason: reloadAudit.originalReason || reloadReason,
            should_reload: reloadAudit.shouldReload !== false,
            cache_action: reloadAudit.cacheAction || "",
            hook_event: reloadAudit.hookEvent || "",
            previous_audit_at: reloadAudit.previousAuditAt || "",
            source_changed: reloadAudit.sourceManifestChanged === true || reloadAudit.sourceChangeTrigger?.triggered === true,
            load_plan_changed: reloadAudit.loadPlanChanged === true,
            source_change_trigger: reloadAudit.sourceChangeTrigger || null,
        },
        receipt_contract: {
            memory_used_should_reference_gate: !memoryIgnored,
            memory_ignored_should_reference_gate: memoryIgnored,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        },
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 8000, maxTokens: 20_000 }),
    };
}
function normalizePostCompactReinjectionRows(plan = {}) {
    const normalize = (kind, rows) => (Array.isArray(rows) ? rows : [])
        .map((row) => {
        const value = compactMemoryText(row?.value || row, 260);
        const sourceMessageId = String(row?.sourceMessageId || row?.source_message_id || "");
        const candidateId = String(row?.candidate_id || row?.candidateId || "")
            || `pcrc_${crypto.createHash("sha256").update(JSON.stringify([kind, value, sourceMessageId])).digest("hex").slice(0, 12)}`;
        return {
            candidate_id: candidateId,
            kind,
            value,
            sourceMessageId,
            actor: String(row?.actor || ""),
            taskId: String(row?.taskId || row?.task_id || ""),
        };
    })
        .filter((row) => row.value);
    return [
        ...normalize("file", plan.files),
        ...normalize("skill", plan.skills),
        ...normalize("verification", plan.verification),
        ...normalize("blocker", plan.blockers),
    ];
}
function buildGroupMemoryPostCompactReinjectionGate(input = {}) {
    const plan = input.postCompactReinject || input.post_compact_reinject || input.reinjectionPlan || input.reinjection_plan || {};
    const candidates = normalizePostCompactReinjectionRows(plan);
    if (!candidates.length && plan.hasCandidates !== true)
        return null;
    const recoveryAudit = input.postCompactRecoveryAudit || input.post_compact_recovery_audit || {};
    const summaryChecksum = String(input.summaryChecksum
        || input.summary_checksum
        || recoveryAudit.summaryChecksum
        || recoveryAudit.summary_checksum
        || "");
    const generatedAt = input.generatedAt || input.generated_at || new Date().toISOString();
    const targetProject = String(input.targetProject || input.target_project || "");
    const groupId = String(input.groupId || input.group_id || "");
    const gateId = `pcrg_${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        summaryChecksum,
        candidates.map((item) => [item.kind, item.value, item.sourceMessageId]),
    ])).digest("hex").slice(0, 18)}`;
    const status = recoveryAudit.status === "failed"
        ? "recovery_audit_failed"
        : recoveryAudit.status === "degraded"
            ? "degraded_reinject"
            : "required";
    return {
        schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
        version: exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION,
        reinjection_gate_id: gateId,
        group_id: groupId,
        target_project: targetProject,
        scope: String(input.scope || (targetProject ? `child:${targetProject}` : "child")),
        generated_at: generatedAt,
        status,
        action: status === "recovery_audit_failed"
            ? "verify_raw_transcript_before_using_reinjection_candidates"
            : "review_reinjection_candidates_before_execution",
        candidate_count: candidates.length,
        candidates: candidates.slice(0, 24),
        post_compact_recovery_audit: {
            status: recoveryAudit.status || "",
            pass: recoveryAudit.pass === true,
            action: recoveryAudit.action || "",
            boundary_id: recoveryAudit.boundaryId || recoveryAudit.boundary_id || "",
            summary_checksum: summaryChecksum,
            transcript_path: recoveryAudit.transcriptPath || recoveryAudit.transcript_path || "",
        },
        receipt_contract: {
            memory_used_should_reference_gate: true,
            memory_ignored_should_reference_gate: true,
            required_receipt_fields: ["memoryUsed", "memoryIgnored", "postCompactCandidateUsage"],
            required_reference: gateId,
            required_candidate_reference: "all_candidate_ids_or_structured_candidate_usage_rows",
            required_candidate_usage_state: "each_candidate_must_be_used_ignored_or_verified",
            candidate_ids: candidates.map((item) => item.candidate_id).slice(0, 24),
            note: "子 Agent 回执必须在 memoryUsed 或 memoryIgnored 中引用该 reinjection gate，并在 postCompactCandidateUsage 中逐条声明每个候选 used / ignored / verified。",
        },
    };
}
function resolvePostCompactBoundaryMarkerParts(groupId, input = {}) {
    const compaction = input.compaction || {};
    const boundary = input.compactBoundary || input.compact_boundary || compaction.boundary || {};
    const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
    const recoveryAudit = input.postCompactRecoveryAudit
        || input.post_compact_recovery_audit
        || gate.post_compact_recovery_audit
        || gate.postCompactRecoveryAudit
        || {};
    const rawBoundaryId = String(input.rawBoundaryId
        || input.raw_boundary_id
        || boundary.id
        || recoveryAudit.boundaryId
        || recoveryAudit.boundary_id
        || "");
    const summarizedThroughMessageId = String(input.lastCompactedMessageId
        || input.last_compacted_message_id
        || compaction.lastCompactedMessageId
        || compaction.last_compacted_message_id
        || boundary.summarizedThroughMessageId
        || boundary.summarized_through_message_id
        || "");
    const summaryChecksum = String(input.summaryChecksum
        || input.summary_checksum
        || compaction.summaryChecksum
        || compaction.summary_checksum
        || boundary.summaryChecksum
        || boundary.summary_checksum
        || recoveryAudit.summaryChecksum
        || recoveryAudit.summary_checksum
        || gate.summary_checksum
        || "");
    const compactedMessageCount = Number(input.compactedMessageCount
        || input.compacted_message_count
        || compaction.compactedMessageCount
        || compaction.compacted_message_count
        || boundary.summarizedMessageCount
        || boundary.summarized_message_count
        || 0);
    const hasPostCompactBoundary = !!(rawBoundaryId || summarizedThroughMessageId || summaryChecksum)
        && (compactedMessageCount > 0 || !!gate?.schema || !!compaction.postCompactReinject || !!compaction.post_compact_reinject);
    if (!hasPostCompactBoundary)
        return null;
    const boundaryId = `pcb_${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        summarizedThroughMessageId,
        summaryChecksum,
        rawBoundaryId && !summarizedThroughMessageId ? rawBoundaryId : "",
    ])).digest("hex").slice(0, 18)}`;
    return {
        boundaryId,
        rawBoundaryId,
        summarizedThroughMessageId,
        summaryChecksum,
        compactedMessageCount,
    };
}
function recordGroupPostCompactFirstDispatchMarker(groupId, input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const targetProject = String(input.targetProject || input.target_project || "").trim();
    const scope = String(input.scope || (targetProject ? `child:${targetProject}` : "child"));
    const parts = resolvePostCompactBoundaryMarkerParts(groupId, input);
    if (!parts)
        return null;
    const ledgerFile = getGroupPostCompactDispatchLedgerFile(groupId);
    const ledgerDisabled = input.disableLedger === true
        || input.disable_ledger === true
        || input.disablePostCompactDispatchLedger === true
        || input.disable_post_compact_dispatch_ledger === true;
    const ledger = ledgerDisabled ? { scopes: {}, entries: [] } : readGroupPostCompactDispatchLedger(groupId);
    const scopeKey = `${scope}|${parts.boundaryId}`;
    const previous = ledger.scopes?.[scopeKey] || null;
    const dispatchSequence = Number(previous?.dispatchSequence || previous?.dispatch_sequence || 0) + 1;
    const firstDispatchAfterCompact = dispatchSequence === 1;
    const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
    const markerCore = {
        schema: "ccm-post-compact-first-dispatch-marker-v1",
        version: exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
        marker_id: `pcfd_${crypto.createHash("sha256").update(JSON.stringify([
            groupId,
            targetProject,
            scope,
            parts.boundaryId,
            dispatchSequence,
        ])).digest("hex").slice(0, 18)}`,
        group_id: groupId,
        target_project: targetProject,
        scope,
        generated_at: generatedAt,
        boundary_id: parts.boundaryId,
        raw_boundary_id: parts.rawBoundaryId,
        summarized_through_message_id: parts.summarizedThroughMessageId,
        summary_checksum: parts.summaryChecksum,
        compacted_message_count: parts.compactedMessageCount,
        first_dispatch_after_compact: firstDispatchAfterCompact,
        dispatch_sequence: dispatchSequence,
        previous_dispatch_at: previous?.generatedAt || previous?.generated_at || "",
        status: firstDispatchAfterCompact ? "first_dispatch_after_compact" : "post_compact_followup_dispatch",
        action: firstDispatchAfterCompact
            ? "treat_reinjected_memory_as_fresh_recovered_context"
            : "reuse_recovered_context_with_sequence_awareness",
        reinjection_gate_id: gate.reinjection_gate_id || gate.reinjectionGateId || "",
        candidate_count: Number(gate.candidate_count || gate.candidateCount || 0),
        ledger_file: ledgerFile,
        cc_parity_reference: {
            source: "Claude Code pendingPostCompaction / consumePostCompaction",
            semantics: "mark once per compact boundary and target child Agent dispatch sequence",
        },
        receipt_contract: {
            memory_used_or_ignored_may_reference_marker: true,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            note: "该 marker 是压缩后派发遥测；first_dispatch_after_compact=true 时，子 Agent 应把本轮记忆包视为压缩恢复后的第一跳上下文。",
        },
    };
    const marker = {
        ...markerCore,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: markerCore, maxChars: 5000, maxTokens: 12_000 }),
    };
    if (!ledgerDisabled) {
        ledger.scopes = ledger.scopes || {};
        ledger.scopes[scopeKey] = {
            groupId,
            targetProject,
            scope,
            boundaryId: parts.boundaryId,
            rawBoundaryId: parts.rawBoundaryId,
            summarizedThroughMessageId: parts.summarizedThroughMessageId,
            summaryChecksum: parts.summaryChecksum,
            dispatchSequence,
            firstDispatchAt: previous?.firstDispatchAt || previous?.first_dispatch_at || generatedAt,
            generatedAt,
            latestMarkerId: marker.marker_id,
            reinjectionGateId: marker.reinjection_gate_id,
            candidateCount: marker.candidate_count,
        };
        ledger.entries = [...(ledger.entries || []), markerCore].slice(-160);
        ledger.updatedAt = generatedAt;
        writeGroupPostCompactDispatchLedger(groupId, ledger);
    }
    return marker;
}
const GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = Math.max(250, Number(process.env.CCM_GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS || 2500));
const groupMemoryAutoCompactTimers = new Map();
const groupMemoryAutoCompactRunning = new Set();
const groupMemoryAutoCompactPending = new Set();
let groupMemoryAutoCompactHookRegistered = false;
function loadGroupMemoryCompactionConfig(overrides = {}) {
    let config = {};
    try {
        const mod = require("./group-orchestrator");
        if (typeof mod.loadOrchestratorConfig === "function")
            config = mod.loadOrchestratorConfig();
    }
    catch { }
    return { ...(config || {}), ...(overrides || {}) };
}
function isGroupModelCompactionEnabled(config) {
    return config?.memoryCompactionUseModel === true
        || String(config?.memoryCompactionMode || "").toLowerCase() === "hybrid";
}
function buildBackgroundCompactionState(input = {}) {
    return {
        status: String(input.status || "unknown"),
        reason: String(input.reason || ""),
        messageId: String(input.messageId || ""),
        compacted: input.compacted === true,
        modelCompactionEnabled: input.modelCompactionEnabled === true,
        rebuild: input.rebuild === true,
        force: input.force === true,
        boundaryId: String(input.boundaryId || ""),
        summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
        keepIndex: Number(input.keepIndex || 0),
        messageCount: Number(input.messageCount || 0),
        error: compactMemoryText(input.error || "", 500),
        startedAt: String(input.startedAt || ""),
        completedAt: String(input.completedAt || new Date().toISOString()),
    };
}
function scheduleGroupMemoryAutoCompaction(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { scheduled: false, reason: "missing_group_id" };
    if (groupMemoryAutoCompactTimers.has(id)) {
        clearTimeout(groupMemoryAutoCompactTimers.get(id));
    }
    const delayMs = Math.max(0, Number(options.delayMs ?? GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS));
    const timer = setTimeout(() => {
        groupMemoryAutoCompactTimers.delete(id);
        void runGroupMemoryAutoCompactionNow(id, options);
    }, delayMs);
    groupMemoryAutoCompactTimers.set(id, timer);
    return { scheduled: true, groupId: id, delayMs };
}
async function runGroupMemoryAutoCompactionNow(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { success: false, compacted: false, reason: "missing_group_id" };
    if (groupMemoryAutoCompactTimers.has(id)) {
        clearTimeout(groupMemoryAutoCompactTimers.get(id));
        groupMemoryAutoCompactTimers.delete(id);
    }
    if (groupMemoryAutoCompactRunning.has(id)) {
        groupMemoryAutoCompactPending.add(id);
        return { success: true, compacted: false, scheduled: true, reason: "already_running" };
    }
    groupMemoryAutoCompactRunning.add(id);
    const startedAt = new Date().toISOString();
    try {
        const messages = (0, storage_1.getGroupMessages)(id).filter((message) => !String(message?.content || "").startsWith("📤"));
        const memory = loadGroupMemory(id);
        const config = loadGroupMemoryCompactionConfig(options.config || {});
        const modelCompactionEnabled = isGroupModelCompactionEnabled(config);
        const previousSummarySource = String(memory?.compaction?.summarySource || "");
        const rebuild = options.rebuild === true || (modelCompactionEnabled && previousSummarySource === "deterministic-sync");
        const force = options.force === true;
        const result = await (0, group_memory_compaction_1.compactGroupConversationMemory)({
            groupId: id,
            messages,
            memory,
            config,
            transcriptPath: getGroupMessagesFileHint(id),
            force,
            rebuild,
        });
        const nextMemory = result.memory || memory;
        const background = buildBackgroundCompactionState({
            status: result.compacted ? "compacted" : "skipped",
            reason: options.reason || "message_append",
            messageId: options.messageId || "",
            compacted: result.compacted,
            modelCompactionEnabled,
            rebuild,
            force,
            boundaryId: result.boundary?.id || "",
            summarizedThroughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
            keepIndex: result.keepIndex || 0,
            messageCount: messages.length,
            startedAt,
            completedAt: new Date().toISOString(),
        });
        const logDistillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(id, messages, nextMemory, {
            reason: `auto_compaction:${background.reason || "message_append"}`,
            throughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
            maxMessages: options.distillMaxMessages || options.distill_max_messages,
        });
        const saved = saveGroupMemory(id, {
            ...nextMemory,
            longTermLogDistillation: logDistillation,
            compaction: {
                ...(nextMemory?.compaction || {}),
                background,
                logDistillation,
            },
        });
        return { success: true, compacted: !!result.compacted, boundary: result.boundary || null, keepIndex: result.keepIndex, background, memory: saved };
    }
    catch (error) {
        const memory = loadGroupMemory(id);
        const background = buildBackgroundCompactionState({
            status: "failed",
            reason: options.reason || "message_append",
            messageId: options.messageId || "",
            error: error?.message || String(error),
            startedAt,
            completedAt: new Date().toISOString(),
        });
        saveGroupMemory(id, {
            ...memory,
            compaction: {
                ...(memory?.compaction || {}),
                background,
                consecutiveFailures: Number(memory?.compaction?.consecutiveFailures || 0) + 1,
                health: "degraded",
                lastFailure: background.error,
                lastFailureAt: background.completedAt,
            },
        });
        return { success: false, compacted: false, error: background.error, background };
    }
    finally {
        groupMemoryAutoCompactRunning.delete(id);
        if (groupMemoryAutoCompactPending.has(id)) {
            groupMemoryAutoCompactPending.delete(id);
            scheduleGroupMemoryAutoCompaction(id, { reason: "pending_after_run", delayMs: GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS });
        }
    }
}
function ensureGroupMemoryAutoCompactionHook() {
    if (groupMemoryAutoCompactHookRegistered)
        return { registered: true, already: true };
    (0, storage_1.registerGroupMessageAppendHook)((groupId, message) => {
        scheduleGroupMemoryAutoCompaction(groupId, {
            reason: "message_append",
            messageId: String(message?.id || ""),
        });
    });
    groupMemoryAutoCompactHookRegistered = true;
    return { registered: true, already: false };
}
ensureGroupMemoryAutoCompactionHook();
async function runGroupMemoryAutoCompactionSelfTest() {
    const groupId = `group-memory-auto-compact-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const messages = Array.from({ length: 80 }, (_, index) => ({
        id: `gm-auto-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "frontend" : undefined,
        timestamp: `2026-07-07T01:${String(index % 60).padStart(2, "0")}:00.000Z`,
        content: index === 0
            ? "必须保留自动压缩哨兵 AUTO_COMPACT_SENTINEL_20260707"
            : `自动压缩测试消息 ${index}，涉及 src/auto-${index}.ts，${"上下文".repeat(40)}`,
    }));
    try {
        (0, storage_1.saveGroupMessages)(groupId, messages);
        const result = await runGroupMemoryAutoCompactionNow(groupId, {
            force: true,
            rebuild: true,
            reason: "selftest",
            config: { memoryCompactionUseModel: false },
        });
        const memory = loadGroupMemory(groupId);
        const rawMessages = (0, storage_1.getGroupMessages)(groupId);
        const checks = {
            success: result.success === true,
            compacted: result.compacted === true,
            boundaryRecorded: !!memory?.compactBoundary?.summarizedThroughMessageId || !!memory?.compaction?.lastCompactedMessageId,
            backgroundRecorded: memory?.compaction?.background?.status === "compacted" && memory.compaction.background.reason === "selftest",
            qualityGatePassed: memory?.compaction?.quality?.pass === true && Number(memory?.compaction?.quality?.score || 0) >= 80,
            microCompactRecorded: memory?.compaction?.microCompact?.schema === "ccm-group-micro-compact-v1",
            postCompactReinjectRecorded: memory?.compaction?.postCompactReinject?.schema === "ccm-post-compact-reinjection-v1",
            postCompactRecoveryAuditRecorded: memory?.compaction?.postCompactRecoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1"
                && memory?.messageCompression?.postCompactRecoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1",
            logDistillationRecorded: memory?.compaction?.logDistillation?.schema === "ccm-group-typed-memory-distillation-v1"
                && Number(memory.compaction.logDistillation.candidateCount || 0) > 0,
            contextPressureWarningRecorded: memory?.compaction?.contextPressureWarning?.schema === "ccm-group-compact-warning-v1"
                && memory?.messageCompression?.contextPressureWarning?.schema === "ccm-group-compact-warning-v1",
            summaryPreservesSentinel: JSON.stringify(memory?.conversationSummary || {}).includes("AUTO_COMPACT_SENTINEL_20260707")
                || String(memory?.messageDigest || "").includes("AUTO_COMPACT_SENTINEL_20260707"),
            rawTranscriptUntouched: rawMessages.length === messages.length && rawMessages[0]?.content?.includes("AUTO_COMPACT_SENTINEL_20260707"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, background: memory?.compaction?.background || null };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function buildAgentMemoryContextBundle(groupId, targetProject, task = "", options = {}) {
    const project = normalizeAgentMemoryProject(targetProject);
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(task, options);
    const generatedAt = new Date().toISOString();
    const sessionBinding = buildChildAgentSessionBinding(groupId, project, task, { ...options, generatedAt });
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-group-memory-context-v1",
            version: 1,
            group_id: groupId,
            target_project: project,
            task_query: compactMemoryText(task, 900),
            generated_at: generatedAt,
            session_binding: sessionBinding,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_platform_memory",
                use: "must_not_use_memory",
                boundary: "current_task_only",
                raw_recovery: "disabled for this turn unless the user explicitly asks to restore memory",
            },
            compaction: {},
            group_state: {
                goal: "",
                currentPhase: "memory_ignored",
                summaryText: "",
                decisions: [],
                openQuestions: [],
                nextActions: [],
                persistentRequirements: [],
                factAnchors: [],
                typedMemory: {
                    sync: null,
                    recall: {
                        schema: "ccm-group-typed-memory-recall-v1",
                        ignored: true,
                        reason: "user_requested_ignore_memory",
                        indexFile: "",
                        memoryDir: (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId),
                        recalled: [],
                        surfaced: [],
                    },
                },
            },
            target_agent_memory: {},
            related_work: {},
            relevant_historical_evidence: "",
            raw_sources: {
                group_memory_file: getGroupMemoryFile(groupId),
                group_messages_file: getGroupMessagesFileHint(groupId),
                group_typed_memory_dir: (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId),
            },
        };
        bundle.dispatch_freshness_gate = buildGroupMemoryDispatchFreshnessGate({
            groupId,
            targetProject: project,
            scope: `child:${project}`,
            generatedAt,
            memoryIgnored: true,
        });
        const rendered = renderGroupMemoryContextBundle(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = compactPreserveLines(rendered, Number(options.maxRenderedChars || 6000));
        return bundle;
    }
    const allMessages = (0, storage_1.getGroupMessages)(groupId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const memory = refreshGroupConversationMemorySnapshot(groupId, allMessages, loadGroupMemory(groupId), {
        recentLimit: options.recentLimit || options.recent_limit || 12,
        olderLimit: options.olderLimit || options.older_limit || 30,
        minKeepMessages: options.minKeepMessages || options.min_keep_messages,
        minKeepTokens: options.minKeepTokens || options.min_keep_tokens,
        maxKeepTokens: options.maxKeepTokens || options.max_keep_tokens,
        apiMicrocompactTargetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
        apiMicrocompactMaxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
    });
    const agentMemory = { ...createEmptyAgentMemory(project), ...((memory.agentMemories || {})[project] || {}) };
    const ownCompleted = (memory.completed || []).filter((item) => item.project === project).slice(-4);
    const otherCompleted = (memory.completed || []).filter((item) => item.project !== project).slice(-4);
    const ownBlocked = (memory.blocked || []).filter((item) => item.project === project).slice(-4);
    const globalBlocked = (memory.blocked || []).filter((item) => item.project !== project).slice(-3);
    const relatedLedger = (memory.workerLedger || []).filter((item) => item.project !== project).slice(-5);
    const boundaryIndex = getCompactBoundaryIndex(memory, allMessages);
    const postCompactReinjectionGate = buildGroupMemoryPostCompactReinjectionGate({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        postCompactReinject: memory.compaction?.postCompactReinject || memory.compactBoundary?.post_compact_restore?.reinjectionPlan || null,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null,
        summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || "",
    });
    const postCompactCandidateUsage = buildGroupPostCompactCandidateUsageSummary(groupId, {
        targetProject: project,
        candidates: postCompactReinjectionGate?.candidates || [],
    });
    const typedLogDistillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(groupId, allMessages, memory, {
        reason: "context_bundle",
        maxMessages: options.distillMaxMessages || options.distill_max_messages,
        postCompactCandidateUsage,
    });
    const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
        ? null
        : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(groupId, {
            settingSources: options.settingSources ?? options.setting_sources,
            includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
            includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
            userRoot: options.claudeUserRoot || options.claude_user_root,
            managedRoot: options.claudeManagedRoot || options.claude_managed_root,
            maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
            maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files,
        });
    const projectMemoryRoot = resolveGroupProjectMemoryRoot(project, options);
    const projectMemoryImport = projectMemoryRoot
        ? (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, projectMemoryRoot, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files,
        })
        : null;
    const typedMemorySync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(groupId, memory);
    const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(task, [
        ...(Array.isArray(options.targetPaths || options.target_paths) ? (options.targetPaths || options.target_paths) : []),
        ...(agentMemory.frequentFiles || []),
    ]);
    const typedMemoryLoadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(groupId, {
        maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
        query: [task, memory.goal, project].filter(Boolean).join("\n"),
        targetPaths: typedMemoryTargetPaths,
    });
    const recentTools = [
        ...(Array.isArray(options.recentTools || options.recent_tools) ? (options.recentTools || options.recent_tools) : []),
        ...(agentMemory.recentReceipts || []).flatMap((item) => [
            ...(Array.isArray(item.memoryUsed) ? item.memoryUsed : []),
            ...(Array.isArray(item.verification) ? item.verification : []),
        ]),
    ].map((item) => String(item || "").replace(/^Skill\s*[:：]\s*/i, "")).filter(Boolean).slice(-12);
    const ledgerAlreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(groupId, project);
    const explicitAlreadySurfaced = options.alreadySurfacedMemory || options.already_surfaced_memory || [];
    const typedMemoryRecall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, [task, memory.goal, project].filter(Boolean).join("\n"), {
        alreadySurfaced: [...ledgerAlreadySurfaced, ...explicitAlreadySurfaced],
        recentTools,
        targetPaths: typedMemoryTargetPaths,
        postCompactCandidateUsage,
        max: Number(options.maxTypedMemory || options.max_typed_memory || 5),
    });
    const globalAgentMemoryRecall = buildChildGlobalAgentMemoryContext([task, memory.goal, memory.currentPhase, project].filter(Boolean).join("\n"), {
        ...options,
        groupId,
        targetProject: project,
        generatedAt,
        groupMemory: memory,
        groupMessages: allMessages,
        typedMemoryRecall,
    });
    const globalMemoryArbitrationLedger = recordGroupGlobalMemoryArbitrationLedger(groupId, {
        generatedAt,
        targetProject: project,
        task,
        globalAgentMemoryRecall,
    });
    const globalMemoryArbitrationDistillation = distillGroupGlobalMemoryArbitrationToTypedMemory(groupId, {
        generatedAt,
        threshold: options.globalMemoryArbitrationDistillationThreshold || options.global_memory_arbitration_distillation_threshold || 2,
    });
    const effectiveGlobalMemoryArbitrationLedger = globalMemoryArbitrationDistillation?.summary?.schema
        ? globalMemoryArbitrationDistillation.summary
        : globalMemoryArbitrationLedger;
    const effectiveTypedMemorySync = globalMemoryArbitrationDistillation?.index?.schema
        ? { ...typedMemorySync, index: globalMemoryArbitrationDistillation.index }
        : typedMemorySync;
    const effectiveTypedMemoryLoadPlan = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(groupId, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: [task, memory.goal, project].filter(Boolean).join("\n"),
            targetPaths: typedMemoryTargetPaths,
        })
        : typedMemoryLoadPlan;
    const effectiveTypedMemoryRecall = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, [task, memory.goal, project].filter(Boolean).join("\n"), {
            alreadySurfaced: [...ledgerAlreadySurfaced, ...explicitAlreadySurfaced],
            recentTools,
            targetPaths: typedMemoryTargetPaths,
            postCompactCandidateUsage,
            max: Number(options.maxTypedMemory || options.max_typed_memory || 5),
        })
        : typedMemoryRecall;
    const typedMemoryLedger = (0, group_memory_index_1.recordGroupTypedMemoryRecall)(groupId, project, effectiveTypedMemoryRecall, [task, memory.goal, project].filter(Boolean).join("\n"));
    const sourceManifest = buildGroupMemorySourceManifest(groupId, {
        generatedAt,
        typedMemorySync: effectiveTypedMemorySync,
        typedLogDistillation,
        typedMemoryLedger,
        globalAgentMemoryRecall,
        globalMemoryArbitrationLedger: effectiveGlobalMemoryArbitrationLedger,
    });
    const memoryReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
        || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && Number(projectMemoryImport?.importedCount || 0) > 0 ? "memory_file_import"
            : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                : Number(projectMemoryImport?.importedCount || 0) > 0 ? "project_memory_import"
                    : Number(globalAgentMemoryRecall?.itemCount || 0) > 0 ? "global_agent_memory_recall"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "context_bundle");
    const memoryReloadAudit = recordGroupMemoryReloadAudit(groupId, {
        generatedAt,
        scope: `child:${project}`,
        contextKind: "child_agent",
        reason: memoryReloadReason,
        sourceManifest,
        loadPlan: effectiveTypedMemoryLoadPlan,
        globalClaudeMemoryImport,
        globalAgentMemoryRecall,
        projectMemoryImport,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null,
    });
    const dispatchFreshnessGate = buildGroupMemoryDispatchFreshnessGate({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        sourceManifest,
        reloadAudit: memoryReloadAudit,
    });
    const postCompactDispatchMarker = recordGroupPostCompactFirstDispatchMarker(groupId, {
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        compactBoundary: memory.compactBoundary || null,
        compaction: memory.compaction || null,
        postCompactReinjectionGate,
        disablePostCompactDispatchLedger: options.disablePostCompactDispatchLedger || options.disable_post_compact_dispatch_ledger,
    });
    const relevantHistoricalEvidence = (0, group_memory_compaction_1.buildRelevantHistoricalGroupContext)(allMessages, boundaryIndex, [task, memory.goal, project].filter(Boolean).join("\n"), { maxMessages: 6, maxChars: Number(options.maxEvidenceChars || 7000) });
    const summaryText = memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null);
    const sessionMemorySnapshot = memory.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotSummary(groupId);
    const toolContinuitySnapshot = memory.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotSummary(groupId);
    const replayRepairLedger = readGroupReplayRepairLedgerSummary(groupId);
    const replayRepairWorkItems = readGroupReplayRepairWorkItemsSummary(groupId);
    const replayRepairDispatchCandidates = readGroupReplayRepairDispatchCandidatesSummary(groupId);
    const boundaryHistory = buildGroupCompactBoundaryHistorySummary(memory);
    const childAgentTypes = buildChildAgentTypeSummary(memory);
    const storedApiMicroCompactEditPlan = memory.compaction?.apiMicroCompactEditPlan
        || memory.compactBoundary?.apiMicroCompactEditPlan
        || memory.compactBoundary?.post_compact_restore?.apiMicroCompactEditPlan
        || memory.messageCompression?.apiMicroCompactEditPlan
        || null;
    const runtimeCapabilities = options.runtimeCapabilities
        || options.runtime_capabilities
        || options.task?.runtimeCapabilities
        || options.task?.runtime_capabilities
        || options.task?.workflow_meta?.runtime_capabilities
        || {};
    const apiMicrocompactNativeApplyPlan = (0, group_memory_compaction_1.buildGroupApiMicrocompactNativeApplyPlan)(storedApiMicroCompactEditPlan || {}, {
        groupId,
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        transport: options.agentTransport || options.agent_transport || options.transport || runtimeCapabilities.transport,
        provider: options.agentProvider || options.agent_provider || options.provider || runtimeCapabilities.provider,
        supportsApiContextManagement: options.supportsApiContextManagement === true
            || options.supports_api_context_management === true
            || runtimeCapabilities.supportsApiContextManagement === true
            || runtimeCapabilities.supports_api_context_management === true,
        nativeApiRequestLayer: options.nativeApiRequestLayer === true
            || options.native_api_request_layer === true
            || runtimeCapabilities.nativeApiRequestLayer === true
            || runtimeCapabilities.native_api_request_layer === true,
        contextManagementBetaHeaderEnabled: options.contextManagementBetaHeaderEnabled === true
            || options.context_management_beta_header_enabled === true
            || runtimeCapabilities.contextManagementBetaHeaderEnabled === true
            || runtimeCapabilities.context_management_beta_header_enabled === true,
        betaHeaders: options.betaHeaders || options.beta_headers || runtimeCapabilities.betaHeaders || runtimeCapabilities.beta_headers,
        featureEnabled: options.apiMicrocompactNativeApplyEnabled !== false && options.api_microcompact_native_apply_enabled !== false,
        sessionBinding,
        now: generatedAt,
    });
    const apiMicrocompactNativeApplyProofLedger = buildGroupApiMicrocompactNativeApplyProofSummary(groupId, {
        targetProject: project,
        planChecksums: [storedApiMicroCompactEditPlan?.planChecksum || storedApiMicroCompactEditPlan?.plan_checksum || ""].filter(Boolean),
    });
    const bundle = {
        schema: "ccm-group-memory-context-v1",
        version: 1,
        group_id: groupId,
        target_project: project,
        task_query: compactMemoryText(task, 900),
        generated_at: generatedAt,
        session_binding: sessionBinding,
        memory_policy: {
            priority: "platform_group_memory_over_third_party_cli_session",
            use: "must_consider",
            boundary: "summary_recent_window_raw_evidence",
            raw_recovery: "group-messages JSON keeps raw transcript; request message id if more source text is needed",
        },
        compaction: {
            version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
            strategy: memory.messageCompression?.strategy || "cc-session-memory-v3-sync",
            health: memory.compaction?.health || "",
            quality: memory.compaction?.quality || null,
            qualityScore: Number(memory.compaction?.quality?.score || 0),
            qualityStatus: memory.compaction?.quality?.status || "",
            driftDetected: memory.compaction?.quality?.drift?.detected === true || memory.compaction?.driftDetected === true,
            downgradedByQualityGate: memory.compaction?.downgradedByQualityGate === true,
            qualityDowngradeReason: memory.compaction?.qualityDowngradeReason || memory.compaction?.quality?.downgrade_reason || "",
            microCompact: memory.compaction?.microCompact || memory.compactBoundary?.post_compact_restore?.microCompact || null,
            postCompactReinject: memory.compaction?.postCompactReinject || memory.compactBoundary?.post_compact_restore?.reinjectionPlan || null,
            partialCompact: memory.compaction?.partialCompact || memory.compactBoundary?.partialCompact || null,
            partialSegments: memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || [],
            ptlEmergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || memory.compactBoundary?.post_compact_restore?.ptlEmergency || null,
            ptlRecovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || memory.compactBoundary?.post_compact_restore?.ptlRecovery || null,
            compactStrategyDecision: memory.compaction?.compactStrategyDecision
                || memory.compactBoundary?.compactStrategyDecision
                || memory.compactBoundary?.post_compact_restore?.strategyDecision
                || memory.messageCompression?.compactStrategyDecision
                || null,
            apiMicroCompactEditPlan: storedApiMicroCompactEditPlan,
            apiMicrocompactNativeApplyPlan,
            apiMicrocompactNativeApplyProofLedger,
            compactedMessageCount: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
            preservedRecentMessages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
            lastCompactedMessageId: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
            lastCompactedAt: memory.compaction?.lastCompactedAt || memory.messageCompression?.lastCompressedAt || "",
            summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || "",
            sessionMemory: sessionMemorySnapshot,
            toolContinuity: toolContinuitySnapshot,
            boundary: memory.compactBoundary || null,
            boundaryHistory,
            contextPressureWarning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
            preCompactWarning: memory.compaction?.preCompactWarning || null,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null,
            postCompactCleanupAudit: memory.compaction?.postCompactCleanupAudit
                || memory.compactBoundary?.post_compact_restore?.cleanupAudit
                || memory.messageCompression?.postCompactCleanupAudit
                || null,
            hookLedger: memory.compaction?.hookLedger || null,
            replayRepairPlan: memory.compaction?.replayRepairPlan || memory.compaction?.replay_repair_plan || null,
            replayRepairLedger,
            replayRepairWorkItems,
            replayRepairDispatchCandidates,
            childAgentTypes,
        },
        group_state: {
            goal: memory.goal || "",
            currentPhase: memory.currentPhase || "idle",
            summaryText,
            decisions: (memory.decisions || []).slice(-6),
            openQuestions: (memory.openQuestions || []).slice(-4),
            nextActions: (memory.nextActions || []).slice(-4),
            persistentRequirements: (memory.persistentRequirements || []).slice(-8),
            factAnchors: (memory.factAnchors || []).slice(-8),
            typedMemory: {
                distillation: typedLogDistillation,
                arbitrationDistillation: globalMemoryArbitrationDistillation,
                sync: {
                    indexFile: effectiveTypedMemorySync.index.file,
                    memoryDir: effectiveTypedMemorySync.index.dir,
                    docs: effectiveTypedMemorySync.index.docs.length,
                    lineCount: effectiveTypedMemorySync.index.lineCount,
                    bytes: effectiveTypedMemorySync.index.bytes,
                },
                globalClaudeMemoryImport,
                projectMemoryImport,
                loadPlan: effectiveTypedMemoryLoadPlan,
                targetPaths: typedMemoryTargetPaths,
                recall: effectiveTypedMemoryRecall,
                ledger: {
                    file: typedMemoryLedger.file,
                    alreadySurfaced: ledgerAlreadySurfaced.slice(-20),
                    recordedThisTurn: typedMemoryRecall.surfaced || [],
                },
            },
        },
        source_manifest: sourceManifest,
        memory_reload_audit: memoryReloadAudit,
        global_agent_memory: globalAgentMemoryRecall,
        global_memory_health_gate: globalAgentMemoryRecall?.memory_health_gate || null,
        global_memory_arbitration_ledger: effectiveGlobalMemoryArbitrationLedger,
        dispatch_freshness_gate: dispatchFreshnessGate,
        post_compact_reinjection_gate: postCompactReinjectionGate,
        post_compact_dispatch_marker: postCompactDispatchMarker,
        post_compact_candidate_usage: postCompactCandidateUsage,
        target_agent_memory: {
            ...agentMemory,
            recentReceipts: (agentMemory.recentReceipts || []).slice(-8),
            frequentFiles: (agentMemory.frequentFiles || []).slice(-12),
            verificationHints: (agentMemory.verificationHints || []).slice(-8),
            blockers: (agentMemory.blockers || []).slice(-8),
            needs: (agentMemory.needs || []).slice(-8),
        },
        related_work: {
            ownCompleted,
            otherCompleted,
            ownBlocked,
            globalBlocked,
            relatedLedger,
        },
        relevant_historical_evidence: relevantHistoricalEvidence,
        raw_sources: {
            group_memory_file: getGroupMemoryFile(groupId),
            group_messages_file: getGroupMessagesFileHint(groupId),
            group_typed_memory_index_file: effectiveTypedMemorySync.index.file,
            group_typed_memory_dir: effectiveTypedMemorySync.index.dir,
            group_typed_memory_distillation_ledger_file: typedLogDistillation.ledgerFile || "",
            group_typed_memory_recall_ledger_file: typedMemoryLedger.file || "",
            global_agent_memory_file: globalAgentMemoryRecall?.file || memory_1.GLOBAL_AGENT_MEMORY_FILE,
            group_global_memory_arbitration_ledger_file: Number(effectiveGlobalMemoryArbitrationLedger?.entryCount || 0) > 0
                ? (effectiveGlobalMemoryArbitrationLedger?.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId))
                : "",
            global_memory_cross_group_arbitration_dir: (Number(globalAgentMemoryRecall?.crossGroupSuppression?.suppressedCount || 0) > 0 || Number(globalAgentMemoryRecall?.crossGroupSuppression?.advisoryCount || 0) > 0)
                ? (globalAgentMemoryRecall?.crossGroupSuppression?.sourceDir || GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
                : "",
            group_memory_reload_ledger_file: memoryReloadAudit.ledgerFile || "",
            group_post_compact_dispatch_ledger_file: postCompactDispatchMarker?.ledger_file || getGroupPostCompactDispatchLedgerFile(groupId),
            group_post_compact_candidate_usage_ledger_file: postCompactCandidateUsage.ledger_file || getGroupPostCompactCandidateUsageLedgerFile(groupId),
            group_api_microcompact_native_apply_proof_ledger_file: apiMicrocompactNativeApplyProofLedger.ledger_file || getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId),
            group_api_microcompact_native_apply_request_telemetry_ledger_file: apiMicrocompactNativeApplyProofLedger.request_telemetry?.ledger_file || getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId),
            group_replay_repair_ledger_file: replayRepairLedger?.file || getGroupReplayRepairLedgerFile(groupId),
            group_replay_repair_work_items_file: replayRepairWorkItems?.file || getGroupReplayRepairWorkItemsFile(groupId),
            group_session_memory_snapshot_file: sessionMemorySnapshot?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
            group_session_memory_summary_file: sessionMemorySnapshot?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
            group_tool_continuity_snapshot_file: toolContinuitySnapshot?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
            group_tool_continuity_summary_file: toolContinuitySnapshot?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
            project_memory_root: projectMemoryRoot,
        },
    };
    bundle.compact_file_references = buildGroupCompactFileReferences(groupId, {
        generatedAt,
        sourceManifest,
        sessionMemory: sessionMemorySnapshot,
        toolContinuity: toolContinuitySnapshot,
        typedMemory: bundle.group_state?.typedMemory || {},
        rawSources: bundle.raw_sources || {},
    });
    bundle.compact_file_reference_read_plan = buildGroupCompactFileReferenceReadPlan(groupId, bundle.compact_file_references, {
        generatedAt,
        maxEntries: 10,
    });
    const historicalReadPlanRows = latestGroupCompactFileReferenceReadPlanRows(groupId, bundle.compact_file_reference_read_plan);
    const compactFileReferenceReadPlanForFreshness = {
        ...bundle.compact_file_reference_read_plan,
        entries: historicalReadPlanRows.rows,
        plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
        sourceReferenceCount: historicalReadPlanRows.rows.length,
    };
    bundle.compact_file_reference_read_plan_freshness = summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, compactFileReferenceReadPlanForFreshness);
    bundle.compact_file_reference_read_plan_revalidation_gate = buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId, bundle.compact_file_reference_read_plan_freshness, {
        generatedAt,
        targetProject: project,
        scope: `child:${project}`,
        sessionBinding,
    });
    recordGroupCompactFileReferenceSurfacing(groupId, bundle.compact_file_references, {
        generatedAt,
        scope: `child:${project}`,
        targetProject: project,
        task,
        sessionBinding,
        readPlan: bundle.compact_file_reference_read_plan,
        readPlanRevalidationGate: bundle.compact_file_reference_read_plan_revalidation_gate,
    });
    bundle.compact_file_reference_read_plan_access = summarizeGroupCompactFileReferenceReadPlanAccess(groupId, bundle.compact_file_reference_read_plan, memory);
    bundle.compact_file_reference_access = summarizeGroupCompactFileReferenceAccess(groupId, bundle.compact_file_references, memory);
    const renderedWithReferences = renderGroupMemoryContextBundle(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: renderedWithReferences, maxChars: 36_000, maxTokens: 90_000 });
    bundle.rendered_text = compactPreserveLines(renderedWithReferences, Number(options.maxRenderedChars || 14_000));
    return bundle;
}
function renderGroupMemoryContextBundle(bundle) {
    if (!bundle)
        return "";
    if (typeof bundle === "string")
        return bundle;
    const agentMemory = bundle.target_agent_memory || {};
    const groupState = bundle.group_state || {};
    const compaction = bundle.compaction || {};
    const related = bundle.related_work || {};
    const typedMemory = groupState.typedMemory || {};
    const globalAgentMemory = bundle.global_agent_memory || bundle.globalAgentMemory || {};
    const globalMemoryHealthGate = bundle.global_memory_health_gate || bundle.globalMemoryHealthGate || globalAgentMemory.memory_health_gate || globalAgentMemory.memoryHealthGate || {};
    const globalMemoryArbitrationLedger = bundle.global_memory_arbitration_ledger || bundle.globalMemoryArbitrationLedger || {};
    const sessionBinding = bundle.session_binding || bundle.sessionBinding || {};
    const sourceManifest = bundle.source_manifest || {};
    const reloadAudit = bundle.memory_reload_audit || {};
    const dispatchGate = bundle.dispatch_freshness_gate || {};
    const reinjectionGate = bundle.post_compact_reinjection_gate || {};
    const postCompactDispatchMarker = bundle.post_compact_dispatch_marker || bundle.postCompactDispatchMarker || {};
    const postCompactCandidateUsage = bundle.post_compact_candidate_usage || bundle.postCompactCandidateUsage || {};
    const replayRepairPlan = bundle.replay_repair_plan || bundle.replayRepairPlan || compaction.replayRepairPlan || compaction.replay_repair_plan || {};
    const replayRepairLedger = bundle.replay_repair_ledger || bundle.replayRepairLedger || compaction.replayRepairLedger || compaction.replay_repair_ledger || {};
    const replayRepairWorkItems = bundle.replay_repair_work_items || bundle.replayRepairWorkItems || compaction.replayRepairWorkItems || compaction.replay_repair_work_items || {};
    const replayRepairDispatchCandidates = bundle.replay_repair_dispatch_candidates || bundle.replayRepairDispatchCandidates || compaction.replayRepairDispatchCandidates || compaction.replay_repair_dispatch_candidates || {};
    const sessionMemory = bundle.session_memory || bundle.sessionMemory || compaction.sessionMemory || compaction.session_memory || {};
    const toolContinuity = bundle.tool_continuity || bundle.toolContinuity || compaction.toolContinuity || compaction.tool_continuity || {};
    const compactStrategyDecision = compaction.compactStrategyDecision
        || compaction.compact_strategy_decision
        || compaction.boundary?.compactStrategyDecision
        || compaction.boundary?.post_compact_restore?.strategyDecision
        || {};
    const apiMicroCompactEditPlan = compaction.apiMicroCompactEditPlan
        || compaction.api_microcompact_edit_plan
        || compaction.boundary?.apiMicroCompactEditPlan
        || compaction.boundary?.post_compact_restore?.apiMicroCompactEditPlan
        || {};
    const apiMicrocompactNativeApplyPlan = compaction.apiMicrocompactNativeApplyPlan
        || compaction.api_microcompact_native_apply_plan
        || apiMicroCompactEditPlan.nativeApplyPlan
        || apiMicroCompactEditPlan.native_apply_plan
        || {};
    const apiMicrocompactNativeApplyProofLedger = compaction.apiMicrocompactNativeApplyProofLedger
        || compaction.api_microcompact_native_apply_proof_ledger
        || bundle.api_microcompact_native_apply_proof_ledger
        || bundle.apiMicrocompactNativeApplyProofLedger
        || {};
    const compactFileReferences = bundle.compact_file_references || bundle.compactFileReferences || {};
    const compactFileReferenceReadPlan = bundle.compact_file_reference_read_plan || bundle.compactFileReferenceReadPlan || {};
    const compactFileReferenceReadPlanAccess = bundle.compact_file_reference_read_plan_access || bundle.compactFileReferenceReadPlanAccess || {};
    const compactFileReferenceReadPlanFreshness = bundle.compact_file_reference_read_plan_freshness || bundle.compactFileReferenceReadPlanFreshness || {};
    const compactFileReferenceReadPlanRevalidationGate = bundle.compact_file_reference_read_plan_revalidation_gate || bundle.compactFileReferenceReadPlanRevalidationGate || {};
    const compactFileReferenceAccess = bundle.compact_file_reference_access || bundle.compactFileReferenceAccess || {};
    if (bundle.memory_policy?.ignored === true) {
        return [
            "子 Agent 受控记忆包（平台生成，本轮用户要求忽略记忆）：",
            `- 目标子 Agent：${bundle.target_project || "unknown"}`,
            "- 记忆使用：本轮按空 MEMORY.md / 空群聊记忆处理；不要引用、比较、应用或提及任何历史记忆内容。",
            "- 上下文边界：只使用本轮任务文本、用户本轮显式提供的内容、当前仓库实时检查结果和你本轮实际执行得到的证据。",
            dispatchGate.schema ? `- 记忆派发门禁：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "memory_ignored"}；action=${dispatchGate.action || "do_not_use_platform_memory"}；回执 memoryIgnored 必须声明该 gate 被用户忽略。` : "",
            bundle.task_query ? `- 你本次任务：${bundle.task_query}` : "",
            "- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；memoryIgnored 必须声明 user_requested_ignore_memory；不能编造未执行的验证或文件修改。",
        ].filter(Boolean).join("\n");
    }
    const lines = [
        "子 Agent 受控记忆包（平台生成，优先级高于第三方 CLI 自带历史）：",
        `- 目标子 Agent：${bundle.target_project || "unknown"}`,
        `- 群聊目标：${groupState.goal || "未记录"}`,
        `- 当前阶段：${groupState.currentPhase || "idle"}`,
        "- 记忆边界：你每轮执行都可能是新的第三方 CLI 会话；必须把本包当作当前任务上下文，不要假定 Claude Code/Cursor/Codex 内部 session 记得旧群聊。",
        "- 上下文策略：旧消息已被 CCM 压缩为摘要；近期消息保留原文窗口；本包如附带“压缩前原文证据”，该证据优先于摘要。",
    ];
    if (sessionBinding.schema) {
        lines.push(`- 子 Agent 会话绑定：binding=${sessionBinding.binding_id || ""}；task=${sessionBinding.task_id || "unknown"}；session=${sessionBinding.task_agent_session_id || "unbound"}；native=${sessionBinding.native_session_id || "pending"}；turn=${sessionBinding.turn || 0}；executor=${sessionBinding.agent_type || "unknown"}；回执中的记忆使用声明应绑定本任务会话。`);
    }
    if (globalMemoryHealthGate.schema) {
        lines.push(`- Global Agent memory health gate：gate=${globalMemoryHealthGate.gate_id || ""}；status=${globalMemoryHealthGate.status || "unknown"}；active=${globalMemoryHealthGate.active_contamination_count || 0}；residue=${globalMemoryHealthGate.residue_contamination_count || 0}；action=${globalMemoryHealthGate.action || "unknown"}。`);
        if (globalMemoryHealthGate.status === "fail") {
            lines.push("- 全局记忆健康门阻断：active Global Agent memory 含自测污染或扫描失败；本轮不得使用 global_agent_memory 内容，只能使用当前群聊记忆、typed MEMORY.md、当前任务文本和实时仓库检查。回执 memoryIgnored 必须引用该 gate。");
        }
        else if (globalMemoryHealthGate.status === "warn") {
            lines.push("- 全局记忆健康门提示：active Global Agent memory 干净，但目录仍有历史自测残留；可使用 active 记忆，涉及文件/状态/授权时仍必须读取当前源并在 globalMemoryUsage 说明核验。");
        }
        else {
            lines.push("- 全局记忆健康门通过：active Global Agent memory 未发现自测污染；仍按历史上下文处理，当前源优先。");
        }
    }
    if (globalAgentMemory.schema && Number(globalAgentMemory.itemCount || 0) > 0) {
        const arbitration = globalAgentMemory.arbitration || {};
        const crossGroupSuppression = globalAgentMemory.crossGroupSuppression || {};
        lines.push(`- 全局 Agent 长期记忆召回：${globalAgentMemory.itemCount || 0} 条；source=${globalAgentMemory.file || "global-agent-memory"}；arbitration=${arbitration.status || "unknown"}；demoted=${arbitration.demotedCount || 0}；conflict=${arbitration.conflictCount || 0}；cross_group_suppressed=${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0}；这些是跨群聊/跨会话约束或历史结论，只能作为当前任务上下文，涉及文件、任务状态、授权边界时必须读取当前真实状态复核。`);
        if (Number(arbitration.demotedCount || 0) > 0 || Number(arbitration.conflictCount || 0) > 0) {
            lines.push("- 全局记忆仲裁规则：如果下方 global_memory_id 标记为 demoted/conflict，必须以本群聊更新证据或 typed MEMORY.md 为准；该全局记忆只作背景线索，不能直接应用。");
        }
        lines.push("- 全局记忆回执规则：回复 CCM_AGENT_RECEIPT 时必须填写 globalMemoryUsage，逐条声明本轮看到的 global_memory_id 是 used / ignored / verified / background / advisory；带 semantic_risk、demoted/conflict 或 cross_group_suppression 的记忆若被使用，必须声明 currentSourceVerified=true 和 semanticRiskAcknowledged/crossGroupSuppression。");
        if (Number(arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0) > 0) {
            lines.push(`- 跨群聊全局记忆抑制：${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0} 条全局记忆已在其他群聊仲裁账本中被降权/冲突；source=${crossGroupSuppression.sourceDir || "group-global-memory-arbitration"}；这些条目只能作为 background，必须按当前群聊证据、typed MEMORY.md 和实时仓库状态复核后再行动。`);
        }
        if (Number(crossGroupSuppression.advisoryCount || 0) > 0) {
            lines.push(`- 跨群聊抑制新鲜度：${crossGroupSuppression.advisoryCount || 0} 条跨群聊抑制已降级为 advisory；superseded=${crossGroupSuppression.supersededCount || 0}；decayed=${crossGroupSuppression.decayedCount || 0}；新 Global Agent 记忆或过旧 ledger 不应继续阻断当前上下文，但仍可作为排查线索。`);
        }
        if (globalAgentMemory.boundary?.archiveId) {
            const boundary = globalAgentMemory.boundary || {};
            const budget = boundary.context_budget || {};
            lines.push(`  - 全局记忆压缩边界：archive=${boundary.archiveId || ""}；recent=${boundary.preservedMessageCount || 0}；pressure=${budget.pressure ?? "unknown"}%。`);
        }
        for (const item of Array.isArray(globalAgentMemory.items) ? globalAgentMemory.items.slice(0, 5) : []) {
            const source = item.source || {};
            const itemArbitration = item.arbitration || {};
            const cross = item.crossGroupSuppression || itemArbitration.crossGroupSuppression || {};
            const messageIds = Array.isArray(source.messageIds) && source.messageIds.length ? `；messages=${source.messageIds.join(",")}` : "";
            const mission = source.missionId ? `；mission=${source.missionId}` : "";
            const semanticRisk = itemArbitration.semanticRisk || {};
            const semanticRiskText = Number(itemArbitration.semanticRiskScore || semanticRisk.score || 0) > 0
                ? ` semantic_risk=${itemArbitration.semanticRiskScore || semanticRisk.score};semantic=${semanticRisk.level || "unknown"};reasons=${(itemArbitration.semanticReasons || semanticRisk.reasons || []).slice(0, 4).join(",")}`
                : "";
            lines.push(`  - global_memory_id=${item.id || ""}；[${item.type || "memory"} score ${item.score ?? "?"} ${itemArbitration.status || "active"}${semanticRiskText}] ${item.text || ""}${item.howToApply ? `；apply=${item.howToApply}` : ""}；session=${source.sessionId || ""}${mission}${messageIds}`);
            if (cross.suppressed === true) {
                lines.push(`    - cross_group_suppression=background_only；groups=${cross.groupCount || 0}；conflict_groups=${cross.conflictGroupCount || 0}；occurrences=${cross.totalOccurrenceCount || 0}；action=${cross.action || "verify_current_group_before_use"}`);
            }
            else if (cross.advisory === true) {
                const freshness = cross.freshness || {};
                lines.push(`    - cross_group_suppression=advisory；reason=${cross.reason || ""}；superseded=${freshness.supersededByNewerGlobalMemory === true}；decayed=${freshness.decayedToAdvisory === true}；global_updated=${freshness.globalUpdatedAt || ""}；latest_cross_group_evidence=${freshness.latestEvidenceAt || ""}`);
            }
            for (const evidence of Array.isArray(itemArbitration.decisiveEvidence) ? itemArbitration.decisiveEvidence.slice(0, 2) : []) {
                const evidenceLabel = String(evidence.source || "").startsWith("cross_group") ? "cross_group_evidence" : "local_evidence";
                const evidenceSemantic = Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0) > 0
                    ? `；semantic_risk=${evidence.semanticRiskScore || evidence.semanticRisk?.score}；semantic_reasons=${(evidence.semanticReasons || evidence.semanticRisk?.reasons || []).slice(0, 4).join(",")}`
                    : "";
                lines.push(`    - ${evidenceLabel}=${evidence.source || "group"}${evidence.messageId ? `#${evidence.messageId}` : ""}；${evidence.conflict ? "conflict" : "newer"}${evidenceSemantic}；${evidence.text || ""}`);
            }
        }
    }
    if (globalMemoryArbitrationLedger.schema && Number(globalMemoryArbitrationLedger.entryCount || 0) > 0) {
        lines.push(`- 全局/群聊记忆仲裁账本：file=${globalMemoryArbitrationLedger.file || ""}；entries=${globalMemoryArbitrationLedger.entryCount || 0}；conflicts=${globalMemoryArbitrationLedger.conflictCount || 0}；repeated=${globalMemoryArbitrationLedger.repeatedConflictCount || 0}；若本轮任务涉及被降权全局记忆，应以本群聊证据和 typed MEMORY.md 为准，并可将重复冲突蒸馏为 typed memory。`);
    }
    if (typedMemory.arbitrationDistillation?.schema && typedMemory.arbitrationDistillation.skipped !== true) {
        const write = typedMemory.arbitrationDistillation.write || {};
        lines.push(`- 全局记忆仲裁蒸馏：candidate=${typedMemory.arbitrationDistillation.candidateCount || 0}；typed=${write.file || "typed-memory"}；changed=${write.changed === true}；重复全局冲突已沉淀为 typed MEMORY.md，后续子 Agent 应优先按该本群聊规则召回。`);
    }
    if (compaction.compactedMessageCount) {
        lines.push(`- 压缩边界：已压缩 ${compaction.compactedMessageCount} 条，保留近期 ${compaction.preservedRecentMessages || 0} 条；策略 ${compaction.strategy || "unknown"}；健康状态 ${compaction.health || "unknown"}。`);
        if (compaction.lastCompactedMessageId)
            lines.push(`- 最近压缩至 message id：${compaction.lastCompactedMessageId}${compaction.summaryChecksum ? `；摘要校验 ${compaction.summaryChecksum}` : ""}`);
    }
    if (compaction.boundary?.preservedSegment?.schema) {
        const segment = compaction.boundary.preservedSegment;
        lines.push(`- CC 风格保留窗口：preservedSegment 保留 ${segment.preservedMessageCount || 0} 条原文、约 ${segment.preservedTokenEstimate || 0} tokens、${segment.preservedTextBlockMessageCount || 0} 条文本消息；首尾 ${segment.firstPreservedMessageId || "unknown"} -> ${segment.lastPreservedMessageId || "unknown"}。`);
    }
    if (compaction.boundaryHistory?.schema) {
        const history = compaction.boundaryHistory;
        const latest = history.latest || {};
        lines.push(`- 历史压缩边界：保留 ${history.boundaryCount || 0} 个 compact boundaries；最新 ${latest.summaryChecksum || latest.summarizedThroughMessageId || latest.id || "unknown"}；历史边界用于 Memory Center 多边界 replay，必要时可按 raw messages 回溯旧摘要。`);
    }
    if (sessionMemory.schema) {
        lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；snapshot=${sessionMemory.snapshotFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；hasSummary=${sessionMemory.hasSummary !== false}。`);
        if (sessionMemory.markdownExcerpt) {
            lines.push(`  - Session Memory 摘要片段：${compactMemoryText(sessionMemory.markdownExcerpt, 620)}`);
        }
    }
    if (toolContinuity.schema) {
        const allowed = toolContinuity.allowedTools || {};
        const requested = toolContinuity.requested || {};
        const synced = toolContinuity.synced || {};
        const missing = toolContinuity.missing || {};
        lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；snapshot=${toolContinuity.snapshotFile || "未记录"}；status=${toolContinuity.status || "empty"}；allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}；requested MCP ${(requested.mcp || []).length}/Skill ${(requested.skill || []).length}；synced MCP ${(synced.mcp || []).length}/Skill ${(synced.skill || []).length}；missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}。`);
        lines.push("- 工具/技能连续性使用边界：这里只恢复上下文和上次运行证据，不扩大授权；真实工具派发仍必须通过当前 runtime tool gate、MCP sync 和 authorization readiness。");
        if ((allowed.mcp || []).length || (allowed.skill || []).length) {
            lines.push(`  - 连续性工具线索：MCP ${(allowed.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(allowed.skill || []).slice(0, 8).join("、") || "无"}。`);
        }
        if (Array.isArray(toolContinuity.invokedSkills) && toolContinuity.invokedSkills.length) {
            lines.push(`  - 历史已调用 Skill：${toolContinuity.invokedSkills.slice(0, 8).map((item) => `${item.name || "unknown"}${item.contentHash ? `#${item.contentHash}` : ""}`).join("、")}`);
        }
        if ((missing.mcp || []).length || (missing.skill || []).length) {
            lines.push(`  - 工具缺口：MCP ${(missing.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(missing.skill || []).slice(0, 8).join("、") || "无"}；本轮不能假定缺失工具可用。`);
        }
    }
    if (compaction.childAgentTypes?.schema) {
        const types = compaction.childAgentTypes;
        lines.push(`- 子 Agent 类型矩阵：${types.agentTypeCount || 0} 类 / ${types.targetCount || 0} 个目标；Memory Center 会按 Claude Code / Cursor / Codex 等类型分别 replay，确保每种第三方新会话都收到群聊记忆上下文。`);
        for (const row of Array.isArray(types.rows) ? types.rows.slice(0, 5) : []) {
            lines.push(`  - ${row.agentType || "unknown"}：${row.targetCount || 0} 个目标（${(row.targets || []).slice(0, 4).map((item) => item.targetProject).filter(Boolean).join("、") || "unknown"}）`);
        }
    }
    if (compaction.contextPressureWarning?.schema) {
        const warning = compaction.contextPressureWarning;
        const thresholds = warning.thresholds || {};
        lines.push(`- 上下文压力预警：${warning.level || "unknown"}；使用约 ${warning.tokenUsage || 0} tokens，距 auto-compact 约 ${warning.percentLeft ?? "unknown"}%；建议 ${warning.recommendation || "continue"}；阈值 warning=${thresholds.warningThreshold || 0}, auto=${thresholds.autoCompactThreshold || 0}, blocking=${thresholds.blockingThreshold || 0}${warning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
    }
    if (sourceManifest.schema) {
        lines.push(`- 记忆源 manifest：${sourceManifest.status || "unknown"}；源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0} 个；最新源 ${sourceManifest.latestMtime || "unknown"}；manifest ${sourceManifest.manifestChecksum || ""}。`);
        if (Array.isArray(sourceManifest.missingRequired) && sourceManifest.missingRequired.length) {
            lines.push(`- 记忆源缺失：${sourceManifest.missingRequired.join("、")}；本轮必须按当前任务和实时检查补证据，不能假定缺失记忆存在。`);
        }
        if (Array.isArray(sourceManifest.changedAfterManifest) && sourceManifest.changedAfterManifest.length) {
            lines.push(`- 记忆源变化：${sourceManifest.changedAfterManifest.join("、")} 在 manifest 生成后变化；使用前需要重新读取对应源。`);
        }
    }
    if (compactFileReferences.schema && Array.isArray(compactFileReferences.references) && compactFileReferences.references.length) {
        lines.push(`- CC 风格 compact file references：${compactFileReferences.referenceCount || compactFileReferences.references.length} 个；missing=${compactFileReferences.missingCount || 0}；这些文件/目录在上次压缩或记忆构建前已作为上下文来源引用，但内容不会全部塞入本包。`);
        lines.push("- 文件引用使用规则：需要更多原文时，优先读取 raw_group_messages_json 或 typed MEMORY.md；读取前按当前任务判断相关性，读取后在回执 memoryUsed/memoryIgnored 中声明 reference_id 或路径。");
        for (const reference of compactFileReferences.references.slice(0, 10)) {
            lines.push(`  - reference_id=${reference.reference_id || ""}；${reference.type || "memory_source"}；${reference.displayPath || reference.path || ""}；exists=${reference.exists === true}；${reference.reason || ""}`);
        }
    }
    if (compactFileReferenceReadPlan.schema && Array.isArray(compactFileReferenceReadPlan.entries) && compactFileReferenceReadPlan.entries.length) {
        lines.push(`- compact file reference read plan：planned=${compactFileReferenceReadPlan.plannedCount || 0}/${compactFileReferenceReadPlan.sourceReferenceCount || 0}；sourceOfTruth=${compactFileReferenceReadPlan.hasSourceOfTruth === true}；summary=${compactFileReferenceReadPlan.hasCompactSummary === true}；mode=${compactFileReferenceReadPlan.policy?.mode || "read_on_demand"}。`);
        lines.push("- 读取计划规则：不要全量读取所有引用；只在当前任务需要更多原文、摘要冲突或需要核对 message id/typed MEMORY.md 时读取；读取或决定不读都要在 memoryUsed/memoryIgnored 引用 read_plan_id 或 reference_id。");
        for (const entry of compactFileReferenceReadPlan.entries.slice(0, 8)) {
            lines.push(`  - read_plan_id=${entry.read_plan_id || ""}；priority=${entry.priority || 0}；${entry.action || "read_if_needed"}；reference_id=${entry.reference_id || ""}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}；${entry.reason || ""}`);
        }
    }
    if (compactFileReferenceReadPlanAccess.schema) {
        lines.push(`- compact read plan access ledger：surfaced=${compactFileReferenceReadPlanAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceReadPlanAccess.mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；read_plan_id=${compactFileReferenceReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；ledger=${compactFileReferenceReadPlanAccess.ledger_file || "未记录"}。`);
    }
    if (compactFileReferenceReadPlanFreshness.schema) {
        lines.push(`- compact read plan source freshness：status=${compactFileReferenceReadPlanFreshness.status || "unknown"}；fresh=${compactFileReferenceReadPlanFreshness.freshCount || 0}/${compactFileReferenceReadPlanFreshness.checked || 0}；changed=${compactFileReferenceReadPlanFreshness.changedCount || 0}；unverifiable=${compactFileReferenceReadPlanFreshness.unverifiableCount || 0}。`);
        for (const row of Array.isArray(compactFileReferenceReadPlanFreshness.staleRows) ? compactFileReferenceReadPlanFreshness.staleRows.slice(0, 5) : []) {
            lines.push(`  - stale read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || "unknown"}；${row.path || ""}；使用前必须重新读取当前源并在 memoryUsed/memoryIgnored 声明。`);
        }
    }
    if (compactFileReferenceReadPlanRevalidationGate.schema && (Number(compactFileReferenceReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactFileReferenceReadPlanRevalidationGate.verification_count || 0) > 0)) {
        const gateSession = compactFileReferenceReadPlanRevalidationGate.session_binding || {};
        lines.push(`- compact read plan revalidation gate：gate=${compactFileReferenceReadPlanRevalidationGate.revalidation_gate_id || ""}；status=${compactFileReferenceReadPlanRevalidationGate.status || "unknown"}；required=${compactFileReferenceReadPlanRevalidationGate.required_count || 0}；verify=${compactFileReferenceReadPlanRevalidationGate.verification_count || 0}；session=${gateSession.task_agent_session_id || compactFileReferenceReadPlanRevalidationGate.task_agent_session_id || "unbound"}；action=${compactFileReferenceReadPlanRevalidationGate.action || "unknown"}。`);
        for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.required_entries) ? compactFileReferenceReadPlanRevalidationGate.required_entries.slice(0, 5) : []) {
            lines.push(`  - must re-read read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || row.freshness_status || "changed"}；${row.displayPath || row.path || ""}；使用任何旧摘要/记忆前先读取当前源，回执 memoryUsed/memoryIgnored 必须同时写 gate、read_plan_id 和 current source verified/re-read。`);
        }
        for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.verification_entries) ? compactFileReferenceReadPlanRevalidationGate.verification_entries.slice(0, 3) : []) {
            lines.push(`  - verify read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；fingerprint missing；${row.displayPath || row.path || ""}；使用前先核验当前源或在 memoryIgnored 说明不使用。`);
        }
    }
    if (compactFileReferenceAccess.schema) {
        lines.push(`- compact file reference access ledger：surfaced=${compactFileReferenceAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceAccess.mentioned_count || 0}/${compactFileReferenceAccess.reference_count || 0}；ledger=${compactFileReferenceAccess.ledger_file || "未记录"}；该指标用于 Memory Center 检查子 Agent 是否真的声明使用了压缩后文件引用。`);
    }
    if (reloadAudit.schema) {
        lines.push(`- 记忆 reload 审计：reason=${reloadAudit.reason || "unknown"}；action=${reloadAudit.cacheAction || "unknown"}；sourceChanged=${reloadAudit.sourceManifestChanged === true}；loadPlanChanged=${reloadAudit.loadPlanChanged === true}；scope=${reloadAudit.scope || "default"}。`);
        if (reloadAudit.sourceChangeTrigger?.triggered) {
            lines.push(`- 记忆源变更触发 reload：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}；ids=${(reloadAudit.sourceChangeTrigger.changedIds || []).slice(0, 6).join("、") || "unknown"}。`);
        }
    }
    if (dispatchGate.schema) {
        const gateSource = dispatchGate.source_manifest || {};
        const gateReload = dispatchGate.reload_audit || {};
        lines.push(`- 子 Agent 记忆派发新鲜度：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "unknown"}；action=${dispatchGate.action || "unknown"}；source=${gateSource.checksum || "unknown"}；reload=${gateReload.reason || "unknown"}；回执 memoryUsed/memoryIgnored 必须声明是否使用该 gate 的记忆包。`);
    }
    if (reinjectionGate.schema) {
        const audit = reinjectionGate.post_compact_recovery_audit || {};
        lines.push(`- 压缩后重注入门禁：gate=${reinjectionGate.reinjection_gate_id || ""}；status=${reinjectionGate.status || "required"}；候选 ${reinjectionGate.candidate_count || 0} 条；summary=${audit.summary_checksum || "unknown"}；回执 memoryUsed/memoryIgnored 必须引用该 gate，postCompactCandidateUsage 必须逐条声明每个候选 used / ignored / verified。`);
        for (const candidate of Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates.slice(0, 8) : []) {
            lines.push(`  - candidate_id=${candidate.candidate_id || ""}；${candidate.kind || "candidate"}：${candidate.value || ""}${candidate.sourceMessageId ? `（#${candidate.sourceMessageId}）` : ""}`);
        }
    }
    if (postCompactDispatchMarker.schema) {
        lines.push(`- 压缩后派发标记：marker=${postCompactDispatchMarker.marker_id || ""}；boundary=${postCompactDispatchMarker.boundary_id || ""}；sequence=${postCompactDispatchMarker.dispatch_sequence || 0}；first=${postCompactDispatchMarker.first_dispatch_after_compact === true}；summary=${postCompactDispatchMarker.summary_checksum || "unknown"}；这是对齐 Claude Code pendingPostCompaction 的群聊子 Agent 派发遥测。`);
        if (postCompactDispatchMarker.first_dispatch_after_compact === true) {
            lines.push("- 压缩后首次派发要求：本轮子 Agent 应把上方群聊记忆包视为压缩恢复后的第一跳上下文，优先核对重注入候选、摘要边界和近期原文窗口。");
        }
    }
    if (postCompactCandidateUsage.schema && postCompactCandidateUsage.has_history) {
        const totals = postCompactCandidateUsage.totals || {};
        lines.push(`- 压缩重注入候选使用账本：候选 ${postCompactCandidateUsage.candidate_count || 0} 条；used=${totals.used || 0} ignored=${totals.ignored || 0} verified=${totals.verified || 0} mentioned=${totals.mentioned || 0}；ledger=${postCompactCandidateUsage.ledger_file || "未记录"}。`);
        for (const row of Array.isArray(postCompactCandidateUsage.useful_candidates) ? postCompactCandidateUsage.useful_candidates.slice(0, 4) : []) {
            lines.push(`  - 历史有效候选 candidate_id=${row.candidate_id || ""}；${row.kind || "candidate"}：${row.value || ""}；used=${row.used_count || 0} verified=${row.verified_count || 0} ignored=${row.ignored_count || 0}；建议=${row.recommendation || "neutral_verify_current_context"}。`);
        }
        for (const row of Array.isArray(postCompactCandidateUsage.ignored_candidates) ? postCompactCandidateUsage.ignored_candidates.slice(0, 3) : []) {
            lines.push(`  - 历史多次忽略候选 candidate_id=${row.candidate_id || ""}；${row.value || ""}；ignored=${row.ignored_count || 0} used=${row.used_count || 0} verified=${row.verified_count || 0}；本轮仍需按当前任务核验，不要盲目采用。`);
        }
        if (Array.isArray(postCompactCandidateUsage.missing_usage_candidates) && postCompactCandidateUsage.missing_usage_candidates.length) {
            lines.push(`  - 历史缺使用状态候选：${postCompactCandidateUsage.missing_usage_candidates.slice(0, 4).map((row) => row.candidate_id || row.value).filter(Boolean).join("、")}；本轮回执必须明确 used / ignored / verified。`);
        }
    }
    if (compaction.postCompactRecoveryAudit?.schema) {
        const audit = compaction.postCompactRecoveryAudit;
        const failed = Array.isArray(audit.failedChecks) ? audit.failedChecks : [];
        const candidates = audit.candidateCounts || {};
        const candidateCount = Number(candidates.files || 0) + Number(candidates.skills || 0) + Number(candidates.verification || 0) + Number(candidates.blockers || 0);
        lines.push(`- 压缩后恢复审计：${audit.status || "unknown"}；通过 ${audit.passedChecks || 0}/${audit.checkCount || 0}；重注入候选 ${candidateCount} 条；raw transcript ${audit.transcriptPath || "未记录"}；动作 ${audit.action || "unknown"}。`);
        if (failed.length)
            lines.push(`- 压缩后恢复风险：${failed.slice(0, 5).join("、")}；需要优先按 raw transcript / typed MEMORY.md 回溯后再执行。`);
    }
    if (compaction.postCompactCleanupAudit?.schema) {
        const cleanup = compaction.postCompactCleanupAudit;
        const failed = Array.isArray(cleanup.failedChecks) ? cleanup.failedChecks : [];
        lines.push(`- 压缩后清理审计：${cleanup.status || "unknown"}；通过 ${cleanup.passedChecks || 0}/${cleanup.checkCount || 0}；mode=${cleanup.mode || "unknown"}；动作 ${cleanup.action || "unknown"}。`);
        lines.push(`- 清理边界：派生 microcompact/context packet 状态必须重建；invoked skills/tool continuity 不清除；candidate/replay/hook ledger 保留；raw=${cleanup.transcriptPath || "未记录"}。`);
        if (failed.length)
            lines.push(`- 压缩后清理风险：${failed.slice(0, 5).join("、")}；本轮子 Agent 需要先按 source manifest / raw transcript / typed MEMORY.md 重建上下文。`);
    }
    if (apiMicroCompactEditPlan.schema) {
        const counts = apiMicroCompactEditPlan.signalCounts || {};
        lines.push(`- API microcompact edit plan：planChecksum=${apiMicroCompactEditPlan.planChecksum || ""}；edits=${apiMicroCompactEditPlan.editCount || 0}；advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}；tokens=${apiMicroCompactEditPlan.activeTokens || 0}/${apiMicroCompactEditPlan.trigger?.value || apiMicroCompactEditPlan.maxInputTokens || 0}；thinking=${counts.thinkingBlocks || 0}；tool_use=${counts.toolUses || 0}；tool_result=${counts.toolResults || 0}。`);
        if (apiMicroCompactEditPlan.editCount > 0) {
            lines.push("- 支持 native API context management 的子 Agent 执行器可按该计划清理旧 thinking/tool result；不支持时只作为上下文压力提示，不得删除 CCM 群聊原文或 typed MEMORY.md。");
            lines.push("- API microcompact 回执规则：CCM_AGENT_RECEIPT.apiMicrocompactUsage 或 memoryUsed/memoryIgnored 必须引用 planChecksum，并声明 usageState=native_applied/advisory/ignored/not_supported；apiMicrocompactUsage 应绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；第三方 CLI 未实际调用 native API context-management 时不得写 native_applied。");
        }
    }
    if (apiMicrocompactNativeApplyPlan.schema) {
        const executor = apiMicrocompactNativeApplyPlan.executor || {};
        lines.push(`- API microcompact native apply：mode=${apiMicrocompactNativeApplyPlan.mode || "advisory_only"}；ready=${apiMicrocompactNativeApplyPlan.nativeApplyReady === true}；executor=${executor.agentType || "unknown"}/${executor.transport || "unknown"}；applyPlan=${apiMicrocompactNativeApplyPlan.applyPlanChecksum || ""}；session=${apiMicrocompactNativeApplyPlan.task_agent_session_id || "unbound"}。`);
        if (apiMicrocompactNativeApplyPlan.nativeApplyReady === true) {
            lines.push(`- Native request adapter 已就绪：把 requestPatch.body.context_management 合并到 provider API 请求，并携带 beta=${apiMicrocompactNativeApplyPlan.capability?.requiredBetaHeader || "context-management-2025-06-27"}；只有真实合并并发出请求后，回执才能声明 native_applied。`);
            lines.push("- Native apply 强证明规则：native_applied 还必须绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId，并在存在 runnerRequestId/externalRunnerRequestId 时能回查 execution.externalRunnerRequestIds；缺 session/snapshot/dispatch 绑定只能算弱证据。");
        }
        else {
            lines.push(`- Native apply 未就绪：${apiMicrocompactNativeApplyPlan.reason || "executor does not expose provider request body"}；本轮只能声明 advisory/ignored/not_supported，不能声称 native_applied。`);
        }
    }
    if (apiMicrocompactNativeApplyProofLedger.schema && apiMicrocompactNativeApplyProofLedger.has_history) {
        const totals = apiMicrocompactNativeApplyProofLedger.totals || {};
        const telemetry = apiMicrocompactNativeApplyProofLedger.request_telemetry || {};
        lines.push(`- API microcompact native apply proof ledger：status=${apiMicrocompactNativeApplyProofLedger.status || "unknown"}；verified=${totals.verified || 0} failed=${totals.failed || 0} advisory=${totals.advisory || 0} not_supported=${totals.not_supported || 0}；coverage=${apiMicrocompactNativeApplyProofLedger.proof_coverage_rate ?? "n/a"}%；telemetry strong=${telemetry.strong_verified_count || 0} matched=${telemetry.matched_verified_count || 0} adapter=${telemetry.adapter_matched_verified_count || 0} receipt=${telemetry.receipt_matched_verified_count || 0} receiptOnly=${telemetry.receipt_only_verified_count || 0} missing=${telemetry.missing_verified_count || 0} stale=${telemetry.stale_verified_count || 0} sessionBound=${telemetry.session_bound_verified_count || telemetry.session_bound_count || 0} dispatchBound=${telemetry.dispatch_bound_verified_count || telemetry.dispatch_bound_count || 0} runnerBound=${telemetry.runner_bound_verified_count || telemetry.runner_bound_count || 0}；ledger=${apiMicrocompactNativeApplyProofLedger.ledger_file || "未记录"}；requestTelemetry=${telemetry.ledger_file || "未记录"}。`);
        for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.verified_entries) ? apiMicrocompactNativeApplyProofLedger.verified_entries.slice(0, 3) : []) {
            lines.push(`  - verified native_applied plan=${row.plan_checksum || ""}；requestPatch=${row.request_patch_checksum || row.receipt_request_patch_checksum || ""}；session=${row.task_agent_session_id || "unbound"}；snapshot=${row.memory_context_snapshot_id || "unknown"}；requestTelemetry=${row.request_telemetry_status || "unknown"}；该证明只说明历史 provider request 已带 context_management，本轮仍需按当前执行器真实发送情况重新落账。`);
        }
        for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.failed_entries) ? apiMicrocompactNativeApplyProofLedger.failed_entries.slice(0, 3) : []) {
            lines.push(`  - failed native_applied proof plan=${row.plan_checksum || ""}；requestPatch=${row.receipt_request_patch_checksum || row.request_patch_checksum || "missing"}；session=${row.receipt_task_agent_session_id || row.task_agent_session_id || "unbound"}；reason=${row.reason || "checksum/session/snapshot mismatch"}；不得把这类回执当作强 native apply 证明。`);
        }
    }
    if (compactStrategyDecision.schema) {
        const invariants = compactStrategyDecision.invariants || {};
        const failedInvariants = Object.entries(invariants)
            .filter(([, value]) => typeof value === "boolean" && value === false)
            .map(([key]) => key);
        lines.push(`- 压缩策略决策：mode=${compactStrategyDecision.mode || "unknown"}；summary=${compactStrategyDecision.summaryChecksum || "none"}；窗口 ${compactStrategyDecision.messagesToSummarize || 0} 条压缩 / ${compactStrategyDecision.keptMessages || 0} 条保留；token ${compactStrategyDecision.preCompactTokenCount || 0} -> ${compactStrategyDecision.postCompactTokenEstimate || 0}；原因 ${compactStrategyDecision.reason || "未记录"}。`);
        if (compactStrategyDecision.transcriptPath)
            lines.push(`- 压缩策略原文恢复：raw transcript=${compactStrategyDecision.transcriptPath}；如摘要与当前任务冲突，按 message id 回溯原文。`);
        if (failedInvariants.length) {
            lines.push(`- 压缩策略风险：${failedInvariants.slice(0, 5).join("、")} 未通过；执行前优先读取 raw transcript / 近期窗口核验。`);
        }
        else if (compactStrategyDecision.invariantPass === true) {
            lines.push("- 压缩策略 invariants：任务事务、工具结果对/思考块边界和保留窗口检查通过。");
        }
    }
    if (replayRepairPlan.schema && Number(replayRepairPlan.requiredActionCount || 0) > 0) {
        lines.push(`- Replay Gate 修复计划：status=${replayRepairPlan.status || "unknown"}；action=${replayRepairPlan.action || "unknown"}；待修复 ${replayRepairPlan.requiredActionCount || 0} 项；score=${replayRepairPlan.sourceReplay?.score ?? "unknown"}；下一轮执行前必须先补齐缺失记忆包字段并重新 replay。`);
        for (const action of Array.isArray(replayRepairPlan.actions) ? replayRepairPlan.actions.slice(0, 5) : []) {
            lines.push(`  - repair ${action.priority || "medium"}:${action.component || "replay"}；${action.title || "修复 replay 缺口"}；${action.instruction || ""}${action.expected ? `；expected=${action.expected}` : ""}`);
        }
    }
    if (replayRepairLedger.schema && Number(replayRepairLedger.attemptCount || 0) > 0) {
        lines.push(`- Replay Gate attempt ledger：attempts=${replayRepairLedger.attemptCount || 0}；openActions=${replayRepairLedger.openActionCount || 0}；latest=${replayRepairLedger.latestStatus || "unknown"}/${replayRepairLedger.latestScore ?? "unknown"}；ledger=${replayRepairLedger.file || "未记录"}。`);
        for (const attempt of Array.isArray(replayRepairLedger.recentAttempts) ? replayRepairLedger.recentAttempts.slice(0, 3) : []) {
            lines.push(`  - attempt ${attempt.status || "unknown"} score=${attempt.score ?? "unknown"} target=${attempt.target_project || "unknown"} actions=${attempt.required_action_count || 0} hash=${attempt.rendered_hash || attempt.attempt_id || ""}`);
        }
    }
    if (replayRepairWorkItems.schema && Number(replayRepairWorkItems.total || 0) > 0) {
        lines.push(`- Replay Repair pending work：open=${replayRepairWorkItems.openItemCount || 0}；pending=${replayRepairWorkItems.pendingCount || 0}；inProgress=${replayRepairWorkItems.inProgressCount || 0}；completed=${replayRepairWorkItems.completedCount || 0}；owner=group-main-agent；ledger=${replayRepairWorkItems.file || "未记录"}。`);
        for (const item of Array.isArray(replayRepairWorkItems.openItems) ? replayRepairWorkItems.openItems.slice(0, 5) : []) {
            const nativeProofBinding = [
                item.request_patch_checksum ? `request=${item.request_patch_checksum}` : "",
                item.request_telemetry_session_status ? `session=${item.request_telemetry_session_status}` : "",
                item.request_telemetry_dispatch_status ? `dispatch=${item.request_telemetry_dispatch_status}` : "",
                item.runner_request_id ? `runner=${item.runner_request_id}` : "",
            ].filter(Boolean).join("；");
            lines.push(`  - work ${item.priority || "medium"}:${item.component || "replay"}；${item.subject || "修复 replay 缺口"}；target=${item.repair_target || item.target_project || item.target || "memory-context"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；${item.instruction || ""}${item.expected ? `；expected=${item.expected}` : ""}`);
        }
    }
    if (replayRepairDispatchCandidates.schema && Number(replayRepairDispatchCandidates.candidateCount || 0) > 0) {
        lines.push(`- Main Agent replay repair dispatch candidates：候选 ${replayRepairDispatchCandidates.candidateCount || 0} 条；ready=${replayRepairDispatchCandidates.readyCount || 0}；dispatchMarked=${replayRepairDispatchCandidates.dispatchMarkedCount || 0}；shouldCreateRealTask=false；ledger=${replayRepairDispatchCandidates.file || "未记录"}。`);
        lines.push("  - 这些候选只说明主 Agent 可将 replay 修复整理成后续工作单；子 Agent 只有在本轮任务明确要求时才执行，不得自行创建额外任务。");
        for (const candidate of Array.isArray(replayRepairDispatchCandidates.candidates) ? replayRepairDispatchCandidates.candidates.slice(0, 5) : []) {
            const targetMatches = !candidate.targetProject || candidate.targetProject === bundle.target_project || candidate.dispatch_target === bundle.target_project;
            const nativeProofBinding = [
                candidate.proof_entry_id ? `proof=${candidate.proof_entry_id}` : "",
                candidate.request_patch_checksum ? `request=${candidate.request_patch_checksum}` : "",
                candidate.worker_context_packet_id ? `packet=${candidate.worker_context_packet_id}` : "",
                candidate.worker_context_packet_binding_id ? `packetBinding=${candidate.worker_context_packet_binding_id}` : "",
                candidate.worker_context_packet_memory_policy_reason ? `memoryPolicy=${candidate.worker_context_packet_memory_policy_reason}` : "",
                candidate.request_telemetry_source ? `source=${candidate.request_telemetry_source}` : "",
                candidate.request_telemetry_session_status ? `session=${candidate.request_telemetry_session_status}` : "",
                candidate.request_telemetry_dispatch_status ? `dispatch=${candidate.request_telemetry_dispatch_status}` : "",
                candidate.runner_request_id ? `runner=${candidate.runner_request_id}` : "",
            ].filter(Boolean).join("；");
            lines.push(`  - candidate=${candidate.candidate_id || ""}；${candidate.priority || "medium"}:${candidate.component || "replay"}；target=${candidate.dispatch_target || candidate.targetProject || candidate.repair_target || "memory-context"}${targetMatches ? "" : "（非本 Agent 目标，仅供主 Agent 协调参考）"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；action=${candidate.recommendedAction || "review"}；${candidate.instruction || candidate.expected || ""}`);
        }
    }
    if (compaction.hookLedger?.schema) {
        const hookLedger = compaction.hookLedger;
        const stats = hookLedger.stats || {};
        const pre = stats.pre || {};
        const post = stats.post || {};
        lines.push(`- 压缩 Hook Ledger：run=${hookLedger.hookRunId || "unknown"}；pre ${pre.ok || 0}/${pre.total || 0}；post ${post.ok || 0}/${post.total || 0}；failed=${stats.failed || 0}；ledger=${hookLedger.file || "未记录"}。`);
        for (const entry of Array.isArray(hookLedger.recentEntries) ? hookLedger.recentEntries.slice(-4) : []) {
            const summary = entry.result_summary || entry.resultSummary || {};
            const keys = Array.isArray(summary.keys) ? summary.keys.slice(0, 5).join(",") : "";
            const phase = entry.phase || "hook";
            const status = entry.ok === false || entry.status === "fail" ? "fail" : "ok";
            lines.push(`  - hook ${phase} ${status}；${entry.duration_ms || entry.durationMs || 0}ms${keys ? `；keys=${keys}` : ""}${entry.error ? `；error=${entry.error}` : ""}`);
        }
    }
    if (compaction.quality || compaction.qualityStatus || compaction.driftDetected || compaction.downgradedByQualityGate) {
        const rawScore = Number(compaction.qualityScore ?? compaction.quality?.score);
        const score = Number.isFinite(rawScore) ? `${rawScore}` : "未评分";
        const drift = compaction.driftDetected ? "发现漂移" : "未发现漂移";
        const downgrade = compaction.downgradedByQualityGate ? `；已降级：${compaction.qualityDowngradeReason || "quality_gate_failed"}` : "";
        lines.push(`- 记忆质量：${score}/${compaction.qualityStatus || "unknown"}；${drift}${downgrade}。`);
    }
    if (compaction.microCompact?.recordCount || compaction.microCompact?.compactedMessageCount) {
        lines.push(`- 局部压缩：micro-compact 记录 ${compaction.microCompact.recordCount || 0} 条，实际压缩 ${compaction.microCompact.compactedMessageCount || 0} 条，释放约 ${compaction.microCompact.tokensFreed || 0} tokens；原文仍在群聊消息 JSON，可按 message id 回溯。`);
        if (compaction.microCompact.timeBased?.triggered) {
            const timeBased = compaction.microCompact.timeBased;
            lines.push(`- 时间触发 micro-compact：距离最近 Agent 输出 ${timeBased.gapMinutes || 0} 分钟，超过阈值 ${timeBased.gapThresholdMinutes || 0} 分钟；清理旧输出 ${timeBased.clearedCount || 0} 条，保留最近 ${timeBased.keptCount || timeBased.keepRecent || 0} 条。`);
        }
    }
    if (compaction.partialCompact?.requested) {
        const state = compaction.partialCompact.enabled ? "已启用" : "已跳过";
        lines.push(`- 选择性压缩：partial compact ${state}；方向 ${compaction.partialCompact.direction || "unknown"}；边界 ${compaction.partialCompact.summarizedThroughMessageId || compaction.partialCompact.selectedMessageId || "未命中"}；后续原文仍保留。`);
    }
    if (Array.isArray(compaction.partialSegments) && compaction.partialSegments.length) {
        lines.push(`- 选择性压缩 sidecar：已记录 ${compaction.partialSegments.length} 个中段/后段摘要；这些摘要不推进主压缩边界，原文仍可按 message id 回溯。`);
        for (const segment of compaction.partialSegments.slice(-3)) {
            const range = segment.range || {};
            const quality = segment.quality?.score != null ? `；质量 ${segment.quality.score}/${segment.quality.status || "unknown"}` : "";
            lines.push(`  - ${segment.direction || "range"} #${range.fromMessageId || ""} -> #${range.throughMessageId || ""}，${range.messageCount || 0} 条${quality}${segment.summaryChecksum ? `；摘要校验 ${segment.summaryChecksum}` : ""}`);
        }
    }
    if (compaction.ptlEmergency?.engaged) {
        lines.push(`- PTL 紧急降级：${compaction.ptlEmergency.emergencyLevel || "unknown"}；原因 ${compaction.ptlEmergency.reason || "unknown"}；本轮使用更短摘要，原文仍可从 ${compaction.ptlEmergency.rawTranscriptPath || "群聊 transcript"} 和 message id 恢复。`);
    }
    if (compaction.ptlRecovery?.recovered) {
        lines.push(`- PTL 自动恢复：已恢复普通摘要预算；原因 ${compaction.ptlRecovery.reason || "unknown"}；恢复后摘要预算 ${compaction.ptlRecovery.restoredMessageDigestMaxChars || 14000} 字符，压力 ${compaction.ptlRecovery.contextBudgetPressure ?? "unknown"}%。`);
    }
    const reinject = compaction.postCompactReinject || {};
    const reinjectParts = [
        Array.isArray(reinject.files) && reinject.files.length ? `文件 ${reinject.files.length}` : "",
        Array.isArray(reinject.skills) && reinject.skills.length ? `技能 ${reinject.skills.length}` : "",
        Array.isArray(reinject.verification) && reinject.verification.length ? `验证 ${reinject.verification.length}` : "",
        Array.isArray(reinject.blockers) && reinject.blockers.length ? `阻塞 ${reinject.blockers.length}` : "",
    ].filter(Boolean);
    if (reinjectParts.length) {
        lines.push(`- 压缩后重注入候选：${reinjectParts.join("、")}；这些是旧消息压缩后仍建议优先恢复到本轮任务上下文的线索。`);
    }
    if (typedMemory.globalClaudeMemoryImport?.schema) {
        const imported = typedMemory.globalClaudeMemoryImport;
        if (Number(imported.importedCount || 0) > 0 || (Array.isArray(imported.issues) && imported.issues.length)) {
            const includeAudit = imported.includeAudit || {};
            const externalApproval = includeAudit.externalIncludeApproval || {};
            const settingPolicy = imported.settingSourcePolicy || {};
            const includeText = includeAudit.schema
                ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
                : "";
            const sourceText = settingPolicy.schema
                ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
                : "";
            lines.push(`- 全局 Claude 记忆导入：${imported.status || "unknown"}；user=${imported.includeUser !== false} managed=${imported.includeManaged !== false}；发现 ${imported.discoveredCount || 0} 个，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
            if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
                lines.push(`- 全局 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
            }
            if (imported.instructionsLoadedHooks?.schema) {
                lines.push(`- 全局 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
            }
            if (Array.isArray(imported.issues) && imported.issues.length) {
                lines.push(`- 全局 Claude 记忆导入警告：${imported.issues.slice(0, 4).map((issue) => issue.type || issue.error || "issue").join("、")}。`);
            }
        }
    }
    if (typedMemory.projectMemoryImport?.schema) {
        const imported = typedMemory.projectMemoryImport;
        const includeAudit = imported.includeAudit || {};
        const externalApproval = includeAudit.externalIncludeApproval || {};
        const settingPolicy = imported.settingSourcePolicy || {};
        const includeText = includeAudit.schema
            ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
            : "";
        const sourceText = settingPolicy.schema
            ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
            : "";
        lines.push(`- 项目记忆导入：${imported.status || "unknown"}；从 ${imported.projectRoot || "未配置项目根"} 发现 ${imported.discoveredCount || 0} 个 Claude/规则记忆文件，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
        if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
            lines.push(`- 项目 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
        }
        if (imported.instructionsLoadedHooks?.schema) {
            lines.push(`- 项目 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
        }
        if (Array.isArray(imported.issues) && imported.issues.length) {
            lines.push(`- 项目记忆导入警告：${imported.issues.slice(0, 4).map((issue) => issue.type || issue.error || "issue").join("、")}。`);
        }
    }
    const typedLoadPlanText = (0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)(typedMemory.loadPlan);
    if (typedLoadPlanText)
        lines.push(typedLoadPlanText);
    if (typedMemory.sync?.indexFile) {
        lines.push(`- 类型化记忆索引：${typedMemory.sync.docs || 0} 条 Markdown 记忆，入口 ${typedMemory.sync.indexFile}。`);
    }
    if (typedMemory.ledger?.file) {
        lines.push(`- 类型化记忆召回账本：本轮已记录 ${typedMemory.ledger.recordedThisTurn?.length || 0} 条 surfaced，历史去重候选 ${typedMemory.ledger.alreadySurfaced?.length || 0} 条。`);
    }
    if (typedMemory.distillation?.schema) {
        lines.push(`- 长期日志蒸馏：候选 ${typedMemory.distillation.candidateCount || 0} 条，本轮新增 ${typedMemory.distillation.newFactCount || 0} 条，写入 ${typedMemory.distillation.writeCount || 0} 个 Markdown 记忆；ledger ${typedMemory.distillation.ledgerFile || "未记录"}。`);
        const quality = typedMemory.distillation.quality || {};
        if (quality.schema) {
            lines.push(`- 长期日志蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，状态矛盾 ${quality.contradictionCount || 0}；涉及文件/函数/flag 的记忆使用前必须核验当前仓库。`);
        }
    }
    const typedMemoryText = (0, group_memory_index_1.renderGroupTypedMemoryRecall)(typedMemory.recall);
    if (typedMemoryText)
        lines.push(typedMemoryText);
    if (groupState.summaryText)
        lines.push(`- 群聊压缩摘要：\n${compactPreserveLines(groupState.summaryText, 3200)}`);
    const addList = (title, items, mapper, limit = 6) => {
        const list = (items || []).filter(Boolean).slice(-limit);
        if (!list.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of list)
            lines.push(`  - ${mapper(item)}`);
    };
    addList("持久用户要求/验收约束", groupState.persistentRequirements || [], (item) => `#${item.messageId || ""} ${item.text || item}`, 6);
    addList("关键事实锚点", groupState.factAnchors || [], (item) => `#${item.messageId || ""} [${item.actor || item.type || ""}] ${item.text || item}`, 5);
    addList("关键决策", groupState.decisions || [], (item) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`, 6);
    addList("开放问题", groupState.openQuestions || [], (item) => String(item.question || item), 4);
    addList("下一步", groupState.nextActions || [], (item) => String(item.action || item), 4);
    if (agentMemory.stats?.totalReceipts) {
        lines.push(`- 子 Agent 记忆统计：总回执 ${agentMemory.stats.totalReceipts}，压缩 ${agentMemory.stats.compressedReceipts || 0}，近期保留 ${agentMemory.stats.recentReceipts || 0}。`);
    }
    if (agentMemory.summary)
        lines.push(`- 你的长期压缩摘要：${compactMemoryText(agentMemory.summary, 900)}`);
    addList("你的近期结构化回执", agentMemory.recentReceipts || [], (item) => formatAgentMemoryReceipt(item), 8);
    addList("你常涉及的文件", agentMemory.frequentFiles || [], (item) => String(item), 10);
    addList("你已有验证线索", agentMemory.verificationHints || [], (item) => String(item), 8);
    addList("你仍需处理的阻塞", [...(agentMemory.blockers || []), ...(agentMemory.needs || [])], (item) => String(item), 8);
    addList("你之前的完成记录", related.ownCompleted || [], (item) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`, 4);
    addList("其他 Agent 已完成", related.otherCompleted || [], (item) => `${item.project || "unknown"}：${item.summary || ""}`, 4);
    addList("其他 Agent 近期回执", related.relatedLedger || [], (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`, 5);
    addList("与你相关的阻塞", related.ownBlocked || [], (item) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`, 4);
    addList("全局阻塞", related.globalBlocked || [], (item) => `${item.project || "unknown"}：${item.reason || ""}`, 3);
    addList("应重注入的旧文件线索", reinject.files || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
    addList("应重注入的旧技能/工具线索", reinject.skills || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
    addList("应重注入的旧验证线索", reinject.verification || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
    addList("应重注入的旧阻塞线索", reinject.blockers || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
    if (bundle.relevant_historical_evidence)
        lines.push(bundle.relevant_historical_evidence);
    if (bundle.task_query)
        lines.push(`- 你本次任务：${bundle.task_query}`);
    lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改；必须用 memoryUsed / memoryIgnored 声明本轮是否使用了本记忆包、项目记忆、历史结论、共享文档或知识库；如存在 global_memory_id，必须用 globalMemoryUsage 逐条声明 used / ignored / verified / background / advisory；如存在 API microcompact edit plan，必须用 apiMicrocompactUsage 或 memoryUsed/memoryIgnored 声明 planChecksum 和 native_applied/advisory/ignored/not_supported，并绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；如存在 compact read plan revalidation gate，必须声明 gate/read_plan_id 以及是否已 re-read/current source verified；如存在压缩重注入候选，必须用 postCompactCandidateUsage 逐条声明 used / ignored / verified。");
    return lines.join("\n");
}
function buildAgentMemoryPacket(groupId, targetProject, task = "") {
    return renderGroupMemoryContextBundle(buildAgentMemoryContextBundle(groupId, targetProject, task));
}
function tokenizeGlobalGroupMemoryQuery(value) {
    const text = String(value || "").toLowerCase();
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        tokens.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        tokens.add(chinese.slice(index, index + 2));
    return [...tokens].slice(0, 120);
}
function globalGroupMemoryCorpus(group, memory) {
    const members = (group?.members || []).map((member) => [member.project, member.agent, member.platform].filter(Boolean).join(":")).join(" ");
    const listText = (items = [], mapper = (item) => JSON.stringify(item)) => (items || []).slice(-12).map(mapper).join("\n");
    return [
        group?.id,
        group?.name,
        members,
        memory?.goal,
        memory?.currentPhase,
        memory?.summary,
        memory?.messageDigest,
        listText(memory?.persistentRequirements || [], (item) => item.text || item),
        listText(memory?.factAnchors || [], (item) => item.text || item),
        listText(memory?.decisions || [], (item) => item.decision || item),
        listText(memory?.completed || [], (item) => `${item.project || ""} ${item.summary || ""}`),
        listText(memory?.blocked || [], (item) => `${item.project || ""} ${item.reason || ""}`),
        listText(memory?.nextActions || [], (item) => item.action || item),
    ].filter(Boolean).join("\n").toLowerCase();
}
function scoreGlobalGroupMemoryCandidate(group, memory, messages, query = "") {
    const queryTokens = tokenizeGlobalGroupMemoryQuery(query);
    let score = 0;
    const corpus = globalGroupMemoryCorpus(group, memory);
    if (!queryTokens.length)
        score += 1;
    for (const token of queryTokens) {
        if (!token)
            continue;
        if (corpus.includes(token))
            score += token.length >= 5 ? 3 : 1;
    }
    if (String(group?.id || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.id).toLowerCase()))
        score += 8;
    if (String(group?.name || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.name).toLowerCase()))
        score += 8;
    if ((memory?.blocked || []).length)
        score += 2;
    if ((memory?.nextActions || []).length)
        score += 2;
    if ((memory?.persistentRequirements || []).length)
        score += 2;
    if ((memory?.completed || []).length)
        score += 1;
    if ((messages || []).length)
        score += 1;
    return score;
}
function latestGroupMessageTimestamp(messages = []) {
    for (const message of [...(messages || [])].reverse()) {
        const value = String(message?.timestamp || message?.time || message?.created_at || "");
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return value;
    }
    return "";
}
function normalizeGlobalGroupMemoryMembers(group) {
    return (group?.members || []).slice(0, 12).map((member) => ({
        project: member.project,
        agent: member.agent,
        platform: member.platform || "",
    }));
}
function importGroupProjectMemoriesForMembers(groupId, group, options = {}) {
    const rootsByProject = options.projectRoots || options.project_roots || {};
    const imports = [];
    const seen = new Set();
    for (const member of (group?.members || []).slice(0, Number(options.maxProjectMemoryImportMembers || options.max_project_memory_import_members || 6))) {
        const project = normalizeAgentMemoryProject(member?.project || "");
        if (!project || project === "coordinator" || project === "unknown")
            continue;
        const explicit = member?.projectRoot || member?.project_root || member?.workDir || member?.work_dir || rootsByProject[project];
        const root = explicit ? path.resolve(String(explicit)) : resolveGroupProjectMemoryRoot(project, {});
        if (!root || seen.has(root.toLowerCase()))
            continue;
        seen.add(root.toLowerCase());
        imports.push((0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, root, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files,
        }));
    }
    return imports;
}
function buildGlobalGroupMemoryContext(query = "", options = {}) {
    const groups = (Array.isArray(options.groups) ? options.groups : (0, storage_1.loadGroups)()).filter((group) => group?.id);
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options);
    const generatedAt = new Date().toISOString();
    const maxGroups = Math.max(1, Math.min(12, Number(options.maxGroups || options.max_groups || 6)));
    const maxTypedMemory = Math.max(1, Math.min(8, Number(options.maxTypedMemory || options.max_typed_memory || 3)));
    const sessionId = String(options.sessionId || options.session_id || "");
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-global-group-memory-context-v1",
            version: 1,
            generated_at: generatedAt,
            query: compactMemoryText(query, 900),
            session_id: sessionId,
            total_group_count: groups.length,
            selected_group_count: 0,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_group_memory",
                use: "must_not_use_group_memory",
                boundary: "current_global_agent_turn_only",
            },
            groups: [],
        };
        const rendered = renderGlobalGroupMemoryContextBundle(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = compactPreserveLines(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 5000));
        return bundle;
    }
    const candidates = groups.map((group, index) => {
        const messages = (0, storage_1.getGroupMessages)(group.id).filter((message) => !String(message?.content || "").startsWith("📤"));
        const memory = loadGroupMemory(group.id);
        const updatedAt = memory?.updated_at || latestGroupMessageTimestamp(messages) || "";
        return {
            group,
            messages,
            memory,
            index,
            updatedAt,
            score: scoreGlobalGroupMemoryCandidate(group, memory, messages, query),
        };
    }).sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        const byTime = Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        return Number.isFinite(byTime) && byTime !== 0 ? byTime : a.index - b.index;
    });
    const selected = candidates.slice(0, maxGroups);
    const contextGroups = selected.map((candidate) => {
        const group = candidate.group;
        const memory = candidate.memory;
        const messages = candidate.messages;
        const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
            ? null
            : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(group.id, {
                settingSources: options.settingSources ?? options.setting_sources,
                includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
                includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
                userRoot: options.claudeUserRoot || options.claude_user_root,
                managedRoot: options.claudeManagedRoot || options.claude_managed_root,
                maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
                maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files,
            });
        const projectMemoryImports = importGroupProjectMemoriesForMembers(group.id, group, options);
        const sync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(group.id, memory);
        const recallQuery = [query, group.name, group.id, memory.goal, memory.currentPhase].filter(Boolean).join("\n");
        const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(recallQuery, options.targetPaths || options.target_paths || []);
        const loadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(group.id, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: recallQuery,
            targetPaths: typedMemoryTargetPaths,
        });
        const recallScope = String(options.recallScope || options.recall_scope || `global-agent:${sessionId || "default"}`);
        const alreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(group.id, recallScope, { limit: 160 });
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(group.id, recallQuery, {
            alreadySurfaced,
            targetPaths: typedMemoryTargetPaths,
            max: maxTypedMemory,
            snippetChars: Number(options.snippetChars || options.snippet_chars || 650),
        });
        const ledger = (0, group_memory_index_1.recordGroupTypedMemoryRecall)(group.id, recallScope, recall, recallQuery, {
            disableLedger: options.disableLedger === true || options.disable_ledger === true,
        });
        const distillationQuality = memory?.compaction?.logDistillation?.quality
            || memory?.longTermLogDistillation?.quality
            || (0, group_memory_index_1.evaluateGroupTypedMemoryDistillationQuality)(group.id, { projectRoot: options.projectRoot || options.project_root });
        const sourceManifest = buildGroupMemorySourceManifest(group.id, {
            generatedAt,
            typedMemorySync: sync,
            typedMemoryLedger: ledger,
        });
        const globalReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
            || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "memory_file_import"
                : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                    : projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "project_memory_import"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "global_context_bundle");
        const reloadAudit = recordGroupMemoryReloadAudit(group.id, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`,
            contextKind: "global_agent",
            reason: globalReloadReason,
            sourceManifest,
            loadPlan,
            globalClaudeMemoryImport,
            projectMemoryImports,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null,
        });
        const sessionMemory = memory.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotSummary(group.id);
        const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotSummary(group.id);
        const rawSources = {
            group_memory_file: getGroupMemoryFile(group.id),
            group_messages_file: getGroupMessagesFileHint(group.id),
            group_typed_memory_dir: sync.index.dir,
            group_typed_memory_index_file: sync.index.file,
            group_typed_memory_recall_ledger_file: ledger.file,
            group_memory_reload_ledger_file: reloadAudit.ledgerFile,
            group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(group.id),
            group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(group.id),
            group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(group.id),
            group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(group.id),
        };
        const compactFileReferences = buildGroupCompactFileReferences(group.id, {
            generatedAt,
            sourceManifest,
            sessionMemory,
            toolContinuity,
            typedMemory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir,
                },
            },
            rawSources,
        });
        const compactFileReferenceReadPlan = buildGroupCompactFileReferenceReadPlan(group.id, compactFileReferences, {
            generatedAt,
            maxEntries: 8,
        });
        const historicalReadPlanRows = latestGroupCompactFileReferenceReadPlanRows(group.id, compactFileReferenceReadPlan);
        const compactFileReferenceReadPlanForFreshness = {
            ...compactFileReferenceReadPlan,
            entries: historicalReadPlanRows.rows,
            plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
            sourceReferenceCount: historicalReadPlanRows.rows.length,
        };
        const compactFileReferenceReadPlanFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness(group.id, compactFileReferenceReadPlanForFreshness);
        const compactFileReferenceReadPlanRevalidationGate = buildGroupCompactFileReferenceReadPlanRevalidationGate(group.id, compactFileReferenceReadPlanFreshness, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`,
        });
        return {
            group_id: group.id,
            group_name: group.name || group.id,
            score: candidate.score,
            members: normalizeGlobalGroupMemoryMembers(group),
            message_window: {
                total_messages: messages.length,
                latest_message_at: latestGroupMessageTimestamp(messages),
            },
            memory_state: {
                goal: memory.goal || "",
                current_phase: memory.currentPhase || "idle",
                summary: compactPreserveLines(memory.messageDigest || memory.summary || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null), 2200),
                persistent_requirements: (memory.persistentRequirements || []).slice(-6),
                fact_anchors: (memory.factAnchors || []).slice(-6),
                decisions: (memory.decisions || []).slice(-5),
                completed: (memory.completed || []).slice(-5),
                blocked: (memory.blocked || []).slice(-5),
                open_questions: (memory.openQuestions || []).slice(-4),
                next_actions: (memory.nextActions || []).slice(-4),
            },
            compaction: {
                version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
                health: memory.compaction?.health || "",
                quality: memory.compaction?.quality || null,
                quality_score: Number(memory.compaction?.quality?.score || 0),
                quality_status: memory.compaction?.quality?.status || "",
                compacted_message_count: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
                preserved_recent_messages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
                last_compacted_message_id: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
                preserved_segment: memory.compaction?.preservedSegment || memory.compactBoundary?.preservedSegment || null,
                context_pressure_warning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
                post_compact_recovery_audit: memory.compaction?.postCompactRecoveryAudit
                    || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                    || memory.messageCompression?.postCompactRecoveryAudit
                    || null,
                partial_segments: Array.isArray(memory.compaction?.partialSegments || memory.messageCompression?.partialSegments)
                    ? (memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || []).slice(-3)
                    : [],
                ptl_emergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || null,
                ptl_recovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || null,
                session_memory: sessionMemory,
                tool_continuity: toolContinuity,
            },
            typed_memory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir,
                    docs: sync.index.docs.length,
                    line_count: sync.index.lineCount,
                    bytes: sync.index.bytes,
                },
                global_claude_memory_import: globalClaudeMemoryImport,
                project_memory_imports: projectMemoryImports,
                load_plan: loadPlan,
                target_paths: typedMemoryTargetPaths,
                recall,
                ledger: {
                    file: ledger.file,
                    scope: recallScope,
                    already_surfaced: alreadySurfaced.slice(-20),
                    recorded_this_turn: recall.surfaced || [],
                },
                distillation_quality: distillationQuality,
            },
            source_manifest: sourceManifest,
            memory_reload_audit: reloadAudit,
            compact_file_references: compactFileReferences,
            compact_file_reference_read_plan: compactFileReferenceReadPlan,
            compact_file_reference_read_plan_access: summarizeGroupCompactFileReferenceReadPlanAccess(group.id, compactFileReferenceReadPlan, memory),
            compact_file_reference_read_plan_freshness: compactFileReferenceReadPlanFreshness,
            compact_file_reference_read_plan_revalidation_gate: compactFileReferenceReadPlanRevalidationGate,
            compact_file_reference_access: summarizeGroupCompactFileReferenceAccess(group.id, compactFileReferences, memory),
            raw_sources: rawSources,
        };
    });
    const bundle = {
        schema: "ccm-global-group-memory-context-v1",
        version: 1,
        generated_at: generatedAt,
        query: compactMemoryText(query, 900),
        session_id: sessionId,
        total_group_count: groups.length,
        selected_group_count: contextGroups.length,
        memory_policy: {
            priority: "group_memory_before_global_dispatch",
            use: "must_consider_relevant_groups",
            boundary: "bounded_multi_group_summary_typed_recall_raw_paths",
            raw_recovery: "group memory JSON, group messages JSON, and MEMORY.md typed docs remain the source of truth",
        },
        groups: contextGroups,
    };
    const rendered = renderGlobalGroupMemoryContextBundle(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 48_000, maxTokens: 90_000 });
    bundle.rendered_text = compactPreserveLines(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 12_000));
    return bundle;
}
function renderGlobalGroupMemoryContextBundle(bundle) {
    if (!bundle)
        return "";
    if (typeof bundle === "string")
        return bundle;
    if (bundle.memory_policy?.ignored === true) {
        return [
            "全局 Agent 群聊记忆上下文（用户要求忽略记忆）：",
            "- 记忆使用：本轮不要读取、引用、比较或应用任何群聊历史记忆、typed MEMORY.md 或压缩摘要。",
            "- 上下文边界：只使用用户当前消息、实时工具观察和本轮显式输入。",
            bundle.query ? `- 当前查询：${bundle.query}` : "",
        ].filter(Boolean).join("\n");
    }
    const lines = [
        "全局 Agent 群聊记忆上下文（多群聊预算受控摘要）：",
        `- 选择群聊：${bundle.selected_group_count || 0}/${bundle.total_group_count || 0}`,
        "- 记忆边界：全局 Agent 在派发群聊或项目子 Agent 前必须先参考相关群聊记忆；第三方子 Agent 每次都可能是新会话，后续仍要把群聊记忆包随任务下发。",
        "- 使用策略：这里只放压缩摘要、typed MEMORY.md 召回、质量/边界和原始路径线索；涉及文件/函数/flag 的长期记忆必须按当前仓库重新核验。",
    ];
    if (bundle.query)
        lines.push(`- 当前查询：${bundle.query}`);
    const addList = (title, items, mapper, limit = 5) => {
        const list = (items || []).filter(Boolean).slice(-limit);
        if (!list.length)
            return;
        lines.push(`  - ${title}：`);
        for (const item of list)
            lines.push(`    - ${mapper(item)}`);
    };
    for (const item of bundle.groups || []) {
        const state = item.memory_state || {};
        const compaction = item.compaction || {};
        const typed = item.typed_memory || {};
        const quality = typed.distillation_quality || {};
        const sourceManifest = item.source_manifest || {};
        const reloadAudit = item.memory_reload_audit || {};
        const compactRefs = item.compact_file_references || item.compactFileReferences || {};
        const compactReadPlan = item.compact_file_reference_read_plan || item.compactFileReferenceReadPlan || {};
        const compactReadPlanAccess = item.compact_file_reference_read_plan_access || item.compactFileReferenceReadPlanAccess || {};
        const compactReadPlanFreshness = item.compact_file_reference_read_plan_freshness || item.compactFileReferenceReadPlanFreshness || {};
        const compactReadPlanRevalidationGate = item.compact_file_reference_read_plan_revalidation_gate || item.compactFileReferenceReadPlanRevalidationGate || {};
        const compactRefAccess = item.compact_file_reference_access || item.compactFileReferenceAccess || {};
        lines.push(`- 群聊 ${item.group_name || item.group_id}（${item.group_id}，score ${item.score || 0}）：`);
        if (item.members?.length)
            lines.push(`  - 成员：${item.members.map((member) => `${member.project || "unknown"}${member.agent ? `/${member.agent}` : ""}`).join("、")}`);
        lines.push(`  - 目标/阶段：${state.goal || "未记录"} / ${state.current_phase || "idle"}`);
        lines.push(`  - 消息窗口：${item.message_window?.total_messages || 0} 条；最近 ${item.message_window?.latest_message_at || "unknown"}`);
        lines.push(`  - 压缩：health=${compaction.health || "unknown"}，已压缩 ${compaction.compacted_message_count || 0}，保留近期 ${compaction.preserved_recent_messages || 0}，quality=${compaction.quality_score || 0}/${compaction.quality_status || "unknown"}`);
        if (compaction.last_compacted_message_id)
            lines.push(`  - 压缩边界：最近至 message id ${compaction.last_compacted_message_id}`);
        if (compaction.session_memory?.schema)
            lines.push(`  - CC 风格 Session Memory：summary=${compaction.session_memory.summaryFile || "未记录"}；checksum=${compaction.session_memory.markdownChecksum || "unknown"}；last=${compaction.session_memory.lastSummarizedMessageId || "recent-window"}`);
        if (compaction.tool_continuity?.schema) {
            const continuity = compaction.tool_continuity || {};
            const allowed = continuity.allowedTools || {};
            const missing = continuity.missing || {};
            lines.push(`  - CC 风格工具/技能连续性：allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}，invokedSkill ${(continuity.invokedSkills || []).length}，missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}；只恢复上下文，不扩大授权，后续派发仍以当前 runtime tool gate 为准。`);
        }
        if (compaction.preserved_segment?.schema)
            lines.push(`  - preservedSegment：保留 ${compaction.preserved_segment.preservedMessageCount || 0} 条 / 约 ${compaction.preserved_segment.preservedTokenEstimate || 0} tokens；首尾 ${compaction.preserved_segment.firstPreservedMessageId || "unknown"} -> ${compaction.preserved_segment.lastPreservedMessageId || "unknown"}`);
        if (compaction.context_pressure_warning?.schema)
            lines.push(`  - context pressure：${compaction.context_pressure_warning.level || "unknown"}，使用 ${compaction.context_pressure_warning.tokenUsage || 0} tokens，剩余 ${compaction.context_pressure_warning.percentLeft ?? "unknown"}%，建议 ${compaction.context_pressure_warning.recommendation || "continue"}${compaction.context_pressure_warning.suppressed ? "（压缩后暂时抑制预警）" : ""}`);
        if (sourceManifest.schema)
            lines.push(`  - source manifest：${sourceManifest.status || "unknown"}，源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0}，manifest ${sourceManifest.manifestChecksum || ""}${sourceManifest.missingRequired?.length ? `，缺失 ${sourceManifest.missingRequired.join("、")}` : ""}`);
        if (compactRefs.schema)
            lines.push(`  - compact file references：${compactRefs.referenceCount || 0} 个，missing ${compactRefs.missingCount || 0}；raw messages / typed MEMORY.md / session summary 是压缩后恢复的可读来源。`);
        if (compactReadPlan.schema) {
            lines.push(`  - compact file reference read plan：planned=${compactReadPlan.plannedCount || 0}/${compactReadPlan.sourceReferenceCount || 0}，sourceOfTruth=${compactReadPlan.hasSourceOfTruth === true}，summary=${compactReadPlan.hasCompactSummary === true}；只在派发/核验需要时按优先级读取。`);
            for (const entry of Array.isArray(compactReadPlan.entries) ? compactReadPlan.entries.slice(0, 3) : []) {
                lines.push(`    - ${entry.read_plan_id || ""}：${entry.action || "read_if_needed"}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}`);
            }
        }
        if (compactReadPlanAccess.schema)
            lines.push(`  - compact read plan access：surfaced=${compactReadPlanAccess.ledger_entry_count || 0} mentioned=${compactReadPlanAccess.mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0} read_plan_id=${compactReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0}`);
        if (compactReadPlanFreshness.schema)
            lines.push(`  - compact read plan freshness：${compactReadPlanFreshness.status || "unknown"}，fresh=${compactReadPlanFreshness.freshCount || 0}/${compactReadPlanFreshness.checked || 0}，changed=${compactReadPlanFreshness.changedCount || 0}，unverifiable=${compactReadPlanFreshness.unverifiableCount || 0}`);
        if (compactReadPlanRevalidationGate.schema && (Number(compactReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactReadPlanRevalidationGate.verification_count || 0) > 0)) {
            lines.push(`  - compact read plan revalidation gate：gate=${compactReadPlanRevalidationGate.revalidation_gate_id || ""}，status=${compactReadPlanRevalidationGate.status || "unknown"}，required=${compactReadPlanRevalidationGate.required_count || 0}，verify=${compactReadPlanRevalidationGate.verification_count || 0}；派发子 Agent 前必须要求 stale read_plan_id 先 re-read/current source verified。`);
        }
        if (compactRefAccess.schema)
            lines.push(`  - compact file reference access：surfaced=${compactRefAccess.ledger_entry_count || 0} mentioned=${compactRefAccess.mentioned_count || 0}/${compactRefAccess.reference_count || 0}`);
        if (reloadAudit.schema)
            lines.push(`  - memory reload audit：reason=${reloadAudit.reason || "unknown"}，action=${reloadAudit.cacheAction || "unknown"}，sourceChanged=${reloadAudit.sourceManifestChanged === true}，scope=${reloadAudit.scope || "default"}`);
        if (reloadAudit.sourceChangeTrigger?.triggered)
            lines.push(`  - memory source change trigger：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}`);
        if (compaction.post_compact_recovery_audit?.schema)
            lines.push(`  - post-compact recovery audit：${compaction.post_compact_recovery_audit.status || "unknown"}，通过 ${compaction.post_compact_recovery_audit.passedChecks || 0}/${compaction.post_compact_recovery_audit.checkCount || 0}，动作 ${compaction.post_compact_recovery_audit.action || "unknown"}`);
        if (Array.isArray(compaction.partial_segments) && compaction.partial_segments.length)
            lines.push(`  - partial compact sidecar：${compaction.partial_segments.length} 个近期摘要段，不推进主边界。`);
        if (compaction.ptl_emergency?.engaged)
            lines.push(`  - PTL emergency：${compaction.ptl_emergency.emergencyLevel || "unknown"}，原因 ${compaction.ptl_emergency.reason || "unknown"}`);
        if (compaction.ptl_recovery?.recovered)
            lines.push(`  - PTL recovery：已恢复普通摘要预算，原因 ${compaction.ptl_recovery.reason || "unknown"}`);
        if (typed.sync?.index_file)
            lines.push(`  - typed MEMORY.md：${typed.sync.docs || 0} docs，入口 ${typed.sync.index_file}`);
        if (typed.global_claude_memory_import?.schema && Number(typed.global_claude_memory_import.importedCount || 0) > 0) {
            const includeAudit = typed.global_claude_memory_import.includeAudit || {};
            const settingPolicy = typed.global_claude_memory_import.settingSourcePolicy || {};
            lines.push(`  - global Claude memory import：导入 ${typed.global_claude_memory_import.importedCount || 0} 个 user/managed Claude typed docs${includeAudit.schema ? `，include ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0}/${includeAudit.skippedCount || 0}` : ""}${settingPolicy.schema ? `，sources=${(settingPolicy.enabled || []).join(",")}${settingPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (includeAudit.externalIncludeApproval?.pendingCount)
                lines.push(`  - global Claude external include approval：pending=${includeAudit.externalIncludeApproval.pendingCount} ledger=${includeAudit.externalIncludeApproval.ledgerFile || ""}`);
            if (typed.global_claude_memory_import.instructionsLoadedHooks?.schema)
                lines.push(`  - global Claude InstructionsLoaded hooks：events=${typed.global_claude_memory_import.instructionsLoadedHooks.eventCount || 0} fired=${typed.global_claude_memory_import.instructionsLoadedHooks.firedCount || 0} failed=${typed.global_claude_memory_import.instructionsLoadedHooks.failureCount || 0}`);
        }
        if (Array.isArray(typed.project_memory_imports) && typed.project_memory_imports.length) {
            const importedCount = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.importedCount || 0), 0);
            const includeImported = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.importedIncludeCount || item.includeAudit?.includedCount || 0), 0);
            const includeSkipped = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.skippedCount || 0), 0);
            const externalPending = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.externalIncludeApproval?.pendingCount || 0), 0);
            const firstPolicy = typed.project_memory_imports.find((item) => item.settingSourcePolicy?.schema)?.settingSourcePolicy || {};
            const hookEvents = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.eventCount || 0), 0);
            const hookFired = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.firedCount || 0), 0);
            const hookFailed = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.failureCount || 0), 0);
            lines.push(`  - project memory import：${typed.project_memory_imports.length} 个项目根，导入 ${importedCount} 个 Claude/规则 typed docs${includeImported || includeSkipped ? `，include ${includeImported}/${includeSkipped}` : ""}${firstPolicy.schema ? `，sources=${(firstPolicy.enabled || []).join(",")}${firstPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (externalPending)
                lines.push(`  - project Claude external include approval：pending=${externalPending}`);
            if (hookEvents)
                lines.push(`  - project Claude InstructionsLoaded hooks：events=${hookEvents} fired=${hookFired} failed=${hookFailed}`);
        }
        const loadPlanText = compactPreserveLines((0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)(typed.load_plan), 1400);
        if (loadPlanText)
            lines.push(`  - ${loadPlanText.replace(/\n/g, "\n  ")}`);
        if (quality.schema)
            lines.push(`  - 蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，矛盾 ${quality.contradictionCount || 0}`);
        const recallText = compactPreserveLines((0, group_memory_index_1.renderGroupTypedMemoryRecall)(typed.recall), 2200);
        if (recallText)
            lines.push(`  - ${recallText.replace(/\n/g, "\n  ")}`);
        if (state.summary)
            lines.push(`  - 群聊摘要：\n${compactPreserveLines(state.summary, 1800).replace(/^/gm, "    ")}`);
        addList("持久用户要求", state.persistent_requirements || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键事实锚点", state.fact_anchors || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键决策", state.decisions || [], (entry) => `${entry.decision || entry}${entry.reason ? `（${entry.reason}）` : ""}`, 4);
        addList("已完成", state.completed || [], (entry) => `${entry.project || "unknown"}：${entry.summary || ""}`, 4);
        addList("阻塞", state.blocked || [], (entry) => `${entry.project || "unknown"}：${entry.reason || ""}`, 4);
        addList("下一步", state.next_actions || [], (entry) => String(entry.action || entry), 4);
        lines.push(`  - 原始来源：memory=${item.raw_sources?.group_memory_file || ""}；messages=${item.raw_sources?.group_messages_file || ""}；typed=${item.raw_sources?.group_typed_memory_dir || ""}`);
    }
    return lines.join("\n");
}
function runGlobalGroupMemoryContextSelfTest() {
    const id = `global-group-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
    const groupA = `${id}-checkout`;
    const groupB = `${id}-search`;
    const groups = [
        { id: groupA, name: "Checkout Memory Group", members: [{ project: "api", agent: "claudecode" }, { project: "web", agent: "cursor" }] },
        { id: groupB, name: "Search Memory Group", members: [{ project: "search", agent: "codex" }] },
    ];
    const files = [groupA, groupB].flatMap(groupId => [getGroupMemoryFile(groupId), `${getGroupMemoryFile(groupId)}.bak`, getGroupMessagesFileHint(groupId), `${getGroupMessagesFileHint(groupId)}.bak`, getGroupMemoryReloadLedgerFile(groupId)]);
    const typedDirs = [(0, group_memory_index_1.getGroupTypedMemoryDir)(groupA), (0, group_memory_index_1.getGroupTypedMemoryDir)(groupB)];
    try {
        (0, storage_1.saveGroupMessages)(groupA, [
            { id: "ga-1", role: "user", target: "coordinator", timestamp: "2026-07-07T01:00:00.000Z", content: "全局派发前必须保留 GLOBAL_GROUP_MEMORY_SENTINEL，支付回调不能跳过验签。" },
            { id: "ga-2", role: "assistant", agent: "api", timestamp: "2026-07-07T01:01:00.000Z", content: "api 已修改 src/pay.ts，验证 npm run check 通过。" },
        ]);
        (0, storage_1.saveGroupMessages)(groupB, [
            { id: "gb-1", role: "user", target: "coordinator", timestamp: "2026-07-07T02:00:00.000Z", content: "搜索任务要保留 SEARCH_GROUP_SENTINEL，并优先检查 src/search.ts。" },
            { id: "gb-2", role: "assistant", agent: "search", timestamp: "2026-07-07T02:01:00.000Z", content: "search 仍阻塞在索引刷新测试。" },
        ]);
        saveGroupMemory(groupA, {
            goal: "Checkout 全局群聊记忆上下文自测",
            currentPhase: "dispatch_ready",
            persistentRequirements: [{ messageId: "ga-1", text: "必须保留 GLOBAL_GROUP_MEMORY_SENTINEL，支付回调不能跳过验签。" }],
            decisions: [{ decision: "全局 Agent 派发前先查看群聊 typed memory", reason: "避免跨会话遗忘" }],
            completed: [{ project: "api", summary: "已修改 src/pay.ts", verification: ["npm run check"] }],
            factAnchors: [{ id: "ga-fact", type: "user_requirement", messageId: "ga-1", text: "src/pay.ts 是支付回调核心文件" }],
            compaction: {
                health: "healthy",
                quality: { score: 94, status: "pass", pass: true },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    action: "safe_to_inject_child_agent_memory_packet",
                    passedChecks: 11,
                    checkCount: 11,
                },
            },
        });
        saveGroupMemory(groupB, {
            goal: "Search 多群聊记忆上下文自测",
            currentPhase: "blocked",
            persistentRequirements: [{ messageId: "gb-1", text: "必须保留 SEARCH_GROUP_SENTINEL，优先检查 src/search.ts。" }],
            blocked: [{ project: "search", reason: "索引刷新测试失败" }],
            nextActions: [{ action: "让 search 子 Agent 继续验证 src/search.ts" }],
            compaction: { health: "healthy", quality: { score: 91, status: "pass", pass: true } },
        });
        const bundle = buildGlobalGroupMemoryContext("继续 GLOBAL_GROUP_MEMORY_SENTINEL 和 SEARCH_GROUP_SENTINEL 的多群聊任务", {
            groups,
            sessionId: `${id}-session`,
            maxGroups: 5,
            disableLedger: true,
        });
        const ignored = buildGlobalGroupMemoryContext("本轮请忽略记忆，只看当前消息", { groups, sessionId: `${id}-ignore` });
        const rendered = String(bundle.rendered_text || "");
        const ignoredRendered = String(ignored.rendered_text || "");
        const checks = {
            schema: bundle.schema === "ccm-global-group-memory-context-v1",
            includesMultipleGroups: bundle.selected_group_count === 2 && (bundle.groups || []).some((item) => item.group_id === groupA) && (bundle.groups || []).some((item) => item.group_id === groupB),
            recallsTypedMemory: JSON.stringify(bundle.groups || []).includes("GLOBAL_GROUP_MEMORY_SENTINEL") && JSON.stringify(bundle.groups || []).includes("SEARCH_GROUP_SENTINEL"),
            renderedMentionsMemoryBoundary: rendered.includes("全局 Agent 群聊记忆上下文") && rendered.includes("第三方子 Agent 每次都可能是新会话"),
            renderedMentionsQuality: rendered.includes("蒸馏质量") || rendered.includes("quality="),
            renderedMentionsPostCompactRecoveryAudit: rendered.includes("post-compact recovery audit"),
            renderedMentionsSourceManifest: rendered.includes("source manifest")
                && JSON.stringify(bundle.groups || []).includes("ccm-group-memory-source-manifest-v1"),
            renderedMentionsReloadAudit: rendered.includes("memory reload audit")
                && JSON.stringify(bundle.groups || []).includes("ccm-group-memory-reload-audit-v1"),
            renderedMentionsTypedLoadPlan: rendered.includes("类型化 MEMORY.md 加载计划")
                && JSON.stringify(bundle.groups || []).includes("ccm-group-typed-memory-load-plan-v1"),
            rawSourcesExposed: rendered.includes("group-memory") && rendered.includes("group-messages") && rendered.includes("group-memory-md"),
            ignoreMemoryHonored: ignored.memory_policy?.ignored === true && ignored.groups.length === 0 && ignoredRendered.includes("忽略记忆")
                && !ignoredRendered.includes("GLOBAL_GROUP_MEMORY_SENTINEL") && !ignoredRendered.includes("SEARCH_GROUP_SENTINEL"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, selected: (bundle.groups || []).map((item) => item.group_id) };
    }
    finally {
        for (const file of files)
            try {
                fs.unlinkSync(file);
            }
            catch { }
        for (const dir of typedDirs)
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
    }
}
function runGroupCompactFileReferenceReadPlanSelfTest() {
    const groupId = `group-compact-file-reference-read-plan-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const sessionDir = path.dirname(getGroupSessionMemorySnapshotFile(groupId));
    const toolDir = path.dirname(getGroupToolContinuitySnapshotFile(groupId));
    const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "cfrp-1", role: "user", target: "coordinator", timestamp: "2026-07-07T15:00:00.000Z", content: "COMPACT_REFERENCE_READ_PLAN_SENTINEL：压缩后子 Agent 要知道先读 Session Memory，再按需读 raw messages 和 typed MEMORY。" },
            { id: "cfrp-2", role: "assistant", agent: "api", timestamp: "2026-07-07T15:01:00.000Z", content: "api 已记录 read plan 自测，涉及 src/read-plan.ts。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "验证 compact file references 的按需读取计划",
            currentPhase: "read-plan-selftest",
            messageDigest: "COMPACT_REFERENCE_READ_PLAN_SENTINEL：read plan 应指导子 Agent 按需恢复压缩文件来源。",
            persistentRequirements: [{ messageId: "cfrp-1", text: "子 Agent 必须收到 compact file reference read plan。" }],
            completed: [{ project: "api", summary: "已记录 read plan 自测", verification: ["npm run check"] }],
            compaction: {
                health: "healthy",
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-reference-read-plan-summary",
                lastCompactedMessageId: "cfrp-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_REFERENCE_READ_PLAN_SENTINEL src/read-plan.ts", {
            minKeepTokens: 1,
        });
        const refs = childBundle.compact_file_references || {};
        const readPlan = childBundle.compact_file_reference_read_plan || {};
        const rendered = renderGroupMemoryContextBundle(childBundle);
        const globalBundle = buildGlobalGroupMemoryContext("COMPACT_REFERENCE_READ_PLAN_SENTINEL", {
            groups: [{ id: groupId, name: "Compact Reference Read Plan", members: [{ project: "api", agent: "claude-code" }] }],
            disableLedger: true,
            maxGroups: 1,
        });
        const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
        const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
        const checks = {
            referencesExist: refs.schema === "ccm-group-compact-file-references-v1"
                && Number(refs.referenceCount || 0) >= 3,
            readPlanSchema: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && Number(readPlan.plannedCount || 0) >= 3,
            readPlanPrioritizesSummaryAndSource: entries.some((entry) => entry.type === "group_session_memory" && entry.priority === 10)
                && entries.some((entry) => entry.type === "raw_group_messages_json" && entry.priority === 20)
                && entries.some((entry) => entry.type === "typed_memory_index"),
            readPlanCarriesReceiptContract: entries.every((entry) => String(entry.receipt || "").includes("memoryUsed")
                && String(entry.read_plan_id || "").startsWith("cfr-read:")),
            childRenderedMentionsReadPlan: rendered.includes("compact file reference read plan")
                && rendered.includes("read_plan_id=")
                && rendered.includes("不要全量读取所有引用"),
            globalContextSeesReadPlan: globalRendered.includes("compact file reference read plan")
                && globalRendered.includes("sourceOfTruth=true"),
            policyIsReadOnDemand: readPlan.policy?.mode === "read_on_demand_after_compact"
                && readPlan.policy?.doNotReadAll === true,
        };
        return { pass: Object.values(checks).every(Boolean), checks, readPlan: { plannedCount: readPlan.plannedCount, missingCount: readPlan.missingCount, entries: entries.slice(0, 4).map((entry) => ({ type: entry.type, priority: entry.priority, action: entry.action })) } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runGroupMemorySourceManifestSelfTest() {
    const groupId = `group-memory-source-manifest-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "sm-1", role: "user", target: "coordinator", timestamp: "2026-07-07T03:00:00.000Z", content: "必须保留 SOURCE_MANIFEST_SENTINEL，子 Agent 每轮都要知道记忆源文件。" },
            { id: "sm-2", role: "assistant", agent: "api", timestamp: "2026-07-07T03:01:00.000Z", content: "api 修改 src/source-manifest.ts，验证 npm run check passed。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "source manifest 自测",
            persistentRequirements: [{ messageId: "sm-1", text: "必须保留 SOURCE_MANIFEST_SENTINEL。" }],
            factAnchors: [{ id: "sm-fact", type: "user_requirement", messageId: "sm-1", text: "src/source-manifest.ts 是本轮源文件审计测试文件" }],
            completed: [{ project: "api", summary: "已修改 src/source-manifest.ts", verification: ["npm run check passed"] }],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 SOURCE_MANIFEST_SENTINEL src/source-manifest.ts npm run check", {
            disableLedger: true,
            minKeepTokens: 1,
        });
        const manifest = bundle.source_manifest || {};
        const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        const rendered = String(bundle.rendered_text || "");
        const checks = {
            schema: manifest.schema === "ccm-group-memory-source-manifest-v1",
            manifestPasses: manifest.pass === true && manifest.status === "pass",
            requiredSourcesPresent: byId.get("group_memory")?.exists === true
                && byId.get("group_messages")?.exists === true
                && byId.get("typed_memory_index")?.exists === true,
            typedDocsRecorded: Number(manifest.typedDocCount || 0) >= 3
                && entries.some((entry) => String(entry.id || "").startsWith("typed_doc:")),
            checksumsRecorded: entries.filter((entry) => entry.kind === "file").every((entry) => String(entry.checksum || "").length >= 12),
            rawSourcesExposeRecallLedger: !!bundle.raw_sources?.group_typed_memory_recall_ledger_file,
            renderedMentionsManifest: rendered.includes("记忆源 manifest") && rendered.includes("typed docs"),
            contextUsesTypedMemory: rendered.includes("SOURCE_MANIFEST_SENTINEL") && rendered.includes("src/source-manifest.ts"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, manifest: { status: manifest.status, entryCount: manifest.entryCount, typedDocCount: manifest.typedDocCount } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupMemoryReloadAuditSelfTest() {
    const groupId = `group-memory-reload-audit-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "reload-1", role: "user", target: "coordinator", content: "必须保留 RELOAD_AUDIT_SENTINEL，检查记忆 reload reason。" },
            { id: "reload-2", role: "assistant", agent: "api", content: "api 处理 src/reload.ts，验证 npm run check passed。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "reload audit 自测",
            persistentRequirements: [{ messageId: "reload-1", text: "必须保留 RELOAD_AUDIT_SENTINEL。" }],
            factAnchors: [{ id: "reload-fact", type: "user_requirement", messageId: "reload-1", text: "src/reload.ts 是 reload audit 测试文件" }],
        });
        const first = buildAgentMemoryContextBundle(groupId, "api", "继续 RELOAD_AUDIT_SENTINEL src/reload.ts", {
            includeGlobalClaudeMemory: false,
            memoryReloadReason: "session_start",
            minKeepTokens: 1,
        });
        const second = buildAgentMemoryContextBundle(groupId, "api", "继续 RELOAD_AUDIT_SENTINEL src/reload.ts", {
            includeGlobalClaudeMemory: false,
            memoryReloadReason: "context_bundle",
            minKeepTokens: 1,
        });
        const ledger = readGroupMemoryReloadLedger(groupId);
        const firstAudit = first.memory_reload_audit || {};
        const secondAudit = second.memory_reload_audit || {};
        const rendered = String(second.rendered_text || "");
        const checks = {
            firstAuditRecorded: firstAudit.schema === "ccm-group-memory-reload-audit-v1"
                && firstAudit.reason === "session_start"
                && firstAudit.shouldReload === true
                && firstAudit.hookEvent === "instructions_loaded",
            secondAuditSeesPrevious: secondAudit.schema === "ccm-group-memory-reload-audit-v1"
                && secondAudit.reason === "memory_source_changed"
                && secondAudit.originalReason === "context_bundle"
                && !!secondAudit.previousAuditAt
                && secondAudit.previousSourceManifestChecksum === firstAudit.sourceManifestChecksum
                && secondAudit.sourceChangeTrigger?.triggered === true,
            ledgerPersisted: fs.existsSync(reloadFile)
                && Array.isArray(ledger.entries)
                && ledger.entries.length >= 2
                && ledger.scopes?.["child:api"]?.reason === "memory_source_changed",
            renderedMentionsReloadAudit: rendered.includes("记忆 reload 审计")
                && rendered.includes("reason=memory_source_changed")
                && rendered.includes("scope=child:api"),
            rawSourcesExposeReloadLedger: second.raw_sources?.group_memory_reload_ledger_file === reloadFile,
        };
        return { pass: Object.values(checks).every(Boolean), checks, firstAudit: { reason: firstAudit.reason, action: firstAudit.cacheAction }, secondAudit: { reason: secondAudit.reason, action: secondAudit.cacheAction } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupMemorySourceChangeReloadSelfTest() {
    const groupId = `group-memory-source-change-reload-selftest-${process.pid}-${Date.now().toString(36)}`;
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const loadPlan = {
        entries: [{ relPath: "MEMORY.md", type: "entrypoint", loadOrder: 0, checksum: "plan-a", pathGlobs: [] }],
    };
    const manifestA = {
        schema: "ccm-group-memory-source-manifest-v1",
        manifestChecksum: "manifest-a",
        status: "pass",
        entryCount: 2,
        typedDocCount: 1,
        entries: [
            { id: "group_memory", purpose: "group_memory_json", path: "group-memory.json", exists: true, kind: "file", bytes: 10, mtimeMs: 1000, checksum: "gm-a", lineCount: 1 },
            { id: "typed_memory_index", purpose: "typed_memory_entrypoint", path: "MEMORY.md", exists: true, kind: "file", bytes: 20, mtimeMs: 1000, checksum: "typed-a", lineCount: 2 },
        ],
    };
    const manifestB = {
        ...manifestA,
        manifestChecksum: "manifest-b",
        entries: [
            manifestA.entries[0],
            { ...manifestA.entries[1], bytes: 30, mtimeMs: 2000, checksum: "typed-b", lineCount: 3 },
        ],
    };
    try {
        const first = recordGroupMemoryReloadAudit(groupId, {
            scope: "child:api",
            contextKind: "child_agent",
            reason: "context_bundle",
            sourceManifest: manifestA,
            loadPlan,
            generatedAt: "2026-07-07T05:00:00.000Z",
        });
        const second = recordGroupMemoryReloadAudit(groupId, {
            scope: "child:api",
            contextKind: "child_agent",
            reason: "context_bundle",
            sourceManifest: manifestB,
            loadPlan,
            generatedAt: "2026-07-07T05:01:00.000Z",
        });
        const third = recordGroupMemoryReloadAudit(groupId, {
            scope: "child:api",
            contextKind: "child_agent",
            reason: "context_bundle",
            sourceManifest: manifestB,
            loadPlan,
            generatedAt: "2026-07-07T05:02:00.000Z",
        });
        const ledger = readGroupMemoryReloadLedger(groupId);
        const checks = {
            firstCreatesBaselineWithoutSourceTrigger: first.reason === "context_bundle"
                && first.shouldReload === true
                && first.sourceChangeTrigger?.triggered === false,
            secondAutoPromotesReason: second.reason === "memory_source_changed"
                && second.originalReason === "context_bundle"
                && second.shouldReload === true
                && second.sourceChangeTrigger?.triggered === true
                && second.sourceChangeTrigger.changedCount === 1
                && second.sourceChangeTrigger.changedIds.includes("typed_memory_index"),
            thirdReusesWhenStable: third.reason === "context_bundle"
                && third.shouldReload === false
                && third.sourceChangeTrigger?.triggered === false,
            ledgerStoresSnapshotAndTrigger: fs.existsSync(reloadFile)
                && Array.isArray(ledger.scopes?.["child:api"]?.sourceEntries)
                && ledger.scopes["child:api"].sourceEntries.some((entry) => entry.id === "typed_memory_index" && entry.checksum === "typed-b")
                && ledger.entries.some((entry) => entry.reason === "memory_source_changed"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            second: { reason: second.reason, trigger: second.sourceChangeTrigger },
            third: { reason: third.reason, shouldReload: third.shouldReload },
        };
    }
    finally {
        try {
            fs.unlinkSync(reloadFile);
        }
        catch { }
    }
}
function runGroupMemoryDispatchFreshnessGateSelfTest() {
    const groupId = `group-memory-dispatch-freshness-gate-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "gate-1", role: "user", target: "coordinator", content: "必须保留 DISPATCH_FRESHNESS_GATE_SENTINEL，子 Agent 派发前要证明记忆新鲜。" },
            { id: "gate-2", role: "assistant", agent: "api", content: "api 继续 src/gate.ts，验证 npm run check。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "dispatch freshness gate 自测",
            persistentRequirements: [{ messageId: "gate-1", text: "必须保留 DISPATCH_FRESHNESS_GATE_SENTINEL。" }],
            factAnchors: [{ id: "gate-fact", type: "user_requirement", messageId: "gate-1", text: "src/gate.ts 是派发新鲜度门禁测试文件" }],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 DISPATCH_FRESHNESS_GATE_SENTINEL src/gate.ts", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
        const gate = bundle.dispatch_freshness_gate || {};
        const ignoredGate = ignored.dispatch_freshness_gate || {};
        const rendered = String(bundle.rendered_text || "");
        const ignoredRendered = String(ignored.rendered_text || "");
        const checks = {
            gateSchema: gate.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1"
                && gate.version === exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
            gateBindsScopeAndTarget: gate.group_id === groupId
                && gate.target_project === "api"
                && gate.scope === "child:api"
                && String(gate.dispatch_gate_id || "").startsWith("gmd_"),
            gateCarriesSourceAndReload: gate.source_manifest?.checksum === bundle.source_manifest?.manifestChecksum
                && gate.reload_audit?.reason === bundle.memory_reload_audit?.reason
                && gate.reload_audit?.cache_action === bundle.memory_reload_audit?.cacheAction,
            gateRequiresReceiptDeclaration: gate.receipt_contract?.memory_used_should_reference_gate === true
                && Array.isArray(gate.receipt_contract.required_receipt_fields)
                && gate.receipt_contract.required_receipt_fields.includes("memoryUsed"),
            renderedMentionsFreshnessGate: rendered.includes("子 Agent 记忆派发新鲜度")
                && rendered.includes(gate.dispatch_gate_id)
                && rendered.includes("memoryUsed/memoryIgnored"),
            ignoredGateHonorsUserPolicy: ignoredGate.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1"
                && ignoredGate.status === "memory_ignored"
                && ignoredGate.memory_ignored === true
                && ignoredRendered.includes("记忆派发门禁")
                && ignoredRendered.includes("memoryIgnored"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, gate: { id: gate.dispatch_gate_id, status: gate.status, action: gate.action } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupPostCompactFirstDispatchMarkerSelfTest() {
    const groupId = `group-post-compact-first-dispatch-marker-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, Array.from({ length: 18 }, (_, index) => ({
            id: `pcfd-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? "必须保留 POST_COMPACT_FIRST_DISPATCH_SENTINEL，压缩后首次派发要被标记。"
                : `压缩后首次派发 marker 自测 ${index}，涉及 src/post-compact-dispatch.ts 和 npm run check。`,
        })));
        saveGroupMemory(groupId, {
            goal: "post compact first dispatch marker 自测",
            persistentRequirements: [{ messageId: "pcfd-0", text: "必须保留 POST_COMPACT_FIRST_DISPATCH_SENTINEL。" }],
        });
        const first = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const second = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const otherTarget = buildAgentMemoryContextBundle(groupId, "frontend", "继续 POST_COMPACT_FIRST_DISPATCH_SENTINEL src/post-compact-dispatch.ts", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const firstMarker = first.post_compact_dispatch_marker || {};
        const secondMarker = second.post_compact_dispatch_marker || {};
        const otherMarker = otherTarget.post_compact_dispatch_marker || {};
        const ledger = readGroupPostCompactDispatchLedger(groupId);
        const rendered = String(first.rendered_text || "");
        const checks = {
            firstMarkerRecorded: firstMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && firstMarker.version === exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION
                && firstMarker.first_dispatch_after_compact === true
                && firstMarker.dispatch_sequence === 1
                && String(firstMarker.marker_id || "").startsWith("pcfd_"),
            secondMarkerAdvancesSameTarget: secondMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && secondMarker.boundary_id === firstMarker.boundary_id
                && secondMarker.first_dispatch_after_compact === false
                && secondMarker.dispatch_sequence === 2,
            otherTargetGetsOwnFirstDispatch: otherMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && otherMarker.boundary_id === firstMarker.boundary_id
                && otherMarker.target_project === "frontend"
                && otherMarker.first_dispatch_after_compact === true
                && otherMarker.dispatch_sequence === 1,
            renderedMentionsMarker: rendered.includes("压缩后派发标记")
                && rendered.includes(firstMarker.marker_id)
                && rendered.includes("first=true"),
            rawSourcesExposeDispatchLedger: first.raw_sources?.group_post_compact_dispatch_ledger_file === dispatchFile,
            ledgerPersisted: fs.existsSync(dispatchFile)
                && Array.isArray(ledger.entries)
                && ledger.entries.length >= 3
                && Object.values(ledger.scopes || {}).some((item) => item.targetProject === "api" && item.dispatchSequence === 2)
                && Object.values(ledger.scopes || {}).some((item) => item.targetProject === "frontend" && item.dispatchSequence === 1),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { marker_id: firstMarker.marker_id, boundary_id: firstMarker.boundary_id, dispatch_sequence: firstMarker.dispatch_sequence },
            second: { marker_id: secondMarker.marker_id, boundary_id: secondMarker.boundary_id, dispatch_sequence: secondMarker.dispatch_sequence },
            other: { marker_id: otherMarker.marker_id, boundary_id: otherMarker.boundary_id, dispatch_sequence: otherMarker.dispatch_sequence },
        };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupPostCompactCandidateUsageLedgerSelfTest() {
    const groupId = `group-post-compact-candidate-usage-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    const usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, Array.from({ length: 16 }, (_, index) => ({
            id: `pccu-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? "必须保留 POST_COMPACT_USAGE_LEDGER_SENTINEL，候选使用状态要进入长期账本。"
                : `候选使用账本自测 ${index}，涉及 src/usage-ledger.ts 和 npm run check。`,
        })));
        saveGroupMemory(groupId, {
            goal: "post compact candidate usage ledger 自测",
            persistentRequirements: [{ messageId: "pccu-0", text: "必须保留 POST_COMPACT_USAGE_LEDGER_SENTINEL。" }],
            compaction: {
                postCompactReinject: {
                    hasCandidates: true,
                    files: [{ candidate_id: "pcrc_usage_file", value: "src/usage-ledger.ts", sourceMessageId: "pccu-1" }],
                    verification: [{ candidate_id: "pcrc_usage_check", value: "npm run check", sourceMessageId: "pccu-2" }],
                    blockers: [{ candidate_id: "pcrc_usage_legacy", value: "legacy blocker already resolved", sourceMessageId: "pccu-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    action: "safe_to_inject_child_agent_memory_packet",
                    summaryChecksum: "usage-ledger-summary",
                    transcriptPath: "usage-ledger-raw.json",
                    candidateCounts: { files: 1, skills: 0, verification: 1, blockers: 1 },
                },
            },
        });
        const record = recordGroupPostCompactCandidateUsageLedger(groupId, {
            targetProject: "api",
            taskId: "task-usage-ledger",
            executionId: "exec-usage-ledger",
            generatedAt: "2026-07-07T00:00:00.000Z",
            receiptRows: [{
                    agent: "api",
                    status: "done",
                    post_compact_reinjection_gate: {
                        gate_ids: ["pcrg_usage_ledger"],
                        candidate_usage_rows: [
                            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_file", kind: "file", value: "src/usage-ledger.ts", usage_state: "used", used: true, referenced: true, direct_reference: true },
                            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_check", kind: "verification", value: "npm run check", usage_state: "verified", verified: true, referenced: true, direct_reference: true },
                            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_legacy", kind: "blocker", value: "legacy blocker already resolved", usage_state: "ignored", ignored: true, referenced: true, direct_reference: true },
                        ],
                    },
                }],
        });
        const duplicate = recordGroupPostCompactCandidateUsageLedger(groupId, {
            targetProject: "api",
            taskId: "task-usage-ledger",
            executionId: "exec-usage-ledger",
            generatedAt: "2026-07-07T00:00:00.000Z",
            receiptRows: [{
                    agent: "api",
                    status: "done",
                    post_compact_reinjection_gate: {
                        gate_ids: ["pcrg_usage_ledger"],
                        candidate_usage_rows: [
                            { gate_id: "pcrg_usage_ledger", candidate_id: "pcrc_usage_file", kind: "file", value: "src/usage-ledger.ts", usage_state: "used", used: true, referenced: true, direct_reference: true },
                        ],
                    },
                }],
        });
        const ledger = readGroupPostCompactCandidateUsageLedger(groupId);
        const summary = buildGroupPostCompactCandidateUsageSummary(groupId, {
            targetProject: "api",
            candidates: [
                { candidate_id: "pcrc_usage_file", value: "src/usage-ledger.ts" },
                { candidate_id: "pcrc_usage_check", value: "npm run check" },
                { candidate_id: "pcrc_usage_legacy", value: "legacy blocker already resolved" },
            ],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 POST_COMPACT_USAGE_LEDGER_SENTINEL src/usage-ledger.ts npm run check", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const rendered = String(bundle.rendered_text || "");
        const fileStats = Object.values(ledger.stats || {}).find((item) => item.candidate_id === "pcrc_usage_file") || {};
        const ignoredStats = Object.values(ledger.stats || {}).find((item) => item.candidate_id === "pcrc_usage_legacy") || {};
        const checks = {
            recordWritesThreeEntries: record?.recorded_count === 3
                && fs.existsSync(usageFile)
                && Array.isArray(ledger.entries)
                && ledger.entries.length === 3,
            duplicateDoesNotRecount: duplicate?.recorded_count === 0
                && duplicate?.duplicate_count === 1
                && Number(fileStats.used_count || 0) === 1,
            statsClassifyUsage: Number(fileStats.used_count || 0) === 1
                && Number(ignoredStats.ignored_count || 0) === 1
                && ignoredStats.recommendation === "neutral_verify_current_context",
            summaryFiltersCurrentCandidates: summary.schema === "ccm-group-post-compact-candidate-usage-summary-v1"
                && summary.has_history === true
                && summary.totals.used === 1
                && summary.totals.verified === 1
                && summary.totals.ignored === 1,
            bundleExposesUsageLedger: bundle.post_compact_candidate_usage?.has_history === true
                && bundle.raw_sources?.group_post_compact_candidate_usage_ledger_file === usageFile,
            bundleFeedsUsageIntoTypedRecall: Number(bundle.group_state?.typedMemory?.recall?.postCompactUsageScoring?.hint_count || 0) >= 1
                && Number(bundle.group_state?.typedMemory?.recall?.postCompactUsageScoring?.boosted_count || 0) >= 1,
            renderedMentionsUsageLedger: rendered.includes("压缩重注入候选使用账本")
                && rendered.includes("pcrc_usage_file")
                && rendered.includes("used=1"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            record,
            summary: { totals: summary.totals, candidate_count: summary.candidate_count },
        };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile, usageFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupProjectMemoryImportContextSelfTest() {
    const groupId = `group-project-memory-import-context-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const projectRoot = path.join(utils_1.CCM_DIR, "tmp-project-memory-context-selftest", groupId);
    try {
        fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "PROJECT_MEMORY_CONTEXT_ROOT_SENTINEL: 子 Agent 处理 src/pay.ts 支付回调时必须读取项目 CLAUDE.md。\n", "utf-8");
        fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "pay.md"), [
            "---",
            "name: \"Pay Context Rule\"",
            "paths: [\"src/pay.ts\"]",
            "---",
            "PROJECT_MEMORY_CONTEXT_PAY_RULE_SENTINEL: src/pay.ts 必须保留验签。",
        ].join("\n"), "utf-8");
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "pmc-1", role: "user", target: "coordinator", content: "继续 src/pay.ts，必须使用项目 Claude 记忆。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "项目 Claude 记忆导入上下文自测",
            persistentRequirements: [{ messageId: "pmc-1", text: "src/pay.ts 必须使用项目记忆。" }],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 src/pay.ts 支付回调", {
            projectRoot,
            minKeepTokens: 1,
            maxTypedMemory: 10,
        });
        const rendered = String(bundle.rendered_text || "");
        const projectImport = bundle.group_state?.typedMemory?.projectMemoryImport || {};
        const checks = {
            importRecorded: projectImport.schema === "ccm-project-memory-import-v1"
                && projectImport.importedCount >= 2,
            renderedMentionsProjectImport: rendered.includes("项目记忆导入")
                && rendered.includes("CLAUDE"),
            rootClaudeInjected: rendered.includes("PROJECT_MEMORY_CONTEXT_ROOT_SENTINEL"),
            pathRuleInjected: rendered.includes("PROJECT_MEMORY_CONTEXT_PAY_RULE_SENTINEL"),
            loadPlanSeesImportedDocs: JSON.stringify(bundle.group_state?.typedMemory?.loadPlan || {}).includes("project-memory:api"),
            sourceManifestSeesTypedDocs: Number(bundle.source_manifest?.typedDocCount || 0) >= 3,
        };
        return { pass: Object.values(checks).every(Boolean), checks, imported: { importedCount: projectImport.importedCount, status: projectImport.status } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(projectRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupGlobalClaudeMemoryImportContextSelfTest() {
    const groupId = `group-global-claude-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-global-claude-context-selftest", groupId);
    const userRoot = path.join(root, "user-claude");
    const managedRoot = path.join(root, "managed-claude");
    try {
        fs.mkdirSync(path.join(userRoot, "rules"), { recursive: true });
        fs.mkdirSync(path.join(managedRoot, ".claude", "rules"), { recursive: true });
        fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), "GLOBAL_CLAUDE_CONTEXT_USER_SENTINEL: src/pay.ts 子 Agent 必须保留用户偏好。\n", "utf-8");
        fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), "GLOBAL_CLAUDE_CONTEXT_MANAGED_SENTINEL: managed policy imported for src/pay.ts child Agent.\n", "utf-8");
        fs.writeFileSync(path.join(userRoot, "rules", "pay.md"), [
            "---",
            "name: \"Global Pay User Rule\"",
            "paths: [\"src/pay.ts\"]",
            "---",
            "GLOBAL_CLAUDE_CONTEXT_PAY_RULE_SENTINEL: src/pay.ts 使用用户级支付规则。",
        ].join("\n"), "utf-8");
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "gcm-1", role: "user", target: "coordinator", content: "继续 src/pay.ts，必须使用全局 Claude 记忆。" },
        ]);
        saveGroupMemory(groupId, {
            goal: "全局 Claude 记忆导入上下文自测",
            persistentRequirements: [{ messageId: "gcm-1", text: "src/pay.ts 必须使用全局 Claude 记忆。" }],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 src/pay.ts 支付回调", {
            claudeUserRoot: userRoot,
            claudeManagedRoot: managedRoot,
            minKeepTokens: 1,
            maxTypedMemory: 10,
        });
        const rendered = String(bundle.rendered_text || "");
        const imported = bundle.group_state?.typedMemory?.globalClaudeMemoryImport || {};
        const checks = {
            importRecorded: imported.schema === "ccm-global-claude-memory-import-v1"
                && imported.importedCount >= 3,
            renderedMentionsGlobalImport: rendered.includes("全局 Claude 记忆导入"),
            userMemoryInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_USER_SENTINEL"),
            managedMemoryInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_MANAGED_SENTINEL"),
            pathRuleInjected: rendered.includes("GLOBAL_CLAUDE_CONTEXT_PAY_RULE_SENTINEL"),
            sourceManifestSeesGlobalDocs: Number(bundle.source_manifest?.typedDocCount || 0) >= 3,
        };
        return { pass: Object.values(checks).every(Boolean), checks, imported: { importedCount: imported.importedCount, status: imported.status } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupGlobalAgentMemoryBridgeContextSelfTest() {
    const groupId = `group-global-agent-memory-bridge-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-bridge-context");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const at = new Date().toISOString();
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase61_child_context_user",
                    text: "GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL: src/pay.ts 子 Agent 必须继承全局 Agent 的支付回调偏好，但执行前要核验当前代码。",
                    why: "验证全局 Agent 长期记忆会桥接进群聊项目子 Agent 记忆包。",
                    howToApply: "只在支付回调相关任务中提醒子 Agent 先核验 src/pay.ts 当前状态。",
                    importance: 98,
                    confidence: 0.99,
                    createdAt: at,
                    updatedAt: at,
                    source: {
                        sessionId: "phase61-global-session",
                        messageIds: ["phase61-global-message"],
                        source: "selftest",
                        timestamp: at,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [{
                    sessionId: "phase61-global-session",
                    summary: {
                        primaryRequest: "GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL payment callback preference",
                        filesAndResources: ["src/pay.ts"],
                        sourceMessageIds: ["phase61-global-message"],
                    },
                    boundary: {
                        type: "compact_boundary",
                        archiveId: "phase61-global-archive",
                        preservedMessageCount: 1,
                        preservedTokenCount: 120,
                        context_budget: { pressure: 7 },
                        post_compact_restore: {
                            recentMessageIds: ["phase61-global-message"],
                            filesAndResources: ["src/pay.ts"],
                        },
                    },
                }],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 1, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: at,
        });
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "ggam-1", role: "user", target: "coordinator", timestamp: at, content: "继续 GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL 的支付回调任务。" },
            { id: "ggam-2", role: "assistant", agent: "api", timestamp: at, content: "api 将检查 src/pay.ts。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证全局 Agent 长期记忆桥接到子 Agent 上下文",
            currentPhase: "phase61-global-agent-memory-bridge",
            persistentRequirements: [{ messageId: "ggam-1", text: "支付回调任务必须继承相关全局 Agent 记忆。" }],
            compaction: {
                health: "healthy",
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "phase61-global-agent-memory-bridge",
            },
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL src/pay.ts 支付回调", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            globalAgentSessionId: "phase61-global-session",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const rendered = String(bundle.rendered_text || "");
        const globalRecall = bundle.global_agent_memory || {};
        const healthGate = bundle.global_memory_health_gate || globalRecall.memory_health_gate || {};
        const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
        const ignoredRendered = String(ignored.rendered_text || "");
        const checks = {
            healthGateAllowsCleanGlobalMemory: healthGate.schema === "ccm-child-global-agent-memory-health-gate-v1"
                && healthGate.status === "ok"
                && healthGate.selftest_bypass === true
                && healthGate.action === "allow_global_agent_memory_recall_for_selftest_fixture",
            globalRecallStructured: globalRecall.schema === "ccm-child-global-agent-memory-recall-v1"
                && Number(globalRecall.itemCount || 0) >= 1
                && JSON.stringify(globalRecall.items || []).includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL"),
            renderedInjectsGlobalAgentMemory: rendered.includes("全局 Agent 长期记忆召回")
                && rendered.includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL")
                && rendered.includes("global_memory_id=gmi_phase61_child_context_user"),
            renderedMentionsHealthGate: rendered.includes("Global Agent memory health gate")
                && rendered.includes("allow_global_agent_memory_recall_for_selftest_fixture"),
            currentStateBoundaryRendered: rendered.includes("必须读取当前真实状态复核") || rendered.includes("必须读取当前真实状态"),
            sourceManifestTracksGlobalMemory: bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1"
                && (bundle.source_manifest.entries || []).some((entry) => entry.id === "global_agent_memory" && entry.exists === true),
            compactReferencesTrackGlobalMemory: (bundle.compact_file_references?.references || []).some((entry) => entry.type === "global_agent_memory_json" && entry.exists === true),
            reloadAuditCanUseGlobalReason: bundle.memory_reload_audit?.schema === "ccm-group-memory-reload-audit-v1"
                && ["global_agent_memory_recall", "context_bundle"].includes(String(bundle.memory_reload_audit.reason || "")),
            rawSourceExposesGlobalMemoryFile: bundle.raw_sources?.global_agent_memory_file === memory_1.GLOBAL_AGENT_MEMORY_FILE,
            ignoreMemorySuppressesGlobalAgentMemory: ignored.memory_policy?.ignored === true
                && !ignored.global_agent_memory
                && !ignoredRendered.includes("GLOBAL_AGENT_CHILD_CONTEXT_SENTINEL")
                && !ignoredRendered.includes("全局 Agent 长期记忆召回"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, globalRecall: { itemCount: globalRecall.itemCount, file: globalRecall.file } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupGlobalAgentMemoryHealthGateSelfTest() {
    const groupId = `group-global-agent-memory-health-gate-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-health-gate");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const at = new Date().toISOString();
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_health_gate_polluted",
                    text: "GLOBAL_AGENT_MEMORY_HEALTH_GATE_SENTINEL: this active selftest data must never be injected into child Agent context.",
                    why: "验证 active Global Agent memory 污染会阻断全局记忆召回。",
                    howToApply: "如果看到这条文本进入 rendered_text，就是健康门失败。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: at,
                    updatedAt: at,
                    source: {
                        sessionId: "health-gate-selftest",
                        messageIds: ["health-gate-message"],
                        source: "selftest",
                        timestamp: at,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: at,
        });
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "ggmh-1", role: "user", target: "coordinator", timestamp: at, content: "继续 Global Agent memory health gate 自测任务。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 Global Agent memory active 污染阻断子 Agent 注入",
            currentPhase: "global-memory-health-gate",
            persistentRequirements: [{ messageId: "ggmh-1", text: "active Global Agent memory 污染时不能向子 Agent 注入全局记忆内容。" }],
            compaction: { health: "healthy", compactedMessageCount: 1, preservedRecentMessages: 1 },
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 Global Agent memory health gate 阻断验证 src/health-gate.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
        });
        const rendered = String(bundle.rendered_text || "");
        const globalRecall = bundle.global_agent_memory || {};
        const healthGate = bundle.global_memory_health_gate || globalRecall.memory_health_gate || {};
        const checks = {
            healthGateFailsActivePollution: healthGate.schema === "ccm-child-global-agent-memory-health-gate-v1"
                && healthGate.status === "fail"
                && Number(healthGate.active_contamination_count || 0) >= 1,
            recallBlocked: globalRecall.reason === "global_agent_memory_health_gate_failed"
                && globalRecall.healthBlocked === true
                && Number(globalRecall.itemCount || 0) === 0,
            renderedBlocksGlobalMemory: rendered.includes("全局记忆健康门阻断")
                && rendered.includes("block_global_agent_memory_recall")
                && !rendered.includes("global_memory_id=gmi_health_gate_polluted"),
            contaminatedPreviewNotRendered: !rendered.includes("this active selftest data must never be injected")
                && !rendered.includes("GLOBAL_AGENT_MEMORY_HEALTH_GATE_SENTINEL"),
            sourceManifestStillAvailable: bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1",
            rawSourceStillTrackedForAudit: bundle.raw_sources?.global_agent_memory_file === memory_1.GLOBAL_AGENT_MEMORY_FILE,
        };
        return { pass: Object.values(checks).every(Boolean), checks, healthGate: { status: healthGate.status, active: healthGate.active_contamination_count } };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupGlobalAgentMemoryArbitrationContextSelfTest() {
    const groupId = `group-global-agent-memory-arbitration-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-arbitration-context");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const globalAt = "2026-07-07T01:00:00.000Z";
        const groupAt = "2026-07-07T02:00:00.000Z";
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase62_stale_global_rule",
                    text: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 必须使用旧全局支付规则 old-global-rule。",
                    why: "旧全局规则用于验证后续群聊证据可以降权全局记忆。",
                    howToApply: "如果任务涉及 src/arbitration.ts，使用 old-global-rule。",
                    importance: 98,
                    confidence: 0.99,
                    createdAt: globalAt,
                    updatedAt: globalAt,
                    source: {
                        sessionId: "phase62-global-session",
                        messageIds: ["phase62-global-message"],
                        source: "selftest",
                        timestamp: globalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: globalAt,
        });
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "ggaa-1", role: "user", target: "coordinator", timestamp: groupAt, content: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 不再使用旧全局支付规则 old-global-rule，改为 group-local-rule。" },
            { id: "ggaa-2", role: "assistant", agent: "api", timestamp: groupAt, content: "api 后续必须以 group-local-rule 为准。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证全局 Agent 记忆和群聊新证据冲突时要仲裁",
            currentPhase: "phase62-global-arbitration",
            persistentRequirements: [{
                    messageId: "ggaa-1",
                    text: "GLOBAL_AGENT_ARBITRATION_SENTINEL: src/arbitration.ts 不再使用旧全局支付规则 old-global-rule，改为 group-local-rule。",
                }],
            decisions: [{
                    messageId: "ggaa-1",
                    decision: "src/arbitration.ts 使用 group-local-rule",
                    reason: "群聊证据晚于全局记忆，并明确撤销 old-global-rule。",
                }],
        });
        buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_ARBITRATION_SENTINEL src/arbitration.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_ARBITRATION_SENTINEL src/arbitration.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const rendered = String(bundle.rendered_text || "");
        const globalRecall = bundle.global_agent_memory || {};
        const ledger = bundle.global_memory_arbitration_ledger || {};
        const arbitrationDistillation = bundle.group_state?.typedMemory?.arbitrationDistillation || {};
        const item = (globalRecall.items || []).find((row) => row.id === "gmi_phase62_stale_global_rule") || {};
        const arbitration = item.arbitration || {};
        const checks = {
            globalMemoryWasRecalled: Number(globalRecall.itemCount || 0) >= 1
                && JSON.stringify(globalRecall.items || []).includes("GLOBAL_AGENT_ARBITRATION_SENTINEL"),
            arbitrationDemotesGlobalRule: arbitration.demoted === true
                && arbitration.conflict === true
                && arbitration.status === "possible_conflict_with_newer_group_memory",
            summaryCountsConflict: globalRecall.arbitration?.status === "conflict"
                && Number(globalRecall.arbitration?.conflictCount || 0) >= 1,
            renderedShowsDemotion: rendered.includes("全局记忆仲裁规则")
                && rendered.includes("possible_conflict_with_newer_group_memory")
                && rendered.includes("local_evidence=group.")
                && rendered.includes("#ggaa-1"),
            renderedKeepsLocalRuleVisible: rendered.includes("group-local-rule")
                && rendered.includes("old-global-rule"),
            arbitrationLedgerPersistsConflict: ledger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
                && ledger.file === arbitrationLedgerFile
                && Number(ledger.conflictCount || 0) >= 1
                && Number(ledger.repeatedConflictCount || 0) >= 1
                && fs.existsSync(arbitrationLedgerFile),
            sourceManifestTracksArbitrationLedger: (bundle.source_manifest?.entries || []).some((entry) => entry.id === "global_memory_arbitration_ledger" && entry.exists === true),
            compactReferencesTrackArbitrationLedger: (bundle.compact_file_references?.references || []).some((entry) => entry.type === "global_memory_arbitration_ledger" && entry.exists === true),
            readPlanCanTargetArbitrationLedger: (bundle.compact_file_reference_read_plan?.entries || []).some((entry) => entry.type === "global_memory_arbitration_ledger" && entry.action === "read_for_global_group_memory_conflict_history"),
            repeatedConflictDistilledToTypedMemory: arbitrationDistillation.schema === "ccm-group-global-memory-arbitration-distillation-v1"
                && arbitrationDistillation.skipped === false
                && Number(arbitrationDistillation.candidateCount || 0) >= 1
                && fs.existsSync(arbitrationDistillation.write?.file || "")
                && String(fs.readFileSync(arbitrationDistillation.write?.file || "", "utf-8")).includes("GLOBAL_AGENT_ARBITRATION_SENTINEL"),
            renderedMentionsArbitrationDistillation: rendered.includes("全局记忆仲裁蒸馏")
                && rendered.includes("typed MEMORY.md"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, arbitration, ledger, arbitrationDistillation };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, arbitrationLedgerFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupGlobalAgentMemorySemanticArbitrationSelfTest() {
    const groupId = `group-global-agent-memory-semantic-arbitration-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-semantic-arbitration");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const globalAt = "2026-07-07T03:00:00.000Z";
        const groupAt = "2026-07-07T04:00:00.000Z";
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase70_semantic_rule",
                    text: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 必须使用 stripe-v1-policy 处理支付重试策略。",
                    why: "旧全局规则用于验证 semantic arbitration 能识别同一文件锚点下的规则替换。",
                    howToApply: "如果任务涉及 src/semantic-arbitration.ts，使用 stripe-v1-policy。",
                    importance: 98,
                    confidence: 0.99,
                    createdAt: globalAt,
                    updatedAt: globalAt,
                    source: {
                        sessionId: "phase70-global-session",
                        messageIds: ["phase70-global-message"],
                        source: "selftest",
                        timestamp: globalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: globalAt,
        });
        (0, storage_1.saveGroupMessages)(groupId, [
            { id: "phase70-semantic-1", role: "user", target: "coordinator", timestamp: groupAt, content: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 当前支付重试策略使用 ledger-v2-policy，stripe-v1-policy 只作为历史标签。" },
            { id: "phase70-semantic-2", role: "assistant", agent: "api", timestamp: groupAt, content: "api 后续核验 src/semantic-arbitration.ts 时以 ledger-v2-policy 为当前规则。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证语义级全局记忆仲裁评分",
            currentPhase: "phase70-semantic-arbitration",
            persistentRequirements: [{
                    messageId: "phase70-semantic-1",
                    text: "GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL: src/semantic-arbitration.ts 当前支付重试策略使用 ledger-v2-policy，stripe-v1-policy 只作为历史标签。",
                }],
            decisions: [{
                    messageId: "phase70-semantic-1",
                    decision: "src/semantic-arbitration.ts 使用 ledger-v2-policy",
                    reason: "群聊新证据晚于全局记忆，并给出了同一文件锚点下的当前规则名。",
                }],
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续 GLOBAL_AGENT_SEMANTIC_ARBITRATION_SENTINEL src/semantic-arbitration.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const rendered = String(bundle.rendered_text || "");
        const globalRecall = bundle.global_agent_memory || {};
        const item = (globalRecall.items || []).find((row) => row.id === "gmi_phase70_semantic_rule") || {};
        const arbitration = item.arbitration || {};
        const semanticRisk = arbitration.semanticRisk || {};
        const decisiveEvidence = Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : [];
        const ledger = bundle.global_memory_arbitration_ledger || {};
        const rawLedger = fs.existsSync(arbitrationLedgerFile) ? JSON.parse(fs.readFileSync(arbitrationLedgerFile, "utf-8")) : {};
        const ledgerEntry = (rawLedger.entries || []).find((entry) => entry.globalMemoryId === "gmi_phase70_semantic_rule") || {};
        const checks = {
            globalMemoryWasRecalled: Number(globalRecall.itemCount || 0) >= 1
                && item.id === "gmi_phase70_semantic_rule",
            semanticRiskScoresConflict: Number(arbitration.semanticRiskScore || semanticRisk.score || 0) >= 60
                && semanticRisk.level !== "none"
                && (semanticRisk.reasons || []).includes("different_named_rule"),
            arbitrationDemotesViaSemanticConflict: arbitration.demoted === true
                && arbitration.conflict === true
                && arbitration.status === "possible_conflict_with_newer_group_memory",
            decisiveEvidenceCarriesSemanticReasons: decisiveEvidence.some((evidence) => Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0) >= 60
                && (evidence.semanticReasons || evidence.semanticRisk?.reasons || []).includes("current_local_rule_differs")),
            renderedShowsSemanticRisk: rendered.includes("semantic_risk=")
                && rendered.includes("semantic_reasons=")
                && rendered.includes("different_named_rule")
                && rendered.includes("ledger-v2-policy")
                && rendered.includes("stripe-v1-policy"),
            ledgerPersistsSemanticRisk: ledger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
                && Number(ledger.semanticRiskCount || 0) >= 1
                && Number(ledger.maxSemanticRiskScore || 0) >= 60
                && Number(ledgerEntry.semanticRiskScore || 0) >= 60
                && (ledgerEntry.semanticReasons || []).includes("different_named_rule"),
            sourceManifestTracksArbitrationLedger: (bundle.source_manifest?.entries || []).some((entry) => entry.id === "global_memory_arbitration_ledger" && entry.exists === true),
            compactReferencesTrackArbitrationLedger: (bundle.compact_file_references?.references || []).some((entry) => entry.type === "global_memory_arbitration_ledger" && entry.exists === true),
        };
        return { pass: Object.values(checks).every(Boolean), checks, arbitration, ledger, ledgerEntry };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, arbitrationLedgerFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest() {
    const suffix = `${process.pid}-${Date.now().toString(36)}`;
    const groupA = `group-global-agent-memory-cross-group-source-${suffix}`;
    const groupB = `group-global-agent-memory-cross-group-target-${suffix}`;
    const cleanupFiles = [groupA, groupB].flatMap(groupId => [
        getGroupMessagesFileHint(groupId),
        `${getGroupMessagesFileHint(groupId)}.bak`,
        getGroupMemoryFile(groupId),
        `${getGroupMemoryFile(groupId)}.bak`,
        getGroupMemoryReloadLedgerFile(groupId),
        `${getGroupMemoryReloadLedgerFile(groupId)}.bak`,
        getGroupGlobalMemoryArbitrationLedgerFile(groupId),
        `${getGroupGlobalMemoryArbitrationLedgerFile(groupId)}.bak`,
    ]);
    const cleanupDirs = [(0, group_memory_index_1.getGroupTypedMemoryDir)(groupA), (0, group_memory_index_1.getGroupTypedMemoryDir)(groupB)];
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-cross-group-suppression");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const globalAt = "2026-07-07T05:00:00.000Z";
        const sourceGroupAt = "2026-07-07T06:00:00.000Z";
        const targetGroupAt = "2026-07-07T07:00:00.000Z";
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase67_cross_group_stale_rule",
                    text: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 必须使用 old-cross-group-rule。",
                    why: "旧全局规则用于验证其他群聊已判定过时后，新的群聊子 Agent 包会谨慎降权。",
                    howToApply: "如果任务涉及 src/cross-group.ts，直接使用 old-cross-group-rule。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: globalAt,
                    updatedAt: globalAt,
                    source: {
                        sessionId: "phase67-global-session",
                        messageIds: ["phase67-global-message"],
                        source: "selftest",
                        timestamp: globalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: globalAt,
        });
        (0, storage_1.saveGroupMessages)(groupA, [
            { id: "phase67-a-1", role: "user", target: "coordinator", timestamp: sourceGroupAt, content: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 不再使用 old-cross-group-rule，改为 fresh-cross-group-rule。" },
        ]);
        saveGroupMemory(groupA, {
            groupId: groupA,
            goal: "验证跨群聊全局记忆抑制的来源群聊",
            currentPhase: "phase67-cross-group-source",
            persistentRequirements: [{
                    messageId: "phase67-a-1",
                    text: "GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-group.ts 不再使用 old-cross-group-rule，改为 fresh-cross-group-rule。",
                }],
            decisions: [{
                    messageId: "phase67-a-1",
                    decision: "src/cross-group.ts 使用 fresh-cross-group-rule",
                    reason: "群聊 A 的新证据明确撤销旧全局规则。",
                }],
        });
        const sourceBundle = buildAgentMemoryContextBundle(groupA, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-group.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const sourceLedger = sourceBundle.global_memory_arbitration_ledger || {};
        (0, storage_1.saveGroupMessages)(groupB, [
            { id: "phase67-b-1", role: "user", target: "coordinator", timestamp: targetGroupAt, content: "继续 src/cross-group.ts，本群聊需要先核验当前真实状态。" },
        ]);
        saveGroupMemory(groupB, {
            groupId: groupB,
            goal: "验证跨群聊全局记忆抑制的目标群聊",
            currentPhase: "phase67-cross-group-target",
            completed: [{ project: "api", summary: "准备检查 src/cross-group.ts 当前实现。" }],
        });
        const targetBundle = buildAgentMemoryContextBundle(groupB, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-group.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            crossGroupGlobalMemoryConflictGroupThreshold: 1,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const rendered = String(targetBundle.rendered_text || "");
        const globalRecall = targetBundle.global_agent_memory || {};
        const item = (globalRecall.items || []).find((row) => row.id === "gmi_phase67_cross_group_stale_rule") || {};
        const cross = item.crossGroupSuppression || {};
        const arbitration = item.arbitration || {};
        const checks = {
            sourceGroupRecordedConflict: sourceLedger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
                && Number(sourceLedger.conflictCount || 0) >= 1
                && fs.existsSync(getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
            targetRecallsSameGlobalMemory: Number(globalRecall.itemCount || 0) >= 1
                && item.id === "gmi_phase67_cross_group_stale_rule",
            targetSuppressesByCrossGroupLedger: cross.suppressed === true
                && Number(cross.conflictGroupCount || 0) >= 1
                && (cross.sourceLedgers || []).some((entry) => entry.file === getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
            arbitrationDemotesWithoutLocalConflict: ["suppressed_by_cross_group_arbitration", "demoted_by_newer_group_evidence"].includes(arbitration.status)
                && arbitration.demoted === true
                && arbitration.conflict === false
                && arbitration.crossGroupSuppressed === true,
            recallSummaryCountsCrossGroupSuppression: Number(globalRecall.arbitration?.crossGroupSuppressedCount || 0) >= 1
                && globalRecall.reason === "global_memory_suppressed_by_cross_group_arbitration",
            renderedWarnsChildAgent: rendered.includes("跨群聊全局记忆抑制")
                && rendered.includes("cross_group_suppression=background_only")
                && rendered.includes("background"),
            sourceManifestTracksCrossGroupLedgerDir: (targetBundle.source_manifest?.entries || []).some((entry) => entry.id === "global_memory_cross_group_arbitration" && entry.exists === true),
            compactReferencesTrackCrossGroupLedgerDir: (targetBundle.compact_file_references?.references || []).some((entry) => entry.type === "global_memory_cross_group_arbitration" && entry.exists === true),
            readPlanTargetsCrossGroupSuppression: (targetBundle.compact_file_reference_read_plan?.entries || []).some((entry) => entry.type === "global_memory_cross_group_arbitration" && entry.action === "read_for_cross_group_global_memory_suppression"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            crossGroupSuppression: cross,
            arbitration,
            sourceLedger,
            targetSummary: globalRecall.crossGroupSuppression || {},
        };
    }
    finally {
        for (const file of cleanupFiles) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest() {
    const suffix = `${process.pid}-${Date.now().toString(36)}`;
    const groupA = `group-global-agent-memory-freshness-source-${suffix}`;
    const groupB = `group-global-agent-memory-freshness-target-${suffix}`;
    const cleanupFiles = [groupA, groupB].flatMap(groupId => [
        getGroupMessagesFileHint(groupId),
        `${getGroupMessagesFileHint(groupId)}.bak`,
        getGroupMemoryFile(groupId),
        `${getGroupMemoryFile(groupId)}.bak`,
        getGroupMemoryReloadLedgerFile(groupId),
        `${getGroupMemoryReloadLedgerFile(groupId)}.bak`,
        getGroupGlobalMemoryArbitrationLedgerFile(groupId),
        `${getGroupGlobalMemoryArbitrationLedgerFile(groupId)}.bak`,
    ]);
    const cleanupDirs = [(0, group_memory_index_1.getGroupTypedMemoryDir)(groupA), (0, group_memory_index_1.getGroupTypedMemoryDir)(groupB)];
    const releaseGlobalMemorySelftest = (0, memory_1.acquireGlobalAgentMemorySelfTestLock)("group-global-agent-memory-cross-group-freshness");
    const previousGlobalMemory = fs.existsSync(memory_1.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const oldGlobalAt = "2026-07-07T05:00:00.000Z";
        const sourceAt = "2026-07-07T06:00:00.000Z";
        const newerGlobalAt = new Date(Date.now() + 60_000).toISOString();
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase68_cross_group_freshness_rule",
                    text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 必须使用 stale-freshness-rule。",
                    why: "旧全局规则用于验证 cross-group suppression freshness。",
                    howToApply: "旧规则：直接使用 stale-freshness-rule。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: oldGlobalAt,
                    updatedAt: oldGlobalAt,
                    source: {
                        sessionId: "phase68-old-global-session",
                        messageIds: ["phase68-old-global-message"],
                        source: "selftest",
                        timestamp: oldGlobalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: oldGlobalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: oldGlobalAt,
        });
        (0, storage_1.saveGroupMessages)(groupA, [
            { id: "phase68-a-1", role: "user", target: "coordinator", timestamp: sourceAt, content: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 不再使用 stale-freshness-rule，改为 source-group-rule。" },
        ]);
        saveGroupMemory(groupA, {
            groupId: groupA,
            goal: "验证跨群聊抑制新鲜度的来源群聊",
            currentPhase: "phase68-freshness-source",
            persistentRequirements: [{
                    messageId: "phase68-a-1",
                    text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 不再使用 stale-freshness-rule，改为 source-group-rule。",
                }],
        });
        const sourceBundle = buildAgentMemoryContextBundle(groupA, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL src/freshness.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const sourceLedger = sourceBundle.global_memory_arbitration_ledger || {};
        writeJsonAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_phase68_cross_group_freshness_rule",
                    text: "GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL: src/freshness.ts 已更新为 verified-global-rule；旧跨群聊冲突只能作为 advisory。",
                    why: "同一 Global Agent memory id 在跨群聊冲突之后被重新写入，应覆盖旧 suppression。",
                    howToApply: "使用 verified-global-rule 前仍读取当前代码和当前群聊证据。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: oldGlobalAt,
                    updatedAt: newerGlobalAt,
                    source: {
                        sessionId: "phase68-new-global-session",
                        messageIds: ["phase68-new-global-message"],
                        source: "selftest",
                        timestamp: newerGlobalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: newerGlobalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: newerGlobalAt,
        });
        (0, storage_1.saveGroupMessages)(groupB, [
            { id: "phase68-b-1", role: "user", target: "coordinator", timestamp: newerGlobalAt, content: "继续 freshness 目标群聊，按当前来源核验。" },
        ]);
        saveGroupMemory(groupB, {
            groupId: groupB,
            goal: "验证跨群聊抑制被新全局记忆覆盖",
            currentPhase: "phase68-freshness-target",
        });
        const targetBundle = buildAgentMemoryContextBundle(groupB, "api", "继续 GLOBAL_AGENT_CROSS_GROUP_FRESHNESS_SENTINEL src/freshness.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            crossGroupGlobalMemoryConflictGroupThreshold: 1,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const rendered = String(targetBundle.rendered_text || "");
        const globalRecall = targetBundle.global_agent_memory || {};
        const item = (globalRecall.items || []).find((row) => row.id === "gmi_phase68_cross_group_freshness_rule") || {};
        const cross = item.crossGroupSuppression || {};
        const freshness = cross.freshness || {};
        const arbitration = item.arbitration || {};
        const checks = {
            sourceGroupRecordedConflict: sourceLedger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
                && Number(sourceLedger.conflictCount || 0) >= 1
                && fs.existsSync(getGroupGlobalMemoryArbitrationLedgerFile(groupA)),
            targetRecallsUpdatedGlobalMemory: Number(globalRecall.itemCount || 0) >= 1
                && item.id === "gmi_phase68_cross_group_freshness_rule"
                && JSON.stringify(globalRecall.items || []).includes("verified-global-rule"),
            suppressionDowngradedToAdvisory: cross.suppressed === false
                && cross.advisory === true
                && cross.reason === "cross_group_evidence_superseded_by_newer_global_memory"
                && freshness.supersededByNewerGlobalMemory === true
                && Number(freshness.globalNewerByMs || 0) > 0,
            arbitrationDoesNotCrossGroupSuppress: arbitration.crossGroupSuppressed === false
                && arbitration.status === "active_global_context",
            recallSummaryCountsFreshness: Number(globalRecall.crossGroupSuppression?.advisoryCount || 0) >= 1
                && Number(globalRecall.crossGroupSuppression?.supersededCount || 0) >= 1
                && Number(globalRecall.crossGroupSuppression?.suppressedCount || 0) === 0,
            renderedShowsFreshnessAdvisory: rendered.includes("跨群聊抑制新鲜度")
                && rendered.includes("cross_group_suppression=advisory")
                && rendered.includes("superseded=true"),
            sourceManifestTracksCrossGroupLedgerDir: (targetBundle.source_manifest?.entries || []).some((entry) => entry.id === "global_memory_cross_group_arbitration" && entry.exists === true),
            compactReferencesTrackCrossGroupLedgerDir: (targetBundle.compact_file_references?.references || []).some((entry) => entry.type === "global_memory_cross_group_arbitration" && entry.exists === true),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            crossGroupSuppression: cross,
            arbitration,
            sourceLedger,
            targetSummary: globalRecall.crossGroupSuppression || {},
        };
    }
    finally {
        for (const file of cleanupFiles) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            if (previousGlobalMemory === null)
                fs.rmSync(memory_1.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                writeTextAtomic(memory_1.GLOBAL_AGENT_MEMORY_FILE, previousGlobalMemory);
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                writeTextAtomic(`${memory_1.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousGlobalMemoryBak);
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runGroupTypedMemoryContextSelfTest() {
    const groupId = `typed-memory-context-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messageFile = getGroupMessagesFileHint(groupId);
    const memoryFile = getGroupMemoryFile(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const reloadFile = getGroupMemoryReloadLedgerFile(groupId);
    const dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    try {
        (0, storage_1.saveGroupMessages)(groupId, Array.from({ length: 18 }, (_, index) => ({
            id: `tm-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? "必须保留 IDEMPOTENCY_CONTEXT_SENTINEL，支付回调不能跳过验签。"
                : `类型化记忆上下文测试 ${index}，涉及 src/pay.ts 和 npm run check。`,
        })));
        saveGroupMemory(groupId, {
            goal: "支付回调 typed memory 上下文自测",
            persistentRequirements: [{ messageId: "tm-0", text: "必须保留 IDEMPOTENCY_CONTEXT_SENTINEL，支付回调不能跳过验签。" }],
            decisions: [{ decision: "使用 webhook idempotency key", reason: "避免重复入账" }],
            blocked: [{ project: "api", reason: "验签测试失败，需要继续修复" }],
            factAnchors: [{ id: "tm-fact", type: "user_requirement", messageId: "tm-0", text: "src/pay.ts 是支付回调核心文件" }],
            compaction: {
                postCompactReinject: {
                    hasCandidates: true,
                    files: [{ value: "src/pay.ts", sourceMessageId: "tm-1" }],
                    verification: [{ value: "npm run check", sourceMessageId: "tm-2" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    action: "safe_to_inject_child_agent_memory_packet",
                    passedChecks: 11,
                    checkCount: 11,
                    failedChecks: [],
                    transcriptPath: "typed-context-raw.json",
                    candidateCounts: { files: 1, skills: 0, verification: 1, blockers: 0 },
                },
                partialSegments: [{
                        schema: "ccm-group-partial-compact-segment-v1",
                        direction: "range",
                        range: { fromMessageId: "tm-4", throughMessageId: "tm-8", messageCount: 5 },
                        quality: { score: 96, status: "pass", pass: true },
                        summaryChecksum: "partial-sidecar-context-test",
                    }],
                ptlEmergency: {
                    schema: "ccm-group-ptl-emergency-v1",
                    version: 1,
                    engaged: true,
                    emergencyLevel: "critical",
                    reason: "context-selftest-pressure",
                    triggerTokens: 137000,
                    messageDigestMaxChars: 700,
                    rawTranscriptPath: "typed-context-raw.json",
                },
            },
        });
        const typedIndex = (0, group_memory_index_1.runGroupTypedMemoryIndexSelfTest)();
        (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "pay-path-context-rule",
            name: "Pay path context rule",
            description: "Only applies to src/pay.ts context bundles.",
            source: "selftest:path-condition",
            paths: ["src/pay.ts"],
            body: "PATH_CONTEXT_RULE_PAY_SENTINEL：src/pay.ts 子 Agent 必须优先验签和幂等。",
        });
        (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "reference",
            slug: "search-path-context-rule",
            name: "Search path context rule",
            description: "Only applies to search files.",
            source: "selftest:path-condition",
            paths: ["src/search/**/*.ts"],
            body: "PATH_CONTEXT_RULE_SEARCH_SENTINEL：搜索任务专用，支付任务不应注入。",
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "继续支付回调 IDEMPOTENCY_CONTEXT_SENTINEL src/pay.ts npm run check", { minKeepTokens: 1 });
        const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "继续支付回调 IDEMPOTENCY_CONTEXT_SENTINEL src/pay.ts npm run check", { minKeepTokens: 1 });
        const ignored = buildAgentMemoryContextBundle(groupId, "api", "本轮请忽略记忆，只处理当前任务");
        const recall = bundle.group_state?.typedMemory?.recall || {};
        const secondRecall = secondBundle.group_state?.typedMemory?.recall || {};
        const ignoredRecall = ignored.group_state?.typedMemory?.recall || {};
        const checks = {
            typedIndexSelfTestPasses: typedIndex.pass === true,
            syncCreatesIndex: !!bundle.group_state?.typedMemory?.sync?.indexFile && fs.existsSync(bundle.group_state.typedMemory.sync.indexFile),
            recallsTypedMemory: Array.isArray(recall.recalled) && recall.recalled.length > 0,
            recallFindsSentinel: JSON.stringify(recall.recalled || []).includes("IDEMPOTENCY_CONTEXT_SENTINEL"),
            renderedInjectsTypedMemory: String(bundle.rendered_text || "").includes("类型化长期记忆") && String(bundle.rendered_text || "").includes("src/pay.ts"),
            distillationRunsForContextBundle: bundle.group_state?.typedMemory?.distillation?.schema === "ccm-group-typed-memory-distillation-v1"
                && Number(bundle.group_state.typedMemory.distillation.candidateCount || 0) > 0,
            renderedMentionsDistillation: String(bundle.rendered_text || "").includes("长期日志蒸馏"),
            renderedMentionsDistillationQuality: String(bundle.rendered_text || "").includes("长期日志蒸馏质量"),
            renderedMentionsSourceManifest: String(bundle.rendered_text || "").includes("记忆源 manifest")
                && bundle.source_manifest?.schema === "ccm-group-memory-source-manifest-v1"
                && bundle.source_manifest?.status === "pass",
            renderedMentionsReloadAudit: String(bundle.rendered_text || "").includes("记忆 reload 审计")
                && bundle.memory_reload_audit?.schema === "ccm-group-memory-reload-audit-v1",
            renderedMentionsTypedLoadPlan: String(bundle.rendered_text || "").includes("类型化 MEMORY.md 加载计划")
                && bundle.group_state?.typedMemory?.loadPlan?.schema === "ccm-group-typed-memory-load-plan-v1"
                && bundle.group_state.typedMemory.loadPlan.status === "pass",
            pathConditionalMemoryHonored: String(bundle.rendered_text || "").includes("PATH_CONTEXT_RULE_PAY_SENTINEL")
                && !String(bundle.rendered_text || "").includes("PATH_CONTEXT_RULE_SEARCH_SENTINEL")
                && Number(bundle.group_state?.typedMemory?.recall?.conditionalSkipped || 0) >= 1,
            renderedMentionsPostCompactRecoveryAudit: String(bundle.rendered_text || "").includes("压缩后恢复审计")
                && String(bundle.rendered_text || "").includes("safe_to_inject_child_agent_memory_packet"),
            postCompactReinjectionGateRecorded: bundle.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1"
                && bundle.post_compact_reinjection_gate?.candidate_count >= 1,
            renderedMentionsPostCompactReinjectionGate: String(bundle.rendered_text || "").includes("压缩后重注入门禁")
                && !!bundle.post_compact_reinjection_gate?.reinjection_gate_id
                && String(bundle.rendered_text || "").includes(bundle.post_compact_reinjection_gate.reinjection_gate_id),
            renderedMentionsReinjectionCandidateIds: String(bundle.rendered_text || "").includes("candidate_id=pcrc_"),
            postCompactDispatchMarkerRecorded: bundle.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && bundle.post_compact_dispatch_marker?.first_dispatch_after_compact === true
                && secondBundle.post_compact_dispatch_marker?.dispatch_sequence === 2,
            renderedMentionsPostCompactDispatchMarker: String(bundle.rendered_text || "").includes("压缩后派发标记")
                && String(bundle.rendered_text || "").includes(bundle.post_compact_dispatch_marker?.marker_id || "missing-marker"),
            renderedMentionsPartialSidecar: String(bundle.rendered_text || "").includes("选择性压缩 sidecar")
                && String(bundle.rendered_text || "").includes("tm-4"),
            ptlRecoveryRendered: bundle.compaction?.ptlRecovery?.schema === "ccm-group-ptl-recovery-v1"
                && String(bundle.rendered_text || "").includes("PTL 自动恢复")
                && !bundle.compaction?.ptlEmergency,
            ledgerDedupesSecondRecall: Array.isArray(secondRecall.recalled) && secondRecall.recalled.length < recall.recalled.length,
            ledgerRecordedSurfaced: Array.isArray(bundle.group_state?.typedMemory?.ledger?.recordedThisTurn) && bundle.group_state.typedMemory.ledger.recordedThisTurn.length > 0,
            ignoreMemoryHonoredForTypedRecall: ignoredRecall.ignored === true && Array.isArray(ignoredRecall.recalled) && ignoredRecall.recalled.length === 0
                && String(ignored.rendered_text || "").includes("忽略记忆"),
            ignoreMemoryRenderedWithoutOldFacts: !String(ignored.rendered_text || "").includes("IDEMPOTENCY_CONTEXT_SENTINEL")
                && !String(ignored.rendered_text || "").includes("src/pay.ts")
                && !String(ignored.rendered_text || "").includes("类型化长期记忆（MEMORY.md"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, recalled: (recall.recalled || []).map((item) => item.relPath) };
    }
    finally {
        for (const file of [messageFile, `${messageFile}.bak`, memoryFile, `${memoryFile}.bak`, reloadFile, dispatchFile]) {
            try {
                fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function getGroupMessageMemoryWho(message) {
    if (message?.role === "user")
        return `[用户 -> ${message.target || "all"}]`;
    if (message?.role === "thinking")
        return "[系统思考]";
    return `[${message?.agent || "Agent"}]`;
}
function buildGroupMessageMemoryLine(message, max = 260) {
    const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
    const id = message?.id ? `#${message.id}` : "#local";
    const who = getGroupMessageMemoryWho(message);
    const content = compactMemoryText(message?.content || message?.delivery_summary?.headline || "", max);
    const extras = [];
    if (Array.isArray(message?.assignments) && message.assignments.length) {
        extras.push(`派发:${message.assignments.slice(0, 4).map((item) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
    }
    if (message?.fileChanges?.count)
        extras.push(`文件变更:${message.fileChanges.count}`);
    if (message?.delivery_summary?.headline)
        extras.push(`交付:${compactMemoryText(message.delivery_summary.headline, 120)}`);
    return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}
function buildCompressedGroupMessageDigest(messages, limit = 30) {
    const source = (messages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    if (!source.length)
        return "";
    const omitted = Math.max(0, source.length - limit);
    const lines = source.slice(-limit).map((message) => buildGroupMessageMemoryLine(message, 220));
    if (omitted > 0)
        lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
    return lines.join("\n");
}
function buildGroupContextPacket(groupId, options = {}) {
    const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
    const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
    const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
    const allMessages = (0, storage_1.getGroupMessages)(groupId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const recentMessages = allMessages.slice(-recentLimit);
    const olderMessages = allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
    const snapshotMemory = refreshGroupConversationMemorySnapshot(groupId, allMessages, loadGroupMemory(groupId), {
        recentLimit,
        olderLimit,
    });
    const fallbackDigest = buildCompressedGroupMessageDigest(olderMessages, olderLimit);
    const digest = snapshotMemory.messageDigest || fallbackDigest;
    const compression = {
        enabled: true,
        strategy: snapshotMemory.messageCompression?.strategy || "cc-session-memory-v3-sync",
        recentLimit,
        olderLimit,
        totalMessages: allMessages.length,
        compressedMessages: snapshotMemory.messageCompression?.compressedMessages ?? olderMessages.length,
        recentMessages: recentMessages.length,
        preCompactTokenCount: snapshotMemory.messageCompression?.preCompactTokenCount || 0,
        postCompactTokenCount: snapshotMemory.messageCompression?.postCompactTokenCount || 0,
        lastCompressedAt: new Date().toISOString(),
    };
    const memory = saveGroupMemory(groupId, {
        ...snapshotMemory,
        messageDigest: digest,
        messageCompression: compression,
    });
    const sections = [buildGroupMemoryContext(memory)];
    if (digest) {
        sections.push([
            "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
            digest,
        ].join("\n"));
    }
    if (recentMessages.length) {
        sections.push([
            `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
            (0, group_memory_compaction_1.buildBoundedRecentGroupContext)(recentMessages, fullCount),
        ].join("\n"));
    }
    return sections.filter(Boolean).join("\n\n");
}
function normalizeMemoryStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function normalizeWorkerLedgerItem(item = {}) {
    return {
        time: item.time || new Date().toISOString(),
        taskId: String(item.taskId || item.task_id || "").trim(),
        project: String(item.project || item.agent || "").trim(),
        status: String(item.status || "").trim(),
        receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
        summary: compactMemoryText(item.summary || "", 320),
        filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
        verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
        blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
        needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
        memoryUsed: normalizeMemoryStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
        memoryIgnored: normalizeMemoryStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
    };
}
function findLatestWorkerLedger(memory, project) {
    const target = String(project || "").trim();
    if (!target)
        return null;
    return [...(memory?.workerLedger || [])].reverse().find((item) => item.project === target) || null;
}
function appendWorkerLedger(memory, item) {
    const normalized = normalizeWorkerLedgerItem(item);
    if (!normalized.project && !normalized.summary)
        return memory;
    return {
        ...(memory || {}),
        workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x) => [
            x.taskId || "",
            x.project || "",
            x.status || "",
            x.summary || "",
        ].join("|"), 40),
    };
}
function updateGroupMemory(groupId, patch = {}) {
    const memory = loadGroupMemory(groupId);
    const next = { ...memory };
    if (patch.goal && !next.goal)
        next.goal = compactMemoryText(patch.goal, 500);
    if (patch.currentPhase)
        next.currentPhase = patch.currentPhase;
    if (patch.decision) {
        next.decisions = uniqueByKey([...(next.decisions || []), {
                time: new Date().toISOString(),
                decision: compactMemoryText(patch.decision, 260),
                reason: compactMemoryText(patch.reason || "", 220),
            }], (item) => `${item.decision}|${item.reason}`, 20);
    }
    if (patch.completed) {
        const item = patch.completed;
        next.completed = uniqueByKey([...(next.completed || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                summary: compactMemoryText(item.summary || "", 260),
                filesChanged: item.filesChanged || [],
                verification: item.verification || [],
            }], (x) => `${x.project}|${x.summary}`, 30);
        next.blocked = (next.blocked || []).filter((x) => x.project !== item.project);
    }
    if (patch.blocked) {
        const item = patch.blocked;
        next.blocked = uniqueByKey([...(next.blocked || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                reason: compactMemoryText(item.reason || "", 260),
                needs: item.needs || [],
            }], (x) => `${x.project}|${x.reason}`, 30);
    }
    if (patch.messageDigest) {
        next.messageDigest = compactMemoryText([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
    }
    if (patch.messageCompression) {
        next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
    }
    if (patch.workerLedger || patch.workerNotification) {
        const item = patch.workerLedger || patch.workerNotification;
        const merged = appendWorkerLedger(next, item);
        next.workerLedger = merged.workerLedger || [];
        next.agentMemories = upsertAgentMemory(next.agentMemories || {}, item);
    }
    if (patch.openQuestion) {
        next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
                time: new Date().toISOString(),
                question: compactMemoryText(patch.openQuestion, 260),
            }], (x) => x.question, 20);
    }
    if (patch.nextAction) {
        next.nextActions = uniqueByKey([...(next.nextActions || []), {
                time: new Date().toISOString(),
                action: compactMemoryText(patch.nextAction, 260),
            }], (x) => x.action, 20);
    }
    return saveGroupMemory(groupId, next);
}
//# sourceMappingURL=memory.js.map