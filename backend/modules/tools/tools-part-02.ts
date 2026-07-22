// Behavior-freeze split from tools.ts (part 2/2).
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { performance } from "perf_hooks";
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
} from "../../core/utils";
import {
  loadMetrics,
  saveMetrics,
  loadProjectConfigs,
  loadMcpTools,
  loadFeishuConfig,
  saveMcpTool,
  deleteMcpTool,
  loadSkills,
  saveSkill,
  deleteSkill,
  SKILL_PACKAGES_DIR
} from "../../core/db";
import { loadGroups } from "../collaboration/storage";
import { listRecentRuntimeToolAudits, probeRuntimeToolReadiness, resyncMissingRuntimeToolSnapshots, resyncRecentRuntimeToolSnapshots } from "../../tools/runtime-tool-sync";
import { buildToolAuthorizationInventory, buildToolAuthorizationOptions } from "../../tools/tool-authorization";
import { getRuntimeToolRealCliMatrixStatus, startRuntimeToolRealCliMatrix } from "../../tools/runtime-tool-real-cli-matrix";
import { handleTerminalApi } from "./terminal";
import { completeToolCatalogMutationLifecycle, previewToolCatalogMutationImpact } from "./marketplace";
import { mergeMcpToolUpdate, mergeSkillUpdate, normalizeToolCatalogName, redactMcpToolForDisplay } from "../../tools/tool-catalog-management";
import { isCcmInternalSkillName } from "../../skills/internal-skill-catalog";
import { buildInternalMcpCatalog, isInternalMcpName } from "../../tools/internal-mcp-registry";
const { toolManager } = require("../../tools/tool-manager");
import { buildLivePerformanceSnapshot, buildMcpSkillGoalCompletionAudit, buildToolChainVerification, buildToolInvocationAudit, deleteSharedFile, listSharedFiles, loadCustomSkills, loadLatestRuntimeToolReadiness, normalizeTruthFlag, readSharedFile, readSkillManual, reloadToolManagerAfterCatalogMutation, rollbackCatalogMutation, runTerminalCommand, saveSharedUpload, selectLatestRuntimeToolAudits, writeSharedFile } from "./tools-part-01";
export function handleToolsAndMetricsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (handleTerminalApi(pathname, req, res)) return true;
  // === MCP/Skills API ===
  if (pathname === "/api/tools/status" && req.method === "GET") {
    sendJson(res, { success: true, ...toolManager.getToolList() });
    return true;
  }

  if (pathname === "/api/tools/internal-mcp" && req.method === "GET") {
    const runtime = toolManager.getToolList();
    sendJson(res, buildInternalMcpCatalog({ feishuConfig: loadFeishuConfig(), runtimeServers: runtime.servers || [] }));
    return true;
  }

  if (pathname === "/api/tools/authorization-options" && req.method === "GET") {
    sendJson(res, buildToolAuthorizationOptions({
      mcpTools: loadMcpTools(),
      skills: loadSkills(),
      status: toolManager.getToolList(),
    }));
    return true;
  }

  if (pathname === "/api/tools/authorization-inventory" && req.method === "GET") {
    try {
      const includeRuntime = !["0", "false", "no"].includes(String(parsed?.query?.runtime || "1").toLowerCase());
      const runtimeReadiness = includeRuntime
        ? loadLatestRuntimeToolReadiness(240, { businessOnly: true })
        : [];
      const inventory = buildToolAuthorizationInventory({
        projects: loadProjectConfigs(),
        groups: loadGroups(),
        runtimeReadiness,
      });
      sendJson(res, { success: true, ...inventory });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/tools/invocation-audit" && req.method === "GET") {
    sendJson(res, buildToolInvocationAudit(parsed?.query || { limit: 80 }));
    return true;
  }

  if (pathname === "/api/tools/chain-verification" && req.method === "GET") {
    try {
      sendJson(res, buildToolChainVerification(parsed?.query || {}));
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/tools/mcp-skill-goal-audit" && req.method === "GET") {
    try {
      sendJson(res, buildMcpSkillGoalCompletionAudit(parsed?.query || {}));
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/tools/runtime-readiness" && req.method === "GET") {
    const deep = ["1", "true", "yes"].includes(String(parsed?.query?.deep || "").toLowerCase());
    const includeHistory = ["1", "true", "yes"].includes(String(parsed?.query?.history || "").toLowerCase());
    const historicalAudits = listRecentRuntimeToolAudits(240);
    const audits = includeHistory ? historicalAudits : selectLatestRuntimeToolAudits(historicalAudits);
    const readiness = audits.map(audit => probeRuntimeToolReadiness(audit, { deep }));
    sendJson(res, {
      success: true,
      deep,
      includeHistory,
      historicalTotal: historicalAudits.length,
      readiness,
      summary: {
        total: readiness.length,
        ready: readiness.filter(item => item.overallReady).length,
        deliveryReady: readiness.filter(item => item.deliveryReady).length,
        runtimeReady: readiness.filter(item => item.runtimeReady).length,
      },
    });
    return true;
  }

  if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "GET") {
    sendJson(res, { success: true, ...getRuntimeToolRealCliMatrixStatus() });
    return true;
  }

  if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const started = startRuntimeToolRealCliMatrix(payload);
        sendJson(res, { success: true, ...started }, started.accepted ? 202 : 200);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tools/runtime-resync" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const resync = resyncRecentRuntimeToolSnapshots(payload);
        const includeMissing = normalizeTruthFlag(payload.includeMissing ?? payload.include_missing);
        const missing = includeMissing ? resyncMissingRuntimeToolSnapshots(payload) : null;
        sendJson(res, { success: true, ...resync, missing });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tools/catalog-impact" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const type = payload.type === "skill" ? "skill" : "mcp";
        const name = normalizeToolCatalogName(payload.name);
        sendJson(res, { success: true, ...previewToolCatalogMutationImpact({ action: payload.action || "preview", type, name }) });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tools/test" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const name = payload.name ? normalizeToolCatalogName(payload.name) : "connection-test";
        const existing = loadMcpTools().find(item => String(item.name) === name);
        const candidate = mergeMcpToolUpdate(existing, { ...payload, name }, { create: !existing });
        toolManager.testConnection(candidate.command, candidate.env as any, candidate.args || [])
          .then((result: any) => sendJson(res, { ...result, tested: redactMcpToolForDisplay(candidate) }))
          .catch((e: any) => sendJson(res, { success: false, error: e.message }, 400));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tools/reload" && req.method === "POST") {
    toolManager.disconnect();
    toolManager.loadTools().then(() => sendJson(res, { success: true, ...toolManager.getToolList() }));
    return true;
  }

  if (pathname === "/api/tools/skills/discover" && req.method === "GET") {
    sendJson(res, { success: true, skills: toolManager.discoverSkills() });
    return true;
  }

  if (pathname === "/api/tools/skills/invoke" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = toolManager.invokeSkill(payload.name || payload.skill, payload.input || payload.context || "", payload.scope);
        sendJson(res, { success: !!result.ok, result });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // === MCP 工具管理 API ===
  if (pathname === "/api/mcp" && req.method === "GET") {
    sendJson(res, { success: true, tools: loadMcpTools().filter(tool => !isInternalMcpName(tool?.name)).map(redactMcpToolForDisplay) });
    return true;
  }

  if (pathname === "/api/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const name = normalizeToolCatalogName(payload.name);
        if (isInternalMcpName(name)) return sendJson(res, { success: false, error: "内部 MCP 随项目安装并由系统管理，不能在外部 MCP 连接中心编辑" }, 409);
        const previous = loadMcpTools().find(item => String(item.name) === name) || null;
        if (payload.createOnly === true && previous) return sendJson(res, { success: false, error: "同名 MCP 服务器已存在" }, 409);
        const tool = mergeMcpToolUpdate(previous, { ...payload, name }, { create: !previous });
        saveMcpTool(tool);
        let reload;
        try {
          reload = await reloadToolManagerAfterCatalogMutation({
          action: previous ? (previous.enabled !== tool.enabled && Object.keys(payload).every(key => ["name", "enabled"].includes(key)) ? "toggle" : "update") : "create",
          type: "mcp",
          name,
        });
        } catch (error) {
          await rollbackCatalogMutation("mcp", name, previous);
          throw error;
        }
        sendJson(res, { success: true, tool: redactMcpToolForDisplay(tool), reload });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/mcp/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { name: rawName } = JSON.parse(body || "{}");
        const name = normalizeToolCatalogName(rawName);
        if (isInternalMcpName(name)) return sendJson(res, { success: false, error: "内部 MCP 是项目运行链路的一部分，不能删除" }, 409);
        const previous = loadMcpTools().find(item => String(item.name) === name) || null;
        const impact = previewToolCatalogMutationImpact({ action: "delete", type: "mcp", name });
        deleteMcpTool(name);
        let reload;
        try {
          reload = await reloadToolManagerAfterCatalogMutation({
          action: "delete",
          type: "mcp",
          name,
          changed: !!previous,
        });
        } catch (error) {
          await rollbackCatalogMutation("mcp", name, previous);
          throw error;
        }
        sendJson(res, { success: true, removed: !!previous, impact, reload });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // === Skills API ===
  if (pathname === "/api/skills/manual" && req.method === "GET") {
    try {
      const skill = readSkillManual(parsed.query.name);
      if (!skill) {
        sendJson(res, { success: false, error: "Skill 不存在" }, 404);
        return true;
      }
      sendJson(res, { success: true, skill });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 400);
    }
    return true;
  }

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
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const name = normalizeToolCatalogName(payload.name);
        const previous = loadSkills().find(item => String(item.name) === name) || null;
        if (payload.createOnly === true && previous) return sendJson(res, { success: false, error: "同名 Prompt Skill 已存在" }, 409);
        const skill = {
          ...mergeSkillUpdate(previous, { ...payload, name }, { create: !previous }),
          origin: previous?.origin || (previous?.marketplace ? "external" : "user"),
          scope: previous?.scope || (previous?.marketplace ? "external" : "user"),
          sourceType: previous?.sourceType || (previous?.marketplace ? "marketplace" : "prompt"),
          immutable: false,
          deletable: true,
          editable: true,
          disableable: true,
          systemManaged: false,
          roleSkill: false,
        };
        saveSkill(skill);
        let reload;
        try {
          reload = await reloadToolManagerAfterCatalogMutation({
          action: previous ? "update" : "create",
          type: "skill",
          name,
        });
        } catch (error) {
          await rollbackCatalogMutation("skill", name, previous);
          throw error;
        }
        sendJson(res, { success: true, skill, reload });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
      }
    });
    return true;
  }

  if (pathname === "/api/skills/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { name: rawName } = JSON.parse(body || "{}");
        const name = normalizeToolCatalogName(rawName);
        const previous = loadSkills().find(item => String(item.name) === name) || null;
        const impact = previewToolCatalogMutationImpact({ action: "delete", type: "skill", name });
        deleteSkill(name);
        let reload;
        try {
          reload = await reloadToolManagerAfterCatalogMutation({
          action: "delete",
          type: "skill",
          name,
          changed: !!previous,
        });
        } catch (error) {
          await rollbackCatalogMutation("skill", name, previous);
          throw error;
        }
        sendJson(res, { success: true, removed: !!previous, impact, reload });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
      }
    });
    return true;
  }

  // === 性能监控指标 ===
  if (pathname === "/api/metrics" && req.method === "GET") {
    const metrics = loadMetrics();
    const groups = loadGroups().map((group: any) => {
      const members = Array.isArray(group.members) ? group.members : [];
      const coordinator = members.find((member: any) => member.role === "coordinator") || members[0] || {};
      return {
        id: String(group.id || ""),
        name: String(group.name || group.id || "未命名群聊"),
        coordinator: String(coordinator.project || "coordinator"),
        members: members.map((member: any) => ({
          project: String(member.project || ""),
          role: String(member.role || (member.project === coordinator.project ? "coordinator" : "member")),
        })).filter((member: any) => member.project),
      };
    });
    sendJson(res, {
      metrics,
      catalog: {
        groups,
        global: {
          id: "global",
          name: "全局助手",
          agent: "global-agent",
          scopeKey: "global:global",
        },
        legacyUnscoped: {
          agentCount: Object.keys(metrics.agents || {}).length,
          latestAt: Object.values(metrics.agents || {}).reduce((latest: string, item: any) => {
            const at = String(item?.lastCall || "");
            return at > latest ? at : latest;
          }, ""),
        },
      },
      system: buildLivePerformanceSnapshot(),
    });
    return true;
  }

  if (pathname === "/api/metrics/reset" && req.method === "POST") {
    saveMetrics({ version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null });
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
  if (pathname === "/api/filesystem/directory" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => {
      body += String(chunk || "");
      if (Buffer.byteLength(body, "utf-8") > 16 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const parentInput = String(payload.parent || "").trim();
        const name = String(payload.name || "").trim();
        const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
        if (!parentInput) return sendJson(res, { success: false, error: "缺少当前目录" }, 400);
        const parent = path.resolve(parentInput);
        if (!path.isAbsolute(parent) || !fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
          return sendJson(res, { success: false, error: "当前目录不存在或不可用" }, 400);
        }
        if (!name || name.length > 120 || name === "." || name === ".." || /[<>:\"/\\|?*\x00-\x1F]/.test(name) || /[. ]$/.test(name) || reserved.test(name)) {
          return sendJson(res, { success: false, error: "文件夹名称无效" }, 400);
        }
        const target = path.resolve(parent, name);
        if (path.dirname(target) !== parent) return sendJson(res, { success: false, error: "文件夹必须创建在当前目录下" }, 400);
        if (fs.existsSync(target)) return sendJson(res, { success: false, error: "同名文件或文件夹已经存在" }, 409);
        fs.mkdirSync(target, { recursive: false });
        sendJson(res, { success: true, path: target, parent, name });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "创建文件夹失败" }, 400);
      }
    });
    return true;
  }

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
