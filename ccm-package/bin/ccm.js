#!/usr/bin/env node

const { execFileSync, spawn, spawnSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PACKAGE_FILE = path.join(PACKAGE_ROOT, "package.json");
const SERVER_FILE = path.join(PACKAGE_ROOT, "dist", "server.js");
const PUBLIC_INDEX = path.join(PACKAGE_ROOT, "public", "index.html");
const LEGACY_CLI = path.join(__dirname, "legacy-project-cli.js");
const PACKAGE_INFO = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf-8"));
const PACKAGE_NAME = PACKAGE_INFO.name;
const VERSION = PACKAGE_INFO.version;
const CCM_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
const RUN_DIR = path.join(CCM_DIR, "run");
const LOG_DIR = path.join(CCM_DIR, "logs");
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const SERVER_LOCK_FILE = path.resolve(process.env.CCM_SERVER_LOCK_FILE || path.join(RUN_DIR, "ccm-server-instance.lock"));
const SERVER_LOG_FILE = path.join(LOG_DIR, "ccm-server.log");
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code, value) => useColor ? `\u001b[${code}m${value}\u001b[0m` : String(value);
const style = {
  title: value => color("1;36", value),
  strong: value => color("1", value),
  muted: value => color("90", value),
  success: value => color("32", value),
  warning: value => color("33", value),
  danger: value => color("31", value),
  link: value => color("4;36", value),
};

function ensureRuntimeDirs() {
  for (const dir of [CCM_DIR, RUN_DIR, LOG_DIR, CONFIGS_DIR, PID_DIR]) fs.mkdirSync(dir, { recursive: true });
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function readServerState() {
  const owner = readJson(SERVER_LOCK_FILE, null);
  const pid = Number(owner?.pid || 0);
  const active = !!owner && (!owner.hostname || owner.hostname === os.hostname()) && processAlive(pid);
  return {
    active,
    pid: active ? pid : 0,
    port: Number(owner?.port || 3080),
    host: String(owner?.listen_host || "127.0.0.1"),
    acquiredAt: owner?.acquired_at || "",
    lockFile: SERVER_LOCK_FILE,
    stale: !!owner && !active,
  };
}

function validPort(value, fallback = 3080) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`端口无效：${value}`);
  return parsed;
}

function validHost(value, fallback = "127.0.0.1") {
  let host = String(value || fallback).trim().replace(/^\[|\]$/g, "");
  if (host === "*") host = "0.0.0.0";
  if (!host || host.length > 253 || !/^[a-zA-Z0-9._:-]+$/.test(host)) throw new Error(`监听地址无效：${value}`);
  return host;
}

function formatHostUrl(host, port) {
  return `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
}

function serviceUrls(host, port) {
  const localUrl = `http://localhost:${port}`;
  let remoteUrls = [];
  if (["0.0.0.0", "::"].includes(host)) {
    const addresses = new Set();
    for (const rows of Object.values(os.networkInterfaces())) {
      for (const row of rows || []) if (!row.internal && row.family === "IPv4") addresses.add(formatHostUrl(row.address, port));
    }
    remoteUrls = [...addresses];
  } else if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    remoteUrls = [formatHostUrl(host, port)];
  }
  return { localUrl, remoteUrls, url: remoteUrls[0] || localUrl };
}

function optionValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("-") ? args[index + 1] : fallback;
}

function hasFlag(args, ...names) {
  return names.some(name => args.includes(name));
}

function divider() {
  console.log(style.muted("-".repeat(62)));
}

function printHeader(subtitle = "Local AI Agent Workspace") {
  console.log();
  console.log(`${style.title("CCM Workspace")}  ${style.muted(`v${VERSION}`)}`);
  console.log(style.muted(subtitle));
  divider();
}

