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
exports.KNOWLEDGE_CONTEXT_MCP_SERVER_NAME = void 0;
exports.buildKnowledgeContextMcpServerConfig = buildKnowledgeContextMcpServerConfig;
exports.runKnowledgeContextMcpServer = runKnowledgeContextMcpServer;
const path = __importStar(require("path"));
const knowledge_index_1 = require("../modules/knowledge/knowledge-index");
const knowledge_files_1 = require("../modules/knowledge/knowledge-files");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
exports.KNOWLEDGE_CONTEXT_MCP_SERVER_NAME = "ccm__knowledge_context";
function buildKnowledgeContextMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "knowledge-context-mcp.js"), context);
}
const tools = [
    {
        name: "get_project_context",
        description: "根据当前绑定任务目标，从允许的全局、群聊和项目知识范围中提取最相关资料并返回可追溯引用。",
        inputSchema: { type: "object", properties: { focus: { type: "string" }, limit: { type: "number", minimum: 1, maximum: 12 } }, additionalProperties: false },
    },
    {
        name: "search_knowledge",
        description: "检索当前 Agent 有权访问的知识库内容，返回来源文件、章节、引用标识和文本片段。",
        inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, limit: { type: "number", minimum: 1, maximum: 12 }, filename: { type: "string" } }, additionalProperties: false },
    },
    {
        name: "read_knowledge_document",
        description: "按知识库文件名读取当前范围允许的已解析文档内容，支持分页，不能读取任意本机路径。",
        inputSchema: { type: "object", required: ["filename"], properties: { filename: { type: "string" }, offset: { type: "number", minimum: 0 }, max_chars: { type: "number", minimum: 500, maximum: 30000 } }, additionalProperties: false },
    },
    {
        name: "list_citations",
        description: "列出当前 Agent 可访问的知识文档及可用于交付说明的引用标识。",
        inputSchema: { type: "object", properties: { limit: { type: "number", minimum: 1, maximum: 100 } }, additionalProperties: false },
    },
];
let indexReady = null;
function ensureIndex() {
    if (!indexReady)
        indexReady = (0, knowledge_index_1.rebuildKnowledgeIndex)("internal-mcp");
    return indexReady;
}
function scopeAllowed(metadata, context) {
    const scope = metadata?.scope || { type: "global", id: "" };
    if (metadata?.visibility === "restricted") {
        if (scope.type === "project")
            return scope.id === context.project;
        if (scope.type === "group")
            return !!context.groupId && scope.id === context.groupId;
        if (scope.type === "agent")
            return scope.id === context.project || scope.id === context.taskAgentSessionId;
        return false;
    }
    if (scope.type === "global")
        return true;
    if (scope.type === "project")
        return scope.id === context.project || context.role === "group-main-agent" && (context.projects || []).some(project => project.name === scope.id);
    if (scope.type === "group")
        return !!context.groupId && scope.id === context.groupId;
    if (scope.type === "agent")
        return scope.id === context.project || scope.id === context.taskAgentSessionId;
    return false;
}
async function scopedSearch(context, query, limit, filename = "") {
    await ensureIndex();
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const searches = [
        (0, knowledge_index_1.searchKnowledgeBase)(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "project", scopeId: context.project, includeGlobal: true }),
        ...(context.groupId ? [(0, knowledge_index_1.searchKnowledgeBase)(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "group", scopeId: context.groupId, includeGlobal: false })] : []),
    ];
    if (context.role === "group-main-agent") {
        for (const project of context.projects || []) {
            if (project.name && project.name !== context.project)
                searches.push((0, knowledge_index_1.searchKnowledgeBase)(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "project", scopeId: project.name, includeGlobal: false }));
        }
    }
    const rows = (await Promise.all(searches)).flatMap(result => result.results.map(item => ({ ...item, embeddingMode: result.embeddingMode, embeddingError: result.embeddingError })));
    const seen = new Set();
    return rows.filter(item => {
        const id = String(item.chunk.id || "");
        if (!id || seen.has(id) || !scopeAllowed(metadata[item.chunk.filename], context))
            return false;
        seen.add(id);
        return true;
    }).sort((a, b) => b.score - a.score).slice(0, limit).map(item => ({
        citation: item.chunk.id,
        filename: item.chunk.filename,
        heading: item.chunk.heading || "",
        text: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(item.chunk.text, 5000),
        score: Number(item.score.toFixed(4)),
        scope: metadata[item.chunk.filename]?.scope || { type: "global", id: "" },
        source: metadata[item.chunk.filename]?.source || { type: "manual" },
    }));
}
async function callTool(context, name, args) {
    if (name === "get_project_context") {
        const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
        const focus = internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.focus, 1200);
        const query = [task.business_goal || task.description || task.title, task.acceptance_criteria, focus].flat().filter(Boolean).join("\n");
        const results = await scopedSearch(context, query, Math.max(1, Math.min(12, Number(args?.limit || 6))));
        return { success: true, query, results, citations: results.map(item => item.citation), scope: { project: context.project, group_id: context.groupId, includes_global: true } };
    }
    if (name === "search_knowledge") {
        const query = internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.query, 2000);
        if (!query)
            throw new Error("知识检索问题不能为空");
        const results = await scopedSearch(context, query, Math.max(1, Math.min(12, Number(args?.limit || 6))), internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.filename, 240));
        return { success: true, query, results, citations: results.map(item => item.citation) };
    }
    if (name === "read_knowledge_document") {
        await ensureIndex();
        const filename = String(args?.filename || "").trim();
        const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
        if (!filename || !metadata[filename])
            throw new Error("知识文档不存在");
        if (!scopeAllowed(metadata[filename], context))
            throw new Error("当前任务无权读取该知识文档");
        const parsed = (0, knowledge_index_1.getParsedKnowledgeDocument)(filename);
        if (!parsed)
            throw new Error("知识文档尚未完成解析");
        const offset = Math.max(0, Number(args?.offset || 0));
        const maxChars = Math.max(500, Math.min(30000, Number(args?.max_chars || 12000)));
        const content = String(parsed.content || "");
        return { success: true, filename, parser: parsed.parser, status: parsed.status, offset, total_chars: content.length, has_more: offset + maxChars < content.length, content: content.slice(offset, offset + maxChars), citations: (0, knowledge_index_1.getKnowledgeDocumentChunks)(filename).map(chunk => chunk.citation) };
    }
    if (name === "list_citations") {
        await ensureIndex();
        const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
        const limit = Math.max(1, Math.min(100, Number(args?.limit || 50)));
        const documents = Object.entries(metadata).filter(([, value]) => scopeAllowed(value, context)).slice(0, limit).map(([filename, value]) => ({
            filename,
            scope: value.scope,
            visibility: value.visibility,
            source: value.source || { type: "manual" },
            citations: (0, knowledge_index_1.getKnowledgeDocumentChunks)(filename).map(chunk => ({ citation: chunk.citation, heading: chunk.heading || "" })),
        }));
        return { success: true, documents };
    }
    throw new Error(`未知知识上下文工具：${name}`);
}
function runKnowledgeContextMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.KNOWLEDGE_CONTEXT_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runKnowledgeContextMcpServer();
//# sourceMappingURL=knowledge-context-mcp.js.map