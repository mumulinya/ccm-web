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
exports.buildGlobalAgentToolRuntimeContext = buildGlobalAgentToolRuntimeContext;
exports.executeGlobalAgentAuthorizedTool = executeGlobalAgentAuthorizedTool;
exports.runGlobalAgentToolAuthorizationSelfTest = runGlobalAgentToolAuthorizationSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const tool_manager_1 = require("../../tools/tool-manager");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
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
function buildGlobalAgentToolRuntimeContext(auditContext = {}) {
    const authorization = getGlobalAgentToolAuthorizationPayload();
    const shared = (0, main_agent_tool_runtime_1.buildMainAgentToolRuntimeContext)({
        configuredTools: authorization.tools,
        mcpPolicy: "all",
        label: "全局 Agent",
        auditContext: {
            runtime: "global-agent",
            project: "",
            groupId: "",
            taskId: String(auditContext?.taskId || ""),
            executionId: String(auditContext?.executionId || ""),
            source: String(auditContext?.source || "global-agent"),
        },
    });
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
async function executeGlobalAgentAuthorizedTool(kind, input, auditContext = {}) {
    const runtime = buildGlobalAgentToolRuntimeContext(auditContext);
    if (runtime.authorization_readiness?.dispatchReady !== true) {
        throw new Error("全局 Agent 工具授权存在缺失、断连或无效项，请先在工具配置中处理");
    }
    if (kind === "skill") {
        const name = String(input?.name || input?.skill || "").trim();
        if (!runtime.catalog.skills.some(row => row.name === name))
            throw new Error(`Skill 未授权给全局 Agent：${name || "未指定"}`);
        const output = await tool_manager_1.toolManager.executeToolCall("invoke_skill", { name, input: input?.input ?? input?.context ?? "" }, runtime.scope);
        return { success: true, kind, name, result: parseToolResult(output), authorization_checksum: runtime.checksum };
    }
    const toolName = resolveMcpToolName(input?.tool_name || input?.toolName || input?.name, runtime.catalog.tools);
    const args = input?.arguments && typeof input.arguments === "object" && !Array.isArray(input.arguments)
        ? input.arguments
        : input?.args && typeof input.args === "object" && !Array.isArray(input.args)
            ? input.args
            : {};
    const output = await tool_manager_1.toolManager.executeToolCall(toolName, args, runtime.scope);
    return { success: true, kind, name: toolName, result: parseToolResult(output), authorization_checksum: runtime.checksum };
}
function runGlobalAgentToolAuthorizationSelfTest() {
    const normalized = (0, tool_authorization_1.normalizeToolAuthorization)({
        mcp: ["demo/read", "demo/read", "demo"],
        skill: ["release-notes", "release-notes"],
    });
    return {
        pass: normalized.mcp.length === 1 && normalized.mcp[0] === "demo" && normalized.skill.length === 1,
        normalized,
        storage_file: GLOBAL_AGENT_TOOL_AUTHORIZATION_FILE,
    };
}
//# sourceMappingURL=global-agent-tool-authorization.js.map