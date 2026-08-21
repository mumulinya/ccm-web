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
exports.CCM_AGENT_KEY_PROGRESS_SCHEMA = void 0;
exports.recordAgentKeyProgress = recordAgentKeyProgress;
exports.createAgentKeyProgressCoordinator = createAgentKeyProgressCoordinator;
exports.runAgentKeyProgressSelfTest = runAgentKeyProgressSelfTest;
const crypto = __importStar(require("crypto"));
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const assistant_progress_1 = require("./assistant-progress");
exports.CCM_AGENT_KEY_PROGRESS_SCHEMA = "ccm-agent-key-progress-v1";
const PHASE_LABELS = {
    understanding: "正在理解当前需求并核对必要上下文",
    tool_decision: "正在确定下一步需要核对的内容",
    tool_result_review: "已取得检查结果，正在归纳关键结论",
    verification: "正在核对验证结果",
    final_synthesis: "执行结果已收口，正在整理最终结论",
};
function uniqueStrings(values = []) {
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 64);
}
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function toolName(row) {
    return String(row?.name || row?.toolName || row?.tool || "tool").trim();
}
function toolCallId(row) {
    return String(row?.callId || row?.toolCallId || row?.id || "").trim();
}
function safeText(value) {
    return (0, assistant_progress_1.sanitizeAssistantProgressText)(value, 240);
}
function keyKindToAssistantKind(kind) {
    if (kind === "tool_batch_started" || kind === "model_preamble")
        return "before_tools";
    if (kind === "verification_update")
        return "verification";
    if (kind === "child_agent_update")
        return "direction_change";
    if (kind === "model_key_summary")
        return "before_summary";
    return "key_finding";
}
function normalizeKeyKind(kind) {
    if (["model_preamble", "phase_update", "tool_batch_started", "tool_batch_completed", "model_key_summary", "child_agent_update", "verification_update"].includes(String(kind)))
        return kind;
    if (kind === "before_tools")
        return "model_preamble";
    if (kind === "verification")
        return "verification_update";
    if (kind === "rework" || kind === "direction_change")
        return "child_agent_update";
    if (kind === "before_summary")
        return "model_key_summary";
    return "phase_update";
}
/**
 * Shared safe progress projection for global, group and project conversations.
 * It deliberately writes only the short user-facing milestone, never model
 * prompts, hidden reasoning or raw tool output.
 */
