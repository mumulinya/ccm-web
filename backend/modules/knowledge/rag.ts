import * as fs from "fs";
import * as path from "path";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart
} from "../../core/utils";
import {
  loadFeishuConfig,
  loadRagWatchPaths,
  saveRagWatchPaths,
  loadRagMetadata,
  saveRagMetadata
} from "../../core/db";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator";
const pdfParse = require("pdf-parse");

// 知识库根目录存储在 ~/.cc-connect/knowledge
const KNOWLEDGE_DIR = path.join(
  process.env.USERPROFILE || "C:/Users/admin",
  ".cc-connect",
  "knowledge"
);
const RAG_EMBEDDING_CONFIG_FILE = path.join(
  process.env.USERPROFILE || "C:/Users/admin",
  ".cc-connect",
  "rag-embedding-config.json"
);

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

interface Chunk {
  filename: string;
  index: number;
  domain: string;
  text: string;
  tokens: Set<string>;
  tf: Record<string, number>;
  embedding: number[];
  semanticEmbedding?: number[];
}

let documentChunks: Chunk[] = [];
const EMBEDDING_DIM = 256;

function loadRagEmbeddingConfig() {
  try {
    if (!fs.existsSync(RAG_EMBEDDING_CONFIG_FILE)) return { enabled: false, apiUrl: "https://api.openai.com/v1", apiKey: "", model: "text-embedding-3-small" };
    return { enabled: false, apiUrl: "https://api.openai.com/v1", apiKey: "", model: "text-embedding-3-small", ...JSON.parse(fs.readFileSync(RAG_EMBEDDING_CONFIG_FILE, "utf-8")) };
  } catch {
    return { enabled: false, apiUrl: "https://api.openai.com/v1", apiKey: "", model: "text-embedding-3-small" };
  }
}

