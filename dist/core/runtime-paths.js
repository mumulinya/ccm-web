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
}
//# sourceMappingURL=runtime-paths.js.map