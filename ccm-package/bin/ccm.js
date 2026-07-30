#!/usr/bin/env node

const { execFileSync, spawn, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  canTerminateVerifiedProcess,
  inspectService,
  portAcceptsConnections,
  processAlive,
  processIdentityFingerprint,
  readJson,
  readTail,
  rotateLogFiles,
  waitForVerifiedReady,
  writeJsonAtomic,
} = require("./service-runtime");
const {
  prepareUpdate,
  readUpdateTransaction,
  rollbackInstalledUpdate,
  switchPreparedUpdate,
} = require("./update-runtime");

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
const SERVICE_CONFIG_FILE = path.join(RUN_DIR, "service-config-v2.json");
const UPDATE_DIR = path.join(CCM_DIR, "updates");
const UPDATE_TRANSACTION_FILE = path.join(UPDATE_DIR, "current.json");
const UPDATE_LOCK_FILE = path.join(UPDATE_DIR, "update.lock");
const INTERNAL_SECRET_FILE = path.join(CCM_DIR, "auth", "internal-api-secret");
const PROCESS_LIFECYCLE_FILE = path.join(CCM_DIR, "reliability", "process-lifecycle", "current.json");
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
const STARTUP_TIMEOUT_MS = Math.min(
  180_000,
  Math.max(10_000, Number(process.env.CCM_STARTUP_TIMEOUT_MS || 60_000)),
);

function ensureRuntimeDirs() {
  for (const dir of [CCM_DIR, RUN_DIR, LOG_DIR, CONFIGS_DIR, PID_DIR]) fs.mkdirSync(dir, { recursive: true });
}