function saveRagEmbeddingConfig(updates: any = {}) {
  const current = loadRagEmbeddingConfig();
  const next: any = { ...current };
  if (updates.enabled !== undefined) next.enabled = !!updates.enabled;
  if (updates.apiUrl !== undefined) next.apiUrl = String(updates.apiUrl || "").trim() || "https://api.openai.com/v1";
  if (updates.model !== undefined) next.model = String(updates.model || "").trim();
  if (updates.apiKey !== undefined && String(updates.apiKey || "").trim()) next.apiKey = String(updates.apiKey).trim();
  next.updated_at = new Date().toISOString();
  fs.writeFileSync(RAG_EMBEDDING_CONFIG_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function publicRagEmbeddingConfig(config = loadRagEmbeddingConfig()) {
  const { apiKey, ...safe } = config;
  return { ...safe, hasKey: !!apiKey };
}

function normalizeEmbeddingUrl(apiUrl = "") {
  const base = String(apiUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (base.endsWith("/embeddings")) return base;
  if (base.endsWith("/v1")) return `${base}/embeddings`;
  return `${base}/v1/embeddings`;
}

function safeKnowledgeSlug(value: string) {
  return String(value || "knowledge")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "knowledge";
}

function normalizeTags(tags: any[] = []) {
  return Array.from(new Set((Array.isArray(tags) ? tags : [])
    .map(tag => String(tag || "").trim())
    .filter(Boolean)
    .map(tag => tag.startsWith("#") ? tag : `#${tag}`)));
}

async function captureKnowledgeEntry(input: any = {}) {
  const now = new Date().toISOString();
  const sourceType = String(input.source_type || input.sourceType || "manual").trim() || "manual";
  const title = String(input.title || input.summary || "未命名知识条目").trim().slice(0, 120);
  const content = String(input.content || input.text || "").trim();
  if (!content) throw new Error("知识内容不能为空");
  const domain = String(input.domain || input.project || input.group_id || input.groupId || "global").trim() || "global";
  const filename = `${now.replace(/[:.]/g, "-")}-${safeKnowledgeSlug(title)}.md`;
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  const tags = normalizeTags([
    sourceType,
    domain,
    input.project ? `project:${input.project}` : "",
    input.group_id || input.groupId ? `group:${input.group_id || input.groupId}` : "",
    input.agent ? `agent:${input.agent}` : "",
    ...(Array.isArray(input.tags) ? input.tags : []),
  ]);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `source_type: ${JSON.stringify(sourceType)}`,
    `domain: ${JSON.stringify(domain)}`,
    input.project ? `project: ${JSON.stringify(input.project)}` : "",
    input.group_id || input.groupId ? `group_id: ${JSON.stringify(input.group_id || input.groupId)}` : "",
    input.session_id || input.sessionId ? `session_id: ${JSON.stringify(input.session_id || input.sessionId)}` : "",
    input.task_id || input.taskId ? `task_id: ${JSON.stringify(input.task_id || input.taskId)}` : "",
    input.agent ? `agent: ${JSON.stringify(input.agent)}` : "",
    `created_at: ${JSON.stringify(now)}`,
    `tags: ${JSON.stringify(tags)}`,
    "---",
    "",
  ].filter(line => line !== "").join("\n");
  const markdown = `${frontmatter}\n\n# ${title}\n\n${content}\n`;
  fs.writeFileSync(filePath, markdown, "utf-8");
  const metadata: any = loadRagMetadata();
  metadata[filename] = {
    ...(metadata[filename] || {}),
    tags,
    domain,
    source: {
      type: sourceType,
      project: input.project || "",
      group_id: input.group_id || input.groupId || "",
      session_id: input.session_id || input.sessionId || "",
      task_id: input.task_id || input.taskId || "",
      agent: input.agent || "",
      created_at: now,
    },
  };
  saveRagMetadata(metadata);
  await rebuildIndex();
  return { filename, title, domain, tags, created_at: now, chunksCount: documentChunks.filter(chunk => chunk.filename === filename).length };
}

async function callEmbeddingApi(text: string, config = loadRagEmbeddingConfig()) {
  if (!config.enabled || !config.apiKey || !config.model) return null;
  const response = await fetch(normalizeEmbeddingUrl(config.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, input: text.slice(0, 12_000) }),
  });
  if (!response.ok) throw new Error(`Embedding API 返回异常 (${response.status}): ${await response.text()}`);
  const data: any = await response.json();
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || !vector.length) throw new Error("Embedding API 未返回向量");
  const norm = Math.sqrt(vector.reduce((sum: number, value: number) => sum + value * value, 0)) || 1;
  return vector.map((value: number) => value / norm);
}

