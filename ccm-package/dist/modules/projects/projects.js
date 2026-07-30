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
exports.applyCcConnectTurnGuards = applyCcConnectTurnGuards;
exports.getLogs = getLogs;
exports.stopControlBotConnection = stopControlBotConnection;
exports.startControlBotConnection = startControlBotConnection;
exports.startProject = startProject;
exports.stopProject = stopProject;
exports.reconcileProjectFeishuConnections = reconcileProjectFeishuConnections;
exports.startFeishuChannelSupervisorForServer = startFeishuChannelSupervisorForServer;
exports.stopFeishuChannelSupervisorForServer = stopFeishuChannelSupervisorForServer;
exports.handleProjectsApi = handleProjectsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const runtime_1 = require("../../agents/runtime");
const agent_provider_settings_1 = require("../system/agent-provider-settings");
const sessions_1 = require("./sessions");
const runtime_events_1 = require("../../system/runtime-events");
const credential_store_1 = require("../../core/credential-store");
const tool_authorization_1 = require("../../tools/tool-authorization");
const project_lifecycle_1 = require("./project-lifecycle");
const project_validation_1 = require("./project-validation");
const project_git_1 = require("./project-git");
const project_runtime_1 = require("./project-runtime");
const project_test_targets_1 = require("./project-test-targets");
const project_test_auth_1 = require("./project-test-auth");
const project_folders_1 = require("./project-folders");
const cc_connect_feishu_runtime_config_1 = require("../../integrations/cc-connect-feishu-runtime-config");
const managed_process_tree_1 = require("../../system/managed-process-tree");
const shared_files_v2_1 = require("../tools/shared-files-v2");
function resolveCcConnectLauncher() {
    try {
        const runScript = require.resolve("cc-connect/run.js");
        return { command: process.execPath, shell: false, prefixArgs: [runScript], source: "bundled" };
    }
    catch { }
    if (process.platform === "win32") {
        for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
            const base = entry.replace(/^"|"$/g, "").trim();
            if (!base)
                continue;
            const executable = path.join(base, "node_modules", "cc-connect", "bin", "cc-connect.exe");
            if (fs.existsSync(executable))
                return { command: executable, shell: false, prefixArgs: [], source: "global" };
        }
        return { command: "cc-connect", shell: true, prefixArgs: [], source: "path" };
    }
    return { command: "cc-connect", shell: false, prefixArgs: [], source: "path" };
}
function spawnCcConnect(args, options) {
    const launcher = resolveCcConnectLauncher();
    const resolvedArgs = [...(launcher.prefixArgs || []), ...args];
    if (process.platform === "win32") {
        // cc-connect can launch another console application (for example Claude Code).
        // A winexe parent with CreateNoWindow keeps the complete descendant tree hidden.
        const hiddenLauncher = ensureWindowsNoWindowLauncher();
        const childCommand = launcher.shell ? (process.env.ComSpec || "cmd.exe") : launcher.command;
        const childArgs = launcher.shell ? ["/d", "/s", "/c", launcher.command, ...resolvedArgs] : resolvedArgs;
        return (0, child_process_1.spawn)(hiddenLauncher, [childCommand, ...childArgs], {
            ...options,
            shell: false,
            windowsHide: true,
        });
    }
    return (0, child_process_1.spawn)(launcher.command, resolvedArgs, { ...options, shell: launcher.shell, windowsHide: true });
}
function applyCcConnectTurnGuards(content, guards) {
    const newline = content.includes("\r\n") ? "\r\n" : "\n";
    const lines = content.split(/\r?\n/)
        // cc-connect 1.4.x only reads these two keys from the TOML root. Remove
        // legacy project-scoped copies before inserting the canonical values.
        .filter(line => !/^\s*(?:idle_timeout_mins|max_turn_time_mins)\s*=/i.test(line));
    const firstProject = lines.findIndex(line => /^\s*\[\[projects\]\]\s*$/i.test(line));
    if (firstProject < 0)
        return content;
    lines.splice(firstProject, 0, `idle_timeout_mins = ${guards.idleTimeoutMins}`, `max_turn_time_mins = ${guards.maxTurnTimeMins}`, "");
    const projectHeaders = lines
        .map((line, index) => /^\s*\[\[projects\]\]\s*$/i.test(line) ? index : -1)
        .filter(index => index >= 0)
        .reverse();
    for (const header of projectHeaders) {
        let rootEnd = header + 1;
        while (rootEnd < lines.length && !/^\s*\[/.test(lines[rootEnd]))
            rootEnd += 1;
        for (let index = rootEnd - 1; index > header; index -= 1) {
            if (/^\s*reset_on_idle_mins\s*=/i.test(lines[index]))
                lines.splice(index, 1);
        }
        lines.splice(header + 1, 0, `reset_on_idle_mins = ${guards.resetOnIdleMins}`);
    }
    return lines.join(newline);
}
function buildProjectFeishuAcpRuntimeConfig(content, projectName, port) {
    if (!/\[\[projects\.platforms\]\][\s\S]*?type\s*=\s*"(?:feishu|lark)"/i.test(content))
        return content;
    const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
    if (!fs.existsSync(adapterPath))
        throw new Error(`项目飞书 ACP 适配器不存在：${adapterPath}，请先执行后端构建`);
    // cc-connect is already launched under the no-window wrapper on Windows.
    // Starting the ACP adapter through a second line-proxy wrapper can leave its
    // long-lived stdin relay stuck after a completed turn. Run Node directly;
    // the outer no-window wrapper still keeps the complete cc-connect tree hidden.
    const command = process.execPath;
    const args = [adapterPath, `--port=${port}`, `--project=${projectName}`];
    const replacement = `[projects.agent]\ntype = "acp"\n\n[projects.agent.options]\ncmd = "${escapeTomlString(command)}"\nargs = [${args.map(arg => `"${escapeTomlString(arg)}"`).join(", ")}]\ndisplay_name = "${escapeTomlString((0, project_runtime_1.projectDisplayName)(projectName))} · 项目主 Agent"\n`;
    const pattern = /\[projects\.agent\][\s\S]*?(?=\r?\n\[\[projects\.platforms\]\])/;
    if (!pattern.test(content))
        throw new Error("项目 Agent 配置结构无效，无法接入项目主 Agent ACP");
    let runtimeContent = content.replace(pattern, replacement);
    // Project Feishu is a transport for the project main Agent, not a second
    // progress UI. Keep the private runtime on the final-text path so card
    // creation/update cannot block or swallow the ACP prompt/reply lifecycle.
    if (/enable_feishu_card\s*=\s*(?:true|false)/i.test(runtimeContent)) {
        runtimeContent = runtimeContent.replace(/enable_feishu_card\s*=\s*(?:true|false)/gi, "enable_feishu_card = false");
    }
    else {
        runtimeContent = runtimeContent.replace(/(\[projects\.platforms\.options\]\s*)/i, "$1\nenable_feishu_card = false\n");
    }
    if (/progress_style\s*=\s*"[^"]*"/i.test(runtimeContent)) {
        runtimeContent = runtimeContent.replace(/progress_style\s*=\s*"[^"]*"/gi, 'progress_style = "compact"');
    }
    else {
        runtimeContent = runtimeContent.replace(/(thread_isolation\s*=\s*(?:true|false)\s*)/i, '$1\nprogress_style = "compact"');
    }
    runtimeContent = (0, cc_connect_feishu_runtime_config_1.disableBlockingFeishuReaction)(runtimeContent);
    runtimeContent = (0, cc_connect_feishu_runtime_config_1.disableVisibleCcConnectIdleRotation)(runtimeContent);
    return applyCcConnectTurnGuards(runtimeContent, { idleTimeoutMins: 4, maxTurnTimeMins: 4, resetOnIdleMins: 0 });
}
function getLogs(projectName, lines = 100) {
    const logFile = path.join(utils_1.LOG_DIR, `${(0, project_validation_1.validateProjectName)(projectName)}.log`);
    if (!fs.existsSync(logFile))
        return "";
    const content = fs.readFileSync(logFile, "utf-8");
    return content.split("\n").slice(-lines).join("\n");
}
function sanitizeFeishuSetupName(name) {
    return String(name || "ccm-control-bot").trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "ccm-control-bot";
}
function syncFeishuAppCredentialsToGlobal(configPath, target) {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const appIdMatch = configContent.match(/app_id\s*=\s*"([^"]+)"/);
    if (!appIdMatch?.[1] || appIdMatch[1] === "PLACEHOLDER")
        return null;
    const appSecretMatch = configContent.match(/app_secret\s*=\s*"([^"]+)"/);
    const resolvedAppSecret = appSecretMatch?.[1] ? (0, credential_store_1.resolveCredential)(appSecretMatch[1]) : "";
    const feishuConfig = (0, db_1.loadFeishuConfig)();
    if (target === "control_bot") {
        feishuConfig.control_bot_app_id = appIdMatch[1];
        if (resolvedAppSecret)
            feishuConfig.control_bot_app_secret = resolvedAppSecret;
        feishuConfig.control_bot_enabled = true;
    }
    else {
        feishuConfig.app_id = appIdMatch[1];
        if (resolvedAppSecret)
            feishuConfig.app_secret = resolvedAppSecret;
    }
    (0, db_1.saveFeishuConfig)(feishuConfig);
    return { app_id: appIdMatch[1], has_secret: !!resolvedAppSecret };
}
const CONTROL_BOT_NAME = "ccm-control-bot";
const CONTROL_BOT_DIR = path.join(utils_1.CCM_DIR, "control-bot");
const CONTROL_BOT_CONFIG_FILE = path.join(CONTROL_BOT_DIR, "config.toml");
const CONTROL_BOT_PID_FILE = path.join(utils_1.CCM_DIR, "pids", `${CONTROL_BOT_NAME}.pid`);
const CONTROL_BOT_LOG_FILE = path.join(utils_1.LOG_DIR, `${CONTROL_BOT_NAME}.log`);
const FEISHU_CHANNEL_MANIFEST_DIR = path.join(utils_1.CCM_DIR, "channel-runtime");
const projectFeishuSetupTokens = new Map();
let feishuChannelSupervisorTimer = null;
function channelManifestFile(key) {
    const safe = String(key || "global").replace(/[^a-zA-Z0-9_.-]/g, "-");
    return path.join(FEISHU_CHANNEL_MANIFEST_DIR, `${safe}.json`);
}
function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function buildChannelRuntimeIdentity(key, mode, project, pid, port, configContent, adapterPath) {
    const adapterSha256 = sha256(fs.readFileSync(adapterPath));
    const configSha256 = sha256(configContent);
    return {
        schema: "ccm-feishu-channel-runtime-v1",
        key,
        mode,
        project,
        pid,
        target_port: port,
        adapter_sha256: adapterSha256,
        config_sha256: configSha256,
        fingerprint: sha256(JSON.stringify({ key, mode, project, port, adapterSha256, configSha256 })),
        started_at: new Date().toISOString(),
    };
}
function readChannelRuntimeManifest(key) {
    try {
        const value = JSON.parse(fs.readFileSync(channelManifestFile(key), "utf-8"));
        return value?.schema === "ccm-feishu-channel-runtime-v1" ? value : null;
    }
    catch {
        return null;
    }
}
function writeChannelRuntimeManifest(manifest) {
    fs.mkdirSync(FEISHU_CHANNEL_MANIFEST_DIR, { recursive: true });
    const file = channelManifestFile(manifest.key);
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    fs.renameSync(temporary, file);
}
function removeChannelRuntimeManifest(key) {
    try {
        fs.unlinkSync(channelManifestFile(key));
    }
    catch { }
}
function channelDisabledFile(key) {
    const safe = String(key || "global").replace(/[^a-zA-Z0-9_.-]/g, "-");
    return path.join(FEISHU_CHANNEL_MANIFEST_DIR, `${safe}.disabled`);
}
function processCommandLine(pid) {
    try {
        if (process.platform === "win32") {
            const escaped = Number(pid);
            return (0, child_process_1.execFileSync)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${escaped}\").CommandLine`], {
                encoding: "utf-8",
                windowsHide: true,
                timeout: 5_000,
            }).trim();
        }
        return fs.readFileSync(`/proc/${pid}/cmdline`, "utf-8").replace(/\0/g, " ").trim();
    }
    catch {
        return "";
    }
}
function managedProcessRows() {
    try {
        if (process.platform === "win32") {
            const raw = (0, child_process_1.execFileSync)("powershell.exe", [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
            ], {
                encoding: "utf-8",
                windowsHide: true,
                timeout: 8_000,
                maxBuffer: 8 * 1024 * 1024,
            }).trim();
            const parsed = raw ? JSON.parse(raw) : [];
            return (Array.isArray(parsed) ? parsed : [parsed]).map((row) => ({
                pid: Number(row.ProcessId || 0),
                parentPid: Number(row.ParentProcessId || 0),
                commandLine: String(row.CommandLine || ""),
            })).filter((row) => row.pid > 0 && !!row.commandLine);
        }
        return (0, child_process_1.execFileSync)("ps", ["-eo", "pid=,ppid=,args="], {
            encoding: "utf-8",
            timeout: 8_000,
            maxBuffer: 8 * 1024 * 1024,
        }).split(/\r?\n/).flatMap(line => {
            const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
            return match ? [{ pid: Number(match[1]), parentPid: Number(match[2]), commandLine: match[3] }] : [];
        });
    }
    catch {
        return [];
    }
}
function runtimeConfigPathFromCommandLine(commandLine) {
    const match = String(commandLine || "").match(/--config(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    return String(match?.[1] || match?.[2] || match?.[3] || "").trim();
}
function runtimeConfigOwnsProject(commandLine, expectedProjectName) {
    try {
        const configPath = path.resolve(runtimeConfigPathFromCommandLine(commandLine));
        const privateConfigRoot = path.resolve(utils_1.CCM_DIR, "private", "runtime-configs");
        const relative = path.relative(privateConfigRoot, configPath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
            return false;
        if (fs.existsSync(configPath) && fs.statSync(configPath).isFile()) {
            const content = fs.readFileSync(configPath, "utf-8");
            const projectName = content.match(/\[\[projects\]\][\s\S]*?\bname\s*=\s*"([^"]+)"/i)?.[1] || "";
            return projectName === expectedProjectName;
        }
        const escapedName = expectedProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const baseName = path.basename(configPath);
        if (expectedProjectName === CONTROL_BOT_NAME) {
            return new RegExp(`^${escapedName}-\\d+-\\d+\\.toml$`, "i").test(baseName);
        }
        const agentPattern = ["default", ...project_validation_1.PROJECT_AGENT_TYPES].map(item => String(item).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
        return new RegExp(`^${escapedName}-(?:${agentPattern})-\\d+-\\d+\\.toml$`, "i").test(baseName);
    }
    catch {
        return false;
    }
}
function discoverOwnedChannelRootPids(expectedProjectName, rows = managedProcessRows()) {
    const candidates = rows.filter(row => {
        const commandLine = row.commandLine.replace(/\\/g, "/").toLowerCase();
        return (commandLine.includes("cc-connect") || commandLine.includes("ccm-acp-launcher") || commandLine.includes("/run.js"))
            && runtimeConfigOwnsProject(row.commandLine, expectedProjectName);
    });
    if (!candidates.length)
        return [];
    const candidateIds = new Set(candidates.map(row => row.pid));
    return candidates.filter(row => !candidateIds.has(row.parentPid)).map(row => row.pid);
}
function discoverOwnedProjectChannelRootPid(projectName, rows = managedProcessRows()) {
    return discoverOwnedChannelRootPids(projectName, rows)[0] || 0;
}
function managedChannelProcessIsCurrent(pid, expected) {
    try {
        process.kill(pid, 0);
    }
    catch {
        return false;
    }
    const manifest = readChannelRuntimeManifest(expected.key);
    if (!manifest || manifest.pid !== pid || manifest.fingerprint !== expected.fingerprint)
        return false;
    return managedChannelProcessLooksOwned(pid);
}
function managedChannelProcessLooksOwned(pid) {
    const commandLine = processCommandLine(pid).toLowerCase();
    return !!commandLine && (commandLine.includes("cc-connect") || commandLine.includes("ccm-acp-launcher") || commandLine.includes("run.js"));
}
function issueProjectFeishuSetupToken(project) {
    const token = crypto.randomBytes(24).toString("hex");
    projectFeishuSetupTokens.set(token, { project, expiresAt: Date.now() + 15 * 60 * 1000 });
    return token;
}
function consumeProjectFeishuSetupToken(project, token) {
    const key = String(token || "");
    const record = projectFeishuSetupTokens.get(key);
    if (!record || record.project !== project || record.expiresAt < Date.now())
        return false;
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
    if (sourceChanged)
        fs.writeFileSync(sourcePath, source, "utf-8");
    if (sourceChanged || !fs.existsSync(executablePath)) {
        const compilerCandidates = [
            path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
            path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe"),
        ];
        const compiler = compilerCandidates.find(candidate => fs.existsSync(candidate));
        if (!compiler)
            throw new Error("未找到 Windows C# 编译器，无法创建无窗口 ACP 启动器");
        (0, child_process_1.execFileSync)(compiler, ["/nologo", "/target:winexe", `/out:${executablePath}`, sourcePath], {
            windowsHide: true,
            stdio: "pipe",
        });
    }
    return executablePath;
}
function escapeTomlString(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n");
}
function ensureControlBotHookToken(config) {
    if (!config.control_bot_hook_token) {
        config.control_bot_hook_token = crypto.randomBytes(24).toString("hex");
        (0, db_1.saveFeishuConfig)(config);
    }
    return config.control_bot_hook_token;
}
function getControlBotPid() {
    if (!fs.existsSync(CONTROL_BOT_PID_FILE))
        return null;
    const pid = Number(fs.readFileSync(CONTROL_BOT_PID_FILE, "utf-8").trim());
    if (!pid)
        return null;
    try {
        process.kill(pid, 0);
        return pid;
    }
    catch {
        try {
            fs.unlinkSync(CONTROL_BOT_PID_FILE);
        }
        catch { }
        return null;
    }
}
function getConfiguredControlBotPort() {
    try {
        const content = fs.readFileSync(CONTROL_BOT_CONFIG_FILE, "utf-8");
        const match = content.match(/--port=(\d{1,5})/);
        return match ? Number(match[1]) : 0;
    }
    catch {
        return 0;
    }
}
function writeControlBotConfig(port = 3080) {
    const config = (0, db_1.loadFeishuConfig)();
    const appId = String(config.control_bot_app_id || config.app_id || "").trim();
    const appSecret = String(config.control_bot_app_secret || config.app_secret || "").trim();
    if (!appId || !appSecret)
        throw new Error("请先扫码配置控制机器人 App ID / Secret");
    fs.mkdirSync(CONTROL_BOT_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(CONTROL_BOT_PID_FILE), { recursive: true });
    const workDir = process.cwd();
    const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
    if (!fs.existsSync(adapterPath)) {
        throw new Error(`控制机器人 ACP 适配器不存在：${adapterPath}，请先执行后端构建`);
    }
    const adapterCommand = process.execPath;
    const adapterArgs = [adapterPath, `--port=${port}`];
    const appSecretRef = (0, credential_store_1.protectCredential)("control-bot", "app_secret", appSecret);
    const tomlArgs = adapterArgs.map(arg => `"${escapeTomlString(arg)}"`).join(", ");
    const toml = `# Generated by CCM. Do not edit manually.\nlanguage = "zh"\nidle_timeout_mins = 4\nmax_turn_time_mins = 4\n\n[[projects]]\nreset_on_idle_mins = 0\nname = "${CONTROL_BOT_NAME}"\nadmin_from = "*"\n\n[projects.agent]\ntype = "acp"\n\n[projects.agent.options]\nwork_dir = "${escapeTomlString(workDir)}"\ncmd = "${escapeTomlString(adapterCommand)}"\nargs = [${tomlArgs}]\ndisplay_name = "CCM 全局 Agent"\n\n[[projects.platforms]]\ntype = "feishu"\n\n[projects.platforms.options]\napp_id = "${escapeTomlString(appId)}"\napp_secret = "${escapeTomlString(appSecretRef)}"\nallow_from = "*"\nenable_feishu_card = false\nthread_isolation = true\nprogress_style = "compact"\nreaction_emoji = "none"\n`;
    fs.writeFileSync(CONTROL_BOT_CONFIG_FILE, toml, "utf-8");
    return CONTROL_BOT_CONFIG_FILE;
}
function stopControlBotConnection() {
    const pid = getControlBotPid();
    if (!pid)
        return { success: true, running: false, message: "控制机器人未运行" };
    const owned = managedChannelProcessLooksOwned(pid);
    if (owned) {
        try {
            if (process.platform === "win32")
                (0, child_process_1.execFileSync)("taskkill.exe", ["/T", "/F", "/PID", String(pid)], {
                    stdio: "ignore",
                    windowsHide: true,
                });
            else
                process.kill(pid, "SIGTERM");
        }
        catch { }
    }
    try {
        fs.unlinkSync(CONTROL_BOT_PID_FILE);
    }
    catch { }
    removeChannelRuntimeManifest(CONTROL_BOT_NAME);
    return { success: true, running: false, process_owned: owned, message: owned ? "控制机器人已停止" : "控制机器人 PID 已失效，未终止无法证明归属的进程" };
}
function startControlBotConnection(port = 3080) {
    const requestedPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3080;
    const safeConfigPath = writeControlBotConfig(requestedPort);
    const configContent = fs.readFileSync(safeConfigPath, "utf-8");
    const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
    const existing = getControlBotPid();
    const existingPort = getConfiguredControlBotPort();
    const expected = buildChannelRuntimeIdentity(CONTROL_BOT_NAME, "global", "", existing || 0, requestedPort, configContent, adapterPath);
    if (existing && existingPort === requestedPort && managedChannelProcessIsCurrent(existing, { ...expected, pid: existing })) {
        return { success: true, running: true, pid: existing, target_port: existingPort, endpoint_current: true, build_current: true, config_path: CONTROL_BOT_CONFIG_FILE, message: "控制机器人已在运行" };
    }
    const rebound = !!existing;
    if (existing) {
        const stopped = stopControlBotConnection();
        if (stopped.process_owned === false)
            throw new Error("无法证明旧控制机器人进程归属，已拒绝启动重复飞书通道");
    }
    const configPath = (0, credential_store_1.createPrivateRuntimeConfig)(CONTROL_BOT_NAME, configContent);
    fs.mkdirSync(utils_1.LOG_DIR, { recursive: true });
    const logStream = fs.openSync(CONTROL_BOT_LOG_FILE, "a");
    const child = spawnCcConnect(["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        detached: true,
    });
    child.unref();
    (0, credential_store_1.schedulePrivateRuntimeConfigCleanup)(configPath);
    fs.writeFileSync(CONTROL_BOT_PID_FILE, String(child.pid));
    writeChannelRuntimeManifest(buildChannelRuntimeIdentity(CONTROL_BOT_NAME, "global", "", Number(child.pid), requestedPort, configContent, adapterPath));
    return {
        success: true,
        running: true,
        pid: child.pid,
        target_port: requestedPort,
        endpoint_current: true,
        build_current: true,
        rebound_from_port: rebound ? existingPort : 0,
        config_path: safeConfigPath,
        log_file: CONTROL_BOT_LOG_FILE,
        message: rebound ? `控制机器人已切换到当前服务端口 ${requestedPort}` : "控制机器人长连接已启动",
    };
}
function getControlBotConnectionStatus(expectedPort = 3080) {
    const pid = getControlBotPid();
    const targetPort = getConfiguredControlBotPort();
    const configContent = fs.existsSync(CONTROL_BOT_CONFIG_FILE) ? fs.readFileSync(CONTROL_BOT_CONFIG_FILE, "utf-8") : "";
    const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
    const expected = pid && configContent && fs.existsSync(adapterPath)
        ? buildChannelRuntimeIdentity(CONTROL_BOT_NAME, "global", "", pid, targetPort, configContent, adapterPath)
        : null;
    const buildCurrent = !!(pid && expected && managedChannelProcessIsCurrent(pid, expected));
    return {
        success: true,
        running: !!pid,
        pid,
        target_port: targetPort,
        expected_port: expectedPort,
        endpoint_current: !!pid && targetPort === expectedPort && buildCurrent,
        build_current: buildCurrent,
        config_path: CONTROL_BOT_CONFIG_FILE,
        log_file: CONTROL_BOT_LOG_FILE,
    };
}
async function startProject(projectName, agentType, port, discoveredPid = 0) {
    projectName = (0, project_validation_1.validateProjectName)((0, project_runtime_1.resolveProjectIdentifier)(projectName));
    agentType = agentType ? (0, project_validation_1.validateAgentType)(agentType) : "";
    const configs = (0, db_1.getConfigs)();
    const config = configs.find((c) => c.name === projectName);
    if (!config)
        return { success: false, error: "项目不存在" };
    let content = fs.readFileSync(config.path, "utf-8");
    if (agentType) {
        content = content.replace(/(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g, `$1"${agentType}"`);
    }
    content = buildProjectFeishuAcpRuntimeConfig(content, projectName, port);
    const adapterPath = path.join(__dirname, "..", "..", "integrations", "control-bot-acp.js");
    const runningPid = Number((0, db_1.getPid)(projectName) || discoveredPid || discoverOwnedProjectChannelRootPid(projectName) || 0);
    if (runningPid && !(0, db_1.getPid)(projectName)) {
        const pidDir = path.join(utils_1.CCM_DIR, "pids");
        fs.mkdirSync(pidDir, { recursive: true });
        fs.writeFileSync(path.join(pidDir, `${projectName}.pid`), String(runningPid));
    }
    const expected = buildChannelRuntimeIdentity(`project-${projectName}`, "project", projectName, runningPid, port, content, adapterPath);
    if (runningPid && managedChannelProcessIsCurrent(runningPid, expected)) {
        return { success: true, running: true, pid: runningPid, endpoint_current: true, build_current: true, message: "项目 Agent 通道已连接" };
    }
    const recycled = !!runningPid;
    if (runningPid) {
        const stopped = await stopProject(projectName, false);
        if (stopped.process_owned === false)
            throw new Error("无法证明旧项目通道进程归属，已拒绝启动重复飞书通道");
    }
    const configPath = (0, credential_store_1.createPrivateRuntimeConfig)(`${projectName}-${agentType || "default"}`, content);
    const logFile = path.join(utils_1.LOG_DIR, `${projectName}.log`);
    const logStream = fs.openSync(logFile, "a");
    fs.writeSync(logStream, `\n===== CCM project channel start ${new Date().toISOString()} =====\n`);
    const child = spawnCcConnect(["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        detached: true,
    });
    child.unref();
    (0, credential_store_1.schedulePrivateRuntimeConfigCleanup)(configPath);
    const pidDir = path.join(utils_1.CCM_DIR, "pids");
    if (!fs.existsSync(pidDir))
        fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(path.join(pidDir, `${projectName}.pid`), String(child.pid));
    writeChannelRuntimeManifest(buildChannelRuntimeIdentity(`project-${projectName}`, "project", projectName, Number(child.pid), port, content, adapterPath));
    try {
        fs.unlinkSync(channelDisabledFile(`project-${projectName}`));
    }
    catch { }
    return { success: true, running: true, pid: child.pid, endpoint_current: true, build_current: true, recycled, message: recycled ? "项目 Agent 通道已更新并重新连接" : "项目 Agent 通道已连接" };
}
async function stopProject(projectName, explicit = true) {
    projectName = (0, project_validation_1.validateProjectName)((0, project_runtime_1.resolveProjectIdentifier)(projectName));
    const pid = (0, db_1.getPid)(projectName);
    const owned = !!pid && managedChannelProcessLooksOwned(Number(pid));
    const channelStopReceipt = pid && owned ? await (0, managed_process_tree_1.terminateManagedProcessTree)(Number(pid), { gracefulTimeoutMs: 5_000, forceTimeoutMs: 3_000 }) : null;
    const channelStopped = !pid || (!!channelStopReceipt && channelStopReceipt.exited);
    if (channelStopped) {
        try {
            const pidFile = path.join(utils_1.CCM_DIR, "pids", `${projectName}.pid`);
            if (fs.existsSync(pidFile))
                fs.unlinkSync(pidFile);
        }
        catch { }
        removeChannelRuntimeManifest(`project-${projectName}`);
    }
    if (explicit && channelStopped) {
        fs.mkdirSync(FEISHU_CHANNEL_MANIFEST_DIR, { recursive: true });
        fs.writeFileSync(channelDisabledFile(`project-${projectName}`), `${new Date().toISOString()}\n`, "utf-8");
    }
    const runtimeStop = explicit ? await (0, project_runtime_1.stopAllProjectRuntimes)(projectName) : null;
    const channelMessage = pid
        ? (owned
            ? (channelStopped ? "项目 Agent 通道已断开" : "项目 Agent 通道停止失败，进程仍可能运行")
            : "项目 Agent PID 已失效，未终止无法证明归属的进程")
        : "项目 Agent 通道未运行";
    const runtimeMessage = runtimeStop
        ? `；已停止 ${runtimeStop.stoppedProcesses} 个源码运行进程${runtimeStop.stoppedBuilds ? `和 ${runtimeStop.stoppedBuilds} 个构建任务` : ""}`
        : "";
    return {
        success: channelStopped && runtimeStop?.success !== false,
        running: !channelStopped,
        process_owned: owned,
        channel_stop_receipt: channelStopReceipt,
        runtime_stop: runtimeStop,
        error: !channelStopped
            ? channelStopReceipt?.error || "项目 Agent 通道进程树未能完整终止"
            : (runtimeStop?.failures?.length ? `项目通道已断开，但有 ${runtimeStop.failures.length} 个源码进程无法证明归属，未强制终止` : undefined),
        message: `${channelMessage}${runtimeMessage}`,
    };
}
async function reconcileProjectFeishuConnections(port) {
    const results = [];
    const processRows = managedProcessRows();
    const currentControlBotPid = Number(getControlBotPid() || 0);
    for (const duplicatePid of discoverOwnedChannelRootPids(CONTROL_BOT_NAME, processRows)) {
        if (duplicatePid === currentControlBotPid)
            continue;
        const receipt = await (0, managed_process_tree_1.terminateManagedProcessTree)(duplicatePid, { gracefulTimeoutMs: 3_000, forceTimeoutMs: 2_000 });
        if (!receipt.exited) {
            console.warn(`[飞书控制机器人] 旧通道 ${duplicatePid} 无法完整回收：${receipt.error || "进程仍在运行"}`);
        }
    }
    for (const config of (0, db_1.getConfigs)()) {
        const key = `project-${config.name}`;
        if (fs.existsSync(channelDisabledFile(key)))
            continue;
        const running = (0, db_1.isRunning)(config.name);
        const knownChannel = readChannelRuntimeManifest(key);
        const discoveredPid = !running ? discoverOwnedProjectChannelRootPid(config.name, processRows) : 0;
        if (!running && !knownChannel && !discoveredPid)
            continue;
        let content = "";
        try {
            content = fs.readFileSync(config.path, "utf-8");
        }
        catch {
            continue;
        }
        if (!/\[\[projects\.platforms\]\][\s\S]*?type\s*=\s*"(?:feishu|lark)"/i.test(content))
            continue;
        try {
            results.push({ project: config.name, ...await startProject(config.name, "", port, discoveredPid) });
        }
        catch (error) {
            results.push({ project: config.name, success: false, error: error?.message || String(error) });
        }
    }
    return results;
}
function startFeishuChannelSupervisorForServer(port) {
    if (feishuChannelSupervisorTimer)
        return;
    const tick = async () => {
        try {
            const config = (0, db_1.loadFeishuConfig)();
            const hasControlBotCredentials = !!((config.control_bot_app_id || config.app_id) && (config.control_bot_app_secret || config.app_secret));
            if (config.control_bot_enabled === true && hasControlBotCredentials)
                startControlBotConnection(port);
        }
        catch (error) {
            console.warn(`[飞书控制机器人] 通道监管失败：${error?.message || error}`);
        }
        for (const result of await reconcileProjectFeishuConnections(port)) {
            if (result.success === false)
                console.warn(`[项目飞书通道] ${result.project} 通道监管失败：${result.error}`);
        }
    };
    feishuChannelSupervisorTimer = setInterval(() => { void tick(); }, 30_000);
    feishuChannelSupervisorTimer.unref?.();
}
function stopFeishuChannelSupervisorForServer() {
    if (feishuChannelSupervisorTimer)
        clearInterval(feishuChannelSupervisorTimer);
    feishuChannelSupervisorTimer = null;
}
function normalizeVerificationCommands(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}
function normalizeConfigList(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function normalizeProjectAgentProfile(config = {}) {
    return {
        responsibility: String(config.responsibility || config.role_scope || config.roleScope || "").trim(),
        capabilities: normalizeConfigList(config.capabilities || config.capability_tags || config.capabilityTags),
        writable_paths: normalizeConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths),
        forbidden_paths: normalizeConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths),
        delivery_contract: String(config.delivery_contract || config.deliveryContract || "").trim(),
    };
}
function readPackageJsonScripts(workDir) {
    try {
        const file = path.join(workDir, "package.json");
        if (!fs.existsSync(file))
            return {};
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
    }
    catch {
        return {};
    }
}
function inferProjectVerificationCommands(workDir = "") {
    const dir = String(workDir || "").trim();
    if (!dir || !fs.existsSync(dir))
        return [];
    const hints = [];
    const scripts = readPackageJsonScripts(dir);
    const scriptNames = Object.keys(scripts);
    const addNpmScript = (name) => {
        if (scriptNames.includes(name))
            hints.push(`npm run ${name}`);
    };
    addNpmScript("check");
    addNpmScript("typecheck");
    addNpmScript("lint");
    addNpmScript("test");
    addNpmScript("build");
    if (fs.existsSync(path.join(dir, "pom.xml")))
        hints.push("mvn test");
    if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts")))
        hints.push("gradle test");
    if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml")))
        hints.push("pytest");
    if (fs.existsSync(path.join(dir, "go.mod")))
        hints.push("go test ./...");
    if (fs.existsSync(path.join(dir, "Cargo.toml")))
        hints.push("cargo test");
    return uniqueStrings(hints).slice(0, 6);
}
function getProjectWorkDir(projectName) {
    const config = (0, db_1.getConfigs)().find((item) => item.name === projectName);
    if (!config)
        return "";
    const info = (0, db_1.getConfigInfo)(config.path);
    return info[0]?.workDir || "";
}
function requireActiveProjectName(value) {
    const project = (0, project_validation_1.validateProjectName)(value);
    if (!(0, db_1.getConfigs)().some((item) => item.name === project))
        throw new Error("项目不存在或已经归档");
    return project;
}
function saveProjectRepositoryMetadata(project, status, source = "local") {
    const configs = (0, db_1.loadProjectConfigs)();
    if (!configs[project])
        configs[project] = {};
    configs[project].repository = status?.is_repository ? {
        provider: status.remote_web_url ? "github" : "git",
        source,
        remote_url: String(status.remote_url || ""),
        remote_web_url: String(status.remote_web_url || ""),
        branch: String(status.branch || ""),
        updated_at: new Date().toISOString(),
    } : null;
    (0, db_1.saveProjectConfigs)(configs);
}
function applyInferredVerificationCommands(options = {}) {
    const projectNames = Array.isArray(options.projects) && options.projects.length
        ? options.projects.map((item) => String(item || "").trim()).filter(Boolean)
        : (0, db_1.getConfigs)().map((item) => item.name);
    const overwrite = options.overwrite === true;
    const configs = (0, db_1.loadProjectConfigs)();
    const results = [];
    for (const project of projectNames) {
        const configured = normalizeVerificationCommands(configs[project]?.verification_commands
            || configs[project]?.verificationCommands
            || configs[project]?.test_commands
            || configs[project]?.testCommands
            || configs[project]?.check_commands
            || configs[project]?.checkCommands);
        const inferred = inferProjectVerificationCommands(getProjectWorkDir(project));
        if (configured.length > 0 && !overwrite) {
            results.push({ project, status: "skipped_configured", configured, inferred });
            continue;
        }
        if (inferred.length === 0) {
            results.push({ project, status: "missing_inferred", configured, inferred: [] });
            continue;
        }
        if (!configs[project])
            configs[project] = {};
        configs[project].verification_commands = inferred;
        results.push({ project, status: configured.length > 0 ? "overwritten" : "applied", configured: inferred, inferred });
    }
    const applied = results.filter((item) => item.status === "applied" || item.status === "overwritten").length;
    if (applied > 0)
        (0, db_1.saveProjectConfigs)(configs);
    return {
        success: true,
        applied,
        skipped_configured: results.filter((item) => item.status === "skipped_configured").length,
        missing_inferred: results.filter((item) => item.status === "missing_inferred").length,
        results,
    };
}
function handleProjectsApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/projects/clone/status" && req.method === "GET") {
        const id = String(parsed.query.id || "").trim();
        const receipt = (0, project_git_1.getProjectCloneReceipt)(id);
        return receipt ? (0, utils_1.sendJson)(res, { success: true, receipt }) : (0, utils_1.sendJson)(res, { success: false, error: "克隆记录不存在" }, 404);
    }
    if (pathname === "/api/projects/clone/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const input = JSON.parse(body || "{}");
                (0, utils_1.sendJson)(res, { success: true, receipt: (0, project_git_1.cancelProjectClone)(String(input.id || "")) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/clone/cleanup" && req.method === "POST") {
        return (0, utils_1.sendJson)(res, { success: true, cleaned: (0, project_git_1.cleanupStaleProjectCloneArtifacts)() });
    }
    // 1. 获取项目列表
    if (pathname === "/api/projects" && req.method === "GET") {
        const configs = (0, db_1.getConfigs)();
        const projects = configs.map((config) => {
            const info = (0, db_1.getConfigInfo)(config.path);
            const running = (0, db_1.isRunning)(config.name);
            const agentState = ctx.getAgentState(config.name);
            let runtimeSummary = { profile_count: 0, running_count: 0, unknown_count: 0, building_count: 0, selected_profile_id: "" };
            try {
                runtimeSummary = (0, project_runtime_1.getProjectRuntimeSummary)(config.name);
            }
            catch { }
            return {
                name: config.name,
                display_name: (0, project_runtime_1.projectDisplayName)(config.name),
                running,
                pid: running ? (0, db_1.getPid)(config.name) : null,
                agent_connection: { running, pid: running ? (0, db_1.getPid)(config.name) : null },
                runtime_summary: runtimeSummary,
                agent: info[0]?.agent || "claudecode",
                platform: info[0]?.platform || "未知",
                work_dir: info[0]?.workDir || "",
                session_count: ctx.getSessions(config.name).length,
                state: agentState.state,
                lastActivity: agentState.lastActivity,
                stateDetail: agentState.detail,
            };
        });
        (0, utils_1.sendJson)(res, { projects });
        return true;
    }
    // 2. 获取可用 Agent 类型
    if (pathname === "/api/agents" && req.method === "GET") {
        const agents = (0, runtime_1.getPublicAgentRuntimes)().map(runtime => ({
            type: runtime.id,
            name: runtime.label,
            command: runtime.commandLabel,
            capabilities: runtime.capabilities,
            nativeContinuation: runtime.nativeContinuation,
            enabled: (0, agent_provider_settings_1.isDevelopmentAgentEnabled)(runtime.id),
            ready: (0, runtime_1.isAgentRuntimeAvailable)(runtime.id),
        }));
        (0, utils_1.sendJson)(res, { agents });
        return true;
    }
    // 3. 启动项目
    if (pathname === "/api/start" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, agent } = JSON.parse(body);
                (0, utils_1.sendJson)(res, await startProject(project, agent, ctx.PORT));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 4. 停止项目
    if (pathname === "/api/stop" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project } = JSON.parse(body);
                (0, utils_1.sendJson)(res, await stopProject(project));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 显式区分 Agent/飞书连接与源码项目运行；旧 /api/start、/api/stop 保持兼容。
    if (pathname === "/api/projects/agent-connection" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const action = String(payload.action || "");
                if (action === "connect")
                    (0, utils_1.sendJson)(res, await startProject(payload.project, payload.agent, ctx.PORT));
                else if (action === "disconnect")
                    (0, utils_1.sendJson)(res, await stopProject(payload.project));
                else
                    (0, utils_1.sendJson)(res, { success: false, error: "不支持的 Agent 连接操作" }, 400);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/runtime" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, project_runtime_1.getProjectRuntimeSnapshot)(parsed.query?.project));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    if (pathname === "/api/projects/runtime/logs" && req.method === "GET") {
        (0, project_runtime_1.getProjectRuntimeLogsAsync)(parsed.query?.project, parsed.query?.profile_id, parsed.query?.kind, Number(parsed.query?.lines || 300))
            .then(result => (0, utils_1.sendJson)(res, result))
            .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/projects/runtime/log-stream" && req.method === "GET") {
        try {
            const project = String(parsed.query?.project || "");
            const profileId = String(parsed.query?.profile_id || "");
            const kind = String(parsed.query?.kind || "run");
            // Validate the exact binding before opening the SSE response. Otherwise a
            // stale profile produces a silent reconnect loop with no readable error.
            (0, project_runtime_1.getProjectRuntimeLogs)(project, profileId, kind, 1);
            res.writeHead(200, {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            });
            res.flushHeaders?.();
            let unsubscribe = () => { };
            const send = (event) => {
                if (res.destroyed || res.writableEnded)
                    return;
                if (Number(res.writableLength || 0) > 1024 * 1024) {
                    unsubscribe();
                    res.end();
                    return;
                }
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            };
            let ready = false;
            const pending = [];
            unsubscribe = (0, project_runtime_1.subscribeProjectRuntimeLogs)(project, profileId, kind, event => {
                if (!ready)
                    pending.push(event);
                else
                    send(event);
            });
            send({ type: "snapshot", content: (0, project_runtime_1.getProjectRuntimeLogs)(project, profileId, kind, 2000).logs });
            ready = true;
            for (const event of pending)
                send(event);
            const heartbeat = setInterval(() => {
                if (!res.destroyed && !res.writableEnded)
                    res.write(": heartbeat\n\n");
            }, 15000);
            req.on("close", () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
        }
        catch (e) {
            if (!res.headersSent)
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            else
                res.end();
        }
        return true;
    }
    if (pathname === "/api/projects/runtime/shutdown" && req.method === "POST") {
        (0, project_runtime_1.stopManagedProjectRuntimesForShutdown)()
            .then(result => (0, utils_1.sendJson)(res, { success: result.failures.length === 0, ...result }, result.failures.length ? 409 : 200))
            .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500));
        return true;
    }
    if (["/api/projects/runtime/rescan", "/api/projects/runtime/config", "/api/projects/runtime/action", "/api/projects/runtime/toolchain-test"].includes(pathname) && req.method === "POST") {
        let body = "";
        let rejected = false;
        req.on("data", (chunk) => {
            if (rejected)
                return;
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > 2 * 1024 * 1024) {
                rejected = true;
                (0, utils_1.sendJson)(res, { success: false, error: "请求内容过大" }, 413);
            }
        });
        req.on("end", async () => {
            if (rejected)
                return;
            try {
                const payload = JSON.parse(body || "{}");
                if (pathname.endsWith("/rescan"))
                    (0, utils_1.sendJson)(res, (0, project_runtime_1.rescanProjectRuntimeProfiles)(payload.project));
                else if (pathname.endsWith("/config"))
                    (0, utils_1.sendJson)(res, (0, project_runtime_1.saveProjectRuntimeConfig)(payload.project, payload));
                else if (pathname.endsWith("/toolchain-test"))
                    (0, utils_1.sendJson)(res, (0, project_runtime_1.testProjectJavaToolchain)(payload.project, payload.toolchain));
                else
                    (0, utils_1.sendJson)(res, await (0, project_runtime_1.executeProjectRuntimeAction)(payload.project, payload.profile_id, payload.action));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message, code: e.code || "" }, e.code === "RUNTIME_BUSY" ? 423 : 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/test-targets" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, project_test_targets_1.listProjectTestTargets)(String(parsed.query?.project || "")));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, /不存在/.test(e.message) ? 404 : 400);
        }
        return true;
    }
    if (pathname === "/api/projects/test-auth" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, project_test_auth_1.getProjectTestAuthProfile)(String(parsed.query?.project || "")));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, /不存在/.test(e.message) ? 404 : 400);
        }
        return true;
    }
    if (pathname === "/api/projects/test-auth" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                (0, utils_1.sendJson)(res, { success: true, profile: (0, project_test_auth_1.saveProjectTestAuthProfile)(String(payload.project || ""), payload.profile || payload) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, /不存在/.test(e.message) ? 404 : 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/test-targets" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const project = String(payload.project || payload.target?.project || "");
                const target = (0, project_test_targets_1.saveProjectTestTarget)(project, payload.target || payload);
                (0, utils_1.sendJson)(res, { success: true, target });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, /不存在/.test(e.message) ? 404 : 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/test-targets/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                (0, utils_1.sendJson)(res, (0, project_test_targets_1.deleteProjectTestTarget)(String(payload.project || ""), String(payload.target_id || payload.targetId || "")));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, /不存在/.test(e.message) ? 404 : 400);
            }
        });
        return true;
    }
    // 5. 创建项目
    if (pathname === "/api/projects/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            let cloneReceiptId = "";
            try {
                const { name, display_name, work_dir, agent, platform, setup_token, source_type, repository_url, repository_branch, test_auth, clone_request_id } = JSON.parse(body);
                const safeName = (0, project_validation_1.validateProjectName)(name);
                const safeAgent = (0, project_validation_1.validateAgentType)(agent);
                const safePlatform = (0, project_validation_1.validateProjectPlatform)(platform);
                const sourceType = String(source_type || "local").trim().toLowerCase();
                if (!["local", "github"].includes(sourceType))
                    throw new Error("不支持的项目来源类型");
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${safeName}.toml`);
                let existingAppId = "";
                let existingAppSecret = "";
                if (fs.existsSync(configPath)) {
                    if (!consumeProjectFeishuSetupToken(safeName, setup_token))
                        return (0, utils_1.sendJson)(res, { success: false, error: "项目已存在" }, 409);
                    const existingContent = fs.readFileSync(configPath, "utf-8");
                    existingAppId = existingContent.match(/app_id\s*=\s*"([^"]+)"/)?.[1] || "";
                    existingAppSecret = existingContent.match(/app_secret\s*=\s*"([^"]+)"/)?.[1] || "";
                }
                let repositoryStatus = null;
                let cloneResult = null;
                const safeWorkDir = sourceType === "github"
                    ? String((cloneResult = await (0, project_git_1.cloneGitHubRepository)({ repositoryUrl: repository_url, destination: work_dir, branch: repository_branch, receiptId: clone_request_id })).work_dir)
                    : (0, project_validation_1.validateWorkDirectory)(work_dir);
                cloneReceiptId = String(cloneResult?.clone_receipt?.id || "");
                if (sourceType === "github")
                    repositoryStatus = await (0, project_git_1.inspectProjectGitAsync)(safeWorkDir);
                else {
                    const inspected = await (0, project_git_1.inspectProjectGitAsync)(safeWorkDir);
                    if (inspected.is_repository)
                        repositoryStatus = inspected;
                }
                let platformOptionsToml = "";
                const finalPlatform = safePlatform;
                if (finalPlatform === "feishu" || finalPlatform === "lark") {
                    platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"\nreaction_emoji = "none"`;
                }
                const template = `# cc-connect - ${escapeTomlString(safeName)}
language = "zh"
idle_timeout_mins = 4
max_turn_time_mins = 4

[[projects]]
reset_on_idle_mins = 0
name = "${escapeTomlString(safeName)}"
work_dir = "${escapeTomlString(safeWorkDir)}"

[projects.agent]
type = "${escapeTomlString(safeAgent)}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
                fs.writeFileSync(configPath, template);
                (0, credential_store_1.migrateTomlCredentials)(configPath);
                if (repositoryStatus)
                    saveProjectRepositoryMetadata(safeName, repositoryStatus, sourceType);
                (0, project_runtime_1.saveProjectDisplayName)(safeName, display_name || safeName);
                const testAuth = test_auth ? (0, project_test_auth_1.saveProjectTestAuthProfile)(safeName, test_auth) : (0, project_test_auth_1.getProjectTestAuthProfile)(safeName);
                let runtime = null;
                try {
                    runtime = (0, project_runtime_1.rescanProjectRuntimeProfiles)(safeName);
                }
                catch { }
                if (cloneReceiptId)
                    (0, project_git_1.finalizeProjectCloneReceipt)(cloneReceiptId, "completed");
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message: sourceType === "github" ? "GitHub 仓库已克隆并创建项目" : "项目配置已创建",
                    repository: repositoryStatus,
                    runtime,
                    test_auth: testAuth,
                    clone_receipt: cloneReceiptId ? (0, project_git_1.getProjectCloneReceipt)(cloneReceiptId) : null,
                });
            }
            catch (e) {
                if (cloneReceiptId)
                    await (0, project_git_1.rollbackProjectClone)(cloneReceiptId, `项目配置创建失败：${e.message}`);
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 6. 更新项目
    if (pathname === "/api/projects/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name, display_name, work_dir, agent, platform, repository_url, initialize_repository, test_auth } = JSON.parse(body);
                const safeName = (0, project_validation_1.validateProjectName)(name);
                const safeWorkDir = (0, project_validation_1.validateWorkDirectory)(work_dir);
                const safeAgent = (0, project_validation_1.validateAgentType)(agent);
                const safePlatform = (0, project_validation_1.validateProjectPlatform)(platform);
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${safeName}.toml`);
                if (!fs.existsSync(configPath)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目不存在" }, 404);
                }
                const shouldManageRepository = initialize_repository === true || String(repository_url || "").trim().length > 0;
                const repositoryStatus = shouldManageRepository
                    ? await (0, project_git_1.configureProjectRepositoryAsync)({ workDir: safeWorkDir, repositoryUrl: repository_url, initialize: initialize_repository === true })
                    : await (0, project_git_1.inspectProjectGitAsync)(safeWorkDir);
                const content = fs.readFileSync(configPath, "utf-8");
                const appIdMatch = content.match(/app_id\s*=\s*"([^"]+)"/);
                const appSecretMatch = content.match(/app_secret\s*=\s*"([^"]+)"/);
                const existingAppId = appIdMatch?.[1] || "";
                const existingAppSecret = appSecretMatch?.[1] || "";
                let platformOptionsToml = "";
                const finalPlatform = safePlatform;
                if (finalPlatform === "feishu" || finalPlatform === "lark") {
                    platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"\nreaction_emoji = "none"`;
                }
                const template = `# cc-connect - ${escapeTomlString(safeName)}
language = "zh"
idle_timeout_mins = 4
max_turn_time_mins = 4

[[projects]]
reset_on_idle_mins = 0
name = "${escapeTomlString(safeName)}"
work_dir = "${escapeTomlString(safeWorkDir)}"

[projects.agent]
type = "${escapeTomlString(safeAgent)}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
                fs.writeFileSync(configPath, template);
                (0, credential_store_1.migrateTomlCredentials)(configPath);
                if (repositoryStatus.is_repository)
                    saveProjectRepositoryMetadata(safeName, repositoryStatus, "edit");
                const savedDisplayName = (0, project_runtime_1.saveProjectDisplayName)(safeName, display_name || (0, project_runtime_1.projectDisplayName)(safeName));
                const testAuth = test_auth ? (0, project_test_auth_1.saveProjectTestAuthProfile)(safeName, test_auth) : (0, project_test_auth_1.getProjectTestAuthProfile)(safeName);
                (0, utils_1.sendJson)(res, { success: true, message: "项目配置已更新", display_name: savedDisplayName, repository: repositoryStatus, test_auth: testAuth });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
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
                const safeName = (0, project_validation_1.validateProjectName)(name);
                const runtime = (0, project_runtime_1.getProjectRuntimeSummary)(safeName);
                if ((0, db_1.isRunning)(safeName) || runtime.running_count || runtime.unknown_count || runtime.building_count) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目 Agent、源码进程或构建任务仍在运行，请先停止" }, 400);
                }
                (0, utils_1.sendJson)(res, (0, project_lifecycle_1.archiveProject)(safeName));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 8. 全局飞书控制机器人连接状态
    if (pathname === "/api/security/credentials/status" && req.method === "GET") {
        const configs = (0, db_1.getConfigs)();
        const plaintextSecrets = configs.reduce((count, item) => count + (fs.readFileSync(item.path, "utf-8").match(/(?:app_secret|api_key|access_token|refresh_token|hook_token)\s*=\s*"(?!ccm-secret:\/\/)[^"]+"/gi) || []).length, 0);
        (0, utils_1.sendJson)(res, { success: true, ...(0, credential_store_1.credentialStoreStatus)(), config_files: configs.length, plaintext_config_secrets: plaintextSecrets });
        return true;
    }
    if (pathname === "/api/projects/git-status" && req.method === "GET") {
        Promise.resolve().then(async () => {
            const project = requireActiveProjectName(parsed.query?.project);
            const workDir = (0, project_validation_1.validateWorkDirectory)(getProjectWorkDir(project));
            (0, utils_1.sendJson)(res, { success: true, project, status: await (0, project_git_1.inspectProjectGitAsync)(workDir) });
        }).catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message || "读取 Git 状态失败" }, 400));
        return true;
    }
    if (pathname === "/api/projects/archived" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, projects: (0, project_lifecycle_1.listArchivedProjects)() });
        return true;
    }
    if (pathname === "/api/projects/archive" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body || "{}");
                const safeName = (0, project_validation_1.validateProjectName)(name);
                const runtime = (0, project_runtime_1.getProjectRuntimeSummary)(safeName);
                if ((0, db_1.isRunning)(safeName) || runtime.running_count || runtime.unknown_count || runtime.building_count)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目 Agent、源码进程或构建任务仍在运行，请先停止" }, 400);
                (0, utils_1.sendJson)(res, (0, project_lifecycle_1.archiveProject)(safeName));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/restore" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                (0, utils_1.sendJson)(res, (0, project_lifecycle_1.restoreProject)(JSON.parse(body || "{}").name));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/purge-preview" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                (0, utils_1.sendJson)(res, (0, project_lifecycle_1.previewProjectPurge)(JSON.parse(body || "{}").name));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/purge" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                (0, utils_1.sendJson)(res, (0, project_lifecycle_1.purgeArchivedProject)(payload.name, payload.preview_token));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/lifecycle-audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, records: (0, project_lifecycle_1.getProjectLifecycleAudit)(Number(parsed.query?.limit || 100)) });
        return true;
    }
    if (pathname === "/api/security/credentials/migrate" && req.method === "POST") {
        try {
            const migrated = (0, credential_store_1.migrateConfigDirectory)(utils_1.CONFIGS_DIR);
            const globalConfig = (0, db_1.loadFeishuConfig)();
            if (Object.keys(globalConfig || {}).length)
                (0, db_1.saveFeishuConfig)(globalConfig);
            (0, utils_1.sendJson)(res, { success: true, migrated, store: (0, credential_store_1.credentialStoreStatus)(), rotation_recommended: migrated.credentials > 0 });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/feishu/control-bot/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, getControlBotConnectionStatus(Number(req.socket?.localPort || 3080)));
        return true;
    }
    if (pathname === "/api/feishu/control-bot/start" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, startControlBotConnection(Number(req.socket?.localPort || 3080)));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message || "控制机器人长连接启动失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/feishu/control-bot/stop" && req.method === "POST") {
        (0, utils_1.sendJson)(res, stopControlBotConnection());
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
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${setupName}.toml`);
                const qrImagePath = path.join(utils_1.UPLOAD_DIR, `feishu-control-bot-qr-${setupName}.png`);
                let scanUrl = null;
                if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
                }
                const child = spawnCcConnect(["feishu", "new", "--project", setupName, "--qr-image", qrImagePath, "--timeout", "300"], {
                    stdio: ["pipe", "pipe", "pipe"],
                });
                let cmdOutput = "";
                child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
                child.stderr.on("data", (data) => { cmdOutput += data.toString(); });
                child.on("close", (code) => {
                    console.log("[飞书控制机器人配置] cc-connect 完成，退出码:", code);
                    console.log("[飞书控制机器人配置] 输出:", (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 500));
                    try {
                        const synced = syncFeishuAppCredentialsToGlobal(configPath, "control_bot");
                        if (synced) {
                            (0, credential_store_1.migrateTomlCredentials)(configPath);
                            console.log("[飞书控制机器人配置] 应用凭证已同步到控制机器人:", synced.app_id);
                            try {
                                startControlBotConnection(Number(req.socket?.localPort || 3080));
                            }
                            catch (startError) {
                                console.warn("[飞书控制机器人配置] 自动启动长连接失败:", startError?.message || startError);
                            }
                        }
                    }
                    catch (error) {
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
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            scan_url: scanUrl,
                            qr_image: qrExists ? `/api/uploads/feishu-control-bot-qr-${setupName}.png` : null,
                            output: (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 2000),
                        });
                    }
                    catch (e) {
                        (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
                    }
                }, 2000);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
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
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${projectName}.toml`);
                const qrImagePath = path.join(utils_1.UPLOAD_DIR, `feishu-qr-${projectName}.png`);
                let scanUrl = null;
                if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
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
                    console.log("[飞书配置] 输出:", (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 500));
                    try {
                        const synced = syncFeishuAppCredentialsToGlobal(configPath, "project");
                        if (synced) {
                            (0, credential_store_1.migrateTomlCredentials)(configPath);
                            console.log("[飞书配置] 配置已同步到全局:", synced.app_id);
                        }
                    }
                    catch { }
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
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            setup_token: setupToken,
                            scan_url: scanUrl,
                            qr_image: qrExists ? `/api/uploads/feishu-qr-${projectName}.png` : null,
                            output: (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 2000),
                        });
                    }
                    catch (e) {
                        (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
                    }
                }, 2000);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 9. 获取项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "GET") {
        let project;
        try {
            project = requireActiveProjectName(parsed.query.project);
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 400);
            return true;
        }
        const configs = (0, db_1.loadProjectConfigs)();
        const configuredCommands = normalizeVerificationCommands(configs[project]?.verification_commands || configs[project]?.verificationCommands || []);
        const inferredCommands = inferProjectVerificationCommands(getProjectWorkDir(project));
        const profile = normalizeProjectAgentProfile(configs[project] || {});
        const toolAuth = (0, tool_authorization_1.buildToolAuthorizationPayload)(configs[project]?.tools || {});
        (0, utils_1.sendJson)(res, {
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
                const configs = (0, db_1.loadProjectConfigs)();
                if (!configs[project])
                    configs[project] = {};
                const previousTools = (0, tool_authorization_1.normalizeToolAuthorization)(configs[project].tools || {});
                const normalizedTools = (0, tool_authorization_1.normalizeToolAuthorization)(tools);
                configs[project].tools = normalizedTools;
                const commands = normalizeVerificationCommands(verification_commands || verificationCommands);
                const profile = normalizeProjectAgentProfile(payload);
                configs[project].verification_commands = commands;
                configs[project].responsibility = profile.responsibility;
                configs[project].capabilities = profile.capabilities;
                configs[project].writable_paths = profile.writable_paths;
                configs[project].forbidden_paths = profile.forbidden_paths;
                configs[project].delivery_contract = profile.delivery_contract;
                (0, db_1.saveProjectConfigs)(configs);
                const toolAuth = await (0, tool_authorization_1.buildFreshToolAuthorizationPayload)(normalizedTools);
                const authorizationChange = (0, tool_authorization_1.recordToolAuthorizationChange)({
                    scope: "project",
                    scopeId: project,
                    previous: previousTools,
                    next: normalizedTools,
                    actor: payload.actor || payload.updated_by || "api",
                    source: "/api/projects/tools",
                    toolAudit: toolAuth.tool_audit,
                    authorizationReadiness: toolAuth.authorization_readiness,
                });
                (0, utils_1.sendJson)(res, { success: true, tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight, authorization_change: authorizationChange, verification_commands: commands, ...profile });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                (0, utils_1.sendJson)(res, applyInferredVerificationCommands({
                    projects: Array.isArray(payload.projects) ? payload.projects.map(project_validation_1.validateProjectName) : payload.projects,
                    overwrite: payload.overwrite,
                }));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 12. 获取项目共享文件
    if (pathname === "/api/projects/shared" && req.method === "GET") {
        let project;
        try {
            project = requireActiveProjectName(parsed.query.project);
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 400);
            return true;
        }
        const configs = (0, db_1.loadProjectConfigs)();
        (0, shared_files_v2_1.migrateLegacySharedFilesV2)("project", project, configs[project]?.shared_files || [], "project-config-v1");
        (0, utils_1.sendJson)(res, { files: (0, shared_files_v2_1.listSharedFilesV2)("project", project) });
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
                const name = (0, project_validation_1.validateSharedFileName)(payload.name);
                const content = String(payload.content || "");
                if (Buffer.byteLength(content, "utf-8") > 1024 * 1024)
                    return (0, utils_1.sendJson)(res, { error: "单个共享文本文件不能超过 1 MB" }, 400);
                const file = (0, shared_files_v2_1.upsertSharedTextV2)("project", project, name, content);
                (0, utils_1.sendJson)(res, { success: true, file, files: (0, shared_files_v2_1.listSharedFilesV2)("project", project) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                const name = (0, project_validation_1.validateSharedFileName)(payload.name);
                const file = (0, shared_files_v2_1.listSharedFilesV2)("project", project).find((item) => item.name === name);
                if (file)
                    (0, shared_files_v2_1.deleteSharedFileV2)("project", project, file.id);
                (0, utils_1.sendJson)(res, { success: true, files: (0, shared_files_v2_1.listSharedFilesV2)("project", project) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 动态路由：获取项目会话列表、详情以及日志 ===
    if (pathname === "/api/projects/folders" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...(0, project_folders_1.getProjectFolderState)() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    if (pathname === "/api/projects/folders" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                (0, utils_1.sendJson)(res, (0, project_folders_1.updateProjectFolderState)(JSON.parse(body || "{}")));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/projects/session-runtime-event" && req.method === "POST") {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "feishu-acp") {
            (0, utils_1.sendJson)(res, { success: false, error: "仅允许签名项目 ACP 通道通知会话变化" }, 403);
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const project = requireActiveProjectName(payload.project);
                const sessionId = (0, project_validation_1.validateSessionId)(payload.sessionId || payload.session_id);
                (0, sessions_1.syncSessions)(project);
                if (!(0, sessions_1.getSessionDetail)(project, sessionId))
                    throw new Error("项目会话不存在");
                (0, runtime_events_1.publishRuntimeEvent)("project", "project.session_messages_changed", {
                    project,
                    sessionId,
                    status: String(payload.status || "changed").slice(0, 40),
                    source: "project-feishu-acp",
                });
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 15. 动态路由: /api/projects/:name/sessions
    const sessionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/);
    if (sessionsMatch && req.method === "GET") {
        try {
            const projectName = requireActiveProjectName(decodeURIComponent(sessionsMatch[1]));
            (0, utils_1.sendJson)(res, { sessions: (0, sessions_1.getSessions)(projectName) });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 400);
        }
        return true;
    }
    // 15. 动态路由: /api/projects/:name/sessions/:id
    const sessionDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions\/([^/]+)$/);
    if (sessionDetailMatch && req.method === "GET") {
        try {
            const projectName = requireActiveProjectName(decodeURIComponent(sessionDetailMatch[1]));
            const sessionId = (0, project_validation_1.validateSessionId)(decodeURIComponent(sessionDetailMatch[2]));
            const detail = (0, sessions_1.getSessionDetail)(projectName, sessionId);
            if (detail)
                (0, utils_1.sendJson)(res, detail);
            else
                (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 400);
        }
        return true;
    }
    // 16. 动态路由: /api/projects/:name/logs
    const logsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/logs$/);
    if (logsMatch && req.method === "GET") {
        try {
            const projectName = requireActiveProjectName(decodeURIComponent(logsMatch[1]));
            const lines = Math.max(1, Math.min(2000, parseInt(parsed.query?.lines) || 100));
            (0, utils_1.sendJson)(res, { logs: getLogs(projectName, lines) });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 400);
        }
        return true;
    }
    return false;
}
//# sourceMappingURL=projects.js.map