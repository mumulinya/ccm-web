import * as fs from "fs";
import * as path from "path";
import {
  KNOWLEDGE_DIR,
  RAG_INDEX_CACHE_FILE,
  RAG_INDEX_V3_DIR,
  RAG_INDEX_V3_POINTER_FILE,
  isSupportedKnowledgeFilename,
  loadKnowledgeMetadata,
  loadRagEmbeddingConfig,
  parseKnowledgeDocument,
  resolveKnowledgeFile,
  sha256,
  updateKnowledgeMetadata,
  type KnowledgeScope,
} from "./knowledge-files";
import {
  KnowledgeEmbeddingBackend,
  KnowledgeVectorResult,
  embedLocalKnowledgeTexts,
  embedRemoteKnowledgeTexts,
  getLocalKnowledgeModelStatus,
  knowledgeEmbeddingUsesTestAdapter,
  preferredKnowledgeEmbeddingBackend,
  prepareLocalKnowledgeModel,
} from "./knowledge-embedding";
import {
  acquireKnowledgeIndexLease,
  inspectKnowledgeIndexLease,
  releaseKnowledgeIndexLease,
  renewKnowledgeIndexLease,
  waitForKnowledgeIndexLeaseRelease,
} from "./knowledge-index-lease";

const EMBEDDING_DIM = 256;
const INDEX_SCHEMA = "ccm-knowledge-index-v3";
const PARSER_VERSION = "semantic-chunks-v3-zh-bigram";
const TARGET_CHUNK_CHARS = 1100;
const MAX_CHUNK_CHARS = 1500;

function cryptoRandomSuffix() {
  return sha256(`${process.pid}:${Date.now()}:${Math.random()}`).slice(0, 10);
}

export type KnowledgeChunk = {
  id: string;
  filename: string;
  index: number;
  domain: string;
  scope: KnowledgeScope;
  heading: string;
  text: string;
  tokens: Set<string>;
  tf: Record<string, number>;
  embedding: number[];
  semanticEmbedding?: number[];
  semantic?: Omit<KnowledgeVectorResult, "vector">;
  charStart: number;
  charEnd: number;
};

type StoredChunk = Omit<KnowledgeChunk, "tokens"> & { tokens: string[] };

type IndexCacheEntry = {
  hash: string;
  size: number;
  mtimeMs: number;
  parserVersion: string;
  embeddingSignature: string;
  parser: string;
  parseStatus: string;
  parseError: string;
  content: string;
  chunks: StoredChunk[];
};

type IndexCache = {
  schema: string;
  generation: string;
  updatedAt: string;
  entries: Record<string, IndexCacheEntry>;
};

export type KnowledgeSearchOptions = {
  limit?: number;
  filename?: string;
  filenames?: string[];
  tags?: string[];
  domain?: string;
  scopeType?: string;
  scopeId?: string;
  includeGlobal?: boolean;
};

export type KnowledgeIndexStatus = {
  state: "idle" | "building" | "ready" | "failed";
  reason: string;
  startedAt: string;
  completedAt: string;
  lastSuccessfulAt: string;
  error: string;
  processedDocuments: number;
  totalDocuments: number;
  documents: number;
  chunks: number;
  cacheHits: number;
  semanticReady: number;
  semanticFailed: number;
  semanticPending: number;
  localVectors: number;
  remoteVectors: number;
  lexicalChunks: number;
  activeGeneration: string;
  lastGoodGeneration: string;
  staleServed: boolean;
  fallbackReason: string;
  buildLease: any;
  localModel: any;
  parseFailures: Array<{ filename: string; error: string }>;
  queued: boolean;
};

let documentChunks: KnowledgeChunk[] = [];
let documentContent = new Map<string, { content: string; parser: string; status: string; error: string }>();
let activeRebuild: Promise<KnowledgeIndexStatus> | null = null;
let rebuildQueued = false;
let queuedReason = "";
let indexStatus: KnowledgeIndexStatus = {
  state: "idle",
  reason: "startup",
  startedAt: "",
  completedAt: "",
  lastSuccessfulAt: "",
  error: "",
  processedDocuments: 0,
  totalDocuments: 0,
  documents: 0,
  chunks: 0,
  cacheHits: 0,
  semanticReady: 0,
  semanticFailed: 0,
  semanticPending: 0,
  localVectors: 0,
  remoteVectors: 0,
  lexicalChunks: 0,
  activeGeneration: "",
  lastGoodGeneration: "",
  staleServed: false,
  fallbackReason: "",
  buildLease: null,
  localModel: null,
  parseFailures: [],
  queued: false,
};

function atomicWriteJson(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value), "utf-8");
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
  } finally {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
  }
}

function generationFile(generation: string) {
  return path.join(RAG_INDEX_V3_DIR, `${generation}.json`);
}

function loadPointer(): { schema: string; activeGeneration: string; lastGoodGeneration: string; updatedAt: string } {
  for (const file of [RAG_INDEX_V3_POINTER_FILE, `${RAG_INDEX_V3_POINTER_FILE}.bak`]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed?.schema === "ccm-knowledge-index-pointer-v1") return parsed;
    } catch {}
  }
  return { schema: "ccm-knowledge-index-pointer-v1", activeGeneration: "", lastGoodGeneration: "", updatedAt: "" };
}