// 简易且高性能的中英文分词器 (支持中文单字/组合、英文单词)
function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  const regex = /([a-zA-Z0-9]+|[\u4e00-\u9fa5])/g;
  let match;
  while ((match = regex.exec(lower)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildEmbedding(tf: Record<string, number>) {
  const vector = Array.from({ length: EMBEDDING_DIM }, () => 0);
  for (const [token, count] of Object.entries(tf)) {
    const hash = hashString(token);
    const index = hash % EMBEDDING_DIM;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign * Math.log(1 + Number(count || 0));
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => value / norm);
}

function cosineSimilarity(a: number[] = [], b: number[] = []) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += (a[i] || 0) * (b[i] || 0);
  return dot;
}

function inferKnowledgeDomain(filename: string, metadata: any = {}) {
  const meta = metadata?.[filename] || {};
  return String(meta.domain || meta.scope || meta.project || meta.group || "global");
}

function hybridSearch(query: string, options: { limit?: number; filename?: string; tags?: string[]; domain?: string } = {}) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || documentChunks.length === 0) return [];
  const queryTf: Record<string, number> = {};
  for (const token of queryTokens) queryTf[token] = (queryTf[token] || 0) + 1;
  const queryEmbedding = buildEmbedding(queryTf);
  const querySet = new Set(queryTokens);
  const metadata = loadRagMetadata();
  const N = Math.max(1, documentChunks.length);
  const df: Record<string, number> = {};
  for (const token of querySet) {
    df[token] = documentChunks.filter(chunk => chunk.tokens.has(token)).length;
  }

  const scored = documentChunks.map(chunk => {
    if (options.filename && chunk.filename !== options.filename) return null;
    if (options.domain && chunk.domain !== options.domain) return null;
    if (options.tags && options.tags.length > 0) {
      const docTags = metadata[chunk.filename]?.tags || [];
      const hasIntersection = options.tags.some(tag => docTags.includes(tag));
      if (!hasIntersection) return null;
    }

    let keywordScore = 0;
    let covered = 0;
    for (const token of querySet) {
      if (!chunk.tf[token]) continue;
      covered += 1;
      const tfVal = chunk.tf[token];
      const idfVal = Math.log(N / ((df[token] || 0) + 1)) + 1;
      keywordScore += tfVal * idfVal;
    }
    const vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));
    const coverage = covered / Math.max(1, querySet.size);
    const filenameBoost = tokenize(chunk.filename).some(token => querySet.has(token)) ? 0.08 : 0;
    const score = keywordScore * 0.62 + vectorScore * 3.2 + coverage * 1.2 + filenameBoost;
    return { chunk, score, keywordScore, vectorScore, coverage };
  }).filter(Boolean) as Array<{ chunk: Chunk; score: number; keywordScore: number; vectorScore: number; coverage: number }>;

  return scored
    .filter(item => item.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || 5);
}

async function hybridSearchAsync(query: string, options: { limit?: number; filename?: string; tags?: string[]; domain?: string } = {}) {
  const config = loadRagEmbeddingConfig();
  let querySemanticEmbedding: number[] | null = null;
  let embeddingMode = "hashing";
  let embeddingError = "";
  if (config.enabled && config.apiKey && config.model) {
    try {
      querySemanticEmbedding = await callEmbeddingApi(query, config);
      embeddingMode = `api:${config.model}`;
    } catch (error: any) {
      embeddingError = error?.message || String(error);
      embeddingMode = "hashing-fallback";
    }
  }
  const candidateLimit = Math.max(Number(options.limit || 5) * 5, 30);
  const results = hybridSearch(query, { ...options, limit: candidateLimit }).map(item => {
    if (querySemanticEmbedding && item.chunk.semanticEmbedding?.length) {
      const semanticVectorScore = Math.max(0, cosineSimilarity(querySemanticEmbedding, item.chunk.semanticEmbedding));
      const score = item.keywordScore * 0.52 + semanticVectorScore * 4.2 + item.coverage * 1.2;
      return { ...item, score, vectorScore: semanticVectorScore, embeddingMode };
    }
    return { ...item, embeddingMode };
  }).sort((a, b) => b.score - a.score).slice(0, options.limit || 5);
  return { results, embeddingMode, embeddingError };
}

