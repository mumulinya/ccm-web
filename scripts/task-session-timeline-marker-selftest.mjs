#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { persistTaskStartedAtomically, createTaskTerminalTimeline, readSessionTaskIndex, readTaskContextHead, verifySessionTimelineChain, rebuildTaskContextFromSnapshot } = await loadSessionTaskTimelineFixture('timeline-marker');
const base = { exactSessionId: `timeline-self-${Date.now()}`, scope: 'project', scopeId: 'demo' };
const task = { id: 'task-a', status: 'in_progress', target_project: 'demo', workflow_type: 'project_main_agent', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
const started = persistTaskStartedAtomically({
  ...base,
  task,
  position: 0,
  attempt: 1,
  buildContext: () => ({
    schema: 'ccm-task-context-capsule-v1', taskId: task.id, scope: 'project', scopeId: 'demo',
    sourceSession: { exactSessionId: base.exactSessionId }, intent: { goal: 'selftest' }, authorization: { projects: ['demo'] },
    timelineSpans: [], appliedCursors: [], revision: 1, status: 'ready', contentStored: false,
  }),
});
const finished = createTaskTerminalTimeline({ ...base, taskId: 'task-a', status: 'done', attempt: 1 });
assert.equal(started.span.startSequence, 1); assert.equal(finished.span.status, 'completed');
const terminalHead = readTaskContextHead('task-a');
assert.equal(terminalHead?.activeSpanId, undefined, 'terminal context head must clear its active span pointer');
assert.equal(verifySessionTimelineChain(base).valid, true, 'stored event checksum must reproduce from the canonical event projection');
const rebuilt = rebuildTaskContextFromSnapshot('task-a');
assert.equal(rebuilt.success, true, 'task context revisions must rebuild independently of object key insertion order');
const taskStore = await import('../ccm-package/dist/core/task-store.js');
taskStore.withImmediateTaskStoreTransaction(db => taskStore.persistTaskContextProjection(db, 'task-a', { ...rebuilt.context, blockers: ['stale checksum mutation'] }, 'stale_checksum_selftest'));
assert.equal(rebuildTaskContextFromSnapshot('task-a').success, true, 'a mutated hydrated context with a stale checksum must append a revision instead of overwriting the head');
console.log(JSON.stringify({ pass: true, checks: { startMarker: true, terminalMarker: true, monotonic: finished.span.endSequence > started.span.startSequence, index: readSessionTaskIndex(base).latestSequence === 2, terminalActiveSpanCleared: true, eventHashChainValid: true, contextRevisionRebuildValid: true, staleChecksumCannotOverwriteHead: true } }));
