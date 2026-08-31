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
const readonly_tool_concurrency_1 = require("../../system/readonly-tool-concurrency");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const agent_key_progress_1 = require("../../system/agent-key-progress");
const slash_command_session_state_1 = require("../../system/slash-command-session-state");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
const user_visible_agent_projections_1 = require("../../system/user-visible-agent-projections");
const session_context_tool_buckets_1 = require("../../system/session-context-tool-buckets");
const transient_model_content_1 = require("../../system/transient-model-content");
const agent_cache_affinity_1 = require("../../system/agent-cache-affinity");
const role_skills_1 = require("../../skills/role-skills");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const native_query_loop_1 = require("../../agents/native-query-loop");
const cc_tool_result_limits_1 = require("../../tools/cc-tool-result-limits");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const main_agent_context_policy_1 = require("../../tools/main-agent-context-policy");
const workflow_decision_1 = require("../../agents/workflow-decision");
const main_agent_turn_1 = require("../../agents/main-agent-turn");
const internal_prompt_contract_1 = require("../../agents/internal-prompt-contract");
const group_native_query_adapter_1 = require("./group-native-query-adapter");
const main_agent_identity_1 = require("../../agents/main-agent-identity");
const group_main_source_access_1 = require("./group-main-source-access");
const group_source_evidence_receipt_1 = require("./group-source-evidence-receipt");
const knowledge_access_1 = require("../knowledge/knowledge-access");
const test_agent_review_policy_1 = require("./test-agent-review-policy");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_main_shared_files_tool_1 = require("./group-main-shared-files-tool");
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
        description: "Query the knowledge base within the current group and member project authorization scope.",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        annotations: { readOnlyHint: true },
    },
    group_main_shared_files_tool_1.GROUP_MAIN_SHARED_FILES_TOOL,
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
    const sourceAccess = (0, group_main_source_access_1.resolveGroupMainSourceAccess)({
        groupId: String(group?.id || ""),
        exactSessionId: String(input.groupSessionId || input.group_session_id || `group-main:${group?.id || "unknown"}`),
        routableProjects: (0, group_orchestrator_routing_1.getRoutableMembers)(group).map((member) => String(member?.project || "")),
        authorizedProjects: input.authorizedProjectIds || input.authorized_project_ids,
        generation: Number(input.sourceGeneration || input.source_generation || 0),
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
            generation: sourceAccess.generation,
            allowedProjects: sourceAccess.allowedProjects,
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
        "Built-in read-only tools for the group main Agent:",
        ...GROUP_MAIN_BUILTIN_TOOLS.map(tool => (0, main_agent_tool_runtime_1.renderMainAgentToolCatalogLine)(tool, schemaSurface)),
    ].join("\n");
    return {
        ...shared,
        catalog: { ...shared.catalog, mcp, loadedMcp },
        mcpPrompt: [builtinPrompt, shared.mcpPrompt].filter(Boolean).join("\n\n"),
        policyPrompt: [builtinPrompt, shared.policyPrompt].filter(Boolean).join("\n\n"),
        group,
        sourceAccess,
        message: input.message,
        groupSessionId: input.groupSessionId || input.group_session_id || "",
        anchorMessageId: input.anchorMessageId || input.anchor_message_id || "",
        selectedRoleSkills,
        contextPolicy,
        contextBudget: shared.contextBudget,
        sharedFilesContext: String(input.sharedFilesContext || ""),
    };
}
function normalizeGroupMainToolRequests(value) {
    return (0, main_agent_tool_runtime_1.normalizeMainAgentToolRequests)(value);
}
async function executeGroupMainAgentToolRequests(input) {
    const batchSize = (0, readonly_tool_concurrency_1.clampReadonlyToolConcurrency)(input.toolBatchSize, readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT);
    const readOnlyParallelism = (0, readonly_tool_concurrency_1.clampReadonlyToolConcurrency)(input.readOnlyParallelism, readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT);
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
        const turnId = String(input.toolContext?.turnId || input.toolContext?.turn_id || "").trim();
        const executionAttempt = Math.max(1, Number(input.toolContext?.executionAttempt || input.toolContext?.execution_attempt || 1));
        const toolCallId = preparedIds.get(request) || `gmtool_${crypto.createHash("sha256").update(JSON.stringify({ groupId, exactSessionId, name: request.name, arguments: request.arguments, at: Date.now(), nonce: crypto.randomBytes(4).toString("hex") })).digest("hex").slice(0, 24)}`;
        const startedAt = Date.now();
        if (groupId && exactSessionId)
            (0, user_visible_agent_events_1.appendToolProjection)({
                scope: "group", scopeId: groupId, exactSessionId, generation,
                ...(anchorMessageId ? { anchorMessageId } : {}),
                ...(turnId ? { turnId } : {}),
                attempt: executionAttempt,
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
                if (request.name === "read_group_shared_files") {
                    row = (0, group_main_shared_files_tool_1.executeGroupMainSharedFilesTool)(input.toolContext);
                    row.durationMs = Date.now() - startedAt;
                }
                else if (request.name === "query_knowledge") {
                    const projects = (input.toolContext.sourceAccess?.allowedProjects || [])
                        .map((project) => ({ name: String(project || "") }))
                        .filter((item) => item.name);
                    rawOutput = await (0, knowledge_access_1.searchAgentKnowledge)(String(request.arguments?.query || input.toolContext.message || ""), {
                        role: "group-main-agent",
                        groupId: String(input.toolContext.group?.id || ""),
                        projects,
                    }, { limit: 6, continuityIdentity: { agentKind: "group", scope: "group", scopeId: String(input.toolContext.group?.id || ""), exactSessionId: String(input.toolContext.groupSessionId || ""), generation: Number(input.toolContext.scopeIdentity?.generation || 0) } });
                    const modelOutput = { context: rawOutput.context, citations: rawOutput.citations, retrievalMode: rawOutput.embeddingMode, indexGeneration: rawOutput.indexGeneration };
                    const output = JSON.stringify(modelOutput);
                    const outputTokens = (0, context_budget_1.estimateTextTokens)(output);
                    row = outputTokens > cc_tool_result_limits_1.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS
                        ? { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: cc_tool_result_limits_1.GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR, outputTokens, reason: request.reason }
                        : { name: request.name, itemName: request.name, toolKind: "internal_mcp", source: "ccm__knowledge_context", scope: "group", loaded: true, durationMs: Date.now() - startedAt, ok: true, output, rawOutput, outputTokens, resultChecksum: crypto.createHash("sha256").update(output).digest("hex"), reason: request.reason };
                }
                else
                    throw new Error(`未知群聊内置工具：${request.name}`);
            }
            catch (error) {
                row = { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: String(error?.message || error).slice(0, 1000), reason: request.reason };
            }
        }
        if (groupId && exactSessionId)
            (0, user_visible_agent_events_1.appendToolProjection)({
                scope: "group", scopeId: groupId, exactSessionId, generation,
                ...(anchorMessageId ? { anchorMessageId } : {}),
                ...(turnId ? { turnId } : {}),
                attempt: executionAttempt,
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
        while (index < requests.length && isSafeReadOnly(requests[index])) {
            readBatch.push(requests[index]);
            index += 1;
        }
        const parallelGroupId = readBatch.length > 1
            ? `group-parallel:${String(input.toolContext?.groupSessionId || input.toolContext?.group_session_id || "session")}:${Date.now()}:${index - readBatch.length}`
            : "";
        rows.push(...await (0, readonly_tool_concurrency_1.runReadonlyToolsAdaptive)({
            items: readBatch,
            worker: request => executeOne(request, parallelGroupId),
            configuredLimit: Math.min(readOnlyParallelism, batchSize),
            keyForItem: readonly_tool_concurrency_1.groupReadonlyProjectKey,
            perKeyLimit: readonly_tool_concurrency_1.CCM_GROUP_READONLY_PER_PROJECT_MAX,
        }));
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
    const childReplies = validOutputs.map((text, i) => `--- child Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2000)}`).join("\n\n");
    const cacheAffinity = (0, agent_cache_affinity_1.createAgentCacheAffinity)({
        scope: "group",
        scopeId: String(group.id || ""),
        agentRole: "group_main",
        stage: "coordination_review",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: agent_cache_affinity_1.AGENT_CACHE_STABLE_PROMPT_VERSIONS.coordination_review,
        cacheKeyProfile: "group_main:coordination_review",
        exactSessionId: groupSessionId || undefined,
    });
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", userMessage, { forceWork: true, phase: "summary" });
    const system = `You are the CCM group main Agent and coordinator. Child Agents replied to the user request through internal task notifications. Produce a concise user-facing synthesis.

Requirements:
1. Extract each child Agent's core conclusions and summarize each in one to three sentences.
2. Call out conflicts or inconsistencies between child Agents.
3. Give next actions or decisions the user must make.
4. Do not repeat every child reply; summarize only.
5. Use a natural, friendly team-lead tone.
6. Internal markers such as <task-notification>, CCM_AGENT_RECEIPT, trace, session, and scratchpad must never appear in user-visible text. Rewrite them as understandable terms such as child-Agent result, structured result, verification evidence, or technical details.

Return synthesis text only, not JSON. Use the user's conversation language. Do not reveal hidden reasoning or raw tool output.`;
    const user = `Dynamic coordination context:
${roleSkills.prompt || "- No dynamic role Skill selected."}

Original user request: ${String(userMessage).slice(0, 500)}

Child-Agent task notifications / replies:
${childReplies}

Return the synthesis.`;
    try {
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const content = anthropic
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, { messages, system, maxTokens: 1000, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", providerContextCache: { scope: "group", scopeId: String(group.id || ""), sessionId: groupSessionId, source: "group_main_summary", cacheAffinity }, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { messages, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", providerContextCache: { scope: "group", scopeId: String(group.id || ""), sessionId: groupSessionId, source: "group_main_summary", cacheAffinity }, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage });
        const summary = (0, group_orchestrator_prompts_1.sanitizeCoordinatorUserText)(content, "主 Agent 已收到子 Agent 的结果，正在整理下一步。", 1200);
        if (!summary.trim()) {
            (0, db_1.recordMetric)(coordinator.project, { success: false, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage, error: "主 Agent 汇总返回空内容" });
            return null;
        }
        (0, db_1.recordMetric)(coordinator.project, { success: true, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage });
        return {
            agent: coordinator.project,
            content: `📋 **协调汇总**\n\n${summary}`,
            modelCallStage: {
                agentRole: "group_main",
                stage: "coordination_review",
                requestKind: "auxiliary",
                modelCallIndex: 1,
                cacheKeyProfile: "group_main:coordination_review",
                contentStored: false,
            },
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
    const reviewCacheAffinity = (0, agent_cache_affinity_1.createAgentCacheAffinity)({
        scope: "group",
        scopeId: String(group.id || ""),
        agentRole: "group_main",
        stage: "coordination_review",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: agent_cache_affinity_1.AGENT_CACHE_STABLE_PROMPT_VERSIONS.coordination_review,
        cacheKeyProfile: "group_main:coordination_review",
        exactSessionId: groupSessionId || undefined,
    });
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
        .map((text, i) => `--- child Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2400)}`)
        .join("\n\n");
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", userMessage, { forceWork: true, phase: "review" });
    const system = `You are the CCM group main Agent and work coordinator. The user request has been dispatched to project Agents. Review their replies as a project owner.

The current acceptance round, rework permission, task gates, allowed projects and role Skills are supplied in the dynamic user message. Treat those current values as authoritative over stale conversation requirements.

You are not the code execution Agent. Do not edit code and do not claim unsupported completion. Use the injected review and rework Skills to judge completion, conflicts, gaps, and next actions.
- Put self-contained rework work orders only in followUps. When evidence is sufficient, return the final coordination verdict. When user input is needed, ask one concrete question.
- User-visible summary, gaps, conflicts, checks.detail/evidence, and userQuestion must not contain internal markers such as <task-notification>, CCM_AGENT_RECEIPT, trace, session, or scratchpad. Rewrite them as child-Agent results, structured result details, verification evidence, or technical details.

Acceptance gates:
- Inspect each Worker's task notification: task-id identifies the Worker; status may be completed, failed, blocked, partial, or missing_receipt; receipt-status identifies the structured receipt state; result is the Worker summary.
- Inspect the structured receipt summary at the end of each child-Agent reply.
- A dispatched Agent without a structured receipt, with a receipt status other than done, or without actual action and verification evidence is normally not complete.
- Apply the dynamic code-change gate exactly: when required, demand changed files or an explicit no-change statement; when disabled, do not invent a file-change gap.
- Apply the dynamic verification gate exactly: when required, demand matching verification evidence; when disabled, do not invent mandatory test/build requirements.
- Dependent work must cite or absorb the preceding Agent's conclusion; otherwise report an unclosed dependency.
- For API, business, requirement, or PRD-driven work, verify that assigned contracts, fields, business rules, UI behavior, and acceptance criteria are covered by implementation or evidence.
- Do not treat suggestions, proposed changes, or recommendations as completed work.

Return one JSON object only. Do not output Markdown or explanations.

JSON shape:
{
  "schema_version": 1,
  "status": "complete | needs_followup | needs_user",
  "verdict": "pass | blocked | needs_user",
  "decision": { "can_complete": true, "reason": "why completion is or is not allowed" },
  "summary": "User-facing final or interim coordination conclusion in the conversation language, including confirmed conclusions, completed/uncompleted work, risks, and verification advice",
  "checks": [
    { "id": "worker_receipt | actual_changes | verification | dependency | user_scope", "label": "check label", "status": "pass | fail | warn", "detail": "check conclusion", "evidence": ["evidence"] }
  ],
  "worker_reviews": [
    { "project": "project Agent name", "receipt_status": "done | partial | blocked | failed | missing", "trusted": true, "completed_scope": ["completed scope"], "gaps": ["gap"], "verification": ["verification evidence"] }
  ],
  "gaps": ["missing information or evidence"],
  "conflicts": ["conflict or inconsistency between child Agents"],
  "followUps": [
    {
      "project": "must be an allowed project Agent name",
      "summary": "five to ten word follow-up preview for the user and task card",
      "task": "specific self-contained follow-up work including missing evidence, changes, or verification",
      "reason": "why the follow-up is needed"
    }
  ],
  "userQuestion": "One concrete question if user input is required; otherwise an empty string",
  "confidence": 0.0
}`;
    const user = `Original user request:
${String(userMessage || "").slice(0, 1200)}

Dynamic acceptance controls:
- Acceptance round: ${round}/${maxRounds}
- Follow-up dispatch allowed: ${allowFollowUps ? "yes" : "no"}
- Code/file changes required: ${requiresCodeChanges ? "yes" : "no"}
- Project verification required: ${requiresVerification ? "yes" : "no"}

Dynamic role Skills:
${roleSkills.prompt || "- none"}

Allowed project Agents:
${(0, group_orchestrator_coded_1.buildAllowedProjectBrief)(normalized) || "- none"}

Initial main-Agent assignment:
${String(coordinatorPlan || "").slice(0, 1600)}

Child-Agent task notifications / replies:
${childReplies}

May the coordinator ask child Agents follow-up questions: ${allowFollowUps ? "yes" : "no; return a final conclusion or one user question in this round"}

Return JSON.`;
    try {
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const content = anthropic
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, { messages, system, maxTokens: 1400, temperature: 0.2, defaultTimeoutMs: 30000, providerContextCache: { scope: "group", scopeId: String(group.id || ""), sessionId: groupSessionId, source: "group_main_review", cacheAffinity: reviewCacheAffinity }, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { messages, temperature: 0.2, defaultTimeoutMs: 30000, providerContextCache: { scope: "group", scopeId: String(group.id || ""), sessionId: groupSessionId, source: "group_main_review", cacheAffinity: reviewCacheAffinity }, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage });
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
            modelCallStage: {
                agentRole: "group_main",
                stage: "coordination_review",
                requestKind: "auxiliary",
                modelCallIndex: Math.max(1, round),
                cacheKeyProfile: "group_main:coordination_review",
                contentStored: false,
            },
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
        extraInstructions: "This is an explicit requirement decomposition request. Generate structured assignments from complete semantics and member responsibilities only; do not use keyword or rule routing. Return clarificationQuestions when information is insufficient; never guess targets.",
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
    const preparedProviderMessages = input.__preRequestProviderMessages;
    if (Array.isArray(preparedProviderMessages))
        return preparedProviderMessages;
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
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
    const identityInput = {
        projectBrief: (0, group_orchestrator_coded_1.buildAllowedProjectBrief)(group),
        extraInstructions: input.extraInstructions,
        roleSkillsPrompt: roleSkills.prompt,
        planAuthoring,
        sessionDirective: (0, slash_command_session_state_1.renderSlashCommandSessionDirective)("group", String(group?.id || ""), groupSessionId),
    };
    const sessionGuidance = [
        (0, main_agent_identity_1.buildGroupMainSessionGuidance)({ planAuthoring }),
        (0, main_agent_identity_1.buildGroupMainDynamicContext)(identityInput),
    ].filter(Boolean).join("\n\n");
    const identityRules = (0, main_agent_identity_1.buildGroupMainIdentityRules)(identityInput);
    const nativeMessages = (0, group_coordinator_native_messages_1.tryBuildGroupNativeCoordinatorMessages)({
        group,
        message: input.message,
        groupSessionId,
        sharedFilesContext: "",
        ragContext: "",
        identityRules,
        sessionGuidance,
        mcpPolicy: mainAgentTools.policyPrompt,
        mainAgentToolResults: toolResults,
    });
    if (nativeMessages)
        return nativeMessages;
    const priorPlanBlock = (0, group_prior_plan_context_1.formatPriorGroupPlanBlock)((0, group_prior_plan_context_1.extractPriorGroupPlanDraft)(input.context));
    const user = `Recent group context:
${input.context || "none"}
${priorPlanBlock ? `\n${priorPlanBlock}\n` : ""}
Latest user message:
${input.message}

Workflow decision already available for this Run (empty on the first main-Agent call; reused on tool follow-ups):
${JSON.stringify(input.workflowDecision || null)}

Decide from complete semantics whether to reply directly, call read-only tools, call ccm_ask_user, submit ccm_present_plan, or call ccm_dispatch. When the user explicitly requests a plan, approach, or steps, call ccm_present_plan. If the recent context already answers the message and no plan is requested, prefer a direct reply.`;
    return (0, transient_model_content_1.attachTransientModelBlocks)([
        { role: "system", content: identityRules },
        { role: "system", contextBlockType: "dynamic_context", content: sessionGuidance },
        ...(mainAgentTools.policyPrompt
            ? [{ role: "system", contextBlockType: "dynamic_context", content: mainAgentTools.policyPrompt }]
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
        memoryAndLoadedContext: {
            exactGroupContext: input.context || "",
            sharedFilesAvailable: !!input.sharedFilesContext,
            knowledgeAvailable: true,
            scopeInstructionContext: mainAgentTools.loadedContext || "",
        },
        loadedContextItems: (0, main_agent_tool_runtime_1.buildMainAgentLoadedContextItems)(mainAgentTools, toolResults, roleSkills.selected.map((skill) => ({
            name: skill.name,
            loadLevel: "body",
            checksum: crypto.createHash("sha256").update(String(skill.body || "")).digest("hex"),
            tokens: (0, context_budget_1.estimateTextTokens)(String(skill.body || "")),
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
                actionRequired: parsed?.shouldDelegate === true,
                requiresCodeChanges: parsed?.shouldDelegate === true,
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
            actionRequired: effectiveTargets.length > 0,
            requiresCodeChanges: effectiveTargets.length > 0,
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
    const visibleExecutionAttempt = Math.max(1, Number(input.recoveryAttempt || 1));
    let visibleExecutionGeneration = Math.max(0, Number(input.sourceGeneration || input.source_generation || 0));
    const visibleTurnStartedAt = Date.now();
    if (group.id && groupSessionId) {
        (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            eventId: `group-turn:${visibleTurnId}:started`,
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
            turnId: visibleTurnId,
            attempt: visibleExecutionAttempt,
            ...(visibleExecutionGeneration ? { generation: visibleExecutionGeneration } : {}),
            eventType: "turn_started",
            display: { title: "群聊主 Agent", summary: "已开始处理当前请求", status: "running" },
        });
    }
    const anthropic = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config);
    let tokenUsage = null;
    let modelCallCount = 0;
    let mainLoopModelCalls = 0;
    let auxiliaryModelCalls = 0;
    const retryNotices = [];
    const loopBudget = (0, agent_loop_budget_1.resolveAgentLoopBudget)({
        enabled: config.dynamicAgentBudgetEnabled !== false,
        adaptive: config.adaptiveAgentLoopEnabled !== false,
        contextWindow: config.modelContextWindow || 200_000,
        toolCallBudget: config.agentToolCallBudget || 6,
        maxModelTurns: config.agentMaxModelTurns || 8,
        toolBatchSize: config.agentToolBatchSize || readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT,
        readOnlyParallelism: config.agentReadOnlyParallelism || readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT,
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
    const markProviderToken = (at = Date.now()) => {
        if (!firstProviderDeltaAt)
            firstProviderDeltaAt = at;
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
            recoveryAttempt: Math.max(1, Number(input.recoveryAttempt || 1)),
            signal: input.signal,
            onDelta: input.onDelta,
            onRetry: input.onRetry,
            onModelActivity: input.onModelActivity,
            onAgentExecutionEvent: input.onAgentExecutionEvent,
            markVisibleFeedback,
            markProviderToken,
            buildMessages: (roundInput) => buildLlmCoordinatorMessages(roundInput),
            buildToolContext: (roundInput) => buildGroupMainAgentToolContext(roundInput),
            buildContextComponents: (roundInput) => buildLlmCoordinatorContextComponents(roundInput),
            executeRequests: executeGroupMainAgentToolRequests,
            isBuiltinReadOnly: (name) => GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === name),
        });
        parsed = nativeLoop.parsed;
        toolResults = nativeLoop.toolResults;
        visibleExecutionGeneration = Math.max(visibleExecutionGeneration, Number(nativeLoop.generation || 0));
        planningInput = {
            ...nativeLoop.planningInput,
            mainAgentToolResults: toolResults,
            priorPlanDraft: (0, group_prior_plan_context_1.extractPriorGroupPlanDraft)(input.context),
            observationCount: toolResults.filter((row) => row?.name && row.name !== "loop_control").length,
        };
        modelCallCount = nativeLoop.modelCallCount;
        mainLoopModelCalls = nativeLoop.modelCallCount;
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
    const conversationPlanModeEnabled = (0, conversation_plan_mode_gate_1.isConversationPlanModeEnabled)("group", String(group.id), groupSessionId);
    parsed = (0, conversation_plan_mode_gate_1.applyConversationPlanModeHold)("group", String(group.id), groupSessionId, parsed);
    parsed = (0, conversation_plan_mode_gate_1.applyInteractiveConversationModePolicy)("group", conversationPlanModeEnabled, parsed);
    if ((0, group_presented_plan_1.hasPresentedGroupPlan)(parsed) && !(0, group_coordinator_visible_reply_1.coordinatorUsableReply)(parsed)) {
        parsed = (0, group_coordinator_visible_reply_1.applySynthesizedCoordinatorReply)(parsed, group_presented_plan_1.COORDINATOR_PRESENTED_PLAN_HEADLINE);
    }
    if ((0, group_coordinator_visible_reply_1.coordinatorShouldFailEmptyVisibleReply)({
        parsed,
        priorPlanDraft: planningInput.priorPlanDraft,
        observationCount: planningInput.observationCount,
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
        promptBindings: (0, internal_prompt_contract_1.buildInternalPromptBindings)({
            scope: "group",
            system: buildLlmCoordinatorMessages(planningInput)
                .filter((message) => message?.role === "system")
                .map((message) => String(message.content || ""))
                .join("\n\n"),
            skills: (0, role_skills_1.buildRoleSkillPrompt)("group-main-agent", input.message, {
                source: String(input.source || ""),
                phase: "planning",
                selectedSkillNames: analysis.workflowDecision?.selectedSkills || [],
                modelDecision: analysis.workflowDecision || null,
                planAuthoring: conversationPlanModeEnabled,
            }).selected.map((skill) => ({ name: skill.name, version: skill.version, body: skill.body })),
            mcp: buildLlmCoordinatorContextComponents(planningInput).mcpTools,
        }),
    });
    if (group.id && groupSessionId && ["reply", "clarify", "plan"].includes(turnDecision.responseKind)) {
        const reply = String(parsed?.reply || parsed?.content || parsed?.summary || "");
        if (toolCallCount > 0 && reply.trim())
            (0, agent_key_progress_1.recordAgentKeyProgress)({
                scope: "group",
                scopeId: String(group.id),
                exactSessionId: groupSessionId,
                turnId: visibleTurnId,
                anchorMessageId: visibleAnchorMessageId || undefined,
                title: "群聊主 Agent",
                kind: "model_key_summary",
                text: reply,
                source: "model_stream",
                status: "success",
                modelCallIndex: Math.max(1, modelCallCount),
                round: Math.max(0, toolRoundCount),
                eventId: `key-progress:${visibleTurnId}:model-output`,
            });
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
            turnId: visibleTurnId,
            attempt: visibleExecutionAttempt,
            generation: visibleExecutionGeneration,
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
            detail: { timing: { totalMs: totalDurationMs, modelMs: modelDurationMs, toolWallMs: toolWallDurationMs, otherMs: otherDurationMs }, promptBindings: turnReceipt.promptBindings },
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
            mainLoopModelCalls,
            auxiliaryModelCalls,
            toolRounds: toolRoundCount,
            calls: toolCallCount,
            toolLoopRounds: toolRoundCount,
            toolCallCount,
            auxiliaryStages: [],
            continuationSegments,
            noProgressCount,
            stopReason: loopStopReason,
            results: toolResults.map(row => ({ name: row.name, ok: row.ok, outputTokens: row.outputTokens || 0, error: row.error || "" })),
        },
        ...(String(input.source || "") === "global-source-inquiry" ? {
            sourceInquiryReceipt: (0, group_source_evidence_receipt_1.buildSafeGroupSourceInquiryReceipt)({
                group,
                exactSessionId: String(input.delegatedExactSessionId || input.delegated_exact_session_id || groupSessionId),
                readDepth: providedWorkflowDecision?.sourceReadDepth === "broad" ? "broad" : "focused",
                authorizedProjectIds: Array.isArray(input.authorizedProjectIds) ? input.authorizedProjectIds : [],
                toolResults,
                // Keep the signed receipt body-free. The delegated natural-language
                // conclusion is returned separately and never becomes evidence data.
                findings: [],
            }),
        } : {}),
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