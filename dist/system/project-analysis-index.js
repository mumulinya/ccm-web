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
exports.CCM_PROJECT_ANALYSIS_INDEX_SCHEMA = void 0;
exports.getProjectAnalysisIndex = getProjectAnalysisIndex;
exports.ensureProjectAnalysisIndex = ensureProjectAnalysisIndex;
exports.queryProjectAnalysisIndex = queryProjectAnalysisIndex;
exports.markProjectAnalysisIndexStale = markProjectAnalysisIndexStale;
exports.scheduleProjectAnalysisIndexRefresh = scheduleProjectAnalysisIndexRefresh;
exports.closeProjectAnalysisIndexes = closeProjectAnalysisIndexes;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
exports.CCM_PROJECT_ANALYSIS_INDEX_SCHEMA = "ccm-project-analysis-index-v1";
const STORE = path.join(process.env.CCM_PROJECT_ANALYSIS_INDEX_DIR || path.join(os.homedir(), ".ccm"), "project-analysis-index");
const DATABASE = path.join(STORE, "index-v1.sqlite");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".py", ".go", ".rs", ".java", ".kt", ".cs", ".php", ".rb"]);
const CONFIG_NAMES = /^(?:package\.json|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|.*config\.(?:js|ts|mjs|cjs|json)|.*\.ya?ml)$/i;
const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", ".output", "target", ".venv", "venv"]);
const MAX_FILES = 50_000;
let database = null;
const watchers = new Map();
const watcherRoots = new Map();
const debounceTimers = new Map();
function hash(value) {
    const data = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value ?? null));
    return crypto.createHash("sha256").update(data).digest("hex");
}
function db() {
    if (database)
        return database;
    fs.mkdirSync(STORE, { recursive: true });
    database = new better_sqlite3_1.default(DATABASE);
    database.pragma("journal_mode = WAL");
    database.exec(`
    CREATE TABLE IF NOT EXISTS project_analysis_state_v1 (
      project_id TEXT PRIMARY KEY, generation INTEGER NOT NULL, repo_state_checksum TEXT NOT NULL,
      status TEXT NOT NULL, symbol_checksum TEXT NOT NULL, dependency_checksum TEXT NOT NULL,
      contract_checksum TEXT NOT NULL, test_mapping_checksum TEXT NOT NULL,
      indexed_file_count INTEGER NOT NULL, unresolved_count INTEGER NOT NULL,
      root_checksum TEXT NOT NULL, updated_at TEXT NOT NULL, error_summary TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS project_analysis_files_v1 (
      project_id TEXT NOT NULL, path TEXT NOT NULL, content_checksum TEXT NOT NULL,
      size INTEGER NOT NULL, mtime_ms REAL NOT NULL, kind TEXT NOT NULL,
      PRIMARY KEY(project_id, path)
    );
    CREATE TABLE IF NOT EXISTS project_analysis_edges_v1 (
      project_id TEXT NOT NULL, source_path TEXT NOT NULL, target_ref TEXT NOT NULL, kind TEXT NOT NULL,
      edge_checksum TEXT NOT NULL, PRIMARY KEY(project_id, source_path, target_ref, kind)
    );
    CREATE TABLE IF NOT EXISTS project_analysis_contracts_v1 (
      project_id TEXT NOT NULL, path TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL,
      line INTEGER NOT NULL, contract_checksum TEXT NOT NULL,
      PRIMARY KEY(project_id, path, kind, name, line)
    );
    CREATE TABLE IF NOT EXISTS project_analysis_tests_v1 (
      project_id TEXT NOT NULL, path TEXT NOT NULL, target_ref TEXT NOT NULL, command_ref TEXT NOT NULL,
      mapping_checksum TEXT NOT NULL, PRIMARY KEY(project_id, path, target_ref)
    );
    CREATE INDEX IF NOT EXISTS idx_project_analysis_edges_target ON project_analysis_edges_v1(project_id, target_ref);
    CREATE INDEX IF NOT EXISTS idx_project_analysis_contract_kind ON project_analysis_contracts_v1(project_id, kind);
  `);
    return database;
}
function relative(root, file) { return path.relative(root, file).replace(/\\/g, "/"); }
function inventory(root) {
    const rows = [];
    const stack = [root];
    let unresolved = 0;
    while (stack.length && rows.length < MAX_FILES) {
        const dir = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            unresolved += 1;
            continue;
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink()) {
                unresolved += 1;
                continue;
            }
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED.has(entry.name.toLowerCase()))
                    stack.push(full);
            }
            else if (entry.isFile() && (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || CONFIG_NAMES.test(entry.name) || /^readme(?:\.|$)/i.test(entry.name))) {
                rows.push(full);
            }
            if (rows.length >= MAX_FILES)
                break;
        }
    }
    if (stack.length)
        unresolved += 1;
    return { files: rows.sort((a, b) => a.localeCompare(b)), unresolved };
}
function parseFile(root, file) {
    const rel = relative(root, file);
    const stat = fs.statSync(file);
    if (stat.size > 4 * 1024 * 1024)
        return { rel, stat, checksum: hash(`${stat.size}:${stat.mtimeMs}`), kind: "oversized", edges: [], contracts: [], tests: [], unresolved: 1 };
    const content = fs.readFileSync(file, "utf8");
    const edges = [];
    const contracts = [];
    const tests = [];
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        for (const match of line.matchAll(/(?:import[^'\"]*from\s*|require\s*\(|import\s*\()['\"]([^'\"]+)['\"]/g))
            edges.push({ target: match[1], kind: "import" });
        const exported = line.match(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:class|function|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/);
        if (exported)
            contracts.push({ kind: "public_export", name: exported[1], line: index + 1 });
        const route = line.match(/\b(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)/i);
        if (route)
            contracts.push({ kind: "route", name: `${route[1].toUpperCase()} ${route[2]}`, line: index + 1 });
        const migration = /(?:^|\/)(?:migrations?|schema)(?:\/|$)/i.test(rel);
        if (migration && /(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX)|migration/i.test(line))
            contracts.push({ kind: "migration", name: rel, line: index + 1 });
    }
    const isTest = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.[^.]+$/i.test(rel);
    if (isTest) {
        for (const edge of edges)
            tests.push({ target: edge.target, command: "" });
        if (!tests.length)
            tests.push({ target: path.basename(rel).replace(/\.(?:test|spec)(?=\.)/i, ""), command: "" });
    }
    if (path.basename(rel).toLowerCase() === "package.json") {
        try {
            const parsed = JSON.parse(content);
            for (const [name, command] of Object.entries(parsed?.scripts || {}))
                if (/test|check|lint|type|build/i.test(name))
                    tests.push({ target: "*", command: `npm run ${name}` });
        }
        catch { }
    }
    return { rel, stat, checksum: hash(content), kind: isTest ? "test" : CONFIG_NAMES.test(path.basename(rel)) ? "config" : "source", edges, contracts, tests, unresolved: 0 };
}
function stateRow(projectId) {
    const row = db().prepare("SELECT * FROM project_analysis_state_v1 WHERE project_id=?").get(projectId);
    if (!row)
        return null;
    return {
        schema: exports.CCM_PROJECT_ANALYSIS_INDEX_SCHEMA,
        projectId,
        generation: Number(row.generation || 0),
        repoStateChecksum: String(row.repo_state_checksum || ""),
        status: row.status,
        symbolChecksum: String(row.symbol_checksum || ""),
        dependencyChecksum: String(row.dependency_checksum || ""),
        contractChecksum: String(row.contract_checksum || ""),
        testMappingChecksum: String(row.test_mapping_checksum || ""),
        indexedFileCount: Number(row.indexed_file_count || 0),
        unresolvedCount: Number(row.unresolved_count || 0),
        contentStored: false,
    };
}
function getProjectAnalysisIndex(projectId) { return stateRow(projectId); }
function ensureProjectAnalysisIndex(input) {
    const projectId = String(input.projectId || "").trim();
    const root = fs.realpathSync(input.root);
    if (!projectId)
        throw new Error("Project analysis index requires projectId");
    const database = db();
    const scan = inventory(root);
    const known = new Map(database.prepare("SELECT path, content_checksum FROM project_analysis_files_v1 WHERE project_id=?").all(projectId).map(row => [String(row.path), String(row.content_checksum)]));
    const parsed = scan.files.map(file => parseFile(root, file));
    const current = new Set(parsed.map(row => row.rel));
    const changed = parsed.filter(row => input.force || known.get(row.rel) !== row.checksum);
    const removed = [...known.keys()].filter(file => !current.has(file));
    const old = stateRow(projectId);
    const generation = changed.length || removed.length || !old ? Math.max(1, Number(old?.generation || 0) + 1) : old.generation;
    const repoStateChecksum = hash(parsed.map(row => [row.rel, row.checksum]));
    const tx = database.transaction(() => {
        database.prepare(`INSERT INTO project_analysis_state_v1(project_id,generation,repo_state_checksum,status,symbol_checksum,dependency_checksum,contract_checksum,test_mapping_checksum,indexed_file_count,unresolved_count,root_checksum,updated_at,error_summary)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET generation=excluded.generation,repo_state_checksum=excluded.repo_state_checksum,status=excluded.status,indexed_file_count=excluded.indexed_file_count,unresolved_count=excluded.unresolved_count,root_checksum=excluded.root_checksum,updated_at=excluded.updated_at,error_summary=''`)
            .run(projectId, generation, repoStateChecksum, "building", "", "", "", "", parsed.length, scan.unresolved + parsed.reduce((sum, row) => sum + row.unresolved, 0), hash(root), new Date().toISOString(), "");
        for (const rel of removed) {
            database.prepare("DELETE FROM project_analysis_files_v1 WHERE project_id=? AND path=?").run(projectId, rel);
            database.prepare("DELETE FROM project_analysis_edges_v1 WHERE project_id=? AND source_path=?").run(projectId, rel);
            database.prepare("DELETE FROM project_analysis_contracts_v1 WHERE project_id=? AND path=?").run(projectId, rel);
            database.prepare("DELETE FROM project_analysis_tests_v1 WHERE project_id=? AND path=?").run(projectId, rel);
        }
        for (const row of changed) {
            database.prepare("DELETE FROM project_analysis_edges_v1 WHERE project_id=? AND source_path=?").run(projectId, row.rel);
            database.prepare("DELETE FROM project_analysis_contracts_v1 WHERE project_id=? AND path=?").run(projectId, row.rel);
            database.prepare("DELETE FROM project_analysis_tests_v1 WHERE project_id=? AND path=?").run(projectId, row.rel);
            database.prepare(`INSERT INTO project_analysis_files_v1(project_id,path,content_checksum,size,mtime_ms,kind) VALUES(?,?,?,?,?,?)
        ON CONFLICT(project_id,path) DO UPDATE SET content_checksum=excluded.content_checksum,size=excluded.size,mtime_ms=excluded.mtime_ms,kind=excluded.kind`)
                .run(projectId, row.rel, row.checksum, row.stat.size, row.stat.mtimeMs, row.kind);
            for (const edge of row.edges)
                database.prepare("INSERT OR REPLACE INTO project_analysis_edges_v1(project_id,source_path,target_ref,kind,edge_checksum) VALUES(?,?,?,?,?)").run(projectId, row.rel, edge.target, edge.kind, hash([row.rel, edge]));
            for (const contract of row.contracts)
                database.prepare("INSERT OR REPLACE INTO project_analysis_contracts_v1(project_id,path,kind,name,line,contract_checksum) VALUES(?,?,?,?,?,?)").run(projectId, row.rel, contract.kind, contract.name, contract.line, hash([row.rel, contract]));
            for (const test of row.tests)
                database.prepare("INSERT OR REPLACE INTO project_analysis_tests_v1(project_id,path,target_ref,command_ref,mapping_checksum) VALUES(?,?,?,?,?)").run(projectId, row.rel, test.target, test.command, hash([row.rel, test]));
        }
        const dependencyRows = database.prepare("SELECT source_path,target_ref,kind FROM project_analysis_edges_v1 WHERE project_id=? ORDER BY source_path,target_ref,kind").all(projectId);
        const contractRows = database.prepare("SELECT path,kind,name,line FROM project_analysis_contracts_v1 WHERE project_id=? ORDER BY path,kind,name,line").all(projectId);
        const testRows = database.prepare("SELECT path,target_ref,command_ref FROM project_analysis_tests_v1 WHERE project_id=? ORDER BY path,target_ref,command_ref").all(projectId);
        const symbolChecksum = hash(parsed.map(row => [row.rel, row.checksum]));
        database.prepare("UPDATE project_analysis_state_v1 SET status='ready',symbol_checksum=?,dependency_checksum=?,contract_checksum=?,test_mapping_checksum=?,updated_at=? WHERE project_id=?")
            .run(symbolChecksum, hash(dependencyRows), hash(contractRows), hash(testRows), new Date().toISOString(), projectId);
    });
    tx();
    attachProjectAnalysisWatcher(projectId, root);
    return stateRow(projectId);
}
function queryProjectAnalysisIndex(projectId, kind, limit = 500) {
    const database = db();
    if (kind === "dependencies")
        return database.prepare("SELECT source_path AS sourcePath,target_ref AS targetRef,kind FROM project_analysis_edges_v1 WHERE project_id=? ORDER BY source_path,target_ref LIMIT ?").all(projectId, limit);
    if (kind === "contracts")
        return database.prepare("SELECT path,kind,name,line FROM project_analysis_contracts_v1 WHERE project_id=? ORDER BY path,kind,name LIMIT ?").all(projectId, limit);
    return database.prepare("SELECT path,target_ref AS targetRef,command_ref AS commandRef FROM project_analysis_tests_v1 WHERE project_id=? ORDER BY path,target_ref LIMIT ?").all(projectId, limit);
}
function markProjectAnalysisIndexStale(projectId) {
    db().prepare("UPDATE project_analysis_state_v1 SET status='stale',updated_at=? WHERE project_id=?").run(new Date().toISOString(), projectId);
}
function scheduleProjectAnalysisIndexRefresh(input) {
    const pending = debounceTimers.get(input.projectId);
    if (pending)
        clearTimeout(pending);
    const timer = setTimeout(() => {
        debounceTimers.delete(input.projectId);
        try {
            ensureProjectAnalysisIndex(input);
        }
        catch {
            try {
                db().prepare("UPDATE project_analysis_state_v1 SET status='failed',updated_at=? WHERE project_id=?").run(new Date().toISOString(), input.projectId);
            }
            catch { }
        }
    }, Math.max(100, Number(input.delayMs || 2_000)));
    timer.unref?.();
    debounceTimers.set(input.projectId, timer);
}
function attachProjectAnalysisWatcher(projectId, root) {
    if (watchers.has(projectId) && watcherRoots.get(projectId) === root)
        return;
    watchers.get(projectId)?.close();
    watchers.delete(projectId);
    watcherRoots.delete(projectId);
    try {
        const watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
            const rel = String(filename || "").replace(/\\/g, "/");
            if (!rel || IGNORED.has(rel.split("/")[0].toLowerCase()))
                return;
            scheduleProjectAnalysisIndexRefresh({ projectId, root, delayMs: 2_000 });
        });
        watcher.unref?.();
        watchers.set(projectId, watcher);
        watcherRoots.set(projectId, root);
    }
    catch { }
}
function closeProjectAnalysisIndexes() {
    for (const watcher of watchers.values())
        watcher.close();
    watchers.clear();
    watcherRoots.clear();
    for (const timer of debounceTimers.values())
        clearTimeout(timer);
    debounceTimers.clear();
    database?.close();
    database = null;
}
//# sourceMappingURL=project-analysis-index.js.map