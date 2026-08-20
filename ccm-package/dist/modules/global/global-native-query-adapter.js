"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalNativeTools = globalNativeTools;
exports.nativeTurnToGlobalDecision = nativeTurnToGlobalDecision;
exports.runGlobalNativeQueryCall = runGlobalNativeQueryCall;
exports.runGlobalNativeQuerySelfTest = runGlobalNativeQuerySelfTest;
const native_query_loop_1 = require("../../agents/native-query-loop");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const runtime_1 = require("../../agents/global/runtime");
const global_agent_run_store_1 = require("../../agents/global/global-agent-run-store");
const global_tool_load_policy_1 = require("../../agents/global/global-tool-load-policy");
const provider_native_tools_1 = require("../../system/provider-native-tools");
function globalNativeTools(run) {
    const loaded = new Set((run?.loaded_tool_names || run?.loadedToolNames || []).map((value) => String(value || "")));
    const specs = (0, runtime_1.buildGlobalAgentToolDefinitions)(global_agent_run_store_1.GLOBAL_AGENT_TOOL_SPECS);
    const fromSpecs = specs.map(spec => ({
        name: spec.name,
        description: spec.description,
        inputSchema: spec.inputSchema || { type: "object", properties: {} },
        deferred: (0, global_tool_load_policy_1.isGlobalDeferredTool)(spec.name, Array.from(loaded)),
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
    const result = await (0, native_query_loop_1.runNativeQueryLoop)({
        config,
        messages: input.messages.slice(),
        tools: globalNativeTools(run),
        scope: "global",
        scopeId: "global",
        exactSessionId: String(run.session_id || ""),
        signal: input.signal,
        nativeToolReference: true,
        persistContext: { scope: "global", sessionId: String(run.session_id || "") },
        getTools: () => globalNativeTools(run),
        isReadOnly: isReadOnlyCall,
        shouldStopAfterTools: (calls) => calls.some(call => !isReadOnlyCall(call)),
        onDelta: (delta) => {
            if (!String(delta || "").trim())
                return;
            input.markProviderToken?.();
            input.markVisibleFeedback?.();
            input.onEvent?.({ type: "response_delta", text: delta, final: false });
        },
        onUsage: input.onUsage,
        executeTools: async (calls) => {
            const rows = [];
            const reads = calls.filter(isReadOnlyCall);
            const writes = calls.filter(call => !isReadOnlyCall(call) && call.name !== "ccm_ask_user" && call.name !== "ccm_present_plan");
            await Promise.all(reads.map(async (call) => {
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
                    rows.push({ callId: call.id, name: call.name, ok: true, output: observation });
                }
                catch (error) {
                    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
                        type: "tool_failed",
                        tool: call.name,
                        toolCallId: call.id,
                        error: String(error?.message || error),
                    });
                    rows.push({ callId: call.id, name: call.name, ok: false, error: String(error?.message || error) });
                }
            }));
            if (writes.length && !pendingWrite)
                pendingWrite = writes[0];
            for (const call of writes) {
                rows.push({ callId: call.id, name: call.name, ok: true, output: { pending_authorization: true } });
            }
            return rows;
        },
        callTurn: (callConfig, options) => (0, group_orchestrator_llm_client_1.callNativeAgentTurn)(callConfig, options),
    });
    return nativeTurnToGlobalDecision(result.parsed, pendingWrite);
}
function runGlobalNativeQuerySelfTest() {
    const decision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "hello" }, null);
    const writeDecision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "执行中" }, { id: "1", name: "create_task", arguments: { title: "x" }, argumentsChecksum: "" });
    const firstTurn = (0, provider_native_tools_1.providerToolsRequestPatch)("openai", globalNativeTools({ loaded_tool_names: [] }));
    const firstNames = (firstTurn.body.tools || []).map((tool) => tool.function?.name || tool.name);
    const afterSearch = (0, provider_native_tools_1.providerToolsRequestPatch)("openai", globalNativeTools({ loaded_tool_names: ["manage_project"] }));
    const afterNames = (afterSearch.body.tools || []).map((tool) => tool.function?.name || tool.name);
    const checks = {
        replyMapsAnswer: decision.state === "answer" && decision.message === "hello",
        writeMapsExecute: writeDecision.state === "execute" && writeDecision.tool?.name === "create_task",
        firstTurnOmitsManagement: firstNames.includes("tool_search") === true
            && firstNames.includes("inspect_system") === true
            && firstNames.includes("read_file") === true
            && firstNames.includes("manage_project") === false
            && firstNames.includes("orchestrate_development") === false,
        searchLoadsManagementSchema: afterNames.includes("manage_project") === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=global-native-query-adapter.js.map