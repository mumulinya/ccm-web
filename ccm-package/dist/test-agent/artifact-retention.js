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
exports.listTestAgentArtifactCatalogForTasks = listTestAgentArtifactCatalogForTasks;
exports.resolveTestAgentArtifactForTask = resolveTestAgentArtifactForTask;
exports.pruneTestAgentArtifacts = pruneTestAgentArtifacts;
exports.purgeTestAgentArtifactsForTask = purgeTestAgentArtifactsForTask;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_MAX_RUNS = 200;
const DEFAULT_MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
const RETENTION_MARKER = ".retention-last-run.json";
function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}
function isWithin(root, target) {
    const relative = path.relative(root, target);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
function directorySize(dir) {
    let total = 0;
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const file = path.join(current, entry.name);
            if (entry.isSymbolicLink())
                continue;
            if (entry.isDirectory())
                stack.push(file);
            else if (entry.isFile()) {
                try {
                    total += fs.statSync(file).size;
                }
                catch { }
            }
        }
    }
    return total;
}
function readReportTaskId(dir) {
    const file = path.join(dir, "report.json");
    try {
        const report = JSON.parse(fs.readFileSync(file, "utf-8"));
        return String(report?.taskId || report?.task_id || "");
    }
    catch {
        return "";
    }
}
function readJsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function artifactMimeType(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".png")
        return "image/png";
    if (ext === ".jpg" || ext === ".jpeg")
        return "image/jpeg";
    if (ext === ".webp")
        return "image/webp";
    if (ext === ".gif")
        return "image/gif";
    if (ext === ".svg")
        return "image/svg+xml";
    if (ext === ".json" || ext === ".har")
        return "application/json; charset=utf-8";
    if (ext === ".md" || ext === ".log" || ext === ".txt")
        return "text/plain; charset=utf-8";
    if (ext === ".html")
        return "text/html; charset=utf-8";
    if (ext === ".zip")
        return "application/zip";
    if (ext === ".csv")
        return "text/csv; charset=utf-8";
    if (ext === ".webm")
        return "video/webm";
    if (ext === ".mp4")
        return "video/mp4";
    return "application/octet-stream";
}
function artifactPreviewKind(mimeType) {
    if (mimeType.startsWith("image/"))
        return "image";
    if (mimeType.startsWith("text/") || mimeType.startsWith("application/json"))
        return "text";
    return "download";
}
function artifactId(runName, type, file) {
    return `taa_${crypto.createHash("sha256").update(`${runName}:${type}:${file}`).digest("hex").slice(0, 24)}`;
}
function safeArtifactFile(runDir, file) {
    const raw = String(file || "").trim();
    if (!raw)
        return null;
    const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(runDir, raw);
    if (!isWithin(runDir, resolved))
        return null;
    try {
        const realRun = fs.realpathSync(runDir);
        const realFile = fs.realpathSync(resolved);
        if (!isWithin(realRun, realFile) || !fs.statSync(realFile).isFile())
            return null;
        return realFile;
    }
    catch {
        return null;
    }
}
function buildArtifactCatalogRun(run, retentionDays) {
    const report = readJsonFile(path.join(run.dir, "report.json"));
    if (!report)
        return null;
    const manifest = readJsonFile(path.join(run.dir, "artifact-manifest.json"));
    const manifestItems = Array.isArray(manifest?.files) ? manifest.files : [];
    const artifacts = manifestItems.map((item) => {
        const safeFile = safeArtifactFile(run.dir, item?.path);
        const mimeType = artifactMimeType(safeFile || String(item?.path || ""));
        let size = 0;
        try {
            size = safeFile ? fs.statSync(safeFile).size : 0;
        }
        catch { }
        return {
            id: artifactId(run.name, String(item?.type || "artifact"), String(item?.path || "")),
            type: String(item?.type || "artifact"),
            title: String(item?.title || item?.type || "TestAgent evidence"),
            project: String(item?.project || ""),
            status: String(item?.status || report.status || "unknown"),
            available: !!safeFile,
            size_bytes: size,
            sha256: String(item?.integrity?.sha256 || ""),
            mime_type: mimeType,
            preview_kind: artifactPreviewKind(mimeType),
        };
    });
    const retainedUntilMs = run.mtimeMs + retentionDays * 24 * 60 * 60_000;
    return {
        run_id: String(report.id || run.name),
        task_id: String(report.taskId || report.task_id || ""),
        group_id: String(report.groupId || report.group_id || ""),
        status: String(report.status || "unknown"),
        recommendation: String(report.recommendation || ""),
        summary: String(report.summary || ""),
        started_at: String(report.startedAt || report.started_at || ""),
        finished_at: String(report.finishedAt || report.finished_at || ""),
        retained_until: new Date(retainedUntilMs).toISOString(),
        retention_status: retainedUntilMs > Date.now() ? "available" : "expired",
        artifacts,
    };
}
function listTestAgentArtifactCatalogForTasks(taskIds, options = {}) {
    const wanted = new Set((taskIds || []).map(item => String(item || "").trim()).filter(Boolean));
    const rootDir = path.resolve(options.rootDir || path.join(utils_1.CCM_DIR, "test-agent-artifacts"));
    const retentionDays = positiveNumber(options.retentionDays ?? process.env.CCM_TEST_AGENT_ARTIFACT_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
    return artifactRuns(rootDir)
        .filter(run => !wanted.size || wanted.has(run.taskId))
        .map(run => buildArtifactCatalogRun(run, retentionDays))
        .filter((run) => !!run);
}
function resolveTestAgentArtifactForTask(input) {
    const taskId = String(input.taskId || "").trim();
    const runId = String(input.runId || "").trim();
    const wantedArtifactId = String(input.artifactId || "").trim();
    if (!taskId || !runId || !wantedArtifactId)
        return null;
    const rootDir = path.resolve(input.rootDir || path.join(utils_1.CCM_DIR, "test-agent-artifacts"));
    for (const run of artifactRuns(rootDir)) {
        if (run.taskId !== taskId)
            continue;
        const report = readJsonFile(path.join(run.dir, "report.json"));
        if (String(report?.id || run.name) !== runId)
            continue;
        const manifest = readJsonFile(path.join(run.dir, "artifact-manifest.json"));
        for (const item of Array.isArray(manifest?.files) ? manifest.files : []) {
            const id = artifactId(run.name, String(item?.type || "artifact"), String(item?.path || ""));
            if (id !== wantedArtifactId)
                continue;
            const safeFile = safeArtifactFile(run.dir, item?.path);
            if (!safeFile)
                return null;
            const mimeType = artifactMimeType(safeFile);
            return {
                file_path: safeFile,
                file_name: path.basename(safeFile),
                mime_type: mimeType,
                preview_kind: artifactPreviewKind(mimeType),
            };
        }
    }
    return null;
}
function artifactRuns(rootDir) {
    if (!fs.existsSync(rootDir))
        return [];
    return fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.isSymbolicLink())
        .map(entry => {
        const dir = path.resolve(rootDir, entry.name);
        const stat = fs.statSync(dir);
        return { dir, name: entry.name, mtimeMs: stat.mtimeMs, size: directorySize(dir), taskId: readReportTaskId(dir) };
    })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
}
function shouldThrottle(rootDir, force = false) {
    if (force)
        return false;
    const marker = path.join(rootDir, RETENTION_MARKER);
    try {
        const value = JSON.parse(fs.readFileSync(marker, "utf-8"));
        return Date.now() - Date.parse(String(value?.at || "")) < 60 * 60_000;
    }
    catch {
        return false;
    }
}
function writeMarker(rootDir, result) {
    try {
        fs.writeFileSync(path.join(rootDir, RETENTION_MARKER), `${JSON.stringify({ at: new Date().toISOString(), result }, null, 2)}\n`, "utf-8");
    }
    catch { }
}
function pruneTestAgentArtifacts(options = {}) {
    const rootDir = path.resolve(options.rootDir || path.join(utils_1.CCM_DIR, "test-agent-artifacts"));
    fs.mkdirSync(rootDir, { recursive: true });
    const empty = {
        schema: "ccm-test-agent-artifact-retention-v1",
        rootDir,
        scannedRuns: 0,
        retainedRuns: 0,
        removedRuns: 0,
        removedBytes: 0,
        retainedBytes: 0,
        skipped: false,
        errors: [],
    };
    if (shouldThrottle(rootDir, options.force))
        return { ...empty, skipped: true };
    const retentionDays = positiveNumber(options.retentionDays ?? process.env.CCM_TEST_AGENT_ARTIFACT_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
    const maxRuns = Math.floor(positiveNumber(options.maxRuns ?? process.env.CCM_TEST_AGENT_ARTIFACT_MAX_RUNS, DEFAULT_MAX_RUNS));
    const maxTotalBytes = positiveNumber(options.maxTotalBytes ?? process.env.CCM_TEST_AGENT_ARTIFACT_MAX_BYTES, DEFAULT_MAX_TOTAL_BYTES);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60_000;
    const excluded = new Set((options.excludeDirs || []).map(item => path.resolve(item).toLowerCase()));
    const runs = artifactRuns(rootDir);
    let retainedBytes = runs.reduce((sum, run) => sum + run.size, 0);
    let retainedRuns = runs.length;
    const remove = (run) => {
        if (excluded.has(run.dir.toLowerCase()) || !isWithin(rootDir, run.dir))
            return false;
        try {
            fs.rmSync(run.dir, { recursive: true, force: true });
            empty.removedRuns += 1;
            empty.removedBytes += run.size;
            retainedRuns -= 1;
            retainedBytes -= run.size;
            return true;
        }
        catch (error) {
            empty.errors.push(`${run.name}: ${error.message || String(error)}`);
            return false;
        }
    };
    for (const run of [...runs].reverse()) {
        const expired = run.mtimeMs < cutoff;
        const overCount = retainedRuns > maxRuns;
        const overBytes = retainedBytes > maxTotalBytes;
        if (expired || overCount || overBytes)
            remove(run);
    }
    empty.scannedRuns = runs.length;
    empty.retainedRuns = retainedRuns;
    empty.retainedBytes = Math.max(0, retainedBytes);
    writeMarker(rootDir, empty);
    return empty;
}
function purgeTestAgentArtifactsForTask(taskId, options = {}) {
    const rootDir = path.resolve(options.rootDir || path.join(utils_1.CCM_DIR, "test-agent-artifacts"));
    const removed = [];
    const errors = [];
    for (const run of artifactRuns(rootDir)) {
        if (run.taskId !== taskId || !isWithin(rootDir, run.dir))
            continue;
        try {
            fs.rmSync(run.dir, { recursive: true, force: true });
            removed.push(run.dir);
        }
        catch (error) {
            errors.push(`${run.name}: ${error.message || String(error)}`);
        }
    }
    return { schema: "ccm-test-agent-artifact-task-purge-v1", taskId, removed, errors };
}
//# sourceMappingURL=artifact-retention.js.map