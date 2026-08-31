"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTreeRootExists = processTreeRootExists;
exports.terminateManagedProcessTree = terminateManagedProcessTree;
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
function processTreeRootExists(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return String(error?.code || "") === "EPERM";
    }
}
function waitForExit(pid, timeoutMs) {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    return new Promise(resolve => {
        const poll = () => {
            if (!processTreeRootExists(pid))
                return resolve(true);
            if (Date.now() >= deadline)
                return resolve(false);
            setTimeout(poll, 50);
        };
        poll();
    });
}
function runHidden(executable, args, timeoutMs) {
    return new Promise(resolve => {
        let settled = false;
        const child = (0, child_process_1.spawn)(executable, args, { windowsHide: true, stdio: "ignore", shell: false });
        const finish = (success, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({ success, error });
        };
        const timer = setTimeout(() => {
            try {
                child.kill("SIGKILL");
            }
            catch { }
            finish(false, `${executable} timed out`);
        }, Math.max(1_000, timeoutMs));
        child.once("error", error => finish(false, error.message));
        child.once("close", code => finish(code === 0, code === 0 ? undefined : `${executable} exited with ${code}`));
    });
}
async function signalProcessTree(pid, signal) {
    if (process.platform === "win32") {
        const args = ["/PID", String(pid), "/T"];
        if (signal === "SIGKILL")
            args.push("/F");
        return runHidden("taskkill.exe", args, 12_000);
    }
    try {
        process.kill(-pid, signal);
        return { success: true };
    }
    catch (groupError) {
        try {
            process.kill(pid, signal);
            return { success: true };
        }
        catch (rootError) {
            if (!processTreeRootExists(pid))
                return { success: true };
            return { success: false, error: rootError?.message || groupError?.message || "unable to signal process tree" };
        }
    }
}
async function terminateManagedProcessTree(target, options = {}) {
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
        if (!force.success)
            error = force.error || error || "forced termination failed";
        exited = await waitForExit(pid, Math.max(250, Number(options.forceTimeoutMs || 3_000)));
    }
    if (!exited && !error)
        error = "进程树在强制终止后仍然存活";
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
//# sourceMappingURL=managed-process-tree.js.map