function activateGeneration(cache: IndexCache) {
  fs.mkdirSync(RAG_INDEX_V3_DIR, { recursive: true });
  const file = generationFile(cache.generation);
  fs.writeFileSync(file, JSON.stringify(cache), { encoding: "utf-8", mode: 0o600, flag: "wx" });
  const pointer = {
    schema: "ccm-knowledge-index-pointer-v1",
    activeGeneration: cache.generation,
    lastGoodGeneration: cache.generation,
    updatedAt: cache.updatedAt,
  };
  const temp = `${RAG_INDEX_V3_POINTER_FILE}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${RAG_INDEX_V3_POINTER_FILE}.bak`;
  fs.writeFileSync(temp, JSON.stringify(pointer), { encoding: "utf-8", mode: 0o600 });
  try {
    try { if (fs.existsSync(backup)) fs.unlinkSync(backup); } catch {}
    if (fs.existsSync(RAG_INDEX_V3_POINTER_FILE)) fs.renameSync(RAG_INDEX_V3_POINTER_FILE, backup);
    fs.renameSync(temp, RAG_INDEX_V3_POINTER_FILE);
    try { if (fs.existsSync(backup)) fs.unlinkSync(backup); } catch {}
  } catch (error) {
    try { if (!fs.existsSync(RAG_INDEX_V3_POINTER_FILE) && fs.existsSync(backup)) fs.renameSync(backup, RAG_INDEX_V3_POINTER_FILE); } catch {}
    throw error;
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
  }
  const retained = new Set([pointer.activeGeneration, pointer.lastGoodGeneration]);
  const generations = fs.readdirSync(RAG_INDEX_V3_DIR).filter(name => /^gen_[a-z0-9_-]+\.json$/i.test(name)).sort().reverse();
  for (const name of generations.slice(3)) {
    const generation = name.replace(/\.json$/, "");
    if (!retained.has(generation)) try { fs.unlinkSync(path.join(RAG_INDEX_V3_DIR, name)); } catch {}
  }
  return pointer;
}

function loadIndexCache(): IndexCache {
  try {
    const pointer = loadPointer();
    if (pointer.activeGeneration) {
      const parsed = JSON.parse(fs.readFileSync(generationFile(pointer.activeGeneration), "utf-8"));
      if (parsed?.schema === INDEX_SCHEMA && parsed?.entries) return parsed;
    }
    if (fs.existsSync(RAG_INDEX_CACHE_FILE)) {
      const legacy = JSON.parse(fs.readFileSync(RAG_INDEX_CACHE_FILE, "utf-8"));
      if (legacy?.entries) return { ...legacy, schema: INDEX_SCHEMA, generation: "legacy-v2" };
    }
  } catch {
    // A broken active pointer must not prevent a clean rebuild.
  }
  return { schema: INDEX_SCHEMA, generation: "", updatedAt: "", entries: {} };
}

export function tokenizeKnowledgeText(text: string): string[] {
  const lower = String(text || "").toLowerCase();
  const tokens: string[] = [];
  const regex = /([a-z0-9_]+|[\u4e00-\u9fff]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lower)) !== null) {
    const value = match[1];
    if (/^[\u4e00-\u9fff]+$/.test(value)) {
      const chars = Array.from(value);
      tokens.push(...chars);
      for (let index = 0; index < chars.length - 1; index++) tokens.push(`${chars[index]}${chars[index + 1]}`);
      if (chars.length > 1 && chars.length <= 8) tokens.push(value);
    } else {
      tokens.push(value);
    }
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

function buildHashingEmbedding(tf: Record<string, number>) {
  const vector = Array.from({ length: EMBEDDING_DIM }, () => 0);
  for (const [token, count] of Object.entries(tf)) {
    const hash = hashString(token);
    vector[hash % EMBEDDING_DIM] += (hash & 1) === 0 ? Math.log(1 + Number(count || 0)) : -Math.log(1 + Number(count || 0));
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => value / norm);
}

function cosineSimilarity(a: number[] = [], b: number[] = []) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i++) dot += (a[i] || 0) * (b[i] || 0);
  return dot;
}

type SemanticUnit = { text: string; heading: string };

function splitLongUnit(text: string, heading: string): SemanticUnit[] {
  const source = String(text || "").trim();
  if (!source) return [];
  if (source.length <= MAX_CHUNK_CHARS) return [{ text: source, heading }];
  const units: SemanticUnit[] = [];
  let rest = source;
  while (rest.length > MAX_CHUNK_CHARS) {
    const window = rest.slice(0, MAX_CHUNK_CHARS);
    const candidates = [window.lastIndexOf("\n"), window.lastIndexOf("。"), window.lastIndexOf("；"), window.lastIndexOf(". ")];
    const splitAt = Math.max(...candidates.filter(value => value >= Math.floor(TARGET_CHUNK_CHARS * 0.55)));
    const end = splitAt > 0 ? splitAt + 1 : MAX_CHUNK_CHARS;
    units.push({ text: rest.slice(0, end).trim(), heading });
    rest = rest.slice(end).trim();
  }
  if (rest) units.push({ text: rest, heading });
  return units;
}

function markdownUnits(content: string): SemanticUnit[] {
  const lines = content.split("\n");
  const units: SemanticUnit[] = [];
  // headingStack 按标题层级保留祖先标题，heading 记录完整路径（如"安装 › 环境变量配置"），
  // 而不是只记录最近一级标题——这样引用和检索都能看到分片所在的完整上下文位置。
  const headingStack: string[] = [];
  let heading = "";
  let buffer: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) units.push(...splitLongUnit(text, heading));
    buffer = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const headingMatch = !inFence ? line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/) : null;
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      headingStack.length = level - 1;
      headingStack[level - 1] = headingMatch[2].trim();
      heading = headingStack.filter(Boolean).join(" › ").slice(0, 200);
      buffer.push(line);
      continue;
    }
    if (!inFence && !line.trim()) {
      flush();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return units;
}

