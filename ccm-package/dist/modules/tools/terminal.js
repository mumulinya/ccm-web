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
exports.stopAllTerminalRuns = stopAllTerminalRuns;
exports.handleTerminalApi = handleTerminalApi;
exports.runTerminalModuleSelfTest = runTerminalModuleSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const TERMINAL_STATE_FILE = path.join(utils_1.CCM_DIR, "terminal-workspace.json");
const TERMINAL_TEMP_DIR = path.join(utils_1.CCM_DIR, "temp", "terminal");
const MAX_ACTIVE_RUNS = 4;
const MAX_SESSIONS = 4;
const MAX_OUTPUT_LINES = 300;
const MAX_HISTORY = 200;
const MAX_COMMAND_LENGTH = 16_000;
const activeRuns = new Map();
function requestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 2 * 1024 * 1024)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求 JSON 无效"));
            }
        });
        req.on("error", reject);
    });
}
function normalizeCwd(value) {
    const candidate = String(value || "").trim() || os.homedir();
    try {
        if (fs.statSync(candidate).isDirectory())
            return candidate;
    }
    catch { }
    return os.homedir();
}
function compactText(value, max = 24_000) {
    const text = String(value || "");
    return text.length > max ? `${text.slice(0, max)}\n...[输出已截断]` : text;
}
function sanitizeWorkspace(input) {
    const sessions = (Array.isArray(input?.sessions) ? input.sessions : []).slice(0, MAX_SESSIONS).map((session, index) => ({
        id: String(session?.id || `terminal-${index + 1}`).slice(0, 100),
        name: String(session?.name || `终端 ${index + 1}`).slice(0, 80),
        selectedProject: String(session?.selectedProject || "").slice(0, 180),
        currentCwd: normalizeCwd(session?.currentCwd),
        history: (Array.isArray(session?.history) ? session.history : []).slice(-MAX_HISTORY).map((item) => String(item || "").slice(0, MAX_COMMAND_LENGTH)),
        terminalOutput: (Array.isArray(session?.terminalOutput) ? session.terminalOutput : []).slice(-MAX_OUTPUT_LINES).map((line) => ({
            text: compactText(line?.text),
            type: ["command", "output", "error", "system"].includes(String(line?.type)) ? String(line.type) : "output",
            time: String(line?.time || "").slice(0, 40),
        })),
        lastExitCode: session?.lastExitCode === null || session?.lastExitCode === undefined || session?.lastExitCode === ''
            ? null
            : Number.isFinite(Number(session.lastExitCode)) ? Number(session.lastExitCode) : null,
        lastDurationMs: Math.max(0, Number(session?.lastDurationMs || 0)),
    }));
    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        activeTerminalId: String(input?.activeTerminalId || sessions[0]?.id || ""),
        splitMode: input?.splitMode === true,
        sessions,
    };
}
function writeSse(res, payload) {
    if (!res.writableEnded && !res.destroyed)
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
function terminalScript(command, cwdReceiptFile) {
    if (process.platform === "win32") {
        const receipt = cwdReceiptFile.replace(/'/g, "''");
        return {
            executable: "powershell.exe",
            args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $OutputEncoding = [System.Text.UTF8Encoding]::new();\n${command}\n[IO.File]::WriteAllText('${receipt}', (Get-Location).ProviderPath, [System.Text.UTF8Encoding]::new($false))`],
        };
    }
    const receipt = cwdReceiptFile.replace(/'/g, `'"'"'`);
    return { executable: "bash", args: ["-lc", `${command}\nprintf '%s' \"$PWD\" > '${receipt}'`] };
}
function readFinalCwd(receiptFile, fallback) {
    try {
        const value = fs.readFileSync(receiptFile, "utf-8").replace(/^\uFEFF/, "").trim();
        if (value && fs.statSync(value).isDirectory())
            return value;
    }
    catch { }
    return fallback;
}
function startTerminalStream(payload, res) {
    const command = String(payload?.command || "").trim();
    if (!command)
        return (0, utils_1.sendJson)(res, { error: "命令不能为空" }, 400);
    if (command.length > MAX_COMMAND_LENGTH)
        return (0, utils_1.sendJson)(res, { error: "命令过长" }, 400);
    if (activeRuns.size >= MAX_ACTIVE_RUNS)
        return (0, utils_1.sendJson)(res, { error: `最多同时运行 ${MAX_ACTIVE_RUNS} 个终端命令` }, 429);
    const cwd = normalizeCwd(payload?.cwd);
    const runId = `terminal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const startedAt = Date.now();
    fs.mkdirSync(TERMINAL_TEMP_DIR, { recursive: true });
    const cwdReceiptFile = path.join(TERMINAL_TEMP_DIR, `${runId}.cwd`);
    const script = terminalScript(command, cwdReceiptFile);
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
    if (typeof res.flushHeaders === "function")
        res.flushHeaders();
    const child = (0, child_process_1.spawn)(script.executable, script.args, { cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"], env: process.env });
    const run = { id: runId, child, command, cwd, startedAt, stopped: false };
    activeRuns.set(runId, run);
    writeSse(res, { type: "started", runId, cwd, startedAt: new Date(startedAt).toISOString() });
    child.stdout.on("data", (chunk) => writeSse(res, { type: "stdout", text: chunk.toString("utf-8") }));
    child.stderr.on("data", (chunk) => writeSse(res, { type: "stderr", text: chunk.toString("utf-8") }));
    child.on("error", (error) => writeSse(res, { type: "stderr", text: error?.message || String(error) }));
    child.on("close", (code, signal) => {
        activeRuns.delete(runId);
        const finalCwd = readFinalCwd(cwdReceiptFile, cwd);
        try {
            fs.unlinkSync(cwdReceiptFile);
        }
        catch { }
        writeSse(res, { type: "done", runId, exitCode: typeof code === "number" ? code : (run.stopped ? 130 : 1), signal: signal || "", stopped: run.stopped, cwd: finalCwd, durationMs: Date.now() - startedAt });
        try {
            res.end();
        }
        catch { }
    });
}
function stopAllTerminalRuns() {
    for (const run of activeRuns.values()) {
        run.stopped = true;
        try {
            run.child.kill();
        }
        catch { }
    }
}
function handleTerminalApi(pathname, req, res) {
    if (pathname === "/api/terminal/stream" && req.method === "POST") {
        requestBody(req).then(payload => startTerminalStream(payload, res)).catch(error => (0, utils_1.sendJson)(res, { error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/terminal/stop" && req.method === "POST") {
        requestBody(req).then(payload => {
            const run = activeRuns.get(String(payload?.runId || ""));
            if (!run)
                return (0, utils_1.sendJson)(res, { success: false, error: "运行已结束或不存在" }, 404);
            run.stopped = true;
            try {
                run.child.kill();
            }
            catch { }
            (0, utils_1.sendJson)(res, { success: true, runId: run.id });
        }).catch(error => (0, utils_1.sendJson)(res, { error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/terminal/runs" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, runs: [...activeRuns.values()].map(run => ({ id: run.id, command: run.command, cwd: run.cwd, startedAt: new Date(run.startedAt).toISOString() })) });
        return true;
    }
    if (pathname === "/api/terminal/workspace" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, workspace: sanitizeWorkspace((0, atomic_json_file_1.readJsonWithBackup)(TERMINAL_STATE_FILE, { sessions: [] })) });
        return true;
    }
    if (pathname === "/api/terminal/workspace" && req.method === "PUT") {
        requestBody(req).then(payload => {
            const workspace = sanitizeWorkspace(payload?.workspace || payload);
            (0, atomic_json_file_1.writeJsonAtomic)(TERMINAL_STATE_FILE, workspace);
            (0, utils_1.sendJson)(res, { success: true, workspace });
        }).catch(error => (0, utils_1.sendJson)(res, { error: error.message }, 400));
        return true;
    }
    return false;
}
function runTerminalModuleSelfTest() {
    const sample = sanitizeWorkspace({ activeTerminalId: "one", splitMode: true, sessions: [{ id: "one", name: "主终端", currentCwd: os.homedir(), history: Array.from({ length: 240 }, (_, index) => `echo ${index}`), terminalOutput: Array.from({ length: 340 }, (_, index) => ({ text: `line ${index}`, type: "output" })) }] });
    return { success: sample.sessions.length === 1 && sample.sessions[0].history.length === MAX_HISTORY && sample.sessions[0].terminalOutput.length === MAX_OUTPUT_LINES, checks: { capsHistory: sample.sessions[0].history.length, capsOutput: sample.sessions[0].terminalOutput.length, validCwd: !!sample.sessions[0].currentCwd } };
}
//# sourceMappingURL=terminal.js.map