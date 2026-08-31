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
exports.resolveCodeIntelligenceWorkerHeapMb = resolveCodeIntelligenceWorkerHeapMb;
exports.executeCodeIntelligenceToolInWorker = executeCodeIntelligenceToolInWorker;
exports.startCodeIntelligenceIndexRunInWorker = startCodeIntelligenceIndexRunInWorker;
exports.getCodeIntelligenceWorkerStatus = getCodeIntelligenceWorkerStatus;
exports.runCodeIntelligenceWorkerSelfTest = runCodeIntelligenceWorkerSelfTest;
exports.shutdownCodeIntelligenceWorker = shutdownCodeIntelligenceWorker;
const child_process_1 = require("child_process");
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const pending = new Map();
const activeRunIds = new Set();
let worker = null;
let workerReady = null;
let readyResolve = null;
let readyReject = null;
let idleTimer = null;
let intentionalShutdown = false;
let lastFailureAt = 0;
let consecutiveFailures = 0;
let workerTelemetry = { rssMb: 0, heapUsedMb: 0 };
const MB = 1024 * 1024;
const IDLE_SHUTDOWN_MS = Math.max(60_000, Number(process.env.CCM_CODE_INTELLIGENCE_IDLE_MS || 5 * 60_000));
function resolveCodeIntelligenceWorkerHeapMb() {
    const configured = Number(process.env.CCM_CODE_INTELLIGENCE_HEAP_MB || 0);
    if (Number.isFinite(configured) && configured >= 1024)
        return Math.max(1024, Math.min(12_288, Math.floor(configured / 256) * 256));
    const totalMb = Math.max(2048, Math.floor(os.totalmem() / MB));
    // A heap ceiling is not preallocated.  Forty percent lets the semantic
    // worker grow on large projects while retaining memory for Windows, the
    // HTTP/Agent process and external language servers.
    return Math.max(2048, Math.min(8192, Math.floor((totalMb * 0.4) / 256) * 256));
}
function clearIdleTimer() {
    if (idleTimer)
        clearTimeout(idleTimer);
    idleTimer = null;
}
function scheduleIdleShutdown() {
    clearIdleTimer();
    if (!worker || activeRunIds.size)
        return;
    // The server has its own listener keeping it alive.  Do not make short-lived
    // maintenance/tests wait for the semantic worker's idle timeout.
    if (!pending.size) {
        worker.unref();
        worker.channel?.unref?.();
        worker.stderr?.unref?.();
    }
    idleTimer = setTimeout(() => {
        if (!worker || activeRunIds.size || pending.size)
            return;
        intentionalShutdown = true;
        worker.send?.({ type: "shutdown" });
        const target = worker;
        setTimeout(() => { if (target.exitCode === null)
            target.kill(); }, 2_000).unref();
    }, IDLE_SHUTDOWN_MS);
    idleTimer.unref();
}
async function markRunsFailed(reason) {
    if (!activeRunIds.size)
        return;
    try {
        const engine = await Promise.resolve().then(() => __importStar(require("./code-intelligence")));
        for (const runId of activeRunIds)
            engine.failCodeIntelligenceIndexRun(runId, reason);
    }
    catch { }
    activeRunIds.clear();
}
function rejectPending(reason) {
    for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(reason));
    }
    pending.clear();
}
function attachWorker(child, heapLimitMb) {
    let stderrTail = "";
    child.stderr?.on("data", chunk => {
        stderrTail = `${stderrTail}${String(chunk || "")}`.slice(-4_000);
    });
    child.on("message", (raw) => {
        const message = raw || {};
        if (message.type === "ready") {
            consecutiveFailures = 0;
            readyResolve?.();
            readyResolve = null;
            readyReject = null;
            scheduleIdleShutdown();
            return;
        }
        if (message.type === "background") {
            if (message.runId && message.state === "started")
                activeRunIds.add(message.runId);
            if (message.runId && message.state === "finished")
                activeRunIds.delete(message.runId);
            scheduleIdleShutdown();
            return;
        }
        if (message.type !== "response" || !message.id)
            return;
        if (message.telemetry)
            workerTelemetry = message.telemetry;
        const request = pending.get(message.id);
        if (!request)
            return;
        pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.ok)
            request.resolve(message.result);
        else
            request.reject(new Error(String(message.error || "代码智能Worker执行失败")));
        scheduleIdleShutdown();
    });
    child.once("error", error => {
        readyReject?.(error);
        rejectPending(`代码智能Worker启动失败：${error.message}`);
    });
    child.once("exit", (code, signal) => {
        clearIdleTimer();
        const expected = intentionalShutdown;
        const rejectReady = readyReject;
        intentionalShutdown = false;
        worker = null;
        workerReady = null;
        readyResolve = null;
        readyReject = null;
        if (!expected) {
            consecutiveFailures += 1;
            lastFailureAt = Date.now();
            const safeError = stderrTail
                .replaceAll(process.cwd(), "<workspace>")
                .replaceAll(os.homedir(), "<home>")
                .replace(/\s+/g, " ")
                .trim()
                .slice(-1_000);
            const reason = `代码智能Worker异常退出（code=${code ?? ""}, signal=${signal || ""}, heap=${heapLimitMb}MB），主服务未受影响${safeError ? `：${safeError}` : ""}`;
            rejectReady?.(new Error(reason));
            rejectPending(reason);
            void markRunsFailed(reason);
        }
    });
}
function ensureWorker() {
    if (worker && worker.connected && workerReady)
        return workerReady;
    if (consecutiveFailures >= 3 && Date.now() - lastFailureAt < 30_000) {
        return Promise.reject(new Error("代码智能Worker连续异常，已暂时停止重启；请稍后重试"));
    }
    clearIdleTimer();
    intentionalShutdown = false;
    const heapLimitMb = resolveCodeIntelligenceWorkerHeapMb();
    const workerFile = path.join(__dirname, "code-intelligence-worker.js");
    worker = (0, child_process_1.fork)(workerFile, [], {
        env: { ...process.env, CCM_CODE_INTELLIGENCE_WORKER: "1", CCM_CODE_INTELLIGENCE_HEAP_MB: String(heapLimitMb) },
        // Never inherit --eval/--print/inspect flags from maintenance launchers;
        // doing so can recursively execute the parent command instead of the
        // dedicated worker entrypoint.
        execArgv: [`--max-old-space-size=${heapLimitMb}`],
        stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    workerReady = new Promise((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
        const timer = setTimeout(() => reject(new Error("代码智能Worker启动超时")), 15_000);
        timer.unref();
        worker.once("message", (message) => { if (message?.type === "ready")
            clearTimeout(timer); });
    });
    attachWorker(worker, heapLimitMb);
    return workerReady;
}
async function requestWorker(method, args, timeoutMs) {
    await ensureWorker();
    if (!worker?.connected)
        throw new Error("代码智能Worker不可用");
    clearIdleTimer();
    worker.ref();
    worker.channel?.ref?.();
    worker.stderr?.ref?.();
    const id = `ciw_${crypto.randomUUID()}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`代码智能Worker请求超时：${method}`));
        }, timeoutMs);
        timer.unref();
        pending.set(id, { resolve, reject, timer });
        worker.send({ type: "request", id, method, args }, error => {
            if (!error)
                return;
            const request = pending.get(id);
            if (!request)
                return;
            pending.delete(id);
            clearTimeout(request.timer);
            request.reject(error);
        });
    });
}
function executeCodeIntelligenceToolInWorker(project, tool, args) {
    return requestWorker("execute_tool", [project, tool, args], 180_000);
}
function startCodeIntelligenceIndexRunInWorker(project, mode, reason = "") {
    return requestWorker("start_index_run", [project, mode, reason], 30_000);
}
function getCodeIntelligenceWorkerStatus() {
    return {
        schema: "ccm-code-intelligence-worker-status-v1",
        state: worker?.connected ? "running" : "stopped",
        pid: worker?.pid || 0,
        heapLimitMb: resolveCodeIntelligenceWorkerHeapMb(),
        rssMb: workerTelemetry.rssMb,
        heapUsedMb: workerTelemetry.heapUsedMb,
        activeRuns: activeRunIds.size,
        pendingRequests: pending.size,
        restartSuppressed: consecutiveFailures >= 3 && Date.now() - lastFailureAt < 30_000,
        contentStored: false,
    };
}
function runCodeIntelligenceWorkerSelfTest() {
    return requestWorker("self_test", [], 30_000);
}
async function shutdownCodeIntelligenceWorker() {
    clearIdleTimer();
    if (!worker)
        return;
    const target = worker;
    intentionalShutdown = true;
    target.ref();
    target.channel?.ref?.();
    target.stderr?.ref?.();
    await new Promise(resolve => {
        const timer = setTimeout(() => { if (target.exitCode === null)
            target.kill(); resolve(); }, 2_000);
        target.once("exit", () => { clearTimeout(timer); resolve(); });
        target.send?.({ type: "shutdown" });
    });
}
//# sourceMappingURL=code-intelligence-worker-client.js.map