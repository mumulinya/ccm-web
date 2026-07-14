import * as fs from "fs";
import * as path from "path";
import { loadRagWatchPaths, saveRagWatchPaths } from "../../core/db";
import {
  deleteKnowledgeDocument,
  isSupportedKnowledgeFilename,
  loadKnowledgeMetadata,
  MAX_KNOWLEDGE_FILE_BYTES,
  storeKnowledgeBuffer,
  watchedKnowledgeFilename,
} from "./knowledge-files";
import { rebuildKnowledgeIndex } from "./knowledge-index";

const IGNORED_DIRECTORIES = new Set([".git", ".svn", ".hg", "node_modules", "dist", "build", "coverage", ".next", ".cache"]);

function normalizeWatchPath(value: string) {
  const resolved = path.resolve(String(value || "").trim());
  if (!resolved || !fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error("监控路径不存在或不是文件夹");
  }
  return resolved;
}

function walkSupportedFiles(root: string, limit = 1000) {
  const files: string[] = [];
  const visit = (dir: string) => {
    if (files.length >= limit) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (files.length >= limit) break;
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith(".")) visit(fullPath);
      } else if (entry.isFile() && isSupportedKnowledgeFilename(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  visit(root);
  return files;
}

function samePath(left: string, right: string) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

export class KnowledgeDirectoryWatcher {
  private watchers = new Map<string, fs.FSWatcher>();
  private timers = new Map<string, NodeJS.Timeout>();

  start() {
    this.stopAll();
    const paths = loadRagWatchPaths();
    for (const watchPath of paths) {
      try { this.watchPath(watchPath, true); } catch (error: any) {
        console.warn(`[RAG Watcher] 无法恢复监控 ${watchPath}: ${error?.message || error}`);
      }
    }
    console.log(`[RAG Watcher] 已恢复 ${this.watchers.size} 个监控目录`);
  }

  stopAll() {
    for (const watcher of this.watchers.values()) {
      try { watcher.close(); } catch {}
    }
    this.watchers.clear();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  listPaths() {
    return loadRagWatchPaths();
  }

  async syncDirectory(dirPath: string) {
    const root = normalizeWatchPath(dirPath);
    const files = walkSupportedFiles(root);
    let synced = 0;
    let skipped = 0;
    for (const sourcePath of files) {
      try {
        const stat = fs.statSync(sourcePath);
        if (stat.size <= 0 || stat.size > MAX_KNOWLEDGE_FILE_BYTES) {
          skipped += 1;
          continue;
        }
        const relativePath = path.relative(root, sourcePath);
        const targetName = watchedKnowledgeFilename(root, relativePath);
        storeKnowledgeBuffer(path.basename(sourcePath), fs.readFileSync(sourcePath), {
          targetName,
          scope: { type: "global", id: "" },
          tags: ["watched-directory"],
          source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active" },
        });
        synced += 1;
      } catch {
        skipped += 1;
      }
    }
    await rebuildKnowledgeIndex("watch-directory-sync");
    return { files: files.length, synced, skipped };
  }

  watchPath(dirPath: string, restore = false) {
    const root = normalizeWatchPath(dirPath);
    const key = root.toLowerCase();
    if (this.watchers.has(key)) return root;
    const watcher = fs.watch(root, { recursive: true }, (_eventType, filename) => {
      const relativePath = String(filename || "");
      if (!relativePath || !isSupportedKnowledgeFilename(relativePath)) return;
      const timerKey = `${key}::${relativePath.toLowerCase()}`;
      const previous = this.timers.get(timerKey);
      if (previous) clearTimeout(previous);
      this.timers.set(timerKey, setTimeout(() => {
        this.timers.delete(timerKey);
        void this.syncFile(root, relativePath);
      }, 900));
    });
    this.watchers.set(key, watcher);
    if (!restore) void this.syncDirectory(root);
    return root;
  }

  private async syncFile(root: string, relativePath: string) {
    const sourcePath = path.resolve(root, relativePath);
    const relative = path.relative(root, sourcePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return;
    const targetName = watchedKnowledgeFilename(root, relativePath);
    try {
      if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
        const stat = fs.statSync(sourcePath);
        if (stat.size > MAX_KNOWLEDGE_FILE_BYTES) throw new Error("文件超过 25 MB，已跳过同步");
        storeKnowledgeBuffer(path.basename(sourcePath), fs.readFileSync(sourcePath), {
          targetName,
          scope: { type: "global", id: "" },
          tags: ["watched-directory"],
          source: { type: "watched_directory", root, path: sourcePath, relative_path: relativePath, sync_status: "active" },
        });
      } else {
        const metadata = loadKnowledgeMetadata();
        const matched = Object.entries(metadata).find(([, value]: any) => value?.source?.path && samePath(value.source.path, sourcePath));
        if (matched) deleteKnowledgeDocument(matched[0]);
      }
      await rebuildKnowledgeIndex("watch-file-change");
    } catch (error: any) {
      console.error(`[RAG Watcher] 同步 ${relativePath} 失败: ${error?.message || error}`);
    }
  }

  addPath(dirPath: string) {
    const root = normalizeWatchPath(dirPath);
    const paths = loadRagWatchPaths();
    if (!paths.some(item => samePath(item, root))) {
      paths.push(root);
      saveRagWatchPaths(paths);
    }
    this.watchPath(root);
    return loadRagWatchPaths();
  }

  removePath(dirPath: string) {
    const root = path.resolve(String(dirPath || "").trim());
    const key = root.toLowerCase();
    const watcher = this.watchers.get(key);
    if (watcher) {
      try { watcher.close(); } catch {}
      this.watchers.delete(key);
    }
    saveRagWatchPaths(loadRagWatchPaths().filter(item => !samePath(item, root)));
    return loadRagWatchPaths();
  }
}

export const knowledgeDirectoryWatcher = new KnowledgeDirectoryWatcher();

