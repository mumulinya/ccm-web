"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_SESSION_RESUME_HINT = void 0;
exports.shouldMaterializeNativeSessionTranscript = shouldMaterializeNativeSessionTranscript;
exports.splitNativeSystemSegments = splitNativeSystemSegments;
exports.buildNativeMetaUserMessage = buildNativeMetaUserMessage;
exports.materializeNativeSessionTranscript = materializeNativeSessionTranscript;
exports.lastNativeUserText = lastNativeUserText;
exports.inspectNativeResumePayload = inspectNativeResumePayload;
exports.runNativeSessionTranscriptSelfTest = runNativeSessionTranscriptSelfTest;
const native_query_messages_1 = require("./native-query-messages");
const native_query_loop_1 = require("./native-query-loop");
const context_source_tool_result_projection_1 = require("../system/context-source-tool-result-projection");
const tool_result_storage_1 = require("../tools/tool-result-storage");
exports.NATIVE_SESSION_RESUME_HINT = "精确会话原生续写已启用。上一轮正文、计划卡片和工具结果已在 messages 中；未变化的文件不要重读。以下参考材料不一定与当前句相关。";
const SKIP_REPLAY_TOOLS = new Set(["ccm_dispatch"]);
const PLAN_TOOLS = new Set(["ccm_present_plan"]);
const CONTROL_SKIP_TOOLS = new Set(["ccm_ask_user", "ccm_dispatch"]);
function stripCurrentUserLabel(text) {
    return String(text || "").replace(/^【用户当前目标】\s*/, "").trim();
}
function asText(value) {
    if (value == null)
        return "";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
function messageId(item) {
    return String(item?.id || item?.uuid || item?.messageId || "").trim();
}
function messageRole(item) {
    return String(item?.role || "").toLowerCase();
}
function messageContent(item) {
    const value = item?.content ?? item?.text ?? item?.message?.content ?? "";
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return value.map((part) => {
            if (typeof part === "string")
                return part;
            if (part?.type === "text")
                return String(part.text || "");
            return "";
        }).join("");
    }
    return asText(value);
}
function presentedPlanFrom(value) {
    const plan = value?.presentedPlan || value?.presented_plan || value?.plan;
    if (plan && typeof plan === "object" && Array.isArray(plan.steps) && plan.steps.length)
        return plan;
    return null;
}
function replacementMapFrom(value) {
    const map = new Map();
    if (!value)
        return map;
    if (value instanceof Map) {
        for (const [id, text] of value) {
            if (id && text)
                map.set(String(id), String(text));
        }
        return map;
    }
    if (Array.isArray(value)) {
        for (const row of value) {
            const id = String(row?.toolCallId || "").trim();
            const text = String(row?.projectedText || "").trim();
            if (id && text)
                map.set(id, text);
        }
        return map;
    }
    for (const [id, text] of Object.entries(value)) {
        if (id && text)
            map.set(id, String(text));
    }
    return map;
}
function toolUseArguments(event) {
    const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
    if (payload.arguments && typeof payload.arguments === "object")
        return payload.arguments;
    return payload;
}
function toolResultOutput(event, options) {
    if (options.cleared.has(event.toolCallId))
        return tool_result_storage_1.TOOL_RESULT_CLEARED_MESSAGE;
    const payload = event?.payload;
    const persisted = (0, tool_result_storage_1.isPersistedToolResult)(payload)
        ? payload
        : (0, tool_result_storage_1.isPersistedToolResult)(payload?.observation)
            ? payload.observation
            : null;
    if (persisted)
        return (0, tool_result_storage_1.modelVisiblePersistedToolResult)(persisted);
    if (options.replaced.has(event.toolCallId))
        return options.replaced.get(event.toolCallId);
    const projected = (0, context_source_tool_result_projection_1.projectContextSourceToolResultForPersistence)(event?.toolName, payload);
    if ((0, context_source_tool_result_projection_1.isWorkspaceToolResultReference)(projected))
        return projected;
    let output = payload ?? null;
    if (payload && typeof payload === "object") {
        if (payload.observation !== undefined) {
            const inner = (0, context_source_tool_result_projection_1.projectContextSourceToolResultForPersistence)(event?.toolName, payload.observation);
            if ((0, context_source_tool_result_projection_1.isWorkspaceToolResultReference)(inner))
                return inner;
            output = payload.observation;
        }
        else if (payload.error) {
            output = { ok: false, error: payload.error };
        }
    }
    if (options.persistContext?.scope && options.persistContext?.sessionId) {
        (0, tool_result_storage_1.markToolResultSeenUnreplaced)(options.persistContext, event.toolCallId);
    }
    return output;
}
function pairExecutionEvents(events) {
    const uses = new Map();
    const results = new Map();
    for (const event of Array.isArray(events) ? events : []) {
        if (event.type === "tool_use")
            uses.set(event.toolCallId, event);
        if (event.type === "tool_result")
            results.set(event.toolCallId, event);
    }
    const pairs = [];
    for (const [id, use] of uses) {
        const result = results.get(id);
        if (!result)
            continue;
        if (SKIP_REPLAY_TOOLS.has(use.toolName) || SKIP_REPLAY_TOOLS.has(result.toolName))
            continue;
        pairs.push({ use, result });
    }
    return pairs.sort((left, right) => String(left.use.timestamp || "").localeCompare(String(right.use.timestamp || "")));
}
function turnFromPair(pair, options) {
    const args = toolUseArguments(pair.use);
    const call = {
        id: pair.use.toolCallId,
        name: pair.use.toolName,
        arguments: args,
        argumentsChecksum: "",
    };
    return {
        turn: {
            text: "",
            toolCalls: [call],
            toolReferences: [],
            stopReason: "tool_calls",
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false },
        },
        results: [{
                callId: pair.result.toolCallId,
                name: pair.result.toolName,
                ok: pair.result.status !== "error",
                output: toolResultOutput(pair.result, options),
                error: pair.result.status === "error" ? asText(pair.result.payload?.error || pair.result.payload) : undefined,
            }],
    };
}
function shouldMaterializeNativeSessionTranscript(config, sessionId) {
    const id = String(sessionId || "").trim();
    if (!id)
        return false;
    return (0, native_query_loop_1.shouldUseNativeQueryLoop)(config);
}
function splitNativeSystemSegments(input) {
    const messages = [];
    const identity = String(input.identityRules || "").trim();
    if (identity)
        messages.push({ role: "system", content: identity });
    const guidance = String(input.sessionGuidance || "").trim();
    if (guidance)
        messages.push({ role: "system", content: guidance });
    const mcp = String(input.mcpPolicy || "").trim();
    if (mcp)
        messages.push({ role: "system", contextBlockType: "mcp", content: mcp });
    return messages;
}
function buildNativeMetaUserMessage(blocks, extra = []) {
    const parts = [
        exports.NATIVE_SESSION_RESUME_HINT,
        ...extra.filter(Boolean),
        ...(Array.isArray(blocks) ? blocks : []).filter(block => String(block?.body || "").trim()).map(block => `【${block.title}】\n${String(block.body).trim()}`),
    ].filter(Boolean);
    if (!parts.length)
        return null;
    return { role: "user", content: parts.join("\n\n"), isMeta: true };
}
function materializeNativeSessionTranscript(input) {
    const family = input.family || "openai";
    const conversation = (Array.isArray(input.conversation) ? input.conversation : [])
        .filter(item => ["user", "assistant"].includes(messageRole(item)))
        .filter(item => item?.hidden_execution !== true && item?.modelVisible !== false && item?.model_visible !== false);
    const pairs = pairExecutionEvents(input.executionEvents);
    const projectionOptions = {
        cleared: new Set(Array.from(input.clearedToolCallIds || []).map(id => String(id || "").trim()).filter(Boolean)),
        replaced: replacementMapFrom(input.replacedToolResults),
        persistContext: input.persistContext || null,
    };
    const planMetas = [];
    const seenPlan = new Set();
    const collectPlan = (plan, summary = "") => {
        if (!plan)
            return;
        const body = JSON.stringify({
            title: plan.title || "已有计划稿",
            goal: plan.goal || "",
            steps: plan.steps,
            summary: String(summary || "").slice(0, 1500),
        });
        if (seenPlan.has(body))
            return;
        seenPlan.add(body);
        planMetas.push({ title: "已有计划稿", body });
    };
    if (input.presentedPlan)
        collectPlan(input.presentedPlan);
    const remaining = pairs.slice();
    let messages = [];
    for (const item of conversation) {
        const role = messageRole(item);
        const content = messageContent(item).trim();
        const id = messageId(item);
        if (role === "user") {
            if (content)
                messages.push({ role: "user", content });
            const attached = [];
            for (let index = remaining.length - 1; index >= 0; index -= 1) {
                const pair = remaining[index];
                if (id && pair.use.anchorMessageId && pair.use.anchorMessageId !== id)
                    continue;
                if (id && pair.use.anchorMessageId === id) {
                    attached.unshift(pair);
                    remaining.splice(index, 1);
                }
            }
            if (!id) {
                while (remaining.length)
                    attached.push(remaining.shift());
            }
            for (const pair of attached) {
                if (PLAN_TOOLS.has(pair.use.toolName)) {
                    collectPlan(toolUseArguments(pair.use)?.plan || toolUseArguments(pair.use), content);
                    continue;
                }
                if (CONTROL_SKIP_TOOLS.has(pair.use.toolName))
                    continue;
                const mapped = turnFromPair(pair, projectionOptions);
                messages = (0, native_query_messages_1.appendNativeTurnTranscript)(messages, mapped.turn, mapped.results, family);
            }
            continue;
        }
        collectPlan(presentedPlanFrom(item), content);
        if (content)
            messages.push({ role: "assistant", content });
    }
    for (const pair of remaining) {
        if (PLAN_TOOLS.has(pair.use.toolName)) {
            collectPlan(toolUseArguments(pair.use)?.plan || toolUseArguments(pair.use));
            continue;
        }
        if (CONTROL_SKIP_TOOLS.has(pair.use.toolName))
            continue;
        const mapped = turnFromPair(pair, projectionOptions);
        messages = (0, native_query_messages_1.appendNativeTurnTranscript)(messages, mapped.turn, mapped.results, family);
    }
    const current = String(input.currentUserText || "").trim();
    if (current) {
        const last = messages.at(-1);
        const lastText = String(last?.content || "").trim();
        if (last?.role === "user" && (lastText === current || stripCurrentUserLabel(lastText) === stripCurrentUserLabel(current))) {
            messages = messages.slice(0, -1);
        }
    }
    const extras = [];
    if (input.canonicalSummary != null && String(input.canonicalSummary || "").trim()) {
        extras.push(`【当前精确会话压缩摘要】\n${typeof input.canonicalSummary === "string" ? input.canonicalSummary : JSON.stringify(input.canonicalSummary)}`);
    }
    const meta = buildNativeMetaUserMessage([
        ...planMetas,
        ...(Array.isArray(input.metaBlocks) ? input.metaBlocks : []),
    ], extras);
    if (meta && (messages.length || planMetas.length || extras.length || (input.metaBlocks || []).length)) {
        messages.push(meta);
    }
    if (current)
        messages.push({ role: "user", content: current });
    return messages;
}
function lastNativeUserText(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.role === "user" && !messages[index].isMeta)
            return String(messages[index].content || "").trim();
    }
    return "";
}
function inspectNativeResumePayload(messages, currentUserText) {
    const system = (Array.isArray(messages) ? messages : []).filter(item => item?.role === "system");
    const latestUser = lastNativeUserText(messages);
    const serialized = JSON.stringify(messages);
    const systemText = JSON.stringify(system);
    const latestUserMessage = [...messages].reverse().find(item => item?.role === "user" && !item.isMeta);
    const latestUserText = String(latestUserMessage?.content || "");
    return {
        lastUserIsCurrent: latestUser === String(currentUserText || "").trim(),
        systemHasNoSessionDump: !/【压缩前完整会话原文】|exact_session_context|"prior_steps"\s*:/.test(systemText),
        latestUserHasNoSessionDump: !/【压缩前完整会话原文】|exact_session_context|"prior_steps"\s*:/.test(latestUserText),
        hasNativeToolCall: messages.some((item) => item?.role === "assistant" && (item?.tool_calls?.[0]?.id || (Array.isArray(item?.content) && item.content.some((part) => part?.type === "tool_use")))),
        hasNativeToolResult: messages.some((item) => item?.role === "tool" || (Array.isArray(item?.content) && item.content.some((part) => part?.type === "tool_result"))),
        noPendingPresentPlan: serialized.includes("ccm_present_plan") === false,
        serialized,
    };
}
function sampleReadFilesEvents(anchorMessageId, body) {
    return [
        {
            id: "use-files",
            type: "tool_use",
            toolCallId: "call_read_files",
            toolName: "read_files",
            timestamp: "2026-01-01T00:00:01.200Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId,
            status: "running",
            hidden: true,
            payload: { arguments: { paths: ["src/app.ts"] } },
        },
        {
            id: "res-files",
            type: "tool_result",
            toolCallId: "call_read_files",
            toolName: "read_files",
            timestamp: "2026-01-01T00:00:02.200Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId,
            status: "ok",
            hidden: true,
            payload: {
                observation: {
                    schema: "ccm-workspace-tool-envelope-v3",
                    toolContractVersion: 3,
                    modelPayload: {
                        type: "text_batch",
                        files: [{ path: "src/app.ts", lines: [{ line: 1, text: body }] }],
                    },
                },
            },
        },
    ];
}
function sampleReadFileEvents(anchorMessageId) {
    return [
        {
            id: "use-1",
            type: "tool_use",
            toolCallId: "call_read",
            toolName: "read_file",
            timestamp: "2026-01-01T00:00:01.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId,
            status: "running",
            hidden: true,
            payload: { arguments: { path: "README.md" } },
        },
        {
            id: "res-1",
            type: "tool_result",
            toolCallId: "call_read",
            toolName: "read_file",
            timestamp: "2026-01-01T00:00:02.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId,
            status: "ok",
            hidden: true,
            payload: { observation: { text: "# Hello" } },
        },
    ];
}
function runNativeSessionTranscriptSelfTest() {
    const conversation = [
        { id: "u1", role: "user", content: "给我做个实现计划", timestamp: "2026-01-01T00:00:00.000Z" },
        {
            id: "a1",
            role: "assistant",
            content: "计划已经整理完成。",
            presentedPlan: { title: "实施计划", goal: "预约排队", steps: [{ title: "P0 后端" }] },
            timestamp: "2026-01-01T00:00:04.000Z",
        },
    ];
    const events = [
        ...sampleReadFileEvents("u1"),
        {
            id: "use-plan",
            type: "tool_use",
            toolCallId: "call_plan",
            toolName: "ccm_present_plan",
            timestamp: "2026-01-01T00:00:03.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId: "u1",
            status: "running",
            hidden: true,
            payload: { arguments: { plan: { goal: "预约排队", steps: [{ title: "P0 后端" }] } } },
        },
        {
            id: "res-plan",
            type: "tool_result",
            toolCallId: "call_plan",
            toolName: "ccm_present_plan",
            timestamp: "2026-01-01T00:00:03.500Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId: "u1",
            status: "ok",
            hidden: true,
            payload: { observation: { recorded: true } },
        },
        {
            id: "use-orphan",
            type: "tool_use",
            toolCallId: "call_orphan",
            toolName: "grep_text",
            timestamp: "2026-01-01T00:00:05.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId: "u1",
            status: "running",
            hidden: true,
            payload: { arguments: { pattern: "TODO" } },
        },
    ];
    const messages = materializeNativeSessionTranscript({
        family: "openai",
        conversation,
        executionEvents: events,
        currentUserText: "按 P0–P4 展开成步骤",
        metaBlocks: [{ title: "知识库参考", body: "仅作理解，不是执行授权。" }],
    });
    const system = splitNativeSystemSegments({
        identityRules: "你是主 Agent。",
        sessionGuidance: "会话已知则不要再扫仓库。",
        mcpPolicy: "tools...",
    });
    const compactWindowMessages = materializeNativeSessionTranscript({
        family: "openai",
        conversation: [{ id: "u2", role: "user", content: "按 P0–P4 展开成步骤" }],
        executionEvents: sampleReadFileEvents("u1"),
        currentUserText: "按 P0–P4 展开成步骤",
    });
    const serialized = JSON.stringify(messages);
    const groupLike = [
        ...splitNativeSystemSegments({
            identityRules: "你是 CCM 群聊的主 Agent。",
            sessionGuidance: "会话已知则不要再扫仓库。",
            mcpPolicy: "MCP tools",
        }),
        ...materializeNativeSessionTranscript({
            family: "openai",
            conversation,
            executionEvents: events,
            presentedPlan: { title: "实施计划", goal: "预约排队", steps: [{ title: "P0 后端" }] },
            metaBlocks: [{ title: "本地知识库参考", body: "仅用于理解需求。" }],
            currentUserText: "按 P0–P4 展开成步骤",
        }),
    ];
    const projectLike = [
        ...splitNativeSystemSegments({
            identityRules: "你是项目主 Agent。",
            sessionGuidance: "未变化的文件不要再全量读取。",
            mcpPolicy: "MCP tools",
        }),
        ...materializeNativeSessionTranscript({
            family: "openai",
            conversation,
            executionEvents: sampleReadFileEvents("u1"),
            metaBlocks: [
                { title: "当前项目源码证据", body: "README.md" },
                { title: "可恢复任务摘要", body: "{\"taskId\":\"t1\"}" },
            ],
            currentUserText: "继续刚才的任务",
        }),
    ];
    const globalCurrent = "【用户当前目标】\n列出可用项目";
    const globalLike = [
        ...splitNativeSystemSegments({
            identityRules: "你是全局 Agent。",
            sessionGuidance: "prior_steps 里已经出现过的观察不要再当新证据。",
            mcpPolicy: "MCP tools",
        }),
        ...materializeNativeSessionTranscript({
            family: "openai",
            conversation: [{ id: "u1", role: "user", content: "列出可用项目" }],
            executionEvents: sampleReadFileEvents("u1"),
            metaBlocks: [{ title: "当前运行状态", body: JSON.stringify({ run: { remaining_steps: 8 } }) }],
            currentUserText: globalCurrent,
        }),
    ];
    const groupInspect = inspectNativeResumePayload(groupLike, "按 P0–P4 展开成步骤");
    const projectInspect = inspectNativeResumePayload(projectLike, "继续刚才的任务");
    const globalInspect = inspectNativeResumePayload(globalLike, globalCurrent);
    const bulkyBody = "READ_FILES_BODY_MUST_NOT_REPLAY";
    const bulkyMessages = materializeNativeSessionTranscript({
        family: "openai",
        conversation: [{ id: "u1", role: "user", content: "这是什么项目" }],
        executionEvents: sampleReadFilesEvents("u1", bulkyBody),
        currentUserText: "再确认一下技术栈",
    });
    const bulkySerialized = JSON.stringify(bulkyMessages);
    const checks = {
        lastUserIsCurrent: lastNativeUserText(messages) === "按 P0–P4 展开成步骤",
        hasNativeToolCall: messages.some((item) => item?.role === "assistant" && item?.tool_calls?.[0]?.id === "call_read"),
        hasNativeToolResult: messages.some((item) => item?.role === "tool" && item?.tool_call_id === "call_read"),
        noSessionJsonDump: serialized.includes("【压缩前完整会话原文】") === false,
        noPendingPresentPlan: serialized.includes("ccm_present_plan") === false,
        droppedUnpairedToolUse: serialized.includes("call_orphan") === false,
        planInMeta: serialized.includes("已有计划稿") && serialized.includes("P0 后端"),
        resumeHintPresent: serialized.includes("精确会话原生续写已启用"),
        systemHasThreeSegments: system.length === 3 && system[2].role === "system",
        systemHasNoHistory: JSON.stringify(system).includes("给我做个实现计划") === false,
        compactWindowKeepsToolPair: compactWindowMessages.some((item) => item?.role === "assistant" && item?.tool_calls?.[0]?.id === "call_read")
            && compactWindowMessages.some((item) => item?.role === "tool" && item?.tool_call_id === "call_read")
            && lastNativeUserText(compactWindowMessages) === "按 P0–P4 展开成步骤",
        groupAssembly: groupInspect.lastUserIsCurrent && groupInspect.systemHasNoSessionDump && groupInspect.latestUserHasNoSessionDump && groupInspect.hasNativeToolCall && groupInspect.noPendingPresentPlan,
        projectAssembly: projectInspect.lastUserIsCurrent && projectInspect.systemHasNoSessionDump && projectInspect.latestUserHasNoSessionDump && JSON.stringify(projectLike).includes("当前项目源码证据"),
        globalAssembly: globalInspect.lastUserIsCurrent && globalInspect.systemHasNoSessionDump && globalInspect.latestUserHasNoSessionDump && JSON.stringify(globalLike.at(-1)).includes("\"prior_steps\"") === false,
        nativeFamilyHelper: (0, native_query_messages_1.nativeQueryFamily)({ format: "openai-compatible" }) === "openai",
        jsonModeSkipped: shouldMaterializeNativeSessionTranscript({ providerNativeToolsMode: "json" }, "gcs_x") === false,
        emptySessionSkipped: shouldMaterializeNativeSessionTranscript({ forceNativeQueryLoop: true }, "") === false,
        forcedNativeMaterialize: shouldMaterializeNativeSessionTranscript({ forceNativeQueryLoop: true }, "gcs_x") === true,
        readFilesReplayUsesReceipt: bulkyMessages.some((item) => item?.role === "tool" && item?.tool_call_id === "call_read_files")
            && bulkySerialized.includes("ccm-workspace-tool-result-reference-v1")
            && bulkySerialized.includes(bulkyBody) === false
            && bulkySerialized.includes("text_batch") === false,
        nativeAppliesMicroCompact: true,
    };
    const microEvents = [
        {
            id: "use-grep",
            type: "tool_use",
            toolCallId: "call_grep_old",
            toolName: "grep_text",
            timestamp: "2026-01-01T00:00:01.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId: "u1",
            status: "running",
            hidden: true,
            payload: { arguments: { pattern: "TODO" } },
        },
        {
            id: "res-grep",
            type: "tool_result",
            toolCallId: "call_grep_old",
            toolName: "grep_text",
            timestamp: "2026-01-01T00:00:02.000Z",
            runId: "run-1",
            traceId: "t1",
            anchorMessageId: "u1",
            status: "ok",
            hidden: true,
            payload: { observation: { lines: ["keep-raw-in-ledger"] } },
        },
    ];
    const microMessages = materializeNativeSessionTranscript({
        family: "openai",
        conversation: [{ id: "u1", role: "user", content: "继续" }],
        executionEvents: microEvents,
        currentUserText: "继续",
        clearedToolCallIds: ["call_grep_old"],
    });
    const microSerialized = JSON.stringify(microMessages);
    checks.nativeAppliesMicroCompact = microSerialized.includes("[Old tool result content cleared]")
        && microSerialized.includes("keep-raw-in-ledger") === false
        && JSON.stringify(microEvents[1].payload).includes("keep-raw-in-ledger");
    return { pass: Object.values(checks).every(Boolean), checks, messages, system };
}
//# sourceMappingURL=native-session-transcript.js.map