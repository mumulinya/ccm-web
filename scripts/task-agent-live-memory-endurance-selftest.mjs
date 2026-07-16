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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE368_${stage}=`));
  if (!line) throw new Error(`Phase 368 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-memory-endurance-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE368_HOME: home };
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

const home = process.env.PHASE368_HOME;
if (!home) throw new Error("PHASE368_HOME is required");
const require = createRequire(import.meta.url);
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase368-state.json");
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

function child(runId, groupId, sessionId, status, issue, recoveryStatus, suppressTaskReplay = false) {
  return signed({
    schema: "ccm-live-provider-native-memory-soak-report-v2",
    version: 2,
    runId,
    generatedAt: new Date().toISOString(),
    accountBacked: true,
    groupId,
    groupSessionId: sessionId,
    providers: [{ provider: "codex", status, issue, workspaceUnchanged: true, receiptRecovery: { status: recoveryStatus, suppressTaskReplay } }],
  });
}

function source(runId, concurrency, groups) {
  return signed({
    schema: "ccm-live-provider-multi-group-memory-soak-report-v1",
    version: 1,
    runId,
    generatedAt: new Date().toISOString(),
    accountBacked: true,
    provider: "codex",
    model: "phase368-fixture-model",
    requestedGroupCount: groups.length,
    concurrency,
    isolationValid: true,
    groups,
  });
}

