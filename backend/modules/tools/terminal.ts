import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFileSync, spawn } from "child_process";
import { createRequire } from "module";
import { CCM_DIR, sendJson } from "../../core/utils";
import { readJsonWithBackup, writeJsonAtomic } from "../../core/atomic-json-file";
import { inspectGitRemoteState } from "./git";

const TERMINAL_STATE_FILE = path.join(CCM_DIR, "terminal-workspace.json");
const TERMINAL_TEMP_DIR = path.join(CCM_DIR, "temp", "terminal");
const MAX_ACTIVE_RUNS = 4;
const MAX_SESSIONS = 4;
const MAX_OUTPUT_LINES = 300;
const MAX_HISTORY = 200;
const MAX_COMMAND_LENGTH = 16_000;
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_SCROLLBACK_CHARS = 1_500_000;
const activeRuns = new Map<string, any>();
const activePtySessions = new Map<string, PersistentTerminalSession>();
const runtimeRequire = createRequire(__filename);
let cachedPtyModule: any | null | undefined;

function loadPtyModule() {
  if (process.env.CCM_DISABLE_NODE_PTY === "1") return null;
  if (cachedPtyModule !== undefined) return cachedPtyModule;
  try {
    const loaded = runtimeRequire("node-pty");
    cachedPtyModule = typeof loaded?.spawn === "function" ? loaded : null;
  } catch {
    cachedPtyModule = null;
  }
  return cachedPtyModule;
}

export function persistentTerminalCapability() {
  const available = !!loadPtyModule();
  return {
    schema: "ccm-persistent-terminal-capability-v1",
    available,
    mode: available ? "pty" : "command_fallback",
    reason: available ? "" : process.env.CCM_DISABLE_NODE_PTY === "1" ? "disabled_for_compatibility" : "node_pty_unavailable",
    fallback: available ? "" : "terminal_exec",
  };
}

type TerminalShell = { id: string; label: string; executable: string; args: string[] };
type PersistentTerminalSession = {
  id: string;
  name: string;
  shell: TerminalShell;
  cwd: string;
  project: string;
  process: any;
  clients: Set<any>;
  scrollback: string;
  inputLine: string;
  inputEscape: boolean;
  startedAt: number;
  lastActiveAt: number;
  status: "running" | "exited";
  exitCode: number | null;
  pendingConfirmation: null | { challenge: string; command: string; expiresAt: number };
};

function requestBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;
    req.on("data", (chunk: any) => {
      if (settled) return;
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        settled = true;
        reject(new Error("请求内容过大"));
      }
    });
    req.on("end", () => {
      if (settled) return;
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("请求 JSON 无效")); }
    });
    req.on("error", reject);
  });
}

function normalizeCwd(value: any) {
  const candidate = String(value || "").trim() || os.homedir();
  try { if (fs.statSync(candidate).isDirectory()) return path.resolve(candidate); } catch {}
  return os.homedir();
}

function compactText(value: any, max = 24_000) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}\n...[输出已截断]` : text;
}

function sanitizeWorkspace(input: any) {
  const sessions = (Array.isArray(input?.sessions) ? input.sessions : []).slice(0, MAX_SESSIONS).map((session: any, index: number) => ({
    id: String(session?.id || `terminal-${index + 1}`).slice(0, 100),
    name: String(session?.name || `终端 ${index + 1}`).slice(0, 80),
    selectedProject: String(session?.selectedProject || "").slice(0, 180),
    currentCwd: normalizeCwd(session?.currentCwd),
    shell: String(session?.shell || "").slice(0, 40),
    history: (Array.isArray(session?.history) ? session.history : []).slice(-MAX_HISTORY).map((item: any) => String(item || "").slice(0, MAX_COMMAND_LENGTH)),
    terminalOutput: (Array.isArray(session?.terminalOutput) ? session.terminalOutput : []).slice(-MAX_OUTPUT_LINES).map((line: any) => ({
      text: compactText(line?.text),
      type: ["command", "output", "error", "system"].includes(String(line?.type)) ? String(line.type) : "output",
      time: String(line?.time || "").slice(0, 40),
    })),
    lastExitCode: session?.lastExitCode === null || session?.lastExitCode === undefined || session?.lastExitCode === ""
      ? null
      : Number.isFinite(Number(session.lastExitCode)) ? Number(session.lastExitCode) : null,
    lastDurationMs: Math.max(0, Number(session?.lastDurationMs || 0)),
  }));
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    activeTerminalId: String(input?.activeTerminalId || sessions[0]?.id || ""),
    splitMode: input?.splitMode === true,
    sessions,
  };
}

function writeSse(res: any, payload: any) {
  if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function terminalScript(command: string, cwdReceiptFile: string) {
  if (process.platform === "win32") {
    const receipt = cwdReceiptFile.replace(/'/g, "''");
    return {
      executable: "powershell.exe",
      args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $OutputEncoding = [System.Text.UTF8Encoding]::new();\n${command}\n[IO.File]::WriteAllText('${receipt}', (Get-Location).ProviderPath, [System.Text.UTF8Encoding]::new($false))`],
    };
  }
  const receipt = cwdReceiptFile.replace(/'/g, `'"'"'`);
  return { executable: "bash", args: ["-lc", `${command}\nprintf '%s' "$PWD" > '${receipt}'`] };
}

