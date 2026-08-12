import { spawn } from "child_process";
import { rgPath as bundledRipgrepPath } from "@vscode/ripgrep";

export type WorkspaceSearchEngine = "bundled_rg" | "system_rg" | "node_fallback";

export type WorkspaceSearchExecution = {
  engine: WorkspaceSearchEngine;
  timedOut: boolean;
  cancelled: boolean;
  partial: boolean;
};

export type WorkspaceSearchRunResult = WorkspaceSearchExecution & {
  stdout: string;
  stderr?: string;
};

export type WorkspaceSearchRunOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutputBytes?: number;
  nodeFallback: () => Promise<WorkspaceSearchRunResult>;
};

const DEFAULT_TIMEOUT_MS = process.env.WSL_DISTRO_NAME ? 60_000 : 20_000;
const DEFAULT_MAX_OUTPUT_BYTES = 20 * 1024 * 1024;

function completeLines(buffer: Buffer) {
  const text = buffer.toString("utf-8");
  if (!text || /\r?\n$/.test(text)) return text;
  const last = Math.max(text.lastIndexOf("\n"), text.lastIndexOf("\r"));
  return last >= 0 ? text.slice(0, last + 1) : "";
}

async function runCandidate(command: string, engine: WorkspaceSearchEngine, args: string[], cwd: string, options: WorkspaceSearchRunOptions, singleThread = false): Promise<WorkspaceSearchRunResult> {
  if (options.signal?.aborted) return { stdout: "", engine, timedOut: false, cancelled: true, partial: true };
  const timeoutMs = Math.max(1_000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const maxOutputBytes = Math.max(1024, Number(options.maxOutputBytes || DEFAULT_MAX_OUTPUT_BYTES));
  return new Promise((resolve, reject) => {
    const effectiveArgs = singleThread ? ["-j", "1", ...args] : args;
    const child = spawn(command, effectiveArgs, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let cancelled = false;
    let outputLimited = false;
    let settled = false;
    let forceKillTimeout: NodeJS.Timeout | undefined;

    const stop = (force = false) => {
      if (child.exitCode != null) return;
      try { child.kill(force ? "SIGKILL" : "SIGTERM"); } catch {}
    };
    const forceTimer = () => {
      if (forceKillTimeout) return;
      forceKillTimeout = setTimeout(() => stop(true), 5_000);
      forceKillTimeout.unref();
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      stop(false);
      forceTimer();
    }, timeoutMs);
    timeout.unref();
    const onAbort = () => {
      cancelled = true;
      stop(false);
      forceTimer();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdoutBytes >= maxOutputBytes) return;
      const remaining = maxOutputBytes - stdoutBytes;
      const selected = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      stdout.push(selected);
      stdoutBytes += selected.length;
      if (selected.length < chunk.length || stdoutBytes >= maxOutputBytes) {
        outputLimited = true;
        stop(false);
        forceTimer();
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderrBytes >= 256_000) return;
      const selected = chunk.subarray(0, Math.max(0, 256_000 - stderrBytes));
      stderr.push(selected);
      stderrBytes += selected.length;
    });
    child.once("error", error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimeout) clearTimeout(forceKillTimeout);
      options.signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.once("close", code => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimeout) clearTimeout(forceKillTimeout);
      options.signal?.removeEventListener("abort", onAbort);
      const partial = timedOut || cancelled || outputLimited;
      const output = Buffer.concat(stdout);
      const result = {
        stdout: partial ? completeLines(output) : output.toString("utf-8"),
        stderr: Buffer.concat(stderr).toString("utf-8").trim().slice(0, 2_000),
        engine,
        timedOut,
        cancelled,
        partial,
      } satisfies WorkspaceSearchRunResult;
      if (partial || code === 0 || code === 1) return resolve(result);
      const error: any = new Error(result.stderr || `ripgrep退出码 ${code}`);
      error.code = code;
      error.searchResult = result;
      reject(error);
    });
  });
}

async function runCandidateWithRetry(command: string, engine: WorkspaceSearchEngine, args: string[], cwd: string, options: WorkspaceSearchRunOptions) {
  try {
    return await runCandidate(command, engine, args, cwd, options, false);
  } catch (error: any) {
    if (String(error?.code || "").toUpperCase() !== "EAGAIN" && !/EAGAIN|resource temporarily unavailable/i.test(String(error?.message || ""))) throw error;
    return runCandidate(command, engine, args, cwd, options, true);
  }
}

export async function runWorkspaceRipgrep(args: string[], cwd: string, options: WorkspaceSearchRunOptions): Promise<WorkspaceSearchRunResult> {
  const candidates = [
    { command: String(bundledRipgrepPath || "").trim(), engine: "bundled_rg" as const },
    { command: "rg", engine: "system_rg" as const },
  ].filter((candidate, index, rows) => candidate.command && rows.findIndex(row => row.command === candidate.command) === index);
  let lastUnavailable: any = null;
  for (const candidate of candidates) {
    try {
      return await runCandidateWithRetry(candidate.command, candidate.engine, args, cwd, options);
    } catch (error: any) {
      const unavailable = ["ENOENT", "EACCES", "EPERM", "ENOEXEC", "EAGAIN"].includes(String(error?.code || "").toUpperCase())
        || /not found|cannot find|无法访问|不是内部或外部命令/i.test(String(error?.message || ""));
      if (!unavailable) throw error;
      lastUnavailable = error;
    }
  }
  try {
    return await options.nodeFallback();
  } catch (error: any) {
    if (lastUnavailable && !error?.message) throw lastUnavailable;
    throw error;
  }
}
