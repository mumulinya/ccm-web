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
exports.MAX_DIFF_CHARS = exports.MAX_FILE_SNAPSHOT_BYTES = exports.MAX_INLINE_FILE_CHARS = exports.OOXML_FILE_EXTENSIONS = exports.IMAGE_FILE_EXTENSIONS = exports.TEXT_FILE_EXTENSIONS = exports.PET_PID_FILE_GLOBAL = exports.PETS_FILE = exports.MUSIC_CONFIG_FILE = exports.GROUP_LOGS_FILE = exports.PROJECT_CONFIGS_FILE = exports.TEMPLATES_FILE = exports.FEISHU_CONFIG_FILE = exports.METRICS_FILE = exports.PUBLIC_DIR = exports.GROUP_LOGS_FILE_SHARED = exports.GROUP_MESSAGES_DIR = exports.GROUPS_FILE = exports.UPLOAD_DIR = exports.CRON_FILE = exports.TASKS_FILE = exports.SHARED_DIR = exports.SESSIONS_DIR = exports.LOG_DIR = exports.PID_DIR = exports.CONFIGS_DIR = exports.CCM_DIR = void 0;
exports.refreshEnvPath = refreshEnvPath;
exports.sendJson = sendJson;
exports.ensureSharedDir = ensureSharedDir;
exports.isTextFileName = isTextFileName;
exports.isImageFileName = isImageFileName;
exports.isOoxmlFileName = isOoxmlFileName;
exports.getSharedFilePath = getSharedFilePath;
exports.truncateInlineContent = truncateInlineContent;
exports.decodeXmlEntities = decodeXmlEntities;
exports.xmlToPlainText = xmlToPlainText;
exports.getZipEntries = getZipEntries;
exports.readZipEntry = readZipEntry;
exports.extractOoxmlText = extractOoxmlText;
exports.looksBinaryString = looksBinaryString;
exports.describeFileFromPath = describeFileFromPath;
exports.createSharedFileRecord = createSharedFileRecord;
exports.normalizeSharedFileRecord = normalizeSharedFileRecord;
exports.normalizeSharedFileList = normalizeSharedFileList;
exports.buildFilesContext = buildFilesContext;
exports.buildUploadedFilesContext = buildUploadedFilesContext;
exports.summarizeUploadedFiles = summarizeUploadedFiles;
exports.getMultipartBoundary = getMultipartBoundary;
exports.collectRequestBuffer = collectRequestBuffer;
exports.parseMultipart = parseMultipart;
exports.getWorkDirForProject = getWorkDirForProject;
exports.parseGitStatus = parseGitStatus;
exports.isLikelyTextBuffer = isLikelyTextBuffer;
exports.readWorkingFileText = readWorkingFileText;
exports.readHeadFileText = readHeadFileText;
exports.createUnifiedDiff = createUnifiedDiff;
exports.buildFileDiff = buildFileDiff;
exports.createFileChangeSnapshot = createFileChangeSnapshot;
exports.getFileChanges = getFileChanges;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const zlib = __importStar(require("zlib"));
const child_process_1 = require("child_process");
const db_1 = require("./db");
// === 动态从注册表中读取最新的 Windows PATH 环境变量 ===
function refreshEnvPath() {
    if (process.platform !== "win32")
        return;
    try {
        const { execSync } = require("child_process");
        let userPath = "";
        let sysPath = "";
        try {
            const hkcu = execSync('reg query "HKCU\\Environment" /v Path', { encoding: "utf8" });
            const matchHkcu = hkcu.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.*)/i);
            userPath = matchHkcu ? matchHkcu[1].trim() : "";
        }
        catch (e) { }
        try {
            const hklm = execSync('reg query "HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path', { encoding: "utf8" });
            const matchHklm = hklm.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.*)/i);
            sysPath = matchHklm ? matchHklm[1].trim() : "";
        }
        catch (e) { }
        const expandPath = (p) => {
            return p.replace(/%([^%]+)%/g, (_, name) => process.env[name] || "");
        };
        userPath = expandPath(userPath);
        sysPath = expandPath(sysPath);
        const paths = new Set();
        (process.env.PATH || "").split(path.delimiter).forEach(p => { if (p)
            paths.add(path.resolve(p.trim())); });
        userPath.split(";").forEach(p => { if (p)
            paths.add(path.resolve(p.trim())); });
        sysPath.split(";").forEach(p => { if (p)
            paths.add(path.resolve(p.trim())); });
        const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\admin", "AppData\\Local");
        const wingetPackagesDir = path.join(localAppData, "Microsoft\\WinGet\\Packages");
        if (fs.existsSync(wingetPackagesDir)) {
            try {
                const dirs = fs.readdirSync(wingetPackagesDir);
                for (const dir of dirs) {
                    if (dir.includes("yt-dlp.yt-dlp")) {
                        paths.add(path.resolve(path.join(wingetPackagesDir, dir)));
                    }
                    else if (dir.includes("yt-dlp.FFmpeg")) {
                        const ffmpegBin = path.join(wingetPackagesDir, dir, "ffmpeg-N-124716-g054dffd133-win64-gpl", "bin");
                        if (fs.existsSync(ffmpegBin)) {
                            paths.add(path.resolve(ffmpegBin));
                        }
                        else {
                            const subDirs = fs.readdirSync(path.join(wingetPackagesDir, dir));
                            for (const sub of subDirs) {
                                const checkBin = path.join(wingetPackagesDir, dir, sub, "bin");
                                if (fs.existsSync(checkBin))
                                    paths.add(path.resolve(checkBin));
                            }
                        }
                    }
                }
            }
            catch (e) { }
        }
        process.env.PATH = Array.from(paths).join(path.delimiter);
    }
    catch (e) {
        console.error("刷新 Windows PATH 失败:", e.message);
    }
}
exports.CCM_DIR = path.join(os.homedir(), ".cc-connect");
exports.CONFIGS_DIR = path.join(exports.CCM_DIR, "configs");
exports.PID_DIR = path.join(exports.CCM_DIR, "pids");
exports.LOG_DIR = path.join(exports.CCM_DIR, "logs");
exports.SESSIONS_DIR = path.join(exports.CCM_DIR, "sessions");
exports.SHARED_DIR = path.join(exports.CCM_DIR, "shared");
exports.TASKS_FILE = path.join(exports.CCM_DIR, "tasks.json");
exports.CRON_FILE = path.join(exports.CCM_DIR, "cron-jobs.json");
exports.UPLOAD_DIR = path.join(exports.CCM_DIR, "uploads");
exports.GROUPS_FILE = path.join(exports.CCM_DIR, "groups.json");
exports.GROUP_MESSAGES_DIR = path.join(exports.CCM_DIR, "group-messages");
exports.GROUP_LOGS_FILE_SHARED = path.join(exports.CCM_DIR, "group-logs.json");
exports.PUBLIC_DIR = path.resolve(__dirname, "..", "public");
// 业务级别配置文件路径
exports.METRICS_FILE = path.join(exports.CCM_DIR, "metrics.json");
exports.FEISHU_CONFIG_FILE = path.join(exports.CCM_DIR, "feishu-config.json");
exports.TEMPLATES_FILE = path.join(exports.CCM_DIR, "prompt-templates.json");
exports.PROJECT_CONFIGS_FILE = path.join(exports.CCM_DIR, "project-configs.json");
exports.GROUP_LOGS_FILE = path.join(exports.CCM_DIR, "group-logs.json");
exports.MUSIC_CONFIG_FILE = path.join(exports.CCM_DIR, "music-config.json");
exports.PETS_FILE = path.join(exports.CCM_DIR, "pets.json");
exports.PET_PID_FILE_GLOBAL = path.join(exports.PID_DIR, "pet.pid");
// 底层公共发送方法
function sendJson(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
    return true;
}
// === 新增：文件分类和折叠限制常量 ===
exports.TEXT_FILE_EXTENSIONS = [
    ".md", ".txt", ".json", ".csv", ".yaml", ".yml", ".toml", ".xml", ".html",
    ".css", ".js", ".jsx", ".ts", ".tsx", ".vue", ".log", ".py", ".java", ".go",
    ".rs", ".c", ".cpp", ".h", ".hpp", ".sh", ".bat", ".ps1", ".ini", ".conf",
    ".env", ".sql", ".php", ".rb", ".swift", ".kt"
];
exports.IMAGE_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
exports.OOXML_FILE_EXTENSIONS = [".docx", ".pptx", ".xlsx"];
exports.MAX_INLINE_FILE_CHARS = 20000;
exports.MAX_FILE_SNAPSHOT_BYTES = 512 * 1024;
exports.MAX_DIFF_CHARS = 60000;
// === 新增：文件类型验证与路径匹配 ===
function ensureSharedDir() {
    if (!fs.existsSync(exports.SHARED_DIR))
        fs.mkdirSync(exports.SHARED_DIR, { recursive: true });
}
function isTextFileName(name) {
    return exports.TEXT_FILE_EXTENSIONS.includes(path.extname(String(name || "")).toLowerCase());
}
function isImageFileName(name) {
    return exports.IMAGE_FILE_EXTENSIONS.includes(path.extname(String(name || "")).toLowerCase());
}
function isOoxmlFileName(name) {
    return exports.OOXML_FILE_EXTENSIONS.includes(path.extname(String(name || "")).toLowerCase());
}
function getSharedFilePath(name) {
    if (!name)
        return "";
    const safeName = path.basename(String(name));
    return path.join(exports.SHARED_DIR, safeName);
}
function truncateInlineContent(content, maxChars = exports.MAX_INLINE_FILE_CHARS) {
    const text = String(content || "");
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, maxChars)}\n\n[内容过长，已截断，原始文件可按路径继续读取]`;
}
// === 新增：OOXML 解压及 XML 纯文本解析 ===
function decodeXmlEntities(text) {
    return String(text || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}
function xmlToPlainText(xml) {
    return decodeXmlEntities(String(xml || "")
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<\/a:p>/g, "\n")
        .replace(/<[^>]+>/g, ""))
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function getZipEntries(buffer) {
    const entries = [];
    if (!Buffer.isBuffer(buffer) || buffer.length < 22)
        return entries;
    let eocd = -1;
    const min = Math.max(0, buffer.length - 65557);
    for (let i = buffer.length - 22; i >= min; i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0)
        return entries;
    const totalEntries = buffer.readUInt16LE(eocd + 10);
    const centralDirOffset = buffer.readUInt32LE(eocd + 16);
    let offset = centralDirOffset;
    for (let i = 0; i < totalEntries && offset + 46 <= buffer.length; i++) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50)
            break;
        const method = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const fileNameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localHeaderOffset = buffer.readUInt32LE(offset + 42);
        const nameStart = offset + 46;
        const name = buffer.slice(nameStart, nameStart + fileNameLength).toString("utf-8");
        entries.push({ name, method, compressedSize, localHeaderOffset });
        offset = nameStart + fileNameLength + extraLength + commentLength;
    }
    return entries;
}
function readZipEntry(buffer, entry) {
    const offset = entry.localHeaderOffset;
    if (offset < 0 || offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50)
        return null;
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataStart < 0 || dataEnd > buffer.length)
        return null;
    const data = buffer.slice(dataStart, dataEnd);
    if (entry.method === 0)
        return data;
    if (entry.method === 8)
        return zlib.inflateRawSync(data);
    return null;
}
function extractOoxmlText(filePath, name) {
    try {
        const buffer = fs.readFileSync(filePath);
        const entries = getZipEntries(buffer);
        const ext = path.extname(name).toLowerCase();
        let targets = [];
        if (ext === ".docx") {
            targets = entries.filter(e => e.name === "word/document.xml");
        }
        else if (ext === ".pptx") {
            targets = entries.filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name));
        }
        else if (ext === ".xlsx") {
            targets = entries.filter(e => e.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name));
        }
        const parts = [];
        for (const entry of targets) {
            const content = readZipEntry(buffer, entry);
            if (!content)
                continue;
            const text = xmlToPlainText(content.toString("utf-8"));
            if (text)
                parts.push(text);
        }
        return parts.join("\n\n").trim();
    }
    catch {
        return "";
    }
}
function looksBinaryString(content) {
    const text = String(content || "");
    return text.startsWith("PK\u0003\u0004") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text.slice(0, 2000));
}
// === 新增：文件状态、附件描述和共享配置转换 ===
function describeFileFromPath(filePath, name, maxChars = exports.MAX_INLINE_FILE_CHARS) {
    if (!filePath || !fs.existsSync(filePath))
        return null;
    const stat = fs.statSync(filePath);
    const ext = path.extname(name).toLowerCase();
    if (isTextFileName(name)) {
        return {
            name,
            type: "text",
            readable: true,
            size: stat.size,
            path: filePath,
            content: truncateInlineContent(fs.readFileSync(filePath, "utf-8"), maxChars),
        };
    }
    if (isOoxmlFileName(name)) {
        const content = extractOoxmlText(filePath, name);
        return {
            name,
            type: ext.slice(1) || "document",
            readable: !!content,
            size: stat.size,
            path: filePath,
            content: content ? truncateInlineContent(content, maxChars) : "",
        };
    }
    if (isImageFileName(name)) {
        return { name, type: "image", readable: false, size: stat.size, path: filePath };
    }
    return { name, type: ext ? ext.slice(1) : "file", readable: false, size: stat.size, path: filePath };
}
function createSharedFileRecord(name, source = "global") {
    const filePath = getSharedFilePath(name);
    if (!filePath)
        return null;
    const described = describeFileFromPath(filePath, path.basename(String(name || "")));
    if (!described)
        return null;
    const now = new Date().toISOString();
    return {
        ...described,
        source,
        created_at: now,
        updated_at: now,
    };
}
function normalizeSharedFileRecord(file) {
    if (!file || !file.name)
        return file;
    const existingPath = file.path && fs.existsSync(file.path) ? file.path : getSharedFilePath(file.name);
    const hasDiskFile = existingPath && fs.existsSync(existingPath);
    const shouldReload = hasDiskFile && (!file.content || looksBinaryString(file.content) || !isTextFileName(file.name));
    if (shouldReload && existingPath) {
        const described = describeFileFromPath(existingPath, file.name);
        if (described) {
            return {
                ...file,
                ...described,
                created_at: file.created_at || new Date().toISOString(),
                updated_at: file.updated_at || new Date().toISOString(),
            };
        }
    }
    if (file.content && isTextFileName(file.name)) {
        return { ...file, type: file.type || "text", readable: true };
    }
    return file;
}
function normalizeSharedFileList(files) {
    return (files || []).map(normalizeSharedFileRecord).filter(Boolean);
}
function buildFilesContext(files, title = "以下是共享文件：") {
    const normalized = normalizeSharedFileList(files);
    if (!normalized.length)
        return "";
    const readable = normalized.filter(f => f.content && f.readable !== false);
    const pathOnly = normalized.filter(f => !f.content || f.readable === false);
    const sections = [`\n\n${title}`];
    if (readable.length > 0) {
        sections.push("[可直接读取的文件内容]");
        sections.push(readable.map(f => {
            const meta = [f.type ? `类型: ${f.type}` : "", f.path ? `路径: ${f.path}` : ""].filter(Boolean).join("；");
            return `\n--- ${f.name}${meta ? `（${meta}）` : ""} ---\n${truncateInlineContent(f.content)}`;
        }).join("\n"));
    }
    if (pathOnly.length > 0) {
        sections.push("[需按路径读取或分析的文件]");
        sections.push(pathOnly.map(f => {
            const bits = [`- ${f.name}`];
            if (f.type)
                bits.push(`类型: ${f.type}`);
            if (typeof f.size === "number")
                bits.push(`大小: ${f.size} bytes`);
            if (f.path)
                bits.push(`路径: ${f.path}`);
            return `${bits.join("；")}。如需 analysis，请直接读取这个绝对路径，不要只根据文件名猜测内容。`;
        }).join("\n"));
    }
    return sections.join("\n");
}
function buildUploadedFilesContext(files, title = "本次消息附件") {
    const records = (files || []).map(f => describeFileFromPath(f.savedPath || f.path, f.filename || f.name)).filter(Boolean);
    return buildFilesContext(records, title);
}
function summarizeUploadedFiles(files) {
    if (!files || files.length === 0)
        return "";
    return files.map(f => `- ${f.filename || f.name}（${f.size || 0} bytes）`).join("\n");
}
// === 新增：Multipart 表单和请求流工具 ===
function getMultipartBoundary(contentType) {
    const match = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return match ? (match[1] || match[2]).trim() : "";
}
function collectRequestBuffer(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}
function parseMultipart(buffer, boundary) {
    const files = [];
    const fields = {};
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length + 2;
    while (true) {
        const end = buffer.indexOf(boundaryBuf, start);
        if (end === -1)
            break;
        parts.push(buffer.slice(start, end - 2));
        start = end + boundaryBuf.length + 2;
    }
    for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1)
            continue;
        const headerStr = part.slice(0, headerEnd).toString("utf-8");
        const body = part.slice(headerEnd + 4);
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        if (filenameMatch && nameMatch) {
            const name = nameMatch[1];
            const filename = filenameMatch[1];
            const ext = path.extname(filename);
            const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
            const filePath = path.join(exports.UPLOAD_DIR, safeName);
            if (!fs.existsSync(exports.UPLOAD_DIR)) {
                fs.mkdirSync(exports.UPLOAD_DIR, { recursive: true });
            }
            fs.writeFileSync(filePath, body);
            files.push({ field: name, filename, savedPath: filePath, size: body.length });
        }
        else if (nameMatch) {
            fields[nameMatch[1]] = body.toString("utf-8");
        }
    }
    return { files, fields };
}
// === 新增：Git 文件比对及快照工具 ===
function getWorkDirForProject(projectName) {
    const configs = (0, db_1.getConfigs)();
    const config = configs.find(c => c.name === projectName);
    if (!config)
        return null;
    const info = (0, db_1.getConfigInfo)(config.path);
    return info[0]?.workDir || null;
}
function parseGitStatus(workDir) {
    try {
        const status = (0, child_process_1.execFileSync)("git", ["-c", "core.quotepath=false", "status", "--porcelain"], {
            encoding: "utf-8", cwd: workDir, timeout: 5000,
            stdio: ["pipe", "pipe", "pipe"]
        }).trim();
        if (!status)
            return [];
        return status.split("\n").filter(Boolean).map(line => {
            const statusCode = line.substring(0, 2);
            const rawPath = line.substring(3).trim();
            const filePath = rawPath.includes(" -> ") ? (rawPath.split(" -> ").pop() || rawPath) : rawPath;
            let stat = null;
            try {
                const absPath = path.join(workDir, filePath);
                if (fs.existsSync(absPath)) {
                    const s = fs.statSync(absPath);
                    stat = { mtimeMs: s.mtimeMs, size: s.size };
                }
            }
            catch { }
            return { path: filePath, statusCode, stat };
        });
    }
    catch {
        return [];
    }
}
function isLikelyTextBuffer(buffer) {
    if (!Buffer.isBuffer(buffer))
        return false;
    if (buffer.length === 0)
        return true;
    const sample = buffer.slice(0, Math.min(buffer.length, 4096));
    return sample.indexOf(0) === -1;
}
function readWorkingFileText(workDir, filePath) {
    try {
        const absPath = path.join(workDir, filePath);
        if (!fs.existsSync(absPath))
            return { exists: false, text: "", binary: false, tooLarge: false };
        const stat = fs.statSync(absPath);
        if (stat.size > exports.MAX_FILE_SNAPSHOT_BYTES)
            return { exists: true, text: "", binary: false, tooLarge: true };
        const buffer = fs.readFileSync(absPath);
        if (!isLikelyTextBuffer(buffer))
            return { exists: true, text: "", binary: true, tooLarge: false };
        return { exists: true, text: buffer.toString("utf-8"), binary: false, tooLarge: false };
    }
    catch {
        return { exists: false, text: "", binary: false, tooLarge: false };
    }
}
function readHeadFileText(workDir, filePath) {
    try {
        const buffer = (0, child_process_1.execFileSync)("git", ["show", `HEAD:${filePath}`], {
            cwd: workDir,
            timeout: 5000,
            maxBuffer: exports.MAX_FILE_SNAPSHOT_BYTES + 1024,
            stdio: ["pipe", "pipe", "pipe"]
        });
        if (buffer.length > exports.MAX_FILE_SNAPSHOT_BYTES)
            return { exists: true, text: "", binary: false, tooLarge: true };
        if (!isLikelyTextBuffer(buffer))
            return { exists: true, text: "", binary: true, tooLarge: false };
        return { exists: true, text: buffer.toString("utf-8"), binary: false, tooLarge: false };
    }
    catch {
        return { exists: false, text: "", binary: false, tooLarge: false };
    }
}
function createUnifiedDiff(oldText, newText, filePath, contextSize = 3) {
    if (oldText === newText)
        return "";
    const oldLines = String(oldText || "").replace(/\r\n/g, "\n").split("\n");
    const newLines = String(newText || "").replace(/\r\n/g, "\n").split("\n");
    if (oldLines.length && oldLines[oldLines.length - 1] === "")
        oldLines.pop();
    if (newLines.length && newLines[newLines.length - 1] === "")
        newLines.pop();
    const n = oldLines.length;
    const m = newLines.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const ops = [];
    let i = 0, j = 0;
    while (i < n || j < m) {
        if (i < n && j < m && oldLines[i] === newLines[j]) {
            ops.push({ type: "context", text: oldLines[i], oldLine: i + 1, newLine: j + 1 });
            i++;
            j++;
        }
        else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
            ops.push({ type: "add", text: newLines[j], oldLine: null, newLine: j + 1 });
            j++;
        }
        else {
            ops.push({ type: "remove", text: oldLines[i], oldLine: i + 1, newLine: null });
            i++;
        }
    }
    const keep = new Set();
    ops.forEach((op, idx) => {
        if (op.type !== "context") {
            for (let k = Math.max(0, idx - contextSize); k <= Math.min(ops.length - 1, idx + contextSize); k++)
                keep.add(k);
        }
    });
    const lines = [`--- a/${filePath}`, `+++ b/${filePath}`];
    let skipped = false;
    for (let idx = 0; idx < ops.length; idx++) {
        if (!keep.has(idx)) {
            if (!skipped) {
                lines.push("@@ ... @@");
                skipped = true;
            }
            continue;
        }
        skipped = false;
        const op = ops[idx];
        const prefix = op.type === "add" ? "+" : op.type === "remove" ? "-" : " ";
        lines.push(`${prefix}${op.text}`);
    }
    let diff = lines.join("\n");
    if (diff.length > exports.MAX_DIFF_CHARS) {
        diff = `${diff.slice(0, exports.MAX_DIFF_CHARS)}\n\n[diff 过长，已截断]`;
    }
    return diff;
}
function buildFileDiff(workDir, filePath, before) {
    const beforeState = before?.contentSnapshot || readHeadFileText(workDir, filePath);
    const afterState = readWorkingFileText(workDir, filePath);
    if (beforeState?.tooLarge || afterState?.tooLarge) {
        return { available: false, reason: "文件过大，已跳过文本对比" };
    }
    if (beforeState?.binary || afterState?.binary) {
        return { available: false, reason: "二进制文件无法做文本对比" };
    }
    const beforeText = beforeState?.exists ? beforeState.text : "";
    const afterText = afterState.exists ? afterState.text : "";
    const diff = createUnifiedDiff(beforeText, afterText, filePath);
    return {
        available: !!diff,
        beforeExists: !!beforeState?.exists,
        afterExists: !!afterState.exists,
        diff,
        additions: diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++")).length,
        deletions: diff.split("\n").filter(line => line.startsWith("-") && !line.startsWith("---")).length,
    };
}
function createFileChangeSnapshot(workDir) {
    try {
        const files = {};
        for (const entry of parseGitStatus(workDir)) {
            files[entry.path] = {
                statusCode: entry.statusCode,
                mtimeMs: entry.stat?.mtimeMs || 0,
                size: entry.stat?.size || 0,
                contentSnapshot: readWorkingFileText(workDir, entry.path),
            };
        }
        return { workDir, files };
    }
    catch {
        return { workDir, files: {} };
    }
}
function getFileChanges(projectName, beforeSnapshot = null) {
    try {
        const workDir = beforeSnapshot?.workDir || getWorkDirForProject(projectName);
        if (!workDir)
            return null;
        const beforeFiles = beforeSnapshot?.files || null;
        const files = parseGitStatus(workDir)
            .filter(entry => {
            if (!beforeFiles)
                return true;
            const before = beforeFiles[entry.path];
            if (!before)
                return true;
            return before.statusCode !== entry.statusCode
                || before.mtimeMs !== (entry.stat?.mtimeMs || 0)
                || before.size !== (entry.stat?.size || 0);
        })
            .map(entry => ({ path: entry.path, ...describeFileStatus(entry.statusCode) }));
        for (const file of files) {
            const before = beforeFiles ? beforeFiles[file.path] : null;
            file.diff = buildFileDiff(workDir, file.path, before);
        }
        return { files, count: files.length };
    }
    catch (e) {
        console.warn('[getFileChanges]', e.message);
        return null;
    }
}
function describeFileStatus(statusCode) {
    const code = String(statusCode || "").trim();
    if (code.includes("A") || code === "??")
        return { statusText: "新增", statusColor: "#22c55e" };
    if (code.includes("D"))
        return { statusText: "删除", statusColor: "#ef4444" };
    if (code.includes("R"))
        return { statusText: "重命名", statusColor: "#38bdf8" };
    if (code.includes("C"))
        return { statusText: "复制", statusColor: "#a78bfa" };
    return { statusText: "修改", statusColor: "#facc15" };
}
//# sourceMappingURL=utils.js.map