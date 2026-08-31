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
exports.CCM_DIR = exports.CCM_MIGRATION_SCHEMA = exports.DEFAULT_CCM_DIR = exports.LEGACY_CCM_DIR = void 0;
exports.ensureCcmRuntimeHomeMigrationSync = ensureCcmRuntimeHomeMigrationSync;
exports.ensureActiveRuntimePathsNormalizedSync = ensureActiveRuntimePathsNormalizedSync;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * CCM's persistent home.  The explicit environment override remains useful
 * for tests, isolated service instances and packaged deployments.
 */
exports.LEGACY_CCM_DIR = path.join(os.homedir(), ".cc-connect");
exports.DEFAULT_CCM_DIR = path.join(os.homedir(), ".ccm");
exports.CCM_MIGRATION_SCHEMA = "ccm-runtime-home-migration-v1";
const RUNTIME_PATH_MIGRATION_SCHEMA = "ccm-runtime-path-normalization-v1";
function isExcludedLegacyEntry(name) {
    const normalized = String(name || "").toLowerCase();
    // The old home also contains this checkout, developer metadata and
    // temporary E2E projects. They are source/workspace data, not CCM runtime
    // state, and must never be copied into the new runtime home.
    const nonRuntime = new Set(["ccm", ".git", ".idea", ".claude", ".agents", ".playwright-mcp"]);
    return nonRuntime.has(normalized) || normalized.startsWith("ccm-e2e-") || normalized.startsWith(".ccm.migration-");
}
function safeCountEntries(root) {
    try {
        return fs.readdirSync(root, { withFileTypes: true }).filter(entry => !isExcludedLegacyEntry(entry.name)).length;
    }
    catch {
        return 0;
    }
}
/**
 * Migrate the legacy home exactly once.  This is intentionally synchronous so
 * it can run before modules with eager storage initialization are evaluated.
 * The legacy directory is never modified or deleted.
 */
