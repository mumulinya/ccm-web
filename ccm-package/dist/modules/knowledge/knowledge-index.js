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
exports.tokenizeKnowledgeText = tokenizeKnowledgeText;
exports.formatAwareChunkText = formatAwareChunkText;
exports.rebuildKnowledgeIndex = rebuildKnowledgeIndex;
exports.getKnowledgeIndexStatus = getKnowledgeIndexStatus;
exports.getKnowledgeDocumentChunks = getKnowledgeDocumentChunks;
exports.getParsedKnowledgeDocument = getParsedKnowledgeDocument;
exports.searchKnowledgeBase = searchKnowledgeBase;
exports.queryKnowledgeBase = queryKnowledgeBase;
exports.queryKnowledgeBaseScoped = queryKnowledgeBaseScoped;
exports.runKnowledgeIndexSelfTest = runKnowledgeIndexSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const knowledge_files_1 = require("./knowledge-files");
const EMBEDDING_DIM = 256;
const INDEX_SCHEMA = "ccm-knowledge-index-v2";
const PARSER_VERSION = "semantic-chunks-v3-zh-bigram";
const TARGET_CHUNK_CHARS = 1100;
const MAX_CHUNK_CHARS = 1500;
let documentChunks = [];
let documentContent = new Map();
let activeRebuild = null;
let rebuildQueued = false;
let queuedReason = "";
let indexStatus = {
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
    parseFailures: [],
    queued: false,
};
function atomicWriteJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(value), "utf-8");
    try {
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
    }
    finally {
        try {
            if (fs.existsSync(tempPath))
                fs.unlinkSync(tempPath);
        }
        catch { }
    }
}
function loadIndexCache() {
    try {
        if (!fs.existsSync(knowledge_files_1.RAG_INDEX_CACHE_FILE))
            return { schema: INDEX_SCHEMA, updatedAt: "", entries: {} };
        const parsed = JSON.parse(fs.readFileSync(knowledge_files_1.RAG_INDEX_CACHE_FILE, "utf-8"));
        if (parsed?.schema !== INDEX_SCHEMA || !parsed?.entries)
            return { schema: INDEX_SCHEMA, updatedAt: "", entries: {} };
        return parsed;
    }
    catch {
        return { schema: INDEX_SCHEMA, updatedAt: "", entries: {} };
    }
}
function normalizeEmbeddingUrl(apiUrl = "") {
    const base = String(apiUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    if (base.endsWith("/embeddings"))
        return base;
    if (base.endsWith("/v1"))
        return `${base}/embeddings`;
    return `${base}/v1/embeddings`;
}
async function callEmbeddingApi(text, config = (0, knowledge_files_1.loadRagEmbeddingConfig)()) {
    if (!config.enabled || !config.apiKey || !config.model)
        return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Number(config.timeoutMs) || 60_000));
    try {
        const response = await fetch(normalizeEmbeddingUrl(config.apiUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.model, input: text.slice(0, 12_000) }),
            signal: controller.signal,
        });
        if (!response.ok)
            throw new Error(`Embedding API 返回异常 (${response.status}): ${(await response.text()).slice(0, 500)}`);
        const data = await response.json();
        const vector = data?.data?.[0]?.embedding;
        if (!Array.isArray(vector) || !vector.length)
            throw new Error("Embedding API 未返回向量");
        const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
        return vector.map((value) => value / norm);
    }
    finally {
        clearTimeout(timeout);
    }
}
function tokenizeKnowledgeText(text) {
    const lower = String(text || "").toLowerCase();
    const tokens = [];
    const regex = /([a-z0-9_]+|[\u4e00-\u9fff]+)/g;
    let match;
    while ((match = regex.exec(lower)) !== null) {
        const value = match[1];
        if (/^[\u4e00-\u9fff]+$/.test(value)) {
            const chars = Array.from(value);
            tokens.push(...chars);
            for (let index = 0; index < chars.length - 1; index++)
                tokens.push(`${chars[index]}${chars[index + 1]}`);
            if (chars.length > 1 && chars.length <= 8)
                tokens.push(value);
        }
        else {
            tokens.push(value);
        }
    }
    return tokens;
}
function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function buildHashingEmbedding(tf) {
    const vector = Array.from({ length: EMBEDDING_DIM }, () => 0);
    for (const [token, count] of Object.entries(tf)) {
        const hash = hashString(token);
        vector[hash % EMBEDDING_DIM] += (hash & 1) === 0 ? Math.log(1 + Number(count || 0)) : -Math.log(1 + Number(count || 0));
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map(value => value / norm);
}
function cosineSimilarity(a = [], b = []) {
    const length = Math.min(a.length, b.length);
    let dot = 0;
    for (let i = 0; i < length; i++)
        dot += (a[i] || 0) * (b[i] || 0);
    return dot;
}
function splitLongUnit(text, heading) {
    const source = String(text || "").trim();
    if (!source)
        return [];
    if (source.length <= MAX_CHUNK_CHARS)
        return [{ text: source, heading }];
    const units = [];
    let rest = source;
    while (rest.length > MAX_CHUNK_CHARS) {
        const window = rest.slice(0, MAX_CHUNK_CHARS);
        const candidates = [window.lastIndexOf("\n"), window.lastIndexOf("。"), window.lastIndexOf("；"), window.lastIndexOf(". ")];
        const splitAt = Math.max(...candidates.filter(value => value >= Math.floor(TARGET_CHUNK_CHARS * 0.55)));
        const end = splitAt > 0 ? splitAt + 1 : MAX_CHUNK_CHARS;
        units.push({ text: rest.slice(0, end).trim(), heading });
        rest = rest.slice(end).trim();
    }
    if (rest)
        units.push({ text: rest, heading });
    return units;
}
function markdownUnits(content) {
    const lines = content.split("\n");
    const units = [];
    let heading = "";
    let buffer = [];
    let inFence = false;
    const flush = () => {
        const text = buffer.join("\n").trim();
        if (text)
            units.push(...splitLongUnit(text, heading));
        buffer = [];
    };
    for (const line of lines) {
        if (/^\s*```/.test(line))
            inFence = !inFence;
        const headingMatch = !inFence ? line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/) : null;
        if (headingMatch) {
            flush();
            heading = headingMatch[2].trim();
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
function codeUnits(content) {
    const lines = content.split("\n");
    const units = [];
    let buffer = [];
    let heading = "";
    const boundary = /^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const\s+\w+\s*=\s*(?:async\s*)?\(|def|class|func|public\s+(?:class|interface)|private\s+\w+\s*\()/;
    const flush = () => {
        const text = buffer.join("\n").trim();
        if (text)
            units.push(...splitLongUnit(text, heading));
        buffer = [];
    };
    for (const line of lines) {
        if (boundary.test(line) && buffer.length)
            flush();
        if (boundary.test(line))
            heading = line.trim().slice(0, 120);
        buffer.push(line);
        if (!line.trim() && buffer.join("\n").length >= TARGET_CHUNK_CHARS)
            flush();
    }
    flush();
    return units;
}
function proseUnits(content, tabular = false) {
    const raw = tabular ? content.split("\n") : content.split(/\n\s*\n+/);
    return raw.flatMap(part => splitLongUnit(part, ""));
}
function formatAwareChunkText(content, extension = ".txt") {
    const normalized = String(content || "").replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
    if (!normalized)
        return [];
    const ext = String(extension || "").toLowerCase();
    const codeExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".vue", ".py", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".hpp", ".php", ".rb", ".swift", ".kt", ".css", ".sql", ".sh", ".ps1"]);
    const units = ext === ".md"
        ? markdownUnits(normalized)
        : codeExtensions.has(ext)
            ? codeUnits(normalized)
            : proseUnits(normalized, [".csv", ".xlsx", ".log"].includes(ext));
    const chunks = [];
    let current = [];
    let cursor = 0;
    const flush = () => {
        if (!current.length)
            return;
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
        if (current.length && (projected > MAX_CHUNK_CHARS || headingChanged))
            flush();
        current.push(unit);
        if (current.reduce((sum, item) => sum + item.text.length + 2, 0) >= TARGET_CHUNK_CHARS)
            flush();
    }
    flush();
    return chunks;
}
function serializeChunk(chunk) {
    return { ...chunk, tokens: Array.from(chunk.tokens) };
}
function hydrateChunk(chunk, scope, domain) {
    return { ...chunk, scope, domain, tokens: new Set(chunk.tokens || []) };
}
function embeddingSignature(config) {
    return config.enabled && config.apiKey && config.model
        ? `api:${String(config.apiUrl || "").replace(/\/+$/, "")}:${config.model}`
        : "hashing";
}
async function buildDocumentChunks(filename, content, scope, domain, embeddingConfig, status) {
    const pieces = formatAwareChunkText(content, path.extname(filename));
    const chunks = [];
    for (let index = 0; index < pieces.length; index++) {
        const piece = pieces[index];
        const tokens = tokenizeKnowledgeText(`${filename} ${piece.heading} ${piece.text}`);
        const tf = {};
        for (const token of tokens)
            tf[token] = (tf[token] || 0) + 1;
        let semanticEmbedding;
        if (embeddingConfig.enabled && embeddingConfig.apiKey && embeddingConfig.model) {
            try {
                semanticEmbedding = await callEmbeddingApi(`${filename}\n${piece.heading}\n${piece.text}`, embeddingConfig) || undefined;
                if (semanticEmbedding)
                    status.semanticReady += 1;
            }
            catch (error) {
                status.semanticFailed += 1;
                if (!status.error)
                    status.error = `部分语义向量生成失败，已回退本地检索：${String(error?.message || error).slice(0, 300)}`;
            }
        }
        chunks.push({
            id: `${filename}#${index}`,
            filename,
            index,
            domain,
            scope,
            heading: piece.heading,
            text: piece.text,
            tokens: new Set(tokens),
            tf,
            embedding: buildHashingEmbedding(tf),
            semanticEmbedding,
            charStart: piece.charStart,
            charEnd: piece.charEnd,
        });
    }
    return chunks;
}
async function performRebuild(reason) {
    const startedAt = new Date().toISOString();
    const files = fs.readdirSync(knowledge_files_1.KNOWLEDGE_DIR)
        .filter(name => (0, knowledge_files_1.isSupportedKnowledgeFilename)(name))
        .filter(name => {
        try {
            return fs.statSync((0, knowledge_files_1.resolveKnowledgeFile)(name, true)).isFile();
        }
        catch {
            return false;
        }
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
        parseFailures: [],
        queued: rebuildQueued,
    };
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const embeddingConfig = (0, knowledge_files_1.loadRagEmbeddingConfig)();
    const signature = embeddingSignature(embeddingConfig);
    const previousCache = loadIndexCache();
    const nextCache = { schema: INDEX_SCHEMA, updatedAt: "", entries: {} };
    const nextChunks = [];
    const nextContent = new Map();
    for (const filename of files) {
        const filePath = (0, knowledge_files_1.resolveKnowledgeFile)(filename, true);
        const stat = fs.statSync(filePath);
        const fileHash = metadata[filename]?.content_hash || (0, knowledge_files_1.sha256)(fs.readFileSync(filePath));
        const scope = metadata[filename]?.scope || { type: "global", id: "" };
        const domain = metadata[filename]?.domain || scope.id || scope.type || "global";
        const cached = previousCache.entries[filename];
        const cacheValid = cached
            && cached.hash === fileHash
            && cached.parserVersion === PARSER_VERSION
            && cached.embeddingSignature === signature;
        let entry;
        if (cacheValid) {
            entry = cached;
            indexStatus.cacheHits += 1;
        }
        else {
            const parsed = await (0, knowledge_files_1.parseKnowledgeDocument)(filePath, filename);
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
        if (entry.parseStatus === "failed")
            indexStatus.parseFailures.push({ filename, error: entry.parseError || "解析失败" });
        const current = metadata[filename] || {};
        (0, knowledge_files_1.updateKnowledgeMetadata)(filename, {
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
    atomicWriteJson(knowledge_files_1.RAG_INDEX_CACHE_FILE, nextCache);
    documentChunks = nextChunks;
    documentContent = nextContent;
    indexStatus = {
        ...indexStatus,
        state: "ready",
        completedAt: nextCache.updatedAt,
        lastSuccessfulAt: nextCache.updatedAt,
        documents: files.length,
        chunks: nextChunks.length,
        queued: rebuildQueued,
    };
    console.log(`[RAG] 索引构建完成：${files.length} 份文档，${nextChunks.length} 个语义分片，缓存命中 ${indexStatus.cacheHits}`);
}
function rebuildKnowledgeIndex(reason = "manual") {
    rebuildQueued = true;
    queuedReason = reason;
    indexStatus.queued = !!activeRebuild;
    if (activeRebuild)
        return activeRebuild;
    activeRebuild = (async () => {
        try {
            while (rebuildQueued) {
                const nextReason = queuedReason || reason;
                rebuildQueued = false;
                queuedReason = "";
                await performRebuild(nextReason);
            }
            return getKnowledgeIndexStatus();
        }
        catch (error) {
            indexStatus = {
                ...indexStatus,
                state: "failed",
                completedAt: new Date().toISOString(),
                error: String(error?.message || error || "索引构建失败").slice(0, 500),
                queued: false,
            };
            return getKnowledgeIndexStatus();
        }
        finally {
            activeRebuild = null;
            indexStatus.queued = false;
        }
    })();
    return activeRebuild;
}
function getKnowledgeIndexStatus() {
    return JSON.parse(JSON.stringify(indexStatus));
}
function getKnowledgeDocumentChunks(filename) {
    (0, knowledge_files_1.resolveKnowledgeFile)(filename, true);
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
function getParsedKnowledgeDocument(filename) {
    (0, knowledge_files_1.resolveKnowledgeFile)(filename, true);
    return documentContent.get(filename) || null;
}
function matchesScope(chunk, options) {
    const scopeType = String(options.scopeType || "").trim().toLowerCase();
    if (!scopeType || scopeType === "all")
        return true;
    if (chunk.scope.type === scopeType && (!options.scopeId || chunk.scope.id === options.scopeId))
        return true;
    return options.includeGlobal !== false && scopeType !== "global" && chunk.scope.type === "global";
}
function keywordSearch(query, options = {}) {
    const queryTokens = tokenizeKnowledgeText(query);
    if (!queryTokens.length || !documentChunks.length)
        return [];
    const queryTf = {};
    for (const token of queryTokens)
        queryTf[token] = (queryTf[token] || 0) + 1;
    const queryEmbedding = buildHashingEmbedding(queryTf);
    const querySet = new Set(queryTokens);
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const eligible = documentChunks.filter(chunk => {
        if (options.filename && chunk.filename !== options.filename)
            return false;
        if (options.domain && chunk.domain !== options.domain)
            return false;
        if (!matchesScope(chunk, options))
            return false;
        if (options.tags?.length) {
            const tags = metadata[chunk.filename]?.tags || [];
            if (!options.tags.some(tag => tags.includes(tag)))
                return false;
        }
        return true;
    });
    const total = Math.max(1, eligible.length);
    const df = {};
    for (const token of querySet)
        df[token] = eligible.filter(chunk => chunk.tokens.has(token)).length;
    return eligible.map(chunk => {
        let keywordScore = 0;
        let covered = 0;
        for (const token of querySet) {
            if (!chunk.tf[token])
                continue;
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
async function searchKnowledgeBase(query, options = {}) {
    const config = (0, knowledge_files_1.loadRagEmbeddingConfig)();
    let querySemanticEmbedding = null;
    let embeddingMode = "hashing";
    let embeddingError = "";
    if (config.enabled && config.apiKey && config.model) {
        try {
            querySemanticEmbedding = await callEmbeddingApi(query, config);
            embeddingMode = `api:${config.model}`;
        }
        catch (error) {
            embeddingError = String(error?.message || error || "语义向量查询失败").slice(0, 500);
            embeddingMode = "hashing-fallback";
        }
    }
    const limit = Math.min(20, Math.max(1, Number(options.limit || 5)));
    const candidates = keywordSearch(query, options).slice(0, Math.max(limit * 5, 30));
    const results = candidates.map(item => {
        if (querySemanticEmbedding && item.chunk.semanticEmbedding?.length) {
            const semanticScore = Math.max(0, cosineSimilarity(querySemanticEmbedding, item.chunk.semanticEmbedding));
            return { ...item, vectorScore: semanticScore, score: item.keywordScore * 0.52 + semanticScore * 4.2 + item.coverage * 1.2, embeddingMode };
        }
        return { ...item, embeddingMode };
    }).sort((a, b) => b.score - a.score).slice(0, limit);
    return { results, embeddingMode, embeddingError };
}
function queryKnowledgeBase(query, limit = 3, filterTags) {
    const results = keywordSearch(query, filterTags?.length
        ? { limit, tags: filterTags }
        : { limit, scopeType: "global", includeGlobal: false }).slice(0, Math.max(1, limit));
    return results.map((item, index) => {
        const heading = item.chunk.heading ? `；章节: ${item.chunk.heading}` : "";
        return `[知识库参考分片 #${index + 1} - 来源文件: ${item.chunk.id}${heading} (混合得分: ${item.score.toFixed(2)}；关键词: ${item.keywordScore.toFixed(2)}；向量: ${item.vectorScore.toFixed(2)})]\n${item.chunk.text}`;
    }).join("\n\n");
}
function queryKnowledgeBaseScoped(query, options = {}) {
    const results = keywordSearch(query, options).slice(0, Math.max(1, Number(options.limit || 3)));
    return results.map((item, index) => `[知识库参考分片 #${index + 1} - 来源文件: ${item.chunk.id}]\n${item.chunk.text}`).join("\n\n");
}
function runKnowledgeIndexSelfTest() {
    const markdown = "# 安装\n\n第一步安装依赖。\n\n## 验证\n\n运行 npm test 验证。";
    const chunks = formatAwareChunkText(markdown, ".md");
    return {
        pass: chunks.length >= 2 && chunks.some(chunk => chunk.heading === "安装") && chunks.some(chunk => chunk.heading === "验证"),
        chunks,
    };
}
//# sourceMappingURL=knowledge-index.js.map