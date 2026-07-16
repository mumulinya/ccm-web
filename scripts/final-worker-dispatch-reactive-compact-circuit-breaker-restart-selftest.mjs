import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE317_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    sessions: require(dist("tasks", "agent-sessions.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function sessionIdentity(session, groupSessionId) {
  return {
    groupId: session.groupId,
    groupSessionId,
    taskId: session.taskId,
  };
}

function bindSnapshot(sessions, session, groupSessionId, nonce) {
  return sessions.bindTaskAgentMemoryContextSnapshot(session.id, {
    taskId: session.taskId,
    groupId: session.groupId,
    project: session.project,
    agentType: session.agentType,
    workerContextPacket: {
      packet_id: `wcp_phase317_${nonce}_${session.id}`,
      group_session_id: groupSessionId,
      task_id: session.taskId,
      memory: { schema: "ccm-phase317-memory-fixture-v1" },
    },
    memoryContext: { schema: "ccm-phase317-memory-fixture-v1" },
    renderedPrompt: "PHASE317_FIXED_PROMPT",
  });
}

function writeResult(value) {
  process.stdout.write(`${resultPrefix}${JSON.stringify(value)}\n`);
}

function childOpen(fixtureFile) {
  const { sessions, memory } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase317-group-${nonce}`;
  const otherGroupId = `phase317-other-group-${nonce}`;
  const groupSessionId = `gcs_phase317_${nonce}`;
  const siblingGroupSessionId = `gcs_phase317_sibling_${nonce}`;
  const taskId = `task-phase317-${nonce}`;
  const session = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: "api", agentType: "codex" });
  const siblingSession = sessions.openTaskAgentSession({ scopeId: `${taskId}-sibling`, taskId: `${taskId}-sibling`, groupId, project: "web", agentType: "cursor" });
  const otherSession = sessions.openTaskAgentSession({ scopeId: `${taskId}-other`, taskId: `${taskId}-other`, groupId: otherGroupId, project: "worker", agentType: "codex" });
  bindSnapshot(sessions, session, groupSessionId, nonce);
  bindSnapshot(sessions, siblingSession, siblingGroupSessionId, nonce);
  bindSnapshot(sessions, otherSession, `gcs_phase317_other_${nonce}`, nonce);
  memory.saveGroupMemory(groupId, { goal: "phase317 circuit visibility", decisions: [] }, groupSessionId);

  const initial = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(session.id, sessionIdentity(session, groupSessionId));
  const first = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(session.id, {
    ...sessionIdentity(session, groupSessionId), attemptId: "phase317-attempt-1", outcome: "failure", reason: "reactive_compact_failed", error: "BODY_MUST_NOT_BE_STORED",
  });
  const duplicate = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(session.id, {
    ...sessionIdentity(session, groupSessionId), attemptId: "phase317-attempt-1", outcome: "failure", reason: "duplicate_attempt",
  });
  const second = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(session.id, {
    ...sessionIdentity(session, groupSessionId), attemptId: "phase317-attempt-2", outcome: "failure", reason: "reactive_compact_failed",
  });
  const third = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(session.id, {
    ...sessionIdentity(session, groupSessionId), attemptId: "phase317-attempt-3", outcome: "failure", reason: "provider_prompt_too_long_after_reactive_compact",
  });
  const sibling = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(siblingSession.id, sessionIdentity(siblingSession, siblingGroupSessionId));
  const other = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(otherSession.id, sessionIdentity(otherSession, `gcs_phase317_other_${nonce}`));
  const wrongScope = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(session.id, {
    groupId, groupSessionId: siblingGroupSessionId, taskId,
  });
  const storeFile = path.join(os.homedir(), ".cc-connect", "task-agent-sessions.json");
  const serialized = fs.readFileSync(storeFile, "utf8");
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, otherGroupId, groupSessionId, siblingGroupSessionId, taskId, sessionId: session.id, siblingSessionId: siblingSession.id, otherSessionId: otherSession.id, storeFile }, null, 2));
  writeResult({
    initialClosed: initial.state === "closed" && initial.consecutive_failures === 0 && initial.blocked === false,
    incrementsOneTwoThree: first.consecutive_failures === 1 && second.consecutive_failures === 2 && third.consecutive_failures === 3,
    thirdOpens: third.state === "open" && third.blocked === true && third.checksum_valid === true,
    duplicateIdempotent: duplicate.idempotent === true && duplicate.revision === first.revision && duplicate.consecutive_failures === 1,
    exactScopeFailClosed: wrongScope.state === "fail_closed" && wrongScope.blocked === true && wrongScope.checksum_valid === false,
    siblingIsolated: sibling.state === "closed" && sibling.consecutive_failures === 0,
    otherGroupIsolated: other.state === "closed" && other.consecutive_failures === 0,
    bodyFree: !serialized.includes("BODY_MUST_NOT_BE_STORED"),
  });
}

function childRestart(fixtureFile) {
  const { sessions, center } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const identity = { groupId: fixture.groupId, groupSessionId: fixture.groupSessionId, taskId: fixture.taskId };
  const before = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(fixture.sessionId, identity);
  const inventoryBefore = sessions.buildTaskAgentMemoryContextSnapshotInventory({ sessionId: fixture.sessionId });
  const rowBefore = inventoryBefore.rows?.[0] || {};
  const detailBefore = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const centerBefore = detailBefore.postCompactUsage?.taskAgentMemoryContextSnapshots || {};
  const source = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const ui = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const successfulAttemptIndex = source.indexOf("if (!effectiveFailedAttempt) {");
  const successOutcomeIndex = source.indexOf('outcome: "success"', successfulAttemptIndex);
  const successBreakIndex = source.indexOf("break;", successOutcomeIndex);
  const failedAttemptIndex = source.indexOf("const providerPromptTooLong =", successBreakIndex);

  const store = JSON.parse(fs.readFileSync(fixture.storeFile, "utf8"));
  const target = store.sessions.find(item => item.id === fixture.sessionId);
  target.finalDispatchReactiveCompactCircuitBreaker.state_checksum = "tampered-checksum";
  fs.writeFileSync(fixture.storeFile, JSON.stringify(store, null, 2));
  const tampered = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(fixture.sessionId, identity);
  const failureOnTampered = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(fixture.sessionId, {
    ...identity, attemptId: "phase317-tampered-failure", outcome: "failure", reason: "must_fail_closed",
  });
  const repaired = sessions.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(fixture.sessionId, {
    ...identity, attemptId: "phase317-explicit-success", outcome: "success", reason: "provider_accepted_final_prompt",
  });
  const sibling = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(fixture.siblingSessionId, {
    groupId: fixture.groupId, groupSessionId: fixture.siblingGroupSessionId, taskId: `${fixture.taskId}-sibling`,
  });
  const other = sessions.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(fixture.otherSessionId, {
    groupId: fixture.otherGroupId, groupSessionId: fixture.groupSessionId.replace("gcs_phase317_", "gcs_phase317_other_"), taskId: `${fixture.taskId}-other`,
  });
  writeResult({
    restartPreservesOpen: before.state === "open" && before.consecutive_failures === 3 && before.blocked === true,
    inventoryShowsOpen: rowBefore.finalDispatchReactiveCompactCircuitState === "open"
      && rowBefore.finalDispatchReactiveCompactCircuitFailures === 3
      && inventoryBefore.summary?.finalDispatchReactiveCompactCircuitOpenCount === 1,
    memoryCenterShowsOpen: centerBefore.finalDispatchReactiveCompactCircuitOpenCount === 1
      && centerBefore.finalDispatchReactiveCompactCircuitFailureCount === 3
      && centerBefore.finalDispatchReactiveCompactCircuitInvalidCount === 0,
    productionChecksBeforeRecovery: source.includes("finalDispatchReactiveCompactCircuitBreaker?.blocked !== true")
      && source.includes("retryCircuit?.blocked === true")
      && source.includes("provider_prompt_too_long_after_reactive_compact"),
    productionResetsOnlyAfterProviderAcceptance: successfulAttemptIndex > 0
      && successOutcomeIndex > successfulAttemptIndex
      && successBreakIndex > successOutcomeIndex
      && failedAttemptIndex > successBreakIndex
      && !source.slice(failedAttemptIndex, source.indexOf("if (providerPromptTooLong", failedAttemptIndex)).includes('outcome: "success"'),
    uiExposesCircuit: ui.includes("compact circuit")
      && ui.includes("finalDispatchReactiveCompactCircuitOpenCount")
      && ui.includes("finalDispatchReactiveCompactCircuitState"),
    tamperFailsClosed: tampered.state === "fail_closed" && tampered.blocked === true && tampered.checksum_valid === false,
    tamperedFailureCannotMutate: failureOnTampered.recorded === false && failureOnTampered.blocked === true,
    successRepairsAndResets: repaired.state === "closed" && repaired.consecutive_failures === 0 && repaired.checksum_valid === true && !!repaired.last_success_at,
    isolationSurvivesRestart: sibling.state === "closed" && sibling.consecutive_failures === 0 && other.state === "closed" && other.consecutive_failures === 0,
  });
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(item => item.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-open") {
  childOpen(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase317-final-dispatch-circuit-"));
  const fixtureFile = path.join(tempHome, "phase317-fixture.json");
  try {
    const opened = runChild("child-open", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...opened, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase317-final-dispatch-reactive-compact-circuit-breaker-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
