import { spawn, spawnSync } from "child_process";
import { CommandRunResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
import { appendLimited, buildTestAgentSubprocessEnv, compactText, nowIso, redactTestAgentSensitiveText, verificationCommandInvocation } from "./utils";
import { testAgentPolicyContextFromWorkOrder } from "./isolation";
import { evaluateTestAgentCommandSideEffect, type TestAgentSideEffectPolicyContext } from "./side-effect-policy";
import { createCommandLiveProgress } from "../system/command-live-progress";
import * as crypto from "crypto";

function runSingleCommand(project: NormalizedTestAgentProjectTarget, command: string, timeoutMs: number, maxOutputChars: number, policyContext: TestAgentSideEffectPolicyContext | null = null, liveIdentity: any = null): Promise<CommandRunResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const policy = policyContext ? evaluateTestAgentCommandSideEffect(command, { ...policyContext, project }) : null;
  if (policy && !policy.allowed) {
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
      error: `副作用安全门阻止命令：${policy.reason}`,
    });
  }
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
    const liveProgress = liveIdentity?.exactSessionId ? createCommandLiveProgress({
      commandRunId: `test-${crypto.randomUUID()}`,
      taskId: liveIdentity.taskId,
      scope: liveIdentity.scope,
      scopeId: liveIdentity.scopeId,
      exactSessionId: liveIdentity.exactSessionId,
      generation: liveIdentity.generation,
      attempt: liveIdentity.attempt,
      anchorMessageId: liveIdentity.anchorMessageId,
      description: `验证 ${project.name}`,
    }) : null;

    const finish = (status: CommandRunResult["status"], exitCode: number | null, signal?: NodeJS.Signals | null, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      liveProgress?.finish(status === "passed" ? "completed" : status);
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

    child.stdout?.on("data", chunk => { stdout = appendLimited(stdout, chunk, maxOutputChars); liveProgress?.observe(chunk); });
    child.stderr?.on("data", chunk => { stderr = appendLimited(stderr, chunk, maxOutputChars); liveProgress?.observe(chunk); });
    child.on("error", error => finish("failed", null, null, error.message));
    child.on("close", (code, signal) => finish(code === 0 ? "passed" : "failed", code, signal));
  });
}

export async function runVerificationCommands(workOrder: NormalizedTestAgentWorkOrder): Promise<CommandRunResult[]> {
  const results: CommandRunResult[] = [];
  const policyContext = testAgentPolicyContextFromWorkOrder(workOrder);
  const exactSessionId = String(workOrder.metadata?.groupSessionId || workOrder.metadata?.group_session_id || workOrder.metadata?.projectSessionId || workOrder.metadata?.project_session_id || workOrder.metadata?.exactSessionId || workOrder.metadata?.exact_session_id || "");
  const scope = workOrder.groupId ? "group" : "project";
  const scopeId = String(workOrder.groupId || workOrder.projects[0]?.name || "");
  const liveIdentity = exactSessionId && scopeId ? {
    taskId: workOrder.taskId,
    scope,
    scopeId,
    exactSessionId,
    generation: Math.max(0, Number(workOrder.metadata?.generation || workOrder.metadata?.workflowGeneration || 0)),
    attempt: Math.max(1, Number(workOrder.metadata?.attempt || 1)),
    anchorMessageId: String(workOrder.metadata?.anchorMessageId || workOrder.metadata?.anchor_message_id || "") || undefined,
  } : null;
  for (const project of workOrder.projects) {
    for (const command of project.verificationCommands) {
      results.push(await runSingleCommand(project, command, workOrder.options.commandTimeoutMs, workOrder.options.maxOutputChars, policyContext, liveIdentity));
    }
  }
  return results;
}
