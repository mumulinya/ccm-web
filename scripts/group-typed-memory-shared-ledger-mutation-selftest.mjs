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
const workerInput = process.env.PHASE272_WORKER_INPUT ? JSON.parse(process.env.PHASE272_WORKER_INPUT) : null;

if (workerMode) {
  process.env.USERPROFILE = workerInput.tempRoot;
  process.env.HOME = workerInput.tempRoot;
  const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
  const options = {
    reason: workerInput.reason || `phase272-${workerInput.action}`,
    transactionMaxWaitMs: 15_000,
    __mutationDiagnosticHoldMs: Number(workerInput.holdMs || 0),
    __transactionDiagnosticHoldMs: Number(workerInput.holdMs || 0),
  };
  let result;
  if (workerInput.action === "context") {
    result = typed.distillContextUsageRepairToTypedMemory(workerInput.scope, {
      rows: [{
        groupId: workerInput.scope,
        work_item_id: workerInput.marker,
        worker_context_packet_id: `packet-${workerInput.marker}`,
        source: "worker_context_packet_context_usage_repair",
        status: "pending",
        usage_status: "critical",
        pressure: 96,
        total_tokens: 9600,
        max_tokens: 10000,
        free_tokens: 400,
        autocompact_buffer_tokens: 1200,
        reason: `Context usage budget requires compact for ${workerInput.marker}`,
      }],
    }, options);
  } else if (workerInput.action === "ptl") {
    result = typed.distillPtlEmergencyDowngradeToTypedMemory(workerInput.scope, {
      hint: {
        groupId: workerInput.scope,
        hint_id: `hint-${workerInput.marker}`,
        engaged: true,
        emergency_level: "critical",
        reason: `Repeated compact failure for ${workerInput.marker}`,
        blocked_outcome_count: 1,
        repeated_failed_categories: [`category-${workerInput.marker}`],
      },
      outcomes: [{
        groupId: workerInput.scope,
        outcome_id: `outcome-${workerInput.marker}`,
        assignment_id: workerInput.marker,
        status: "blocked",
        dispatch_ready: false,
        task_compacted: true,
        partial_compaction_categories: [`category-${workerInput.marker}`],
      }],
    }, options);
  } else if (workerInput.action === "direct") {
    const action = typed.buildGroupDirectMemoryAction(workerInput.scope, {
      action: "remember",
      messageId: workerInput.marker,
      content: workerInput.text,
    });
    result = typed.distillGroupMessagesToTypedMemory(workerInput.scope, [{
      id: workerInput.marker,
      role: "user",
      content: workerInput.text,
      timestamp: new Date().toISOString(),
      memory_direct_action: action,
    }], {}, options);
  } else {
    throw new Error(`unsupported_worker_action:${workerInput.action}`);
  }
  process.stdout.write(`${JSON.stringify({ pass: true, action: workerInput.action, result })}\n`);
  process.exit(0);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase272-shared-ledger-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const scopeArchives = `group-phase272-archives-${nonce}--gcs_phase272_archives_${nonce}`;
const scopeMixed = `group-phase272-mixed-${nonce}--gcs_phase272_mixed_${nonce}`;
const scopeCrash = `group-phase272-crash-${nonce}--gcs_phase272_crash_${nonce}`;
const scopeParallelA = `group-phase272-parallel-a-${nonce}--gcs_phase272_parallel_a_${nonce}`;
const scopeParallelB = `group-phase272-parallel-b-${nonce}--gcs_phase272_parallel_b_${nonce}`;
const scopes = [scopeArchives, scopeMixed, scopeCrash, scopeParallelA, scopeParallelB];

function spawnWorker(input) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker"], {
    cwd: root,
    env: { ...process.env, PHASE272_WORKER_INPUT: JSON.stringify({ tempRoot, ...input }) },
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
        resolve({ child, code, signal, stdout, stderr, value: JSON.parse(lines.at(-1)), completedAtMs: Date.now() });
      } else {
        reject(Object.assign(new Error(`worker_failed:${code}:${signal}:${stderr || stdout}`), { child, code, signal, stdout, stderr }));
      }
    });
  });
  return { child, completed };
}

async function waitForLock(scope, ownerPid, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = typed.inspectGroupTypedMemoryDistillationLock(scope);
    if (status.present && Number(status.lock?.ownerPid || 0) === ownerPid) return status;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`lock_not_observed:${scope}:${ownerPid}`);
}

