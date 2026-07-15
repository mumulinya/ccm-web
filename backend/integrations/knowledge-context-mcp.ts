import * as path from "path";
import {
  getKnowledgeDocumentChunks,
  getParsedKnowledgeDocument,
  rebuildKnowledgeIndex,
  searchKnowledgeBase,
} from "../modules/knowledge/knowledge-index";
import { loadKnowledgeMetadata, KnowledgeDocumentMetadata } from "../modules/knowledge/knowledge-files";
import {
  buildInternalMcpServerConfig,
  InternalMcpTaskContext,
  InternalMcpToolDefinition,
  runInternalMcpServer,
} from "./internal-mcp-runtime";
import { getBoundInternalMcpTask, internalMcpTaskPayload } from "./internal-mcp-task-store";

export const KNOWLEDGE_CONTEXT_MCP_SERVER_NAME = "ccm__knowledge_context";

export function buildKnowledgeContextMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  return buildInternalMcpServerConfig(path.join(__dirname, "knowledge-context-mcp.js"), context);
}

const tools: InternalMcpToolDefinition[] = [
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

let indexReady: Promise<any> | null = null;
function ensureIndex() {
  if (!indexReady) indexReady = rebuildKnowledgeIndex("internal-mcp");
  return indexReady;
}

function scopeAllowed(metadata: KnowledgeDocumentMetadata | undefined, context: InternalMcpTaskContext) {
  const scope = metadata?.scope || { type: "global", id: "" };
  if (metadata?.visibility === "restricted") {
    if (scope.type === "project") return scope.id === context.project;
    if (scope.type === "group") return !!context.groupId && scope.id === context.groupId;
    if (scope.type === "agent") return scope.id === context.project || scope.id === context.taskAgentSessionId;
    return false;
  }
  if (scope.type === "global") return true;
  if (scope.type === "project") return scope.id === context.project || context.role === "group-main-agent" && (context.projects || []).some(project => project.name === scope.id);
  if (scope.type === "group") return !!context.groupId && scope.id === context.groupId;
  if (scope.type === "agent") return scope.id === context.project || scope.id === context.taskAgentSessionId;
  return false;
}

async function scopedSearch(context: InternalMcpTaskContext, query: string, limit: number, filename = "") {
  await ensureIndex();
  const metadata = loadKnowledgeMetadata();
  const searches = [
    searchKnowledgeBase(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "project", scopeId: context.project, includeGlobal: true }),
    ...(context.groupId ? [searchKnowledgeBase(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "group", scopeId: context.groupId, includeGlobal: false })] : []),
  ];
  if (context.role === "group-main-agent") {
    for (const project of context.projects || []) {
      if (project.name && project.name !== context.project) searches.push(searchKnowledgeBase(query, { limit: Math.min(20, limit * 2), filename: filename || undefined, scopeType: "project", scopeId: project.name, includeGlobal: false }));
    }
  }
  const rows = (await Promise.all(searches)).flatMap(result => result.results.map(item => ({ ...item, embeddingMode: result.embeddingMode, embeddingError: result.embeddingError })));
  const seen = new Set<string>();
  return rows.filter(item => {
    const id = String(item.chunk.id || "");
    if (!id || seen.has(id) || !scopeAllowed(metadata[item.chunk.filename], context)) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => b.score - a.score).slice(0, limit).map(item => ({
    citation: item.chunk.id,
    filename: item.chunk.filename,
    heading: item.chunk.heading || "",
    text: internalMcpTaskPayload.cleanText(item.chunk.text, 5000),
    score: Number(item.score.toFixed(4)),
    scope: metadata[item.chunk.filename]?.scope || { type: "global", id: "" },
    source: metadata[item.chunk.filename]?.source || { type: "manual" },
  }));
}

async function callTool(context: InternalMcpTaskContext, name: string, args: any) {
  if (name === "get_project_context") {
    const task = getBoundInternalMcpTask(context);
    const focus = internalMcpTaskPayload.cleanText(args?.focus, 1200);
    const query = [task.business_goal || task.description || task.title, task.acceptance_criteria, focus].flat().filter(Boolean).join("\n");
    const results = await scopedSearch(context, query, Math.max(1, Math.min(12, Number(args?.limit || 6))));
    return { success: true, query, results, citations: results.map(item => item.citation), scope: { project: context.project, group_id: context.groupId, includes_global: true } };
  }
  if (name === "search_knowledge") {
    const query = internalMcpTaskPayload.cleanText(args?.query, 2000);
    if (!query) throw new Error("知识检索问题不能为空");
    const results = await scopedSearch(context, query, Math.max(1, Math.min(12, Number(args?.limit || 6))), internalMcpTaskPayload.cleanText(args?.filename, 240));
    return { success: true, query, results, citations: results.map(item => item.citation) };
  }
  if (name === "read_knowledge_document") {
    await ensureIndex();
    const filename = String(args?.filename || "").trim();
    const metadata = loadKnowledgeMetadata();
    if (!filename || !metadata[filename]) throw new Error("知识文档不存在");
    if (!scopeAllowed(metadata[filename], context)) throw new Error("当前任务无权读取该知识文档");
    const parsed = getParsedKnowledgeDocument(filename);
    if (!parsed) throw new Error("知识文档尚未完成解析");
    const offset = Math.max(0, Number(args?.offset || 0));
    const maxChars = Math.max(500, Math.min(30000, Number(args?.max_chars || 12000)));
    const content = String(parsed.content || "");
    return { success: true, filename, parser: parsed.parser, status: parsed.status, offset, total_chars: content.length, has_more: offset + maxChars < content.length, content: content.slice(offset, offset + maxChars), citations: getKnowledgeDocumentChunks(filename).map(chunk => chunk.citation) };
  }
  if (name === "list_citations") {
    await ensureIndex();
    const metadata = loadKnowledgeMetadata();
    const limit = Math.max(1, Math.min(100, Number(args?.limit || 50)));
    const documents = Object.entries(metadata).filter(([, value]) => scopeAllowed(value, context)).slice(0, limit).map(([filename, value]) => ({
      filename,
      scope: value.scope,
      visibility: value.visibility,
      source: value.source || { type: "manual" },
      citations: getKnowledgeDocumentChunks(filename).map(chunk => ({ citation: chunk.citation, heading: chunk.heading || "" })),
    }));
    return { success: true, documents };
  }
  throw new Error(`未知知识上下文工具：${name}`);
}

export function runKnowledgeContextMcpServer() {
  runInternalMcpServer({ name: KNOWLEDGE_CONTEXT_MCP_SERVER_NAME, tools, callTool });
}

if (require.main === module) runKnowledgeContextMcpServer();
