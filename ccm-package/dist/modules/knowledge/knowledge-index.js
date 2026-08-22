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
exports.loadActiveKnowledgeIndex = loadActiveKnowledgeIndex;
exports.rebuildKnowledgeIndex = rebuildKnowledgeIndex;
exports.waitForKnowledgeIndex = waitForKnowledgeIndex;
exports.getKnowledgeIndexStatus = getKnowledgeIndexStatus;
exports.pruneKnowledgeIndexGenerations = pruneKnowledgeIndexGenerations;
exports.getKnowledgeDocumentChunks = getKnowledgeDocumentChunks;
exports.getParsedKnowledgeDocument = getParsedKnowledgeDocument;
exports.searchKnowledgeBase = searchKnowledgeBase;
exports.queryKnowledgeBase = queryKnowledgeBase;
exports.queryKnowledgeBaseScoped = queryKnowledgeBaseScoped;
exports.runKnowledgeIndexSelfTest = runKnowledgeIndexSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const knowledge_files_1 = require("./knowledge-files");
const knowledge_embedding_1 = require("./knowledge-embedding");
const knowledge_index_lease_1 = require("./knowledge-index-lease");
const EMBEDDING_DIM = 256;
const INDEX_SCHEMA = "ccm-knowledge-index-v3";
const PARSER_VERSION = "semantic-chunks-v3-zh-bigram";
const TARGET_CHUNK_CHARS = 1100;
const MAX_CHUNK_CHARS = 1500;
function cryptoRandomSuffix() {
    return (0, knowledge_files_1.sha256)(`${process.pid}:${Date.now()}:${Math.random()}`).slice(0, 10);
}
let documentChunks = [];
let documentContent = new Map();
var activeRebuild = null;
// `rag.ts` triggers the startup rebuild through a circular module import. Use a
// function-safe initializer so that the first call cannot hit a TDZ during
// CommonJS evaluation after a clean runtime reset.
var rebuildQueued = false;
var queuedReason = "";
var indexStatus = {
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
function generationFile(generation) {
    return path.join(knowledge_files_1.RAG_INDEX_V3_DIR, `${generation}.json`);
}
function loadPointer() {
    for (const file of [knowledge_files_1.RAG_INDEX_V3_POINTER_FILE, `${knowledge_files_1.RAG_INDEX_V3_POINTER_FILE}.bak`]) {
        try {
            const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
            if (parsed?.schema === "ccm-knowledge-index-pointer-v1")
                return parsed;
        }
        catch { }
    }
    return { schema: "ccm-knowledge-index-pointer-v1", activeGeneration: "", lastGoodGeneration: "", updatedAt: "" };
}
function activateGeneration(cache) {
    fs.mkdirSync(knowledge_files_1.RAG_INDEX_V3_DIR, { recursive: true });
    const file = generationFile(cache.generation);
    fs.writeFileSync(file, JSON.stringify(cache), { encoding: "utf-8", mode: 0o600, flag: "wx" });
    const pointer = {
        schema: "ccm-knowledge-index-pointer-v1",
        activeGeneration: cache.generation,
        lastGoodGeneration: cache.generation,
        updatedAt: cache.updatedAt,
    };
    const temp = `${knowledge_files_1.RAG_INDEX_V3_POINTER_FILE}.${process.pid}.${Date.now()}.tmp`;
    const backup = `${knowledge_files_1.RAG_INDEX_V3_POINTER_FILE}.bak`;
    fs.writeFileSync(temp, JSON.stringify(pointer), { encoding: "utf-8", mode: 0o600 });
    try {
        try {
            if (fs.existsSync(backup))
                fs.unlinkSync(backup);
        }
        catch { }
        if (fs.existsSync(knowledge_files_1.RAG_INDEX_V3_POINTER_FILE))
            fs.renameSync(knowledge_files_1.RAG_INDEX_V3_POINTER_FILE, backup);
        fs.renameSync(temp, knowledge_files_1.RAG_INDEX_V3_POINTER_FILE);
        try {
            if (fs.existsSync(backup))
                fs.unlinkSync(backup);
        }
        catch { }
    }
    catch (error) {
        try {
            if (!fs.existsSync(knowledge_files_1.RAG_INDEX_V3_POINTER_FILE) && fs.existsSync(backup))
                fs.renameSync(backup, knowledge_files_1.RAG_INDEX_V3_POINTER_FILE);
        }
        catch { }
        throw error;
    }
    finally {
        try {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
        catch { }
    }
    const retained = new Set([pointer.activeGeneration, pointer.lastGoodGeneration]);
    const generations = fs.readdirSync(knowledge_files_1.RAG_INDEX_V3_DIR).filter(name => /^gen_[a-z0-9_-]+\.json$/i.test(name)).sort().reverse();
    for (const name of generations.slice(3)) {
        const generation = name.replace(/\.json$/, "");
        if (!retained.has(generation))
            try {
                fs.unlinkSync(path.join(knowledge_files_1.RAG_INDEX_V3_DIR, name));
            }
            catch { }
    }
    return pointer;
}
function loadIndexCache() {
    try {
        const pointer = loadPointer();
        if (pointer.activeGeneration) {
            const parsed = JSON.parse(fs.readFileSync(generationFile(pointer.activeGeneration), "utf-8"));
            if (parsed?.schema === INDEX_SCHEMA && parsed?.entries)
                return parsed;
        }
        if (fs.existsSync(knowledge_files_1.RAG_INDEX_CACHE_FILE)) {
            const legacy = JSON.parse(fs.readFileSync(knowledge_files_1.RAG_INDEX_CACHE_FILE, "utf-8"));
            if (legacy?.entries)
                return { ...legacy, schema: INDEX_SCHEMA, generation: "legacy-v2" };
        }
    }
    catch {
        // A broken active pointer must not prevent a clean rebuild.
    }
    return { schema: INDEX_SCHEMA, generation: "", updatedAt: "", entries: {} };
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
    // headingStack 按标题层级保留祖先标题，heading 记录完整路径（如"安装 › 环境变量配置"），
    // 而不是只记录最近一级标题——这样引用和检索都能看到分片所在的完整上下文位置。
    const headingStack = [];
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
    // 相邻分片之间补一段重叠尾部：答案跨越两个 chunk 边界时，靠这段重叠内容
    // 也能被单个 chunk 命中，避免只召回半句话。charStart/charEnd 不受影响，
    // 仍然表示这个 chunk 自己的主内容范围，重叠只追加进 text 里辅助召回。
    // 从后往前遍历保证读取 chunks[i-1] 时它还是未被重叠追加过的原始文本。
    const OVERLAP_CHARS = 140;
    for (let index = chunks.length - 1; index > 0; index--) {
        const previousText = chunks[index - 1].text;
        if (!previousText)
            continue;
        const window = previousText.slice(-OVERLAP_CHARS);
        const boundary = Math.max(window.indexOf("\n"), window.indexOf("。"), window.indexOf(". "));
        const tail = (boundary > 0 ? window.slice(boundary + 1) : window).trim();
        if (tail && !chunks[index].text.startsWith(tail)) {
            chunks[index].text = `${tail}\n\n${chunks[index].text}`;
        }
    }
    return chunks;
}
function serializeChunk(chunk) {
    return { ...chunk, tokens: Array.from(chunk.tokens) };
}
function hydrateChunk(chunk, scope, domain) {
    return { ...chunk, scope, domain, tokens: new Set(chunk.tokens || []) };
}
function recordChunkEmbeddingStatus(chunks, status) {
    for (const chunk of chunks) {
        if (chunk.semantic?.state === "ready" && chunk.semanticEmbedding?.length === chunk.semantic.dimension) {
            status.semanticReady += 1;
            if (chunk.semantic.backend === "remote")
                status.remoteVectors += 1;
            else if (chunk.semantic.backend === "local")
                status.localVectors += 1;
            else
                status.lexicalChunks += 1;
        }
        else if (chunk.semantic?.state === "pending") {
            status.semanticPending += 1;
            status.lexicalChunks += 1;
        }
        else if (chunk.semantic?.state === "failed") {
            status.semanticFailed += 1;
            status.lexicalChunks += 1;
        }
        else {
            status.lexicalChunks += 1;
        }
    }
}
function hydrateActiveCache(cache) {
    if (!cache.generation)
        return false;
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const nextChunks = [];
    const nextContent = new Map();
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
function loadActiveKnowledgeIndex() {
    const cache = loadIndexCache();
    const loaded = hydrateActiveCache(cache);
    if (loaded) {
        const pointer = loadPointer();
        const nextStatus = {
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
            staleServed: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().active,
            buildLease: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().lease,
            localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)(),
            queued: false,
        };
        recordChunkEmbeddingStatus(documentChunks, nextStatus);
        indexStatus = nextStatus;
    }
    return loaded;
}
function embeddingSignature(config) {
    const backend = (0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(config);
    const runtime = (0, knowledge_embedding_1.knowledgeEmbeddingUsesTestAdapter)() ? ":test-adapter" : "";
    if (backend === "remote") {
        let endpoint = "remote";
        try {
            const url = new URL(config.apiUrl);
            endpoint = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
        }
        catch { }
        return `remote:${endpoint}:${config.model}${runtime}`;
    }
    if (backend === "local")
        return `local:${config.localModel}:${config.localRevision}:${config.localDtype}${runtime}`;
    return `lexical${runtime}`;
}
function semanticReceipt(result) {
    const { vector: _vector, ...receipt } = result;
    return receipt;
}
async function embedChunkBatch(texts, backend, embeddingConfig) {
    if (backend === "remote")
        return (0, knowledge_embedding_1.embedRemoteKnowledgeTexts)(texts, "passage", embeddingConfig);
    if (backend === "local")
        return (0, knowledge_embedding_1.embedLocalKnowledgeTexts)(texts, "passage", embeddingConfig);
    return [];
}
async function populateChunkEmbeddings(chunks, embeddingConfig, status) {
    const preferred = (0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(embeddingConfig);
    if (preferred === "lexical" || !chunks.length) {
        status.lexicalChunks += chunks.length;
        return;
    }
    if (preferred === "local" && (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)().state !== "ready") {
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
        void (0, knowledge_embedding_1.prepareLocalKnowledgeModel)();
        return;
    }
    const batchSize = preferred === "remote" ? Math.max(1, Math.min(32, Number(embeddingConfig.batchSize) || 32)) : 8;
    const batches = [];
    for (let offset = 0; offset < chunks.length; offset += batchSize)
        batches.push(chunks.slice(offset, offset + batchSize));
    let cursor = 0;
    let consecutiveRemoteFailures = 0;
    let remoteCircuitOpen = false;
    const worker = async () => {
        while (cursor < batches.length) {
            const batch = batches[cursor++];
            let results = [];
            let usedBackend = preferred;
            try {
                if (preferred === "remote" && remoteCircuitOpen)
                    throw new Error("远程Embedding本轮熔断已打开");
                results = await embedChunkBatch(batch.map(chunk => `${chunk.filename}\n${chunk.heading}\n${chunk.text}`), preferred, embeddingConfig);
                consecutiveRemoteFailures = 0;
            }
            catch (batchError) {
                if (preferred === "remote" && batch.length > 1 && !remoteCircuitOpen) {
                    try {
                        results = [];
                        for (const chunk of batch)
                            results.push(...await (0, knowledge_embedding_1.embedRemoteKnowledgeTexts)([`${chunk.filename}\n${chunk.heading}\n${chunk.text}`], "passage", embeddingConfig));
                        consecutiveRemoteFailures = 0;
                    }
                    catch (singleError) {
                        consecutiveRemoteFailures += 1;
                        if (consecutiveRemoteFailures >= 3)
                            remoteCircuitOpen = true;
                        if (!status.error)
                            status.error = `部分远程语义向量生成失败：${String(singleError?.message || singleError).slice(0, 300)}`;
                    }
                }
                else {
                    consecutiveRemoteFailures += preferred === "remote" ? 1 : 0;
                    if (consecutiveRemoteFailures >= 3)
                        remoteCircuitOpen = true;
                    if (!status.error)
                        status.error = `部分语义向量生成失败：${String(batchError?.message || batchError).slice(0, 300)}`;
                }
                if (!results.length && preferred === "remote" && (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)().state === "ready") {
                    try {
                        usedBackend = "local";
                        results = await (0, knowledge_embedding_1.embedLocalKnowledgeTexts)(batch.map(chunk => `${chunk.filename}\n${chunk.heading}\n${chunk.text}`), "passage", embeddingConfig);
                    }
                    catch { }
                }
            }
            for (let index = 0; index < batch.length; index++) {
                const result = results[index];
                if (result?.state === "ready" && result.vector?.length) {
                    batch[index].semanticEmbedding = result.vector;
                    batch[index].semantic = semanticReceipt({ ...result, backend: usedBackend });
                    status.semanticReady += 1;
                    if (usedBackend === "remote")
                        status.remoteVectors += 1;
                    else
                        status.localVectors += 1;
                }
                else {
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
                if ((0, knowledge_embedding_1.getLocalKnowledgeModelStatus)().state !== "ready")
                    void (0, knowledge_embedding_1.prepareLocalKnowledgeModel)();
            }
        }
    };
    const concurrency = preferred === "remote" ? Math.min(2, batches.length) : 1;
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
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
        // 引用 ID 用内容短哈希而不是纯顺序号：文档开头插入新内容会让后面所有分片的顺序号
        // 整体偏移，导致历史引用（[source:文件名#N]）全部失效。只要分片内容本身没变，
        // 它的引用标识就不随其他分片的增删而改变；顺序号仅在极小概率哈希冲突时兜底区分。
        chunks.push({
            id: `${filename}#${(0, knowledge_files_1.sha256)(`${piece.heading}\n${piece.text}`).slice(0, 10)}_${index}`,
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
        semanticPending: 0,
        localVectors: 0,
        remoteVectors: 0,
        lexicalChunks: 0,
        staleServed: documentChunks.length > 0,
        fallbackReason: "",
        buildLease: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().lease,
        localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)(),
        parseFailures: [],
        queued: rebuildQueued,
    };
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const embeddingConfig = (0, knowledge_files_1.loadRagEmbeddingConfig)();
    const signature = embeddingSignature(embeddingConfig);
    const previousCache = loadIndexCache();
    const generation = `gen_${Date.now().toString(36)}_${process.pid}_${cryptoRandomSuffix()}`;
    const nextCache = { schema: INDEX_SCHEMA, generation, updatedAt: "", entries: {} };
    const nextChunks = [];
    const nextContent = new Map();
    for (const filename of files) {
        const filePath = (0, knowledge_files_1.resolveKnowledgeFile)(filename, true);
        const stat = fs.statSync(filePath);
        // 必须每次都从磁盘真实内容计算hash，不能信任metadata里存的旧值：
        // 监控目录里的文件可能在CCM未运行期间被外部修改，metadata不会自动更新。
        const fileHash = (0, knowledge_files_1.sha256)(fs.readFileSync(filePath));
        const scope = metadata[filename]?.scope || { type: "global", id: "" };
        const domain = metadata[filename]?.domain || scope.id || scope.type || "global";
        const cached = previousCache.entries[filename];
        const cachedChunks = Array.isArray(cached?.chunks) ? cached.chunks : [];
        const semanticCacheValid = signature === "lexical" || (cachedChunks.length > 0 && cachedChunks.every((chunk) => {
            const expectedBackend = (0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(embeddingConfig);
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
        let entry;
        if (cacheValid) {
            entry = cached;
            indexStatus.cacheHits += 1;
            recordChunkEmbeddingStatus(entry.chunks.map(chunk => hydrateChunk(chunk, scope, domain)), indexStatus);
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
        buildLease: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().lease,
        localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)(),
        queued: rebuildQueued,
    };
    console.log(`[RAG] 索引构建完成：${files.length} 份文档，${nextChunks.length} 个语义分片，缓存命中 ${indexStatus.cacheHits}`);
    if (indexStatus.semanticPending > 0 && (0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(embeddingConfig) === "local") {
        void (0, knowledge_embedding_1.prepareLocalKnowledgeModel)().then(model => {
            if (model.state === "ready")
                void rebuildKnowledgeIndex("local-model-ready");
        });
    }
}
function rebuildKnowledgeIndex(reason = "manual") {
    rebuildQueued = true;
    queuedReason = reason;
    indexStatus.queued = !!activeRebuild;
    if (activeRebuild)
        return activeRebuild;
    activeRebuild = (async () => {
        let leaseOwner = "";
        try {
            while (rebuildQueued) {
                const nextReason = queuedReason || reason;
                rebuildQueued = false;
                queuedReason = "";
                const lease = (0, knowledge_index_lease_1.acquireKnowledgeIndexLease)(nextReason);
                if (!lease.acquired) {
                    if (loadActiveKnowledgeIndex()) {
                        indexStatus = { ...indexStatus, staleServed: true, buildLease: lease.lease, reason: "waiting-for-index-builder" };
                        await (0, knowledge_index_lease_1.waitForKnowledgeIndexLeaseRelease)(60_000);
                        loadActiveKnowledgeIndex();
                        continue;
                    }
                    const released = await (0, knowledge_index_lease_1.waitForKnowledgeIndexLeaseRelease)(60_000);
                    if (!released || !loadActiveKnowledgeIndex())
                        throw new Error("知识索引由其他进程构建中，等待可用generation超时");
                    continue;
                }
                leaseOwner = String(lease.lease?.ownerId || "");
                const renewTimer = setInterval(() => (0, knowledge_index_lease_1.renewKnowledgeIndexLease)(leaseOwner), 60_000);
                renewTimer.unref?.();
                try {
                    await performRebuild(nextReason);
                }
                finally {
                    clearInterval(renewTimer);
                }
                (0, knowledge_index_lease_1.releaseKnowledgeIndexLease)(leaseOwner);
                leaseOwner = "";
            }
            return getKnowledgeIndexStatus();
        }
        catch (error) {
            indexStatus = {
                ...indexStatus,
                state: "failed",
                completedAt: new Date().toISOString(),
                error: String(error?.message || error || "索引构建失败").slice(0, 500),
                staleServed: documentChunks.length > 0,
                fallbackReason: documentChunks.length > 0 ? "last_good_generation" : "index_unavailable",
                buildLease: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().lease,
                localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)(),
                queued: false,
            };
            return getKnowledgeIndexStatus();
        }
        finally {
            if (leaseOwner)
                (0, knowledge_index_lease_1.releaseKnowledgeIndexLease)(leaseOwner);
            activeRebuild = null;
            indexStatus.queued = false;
        }
    })();
    return activeRebuild;
}
function waitForKnowledgeIndex(reason = "agent-retrieval") {
    if (activeRebuild)
        return activeRebuild;
    if (indexStatus.state === "ready")
        return Promise.resolve(getKnowledgeIndexStatus());
    if (loadActiveKnowledgeIndex())
        return Promise.resolve(getKnowledgeIndexStatus());
    return rebuildKnowledgeIndex(reason);
}
function getKnowledgeIndexStatus() {
    return JSON.parse(JSON.stringify({
        ...indexStatus,
        localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)(),
        buildLease: (0, knowledge_index_lease_1.inspectKnowledgeIndexLease)().lease,
    }));
}
function pruneKnowledgeIndexGenerations() {
    const pointer = loadPointer();
    const keep = new Set([pointer.activeGeneration, pointer.lastGoodGeneration].filter(Boolean));
    let removed = 0;
    if (fs.existsSync(knowledge_files_1.RAG_INDEX_V3_DIR)) {
        for (const name of fs.readdirSync(knowledge_files_1.RAG_INDEX_V3_DIR).filter(item => /^gen_[a-z0-9_-]+\.json$/i.test(item))) {
            const generation = name.replace(/\.json$/, "");
            if (keep.has(generation))
                continue;
            try {
                fs.unlinkSync(path.join(knowledge_files_1.RAG_INDEX_V3_DIR, name));
                removed += 1;
            }
            catch { }
        }
    }
    try {
        if (fs.existsSync(knowledge_files_1.RAG_INDEX_CACHE_FILE)) {
            fs.unlinkSync(knowledge_files_1.RAG_INDEX_CACHE_FILE);
            removed += 1;
        }
    }
    catch { }
    return { removed, retained: Array.from(keep), activeGeneration: pointer.activeGeneration };
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
function matchesScope(scope, options) {
    const scopeType = String(options.scopeType || "").trim().toLowerCase();
    if (!scopeType || scopeType === "all")
        return true;
    if (scope.type === scopeType && (!options.scopeId || scope.id === options.scopeId))
        return true;
    return options.includeGlobal !== false && scopeType !== "global" && scope.type === "global";
}
// 范围、可见性和"文档是否仍存在"必须以当前 metadata 为准，而不是索引构建那一刻缓存在
// chunk 上的旧值：否则删除文档、收紧范围或改为受限后，只要重建尚未完成或失败，
// 检索仍会命中已删除/已变更权限的分片。metadata 的删除与更新都是同步生效的，
// 这样做不需要额外的 tombstone 机制。
function eligibleKnowledgeChunks(options = {}) {
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    return documentChunks.filter(chunk => {
        const current = metadata[chunk.filename];
        if (!current)
            return false; // 文档已被删除，索引尚未刷新
        if (options.filename && chunk.filename !== options.filename)
            return false;
        if (Array.isArray(options.filenames) && !options.filenames.includes(chunk.filename))
            return false;
        const scope = current.scope || chunk.scope;
        const domain = current.domain || chunk.domain;
        if (options.domain && domain !== options.domain)
            return false;
        if (!matchesScope(scope, options))
            return false;
        if (options.tags?.length) {
            const tags = current.tags || [];
            if (!options.tags.some(tag => tags.includes(tag)))
                return false;
        }
        return true;
    });
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
    const eligible = eligibleKnowledgeChunks(options);
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
    if (indexStatus.state !== "ready" && documentChunks.length === 0)
        await waitForKnowledgeIndex("search");
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
    const config = (0, knowledge_files_1.loadRagEmbeddingConfig)();
    const eligible = eligibleKnowledgeChunks(options);
    const queryVectors = new Map();
    let embeddingMode = "lexical";
    let embeddingError = "";
    let fallbackReason = "";
    const semanticBackends = new Set(eligible
        .filter(chunk => chunk.semantic?.state === "ready" && chunk.semanticEmbedding?.length)
        .map(chunk => chunk.semantic.backend)
        .filter(backend => backend === "remote" || backend === "local"));
    if (config.mode !== "lexical") {
        for (const backend of semanticBackends) {
            try {
                const result = backend === "remote"
                    ? (await (0, knowledge_embedding_1.embedRemoteKnowledgeTexts)([query], "query", config))[0]
                    : (await (0, knowledge_embedding_1.embedLocalKnowledgeTexts)([query], "query", config))[0];
                if (result?.state === "ready" && result.vector?.length)
                    queryVectors.set(backend, result.vector);
            }
            catch (error) {
                embeddingError = [embeddingError, String(error?.message || error || "语义向量查询失败").slice(0, 300)].filter(Boolean).join("；");
            }
        }
    }
    const limit = Math.min(20, Math.max(1, Number(options.limit || 5)));
    const candidateLimit = Math.max(limit * 5, 30);
    const lexicalCandidates = keywordSearch(query, options).slice(0, candidateLimit);
    const merged = new Map();
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
        if (!queryVector || !chunk.semanticEmbedding?.length || chunk.semantic?.dimension !== chunk.semanticEmbedding.length)
            return [];
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
    }
    else if (semanticBackends.size) {
        fallbackReason = "semantic_query_unavailable";
        embeddingMode = "lexical-fallback";
        if (!embeddingError)
            embeddingError = "语义查询向量不可用，已使用词面检索";
        if ((0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(config) === "remote" && (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)().state !== "ready")
            void (0, knowledge_embedding_1.prepareLocalKnowledgeModel)();
    }
    else if ((0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(config) !== "lexical") {
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
        scopeChecksum: (0, knowledge_files_1.sha256)(JSON.stringify(eligible.map(chunk => [chunk.id, chunk.scope.type, chunk.scope.id]).sort())),
        candidateCounts: { eligible: eligible.length, lexical: lexicalCandidates.length, semantic: semanticCandidates.length, merged: merged.size },
    };
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
        // heading 现在是完整标题路径（父级 › 子级），二级标题下的分片应带上一级标题前缀。
        pass: chunks.length >= 2 && chunks.some(chunk => chunk.heading === "安装") && chunks.some(chunk => chunk.heading === "安装 › 验证"),
        chunks,
    };
}
//# sourceMappingURL=knowledge-index.js.map