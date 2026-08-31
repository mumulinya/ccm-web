"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalNativeTools = globalNativeTools;
exports.nativeTurnToGlobalDecision = nativeTurnToGlobalDecision;
exports.runGlobalNativeQueryCall = runGlobalNativeQueryCall;
exports.runGlobalNativeQuerySelfTest = runGlobalNativeQuerySelfTest;
const native_query_loop_1 = require("../../agents/native-query-loop");
const main_agent_harness_1 = require("../../agents/main-agent-harness");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const runtime_1 = require("../../agents/global/runtime");
const global_agent_run_store_1 = require("../../agents/global/global-agent-run-store");
const provider_native_tools_1 = require("../../system/provider-native-tools");
const agent_key_progress_1 = require("../../system/agent-key-progress");
const readonly_tool_concurrency_1 = require("../../system/readonly-tool-concurrency");
const model_activity_1 = require("../../system/model-activity");
const provider_stream_visible_projection_1 = require("../../system/provider-stream-visible-projection");
function globalNativeTools(run) {
    void run;
    const specs = (0, runtime_1.buildGlobalAgentToolDefinitions)(global_agent_run_store_1.GLOBAL_AGENT_TOOL_SPECS);
    const fromSpecs = specs.map(spec => ({
        name: spec.name,
        description: spec.description,
        inputSchema: spec.inputSchema || { type: "object", properties: {} },
        deferred: false,
    }));
    return [
        ...(0, native_query_loop_1.nativeControlToolDefinitions)().filter(tool => tool.name !== "ccm_dispatch"),
        ...fromSpecs,
    ];
}
function nativeTurnToGlobalDecision(parsed, pendingWrite) {
    if (pendingWrite) {
        return {
            state: (0, global_agent_run_store_1.classifyGlobalAgentToolRisk)(pendingWrite.name, pendingWrite.arguments) === "high" ? "execute" : "execute",
            message: String(parsed?.reply || parsed?.friendlyResponse || ""),
            tool: { name: pendingWrite.name, arguments: pendingWrite.arguments || {} },
            workflowDecision: parsed?.workflowDecision || { reason: "全局工具执行", actionRequired: true, requiresCodeChanges: false },
        };
    }
    const responseType = String(parsed?.responseType || "reply");
    if (responseType === "dispatch") {
        return {
            state: "answer",
            message: String(parsed?.friendlyResponse || parsed?.reply || ""),
            tool: null,
            targets: parsed?.targets || [],
            workflowDecision: parsed?.workflowDecision || { reason: "全局派发", actionRequired: true, requiresCodeChanges: true },
        };
    }
    if (responseType === "clarify") {
        return {
            state: "needs_confirmation",
            message: String(parsed?.reply || parsed?.questionForUser || ""),
            tool: null,
            workflowDecision: parsed?.workflowDecision || { reason: "需要用户澄清", actionRequired: false, requiresCodeChanges: false },
        };
    }
    if (responseType === "plan") {
        return {
            state: "plan",
            message: String(parsed?.reply || ""),
            tool: null,
            plan: parsed?.plan,
            workflowDecision: parsed?.workflowDecision || { reason: "展示计划", actionRequired: false, requiresCodeChanges: false },
        };
    }
    return {
        state: "answer",
        message: String(parsed?.reply || ""),
        tool: null,
        workflowDecision: parsed?.workflowDecision || { reason: "直接回复", actionRequired: false, requiresCodeChanges: false },
    };
}
async function runGlobalNativeQueryCall(input) {
    const { config, run } = input;
    const attempt = Math.max(1, Number(run.attempt || Number(run.resume_count || 0) + 1));
    const modelPreambleBuffer = (0, agent_key_progress_1.createAgentModelPreambleBuffer)();
    const keyProgress = (0, agent_key_progress_1.createAgentKeyProgressCoordinator)({
        scope: "global",
        scopeId: "global",
        exactSessionId: String(run.session_id || ""),
        turnId: String(run.id || "global-run"),
        generation: Math.max(0, Number(run.generation || run.resume_count || 0)),
        attempt,
        anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
        taskId: String(run.mission_id || "") || undefined,
        target: "CCM",
        goal: String(run.original_user_message || run.user_message || ""),
        title: "全局 Agent",
        config,
    });
    const providerStreamProjection = (0, provider_stream_visible_projection_1.createProviderStreamVisibleProjection)({
        scope: "global",
        scopeId: "global",
        exactSessionId: String(run.session_id || ""),
        turnId: String(run.id || "global-run"),
        generation: Math.max(0, Number(run.generation || run.resume_count || 0)),
        attempt,
        anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
        taskId: String(run.mission_id || "") || undefined,
        title: "全局 Agent",
        keyProgress,
        markVisible: input.markVisibleFeedback,
        onProjectedEvent: event => input.onEvent?.({ type: "agent_execution", event }),
    });
    const flushModelPreamble = (round, modelCallIndex, toolCalls = []) => {
        const modelPreamble = modelPreambleBuffer.take();
        if (!modelPreamble)
            return null;
        const event = keyProgress.modelPreamble(modelPreamble, modelCallIndex, round, toolCalls.map(call => call.id));
        if (event)
            input.onEvent?.({ type: "agent_execution", event });
        input.markVisibleFeedback?.();
        return event;
    };
    const confirmedPlan = String(run?.plan_mode?.confirmation_status || "") === "confirmed"
        || (Array.isArray(run?.reasoning_loop?.assertions) && run.reasoning_loop.assertions.some((item) => item?.id === "confirmed_plan_binding" && item?.status === "passed"));
    let pendingWrite = null;
    const isReadOnlyCall = (call) => {
        if (call.name === "ccm_ask_user" || call.name === "ccm_present_plan")
            return true;
        if (call.name === "ccm_dispatch")
            return false;
        try {
            return (0, global_agent_run_store_1.classifyGlobalAgentToolRisk)(call.name, call.arguments) === "read";
        }
        catch {
            return false;
        }
    };
    const resolvePlanningEvidence = async (plan) => {
        const knownProjects = new Set((Array.isArray(run?.context?.projects) ? run.context.projects : [])
            .map((item) => String(item?.name || item?.id || item || "").trim()).filter(Boolean));
        const requestedTargets = Array.isArray(run?.requested_target_refs) ? run.requested_target_refs : [];
        const projectCandidates = [
            ...(Array.isArray(plan?.files) ? plan.files.map((item) => item?.project) : []),
            ...(Array.isArray(plan?.steps) ? plan.steps.flatMap((item) => Array.isArray(item?.projects) ? item.projects : [item?.project]) : []),
            ...(Array.isArray(plan?.businessRequirement?.targetProjects) ? plan.businessRequirement.targetProjects : []),
            ...requestedTargets.filter((item) => String(item?.scope || "") === "project").map((item) => item?.scopeId),
        ].map(value => String(value || "").replace(/^project:/, "").trim()).filter(Boolean);
        const projects = Array.from(new Set(projectCandidates.filter(project => !knownProjects.size || knownProjects.has(project))));
        if (!projects.length)
            return [];
        const rows = [];
        for (const project of projects) {
            const callId = `planning_evidence_${project}_${Date.now()}`;
            try {
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_started", tool: "request_project_source_inquiry", toolCallId: callId, arguments: { project, read_depth: "focused" } });
                const observation = await input.executeTool("request_project_source_inquiry", {
                    project,
                    question: String(run?.original_user_message || run?.user_message || plan?.goal || "核对正式计划所需的当前源码证据"),
                    read_depth: "focused",
                }, run, input.signal);
                run.tool_calls = Math.max(0, Number(run.tool_calls || 0)) + 1;
                run.steps = Array.isArray(run.steps) ? run.steps : [];
                run.steps.push({
                    index: run.steps.length + 1,
                    at: new Date().toISOString(),
                    state: "investigate",
                    message: "",
                    tool: { name: "request_project_source_inquiry", arguments: { project, read_depth: "focused" }, risk: "read" },
                    toolCallId: callId,
                    observation,
                });
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_completed", tool: "request_project_source_inquiry", toolCallId: callId, observation });
                rows.push({ callId, name: "request_project_source_inquiry", ok: observation?.success !== false, output: observation });
            }
            catch (error) {
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_failed", tool: "request_project_source_inquiry", toolCallId: callId, error: String(error?.message || error) });
                rows.push({ callId, name: "request_project_source_inquiry", ok: false, error: String(error?.message || error) });
            }
        }
        return rows;
    };
    const result = await (0, main_agent_harness_1.runMainAgentHarness)({
        harness: (0, main_agent_harness_1.buildMainAgentHarness)({
            scope: "global",
            scopeId: "global",
            exactSessionId: String(run.session_id || ""),
            generation: Math.max(0, Number(run.generation || run.resume_count || 0)),
            attempt,
        }),
        config,
        messages: [
            ...input.messages,
            ...(confirmedPlan ? [{ role: "system", content: "The current structured plan is already confirmed and server-bound. Do not present, rewrite, or review another plan. Continue from the confirmed requirement/plan checksums and invoke the authorized global development-dispatch tool for the target automation conversation. Use read-only tools only when current facts must be refreshed." }] : []),
        ],
        tools: globalNativeTools(run),
        scope: "global",
        scopeId: "global",
        exactSessionId: String(run.session_id || ""),
        signal: input.signal,
        nativeToolReference: true,
        persistContext: { scope: "global", scopeId: "global", sessionId: String(run.session_id || "") },
        getTools: () => globalNativeTools(run),
        isReadOnly: isReadOnlyCall,
        shouldStopAfterTools: (calls) => calls.some(call => !isReadOnlyCall(call)),
        onDelta: (delta, context) => {
            if (!String(delta || "").trim())
                return;
            input.onContextUsageDelta?.(String(delta));
            modelPreambleBuffer.append(delta);
            input.markProviderToken?.();
            input.markVisibleFeedback?.();
            input.onEvent?.({
                type: "response_delta",
                text: delta,
                model_call_index: context.modelCallIndex,
                modelCallIndex: context.modelCallIndex,
                round: context.round,
                segment_kind: "pending",
                final: false,
            });
        },
        onProviderStreamActivity: activity => providerStreamProjection.handle(activity),
        onUsage: input.onUsage,
        onCanonicalPayload: input.onCanonicalPayload,
        onConversationContextPressure: input.onConversationContextPressure,
        resolvePlanningEvidence,
        onModelCallStart: ({ round, modelCallIndex }) => {
            const activityPhase = round > 0 || Number(run.tool_calls || 0) > 0
                ? "tool_result_review"
                : "understanding";
            run.main_model_call_count = Math.max(Math.max(0, Number(run.main_model_call_count || 0)), modelCallIndex);
            const activity = (0, model_activity_1.createModelActivityController)({
                scope: "global",
                scopeId: "global",
                exactSessionId: String(run.session_id || ""),
                turnId: String(run.id || "global-run"),
                anchorMessageId: `gam_${String(run.id || "result")}_assistant`,
                modelCallIndex,
                phase: activityPhase,
                generation: Math.max(0, Number(run.generation || run.resume_count || 0)),
                taskId: String(run.mission_id || "") || undefined,
                onActivity: (activityValue, event) => {
                    if (["thinking", "started", "waiting", "retrying"].includes(String(activityValue?.state || ""))) {
                        input.markVisibleFeedback?.();
                    }
                    input.onEvent?.({ type: "model_activity", activity: activityValue, event });
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
        },
        executeTools: async (calls, ctx) => {
            keyProgress.toolBatchStarted(calls, ctx.round, ctx.round + 1);
            input.markVisibleFeedback?.();
            const rows = [];
            const reads = calls.filter(isReadOnlyCall);
            const writes = calls.filter(call => !isReadOnlyCall(call) && call.name !== "ccm_ask_user" && call.name !== "ccm_present_plan");
            const readRows = await (0, readonly_tool_concurrency_1.runReadonlyToolsAdaptive)({
                items: reads,
                configuredLimit: readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT,
                worker: async (call) => {
                    try {
                        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
                            type: "tool_started",
                            tool: call.name,
                            toolCallId: call.id,
                            arguments: call.arguments || {},
                        });
                        const observation = await input.executeTool(call.name, call.arguments || {}, run, input.signal);
                        run.tool_calls = Math.max(0, Number(run.tool_calls || 0)) + 1;
                        run.steps = Array.isArray(run.steps) ? run.steps : [];
                        run.steps.push({
                            index: run.steps.length + 1,
                            at: new Date().toISOString(),
                            state: "investigate",
                            message: "",
                            tool: { name: call.name, arguments: call.arguments || {}, risk: "read" },
                            toolCallId: call.id,
                            observation,
                        });
                        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
                            type: "tool_completed",
                            tool: call.name,
                            toolCallId: call.id,
                            observation,
                        });
                        return { callId: call.id, name: call.name, ok: true, output: observation };
                    }
                    catch (error) {
                        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
                            type: "tool_failed",
                            tool: call.name,
                            toolCallId: call.id,
                            error: String(error?.message || error),
                        });
                        return { callId: call.id, name: call.name, ok: false, error: String(error?.message || error) };
                    }
                }
            });
            rows.push(...readRows);
            if (writes.length && !pendingWrite)
                pendingWrite = writes[0];
            for (const call of writes) {
                rows.push({ callId: call.id, name: call.name, ok: true, output: { pending_authorization: true } });
            }
            keyProgress.toolBatchCompleted(rows, ctx.round, ctx.round + 1);
            input.markVisibleFeedback?.();
            return rows;
        },
        callTurn: (callConfig, options) => (0, group_orchestrator_llm_client_1.callNativeAgentTurn)(callConfig, options),
    });
    // Keep global run telemetry aligned with project/group main-loop receipts.
    // The harness remains the single execution path; these scalar fields are
    // safe diagnostics only and never include prompt or tool-result content.
    run.main_loop_model_calls = Number(result.modelCallCount || 0);
    run.auxiliary_model_calls = 0;
    run.tool_loop_rounds = Number(result.toolRoundCount || 0);
    run.tool_call_count = Number(result.toolCallCount || 0);
    run.auxiliary_stages = [];
    providerStreamProjection.flush();
    const finalModelOutput = modelPreambleBuffer.take();
    if (finalModelOutput && result.toolCallCount > 0) {
        keyProgress.modelOutput(finalModelOutput, result.modelCallCount, result.toolRoundCount);
    }
    return nativeTurnToGlobalDecision(result.parsed, pendingWrite);
}
function runGlobalNativeQuerySelfTest() {
    const decision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "hello" }, null);
    const writeDecision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "执行中" }, { id: "1", name: "create_task", arguments: { title: "x" }, argumentsChecksum: "" });
    const firstTurn = (0, provider_native_tools_1.providerToolsRequestPatch)("openai", globalNativeTools({ loaded_tool_names: [] }));
    const firstNames = (firstTurn.body.tools || []).map((tool) => tool.function?.name || tool.name);
    const afterSearch = (0, provider_native_tools_1.providerToolsRequestPatch)("openai", globalNativeTools({ loaded_tool_names: ["manage_project"] }));
    const afterNames = (afterSearch.body.tools || []).map((tool) => tool.function?.name || tool.name);
    const afterConfirmation = (0, provider_native_tools_1.providerToolsRequestPatch)("openai", globalNativeTools({ plan_mode: { confirmation_status: "confirmed" } }));
    const afterConfirmationNames = (afterConfirmation.body.tools || []).map((tool) => tool.function?.name || tool.name);
    const checks = {
        replyMapsAnswer: decision.state === "answer" && decision.message === "hello",
        writeMapsExecute: writeDecision.state === "execute" && writeDecision.tool?.name === "create_task",
        stableGlobalToolSurface: firstNames.includes("tool_search") === true
            && firstNames.includes("inspect_system") === true
            && firstNames.includes("request_project_source_inquiry") === true
            && firstNames.includes("request_group_source_inquiry") === true
            && firstNames.includes("read_file") === false
            && firstNames.includes("grep_text") === false
            && firstNames.includes("manage_project") === true
            && firstNames.includes("orchestrate_development") === true,
        searchDoesNotChangeProviderToolSurface: JSON.stringify(afterNames) === JSON.stringify(firstNames),
        confirmationDoesNotChangeProviderToolSurface: JSON.stringify(afterConfirmationNames) === JSON.stringify(firstNames),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=global-native-query-adapter.js.map