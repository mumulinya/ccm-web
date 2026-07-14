import { spawn, spawnSync } from "child_process";
import { CommandRunResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
import { appendLimited, buildTestAgentSubprocessEnv, compactText, nowIso, redactTestAgentSensitiveText, verificationCommandInvocation } from "./utils";

function runSingleCommand(project: NormalizedTestAgentProjectTarget, command: string, timeoutMs: number, maxOutputChars: number): Promise<CommandRunResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const invocation = verificationCommandInvocation(command);
  const unsafeReason = invocation.error;
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
    const child = spawn(invocation.executable, invocation.args, {
      cwd: project.workDir,
      shell: invocation.requiresShell,
      windowsHide: true,
      env: buildTestAgentSubprocessEnv(project.env),
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
        stdout: compactText(redactTestAgentSensitiveText(stdout, Object.values(project.env)), maxOutputChars),
        stderr: compactText(redactTestAgentSensitiveText(stderr, Object.values(project.env)), maxOutputChars),
        output: compactText(redactTestAgentSensitiveText([stdout, stderr].filter(Boolean).join("\n"), Object.values(project.env)), maxOutputChars),
        error: redactTestAgentSensitiveText(error, Object.values(project.env)),
      });
    };

    const timer = setTimeout(() => {
      if (process.platform === "win32" && child.pid) {
        try { spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" }); } catch {}
      } else {
        try { child.kill("SIGTERM"); } catch {}
      }
      setTimeout(() => {
        if (process.platform !== "win32") try { child.kill("SIGKILL"); } catch {}
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
