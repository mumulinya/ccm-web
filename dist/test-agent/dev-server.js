"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDevServersForBrowserChecks = startDevServersForBrowserChecks;
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const existing_session_1 = require("./browser/existing-session");
const shared_1 = require("./browser/shared");
const isolation_1 = require("./isolation");
const side_effect_policy_1 = require("./side-effect-policy");
const user_visible_progress_1 = require("./user-visible-progress");
function browserChecksRequested(workOrder) {
    if ((0, utils_1.requiredCheckEnabled)(workOrder.requiredChecks, "browser_e2e", "screenshots", "console_errors", "http", "api"))
        return true;
    return workOrder.projects.some(project => !!project.targetUrl || project.browserChecks.length > 0 || project.httpChecks.length > 0 || project.adversarialHttpChecks.length > 0);
}
function projectUsesOnlyExistingBrowserSession(workOrder, project) {
    const checks = (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria);
    return checks.length > 0 && checks.every(existing_session_1.browserCheckUsesExistingSession);
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
async function startProjectServer(project, maxOutputChars, policyContext = null) {
    const startedAt = (0, utils_1.nowIso)();
    const url = project.startupUrl || project.targetUrl;
    if (!url) {
        return {
            result: { project: project.name, command: "", cwd: project.workDir, url: "", status: "skipped", startedAt, error: "No target URL was provided." },
            stop: () => { },
        };
    }
    const urlPolicy = policyContext ? (0, side_effect_policy_1.evaluateTestAgentHttpSideEffect)({ url, method: "GET" }, { ...policyContext, project }) : null;
    if (urlPolicy && !urlPolicy.allowed) {
        const startedAt = (0, utils_1.nowIso)();
        return {
            result: { project: project.name, command: project.devServerCommand || "", cwd: project.workDir, url, status: "failed", startedAt, error: `副作用安全门阻止访问目标 URL：${urlPolicy.reason}` },
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
    const commandPolicy = policyContext ? (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)(command, { ...policyContext, project }) : null;
    if (commandPolicy && !commandPolicy.allowed) {
        return {
            result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error: `副作用安全门阻止启动开发服务器：${commandPolicy.reason}` },
            stop: () => { },
        };
    }
    const invocation = (0, utils_1.verificationCommandInvocation)(command);
    if (invocation.error) {
        return {
            result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error: invocation.error },
            stop: () => { },
        };
    }
    let output = "";
    const child = (0, child_process_1.spawn)(invocation.executable, invocation.args, {
        cwd: project.workDir,
        shell: invocation.requiresShell,
        windowsHide: true,
        env: (0, utils_1.buildTestAgentSubprocessEnv)(project.env),
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
            result: { project: project.name, command, cwd: project.workDir, url, status: "failed", startedAt, error: (0, utils_1.redactTestAgentSensitiveText)(error, Object.values(project.env)), output: (0, utils_1.compactText)((0, utils_1.redactTestAgentSensitiveText)(output, Object.values(project.env)), maxOutputChars) },
            stop: () => { },
        };
    }
    return {
        result: { project: project.name, command, cwd: project.workDir, url, status: "started", startedAt, readyAt: (0, utils_1.nowIso)(), output: (0, utils_1.compactText)((0, utils_1.redactTestAgentSensitiveText)(output, Object.values(project.env)), maxOutputChars) },
        stop: () => stopProcessTree(child),
    };
}
async function startDevServersForBrowserChecks(workOrder) {
    if (!browserChecksRequested(workOrder))
        return [];
    const servers = [];
    const policyContext = (0, isolation_1.testAgentPolicyContextFromWorkOrder)(workOrder);
    const progressContext = (0, user_visible_progress_1.testAgentVisibleProgressContext)(workOrder);
    for (const project of workOrder.projects) {
        if (!project.targetUrl && !project.startupUrl && !project.browserChecks.length && !project.httpChecks.length && !project.adversarialHttpChecks.length)
            continue;
        if (!project.devServerCommand
            && !project.httpChecks.length
            && !project.adversarialHttpChecks.length
            && projectUsesOnlyExistingBrowserSession(workOrder, project)) {
            continue;
        }
        const trace = (0, user_visible_progress_1.beginTestAgentVisibleTool)(progressContext, {
            kind: "dev_server",
            key: `${project.name}:dev-server:${project.devServerCommand || project.targetUrl || project.startupUrl || "probe"}`,
            project: project.name,
            label: project.devServerCommand || "测试服务可用性",
            command: project.devServerCommand,
        });
        try {
            const server = await startProjectServer(project, workOrder.options.maxOutputChars, policyContext);
            trace.finish(server.result);
            servers.push(server);
        }
        catch (error) {
            trace.finish({ status: "failed", error: error?.message || String(error) });
            throw error;
        }
    }
    return servers;
}
//# sourceMappingURL=dev-server.js.map