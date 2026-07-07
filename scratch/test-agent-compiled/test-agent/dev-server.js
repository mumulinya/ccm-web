"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDevServersForBrowserChecks = startDevServersForBrowserChecks;
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
function browserChecksRequested(workOrder) {
    if ((0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /browser|e2e|screenshot|console|http|api/i))
        return true;
    return workOrder.projects.some(project => !!project.targetUrl || project.browserChecks.length > 0 || project.httpChecks.length > 0 || project.adversarialHttpChecks.length > 0);
}
async function probeUrl(url, timeoutMs = 3000) {
    if (!url)
        return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { method: "GET", signal: controller.signal });
        return response.status < 500;
    }
    catch {
        return false;
    }
    finally {
        clearTimeout(timer);
    }
}
async function waitForUrl(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await probeUrl(url, 2500))
            return true;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
}
function stopProcessTree(child) {
    if (!child.pid)
        return;
    if (process.platform === "win32") {
        (0, child_process_1.spawnSync)("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
        return;
    }
    try {
        child.kill("SIGTERM");
    }
    catch { }
}
async function startProjectServer(project, maxOutputChars) {
    const startedAt = (0, utils_1.nowIso)();
    const url = project.startupUrl || project.targetUrl;
    if (!url) {
        return {
            result: { project: project.name, command: "", cwd: project.workDir, url: "", status: "skipped", startedAt, error: "No target URL was provided." },
            stop: () => { },
        };
    }
    if (await probeUrl(url)) {
        return {
            result: { project: project.name, command: "", cwd: project.workDir, url, status: "already_running", startedAt, readyAt: (0, utils_1.nowIso)() },
            stop: () => { },
        };
    }
    const command = project.devServerCommand;
    if (!command) {
        return {
            result: { project: project.name, command: "", cwd: project.workDir, url, status: "failed", startedAt, error: "Target URL is not reachable and no dev server command was provided." },
            stop: () => { },
        };
    }
    let output = "";
    const child = (0, child_process_1.spawn)(command, {
        cwd: project.workDir,
        shell: true,
        windowsHide: true,
        env: { ...process.env, ...project.env },
    });
    child.stdout?.on("data", chunk => { output = (0, utils_1.appendLimited)(output, chunk, maxOutputChars); });
    child.stderr?.on("data", chunk => { output = (0, utils_1.appendLimited)(output, chunk, maxOutputChars); });
    let exitError = "";
    child.on("exit", code => {
        if (code !== null && code !== 0)
            exitError = `Dev server exited with code ${code}.`;
    });
    const ready = await waitForUrl(url, project.startupTimeoutMs);
    if (!ready) {
        const error = exitError || `Dev server did not become reachable at ${url} within ${project.startupTimeoutMs}ms.`;
        stopProcessTree(child);
        return {
            result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error, output: (0, utils_1.compactText)(output, maxOutputChars) },
            stop: () => { },
        };
    }
    return {
        result: { project: project.name, command, cwd: project.workDir, url, status: "started", startedAt, readyAt: (0, utils_1.nowIso)(), output: (0, utils_1.compactText)(output, maxOutputChars) },
        stop: () => stopProcessTree(child),
    };
}
async function startDevServersForBrowserChecks(workOrder) {
    if (!browserChecksRequested(workOrder))
        return [];
    const servers = [];
    for (const project of workOrder.projects) {
        if (!project.targetUrl && !project.startupUrl && !project.browserChecks.length && !project.httpChecks.length && !project.adversarialHttpChecks.length)
            continue;
        servers.push(await startProjectServer(project, workOrder.options.maxOutputChars));
    }
    return servers;
}
