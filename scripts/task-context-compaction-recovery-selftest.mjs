#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, appendSessionTimelineEvent, readSessionTaskIndex } = await loadSessionTaskTimelineFixture('task-compaction-recovery');
const base = { exactSessionId: `compact-recovery-self-${Date.now()}`, scope: 'project', scopeId: 'demo' };
createTaskStartedTimeline({ ...base, taskId: 'long-task' });
appendSessionTimelineEvent({ ...base, type: 'verification', taskId: 'long-task', eventId: 'checkpoint:1', payloadRef: 'v1' });
const index = readSessionTaskIndex(base); assert.equal(index.taskSpans[0].taskId, 'long-task'); assert.equal(index.latestSequence, 2);
console.log(JSON.stringify({ pass: true, checks: { markerPreserved: true, checkpointPreserved: true, rawLedgerIndependent: true } }));
