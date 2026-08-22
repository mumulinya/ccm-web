#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, createTaskTerminalTimeline } = await loadSessionTaskTimelineFixture('task-boundary');
const base = { exactSessionId: `boundary-self-${Date.now()}`, scope: 'global', scopeId: 'global' };
const a = createTaskStartedTimeline({ ...base, taskId: 'boundary-a' });
const b = createTaskTerminalTimeline({ ...base, taskId: 'boundary-a', status: 'failed', attempt: 1 });
assert.equal(b.span.status, 'failed'); assert.equal(b.span.endSequence, b.span.latestSequence);
console.log(JSON.stringify({ pass: true, checks: { openToFailed: true, startSequence: a.span.startSequence, endSequence: b.span.endSequence } }));
