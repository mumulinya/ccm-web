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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE371_${stage}=`));
  if (!line) throw new Error(`Phase 371 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-wave-approval-retention-"));
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const codexFile = process.platform === "win32" ? path.join(bin, "codex.cmd") : path.join(bin, "codex");
  fs.writeFileSync(codexFile, process.platform === "win32" ? "@echo off\r\necho codex-cli 9.9.9\r\n" : "#!/bin/sh\necho codex-cli 9.9.9\n", { encoding: "utf8", mode: 0o700 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, PATH: `${bin}${path.delimiter}${process.env.PATH || ""}`, PHASE371_HOME: home };
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

const home = process.env.PHASE371_HOME;
if (!home) throw new Error("PHASE371_HOME is required");
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const reliabilityDir = path.join(home, ".cc-connect", "reliability");
const approvalDir = path.join(reliabilityDir, "live-provider-memory-wave-approvals");
const auditFile = path.join(reliabilityDir, "live-provider-memory-wave-approval-retention-audit.jsonl");
const secretFile = path.join(reliabilityDir, ".live-provider-memory-wave-approval-secret");
const stateFile = path.join(home, "phase371-state.json");
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
    const child = signed({
      schema: "ccm-live-provider-native-memory-soak-report-v2",
      version: 2,
      runId: `${runId}-child-${index + 1}`,
      generatedAt,
      accountBacked: true,
      groupId: `phase371-${runId}-${index + 1}`,
      groupSessionId: `gcs_phase371_${runId}_${index + 1}`,
      providers: [{ provider: "codex", version: snapshot.semanticVersion, model: "phase371-model", providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum, status: "passed", issue: "", workspaceUnchanged: true, receiptRecovery: { status: "recovered", suppressTaskReplay: false } }],
    });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId: child.groupId, groupSessionId: child.groupSessionId, status: "passed", issues: [], durationMs: 55_000 + index * 1_000, childReportChecksum: child.reportChecksum, receiptValid: true });
  }
  const source = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId, generatedAt, accountBacked: true, provider: "codex", model: "phase371-model", requestedGroupCount: 2, concurrency: 1, isolationValid: true, groups });
  store.commitLiveProviderMemorySoakReport(source, { kind: "multi" });
}

function approvalInput(preview, atMs) {
  return { explicitApproval: true, riskAccepted: true, approvedBy: "phase371-local-user", reason: "phase371-sensitive-reason-must-not-enter-audit", enduranceReportChecksum: preview.enduranceReportChecksum, planChecksum: preview.planChecksum, atMs };
}

function commitExecutionReport(plan, generatedAt) {
  const groups = Array.from({ length: plan.groups }, (_, index) => ({
    groupId: `${plan.groupPrefix}-phase371-${index + 1}`,
    groupSessionId: `gcs_phase371_execution_${index + 1}`,
    status: "passed",
    issues: [],
    childReportChecksum: digest(`phase371-execution-child:${index}`),
    receiptValid: true,
  }));
  const report = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: "phase371-execution", generatedAt, accountBacked: false, provider: plan.provider, model: plan.model, requestedGroupCount: plan.groups, concurrency: plan.concurrency, isolationValid: true, passedCount: plan.groups, failedCount: 0, groups });
  const reportFile = store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return { exitCode: 0, reportFile, reportChecksum: report.reportChecksum };
}

function callApi(method, pathname, body = null) {
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
    if (!center.handleMemoryCenterApi(pathname, req, res, { query: {} })) return reject(new Error(`route not handled:${pathname}`));
    if (method === "POST") {
      req.emit("data", Buffer.from(JSON.stringify(body || {})));
      req.emit("end");
    }
  });
}

const dayMs = 24 * 60 * 60_000;
const nowMs = Date.now();
const policy = { nowMs, retentionDays: 10, minimumRetained: 3, maximumReceipts: 5, graceHours: 0, claimStaleMs: dayMs };

