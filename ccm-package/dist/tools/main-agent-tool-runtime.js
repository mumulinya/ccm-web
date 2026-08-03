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
exports.MAIN_AGENT_NATIVE_TOOLS_V2 = void 0;
exports.isMainAgentReadOnlyMcpTool = isMainAgentReadOnlyMcpTool;
exports.buildMainAgentToolRuntimeContext = buildMainAgentToolRuntimeContext;
exports.normalizeMainAgentToolRequests = normalizeMainAgentToolRequests;
exports.mainAgentToolRequestFingerprint = mainAgentToolRequestFingerprint;
exports.buildMainAgentLoadedContextItems = buildMainAgentLoadedContextItems;
exports.executeMainAgentToolRequests = executeMainAgentToolRequests;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const tool_authorization_1 = require("./tool-authorization");
const tool_manager_1 = require("./tool-manager");
const workspace_readonly_tools_1 = require("./workspace-readonly-tools");
const main_agent_post_compact_continuity_1 = require("../system/main-agent-post-compact-continuity");
exports.MAIN_AGENT_NATIVE_TOOLS_V2 = [
    { name: "ask_user_question", description: "向当前精确会话提出结构化澄清问题。", loadPolicy: "base", sideEffect: "orchestrator_control" },
    { name: "update_todo", description: "更新当前Run的计划步骤和进度。", loadPolicy: "base", sideEffect: "orchestrator_control" },
    { name: "enter_plan_mode", description: "进入计划制定或修订阶段。", loadPolicy: "base", sideEffect: "orchestrator_control" },
    { name: "exit_plan_mode", description: "提交计划并进入现有确认或派发门禁。", loadPolicy: "base", sideEffect: "orchestrator_control" },
    { name: "invoke_skill", description: "加载并调用当前作用域已授权的Skill。", loadPolicy: "base", sideEffect: "none" },
    { name: "tool_search", description: "按需发现并加载低频只读工具Schema。", loadPolicy: "base", sideEffect: "none" },
    { name: "list_mcp_resources", description: "列出当前作用域已授权MCP的资源能力。", loadPolicy: "conditional", sideEffect: "none" },
    { name: "read_mcp_resource", description: "读取当前作用域已授权的精确MCP资源。", loadPolicy: "conditional", sideEffect: "none" },
    { name: "dispatch_task", description: "通过现有队列和权限门禁分派任务。", loadPolicy: "conditional", sideEffect: "orchestrator_control" },
    { name: "get_task_status", description: "读取当前作用域任务状态。", loadPolicy: "conditional", sideEffect: "none" },
    { name: "stop_task", description: "通过现有取消门禁停止任务。", loadPolicy: "conditional", sideEffect: "orchestrator_control" },
];
function uniqueNames(values = []) {
    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
}
function isMainAgentReadOnlyMcpTool(tool) {
    const annotations = tool?.annotations && typeof tool.annotations === "object" ? tool.annotations : {};
    if (annotations.destructiveHint === true || annotations.readOnlyHint === false)
        return false;
    const name = String(tool?.name || "").trim();
    if (!name)
        return false;
    return annotations.readOnlyHint === true && (["official", "approved"].includes(String(tool?.serverTrust || "")) || tool?.origin === "internal");
}
function buildMainAgentToolRuntimeContext(input) {
    const configured = (0, tool_authorization_1.normalizeToolAuthorization)(input.configuredTools || {});
    const executionSkills = uniqueNames(input.executionSkills || []);
    const effective = (0, tool_authorization_1.normalizeToolAuthorization)({
        mcp: configured.mcp,
        skill: uniqueNames([...configured.skill, ...executionSkills]),
    });
    const scope = { ...effective, auditContext: input.auditContext || {} };
    const scoped = tool_manager_1.toolManager.getScopedToolCatalog(scope);
    const readOnly = input.mcpPolicy !== "all";
    const continuityIdentity = input.scopeIdentity ? (0, main_agent_post_compact_continuity_1.resolveMainAgentContinuityIdentity)({
        agentKind: input.scopeIdentity.scope,
        scope: input.scopeIdentity.scope,
        scopeId: input.scopeIdentity.scopeId,
        exactSessionId: input.scopeIdentity.exactSessionId,
        generation: Number(input.scopeIdentity.generation || 0),
    }) : undefined;
    const restored = continuityIdentity
        ? (0, main_agent_post_compact_continuity_1.restoreMainAgentPostCompactContext)({ identity: continuityIdentity, scope })
        : null;
    const capabilityToken = input.scopeIdentity ? (0, workspace_readonly_tools_1.sealScopedToolCapability)({
        scope: input.scopeIdentity.scope,
        scopeId: input.scopeIdentity.scopeId,
        exactSessionId: input.scopeIdentity.exactSessionId,
        generation: Number(continuityIdentity?.generation || input.scopeIdentity.generation || 0),
        allowedProjects: input.scopeIdentity.allowedProjects || [],
    }) : "";
    const workspaceBase = capabilityToken ? workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.filter(tool => tool.loadPolicy === "base") : [];
    const workspaceSearch = capabilityToken ? workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.filter(tool => tool.loadPolicy === "search") : [];
    const configuredMcp = readOnly ? scoped.tools.filter(isMainAgentReadOnlyMcpTool) : scoped.tools;
    const requestedLoaded = new Set(uniqueNames([
        ...(input.loadedToolNames || []),
        ...(restored?.loadedToolNames || []),
    ]));
    const configuredAlwaysLoaded = configuredMcp.filter((tool) => tool?.alwaysLoad === true);
    const configuredPreviouslyLoaded = configuredMcp.filter((tool) => requestedLoaded.has(String(tool?.canonicalName || "")) || requestedLoaded.has(String(tool?.name || "")));
    const loadedConfiguredNames = new Set([...configuredAlwaysLoaded, ...configuredPreviouslyLoaded].map((tool) => String(tool?.canonicalName || "")));
    const mcp = [...workspaceBase, ...configuredMcp.filter((tool) => loadedConfiguredNames.has(String(tool?.canonicalName || "")))];
    const discoverableMcp = [...workspaceSearch, ...configuredMcp.filter((tool) => !loadedConfiguredNames.has(String(tool?.canonicalName || "")))];
    const rejectedMcp = readOnly ? scoped.tools.filter(tool => !isMainAgentReadOnlyMcpTool(tool)) : [];
    const toolAudit = tool_manager_1.toolManager.buildScopeAudit(scope);
    const label = String(input.label || "主 Agent");
    const nativePrompt = [
        `${label}原生控制工具：`,
        ...exports.MAIN_AGENT_NATIVE_TOOLS_V2.filter(tool => tool.loadPolicy === "base").map(tool => `- ${tool.name}: ${tool.description}`),
        "ask_user_question、update_todo、enter_plan_mode和exit_plan_mode由本轮结构化responseType/plan字段驱动，不要把它们放进toolRequests；invoke_skill与tool_search才通过toolRequests进入工具循环。",
    ].join("\n");
    const mcpPrompt = mcp.length ? [
        `${label}已授权的${readOnly ? "只读" : ""} MCP 工具（必须使用 canonicalName）：`,
        ...mcp.map(tool => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
    ].join("\n") : "";
    const deferredMcpPrompt = discoverableMcp.length ? [
        `${label}已授权但尚未加载 Schema 的 MCP/低频工具：`,
        ...discoverableMcp.map(tool => `- ${tool.canonicalName || tool.name}`),
        "这些名称仅用于发现，不代表 Schema 已进入本轮上下文。调用前必须先使用 tool_search；tool_search 返回的完整 Schema 会保留在当前 Run 的后续轮次。",
    ].join("\n") : "";
    const skillPrompt = scoped.skills.length ? [
        `${label}已授权的 Skill：`,
        ...scoped.skills.map(skill => `- ${skill.name}: ${skill.description || "未提供描述"}; hash=${skill.contentHash || ""}`),
    ].join("\n") : "";
    const unavailable = [
        ...(Array.isArray(toolAudit?.missing_mcp_servers) ? toolAudit.missing_mcp_servers : []),
        ...(Array.isArray(toolAudit?.missing_mcp_tools) ? toolAudit.missing_mcp_tools : []),
        ...(Array.isArray(toolAudit?.missing_skills) ? toolAudit.missing_skills : []),
    ];
    const policyPrompt = [
        nativePrompt,
        mcpPrompt,
        deferredMcpPrompt,
        skillPrompt,
        restored?.renderedSkillAttachments || "",
        rejectedMcp.length ? `以下 MCP 可能写入或产生副作用，不向${label}开放：${rejectedMcp.map(tool => tool.canonicalName).join(", ")}` : "",
        unavailable.length ? "部分已配置工具当前不可用；不得声称已经调用。" : "",
        discoverableMcp.length ? `延迟工具不会预先占用完整 Schema Token；需要时先调用 tool_search，按名称或能力描述加载。` : "",
        `需要工具数据时在 toolRequests 中请求。MCP优先使用上面列出的 canonicalName；CCM内部只读工具也接受短名称。Skill只能使用 invoke_skill，并在 arguments.name 中填写已列出的 Skill。工具结果由CCM执行后重新交给模型，不得把请求本身视为完成。`,
    ].filter(Boolean).join("\n\n");
    const checksum = crypto.createHash("sha256").update(JSON.stringify({ effective, mcp: mcp.map((row) => ({ name: row.canonicalName, checksum: row.checksum || "" })), discoverable: discoverableMcp.map((row) => ({ name: row.canonicalName, checksum: row.checksum || "" })), skills: scoped.skills.map(row => row.name), auditContext: scope.auditContext || {}, scopeIdentity: continuityIdentity || null, restore: restored?.receipt?.checksum || "" })).digest("hex");
    return {
        schema: "ccm-main-agent-tool-runtime-context-v2",
        scope,
        configured,
        executionSkills,
        effective,
        catalog: { mcp, skills: scoped.skills, rejectedMcp, discoverableMcp, native: exports.MAIN_AGENT_NATIVE_TOOLS_V2 },
        toolAudit,
        mcpPrompt,
        skillPrompt,
        policyPrompt,
        checksum,
        version: 2,
        capabilityToken,
        loadedToolNames: mcp.map(row => String(row.canonicalName || row.name || "")).filter(Boolean),
        deferredToolNames: discoverableMcp.map(row => String(row.canonicalName || row.name || "")).filter(Boolean),
        scopeIdentity: continuityIdentity,
        restoredSkillAttachments: restored?.skillAttachments || [],
        postCompactRestoreReceipt: restored?.receipt,
    };
}
function refreshMainAgentToolPromptState(toolContext) {
    const label = String(toolContext.scope.auditContext?.runtime || "主 Agent");
    toolContext.mcpPrompt = toolContext.catalog.mcp.length ? [
        `${label}当前已加载 Schema 的 MCP 工具（必须使用 canonicalName）：`,
        ...toolContext.catalog.mcp.map((tool) => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
    ].join("\n") : "";
    toolContext.loadedToolNames = uniqueNames(toolContext.catalog.mcp.map((tool) => tool.canonicalName || tool.name));
    toolContext.deferredToolNames = uniqueNames((toolContext.catalog.discoverableMcp || []).map((tool) => tool.canonicalName || tool.name));
    const marker = "[CCM ToolSearch 本轮已加载 Schema]";
    toolContext.policyPrompt = `${String(toolContext.policyPrompt || "").split(marker)[0].trim()}\n\n${marker}\n${toolContext.mcpPrompt}`.trim();
}
function normalizeMainAgentToolRequests(value, limit = 2) {
    const rows = Array.isArray(value) ? value : [];
    const seen = new Set();
    const result = [];
    for (const row of rows) {
        const name = String(row?.name || "").trim();
        if (!name)
            continue;
        const args = row?.arguments && typeof row.arguments === "object" ? row.arguments : {};
        const fingerprint = crypto.createHash("sha256").update(JSON.stringify({ name, args })).digest("hex");
        if (seen.has(fingerprint))
            continue;
        seen.add(fingerprint);
        result.push({ name, arguments: args, reason: String(row?.reason || "").trim().slice(0, 240) });
        if (result.length >= limit)
            break;
    }
    return result;
}
function mainAgentToolRequestFingerprint(request) {
    return crypto.createHash("sha256").update(JSON.stringify({ name: request.name, arguments: request.arguments || {} })).digest("hex");
}
function contextItemChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function buildMainAgentLoadedContextItems(toolContext, results = [], additionalSkills = []) {
    const skills = [
        ...toolContext.catalog.skills.map((skill) => ({
            kind: "skill",
            name: String(skill?.name || ""),
            aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
            loadLevel: "catalog",
            checksum: String(skill?.contentHash || contextItemChecksum({ name: skill?.name, description: skill?.description })),
            loadSource: "catalog",
            tokens: (0, context_budget_1.estimateTextTokens)(JSON.stringify({ name: skill?.name || "", description: skill?.description || "" })),
        })),
        ...additionalSkills.map(skill => ({
            kind: "skill",
            name: String(skill?.name || ""),
            aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
            loadLevel: skill?.loadLevel === "catalog" ? "catalog" : "body",
            checksum: String(skill?.contentHash || skill?.checksum || contextItemChecksum({ name: skill?.name })),
            loadSource: "same_run",
        })),
        ...(toolContext.restoredSkillAttachments || []).map((skill) => ({
            kind: "skill",
            name: String(skill?.name || ""),
            aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
            loadLevel: "body",
            checksum: String(skill?.contentHash || contextItemChecksum({ name: skill?.name })),
            loadSource: "post_compact_restored",
            tokens: Math.max(0, Number(skill?.tokenCount || 0)),
        })),
        ...(Array.isArray(results) ? results : []).filter((row) => row?.toolKind === "skill" && row?.ok === true).map((row) => {
            let parsed = null;
            try {
                parsed = typeof row?.output === "string" ? JSON.parse(row.output) : row?.output;
            }
            catch { }
            const result = parsed?.result && typeof parsed.result === "object" ? parsed.result : parsed;
            return {
                kind: "skill",
                name: String(row?.itemName || result?.name || row?.name || ""),
                aliases: Array.isArray(row?.aliases) ? row.aliases : [],
                loadLevel: "body",
                checksum: String(result?.contentHash || row?.resultChecksum || contextItemChecksum(row?.output)),
                loadSource: "same_run",
                tokens: Math.max(0, Number(row?.outputTokens || 0)),
            };
        }),
    ].filter(item => item.name);
    const mcp = toolContext.catalog.mcp.map((tool) => ({
        kind: "mcp",
        name: String(tool?.canonicalName || tool?.name || ""),
        aliases: [
            String(tool?.canonicalName || ""),
            String(tool?.server || ""),
            tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "",
            String(tool?.name || ""),
        ].filter(Boolean),
        loadLevel: "schema",
        checksum: contextItemChecksum({
            canonicalName: tool?.canonicalName || tool?.name,
            server: tool?.server,
            inputSchema: tool?.inputSchema || null,
            annotations: tool?.annotations || {},
        }),
        loadSource: toolContext.postCompactRestoreReceipt?.loadedToolNames?.includes(String(tool?.canonicalName || tool?.name || ""))
            ? "post_compact_restored"
            : tool?.alwaysLoad === true ? "always_load" : "same_run",
        tokens: (0, context_budget_1.estimateTextTokens)(JSON.stringify({ description: tool?.description || "", inputSchema: tool?.inputSchema || null })),
    })).filter(item => item.name);
    const invocations = (Array.isArray(results) ? results : []).map((row) => ({
        kind: row?.toolKind === "skill" ? "skill" : "mcp",
        name: String(row?.itemName || row?.name || ""),
        aliases: Array.isArray(row?.aliases) ? row.aliases.map((value) => String(value || "")).filter(Boolean) : [],
        ok: row?.ok === true,
        resultChecksum: String(row?.resultChecksum || contextItemChecksum(row?.output ?? row?.error ?? null)),
    })).filter(item => item.name);
    return { schema: "ccm-loaded-context-items-v1", skills, mcp, invocations };
}
async function executeMainAgentToolRequests(input) {
    const workspaceTools = [...input.toolContext.catalog.mcp, ...(input.toolContext.catalog.discoverableMcp || [])]
        .filter((tool) => tool?.server === "ccm__workspace_readonly");
    const workspaceByName = new Map();
    for (const tool of workspaceTools) {
        workspaceByName.set(String(tool.name || ""), tool);
        workspaceByName.set(String(tool.canonicalName || ""), tool);
    }
    const allowedMcp = new Set(input.toolContext.catalog.mcp.map(tool => tool.canonicalName));
    const allowedSkills = new Set(input.toolContext.catalog.skills.map(skill => skill.name));
    const execute = input.executeToolCall || ((name, args, scope) => tool_manager_1.toolManager.executeToolCall(name, args, scope));
    const results = [];
    for (const request of input.requests.slice(0, 2)) {
        if (request.name === "tool_search") {
            const callId = input.onUse?.(request) || "";
            const rawQuery = String(request.arguments?.query || request.arguments?.name || "").trim();
            const query = rawQuery.toLowerCase().replace(/^select:\s*/, "");
            const requestedNames = new Set(query.split(/[\s,]+/).map(value => value.trim()).filter(Boolean));
            const discoverable = input.toolContext.catalog.discoverableMcp || [];
            const exact = discoverable.filter((tool) => requestedNames.has(String(tool.name || "").toLowerCase()) || requestedNames.has(String(tool.canonicalName || "").toLowerCase()));
            const candidates = (exact.length ? exact : discoverable.filter((tool) => !query || `${tool.name} ${tool.canonicalName} ${tool.description}`.toLowerCase().includes(query))).slice(0, 12);
            for (const tool of candidates) {
                if (!input.toolContext.catalog.mcp.some((row) => row.canonicalName === tool.canonicalName))
                    input.toolContext.catalog.mcp.push(tool);
            }
            const selectedNames = new Set(candidates.map((tool) => String(tool.canonicalName || "")));
            input.toolContext.catalog.discoverableMcp = discoverable.filter((tool) => !selectedNames.has(String(tool.canonicalName || "")));
            refreshMainAgentToolPromptState(input.toolContext);
            const output = { schema: "ccm-main-agent-tool-search-v1", query, tools: candidates.map((tool) => ({ name: tool.name, canonicalName: tool.canonicalName, description: tool.description, inputSchema: tool.inputSchema, checksum: tool.checksum })) };
            (0, main_agent_post_compact_continuity_1.recordMainAgentToolContinuityFromResult)({
                identity: input.toolContext.scopeIdentity,
                requestName: request.name,
                requestArguments: request.arguments,
                loadedTools: candidates,
                eventId: String(callId || ""),
                sourceMessageId: String(input.toolContext.scope.auditContext?.userMessageId || ""),
            });
            input.onResult?.(request, String(callId || ""), output);
            results.push({ name: request.name, itemName: request.name, toolKind: "native", source: "native", loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: 0, aliases: ["tool_search"], ok: true, output: JSON.stringify(output), outputTokens: (0, context_budget_1.estimateTextTokens)(JSON.stringify(output)), resultChecksum: contextItemChecksum(output), reason: request.reason });
            continue;
        }
        const skillName = request.name === "invoke_skill" ? String(request.arguments?.name || "").trim() : "";
        const workspaceTool = workspaceByName.get(request.name);
        const toolKind = skillName ? "skill" : workspaceTool ? "internal_mcp" : "mcp";
        const itemName = skillName || workspaceTool?.name || request.name;
        const aliases = skillName
            ? [skillName, `skill:${skillName}`]
            : [request.name, ...input.toolContext.catalog.mcp
                    .filter((tool) => tool?.canonicalName === request.name)
                    .flatMap((tool) => [tool?.server, tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "", tool?.name])]
                .map(value => String(value || ""))
                .filter(Boolean);
        const workspaceLoaded = workspaceTool && input.toolContext.catalog.mcp.some((tool) => tool.canonicalName === workspaceTool.canonicalName);
        const deferredTool = (input.toolContext.catalog.discoverableMcp || []).find((tool) => request.name === tool.canonicalName || request.name === tool.name);
        if (!(skillName ? allowedSkills.has(skillName) : workspaceTool ? workspaceLoaded : allowedMcp.has(request.name))) {
            const error = deferredTool ? "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED" : "MAIN_AGENT_TOOL_NOT_AUTHORIZED";
            results.push({ name: request.name, itemName, toolKind, aliases, ok: false, error, resultChecksum: contextItemChecksum(error), reason: request.reason });
            continue;
        }
        const callId = String(input.onUse?.(request) || "");
        const startedAt = Date.now();
        try {
            const rawOutput = workspaceTool
                ? await (0, workspace_readonly_tools_1.executeWorkspaceReadonlyTool)(workspaceTool.name, request.arguments, String(input.toolContext.capabilityToken || ""))
                : await execute(request.name, request.arguments, input.toolContext.scope);
            const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
            const outputTokens = (0, context_budget_1.estimateTextTokens)(output);
            if (outputTokens > Math.max(1, Number(input.resultTokenLimit || 8_000))) {
                const error = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET";
                input.onResult?.(request, callId, null, error);
                results.push({ name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: false, error, outputTokens, resultChecksum: contextItemChecksum(error), reason: request.reason });
                continue;
            }
            input.onResult?.(request, callId, rawOutput);
            (0, main_agent_post_compact_continuity_1.recordMainAgentToolContinuityFromResult)({
                identity: input.toolContext.scopeIdentity,
                requestName: request.name,
                requestArguments: request.arguments,
                rawOutput,
                eventId: callId,
                sourceMessageId: String(input.toolContext.scope.auditContext?.userMessageId || ""),
            });
            results.push({ name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: !/^\[(?:错误|工具错误)\]/.test(output), output, outputTokens, resultChecksum: contextItemChecksum(rawOutput), reason: request.reason });
        }
        catch (error) {
            const detail = String(error?.message || error || "工具调用失败").slice(0, 1000);
            input.onResult?.(request, callId, null, detail);
            results.push({ name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: false, error: detail, resultChecksum: contextItemChecksum(detail), reason: request.reason });
        }
    }
    return results;
}
//# sourceMappingURL=main-agent-tool-runtime.js.map