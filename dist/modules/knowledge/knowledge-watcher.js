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
exports.knowledgeDirectoryWatcher = exports.KnowledgeDirectoryWatcher = void 0;
exports.normalizeKnowledgeWatchConfig = normalizeKnowledgeWatchConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const knowledge_files_1 = require("./knowledge-files");
const knowledge_index_1 = require("./knowledge-index");
const IGNORED_DIRECTORIES = new Set([".git", ".svn", ".hg", "node_modules", "dist", "build", "coverage", ".next", ".cache"]);
function normalizeWatchPath(value) {
    const resolved = path.resolve(String(value || "").trim());
    if (!resolved || !fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new Error("监控路径不存在或不是文件夹");
    }
    return resolved;
}
function normalizeKnowledgeWatchConfig(value, defaults = {}) {
    const legacy = typeof value === "string";
    const root = normalizeWatchPath(legacy ? value : value?.path);
    const scope = (0, knowledge_files_1.normalizeKnowledgeScope)(legacy
        ? { type: "global", id: "" }
        : value?.scope || { type: value?.scopeType || defaults.scopeType || "global", id: value?.scopeId || defaults.scopeId || "" });
    const visibility = legacy
        ? "shared"
        : (value?.visibility || defaults.visibility) === "shared" ? "shared" : "restricted";
    return { path: root, scope, visibility, legacyShared: legacy || value?.legacyShared === true };
}
function walkSupportedFiles(root, limit = 1000) {
    const files = [];
    const visit = (dir) => {
        if (files.length >= limit)
            return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (files.length >= limit)
                break;
            if (entry.isSymbolicLink())
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith("."))
                    visit(fullPath);
            }
            else if (entry.isFile() && (0, knowledge_files_1.isSupportedKnowledgeFilename)(entry.name)) {
                files.push(fullPath);
            }
        }
    };
    visit(root);
    return files;
}
function samePath(left, right) {
    return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}
