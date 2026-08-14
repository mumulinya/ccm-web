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
exports.runVerificationCommands = runVerificationCommands;
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const isolation_1 = require("./isolation");
const side_effect_policy_1 = require("./side-effect-policy");
const command_live_progress_1 = require("../system/command-live-progress");
const crypto = __importStar(require("crypto"));
function runSingleCommand(project, command, timeoutMs, maxOutputChars, policyContext = null, liveIdentity = null) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const policy = policyContext ? (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)(command, { ...policyContext, project }) : null;
    if (policy && !policy.allowed) {
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
            error: `副作用安全门阻止命令：${policy.reason}`,
        });
    }
    const invocation = (0, utils_1.verificationCommandInvocation)(command);
    const unsafeReason = invocation.error;
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
        const child = (0, child_process_1.spawn)(invocation.executable, invocation.args, {
            cwd: project.workDir,
            shell: invocation.requiresShell,
            windowsHide: true,
            env: (0, utils_1.buildTestAgentSubprocessEnv)(project.env),
        });
        const liveProgress = liveIdentity?.exactSessionId ? (0, command_live_progress_1.createCommandLiveProgress)({
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
        const finish = (status, exitCode, signal, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            liveProgress?.finish(status === "passed" ? "completed" : status);
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
                stdout: (0, utils_1.compactText)((0, utils_1.redactTestAgentSensitiveText)(stdout, Object.values(project.env)), maxOutputChars),
                stderr: (0, utils_1.compactText)((0, utils_1.redactTestAgentSensitiveText)(stderr, Object.values(project.env)), maxOutputChars),
                output: (0, utils_1.compactText)((0, utils_1.redactTestAgentSensitiveText)([stdout, stderr].filter(Boolean).join("\n"), Object.values(project.env)), maxOutputChars),
                error: (0, utils_1.redactTestAgentSensitiveText)(error, Object.values(project.env)),
            });
        };
        const timer = setTimeout(() => {
            if (process.platform === "win32" && child.pid) {
                try {
                    (0, child_process_1.spawnSync)("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
                }
                catch { }
            }
            else {
                try {
                    child.kill("SIGTERM");
                }
                catch { }
            }
            setTimeout(() => {
                if (process.platform !== "win32")
                    try {
                        child.kill("SIGKILL");
                    }
                    catch { }
            }, 1500).unref?.();
            finish("timed_out", null, null, `Command timed out after ${timeoutMs}ms.`);
        }, timeoutMs);
        timer.unref?.();
        child.stdout?.on("data", chunk => { stdout = (0, utils_1.appendLimited)(stdout, chunk, maxOutputChars); liveProgress?.observe(chunk); });
        child.stderr?.on("data", chunk => { stderr = (0, utils_1.appendLimited)(stderr, chunk, maxOutputChars); liveProgress?.observe(chunk); });
        child.on("error", error => finish("failed", null, null, error.message));
        child.on("close", (code, signal) => finish(code === 0 ? "passed" : "failed", code, signal));
    });
}
async function runVerificationCommands(workOrder) {
    const results = [];
    const policyContext = (0, isolation_1.testAgentPolicyContextFromWorkOrder)(workOrder);
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
//# sourceMappingURL=command-runner.js.map