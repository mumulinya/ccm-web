import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import type { InternalMcpTaskContext } from "./internal-mcp-runtime";
import { appendInternalMcpTaskJournal } from "./internal-mcp-task-store";
import { createCommandLiveProgress } from "../system/command-live-progress";

type CommandStatus = "running" | "completed" | "failed" | "cancelled" | "timed_out" | "needs_recheck";

type CommandRun = {
  id: string;
  revision: number;
  taskId: string;
  generation: number;
  attempt: number;
  leaseId: string;
  project: string;
  cwd: string;
  description: string;
  commandChecksum: string;
  pid: number;
  status: CommandStatus;
  startedAt: string;
  completedAt?: string;
  exitCode?: number | null;
  outputFile: string;
  outputChecksum?: string;
  totalOutputBytes: number;
  child?: ChildProcess;
  timeout?: NodeJS.Timeout;
  context?: InternalMcpTaskContext;
  liveProgress?: ReturnType<typeof createCommandLiveProgress>;
};

const ROOT = path.resolve(process.env.CCM_TASK_COMMAND_RUN_DIR || path.join(os.homedir(), ".cc-connect", "private", "task-command-runs"));
const runs = new Map<string, CommandRun>();
const MAX_FOREGROUND_OUTPUT = 30_000;
const MAX_FAILURE_OUTPUT = 10_000;
const MAX_PERSISTED_OUTPUT = 2 * 1024 * 1024;

