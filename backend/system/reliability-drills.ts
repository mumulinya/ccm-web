import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { CCM_DIR } from "../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { prepareChildAgentWorkDir } from "../agents/worktree";
import { buildCollaborationConflictPlan, shouldSwitchRuntime } from "../modules/collaboration/collaboration-resilience";
import { runTaskAgentSessionSelfTest } from "../tasks/agent-sessions";
import {
  acquireIdempotency,
  acquireTaskLease,
  appendTraceEvent,
  completeIdempotency,
  createTraceId,
  getTrace,
  releaseTaskLease,
  runReliabilityLedgerSelfTest,
} from "./reliability-ledger";
import { getObservabilityDatabase, withImmediateObservabilityTransaction } from "./observability-database";
import { terminateManagedProcessTree } from "./managed-process-tree";

const DRILL_STATUS_FILE = path.join(CCM_DIR, "reliability", "drill-status.json");
let drillScheduler: NodeJS.Timeout | null = null;
const activeDrillProcesses = new Map<string, ChildProcess>();
const DRILL_LEASE_TASK = "reliability-drill:production";
const DRILL_TIMEOUT_MS = 20 * 60_000;
const DRILL_OUTPUT_LIMIT = 256 * 1024;

function isoNow() { return new Date().toISOString(); }

function parseJson(value: any, fallback: any = null) {
  try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; }
}

function publicDrillRun(row: any) {
  if (!row) return null;
  return {
    schema: "ccm-reliability-drill-run-v2",
    run_id: row.run_id,
    kind: row.kind,
    status: row.status,
    checkpoint: row.checkpoint,
    pid: Number(row.pid || 0) || null,
    requested_by: row.requested_by || "",
    created_at: row.created_at,
    started_at: row.started_at || null,
    completed_at: row.completed_at || null,
    updated_at: row.updated_at,
    result: parseJson(row.result_json),
    error: row.error_summary || "",
    log_summary: row.log_summary || "",
    cleanup_status: row.cleanup_status || "",
    cancel_requested: row.cancel_requested === 1,
  };
}

export function getReliabilityDrillRun(runId: string) {
  const row = getObservabilityDatabase().prepare("SELECT * FROM reliability_drill_runs_v2 WHERE run_id = ?").get(String(runId || ""));
  return publicDrillRun(row);
}

export function listReliabilityDrillRuns(limit = 20) {
  const rows = getObservabilityDatabase().prepare("SELECT * FROM reliability_drill_runs_v2 ORDER BY created_at DESC LIMIT ?").all(Math.max(1, Math.min(100, Number(limit) || 20)));
  return rows.map(publicDrillRun);
}

function readDrillStatus() {
  return readJsonWithBackup<Record<string, any>>(DRILL_STATUS_FILE, {});
}

function writeDrillStatus(value: any) {
  withFileLock(DRILL_STATUS_FILE, () => writeJsonAtomic(DRILL_STATUS_FILE, value));
}

export function getReliabilityDrillStatus() {
  const status = readDrillStatus();
  const lastRunAt = Date.parse(status.last_run_at || 0);
  const latest = listReliabilityDrillRuns(1)[0] || null;
  const active = getObservabilityDatabase().prepare("SELECT * FROM reliability_drill_runs_v2 WHERE status IN ('queued','running','cancelling') ORDER BY created_at DESC LIMIT 1").get();
  return {
    ...status,
    scheduler_running: !!drillScheduler,
    next_run_at: Number.isFinite(lastRunAt) ? new Date(lastRunAt + 24 * 60 * 60 * 1000).toISOString() : null,
    active_run: publicDrillRun(active),
    latest_run: latest,
  };
}

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, encoding: "utf-8", windowsHide: true });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || `${command} failed`).trim());
  return String(result.stdout || "").trim();
}

