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
exports.LIVE_WORKSPACE_CHANGES_SCHEMA = void 0;
exports.buildLiveWorkspaceChangesReceipt = buildLiveWorkspaceChangesReceipt;
exports.createLiveWorkspaceChangesTracker = createLiveWorkspaceChangesTracker;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
exports.LIVE_WORKSPACE_CHANGES_SCHEMA = "ccm-live-workspace-changes-v1";
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function safeRelativePath(value) {
    const normalized = String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized || normalized.includes("\0") || path.posix.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized))
        return "";
    const segments = normalized.split("/");
    if (segments.some(segment => !segment || segment === "." || segment === ".."))
        return "";
    return normalized.slice(0, 1_000);
}
function normalizedStatus(value) {
    const status = String(value || "").toLowerCase();
    if (status === "added")
        return "added";
    if (status === "deleted")
        return "deleted";
    if (status === "renamed")
        return "renamed";
    return "modified";
}
function finiteCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}
function buildLiveWorkspaceChangesReceipt(input) {
    const sourceFiles = Array.isArray(input.fileChanges?.files) ? input.fileChanges.files : [];
    const byPath = new Map();
    for (const source of sourceFiles.slice(0, 500)) {
        const relativePath = safeRelativePath(source?.path || source?.file);
        if (!relativePath)
            continue;
        const additions = finiteCount(source?.additions ?? source?.diff?.additions);
        const deletions = finiteCount(source?.deletions ?? source?.diff?.deletions);
        byPath.set(relativePath.toLowerCase(), {
            path: relativePath,
            status: normalizedStatus(source?.statusKind || source?.status || source?.statusText),
            ...(additions !== undefined ? { additions } : {}),
            ...(deletions !== undefined ? { deletions } : {}),
            diffAvailable: source?.diffAvailable === true || source?.diff?.available === true,
        });
    }
    const files = [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path, "zh-CN"));
    const additions = files.map(file => file.additions).filter((value) => value !== undefined);
    const deletions = files.map(file => file.deletions).filter((value) => value !== undefined);
    const body = {
        scope: input.identity.scope,
        scopeId: String(input.identity.scopeId || ""),
        exactSessionId: String(input.identity.exactSessionId || ""),
        turnId: String(input.identity.turnId || input.identity.anchorMessageId || ""),
        generation: Math.max(0, Number(input.identity.generation || 0)),
        attempt: Math.max(1, Number(input.identity.attempt || 1)),
        agentRunId: String(input.identity.agentRunId || ""),
        projectId: String(input.projectId || input.identity.project || ""),
        revision: Math.max(1, Number(input.revision || 1)),
        files,
        totalFiles: files.length,
        ...(additions.length === files.length && files.length ? { totalAdditions: additions.reduce((sum, value) => sum + value, 0) } : {}),
        ...(deletions.length === files.length && files.length ? { totalDeletions: deletions.reduce((sum, value) => sum + value, 0) } : {}),
    };
    return {
        schema: exports.LIVE_WORKSPACE_CHANGES_SCHEMA,
        ...body,
        ...(input.identity.taskId ? { taskId: String(input.identity.taskId) } : {}),
        checksum: checksum(body),
        contentStored: false,
    };
}
function createLiveWorkspaceChangesTracker(input) {
    const intervalMs = Math.max(500, Number(input.intervalMs || 2_000));
    let revision = 0;
    let lastPublishedFilesChecksum = checksum([]);
    let lastScanAt = 0;
    let stopped = false;
    let pending = null;
    const cachedFiles = new Map();
    const incrementalFileChanges = () => {
        const workDir = input.baseline?.workDir;
        if (!workDir)
            return { files: [], count: 0 };
        const beforeFiles = input.baseline?.files || {};
        const activePaths = new Set();
        const files = (0, utils_1.parseGitStatus)(workDir).flatMap(entry => {
            const before = beforeFiles[entry.path];
            const changedSinceBaseline = !before
                || before.statusCode !== entry.statusCode
                || before.mtimeMs !== (entry.stat?.mtimeMs || 0)
                || before.size !== (entry.stat?.size || 0);
            if (!changedSinceBaseline)
                return [];
            activePaths.add(entry.path);
            const fingerprint = `${entry.statusCode}:${entry.stat?.mtimeMs || 0}:${entry.stat?.size || 0}`;
            const cached = cachedFiles.get(entry.path);
            if (cached?.fingerprint === fingerprint)
                return [cached.file];
            const file = {
                path: entry.path,
                ...(0, utils_1.describeFileStatus)(entry.statusCode, before),
                diff: (0, utils_1.buildFileDiff)(workDir, entry.path, before),
            };
            cachedFiles.set(entry.path, { fingerprint, file });
            return [file];
        });
        for (const filePath of [...cachedFiles.keys()]) {
            if (!activePaths.has(filePath))
                cachedFiles.delete(filePath);
        }
        return { files, count: files.length };
    };
    const scan = (force = false) => {
        if (stopped && !force)
            return null;
        const now = Date.now();
        if (!force && now - lastScanAt < intervalMs)
            return null;
        lastScanAt = now;
        const changes = incrementalFileChanges();
        const filesChecksum = checksum(Array.isArray(changes.files) ? changes.files.map((file) => ({
            path: file?.path,
            status: file?.statusKind || file?.status || file?.statusText,
            additions: file?.diff?.additions,
            deletions: file?.diff?.deletions,
            diffAvailable: file?.diff?.available === true,
        })) : []);
        if (filesChecksum === lastPublishedFilesChecksum)
            return null;
        lastPublishedFilesChecksum = filesChecksum;
        const receipt = buildLiveWorkspaceChangesReceipt({
            identity: input.identity,
            projectId: input.projectId,
            revision: ++revision,
            fileChanges: changes,
        });
        input.publish(receipt);
        return receipt;
    };
    const schedule = () => {
        if (stopped || pending)
            return;
        const delay = Math.max(0, intervalMs - (Date.now() - lastScanAt));
        pending = setTimeout(() => {
            pending = null;
            scan();
        }, delay);
    };
    // Third-party runtimes do not always emit structured file events. A bounded
    // fallback scan keeps the visible projection live without changing the
    // authoritative Terminal Gate result.
    const fallback = setInterval(schedule, intervalMs);
    scan(true);
    return {
        schedule,
        flush() { return scan(true); },
        stop() {
            stopped = true;
            clearInterval(fallback);
            if (pending)
                clearTimeout(pending);
            pending = null;
        },
    };
}
//# sourceMappingURL=live-workspace-changes.js.map