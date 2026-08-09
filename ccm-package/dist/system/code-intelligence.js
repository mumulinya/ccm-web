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
exports.CODE_INTELLIGENCE_RESULT_SCHEMA = void 0;
exports.executeCodeIntelligenceTool = executeCodeIntelligenceTool;
exports.listLanguageServers = listLanguageServers;
exports.configureLanguageServer = configureLanguageServer;
exports.previewLanguageServerInstall = previewLanguageServerInstall;
exports.listCodeIntelligenceProjects = listCodeIntelligenceProjects;
exports.getCodeIntelligenceProjectStatus = getCodeIntelligenceProjectStatus;
exports.startCodeIntelligenceProject = startCodeIntelligenceProject;
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
exports.CODE_INTELLIGENCE_RESULT_SCHEMA = "ccm-code-intelligence-result-v1";
const STORE_ROOT = path.join(process.env.CCM_CODE_INTELLIGENCE_DIR || path.join(os.homedir(), ".cc-connect"), "code-intelligence");
const CUSTOM_SERVERS_FILE = path.join(STORE_ROOT, "custom-language-servers.json");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);
const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", ".output", "target"]);
const MAX_FILES = 50_000;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const runtimes = new Map();
const stoppedServers = new Set();
const watcherDebounce = new Map();
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
            }, 250);
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
function scanSourceFiles(root) {
    const files = [];
    const stack = [root];
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
            if (entry.isSymbolicLink())
                continue;
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED.has(entry.name.toLowerCase()))
                    stack.push(absolute);
            }
            else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
                try {
                    if (fs.statSync(absolute).size <= MAX_FILE_BYTES)
                        files.push(absolute);
                }
                catch { }
            }
            if (files.length >= MAX_FILES)
                break;
        }
    }
    return files.sort((a, b) => a.localeCompare(b));
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
      path TEXT PRIMARY KEY, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime_ms REAL NOT NULL, indexed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      start_line INTEGER NOT NULL, start_character INTEGER NOT NULL, end_line INTEGER NOT NULL, end_character INTEGER NOT NULL,
      container TEXT NOT NULL DEFAULT '', symbol_checksum TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path);
    CREATE TABLE IF NOT EXISTS diagnostics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, start_line INTEGER NOT NULL, start_character INTEGER NOT NULL,
      end_line INTEGER NOT NULL, end_character INTEGER NOT NULL, severity TEXT NOT NULL, code TEXT NOT NULL,
      source TEXT NOT NULL, message_checksum TEXT NOT NULL, message_preview TEXT NOT NULL, repo_state_checksum TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diagnostics_path ON diagnostics(path);
  `);
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
function createRuntime(project, root, files, db, generation) {
    const versions = new Map();
    for (const file of files)
        versions.set(file, hash(fs.readFileSync(file)));
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
    return { project, root, db, generation, versions, service: ts.createLanguageService(host, ts.createDocumentRegistry()), lastIndexedAt: new Date().toISOString() };
}
function indexProject(project, force = false) {
    const root = projectRoot(project);
    const db = openDatabase(project);
    const files = scanSourceFiles(root);
    const previousGeneration = Number(db.prepare("SELECT value FROM metadata WHERE key='generation'").pluck().get() || 0);
    const changed = [];
    const removed = [];
    const known = new Map(db.prepare("SELECT path, hash FROM files").all().map(row => [String(row.path), String(row.hash)]));
    const current = new Set();
    for (const file of files) {
        const rel = relative(root, file);
        current.add(rel);
        const fileHash = hash(fs.readFileSync(file));
        if (force || known.get(rel) !== fileHash)
            changed.push(file);
    }
    for (const rel of known.keys())
        if (!current.has(rel))
            removed.push(rel);
    const generation = changed.length || removed.length || previousGeneration === 0 ? previousGeneration + 1 : previousGeneration;
    const runtime = createRuntime(project, root, files, db, generation);
    const repoIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(root, changed.map(file => relative(root, file)));
    const repoChecksum = hash(repoIdentity);
    const transaction = db.transaction(() => {
        for (const rel of removed) {
            db.prepare("DELETE FROM files WHERE path=?").run(rel);
            db.prepare("DELETE FROM symbols WHERE path=?").run(rel);
            db.prepare("DELETE FROM diagnostics WHERE path=?").run(rel);
        }
        for (const file of changed) {
            const rel = relative(root, file);
            const content = fs.readFileSync(file, "utf8");
            const stat = fs.statSync(file);
            const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind(file));
            db.prepare("DELETE FROM symbols WHERE path=?").run(rel);
            db.prepare("DELETE FROM diagnostics WHERE path=?").run(rel);
            const insertSymbol = db.prepare("INSERT INTO symbols(path,name,kind,start_line,start_character,end_line,end_character,container,symbol_checksum) VALUES(?,?,?,?,?,?,?,?,?)");
            for (const symbol of collectSymbols(source))
                insertSymbol.run(rel, symbol.name, symbol.kind, symbol.range.startLine, symbol.range.startCharacter, symbol.range.endLine, symbol.range.endCharacter, symbol.container, hash({ rel, ...symbol }));
            const diagnostics = [...runtime.service.getSyntacticDiagnostics(file), ...runtime.service.getSemanticDiagnostics(file)];
            const insertDiagnostic = db.prepare("INSERT INTO diagnostics(path,start_line,start_character,end_line,end_character,severity,code,source,message_checksum,message_preview,repo_state_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
            for (const diagnostic of diagnostics.slice(0, 2000)) {
                const range = lineRange(source, diagnostic.start || 0, diagnostic.length || 0);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ").replace(/\s+/g, " ").trim();
                insertDiagnostic.run(rel, range.startLine, range.startCharacter, range.endLine, range.endCharacter, diagnosticSeverity(diagnostic.category), String(diagnostic.code), "typescript", hash(message), message.slice(0, 500), repoChecksum);
            }
            db.prepare("INSERT INTO files(path,hash,size,mtime_ms,indexed_at) VALUES(?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET hash=excluded.hash,size=excluded.size,mtime_ms=excluded.mtime_ms,indexed_at=excluded.indexed_at").run(rel, hash(content), stat.size, stat.mtimeMs, new Date().toISOString());
        }
        db.prepare("INSERT INTO metadata(key,value) VALUES('generation',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(generation));
        db.prepare("INSERT INTO metadata(key,value) VALUES('last_indexed_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(new Date().toISOString());
        db.prepare("INSERT INTO metadata(key,value) VALUES('root_checksum',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(hash(root));
    });
    transaction();
    const previous = runtimes.get(project);
    previous?.watcher?.close();
    previous?.service.dispose();
    if (previous && previous.db !== db)
        previous.db.close();
    runtimes.set(project, runtime);
    attachIncrementalWatcher(runtime);
    return { runtime, changedFiles: changed.map(file => relative(root, file)), removedFiles: removed, generation };
}
function ensureRuntime(project) {
    const current = runtimes.get(project);
    if (!current)
        return indexProject(project).runtime;
    const files = scanSourceFiles(current.root);
    const drift = files.length !== current.versions.size || files.some(file => current.versions.get(file) !== hash(fs.readFileSync(file)));
    return drift ? indexProject(project).runtime : current;
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
    const base = {
        schema: exports.CODE_INTELLIGENCE_RESULT_SCHEMA,
        project: runtime.project,
        indexGeneration: runtime.generation,
        languageServer: "typescript-language-service",
        repoStateIdentity: (0, unified_evidence_registry_1.captureRepoStateIdentity)(runtime.root, page.selected.map(item => item.path)),
        locations: page.selected,
        nextCursor: page.nextCursor,
        truncated: page.truncated,
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
function flattenDocumentSymbols(root, uri, rows, output = []) {
    for (const row of Array.isArray(rows) ? rows : []) {
        const item = row?.location ? row : { ...row, uri };
        const found = lspRangeLocation(root, item, String(row?.name || ""), `symbol:${String(row?.kind || "")}`);
        if (found)
            output.push(found);
        if (Array.isArray(row?.children))
            flattenDocumentSymbols(root, uri, row.children, output);
    }
    return output;
}
function finishExternal(project, root, languageServer, generation, locations, args, diagnostics) {
    const unique = [...new Map(locations.map(item => [`${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}:${item.kind}`, item])).values()]
        .sort((a, b) => a.path.localeCompare(b.path) || a.range.startLine - b.range.startLine || a.range.startCharacter - b.range.startCharacter);
    const page = paginate(unique, args);
    const base = {
        schema: exports.CODE_INTELLIGENCE_RESULT_SCHEMA, project, indexGeneration: generation, languageServer,
        repoStateIdentity: (0, unified_evidence_registry_1.captureRepoStateIdentity)(root, page.selected.map(item => item.path)), locations: page.selected,
        nextCursor: page.nextCursor, truncated: page.truncated, contentStored: false,
    };
    if (diagnostics)
        base.diagnostics = diagnostics;
    return { ...base, resultChecksum: hash(base) };
}
async function executeExternalLspTool(project, tool, args, requestedExtension) {
    const root = projectRoot(project);
    const language = EXTERNAL_LANGUAGE_BY_EXTENSION[requestedExtension] || String(args?.language || "").trim().toLowerCase();
    const descriptor = listLanguageServers().find(item => item.id === String(args?.language_server_id || "") || item.languages.includes(language));
    if (!descriptor || descriptor.status !== "available" || !descriptor.discoveredPath) {
        throw new Error(`capability_unavailable: ${requestedExtension || language || "目标"} 语言服务未连接；未使用文本匹配冒充语义结果。`);
    }
    const clientId = `${descriptor.id}:${safeId(project)}`;
    const client = await lsp_client_1.languageServerManager.start({ id: clientId, command: descriptor.discoveredPath || descriptor.command, args: externalServerArgs(descriptor.id), cwd: root, languages: descriptor.languages, timeoutMs: 15_000 });
    const requestedPath = String(args?.path || "").replace(/\\/g, "/");
    const absolute = requestedPath ? path.resolve(root, requestedPath) : "";
    if (absolute && (path.relative(root, absolute).startsWith("..") || !fs.existsSync(absolute)))
        throw new Error("代码智能目标文件不存在或越过项目边界");
    const uri = absolute ? (0, url_1.pathToFileURL)(absolute).href : "";
    let text = "";
    if (absolute) {
        text = fs.readFileSync(absolute, "utf8");
        client.notify("textDocument/didOpen", { textDocument: { uri, languageId: language, version: 1, text } });
    }
    const symbol = String(args?.symbol || "");
    const rawOffset = symbol && text ? text.indexOf(symbol) : 0;
    const prefix = text.slice(0, Math.max(0, rawOffset));
    const position = { line: prefix.split(/\r?\n/).length - 1, character: prefix.length - Math.max(prefix.lastIndexOf("\n") + 1, 0) };
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
        await new Promise(resolve => setTimeout(resolve, 75));
        const rows = client.diagnostics.get(uri) || [];
        locations = rows.map(item => lspRangeLocation(root, { uri, range: item.range, name: String(item.code || "") }, String(item.code || ""), `diagnostic:${String(item.severity || "")}`)).filter(Boolean);
        diagnostics = rows.map(item => ({ path: requestedPath, range: item.range, severity: item.severity, code: String(item.code || ""), source: String(item.source || descriptor.id), messageChecksum: hash(String(item.message || "")), messagePreview: String(item.message || "").replace(/\s+/g, " ").slice(0, 500), contentStored: false }));
    }
    else {
        if (!uri || !symbol || rawOffset < 0)
            throw new Error("语义定位需要有效的path和symbol");
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
    return finishExternal(project, root, descriptor.id, getCodeIntelligenceProjectStatus(project).generation, locations, args, diagnostics);
}
async function executeCodeIntelligenceTool(project, tool, args) {
    const requestedExtension = path.extname(String(args?.path || "")).toLowerCase();
    if ((requestedExtension && !SOURCE_EXTENSIONS.has(requestedExtension)) || (!requestedExtension && args?.language_server_id && args.language_server_id !== "typescript")) {
        return executeExternalLspTool(project, tool, args, requestedExtension);
    }
    if (stoppedServers.has("typescript"))
        throw new Error("capability_unavailable: TypeScript语言服务已停止");
    const runtime = ensureRuntime(project);
    if (runtime.versions.size === 0)
        throw new Error("capability_unavailable: 当前项目没有可由TypeScript语言服务处理的源码文件");
    let locations = [];
    if (tool === "workspace_symbols" || tool === "document_symbols") {
        const query = `%${String(args?.query || args?.symbol || "").trim()}%`;
        const rows = tool === "document_symbols"
            ? runtime.db.prepare("SELECT * FROM symbols WHERE path=? AND name LIKE ? COLLATE NOCASE ORDER BY start_line,start_character").all(String(args?.path || "").replace(/\\/g, "/"), query)
            : runtime.db.prepare("SELECT * FROM symbols WHERE name LIKE ? COLLATE NOCASE ORDER BY name,path,start_line LIMIT 5000").all(query);
        locations = rows.map(row => ({ path: row.path, range: { startLine: row.start_line, startCharacter: row.start_character, endLine: row.end_line, endCharacter: row.end_character }, symbol: row.name, kind: row.kind }));
    }
    else if (tool === "read_code_diagnostics") {
        const rows = args?.path
            ? runtime.db.prepare("SELECT * FROM diagnostics WHERE path=? ORDER BY path,start_line,start_character").all(String(args.path).replace(/\\/g, "/"))
            : runtime.db.prepare("SELECT * FROM diagnostics ORDER BY path,start_line,start_character LIMIT 5000").all();
        locations = rows.map(row => ({ path: row.path, range: { startLine: row.start_line, startCharacter: row.start_character, endLine: row.end_line, endCharacter: row.end_character }, symbol: row.code, kind: `diagnostic:${row.severity}` }));
        const result = finish(runtime, locations, args);
        const locationKeys = new Set(result.locations.map((item) => `${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}`));
        result.diagnostics = rows.filter(row => locationKeys.has(`${row.path}:${row.start_line}:${row.start_character}:${row.code}`)).map(row => ({ path: row.path, range: { startLine: row.start_line, startCharacter: row.start_character, endLine: row.end_line, endCharacter: row.end_character }, severity: row.severity, code: row.code, source: row.source, messageChecksum: row.message_checksum, messagePreview: row.message_preview, contentStored: false }));
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
function discoverCommand(command) {
    if (command === "tsserver")
        return require.resolve("typescript/lib/tsserver.js");
    const probe = (0, child_process_1.spawnSync)(process.platform === "win32" ? "where.exe" : "which", [command], { encoding: "utf8", windowsHide: true, timeout: 3000 });
    return probe.status === 0 ? String(probe.stdout || "").split(/\r?\n/).find(Boolean)?.trim() || "" : "";
}
function listLanguageServers() {
    return serverManifest().map(item => {
        const discoveredPath = discoverCommand(item.command);
        const installed = item.bundled || !!discoveredPath;
        const descriptor = { ...item, installed, discoveredPath, status: (stoppedServers.has(item.id) ? "stopped" : installed ? "available" : "missing"), version: item.id === "typescript" ? ts.version : "" };
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
function previewLanguageServerInstall(id) {
    const descriptor = serverManifest().find(item => item.id === id);
    if (!descriptor)
        throw new Error("未知语言服务");
    if (descriptor.bundled)
        return { installRequired: false, descriptor: listLanguageServers().find(item => item.id === id), contentStored: false };
    return { installRequired: true, executed: false, reason: "CCM不会在请求中静默下载。请由管理员确认固定版本、来源和发布checksum后，通过受管安装器执行。", source: descriptor.source, command: descriptor.command, manifestChecksum: hash(descriptor), contentStored: false };
}
function listCodeIntelligenceProjects() {
    return (0, db_1.getConfigs)().map(config => getCodeIntelligenceProjectStatus(String(config.name || ""))).filter(Boolean);
}
function getCodeIntelligenceProjectStatus(project) {
    const root = projectRoot(project);
    const runtime = runtimes.get(project);
    const dbFile = path.join(STORE_ROOT, safeId(project), "index.sqlite");
    let stored = { generation: 0, files: 0, symbols: 0, diagnostics: 0, lastIndexedAt: "" };
    if (fs.existsSync(dbFile)) {
        const db = runtime?.db || new better_sqlite3_1.default(dbFile, { readonly: true });
        try {
            stored = {
                generation: Number(db.prepare("SELECT value FROM metadata WHERE key='generation'").pluck().get() || 0),
                files: Number(db.prepare("SELECT COUNT(*) FROM files").pluck().get() || 0),
                symbols: Number(db.prepare("SELECT COUNT(*) FROM symbols").pluck().get() || 0),
                diagnostics: Number(db.prepare("SELECT COUNT(*) FROM diagnostics").pluck().get() || 0),
                lastIndexedAt: String(db.prepare("SELECT value FROM metadata WHERE key='last_indexed_at'").pluck().get() || ""),
            };
        }
        finally {
            if (!runtime)
                db.close();
        }
    }
    return { schema: "ccm-code-intelligence-project-v1", project, rootChecksum: hash(root), status: runtime ? "ready" : stored.generation ? "stopped" : "not_indexed", languageServer: "typescript-language-service", ...stored, contentStored: false };
}
function startCodeIntelligenceProject(project, force = false) {
    const result = indexProject(project, force);
    return { ...getCodeIntelligenceProjectStatus(project), changedFiles: result.changedFiles, removedFiles: result.removedFiles };
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