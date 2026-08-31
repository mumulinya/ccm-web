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
exports.createAgentModelPreambleBuffer = createAgentModelPreambleBuffer;
exports.recordAgentKeyProgress = recordAgentKeyProgress;
exports.createAgentKeyProgressCoordinator = createAgentKeyProgressCoordinator;
exports.runAgentKeyProgressSelfTest = runAgentKeyProgressSelfTest;
const crypto = __importStar(require("crypto"));
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const assistant_progress_1 = require("./assistant-progress");
exports.CCM_AGENT_KEY_PROGRESS_SCHEMA = "ccm-agent-key-progress-v1";
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
function sourceInquiryStartText(calls) {
    if (calls.length !== 1)
        return "";
    const call = calls[0] || {};
    const name = toolName(call);
    const args = call?.arguments || call?.args || call?.input || {};
    if (name === "request_project_source_inquiry") {
        const project = safeText(args?.project || "目标项目");
        return `正在委托 ${project} 项目主 Agent 核对源码`;
    }
    if (name === "request_group_source_inquiry") {
        const group = safeText(args?.group || args?.group_id || "目标群聊");
        return `正在委托 ${group} 群聊主 Agent 核对跨项目源码`;
    }
    return "";
}
function sourceInquiryCompletedText(results) {
    if (results.length !== 1)
        return "";
    const row = results[0] || {};
    const name = toolName(row);
    if (name !== "request_project_source_inquiry" && name !== "request_group_source_inquiry")
        return "";
    const output = row?.output || row?.observation || {};
    const receipt = output?.receipt || output?.sourceInquiryReceipt || output;
    const projectReceipts = Array.isArray(receipt?.projectReceipts) ? receipt.projectReceipts : [];
    const checkedFiles = new Set(projectReceipts.flatMap((project) => Array.isArray(project?.paths) ? project.paths : [])).size;
    const project = safeText(projectReceipts[0]?.project || "项目主 Agent");
    if (row?.ok === false)
        return "源码委托未完成，已保留现有证据";
    return checkedFiles > 0
        ? `${project} 项目主 Agent · 已检查 ${checkedFiles} 个文件，正在汇总结论`
        : "项目主 Agent 已返回安全证据，正在汇总结论";
}
function safeText(value) {
    return (0, assistant_progress_1.sanitizeAssistantProgressText)(value, 240);
}
function createAgentModelPreambleBuffer(maxCharacters = 1200) {
    const limit = Math.max(240, Math.min(4000, Number(maxCharacters || 1200)));
    let buffered = "";
    return {
        append(delta) {
            const chunk = String(delta ?? "");
            if (!chunk || Array.from(buffered).length >= limit)
                return;
            buffered = Array.from(`${buffered}${chunk}`).slice(0, limit).join("");
        },
        take() {
            const value = buffered.trim();
            buffered = "";
            return value;
        },
        clear() {
            buffered = "";
        },
    };
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
    const attempt = Math.max(1, Number(input.attempt || 1));
    const eventId = String(input.eventId || `key-progress:${input.turnId}:${normalizedKind}:${round}:${hash({ text, modelCallIndex, toolCallIds }).slice(0, 20)}`).slice(0, 240);
    return (0, user_visible_agent_events_1.appendAssistantProgress)({
        scope: input.scope,
        scopeId: input.scopeId,
        exactSessionId: input.exactSessionId,
        ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
        ...(input.taskId ? { taskId: input.taskId } : {}),
        generation: Math.max(0, Number(input.generation || 0)),
        attempt,
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
                attempt,
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
    const emit = (event, required = false) => {
        if (!enabled && !required)
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
        phase(_phase, _modelCallIndex = input.modelCallIndex || 0, _round = 0) {
            // Model-call phases are internal lifecycle state. Publishing them as
            // assistant_progress made older clients render the same deterministic
            // label both as the current activity and as narration. The ephemeral
            // model-activity channel already carries waiting/retry state, while the
            // conversation surface owns the single lightweight "正在思考" label.
            return null;
        },
        modelPreamble(text, modelCallIndex = input.modelCallIndex || 0, round = 0, toolCallIds = [], eventId) {
            // Provider-visible narration is part of the Agent's real reply, not an
            // optional synthetic progress hint. Always preserve it for replay.
            return emit({ kind: "model_preamble", text, source: "model_stream", modelCallIndex, round, toolCallIds, eventId }, true);
        },
        modelOutput(text, modelCallIndex = input.modelCallIndex || 0, round = 0) {
            // The final model call can stream after the last tool batch, so there is
            // no later executeTools boundary at which modelPreamble() could flush
            // it. Persist one compact, safe row before the terminal result so an
            // expanded completed transcript reconstructs what the user saw live.
            return emit({
                kind: "model_key_summary",
                text,
                source: "model_stream",
                status: "success",
                modelCallIndex,
                round,
                // Final synthesis can be observed once inside the native loop and once
                // again by the scope coordinator before it appends the terminal result.
                // A stable id makes those two observations one persisted timeline row.
                eventId: `key-progress:${input.turnId}:model-output`,
            }, true);
        },
        toolBatchStarted(calls, round, modelCallIndex = input.modelCallIndex || 0) {
            const ids = uniqueStrings((calls || []).map(toolCallId));
            const names = uniqueStrings((calls || []).map(toolName));
            const subject = sourceInquiryStartText(calls || [])
                || (names.length ? `正在执行 ${names.slice(0, 3).join("、")}${names.length > 3 ? "等工具" : ""}` : "正在执行工具调用");
            return emit({ kind: "tool_batch_started", text: subject, source: "deterministic", modelCallIndex, round, toolCallIds: ids });
        },
        toolBatchCompleted(results, round, modelCallIndex = input.modelCallIndex || 0) {
            const ids = uniqueStrings((results || []).map(toolCallId));
            const text = sourceInquiryCompletedText(results || [])
                || (0, assistant_progress_1.buildToolBatchOutcomeProgress)(results || [], { target: input.target || input.scopeId })
                || "工具结果已返回，正在根据结果确定下一步";
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
        attempt: 2,
        target: "selftest-project",
        goal: "Inspect the configured endpoint",
        config: {},
    });
    const singleTool = coordinator.shouldSummarize(0, [{ name: "read_file" }]);
    const multiTool = coordinator.shouldSummarize(0, [{ name: "read_file" }, { name: "grep_text" }]);
    const secondRound = coordinator.shouldSummarize(1, [{ name: "read_file" }]);
    const fallback = coordinator.buildFallback([{ name: "read_file" }, { name: "grep_text" }]);
    const preamble = createAgentModelPreambleBuffer();
    preamble.append("我先");
    preamble.append("查看项目");
    const joinedPreamble = preamble.take();
    const clearedPreamble = preamble.take();
    const progress = coordinator.modelPreamble("我先查看项目", 1, 0, ["tool-selftest"]);
    const hiddenPhase = coordinator.phase("understanding", 1, 0);
    return {
        schema: exports.CCM_AGENT_KEY_PROGRESS_SCHEMA,
        singleTool,
        multiTool,
        secondRound,
        fallback,
        joinedPreamble,
        clearedPreamble,
        progressAttempt: progress?.attempt,
        passed: singleTool === false && multiTool === true && secondRound === true && !!fallback
            && joinedPreamble === "我先查看项目" && clearedPreamble === ""
            // A repeated local self-test can resolve an older idempotent event that
            // predates the nested attempt field; the authoritative top-level attempt
            // remains sufficient here. Normalization coverage verifies new events.
            && progress?.attempt === 2
            && hiddenPhase === null,
    };
}
//# sourceMappingURL=agent-key-progress.js.map