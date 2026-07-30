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
exports.SHARED_FILE_V2_TEXT_EXTENSIONS = void 0;
exports.validateSharedFileV2Name = validateSharedFileV2Name;
exports.upsertSharedTextV2 = upsertSharedTextV2;
exports.adoptSharedUploadV2 = adoptSharedUploadV2;
exports.listSharedFilesV2 = listSharedFilesV2;
exports.readSharedFileV2 = readSharedFileV2;
exports.resolveSharedFileSourceV2 = resolveSharedFileSourceV2;
exports.deleteSharedFileV2 = deleteSharedFileV2;
exports.migrateLegacySharedFilesV2 = migrateLegacySharedFilesV2;
exports.migrateLegacyGlobalSharedDirectoryV2 = migrateLegacyGlobalSharedDirectoryV2;
exports.buildSharedFilesContextV2 = buildSharedFilesContextV2;
exports.readSharedFileChunkV2 = readSharedFileChunkV2;
exports.sharedFileV2Status = sharedFileV2Status;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const context_budget_1 = require("../../system/context-budget");
const ROOT = path.join(utils_1.CCM_DIR, "shared-files-v2");
const DATA_DIR = path.join(ROOT, "data");
const STORE_FILE = path.join(ROOT, "manifest.json");
const MAX_TEXT_BYTES = 25 * 1024 * 1024;
const MAX_SCOPE_FILES = 500;
const CHUNK_TOKEN_TARGET = 8000;
const CHUNK_TOKEN_HARD_LIMIT = 10000;
function now() {
    return new Date().toISOString();
}
function checksum(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function emptyStore() {
    return {
        schema: "ccm-shared-files-v2",
        version: 2,
        revision: 0,
        files: [],
        updated_at: now(),
    };
}
function readStoreUnlocked() {
    const value = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, emptyStore());
    return {
        ...emptyStore(),
        ...value,
        files: Array.isArray(value?.files) ? value.files : [],
    };
}
function saveStoreUnlocked(store) {
    store.schema = "ccm-shared-files-v2";
    store.version = 2;
    store.revision = Number(store.revision || 0) + 1;
    store.updated_at = now();
    (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
}
function validateScope(scopeType, scopeId) {
    const type = String(scopeType || "");
    if (!["global", "group", "project"].includes(type))
        throw new Error("共享文件作用域无效");
    const id = type === "global" ? "global" : String(scopeId || "").trim();
    if (!id || id.length > 200 || /[\0\r\n]/.test(id))
        throw new Error("共享文件作用域标识无效");
    return { type, id };
}
function validateSharedFileV2Name(value) {
    const raw = String(value || "").replace(/\0/g, "").trim();
    if (!raw || raw.length > 240)
        throw new Error("共享文件名无效");
    if (raw !== path.basename(raw) || raw === "." || raw === ".." || /[<>:"/\\|?*]/.test(raw)) {
        throw new Error("共享文件名不能包含路径或系统保留字符");
    }
    const segments = raw.toLowerCase().split(".").filter(Boolean);
    const blocked = new Set(["bat", "cmd", "com", "dll", "exe", "msi", "ps1", "scr", "sh"]);
    if (segments.some(segment => blocked.has(segment)))
        throw new Error("共享文件不允许使用可执行文件扩展名");
    return raw;
}
function safeDataPath(relative) {
    const root = path.resolve(DATA_DIR);
    const target = path.resolve(DATA_DIR, relative);
    const rel = path.relative(root, target);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
        throw new Error("共享文件存储路径越界");
    return target;
}
function scopeKey(scopeType, scopeId) {
    return checksum(`${scopeType}\0${scopeId}`).slice(0, 32);
}
function classify(name) {
    if ((0, utils_1.isTextFileName)(name))
        return "text";
    if ((0, utils_1.isImageFileName)(name))
        return "image";
    if ((0, utils_1.isOoxmlFileName)(name) || path.extname(name).toLowerCase() === ".pdf")
        return "document";
    return "file";
}
function splitWithinTokenLimit(value, tokenLimit) {
    const parts = [];
    let remaining = value;
    while (remaining && (0, context_budget_1.estimateTextTokens)(remaining) > tokenLimit) {
        let low = 1;
        let high = remaining.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if ((0, context_budget_1.estimateTextTokens)(remaining.slice(0, middle)) <= tokenLimit)
                low = middle;
            else
                high = middle - 1;
        }
        let end = Math.max(1, low);
        const preferredStart = Math.floor(end * 0.7);
        const preferred = remaining.slice(preferredStart, end).search(/[\s,.;:!?，。；：！？][^]*$/);
        if (preferred >= 0)
            end = preferredStart + preferred + 1;
        if (end < remaining.length && /[\uD800-\uDBFF]/.test(remaining[end - 1]))
            end -= 1;
        end = Math.max(1, end);
        parts.push(remaining.slice(0, end));
        remaining = remaining.slice(end);
    }
    if (remaining)
        parts.push(remaining);
    return parts;
}
function splitCompleteText(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n");
    if (!normalized)
        return [];
    const paragraphs = normalized.split(/(\n{2,})/);
    const chunks = [];
    let current = "";
    const flush = () => {
        if (!current)
            return;
        chunks.push({ content: current, token_count: (0, context_budget_1.estimateTextTokens)(current) });
        current = "";
    };
    for (const paragraph of paragraphs) {
        if (!paragraph)
            continue;
        const paragraphTokens = (0, context_budget_1.estimateTextTokens)(paragraph);
        if (paragraphTokens > CHUNK_TOKEN_HARD_LIMIT) {
            flush();
            const lines = paragraph.split(/(?<=\n)/);
            let lineChunk = "";
            for (const line of lines) {
                if ((0, context_budget_1.estimateTextTokens)(line) > CHUNK_TOKEN_HARD_LIMIT) {
                    if (lineChunk) {
                        chunks.push({ content: lineChunk, token_count: (0, context_budget_1.estimateTextTokens)(lineChunk) });
                        lineChunk = "";
                    }
                    for (const part of splitWithinTokenLimit(line, CHUNK_TOKEN_HARD_LIMIT)) {
                        chunks.push({ content: part, token_count: (0, context_budget_1.estimateTextTokens)(part) });
                    }
                    continue;
                }
                if (lineChunk && (0, context_budget_1.estimateTextTokens)(lineChunk + line) > CHUNK_TOKEN_HARD_LIMIT) {
                    chunks.push({ content: lineChunk, token_count: (0, context_budget_1.estimateTextTokens)(lineChunk) });
                    lineChunk = "";
                }
                lineChunk += line;
            }
            if (lineChunk)
                chunks.push({ content: lineChunk, token_count: (0, context_budget_1.estimateTextTokens)(lineChunk) });
            continue;
        }
        if (current && (0, context_budget_1.estimateTextTokens)(current + paragraph) > CHUNK_TOKEN_TARGET)
            flush();
        current += paragraph;
    }
    flush();
    return chunks;
}
function writeContentFiles(scopeType, scopeId, id, raw, parsedText) {
    const scopeDir = path.join(DATA_DIR, scopeKey(scopeType, scopeId));
    fs.mkdirSync(scopeDir, { recursive: true });
    const sourceRelative = path.join(scopeKey(scopeType, scopeId), `${id}.${checksum(raw).slice(0, 16)}.source`);
    const sourceFile = safeDataPath(sourceRelative);
    if (!fs.existsSync(sourceFile))
        fs.writeFileSync(sourceFile, raw, { flag: "wx", mode: 0o600 });
    let contentRelative = "";
    if (parsedText) {
        contentRelative = path.join(scopeKey(scopeType, scopeId), `${id}.${checksum(parsedText).slice(0, 16)}.content.txt`);
        const contentFile = safeDataPath(contentRelative);
        if (!fs.existsSync(contentFile))
            fs.writeFileSync(contentFile, parsedText, { encoding: "utf8", flag: "wx", mode: 0o600 });
    }
    return { sourceRelative, contentRelative };
}
function manifestChunks(id, parsedText) {
    return splitCompleteText(parsedText).map((chunk, index) => ({
        id: `${id}:chunk:${index + 1}:${checksum(chunk.content).slice(0, 12)}`,
        index,
        checksum: checksum(chunk.content),
        token_count: chunk.token_count,
        char_count: chunk.content.length,
    }));
}
function publicManifest(item) {
    const { content_file: _contentFile, source_file: _sourceFile, ...safe } = item;
    return safe;
}
function parseUploadedText(filePath, name) {
    if ((0, utils_1.isTextFileName)(name))
        return fs.readFileSync(filePath, "utf8");
    if ((0, utils_1.isOoxmlFileName)(name))
        return (0, utils_1.extractOoxmlText)(filePath, name);
    return "";
}
function upsertBuffer(scopeTypeInput, scopeIdInput, nameInput, raw, options = {}) {
    const { type: scopeType, id: scopeId } = validateScope(scopeTypeInput, scopeIdInput);
    const name = validateSharedFileV2Name(nameInput);
    if (!Buffer.isBuffer(raw) || raw.length <= 0)
        throw new Error("共享文件内容不能为空");
    if (raw.length > MAX_TEXT_BYTES)
        throw new Error("单个共享文件不能超过 25 MB");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStoreUnlocked();
        const matching = store.files.filter(item => item.scope_type === scopeType && item.scope_id === scopeId);
        const existing = matching.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (!existing && matching.length >= MAX_SCOPE_FILES)
            throw new Error("当前作用域的共享文件数量已达上限");
        const id = existing?.id || `sf_${crypto.randomUUID()}`;
        const parsedText = String(options.parsedText ?? ((0, utils_1.isTextFileName)(name) ? raw.toString("utf8") : ""));
        const files = writeContentFiles(scopeType, scopeId, id, raw, parsedText);
        const timestamp = now();
        const record = {
            schema: "ccm-shared-file-manifest-v2",
            id,
            scope_type: scopeType,
            scope_id: scopeId,
            name,
            type: classify(name),
            mime_type: String(options.mimeType || ((0, utils_1.isTextFileName)(name) ? "text/plain" : "application/octet-stream")),
            size: raw.length,
            checksum: checksum(raw),
            revision: Number(existing?.revision || 0) + 1,
            readable: !!parsedText,
            parse_state: parsedText ? "ready" : "reference_only",
            content_file: files.contentRelative,
            source_file: files.sourceRelative,
            chunks: manifestChunks(id, parsedText),
            created_at: existing?.created_at || timestamp,
            updated_at: timestamp,
            legacy_source: options.legacySource || existing?.legacy_source,
        };
        const oldFiles = existing ? [existing.content_file, existing.source_file].filter(Boolean) : [];
        store.files = store.files.filter(item => item.id !== id).concat(record);
        saveStoreUnlocked(store);
        for (const relative of oldFiles) {
            if (relative === record.content_file || relative === record.source_file)
                continue;
            try {
                fs.unlinkSync(safeDataPath(String(relative)));
            }
            catch { }
        }
        return publicManifest(record);
    }, { timeoutMs: 30_000 });
}
function upsertSharedTextV2(scopeType, scopeId, name, content, legacySource = "") {
    const text = String(content ?? "");
    const raw = Buffer.from(text, "utf8");
    if (raw.length > 1024 * 1024)
        throw new Error("单个共享文本文件不能超过 1 MB");
    return upsertBuffer(scopeType, scopeId, name, raw, { mimeType: "text/plain", parsedText: text, legacySource });
}
function adoptSharedUploadV2(scopeType, scopeId, uploaded) {
    const source = path.resolve(String(uploaded?.savedPath || ""));
    const stat = fs.lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error("共享上传必须是普通文件");
    const name = validateSharedFileV2Name(uploaded?.filename);
    const raw = fs.readFileSync(source);
    const parsedText = parseUploadedText(source, name);
    return upsertBuffer(scopeType, scopeId, name, raw, {
        mimeType: String(uploaded?.contentType || ""),
        parsedText,
    });
}
function listSharedFilesV2(scopeTypeInput, scopeIdInput) {
    const { type, id } = validateScope(scopeTypeInput, scopeIdInput);
    return readStoreUnlocked().files
        .filter(item => item.scope_type === type && item.scope_id === id)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(publicManifest);
}
function readSharedFileV2(scopeTypeInput, scopeIdInput, fileIdInput) {
    const { type, id } = validateScope(scopeTypeInput, scopeIdInput);
    const fileId = String(fileIdInput || "");
    const item = readStoreUnlocked().files.find(file => file.id === fileId && file.scope_type === type && file.scope_id === id);
    if (!item)
        return null;
    const content = item.content_file ? fs.readFileSync(safeDataPath(item.content_file), "utf8") : "";
    return { ...publicManifest(item), content };
}
function resolveSharedFileSourceV2(scopeTypeInput, scopeIdInput, fileIdInput) {
    const { type, id } = validateScope(scopeTypeInput, scopeIdInput);
    const item = readStoreUnlocked().files.find(file => file.id === String(fileIdInput || "") && file.scope_type === type && file.scope_id === id);
    if (!item?.source_file)
        return null;
    const file = safeDataPath(item.source_file);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error("共享文件源文件无效");
    return { file, manifest: publicManifest(item) };
}
function deleteSharedFileV2(scopeTypeInput, scopeIdInput, fileIdInput) {
    const { type, id } = validateScope(scopeTypeInput, scopeIdInput);
    const fileId = String(fileIdInput || "");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStoreUnlocked();
        const item = store.files.find(file => file.id === fileId && file.scope_type === type && file.scope_id === id);
        if (!item)
            return false;
        store.files = store.files.filter(file => file.id !== item.id);
        saveStoreUnlocked(store);
        for (const relative of [item.content_file, item.source_file].filter(Boolean)) {
            try {
                fs.unlinkSync(safeDataPath(String(relative)));
            }
            catch { }
        }
        return true;
    }, { timeoutMs: 30_000 });
}
function migrateLegacySharedFilesV2(scopeType, scopeId, files, legacySource) {
    const existing = new Set(listSharedFilesV2(scopeType, scopeId).map((item) => item.name.toLowerCase()));
    const imported = [];
    for (const item of Array.isArray(files) ? files : []) {
        try {
            const name = validateSharedFileV2Name(item?.name);
            if (existing.has(name.toLowerCase()))
                continue;
            let content = String(item?.content || "");
            if (!content && item?.path && fs.existsSync(String(item.path)) && fs.lstatSync(String(item.path)).isFile()) {
                const filePath = path.resolve(String(item.path));
                content = parseUploadedText(filePath, name);
                const result = upsertBuffer(scopeType, scopeId, name, fs.readFileSync(filePath), {
                    parsedText: content,
                    mimeType: String(item?.mime_type || ""),
                    legacySource,
                });
                imported.push(result);
            }
            else if (content) {
                imported.push(upsertSharedTextV2(scopeType, scopeId, name, content, legacySource));
            }
            existing.add(name.toLowerCase());
        }
        catch { }
    }
    return imported;
}
function migrateLegacyGlobalSharedDirectoryV2() {
    if (!fs.existsSync(utils_1.SHARED_DIR))
        return [];
    const records = fs.readdirSync(utils_1.SHARED_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile() && !entry.isSymbolicLink() && !entry.name.startsWith("."))
        .map(entry => ({ name: entry.name, path: path.join(utils_1.SHARED_DIR, entry.name) }));
    return migrateLegacySharedFilesV2("global", "global", records, "global-shared-v1");
}
function buildSharedFilesContextV2(scopeTypeInput, scopeIdInput, options = {}) {
    const { type, id } = validateScope(scopeTypeInput, scopeIdInput);
    const records = readStoreUnlocked().files
        .filter(item => item.scope_type === type && item.scope_id === id)
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    if (!records.length)
        return {
            context: "",
            files: [],
            selected_chunks: [],
            total_tokens: 0,
            complete: true,
            checksum: checksum(`${type}\0${id}\0empty`),
        };
    const maxTokens = Math.max(1000, Number(options.maxTokens || 32_000));
    let used = 0;
    const sections = [options.title || "当前作用域已授权共享文件："];
    const selected = [];
    let complete = true;
    let capacityExhausted = false;
    for (const record of records) {
        if (capacityExhausted) {
            complete = false;
            continue;
        }
        if (!record.readable || !record.content_file) {
            sections.push(`\n- ${record.name}（${record.type}，${record.size} bytes，内容需通过共享文件读取工具按ID核验：${record.id}）`);
            continue;
        }
        const content = fs.readFileSync(safeDataPath(record.content_file), "utf8");
        const pieces = splitCompleteText(content);
        for (let index = 0; index < pieces.length; index += 1) {
            const piece = pieces[index];
            if (used + piece.token_count > maxTokens) {
                complete = false;
                capacityExhausted = true;
                break;
            }
            used += piece.token_count;
            const chunk = record.chunks[index];
            selected.push({ file_id: record.id, file_name: record.name, chunk_id: chunk?.id || "", checksum: chunk?.checksum || checksum(piece.content), token_count: piece.token_count });
            sections.push(`\n--- ${record.name} / 分片 ${index + 1}/${pieces.length} / ${chunk?.id || ""} ---\n${piece.content}`);
        }
    }
    if (!complete) {
        sections.push("\n[共享文件容量门禁] 未注入的完整分片必须通过共享文件读取工具按 file_id/chunk_id 读取；不得根据文件名猜测。");
    }
    const files = records.map(publicManifest);
    return {
        context: sections.join("\n"),
        files,
        selected_chunks: selected,
        total_tokens: used,
        complete,
        checksum: checksum(JSON.stringify(files.map(item => [item.id, item.revision, item.checksum]))),
    };
}
function readSharedFileChunkV2(scopeType, scopeId, fileId, chunkId) {
    const file = readSharedFileV2(scopeType, scopeId, fileId);
    if (!file || !file.content)
        return null;
    const pieces = splitCompleteText(file.content);
    const index = file.chunks.findIndex((chunk) => chunk.id === String(chunkId || ""));
    if (index < 0 || !pieces[index])
        return null;
    return {
        file_id: file.id,
        file_name: file.name,
        chunk: file.chunks[index],
        content: pieces[index].content,
    };
}
function sharedFileV2Status() {
    const store = readStoreUnlocked();
    return {
        schema: store.schema,
        version: store.version,
        revision: store.revision,
        files: store.files.length,
        scopes: new Set(store.files.map(item => `${item.scope_type}:${item.scope_id}`)).size,
        updated_at: store.updated_at,
    };
}
exports.SHARED_FILE_V2_TEXT_EXTENSIONS = utils_1.TEXT_FILE_EXTENSIONS;
//# sourceMappingURL=shared-files-v2.js.map