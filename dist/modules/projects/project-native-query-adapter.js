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
exports.runProjectMainNativeQueryLoop = runProjectMainNativeQueryLoop;
const native_query_loop_1 = require("../../agents/native-query-loop");
const main_agent_harness_1 = require("../../agents/main-agent-harness");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const model_activity_1 = require("../../system/model-activity");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const assistant_progress_1 = require("../../system/assistant-progress");
const agent_key_progress_1 = require("../../system/agent-key-progress");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const main_agent_context_envelope_1 = require("../../system/main-agent-context-envelope");
const canonical_context_accounting_1 = require("../../system/canonical-context-accounting");
const context_budget_1 = require("../../system/context-budget");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const readonly_tool_concurrency_1 = require("../../system/readonly-tool-concurrency");
const provider_stream_visible_projection_1 = require("../../system/provider-stream-visible-projection");
const context_usage_events_1 = require("../../system/context-usage-events");
async function runProjectMainNativeQueryLoop(input) {
    const { config, project, projectSessionId, visibleTurnId, loopBudget } = input;
    const attempt = Math.max(1, Number(input.attempt || 1));
    const toolResults = [];
    let modelDurationMs = 0;
    let toolWallDurationMs = 0;
    let modelRetryCount = 0;
    let visibleReplyDeltaEmitted = false;
    let visibleDeltaSequence = 0;
    let firstProviderDeltaAt = 0;
    const modelPreambleBuffer = (0, agent_key_progress_1.createAgentModelPreambleBuffer)();
    let initialReadFileCount = 0;
    let initialReadTokens = 0;
    const keyProgress = (0, agent_key_progress_1.createAgentKeyProgressCoordinator)({
        scope: "project",
        scopeId: project,
        exactSessionId: projectSessionId,
        turnId: visibleTurnId,
        anchorMessageId: String(input.visibleAnchorMessageId || "").trim() || undefined,
        generation: Number(input.getToolContext?.()?.scopeIdentity?.generation || 0),
        attempt,
        target: project,
        goal: input.userMessage,
        title: "项目主 Agent",
        config,
    });
    const providerStreamProjection = (0, provider_stream_visible_projection_1.createProviderStreamVisibleProjection)({
        scope: "project",
        scopeId: project,
        exactSessionId: projectSessionId,
        turnId: visibleTurnId,
        generation: Number(input.getToolContext?.()?.scopeIdentity?.generation || 0),
        attempt,
        anchorMessageId: String(input.visibleAnchorMessageId || "").trim() || undefined,
        title: "项目主 Agent",
        keyProgress,
        markVisible: input.markVisibleFeedback,
        onProjectedEvent: input.onAgentExecutionEvent,
    });
    let latestCanonicalPayload = null;
    let streamedAssistantTokens = 0;
    const provider = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai";
    const generation = Number(input.getToolContext?.()?.scopeIdentity?.generation || 0);
    const boundaryGeneration = Math.max(0, Number(input.boundaryGeneration || 0));
    let baseProviderMessages = input.buildMessages();
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
            scope: "project",
            scopeId: project,
            exactSessionId: projectSessionId,
            generation,
            attempt,
        }),
        config,
        messages: baseProviderMessages,
        tools: [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(input.getToolContext())],
        scope: "project",
        scopeId: project,
        exactSessionId: projectSessionId,
        signal: input.signal,
        nativeToolReference: true,
        persistContext: { scope: "project", scopeId: project, sessionId: projectSessionId },
        loopBudget,
        planModeEnabled: input.planModeEnabled ?? (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("project", project, projectSessionId),
        getTools: () => [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(input.getToolContext())],
        onConversationContextPressure: async ({ messages, forcePromptTooLong }) => {
            const fallbackPrefixCount = String(messages[0]?.content || "").includes("Fallback protocol: return one JSON object") ? 1 : 0;
            const liveSuffix = messages.slice(Math.min(messages.length, fallbackPrefixCount + baseProviderMessages.length));
            const { compactProjectSessionWithModel } = await Promise.resolve().then(() => __importStar(require("./project-session-compaction")));
            const compacted = await compactProjectSessionWithModel(project, projectSessionId, {
                force: true,
                promptTooLong: forcePromptTooLong,
                reason: forcePromptTooLong ? "provider_prompt_too_long" : "provider_payload_preflight",
                currentRequest: input.userMessage,
                provider: (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai-compatible",
                model: String(config.model || ""),
            });
            if (compacted?.compacted !== true)
                return null;
            baseProviderMessages = input.buildMessages();
            return [...messages.slice(0, fallbackPrefixCount), ...baseProviderMessages, ...liveSuffix];
        },
        isReadOnly: (call) => {
            if (call.name === "ccm_ask_user" || call.name === "ccm_present_plan")
                return true;
            return input.isReadOnly({ name: call.name, arguments: call.arguments });
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
            visibleDeltaSequence += 1;
            streamedAssistantTokens += (0, context_budget_1.estimateTextTokens)(String(delta || ""));
            (0, context_usage_events_1.publishContextUsageDelta)({
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                requestId: visibleTurnId, currentTokens: Number(latestCanonicalPayload?.totalTokens || 0) + streamedAssistantTokens,
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0) + streamedAssistantTokens,
                tokenSource: "local_incremental_estimate", tokenBreakdown: { conversation: streamedAssistantTokens }, reason: "assistant_delta",
            });
            modelPreambleBuffer.append(delta);
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `project-delta:${visibleTurnId}:${visibleDeltaSequence}`,
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                ...(input.visibleAnchorMessageId ? { anchorMessageId: input.visibleAnchorMessageId } : {}),
                eventType: "assistant_text_delta",
                attempt,
                display: { title: "项目主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
                detail: { stream: { sequence: visibleDeltaSequence, modelCallIndex: context.modelCallIndex, round: context.round, final: false } },
            });
            input.onDelta?.(delta, context);
        },
        onProviderStreamActivity: activity => providerStreamProjection.handle(activity),
        onCanonicalPayload: ({ messages, tools }) => {
            const toolContext = input.getToolContext();
            const selectedRoleSkills = Array.isArray(input.roleSkills?.selected) ? input.roleSkills.selected : [];
            const loadedContextItems = (0, main_agent_tool_runtime_1.buildMainAgentLoadedContextItems)(toolContext, toolResults, selectedRoleSkills.map((skill) => ({
                name: String(skill?.name || ""),
                loadLevel: "body",
                checksum: String(skill?.contentHash || ""),
                tokens: (0, context_budget_1.estimateTextTokens)(String(skill?.body || "")),
            })));
            const capabilityDirectory = (0, main_agent_context_envelope_1.buildMainAgentCapabilityDirectoryV1)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                generation,
                toolContext,
                loadedContextItems,
                memberProjects: [{ projectId: project, name: project }],
                scopeInstructions: {
                    available: Array.isArray(toolContext?.scopeInstructionCatalog) ? toolContext.scopeInstructionCatalog.length : 0,
                    names: (toolContext?.scopeInstructionCatalog || []).map((entry) => entry?.fileName || entry?.documentId),
                    loaded: toolContext?.loadedContext ? 1 : 0,
                },
            });
            const contextEnvelope = (0, main_agent_context_envelope_1.buildMainAgentContextEnvelopeV1)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                generation,
                messages,
                tools,
                capabilityDirectory,
                loadedContextChecksums: (0, main_agent_context_envelope_1.mainAgentLoadedContextChecksums)(loadedContextItems),
            });
            latestCanonicalPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
                scope: "project",
                sessionId: `${project}:${projectSessionId}`,
                exactSessionId: projectSessionId,
                provider,
                model: String(config.model || ""),
                protocol: String(config.format || config.protocol || ""),
                modelConfig: config,
                system: messages.filter((message) => String(message?.role || "") === "system"),
                recentMessages: messages.filter((message) => String(message?.role || "") !== "system"),
                tools,
                mainAgentContextEnvelope: contextEnvelope,
                mainAgentCapabilityDirectory: capabilityDirectory,
                contextComponents: {
                    skills: [input.roleSkills?.prompt || "", toolContext?.skillPrompt || ""].filter(Boolean).join("\n\n") || toolContext?.catalog?.skills || [],
                    mcpTools: toolContext?.catalog?.loadedMcp || toolContext?.catalog?.mcp || [],
                    memoryAndLoadedContext: toolContext?.loadedContext || null,
                    loadedContextItems,
                },
            });
            const receipt = (0, canonical_context_accounting_1.recordCanonicalContextPreflight)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                payload: latestCanonicalPayload,
                provider,
                model: String(config.model || ""),
                protocol: String(config.format || config.protocol || ""),
                endpoint: String(config.apiUrl || config.endpoint || ""),
                generation,
                boundaryGeneration,
            });
            (0, context_usage_events_1.publishContextUsageFromPayload)({
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                requestId: visibleTurnId, payload: latestCanonicalPayload, reason: "request_preflight",
                contextWindow: Number(receipt?.contextWindow || 0),
                autoCompactThreshold: Number(receipt?.autoCompactThreshold || 0),
            });
            return { payloadChecksum: latestCanonicalPayload.payloadChecksum, totalTokens: latestCanonicalPayload.totalTokens };
        },
        onUsage: (usage) => {
            input.captureUsage?.(usage);
            if (!latestCanonicalPayload?.payloadChecksum)
                return;
            const receipt = (0, canonical_context_accounting_1.completeCanonicalContextAccounting)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                payloadChecksum: latestCanonicalPayload.payloadChecksum,
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
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                requestId: visibleTurnId,
                currentTokens: observed || Number(receipt?.estimatedInputTokens || latestCanonicalPayload.totalTokens || 0),
                predictedNextRequestTokens: Number(receipt?.predictedNextRequestTokens || latestCanonicalPayload.predictedNextRequestTokens || 0),
                tokenSource: observed > 0 ? "provider_usage" : "canonical_payload_estimate",
                tokenBreakdown: receipt?.primaryTokenBreakdown || latestCanonicalPayload.tokenBreakdown,
                reason: "provider_usage",
            });
        },
        onRetry: () => { modelRetryCount += 1; },
        onPlanningPhase: ({ phase, evidenceCount = 0, issueCount = 0 }) => {
            const summary = phase === "exploring" ? "正在核对当前项目资料"
                : phase === "drafting" ? `已核对 ${evidenceCount} 项源码证据，正在整理计划`
                    : phase === "reviewing" ? "正在复核计划范围和验收标准"
                        : phase === "repairing" ? `计划有 ${issueCount} 处需要修正，正在自动校正`
                            : phase === "awaiting_user" ? "计划已通过复核，等待确认"
                                : "计划复核未通过，需要补充依据";
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `project-planning:${visibleTurnId}:${phase}`,
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                ...(input.visibleAnchorMessageId ? { anchorMessageId: input.visibleAnchorMessageId } : {}),
                eventType: "planning_progress",
                display: { title: "项目主 Agent", summary, status: phase === "invalidated" ? "failed" : phase === "awaiting_user" ? "completed" : "running" },
                detail: { planning: { phase, evidenceCount, issueCount, contentStored: false } },
            });
            input.markVisibleFeedback();
        },
        onModelCallStart: ({ round, modelCallIndex }) => {
            const activityPhase = toolResults.length ? "tool_result_review" : round ? "tool_decision" : "understanding";
            const activity = (0, model_activity_1.createModelActivityController)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                turnId: visibleTurnId,
                anchorMessageId: String(input.visibleAnchorMessageId || "").trim() || undefined,
                modelCallIndex,
                phase: activityPhase,
                generation: Number(input.getToolContext().scopeIdentity?.generation || 0),
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
                scope: "project", scopeId: project, exactSessionId: projectSessionId, requestId: visibleTurnId,
                currentTokens: Number(latestCanonicalPayload?.totalTokens || 0),
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0),
                tokenSource: "local_incremental_estimate", reason: "tool_started",
            });
        },
        executeTools: async (calls, ctx) => {
            const round = ctx.round;
            const runnableRequests = calls.map(item => ({ id: item.id, name: item.name, arguments: item.arguments || {} }));
            const preparedToolCallIds = calls.map(item => item.id);
            const toolContext = input.getToolContext();
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                keyProgress.toolBatchStarted(runnableRequests, round, round + 1);
                input.markVisibleFeedback();
            }
            const roundResults = [];
            for (let index = 0; index < runnableRequests.length;) {
                if (!input.isReadOnly(runnableRequests[index])) {
                    const startedAt = Date.now();
                    roundResults.push(await input.executeSelectedRequest(runnableRequests[index], "", preparedToolCallIds[index]));
                    toolWallDurationMs += Math.max(0, Date.now() - startedAt);
                    index += 1;
                    continue;
                }
                const readBatch = [];
                while (index < runnableRequests.length && input.isReadOnly(runnableRequests[index])) {
                    readBatch.push(runnableRequests[index]);
                    index += 1;
                }
                const parallelGroupId = readBatch.length > 1 ? `project-parallel:${visibleTurnId}:${round}:${index - readBatch.length}` : "";
                const startedAt = Date.now();
                roundResults.push(...await (0, readonly_tool_concurrency_1.runReadonlyToolsAdaptive)({
                    items: readBatch,
                    configuredLimit: Math.min(loopBudget.readOnlyParallelism, loopBudget.toolBatchSize),
                    worker: request => input.executeSelectedRequest(request, parallelGroupId, preparedToolCallIds[runnableRequests.indexOf(request)]),
                }));
                toolWallDurationMs += Math.max(0, Date.now() - startedAt);
            }
            toolResults.push(...roundResults);
            (0, context_usage_events_1.publishContextUsageDelta)({
                scope: "project", scopeId: project, exactSessionId: projectSessionId, requestId: visibleTurnId,
                currentTokens: Number(latestCanonicalPayload?.totalTokens || 0) + roundResults.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens || 0)), 0),
                predictedNextRequestTokens: Number(latestCanonicalPayload?.predictedNextRequestTokens || latestCanonicalPayload?.totalTokens || 0) + roundResults.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens || 0)), 0),
                tokenSource: "local_incremental_estimate", reason: "tool_completed",
            });
            if (round === 0) {
                const initialReads = roundResults.filter(row => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
                initialReadFileCount += initialReads.reduce((count, row) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
                initialReadTokens += initialReads.reduce((count, row) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
            }
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                keyProgress.toolBatchCompleted(roundResults, round, round + 1);
                input.markVisibleFeedback();
            }
            return roundResults.map((row, index) => ({
                callId: preparedToolCallIds[index] || calls[index]?.id || `pmtool_${index}`,
                name: String(row.name || calls[index]?.name || "unknown"),
                ok: row.ok !== false,
                output: row.rawOutput ?? row.output ?? row,
                error: row.error,
                reason: row.reason,
            }));
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
        toolResults,
        modelCallCount: result.modelCallCount,
        toolRoundCount: result.toolRoundCount,
        toolCallCount: result.toolCallCount,
        noProgressCount: result.noProgressCount,
        continuationSegments: result.continuationSegments,
        loopStopReason: result.stopReason,
        modelDurationMs,
        toolWallDurationMs,
        modelRetryCount,
        visibleReplyDeltaEmitted,
        initialReadFileCount,
        initialReadTokens,
    };
}
//# sourceMappingURL=project-native-query-adapter.js.map