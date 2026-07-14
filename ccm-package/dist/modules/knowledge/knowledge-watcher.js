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
                this.watchPath(watchPath, true);
            }
            catch (error) {
                console.warn(`[RAG Watcher] 无法恢复监控 ${watchPath}: ${error?.message || error}`);
            }
        }
        console.log(`[RAG Watcher] 已恢复 ${this.watchers.size} 个监控目录`);
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
        return (0, db_1.loadRagWatchPaths)();
    }
    async syncDirectory(dirPath) {
        const root = normalizeWatchPath(dirPath);
        const files = walkSupportedFiles(root);
        let synced = 0;
        let skipped = 0;
        for (const sourcePath of files) {
            try {
                const stat = fs.statSync(sourcePath);
                if (stat.size <= 0 || stat.size > knowledge_files_1.MAX_KNOWLEDGE_FILE_BYTES) {
                    skipped += 1;
                    continue;
                }
                const relativePath = path.relative(root, sourcePath);
                const targetName = (0, knowledge_files_1.watchedKnowledgeFilename)(root, relativePath);
                (0, knowledge_files_1.storeKnowledgeBuffer)(path.basename(sourcePath), fs.readFileSync(sourcePath), {
                    targetName,
                    scope: { type: "global", id: "" },
                    tags: ["watched-directory"],
                    source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active" },
                });
                synced += 1;
            }
            catch {
                skipped += 1;
            }
        }
        await (0, knowledge_index_1.rebuildKnowledgeIndex)("watch-directory-sync");
        return { files: files.length, synced, skipped };
    }
    watchPath(dirPath, restore = false) {
        const root = normalizeWatchPath(dirPath);
        const key = root.toLowerCase();
        if (this.watchers.has(key))
            return root;
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
                void this.syncFile(root, relativePath);
            }, 900));
        });
        this.watchers.set(key, watcher);
        if (!restore)
            void this.syncDirectory(root);
        return root;
    }
    async syncFile(root, relativePath) {
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
                    scope: { type: "global", id: "" },
                    tags: ["watched-directory"],
                    source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active" },
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
    addPath(dirPath) {
        const root = normalizeWatchPath(dirPath);
        const paths = (0, db_1.loadRagWatchPaths)();
        if (!paths.some(item => samePath(item, root))) {
            paths.push(root);
            (0, db_1.saveRagWatchPaths)(paths);
        }
        this.watchPath(root);
        return (0, db_1.loadRagWatchPaths)();
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
        (0, db_1.saveRagWatchPaths)((0, db_1.loadRagWatchPaths)().filter(item => !samePath(item, root)));
        return (0, db_1.loadRagWatchPaths)();
    }
}
exports.KnowledgeDirectoryWatcher = KnowledgeDirectoryWatcher;
exports.knowledgeDirectoryWatcher = new KnowledgeDirectoryWatcher();
//# sourceMappingURL=knowledge-watcher.js.map