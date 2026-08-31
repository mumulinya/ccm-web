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
exports.WORKSPACE_ANALYSIS_TOOL_NAMES = void 0;
exports.executeWorkspaceReadonlyAnalysisTool = executeWorkspaceReadonlyAnalysisTool;
exports.compareWorkspaceProjectContracts = compareWorkspaceProjectContracts;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const managed_process_tree_1 = require("../system/managed-process-tree");
const code_intelligence_1 = require("../system/code-intelligence");
const project_analysis_index_1 = require("../system/project-analysis-index");
const readonly_inspection_sandbox_1 = require("./readonly-inspection-sandbox");
exports.WORKSPACE_ANALYSIS_TOOL_NAMES = new Set([
    "analyze_change_impact",
    "find_related_tests",
    "inspect_dependency_graph",
    "inspect_public_contracts",
    "compare_project_contracts",
    "read_git_blame",
    "discover_verification_commands",
    "run_inspection_command",
]);
const EXCLUDED = new Set([".git", "node_modules", "target", "dist", "build", "coverage", ".next", ".nuxt", ".output", ".cache"]);
const SENSITIVE = /(?:^|[-_.])(?:credentials?|secrets?|private[-_.]?key|access[-_.]?key|service[-_.]?account)(?:[-_.]|$)|^\.env(?:\.|$)|^\.(?:npmrc|pypirc|netrc)$|\.(?:pem|p12|pfx|key|keystore|jks)$/i;
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".py", ".java", ".kt", ".kts", ".go", ".rs", ".cs", ".php", ".rb", ".swift", ".scala", ".json", ".yaml", ".yml", ".toml", ".xml", ".gradle", ".md"]);
const MAX_SCAN_FILES = 4_000;
const MAX_TEXT_BYTES = 768 * 1024;
const MAX_RESULT_ITEMS = 500;
const COMMAND_OUTPUT_BYTES = 64 * 1024;
const COMMAND_OUTPUT_LINES = 1_000;
const AUDIT_FILE = path.join(os.homedir(), ".ccm", "agent-runner", "tool-permission-violations.jsonl");
const BLOCKED_ANALYSIS_IDENTITIES = new Set();
function analysisIdentityKey(identity) {
    return [identity.scope, identity.scopeId, identity.exactSessionId, identity.generation, identity.projectId].join("\u001f");
}
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value ?? null))).digest("hex");
}
function relative(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}
function inside(root, candidate) {
    const base = path.resolve(root);
    const target = path.resolve(candidate);
    return target === base || target.startsWith(`${base}${path.sep}`);
}
function safeRelativePath(root, value, allowMissing = false) {
    const raw = String(value || "").trim();
    if (!raw || path.isAbsolute(raw) || /^[A-Za-z]:/.test(raw) || raw.split(/[\\/]+/).includes(".."))
        throw new Error("只允许项目内相对路径");
    if (raw.split(/[\\/]+/).some(part => SENSITIVE.test(part)))
        throw new Error("禁止读取敏感文件");
    const target = path.resolve(root, raw);
    if (!inside(root, target))
        throw new Error("目标路径越过项目边界");
    if (!allowMissing) {
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink())
            throw new Error("禁止通过符号链接读取项目外路径");
        const real = fs.realpathSync(target);
        if (!inside(root, real))
            throw new Error("目标真实路径越过项目边界");
    }
    return { absolute: target, relative: relative(path.relative(root, target)) };
}
async function walk(root, max = MAX_SCAN_FILES) {
    const rows = [];
    const queue = [root];
    while (queue.length && rows.length < max) {
        const directory = queue.shift();
        let entries = [];
        try {
            entries = await fs.promises.readdir(directory, { withFileTypes: true });
        }
        catch {
            continue;
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            if (rows.length >= max)
                break;
            if (entry.isSymbolicLink() || EXCLUDED.has(entry.name.toLowerCase()) || SENSITIVE.test(entry.name))
                continue;
            const target = path.join(directory, entry.name);
            if (entry.isDirectory())
                queue.push(target);
            else if (entry.isFile())
                rows.push(relative(path.relative(root, target)));
        }
    }
    return { files: rows, truncated: queue.length > 0 || rows.length >= max };
}
function readText(root, file) {
    const target = safeRelativePath(root, file).absolute;
    const stat = fs.statSync(target);
    if (!stat.isFile() || stat.size > MAX_TEXT_BYTES)
        return "";
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) && !["Dockerfile", "Makefile"].includes(path.basename(file)))
        return "";
    const buffer = fs.readFileSync(target);
    if (buffer.includes(0))
        return "";
    return buffer.toString("utf-8");
}
function runProcess(command, args, cwd, options = {}) {
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted)
            return reject(Object.assign(new Error("命令已取消"), { code: "ABORT_ERR" }));
        const startedAt = Date.now();
        const child = (0, child_process_1.spawn)(command, args, {
            cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_EXTERNAL_DIFF: "" },
        });
        const maxBytes = Math.max(1024, options.maxBytes || COMMAND_OUTPUT_BYTES);
        let stdout = Buffer.alloc(0);
        let stderr = Buffer.alloc(0);
        let truncated = false;
        let settled = false;
        let aborted = false;
        let timedOut = false;
        const append = (current, chunk) => {
            if (current.length >= maxBytes) {
                truncated = true;
                return current;
            }
            if (current.length + chunk.length > maxBytes)
                truncated = true;
            return Buffer.concat([current, chunk.subarray(0, Math.max(0, maxBytes - current.length))]);
        };
        child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
        child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
        const stop = () => { void (0, managed_process_tree_1.terminateManagedProcessTree)(child, { gracefulTimeoutMs: 250, forceTimeoutMs: 1_000 }); };
        const timer = setTimeout(() => { timedOut = true; stop(); }, Math.max(250, Math.min(10_000, Number(options.timeoutMs || 10_000))));
        const onAbort = () => { aborted = true; stop(); };
        options.signal?.addEventListener("abort", onAbort, { once: true });
        child.once("error", error => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            reject(error);
        });
        child.once("close", code => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            const compact = (buffer) => buffer.toString("utf-8").split(/\r?\n/).slice(0, COMMAND_OUTPUT_LINES).join("\n");
            if (aborted)
                return reject(Object.assign(new Error("命令已取消"), { code: "ABORT_ERR" }));
            if (timedOut)
                return reject(Object.assign(new Error("只读诊断命令执行超时"), { code: "INSPECTION_COMMAND_TIMEOUT" }));
            resolve({ stdout: compact(stdout), stderr: compact(stderr), exitCode: typeof code === "number" ? code : 1, durationMs: Date.now() - startedAt, truncated });
        });
    });
}
async function fingerprintWorkspacePaths(root, paths) {
    const rows = [];
    for (const candidate of [...new Set(paths)].slice(0, 2_000)) {
        let target;
        try {
            target = safeRelativePath(root, candidate, true);
        }
        catch {
            continue;
        }
        try {
            const stat = await fs.promises.lstat(target.absolute);
            if (stat.isSymbolicLink()) {
                rows.push({ path: target.relative, type: "symlink", target: await fs.promises.readlink(target.absolute) });
                continue;
            }
            if (!stat.isFile()) {
                rows.push({ path: target.relative, type: stat.isDirectory() ? "directory" : "other", mtimeMs: stat.mtimeMs });
                continue;
            }
            let contentChecksum = "";
            if (stat.size <= 8 * 1024 * 1024)
                contentChecksum = crypto.createHash("sha256").update(await fs.promises.readFile(target.absolute)).digest("hex");
            rows.push({ path: target.relative, type: "file", size: stat.size, mtimeMs: stat.mtimeMs, contentChecksum });
        }
        catch {
            rows.push({ path: target.relative, type: "missing" });
        }
    }
    return rows;
}
function gitStatusPaths(status) {
    const paths = [];
    for (const line of String(status || "").split(/\r?\n/).filter(Boolean)) {
        const value = line.length > 3 ? line.slice(3).trim() : "";
        const candidates = value.includes(" -> ") ? value.split(" -> ") : [value];
        for (const candidate of candidates) {
            const normalized = candidate.replace(/^"|"$/g, "");
            if (normalized)
                paths.push(normalized);
        }
    }
    return paths;
}
async function repoState(root) {
    try {
        const [head, status] = await Promise.all([
            runProcess("git", ["rev-parse", "HEAD"], root, { timeoutMs: 5_000, maxBytes: 8_192 }),
            runProcess("git", ["-c", "core.quotepath=false", "status", "--porcelain=v1"], root, { timeoutMs: 5_000, maxBytes: 32_768 }),
        ]);
        if (head.exitCode === 0 && status.exitCode === 0) {
            const dirtyPaths = gitStatusPaths(status.stdout);
            const fingerprints = await fingerprintWorkspacePaths(root, dirtyPaths);
            return { checksum: checksum({ head: head.stdout.trim(), status: status.stdout, fingerprints }), dirtyPaths: dirtyPaths.length };
        }
    }
    catch { }
    try {
        const scan = await walk(root, 3_000);
        const fingerprints = await fingerprintWorkspacePaths(root, scan.files);
        return { checksum: checksum({ fingerprints, truncated: scan.truncated }), dirtyPaths: fingerprints.length };
    }
    catch {
        return { checksum: checksum({ rootAvailable: fs.existsSync(root) }), dirtyPaths: 0 };
    }
}
function receipt(identity, repoStateChecksum, evidenceRefs, result, truncated = false) {
    return {
        schema: "ccm-readonly-analysis-receipt-v1",
        scope: identity.scope,
        scopeId: identity.scopeId,
        exactSessionId: identity.exactSessionId,
        projectId: identity.projectId,
        repoStateChecksum,
        evidenceRefs: [...new Set(evidenceRefs.map(relative).filter(Boolean))].slice(0, 1_000),
        resultChecksum: checksum(result),
        truncated,
        contentStored: false,
    };
}
function sourceFiles(files) {
    return files.filter(file => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) && !/\.(?:lock|min\.js|min\.css)$/i.test(file));
}
function importSpecifiers(file, text) {
    const rows = [];
    const patterns = [
        /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
        /\brequire\(\s*["']([^"']+)["']\s*\)/g,
        /^\s*from\s+([\w.]+)\s+import\s+/gm,
        /^\s*import\s+([\w.]+)(?:\s+as\s+\w+)?\s*$/gm,
        /^\s*import\s+([\w.*]+);/gm,
        /^\s*use\s+([\w:]+)[;{]/gm,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) && rows.length < 500)
            if (match[1])
                rows.push(match[1]);
    }
    return [...new Set(rows)].map(specifier => ({ file, specifier }));
}
function resolveLocalImport(file, specifier, fileSet) {
    if (!specifier.startsWith("."))
        return "";
    const base = relative(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
    const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".py", ".java", ".kt", ".go", ".rs"].map(ext => `${base}${ext}`), ...["index.ts", "index.tsx", "index.js", "index.jsx", "__init__.py"].map(name => `${base}/${name}`)];
    return candidates.find(candidate => fileSet.has(candidate)) || "";
}
async function dependencyGraph(root, args) {
    const scan = await walk(root, Math.max(100, Math.min(MAX_SCAN_FILES, Number(args?.max_files || 1_500))));
    const sources = sourceFiles(scan.files);
    const fileSet = new Set(sources);
    const edges = [];
    const unresolved = [];
    for (const file of sources) {
        const text = readText(root, file);
        if (!text)
            continue;
        for (const row of importSpecifiers(file, text)) {
            const resolved = resolveLocalImport(file, row.specifier, fileSet);
            if (resolved)
                edges.push({ from: file, to: resolved, kind: "local" });
            else if (row.specifier.startsWith("."))
                unresolved.push({ from: row.file, specifier: row.specifier });
            else
                edges.push({ from: file, to: row.specifier, kind: "external" });
            if (edges.length >= 4_000)
                break;
        }
        if (edges.length >= 4_000)
            break;
    }
    const local = edges.filter(edge => edge.kind === "local");
    const outgoing = new Map();
    for (const edge of local)
        outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge.to]);
    const cycles = [];
    const visiting = new Set();
    const visited = new Set();
    const stack = [];
    const visit = (node) => {
        if (cycles.length >= 50 || visited.has(node))
            return;
        if (visiting.has(node)) {
            const index = stack.indexOf(node);
            if (index >= 0)
                cycles.push([...stack.slice(index), node]);
            return;
        }
        visiting.add(node);
        stack.push(node);
        for (const next of outgoing.get(node) || [])
            visit(next);
        stack.pop();
        visiting.delete(node);
        visited.add(node);
    };
    for (const node of outgoing.keys())
        visit(node);
    const manifests = scan.files.filter(file => /(?:^|\/)(?:package\.json|pyproject\.toml|pom\.xml|build\.gradle(?:\.kts)?|go\.mod|Cargo\.toml|settings\.gradle(?:\.kts)?)$/i.test(file));
    const incoming = new Map();
    for (const edge of local)
        incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    const entrypoints = sources.filter(file => !incoming.has(file) && /(?:^|\/)(?:index|main|app|server|cli)\.[^.]+$/i.test(file)).slice(0, 100);
    return { nodes: sources.length, edges: edges.slice(0, MAX_RESULT_ITEMS), cycles, entrypoints, manifests, unresolved: unresolved.slice(0, 200), truncated: scan.truncated || edges.length >= 4_000, evidenceRefs: [...manifests, ...local.flatMap(edge => [edge.from, edge.to]), ...entrypoints] };
}
function testFile(file) {
    return /(?:^|\/)(?:tests?|__tests__|spec)(?:\/|$)|(?:\.test|\.spec|_test|Test)\.[^/]+$/i.test(file);
}
async function verificationCommands(root, files) {
    const scanFiles = files || (await walk(root, 2_000)).files;
    const packageRunner = scanFiles.some(file => /(?:^|\/)pnpm-lock\.yaml$/i.test(file)) ? "pnpm"
        : scanFiles.some(file => /(?:^|\/)yarn\.lock$/i.test(file)) ? "yarn"
            : scanFiles.some(file => /(?:^|\/)bun\.lockb$/i.test(file)) ? "bun" : "npm";
    const commands = [];
    const add = (command, source, kind, sideEffectsPossible = true) => {
        if (!commands.some(row => row.command === command))
            commands.push({ command, source, kind, requiresChildAgent: true, sideEffectsPossible });
    };
    for (const file of scanFiles) {
        const base = path.posix.basename(file);
        if (base === "package.json") {
            try {
                const parsed = JSON.parse(readText(root, file));
                for (const [name] of Object.entries(parsed?.scripts || {}))
                    if (/test|check|lint|type|build|verify|e2e/i.test(name))
                        add(`${packageRunner}${packageRunner === "yarn" || packageRunner === "bun" ? "" : " run"} ${name}`, file, /test|e2e/i.test(name) ? "test" : /build/i.test(name) ? "build" : "check");
            }
            catch { }
        }
        else if (base === "pom.xml")
            add(scanFiles.some(row => /(?:^|\/)mvnw(?:\.cmd)?$/i.test(row)) ? (process.platform === "win32" ? "mvnw.cmd test" : "./mvnw test") : "mvn test", file, "test");
        else if (/^build\.gradle(?:\.kts)?$/.test(base))
            add(scanFiles.some(row => /(?:^|\/)gradlew(?:\.bat)?$/i.test(row)) ? (process.platform === "win32" ? "gradlew.bat test" : "./gradlew test") : "gradle test", file, "test");
        else if (base === "pyproject.toml" || base === "pytest.ini")
            add("pytest", file, "test");
        else if (base === "go.mod")
            add("go test ./...", file, "test");
        else if (base === "Cargo.toml")
            add("cargo test", file, "test");
        else if (base === "Makefile" && /\btest\s*:/.test(readText(root, file)))
            add("make test", file, "test");
    }
    return { commands: commands.slice(0, 100), evidenceRefs: commands.map(row => row.source) };
}
async function relatedTests(root, args) {
    const scan = await walk(root, Math.max(100, Math.min(MAX_SCAN_FILES, Number(args?.max_files || 2_500))));
    const tests = scan.files.filter(testFile);
    const targets = [...new Set([...(Array.isArray(args?.paths) ? args.paths : []), ...(args?.path ? [args.path] : [])].map(relative).filter(Boolean))];
    const symbols = [...new Set([...(Array.isArray(args?.symbols) ? args.symbols : []), ...(args?.symbol ? [args.symbol] : [])].map(String).filter(Boolean))];
    const terms = [...new Set([...targets.map(file => path.posix.basename(file).replace(/\.[^.]+$/, "")), ...symbols].filter(term => term.length > 1))];
    const scored = tests.map(file => {
        let score = 0;
        const lower = file.toLowerCase();
        const content = terms.length ? readText(root, file) : "";
        for (const term of terms) {
            if (lower.includes(term.toLowerCase()))
                score += 8;
            if (content && content.toLowerCase().includes(term.toLowerCase()))
                score += 4;
        }
        for (const target of targets)
            if (path.posix.dirname(file) === path.posix.dirname(target))
                score += 2;
        return { path: file, score, reasons: terms.filter(term => lower.includes(term.toLowerCase()) || content.toLowerCase().includes(term.toLowerCase())).slice(0, 10) };
    }).filter(row => !terms.length || row.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    const verification = await verificationCommands(root, scan.files);
    return { tests: scored.slice(0, Math.max(1, Math.min(200, Number(args?.limit || 100)))), verificationCommands: verification.commands, completeness: scan.truncated ? "partial" : "best_effort", truncated: scan.truncated || scored.length > 200, evidenceRefs: [...scored.map(row => row.path), ...verification.evidenceRefs] };
}
async function publicContracts(root, args = {}) {
    const scan = await walk(root, Math.max(100, Math.min(MAX_SCAN_FILES, Number(args?.max_files || 2_000))));
    const requestedKinds = new Set((Array.isArray(args?.kinds) ? args.kinds : []).map(String));
    const rows = [];
    const push = (row) => { if ((!requestedKinds.size || requestedKinds.has(row.kind)) && rows.length < MAX_RESULT_ITEMS)
        rows.push(row); };
    for (const file of sourceFiles(scan.files)) {
        if (rows.length >= MAX_RESULT_ITEMS)
            break;
        const text = readText(root, file);
        if (!text)
            continue;
        const lines = text.split(/\r?\n/);
        lines.forEach((line, index) => {
            if (rows.length >= MAX_RESULT_ITEMS)
                return;
            let match = line.match(/\b(?:app|router|server)\.(get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]+)/i);
            if (match)
                push({ kind: "http_route", name: `${match[1].toUpperCase()} ${match[2]}`, path: file, line: index + 1 });
            match = line.match(/@(?:(Get|Post|Put|Patch|Delete)Mapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?["']([^"']+)/i);
            if (match)
                push({ kind: "http_route", name: `${String(match[1] || "REQUEST").toUpperCase()} ${match[2]}`, path: file, line: index + 1 });
            match = line.match(/@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)/i);
            if (match)
                push({ kind: "http_route", name: `${match[1].toUpperCase()} ${match[2]}`, path: file, line: index + 1 });
            match = line.match(/\b(?:export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)|module\.exports\s*=)\s*([\w$]*)/);
            if (match)
                push({ kind: "export", name: match[1] || "default", path: file, line: index + 1 });
            match = line.match(/\.(?:emit|publish|dispatch)\s*\(\s*["'`]([^"'`]+)/);
            if (match)
                push({ kind: "event", name: match[1], path: file, line: index + 1 });
        });
        if (/(?:^|\/)(?:migrations?|schema)(?:\/|\.|$)/i.test(file))
            push({ kind: /migration/i.test(file) ? "migration" : "schema", name: path.posix.basename(file), path: file, line: 1 });
        if (/(?:^|\/)(?:package\.json|pyproject\.toml|pom\.xml|build\.gradle(?:\.kts)?|.*config\.[^.]+)$/i.test(file))
            push({ kind: "config", name: path.posix.basename(file), path: file, line: 1 });
    }
    return { contracts: rows, completeness: scan.truncated || rows.length >= MAX_RESULT_ITEMS ? "partial" : "best_effort", truncated: scan.truncated || rows.length >= MAX_RESULT_ITEMS, evidenceRefs: rows.map(row => row.path) };
}
async function changeImpact(root, args) {
    const paths = [...new Set([...(Array.isArray(args?.paths) ? args.paths : []), ...(args?.path ? [args.path] : [])].map(relative).filter(Boolean))];
    const symbols = [...new Set([...(Array.isArray(args?.symbols) ? args.symbols : []), ...(args?.symbol ? [args.symbol] : [])].map(String).filter(Boolean))];
    if (!paths.length && !symbols.length)
        throw new Error("analyze_change_impact需要至少一个path或symbol");
    for (const file of paths)
        safeRelativePath(root, file);
    const graph = await dependencyGraph(root, { max_files: args?.max_files || 2_000 });
    const reverse = new Map();
    for (const edge of graph.edges.filter((row) => row.kind === "local"))
        reverse.set(edge.to, [...(reverse.get(edge.to) || []), edge.from]);
    const dependents = [...new Set(paths.flatMap(file => reverse.get(file) || []))];
    const tests = await relatedTests(root, { paths, symbols, max_files: args?.max_files || 2_500, limit: 100 });
    const contracts = await publicContracts(root, { max_files: args?.max_files || 2_000 });
    const targetContracts = contracts.contracts.filter(row => paths.includes(row.path) || symbols.some(symbol => row.name.includes(symbol)));
    const evidenceRefs = [...paths, ...dependents, ...tests.evidenceRefs, ...targetContracts.map(row => row.path)];
    const confidence = graph.truncated || tests.truncated ? "medium" : dependents.length || tests.tests.length ? "high" : "low";
    return { targets: { paths, symbols }, directDependents: dependents.slice(0, 300), relatedTests: tests.tests, verificationCommands: tests.verificationCommands, publicContracts: targetContracts, unresolved: graph.unresolved.slice(0, 100), confidence, truncated: graph.truncated || tests.truncated, evidenceRefs };
}
async function gitChangeEvidence(root) {
    const rows = new Set();
    for (const args of [["diff", "--name-only", "--no-ext-diff"], ["diff", "--cached", "--name-only", "--no-ext-diff"]]) {
        try {
            const result = await runProcess("git", args, root, { timeoutMs: 5_000, maxBytes: 32_768 });
            for (const file of result.stdout.split(/\r?\n/).map(relative).filter(Boolean)) {
                try {
                    rows.add(safeRelativePath(root, file, true).relative);
                }
                catch { }
            }
        }
        catch { }
    }
    return [...rows].slice(0, 500);
}
async function semanticImpactEvidence(projectId, args) {
    const symbols = [...new Set([...(Array.isArray(args?.symbols) ? args.symbols : []), ...(args?.symbol ? [args.symbol] : [])].map(String).filter(Boolean))].slice(0, 8);
    const rows = [];
    const tools = ["find_definition", "find_references", "find_incoming_calls", "find_outgoing_calls"];
    for (const symbol of symbols) {
        for (const tool of tools) {
            try {
                const result = await (0, code_intelligence_1.executeCodeIntelligenceTool)(projectId, tool, { symbol, path: args?.path, limit: 100 });
                rows.push({ symbol, tool, locations: (Array.isArray(result?.locations) ? result.locations : []).slice(0, 100).map((row) => ({ path: relative(row?.path), range: row?.range, kind: row?.kind })), state: String(result?.state || "available") });
            }
            catch (error) {
                rows.push({ symbol, tool, locations: [], state: /capability_unavailable/i.test(String(error?.message || error)) ? "capability_unavailable" : "unresolved" });
            }
        }
    }
    return rows;
}
function appendAudit(entry) {
    try {
        fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
        fs.appendFileSync(AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
    }
    catch { }
}
function tokenizeCommand(command) {
    const tokens = [];
    let current = "";
    let quote = "";
    for (let index = 0; index < command.length; index += 1) {
        const character = command[index];
        if (quote) {
            if (character === quote)
                quote = "";
            else if (character === "\\" && quote === '"' && index + 1 < command.length)
                current += command[++index];
            else
                current += character;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
        if (/\s/.test(character)) {
            if (current) {
                tokens.push(current);
                current = "";
            }
            continue;
        }
        current += character;
    }
    if (quote)
        throw new Error("命令引号不完整");
    if (current)
        tokens.push(current);
    return tokens;
}
function deniedCommand(reason) {
    const error = new Error(`只读诊断命令已拒绝：${reason}。请使用结构化只读工具，或将需要执行的工作派发给项目子 Agent。`);
    error.code = "INSPECTION_COMMAND_REJECTED";
    throw error;
}
function inspectCommand(commandText) {
    if (!commandText || commandText.length > 4_000)
        deniedCommand("命令为空或过长");
    if (/[;&|`><\r\n]/.test(commandText) || /\$\(|\$\{|%[^%]+%/.test(commandText))
        deniedCommand("包含管道、重定向、命令连接或变量展开");
    const tokens = tokenizeCommand(commandText);
    const executable = String(tokens.shift() || "").toLowerCase().replace(/\.exe$/, "");
    const args = tokens;
    if (args.some(arg => /^https?:\/\//i.test(arg) || /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(arg) || path.isAbsolute(arg) || /^[A-Za-z]:/.test(arg)))
        deniedCommand("参数包含网络地址、绝对路径或父目录穿越");
    if (args.some(arg => arg.split(/[\\/]+/).some(part => SENSITIVE.test(part))))
        deniedCommand("参数可能访问敏感文件");
    const versionOnly = new Set(["java", "go", "rustc", "cargo", "mvn", "gradle", "dotnet", "node"]);
    if (versionOnly.has(executable) && args.length === 1 && ["--version", "-version", "version"].includes(args[0]))
        return { executable, args, category: "version" };
    if (["powershell", "pwsh", "cmd", "bash", "sh", "zsh", "fish", "node", "python", "python3", "ruby", "perl", "php", "deno", "bun"].includes(executable))
        deniedCommand("禁止解释器或交互式Shell执行");
    if (executable === "rg") {
        if (args.some(arg => /^(?:--pre|--pre-glob|--path-separator|--hostname-bin|--field-context-separator|--field-match-separator|--follow|-L)$/i.test(arg)))
            deniedCommand("rg参数可能执行外部程序、跟随链接或改变输出通道");
        const protectedArgs = [...args];
        for (const pattern of ["!**/.env", "!**/.env.*", "!**/.npmrc", "!**/.pypirc", "!**/.netrc", "!**/*.{pem,p12,pfx,key,keystore,jks}", "!**/*credentials*", "!**/*secret*"])
            protectedArgs.push("--glob", pattern);
        return { executable: "rg", args: protectedArgs, category: "search" };
    }
    if (executable === "git") {
        const subcommandIndex = args.findIndex(arg => !arg.startsWith("-"));
        const subcommand = String(args[subcommandIndex] || "").toLowerCase();
        if (!new Set(["status", "diff", "log", "show", "blame", "grep", "ls-files", "rev-parse", "branch", "tag"]).has(subcommand))
            deniedCommand("Git子命令不属于只读集合");
        if (args.some(arg => /^(?:-c|--config|--exec|--output|--ext-diff|--textconv|--upload-pack|--receive-pack|-o)$/i.test(arg) || /^--output=|^--exec=|^--config=/.test(arg)))
            deniedCommand("Git参数可能执行外部程序或写入文件");
        if (subcommand === "branch") {
            const trailing = args.slice(subcommandIndex + 1);
            if (trailing.some(arg => !arg.startsWith("-") && !["--contains", "--merged", "--no-merged", "--points-at"].includes(String(trailing[trailing.indexOf(arg) - 1] || ""))))
                deniedCommand("Git branch仅允许只读列表查询");
            if (trailing.some(arg => /^(?:-d|-D|-m|-M|-c|-C|--delete|--move|--copy|--edit-description|--set-upstream-to|--unset-upstream)$/i.test(arg)))
                deniedCommand("Git branch参数可能修改仓库引用");
        }
        if (subcommand === "tag") {
            const trailing = args.slice(subcommandIndex + 1);
            if (trailing.some(arg => !arg.startsWith("-") && !["--list", "-l", "--contains", "--merged", "--no-merged", "--points-at"].includes(String(trailing[trailing.indexOf(arg) - 1] || ""))))
                deniedCommand("Git tag仅允许只读列表查询");
            if (trailing.some(arg => /^(?:-a|-s|-u|-f|-d|--annotate|--sign|--local-user|--force|--delete)$/i.test(arg)))
                deniedCommand("Git tag参数可能修改仓库引用");
        }
        const protectedArgs = [...args];
        if (["diff", "log", "show"].includes(subcommand) && !protectedArgs.includes("--no-textconv"))
            protectedArgs.splice(subcommandIndex + 1, 0, "--no-textconv", "--no-ext-diff");
        return { executable: "git", args: ["--no-pager", "-c", "credential.interactive=never", "-c", "core.quotepath=false", ...protectedArgs], category: "git" };
    }
    if (["npm", "pnpm", "yarn"].includes(executable)) {
        const joined = args.join(" ").toLowerCase();
        if (/^(?:--version|-v|version)$/.test(joined) || /^(?:ls|list)(?:\s|$)/.test(joined) || /^pkg\s+get(?:\s|$)/.test(joined))
            return { executable, args, category: "package_inventory" };
        deniedCommand("包管理器仅允许版本、依赖清单和package字段查询");
    }
    deniedCommand("可执行程序或参数无法证明为只读");
}
async function inspectionCommand(root, args, identity, signal) {
    const command = String(args?.command || "").trim();
    let inspected;
    try {
        inspected = inspectCommand(command);
    }
    catch (error) {
        appendAudit({ source: "permission_violation", category: "main_agent_inspection", scope: identity.scope, scopeId: identity.scopeId, sessionId: identity.exactSessionId, project: identity.projectId, reason: String(error?.message || error).slice(0, 500), commandChecksum: checksum(command) });
        throw error;
    }
    const before = await repoState(root);
    const started = Date.now();
    const executed = await (0, readonly_inspection_sandbox_1.runReadonlyInspectionSandbox)({
        projectId: identity.projectId,
        sourceRoot: root,
        repoStateChecksum: before.checksum,
        executable: inspected.executable,
        args: inspected.args,
        signal,
        timeoutMs: Math.min(10_000, Number(args?.timeout_ms || 10_000)),
        maxBytes: COMMAND_OUTPUT_BYTES,
    });
    executed.durationMs = Date.now() - started;
    const workspaceChanged = executed.workspaceChanged === true;
    if (workspaceChanged)
        appendAudit({ source: "permission_violation", category: "main_agent_inspection_snapshot_side_effect", scope: identity.scope, scopeId: identity.scopeId, sessionId: identity.exactSessionId, project: identity.projectId, commandChecksum: checksum(command), snapshotChecksum: executed.sandboxReceipt.snapshotChecksum });
    if (workspaceChanged) {
        BLOCKED_ANALYSIS_IDENTITIES.add(analysisIdentityKey(identity));
        const error = new Error("只读诊断命令导致工作区状态变化，已停止后续处理；CCM不会自动回滚现有文件");
        error.code = "INSPECTION_COMMAND_SIDE_EFFECT";
        error.result = { exitCode: executed.exitCode, durationMs: executed.durationMs, workspaceChanged: true };
        throw error;
    }
    return { commandCategory: inspected.category, exitCode: executed.exitCode, stdout: executed.stdout, stderr: executed.stderr, durationMs: executed.durationMs, truncated: executed.truncated, workspaceChanged: false, sandboxReceipt: executed.sandboxReceipt, evidenceRefs: [] };
}
async function gitBlame(root, args, signal) {
    const target = safeRelativePath(root, args?.path);
    const start = Math.max(1, Math.floor(Number(args?.start_line || 1)));
    const end = Math.max(start, Math.min(start + 499, Math.floor(Number(args?.end_line || start + 99))));
    const result = await runProcess("git", ["--no-pager", "-c", "core.quotepath=false", "blame", "--line-porcelain", `-L${start},${end}`, "--", target.relative], root, { signal, timeoutMs: 10_000, maxBytes: COMMAND_OUTPUT_BYTES });
    const rows = [];
    let current = null;
    for (const line of result.stdout.split(/\r?\n/)) {
        const header = line.match(/^([0-9a-f^]{7,40})\s+\d+\s+(\d+)(?:\s+\d+)?$/i);
        if (header) {
            if (current)
                rows.push(current);
            current = { commit: header[1], line: Number(header[2]), author: "", at: "" };
            continue;
        }
        if (!current)
            continue;
        if (line.startsWith("author "))
            current.author = line.slice(7).slice(0, 120);
        if (line.startsWith("author-time "))
            current.at = new Date(Number(line.slice(12)) * 1000).toISOString();
        if (line.startsWith("\t"))
            current.summary = line.slice(1, 240);
    }
    if (current)
        rows.push(current);
    return { path: target.relative, startLine: start, endLine: end, rows: rows.slice(0, 500), exitCode: result.exitCode, truncated: result.truncated || rows.length > 500, evidenceRefs: [target.relative] };
}
async function executeWorkspaceReadonlyAnalysisTool(input) {
    if (BLOCKED_ANALYSIS_IDENTITIES.has(analysisIdentityKey(input.identity))) {
        const error = new Error("当前主 Agent会话先前的诊断命令造成了工作区变化，后续高级只读工具已停止");
        error.code = "INSPECTION_SESSION_BLOCKED";
        throw error;
    }
    const state = await repoState(input.root);
    let analysisIndex = null;
    try {
        analysisIndex = (0, project_analysis_index_1.ensureProjectAnalysisIndex)({ projectId: input.identity.projectId, root: input.root });
    }
    catch {
        analysisIndex = { status: "failed", contentStored: false };
    }
    let result;
    if (input.name === "inspect_dependency_graph")
        result = { ...(await dependencyGraph(input.root, input.args)), indexedEvidence: (0, project_analysis_index_1.queryProjectAnalysisIndex)(input.identity.projectId, "dependencies") };
    else if (input.name === "find_related_tests")
        result = { ...(await relatedTests(input.root, input.args)), indexedEvidence: (0, project_analysis_index_1.queryProjectAnalysisIndex)(input.identity.projectId, "tests") };
    else if (input.name === "inspect_public_contracts")
        result = { ...(await publicContracts(input.root, input.args)), indexedEvidence: (0, project_analysis_index_1.queryProjectAnalysisIndex)(input.identity.projectId, "contracts") };
    else if (input.name === "analyze_change_impact") {
        const [base, gitChangedPaths, semanticEvidence] = await Promise.all([
            changeImpact(input.root, input.args), gitChangeEvidence(input.root), semanticImpactEvidence(input.identity.projectId, input.args),
        ]);
        const targets = new Set(base.targets?.paths || []);
        const relatedGitChanges = gitChangedPaths.filter(file => targets.has(file) || base.directDependents.includes(file));
        const semanticRefs = semanticEvidence.flatMap(row => row.locations.map(location => location.path)).filter(Boolean);
        result = { ...base, gitChangedPaths, relatedGitChanges, semanticEvidence, evidenceRefs: [...base.evidenceRefs, ...gitChangedPaths, ...semanticRefs] };
    }
    else if (input.name === "discover_verification_commands") {
        const scan = await walk(input.root, 2_000);
        const discovered = await verificationCommands(input.root, scan.files);
        result = { ...discovered, truncated: scan.truncated };
    }
    else if (input.name === "read_git_blame")
        result = await gitBlame(input.root, input.args, input.signal);
    else if (input.name === "run_inspection_command")
        result = await inspectionCommand(input.root, input.args, input.identity, input.signal);
    else
        throw new Error(`未知高级只读分析工具：${input.name}`);
    const evidenceRefs = Array.isArray(result?.evidenceRefs) ? result.evidenceRefs : [];
    const safeReceipt = receipt(input.identity, state.checksum, evidenceRefs, { ...result, stdout: result?.stdout ? checksum(result.stdout) : undefined, stderr: result?.stderr ? checksum(result.stderr) : undefined }, result?.truncated === true);
    return { project: input.identity.projectId, ...result, analysisIndex, safeReceipt, contentStored: false };
}
async function compareWorkspaceProjectContracts(input) {
    if (input.identity.scope !== "group")
        throw new Error("跨项目契约比较仅供群聊主 Agent使用");
    if (input.left.projectId === input.right.projectId)
        throw new Error("跨项目契约比较需要两个不同项目");
    const kinds = Array.isArray(input.args?.kinds) ? input.args.kinds : input.args?.contract_type ? [input.args.contract_type] : [];
    const [leftContracts, rightContracts, leftState, rightState] = await Promise.all([
        publicContracts(input.left.root, { kinds }), publicContracts(input.right.root, { kinds }), repoState(input.left.root), repoState(input.right.root),
    ]);
    const key = (row) => `${row.kind}:${row.name}`.toLowerCase();
    const leftMap = new Map(leftContracts.contracts.map(row => [key(row), row]));
    const rightMap = new Map(rightContracts.contracts.map(row => [key(row), row]));
    const shared = [...leftMap.keys()].filter(name => rightMap.has(name)).map(name => ({ contract: name, left: leftMap.get(name), right: rightMap.get(name) }));
    const onlyLeft = [...leftMap.entries()].filter(([name]) => !rightMap.has(name)).map(([, row]) => row);
    const onlyRight = [...rightMap.entries()].filter(([name]) => !leftMap.has(name)).map(([, row]) => row);
    const result = { leftProject: input.left.projectId, rightProject: input.right.projectId, shared: shared.slice(0, 300), onlyLeft: onlyLeft.slice(0, 300), onlyRight: onlyRight.slice(0, 300), completeness: leftContracts.truncated || rightContracts.truncated ? "partial" : "best_effort", truncated: leftContracts.truncated || rightContracts.truncated || shared.length > 300 || onlyLeft.length > 300 || onlyRight.length > 300 };
    const identity = { ...input.identity, projectId: input.left.projectId };
    const evidenceRefs = [...leftContracts.evidenceRefs.map(file => `${input.left.projectId}:${file}`), ...rightContracts.evidenceRefs.map(file => `${input.right.projectId}:${file}`)];
    return { ...result, safeReceipt: receipt(identity, checksum({ left: leftState.checksum, right: rightState.checksum }), evidenceRefs, result, result.truncated), contentStored: false };
}
//# sourceMappingURL=workspace-readonly-analysis.js.map