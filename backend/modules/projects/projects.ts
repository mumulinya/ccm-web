import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawn, execFileSync, execSync } from "child_process";
import { sendJson, CONFIGS_DIR, LOG_DIR, CCM_DIR, UPLOAD_DIR } from "../../core/utils";
import {
  getConfigs,
  getConfigInfo,
  isRunning,
  getPid,
  AGENTS,
  loadProjectConfigs,
  saveProjectConfigs,
  loadFeishuConfig,
  saveFeishuConfig
} from "../../core/db";
import { getSessions, getSessionDetail } from "./sessions";
import { createPrivateRuntimeConfig, credentialStoreStatus, migrateConfigDirectory, migrateTomlCredentials, protectCredential, redactSensitiveText, resolveCredential, schedulePrivateRuntimeConfigCleanup } from "../../core/credential-store";
import { buildFreshToolAuthorizationPayload, buildToolAuthorizationPayload, normalizeToolAuthorization, recordToolAuthorizationChange } from "../../tools/tool-authorization";
import { archiveProject, getProjectLifecycleAudit, listArchivedProjects, previewProjectPurge, purgeArchivedProject, restoreProject } from "./project-lifecycle";
import { validateAgentType, validateProjectName, validateProjectPlatform, validateSessionId, validateSharedFileName, validateWorkDirectory } from "./project-validation";

function resolveCcConnectLauncher() {
  if (process.platform === "win32") {
    for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
      const base = entry.replace(/^"|"$/g, "").trim();
      if (!base) continue;
      const executable = path.join(base, "node_modules", "cc-connect", "bin", "cc-connect.exe");
      if (fs.existsSync(executable)) return { command: executable, shell: false };
    }
    return { command: "cc-connect", shell: true };
  }
  return { command: "cc-connect", shell: false };
}

function spawnCcConnect(args: string[], options: any) {
  const launcher = resolveCcConnectLauncher();
  return spawn(launcher.command, args, { ...options, shell: launcher.shell, windowsHide: true });
}

export function getLogs(projectName: string, lines = 100) {
  const logFile = path.join(LOG_DIR, `${validateProjectName(projectName)}.log`);
  if (!fs.existsSync(logFile)) return "";
  const content = fs.readFileSync(logFile, "utf-8");
  return content.split("\n").slice(-lines).join("\n");
}

function sanitizeFeishuSetupName(name: string) {
  return String(name || "ccm-control-bot").trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "ccm-control-bot";
}

function syncFeishuAppCredentialsToGlobal(configPath: string, target: "project" | "control_bot") {
  const configContent = fs.readFileSync(configPath, "utf-8");
  const appIdMatch = configContent.match(/app_id\s*=\s*"([^"]+)"/);
  if (!appIdMatch?.[1] || appIdMatch[1] === "PLACEHOLDER") return null;

  const appSecretMatch = configContent.match(/app_secret\s*=\s*"([^"]+)"/);
  const resolvedAppSecret = appSecretMatch?.[1] ? resolveCredential(appSecretMatch[1]) : "";
  const feishuConfig = loadFeishuConfig();
  if (target === "control_bot") {
    feishuConfig.control_bot_app_id = appIdMatch[1];
    if (resolvedAppSecret) feishuConfig.control_bot_app_secret = resolvedAppSecret;
    feishuConfig.control_bot_enabled = true;
  } else {
    feishuConfig.app_id = appIdMatch[1];
    if (resolvedAppSecret) feishuConfig.app_secret = resolvedAppSecret;
  }
  saveFeishuConfig(feishuConfig);
  return { app_id: appIdMatch[1], has_secret: !!resolvedAppSecret };
}

const CONTROL_BOT_NAME = "ccm-control-bot";
const CONTROL_BOT_DIR = path.join(CCM_DIR, "control-bot");
const CONTROL_BOT_CONFIG_FILE = path.join(CONTROL_BOT_DIR, "config.toml");
const CONTROL_BOT_PID_FILE = path.join(CCM_DIR, "pids", `${CONTROL_BOT_NAME}.pid`);
const CONTROL_BOT_LOG_FILE = path.join(LOG_DIR, `${CONTROL_BOT_NAME}.log`);
const projectFeishuSetupTokens = new Map<string, { project: string; expiresAt: number }>();

function issueProjectFeishuSetupToken(project: string) {
  const token = crypto.randomBytes(24).toString("hex");
  projectFeishuSetupTokens.set(token, { project, expiresAt: Date.now() + 15 * 60 * 1000 });
  return token;
}

function consumeProjectFeishuSetupToken(project: string, token: unknown) {
  const key = String(token || "");
  const record = projectFeishuSetupTokens.get(key);
  if (!record || record.project !== project || record.expiresAt < Date.now()) return false;
  projectFeishuSetupTokens.delete(key);
  return true;
}