function codeUnits(content: string): SemanticUnit[] {
  const lines = content.split("\n");
  const units: SemanticUnit[] = [];
  let buffer: string[] = [];
  let heading = "";
  const boundary = /^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const\s+\w+\s*=\s*(?:async\s*)?\(|def|class|func|public\s+(?:class|interface)|private\s+\w+\s*\()/;
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) units.push(...splitLongUnit(text, heading));
    buffer = [];
  };
  for (const line of lines) {
    if (boundary.test(line) && buffer.length) flush();
    if (boundary.test(line)) heading = line.trim().slice(0, 120);
    buffer.push(line);
    if (!line.trim() && buffer.join("\n").length >= TARGET_CHUNK_CHARS) flush();
  }
  flush();
  return units;
}

function proseUnits(content: string, tabular = false): SemanticUnit[] {
  const raw = tabular ? content.split("\n") : content.split(/\n\s*\n+/);
  return raw.flatMap(part => splitLongUnit(part, ""));
}

export function formatAwareChunkText(content: string, extension = ".txt") {
  const normalized = String(content || "").replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (!normalized) return [];
  const ext = String(extension || "").toLowerCase();
  const codeExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".vue", ".py", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".hpp", ".php", ".rb", ".swift", ".kt", ".css", ".sql", ".sh", ".ps1"]);
  const units = ext === ".md"
    ? markdownUnits(normalized)
    : codeExtensions.has(ext)
      ? codeUnits(normalized)
      : proseUnits(normalized, [".csv", ".xlsx", ".log"].includes(ext));
  const chunks: Array<{ text: string; heading: string; charStart: number; charEnd: number }> = [];
  let current: SemanticUnit[] = [];
  let cursor = 0;
  const flush = () => {
    if (!current.length) return;
    const text = current.map(unit => unit.text).join("\n\n").trim();
    const heading = current.find(unit => unit.heading)?.heading || "";
    const charStart = Math.max(0, normalized.indexOf(current[0].text.slice(0, 80), cursor));
    const safeStart = charStart < 0 ? cursor : charStart;
    chunks.push({ text, heading, charStart: safeStart, charEnd: Math.min(normalized.length, safeStart + text.length) });
    cursor = Math.max(cursor, safeStart + Math.max(1, text.length - 180));
    current = [];
  };
  for (const unit of units) {
    const projected = current.reduce((sum, item) => sum + item.text.length + 2, 0) + unit.text.length;
    const headingChanged = current.length > 0 && unit.heading && current[0].heading && unit.heading !== current[0].heading;
    if (current.length && (projected > MAX_CHUNK_CHARS || headingChanged)) flush();
    current.push(unit);
    if (current.reduce((sum, item) => sum + item.text.length + 2, 0) >= TARGET_CHUNK_CHARS) flush();
  }
  flush();
  // 相邻分片之间补一段重叠尾部：答案跨越两个 chunk 边界时，靠这段重叠内容
  // 也能被单个 chunk 命中，避免只召回半句话。charStart/charEnd 不受影响，
  // 仍然表示这个 chunk 自己的主内容范围，重叠只追加进 text 里辅助召回。
  // 从后往前遍历保证读取 chunks[i-1] 时它还是未被重叠追加过的原始文本。
  const OVERLAP_CHARS = 140;
  for (let index = chunks.length - 1; index > 0; index--) {
    const previousText = chunks[index - 1].text;
    if (!previousText) continue;
    const window = previousText.slice(-OVERLAP_CHARS);
    const boundary = Math.max(window.indexOf("\n"), window.indexOf("。"), window.indexOf(". "));
    const tail = (boundary > 0 ? window.slice(boundary + 1) : window).trim();
    if (tail && !chunks[index].text.startsWith(tail)) {
      chunks[index].text = `${tail}\n\n${chunks[index].text}`;
    }
  }
  return chunks;
}

function serializeChunk(chunk: KnowledgeChunk): StoredChunk {
  return { ...chunk, tokens: Array.from(chunk.tokens) };
}

function hydrateChunk(chunk: StoredChunk, scope: KnowledgeScope, domain: string): KnowledgeChunk {
  return { ...chunk, scope, domain, tokens: new Set(chunk.tokens || []) };
}

function recordChunkEmbeddingStatus(chunks: KnowledgeChunk[], status: KnowledgeIndexStatus) {
  for (const chunk of chunks) {
    if (chunk.semantic?.state === "ready" && chunk.semanticEmbedding?.length === chunk.semantic.dimension) {
      status.semanticReady += 1;
      if (chunk.semantic.backend === "remote") status.remoteVectors += 1;
      else if (chunk.semantic.backend === "local") status.localVectors += 1;
      else status.lexicalChunks += 1;
    } else if (chunk.semantic?.state === "pending") {
      status.semanticPending += 1;
      status.lexicalChunks += 1;
    } else if (chunk.semantic?.state === "failed") {
      status.semanticFailed += 1;
      status.lexicalChunks += 1;
    } else {
      status.lexicalChunks += 1;
    }
  }
}

function hydrateActiveCache(cache: IndexCache) {
  if (!cache.generation) return false;
  const metadata = loadKnowledgeMetadata();
  const nextChunks: KnowledgeChunk[] = [];
  const nextContent = new Map<string, { content: string; parser: string; status: string; error: string }>();
  for (const [filename, entry] of Object.entries(cache.entries || {})) {
    const scope = metadata[filename]?.scope || { type: "global", id: "" };
    const domain = metadata[filename]?.domain || scope.id || scope.type || "global";
    nextContent.set(filename, { content: entry.content, parser: entry.parser, status: entry.parseStatus, error: entry.parseError });
    nextChunks.push(...(entry.chunks || []).map(chunk => hydrateChunk(chunk, scope, domain)));
  }
  documentChunks = nextChunks;
  documentContent = nextContent;
  return true;
}

