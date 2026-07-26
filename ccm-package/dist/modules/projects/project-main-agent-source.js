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
exports.buildProjectSourceManifest = buildProjectSourceManifest;
exports.readProjectSourceEvidence = readProjectSourceEvidence;
exports.projectSourceEvidencePrompt = projectSourceEvidencePrompt;
exports.runProjectMainSourceContractSelfTest = runProjectMainSourceContractSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EXCLUDED_DIRECTORIES = new Set([
    ".git", ".idea", ".vscode", ".next", ".nuxt", ".output",
    "node_modules", "target", "dist", "build", "coverage", "vendor",
]);
const TEXT_EXTENSIONS = new Set([
    ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".gradle", ".graphql",
    ".h", ".hpp", ".html", ".java", ".js", ".json", ".jsx", ".kt", ".kts",
    ".md", ".mjs", ".properties", ".proto", ".py", ".rb", ".rs", ".scss",
    ".sh", ".sql", ".svelte", ".swift", ".toml", ".ts", ".tsx", ".vue",
    ".xml", ".yaml", ".yml",
]);
const TEXT_FILENAMES = new Set([
    "dockerfile", "makefile", "procfile", "readme", "license",
]);
const MAX_MANIFEST_FILES = 1200;
const MAX_SCAN_FILES = 5000;
const MAX_DEPTH = 8;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_SELECTED_FILES = 12;
const MAX_FILE_CHARS = 16_000;
const MAX_TOTAL_CHARS = 72_000;
function normalizeRelativePath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}
function isSensitivePath(relativePath) {
    const normalized = normalizeRelativePath(relativePath).toLowerCase();
    const base = path.posix.basename(normalized);
    return base === ".env"
        || base.startsWith(".env.")
        || /\.(?:pem|p12|pfx|key|keystore|jks)$/i.test(base)
        || /(?:^|[-_.])(?:credentials?|secrets?)(?:[-_.]|$)/i.test(base);
}
function isTextSourceFile(fileName) {
    const lower = fileName.toLowerCase();
    const extension = path.extname(lower);
    return TEXT_EXTENSIONS.has(extension) || TEXT_FILENAMES.has(lower) || lower.startsWith("readme.");
}
function safeResolvedFile(root, relativePath) {
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes(".."))
        return "";
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, ...normalized.split("/"));
    const relative = path.relative(resolvedRoot, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
        return "";
    try {
        const realRoot = fs.realpathSync(resolvedRoot);
        const realFile = fs.realpathSync(resolved);
        const realRelative = path.relative(realRoot, realFile);
        if (!realRelative || realRelative.startsWith("..") || path.isAbsolute(realRelative))
            return "";
        return realFile;
    }
    catch {
        return "";
    }
}
function redactSensitiveValues(content) {
    return content.replace(/^(\s*(?:password|passwd|secret|token|api[-_.]?key|private[-_.]?key|access[-_.]?key)\s*[:=]\s*)(.+)$/gim, "$1[REDACTED]");
}
function sourcePriority(relativePath) {
    const lower = relativePath.toLowerCase();
    const base = path.posix.basename(lower);
    if (["package.json", "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "cargo.toml", "go.mod"].includes(base))
        return 0;
    if (base.startsWith("readme") || base === "dockerfile")
        return 1;
    if (/(?:^|\/)(?:src|app|server|backend|frontend|api|lib)\//.test(lower))
        return 2;
    if (/\.(?:ts|tsx|js|jsx|java|kt|go|rs|py|vue|svelte|cs)$/.test(lower))
        return 3;
    return 4;
}
function buildProjectSourceManifest(project, workDir) {
    const root = path.resolve(workDir);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
        throw new Error("项目源码目录不存在");
    const files = [];
    const stack = [{ directory: root, depth: 0 }];
    let scanned = 0;
    while (stack.length && scanned < MAX_SCAN_FILES) {
        const current = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(current.directory, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (scanned >= MAX_SCAN_FILES)
                break;
            scanned += 1;
            if (entry.isSymbolicLink())
                continue;
            const absolute = path.join(current.directory, entry.name);
            const relative = normalizeRelativePath(path.relative(root, absolute));
            if (!relative)
                continue;
            if (entry.isDirectory()) {
                if (current.depth < MAX_DEPTH && !EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) {
                    stack.push({ directory: absolute, depth: current.depth + 1 });
                }
                continue;
            }
            if (!entry.isFile() || isSensitivePath(relative) || !isTextSourceFile(entry.name))
                continue;
            try {
                const size = fs.statSync(absolute).size;
                if (size > MAX_FILE_BYTES)
                    continue;
                files.push({ path: relative, size, extension: path.extname(entry.name).toLowerCase() });
            }
            catch { }
        }
    }
    files.sort((a, b) => sourcePriority(a.path) - sourcePriority(b.path) || a.path.localeCompare(b.path));
    const limited = files.slice(0, MAX_MANIFEST_FILES);
    const checksum = crypto.createHash("sha256").update(JSON.stringify(limited)).digest("hex");
    return {
        schema: "ccm-project-main-source-manifest-v1",
        project,
        workDir: root,
        files: limited,
        scannedFiles: scanned,
        truncated: files.length > limited.length || scanned >= MAX_SCAN_FILES,
        checksum,
    };
}
function readProjectSourceEvidence(input) {
    const allowed = new Set(input.manifest.files.map(item => item.path));
    const selected = [...new Set((input.selectedPaths || []).map(normalizeRelativePath).filter(Boolean))].slice(0, MAX_SELECTED_FILES);
    const files = [];
    const rejectedPaths = [];
    let totalChars = 0;
    let truncated = false;
    for (const relativePath of selected) {
        if (!allowed.has(relativePath)) {
            rejectedPaths.push({ path: relativePath, reason: "不在当前项目源码清单中" });
            continue;
        }
        if (isSensitivePath(relativePath)) {
            rejectedPaths.push({ path: relativePath, reason: "敏感文件禁止读取" });
            continue;
        }
        const absolute = safeResolvedFile(input.workDir, relativePath);
        if (!absolute) {
            rejectedPaths.push({ path: relativePath, reason: "路径越界或无效" });
            continue;
        }
        try {
            const stat = fs.lstatSync(absolute);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_BYTES) {
                rejectedPaths.push({ path: relativePath, reason: "文件类型或大小不允许" });
                continue;
            }
            const raw = redactSensitiveValues(fs.readFileSync(absolute, "utf8"));
            const remaining = MAX_TOTAL_CHARS - totalChars;
            if (remaining <= 0) {
                truncated = true;
                break;
            }
            const content = raw.slice(0, Math.min(MAX_FILE_CHARS, remaining));
            if (content.length < raw.length)
                truncated = true;
            totalChars += content.length;
            files.push({
                path: relativePath,
                checksum: crypto.createHash("sha256").update(raw).digest("hex"),
                chars: content.length,
                content,
            });
        }
        catch {
            rejectedPaths.push({ path: relativePath, reason: "文件读取失败" });
        }
    }
    return {
        schema: "ccm-project-main-source-evidence-v1",
        project: input.project,
        workDir: path.resolve(input.workDir),
        manifestChecksum: input.manifest.checksum,
        manifestFiles: input.manifest.files.length,
        selectedPaths: files.map(item => item.path),
        rejectedPaths,
        files,
        totalChars,
        truncated,
    };
}
function projectSourceEvidencePrompt(evidence) {
    const header = [
        "[当前项目只读源码证据]",
        `project=${evidence.project}`,
        `manifest_checksum=${evidence.manifestChecksum}`,
        `selected_paths=${evidence.selectedPaths.join(", ") || "<none>"}`,
        `total_chars=${evidence.totalChars}`,
        evidence.truncated ? "部分文件因单文件或总量门禁被截断。" : "",
    ].filter(Boolean).join("\n");
    const body = evidence.files.map(file => [
        `--- FILE ${file.path} sha256=${file.checksum} ---`,
        file.content,
        `--- END FILE ${file.path} ---`,
    ].join("\n")).join("\n\n");
    return [header, body].filter(Boolean).join("\n\n");
}
function runProjectMainSourceContractSelfTest() {
    return {
        success: true,
        limits: {
            maxManifestFiles: MAX_MANIFEST_FILES,
            maxSelectedFiles: MAX_SELECTED_FILES,
            maxFileChars: MAX_FILE_CHARS,
            maxTotalChars: MAX_TOTAL_CHARS,
        },
    };
}
//# sourceMappingURL=project-main-agent-source.js.map