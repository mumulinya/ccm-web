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
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_PROVENANCE_SCHEMA = exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA = void 0;
exports.taskAgentMemoryTransportPromptSizeBucket = taskAgentMemoryTransportPromptSizeBucket;
exports.taskAgentMemoryTransportTaskFamily = taskAgentMemoryTransportTaskFamily;
exports.buildTaskAgentMemoryTransportUsageProvenance = buildTaskAgentMemoryTransportUsageProvenance;
exports.verifyTaskAgentMemoryTransportUsageProvenance = verifyTaskAgentMemoryTransportUsageProvenance;
exports.buildTaskAgentMemoryTransportUsageReceipt = buildTaskAgentMemoryTransportUsageReceipt;
exports.verifyTaskAgentMemoryTransportUsageReceipt = verifyTaskAgentMemoryTransportUsageReceipt;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("../agents/runtime");
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_SCHEMA = "ccm-task-agent-memory-transport-usage-v1";
exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_PROVENANCE_SCHEMA = "ccm-task-agent-memory-transport-usage-provenance-v1";
function stableHash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex");
}
function taskAgentMemoryTransportPromptSizeBucket(value) {
    const number = Number(value);
    const tokens = Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
    if (!tokens)
        return "missing";
    const ceilings = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
    const ceiling = ceilings.find(item => tokens <= item);
    return ceiling ? `le_${ceiling}` : "gt_65536";
}
function taskAgentMemoryTransportTaskFamily(text, explicitKey = "") {
    const explicit = String(explicitKey || "").trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
    if (explicit)
        return { key: explicit, sourceChecksum: "", source: "explicit" };
    const source = String(text || "").trim().replace(/\s+/g, " ").slice(0, 4000);
    return source
        ? { key: `task-family-${stableHash(source.toLowerCase()).slice(0, 18)}`, sourceChecksum: stableHash(source), source: "worker_packet_task" }
        : { key: "", sourceChecksum: "", source: "missing" };
}
function buildTaskAgentMemoryTransportUsageProvenance(input = {}) {
    const raw = input.providerUsageProvenance || input.provenance || input.usage?.provenance || {};
    const origin = String(raw.origin || "unverified").trim().toLowerCase();
    const runtimeIdentity = String(raw.providerRuntimeIdentityChecksum
        || raw.provider_runtime_identity_checksum
        || input.providerRuntimeIdentityChecksum
        || "").trim();
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_PROVENANCE_SCHEMA,
        version: 1,
        origin: new Set(["native_cli", "external_agent_runner", "recovery_replay", "deterministic_fixture", "unverified"]).has(origin) ? origin : "unverified",
        runner_kind: String(raw.runnerKind || raw.runner_kind || "").trim(),
        account_backed: raw.accountBacked === true || raw.account_backed === true,
        live_execution_authorized: raw.liveExecutionAuthorized === true || raw.live_execution_authorized === true,
        fixture: raw.fixture === true || origin === "deterministic_fixture",
        authorization_checksum: String(raw.authorizationChecksum || raw.authorization_checksum || "").trim(),
        execution_manifest_checksum: String(raw.executionManifestChecksum || raw.execution_manifest_checksum || "").trim(),
        execution_slot_checksum: String(raw.executionSlotChecksum || raw.execution_slot_checksum || "").trim(),
        runner_admission_verified: raw.runnerAdmissionVerified === true || raw.runner_admission_verified === true,
        provider_runtime_identity_checksum: /^[a-f0-9]{64}$/.test(runtimeIdentity) ? runtimeIdentity : "",
        captured_at: String(raw.capturedAt || raw.captured_at || input.observedAt || new Date().toISOString()),
    };
    return { ...payload, provenance_checksum: stableHash(payload) };
}
function verifyTaskAgentMemoryTransportUsageProvenance(provenance) {
    const issues = [];
    if (provenance?.schema !== exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_PROVENANCE_SCHEMA || Number(provenance?.version || 0) !== 1)
        issues.push("memory_transport_usage_provenance_schema_invalid");
    if (!new Set(["native_cli", "external_agent_runner", "recovery_replay", "deterministic_fixture", "unverified"]).has(String(provenance?.origin || "")))
        issues.push("memory_transport_usage_provenance_origin_invalid");
    if (!Number.isFinite(Date.parse(String(provenance?.captured_at || ""))))
        issues.push("memory_transport_usage_provenance_time_invalid");
    if (provenance?.provider_runtime_identity_checksum && !/^[a-f0-9]{64}$/.test(String(provenance.provider_runtime_identity_checksum)))
        issues.push("memory_transport_usage_provenance_runtime_identity_invalid");
    if (provenance?.authorization_checksum && !/^[a-f0-9]{64}$/.test(String(provenance.authorization_checksum)))
        issues.push("memory_transport_usage_provenance_authorization_invalid");
    if (provenance?.execution_manifest_checksum && !/^[a-f0-9]{64}$/.test(String(provenance.execution_manifest_checksum)))
        issues.push("memory_transport_usage_provenance_manifest_invalid");
    if (provenance?.execution_slot_checksum && !/^[a-f0-9]{64}$/.test(String(provenance.execution_slot_checksum)))
        issues.push("memory_transport_usage_provenance_slot_invalid");
    if (provenance?.runner_admission_verified === true && (!provenance?.execution_manifest_checksum || !provenance?.execution_slot_checksum))
        issues.push("memory_transport_usage_provenance_admission_evidence_missing");
    if (provenance?.account_backed === true && (provenance?.live_execution_authorized !== true || provenance?.fixture === true))
        issues.push("memory_transport_usage_provenance_account_policy_invalid");
    const payload = { ...(provenance || {}) };
    delete payload.provenance_checksum;
    if (String(provenance?.provenance_checksum || "") !== stableHash(payload))
        issues.push("memory_transport_usage_provenance_checksum_invalid");
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
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
    const rawProvider = String(input.provider || usage.provider || "").trim();
    const declaredDirectInputTokens = Math.max(finiteToken(usage.directInputTokens), finiteToken(usage.direct_input_tokens));
    const providerInputTokens = Math.max(finiteToken(usage.input_tokens), finiteToken(usage.prompt_tokens), finiteToken(usage.promptTokens));
    const cacheCreationInputTokens = Math.max(finiteToken(usage.cacheCreationInputTokens), finiteToken(usage.cache_creation_input_tokens));
    const includedCacheReadTokens = Math.max(finiteToken(usage.cachedInputTokens), finiteToken(usage.cached_input_tokens), finiteToken(usage.prompt_tokens_details?.cached_tokens), finiteToken(usage.promptTokensDetails?.cachedTokens), finiteToken(usage.input_tokens_details?.cached_tokens), finiteToken(usage.inputTokensDetails?.cachedTokens));
    const separateCacheReadTokens = Math.max(finiteToken(usage.cacheReadInputTokens), finiteToken(usage.cache_read_input_tokens));
    const cacheReadInputTokens = Math.max(includedCacheReadTokens, separateCacheReadTokens);
    const cacheReadIncludedInInput = usage.cacheReadIncludedInInput === true
        || usage.cache_read_included_in_input === true
        || (includedCacheReadTokens > 0 && separateCacheReadTokens === 0);
    const normalizedInputTokens = finiteToken(usage.inputTokens);
    const effectiveProviderInputTokens = normalizedInputTokens || providerInputTokens;
    const directInputTokens = declaredDirectInputTokens || (cacheReadIncludedInInput
        ? Math.max(0, effectiveProviderInputTokens - cacheReadInputTokens)
        : providerInputTokens);
    const accountedInputTokens = normalizedInputTokens || providerInputTokens + cacheCreationInputTokens + (cacheReadIncludedInInput ? 0 : cacheReadInputTokens);
    const outputTokens = Math.max(finiteToken(usage.outputTokens), finiteToken(usage.output_tokens), finiteToken(usage.completion_tokens), finiteToken(usage.completionTokens));
    const providerTotalTokens = Math.max(finiteToken(usage.providerTotalTokens), finiteToken(usage.provider_total_tokens), finiteToken(usage.total_tokens), finiteToken(usage.totalTokens));
    const accountedTotalTokens = providerTotalTokens || accountedInputTokens + outputTokens;
    const totalCostUsd = Math.max(0, Number(usage.totalCostUsd || usage.total_cost_usd || usage.costUsd || usage.cost_usd || 0) || 0);
    const reported = usage.reported === true || accountedInputTokens > 0 || outputTokens > 0 || providerTotalTokens > 0 || totalCostUsd > 0;
    const executionSucceeded = input.executionSucceeded !== false;
    const status = executionSucceeded ? (reported ? "reported" : "unreported") : "failed";
    const finalPromptEstimatedTokens = Math.max(0, Math.floor(Number(input.finalPromptEstimatedTokens || 0)));
    const memoryTransportEstimatedTokens = Math.max(0, Math.floor(Number(input.memoryTransportEstimatedTokens || 0)));
    const taskFamily = taskAgentMemoryTransportTaskFamily(input.taskText || input.task || "", input.taskFamilyKey || input.task_family_key || "");
    const usageProvenance = buildTaskAgentMemoryTransportUsageProvenance({
        usage,
        providerUsageProvenance: input.providerUsageProvenance,
        providerRuntimeIdentityChecksum: input.providerRuntimeIdentityChecksum,
        observedAt: input.observedAt,
    });
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
        task_family_key: taskFamily.key,
        task_family_source: taskFamily.source,
        task_family_source_checksum: taskFamily.sourceChecksum,
        snapshot_id: String(input.snapshotId || ""),
        snapshot_checksum: String(input.snapshotChecksum || ""),
        runner_request_id: String(input.runnerRequestId || ""),
        native_session_id: String(input.nativeSessionId || ""),
        provider: rawProvider ? (0, runtime_1.normalizeAgentRuntimeId)(rawProvider) : "",
        model: String(input.model || ""),
        provider_contract_id: String(input.providerContractId || ""),
        provider_runtime_version: String(input.providerRuntimeVersion || ""),
        provider_runtime_identity_checksum: String(usageProvenance.provider_runtime_identity_checksum || ""),
        usage_provenance: usageProvenance,
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
        final_prompt_size_bucket: taskAgentMemoryTransportPromptSizeBucket(finalPromptEstimatedTokens),
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
    if (receipt?.final_prompt_size_bucket !== undefined
        && String(receipt.final_prompt_size_bucket || "") !== taskAgentMemoryTransportPromptSizeBucket(receipt?.final_prompt_estimated_tokens))
        issues.push("memory_transport_usage_prompt_bucket_invalid");
    if (receipt?.task_family_source !== undefined && !new Set(["explicit", "worker_packet_task", "missing"]).has(String(receipt.task_family_source || "")))
        issues.push("memory_transport_usage_task_family_source_invalid");
    if (receipt?.task_family_source_checksum && !/^[a-f0-9]{64}$/.test(String(receipt.task_family_source_checksum)))
        issues.push("memory_transport_usage_task_family_checksum_invalid");
    if (receipt?.usage_provenance !== undefined) {
        const usageProvenanceVerification = verifyTaskAgentMemoryTransportUsageProvenance(receipt.usage_provenance);
        if (!usageProvenanceVerification.valid)
            issues.push(...usageProvenanceVerification.issues);
        if (String(receipt?.provider_runtime_identity_checksum || "") !== String(receipt?.usage_provenance?.provider_runtime_identity_checksum || ""))
            issues.push("memory_transport_usage_runtime_identity_mismatch");
    }
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
        ["model", expected.model, receipt?.model],
        ["provider_contract_id", expected.providerContractId, receipt?.provider_contract_id],
        ["provider_runtime_version", expected.providerRuntimeVersion, receipt?.provider_runtime_version],
        ["provider_runtime_identity_checksum", expected.providerRuntimeIdentityChecksum, receipt?.provider_runtime_identity_checksum],
        ["task_family_key", expected.taskFamilyKey, receipt?.task_family_key],
    ];
    for (const [field, wanted, actual] of bindings)
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`memory_transport_usage_${field}_mismatch`);
    return { valid: issues.length === 0, issues: [...new Set(issues)], status: String(receipt?.status || ""), reported: receipt?.reported === true };
}
//# sourceMappingURL=task-agent-memory-transport-usage.js.map