// 重构本地知识库分片索引
export async function rebuildIndex() {
  try {
    const chunks: Chunk[] = [];
    const metadata = loadRagMetadata();
    const embeddingConfig = loadRagEmbeddingConfig();
    let semanticOk = 0;
    let semanticFailed = 0;
    if (!fs.existsSync(KNOWLEDGE_DIR)) return;
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      if (!fs.statSync(filePath).isFile()) continue;
      
      const ext = path.extname(file).toLowerCase();
      // 支持文本/Markdown/代码等常见文本文档，增加 PDF 支持
      if (![".txt", ".md", ".json", ".ts", ".js", ".html", ".css", ".py", ".go", ".java", ".yml", ".yaml", ".pdf"].includes(ext)) {
        continue;
      }
      
      let content = "";
      if (ext === ".pdf") {
        try {
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdfParse(dataBuffer);
          content = data.text;
        } catch (e: any) {
          console.error(`[RAG] 解析 PDF ${file} 失败:`, e.message);
          continue;
        }
      } else {
        content = fs.readFileSync(filePath, "utf-8");
      }

      // 按 800 字符为一块进行分片，带 150 字符重叠度
      const chunkSize = 800;
      const overlap = 150;
      let start = 0;
      let chunkIndex = 0;
      while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        const chunkText = content.substring(start, end).trim();
        if (chunkText) {
          const searchTokens = tokenize(file + " " + chunkText);
          const tf: Record<string, number> = {};
          for (const t of searchTokens) {
            tf[t] = (tf[t] || 0) + 1;
          }
          let semanticEmbedding: number[] | undefined;
          if (embeddingConfig.enabled && embeddingConfig.apiKey && embeddingConfig.model) {
            try {
              semanticEmbedding = await callEmbeddingApi(`${file}\n${chunkText}`, embeddingConfig) || undefined;
              if (semanticEmbedding) semanticOk += 1;
            } catch (error: any) {
              semanticFailed += 1;
              if (semanticFailed <= 3) console.warn(`[RAG] Embedding API 调用失败，已回退 hashing: ${error?.message || String(error)}`);
            }
          }
          chunks.push({
            filename: file,
            index: chunkIndex,
            domain: inferKnowledgeDomain(file, metadata),
            text: chunkText,
            tokens: new Set(searchTokens),
            tf,
            embedding: buildEmbedding(tf),
            semanticEmbedding,
          });
        }
        chunkIndex += 1;
        if (start + chunkSize >= content.length) break;
        start += (chunkSize - overlap);
      }
    }
    documentChunks = chunks;
    console.log(`[RAG] 本地知识库索引已构建完成，分片总数: ${chunks.length}，语义向量: ${semanticOk} 成功 / ${semanticFailed} 失败`);
  } catch (e: any) {
    console.error("[RAG] 构建索引失败:", e.message);
  }
}

// 首次加载自动构建一次索引
rebuildIndex();

// 基于 TF-IDF 实现的文本相似度排序检索
export function queryKnowledgeBase(query: string, limit = 3, filterTags?: string[]): string {
  const results = hybridSearch(query, { limit, tags: filterTags });
  if (results.length === 0) return "";
  return results.map((item, idx) => {
    return `[知识库参考分片 #${idx + 1} - 来源文件: ${item.chunk.filename}#${item.chunk.index} (混合得分: ${item.score.toFixed(2)}；关键词: ${item.keywordScore.toFixed(2)}；向量: ${item.vectorScore.toFixed(2)})]\n${item.chunk.text}`;
  }).join("\n\n");
}

class RagWatcher {
  private watchers: Record<string, fs.FSWatcher> = {};
  private debounceTimers: Record<string, NodeJS.Timeout> = {};

  start() {
    this.stopAll();
    const paths = loadRagWatchPaths();
    for (const p of paths) {
      this.watchPath(p);
    }
    console.log(`[RAG Watcher] 启动自动监视服务，正在监控 ${paths.length} 个本地目录`);
  }

  stopAll() {
    for (const key of Object.keys(this.watchers)) {
      try {
        this.watchers[key].close();
      } catch {}
    }
    this.watchers = {};
    for (const timer of Object.values(this.debounceTimers)) {
      clearTimeout(timer);
    }
    this.debounceTimers = {};
  }

