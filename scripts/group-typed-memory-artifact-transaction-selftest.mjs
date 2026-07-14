import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerMode = process.argv.includes("--worker");
const workerInput = process.env.PHASE273_WORKER_INPUT ? JSON.parse(process.env.PHASE273_WORKER_INPUT) : null;

function contextInput(scope, marker) {
  return {
    rows: [{
      groupId: scope,
      work_item_id: marker,
      worker_context_packet_id: `packet-${marker}`,
      source: "worker_context_packet_context_usage_repair",
      status: "pending",
      usage_status: "critical",
      pressure: 97,
      total_tokens: 9700,
      max_tokens: 10000,
      free_tokens: 300,
      autocompact_buffer_tokens: 1200,
      reason: `Context usage budget requires compact for ${marker}`,
    }],
  };
}

function ptlInput(scope, marker) {
  return {
    hint: {
      groupId: scope,
      hint_id: `hint-${marker}`,
      engaged: true,
      emergency_level: "critical",
      reason: `Repeated compact failure for ${marker}`,
      blocked_outcome_count: 1,
      repeated_failed_categories: [`category-${marker}`],
    },
    outcomes: [{
      groupId: scope,
      outcome_id: `outcome-${marker}`,
      assignment_id: marker,
      status: "blocked",
      dispatch_ready: false,
      task_compacted: true,
      partial_compaction_categories: [`category-${marker}`],
    }],
  };
}

if (workerMode) {
  process.env.USERPROFILE = workerInput.tempRoot;
  process.env.HOME = workerInput.tempRoot;
  const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
  const options = {
    reason: workerInput.reason || `phase273-${workerInput.action}`,
    transactionMaxWaitMs: 15_000,
    __artifactDiagnosticHoldAfterApplyCount: Number(workerInput.holdAfter || 0),
    __artifactDiagnosticHoldMs: Number(workerInput.holdMs || 0),
  };
  const result = workerInput.action === "context"
    ? typed.distillContextUsageRepairToTypedMemory(workerInput.scope, contextInput(workerInput.scope, workerInput.marker), options)
    : typed.distillPtlEmergencyDowngradeToTypedMemory(workerInput.scope, ptlInput(workerInput.scope, workerInput.marker), options);
  process.stdout.write(`${JSON.stringify({ pass: true, result })}\n`);
  process.exit(0);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase273-artifact-transaction-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const scopeNormal = `group-phase273-normal-${nonce}--gcs_phase273_normal_${nonce}`;
const scopeRollback = `group-phase273-rollback-${nonce}--gcs_phase273_rollback_${nonce}`;
const scopeRollforward = `group-phase273-rollforward-${nonce}--gcs_phase273_rollforward_${nonce}`;
const scopeStartup = `group-phase273-startup-${nonce}--gcs_phase273_startup_${nonce}`;
const scopeReadBarrier = `group-phase273-read-${nonce}--gcs_phase273_read_${nonce}`;
const scopeFailure = `group-phase273-failure-${nonce}--gcs_phase273_failure_${nonce}`;
const scopeCorrupt = `group-phase273-corrupt-${nonce}--gcs_phase273_corrupt_${nonce}`;
const scopes = [scopeNormal, scopeRollback, scopeRollforward, scopeStartup, scopeReadBarrier, scopeFailure, scopeCorrupt];

function spawnWorker(input) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker"], {
    cwd: root,
    env: { ...process.env, PHASE273_WORKER_INPUT: JSON.stringify({ tempRoot, ...input }) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const completed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
        resolve({ child, code, signal, stdout, stderr, value: JSON.parse(lines.at(-1)) });
      } else {
        reject(Object.assign(new Error(`worker_failed:${code}:${signal}:${stderr || stdout}`), { child, code, signal, stdout, stderr }));
      }
    });
  });
  return { child, completed };
}

async function waitForPrepared(scope, predicate, timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const inspected = typed.inspectGroupTypedMemoryArtifactTransaction(scope);
    if (inspected.valid && inspected.journal?.status === "prepared" && predicate(inspected.journal)) return inspected.journal;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`prepared_artifact_journal_not_observed:${scope}`);
}

