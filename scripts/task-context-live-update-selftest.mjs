#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, appendSessionTimelineEvent, readSessionTaskIndex } = await loadSessionTaskTimelineFixture('task-live-update');
const base = { exactSessionId: `live-self-${Date.now()}`, scope: 'group', scopeId: 'g1' };
createTaskStartedTimeline({ ...base, taskId: 'live-a' });
appendSessionTimelineEvent({ ...base, type: 'assistant_message', taskId: 'live-a', eventId: 'live:a:assistant', payloadRef: 'm1' });
appendSessionTimelineEvent({ ...base, type: 'verification', taskId: 'live-a', eventId: 'live:a:verify', payloadRef: 'v1' });
const index = readSessionTaskIndex(base); assert.equal(index.events.length, 3); assert.equal(index.events[2].sequence, 3);
console.log(JSON.stringify({ pass: true, checks: { appendOnly: true, checkpointAdvanced: index.latestSequence === 3, payloadIsReference: index.events.every(e => e.contentStored === false) } }));
