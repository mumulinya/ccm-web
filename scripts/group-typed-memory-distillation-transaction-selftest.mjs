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
const workerInput = process.env.PHASE271_WORKER_INPUT ? JSON.parse(process.env.PHASE271_WORKER_INPUT) : null;

if (workerMode) {
  process.env.USERPROFILE = workerInput.tempRoot;
  process.env.HOME = workerInput.tempRoot;
  const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
  const action = typed.buildGroupDirectMemoryAction(workerInput.scope, {
    action: "remember",
    messageId: workerInput.messageId,
    content: workerInput.text,
  });
  const message = {
    id: workerInput.messageId,
    role: "user",
    content: workerInput.text,
    timestamp: new Date().toISOString(),
    memory_direct_action: action,
  };
  const result = typed.distillGroupMessagesToTypedMemory(workerInput.scope, [message], {}, {
    reason: workerInput.reason || "phase271-worker",
    transactionMaxWaitMs: 15_000,
    __transactionDiagnosticHoldMs: Number(workerInput.holdMs || 0),
  });
  process.stdout.write(`${JSON.stringify({
    pass: true,
    transaction: result.transaction,
    requestId: action.requestId,
    directMemory: result.directMemory,
  })}\n`);
  process.exit(0);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase271-distillation-transaction-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const scopeConcurrent = `group-phase271-concurrent-${nonce}--gcs_phase271_concurrent_${nonce}`;
const scopeCrash = `group-phase271-crash-${nonce}--gcs_phase271_crash_${nonce}`;
const scopeFailure = `group-phase271-failure-${nonce}--gcs_phase271_failure_${nonce}`;
const scopeCorrupt = `group-phase271-corrupt-${nonce}--gcs_phase271_corrupt_${nonce}`;

function spawnWorker(input) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker"], {
    cwd: root,
    env: { ...process.env, PHASE271_WORKER_INPUT: JSON.stringify({ tempRoot, ...input }) },
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
  return { child, completed, stdout: () => stdout, stderr: () => stderr };
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

function directMessage(scope, messageId, text) {
  const action = typed.buildGroupDirectMemoryAction(scope, { action: "remember", messageId, content: text });
  return { id: messageId, role: "user", content: text, timestamp: new Date().toISOString(), memory_direct_action: action };
}

function allFacts(ledger) {
  return Object.values(ledger.facts || {}).flatMap(bucket => Object.values(bucket || {}));
}

try {
  const textA = "PHASE271_CONCURRENT_A：当前会话的支付签名规则必须保留。";
  const textB = "PHASE271_CONCURRENT_B：当前会话的幂等规则必须保留。";
  const workerA = spawnWorker({ scope: scopeConcurrent, messageId: "p271-a", text: textA, holdMs: 900, reason: "phase271-concurrent-a" });
  const lockA = await waitForLock(scopeConcurrent, workerA.child.pid);
  const workerB = spawnWorker({ scope: scopeConcurrent, messageId: "p271-b", text: textB, holdMs: 0, reason: "phase271-concurrent-b" });
  const [resultA, resultB] = await Promise.all([workerA.completed, workerB.completed]);
  const ledgerConcurrent = typed.readGroupTypedMemoryDistillationLedger(scopeConcurrent);
  const concurrentFacts = allFacts(ledgerConcurrent);
  assert.equal(concurrentFacts.some(fact => fact.text === textA), true);
  assert.equal(concurrentFacts.some(fact => fact.text === textB), true);
  assert.ok(Number(resultB.value.transaction.waitedMs || 0) > 0);
  assert.ok(Number(resultB.value.transaction.fencingToken || 0) > Number(resultA.value.transaction.fencingToken || 0));
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeConcurrent).present, false);

  const crashText = "PHASE271_CRASH_OWNER_SHOULD_NOT_COMMIT";
  const crashWorker = spawnWorker({ scope: scopeCrash, messageId: "p271-crash", text: crashText, holdMs: 10_000, reason: "phase271-crash-owner" });
  const crashLock = await waitForLock(scopeCrash, crashWorker.child.pid);
  const crashExit = crashWorker.completed.catch(error => error);
  crashWorker.child.kill("SIGKILL");
  await crashExit;
  const abandoned = typed.inspectGroupTypedMemoryDistillationLock(scopeCrash);
  assert.equal(abandoned.present, true);
  assert.equal(abandoned.active, false);
  assert.equal(abandoned.stale, true);
  const recoveryText = "PHASE271_RECOVERED_AFTER_CRASH：恢复后写入必须成功。";
  const recoveryMessage = directMessage(scopeCrash, "p271-recovery", recoveryText);
  const recovered = typed.distillGroupMessagesToTypedMemory(scopeCrash, [recoveryMessage], {}, {
    reason: "phase271-crash-recovery",
    transactionMaxWaitMs: 5000,
  });
  const crashLedger = typed.readGroupTypedMemoryDistillationLedger(scopeCrash);
  assert.ok(Number(recovered.transaction.fencingToken || 0) > Number(crashLock.lock.fencingToken || 0));
  assert.ok(Number(recovered.transaction.recoveredLeaseCount || 0) >= 1);
  assert.equal(allFacts(crashLedger).some(fact => fact.text === recoveryText), true);
  assert.equal(allFacts(crashLedger).some(fact => fact.text === crashText), false);
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeCrash).present, false);

  const failureLedgerFile = typed.getGroupTypedMemoryDistillationLedgerFile(scopeFailure);
  fs.mkdirSync(failureLedgerFile, { recursive: true });
  const failureMessage = directMessage(scopeFailure, "p271-failure", "PHASE271_FAILED_COMMIT_RETRY");
  assert.throws(() => typed.distillGroupMessagesToTypedMemory(scopeFailure, [failureMessage], {}, { reason: "phase271-write-failure" }));
  const failedState = typed.readGroupTypedMemoryDistillationTransactionState(scopeFailure);
  assert.equal(failedState.valid, true);
  assert.equal(failedState.state.status, "failed");
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeFailure).present, false);
  fs.rmSync(failureLedgerFile, { recursive: true, force: true });
  const retried = typed.distillGroupMessagesToTypedMemory(scopeFailure, [failureMessage], {}, { reason: "phase271-write-retry" });
  const completedState = typed.readGroupTypedMemoryDistillationTransactionState(scopeFailure);
  assert.equal(completedState.valid, true);
  assert.equal(completedState.state.status, "completed");
  assert.ok(Number(retried.transaction.fencingToken || 0) > Number(failedState.state.fencingToken || 0));

  const corruptLockFile = typed.getGroupTypedMemoryDistillationLockFile(scopeCorrupt);
  fs.mkdirSync(path.dirname(corruptLockFile), { recursive: true });
  fs.writeFileSync(corruptLockFile, "{corrupt-lock", "utf8");
  const oldTime = new Date(Date.now() - 15_000);
  fs.utimesSync(corruptLockFile, oldTime, oldTime);
  const corruptRecoveryMessage = directMessage(scopeCorrupt, "p271-corrupt-1", "PHASE271_CORRUPT_LOCK_RECOVERY");
  const corruptRecovered = typed.distillGroupMessagesToTypedMemory(scopeCorrupt, [corruptRecoveryMessage], {}, {
    reason: "phase271-corrupt-lock-recovery",
    transactionCorruptGraceMs: 250,
  });
  assert.ok(Number(corruptRecovered.transaction.recoveredLeaseCount || 0) >= 1);
  assert.equal(typed.inspectGroupTypedMemoryDistillationLock(scopeCorrupt).present, false);
  const abandonedArchives = fs.readdirSync(typed.getGroupTypedMemoryDir(scopeCorrupt)).filter(name => name.includes(".distillation-transaction.lock.abandoned."));
  assert.ok(abandonedArchives.length >= 1);

  const stateFile = typed.getGroupTypedMemoryDistillationTransactionStateFile(scopeCorrupt);
  const tamperedState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  tamperedState.stateChecksum = "0".repeat(64);
  fs.writeFileSync(stateFile, JSON.stringify(tamperedState, null, 2), "utf8");
  const postCorruptStateMessage = directMessage(scopeCorrupt, "p271-corrupt-2", "PHASE271_CORRUPT_STATE_RECOVERY");
  const stateRecovered = typed.distillGroupMessagesToTypedMemory(scopeCorrupt, [corruptRecoveryMessage, postCorruptStateMessage], {}, {
    reason: "phase271-corrupt-state-recovery",
  });
  const repairedState = typed.readGroupTypedMemoryDistillationTransactionState(scopeCorrupt);
  assert.equal(repairedState.valid, true);
  assert.ok(Number(stateRecovered.transaction.fencingToken || 0) > Number(corruptRecovered.transaction.fencingToken || 0));

  const checks = {
    concurrentWritersSerialize: Number(resultB.value.transaction.waitedMs || 0) > 0,
    fencingTokensIncreaseAcrossWriters: Number(resultB.value.transaction.fencingToken || 0) > Number(resultA.value.transaction.fencingToken || 0),
    concurrentFactsAreNotLost: concurrentFacts.some(fact => fact.text === textA) && concurrentFacts.some(fact => fact.text === textB),
    lockReleasedAfterSuccess: !typed.inspectGroupTypedMemoryDistillationLock(scopeConcurrent).present,
    deadOwnerIsDetectedAsStale: abandoned.stale === true && abandoned.active === false,
    crashRecoveryRaisesFence: Number(recovered.transaction.fencingToken || 0) > Number(crashLock.lock.fencingToken || 0),
    crashedUncommittedFactDoesNotAppear: !allFacts(crashLedger).some(fact => fact.text === crashText),
    recoveredWriterCommitsFact: allFacts(crashLedger).some(fact => fact.text === recoveryText),
    failedWriteReleasesLock: failedState.state.status === "failed" && !typed.inspectGroupTypedMemoryDistillationLock(scopeFailure).present,
    retryAfterFailureRaisesFenceAndCommits: completedState.state.status === "completed"
      && Number(retried.transaction.fencingToken || 0) > Number(failedState.state.fencingToken || 0),
    ledgerBindsCommittedTransaction: Number(ledgerConcurrent.distillationTransaction?.fencingToken || 0) === Number(resultB.value.transaction.fencingToken || 0),
    staleCorruptLockIsQuarantinedAndRecovered: Number(corruptRecovered.transaction.recoveredLeaseCount || 0) >= 1 && abandonedArchives.length >= 1,
    corruptTransactionStateIsRepairedWithoutFenceRollback: repairedState.valid === true
      && Number(stateRecovered.transaction.fencingToken || 0) > Number(corruptRecovered.transaction.fencingToken || 0),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase271-typed-memory-distillation-transaction-selftest-v1",
    checks,
    contention: {
      firstFence: resultA.value.transaction.fencingToken,
      secondFence: resultB.value.transaction.fencingToken,
      secondWaitedMs: resultB.value.transaction.waitedMs,
    },
    crashRecovery: {
      abandonedFence: crashLock.lock.fencingToken,
      recoveredFence: recovered.transaction.fencingToken,
      recoveredLeaseCount: recovered.transaction.recoveredLeaseCount,
    },
  }, null, 2)}\n`);
} finally {
  for (const scope of [scopeConcurrent, scopeCrash, scopeFailure, scopeCorrupt]) {
    try { fs.rmSync(typed.getGroupTypedMemoryDir(scope), { recursive: true, force: true }); } catch {}
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
