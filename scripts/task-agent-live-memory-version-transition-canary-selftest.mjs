import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE373_${stage}=`));
  if (!line) throw new Error(`Phase 373 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-transition-canary-"));
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const codexFile = process.platform === "win32" ? path.join(bin, "codex.cmd") : path.join(bin, "codex");
  const env = { ...process.env, HOME: home, USERPROFILE: home, PATH: `${bin}${path.delimiter}${process.env.PATH || ""}`, PHASE373_HOME: home, PHASE373_CODEX: codexFile };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    console.log(JSON.stringify({ pass: true, checks: Number(prepare.checks || 0) + Number(restart.checks || 0), prepare, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE373_HOME;
const codexFile = process.env.PHASE373_CODEX;
if (!home || !codexFile) throw new Error("Phase 373 worker environment is incomplete");
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const transition = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-version-transition-ledger.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const approvalDir = path.join(home, ".cc-connect", "reliability", "live-provider-memory-wave-approvals");
const stateFile = path.join(home, "phase373-state.json");
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
  const at = new Date(Date.now() + stamp * 5_000);
  fs.utimesSync(codexFile, at, at);
  const snapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  equal(snapshot.status, "ok", `Codex ${version} should be available`);
  equal(snapshot.semanticVersion, version, `Codex ${version} should be detected`);
  return { snapshot, content: fs.readFileSync(codexFile), at };
}

function restoreFakeCodex(saved) {
  fs.writeFileSync(codexFile, saved.content, { mode: 0o700 });
  fs.utimesSync(codexFile, saved.at, saved.at);
  return runtime.captureAgentRuntimeVersionSnapshot("codex");
}

function commitBaselineWave(runId, generatedAt, snapshot) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `phase373-baseline-${runId}-${index + 1}`;
    const groupSessionId = `gcs_phase373_baseline_${runId}_${index + 1}`;
    const child = signed({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: `${runId}-child-${index + 1}`, generatedAt, accountBacked: true, groupId, groupSessionId, passedCount: 1, providers: [{ provider: "codex", version: snapshot.semanticVersion, model: "phase373-model", providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum, status: "passed", issue: "", workspaceUnchanged: true, receiptRecovery: { status: "recovered", recovered: true, receiptValid: true, suppressTaskReplay: true } }] });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId, groupSessionId, status: "passed", issues: [], durationMs: 40_000 + index * 2_000, childReportChecksum: child.reportChecksum, recoveryStatus: "recovered", receiptValid: true });
  }
  const source = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId, generatedAt, accountBacked: true, provider: "codex", model: "phase373-model", requestedGroupCount: 2, concurrency: 1, passedCount: 2, failedCount: 0, isolationValid: true, groups });
  store.commitLiveProviderMemorySoakReport(source, { kind: "multi" });
}

function commitCanaryOutcome(plan, snapshot, suffix, overrides = {}) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `${plan.groupPrefix}-${suffix}-${index + 1}`;
    const groupSessionId = `gcs_phase373_canary_${suffix}_${index + 1}`;
    const child = signed({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: `phase373-${suffix}-child-${index + 1}`, generatedAt: new Date().toISOString(), accountBacked: overrides.accountBacked !== false, groupId, groupSessionId, passedCount: 1, providers: [{ provider: plan.provider, version: overrides.version || snapshot.semanticVersion, model: plan.model, providerRuntimeIdentityChecksum: overrides.identity || snapshot.executableIdentityChecksum, status: "passed", issue: "", workspaceUnchanged: overrides.workspaceUnchanged !== false, receiptRecovery: { status: "recovered", recovered: true, receiptValid: true, suppressTaskReplay: overrides.suppressTaskReplay === true } }] });
    const childFile = store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId, groupSessionId, status: "passed", issues: [], durationMs: 45_000 + index * 1_000, childReportChecksum: child.reportChecksum, memoryContinuityMode: "receipt_recovery", memoryContinuityVerified: true, recoveryStatus: "recovered", receiptValid: true, childFile });
  }
  const report = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: `phase373-${suffix}-multi`, generatedAt: new Date().toISOString(), accountBacked: overrides.accountBacked !== false, provider: plan.provider, model: plan.model, requestedGroupCount: 2, concurrency: 1, passedCount: 2, failedCount: 0, isolationValid: true, groups });
  const reportFile = store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return { exitCode: 0, reportFile, reportChecksum: report.reportChecksum };
}