export function loadActiveKnowledgeIndex() {
  const cache = loadIndexCache();
  const loaded = hydrateActiveCache(cache);
  if (loaded) {
    const pointer = loadPointer();
    const nextStatus: KnowledgeIndexStatus = {
      ...indexStatus,
      state: "ready",
      reason: "active-generation",
      completedAt: cache.updatedAt,
      lastSuccessfulAt: cache.updatedAt,
      documents: Object.keys(cache.entries).length,
      chunks: documentChunks.length,
      processedDocuments: Object.keys(cache.entries).length,
      totalDocuments: Object.keys(cache.entries).length,
      semanticReady: 0,
      semanticFailed: 0,
      semanticPending: 0,
      localVectors: 0,
      remoteVectors: 0,
      lexicalChunks: 0,
      activeGeneration: cache.generation,
      lastGoodGeneration: pointer.lastGoodGeneration || cache.generation,
      staleServed: inspectKnowledgeIndexLease().active,
      buildLease: inspectKnowledgeIndexLease().lease,
      localModel: getLocalKnowledgeModelStatus(),
      queued: false,
    };
    recordChunkEmbeddingStatus(documentChunks, nextStatus);
    indexStatus = nextStatus;
  }
  return loaded;
}

function embeddingSignature(config: any) {
  const backend = preferredKnowledgeEmbeddingBackend(config);
  const runtime = knowledgeEmbeddingUsesTestAdapter() ? ":test-adapter" : "";
  if (backend === "remote") {
    let endpoint = "remote";
    try { const url = new URL(config.apiUrl); endpoint = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`; } catch {}
    return `remote:${endpoint}:${config.model}${runtime}`;
  }
  if (backend === "local") return `local:${config.localModel}:${config.localRevision}:${config.localDtype}${runtime}`;
  return `lexical${runtime}`;
}

function semanticReceipt(result: KnowledgeVectorResult): Omit<KnowledgeVectorResult, "vector"> {
  const { vector: _vector, ...receipt } = result;
  return receipt;
}

async function embedChunkBatch(texts: string[], backend: KnowledgeEmbeddingBackend, embeddingConfig: any) {
  if (backend === "remote") return embedRemoteKnowledgeTexts(texts, "passage", embeddingConfig);
  if (backend === "local") return embedLocalKnowledgeTexts(texts, "passage", embeddingConfig);
  return [];
}

async function populateChunkEmbeddings(chunks: KnowledgeChunk[], embeddingConfig: any, status: KnowledgeIndexStatus) {
  const preferred = preferredKnowledgeEmbeddingBackend(embeddingConfig);
  if (preferred === "lexical" || !chunks.length) {
    status.lexicalChunks += chunks.length;
    return;
  }
  if (preferred === "local" && getLocalKnowledgeModelStatus().state !== "ready") {
    for (const chunk of chunks) {
      chunk.semantic = {
        state: "pending",
        backend: "local",
        model: embeddingConfig.localModel,
        revision: embeddingConfig.localRevision,
        dimension: 384,
        checksum: "",
        error: "本地Embedding模型正在准备",
      };
    }
    status.semanticPending += chunks.length;
    status.lexicalChunks += chunks.length;
    status.fallbackReason = "local_model_preparing";
    void prepareLocalKnowledgeModel();
    return;
  }
  const batchSize = preferred === "remote" ? Math.max(1, Math.min(32, Number(embeddingConfig.batchSize) || 32)) : 8;
  const batches: KnowledgeChunk[][] = [];
  for (let offset = 0; offset < chunks.length; offset += batchSize) batches.push(chunks.slice(offset, offset + batchSize));
  let cursor = 0;
  let consecutiveRemoteFailures = 0;
  let remoteCircuitOpen = false;
  const worker = async () => {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      let results: KnowledgeVectorResult[] = [];
      let usedBackend = preferred;
      try {
        if (preferred === "remote" && remoteCircuitOpen) throw new Error("远程Embedding本轮熔断已打开");
        results = await embedChunkBatch(batch.map(chunk => `${chunk.filename}\n${chunk.heading}\n${chunk.text}`), preferred, embeddingConfig);
        consecutiveRemoteFailures = 0;
      } catch (batchError: any) {
        if (preferred === "remote" && batch.length > 1 && !remoteCircuitOpen) {
          try {
            results = [];
            for (const chunk of batch) results.push(...await embedRemoteKnowledgeTexts([`${chunk.filename}\n${chunk.heading}\n${chunk.text}`], "passage", embeddingConfig));
            consecutiveRemoteFailures = 0;
          } catch (singleError: any) {
            consecutiveRemoteFailures += 1;
            if (consecutiveRemoteFailures >= 3) remoteCircuitOpen = true;
            if (!status.error) status.error = `部分远程语义向量生成失败：${String(singleError?.message || singleError).slice(0, 300)}`;
          }
        } else {
          consecutiveRemoteFailures += preferred === "remote" ? 1 : 0;
          if (consecutiveRemoteFailures >= 3) remoteCircuitOpen = true;
          if (!status.error) status.error = `部分语义向量生成失败：${String(batchError?.message || batchError).slice(0, 300)}`;
        }
        if (!results.length && preferred === "remote" && getLocalKnowledgeModelStatus().state === "ready") {
          try {
            usedBackend = "local";
            results = await embedLocalKnowledgeTexts(batch.map(chunk => `${chunk.filename}\n${chunk.heading}\n${chunk.text}`), "passage", embeddingConfig);
          } catch {}
        }
      }
      for (let index = 0; index < batch.length; index++) {
        const result = results[index];
        if (result?.state === "ready" && result.vector?.length) {
          batch[index].semanticEmbedding = result.vector;
          batch[index].semantic = semanticReceipt({ ...result, backend: usedBackend });
          status.semanticReady += 1;
          if (usedBackend === "remote") status.remoteVectors += 1;
          else status.localVectors += 1;
        } else {
          batch[index].semanticEmbedding = undefined;
          batch[index].semantic = {
            state: "failed",
            backend: preferred,
            model: preferred === "remote" ? embeddingConfig.model : embeddingConfig.localModel,
            revision: preferred === "local" ? embeddingConfig.localRevision : "",
            dimension: 0,
            checksum: "",
            error: status.error || "Embedding向量缺失",
          };
          status.semanticFailed += 1;
          status.lexicalChunks += 1;
        }
      }
      if (remoteCircuitOpen) {
        status.fallbackReason = "remote_embedding_circuit_open";
        if (getLocalKnowledgeModelStatus().state !== "ready") void prepareLocalKnowledgeModel();
      }
    }
  };
  const concurrency = preferred === "remote" ? Math.min(2, batches.length) : 1;
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

async function buildDocumentChunks(filename: string, content: string, scope: KnowledgeScope, domain: string, embeddingConfig: any, status: KnowledgeIndexStatus) {
  const pieces = formatAwareChunkText(content, path.extname(filename));
  const chunks: KnowledgeChunk[] = [];
  for (let index = 0; index < pieces.length; index++) {
    const piece = pieces[index];
    const tokens = tokenizeKnowledgeText(`${filename} ${piece.heading} ${piece.text}`);
    const tf: Record<string, number> = {};
    for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
    // 引用 ID 用内容短哈希而不是纯顺序号：文档开头插入新内容会让后面所有分片的顺序号
    // 整体偏移，导致历史引用（[source:文件名#N]）全部失效。只要分片内容本身没变，
    // 它的引用标识就不随其他分片的增删而改变；顺序号仅在极小概率哈希冲突时兜底区分。
    chunks.push({
      id: `${filename}#${sha256(`${piece.heading}\n${piece.text}`).slice(0, 10)}_${index}`,
      filename,
      index,
      domain,
      scope,
      heading: piece.heading,
      text: piece.text,
      tokens: new Set(tokens),
      tf,
      embedding: buildHashingEmbedding(tf),
      charStart: piece.charStart,
      charEnd: piece.charEnd,
    });
  }
  await populateChunkEmbeddings(chunks, embeddingConfig, status);
  return chunks;
}

