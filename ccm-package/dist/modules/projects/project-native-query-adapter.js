"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProjectMainNativeQueryLoop = runProjectMainNativeQueryLoop;
const native_query_loop_1 = require("../../agents/native-query-loop");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const model_activity_1 = require("../../system/model-activity");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const assistant_progress_1 = require("../../system/assistant-progress");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
async function runProjectMainNativeQueryLoop(input) {
    const { config, project, projectSessionId, visibleTurnId, loopBudget } = input;
    const toolResults = [];
    let modelDurationMs = 0;
    let toolWallDurationMs = 0;
    let modelRetryCount = 0;
    let visibleReplyDeltaEmitted = false;
    let visibleDeltaSequence = 0;
    let firstProviderDeltaAt = 0;
    let initialReadFileCount = 0;
    let initialReadTokens = 0;
    const result = await (0, native_query_loop_1.runNativeQueryLoop)({
        config,
        messages: input.buildMessages(),
        tools: [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(input.getToolContext())],
        scope: "project",
        scopeId: project,
        exactSessionId: projectSessionId,
        signal: input.signal,
        nativeToolReference: true,
        persistContext: { scope: "project", sessionId: projectSessionId },
        loopBudget,
        planModeEnabled: input.planModeEnabled ?? (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("project", project, projectSessionId),
        getTools: () => [...(0, native_query_loop_1.nativeControlToolDefinitions)(), ...(0, native_query_loop_1.catalogToNativeTools)(input.getToolContext())],
        isReadOnly: (call) => {
            if (call.name === "ccm_ask_user" || call.name === "ccm_present_plan")
                return true;
            return input.isReadOnly({ name: call.name, arguments: call.arguments });
        },
        onDelta: (delta) => {
            if (!String(delta || "").trim())
                return;
            visibleReplyDeltaEmitted = true;
            if (!firstProviderDeltaAt)
                firstProviderDeltaAt = Date.now();
            input.markVisibleFeedback(firstProviderDeltaAt);
            visibleDeltaSequence += 1;
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `project-delta:${visibleTurnId}:${visibleDeltaSequence}`,
                scope: "project", scopeId: project, exactSessionId: projectSessionId,
                eventType: "assistant_text_delta",
                display: { title: "项目主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
                detail: { stream: { sequence: visibleDeltaSequence, final: false } },
            });
            input.onDelta?.(delta);
        },
        onUsage: input.captureUsage,
        onRetry: () => { modelRetryCount += 1; },
        onTurn: ({ round, modelCallIndex }) => {
            const activityPhase = toolResults.length ? "tool_result_review" : round ? "tool_decision" : "understanding";
            const activity = (0, model_activity_1.createModelActivityController)({
                scope: "project",
                scopeId: project,
                exactSessionId: projectSessionId,
                turnId: visibleTurnId,
                modelCallIndex,
                phase: activityPhase,
                generation: Number(input.getToolContext().scopeIdentity?.generation || 0),
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
            const runnableRequests = calls.map(item => ({ name: item.name, arguments: item.arguments || {} }));
            const preparedToolCallIds = calls.map(item => item.id);
            const toolContext = input.getToolContext();
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config) && round === 0) {
                const progressText = (0, assistant_progress_1.buildAssistantProgressFallback)(runnableRequests, { target: project, goal: input.userMessage });
                if (progressText) {
                    (0, user_visible_agent_events_1.appendAssistantProgress)({
                        scope: "project", scopeId: project, exactSessionId: projectSessionId,
                        generation: Number(toolContext.scopeIdentity?.generation || 0),
                        turnId: visibleTurnId,
                        text: progressText,
                        kind: "before_tools",
                        modelCallIndex: round + 1,
                        relatedToolCallIds: preparedToolCallIds,
                        title: "项目主 Agent",
                    });
                    input.markVisibleFeedback();
                }
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
                while (index < runnableRequests.length && input.isReadOnly(runnableRequests[index]) && readBatch.length < loopBudget.readOnlyParallelism) {
                    readBatch.push(runnableRequests[index]);
                    index += 1;
                }
                const parallelGroupId = readBatch.length > 1 ? `project-parallel:${visibleTurnId}:${round}:${index - readBatch.length}` : "";
                const startedAt = Date.now();
                roundResults.push(...await Promise.all(readBatch.map(request => input.executeSelectedRequest(request, parallelGroupId, preparedToolCallIds[runnableRequests.indexOf(request)]))));
                toolWallDurationMs += Math.max(0, Date.now() - startedAt);
            }
            toolResults.push(...roundResults);
            if (round === 0) {
                const initialReads = roundResults.filter(row => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
                initialReadFileCount += initialReads.reduce((count, row) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
                initialReadTokens += initialReads.reduce((count, row) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
            }
            if ((0, assistant_progress_1.assistantProgressNarrationEnabled)(config)) {
                const outcomeProgress = (0, assistant_progress_1.buildToolBatchOutcomeProgress)(roundResults, { target: project });
                if (outcomeProgress) {
                    (0, user_visible_agent_events_1.appendAssistantProgress)({
                        scope: "project", scopeId: project, exactSessionId: projectSessionId,
                        generation: Number(toolContext.scopeIdentity?.generation || 0),
                        turnId: visibleTurnId,
                        text: outcomeProgress,
                        kind: "key_finding",
                        modelCallIndex: round + 1,
                        relatedToolCallIds: preparedToolCallIds,
                        title: "项目主 Agent",
                    });
                    input.markVisibleFeedback();
                }
            }
            return roundResults.map((row, index) => ({
                callId: preparedToolCallIds[index] || calls[index]?.id || `pmtool_${index}`,
                name: String(row.name || calls[index]?.name || "unknown"),
                ok: row.ok !== false,
                output: row.output ?? row.rawOutput ?? row,
                error: row.error,
                reason: row.reason,
            }));
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