if (mode === "prepare") {
  const snapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  equal(snapshot.status, "ok", "fake Codex runtime should be available");
  equal(snapshot.semanticVersion, "9.9.9", "fake Codex version should be stable");
  commitSourceWave("wave-a", new Date(nowMs - 3 * dayMs).toISOString(), snapshot);
  commitSourceWave("wave-b", new Date(nowMs - 2 * dayMs).toISOString(), snapshot);
  const enduranceReport = endurance.auditLiveProviderMemoryEndurance();
  equal(enduranceReport.gatePassed, true, "endurance source should pass");
  const preview = approval.buildLiveProviderMemoryWaveApprovalPreview();
  equal(preview.approvable, true, "current endurance plan should be approvable");

  const historical = [];
  for (let index = 0; index < 7; index += 1) {
    const atMs = nowMs - (40 + index) * dayMs;
    const created = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, atMs));
    const revoked = approval.revokeLiveProviderMemoryWaveApproval({ explicitRevocation: true, receiptId: created.receiptId, receiptChecksum: created.receiptChecksum, revokedBy: "phase371-local-user", reason: "phase371-private-revocation", atMs: atMs + 60_000 });
    historical.push({ receiptId: revoked.receiptId, file: path.join(approvalDir, `${revoked.receiptId}.json`) });
  }
  const tampered = historical.pop();
  const tamperedReceipt = JSON.parse(fs.readFileSync(tampered.file, "utf8"));
  tamperedReceipt.approvedBy = "tampered-actor";
  fs.writeFileSync(tampered.file, `${JSON.stringify(tamperedReceipt, null, 2)}\n`, "utf8");

  const expiredCreated = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, nowMs - 20 * dayMs));
  const executionCreated = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, nowMs - 2_000));
  const executionReceipt = approval.executeApprovedLiveProviderMemoryWave({ explicitExecution: true, receiptId: executionCreated.receiptId, receiptChecksum: executionCreated.receiptChecksum, executionActor: "phase371-local-user", atMs: nowMs - 1_000 }, plan => commitExecutionReport(plan, new Date(nowMs - 20 * dayMs).toISOString()));
  equal(executionReceipt.status, "completed", "execution receipt should be terminal and valid");
  const claimedCreated = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, nowMs));
  const claimed = approval.claimLiveProviderMemoryWaveApproval({ explicitExecution: true, receiptId: claimedCreated.receiptId, receiptChecksum: claimedCreated.receiptChecksum, executionActor: "phase371-local-user", atMs: nowMs });
  const active = approval.createLiveProviderMemoryWaveApproval(approvalInput(preview, nowMs));

  const dry = approval.reconcileLiveProviderMemoryWaveApprovals({ ...policy, maintenance: true, dryRun: true });
  equal(dry.count, 11, "inventory should include every managed approval receipt");
  equal(dry.invalidCount, 1, "tampered receipt should fail closed");
  equal(dry.expiredCount, 1, "past active receipt should be durably sealed expired");
  equal(dry.approvedCount, 1, "current active approval should remain active");
  equal(dry.claimedCount, 1, "current claimed approval should remain claimed");
  equal(dry.terminalCount, 8, "valid terminal inventory should exclude tampered receipt");
  equal(dry.prunableCount, 5, "five old terminal receipts should be candidates after minimum retention");
  equal(dry.prunedCount, 0, "dry-run should not remove receipts");
  ok(dry.rows.find(row => row.receiptId === active.receiptId)?.protectedBy === "active_or_claimed", "active approval should be explicitly protected");
  ok(dry.rows.find(row => row.receiptId === claimed.receiptId)?.protectedBy === "active_or_claimed", "claimed approval should be explicitly protected");
  ok(dry.rows.some(row => row.status === "invalid" && row.protectedBy === "invalid_fail_closed"), "tampered receipt should be retained for review");
  ok(fs.existsSync(path.join(approvalDir, `${expiredCreated.receiptId}.json.bak`)), "expiry sealing should use durable atomic replacement");

  const reportInventory = retention.buildLiveProviderMemorySoakRetentionInventory({ nowMs, singleRetentionDays: 1, multiRetentionDays: 1, fleetRetentionDays: 1, enduranceRetentionDays: 1, graceHours: 0, minimumSingleReports: 0, minimumMultiReports: 0, minimumFleetReports: 0, minimumEnduranceReports: 0, maximumSingleReports: 0, maximumMultiReports: 0, maximumFleetReports: 0, maximumEnduranceReports: 0 });
  equal(reportInventory.summary.approvalReferencedEnduranceCount, 1, "retained approvals should protect exact endurance report");
  equal(reportInventory.summary.approvalReferencedMultiCount, 1, "execution receipt should protect exact execution multi report");
  ok(reportInventory.rows.some(row => row.reportChecksum === executionReceipt.executionReportChecksum && row.protectedBy === "approval_execution_receipt"), "execution report protection reason should be explicit");
  ok(reportInventory.rows.some(row => row.reportChecksum === preview.enduranceReportChecksum && row.protectedBy === "approval_receipt"), "endurance report protection reason should be explicit");

  const apiDry = await callApi("POST", "/api/memory-center/live-endurance-wave-approval-retention", { reason: "phase371-api-dry-run" });
  equal(apiDry.status, 200, "Memory Center retention dry-run should respond");
  equal(apiDry.data.result.prunableCount, 0, "Memory Center default policy should retain this bounded test inventory");
  const apiRejected = await callApi("POST", "/api/memory-center/live-endurance-wave-approval-retention", { execute: true, explicitPrune: false });
  equal(apiRejected.status, 400, "Memory Center destructive retention should require explicit confirmation");

  const candidateFiles = dry.rows.filter(row => row.prunable).map(row => row.file);
  const executed = approval.reconcileLiveProviderMemoryWaveApprovals({ ...policy, maintenance: true, prune: true, dryRun: false });
  equal(executed.prunedCount, 5, "explicit maintenance should prune every stable terminal candidate");
  equal(executed.skippedCount, 0, "stable candidates should not be skipped");
  for (const file of candidateFiles) {
    equal(fs.existsSync(file), false, `${path.basename(file)} should be removed`);
    equal(fs.existsSync(`${file}.bak`), false, `${path.basename(file)} backup should be removed`);
  }
  for (const receipt of [active, claimed, executionReceipt]) ok(fs.existsSync(path.join(approvalDir, `${receipt.receiptId}.json`)), `${receipt.status} receipt should remain`);
  ok(fs.existsSync(tampered.file), "tampered receipt should remain fail closed");
  ok(fs.existsSync(secretFile), "private HMAC secret should never be pruned");
  const zeroFloor = approval.reconcileLiveProviderMemoryWaveApprovals({ ...policy, minimumRetained: 0, maximumReceipts: 0, maintenance: true, dryRun: true });
  equal(zeroFloor.prunableCount, 3, "explicit zero minimum and maximum should not fall back to defaults");

  const lowerEvidenceFiles = [
    path.join(home, ".cc-connect", "memory-context-consumption-receipts", "mcrc_phase371.json"),
    path.join(home, ".cc-connect", "memory-context-consumption-recoveries", "mcr_phase371.json"),
    path.join(home, ".cc-connect", "task-agent-continuation-soak", "phase371.jsonl"),
  ];
  for (const file of lowerEvidenceFiles) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "lower-level evidence remains\n", "utf8"); }
  fs.writeFileSync(stateFile, `${JSON.stringify({ policy, activeId: active.receiptId, claimedId: claimed.receiptId, executionId: executionReceipt.receiptId, tamperedFile: tampered.file, lowerEvidenceFiles }, null, 2)}\n`, "utf8");
  console.log(`PHASE371_prepare=${JSON.stringify({ checks, pruned: executed.prunedCount, retained: executed.count - executed.prunedCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = approval.reconcileLiveProviderMemoryWaveApprovals({ ...state.policy, maintenance: true, dryRun: true });
  equal(inventory.count, 6, "restart should retain bounded terminal, active, claimed, and invalid receipts");
  equal(inventory.prunableCount, 0, "restart should not recreate already-pruned candidates");
  equal(inventory.approvedCount, 1, "restart should preserve active approval");
  equal(inventory.claimedCount, 1, "restart should preserve non-stale claimed approval");
  equal(inventory.invalidCount, 1, "restart should preserve tampered receipt for review");
  for (const receiptId of [state.activeId, state.claimedId, state.executionId]) ok(fs.existsSync(path.join(approvalDir, `${receiptId}.json`)), `${receiptId} should survive restart`);
  ok(fs.existsSync(state.tamperedFile), "tampered receipt should survive restart");
  for (const file of state.lowerEvidenceFiles) ok(fs.existsSync(file), "lower-level memory evidence should remain untouched");
  const repeat = approval.reconcileLiveProviderMemoryWaveApprovals({ ...state.policy, maintenance: true, prune: true, dryRun: false });
  equal(repeat.prunedCount, 0, "repeat explicit cleanup should be idempotent");
  equal(repeat.skippedCount, 0, "idempotent cleanup should not skip files");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase371-wave-a-1" });
  equal(report.overall.liveProviderMemoryWaveExpiredCount, 1, "Memory Center should expose expired approval count");
  equal(report.overall.liveProviderMemoryWaveTerminalCount, 3, "Memory Center should expose retained terminal approval count");
  equal(report.overall.liveProviderMemoryWavePrunableCount, 0, "Memory Center should expose no remaining candidates");
  equal(report.overall.liveProviderMemoryWaveInvalidApprovalCount, 1, "Memory Center should expose invalid approval count");
  equal(report.overall.liveProviderReportRetentionApprovalReferencedEnduranceCount, 1, "Memory Center should expose approval-protected endurance report");
  equal(report.overall.liveProviderReportRetentionApprovalReferencedMultiCount, 1, "Memory Center should expose approval-protected execution report");
  const audits = fs.readFileSync(auditFile, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  ok(audits.length >= 5, "dry-run, API preview, execute, restart, and idempotent audits should persist");
  ok(audits.every(row => row.schema === "ccm-live-provider-memory-wave-approval-retention-audit-v1"), "approval retention audit schema should remain stable");
  ok(audits.every(row => !JSON.stringify(row).includes("sensitive-reason") && !JSON.stringify(row).includes("private-revocation")), "approval retention audits should remain body-free");
  console.log(`PHASE371_restart=${JSON.stringify({ checks, retained: inventory.count, audits: audits.length })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 371 mode:${mode}`);