  watchPath(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const ext = path.extname(filename).toLowerCase();
        // 过滤不支持的知识文档格式
        if (![".txt", ".md", ".json", ".ts", ".js", ".html", ".css", ".py", ".go", ".java", ".yml", ".yaml", ".pdf"].includes(ext)) {
          return;
        }

        const sourceFile = path.join(dirPath, filename);
        const targetFile = path.join(KNOWLEDGE_DIR, path.basename(filename));

        const timerKey = `${dirPath}::${filename}`;
        if (this.debounceTimers[timerKey]) {
          clearTimeout(this.debounceTimers[timerKey]);
        }

        this.debounceTimers[timerKey] = setTimeout(() => {
          try {
            if (fs.existsSync(sourceFile)) {
              // 复制/更新到知识库
              console.log(`[RAG Watcher] 检测到文档更新: ${filename}，正在同步到知识库...`);
              fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
            } else {
              // 在原处删除了
              console.log(`[RAG Watcher] 检测到文档在原处删除: ${filename}，正在同步删除知识库文档...`);
              if (fs.existsSync(targetFile)) {
                fs.unlinkSync(targetFile);
              }
            }
            // 重新构建知识库索引
            rebuildIndex();
          } catch (err: any) {
            console.error(`[RAG Watcher] 同步文件 ${filename} 失败:`, err.message);
          }
        }, 1500); // 1.5 秒防抖
      });

      this.watchers[dirPath] = watcher;
    } catch (e: any) {
      console.error(`[RAG Watcher] 监听路径失败 ${dirPath}:`, e.message);
    }
  }

  unwatchPath(dirPath: string) {
    if (this.watchers[dirPath]) {
      try {
        this.watchers[dirPath].close();
      } catch {}
      delete this.watchers[dirPath];
    }
  }
}

export const ragWatcher = new RagWatcher();
// 启动监听
ragWatcher.start();

