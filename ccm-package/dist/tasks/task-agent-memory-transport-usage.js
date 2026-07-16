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
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA = void 0;
exports.buildTaskAgentMemoryTransportUsageReceipt = buildTaskAgentMemoryTransportUsageReceipt;
exports.verifyTaskAgentMemoryTransportUsageReceipt = verifyTaskAgentMemoryTransportUsageReceipt;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("../agents/runtime");
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA = "ccm-task-agent-memory-transport-usage-v1";
function finiteToken(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function checksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.usage_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function buildTaskAgentMemoryTransportUsageReceipt(input = {}) {
    const usage = input.usage && typeof input.usage === "object" ? input.usage : {};
    const directInputTokens = Math.max(finiteToken(usage.directInputTokens), finiteToken(usage.direct_input_tokens), finiteToken(usage.input_tokens), finiteToken(usage.prompt_tokens), finiteToken(usage.promptTokens));
    const cacheCreationInputTokens = Math.max(finiteToken(usage.cacheCreationInputTokens), finiteToken(usage.cache_creation_input_tokens));
    const includedCacheReadTokens = Math.max(finiteToken(usage.cachedInputTokens), finiteToken(usage.cached_input_tokens), finiteToken(usage.prompt_tokens_details?.cached_tokens), finiteToken(usage.promptTokensDetails?.cachedTokens), finiteToken(usage.input_tokens_details?.cached_tokens), finiteToken(usage.inputTokensDetails?.cachedTokens));
    const separateCacheReadTokens = Math.max(finiteToken(usage.cacheReadInputTokens), finiteToken(usage.cache_read_input_tokens));
    const cacheReadInputTokens = Math.max(includedCacheReadTokens, separateCacheReadTokens);
    const cacheReadIncludedInInput = usage.cacheReadIncludedInInput === true
        || usage.cache_read_included_in_input === true
        || (includedCacheReadTokens > 0 && separateCacheReadTokens === 0);
    const normalizedInputTokens = finiteToken(usage.inputTokens);
    const accountedInputTokens = normalizedInputTokens || directInputTokens + cacheCreationInputTokens + (cacheReadIncludedInInput ? 0 : cacheReadInputTokens);
    const outputTokens = Math.max(finiteToken(usage.outputTokens), finiteToken(usage.output_tokens), finiteToken(usage.completion_tokens), finiteToken(usage.completionTokens));
    const providerTotalTokens = Math.max(finiteToken(usage.providerTotalTokens), finiteToken(usage.provider_total_tokens), finiteToken(usage.total_tokens), finiteToken(usage.totalTokens));
    const accountedTotalTokens = providerTotalTokens || accountedInputTokens + outputTokens;
    const totalCostUsd = Math.max(0, Number(usage.totalCostUsd || usage.total_cost_usd || usage.costUsd || usage.cost_usd || 0) || 0);
    const reported = usage.reported === true || accountedInputTokens > 0 || outputTokens > 0 || providerTotalTokens > 0 || totalCostUsd > 0;
    const executionSucceeded = input.executionSucceeded !== false;
    const status = executionSucceeded ? (reported ? "reported" : "unreported") : "failed";
    const finalPromptEstimatedTokens = Math.max(0, Math.floor(Number(input.finalPromptEstimatedTokens || 0)));
    const memoryTransportEstimatedTokens = Math.max(0, Math.floor(Number(input.memoryTransportEstimatedTokens || 0)));
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA,
        version: 1,
        status,
        reported,
        body_free: true,
        measurement_scope: "whole_provider_call_bound_to_memory_transport",
        group_id: String(input.groupId || ""),
        group_session_id: String(input.groupSessionId || ""),
        task_id: String(input.taskId || ""),
        task_agent_session_id: String(input.taskAgentSessionId || ""),
        target_project: String(input.targetProject || ""),
        snapshot_id: String(input.snapshotId || ""),
        snapshot_checksum: String(input.snapshotChecksum || ""),
        runner_request_id: String(input.runnerRequestId || ""),
        native_session_id: String(input.nativeSessionId || ""),
        provider: (0, runtime_1.normalizeAgentRuntimeId)(input.provider || usage.provider || ""),
        model: String(input.model || ""),
        provider_contract_id: String(input.providerContractId || ""),
        provider_runtime_version: String(input.providerRuntimeVersion || ""),
        transport_mode: String(input.transportMode || "legacy"),
        plan_checksum: String(input.planChecksum || ""),
        manifest_checksum: String(input.manifestChecksum || ""),
        input_tokens: accountedInputTokens,
        direct_input_tokens: directInputTokens,
        output_tokens: outputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_included_in_input: cacheReadIncludedInInput,
        provider_total_tokens: providerTotalTokens,
        accounted_total_tokens: accountedTotalTokens,
        total_cost_usd: totalCostUsd,
        cache_hit_ratio: accountedInputTokens > 0
            ? Math.round((cacheReadInputTokens / accountedInputTokens) * 10_000) / 10_000
            : null,
        final_prompt_estimated_tokens: finalPromptEstimatedTokens,
        memory_transport_estimated_tokens: memoryTransportEstimatedTokens,
        memory_transport_share_estimate: finalPromptEstimatedTokens > 0
            ? Math.round((memoryTransportEstimatedTokens / finalPromptEstimatedTokens) * 10_000) / 10_000
            : null,
        observed_at: String(input.observedAt || new Date().toISOString()),
    };
    return { ...payload, usage_checksum: checksum(payload) };
}
function verifyTaskAgentMemoryTransportUsageReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA || Number(receipt?.version || 0) !== 1)
        issues.push("memory_transport_usage_schema_invalid");
    if (!new Set(["reported", "unreported", "failed"]).has(String(receipt?.status || "")))
        issues.push("memory_transport_usage_status_invalid");
    if (receipt?.body_free !== true)
        issues.push("memory_transport_usage_body_free_missing");
    if (receipt?.measurement_scope !== "whole_provider_call_bound_to_memory_transport")
        issues.push("memory_transport_usage_scope_invalid");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("memory_transport_usage_group_session_missing");
    if (!String(receipt?.task_agent_session_id || "").startsWith("tas_"))
        issues.push("memory_transport_usage_task_session_missing");
    if (!String(receipt?.snapshot_id || "").startsWith("tams_"))
        issues.push("memory_transport_usage_snapshot_missing");
    if (!new Set(["full", "delta", "continuation", "legacy"]).has(String(receipt?.transport_mode || "")))
        issues.push("memory_transport_usage_mode_invalid");
    for (const field of ["input_tokens", "direct_input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "provider_total_tokens", "accounted_total_tokens", "final_prompt_estimated_tokens", "memory_transport_estimated_tokens"]) {
        if (!Number.isFinite(Number(receipt?.[field])) || Number(receipt?.[field]) < 0)
            issues.push(`memory_transport_usage_${field}_invalid`);
    }
    if (Number(receipt?.accounted_total_tokens || 0) < Number(receipt?.input_tokens || 0) + Number(receipt?.output_tokens || 0))
        issues.push("memory_transport_usage_total_invalid");
    if (receipt?.status === "reported" && receipt?.reported !== true)
        issues.push("memory_transport_usage_reported_flag_invalid");
    if (receipt?.status === "unreported" && receipt?.reported === true)
        issues.push("memory_transport_usage_unreported_flag_invalid");
    if (receipt?.cache_hit_ratio !== null && (Number(receipt.cache_hit_ratio) < 0 || Number(receipt.cache_hit_ratio) > 1))
        issues.push("memory_transport_usage_cache_ratio_invalid");
    if (!Number.isFinite(Date.parse(String(receipt?.observed_at || ""))))
        issues.push("memory_transport_usage_observed_at_invalid");
    if (String(receipt?.usage_checksum || "") !== checksum(receipt))
        issues.push("memory_transport_usage_checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, receipt?.group_id],
        ["group_session_id", expected.groupSessionId, receipt?.group_session_id],
        ["task_id", expected.taskId, receipt?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, receipt?.task_agent_session_id],
        ["target_project", expected.targetProject, receipt?.target_project],
        ["snapshot_id", expected.snapshotId, receipt?.snapshot_id],
        ["snapshot_checksum", expected.snapshotChecksum, receipt?.snapshot_checksum],
        ["runner_request_id", expected.runnerRequestId, receipt?.runner_request_id],
        ["provider", expected.provider === undefined ? undefined : (0, runtime_1.normalizeAgentRuntimeId)(expected.provider), receipt?.provider],
        ["native_session_id", expected.nativeSessionId, receipt?.native_session_id],
        ["transport_mode", expected.transportMode, receipt?.transport_mode],
    ];
    for (const [field, wanted, actual] of bindings)
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`memory_transport_usage_${field}_mismatch`);
    return { valid: issues.length === 0, issues: [...new Set(issues)], status: String(receipt?.status || ""), reported: receipt?.reported === true };
}
//# sourceMappingURL=task-agent-memory-transport-usage.js.map