async function performRebuild(reason: string) {
  const startedAt = new Date().toISOString();
  const files = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(name => isSupportedKnowledgeFilename(name))
    .filter(name => {
      try { return fs.statSync(resolveKnowledgeFile(name, true)).isFile(); } catch { return false; }
    });
  indexStatus = {
    ...indexStatus,
    state: "building",
    reason,
    startedAt,
    completedAt: "",
    error: "",
    processedDocuments: 0,
    totalDocuments: files.length,
    cacheHits: 0,
    semanticReady: 0,
    semanticFailed: 0,
    semanticPending: 0,
    localVectors: 0,
    remoteVectors: 0,
    lexicalChunks: 0,
    staleServed: documentChunks.length > 0,
    fallbackReason: "",
    buildLease: inspectKnowledgeIndexLease().lease,
    localModel: getLocalKnowledgeModelStatus(),
    parseFailures: [],
    queued: rebuildQueued,
  };
  const metadata = loadKnowledgeMetadata();
  const embeddingConfig = loadRagEmbeddingConfig();
  const signature = embeddingSignature(embeddingConfig);
  const previousCache = loadIndexCache();
  const generation = `gen_${Date.now().toString(36)}_${process.pid}_${cryptoRandomSuffix()}`;
  const nextCache: IndexCache = { schema: INDEX_SCHEMA, generation, updatedAt: "", entries: {} };
  const nextChunks: KnowledgeChunk[] = [];
  const nextContent = new Map<string, { content: string; parser: string; status: string; error: string }>();

  for (const filename of files) {
    const filePath = resolveKnowledgeFile(filename, true);
    const stat = fs.statSync(filePath);
    // 必须每次都从磁盘真实内容计算hash，不能信任metadata里存的旧值：
    // 监控目录里的文件可能在CCM未运行期间被外部修改，metadata不会自动更新。
    const fileHash = sha256(fs.readFileSync(filePath));
    const scope = metadata[filename]?.scope || { type: "global", id: "" };
    const domain = metadata[filename]?.domain || scope.id || scope.type || "global";
    const cached = previousCache.entries[filename];
    const cachedChunks = Array.isArray(cached?.chunks) ? cached.chunks : [];
    const semanticCacheValid = signature === "lexical" || (cachedChunks.length > 0 && cachedChunks.every((chunk: any) => {
      const expectedBackend = preferredKnowledgeEmbeddingBackend(embeddingConfig);
      return chunk.semantic?.state === "ready"
        && chunk.semantic?.backend === expectedBackend
        && Array.isArray(chunk.semanticEmbedding)
        && chunk.semanticEmbedding.length === Number(chunk.semantic?.dimension || 0)
        && !!chunk.semantic?.checksum;
    }));
    const cacheValid = cached
      && cached.hash === fileHash
      && cached.parserVersion === PARSER_VERSION
      && cached.embeddingSignature === signature
      && semanticCacheValid;
    let entry: IndexCacheEntry;
    if (cacheValid) {
      entry = cached;
      indexStatus.cacheHits += 1;
      recordChunkEmbeddingStatus(entry.chunks.map(chunk => hydrateChunk(chunk, scope, domain)), indexStatus);
    } else {
      const parsed = await parseKnowledgeDocument(filePath, filename);
      const built = parsed.content
        ? await buildDocumentChunks(filename, parsed.content, scope, domain, embeddingConfig, indexStatus)
        : [];
      entry = {
        hash: fileHash,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        parserVersion: PARSER_VERSION,
        embeddingSignature: signature,
        parser: parsed.parser,
        parseStatus: parsed.status,
        parseError: parsed.error,
        content: parsed.content,
        chunks: built.map(serializeChunk),
      };
    }
    nextCache.entries[filename] = entry;
    nextContent.set(filename, { content: entry.content, parser: entry.parser, status: entry.parseStatus, error: entry.parseError });
    nextChunks.push(...entry.chunks.map(chunk => hydrateChunk(chunk, scope, domain)));
    if (entry.parseStatus === "failed") indexStatus.parseFailures.push({ filename, error: entry.parseError || "解析失败" });
    const current = metadata[filename] || {} as any;
    updateKnowledgeMetadata(filename, {
      ...current,
      scope,
      parser: entry.parser,
      parse_status: entry.parseStatus,
      parse_error: entry.parseError,
      indexed_at: new Date().toISOString(),
      updated_at: current.updated_at || stat.mtime.toISOString(),
      content_hash: fileHash,
    });
    indexStatus.processedDocuments += 1;
    indexStatus.chunks = nextChunks.length;
  }

  nextCache.updatedAt = new Date().toISOString();
  const pointer = activateGeneration(nextCache);
  documentChunks = nextChunks;
  documentContent = nextContent;
  indexStatus = {
    ...indexStatus,
    state: "ready",
    completedAt: nextCache.updatedAt,
    lastSuccessfulAt: nextCache.updatedAt,
    documents: files.length,
    chunks: nextChunks.length,
    activeGeneration: nextCache.generation,
    lastGoodGeneration: pointer.lastGoodGeneration || nextCache.generation,
    staleServed: false,
    buildLease: inspectKnowledgeIndexLease().lease,
    localModel: getLocalKnowledgeModelStatus(),
    queued: rebuildQueued,
  };
  console.log(`[RAG] 索引构建完成：${files.length} 份文档，${nextChunks.length} 个语义分片，缓存命中 ${indexStatus.cacheHits}`);
  if (indexStatus.semanticPending > 0 && preferredKnowledgeEmbeddingBackend(embeddingConfig) === "local") {
    void prepareLocalKnowledgeModel().then(model => {
      if (model.state === "ready") void rebuildKnowledgeIndex("local-model-ready");
    });
  }
}

