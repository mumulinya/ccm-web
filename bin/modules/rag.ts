import * as fs from "fs";
import * as path from "path";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart
} from "../utils";

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
export function rebuildIndex() {
  try {
    const chunks: Chunk[] = [];
    if (!fs.existsSync(KNOWLEDGE_DIR)) return;
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      if (!fs.statSync(filePath).isFile()) continue;
      
      const ext = path.extname(file).toLowerCase();
      // 支持文本/Markdown/代码等常见文本文档
      if (![".txt", ".md", ".json", ".ts", ".js", ".html", ".css", ".py", ".go", ".java", ".yml", ".yaml"].includes(ext)) {
        continue;
      }
      
      const content = fs.readFileSync(filePath, "utf-8");
      // 按 800 字符为一块进行分片，带 150 字符重叠度
      const chunkSize = 800;
      const overlap = 150;
      let start = 0;
      while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        const chunkText = content.substring(start, end).trim();
        if (chunkText) {
          const tokens = tokenize(chunkText);
          const tf: Record<string, number> = {};
          for (const t of tokens) {
            tf[t] = (tf[t] || 0) + 1;
          }
          chunks.push({
            filename: file,
            text: chunkText,
            tokens: new Set(tokens),
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
export function queryKnowledgeBase(query: string, limit = 3): string {
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
  const scoredChunks = documentChunks.map(chunk => {
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
      const files = fs.readdirSync(KNOWLEDGE_DIR)
        .map(file => {
          const filePath = path.join(KNOWLEDGE_DIR, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            size: stat.size,
            mtime: stat.mtime.toISOString()
          };
        });
      sendJson(res, { success: true, documents: files });
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }
  
  // 2. 上传文档到知识库
  if (pathname === "/api/rag/upload" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files } = parseMultipart(buffer, boundary);
          
          for (const f of files) {
            const targetPath = path.join(KNOWLEDGE_DIR, f.filename);
            fs.writeFileSync(targetPath, fs.readFileSync(f.savedPath));
            try { fs.unlinkSync(f.savedPath); } catch {}
          }
          
          rebuildIndex();
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
        rebuildIndex();
        sendJson(res, { success: true, message: "文档已成功删除" });
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
  
  return false;
}
