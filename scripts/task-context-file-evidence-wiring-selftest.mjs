#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSessionTaskTimelineFixture } from './session-task-timeline-selftest-fixture.mjs';
const { createTaskStartedTimeline, appendSessionTimelineEvent, readSessionTaskIndex } = await loadSessionTaskTimelineFixture('task-file-evidence');
const base = { exactSessionId: `file-evidence-self-${Date.now()}`, scope: 'project', scopeId: 'demo' };
createTaskStartedTimeline({ ...base, taskId: 'file-a' });
appendSessionTimelineEvent({ ...base, type: 'file_read', taskId: 'file-a', eventId: 'file-read:e1', payloadRef: 'e1' });
const event = readSessionTaskIndex(base).events.at(-1); assert.equal(event.type, 'file_read'); assert.equal(event.contentStored, false); assert.equal(event.payloadRef, 'e1');
console.log(JSON.stringify({ pass: true, checks: { fileReadBound: true, metadataOnly: true } }));
