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
exports.loadGlobalAgentToolAuthorization = loadGlobalAgentToolAuthorization;
exports.getGlobalAgentToolAuthorizationPayload = getGlobalAgentToolAuthorizationPayload;
exports.saveGlobalAgentToolAuthorization = saveGlobalAgentToolAuthorization;
exports.resolveGlobalAgentExecutionSkills = resolveGlobalAgentExecutionSkills;
exports.resolveGlobalAgentExecutionSkillsFromRun = resolveGlobalAgentExecutionSkillsFromRun;
exports.buildGlobalAgentToolRuntimeContext = buildGlobalAgentToolRuntimeContext;
exports.executeGlobalAgentAuthorizedTool = executeGlobalAgentAuthorizedTool;
exports.runGlobalAgentToolAuthorizationSelfTest = runGlobalAgentToolAuthorizationSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const tool_manager_1 = require("../../tools/tool-manager");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const workspace_readonly_tools_1 = require("../../tools/workspace-readonly-tools");
const main_agent_post_compact_continuity_1 = require("../../system/main-agent-post-compact-continuity");
const native_query_loop_1 = require("../../agents/native-query-loop");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
const main_agent_context_policy_1 = require("../../tools/main-agent-context-policy");
const role_skills_1 = require("../../skills/role-skills");
const global_tool_load_policy_1 = require("../../agents/global/global-tool-load-policy");
const tool_authorization_1 = require("../../tools/tool-authorization");
const GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE = path.join(utils_1.CCM_DIR, "global-agent-tool-authorization.json");
function emptyStore() {
    return {
        schema: "ccm-global-agent-tool-authorization-v1",
        tools: { mcp: [], skill: [] },
        updated_at: "",
        updated_by: "",
    };
}
function cleanActor(value) {
    return String(value || "api").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, 120) || "api";
}
function readStore() {
    for (const candidate of [GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE, `${GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            return {
                schema: "ccm-global-agent-tool-authorization-v1",
                tools: (0, tool_authorization_1.normalizeToolAuthorization)(parsed?.tools || {}),
                updated_at: String(parsed?.updated_at || parsed?.updatedAt || ""),
                updated_by: cleanActor(parsed?.updated_by || parsed?.updatedBy || "api"),
            };
        }
        catch { }
    }
    return emptyStore();
}
function writeStore(store) {
    fs.mkdirSync(path.dirname(GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE), { recursive: true });
    const temp = `${GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE)) {
        try {
            fs.copyFileSync(GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE, `${GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf-8");
    fs.renameSync(temp, GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE);
}
function loadGlobalAgentToolAuthorization() {
    return readStore();
}
function getGlobalAgentToolAuthorizationPayload() {
    const store = readStore();
    return { ...store, ...(0, tool_authorization_1.buildToolAuthorizationPayload)(store.tools) };
}
async function saveGlobalAgentToolAuthorization(input = {}) {
    const previous = readStore();
    const tools = (0, tool_authorization_1.normalizeToolAuthorization)(input?.tools || input);
    const actor = cleanActor(input?.actor || input?.updated_by || input?.updatedBy || "api");
    const payload = await (0, tool_authorization_1.buildFreshToolAuthorizationPayload)(tools);
    const store = {
        schema: "ccm-global-agent-tool-authorization-v1",
        tools,
        updated_at: new Date().toISOString(),
        updated_by: actor,
    };
    writeStore(store);
    const authorizationChange = (0, tool_authorization_1.recordToolAuthorizationChange)({
        scope: "global",
        scopeId: "global-agent",
        previous: previous.tools,
        next: tools,
        actor,
        source: "/api/global-agent/tools",
        toolAudit: payload.tool_audit,
        authorizationReadiness: payload.authorization_readiness,
    });
    return { ...store, ...payload, authorization_change: authorizationChange };
}
function resolveGlobalAgentExecutionSkills(input = {}) {
    return (0, role_skills_1.buildRoleSkillPrompt)("global-agent", String(input.message || ""), {
        source: String(input.source || ""),
        phase: "planning",
        selectedSkillNames: Array.isArray(input.workflowDecision?.selectedSkills) ? input.workflowDecision.selectedSkills : [],
        modelDecision: input.workflowDecision || null,
    }).names;
}
function resolveGlobalAgentExecutionSkillsFromRun(run) {
    return resolveGlobalAgentExecutionSkills({
        message: run?.reasoning_loop?.effective_goal || run?.user_message || "",
        source: run?.source || "",
        workflowDecision: run?.workflow_decision || run?.workflowDecision || null,
    });
}
function buildGlobalAgentToolRuntimeContext(auditContext = {}, loadedToolNames = [], options = {}) {
    const authorization = getGlobalAgentToolAuthorizationPayload();
    const orchestratorConfig = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const contextPolicy = (0, main_agent_context_policy_1.resolveMainAgentContextPolicy)(orchestratorConfig);
    const executionSkills = Array.from(new Set((options.executionSkills || []).map(value => String(value || "").trim()).filter(Boolean)));
    const shared = (0, main_agent_tool_runtime_1.buildMainAgentToolRuntimeContext)({
        configuredTools: authorization.tools,
        executionSkills,
        mcpPolicy: "all",
        label: "全局 Agent",
        auditContext: {
            runtime: "global-agent",
            project: "",
            groupId: "",
            taskId: String(auditContext?.taskId || ""),
            executionId: String(auditContext?.executionId || ""),
            sessionId: String(auditContext?.sessionId || ""),
            source: String(auditContext?.source || "global-agent"),
        },
        scopeIdentity: {
            scope: "global",
            scopeId: "global-agent",
            exactSessionId: String(auditContext?.sessionId || auditContext?.executionId || auditContext?.taskId || "global-agent-runtime"),
            allowedProjects: [],
        },
        loadedToolNames,
        contextPolicy: contextPolicy.effective,
        contextWindow: (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(orchestratorConfig).contextWindow,
        schemaSurface: (0, native_query_loop_1.shouldUseNativeQueryLoop)(orchestratorConfig) ? "native" : "prompt",
    });
    (0, main_agent_tool_runtime_1.registerMainAgentDiscoverableTools)(shared, (0, global_tool_load_policy_1.globalDiscoverableManagementTools)(loadedToolNames));
    const catalog = { tools: shared.catalog.mcp, skills: shared.catalog.skills };
    return {
        schema: "ccm-global-agent-tool-runtime-context-v1",
        tools: authorization.tools,
        tool_audit: authorization.tool_audit,
        authorization_readiness: authorization.authorization_readiness,
        connection_preflight: authorization.connection_preflight,
        catalog,
        counts: { mcp: catalog.tools.length, skill: catalog.skills.length },
        configured_counts: { mcp: authorization.tools.mcp.length, skill: authorization.tools.skill.length },
        checksum: shared.checksum,
        scope: shared.scope,
        capability_token: shared.capabilityToken || "",
        loaded_tool_names: shared.loadedToolNames || [],
        discoverable_tools: shared.catalog.discoverableMcp || [],
        deferred_tool_names: shared.deferredToolNames || [],
        scope_identity: shared.scopeIdentity,
        restored_skill_attachments: shared.restoredSkillAttachments || [],
        post_compact_restore_receipt: shared.postCompactRestoreReceipt || null,
        context_policy: contextPolicy,
        context_budget: shared.contextBudget || null,
        policy_prompt: shared.policyPrompt,
        mcp_prompt: shared.mcpPrompt,
        execution_skills: executionSkills,
        updated_at: authorization.updated_at,
        updated_by: authorization.updated_by,
    };
}
function resolveMcpToolName(rawName, catalog) {
    const name = String(rawName || "").trim();
    if (!name)
        throw new Error("缺少 MCP 工具名称");
    const exact = catalog.filter(row => name === row.canonicalName || name === `${row.server}/${row.name}`);
    if (exact.length === 1)
        return exact[0].canonicalName;
    const short = catalog.filter(row => name === row.name);
    if (short.length === 1)
        return short[0].canonicalName;
    if (short.length > 1)
        throw new Error(`MCP 工具名称不唯一，请使用完整名称：${name}`);
    throw new Error(`MCP 工具未授权给全局 Agent：${name}`);
}
function parseToolResult(value) {
    const text = String(value || "");
    if (/^\[错误\]/.test(text.trim()))
        throw new Error(text.replace(/^\[错误\]\s*/, ""));
    try {
        return JSON.parse(text);
    }
    catch {
        return { content: text };
    }
}
async function executeGlobalAgentAuthorizedTool(kind, input, auditContext = {}, loadedToolNames = [], options = {}) {
    const executionSkills = Array.from(new Set((options.executionSkills || []).map(value => String(value || "").trim()).filter(Boolean)));
    const runtime = buildGlobalAgentToolRuntimeContext(auditContext, loadedToolNames, { executionSkills });
    if (kind === "skill") {
        const name = String(input?.name || input?.skill || "").trim();
        const isExecutionSkill = executionSkills.includes(name);
        if (!isExecutionSkill && runtime.authorization_readiness?.dispatchReady !== true) {
            throw new Error("全局 Agent 工具授权存在缺失、断连或无效项，请先在工具配置中处理");
        }
        if (!runtime.catalog.skills.some(row => row.name === name))
            throw new Error(`Skill 未授权给全局 Agent：${name || "未指定"}`);
        const output = await tool_manager_1.toolManager.executeToolCall("invoke_skill", { name, input: input?.input ?? input?.context ?? "" }, runtime.scope);
        const result = parseToolResult(output);
        (0, main_agent_post_compact_continuity_1.recordMainAgentToolContinuityFromResult)({
            identity: runtime.scope_identity,
            requestName: "invoke_skill",
            requestArguments: { name, input: input?.input ?? input?.context ?? "" },
            rawOutput: result,
            eventId: String(auditContext?.executionId || ""),
            sourceMessageId: String(auditContext?.userMessageId || ""),
        });
        return { success: true, kind, name, result, authorization_checksum: runtime.checksum };
    }
    if (runtime.authorization_readiness?.dispatchReady !== true) {
        throw new Error("全局 Agent 工具授权存在缺失、断连或无效项，请先在工具配置中处理");
    }
    const requestedName = input?.tool_name || input?.toolName || input?.name;
    const deferredMatch = runtime.discoverable_tools.find((row) => requestedName === row.canonicalName || requestedName === row.name || requestedName === `${row.server}/${row.name}`);
    if (deferredMatch)
        throw new Error(`MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED:${deferredMatch.canonicalName}`);
    const toolName = resolveMcpToolName(requestedName, runtime.catalog.tools);
    const args = input?.arguments && typeof input.arguments === "object" && !Array.isArray(input.arguments)
        ? input.arguments
        : input?.args && typeof input.args === "object" && !Array.isArray(input.args)
            ? input.args
            : {};
    const selected = runtime.catalog.tools.find(row => row.canonicalName === toolName);
    const output = selected?.server === "ccm__workspace_readonly"
        ? JSON.stringify(await (0, workspace_readonly_tools_1.executeWorkspaceReadonlyTool)(selected.name, args, runtime.capability_token, 3))
        : await tool_manager_1.toolManager.executeToolCall(toolName, args, runtime.scope);
    return { success: true, kind, name: toolName, result: parseToolResult(output), authorization_checksum: runtime.checksum };
}
function runGlobalAgentToolAuthorizationSelfTest() {
    const normalized = (0, tool_authorization_1.normalizeToolAuthorization)({
        mcp: ["demo/read", "demo/read", "demo"],
        skill: ["release-notes", "release-notes"],
    });
    const idleSkills = resolveGlobalAgentExecutionSkills({ message: "你好，介绍一下你自己" });
    const workSkills = resolveGlobalAgentExecutionSkills({ message: "继续全局路由任务", source: "task" });
    return {
        pass: normalized.mcp.length === 1 && normalized.mcp[0] === "demo" && normalized.skill.length === 1
            && idleSkills.length === 0
            && workSkills.includes("ccm-global-mission-lead"),
        normalized,
        idleSkills,
        workSkills,
        storage_file: GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE,
    };
}
//# sourceMappingURL=global-agent-tool-authorization.js.map