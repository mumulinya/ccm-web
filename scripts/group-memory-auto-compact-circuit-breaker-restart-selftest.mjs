import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE302_RESULT=";

function modules() {
  return {
    storage: require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js")),
    circuit: require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-auto-compact-circuit-breaker.js")),
  };
}

function messages(sessionId, sentinel) {
  return Array.from({ length: 130 }, (_, index) => ({
    id: `${sessionId}-${index}`,
    group_session_id: sessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    agent: index % 2 === 1 ? "phase302-worker" : undefined,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0
      ? `Preserve ${sentinel} in the raw transcript only.`
      : `Phase 302 turn ${index} src/phase302-${index}.ts ${"context ".repeat(90)}`,
  }));
}

async function childFail(groupId, sessionId, siblingId, sentinel) {
  const { storage, circuit } = modules();
  storage.saveGroupMessages(groupId, messages(sessionId, sentinel), sessionId);
  storage.saveGroupMessages(groupId, messages(siblingId, "PHASE302_SIBLING"), siblingId);
  let compactCalls = 0;
  const failingCompact = async () => {
    compactCalls += 1;
    const error = new Error(`${sentinel}: simulated prompt too long`);
    error.name = "PromptTooLongError";
    throw error;
  };
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const attempts = [];
  for (let index = 0; index < 3; index++) {
    attempts.push(await memory.runGroupMemoryAutoCompactionNow(groupId, {
      sessionId,
      reason: `phase302-failure-${index + 1}`,
      messageId: `failure-${index + 1}`,
      compactGroupConversationMemory: failingCompact,
    }));
  }
  const blockedRun = await memory.runGroupMemoryAutoCompactionNow(groupId, { sessionId, reason: "phase302-fourth-run" });
  const blockedSchedule = memory.scheduleGroupMemoryAutoCompaction(groupId, { sessionId, reason: "phase302-fourth-schedule" });
  const ledger = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId);
  const sibling = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, siblingId);
  const serialized = fs.readFileSync(ledger.file, "utf-8");
  process.stdout.write(`${resultPrefix}${JSON.stringify({
    failuresReturned: attempts.every(row => row.success === false),
    compactCalls,
    blockedRun: blockedRun.reason === "auto_compact_circuit_breaker_open" && blockedRun.skipped === true,
    blockedSchedule: blockedSchedule.reason === "auto_compact_circuit_breaker_open" && blockedSchedule.scheduled === false,
    state: ledger.state,
    failureCount: ledger.consecutive_failures,
    checksumValid: ledger.checksum_valid,
    siblingState: sibling.state,
    siblingFailures: sibling.consecutive_failures,
    bodyFree: !serialized.includes(sentinel),
  })}\n`);
}

async function childResume(groupId, sessionId, siblingId, sentinel) {
  const { circuit } = modules();
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const before = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId);
  const blockedRun = await memory.runGroupMemoryAutoCompactionNow(groupId, { sessionId, reason: "phase302-restart-block" });
  const manual = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId,
    force: true,
    rebuild: true,
    reason: "phase302-manual-recovery",
    config: { memoryCompactionUseModel: false, minKeepMessages: 4, minKeepTokens: 1 },
  });
  const after = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId);
  const detail = center.getMemoryCenterScope("group", `${groupId}::${sessionId}`);
  const centerCircuit = detail.postCompactUsage?.autoCompactCircuitBreaker || {};
  const serialized = fs.readFileSync(after.file, "utf-8");

  fs.writeFileSync(after.file, "{tampered-primary", "utf-8");
  const backupRecovery = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId);
  fs.writeFileSync(`${after.file}.bak`, "{tampered-backup", "utf-8");
  const failClosed = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId);
  const failClosedSchedule = memory.scheduleGroupMemoryAutoCompaction(groupId, { sessionId, reason: "phase302-corrupt-ledger" });
  const recovered = circuit.recordGroupMemoryAutoCompactCircuitBreakerOutcome({
    groupId,
    groupSessionId: sessionId,
    attemptId: "phase302-explicit-recovery",
    outcome: "success",
    reason: "manual_compact_succeeded",
  });
  const admittedSchedule = memory.scheduleGroupMemoryAutoCompaction(groupId, { sessionId, reason: "phase302-after-recovery", delayMs: 600_000 });
  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId);
  const sibling = circuit.readGroupMemoryAutoCompactCircuitBreaker(groupId, siblingId);
  process.stdout.write(`${resultPrefix}${JSON.stringify({
    restartPreservedOpen: before.state === "open" && before.consecutive_failures === 3,
    restartRunBlocked: blockedRun.reason === "auto_compact_circuit_breaker_open" && blockedRun.skipped === true,
    manualBypassedAndCompacted: manual.success === true && manual.compacted === true,
    manualResetCircuit: after.state === "closed" && after.consecutive_failures === 0 && !!after.last_success_at,
    memoryCenterShowsClosed: centerCircuit.state === "closed" && centerCircuit.group_session_id === sessionId && centerCircuit.checksum_valid === true,
    backupRecoveryIsFailSafe: backupRecovery.recovered_from_backup === true
      && backupRecovery.state === "fail_closed"
      && backupRecovery.recovery_state === "open"
      && backupRecovery.blocked === true,
    corruptCopiesFailClosed: failClosed.state === "fail_closed" && failClosed.blocked === true && failClosed.checksum_valid === false,
    corruptLedgerBlocksScheduling: failClosedSchedule.scheduled === false && failClosedSchedule.reason === "auto_compact_circuit_breaker_open",
    explicitSuccessRecoversCorruption: recovered.state === "closed" && recovered.checksum_valid === true,
    recoveredSessionCanSchedule: admittedSchedule.scheduled === true,
    bodyFree: !serialized.includes(sentinel),
    deletionRemovedCircuit: Number(deletion.autoCompactCircuitBreakerArtifacts?.deleted || 0) >= 1 && !fs.existsSync(after.file),
    siblingUnaffected: sibling.state === "closed" && sibling.consecutive_failures === 0,
  })}\n`);
  process.exit(0);
}

