import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE369_${stage}=`));
  if (!line) throw new Error(`Phase 369 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-endurance-scheduler-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE369_HOME: home };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    console.log(JSON.stringify({ pass: true, checks: Number(prepare.checks || 0) + Number(restart.checks || 0), prepare, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE369_HOME;
if (!home) throw new Error("PHASE369_HOME is required");
const require = createRequire(import.meta.url);
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, ".cc-connect", "reliability", "phase369-endurance-scheduler.json");
const handoffFile = path.join(home, "phase369-handoff.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}

function signed(unsigned) {
  return { ...unsigned, reportChecksum: digest(unsigned) };
}

function commitWave({ runId, generatedAt, concurrency, version, identity, groups }) {
  const sourceGroups = groups.map((spec, index) => {
    const groupId = `phase369-${runId}-${index + 1}`;
    const groupSessionId = `gcs_phase369_${runId.replace(/[^a-z0-9]/gi, "_")}_${index + 1}`;
    const child = signed({
      schema: "ccm-live-provider-native-memory-soak-report-v2",
      version: 2,
      runId: `${runId}-child-${index + 1}`,
      generatedAt,
      accountBacked: true,
      groupId,
      groupSessionId,
      providers: [{
        provider: "codex",
        version,
        model: "phase369-model",
        providerRuntimeIdentityChecksum: identity,
        status: spec.providerStatus,
        issue: spec.providerIssue,
        workspaceUnchanged: true,
        receiptRecovery: { status: spec.recoveryStatus, suppressTaskReplay: spec.suppressTaskReplay === true },
      }],
    });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    return {
      groupId,
      groupSessionId,
      status: spec.providerStatus === "passed" ? "passed" : "failed",
      issues: spec.providerIssue ? ["child_failed", "child_receipt_recovery_unproven"] : [],
      durationMs: spec.durationMs,
      childReportChecksum: child.reportChecksum,
      receiptValid: spec.receiptValid === true,
    };
  });
  const source = signed({
    schema: "ccm-live-provider-multi-group-memory-soak-report-v1",
    version: 1,
    runId,
    generatedAt,
    accountBacked: true,
    provider: "codex",
    model: "phase369-model",
    requestedGroupCount: sourceGroups.length,
    concurrency,
    isolationValid: true,
    groups: sourceGroups,
  });
  return store.commitLiveProviderMemorySoakReport(source, { kind: "multi" });
}

const passed = durationMs => ({ providerStatus: "passed", providerIssue: "", recoveryStatus: "recovered", durationMs, receiptValid: true });
const timeout = (issue, durationMs, suppressed = false) => ({ providerStatus: "timeout", providerIssue: issue, recoveryStatus: suppressed ? "blocked" : "not_run", durationMs, receiptValid: suppressed, suppressTaskReplay: suppressed });

if (mode === "prepare") {
  commitWave({ runId: "wave-v1", generatedAt: "2026-07-16T01:00:00.000Z", concurrency: 1, version: "0.114.0", identity: "1".repeat(64), groups: [passed(40_000), passed(45_000)] });
  commitWave({ runId: "wave-v2", generatedAt: "2026-07-16T02:00:00.000Z", concurrency: 2, version: "0.115.0", identity: "2".repeat(64), groups: [passed(55_000), timeout("provider_turn_timeout", 120_000), timeout("provider_terminal_timeout", 143_000, true)] });
  const first = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile, force: true, at: "2026-07-16T03:00:00.000Z", intervalMs: 6 * 60 * 60_000 });
  equal(first.status, "persisted", "first due tick should persist endurance evidence");
  equal(first.runCount, 1, "first tick should increment run count");
  equal(first.persistedCount, 1, "first tick should persist one report");
  equal(first.noChangeCount, 0, "first tick should not count as unchanged");
  equal(first.recommendedConcurrencyCeiling, 1, "latency correlation should recommend concurrency one");
  equal(first.recommendedProviderTimeoutMs, 180_000, "p95 evidence should recommend a bounded 180 second timeout");
  equal(first.liveExecutionAuthorized, false, "scheduler must not authorize live Provider execution");
  equal(first.policyMutationApplied, false, "scheduler must not mutate concurrency policy");
  equal(first.createdTaskCount, 0, "scheduler must not create tasks");
  const inventoryAfterFirst = retention.buildLiveProviderMemorySoakRetentionInventory();
  equal(inventoryAfterFirst.summary.enduranceReportCount, 1, "first tick should create one endurance report");

  const second = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile, force: true, at: "2026-07-16T04:00:00.000Z", intervalMs: 6 * 60 * 60_000 });
  equal(second.status, "source_unchanged", "unchanged source should not persist a duplicate report");
  equal(second.runCount, 2, "second tick should increment run count");
  equal(second.persistedCount, 1, "unchanged tick should preserve persisted count");
  equal(second.noChangeCount, 1, "unchanged tick should increment no-change count");
  equal(retention.buildLiveProviderMemorySoakRetentionInventory().summary.enduranceReportCount, 1, "unchanged tick should not add an endurance report");
  const notDue = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile, at: "2026-07-16T04:01:00.000Z", intervalMs: 6 * 60 * 60_000 });
  equal(notDue.status, "not_due", "scheduler should respect the next due boundary");
  equal(notDue.due, false, "not-due tick should remain read-only");

  commitWave({ runId: "wave-v3", generatedAt: "2026-07-16T05:00:00.000Z", concurrency: 1, version: "0.116.0", identity: "3".repeat(64), groups: [passed(60_000), passed(62_000)] });
  const third = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile, force: true, at: "2026-07-16T06:00:00.000Z", intervalMs: 6 * 60 * 60_000 });
  equal(third.status, "persisted", "new version wave should persist a new report");
  equal(third.runCount, 3, "third tick should increment run count");
  equal(third.persistedCount, 2, "changed source should increment persisted count");
  equal(third.noChangeCount, 1, "changed source should preserve prior no-change count");
  equal(third.liveExecutionAuthorized, false, "changed source must not authorize a live wave");
  equal(third.policyMutationApplied, false, "changed source must not apply its recommendation");
  const latest = endurance.readLatestLiveProviderMemoryEnduranceSummary();
  equal(latest.providerVersionEpochCount, 3, "latest report should contain three version epochs");
  equal(latest.providerVersionTransitionCount, 2, "latest report should contain two version transitions");
  equal(latest.recommendedConcurrencyCeiling, 1, "latest advisory should preserve concurrency ceiling one");
  equal(latest.recommendedProviderTimeoutMs, 180_000, "latest advisory should preserve timeout recommendation");
  equal(latest.advisoryOnly, true, "latest recommendation should remain advisory-only");
  equal(latest.policyMutationApplied, false, "latest recommendation should not mutate policy");
  equal(latest.gatePassed, true, "version trend report should pass the evidence gate");
  fs.writeFileSync(handoffFile, `${JSON.stringify({ stateFile, lastReportChecksum: third.lastReportChecksum }, null, 2)}\n`, "utf8");
  console.log(`PHASE369_prepare=${JSON.stringify({ checks, lastReportChecksum: third.lastReportChecksum })}`);
  process.exit(0);
}