async function readServerState() {
  return inspectService(SERVER_LOCK_FILE, internalApiHeaders, {
    defaultPort: 3080,
    defaultHost: "127.0.0.1",
  });
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

async function terminateSpawnedChild(child) {
  const pid = Number(child?.pid || 0);
  if (!pid || !processAlive(pid)) {
    child?.unref?.();
    return;
  }
  try { child.kill("SIGTERM"); } catch {}
  await new Promise(resolve => setTimeout(resolve, 1_000));
  if (processAlive(pid)) {
    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  }
  child?.unref?.();
}

function internalApiHeaders(caller, method, pathname) {
  fs.mkdirSync(path.dirname(INTERNAL_SECRET_FILE), { recursive: true });
  if (!fs.existsSync(INTERNAL_SECRET_FILE)) {
    try { fs.writeFileSync(INTERNAL_SECRET_FILE, `${crypto.randomBytes(48).toString("base64url")}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" }); } catch (error) { if (error?.code !== "EEXIST") throw error; }
  }
  const secret = fs.readFileSync(INTERNAL_SECRET_FILE, "utf-8").trim();
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(18).toString("base64url");
  const payload = ["ccm-internal-api-v1", caller, String(method).toUpperCase(), pathname, timestamp, nonce].join("\n");
  return {
    "X-CCM-Internal-Caller": caller,
    "X-CCM-Internal-Timestamp": timestamp,
    "X-CCM-Internal-Nonce": nonce,
    "X-CCM-Internal-Signature": crypto.createHmac("sha256", secret).update(payload).digest("base64url"),
  };
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
  console.log("  start [--port 3080] [--host 127.0.0.1] [--public-origin URL] Start CCM");
  console.log("  stop [web]                                  Stop CCM");
  console.log("  restart [--background] [--open]              Restart CCM");
  console.log("  status [--json]                              Service and project status");
  console.log("  open [--port 3080]                           Open the workspace");
  console.log("  logs [--lines 120] [--follow]                Read background logs");
  console.log("  doctor [--json]                              Check local readiness");
  console.log("  setup-code [--rotate]                        Show or rotate first-install code\n");
  console.log(style.strong("Projects and extensions"));
  console.log("  project list                                 List projects");
  console.log("  project connect <name> [agent]               Connect project Agent");
  console.log("  project disconnect <name|all>                Disconnect project Agent");
  console.log("  project runtime <start|stop|restart|build> <name> --profile ID");
  console.log("  project init                                 Create a legacy config");
  console.log("  agents                                      List supported Agents");
  console.log("  pet [stop]                                  Control desktop pet\n");
  console.log(style.strong("Package"));
  console.log("  update [--check|--prepare|--switch]          Verify and transactionally update");
  console.log("  update --status | --rollback                 Inspect or roll back an update");
  console.log("  version                                     Print version");
  console.log("  help                                        Show this help\n");
  console.log(style.muted("Compatibility: start/stop <project>, start/stop all, --list and --init remain available."));
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
  const publicOrigin = optionValue(args, "--public-origin", process.env.CCM_PUBLIC_ORIGIN || "");
  const existing = await readServerState();
  if (existing.active) {
    const urls = serviceUrls(existing.host, existing.port);
    printHeader("Workspace service");
    console.log(`${style.success("RUNNING")}  PID ${existing.pid}`);
    console.log(`${style.muted("Listen")}   ${existing.host}:${existing.port}`);
    console.log(`${style.muted("URL")}      ${style.link(urls.url)}`);
    if (hasFlag(args, "--open")) openBrowser(urls.localUrl);
    return 0;
  }
  if (existing.ownershipState === "ownership_unproven") {
    printHeader("Workspace service");
    console.error(`${style.danger("BLOCKED")}  发现存活进程但无法证明它属于当前CCM实例`);
    console.error(`${style.muted("Code")}     ownership_unproven`);
    console.error(`${style.muted("Lock")}     ${SERVER_LOCK_FILE}`);
    return 1;
  }
  if (!fs.existsSync(SERVER_FILE) || !fs.existsSync(PUBLIC_INDEX)) {
    console.error(style.danger("CCM 运行文件不完整，请重新安装或执行 npm run build。"));
    return 1;
  }
  const urls = serviceUrls(requestedHost, requestedPort);
  const background = hasFlag(args, "--background", "-d");
  if (await portAcceptsConnections(requestedHost, requestedPort)) {
    printHeader("Workspace service");
    console.error(`${style.danger("FAILED")}   端口 ${requestedPort} 已被其他服务占用`);
    console.error(`${style.muted("Code")}     port_in_use`);
    return 1;
  }
  if (background) {
    rotateLogFiles(SERVER_LOG_FILE);
    const logFd = fs.openSync(SERVER_LOG_FILE, "a");
    fs.writeSync(logFd, `\n[${new Date().toISOString()}] ccm start --background\n`);
    const child = spawn(process.execPath, [SERVER_FILE, String(requestedPort)], {
      cwd: PACKAGE_ROOT,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        CCM_HOST: requestedHost,
        CCM_PUBLIC_ORIGIN: publicOrigin,
        CCM_LAUNCH_MODE: "background",
        CCM_RUNTIME_VERSION: VERSION,
        CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: process.env.CCM_STARTUP_PREPARE_LOCAL_EMBEDDING || "1",
      },
    });
    fs.closeSync(logFd);
    const readiness = await waitForVerifiedReady(
      SERVER_LOCK_FILE,
      { port: requestedPort, host: requestedHost, packageVersion: VERSION },
      internalApiHeaders,
      child,
      STARTUP_TIMEOUT_MS,
    );
    printHeader("Workspace service");
    if (!readiness.ready) {
      console.error(`${style.danger("FAILED")}   服务未通过身份与就绪校验（${readiness.code || "not_ready"}）`);
      if (readiness.state) {
        console.error(`${style.muted("Identity")} ${readiness.state.ownershipState || "unknown"}`);
        console.error(`${style.muted("Lifecycle")} ${readiness.state.lifecycleState || "unknown"}`);
      }
      console.error(`${style.muted("Log")}      ${SERVER_LOG_FILE}`);
      await terminateSpawnedChild(child);
      return 1;
    }
    child.unref();
    const state = readiness.state;
    writeJsonAtomic(SERVICE_CONFIG_FILE, {
      schema: "ccm-service-launch-config-v2",
      revision: Number(readJson(SERVICE_CONFIG_FILE, {})?.revision || 0) + 1,
      host: requestedHost,
      port: requestedPort,
      public_origin: publicOrigin,
      launch_mode: "background",
      package_version: VERSION,
      updated_at: new Date().toISOString(),
    });
    console.log(`${style.success("STARTED")}  PID ${state.pid || child.pid}`);
    console.log(`${style.muted("Listen")}   ${requestedHost}:${requestedPort}`);
    console.log(`${style.muted("URL")}      ${style.link(urls.url)}`);
    for (const remoteUrl of urls.remoteUrls.slice(1)) console.log(`${style.muted("Network")}  ${style.link(remoteUrl)}`);
    console.log(`${style.muted("Log")}      ${SERVER_LOG_FILE}`);
    console.log(`${style.muted("Stop")}     ccm stop`);
    if (hasFlag(args, "--open")) openBrowser(urls.localUrl);
    return 0;
  }

  const child = spawn(process.execPath, [SERVER_FILE, String(requestedPort), requestedHost], {
    cwd: PACKAGE_ROOT,
    windowsHide: false,
    stdio: "inherit",
    env: {
      ...process.env,
      CCM_HOST: requestedHost,
      CCM_PUBLIC_ORIGIN: publicOrigin,
      CCM_LAUNCH_MODE: "foreground",
      CCM_RUNTIME_VERSION: VERSION,
      CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: process.env.CCM_STARTUP_PREPARE_LOCAL_EMBEDDING || "1",
    },
  });
  const readiness = await waitForVerifiedReady(
    SERVER_LOCK_FILE,
    { port: requestedPort, host: requestedHost, packageVersion: VERSION },
    internalApiHeaders,
    child,
    STARTUP_TIMEOUT_MS,
  );
  if (!readiness.ready) {
    console.error(style.danger(`启动失败：${readiness.code || "服务未通过身份校验"}`));
    await terminateSpawnedChild(child);
    return 1;
  }
  writeJsonAtomic(SERVICE_CONFIG_FILE, {
    schema: "ccm-service-launch-config-v2",
    revision: Number(readJson(SERVICE_CONFIG_FILE, {})?.revision || 0) + 1,
    host: requestedHost,
    port: requestedPort,
    public_origin: publicOrigin,
    launch_mode: "foreground",
    package_version: VERSION,
    updated_at: new Date().toISOString(),
  });
  if (hasFlag(args, "--open")) openBrowser(urls.localUrl);
  return await new Promise(resolve => {
    child.once("error", error => {
      console.error(style.danger(`启动失败：${error.message}`));
      resolve(1);
    });
    child.once("exit", code => resolve(Number(code || 0)));
  });
}

async function stopWorkspace({ quiet = false } = {}) {
  const state = await readServerState();
  if (!state.active) {
    if (!quiet) {
      printHeader("Workspace service");
      if (state.ownershipState === "ownership_unproven") {
        console.error(style.danger("BLOCKED  存活进程身份无法证明，已拒绝停止以避免误杀"));
        console.error(`${style.muted("Code")}     ownership_unproven`);
      } else {
        console.log(style.muted("STOPPED  当前没有经过身份验证的CCM服务"));
      }
    }
    return state.ownershipState === "ownership_unproven" ? 1 : 0;
  }
  try {
    const identityPath = "/api/internal/lifecycle/drain";
    const host = ["0.0.0.0", "::"].includes(state.host) ? (state.host === "::" ? "[::1]" : "127.0.0.1") : (state.host.includes(":") ? `[${state.host}]` : state.host);
    const response = await fetch(`http://${host}:${state.port}${identityPath}`, {
      method: "POST",
      headers: internalApiHeaders("ccm-cli", "POST", identityPath),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    if (!quiet) console.error(style.danger(`停止请求未被经过验证的服务接受：${error.message}`));
    return 1;
  }
  const deadline = Date.now() + 12_000;
  while (processAlive(state.pid) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 200));
  if (processAlive(state.pid)) {
    if (!canTerminateVerifiedProcess(state)) {
      if (!quiet) console.error(style.danger("服务排空超时，且进程身份已无法再次证明；已拒绝强制结束"));
      return 1;
    }
    try {
      if (process.platform === "win32") execFileSync("taskkill.exe", ["/PID", String(state.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else process.kill(state.pid, "SIGKILL");
    } catch {}
  }
  if (!quiet) {
    printHeader("Workspace service");
    if (!processAlive(state.pid)) console.log(`${style.success("STOPPED")}  PID ${state.pid}`);
    else console.error(`${style.danger("FAILED")}   PID ${state.pid} 仍在运行`);
  }
  return processAlive(state.pid) ? 1 : 0;
}

function configuredProjects() {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs.readdirSync(CONFIGS_DIR).filter(file => file.endsWith(".toml")).sort().map(file => {
    const name = file.replace(/^config-/, "").replace(/\.toml$/, "");
    const pidFile = path.join(PID_DIR, `${name}.pid`);
    const identity = readJson(pidFile, null);
    const pid = Number(identity?.pid || 0);
    const fingerprint = processIdentityFingerprint(pid);
    const running = identity?.schema === "ccm-project-process-v2"
      && processAlive(pid)
      && !!fingerprint
      && fingerprint === identity.process_fingerprint;
    return {
      name,
      running,
      pid: running ? pid : 0,
      ownershipState: processAlive(pid) && !running ? "ownership_unproven" : running ? "verified" : "stopped",
      config: path.join(CONFIGS_DIR, file),
    };
  });
}

async function statusPayload() {
  const service = await readServerState();
  const publicOwner = service.owner ? {
    schema: service.owner.schema,
    instance_id: service.owner.instance_id,
    boot_id: service.owner.boot_id,
    pid: service.owner.pid,
    process_fingerprint: service.owner.process_fingerprint,
    entry_checksum: service.owner.entry_checksum,
    port: service.owner.port,
    listen_host: service.owner.listen_host,
    public_origin: service.owner.public_origin,
    launch_mode: service.owner.launch_mode,
    package_version: service.owner.package_version,
    acquired_at: service.owner.acquired_at,
    data_directory: service.owner.data_directory,
  } : null;
  const urls = serviceUrls(service.host, service.port);
  const projects = configuredProjects();
  return {
    package: { name: PACKAGE_NAME, version: VERSION },
    service: { ...service, owner: publicOwner, ...urls },
    projects,
    summary: { projects: projects.length, runningProjects: projects.filter(project => project.running).length },
    dataDirectory: CCM_DIR,
  };
}

async function showStatus(args = []) {
  const payload = await statusPayload();
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

function bundledPackageVersion(name) {
  try {
    const packageFile = require.resolve(`${name}/package.json`, { paths: [PACKAGE_ROOT] });
    return String(require(packageFile).version || "");
  } catch { return ""; }
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

async function doctorPayload() {
  ensureRuntimeDirs();
  const major = Number(process.versions.node.split(".")[0]);
  const pty = persistentPtyProbe();
  const bundledCcConnect = bundledPackageVersion("cc-connect");
  const checks = [
    { id: "node", label: `Node.js ${process.version}`, ok: major >= 20, required: true },
    { id: "server", label: "Backend runtime", ok: fs.existsSync(SERVER_FILE), required: true },
    { id: "frontend", label: "Frontend assets", ok: fs.existsSync(PUBLIC_INDEX), required: true },
    { id: "pty", label: pty.ok ? "Persistent PTY" : "Persistent PTY (command fallback active)", ok: pty.ok, required: false, degraded: !pty.ok, reason: pty.reason },
    { id: "data", label: "Data directory writable", ok: (() => { try { fs.accessSync(CCM_DIR, fs.constants.W_OK); return true; } catch { return false; } })(), required: true },
    { id: "cc-connect", label: bundledCcConnect ? `cc-connect v${bundledCcConnect} (bundled)` : "cc-connect CLI", ok: !!bundledCcConnect || executableAvailable("cc-connect"), required: false },
    ...["claude", "codex", "cursor", "gemini", "opencode"].map(name => ({ id: name, label: `${name} CLI`, ok: executableAvailable(name), required: false })),
  ];
  const service = await readServerState();
  if (service.owner) service.owner = { ...service.owner, token: undefined };
  const update = readUpdateTransaction(UPDATE_TRANSACTION_FILE);
  const lifecycle = readJson(PROCESS_LIFECYCLE_FILE, null);
  return {
    success: checks.filter(check => check.required).every(check => check.ok),
    checks,
    service,
    update: update ? {
      id: update.id,
      state: update.state,
      previous_version: update.previous_version,
      target_version: update.target_version,
      updated_at: update.updated_at,
      failure: update.failure || update.switch_error || update.rollback_error || null,
      recovery_action: update.state === "recovery_required"
        ? "ccm update --rollback"
        : update.state === "staged"
          ? "ccm update --switch"
          : "",
    } : null,
    lifecycle: lifecycle ? {
      status: lifecycle.status,
      boot_id: lifecycle.boot_id,
      pid: lifecycle.pid,
      started_at: lifecycle.started_at,
      shutdown_at: lifecycle.shutdown_at,
      shutdown_category: lifecycle.shutdown_category,
      shutdown_reason: lifecycle.shutdown_reason,
      exit_code: lifecycle.exit_code,
    } : null,
    dataDirectory: CCM_DIR,
  };
}

async function showDoctor(args = []) {
  const payload = await doctorPayload();
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
    console.log(readTail(SERVER_LOG_FILE, lines));
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

async function callInternalJson(pathname, method, body) {
  const state = await readServerState();
  if (!state.active) throw new Error("CCM服务未运行或身份无法证明");
  const host = ["0.0.0.0", "::"].includes(state.host)
    ? (state.host === "::" ? "[::1]" : "127.0.0.1")
    : (state.host.includes(":") ? `[${state.host}]` : state.host);
  const response = await fetch(`http://${host}:${state.port}${pathname}`, {
    method,
    headers: {
      ...internalApiHeaders("ccm-cli", method, pathname),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => ({ success: false, error: `HTTP ${response.status}` }));
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error || `HTTP ${response.status}`);
    error.code = payload?.code || "";
    throw error;
  }
  return payload;
}

async function projectCommand(args) {
  const [action = "list", ...rest] = args;
  if (["list", "ls"].includes(action)) return delegateLegacy(["--list"]);
  if (["connect", "start"].includes(action)) {
    if (action === "start") console.warn(style.warning('DEPRECATED  请改用 "ccm project connect"'));
    return delegateLegacy(["start", ...rest]);
  }
  if (["disconnect", "stop"].includes(action)) {
    if (action === "stop") console.warn(style.warning('DEPRECATED  请改用 "ccm project disconnect"'));
    return delegateLegacy(["stop", ...rest]);
  }
  if (action === "runtime") {
    const [runtimeAction, project] = rest;
    if (!["start", "stop", "restart", "build"].includes(runtimeAction) || !project) {
      console.error(style.danger("用法：ccm project runtime <start|stop|restart|build> <project> --profile <id>"));
      return 1;
    }
    const profileId = optionValue(rest, "--profile", "");
    if (!profileId) {
      console.error(style.danger("必须使用 --profile 指定精确运行配置"));
      return 1;
    }
    try {
      const result = await callInternalJson("/api/projects/runtime/action", "POST", {
        project,
        profile_id: profileId,
        action: runtimeAction,
      });
      console.log(JSON.stringify(result, null, 2));
      return 0;
    } catch (error) {
      console.error(style.danger(`项目运行操作失败：${error.message}`));
      return 1;
    }
  }
  if (action === "init") return delegateLegacy(["--init"]);
  if (action === "agents") return delegateLegacy(["agents"]);
  if (action === "interactive") return delegateLegacy(["interactive"]);
  console.error(style.danger(`未知 project 命令：${action}`));
  return 1;
}

function showSetupCode(args = []) {
  const authModule = require(path.join(PACKAGE_ROOT, "dist", "modules", "system", "local-auth.js"));
  const result = authModule.getOrCreateLocalSetupCode({ rotate: hasFlag(args, "--rotate") });
  printHeader("First-install security");
  console.log(`${style.muted("Setup code")}  ${style.strong(result.code)}`);
  console.log(`${style.muted("Expires")}     ${result.expires_at}`);
  console.log(style.muted("One-time use; accepted only while no account exists."));
  return 0;
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

function acquireUpdateLock() {
  fs.mkdirSync(UPDATE_DIR, { recursive: true });
  try {
    const fd = fs.openSync(UPDATE_LOCK_FILE, "wx", 0o600);
    fs.writeFileSync(fd, `${JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() })}\n`, "utf-8");
    fs.closeSync(fd);
    return () => { try { fs.unlinkSync(UPDATE_LOCK_FILE); } catch {} };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const owner = readJson(UPDATE_LOCK_FILE, null);
    if (owner?.pid && !processAlive(Number(owner.pid))) {
      try { fs.unlinkSync(UPDATE_LOCK_FILE); } catch {}
      return acquireUpdateLock();
    }
    const locked = new Error("已有更新事务正在执行");
    locked.code = "update_busy";
    throw locked;
  }
}

async function startInstalledPackage(packageRoot, launchConfiguration) {
  const cli = path.join(packageRoot, "bin", "ccm.js");
  const packageVersion = String(readJson(path.join(packageRoot, "package.json"), {})?.version || "");
  const config = launchConfiguration?.schema === "ccm-service-launch-config-v2" ? launchConfiguration : {};
  const host = validHost(config.host || "127.0.0.1");
  const port = validPort(config.port || 3080);
  const args = ["start", "--host", host, "--port", String(port)];
  if (config.public_origin) args.push("--public-origin", String(config.public_origin));
  const env = { ...process.env, CCM_TASK_STORE_DIR: CCM_DIR };
  if (config.launch_mode !== "foreground") {
    const result = spawnSync(process.execPath, [cli, ...args, "--background"], {
      stdio: "inherit",
      windowsHide: true,
      env,
      timeout: 60_000,
    });
    return Number(result.status || 0);
  }
  const launcher = spawn(process.execPath, [cli, ...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env,
  });
  launcher.unref();
  const ready = await waitForVerifiedReady(
    SERVER_LOCK_FILE,
    { host, port, packageVersion },
    internalApiHeaders,
    null,
    30_000,
  );
  return ready.ready ? 0 : 1;
}

async function updatePackage(args = []) {
  if (hasFlag(args, "--status")) {
    printHeader("Package update");
    console.log(JSON.stringify(readUpdateTransaction(UPDATE_TRANSACTION_FILE), null, 2));
    return 0;
  }
  const existingTransaction = readUpdateTransaction(UPDATE_TRANSACTION_FILE);
  const transactionAction = hasFlag(args, "--switch", "--rollback");
  const latest = optionValue(args, "--target", "")
    || (transactionAction ? String(existingTransaction?.target_version || "") : latestVersion());
  printHeader("Package update");
  if (!latest) {
    console.error(style.danger("无法读取 npm registry 版本。"));
    return 1;
  }
  console.log(`${style.muted("Current")}  ${VERSION}`);
  console.log(`${style.muted("Latest")}   ${latest}`);
  const comparison = compareVersions(latest, VERSION);
  if (!transactionAction && comparison <= 0) {
    console.log(comparison === 0 ? style.success("Already up to date.") : style.muted("Current build is newer than the npm registry."));
    return 0;
  }
  if (hasFlag(args, "--check")) {
    console.log(style.warning(`Run "ccm update" to install ${latest}.`));
    return 0;
  }
  const releaseLock = acquireUpdateLock();
  const launchConfiguration = readJson(SERVICE_CONFIG_FILE, {
    schema: "ccm-service-launch-config-v2",
    host: "127.0.0.1",
    port: 3080,
    public_origin: "",
    launch_mode: "background",
  });
  const context = {
    ccmDir: CCM_DIR,
    currentVersion: VERSION,
    npm: npmInvocation(),
    packageName: PACKAGE_NAME,
    transactionFile: UPDATE_TRANSACTION_FILE,
    launchConfiguration,
    stopService: () => stopWorkspace({ quiet: true }),
    startService: startInstalledPackage,
  };
  try {
    if (hasFlag(args, "--rollback")) {
      const transaction = readUpdateTransaction(UPDATE_TRANSACTION_FILE);
      const result = await rollbackInstalledUpdate(context, transaction);
      console.log(JSON.stringify(result, null, 2));
      return result.state === "rolled_back" ? 0 : 1;
    }
    let transaction = hasFlag(args, "--switch") ? readUpdateTransaction(UPDATE_TRANSACTION_FILE) : null;
    if (!transaction || !hasFlag(args, "--switch")) transaction = await prepareUpdate(context, latest);
    if (hasFlag(args, "--prepare")) {
      console.log(`${style.success("STAGED")}   ${transaction.target_version}`);
      console.log(style.muted('Run "ccm update --switch" to activate the verified package.'));
      return 0;
    }
    const result = await switchPreparedUpdate(context, transaction);
    console.log(`${result.state === "completed" ? style.success("UPDATED") : result.state === "rolled_back" ? style.warning("ROLLED BACK") : style.danger("RECOVERY REQUIRED")}  ${result.target_version}`);
    return result.state === "completed" ? 0 : 1;
  } catch (error) {
    const transaction = readUpdateTransaction(UPDATE_TRANSACTION_FILE);
    if (transaction) {
      transaction.state = "recovery_required";
      transaction.failure = { at: new Date().toISOString(), message: String(error?.message || error).slice(0, 2000) };
      transaction.updated_at = transaction.failure.at;
      writeJsonAtomic(UPDATE_TRANSACTION_FILE, transaction);
    }
    console.error(style.danger(`更新失败：${error?.message || error}`));
    return 1;
  } finally {
    releaseLock();
  }
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
  if (command === "setup-code") return showSetupCode(rest);
  if (command === "open") {
    const state = await readServerState();
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
    const previous = readJson(SERVICE_CONFIG_FILE, null);
    const stopped = await stopWorkspace({ quiet: true });
    if (stopped !== 0) return stopped;
    const inherited = [...rest];
    if (previous?.schema === "ccm-service-launch-config-v2") {
      if (!hasFlag(inherited, "--port")) inherited.push("--port", String(previous.port || 3080));
      if (!hasFlag(inherited, "--host")) inherited.push("--host", String(previous.host || "127.0.0.1"));
      if (!hasFlag(inherited, "--public-origin") && previous.public_origin) inherited.push("--public-origin", String(previous.public_origin));
      if (!hasFlag(inherited, "--background", "-d") && previous.launch_mode === "background") inherited.push("--background");
    }
    return startWorkspace(inherited);
  }

  return delegateLegacy(args);
}

main().then(code => { process.exitCode = Number(code || 0); }).catch(error => {
  console.error(style.danger(error?.message || String(error)));
  process.exitCode = 1;
});
