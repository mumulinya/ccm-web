import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-session-lifecycle-abort-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const db = require(path.join(root, "ccm-package", "dist", "core", "db.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "execution-kernel.js"));
const runner = require(path.join(root, "ccm-package", "dist", "agents", "runner.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `group-phase266-${nonce}`;
const taskId = `task-phase266-${nonce}`;
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function runtimeFence(head, sessionId) {
  return {
    schema: "ccm-group-session-lifecycle-runtime-fence-v1",
    required: true,
    groupId,
    groupSessionId: sessionId,
    lifecycleGeneration: head.generation,
    lifecycleStatus: head.status,
    lifecycleHeadId: head.lifecycle_head_id,
    lifecycleHeadChecksum: head.head_checksum,
    memoryContextSnapshotId: `tmcs_phase266_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot-checksum-${nonce}`,
  };
}

try {
  const session = storage.createGroupChatSession(groupId, "Phase 266 running session");
  const activeHead = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(activeHead.status, "active", "the session must begin active");
  equal(activeHead.generation, 1, "the session must begin at lifecycle generation one");

  const fence = runtimeFence(activeHead, session.id);
  const activeValidation = runner.validateAgentRunnerSessionLifecycleFence({
    groupId,
    groupSessionId: session.id,
    sessionLifecycleFence: fence,
  });
  equal(activeValidation.valid, true, "an exact active lifecycle fence must pass Runner preflight");

  const missingFenceValidation = runner.validateAgentRunnerSessionLifecycleFence({ groupId, groupSessionId: session.id });
  equal(missingFenceValidation.valid, false, "a gcs_* Runner request without a lifecycle binding must fail closed");
  ok(missingFenceValidation.issues.includes("session_lifecycle_runtime_generation_missing"), "missing lifecycle generation must be reported");

  db.saveTasks([{
    id: taskId,
    title: "Phase 266 abort target",
    group_id: groupId,
    group_session_id: session.id,
    status: "in_progress",
    archived: false,
  }]);

  const requestsDir = path.join(tempRoot, ".cc-connect", "agent-runner", "requests");
  fs.mkdirSync(requestsDir, { recursive: true });
  const runnerRequestFile = path.join(requestsDir, `ar_phase266_${nonce}.json`);
  fs.writeFileSync(runnerRequestFile, JSON.stringify({
    id: `ar_phase266_${nonce}`,
    taskId,
    executionId: taskId,
    groupId,
    groupSessionId: session.id,
    sessionLifecycleFence: fence,
    status: "pending",
    created_at: new Date().toISOString(),
  }, null, 2));

  let startedAt = 0;
  let startedResolve;
  const started = new Promise(resolve => { startedResolve = resolve; });
  const command = `${JSON.stringify(process.execPath)} -e "setTimeout(() => {}, 15000)"`;
  const runStartedAt = Date.now();
  const running = kernel.runManagedCommand({
    taskId,
    executionId: taskId,
    command,
    cwd: root,
    timeoutMs: 20_000,
    onStarted: () => {
      startedAt = Date.now();
      startedResolve();
    },
  });
  await Promise.race([
    started,
    new Promise((_, reject) => setTimeout(() => reject(new Error("managed child did not start")), 5000)),
  ]);

  const deletion = storage.deleteGroupChatSession(groupId, session.id, {
    force: true,
    reason: "phase266_delete_running_session",
  });
  equal(deletion.lifecycleTombstone.head.status, "deleted", "deletion must commit the tombstone before returning");
  equal(deletion.lifecycleCancellation.schema, "ccm-group-session-agent-cancellation-v1", "deletion must return durable cancellation evidence");
  ok(deletion.lifecycleCancellation.taskIds.includes(taskId), "the running task must be included in session cancellation");
  equal(deletion.lifecycleCancellation.matchedRunnerRequests, 1, "the queued external Runner request must be revoked");

  let runError = null;
  try { await running; } catch (error) { runError = error; }
  equal(runError?.code, "CCM_CANCELLED", "the running child process must be interrupted");
  ok(Date.now() - startedAt < 5000, "session deletion must interrupt the child well before its natural completion");
  ok(Date.now() - runStartedAt < 7000, "the complete cancellation path must finish promptly");
  equal(kernel.isTaskCancellationRequested(taskId), true, "task cancellation must survive as a durable marker");

  const revokedRequest = JSON.parse(fs.readFileSync(runnerRequestFile, "utf-8"));
  equal(revokedRequest.status, "cancel_requested", "the queued Runner request must remain cancelled across restart");
  equal(revokedRequest.session_lifecycle_stale, true, "the request must record lifecycle-stale provenance");

  const handledByIndependentRunner = await runner.runAgentRunnerRequestFile(runnerRequestFile);
  equal(handledByIndependentRunner, true, "an independent Runner restart must handle the revoked request");
  const runnerResultFile = path.join(tempRoot, ".cc-connect", "agent-runner", "results", `ar_phase266_${nonce}.json`);
  const runnerResult = JSON.parse(fs.readFileSync(runnerResultFile, "utf-8"));
  equal(runnerResult.success, false, "the independent Runner must not launch a deleted-session request");
  equal(runnerResult.cancelled, true, "the independent Runner result must be terminally cancelled");
  equal(runnerResult.session_lifecycle_stale, true, "the independent Runner result must retain lifecycle-stale evidence");
  ok(runnerResult.sessionLifecycleValidation.issues.includes("session_lifecycle_deleted"), "the Runner result must identify the deletion tombstone");

  const tombstone = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(tombstone.status, "deleted", "the deleted lifecycle tombstone must remain readable");
  equal(tombstone.generation, 2, "deletion must advance the lifecycle generation");
  const staleValidation = runner.validateAgentRunnerSessionLifecycleFence({
    groupId,
    groupSessionId: session.id,
    sessionLifecycleFence: fence,
  });
  equal(staleValidation.valid, false, "Runner preflight must reject the pre-delete binding after restart");
  ok(staleValidation.issues.includes("session_lifecycle_deleted"), "Runner rejection must identify the deleted lifecycle");

  kernel.clearTaskCancellation(taskId);
  equal(kernel.isTaskCancellationRequested(taskId), false, "the fixture must clear the original marker before startup reconciliation");
  const startupReconciliation = storage.reconcileGroupSessionLifecycleAgentCancellations();
  equal(startupReconciliation.checked, 1, "startup reconciliation must inspect the stale task session scope");
  equal(startupReconciliation.revoked, 1, "startup reconciliation must revoke the deleted session scope again");
  equal(kernel.isTaskCancellationRequested(taskId), true, "startup reconciliation must restore the durable cancellation marker");

  const replacement = deletion.replacement;
  ok(replacement?.id?.startsWith("gcs_"), "deleting the last session must leave an independent replacement");
  ok(replacement.id !== session.id, "the replacement must not reuse the deleted identity");
  const replacementHead = lifecycle.readGroupSessionLifecycleHead(groupId, replacement.id);
  equal(replacementHead.status, "active", "the replacement session must be active");
  equal(replacementHead.generation, 1, "the replacement must start at its own generation one");
  equal(runner.validateAgentRunnerSessionLifecycleFence({
    groupId,
    groupSessionId: replacement.id,
    sessionLifecycleFence: runtimeFence(replacementHead, replacement.id),
  }).valid, true, "a fresh replacement Runner request must pass its own lifecycle fence");

  console.log(JSON.stringify({
    pass: true,
    checks,
    original: { sessionId: session.id, generation: activeHead.generation },
    tombstone: { status: tombstone.status, generation: tombstone.generation },
    replacement: { sessionId: replacement.id, generation: replacementHead.generation },
    cancellation: {
      taskIds: deletion.lifecycleCancellation.taskIds,
      matchedRunnerRequests: deletion.lifecycleCancellation.matchedRunnerRequests,
      elapsedAfterStartMs: Date.now() - startedAt,
    },
    staleIssues: staleValidation.issues,
    startupReconciliation: {
      checked: startupReconciliation.checked,
      revoked: startupReconciliation.revoked,
      taskCount: startupReconciliation.taskCount,
    },
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