// RAG API 路由分发器
export function handleRagApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any
): boolean {
  if (pathname === "/api/rag/embedding-config" && req.method === "GET") {
    return sendJson(res, { success: true, config: publicRagEmbeddingConfig() });
  }

  if (pathname === "/api/rag/embedding-config" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const config = saveRagEmbeddingConfig(payload);
        if (payload.rebuild !== false) await rebuildIndex();
        sendJson(res, { success: true, config: publicRagEmbeddingConfig(config), chunksCount: documentChunks.length });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/rag/capture" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const entry = await captureKnowledgeEntry(payload);
        sendJson(res, { success: true, entry });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // 1. 获取已上传的文档列表
  if (pathname === "/api/rag/documents" && req.method === "GET") {
    try {
      if (!fs.existsSync(KNOWLEDGE_DIR)) {
        return sendJson(res, { success: true, documents: [] });
      }
      const metadata = loadRagMetadata();
      const files = fs.readdirSync(KNOWLEDGE_DIR)
        .map(file => {
          const filePath = path.join(KNOWLEDGE_DIR, file);
          const stat = fs.statSync(filePath);
          const chunksCount = documentChunks.filter(c => c.filename === file).length;
          return {
            name: file,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            uploadedAt: stat.mtime.toISOString(),
            chunksCount: chunksCount,
            tags: metadata[file]?.tags || []
          };
        });
      sendJson(res, { success: true, documents: files });
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  // 1.5 获取特定文档的分片详情
  if (pathname === "/api/rag/chunks" && req.method === "GET") {
    try {
      const filename = parsed.query.filename;
      if (!filename) return sendJson(res, { error: "参数不足" }, 400);
      const chunks = documentChunks
        .filter(c => c.filename === filename)
        .map((c, idx) => ({
          index: idx + 1,
          text: c.text,
          tokenCount: Array.from(c.tokens).length
        }));
      sendJson(res, { success: true, chunks });
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  // 1.6 重建知识库索引
  if (pathname === "/api/rag/rebuild" && req.method === "POST") {
    rebuildIndex().then(() => {
      sendJson(res, { success: true, message: "知识库索引重构成功", chunksCount: documentChunks.length });
    }).catch((e: any) => {
      sendJson(res, { error: e.message }, 500);
    });
    return true;
  }
  
  // 2. 上传文档到知识库
  if (pathname === "/api/rag/upload" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then(async (buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files } = parseMultipart(buffer, boundary);
          
          for (const f of files) {
            const targetPath = path.join(KNOWLEDGE_DIR, f.filename);
            fs.writeFileSync(targetPath, fs.readFileSync(f.savedPath));
            try { fs.unlinkSync(f.savedPath); } catch {}
          }
          
          await rebuildIndex();
          sendJson(res, { success: true, message: "文档已成功导入知识库" });
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    return false;
  }
  
  // 3. 删除指定文档
  if (pathname === "/api/rag/document" && req.method === "DELETE") {
    try {
      const name = parsed.query.name;
      if (!name) return sendJson(res, { error: "参数不足" }, 400);
      const filePath = path.join(KNOWLEDGE_DIR, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        const metadata: any = loadRagMetadata();
        if (metadata[name]) {
          delete metadata[name];
          saveRagMetadata(metadata);
        }
        rebuildIndex().then(() => {
          sendJson(res, { success: true, message: "文档已成功删除" });
        });
      } else {
        sendJson(res, { error: "文档不存在" }, 404);
      }
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }
  
  // 4. 检索调试接口
  if (pathname === "/api/rag/query" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { query } = JSON.parse(body || "{}");
        if (!query) return sendJson(res, { error: "查询语句为空" }, 400);
        const matched = queryKnowledgeBase(query, 3);
        const search = await hybridSearchAsync(query, { limit: 8 });
        const debugList = search.results.map(item => ({
          filename: item.chunk.filename,
          chunkIndex: item.chunk.index,
          domain: item.chunk.domain,
          citation: `${item.chunk.filename}#${item.chunk.index}`,
          text: item.chunk.text.slice(0, 220) + (item.chunk.text.length > 220 ? "..." : ""),
          score: item.score,
          keywordScore: item.keywordScore,
          vectorScore: item.vectorScore,
          coverage: item.coverage,
        }));
          
        sendJson(res, { success: true, matched, debugChunks: debugList, retrieval: { mode: "hybrid", embedding: search.embeddingMode, fallback: search.embeddingMode.includes("fallback") || search.embeddingMode === "hashing", error: search.embeddingError || "", rerank: "keyword+vector+coverage" } });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // 5. RAG AI 问答终端
  if (pathname === "/api/rag/chat" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { query, filename, tags } = JSON.parse(body || "{}");
        if (!query) return sendJson(res, { error: "查询为空" }, 400);

        const search = await hybridSearchAsync(query, { limit: 6, filename, tags });
        const sortedResults = search.results;
        const debugChunks = sortedResults.map(item => ({
          filename: item.chunk.filename,
          chunkIndex: item.chunk.index,
          domain: item.chunk.domain,
          citation: `${item.chunk.filename}#${item.chunk.index}`,
          text: item.chunk.text,
          score: item.score,
          keywordScore: item.keywordScore,
          vectorScore: item.vectorScore,
          coverage: item.coverage,
        }));

        if (debugChunks.length === 0) {
          return sendJson(res, { success: true, reply: "知识库中未找到任何相关文档作为参考。请确认查询内容或上传相关文档。", debugChunks: [] });
        }

        // 2. 拼装大模型 prompt
        const referenceText = debugChunks.map((c, i) => `[参考文档 #${i+1} - 引用ID: ${c.citation} - 来源: ${c.filename}]\n${c.text}`).join("\n\n");
        const systemPrompt = `你是一个本地知识库文档助手。请根据以下提供的知识库相关参考内容，客观、准确地回答用户的问题。
如果你在参考内容中找不到答案，请直说“在参考文档中没有找到相关答案”，不要胡乱编造。
回答中涉及事实、步骤、配置、接口时，尽量在句末标注引用ID，例如 [source:xxx.md#0]。

【知识库参考内容】：
${referenceText}`;

        // 3. 读取大模型配置
        const config = loadOrchestratorConfig();
        if (!config.apiKey || !config.model) {
          return sendJson(res, { success: true, reply: "⚠️ 大模型尚未配置。请前往「系统设置」中的「LLM 主协调器」配置 API Key、大模型和 Base URL，方可启用 AI 问答功能。", debugChunks });
        }

        const model = config.model;
        let apiUrl = config.apiUrl || "https://api.openai.com/v1";
        // 修正逻辑，判断是否以 /chat/completions 结尾，如果不是，则补齐
        if (!apiUrl.endsWith("/chat/completions")) {
            apiUrl = `${apiUrl.replace(/\/+$/, "")}/chat/completions`;
        }
        
        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query }
            ],
            temperature: 0.3,
            max_tokens: 1200
          })
        };

        // 4. 调用大模型接口 (OpenAI 协议兼容)
        const response = await fetch(apiUrl, requestOptions);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`大模型 API 返回异常 (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "大模型未返回内容";
        sendJson(res, { success: true, reply, debugChunks, retrieval: { mode: "hybrid", embedding: search.embeddingMode, fallback: search.embeddingMode.includes("fallback") || search.embeddingMode === "hashing", error: search.embeddingError || "", rerank: "keyword+vector+coverage", citations: debugChunks.map(c => c.citation) } });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  // 6. 获取 PDF/文本文档完整纯文本原文
  if (pathname === "/api/rag/document-content" && req.method === "GET") {
    try {
      const name = parsed.query.name;
      if (!name) return sendJson(res, { error: "参数不足" }, 400);
      const filePath = path.join(KNOWLEDGE_DIR, name);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, { error: "文件不存在" }, 404);
      }

      const ext = path.extname(name).toLowerCase();
      if (ext === ".pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        pdfParse(dataBuffer).then((data: any) => {
          sendJson(res, { success: true, name, content: data.text });
        }).catch((e: any) => {
          sendJson(res, { error: e.message }, 500);
        });
      } else {
        const content = fs.readFileSync(filePath, "utf-8");
        sendJson(res, { success: true, name, content });
      }
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  // 7. 本地监控目录管理
  if (pathname === "/api/rag/watch-paths") {
    if (req.method === "GET") {
      sendJson(res, { success: true, paths: loadRagWatchPaths() });
      return true;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const { path: dirPath } = JSON.parse(body || "{}");
          if (!dirPath) return sendJson(res, { error: "路径不能为空" }, 400);
          if (!fs.existsSync(dirPath)) return sendJson(res, { error: "该本地路径不存在" }, 400);

          const paths = loadRagWatchPaths();
          if (paths.includes(dirPath)) {
            return sendJson(res, { success: true, message: "该路径已在监视列表中" });
          }

          paths.push(dirPath);
          saveRagWatchPaths(paths);
          ragWatcher.watchPath(dirPath);
          sendJson(res, { success: true, paths, message: "本地监控目录添加成功" });
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      });
      return true;
    }
    if (req.method === "DELETE") {
      try {
        const dirPath = parsed.query.path;
        if (!dirPath) return sendJson(res, { error: "参数不足" }, 400);

        let paths = loadRagWatchPaths();
        paths = paths.filter(p => p !== dirPath);
        saveRagWatchPaths(paths);
        ragWatcher.unwatchPath(dirPath);
        sendJson(res, { success: true, paths, message: "监控目录移除成功" });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
      return true;
    }
  }

  // 8. 文档打标签管理
  if (pathname === "/api/rag/metadata" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { name, tags } = JSON.parse(body || "{}");
        if (!name) return sendJson(res, { error: "参数不足" }, 400);
        
        const metadata = loadRagMetadata();
        metadata[name] = {
          tags: Array.isArray(tags) ? tags.map(t => String(t).trim().startsWith("#") ? String(t).trim() : `#${String(t).trim()}`) : []
        };
        saveRagMetadata(metadata);
        sendJson(res, { success: true, message: "文档标签更新成功", metadata: metadata[name] });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }
  
  return false;
}
