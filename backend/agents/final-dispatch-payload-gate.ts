import * as crypto from "crypto";
import { estimateTextTokens } from "../system/context-budget";

export const FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA = "ccm-final-worker-dispatch-payload-gate-v1";

function hash(value: any, len = 32) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}

function gateChecksum(gate: any) {
  const payload = { ...(gate || {}) };
  delete payload.gate_checksum;
  delete payload.checksum_valid;
  return hash(payload);
}

export function verifyFinalWorkerDispatchPayloadGate(gate: any, expected: any = {}) {
  const issues: string[] = [];
  if (gate?.schema !== FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA || Number(gate?.version || 0) !== 1) issues.push("final_dispatch_payload_gate_schema_invalid");
  if (String(gate?.gate_checksum || "") !== gateChecksum(gate)) issues.push("final_dispatch_payload_gate_checksum_invalid");
  if (!String(gate?.prompt_checksum || "")) issues.push("final_dispatch_prompt_checksum_missing");
  if (!Number(gate?.auto_compact_threshold || 0)) issues.push("final_dispatch_auto_compact_threshold_missing");
  if (!Number(gate?.estimated_total_input_tokens || 0)) issues.push("final_dispatch_token_count_missing");
  if (!["ready", "recompact_required"].includes(String(gate?.status || ""))) issues.push("final_dispatch_payload_gate_status_invalid");
  if (gate?.status === "ready" && Number(gate?.estimated_total_input_tokens || 0) >= Number(gate?.auto_compact_threshold || 0)) issues.push("final_dispatch_ready_above_threshold");
  if (gate?.status === "recompact_required" && Number(gate?.estimated_total_input_tokens || 0) < Number(gate?.auto_compact_threshold || 0)) issues.push("final_dispatch_recompact_below_threshold");
  const identities = [
    ["group_id", expected.groupId || expected.group_id],
    ["group_session_id", expected.groupSessionId || expected.group_session_id],
    ["task_id", expected.taskId || expected.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
    ["worker_context_packet_id", expected.workerContextPacketId || expected.worker_context_packet_id],
  ];
  for (const [field, value] of identities) {
    if (value && String(gate?.[field] || "") !== String(value)) issues.push(`final_dispatch_${field}_mismatch`);
  }
  if (expected.renderedPrompt || expected.rendered_prompt) {
    const prompt = String(expected.renderedPrompt || expected.rendered_prompt || "");
    if (String(gate?.prompt_checksum || "") !== hash(prompt)) issues.push("final_dispatch_prompt_checksum_mismatch");
    if (Number(gate?.estimated_prompt_tokens || 0) !== estimateTextTokens(prompt)) issues.push("final_dispatch_prompt_token_count_mismatch");
  }
  return { valid: issues.length === 0, issues };
}

export function buildFinalWorkerDispatchPayloadGate(input: any = {}) {
  const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
  const workerHandoff = input.workerHandoff || input.worker_handoff || {};
  const packet = input.workerContextPacket || input.worker_context_packet || workerHandoff.worker_context_packet || workerHandoff.workerContextPacket || {};
  const suppliedCapacity = input.modelContextCapacity || input.model_context_capacity || packet.model_context_capacity || packet.context_usage?.capacity_provenance || {};
  const provider = String(input.provider || input.agentType || input.agent_type || suppliedCapacity.provider || workerHandoff.agent_type || "unknown");
  const model = String(input.model || input.modelId || input.model_id || suppliedCapacity.model || "");
  const contextWindow = Math.max(32_000, Number(suppliedCapacity.contextWindow || 200_000));
  const reservedOutputTokens = Math.max(0, Number(suppliedCapacity.reservedOutputTokens || suppliedCapacity.maxOutputTokens || 20_000));
  const effectiveContextWindow = Math.max(18_000, Number(suppliedCapacity.effectiveContextWindow || contextWindow - reservedOutputTokens));
  const autoCompactBufferTokens = Math.max(0, Number(suppliedCapacity.autoCompactBufferTokens || 13_000));
  const autoCompactThreshold = Math.max(18_000, Math.min(
    effectiveContextWindow,
    Number(suppliedCapacity.autoCompactThreshold || effectiveContextWindow - autoCompactBufferTokens),
  ));
  const estimatedPromptTokens = estimateTextTokens(renderedPrompt);
  const providerEnvelopeTokens = Math.max(0, Number(input.providerEnvelopeTokens || input.provider_envelope_tokens || 0));
  const estimatedTotalInputTokens = estimatedPromptTokens + providerEnvelopeTokens;
  const status = estimatedTotalInputTokens >= autoCompactThreshold ? "recompact_required" : "ready";
  const core = {
    schema: FINAL_WORKER_DISPATCH_PAYLOAD_GATE_SCHEMA,
    version: 1,
    gate_id: `fwdpg_${hash([input.groupId || input.group_id || "", input.groupSessionId || input.group_session_id || "", input.taskId || input.task_id || "", input.taskAgentSessionId || input.task_agent_session_id || "", packet.packet_id || "", provider, model, hash(renderedPrompt)], 24)}`,
    group_id: String(input.groupId || input.group_id || packet.group?.id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || packet.group_session_id || packet.memory?.group_session_id || ""),
    task_id: String(input.taskId || input.task_id || packet.task_id || ""),
    task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || packet.task_agent_session_id || ""),
    worker_context_packet_id: String(packet.packet_id || ""),
    provider,
    model,
    model_context_window: contextWindow,
    reserved_output_tokens: reservedOutputTokens,
    effective_context_window: effectiveContextWindow,
    auto_compact_buffer_tokens: autoCompactBufferTokens,
    auto_compact_threshold: autoCompactThreshold,
    estimated_prompt_tokens: estimatedPromptTokens,
    provider_envelope_tokens: providerEnvelopeTokens,
    estimated_total_input_tokens: estimatedTotalInputTokens,
    remaining_tokens_before_auto_compact: autoCompactThreshold - estimatedTotalInputTokens,
    prompt_chars: renderedPrompt.length,
    prompt_checksum: hash(renderedPrompt),
    worker_packet_estimated_tokens: Number(packet.context_usage?.total_tokens || packet.context_budget?.estimated_tokens || 0),
    capacity_evidence_checksum: String(suppliedCapacity.evidenceChecksum || ""),
    capacity_source: String(suppliedCapacity.source || "cc_default_200k"),
    status,
    action: status === "ready" ? "dispatch_ready" : "rebuild_or_compact_final_prompt_before_provider_call",
    provider_call_allowed: status === "ready",
    checked_at: new Date().toISOString(),
  };
  return { ...core, gate_checksum: gateChecksum(core) };
}
