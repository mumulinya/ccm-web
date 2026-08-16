"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_CONTROL_TOOL_NAMES = void 0;
exports.isNativeControlTool = isNativeControlTool;
exports.nativeControlToolDefinitions = nativeControlToolDefinitions;
exports.catalogToNativeTools = catalogToNativeTools;
exports.shouldUseNativeQueryLoop = shouldUseNativeQueryLoop;
exports.mapNativeTurnToParsed = mapNativeTurnToParsed;
exports.unstreamedTurnText = unstreamedTurnText;
exports.mergeNativeTurnParsed = mergeNativeTurnParsed;
exports.runNativeQueryLoop = runNativeQueryLoop;
exports.runNativeQueryLoopSelfTest = runNativeQueryLoopSelfTest;
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const provider_native_tool_capability_1 = require("../system/provider-native-tool-capability");
const agent_loop_budget_1 = require("../system/agent-loop-budget");
const conversation_plan_mode_gate_1 = require("../system/conversation-plan-mode-gate");
const main_agent_turn_1 = require("./main-agent-turn");
const native_query_messages_1 = require("./native-query-messages");
const group_presented_plan_1 = require("../modules/collaboration/group-presented-plan");
exports.NATIVE_CONTROL_TOOL_NAMES = ["ccm_ask_user", "ccm_present_plan", "ccm_dispatch"];
const CONTROL_TOOL_SET = new Set(exports.NATIVE_CONTROL_TOOL_NAMES);
function isNativeControlTool(name) {
    return CONTROL_TOOL_SET.has(String(name || ""));
}
function nativeControlToolDefinitions() {
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
            description: `提交只读计划稿供用户确认。用户要求看计划、方案或步骤时必须调用本工具。${group_presented_plan_1.PRESENTED_PLAN_SHAPE_GUIDANCE}`,
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
            description: `派发项目 Agent 或创建开发任务。必须给出自包含工作单；未获用户执行授权时不要调用。${group_presented_plan_1.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE}`,
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
function catalogToNativeTools(toolContext) {
    const loaded = [...(toolContext?.catalog?.loadedMcp || toolContext?.catalog?.mcp || [])].map((tool) => ({ ...tool, deferred: false }));
    const discoverable = [...(toolContext?.catalog?.discoverableMcp || [])].map((tool) => ({ ...tool, deferred: true }));
    return [...loaded, ...discoverable].map((tool) => ({
        name: String(tool.canonicalName || tool.name || ""),
        description: String(tool.description || ""),
        inputSchema: tool.inputSchema || { type: "object", properties: {} },
        deferred: tool.deferred === true,
    })).filter((tool) => tool.name);
}
function shouldUseNativeQueryLoop(config) {
    if (config?.forceNativeQueryLoop === true)
        return true;
    if (String(config?.providerNativeToolsMode || config?.provider_native_tools_mode || "auto").toLowerCase() === "json")
        return false;
    const family = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai";
    return (0, provider_native_tool_capability_1.readProviderNativeToolCapability)(config, family)[0]?.status !== "unsupported";
}
function mapNativeTurnToParsed(turn, controlCalls = []) {
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
function mergeUsage(current, next) {
    if (!next)
        return current;
    if (!current)
        return next;
    return {
        inputTokens: Number(current.inputTokens || 0) + Number(next.inputTokens || 0),
        outputTokens: Number(current.outputTokens || 0) + Number(next.outputTokens || 0),
        totalTokens: Number(current.totalTokens || 0) + Number(next.totalTokens || 0),
        reported: current.reported !== false && next.reported !== false,
    };
}
function fingerprintCall(call) {
    return JSON.stringify({ name: call.name, arguments: call.arguments || {} });
}
function unstreamedTurnText(turnText, emitted) {
    const text = String(turnText || "");
    const already = String(emitted || "");
    if (!text.trim())
        return "";
    if (!already)
        return text;
    if (text.startsWith(already))
        return text.slice(already.length);
    return "";
}
function parsedReply(parsed) {
    return String(parsed?.reply || parsed?.friendlyResponse || parsed?.directResponse || "").trim();
}
function parsedPlan(parsed) {
    const plan = parsed?.plan;
    return plan && typeof plan === "object" ? plan : null;
}
function mergeNativeTurnParsed(previous, next) {
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
    const merged = {
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
async function runJsonQueryLoop(input) {
    const budget = input.loopBudget || (0, agent_loop_budget_1.resolveAgentLoopBudget)(input.config);
    let messages = input.messages.slice();
    const jsonHint = { role: "system", content: "退化路径：只输出一个 JSON 对象，不要 Markdown。格式：{\"responseType\":\"reply|tool_calls|clarify|plan|dispatch\",\"reply\":\"\",\"toolRequests\":[{\"name\":\"\",\"arguments\":{}}],\"workflowDecision\":{}}" };
    if (!messages.some(item => String(item.content || "").includes("退化路径：只输出一个 JSON")))
        messages = [jsonHint, ...messages];
    let parsed = { responseType: "reply", reply: "" };
    const toolResults = [];
    let modelCallCount = 0;
    let toolRoundCount = 0;
    let toolCallCount = 0;
    let noProgressCount = 0;
    let usage = null;
    let stopReason = "model_completed";
    const executed = new Set();
    while (true) {
        modelCallCount += 1;
        const jsonOptions = {
            messages,
            maxTokens: input.maxTokens || 4096,
            retryProfile: input.retryProfile,
            signal: input.signal,
            onDelta: input.onDelta,
            onUsage: (value) => { usage = mergeUsage(usage, value); input.onUsage?.(value); },
            onRetry: input.onRetry,
        };
        const nextParsed = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(input.config)
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(input.config, jsonOptions)
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(input.config, jsonOptions);
        parsed = mergeNativeTurnParsed(parsed, nextParsed);
        const requests = (Array.isArray(parsed?.toolRequests) ? parsed.toolRequests : Array.isArray(parsed?.tool_requests) ? parsed.tool_requests : [])
            .map((item, index) => ({
            id: `json_${toolRoundCount}_${index}`,
            name: String(item?.name || "").trim(),
            arguments: item?.arguments && typeof item.arguments === "object" ? item.arguments : {},
            argumentsChecksum: "",
        }))
            .filter((item) => item.name);
        if (!requests.length) {
            stopReason = "model_completed";
            break;
        }
        const fresh = requests.filter((item) => !executed.has(fingerprintCall(item)));
        if (!fresh.length) {
            noProgressCount += 1;
            messages.push({ role: "user", content: JSON.stringify({ error: "duplicate_tool_request" }) });
            if (noProgressCount >= budget.noProgressThreshold)
                throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
            toolRoundCount += 1;
            continue;
        }
        for (const item of fresh)
            executed.add(fingerprintCall(item));
        const rows = await input.executeTools(fresh, {
            round: toolRoundCount,
            turn: { text: String(parsed?.reply || ""), toolCalls: fresh, toolReferences: [], stopReason: "tool_calls", usage: usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } },
            signal: input.signal,
            startedCallIds: new Set(),
        });
        toolResults.push(...rows);
        toolCallCount += rows.length;
        messages.push({ role: "user", content: JSON.stringify({ toolResults: rows }) });
        toolRoundCount += 1;
        if (rows.some(row => row.ok === true))
            noProgressCount = 0;
        else
            noProgressCount += 1;
        if (noProgressCount >= budget.noProgressThreshold)
            throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
    }
    const decision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
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
        family: (0, native_query_messages_1.nativeQueryFamily)(input.config),
    };
}
function fallBackToJsonQueryLoop(input) {
    return input.jsonFallback ? input.jsonFallback() : runJsonQueryLoop(input);
}
async function runNativeQueryLoop(input) {
    if (!shouldUseNativeQueryLoop(input.config))
        return fallBackToJsonQueryLoop(input);
    const family = (0, native_query_messages_1.nativeQueryFamily)(input.config);
    const budget = input.loopBudget || (0, agent_loop_budget_1.resolveAgentLoopBudget)(input.config);
    const callTurn = input.callTurn || group_orchestrator_llm_client_1.callNativeAgentTurn;
    let messages = input.messages.slice();
    let parsed = { responseType: "reply", reply: "" };
    let lastTurn = { text: "", toolCalls: [], toolReferences: [], stopReason: "", usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } };
    const toolResults = [];
    const executed = new Set();
    let modelCallCount = 0;
    let toolRoundCount = 0;
    let toolCallCount = 0;
    let noProgressCount = 0;
    let continuationSegments = 0;
    let segmentToolCalls = 0;
    let segmentModelTurns = 0;
    let segmentStartedAt = Date.now();
    let stopReason = "model_completed";
    let usage = null;
    const isReadOnly = input.isReadOnly || ((call) => !isNativeControlTool(call.name) && call.name !== "invoke_skill" && call.name !== "tool_search");
    const applyTranscript = (next) => input.compactTranscript ? input.compactTranscript(next) : next;
    try {
        while (true) {
            const round = toolRoundCount;
            modelCallCount += 1;
            segmentModelTurns += 1;
            const started = new Map();
            const startedCallIds = new Set();
            const onNativeToolCallReady = (call) => {
                if (isNativeControlTool(call.name) || !isReadOnly(call) || started.has(call.id) || executed.has(fingerprintCall(call)))
                    return;
                startedCallIds.add(call.id);
                started.set(call.id, Promise.resolve().then(() => input.executeTools([call], {
                    round,
                    turn: lastTurn,
                    signal: input.signal,
                    startedCallIds,
                })).then(rows => rows[0] || { callId: call.id, name: call.name, ok: false, error: "empty_tool_result" }));
            };
            let turn;
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
                        if (!delta)
                            return;
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
            }
            catch (error) {
                if (error?.code === "CCM_NATIVE_TOOLS_UNSUPPORTED")
                    return fallBackToJsonQueryLoop(input);
                throw error;
            }
            lastTurn = turn;
            const unstreamed = unstreamedTurnText(turn.text, turnEmitted);
            if (unstreamed)
                input.onDelta?.(unstreamed);
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
                    parsed = mergeNativeTurnParsed(parsed, (0, conversation_plan_mode_gate_1.applyConversationPlanModeToRound)({
                        enabled: true,
                        parsed,
                        requests: controlCalls.map(item => ({ name: item.name, arguments: item.arguments })),
                        isReadOnly: (request) => request.name === "ccm_ask_user" || request.name === "ccm_present_plan",
                    }).parsed);
                }
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, controlCalls.map(item => ({
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
                const duplicate = {
                    callId: `loop_control_${round}`,
                    name: "loop_control",
                    ok: false,
                    error: "NATIVE_QUERY_LOOP_DUPLICATE_REQUEST",
                    reason: "相同工具和参数已经执行，请基于已有结果完成回答或改用控制工具。",
                };
                toolResults.push(duplicate);
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, [duplicate], family));
                if (noProgressCount >= budget.noProgressThreshold) {
                    stopReason = "no_progress";
                    throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
                }
                toolRoundCount += 1;
                continue;
            }
            const planModeRound = (0, conversation_plan_mode_gate_1.applyConversationPlanModeToRound)({
                enabled: input.planModeEnabled === true,
                parsed: mapNativeTurnToParsed(turn, controlCalls),
                requests: fresh.map(item => ({ name: item.name, arguments: item.arguments, id: item.id })),
                isReadOnly: (request) => {
                    const call = fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
                        || { name: request.name, arguments: request.arguments, id: "", argumentsChecksum: "" };
                    return isReadOnly(call);
                },
            });
            parsed = mergeNativeTurnParsed(parsed, planModeRound.parsed);
            if (planModeRound.stopLoop) {
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, planModeRound.blockedResults.map((row, index) => ({
                    callId: fresh[index]?.id || `blocked_${index}`,
                    name: String(row.name || "unknown"),
                    ok: false,
                    error: row.error,
                    reason: row.reason,
                })), family));
                stopReason = "plan_mode_held";
                break;
            }
            const runnable = planModeRound.requests.map((request) => {
                return fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
                    || { id: request.id || `call_${toolCallCount}`, name: request.name, arguments: request.arguments || {}, argumentsChecksum: "" };
            });
            const remaining = [...started.entries()].filter(([id]) => runnable.some(item => item.id === id));
            const pending = runnable.filter(item => !started.has(item.id));
            const blockedResults = (planModeRound.blockedResults || []).map((row, index) => ({
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
                ...(pending.length ? await input.executeTools(pending, { round, turn, signal: input.signal, startedCallIds }) : []),
                ...blockedResults,
            ];
            toolResults.push(...executedRows);
            toolCallCount += executedRows.filter(row => row.name !== "loop_control").length;
            segmentToolCalls += executedRows.filter(row => row.name !== "loop_control").length;
            messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, [
                ...executedRows,
                ...controlCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { deferred: "control_after_tools" } })),
            ], family));
            if (executedRows.some(row => row.ok === true))
                noProgressCount = 0;
            else
                noProgressCount += 1;
            if (noProgressCount >= budget.noProgressThreshold) {
                stopReason = "no_progress";
                throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
            }
            if (controlCalls.length || input.shouldStopAfterTools?.(runnable, executedRows)) {
                parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls));
                if (input.planModeEnabled)
                    parsed = (0, conversation_plan_mode_gate_1.holdConversationPlanModeParsed)(parsed);
                stopReason = "model_completed";
                break;
            }
            toolRoundCount += 1;
            const continuation = (0, agent_loop_budget_1.shouldContinueAgentLoop)({
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
    }
    catch (error) {
        if (!Number(error.observationCount)) {
            error.observationCount = toolResults.filter(row => row.name && row.name !== "loop_control").length;
        }
        throw error;
    }
    const decision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
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
async function runNativeQueryLoopSelfTest() {
    const calls = [];
    const turns = [
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
    const flushed = [];
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
        secondTurnHasAssistantToolCalls: secondMessages.some((item) => item?.role === "assistant" && Array.isArray(item.tool_calls) && item.tool_calls[0]?.id === "call_1"),
        secondTurnHasToolResult: secondMessages.some((item) => item?.role === "tool" && item.tool_call_id === "call_1"),
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
    };
    const keptTurns = [
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
    const keptClarify = mergeNativeTurnParsed({ responseType: "clarify", questionForUser: "核销方式？", dispatchPolicy: { action: "ask_user" }, workflowDecision: { structuredClarificationQuestions: [{ label: "核销方式" }] }, reply: "核销方式？" }, { responseType: "reply", reply: "我先确认 3 个关键范围" });
    checks.keepClarifyAcrossTextFollowup = keptClarify.responseType === "clarify" && keptClarify.dispatchPolicy?.action === "ask_user";
    return { pass: Object.values(checks).every(Boolean), checks, result };
}
//# sourceMappingURL=native-query-loop.js.map