export function rebuildKnowledgeIndex(reason = "manual") {
  rebuildQueued = true;
  queuedReason = reason;
  indexStatus.queued = !!activeRebuild;
  if (activeRebuild) return activeRebuild;
  activeRebuild = (async () => {
    let leaseOwner = "";
    try {
      while (rebuildQueued) {
        const nextReason = queuedReason || reason;
        rebuildQueued = false;
        queuedReason = "";
        const lease = acquireKnowledgeIndexLease(nextReason);
        if (!lease.acquired) {
          if (loadActiveKnowledgeIndex()) {
            indexStatus = { ...indexStatus, staleServed: true, buildLease: lease.lease, reason: "waiting-for-index-builder" };
            await waitForKnowledgeIndexLeaseRelease(60_000);
            loadActiveKnowledgeIndex();
            continue;
          }
          const released = await waitForKnowledgeIndexLeaseRelease(60_000);
          if (!released || !loadActiveKnowledgeIndex()) throw new Error("知识索引由其他进程构建中，等待可用generation超时");
          continue;
        }
        leaseOwner = String(lease.lease?.ownerId || "");
        const renewTimer = setInterval(() => renewKnowledgeIndexLease(leaseOwner), 60_000);
        renewTimer.unref?.();
        try { await performRebuild(nextReason); } finally { clearInterval(renewTimer); }
        releaseKnowledgeIndexLease(leaseOwner);
        leaseOwner = "";
      }
      return getKnowledgeIndexStatus();
    } catch (error: any) {
      indexStatus = {
        ...indexStatus,
        state: "failed",
        completedAt: new Date().toISOString(),
        error: String(error?.message || error || "索引构建失败").slice(0, 500),
        staleServed: documentChunks.length > 0,
        fallbackReason: documentChunks.length > 0 ? "last_good_generation" : "index_unavailable",
        buildLease: inspectKnowledgeIndexLease().lease,
        localModel: getLocalKnowledgeModelStatus(),
        queued: false,
      };
      return getKnowledgeIndexStatus();
    } finally {
      if (leaseOwner) releaseKnowledgeIndexLease(leaseOwner);
      activeRebuild = null;
      indexStatus.queued = false;
    }
  })();
  return activeRebuild;
}

export function waitForKnowledgeIndex(reason = "agent-retrieval") {
  if (activeRebuild) return activeRebuild;
  if (indexStatus.state === "ready") return Promise.resolve(getKnowledgeIndexStatus());
  if (loadActiveKnowledgeIndex()) return Promise.resolve(getKnowledgeIndexStatus());
  return rebuildKnowledgeIndex(reason);
}

export function getKnowledgeIndexStatus(): KnowledgeIndexStatus {
  return JSON.parse(JSON.stringify({
    ...indexStatus,
    localModel: getLocalKnowledgeModelStatus(),
    buildLease: inspectKnowledgeIndexLease().lease,
  }));
}

export function pruneKnowledgeIndexGenerations() {
  const pointer = loadPointer();
  const keep = new Set([pointer.activeGeneration, pointer.lastGoodGeneration].filter(Boolean));
  let removed = 0;
  if (fs.existsSync(RAG_INDEX_V3_DIR)) {
    for (const name of fs.readdirSync(RAG_INDEX_V3_DIR).filter(item => /^gen_[a-z0-9_-]+\.json$/i.test(item))) {
      const generation = name.replace(/\.json$/, "");
      if (keep.has(generation)) continue;
      try { fs.unlinkSync(path.join(RAG_INDEX_V3_DIR, name)); removed += 1; } catch {}
    }
  }
  try { if (fs.existsSync(RAG_INDEX_CACHE_FILE)) { fs.unlinkSync(RAG_INDEX_CACHE_FILE); removed += 1; } } catch {}
  return { removed, retained: Array.from(keep), activeGeneration: pointer.activeGeneration };
}

