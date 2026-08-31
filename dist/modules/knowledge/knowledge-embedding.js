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
exports.embedRemoteKnowledgeTexts = embedRemoteKnowledgeTexts;
exports.verifyKnowledgeEmbeddingModelArtifact = verifyKnowledgeEmbeddingModelArtifact;
exports.getLocalKnowledgeModelStatus = getLocalKnowledgeModelStatus;
exports.prepareLocalKnowledgeModel = prepareLocalKnowledgeModel;
exports.embedLocalKnowledgeTexts = embedLocalKnowledgeTexts;
exports.preferredKnowledgeEmbeddingBackend = preferredKnowledgeEmbeddingBackend;
exports.removeLocalKnowledgeModel = removeLocalKnowledgeModel;
exports.setKnowledgeEmbeddingTestAdapter = setKnowledgeEmbeddingTestAdapter;
exports.knowledgeEmbeddingUsesTestAdapter = knowledgeEmbeddingUsesTestAdapter;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const knowledge_files_1 = require("./knowledge-files");
const LOCAL_MODEL_FILE = "model_int8.onnx";
const LOCAL_MODEL_BYTES = 118_054_593;
const LOCAL_MODEL_SHA256 = "4d24e2bc01a447951524466ef533e52944bf48509e6552810bcee1a2711cb02c";
const LOCAL_DIMENSION = 384;
const dynamicImport = new Function("specifier", "return import(specifier)");
let localPipeline = null;
let localPipelineSignature = "";
let localPreparePromise = null;
let testAdapter = null;
let modelStatus = {
    state: "idle",
    model: "Xenova/multilingual-e5-small",
    revision: "761b726dd34fb83930e26aab4e9ac3899aa1fa78",
    dtype: "int8",
    cacheDir: knowledge_files_1.KNOWLEDGE_MODEL_DIR,
    expectedBytes: LOCAL_MODEL_BYTES,
    expectedSha256: LOCAL_MODEL_SHA256,
    file: "",
    progress: 0,
    loadedBytes: 0,
    totalBytes: LOCAL_MODEL_BYTES,
    speedBytesPerSecond: 0,
    startedAt: "",
    completedAt: "",
    error: "",
};
function cleanError(error) {
    return String(error?.message || error || "Embedding执行失败")
        .replace(/(authorization|api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
        .slice(0, 500);
}
function normalizeVector(vector) {
    if (!Array.isArray(vector) && ArrayBuffer.isView(vector))
        vector = Array.from(vector);
    if (!Array.isArray(vector) || !vector.length || vector.some(value => !Number.isFinite(Number(value)))) {
        throw new Error("Embedding未返回有效数值向量");
    }
    const numeric = vector.map(Number);
    const norm = Math.sqrt(numeric.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(norm) || norm <= 0)
        throw new Error("Embedding向量范数无效");
    return numeric.map(value => value / norm);
}
function vectorChecksum(vector) {
    return crypto.createHash("sha256").update(Buffer.from(new Float32Array(vector).buffer)).digest("hex");
}
function readyResult(vector, backend, model, revision = "") {
    const normalized = normalizeVector(vector);
    return {
        state: "ready",
        backend,
        model,
        revision,
        dimension: normalized.length,
        checksum: vectorChecksum(normalized),
        vector: normalized,
    };
}
function normalizeEmbeddingUrl(apiUrl = "") {
    const base = String(apiUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    if (base.endsWith("/embeddings"))
        return base;
    if (base.endsWith("/v1"))
        return `${base}/embeddings`;
    return `${base}/v1/embeddings`;
}
function safeApiFingerprint(config) {
    try {
        const url = new URL(config.apiUrl);
        return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
    }
    catch {
        return "remote";
    }
}
async function embedRemoteKnowledgeTexts(texts, kind, config = (0, knowledge_files_1.loadRagEmbeddingConfig)()) {
    if (testAdapter) {
        const vectors = await testAdapter(texts, "remote", kind);
        return vectors.map(vector => readyResult(vector, "remote", config.model));
    }
    if (!config.apiKey || !config.model)
        throw new Error("外部Embedding配置不完整");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 60_000);
    try {
        const input = texts.map(text => `${kind === "query" ? "query" : "passage"}: ${String(text || "").slice(0, 12_000)}`);
        const response = await fetch(normalizeEmbeddingUrl(config.apiUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.model, input: input.length === 1 ? input[0] : input }),
            signal: controller.signal,
        });
        if (!response.ok)
            throw new Error(`Embedding API返回异常 (${response.status}): ${(await response.text()).slice(0, 300)}`);
        const data = await response.json();
        const rows = Array.isArray(data?.data) ? data.data.slice().sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0)) : [];
        if (rows.length !== texts.length)
            throw new Error(`Embedding API返回数量不匹配：${rows.length}/${texts.length}`);
        return rows.map((row) => readyResult(row?.embedding, "remote", config.model, safeApiFingerprint(config)));
    }
    finally {
        clearTimeout(timeout);
    }
}
function walkForModelFile(root) {
    if (!fs.existsSync(root))
        return "";
    const queue = [root];
    while (queue.length) {
        const current = queue.shift();
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory())
                queue.push(full);
            else if (entry.isFile() && entry.name === LOCAL_MODEL_FILE)
                return full;
        }
    }
    return "";
}
async function sha256File(file) {
    const hash = crypto.createHash("sha256");
    await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(file);
        stream.on("data", chunk => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", resolve);
    });
    return hash.digest("hex");
}
async function verifyKnowledgeEmbeddingModelArtifact(file, expectedBytes = LOCAL_MODEL_BYTES, expectedSha256 = LOCAL_MODEL_SHA256) {
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile())
        return { ready: false, error: "模型文件不存在", checksum: "", bytes: 0 };
    const bytes = fs.statSync(file).size;
    if (bytes !== expectedBytes)
        return { ready: false, error: `模型大小校验失败：${bytes}/${expectedBytes}`, checksum: "", bytes };
    const checksum = await sha256File(file);
    return checksum === expectedSha256
        ? { ready: true, error: "", checksum, bytes }
        : { ready: false, error: "模型SHA256校验失败", checksum, bytes };
}
async function verifyLocalModelFile() {
    const file = walkForModelFile(knowledge_files_1.KNOWLEDGE_MODEL_DIR);
    if (!file)
        return { ready: false, file: "", error: "local_model_missing" };
    const verified = await verifyKnowledgeEmbeddingModelArtifact(file);
    if (!verified.ready)
        return { ready: false, file, error: verified.error };
    return { ready: true, file, error: "" };
}
function getLocalKnowledgeModelStatus() {
    const config = (0, knowledge_files_1.loadRagEmbeddingConfig)();
    return { ...modelStatus, model: config.localModel, revision: config.localRevision, cacheDir: knowledge_files_1.KNOWLEDGE_MODEL_DIR };
}
async function prepareLocalKnowledgeModel(force = false) {
    if (localPreparePromise)
        return localPreparePromise;
    localPreparePromise = (async () => {
        const config = (0, knowledge_files_1.loadRagEmbeddingConfig)();
        const signature = `${config.localModel}:${config.localRevision}:${config.localDtype}`;
        if (localPipeline && localPipelineSignature === signature && !force)
            return getLocalKnowledgeModelStatus();
        fs.mkdirSync(knowledge_files_1.KNOWLEDGE_MODEL_DIR, { recursive: true });
        const started = Date.now();
        modelStatus = {
            ...modelStatus,
            state: "downloading",
            model: config.localModel,
            revision: config.localRevision,
            cacheDir: knowledge_files_1.KNOWLEDGE_MODEL_DIR,
            startedAt: new Date(started).toISOString(),
            completedAt: "",
            error: "",
        };
        try {
            if (testAdapter) {
                localPipeline = { __test: true };
                localPipelineSignature = signature;
                modelStatus = { ...modelStatus, state: "ready", progress: 100, completedAt: new Date().toISOString() };
                return getLocalKnowledgeModelStatus();
            }
            const transformers = await dynamicImport("@huggingface/transformers");
            transformers.env.cacheDir = knowledge_files_1.KNOWLEDGE_MODEL_DIR;
            transformers.env.allowRemoteModels = true;
            if (config.mirrorUrl)
                transformers.env.remoteHost = config.mirrorUrl;
            const progressCallback = (progress) => {
                const loaded = Number(progress?.loaded || 0);
                const total = Number(progress?.total || 0);
                const elapsed = Math.max(0.2, (Date.now() - started) / 1000);
                modelStatus = {
                    ...modelStatus,
                    state: "downloading",
                    progress: Number.isFinite(Number(progress?.progress)) ? Math.max(0, Math.min(100, Number(progress.progress))) : (total > 0 ? Math.min(100, loaded / total * 100) : modelStatus.progress),
                    loadedBytes: loaded || modelStatus.loadedBytes,
                    totalBytes: total || modelStatus.totalBytes,
                    speedBytesPerSecond: loaded > 0 ? Math.round(loaded / elapsed) : modelStatus.speedBytesPerSecond,
                };
            };
            localPipeline = await transformers.pipeline("feature-extraction", config.localModel, {
                revision: config.localRevision,
                dtype: "int8",
                device: "cpu",
                progress_callback: progressCallback,
            });
            const verified = await verifyLocalModelFile();
            if (!verified.ready)
                throw new Error(verified.error);
            localPipelineSignature = signature;
            modelStatus = { ...modelStatus, state: "ready", file: verified.file, progress: 100, loadedBytes: LOCAL_MODEL_BYTES, totalBytes: LOCAL_MODEL_BYTES, completedAt: new Date().toISOString(), error: "" };
        }
        catch (error) {
            localPipeline = null;
            localPipelineSignature = "";
            modelStatus = { ...modelStatus, state: "failed", completedAt: new Date().toISOString(), error: cleanError(error) };
        }
        return getLocalKnowledgeModelStatus();
    })().finally(() => { localPreparePromise = null; });
    return localPreparePromise;
}
async function embedLocalKnowledgeTexts(texts, kind, config = (0, knowledge_files_1.loadRagEmbeddingConfig)()) {
    if (testAdapter) {
        const vectors = await testAdapter(texts, "local", kind);
        return vectors.map(vector => readyResult(vector, "local", config.localModel, config.localRevision));
    }
    const status = await prepareLocalKnowledgeModel();
    if (status.state !== "ready" || !localPipeline)
        throw new Error(status.error || "本地Embedding模型不可用");
    const prefixed = texts.map(text => `${kind}: ${String(text || "").slice(0, 12_000)}`);
    const results = [];
    for (const text of prefixed) {
        const output = await localPipeline(text, { pooling: "mean", normalize: true });
        const rows = typeof output?.tolist === "function" ? output.tolist() : output?.data;
        const vector = Array.isArray(rows?.[0]) ? rows[0] : rows;
        const ready = readyResult(vector, "local", config.localModel, config.localRevision);
        if (ready.dimension !== LOCAL_DIMENSION)
            throw new Error(`本地Embedding维度不匹配：${ready.dimension}/${LOCAL_DIMENSION}`);
        results.push(ready);
    }
    return results;
}
function preferredKnowledgeEmbeddingBackend(config = (0, knowledge_files_1.loadRagEmbeddingConfig)()) {
    if (config.mode === "lexical")
        return "lexical";
    if (config.mode === "local")
        return "local";
    if (config.mode === "remote")
        return "remote";
    return config.apiKey && config.model ? "remote" : "local";
}
async function removeLocalKnowledgeModel() {
    if (localPreparePromise)
        throw new Error("本地模型正在准备，请完成后再删除");
    localPipeline = null;
    localPipelineSignature = "";
    try {
        fs.rmSync(knowledge_files_1.KNOWLEDGE_MODEL_DIR, { recursive: true, force: true });
    }
    catch (error) {
        throw new Error(`本地模型删除失败：${cleanError(error)}`);
    }
    modelStatus = { ...modelStatus, state: "idle", file: "", progress: 0, loadedBytes: 0, completedAt: "", error: "" };
    return getLocalKnowledgeModelStatus();
}
function setKnowledgeEmbeddingTestAdapter(adapter) {
    testAdapter = adapter;
    localPipeline = null;
    localPipelineSignature = "";
}
function knowledgeEmbeddingUsesTestAdapter() {
    return testAdapter !== null;
}
//# sourceMappingURL=knowledge-embedding.js.map