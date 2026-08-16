import {
  callAnthropicCompatibleJson,
  callNativeAgentTurn,
  callOpenAiCompatibleJson,
  extractJsonObject,
  shouldUseAnthropic,
  shouldUseGemini,
  type LlmCallOptions,
  type LlmChatMessage,
  type LlmTokenUsage,
} from "../modules/collaboration/group-orchestrator-llm-client";
import { readProviderNativeToolCapability } from "../system/provider-native-tool-capability";
import type { ProviderAgentTurn, ProviderToolCall, ProviderToolDefinition } from "../system/provider-native-tools";
import { resolveAgentLoopBudget, shouldContinueAgentLoop, type AgentLoopBudget } from "../system/agent-loop-budget";
import { applyConversationPlanModeToRound, holdConversationPlanModeParsed, type ConversationPlanScope } from "../system/conversation-plan-mode-gate";
import { normalizeMainAgentTurnDecision, type MainAgentTurnDecisionV1 } from "./main-agent-turn";
import { appendNativeTurnTranscript, nativeQueryFamily, type NativeQueryFamily, type NativeToolResult } from "./native-query-messages";
import {
  attachPresentedPlanQuality,
  buildPresentedPlanQualityToolResult,
  evaluatePresentedPlanQuality,
  shouldRepairPresentedPlan,
} from "./presented-plan-quality";
import {
  persistNativeToolResultRows,
  type ToolResultPersistContext,
} from "../tools/tool-result-storage";

export const NATIVE_CONTROL_TOOL_NAMES = ["ccm_ask_user", "ccm_present_plan", "ccm_dispatch"] as const;
export type NativeControlToolName = typeof NATIVE_CONTROL_TOOL_NAMES[number];

const CONTROL_TOOL_SET = new Set<string>(NATIVE_CONTROL_TOOL_NAMES);

export function isNativeControlTool(name: string) {
  return CONTROL_TOOL_SET.has(String(name || ""));
}

export function nativeControlToolDefinitions(): ProviderToolDefinition[] {
  return [
    {
      name: "ccm_ask_user",
      description: "向用户提出必须确认的业务澄清，前端会渲染可点选项卡。必须同时给出 question 和 1～3 条 structuredClarificationQuestions（每项含 label 与 options）。不要只输出一段问句就结束。仅当缺口会改变方案、范围或验收时使用；代码和资料可查明的问题应先调用只读工具。",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["question"],
        properties: {
          question: { type: "string", description: "给用户看的短引言，不要代替选项卡" },
          structuredClarificationQuestions: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            description: "选项卡问题；每项需要 label，选择题再给 2～4 个 options",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label"],
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                type: { type: "string", description: "single | multiple | text" },
                reason: { type: "string" },
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      description: { type: "string" },
                      recommended: { type: "boolean" },
                      safeDefault: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
          questions: { type: "array", items: { type: "object" }, description: "structuredClarificationQuestions 的别名" },
          workflowDecision: { type: "object" },
        },
      },
    },
    {
      name: "ccm_present_plan",
      description: "提交只读计划稿供用户确认。用户要求看计划、方案或步骤时必须调用本工具。",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["plan"],
        properties: {
          reply: { type: "string", description: "给用户看的短引言，不要代替 plan.steps" },
          plan: {
            type: "object",
            additionalProperties: false,
            required: ["goal", "steps"],
            properties: {
              title: { type: "string", description: "短名，对应计划标题" },
              goal: { type: "string", description: "关键决策、运转规则和交付顺序；没有 overview 时 UI 用这段" },
              overview: { type: "string", description: "可选稍长说明：状态、占用/释放、超时时钟、现有对象或 greenfield。没有则 UI 只用 goal。不要把说明写进 steps" },
              steps: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title"],
                  properties: {
                    id: { type: "string" },
                    title: { type: "string", description: "一行可演示切片，不要再写要做/结果" },
                    description: { type: "string", description: "不要填；说明写在 goal/overview" },
                    outcome: { type: "string", description: "不要填；说明写在 goal/overview" },
                  },
                },
              },
              expectedResults: { type: "array", items: { type: "string" } },
              exclusions: { type: "array", items: { type: "string" } },
              scope: { type: "array", items: { type: "string" } },
            },
          },
          workflowDecision: { type: "object" },
        },
      },
    },
    {
      name: "ccm_dispatch",
      description: "派发项目 Agent 或创建开发任务。必须给出自包含工作单；未获用户执行授权时不要调用。",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["targets"],
        properties: {
          friendlyResponse: { type: "string" },
          targets: {
            type: "array",
            items: { type: "object" },
            description: "按项目的自包含工作单；须覆盖已确认计划卡切片，并写明落实了哪些切片。不要把 TestAgent 放进 targets。",
          },
          workflowDecision: { type: "object" },
          architecturePlan: {
            type: "object",
            description: "dependencySteps 可按项目/依赖排期；不得把已确认卡片重写成前端/后端/测试分工。",
          },
          coordinationPlan: { type: "object" },
        },
      },
    },
  ];
}

export function nativeDiscoveryToolDefinitions(): ProviderToolDefinition[] {
  return [
    {
      name: "tool_search",
      description: "按需发现并加载低频只读工具Schema。",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: { type: "string", description: "工具名称、能力描述或 select:canonicalName" },
          max_results: { type: "integer", minimum: 1, maximum: 24 },
        },
      },
    },
    {
      name: "invoke_skill",
      description: "加载并调用当前作用域已授权的Skill。",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string" },
          input: { description: "本轮完整目标或必要上下文" },
        },
      },
    },
  ];
}

