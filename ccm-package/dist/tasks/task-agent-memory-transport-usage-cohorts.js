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
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES = exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA = void 0;
exports.buildTaskAgentMemoryTransportUsageCohortReport = buildTaskAgentMemoryTransportUsageCohortReport;
exports.verifyTaskAgentMemoryTransportUsageCohortReport = verifyTaskAgentMemoryTransportUsageCohortReport;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("../agents/runtime");
const task_agent_memory_transport_usage_1 = require("./task-agent-memory-transport-usage");
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA = "ccm-task-agent-memory-transport-usage-cohort-report-v1";
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES = 3;
const MODES = ["full", "delta", "continuation"];
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex");
}
function checksum(value, field) {
    const payload = { ...(value || {}) };
    delete payload[field];
    delete payload.checksum_valid;
    delete payload.issues;
    return hash(payload);
}
function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}
function round(value, precision = 2) {
    const scale = 10 ** precision;
    return Math.round(value * scale) / scale;
}
function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : round((sorted[middle - 1] + sorted[middle]) / 2);
}
function mean(values) {
    return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}
function receiptFromRow(row) {
    return row?.providerMemoryTransportUsageReceipt
        || row?.provider_memory_transport_usage_receipt
        || row?.providerMemoryTransportUsage
        || row?.provider_memory_transport_usage
        || (row?.schema === "ccm-task-agent-memory-transport-usage-v1" ? row : null);
}
function rowExpected(row) {
    return {
        groupId: row?.groupId || row?.group_id,
        groupSessionId: row?.groupSessionId || row?.group_session_id,
        taskId: row?.taskId || row?.task_id,
        taskAgentSessionId: row?.sessionId || row?.taskAgentSessionId || row?.task_agent_session_id,
        targetProject: row?.project || row?.targetProject || row?.target_project,
        snapshotId: row?.snapshotId || row?.snapshot_id,
    };
}
function modeStats(rows) {
    const values = (field) => rows.map(row => finite(row[field]));
    return {
        sample_count: rows.length,
        input_tokens: { median: median(values("input_tokens")), mean: mean(values("input_tokens")) },
        cache_read_input_tokens: { median: median(values("cache_read_input_tokens")), mean: mean(values("cache_read_input_tokens")) },
        memory_transport_estimated_tokens: { median: median(values("memory_transport_estimated_tokens")), mean: mean(values("memory_transport_estimated_tokens")) },
        final_prompt_estimated_tokens: { median: median(values("final_prompt_estimated_tokens")), mean: mean(values("final_prompt_estimated_tokens")) },
    };
}
function savingsClaim(cohortKey, baseline, comparison, mode) {
    const inputReduction = Number(baseline.input_tokens.median || 0) - Number(comparison.input_tokens.median || 0);
    const memoryReduction = Number(baseline.memory_transport_estimated_tokens.median || 0) - Number(comparison.memory_transport_estimated_tokens.median || 0);
    return {
        cohort_key: cohortKey,
        baseline_mode: "full",
        comparison_mode: mode,
        measurement_scope: "whole_provider_call_observation",
        causality: "memory_transport_not_isolated",
        input_token_median_reduction: inputReduction,
        input_token_median_reduction_ratio: baseline.input_tokens.median > 0 ? round(inputReduction / baseline.input_tokens.median, 4) : null,
        estimated_memory_transport_token_median_reduction: memoryReduction,
        estimated_memory_transport_token_median_reduction_ratio: baseline.memory_transport_estimated_tokens.median > 0
            ? round(memoryReduction / baseline.memory_transport_estimated_tokens.median, 4)
            : null,
    };
}
function buildTaskAgentMemoryTransportUsageCohortReport(rows = [], options = {}) {
    const minimumSamples = Math.max(2, Math.floor(Number(options.minimumSamples || options.minimum_samples || exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES)));
    const expectedGroupId = String(options.groupId || options.group_id || "").trim();
    const expectedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const eligible = [];
    const rejected = [];
    for (const row of Array.isArray(rows) ? rows : []) {
        const receipt = receiptFromRow(row);
        const identity = {
            group_id: String(receipt?.group_id || row?.groupId || row?.group_id || ""),
            group_session_id: String(receipt?.group_session_id || row?.groupSessionId || row?.group_session_id || ""),
            task_id: String(receipt?.task_id || row?.taskId || row?.task_id || ""),
            task_agent_session_id: String(receipt?.task_agent_session_id || row?.sessionId || row?.taskAgentSessionId || row?.task_agent_session_id || ""),
            snapshot_id: String(receipt?.snapshot_id || row?.snapshotId || row?.snapshot_id || ""),
            usage_checksum: String(receipt?.usage_checksum || ""),
        };
        const reasons = [];
        if (!receipt)
            reasons.push("usage_receipt_missing");
        const verification = receipt ? (0, task_agent_memory_transport_usage_1.verifyTaskAgentMemoryTransportUsageReceipt)(receipt, rowExpected(row)) : { valid: false, issues: [] };
        if (receipt && !verification.valid)
            reasons.push(...verification.issues);
        if (expectedGroupId && identity.group_id !== expectedGroupId)
            reasons.push("group_scope_mismatch");
        if (expectedGroupSessionId && identity.group_session_id !== expectedGroupSessionId)
            reasons.push("group_session_scope_mismatch");
        if (receipt?.status !== "reported" || receipt?.reported !== true)
            reasons.push(`usage_${String(receipt?.status || "missing")}`);
        const rawProvider = String(receipt?.provider || "").trim();
        const dimensions = {
            provider: rawProvider ? (0, runtime_1.normalizeAgentRuntimeId)(rawProvider) : "",
            model: String(receipt?.model || "").trim(),
            provider_runtime_version: String(receipt?.provider_runtime_version || "").trim(),
            provider_contract_id: String(receipt?.provider_contract_id || "").trim(),
            target_project: String(receipt?.target_project || "").trim(),
            task_family_key: String(receipt?.task_family_key || "").trim(),
            final_prompt_size_bucket: String(receipt?.final_prompt_size_bucket || (0, task_agent_memory_transport_usage_1.taskAgentMemoryTransportPromptSizeBucket)(receipt?.final_prompt_estimated_tokens)),
        };
        for (const [field, value] of Object.entries(dimensions))
            if (!value || value === "missing")
                reasons.push(`${field}_missing`);
        if (!MODES.includes(receipt?.transport_mode))
            reasons.push("transport_mode_not_comparable");
        if (reasons.length) {
            rejected.push({ ...identity, reasons: [...new Set(reasons)].sort() });
            continue;
        }
        eligible.push({ receipt, identity, dimensions });
    }
    const grouped = new Map();
    for (const row of eligible) {
        const key = hash(row.dimensions).slice(0, 24);
        const list = grouped.get(key) || [];
        list.push(row);
        grouped.set(key, list);
    }
    const baseVariants = new Map();
    for (const [key, cohortRows] of grouped) {
        const dimensions = cohortRows[0].dimensions;
        const baseKey = hash({ provider: dimensions.provider, target_project: dimensions.target_project, task_family_key: dimensions.task_family_key }).slice(0, 24);
        const variants = baseVariants.get(baseKey) || new Set();
        variants.add(key);
        baseVariants.set(baseKey, variants);
    }
    const cohorts = [...grouped.entries()].map(([key, cohortRows]) => {
        const dimensions = cohortRows[0].dimensions;
        const byMode = {};
        for (const mode of MODES)
            byMode[mode] = modeStats(cohortRows.filter(row => row.receipt.transport_mode === mode).map(row => row.receipt));
        const samplesReady = MODES.every(mode => byMode[mode].sample_count >= minimumSamples);
        const baseKey = hash({ provider: dimensions.provider, target_project: dimensions.target_project, task_family_key: dimensions.task_family_key }).slice(0, 24);
        const dimensionDriftObserved = Number(baseVariants.get(baseKey)?.size || 0) > 1;
        const status = samplesReady ? "comparable" : dimensionDriftObserved ? "drifted" : "insufficient_samples";
        const claims = samplesReady
            ? [savingsClaim(key, byMode.full, byMode.delta, "delta"), savingsClaim(key, byMode.full, byMode.continuation, "continuation")]
            : [];
        const payload = {
            cohort_key: key,
            status,
            dimensions,
            minimum_samples_per_mode: minimumSamples,
            eligible_sample_count: cohortRows.length,
            dimension_drift_observed: dimensionDriftObserved,
            modes: byMode,
            savings_claims: claims,
            usage_checksums: cohortRows.map(row => row.identity.usage_checksum).sort(),
        };
        return { ...payload, cohort_checksum: checksum(payload, "cohort_checksum") };
    }).sort((a, b) => a.cohort_key.localeCompare(b.cohort_key));
    const comparableCount = cohorts.filter(row => row.status === "comparable").length;
    const driftedCount = cohorts.filter(row => row.status === "drifted").length;
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA,
        version: 1,
        generated_at: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        scope: { group_id: expectedGroupId, group_session_id: expectedGroupSessionId, exact_group_session: !!expectedGroupSessionId },
        measurement_scope: "whole_provider_call_bound_to_memory_transport",
        savings_claim_policy: "comparable_exact_cohort_minimum_samples_only",
        minimum_samples_per_mode: minimumSamples,
        status: comparableCount ? "comparable" : driftedCount ? "drifted" : "insufficient_samples",
        summary: {
            input_row_count: Array.isArray(rows) ? rows.length : 0,
            eligible_row_count: eligible.length,
            rejected_row_count: rejected.length,
            cohort_count: cohorts.length,
            comparable_cohort_count: comparableCount,
            drifted_cohort_count: driftedCount,
            insufficient_sample_cohort_count: cohorts.filter(row => row.status === "insufficient_samples").length,
            savings_claim_count: cohorts.reduce((sum, row) => sum + row.savings_claims.length, 0),
            unreported_row_count: rejected.filter(row => row.reasons.includes("usage_unreported")).length,
            invalid_receipt_row_count: rejected.filter(row => row.reasons.some((reason) => reason.startsWith("memory_transport_usage_") && reason !== "memory_transport_usage_status_invalid")).length,
        },
        cohorts,
        rejected_rows: rejected.sort((a, b) => `${a.group_id}:${a.group_session_id}:${a.snapshot_id}`.localeCompare(`${b.group_id}:${b.group_session_id}:${b.snapshot_id}`)),
    };
    return { ...payload, report_checksum: checksum(payload, "report_checksum") };
}
function verifyTaskAgentMemoryTransportUsageCohortReport(report, expected = {}) {
    const issues = [];
    if (report?.schema !== exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA || Number(report?.version || 0) !== 1)
        issues.push("usage_cohort_schema_invalid");
    if (String(report?.report_checksum || "") !== checksum(report, "report_checksum"))
        issues.push("usage_cohort_report_checksum_invalid");
    if (expected.groupId !== undefined && String(report?.scope?.group_id || "") !== String(expected.groupId || ""))
        issues.push("usage_cohort_group_mismatch");
    if (expected.groupSessionId !== undefined && String(report?.scope?.group_session_id || "") !== String(expected.groupSessionId || ""))
        issues.push("usage_cohort_group_session_mismatch");
    const minimum = Math.max(2, Number(report?.minimum_samples_per_mode || exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES));
    for (const cohort of Array.isArray(report?.cohorts) ? report.cohorts : []) {
        if (String(cohort?.cohort_checksum || "") !== checksum(cohort, "cohort_checksum"))
            issues.push("usage_cohort_checksum_invalid");
        const ready = MODES.every(mode => Number(cohort?.modes?.[mode]?.sample_count || 0) >= minimum);
        if (cohort?.status === "comparable" && !ready)
            issues.push("usage_cohort_minimum_samples_not_met");
        if (Array.isArray(cohort?.savings_claims) && cohort.savings_claims.length > 0 && (cohort?.status !== "comparable" || !ready))
            issues.push("usage_cohort_claim_gate_bypassed");
    }
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
//# sourceMappingURL=task-agent-memory-transport-usage-cohorts.js.map