#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-task-interruption-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const interruption = require(path.join(root, "ccm-package", "dist", "tasks", "task-interruption.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "execution-kernel.js"));

try {
  const taskId = `task-interruption-${process.pid}-${Date.now().toString(36)}`;
  const opened = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId: "group-recovery", project: "project-a", agentType: "codex" });
  const advanced = sessions.recordTaskAgentSessionTurn(opened.id, { success: true, nativeSessionId: "codex-native-recovery-1" });
  const task = { id: taskId, status: "in_progress", acceptance_state: "executing", execution_attempt: 1, workspace_snapshot_checksum: "workspace-v1" };

  const stopped = interruption.interruptTaskExecution({ task, reasonCode: "user_interrupt", reason: "selftest user stop", actor: "selftest", checkpoint: "executing", sideEffectState: "uncertain", workspaceChecksum: "workspace-v1" });
  assert.equal(stopped.receipt.schema, "ccm-task-interruption-receipt-v1");
  assert.equal(stopped.receipt.auto_resume_allowed, false, "a user stop with uncertain side effects must require confirmation");
  const suspended = sessions.listTaskAgentSessions({ taskId });
  assert.equal(suspended.length, 1);
  assert.equal(suspended[0].status, "suspended");
  assert.equal(suspended[0].id, opened.id);
  assert.equal(suspended[0].nativeSessionId, "codex-native-recovery-1");
  assert.equal(kernel.isTaskCancellationRequested(taskId), true);

  const manual = interruption.buildTaskRecoveryDecision({ ...task, interruption_receipt: stopped.receipt }, stopped.receipt, { workspaceChecksum: "workspace-v1", authorizationValid: true, runtimeValid: true });
  assert.equal(manual.mode, "manual");
  const resumed = interruption.resumeInterruptedTaskExecution({ ...task, interruption_receipt: stopped.receipt }, { userRequested: true, workspaceChecksum: "workspace-v1", authorizationValid: true, runtimeValid: true });
  assert.equal(resumed.resumed, true);
  assert.equal(kernel.isTaskCancellationRequested(taskId), false);
  const reopened = sessions.listTaskAgentSessions({ taskId });
  assert.equal(reopened[0].status, "open");
  assert.equal(reopened[0].id, opened.id, "resume must keep the same task agent session id");
  assert.equal(reopened[0].nativeSessionId, advanced.nativeSessionId, "resume must keep the same native CLI session id");

  const workDir = path.join(tempRoot, "workspace");
  fs.mkdirSync(workDir, { recursive: true });
  kernel.ensureExecution({ task: { ...task, title: "resume selftest", description: "verify execution attempt recovery", target_project: "project-a" }, project: "project-a", workDir, executionId: taskId });
  kernel.transitionExecution(taskId, "cancelled", "selftest interrupted attempt");
  const newAttempt = kernel.beginExecutionAttempt(taskId, "selftest resumed attempt");
  assert.equal(newAttempt.state, "spawning");
  assert.equal(newAttempt.finishedAt, "");
  assert.equal(newAttempt.cancellation, null);
  assert.equal(newAttempt.executionAttempt, 1);

  const restartReceipt = interruption.buildTaskInterruptionReceipt({ task, reasonCode: "service_restart", reason: "restart", actor: "selftest", checkpoint: "executing", sideEffectState: "none", workspaceChecksum: "workspace-v1", processTerminationProven: true });
  const automatic = interruption.buildTaskRecoveryDecision({ ...task, interruption_receipt: restartReceipt }, restartReceipt, { workspaceChecksum: "workspace-v1", authorizationValid: true, runtimeValid: true });
  assert.equal(automatic.mode, "auto", "a proven restart interruption without uncertain side effects may auto resume");

  const drifted = interruption.buildTaskRecoveryDecision({ ...task, interruption_receipt: restartReceipt }, restartReceipt, { workspaceChecksum: "workspace-v2", authorizationValid: true, runtimeValid: true });
  assert.equal(drifted.mode, "manual", "workspace drift must fail closed to user confirmation");

  const resumeCheckpoint = { phase: "test_agent_running", reviewRound: 2, planChecksum: "plan-v1", workspaceChecksum: "workspace-v1", completedWorkItemIds: ["work-a"], summaryPending: false };
  const streamReceipt = interruption.buildTaskInterruptionReceipt({ task, reasonCode: "model_stream_interrupted", reason: "stream closed after delta", actor: "selftest", checkpoint: "test_agent_running", sideEffectState: "committed", workspaceChecksum: "workspace-v1", resumeCheckpoint, processTerminationProven: true });
  assert.equal(streamReceipt.auto_resume_allowed, true, "a stream interruption with a committed checkpoint is recoverable");
  assert.deepEqual(streamReceipt.resume_checkpoint.completedWorkItemIds, ["work-a"]);
  const schedules = [0, 1, 2, 3].map(attempt => interruption.buildTaskRecoverySchedule({ reasonCode: "provider_unavailable", attempt, autoResumeAllowed: true, now: 0 }));
  assert.deepEqual(schedules.slice(0, 3).map(item => Date.parse(item.nextRetryAt)), [30_000, 120_000, 300_000]);
  assert.equal(schedules[3].mode, "manual", "the fourth recovery cycle must require a user");
  assert.equal(schedules[3].state, "needs_user");

  sessions.closeTaskAgentSessions({ taskId }, "selftest permanent cancel");
  assert.equal(sessions.listTaskAgentSessions({ taskId })[0].status, "closed", "permanent cancel closes but does not delete session history");
  assert.equal(sessions.listTaskAgentSessions({ taskId }).length, 1);

  console.log(JSON.stringify({ pass: true, checks: { suspended_session_preserved: true, native_session_preserved: true, user_interrupt_manual: true, execution_attempt_reopened: true, safe_restart_auto: true, stream_checkpoint_auto: true, recovery_backoff_30s_2m_5m: true, fourth_attempt_manual: true, workspace_drift_manual: true, permanent_cancel_keeps_history: true, paid_provider_calls: 0 } }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