function ensureWindowsNoWindowLauncher() {
  const sourcePath = path.join(CONTROL_BOT_DIR, "ccm-acp-launcher.cs");
  const executablePath = path.join(CONTROL_BOT_DIR, "ccm-acp-launcher.exe");
  const source = `using System;
using System.Diagnostics;
using System.Text;
using System.Threading;

internal static class Program {
  private static string Quote(string value) {
    if (value.Length > 0 && value.IndexOfAny(new[] { ' ', '\\t', '\\n', '\\v', '\"' }) < 0) return value;
    var result = new StringBuilder("\\\"");
    var backslashes = 0;
    foreach (var ch in value) {
      if (ch == '\\\\') { backslashes++; continue; }
      if (ch == '\"') result.Append('\\\\', backslashes * 2 + 1);
      else result.Append('\\\\', backslashes);
      result.Append(ch);
      backslashes = 0;
    }
    result.Append('\\\\', backslashes * 2).Append('\\\"');
    return result.ToString();
  }

  [STAThread]
  private static int Main(string[] args) {
    if (args.Length == 0) return 64;
    var childArgs = new string[args.Length - 1];
    Array.Copy(args, 1, childArgs, 0, childArgs.Length);
    var start = new ProcessStartInfo {
      FileName = args[0],
      UseShellExecute = false,
      CreateNoWindow = true,
      RedirectStandardInput = true,
      RedirectStandardOutput = true,
      RedirectStandardError = true,
      Arguments = string.Join(" ", Array.ConvertAll(childArgs, Quote))
    };
    using (var child = Process.Start(start)) {
      var input = new Thread(() => {
        try {
          string line;
          while ((line = Console.In.ReadLine()) != null) {
            child.StandardInput.WriteLine(line);
            child.StandardInput.Flush();
          }
          child.StandardInput.Close();
        } catch { }
      });
      var output = new Thread(() => {
        try {
          string line;
          while ((line = child.StandardOutput.ReadLine()) != null) {
            Console.Out.WriteLine(line);
            Console.Out.Flush();
          }
        } catch { }
      });
      var error = new Thread(() => {
        try {
          string line;
          while ((line = child.StandardError.ReadLine()) != null) {
            Console.Error.WriteLine(line);
            Console.Error.Flush();
          }
        } catch { }
      });
      input.IsBackground = true;
      output.IsBackground = true;
      error.IsBackground = true;
      input.Start();
      output.Start();
      error.Start();
      child.WaitForExit();
      output.Join(2000);
      error.Join(2000);
      return child.ExitCode;
    }
  }
}`;
  fs.mkdirSync(CONTROL_BOT_DIR, { recursive: true });
  const sourceChanged = !fs.existsSync(sourcePath) || fs.readFileSync(sourcePath, "utf-8") !== source;
  if (sourceChanged) fs.writeFileSync(sourcePath, source, "utf-8");
  if (sourceChanged || !fs.existsSync(executablePath)) {
    const compilerCandidates = [
      path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe"),
    ];
    const compiler = compilerCandidates.find(candidate => fs.existsSync(candidate));
    if (!compiler) throw new Error("未找到 Windows C# 编译器，无法创建无窗口 ACP 启动器");
    execFileSync(compiler, ["/nologo", "/target:winexe", `/out:${executablePath}`, sourcePath], {
      windowsHide: true,
      stdio: "pipe",
    });
  }
  return executablePath;
}

function escapeTomlString(value: any) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n");
}

function ensureControlBotHookToken(config: any) {
  if (!config.control_bot_hook_token) {
    config.control_bot_hook_token = crypto.randomBytes(24).toString("hex");
    saveFeishuConfig(config);
  }
  return config.control_bot_hook_token;
}

function getControlBotPid() {
  if (!fs.existsSync(CONTROL_BOT_PID_FILE)) return null;
  const pid = Number(fs.readFileSync(CONTROL_BOT_PID_FILE, "utf-8").trim());
  if (!pid) return null;
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    try { fs.unlinkSync(CONTROL_BOT_PID_FILE); } catch {}
    return null;
  }
}

