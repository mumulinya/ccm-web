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
    if (/(?:create|add|update|edit|set|write|delete|remove|clear|send|post|publish|upload|move|copy|rename|execute|run|start|stop|restart|deploy|install|uninstall|merge|commit|push|apply|approve|reject|cancel|archive|restore|trigger|invoke|dispatch|assign|grant|revoke|login|logout|authenticate|pay|refund)/i.test(name))
        return false;
    if (annotations.readOnlyHint === true)
        return true;
    return /^(?:get|list|read|search|query|find|fetch|lookup|inspect|check|status|describe|resolve|preview|view|show|count|validate|verify|compare|diff|history|manifest)/i.test(name);
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
    const mcp = readOnly ? scoped.tools.filter(isMainAgentReadOnlyMcpTool) : scoped.tools;
    const rejectedMcp = readOnly ? scoped.tools.filter(tool => !isMainAgentReadOnlyMcpTool(tool)) : [];
    const toolAudit = tool_manager_1.toolManager.buildScopeAudit(scope);
    const label = String(input.label || "主 Agent");
    const mcpPrompt = mcp.length ? [
        `${label}已授权的${readOnly ? "只读" : ""} MCP 工具（必须使用 canonicalName）：`,
        ...mcp.map(tool => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
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
    const policyPrompt = (mcpPrompt || skillPrompt || rejectedMcp.length || unavailable.length) ? [
        mcpPrompt,
        skillPrompt,
        rejectedMcp.length ? `以下 MCP 可能写入或产生副作用，不向${label}开放：${rejectedMcp.map(tool => tool.canonicalName).join(", ")}` : "",
        unavailable.length ? "部分已配置工具当前不可用；不得声称已经调用。" : "",
        `需要工具数据时在 toolRequests 中请求。MCP只能使用上面列出的 canonicalName；Skill只能使用 invoke_skill，并在 arguments.name 中填写已列出的 Skill。工具结果由CCM执行后重新交给模型，不得把请求本身视为完成。`,
    ].filter(Boolean).join("\n\n") : "";
    const checksum = crypto.createHash("sha256").update(JSON.stringify({ effective, mcp: mcp.map(row => row.canonicalName), skills: scoped.skills.map(row => row.name), auditContext: scope.auditContext || {} })).digest("hex");
    return {
        schema: "ccm-main-agent-tool-runtime-context-v1",
        scope,
        configured,
        executionSkills,
        effective,
        catalog: { mcp, skills: scoped.skills, rejectedMcp },
        toolAudit,
        mcpPrompt,
        skillPrompt,
        policyPrompt,
        checksum,
    };
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
        })),
        ...additionalSkills.map(skill => ({
            kind: "skill",
            name: String(skill?.name || ""),
            aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
            loadLevel: skill?.loadLevel === "catalog" ? "catalog" : "body",
            checksum: String(skill?.contentHash || skill?.checksum || contextItemChecksum({ name: skill?.name })),
        })),
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
    const allowedMcp = new Set(input.toolContext.catalog.mcp.map(tool => tool.canonicalName));
    const allowedSkills = new Set(input.toolContext.catalog.skills.map(skill => skill.name));
    const execute = input.executeToolCall || ((name, args, scope) => tool_manager_1.toolManager.executeToolCall(name, args, scope));
    const results = [];
    for (const request of input.requests.slice(0, 2)) {
        const skillName = request.name === "invoke_skill" ? String(request.arguments?.name || "").trim() : "";
        const toolKind = skillName ? "skill" : "mcp";
        const itemName = skillName || request.name;
        const aliases = skillName
            ? [skillName, `skill:${skillName}`]
            : [request.name, ...input.toolContext.catalog.mcp
                    .filter((tool) => tool?.canonicalName === request.name)
                    .flatMap((tool) => [tool?.server, tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "", tool?.name])]
                .map(value => String(value || ""))
                .filter(Boolean);
        if (!(skillName ? allowedSkills.has(skillName) : allowedMcp.has(request.name))) {
            results.push({ name: request.name, itemName, toolKind, aliases, ok: false, error: "MAIN_AGENT_TOOL_NOT_AUTHORIZED", resultChecksum: contextItemChecksum("MAIN_AGENT_TOOL_NOT_AUTHORIZED"), reason: request.reason });
            continue;
        }
        const callId = String(input.onUse?.(request) || "");
        try {
            const rawOutput = await execute(request.name, request.arguments, input.toolContext.scope);
            const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
            const outputTokens = (0, context_budget_1.estimateTextTokens)(output);
            if (outputTokens > Math.max(1, Number(input.resultTokenLimit || 8_000))) {
                const error = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET";
                input.onResult?.(request, callId, null, error);
                results.push({ name: request.name, itemName, toolKind, aliases, ok: false, error, outputTokens, resultChecksum: contextItemChecksum(error), reason: request.reason });
                continue;
            }
            input.onResult?.(request, callId, rawOutput);
            results.push({ name: request.name, itemName, toolKind, aliases, ok: !/^\[(?:错误|工具错误)\]/.test(output), output, outputTokens, resultChecksum: contextItemChecksum(rawOutput), reason: request.reason });
        }
        catch (error) {
            const detail = String(error?.message || error || "工具调用失败").slice(0, 1000);
            input.onResult?.(request, callId, null, detail);
            results.push({ name: request.name, itemName, toolKind, aliases, ok: false, error: detail, resultChecksum: contextItemChecksum(detail), reason: request.reason });
        }
    }
    return results;
}
//# sourceMappingURL=main-agent-tool-runtime.js.map