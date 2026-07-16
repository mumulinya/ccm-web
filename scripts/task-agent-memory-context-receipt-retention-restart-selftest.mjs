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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE359_STAGE_${stage}=`));
  if (!line) throw new Error(`phase359 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-receipt-retention-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE359_HOME: tempRoot };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE359_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE359_HOME;
if (!tempRoot) throw new Error("PHASE359_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const receipts = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase359-state.json");
const snapshotRoot = path.join(tempRoot, ".cc-connect", "task-agent-memory-context-snapshots");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function createChallenge(suffix, overrides = {}) {
  return receipts.createMemoryContextConsumptionChallenge({
    groupId: overrides.groupId || "phase359-group-a",
    groupSessionId: overrides.groupSessionId || "gcs_phase359_a",
    taskId: overrides.taskId || `phase359-task-${suffix}`,
    executionId: overrides.executionId || `phase359-exec-${suffix}`,
    project: overrides.project || `phase359-project-${suffix}`,
    taskAgentSessionId: overrides.taskAgentSessionId || `tas_phase359_${suffix}`,
    attempt: 1,
  });
}

function recordReceipt(challenge, overrides = {}) {
  return receipts.recordMemoryContextConsumptionReceipt({
    taskId: challenge.task_id,
    groupId: challenge.group_id,
    groupSessionId: challenge.group_session_id,
    project: challenge.project,
    role: "project-child-agent",
    agentType: "claudecode",
    taskAgentSessionId: challenge.task_agent_session_id,
    nativeSessionId: `native-${challenge.challenge_id}`,
    memoryReceiptChallenge: challenge,
    memoryReceiptFile: receipts.memoryContextConsumptionReceiptFile(challenge.challenge_id),
    ...overrides,
  }, { challenge_id: challenge.challenge_id });
}

function writeSnapshot(challenge, suffix, rawOverride = null) {
  const dir = path.join(snapshotRoot, challenge.task_agent_session_id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `tams_phase359_${suffix}.json`);
  const snapshot = {
    schema: "ccm-task-agent-memory-context-snapshot-v1",
    snapshot_id: `tams_phase359_${suffix}`,
    generated_at: new Date().toISOString(),
    session: {
      id: challenge.task_agent_session_id,
      group_id: challenge.group_id,
      task_id: challenge.task_id,
      project: challenge.project,
    },
    context: {
      execution_id: challenge.execution_id,
      group_session_memory_binding: { groupSessionId: challenge.group_session_id },
      memory_context_consumption_receipt_required: true,
      memory_context_consumption_challenge: challenge,
    },
  };
  fs.writeFileSync(file, rawOverride === null ? `${JSON.stringify(snapshot, null, 2)}\n` : rawOverride, "utf8");
  return file;
}

