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
exports.buildMainAgentCapabilityDirectoryV1 = buildMainAgentCapabilityDirectoryV1;
exports.buildMainAgentContextEnvelopeV1 = buildMainAgentContextEnvelopeV1;
exports.alignMainAgentContextEnvelopeTokens = alignMainAgentContextEnvelopeTokens;
exports.mainAgentLoadedContextChecksums = mainAgentLoadedContextChecksums;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function clean(value, max = 240) {
    return String(value ?? "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function tokenCount(value) {
    if (value == null || value === "")
        return 0;
    return Math.max(0, Math.floor((0, context_budget_1.estimateTextTokens)(typeof value === "string" ? value : JSON.stringify(value))));
}
function uniqueNames(values, max = 120) {
    return Array.from(new Set(values.map(value => clean(value, 180)).filter(Boolean))).slice(0, max);
}
function uniqueChecksums(values) {
    return Array.from(new Set(values.map(value => clean(value, 128)).filter(value => /^[a-f0-9]{16,128}$/i.test(value)))).slice(0, 120);
}
function toolName(tool) {
    return clean(tool?.canonicalName || tool?.function?.name || tool?.name, 180);
}
function isToolResultMessage(message) {
    const role = String(message?.role || message?.message?.role || "").toLowerCase();
    if (["tool", "function"].includes(role))
        return true;
    const content = message?.content ?? message?.message?.content;
    return Array.isArray(content) && content.some((block) => ["tool_result", "function_result", "web_search_tool_result"].includes(String(block?.type || "")));
}
function isDirectorySystemMessage(message) {
    const layer = String(message?.ccm_context_layer || message?.contextLayer || "").toLowerCase();
    const blockType = String(message?.contextBlockType || message?.context_block_type || "").toLowerCase();
    return layer === "scope_directory" || layer === "capability_directory" || blockType === "mcp" || blockType === "skills" || blockType === "scope_instructions";
}
function catalogGroup(input) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const invokedNames = new Set(uniqueNames(input.invokedNames || []).map(name => name.toLowerCase()));
    const names = uniqueNames(rows.map(row => row?.name || row?.canonicalName));
    const loaded = rows.filter(row => ["schema", "body", "result"].includes(String(row?.loadLevel || row?.level || ""))).length;
    const invoked = rows.filter(row => invokedNames.has(toolName(row).toLowerCase()) || String(row?.loadLevel || "") === "result").length;
    return {
        available: Math.max(names.length, Math.floor(Number(input.available ?? rows.length) || 0)),
        catalogVisible: Math.max(0, Math.floor(Number(input.catalogVisible ?? names.length) || 0)),
        loaded,
        invoked,
        tokens: rows.reduce((sum, row) => sum + Math.max(0, Math.floor(Number(row?.tokens || 0))), 0),
        names,
        readTools: uniqueNames(input.readTools || [], 12),
        contentStored: false,
    };
}
function buildMainAgentCapabilityDirectoryV1(input) {
    const loaded = input.loadedContextItems || {};
    const toolContext = input.toolContext || {};
    const invocationNames = (Array.isArray(loaded.invocations) ? loaded.invocations : []).map((row) => row?.name);
    const invocationSet = new Set(uniqueNames(invocationNames).map(name => name.toLowerCase()));
    const skills = Array.isArray(loaded.skills) ? loaded.skills : [];
    const mcp = Array.isArray(loaded.mcp) ? loaded.mcp : [];
    const loadedRows = [
        ...(Array.isArray(loaded.systemTools) ? loaded.systemTools : []),
        ...skills,
        ...mcp,
    ];
    const resultTokens = (names) => {
        const wanted = new Set(names.map(name => name.toLowerCase()));
        return loadedRows.reduce((sum, row) => wanted.has(toolName(row).toLowerCase())
            ? sum + Math.max(0, Math.floor(Number(row?.tokens || 0)))
            : sum, 0);
    };
    const nativeNames = uniqueNames((toolContext?.catalog?.native || []).map((row) => row?.name));
    const capabilityNames = new Set(uniqueNames([
        ...nativeNames,
        ...(toolContext?.catalog?.mcp || []).map((row) => row?.canonicalName || row?.name),
        ...(toolContext?.catalog?.loadedMcp || []).map((row) => row?.canonicalName || row?.name),
        ...mcp.map((row) => row?.name),
    ]).map(name => name.toLowerCase()));
    const scopeRows = (input.scopeInstructions?.names || []).map(name => ({ name, loadLevel: "catalog", tokens: 0 }));
    const sharedRows = (input.sharedFiles?.names || []).map(name => ({ name, loadLevel: "catalog", tokens: 0 }));
    const scopeInstructionInvoked = invocationSet.has("read_scope_instruction");
    const sharedFileReadTools = uniqueNames([
        input.sharedFiles?.readTool,
        "read_group_shared_files",
        "read_global_shared_files",
    ].filter(Boolean));
    const sharedFilesInvoked = sharedFileReadTools.some(name => invocationSet.has(name.toLowerCase()));
    const knowledgeInvoked = invocationSet.has("query_knowledge") || invocationSet.has("query_global_memory");
    const memberProjects = (input.memberProjects || []).map(project => ({
        projectId: clean(project?.projectId || project?.id || project?.name, 180),
        name: clean(project?.name || project?.projectId || project?.id, 180),
    })).filter(project => project.projectId).sort((left, right) => left.projectId.localeCompare(right.projectId));
    const core = {
        identity: {
            scope: input.scope,
            scopeId: clean(input.scopeId, 180),
            exactSessionId: clean(input.exactSessionId, 180),
            generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        },
        scopeInstructions: {
            ...catalogGroup({ rows: scopeRows, available: input.scopeInstructions?.available, readTools: ["read_scope_instruction"] }),
            loaded: Math.max(scopeInstructionInvoked ? 1 : 0, Math.floor(Number(input.scopeInstructions?.loaded ?? (toolContext?.loadedContext ? 1 : 0)) || 0)),
            invoked: scopeInstructionInvoked ? 1 : 0,
            tokens: Math.max(resultTokens(["read_scope_instruction"]), Math.floor(Number(input.scopeInstructions?.tokens || 0))),
        },
        sharedFiles: {
            ...catalogGroup({ rows: sharedRows, available: input.sharedFiles?.available, readTools: input.sharedFiles?.readTool ? [input.sharedFiles.readTool] : [] }),
            loaded: Math.max(sharedFilesInvoked ? 1 : 0, Math.floor(Number(input.sharedFiles?.loaded || 0))),
            invoked: sharedFilesInvoked ? 1 : 0,
            tokens: Math.max(resultTokens(sharedFileReadTools), Math.floor(Number(input.sharedFiles?.tokens || 0))),
        },
        knowledge: {
            ...catalogGroup({
                rows: capabilityNames.has("query_knowledge") ? [{ name: "知识库", loadLevel: "catalog", tokens: 0 }] : [],
                available: capabilityNames.has("query_knowledge") ? 1 : 0,
                readTools: capabilityNames.has("query_knowledge") ? ["query_knowledge"] : [],
            }),
            loaded: knowledgeInvoked ? 1 : 0,
            invoked: knowledgeInvoked ? 1 : 0,
            tokens: resultTokens(["query_knowledge", "query_global_memory"]),
        },
        skills: catalogGroup({ rows: skills, invokedNames: invocationNames, available: toolContext?.catalog?.skills?.length }),
        mcp: catalogGroup({ rows: mcp, invokedNames: invocationNames, available: (toolContext?.catalog?.mcp || []).length + (toolContext?.catalog?.discoverableMcp || []).length }),
        memberProjects,
    };
    return {
        schema: "ccm-main-agent-capability-directory-v1",
        ...core,
        checksum: digest(core),
        contentStored: false,
    };
}
function buildMainAgentContextEnvelopeV1(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const systemMessages = messages.filter(message => String(message?.role || message?.message?.role || "").toLowerCase() === "system");
    const directoryMessages = systemMessages.filter(isDirectorySystemMessage);
    const stableMessages = systemMessages.filter(message => !isDirectorySystemMessage(message));
    const nonSystem = messages.filter(message => String(message?.role || message?.message?.role || "").toLowerCase() !== "system");
    const lastUserIndex = nonSystem.reduce((found, message, index) => String(message?.role || message?.message?.role || "").toLowerCase() === "user" ? index : found, -1);
    const turnContext = lastUserIndex >= 0 ? [nonSystem[lastUserIndex]] : [];
    const toolResults = nonSystem.filter((message, index) => index !== lastUserIndex && isToolResultMessage(message));
    const sessionContext = nonSystem.filter((message, index) => index !== lastUserIndex && !isToolResultMessage(message));
    const stablePrefix = { system: stableMessages, tools: input.tools || [] };
    const scopeDirectory = { messages: directoryMessages, capabilityDirectory: input.capabilityDirectory };
    return {
        schema: "ccm-main-agent-context-envelope-v1",
        identity: {
            scope: input.scope,
            scopeId: clean(input.scopeId, 180),
            exactSessionId: clean(input.exactSessionId, 180),
            generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        },
        stablePrefixChecksum: digest(stablePrefix),
        scopeDirectoryChecksum: digest(scopeDirectory),
        capabilityDirectoryChecksum: input.capabilityDirectory.checksum,
        sessionContextChecksum: digest(sessionContext),
        loadedContextChecksums: uniqueChecksums(input.loadedContextChecksums || []),
        turnContextChecksum: digest(turnContext),
        toolResultsChecksum: digest(toolResults),
        layerTokens: {
            stablePrefix: tokenCount(stablePrefix),
            scopeDirectory: tokenCount(directoryMessages),
            sessionContext: tokenCount(sessionContext),
            turnContext: tokenCount(turnContext),
            toolResults: tokenCount(toolResults),
        },
        contentStored: false,
    };
}
function alignMainAgentContextEnvelopeTokens(envelope, totalTokensInput) {
    if (!envelope)
        return undefined;
    const totalTokens = Math.max(0, Math.floor(Number(totalTokensInput || 0)));
    const entries = Object.entries(envelope.layerTokens);
    const measured = entries.reduce((sum, [, value]) => sum + Math.max(0, Number(value || 0)), 0);
    const layerTokens = {};
    let used = 0;
    entries.forEach(([key, value], index) => {
        const next = index === entries.length - 1
            ? totalTokens - used
            : measured > 0 ? Math.floor((Math.max(0, Number(value || 0)) / measured) * totalTokens) : 0;
        layerTokens[key] = Math.max(0, next);
        used += layerTokens[key];
    });
    return { ...envelope, layerTokens };
}
function mainAgentLoadedContextChecksums(loadedContextItems) {
    const rows = [
        ...(Array.isArray(loadedContextItems?.systemTools) ? loadedContextItems.systemTools : []),
        ...(Array.isArray(loadedContextItems?.skills) ? loadedContextItems.skills : []),
        ...(Array.isArray(loadedContextItems?.mcp) ? loadedContextItems.mcp : []),
    ];
    return uniqueChecksums(rows.filter(row => ["body", "schema", "result"].includes(String(row?.loadLevel || ""))).map(row => row?.checksum));
}
//# sourceMappingURL=main-agent-context-envelope.js.map