function readLedger(scope) {
  return typed.readGroupTypedMemoryDistillationLedger(scope);
}

function readIndex(scope) {
  try { return fs.readFileSync(typed.getGroupTypedMemoryIndexFile(scope), "utf8"); } catch { return ""; }
}

function topicFile(scope, name) {
  return path.join(typed.getGroupTypedMemoryDir(scope), name);
}

function artifactRecovery(result) {
  return result.value.result.distillationMutation?.artifactRecovery || {};
}

try {
  const normal = typed.distillContextUsageRepairToTypedMemory(scopeNormal, contextInput(scopeNormal, "normal-context"), { reason: "phase273-normal" });
  const normalReceipt = normal.distillationMutation?.artifactTransaction || {};
  const normalJournal = typed.inspectGroupTypedMemoryArtifactTransaction(scopeNormal);
  assert.equal(normalJournal.valid, true);
  assert.equal(normalJournal.journal.status, "committed");
  assert.deepEqual(normalReceipt.targets, [
    "worker-context-usage-pressure-discipline.md",
    "MEMORY.md",
    ".distillation-ledger.json",
  ]);
  assert.equal(fs.existsSync(typed.getGroupTypedMemoryArtifactTransactionStageRoot(scopeNormal)), false);
  assert.match(readIndex(scopeNormal), /worker-context-usage-pressure-discipline\.md/);

  const rollbackOwner = spawnWorker({ action: "context", scope: scopeRollback, marker: "rollback-context", holdAfter: 1, holdMs: 15_000 });
  const rollbackJournal = await waitForPrepared(scopeRollback, journal => {
    const first = [...journal.artifacts].sort((a, b) => a.commitOrder - b.commitOrder)[0];
    return fs.existsSync(topicFile(scopeRollback, first.target)) && !fs.existsSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeRollback));
  });
  const rollbackExit = rollbackOwner.completed.catch(error => error);
  rollbackOwner.child.kill("SIGKILL");
  await rollbackExit;
  assert.equal(rollbackJournal.artifacts.at(-1).target, ".distillation-ledger.json");
  const rollbackRecoveryWorker = spawnWorker({ action: "ptl", scope: scopeRollback, marker: "rollback-recovery" });
  const rollbackRecovery = await rollbackRecoveryWorker.completed;
  assert.equal(artifactRecovery(rollbackRecovery).action, "rollback_before_uncommitted_ledger_fence");
  const rollbackLedger = readLedger(scopeRollback);
  assert.equal(rollbackLedger.contextUsageRepairArchive, undefined);
  assert.ok(rollbackLedger.ptlEmergencyArchive);
  assert.equal(fs.existsSync(topicFile(scopeRollback, "worker-context-usage-pressure-discipline.md")), false);
  assert.equal(fs.existsSync(topicFile(scopeRollback, "worker-context-ptl-emergency-downgrade.md")), true);
  assert.doesNotMatch(readIndex(scopeRollback), /worker-context-usage-pressure-discipline\.md/);
  assert.match(readIndex(scopeRollback), /worker-context-ptl-emergency-downgrade\.md/);

  const rollforwardOwner = spawnWorker({ action: "context", scope: scopeRollforward, marker: "rollforward-context", holdAfter: 3, holdMs: 15_000 });
  const rollforwardJournal = await waitForPrepared(scopeRollforward, journal => {
    let ledger = {};
    try { ledger = JSON.parse(fs.readFileSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeRollforward), "utf8")); } catch {}
    return Number(ledger.distillationMutation?.fencingToken || 0) === Number(journal.fencingToken || 0)
      && String(ledger.distillationMutation?.leaseId || "") === String(journal.leaseId || "");
  });
  const rollforwardExit = rollforwardOwner.completed.catch(error => error);
  rollforwardOwner.child.kill("SIGKILL");
  await rollforwardExit;
  assert.equal(rollforwardJournal.artifactCount, 3);
  const rollforwardRecoveryWorker = spawnWorker({ action: "ptl", scope: scopeRollforward, marker: "rollforward-recovery" });
  const rollforwardRecovery = await rollforwardRecoveryWorker.completed;
  assert.equal(artifactRecovery(rollforwardRecovery).action, "rollforward_from_committed_ledger_fence");
  const rollforwardLedger = readLedger(scopeRollforward);
  assert.ok(rollforwardLedger.contextUsageRepairArchive);
  assert.ok(rollforwardLedger.ptlEmergencyArchive);
  assert.equal(fs.existsSync(topicFile(scopeRollforward, "worker-context-usage-pressure-discipline.md")), true);
  assert.equal(fs.existsSync(topicFile(scopeRollforward, "worker-context-ptl-emergency-downgrade.md")), true);
  assert.match(readIndex(scopeRollforward), /worker-context-usage-pressure-discipline\.md/);
  assert.match(readIndex(scopeRollforward), /worker-context-ptl-emergency-downgrade\.md/);

  const startupOwner = spawnWorker({ action: "context", scope: scopeStartup, marker: "startup-context", holdAfter: 1, holdMs: 15_000 });
  await waitForPrepared(scopeStartup, journal => fs.existsSync(topicFile(scopeStartup, journal.artifacts[0].target))
    && !fs.existsSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeStartup)));
  const startupExit = startupOwner.completed.catch(error => error);
  startupOwner.child.kill("SIGKILL");
  await startupExit;
  const startupFleet = typed.recoverGroupTypedMemoryArtifactTransactionsFleet();
  const startupRow = startupFleet.rows.find(row => row.groupId === scopeStartup);
  assert.equal(startupRow?.status, "recovered");
  assert.equal(startupRow?.action, "rollback_before_uncommitted_ledger_fence");
  assert.equal(fs.existsSync(topicFile(scopeStartup, "worker-context-usage-pressure-discipline.md")), false);
  assert.equal(fs.existsSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeStartup)), false);

  const readBarrierOwner = spawnWorker({ action: "context", scope: scopeReadBarrier, marker: "read-barrier-context", holdAfter: 1, holdMs: 15_000 });
  await waitForPrepared(scopeReadBarrier, journal => fs.existsSync(topicFile(scopeReadBarrier, journal.artifacts[0].target))
    && !fs.existsSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeReadBarrier)));
  const readBarrierExit = readBarrierOwner.completed.catch(error => error);
  readBarrierOwner.child.kill("SIGKILL");
  await readBarrierExit;
  const readBarrierDocs = typed.scanGroupTypedMemoryDocuments(scopeReadBarrier);
  const readBarrierJournal = typed.inspectGroupTypedMemoryArtifactTransaction(scopeReadBarrier);
  assert.equal(readBarrierDocs.length, 0);
  assert.equal(readBarrierJournal.journal.status, "recovered_rollback");
  assert.equal(readBarrierJournal.journal.recoveryAction, "rollback_before_uncommitted_ledger_fence");
  assert.equal(fs.existsSync(topicFile(scopeReadBarrier, "worker-context-usage-pressure-discipline.md")), false);

  assert.throws(() => typed.distillContextUsageRepairToTypedMemory(scopeFailure, contextInput(scopeFailure, "failure-context"), {
    reason: "phase273-in-process-failure",
    __artifactDiagnosticFailAfterApplyCount: 1,
  }), /diagnostic_artifact_commit_failure_after_1/);
  const failureJournal = typed.inspectGroupTypedMemoryArtifactTransaction(scopeFailure);
  assert.equal(failureJournal.valid, true);
  assert.equal(failureJournal.journal.status, "recovered_rollback");
  assert.equal(fs.existsSync(topicFile(scopeFailure, "worker-context-usage-pressure-discipline.md")), false);
  assert.equal(fs.existsSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeFailure)), false);
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeFailure).present, false);

  const corruptBaseline = typed.distillContextUsageRepairToTypedMemory(scopeCorrupt, contextInput(scopeCorrupt, "corrupt-baseline"), {
    reason: "phase273-corrupt-baseline",
  });
  const corruptBaselineFence = Number(corruptBaseline.distillationMutation?.fencingToken || 0);
  const corruptOwner = spawnWorker({ action: "context", scope: scopeCorrupt, marker: "corrupt-context", holdAfter: 1, holdMs: 15_000 });
  const corruptJournal = await waitForPrepared(scopeCorrupt, journal => {
    try { return fs.readFileSync(topicFile(scopeCorrupt, journal.artifacts[0].target), "utf8").includes("corrupt-context"); } catch { return false; }
  });
  const corruptExit = corruptOwner.completed.catch(error => error);
  corruptOwner.child.kill("SIGKILL");
  await corruptExit;
  const corruptStageDir = path.join(typed.getGroupTypedMemoryArtifactTransactionStageRoot(scopeCorrupt), corruptJournal.leaseId);
  assert.ok(corruptJournal.artifacts[0].beforeStage);
  fs.writeFileSync(path.join(corruptStageDir, corruptJournal.artifacts[0].beforeStage), "tampered-stage", "utf8");
  const corruptRecoveryWorker = spawnWorker({ action: "ptl", scope: scopeCorrupt, marker: "corrupt-recovery" });
  const corruptFailure = await corruptRecoveryWorker.completed.catch(error => error);
  assert.match(String(corruptFailure.message || ""), /typed_memory_artifact_stage_checksum_mismatch/);
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeCorrupt).present, false);
  assert.equal(Number(readLedger(scopeCorrupt).distillationMutation?.fencingToken || 0), corruptBaselineFence);
  assert.equal(readLedger(scopeCorrupt).ptlEmergencyArchive, undefined);

  const checks = {
    normalCommitPublishesTopicIndexAndLedger: normalReceipt.artifactCount === 3,
    normalCommitCleansStage: !fs.existsSync(typed.getGroupTypedMemoryArtifactTransactionStageRoot(scopeNormal)),
    preLedgerCrashRollsBackTopic: !rollbackLedger.contextUsageRepairArchive
      && !fs.existsSync(topicFile(scopeRollback, "worker-context-usage-pressure-discipline.md")),
    rollbackRecoveryCommitsReplacement: !!rollbackLedger.ptlEmergencyArchive,
    committedLedgerCrashRollsForward: !!rollforwardLedger.contextUsageRepairArchive,
    rollforwardRecoveryPreservesAndExtends: !!rollforwardLedger.contextUsageRepairArchive && !!rollforwardLedger.ptlEmergencyArchive,
    recoveredIndexesMatchDocuments: readIndex(scopeRollback).includes("worker-context-ptl-emergency-downgrade.md")
      && readIndex(scopeRollforward).includes("worker-context-usage-pressure-discipline.md")
      && readIndex(scopeRollforward).includes("worker-context-ptl-emergency-downgrade.md"),
    startupFleetRecoversBeforeRecall: startupRow?.action === "rollback_before_uncommitted_ledger_fence"
      && !fs.existsSync(topicFile(scopeStartup, "worker-context-usage-pressure-discipline.md")),
    readBarrierRecoversBeforeChildContext: readBarrierDocs.length === 0
      && readBarrierJournal.journal.recoveryAction === "rollback_before_uncommitted_ledger_fence",
    inProcessFailureRollsBack: failureJournal.journal.status === "recovered_rollback",
    failedMutationReleasesLease: !typed.inspectGroupTypedMemoryDistillationLock(scopeFailure).present,
    corruptStageFailsClosed: String(corruptFailure.message || "").includes("typed_memory_artifact_stage_checksum_mismatch"),
    corruptRecoveryDoesNotInventLedgerCommit: Number(readLedger(scopeCorrupt).distillationMutation?.fencingToken || 0) === corruptBaselineFence
      && !readLedger(scopeCorrupt).ptlEmergencyArchive,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase273-typed-memory-artifact-transaction-selftest-v1",
    checks,
    rollback: {
      crashedFence: rollbackJournal.fencingToken,
      recoveryAction: artifactRecovery(rollbackRecovery).action,
    },
    rollforward: {
      committedFence: rollforwardJournal.fencingToken,
      recoveryAction: artifactRecovery(rollforwardRecovery).action,
    },
  }, null, 2)}\n`);
} finally {
  for (const scope of scopes) {
    try { fs.rmSync(typed.getGroupTypedMemoryDir(scope), { recursive: true, force: true }); } catch {}
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