function catalogLoadedTools(toolContext: any) {
  const loaded = [...(toolContext?.catalog?.loadedMcp || [])];
  const names = new Set(loaded.map((tool: any) => String(tool?.canonicalName || tool?.name || "")));
  for (const tool of toolContext?.catalog?.mcp || []) {
    const server = String(tool?.server || "");
    const name = String(tool?.canonicalName || tool?.name || "");
    if (!name || names.has(name)) continue;
    if (server === "ccm-group-readonly" || server === "ccm-project-readonly") {
      loaded.push({ ...tool, deferred: false });
      names.add(name);
    }
  }
  return loaded;
}

function catalogNativeToolName(tool: any) {
  return String(tool?.server || "") === "ccm__workspace_readonly"
    ? String(tool?.name || "")
    : String(tool?.canonicalName || tool?.name || "");
}

export function catalogToNativeTools(toolContext: any): ProviderToolDefinition[] {
  const discovery = nativeDiscoveryToolDefinitions();
  const reserved = new Set(discovery.map(tool => tool.name));
  const loaded = catalogLoadedTools(toolContext).map((tool: any) => ({ ...tool, deferred: false }));
  const discoverable = [...(toolContext?.catalog?.discoverableMcp || [])].map((tool: any) => ({ ...tool, deferred: true }));
  const catalog = [...loaded, ...discoverable].map((tool: any) => ({
    name: catalogNativeToolName(tool),
    description: String(tool.description || ""),
    inputSchema: tool.inputSchema || { type: "object", properties: {} },
    deferred: tool.deferred === true,
  })).filter((tool: any) => tool.name && !reserved.has(tool.name));
  return [...discovery, ...catalog];
}

export function shouldUseNativeQueryLoop(config: any) {
  if (config?.forceNativeQueryLoop === true) return true;
  if (String(config?.providerNativeToolsMode || config?.provider_native_tools_mode || "auto").toLowerCase() === "json") return false;
  const family = shouldUseAnthropic(config) ? "anthropic" : shouldUseGemini(config) ? "gemini" : "openai";
  return readProviderNativeToolCapability(config, family)[0]?.status !== "unsupported";
}

export function mapNativeTurnToParsed(turn: ProviderAgentTurn, controlCalls: ProviderToolCall[] = []) {
  const text = String(turn?.text || "").trim();
  const ask = controlCalls.find(item => item.name === "ccm_ask_user");
  const plan = controlCalls.find(item => item.name === "ccm_present_plan");
  const dispatch = controlCalls.find(item => item.name === "ccm_dispatch");
  if (dispatch) {
    const args = dispatch.arguments || {};
    return {
      responseType: "dispatch",
      shouldDelegate: true,
      reply: String(args.friendlyResponse || args.reply || text || ""),
      friendlyResponse: String(args.friendlyResponse || args.reply || text || ""),
      targets: Array.isArray(args.targets) ? args.targets : [],
      workflowDecision: args.workflowDecision || args.workflow_decision || { mode: "execute_direct", actionRequired: true },
      architecturePlan: args.architecturePlan || args.architecture_plan || null,
      coordinationPlan: args.coordinationPlan || args.coordination_plan || null,
    };
  }
  if (plan) {
    const args = plan.arguments || {};
    return {
      responseType: "plan",
      shouldDelegate: false,
      reply: String(args.reply || text || ""),
      friendlyResponse: String(args.reply || text || ""),
      plan: args.plan || null,
      workflowDecision: args.workflowDecision || args.workflow_decision || { mode: "plan_task", actionRequired: false },
    };
  }
  if (ask) {
    const args = ask.arguments || {};
    const question = String(args.question || args.reply || text || "");
    const structuredQuestions = Array.isArray(args.structuredClarificationQuestions) && args.structuredClarificationQuestions.length
      ? args.structuredClarificationQuestions
      : Array.isArray(args.questions) ? args.questions : [];
    return {
      responseType: "clarify",
      shouldDelegate: false,
      reply: question,
      questionForUser: question,
      dispatchPolicy: {
        action: "ask_user",
        reason: question,
        structuredClarificationQuestions: structuredQuestions,
      },
      workflowDecision: {
        ...(args.workflowDecision || args.workflow_decision || { mode: "answer", actionRequired: false }),
        structuredClarificationQuestions: structuredQuestions,
        clarificationQuestions: question ? [question] : [],
      },
    };
  }
  return {
    responseType: "reply",
    shouldDelegate: false,
    reply: text,
    friendlyResponse: text,
    directResponse: text,
    workflowDecision: { mode: "answer", actionRequired: false },
  };
}

export type NativeQueryExecuteContext = {
  round: number;
  turn: ProviderAgentTurn;
  signal?: AbortSignal;
  startedCallIds: Set<string>;
};