export function runProductionReliabilityDrills() {
  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-e2e-reliability-"));
  const traceId = createTraceId("e2e");
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

    const intake = acquireIdempotency({ scope: "drill-feishu-event", key: intakeKey, traceId, metadata: { scenario: "duplicate-message" } });
    const duplicateDuringIntake = acquireIdempotency({ scope: "drill-feishu-event", key: intakeKey, traceId });
    appendTraceEvent(traceId, { id: `${taskId}:intake`, type: "e2e.intake", status: "ok", task_id: taskId, message: "群聊开发任务已接收" });
    completeIdempotency("drill-feishu-event", intakeKey, { task_id: taskId });
    const duplicateAfterIntake = acquireIdempotency({ scope: "drill-feishu-event", key: intakeKey, traceId });

    const lease = acquireTaskLease(taskId, traceId, 30_000);
    const conflictPlan = buildCollaborationConflictPlan([
      { key: "backend", project: "backend-agent", task: "实现 src/payment.js", workDir: repo, writablePaths: ["src", "test"] },
      { key: "test", project: "test-agent", task: "验证 src/payment.js 并补充 test/payment.test.js", workDir: repo, writablePaths: ["src", "test"] },
    ], "parallel");
    const reuseKey = conflictPlan.lanes[0].conflictWorkspaceKey;
    const first = prepareChildAgentWorkDir(repo, { mode: "worktree", failClosed: true, taskId, agentName: reuseKey, sourceProject: "coordinator", reuseKey });
    worktreePath = first.worktreePath || "";
    worktreeBranch = first.worktreeBranch || "";
    fs.mkdirSync(path.join(first.workDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(first.workDir, "src", "payment.js"), "exports.total = (amount, fee) => amount + fee;\n", "utf-8");
    appendTraceEvent(traceId, { id: `${taskId}:backend-receipt`, type: "worker.receipt", status: "ok", task_id: taskId, agent: "backend-agent", message: "支付计算实现完成", data: { filesChanged: ["src/payment.js"] } });

    const second = prepareChildAgentWorkDir(repo, { mode: "worktree", failClosed: true, taskId, agentName: reuseKey, sourceProject: "coordinator", reuseKey });
    const upstreamVisible = fs.existsSync(path.join(second.workDir, "src", "payment.js"));
    fs.mkdirSync(path.join(second.workDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(second.workDir, "test", "payment.test.js"), [
      "const test = require('node:test');",
      "const assert = require('node:assert/strict');",
      "const { total } = require('../src/payment');",
      "test('adds fee', () => assert.equal(total(100, 2), 102));",
      "",
    ].join("\n"), "utf-8");
    const verification = spawnSync(process.execPath, ["--test"], { cwd: second.workDir, encoding: "utf-8", windowsHide: true });
    const verificationPassed = verification.status === 0;
    appendTraceEvent(traceId, { id: `${taskId}:verification`, type: "verification.completed", status: verificationPassed ? "ok" : "error", task_id: taskId, agent: "test-agent", message: verificationPassed ? "node --test passed" : String(verification.stderr || verification.stdout).slice(0, 500) });
    if (!verificationPassed) throw new Error(String(verification.stderr || verification.stdout || "verification failed"));

    run("git", ["add", "-A"], second.workDir);
    run("git", ["commit", "-m", "feat: payment reliability drill"], second.workDir);
    const mergeOperation = acquireIdempotency({ scope: "drill-merge", key: mergeKey, traceId });
    const baseBranch = run("git", ["branch", "--show-current"], repo);
    run("git", ["checkout", baseBranch], repo);
    run("git", ["merge", "--no-ff", worktreeBranch, "-m", `merge: ${taskId}`], repo);
    const mergeCommit = run("git", ["rev-parse", "HEAD"], repo);
    completeIdempotency("drill-merge", mergeKey, { merge_commit: mergeCommit });
    const duplicateMerge = acquireIdempotency({ scope: "drill-merge", key: mergeKey, traceId });
    const headAfterReplay = run("git", ["rev-parse", "HEAD"], repo);
    releaseTaskLease(taskId, "done");
    appendTraceEvent(traceId, { id: `${taskId}:done`, type: "e2e.completed", status: "ok", task_id: taskId, message: "群聊→多 Agent→验证→合并闭环完成", data: { merge_commit: mergeCommit } });

    const ledger = runReliabilityLedgerSelfTest();
    const session = runTaskAgentSessionSelfTest();
    const fallbackDecision = shouldSwitchRuntime("Agent 进程退出：simulated provider crash");
    const trace = getTrace(traceId);
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
      traceExplainsWholeDelivery: Array.isArray(trace?.events) && trace.events.some((item: any) => item.type === "e2e.intake") && trace.events.some((item: any) => item.type === "verification.completed") && trace.events.some((item: any) => item.type === "e2e.completed"),
    };
    return { pass: Object.values(checks).every(Boolean), trace_id: traceId, task_id: taskId, merge_commit: mergeCommit, checks };
  } finally {
    if (worktreePath) spawnSync("git", ["worktree", "remove", "--force", worktreePath], { cwd: repo, windowsHide: true, stdio: "ignore" });
    if (worktreeBranch) spawnSync("git", ["branch", "-D", worktreeBranch], { cwd: repo, windowsHide: true, stdio: "ignore" });
    try { fs.rmSync(repo, { recursive: true, force: true }); } catch {}
  }
}

