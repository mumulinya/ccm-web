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
exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA = exports.projectFinalDispatchRecentContext = void 0;
exports.isProviderPromptTooLongFailure = isProviderPromptTooLongFailure;
exports.verifyFinalDispatchReactiveCompactReceipt = verifyFinalDispatchReactiveCompactReceipt;
exports.recoverFinalWorkerDispatchPayload = recoverFinalWorkerDispatchPayload;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const final_dispatch_payload_gate_1 = require("./final-dispatch-payload-gate");
const final_dispatch_context_collapse_1 = require("./final-dispatch-context-collapse");
var final_dispatch_context_collapse_2 = require("./final-dispatch-context-collapse");
Object.defineProperty(exports, "projectFinalDispatchRecentContext", { enumerable: true, get: function () { return final_dispatch_context_collapse_2.projectFinalDispatchRecentContext; } });
exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA = "ccm-final-dispatch-reactive-compact-v1";
function isProviderPromptTooLongFailure(value) {
    const text = String(value?.message || value?.error || value || "");
    return /(?:prompt|request|input).{0,40}(?:too[ _-]?long|too large|exceeds|exceeded)|(?:context|token).{0,40}(?:window|length|limit|maximum|max)|maximum context length|context_length_exceeded|prompt_too_long|request_too_large|http\s*413|status\s*413/i.test(text);
}
function hash(value, len = 32) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}
function receiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    return hash(payload);
}
function verifyFinalDispatchReactiveCompactReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA || Number(receipt?.version || 0) !== 1)
        issues.push("final_dispatch_reactive_compact_schema_invalid");
    if (String(receipt?.receipt_checksum || "") !== receiptChecksum(receipt))
        issues.push("final_dispatch_reactive_compact_checksum_invalid");
    if (Number(receipt?.attempt || 0) !== 1)
        issues.push("final_dispatch_reactive_compact_attempt_invalid");
    if (!["preflight_threshold", "provider_prompt_too_long"].includes(String(receipt?.trigger || "")))
        issues.push("final_dispatch_reactive_compact_trigger_invalid");
    if (!["recovered", "blocked"].includes(String(receipt?.status || "")))
        issues.push("final_dispatch_reactive_compact_status_invalid");
    if (receipt?.status === "recovered" && receipt?.provider_call_allowed !== true)
        issues.push("final_dispatch_reactive_compact_recovered_not_allowed");
    if (receipt?.status === "blocked" && receipt?.provider_call_allowed === true)
        issues.push("final_dispatch_reactive_compact_blocked_allowed");
    if (receipt?.context_collapse) {
        const collapseVerification = (0, final_dispatch_context_collapse_1.verifyFinalDispatchContextCollapseReceipt)(receipt.context_collapse, expected);
        if (!collapseVerification.valid)
            issues.push(...collapseVerification.issues);
    }
    for (const [field, value] of [
        ["group_id", expected.groupId || expected.group_id],
        ["group_session_id", expected.groupSessionId || expected.group_session_id],
        ["task_id", expected.taskId || expected.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
        ["worker_context_packet_id", expected.workerContextPacketId || expected.worker_context_packet_id],
    ]) {
        if (value && String(receipt?.[field] || "") !== String(value))
            issues.push(`final_dispatch_reactive_compact_${field}_mismatch`);
    }
    return { valid: issues.length === 0, issues };
}
function recoverFinalWorkerDispatchPayload(input = {}) {
    const originalPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
    const workerHandoff = input.workerHandoff || input.worker_handoff || {};
    const originalGate = input.finalDispatchPayloadGate || input.final_dispatch_payload_gate
        || (0, final_dispatch_payload_gate_1.buildFinalWorkerDispatchPayloadGate)({ ...input, renderedPrompt: originalPrompt, workerHandoff });
    const forceReactiveCompact = input.forceReactiveCompact === true || input.force_reactive_compact === true;
    if (originalGate.status !== "recompact_required" && !forceReactiveCompact)
        return { recovered: false, reason: "final_dispatch_payload_already_ready", prompt: originalPrompt, gate: originalGate, receipt: null };
    const workerContextPacketId = String(workerHandoff.worker_context_packet?.packet_id || originalGate.worker_context_packet_id || input.workerContextPacketId || input.worker_context_packet_id || "");
    const groupId = String(input.groupId || input.group_id || originalGate.group_id || "");
    const groupSessionId = String(input.groupSessionId || input.group_session_id || originalGate.group_session_id || "");
    const core = {
        schema: exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA,
        version: 1,
        receipt_id: `fdrc_${hash([originalGate.gate_id || "", "canonical-parent-fail-closed"], 24)}`,
        attempt: 1,
        trigger: forceReactiveCompact ? "provider_prompt_too_long" : "preflight_threshold",
        group_id: groupId,
        group_session_id: groupSessionId,
        task_id: String(input.taskId || input.task_id || originalGate.task_id || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || originalGate.task_agent_session_id || ""),
        worker_context_packet_id: workerContextPacketId,
        original_gate_id: String(originalGate.gate_id || ""),
        recovered_gate_id: String(originalGate.gate_id || ""),
        original_prompt_checksum: String(originalGate.prompt_checksum || ""),
        recovered_prompt_checksum: String(originalGate.prompt_checksum || ""),
        original_prompt_tokens: Number(originalGate.estimated_total_input_tokens || 0),
        recovered_prompt_tokens: Number(originalGate.estimated_total_input_tokens || 0),
        auto_compact_threshold: Number(originalGate.auto_compact_threshold || 0),
        safety_margin_tokens: 0,
        fixed_prompt_tokens: Number(originalGate.estimated_total_input_tokens || 0),
        recent_context_budget_tokens: 0,
        recent_context_original_tokens: (0, context_budget_1.estimateTextTokens)(input.recentContext || input.recent_context || ""),
        recent_context_projected_tokens: 0,
        recent_context_original_chars: String(input.recentContext || input.recent_context || "").length,
        recent_context_projected_chars: 0,
        omitted_context_lines: 0,
        recent_context_source_checksum: hash(input.recentContext || input.recent_context || ""),
        recent_context_projection_checksum: "",
        context_collapse: null,
        recovery_stages: ["native_generation_rotation_required", "canonical_parent_context_reinject_required"],
        status: "blocked",
        action: "rotate_native_generation_and_reinject_canonical_parent_context",
        provider_call_allowed: false,
        recovered_gate_valid: false,
        recovered_gate_issues: ["local_projection_disabled"],
        created_at: new Date().toISOString(),
    };
    const receipt = { ...core, receipt_checksum: receiptChecksum(core) };
    return { recovered: false, reason: receipt.action, prompt: originalPrompt, gate: originalGate, receipt, projection: null, contextCollapse: null };
}
//# sourceMappingURL=final-dispatch-reactive-compact.js.map