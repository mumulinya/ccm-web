import assert from "node:assert/strict";
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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE361_STAGE_${stage}=`));
  if (!line) throw new Error(`phase361 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-recovery-retention-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE361_HOME: tempRoot };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE361_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE361_HOME;
if (!tempRoot) throw new Error("PHASE361_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const receipts = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const recovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const internalRuntime = require(path.join(root, "ccm-package", "dist", "integrations", "internal-mcp-runtime.js"));
const native = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase361-state.json");
const snapshotRoot = path.join(tempRoot, ".cc-connect", "task-agent-memory-context-snapshots");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function createFixture(suffix, options = {}) {
  const groupId = options.groupId || "phase361-group-a";
  const groupSessionId = options.groupSessionId || "gcs_phase361_a";
  const taskId = options.taskId || `phase361-task-${suffix}`;
  const project = options.project || `phase361-project-${suffix}`;
  const opened = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "claudecode" });
  const challenge = receipts.createMemoryContextConsumptionChallenge({ groupId, groupSessionId, taskId, executionId: taskId, project, taskAgentSessionId: opened.id, attempt: 1 });
  const fixture = { suffix, groupId, groupSessionId, taskId, project, opened, challenge };
  if (options.snapshot !== false) fixture.snapshotFile = writeSnapshot(fixture);
  return fixture;
}

function writeSnapshot(item) {
  const dir = path.join(snapshotRoot, item.opened.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `tams_phase361_${item.suffix}.json`);
  fs.writeFileSync(file, `${JSON.stringify({
    schema: "ccm-task-agent-memory-context-snapshot-v1",
    snapshot_id: `tams_phase361_${item.suffix}`,
    generated_at: new Date().toISOString(),
    session: { id: item.opened.id, group_id: item.groupId, task_id: item.taskId, project: item.project },
    context: {
      execution_id: item.taskId,
      group_session_memory_binding: { groupSessionId: item.groupSessionId },
      memory_context_consumption_receipt_required: true,
      memory_context_consumption_challenge: item.challenge,
    },
  }, null, 2)}\n`, "utf8");
  return file;
}

function parentEvidence(item) {
  return native.buildNativeSessionContinuationEvidence({
    provider: "claudecode",
    runnerRequestId: `runner-phase361-${item.suffix}`,
    requestedNativeSessionId: `native-phase361-${item.suffix}`,
    nativeResumeRequested: false,
    runnerSuccess: true,
  });
}

function recordReceipt(item) {
  return receipts.recordMemoryContextConsumptionReceipt({
    taskId: item.taskId,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    project: item.project,
    role: "project-child-agent",
    agentType: "claudecode",
    taskAgentSessionId: item.opened.id,
    nativeSessionId: `native-phase361-${item.suffix}`,
    memoryReceiptChallenge: item.challenge,
    memoryReceiptFile: receipts.memoryContextConsumptionReceiptFile(item.challenge.challenge_id),
  }, { challenge_id: item.challenge.challenge_id });
}

async function createRecovered(item) {
  const evidence = parentEvidence(item);
  return recovery.recoverMemoryContextConsumptionReceipt({
    challenge: item.challenge,
    provider: "claudecode",
    runnerRequestId: `runner-phase361-${item.suffix}`,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    taskId: item.taskId,
    executionId: item.taskId,
    project: item.project,
    taskAgentSessionId: item.opened.id,
    nativeContinuationEvidence: evidence,
    providerWorkCompleted: true,
  }, async () => {
    recordReceipt(item);
    return { success: true, exitCode: 0, output: "CCM_MEMORY_ACK_RECOVERED" };
  });
}

async function createBlocked(item) {
  return recovery.recoverMemoryContextConsumptionReceipt({
    challenge: item.challenge,
    provider: "claudecode",
    runnerRequestId: `runner-phase361-${item.suffix}`,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    taskId: item.taskId,
    executionId: item.taskId,
    project: item.project,
    taskAgentSessionId: item.opened.id,
    nativeContinuationEvidence: null,
    providerWorkCompleted: true,
  }, async () => { throw new Error("must not execute"); });
}

function recoveryFile(item) {
  return path.join(recovery.memoryContextConsumptionRecoveryDirectory(), `${item.challenge.challenge_id}.json`);
}

function rewriteRecovery(item, patch, mtime) {
  const file = recoveryFile(item);
  const current = JSON.parse(fs.readFileSync(file, "utf8"));
  const unsigned = { ...current, ...patch };
  delete unsigned.recovery_signature;
  delete unsigned.file;
  const next = { ...unsigned, recovery_signature: internalRuntime.signInternalMcpEvidence(unsigned) };
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  if (mtime) fs.utimesSync(file, mtime, mtime);
  return next;
}