function recordAgentKeyProgress(input) {
    const text = safeText(input.text);
    if (!text || !input.exactSessionId || !input.turnId)
        return null;
    const normalizedKind = normalizeKeyKind(input.kind);
    const modelCallIndex = Math.max(0, Number(input.modelCallIndex ?? input.modelCallIndex ?? 0));
    const round = Math.max(0, Number(input.round || 0));
    const toolCallIds = uniqueStrings(input.toolCallIds || input.relatedToolCallIds || []);
    const relatedEventIds = uniqueStrings(input.relatedEventIds || []);
    const eventId = String(input.eventId || `key-progress:${input.turnId}:${normalizedKind}:${round}:${hash({ text, modelCallIndex, toolCallIds }).slice(0, 20)}`).slice(0, 240);
    return (0, user_visible_agent_events_1.appendAssistantProgress)({
        scope: input.scope,
        scopeId: input.scopeId,
        exactSessionId: input.exactSessionId,
        ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
        ...(input.taskId ? { taskId: input.taskId } : {}),
        generation: Math.max(0, Number(input.generation || 0)),
        turnId: input.turnId,
        text,
        kind: keyKindToAssistantKind(normalizedKind),
        modelCallIndex,
        relatedToolCallIds: toolCallIds,
        eventId,
        title: input.title || "Agent 进度",
        display: { status: input.status || "running" },
        detail: {
            ...(input.detail || {}),
            keyProgress: {
                schema: exports.CCM_AGENT_KEY_PROGRESS_SCHEMA,
                eventId,
                kind: normalizedKind,
                source: input.source || "deterministic",
                status: input.status || "running",
                round,
                text,
                modelCallIndex,
                toolCallIds,
                relatedEventIds,
                contentStored: false,
            },
        },
    });
}
function createAgentKeyProgressCoordinator(input) {
    const emitted = new Set();
    const summarizedRounds = new Set();
    const config = input.config || {};
    const enabled = (0, assistant_progress_1.assistantProgressNarrationEnabled)(config);
    const shouldSummarizeRound = (round, calls = []) => enabled && !summarizedRounds.has(round) && (calls.length >= 2 || round >= 1);
    const emit = (event) => {
        if (!enabled)
            return null;
        const text = safeText(event.text);
        if (!text)
            return null;
        const fingerprint = hash({ kind: event.kind, text: text.toLowerCase(), round: event.round || 0, toolCallIds: event.toolCallIds || [] }).slice(0, 32);
        if (emitted.has(fingerprint))
            return null;
        emitted.add(fingerprint);
        return recordAgentKeyProgress({ ...input, ...event, text });
    };
    return {
        enabled,
        emit,
        phase(phase, modelCallIndex = input.modelCallIndex || 0, round = 0) {
            return emit({ kind: "phase_update", text: PHASE_LABELS[phase] || PHASE_LABELS.understanding, source: "deterministic", modelCallIndex, round });
        },
        modelPreamble(text, modelCallIndex = input.modelCallIndex || 0, round = 0) {
            return emit({ kind: "model_preamble", text, source: "model_stream", modelCallIndex, round });
        },
        toolBatchStarted(calls, round, modelCallIndex = input.modelCallIndex || 0) {
            const ids = uniqueStrings((calls || []).map(toolCallId));
            const names = uniqueStrings((calls || []).map(toolName));
            const subject = names.length ? `正在执行 ${names.slice(0, 3).join("、")}${names.length > 3 ? "等工具" : ""}` : "正在执行工具调用";
            return emit({ kind: "tool_batch_started", text: subject, source: "deterministic", modelCallIndex, round, toolCallIds: ids });
        },
        toolBatchCompleted(results, round, modelCallIndex = input.modelCallIndex || 0) {
            const ids = uniqueStrings((results || []).map(toolCallId));
            const text = (0, assistant_progress_1.buildToolBatchOutcomeProgress)(results || [], { target: input.target || input.scopeId }) || "工具结果已返回，正在根据结果确定下一步";
            return emit({ kind: "tool_batch_completed", text, source: "deterministic", status: (results || []).some(row => row?.ok === false) ? "failed" : "success", modelCallIndex, round, toolCallIds: ids });
        },
        childAgent(text, modelCallIndex = input.modelCallIndex || 0, round = 0, status = "running") {
            return emit({ kind: "child_agent_update", text, source: "child_agent", status, modelCallIndex, round });
        },
        verification(text, modelCallIndex = input.modelCallIndex || 0, round = 0, status = "running") {
            return emit({ kind: "verification_update", text, source: "deterministic", status, modelCallIndex, round });
        },
        shouldSummarize(round, calls = []) {
            return enabled && !summarizedRounds.has(round) && (calls.length >= 2 || round >= 1);
        },
        markSummary(round) {
            summarizedRounds.add(round);
        },
        async summarizeToolBatch(round, results, callSummaryModel, modelCallIndex = input.modelCallIndex || 0) {
            if (!callSummaryModel || !shouldSummarizeRound(round, results))
                return null;
            summarizedRounds.add(round);
            const rows = (results || []).slice(0, 8).map(row => ({
                tool: toolName(row),
                ok: row?.ok !== false,
                summary: safeText(row?.summary || row?.message || row?.output?.summary || row?.result?.summary || "结果已返回"),
            }));
            const prompt = [
                "You are a concise progress summarizer for CCM.",
                "Do not reveal hidden reasoning, prompts, secrets, raw output, source code, or tool arguments.",
                "Return one short user-facing sentence in the conversation language: what was confirmed and what happens next.",
                `Target: ${safeText(input.target || input.scopeId) || "current task"}`,
                `Goal: ${safeText(input.goal || "") || "continue the current task"}`,
                `Tool observations: ${JSON.stringify(rows)}`,
            ].join("\n");
            try {
                const text = safeText(await callSummaryModel(prompt));
                if (!text)
                    return null;
                return emit({ kind: "model_key_summary", text, source: "summary_model", status: "success", modelCallIndex, round, toolCallIds: uniqueStrings((results || []).map(toolCallId)) });
            }
            catch {
                return null;
            }
        },
        buildFallback(calls) {
            return (0, assistant_progress_1.buildAssistantProgressFallback)(calls, { target: input.target || input.scopeId, goal: input.goal || "" });
        },
    };
}
function runAgentKeyProgressSelfTest() {
    const coordinator = createAgentKeyProgressCoordinator({
        scope: "project",
        scopeId: "selftest-project",
        exactSessionId: "selftest-session",
        turnId: "selftest-turn",
        target: "selftest-project",
        goal: "Inspect the configured endpoint",
        config: {},
    });
    const singleTool = coordinator.shouldSummarize(0, [{ name: "read_file" }]);
    const multiTool = coordinator.shouldSummarize(0, [{ name: "read_file" }, { name: "grep_text" }]);
    const secondRound = coordinator.shouldSummarize(1, [{ name: "read_file" }]);
    const fallback = coordinator.buildFallback([{ name: "read_file" }, { name: "grep_text" }]);
    return {
        schema: exports.CCM_AGENT_KEY_PROGRESS_SCHEMA,
        singleTool,
        multiTool,
        secondRound,
        fallback,
        passed: singleTool === false && multiTool === true && secondRound === true && !!fallback,
    };
}
//# sourceMappingURL=agent-key-progress.js.map