"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorkspaceRipgrep = runWorkspaceRipgrep;
const child_process_1 = require("child_process");
const ripgrep_1 = require("@vscode/ripgrep");
const DEFAULT_TIMEOUT_MS = process.env.WSL_DISTRO_NAME ? 60_000 : 20_000;
const DEFAULT_MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
function completeLines(buffer) {
    const text = buffer.toString("utf-8");
    if (!text || /\r?\n$/.test(text))
        return text;
    const last = Math.max(text.lastIndexOf("\n"), text.lastIndexOf("\r"));
    return last >= 0 ? text.slice(0, last + 1) : "";
}
async function runCandidate(command, engine, args, cwd, options, singleThread = false) {
    if (options.signal?.aborted)
        return { stdout: "", engine, timedOut: false, cancelled: true, partial: true };
    const timeoutMs = Math.max(1_000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
    const maxOutputBytes = Math.max(1024, Number(options.maxOutputBytes || DEFAULT_MAX_OUTPUT_BYTES));
    return new Promise((resolve, reject) => {
        const effectiveArgs = singleThread ? ["-j", "1", ...args] : args;
        const child = (0, child_process_1.spawn)(command, effectiveArgs, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        const stdout = [];
        const stderr = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let timedOut = false;
        let cancelled = false;
        let outputLimited = false;
        let settled = false;
        let forceKillTimeout;
        const stop = (force = false) => {
            if (child.exitCode != null)
                return;
            try {
                child.kill(force ? "SIGKILL" : "SIGTERM");
            }
            catch { }
        };
        const forceTimer = () => {
            if (forceKillTimeout)
                return;
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
        child.stdout?.on("data", (chunk) => {
            if (stdoutBytes >= maxOutputBytes)
                return;
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
        child.stderr?.on("data", (chunk) => {
            if (stderrBytes >= 256_000)
                return;
            const selected = chunk.subarray(0, Math.max(0, 256_000 - stderrBytes));
            stderr.push(selected);
            stderrBytes += selected.length;
        });
        child.once("error", error => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            if (forceKillTimeout)
                clearTimeout(forceKillTimeout);
            options.signal?.removeEventListener("abort", onAbort);
            reject(error);
        });
        child.once("close", code => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            if (forceKillTimeout)
                clearTimeout(forceKillTimeout);
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
            };
            if (partial || code === 0 || code === 1)
                return resolve(result);
            const error = new Error(result.stderr || `ripgrep退出码 ${code}`);
            error.code = code;
            error.searchResult = result;
            reject(error);
        });
    });
}
async function runCandidateWithRetry(command, engine, args, cwd, options) {
    try {
        return await runCandidate(command, engine, args, cwd, options, false);
    }
    catch (error) {
        if (String(error?.code || "").toUpperCase() !== "EAGAIN" && !/EAGAIN|resource temporarily unavailable/i.test(String(error?.message || "")))
            throw error;
        return runCandidate(command, engine, args, cwd, options, true);
    }
}
async function runWorkspaceRipgrep(args, cwd, options) {
    const candidates = [
        { command: String(ripgrep_1.rgPath || "").trim(), engine: "bundled_rg" },
        { command: "rg", engine: "system_rg" },
    ].filter((candidate, index, rows) => candidate.command && rows.findIndex(row => row.command === candidate.command) === index);
    let lastUnavailable = null;
    for (const candidate of candidates) {
        try {
            return await runCandidateWithRetry(candidate.command, candidate.engine, args, cwd, options);
        }
        catch (error) {
            const unavailable = ["ENOENT", "EACCES", "EPERM", "ENOEXEC", "EAGAIN"].includes(String(error?.code || "").toUpperCase())
                || /not found|cannot find|无法访问|不是内部或外部命令/i.test(String(error?.message || ""));
            if (!unavailable)
                throw error;
            lastUnavailable = error;
        }
    }
    try {
        return await options.nodeFallback();
    }
    catch (error) {
        if (lastUnavailable && !error?.message)
            throw lastUnavailable;
        throw error;
    }
}
//# sourceMappingURL=workspace-search-runtime.js.map