import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE370_${stage}=`));
  if (!line) throw new Error(`Phase 370 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-wave-approval-"));
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const codexFile = process.platform === "win32" ? path.join(bin, "codex.cmd") : path.join(bin, "codex");
  fs.writeFileSync(codexFile, process.platform === "win32" ? "@echo off\r\necho codex-cli 9.9.9\r\n" : "#!/bin/sh\necho codex-cli 9.9.9\n", { encoding: "utf8", mode: 0o700 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, PATH: `${bin}${path.delimiter}${process.env.PATH || ""}`, PHASE370_HOME: home, PHASE370_CODEX: codexFile };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 6 * 1024 * 1024 });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 6 * 1024 * 1024 });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    console.log(JSON.stringify({ pass: true, checks: Number(prepare.checks || 0) + Number(restart.checks || 0), prepare, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE370_HOME;
const codexFile = process.env.PHASE370_CODEX;
if (!home || !codexFile) throw new Error("Phase 370 worker environment is incomplete");
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase370-state.json");
const approvalDir = path.join(home, ".cc-connect", "reliability", "live-provider-memory-wave-approvals");
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

function commitSourceWave(runId, generatedAt, snapshot) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `phase370-${runId}-${index + 1}`;
    const groupSessionId = `gcs_phase370_${runId}_${index + 1}`;
    const child = signed({
      schema: "ccm-live-provider-native-memory-soak-report-v2",
      version: 2,
      runId: `${runId}-child-${index + 1}`,
      generatedAt,
      accountBacked: true,
      groupId,
      groupSessionId,
      providers: [{ provider: "codex", version: snapshot.semanticVersion, model: "phase370-model", providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum, status: "passed", issue: "", workspaceUnchanged: true, receiptRecovery: { status: "recovered", suppressTaskReplay: false } }],
    });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId, groupSessionId, status: "passed", issues: [], durationMs: 55_000 + index * 2_000, childReportChecksum: child.reportChecksum, receiptValid: true });
  }
  const source = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId, generatedAt, accountBacked: true, provider: "codex", model: "phase370-model", requestedGroupCount: 2, concurrency: 1, isolationValid: true, groups });
  store.commitLiveProviderMemorySoakReport(source, { kind: "multi" });
}

function commitExecutionReport(plan, suffix, overrides = {}) {
  const groups = Array.from({ length: plan.groups }, (_, index) => ({ groupId: `${plan.groupPrefix}-${suffix}-${index + 1}`, groupSessionId: `gcs_phase370_execution_${suffix}_${index + 1}`, status: "passed", issues: [], childReportChecksum: digest(`${suffix}:${index}`), receiptValid: true }));
  const unsigned = { schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: `phase370-execution-${suffix}`, generatedAt: new Date().toISOString(), accountBacked: false, provider: plan.provider, model: plan.model, requestedGroupCount: plan.groups, concurrency: plan.concurrency, isolationValid: true, passedCount: plan.groups, failedCount: 0, groups, ...overrides };
  const report = signed(unsigned);
  const reportFile = store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return { exitCode: 0, reportFile, reportChecksum: report.reportChecksum };
}

function approvalInput(preview, extra = {}) {
  return { explicitApproval: true, riskAccepted: true, approvedBy: "phase370-local-user", reason: "phase370 explicit one-time approval", enduranceReportChecksum: preview.enduranceReportChecksum, planChecksum: preview.planChecksum, ...extra };
}

function callMemoryCenterApi(method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    const res = {
      statusCode: 200,
      writeHead(status) { this.statusCode = status; },
      end(payload) {
        try { resolve({ status: this.statusCode, data: JSON.parse(String(payload || "{}")) }); }
        catch (error) { reject(error); }
      },
    };
    const handled = center.handleMemoryCenterApi(pathname, req, res, { query: {} });
    if (!handled) return reject(new Error(`Memory Center route not handled: ${pathname}`));
    if (method === "POST") {
      req.emit("data", Buffer.from(JSON.stringify(body || {})));
      req.emit("end");
    }
  });
}

