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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE372_${stage}=`));
  if (!line) throw new Error(`Phase 372 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-version-transition-ledger-"));
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const codexFile = process.platform === "win32" ? path.join(bin, "codex.cmd") : path.join(bin, "codex");
  const env = { ...process.env, HOME: home, USERPROFILE: home, PATH: `${bin}${path.delimiter}${process.env.PATH || ""}`, PHASE372_HOME: home, PHASE372_CODEX: codexFile };
  try {
    const stages = [];
    for (const stage of ["prepare", "restart", "tampered"]) {
      const run = spawnSync(process.execPath, [scriptFile, stage], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      stages.push(parseStage(run.stdout, stage));
    }
    console.log(JSON.stringify({ pass: true, checks: stages.reduce((sum, row) => sum + Number(row.checks || 0), 0), prepare: stages[0], restart: stages[1], tampered: stages[2] }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE372_HOME;
const codexFile = process.env.PHASE372_CODEX;
if (!home || !codexFile) throw new Error("Phase 372 worker environment is incomplete");
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const transition = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-version-transition-ledger.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase372-state.json");
const ledgerFile = path.join(home, ".cc-connect", "reliability", "live-provider-memory-version-transition-ledger.json");
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

function writeFakeCodex(version, stamp) {
  fs.writeFileSync(codexFile, process.platform === "win32" ? `@echo off\r\necho codex-cli ${version}\r\n` : `#!/bin/sh\necho codex-cli ${version}\n`, { encoding: "utf8", mode: 0o700 });
  const at = new Date(Date.now() + stamp * 2_000);
  fs.utimesSync(codexFile, at, at);
  const snapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  equal(snapshot.status, "ok", `Codex ${version} snapshot should be available`);
  equal(snapshot.semanticVersion, version, `Codex ${version} semantic version should match`);
  return snapshot;
}

function commitWave(runId, generatedAt, snapshot, specs) {
  const groups = specs.map((spec, index) => {
    const groupId = `phase372-group-${runId}-${index + 1}`;
    const groupSessionId = `gcs_phase372_${runId.replace(/[^a-z0-9]/gi, "_")}_${index + 1}`;
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
        version: snapshot.semanticVersion,
        model: "phase372-model",
        providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum,
        status: spec.status,
        issue: spec.issue || "",
        workspaceUnchanged: spec.workspaceUnchanged !== false,
        receiptRecovery: { status: spec.recoveryStatus || (spec.status === "passed" ? "recovered" : "blocked"), suppressTaskReplay: spec.suppressTaskReplay === true },
      }],
    });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    return {
      groupId,
      groupSessionId,
      status: spec.status === "passed" ? "passed" : "failed",
      issues: spec.issue ? [spec.issue] : [],
      durationMs: spec.durationMs,
      childReportChecksum: child.reportChecksum,
      receiptValid: spec.status === "passed",
    };
  });
  const report = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId, generatedAt, accountBacked: true, provider: "codex", model: "phase372-model", requestedGroupCount: groups.length, concurrency: 1, isolationValid: true, groups });
  store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return report;
}

const passed = durationMs => ({ status: "passed", durationMs });
const memoryFailure = durationMs => ({ status: "failed", issue: "memory_context_load_receipt_missing", recoveryStatus: "blocked", suppressTaskReplay: true, durationMs });
const aggressiveRetention = { singleRetentionDays: 1, multiRetentionDays: 1, fleetRetentionDays: 1, enduranceRetentionDays: 1, graceHours: 0, minimumSingleReports: 0, minimumMultiReports: 0, minimumFleetReports: 0, minimumEnduranceReports: 0, maximumSingleReports: 0, maximumMultiReports: 0, maximumFleetReports: 0, maximumEnduranceReports: 0 };