if (mode === "restart") {
  const handoff = JSON.parse(fs.readFileSync(handoffFile, "utf8"));
  const scheduler = endurance.getLiveProviderMemoryEnduranceSchedulerStatus({ stateFile: handoff.stateFile });
  equal(scheduler.present, true, "scheduler state should survive restart");
  equal(scheduler.safe, true, "scheduler state should remain non-destructive");
  equal(scheduler.state.runCount, 3, "restart should preserve scheduler run count");
  equal(scheduler.state.persistedCount, 2, "restart should preserve persisted count");
  equal(scheduler.state.noChangeCount, 1, "restart should preserve no-change count");
  equal(scheduler.state.lastReportChecksum, handoff.lastReportChecksum, "restart should preserve report identity");
  equal(scheduler.state.liveExecutionAuthorized, false, "restart must not authorize live execution");
  equal(scheduler.state.policyMutationApplied, false, "restart must not apply recommendations");
  equal(scheduler.state.createdTaskCount, 0, "restart should prove no tasks were created");
  equal(fs.existsSync(path.join(home, ".cc-connect", "cron-jobs.json")), false, "endurance scheduler should not create a user cron job");
  const emptyStateFile = path.join(home, ".cc-connect", "reliability", "phase369-empty-scheduler.json");
  const empty = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile: emptyStateFile, force: true, groupPrefix: "phase369-no-such-source", at: "2026-07-16T07:00:00.000Z" });
  equal(empty.status, "no_source_evidence", "empty scope should record state without creating a report");
  equal(empty.persistedCount, 0, "empty scope should not persist an endurance report");
  equal(empty.noSourceCount, 1, "empty scope should count a source-free audit");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase369-wave-v3-1" });
  equal(memoryCenter.overall.liveProviderMemoryEnduranceVersionEpochCount, 3, "Memory Center should expose version epochs");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceVersionTransitionCount, 2, "Memory Center should expose version transitions");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceRecommendedConcurrencyCeiling, 1, "Memory Center should expose advisory concurrency");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceRecommendedProviderTimeoutMs, 180_000, "Memory Center should expose advisory timeout");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceAdvisoryOnly, true, "Memory Center should mark recommendation advisory-only");
  const inventory = retention.buildLiveProviderMemorySoakRetentionInventory();
  equal(inventory.summary.enduranceReportCount, 2, "restart should retain only changed-source scheduler reports");
  equal(inventory.summary.referencedMultiCount, 3, "endurance reports should protect all version source waves");
  equal(inventory.summary.referencedSingleCount, 7, "source waves should protect all child reports");
  console.log(`PHASE369_restart=${JSON.stringify({ checks, epochs: 3, transitions: 2 })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 369 mode: ${mode}`);