export type NativeQueryLoopInput = {
  config: any;
  messages: LlmChatMessage[];
  tools: ProviderToolDefinition[];
  scope: ConversationPlanScope;
  scopeId: string;
  exactSessionId: string;
  signal?: AbortSignal;
  nativeToolReference?: boolean;
  retryProfile?: LlmCallOptions["retryProfile"];
  maxTokens?: number;
  promptCacheTracking?: any;
  onDelta?: (delta: string) => void;
  onUsage?: (usage: LlmTokenUsage) => void;
  onRetry?: LlmCallOptions["onRetry"];
  onTurn?: (info: { round: number; turn: ProviderAgentTurn; modelCallIndex: number }) => void;
  executeTools: (calls: ProviderToolCall[], ctx: NativeQueryExecuteContext) => Promise<NativeToolResult[]>;
  isReadOnly?: (call: ProviderToolCall) => boolean;
  loopBudget?: AgentLoopBudget;
  planModeEnabled?: boolean;
  errorPrefix?: string;
  jsonFallback?: () => Promise<NativeQueryLoopResult>;
  callTurn?: (config: any, options: LlmCallOptions) => Promise<ProviderAgentTurn>;
  getTools?: () => ProviderToolDefinition[];
  compactTranscript?: (messages: LlmChatMessage[]) => LlmChatMessage[];
  persistContext?: ToolResultPersistContext | null;
  shouldStopAfterTools?: (calls: ProviderToolCall[], results: NativeToolResult[]) => boolean;
};

export type NativeQueryLoopResult = {
  parsed: any;
  decision: MainAgentTurnDecisionV1;
  text: string;
  messages: LlmChatMessage[];
  toolResults: NativeToolResult[];
  modelCallCount: number;
  toolRoundCount: number;
  toolCallCount: number;
  stopReason: string;
  usage: LlmTokenUsage | null;
  noProgressCount: number;
  continuationSegments: number;
  family: NativeQueryFamily;
};

function mergeUsage(current: LlmTokenUsage | null, next: LlmTokenUsage | null | undefined): LlmTokenUsage | null {
  if (!next) return current;
  if (!current) return next;
  return {
    inputTokens: Number(current.inputTokens || 0) + Number(next.inputTokens || 0),
    outputTokens: Number(current.outputTokens || 0) + Number(next.outputTokens || 0),
    totalTokens: Number(current.totalTokens || 0) + Number(next.totalTokens || 0),
    reported: current.reported !== false && next.reported !== false,
  };
}

function fingerprintCall(call: ProviderToolCall) {
  return JSON.stringify({ name: call.name, arguments: call.arguments || {} });
}

export function unstreamedTurnText(turnText: string, emitted: string) {
  const text = String(turnText || "");
  const already = String(emitted || "");
  if (!text.trim()) return "";
  if (!already) return text;
  if (text.startsWith(already)) return text.slice(already.length);
  return "";
}

function parsedReply(parsed: any) {
  return String(parsed?.reply || parsed?.friendlyResponse || parsed?.directResponse || "").trim();
}

function parsedPlan(parsed: any) {
  const plan = parsed?.plan;
  return plan && typeof plan === "object" ? plan : null;
}

export function mergeNativeTurnParsed(previous: any, next: any) {
  const prev = previous && typeof previous === "object" ? previous : {};
  const curr = next && typeof next === "object" ? next : {};
  const prevReply = parsedReply(prev);
  const currReply = parsedReply(curr);
  const prevPlan = parsedPlan(prev);
  const currPlan = parsedPlan(curr);
  const currHasPlanSteps = Array.isArray(currPlan?.steps) && currPlan.steps.length > 0;
  const prevHasPlanSteps = Array.isArray(prevPlan?.steps) && prevPlan.steps.length > 0;
  const reply = currReply || prevReply;
  const currType = String(curr.responseType || curr.response_type || "").trim();
  const prevType = String(prev.responseType || prev.response_type || "").trim();
  const keepClarify = prevType === "clarify" && !["dispatch", "plan"].includes(currType);
  const keepPreviousType = !currReply && !currHasPlanSteps && !["clarify", "dispatch", "plan"].includes(currType);
  const merged: any = {
    ...prev,
    ...curr,
    reply,
    friendlyResponse: String(curr.friendlyResponse || "").trim() || String(prev.friendlyResponse || "").trim() || reply,
    directResponse: String(curr.directResponse || "").trim() || String(prev.directResponse || "").trim() || reply,
    plan: currHasPlanSteps ? currPlan : (prevHasPlanSteps ? prevPlan : (currPlan || prevPlan)),
    responseType: keepClarify ? "clarify" : (keepPreviousType ? (prev.responseType || curr.responseType || "reply") : (curr.responseType || prev.responseType || "reply")),
  };
  if (keepClarify || currType === "clarify") {
    merged.questionForUser = String(curr.questionForUser || curr.question_for_user || prev.questionForUser || prev.question_for_user || "").trim();
    merged.dispatchPolicy = {
      ...(prev.dispatchPolicy || {}),
      ...(curr.dispatchPolicy || {}),
      action: "ask_user",
      structuredClarificationQuestions: curr.dispatchPolicy?.structuredClarificationQuestions?.length
        ? curr.dispatchPolicy.structuredClarificationQuestions
        : (prev.dispatchPolicy?.structuredClarificationQuestions || curr.workflowDecision?.structuredClarificationQuestions || prev.workflowDecision?.structuredClarificationQuestions || []),
    };
    merged.workflowDecision = {
      ...(prev.workflowDecision || {}),
      ...(curr.workflowDecision || {}),
      structuredClarificationQuestions: curr.workflowDecision?.structuredClarificationQuestions?.length
        ? curr.workflowDecision.structuredClarificationQuestions
        : (prev.workflowDecision?.structuredClarificationQuestions || []),
      clarificationQuestions: curr.workflowDecision?.clarificationQuestions?.length
        ? curr.workflowDecision.clarificationQuestions
        : (prev.workflowDecision?.clarificationQuestions || []),
    };
  }
  if (["dispatch", "plan"].includes(currType) && !keepClarify) {
    merged.questionForUser = "";
  }
  return merged;
}