function callApi(method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    const res = { statusCode: 200, writeHead(status) { this.statusCode = status; }, end(payload) { try { resolve({ status: this.statusCode, data: JSON.parse(String(payload || "{}")) }); } catch (error) { reject(error); } } };
    if (!center.handleMemoryCenterApi(pathname, req, res, { query: {} })) return reject(new Error(`route not handled:${pathname}`));
    if (method === "POST") { req.emit("data", Buffer.from(JSON.stringify(body || {}))); req.emit("end"); }
  });
}

if (mode === "prepare") {
  const v1 = writeFakeCodex("1.0.0", 1);
  commitBaselineWave("phase373-wave-a", "2026-07-16T01:00:00.000Z", v1.snapshot);
  commitBaselineWave("phase373-wave-b", "2026-07-16T02:00:00.000Z", v1.snapshot);
  const baseline = endurance.auditLiveProviderMemoryEndurance();
  equal(baseline.gatePassed, true, "baseline endurance evidence should pass");
  equal(approval.buildLiveProviderMemoryWaveApprovalPreview().approvable, true, "matching v1 should allow ordinary approval");
  equal(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview().approvable, false, "matching v1 should not offer transition canary");

  const v2 = writeFakeCodex("2.0.0", 2);
  const regularDrift = approval.buildLiveProviderMemoryWaveApprovalPreview();
  const canaryPreview = approval.buildLiveProviderMemoryVersionTransitionCanaryPreview();
  equal(regularDrift.approvable, false, "new v2 identity should block ordinary approval");
  equal(canaryPreview.runtimeDriftDetected, true, "new v2 identity should be detected");
  equal(canaryPreview.approvable, true, "healthy v1 baseline should allow explicit transition canary");
  equal(canaryPreview.plan.groups, 2, "transition canary should be fixed to two groups");
  equal(canaryPreview.plan.concurrency, 1, "transition canary should be fixed to concurrency one");
  equal(canaryPreview.liveExecutionAuthorized, false, "canary preview should never grant execution");
  equal(canaryPreview.toProviderVersionKey, digest(["codex", "phase373-model", [v2.snapshot.semanticVersion], [v2.snapshot.executableIdentityChecksum]]), "canary should bind exact new runtime identity");
  const cliPreview = spawnSync(process.execPath, [path.join(root, "scripts", "task-agent-live-memory-wave-approval.mjs"), "transition-preview"], { cwd: root, env: process.env, encoding: "utf8", timeout: 30_000 });
  equal(cliPreview.status, 0, "transition canary CLI preview should respond");
  ok(String(cliPreview.stdout || "").includes('"approvable":true'), "transition canary CLI should expose current readiness");

  const apiGet = await callApi("GET", "/api/memory-center/live-endurance-wave-approval");
  equal(apiGet.status, 200, "Memory Center GET should return transition canary preview");
  equal(apiGet.data.transitionCanaryPreview.approvable, true, "Memory Center should expose canary readiness");
  let missingAcknowledgementRejected = false;
  try { approval.createLiveProviderMemoryVersionTransitionCanaryApproval({ explicitApproval: true, riskAccepted: true, transitionAcknowledged: false, approvedBy: "phase373-user", enduranceReportChecksum: canaryPreview.enduranceReportChecksum, planChecksum: canaryPreview.planChecksum }); } catch { missingAcknowledgementRejected = true; }
  equal(missingAcknowledgementRejected, true, "canary approval should require transition acknowledgement");
  const apiApproval = await callApi("POST", "/api/memory-center/live-endurance-wave-approval", { action: "approve_transition_canary", explicitApproval: true, riskAccepted: true, transitionAcknowledged: true, approvedBy: "phase373-user", reason: "explicit v2 transition canary", enduranceReportChecksum: canaryPreview.enduranceReportChecksum, planChecksum: canaryPreview.planChecksum });
  equal(apiApproval.status, 200, "Memory Center should create explicit canary receipt");
  const receipt = apiApproval.data.receipt;
  equal(receipt.approvalMode, "version_transition_canary", "receipt should be canary-only");
  equal(receipt.canaryOnly, true, "receipt must not authorize ordinary wave shape");
  equal(receipt.transitionAcknowledged, true, "receipt should preserve explicit transition acknowledgement");
  equal(receipt.evidencePromotionRequired, true, "receipt should require endurance promotion");
  equal(approval.verifyLiveProviderMemoryWaveApprovalReceipt(receipt).valid, true, "canary HMAC receipt should verify");
  ok(Date.parse(receipt.expiresAt) - Date.parse(receipt.createdAt) <= 15 * 60_000, "canary receipt TTL should be at most fifteen minutes");
  let duplicateRejected = false;
  try { approval.createLiveProviderMemoryVersionTransitionCanaryApproval({ explicitApproval: true, riskAccepted: true, transitionAcknowledged: true, approvedBy: "phase373-user", enduranceReportChecksum: canaryPreview.enduranceReportChecksum, planChecksum: canaryPreview.planChecksum }); } catch { duplicateRejected = true; }
  equal(duplicateRejected, true, "same transition plan should have only one active receipt");

  writeFakeCodex("3.0.0", 3);
  let changedRuntimeRejected = false;
  try { approval.claimLiveProviderMemoryWaveApproval({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, explicitExecution: true }); } catch { changedRuntimeRejected = true; }
  equal(changedRuntimeRejected, true, "canary should fail before claim when runtime changes again");
  const restored = restoreFakeCodex(v2);
  equal(restored.executableIdentityChecksum, v2.snapshot.executableIdentityChecksum, "restored v2 executable identity should match approved canary");
  equal(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview().planChecksum, canaryPreview.planChecksum, "restored exact identity should restore the approved canary plan");

  const completed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, explicitExecution: true, executionActor: "phase373-canary-runner" }, plan => commitCanaryOutcome(plan, v2.snapshot, "v2-success"));
  equal(completed.status, "completed", "valid canary and promotion should complete");
  equal(completed.evidencePromotionStatus, "promoted", "valid canary should promote new endurance evidence");
  equal(completed.wavePassed, true, "promoted canary should pass");
  ok(/^[a-f0-9]{64}$/.test(completed.promotedEnduranceReportChecksum), "promoted endurance report should be checksum bound");
  const promoted = endurance.readLatestLiveProviderMemoryEnduranceReport();
  equal(promoted.reportChecksum, completed.promotedEnduranceReportChecksum, "latest endurance report should be canary promotion result");
  equal(promoted.providerVersionTrend.comparisons.at(-1).status, "verified", "new v2 transition should be verified");
  equal(promoted.providerVersionTrend.comparisons.at(-1).memoryContinuityVerified, true, "new v2 should prove memory continuity");
  equal(approval.buildLiveProviderMemoryWaveApprovalPreview().approvable, true, "promoted v2 evidence should reopen ordinary approval");
  equal(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview().approvable, false, "promoted v2 should no longer offer canary");
  const ledger = transition.readLiveProviderMemoryVersionTransitionLedger();
  equal(ledger.valid, true, "promotion should append valid transition ledger evidence");
  equal(ledger.transitionCount, 1, "promotion should record one v1 to v2 transition");
  equal(ledger.verifiedCount, 1, "promoted transition should be verified");
  let replayRejected = false;
  try { approval.executeApprovedLiveProviderMemoryWave({ receiptId: receipt.receiptId, receiptChecksum: completed.receiptChecksum, explicitExecution: true }, plan => commitCanaryOutcome(plan, v2.snapshot, "replay")); } catch { replayRejected = true; }
  equal(replayRejected, true, "promoted canary receipt should remain single use");

  const v3 = writeFakeCodex("3.0.0", 4);
  const failedPreview = approval.buildLiveProviderMemoryVersionTransitionCanaryPreview();
  equal(failedPreview.approvable, true, "v3 drift should offer a new canary");
  const failedReceipt = approval.createLiveProviderMemoryVersionTransitionCanaryApproval({ explicitApproval: true, riskAccepted: true, transitionAcknowledged: true, approvedBy: "phase373-user", enduranceReportChecksum: failedPreview.enduranceReportChecksum, planChecksum: failedPreview.planChecksum });
  const failed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: failedReceipt.receiptId, receiptChecksum: failedReceipt.receiptChecksum, explicitExecution: true }, plan => commitCanaryOutcome(plan, v3.snapshot, "v3-not-account-backed", { accountBacked: false }));
  equal(failed.status, "execution_failed", "non-account-backed canary report should fail");
  equal(failed.evidencePromotionStatus, "not_run", "invalid execution evidence should not be promoted");
  ok(failed.executionIssues.includes("transition_canary_not_account_backed"), "failure should expose account-backed requirement");
  equal(approval.buildLiveProviderMemoryWaveApprovalPreview().approvable, false, "failed v3 canary should not create ordinary approval evidence");

  const inventory = approval.reconcileLiveProviderMemoryWaveApprovals();
  equal(inventory.transitionCanaryCount, 2, "inventory should include successful and failed canaries");
  equal(inventory.transitionCanaryPromotedCount, 1, "inventory should expose one promoted canary");
  equal(inventory.transitionCanaryPromotionFailedCount, 0, "execution-invalid canary should remain not-run rather than promotion-failed");
  ok(inventory.referencedEnduranceReportChecksums.includes(completed.promotedEnduranceReportChecksum), "approval retention should reference promoted endurance report");
  const reportRetention = retention.buildLiveProviderMemorySoakRetentionInventory({ enduranceRetentionDays: 1, minimumEnduranceReports: 0, maximumEnduranceReports: 0, graceHours: 0 });
  ok(reportRetention.rows.some(row => row.reportChecksum === completed.promotedEnduranceReportChecksum && row.referenced), "promoted endurance report should be protected from pruning");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase373-baseline-phase373-wave-a-1" });
  equal(memoryCenter.overall.liveProviderMemoryTransitionCanaryCount, 2, "Memory Center should expose canary count");
  equal(memoryCenter.overall.liveProviderMemoryTransitionCanaryPromotedCount, 1, "Memory Center should expose promoted canary count");
  equal(memoryCenter.liveProviderMemoryVersionTransitionCanaryPreview.runtimeDriftDetected, true, "Memory Center should expose current unproven v3 drift");
  fs.writeFileSync(stateFile, `${JSON.stringify({ completedReceiptId: completed.receiptId, failedReceiptId: failed.receiptId, promotedEnduranceReportChecksum: completed.promotedEnduranceReportChecksum }, null, 2)}\n`, "utf8");
  console.log(`PHASE373_prepare=${JSON.stringify({ checks, promoted: completed.evidencePromotionStatus, canaries: inventory.transitionCanaryCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = approval.reconcileLiveProviderMemoryWaveApprovals();
  equal(inventory.transitionCanaryCount, 2, "restart should preserve both canary receipts");
  equal(inventory.transitionCanaryPromotedCount, 1, "restart should preserve promotion status");
  equal(inventory.approvedCount, 0, "restart should leave no active canary approval");
  ok(inventory.failedCount >= 1, "restart should preserve failed canary execution");
  const completed = approval.readLiveProviderMemoryWaveApproval(state.completedReceiptId);
  equal(completed.evidencePromotionStatus, "promoted", "promoted receipt should survive restart");
  equal(completed.promotedEnduranceReportChecksum, state.promotedEnduranceReportChecksum, "promotion report identity should survive restart");
  equal(approval.verifyLiveProviderMemoryWaveApprovalReceipt(completed).issues.includes("approval_checksum_invalid"), false, "terminal promoted receipt should remain checksum valid");
  ok(fs.existsSync(path.join(approvalDir, `${state.completedReceiptId}.json`)), "promoted receipt should remain retained");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase373-baseline-phase373-wave-a-1" });
  equal(memoryCenter.overall.liveProviderMemoryTransitionCanaryPromotedCount, 1, "Memory Center should rebuild promoted count after restart");
  equal(memoryCenter.overall.liveProviderMemoryTransitionCanaryApprovable, true, "unproven v3 runtime should still expose explicit canary readiness");
  equal(memoryCenter.liveProviderMemoryVersionTransitionCanaryPreview.liveExecutionAuthorized, false, "restart preview should remain non-executable");
  console.log(`PHASE373_restart=${JSON.stringify({ checks, canaries: inventory.transitionCanaryCount })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 373 mode:${mode}`);
