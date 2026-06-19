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
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const agent_runtime_1 = require("./agent-runtime");
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
async function runRequest(file) {
    const request = readJson(file);
    if (!request?.id || request.status === "done" || request.status === "running")
        return false;
    const resultFile = path.join(RESULTS_DIR, `${request.id}.json`);
    if (fs.existsSync(resultFile))
        return false;
    markRequest(file, { status: "running", runner_pid: process.pid, started_at: new Date().toISOString() });
    writeHeartbeat("running", `${request.projectName || "agent"} ${request.id}`);
    const msgFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.txt`);
    const workDir = request.workDir || process.cwd();
    const agentType = (0, agent_runtime_1.normalizeAgentRuntimeId)(request.agentType || "claudecode");
    const command = (0, agent_runtime_1.getAgentCommandLabel)(agentType);
    const timeoutMs = Number(request.timeoutMs || 300000);
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    try {
        fs.writeFileSync(msgFile, String(request.message || ""), "utf-8");
        const output = (0, child_process_1.execSync)((0, agent_runtime_1.buildAgentCommand)(agentType, msgFile), {
            encoding: "utf-8",
            timeout: timeoutMs,
            cwd: workDir,
            shell: true,
            maxBuffer: 10 * 1024 * 1024,
        }).trim();
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: true,
            output,
            fileChanges,
            agentType,
            command,
            runner: "node",
            completed_at: new Date().toISOString(),
        });
        markRequest(file, { status: "done", completed_at: new Date().toISOString() });
    }
    catch (error) {
        const output = error?.killed || error?.signal === "SIGTERM"
            ? "Agent 响应超时"
            : String(error?.stderr || error?.message || error || "").slice(0, 4000);
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: false,
            error: output || "Agent Runner 执行失败",
            output,
            fileChanges,
            agentType,
            command,
            exitCode: error?.status ?? null,
            runner: "node",
            completed_at: new Date().toISOString(),
        });
        markRequest(file, { status: "failed", completed_at: new Date().toISOString(), error: output });
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
main().catch((error) => {
    writeHeartbeat("error", error.message || String(error));
    console.error("[agent-runner]", error);
    process.exit(1);
});
//# sourceMappingURL=agent-runner.js.map