function ensureCcmRuntimeHomeMigrationSync() {
    if (process.env.CCM_TASK_STORE_DIR)
        return { status: "explicit_override", target: path.resolve(process.env.CCM_TASK_STORE_DIR) };
    const legacy = exports.LEGACY_CCM_DIR;
    const target = exports.DEFAULT_CCM_DIR;
    const marker = path.join(target, "migration-v1.json");
    if (fs.existsSync(marker))
        return { status: "already_migrated", target };
    if (!fs.existsSync(legacy))
        return { status: "legacy_missing", target };
    const existingTargetEntries = fs.existsSync(target) ? safeCountEntries(target) : 0;
    if (existingTargetEntries > 0)
        return { status: "target_requires_review", target };
    const staging = `${target}.migration-${process.pid}-${Date.now()}`;
    try {
        fs.mkdirSync(staging, { recursive: true });
        const copiedEntries = [];
        if (process.platform === "win32") {
            const result = (0, child_process_1.spawnSync)("robocopy", [legacy, staging, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NP", "/XF", "*.sock", "/XD", "ccm", "ccm-e2e-*", ".git", ".idea", ".claude", ".agents", ".playwright-mcp", ".ccm.migration-*"], { windowsHide: true, stdio: "ignore" });
            if (result.error || (result.status ?? 16) > 7)
                throw result.error || new Error(`robocopy failed with exit code ${result.status}`);
            copiedEntries.push(...fs.readdirSync(staging, { withFileTypes: true }).map(entry => entry.name));
        }
        for (const entry of process.platform === "win32" ? [] : fs.readdirSync(legacy, { withFileTypes: true })) {
            if (isExcludedLegacyEntry(entry.name))
                continue;
            const source = path.join(legacy, entry.name);
            const destination = path.join(staging, entry.name);
            fs.cpSync(source, destination, { recursive: true, force: false, errorOnExist: false });
            copiedEntries.push(entry.name);
        }
        const receipt = {
            schema: exports.CCM_MIGRATION_SCHEMA,
            version: 1,
            source: legacy,
            target,
            copiedEntryCount: copiedEntries.length,
            copiedEntries,
            completedAt: new Date().toISOString(),
            legacyPreserved: true,
            contentStored: false,
        };
        fs.writeFileSync(path.join(staging, "migration-v1.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
        fs.renameSync(staging, target);
        return { status: "migrated", target, copiedEntryCount: copiedEntries.length };
    }
    catch (error) {
        try {
            fs.rmSync(staging, { recursive: true, force: true });
        }
        catch { }
        throw error;
    }
}
function packageRootCandidates() {
    return Array.from(new Set([
        // Compiled npm payload: ccm-package/dist/core -> ccm-package.
        path.resolve(__dirname, "../.."),
        path.resolve(process.cwd(), "ccm-package"),
        path.resolve(process.cwd()),
    ]));
}
function resolvePackageRoot() {
    return packageRootCandidates().find(candidate => {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(candidate, "package.json"), "utf8"));
            return pkg?.name === "@mumulinya167/cc-web" || fs.existsSync(path.join(candidate, "dist", "server.js"));
        }
        catch {
            return false;
        }
    }) || packageRootCandidates()[0];
}
function rewriteRuntimePathValue(value, packageRoot) {
    const raw = String(value || "");
    if (!raw)
        return raw;
    const slash = raw.includes("/") && !raw.includes("\\") ? "/" : "\\";
    const normalized = raw.replace(/[\\/]+/g, "\\");
    const legacyPackage = path.join(exports.LEGACY_CCM_DIR, "ccm", "ccm-package");
    const legacySource = path.join(exports.LEGACY_CCM_DIR, "ccm");
    const lower = normalized.toLowerCase();
    const sourceSuffix = normalized.slice(legacySource.length).replace(/^\\+/, "").toLowerCase();
    const isKnownPackagePath = /^(?:ccm-package|node_modules|mcp-[^\\/]+|dist|public|bin)(?:[\\/]|$)/.test(sourceSuffix);
    const replacePrefix = (prefix, target) => {
        const prefixLower = prefix.toLowerCase();
        if (lower !== prefixLower && !lower.startsWith(`${prefixLower}\\`))
            return null;
        const suffix = normalized.slice(prefix.length).replace(/^\\+/, "");
        return suffix ? `${target}${path.sep}${suffix}` : target;
    };
    const rewritten = replacePrefix(legacyPackage, packageRoot)
        || (isKnownPackagePath ? replacePrefix(legacySource, packageRoot) : null)
        || (lower.startsWith(`${exports.LEGACY_CCM_DIR.toLowerCase()}\\ccm\\`) ? null : replacePrefix(exports.LEGACY_CCM_DIR, exports.DEFAULT_CCM_DIR));
    if (!rewritten)
        return raw;
    return slash === "/" ? rewritten.replace(/\\/g, "/") : rewritten;
}
function rewriteRuntimePathText(value, packageRoot) {
    let rewritten = String(value || "");
    const pairs = [
        [path.join(exports.LEGACY_CCM_DIR, "ccm", "ccm-package"), packageRoot],
        [path.join(exports.LEGACY_CCM_DIR, "ccm", "node_modules"), path.join(packageRoot, "node_modules")],
        [path.join(exports.LEGACY_CCM_DIR, "ccm", "mcp-feishu"), path.join(packageRoot, "mcp-feishu")],
        [exports.LEGACY_CCM_DIR, exports.DEFAULT_CCM_DIR],
    ];
    for (const [from, to] of pairs) {
        const forms = [
            [from, to],
            [from.replace(/\\/g, "/"), to.replace(/\\/g, "/")],
            [from.replace(/\\/g, "\\\\"), to.replace(/\\/g, "\\\\")],
        ];
        for (const [source, target] of forms) {
            const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            rewritten = rewritten.replace(new RegExp(escaped, "gi"), target);
        }
    }
    return rewritten;
}
function rewriteRuntimePathsDeep(value, packageRoot) {
    if (typeof value === "string") {
        const rewritten = rewriteRuntimePathValue(value, packageRoot);
        return { value: rewritten, changed: rewritten !== value };
    }
    if (Array.isArray(value)) {
        let changed = false;
        const next = value.map(item => {
            const result = rewriteRuntimePathsDeep(item, packageRoot);
            changed ||= result.changed;
            return result.value;
        });
        return { value: next, changed };
    }
    if (value && typeof value === "object") {
        let changed = false;
        const next = {};
        for (const [key, item] of Object.entries(value)) {
            const result = rewriteRuntimePathsDeep(item, packageRoot);
            changed ||= result.changed;
            next[key] = result.value;
        }
        return { value: next, changed };
    }
    return { value, changed: false };
}
function writeJsonIfChanged(file, packageRoot) {
    try {
        const source = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(source);
        const result = rewriteRuntimePathsDeep(parsed, packageRoot);
        if (!result.changed)
            return false;
        const temp = `${file}.ccm-path-${process.pid}-${Date.now()}.tmp`;
        fs.writeFileSync(temp, `${JSON.stringify(result.value, null, 2)}\n`, "utf8");
        fs.renameSync(temp, file);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Normalize only active runtime configuration snapshots. Historical logs and
 * sessions intentionally remain untouched. This is idempotent and safe to
 * run at every startup, which also repairs stores created by older releases.
 */
function ensureActiveRuntimePathsNormalizedSync() {
    if (process.env.CCM_TASK_STORE_DIR)
        return { changedFiles: [], skipped: "explicit_override" };
    const target = exports.DEFAULT_CCM_DIR;
    const packageRoot = resolvePackageRoot();
    const files = [];
    const addJsonFiles = (root) => {
        if (!fs.existsSync(root))
            return;
        const visit = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const file = path.join(dir, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
                    files.push(file);
            }
        };
        visit(root);
    };
    addJsonFiles(path.join(target, "mcp"));
    addJsonFiles(path.join(target, "agent-runtime"));
    const installations = path.join(target, "marketplace", "installations.json");
    if (fs.existsSync(installations))
        files.push(installations);
    const changedFiles = files.filter(file => writeJsonIfChanged(file, packageRoot));
    // TOML files are generated runtime snapshots. Restrict replacement to the
    // same active locations and preserve all historical logs/session content.
    const tomlFiles = [
        path.join(target, "control-bot", "config.toml"),
        path.join(target, "private", "runtime-configs"),
    ];
    for (const candidate of tomlFiles) {
        const candidates = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
            ? fs.readdirSync(candidate).filter(name => name.endsWith(".toml")).map(name => path.join(candidate, name))
            : [candidate];
        for (const file of candidates) {
            try {
                const source = fs.readFileSync(file, "utf8");
                const rewritten = rewriteRuntimePathText(source, packageRoot);
                if (rewritten !== source) {
                    fs.writeFileSync(file, rewritten, "utf8");
                    changedFiles.push(file);
                }
            }
            catch { }
        }
    }
    const marker = path.join(target, "runtime-path-migration-v1.json");
    try {
        fs.writeFileSync(marker, `${JSON.stringify({ schema: RUNTIME_PATH_MIGRATION_SCHEMA, packageRoot, changedFiles, completedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    }
    catch { }
    return { changedFiles, packageRoot };
}
// Run before exporting the path consumed by eager storage modules.
exports.CCM_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || exports.DEFAULT_CCM_DIR);
if (!process.env.CCM_TASK_STORE_DIR) {
    try {
        ensureCcmRuntimeHomeMigrationSync();
    }
    catch (error) {
        // Do not silently run against a partially migrated store.  The caller can
        // still use an explicit CCM_TASK_STORE_DIR for diagnostics/recovery.
        console.error(`[CCM] runtime data migration failed: ${String(error?.message || error)}`);
    }
    try {
        ensureActiveRuntimePathsNormalizedSync();
    }
    catch (error) {
        console.error(`[CCM] active runtime path normalization failed: ${String(error?.message || error)}`);
    }
}
//# sourceMappingURL=runtime-paths.js.map