if (mode === "prepare") {
  const snapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  equal(snapshot.status, "ok", "fake Codex runtime should be available");
  equal(snapshot.semanticVersion, "9.9.9", "fake Codex semantic version should be stable");
  commitSourceWave("wave-a", "2026-07-16T01:00:00.000Z", snapshot);
  commitSourceWave("wave-b", "2026-07-16T02:00:00.000Z", snapshot);
  const report = endurance.auditLiveProviderMemoryEndurance();
  equal(report.gatePassed, true, "source endurance report should pass");
  const preview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(preview.approvable, true, "matching runtime and endurance plan should be approvable");
  equal(preview.runtimeMatches, true, "runtime identity should match signed child evidence");
  equal(preview.liveExecutionAuthorized, false, "preview must not authorize execution");
  equal(preview.plan.providerVersions[0], "9.9.9", "plan should bind semantic version");
  equal(preview.plan.providerRuntimeIdentityChecksums[0], snapshot.executableIdentityChecksum, "plan should bind executable identity");
  const apiPreview = await callMemoryCenterApi("GET", "/api/memory-center/live-endurance-wave-approval");
  equal(apiPreview.status, 200, "Memory Center approval preview route should respond");
  equal(apiPreview.data.preview.approvable, true, "Memory Center GET should expose approvable plan without creating a receipt");
  let missingExplicitRejected = false;
  try { approval.createLiveProviderMemoryWaveApproval({ ...approvalInput(preview), explicitApproval: false }); } catch { missingExplicitRejected = true; }
  equal(missingExplicitRejected, true, "receipt creation should require explicit approval");
  let wrongPlanRejected = false;
  try { approval.createLiveProviderMemoryWaveApproval({ ...approvalInput(preview), planChecksum: "0".repeat(64) }); } catch { wrongPlanRejected = true; }
  equal(wrongPlanRejected, true, "receipt creation should bind exact plan checksum");

  const apiApproval = await callMemoryCenterApi("POST", "/api/memory-center/live-endurance-wave-approval", approvalInput(preview));
  equal(apiApproval.status, 200, "Memory Center explicit approval route should create a receipt");
  const successReceipt = apiApproval.data.receipt;
  equal(approval.verifyLiveProviderMemoryWaveApprovalReceipt(successReceipt).valid, true, "HMAC approval receipt should verify");
  equal(successReceipt.singleUse, true, "approval should be single use");
  equal(successReceipt.schedulerCreated, false, "scheduler must not create approval receipts");
  let duplicateRejected = false;
  try { approval.createLiveProviderMemoryWaveApproval(approvalInput(preview)); } catch { duplicateRejected = true; }
  equal(duplicateRejected, true, "same plan should not receive two active approvals");
  const completed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: successReceipt.receiptId, receiptChecksum: successReceipt.receiptChecksum, explicitExecution: true, executionActor: "phase370-local-user" }, plan => commitExecutionReport(plan, "success"));
  equal(completed.status, "completed", "valid approved wave should complete");
  equal(completed.wavePassed, true, "valid approved wave should pass");
  equal(completed.consumed, true, "completed receipt should remain consumed");
  let replayRejected = false;
  try { approval.executeApprovedLiveProviderMemoryWave({ receiptId: successReceipt.receiptId, receiptChecksum: successReceipt.receiptChecksum, explicitExecution: true }, plan => commitExecutionReport(plan, "replay")); } catch { replayRejected = true; }
  equal(replayRejected, true, "consumed receipt replay should fail closed");

  const failurePreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  const failureReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(failurePreview));
  const failed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: failureReceipt.receiptId, receiptChecksum: failureReceipt.receiptChecksum, explicitExecution: true }, plan => commitExecutionReport(plan, "wrong-model", { model: "wrong-model" }));
  equal(failed.status, "execution_failed", "mismatched execution report should fail");
  equal(failed.consumed, true, "failed execution should still consume approval");
  ok(failed.executionIssues.includes("execution_model_mismatch"), "failed execution should preserve mismatch reason");

  const revokePreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  const revokeReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(revokePreview));
  const apiRevocation = await callMemoryCenterApi("POST", "/api/memory-center/live-endurance-wave-approval", { action: "revoke", explicitRevocation: true, revokedBy: "phase370-local-user", reason: "phase370 explicit revocation", receiptId: revokeReceipt.receiptId, receiptChecksum: revokeReceipt.receiptChecksum });
  equal(apiRevocation.status, 200, "Memory Center explicit revocation route should respond");
  equal(apiRevocation.data.receipt.status, "revoked", "revocation should seal receipt revoked");
  equal(apiRevocation.data.receipt.consumed, true, "revoked receipt should be consumed");
  let revokedReplayRejected = false;
  try { approval.executeApprovedLiveProviderMemoryWave({ receiptId: revokeReceipt.receiptId, receiptChecksum: apiRevocation.data.receipt.receiptChecksum, explicitExecution: true }, plan => commitExecutionReport(plan, "revoked-replay")); } catch { revokedReplayRejected = true; }
  equal(revokedReplayRejected, true, "revoked receipt should never execute");

  const expiredReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, { atMs: Date.now() - 120_000, ttlMs: 60_000 }));
  const expiredVerification = approval.verifyLiveProviderMemoryWaveApprovalReceipt(expiredReceipt, { atMs: Date.now() });
  equal(expiredVerification.valid, false, "expired approval should fail verification");
  ok(expiredVerification.issues.includes("approval_expired"), "expired approval should expose expiry reason");
  const tamperedReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview));
  const tamperedFile = path.join(approvalDir, `${tamperedReceipt.receiptId}.json`);
  const tampered = JSON.parse(fs.readFileSync(tamperedFile, "utf8"));
  tampered.plan.groups += 1;
  fs.writeFileSync(tamperedFile, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");
  const tamperedInventory = approval.reconcileLiveProviderMemoryWaveApprovals();
  ok(tamperedInventory.invalidCount >= 1, "tampered receipt should enter invalid inventory");

  const staleReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview));
  endurance.auditLiveProviderMemoryEndurance();
  let staleRejected = false;
  try { approval.claimLiveProviderMemoryWaveApproval({ receiptId: staleReceipt.receiptId, receiptChecksum: staleReceipt.receiptChecksum, explicitExecution: true }); } catch { staleRejected = true; }
  equal(staleRejected, true, "new endurance generation should stale the old approval");
  const currentPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  const driftReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(currentPreview));
  fs.writeFileSync(codexFile, process.platform === "win32" ? "@echo off\r\necho codex-cli 10.0.0\r\n" : "#!/bin/sh\necho codex-cli 10.0.0\n", { encoding: "utf8", mode: 0o700 });
  const driftPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(driftPreview.runtimeMatches, false, "changed Provider version should break runtime binding");
  equal(driftPreview.approvable, false, "version drift should disable approval");
  let driftRejected = false;
  try { approval.claimLiveProviderMemoryWaveApproval({ receiptId: driftReceipt.receiptId, receiptChecksum: driftReceipt.receiptChecksum, explicitExecution: true }); } catch { driftRejected = true; }
  equal(driftRejected, true, "version-drifted receipt should fail before claim");
  fs.writeFileSync(codexFile, process.platform === "win32" ? "@echo off\r\necho codex-cli 9.9.9\r\n" : "#!/bin/sh\necho codex-cli 9.9.9\n", { encoding: "utf8", mode: 0o700 });
  const restoredPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(restoredPreview.approvable, false, "restored version text must not bypass changed executable identity");
  const restoredSnapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  commitSourceWave("wave-c-reproof", "2026-07-16T03:00:00.000Z", restoredSnapshot);
  endurance.auditLiveProviderMemoryEndurance();
  const reprovedPreview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(reprovedPreview.approvable, true, "new signed wave should reprove the restored executable identity");
  ok(reprovedPreview.plan.providerRuntimeIdentityChecksums.includes(restoredSnapshot.executableIdentityChecksum), "reproved plan should bind the new executable identity");
  const crashReceipt = approval.createLiveProviderMemoryWaveApproval(approvalInput(reprovedPreview));
  const claimed = approval.claimLiveProviderMemoryWaveApproval({ receiptId: crashReceipt.receiptId, receiptChecksum: crashReceipt.receiptChecksum, explicitExecution: true, executionActor: "phase370-crash-worker" });
  equal(claimed.status, "claimed", "crash fixture should durably claim receipt");
  equal(claimed.consumed, true, "claimed crash fixture should be single-use immediately");
  fs.writeFileSync(stateFile, `${JSON.stringify({ claimedReceiptId: claimed.receiptId, claimedReceiptChecksum: claimed.receiptChecksum, claimedAt: claimed.consumedAt, completedReceiptId: completed.receiptId }, null, 2)}\n`, "utf8");
  console.log(`PHASE370_prepare=${JSON.stringify({ checks, claimedReceiptId: claimed.receiptId })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const claimedMs = Date.parse(state.claimedAt);
  const inventory = approval.reconcileLiveProviderMemoryWaveApprovals({ nowMs: claimedMs + 11 * 60_000, claimStaleMs: 10 * 60_000 });
  const interrupted = inventory.rows.find(row => row.receiptId === state.claimedReceiptId);
  equal(interrupted.status, "interrupted", "stale claimed execution should be sealed interrupted on restart");
  equal(interrupted.consumed, true, "interrupted approval should remain consumed");
  equal(inventory.claimedCount, 0, "restart should leave no stale claimed approvals");
  ok(inventory.completedCount >= 1, "restart inventory should preserve completed wave");
  ok(inventory.failedCount >= 2, "restart inventory should include failed and interrupted waves");
  ok(inventory.invalidCount >= 1, "restart inventory should retain tampered receipt diagnostics");
  let interruptedReplayRejected = false;
  try { approval.executeApprovedLiveProviderMemoryWave({ receiptId: state.claimedReceiptId, receiptChecksum: state.claimedReceiptChecksum, explicitExecution: true }, plan => commitExecutionReport(plan, "interrupted-replay")); } catch { interruptedReplayRejected = true; }
  equal(interruptedReplayRejected, true, "interrupted receipt replay should fail closed");
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase370-wave-a-1" });
  equal(memoryCenter.overall.liveProviderMemoryWaveApprovable, true, "Memory Center should expose current approvable plan");
  ok(memoryCenter.overall.liveProviderMemoryWaveCompletedCount >= 1, "Memory Center should expose completed approved waves");
  ok(memoryCenter.overall.liveProviderMemoryWaveFailedCount >= 2, "Memory Center should expose failed/interrupted waves");
  ok(memoryCenter.overall.liveProviderMemoryWaveInvalidApprovalCount >= 1, "Memory Center should expose invalid approval receipts");
  equal(memoryCenter.liveProviderMemoryWaveApprovalPreview.liveExecutionAuthorized, false, "Memory Center preview should never authorize execution");
  equal(memoryCenter.liveProviderMemoryWaveApprovalPreview.receiptCreated, false, "Memory Center read should not create a receipt");
  equal(memoryCenter.liveProviderMemoryWaveApprovalInventory.count, inventory.count, "Memory Center inventory should match durable receipt inventory");
  const secretFile = path.join(home, ".cc-connect", "reliability", ".live-provider-memory-wave-approval-secret");
  ok(/^[a-f0-9]{64}$/.test(fs.readFileSync(secretFile, "utf8").trim()), "approval HMAC secret should be durable and private-shaped");
  console.log(`PHASE370_restart=${JSON.stringify({ checks, approvals: inventory.count })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 370 mode: ${mode}`);
