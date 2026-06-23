import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync, execSync } from "child_process";
import {
  sendJson,
  SHARED_DIR,
  ensureSharedDir,
  getSharedFilePath,
  describeFileFromPath,
  isTextFileName,
  isImageFileName,
  isOoxmlFileName,
  getMultipartBoundary,
  parseMultipart
} from "../utils";
import {
  loadMetrics,
  saveMetrics,
  loadMcpTools,
  saveMcpTool,
  deleteMcpTool,
  loadSkills,
  saveSkill,
  deleteSkill
} from "../db";
const { toolManager } = require("../tool-manager");

// === 终端模拟器辅助函数 ===
function normalizeTerminalCwd(cwd: string) {
  const candidate = cwd && typeof cwd === "string" ? cwd : os.homedir();
  try {
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) return candidate;
  } catch {}
  return os.homedir();
}

function splitTerminalCwd(output: string, marker: string) {
  const text = output || "";
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex < 0) return { output: text, cwd: null };

  const before = text.slice(0, markerIndex).replace(/(?:\r?\n)+$/, "");
  const after = text.slice(markerIndex + marker.length).trim();
  const firstLine = after.split(/\r?\n/)[0]?.trim() || null;
  return { output: before ? before + os.EOL : "", cwd: firstLine };
}