function finalizeDrillRun(runId: string, status: string, values: any = {}) {
  const now = isoNow();
  getObservabilityDatabase().prepare(`
    UPDATE reliability_drill_runs_v2
    SET status = ?, checkpoint = ?, completed_at = ?, updated_at = ?, result_json = ?,
        error_summary = ?, log_summary = ?, cleanup_status = ?, pid = NULL
    WHERE run_id = ?
  `).run(
    status,
    values.checkpoint || (status === "completed" ? "completed" : status),
    now,
    now,
    values.result ? JSON.stringify(values.result) : null,
    String(values.error || "").slice(0, 2000),
    String(values.log || "").slice(-DRILL_OUTPUT_LIMIT),
    values.cleanupStatus || "completed",
    runId,
  );
}

function launchReliabilityDrillWorker(runId: string) {
  const db = getObservabilityDatabase();
  const row = db.prepare("SELECT * FROM reliability_drill_runs_v2 WHERE run_id = ?").get(runId) as any;
  if (!row || !["queued", "recovering"].includes(String(row.status))) return false;
  const lease = acquireTaskLease(DRILL_LEASE_TASK, `drill:${runId}`, DRILL_TIMEOUT_MS + 60_000);
  if (!lease.acquired) {
    finalizeDrillRun(runId, "blocked", { error: "同类可靠性演练正在运行", checkpoint: "singleflight_blocked", cleanupStatus: "not_started" });
    return false;
  }
  const child = spawn(process.execPath, [__filename, "--reliability-drill-worker", runId], {
    cwd: process.cwd(),
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CCM_RELIABILITY_DRILL_WORKER: "1" },
  });
  const startedAt = isoNow();
  db.prepare(`UPDATE reliability_drill_runs_v2 SET status='running', checkpoint='worker_started', pid=?, lease_id=?, fencing_token=?, started_at=?, updated_at=? WHERE run_id=?`)
    .run(child.pid || null, lease.lease?.lease_id || "", Number(lease.lease?.fencing_token || 0), startedAt, startedAt, runId);
  activeDrillProcesses.set(runId, child);
  let output = "";
  let stderr = "";
  const append = (current: string, chunk: any) => `${current}${String(chunk || "")}`.slice(-DRILL_OUTPUT_LIMIT);
  child.stdout?.on("data", chunk => { output = append(output, chunk); });
  child.stderr?.on("data", chunk => { stderr = append(stderr, chunk); });
  const timeout = setTimeout(() => {
    db.prepare("UPDATE reliability_drill_runs_v2 SET status='cancelling', checkpoint='timeout', updated_at=? WHERE run_id=?").run(isoNow(), runId);
    terminateManagedProcessTree(child, { gracefulTimeoutMs: 2_000 }).catch(() => {});
  }, DRILL_TIMEOUT_MS);
  timeout.unref?.();
  child.once("error", error => {
    clearTimeout(timeout);
    activeDrillProcesses.delete(runId);
    releaseTaskLease(DRILL_LEASE_TASK, "failed");
    finalizeDrillRun(runId, "failed", { error: error.message, log: stderr || output, cleanupStatus: "ownership_unproven" });
  });
  child.once("exit", (code, signal) => {
    clearTimeout(timeout);
    activeDrillProcesses.delete(runId);
    releaseTaskLease(DRILL_LEASE_TASK, code === 0 ? "done" : "failed");
    const latest = getObservabilityDatabase().prepare("SELECT cancel_requested FROM reliability_drill_runs_v2 WHERE run_id=?").get(runId) as any;
    const marker = output.split(/\r?\n/).reverse().find(line => line.startsWith("CCM_DRILL_RESULT="));
    const result = marker ? parseJson(marker.slice("CCM_DRILL_RESULT=".length)) : null;
    const cancelled = latest?.cancel_requested === 1;
    const finalStatus = cancelled ? "cancelled" : (code === 0 && result?.pass === true ? "completed" : "failed");
    finalizeDrillRun(runId, finalStatus, {
      result,
      error: finalStatus === "failed" ? (result?.error || stderr || `worker exited ${code ?? signal ?? "unknown"}`) : "",
      log: [output, stderr].filter(Boolean).join("\n"),
      cleanupStatus: result?.cleanup_status || (code === 0 ? "completed" : "recovery_required"),
    });
    const status = readDrillStatus();
    writeDrillStatus({
      ...status,
      last_run_at: row.created_at,
      last_completed_at: isoNow(),
      last_result: result || { pass: false, status: finalStatus },
      consecutive_failures: finalStatus === "completed" ? 0 : Number(status.consecutive_failures || 0) + 1,
    });
  });
  return true;
}