function stampPresentedPlanQuality(parsed: any, repaired: boolean) {
  if (!parsed?.plan || typeof parsed.plan !== "object") return parsed;
  const attached = attachPresentedPlanQuality(parsed.plan, { repaired });
  return { ...parsed, plan: attached.plan, planQuality: attached.quality };
}

function presentPlanControlCall(controlCalls: ProviderToolCall[]) {
  return (controlCalls || []).find(item => item.name === "ccm_present_plan") || null;
}

function persistExecutedToolRows(rows: NativeToolResult[], persistContext?: ToolResultPersistContext | null) {
  if (!persistContext?.scope || !persistContext?.sessionId) return rows;
  return persistNativeToolResultRows(rows, persistContext).rows;
}

async function runJsonQueryLoop(input: NativeQueryLoopInput): Promise<NativeQueryLoopResult> {
  const budget = input.loopBudget || resolveAgentLoopBudget(input.config);
  const executeTools = async (calls: ProviderToolCall[], ctx: NativeQueryExecuteContext) => (
    persistExecutedToolRows(await input.executeTools(calls, ctx), input.persistContext)
  );
  let messages = input.messages.slice();
  const jsonHint = { role: "system", content: "退化路径：只输出一个 JSON 对象，不要 Markdown。格式：{\"responseType\":\"reply|tool_calls|clarify|plan|dispatch\",\"reply\":\"\",\"toolRequests\":[{\"name\":\"\",\"arguments\":{}}],\"workflowDecision\":{}}" };
  if (!messages.some(item => String(item.content || "").includes("退化路径：只输出一个 JSON"))) messages = [jsonHint, ...messages];
  let parsed: any = { responseType: "reply", reply: "" };
  const toolResults: NativeToolResult[] = [];
  let modelCallCount = 0;
  let toolRoundCount = 0;
  let toolCallCount = 0;
  let noProgressCount = 0;
  let usage: LlmTokenUsage | null = null;
  let stopReason = "model_completed";
  const executed = new Set<string>();
  while (true) {
    modelCallCount += 1;
    const jsonOptions = {
      messages,
      maxTokens: input.maxTokens || 4096,
      retryProfile: input.retryProfile,
      signal: input.signal,
      onDelta: input.onDelta,
      onUsage: (value: LlmTokenUsage) => { usage = mergeUsage(usage, value); input.onUsage?.(value); },
      onRetry: input.onRetry,
    };
    const nextParsed = shouldUseAnthropic(input.config)
      ? await callAnthropicCompatibleJson(input.config, jsonOptions)
      : await callOpenAiCompatibleJson(input.config, jsonOptions);
    parsed = mergeNativeTurnParsed(parsed, nextParsed);
    const requests = (Array.isArray(parsed?.toolRequests) ? parsed.toolRequests : Array.isArray(parsed?.tool_requests) ? parsed.tool_requests : [])
      .map((item: any, index: number) => ({
        id: `json_${toolRoundCount}_${index}`,
        name: String(item?.name || "").trim(),
        arguments: item?.arguments && typeof item.arguments === "object" ? item.arguments : {},
        argumentsChecksum: "",
      }))
      .filter((item: ProviderToolCall) => item.name);
    if (!requests.length) {
      stopReason = "model_completed";
      break;
    }
    const fresh = requests.filter((item: ProviderToolCall) => !executed.has(fingerprintCall(item)));
    if (!fresh.length) {
      noProgressCount += 1;
      messages.push({ role: "user", content: JSON.stringify({ error: "duplicate_tool_request" }) });
      if (noProgressCount >= budget.noProgressThreshold) throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
      toolRoundCount += 1;
      continue;
    }
    for (const item of fresh) executed.add(fingerprintCall(item));
    const rows = await executeTools(fresh, {
      round: toolRoundCount,
      turn: { text: String(parsed?.reply || ""), toolCalls: fresh, toolReferences: [], stopReason: "tool_calls", usage: usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } },
      signal: input.signal,
      startedCallIds: new Set(),
    });
    toolResults.push(...rows);
    toolCallCount += rows.length;
    messages.push({ role: "user", content: JSON.stringify({ toolResults: rows }) });
    toolRoundCount += 1;
    if (rows.some(row => row.ok === true)) noProgressCount = 0;
    else noProgressCount += 1;
    if (noProgressCount >= budget.noProgressThreshold) throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
  }
  parsed = stampPresentedPlanQuality(parsed, false);
  const decision = normalizeMainAgentTurnDecision({
    scope: input.scope,
    scopeId: input.scopeId,
    exactSessionId: input.exactSessionId,
    parsed,
    reply: parsed?.reply,
    planDraft: parsed?.plan,
    dispatchDraft: parsed?.targets,
    workflowDecision: parsed?.workflowDecision,
  });
  return {
    parsed,
    decision,
    text: String(parsed?.reply || ""),
    messages,
    toolResults,
    modelCallCount,
    toolRoundCount,
    toolCallCount,
    stopReason,
    usage,
    noProgressCount,
    continuationSegments: 0,
    family: nativeQueryFamily(input.config),
  };
}

function fallBackToJsonQueryLoop(input: NativeQueryLoopInput) {
  return input.jsonFallback ? input.jsonFallback() : runJsonQueryLoop(input);
}