function printHelp() {
  printHeader("Command line control center");
  console.log(`${style.strong("Usage")}  ccm <command> [options]\n`);
  console.log(style.strong("Workspace service"));
  console.log("  start [--port 3080] [--host 127.0.0.1] [...] Start CCM");
  console.log("  stop [web]                                  Stop CCM");
  console.log("  restart [--background] [--open]              Restart CCM");
  console.log("  status [--json]                              Service and project status");
  console.log("  open [--port 3080]                           Open the workspace");
  console.log("  logs [--lines 120] [--follow]                Read background logs");
  console.log("  doctor [--json]                              Check local readiness\n");
  console.log(style.strong("Projects and extensions"));
  console.log("  project list                                 List projects");
  console.log("  project start <name> [agent]                 Start one project");
  console.log("  project stop <name|all>                      Stop project processes");
  console.log("  project init                                 Create a legacy config");
  console.log("  agents                                      List supported Agents");
  console.log("  pet [stop]                                  Control desktop pet\n");
  console.log(style.strong("Package"));
  console.log("  update --check                              Check npm latest");
  console.log("  update                                      Install npm latest globally");
  console.log("  version                                     Print version");
  console.log("  help                                        Show this help\n");
  console.log(style.muted("Compatibility: start/stop <project>, start/stop all, --list and --init remain available."));
}

function canConnect(port, timeoutMs = 600) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForPort(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  return false;
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === "win32") {
    command = "cmd.exe";
    args = ["/d", "/s", "/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const child = spawn(command, args, { detached: true, windowsHide: true, stdio: "ignore" });
  child.unref();
}

async function startWorkspace(args = []) {
  ensureRuntimeDirs();
  const requestedPort = validPort(optionValue(args, "--port", 3080));
  const requestedHost = validHost(optionValue(args, "--host", process.env.CCM_HOST || "127.0.0.1"));
  const existing = readServerState();
  if (existing.active) {
    const urls = serviceUrls(existing.host, existing.port);
    printHeader("Workspace service");
    console.log(`${style.success("RUNNING")}  PID ${existing.pid}`);
    console.log(`${style.muted("Listen")}   ${existing.host}:${existing.port}`);
    console.log(`${style.muted("URL")}      ${style.link(urls.url)}`);
    if (hasFlag(args, "--open")) openBrowser(urls.localUrl);
    return 0;
  }
  if (!fs.existsSync(SERVER_FILE) || !fs.existsSync(PUBLIC_INDEX)) {
    console.error(style.danger("CCM 运行文件不完整，请重新安装或执行 npm run build。"));
    return 1;
  }
  const urls = serviceUrls(requestedHost, requestedPort);
  const background = hasFlag(args, "--background", "-d");
  if (background) {
    const logFd = fs.openSync(SERVER_LOG_FILE, "a");
    fs.writeSync(logFd, `\n[${new Date().toISOString()}] ccm start --background\n`);
    const child = spawn(process.execPath, [SERVER_FILE, String(requestedPort)], {
      cwd: PACKAGE_ROOT,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, CCM_HOST: requestedHost },
    });
    child.unref();
    fs.closeSync(logFd);
    const ready = await waitForPort(requestedPort);
    printHeader("Workspace service");
    if (!ready) {
      console.error(`${style.danger("FAILED")}   服务没有在 20 秒内就绪`);
      console.error(`${style.muted("Log")}      ${SERVER_LOG_FILE}`);
      return 1;
    }
    const state = readServerState();
    console.log(`${style.success("STARTED")}  PID ${state.pid || child.pid}`);
    console.log(`${style.muted("Listen")}   ${requestedHost}:${requestedPort}`);
    console.log(`${style.muted("URL")}      ${style.link(urls.url)}`);
    for (const remoteUrl of urls.remoteUrls.slice(1)) console.log(`${style.muted("Network")}  ${style.link(remoteUrl)}`);
    console.log(`${style.muted("Log")}      ${SERVER_LOG_FILE}`);
    console.log(`${style.muted("Stop")}     ccm stop`);
    if (hasFlag(args, "--open")) openBrowser(urls.localUrl);
    return 0;
  }

  if (hasFlag(args, "--open")) void waitForPort(requestedPort).then(ready => { if (ready) openBrowser(urls.localUrl); });
  const child = spawn(process.execPath, [SERVER_FILE, String(requestedPort), requestedHost], {
    cwd: PACKAGE_ROOT,
    windowsHide: false,
    stdio: "inherit",
    env: { ...process.env, CCM_HOST: requestedHost },
  });
  return await new Promise(resolve => {
    child.once("error", error => {
      console.error(style.danger(`启动失败：${error.message}`));
      resolve(1);
    });
    child.once("exit", code => resolve(Number(code || 0)));
  });
}