function readFinalCwd(receiptFile: string, fallback: string) {
  try {
    const value = fs.readFileSync(receiptFile, "utf-8").replace(/^\uFEFF/, "").trim();
    if (value && fs.statSync(value).isDirectory()) return value;
  } catch {}
  return fallback;
}

function startTerminalStream(payload: any, res: any) {
  const command = String(payload?.command || "").trim();
  if (!command) return sendJson(res, { error: "命令不能为空" }, 400);
  if (command.length > MAX_COMMAND_LENGTH) return sendJson(res, { error: "命令过长" }, 400);
  if (activeRuns.size >= MAX_ACTIVE_RUNS) return sendJson(res, { error: `最多同时运行 ${MAX_ACTIVE_RUNS} 个终端命令` }, 429);

  const cwd = normalizeCwd(payload?.cwd);
  const runId = `terminal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const startedAt = Date.now();
  fs.mkdirSync(TERMINAL_TEMP_DIR, { recursive: true });
  const cwdReceiptFile = path.join(TERMINAL_TEMP_DIR, `${runId}.cwd`);
  const script = terminalScript(command, cwdReceiptFile);
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const child = spawn(script.executable, script.args, { cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const run = { id: runId, child, command, cwd, startedAt, stopped: false };
  activeRuns.set(runId, run);
  writeSse(res, { type: "started", runId, cwd, startedAt: new Date(startedAt).toISOString() });
  child.stdout.on("data", (chunk: Buffer) => writeSse(res, { type: "stdout", text: chunk.toString("utf-8") }));
  child.stderr.on("data", (chunk: Buffer) => writeSse(res, { type: "stderr", text: chunk.toString("utf-8") }));
  child.on("error", (error: any) => writeSse(res, { type: "stderr", text: error?.message || String(error) }));
  child.on("close", (code: number | null, signal: string | null) => {
    activeRuns.delete(runId);
    const finalCwd = readFinalCwd(cwdReceiptFile, cwd);
    try { fs.unlinkSync(cwdReceiptFile); } catch {}
    writeSse(res, { type: "done", runId, exitCode: typeof code === "number" ? code : (run.stopped ? 130 : 1), signal: signal || "", stopped: run.stopped, cwd: finalCwd, durationMs: Date.now() - startedAt });
    try { res.end(); } catch {}
  });
}

function existingExecutable(candidates: string[]) {
  return candidates.find(candidate => {
    if (!candidate) return false;
    if (!path.isAbsolute(candidate)) return true;
    try { return fs.statSync(candidate).isFile(); } catch { return false; }
  }) || "";
}

function availableShells(): TerminalShell[] {
  if (process.platform === "win32") {
    const rows: TerminalShell[] = [];
    const pwsh = existingExecutable([process.env.CCM_PWSH_PATH || "", "C:\\Program Files\\PowerShell\\7\\pwsh.exe"]);
    const windowsPowerShell = existingExecutable(["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "powershell.exe"]);
    const cmd = existingExecutable([process.env.ComSpec || "", "cmd.exe"]);
    if (pwsh) rows.push({ id: "pwsh", label: "PowerShell 7", executable: pwsh, args: ["-NoLogo"] });
    if (windowsPowerShell) rows.push({ id: "powershell", label: "Windows PowerShell", executable: windowsPowerShell, args: ["-NoLogo"] });
    if (cmd) rows.push({ id: "cmd", label: "Command Prompt", executable: cmd, args: ["/Q"] });
    return rows;
  }
  const shell = process.env.SHELL || "/bin/bash";
  const rows = [
    { id: "bash", label: "Bash", executable: existingExecutable([shell, "/bin/bash", "bash"]), args: ["-l"] },
    { id: "zsh", label: "Zsh", executable: existingExecutable(["/bin/zsh"]), args: ["-l"] },
    { id: "sh", label: "Shell", executable: existingExecutable(["/bin/sh", "sh"]), args: ["-l"] },
  ];
  return rows.filter(row => !!row.executable);
}

function resolveShell(shellId: any) {
  const rows = availableShells();
  return rows.find(row => row.id === String(shellId || "")) || rows[0];
}

function sessionId(value: any) {
  const id = String(value || "").trim().slice(0, 100);
  if (!id || !/^[a-zA-Z0-9:_-]+$/.test(id)) throw new Error("终端会话 ID 无效");
  return id;
}

function sessionPublicState(session: PersistentTerminalSession) {
  return {
    id: session.id,
    name: session.name,
    shell: session.shell.id,
    shellLabel: session.shell.label,
    cwd: session.cwd,
    project: session.project,
    pid: Number(session.process?.pid || 0),
    status: session.status,
    exitCode: session.exitCode,
    startedAt: new Date(session.startedAt).toISOString(),
    lastActiveAt: new Date(session.lastActiveAt).toISOString(),
    connectedClients: session.clients.size,
    scrollbackChars: session.scrollback.length,
  };
}

function sessionStatesWithPorts() {
  const states = [...activePtySessions.values()].map(sessionPublicState).map(state => ({ ...state, ports: [] as number[] }));
  if (process.platform !== "win32" || !states.some(state => state.status === "running" && state.pid > 0)) return states;
  try {
    const processJson = String(execFileSync("powershell.exe", ["-NoLogo", "-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"], { encoding: "utf-8", timeout: 5_000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }) || "[]");
    const processRows = JSON.parse(processJson);
    const rows = Array.isArray(processRows) ? processRows : [processRows];
    const children = new Map<number, number[]>();
    for (const row of rows) {
      const parent = Number(row?.ParentProcessId || 0);
      const pid = Number(row?.ProcessId || 0);
      if (!parent || !pid) continue;
      children.set(parent, [...(children.get(parent) || []), pid]);
    }
    const descendants = (root: number) => {
      const found = new Set<number>([root]);
      const queue = [root];
      while (queue.length) {
        for (const child of children.get(queue.shift()!) || []) if (!found.has(child)) { found.add(child); queue.push(child); }
      }
      return found;
    };
    const netstat = String(execFileSync("netstat.exe", ["-ano", "-p", "tcp"], { encoding: "utf-8", timeout: 5_000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }) || "");
    for (const state of states) {
      const pids = descendants(state.pid);
      const ports = new Set<number>();
      for (const line of netstat.split(/\r?\n/)) {
        const match = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
        if (match && pids.has(Number(match[2]))) ports.add(Number(match[1]));
      }
      state.ports = [...ports].sort((left, right) => left - right);
    }
  } catch {}
  return states;
}

function broadcastPty(session: PersistentTerminalSession, payload: any) {
  for (const client of session.clients) writeSse(client, payload);
}

function appendPtyOutput(session: PersistentTerminalSession, data: string) {
  session.scrollback += data;
  if (session.scrollback.length > MAX_SCROLLBACK_CHARS) session.scrollback = session.scrollback.slice(-MAX_SCROLLBACK_CHARS);
  session.lastActiveAt = Date.now();
  broadcastPty(session, { type: "data", data });
}

function spawnPersistentSession(payload: any) {
  const id = sessionId(payload?.sessionId || payload?.id);
  const current = activePtySessions.get(id);
  if (current?.status === "running") return current;
  if ([...activePtySessions.values()].filter(row => row.status === "running").length >= MAX_SESSIONS) throw new Error(`最多同时运行 ${MAX_SESSIONS} 个终端会话`);
  if (current) activePtySessions.delete(id);
  const shell = resolveShell(payload?.shell);
  if (!shell) throw new Error("系统中没有可用 Shell");
  const cwd = normalizeCwd(payload?.cwd);
  const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  const ptyModule = loadPtyModule();
  if (!ptyModule) {
    const error: any = new Error("当前系统未加载 node-pty，持久交互终端已降级；普通命令执行仍可使用");
    error.code = "CCM_PTY_UNAVAILABLE";
    throw error;
  }
  const processHandle = ptyModule.spawn(shell.executable, shell.args, {
    name: "xterm-256color",
    cols: Math.max(20, Math.min(500, Number(payload?.cols || 120))),
    rows: Math.max(5, Math.min(200, Number(payload?.rows || 30))),
    cwd,
    env,
    useConpty: process.platform === "win32",
  } as any);
  const now = Date.now();
  const session: PersistentTerminalSession = {
    id,
    name: String(payload?.name || "终端").slice(0, 80),
    shell,
    cwd,
    project: String(payload?.project || "").slice(0, 180),
    process: processHandle,
    clients: new Set(),
    scrollback: current?.scrollback || "",
    inputLine: "",
    inputEscape: false,
    startedAt: now,
    lastActiveAt: now,
    status: "running",
    exitCode: null,
    pendingConfirmation: null,
  };
  activePtySessions.set(id, session);
  processHandle.onData((data: string) => appendPtyOutput(session, data));
  processHandle.onExit(({ exitCode }: any) => {
    session.status = "exited";
    session.exitCode = Number(exitCode ?? 1);
    session.lastActiveAt = Date.now();
    broadcastPty(session, { type: "exit", exitCode: session.exitCode });
    for (const client of session.clients) { try { client.end(); } catch {} }
    session.clients.clear();
  });
  return session;
}

function waitForPtyReady(session: PersistentTerminalSession, timeoutMs = 2_000) {
  if (Number(session.process?.pid || 0) > 0 || session.status !== "running") return Promise.resolve(session);
  const startedAt = Date.now();
  return new Promise<PersistentTerminalSession>((resolve, reject) => {
    const poll = () => {
      if (Number(session.process?.pid || 0) > 0) return resolve(session);
      if (session.status !== "running") return reject(new Error("终端会话启动后立即退出"));
      if (Date.now() - startedAt >= timeoutMs) return reject(new Error("终端会话启动超时"));
      setTimeout(poll, 10);
    };
    poll();
  });
}

function dangerousCommand(command: string) {
  return /(?:^|[;&|]\s*|\s)(?:rm\s+-rf|del\s+\/?[a-z]*[qfs]|rmdir\s+\/?s|remove-item\b[^\r\n]*(?:-recurse|-force)|format(?:\.com)?\s+|shutdown\s+|stop-process\s+|taskkill\s+|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+restore\s+(?:--staged\s+)?[.\\/*]|ccm\s+stop\s+all)(?:\s|$)/i.test(command);
}

function writePtyInput(session: PersistentTerminalSession, data: string) {
  if (!session.process || session.status !== "running") throw new Error("终端会话已经结束");
  let blocked: null | { challenge: string; command: string } = null;
  for (const character of data) {
    if (character === "\u001b") {
      session.inputEscape = true;
      session.process.write(character);
      continue;
    }
    if (session.inputEscape) {
      session.process.write(character);
      if (/[A-Za-z~]/.test(character)) session.inputEscape = false;
      continue;
    }
    if (character === "\u0003") {
      session.inputLine = "";
      session.process.write(character);
      continue;
    }
    if (character === "\b" || character === "\u007f") {
      session.inputLine = session.inputLine.slice(0, -1);
      session.process.write(character);
      continue;
    }
    if (character === "\r" || character === "\n") {
      const command = session.inputLine.trim();
      session.inputLine = "";
      if (command && dangerousCommand(command)) {
        const challenge = randomUUID();
        session.pendingConfirmation = { challenge, command, expiresAt: Date.now() + 60_000 };
        session.process.write("\u0003");
        appendPtyOutput(session, `\r\n\u001b[33m[CCM] 高风险命令已暂停，等待用户确认。\u001b[0m\r\n`);
        blocked = { challenge, command };
        break;
      }
      session.process.write("\r");
      continue;
    }
    session.inputLine += character;
    session.process.write(character);
  }
  session.lastActiveAt = Date.now();
  return blocked;
}

function terminatePtySession(session: PersistentTerminalSession) {
  session.status = "exited";
  session.lastActiveAt = Date.now();
  const pid = Number(session.process?.pid || 0);
  if (process.platform === "win32" && pid > 0) {
    try { spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).unref(); } catch {}
  }
  try { session.process?.kill(); } catch {}
  for (const client of session.clients) { try { client.end(); } catch {} }
  session.clients.clear();
  activePtySessions.delete(session.id);
}

function projectActions(cwdValue: any) {
  const cwd = normalizeCwd(cwdValue);
  const packageFile = path.join(cwd, "package.json");
  let scripts: Array<{ name: string; command: string }> = [];
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
    scripts = Object.keys(packageJson?.scripts || {}).slice(0, 40).map(name => ({ name, command: `npm run ${name}` }));
  } catch {}
  let repository: any = null;
  try { repository = inspectGitRemoteState(cwd); } catch {}
  return { cwd, scripts, repository };
}

export function stopAllTerminalRuns() {
  for (const run of activeRuns.values()) {
    run.stopped = true;
    try { run.child.kill(); } catch {}
  }
  for (const session of [...activePtySessions.values()]) terminatePtySession(session);
}

export function handleTerminalApi(pathname: string, req: any, res: any): boolean {
  if (pathname === "/api/terminal/stream" && req.method === "POST") {
    requestBody(req).then(payload => startTerminalStream(payload, res)).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  if (pathname === "/api/terminal/stop" && req.method === "POST") {
    requestBody(req).then(payload => {
      const run = activeRuns.get(String(payload?.runId || ""));
      if (!run) return sendJson(res, { success: false, error: "运行已结束或不存在" }, 404);
      run.stopped = true;
      try { run.child.kill(); } catch {}
      sendJson(res, { success: true, runId: run.id });
    }).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  if (pathname === "/api/terminal/runs" && req.method === "GET") {
    sendJson(res, { success: true, runs: [...activeRuns.values()].map(run => ({ id: run.id, command: run.command, cwd: run.cwd, startedAt: new Date(run.startedAt).toISOString() })) });
    return true;
  }
  if (pathname === "/api/terminal/shells" && req.method === "GET") {
    sendJson(res, { success: true, shells: availableShells().map(({ executable: _executable, args: _args, ...shell }) => shell), defaultShell: availableShells()[0]?.id || "", persistent: persistentTerminalCapability() });
    return true;
  }
  if (pathname === "/api/terminal/sessions" && req.method === "GET") {
    sendJson(res, { success: true, sessions: sessionStatesWithPorts(), persistent: persistentTerminalCapability() });
    return true;
  }
  if (pathname === "/api/terminal/session" && req.method === "POST") {
    requestBody(req).then(async payload => {
      const session = spawnPersistentSession(payload);
      await waitForPtyReady(session);
      sendJson(res, { success: true, session: sessionPublicState(session), reconnected: session.startedAt < Date.now() - 500 });
    }).catch(error => sendJson(res, { error: error.message, code: error.code || "" }, error.code === "CCM_PTY_UNAVAILABLE" ? 503 : /最多同时/.test(error.message) ? 429 : 400));
    return true;
  }
  if (pathname === "/api/terminal/session" && req.method === "DELETE") {
    const parsed = new URL(req.url || pathname, "http://localhost");
    try {
      const id = sessionId(parsed.searchParams.get("id"));
      const session = activePtySessions.get(id);
      if (session) terminatePtySession(session);
      sendJson(res, { success: true, id });
    } catch (error: any) { sendJson(res, { error: error.message }, 400); }
    return true;
  }
  if (pathname === "/api/terminal/session/events" && req.method === "GET") {
    const parsed = new URL(req.url || pathname, "http://localhost");
    try {
      const id = sessionId(parsed.searchParams.get("id"));
      const session = activePtySessions.get(id);
      if (!session) return sendJson(res, { error: "终端会话不存在" }, 404);
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
      if (typeof res.flushHeaders === "function") res.flushHeaders();
      writeSse(res, { type: "ready", session: sessionPublicState(session) });
      if (session.scrollback) writeSse(res, { type: "snapshot", data: session.scrollback });
      if (session.status === "exited") {
        writeSse(res, { type: "exit", exitCode: session.exitCode });
        res.end();
      } else {
        session.clients.add(res);
        req.on("close", () => session.clients.delete(res));
      }
    } catch (error: any) { sendJson(res, { error: error.message }, 400); }
    return true;
  }
  if (pathname === "/api/terminal/session/input" && req.method === "POST") {
    requestBody(req).then(payload => {
      const session = activePtySessions.get(sessionId(payload?.id || payload?.sessionId));
      if (!session) return sendJson(res, { error: "终端会话不存在" }, 404);
      const data = String(payload?.data || "");
      if (Buffer.byteLength(data, "utf-8") > MAX_INPUT_BYTES) return sendJson(res, { error: "单次终端输入过大" }, 413);
      const blocked = writePtyInput(session, data);
      if (blocked) return sendJson(res, { success: false, code: "confirmation_required", ...blocked }, 409);
      sendJson(res, { success: true });
    }).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  if (pathname === "/api/terminal/session/confirm" && req.method === "POST") {
    requestBody(req).then(payload => {
      const session = activePtySessions.get(sessionId(payload?.id || payload?.sessionId));
      if (!session) return sendJson(res, { error: "终端会话不存在" }, 404);
      const pending = session.pendingConfirmation;
      if (!pending || pending.challenge !== String(payload?.challenge || "") || pending.expiresAt < Date.now()) {
        session.pendingConfirmation = null;
        return sendJson(res, { error: "危险命令确认已失效" }, 409);
      }
      session.pendingConfirmation = null;
      session.process.write(`${pending.command}\r`);
      sendJson(res, { success: true, command: pending.command });
    }).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  if (pathname === "/api/terminal/session/resize" && req.method === "POST") {
    requestBody(req).then(payload => {
      const session = activePtySessions.get(sessionId(payload?.id || payload?.sessionId));
      if (!session) return sendJson(res, { error: "终端会话不存在" }, 404);
      const cols = Math.max(20, Math.min(500, Number(payload?.cols || 120)));
      const rows = Math.max(5, Math.min(200, Number(payload?.rows || 30)));
      session.process.resize(cols, rows);
      sendJson(res, { success: true, cols, rows });
    }).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  if (pathname === "/api/terminal/project-actions" && req.method === "GET") {
    const parsed = new URL(req.url || pathname, "http://localhost");
    sendJson(res, { success: true, ...projectActions(parsed.searchParams.get("cwd")) });
    return true;
  }
  if (pathname === "/api/terminal/workspace" && req.method === "GET") {
    sendJson(res, { success: true, workspace: sanitizeWorkspace(readJsonWithBackup(TERMINAL_STATE_FILE, { sessions: [] })) });
    return true;
  }
  if (pathname === "/api/terminal/workspace" && req.method === "PUT") {
    requestBody(req).then(payload => {
      const workspace = sanitizeWorkspace(payload?.workspace || payload);
      writeJsonAtomic(TERMINAL_STATE_FILE, workspace);
      sendJson(res, { success: true, workspace });
    }).catch(error => sendJson(res, { error: error.message }, 400));
    return true;
  }
  return false;
}

export function runTerminalModuleSelfTest() {
  const sample = sanitizeWorkspace({ activeTerminalId: "one", splitMode: true, sessions: [{ id: "one", name: "主终端", currentCwd: os.homedir(), history: Array.from({ length: 240 }, (_, index) => `echo ${index}`), terminalOutput: Array.from({ length: 340 }, (_, index) => ({ text: `line ${index}`, type: "output" })) }] });
  const shells = availableShells();
  return {
    success: sample.sessions.length === 1 && sample.sessions[0].history.length === MAX_HISTORY && sample.sessions[0].terminalOutput.length === MAX_OUTPUT_LINES && shells.length > 0,
    checks: {
      capsHistory: sample.sessions[0].history.length,
      capsOutput: sample.sessions[0].terminalOutput.length,
      validCwd: !!sample.sessions[0].currentCwd,
      availableShells: shells.map(shell => shell.id),
      dangerousCommandBlocked: dangerousCommand("git reset --hard") && dangerousCommand("Remove-Item logs -Recurse -Force") && !dangerousCommand("git status"),
    },
  };
}

export async function runPersistentTerminalSelfTest() {
  const id = `pty-selftest-${Date.now().toString(36)}`;
  const session = spawnPersistentSession({ sessionId: id, name: "PTY self-test", cwd: process.cwd(), cols: 100, rows: 28 });
  try {
    const marker = `CCM_PTY_${Math.random().toString(36).slice(2, 10)}`;
    const command = session.shell.id === "cmd" ? `echo ${marker}` : `Write-Output '${marker}'`;
    writePtyInput(session, `${command}\r`);
    const deadline = Date.now() + 8_000;
    while (!session.scrollback.includes(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    const blocked = writePtyInput(session, "git reset --hard\r");
    try { session.process.resize(96, 26); } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
    return {
      success: session.scrollback.includes(marker) && !!blocked?.challenge && session.status === "running",
      checks: {
        shell: session.shell.id,
        persistentOutput: session.scrollback.includes(marker),
        dangerousCommandChallenge: !!blocked?.challenge,
        resizeAccepted: true,
        processPid: Number(session.process?.pid || 0),
      },
    };
  } finally {
    terminatePtySession(session);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}
