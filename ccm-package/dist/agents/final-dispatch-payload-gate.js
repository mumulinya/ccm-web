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
exports.FINAL_DISPATCH_PROVIDER_USAGE_BASELINE_SCHEMA = exports.FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA = void 0;
exports.buildFinalDispatchProviderUsageBaseline = buildFinalDispatchProviderUsageBaseline;
exports.verifyFinalDispatchProviderUsageBaseline = verifyFinalDispatchProviderUsageBaseline;
exports.verifyFinalWorkerDispatchPayloadGate = verifyFinalWorkerDispatchPayloadGate;
exports.buildFinalWorkerDispatchPayloadGate = buildFinalWorkerDispatchPayloadGate;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const runtime_1 = require("./runtime");
exports.FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA = "ccm-final-worker-dispatch-payload-gate-v1";
exports.FINAL_DISPATCH_PROVIDER_USAGE_BASELINE_SCHEMA = "ccm-final-dispatch-provider-usage-baseline-v1";
function hash(value, len = 32) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}
function gateChecksum(gate) {
    const payload = { ...(gate || {}) };
    delete payload.gate_checksum;
    delete payload.checksum_valid;
    return hash(payload);
}
function baselineChecksum(baseline) {
    const payload = { ...(baseline || {}) };
    delete payload.baseline_checksum;
    delete payload.checksum_valid;
    return hash(payload, 64);
}
function finiteToken(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}
function buildFinalDispatchProviderUsageBaseline(input = {}) {
    const usage = input.usage || input.providerUsage || input.provider_usage || {};
    const memoryBinding = input.groupSessionMemoryBinding || input.group_session_memory_binding || {};
    const provider = (0, runtime_1.normalizeAgentRuntimeId)(input.provider || usage.provider || "");
    const model = String(input.model || usage.model || "").trim();
    const providerContractId = String(input.providerContractId || input.provider_contract_id || usage.provider_contract_id || "").trim();
    const providerRuntimeVersion = String(input.providerRuntimeVersion || input.provider_runtime_version || usage.provider_runtime_version || "").trim();
    const sourceCompactEpoch = String(input.compactEpoch || input.compact_epoch || memoryBinding.compactEpoch || memoryBinding.compact_epoch || usage.compact_epoch || "").trim();
    const sourceCompactHeadId = String(input.compactHeadId || input.compact_head_id || memoryBinding.compactHeadId || memoryBinding.compact_head_id || "").trim();
    const sourceCompactHeadChecksum = String(input.compactHeadChecksum || input.compact_head_checksum || memoryBinding.compactHeadChecksum || memoryBinding.compact_head_checksum || "").trim();
    const sourceCompactHeadGeneration = finiteToken(input.compactHeadGeneration ?? input.compact_head_generation ?? memoryBinding.compactHeadGeneration ?? memoryBinding.compact_head_generation);
    const sourceSnapshotChecksum = String(usage.snapshot_checksum || "").trim();
    const compactLineageValid = (sourceCompactEpoch === "precompact" || sourceCompactEpoch.startsWith("cmp_"))
        && !!sourceSnapshotChecksum
        && (sourceCompactEpoch === "precompact" || (!!sourceCompactHeadId && !!sourceCompactHeadChecksum && sourceCompactHeadGeneration > 0));
    const directInputTokens = finiteToken(usage.direct_input_tokens);
    const cacheReadInputTokens = finiteToken(usage.cache_read_input_tokens);
    const cacheCreationInputTokens = finiteToken(usage.cache_creation_input_tokens);
    const observedContextTokens = directInputTokens + cacheReadInputTokens + cacheCreationInputTokens;
    const estimatedContextTokens = finiteToken(usage.final_prompt_estimated_tokens || input.estimatedContextTokens || input.estimated_context_tokens);
    const positiveDriftTokens = Math.max(0, observedContextTokens - estimatedContextTokens);
    const core = {
        schema: exports.FINAL_DISPATCH_PROVIDER_USAGE_BASELINE_SCHEMA,
        version: 1,
        baseline_id: `fdpub_${hash([
            input.groupId || input.group_id || usage.group_id || "",
            input.groupSessionId || input.group_session_id || usage.group_session_id || "",
            input.taskId || input.task_id || usage.task_id || "",
            input.taskAgentSessionId || input.task_agent_session_id || usage.task_agent_session_id || "",
            provider,
            model,
            usage.usage_checksum || "",
        ], 24)}`,
        status: usage.status === "reported" && usage.reported === true && provider && model && compactLineageValid && observedContextTokens > 0 && estimatedContextTokens > 0 ? "ready" : "unavailable",
        body_free: true,
        measurement_scope: "exact_task_agent_session_last_provider_call",
        group_id: String(input.groupId || input.group_id || usage.group_id || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || usage.group_session_id || ""),
        task_id: String(input.taskId || input.task_id || usage.task_id || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || usage.task_agent_session_id || ""),
        provider,
        model,
        provider_contract_id: providerContractId,
        provider_runtime_version: providerRuntimeVersion,
        source_compact_epoch: sourceCompactEpoch,
        source_compact_head_id: sourceCompactHeadId,
        source_compact_head_generation: sourceCompactHeadGeneration,
        source_compact_head_checksum: sourceCompactHeadChecksum,
        source_usage_checksum: String(usage.usage_checksum || ""),
        source_snapshot_id: String(usage.snapshot_id || ""),
        source_snapshot_checksum: sourceSnapshotChecksum,
        estimated_context_tokens: estimatedContextTokens,
        observed_context_tokens: observedContextTokens,
        direct_input_tokens: directInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        cache_creation_input_tokens: cacheCreationInputTokens,
        positive_drift_tokens: positiveDriftTokens,
        observed_to_estimated_ratio: estimatedContextTokens > 0
            ? Math.round((observedContextTokens / estimatedContextTokens) * 10_000) / 10_000
            : null,
        observed_at: String(usage.observed_at || input.observedAt || input.observed_at || new Date().toISOString()),
    };
    return { ...core, baseline_checksum: baselineChecksum(core) };
}
function verifyFinalDispatchProviderUsageBaseline(baseline, expected = {}) {
    const issues = [];
    if (baseline?.schema !== exports.FINAL_DISPATCH_PROVIDER_USAGE_BASELINE_SCHEMA || Number(baseline?.version || 0) !== 1)
        issues.push("provider_usage_baseline_schema_invalid");
    if (String(baseline?.baseline_checksum || "") !== baselineChecksum(baseline))
        issues.push("provider_usage_baseline_checksum_invalid");
    if (baseline?.status !== "ready")
        issues.push("provider_usage_baseline_not_ready");
    if (baseline?.body_free !== true)
        issues.push("provider_usage_baseline_body_free_missing");
    if (baseline?.measurement_scope !== "exact_task_agent_session_last_provider_call")
        issues.push("provider_usage_baseline_scope_invalid");
    if (!String(baseline?.group_session_id || "").startsWith("gcs_"))
        issues.push("provider_usage_baseline_group_session_missing");
    if (!String(baseline?.task_agent_session_id || "").startsWith("tas_"))
        issues.push("provider_usage_baseline_task_session_missing");
    if (!String(baseline?.provider || ""))
        issues.push("provider_usage_baseline_provider_missing");
    if (!String(baseline?.model || "").trim())
        issues.push("provider_usage_baseline_model_missing");
    const sourceCompactEpoch = String(baseline?.source_compact_epoch || "").trim();
    if (sourceCompactEpoch !== "precompact" && !sourceCompactEpoch.startsWith("cmp_"))
        issues.push("provider_usage_baseline_compact_epoch_invalid");
    if (!String(baseline?.source_snapshot_checksum || "").trim())
        issues.push("provider_usage_baseline_snapshot_checksum_missing");
    if (sourceCompactEpoch.startsWith("cmp_") && (!String(baseline?.source_compact_head_id || "").trim() || !String(baseline?.source_compact_head_checksum || "").trim() || finiteToken(baseline?.source_compact_head_generation) <= 0))
        issues.push("provider_usage_baseline_compact_head_missing");
    if (!/^[a-f0-9]{64}$/.test(String(baseline?.source_usage_checksum || "")))
        issues.push("provider_usage_baseline_source_checksum_invalid");
    const directInputTokens = finiteToken(baseline?.direct_input_tokens);
    const cacheReadInputTokens = finiteToken(baseline?.cache_read_input_tokens);
    const cacheCreationInputTokens = finiteToken(baseline?.cache_creation_input_tokens);
    const observedContextTokens = directInputTokens + cacheReadInputTokens + cacheCreationInputTokens;
    const estimatedContextTokens = finiteToken(baseline?.estimated_context_tokens);
    if (observedContextTokens <= 0 || Number(baseline?.observed_context_tokens || 0) !== observedContextTokens)
        issues.push("provider_usage_baseline_observed_tokens_invalid");
    if (estimatedContextTokens <= 0)
        issues.push("provider_usage_baseline_estimated_tokens_invalid");
    if (Number(baseline?.positive_drift_tokens || 0) !== Math.max(0, observedContextTokens - estimatedContextTokens))
        issues.push("provider_usage_baseline_drift_invalid");
    if (!Number.isFinite(Date.parse(String(baseline?.observed_at || ""))))
        issues.push("provider_usage_baseline_time_invalid");
    const bindings = [
        ["group_id", expected.groupId ?? expected.group_id, baseline?.group_id],
        ["group_session_id", expected.groupSessionId ?? expected.group_session_id, baseline?.group_session_id],
        ["task_id", expected.taskId ?? expected.task_id, baseline?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId ?? expected.task_agent_session_id, baseline?.task_agent_session_id],
        ["provider", expected.provider === undefined ? undefined : (0, runtime_1.normalizeAgentRuntimeId)(expected.provider), baseline?.provider],
        ["model", expected.model, baseline?.model],
        ["provider_contract_id", expected.providerContractId ?? expected.provider_contract_id, baseline?.provider_contract_id],
        ["provider_runtime_version", expected.providerRuntimeVersion ?? expected.provider_runtime_version, baseline?.provider_runtime_version],
        ["source_compact_epoch", expected.compactEpoch ?? expected.compact_epoch, baseline?.source_compact_epoch],
        ["source_compact_head_id", expected.compactHeadId ?? expected.compact_head_id, baseline?.source_compact_head_id],
        ["source_compact_head_generation", expected.compactHeadGeneration ?? expected.compact_head_generation, baseline?.source_compact_head_generation],
        ["source_compact_head_checksum", expected.compactHeadChecksum ?? expected.compact_head_checksum, baseline?.source_compact_head_checksum],
    ];
    for (const [field, wanted, actual] of bindings) {
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`provider_usage_baseline_${field}_mismatch`);
    }
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function verifyFinalWorkerDispatchPayloadGate(gate, expected = {}) {
    const issues = [];
    if (gate?.schema !== exports.FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA || Number(gate?.version || 0) !== 1)
        issues.push("final_dispatch_payload_gate_schema_invalid");
    if (String(gate?.gate_checksum || "") !== gateChecksum(gate))
        issues.push("final_dispatch_payload_gate_checksum_invalid");
    if (!String(gate?.prompt_checksum || ""))
        issues.push("final_dispatch_prompt_checksum_missing");
    if (!Number(gate?.auto_compact_threshold || 0))
        issues.push("final_dispatch_auto_compact_threshold_missing");
    if (!Number(gate?.estimated_total_input_tokens || 0))
        issues.push("final_dispatch_token_count_missing");
    if (!["ready", "recompact_required", "calibration_invalid"].includes(String(gate?.status || "")))
        issues.push("final_dispatch_payload_gate_status_invalid");
    const modelVisibleInputTokens = Number(gate?.model_visible_input_tokens || gate?.estimated_total_input_tokens || 0);
    if (gate?.status === "ready" && modelVisibleInputTokens >= Number(gate?.auto_compact_threshold || 0))
        issues.push("final_dispatch_ready_above_threshold");
    if (gate?.status === "recompact_required" && modelVisibleInputTokens < Number(gate?.auto_compact_threshold || 0))
        issues.push("final_dispatch_recompact_below_threshold");
    if (gate?.status === "calibration_invalid" && gate?.provider_call_allowed === true)
        issues.push("final_dispatch_invalid_calibration_allowed");
    const identities = [
        ["group_id", expected.groupId || expected.group_id],
        ["group_session_id", expected.groupSessionId || expected.group_session_id],
        ["task_id", expected.taskId || expected.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
        ["worker_context_packet_id", expected.workerContextPacketId || expected.worker_context_packet_id],
    ];
    for (const [field, value] of identities) {
        if (value && String(gate?.[field] || "") !== String(value))
            issues.push(`final_dispatch_${field}_mismatch`);
    }
    if (expected.renderedPrompt || expected.rendered_prompt) {
        const prompt = String(expected.renderedPrompt || expected.rendered_prompt || "");
        if (String(gate?.prompt_checksum || "") !== hash(prompt))
            issues.push("final_dispatch_prompt_checksum_mismatch");
        if (Number(gate?.estimated_prompt_tokens || 0) !== (0, context_budget_1.estimateTextTokens)(prompt))
            issues.push("final_dispatch_prompt_token_count_mismatch");
    }
    const baseline = gate?.provider_usage_baseline || null;
    if (baseline) {
        const baselineVerification = verifyFinalDispatchProviderUsageBaseline(baseline, {
            groupId: gate?.group_id,
            groupSessionId: gate?.group_session_id,
            taskId: gate?.task_id,
            taskAgentSessionId: gate?.task_agent_session_id,
            provider: gate?.provider,
            model: gate?.model,
            ...(String(gate?.provider_contract_id || "").trim() ? { providerContractId: gate.provider_contract_id } : {}),
            ...(String(gate?.provider_runtime_version || "").trim() ? { providerRuntimeVersion: gate.provider_runtime_version } : {}),
            compactEpoch: gate?.compact_epoch,
            compactHeadId: gate?.compact_head_id,
            compactHeadGeneration: gate?.compact_head_generation,
            compactHeadChecksum: gate?.compact_head_checksum,
        });
        if (!baselineVerification.valid)
            issues.push(...baselineVerification.issues);
        if (gate?.provider_usage_baseline_status !== (baselineVerification.valid ? "provider_observed" : "invalid"))
            issues.push("final_dispatch_provider_usage_baseline_status_invalid");
        const expectedBias = baselineVerification.valid ? Math.max(0, Number(baseline?.positive_drift_tokens || 0)) : 0;
        if (Number(gate?.provider_usage_baseline_bias_tokens || 0) !== expectedBias)
            issues.push("final_dispatch_provider_usage_baseline_bias_invalid");
        if (baselineVerification.valid && modelVisibleInputTokens !== Number(gate?.estimated_total_input_tokens || 0) + expectedBias)
            issues.push("final_dispatch_model_visible_input_tokens_invalid");
    }
    else {
        if (gate?.provider_usage_baseline_status !== "estimated")
            issues.push("final_dispatch_provider_usage_baseline_status_invalid");
        if (Number(gate?.provider_usage_baseline_bias_tokens || 0) !== 0)
            issues.push("final_dispatch_provider_usage_baseline_bias_invalid");
        if (modelVisibleInputTokens !== Number(gate?.estimated_total_input_tokens || 0))
            issues.push("final_dispatch_model_visible_input_tokens_invalid");
    }
    return { valid: issues.length === 0, issues };
}
function buildFinalWorkerDispatchPayloadGate(input = {}) {
    const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
    const workerHandoff = input.workerHandoff || input.worker_handoff || {};
    const packet = input.workerContextPacket || input.worker_context_packet || workerHandoff.worker_context_packet || workerHandoff.workerContextPacket || {};
    const suppliedCapacity = input.modelContextCapacity || input.model_context_capacity || packet.model_context_capacity || packet.context_usage?.capacity_provenance || {};
    const provider = String(input.provider || input.agentType || input.agent_type || suppliedCapacity.provider || workerHandoff.agent_type || "unknown");
    const model = String(input.model || input.modelId || input.model_id || suppliedCapacity.model || "");
    const providerContractId = String(input.providerContractId || input.provider_contract_id || "").trim();
    const providerRuntimeVersion = String(input.providerRuntimeVersion || input.provider_runtime_version || "").trim();
    const memoryBinding = input.groupSessionMemoryBinding || input.group_session_memory_binding || {};
    const compactEpoch = String(input.compactEpoch || input.compact_epoch || memoryBinding.compactEpoch || memoryBinding.compact_epoch || "precompact").trim() || "precompact";
    const compactHeadId = String(input.compactHeadId || input.compact_head_id || memoryBinding.compactHeadId || memoryBinding.compact_head_id || "").trim();
    const compactHeadGeneration = finiteToken(input.compactHeadGeneration ?? input.compact_head_generation ?? memoryBinding.compactHeadGeneration ?? memoryBinding.compact_head_generation);
    const compactHeadChecksum = String(input.compactHeadChecksum || input.compact_head_checksum || memoryBinding.compactHeadChecksum || memoryBinding.compact_head_checksum || "").trim();
    const memoryBindingChecksum = String(input.memoryBindingChecksum || input.memory_binding_checksum || memoryBinding.checksum || "").trim();
    const contextWindow = Math.max(32_000, Number(suppliedCapacity.contextWindow || 200_000));
    const reservedOutputTokens = Math.max(0, Number(suppliedCapacity.reservedOutputTokens || suppliedCapacity.maxOutputTokens || 20_000));
    const effectiveContextWindow = Math.max(18_000, Number(suppliedCapacity.effectiveContextWindow || contextWindow - reservedOutputTokens));
    const autoCompactBufferTokens = Math.max(0, Number(suppliedCapacity.autoCompactBufferTokens || 13_000));
    const autoCompactThreshold = Math.max(18_000, Math.min(effectiveContextWindow, Number(suppliedCapacity.autoCompactThreshold || effectiveContextWindow - autoCompactBufferTokens)));
    const estimatedPromptTokens = (0, context_budget_1.estimateTextTokens)(renderedPrompt);
    const providerEnvelopeTokens = Math.max(0, Number(input.providerEnvelopeTokens || input.provider_envelope_tokens || 0));
    const estimatedTotalInputTokens = estimatedPromptTokens + providerEnvelopeTokens;
    const providerUsageBaseline = input.providerUsageBaseline || input.provider_usage_baseline || null;
    const providerUsageBaselineVerification = providerUsageBaseline
        ? verifyFinalDispatchProviderUsageBaseline(providerUsageBaseline, {
            groupId: input.groupId || input.group_id || packet.group?.id || "",
            groupSessionId: input.groupSessionId || input.group_session_id || packet.group_session_id || packet.memory?.group_session_id || "",
            taskId: input.taskId || input.task_id || packet.task_id || "",
            taskAgentSessionId: input.taskAgentSessionId || input.task_agent_session_id || packet.task_agent_session_id || "",
            provider,
            model,
            ...(providerContractId ? { providerContractId } : {}),
            ...(providerRuntimeVersion ? { providerRuntimeVersion } : {}),
            compactEpoch,
            compactHeadId,
            compactHeadGeneration,
            compactHeadChecksum,
        })
        : { valid: false, issues: [] };
    const providerUsageBaselineBiasTokens = providerUsageBaselineVerification.valid
        ? Math.max(0, Number(providerUsageBaseline?.positive_drift_tokens || 0))
        : 0;
    const modelVisibleInputTokens = estimatedTotalInputTokens + providerUsageBaselineBiasTokens;
    const providerUsageBaselineStatus = providerUsageBaseline
        ? providerUsageBaselineVerification.valid ? "provider_observed" : "invalid"
        : "estimated";
    const status = providerUsageBaselineStatus === "invalid"
        ? "calibration_invalid"
        : modelVisibleInputTokens >= autoCompactThreshold ? "recompact_required" : "ready";
    const core = {
        schema: exports.FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA,
        version: 1,
        gate_id: `fwdpg_${hash([input.groupId || input.group_id || "", input.groupSessionId || input.group_session_id || "", input.taskId || input.task_id || "", input.taskAgentSessionId || input.task_agent_session_id || "", packet.packet_id || "", provider, model, hash(renderedPrompt), providerUsageBaseline?.baseline_checksum || ""], 24)}`,
        group_id: String(input.groupId || input.group_id || packet.group?.id || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || packet.group_session_id || packet.memory?.group_session_id || ""),
        task_id: String(input.taskId || input.task_id || packet.task_id || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || packet.task_agent_session_id || ""),
        worker_context_packet_id: String(packet.packet_id || ""),
        provider,
        model,
        provider_contract_id: providerContractId,
        provider_runtime_version: providerRuntimeVersion,
        compact_epoch: compactEpoch,
        compact_head_id: compactHeadId,
        compact_head_generation: compactHeadGeneration,
        compact_head_checksum: compactHeadChecksum,
        memory_binding_checksum: memoryBindingChecksum,
        model_context_window: contextWindow,
        reserved_output_tokens: reservedOutputTokens,
        effective_context_window: effectiveContextWindow,
        auto_compact_buffer_tokens: autoCompactBufferTokens,
        auto_compact_threshold: autoCompactThreshold,
        estimated_prompt_tokens: estimatedPromptTokens,
        provider_envelope_tokens: providerEnvelopeTokens,
        estimated_total_input_tokens: estimatedTotalInputTokens,
        model_visible_input_tokens: modelVisibleInputTokens,
        token_basis: providerUsageBaselineVerification.valid ? "provider_observed_baseline_plus_current_estimate" : "estimated_final_prompt",
        provider_usage_baseline_status: providerUsageBaselineStatus,
        provider_usage_baseline_bias_tokens: providerUsageBaselineBiasTokens,
        provider_usage_baseline: providerUsageBaseline || null,
        remaining_tokens_before_auto_compact: autoCompactThreshold - modelVisibleInputTokens,
        prompt_chars: renderedPrompt.length,
        prompt_checksum: hash(renderedPrompt),
        worker_packet_estimated_tokens: Number(packet.context_usage?.total_tokens || packet.context_budget?.estimated_tokens || 0),
        capacity_evidence_checksum: String(suppliedCapacity.evidenceChecksum || ""),
        capacity_source: String(suppliedCapacity.source || "cc_default_200k"),
        status,
        action: status === "ready"
            ? "dispatch_ready"
            : status === "calibration_invalid"
                ? "fail_closed_invalid_provider_usage_baseline"
                : "rebuild_or_compact_final_prompt_before_provider_call",
        provider_call_allowed: status === "ready",
        checked_at: new Date().toISOString(),
    };
    return { ...core, gate_checksum: gateChecksum(core) };
}
//# sourceMappingURL=final-dispatch-payload-gate.js.map