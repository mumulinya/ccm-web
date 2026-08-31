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
const main_agent_harness_1 = require("../../agents/main-agent-harness");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const model_activity_1 = require("../../system/model-activity");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const assistant_progress_1 = require("../../system/assistant-progress");
const agent_key_progress_1 = require("../../system/agent-key-progress");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const group_session_execution_ledger_1 = require("./group-session-execution-ledger");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const main_agent_context_envelope_1 = require("../../system/main-agent-context-envelope");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_orchestrator_llm_client_2 = require("./group-orchestrator-llm-client");
const canonical_context_accounting_1 = require("../../system/canonical-context-accounting");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_model_context_1 = require("./group-session-model-context");
const provider_stream_visible_projection_1 = require("../../system/provider-stream-visible-projection");
const context_usage_events_1 = require("../../system/context-usage-events");
// compactGroupNativeTranscript remains the compatibility name for the
// request-time context pressure recovery path; the active implementation is
// owned by the shared pre-request compaction engine.
async function runGroupMainNativeQueryLoop(input) {
    const { config, group, groupSessionId, loopBudget, visibleTurnId, visibleAnchorMessageId, } = input;
    const attempt = Math.max(1, Number(input.recoveryAttempt || 1));
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
    const modelPreambleBuffer = (0, agent_key_progress_1.createAgentModelPreambleBuffer)();
    let initialReadFileCount = 0;
    let initialReadTokens = 0;
    const anthropic = (0, group_orchestrator_llm_client_2.shouldUseAnthropic)(config);
    const provider = anthropic ? "anthropic" : (0, group_orchestrator_llm_client_2.shouldUseGemini)(config) ? "gemini" : "openai";
    const generation = Number(toolContext?.scopeIdentity?.generation || 0);
    const boundaryGeneration = Math.max(0, Number((0, group_memory_storage_1.loadGroupMemory)(String(group.id || ""), groupSessionId)?.unifiedSessionCompaction?.boundaryGeneration || 0));
    let baseProviderMessages = input.buildMessages(planningInput);
    let latestCanonicalPayload = null;
    let streamedAssistantTokens = 0;
    const keyProgress = (0, agent_key_progress_1.createAgentKeyProgressCoordinator)({
        scope: "group",
        scopeId: String(group.id || ""),
        exactSessionId: groupSessionId,
        turnId: visibleTurnId,
        anchorMessageId: String(visibleAnchorMessageId || "").trim() || undefined,
        generation: Number(toolContext?.scopeIdentity?.generation || 0),
        attempt,
        target: group.name || group.id,
        goal: String(planningInput.message || ""),
        title: "群聊主 Agent",
        config,
    });
    const providerStreamProjection = (0, provider_stream_visible_projection_1.createProviderStreamVisibleProjection)({
        scope: "group",
        scopeId: String(group.id || ""),
        exactSessionId: groupSessionId,
        turnId: visibleTurnId,
        generation,
        attempt,
        anchorMessageId: String(visibleAnchorMessageId || "").trim() || undefined,
        title: "群聊主 Agent",
        keyProgress,
        markVisible: input.markVisibleFeedback,
        onProjectedEvent: input.onAgentExecutionEvent,
    });
    const flushModelPreamble = (round, modelCallIndex, toolCalls = []) => {
        const modelPreamble = modelPreambleBuffer.take();
        if (!modelPreamble)
            return null;
        const event = keyProgress.modelPreamble(modelPreamble, modelCallIndex, round, toolCalls.map(call => call.id));
        if (event)
            input.onAgentExecutionEvent?.(event);
        input.markVisibleFeedback();
        return event;
    };
    const result = await (0, main_agent_harness_1.runMainAgentHarness)({
        harness: (0, main_agent_harness_1.buildMainAgentHarness)({
            scope: "group",
            scopeId: String(group.id || ""),
            exactSessionId: groupSessionId,
            generation,
            attempt,
        }),
        config,
        messages: baseProviderMessages,
        tools: [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(toolContext)],
        scope: "group",
        scopeId: String(group.id || ""),
        exactSessionId: groupSessionId,
        signal: input.signal,
        nativeToolReference: true,
        persistContext: { scope: "group", scopeId: String(group.id || ""), sessionId: groupSessionId },
        loopBudget,
        planModeEnabled: (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group.id), groupSessionId),
        promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_planning" },
        getTools: () => [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(toolContext)],
        onConversationContextPressure: async ({ messages, forcePromptTooLong }) => {
            const fallbackPrefixCount = String(messages[0]?.content || "").includes("Fallback protocol: return one JSON object") ? 1 : 0;
            const liveSuffix = messages.slice(Math.min(messages.length, fallbackPrefixCount + baseProviderMessages.length));
            const memoryContextApi = await Promise.resolve().then(() => __importStar(require("./group-memory-context")));
            const compacted = await memoryContextApi.runGroupMemoryAutoCompactionNow(String(group.id || ""), {
                sessionId: groupSessionId,
                force: true,
                reason: forcePromptTooLong ? "group_main_provider_prompt_too_long" : "group_main_provider_payload_preflight",
                config: {
                    ...config,
                    memoryCompactionUseModel: true,
                    memoryCompactionMode: "model-required",
                },
            });
            if (compacted?.success !== true || compacted?.compacted !== true)
                return null;
            const projection = (0, group_session_model_context_1.buildExactGroupSessionModelContextPacket)(String(group.id || ""), { groupSessionId });
            planningInput = { ...planningInput, context: projection.rendered };
            delete planningInput.__preRequestProviderMessages;
            baseProviderMessages = input.buildMessages(planningInput);
            return [...messages.slice(0, fallbackPrefixCount), ...baseProviderMessages, ...liveSuffix];
        },
        isReadOnly: (call) => {
            if (["tool_search", "invoke_skill", "invoke_mcp", "ccm_dispatch"].includes(call.name))
                return false;
            if (["ccm_ask_user", "ccm_present_plan"].includes(call.name) || input.isBuiltinReadOnly(call.name))
                return true;
            const catalog = [...(toolContext?.catalog?.mcp || []), ...(toolContext?.catalog?.loadedMcp || [])];
            const spec = catalog.find((tool) => call.name === tool?.canonicalName || call.name === tool?.name);
            return spec ? (0, main_agent_tool_runtime_1.isMainAgentReadOnlyMcpTool)(spec) : false;
        },
        onDelta: (delta, context) => {
            if (!String(delta || "").trim())
                return;
            visibleReplyDeltaEmitted = true;
            if (!firstProviderDeltaAt) {
                firstProviderDeltaAt = Date.now();
                input.markProviderToken?.(firstProviderDeltaAt);
            }
            input.markVisibleFeedback(firstProviderDeltaAt);
            visibleReplyDeltaSequence += 1;
            streamedAssistantTokens += Math.max(0, Math.floor(String(delta || "").length / 4));
            (0, context_usage_events_1.publishContextUsageDelta)({
                scope: "group", scopeId: String(group.id || ""), exactSessionId: groupSessionId,
                requestId: visibleTurnId, currentTokens: Number(latestCanonicalPayload?.totalTokens || 0) + streamedAssistantTokens,
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0) + streamedAssistantTokens,
                tokenSource: "local_incremental_estimate", tokenBreakdown: { conversation: streamedAssistantTokens }, reason: "assistant_delta",
            });
            modelPreambleBuffer.append(delta);
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `group-delta:${visibleTurnId}:${visibleReplyDeltaSequence}`,
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                eventType: "assistant_text_delta",
                attempt,
                display: { title: "群聊主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
                detail: { stream: { sequence: visibleReplyDeltaSequence, modelCallIndex: context.modelCallIndex, round: context.round, final: false } },
            });
            input.onDelta?.(delta, context);
        },
        onProviderStreamActivity: activity => providerStreamProjection.handle(activity),
        onCanonicalPayload: ({ messages, tools }) => {
            const contextComponents = input.buildContextComponents(planningInput);
            const loadedContextItems = (0, session_compaction_core_1.normalizeLoadedContextItems)(contextComponents?.loadedContextItems);
            const rawMembers = Array.isArray(group?.projects) ? group.projects
                : Array.isArray(group?.project_ids) ? group.project_ids
                    : Array.isArray(group?.members) ? group.members : [];
            const memberProjects = rawMembers.map((member) => typeof member === "string"
                ? { projectId: member, name: member }
                : { projectId: member?.projectId || member?.project_id || member?.id || member?.name, name: member?.name || member?.projectName || member?.project_id || member?.projectId });
            const capabilityDirectory = (0, main_agent_context_envelope_1.buildMainAgentCapabilityDirectoryV1)({
                scope: "group",
                scopeId: String(group.id || ""),
                exactSessionId: groupSessionId,
                generation,
                toolContext,
                loadedContextItems,
                memberProjects,
                sharedFiles: {
                    available: planningInput?.sharedFilesContext ? 1 : 0,
                    loaded: 0,
                    readTool: "read_group_shared_files",
                },
                scopeInstructions: {
                    available: Array.isArray(toolContext?.scopeInstructionCatalog) ? toolContext.scopeInstructionCatalog.length : 0,
                    names: (toolContext?.scopeInstructionCatalog || []).map((entry) => entry?.fileName || entry?.documentId),
                    loaded: toolContext?.loadedContext ? 1 : 0,
                },
            });
            const contextEnvelope = (0, main_agent_context_envelope_1.buildMainAgentContextEnvelopeV1)({
                scope: "group",
                scopeId: String(group.id || ""),
                exactSessionId: groupSessionId,
                generation,
                messages,
                tools,
                capabilityDirectory,
                loadedContextChecksums: (0, main_agent_context_envelope_1.mainAgentLoadedContextChecksums)(loadedContextItems),
            });
            latestCanonicalPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
                scope: "group",
                sessionId: `${group.id}:${groupSessionId}`,
                exactSessionId: groupSessionId,
                provider,
                model: String(config.model || ""),
                protocol: String(config.format || config.protocol || ""),
                modelConfig: config,
                tools,
                mainAgentContextEnvelope: contextEnvelope,
                mainAgentCapabilityDirectory: capabilityDirectory,
                system: messages.filter((message) => message.role === "system"),
                contextComponents,
                recentMessages: messages.filter((message) => message.role !== "system"),
            });
            const receipt = (0, canonical_context_accounting_1.recordCanonicalContextPreflight)({
                scope: "group",
                scopeId: String(group.id || ""),
                exactSessionId: groupSessionId,
                payload: latestCanonicalPayload,
                provider,
                model: String(config.model || ""),
                protocol: String(config.format || config.protocol || ""),
                endpoint: String(config.apiUrl || config.endpoint || ""),
                generation,
                boundaryGeneration,
            });
            (0, context_usage_events_1.publishContextUsageFromPayload)({
                scope: "group", scopeId: String(group.id || ""), exactSessionId: groupSessionId,
                requestId: visibleTurnId, payload: latestCanonicalPayload, reason: "request_preflight",
                contextWindow: Number(receipt?.contextWindow || 0),
                autoCompactThreshold: Number(receipt?.autoCompactThreshold || 0),
            });
            return { payloadChecksum: latestCanonicalPayload.payloadChecksum, totalTokens: latestCanonicalPayload.totalTokens };
        },
        onUsage: (usage) => {
            tokenUsage = usage;
            if (!groupSessionId.startsWith("gcs_"))
                return;
            try {
                const providerPayload = latestCanonicalPayload;
                if (!providerPayload?.payloadChecksum)
                    return;
                const receipt = (0, canonical_context_accounting_1.completeCanonicalContextAccounting)({
                    scope: "group",
                    scopeId: String(group.id || ""),
                    exactSessionId: groupSessionId,
                    payloadChecksum: providerPayload.payloadChecksum,
                    usage,
                    provider,
                    model: String(config.model || ""),
                    protocol: String(config.format || config.protocol || ""),
                    endpoint: String(config.apiUrl || config.endpoint || ""),
                    generation,
                    boundaryGeneration,
                });
                const observed = Number(receipt?.providerObservedInputTokens || 0);
                (0, context_usage_events_1.publishContextUsageDelta)({
                    scope: "group", scopeId: String(group.id || ""), exactSessionId: groupSessionId,
                    requestId: visibleTurnId,
                    currentTokens: observed || Number(receipt?.estimatedInputTokens || providerPayload.totalTokens || 0),
                    predictedNextRequestTokens: Number(receipt?.predictedNextRequestTokens || providerPayload.predictedNextRequestTokens || 0),
                    tokenSource: observed > 0 ? "provider_usage" : "canonical_payload_estimate",
                    tokenBreakdown: receipt?.primaryTokenBreakdown || providerPayload.tokenBreakdown,
                    reason: "provider_usage",
                });
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({
                    groupId: group.id,
                    groupSessionId,
                    source: "group_main_native_query",
                    provider,
                    model: config.model,
                    protocol: config.format || config.protocol || "",
                    endpoint: config.apiUrl || config.endpoint || "",
                    usage,
                    estimatedContextTokens: providerPayload.totalTokens,
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
                max_retries: Math.max(0, Number(notice.maxAttempts || 1) - 1),
                retry_delay_ms: Math.max(0, Number(notice.delayMs || 0)),
                remaining_budget_ms: Math.max(0, (notice.profile === "interactive_first_turn" ? 180_000 : notice.profile === "agent_orchestration" ? 180_000 : 360_000) - notice.elapsedMs),
                profile: notice.profile,
                reason: String(notice.error?.message || notice.error || "模型暂时不可用").slice(0, 240),
            };
            retryNotices.push(publicNotice);
            input.onRetry?.(publicNotice);
        },
        onPlanningPhase: ({ phase, evidenceCount = 0, issueCount = 0 }) => {
            const summary = phase === "exploring" ? "正在核对相关项目资料"
                : phase === "drafting" ? `已核对 ${evidenceCount} 项源码证据，正在整理计划`
                    : phase === "reviewing" ? "正在复核计划范围和验收标准"
                        : phase === "repairing" ? `计划有 ${issueCount} 处需要修正，正在自动校正`
                            : phase === "awaiting_user" ? "计划已通过复核，等待确认"
                                : "计划复核未通过，需要补充依据";
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `group-planning:${visibleTurnId}:${phase}`,
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                eventType: "planning_progress",
                display: { title: "群聊主 Agent", summary, status: ["invalidated"].includes(phase) ? "failed" : phase === "awaiting_user" ? "completed" : "running" },
                detail: { planning: { phase, evidenceCount, issueCount, contentStored: false } },
            });
            input.markVisibleFeedback();
        },
        onModelCallStart: ({ round, modelCallIndex }) => {
            const activityPhase = toolResults.length ? "tool_result_review" : round > 0 ? "tool_decision" : "understanding";
            const activity = (0, model_activity_1.createModelActivityController)({
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                turnId: visibleTurnId, modelCallIndex, phase: activityPhase,
                generation,
                anchorMessageId: visibleAnchorMessageId || undefined,
                onActivity: (activityValue, event) => {
                    if (["thinking", "started", "waiting", "retrying"].includes(String(activityValue?.state || "")))
                        input.markVisibleFeedback();
                    input.onModelActivity?.(activityValue, event);
                },
            });
            keyProgress.phase(activityPhase, modelCallIndex, round);
            return activity;
        },
        onTurn: ({ round, turn, modelCallIndex }) => {
            if (!Array.isArray(turn.toolCalls) || !turn.toolCalls.length)
                return;
            flushModelPreamble(round, modelCallIndex, turn.toolCalls);
        },
        onBeforeToolExecution: ({ round, modelCallIndex, calls }) => {
            flushModelPreamble(round, modelCallIndex, calls);
            (0, context_usage_events_1.publishContextUsageDelta)({
                scope: "group", scopeId: String(group.id || ""), exactSessionId: groupSessionId, requestId: visibleTurnId,
                currentTokens: Number(latestCanonicalPayload?.totalTokens || 0),
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0),
                tokenSource: "local_incremental_estimate", reason: "tool_started",
            });
        },
        executeTools: async (calls, ctx) => {
            const round = ctx.round;
            const requests = calls.map(item => ({ id: item.id, name: item.name, arguments: item.arguments || {} }));
            const preparedToolCallIds = calls.map(item => item.id || `gmtool_${crypto.randomBytes(8).toString("hex")}`);
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                keyProgress.toolBatchStarted(requests, round, round + 1);
                input.markVisibleFeedback();
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
                toolContext: {
                    ...toolContext,
                    turnId: visibleTurnId,
                    anchorMessageId: visibleAnchorMessageId,
                    executionAttempt: Math.max(1, Number(input.recoveryAttempt || 1)),
                },
                toolCallIds: preparedToolCallIds,
                toolBatchSize: loopBudget.toolBatchSize,
                readOnlyParallelism: loopBudget.readOnlyParallelism,
                signal: input.signal,
            });
            toolWallDurationMs += Math.max(0, Date.now() - toolBatchStartedAt);
            toolResults.push(...roundResults);
            (0, context_usage_events_1.publishContextUsageDelta)({
                scope: "group", scopeId: String(group.id || ""), exactSessionId: groupSessionId, requestId: visibleTurnId,
                currentTokens: Number(latestCanonicalPayload?.totalTokens || 0) + roundResults.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens || 0)), 0),
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0) + roundResults.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens || 0)), 0),
                tokenSource: "local_incremental_estimate", reason: "tool_completed",
            });
            if (round === 0) {
                const initialReads = roundResults.filter((row) => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
                initialReadFileCount += initialReads.reduce((count, row) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
                initialReadTokens += initialReads.reduce((count, row) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
            }
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                keyProgress.toolBatchCompleted(roundResults, round, round + 1);
                input.markVisibleFeedback();
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
        callTurn: async (callConfig, options) => {
            const startedAt = Date.now();
            try {
                return await (0, group_orchestrator_llm_client_1.callNativeAgentTurn)(callConfig, options);
            }
            catch (error) {
                const elapsed = Math.max(0, Date.now() - startedAt);
                error.modelDurationMs = Math.max(Number(error?.modelDurationMs || 0), modelDurationMs + elapsed);
                error.toolWallDurationMs = Math.max(Number(error?.toolWallDurationMs || 0), toolWallDurationMs);
                error.modelCallCount = Math.max(Number(error?.modelCallCount || 0), 1);
                error.providerRetryCount = Math.max(Number(error?.providerRetryCount || 0), modelRetryCount, Number(error?.retryCount || 0));
                throw error;
            }
            finally {
                modelDurationMs += Math.max(0, Date.now() - startedAt);
            }
        },
    });
    providerStreamProjection.flush();
    const finalModelOutput = modelPreambleBuffer.take();
    if (finalModelOutput && result.toolCallCount > 0) {
        keyProgress.modelOutput(finalModelOutput, result.modelCallCount, result.toolRoundCount);
    }
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
        generation,
    };
}
//# sourceMappingURL=group-native-query-adapter.js.map