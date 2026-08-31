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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_INTELLIGENCE_CAPABILITY_SCHEMA = exports.CODE_INTELLIGENCE_RESULT_SCHEMA = void 0;
exports.executeCodeIntelligenceToolLocal = executeCodeIntelligenceToolLocal;
exports.executeCodeIntelligenceTool = executeCodeIntelligenceTool;
exports.listLanguageServers = listLanguageServers;
exports.configureLanguageServer = configureLanguageServer;
exports.previewLanguageServerInstall = previewLanguageServerInstall;
exports.installLanguageServer = installLanguageServer;
exports.listCodeIntelligenceProjects = listCodeIntelligenceProjects;
exports.getCodeIntelligenceProjectStatus = getCodeIntelligenceProjectStatus;
exports.startCodeIntelligenceProject = startCodeIntelligenceProject;
exports.startCodeIntelligenceIndexRun = startCodeIntelligenceIndexRun;
exports.getCodeIntelligenceIndexRun = getCodeIntelligenceIndexRun;
exports.failCodeIntelligenceIndexRun = failCodeIntelligenceIndexRun;
exports.listCodeIntelligenceIndexRuns = listCodeIntelligenceIndexRuns;
exports.listCodeIntelligenceFiles = listCodeIntelligenceFiles;
exports.readCodeIntelligenceSource = readCodeIntelligenceSource;
exports.stopCodeIntelligence = stopCodeIntelligence;
exports.runTypeScriptLanguageServiceFixtureSelfTest = runTypeScriptLanguageServiceFixtureSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const url_1 = require("url");
const child_process_1 = require("child_process");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const ts = require("typescript");
const db_1 = require("../core/db");
const unified_evidence_registry_1 = require("./unified-evidence-registry");
const atomic_json_file_1 = require("../core/atomic-json-file");
const lsp_client_1 = require("./lsp-client");
const runtime_events_1 = require("./runtime-events");
const managed_language_servers_1 = require("./managed-language-servers");
const adaptive_index_budget_1 = require("./adaptive-index-budget");
exports.CODE_INTELLIGENCE_RESULT_SCHEMA = "ccm-code-intelligence-result-v1";
exports.CODE_INTELLIGENCE_CAPABILITY_SCHEMA = "ccm-code-intelligence-capability-v2";
const STORE_ROOT = path.join(process.env.CCM_CODE_INTELLIGENCE_DIR || path.join(os.homedir(), ".ccm"), "code-intelligence");
const CUSTOM_SERVERS_FILE = path.join(STORE_ROOT, "custom-language-servers.json");
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);
const LANGUAGE_BY_EXTENSION = {
    ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript", ".cts": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".vue": "vue", ".py": "python", ".go": "go", ".rs": "rust", ".java": "java",
    ".kt": "kotlin", ".kts": "kotlin", ".c": "c", ".h": "c", ".cc": "cpp", ".cpp": "cpp",
    ".cxx": "cpp", ".hpp": "cpp", ".m": "objective-c", ".mm": "objective-c", ".cs": "csharp",
    ".php": "php", ".rb": "ruby", ".lua": "lua", ".html": "html", ".htm": "html",
    ".css": "css", ".scss": "css", ".json": "json",
};
const SOURCE_EXTENSIONS = new Set(Object.keys(LANGUAGE_BY_EXTENSION));
const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", ".output", "target"]);
const MAX_FILES = 50_000;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const runtimes = new Map();
const stoppedServers = new Set();
const watcherDebounce = new Map();
const activeIndexRuns = new Map();
const activeProjectRuns = new Map();
const MAX_LIVE_PROJECT_RUNTIMES = 3;
const RUNTIME_IDLE_MS = 60_000;
function evictIdleRuntimes(excludeProject) {
    if (runtimes.size < MAX_LIVE_PROJECT_RUNTIMES)
        return;
    const now = Date.now();
    const candidates = [...runtimes.values()]
        .filter(runtime => runtime.project !== excludeProject && !activeProjectRuns.has(runtime.project) && now - runtime.lastUsedAt >= RUNTIME_IDLE_MS)
        .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    while (runtimes.size >= MAX_LIVE_PROJECT_RUNTIMES && candidates.length) {
        const runtime = candidates.shift();
        runtime.watcher?.close();
        runtime.service.dispose();
        runtime.db.close();
        runtimes.delete(runtime.project);
    }
}
function attachIncrementalWatcher(runtime) {
    try {
        runtime.watcher = fs.watch(runtime.root, { recursive: true }, (_event, filename) => {
            const relativeName = String(filename || "").replace(/\\/g, "/");
            if (!SOURCE_EXTENSIONS.has(path.extname(relativeName).toLowerCase()))
                return;
            const firstSegment = relativeName.split("/")[0]?.toLowerCase();
            if (IGNORED.has(firstSegment))
                return;
            const pending = watcherDebounce.get(runtime.project);
            if (pending)
                clearTimeout(pending);
            const timer = setTimeout(() => {
                watcherDebounce.delete(runtime.project);
                try {
                    indexProject(runtime.project);
                }
                catch { }
            }, 2_000);
            timer.unref?.();
            watcherDebounce.set(runtime.project, timer);
        });
        runtime.watcher.unref?.();
    }
    catch {
        // Some platforms do not support recursive fs.watch. Query-time hash
        // verification remains authoritative and still performs incremental writes.
    }
}
function hash(value) {
    const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value ?? null));
    return crypto.createHash("sha256").update(input).digest("hex");
}
function safeId(value) {
    return String(value || "project").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
function projectRoot(project) {
    const config = (0, db_1.getConfigs)().find(item => String(item.name || "") === project);
    if (!config)
        throw new Error(`项目不存在或未激活：${project}`);
    const info = (0, db_1.getConfigInfo)(config.path);
    const row = info.find(item => String(item.name || "") === project) || info[0];
    const workDir = String(row?.workDir || "").trim();
    if (!workDir || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory())
        throw new Error(`项目源码目录不可用：${project}`);
    return fs.realpathSync(workDir);
}
function relative(root, file) {
    return path.relative(root, file).replace(/\\/g, "/");
}
const OTHER_CODE_EXTENSIONS = new Set([".swift", ".dart", ".scala", ".ex", ".exs", ".erl", ".hrl", ".fs", ".fsx", ".r", ".sol", ".zig", ".sh", ".ps1"]);
function scanSourceInventory(root) {
    const files = [];
    const stack = [root];
    let oversized = 0;
    let unsupported = 0;
    let skipped = 0;
    while (stack.length && files.length < MAX_FILES) {
        const directory = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink()) {
                skipped += 1;
                continue;
            }
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED.has(entry.name.toLowerCase()))
                    stack.push(absolute);
            }
            else if (entry.isFile()) {
                const extension = path.extname(entry.name).toLowerCase();
                if (SOURCE_EXTENSIONS.has(extension)) {
                    try {
                        if (fs.statSync(absolute).size <= MAX_FILE_BYTES)
                            files.push(absolute);
                        else
                            oversized += 1;
                    }
                    catch {
                        skipped += 1;
                    }
                }
                else if (OTHER_CODE_EXTENSIONS.has(extension))
                    unsupported += 1;
            }
            if (files.length >= MAX_FILES)
                break;
        }
    }
    if (files.length >= MAX_FILES && stack.length)
        skipped += 1;
    return { files: files.sort((a, b) => a.localeCompare(b)), oversized, unsupported, skipped };
}
function scanSourceFiles(root) { return scanSourceInventory(root).files; }
function sourceInventoryChecksum(root, files = scanSourceFiles(root)) {
    return hash(files.map(file => {
        try {
            const stat = fs.statSync(file);
            return { path: relative(root, file), size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) };
        }
        catch {
            return { path: relative(root, file), missing: true };
        }
    }));
}
function selectTypeScriptFiles(files, priorityFiles = [], budget = (0, adaptive_index_budget_1.resolveAdaptiveIndexBudget)()) {
    let bytes = 0;
    const selected = [];
    let budgetSkipped = 0;
    const priorities = new Set(priorityFiles.map(file => path.resolve(file)));
    const ordered = [...files].sort((a, b) => {
        const priority = Number(priorities.has(path.resolve(b))) - Number(priorities.has(path.resolve(a)));
        return priority || a.localeCompare(b);
    });
    for (const file of ordered) {
        if (!TYPESCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase()))
            continue;
        let size = 0;
        try {
            size = fs.statSync(file).size;
        }
        catch {
            budgetSkipped += 1;
            continue;
        }
        const isPriority = priorities.has(path.resolve(file));
        if (!isPriority && (selected.length >= budget.maxFiles || bytes + size > budget.maxBytes)) {
            budgetSkipped += 1;
            continue;
        }
        // A requested file is always made queryable, even when the normal
        // adaptive budget is currently exhausted.  This is bounded to the
        // caller's explicit file and may evict a deferred low-priority file.
        if (isPriority && (selected.length >= budget.maxFiles || bytes + size > budget.maxBytes)) {
            const evicted = selected.pop();
            if (evicted) {
                try {
                    bytes -= fs.statSync(evicted).size;
                }
                catch { }
            }
        }
        selected.push(file);
        bytes += size;
    }
    const selectedSet = new Set(selected);
    budgetSkipped = files.filter(file => TYPESCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase()) && !selectedSet.has(file)).length;
    return { files: selected.sort((a, b) => a.localeCompare(b)), bytes, budgetSkipped, budget };
}
function openDatabase(project) {
    const directory = path.join(STORE_ROOT, safeId(project));
    fs.mkdirSync(directory, { recursive: true });
    const db = new better_sqlite3_1.default(path.join(directory, "index.sqlite"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime_ms REAL NOT NULL, indexed_at TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT '', server_id TEXT NOT NULL DEFAULT '', semantic_state TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      start_line INTEGER NOT NULL, start_character INTEGER NOT NULL, end_line INTEGER NOT NULL, end_character INTEGER NOT NULL,
      container TEXT NOT NULL DEFAULT '', symbol_checksum TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT '', server_id TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path);
    CREATE TABLE IF NOT EXISTS diagnostics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, start_line INTEGER NOT NULL, start_character INTEGER NOT NULL,
      end_line INTEGER NOT NULL, end_character INTEGER NOT NULL, severity TEXT NOT NULL, code TEXT NOT NULL,
      source TEXT NOT NULL, message_checksum TEXT NOT NULL, message_preview TEXT NOT NULL, repo_state_checksum TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diagnostics_path ON diagnostics(path);
    CREATE TABLE IF NOT EXISTS index_runs (
      run_id TEXT PRIMARY KEY, mode TEXT NOT NULL, state TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
      total_files INTEGER NOT NULL DEFAULT 0, processed_files INTEGER NOT NULL DEFAULT 0,
      changed_files INTEGER NOT NULL DEFAULT 0, removed_files INTEGER NOT NULL DEFAULT 0,
      failed_files INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, completed_at TEXT NOT NULL DEFAULT '',
      error_summary TEXT NOT NULL DEFAULT '', generation INTEGER NOT NULL DEFAULT 0
    );
  `);
    const columns = (table) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => String(row.name)));
    const fileColumns = columns("files");
    if (!fileColumns.has("language"))
        db.exec("ALTER TABLE files ADD COLUMN language TEXT NOT NULL DEFAULT ''");
    if (!fileColumns.has("server_id"))
        db.exec("ALTER TABLE files ADD COLUMN server_id TEXT NOT NULL DEFAULT ''");
    if (!fileColumns.has("semantic_state"))
        db.exec("ALTER TABLE files ADD COLUMN semantic_state TEXT NOT NULL DEFAULT 'pending'");
    const symbolColumns = columns("symbols");
    if (!symbolColumns.has("language"))
        db.exec("ALTER TABLE symbols ADD COLUMN language TEXT NOT NULL DEFAULT ''");
    if (!symbolColumns.has("server_id"))
        db.exec("ALTER TABLE symbols ADD COLUMN server_id TEXT NOT NULL DEFAULT ''");
    const legacyFiles = db.prepare("SELECT path, language, server_id FROM files WHERE language='' OR language='unknown'").all();
    if (legacyFiles.length) {
        const migrate = db.transaction(() => {
            for (const row of legacyFiles) {
                const extension = path.extname(String(row.path || "")).toLowerCase();
                const language = LANGUAGE_BY_EXTENSION[extension] || "unknown";
                const serverId = TYPESCRIPT_EXTENSIONS.has(extension) ? "typescript" : serverForLanguage(language)?.id || "";
                db.prepare("UPDATE files SET language=?, server_id=?, semantic_state=? WHERE path=?").run(language, serverId, TYPESCRIPT_EXTENSIONS.has(extension) ? "ready" : "pending", row.path);
                db.prepare("UPDATE symbols SET language=?, server_id=? WHERE path=?").run(language, serverId, row.path);
            }
        });
        migrate();
    }
    return db;
}
function scriptKind(file) {
    const extension = path.extname(file).toLowerCase();
    if (extension === ".tsx")
        return ts.ScriptKind.TSX;
    if (extension === ".jsx")
        return ts.ScriptKind.JSX;
    if ([".js", ".mjs", ".cjs"].includes(extension))
        return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
}
function diagnosticSeverity(category) {
    if (category === ts.DiagnosticCategory.Error)
        return "error";
    if (category === ts.DiagnosticCategory.Warning)
        return "warning";
    if (category === ts.DiagnosticCategory.Suggestion)
        return "suggestion";
    return "information";
}
function lineRange(source, start, length) {
    const a = source.getLineAndCharacterOfPosition(Math.max(0, start));
    const b = source.getLineAndCharacterOfPosition(Math.max(0, start + Math.max(0, length)));
    return { startLine: a.line + 1, startCharacter: a.character, endLine: b.line + 1, endCharacter: b.character };
}
function nodeKind(node) {
    return ts.SyntaxKind[node.kind] || "symbol";
}
function collectSymbols(source) {
    const rows = [];
    const containers = [];
    const visit = (node) => {
        const named = node;
        const nameNode = named.name;
        const name = nameNode && ts.isIdentifier(nameNode) ? nameNode.text : "";
        const isDeclaration = !!name && (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isFunctionDeclaration(node) ||
            ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node) ||
            ts.isParameter(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node));
        if (isDeclaration && nameNode)
            rows.push({ name, kind: nodeKind(node), range: lineRange(source, nameNode.getStart(source), nameNode.getWidth(source)), container: containers.join(".") });
        const becomesContainer = !!name && (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isModuleDeclaration(node));
        if (becomesContainer)
            containers.push(name);
        ts.forEachChild(node, visit);
        if (becomesContainer)
            containers.pop();
    };
    visit(source);
    return rows;
}
function createRuntime(project, root, files, db, generation, priorityFiles = [], budget) {
    const typescriptFiles = selectTypeScriptFiles(files, priorityFiles, budget).files;
    const versions = new Map();
    const indexedVersions = new Map();
    for (const file of files) {
        const fileHash = hash(fs.readFileSync(file));
        indexedVersions.set(file, fileHash);
        if (typescriptFiles.includes(file))
            versions.set(file, fileHash);
    }
    const compilerOptions = {
        allowJs: true,
        checkJs: false,
        jsx: ts.JsxEmit.Preserve,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        skipLibCheck: true,
        allowNonTsExtensions: true,
    };
    const host = {
        getScriptFileNames: () => [...versions.keys()],
        getScriptVersion: file => versions.get(file) || "0",
        getScriptSnapshot: file => {
            try {
                return ts.ScriptSnapshot.fromString(fs.readFileSync(file, "utf8"));
            }
            catch {
                return undefined;
            }
        },
        getCurrentDirectory: () => root,
        getCompilationSettings: () => compilerOptions,
        getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
        realpath: ts.sys.realpath,
        useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
        getNewLine: () => ts.sys.newLine,
    };
    return { project, root, db, generation, versions, indexedVersions, service: ts.createLanguageService(host, ts.createDocumentRegistry()), lastIndexedAt: new Date().toISOString(), lastUsedAt: Date.now() };
}
function indexProject(project, force = false, priorityFiles = []) {
    const root = projectRoot(project);
    const db = openDatabase(project);
    // Resolve language-server availability once per indexing pass. Spawning a
    // `where`/`which` probe for every file makes large repositories needlessly
    // slow and can make the UI look like indexing is stalled.
    const serverCatalog = listLanguageServers();
    const inventory = scanSourceInventory(root);
    const files = inventory.files;
    const typeScriptBudget = selectTypeScriptFiles(files, priorityFiles);
    const semanticTypeScriptFiles = new Set(typeScriptBudget.files);
    const previousGeneration = Number(db.prepare("SELECT value FROM metadata WHERE key='generation'").pluck().get() || 0);
    const changed = [];
    const removed = [];
    const known = new Map(db.prepare("SELECT path, hash FROM files").all().map(row => [String(row.path), String(row.hash)]));
    const knownSemanticState = new Map(db.prepare("SELECT path, semantic_state FROM files").all().map(row => [String(row.path), String(row.semantic_state || "")]));
    const current = new Set();
    for (const file of files) {
        const rel = relative(root, file);
        current.add(rel);
        const fileHash = hash(fs.readFileSync(file));
        const needsSemanticHydration = TYPESCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase()) && semanticTypeScriptFiles.has(file) && knownSemanticState.get(rel) !== "ready";
        if (force || known.get(rel) !== fileHash || needsSemanticHydration)
            changed.push(file);
    }
    for (const rel of known.keys())
        if (!current.has(rel))
            removed.push(rel);
    const generation = changed.length || removed.length || previousGeneration === 0 ? previousGeneration + 1 : previousGeneration;
    const runtime = createRuntime(project, root, files, db, generation, priorityFiles, typeScriptBudget.budget);
    const repoIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(root, changed.map(file => relative(root, file)));
    const repoChecksum = hash(repoIdentity);
    const transaction = db.transaction(() => {
        // Diagnostics are an on-demand semantic result.  Never retain rows from a
        // previous repo state or from the old eager full-project diagnostic pass.
        db.prepare("DELETE FROM diagnostics").run();
        // Backfill language metadata for indexes created before the multi-language
        // schema existed. This deliberately does not force a source re-parse or
        // advance the generation when the authoritative file bytes are unchanged.
        for (const file of files) {
            const rel = relative(root, file);
            const extension = path.extname(file).toLowerCase();
            const language = LANGUAGE_BY_EXTENSION[extension] || "unknown";
            const serverId = TYPESCRIPT_EXTENSIONS.has(extension) ? "typescript" : serverForLanguage(language, serverCatalog)?.id || "";
            const semanticState = TYPESCRIPT_EXTENSIONS.has(extension)
                ? (semanticTypeScriptFiles.has(file) ? "ready" : "deferred")
                : (serverForLanguage(language, serverCatalog)?.status === "available" ? "pending" : "missing_server");
            db.prepare("UPDATE files SET language=?, server_id=?, semantic_state=? WHERE path=?").run(language, serverId, semanticState, rel);
            db.prepare("UPDATE symbols SET language=?, server_id=? WHERE path=?").run(language, serverId, rel);
        }
        for (const rel of removed) {
            db.prepare("DELETE FROM files WHERE path=?").run(rel);
            db.prepare("DELETE FROM symbols WHERE path=?").run(rel);
            db.prepare("DELETE FROM diagnostics WHERE path=?").run(rel);
        }
        for (const file of changed) {
            const rel = relative(root, file);
            const content = fs.readFileSync(file, "utf8");
            const stat = fs.statSync(file);
            const extension = path.extname(file).toLowerCase();
            const language = LANGUAGE_BY_EXTENSION[extension] || "unknown";
            const serverId = TYPESCRIPT_EXTENSIONS.has(extension) ? "typescript" : serverForLanguage(language, serverCatalog)?.id || "";
            db.prepare("DELETE FROM symbols WHERE path=?").run(rel);
            db.prepare("DELETE FROM diagnostics WHERE path=?").run(rel);
            if (TYPESCRIPT_EXTENSIONS.has(extension)) {
                const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind(file));
                const insertSymbol = db.prepare("INSERT INTO symbols(path,name,kind,start_line,start_character,end_line,end_character,container,symbol_checksum,language,server_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
                for (const symbol of collectSymbols(source))
                    insertSymbol.run(rel, symbol.name, symbol.kind, symbol.range.startLine, symbol.range.startCharacter, symbol.range.endLine, symbol.range.endCharacter, symbol.container, hash({ rel, ...symbol }), language, serverId);
            }
            const semanticState = TYPESCRIPT_EXTENSIONS.has(extension)
                ? (semanticTypeScriptFiles.has(file) ? "ready" : "deferred")
                : (serverForLanguage(language, serverCatalog)?.status === "available" ? "pending" : "missing_server");
            db.prepare("INSERT INTO files(path,hash,size,mtime_ms,indexed_at,language,server_id,semantic_state) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET hash=excluded.hash,size=excluded.size,mtime_ms=excluded.mtime_ms,indexed_at=excluded.indexed_at,language=excluded.language,server_id=excluded.server_id,semantic_state=excluded.semantic_state").run(rel, hash(content), stat.size, stat.mtimeMs, new Date().toISOString(), language, serverId, semanticState);
        }
        db.prepare("INSERT INTO metadata(key,value) VALUES('generation',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(generation));
        db.prepare("INSERT INTO metadata(key,value) VALUES('last_indexed_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(new Date().toISOString());
        db.prepare("INSERT INTO metadata(key,value) VALUES('root_checksum',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(hash(root));
        db.prepare("INSERT INTO metadata(key,value) VALUES('repo_state_checksum',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(repoChecksum);
        db.prepare("INSERT INTO metadata(key,value) VALUES('inventory_checksum',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(sourceInventoryChecksum(root, files));
        db.prepare("INSERT INTO metadata(key,value) VALUES('coverage_inventory',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({ oversized: inventory.oversized, unsupported: inventory.unsupported, skipped: inventory.skipped, deferred: typeScriptBudget.budgetSkipped, typescriptBudgetSkipped: typeScriptBudget.budgetSkipped, typescriptBudgetFiles: typeScriptBudget.files.length, typescriptBudgetBytes: typeScriptBudget.bytes, typescriptAdaptiveMaxFiles: typeScriptBudget.budget.maxFiles, typescriptAdaptiveMaxBytes: typeScriptBudget.budget.maxBytes, typescriptAdaptiveReason: typeScriptBudget.budget.reason }));
    });
    transaction();
    const previous = runtimes.get(project);
    previous?.watcher?.close();
    previous?.service.dispose();
    if (previous && previous.db !== db)
        previous.db.close();
    evictIdleRuntimes(project);
    runtimes.set(project, runtime);
    attachIncrementalWatcher(runtime);
    return { runtime, changedFiles: changed.map(file => relative(root, file)), removedFiles: removed, generation };
}
function ensureRuntime(project, priorityFiles = []) {
    const current = runtimes.get(project);
    if (!current)
        return indexProject(project, false, priorityFiles).runtime;
    current.lastUsedAt = Date.now();
    const files = scanSourceFiles(current.root);
    const drift = files.length !== current.indexedVersions.size || files.some(file => current.indexedVersions.get(file) !== hash(fs.readFileSync(file)));
    const needsPriority = priorityFiles.some(file => !current.versions.has(path.resolve(file)));
    return drift || needsPriority ? indexProject(project, false, priorityFiles).runtime : current;
}
function location(runtime, fileName, start, length, symbol, kind) {
    let source;
    try {
        source = runtime.service.getProgram()?.getSourceFile(fileName) || ts.createSourceFile(fileName, fs.readFileSync(fileName, "utf8"), ts.ScriptTarget.Latest, true, scriptKind(fileName));
    }
    catch {
        return null;
    }
    if (!source)
        return null;
    return { path: relative(runtime.root, fileName), range: lineRange(source, start, length), symbol, kind };
}
function symbolAnchor(runtime, args) {
    const requestedPath = String(args?.path || "").replace(/\\/g, "/");
    if (requestedPath && Number(args?.line) > 0) {
        const file = path.resolve(runtime.root, requestedPath);
        const source = runtime.service.getProgram()?.getSourceFile(file);
        if (source) {
            const line = Math.max(0, Math.min(source.getLineAndCharacterOfPosition(source.getEnd()).line, Number(args.line) - 1));
            const character = Math.max(0, Number(args?.character || 0));
            return { file, position: source.getPositionOfLineAndCharacter(line, character), symbol: String(args?.symbol || "") };
        }
    }
    let row;
    if (requestedPath)
        row = runtime.db.prepare("SELECT * FROM symbols WHERE path=? AND name=? COLLATE NOCASE ORDER BY start_line,start_character LIMIT 1").get(requestedPath, String(args?.symbol || ""));
    if (!row)
        row = runtime.db.prepare("SELECT * FROM symbols WHERE name=? COLLATE NOCASE ORDER BY path,start_line,start_character LIMIT 1").get(String(args?.symbol || ""));
    if (!row)
        return null;
    const file = path.resolve(runtime.root, row.path);
    const source = runtime.service.getProgram()?.getSourceFile(file);
    if (!source)
        return null;
    const start = source.getPositionOfLineAndCharacter(Math.max(0, Number(row.start_line) - 1), Math.max(0, Number(row.start_character)));
    return { file, position: start, symbol: String(row.name) };
}
function paginate(items, args) {
    const offset = Math.max(0, Number.parseInt(String(args?.cursor || "0"), 10) || 0);
    const limit = Math.max(1, Math.min(500, Number(args?.limit || 100) || 100));
    const selected = items.slice(offset, offset + limit);
    return { selected, nextCursor: offset + selected.length < items.length ? String(offset + selected.length) : "", truncated: offset + selected.length < items.length };
}
function finish(runtime, locations, args) {
    const unique = [...new Map(locations.map(item => [`${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}:${item.kind}`, item])).values()]
        .sort((a, b) => a.path.localeCompare(b.path) || a.range.startLine - b.range.startLine || a.range.startCharacter - b.range.startCharacter);
    const page = paginate(unique, args);
    const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(runtime.root, page.selected.map(item => item.path));
    const projectStatus = getCodeIntelligenceProjectStatus(runtime.project);
    const base = {
        schema: exports.CODE_INTELLIGENCE_RESULT_SCHEMA,
        project: runtime.project,
        indexGeneration: runtime.generation,
        languageServer: "typescript-language-service",
        repoStateIdentity,
        repoStateChecksum: hash(repoStateIdentity),
        locations: page.selected,
        total: unique.length,
        nextCursor: page.nextCursor,
        truncated: page.truncated,
        freshness: "current",
        capabilityCompleteness: projectStatus.status === "partial" || Number(projectStatus.coverage?.deferred || 0) > 0 ? "partial" : "complete",
        retryable: false,
        contentStored: false,
    };
    return { ...base, resultChecksum: hash(base) };
}
const EXTERNAL_LANGUAGE_BY_EXTENSION = {
    ".vue": "vue", ".py": "python", ".go": "go", ".rs": "rust", ".java": "java",
    ".kt": "kotlin", ".kts": "kotlin", ".c": "c", ".h": "c", ".cc": "cpp", ".cpp": "cpp",
    ".cxx": "cpp", ".hpp": "cpp", ".m": "objective-c", ".mm": "objective-c", ".cs": "csharp",
    ".php": "php", ".rb": "ruby", ".lua": "lua", ".html": "html", ".htm": "html",
    ".css": "css", ".scss": "css", ".json": "json",
};
const EXTERNAL_SEMANTIC_EXTENSIONS = new Set(Object.keys(EXTERNAL_LANGUAGE_BY_EXTENSION));
function externalServerArgs(id) {
    if (["pyright", "php", "html-css-json"].includes(id))
        return ["--stdio"];
    return [];
}
function lspFilePath(uri) {
    try {
        return (0, url_1.fileURLToPath)(uri);
    }
    catch {
        return "";
    }
}
function lspRangeLocation(root, item, fallbackSymbol, kind) {
    const uri = String(item?.uri || item?.targetUri || item?.location?.uri || "");
    const range = item?.selectionRange || item?.range || item?.targetSelectionRange || item?.targetRange || item?.location?.range;
    const file = lspFilePath(uri);
    if (!file || !range?.start || !range?.end)
        return null;
    const rel = relative(root, file);
    if (!rel || rel.startsWith("../") || path.isAbsolute(rel))
        return null;
    return {
        path: rel,
        range: {
            startLine: Number(range.start.line || 0) + 1,
            startCharacter: Number(range.start.character || 0),
            endLine: Number(range.end.line || 0) + 1,
            endCharacter: Number(range.end.character || 0),
        },
        symbol: String(item?.name || item?.from?.name || item?.to?.name || fallbackSymbol || ""),
        kind: String(kind || item?.kind || "symbol"),
    };
}
function flattenDocumentSymbols(root, uri, rows, output = [], containers = []) {
    for (const row of Array.isArray(rows) ? rows : []) {
        const item = row?.location ? row : { ...row, uri };
        const found = lspRangeLocation(root, item, String(row?.name || ""), `symbol:${String(row?.kind || "")}`);
        if (found)
            output.push({ ...found, container: containers.join(".") });
        if (Array.isArray(row?.children))
            flattenDocumentSymbols(root, uri, row.children, output, [...containers, String(row?.name || "")].filter(Boolean));
    }
    return output;
}
function finishExternal(project, root, languageServer, generation, locations, args, diagnostics) {
    const unique = [...new Map(locations.map(item => [`${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}:${item.kind}`, item])).values()]
        .sort((a, b) => a.path.localeCompare(b.path) || a.range.startLine - b.range.startLine || a.range.startCharacter - b.range.startCharacter);
    const page = paginate(unique, args);
    const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(root, page.selected.map(item => item.path));
    const projectStatus = getCodeIntelligenceProjectStatus(project);
    const base = {
        schema: exports.CODE_INTELLIGENCE_RESULT_SCHEMA, project, indexGeneration: generation, languageServer,
        repoStateIdentity, repoStateChecksum: hash(repoStateIdentity), locations: page.selected,
        total: unique.length, nextCursor: page.nextCursor, truncated: page.truncated, freshness: "current", contentStored: false,
        capabilityCompleteness: projectStatus.status === "partial" ? "partial" : "complete", retryable: false,
    };
    if (diagnostics) {
        const diagnosticPage = paginate(diagnostics, args);
        base.diagnostics = diagnosticPage.selected;
        base.total = diagnostics.length;
        base.nextCursor = diagnosticPage.nextCursor;
        base.truncated = diagnosticPage.truncated;
    }
    return { ...base, resultChecksum: hash(base) };
}
function queryTypeScriptDiagnostics(runtime, args) {
    const requestedPath = String(args?.path || "").replace(/\\/g, "/");
    const requestedFile = requestedPath ? path.resolve(runtime.root, requestedPath) : "";
    const files = requestedFile
        ? (runtime.versions.has(requestedFile) ? [requestedFile] : [])
        : [...runtime.versions.keys()].slice(0, 25);
    const locations = [];
    const diagnostics = [];
    const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(runtime.root, files.map(file => relative(runtime.root, file)));
    const repoStateChecksum = hash(repoStateIdentity);
    const transaction = runtime.db.transaction(() => {
        const insert = runtime.db.prepare("INSERT INTO diagnostics(path,start_line,start_character,end_line,end_character,severity,code,source,message_checksum,message_preview,repo_state_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
        for (const file of files) {
            const rel = relative(runtime.root, file);
            runtime.db.prepare("DELETE FROM diagnostics WHERE path=?").run(rel);
            let source;
            try {
                source = runtime.service.getProgram()?.getSourceFile(file) || ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, scriptKind(file));
            }
            catch {
                continue;
            }
            const rows = [...runtime.service.getSyntacticDiagnostics(file), ...runtime.service.getSemanticDiagnostics(file)].slice(0, 2_000);
            for (const diagnostic of rows) {
                const range = lineRange(source, diagnostic.start || 0, diagnostic.length || 0);
                const code = String(diagnostic.code);
                const severity = diagnosticSeverity(diagnostic.category);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ").replace(/\s+/g, " ").trim();
                locations.push({ path: rel, range, symbol: code, kind: `diagnostic:${severity}`, serverId: "typescript" });
                diagnostics.push({ path: rel, range, severity, code, source: "typescript", messageChecksum: hash(message), messagePreview: message.slice(0, 500), contentStored: false });
                insert.run(rel, range.startLine, range.startCharacter, range.endLine, range.endCharacter, severity, code, "typescript", hash(message), message.slice(0, 500), repoStateChecksum);
            }
        }
    });
    transaction();
    return { locations, diagnostics };
}
async function executeExternalLspTool(project, tool, args, requestedExtension) {
    const root = projectRoot(project);
    const language = EXTERNAL_LANGUAGE_BY_EXTENSION[requestedExtension] || String(args?.language || "").trim().toLowerCase();
    const descriptor = listLanguageServers().find(item => item.id === String(args?.language_server_id || "") || item.languages.includes(language));
    if (!descriptor || descriptor.status !== "available" || !descriptor.discoveredPath) {
        throw new Error(`capability_unavailable: ${requestedExtension || language || "目标"} 语言服务未连接；未使用文本匹配冒充语义结果。`);
    }
    const clientId = `${descriptor.id}:${safeId(project)}`;
    const managedNodeEntrypoint = (0, managed_language_servers_1.resolveManagedLanguageServerCommand)(descriptor.id);
    const managedLaunch = (0, managed_language_servers_1.resolveManagedLanguageServerLaunch)(descriptor.id, root);
    const client = await lsp_client_1.languageServerManager.start({
        id: clientId,
        command: managedLaunch?.command || (managedNodeEntrypoint && path.extname(managedNodeEntrypoint).toLowerCase() === ".js" ? process.execPath : (descriptor.discoveredPath || descriptor.command)),
        args: managedLaunch?.args || [...(managedNodeEntrypoint && path.extname(managedNodeEntrypoint).toLowerCase() === ".js" ? [managedNodeEntrypoint] : []), ...externalServerArgs(descriptor.id)],
        env: managedLaunch?.env,
        cwd: root,
        languages: descriptor.languages,
        timeoutMs: 15_000,
    });
    const requestedPath = String(args?.path || "").replace(/\\/g, "/");
    const absolute = requestedPath ? path.resolve(root, requestedPath) : "";
    if (absolute && (path.relative(root, absolute).startsWith("..") || !fs.existsSync(absolute)))
        throw new Error("代码智能目标文件不存在或越过项目边界");
    const uri = absolute ? (0, url_1.pathToFileURL)(absolute).href : "";
    let text = "";
    if (absolute) {
        text = fs.readFileSync(absolute, "utf8");
        client.openDocument(uri, language, text, hash(text));
    }
    const symbol = String(args?.symbol || "");
    let semanticAnchor = null;
    if (uri && symbol && !(Number(args?.line) > 0)) {
        const symbols = flattenDocumentSymbols(root, uri, await client.request("textDocument/documentSymbol", { textDocument: { uri } }));
        const exact = symbols.filter(item => item.symbol === symbol);
        if (exact.length === 1)
            semanticAnchor = exact[0];
        else if (exact.length > 1)
            throw new Error("语义定位存在多个同名符号，请提供精确行列");
    }
    const position = Number(args?.line) > 0
        ? { line: Math.max(0, Number(args.line) - 1), character: Math.max(0, Number(args?.character || 0)) }
        : semanticAnchor
            ? { line: Math.max(0, semanticAnchor.range.startLine - 1), character: Math.max(0, semanticAnchor.range.startCharacter) }
            : { line: 0, character: 0 };
    const documentPosition = { textDocument: { uri }, position };
    let locations = [];
    let diagnostics;
    if (tool === "workspace_symbols") {
        const rows = await client.request("workspace/symbol", { query: String(args?.query || symbol || "") });
        locations = (Array.isArray(rows) ? rows : []).map(item => lspRangeLocation(root, item, String(item?.name || symbol), `symbol:${String(item?.kind || "")}`)).filter(Boolean);
    }
    else if (tool === "document_symbols") {
        if (!uri)
            throw new Error("document_symbols需要path");
        locations = flattenDocumentSymbols(root, uri, await client.request("textDocument/documentSymbol", { textDocument: { uri } }));
    }
    else if (tool === "read_code_diagnostics") {
        if (!uri)
            throw new Error("非TypeScript诊断需要path");
        await client.waitForDiagnostics(uri, 2_000);
        const rows = client.diagnostics.get(uri) || [];
        locations = rows.map(item => lspRangeLocation(root, { uri, range: item.range, name: String(item.code || "") }, String(item.code || ""), `diagnostic:${String(item.severity || "")}`)).filter(Boolean);
        diagnostics = rows.map(item => ({ path: requestedPath, range: item.range, severity: item.severity, code: String(item.code || ""), source: String(item.source || descriptor.id), messageChecksum: hash(String(item.message || "")), messagePreview: String(item.message || "").replace(/\s+/g, " ").slice(0, 500), contentStored: false }));
    }
    else {
        if (!uri || (!symbol && !(Number(args?.line) > 0)) || (symbol && !semanticAnchor && !(Number(args?.line) > 0)))
            throw new Error("语义定位需要有效的path以及可唯一解析的symbol或精确行列");
        let method = "textDocument/definition";
        let params = documentPosition;
        let kind = "definition";
        if (tool === "find_references") {
            method = "textDocument/references";
            params = { ...documentPosition, context: { includeDeclaration: true } };
            kind = "reference";
        }
        if (tool === "find_implementations") {
            method = "textDocument/implementation";
            kind = "implementation";
        }
        if (tool === "find_type_definition") {
            method = "textDocument/typeDefinition";
            kind = "type_definition";
        }
        if (tool === "find_incoming_calls" || tool === "find_outgoing_calls") {
            const prepared = await client.request("textDocument/prepareCallHierarchy", documentPosition);
            const item = Array.isArray(prepared) ? prepared[0] : prepared;
            if (!item)
                return finishExternal(project, root, descriptor.id, getCodeIntelligenceProjectStatus(project).generation, [], args);
            method = tool === "find_incoming_calls" ? "callHierarchy/incomingCalls" : "callHierarchy/outgoingCalls";
            params = { item };
            kind = tool === "find_incoming_calls" ? "incoming_call" : "outgoing_call";
        }
        const response = await client.request(method, params);
        const rows = Array.isArray(response) ? response : response ? [response] : [];
        locations = rows.map(row => {
            const item = row?.from || row?.to || row;
            return lspRangeLocation(root, item, symbol, kind);
        }).filter(Boolean);
    }
    locations = locations.map(item => ({ ...item, language, serverId: descriptor.id }));
    return finishExternal(project, root, descriptor.id, getCodeIntelligenceProjectStatus(project).generation, locations, args, diagnostics);
}
async function executeCodeIntelligenceToolLocal(project, tool, args) {
    const requestedExtension = path.extname(String(args?.path || "")).toLowerCase();
    const requestedLanguage = String(args?.language || "").trim().toLowerCase();
    if ((requestedExtension && EXTERNAL_SEMANTIC_EXTENSIONS.has(requestedExtension)) || (!requestedExtension && requestedLanguage && requestedLanguage !== "typescript" && requestedLanguage !== "javascript") || (!requestedExtension && args?.language_server_id && args.language_server_id !== "typescript")) {
        return executeExternalLspTool(project, tool, args, requestedExtension);
    }
    if (stoppedServers.has("typescript"))
        throw new Error("capability_unavailable: TypeScript语言服务已停止");
    const priorityPath = String(args?.path || "").trim();
    const priorityFiles = priorityPath ? [path.resolve(projectRoot(project), priorityPath.replace(/\\/g, "/"))] : [];
    const runtime = ensureRuntime(project, priorityFiles);
    if (runtime.versions.size === 0)
        throw new Error("capability_unavailable: 当前项目没有可由TypeScript语言服务处理的源码文件");
    let locations = [];
    if (tool === "workspace_symbols" || tool === "document_symbols") {
        const query = `%${String(args?.query || args?.symbol || "").trim()}%`;
        const rows = tool === "document_symbols"
            ? runtime.db.prepare("SELECT * FROM symbols WHERE path=? AND name LIKE ? COLLATE NOCASE ORDER BY start_line,start_character").all(String(args?.path || "").replace(/\\/g, "/"), query)
            : runtime.db.prepare("SELECT * FROM symbols WHERE name LIKE ? COLLATE NOCASE ORDER BY name,path,start_line LIMIT 5000").all(query);
        locations = rows.map(row => ({ path: row.path, range: { startLine: row.start_line, startCharacter: row.start_character, endLine: row.end_line, endCharacter: row.end_character }, symbol: row.name, kind: row.kind, container: row.container || "", language: row.language || "", serverId: row.server_id || "typescript" }));
    }
    else if (tool === "read_code_diagnostics") {
        const queried = queryTypeScriptDiagnostics(runtime, args);
        const severities = new Set((Array.isArray(args?.filters?.severity) ? args.filters.severity : []).map(String));
        const sources = new Set((Array.isArray(args?.filters?.source) ? args.filters.source : []).map(String));
        const filePattern = String(args?.filters?.filePattern || "").trim().toLowerCase();
        const diagnostics = queried.diagnostics.filter(row => (!severities.size || severities.has(String(row.severity))) && (!sources.size || sources.has(String(row.source))) && (!filePattern || String(row.path).toLowerCase().includes(filePattern)));
        const allowed = new Set(diagnostics.map(row => `${row.path}:${row.range.startLine}:${row.range.startCharacter}:${row.code}`));
        locations = queried.locations.filter(row => allowed.has(`${row.path}:${row.range.startLine}:${row.range.startCharacter}:${row.symbol}`));
        const result = finish(runtime, locations, args);
        const locationKeys = new Set(result.locations.map((item) => `${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}`));
        result.diagnostics = diagnostics.filter(row => locationKeys.has(`${row.path}:${row.range.startLine}:${row.range.startCharacter}:${row.code}`));
        result.resultChecksum = hash({ ...result, resultChecksum: undefined });
        return result;
    }
    else {
        const anchor = symbolAnchor(runtime, args);
        if (!anchor)
            return finish(runtime, [], args);
        if (tool === "find_definition") {
            for (const item of runtime.service.getDefinitionAtPosition(anchor.file, anchor.position) || []) {
                const found = location(runtime, item.fileName, item.textSpan.start, item.textSpan.length, item.name || anchor.symbol, item.kind || "definition");
                if (found)
                    locations.push(found);
            }
        }
        else if (tool === "find_references") {
            for (const group of runtime.service.findReferences(anchor.file, anchor.position) || [])
                for (const item of group.references) {
                    const found = location(runtime, item.fileName, item.textSpan.start, item.textSpan.length, group.definition.name || anchor.symbol, item.isDefinition ? "definition" : "reference");
                    if (found)
                        locations.push(found);
                }
        }
        else if (tool === "find_implementations" || tool === "find_type_definition") {
            const items = tool === "find_implementations" ? runtime.service.getImplementationAtPosition(anchor.file, anchor.position) : runtime.service.getTypeDefinitionAtPosition(anchor.file, anchor.position);
            for (const item of items || []) {
                const found = location(runtime, item.fileName, item.textSpan.start, item.textSpan.length, item.name || anchor.symbol, item.kind || tool);
                if (found)
                    locations.push(found);
            }
        }
        else if (tool === "find_incoming_calls") {
            for (const call of runtime.service.provideCallHierarchyIncomingCalls(anchor.file, anchor.position) || []) {
                const item = call.from;
                const found = location(runtime, item.file, item.span.start, item.span.length, item.name || anchor.symbol, "incoming_call");
                if (found)
                    locations.push(found);
            }
        }
        else if (tool === "find_outgoing_calls") {
            for (const call of runtime.service.provideCallHierarchyOutgoingCalls(anchor.file, anchor.position) || []) {
                const item = call.to;
                const found = location(runtime, item.file, item.span.start, item.span.length, item.name || anchor.symbol, "outgoing_call");
                if (found)
                    locations.push(found);
            }
        }
    }
    return finish(runtime, locations, args);
}
/**
 * Heavy semantic queries run outside the HTTP/Agent process.  Keeping the
 * public entrypoint here preserves the existing tool contract while the
 * worker-only implementation above remains available to the child process.
 */
async function executeCodeIntelligenceTool(project, tool, args) {
    if (process.env.CCM_CODE_INTELLIGENCE_WORKER === "1") {
        return executeCodeIntelligenceToolLocal(project, tool, args);
    }
    const { executeCodeIntelligenceToolInWorker } = await Promise.resolve().then(() => __importStar(require("./code-intelligence-worker-client")));
    return executeCodeIntelligenceToolInWorker(project, tool, args);
}
async function hydrateExternalIndex(project, relativeFiles, onProgress) {
    const root = projectRoot(project);
    const runtime = runtimes.get(project);
    const serverCatalog = listLanguageServers();
    const db = runtime?.db || openDatabase(project);
    let processed = 0;
    let failed = 0;
    try {
        for (const relativePath of relativeFiles) {
            const extension = path.extname(relativePath).toLowerCase();
            if (TYPESCRIPT_EXTENSIONS.has(extension)) {
                processed += 1;
                onProgress?.(processed, failed);
                continue;
            }
            const language = LANGUAGE_BY_EXTENSION[extension] || "";
            const server = serverForLanguage(language, serverCatalog);
            if (!server || server.status !== "available") {
                processed += 1;
                onProgress?.(processed, failed);
                continue;
            }
            try {
                const symbols = await executeExternalLspTool(project, "document_symbols", { path: relativePath, limit: 5000 }, extension);
                const diagnosticResult = await executeExternalLspTool(project, "read_code_diagnostics", { path: relativePath, limit: 5000 }, extension);
                const repoChecksum = hash(diagnosticResult.repoStateIdentity || symbols.repoStateIdentity || {});
                const transaction = db.transaction(() => {
                    db.prepare("DELETE FROM symbols WHERE path=?").run(relativePath);
                    db.prepare("DELETE FROM diagnostics WHERE path=?").run(relativePath);
                    const insertSymbol = db.prepare("INSERT INTO symbols(path,name,kind,start_line,start_character,end_line,end_character,container,symbol_checksum,language,server_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
                    for (const item of symbols.locations || [])
                        insertSymbol.run(relativePath, String(item.symbol || ""), String(item.kind || "symbol"), Number(item.range?.startLine || 1), Number(item.range?.startCharacter || 0), Number(item.range?.endLine || item.range?.startLine || 1), Number(item.range?.endCharacter || 0), String(item.container || ""), hash(item), language, server.id);
                    const insertDiagnostic = db.prepare("INSERT INTO diagnostics(path,start_line,start_character,end_line,end_character,severity,code,source,message_checksum,message_preview,repo_state_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
                    for (const item of diagnosticResult.diagnostics || []) {
                        const severity = { 1: "error", 2: "warning", 3: "information", 4: "suggestion" }[Number(item.severity)] || String(item.severity || "information");
                        insertDiagnostic.run(relativePath, Number(item.range?.start?.line ?? item.range?.startLine ?? 0) + (item.range?.start?.line !== undefined ? 1 : 0), Number(item.range?.start?.character ?? item.range?.startCharacter ?? 0), Number(item.range?.end?.line ?? item.range?.endLine ?? 0) + (item.range?.end?.line !== undefined ? 1 : 0), Number(item.range?.end?.character ?? item.range?.endCharacter ?? 0), severity, String(item.code || ""), String(item.source || server.id), String(item.messageChecksum || hash(item.messagePreview || "")), String(item.messagePreview || "").slice(0, 500), repoChecksum);
                    }
                });
                transaction();
            }
            catch {
                failed += 1;
            }
            processed += 1;
            onProgress?.(processed, failed);
        }
    }
    finally {
        if (!runtime)
            db.close();
    }
    return { processed, failed };
}
const SERVER_MANIFEST = [
    { id: "typescript", languages: ["typescript", "javascript", "jsx", "tsx"], command: "tsserver", bundled: true, source: "bundled:typescript" },
    { id: "vue", languages: ["vue"], command: "vue-language-server", bundled: false, source: "npm:@vue/language-server" },
    { id: "pyright", languages: ["python"], command: "pyright-langserver", bundled: false, source: "npm:pyright" },
    { id: "gopls", languages: ["go"], command: "gopls", bundled: false, source: "go.dev/x/tools/gopls" },
    { id: "rust-analyzer", languages: ["rust"], command: "rust-analyzer", bundled: false, source: "github:rust-lang/rust-analyzer" },
    { id: "jdtls", languages: ["java"], command: "jdtls", bundled: false, source: "eclipse:jdtls" },
    { id: "kotlin", languages: ["kotlin"], command: "kotlin-language-server", bundled: false, source: "github:fwcd/kotlin-language-server" },
    { id: "clangd", languages: ["c", "cpp", "objective-c"], command: "clangd", bundled: false, source: "llvm:clangd" },
    { id: "csharp", languages: ["csharp"], command: "csharp-ls", bundled: false, source: "github:razzmatazz/csharp-language-server" },
    { id: "php", languages: ["php"], command: "intelephense", bundled: false, source: "npm:intelephense" },
    { id: "ruby", languages: ["ruby"], command: "ruby-lsp", bundled: false, source: "rubygems:ruby-lsp" },
    { id: "lua", languages: ["lua"], command: "lua-language-server", bundled: false, source: "github:LuaLS/lua-language-server" },
    { id: "html-css-json", languages: ["html", "css", "json"], command: "vscode-json-language-server", bundled: false, source: "npm:vscode-langservers-extracted" },
];
function serverManifest() {
    const custom = (0, atomic_json_file_1.readJsonWithBackup)(CUSTOM_SERVERS_FILE, { schema: "ccm-custom-language-servers-v1", servers: [] });
    return [...SERVER_MANIFEST, ...(Array.isArray(custom?.servers) ? custom.servers : [])];
}
function serverForLanguage(language, catalog = listLanguageServers()) {
    return catalog.find(item => item.languages.includes(language));
}
function discoverCommand(command) {
    if (command === "tsserver")
        return require.resolve("typescript/lib/tsserver.js");
    const probe = (0, child_process_1.spawnSync)(process.platform === "win32" ? "where.exe" : "which", [command], { encoding: "utf8", windowsHide: true, timeout: 3000 });
    return probe.status === 0 ? String(probe.stdout || "").split(/\r?\n/).find(Boolean)?.trim() || "" : "";
}
function listLanguageServers() {
    return serverManifest().map(item => {
        const managed = (0, managed_language_servers_1.getManagedLanguageServerRecord)(item.id);
        const discoveredPath = (0, managed_language_servers_1.resolveManagedLanguageServerCommand)(item.id) || discoverCommand(item.command);
        const installed = item.bundled || !!discoveredPath;
        const installState = managed?.installState || (installed ? "available" : "missing");
        const descriptor = {
            ...item,
            installed,
            discoveredPath,
            status: (stoppedServers.has(item.id) ? "stopped" : installed ? "available" : "missing"),
            version: item.id === "typescript" ? ts.version : String(managed?.version || ""),
            installState,
            installSupported: (0, managed_language_servers_1.managedLanguageServerInstallSupported)(item.id),
            errorSummary: (0, managed_language_servers_1.managedLanguageServerError)(item.id),
        };
        return { ...descriptor, checksum: hash(descriptor) };
    });
}
function configureLanguageServer(id, input) {
    let descriptor = serverManifest().find(item => item.id === id);
    if (!descriptor && input?.command) {
        const command = String(input.command || "").trim();
        if (!command || /[\r\n]/.test(command))
            throw new Error("自定义LSP命令无效");
        const custom = (0, atomic_json_file_1.readJsonWithBackup)(CUSTOM_SERVERS_FILE, { schema: "ccm-custom-language-servers-v1", servers: [] });
        descriptor = { id: safeId(id), languages: Array.isArray(input.languages) ? input.languages.map(String).filter(Boolean) : [], command, bundled: false, source: "administrator-configured" };
        const servers = (Array.isArray(custom.servers) ? custom.servers : []).filter((item) => item.id !== descriptor.id);
        servers.push(descriptor);
        (0, atomic_json_file_1.writeJsonAtomic)(CUSTOM_SERVERS_FILE, { schema: "ccm-custom-language-servers-v1", servers });
    }
    if (!descriptor)
        throw new Error("未知语言服务");
    if (input?.action === "stop")
        stoppedServers.add(id);
    else
        stoppedServers.delete(id);
    return listLanguageServers().find(item => item.id === id);
}
async function previewLanguageServerInstall(id) {
    const descriptor = serverManifest().find(item => item.id === id);
    if (!descriptor)
        throw new Error("未知语言服务");
    if (descriptor.bundled)
        return { installRequired: false, descriptor: listLanguageServers().find(item => item.id === id), contentStored: false };
    const manifest = await (0, managed_language_servers_1.previewManagedLanguageServerInstall)(id);
    return {
        installRequired: true,
        executed: false,
        reason: manifest.installSupported ? "已锁定固定版本、HTTPS来源和registry integrity；管理员确认后安装到CCM数据目录。" : "该语言服务尚无受管安装适配器，可在高级配置中提供已安装命令。",
        manifest,
        requiresConfirmation: manifest.installSupported,
        contentStored: false,
    };
}
function installLanguageServer(id, input) {
    if (!serverManifest().some(item => item.id === id))
        throw new Error("未知语言服务");
    return (0, managed_language_servers_1.startManagedLanguageServerInstall)(id, input);
}
function listCodeIntelligenceProjects() {
    return (0, db_1.getConfigs)().map(config => {
        const project = String(config.name || "");
        try {
            return getCodeIntelligenceProjectStatus(project);
        }
        catch (error) {
            return {
                schema: exports.CODE_INTELLIGENCE_CAPABILITY_SCHEMA,
                legacySchema: "ccm-code-intelligence-project-v1",
                project,
                projectId: project,
                status: "failed",
                pathAvailable: false,
                errorCode: "PROJECT_PATH_UNAVAILABLE",
                errorSummary: String(error?.message || error).slice(0, 500),
                generation: 0,
                lastGoodGeneration: undefined,
                repoStateChecksum: "",
                files: 0,
                symbols: 0,
                diagnostics: 0,
                languages: [],
                coverage: { supported: 0, missingServer: 0, unsupported: 0, oversized: 0, skipped: 0, deferred: 0, budgetExceeded: 0, total: 0 },
                retryable: true,
                contentStored: false,
            };
        }
    }).filter(Boolean);
}
function getCodeIntelligenceProjectStatus(project) {
    const root = projectRoot(project);
    const runtime = runtimes.get(project);
    const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
    let stored = { generation: 0, files: 0, symbols: 0, diagnostics: 0, lastIndexedAt: "", repoStateChecksum: "", inventoryChecksum: "" };
    if (fs.existsSync(dbFile)) {
        const db = runtime?.db || openDatabase(project);
        try {
            stored = {
                generation: Number(db.prepare("SELECT value FROM metadata WHERE key='generation'").pluck().get() || 0),
                files: Number(db.prepare("SELECT COUNT(*) FROM files").pluck().get() || 0),
                symbols: Number(db.prepare("SELECT COUNT(*) FROM symbols").pluck().get() || 0),
                diagnostics: Number(db.prepare("SELECT COUNT(*) FROM diagnostics").pluck().get() || 0),
                lastIndexedAt: String(db.prepare("SELECT value FROM metadata WHERE key='last_indexed_at'").pluck().get() || ""),
                repoStateChecksum: String(db.prepare("SELECT value FROM metadata WHERE key='repo_state_checksum'").pluck().get() || ""),
                inventoryChecksum: String(db.prepare("SELECT value FROM metadata WHERE key='inventory_checksum'").pluck().get() || ""),
                coverageInventory: (() => { try {
                    return JSON.parse(String(db.prepare("SELECT value FROM metadata WHERE key='coverage_inventory'").pluck().get() || "{}"));
                }
                catch {
                    return {};
                } })(),
            };
        }
        finally {
            if (!runtime)
                db.close();
        }
    }
    let languageRows = [];
    if (fs.existsSync(dbFile)) {
        const db = runtime?.db || openDatabase(project);
        try {
            languageRows = db.prepare("SELECT language,server_id,semantic_state,COUNT(*) AS files FROM files GROUP BY language,server_id,semantic_state ORDER BY language").all();
        }
        finally {
            if (!runtime)
                db.close();
        }
    }
    const servers = listLanguageServers();
    const languages = languageRows.map(row => {
        const server = servers.find(item => item.id === row.server_id) || serverForLanguage(String(row.language));
        const fileCount = Number(row.files || 0);
        const state = String(row.semantic_state || "");
        const semantic = server?.status === "available" && state !== "budget_exceeded" && state !== "deferred";
        return { language: String(row.language || "unknown"), files: fileCount, fileCount, serverId: String(row.server_id || server?.id || ""), serverState: server?.status || "missing", serverStatus: server?.status === "available" ? "available" : server?.status === "stopped" ? "failed" : "missing", semantic, semanticCoverage: semantic ? 100 : 0 };
    });
    const supported = languages.filter(item => item.semantic).reduce((sum, item) => sum + item.files, 0);
    const missingServer = languages.filter(item => !item.semantic && !String(item.serverState || "").includes("available") && !String(item.language || "").match(/typescript|javascript/)).reduce((sum, item) => sum + item.files, 0);
    const latestRun = listCodeIntelligenceIndexRuns(project, 1)[0] || null;
    const unsupported = Number(stored.coverageInventory?.unsupported || 0);
    const oversized = Number(stored.coverageInventory?.oversized || 0);
    const skipped = Number(stored.coverageInventory?.skipped || 0);
    // Deferred files are not an error or a permanent downgrade. They are kept
    // outside the active TypeScript program until a query explicitly targets
    // one (or the background queue has enough memory to hydrate the next batch).
    const deferred = Number(stored.coverageInventory?.deferred ?? stored.coverageInventory?.typescriptBudgetSkipped ?? 0);
    const budgetExceeded = 0;
    const currentInventory = sourceInventoryChecksum(root);
    const stale = Boolean(stored.inventoryChecksum && stored.inventoryChecksum !== currentInventory);
    const status = !stored.generation ? "not_indexed" : latestRun?.state === "failed" ? "failed" : stale ? "stale" : missingServer || unsupported ? "partial" : runtime ? "ready" : "stopped";
    return {
        schema: exports.CODE_INTELLIGENCE_CAPABILITY_SCHEMA,
        legacySchema: "ccm-code-intelligence-project-v1",
        project,
        projectId: project,
        rootChecksum: hash(root),
        pathAvailable: true,
        status,
        generation: Number(stored.generation || 0),
        lastGoodGeneration: Number(stored.generation || 0) || undefined,
        repoStateChecksum: stored.repoStateChecksum || hash((0, unified_evidence_registry_1.captureRepoStateIdentity)(root, [])),
        languageServer: "typescript-language-service",
        ...stored,
        languages,
        coverage: { supported, missingServer, unsupported, oversized, skipped, deferred, budgetExceeded, total: supported + missingServer + unsupported + oversized + deferred },
        adaptiveIndex: {
            deferredFiles: deferred,
            maxFiles: Number(stored.coverageInventory?.typescriptAdaptiveMaxFiles || 0),
            maxBytes: Number(stored.coverageInventory?.typescriptAdaptiveMaxBytes || 0),
            reason: String(stored.coverageInventory?.typescriptAdaptiveReason || "adaptive"),
            mode: deferred ? "on_demand" : "complete",
        },
        latestRun,
        retryable: status === "stale" || status === "failed" || status === "partial",
        contentStored: false,
    };
}
function startCodeIntelligenceProject(project, force = false) {
    const result = indexProject(project, force);
    return { ...getCodeIntelligenceProjectStatus(project), changedFiles: result.changedFiles, removedFiles: result.removedFiles };
}
function indexRunRow(project, run) {
    const db = openDatabase(project);
    db.prepare(`INSERT INTO index_runs(run_id,mode,state,reason,total_files,processed_files,changed_files,removed_files,failed_files,started_at,completed_at,error_summary,generation)
    VALUES(@runId,@mode,@state,@reason,@totalFiles,@processedFiles,@changedFiles,@removedFiles,@failedFiles,@startedAt,@completedAt,@errorSummary,@generation)
    ON CONFLICT(run_id) DO UPDATE SET state=excluded.state,total_files=excluded.total_files,processed_files=excluded.processed_files,changed_files=excluded.changed_files,removed_files=excluded.removed_files,failed_files=excluded.failed_files,completed_at=excluded.completed_at,error_summary=excluded.error_summary,generation=excluded.generation`).run(run);
    if (runtimes.get(project)?.db !== db)
        db.close();
}
function startCodeIntelligenceIndexRun(project, mode, reason = "") {
    projectRoot(project);
    const activeId = activeProjectRuns.get(project);
    if (activeId) {
        const active = activeIndexRuns.get(activeId);
        if (active && !["completed", "failed"].includes(String(active.state)))
            return active;
        activeProjectRuns.delete(project);
    }
    // A queued/running row without an in-memory worker belongs to a previous
    // process (for example after a service restart). Mark it as orphaned before
    // creating a new run so the UI cannot remain stuck on a phantom build.
    const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
    if (fs.existsSync(dbFile)) {
        const db = openDatabase(project);
        try {
            const orphan = db.prepare("SELECT * FROM index_runs WHERE state IN ('queued','running') ORDER BY started_at DESC LIMIT 1").get();
            if (orphan && !activeIndexRuns.has(String(orphan.run_id))) {
                db.prepare("UPDATE index_runs SET state='failed', completed_at=?, error_summary=? WHERE run_id=?").run(new Date().toISOString(), "索引任务在服务重启后失去运行租约，已重新排队", orphan.run_id);
            }
        }
        finally {
            db.close();
        }
    }
    const run = { schema: "ccm-code-intelligence-index-run-v1", runId: `cir_${crypto.randomUUID()}`, project, mode, state: "queued", reason: String(reason || "").slice(0, 500), totalFiles: 0, processedFiles: 0, changedFiles: 0, removedFiles: 0, failedFiles: 0, startedAt: new Date().toISOString(), completedAt: "", errorSummary: "", generation: 0, contentStored: false };
    activeIndexRuns.set(run.runId, run);
    activeProjectRuns.set(project, run.runId);
    indexRunRow(project, run);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.code_intelligence.index_queued", { project, runId: run.runId, mode });
    setImmediate(async () => {
        const current = activeIndexRuns.get(run.runId) || run;
        try {
            const root = projectRoot(project);
            current.state = "running";
            current.totalFiles = scanSourceFiles(root).length;
            indexRunRow(project, current);
            (0, runtime_events_1.publishRuntimeEvent)("project", "project.code_intelligence.index_running", { project, runId: run.runId, totalFiles: current.totalFiles });
            const result = indexProject(project, mode !== "start");
            const unchangedFiles = Math.max(0, current.totalFiles - result.changedFiles.length);
            current.processedFiles = unchangedFiles;
            indexRunRow(project, current);
            const external = await hydrateExternalIndex(project, result.changedFiles, (processed, failed) => {
                current.processedFiles = Math.min(current.totalFiles, unchangedFiles + processed);
                current.failedFiles = failed;
                indexRunRow(project, current);
            });
            Object.assign(current, { state: "completed", processedFiles: current.totalFiles, changedFiles: result.changedFiles.length, removedFiles: result.removedFiles.length, failedFiles: external.failed, generation: result.generation, completedAt: new Date().toISOString() });
            indexRunRow(project, current);
            (0, runtime_events_1.publishRuntimeEvent)("project", "project.code_intelligence.index_completed", { project, runId: run.runId, generation: result.generation, changedFiles: result.changedFiles.length, removedFiles: result.removedFiles.length });
        }
        catch (error) {
            Object.assign(current, { state: "failed", failedFiles: Math.max(1, Number(current.failedFiles || 0)), completedAt: new Date().toISOString(), errorSummary: String(error?.message || error).slice(0, 500) });
            try {
                indexRunRow(project, current);
            }
            catch { }
            (0, runtime_events_1.publishRuntimeEvent)("project", "project.code_intelligence.index_failed", { project, runId: run.runId, errorSummary: current.errorSummary });
        }
        finally {
            activeIndexRuns.set(run.runId, current);
            if (["completed", "failed"].includes(String(current.state)))
                activeProjectRuns.delete(project);
        }
    });
    return run;
}
function getCodeIntelligenceIndexRun(runId) {
    const active = activeIndexRuns.get(runId);
    if (active)
        return active;
    for (const config of (0, db_1.getConfigs)()) {
        const project = String(config.name || "");
        const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
        if (!fs.existsSync(dbFile))
            continue;
        try {
            const db = openDatabase(project);
            try {
                const row = db.prepare("SELECT * FROM index_runs WHERE run_id=?").get(runId);
                if (row)
                    return normalizeIndexRun(project, row);
            }
            finally {
                db.close();
            }
        }
        catch { }
    }
    return null;
}
function failCodeIntelligenceIndexRun(runId, reason) {
    const completedAt = new Date().toISOString();
    let updated = false;
    for (const config of (0, db_1.getConfigs)()) {
        const project = String(config.name || "");
        const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
        if (!fs.existsSync(dbFile))
            continue;
        const db = openDatabase(project);
        try {
            const result = db.prepare("UPDATE index_runs SET state='failed', completed_at=?, error_summary=? WHERE run_id=? AND state IN ('queued','running')")
                .run(completedAt, String(reason || "代码智能Worker异常退出").slice(0, 500), runId);
            if (Number(result.changes || 0) > 0)
                updated = true;
        }
        finally {
            if (runtimes.get(project)?.db !== db)
                db.close();
        }
    }
    activeIndexRuns.delete(runId);
    for (const [project, activeRunId] of activeProjectRuns)
        if (activeRunId === runId)
            activeProjectRuns.delete(project);
    return updated;
}
function normalizeIndexRun(project, row) {
    return { schema: "ccm-code-intelligence-index-run-v1", runId: row.run_id, project, mode: row.mode, state: row.state, reason: row.reason, totalFiles: Number(row.total_files || 0), processedFiles: Number(row.processed_files || 0), changedFiles: Number(row.changed_files || 0), removedFiles: Number(row.removed_files || 0), failedFiles: Number(row.failed_files || 0), startedAt: row.started_at, completedAt: row.completed_at, errorSummary: row.error_summary, generation: Number(row.generation || 0), contentStored: false };
}
function listCodeIntelligenceIndexRuns(project, limit = 20) {
    const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
    if (!fs.existsSync(dbFile))
        return [];
    const db = openDatabase(project);
    try {
        return db.prepare("SELECT * FROM index_runs ORDER BY started_at DESC LIMIT ?").all(Math.max(1, Math.min(100, limit))).map(row => normalizeIndexRun(project, row));
    }
    finally {
        db.close();
    }
}
function listCodeIntelligenceFiles(project, input = {}) {
    projectRoot(project);
    const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
    if (!fs.existsSync(dbFile))
        return { files: [], total: 0, nextCursor: "", truncated: false, contentStored: false };
    const offset = Math.max(0, Number.parseInt(String(input.cursor || "0"), 10) || 0);
    const limit = Math.max(1, Math.min(500, Number(input.limit || 200)));
    const language = String(input.language || "").trim();
    const query = String(input.query || "").trim().toLowerCase();
    const db = openDatabase(project);
    try {
        let rows = db.prepare("SELECT path,language,server_id,semantic_state,size,indexed_at FROM files ORDER BY path").all();
        rows = rows.filter(row => (!language || row.language === language) && (!query || String(row.path).toLowerCase().includes(query)));
        const selected = rows.slice(offset, offset + limit).map(row => ({ path: row.path, language: row.language, serverId: row.server_id, semanticState: row.semantic_state || "pending", size: Number(row.size || 0), indexedAt: row.indexed_at }));
        return { files: selected, total: rows.length, nextCursor: offset + selected.length < rows.length ? String(offset + selected.length) : "", truncated: offset + selected.length < rows.length, contentStored: false };
    }
    finally {
        db.close();
    }
}
function readCodeIntelligenceSource(project, requestedPath, line = 1, context = 40) {
    const root = projectRoot(project);
    const absolute = path.resolve(root, String(requestedPath || "").replace(/\\/g, "/"));
    const relativePath = relative(root, absolute);
    if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath))
        throw new Error("源码位置越过项目边界");
    const stat = fs.statSync(absolute);
    if (!stat.isFile())
        throw new Error("源码文件不存在");
    if (stat.size > MAX_FILE_BYTES)
        throw new Error("源码文件超过4MB安全预览上限");
    const buffer = fs.readFileSync(absolute);
    if (buffer.includes(0))
        throw new Error("二进制文件无法预览");
    const text = buffer.toString("utf8");
    const rows = text.split(/\r?\n/);
    const targetLine = Math.max(1, Math.min(rows.length || 1, Number(line || 1)));
    const radius = Math.max(5, Math.min(200, Number(context || 40)));
    const startLine = Math.max(1, targetLine - radius);
    const endLine = Math.min(rows.length, targetLine + radius);
    const selected = rows.slice(startLine - 1, endLine).map((value, index) => ({ line: startLine + index, text: value }));
    const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(root, [relativePath]);
    return { schema: "ccm-code-intelligence-source-preview-v1", project, path: relativePath, targetLine, startLine, endLine, totalLines: rows.length, lines: selected, revision: hash(buffer), repoStateIdentity, contentStored: false };
}
function stopCodeIntelligence() {
    for (const timer of watcherDebounce.values())
        clearTimeout(timer);
    watcherDebounce.clear();
    for (const runtime of runtimes.values()) {
        runtime.watcher?.close();
        runtime.service.dispose();
        runtime.db.close();
    }
    runtimes.clear();
}
function runTypeScriptLanguageServiceFixtureSelfTest() {
    const virtualRoot = process.platform === "win32" ? "C:/ccm-lsp-fixture" : "/ccm-lsp-fixture";
    const key = (value) => value.replace(/\\/g, "/").toLowerCase();
    const files = new Map([
        [key(`${virtualRoot}/service.ts`), "export interface Greeter { greet(name: string): string }\nexport class Service implements Greeter { greet(name: string) { return helper(name) } }\nexport function helper(value: string) { return `hi ${value}` }\n"],
        [key(`${virtualRoot}/main.ts`), "import { Service } from './service'\nexport function run() { return new Service().greet('ccm') }\n"],
    ]);
    const host = {
        getScriptFileNames: () => [...files.keys()], getScriptVersion: () => "1",
        getScriptSnapshot: file => { const text = files.get(key(file)) ?? ts.sys.readFile(file); return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text); },
        getCurrentDirectory: () => virtualRoot, getCompilationSettings: () => ({ target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 }),
        getDefaultLibFileName: options => ts.getDefaultLibFilePath(options), fileExists: file => files.has(key(file)) || ts.sys.fileExists(file), readFile: file => files.get(key(file)) || ts.sys.readFile(file), readDirectory: ts.sys.readDirectory,
        directoryExists: directory => key(directory) === key(virtualRoot) || ts.sys.directoryExists(directory), getDirectories: ts.sys.getDirectories, useCaseSensitiveFileNames: () => false, getNewLine: () => ts.sys.newLine,
    };
    const service = ts.createLanguageService(host);
    try {
        const main = key(`${virtualRoot}/main.ts`);
        const source = files.get(key(main));
        const servicePosition = source.indexOf("Service");
        const definition = service.getDefinitionAtPosition(main, servicePosition) || [];
        const referenceGroups = service.findReferences(main, servicePosition) || [];
        const diagnostics = [...service.getSyntacticDiagnostics(main), ...service.getSemanticDiagnostics(main)];
        return { success: definition.length > 0 && referenceGroups.some(group => group.references.length > 0) && diagnostics.length === 0, definitions: definition.length, references: referenceGroups.reduce((sum, group) => sum + group.references.length, 0), diagnostics: diagnostics.length };
    }
    finally {
        service.dispose();
    }
}
//# sourceMappingURL=code-intelligence.js.map