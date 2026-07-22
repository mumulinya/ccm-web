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
const knowledge_access_1 = require("../modules/knowledge/knowledge-access");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const memory_context_consumption_receipt_1 = require("./memory-context-consumption-receipt");
const memory_1 = require("../projects/memory");
const third_party_memory_snapshot_1 = require("./third-party-memory-snapshot");
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
const memoryReceiptTool = {
    name: "acknowledge_memory_context",
    description: "确认当前模型已加载本轮 CCM 受信记忆上下文。仅接受签名任务上下文中的一次性 challenge；此回执不代表采纳每条记忆。",
    inputSchema: {
        type: "object",
        required: ["challenge_id"],
        properties: {
            challenge_id: { type: "string", pattern: "^mcrc_[a-f0-9]{28}$" },
            snapshot_id: { type: "string" },
            snapshot_checksum: { type: "string", pattern: "^[a-f0-9]{64}$" },
        },
        additionalProperties: false,
    },
    roles: ["project-agent", "project-child-agent"],
};
const thirdPartyMemoryTools = [
    {
        name: "get_context_manifest",
        description: "读取当前签名作用域的 CCM 会话与长期记忆快照清单。工具不接受 scope 参数。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        roles: ["project-agent", "project-child-agent"],
    },
    {
        name: "read_session_context",
        description: "按完整对话轮次分页读取当前精确会话。continuity 为必需连续性，raw_archive 为压缩边界前可选原文。",
        inputSchema: {
            type: "object",
            properties: {
                view: { type: "string", enum: ["continuity", "raw_archive"] },
                cursor: { type: "number", minimum: 0 },
                max_tokens: { type: "number", minimum: 1000, maximum: 20000 },
            },
            additionalProperties: false,
        },
        roles: ["project-agent", "project-child-agent"],
    },
    {
        name: "search_memory",
        description: "使用 CCM 现有召回逻辑检索当前群聊和项目允许范围内的长期记忆，返回稳定条目 ID。",
        inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, limit: { type: "number", minimum: 1, maximum: 12 } }, additionalProperties: false },
        roles: ["project-agent", "project-child-agent"],
    },
    {
        name: "read_memory_items",
        description: "读取当前快照或本轮检索返回的长期记忆条目，单次总量不得超过 20K token。",
        inputSchema: { type: "object", required: ["ids"], properties: { ids: { type: "array", minItems: 1, maxItems: 24, items: { type: "string" } } }, additionalProperties: false },
        roles: ["project-agent", "project-child-agent"],
    },
    {
        name: "report_memory_usage",
        description: "报告本轮实际使用、忽略、冲突、核验和候选记忆。候选只进入现有验收流程，不能直接写正式记忆。",
        inputSchema: {
            type: "object",
            required: ["snapshot_id", "snapshot_checksum"],
            properties: {
                snapshot_id: { type: "string" },
                snapshot_checksum: { type: "string", pattern: "^[a-f0-9]{64}$" },
                usedIds: { type: "array", items: { type: "string" }, maxItems: 80 },
                ignoredIds: { type: "array", items: { type: "string" }, maxItems: 80 },
                verifiedIds: { type: "array", items: { type: "string" }, maxItems: 80 },
                conflicts: { type: "array", items: { type: "string" }, maxItems: 20 },
                candidateUpdates: { type: "array", maxItems: 20, items: { type: "object" } },
            },
            additionalProperties: false,
        },
        roles: ["project-agent", "project-child-agent"],
    },
];
function toolsForContext(context) {
    const memoryTools = context.memorySnapshotId ? thirdPartyMemoryTools : [];
    return context.memoryReceiptChallenge?.challenge_id ? [...tools, ...memoryTools, memoryReceiptTool] : [...tools, ...memoryTools];
}
let indexReady = null;
function ensureIndex() {
    if (!indexReady)
        indexReady = (0, knowledge_index_1.rebuildKnowledgeIndex)("internal-mcp");
    return indexReady;
}
function scopeAllowed(metadata, context) {
    return (0, knowledge_access_1.isKnowledgeDocumentAllowed)(metadata, context);
}
async function scopedSearch(context, query, limit, filename = "") {
    const search = await (0, knowledge_access_1.searchAgentKnowledge)(query, context, { limit, filename: filename || undefined, maxChunkChars: 5000 });
    return search.results;
}
async function callTool(context, name, args) {
    if (name === "acknowledge_memory_context") {
        if (context.memorySnapshotId) {
            if (String(args.snapshot_id || "") !== String(context.memorySnapshotId || "")
                || String(args.snapshot_checksum || "") !== String(context.memorySnapshotChecksum || "")) {
                throw new Error("记忆接收确认未绑定当前快照");
            }
            const hydration = (0, third_party_memory_snapshot_1.inspectThirdPartyMemoryHydration)(context);
            if (!hydration.ready)
                throw new Error(`必需记忆尚未读取完成：segments=${hydration.missingSegmentIds.join(",") || "none"}; memory=${hydration.missingMemoryItemIds.join(",") || "none"}`);
            const receipt = (0, memory_context_consumption_receipt_1.recordMemoryContextConsumptionReceipt)(context, args);
            (0, third_party_memory_snapshot_1.acknowledgeThirdPartyMemoryHydration)(context);
            return { success: true, state: "loaded", snapshot_id: context.memorySnapshotId, receipt };
        }
        return { success: true, state: "loaded", receipt: (0, memory_context_consumption_receipt_1.recordMemoryContextConsumptionReceipt)(context, args) };
    }
    if (name === "get_context_manifest") {
        return { success: true, manifest: (0, third_party_memory_snapshot_1.getThirdPartyMemoryManifest)(context) };
    }
    if (name === "read_session_context") {
        return (0, third_party_memory_snapshot_1.readThirdPartySessionContext)(context, args);
    }
    if (name === "read_memory_items") {
        return (0, third_party_memory_snapshot_1.readThirdPartyMemoryItems)(context, args?.ids || []);
    }
    if (name === "search_memory") {
        const query = internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.query, 2000);
        if (!query)
            throw new Error("记忆检索问题不能为空");
        const limit = Math.max(1, Math.min(12, Number(args?.limit || 6)));
        const packets = [];
        if (context.groupId && context.groupSessionId) {
            const { buildAgentMemoryPacket } = require("../modules/collaboration/group-agent-memory-packet");
            packets.push({ kind: "group_memory", source: `${context.groupId}:${context.groupSessionId}`, required: false, content: buildAgentMemoryPacket(context.groupId, context.project, query, { groupSessionId: context.groupSessionId }) });
        }
        packets.push({ kind: "project_memory", source: context.project, required: false, content: (0, memory_1.buildProjectMemoryPacket)(context.project, { workDir: context.workDir, query }) });
        const results = (0, third_party_memory_snapshot_1.storeThirdPartyMemorySearchItems)(context, packets.slice(0, limit));
        return { success: true, query, results };
    }
    if (name === "report_memory_usage") {
        return { success: true, report: (0, third_party_memory_snapshot_1.reportThirdPartyMemoryUsage)(context, args) };
    }
    if (name === "get_project_context") {
        const task = context.bindingKind === "project_session" ? null : (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
        const focus = internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.focus, 1200);
        const query = task
            ? [task.business_goal || task.description || task.title, task.acceptance_criteria, focus].flat().filter(Boolean).join("\n")
            : [context.requestText, focus].filter(Boolean).join("\n");
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
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.KNOWLEDGE_CONTEXT_MCP_SERVER_NAME, tools: toolsForContext, callTool });
}
if (require.main === module)
    runKnowledgeContextMcpServer();
//# sourceMappingURL=knowledge-context-mcp.js.map