export function getKnowledgeDocumentChunks(filename: string) {
  resolveKnowledgeFile(filename, true);
  return documentChunks.filter(chunk => chunk.filename === filename).map(chunk => ({
    id: chunk.id,
    index: chunk.index,
    heading: chunk.heading,
    text: chunk.text,
    tokenCount: chunk.tokens.size,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
    citation: chunk.id,
  }));
}

export function getParsedKnowledgeDocument(filename: string) {
  resolveKnowledgeFile(filename, true);
  return documentContent.get(filename) || null;
}

function matchesScope(scope: KnowledgeScope, options: KnowledgeSearchOptions) {
  const scopeType = String(options.scopeType || "").trim().toLowerCase();
  if (!scopeType || scopeType === "all") return true;
  if (scope.type === scopeType && (!options.scopeId || scope.id === options.scopeId)) return true;
  return options.includeGlobal !== false && scopeType !== "global" && scope.type === "global";
}

// 范围、可见性和"文档是否仍存在"必须以当前 metadata 为准，而不是索引构建那一刻缓存在
// chunk 上的旧值：否则删除文档、收紧范围或改为受限后，只要重建尚未完成或失败，
// 检索仍会命中已删除/已变更权限的分片。metadata 的删除与更新都是同步生效的，
// 这样做不需要额外的 tombstone 机制。
function eligibleKnowledgeChunks(options: KnowledgeSearchOptions = {}) {
  const metadata = loadKnowledgeMetadata();
  return documentChunks.filter(chunk => {
    const current = metadata[chunk.filename];
    if (!current) return false; // 文档已被删除，索引尚未刷新
    if (options.filename && chunk.filename !== options.filename) return false;
    if (Array.isArray(options.filenames) && !options.filenames.includes(chunk.filename)) return false;
    const scope = current.scope || chunk.scope;
    const domain = current.domain || chunk.domain;
    if (options.domain && domain !== options.domain) return false;
    if (!matchesScope(scope, options)) return false;
    if (options.tags?.length) {
      const tags = current.tags || [];
      if (!options.tags.some(tag => tags.includes(tag))) return false;
    }
    return true;
  });
}

function keywordSearch(query: string, options: KnowledgeSearchOptions = {}) {
  const queryTokens = tokenizeKnowledgeText(query);
  if (!queryTokens.length || !documentChunks.length) return [];
  const queryTf: Record<string, number> = {};
  for (const token of queryTokens) queryTf[token] = (queryTf[token] || 0) + 1;
  const queryEmbedding = buildHashingEmbedding(queryTf);
  const querySet = new Set(queryTokens);
  const eligible = eligibleKnowledgeChunks(options);
  const total = Math.max(1, eligible.length);
  const df: Record<string, number> = {};
  for (const token of querySet) df[token] = eligible.filter(chunk => chunk.tokens.has(token)).length;
  return eligible.map(chunk => {
    let keywordScore = 0;
    let covered = 0;
    for (const token of querySet) {
      if (!chunk.tf[token]) continue;
      covered += 1;
      keywordScore += chunk.tf[token] * (Math.log(total / ((df[token] || 0) + 1)) + 1);
    }
    const vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));
    const coverage = covered / Math.max(1, querySet.size);
    const titleBoost = tokenizeKnowledgeText(`${chunk.filename} ${chunk.heading}`).some(token => querySet.has(token)) ? 0.12 : 0;
    const score = keywordScore * 0.62 + vectorScore * 3.2 + coverage * 1.2 + titleBoost;
    return { chunk, score, keywordScore, vectorScore, coverage, embeddingMode: "hashing" };
  }).filter(item => item.score > 0.02).sort((a, b) => b.score - a.score);
}