function checksum(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function within(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveWorkingDirectory(context: InternalMcpTaskContext, requested: unknown) {
  const root = path.resolve(context.workDir || context.baseWorkDir);
  const candidate = path.resolve(root, String(requested || "."));
  if (!within(root, candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
    throw new Error("命令工作目录不在当前受控项目或隔离工作区内");
  }
  return candidate;
}

function validateCommand(command: string) {
  if (!command.trim()) throw new Error("命令不能为空");
  if (command.length > 8_000) throw new Error("命令过长，请拆分后执行");
  const denied = [
    /\brm\s+-rf\s+(?:\/|~|\$HOME)\b/i,
    /\b(?:format|diskpart|cipher\s+\/w)\b/i,
    /\bRemove-Item\b[^\r\n]*(?:-Recurse|-Force)[^\r\n]*(?:\$HOME|~|[A-Za-z]:\\\s*$)/i,
    /\b(?:curl|wget|Invoke-WebRequest)\b[^\r\n]*(?:token|secret|password|credential)/i,
    /\b(?:set|export|env)\b[^\r\n]*(?:TOKEN|SECRET|PASSWORD|CREDENTIAL)/i,
    /\b(?:while\s*\(\s*true\s*\)|while\s+true|for\s*\(\s*;;\s*\))\b/i,
    /\b(?:sleep|Start-Sleep)\s+(?:[6-9]\d{2,}|\d{4,})\b/i,
  ];
  if (denied.some(pattern => pattern.test(command))) throw new Error("该命令需要通过现有高风险操作授权流程执行");
}

function metadata(run: CommandRun) {
  return {
    schema: "ccm-task-command-run-v1",
    id: run.id,
    revision: run.revision,
    taskId: run.taskId,
    generation: run.generation,
    attempt: run.attempt,
    leaseId: run.leaseId,
    project: run.project,
    cwd: run.cwd,
    description: run.description,
    commandChecksum: run.commandChecksum,
    pid: run.pid,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt || "",
    exitCode: run.exitCode ?? null,
    outputChecksum: run.outputChecksum || "",
    totalOutputBytes: run.totalOutputBytes,
    contentStored: false,
  };
}

function persist(run: CommandRun) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(path.join(ROOT, `${run.id}.json`), JSON.stringify(metadata(run), null, 2), { encoding: "utf-8", mode: 0o600 });
}

function publicRun(run: CommandRun) {
  return {
    schema: "ccm-task-command-result-v1",
    command_run_id: run.id,
    revision: run.revision,
    description: run.description,
    status: run.status,
    working_directory: run.cwd,
    started_at: run.startedAt,
    completed_at: run.completedAt || "",
    exit_code: run.exitCode ?? null,
    output_checksum: run.outputChecksum || "",
    total_output_bytes: run.totalOutputBytes,
    contentStored: false,
  };
}

function taskIdentity(context: InternalMcpTaskContext) {
  return String(context.taskId || context.projectSessionId || "");
}

function assertBoundRun(context: InternalMcpTaskContext, id: string) {
  let run = runs.get(id);
  if (!run) {
    const file = path.join(ROOT, `${path.basename(id)}.json`);
    if (!fs.existsSync(file)) throw new Error("未找到命令运行记录");
    const stored = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (String(stored.taskId || "") !== taskIdentity(context) || String(stored.project || "") !== String(context.project || "")) {
      throw new Error("无权读取其他任务的命令运行记录");
    }
    run = {
      id: String(stored.id), revision: Number(stored.revision || 1), taskId: String(stored.taskId),
      generation: Number(stored.generation || 0), attempt: Number(stored.attempt || 1), leaseId: String(stored.leaseId || ""),
      project: String(stored.project), cwd: String(stored.cwd), description: String(stored.description),
      commandChecksum: String(stored.commandChecksum), pid: Number(stored.pid || 0), status: "needs_recheck",
      startedAt: String(stored.startedAt), completedAt: String(stored.completedAt || ""), exitCode: stored.exitCode,
      outputFile: path.join(ROOT, `${path.basename(id)}.log`), outputChecksum: String(stored.outputChecksum || ""),
      totalOutputBytes: Number(stored.totalOutputBytes || 0),
    };
  }
  if (run.taskId !== taskIdentity(context) || run.project !== String(context.project || "")) throw new Error("命令运行与当前任务绑定不一致");
  return run;
}

function stopTree(run: CommandRun) {
  if (!run.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(run.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else {
    try { process.kill(-run.pid, "SIGTERM"); } catch { try { run.child?.kill("SIGTERM"); } catch {} }
  }
}

function finish(run: CommandRun, status: CommandStatus, code: number | null) {
  if (run.status !== "running") return;
  if (run.timeout) clearTimeout(run.timeout);
  run.status = status;
  run.exitCode = code;
  run.completedAt = new Date().toISOString();
  run.revision += 1;
  try {
    const bytes = fs.existsSync(run.outputFile) ? fs.readFileSync(run.outputFile) : Buffer.alloc(0);
    run.totalOutputBytes = bytes.length;
    run.outputChecksum = checksum(bytes);
  } catch {}
  persist(run);
  run.liveProgress?.finish(status);
  if (run.context) {
    try {
      appendInternalMcpTaskJournal(run.context, "progress", {
        command_run_id: run.id, status: run.status, description: run.description,
        exit_code: run.exitCode ?? null, output_checksum: run.outputChecksum || "",
        total_output_bytes: run.totalOutputBytes, contentStored: false,
      }, {
        type: "internal_mcp_command_finished",
        title: `${run.description}${run.status === "completed" ? "已完成" : run.status === "cancelled" ? "已停止" : "未通过"}`,
        detail: run.status === "completed" ? "命令运行已收口" : `命令状态：${run.status}`,
        status: run.status === "completed" ? "passed" : run.status === "cancelled" ? "warning" : "failed",
        phase: "execution",
      });
    } catch {}
  }
  const expiry = setTimeout(() => { try { fs.rmSync(run.outputFile, { force: true }); } catch {} }, 10 * 60_000);
  expiry.unref?.();
}

function tailOutput(run: CommandRun, limit: number) {
  if (!fs.existsSync(run.outputFile)) return "";
  const text = fs.readFileSync(run.outputFile, "utf-8");
  return text.length > limit ? text.slice(-limit) : text;
}

export async function runTaskBoundCommand(context: InternalMcpTaskContext, args: any) {
  const command = String(args?.command || "");
  validateCommand(command);
  const description = String(args?.description || "").trim().slice(0, 160);
  if (!description) throw new Error("必须提供用户可理解的命令用途说明");
  const cwd = resolveWorkingDirectory(context, args?.working_directory);
  const timeoutMs = Math.max(10_000, Math.min(600_000, Number(args?.timeout_ms || 120_000)));
  const id = `command-${crypto.randomUUID()}`;
  fs.mkdirSync(ROOT, { recursive: true });
  const outputFile = path.join(ROOT, `${id}.log`);
  const output = fs.createWriteStream(outputFile, { flags: "wx", mode: 0o600 });
  const child = spawn(command, [], {
    cwd,
    shell: true,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const run: CommandRun = {
    id, revision: 1, taskId: taskIdentity(context), generation: Number(context.communicationGeneration || context.nativeGeneration || context.boundaryGeneration || 0),
    attempt: Math.max(1, Number(context.communicationAttempt || 1)), leaseId: String(context.communicationLeaseId || ""),
    project: String(context.project || ""), cwd, description, commandChecksum: checksum(command), pid: Number(child.pid || 0),
    status: "running", startedAt: new Date().toISOString(), outputFile, totalOutputBytes: 0, child, context,
  };
  const exactSessionId = String(context.groupSessionId || context.projectSessionId || "");
  if (exactSessionId) {
    run.liveProgress = createCommandLiveProgress({
      commandRunId: id,
      taskId: taskIdentity(context),
      scope: context.groupId ? "group" : "project",
      scopeId: String(context.groupId || context.project || ""),
      exactSessionId,
      generation: run.generation,
      attempt: run.attempt,
      anchorMessageId: context.anchorMessageId,
      description,
    });
  }
  runs.set(id, run);
  persist(run);
  try {
    appendInternalMcpTaskJournal(context, "progress", {
      command_run_id: run.id, status: "running", description, command_checksum: run.commandChecksum,
      timeout_ms: timeoutMs, background: args?.run_in_background === true, contentStored: false,
    }, { type: "internal_mcp_command_started", title: description, detail: "项目命令已启动", status: "active", phase: "execution" });
  } catch {}
  let written = 0;
  const write = (prefix: string, chunk: Buffer) => {
    if (written >= MAX_PERSISTED_OUTPUT) return;
    const available = Math.max(0, MAX_PERSISTED_OUTPUT - written);
    const value = Buffer.from(`${prefix}${chunk.toString("utf-8")}`).subarray(0, available);
    output.write(value);
    written += value.length;
  };
  child.stdout?.on("data", (chunk: Buffer) => { write("", chunk); run.liveProgress?.observe(chunk); });
  child.stderr?.on("data", (chunk: Buffer) => { write("[stderr] ", chunk); run.liveProgress?.observe(chunk); });
  child.on("error", error => { write("[error] ", Buffer.from(error.message)); output.end(); finish(run, "failed", null); });
  child.on("close", code => { output.end(); finish(run, code === 0 ? "completed" : "failed", code); });
  run.timeout = setTimeout(() => { stopTree(run); finish(run, "timed_out", null); }, timeoutMs);
  run.timeout.unref?.();
  if (args?.run_in_background === true) return { success: true, ...publicRun(run) };
  await new Promise<void>(resolve => {
    if (run.status !== "running") return resolve();
    child.once("close", () => resolve());
    child.once("error", () => resolve());
  });
  const outputText = tailOutput(run, run.status === "completed" ? MAX_FOREGROUND_OUTPUT : MAX_FAILURE_OUTPUT);
  return { success: run.status === "completed", ...publicRun(run), output: outputText, truncated: run.totalOutputBytes > outputText.length };
}

export function getTaskBoundCommandOutput(context: InternalMcpTaskContext, args: any) {
  const run = assertBoundRun(context, String(args?.command_run_id || ""));
  const offset = Math.max(0, Number(args?.offset || 0));
  const limit = Math.max(1, Math.min(30_000, Number(args?.limit || 10_000)));
  const text = fs.existsSync(run.outputFile) ? fs.readFileSync(run.outputFile, "utf-8") : "";
  return {
    success: true,
    ...publicRun(run),
    output: text.slice(offset, offset + limit),
    next_offset: offset + Math.min(limit, Math.max(0, text.length - offset)),
    truncated: offset + limit < text.length,
    ...(run.status === "needs_recheck" ? { warning: "服务重启后无法可靠确认原进程身份，需要重新核验" } : {}),
  };
}

export function stopTaskBoundCommand(context: InternalMcpTaskContext, args: any) {
  const run = assertBoundRun(context, String(args?.command_run_id || ""));
  if (Number(args?.revision) !== run.revision) throw Object.assign(new Error("命令运行状态已变化，请刷新后重试"), { code: "COMMAND_REVISION_CONFLICT" });
  if (run.status === "needs_recheck") throw new Error("服务重启后无法安全确认原进程身份，请人工核验");
  if (run.status !== "running") return { success: true, ...publicRun(run) };
  stopTree(run);
  finish(run, "cancelled", null);
  return { success: true, ...publicRun(run) };
}
