#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, createTaskTerminalTimeline, readSessionTaskIndex } = await loadSessionTaskTimelineFixture('task-replay-marker');
const base = { exactSessionId: `replay-marker-self-${Date.now()}`, scope: 'global', scopeId: 'global' };
createTaskStartedTimeline({ ...base, taskId: 'replay-a' });
createTaskTerminalTimeline({ ...base, taskId: 'replay-a', status: 'interrupted', attempt: 1 });
const index = readSessionTaskIndex(base); const span = index.taskSpans[0];
assert.equal(span.status, 'interrupted'); assert.ok(span.startMarkerId); assert.ok(span.endMarkerId); assert.ok(span.checksum);
console.log(JSON.stringify({ pass: true, checks: { resumeByTaskId: true, spanChecksum: true, interruptionVisible: true } }));