async function stopWorkspace({ quiet = false } = {}) {
  const state = readServerState();
  if (!state.active) {
    if (state.stale) { try { fs.unlinkSync(SERVER_LOCK_FILE); } catch {} }
    if (!quiet) {
      printHeader("Workspace service");
      console.log(style.muted("STOPPED  当前没有运行中的 CCM 服务"));
    }
    return 0;
  }
  try { process.kill(state.pid, "SIGTERM"); } catch {}
  const deadline = Date.now() + 6_000;
  while (processAlive(state.pid) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 200));
  if (processAlive(state.pid)) {
    try {
      if (process.platform === "win32") execFileSync("taskkill.exe", ["/PID", String(state.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else process.kill(state.pid, "SIGKILL");
    } catch {}
  }
  if (!processAlive(state.pid)) { try { fs.unlinkSync(SERVER_LOCK_FILE); } catch {} }
  if (!quiet) {
    printHeader("Workspace service");
    console.log(`${style.success("STOPPED")}  PID ${state.pid}`);
  }
  return processAlive(state.pid) ? 1 : 0;
}

function configuredProjects() {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs.readdirSync(CONFIGS_DIR).filter(file => file.endsWith(".toml")).sort().map(file => {
    const name = file.replace(/^config-/, "").replace(/\.toml$/, "");
    const pidFile = path.join(PID_DIR, `${name}.pid`);
    const pid = Number(fs.existsSync(pidFile) ? fs.readFileSync(pidFile, "utf-8").trim() : 0);
    return { name, running: processAlive(pid), pid: processAlive(pid) ? pid : 0, config: path.join(CONFIGS_DIR, file) };
  });
}

function statusPayload() {
  const service = readServerState();
  const urls = serviceUrls(service.host, service.port);
  const projects = configuredProjects();
  return {
    package: { name: PACKAGE_NAME, version: VERSION },
    service: { ...service, ...urls },
    projects,
    summary: { projects: projects.length, runningProjects: projects.filter(project => project.running).length },
    dataDirectory: CCM_DIR,
  };
}

function showStatus(args = []) {
  const payload = statusPayload();
  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  printHeader("Runtime status");
  console.log(`${style.strong("Workspace")}  ${payload.service.active ? style.success("RUNNING") : style.muted("STOPPED")}${payload.service.active ? `  PID ${payload.service.pid}` : ""}`);
  console.log(`${style.muted("Listen")}     ${payload.service.host}:${payload.service.port}`);
  console.log(`${style.muted("URL")}        ${style.link(payload.service.url)}`);
  console.log(`${style.muted("Projects")}   ${payload.summary.runningProjects}/${payload.summary.projects} running`);
  console.log(`${style.muted("Data")}       ${payload.dataDirectory}`);
  if (payload.projects.length) {
    console.log();
    for (const project of payload.projects) console.log(`  ${project.running ? style.success("RUN") : style.muted("OFF")}  ${project.name}${project.pid ? style.muted(`  PID ${project.pid}`) : ""}`);
  }
  return 0;
}

function executableAvailable(name) {
  try {
    const command = process.platform === "win32" ? "where.exe" : "which";
    execFileSync(command, [name], { windowsHide: true, stdio: "ignore", timeout: 3_000 });
    return true;
  } catch { return false; }
}

function persistentPtyProbe() {
  if (process.env.CCM_DISABLE_NODE_PTY === "1") return { ok: false, reason: "disabled_for_compatibility" };
  try {
    const loaded = require("node-pty");
    return { ok: typeof loaded?.spawn === "function", reason: typeof loaded?.spawn === "function" ? "" : "invalid_module" };
  } catch {
    return { ok: false, reason: "node_pty_unavailable" };
  }
}

function doctorPayload() {
  ensureRuntimeDirs();
  const major = Number(process.versions.node.split(".")[0]);
  const pty = persistentPtyProbe();
  const checks = [
    { id: "node", label: `Node.js ${process.version}`, ok: major >= 20, required: true },
    { id: "server", label: "Backend runtime", ok: fs.existsSync(SERVER_FILE), required: true },
    { id: "frontend", label: "Frontend assets", ok: fs.existsSync(PUBLIC_INDEX), required: true },
    { id: "pty", label: pty.ok ? "Persistent PTY" : "Persistent PTY (command fallback active)", ok: pty.ok, required: false, degraded: !pty.ok, reason: pty.reason },
    { id: "data", label: "Data directory writable", ok: (() => { try { fs.accessSync(CCM_DIR, fs.constants.W_OK); return true; } catch { return false; } })(), required: true },
    { id: "cc-connect", label: "cc-connect CLI", ok: executableAvailable("cc-connect"), required: false },
    ...["claude", "codex", "cursor", "gemini", "opencode"].map(name => ({ id: name, label: `${name} CLI`, ok: executableAvailable(name), required: false })),
  ];
  return { success: checks.filter(check => check.required).every(check => check.ok), checks, service: readServerState(), dataDirectory: CCM_DIR };
}

function showDoctor(args = []) {
  const payload = doctorPayload();
  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(payload, null, 2));
    return payload.success ? 0 : 1;
  }
  printHeader("Environment diagnostics");
  for (const check of payload.checks) {
    const mark = check.ok ? style.success("PASS") : check.required ? style.danger("FAIL") : style.warning("MISS");
    console.log(`  ${mark.padEnd(useColor ? 14 : 6)} ${check.label}${!check.required ? style.muted("  optional") : ""}`);
  }
  console.log();
  console.log(payload.success ? style.success("Required runtime checks passed.") : style.danger("Required runtime checks failed."));
  return payload.success ? 0 : 1;
}