function getConfiguredControlBotPort() {
  try {
    const content = fs.readFileSync(CONTROL_BOT_CONFIG_FILE, "utf-8");
    const match = content.match(/--port=(\d{1,5})/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function writeControlBotConfig(port = 3080) {
  const config = loadFeishuConfig();
  const appId = String(config.control_bot_app_id || config.app_id || "").trim();
  const appSecret = String(config.control_bot_app_secret || config.app_secret || "").trim();
  if (!appId || !appSecret) throw new Error("请先扫码配置控制机器人 App ID / Secret");
  fs.mkdirSync(CONTROL_BOT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CONTROL_BOT_PID_FILE), { recursive: true });

  const workDir = process.cwd();
  const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
  if (!fs.existsSync(adapterPath)) {
    throw new Error(`控制机器人 ACP 适配器不存在：${adapterPath}，请先执行后端构建`);
  }
  const adapterCommand = process.platform === "win32" ? ensureWindowsNoWindowLauncher() : process.execPath;
  const adapterArgs = process.platform === "win32"
    ? [process.execPath, adapterPath, `--port=${port}`]
    : [adapterPath, `--port=${port}`];
  const appSecretRef = protectCredential("control-bot", "app_secret", appSecret);
  const tomlArgs = adapterArgs.map(arg => `"${escapeTomlString(arg)}"`).join(", ");
  const toml = `# Generated by CCM. Do not edit manually.\nlanguage = "zh"\n\n[[projects]]\nname = "${CONTROL_BOT_NAME}"\nadmin_from = "*"\n\n[projects.agent]\ntype = "acp"\n\n[projects.agent.options]\nwork_dir = "${escapeTomlString(workDir)}"\ncommand = "${escapeTomlString(adapterCommand)}"\nargs = [${tomlArgs}]\ndisplay_name = "CCM 全局 Agent"\n\n[[projects.platforms]]\ntype = "feishu"\n\n[projects.platforms.options]\napp_id = "${escapeTomlString(appId)}"\napp_secret = "${escapeTomlString(appSecretRef)}"\nallow_from = "*"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "compact"\n`;
  fs.writeFileSync(CONTROL_BOT_CONFIG_FILE, toml, "utf-8");
  return CONTROL_BOT_CONFIG_FILE;
}

function stopControlBotConnection() {
  const pid = getControlBotPid();
  if (!pid) return { success: true, running: false, message: "控制机器人未运行" };
  try {
    if (process.platform === "win32") execSync(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
    else process.kill(pid, "SIGTERM");
  } catch {}
  try { fs.unlinkSync(CONTROL_BOT_PID_FILE); } catch {}
  return { success: true, running: false, message: "控制机器人已停止" };
}

export function startControlBotConnection(port = 3080) {
  const requestedPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3080;
  const existing = getControlBotPid();
  const existingPort = getConfiguredControlBotPort();
  if (existing && existingPort === requestedPort) {
    return { success: true, running: true, pid: existing, target_port: existingPort, endpoint_current: true, config_path: CONTROL_BOT_CONFIG_FILE, message: "控制机器人已在运行" };
  }
  const rebound = !!existing;
  if (existing) stopControlBotConnection();
  const safeConfigPath = writeControlBotConfig(requestedPort);
  const configPath = createPrivateRuntimeConfig(CONTROL_BOT_NAME, fs.readFileSync(safeConfigPath, "utf-8"));
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logStream = fs.openSync(CONTROL_BOT_LOG_FILE, "a");
  const child = spawnCcConnect(["--config", configPath, "--force"], {
    stdio: ["ignore", logStream, logStream],
    detached: true,
  });
  child.unref();
  schedulePrivateRuntimeConfigCleanup(configPath);
  fs.writeFileSync(CONTROL_BOT_PID_FILE, String(child.pid));
  return {
    success: true,
    running: true,
    pid: child.pid,
    target_port: requestedPort,
    endpoint_current: true,
    rebound_from_port: rebound ? existingPort : 0,
    config_path: safeConfigPath,
    log_file: CONTROL_BOT_LOG_FILE,
    message: rebound ? `控制机器人已切换到当前服务端口 ${requestedPort}` : "控制机器人长连接已启动",
  };
}

function getControlBotConnectionStatus(expectedPort = 3080) {
  const pid = getControlBotPid();
  const targetPort = getConfiguredControlBotPort();
  return {
    success: true,
    running: !!pid,
    pid,
    target_port: targetPort,
    expected_port: expectedPort,
    endpoint_current: !!pid && targetPort === expectedPort,
    config_path: CONTROL_BOT_CONFIG_FILE,
    log_file: CONTROL_BOT_LOG_FILE,
  };
}

function startProject(projectName: string, agentType: string, port: number) {
  projectName = validateProjectName(projectName);
  agentType = agentType ? validateAgentType(agentType) : "";
  const configs = getConfigs();
  const config = configs.find((c) => c.name === projectName);
  if (!config) return { success: false, error: "项目不存在" };

  if (isRunning(projectName)) {
    return { success: false, error: "项目已在运行" };
  }

  let content = fs.readFileSync(config.path, "utf-8");

  if (agentType) {
    content = content.replace(
      /(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g,
      `$1"${agentType}"`
    );
  }
  const configPath = createPrivateRuntimeConfig(`${projectName}-${agentType || "default"}`, content);

  const logFile = path.join(LOG_DIR, `${projectName}.log`);
  const logStream = fs.openSync(logFile, "w");

  const child = spawnCcConnect(["--config", configPath, "--force"], {
    stdio: ["ignore", logStream, logStream],
    detached: true,
  });
  child.unref();
  schedulePrivateRuntimeConfigCleanup(configPath);

  const pidDir = path.join(CCM_DIR, "pids");
  if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true });
  fs.writeFileSync(path.join(pidDir, `${projectName}.pid`), String(child.pid));

  return { success: true, pid: child.pid };
}

function stopProject(projectName: string) {
  projectName = validateProjectName(projectName);
  const pid = getPid(projectName);
  if (!pid) return { success: false, error: "项目未在运行" };

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(parseInt(pid), "SIGTERM");
    }
  } catch {}

  try {
    const pidFile = path.join(CCM_DIR, "pids", `${projectName}.pid`);
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  } catch {}
  return { success: true };
}