if (mode === "prepare") {
  const nowMs = Date.now();
  const old40d = new Date(nowMs - 40 * 86_400_000);
  const old2d = new Date(nowMs - 2 * 86_400_000);
  const old2h = new Date(nowMs - 2 * 3_600_000);

  const referencedRecovered = createFixture("referenced-recovered");
  const referencedRecoveredResult = await createRecovered(referencedRecovered);
  fs.utimesSync(recoveryFile(referencedRecovered), old40d, old40d);

  const orphanRecovered = createFixture("orphan-recovered", { snapshot: false });
  await createRecovered(orphanRecovered);
  fs.utimesSync(recoveryFile(orphanRecovered), old40d, old40d);

  const freshBlocked = createFixture("fresh-blocked", { snapshot: false });
  await createBlocked(freshBlocked);

  const referencedRunning = createFixture("referenced-running");
  await createBlocked(referencedRunning);
  rewriteRecovery(referencedRunning, { status: "running", completed_at: "", started_at: old2d.toISOString(), issues: ["receipt_missing"] }, old2d);

  const referencedRunningWithReceipt = createFixture("running-with-receipt");
  await createBlocked(referencedRunningWithReceipt);
  recordReceipt(referencedRunningWithReceipt);
  rewriteRecovery(referencedRunningWithReceipt, { status: "running", completed_at: "", started_at: old2d.toISOString(), issues: ["receipt_missing"] }, old2d);

  const orphanRunning = createFixture("orphan-running", { snapshot: false });
  await createBlocked(orphanRunning);
  rewriteRecovery(orphanRunning, { status: "running", completed_at: "", started_at: old2d.toISOString(), issues: ["receipt_missing"] }, old2d);

  const overflowBlocked = createFixture("overflow-blocked", { snapshot: false });
  await createBlocked(overflowBlocked);
  fs.utimesSync(recoveryFile(overflowBlocked), old2h, old2h);

  const initial = recovery.reconcileMemoryContextConsumptionRecoveries({ nowMs, retentionDays: 30, maxOrphanRecoveries: 1, graceHours: 1, interruptedAfterMinutes: 10 });
  equal(initial.summary.referencedCount, 3, "three recovery records should remain snapshot referenced");
  equal(initial.summary.orphanCount, 4, "unreferenced recovery records should be classified as orphans");
  ok(initial.summary.prunableCount >= 2, "terminal stale and overflow recovery records should become candidates before running-state reconciliation");
  equal(initial.rows.find(row => row.challengeId === referencedRecovered.challenge.challenge_id).prunable, false, "old referenced recovery must never be prunable");
  equal(initial.rows.find(row => row.challengeId === referencedRunning.challenge.challenge_id).interruptedCandidate, true, "stale running recovery should be detected");

  const corruptDir = path.join(snapshotRoot, "tas_phase361_corrupt");
  fs.mkdirSync(corruptDir, { recursive: true });
  const corruptSnapshot = path.join(corruptDir, "tams_corrupt.json");
  fs.writeFileSync(corruptSnapshot, "{broken", "utf8");
  const blockedPrune = recovery.reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true, nowMs, retentionDays: 30, maxOrphanRecoveries: 1, graceHours: 1, interruptedAfterMinutes: 10 });
  equal(blockedPrune.pruningBlocked, true, "unreadable snapshot should block orphan recovery cleanup");
  equal(blockedPrune.summary.prunedCount, 0, "fail-closed cleanup must preserve recovery records");
  ok(fs.existsSync(recoveryFile(orphanRecovered)), "blocked cleanup should preserve stale orphan recovery");
  fs.rmSync(corruptSnapshot, { force: true });
  fs.rmdirSync(corruptDir);

  const reconciled = recovery.reconcileMemoryContextConsumptionRecoveries({ prune: false, reconcileInterrupted: true, nowMs, retentionDays: 30, maxOrphanRecoveries: 1, graceHours: 1, interruptedAfterMinutes: 10 });
  equal(reconciled.rows.find(row => row.challengeId === referencedRunning.challenge.challenge_id).status, "interrupted", "stale referenced run should be sealed as interrupted");
  const receiptInterruptedRow = reconciled.rows.find(row => row.challengeId === referencedRunningWithReceipt.challenge.challenge_id);
  equal(receiptInterruptedRow.status, "interrupted", "receipt-present crash should still be interrupted");
  ok(receiptInterruptedRow.issues.includes("interrupted_receipt_present_without_continuation_commit"), "receipt alone must not fabricate continuation proof");

  const pruned = recovery.reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true, nowMs, retentionDays: 30, maxOrphanRecoveries: 1, graceHours: 1, interruptedAfterMinutes: 10 });
  ok(pruned.summary.prunedCount >= 2, "terminal stale and overflow orphan recovery records should be pruned");
  equal(fs.existsSync(recoveryFile(orphanRecovered)), false, "stale orphan recovery should be removed");
  equal(fs.existsSync(recoveryFile(orphanRunning)), true, "newly sealed interrupted orphan should receive a fresh audit retention window");
  equal(fs.existsSync(recoveryFile(overflowBlocked)), false, "overflow orphan past grace should be removed");
  equal(fs.existsSync(recoveryFile(freshBlocked)), true, "fresh orphan should remain inside grace and capacity");
  equal(fs.existsSync(recoveryFile(referencedRecovered)), true, "referenced recovered proof must be preserved despite age");

  const sibling = createFixture("sibling", { groupId: "phase361-group-b", groupSessionId: "gcs_phase361_b" });
  await createBlocked(sibling);
  const groupA = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: "phase361-group-a" });
  ok(groupA.rows.every(row => row.groupId === "phase361-group-a"), "group inventory must exclude sibling recoveries");
  equal(groupA.rows.some(row => row.groupId === "phase361-group-b"), false, "sibling identity must remain isolated");

  const purgeFixture = createFixture("purge", { groupId: "phase361-group-purge", groupSessionId: "gcs_phase361_purge", taskId: "phase361-purge-task" });
  await createBlocked(purgeFixture);
  ok(fs.existsSync(recoveryFile(purgeFixture)), "purge recovery fixture should exist");
  sessions.purgeTaskAgentSessions("phase361-purge-task");
  equal(fs.existsSync(recoveryFile(purgeFixture)), false, "task-session purge should remove unreferenced recovery ledger");
  equal(fs.existsSync(recoveryFile(sibling)), true, "purge must preserve sibling-group recovery ledger");

  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase361-group-a" });
  ok(report.overall.modelMemoryReceiptRecoveryInterruptedCount >= 2, "Memory Center should expose interrupted recoveries");
  equal(report.overall.modelMemoryReceiptRecoveryPrunableCount, 0, "post-prune group report should have no prunable referenced rows");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  const centerSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf8");
  ok(serverSource.includes("reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true })"), "server startup must reconcile and retain recovery ledger");
  ok(centerSource.includes("reconcile_memory_context_consumption_recoveries"), "Memory Center must expose audited recovery-ledger maintenance");
  equal(recovery.verifyMemoryContextConsumptionRecovery(referencedRecoveredResult.record).valid, true, "referenced recovered proof should remain cryptographically valid");

  fs.writeFileSync(stateFile, `${JSON.stringify({
    referencedRecovered: { challengeId: referencedRecovered.challenge.challenge_id, groupId: referencedRecovered.groupId },
    referencedRunning: { challengeId: referencedRunning.challenge.challenge_id },
    referencedRunningWithReceipt: { challengeId: referencedRunningWithReceipt.challenge.challenge_id },
    sibling: { challengeId: sibling.challenge.challenge_id, groupId: sibling.groupId },
  }, null, 2)}\n`, "utf8");
  console.log(`PHASE361_STAGE_prepare=${JSON.stringify({ checks, pruned: pruned.summary.prunedCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = recovery.buildMemoryContextConsumptionRecoveryInventory();
  const recoveredRow = inventory.rows.find(row => row.challengeId === state.referencedRecovered.challengeId);
  ok(recoveredRow, "restart should restore referenced recovered proof");
  equal(recoveredRow.status, "recovered", "recovered status should survive restart");
  equal(recoveredRow.valid, true, "recovered proof and receipt should remain valid");
  equal(recoveredRow.referenced, true, "restart should reconstruct snapshot reference");
  const interruptedRow = inventory.rows.find(row => row.challengeId === state.referencedRunning.challengeId);
  equal(interruptedRow.status, "interrupted", "interrupted state should survive restart");
  equal(interruptedRow.suppressTaskReplay, true, "interrupted recovery must preserve replay suppression");
  const receiptInterrupted = inventory.rows.find(row => row.challengeId === state.referencedRunningWithReceipt.challengeId);
  ok(receiptInterrupted.issues.includes("interrupted_receipt_present_without_continuation_commit"), "restart must not promote receipt-only interrupted state");
  const siblingOnly = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: state.sibling.groupId });
  equal(siblingOnly.rows.length, 1, "sibling group should expose only its own recovery row");
  equal(siblingOnly.rows[0].challengeId, state.sibling.challengeId, "sibling recovery identity should remain exact");
  const startupRepeat = recovery.reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true });
  equal(startupRepeat.summary.prunedCount, 0, "restart reconciliation should be idempotent");
  console.log(`PHASE361_STAGE_restart=${JSON.stringify({ checks, summary: inventory.summary })}`);
  process.exit(0);
}

throw new Error(`unknown phase361 mode: ${mode}`);
