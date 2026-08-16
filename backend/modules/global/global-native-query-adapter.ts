import { nativeControlToolDefinitions, runNativeQueryLoop } from "../../agents/native-query-loop";
import type { NativeToolResult } from "../../agents/native-query-messages";
import { callNativeAgentTurn } from "../collaboration/group-orchestrator-llm-client";
import { buildGlobalAgentToolDefinitions, recordGlobalAgentRuntimeOutput } from "../../agents/global/runtime";
import { GLOBAL_AGENT_TOOL_SPECS, classifyGlobalAgentToolRisk } from "../../agents/global/global-agent-run-store";
import { WORKSPACE_READONLY_TOOL_DEFINITIONS_V3 } from "../../tools/workspace-readonly-tools";
import type { ProviderToolCall, ProviderToolDefinition } from "../../system/provider-native-tools";

function globalNativeTools(run: any): ProviderToolDefinition[] {
  const loaded = new Set((run?.loaded_tool_names || run?.loadedToolNames || []).map((value: any) => String(value || "")));
  const deferredWorkspaceNames = new Set(WORKSPACE_READONLY_TOOL_DEFINITIONS_V3
    .filter(tool => tool.loadPolicy === "search" && !loaded.has(tool.name) && !loaded.has(tool.canonicalName))
    .map(tool => tool.name));
  const specs = buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS.filter(spec => !deferredWorkspaceNames.has(spec.name)));
  const fromSpecs: ProviderToolDefinition[] = specs.map(spec => ({
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema || { type: "object", properties: {} },
  }));
  return [
    ...nativeControlToolDefinitions().filter(tool => tool.name !== "ccm_dispatch"),
    ...fromSpecs,
  ];
}

export function nativeTurnToGlobalDecision(parsed: any, pendingWrite?: ProviderToolCall | null) {
  if (pendingWrite) {
    return {
      state: classifyGlobalAgentToolRisk(pendingWrite.name, pendingWrite.arguments) === "high" ? "execute" : "execute",
      message: String(parsed?.reply || parsed?.friendlyResponse || ""),
      tool: { name: pendingWrite.name, arguments: pendingWrite.arguments || {} },
      workflowDecision: parsed?.workflowDecision || { mode: "execute_direct", actionRequired: true },
    };
  }
  const responseType = String(parsed?.responseType || "reply");
  if (responseType === "dispatch") {
    return {
      state: "answer",
      message: String(parsed?.friendlyResponse || parsed?.reply || ""),
      tool: null,
      targets: parsed?.targets || [],
      workflowDecision: parsed?.workflowDecision || { mode: "execute_direct", actionRequired: true },
    };
  }
  if (responseType === "clarify") {
    return {
      state: "needs_confirmation",
      message: String(parsed?.reply || parsed?.questionForUser || ""),
      tool: null,
      workflowDecision: parsed?.workflowDecision || { mode: "answer", actionRequired: false },
    };
  }
  if (responseType === "plan") {
    return {
      state: "plan",
      message: String(parsed?.reply || ""),
      tool: null,
      plan: parsed?.plan,
      workflowDecision: parsed?.workflowDecision || { mode: "plan_task", actionRequired: false },
    };
  }
  return {
    state: "answer",
    message: String(parsed?.reply || ""),
    tool: null,
    workflowDecision: parsed?.workflowDecision || { mode: "answer", actionRequired: false },
  };
}

export async function runGlobalNativeQueryCall(input: {
  config: any;
  messages: Array<{ role: string; content: any }>;
  run: any;
  signal?: AbortSignal;
  executeTool: (name: string, args: any, run: any, signal?: AbortSignal) => Promise<any>;
  onEvent?: (event: any) => void;
  onUsage?: (usage: any) => void;
  markVisibleFeedback?: (at?: number) => void;
  markProviderToken?: (at?: number) => void;
}): Promise<any> {
  const { config, run } = input;
  let pendingWrite: ProviderToolCall | null = null;
  const isReadOnlyCall = (call: ProviderToolCall) => {
    if (call.name === "ccm_ask_user" || call.name === "ccm_present_plan") return true;
    if (call.name === "ccm_dispatch") return false;
    try { return classifyGlobalAgentToolRisk(call.name, call.arguments) === "read"; }
    catch { return false; }
  };

  const result = await runNativeQueryLoop({
    config,
    messages: input.messages.slice(),
    tools: globalNativeTools(run),
    scope: "global",
    scopeId: "global",
    exactSessionId: String(run.session_id || ""),
    signal: input.signal,
    nativeToolReference: true,
    getTools: () => globalNativeTools(run),
    isReadOnly: isReadOnlyCall,
    shouldStopAfterTools: (calls) => calls.some(call => !isReadOnlyCall(call)),
    onDelta: (delta) => {
      if (!String(delta || "").trim()) return;
      input.markProviderToken?.();
      input.markVisibleFeedback?.();
      input.onEvent?.({ type: "response_delta", text: delta, final: false });
    },
    onUsage: input.onUsage,
    executeTools: async (calls) => {
      const rows: NativeToolResult[] = [];
      const reads = calls.filter(isReadOnlyCall);
      const writes = calls.filter(call => !isReadOnlyCall(call) && call.name !== "ccm_ask_user" && call.name !== "ccm_present_plan");
      await Promise.all(reads.map(async call => {
        try {
          recordGlobalAgentRuntimeOutput(run, {
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
            observation,
          });
          recordGlobalAgentRuntimeOutput(run, {
            type: "tool_completed",
            tool: call.name,
            toolCallId: call.id,
            observation,
          });
          rows.push({ callId: call.id, name: call.name, ok: true, output: observation });
        } catch (error: any) {
          recordGlobalAgentRuntimeOutput(run, {
            type: "tool_failed",
            tool: call.name,
            toolCallId: call.id,
            error: String(error?.message || error),
          });
          rows.push({ callId: call.id, name: call.name, ok: false, error: String(error?.message || error) });
        }
      }));
      if (writes.length && !pendingWrite) pendingWrite = writes[0];
      for (const call of writes) {
        rows.push({ callId: call.id, name: call.name, ok: true, output: { pending_authorization: true } });
      }
      return rows;
    },
    callTurn: (callConfig, options) => callNativeAgentTurn(callConfig, options),
  });

  return nativeTurnToGlobalDecision(result.parsed, pendingWrite);
}

export function runGlobalNativeQuerySelfTest() {
  const decision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "hello" }, null);
  const writeDecision = nativeTurnToGlobalDecision({ responseType: "reply", reply: "执行中" }, { id: "1", name: "create_task", arguments: { title: "x" }, argumentsChecksum: "" });
  const checks = {
    replyMapsAnswer: decision.state === "answer" && decision.message === "hello",
    writeMapsExecute: writeDecision.state === "execute" && writeDecision.tool?.name === "create_task",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