export { startProject, stopProject };

function normalizeVerificationCommands(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}

function normalizeConfigList(value: any): string[] {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeProjectAgentProfile(config: any = {}) {
  return {
    responsibility: String(config.responsibility || config.role_scope || config.roleScope || "").trim(),
    capabilities: normalizeConfigList(config.capabilities || config.capability_tags || config.capabilityTags),
    writable_paths: normalizeConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths),
    forbidden_paths: normalizeConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths),
    delivery_contract: String(config.delivery_contract || config.deliveryContract || "").trim(),
  };
}

function readPackageJsonScripts(workDir: string) {
  try {
    const file = path.join(workDir, "package.json");
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
  } catch {
    return {};
  }
}

function inferProjectVerificationCommands(workDir = "") {
  const dir = String(workDir || "").trim();
  if (!dir || !fs.existsSync(dir)) return [];
  const hints: string[] = [];
  const scripts = readPackageJsonScripts(dir);
  const scriptNames = Object.keys(scripts);
  const addNpmScript = (name: string) => {
    if (scriptNames.includes(name)) hints.push(`npm run ${name}`);
  };
  addNpmScript("check");
  addNpmScript("typecheck");
  addNpmScript("lint");
  addNpmScript("test");
  addNpmScript("build");
  if (fs.existsSync(path.join(dir, "pom.xml"))) hints.push("mvn test");
  if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts"))) hints.push("gradle test");
  if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml"))) hints.push("pytest");
  if (fs.existsSync(path.join(dir, "go.mod"))) hints.push("go test ./...");
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) hints.push("cargo test");
  return uniqueStrings(hints).slice(0, 6);
}

function getProjectWorkDir(projectName: string) {
  const config = getConfigs().find((item) => item.name === projectName);
  if (!config) return "";
  const info = getConfigInfo(config.path);
  return info[0]?.workDir || "";
}

function requireActiveProjectName(value: unknown) {
  const project = validateProjectName(value);
  if (!getConfigs().some((item) => item.name === project)) throw new Error("项目不存在或已经归档");
  return project;
}

function applyInferredVerificationCommands(options: { projects?: string[]; overwrite?: boolean } = {}) {
  const projectNames = Array.isArray(options.projects) && options.projects.length
    ? options.projects.map((item) => String(item || "").trim()).filter(Boolean)
    : getConfigs().map((item) => item.name);
  const overwrite = options.overwrite === true;
  const configs = loadProjectConfigs();
  const results: any[] = [];

  for (const project of projectNames) {
    const configured = normalizeVerificationCommands(
      configs[project]?.verification_commands
        || configs[project]?.verificationCommands
        || configs[project]?.test_commands
        || configs[project]?.testCommands
        || configs[project]?.check_commands
        || configs[project]?.checkCommands
    );
    const inferred = inferProjectVerificationCommands(getProjectWorkDir(project));
    if (configured.length > 0 && !overwrite) {
      results.push({ project, status: "skipped_configured", configured, inferred });
      continue;
    }
    if (inferred.length === 0) {
      results.push({ project, status: "missing_inferred", configured, inferred: [] });
      continue;
    }
    if (!configs[project]) configs[project] = {};
    configs[project].verification_commands = inferred;
    results.push({ project, status: configured.length > 0 ? "overwritten" : "applied", configured: inferred, inferred });
  }

  const applied = results.filter((item) => item.status === "applied" || item.status === "overwritten").length;
  if (applied > 0) saveProjectConfigs(configs);
  return {
    success: true,
    applied,
    skipped_configured: results.filter((item) => item.status === "skipped_configured").length,
    missing_inferred: results.filter((item) => item.status === "missing_inferred").length,
    results,
  };
}

