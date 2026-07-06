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
exports.handleToolsAndMetricsApi = handleToolsAndMetricsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
const { toolManager } = require("../tool-manager");
// === 终端模拟器辅助函数 ===
function normalizeTerminalCwd(cwd) {
    const candidate = cwd && typeof cwd === "string" ? cwd : os.homedir();
    try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory())
            return candidate;
    }
    catch { }
    return os.homedir();
}
function splitTerminalCwd(output, marker) {
    const text = output || "";
    const markerIndex = text.lastIndexOf(marker);
    if (markerIndex < 0)
        return { output: text, cwd: null };
    const before = text.slice(0, markerIndex).replace(/(?:\r?\n)+$/, "");
    const after = text.slice(markerIndex + marker.length).trim();
    const firstLine = after.split(/\r?\n/)[0]?.trim() || null;
    return { output: before ? before + os.EOL : "", cwd: firstLine };
}
function runTerminalCommand(command, cwd) {
    const workDir = normalizeTerminalCwd(cwd);
    const marker = `__CCM_TERMINAL_CWD_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    const commonOptions = {
        encoding: "utf-8",
        cwd: workDir,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
        windowsHide: true
    };
    const parseResult = (stdout, stderr = "", status = 0, error = null) => {
        const parsed = splitTerminalCwd(stdout, marker);
        const stderrText = String(stderr || "").trim();
        return {
            output: parsed.output,
            cwd: parsed.cwd && fs.existsSync(parsed.cwd) ? parsed.cwd : workDir,
            error: error?.message || (status ? `Exit code: ${status}` : "") || (stderrText ? stderrText : "")
        };
    };
    if (process.platform === "win32") {
        const script = [
            "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();",
            "$OutputEncoding = [System.Text.UTF8Encoding]::new();",
            command,
            `Write-Output "${marker}$((Get-Location).ProviderPath)"`
        ].join("\n");
        const result = (0, child_process_1.spawnSync)("powershell.exe", [
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script
        ], commonOptions);
        return parseResult(result.stdout, result.stderr, result.status, result.error);
    }
    const script = `${command}\nprintf '\\n${marker}%s\\n' "$PWD"`;
    const result = (0, child_process_1.spawnSync)("bash", ["-lc", script], commonOptions);
    return parseResult(result.stdout, result.stderr, result.status, result.error);
}
// === 共享文件系统辅助函数 ===
function listSharedFiles() {
    (0, utils_1.ensureSharedDir)();
    return fs.readdirSync(utils_1.SHARED_DIR)
        .filter(f => !f.startsWith("."))
        .map(f => {
        const stat = fs.statSync(path.join(utils_1.SHARED_DIR, f));
        const ext = path.extname(f).toLowerCase();
        const type = (0, utils_1.isTextFileName)(f) ? "text" : (0, utils_1.isImageFileName)(f) ? "image" : (0, utils_1.isOoxmlFileName)(f) ? ext.slice(1) : "file";
        return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type, path: path.join(utils_1.SHARED_DIR, f) };
    })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
}
function readSharedFile(name) {
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (!filePath)
        return null;
    if (!fs.existsSync(filePath))
        return null;
    return (0, utils_1.describeFileFromPath)(filePath, path.basename(String(name)));
}
// 写入/创建共享文件
function writeSharedFile(name, content) {
    (0, utils_1.ensureSharedDir)();
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (filePath) {
        fs.writeFileSync(filePath, content);
    }
}
function saveSharedUpload(filename, buffer) {
    (0, utils_1.ensureSharedDir)();
    const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(utils_1.SHARED_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return safeName;
}
function deleteSharedFile(name) {
    const filePath = path.join(utils_1.SHARED_DIR, name);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// 物理 Customizations Skills 路径
const customSkillsPath = path.join(os.homedir(), ".gemini", "config", "skills");
function loadCustomSkills() {
    const result = [];
    if (!fs.existsSync(customSkillsPath))
        return result;
    try {
        const folders = fs.readdirSync(customSkillsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
        for (const folder of folders) {
            const folderPath = path.join(customSkillsPath, folder.name);
            const skillMdPath = path.join(folderPath, "SKILL.md");
            if (fs.existsSync(skillMdPath)) {
                const mdContent = fs.readFileSync(skillMdPath, "utf-8");
                let name = folder.name;
                let description = "";
                const fmMatch = mdContent.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
                const yamlText = fmMatch ? fmMatch[1] : mdContent.substring(0, 500);
                const nameMatch = yamlText.match(/name:\s*(.*)/);
                const descMatch = yamlText.match(/description:\s*(.*)/);
                if (nameMatch)
                    name = nameMatch[1].replace(/['"]/g, "").trim();
                if (descMatch)
                    description = descMatch[1].replace(/['"]/g, "").trim();
                result.push({
                    id: folder.name,
                    name,
                    description,
                    mdPath: skillMdPath,
                    content: mdContent
                });
            }
        }
    }
    catch (e) {
        console.error("加载物理高级技能失败:", e);
    }
    return result;
}
function handleToolsAndMetricsApi(pathname, req, res, parsed) {
    // === MCP/Skills API ===
    if (pathname === "/api/tools/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() });
        return true;
    }
    if (pathname === "/api/tools/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, args, env } = JSON.parse(body);
                toolManager.testConnection(command, env || "", args || []).then((result) => (0, utils_1.sendJson)(res, result));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/reload" && req.method === "POST") {
        toolManager.disconnect();
        toolManager.loadTools().then(() => (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() }));
        return true;
    }
    if (pathname === "/api/tools/skills/discover" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: toolManager.discoverSkills() });
        return true;
    }
    if (pathname === "/api/tools/skills/invoke" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = toolManager.invokeSkill(payload.name || payload.skill, payload.input || payload.context || "", payload.scope);
                (0, utils_1.sendJson)(res, { success: !!result.ok, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === MCP 工具管理 API ===
    if (pathname === "/api/mcp" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { tools: (0, db_1.loadMcpTools)() });
        return true;
    }
    if (pathname === "/api/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const tool = JSON.parse(body);
                if (!tool.name)
                    return (0, utils_1.sendJson)(res, { error: "名称不能为空" }, 400);
                tool.type = "mcp";
                tool.created_at = tool.created_at || new Date().toISOString();
                (0, db_1.saveMcpTool)(tool);
                (0, utils_1.sendJson)(res, { success: true, tool });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/mcp/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                (0, db_1.deleteMcpTool)(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === Skills API ===
    if (pathname === "/api/skills/customizations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: loadCustomSkills() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { skills: (0, db_1.loadSkills)() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const skill = JSON.parse(body);
                if (!skill.name)
                    return (0, utils_1.sendJson)(res, { error: "名称不能为空" }, 400);
                skill.type = "skill";
                skill.created_at = skill.created_at || new Date().toISOString();
                (0, db_1.saveSkill)(skill);
                (0, utils_1.sendJson)(res, { success: true, skill });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/skills/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                (0, db_1.deleteSkill)(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 性能监控指标 ===
    if (pathname === "/api/metrics" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, db_1.loadMetrics)());
        return true;
    }
    if (pathname === "/api/metrics/reset" && req.method === "POST") {
        (0, db_1.saveMetrics)({ agents: {}, daily: {} });
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    // === 共享上下文 API ===
    if (pathname === "/api/shared" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { files: listSharedFiles() });
        return true;
    }
    if (pathname === "/api/shared/read" && req.method === "GET") {
        const name = parsed.query.name;
        const data = readSharedFile(name);
        if (!data) {
            (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { name, ...data });
        return true;
    }
    // 下载文件
    if (pathname === "/api/shared/download" && req.method === "GET") {
        const name = parsed.query.name;
        const filePath = (0, utils_1.getSharedFilePath)(name);
        if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not Found");
            return true;
        }
        const ext = path.extname(name).toLowerCase();
        const types = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        };
        res.writeHead(200, {
            "Content-Type": types[ext] || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
        return true;
    }
    // 上传文件（multipart）
    if (pathname === "/api/shared/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (ct.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(ct);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files } = (0, utils_1.parseMultipart)(buffer, boundary);
                    const uploaded = files.map(f => saveSharedUpload(f.filename, fs.readFileSync(f.savedPath)));
                    try {
                        files.forEach(f => fs.unlinkSync(f.savedPath));
                    }
                    catch { }
                    (0, utils_1.sendJson)(res, { success: true, files: uploaded });
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            });
            return true;
        }
        (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        return true;
    }
    if (pathname === "/api/shared/write" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, content } = JSON.parse(body);
                writeSharedFile(name, content);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteSharedFile(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 原生文件夹选择 API ===
    if (pathname === "/api/filesystem/native-browse" && req.method === "GET") {
        try {
            const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = 'Select Project Directory'
        $d.ShowNewFolderButton = $true
        if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $d.SelectedPath
        }
      `.replace(/\n/g, '; ');
            const out = (0, child_process_1.execSync)(`powershell -WindowStyle Normal -Sta -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8' }).trim();
            if (out && require('fs').existsSync(out)) {
                (0, utils_1.sendJson)(res, { success: true, path: out });
            }
            else {
                (0, utils_1.sendJson)(res, { success: false, error: 'No directory selected' });
            }
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    // === 文件浏览器 API ===
    if (pathname === "/api/filesystem/browse" && req.method === "GET") {
        const dir = parsed.query.dir || os.homedir();
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
                .filter(item => !item.name.startsWith('.'))
                .map(item => ({
                name: item.name,
                path: path.join(dir, item.name),
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }))
                .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            })
                .slice(0, 100);
            (0, utils_1.sendJson)(res, { success: true, path: dir, items });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // 获取系统磁盘列表
    if (pathname === "/api/filesystem/drives" && req.method === "GET") {
        try {
            let drives = [];
            if (process.platform === 'win32') {
                for (let i = 65; i <= 90; i++) {
                    const letter = String.fromCharCode(i);
                    const drivePath = `${letter}:\\`;
                    try {
                        fs.accessSync(drivePath);
                        drives.push({ name: letter, path: drivePath });
                    }
                    catch { }
                }
            }
            else {
                drives.push({ name: '/', path: '/' });
            }
            (0, utils_1.sendJson)(res, { success: true, drives, home: os.homedir() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // === 终端 API ===
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, cwd } = JSON.parse(body);
                if (!command)
                    return (0, utils_1.sendJson)(res, { error: "命令不能为空" }, 400);
                const workDir = cwd || os.homedir();
                console.log(`[终端] 执行命令: ${command} (目录: ${workDir})`);
                try {
                    const result = runTerminalCommand(command, workDir);
                    (0, utils_1.sendJson)(res, { success: true, output: result.output, cwd: result.cwd, error: result.error || undefined });
                }
                catch (e) {
                    const text = (e.stdout || "") + (e.stderr || e.message);
                    (0, utils_1.sendJson)(res, {
                        success: true,
                        output: text,
                        cwd: workDir,
                        error: e.status ? `Exit code: ${e.status}` : e.message
                    });
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 获取当前系统信息
    if (pathname === "/api/terminal/info" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            platform: process.platform,
            home: os.homedir(),
            cwd: process.cwd(),
            user: os.userInfo().username,
            shell: process.platform === 'win32' ? 'powershell' : 'bash'
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=tools.js.map