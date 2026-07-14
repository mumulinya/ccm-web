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
exports.SUPPORTED_KNOWLEDGE_EXTENSIONS = exports.MAX_KNOWLEDGE_UPLOAD_FILES = exports.MAX_KNOWLEDGE_UPLOAD_BYTES = exports.MAX_KNOWLEDGE_FILE_BYTES = exports.RAG_INDEX_CACHE_FILE = exports.RAG_EMBEDDING_CONFIG_FILE = exports.KNOWLEDGE_VERSIONS_DIR = exports.KNOWLEDGE_DIR = void 0;
exports.sha256 = sha256;
exports.normalizeKnowledgeTags = normalizeKnowledgeTags;
exports.normalizeKnowledgeScope = normalizeKnowledgeScope;
exports.scopeTags = scopeTags;
exports.safeKnowledgeSlug = safeKnowledgeSlug;
exports.sanitizeKnowledgeFilename = sanitizeKnowledgeFilename;
exports.isSupportedKnowledgeFilename = isSupportedKnowledgeFilename;
exports.resolveKnowledgeFile = resolveKnowledgeFile;
exports.loadKnowledgeMetadata = loadKnowledgeMetadata;
exports.loadRagEmbeddingConfig = loadRagEmbeddingConfig;
exports.saveRagEmbeddingConfig = saveRagEmbeddingConfig;
exports.publicRagEmbeddingConfig = publicRagEmbeddingConfig;
exports.updateKnowledgeMetadata = updateKnowledgeMetadata;
exports.storeKnowledgeBuffer = storeKnowledgeBuffer;
exports.deleteKnowledgeDocument = deleteKnowledgeDocument;
exports.listKnowledgeVersions = listKnowledgeVersions;
exports.readKnowledgeVersion = readKnowledgeVersion;
exports.parseKnowledgeVersion = parseKnowledgeVersion;
exports.restoreKnowledgeVersion = restoreKnowledgeVersion;
exports.parseKnowledgeDocument = parseKnowledgeDocument;
exports.importOnlineKnowledgeDocument = importOnlineKnowledgeDocument;
exports.watchedKnowledgeFilename = watchedKnowledgeFilename;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const source_ingestion_1 = require("../requirements/source-ingestion");
const USER_HOME = process.env.USERPROFILE || process.env.HOME || "C:/Users/admin";
const CCM_HOME = path.join(USER_HOME, ".cc-connect");
exports.KNOWLEDGE_DIR = path.join(CCM_HOME, "knowledge");
exports.KNOWLEDGE_VERSIONS_DIR = path.join(CCM_HOME, "knowledge-versions");
exports.RAG_EMBEDDING_CONFIG_FILE = path.join(CCM_HOME, "rag-embedding-config.json");
exports.RAG_INDEX_CACHE_FILE = path.join(CCM_HOME, "knowledge-index-cache-v2.json");
exports.MAX_KNOWLEDGE_FILE_BYTES = 25 * 1024 * 1024;
exports.MAX_KNOWLEDGE_UPLOAD_BYTES = 100 * 1024 * 1024;
exports.MAX_KNOWLEDGE_UPLOAD_FILES = 20;
exports.SUPPORTED_KNOWLEDGE_EXTENSIONS = new Set([
    ".md", ".txt", ".json", ".csv", ".yaml", ".yml", ".toml", ".xml", ".html",
    ".css", ".js", ".jsx", ".ts", ".tsx", ".vue", ".log", ".py", ".java", ".go",
    ".rs", ".c", ".cpp", ".h", ".hpp", ".sh", ".bat", ".ps1", ".ini", ".conf",
    ".sql", ".php", ".rb", ".swift", ".kt", ".pdf", ".docx", ".pptx", ".xlsx",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
]);
function ensureKnowledgeDirectories() {
    fs.mkdirSync(exports.KNOWLEDGE_DIR, { recursive: true });
    fs.mkdirSync(exports.KNOWLEDGE_VERSIONS_DIR, { recursive: true });
}
ensureKnowledgeDirectories();
function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function normalizeKnowledgeTags(tags = []) {
    return Array.from(new Set((Array.isArray(tags) ? tags : [])
        .map(tag => String(tag || "").trim())
        .filter(Boolean)
        .map(tag => tag.startsWith("#") ? tag : `#${tag}`)))
        .slice(0, 50);
}
function normalizeKnowledgeScope(input = {}) {
    const rawType = String(input?.type || input?.scope_type || input?.scopeType || "global").trim().toLowerCase();
    const type = ["group", "project", "agent"].includes(rawType)
        ? rawType
        : "global";
    const id = type === "global" ? "" : String(input?.id || input?.scope_id || input?.scopeId || "").trim().slice(0, 160);
    if (type !== "global" && !id)
        throw new Error("群聊、项目或 Agent 范围必须填写范围标识");
    return { type, id };
}
function scopeTags(scope) {
    if (!scope || scope.type === "global")
        return ["#scope:global"];
    return [`#scope:${scope.type}`, `#${scope.type}:${scope.id}`];
}
function safeKnowledgeSlug(value, fallback = "knowledge") {
    return String(value || fallback)
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "")
        .slice(0, 100) || fallback;
}
function sanitizeKnowledgeFilename(value) {
    const original = path.basename(String(value || "").replace(/\\/g, "/"));
    const ext = path.extname(original).toLowerCase();
    const stem = safeKnowledgeSlug(path.basename(original, path.extname(original)), "document");
    if (!exports.SUPPORTED_KNOWLEDGE_EXTENSIONS.has(ext))
        throw new Error(`暂不支持 ${ext || "无扩展名"} 文件`);
    return `${stem}${ext}`;
}
function isSupportedKnowledgeFilename(name) {
    return exports.SUPPORTED_KNOWLEDGE_EXTENSIONS.has(path.extname(String(name || "")).toLowerCase());
}
function resolveKnowledgeFile(name, mustExist = false) {
    const raw = String(name || "").trim();
    if (!raw || raw !== path.basename(raw) || raw.includes("..") || /[\\/]/.test(raw)) {
        throw new Error("文档名称不合法");
    }
    const safeName = sanitizeKnowledgeFilename(raw);
    if (safeName !== raw)
        throw new Error("文档名称不合法");
    const root = path.resolve(exports.KNOWLEDGE_DIR);
    const resolved = path.resolve(root, safeName);
    if (path.dirname(resolved) !== root)
        throw new Error("文档路径超出知识库范围");
    if (mustExist && (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()))
        throw new Error("文档不存在");
    return resolved;
}
function loadKnowledgeMetadata() {
    return ((0, db_1.loadRagMetadata)() || {});
}
function atomicWriteJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf-8");
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
function loadRagEmbeddingConfig() {
    const fallback = { enabled: false, apiUrl: "https://api.openai.com/v1", apiKey: "", model: "text-embedding-3-small" };
    try {
        if (!fs.existsSync(exports.RAG_EMBEDDING_CONFIG_FILE))
            return fallback;
        return { ...fallback, ...JSON.parse(fs.readFileSync(exports.RAG_EMBEDDING_CONFIG_FILE, "utf-8")) };
    }
    catch {
        return fallback;
    }
}
function saveRagEmbeddingConfig(updates = {}) {
    const current = loadRagEmbeddingConfig();
    const next = { ...current };
    if (updates.enabled !== undefined)
        next.enabled = !!updates.enabled;
    if (updates.apiUrl !== undefined)
        next.apiUrl = String(updates.apiUrl || "").trim() || "https://api.openai.com/v1";
    if (updates.model !== undefined)
        next.model = String(updates.model || "").trim();
    if (updates.apiKey !== undefined && String(updates.apiKey || "").trim())
        next.apiKey = String(updates.apiKey).trim();
    if (updates.clearApiKey === true)
        next.apiKey = "";
    next.updated_at = new Date().toISOString();
    atomicWriteJson(exports.RAG_EMBEDDING_CONFIG_FILE, next);
    return next;
}
function publicRagEmbeddingConfig(config = loadRagEmbeddingConfig()) {
    const { apiKey, ...safe } = config;
    return { ...safe, hasKey: !!apiKey };
}
function updateKnowledgeMetadata(name, updates = {}) {
    resolveKnowledgeFile(name, false);
    const all = loadKnowledgeMetadata();
    const current = all[name] || {};
    const previousScope = normalizeKnowledgeScope(current.scope || { type: "global" });
    const scope = updates.scope || updates.scopeType || updates.scope_type
        ? normalizeKnowledgeScope(updates.scope || updates)
        : previousScope;
    const previousScopeTags = new Set(scopeTags(previousScope));
    const tags = (updates.tags !== undefined
        ? normalizeKnowledgeTags(updates.tags)
        : normalizeKnowledgeTags(current.tags || []))
        .filter(tag => !tag.startsWith("#scope:") && !previousScopeTags.has(tag));
    const now = new Date().toISOString();
    all[name] = {
        ...current,
        ...updates,
        tags: normalizeKnowledgeTags([...tags, ...scopeTags(scope)]),
        domain: String(updates.domain || current.domain || scope.id || scope.type || "global"),
        scope,
        visibility: updates.visibility === "restricted" ? "restricted" : (current.visibility === "restricted" ? "restricted" : "shared"),
        version: Math.max(1, Number(updates.version || current.version || 1)),
        created_at: current.created_at || updates.created_at || now,
        updated_at: updates.updated_at || now,
    };
    (0, db_1.saveRagMetadata)(all);
    return all[name];
}
function archiveCurrentVersion(name, metadata) {
    const currentPath = resolveKnowledgeFile(name, true);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const versionDir = path.join(exports.KNOWLEDGE_VERSIONS_DIR, safeKnowledgeSlug(name, "document"));
    fs.mkdirSync(versionDir, { recursive: true });
    const archiveName = `v${Math.max(1, Number(metadata?.version || 1))}-${stamp}${path.extname(name)}`;
    const archivePath = path.join(versionDir, archiveName);
    fs.copyFileSync(currentPath, archivePath);
    return { version: Math.max(1, Number(metadata?.version || 1)), archived_at: new Date().toISOString(), file: archiveName, hash: metadata?.content_hash || sha256(fs.readFileSync(currentPath)) };
}
function storeKnowledgeBuffer(name, buffer, options = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length)
        throw new Error("文档内容为空");
    if (buffer.length > exports.MAX_KNOWLEDGE_FILE_BYTES)
        throw new Error("单个文档不能超过 25 MB");
    const safeName = sanitizeKnowledgeFilename(options.targetName || name);
    const targetPath = resolveKnowledgeFile(safeName, false);
    const all = loadKnowledgeMetadata();
    const current = all[safeName] || {};
    const contentHash = sha256(buffer);
    const sameContent = current.content_hash === contentHash && fs.existsSync(targetPath);
    let history = Array.isArray(current.history) ? current.history.slice(-19) : [];
    let version = Math.max(1, Number(current.version || 1));
    if (fs.existsSync(targetPath) && !sameContent) {
        history.push(archiveCurrentVersion(safeName, current));
        version += 1;
    }
    fs.writeFileSync(targetPath, buffer);
    const scope = normalizeKnowledgeScope(options.scope || current.scope || { type: options.scopeType, id: options.scopeId });
    const now = new Date().toISOString();
    const metadata = updateKnowledgeMetadata(safeName, {
        ...current,
        scope,
        visibility: options.visibility || current.visibility || "shared",
        tags: normalizeKnowledgeTags([...(current.tags || []), ...(options.tags || []), ...scopeTags(scope)]),
        domain: options.domain || current.domain || scope.id || scope.type,
        source: { ...(current.source || {}), ...(options.source || {}), original_name: name },
        version,
        history,
        content_hash: contentHash,
        created_at: current.created_at || now,
        updated_at: sameContent ? (current.updated_at || now) : now,
        parse_status: "ready",
        parse_error: "",
    });
    return { name: safeName, path: targetPath, metadata, duplicate: sameContent };
}
function deleteKnowledgeDocument(name) {
    const filePath = resolveKnowledgeFile(name, true);
    fs.unlinkSync(filePath);
    const all = loadKnowledgeMetadata();
    if (all[name]) {
        delete all[name];
        (0, db_1.saveRagMetadata)(all);
    }
}
function listKnowledgeVersions(name) {
    resolveKnowledgeFile(name, false);
    const metadata = loadKnowledgeMetadata()[name] || {};
    return (Array.isArray(metadata.history) ? metadata.history : []).slice().reverse();
}
function resolveKnowledgeVersionFile(name, versionFile) {
    resolveKnowledgeFile(name, false);
    const rawVersion = String(versionFile || "").trim();
    if (!rawVersion || rawVersion !== path.basename(rawVersion) || rawVersion.includes("..") || /[\\/]/.test(rawVersion)) {
        throw new Error("历史版本名称不合法");
    }
    const versionDir = path.resolve(exports.KNOWLEDGE_VERSIONS_DIR, safeKnowledgeSlug(name, "document"));
    const resolved = path.resolve(versionDir, rawVersion);
    if (path.dirname(resolved) !== versionDir)
        throw new Error("历史版本路径超出允许范围");
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile())
        throw new Error("历史版本不存在");
    return resolved;
}
function readKnowledgeVersion(name, versionFile) {
    return fs.readFileSync(resolveKnowledgeVersionFile(name, versionFile));
}
function parseKnowledgeVersion(name, versionFile) {
    return parseKnowledgeDocument(resolveKnowledgeVersionFile(name, versionFile), name);
}
function restoreKnowledgeVersion(name, versionFile) {
    const currentMetadata = loadKnowledgeMetadata()[name] || {};
    const buffer = readKnowledgeVersion(name, versionFile);
    return storeKnowledgeBuffer(name, buffer, {
        scope: currentMetadata.scope || { type: "global", id: "" },
        visibility: currentMetadata.visibility || "shared",
        tags: currentMetadata.tags || [],
        source: {
            ...(currentMetadata.source || {}),
            restored_from: versionFile,
            restored_at: new Date().toISOString(),
        },
    });
}
async function parseKnowledgeDocument(filePath, name) {
    const ext = path.extname(name).toLowerCase();
    try {
        if (ext === ".pdf") {
            const pdfParse = require("pdf-parse");
            const parsed = await pdfParse(fs.readFileSync(filePath));
            const content = String(parsed?.text || "").trim();
            return content
                ? { content, parser: "pdf-parse", status: "ready", error: "" }
                : { content: "", parser: "pdf-parse", status: "failed", error: "PDF 中没有提取到可读文字" };
        }
        if ((0, utils_1.isImageFileName)(name)) {
            const result = await (0, source_ingestion_1.ingestRequirementSources)({
                files: [{ filename: name, savedPath: filePath, size: fs.statSync(filePath).size }],
                extractRequirement: false,
            });
            const source = result.sources[0];
            return source?.readable
                ? { content: source.content, parser: source.parser || "configured-vision-model", status: source.status === "partial" ? "partial" : "ready", error: source.error || "" }
                : { content: "", parser: source?.parser || "configured-vision-model", status: "failed", error: source?.error || "图片识别失败" };
        }
        if ((0, utils_1.isTextFileName)(name) || (0, utils_1.isOoxmlFileName)(name)) {
            const described = (0, utils_1.describeFileFromPath)(filePath, name, 5_000_000);
            const content = String(described?.content || "").trim();
            const parser = (0, utils_1.isOoxmlFileName)(name) ? "ooxml-text-extractor" : "utf8-text";
            return content
                ? { content, parser, status: content.length >= 5_000_000 ? "partial" : "ready", error: "" }
                : { content: "", parser, status: "failed", error: "文档中没有提取到可读文字" };
        }
        return { content: "", parser: "unsupported", status: "failed", error: `暂不支持 ${ext || "该"} 格式` };
    }
    catch (error) {
        return { content: "", parser: ext === ".pdf" ? "pdf-parse" : "document-parser", status: "failed", error: String(error?.message || error || "解析失败").slice(0, 500) };
    }
}
async function importOnlineKnowledgeDocument(input = {}) {
    const url = String(input.url || "").trim();
    if (!/^https?:\/\//i.test(url))
        throw new Error("请输入有效的在线文档链接");
    const result = await (0, source_ingestion_1.ingestRequirementSources)({ urls: [url], extractRequirement: false });
    const source = result.sources[0];
    if (!source?.readable || !source.content)
        throw new Error(source?.error || source?.summary || "在线文档无法读取");
    const title = safeKnowledgeSlug(input.title || source.name || "online-document");
    const markdown = Buffer.from(`# ${input.title || source.name || "在线文档"}\n\n${source.content}\n`, "utf-8");
    return storeKnowledgeBuffer(`${title}.md`, markdown, {
        scope: input.scope,
        visibility: input.visibility,
        tags: [...(input.tags || []), "online-document"],
        source: { type: "online_document", url, parser: source.parser, imported_at: new Date().toISOString() },
    });
}
function watchedKnowledgeFilename(rootPath, relativePath) {
    const ext = path.extname(relativePath).toLowerCase();
    const stem = safeKnowledgeSlug(path.basename(relativePath, path.extname(relativePath)), "document");
    const identity = sha256(`${path.resolve(rootPath).toLowerCase()}::${String(relativePath).replace(/\\/g, "/").toLowerCase()}`).slice(0, 10);
    return `${stem}--${identity}${ext}`;
}
//# sourceMappingURL=knowledge-files.js.map