export function handleProjectsApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: {
    PORT: number;
    getSessions: Function;
    getAgentState: Function;
  }
): boolean {
  // 1. 获取项目列表
  if (pathname === "/api/projects" && req.method === "GET") {
    const configs = getConfigs();
    const projects = configs.map((config) => {
      const info = getConfigInfo(config.path);
      const running = isRunning(config.name);
      const agentState = ctx.getAgentState(config.name);
      return {
        name: config.name,
        running,
        pid: running ? getPid(config.name) : null,
        agent: info[0]?.agent || "claudecode",
        platform: info[0]?.platform || "未知",
        work_dir: info[0]?.workDir || "",
        session_count: ctx.getSessions(config.name).length,
        state: agentState.state,
        lastActivity: agentState.lastActivity,
        stateDetail: agentState.detail,
      };
    });
    sendJson(res, { projects });
    return true;
  }

  // 2. 获取可用 Agent 类型
  if (pathname === "/api/agents" && req.method === "GET") {
    sendJson(res, { agents: AGENTS });
    return true;
  }

  // 3. 启动项目
  if (pathname === "/api/start" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, agent } = JSON.parse(body);
        sendJson(res, startProject(project, agent, ctx.PORT));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 4. 停止项目
  if (pathname === "/api/stop" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project } = JSON.parse(body);
        sendJson(res, stopProject(project));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 5. 创建项目
  if (pathname === "/api/projects/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, work_dir, agent, platform, setup_token } = JSON.parse(body);

        const safeName = validateProjectName(name);
        const safeWorkDir = validateWorkDirectory(work_dir);
        const safeAgent = validateAgentType(agent);
        const safePlatform = validateProjectPlatform(platform);

        const configPath = path.join(CONFIGS_DIR, `config-${safeName}.toml`);
        let existingAppId = "";
        let existingAppSecret = "";
        if (fs.existsSync(configPath)) {
          if (!consumeProjectFeishuSetupToken(safeName, setup_token)) return sendJson(res, { success: false, error: "项目已存在" }, 409);
          const existingContent = fs.readFileSync(configPath, "utf-8");
          existingAppId = existingContent.match(/app_id\s*=\s*"([^"]+)"/)?.[1] || "";
          existingAppSecret = existingContent.match(/app_secret\s*=\s*"([^"]+)"/)?.[1] || "";
        }

        let platformOptionsToml = "";
        const finalPlatform = safePlatform;
        if (finalPlatform === "feishu" || finalPlatform === "lark") {
          platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"`;
        }

        const template = `# cc-connect - ${escapeTomlString(safeName)}
language = "zh"

[[projects]]
name = "${escapeTomlString(safeName)}"
work_dir = "${escapeTomlString(safeWorkDir)}"

[projects.agent]
type = "${escapeTomlString(safeAgent)}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
        fs.writeFileSync(configPath, template);
        migrateTomlCredentials(configPath);
        sendJson(res, { success: true, message: "项目配置已创建" });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 6. 更新项目
  if (pathname === "/api/projects/update" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, work_dir, agent, platform } = JSON.parse(body);

        const safeName = validateProjectName(name);
        const safeWorkDir = validateWorkDirectory(work_dir);
        const safeAgent = validateAgentType(agent);
        const safePlatform = validateProjectPlatform(platform);

        const configPath = path.join(CONFIGS_DIR, `config-${safeName}.toml`);
        if (!fs.existsSync(configPath)) {
          return sendJson(res, { success: false, error: "项目不存在" }, 404);
        }

        const content = fs.readFileSync(configPath, "utf-8");
        const appIdMatch = content.match(/app_id\s*=\s*"([^"]+)"/);
        const appSecretMatch = content.match(/app_secret\s*=\s*"([^"]+)"/);
        const existingAppId = appIdMatch?.[1] || "";
        const existingAppSecret = appSecretMatch?.[1] || "";

        let platformOptionsToml = "";
        const finalPlatform = safePlatform;
        if (finalPlatform === "feishu" || finalPlatform === "lark") {
          platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"`;
        }

        const template = `# cc-connect - ${escapeTomlString(safeName)}
language = "zh"

[[projects]]
name = "${escapeTomlString(safeName)}"
work_dir = "${escapeTomlString(safeWorkDir)}"

[projects.agent]
type = "${escapeTomlString(safeAgent)}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
        fs.writeFileSync(configPath, template);
        migrateTomlCredentials(configPath);
        sendJson(res, { success: true, message: "项目配置已更新" });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 7. 兼容旧调用：删除改为可恢复的安全归档
  if (pathname === "/api/projects/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name } = JSON.parse(body);
        const safeName = validateProjectName(name);
        if (isRunning(safeName)) {
          return sendJson(res, { success: false, error: "项目正在运行，请先停止" }, 400);
        }
        sendJson(res, archiveProject(safeName));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 8. 全局飞书控制机器人连接状态
  if (pathname === "/api/security/credentials/status" && req.method === "GET") {
    const configs = getConfigs();
    const plaintextSecrets = configs.reduce((count, item) => count + (fs.readFileSync(item.path, "utf-8").match(/(?:app_secret|api_key|access_token|refresh_token|hook_token)\s*=\s*"(?!ccm-secret:\/\/)[^"]+"/gi) || []).length, 0);
    sendJson(res, { success: true, ...credentialStoreStatus(), config_files: configs.length, plaintext_config_secrets: plaintextSecrets });
    return true;
  }

  if (pathname === "/api/projects/archived" && req.method === "GET") {
    sendJson(res, { success: true, projects: listArchivedProjects() });
    return true;
  }

  if (pathname === "/api/projects/archive" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name } = JSON.parse(body || "{}");
        const safeName = validateProjectName(name);
        if (isRunning(safeName)) return sendJson(res, { success: false, error: "项目正在运行，请先停止" }, 400);
        sendJson(res, archiveProject(safeName));
      } catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/projects/restore" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { sendJson(res, restoreProject(JSON.parse(body || "{}").name)); }
      catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/projects/purge-preview" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { sendJson(res, previewProjectPurge(JSON.parse(body || "{}").name)); }
      catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/projects/purge" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        sendJson(res, purgeArchivedProject(payload.name, payload.preview_token));
      } catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/projects/lifecycle-audit" && req.method === "GET") {
    sendJson(res, { success: true, records: getProjectLifecycleAudit(Number(parsed.query?.limit || 100)) });
    return true;
  }

  if (pathname === "/api/security/credentials/migrate" && req.method === "POST") {
    try {
      const migrated = migrateConfigDirectory(CONFIGS_DIR);
      const globalConfig = loadFeishuConfig();
      if (Object.keys(globalConfig || {}).length) saveFeishuConfig(globalConfig);
      sendJson(res, { success: true, migrated, store: credentialStoreStatus(), rotation_recommended: migrated.credentials > 0 });
    } catch (e: any) { sendJson(res, { success: false, error: e.message }, 500); }
    return true;
  }

  if (pathname === "/api/feishu/control-bot/status" && req.method === "GET") {
    sendJson(res, getControlBotConnectionStatus(Number(req.socket?.localPort || 3080)));
    return true;
  }

  if (pathname === "/api/feishu/control-bot/start" && req.method === "POST") {
    try {
      sendJson(res, startControlBotConnection(Number(req.socket?.localPort || 3080)));
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message || "控制机器人长连接启动失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/feishu/control-bot/stop" && req.method === "POST") {
    sendJson(res, stopControlBotConnection());
    return true;
  }

  // 9. 全局飞书控制机器人扫码配置
  if (pathname === "/api/feishu/control-bot/setup" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const setupName = sanitizeFeishuSetupName(payload.name || "ccm-control-bot");
        console.log("[飞书控制机器人配置] 收到扫码配置请求:", setupName);
        const configPath = path.join(CONFIGS_DIR, `config-${setupName}.toml`);
        const qrImagePath = path.join(UPLOAD_DIR, `feishu-control-bot-qr-${setupName}.png`);

        let scanUrl: string | null = null;

        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        const child = spawnCcConnect(["feishu", "new", "--project", setupName, "--qr-image", qrImagePath, "--timeout", "300"], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let cmdOutput = "";
        child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
        child.stderr.on("data", (data) => { cmdOutput += data.toString(); });

        child.on("close", (code) => {
          console.log("[飞书控制机器人配置] cc-connect 完成，退出码:", code);
          console.log("[飞书控制机器人配置] 输出:", redactSensitiveText(cmdOutput).substring(0, 500));

          try {
            const synced = syncFeishuAppCredentialsToGlobal(configPath, "control_bot");
            if (synced) {
              migrateTomlCredentials(configPath);
              console.log("[飞书控制机器人配置] 应用凭证已同步到控制机器人:", synced.app_id);
              try { startControlBotConnection(Number(req.socket?.localPort || 3080)); } catch (startError: any) { console.warn("[飞书控制机器人配置] 自动启动长连接失败:", startError?.message || startError); }
            }
          } catch (error: any) {
            console.warn("[飞书控制机器人配置] 同步应用凭证失败:", error?.message || error);
          }
        });

        setTimeout(() => {
          try {
            const qrExists = fs.existsSync(qrImagePath);
            const urlPatterns = [
              /URL:\s*(https?:\/\/\S+)/i,
              /url:\s*(https?:\/\/\S+)/i,
              /(https?:\/\/open\.feishu\.cn\S+)/i,
            ];

            for (const pattern of urlPatterns) {
              const match = cmdOutput.match(pattern);
              if (match) {
                scanUrl = match[1];
                break;
              }
            }

            sendJson(res, {
              success: true,
              scan_url: scanUrl,
              qr_image: qrExists ? `/api/uploads/feishu-control-bot-qr-${setupName}.png` : null,
              output: redactSensitiveText(cmdOutput).substring(0, 2000),
            });
          } catch (e: any) {
            sendJson(res, { success: false, error: e.message }, 400);
          }
        }, 2000);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 9. 飞书扫码配置
  if (pathname === "/api/projects/feishu-setup" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name } = JSON.parse(body);
        const projectName = sanitizeFeishuSetupName(name);
        const setupToken = issueProjectFeishuSetupToken(projectName);
        console.log("[飞书配置] 收到请求，项目名称:", projectName);
        const configPath = path.join(CONFIGS_DIR, `config-${projectName}.toml`);
        const qrImagePath = path.join(UPLOAD_DIR, `feishu-qr-${projectName}.png`);

        let scanUrl: string | null = null;

        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        console.log("[飞书配置] 二维码图片路径:", qrImagePath);

        const child = spawnCcConnect(["feishu", "new", "--project", projectName, "--qr-image", qrImagePath, "--timeout", "300"], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let cmdOutput = "";
        child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
        child.stderr.on("data", (data) => { cmdOutput += data.toString(); });

        child.on("close", (code) => {
          console.log("[飞书配置] cc-connect 完成，退出码:", code);
          console.log("[飞书配置] 输出:", redactSensitiveText(cmdOutput).substring(0, 500));

          try {
            const synced = syncFeishuAppCredentialsToGlobal(configPath, "project");
            if (synced) {
              migrateTomlCredentials(configPath);
              console.log("[飞书配置] 配置已同步到全局:", synced.app_id);
            }
          } catch {}
        });

        setTimeout(() => {
          try {
            const qrExists = fs.existsSync(qrImagePath);
            console.log("[飞书配置] 二维码图片存在:", qrExists);

            const urlPatterns = [
              /URL:\s*(https?:\/\/\S+)/i,
              /url:\s*(https?:\/\/\S+)/i,
              /(https?:\/\/open\.feishu\.cn\S+)/i,
            ];

            for (const pattern of urlPatterns) {
              const match = cmdOutput.match(pattern);
              if (match) {
                scanUrl = match[1];
                console.log("[飞书配置] 提取到 URL:", scanUrl);
                break;
              }
            }

            sendJson(res, {
              success: true,
              setup_token: setupToken,
              scan_url: scanUrl,
              qr_image: qrExists ? `/api/uploads/feishu-qr-${projectName}.png` : null,
              output: redactSensitiveText(cmdOutput).substring(0, 2000),
            });
          } catch (e: any) {
            sendJson(res, { success: false, error: e.message }, 400);
          }
        }, 2000);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 9. 获取项目工具配置
  if (pathname === "/api/projects/tools" && req.method === "GET") {
    let project: string;
    try { project = requireActiveProjectName(parsed.query.project); }
    catch (e: any) { sendJson(res, { error: e.message }, 400); return true; }
    const configs = loadProjectConfigs();
    const configuredCommands = normalizeVerificationCommands(configs[project]?.verification_commands || configs[project]?.verificationCommands || []);
    const inferredCommands = inferProjectVerificationCommands(getProjectWorkDir(project));
    const profile = normalizeProjectAgentProfile(configs[project] || {});
    const toolAuth = buildToolAuthorizationPayload(configs[project]?.tools || {});
    sendJson(res, {
      tools: toolAuth.tools,
      tool_audit: toolAuth.tool_audit,
      authorization_readiness: toolAuth.authorization_readiness,
      connection_preflight: toolAuth.connection_preflight,
      verification_commands: configuredCommands,
      inferred_verification_commands: inferredCommands,
      verification_source: configuredCommands.length > 0 ? "configured" : (inferredCommands.length > 0 ? "inferred" : "missing"),
      ...profile,
    });
    return true;
  }

  // 10. 更新项目工具配置
  if (pathname === "/api/projects/tools" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const { tools, verification_commands, verificationCommands } = payload;
        const project = requireActiveProjectName(payload.project);
        const configs = loadProjectConfigs();
        if (!configs[project]) configs[project] = {};
        const previousTools = normalizeToolAuthorization(configs[project].tools || {});
        const normalizedTools = normalizeToolAuthorization(tools);
        configs[project].tools = normalizedTools;
        const commands = normalizeVerificationCommands(verification_commands || verificationCommands);
        const profile = normalizeProjectAgentProfile(payload);
        configs[project].verification_commands = commands;
        configs[project].responsibility = profile.responsibility;
        configs[project].capabilities = profile.capabilities;
        configs[project].writable_paths = profile.writable_paths;
        configs[project].forbidden_paths = profile.forbidden_paths;
        configs[project].delivery_contract = profile.delivery_contract;
        saveProjectConfigs(configs);
        const toolAuth = await buildFreshToolAuthorizationPayload(normalizedTools);
        const authorizationChange = recordToolAuthorizationChange({
          scope: "project",
          scopeId: project,
          previous: previousTools,
          next: normalizedTools,
          actor: payload.actor || payload.updated_by || "api",
          source: "/api/projects/tools",
          toolAudit: toolAuth.tool_audit,
          authorizationReadiness: toolAuth.authorization_readiness,
        });
        sendJson(res, { success: true, tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight, authorization_change: authorizationChange, verification_commands: commands, ...profile });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // 11. 批量采用可推断的项目验证命令
  if (pathname === "/api/projects/verification-commands/apply-inferred" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, applyInferredVerificationCommands({
          projects: Array.isArray(payload.projects) ? payload.projects.map(validateProjectName) : payload.projects,
          overwrite: payload.overwrite,
        }));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // 12. 获取项目共享文件
  if (pathname === "/api/projects/shared" && req.method === "GET") {
    let project: string;
    try { project = requireActiveProjectName(parsed.query.project); }
    catch (e: any) { sendJson(res, { error: e.message }, 400); return true; }
    const configs = loadProjectConfigs();
    sendJson(res, { files: configs[project]?.shared_files || [] });
    return true;
  }

  // 13. 添加项目共享文件
  if (pathname === "/api/projects/shared/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const project = requireActiveProjectName(payload.project);
        const name = validateSharedFileName(payload.name);
        const content = String(payload.content || "");
        if (Buffer.byteLength(content, "utf-8") > 1024 * 1024) return sendJson(res, { error: "单个共享文本文件不能超过 1 MB" }, 400);
        const configs = loadProjectConfigs();
        if (!configs[project]) configs[project] = {};
        if (!configs[project].shared_files) configs[project].shared_files = [];
        const existing = configs[project].shared_files.findIndex((f: any) => f.name === name);
        if (existing >= 0) {
          configs[project].shared_files[existing].content = content;
          configs[project].shared_files[existing].type = "text";
          configs[project].shared_files[existing].readable = true;
          configs[project].shared_files[existing].updated_at = new Date().toISOString();
        } else {
          configs[project].shared_files.push({
            name,
            type: "text",
            readable: true,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        saveProjectConfigs(configs);
        sendJson(res, { success: true, files: configs[project].shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // 14. 删除项目共享文件
  if (pathname === "/api/projects/shared/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const project = requireActiveProjectName(payload.project);
        const name = validateSharedFileName(payload.name);
        const configs = loadProjectConfigs();
        if (configs[project]?.shared_files) {
          configs[project].shared_files = configs[project].shared_files.filter((f: any) => f.name !== name);
          saveProjectConfigs(configs);
        }
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 动态路由：获取项目会话列表、详情以及日志 ===
  // 15. 动态路由: /api/projects/:name/sessions
  const sessionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/);
  if (sessionsMatch && req.method === "GET") {
    try {
      const projectName = requireActiveProjectName(decodeURIComponent(sessionsMatch[1]));
      sendJson(res, { sessions: getSessions(projectName) });
    } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    return true;
  }

  // 15. 动态路由: /api/projects/:name/sessions/:id
  const sessionDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions\/([^/]+)$/);
  if (sessionDetailMatch && req.method === "GET") {
    try {
      const projectName = requireActiveProjectName(decodeURIComponent(sessionDetailMatch[1]));
      const sessionId = validateSessionId(decodeURIComponent(sessionDetailMatch[2]));
      const detail = getSessionDetail(projectName, sessionId);
      if (detail) sendJson(res, detail);
      else sendJson(res, { error: "会话不存在" }, 404);
    } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    return true;
  }

  // 16. 动态路由: /api/projects/:name/logs
  const logsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/logs$/);
  if (logsMatch && req.method === "GET") {
    try {
      const projectName = requireActiveProjectName(decodeURIComponent(logsMatch[1]));
      const lines = Math.max(1, Math.min(2000, parseInt(parsed.query?.lines) || 100));
      sendJson(res, { logs: getLogs(projectName, lines) });
    } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    return true;
  }

  return false;
}