export async function runNativeQueryLoop(input: NativeQueryLoopInput): Promise<NativeQueryLoopResult> {
  if (!shouldUseNativeQueryLoop(input.config)) return fallBackToJsonQueryLoop(input);
  const family = nativeQueryFamily(input.config);
  const budget = input.loopBudget || resolveAgentLoopBudget(input.config);
  const executeTools = async (calls: ProviderToolCall[], ctx: NativeQueryExecuteContext) => (
    persistExecutedToolRows(await input.executeTools(calls, ctx), input.persistContext)
  );
  const callTurn = input.callTurn || callNativeAgentTurn;
  let messages = input.messages.slice();
  let parsed: any = { responseType: "reply", reply: "" };
  let lastTurn: ProviderAgentTurn = { text: "", toolCalls: [], toolReferences: [], stopReason: "", usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } };
  const toolResults: NativeToolResult[] = [];
  const executed = new Set<string>();
  let modelCallCount = 0;
  let toolRoundCount = 0;
  let toolCallCount = 0;
  let noProgressCount = 0;
  let continuationSegments = 0;
  let segmentToolCalls = 0;
  let segmentModelTurns = 0;
  let segmentStartedAt = Date.now();
  let stopReason = "model_completed";
  let usage: LlmTokenUsage | null = null;
  let planRepairCount = 0;
  const isReadOnly = input.isReadOnly || ((call: ProviderToolCall) => !isNativeControlTool(call.name) && call.name !== "invoke_skill" && call.name !== "tool_search");
  const applyTranscript = (next: LlmChatMessage[]) => input.compactTranscript ? input.compactTranscript(next) : next;

  try {
    while (true) {
      const round = toolRoundCount;
      modelCallCount += 1;
      segmentModelTurns += 1;
      const started = new Map<string, Promise<NativeToolResult>>();
      const startedCallIds = new Set<string>();
      const onNativeToolCallReady = (call: ProviderToolCall) => {
        if (isNativeControlTool(call.name) || !isReadOnly(call) || started.has(call.id) || executed.has(fingerprintCall(call))) return;
        startedCallIds.add(call.id);
        started.set(call.id, Promise.resolve().then(() => executeTools([call], {
          round,
          turn: lastTurn,
          signal: input.signal,
          startedCallIds,
        })).then(rows => rows[0] || { callId: call.id, name: call.name, ok: false, error: "empty_tool_result" }));
      };
      let turn: ProviderAgentTurn;
      let turnEmitted = "";
      try {
        turn = await callTurn(input.config, {
          messages,
          nativeTools: input.getTools?.() || input.tools,
          nativeToolReference: input.nativeToolReference,
          nativeToolsRequired: true,
          maxTokens: input.maxTokens,
          retryProfile: input.retryProfile || (round > 0 ? "agent_orchestration" : "interactive_first_turn"),
          promptCacheTracking: input.promptCacheTracking,
          signal: input.signal,
          stream: true,
          onDelta: (delta) => {
            if (!delta) return;
            turnEmitted += delta;
            input.onDelta?.(delta);
          },
          onUsage: (value) => {
            usage = mergeUsage(usage, value);
            input.onUsage?.(value);
          },
          onRetry: input.onRetry,
          onNativeToolCallReady,
        });
      } catch (error: any) {
        if (error?.code === "CCM_NATIVE_TOOLS_UNSUPPORTED") return fallBackToJsonQueryLoop(input);
        throw error;
      }
      lastTurn = turn;
      const unstreamed = unstreamedTurnText(turn.text, turnEmitted);
      if (unstreamed) input.onDelta?.(unstreamed);
      input.onTurn?.({ round, turn, modelCallIndex: modelCallCount });
      const controlCalls = (turn.toolCalls || []).filter(item => isNativeControlTool(item.name));
      const regularCalls = (turn.toolCalls || []).filter(item => !isNativeControlTool(item.name));
      if (!turn.toolCalls.length) {
        parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn));
        stopReason = "model_completed";
        break;
      }
      if (!regularCalls.length && controlCalls.length) {
        parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls));
        if (input.planModeEnabled) {
          parsed = mergeNativeTurnParsed(parsed, applyConversationPlanModeToRound({
            enabled: true,
            parsed,
            requests: controlCalls.map(item => ({ name: item.name, arguments: item.arguments })),
            isReadOnly: (request: any) => request.name === "ccm_ask_user" || request.name === "ccm_present_plan",
          }).parsed);
        }
        const planCall = presentPlanControlCall(controlCalls);
        if (planCall && shouldRepairPresentedPlan(parsed, planRepairCount > 0)) {
          planRepairCount += 1;
          const quality = evaluatePresentedPlanQuality(parsed.plan);
          const repairResult = buildPresentedPlanQualityToolResult(planCall.id, quality);
          const controlResults: NativeToolResult[] = controlCalls.map(item => item.name === "ccm_present_plan"
            ? repairResult
            : { callId: item.id, name: item.name, ok: true, output: { recorded: true, responseType: parsed.responseType } });
          toolResults.push(repairResult);
          messages = applyTranscript(appendNativeTurnTranscript(messages, turn, controlResults, family));
          toolRoundCount += 1;
          continue;
        }
        parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
        messages = applyTranscript(appendNativeTurnTranscript(messages, turn, controlCalls.map(item => ({
          callId: item.id,
          name: item.name,
          ok: true,
          output: { recorded: true, responseType: parsed.responseType },
        })), family));
        stopReason = input.planModeEnabled && parsed.responseType === "plan" && controlCalls.some(item => item.name === "ccm_dispatch")
          ? "plan_mode_held"
          : "model_completed";
        break;
      }
      const fresh = regularCalls.filter(item => !executed.has(fingerprintCall(item)));
      if (!fresh.length) {
        noProgressCount += 1;
        const duplicate: NativeToolResult = {
          callId: `loop_control_${round}`,
          name: "loop_control",
          ok: false,
          error: "NATIVE_QUERY_LOOP_DUPLICATE_REQUEST",
          reason: "相同工具和参数已经执行，请基于已有结果完成回答或改用控制工具。",
        };
        toolResults.push(duplicate);
        messages = applyTranscript(appendNativeTurnTranscript(messages, turn, [duplicate], family));
        if (noProgressCount >= budget.noProgressThreshold) {
          stopReason = "no_progress";
          throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
        }
        toolRoundCount += 1;
        continue;
      }
      const planModeRound = applyConversationPlanModeToRound({
        enabled: input.planModeEnabled === true,
        parsed: mapNativeTurnToParsed(turn, controlCalls),
        requests: fresh.map(item => ({ name: item.name, arguments: item.arguments, id: item.id })),
        isReadOnly: (request: any) => {
          const call = fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
            || { name: request.name, arguments: request.arguments, id: "", argumentsChecksum: "" };
          return isReadOnly(call as ProviderToolCall);
        },
      });
      parsed = mergeNativeTurnParsed(parsed, planModeRound.parsed);
      if (planModeRound.stopLoop) {
        messages = applyTranscript(appendNativeTurnTranscript(messages, turn, planModeRound.blockedResults.map((row: any, index: number) => ({
          callId: fresh[index]?.id || `blocked_${index}`,
          name: String(row.name || "unknown"),
          ok: false,
          error: row.error,
          reason: row.reason,
        })), family));
        stopReason = "plan_mode_held";
        break;
      }
      const runnable = planModeRound.requests.map((request: any) => {
        return fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
          || { id: request.id || `call_${toolCallCount}`, name: request.name, arguments: request.arguments || {}, argumentsChecksum: "" };
      });
      const remaining = [...started.entries()].filter(([id]) => runnable.some(item => item.id === id));
      const pending = runnable.filter(item => !started.has(item.id));
      const blockedResults: NativeToolResult[] = (planModeRound.blockedResults || []).map((row: any, index: number) => ({
        callId: String(row.callId || `blocked_${index}`),
        name: String(row.name || "unknown"),
        ok: false,
        error: row.error,
        reason: row.reason,
      }));
      for (const request of [...runnable, ...(planModeRound.blockedRequests || [])]) {
        executed.add(fingerprintCall(request));
      }
      const executedRows = [
        ...(await Promise.all(remaining.map(row => row[1]))),
        ...(pending.length ? await executeTools(pending, { round, turn, signal: input.signal, startedCallIds }) : []),
        ...blockedResults,
      ];
      toolResults.push(...executedRows);
      toolCallCount += executedRows.filter(row => row.name !== "loop_control").length;
      segmentToolCalls += executedRows.filter(row => row.name !== "loop_control").length;
      const planCall = presentPlanControlCall(controlCalls);
      const repairing = !!(planCall && shouldRepairPresentedPlan({
        responseType: "plan",
        plan: planCall.arguments?.plan,
      }, planRepairCount > 0));
      let controlResults: NativeToolResult[] = controlCalls.map(item => ({
        callId: item.id,
        name: item.name,
        ok: true,
        output: { deferred: "control_after_tools" },
      }));
      if (repairing && planCall) {
        planRepairCount += 1;
        const quality = evaluatePresentedPlanQuality(planCall.arguments?.plan);
        const repairResult = buildPresentedPlanQualityToolResult(planCall.id, quality);
        toolResults.push(repairResult);
        controlResults = controlCalls.map(item => item.name === "ccm_present_plan"
          ? repairResult
          : { callId: item.id, name: item.name, ok: true, output: { deferred: "control_after_tools" } });
      }
      messages = applyTranscript(appendNativeTurnTranscript(messages, turn, [...executedRows, ...controlResults], family));
      if (executedRows.some(row => row.ok === true)) noProgressCount = 0;
      else noProgressCount += 1;
      if (noProgressCount >= budget.noProgressThreshold) {
        stopReason = "no_progress";
        throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
      }
      if (repairing) {
        toolRoundCount += 1;
        continue;
      }
      if (controlCalls.length || input.shouldStopAfterTools?.(runnable, executedRows)) {
        parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls));
        if (input.planModeEnabled) parsed = holdConversationPlanModeParsed(parsed);
        parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
        stopReason = "model_completed";
        break;
      }
      toolRoundCount += 1;
      const continuation = shouldContinueAgentLoop({
        budget,
        round: toolRoundCount,
        modelTurns: segmentModelTurns,
        toolCalls: segmentToolCalls,
        elapsedMs: Date.now() - segmentStartedAt,
        unresolvedCriteria: 1,
        noProgressCount,
        cancelled: input.signal?.aborted === true,
      });
      if (!continuation.continue) {
        stopReason = continuation.reason;
        throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_${continuation.reason.toUpperCase()}`);
      }
      if (continuation.resetSegment) {
        continuationSegments += 1;
        segmentToolCalls = 0;
        segmentModelTurns = 0;
        segmentStartedAt = Date.now();
      }
    }
  } catch (error: any) {
    if (!Number(error.observationCount)) {
      error.observationCount = toolResults.filter(row => row.name && row.name !== "loop_control").length;
    }
    throw error;
  }

  parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
  const decision = normalizeMainAgentTurnDecision({
    scope: input.scope,
    scopeId: input.scopeId,
    exactSessionId: input.exactSessionId,
    parsed,
    reply: parsed?.reply,
    toolRequests: [],
    planDraft: parsed?.plan,
    dispatchDraft: parsed?.targets,
    workflowDecision: parsed?.workflowDecision,
  });
  return {
    parsed,
    decision,
    text: String(parsed?.reply || lastTurn.text || ""),
    messages,
    toolResults,
    modelCallCount,
    toolRoundCount,
    toolCallCount,
    stopReason,
    usage,
    noProgressCount,
    continuationSegments,
    family,
  };
}

export async function runNativeQueryLoopSelfTest() {
  const calls: any[] = [];
  const turns: ProviderAgentTurn[] = [
    {
      text: "",
      toolCalls: [{ id: "call_1", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "a" }],
      toolReferences: [],
      stopReason: "tool_calls",
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, reported: true },
    },
    {
      text: "已根据 README 回答。",
      toolCalls: [],
      toolReferences: [],
      stopReason: "end_turn",
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20, reported: true },
    },
  ];
  let turnIndex = 0;
  const result = await runNativeQueryLoop({
    config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
    messages: [{ role: "system", content: "你是主 Agent" }, { role: "user", content: "README 说了什么？" }],
    tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
    scope: "group",
    scopeId: "g1",
    exactSessionId: "gcs_1",
    callTurn: async (_config, options) => {
      calls.push(options.messages);
      return turns[Math.min(turnIndex++, turns.length - 1)];
    },
    executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
  });
  const control = mapNativeTurnToParsed({
    text: "",
    toolCalls: [{ id: "c1", name: "ccm_ask_user", arguments: { question: "目标项目是哪个？" }, argumentsChecksum: "b" }],
    toolReferences: [],
    stopReason: "tool_calls",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false },
  }, [{ id: "c1", name: "ccm_ask_user", arguments: { question: "目标项目是哪个？" }, argumentsChecksum: "b" }]);
  const controlAlias = mapNativeTurnToParsed({
    text: "先确认业务点",
    toolCalls: [{
      id: "c2",
      name: "ccm_ask_user",
      arguments: {
        question: "先确认 3 个业务点",
        questions: [{ label: "核销方式", type: "single", options: [{ label: "到店核销" }, { label: "线上核销" }] }],
      },
      argumentsChecksum: "c",
    }],
    toolReferences: [],
    stopReason: "tool_calls",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false },
  }, [{
    id: "c2",
    name: "ccm_ask_user",
    arguments: {
      question: "先确认 3 个业务点",
      questions: [{ label: "核销方式", type: "single", options: [{ label: "到店核销" }, { label: "线上核销" }] }],
    },
    argumentsChecksum: "c",
  }]);
  const jsonModeUsesFallback = shouldUseNativeQueryLoop({ providerNativeToolsMode: "json" }) === false;
  const secondMessages = calls[1] || [];
  const flushed: string[] = [];
  await runNativeQueryLoop({
    config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
    messages: [{ role: "user", content: "看一下 README" }],
    tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
    scope: "group",
    scopeId: "g1",
    exactSessionId: "gcs_flush",
    onDelta: (delta) => { flushed.push(delta); },
    callTurn: async () => ({
      text: "我先看 README。",
      toolCalls: [{ id: "call_flush", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "f" }],
      toolReferences: [],
      stopReason: "tool_calls",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, reported: true },
    }),
    executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
    shouldStopAfterTools: () => true,
  });
  const checks = {
    firstTurnReturnsWithoutJsonExtract: result.modelCallCount === 2 && result.toolCallCount === 1,
    secondTurnHasAssistantToolCalls: secondMessages.some((item: any) => item?.role === "assistant" && Array.isArray(item.tool_calls) && item.tool_calls[0]?.id === "call_1"),
    secondTurnHasToolResult: secondMessages.some((item: any) => item?.role === "tool" && item.tool_call_id === "call_1"),
    loopEndsOnText: result.stopReason === "model_completed" && result.parsed?.responseType === "reply" && String(result.text).includes("README"),
    controlToolMapsClarify: control.responseType === "clarify" && control.questionForUser === "目标项目是哪个？" && control.dispatchPolicy?.action === "ask_user",
    controlToolMapsQuestionAlias: controlAlias.workflowDecision?.structuredClarificationQuestions?.[0]?.label === "核销方式" && controlAlias.dispatchPolicy?.action === "ask_user",
    jsonModeFallsBack: jsonModeUsesFallback,
    unstreamedPrefix: unstreamedTurnText("我先看 README。", "") === "我先看 README。",
    unstreamedRemainder: unstreamedTurnText("我先看 README。", "我先") === "看 README。",
    unstreamedNoDup: unstreamedTurnText("我先看 README。", "我先看 README。") === "",
    flushedUnstreamedTurnText: flushed.join("") === "我先看 README。",
    emptyFollowupKeepsFirstTurnText: true,
    keepClarifyAcrossTextFollowup: true,
    planQualityRepairsOnce: true,
    planQualityAcceptsDegradedAfterRepair: true,
    planQualityPassesFirstShot: true,
    catalogEmitsDiscoveryTools: true,
    catalogUsesWorkspaceShortNames: true,
    catalogIncludesGroupBuiltin: true,
  };
  const keptTurns: ProviderAgentTurn[] = [
    {
      text: "我会沿用前文范围再展开步骤。",
      toolCalls: [{ id: "call_keep", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "k" }],
      toolReferences: [],
      stopReason: "tool_calls",
      usage: { inputTokens: 4, outputTokens: 6, totalTokens: 10, reported: true },
    },
    {
      text: "",
      toolCalls: [],
      toolReferences: [],
      stopReason: "end_turn",
      usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5, reported: true },
    },
  ];
  let keepIndex = 0;
  const kept = await runNativeQueryLoop({
    config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
    messages: [{ role: "user", content: "把刚才的计划展开" }],
    tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
    scope: "group",
    scopeId: "g1",
    exactSessionId: "gcs_keep",
    callTurn: async () => keptTurns[Math.min(keepIndex++, keptTurns.length - 1)],
    executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
  });
  checks.emptyFollowupKeepsFirstTurnText = String(kept.parsed?.reply || "").includes("沿用前文")
    && mergeNativeTurnParsed({ reply: "引言", responseType: "reply" }, { reply: "", responseType: "reply" }).reply === "引言";
  const keptClarify = mergeNativeTurnParsed(
    { responseType: "clarify", questionForUser: "核销方式？", dispatchPolicy: { action: "ask_user" }, workflowDecision: { structuredClarificationQuestions: [{ label: "核销方式" }] }, reply: "核销方式？" },
    { responseType: "reply", reply: "我先确认 3 个关键范围" },
  );
  checks.keepClarifyAcrossTextFollowup = keptClarify.responseType === "clarify" && keptClarify.dispatchPolicy?.action === "ask_user";
  const badPlan = { title: "短", goal: "太短", steps: [{ title: "占住资源" }] };
  const goodPlan = {
    title: "预约履约",
    goal: "到店履约时先占住资源，核销后改状态，超时从下单时钟释放并挂到现有预约单；没有现成域就按 greenfield 新建履约对象，验收以可演示切片为准。",
    steps: [{ title: "占住资源" }, { title: "核销改状态" }, { title: "超时释放" }],
    exclusions: ["线下手工改库存"],
  };
  const presentTurn = (id: string, plan: any): ProviderAgentTurn => ({
    text: "计划已经整理完成。",
    toolCalls: [{ id, name: "ccm_present_plan", arguments: { reply: "请看计划", plan }, argumentsChecksum: id }],
    toolReferences: [],
    stopReason: "tool_calls",
    usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, reported: true },
  });
  const loopInput = {
    config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
    messages: [{ role: "user", content: "做计划" }],
    tools: [] as ProviderToolDefinition[],
    scope: "group" as const,
    scopeId: "g1",
    exactSessionId: "gcs_plan_quality",
    executeTools: async () => [] as NativeToolResult[],
  };
  let repairIndex = 0;
  const repaired = await runNativeQueryLoop({
    ...loopInput,
    callTurn: async () => [presentTurn("p1", badPlan), presentTurn("p2", goodPlan)][Math.min(repairIndex++, 1)],
  });
  checks.planQualityRepairsOnce = repaired.modelCallCount === 2
    && repaired.toolResults.some(row => row.error === "PRESENTED_PLAN_QUALITY")
    && repaired.parsed?.plan?.steps?.length === 3
    && repaired.parsed?.planQuality?.ok === true
    && repaired.parsed?.planQuality?.repaired === true;
  let degradeIndex = 0;
  const degraded = await runNativeQueryLoop({
    ...loopInput,
    exactSessionId: "gcs_plan_degraded",
    callTurn: async () => presentTurn(degradeIndex++ === 0 ? "d1" : "d2", badPlan),
  });
  checks.planQualityAcceptsDegradedAfterRepair = degraded.modelCallCount === 2
    && degraded.toolResults.some(row => row.error === "PRESENTED_PLAN_QUALITY")
    && degraded.parsed?.planQuality?.ok === false
    && degraded.parsed?.planQuality?.repaired === true
    && Array.isArray(degraded.parsed?.plan?.steps);
  const passed = await runNativeQueryLoop({
    ...loopInput,
    exactSessionId: "gcs_plan_ok",
    callTurn: async () => presentTurn("ok1", goodPlan),
  });
  checks.planQualityPassesFirstShot = passed.modelCallCount === 1
    && passed.parsed?.planQuality?.ok === true
    && passed.parsed?.planQuality?.repaired !== true
    && !passed.toolResults.some(row => row.error === "PRESENTED_PLAN_QUALITY");
  const nativeCatalog = catalogToNativeTools({
    catalog: {
      loadedMcp: [
        { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read", inputSchema: { type: "object" } },
      ],
      mcp: [
        { name: "query_knowledge", canonicalName: "query_knowledge", server: "ccm-group-readonly", description: "kb", inputSchema: { type: "object" } },
      ],
      discoverableMcp: [
        { name: "read_git_status", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_git_status", server: "ccm__workspace_readonly", description: "git", inputSchema: { type: "object" } },
      ],
    },
  });
  checks.catalogEmitsDiscoveryTools = nativeCatalog.some(tool => tool.name === "tool_search")
    && nativeCatalog.some(tool => tool.name === "invoke_skill");
  checks.catalogUsesWorkspaceShortNames = nativeCatalog.some(tool => tool.name === "read_file" && tool.deferred !== true)
    && nativeCatalog.some(tool => tool.name === "read_git_status" && tool.deferred === true)
    && nativeCatalog.every(tool => !String(tool.name).includes("ccm_workspace_readonly"));
  checks.catalogIncludesGroupBuiltin = nativeCatalog.some(tool => tool.name === "query_knowledge" && tool.deferred !== true);
  return { pass: Object.values(checks).every(Boolean), checks, result };
}

