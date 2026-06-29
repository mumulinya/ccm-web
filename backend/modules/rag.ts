import * as fs from "fs";
import * as path from "path";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart
} from "../utils";
import {
  loadFeishuConfig,
  loadRagWatchPaths,
  saveRagWatchPaths,
  loadRagMetadata,
  saveRagMetadata
} from "../db";
import { loadOrchestratorConfig } from "./group-orchestrator";
const pdfParse = require("pdf-parse");

// 知识库根目录存储在 ~/.cc-connect/knowledge
const KNOWLEDGE_DIR = path.join(
  process.env.USERPROFILE || "C:/Users/admin",
  ".cc-connect",
  "knowledge"
);

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

interface Chunk {
  filename: string;
  text: string;
  tokens: Set<string>;
  tf: Record<string, number>;
}

let documentChunks: Chunk[] = [];

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

// 重构本地知识库分片索引
export async function rebuildIndex() {
  try {
    const chunks: Chunk[] = [];
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
      while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        const chunkText = content.substring(start, end).trim();
        if (chunkText) {
          const searchTokens = tokenize(file + " " + chunkText);
          const tf: Record<string, number> = {};
          for (const t of searchTokens) {
            tf[t] = (tf[t] || 0) + 1;
          }
          chunks.push({
            filename: file,
            text: chunkText,
            tokens: new Set(searchTokens),
            tf
          });
        }
        if (start + chunkSize >= content.length) break;
        start += (chunkSize - overlap);
      }
    }
    documentChunks = chunks;
    console.log(`[RAG] 本地知识库索引已构建完成，分片总数: ${chunks.length}`);
  } catch (e: any) {
    console.error("[RAG] 构建索引失败:", e.message);
  }
}

// 首次加载自动构建一次索引
rebuildIndex();

// 基于 TF-IDF 实现的文本相似度排序检索
export function queryKnowledgeBase(query: string, limit = 3, filterTags?: string[]): string {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || documentChunks.length === 0) return "";
  
  // 1. 计算每个查询关键词的逆文档频率 (IDF)
  const df: Record<string, number> = {};
  for (const t of queryTokens) {
    df[t] = 0;
    for (const chunk of documentChunks) {
      if (chunk.tokens.has(t)) {
        df[t]++;
      }
    }
  }
  
  // 2. 对每个分块进行计分
  const N = documentChunks.length;
  const metadata = loadRagMetadata();
  const scoredChunks = documentChunks.map(chunk => {
    // 标签分类过滤
    if (filterTags && filterTags.length > 0) {
      const docTags = metadata[chunk.filename]?.tags || [];
      const hasIntersection = filterTags.some(t => docTags.includes(t));
      if (!hasIntersection) return { chunk, score: 0 };
    }
    
    let score = 0;
    for (const t of queryTokens) {
      if (chunk.tf[t]) {
        const tfVal = chunk.tf[t];
        const dfVal = df[t] || 0;
        // 标准 IDF 计算公式：log(N / (df + 1)) + 1
        const idfVal = Math.log(N / (dfVal + 1)) + 1;
        score += tfVal * idfVal;
      }
    }
    return { chunk, score };
  });
  
  // 3. 排序并过滤匹配度为 0 的内容
  const results = scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
    
  if (results.length === 0) return "";
  
  // 4. 返回拼接好的参考上下文
  return results.map((item, idx) => {
    return `[知识库参考分片 #${idx + 1} - 来源文件: ${item.chunk.filename} (匹配度得分: ${item.score.toFixed(2)})]\n${item.chunk.text}`;
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
    req.on("end", () => {
      try {
        const { query } = JSON.parse(body || "{}");
        if (!query) return sendJson(res, { error: "查询语句为空" }, 400);
        const matched = queryKnowledgeBase(query, 3);
        
        // 额外输出供前端调试匹配分数的原始分块数据
        const queryTokens = tokenize(query);
        const debugList = documentChunks.map(chunk => {
          let score = 0;
          for (const t of queryTokens) {
            if (chunk.tf[t]) {
              const dfVal = documentChunks.filter(c => c.tokens.has(t)).length;
              const idfVal = Math.log(documentChunks.length / (dfVal + 1)) + 1;
              score += chunk.tf[t] * idfVal;
            }
          }
          return {
            filename: chunk.filename,
            text: chunk.text.slice(0, 140) + "...",
            score
          };
        }).filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
          
        sendJson(res, { success: true, matched, debugChunks: debugList });
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

        // 1. 相似度匹配原始分片
        const queryTokens = tokenize(query);
        const metadata = loadRagMetadata();
        
        const scoredChunks = documentChunks.map(chunk => {
          if (filename && chunk.filename !== filename) return { chunk, score: 0 };
          if (tags && tags.length > 0) {
            const docTags = metadata[chunk.filename]?.tags || [];
            const hasIntersection = tags.some(t => docTags.includes(t));
            if (!hasIntersection) return { chunk, score: 0 };
          }
          
          let score = 0;
          for (const t of queryTokens) {
            if (chunk.tf[t]) {
              const dfVal = documentChunks.filter(c => c.tokens.has(t)).length;
              const idfVal = Math.log(documentChunks.length / (dfVal + 1)) + 1;
              score += chunk.tf[t] * idfVal;
            }
          }
          return { chunk, score };
        });

        const sortedResults = scoredChunks
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        const debugChunks = sortedResults.map(item => ({
          filename: item.chunk.filename,
          text: item.chunk.text,
          score: item.score
        }));

        if (debugChunks.length === 0) {
          return sendJson(res, { success: true, reply: "知识库中未找到任何相关文档作为参考。请确认查询内容或上传相关文档。", debugChunks: [] });
        }

        // 2. 拼装大模型 prompt
        const referenceText = debugChunks.map((c, i) => `[参考文档 #${i+1} - 来源: ${c.filename}]\n${c.text}`).join("\n\n");
        const systemPrompt = `你是一个本地知识库文档助手。请根据以下提供的知识库相关参考内容，客观、准确地回答用户的问题。
如果你在参考内容中找不到答案，请直说“在参考文档中没有找到相关答案”，不要胡乱编造。

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
        
        console.log("[RAG DEBUG] Exact API URL:", apiUrl, "Model:", model);
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
        console.log("[RAG DEBUG] Fetch Options:", JSON.stringify(requestOptions, null, 2));
        console.log("[RAG DEBUG] Fetch Options:", JSON.stringify(requestOptions, null, 2));
        console.log("[RAG DEBUG] Fetch is:", fetch.toString());
        console.log("[RAG DEBUG] process.env.HTTPS_PROXY is:", process.env.HTTPS_PROXY);
        console.log("[RAG DEBUG] process.env.HTTP_PROXY is:", process.env.HTTP_PROXY);
        console.log("[RAG DEBUG] process.env.all_proxy is:", process.env.all_proxy);

        // 4. 调用大模型接口 (OpenAI 协议兼容)
        const response = await fetch(apiUrl, requestOptions);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`大模型 API 返回异常 (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "大模型未返回内容";
        sendJson(res, { success: true, reply, debugChunks });
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
