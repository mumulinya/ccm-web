import { ChildProcess, spawn, spawnSync } from "child_process";
import { DevServerResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
import { appendLimited, buildTestAgentSubprocessEnv, compactText, hasRequiredCheck, nowIso, redactTestAgentSensitiveText, verificationCommandInvocation } from "./utils";
import { browserCheckUsesExistingSession } from "./browser/existing-session";
import { checksForProject } from "./browser/shared";

export interface ManagedDevServer {
  result: DevServerResult;
  stop: () => void;
}

function browserChecksRequested(workOrder: NormalizedTestAgentWorkOrder) {
  if (hasRequiredCheck(workOrder.requiredChecks, /browser|e2e|screenshot|console|http|api/i)) return true;
  return workOrder.projects.some(project => !!project.targetUrl || project.browserChecks.length > 0 || project.httpChecks.length > 0 || project.adversarialHttpChecks.length > 0);
}

function projectUsesOnlyExistingBrowserSession(
  workOrder: NormalizedTestAgentWorkOrder,
  project: NormalizedTestAgentProjectTarget,
) {
  const checks = checksForProject(project, workOrder.acceptanceCriteria);
  return checks.length > 0 && checks.every(browserCheckUsesExistingSession);
}

async function probeUrl(url: string, timeoutMs = 3000) {
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForUrl(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probeUrl(url, 2500)) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

function stopProcessTree(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try { child.kill("SIGTERM"); } catch {}
}

async function startProjectServer(project: NormalizedTestAgentProjectTarget, maxOutputChars: number): Promise<ManagedDevServer> {
  const startedAt = nowIso();
  const url = project.startupUrl || project.targetUrl;
  if (!url) {
    return {
      result: { project: project.name, command: "", cwd: project.workDir, url: "", status: "skipped", startedAt, error: "No target URL was provided." },
      stop: () => {},
    };
  }

  if (await probeUrl(url)) {
    return {
      result: { project: project.name, command: "", cwd: project.workDir, url, status: "already_running", startedAt, readyAt: nowIso() },
      stop: () => {},
    };
  }

  const command = project.devServerCommand;
  if (!command) {
    return {
      result: { project: project.name, command: "", cwd: project.workDir, url, status: "failed", startedAt, error: "Target URL is not reachable and no dev server command was provided." },
      stop: () => {},
    };
  }

  const invocation = verificationCommandInvocation(command);
  if (invocation.error) {
    return {
      result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error: invocation.error },
      stop: () => {},
    };
  }

  let output = "";
  const child = spawn(invocation.executable, invocation.args, {
    cwd: project.workDir,
    shell: invocation.requiresShell,
    windowsHide: true,
    env: buildTestAgentSubprocessEnv(project.env),
  });
  child.stdout?.on("data", chunk => { output = appendLimited(output, chunk, maxOutputChars); });
  child.stderr?.on("data", chunk => { output = appendLimited(output, chunk, maxOutputChars); });

  let exitError = "";
  child.on("exit", code => {
    if (code !== null && code !== 0) exitError = `Dev server exited with code ${code}.`;
  });

  const ready = await waitForUrl(url, project.startupTimeoutMs);
  if (!ready) {
    const error = exitError || `Dev server did not become reachable at ${url} within ${project.startupTimeoutMs}ms.`;
    stopProcessTree(child);
    return {
      result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error: redactTestAgentSensitiveText(error, Object.values(project.env)), output: compactText(redactTestAgentSensitiveText(output, Object.values(project.env)), maxOutputChars) },
      stop: () => {},
    };
  }

  return {
    result: { project: project.name, command, cwd: project.workDir, url, status: "started", startedAt, readyAt: nowIso(), output: compactText(redactTestAgentSensitiveText(output, Object.values(project.env)), maxOutputChars) },
    stop: () => stopProcessTree(child),
  };
}

export async function startDevServersForBrowserChecks(workOrder: NormalizedTestAgentWorkOrder): Promise<ManagedDevServer[]> {
  if (!browserChecksRequested(workOrder)) return [];
  const servers: ManagedDevServer[] = [];
  for (const project of workOrder.projects) {
    if (!project.targetUrl && !project.startupUrl && !project.browserChecks.length && !project.httpChecks.length && !project.adversarialHttpChecks.length) continue;
    if (
      !project.devServerCommand
      && !project.httpChecks.length
      && !project.adversarialHttpChecks.length
      && projectUsesOnlyExistingBrowserSession(workOrder, project)
    ) {
      continue;
    }
    servers.push(await startProjectServer(project, workOrder.options.maxOutputChars));
  }
  return servers;
}