function mutationOf(workerResult) {
  return workerResult.value.result.distillationMutation || workerResult.value.result.transaction || {};
}

function allFacts(ledger) {
  return Object.values(ledger.facts || {}).flatMap(bucket => Object.values(bucket || {}));
}

function assertLedgerStateBinding(scope, expectedKind) {
  const ledger = typed.readGroupTypedMemoryDistillationLedger(scope);
  const state = typed.readGroupTypedMemoryDistillationTransactionState(scope);
  assert.equal(state.valid, true);
  assert.equal(state.state.status, "completed");
  assert.equal(state.state.mutationKind, expectedKind);
  assert.equal(Number(state.state.fencingToken || 0), Number(ledger.distillationMutation?.fencingToken || 0));
  assert.equal(String(state.state.leaseId || ""), String(ledger.distillationMutation?.leaseId || ""));
  return { ledger, state };
}

try {
  const archiveA = spawnWorker({ action: "context", scope: scopeArchives, marker: "archive-context", holdMs: 900 });
  await waitForLock(scopeArchives, archiveA.child.pid);
  const archiveB = spawnWorker({ action: "ptl", scope: scopeArchives, marker: "archive-ptl" });
  const [archiveResultA, archiveResultB] = await Promise.all([archiveA.completed, archiveB.completed]);
  const archiveMutationA = mutationOf(archiveResultA);
  const archiveMutationB = mutationOf(archiveResultB);
  const archiveBinding = assertLedgerStateBinding(scopeArchives, "ptl_emergency_downgrade");
  assert.ok(Number(archiveMutationB.waitedMs || 0) > 0);
  assert.ok(Number(archiveMutationB.fencingToken || 0) > Number(archiveMutationA.fencingToken || 0));
  assert.equal(archiveBinding.ledger.contextUsageRepairArchive?.rows?.some(row => row.work_item_id === "archive-context"), true);
  assert.equal(archiveBinding.ledger.ptlEmergencyArchive?.rows?.some(row => row.assignment_id === "archive-ptl"), true);

  const directText = "Always preserve PHASE272_DIRECT_SENTINEL for this exact group session.";
  const mixedA = spawnWorker({ action: "direct", scope: scopeMixed, marker: "mixed-direct", text: directText, holdMs: 900 });
  await waitForLock(scopeMixed, mixedA.child.pid);
  const mixedB = spawnWorker({ action: "context", scope: scopeMixed, marker: "mixed-context" });
  const [mixedResultA, mixedResultB] = await Promise.all([mixedA.completed, mixedB.completed]);
  const mixedMutationA = mutationOf(mixedResultA);
  const mixedMutationB = mutationOf(mixedResultB);
  const mixedBinding = assertLedgerStateBinding(scopeMixed, "context_usage_repair");
  assert.ok(Number(mixedMutationB.waitedMs || 0) > 0);
  assert.ok(Number(mixedMutationB.fencingToken || 0) > Number(mixedMutationA.fencingToken || 0));
  assert.equal(allFacts(mixedBinding.ledger).some(fact => fact.text === directText), true);
  assert.equal(mixedBinding.ledger.contextUsageRepairArchive?.rows?.some(row => row.work_item_id === "mixed-context"), true);

  const crashOwner = spawnWorker({ action: "context", scope: scopeCrash, marker: "crashed-context", holdMs: 10_000 });
  const crashLock = await waitForLock(scopeCrash, crashOwner.child.pid);
  const crashExit = crashOwner.completed.catch(error => error);
  crashOwner.child.kill("SIGKILL");
  await crashExit;
  const abandoned = typed.inspectGroupTypedMemoryDistillationLock(scopeCrash);
  assert.equal(abandoned.present, true);
  assert.equal(abandoned.stale, true);
  const recovered = spawnWorker({ action: "ptl", scope: scopeCrash, marker: "recovered-ptl" });
  const recoveredResult = await recovered.completed;
  const recoveredMutation = mutationOf(recoveredResult);
  const crashBinding = assertLedgerStateBinding(scopeCrash, "ptl_emergency_downgrade");
  assert.ok(Number(recoveredMutation.fencingToken || 0) > Number(crashLock.lock.fencingToken || 0));
  assert.ok(Number(recoveredMutation.recoveredLeaseCount || 0) >= 1);
  assert.equal(crashBinding.ledger.contextUsageRepairArchive?.rows?.some(row => row.work_item_id === "crashed-context") ?? false, false);
  assert.equal(crashBinding.ledger.ptlEmergencyArchive?.rows?.some(row => row.assignment_id === "recovered-ptl"), true);

  const parallelA = spawnWorker({ action: "context", scope: scopeParallelA, marker: "parallel-a", holdMs: 1500 });
  await waitForLock(scopeParallelA, parallelA.child.pid);
  const parallelB = spawnWorker({ action: "ptl", scope: scopeParallelB, marker: "parallel-b" });
  const parallelResultB = await parallelB.completed;
  const parallelResultA = await parallelA.completed;
  const parallelMutationB = mutationOf(parallelResultB);
  assert.equal(Number(parallelMutationB.waitedMs || 0), 0);
  assert.ok(parallelResultB.completedAtMs <= parallelResultA.completedAtMs);
  assert.equal(typed.readGroupTypedMemoryDistillationLedger(scopeParallelA).contextUsageRepairArchive?.rows?.some(row => row.work_item_id === "parallel-a"), true);
  assert.equal(typed.readGroupTypedMemoryDistillationLedger(scopeParallelB).ptlEmergencyArchive?.rows?.some(row => row.assignment_id === "parallel-b"), true);

  const nested = typed.runGroupTypedMemoryDistillationMutationCoordinatorSelfTest();
  assert.equal(nested.pass, true);
  const checks = {
    archiveWritersSerialize: Number(archiveMutationB.waitedMs || 0) > 0,
    archiveWriterFenceIncreases: Number(archiveMutationB.fencingToken || 0) > Number(archiveMutationA.fencingToken || 0),
    archiveKeysSurviveConcurrentMutation: !!archiveBinding.ledger.contextUsageRepairArchive && !!archiveBinding.ledger.ptlEmergencyArchive,
    archiveCommitBindsState: archiveBinding.state.state.mutationKind === archiveBinding.ledger.distillationMutation?.mutationKind,
    groupLogAndArchiveSerialize: Number(mixedMutationB.waitedMs || 0) > 0,
    groupLogFactAndArchiveBothSurvive: allFacts(mixedBinding.ledger).some(fact => fact.text === directText) && !!mixedBinding.ledger.contextUsageRepairArchive,
    mixedWriterFenceIncreases: Number(mixedMutationB.fencingToken || 0) > Number(mixedMutationA.fencingToken || 0),
    deadArchiveOwnerIsStale: abandoned.stale === true,
    archiveCrashRecoveryRaisesFence: Number(recoveredMutation.fencingToken || 0) > Number(crashLock.lock.fencingToken || 0),
    crashedArchiveDoesNotCommit: !crashBinding.ledger.contextUsageRepairArchive,
    recoveredArchiveCommits: !!crashBinding.ledger.ptlEmergencyArchive,
    differentScopesDoNotWait: Number(parallelMutationB.waitedMs || 0) === 0,
    differentScopesRunInParallel: parallelResultB.completedAtMs <= parallelResultA.completedAtMs,
    reentrantCoordinatorReusesLease: nested.checks.nestedCallReusesLease === true,
    uncoordinatedLedgerWriteFailsClosed: nested.checks.uncoordinatedWriteFailsClosed === true,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase272-shared-ledger-mutation-selftest-v1",
    checks,
    contention: {
      archiveFirstFence: archiveMutationA.fencingToken,
      archiveSecondFence: archiveMutationB.fencingToken,
      archiveSecondWaitedMs: archiveMutationB.waitedMs,
      mixedFirstFence: mixedMutationA.fencingToken,
      mixedSecondFence: mixedMutationB.fencingToken,
      mixedSecondWaitedMs: mixedMutationB.waitedMs,
    },
    crashRecovery: {
      abandonedFence: crashLock.lock.fencingToken,
      recoveredFence: recoveredMutation.fencingToken,
      recoveredLeaseCount: recoveredMutation.recoveredLeaseCount,
    },
  }, null, 2)}\n`);
} finally {
  for (const scope of scopes) {
    try { fs.rmSync(typed.getGroupTypedMemoryDir(scope), { recursive: true, force: true }); } catch {}
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
