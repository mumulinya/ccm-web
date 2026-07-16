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

function parseWorker(output, label) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE375_${label}=`));
  if (!line) throw new Error(`Phase 375 ${label} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const rootHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-initial-memory-baseline-"));
  try {
    const workers = [
      { label: "claudecode", provider: "claudecode", workerMode: "success" },
      { label: "cursor", provider: "cursor", workerMode: "success" },
      { label: "codex_race", provider: "codex", workerMode: "race" },
    ];
    const results = [];
    for (const worker of workers) {
      const home = path.join(rootHome, worker.label);
      fs.mkdirSync(home, { recursive: true });
      const env = {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        PHASE375_HOME: home,
        PHASE375_LABEL: worker.label,
        PHASE375_PROVIDER: worker.provider,
        PHASE375_WORKER_MODE: worker.workerMode,
      };
      const run = spawnSync(process.execPath, [scriptFile, "worker"], { cwd: root, env, encoding: "utf8", timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      results.push(parseWorker(run.stdout, worker.label));
    }
    console.log(JSON.stringify({ pass: true, checks: results.reduce((sum, row) => sum + Number(row.checks || 0), 0), workers: results }, null, 2));
  } finally {
    fs.rmSync(rootHome, { recursive: true, force: true });
  }
  process.exit(0);
}

if (mode !== "worker") throw new Error(`unknown Phase 375 mode:${mode}`);
const home = process.env.PHASE375_HOME;
const label = process.env.PHASE375_LABEL;
const provider = process.env.PHASE375_PROVIDER;
const workerMode = process.env.PHASE375_WORKER_MODE;
if (!home || !label || !["claudecode", "codex", "cursor"].includes(provider)) throw new Error("Phase 375 worker environment is incomplete");

const bin = path.join(home, "bin");
fs.mkdirSync(bin, { recursive: true });
const commandName = provider === "claudecode" ? "claude" : provider === "cursor" ? "cursor-agent" : "codex";
const commandFile = process.platform === "win32" ? path.join(bin, `${commandName}.cmd`) : path.join(bin, commandName);
const version = provider === "claudecode" ? "2.1.201" : provider === "cursor" ? "2026.07.09-a3815c0" : "0.115.0";
fs.writeFileSync(commandFile, process.platform === "win32" ? `@echo off\r\necho ${commandName} ${version}\r\n` : `#!/bin/sh\necho ${commandName} ${version}\n`, { encoding: "utf8", mode: 0o700 });
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH || ""}`;

const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const snapshot = runtime.captureAgentRuntimeVersionSnapshot(provider);
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const throws = (fn, matcher, message) => { checks += 1; assert.throws(fn, matcher, message); };

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

function commitWave(plan, suffix, generatedAt = new Date().toISOString()) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `${plan.groupPrefix}-${suffix}-${index + 1}`;
    const groupSessionId = `gcs_phase375_${label}_${suffix}_${index + 1}`;
    const codex = provider === "codex";
    const child = signed({
      schema: "ccm-live-provider-native-memory-soak-report-v2",
      version: 2,
      runId: `phase375-${label}-${suffix}-child-${index + 1}`,
      generatedAt,
      accountBacked: true,
      groupId,
      groupSessionId,
      passedCount: 1,
      providers: [{
        provider,
        version: snapshot.semanticVersion,
        model: plan.model,
        providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum,
        status: "passed",
        issue: "",
        sentinelChecksum: digest(`${suffix}:sentinel:${index}`),
        sessionChecksum: digest(`${suffix}:session:${index}`),
        initial: { status: "passed" },
        resume: { status: "passed" },
        receiptRecovery: codex ? { status: "recovered", recovered: true, receiptValid: true, suppressTaskReplay: false } : null,
        workspaceUnchanged: true,
      }],
    });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({
      groupId,
      groupSessionId,
      status: "passed",
      issues: [],
      durationMs: 31_000 + index * 1_000,
      childReportChecksum: child.reportChecksum,
      memoryContinuityMode: codex ? "receipt_recovery" : "native_session_resume",
      memoryContinuityVerified: true,
      recoveryStatus: codex ? "recovered" : "native_session_resume_verified",
      receiptValid: true,
    });
  }
  const report = signed({
    schema: "ccm-live-provider-multi-group-memory-soak-report-v1",
    version: 1,
    runId: `phase375-${label}-${suffix}-multi`,
    generatedAt,
    accountBacked: true,
    provider,
    model: plan.model,
    requestedGroupCount: 2,
    concurrency: 1,
    passedCount: 2,
    failedCount: 0,
    isolationValid: true,
    groups,
  });
  const reportFile = store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return { exitCode: 0, reportFile, reportChecksum: report.reportChecksum };
}

equal(snapshot.status, "ok", "fixture Provider runtime should be available");
equal(snapshot.semanticVersion, version, "fixture Provider version should be captured");
const preview = approval.buildLiveProviderInitialMemoryBaselineCanaryPreview({ provider });
equal(preview.reportPresent, false, "initial preview should prove no Provider baseline is present");
equal(preview.reportValid, false, "initial preview should have no valid Provider baseline");
equal(preview.runtimeReady, true, "installed Provider runtime should be ready");
equal(preview.runtimeUnproven, true, "runtime should be explicitly marked unproven");
equal(preview.approvable, true, "explicit initial baseline canary should be available");
equal(preview.plan.provider, provider, "plan should bind the selected Provider");
equal(preview.plan.groups, 2, "initial baseline canary should use two groups");
equal(preview.plan.concurrency, 1, "initial baseline canary should use concurrency one");
ok(/^[a-f0-9]{64}$/.test(preview.baselineAbsenceChecksum), "baseline absence proof should be checksummed");
equal(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider }).approvable, false, "ordinary approval must remain closed without a baseline");
equal(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview({ provider }).approvable, false, "transition canary must remain closed without a baseline");
throws(() => approval.createLiveProviderInitialMemoryBaselineCanaryApproval({ explicitApproval: true, riskAccepted: true, approvedBy: "phase375-user", baselineAbsenceChecksum: preview.baselineAbsenceChecksum, planChecksum: preview.planChecksum, provider }), /initialBaselineAcknowledged/, "approval must explicitly acknowledge initial baseline creation");

const receipt = approval.createLiveProviderInitialMemoryBaselineCanaryApproval({
  explicitApproval: true,
  riskAccepted: true,
  initialBaselineAcknowledged: true,
  approvedBy: "phase375-user",
  reason: "phase375 explicit initial baseline canary",
  baselineAbsenceChecksum: preview.baselineAbsenceChecksum,
  planChecksum: preview.planChecksum,
  provider,
  model: preview.plan.model,
});
equal(receipt.approvalMode, "initial_provider_baseline_canary", "receipt should preserve initial baseline mode");
equal(receipt.canaryOnly, true, "initial baseline receipt should remain canary-only");
equal(receipt.singleUse, true, "initial baseline receipt should remain single-use");
equal(approval.verifyLiveProviderMemoryWaveApprovalReceipt(receipt, { requireCurrent: true }).valid, true, "fresh receipt HMAC and current-state proof should verify");

if (workerMode === "race") {
  const baselinePlan = { ...receipt.plan, groupPrefix: `phase375-${label}-race-baseline` };
  commitWave(baselinePlan, "race-a", "2026-07-16T03:00:00.000Z");
  commitWave(baselinePlan, "race-b", "2026-07-16T04:00:00.000Z");
  const baseline = endurance.auditLiveProviderMemoryEndurance({ provider });
  equal(baseline.gatePassed, true, "concurrent process should establish a valid standard baseline");
  const stale = approval.verifyLiveProviderMemoryWaveApprovalReceipt(receipt, { requireCurrent: true });
  equal(stale.valid, false, "receipt should become stale when a baseline appears before claim");
  ok(stale.issues.includes("approval_current_plan_not_approvable") || stale.issues.includes("approval_source_set_stale"), "stale receipt should identify changed baseline state");
  throws(() => approval.claimLiveProviderMemoryWaveApproval({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, explicitExecution: true }), /approval rejected/, "claim should fail closed after baseline race");
  console.log(`PHASE375_${label}=${JSON.stringify({ checks, provider, raceRejected: true })}`);
  process.exit(0);
}

const completed = approval.executeApprovedLiveProviderMemoryWave({
  receiptId: receipt.receiptId,
  receiptChecksum: receipt.receiptChecksum,
  explicitExecution: true,
  executionActor: "phase375-runner",
}, plan => commitWave(plan, "success"));
equal(completed.status, "completed", "valid first baseline canary should complete");
equal(completed.wavePassed, true, "valid first baseline canary should pass");
equal(completed.evidencePromotionStatus, "promoted", "first canary evidence should promote to Provider baseline");
ok(/^[a-f0-9]{64}$/.test(completed.promotedEnduranceReportChecksum), "promotion should reference a signed endurance report");
const promoted = endurance.readLatestLiveProviderMemoryEnduranceReport({ provider });
equal(promoted.providerFilter, provider, "promoted baseline should be Provider-scoped");
equal(promoted.gatePassed, true, "promoted initial baseline gate should pass");
equal(promoted.baselineQualification?.mode, "initial_provider_baseline_canary", "baseline should disclose its initial canary qualification");
equal(promoted.baselineQualification?.initialBaselineCanaryGatePassed, true, "initial qualification should prove the strict two-group gate");
equal(promoted.summary?.waveCount, 1, "initial qualification should not fabricate a second wave");
equal(promoted.summary?.observedGroupCount, 2, "initial qualification should retain exactly two observed groups");
equal(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider }).approvable, true, "promoted Provider should open ordinary explicit wave approval");
equal(approval.buildLiveProviderInitialMemoryBaselineCanaryPreview({ provider }).approvable, false, "Provider with a baseline should never offer another initial canary");
throws(() => approval.createLiveProviderInitialMemoryBaselineCanaryApproval({ explicitApproval: true, riskAccepted: true, initialBaselineAcknowledged: true, approvedBy: "phase375-user", baselineAbsenceChecksum: preview.baselineAbsenceChecksum, planChecksum: preview.planChecksum, provider }), /not currently approvable/, "duplicate initial baseline creation should be rejected");
const inventory = approval.reconcileLiveProviderMemoryWaveApprovals();
equal(inventory.initialBaselineCanaryCount, 1, "inventory should count initial baseline receipts");
equal(inventory.initialBaselineCanaryPromotedCount, 1, "inventory should count promoted initial baselines");
const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: `phase375-${label}-success-1` });
equal(memoryCenter.liveProviderInitialMemoryBaselineCanaryProviderPreviews.length, 3, "Memory Center should expose all Provider initial baseline previews");
equal(memoryCenter.liveProviderInitialMemoryBaselineCanaryProviderPreviews.find(row => row.plan?.provider === provider)?.approvable, false, "Memory Center should close the promoted Provider initial baseline action");
const cli = spawnSync(process.execPath, [path.join(root, "scripts", "task-agent-live-memory-wave-approval.mjs"), "initial-baseline-preview", "--provider", provider], { cwd: root, env: process.env, encoding: "utf8", timeout: 30_000 });
equal(cli.status, 0, "Provider-scoped initial baseline CLI preview should respond");
ok(String(cli.stdout || "").includes(`\"provider\":\"${provider}\"`) && String(cli.stdout || "").includes('"approvable":false'), "CLI should expose the selected Provider's closed initial baseline state");

console.log(`PHASE375_${label}=${JSON.stringify({ checks, provider, promoted: completed.evidencePromotionStatus })}`);
