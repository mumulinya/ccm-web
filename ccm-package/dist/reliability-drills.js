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
exports.getReliabilityDrillStatus = getReliabilityDrillStatus;
exports.runProductionReliabilityDrills = runProductionReliabilityDrills;
exports.runScheduledProductionReliabilityDrill = runScheduledProductionReliabilityDrill;
exports.startReliabilityDrillScheduler = startReliabilityDrillScheduler;
exports.stopReliabilityDrillScheduler = stopReliabilityDrillScheduler;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const agent_worktree_1 = require("./agent-worktree");
const collaboration_resilience_1 = require("./collaboration-resilience");
const task_agent_sessions_1 = require("./task-agent-sessions");
const reliability_ledger_1 = require("./reliability-ledger");
const DRILL_STATUS_FILE = path.join(utils_1.CCM_DIR, "reliability", "drill-status.json");
let drillScheduler = null;
function readDrillStatus() {
    try {
        return JSON.parse(fs.readFileSync(DRILL_STATUS_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
function writeDrillStatus(value) {
    fs.mkdirSync(path.dirname(DRILL_STATUS_FILE), { recursive: true });
    const temp = `${DRILL_STATUS_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, DRILL_STATUS_FILE);
}
function getReliabilityDrillStatus() {
    const status = readDrillStatus();
    const lastRunAt = Date.parse(status.last_run_at || 0);
    return {
        ...status,
        scheduler_running: !!drillScheduler,
        next_run_at: Number.isFinite(lastRunAt) ? new Date(lastRunAt + 24 * 60 * 60 * 1000).toISOString() : null,
    };
}
function run(command, args, cwd) {
    const result = (0, child_process_1.spawnSync)(command, args, { cwd, encoding: "utf-8", windowsHide: true });
    if (result.status !== 0)
        throw new Error(String(result.stderr || result.stdout || `${command} failed`).trim());
    return String(result.stdout || "").trim();
}
function runProductionReliabilityDrills() {
    const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-e2e-reliability-"));
    const traceId = (0, reliability_ledger_1.createTraceId)("e2e");
    const intakeKey = `feishu-message-${suffix}`;
    const taskId = `e2e-task-${suffix}`;
    const mergeKey = `merge-${taskId}`;
    let worktreePath = "";
    let worktreeBranch = "";
    try {
        run("git", ["init"], repo);
        run("git", ["config", "user.email", "ccm-e2e@example.invalid"], repo);
        run("git", ["config", "user.name", "CCM Reliability E2E"], repo);
        fs.mkdirSync(path.join(repo, "src"), { recursive: true });
        fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ name: "ccm-reliability-e2e", private: true, scripts: { test: "node --test" } }, null, 2), "utf-8");
        fs.writeFileSync(path.join(repo, "src", "base.js"), "module.exports = true;\n", "utf-8");
        run("git", ["add", "."], repo);
        run("git", ["commit", "-m", "initial"], repo);
        const intake = (0, reliability_ledger_1.acquireIdempotency)({ scope: "drill-feishu-event", key: intakeKey, traceId, metadata: { scenario: "duplicate-message" } });
        const duplicateDuringIntake = (0, reliability_ledger_1.acquireIdempotency)({ scope: "drill-feishu-event", key: intakeKey, traceId });
        (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `${taskId}:intake`, type: "e2e.intake", status: "ok", task_id: taskId, message: "群聊开发任务已接收" });
        (0, reliability_ledger_1.completeIdempotency)("drill-feishu-event", intakeKey, { task_id: taskId });
        const duplicateAfterIntake = (0, reliability_ledger_1.acquireIdempotency)({ scope: "drill-feishu-event", key: intakeKey, traceId });
        const lease = (0, reliability_ledger_1.acquireTaskLease)(taskId, traceId, 30_000);
        const conflictPlan = (0, collaboration_resilience_1.buildCollaborationConflictPlan)([
            { key: "backend", project: "backend-agent", task: "实现 src/payment.js", workDir: repo, writablePaths: ["src", "test"] },
            { key: "test", project: "test-agent", task: "验证 src/payment.js 并补充 test/payment.test.js", workDir: repo, writablePaths: ["src", "test"] },
        ], "parallel");
        const reuseKey = conflictPlan.lanes[0].conflictWorkspaceKey;
        const first = (0, agent_worktree_1.prepareChildAgentWorkDir)(repo, { mode: "worktree", failClosed: true, taskId, agentName: reuseKey, sourceProject: "coordinator", reuseKey });
        worktreePath = first.worktreePath || "";
        worktreeBranch = first.worktreeBranch || "";
        fs.mkdirSync(path.join(first.workDir, "src"), { recursive: true });
        fs.writeFileSync(path.join(first.workDir, "src", "payment.js"), "exports.total = (amount, fee) => amount + fee;\n", "utf-8");
        (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `${taskId}:backend-receipt`, type: "worker.receipt", status: "ok", task_id: taskId, agent: "backend-agent", message: "支付计算实现完成", data: { filesChanged: ["src/payment.js"] } });
        const second = (0, agent_worktree_1.prepareChildAgentWorkDir)(repo, { mode: "worktree", failClosed: true, taskId, agentName: reuseKey, sourceProject: "coordinator", reuseKey });
        const upstreamVisible = fs.existsSync(path.join(second.workDir, "src", "payment.js"));
        fs.mkdirSync(path.join(second.workDir, "test"), { recursive: true });
        fs.writeFileSync(path.join(second.workDir, "test", "payment.test.js"), [
            "const test = require('node:test');",
            "const assert = require('node:assert/strict');",
            "const { total } = require('../src/payment');",
            "test('adds fee', () => assert.equal(total(100, 2), 102));",
            "",
        ].join("\n"), "utf-8");
        const verification = (0, child_process_1.spawnSync)(process.execPath, ["--test"], { cwd: second.workDir, encoding: "utf-8", windowsHide: true });
        const verificationPassed = verification.status === 0;
        (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `${taskId}:verification`, type: "verification.completed", status: verificationPassed ? "ok" : "error", task_id: taskId, agent: "test-agent", message: verificationPassed ? "node --test passed" : String(verification.stderr || verification.stdout).slice(0, 500) });
        if (!verificationPassed)
            throw new Error(String(verification.stderr || verification.stdout || "verification failed"));
        run("git", ["add", "-A"], second.workDir);
        run("git", ["commit", "-m", "feat: payment reliability drill"], second.workDir);
        const mergeOperation = (0, reliability_ledger_1.acquireIdempotency)({ scope: "drill-merge", key: mergeKey, traceId });
        const baseBranch = run("git", ["branch", "--show-current"], repo);
        run("git", ["checkout", baseBranch], repo);
        run("git", ["merge", "--no-ff", worktreeBranch, "-m", `merge: ${taskId}`], repo);
        const mergeCommit = run("git", ["rev-parse", "HEAD"], repo);
        (0, reliability_ledger_1.completeIdempotency)("drill-merge", mergeKey, { merge_commit: mergeCommit });
        const duplicateMerge = (0, reliability_ledger_1.acquireIdempotency)({ scope: "drill-merge", key: mergeKey, traceId });
        const headAfterReplay = run("git", ["rev-parse", "HEAD"], repo);
        (0, reliability_ledger_1.releaseTaskLease)(taskId, "done");
        (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `${taskId}:done`, type: "e2e.completed", status: "ok", task_id: taskId, message: "群聊→多 Agent→验证→合并闭环完成", data: { merge_commit: mergeCommit } });
        const ledger = (0, reliability_ledger_1.runReliabilityLedgerSelfTest)();
        const session = (0, task_agent_sessions_1.runTaskAgentSessionSelfTest)();
        const fallbackDecision = (0, collaboration_resilience_1.shouldSwitchRuntime)("Agent 进程退出：simulated provider crash");
        const trace = (0, reliability_ledger_1.getTrace)(traceId);
        const checks = {
            intakeAcceptedOnce: intake.acquired === true,
            duplicateMessageSuppressedWhileRunning: duplicateDuringIntake.acquired === false && duplicateDuringIntake.inProgress === true,
            duplicateMessageReplaysOriginalTask: duplicateAfterIntake.record?.result?.task_id === taskId,
            taskLeaseAcquired: lease.acquired === true,
            conflictPredictedAndSerialized: conflictPlan.protected === true && conflictPlan.effectiveOrder === "sequential",
            agentsShareProtectedWorktree: first.workDir === second.workDir && second.reused === true,
            downstreamWorkerSeesUpstreamChange: upstreamVisible,
            realVerificationPassed: verificationPassed,
            mergeExecutedOnce: mergeOperation.acquired === true && duplicateMerge.acquired === false && duplicateMerge.record?.result?.merge_commit === mergeCommit && headAfterReplay === mergeCommit,
            runtimeCrashTriggersFallback: fallbackDecision.switchRuntime === true,
            missingNativeSessionHasSafeRecovery: session.checks?.missingNativeIdCanDegradeSafely === true,
            staleLeaseRecoveryWorks: ledger.checks?.deadOwnerLeaseIsRecovered === true,
            traceExplainsWholeDelivery: Array.isArray(trace?.events) && trace.events.some((item) => item.type === "e2e.intake") && trace.events.some((item) => item.type === "verification.completed") && trace.events.some((item) => item.type === "e2e.completed"),
        };
        return { pass: Object.values(checks).every(Boolean), trace_id: traceId, task_id: taskId, merge_commit: mergeCommit, checks };
    }
    finally {
        if (worktreePath)
            (0, child_process_1.spawnSync)("git", ["worktree", "remove", "--force", worktreePath], { cwd: repo, windowsHide: true, stdio: "ignore" });
        if (worktreeBranch)
            (0, child_process_1.spawnSync)("git", ["branch", "-D", worktreeBranch], { cwd: repo, windowsHide: true, stdio: "ignore" });
        try {
            fs.rmSync(repo, { recursive: true, force: true });
        }
        catch { }
    }
}
function runScheduledProductionReliabilityDrill(options = {}) {
    const minIntervalMs = Math.max(60_000, Number(options.minIntervalMs || 24 * 60 * 60 * 1000));
    const status = readDrillStatus();
    const lastRunAt = Date.parse(status.last_run_at || 0);
    if (!options.force && Number.isFinite(lastRunAt) && Date.now() - lastRunAt < minIntervalMs) {
        return { skipped: true, reason: "not_due", next_run_at: new Date(lastRunAt + minIntervalMs).toISOString(), last_result: status.last_result || null };
    }
    const startedAt = new Date().toISOString();
    try {
        const result = runProductionReliabilityDrills();
        writeDrillStatus({ last_run_at: startedAt, last_completed_at: new Date().toISOString(), last_result: result, consecutive_failures: result.pass ? 0 : Number(status.consecutive_failures || 0) + 1 });
        return { skipped: false, result };
    }
    catch (error) {
        const failure = { pass: false, error: error.message || String(error) };
        writeDrillStatus({ last_run_at: startedAt, last_completed_at: new Date().toISOString(), last_result: failure, consecutive_failures: Number(status.consecutive_failures || 0) + 1 });
        return { skipped: false, result: failure };
    }
}
function startReliabilityDrillScheduler() {
    if (process.env.CCM_RELIABILITY_DRILLS === "0")
        return false;
    if (drillScheduler)
        clearInterval(drillScheduler);
    const runIfDue = () => {
        const outcome = runScheduledProductionReliabilityDrill();
        if (!outcome.skipped && outcome.result?.pass === false)
            console.error("[Reliability Drill]", outcome.result.error || "故障演练失败");
    };
    setTimeout(runIfDue, 30_000).unref?.();
    drillScheduler = setInterval(runIfDue, 6 * 60 * 60 * 1000);
    drillScheduler.unref?.();
    return true;
}
function stopReliabilityDrillScheduler() {
    if (drillScheduler)
        clearInterval(drillScheduler);
    drillScheduler = null;
}
//# sourceMappingURL=reliability-drills.js.map