if (mode === "prepare") {
  const v1 = writeFakeCodex("1.0.0", 1);
  commitWave("wave-v1", "2026-07-16T01:00:00.000Z", v1, [passed(40_000), passed(42_000)]);
  const v2 = writeFakeCodex("2.0.0", 2);
  commitWave("v2-degraded", "2026-07-16T02:00:00.000Z", v2, [passed(48_000), memoryFailure(50_000)]);
  const degradedReport = endurance.auditLiveProviderMemoryEndurance();
  equal(degradedReport.providerVersionTrend.epochCount, 2, "v1 to v2 should create two epochs");
  equal(degradedReport.providerVersionTrend.transitionCount, 1, "v1 to v2 should create one transition");
  equal(degradedReport.providerVersionTrend.comparisons[0].status, "degraded", "v2 memory receipt failure should degrade transition");
  equal(degradedReport.providerVersionTrend.comparisons[0].memoryContinuityVerified, false, "degraded v2 should not prove continuity");
  ok(degradedReport.providerVersionTrend.comparisons[0].reasons.includes("new_epoch_memory_receipt_failure"), "memory receipt regression reason should be explicit");
  equal(degradedReport.providerVersionTrend.latestTransitionGatePassed, false, "latest degraded transition should close gate");
  const degradedPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(degradedPreview.runtimeMatches, true, "v2 runtime should match latest evidence");
  equal(degradedPreview.versionTransitionReady, false, "approval preview should expose transition gate");
  equal(degradedPreview.approvable, false, "degraded transition should block approval");

  const v3 = writeFakeCodex("3.0.0", 3);
  commitWave("v3-recovered", "2026-07-16T03:00:00.000Z", v3, [passed(44_000), passed(46_000)]);
  const recoveredReport = endurance.auditLiveProviderMemoryEndurance();
  equal(recoveredReport.providerVersionTrend.comparisons[1].status, "verified", "clean v3 should verify latest transition");
  equal(recoveredReport.providerVersionTrend.comparisons[1].memoryContinuityVerified, true, "v3 should prove memory continuity");
  equal(recoveredReport.providerVersionTrend.latestTransitionGatePassed, true, "verified v3 should reopen transition gate");
  const recoveredPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(recoveredPreview.versionTransitionReady, true, "approval preview should accept verified transition");
  equal(recoveredPreview.approvable, true, "verified latest runtime should become approvable");

  commitWave("v3-more-evidence", "2026-07-16T04:00:00.000Z", v3, [passed(41_000), passed(43_000)]);
  const revisedReport = endurance.auditLiveProviderMemoryEndurance();
  const revisedLedger = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(revisedLedger.entryCount, 3, "changed v3 evidence should append one transition revision only");
  equal(revisedLedger.transitionCount, 2, "ledger should retain two unique transitions");
  equal(revisedLedger.verifiedCount, 1, "latest v2 to v3 revision should remain verified");
  equal(revisedLedger.degradedCount, 1, "v1 to v2 degradation should remain visible");

  commitWave("v1-reappearance", "2026-07-16T05:00:00.000Z", v1, [passed(39_000), passed(40_000)]);
  const rollbackReport = endurance.auditLiveProviderMemoryEndurance();
  equal(rollbackReport.providerVersionTrend.epochCount, 4, "v1 evidence reappearance should create a fourth contiguous epoch");
  equal(rollbackReport.providerVersionTrend.comparisons[2].transitionKind, "reappearance", "return to exact v1 identity should be classified as reappearance");
  equal(rollbackReport.providerVersionTrend.comparisons[2].status, "verified", "clean reappearance should verify memory continuity");
  const ledger = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(ledger.valid, true, "transition ledger should verify before restart");
  equal(ledger.entryCount, 4, "rollback transition should append a fourth evidence entry");
  equal(ledger.transitionCount, 3, "ledger should expose three unique transitions");
  equal(ledger.rollbackCount, 1, "ledger should expose one exact identity reappearance");
  equal(ledger.verifiedCount, 2, "latest clean transitions should be verified");
  const repeat = transition.recordLiveProviderMemoryVersionTransitionEvidence(rollbackReport);
  equal(repeat.appendedCount, 0, "same report ingestion should be idempotent");
  equal(repeat.entryCount, 4, "idempotent ingestion should preserve entry count");
  ok(!JSON.stringify(ledger.entries).includes("phase372-group"), "transition ledger must not contain raw group ids");
  ok(ledger.entries.every(entry => /^[a-f0-9]{64}$/.test(entry.entryChecksum) && /^[a-f0-9]{64}$/.test(entry.evidenceChecksum)), "every transition entry should be checksum bound");

  const migrationStateFile = path.join(home, ".cc-connect", "reliability", "phase372-rule-migration-scheduler.json");
  fs.mkdirSync(path.dirname(migrationStateFile), { recursive: true });
  fs.writeFileSync(migrationStateFile, `${JSON.stringify({ schema: "ccm-live-provider-memory-endurance-scheduler-v1", lastCheckedAt: new Date().toISOString(), lastSourceSetChecksum: rollbackReport.sourceSetChecksum, lastClassifierVersion: 2, lastVersionTransitionRuleVersion: 0, runCount: 1, persistedCount: 0, noChangeCount: 0, noSourceCount: 0, destructiveActionAuthorized: false, liveExecutionAuthorized: false, policyMutationApplied: false, createdTaskCount: 0, deletedCount: 0 }, null, 2)}\n`, "utf8");
  const migration = endurance.runLiveProviderMemoryEnduranceSchedulerTick({ stateFile: migrationStateFile, force: true });
  equal(migration.status, "persisted", "rule version change should persist a re-signed report even when source evidence is unchanged");
  equal(migration.lastClassifierVersion, 3, "scheduler should persist classifier version three");
  equal(migration.lastVersionTransitionRuleVersion, 1, "scheduler should persist transition rule version one");
  equal(migration.latestVersionTransitionGatePassed, true, "scheduler should persist latest transition gate");
  equal(migration.versionTransitionDegradedCount, 1, "scheduler should persist historical degraded transition count");

  const reportInventory = retention.buildLiveProviderMemorySoakRetentionInventory(aggressiveRetention);
  equal(reportInventory.summary.transitionLedgerValid, true, "report retention should verify transition ledger");
  equal(reportInventory.summary.transitionReferencedEnduranceCount, 3, "latest evidence for each transition should protect three endurance reports");
  ok(reportInventory.rows.filter(row => row.kind === "endurance" && row.referenced).every(row => row.protectedBy === "version_transition_ledger"), "transition report protection reason should be explicit");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase372-group-wave-v1-1" });
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerEntryCount, 4, "Memory Center should expose transition entries");
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerTransitionCount, 3, "Memory Center should expose unique transitions");
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerDegradedCount, 1, "Memory Center should expose degraded transition");
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerRollbackCount, 1, "Memory Center should expose rollback/reappearance");
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerValid, true, "Memory Center should expose valid ledger");
  fs.writeFileSync(stateFile, `${JSON.stringify({ latestReportChecksum: migration.lastReportChecksum, ledgerChecksum: ledger.ledgerChecksum, enduranceReportCount: reportInventory.summary.enduranceReportCount }, null, 2)}\n`, "utf8");
  console.log(`PHASE372_prepare=${JSON.stringify({ checks, entries: ledger.entryCount, transitions: ledger.transitionCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const ledger = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(ledger.valid, true, "restart should verify persisted transition chain");
  equal(ledger.ledgerChecksum, state.ledgerChecksum, "restart should preserve ledger identity");
  equal(ledger.entryCount, 4, "restart should preserve every evidence revision");
  equal(ledger.transitionCount, 3, "restart should rebuild transition inventory");
  equal(ledger.rollbackCount, 1, "restart should preserve rollback classification");
  const latestReport = endurance.readLatestLiveProviderMemoryEnduranceReport();
  equal(latestReport.reportChecksum, state.latestReportChecksum, "restart should recover latest endurance report");
  const repeat = transition.recordLiveProviderMemoryVersionTransitionEvidence(latestReport);
  equal(repeat.appendedCount, 0, "restart re-ingestion should remain idempotent");
  const raw = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  raw.entries[raw.entries.length - 1].status = "degraded";
  fs.writeFileSync(ledgerFile, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  const invalid = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(invalid.valid, false, "tampered entry should invalidate ledger");
  ok(invalid.issues.includes("transition_entry_checksum_invalid"), "tamper issue should identify entry checksum");
  ok(invalid.issues.includes("transition_ledger_checksum_invalid"), "tamper issue should identify ledger checksum");
  let appendRejected = false;
  try { transition.recordLiveProviderMemoryVersionTransitionEvidence(latestReport); } catch { appendRejected = true; }
  equal(appendRejected, true, "invalid ledger should reject new evidence instead of overwriting history");
  const failClosed = retention.buildLiveProviderMemorySoakRetentionInventory(aggressiveRetention);
  equal(failClosed.summary.transitionLedgerInvalidFailClosed, true, "invalid ledger should put report retention in fail-closed mode");
  equal(failClosed.rows.filter(row => row.kind === "endurance" && row.valid).every(row => row.protectedBy === "invalid_transition_ledger_fail_closed"), true, "invalid ledger should protect every valid endurance report");
  equal(failClosed.rows.filter(row => row.kind === "endurance" && row.prunable).length, 0, "invalid ledger should expose no endurance prune candidate");
  console.log(`PHASE372_restart=${JSON.stringify({ checks, invalid: true, enduranceProtected: state.enduranceReportCount })}`);
  process.exit(0);
}

if (mode === "tampered") {
  const ledger = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(ledger.present, true, "tampered ledger should remain durable across restart");
  equal(ledger.valid, false, "tampered ledger should remain fail closed across restart");
  equal(ledger.entryCount, 4, "tamper diagnosis should preserve all entries");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase372-group-wave-v1-1" });
  equal(memoryCenter.overall.liveProviderMemoryVersionTransitionLedgerValid, false, "Memory Center should expose invalid ledger after restart");
  equal(memoryCenter.overall.liveProviderReportRetentionTransitionLedgerValid, false, "Memory Center retention should expose invalid transition reference source");
  equal(memoryCenter.liveProviderMemoryVersionTransitionLedger.issues.includes("transition_entry_checksum_invalid"), true, "Memory Center should expose body-free tamper diagnosis");
  ok(!JSON.stringify(memoryCenter.liveProviderMemoryVersionTransitionLedger).includes("phase372-group"), "Memory Center transition inventory should not expose raw group ids");
  equal(fs.existsSync(ledgerFile), true, "fail-closed inspection must not delete invalid ledger");
  console.log(`PHASE372_tampered=${JSON.stringify({ checks, issues: ledger.issues.length })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 372 mode:${mode}`);
