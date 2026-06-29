#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const agent_runtime_1 = require("./agent-runtime");
const runtime_tool_sync_1 = require("./runtime-tool-sync");
const execution_kernel_1 = require("./execution-kernel");
const AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
const REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
const HEARTBEAT_FILE = path.join(AGENT_RUNNER_DIR, "heartbeat.json");
function ensureDirs() {
    for (const dir of [AGENT_RUNNER_DIR, REQUESTS_DIR, RESULTS_DIR, utils_1.UPLOAD_DIR]) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
}
function writeHeartbeat(status = "idle", detail = "") {
    ensureDirs();
    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
        status,
        detail,
        pid: process.pid,
        updated_at: new Date().toISOString(),
    }, null, 2), "utf-8");
}
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJsonAtomic(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, file);
}
function markRequest(file, patch) {
    const request = readJson(file);
    writeJsonAtomic(file, { ...request, ...patch, updated_at: new Date().toISOString() });
}
function normalizeVerificationCommands(value) {
    const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
    const seen = new Set();
    const commands = [];
    for (const item of raw) {
        const command = String(item || "").trim();
        if (!command || seen.has(command))
            continue;
        seen.add(command);
        commands.push(command);
    }
    return commands.slice(0, 8);
}
function getProjectVerificationCommands(projectName) {
    if (!projectName)
        return [];
    const configFile = path.join(utils_1.CCM_DIR, "project-configs.json");
    if (!fs.existsSync(configFile))
        return [];
    try {
        const configs = readJson(configFile);
        const config = configs?.[projectName] || {};
        return normalizeVerificationCommands(config.verification_commands
            || config.verificationCommands
            || config.test_commands
            || config.testCommands
            || config.check_commands
            || config.checkCommands);
    }
    catch {
        return [];
    }
}
function isAgentProbeRequest(request) {
    return /CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(String(request?.message || ""));
}
function buildCliAllowedTools(request) {
    if (isAgentProbeRequest(request))
        return [];
    const explicit = Array.isArray(request.cliAllowedTools)
        ? request.cliAllowedTools.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const rules = explicit.length ? explicit : getProjectVerificationCommands(String(request.projectName || "")).flatMap(command => {
        const rule = `Bash(${command})`;
        return process.platform === "win32" ? [rule, `PowerShell(${command})`] : [rule];
    });
    return Array.from(new Set(rules));
}
async function runProjectVerificationCommands(projectName, workDir, timeoutMs, request) {
    const commands = getProjectVerificationCommands(projectName).filter(execution_kernel_1.isSafeVerificationCommand);
    const results = [];
    const verification = [];
    const failed = [];
    if (!commands.length || !workDir) {
        return { ccm_runner_verification: true, status: "skipped", verification, failed, results };
    }
    const perCommandTimeout = Math.max(30000, Math.min(timeoutMs || 300000, 180000));
    for (const command of commands) {
        try {
            const managed = await (0, execution_kernel_1.runManagedCommand)({
                taskId: String(request.taskId || request.id),
                executionId: String(request.executionId || ""),
                command,
                cwd: workDir,
                timeoutMs: perCommandTimeout,
                maxOutputBytes: 5 * 1024 * 1024,
                env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(request.agentType || "claudecode"), request.envAllowlist || []),
            });
            const item = { command, exitCode: 0, status: "passed", output: String(managed.stdout || "").slice(-4000) };
            results.push(item);
            verification.push(`${command} passed by external runner (exit 0)`);
        }
        catch (error) {
            const exitCode = error?.exitCode ?? error?.status ?? null;
            const output = String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000);
            const item = { command, exitCode, status: "failed", output };
            results.push(item);
            failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
        }
    }
    return {
        ccm_runner_verification: true,
        status: failed.length ? "failed" : "passed",
        verification,
        failed,
        results,
    };
}
function appendRunnerVerificationOutput(output, runnerVerification) {
    if (!runnerVerification || runnerVerification.status === "skipped")
        return output;
    return `${output || ""}\n\nCCM_RUNNER_VERIFICATION\n` + "```json\n" + JSON.stringify(runnerVerification, null, 2) + "\n```";
}
async function runRequest(file) {
    const request = readJson(file);
    if (!request?.id || ["done", "running", "failed", "cancelled", "expired"].includes(request.status))
        return false;
    const createdAt = Date.parse(String(request.created_at || request.createdAt || ""));
    const requestAgeMs = Number.isFinite(createdAt) ? Date.now() - createdAt : 0;
    const staleAfterMs = Math.max(10 * 60 * 1000, Number(request.timeoutMs || 300000) + 60 * 1000);
    if (request.status === "pending" && requestAgeMs > staleAfterMs) {
        markRequest(file, { status: "expired", completed_at: new Date().toISOString(), error: "外部 Runner 请求已超过调用方等待窗口，安全跳过，避免恢复历史任务" });
        return true;
    }
    const resultFile = path.join(RESULTS_DIR, `${request.id}.json`);
    if (fs.existsSync(resultFile))
        return false;
    const taskId = String(request.taskId || request.id);
    const executionId = String(request.executionId || "");
    if (request.status === "cancel_requested" || (0, execution_kernel_1.isTaskCancellationRequested)(taskId)) {
        writeJsonAtomic(resultFile, { id: request.id, success: false, cancelled: true, error: request.cancel_reason || "任务已取消", completed_at: new Date().toISOString() });
        markRequest(file, { status: "cancelled", completed_at: new Date().toISOString() });
        if (executionId)
            (0, execution_kernel_1.transitionExecution)(executionId, "cancelled", request.cancel_reason || "任务已取消");
        return true;
    }
    markRequest(file, { status: "running", runner_pid: process.pid, started_at: new Date().toISOString() });
    writeHeartbeat("running", `${request.projectName || "agent"} ${request.id}`);
    const msgFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.txt`);
    const workDir = request.workDir || process.cwd();
    const agentType = (0, agent_runtime_1.normalizeAgentRuntimeId)(request.agentType || "claudecode");
    const command = (0, agent_runtime_1.getAgentCommandLabel)(agentType);
    const timeoutMs = Number(request.timeoutMs || 300000);
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const cliAllowedTools = buildCliAllowedTools(request);
    try {
        fs.writeFileSync(msgFile, String(request.message || ""), "utf-8");
        const managed = await (0, execution_kernel_1.runManagedCommand)({
            taskId,
            executionId,
            command: (0, agent_runtime_1.buildAgentCommand)(agentType, msgFile, {
                cliAllowedTools,
                mcpConfigPath: String(request.mcpConfigPath || ""),
                ...(request.agentSession || {}),
            }),
            cwd: workDir,
            timeoutMs,
            maxOutputBytes: Number(request.maxOutputBytes || 2 * 1024 * 1024),
            env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), request.envAllowlist || []),
        });
        const normalizedOutput = (0, agent_runtime_1.normalizeAgentCommandOutput)(agentType, String(managed.stdout || "").trim());
        const agentOutput = (0, execution_kernel_1.persistBoundedOutput)(taskId, normalizedOutput.output, Number(request.maxContextOutputBytes || 256 * 1024)).content;
        const runnerVerification = isAgentProbeRequest(request)
            ? { ccm_runner_verification: true, status: "skipped", verification: [], failed: [], results: [] }
            : await runProjectVerificationCommands(request.projectName || "", workDir, timeoutMs, request);
        const output = appendRunnerVerificationOutput(agentOutput, runnerVerification);
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: true,
            output,
            nativeSessionId: normalizedOutput.sessionId || request.agentSession?.sessionId || "",
            fileChanges,
            agentType,
            command: cliAllowedTools.length ? `${command} --allowed-tools ${cliAllowedTools.join(",")}` : command,
            cliAllowedTools,
            effectiveCliAllowedTools: cliAllowedTools.join(","),
            runnerVerification,
            runner: "node",
            completed_at: new Date().toISOString(),
        });
        markRequest(file, { status: "done", completed_at: new Date().toISOString() });
    }
    catch (error) {
        const failure = (0, execution_kernel_1.classifyExecutionFailure)(error);
        const cancelled = failure.failureClass === "cancelled";
        const output = failure.failureClass === "timeout" ? "Agent 响应超时" : failure.message.slice(0, 4000);
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: false,
            cancelled,
            failure,
            error: output || "Agent Runner 执行失败",
            output,
            fileChanges,
            agentType,
            command: cliAllowedTools.length ? `${command} --allowed-tools ${cliAllowedTools.join(",")}` : command,
            cliAllowedTools,
            effectiveCliAllowedTools: cliAllowedTools.join(","),
            exitCode: error?.status ?? null,
            runner: "node",
            completed_at: new Date().toISOString(),
        });
        markRequest(file, { status: cancelled ? "cancelled" : "failed", completed_at: new Date().toISOString(), error: output });
        if (executionId)
            (0, execution_kernel_1.transitionExecution)(executionId, cancelled ? "cancelled" : "failed", output, { failure, failureClass: failure.failureClass });
    }
    finally {
        try {
            fs.unlinkSync(msgFile);
        }
        catch { }
        writeHeartbeat("idle", "");
    }
    return true;
}
async function runOnce() {
    ensureDirs();
    writeHeartbeat("scanning", "");
    const files = fs.readdirSync(REQUESTS_DIR)
        .filter(file => file.endsWith(".json"))
        .map(file => path.join(REQUESTS_DIR, file))
        .sort();
    let handled = 0;
    for (const file of files) {
        try {
            if (await runRequest(file))
                handled++;
        }
        catch (error) {
            console.error(`[agent-runner] ${path.basename(file)} ${error.message}`);
        }
    }
    writeHeartbeat("idle", "");
    return handled;
}
async function main() {
    (0, utils_1.refreshEnvPath)();
    ensureDirs();
    const watch = process.argv.includes("--watch");
    console.log(`[agent-runner] ${watch ? "watching" : "running once"} ${REQUESTS_DIR}`);
    if (!watch) {
        const handled = await runOnce();
        console.log(`[agent-runner] handled ${handled} request(s)`);
        return;
    }
    writeHeartbeat("idle", "");
    while (true) {
        await runOnce();
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}
main().catch(error => {
    writeHeartbeat("failed", error.message || String(error));
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=agent-runner.js.map