import { spawn } from "child_process";
import { CommandRunResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
import { appendLimited, compactText, isUnsafeVerificationCommand, nowIso } from "./utils";

function runSingleCommand(project: NormalizedTestAgentProjectTarget, command: string, timeoutMs: number, maxOutputChars: number): Promise<CommandRunResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const unsafeReason = isUnsafeVerificationCommand(command);
  if (unsafeReason) {
    const finishedAt = nowIso();
    return Promise.resolve({
      project: project.name,
      command,
      cwd: project.workDir,
      status: "blocked",
      exitCode: null,
      startedAt,
      finishedAt,
      durationMs: Date.now() - started,
      stdout: "",
      stderr: "",
      output: "",
      error: unsafeReason,
    });
  }

  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(command, {
      cwd: project.workDir,
      shell: true,
      windowsHide: true,
      env: { ...process.env, ...project.env },
    });

    const finish = (status: CommandRunResult["status"], exitCode: number | null, signal?: NodeJS.Signals | null, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const finishedAt = nowIso();
      resolve({
        project: project.name,
        command,
        cwd: project.workDir,
        status,
        exitCode,
        signal,
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
        stdout: compactText(stdout, maxOutputChars),
        stderr: compactText(stderr, maxOutputChars),
        output: compactText([stdout, stderr].filter(Boolean).join("\n"), maxOutputChars),
        error,
      });
    };

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch {}
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
      }, 1500).unref?.();
      finish("timed_out", null, null, `Command timed out after ${timeoutMs}ms.`);
    }, timeoutMs);
    timer.unref?.();

    child.stdout?.on("data", chunk => { stdout = appendLimited(stdout, chunk, maxOutputChars); });
    child.stderr?.on("data", chunk => { stderr = appendLimited(stderr, chunk, maxOutputChars); });
    child.on("error", error => finish("failed", null, null, error.message));
    child.on("close", (code, signal) => finish(code === 0 ? "passed" : "failed", code, signal));
  });
}

export async function runVerificationCommands(workOrder: NormalizedTestAgentWorkOrder): Promise<CommandRunResult[]> {
  const results: CommandRunResult[] = [];
  for (const project of workOrder.projects) {
    for (const command of project.verificationCommands) {
      results.push(await runSingleCommand(project, command, workOrder.options.commandTimeoutMs, workOrder.options.maxOutputChars));
    }
  }
  return results;
}
