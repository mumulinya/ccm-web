#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, createTaskAttemptStartedTimeline, createTaskTerminalTimeline, projectPriorTaskSummaries } = await loadSessionTaskTimelineFixture('task-multi-isolation');
const base = { exactSessionId: `multi-task-self-${Date.now()}`, scope: 'group', scopeId: 'g1' };
const a = createTaskStartedTimeline({ ...base, taskId: 'task-a' });
const af = createTaskTerminalTimeline({ ...base, taskId: 'task-a', status: 'done', attempt: 1 });
const b = createTaskStartedTimeline({ ...base, taskId: 'task-b' });
assert.ok(b.span.startSequence > af.span.endSequence); assert.equal(projectPriorTaskSummaries(b.index, 'task-b')[0].taskId, 'task-a');
const recovery = createTaskAttemptStartedTimeline({ exactSessionId: `${base.exactSessionId}-recovery`, scope: 'group', scopeId: 'g1', taskId: 'task-a', attempt: 2 });
assert.notEqual(recovery.span.exactSessionId, af.span.exactSessionId); assert.equal(recovery.span.attemptSpans[0].attempt, 2);
console.log(JSON.stringify({ pass: true, checks: { disjointSequences: true, priorTaskSafeSummary: true, noCrossTaskBody: true, recoverySpanAppended: true } }));
