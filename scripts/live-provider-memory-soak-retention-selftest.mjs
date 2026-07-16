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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE366_${stage}=`));
  if (!line) throw new Error(`Phase 366 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-provider-retention-selftest-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE366_HOME: home };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(JSON.stringify({ pass: true, checks, prepare, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE366_HOME;
if (!home) throw new Error("PHASE366_HOME is required");
process.env.HOME = home;
process.env.USERPROFILE = home;
const require = createRequire(import.meta.url);
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const singleDir = path.join(home, ".cc-connect", "reliability", "live-provider-memory-soak");
const multiDir = path.join(home, ".cc-connect", "reliability", "live-provider-multi-group-soak");
const stateFile = path.join(home, "phase366-state.json");
const auditFile = path.join(home, ".cc-connect", "reliability", "live-provider-memory-soak-retention-audit.jsonl");
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

function writeReport(file, unsigned) {
  const report = { ...unsigned, reportChecksum: digest(unsigned) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

const nowMs = Date.parse("2026-07-16T08:00:00.000Z");
const isoDaysAgo = days => new Date(nowMs - days * 24 * 60 * 60_000).toISOString();
const policy = {
  nowMs,
  singleRetentionDays: 10,
  multiRetentionDays: 10,
  fleetRetentionDays: 10,
  graceHours: 1,
  minimumSingleReports: 1,
  minimumMultiReports: 0,
  minimumFleetReports: 1,
  maximumSingleReports: 2,
  maximumMultiReports: 1,
  maximumFleetReports: 1,
};

if (mode === "prepare") {
  fs.mkdirSync(singleDir, { recursive: true });
  fs.mkdirSync(multiDir, { recursive: true });
  const singleProtectedFile = path.join(singleDir, "single-protected.json");
  const singleExpiredFile = path.join(singleDir, "single-expired.json");
  const singleOverflowFile = path.join(singleDir, "single-overflow.json");
  const singleFreshFile = path.join(singleDir, "single-fresh.json");
  const singleProtected = writeReport(singleProtectedFile, { schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "single-protected", generatedAt: isoDaysAgo(20), groupId: "phase366-group-protected", groupSessionId: "gcs_phase366_protected", providers: [] });
  writeReport(singleExpiredFile, { schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "single-expired", generatedAt: isoDaysAgo(50), groupId: "phase366-group-expired", groupSessionId: "gcs_phase366_expired", providers: [] });
  writeReport(singleOverflowFile, { schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "single-overflow", generatedAt: isoDaysAgo(40), groupId: "phase366-group-overflow", groupSessionId: "gcs_phase366_overflow", providers: [] });
  writeReport(singleFreshFile, { schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "single-fresh", generatedAt: new Date(nowMs - 30 * 60_000).toISOString(), groupId: "phase366-group-fresh", groupSessionId: "gcs_phase366_fresh", providers: [] });
  fs.writeFileSync(path.join(singleDir, "single-invalid.json"), "{invalid", "utf8");
  fs.writeFileSync(path.join(singleDir, "README.txt"), "unmanaged file must remain\n", "utf8");

  const multiProtectedFile = path.join(multiDir, "multi-protected.json");
  const multiExpiredFile = path.join(multiDir, "multi-expired.json");
  const multiProtected = writeReport(multiProtectedFile, { schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: "multi-protected", generatedAt: isoDaysAgo(20), groups: [{ groupId: "phase366-group-protected", groupSessionId: "gcs_phase366_protected", childReportChecksum: singleProtected.reportChecksum }] });
  writeReport(multiExpiredFile, { schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: "multi-expired", generatedAt: isoDaysAgo(50), groups: [] });
  const fleetProtectedFile = path.join(multiDir, "fleet-protected.json");
  const fleetExpiredFile = path.join(multiDir, "fleet-expired.json");
  writeReport(fleetProtectedFile, { schema: "ccm-live-provider-multi-group-memory-fleet-report-v1", version: 1, generatedAt: isoDaysAgo(20), groups: [{ groupId: "phase366-group-protected", groupSessionId: "gcs_phase366_protected", sourceReportChecksum: multiProtected.reportChecksum }] });
  writeReport(fleetExpiredFile, { schema: "ccm-live-provider-multi-group-memory-fleet-report-v1", version: 1, generatedAt: isoDaysAgo(50), groups: [] });

  const receiptLedger = path.join(home, ".cc-connect", "memory-context-consumption-receipts", "mcrc_phase366_dummy.json");
  const recoveryLedger = path.join(home, ".cc-connect", "memory-context-consumption-recoveries", "mcrc_phase366_dummy.json");
  const continuationLedger = path.join(home, ".cc-connect", "task-agent-continuation-soak", "phase366-dummy.jsonl");
  for (const file of [receiptLedger, recoveryLedger, continuationLedger]) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "protected lower-level evidence\n", "utf8"); }

  const dry = retention.reconcileLiveProviderMemorySoakReports({ ...policy, dryRun: true });
  equal(dry.schema, "ccm-live-provider-memory-soak-retention-v1", "retention schema should be stable");
  equal(dry.summary.reportCount, 9, "inventory should include all managed JSON reports");
  equal(dry.summary.validCount, 8, "eight reports should verify");
  equal(dry.summary.invalidCount, 1, "malformed JSON should fail closed");
  equal(dry.summary.referencedSingleCount, 1, "fleet transitive reference should protect one child report");
  equal(dry.summary.referencedMultiCount, 1, "fleet should protect one multi-group report");
  equal(dry.summary.prunableCount, 4, "four unreferenced old reports should be candidates");
  equal(dry.summary.retentionExpiredCount, 4, "all candidates should be retention-expired");
  equal(dry.summary.overflowCount, 4, "all candidates should also exceed bounded counts");
  equal(dry.summary.unexpectedEntryCount, 1, "unmanaged text entry should be reported");
  equal(dry.pruned.length, 0, "dry-run must not delete reports");
  ok(dry.prunableRows.every(row => fs.existsSync(row.file)), "dry-run candidates should remain on disk");
  ok(dry.rows.find(row => row.name === "single-protected.json")?.protectedBy === "multi_group_report", "child reference reason should be explicit");
  ok(dry.rows.find(row => row.name === "multi-protected.json")?.protectedBy === "fleet_report", "multi reference reason should be explicit");
  ok(dry.rows.find(row => row.name === "single-invalid.json")?.protectedBy === "invalid_fail_closed", "invalid report should never be auto-pruned");

  const executed = retention.reconcileLiveProviderMemorySoakReports({ ...policy, prune: true, dryRun: false });
  equal(executed.pruned.length, 4, "execute should prune all verified candidates");
  equal(executed.skipped.length, 0, "stable candidates should not be skipped");
  for (const row of dry.prunableRows) equal(fs.existsSync(row.file), false, `${row.name} should be pruned`);
  for (const file of [singleProtectedFile, singleFreshFile, multiProtectedFile, fleetProtectedFile, path.join(singleDir, "single-invalid.json")]) ok(fs.existsSync(file), `${path.basename(file)} should remain`);
  ok(fs.existsSync(path.join(singleDir, "README.txt")), "unmanaged file should remain");
  for (const file of [receiptLedger, recoveryLedger, continuationLedger]) ok(fs.existsSync(file), "lower-level evidence must remain untouched");
  const after = retention.buildLiveProviderMemorySoakRetentionInventory(policy);
  equal(after.summary.reportCount, 5, "post-prune inventory should retain five reports");
  equal(after.summary.prunableCount, 0, "post-prune inventory should have no candidates");
  equal(after.summary.referencedSingleCount, 1, "post-prune child reference should remain");
  equal(after.summary.referencedMultiCount, 1, "post-prune multi reference should remain");
  fs.writeFileSync(stateFile, `${JSON.stringify({ policy, files: { singleProtectedFile, singleFreshFile, multiProtectedFile, fleetProtectedFile, receiptLedger, recoveryLedger, continuationLedger } }, null, 2)}\n`, "utf8");
  console.log(`PHASE366_prepare=${JSON.stringify({ checks, pruned: executed.pruned.length })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = retention.buildLiveProviderMemorySoakRetentionInventory(state.policy);
  equal(inventory.summary.reportCount, 5, "restart should preserve bounded report inventory");
  equal(inventory.summary.validCount, 4, "restart should preserve four valid reports");
  equal(inventory.summary.invalidCount, 1, "restart should preserve invalid report for review");
  equal(inventory.summary.prunableCount, 0, "restart should not recreate candidates");
  equal(inventory.summary.referencedSingleCount, 1, "restart should rebuild child reference graph");
  equal(inventory.summary.referencedMultiCount, 1, "restart should rebuild multi reference graph");
  for (const file of Object.values(state.files)) ok(fs.existsSync(file), `${path.basename(file)} should survive restart`);
  const repeat = retention.reconcileLiveProviderMemorySoakReports({ ...state.policy, prune: true, dryRun: false });
  equal(repeat.pruned.length, 0, "repeat execution should be idempotent");
  equal(repeat.skipped.length, 0, "idempotent execution should not skip files");
  const memoryReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase366-group-protected" });
  equal(memoryReport.overall.liveProviderReportRetentionReportCount, 5, "Memory Center should expose retained report count");
  equal(memoryReport.overall.liveProviderReportRetentionInvalidCount, 1, "Memory Center should expose invalid reports");
  equal(memoryReport.overall.liveProviderReportRetentionReferencedSingleCount, 1, "Memory Center should expose referenced child reports");
  equal(memoryReport.overall.liveProviderReportRetentionReferencedMultiCount, 1, "Memory Center should expose referenced multi reports");
  equal(memoryReport.overall.liveProviderReportRetentionPrunableCount, 0, "Memory Center should expose no remaining candidates");
  const audits = fs.readFileSync(auditFile, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  ok(audits.length >= 3, "dry-run, execute, and restart audits should persist");
  ok(audits.every(row => row.schema === "ccm-live-provider-memory-soak-retention-audit-v1" && !JSON.stringify(row).includes("sentinel")), "retention audits should remain body-free");
  console.log(`PHASE366_restart=${JSON.stringify({ checks, reports: inventory.summary.reportCount })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 366 mode: ${mode}`);