function showLogs(args = []) {
  const lines = Math.max(10, Math.min(2_000, Number(optionValue(args, "--lines", 120)) || 120));
  if (!fs.existsSync(SERVER_LOG_FILE)) {
    console.log(style.muted(`暂无后台日志：${SERVER_LOG_FILE}`));
    return 0;
  }
  const printTail = () => {
    const rows = fs.readFileSync(SERVER_LOG_FILE, "utf-8").split(/\r?\n/);
    console.log(rows.slice(-lines).join("\n"));
  };
  printTail();
  if (hasFlag(args, "--follow", "-f")) {
    let size = fs.statSync(SERVER_LOG_FILE).size;
    fs.watchFile(SERVER_LOG_FILE, { interval: 500 }, current => {
      if (current.size < size) size = 0;
      if (current.size === size) return;
      const fd = fs.openSync(SERVER_LOG_FILE, "r");
      const buffer = Buffer.alloc(current.size - size);
      fs.readSync(fd, buffer, 0, buffer.length, size);
      fs.closeSync(fd);
      size = current.size;
      process.stdout.write(buffer.toString("utf-8"));
    });
  }
  return 0;
}

function delegateLegacy(args) {
  const result = spawnSync(process.execPath, [LEGACY_CLI, ...args], { stdio: "inherit", windowsHide: false, env: process.env });
  return Number(result.status || 0);
}

function projectCommand(args) {
  const [action = "list", ...rest] = args;
  if (["list", "ls"].includes(action)) return delegateLegacy(["--list"]);
  if (action === "start") return delegateLegacy(["start", ...rest]);
  if (action === "stop") return delegateLegacy(["stop", ...rest]);
  if (action === "init") return delegateLegacy(["--init"]);
  if (action === "agents") return delegateLegacy(["agents"]);
  if (action === "interactive") return delegateLegacy(["interactive"]);
  console.error(style.danger(`未知 project 命令：${action}`));
  return 1;
}