function parseChild(output) {
  const line = String(output || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  if (!line) throw new Error(`missing child result: ${output}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

function runChild(mode, tempRoot, ids) {
  const result = spawnSync(process.execPath, [file, mode, ...ids], {
    cwd: root,
    env: { ...process.env, USERPROFILE: tempRoot, HOME: tempRoot },
    encoding: "utf-8",
    timeout: 120_000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return parseChild(result.stdout);
}

const mode = process.argv[2] || "parent";
if (mode === "child-fail") {
  await childFail(...process.argv.slice(3));
} else if (mode === "child-resume") {
  await childResume(...process.argv.slice(3));
} else {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase302-auto-compact-circuit-"));
  const groupId = `phase302-circuit-${process.pid}-${Date.now().toString(36)}`;
  const sessionId = `gcs_phase302_${process.pid}_${Date.now().toString(36)}`;
  const siblingId = `gcs_phase302_sibling_${process.pid}_${Date.now().toString(36)}`;
  const sentinel = "PHASE302_ERROR_BODY_MUST_NOT_ENTER_CIRCUIT_LEDGER";
  try {
    const failed = runChild("child-fail", tempRoot, [groupId, sessionId, siblingId, sentinel]);
    const resumed = runChild("child-resume", tempRoot, [groupId, sessionId, siblingId, sentinel]);
    const checks = {
      threeFailuresOpenCircuit: failed.failuresReturned && failed.compactCalls === 3 && failed.state === "open" && failed.failureCount === 3,
      fourthRunAndScheduleAreBlocked: failed.blockedRun && failed.blockedSchedule && failed.compactCalls === 3,
      failureLedgerIsChecksummedAndBodyFree: failed.checksumValid && failed.bodyFree,
      siblingSessionRemainsIndependent: failed.siblingState === "closed" && failed.siblingFailures === 0 && resumed.siblingUnaffected,
      restartPreservesOpenCircuit: resumed.restartPreservedOpen && resumed.restartRunBlocked,
      manualCompactBypassesAndResets: resumed.manualBypassedAndCompacted && resumed.manualResetCircuit,
      memoryCenterExposesExactCircuit: resumed.memoryCenterShowsClosed,
      backupRecoveryRemainsBlocked: resumed.backupRecoveryIsFailSafe,
      corruptLedgerFailsClosed: resumed.corruptCopiesFailClosed && resumed.corruptLedgerBlocksScheduling,
      explicitSuccessCanRecoverCorruption: resumed.explicitSuccessRecoversCorruption && resumed.recoveredSessionCanSchedule,
      restartLedgerRemainsBodyFree: resumed.bodyFree,
      sessionDeletionRemovesCircuitArtifacts: resumed.deletionRemovedCircuit,
    };
    assert.ok(Object.values(checks).every(Boolean), JSON.stringify({ checks, failed, resumed }, null, 2));
    process.stdout.write(`${JSON.stringify({
      pass: true,
      schema: "ccm-phase302-auto-compact-circuit-breaker-restart-selftest-v1",
      checks,
    }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
