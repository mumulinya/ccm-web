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
exports.runGroupMainNativeQueryLoop = runGroupMainNativeQueryLoop;
const crypto = __importStar(require("crypto"));
const native_query_loop_1 = require("../../agents/native-query-loop");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const model_activity_1 = require("../../system/model-activity");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const assistant_progress_1 = require("../../system/assistant-progress");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const group_main_tool_result_compact_1 = require("./group-main-tool-result-compact");
const group_session_execution_ledger_1 = require("./group-session-execution-ledger");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const context_budget_1 = require("../../system/context-budget");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_orchestrator_llm_client_2 = require("./group-orchestrator-llm-client");
async function runGroupMainNativeQueryLoop(input) {
    const { config, group, groupSessionId, loopBudget, visibleTurnId, visibleAnchorMessageId, } = input;
    let planningInput = input.planningInput;
    let toolContext = input.buildToolContext(planningInput);
    const toolResults = [];
    const retryNotices = [];
    let tokenUsage = null;
    let modelDurationMs = 0;
    let toolWallDurationMs = 0;
    let modelRetryCount = 0;
    let visibleReplyDeltaEmitted = false;
    let visibleReplyDeltaSequence = 0;
    let firstProviderDeltaAt = 0;
    let initialReadFileCount = 0;
    let initialReadTokens = 0;
    const anthropic = (0, group_orchestrator_llm_client_2.shouldUseAnthropic)(config);
    const result = await (0, native_query_loop_1.runNativeQueryLoop)({
        config,
        messages: input.buildMessages(planningInput),
        tools: [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(toolContext)],
        scope: "group",
        scopeId: String(group.id || ""),
        exactSessionId: groupSessionId,
        signal: input.signal,
        nativeToolReference: true,
        loopBudget,
        planModeEnabled: (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group.id), groupSessionId),
        promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_planning" },
        getTools: () => [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(toolContext)],
        isReadOnly: (call) => {
            if (["tool_search", "invoke_skill", "ccm_dispatch"].includes(call.name))
                return false;
            if (["ccm_ask_user", "ccm_present_plan"].includes(call.name) || input.isBuiltinReadOnly(call.name))
                return true;
            const catalog = [...(toolContext?.catalog?.mcp || []), ...(toolContext?.catalog?.loadedMcp || [])];
            const spec = catalog.find((tool) => call.name === tool?.canonicalName || call.name === tool?.name);
            return spec ? (0, main_agent_tool_runtime_1.isMainAgentReadOnlyMcpTool)(spec) : false;
        },
        onDelta: (delta) => {
            if (!String(delta || "").trim())
                return;
            visibleReplyDeltaEmitted = true;
            if (!firstProviderDeltaAt)
                firstProviderDeltaAt = Date.now();
            input.markVisibleFeedback(firstProviderDeltaAt);
            visibleReplyDeltaSequence += 1;
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `group-delta:${visibleTurnId}:${visibleReplyDeltaSequence}`,
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                eventType: "assistant_text_delta",
                display: { title: "群聊主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
                detail: { stream: { sequence: visibleReplyDeltaSequence, final: false } },
            });
            input.onDelta?.(delta);
        },
        onUsage: (usage) => {
            tokenUsage = usage;
            if (!groupSessionId.startsWith("gcs_"))
                return;
            try {
                const messages = input.buildMessages(planningInput);
                const providerPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
                    scope: "group",
                    sessionId: `${group.id}:${groupSessionId}`,
                    system: messages.filter((message) => message.role === "system"),
                    contextComponents: input.buildContextComponents(planningInput),
                    recentMessages: messages.filter((message) => message.role !== "system"),
                });
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({
                    groupId: group.id,
                    groupSessionId,
                    source: "group_main_native_query",
                    provider: anthropic ? "anthropic" : (0, group_orchestrator_llm_client_2.shouldUseGemini)(config) ? "gemini" : "openai",
                    model: config.model,
                    usage,
                    estimatedContextTokens: messages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(String(message?.content || "")), 0),
                    estimatedPayloadTokens: providerPayload.totalTokens,
                    estimatedFixedTokens: (0, session_compaction_core_1.modelVisibleFixedTokens)(providerPayload),
                    payloadChecksum: providerPayload.payloadChecksum,
                    fixedContextChecksum: providerPayload.fixedContextChecksum,
                    modelVisiblePayload: providerPayload,
                });
            }
            catch { }
        },
        onRetry: (notice) => {
            modelRetryCount += 1;
            const publicNotice = {
                attempt: notice.attempt,
                max_attempts: notice.maxAttempts,
                remaining_budget_ms: Math.max(0, (notice.profile === "interactive_first_turn" ? 180_000 : notice.profile === "agent_orchestration" ? 180_000 : 360_000) - notice.elapsedMs),
                profile: notice.profile,
                reason: String(notice.error?.message || notice.error || "模型暂时不可用").slice(0, 240),
            };
            retryNotices.push(publicNotice);
            input.onRetry?.(publicNotice);
        },
        onTurn: ({ round, modelCallIndex }) => {
            const activityPhase = toolResults.length ? "tool_result_review" : round > 0 ? "tool_decision" : "understanding";
            const activity = (0, model_activity_1.createModelActivityController)({
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                turnId: visibleTurnId, modelCallIndex, phase: activityPhase,
                anchorMessageId: visibleAnchorMessageId || undefined,
                onActivity: activityValue => {
                    if (["waiting", "retrying"].includes(String(activityValue?.state || "")))
                        input.markVisibleFeedback();
                    input.onModelActivity?.(activityValue);
                },
            });
            activity.complete();
        },
        executeTools: async (calls, ctx) => {
            const round = ctx.round;
            const requests = calls.map(item => ({ name: item.name, arguments: item.arguments || {} }));
            const preparedToolCallIds = calls.map(item => item.id || `gmtool_${crypto.randomBytes(8).toString("hex")}`);
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                const progressText = round === 0 ? (0, assistant_progress_1.buildAssistantProgressFallback)(requests, { target: group.name || group.id, goal: String(planningInput.message || "") }) : "";
                if (progressText) {
                    (0, user_visible_agent_events_1.appendAssistantProgress)({
                        scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                        ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                        generation: Number(toolContext.scopeIdentity?.generation || 0),
                        turnId: visibleTurnId,
                        text: progressText,
                        kind: "before_tools",
                        modelCallIndex: round + 1,
                        relatedToolCallIds: preparedToolCallIds,
                        title: "群聊主 Agent",
                    });
                    input.markVisibleFeedback();
                }
            }
            const toolBatchStartedAt = Date.now();
            for (const call of calls) {
                (0, group_session_execution_ledger_1.appendGroupSessionExecutionEvent)(String(group.id), groupSessionId, {
                    type: "tool_use",
                    toolName: call.name,
                    toolCallId: call.id,
                    runId: visibleTurnId,
                    anchorMessageId: visibleAnchorMessageId,
                    arguments: call.arguments || {},
                });
            }
            const roundResults = await input.executeRequests({
                requests,
                toolContext,
                toolCallIds: preparedToolCallIds,
                toolBatchSize: loopBudget.toolBatchSize,
                readOnlyParallelism: loopBudget.readOnlyParallelism,
                signal: input.signal,
            });
            toolWallDurationMs += Math.max(0, Date.now() - toolBatchStartedAt);
            toolResults.push(...roundResults);
            if (round === 0) {
                const initialReads = roundResults.filter((row) => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
                initialReadFileCount += initialReads.reduce((count, row) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
                initialReadTokens += initialReads.reduce((count, row) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
            }
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                const outcomeProgress = (0, assistant_progress_1.buildToolBatchOutcomeProgress)(roundResults, { target: group.name || group.id });
                if (outcomeProgress) {
                    (0, user_visible_agent_events_1.appendAssistantProgress)({
                        scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                        ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                        generation: Number(toolContext.scopeIdentity?.generation || 0),
                        turnId: visibleTurnId,
                        text: outcomeProgress,
                        kind: "key_finding",
                        modelCallIndex: round + 1,
                        relatedToolCallIds: preparedToolCallIds,
                        title: "群聊主 Agent",
                    });
                    input.markVisibleFeedback();
                }
            }
            const knowledgeResult = [...roundResults].reverse().find((row) => row.name === "query_knowledge" && row.ok && row.rawOutput);
            planningInput = {
                ...planningInput,
                mainAgentToolResults: toolResults,
                loadedMainAgentTools: toolContext.loadedToolNames || [],
                ...(knowledgeResult ? { ragContext: knowledgeResult.rawOutput.context || "" } : {}),
            };
            toolContext = input.buildToolContext(planningInput);
            return roundResults.map((row, index) => {
                const mapped = {
                    callId: preparedToolCallIds[index] || calls[index]?.id || `gmtool_${index}`,
                    name: String(row.name || calls[index]?.name || "unknown"),
                    ok: row.ok !== false,
                    output: row.rawOutput ?? row.output ?? row,
                    error: row.error,
                    reason: row.reason,
                };
                (0, group_session_execution_ledger_1.appendGroupSessionExecutionEvent)(String(group.id), groupSessionId, {
                    type: "tool_result",
                    toolName: mapped.name,
                    toolCallId: mapped.callId,
                    runId: visibleTurnId,
                    anchorMessageId: visibleAnchorMessageId,
                    status: mapped.ok ? "ok" : "error",
                    observation: mapped.output,
                    error: mapped.error,
                });
                return mapped;
            });
        },
        compactTranscript: (messages) => {
            const threshold = (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(config);
            const budget = Math.max(4_000, Math.min(40_000, Number(threshold) || 40_000));
            const compacted = (0, group_main_tool_result_compact_1.compactGroupNativeTranscript)(messages, toolResults, budget);
            if (compacted.changed) {
                toolResults.length = 0;
                toolResults.push(...compacted.rows);
            }
            return compacted.messages;
        },
        callTurn: async (callConfig, options) => {
            const startedAt = Date.now();
            try {
                return await (0, group_orchestrator_llm_client_1.callNativeAgentTurn)(callConfig, options);
            }
            finally {
                modelDurationMs += Math.max(0, Date.now() - startedAt);
            }
        },
    });
    return {
        parsed: result.parsed,
        planningInput,
        toolResults,
        modelCallCount: result.modelCallCount,
        toolRoundCount: result.toolRoundCount,
        toolCallCount: result.toolCallCount,
        noProgressCount: result.noProgressCount,
        continuationSegments: result.continuationSegments,
        loopStopReason: result.stopReason,
        tokenUsage: result.usage || tokenUsage,
        modelDurationMs,
        toolWallDurationMs,
        modelRetryCount,
        retryNotices,
        visibleReplyDeltaEmitted,
        initialReadFileCount,
        initialReadTokens,
    };
}
//# sourceMappingURL=group-native-query-adapter.js.map