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
exports.decomposeRequirementWithCodedCoordinator = void 0;
exports.mergeLlmTokenUsage = mergeLlmTokenUsage;
exports.isGroupMainReadOnlyMcpTool = isGroupMainReadOnlyMcpTool;
exports.buildGroupMainAgentToolContext = buildGroupMainAgentToolContext;
exports.normalizeGroupMainToolRequests = normalizeGroupMainToolRequests;
exports.executeGroupMainAgentToolRequests = executeGroupMainAgentToolRequests;
exports.attachLlmTokenUsage = attachLlmTokenUsage;
exports.runLlmCoordinatorSummary = runLlmCoordinatorSummary;
exports.runLlmCoordinatorReview = runLlmCoordinatorReview;
exports.decomposeRequirementWithModelCoordinator = decomposeRequirementWithModelCoordinator;
exports.buildLlmCoordinatorMessages = buildLlmCoordinatorMessages;
exports.buildLlmCoordinatorContextComponents = buildLlmCoordinatorContextComponents;
exports.normalizeDocumentFindings = normalizeDocumentFindings;
exports.enrichTaskWithDocumentFindings = enrichTaskWithDocumentFindings;
exports.sanitizeLlmTargets = sanitizeLlmTargets;
exports.normalizeLlmAnalysis = normalizeLlmAnalysis;
exports.buildCoordinatorResultFromAnalysis = buildCoordinatorResultFromAnalysis;
exports.runLlmGroupOrchestrator = runLlmGroupOrchestrator;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const context_budget_1 = require("../../system/context-budget");
const agent_loop_budget_1 = require("../../system/agent-loop-budget");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const assistant_progress_1 = require("../../system/assistant-progress");
const model_activity_1 = require("../../system/model-activity");
const slash_command_session_state_1 = require("../../system/slash-command-session-state");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
const user_visible_agent_projections_1 = require("../../system/user-visible-agent-projections");
const session_context_tool_buckets_1 = require("../../system/session-context-tool-buckets");
const transient_model_content_1 = require("../../system/transient-model-content");
const role_skills_1 = require("../../skills/role-skills");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const native_query_loop_1 = require("../../agents/native-query-loop");
const cc_tool_result_limits_1 = require("../../tools/cc-tool-result-limits");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const main_agent_context_policy_1 = require("../../tools/main-agent-context-policy");
const workflow_decision_1 = require("../../agents/workflow-decision");
const main_agent_turn_1 = require("../../agents/main-agent-turn");
const group_native_query_adapter_1 = require("./group-native-query-adapter");
const main_agent_identity_1 = require("../../agents/main-agent-identity");
const knowledge_access_1 = require("../knowledge/knowledge-access");
const test_agent_review_policy_1 = require("./test-agent-review-policy");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_orchestrator_config_1 = require("./group-orchestrator-config");
const rework_policy_1 = require("./rework-policy");
const group_orchestrator_routing_1 = require("./group-orchestrator-routing");
const group_orchestrator_prompts_1 = require("./group-orchestrator-prompts");
const group_coordinator_visible_reply_1 = require("./group-coordinator-visible-reply");
const group_presented_plan_1 = require("./group-presented-plan");
const group_prior_plan_context_1 = require("./group-prior-plan-context");
const group_coordinator_native_messages_1 = require("./group-coordinator-native-messages");
const group_orchestrator_coded_1 = require("./group-orchestrator-coded");
function mergeLlmTokenUsage(...values) {
    const usages = values.filter(value => value && typeof value === "object");
    if (!usages.length)
        return null;
    const inputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.inputTokens || value.input_tokens || 0) || 0)), 0);
    const outputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.outputTokens || value.output_tokens || 0) || 0)), 0);
    if (inputTokens <= 0 && outputTokens <= 0)
        return null;
    const directInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.directInputTokens || value.direct_input_tokens || 0) || 0)), 0);
    const cacheCreationInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.cacheCreationInputTokens || value.cache_creation_input_tokens || 0) || 0)), 0);
    const cacheReadInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.cacheReadInputTokens || value.cache_read_input_tokens || 0) || 0)), 0);
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, reported: true, directInputTokens, cacheCreationInputTokens, cacheReadInputTokens };
}
const GROUP_MAIN_BUILTIN_TOOLS = [
    {
        canonicalName: "query_knowledge",
        name: "query_knowledge",
        server: "ccm-group-readonly",
        description: "按当前群聊及成员项目授权范围查询知识库。",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        annotations: { readOnlyHint: true },
    },
];
function isGroupMainReadOnlyMcpTool(tool) {
    return (0, main_agent_tool_runtime_1.isMainAgentReadOnlyMcpTool)(tool);
}
function buildGroupMainAgentToolContext(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    const orchestratorConfig = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const contextPolicy = (0, main_agent_context_policy_1.resolveMainAgentContextPolicy)(orchestratorConfig, group?.context_policy || group?.contextPolicy || {});
    const selectedRoleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", input.message, {
        source: input.source || "",
        phase: "planning",
        selectedSkillNames: input.workflowDecision?.selectedSkills || [],
        modelDecision: input.workflowDecision || null,
        planAuthoring: (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group?.id || ""), String(input.groupSessionId || input.group_session_id || "")),
    });
    const shared = (0, main_agent_tool_runtime_1.buildMainAgentToolRuntimeContext)({
        configuredTools: group?.tools || {},
        executionSkills: selectedRoleSkills.names,
        mcpPolicy: "read_only",
        label: "群聊主 Agent",
        auditContext: {
            runtime: "group-main-agent",
            project: (0, group_orchestrator_routing_1.getCoordinatorMember)(group)?.project || "",
            groupId: String(group?.id || ""),
            source: String(input.source || "group-main-planning"),
        },
        scopeIdentity: {
            scope: "group",
            scopeId: String(group?.id || ""),
            exactSessionId: String(input.groupSessionId || input.group_session_id || `group-main:${group?.id || "unknown"}`),
            allowedProjects: (0, group_orchestrator_routing_1.getRoutableMembers)(group).map((member) => String(member?.project || "")).filter(Boolean),
        },
        loadedToolNames: input.loadedMainAgentTools || [],
        contextPolicy: contextPolicy.effective,
        contextWindow: (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(orchestratorConfig).contextWindow,
        currentUserInput: input.message,
        schemaSurface: (0, native_query_loop_1.shouldUseNativeQueryLoop)(orchestratorConfig) ? "native" : "prompt",
    });
    const schemaSurface = shared.schemaSurface === "native" ? "native" : "prompt";
    const builtinNames = new Set(GROUP_MAIN_BUILTIN_TOOLS.map(tool => tool.canonicalName));
    const mcp = [
        ...GROUP_MAIN_BUILTIN_TOOLS,
        ...shared.catalog.mcp.filter((tool) => !builtinNames.has(String(tool?.canonicalName || ""))),
    ];
    const loadedMcp = [
        ...GROUP_MAIN_BUILTIN_TOOLS,
        ...(shared.catalog.loadedMcp || []).filter((tool) => !builtinNames.has(String(tool?.canonicalName || ""))),
    ];
    const builtinPrompt = [
        "群聊主 Agent内置只读工具：",
        ...GROUP_MAIN_BUILTIN_TOOLS.map(tool => (0, main_agent_tool_runtime_1.renderMainAgentToolCatalogLine)(tool, schemaSurface)),
    ].join("\n");
    return {
        ...shared,
        catalog: { ...shared.catalog, mcp, loadedMcp },
        mcpPrompt: [builtinPrompt, shared.mcpPrompt].filter(Boolean).join("\n\n"),
        policyPrompt: [builtinPrompt, shared.policyPrompt].filter(Boolean).join("\n\n"),
        group,
        message: input.message,
        groupSessionId: input.groupSessionId || input.group_session_id || "",
        anchorMessageId: input.anchorMessageId || input.anchor_message_id || "",
        selectedRoleSkills,
        contextPolicy,
        contextBudget: shared.contextBudget,
    };
}
function normalizeGroupMainToolRequests(value) {
    return (0, main_agent_tool_runtime_1.normalizeMainAgentToolRequests)(value);
}
async function executeGroupMainAgentToolRequests(input) {
    const batchSize = Math.max(1, Math.min(8, Math.floor(Number(input.toolBatchSize || 2))));
    const readOnlyParallelism = Math.max(1, Math.min(8, Math.floor(Number(input.readOnlyParallelism || 2))));
    // Preserve every logical request from the model turn. `batchSize` controls
    // concurrency only; truncating here made the third project invisible when a
    // group contained more projects than the default batch size.
    const requests = input.requests.slice(0, 32);
    const preparedIds = new Map(requests.map((request, index) => [request, String(input.toolCallIds?.[index] || "")]));
    const executeOne = async (request, parallelGroupId = "") => {
        const groupId = String(input.toolContext?.group?.id || "");
        const exactSessionId = String(input.toolContext?.groupSessionId || input.toolContext?.group_session_id || "");
        const generation = Math.max(0, Number(input.toolContext?.scopeIdentity?.generation || 0));
        const anchorMessageId = String(input.toolContext?.anchorMessageId || input.toolContext?.anchor_message_id || "").trim();
        const toolCallId = preparedIds.get(request) || `gmtool_${crypto.createHash("sha256").update(JSON.stringify({ groupId, exactSessionId, name: request.name, arguments: request.arguments, at: Date.now(), nonce: crypto.randomBytes(4).toString("hex") })).digest("hex").slice(0, 24)}`;
        const startedAt = Date.now();
        if (groupId && exactSessionId)
            (0, user_visible_agent_events_1.appendToolProjection)({
                scope: "group", scopeId: groupId, exactSessionId, generation,
                ...(anchorMessageId ? { anchorMessageId } : {}),
                eventType: "tool_started", toolName: request.name, toolCallId,
                arguments: request.arguments || {}, parallelGroupId: parallelGroupId || undefined,
                display: { summary: request.reason || "正在执行" },
            });
        const isBuiltin = GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === request.name);
        let row;
        if (!isBuiltin) {
            try {
                const rows = await (0, main_agent_tool_runtime_1.executeMainAgentToolRequests)({
                    ...input,
                    requests: [request],
                    resultTokenLimit: cc_tool_result_limits_1.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS,
                    toolBatchSize: 1,
                    readOnlyParallelism,
                    abortSignal: input.signal,
                });
                row = rows[0];
            }
            catch (error) {
                row = { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: String(error?.message || error).slice(0, 1000), reason: request.reason };
            }
        }
        else {
            try {
                let rawOutput;
                if (request.name === "query_knowledge") {
                    const projects = (0, group_orchestrator_routing_1.getRoutableMembers)(input.toolContext.group).map((member) => ({ name: String(member?.project || "") })).filter((item) => item.name);
                    rawOutput = await (0, knowledge_access_1.searchAgentKnowledge)(String(request.arguments?.query || input.toolContext.message || ""), {
                        role: "group-main-agent",
                        groupId: String(input.toolContext.group?.id || ""),
                        projects,
                    }, { limit: 6, continuityIdentity: { agentKind: "group", scope: "group", scopeId: String(input.toolContext.group?.id || ""), exactSessionId: String(input.toolContext.groupSessionId || ""), generation: Number(input.toolContext.scopeIdentity?.generation || 0) } });
                }
                else
                    throw new Error(`未知群聊内置工具：${request.name}`);
                const modelOutput = { context: rawOutput.context, citations: rawOutput.citations, retrievalMode: rawOutput.embeddingMode, indexGeneration: rawOutput.indexGeneration };
                const output = JSON.stringify(modelOutput);
                const outputTokens = (0, context_budget_1.estimateTextTokens)(output);
                row = outputTokens > cc_tool_result_limits_1.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS
                    ? { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: cc_tool_result_limits_1.GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR, outputTokens, reason: request.reason }
                    : { name: request.name, itemName: request.name, toolKind: "internal_mcp", source: "ccm__knowledge_context", scope: "group", loaded: true, durationMs: Date.now() - startedAt, ok: true, output, rawOutput, outputTokens, resultChecksum: crypto.createHash("sha256").update(output).digest("hex"), reason: request.reason };
            }
            catch (error) {
                row = { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: String(error?.message || error).slice(0, 1000), reason: request.reason };
            }
        }
        if (groupId && exactSessionId)
            (0, user_visible_agent_events_1.appendToolProjection)({
                scope: "group", scopeId: groupId, exactSessionId, generation,
                ...(anchorMessageId ? { anchorMessageId } : {}),
                eventType: row?.ok === false ? "tool_failed" : "tool_completed",
                toolName: request.name, toolCallId, arguments: request.arguments || {},
                result: row, error: row?.ok === false ? row?.error || "工具执行失败" : "",
                durationMs: Number(row?.durationMs || Date.now() - startedAt), outputTokens: Number(row?.outputTokens || 0),
                parallelGroupId: parallelGroupId || undefined,
                display: { summary: row?.ok === false ? row?.error || "工具执行失败" : "执行完成" },
            });
        return { ...row, toolCallId };
    };
    const isSafeReadOnly = (request) => {
        if (GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === request.name))
            return true;
        if (["tool_search", "invoke_skill"].includes(request.name))
            return false;
        const catalog = [
            ...(input.toolContext?.catalog?.mcp || []),
            ...(input.toolContext?.catalog?.loadedMcp || []),
        ];
        return (0, main_agent_tool_runtime_1.isMainAgentReadOnlyMcpTool)(catalog.find((tool) => request.name === tool?.canonicalName || request.name === tool?.name));
    };
    const rows = [];
    for (let index = 0; index < requests.length;) {
        if (!isSafeReadOnly(requests[index])) {
            rows.push(await executeOne(requests[index]));
            index += 1;
            continue;
        }
        const readBatch = [];
        while (index < requests.length && isSafeReadOnly(requests[index]) && readBatch.length < Math.min(readOnlyParallelism, batchSize)) {
            readBatch.push(requests[index]);
            index += 1;
        }
        const parallelGroupId = readBatch.length > 1
            ? `group-parallel:${String(input.toolContext?.groupSessionId || input.toolContext?.group_session_id || "session")}:${Date.now()}:${index - readBatch.length}`
            : "";
        rows.push(...await Promise.all(readBatch.map(request => executeOne(request, parallelGroupId))));
    }
    return rows.map(row => row.error === "MAIN_AGENT_TOOL_NOT_AUTHORIZED"
        ? { ...row, error: "GROUP_MAIN_TOOL_NOT_AUTHORIZED" }
        : row.error === "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED"
            ? { ...row, error: "GROUP_MAIN_TOOL_SCHEMA_NOT_LOADED" }
            : row.error === cc_tool_result_limits_1.MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR || row.error === "MAIN_AGENT_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET"
                ? { ...row, error: cc_tool_result_limits_1.GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR }
                : row);
}
function attachLlmTokenUsage(error, usage) {
    if (error && usage)
        error.usage = mergeLlmTokenUsage(error.usage, usage);
    return error;
}
// 优化2：LLM 驱动的智能汇总
async function runLlmCoordinatorSummary(group, userMessage, outputs, options = {}) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const configIssue = (0, group_orchestrator_routing_1.getLlmConfigIssue)(config);
    if (configIssue)
        return null; // 配置不完整时回退到模板汇总
    const coordinator = (0, group_orchestrator_routing_1.getCoordinatorMember)(group);
    const validOutputs = (outputs || []).filter(Boolean);
    if (validOutputs.length === 0)
        return null;
    const startedAt = Date.now();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const anthropic = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config);
    let tokenUsage = null;
    const captureTokenUsage = (usage) => {
        tokenUsage = mergeLlmTokenUsage(tokenUsage, usage);
        if (groupSessionId.startsWith("gcs_")) {
            try {
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({ groupId: group.id, groupSessionId, source: "group_main_summary", provider: anthropic ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai", model: config.model, usage });
            }
            catch { }
        }
    };
    const childReplies = validOutputs.map((text, i) => `--- 子 Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2000)}`).join("\n\n");
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", userMessage, { forceWork: true, phase: "summary" });
    const system = `你是 CCM 群聊的主 Agent（协调者）。子 Agent 已经以 <task-notification> 形式回复了用户的需求，请你做一个简洁的汇总。

要求：
1. 提取各子 Agent 的核心结论，用 1-3 句话概括每个 Agent 的回复要点
2. 如果子 Agent 之间有冲突或不一致，明确指出
3. 给出下一步建议或需要用户决策的事项
4. 不要重复子 Agent 的全部内容，只做摘要
5. 语气友好自然，像团队 leader 做总结
6. <task-notification>、CCM_AGENT_RECEIPT、trace、session、scratchpad 等是内部技术信号，不要出现在给用户的正文里；请改写成“子 Agent 结果、结果说明、验证证据、技术详情”等用户能看懂的说法

直接输出汇总文本，不要输出 JSON。${roleSkills.prompt ? `\n\n${roleSkills.prompt}` : ""}`;
    const user = `用户原始需求：${String(userMessage).slice(0, 500)}\n\n以下是各子 Agent 的 task-notification / 回复：\n${childReplies}\n\n请输出汇总。`;
    try {
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const content = anthropic
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, { messages, system, maxTokens: 1000, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { messages, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage });
        const summary = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(content, "主 Agent 已收到子 Agent 的结果，正在整理下一步。", 1200);
        if (!summary.trim()) {
            (0, db_1.recordMetric)(coordinator.project, { success: false, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage, error: "主 Agent 汇总返回空内容" });
            return null;
        }
        (0, db_1.recordMetric)(coordinator.project, { success: true, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage });
        return {
            agent: coordinator.project,
            content: `📋 **协调汇总**\n\n${summary}`,
        };
    }
    catch (err) {
        console.error("[LLM汇总] 调用失败:", err.message);
        (0, db_1.recordMetric)(coordinator.project, { success: false, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage, error: err?.message || String(err) });
        return null; // 回退到模板汇总
    }
}
async function runLlmCoordinatorReview(group, userMessage, coordinatorPlan, outputs, options = {}) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const configIssue = (0, group_orchestrator_routing_1.getLlmConfigIssue)(config);
    if (configIssue)
        return null;
    const normalized = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(group);
    const coordinator = (0, group_orchestrator_routing_1.getCoordinatorMember)(normalized);
    const allowed = new Map((0, group_orchestrator_routing_1.getRoutableMembers)(normalized).map((m) => [m.project, m]));
    const validOutputs = (outputs || []).filter(Boolean);
    if (validOutputs.length === 0)
        return null;
    const startedAt = Date.now();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const anthropic = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config);
    let tokenUsage = null;
    const captureTokenUsage = (usage) => {
        tokenUsage = mergeLlmTokenUsage(tokenUsage, usage);
        if (groupSessionId.startsWith("gcs_")) {
            try {
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({ groupId: group.id, groupSessionId, source: "group_main_review", provider: anthropic ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai", model: config.model, usage });
            }
            catch { }
        }
    };
    const allowFollowUps = options.allowFollowUps !== false;
    const round = Math.max(1, Number(options.round || 1));
    const maxRounds = Math.max(round, Number(options.maxRounds || rework_policy_1.AUTO_REWORK_MAX_ROUNDS));
    const requiresCodeChanges = options.requiresCodeChanges !== false;
    const requiresVerification = options.requiresVerification !== false;
    const childReplies = validOutputs
        .map((text, i) => `--- 子 Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2400)}`)
        .join("\n\n");
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", userMessage, { forceWork: true, phase: "review" });
    const system = `你是 CCM 群聊的主 Agent（工作协调者）。你已经把用户需求分派给项目 Agent，现在要像项目负责人一样复盘子 Agent 的回复。

当前是第 ${round}/${maxRounds} 轮验收；${allowFollowUps ? "如果证据不足，可以继续派发返工任务。" : "本轮不能再派发返工任务，必须给出最终结论或向用户提出具体问题。"}${roleSkills.prompt ? `\n\n${roleSkills.prompt}` : ""}

本任务的最新门禁配置（优先级高于历史会话中的旧要求）：
- 必须产生代码/文件变更：${requiresCodeChanges ? "是" : "否；不得因为 filesChanged 为空判定缺口"}
- 必须执行项目验证命令：${requiresVerification ? "是" : "否；不得因为未运行、无法运行或缺少 npm test/build 等命令判定缺口"}

你不是代码执行 Agent，不写代码，不假装完成没有证据的工作。按本轮注入的复核与返工 Skill 判断完成度、冲突、缺口和后续动作。
- 需要补充时只能在 followUps 中派发自包含返工工作单；已经满足时给出最终协调结论；需要用户决策时提出一个具体问题。
- 给用户看的 summary、gaps、conflicts、checks.detail/evidence、userQuestion 不得出现 <task-notification>、CCM_AGENT_RECEIPT、trace、session、scratchpad 等内部协议词；这些只用于内部判断，输出时改写成“子 Agent 结果、结构化结果说明、验证证据、技术详情”。

验收门禁：
- 优先读取每个 Worker 的 <task-notification>：task-id 表示 Worker，status 表示 completed/failed/blocked/partial/missing_receipt，receipt-status 表示 CCM_AGENT_RECEIPT 状态，result 是 Worker 结果摘要。
- 优先读取每个子 Agent 回复末尾的 CCM_AGENT_RECEIPT / “结构化回执”摘要。
- 如果某个被派发的 Agent 缺少结构化回执，或回执 status 不是 done，或没有提供实际动作/验证证据，通常不能判定 complete。
- ${requiresCodeChanges ? "对代码修改类任务，必须看到修改点/文件或明确说明未修改；否则在 gaps 里指出。" : "本任务允许无文件变更；只需核对任务约定的可验收产出。"}
- ${requiresVerification ? "必须看到符合任务要求的实际验证证据。" : "本任务已关闭强制验证门禁，不得追问项目测试命令。"}
- 对依赖任务，后续 Agent 的结论必须引用或吸收前置 Agent 的结论；否则指出依赖未闭环。
- 对接口文档、业务文档、需求文档或 PRD 驱动的任务，必须检查子 Agent 是否覆盖了被分派的接口契约、字段、业务规则、页面/交互、验收标准；缺少文档条目对应的实现/确认/验证证据时不能判定 complete。
- 不要把“已建议”“可以修改”“应该检查”当成已完成。

只能返回 JSON 对象，不要 Markdown，不要解释。

允许追问的项目 Agent：
${(0, group_orchestrator_coded_1.buildAllowedProjectBrief)(normalized) || "- 无"}

JSON 格式：
{
  "schema_version": 1,
  "status": "complete | needs_followup | needs_user",
  "verdict": "pass | blocked | needs_user",
  "decision": { "can_complete": true, "reason": "为什么可以完成或不能完成" },
  "summary": "给用户看的最终或阶段性协调结论，必须包含已确认结论、已完成/未完成事项、风险和验证建议",
  "checks": [
    { "id": "worker_receipt | actual_changes | verification | dependency | user_scope", "label": "检查项", "status": "pass | fail | warn", "detail": "检查结论", "evidence": ["证据"] }
  ],
  "worker_reviews": [
    { "project": "项目 Agent 名称", "receipt_status": "done | partial | blocked | failed | missing", "trusted": true, "completed_scope": ["已完成范围"], "gaps": ["缺口"], "verification": ["验证证据"] }
  ],
  "gaps": ["仍缺少的信息或证据"],
  "conflicts": ["子 Agent 之间冲突或不一致的地方"],
  "followUps": [
    {
      "project": "必须是允许追问的项目 Agent 名称",
      "summary": "5-10 个字/词的追问预览，给用户和任务卡展示，例如：补齐前端验证证据",
      "task": "继续追问这个项目 Agent 的明确任务，包含要补充的证据/修改/验证",
      "reason": "为什么需要继续追问"
    }
  ],
  "userQuestion": "如果需要用户补充，写一个具体问题；否则空字符串",
  "confidence": 0.0
}`;
    const user = `用户原始需求：
${String(userMessage || "").slice(0, 1200)}

主 Agent 初始安排：
${String(coordinatorPlan || "").slice(0, 1600)}

子 Agent task-notification / 回复：
${childReplies}

是否允许继续追问子 Agent：${allowFollowUps ? "允许" : "不允许，本轮必须输出最终总结或用户问题"}

  请输出 JSON。`;
    try {
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const content = anthropic
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, { messages, system, maxTokens: 1400, temperature: 0.2, defaultTimeoutMs: 30000, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { messages, temperature: 0.2, defaultTimeoutMs: 30000, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage });
        const parsed = (0, group_orchestrator_llm_client_1.extractJsonObject)(content);
        if (!parsed)
            throw new Error("主 Agent 复盘未返回有效 JSON");
        const followUpContext = {
            gaps: parsed.gaps,
            conflicts: parsed.conflicts,
            checks: parsed.checks,
            workerReviews: parsed.worker_reviews || parsed.workerReviews,
        };
        const followUps = allowFollowUps && Array.isArray(parsed.followUps)
            ? parsed.followUps
                .map((item) => {
                const project = String(item?.project || "").trim();
                if (!allowed.has(project))
                    return null;
                const task = String(item?.task || "").trim();
                if (!task)
                    return null;
                const reason = String(item?.reason || "").trim();
                const summary = (0, group_orchestrator_prompts_1.buildCoordinatorFollowUpSummary)(item, task, reason, project);
                const normalizedTask = (0, group_orchestrator_prompts_1.normalizeCoordinatorFollowUpTask)(item, task, reason, project, followUpContext);
                return {
                    mention: `@${project}`,
                    targetName: project,
                    message: normalizedTask.message,
                    reason,
                    summary,
                    quality: normalizedTask.quality,
                };
            })
                .filter(Boolean)
            : [];
        const status = followUps.length > 0 ? "needs_followup" : String(parsed.status || "complete");
        const summary = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(parsed.summary, "主 Agent 已完成阶段复盘，正在根据结果判断是否需要继续处理。", 1200);
        const gaps = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(parsed.gaps, "仍有子 Agent 结果说明或验证证据需要补齐。", 360, 20);
        const conflicts = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(parsed.conflicts, "子 Agent 之间存在需要主 Agent 复核的不一致结论。", 360, 20);
        const userQuestion = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(parsed.userQuestion, "", 360);
        const checks = Array.isArray(parsed.checks) ? parsed.checks.map((item) => ({
            id: String(item?.id || "").trim(),
            label: String(item?.label || item?.id || "检查项").trim(),
            status: ["pass", "fail", "warn"].includes(String(item?.status || "")) ? String(item.status) : "warn",
            detail: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(item?.detail, "", 360),
            evidence: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(item?.evidence, "", 260, 10),
        })).filter((item) => item.id || item.detail || item.evidence.length) : [];
        const workerReviews = Array.isArray(parsed.worker_reviews || parsed.workerReviews) ? (parsed.worker_reviews || parsed.workerReviews).map((item) => ({
            project: String(item?.project || item?.agent || "").trim(),
            receipt_status: String(item?.receipt_status || item?.receiptStatus || item?.status || "missing").trim(),
            trusted: item?.trusted !== false,
            completed_scope: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(item?.completed_scope || item?.completedScope, "", 260, 12),
            gaps: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(item?.gaps, "结果说明或验证证据需要补齐。", 260, 12),
            verification: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserList)(item?.verification, "", 220, 12),
        })).filter((item) => item.project || item.receipt_status !== "missing" || item.gaps.length || item.verification.length) : [];
        const decision = parsed.decision && typeof parsed.decision === "object" ? {
            can_complete: parsed.decision.can_complete !== false && parsed.decision.canComplete !== false,
            reason: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(parsed.decision.reason, summary, 500),
        } : { can_complete: status === "complete" && !gaps.length && !conflicts.length && !userQuestion && !followUps.length, reason: summary };
        const verdict = ["pass", "blocked", "needs_user"].includes(String(parsed.verdict || ""))
            ? String(parsed.verdict)
            : status === "complete" && decision.can_complete ? "pass" : userQuestion ? "needs_user" : "blocked";
        const structuredReview = {
            schema_version: Number(parsed.schema_version || parsed.schemaVersion || 1),
            verdict,
            decision,
            summary,
            checks,
            worker_reviews: workerReviews,
            follow_ups: followUps.map((item) => ({
                project: item.targetName || item.project || "",
                summary: item.summary || "",
                reason: (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(item.reason, "", 260),
                quality: item.quality || null,
            })),
            gaps,
            conflicts,
            user_question: userQuestion,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        };
        const lines = ["📋 **协调复盘**", ""];
        if (summary)
            lines.push(summary);
        if (conflicts.length)
            lines.push("", `冲突/不一致：${conflicts.join("；")}`);
        if (gaps.length)
            lines.push("", `缺口/风险：${gaps.join("；")}`);
        if (userQuestion)
            lines.push("", `需要你确认：${userQuestion}`);
        if (followUps.length) {
            lines.push("", "我会继续追问：");
            for (const item of followUps) {
                const preview = item.summary ? `${item.summary}：` : "";
                lines.push(`@${item.targetName} ${preview}${(0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(item.message, "请补齐结果说明、实际变更和验证证据。", 320)}`);
            }
        }
        (0, db_1.recordMetric)(coordinator.project, {
            success: true,
            durationMs: Date.now() - startedAt,
            scopeType: "group",
            groupId: normalized.id,
            role: "main_agent",
            source: "coordinator-review",
            runtime: "llm-api",
            traceId: options.traceId || "",
            taskId: options.taskId || "",
            executionId: options.executionId || "",
            usage: tokenUsage,
        });
        return {
            agent: coordinator.project,
            status,
            followUps,
            gaps,
            conflicts,
            content: lines.join("\n").trim(),
            confidence: structuredReview.confidence,
            structured_review: structuredReview,
        };
    }
    catch (err) {
        console.error("[LLM复盘] 调用失败:", err.message);
        (0, db_1.recordMetric)(coordinator.project, {
            success: false,
            durationMs: Date.now() - startedAt,
            scopeType: "group",
            groupId: normalized.id,
            role: "main_agent",
            source: "coordinator-review",
            runtime: "llm-api",
            traceId: options.traceId || "",
            taskId: options.taskId || "",
            executionId: options.executionId || "",
            usage: tokenUsage,
            error: err?.message || String(err),
        });
        return null;
    }
}
async function decomposeRequirementWithModelCoordinator(group, requirement) {
    const result = await runLlmGroupOrchestrator({
        group,
        message: requirement,
        source: "group-requirement-decompose",
        extraInstructions: "这是显式需求分解请求。请只依据完整语义和群成员职责生成结构化 assignments；不要使用关键词或规则路由。信息不足时返回 clarificationQuestions，不得猜测目标。",
    });
    const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
    if (!assignments.length) {
        const questions = result?.workflowDecision?.clarificationQuestions || result?.analysis?.missingInfo || [];
        throw new Error(questions.length ? `需求分解需要补充：${questions.join("；")}` : "模型未生成可执行需求分解，未创建本地替代任务");
    }
    return assignments.map((item, index) => ({
        title: String(item.title || `${item.project || item.target_project || `任务 ${index + 1}`} 需求`).trim(),
        description: String(item.task || item.description || requirement).trim(),
        target_project: String(item.project || item.target_project || "").trim(),
        priority: String(item.priority || "normal").trim(),
        estimated_time: String(item.estimated_time || "由项目 Agent 评估").trim(),
        selected_skill_names: result?.workflowDecision?.selectedSkills || [],
    })).filter((item) => item.target_project);
}
// Compatibility alias for extensions compiled against the previous public name.
exports.decomposeRequirementWithCodedCoordinator = decomposeRequirementWithModelCoordinator;
function buildLlmCoordinatorMessages(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    // 优化3：共享文件上下文注入
    const sharedFilesPart = input.sharedFilesContext ? `\n\n当前群聊共享文件：\n${input.sharedFilesContext}` : "";
    const ragPart = input.ragContext ? `\n\n当前本地知识库参考（主 Agent 自动检索，仅用于理解需求、直接回答或提炼子 Agent 工作单；不要把它当作用户授权执行）：\n${input.ragContext}` : "";
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
    const planAuthoring = (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group?.id || ""), groupSessionId);
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", input.message, {
        source: input.source || "",
        phase: "planning",
        selectedSkillNames: input.workflowDecision?.selectedSkills || [],
        modelDecision: input.workflowDecision || null,
        planAuthoring,
    });
    const mainAgentTools = buildGroupMainAgentToolContext(input);
    const toolResults = Array.isArray(input.mainAgentToolResults)
        ? input.mainAgentToolResults
        : Array.isArray(input.main_agent_tool_results) ? input.main_agent_tool_results : [];
    const sessionGuidance = (0, main_agent_identity_1.buildGroupMainSessionGuidance)({ planAuthoring });
    const identityRules = (0, main_agent_identity_1.buildGroupMainIdentityRules)({
        projectBrief: (0, group_orchestrator_coded_1.buildAllowedProjectBrief)(group),
        extraInstructions: input.extraInstructions,
        roleSkillsPrompt: roleSkills.prompt,
        planAuthoring,
        sessionDirective: (0, slash_command_session_state_1.renderSlashCommandSessionDirective)("group", String(group?.id || ""), groupSessionId),
    });
    const nativeMessages = (0, group_coordinator_native_messages_1.tryBuildGroupNativeCoordinatorMessages)({
        group,
        message: input.message,
        groupSessionId,
        sharedFilesContext: input.sharedFilesContext,
        ragContext: input.ragContext,
        identityRules,
        sessionGuidance,
        mcpPolicy: mainAgentTools.policyPrompt,
        mainAgentToolResults: toolResults,
    });
    if (nativeMessages)
        return nativeMessages;
    const priorPlanBlock = (0, group_prior_plan_context_1.formatPriorGroupPlanBlock)((0, group_prior_plan_context_1.extractPriorGroupPlanDraft)(input.context));
    const system = `${identityRules}

${sessionGuidance}${sharedFilesPart}${ragPart}`;
    const user = `群聊最近上下文：
${input.context || "无"}
${priorPlanBlock ? `\n${priorPlanBlock}\n` : ""}
用户最新消息：
${input.message}

当前 Run 已有工作流决定（主 Agent首轮为空，工具续轮沿用上一轮）：
${JSON.stringify(input.workflowDecision || null)}

请根据完整语义决定：直接回复、调用只读工具、ccm_ask_user、ccm_present_plan 或 ccm_dispatch。用户要看计划、方案或步骤时必须调用 ccm_present_plan。若最近上下文已能回答当前消息且不是要计划，优先直接回复。`;
    return (0, transient_model_content_1.attachTransientModelBlocks)([
        { role: "system", content: system },
        ...(mainAgentTools.policyPrompt
            ? [{ role: "system", contextBlockType: "mcp", content: mainAgentTools.policyPrompt }]
            : []),
        { role: "user", content: user },
    ], (0, transient_model_content_1.collectTransientModelBlocks)(toolResults));
}
function buildLlmCoordinatorContextComponents(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", input.message, {
        source: input.source || "",
        phase: "planning",
        selectedSkillNames: input.workflowDecision?.selectedSkills || [],
        modelDecision: input.workflowDecision || null,
        planAuthoring: (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group?.id || ""), String(input.groupSessionId || input.group_session_id || "")),
    });
    const mainAgentTools = buildGroupMainAgentToolContext(input);
    const toolResults = Array.isArray(input.mainAgentToolResults)
        ? input.mainAgentToolResults
        : Array.isArray(input.main_agent_tool_results) ? input.main_agent_tool_results : [];
    return {
        rules: [workflow_decision_1.WORKFLOW_DECISION_GUIDANCE, input.extraInstructions || ""].filter(Boolean).join("\n\n"),
        skills: [roleSkills.prompt || "", mainAgentTools.skillPrompt].filter(Boolean).join("\n\n"),
        mcpTools: (0, session_context_tool_buckets_1.selectUserMcpToolDefinitions)(mainAgentTools.catalog?.mcp || mainAgentTools.catalog?.loadedMcp || []),
        subagentDefinitions: (0, group_orchestrator_coded_1.buildAllowedProjectBrief)(group),
        loadedContextItems: (0, main_agent_tool_runtime_1.buildMainAgentLoadedContextItems)(mainAgentTools, toolResults, roleSkills.selected.map((skill) => ({
            name: skill.name,
            loadLevel: "body",
            checksum: crypto.createHash("sha256").update(String(skill.body || "")).digest("hex"),
        }))),
    };
}
function normalizeDocumentFindings(parsed) {
    return Array.isArray(parsed?.documentFindings)
        ? parsed.documentFindings.map((x) => String(x).trim()).filter(Boolean)
        : [];
}
function normalizeArchitecturePlan(parsed, sourceEvidence, targets) {
    const raw = parsed?.architecturePlan || parsed?.architecture_plan || {};
    const evidenceProjects = new Map((Array.isArray(sourceEvidence?.projects) ? sourceEvidence.projects : [])
        .map((project) => [
        String(project?.project || ""),
        new Set((Array.isArray(project?.selected_paths) ? project.selected_paths : []).map((value) => String(value || ""))),
    ]));
    const targetProjects = new Set((targets || []).map((target) => String(target?.member?.project || target?.project || "")).filter(Boolean));
    const citations = (Array.isArray(raw?.sourceCitations || raw?.source_citations) ? (raw.sourceCitations || raw.source_citations) : [])
        .map((citation) => {
        const project = String(citation?.project || "").trim();
        const allowedPaths = evidenceProjects.get(project) || new Set();
        const paths = (Array.isArray(citation?.paths) ? citation.paths : [])
            .map((value) => String(value || "").trim())
            .filter((value) => allowedPaths.has(value))
            .slice(0, 12);
        return project && paths.length ? {
            project,
            paths,
            reason: (0, group_orchestrator_prompts_1.compactText)(citation?.reason || "", 300),
        } : null;
    })
        .filter(Boolean);
    for (const project of targetProjects) {
        if (citations.some((citation) => citation.project === project))
            continue;
        const paths = Array.from(evidenceProjects.get(project) || []).slice(0, 8);
        if (paths.length)
            citations.push({
                project,
                paths,
                reason: "主 Agent规划使用的当前源码证据",
            });
    }
    const dependencySteps = (Array.isArray(raw?.dependencySteps || raw?.dependency_steps) ? (raw.dependencySteps || raw.dependency_steps) : [])
        .map((step, index) => ({
        id: (0, group_orchestrator_prompts_1.compactText)(step?.id || `step_${index + 1}`, 80),
        title: (0, group_orchestrator_prompts_1.compactText)(step?.title || step?.label || "", 220),
        project: (0, group_orchestrator_prompts_1.compactText)(step?.project || "", 120),
        dependsOn: Array.isArray(step?.dependsOn || step?.depends_on)
            ? (step.dependsOn || step.depends_on).map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 80)).filter(Boolean).slice(0, 12)
            : [],
        acceptance: Array.isArray(step?.acceptance)
            ? step.acceptance.map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 300)).filter(Boolean).slice(0, 8)
            : [],
    }))
        .filter((step) => step.title);
    if (!dependencySteps.length) {
        for (const [index, target] of (targets || []).entries()) {
            const project = String(target?.member?.project || target?.project || "");
            dependencySteps.push({
                id: `step_${index + 1}`,
                title: (0, group_orchestrator_prompts_1.compactText)(target?.reason || `完成 ${project} 项目工作项`, 220),
                project,
                dependsOn: target?.dependsOn ? [String(target.dependsOn)] : [],
                acceptance: Array.isArray(parsed?.reasoning?.verificationAssertions)
                    ? parsed.reasoning.verificationAssertions.map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 300)).filter(Boolean).slice(0, 8)
                    : [],
            });
        }
    }
    const boundaries = Array.isArray(raw?.boundaries)
        ? raw.boundaries.map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 300)).filter(Boolean).slice(0, 16)
        : [];
    if (!boundaries.length) {
        for (const project of targetProjects)
            boundaries.push(`${project} 仅修改本项目工作单范围，跨项目契约由主 Agent统一协调`);
    }
    const dataRelationships = Array.isArray(raw?.dataRelationships || raw?.data_relationships)
        ? (raw.dataRelationships || raw.data_relationships).map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 500)).filter(Boolean).slice(0, 20)
        : [];
    if (!dataRelationships.length && Array.isArray(parsed?.reasoning?.dependencyRationale)) {
        dataRelationships.push(...parsed.reasoning.dependencyRationale.map((value) => (0, group_orchestrator_prompts_1.compactText)(value, 500)).filter(Boolean).slice(0, 20));
    }
    return {
        schema: "ccm-group-main-architecture-plan-v1",
        goal: (0, group_orchestrator_prompts_1.compactText)(raw?.goal || parsed?.summary || "", 800),
        boundaries,
        dataRelationships,
        dependencySteps,
        sourceCitations: citations,
        sourceSnapshotChecksum: String(sourceEvidence?.checksum || ""),
        sourceReady: sourceEvidence?.ready === true,
    };
}
function groupRequirementPlanProjection(input) {
    const architecture = input.architecturePlan || {};
    const acceptanceRows = Array.isArray(input.analysis?.acceptanceEvidencePlan)
        ? input.analysis.acceptanceEvidencePlan.map((item) => item?.criterion || item?.observableOutcome).filter(Boolean)
        : [];
    const deliverables = Array.isArray(input.analysis?.deliverables) ? input.analysis.deliverables : [];
    return {
        planId: input.planId,
        revision: Math.max(1, Number(input.revision || 1)),
        title: "需求实施计划",
        goal: architecture.goal || input.analysis?.summary || "按当前需求完成涉及项目的实现与验收。",
        steps: (Array.isArray(architecture.dependencySteps) ? architecture.dependencySteps : []).map((step, index) => ({
            id: step.id || `step_${index + 1}`,
            title: step.title || `实施步骤 ${index + 1}`,
            description: step.title || "完成当前阶段的业务实现。",
            outcome: Array.isArray(step.acceptance) ? step.acceptance[0] || "完成后进入下一阶段。" : "完成后进入下一阶段。",
            project: step.project || input.projects[index] || "",
            dependsOn: step.dependsOn || [],
            status: "pending",
        })),
        scope: input.projects,
        expectedResults: [...deliverables, ...acceptanceRows],
        exclusions: architecture.boundaries || [],
        status: input.status || "executing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
function enrichTaskWithDocumentFindings(task, findings) {
    const text = String(task || "").trim();
    if (!findings.length)
        return text;
    if (/文档依据|引用文档|接口文档|业务文档|需求文档|PRD|附件/.test(text))
        return text;
    const brief = findings.slice(0, 6).map(item => `- ${(0, group_orchestrator_prompts_1.compactText)(item, 180)}`).join("\n");
    return `${text}\n\n文档依据/验收关注：\n${brief}`;
}
function sanitizeLlmTargets(group, parsed, message, fallbackAnalysis, allowRuleRepair = false, dispatchContext = null) {
    void allowRuleRepair;
    const allowed = new Map((0, group_orchestrator_routing_1.getRoutableMembers)(group).map((m) => [m.project, m]));
    const rawTargets = Array.isArray(parsed?.targets) ? parsed.targets : [];
    const documentFindings = (0, group_orchestrator_coded_1.mergeDocumentFindings)(normalizeDocumentFindings(parsed), fallbackAnalysis?.documentFindings);
    const taskAnalysis = {
        ...fallbackAnalysis,
        documentFindings,
        summary: String(parsed?.summary || fallbackAnalysis?.summary || ""),
        deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables : fallbackAnalysis?.deliverables,
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints : fallbackAnalysis?.constraints,
        missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo : fallbackAnalysis?.missingInfo,
        coordinationStrategy: String(parsed?.coordinationStrategy || fallbackAnalysis?.coordinationStrategy || (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(fallbackAnalysis, rawTargets.length)),
    };
    const seen = new Set();
    const targets = [];
    for (const target of rawTargets) {
        const project = String(target?.project || "").trim();
        if (!allowed.has(project) || seen.has(project))
            continue;
        const enrichedTask = enrichTaskWithDocumentFindings(String(target?.task || "").trim() || message, documentFindings);
        const permissionPlan = {
            requestedOperations: Array.isArray(target?.permissionPlan?.requestedOperations) ? target.permissionPlan.requestedOperations.map((item) => String(item).slice(0, 300)).slice(0, 12) : [],
            userApprovalRequired: Array.isArray(target?.permissionPlan?.userApprovalRequired) ? target.permissionPlan.userApprovalRequired.map((item) => String(item).slice(0, 300)).slice(0, 12) : [],
        };
        const baseTask = (0, group_orchestrator_coded_1.buildSelfContainedWorkerTask)(project, enrichedTask, taskAnalysis, {
            group,
            reason: target?.reason || "LLM 主 Agent 根据需求理解和项目职责派发",
            dependsOn: target?.dependsOn || "",
            coordinationStrategy: taskAnalysis.coordinationStrategy,
        });
        const task = [
            baseTask,
            permissionPlan.requestedOperations.length || permissionPlan.userApprovalRequired.length ? [
                "权限计划（不能替代实际租约）：",
                ...permissionPlan.requestedOperations.map((item) => `- 主 Agent 可审批候选：${item}`),
                ...permissionPlan.userApprovalRequired.map((item) => `- 必须等待用户审批：${item}`),
                "实际执行前仍必须调用 ccm__permission_broker 权限工具。",
            ].join("\n") : "",
        ].filter(Boolean).join("\n\n");
        targets.push({
            member: allowed.get(project),
            task,
            reason: String(target?.reason || "").trim(),
            dependsOn: String(target?.dependsOn || "").trim(),
            permissionPlan,
        });
        seen.add(project);
    }
    const presentedPlan = dispatchContext?.presentedPlan
        || (0, group_presented_plan_1.latestPresentedPlanFromGroupSession)(group?.id, dispatchContext?.groupSessionId)
        || parsed?.presentedPlan
        || parsed?.presented_plan;
    return (0, group_presented_plan_1.attachConfirmedPlanSlicesToDispatchTargets)(targets, presentedPlan);
}
function normalizeLlmAnalysis(parsed, fallback) {
    const documentFindings = (0, group_orchestrator_coded_1.mergeDocumentFindings)(normalizeDocumentFindings(parsed), fallback?.documentFindings);
    let acceptanceEvidencePlan = [];
    let verificationProfile = null;
    try {
        acceptanceEvidencePlan = (0, test_agent_review_policy_1.normalizeTestAgentAcceptanceEvidencePlan)(parsed?.reasoning?.acceptanceEvidencePlan);
        verificationProfile = (0, test_agent_review_policy_1.normalizeTestAgentVerificationProfile)(parsed?.reasoning?.verificationProfile);
    }
    catch {
        acceptanceEvidencePlan = [];
        verificationProfile = null;
    }
    return {
        ...fallback,
        intent: String(parsed?.intent || fallback.intent || "discussion"),
        summary: String(parsed?.summary || fallback.summary || ""),
        domains: Array.isArray(parsed?.domains) ? parsed.domains.map((x) => String(x)).filter(Boolean) : fallback.domains,
        deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables.map((x) => String(x)) : fallback.deliverables,
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints.map((x) => String(x)).filter(Boolean) : fallback.constraints,
        documentFindings,
        missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo.map((x) => String(x)).filter(Boolean) : fallback.missingInfo,
        needsCoordination: parsed?.shouldDelegate !== false,
        coordinationStrategy: String(parsed?.coordinationStrategy || fallback?.coordinationStrategy || (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(fallback, Array.isArray(parsed?.targets) ? parsed.targets.length : 0)),
        architecturePlan: parsed?.architecturePlan || parsed?.architecture_plan || null,
        reasoning: {
            knownFacts: Array.isArray(parsed?.reasoning?.knownFacts) ? parsed.reasoning.knownFacts.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            assumptionsToVerify: Array.isArray(parsed?.reasoning?.assumptionsToVerify) ? parsed.reasoning.assumptionsToVerify.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            verificationAssertions: Array.isArray(parsed?.reasoning?.verificationAssertions) ? parsed.reasoning.verificationAssertions.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            acceptanceEvidencePlan,
            verificationProfile,
            dependencyRationale: Array.isArray(parsed?.reasoning?.dependencyRationale) ? parsed.reasoning.dependencyRationale.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            replanTriggers: Array.isArray(parsed?.reasoning?.replanTriggers) ? parsed.reasoning.replanTriggers.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
        },
        confidence: typeof parsed?.confidence === "number" ? parsed.confidence : fallback.confidence,
        workflowDecision: (0, workflow_decision_1.normalizeWorkflowDecision)({
            ...(fallback?.workflowDecision || {}),
            ...(parsed?.workflowDecision || parsed?.workflow_decision || {}),
            ...(!(parsed?.workflowDecision || parsed?.workflow_decision) ? {
                mode: parsed?.shouldDelegate === true ? "execute_direct" : fallback?.workflowDecision?.mode || "answer",
                reason: parsed?.dispatchPolicy?.reason || fallback?.workflowDecision?.reason || "大模型已选择协调方式",
                confidence: parsed?.confidence ?? fallback?.confidence ?? 0.8,
            } : {}),
        }),
    };
}
function buildCoordinatorResultFromAnalysis(group, message, analysis, targets, runtime, parsed = null, options = {}) {
    const coordinator = (0, group_orchestrator_routing_1.getCoordinatorMember)(group);
    // 优化6：优先使用 LLM 生成的 friendlyResponse
    const friendlyText = (0, group_coordinator_visible_reply_1.coordinatorUsableReply)(parsed);
    const dispatchPolicy = parsed
        ? (0, group_orchestrator_coded_1.normalizeDispatchPolicy)(parsed, analysis, targets)
        : { action: "hold", reason: "缺少模型结构化派发决定", requiresConfirmation: false, risk: "", nextStep: "重新调用模型" };
    const shouldDispatch = dispatchPolicy.action === "delegate" && !dispatchPolicy.requiresConfirmation;
    const effectiveTargets = shouldDispatch ? targets : [];
    const workflowDecision = analysis.workflowDecision
        || (0, workflow_decision_1.normalizeWorkflowDecision)({
            mode: effectiveTargets.length ? "execute_direct" : "answer",
            reason: dispatchPolicy.reason || "主 Agent 已选择协调方式",
        });
    if (effectiveTargets.length === 0) {
        const policyLine = dispatchPolicy.action === "delegate" && dispatchPolicy.requiresConfirmation
            ? `我先不直接派发：${dispatchPolicy.reason || "该操作需要你确认"}${dispatchPolicy.risk ? `\n风险：${dispatchPolicy.risk}` : ""}`
            : "";
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            workflowDecision,
            dispatchPolicy,
            runtime,
            agentBoundary: (0, group_orchestrator_config_1.buildGroupMainAgentBoundary)(runtime === "llm-api" ? "llm" : runtime),
            content: (0, group_coordinator_visible_reply_1.coordinatorVisibleFallbackContent)({
                parsed,
                analysis,
                policyLine,
                priorPlanDraft: options.priorPlanDraft || options.prior_plan_draft,
                observationCount: options.observationCount || options.observation_count,
            }),
        };
    }
    const delegationLines = effectiveTargets.map((item) => (0, group_orchestrator_routing_1.buildVisibleAssignmentLine)(item));
    const delegated = effectiveTargets.map((item) => item.member.project);
    // 优化5：保存执行顺序信息
    const executionOrder = workflowDecision.requiresCodeChanges === true
        ? "sequential"
        : String(parsed?.executionOrder || "parallel");
    const coordinationStrategy = String(parsed?.coordinationStrategy || analysis?.coordinationStrategy || (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(analysis, effectiveTargets.length));
    analysis.coordinationStrategy = coordinationStrategy;
    const coordinationPlan = (0, group_orchestrator_routing_1.buildCoordinatorPlan)(group, analysis, effectiveTargets, executionOrder, coordinationStrategy);
    const sourceEvidence = options.projectSourceEvidence || options.project_source_evidence || null;
    const architecturePlan = normalizeArchitecturePlan(parsed, sourceEvidence, effectiveTargets);
    analysis.architecturePlan = architecturePlan;
    coordinationPlan.architecture = architecturePlan;
    coordinationPlan.sourceEvidence = sourceEvidence;
    const visibleGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const visiblePlanId = String(options.taskId || options.task_id || options.turnId || options.turn_id || `group-${group.id}-${crypto.createHash("sha256").update(message).digest("hex").slice(0, 16)}`);
    if (group.id && visibleGroupSessionId && architecturePlan.dependencySteps.length) {
        (0, user_visible_agent_events_1.appendUserVisibleRequirementPlan)({
            eventId: `group-task:${visiblePlanId}:requirement-plan:1:initial`,
            scope: "group",
            scopeId: String(group.id),
            exactSessionId: visibleGroupSessionId,
            ...(String(options.anchorMessageId || options.anchor_message_id || "").trim()
                ? { anchorMessageId: String(options.anchorMessageId || options.anchor_message_id).trim() }
                : {}),
            generation: Math.max(0, Number(options.generation || options.executionGeneration || 0)),
            taskId: visiblePlanId,
            plan: groupRequirementPlanProjection({
                architecturePlan,
                analysis,
                projects: delegated,
                planId: visiblePlanId,
                revision: 1,
                status: "executing",
            }),
        });
    }
    return {
        agent: coordinator.project,
        delegated,
        assignments: (0, group_orchestrator_coded_1.buildAssignmentsFromTargets)(effectiveTargets, {
            group,
            analysis,
            groupSessionId: options.groupSessionId || options.group_session_id || "",
            workerContextUsageOptions: options.workerContextUsageOptions || options.worker_context_usage_options || null,
            autoWorkerContextCompactRetry: options.autoWorkerContextCompactRetry ?? options.auto_worker_context_compact_retry,
            workerContextRetryOptions: options.workerContextRetryOptions || options.worker_context_retry_options || null,
            providerSwitchRequests: options.providerSwitchRequests || options.provider_switch_requests || null,
        }),
        analysis,
        workflowDecision,
        coordinationPlan,
        projectSourceEvidence: sourceEvidence,
        dispatchPolicy,
        runtime,
        agentBoundary: (0, group_orchestrator_config_1.buildGroupMainAgentBoundary)(runtime === "llm-api" ? "llm" : runtime),
        executionOrder,
        coordinationStrategy,
        content: [
            friendlyText || `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            (0, group_orchestrator_coded_1.buildCoordinatorPlanText)(coordinationPlan),
            "",
            ...delegationLines,
            "",
            `等他们回复后我会做汇总 📋`
        ].join("\n"),
    };
}
async function runLlmGroupOrchestrator(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    const baseConfig = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const providedWorkflowDecision = input.workflowDecision || input.workflow_decision || null;
    const workflowDecision = providedWorkflowDecision
        ? (0, workflow_decision_1.normalizeWorkflowDecision)(providedWorkflowDecision)
        : null;
    const fallbackAnalysis = {
        intent: workflowDecision?.intentKind || "conversation",
        summary: String(input.message || "").trim(),
        domains: [],
        deliverables: [],
        constraints: [],
        documentFindings: [],
        missingInfo: workflowDecision?.clarificationQuestions || [],
        needsCoordination: workflowDecision?.actionRequired === true,
        coordinationStrategy: "model_selected",
        confidence: workflowDecision?.confidence ?? 0,
        workflowDecision,
    };
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const sessionPreferences = (0, slash_command_session_state_1.readSlashCommandSessionState)("group", String(group.id), groupSessionId).preferences;
    const config = { ...baseConfig, model: sessionPreferences.model || baseConfig.model, reasoningEffort: sessionPreferences.effort || baseConfig.reasoningEffort };
    const sessionDirective = (0, slash_command_session_state_1.renderSlashCommandSessionDirective)("group", String(group.id), groupSessionId);
    const visibleTurnId = String(input.turnId || input.turn_id || `${group.id}:${groupSessionId}:${Date.now()}`);
    const visibleAnchorMessageId = String(input.anchorMessageId || input.anchor_message_id || "").trim();
    const visibleTurnStartedAt = Date.now();
    if (group.id && groupSessionId) {
        (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            eventId: `group-turn:${visibleTurnId}:started`,
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
            eventType: "turn_started",
            display: { title: "群聊主 Agent", summary: "已开始处理当前请求", status: "running" },
        });
    }
    const anthropic = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config);
    let tokenUsage = null;
    let modelCallCount = 0;
    const retryNotices = [];
    const loopBudget = (0, agent_loop_budget_1.resolveAgentLoopBudget)({
        enabled: config.dynamicAgentBudgetEnabled !== false,
        adaptive: config.adaptiveAgentLoopEnabled !== false,
        contextWindow: config.modelContextWindow || 200_000,
        toolCallBudget: config.agentToolCallBudget || 6,
        maxModelTurns: config.agentMaxModelTurns || 8,
        toolBatchSize: config.agentToolBatchSize || 2,
        readOnlyParallelism: config.agentReadOnlyParallelism || 2,
        noProgressThreshold: config.agentLoopNoProgressThreshold || 3,
        remainingSafeTokens: Math.floor((config.modelContextWindow || 200_000) * 0.65),
    });
    let toolCallCount = 0;
    let toolRoundCount = 0;
    let modelDurationMs = 0;
    let toolWallDurationMs = 0;
    let segmentToolCalls = 0;
    let segmentModelTurns = 0;
    let segmentStartedAt = Date.now();
    let continuationSegments = 0;
    let noProgressCount = 0;
    let loopStopReason = "model_completed";
    let visibleReplyDeltaEmitted = false;
    let visibleReplyDeltaSequence = 0;
    let firstVisibleFeedbackAt = 0;
    let firstProviderDeltaAt = 0;
    let lastVisibleFeedbackAt = visibleTurnStartedAt;
    let maxSilentGapMs = 0;
    let modelRetryCount = 0;
    let initialReadFileCount = 0;
    let initialReadTokens = 0;
    const markVisibleFeedback = (at = Date.now()) => {
        if (!firstVisibleFeedbackAt)
            firstVisibleFeedbackAt = at;
        maxSilentGapMs = Math.max(maxSilentGapMs, Math.max(0, at - lastVisibleFeedbackAt));
        lastVisibleFeedbackAt = at;
    };
    let parsed;
    let planningInput = {
        ...input,
        group,
        workflowDecision: providedWorkflowDecision || null,
        extraInstructions: [String(input.extraInstructions || "").trim(), sessionDirective].filter(Boolean).join("\n\n"),
    };
    let toolResults = [];
    try {
        const nativeLoop = await (0, group_native_query_adapter_1.runGroupMainNativeQueryLoop)({
            config,
            group,
            groupSessionId,
            planningInput,
            loopBudget,
            visibleTurnId,
            visibleAnchorMessageId,
            signal: input.signal,
            onDelta: input.onDelta,
            onRetry: input.onRetry,
            onModelActivity: input.onModelActivity,
            markVisibleFeedback,
            buildMessages: (roundInput) => buildLlmCoordinatorMessages(roundInput),
            buildToolContext: (roundInput) => buildGroupMainAgentToolContext(roundInput),
            buildContextComponents: (roundInput) => buildLlmCoordinatorContextComponents(roundInput),
            executeRequests: executeGroupMainAgentToolRequests,
            isBuiltinReadOnly: (name) => GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === name),
        });
        parsed = nativeLoop.parsed;
        toolResults = nativeLoop.toolResults;
        planningInput = {
            ...nativeLoop.planningInput,
            mainAgentToolResults: toolResults,
            priorPlanDraft: (0, group_prior_plan_context_1.extractPriorGroupPlanDraft)(input.context),
            observationCount: toolResults.filter((row) => row?.name && row.name !== "loop_control").length,
        };
        modelCallCount = nativeLoop.modelCallCount;
        toolRoundCount = nativeLoop.toolRoundCount;
        toolCallCount = nativeLoop.toolCallCount;
        noProgressCount = nativeLoop.noProgressCount;
        continuationSegments = nativeLoop.continuationSegments;
        loopStopReason = nativeLoop.loopStopReason;
        tokenUsage = nativeLoop.tokenUsage || tokenUsage;
        modelDurationMs += nativeLoop.modelDurationMs;
        toolWallDurationMs += nativeLoop.toolWallDurationMs;
        modelRetryCount += nativeLoop.modelRetryCount;
        retryNotices.push(...nativeLoop.retryNotices);
        visibleReplyDeltaEmitted = nativeLoop.visibleReplyDeltaEmitted || visibleReplyDeltaEmitted;
        initialReadFileCount += nativeLoop.initialReadFileCount;
        initialReadTokens += nativeLoop.initialReadTokens;
    }
    catch (error) {
        if (error && !Number(error.observationCount)) {
            error.observationCount = toolResults.filter((row) => row?.name && row.name !== "loop_control").length;
        }
        throw attachLlmTokenUsage(error, tokenUsage);
    }
    let fallbackStreamCount = 0;
    if ((0, group_coordinator_visible_reply_1.shouldSynthesizeCoordinatorVisibleReply)(parsed) && input.onDelta) {
        fallbackStreamCount += 1;
        modelCallCount += 1;
        const synthesisStartedAt = Date.now();
        const synthesisActivity = (0, model_activity_1.createModelActivityController)({
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            turnId: visibleTurnId, modelCallIndex: modelCallCount, phase: "final_synthesis",
            anchorMessageId: visibleAnchorMessageId || undefined,
            onActivity: activityValue => {
                if (["waiting", "retrying"].includes(String(activityValue?.state || "")))
                    markVisibleFeedback();
                input.onModelActivity?.(activityValue);
            },
        });
        let synthesisSequence = 0;
        const onSynthesisDelta = (delta) => {
            if (!String(delta || "").trim())
                return;
            visibleReplyDeltaEmitted = true;
            if (!firstProviderDeltaAt)
                firstProviderDeltaAt = Date.now();
            markVisibleFeedback();
            synthesisActivity.onDelta(delta);
            synthesisSequence += 1;
            (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
                eventId: `group-delta:${visibleTurnId}:${modelCallCount}:${synthesisSequence}`,
                scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
                ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
                eventType: "assistant_text_delta",
                display: { title: "群聊主 Agent", summary: String(delta).slice(0, 500), status: "running" },
                detail: { stream: { sequence: synthesisSequence, final: false } },
            });
            input.onDelta?.(delta);
        };
        try {
            const priorPlanDraft = String(planningInput.priorPlanDraft || "");
            const synthesisMessages = [
                { role: "system", content: "请把既有结论整理成面向用户的最终回答。若已有计划稿，用一两句说明关键决策，不要把待办再写成 P0–P4 小作文，也不要输出空回复。若最近上下文已包含用户需求，直接据此回答或给出实现计划，不要再问用户描述更具体的需求。只输出回答正文，不输出JSON、内部协议、推理过程或工具原始结果。" },
                { role: "user", content: JSON.stringify({
                        request: String(input.message || "").slice(0, 4000),
                        recentContext: String(input.context || "").slice(0, 6000),
                        priorPlanDraft: priorPlanDraft.slice(0, 4000),
                        draft: String(parsed?.reply || parsed?.content || parsed?.summary || "").slice(0, 8000),
                        toolSummary: (0, assistant_progress_1.buildToolBatchOutcomeProgress)(toolResults, { target: group.name || group.id }) || "未使用工具",
                    }) },
            ];
            const captureSynthesisUsage = (usage) => { tokenUsage = mergeLlmTokenUsage(tokenUsage, usage); };
            const synthesized = anthropic
                ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, { messages: synthesisMessages, maxTokens: 1600, temperature: 0.2, defaultTimeoutMs: 60_000, retryProfile: "interactive_first_turn", stream: true, onDelta: onSynthesisDelta, onUsage: captureSynthesisUsage, onRetry: notice => { modelRetryCount += 1; synthesisActivity.onRetry(notice.attempt + 1); } })
                : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { messages: synthesisMessages, temperature: 0.2, defaultTimeoutMs: 60_000, retryProfile: "interactive_first_turn", stream: true, onDelta: onSynthesisDelta, onUsage: captureSynthesisUsage, onRetry: notice => { modelRetryCount += 1; synthesisActivity.onRetry(notice.attempt + 1); } });
            parsed = (0, group_coordinator_visible_reply_1.applySynthesizedCoordinatorReply)(parsed, String(synthesized || parsed?.reply || parsed?.content || ""));
            synthesisActivity.complete();
        }
        catch (error) {
            synthesisActivity.fail();
            if (error && !Number(error.observationCount)) {
                error.observationCount = toolResults.filter((row) => row?.name && row.name !== "loop_control").length;
            }
            throw attachLlmTokenUsage(error, tokenUsage);
        }
        finally {
            modelDurationMs += Math.max(0, Date.now() - synthesisStartedAt);
        }
    }
    parsed = (0, conversation_plan_mode_gate_1.applyConversationPlanModeHold)("group", String(group.id), groupSessionId, parsed);
    if ((0, group_presented_plan_1.hasPresentedGroupPlan)(parsed) && !(0, group_coordinator_visible_reply_1.coordinatorUsableReply)(parsed)) {
        parsed = (0, group_coordinator_visible_reply_1.applySynthesizedCoordinatorReply)(parsed, group_presented_plan_1.COORDINATOR_PRESENTED_PLAN_HEADLINE);
    }
    if ((0, group_coordinator_visible_reply_1.coordinatorShouldFailEmptyVisibleReply)({
        parsed,
        priorPlanDraft: planningInput.priorPlanDraft,
        observationCount: planningInput.observationCount,
        workflowMode: parsed?.workflowDecision?.mode,
    })) {
        const error = new Error("模型返回空响应");
        error.code = "CCM_EMPTY_REPLY";
        error.observationCount = Number(planningInput.observationCount || 0);
        throw attachLlmTokenUsage(error, tokenUsage);
    }
    const analysis = normalizeLlmAnalysis(parsed, fallbackAnalysis);
    const targets = sanitizeLlmTargets(group, parsed, input.message, analysis, false, { groupSessionId });
    const turnDecision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
        scope: "group",
        scopeId: String(group.id || ""),
        exactSessionId: groupSessionId,
        turnId: String(input.turnId || input.turn_id || `${group.id}:${groupSessionId}:${Date.now()}`),
        parsed,
        workflowDecision: analysis.workflowDecision,
        toolRequests: normalizeGroupMainToolRequests(parsed?.toolRequests || parsed?.tool_requests),
        dispatchDraft: targets,
    });
    const turnReceipt = (0, main_agent_turn_1.createMainAgentTurnReceipt)({
        decision: turnDecision,
        modelCallIndex: Math.max(1, modelCallCount),
        toolRound: Math.max(0, modelCallCount - 1),
        usage: tokenUsage,
        inputIdentity: { groupId: group.id, groupSessionId, message: input.message },
    });
    if (group.id && groupSessionId && ["reply", "clarify", "plan"].includes(turnDecision.responseKind)) {
        const reply = String(parsed?.reply || parsed?.content || parsed?.summary || "");
        const totalDurationMs = Math.max(0, Date.now() - visibleTurnStartedAt);
        const otherDurationMs = Math.max(0, totalDurationMs - modelDurationMs - toolWallDurationMs);
        (0, user_visible_agent_projections_1.publishUserVisibleAssistantText)({
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            taskId: String(input.taskId || input.task_id || ""),
            turnId: visibleTurnId, text: reply, title: "群聊主 Agent 回复",
        });
        (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            eventId: `group-turn:${visibleTurnId}:result`,
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
            eventType: turnDecision.responseKind === "clarify" ? "clarification_required" : "result",
            display: {
                title: turnDecision.responseKind === "clarify" ? "需要补充信息" : turnDecision.responseKind === "plan" ? "计划已整理" : "回复完成",
                summary: turnDecision.responseKind === "clarify" ? reply : turnDecision.responseKind === "plan" ? "群聊主 Agent 已整理本轮计划" : "群聊主 Agent 已完成本轮回复",
                status: turnDecision.responseKind === "clarify" ? "waiting" : "success",
                toolUseCount: toolCallCount,
                tokenCount: Number(tokenUsage?.totalTokens || 0),
                tokenType: "provider_total",
                tokenAccuracy: tokenUsage?.reported === false ? "estimated" : "reported",
                durationMs: totalDurationMs,
            },
            detail: { timing: { totalMs: totalDurationMs, modelMs: modelDurationMs, toolWallMs: toolWallDurationMs, otherMs: otherDurationMs } },
            result: (0, user_visible_agent_events_1.buildUserVisibleAgentResult)({ status: turnDecision.responseKind === "clarify" ? "waiting" : "success", text: reply, durationMs: totalDurationMs, modelDurationMs, turns: modelCallCount, toolCalls: toolCallCount, usage: tokenUsage }),
            usage: tokenUsage,
        });
    }
    const coordinatorResult = buildCoordinatorResultFromAnalysis(group, input.message, analysis, targets, "llm-api", parsed, planningInput);
    const presentedPlan = (0, group_presented_plan_1.publishGroupPresentedRequirementPlan)({
        groupId: group.id,
        groupSessionId,
        turnId: visibleTurnId,
        anchorMessageId: visibleAnchorMessageId,
        parsed,
        goalFallback: (0, group_coordinator_visible_reply_1.coordinatorUsableReply)(parsed) || String(input.message || ""),
        skip: Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0,
    });
    return {
        ...coordinatorResult,
        ...(presentedPlan ? { presentedPlan } : {}),
        usage: tokenUsage,
        mainAgentTurnDecision: turnDecision,
        mainAgentTurnReceipt: turnReceipt,
        modelRetryReceipt: {
            schema: "ccm-model-retry-receipt-v1",
            attempts: retryNotices.length ? retryNotices.at(-1).attempt + 1 : 1,
            retries: retryNotices,
        },
        mainAgentToolUsage: {
            schema: "ccm-group-main-tool-usage-v2",
            groupId: String(group.id || ""),
            groupSessionId,
            mode: loopBudget.mode,
            modelCalls: modelCallCount,
            toolRounds: toolRoundCount,
            calls: toolCallCount,
            continuationSegments,
            noProgressCount,
            stopReason: loopStopReason,
            results: toolResults.map(row => ({ name: row.name, ok: row.ok, outputTokens: row.outputTokens || 0, error: row.error || "" })),
        },
        replyDeltaEmitted: visibleReplyDeltaEmitted,
        reply_delta_emitted: visibleReplyDeltaEmitted,
        streamingMetric: {
            modelMs: modelDurationMs,
            toolWallMs: toolWallDurationMs,
            firstVisibleFeedbackMs: firstVisibleFeedbackAt ? Math.max(0, firstVisibleFeedbackAt - visibleTurnStartedAt) : 0,
            firstTokenMs: firstProviderDeltaAt ? Math.max(0, firstProviderDeltaAt - visibleTurnStartedAt) : 0,
            maxSilentGapMs: Math.max(maxSilentGapMs, Math.max(0, Date.now() - lastVisibleFeedbackAt)),
            providerRetryCount: modelRetryCount,
            fallbackStreamCount,
            initialReadFileCount,
            initialReadTokens,
        },
    };
}
//# sourceMappingURL=group-orchestrator-llm.js.map