if (mode === "prepare") {
  const referencedValid = createChallenge("valid");
  const referencedMissing = createChallenge("missing");
  const referencedInvalid = createChallenge("invalid");
  const siblingValid = createChallenge("sibling", { groupId: "phase359-group-b", groupSessionId: "gcs_phase359_b" });
  const orphanFresh = createChallenge("orphan-fresh");
  const orphanStale = createChallenge("orphan-stale");
  const orphanOverflow = createChallenge("orphan-overflow");
  const validSnapshot = writeSnapshot(referencedValid, "valid");
  writeSnapshot(referencedMissing, "missing");
  writeSnapshot(referencedInvalid, "invalid");
  writeSnapshot(siblingValid, "sibling");
  recordReceipt(referencedValid);
  recordReceipt(referencedInvalid);
  recordReceipt(siblingValid);
  recordReceipt(orphanFresh);
  recordReceipt(orphanStale);
  recordReceipt(orphanOverflow);
  const invalidFile = receipts.memoryContextConsumptionReceiptFile(referencedInvalid.challenge_id);
  const invalidPayload = JSON.parse(fs.readFileSync(invalidFile, "utf8"));
  invalidPayload.project = "tampered-project";
  fs.writeFileSync(invalidFile, `${JSON.stringify(invalidPayload, null, 2)}\n`, "utf8");
  const nowMs = Date.now();
  const oldTime = new Date(nowMs - 10 * 86_400_000);
  const overflowTime = new Date(nowMs - 2 * 3_600_000);
  fs.utimesSync(receipts.memoryContextConsumptionReceiptFile(orphanStale.challenge_id), oldTime, oldTime);
  fs.utimesSync(receipts.memoryContextConsumptionReceiptFile(orphanOverflow.challenge_id), overflowTime, overflowTime);

  const initial = receipts.reconcileMemoryContextConsumptionReceipts({ nowMs, maxOrphanReceipts: 1, orphanRetentionDays: 7, orphanGraceHours: 1 });
  equal(initial.summary.referencedValidCount, 2, "fleet inventory should verify both group receipts");
  equal(initial.summary.referencedMissingCount, 1, "missing referenced receipt should be reported");
  equal(initial.summary.referencedInvalidCount, 1, "tampered referenced receipt should be reported");
  equal(initial.summary.orphanCount, 3, "all unreferenced receipts should be inventoried");
  equal(initial.summary.orphanStaleCount, 1, "stale orphan should be classified");
  ok(initial.summary.prunableCount >= 2, "stale and overflow receipts should become candidates");
  equal(initial.summary.orphanInvalidCount, 0, "valid orphan signatures should remain distinguishable");

  const groupA = receipts.reconcileMemoryContextConsumptionReceipts({ groupId: "phase359-group-a" });
  equal(groupA.summary.referencedChallengeCount, 3, "group filter should include only exact group references");
  equal(groupA.summary.orphanCount, 0, "group report must not expose fleet orphan identities");
  ok(groupA.referencedRows.every(row => row.groupIds.every(groupId => groupId === "phase359-group-a")), "group rows must remain isolated");

  const corruptDir = path.join(snapshotRoot, "tas_phase359_corrupt");
  fs.mkdirSync(corruptDir, { recursive: true });
  const corruptFile = path.join(corruptDir, "tams_corrupt.json");
  fs.writeFileSync(corruptFile, "{broken-json", "utf8");
  const blocked = receipts.reconcileMemoryContextConsumptionReceipts({ prune: true, nowMs, maxOrphanReceipts: 1, orphanRetentionDays: 7, orphanGraceHours: 1 });
  equal(blocked.pruningBlocked, true, "unreadable snapshot without recoverable id should fail closed");
  equal(blocked.summary.prunedCount, 0, "fail-closed reconciliation must not delete orphan receipts");
  ok(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(orphanStale.challenge_id)), "blocked pruning should preserve stale orphan");
  fs.rmSync(corruptFile, { force: true });
  fs.rmdirSync(corruptDir);

  const pruned = receipts.reconcileMemoryContextConsumptionReceipts({ prune: true, nowMs, maxOrphanReceipts: 1, orphanRetentionDays: 7, orphanGraceHours: 1 });
  ok(pruned.summary.prunedCount >= 2, "reconciliation should prune stale and overflow receipts");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(orphanStale.challenge_id)), false, "stale orphan should be removed");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(orphanOverflow.challenge_id)), false, "overflow orphan past grace should be removed");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(orphanFresh.challenge_id)), true, "fresh orphan should survive grace policy");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(referencedInvalid.challenge_id)), true, "tampered but referenced receipt must never be auto-deleted");
  const preserved = receipts.removeMemoryContextConsumptionReceiptIfUnreferenced(referencedValid.challenge_id);
  equal(preserved.removed, false, "direct cleanup must preserve a referenced receipt");
  equal(preserved.reason, "snapshot_still_references_receipt", "preservation reason should be explicit");

  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase359-group-a" });
  equal(report.overall.modelMemoryReceiptReferencedValidCount, 1, "Memory Center should expose exact-group valid receipts");
  equal(report.overall.modelMemoryReceiptReferencedMissingCount, 1, "Memory Center should expose missing receipts");
  equal(report.overall.modelMemoryReceiptReferencedInvalidCount, 1, "Memory Center should expose tampered receipts");
  equal(report.modelMemoryReceiptLifecycle.summary.orphanCount, 0, "Memory Center group diagnostics should be body-free across groups");

  const source = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  ok(source.includes("reconcileMemoryContextConsumptionReceipts({ prune: true })"), "server startup must reconcile receipt lifecycle");
  const centerSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf8");
  ok(centerSource.includes("reconcile_memory_context_consumption_receipts"), "Memory Center should expose an audited maintenance operation");

  fs.writeFileSync(stateFile, `${JSON.stringify({
    referencedValid,
    referencedInvalid,
    siblingValid,
    orphanFresh,
    validSnapshot,
  }, null, 2)}\n`, "utf8");
  console.log(`PHASE359_STAGE_prepare=${JSON.stringify({ checks, validSnapshot })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const recovered = receipts.reconcileMemoryContextConsumptionReceipts({ maxOrphanReceipts: 10 });
  equal(recovered.summary.referencedValidCount, 2, "restart should recover exact referenced receipt state");
  equal(recovered.summary.referencedMissingCount, 1, "restart should preserve missing classification");
  equal(recovered.summary.referencedInvalidCount, 1, "restart should preserve tamper classification");
  equal(recovered.summary.orphanFreshCount, 1, "fresh orphan should remain visible after restart");
  equal(recovered.summary.prunableCount, 0, "fresh orphan should not be pruned after restart");

  fs.rmSync(state.validSnapshot, { force: true });
  const removed = receipts.removeMemoryContextConsumptionReceiptIfUnreferenced(state.referencedValid.challenge_id);
  equal(removed.removed, true, "receipt should be removed after its final snapshot reference disappears");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(state.referencedValid.challenge_id)), false, "removed receipt file should be absent");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(state.siblingValid.challenge_id)), true, "sibling-group receipt must remain untouched");

  const opened = sessions.openTaskAgentSession({
    scopeId: "phase359-purge-task",
    taskId: "phase359-purge-task",
    groupId: "phase359-group-purge",
    project: "phase359-project-purge",
    agentType: "claudecode",
  });
  const purgeChallenge = createChallenge("purge", {
    groupId: "phase359-group-purge",
    groupSessionId: "gcs_phase359_purge",
    taskId: "phase359-purge-task",
    executionId: "phase359-purge-exec",
    project: "phase359-project-purge",
    taskAgentSessionId: opened.id,
  });
  writeSnapshot(purgeChallenge, "purge");
  recordReceipt(purgeChallenge);
  ok(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(purgeChallenge.challenge_id)), "purge fixture receipt should exist");
  const purgedSessions = sessions.purgeTaskAgentSessions("phase359-purge-task");
  equal(purgedSessions.length, 1, "task-session purge should remove its session");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(purgeChallenge.challenge_id)), false, "task-session purge should remove its unreferenced model receipt");
  equal(fs.existsSync(receipts.memoryContextConsumptionReceiptFile(state.siblingValid.challenge_id)), true, "task-session purge must preserve another group receipt");

  const finalInventory = receipts.reconcileMemoryContextConsumptionReceipts({ groupId: "phase359-group-b" });
  equal(finalInventory.summary.referencedValidCount, 1, "sibling group should remain valid after cleanup");
  equal(finalInventory.referencedRows.length, 1, "sibling group diagnostics should remain exact-session scoped");
  console.log(`PHASE359_STAGE_restart=${JSON.stringify({ checks, finalSummary: finalInventory.summary })}`);
  process.exit(0);
}

throw new Error(`unknown phase359 mode: ${mode}`);