export async function searchKnowledgeBase(query: string, options: KnowledgeSearchOptions = {}) {
  if (indexStatus.state !== "ready" && documentChunks.length === 0) await waitForKnowledgeIndex("search");
  if (indexStatus.state !== "ready" && documentChunks.length === 0) {
    return {
      results: [],
      embeddingMode: "index-building",
      embeddingError: indexStatus.error || "知识索引正在构建",
      fallbackReason: "index_building",
      indexGeneration: indexStatus.activeGeneration,
      staleServed: false,
      scopeChecksum: "",
      candidateCounts: { eligible: 0, lexical: 0, semantic: 0, merged: 0 },
    };
  }
  const servedStale = indexStatus.state !== "ready" && documentChunks.length > 0;
  const config = loadRagEmbeddingConfig();
  const eligible = eligibleKnowledgeChunks(options);
  const queryVectors = new Map<KnowledgeEmbeddingBackend, number[]>();
  let embeddingMode = "lexical";
  let embeddingError = "";
  let fallbackReason = "";
  const semanticBackends = new Set(eligible
    .filter(chunk => chunk.semantic?.state === "ready" && chunk.semanticEmbedding?.length)
    .map(chunk => chunk.semantic!.backend)
    .filter(backend => backend === "remote" || backend === "local"));
  if (config.mode !== "lexical") {
    for (const backend of semanticBackends) {
      try {
        const result = backend === "remote"
          ? (await embedRemoteKnowledgeTexts([query], "query", config))[0]
          : (await embedLocalKnowledgeTexts([query], "query", config))[0];
        if (result?.state === "ready" && result.vector?.length) queryVectors.set(backend, result.vector);
      } catch (error: any) {
        embeddingError = [embeddingError, String(error?.message || error || "语义向量查询失败").slice(0, 300)].filter(Boolean).join("；");
      }
    }
  }
  const limit = Math.min(20, Math.max(1, Number(options.limit || 5)));
  const candidateLimit = Math.max(limit * 5, 30);
  const lexicalCandidates = keywordSearch(query, options).slice(0, candidateLimit);
  const merged = new Map<string, any>();
  lexicalCandidates.forEach((item, rank) => merged.set(item.chunk.id, {
    ...item,
    lexicalRank: rank + 1,
    semanticRank: 0,
    semanticScore: 0,
    retrievalMode: "lexical",
  }));
  const semanticCandidates = eligible.flatMap(chunk => {
    const backend = chunk.semantic?.backend;
    const queryVector = backend ? queryVectors.get(backend) : null;
    if (!queryVector || !chunk.semanticEmbedding?.length || chunk.semantic?.dimension !== chunk.semanticEmbedding.length) return [];
    const semanticScore = cosineSimilarity(queryVector, chunk.semanticEmbedding);
    return semanticScore > 0 ? [{ chunk, semanticScore, backend }] : [];
  }).sort((a, b) => b.semanticScore - a.semanticScore).slice(0, candidateLimit);
  semanticCandidates.forEach((item, rank) => {
    const existing = merged.get(item.chunk.id) || {
      chunk: item.chunk,
      keywordScore: 0,
      vectorScore: 0,
      coverage: 0,
      lexicalRank: 0,
    };
    merged.set(item.chunk.id, {
      ...existing,
      vectorScore: item.semanticScore,
      semanticScore: item.semanticScore,
      semanticRank: rank + 1,
      retrievalMode: existing.lexicalRank ? `hybrid:${item.backend}` : `semantic:${item.backend}`,
    });
  });
  const maxKeyword = Math.max(1, ...Array.from(merged.values()).map(item => Number(item.keywordScore || 0)));
  const results = Array.from(merged.values()).map(item => {
    const lexicalNormalized = Number(item.keywordScore || 0) / maxKeyword;
    const semantic = Math.max(0, Number(item.semanticScore || 0));
    const lexicalRrf = item.lexicalRank ? 1 / (60 + item.lexicalRank) : 0;
    const semanticRrf = item.semanticRank ? 1 / (60 + item.semanticRank) : 0;
    const score = lexicalNormalized * 0.38 + semantic * 0.5 + Number(item.coverage || 0) * 0.08 + (lexicalRrf + semanticRrf) * 3;
    return { ...item, score, embeddingMode: item.retrievalMode };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
  if (queryVectors.size) {
    embeddingMode = queryVectors.size > 1 ? "hybrid:multi-semantic" : `hybrid:${Array.from(queryVectors.keys())[0]}`;
  } else if (semanticBackends.size) {
    fallbackReason = "semantic_query_unavailable";
    embeddingMode = "lexical-fallback";
    if (!embeddingError) embeddingError = "语义查询向量不可用，已使用词面检索";
    if (preferredKnowledgeEmbeddingBackend(config) === "remote" && getLocalKnowledgeModelStatus().state !== "ready") void prepareLocalKnowledgeModel();
  } else if (preferredKnowledgeEmbeddingBackend(config) !== "lexical") {
    fallbackReason = "semantic_document_vectors_unavailable";
    embeddingMode = "lexical-fallback";
    embeddingError = embeddingError || indexStatus.error || "语义文档向量不可用，已使用词面检索";
  }
  return {
    results,
    embeddingMode,
    embeddingError,
    fallbackReason,
    indexGeneration: indexStatus.activeGeneration,
    staleServed: servedStale || indexStatus.staleServed,
    scopeChecksum: sha256(JSON.stringify(eligible.map(chunk => [chunk.id, chunk.scope.type, chunk.scope.id]).sort())),
    candidateCounts: { eligible: eligible.length, lexical: lexicalCandidates.length, semantic: semanticCandidates.length, merged: merged.size },
  };
}

export function queryKnowledgeBase(query: string, limit = 3, filterTags?: string[]): string {
  const results = keywordSearch(query, filterTags?.length
    ? { limit, tags: filterTags }
    : { limit, scopeType: "global", includeGlobal: false }).slice(0, Math.max(1, limit));
  return results.map((item, index) => {
    const heading = item.chunk.heading ? `；章节: ${item.chunk.heading}` : "";
    return `[知识库参考分片 #${index + 1} - 来源文件: ${item.chunk.id}${heading} (混合得分: ${item.score.toFixed(2)}；关键词: ${item.keywordScore.toFixed(2)}；向量: ${item.vectorScore.toFixed(2)})]\n${item.chunk.text}`;
  }).join("\n\n");
}

export function queryKnowledgeBaseScoped(query: string, options: KnowledgeSearchOptions = {}) {
  const results = keywordSearch(query, options).slice(0, Math.max(1, Number(options.limit || 3)));
  return results.map((item, index) => `[知识库参考分片 #${index + 1} - 来源文件: ${item.chunk.id}]\n${item.chunk.text}`).join("\n\n");
}

export function runKnowledgeIndexSelfTest() {
  const markdown = "# 安装\n\n第一步安装依赖。\n\n## 验证\n\n运行 npm test 验证。";
  const chunks = formatAwareChunkText(markdown, ".md");
  return {
    // heading 现在是完整标题路径（父级 › 子级），二级标题下的分片应带上一级标题前缀。
    pass: chunks.length >= 2 && chunks.some(chunk => chunk.heading === "安装") && chunks.some(chunk => chunk.heading === "安装 › 验证"),
    chunks,
  };
}