function npmInvocation() {
  const cli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (fs.existsSync(cli)) return { command: process.execPath, prefix: [cli] };
  return { command: "npm", prefix: [] };
}

function latestVersion() {
  const npm = npmInvocation();
  try { return String(execFileSync(npm.command, [...npm.prefix, "view", PACKAGE_NAME, "version", "--json"], { encoding: "utf-8", windowsHide: true, timeout: 90_000 }).trim()).replace(/^"|"$/g, ""); }
  catch (error) {
    if (process.env.CCM_CLI_DEBUG === "1") console.error(error?.message || error);
    return "";
  }
}

function compareVersions(left, right) {
  const a = String(left || "0").split(/[.-]/).slice(0, 3).map(value => Number(value) || 0);
  const b = String(right || "0").split(/[.-]/).slice(0, 3).map(value => Number(value) || 0);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return 1;
    if ((a[index] || 0) < (b[index] || 0)) return -1;
  }
  return 0;
}

function updatePackage(args = []) {
  const latest = latestVersion();
  printHeader("Package update");
  if (!latest) {
    console.error(style.danger("无法读取 npm registry 版本。"));
    return 1;
  }
  console.log(`${style.muted("Current")}  ${VERSION}`);
  console.log(`${style.muted("Latest")}   ${latest}`);
  const comparison = compareVersions(latest, VERSION);
  if (comparison <= 0) {
    console.log(comparison === 0 ? style.success("Already up to date.") : style.muted("Current build is newer than the npm registry."));
    return 0;
  }
  if (hasFlag(args, "--check")) {
    console.log(style.warning(`Run "ccm update" to install ${latest}.`));
    return 0;
  }
  const npm = npmInvocation();
  const result = spawnSync(npm.command, [...npm.prefix, "install", "-g", `${PACKAGE_NAME}@latest`], { stdio: "inherit", windowsHide: false });
  return Number(result.status || 0);
}

async function main() {
  ensureRuntimeDirs();
  const args = process.argv.slice(2);
  const command = String(args[0] || "help").toLowerCase();
  const rest = args.slice(1);

  if (["help", "--help", "-h"].includes(command)) return printHelp() || 0;
  if (["version", "--version", "-v"].includes(command)) { console.log(`${PACKAGE_NAME} ${VERSION}`); return 0; }
  if (command === "status") return showStatus(rest);
  if (command === "doctor") return showDoctor(rest);
  if (command === "open") {
    const state = readServerState();
    const port = validPort(optionValue(rest, "--port", state.port || 3080));
    openBrowser(`http://localhost:${port}`);
    console.log(`Opening ${style.link(`http://localhost:${port}`)}`);
    return 0;
  }
  if (command === "logs") return showLogs(rest);
  if (command === "update") return updatePackage(rest);
  if (command === "project") return projectCommand(rest);
  if (command === "projects") return projectCommand(["interactive", ...rest]);
  if (["agents", "pet"].includes(command)) return delegateLegacy([command, ...rest]);
  if (["--list", "-l"].includes(command)) return delegateLegacy(["--list", ...rest]);
  if (command === "--init") return delegateLegacy(["--init", ...rest]);

  if (["start", "serve", "web"].includes(command)) {
    const projectTarget = command === "start" && rest[0] && !rest[0].startsWith("-") && rest[0] !== "web";
    if (projectTarget) return delegateLegacy(["start", ...rest]);
    return startWorkspace(command === "start" ? rest : command === "web" ? rest : rest);
  }
  if (command === "stop") {
    const target = rest[0];
    if (target && !target.startsWith("-") && !["web", "server"].includes(target)) return delegateLegacy(["stop", ...rest]);
    return stopWorkspace();
  }
  if (command === "restart") {
    const stopped = await stopWorkspace({ quiet: true });
    if (stopped !== 0) return stopped;
    return startWorkspace(rest);
  }

  return delegateLegacy(args);
}

main().then(code => { process.exitCode = Number(code || 0); }).catch(error => {
  console.error(style.danger(error?.message || String(error)));
  process.exitCode = 1;
});
