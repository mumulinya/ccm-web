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
exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA = void 0;
exports.isProviderPromptTooLongFailure = isProviderPromptTooLongFailure;
exports.projectFinalDispatchRecentContext = projectFinalDispatchRecentContext;
exports.verifyFinalDispatchReactiveCompactReceipt = verifyFinalDispatchReactiveCompactReceipt;
exports.recoverFinalWorkerDispatchPayload = recoverFinalWorkerDispatchPayload;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const final_dispatch_payload_gate_1 = require("./final-dispatch-payload-gate");
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
function compactLongLine(line, maxChars) {
    const value = String(line || "");
    if (value.length <= maxChars)
        return value;
    const side = Math.max(40, Math.floor((maxChars - 90) / 2));
    return `${value.slice(0, side)}\n[... line compacted; sha256=${hash(value, 16)}; omitted=${Math.max(0, value.length - side * 2)} chars ...]\n${value.slice(-side)}`;
}
function projectFinalDispatchRecentContext(context, tokenBudget) {
    const source = String(context || "");
    const budget = Math.max(0, Math.floor(Number(tokenBudget || 0)));
    const originalTokens = (0, context_budget_1.estimateTextTokens)(source);
    if (!source || originalTokens <= budget) {
        return {
            text: source,
            compacted: false,
            original_tokens: originalTokens,
            projected_tokens: originalTokens,
            original_chars: source.length,
            projected_chars: source.length,
            omitted_lines: 0,
            source_checksum: hash(source),
            projection_checksum: hash(source),
        };
    }
    if (budget <= 0) {
        const marker = `[群聊近期上下文已从最终派发 prompt 移除；原文仍保存在当前群聊会话；sha256=${hash(source, 16)}]`;
        return {
            text: marker,
            compacted: true,
            original_tokens: originalTokens,
            projected_tokens: (0, context_budget_1.estimateTextTokens)(marker),
            original_chars: source.length,
            projected_chars: marker.length,
            omitted_lines: source.split(/\r?\n/).length,
            source_checksum: hash(source),
            projection_checksum: hash(marker),
        };
    }
    const lines = source.split(/\r?\n/);
    const important = /(?:必须|不得|禁止|验收|目标|约束|决策|结论|失败|错误|阻塞|风险|继续|task|session|gcs_|tas_|acceptance|requirement|decision|constraint|error|failed|blocked)/i;
    const selected = new Set();
    for (let index = 0; index < Math.min(10, lines.length); index += 1)
        selected.add(index);
    for (let index = 0; index < lines.length; index += 1)
        if (important.test(lines[index]))
            selected.add(index);
    for (let index = Math.max(0, lines.length - 80); index < lines.length; index += 1)
        selected.add(index);
    const render = (indexes) => {
        const rows = [];
        let previous = -1;
        for (const index of indexes) {
            if (previous >= 0 && index > previous + 1)
                rows.push(`[... ${index - previous - 1} older context lines omitted ...]`);
            rows.push(compactLongLine(lines[index], 1800));
            previous = index;
        }
        return rows.join("\n");
    };
    let indexes = Array.from(selected).sort((left, right) => left - right);
    let projected = render(indexes);
    while (indexes.length > 4 && (0, context_budget_1.estimateTextTokens)(projected) > budget) {
        const removable = indexes.findIndex(index => index >= 10 && index < lines.length - 24 && !important.test(lines[index]));
        if (removable >= 0)
            indexes.splice(removable, 1);
        else
            indexes.splice(Math.min(10, indexes.length - 2), 1);
        projected = render(indexes);
    }
    if ((0, context_budget_1.estimateTextTokens)(projected) > budget) {
        const maxChars = Math.max(160, budget * 3);
        const headChars = Math.min(Math.floor(maxChars * 0.35), projected.length);
        const tailChars = Math.max(80, maxChars - headChars - 100);
        projected = `${projected.slice(0, headChars)}\n[... context projection tightened; sha256=${hash(source, 16)} ...]\n${projected.slice(-tailChars)}`;
    }
    return {
        text: projected,
        compacted: true,
        original_tokens: originalTokens,
        projected_tokens: (0, context_budget_1.estimateTextTokens)(projected),
        original_chars: source.length,
        projected_chars: projected.length,
        omitted_lines: Math.max(0, lines.length - indexes.length),
        source_checksum: hash(source),
        projection_checksum: hash(projected),
    };
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
    const originalContext = String(input.recentContext || input.recent_context || "");
    const renderPrompt = typeof input.renderPrompt === "function" ? input.renderPrompt : (_context) => originalPrompt;
    const workerHandoff = input.workerHandoff || input.worker_handoff || {};
    const originalGate = input.finalDispatchPayloadGate || input.final_dispatch_payload_gate
        || (0, final_dispatch_payload_gate_1.buildFinalWorkerDispatchPayloadGate)({ ...input, renderedPrompt: originalPrompt, workerHandoff });
    const forceReactiveCompact = input.forceReactiveCompact === true || input.force_reactive_compact === true;
    if (originalGate.status !== "recompact_required" && !forceReactiveCompact)
        return { recovered: false, reason: "final_dispatch_payload_already_ready", prompt: originalPrompt, gate: originalGate, receipt: null };
    const promptWithoutRecentContext = String(renderPrompt(""));
    const fixedTokens = (0, context_budget_1.estimateTextTokens)(promptWithoutRecentContext);
    const threshold = Number(originalGate.auto_compact_threshold || 0);
    const safetyMargin = Math.max(256, Math.min(2_000, Math.floor(Number(originalGate.auto_compact_buffer_tokens || 0) * 0.1)));
    const availableContextTokens = Math.max(0, threshold - fixedTokens - safetyMargin);
    const contextTokenBudget = forceReactiveCompact
        ? Math.min(availableContextTokens, Math.max(256, Math.floor((0, context_budget_1.estimateTextTokens)(originalContext) * 0.5)))
        : availableContextTokens;
    const projection = projectFinalDispatchRecentContext(originalContext, contextTokenBudget);
    const recoveredPrompt = String(renderPrompt(projection.text));
    const recoveredGate = (0, final_dispatch_payload_gate_1.buildFinalWorkerDispatchPayloadGate)({ ...input, renderedPrompt: recoveredPrompt, workerHandoff });
    const recoveredGateVerification = (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(recoveredGate, {
        renderedPrompt: recoveredPrompt,
        groupId: input.groupId || input.group_id,
        groupSessionId: input.groupSessionId || input.group_session_id,
        taskId: input.taskId || input.task_id,
        taskAgentSessionId: input.taskAgentSessionId || input.task_agent_session_id,
        workerContextPacketId: workerHandoff.worker_context_packet?.packet_id || input.workerContextPacketId || input.worker_context_packet_id,
    });
    const status = recoveredGateVerification.valid && recoveredGate.status === "ready" && recoveredGate.provider_call_allowed === true ? "recovered" : "blocked";
    const core = {
        schema: exports.FINAL_DISPATCH_REACTIVE_COMPACT_SCHEMA,
        version: 1,
        receipt_id: `fdrc_${hash([originalGate.gate_id || "", recoveredGate.gate_id || "", projection.projection_checksum], 24)}`,
        attempt: 1,
        trigger: forceReactiveCompact ? "provider_prompt_too_long" : "preflight_threshold",
        group_id: String(input.groupId || input.group_id || originalGate.group_id || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || originalGate.group_session_id || ""),
        task_id: String(input.taskId || input.task_id || originalGate.task_id || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || originalGate.task_agent_session_id || ""),
        worker_context_packet_id: String(workerHandoff.worker_context_packet?.packet_id || originalGate.worker_context_packet_id || ""),
        original_gate_id: String(originalGate.gate_id || ""),
        recovered_gate_id: String(recoveredGate.gate_id || ""),
        original_prompt_checksum: String(originalGate.prompt_checksum || ""),
        recovered_prompt_checksum: String(recoveredGate.prompt_checksum || ""),
        original_prompt_tokens: Number(originalGate.estimated_total_input_tokens || 0),
        recovered_prompt_tokens: Number(recoveredGate.estimated_total_input_tokens || 0),
        auto_compact_threshold: threshold,
        safety_margin_tokens: safetyMargin,
        fixed_prompt_tokens: fixedTokens,
        recent_context_budget_tokens: contextTokenBudget,
        recent_context_original_tokens: projection.original_tokens,
        recent_context_projected_tokens: projection.projected_tokens,
        recent_context_original_chars: projection.original_chars,
        recent_context_projected_chars: projection.projected_chars,
        omitted_context_lines: projection.omitted_lines,
        recent_context_source_checksum: projection.source_checksum,
        recent_context_projection_checksum: projection.projection_checksum,
        status,
        action: status === "recovered" ? "retry_provider_once_with_recovered_prompt" : "fail_closed_fixed_prompt_exceeds_capacity",
        provider_call_allowed: status === "recovered",
        recovered_gate_valid: recoveredGateVerification.valid,
        recovered_gate_issues: recoveredGateVerification.issues,
        created_at: new Date().toISOString(),
    };
    const receipt = { ...core, receipt_checksum: receiptChecksum(core) };
    return { recovered: status === "recovered", reason: receipt.action, prompt: recoveredPrompt, gate: recoveredGate, receipt, projection };
}
//# sourceMappingURL=final-dispatch-reactive-compact.js.map