export function startReliabilityDrillRun(options: any = {}) {
  const now = isoNow();
  return withImmediateObservabilityTransaction((db) => {
    const active = db.prepare("SELECT run_id FROM reliability_drill_runs_v2 WHERE status IN ('queued','running','cancelling','recovering') LIMIT 1").get() as any;
    if (active) return { accepted: false, duplicate: true, run: getReliabilityDrillRun(active.run_id) };
    const runId = `drill_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    db.prepare(`INSERT INTO reliability_drill_runs_v2(run_id,kind,status,checkpoint,requested_by,created_at,updated_at,cleanup_status) VALUES(?,?,'queued','queued',?,?,?,'pending')`)
      .run(runId, String(options.kind || "production"), String(options.requestedBy || "scheduler"), now, now);
    setImmediate(() => launchReliabilityDrillWorker(runId));
    return { accepted: true, run: getReliabilityDrillRun(runId) };
  });
}

export async function cancelReliabilityDrillRun(runId: string) {
  const id = String(runId || "").trim();
  const db = getObservabilityDatabase();
  const row = db.prepare("SELECT * FROM reliability_drill_runs_v2 WHERE run_id=?").get(id) as any;
  if (!row) return { success: false, error: "演练不存在" };
  if (["completed", "failed", "cancelled", "blocked"].includes(String(row.status))) return { success: true, run: publicDrillRun(row) };
  db.prepare("UPDATE reliability_drill_runs_v2 SET cancel_requested=1,status='cancelling',checkpoint='cancel_requested',updated_at=? WHERE run_id=?").run(isoNow(), id);
  const child = activeDrillProcesses.get(id);
  if (child) await terminateManagedProcessTree(child, { gracefulTimeoutMs: 2_000 }).catch(() => {});
  return { success: true, run: getReliabilityDrillRun(id) };
}

export function recoverReliabilityDrillRuns() {
  const db = getObservabilityDatabase();
  const rows = db.prepare("SELECT * FROM reliability_drill_runs_v2 WHERE status IN ('queued','running','cancelling','recovering') ORDER BY created_at").all() as any[];
  let recovered = 0;
  for (const row of rows) {
    if (row.status === "queued") {
      setImmediate(() => launchReliabilityDrillWorker(row.run_id));
      recovered += 1;
      continue;
    }
    db.prepare("UPDATE reliability_drill_runs_v2 SET status='blocked',checkpoint='ownership_unproven',error_summary=?,completed_at=?,updated_at=?,pid=NULL WHERE run_id=?")
      .run("服务重启后无法证明旧演练子进程归属，已安全终止恢复", isoNow(), isoNow(), row.run_id);
  }
  return { scanned: rows.length, recovered };
}

export function runScheduledProductionReliabilityDrill(options: any = {}) {
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
  } catch (error: any) {
    const failure = { pass: false, error: error.message || String(error) };
    writeDrillStatus({ last_run_at: startedAt, last_completed_at: new Date().toISOString(), last_result: failure, consecutive_failures: Number(status.consecutive_failures || 0) + 1 });
    return { skipped: false, result: failure };
  }
}

export function startReliabilityDrillScheduler() {
  if (process.env.CCM_RELIABILITY_DRILLS === "0") return false;
  if (drillScheduler) clearInterval(drillScheduler);
  recoverReliabilityDrillRuns();
  const runIfDue = () => {
    const status = readDrillStatus();
    const lastRunAt = Date.parse(status.last_run_at || 0);
    if (Number.isFinite(lastRunAt) && Date.now() - lastRunAt < 24 * 60 * 60 * 1000) return;
    startReliabilityDrillRun({ requestedBy: "scheduler" });
  };
  setTimeout(runIfDue, 30_000).unref?.();
  drillScheduler = setInterval(runIfDue, 6 * 60 * 60 * 1000);
  drillScheduler.unref?.();
  return true;
}

export function stopReliabilityDrillScheduler() {
  if (drillScheduler) clearInterval(drillScheduler);
  drillScheduler = null;
}

if (require.main === module && process.argv[2] === "--reliability-drill-worker") {
  try {
    const result = runProductionReliabilityDrills();
    process.stdout.write(`\nCCM_DRILL_RESULT=${JSON.stringify({ ...result, cleanup_status: "completed" })}\n`);
    process.exitCode = result.pass ? 0 : 1;
  } catch (error: any) {
    process.stdout.write(`\nCCM_DRILL_RESULT=${JSON.stringify({ pass: false, error: error?.message || String(error), cleanup_status: "recovery_required" })}\n`);
    process.exitCode = 1;
  }
}