function runTerminalCommand(command: string, cwd: string) {
  const workDir = normalizeTerminalCwd(cwd);
  const marker = `__CCM_TERMINAL_CWD_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
  const commonOptions = {
    encoding: "utf-8" as const,
    cwd: workDir,
    timeout: 30000,
    maxBuffer: 5 * 1024 * 1024,
    windowsHide: true
  };

  const parseResult = (stdout: string, stderr = "", status = 0, error: any = null) => {
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
    const result = spawnSync("powershell.exe", [
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
  const result = spawnSync("bash", ["-lc", script], commonOptions);
  return parseResult(result.stdout, result.stderr, result.status, result.error);
}

// === 共享文件系统辅助函数 ===
function listSharedFiles() {
  ensureSharedDir();
  return fs.readdirSync(SHARED_DIR)
    .filter(f => !f.startsWith("."))
    .map(f => {
      const stat = fs.statSync(path.join(SHARED_DIR, f));
      const ext = path.extname(f).toLowerCase();
      const type = isTextFileName(f) ? "text" : isImageFileName(f) ? "image" : isOoxmlFileName(f) ? ext.slice(1) : "file";
      return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type, path: path.join(SHARED_DIR, f) };
    })
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
}

function readSharedFile(name: string) {
  const filePath = getSharedFilePath(name);
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  return describeFileFromPath(filePath, path.basename(String(name)));
}

// 写入/创建共享文件
function writeSharedFile(name: string, content: string) {
  ensureSharedDir();
  const filePath = getSharedFilePath(name);
  if (filePath) {
    fs.writeFileSync(filePath, content);
  }
}

function saveSharedUpload(filename: string, buffer: Buffer) {
  ensureSharedDir();
  const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
  const filePath = path.join(SHARED_DIR, safeName);
  fs.writeFileSync(filePath, buffer);
  return safeName;
}

function deleteSharedFile(name: string) {
  const filePath = path.join(SHARED_DIR, name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// 物理 Customizations Skills 路径
const customSkillsPath = path.join(os.homedir(), ".gemini", "config", "skills");

function loadCustomSkills() {
  const result: any[] = [];
  if (!fs.existsSync(customSkillsPath)) return result;

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
        if (nameMatch) name = nameMatch[1].replace(/['"]/g, "").trim();
        if (descMatch) description = descMatch[1].replace(/['"]/g, "").trim();

        result.push({
          id: folder.name,
          name,
          description,
          mdPath: skillMdPath,
          content: mdContent
        });
      }
    }
  } catch (e) {
    console.error("加载物理高级技能失败:", e);
  }
  return result;
}

export function handleToolsAndMetricsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  // === MCP/Skills API ===
  if (pathname === "/api/tools/status" && req.method === "GET") {
    sendJson(res, { success: true, ...toolManager.getToolList() });
    return true;
  }

  if (pathname === "/api/tools/test" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { command, args, env } = JSON.parse(body);
        toolManager.testConnection(command, env || "", args || []).then((result: any) => sendJson(res, result));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tools/reload" && req.method === "POST") {
    toolManager.disconnect();
    toolManager.loadTools().then(() => sendJson(res, { success: true, ...toolManager.getToolList() }));
    return true;
  }

  // === MCP 工具管理 API ===
  if (pathname === "/api/mcp" && req.method === "GET") {
    sendJson(res, { tools: loadMcpTools() });
    return true;
  }

  if (pathname === "/api/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const tool = JSON.parse(body);
        if (!tool.name) return sendJson(res, { error: "名称不能为空" }, 400);
        tool.type = "mcp";
        tool.created_at = tool.created_at || new Date().toISOString();
        saveMcpTool(tool);
        sendJson(res, { success: true, tool });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        deleteMcpTool(name);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === Skills API ===
  if (pathname === "/api/skills/customizations" && req.method === "GET") {
    sendJson(res, { success: true, skills: loadCustomSkills() });
    return true;
  }

  if (pathname === "/api/skills" && req.method === "GET") {
    sendJson(res, { skills: loadSkills() });
    return true;
  }

  if (pathname === "/api/skills" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const skill = JSON.parse(body);
        if (!skill.name) return sendJson(res, { error: "名称不能为空" }, 400);
        skill.type = "skill";
        skill.created_at = skill.created_at || new Date().toISOString();
        saveSkill(skill);
        sendJson(res, { success: true, skill });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        deleteSkill(name);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 性能监控指标 ===
  if (pathname === "/api/metrics" && req.method === "GET") {
    sendJson(res, loadMetrics());
    return true;
  }

  if (pathname === "/api/metrics/reset" && req.method === "POST") {
    saveMetrics({ agents: {}, daily: {} });
    sendJson(res, { success: true });
    return true;
  }

  // === 共享上下文 API ===
  if (pathname === "/api/shared" && req.method === "GET") {
    sendJson(res, { files: listSharedFiles() });
    return true;
  }

  if (pathname === "/api/shared/read" && req.method === "GET") {
    const name = parsed.query.name;
    const data = readSharedFile(name);
    if (!data) {
      sendJson(res, { error: "文件不存在" }, 404);
      return true;
    }
    sendJson(res, { name, ...data });
    return true;
  }

  // 下载文件
  if (pathname === "/api/shared/download" && req.method === "GET") {
    const name = parsed.query.name;
    const filePath = getSharedFilePath(name);
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return true;
    }
    const ext = path.extname(name).toLowerCase();
    const types: Record<string, string> = {
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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          const boundary = getMultipartBoundary(ct);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files } = parseMultipart(buffer, boundary);
          const uploaded = files.map(f => saveSharedUpload(f.filename, fs.readFileSync(f.savedPath)));
          try { files.forEach(f => fs.unlinkSync(f.savedPath)); } catch {}
          sendJson(res, { success: true, files: uploaded });
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      });
      return true;
    }
    sendJson(res, { error: "需要 multipart/form-data" }, 400);
    return true;
  }

  if (pathname === "/api/shared/write" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, content } = JSON.parse(body);
        writeSharedFile(name, content);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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

      const out = execSync(`powershell -WindowStyle Normal -Sta -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8' }).trim();
      
      if (out && require('fs').existsSync(out)) {
        sendJson(res, { success: true, path: out });
      } else {
        sendJson(res, { success: false, error: 'No directory selected' });
      }
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
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
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 100);

      sendJson(res, { success: true, path: dir, items });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 400);
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
          } catch {}
        }
      } else {
        drives.push({ name: '/', path: '/' });
      }
      sendJson(res, { success: true, drives, home: os.homedir() });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 400);
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
        if (!command) return sendJson(res, { error: "命令不能为空" }, 400);

        const workDir = cwd || os.homedir();
        console.log(`[终端] 执行命令: ${command} (目录: ${workDir})`);

        try {
          const result = runTerminalCommand(command, workDir);
          sendJson(res, { success: true, output: result.output, cwd: result.cwd, error: result.error || undefined });
        } catch (e: any) {
          const text = (e.stdout || "") + (e.stderr || e.message);
          sendJson(res, {
            success: true,
            output: text,
            cwd: workDir,
            error: e.status ? `Exit code: ${e.status}` : e.message
          });
        }
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // 获取当前系统信息
  if (pathname === "/api/terminal/info" && req.method === "GET") {
    sendJson(res, {
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
