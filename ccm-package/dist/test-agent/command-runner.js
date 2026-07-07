"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVerificationCommands = runVerificationCommands;
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
function runSingleCommand(project, command, timeoutMs, maxOutputChars) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const unsafeReason = (0, utils_1.isUnsafeVerificationCommand)(command);
    if (unsafeReason) {
        const finishedAt = (0, utils_1.nowIso)();
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
        const child = (0, child_process_1.spawn)(command, {
            cwd: project.workDir,
            shell: true,
            windowsHide: true,
            env: { ...process.env, ...project.env },
        });
        const finish = (status, exitCode, signal, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            const finishedAt = (0, utils_1.nowIso)();
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
                stdout: (0, utils_1.compactText)(stdout, maxOutputChars),
                stderr: (0, utils_1.compactText)(stderr, maxOutputChars),
                output: (0, utils_1.compactText)([stdout, stderr].filter(Boolean).join("\n"), maxOutputChars),
                error,
            });
        };
        const timer = setTimeout(() => {
            try {
                child.kill("SIGTERM");
            }
            catch { }
            setTimeout(() => {
                try {
                    child.kill("SIGKILL");
                }
                catch { }
            }, 1500).unref?.();
            finish("timed_out", null, null, `Command timed out after ${timeoutMs}ms.`);
        }, timeoutMs);
        timer.unref?.();
        child.stdout?.on("data", chunk => { stdout = (0, utils_1.appendLimited)(stdout, chunk, maxOutputChars); });
        child.stderr?.on("data", chunk => { stderr = (0, utils_1.appendLimited)(stderr, chunk, maxOutputChars); });
        child.on("error", error => finish("failed", null, null, error.message));
        child.on("close", (code, signal) => finish(code === 0 ? "passed" : "failed", code, signal));
    });
}
async function runVerificationCommands(workOrder) {
    const results = [];
    for (const project of workOrder.projects) {
        for (const command of project.verificationCommands) {
            results.push(await runSingleCommand(project, command, workOrder.options.commandTimeoutMs, workOrder.options.maxOutputChars));
        }
    }
    return results;
}
//# sourceMappingURL=command-runner.js.map