#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-task-context-sqlite-"));
process.env.CCM_TASK_STORE_DIR = storeDir;

const store = await import("../ccm-package/dist/core/task-store.js");
const timeline = await import("../ccm-package/dist/tasks/session-task-timeline.js");
const contexts = await import("../ccm-package/dist/tasks/task-context.js");

const now = new Date().toISOString();
const task = {
  id: "sqlite-strong-task",
  title: "SQLite strong consistency",
  description: "Verify atomic task context storage",
  business_goal: "Verify atomic task context storage",
  status: "in_progress",
  target_project: "demo",
  project_session_id: "project-session-a",
  exact_session_id: "project-session-a",
  revision: 1,
  generation: 1,
  execution_attempt: 1,
  created_at: now,
  updated_at: now,
};

const started = timeline.persistTaskStartedAtomically({
  task,
  position: 0,
  exactSessionId: "project-session-a",
  scope: "project",
  scopeId: "demo",
  generation: 1,
  attempt: 1,
  title: task.title,
  goal: task.business_goal,
  buildContext: current => contexts.buildTaskContextCapsule(current),
});
assert.equal(started.event.type, "task_started");

const beforeRollback = store.withSqliteTaskStore(db => ({
  events: Number(db.prepare("SELECT COUNT(*) count FROM session_timeline_events").get().count),
  outbox: Number(db.prepare("SELECT COUNT(*) count FROM task_context_outbox").get().count),
}));
assert.throws(() => store.withImmediateTaskStoreTransaction(db => {
  db.prepare(`INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
    VALUES ('rollback-probe', 'rollback-probe', ?, 'probe', '{}', 'pending', 0, ?, 0)`).run(task.id, new Date().toISOString());
  throw new Error("simulated crash");
}), /simulated crash/);
const afterRollback = store.withSqliteTaskStore(db => ({
  events: Number(db.prepare("SELECT COUNT(*) count FROM session_timeline_events").get().count),
  outbox: Number(db.prepare("SELECT COUNT(*) count FROM task_context_outbox").get().count),
  rollbackProbe: Number(db.prepare("SELECT COUNT(*) count FROM task_context_outbox WHERE outbox_id='rollback-probe'").get().count),
}));
assert.deepEqual(afterRollback, { ...beforeRollback, rollbackProbe: 0 });

for (let index = 1; index <= 49; index += 1) {
  timeline.appendSessionTimelineEvent({
    exactSessionId: "project-session-a",
    scope: "project",
    scopeId: "demo",
    type: "verification",
    taskId: task.id,
    eventId: `verification:${index}`,
    idempotencyKey: `verification:${index}`,
    generation: 1,
    attempt: 1,
    payloadRef: `evidence:${index}`,
  });
}

const headAtFifty = timeline.readTaskContextHead(task.id);
assert.equal(headAtFifty.revision, 50);
assert.equal(headAtFifty.latestSnapshotRevision, 50);
assert.equal(timeline.verifySessionTimelineChain({ exactSessionId: "project-session-a", scope: "project", scopeId: "demo" }).valid, true);
timeline.appendSessionTimelineEvent({ exactSessionId: "project-session-a", scope: "project", scopeId: "demo", type: "verification", taskId: task.id, eventId: "verification:49", idempotencyKey: "verification:49", generation: 1, attempt: 1, payloadRef: "duplicate" });
assert.equal(timeline.readTaskContextHead(task.id).revision, 50);
timeline.appendSessionTimelineEvent({ exactSessionId: "project-session-a", scope: "project", scopeId: "demo", type: "verification", taskId: task.id, eventId: "late-generation", idempotencyKey: "late-generation", generation: 99, attempt: 1, payloadRef: "late" });
assert.equal(timeline.readTaskContextHead(task.id).revision, 50);

timeline.createTaskTerminalTimeline({
  taskId: task.id,
  exactSessionId: "project-session-a",
  scope: "project",
  scopeId: "demo",
  status: "interrupted",
  attempt: 1,
  generation: 1,
});
const interruptedTask = store.getTaskByIdFromSqlite(task.id);
timeline.persistTaskMutationWithTimelineAtomically({
  task: { ...interruptedTask, execution_attempt: 2, status: "in_progress", updated_at: new Date().toISOString() },
  expectedTaskRevision: interruptedTask.revision,
  exactSessionId: "project-session-recovery",
  scope: "project",
  scopeId: "demo",
  type: "task_attempt_started",
  eventId: `task_attempt_started:${task.id}:2`,
  idempotencyKey: `task_attempt_started:${task.id}:2`,
  attempt: 2,
  generation: 1,
  contextReason: "task_attempt_started",
  forceSnapshot: true,
  buildContext: (current, previous) => contexts.buildTaskContextCapsule(current, previous, "task_attempt_started"),
});
const multiSpanHead = timeline.readTaskContextHead(task.id);
assert.equal(new Set(multiSpanHead.appliedCursors.map(cursor => cursor.exactSessionId)).size, 2);
assert.equal(timeline.catchUpTaskContext(task.id).success, true);

const payload = store.withSqliteTaskStore(db => JSON.parse(db.prepare("SELECT payload_json FROM tasks WHERE id=?").get(task.id).payload_json));
assert.equal(Object.hasOwn(payload, "task_context"), false);
assert.equal(Object.hasOwn(payload, "timeline_spans"), false);

store.withSqliteTaskStore(db => {
  const row = db.prepare("SELECT event_id FROM session_timeline_events WHERE exact_session_id=? ORDER BY sequence DESC LIMIT 1").get("project-session-recovery");
  db.prepare("UPDATE session_timeline_events SET checksum='tampered' WHERE event_id=?").run(row.event_id);
});
const tampered = timeline.verifySessionTimelineChain({ exactSessionId: "project-session-recovery", scope: "project", scopeId: "demo" });
assert.equal(tampered.valid, false);
assert.ok(tampered.issues.some(issue => issue.startsWith("event_checksum_mismatch")));

store.withSqliteTaskStore(db => db.prepare(`INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
  VALUES ('restart-outbox-probe', 'restart-outbox-probe', ?, 'task_context.updated', ?, 'pending', 0, ?, 0)`).run(task.id, JSON.stringify({ taskId: task.id, contentStored: false }), new Date().toISOString()));
const firstDrain = timeline.drainTaskContextOutbox(1000);
const secondDrain = timeline.drainTaskContextOutbox(1000);
assert.equal(firstDrain.published, 1);
assert.equal(secondDrain.published, 0);

console.log(JSON.stringify({
  pass: true,
  checks: {
    atomicRollback: true,
    revisionSnapshotAtFifty: true,
    multiSpanCursors: true,
    normalizedPayload: true,
    tamperDetected: true,
    outboxIdempotent: true,
    lateAndDuplicateEventsDoNotAdvanceContext: true,
  },
  firstDrain,
  secondDrain,
}, null, 2));
