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
exports.TEST_AGENT_SURFACE_AUDIT_SCHEMA = void 0;
exports.surfaceAuditChecksum = surfaceAuditChecksum;
exports.captureTestAgentSurfaceSnapshot = captureTestAgentSurfaceSnapshot;
exports.auditTestAgentSurface = auditTestAgentSurface;
exports.readTestAgentSurfaceAudit = readTestAgentSurfaceAudit;
exports.runTestAgentSurfaceAuditSelfTest = runTestAgentSurfaceAuditSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const hardening_metrics_1 = require("./hardening-metrics");
exports.TEST_AGENT_SURFACE_AUDIT_SCHEMA = "ccm-test-agent-surface-audit-v1";
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function surfaceAuditChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}
function normalizePath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function pathKey(value) {
    return normalizePath(value).toLowerCase();
}
const DEFAULT_IGNORED_PREFIXES = [
    ".git/",
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    ".cache/",
    ".turbo/",
    ".vite/",
    ".test-agent-artifacts/",
    "test-agent-artifacts/",
    ".ccm-test-agent/",
];
function isIgnoredSurface(file, extra = []) {
    const normalized = normalizePath(file);
    const lower = normalized.toLowerCase();
    return [...DEFAULT_IGNORED_PREFIXES, ...extra.map(normalizePath)]
        .some(prefix => {
        const candidate = prefix.toLowerCase().replace(/^\.?\//, "");
        return lower === candidate.replace(/\/$/, "") || lower.startsWith(candidate.endsWith("/") ? candidate : `${candidate}/`);
    });
}
function gitOutput(workDir, args) {
    try {
        const result = (0, child_process_1.spawnSync)("git", ["-C", workDir, ...args], {
            encoding: "utf-8",
            windowsHide: true,
            timeout: 10_000,
            maxBuffer: 16 * 1024 * 1024,
        });
        return {
            ok: result.status === 0,
            stdout: String(result.stdout || ""),
            stderr: String(result.stderr || ""),
        };
    }
    catch (error) {
        return { ok: false, stdout: "", stderr: String(error?.message || error || "git unavailable") };
    }
}
function parsePorcelainZ(value) {
    const entries = [];
    const chunks = String(value || "").split("\0").filter(Boolean);
    for (const chunk of chunks) {
        if (chunk.length < 4)
            continue;
        const status = chunk.slice(0, 2);
        let file = chunk.slice(3).trim();
        // Rename/copy entries in porcelain v1 use "old -> new". The destination
        // is the file that can have side effects and is therefore what we audit.
        const arrow = file.lastIndexOf(" -> ");
        if (arrow >= 0)
            file = file.slice(arrow + 4).trim();
        file = file.replace(/^"|"$/g, "");
        if (!file)
            continue;
        entries.push({ path: normalizePath(file), state: status });
    }
    return entries;
}
function parseNameStatusZ(value) {
    const entries = [];
    const chunks = String(value || "").split("\0").filter(Boolean);
    for (let index = 0; index < chunks.length;) {
        const state = String(chunks[index++] || "").trim();
        const source = String(chunks[index++] || "").trim();
        if (!state || !source)
            continue;
        const renamed = /^[RC]/.test(state);
        const destination = renamed ? String(chunks[index++] || "").trim() : source;
        const file = normalizePath(destination || source);
        if (file)
            entries.push({ path: file, state });
    }
    return entries;
}
function captureTestAgentSurfaceSnapshot(workDir, options = {}) {
    const resolved = path.resolve(String(workDir || process.cwd()));
    const statusResult = gitOutput(resolved, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const headResult = gitOutput(resolved, ["rev-parse", "HEAD"]);
    const entries = statusResult.ok ? parsePorcelainZ(statusResult.stdout) : [];
    if (options.baselineRef && headResult.ok) {
        const diff = gitOutput(resolved, ["diff", "--name-status", "-z", `${options.baselineRef}...HEAD`]);
        if (diff.ok)
            entries.push(...parseNameStatusZ(diff.stdout));
    }
    const byPath = new Map();
    for (const item of entries) {
        const normalized = normalizePath(item.path);
        if (!normalized || isIgnoredSurface(normalized, options.ignoredPrefixes || []))
            continue;
        byPath.set(pathKey(normalized), { path: normalized, state: item.state || "??" });
    }
    const files = [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
    const core = {
        status: statusResult.ok ? "available" : "unavailable",
        gitHead: headResult.ok ? String(headResult.stdout || "").trim().slice(0, 160) : "",
        files,
    };
    return { ...core, checksum: surfaceAuditChecksum(core), capturedAt: new Date().toISOString() };
}
function stringList(value, max = 200) {
    return [...new Set((Array.isArray(value) ? value : []).map(normalizePath).filter(Boolean))].slice(0, max);
}
function criterionEntry(value, index, globalChecks) {
    const object = value && typeof value === "object" ? value : {};
    const text = typeof value === "string" ? value : object.text || object.criterion || object.description || object.title || "";
    const id = String(object.id || object.criterionId || object.criterion_id || `criterion-${index + 1}`).slice(0, 160);
    const checks = stringList(object.checkIds || object.check_ids || object.verificationIds || object.verification_ids || object.checks, 50)
        .map(item => String(item));
    const files = stringList(object.fileRefs || object.file_refs || object.changedFiles || object.changed_files || object.files, 100);
    const waiver = String(object.waiver || object.exemption || "").trim();
    return {
        criterionId: id,
        criterionChecksum: surfaceAuditChecksum(String(text || id)),
        checkIds: checks.length ? checks : globalChecks.length === 1 ? [String(globalChecks[0])] : [],
        fileRefs: files,
        waiver: waiver ? { reasonChecksum: surfaceAuditChecksum(waiver), required: true } : null,
    };
}
function auditTestAgentSurface(input) {
    const snapshot = captureTestAgentSurfaceSnapshot(input.workDir, {
        ignoredPrefixes: input.ignoredPrefixes,
        baselineRef: input.baselineRef,
    });
    const declaredFiles = stringList(input.declaredFiles, 1000);
    const declared = new Set(declaredFiles.map(pathKey));
    const actual = new Set(snapshot.files.map(item => pathKey(item.path)));
    const undeclaredChanges = snapshot.files.filter(item => !declared.has(pathKey(item.path))).map(item => item.path);
    const missingDeclaredChanges = declaredFiles.filter(file => !actual.has(pathKey(file)));
    const checkDefinitions = stringList((input.checkDefinitions || []).map((item) => item?.id || item?.checkId || item?.name || item), 200);
    const criteriaInput = input.criterionBindings?.length ? input.criterionBindings : (input.acceptanceCriteria || []);
    const criteria = (Array.isArray(criteriaInput) ? criteriaInput : []).slice(0, 200).map((item, index) => {
        const entry = criterionEntry(item, index, checkDefinitions);
        const refs = entry.fileRefs.filter(file => actual.has(pathKey(file)) || declared.has(pathKey(file)));
        const hasChecks = entry.checkIds.length > 0;
        const exemption = (input.exemptions || []).find((candidate) => String(candidate?.criterionId || candidate?.criterion_id || "") === entry.criterionId);
        const waived = !!entry.waiver || !!exemption;
        const covered = waived || (hasChecks && refs.length > 0);
        return {
            ...entry,
            fileRefs: refs,
            status: waived ? "waived" : covered ? "covered" : "uncovered",
            ...(waived ? { reason: entry.waiver?.reasonChecksum || surfaceAuditChecksum(exemption?.reason || "structured exemption") } : {}),
        };
    });
    const exemptions = criteria.filter(item => item.status === "waived").map(item => ({ criterionId: item.criterionId, reasonChecksum: String(item.reason || "") }));
    const criterionUncoveredCount = criteria.filter(item => item.status === "uncovered").length;
    const strict = input.mode !== "warn";
    const unavailable = snapshot.status !== "available";
    const status = unavailable
        ? "unavailable"
        : undeclaredChanges.length || (strict && criterionUncoveredCount)
            ? "blocked"
            : undeclaredChanges.length || criterionUncoveredCount
                ? "warn"
                : "passed";
    if (undeclaredChanges.length > 0)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_undeclared_change_total", undeclaredChanges.length);
    const core = {
        schema: exports.TEST_AGENT_SURFACE_AUDIT_SCHEMA,
        status,
        workDir: path.resolve(String(input.workDir || process.cwd())),
        capturedAt: snapshot.capturedAt,
        declaredFiles,
        actualFiles: snapshot.files,
        undeclaredChanges,
        missingDeclaredChanges,
        criteria,
        exemptions,
        actualChangeCount: snapshot.files.length,
        undeclaredChangeCount: undeclaredChanges.length,
        criterionUncoveredCount,
        canAccept: status === "passed" || (status === "warn" && !strict),
        contentStored: false,
    };
    return { ...core, checksum: surfaceAuditChecksum(core) };
}
function readTestAgentSurfaceAudit(value) {
    if (value?.schema === exports.TEST_AGENT_SURFACE_AUDIT_SCHEMA && !findSurfaceAuditBodyKeys(value))
        return value;
    const projected = auditTestAgentSurface({
        workDir: String(value?.workDir || value?.work_dir || process.cwd()),
        declaredFiles: value?.declaredFiles || value?.declared_files || [],
        acceptanceCriteria: value?.criteria || value?.acceptanceCriteria || [],
        mode: "warn",
    });
    return projected;
}
function findSurfaceAuditBodyKeys(value) {
    if (!value || typeof value !== "object")
        return false;
    if (Array.isArray(value))
        return value.some(findSurfaceAuditBodyKeys);
    return Object.entries(value).some(([key, child]) => {
        if (["content", "text", "body", "rawOutput", "stdout", "stderr", "prompt", "toolResult", "context"].includes(key))
            return true;
        return findSurfaceAuditBodyKeys(child);
    });
}
function runTestAgentSurfaceAuditSelfTest() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-surface-"));
    try {
        (0, child_process_1.spawnSync)("git", ["init"], { cwd: root, encoding: "utf8", windowsHide: true });
        fs.writeFileSync(path.join(root, "audit.txt"), "surface audit fixture\n", "utf8");
        const result = auditTestAgentSurface({
            workDir: root,
            declaredFiles: ["audit.txt"],
            acceptanceCriteria: [{ id: "criterion-1", text: "audit", checkIds: ["check-1"], fileRefs: ["audit.txt"] }],
            checkDefinitions: [{ id: "check-1" }],
            mode: "strict",
        });
        return {
            pass: result.schema === exports.TEST_AGENT_SURFACE_AUDIT_SCHEMA
                && result.status === "passed"
                && result.contentStored === false
                && !!result.checksum
                && !findSurfaceAuditBodyKeys(result),
            status: result.status,
            actualChangeCount: result.actualChangeCount,
            checksum: result.checksum,
        };
    }
    finally {
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=surface-audit.js.map