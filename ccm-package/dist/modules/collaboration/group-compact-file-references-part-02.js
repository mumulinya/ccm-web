"use strict";
// Behavior-freeze split from group-compact-file-references.ts (part 2/3).
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
exports.recordGroupPostCompactCandidateUsageLedger = recordGroupPostCompactCandidateUsageLedger;
exports.buildGroupPostCompactCandidateUsageSummary = buildGroupPostCompactCandidateUsageSummary;
exports.normalizeApiMicrocompactNativeApplyProofStatus = normalizeApiMicrocompactNativeApplyProofStatus;
exports.buildApiMicrocompactNativeApplyProofEntry = buildApiMicrocompactNativeApplyProofEntry;
exports.apiMicrocompactNativeApplyProofStatsKey = apiMicrocompactNativeApplyProofStatsKey;
exports.apiMicrocompactNativeApplyProofTotals = apiMicrocompactNativeApplyProofTotals;
exports.normalizeApiMicrocompactNativeApplyTelemetryStatus = normalizeApiMicrocompactNativeApplyTelemetryStatus;
exports.buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow = buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow;
exports.recordGroupApiMicrocompactNativeApplyAdapterTelemetry = recordGroupApiMicrocompactNativeApplyAdapterTelemetry;
exports.buildApiMicrocompactNativeApplyTelemetryEntry = buildApiMicrocompactNativeApplyTelemetryEntry;
exports.apiMicrocompactNativeApplyTelemetryTotals = apiMicrocompactNativeApplyTelemetryTotals;
exports.apiMicrocompactNativeApplyTelemetrySourceCounts = apiMicrocompactNativeApplyTelemetrySourceCounts;
exports.apiMicrocompactNativeApplyTelemetryStatsKey = apiMicrocompactNativeApplyTelemetryStatsKey;
exports.recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger = recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger;
exports.apiMicrocompactNativeApplyTelemetryMatchesProof = apiMicrocompactNativeApplyTelemetryMatchesProof;
exports.enrichApiMicrocompactNativeApplyProofWithTelemetry = enrichApiMicrocompactNativeApplyProofWithTelemetry;
exports.buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary = buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary;
exports.recordGroupApiMicrocompactNativeApplyProofLedger = recordGroupApiMicrocompactNativeApplyProofLedger;
exports.buildGroupApiMicrocompactNativeApplyProofSummary = buildGroupApiMicrocompactNativeApplyProofSummary;
exports.buildSourceManifestSnapshot = buildSourceManifestSnapshot;
exports.diffSourceManifestSnapshots = diffSourceManifestSnapshots;
exports.recordGroupMemoryReloadAudit = recordGroupMemoryReloadAudit;
const crypto = __importStar(require("crypto"));
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const group_compact_file_references_part_01_1 = require("./group-compact-file-references-part-01");
function recordGroupPostCompactCandidateUsageLedger(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
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
        .filter((row) => row && row.usage_state !== "unreferenced" && (row.referenced === true || ["used", "ignored", "verified", "mentioned"].includes((0, group_memory_shared_1.normalizePostCompactUsageState)(row.usage_state || row.usageState))))
        .map((row) => (0, group_compact_file_references_part_01_1.buildPostCompactCandidateEntry)(groupId, input, row))
        .filter(Boolean);
    const file = (0, group_compact_file_references_part_01_1.getGroupPostCompactCandidateUsageLedgerFile)(groupId, groupSessionId);
    if (!entries.length) {
        const ledger = (0, group_compact_file_references_part_01_1.readGroupPostCompactCandidateUsageLedger)(groupId, groupSessionId);
        return {
            schema: "ccm-group-post-compact-candidate-usage-record-v1",
            groupId,
            groupSessionId,
            file,
            skipped: true,
            reason: "no_candidate_usage_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = (0, group_compact_file_references_part_01_1.readGroupPostCompactCandidateUsageLedger)(groupId, groupSessionId);
    const seen = new Set((ledger.entries || []).map((entry) => entry.entry_id));
    const newEntries = entries.filter((entry) => !seen.has(entry.entry_id));
    const stats = ledger.stats || {};
    for (const entry of newEntries) {
        const key = (0, group_compact_file_references_part_01_1.postCompactCandidateStatsKey)(entry, entry.target_project);
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
        current.recommendation = (0, group_memory_shared_1.usageRecommendationForStats)(current);
        stats[key] = current;
    }
    const allEntries = [...(ledger.entries || []), ...newEntries].slice(-240);
    const totals = allEntries.reduce((acc, entry) => {
        const state = (0, group_memory_shared_1.normalizePostCompactUsageState)(entry.usage_state);
        if (state)
            acc[state] = Number(acc[state] || 0) + 1;
        acc.total += 1;
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    const updatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    (0, group_compact_file_references_part_01_1.writeGroupPostCompactCandidateUsageLedger)(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    }, groupSessionId);
    return {
        schema: "ccm-group-post-compact-candidate-usage-record-v1",
        groupId,
        groupSessionId,
        file,
        recorded_count: newEntries.length,
        duplicate_count: entries.length - newEntries.length,
        totals,
        updatedAt,
    };
}
function buildGroupPostCompactCandidateUsageSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
    const ledger = (0, group_compact_file_references_part_01_1.readGroupPostCompactCandidateUsageLedger)(groupId, groupSessionId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const candidates = Array.isArray(options.candidates) ? options.candidates : [];
    const candidateKeys = new Set(candidates.map((candidate) => (0, group_compact_file_references_part_01_1.postCompactCandidateStatsKey)(candidate, targetProject)).filter(Boolean));
    const candidateIds = new Set(candidates.map((candidate) => String(candidate.candidate_id || candidate.candidateId || "").trim().toLowerCase()).filter(Boolean));
    const candidateValues = new Set(candidates.map((candidate) => (0, group_memory_shared_1.compactMemoryText)(candidate.value || "", 260).toLowerCase()).filter(Boolean));
    const statsRows = Object.values(ledger.stats || {})
        .filter((row) => !targetProject || String(row.target_project || "").toLowerCase() === targetProject)
        .filter((row) => !candidateKeys.size
        || candidateKeys.has((0, group_compact_file_references_part_01_1.postCompactCandidateStatsKey)(row, targetProject))
        || candidateIds.has(String(row.candidate_id || "").trim().toLowerCase())
        || candidateValues.has((0, group_memory_shared_1.compactMemoryText)(row.value || "", 260).toLowerCase()))
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
        version: group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
        groupId,
        groupSessionId,
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
        group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
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
        reason: (0, group_memory_shared_1.compactMemoryText)(planRow.reason || receiptRow.reason || "", 500),
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
    const betaHeaders = (0, group_memory_shared_1.uniqueApiMicrocompactStrings)(input.betaHeaders || input.beta_headers || [], requestPatch.beta_headers || requestPatch.betaHeaders || [], (0, group_memory_shared_1.apiMicrocompactBetaHeadersFromHeaders)(input.headers || input.requestHeaders || input.request_headers));
    const requestPatchChecksum = String(input.requestPatchChecksum
        || input.request_patch_checksum
        || plan.requestPatchChecksum
        || plan.request_patch_checksum
        || (Object.keys(requestPatch || {}).length ? (0, group_memory_shared_1.stableApiMicrocompactChecksum)(requestPatch) : "")).trim();
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
        requestBodyChecksum: String(input.requestBodyChecksum || input.request_body_checksum || (0, group_memory_shared_1.stableApiMicrocompactChecksum)(requestBody)).trim(),
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
        groupSessionId: String(input.groupSessionId || input.group_session_id || plan.groupSessionId || plan.group_session_id || "default").trim() || "default",
        targetProject: String(input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
        agent: String(input.agent || input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
        taskId: String(input.taskId || input.task_id || "").trim(),
        executionId: String(input.executionId || input.execution_id || "").trim(),
        sentAt: String(input.sentAt || input.sent_at || input.generatedAt || input.generated_at || new Date().toISOString()),
        telemetrySource: "native_request_adapter",
        ok: input.ok,
        error: (0, group_memory_shared_1.compactMemoryText)(input.error || input.errorMessage || input.error_message || "", 360),
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
        groupSessionId: row.groupSessionId,
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
        ...(0, group_memory_shared_1.apiMicrocompactBetaHeadersFromHeaders)(row.headers || row.requestHeaders || row.request_headers),
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const hasContextManagement = row.has_context_management === true
        || row.hasContextManagement === true
        || !!row.context_management
        || !!row.contextManagement
        || !!requestBody?.context_management
        || betaHeaders.includes("context-management-2025-06-27");
    const entryCore = {
        group_id: groupId,
        group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
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
        endpoint: (0, group_memory_shared_1.compactMemoryText)(row.endpoint || row.url || row.apiUrl || row.api_url || "", 240),
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
        error: (0, group_memory_shared_1.compactMemoryText)(row.error || row.errorMessage || row.error_message || "", 360),
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
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
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
    const file = (0, group_compact_file_references_part_01_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId, groupSessionId);
    if (!entries.length) {
        const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger)(groupId, groupSessionId);
        return {
            schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
            groupId,
            groupSessionId,
            file,
            skipped: true,
            reason: "no_request_telemetry_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger)(groupId, groupSessionId);
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
    (0, group_compact_file_references_part_01_1.writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger)(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    }, groupSessionId);
    return {
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-record-v1",
        groupId,
        groupSessionId,
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
    const maxAgeMs = Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS);
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
        request_telemetry_file: matched ? (0, group_compact_file_references_part_01_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(entry.group_id || "", entry.group_session_id || "") : "",
    };
}
function buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
    const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger)(groupId, groupSessionId);
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
        version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
        groupId,
        groupSessionId,
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
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
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
    const file = (0, group_compact_file_references_part_01_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId, groupSessionId);
    if (!entries.length) {
        const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyProofLedger)(groupId, groupSessionId);
        return {
            schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
            groupId,
            groupSessionId,
            file,
            skipped: true,
            reason: "no_api_microcompact_receipt_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyProofLedger)(groupId, groupSessionId);
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
    (0, group_compact_file_references_part_01_1.writeGroupApiMicrocompactNativeApplyProofLedger)(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    }, groupSessionId);
    return {
        schema: "ccm-group-api-microcompact-native-apply-proof-record-v1",
        groupId,
        groupSessionId,
        file,
        recorded_count: recordedCount,
        updated_count: updatedCount,
        totals,
        updatedAt,
    };
}
function buildGroupApiMicrocompactNativeApplyProofSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
    const ledger = (0, group_compact_file_references_part_01_1.readGroupApiMicrocompactNativeApplyProofLedger)(groupId, groupSessionId);
    const telemetrySummary = buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId, options);
    const platformExecutionReceipts = (0, provider_native_compact_execution_receipt_1.buildProviderNativeCompactExecutionReceiptSummary)(groupId, options);
    const telemetryEntries = [
        ...(Array.isArray(telemetrySummary.matched_entries) ? telemetrySummary.matched_entries : []),
        ...(Array.isArray(telemetrySummary.failed_entries) ? telemetrySummary.failed_entries : []),
        ...(Array.isArray(telemetrySummary.recent_entries) ? telemetrySummary.recent_entries : []),
    ];
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean));
    const legacyEntries = (Array.isArray(ledger.entries) ? ledger.entries : [])
        .filter((entry) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
        .filter((entry) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "").trim()));
    const platformEntries = (Array.isArray(platformExecutionReceipts.entries) ? platformExecutionReceipts.entries : platformExecutionReceipts.recent_entries || []).map((receipt) => ({
        schema: "ccm-group-api-microcompact-native-apply-proof-entry-v1",
        entry_id: receipt.receipt_id,
        group_id: receipt.group_id,
        group_session_id: receipt.group_session_id,
        target_project: receipt.target_project,
        agent: receipt.target_project,
        task_id: receipt.task_id,
        execution_id: receipt.execution_id,
        runner_request_id: receipt.runner_request_id,
        external_runner_request_id: receipt.runner_request_id,
        plan_checksum: receipt.plan_checksum,
        apply_plan_checksum: receipt.apply_plan_checksum,
        request_patch_checksum: receipt.request_patch_checksum,
        receipt_apply_plan_checksum: receipt.apply_plan_checksum,
        receipt_request_patch_checksum: receipt.request_patch_checksum,
        task_agent_session_id: receipt.task_agent_session_id,
        native_session_id: receipt.native_session_id,
        memory_context_snapshot_id: receipt.memory_context_snapshot_id,
        memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum,
        usage_state: receipt.status === "native_applied" ? "native_applied" : ["advisory_only", "request_accepted", "no_edits_applied"].includes(receipt.status) ? "advisory" : receipt.status === "not_supported" ? "not_supported" : "native_applied",
        native_applied: receipt.status === "native_applied",
        proof_status: receipt.status === "native_applied" && receipt.strong_proof === true
            ? "verified"
            : ["advisory_only", "request_accepted", "no_edits_applied"].includes(receipt.status)
                ? "advisory"
                : receipt.status === "not_supported"
                    ? "not_supported"
                    : "failed",
        pass: receipt.status === "native_applied" && receipt.strong_proof === true,
        strong_proof: receipt.status === "native_applied" && receipt.strong_proof === true,
        proof_source: "platform_execution_receipt",
        platform_execution_receipt_id: receipt.receipt_id,
        platform_execution_receipt_checksum: receipt.receipt_checksum,
        generated_at: receipt.accepted_at || receipt.sent_at || receipt.created_at,
        reason: receipt.failure_reason || `platform request adapter status=${receipt.status}`,
    }));
    const proofKey = (entry) => [
        entry.plan_checksum,
        entry.apply_plan_checksum || entry.receipt_apply_plan_checksum,
        entry.request_patch_checksum || entry.receipt_request_patch_checksum,
        entry.task_agent_session_id || entry.receipt_task_agent_session_id,
        entry.execution_id,
        entry.runner_request_id || entry.external_runner_request_id,
    ].map(value => String(value || "")).join("|");
    const platformKeys = new Set(platformEntries.map(proofKey));
    const entries = [...platformEntries, ...legacyEntries.filter((entry) => !platformKeys.has(proofKey(entry)))];
    const totals = apiMicrocompactNativeApplyProofTotals(entries);
    const proofCoverage = Number(totals.native_claims || 0) > 0
        ? Math.round(Number(totals.verified || 0) / Number(totals.native_claims || 1) * 1000) / 10
        : null;
    const enrichedEntries = entries.map((entry) => {
        const enriched = enrichApiMicrocompactNativeApplyProofWithTelemetry(entry, telemetryEntries, options);
        if (entry.proof_source !== "platform_execution_receipt" || entry.proof_status !== "verified")
            return enriched;
        return {
            ...enriched,
            request_telemetry_matched: true,
            request_telemetry_fresh: true,
            request_telemetry_status: "matched",
            request_telemetry_source: "native_request_adapter",
            request_telemetry_adapter_captured: true,
            request_telemetry_strong: true,
            request_telemetry_weak_reason: "",
            request_telemetry_runner_request_id: entry.runner_request_id,
            request_telemetry_runner_matched: true,
            request_telemetry_session_bound: true,
            request_telemetry_dispatch_bound: true,
        };
    });
    const telemetryMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true).length;
    const telemetryAdapterMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source === "native_request_adapter").length;
    const telemetryReceiptMatchedCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_matched === true && entry.request_telemetry_source !== "native_request_adapter").length;
    const telemetryStrongCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_strong === true).length;
    const telemetryReceiptOnlyCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "receipt_only").length;
    const telemetryMissingCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "missing").length;
    const telemetryStaleCount = enrichedEntries.filter((entry) => entry.proof_status === "verified" && entry.request_telemetry_status === "stale").length;
    const status = entries.length === 0
        ? "empty"
        : Number(totals.failed || 0) > 0 || platformExecutionReceipts.status === "fail"
            ? "fail"
            : telemetryMissingCount > 0 || telemetryStaleCount > 0 || platformExecutionReceipts.status === "warn"
                ? "warn"
                : Number(totals.verified || 0) > 0
                    ? "ok"
                    : "advisory";
    return {
        schema: "ccm-group-api-microcompact-native-apply-proof-summary-v1",
        version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
        groupId,
        groupSessionId,
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
            max_age_ms: Number(options.telemetryMaxAgeMs || options.telemetry_max_age_ms || group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS),
        },
        platform_execution_receipts: platformExecutionReceipts,
        totals,
        verified_entries: enrichedEntries.filter((entry) => entry.proof_status === "verified").slice(-12).reverse(),
        failed_entries: enrichedEntries.filter((entry) => entry.proof_status === "failed").slice(-12).reverse(),
        advisory_entries: enrichedEntries.filter((entry) => entry.proof_status === "advisory" || entry.proof_status === "not_supported").slice(-12).reverse(),
        recent_entries: enrichedEntries.slice(-20).reverse(),
        updatedAt: ledger.updatedAt || "",
    };
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
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const loadPlan = input.loadPlan || input.load_plan || {};
    const scope = String(input.scope || input.contextScope || input.context_scope || "default");
    const originalReason = String(input.reason || input.reloadReason || input.reload_reason || "context_bundle");
    const sourceManifestChecksum = String(sourceManifest.manifestChecksum || "");
    const stableSourceFingerprint = (0, group_memory_shared_1.buildStableSourceFingerprint)(sourceManifest);
    const sourceEntries = buildSourceManifestSnapshot(sourceManifest);
    const loadPlanFingerprint = crypto.createHash("sha256").update(JSON.stringify((loadPlan.entries || []).map((entry) => ({
        relPath: entry.relPath,
        type: entry.type,
        loadOrder: entry.loadOrder,
        checksum: entry.checksum,
        pathGlobs: entry.pathGlobs || [],
    })))).digest("hex").slice(0, 24);
    const ledger = (0, group_memory_shared_1.readGroupMemoryReloadLedger)(groupId, groupSessionId);
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
        version: group_memory_shared_1.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION,
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
        version: group_memory_shared_1.GROUP_MEMORY_RELOAD_AUDIT_VERSION,
        groupId,
        groupSessionId,
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
    (0, group_memory_shared_1.writeGroupMemoryReloadLedger)(groupId, ledger, groupSessionId);
    return { ...audit, ledgerFile: (0, group_memory_storage_1.getGroupMemoryReloadLedgerFile)(groupId, groupSessionId) };
}
//# sourceMappingURL=group-compact-file-references-part-02.js.map