if (mode === "prepare") {
  const childSpecs = [
    ["phase368-child-c1-a", "phase368-good-c1-a", "gcs_phase368_good_c1_a", "passed", "", "recovered", false],
    ["phase368-child-c1-b", "phase368-good-c1-b", "gcs_phase368_good_c1_b", "passed", "", "recovered", false],
    ["phase368-child-c2-a", "phase368-good-c2-a", "gcs_phase368_good_c2_a", "passed", "", "recovered", false],
    ["phase368-child-c2-b", "phase368-good-c2-b", "gcs_phase368_good_c2_b", "timeout", "provider_turn_timeout", "not_run", false],
    ["phase368-child-c2-c", "phase368-good-c2-c", "gcs_phase368_good_c2_c", "timeout", "provider_terminal_timeout", "blocked", true],
  ];
  const children = childSpecs.map(spec => child(...spec));
  children.forEach(report => store.commitLiveProviderMemorySoakReport(report, { kind: "single" }));
  const group = (index, status, issues, durationMs, receiptValid) => ({
    groupId: childSpecs[index][1],
    groupSessionId: childSpecs[index][2],
    status,
    issues,
    durationMs,
    childReportChecksum: children[index].reportChecksum,
    receiptValid,
  });
  const waveOne = source("phase368-wave-concurrency-1", 1, [group(0, "passed", [], 40_000, true), group(1, "passed", [], 44_000, true)]);
  const waveTwo = source("phase368-wave-concurrency-2", 2, [
    group(2, "passed", [], 55_000, true),
    group(3, "failed", ["child_failed", "child_receipt_recovery_unproven"], 120_000, false),
    group(4, "failed", ["child_failed", "child_receipt_recovery_unproven"], 143_000, true),
  ]);
  const waveOneFile = store.commitLiveProviderMemorySoakReport(waveOne, { kind: "multi" });
  const waveTwoFile = store.commitLiveProviderMemorySoakReport(waveTwo, { kind: "multi" });
  const good = endurance.auditLiveProviderMemoryEndurance({ groupPrefix: "phase368-good" });
  equal(good.schema, "ccm-live-provider-memory-endurance-report-v1", "endurance schema should be stable");
  equal(store.verifyLiveProviderMemorySoakReport(good, "endurance").valid, true, "endurance checksum should verify");
  equal(good.summary.waveCount, 2, "good audit should aggregate two waves");
  equal(good.summary.observedGroupCount, 5, "good audit should aggregate five groups");
  equal(good.summary.passedGroupCount, 3, "three groups should pass");
  equal(good.summary.providerLatencyTimeoutCount, 2, "two failures should be Provider latency timeouts");
  equal(good.summary.memoryReceiptFailureCount, 0, "timeouts should not be mislabeled as receipt failures");
  equal(good.summary.ccmEvidenceFailureCount, 0, "valid child evidence should not be a CCM failure");
  equal(good.summary.replaySuppressedCount, 1, "terminal timeout should preserve replay suppression");
  equal(good.concurrencyBuckets.length, 2, "two concurrency buckets should be present");
  equal(good.concurrencyBuckets.find(row => row.concurrency === 1)?.timeoutRate, 0, "baseline timeout rate should be zero");
  ok(good.concurrencyBuckets.find(row => row.concurrency === 2)?.timeoutRate > 0.66, "elevated timeout rate should be two thirds");
  equal(good.attribution.providerLatencySaturationObserved, true, "higher-concurrency latency correlation should be observed");
  equal(good.attribution.causalClaim, false, "correlation must never be promoted to a causal claim");
  equal(good.gatePassed, true, "good endurance evidence should pass the gate");
  ok(fs.existsSync(good.reportFile), "good endurance report should persist");

  const broken = source("phase368-wave-broken", 1, [{ groupId: "phase368-broken-a", groupSessionId: "gcs_phase368_broken_a", status: "failed", issues: [], durationMs: 1_000, childReportChecksum: "f".repeat(64), receiptValid: false }]);
  const brokenFile = store.commitLiveProviderMemorySoakReport(broken, { kind: "multi" });
  const brokenAudit = endurance.auditLiveProviderMemoryEndurance({ groupPrefix: "phase368-broken" });
  equal(brokenAudit.summary.waveCount, 1, "broken audit should contain one wave");
  equal(brokenAudit.summary.ccmEvidenceFailureCount, 1, "missing child must be a CCM evidence failure");
  equal(brokenAudit.summary.providerLatencyTimeoutCount, 0, "missing child must not be blamed on Provider latency");
  equal(brokenAudit.gatePassed, false, "CCM evidence failure should fail the gate");
  const inventory = retention.buildLiveProviderMemorySoakRetentionInventory();
  equal(inventory.summary.enduranceReportCount, 2, "retention should inventory both endurance reports");
  equal(inventory.summary.referencedMultiCount, 3, "retained endurance reports should protect all three source waves");
  equal(inventory.summary.referencedSingleCount, 5, "retained source waves should protect all valid child reports");
  equal(inventory.summary.prunableCount, 0, "protected endurance graph should have no prune candidates");
  ok(!JSON.stringify(good).includes("sentinel") && !JSON.stringify(good).includes("prompt") && !JSON.stringify(good).includes("stdout"), "endurance report should remain body-free");
  fs.writeFileSync(stateFile, `${JSON.stringify({ goodReportFile: good.reportFile, brokenReportFile: brokenAudit.reportFile, waveOneFile, waveTwoFile, brokenFile }, null, 2)}\n`, "utf8");
  console.log(`PHASE368_prepare=${JSON.stringify({ checks, goodChecksum: good.reportChecksum, brokenChecksum: brokenAudit.reportChecksum })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  for (const file of Object.values(state)) ok(fs.existsSync(file), `${path.basename(file)} should survive restart`);
  const latest = endurance.readLatestLiveProviderMemoryEnduranceSummary();
  equal(latest.present, true, "latest endurance summary should be present");
  equal(latest.waveCount, 1, "latest broken audit should remain the current summary");
  equal(latest.ccmEvidenceFailureCount, 1, "latest summary should expose CCM evidence failure");
  equal(latest.gatePassed, false, "latest summary gate should remain failed");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase368-broken-a" });
  equal(memoryCenter.overall.liveProviderMemoryEnduranceWaveCount, 1, "Memory Center should expose latest wave count");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceCcmEvidenceFailureCount, 1, "Memory Center should expose CCM evidence failures");
  equal(memoryCenter.overall.liveProviderMemoryEnduranceGatePassed, false, "Memory Center should expose failed endurance gate");
  equal(memoryCenter.overall.liveProviderReportRetentionCoordinated, true, "Memory Center should include endurance in coordinated writers");
  const inventory = retention.buildLiveProviderMemorySoakRetentionInventory();
  equal(inventory.summary.enduranceReportCount, 2, "restart should retain endurance reports");
  equal(inventory.summary.referencedMultiCount, 3, "restart should rebuild endurance-to-multi references");
  equal(inventory.summary.referencedSingleCount, 5, "restart should rebuild multi-to-child references");
  const rerun = endurance.auditLiveProviderMemoryEndurance({ groupPrefix: "phase368-good", persist: false });
  equal(rerun.summary.waveCount, 2, "read-only rerun should recover both good waves");
  equal(rerun.summary.providerLatencyTimeoutCount, 2, "read-only rerun should preserve timeout attribution");
  equal(rerun.attribution.providerLatencySaturationObserved, true, "read-only rerun should preserve concurrency correlation");
  equal(rerun.gatePassed, true, "read-only good rerun should pass");
  console.log(`PHASE368_restart=${JSON.stringify({ checks, enduranceReports: inventory.summary.enduranceReportCount })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 368 mode: ${mode}`);
