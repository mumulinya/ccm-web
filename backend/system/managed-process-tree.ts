import * as crypto from "crypto";
import { ChildProcess, spawn } from "child_process";

export type ManagedProcessStopReceiptV2 = {
  schema: "ccm-managed-process-stop-receipt-v2";
  operation_id: string;
  pid: number;
  requested_at: string;
  finished_at: string;
  graceful_signal: string;
  forced: boolean;
  exited: boolean;
  elapsed_ms: number;
  error?: string;
};

export function processTreeRootExists(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    return String(error?.code || "") === "EPERM";
  }
}

function waitForExit(pid: number, timeoutMs: number) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  return new Promise<boolean>(resolve => {
    const poll = () => {
      if (!processTreeRootExists(pid)) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      const timer = setTimeout(poll, 50);
      timer.unref?.();
    };
    poll();
  });
}

function runHidden(executable: string, args: string[], timeoutMs: number) {
  return new Promise<{ success: boolean; error?: string }>(resolve => {
    let settled = false;
    const child = spawn(executable, args, { windowsHide: true, stdio: "ignore", shell: false });
    const finish = (success: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ success, error });
    };
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      finish(false, `${executable} timed out`);
    }, Math.max(1_000, timeoutMs));
    timer.unref?.();
    child.once("error", error => finish(false, error.message));
    child.once("close", code => finish(code === 0, code === 0 ? undefined : `${executable} exited with ${code}`));
  });
}

async function signalProcessTree(pid: number, signal: "SIGTERM" | "SIGKILL") {
  if (process.platform === "win32") {
    const args = ["/PID", String(pid), "/T"];
    if (signal === "SIGKILL") args.push("/F");
    return runHidden("taskkill.exe", args, 12_000);
  }
  try {
    process.kill(-pid, signal);
    return { success: true };
  } catch (groupError: any) {
    try {
      process.kill(pid, signal);
      return { success: true };
    } catch (rootError: any) {
      if (!processTreeRootExists(pid)) return { success: true };
      return { success: false, error: rootError?.message || groupError?.message || "unable to signal process tree" };
    }
  }
}

export async function terminateManagedProcessTree(
  target: number | ChildProcess,
  options: { gracefulTimeoutMs?: number; forceTimeoutMs?: number } = {},
): Promise<ManagedProcessStopReceiptV2> {
  const pid = Number(typeof target === "number" ? target : target.pid || 0);
  const started = Date.now();
  const requestedAt = new Date(started).toISOString();
  const operationId = `process_stop_${crypto.randomBytes(10).toString("hex")}`;
  if (!pid || !processTreeRootExists(pid)) {
    return {
      schema: "ccm-managed-process-stop-receipt-v2",
      operation_id: operationId,
      pid,
      requested_at: requestedAt,
      finished_at: new Date().toISOString(),
      graceful_signal: "SIGTERM",
      forced: false,
      exited: true,
      elapsed_ms: Date.now() - started,
    };
  }

  const graceful = await signalProcessTree(pid, "SIGTERM");
  let exited = await waitForExit(pid, Math.max(250, Number(options.gracefulTimeoutMs || 8_000)));
  let forced = false;
  let error = graceful.success ? "" : graceful.error || "graceful termination failed";
  if (!exited) {
    forced = true;
    const force = await signalProcessTree(pid, "SIGKILL");
    if (!force.success) error = force.error || error || "forced termination failed";
    exited = await waitForExit(pid, Math.max(250, Number(options.forceTimeoutMs || 3_000)));
  }
  if (!exited && !error) error = "进程树在强制终止后仍然存活";
  return {
    schema: "ccm-managed-process-stop-receipt-v2",
    operation_id: operationId,
    pid,
    requested_at: requestedAt,
    finished_at: new Date().toISOString(),
    graceful_signal: "SIGTERM",
    forced,
    exited,
    elapsed_ms: Date.now() - started,
    ...(error ? { error } : {}),
  };
}