class KnowledgeDirectoryWatcher {
    watchers = new Map();
    timers = new Map();
    start() {
        this.stopAll();
        const paths = (0, db_1.loadRagWatchPaths)();
        for (const watchPath of paths) {
            try {
                this.watchPath(watchPath);
            }
            catch (error) {
                const log = process.env.CCM_INTERNAL_MCP_CONTEXT ? console.error : console.warn;
                log(`[RAG Watcher] 无法恢复监控 ${typeof watchPath === "string" ? watchPath : watchPath?.path}: ${error?.message || error}`);
            }
        }
        const log = process.env.CCM_INTERNAL_MCP_CONTEXT ? console.error : console.log;
        log(`[RAG Watcher] 已恢复 ${this.watchers.size} 个监控目录`);
    }
    stopAll() {
        for (const watcher of this.watchers.values()) {
            try {
                watcher.close();
            }
            catch { }
        }
        this.watchers.clear();
        for (const timer of this.timers.values())
            clearTimeout(timer);
        this.timers.clear();
    }
    listPaths() {
        return (0, db_1.loadRagWatchPaths)().flatMap(item => {
            try {
                return [normalizeKnowledgeWatchConfig(item)];
            }
            catch {
                return [];
            }
        });
    }
    // 对账一个监控根目录：导入现存文件，并清理"之前从这个根目录导入过、
    // 现在源文件已经不存在"的知识文档（改名、离线期间删除、目录挪走等）。
    // rebuildIndex=false 时跳过重建，交给调用方在多个目录处理完后统一重建一次。
    async syncDirectory(input, rebuildIndex = true) {
        const config = normalizeKnowledgeWatchConfig(input);
        const root = config.path;
        const files = walkSupportedFiles(root);
        const seenRelativePaths = new Set();
        let synced = 0;
        let skipped = 0;
        for (const sourcePath of files) {
            const relativePath = path.relative(root, sourcePath);
            seenRelativePaths.add(relativePath.toLowerCase());
            try {
                const stat = fs.statSync(sourcePath);
                if (stat.size <= 0 || stat.size > knowledge_files_1.MAX_KNOWLEDGE_FILE_BYTES) {
                    skipped += 1;
                    continue;
                }
                const targetName = (0, knowledge_files_1.watchedKnowledgeFilename)(root, relativePath);
                (0, knowledge_files_1.storeKnowledgeBuffer)(path.basename(sourcePath), fs.readFileSync(sourcePath), {
                    targetName,
                    scope: config.scope,
                    visibility: config.visibility,
                    tags: ["watched-directory"],
                    source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active", legacy_shared_scope: config.legacyShared },
                });
                synced += 1;
            }
            catch {
                skipped += 1;
            }
        }
        let removed = 0;
        const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
        for (const [filename, value] of Object.entries(metadata)) {
            const source = value?.source;
            if (!source || source.type !== "watched_directory" || !samePath(source.root || "", root))
                continue;
            const relativePath = String(source.relative_path || "").toLowerCase();
            if (relativePath && seenRelativePaths.has(relativePath))
                continue;
            try {
                (0, knowledge_files_1.deleteKnowledgeDocument)(filename);
                removed += 1;
            }
            catch { }
        }
        if (rebuildIndex)
            await (0, knowledge_index_1.rebuildKnowledgeIndex)("watch-directory-sync");
        return { files: files.length, synced, skipped, removed };
    }
    // 只负责注册 fs.watch 监听器，不做初次对账；调用方决定对账是 fire-and-forget（启动
    // 恢复时）还是需要 await 拿到结果（用户在界面上主动添加时）。
    registerWatcher(config) {
        const root = config.path;
        const key = root.toLowerCase();
        if (this.watchers.has(key))
            return false;
        const watcher = fs.watch(root, { recursive: true }, (_eventType, filename) => {
            const relativePath = String(filename || "");
            if (!relativePath || !(0, knowledge_files_1.isSupportedKnowledgeFilename)(relativePath))
                return;
            const timerKey = `${key}::${relativePath.toLowerCase()}`;
            const previous = this.timers.get(timerKey);
            if (previous)
                clearTimeout(previous);
            this.timers.set(timerKey, setTimeout(() => {
                this.timers.delete(timerKey);
                void this.syncFile(config, relativePath);
            }, 900));
        });
        this.watchers.set(key, watcher);
        return true;
    }
    watchPath(input) {
        const config = normalizeKnowledgeWatchConfig(input);
        const root = config.path;
        const registered = this.registerWatcher(config);
        // 恢复监控（重启后）必须做一次对账：重启前离线期间发生的新增、修改、删除都不会
        // 有 fs.watch 事件可依赖，只能靠全量扫描 + 差集清理找回。启动路径不阻塞服务启动，
        // 所以这里是 fire-and-forget；用户主动添加目录走 addPath，会 await 同一次对账。
        if (registered)
            void this.syncDirectory(config);
        return root;
    }
    async syncFile(config, relativePath) {
        const root = config.path;
        const sourcePath = path.resolve(root, relativePath);
        const relative = path.relative(root, sourcePath);
        if (relative.startsWith("..") || path.isAbsolute(relative))
            return;
        const targetName = (0, knowledge_files_1.watchedKnowledgeFilename)(root, relativePath);
        try {
            if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
                const stat = fs.statSync(sourcePath);
                if (stat.size > knowledge_files_1.MAX_KNOWLEDGE_FILE_BYTES)
                    throw new Error("文件超过 25 MB，已跳过同步");
                (0, knowledge_files_1.storeKnowledgeBuffer)(path.basename(sourcePath), fs.readFileSync(sourcePath), {
                    targetName,
                    scope: config.scope,
                    visibility: config.visibility,
                    tags: ["watched-directory"],
                    source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active", legacy_shared_scope: config.legacyShared },
                });
            }
            else {
                const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
                const matched = Object.entries(metadata).find(([, value]) => value?.source?.path && samePath(value.source.path, sourcePath));
                if (matched)
                    (0, knowledge_files_1.deleteKnowledgeDocument)(matched[0]);
            }
            await (0, knowledge_index_1.rebuildKnowledgeIndex)("watch-file-change");
        }
        catch (error) {
            console.error(`[RAG Watcher] 同步 ${relativePath} 失败: ${error?.message || error}`);
        }
    }
    // 用户主动添加监控目录时，首次同步直接 await 并把真实结果（files/synced/skipped/removed）
    // 返回给调用方，而不是 fire-and-forget 之后让前端只能猜"正在后台进行"。
    async addPath(input) {
        const config = normalizeKnowledgeWatchConfig(input, { visibility: "restricted" });
        const root = config.path;
        const paths = (0, db_1.loadRagWatchPaths)();
        if (!paths.some(item => samePath(typeof item === "string" ? item : item?.path, root))) {
            paths.push(config);
            (0, db_1.saveRagWatchPaths)(paths);
        }
        const registered = this.registerWatcher(config);
        const sync = registered ? await this.syncDirectory(config) : { files: 0, synced: 0, skipped: 0, removed: 0 };
        return { paths: this.listPaths(), sync };
    }
    removePath(dirPath) {
        const root = path.resolve(String(dirPath || "").trim());
        const key = root.toLowerCase();
        const watcher = this.watchers.get(key);
        if (watcher) {
            try {
                watcher.close();
            }
            catch { }
            this.watchers.delete(key);
        }
        (0, db_1.saveRagWatchPaths)((0, db_1.loadRagWatchPaths)().filter(item => !samePath(typeof item === "string" ? item : item?.path, root)));
        return this.listPaths();
    }
}
exports.KnowledgeDirectoryWatcher = KnowledgeDirectoryWatcher;
exports.knowledgeDirectoryWatcher = new KnowledgeDirectoryWatcher();
//# sourceMappingURL=knowledge-watcher.js.map