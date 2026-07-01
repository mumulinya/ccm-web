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
exports.inspectReliabilityDebt = inspectReliabilityDebt;
exports.reconcileStabilityDebt = reconcileStabilityDebt;
exports.collectSoakSample = collectSoakSample;
exports.startSoakTest = startSoakTest;
exports.getSoakTestStatus = getSoakTestStatus;
exports.sampleSoakTestNow = sampleSoakTestNow;
exports.stopSoakTest = stopSoakTest;
exports.resumeSoakTest = resumeSoakTest;
exports.shutdownSoakMonitor = shutdownSoakMonitor;
exports.getSoakReport = getSoakReport;
exports.runSoakTestSelfTest = runSoakTestSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const perf_hooks_1 = require("perf_hooks");
const worker_threads_1 = require("worker_threads");
const utils_1 = require("./utils");
const db_1 = require("./db");
const collaboration_resilience_1 = require("./collaboration-resilience");
const reliability_drills_1 = require("./reliability-drills");
const reliability_ledger_1 = require("./reliability-ledger");
const process_lifecycle_1 = require("./process-lifecycle");
const ROOT = path.join(utils_1.CCM_DIR, "reliability", "soak");
const STATE_FILE = path.join(ROOT, "state.json");
const REPORT_DIR = path.join(ROOT, "reports");
const BOOT_ID = (0, process_lifecycle_1.getProcessBootId)();
let sampleTimer = null;
let sampleInFlight = false;
const eventLoopHistogram = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 20 });
eventLoopHistogram.enable();
let eventLoopWindowStartedUptime = process.uptime();
let startupBoundaryTimer = null;
let pendingStartupWindow = null;
let freezeHashWorker = null;
let freezeHashRequestId = 0;
const freezeHashPending = new Map();
function ensureDirs() {
    fs.mkdirSync(ROOT, { recursive: true });
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}
function writeJsonAtomic(file, value) {
    ensureDirs();
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readJson(file, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    try {
        return JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function processAlive(pid) {
    if (!pid)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function readPid(file) {
    try {
        return Number(fs.readFileSync(file, "utf-8").trim()) || 0;
    }
    catch {
        return 0;
    }
}
function samplesFile(testId) {
    return path.join(ROOT, `samples-${String(testId).replace(/[^a-zA-Z0-9_.-]/g, "_")}.jsonl`);
}
function readSamples(testId) {
    const file = samplesFile(testId);
    if (!fs.existsSync(file))
        return [];
    return fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
function appendSample(testId, sample) {
    fs.appendFileSync(samplesFile(testId), `${JSON.stringify(sample)}\n`, "utf-8");
}
function taskCounts(tasks) {
    const statuses = {};
    for (const task of tasks)
        statuses[String(task.status || "unknown")] = Number(statuses[String(task.status || "unknown")] || 0) + 1;
    const idempotencyGroups = new Map();
    for (const task of tasks) {
        const key = String(task.idempotency_key || "").trim();
        if (key)
            idempotencyGroups.set(key, Number(idempotencyGroups.get(key) || 0) + 1);
    }
    return {
        total: tasks.length,
        statuses,
        duplicate_idempotency_groups: Array.from(idempotencyGroups.values()).filter(count => count > 1).length,
    };
}
function currentActiveLeaseTaskIds() {
    const now = Date.now();
    return new Set((0, reliability_ledger_1.listTaskLeases)().filter((item) => item.status === "active" && processAlive(Number(item.owner_pid || 0)) && Date.parse(item.expires_at || 0) > now).map((item) => item.task_id));
}
function orphanedTaskItems(tasks = (0, db_1.loadTasks)()) {
    const activeLeaseTasks = currentActiveLeaseTaskIds();
    return tasks.filter((task) => task.status === "in_progress" && Date.now() - Date.parse(task.updated_at || task.started_at || task.created_at || 0) > 30 * 60 * 1000 && !activeLeaseTasks.has(task.id))
        .map((task) => ({ task_id: task.id, trace_id: task.trace_id || "", title: task.title || "", updated_at: task.updated_at || "", group_id: task.group_id || "" }));
}
function inspectReliabilityDebt() {
    const ledger = (0, reliability_ledger_1.getReliabilityLedgerStats)();
    const configured = configuredFeishuConnections();
    const staleLocks = configured.filter((item) => item.lock_pid && !processAlive(item.lock_pid)).map((item) => ({ config: item.config, project: item.project, lock: item.lock, pid: item.lock_pid }));
    const orphanedTasks = orphanedTaskItems();
    return {
        generated_at: new Date().toISOString(),
        stale_idempotency: ledger.operations?.stale_items || [],
        stale_task_leases: ledger.leases?.stale_items || [],
        orphaned_tasks: orphanedTasks,
        stale_feishu_locks: staleLocks,
        counts: {
            stale_idempotency: Number(ledger.operations?.stale_in_progress || 0),
            stale_task_leases: Number(ledger.leases?.stale || 0),
            orphaned_tasks: orphanedTasks.length,
            stale_feishu_locks: staleLocks.length,
        },
    };
}
function reconcileStabilityDebt(reason = "生产级稳定性验收前清理历史债务") {
    const before = inspectReliabilityDebt();
    const ledger = (0, reliability_ledger_1.reconcileReliabilityLedgerDebt)(reason);
    const orphanIds = new Set(before.orphaned_tasks.map((item) => item.task_id));
    const tasks = (0, db_1.loadTasks)();
    const recoveredTasks = [];
    if (orphanIds.size) {
        for (const task of tasks) {
            if (!orphanIds.has(task.id))
                continue;
            task.status = "pending";
            task.status_detail = "稳定性债务清理：检测到旧进程遗留的无租约任务，已安全恢复为待执行";
            task.updated_at = new Date().toISOString();
            task.reliability_reconciliation = { at: task.updated_at, reason, previous_status: "in_progress" };
            recoveredTasks.push({ task_id: task.id, trace_id: task.trace_id || "", status: "pending" });
        }
        (0, db_1.saveTasks)(tasks);
    }
    const removedLocks = [];
    for (const lock of before.stale_feishu_locks) {
        const file = path.join(utils_1.CCM_DIR, "configs", lock.lock);
        try {
            const resolved = path.resolve(file);
            const root = path.resolve(path.join(utils_1.CCM_DIR, "configs"));
            if ((resolved === root || resolved.startsWith(`${root}${path.sep}`)) && fs.existsSync(resolved)) {
                fs.unlinkSync(resolved);
                removedLocks.push(lock);
            }
        }
        catch { }
    }
    const after = inspectReliabilityDebt();
    return { reconciled_at: new Date().toISOString(), reason, before, ledger, recovered_tasks: recoveredTasks, removed_feishu_locks: removedLocks, after, pass: Object.values(after.counts).every((value) => Number(value || 0) === 0) };
}
function runnerSnapshot() {
    const file = path.join(utils_1.CCM_DIR, "agent-runner", "heartbeat.json");
    const heartbeat = readJson(file, null);
    const pid = Number(heartbeat?.pid || 0);
    const ageMs = heartbeat?.updated_at ? Date.now() - Date.parse(heartbeat.updated_at) : null;
    return {
        status: heartbeat?.status || "missing",
        pid,
        process_alive: processAlive(pid),
        heartbeat_age_ms: ageMs,
        healthy: !!heartbeat && processAlive(pid) && ageMs !== null && ageMs < (heartbeat.status === "running" ? 10 * 60 * 1000 : 30_000) && heartbeat.status !== "error",
    };
}
function configuredFeishuConnections() {
    const configDir = path.join(utils_1.CCM_DIR, "configs");
    if (!fs.existsSync(configDir))
        return [];
    return fs.readdirSync(configDir).filter(name => /^config-.*\.toml$/i.test(name)).map(name => {
        const file = path.join(configDir, name);
        let content = "";
        try {
            content = fs.readFileSync(file, "utf-8");
        }
        catch { }
        if (!/\[\[projects\.platforms\]\][\s\S]*?type\s*=\s*["']feishu["']/i.test(content))
            return null;
        const project = (content.match(/\[\[projects\]\][\s\S]*?name\s*=\s*["']([^"']+)["']/i) || [])[1] || name.replace(/^config-|\.toml$/g, "");
        const lockName = `.${name}.lock`;
        const lockPid = readPid(path.join(configDir, lockName));
        const managedPid = readPid(path.join(utils_1.CCM_DIR, "pids", `${project}.pid`));
        const tempDir = path.join(utils_1.CCM_DIR, "temp");
        const tempPids = fs.existsSync(tempDir)
            ? fs.readdirSync(tempDir)
                .filter(item => item.startsWith(`.${project}-`) && item.endsWith(".toml.lock"))
                .map(item => ({ lock: item, pid: readPid(path.join(tempDir, item)) }))
            : [];
        const candidates = [
            { source: "config_lock", pid: lockPid },
            { source: "managed_pid", pid: managedPid },
            ...tempPids.map(item => ({ source: `temp_lock:${item.lock}`, pid: item.pid })),
        ];
        const active = candidates.find(item => item.pid && processAlive(item.pid));
        const pid = active?.pid || lockPid || managedPid || tempPids[0]?.pid || 0;
        return { config: name, project, lock: lockName, lock_pid: lockPid, managed_pid: managedPid, temp_locks: tempPids, pid, alive: !!active, source: active?.source || "missing" };
    }).filter(Boolean);
}
function feishuSnapshot(expectedConfigs = []) {
    const config = (0, db_1.loadFeishuConfig)();
    const globalPid = readPid(path.join(utils_1.CCM_DIR, "pids", "ccm-control-bot.pid"));
    const configured = configuredFeishuConnections();
    const wanted = expectedConfigs.length ? new Set(expectedConfigs) : new Set(configured.map((item) => item.config));
    const projectConnections = configured.filter((item) => wanted.has(item.config));
    const globalExpected = config.control_bot_enabled === true;
    const activeProjects = projectConnections.filter(item => item.alive);
    const connections = [
        ...(globalExpected ? [{ id: "global-control", kind: "global", name: "全局控制机器人", config: "feishu-config.json", project: "global-agent", pid: globalPid, alive: processAlive(globalPid), source: "control_bot_pid" }] : []),
        ...projectConnections.map((item) => ({ id: `project:${item.project}`, kind: "project", name: item.project, config: item.config, project: item.project, pid: item.pid, alive: item.alive, source: item.source })),
    ];
    const missingExpected = connections.filter(item => !item.alive);
    const activeConnections = connections.filter(item => item.alive);
    return {
        global: { expected: globalExpected, pid: globalPid, alive: processAlive(globalPid) },
        projects: projectConnections,
        expected_project_configs: Array.from(wanted),
        expected_project_connections: projectConnections.length,
        active_project_connections: activeProjects.length,
        connections,
        expected_connections: connections.length,
        active_connections: activeConnections.length,
        missing_expected_connections: missingExpected.map((item) => ({ id: item.id, kind: item.kind, name: item.name, config: item.config, project: item.project, pid: item.pid })),
        stale_project_locks: configured.filter((item) => item.lock_pid && !processAlive(item.lock_pid)).length,
        healthy: missingExpected.length === 0 && projectConnections.length === wanted.size,
    };
}
async function walkFiles(root, filter, output = []) {
    let items = [];
    try {
        items = await fs.promises.readdir(root, { withFileTypes: true });
    }
    catch {
        return output;
    }
    for (const item of items) {
        const file = path.join(root, item.name);
        if (item.isDirectory())
            await walkFiles(file, filter, output);
        else if (item.isFile() && filter(file))
            output.push(file);
    }
    return output;
}
function rejectFreezeHashPending(error) {
    for (const pending of freezeHashPending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
    }
    freezeHashPending.clear();
}
function getFreezeHashWorker() {
    if (freezeHashWorker)
        return freezeHashWorker;
    const worker = new worker_threads_1.Worker(`
      const { parentPort } = require("worker_threads");
      const fs = require("fs");
      const crypto = require("crypto");
      parentPort.on("message", ({ id, files }) => {
        try {
          const entries = files.map(([file, scope]) => {
            try {
              const stat = fs.statSync(file);
              const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
              return { file, scope, hash, size: stat.size, mtime_ms: stat.mtimeMs };
            } catch (error) {
              return { file, scope, hash: "", size: -1, mtime_ms: 0, error: String(error && error.message || error) };
            }
          });
          parentPort.postMessage({ id, entries });
        } catch (error) {
          parentPort.postMessage({ id, error: String(error && error.stack || error) });
        }
      });
    `, { eval: true });
    freezeHashWorker = worker;
    worker.on("message", message => {
        const pending = freezeHashPending.get(Number(message?.id));
        if (!pending)
            return;
        freezeHashPending.delete(Number(message.id));
        clearTimeout(pending.timeout);
        if (message?.error)
            pending.reject(new Error(message.error));
        else
            pending.resolve(Array.isArray(message?.entries) ? message.entries : []);
    });
    worker.on("error", error => {
        if (freezeHashWorker === worker)
            freezeHashWorker = null;
        rejectFreezeHashPending(error instanceof Error ? error : new Error(String(error)));
    });
    worker.on("exit", code => {
        if (freezeHashWorker === worker)
            freezeHashWorker = null;
        if (code !== 0 && freezeHashPending.size)
            rejectFreezeHashPending(new Error(`冻结清单 Worker 退出，code=${code}`));
    });
    return worker;
}
function stopFreezeHashWorker() {
    const worker = freezeHashWorker;
    freezeHashWorker = null;
    rejectFreezeHashPending(new Error("冻结清单 Worker 已停止"));
    if (worker)
        void worker.terminate();
}
function hashFreezeFilesInWorker(files) {
    return new Promise((resolve, reject) => {
        const worker = getFreezeHashWorker();
        const id = ++freezeHashRequestId;
        const timeout = setTimeout(() => {
            freezeHashPending.delete(id);
            reject(new Error("冻结清单 Worker 超时"));
        }, 60_000);
        timeout.unref?.();
        freezeHashPending.set(id, { resolve, reject, timeout });
        worker.postMessage({ id, files });
    });
}
function resolveProjectRoot() {
    const candidates = [
        path.join(utils_1.CCM_DIR, "ccm"),
        process.cwd(),
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../.."),
    ];
    return candidates.find(candidate => fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "ccm-package"))) || path.join(utils_1.CCM_DIR, "ccm");
}
async function freezeManifest() {
    const projectRoot = resolveProjectRoot();
    const [backendFiles, frontendFiles, scriptFiles, distFiles, publicFiles, tomlFiles] = await Promise.all([
        walkFiles(path.join(projectRoot, "backend"), file => /\.(?:ts|js|json)$/i.test(file)),
        walkFiles(path.join(projectRoot, "frontend", "src"), file => /\.(?:vue|ts|tsx|js|jsx|css|scss|json)$/i.test(file)),
        walkFiles(path.join(projectRoot, "scripts"), file => /\.(?:js|mjs|cjs|ts|json)$/i.test(file)),
        walkFiles(path.join(projectRoot, "ccm-package", "dist"), file => /\.(?:js|json)$/i.test(file)),
        walkFiles(path.join(projectRoot, "ccm-package", "public"), () => true),
        walkFiles(path.join(utils_1.CCM_DIR, "configs"), file => file.endsWith(".toml")),
    ]);
    const codeFiles = [
        path.join(projectRoot, "package.json"),
        path.join(projectRoot, "package-lock.json"),
        path.join(projectRoot, "frontend", "package.json"),
        ...backendFiles,
        ...frontendFiles,
        ...scriptFiles,
        ...distFiles,
        ...publicFiles,
    ].filter(file => fs.existsSync(file));
    const configFiles = [
        path.join(utils_1.CCM_DIR, "project-configs.json"),
        path.join(utils_1.CCM_DIR, "groups.json"),
        path.join(utils_1.CCM_DIR, "config.toml"),
        path.join(utils_1.CCM_DIR, "feishu-config.json"),
        path.join(utils_1.CCM_DIR, "group-orchestrator-config.json"),
        path.join(utils_1.CCM_DIR, "smithery-config.json"),
        ...tomlFiles,
    ].filter(file => fs.existsSync(file));
    const scoped = new Map();
    for (const file of codeFiles)
        scoped.set(path.resolve(file), "code");
    for (const file of configFiles)
        scoped.set(path.resolve(file), "config");
    const files = Array.from(scoped.entries()).sort(([left], [right]) => left.localeCompare(right));
    const workerEntries = await hashFreezeFilesInWorker(files);
    const entries = workerEntries.map(entry => ({
        path: path.relative(utils_1.CCM_DIR, entry.file).replace(/\\/g, "/"),
        scope: entry.scope,
        hash: entry.hash,
        size: entry.size,
        mtime_ms: entry.mtime_ms,
        ...(entry.error ? { error: entry.error } : {}),
    }));
    const requiredRuntime = path.join(projectRoot, "ccm-package", "dist", "server.js");
    const counts = { code: entries.filter(entry => entry.scope === "code").length, config: entries.filter(entry => entry.scope === "config").length };
    const contentIdentity = entries.map(entry => ({ path: entry.path, scope: entry.scope, hash: entry.hash, size: entry.size, error: entry.error || "" }));
    return {
        hash: crypto.createHash("sha256").update(JSON.stringify(contentIdentity)).digest("hex"),
        files: entries.length,
        counts,
        complete: fs.existsSync(requiredRuntime) && counts.code > 0 && counts.config > 0,
        project_root: projectRoot,
        required_runtime: path.relative(utils_1.CCM_DIR, requiredRuntime).replace(/\\/g, "/"),
        entries,
    };
}
async function eventLoopLagMs() {
    const started = Date.now();
    await new Promise(resolve => setTimeout(resolve, 25));
    return Math.max(0, Date.now() - started - 25);
}
function yieldToEventLoop() {
    return new Promise(resolve => setImmediate(resolve));
}
function nanosecondsToMilliseconds(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number >= 0 && number < 1e15 ? Number((number / 1_000_000).toFixed(3)) : 0;
}
function readEventLoopHistogramWindow(phase) {
    const endedUptime = process.uptime();
    const count = Number(eventLoopHistogram.count || 0);
    const value = {
        phase,
        window_started_uptime_seconds: Number(eventLoopWindowStartedUptime.toFixed(3)),
        window_ended_uptime_seconds: Number(endedUptime.toFixed(3)),
        samples: count,
        min: count ? nanosecondsToMilliseconds(eventLoopHistogram.min) : 0,
        mean: count ? nanosecondsToMilliseconds(eventLoopHistogram.mean) : 0,
        p95: count ? nanosecondsToMilliseconds(eventLoopHistogram.percentile(95)) : 0,
        p99: count ? nanosecondsToMilliseconds(eventLoopHistogram.percentile(99)) : 0,
        max: count ? nanosecondsToMilliseconds(eventLoopHistogram.max) : 0,
    };
    eventLoopHistogram.reset();
    eventLoopWindowStartedUptime = endedUptime;
    return value;
}
function armEventLoopStartupBoundary(graceSeconds) {
    if (startupBoundaryTimer)
        clearTimeout(startupBoundaryTimer);
    startupBoundaryTimer = null;
    pendingStartupWindow = null;
    eventLoopHistogram.reset();
    eventLoopWindowStartedUptime = process.uptime();
    const remainingMs = Math.round((Number(graceSeconds || 30) - process.uptime()) * 1000);
    if (remainingMs <= 0)
        return;
    startupBoundaryTimer = setTimeout(() => {
        pendingStartupWindow = readEventLoopHistogramWindow("startup");
        startupBoundaryTimer = null;
    }, remainingMs);
    startupBoundaryTimer.unref?.();
}
function takeContinuousEventLoopWindow(graceSeconds) {
    const ended = process.uptime();
    const phase = ended <= graceSeconds ? "startup" : eventLoopWindowStartedUptime >= graceSeconds ? "runtime" : "transition";
    const current = readEventLoopHistogramWindow(phase);
    const startup = pendingStartupWindow;
    pendingStartupWindow = null;
    return { current, startup };
}
function makeAlert(code, severity, message, data = {}) {
    return { code, severity, message, data };
}
function evaluateSample(sample, baseline, options = {}) {
    const alerts = [];
    const rssGrowth = Number(sample.memory.rss || 0) - Number(baseline?.memory?.rss || sample.memory.rss || 0);
    const traceGrowth = Number(sample.ledger.traces.bytes || 0) - Number(baseline?.ledger?.traces?.bytes || sample.ledger.traces.bytes || 0);
    if (!sample.runner.healthy)
        alerts.push(makeAlert("runner_unhealthy", "critical", "Agent Runner 心跳或进程异常", sample.runner));
    if (!sample.feishu.healthy)
        alerts.push(makeAlert("feishu_unhealthy", "critical", "至少一个预期的飞书连接未存活", sample.feishu));
    if (sample.ledger.leases.stale > Number(baseline?.ledger?.leases?.stale || 0))
        alerts.push(makeAlert("new_stale_task_lease", "warning", `新增失效任务租约：${sample.ledger.leases.stale - Number(baseline?.ledger?.leases?.stale || 0)}`, { entity_ids: (sample.ledger.leases.stale_items || []).map((item) => item.task_id), items: sample.ledger.leases.stale_items || [] }));
    if (sample.ledger.operations.stale_in_progress > Number(baseline?.ledger?.operations?.stale_in_progress || 0))
        alerts.push(makeAlert("new_stale_idempotency", "warning", `新增失效幂等操作：${sample.ledger.operations.stale_in_progress - Number(baseline?.ledger?.operations?.stale_in_progress || 0)}`, { entity_ids: (sample.ledger.operations.stale_items || []).map((item) => item.operation_id), items: sample.ledger.operations.stale_items || [] }));
    if (sample.tasks.duplicate_idempotency_groups > Number(baseline?.tasks?.duplicate_idempotency_groups || 0))
        alerts.push(makeAlert("new_duplicate_tasks", "critical", `新增重复任务组：${sample.tasks.duplicate_idempotency_groups - Number(baseline?.tasks?.duplicate_idempotency_groups || 0)}`));
    if (sample.tasks.stuck_without_lease > Number(baseline?.tasks?.stuck_without_lease || 0))
        alerts.push(makeAlert("new_stuck_tasks", "critical", `新增无有效租约的长时间执行任务：${sample.tasks.stuck_without_lease - Number(baseline?.tasks?.stuck_without_lease || 0)}`, { entity_ids: (sample.tasks.stuck_items || []).map((item) => item.task_id), items: sample.tasks.stuck_items || [] }));
    const startupLag = Math.max(Number(sample.event_loop_startup_window_ms?.max || 0), sample.event_loop_phase !== "runtime" ? Number(sample.event_loop_lag_ms || 0) : 0);
    const runtimeLag = sample.event_loop_phase === "runtime" ? Number(sample.event_loop_lag_ms || 0) : 0;
    if (startupLag > 500)
        alerts.push(makeAlert("event_loop_lag_startup", "info", `启动期事件循环延迟峰值 ${startupLag}ms`, { boot_id: sample.boot_id, phase: "startup", window: sample.event_loop_startup_window_ms || sample.event_loop_delay_window_ms }));
    if (runtimeLag > 2000)
        alerts.push(makeAlert("event_loop_lag_critical", "critical", `非启动期事件循环严重延迟峰值 ${runtimeLag}ms`, { boot_id: sample.boot_id, phase: "runtime", window: sample.event_loop_delay_window_ms }));
    else if (runtimeLag > 500)
        alerts.push(makeAlert("event_loop_lag", "warning", `非启动期事件循环延迟峰值 ${runtimeLag}ms`, { boot_id: sample.boot_id, phase: "runtime", window: sample.event_loop_delay_window_ms }));
    if (rssGrowth > 256 * 1024 * 1024)
        alerts.push(makeAlert("rss_growth", "warning", `RSS 相对基线增长 ${Math.round(rssGrowth / 1024 / 1024)}MB`));
    if (traceGrowth > 200 * 1024 * 1024)
        alerts.push(makeAlert("trace_growth", "warning", `Trace 数据相对基线增长 ${Math.round(traceGrowth / 1024 / 1024)}MB`));
    if (!Object.values(sample.runtimes).some(Boolean))
        alerts.push(makeAlert("all_runtimes_unavailable", "critical", "Claude/Codex/Cursor 均不可用"));
    if (sample.drill?.last_result?.pass === false)
        alerts.push(makeAlert("fault_drill_failed", "critical", "最近一次自动故障演练失败", sample.drill.last_result));
    if (options.clean_mode && sample.freeze?.hash !== baseline?.freeze?.hash)
        alerts.push(makeAlert("freeze_violation", "critical", "干净验收期间代码或配置发生变化", { baseline_hash: baseline?.freeze?.hash || "", current_hash: sample.freeze?.hash || "" }));
    const baselineStarts = Number(baseline?.lifecycle?.starts || 0);
    if (options.clean_mode && Number(sample.lifecycle?.starts || 0) > baselineStarts)
        alerts.push(makeAlert("process_restart_during_clean_soak", "critical", "干净验收期间检测到 CCM 进程重启", { starts: Number(sample.lifecycle?.starts || 0) - baselineStarts, boot_id: sample.boot_id }));
    return alerts.map(alert => ({
        ...alert,
        data: {
            pid: Number(sample.pid || process.pid),
            boot_id: String(sample.boot_id || BOOT_ID),
            sample_at: String(sample.at || new Date().toISOString()),
            reason: String(alert.message || ""),
            ...(alert.data || {}),
        },
    }));
}
function alertFingerprint(alert) {
    const ids = Array.isArray(alert?.data?.entity_ids) ? alert.data.entity_ids.map(String).sort() : [];
    const boot = String(alert?.data?.boot_id || "");
    return crypto.createHash("sha256").update(`${alert.code}|${ids.join(",")}|${boot}`).digest("hex").slice(0, 20);
}
function updateAlertIncidents(state, alerts, sample) {
    const incidents = Array.isArray(state.incidents) ? state.incidents : [];
    const active = new Set();
    for (const alert of alerts) {
        const fingerprint = alertFingerprint(alert);
        active.add(fingerprint);
        let incident = [...incidents].reverse().find((item) => item.fingerprint === fingerprint && !item.resolved_at);
        if (!incident) {
            incident = {
                id: `inc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
                fingerprint,
                code: alert.code,
                severity: alert.severity,
                message: alert.message,
                data: alert.data || {},
                observations: 0,
                first_at: sample.at,
                last_at: sample.at,
                resolved_at: "",
            };
            incidents.push(incident);
        }
        incident.observations = Number(incident.observations || 0) + 1;
        incident.last_at = sample.at;
        incident.message = alert.message;
        incident.data = alert.data || {};
    }
    for (const incident of incidents) {
        if (!incident.resolved_at && !active.has(incident.fingerprint))
            incident.resolved_at = sample.at;
    }
    const grouped = new Map();
    for (const incident of incidents) {
        const key = `${incident.code}|${incident.severity}`;
        const item = grouped.get(key) || { code: incident.code, severity: incident.severity, message: incident.message, count: 0, observations: 0, first_at: incident.first_at, last_at: incident.last_at, open_incidents: 0, data: incident.data };
        item.count++;
        item.observations += Number(incident.observations || 0);
        if (Date.parse(incident.first_at) < Date.parse(item.first_at))
            item.first_at = incident.first_at;
        if (Date.parse(incident.last_at) > Date.parse(item.last_at))
            item.last_at = incident.last_at;
        if (!incident.resolved_at)
            item.open_incidents++;
        item.message = incident.message;
        item.data = incident.data;
        grouped.set(key, item);
    }
    state.incidents = incidents.slice(-1000);
    state.alerts = Array.from(grouped.values()).slice(-200);
    return state;
}
async function collectSoakSample(options = {}) {
    const snapshotStarted = Date.now();
    const graceSeconds = Number(options.startup_grace_seconds || options.startupGraceSeconds || 30);
    const pointLag = await eventLoopLagMs();
    const continuousLag = takeContinuousEventLoopWindow(graceSeconds);
    const stages = {};
    const timed = (name, operation) => {
        const started = Date.now();
        const result = operation();
        stages[name] = Date.now() - started;
        return result;
    };
    const tasks = timed("tasks", db_1.loadTasks);
    await yieldToEventLoop();
    const leases = timed("leases", reliability_ledger_1.listTaskLeases);
    const activeLeaseTasks = new Set(leases.filter((item) => item.status === "active" && processAlive(Number(item.owner_pid || 0)) && Date.parse(item.expires_at || 0) > Date.now()).map((item) => item.task_id));
    const stuckItems = tasks.filter((task) => task.status === "in_progress" && Date.now() - Date.parse(task.updated_at || task.started_at || task.created_at || 0) > 30 * 60 * 1000 && !activeLeaseTasks.has(task.id)).map((task) => ({ task_id: task.id, trace_id: task.trace_id || "", updated_at: task.updated_at || "" }));
    await yieldToEventLoop();
    const expectedFeishu = Array.isArray(options.expected_feishu_configs || options.expectedFeishuConfigs) ? (options.expected_feishu_configs || options.expectedFeishuConfigs) : [];
    const ledger = timed("ledger", reliability_ledger_1.getReliabilityLedgerStats);
    await yieldToEventLoop();
    const runner = timed("runner", runnerSnapshot);
    const feishu = timed("feishu", () => feishuSnapshot(expectedFeishu));
    await yieldToEventLoop();
    const freezeStarted = Date.now();
    const freeze = await freezeManifest();
    stages.freeze_manifest = Date.now() - freezeStarted;
    await yieldToEventLoop();
    const lifecycle = timed("lifecycle", () => (0, process_lifecycle_1.getProcessLifecycleSnapshot)({ since: options.started_at || options.startedAt || 0, event_limit: 20 }).counts);
    const runtimes = timed("runtimes", () => ({
        claudecode: (0, collaboration_resilience_1.isRuntimeCommandAvailable)("claudecode"),
        codex: (0, collaboration_resilience_1.isRuntimeCommandAvailable)("codex"),
        cursor: (0, collaboration_resilience_1.isRuntimeCommandAvailable)("cursor"),
    }));
    const drill = timed("drill", reliability_drills_1.getReliabilityDrillStatus);
    timed("lifecycle_touch", process_lifecycle_1.touchProcessLifecycle);
    await yieldToEventLoop();
    const memory = process.memoryUsage();
    return {
        at: new Date().toISOString(),
        boot_id: BOOT_ID,
        pid: process.pid,
        uptime_seconds: Math.round(process.uptime()),
        memory: { rss: memory.rss, heap_used: memory.heapUsed, heap_total: memory.heapTotal, external: memory.external },
        event_loop_lag_ms: Math.max(pointLag, Number(continuousLag.current.max || 0)),
        event_loop_point_lag_ms: pointLag,
        event_loop_phase: continuousLag.current.phase,
        event_loop_delay_window_ms: continuousLag.current,
        event_loop_startup_window_ms: continuousLag.startup,
        startup_phase: continuousLag.current.phase !== "runtime",
        diagnostic_stage_ms: stages,
        snapshot_duration_ms: Date.now() - snapshotStarted,
        tasks: { ...taskCounts(tasks), stuck_without_lease: stuckItems.length, stuck_items: stuckItems },
        ledger,
        runner,
        feishu,
        freeze,
        lifecycle,
        runtimes,
        drill,
    };
}
function percentile(numbers, quantile) {
    if (!numbers.length)
        return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const position = (sorted.length - 1) * quantile;
    const low = Math.floor(position);
    const high = Math.ceil(position);
    return Math.round(sorted[low] + (sorted[high] - sorted[low]) * (position - low));
}
function regressionPerHour(samples, selector) {
    if (samples.length < 3)
        return 0;
    const start = Date.parse(samples[0].at);
    const points = samples.map(sample => ({ x: (Date.parse(sample.at) - start) / 3_600_000, y: selector(sample) })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length < 3)
        return 0;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    return denominator ? Math.round(points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator) : 0;
}
function aggregateSamples(state, samples) {
    const values = (selector) => samples.map(selector).filter(Number.isFinite);
    const summarize = (numbers) => numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers), avg: Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length), first: numbers[0], last: numbers[numbers.length - 1] } : { min: 0, max: 0, avg: 0, first: 0, last: 0 };
    const rss = summarize(values(sample => Number(sample.memory?.rss || 0)));
    const heap = summarize(values(sample => Number(sample.memory?.heap_used || 0)));
    const lag = summarize(values(sample => Number(sample.event_loop_lag_ms || 0)));
    const runtimeLagValues = values(sample => (sample.event_loop_phase ? sample.event_loop_phase !== "runtime" : sample.startup_phase) ? NaN : Number(sample.event_loop_lag_ms || 0));
    const startupLagValues = values(sample => Math.max(Number(sample.event_loop_startup_window_ms?.max || 0), sample.event_loop_phase === "startup" ? Number(sample.event_loop_lag_ms || 0) : 0));
    const stageNames = Array.from(new Set(samples.flatMap(sample => Object.keys(sample.diagnostic_stage_ms || {}))));
    const diagnosticStages = Object.fromEntries(stageNames.map(name => [name, summarize(values(sample => Number(sample.diagnostic_stage_ms?.[name] || 0)))]));
    const runnerHealthy = samples.filter(sample => sample.runner?.healthy).length;
    const feishuHealthy = samples.filter(sample => sample.feishu?.healthy).length;
    const expectedConnections = Array.isArray(state.baseline?.feishu?.connections) ? state.baseline.feishu.connections : [];
    const perConnection = expectedConnections.map((connection) => {
        const aliveSamples = samples.filter(sample => (sample.feishu?.connections || []).some((item) => item.id === connection.id && item.alive)).length;
        const pids = Array.from(new Set(samples.flatMap(sample => (sample.feishu?.connections || []).filter((item) => item.id === connection.id && item.pid).map((item) => Number(item.pid)))));
        return { id: connection.id, kind: connection.kind, name: connection.name, project: connection.project, config: connection.config, alive_samples: aliveSamples, total_samples: samples.length, availability_percent: samples.length ? Number((aliveSamples / samples.length * 100).toFixed(2)) : 0, pids };
    });
    const everyExpectedFeishuConnectionHealthy = perConnection.length === expectedConnections.length && perConnection.every((item) => item.availability_percent === 100);
    const noSevereRuntimeEventLoopDelay = !runtimeLagValues.length || Math.max(...runtimeLagValues) <= 2000;
    const criticalAlerts = (state.alerts || []).filter((alert) => alert.severity === "critical");
    const warningAlerts = (state.alerts || []).filter((alert) => alert.severity === "warning");
    const duplicateGroupsMax = Math.max(0, ...samples.map(sample => Number(sample.tasks?.duplicate_idempotency_groups || 0)));
    const stuckTasksMax = Math.max(0, ...samples.map(sample => Number(sample.tasks?.stuck_without_lease || 0)));
    const baselineDuplicateGroups = Number(state.baseline?.tasks?.duplicate_idempotency_groups || 0);
    const baselineStuckTasks = Number(state.baseline?.tasks?.stuck_without_lease || 0);
    const restarts = new Set(samples.map(sample => sample.boot_id).filter(Boolean)).size - 1;
    const durationHours = samples.length > 1 ? (Date.parse(samples[samples.length - 1].at) - Date.parse(samples[0].at)) / 3_600_000 : 0;
    const rssGrowthPerHour = durationHours > 0 ? Math.round((rss.last - rss.first) / durationHours) : 0;
    const staleOperationsMax = Math.max(0, ...samples.map(sample => Number(sample.ledger?.operations?.stale_in_progress || 0)));
    const staleLeasesMax = Math.max(0, ...samples.map(sample => Number(sample.ledger?.leases?.stale || 0)));
    const baselineStaleOperations = Number(state.baseline?.ledger?.operations?.stale_in_progress || 0);
    const baselineStaleLeases = Number(state.baseline?.ledger?.leases?.stale || 0);
    const freezeStable = samples.every(sample => sample.freeze?.hash === state.baseline?.freeze?.hash);
    const lifecycle = (0, process_lifecycle_1.getProcessLifecycleSnapshot)({ since: state.started_at, event_limit: 1000 });
    const bootGroups = new Map();
    for (const sample of samples) {
        const group = bootGroups.get(sample.boot_id) || [];
        group.push(sample);
        bootGroups.set(sample.boot_id, group);
    }
    const contiguousHours = Array.from(bootGroups.values()).map(group => group.length > 1 ? (Date.parse(group[group.length - 1].at) - Date.parse(group[0].at)) / 3_600_000 : 0);
    const maxContiguousHours = contiguousHours.length ? Math.max(...contiguousHours) : 0;
    const warmed = samples.filter(sample => Number(sample.uptime_seconds || 0) >= 600 && sample.boot_id === samples[samples.length - 1]?.boot_id);
    const rssRegression = regressionPerHour(warmed, sample => Number(sample.memory?.rss || 0));
    // Ignore the noisy warm-up window, then fail a production soak when the
    // long-running RSS trend exceeds 8 MiB/hour. Sixty samples means this gate
    // only becomes authoritative after roughly one hour at the default cadence.
    const rssTrendStable = warmed.length < 60 || rssRegression <= 8 * 1024 * 1024;
    // During a running soak the elapsed time is naturally below 24 hours. Every
    // terminal clean report (including a manual stop) must prove the full window.
    const singleProcessDurationMet = !state.clean_mode || state.status === "running" || (state.status === "completed" && bootGroups.size === 1 && maxContiguousHours >= 23.9);
    const cleanRequirements = !state.clean_mode || (restarts === 0
        && Number(lifecycle.counts?.unexpected_restarts || 0) === 0
        && staleOperationsMax <= baselineStaleOperations
        && staleLeasesMax <= baselineStaleLeases
        && freezeStable
        && rssTrendStable
        && singleProcessDurationMet
        && everyExpectedFeishuConnectionHealthy
        && noSevereRuntimeEventLoopDelay
        && criticalAlerts.length === 0);
    const pass = criticalAlerts.length === 0 && duplicateGroupsMax <= baselineDuplicateGroups && stuckTasksMax <= baselineStuckTasks && runnerHealthy === samples.length && feishuHealthy === samples.length && cleanRequirements && Number(state.sample_errors || 0) === 0;
    return {
        verdict: pass ? "stable" : criticalAlerts.length ? "failed" : "warning",
        pass,
        samples: samples.length,
        observed_hours: Number(durationHours.toFixed(3)),
        restarts_observed: Math.max(0, restarts),
        restart_classification: lifecycle.counts,
        single_process: {
            one_boot: bootGroups.size === 1,
            max_contiguous_hours: Number(maxContiguousHours.toFixed(3)),
        },
        availability: {
            runner_percent: samples.length ? Number((runnerHealthy / samples.length * 100).toFixed(2)) : 0,
            feishu_percent: samples.length ? Number((feishuHealthy / samples.length * 100).toFixed(2)) : 0,
            expected_feishu_connections: expectedConnections.length,
            per_connection: perConnection,
        },
        memory: { rss, heap_used: heap, rss_growth_per_hour: rssGrowthPerHour, warmed_rss_regression_per_hour: rssRegression, warmed_samples: warmed.length },
        event_loop_lag_ms: { ...lag, continuous_monitor: true, startup_max: startupLagValues.length ? Math.max(...startupLagValues) : 0, runtime_p95: percentile(runtimeLagValues, 0.95), runtime_p99: percentile(runtimeLagValues, 0.99), runtime_max: runtimeLagValues.length ? Math.max(...runtimeLagValues) : 0 },
        diagnostics: { snapshot_duration_ms: summarize(values(sample => Number(sample.snapshot_duration_ms || 0))), stages: diagnosticStages },
        invariants: {
            no_new_duplicate_tasks: duplicateGroupsMax <= baselineDuplicateGroups,
            no_new_stuck_tasks_without_lease: stuckTasksMax <= baselineStuckTasks,
            runner_always_healthy: runnerHealthy === samples.length,
            feishu_always_healthy: feishuHealthy === samples.length,
            every_expected_feishu_connection_100_percent: everyExpectedFeishuConnectionHealthy,
            no_severe_runtime_event_loop_delay: noSevereRuntimeEventLoopDelay,
            fault_drill_passed: samples.every(sample => sample.drill?.last_result?.pass !== false),
            no_unexpected_restarts: Number(lifecycle.counts?.unexpected_restarts || 0) === 0,
            no_new_stale_idempotency: staleOperationsMax <= baselineStaleOperations,
            no_new_stale_task_leases: staleLeasesMax <= baselineStaleLeases,
            code_and_config_frozen: freezeStable,
            rss_trend_stable: rssTrendStable,
            single_process_24h: singleProcessDurationMet,
            sample_loop_error_free: Number(state.sample_errors || 0) === 0,
        },
        alerts: { critical: criticalAlerts.reduce((sum, item) => sum + Number(item.count || 1), 0), warning: warningAlerts.reduce((sum, item) => sum + Number(item.count || 1), 0), info: (state.alerts || []).filter((alert) => alert.severity === "info").reduce((sum, item) => sum + Number(item.count || 1), 0), items: state.alerts || [], incidents: state.incidents || [] },
    };
}
function reportMarkdown(state, summary) {
    const mb = (value) => `${(Number(value || 0) / 1024 / 1024).toFixed(1)} MB`;
    return [
        `# CCM ${state.duration_hours} 小时稳定性浸泡测试报告`,
        "",
        `- 测试 ID：${state.id}`,
        `- 状态：${state.status}`,
        `- 开始：${state.started_at}`,
        `- 结束：${state.completed_at || state.ends_at}`,
        `- 结论：${summary.verdict}`,
        `- 样本：${summary.samples}`,
        `- 检测到服务重启：${summary.restarts_observed} 次`,
        `- 非预期重启：${summary.restart_classification?.unexpected_restarts || 0} 次`,
        `- 最长单进程连续观测：${summary.single_process?.max_contiguous_hours || 0} 小时`,
        "",
        "## 可用性",
        "",
        `- Agent Runner：${summary.availability.runner_percent}%`,
        `- 飞书连接：${summary.availability.feishu_percent}%`,
        `- 预期飞书机器人：${summary.availability.expected_feishu_connections || 0} 个`,
        ...((summary.availability.per_connection || []).map((item) => `- ${item.name || item.id}（${item.kind}）：${item.availability_percent}%｜PID ${item.pids?.join(", ") || "无"}`)),
        "",
        "## 资源",
        "",
        `- RSS：${mb(summary.memory.rss.first)} → ${mb(summary.memory.rss.last)}，峰值 ${mb(summary.memory.rss.max)}`,
        `- RSS 增长速率：${mb(summary.memory.rss_growth_per_hour)}/小时`,
        `- 预热后同进程 RSS 回归斜率：${mb(summary.memory.warmed_rss_regression_per_hour)}/小时（${summary.memory.warmed_samples || 0} 个样本）`,
        `- Heap 峰值：${mb(summary.memory.heap_used.max)}`,
        `- 事件循环延迟峰值：${summary.event_loop_lag_ms.max} ms`,
        `- 连续事件循环监控：${summary.event_loop_lag_ms.continuous_monitor ? "已启用" : "未启用"}`,
        `- 启动期延迟峰值：${summary.event_loop_lag_ms.startup_max || 0} ms`,
        `- 非启动期连续窗口延迟：P95 ${summary.event_loop_lag_ms.runtime_p95 || 0} ms，P99 ${summary.event_loop_lag_ms.runtime_p99 || 0} ms，峰值 ${summary.event_loop_lag_ms.runtime_max || 0} ms`,
        `- 诊断快照耗时：平均 ${summary.diagnostics?.snapshot_duration_ms?.avg || 0} ms，峰值 ${summary.diagnostics?.snapshot_duration_ms?.max || 0} ms`,
        "",
        "## 起始基线",
        "",
        `- 原有无租约长时间任务：${state.baseline_findings?.stuck_tasks_without_lease || 0}`,
        `- 原有失效租约：${state.baseline_findings?.stale_task_leases || 0}`,
        `- 原有失效飞书锁文件：${state.baseline_findings?.stale_feishu_lock_files || 0}`,
        "",
        "## 核心不变量",
        "",
        ...Object.entries(summary.invariants).map(([key, value]) => `- ${value ? "通过" : "失败"}：${key}`),
        "",
        "## 告警",
        "",
        ...(summary.alerts.items.length ? summary.alerts.items.map((item) => `- [${item.severity}] ${item.code}：${item.message}（独立事故 ${item.count} 次，采样命中 ${item.observations || item.count} 次，首次 ${item.first_at}）`) : ["- 无"]),
        "",
    ].join("\n");
}
function finishTest(state, status, reason = "") {
    if (sampleTimer)
        clearInterval(sampleTimer);
    sampleTimer = null;
    if (startupBoundaryTimer)
        clearTimeout(startupBoundaryTimer);
    startupBoundaryTimer = null;
    state.status = status;
    state.completed_at = new Date().toISOString();
    state.stop_reason = reason;
    const samples = readSamples(state.id);
    const summary = aggregateSamples(state, samples);
    const jsonFile = path.join(REPORT_DIR, `${state.id}.json`);
    const markdownFile = path.join(REPORT_DIR, `${state.id}.md`);
    const report = { version: 1, test: { ...state, latest_sample: undefined }, summary, generated_at: new Date().toISOString() };
    writeJsonAtomic(jsonFile, report);
    fs.writeFileSync(markdownFile, reportMarkdown(state, summary), "utf-8");
    state.report = { json_path: jsonFile, markdown_path: markdownFile, summary };
    writeJsonAtomic(STATE_FILE, state);
    stopFreezeHashWorker();
    return state;
}
async function takeSampleAndPersist() {
    if (sampleInFlight)
        return getSoakTestStatus();
    sampleInFlight = true;
    try {
        const state = readJson(STATE_FILE, null);
        if (!state || state.status !== "running")
            return state;
        const sample = await collectSoakSample({ ...(state.options || {}), started_at: state.started_at });
        const alerts = evaluateSample(sample, state.baseline, state.options || {});
        appendSample(state.id, { ...sample, alerts });
        updateAlertIncidents(state, alerts, sample);
        state.samples_count = Number(state.samples_count || 0) + 1;
        state.last_sample_at = sample.at;
        state.next_sample_at = new Date(Date.now() + state.interval_ms).toISOString();
        state.latest_sample = sample;
        state.boot_ids = Array.from(new Set([...(state.boot_ids || []), BOOT_ID]));
        writeJsonAtomic(STATE_FILE, state);
        if (Date.now() >= Date.parse(state.ends_at))
            return finishTest(state, "completed");
        return state;
    }
    catch (error) {
        const state = readJson(STATE_FILE, null);
        if (state) {
            state.sample_errors = Number(state.sample_errors || 0) + 1;
            state.last_sample_error = String(error.message || error).slice(0, 2000);
            writeJsonAtomic(STATE_FILE, state);
        }
        return state;
    }
    finally {
        sampleInFlight = false;
    }
}
function scheduleSamples(state) {
    if (sampleTimer)
        clearInterval(sampleTimer);
    sampleTimer = setInterval(() => { void takeSampleAndPersist(); }, state.interval_ms);
    sampleTimer.unref?.();
}
async function startSoakTest(options = {}) {
    ensureDirs();
    const existing = readJson(STATE_FILE, null);
    if (existing?.status === "running" && options.force !== true)
        return { started: false, already_running: true, state: existing };
    if (existing?.status === "running")
        finishTest(existing, "stopped", "由新浸泡测试替换");
    const durationMs = Math.max(5_000, Math.min(7 * 24 * 60 * 60 * 1000, Number(options.duration_ms || options.durationMs || 24 * 60 * 60 * 1000)));
    const intervalMs = Math.max(1_000, Math.min(10 * 60 * 1000, Number(options.interval_ms || options.intervalMs || 60_000)));
    const startedAt = new Date().toISOString();
    const cleanMode = options.clean_mode === true || options.cleanMode === true;
    const expectedFeishuConfigs = Array.isArray(options.expected_feishu_configs || options.expectedFeishuConfigs)
        ? (options.expected_feishu_configs || options.expectedFeishuConfigs).map(String)
        : configuredFeishuConnections().map((item) => item.config);
    const normalizedOptions = {
        clean_mode: cleanMode,
        expected_feishu_configs: expectedFeishuConfigs,
        startup_grace_seconds: Math.max(5, Math.min(300, Number(options.startup_grace_seconds || options.startupGraceSeconds || 30))),
    };
    armEventLoopStartupBoundary(normalizedOptions.startup_grace_seconds);
    const reconciliation = cleanMode && options.reconcile_debt !== false && options.reconcileDebt !== false ? reconcileStabilityDebt() : null;
    const initialSample = await collectSoakSample({ ...normalizedOptions, started_at: startedAt });
    const debt = inspectReliabilityDebt();
    const preflight = {
        checked_at: new Date().toISOString(),
        debt,
        runner_healthy: initialSample.runner?.healthy === true,
        feishu_healthy: initialSample.feishu?.healthy === true,
        expected_feishu_configs: expectedFeishuConfigs,
        missing_feishu_connections: initialSample.feishu?.missing_expected_connections || [],
        freeze: initialSample.freeze,
        process_boot_id: initialSample.boot_id,
        process_uptime_seconds: initialSample.uptime_seconds,
    };
    preflight.freeze_complete = initialSample.freeze?.complete === true;
    preflight.ready = Object.values(debt.counts).every((value) => Number(value || 0) === 0) && preflight.runner_healthy && preflight.feishu_healthy && preflight.freeze_complete;
    if (cleanMode && !preflight.ready)
        return { started: false, blocked: true, message: "干净 24 小时验收前置条件未满足", preflight, reconciliation };
    const state = {
        version: 1,
        id: `soak_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        status: "running",
        started_at: startedAt,
        ends_at: new Date(Date.now() + durationMs).toISOString(),
        duration_ms: durationMs,
        duration_hours: Number((durationMs / 3_600_000).toFixed(3)),
        interval_ms: intervalMs,
        samples_count: 0,
        sample_errors: 0,
        alerts: [],
        incidents: [],
        boot_ids: [BOOT_ID],
        clean_mode: cleanMode,
        options: normalizedOptions,
        preflight,
        reconciliation,
        baseline: initialSample,
        baseline_findings: {
            stale_task_leases: initialSample.ledger?.leases?.stale || 0,
            stale_idempotency_operations: initialSample.ledger?.operations?.stale_in_progress || 0,
            stuck_tasks_without_lease: initialSample.tasks?.stuck_without_lease || 0,
            duplicate_task_groups: initialSample.tasks?.duplicate_idempotency_groups || 0,
            stale_feishu_lock_files: initialSample.feishu?.stale_project_locks || 0,
        },
        latest_sample: initialSample,
        next_sample_at: new Date(Date.now() + intervalMs).toISOString(),
    };
    writeJsonAtomic(STATE_FILE, state);
    const initialAlerts = evaluateSample(initialSample, initialSample, normalizedOptions);
    appendSample(state.id, { ...initialSample, alerts: initialAlerts });
    updateAlertIncidents(state, initialAlerts, initialSample);
    state.samples_count = 1;
    state.last_sample_at = initialSample.at;
    writeJsonAtomic(STATE_FILE, state);
    scheduleSamples(state);
    return { started: true, state };
}
function getSoakTestStatus() {
    const state = readJson(STATE_FILE, null);
    if (!state)
        return { status: "not_started" };
    return {
        ...state,
        scheduler_running: !!sampleTimer,
        remaining_ms: state.status === "running" ? Math.max(0, Date.parse(state.ends_at) - Date.now()) : 0,
    };
}
async function sampleSoakTestNow() {
    return takeSampleAndPersist();
}
function stopSoakTest(reason = "用户停止浸泡测试") {
    const state = readJson(STATE_FILE, null);
    if (!state || state.status !== "running")
        return state || { status: "not_started" };
    return finishTest(state, "stopped", reason);
}
function resumeSoakTest() {
    const state = readJson(STATE_FILE, null);
    if (!state || state.status !== "running")
        return { resumed: false, state };
    state.boot_ids = Array.from(new Set([...(state.boot_ids || []), BOOT_ID]));
    state.resumed_at = new Date().toISOString();
    armEventLoopStartupBoundary(Number(state.options?.startup_grace_seconds || 30));
    writeJsonAtomic(STATE_FILE, state);
    if (Date.now() >= Date.parse(state.ends_at)) {
        void takeSampleAndPersist();
        return { resumed: true, finalizing: true, state };
    }
    scheduleSamples(state);
    void takeSampleAndPersist();
    return { resumed: true, state };
}
function shutdownSoakMonitor() {
    if (sampleTimer)
        clearInterval(sampleTimer);
    sampleTimer = null;
    if (startupBoundaryTimer)
        clearTimeout(startupBoundaryTimer);
    startupBoundaryTimer = null;
    stopFreezeHashWorker();
}
function getSoakReport() {
    const state = readJson(STATE_FILE, null);
    if (!state?.report?.json_path)
        return null;
    return readJson(state.report.json_path, null);
}
function runSoakTestSelfTest() {
    const samples = [
        { at: "2026-01-01T00:00:00.000Z", boot_id: "a", memory: { rss: 100, heap_used: 50 }, event_loop_lag_ms: 2, runner: { healthy: true }, feishu: { healthy: true }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, drill: { last_result: { pass: true } } },
        { at: "2026-01-01T01:00:00.000Z", boot_id: "b", memory: { rss: 120, heap_used: 60 }, event_loop_lag_ms: 3, runner: { healthy: true }, feishu: { healthy: true }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, drill: { last_result: { pass: true } } },
    ];
    const summary = aggregateSamples({ alerts: [] }, samples);
    const incidentState = { incidents: [], alerts: [] };
    const repeated = makeAlert("new_stale_task_lease", "warning", "新增失效任务租约：1", { entity_ids: ["task-a"] });
    updateAlertIncidents(incidentState, [repeated], { at: "2026-01-01T00:00:00.000Z" });
    updateAlertIncidents(incidentState, [repeated], { at: "2026-01-01T00:01:00.000Z" });
    updateAlertIncidents(incidentState, [], { at: "2026-01-01T00:02:00.000Z" });
    const alertBaseline = { memory: { rss: 100 }, ledger: { traces: { bytes: 0 }, leases: { stale: 0 }, operations: { stale_in_progress: 0 } }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, freeze: { hash: "same" } };
    const startupAlerts = evaluateSample({ memory: { rss: 100 }, ledger: { traces: { bytes: 0 }, leases: { stale: 0 }, operations: { stale_in_progress: 0 } }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, runner: { healthy: true }, feishu: { healthy: true }, runtimes: { codex: true }, drill: { last_result: { pass: true } }, event_loop_lag_ms: 3000, startup_phase: true, boot_id: "boot", freeze: { hash: "same" }, lifecycle: { starts: 0 } }, alertBaseline, { clean_mode: true });
    const shortCleanSamples = [0, 1].map(minute => ({
        at: `2099-01-01T00:0${minute}:00.000Z`, boot_id: "one-boot", pid: 42, uptime_seconds: 600 + minute * 60,
        memory: { rss: 100, heap_used: 50 }, event_loop_lag_ms: 2, runner: { healthy: true }, feishu: { healthy: true },
        tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 },
        ledger: { operations: { stale_in_progress: 0 }, leases: { stale: 0 } }, freeze: { hash: "frozen" }, drill: { last_result: { pass: true } },
    }));
    const stoppedCleanSummary = aggregateSamples({ clean_mode: true, status: "stopped", started_at: "2099-01-01T00:00:00.000Z", alerts: [], incidents: [], sample_errors: 0, baseline: shortCleanSamples[0] }, shortCleanSamples);
    const checks = {
        stableSamplesPass: summary.pass === true && summary.verdict === "stable",
        restartIsObserved: summary.restarts_observed === 1,
        availabilityCalculated: summary.availability.runner_percent === 100 && summary.availability.feishu_percent === 100,
        memorySlopeCalculated: summary.memory.rss_growth_per_hour === 20,
        repeatedSamplesBecomeOneIncident: incidentState.alerts[0]?.count === 1 && incidentState.alerts[0]?.observations === 2 && !!incidentState.incidents[0]?.resolved_at,
        startupLagIsInformational: startupAlerts.some((item) => item.code === "event_loop_lag_startup" && item.severity === "info") && !startupAlerts.some((item) => item.code === "event_loop_lag_critical"),
        alertsCarryProcessEvidence: startupAlerts.every((item) => Number(item.data?.pid || 0) > 0 && item.data?.boot_id === "boot" && !!item.data?.reason),
        stoppedCleanRunCannotPass: stoppedCleanSummary.pass === false && stoppedCleanSummary.invariants.single_process_24h === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=soak-test.js.map